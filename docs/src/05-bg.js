    // ══════════════════════════════════════════════════════════════════════════
    // 背景图（壁纸）
    //
    // 数据：Blob 存 IndexedDB（不占 localStorage 配额），参数并入同一份 state。
    // 渲染：两个 z-index:-1 的 body 伪元素（::before 当前图，::after 过渡图），
    //       只改 CSS 变量与 data 标记，不新增 DOM、不依赖 DSH 的哈希类名。
    // 透出：--dsw-alias-bg-base / --dsw-specific-sidebar-fill 覆盖成
    //       color-mix(原值 N%, transparent)，原值另存 --ios-bg-*-raw 避免变量自引用。
    //
    // 这一段是 1.x 沿用下来的成熟实现，逻辑未改，只把外部依赖（state/saveState/
    // notify/ctx）换成新版同名符号，并在「忽略主题背景」下让 bgApplySurface()
    // 排在主题层之后重放（见 04 段的 reapplyLayers）。
    // ══════════════════════════════════════════════════════════════════════════

    let bgImages = [];
    let bgUrlCache = new Map();
    let bgSurfaceDispose = null;
    let bgSurfaceBusy = false;
    let bgTimer = null;
    let bgXfadeTimer = null;
    let bgCurrentId = null;
    let bgSaveTimer = null;
    let bgDb = null;
    let bgLastScheme = null;
    let bgSurfaceRetry = false;
    let bgSurfaceTries = 0;
    let bgDiagTimer = null;
    // 诊断：设置页里直接显示「透出层 / 渲染层」的真实状态，排障不用开 DevTools
    let bgDiag = { surface: '未启用', image: '无图', layers: '' };

    function bgPrefersReducedMotion() {
      try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
    }

    function bgIsDark() {
      try {
        const snapshot = ctx && ctx.theme ? ctx.theme.getTheme() : null;
        const active = snapshot && snapshot.active;
        if (active && active.colorScheme) return active.colorScheme === 'dark';
      } catch (e) { /* 忽略 */ }
      try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
    }

    function bgSetVar(name, value) {
      if (typeof document === 'undefined') return;
      try {
        if (value === null || value === undefined) document.documentElement.style.removeProperty(name);
        else document.documentElement.style.setProperty(name, value);
      } catch (e) { /* 忽略 */ }
    }

    function bgUrlFor(record, kind) {
      if (!record) return null;
      let entry = bgUrlCache.get(record.id);
      if (!entry) {
        const mainBlob = record.blob || record.thumb;
        if (!mainBlob) return null;
        try {
          entry = {
            main: URL.createObjectURL(mainBlob),
            thumb: URL.createObjectURL(record.thumb || mainBlob),
          };
        } catch (e) { return null; }
        bgUrlCache.set(record.id, entry);
      }
      return kind === 'thumb' ? entry.thumb : entry.main;
    }

    function bgReleaseUrls() {
      for (const entry of bgUrlCache.values()) {
        try { URL.revokeObjectURL(entry.main); } catch (e) { /* 忽略 */ }
        try { URL.revokeObjectURL(entry.thumb); } catch (e) { /* 忽略 */ }
      }
      bgUrlCache.clear();
    }

    // —— IndexedDB ——
    function bgOpenDb() {
      if (bgDb) return Promise.resolve(bgDb);
      return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB 不可用')); return; }
        let request;
        try { request = indexedDB.open(BG_DB_NAME, BG_DB_VERSION); } catch (e) { reject(e); return; }
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(BG_STORE)) db.createObjectStore(BG_STORE, { keyPath: 'id' });
        };
        request.onsuccess = () => { bgDb = request.result; resolve(bgDb); };
        request.onerror = () => reject(request.error || new Error('IndexedDB 打开失败'));
      });
    }

    async function bgListRecords() {
      const db = await bgOpenDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(BG_STORE, 'readonly');
        const request = tx.objectStore(BG_STORE).getAll();
        request.onsuccess = () => {
          const list = Array.isArray(request.result) ? request.result.slice() : [];
          list.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
          resolve(list);
        };
        request.onerror = () => reject(request.error);
      });
    }

    async function bgPutRecord(record) {
      const db = await bgOpenDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(BG_STORE, 'readwrite');
        tx.objectStore(BG_STORE).put(record);
        tx.oncomplete = () => resolve(record);
        tx.onerror = () => reject(tx.error);
      });
    }

    async function bgDeleteRecord(id) {
      const db = await bgOpenDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(BG_STORE, 'readwrite');
        tx.objectStore(BG_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    async function bgClearStore() {
      const db = await bgOpenDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(BG_STORE, 'readwrite');
        tx.objectStore(BG_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    // —— 导入管线：先探尺寸，解码时直接降到 ≤2560px，再补一张 320px 缩略图 ——
    function bgMb(bytes) {
      return Math.round(bytes / 1024 / 1024);
    }

    function bgLooksLikeImage(file) {
      if (!file) return false;
      return /^image\//.test(file.type || '') || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name || '');
    }

    // 拖进来的文件夹：递归展开（最多 3 层），只收图片。
    // 注意 webkitGetAsEntry 必须在 drop 的同步阶段调用，所以由调用方先取好 entries。
    function bgReadEntry(entry, out, depth) {
      if (!entry || out.length >= BG_MAX_COUNT * 3) return Promise.resolve();
      if (entry.isFile) {
        return new Promise((resolve) => {
          try {
            entry.file((file) => {
              if (bgLooksLikeImage(file)) out.push(file);
              resolve();
            }, () => resolve());
          } catch (e) { resolve(); }
        });
      }
      if (entry.isDirectory && depth < 3) {
        const reader = entry.createReader();
        const readBatch = () => new Promise((resolve) => {
          try { reader.readEntries((batch) => resolve(batch || []), () => resolve([])); }
          catch (e) { resolve([]); }
        });
        return (async () => {
          for (;;) {
            const batch = await readBatch();
            if (!batch.length) break;
            for (const child of batch) await bgReadEntry(child, out, depth + 1);
          }
        })();
      }
      return Promise.resolve();
    }

    async function bgCollectEntries(entries) {
      const out = [];
      for (const entry of entries) await bgReadEntry(entry, out, 0);
      return out;
    }

    // 只探尺寸：不插入 DOM，浏览器按需解码，不会把整张图铺进内存。
    function bgMeasure(file) {
      return new Promise((resolve) => {
        let url = '';
        try { url = URL.createObjectURL(file); } catch (e) { resolve(null); return; }
        const img = new Image();
        const finish = (value) => {
          try { URL.revokeObjectURL(url); } catch (e) { /* 忽略 */ }
          img.onload = null;
          img.onerror = null;
          resolve(value);
        };
        img.onload = () => finish(
          img.naturalWidth > 0 && img.naturalHeight > 0
            ? { width: img.naturalWidth, height: img.naturalHeight }
            : null,
        );
        img.onerror = () => finish(null);
        img.src = url;
      });
    }

    // createImageBitmap 的 resize 在解码阶段完成，位图从出生就是小的，
    // 于是「源文件多大」几乎不再影响峰值内存。
    async function bgDecode(file, maxEdge, natural) {
      if (natural && natural.width > 0 && natural.height > 0) {
        const scale = Math.min(1, maxEdge / Math.max(natural.width, natural.height));
        if (scale < 1) {
          try {
            return await createImageBitmap(file, {
              resizeWidth: Math.max(1, Math.round(natural.width * scale)),
              resizeHeight: Math.max(1, Math.round(natural.height * scale)),
              resizeQuality: 'high',
            });
          } catch (e) { /* 该格式不支持缩解码，退回整图 */ }
        }
      }
      return createImageBitmap(file);
    }

    function bgEncode(bitmap, maxEdge, quality) {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const g = canvas.getContext('2d');
      if (!g) return Promise.resolve(null);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(bitmap, 0, 0, width, height);
      return new Promise((resolve) => {
        const done = (blob) => resolve(blob || null);
        try {
          canvas.toBlob((blob) => {
            if (blob) { done(blob); return; }
            canvas.toBlob((fallback) => done(fallback), 'image/jpeg', quality);
          }, 'image/webp', quality);
        } catch (e) { done(null); }
      });
    }

    async function bgImportFile(file) {
      if (!file) return { ok: false, reason: '空文件' };
      if (!bgLooksLikeImage(file)) return { ok: false, reason: '不是图片' };
      if (file.size > BG_MAX_FILE) return { ok: false, reason: '超过 ' + bgMb(BG_MAX_FILE) + ' MB' };
      const natural = await bgMeasure(file);
      if (natural && natural.width * natural.height > BG_MAX_PIXELS) {
        return { ok: false, reason: '像素太大（' + natural.width + '×' + natural.height + '）' };
      }
      let bitmap;
      try { bitmap = await bgDecode(file, BG_MAX_EDGE, natural); } catch (e) { return { ok: false, reason: '无法解码' }; }
      try {
        const main = await bgEncode(bitmap, BG_MAX_EDGE, 0.9);
        if (!main) return { ok: false, reason: '编码失败' };
        const thumb = (await bgEncode(bitmap, BG_THUMB_EDGE, 0.8)) || main;
        const record = {
          id: 'bg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
          name: file.name || '未命名图片',
          blob: main,
          thumb,
          // 记原图尺寸（不是缩后的），设置页显示的就是用户导入的那张图
          width: natural ? natural.width : bitmap.width,
          height: natural ? natural.height : bitmap.height,
          bytes: file.size,
          addedAt: Date.now(),
        };
        await bgPutRecord(record);
        return { ok: true, record };
      } finally {
        try { if (bitmap.close) bitmap.close(); } catch (e) { /* 忽略 */ }
      }
    }

    // —— 变量与遮罩 ——
    function bgApplyVars() {
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      const bg = state.bg;
      // 没有图时一律视为关闭：否则会留下「半透明但没有壁纸」的空界面
      if (!bg.enabled || !bgImages.length) {
        delete root.dataset.iosBg;
        delete root.dataset.iosBgXfade;
        delete root.dataset.iosBgInstant;
        bgSetVar('--ios-bg-a', null);
        bgSetVar('--ios-bg-b', null);
        bgSetVar('--ios-bg-blur', null);
        bgSetVar('--ios-bg-sat', null);
        bgSetVar('--ios-bg-opacity', null);
        bgSetVar('--ios-bg-scrim', null);
        bgSetVar('--ios-bg-size', null);
        bgSetVar('--ios-bg-repeat', null);
        bgSetVar('--ios-bg-base-alpha', null);
        bgSetVar('--ios-bg-side-alpha', null);
        bgCurrentId = null;
        return;
      }
      root.dataset.iosBg = 'on';
      bgSetVar('--ios-bg-blur', bg.blur + 'px');
      bgSetVar('--ios-bg-sat', String(bg.saturation / 100));
      bgSetVar('--ios-bg-opacity', String(bg.wallpaper / 100));
      bgSetVar('--ios-bg-size', bg.fit === 'repeat' ? 'auto' : bg.fit);
      bgSetVar('--ios-bg-repeat', bg.fit === 'repeat' ? 'repeat' : 'no-repeat');
      const alpha = bg.scrim / 100;
      bgSetVar('--ios-bg-scrim', bgIsDark()
        ? 'rgba(0, 0, 0, ' + alpha + ')'
        : 'rgba(255, 255, 255, ' + alpha + ')');
    }

    // —— 画图：::before 是当前图，::after 是过渡图 ——
    function bgPaint(record, animate) {
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      const url = bgUrlFor(record, 'main');
      const image = url ? 'url("' + url + '")' : 'none';
      bgDiag.image = url
        ? ('已绘制 ' + (record && record.width ? record.width : '?') + '×' + (record && record.height ? record.height : '?'))
        : '取不到图片地址';

      if (!animate || bgPrefersReducedMotion()) {
        root.dataset.iosBgInstant = 'on';
        bgSetVar('--ios-bg-a', image);
        bgSetVar('--ios-bg-b', 'none');
        delete root.dataset.iosBgXfade;
        void root.offsetWidth;
        requestAnimationFrame(() => { try { delete root.dataset.iosBgInstant; } catch (e) { /* 忽略 */ } });
        bgCurrentId = record ? record.id : null;
        return;
      }

      // 过渡：先把新图无过渡地装到 ::after，再放开 opacity 过渡淡入
      root.dataset.iosBgInstant = 'on';
      bgSetVar('--ios-bg-b', image);
      delete root.dataset.iosBgXfade;
      void root.offsetWidth;
      requestAnimationFrame(() => {
        delete root.dataset.iosBgInstant;
        requestAnimationFrame(() => {
          try { root.dataset.iosBgXfade = 'on'; } catch (e) { /* 忽略 */ }
        });
      });
      if (bgXfadeTimer) clearTimeout(bgXfadeTimer);
      bgXfadeTimer = setTimeout(() => {
        bgXfadeTimer = null;
        // 收尾：把当前图换成新的（被 ::after 完全遮住，看不出变化），再把过渡层复位
        root.dataset.iosBgInstant = 'on';
        bgSetVar('--ios-bg-a', image);
        bgSetVar('--ios-bg-b', 'none');
        delete root.dataset.iosBgXfade;
        void root.offsetWidth;
        requestAnimationFrame(() => { try { delete root.dataset.iosBgInstant; } catch (e) { /* 忽略 */ } });
      }, BG_XFADE_MS);
      bgCurrentId = record ? record.id : null;
    }

    // —— 令牌透出层：让应用底/侧栏变半透明 ——
    // 注意：DSH 的主题令牌不是写在 <html>，而是由 ui-layout 的 presenter 逐条写进
    // body 的 inline style（body.style.setProperty）。所以「读当前底色」和「存原值」
    // 都必须落在 body 上，从 documentElement 读只会拿到空字符串。
    //
    // —— NEXT 的两个坑（都在这一个函数里处理）——
    //  R1 darwin：layout 对侧栏底色做了二次混合
    //      浅色 color-mix(in srgb, color-mix(in srgb, side-fill 97%, #7a9bf0) 40%, transparent)
    //      暗色 color-mix(in srgb, side-fill 50%, transparent)
    //     插件再把 side-fill 半透明化就是「两次叠乘」：用户设 80% 只剩 32%/40%。
    //     修法：darwin 下侧栏不再半透明化（写 100% 原值），让宿主自己的 40%/50% 成为唯一一层。
    //     为什么不「反解成 T/0.4」：外层 0.4 是乘在 alpha 上的权重，内层 alpha 最大 1.0，
    //     所以侧栏最终不透明度上限就是 40%（浅）/50%（暗），反解超过 100% 会被 color-mix
    //     clamp 回 100%，结果仍是 40%。这是宿主 CSS 字面量决定的物理上限，不写代码能绕开：
    //     真要突破只能改那条 background 简写，而它挂在哈希类名 .VFpnAa_sidebarCol 上，
    //     按项目约束禁止按 DSH 哈希类名写选择器。
    //     现状：32%/40%（两次叠乘）→ 修后 40%/50%（与宿主原生一致，不再额外衰减）。
    //     与「用户设 80%」的偏差仍存在，属宿主固有限制，已作为已知限制上报评审。
    //  R2 prefers-reduced-transparency: reduce：宿主在该分支把侧栏设成
    //     color-mix(side-fill 90%, transparent)，基数还是插件半透明化后的值，于是
    //     「90% × 插件 N%」依旧透出壁纸 —— 用户开无障碍选项反而更透。修法：该分支下
    //     插件写**不透明原值**，让宿主的 90% 落在实色上，结果 ≥90%。
    const REDUCED_TRANSPARENCY_QUERY = '(prefers-reduced-transparency: reduce)';

    function bgPrefersReducedTransparency() {
      try { return window.matchMedia(REDUCED_TRANSPARENCY_QUERY).matches; } catch (e) { return false; }
    }

    function bgIsDarwin() {
      if (typeof document === 'undefined') return false;
      try {
        const root = document.documentElement;
        return root.dataset.platform === 'darwin' || root.getAttribute('data-platform') === 'darwin';
      } catch (e) { return false; }
    }

    // 宿主对侧栏底色的最终折减系数（见 R1/R2）。非 darwin 为 1。
    //   reduce 分支：color-mix(side-fill 90%, transparent) → 0.9
    //   darwin 浅色：外层 color-mix(… 40%, transparent) → 0.4
    //   darwin 暗色：外层 50% → 0.5
    function bgSideFactor() {
      if (bgPrefersReducedTransparency()) return 0.9;
      if (!bgIsDarwin()) return 1;
      return bgIsDark() ? 0.5 : 0.4;
    }

    // 计算「该写进令牌的 alpha」（0–1）。
    //   reduce 或 darwin → 写满 100%：宿主自己会再折一次，插件不能再叠；
    //   其它平台        → 用户设定值。
    // 为什么不是「反解成 T / 0.4」：外层 0.4 是乘在内层 alpha 上的权重，
    // 内层 alpha 上限是 1.0，所以侧栏最终不透明度上限就是 40%（浅）/50%（暗）。
    // 反解出 200% 会被 color-mix clamp 回 100%，结果依旧是 40% —— 数学上绕不过去。
    function bgSurfaceAlpha(kind) {
      const target = Math.min(100, Math.max(0, state.bg.surface)) / 100;
      if (bgPrefersReducedTransparency()) return 1;
      if (kind !== 'side') return target;
      if (bgIsDarwin()) return 1;
      return target;
    }

    // 侧栏「最终看到的不透明度」= 写入值 × 宿主折减系数。给诊断文案与验证取样用。
    function bgSideEffectiveAlpha() {
      return bgSurfaceAlpha('side') * bgSideFactor();
    }

    // 把 0–1 的 alpha 变成百分比字符串，供 color-mix 消费（保留一位小数避免抖动）
    function bgAlphaPercent(alpha) {
      const pct = Math.round(alpha * 1000) / 10;
      return (pct % 1 === 0 ? String(pct) : pct.toFixed(1)) + '%';
    }

    function bgDisposeSurface() {
      if (bgSurfaceDispose) {
        try { bgSurfaceDispose(); } catch (e) { /* 忽略 */ }
        bgSurfaceDispose = null;
      }
      if (typeof document !== 'undefined') {
        try { delete document.documentElement.dataset.iosBgSurface; } catch (e) { /* 忽略 */ }
      }
      if (typeof document !== 'undefined' && document.body) {
        try {
          document.body.style.removeProperty('--ios-bg-base-raw');
          document.body.style.removeProperty('--ios-bg-side-raw');
        } catch (e) { /* 忽略 */ }
      }
      bgDiag.surface = '未启用';
      bgDiag.layers = '';
    }

    function bgApplySurface() {
      if (typeof document === 'undefined' || !ctx || !ctx.theme || !document.body) return;
      if (bgSurfaceBusy) return;
      bgSurfaceBusy = true;
      try {
        // 先撤掉自己的层，才能读到「不含自己」的真实底色
        bgDisposeSurface();
        if (!state.bg.enabled || !bgImages.length) {
          bgDiag.surface = state.bg.enabled ? '有开关但图库为空' : '未启用';
          return;
        }
        const body = document.body;
        const computed = getComputedStyle(body);
        const readVar = (name) => (computed.getPropertyValue(name) || '').trim();
        const rawBase = readVar('--dsw-alias-bg-base');
        const rawSide = readVar('--dsw-specific-sidebar-fill');
        if (!rawBase && !rawSide) {
          bgDiag.surface = '读不到底色令牌';
          // 首屏 presenter 可能还没投影完，稍后补一次。
          // 必须封顶：presenter 若始终不投影（测试环境、主题层被别的插件顶掉），
          // 无上限重试会变成每 400ms 一次的永久空转。
          if (!bgSurfaceRetry && bgSurfaceTries < 5) {
            bgSurfaceRetry = true;
            bgSurfaceTries += 1;
            setTimeout(() => { bgSurfaceRetry = false; bgApplySurface(); }, 400);
          } else if (bgSurfaceTries >= 5) {
            bgDiag.surface = '读不到底色令牌（已放弃重试）';
          }
          return;
        }
        bgSurfaceTries = 0;
        // 诊断文案要写出用户实际设的百分比，而不是各层换算后的 alpha
        const percent = state.bg.surface;
        // 两个 alpha 分开算：base 跟随用户值；side 在 darwin / reduce 下必须写满
        const baseAlpha = bgSurfaceAlpha('base');
        const sideAlpha = bgSurfaceAlpha('side');
        bgSetVar('--ios-bg-base-alpha', bgAlphaPercent(baseAlpha));
        bgSetVar('--ios-bg-side-alpha', bgAlphaPercent(sideAlpha));
        const tokens = {};
        // 值里引用自己存的 raw 变量而不是字面量：宿主换肤时 raw 会跟着变，
        // 引用式写法能自动跟上，字面量则会卡在切换那一刻的旧色。
        const mixOf = (varName, alpha) =>
          'color-mix(in srgb, var(' + varName + ') ' + bgAlphaPercent(alpha) + ', transparent)';
        const own = (raw, varName) => !!raw && raw.indexOf(varName) < 0;
        if (own(rawBase, '--ios-bg-base-raw')) {
          body.style.setProperty('--ios-bg-base-raw', rawBase);
          const value = mixOf('--ios-bg-base-raw', baseAlpha);
          tokens['--dsw-alias-bg-base'] = { light: value, dark: value };
        }
        if (own(rawSide, '--ios-bg-side-raw')) {
          body.style.setProperty('--ios-bg-side-raw', rawSide);
          const value = mixOf('--ios-bg-side-raw', sideAlpha);
          tokens['--dsw-specific-sidebar-fill'] = { light: value, dark: value };
        }
        // —— 只碰这两个令牌，别的一概不动 ——
        // 曾经试过把 --dsw-alias-bg-layer-1 也降成半透明，想让「卡片也透光」，
        // 结果是插件市场的卡片、聊天预览、侧栏按钮全部变半透明，下层文字浮上来叠印。
        // layer-1 不是「卡片底」，是所有控件级表面的共用底，改它等于把整页都透了。
        // 壁纸只能从窗口底透出来；压在窗口底之上的任何面都必须保持实底。
        if (Object.keys(tokens).length === 0) {
          bgDiag.surface = '无可覆盖令牌';
          bgDiag.layers = '';
          return;
        }
        // 主路径：让 CSS 里那条 !important 规则生效（压掉 body 的 inline 令牌）
        document.documentElement.dataset.iosBgSurface = 'on';
        bgDiag.layers = '窗口底+侧栏';
        // 诊断文案带上下文：darwin / reduce 下所见与滑块值不同，得能解释
        const notes = [];
        if (bgPrefersReducedTransparency()) {
          notes.push('降透明度模式：侧栏实底，实际 ' + Math.round(bgSideEffectiveAlpha() * 100) + '%');
        } else if (bgIsDarwin()) {
          notes.push('darwin 侧栏 ' + Math.round(bgSideEffectiveAlpha() * 100) + '%（宿主二次混合上限）');
        }
        bgDiag.surface = '底色 → ' + percent + '% · ' + bgDiag.layers
          + (notes.length ? '（' + notes.join('，') + '）' : '');
        // 双保险：同时进 snapshot，两者值相同，谁赢结果都一样
        try {
          bgSurfaceDispose = ctx.theme.overrideTokens(BG_SOURCE, tokens);
        } catch (e) {
          console.error('[dsh-theme-wallpaper] 背景透出层覆盖失败（CSS 路径仍然有效）:', e);
        }
      } finally {
        bgSurfaceBusy = false;
      }
    }

    // —— 轮换 ——
    function bgStopRotation() {
      if (bgTimer) { clearTimeout(bgTimer); bgTimer = null; }
    }

    function bgScheduleRotation() {
      bgStopRotation();
      if (!state.bg.enabled || !state.bg.rotate) return;
      if (bgImages.length < 2) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      bgTimer = setTimeout(() => {
        bgTimer = null;
        try { bgNext(); } catch (e) { /* 忽略 */ }
      }, Math.max(10, state.bg.intervalSec) * 1000);
    }

    function bgShowIndex(index, animate) {
      if (!bgImages.length) return;
      const total = bgImages.length;
      const next = ((Math.round(index) % total) + total) % total;
      state.bg.index = next;
      bgPaint(bgImages[next], animate === true);
    }

    function bgNext() {
      if (!bgImages.length) return;
      let next;
      if (state.bg.order === 'random' && bgImages.length > 1) {
        do { next = Math.floor(Math.random() * bgImages.length); }
        while (next === state.bg.index);
      } else {
        next = (state.bg.index + 1) % bgImages.length;
      }
      bgShowIndex(next, true);
      bgPersistSoon();
      notify();
      bgScheduleRotation();
    }

    function bgOnVisibility() {
      if (!state.bg.enabled || !state.bg.rotate) return;
      if (document.visibilityState === 'hidden') bgStopRotation();
      else bgScheduleRotation();
    }

    function bgPersistSoon() {
      if (bgSaveTimer) clearTimeout(bgSaveTimer);
      bgSaveTimer = setTimeout(() => { bgSaveTimer = null; saveState(); }, 180);
    }

    async function bgRefreshGallery() {
      try {
        bgImages = await bgListRecords();
      } catch (e) {
        console.error('[dsh-theme-wallpaper] 读取背景图库失败:', e);
        bgImages = [];
      }
      if (state.bg.index >= bgImages.length) state.bg.index = 0;
      return bgImages;
    }

    async function bgAddFiles(files, onProgress) {
      const list = Array.from(files || []);
      if (!list.length) return { added: 0, failed: 0, reason: '' };
      let added = 0;
      let failed = 0;
      let reason = '';
      const total = list.length;
      for (let i = 0; i < list.length; i += 1) {
        const file = list[i];
        if (bgImages.length + added >= BG_MAX_COUNT) {
          reason = '最多 ' + BG_MAX_COUNT + ' 张，剩下的先删几张再导';
          break;
        }
        if (typeof onProgress === 'function') {
          try { onProgress({ done: i, total, name: file.name || '' }); } catch (e) { /* 忽略 */ }
        }
        let result;
        try { result = await bgImportFile(file); } catch (e) { result = { ok: false, reason: '读取失败' }; }
        if (result && result.ok) added += 1;
        else {
          failed += 1;
          if (result && result.reason) reason = result.reason;
        }
        // 每张之间让出一帧，进度条才能真的动起来
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (added > 0) {
        await bgRefreshGallery();
        state.bg.enabled = true;
        bgApplyVars();
        reapplyLayers();
        const current = bgImages[state.bg.index];
        if (!current || bgCurrentId !== current.id) bgShowIndex(state.bg.index, false);
        bgScheduleRotation();
        bgPersistSoon();
      }
      notify();
      setTimeout(() => { try { bgDiagOverlay(); } catch (e) { /* 忽略 */ } }, 500);
      return { added, failed, reason };
    }

    async function bgRemoveRecord(record) {
      if (!record) return;
      try { await bgDeleteRecord(record.id); } catch (e) { /* 忽略 */ }
      const entry = bgUrlCache.get(record.id);
      if (entry) {
        try { URL.revokeObjectURL(entry.main); } catch (e) { /* 忽略 */ }
        try { URL.revokeObjectURL(entry.thumb); } catch (e) { /* 忽略 */ }
        bgUrlCache.delete(record.id);
      }
      await bgRefreshGallery();
      if (!bgImages.length) {
        state.bg.enabled = false;
        bgCurrentId = null;
        bgApplyVars();
        reapplyLayers();
        bgStopRotation();
      } else {
        bgShowIndex(Math.min(state.bg.index, bgImages.length - 1), false);
        bgScheduleRotation();
      }
      bgPersistSoon();
      notify();
    }

    async function bgClearAll() {
      try { await bgClearStore(); } catch (e) { /* 忽略 */ }
      bgReleaseUrls();
      bgImages = [];
      state.bg.index = 0;
      state.bg.enabled = false;
      bgCurrentId = null;
      bgApplyVars();
      reapplyLayers();
      bgStopRotation();
      bgPersistSoon();
      notify();
    }

    function bgSetParam(key, value) {
      if (!(key in state.bg)) return;
      state.bg[key] = value;
      // 顺序必须是「先写渲染变量，再重排层」：
      // bgApplyVars 负责把 --ios-bg-* 落到 <html> 上，reapplyLayers 里的
      // bgApplySurface 依赖这些变量算透明度。反过来拖滑块时能看见一帧旧值。
      bgApplyVars();
      // surface 改的是「界面底透到多透」，令牌值要重算，必须重排层。
      if (key === 'surface') reapplyLayers();
      if (key === 'rotate' || key === 'intervalSec' || key === 'order') bgScheduleRotation();
      bgPersistSoon();
      notify();
    }

    // 一键预设：把 5 个互相牵制的滑块一次性调成协调的一组。
    //
    // 单独调某一项很容易调出「壁纸看不见」或「文字看不清」的两头，
    // 预设给的是已经配平的组合，用户从预设出发再微调。
    function bgApplyPreset(id) {
      const preset = BG_PRESETS.find((p) => p.id === id);
      if (!preset) return;
      Object.keys(preset.bg).forEach((k) => {
        if (k in state.bg) state.bg[k] = preset.bg[k];
      });
      // 与 bgSetParam 同序：变量先落地，再重排层
      bgApplyVars();
      reapplyLayers();
      bgScheduleRotation();
      bgPersistSoon();
      notify();
    }

    function bgToggle(enabled) {
      const on = !!enabled;
      if (on && !bgImages.length) return;
      state.bg.enabled = on;
      if (on) {
        bgApplyVars();
        reapplyLayers();
        bgShowIndex(state.bg.index, false);
        bgScheduleRotation();
      } else {
        bgStopRotation();
        if (bgXfadeTimer) { clearTimeout(bgXfadeTimer); bgXfadeTimer = null; }
        bgApplyVars();
        reapplyLayers();
      }
      bgPersistSoon();
      notify();
    }

    // 渲染层：把当前图挂到 ::before / ::after 上，并按需排轮换。
    //
    // 令牌层（bgApplySurface）刻意不在这里调 —— 它注册的是 overrideTokens 的一层，
    // seq 顺序必须和主题层一起排（谁压谁取决于「忽略主题背景」），只能由
    // reapplyLayers() 统一负责。这里顺手再调一次会让壁纸层拿到更大的 seq，
    // 把 reapplyLayers() 刚排好的顺序打乱。
    function applyBackground() {
      if (typeof document === 'undefined') return;
      bgApplyVars();
      if (!state.bg.enabled || !bgImages.length) { bgStopRotation(); return; }
      const index = Math.min(state.bg.index, bgImages.length - 1);
      if (bgCurrentId !== bgImages[index].id) bgShowIndex(index, false);
      bgScheduleRotation();
    }

    // —— 自检浮层：只在启用背景图时出现，15 秒后自动消失 ——
    // 用它一次看清「渲染层有没有挂上 / 令牌有没有被改 / 是哪一层挡住了」。
    function bgDiagOverlay() {
      if (typeof document === 'undefined' || !state.bg.enabled || !bgImages.length) return;
      let box = document.getElementById('ios-bg-diag');
      if (!box) {
        box = document.createElement('div');
        box.id = 'ios-bg-diag';
        box.style.cssText = [
          'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483000',
          'max-width:560px', 'padding:10px 12px', 'border-radius:10px',
          'background:rgba(20,20,22,.92)', 'color:#fff',
          'font:11px/1.65 ui-monospace,Consolas,monospace',
          'white-space:pre-wrap', 'pointer-events:none',
          'box-shadow:0 8px 24px rgba(0,0,0,.3)',
        ].join(';');
        document.body.appendChild(box);
      }
      const body = document.body;
      const root = document.documentElement;
      const frame = document.querySelector('#root > *');
      const kids = frame
        ? Array.from(frame.children).slice(0, 4).map((el) => {
          const name = (el.className || el.tagName || '').toString().replace(/_[A-Za-z0-9]+$/, '').slice(0, 22);
          return name + ' = ' + getComputedStyle(el).backgroundColor;
        })
        : [];
      box.textContent = [
        '背景图自检（15 秒后自动消失）',
        'data-ios-bg   : ' + (root.dataset.iosBg || '(未设置)'),
        'surface 标记  : ' + (root.dataset.iosBgSurface || '(未设置)'),
        '--ios-bg-a    : ' + (root.style.getPropertyValue('--ios-bg-a') ? '已设置' : '(空)'),
        '--ios-bg-base-raw : ' + (body.style.getPropertyValue('--ios-bg-base-raw') || '(空)'),
        'token 现值    : ' + (body.style.getPropertyValue('--dsw-alias-bg-base') || '(空)'),
        'token 计算值  : ' + (getComputedStyle(body).getPropertyValue('--dsw-alias-bg-base') || '(空)'),
        'body 背景     : ' + getComputedStyle(body).backgroundColor,
        'frame 背景    : ' + (frame ? getComputedStyle(frame).backgroundColor : '(找不到 #root 子元素)'),
      ].concat(kids.length ? ['子列背景      : ' + kids.join(' | ')] : [])
        .concat([
          '透出层        : ' + bgDiag.surface,
          '渲染层        : ' + bgDiag.image,
        ])
        .join('\n');
      if (bgDiagTimer) clearTimeout(bgDiagTimer);
      bgDiagTimer = setTimeout(() => {
        bgDiagTimer = null;
        try { box.remove(); } catch (e) { /* 忽略 */ }
      }, 15000);
    }

    function bgBootstrap() {
      try { document.addEventListener('visibilitychange', bgOnVisibility); } catch (e) { /* 忽略 */ }
      bgRefreshGallery().then(() => {
        if (state.bg.enabled && bgImages.length) {
          bgApplyVars();
          reapplyLayers();
          bgShowIndex(state.bg.index, false);
          bgScheduleRotation();
        }
        notify();
        // 等 presenter 投影完再看真实状态
        setTimeout(() => { try { bgDiagOverlay(); } catch (e) { /* 忽略 */ } }, 500);
      }).catch(() => { /* 忽略 */ });
    }

    function bgTeardown() {
      bgStopRotation();
      if (bgXfadeTimer) { clearTimeout(bgXfadeTimer); bgXfadeTimer = null; }
      if (bgSaveTimer) { clearTimeout(bgSaveTimer); bgSaveTimer = null; }
      if (bgDiagTimer) { clearTimeout(bgDiagTimer); bgDiagTimer = null; }
      try {
        const box = document.getElementById('ios-bg-diag');
        if (box) box.remove();
      } catch (e) { /* 忽略 */ }
      try { document.removeEventListener('visibilitychange', bgOnVisibility); } catch (e) { /* 忽略 */ }
      bgReleaseUrls();
      bgDisposeSurface();
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        try {
          delete root.dataset.iosBg;
          delete root.dataset.iosBgXfade;
          delete root.dataset.iosBgInstant;
          delete root.dataset.iosBgSurface;
          // 名单必须与 bgApplyVars / bgApplySurface 写入的变量一一对应。
          // 曾漏过 --ios-bg-surface，卸载后 <html> 上留一串 --ios-* 是 A19「卸载净空」的硬伤。
          // 旧版本写过的变量名（--ios-bg-surface / layer1-alpha / container-alpha）
          // 也留在名单里，防跨版本热更新后残留。
          for (const name of [
            '--ios-bg-a', '--ios-bg-b', '--ios-bg-blur', '--ios-bg-sat',
            '--ios-bg-opacity', '--ios-bg-scrim', '--ios-bg-size', '--ios-bg-repeat',
            '--ios-bg-base-alpha', '--ios-bg-side-alpha',
            '--ios-bg-surface', '--ios-bg-layer1-alpha', '--ios-bg-container-alpha',
          ]) {
            root.style.removeProperty(name);
          }
        } catch (e) { /* 忽略 */ }
      }
      bgCurrentId = null;
    }

    // —— 背景图卡片（拖动/粘贴导入、图库、参数、轮换）——
    //
    // 每个滑块配一句 hint：光给「模糊 18px」这种值，用户不知道调大调小会怎样，
    // 也不知道调到头的后果。说明行写的是「往哪个方向变、代价是什么」。
    function BgSlider({ label, value, min, max, step, unit, hint, onChange }) {
      const id = 'ios-bg-' + label;
      return h('div', { className: 'ios-thm-field' },
        h('div', { className: 'ios-thm-slider-head' },
          h('label', { className: 'ios-thm-field-label', htmlFor: id }, label),
          h('span', { className: 'ios-thm-slider-value' }, String(value) + (unit || ''))),
        h('input', {
          id,
          type: 'range',
          className: 'ios-thm-range',
          min,
          max,
          step,
          value: String(value),
          onChange: (e) => onChange(Number(e.target.value)),
        }),
        hint ? h('div', { className: 'ios-thm-slider-hint' }, hint) : null);
    }

    function BgCard() {
      const [busy, setBusy] = useState(false);
      const [dragOver, setDragOver] = useState(false);
      const [notice, setNotice] = useState('');
      const [progress, setProgress] = useState(null);
      const fileRef = useRef(null);
      const dirRef = useRef(null);
      const bg = state.bg;
      const count = bgImages.length;

      // webkitdirectory 只能靠 setAttribute 挂上去，React 不认这个属性
      useEffect(() => {
        try {
          if (dirRef.current) {
            dirRef.current.setAttribute('webkitdirectory', '');
            dirRef.current.setAttribute('directory', '');
          }
        } catch (e) { /* 忽略 */ }
      }, []);

      const addFiles = async (files) => {
        const list = Array.from(files || []);
        if (!list.length) { setNotice('没有找到可导入的图片'); return; }
        setBusy(true);
        setNotice('');
        setProgress({ done: 0, total: list.length, name: '' });
        try {
          const result = await bgAddFiles(list, (p) => setProgress(p));
          if (!result.added) {
            setNotice('没有导入成功：' + (result.reason || '请确认是图片'));
          } else {
            const tail = result.failed
              ? '，另有 ' + result.failed + ' 张没进去（' + (result.reason || '格式不支持') + '）'
              : '';
            setNotice('已导入 ' + result.added + ' 张，当前共 ' + bgImages.length + ' 张' + tail);
          }
        } catch (e) {
          setNotice('导入失败：' + (e && e.message ? e.message : '未知错误'));
        } finally {
          setBusy(false);
          setProgress(null);
        }
      };

      const onDrop = async (e) => {
        e.preventDefault();
        setDragOver(false);
        const dt = e.dataTransfer;
        if (!dt) return;
        // entries 必须在这一步同步取出，异步之后就失效了
        const entries = Array.from(dt.items || [])
          .map((item) => (item && item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
          .filter(Boolean);
        if (entries.some((entry) => entry && entry.isDirectory)) {
          setBusy(true);
          setNotice('正在读取文件夹…');
          let files = [];
          try { files = await bgCollectEntries(entries); } catch (err) { files = []; }
          setBusy(false);
          await addFiles(files);
          return;
        }
        await addFiles(Array.from(dt.files || []));
      };

      const onPaste = async (e) => {
        const items = e.clipboardData ? Array.from(e.clipboardData.items || []) : [];
        const files = [];
        for (const item of items) {
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }
        if (files.length) {
          e.preventDefault();
          await addFiles(files);
        }
      };

      const selectIndex = (i) => {
        state.bg.enabled = true;
        bgShowIndex(i, false);
        bgApplyVars();
        reapplyLayers();
        bgScheduleRotation();
        bgPersistSoon();
        notify();
      };

      return h('section', { className: 'ios-thm-card' },
        h('div', { className: 'ios-thm-row' },
          h('div', { className: 'ios-thm-row-text' },
            h('div', { className: 'ios-thm-row-label' }, '背景图'),
            h('div', { className: 'ios-thm-row-sub' }, '本机图片铺在窗口最底层，可模糊、可轮换')),
          h('button', {
            role: 'switch',
            'aria-checked': bg.enabled,
            'aria-label': '背景图开关',
            disabled: count === 0,
            className: 'ios-thm-switch' + (count === 0 ? ' ios-thm-switch-disabled' : ''),
            onClick: () => bgToggle(!bg.enabled),
          }, h('span', { className: 'ios-thm-switch-knob' }))),

        h('div', {
          className: 'ios-thm-drop' + (dragOver ? ' ios-thm-drop-over' : ''),
          tabIndex: 0,
          onDragOver: (e) => { e.preventDefault(); if (!dragOver) setDragOver(true); },
          onDragLeave: () => setDragOver(false),
          onDrop,
          onPaste,
        },
          h('div', { className: 'ios-thm-drop-text' },
            count
              ? '把图片或整个文件夹拖进来，也可以 Ctrl+V 粘贴'
              : '把图片或整个文件夹拖进来，导入后自动开启'),
          h('div', { className: 'ios-thm-drop-actions' },
            h('button', {
              className: 'ios-thm-preset',
              disabled: busy,
              onClick: () => { try { if (fileRef.current) fileRef.current.click(); } catch (e) { /* 忽略 */ } },
            }, busy ? '处理中…' : '选择图片'),
            h('button', {
              className: 'ios-thm-preset',
              disabled: busy,
              onClick: () => { try { if (dirRef.current) dirRef.current.click(); } catch (e) { /* 忽略 */ } },
            }, '选择文件夹'),
            count ? h('button', {
              className: 'ios-thm-textbtn',
              onClick: () => { bgClearAll().catch(() => { /* 忽略 */ }); },
            }, '清空') : null),
          h('input', {
            ref: fileRef,
            type: 'file',
            accept: 'image/*',
            multiple: true,
            className: 'ios-thm-file',
            onChange: async (e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              try { e.target.value = ''; } catch (err) { /* 忽略 */ }
              await addFiles(files);
            },
          }),
          h('input', {
            ref: dirRef,
            type: 'file',
            multiple: true,
            className: 'ios-thm-file',
            onChange: async (e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              try { e.target.value = ''; } catch (err) { /* 忽略 */ }
              await addFiles(files);
            },
          }),
          progress ? h('div', { className: 'ios-thm-diag' },
            '正在导入 ' + Math.min(progress.done + 1, progress.total) + ' / ' + progress.total
            + (progress.name ? ' · ' + progress.name : '') + '…') : null,
          notice ? h('div', { className: 'ios-thm-diag' }, notice) : null),

        count > 0 ? h('div', { className: 'ios-thm-bg-grid' },
          bgImages.map((record, i) => {
            const thumb = bgUrlFor(record, 'thumb');
            const active = i === bg.index;
            return h('div', {
              key: record.id,
              className: 'ios-thm-bg-item' + (active ? ' ios-thm-bg-item-active' : ''),
            },
              h('button', {
                className: 'ios-thm-bg-thumb',
                title: record.name,
                'aria-label': '预览 ' + record.name,
                'aria-pressed': active,
                onClick: () => selectIndex(i),
              }, thumb ? h('img', { src: thumb, alt: '' }) : null),
              h('button', {
                className: 'ios-thm-bg-del',
                title: '删除',
                'aria-label': '删除 ' + record.name,
                onClick: () => { bgRemoveRecord(record).catch(() => { /* 忽略 */ }); },
              }, '\u00d7'));
          }))
          : null,

        count > 0 ? h('div', null,
          // 预设放在滑块之前：先给一个配好的整体观感，再让用户微调单项。
          // 顺序反过来（先 5 个滑块再预设）会让人先被数字劝退。
          h('div', { className: 'ios-thm-field' },
            h('div', { className: 'ios-thm-field-label' }, '一键预设'),
            h('div', { className: 'ios-thm-inline' },
              BG_PRESETS.map((p) => h('button', {
                key: p.id,
                className: 'ios-thm-preset',
                title: p.hint,
                'aria-label': p.label + '：' + p.hint,
                onClick: () => bgApplyPreset(p.id),
              }, p.label)))),
          // 曾经在这里放过一个「透出范围」三档（仅窗口底 / 再透控件 / 连面板一起）。
          // 做出来才发现它必然导致叠印：DSH 的 --dsw-alias-bg-layer-1 不是「卡片底」，
          // 是所有控件级表面的共用底，插件市场的卡片、聊天预览、侧栏按钮都用它。
          // 一旦降成半透明，下层文字立刻从这些面浮上来 —— 截图里就是整页字体重叠。
          // 结论：壁纸只从窗口底与侧栏透出，压在它们之上的面必须实底，这个取舍不给用户选。
          h(BgSlider, { label: '模糊', value: bg.blur, min: 0, max: 40, step: 1, unit: 'px', hint: '越大壁纸越虚、文字越清楚；0 是原图直出。', onChange: (v) => bgSetParam('blur', v) }),
          h(BgSlider, { label: '遮罩深度', value: bg.scrim, min: 0, max: 80, step: 1, unit: '%', hint: '在壁纸上压一层同色薄纱，深色压黑、浅色压白；浅色主题建议 30% 以上。', onChange: (v) => bgSetParam('scrim', v) }),
          h(BgSlider, { label: '壁纸透明度', value: bg.wallpaper, min: 20, max: 100, step: 1, unit: '%', hint: '只影响壁纸本身，不影响界面元素。', onChange: (v) => bgSetParam('wallpaper', v) }),
          h(BgSlider, { label: '界面底透明度', value: bg.surface, min: 40, max: 100, step: 1, unit: '%', hint: '窗口底与侧栏保留多少底色；数值越小壁纸越明显。卡片、菜单始终实底，不受此项影响。', onChange: (v) => bgSetParam('surface', v) }),
          h(BgSlider, { label: '饱和度', value: bg.saturation, min: 0, max: 200, step: 1, unit: '%', hint: '壁纸的色彩浓度；低于 100% 发灰，调高会让深色主题更艳。', onChange: (v) => bgSetParam('saturation', v) }),
          h('div', { className: 'ios-thm-field' },
            h('div', { className: 'ios-thm-field-label' }, '填充方式'),
            h(ChipRow, { options: BG_FITS, value: bg.fit, onSelect: (id) => bgSetParam('fit', id) })),
          h('div', { className: 'ios-thm-field' },
            h('div', { className: 'ios-thm-field-label' }, '轮换'),
            h('div', { className: 'ios-thm-inline' },
              h('button', {
                role: 'switch',
                'aria-checked': bg.rotate,
                'aria-label': '自动轮换',
                className: 'ios-thm-switch',
                onClick: () => bgSetParam('rotate', !bg.rotate),
              }, h('span', { className: 'ios-thm-switch-knob' })),
              h(ChipRow, { options: BG_ORDERS, value: bg.order, onSelect: (id) => bgSetParam('order', id) })),
            h('div', { className: 'ios-thm-field' },
              h(ChipRow, { options: BG_INTERVALS, value: bg.intervalSec, onSelect: (id) => bgSetParam('intervalSec', id) }))),
          h('div', { className: 'ios-thm-inline' },
            h('button', { className: 'ios-thm-textbtn', onClick: () => bgNext() }, '下一张'),
            h('span', {
              className: 'ios-thm-diag',
              title: '渲染层：' + bgDiag.image + '\n透出层：' + bgDiag.surface + '\n覆盖范围：' + (bgDiag.layers || '无'),
            }, '当前 ' + Math.min(bg.index + 1, count) + ' / ' + count + ' · ' + bgDiag.image + ' · ' + bgDiag.surface)))
          : null);
    }
