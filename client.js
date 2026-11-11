/**
 * dsh-ios-theme — 浏览器半
 *
 * iOS 风格外观插件：
 *  1. 浅色 / 深色 / 自动 分段切换（写 DSH 原生主题偏好 ctx.theme.setTheme）
 *  2. 强调色色板（overrideTokens 覆盖 --dsw-alias-brand-primary，localStorage 持久化）
 *  3. 夜间护眼开关（暖色调令牌覆盖，仿 Night Shift）
 *  4. 调色板预设（OpenCode 默认主题 oc-2 的真实语义色，13 个 alias 令牌成对覆盖）
 *  5. 字体设置（Inter / IBM Plex Mono / 行高 / 字距，含一键 OpenCode 排版预设）
 *  6. 平滑过渡动效（注入颜色 transition，仿 iOS 深浅切换渐变）
 *
 * 机制参照 dsh-opencode-palette 的成熟路径：settings.section 注册设置页、
 * theme.overrideTokens 叠加令牌层、localStorage 持久化、ctx.effect 清理。
 */
window.__ModuleLoader__.load({
  id: '@cnhenaihui/dsh-ios-theme',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef } = React;

    // —— 常量 ——
    const SOURCE_ACCENT = 'dsh-ios-theme:accent';
    const SOURCE_NIGHT = 'dsh-ios-theme:night';
    const SOURCE_PALETTE = 'dsh-ios-theme:palette';
    const SOURCE_TYPE = 'dsh-ios-theme:type';
    const STORAGE_KEY = 'dsh-ios-theme:v1';
    const SECTION_ID = 'appearance';
    const SECTION_ORDER = 25;

    // —— 背景图（壁纸）——
    // 图片存 IndexedDB（Blob，不占 localStorage 配额），参数并入同一份 state。
    // 渲染层是两个 z-index:-1 的 body 伪元素：不 append 节点、不碰 DSH 的哈希类名。
    const BG_SOURCE = 'dsh-ios-theme:bg';
    const BG_DB_NAME = 'dsh-ios-theme';
    const BG_DB_VERSION = 1;
    const BG_STORE = 'backgrounds';
    const BG_MAX_COUNT = 36;
    // 源文件字节上限：只管住「往内存里读多大一份」。
    // 存进去的永远是被重编码的 ≤2560px webp，所以这个数可以给得很大。
    const BG_MAX_FILE = 64 * 1024 * 1024;
    // 真正的天花板是像素数（解码内存 ≈ 宽×高×4）。1.2 亿像素 ≈ 12000×10000，
    // 已经覆盖手机高像素模式和大部分相机原图；再大浏览器自己也容易解不动。
    const BG_MAX_PIXELS = 120000000;
    const BG_MAX_EDGE = 2560;
    const BG_THUMB_EDGE = 320;
    const BG_XFADE_MS = 800;

    const BG_DEFAULTS = {
      enabled: false,
      blur: 18,
      scrim: 20,
      wallpaper: 100,
      surface: 80,
      saturation: 100,
      fit: 'cover',
      rotate: false,
      intervalSec: 300,
      order: 'sequential',
      index: 0,
    };

    const BG_INTERVALS = [
      { id: 30, label: '30 秒' },
      { id: 60, label: '1 分钟' },
      { id: 300, label: '5 分钟' },
      { id: 900, label: '15 分钟' },
      { id: 1800, label: '30 分钟' },
    ];

    const BG_FITS = [
      { id: 'cover', label: '铺满' },
      { id: 'contain', label: '完整' },
      { id: 'repeat', label: '平铺' },
    ];

    const BG_ORDERS = [
      { id: 'sequential', label: '顺序' },
      { id: 'random', label: '随机' },
    ];

    // iOS 系统强调色（浅色/深色两值，来自 iOS 16+ 调色板）
    const ACCENTS = [
      { id: 'blue', label: '蓝', light: '#0a84ff', dark: '#0a84ff' },
      { id: 'purple', label: '紫', light: '#bf5af2', dark: '#bf5af2' },
      { id: 'pink', label: '粉', light: '#ff2d55', dark: '#ff375f' },
      { id: 'red', label: '红', light: '#ff3b30', dark: '#ff453a' },
      { id: 'orange', label: '橙', light: '#ff9500', dark: '#ff9f0a' },
      { id: 'yellow', label: '黄', light: '#ffcc00', dark: '#ffd60a' },
      { id: 'green', label: '绿', light: '#34c759', dark: '#30d158' },
      { id: 'gray', label: '灰', light: '#8e8e93', dark: '#8e8e93' },
      { id: 'peach', label: '桃（OpenCode 品牌色）', light: '#fab283', dark: '#fab283' },
    ];

    // 夜间护眼：暖色纸感令牌（亮/暗两套）
    const NIGHT_TOKENS = {
      '--dsw-alias-bg-base': { light: '#f6efe6', dark: '#181209' },
      '--dsw-alias-bg-layer-1': { light: '#fdf8f0', dark: '#211a11' },
      '--dsw-alias-bg-layer-2': { light: '#f1e8dc', dark: '#2b2217' },
      '--dsw-alias-bg-overlay': { light: '#fffaf2', dark: '#1d150c' },
      '--dsw-alias-border-l1': { light: '#e8ddcb', dark: '#3b301f' },
      '--dsw-alias-border-l2': { light: '#dacbb2', dark: '#4b3d28' },
      '--dsw-alias-label-primary': { light: '#3a2e21', dark: '#f3e9d8' },
      '--dsw-alias-label-secondary': { light: '#6f6150', dark: '#ab9c83' },
    };

    // —— OpenCode 调色板（真实取值，来自 opencode 仓库 packages/ui/src/theme/themes/oc-2.json
    //     —— 即 DEFAULT_THEMES 第一条、唯一同时定义 light/dark 的默认主题）——
    //   语义层（v2）：bg.base #161616 / panel #242424 / element #2e2e2e；text #fafafa / #aeaeae / #808080
    //   强调：accent #a2bcff(dark) / #3b5cf6(light)；品牌桃 #fab283 是 opencode 的 palette primary
    //   状态色取「语义前景色」（opencode 专门为文字可读性调过），不是高饱和的 palette 原值
    const PALETTES = [
      {
        id: 'opencode',
        label: 'OpenCode',
        hint: '中性灰阶 + 蓝色强调（oc-2 默认主题）',
        swatches: ['#161616', '#3b5cf6', '#fab283', '#fafafa'],
        tokens: {
          '--dsw-alias-bg-base': { light: '#ffffff', dark: '#161616' },
          '--dsw-alias-bg-layer-1': { light: '#fafafa', dark: '#242424' },
          '--dsw-alias-bg-layer-2': { light: '#f2f2f2', dark: '#2e2e2e' },
          '--dsw-alias-bg-overlay': { light: '#ffffff', dark: '#2e2e2e' },
          '--dsw-alias-border-l1': { light: '#0000001a', dark: '#ffffff1a' },
          '--dsw-alias-border-l2': { light: '#00000033', dark: '#ffffff33' },
          '--dsw-alias-label-primary': { light: '#161616', dark: '#fafafa' },
          '--dsw-alias-label-secondary': { light: '#5c5c5c', dark: '#aeaeae' },
          '--dsw-alias-brand-primary': { light: '#3b5cf6', dark: '#a2bcff' },
          '--dsw-alias-state-error-primary': { light: '#b82d35', dark: '#f17471' },
          '--dsw-alias-state-warn-primary': { light: '#cb9f34', dark: '#f2cf76' },
          '--dsw-alias-state-success-primary': { light: '#198b43', dark: '#6bd586' },
          '--dsw-alias-state-idle-primary': { light: '#808080', dark: '#808080' },
        },
      },
    ];

    // —— 字体预设（OpenCode 用的是 Inter + IBM Plex Mono，行高 150%）——
    const UI_FONTS = [
      { id: 'system', label: '系统默认', stack: null },
      {
        id: 'inter',
        label: 'Inter（OpenCode）',
        stack: '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      },
      { id: 'plex', label: 'IBM Plex 混排', stack: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
    ];

    const CODE_FONTS = [
      { id: 'default', label: '默认', stack: null },
      {
        id: 'plex',
        label: 'IBM Plex Mono',
        stack: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      },
      {
        id: 'jetbrains',
        label: 'JetBrains Mono',
        stack: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      },
      { id: 'cascadia', label: 'Cascadia Code', stack: '"Cascadia Code", "Cascadia Mono", Consolas, ui-monospace, monospace' },
    ];

    const LINE_HEIGHTS = [
      { id: 'host', label: '默认', value: null },
      { id: 'compact', label: '130%', value: '1.3' },
      { id: 'normal', label: '150%', value: '1.5' },
      { id: 'relaxed', label: '180%', value: '1.8' },
    ];

    const TRACKINGS = [
      { id: 'host', label: '默认', value: null },
      { id: 'tight', label: '收紧', value: '-0.01em' },
      { id: 'wide', label: '放宽', value: '0.01em' },
    ];
    // —— 模块级运行时状态（apply 内初始化，组件经闭包访问）——
    let ctx = null;
    let accentDispose = null;
    let nightDispose = null;
    let paletteDispose = null;
    let typeDispose = null;
    let listeners = [];
    let state = {
      accent: null,
      night: false,
      emphasis: true,
      palette: null,
      uiFont: 'system',
      codeFont: 'default',
      lineHeight: 'host',
      tracking: 'host',
      bg: { ...BG_DEFAULTS },
    };

    function clampNumber(value, lo, hi, fallback) {
      if (typeof value !== 'number' || !isFinite(value)) return fallback;
      return Math.min(hi, Math.max(lo, Math.round(value)));
    }

    function sanitizeBg(raw) {
      const src = raw && typeof raw === 'object' ? raw : {};
      return {
        enabled: src.enabled === true,
        blur: clampNumber(src.blur, 0, 40, BG_DEFAULTS.blur),
        scrim: clampNumber(src.scrim, 0, 80, BG_DEFAULTS.scrim),
        wallpaper: clampNumber(src.wallpaper, 20, 100, BG_DEFAULTS.wallpaper),
        surface: clampNumber(src.surface, 40, 100, BG_DEFAULTS.surface),
        saturation: clampNumber(src.saturation, 0, 200, BG_DEFAULTS.saturation),
        fit: BG_FITS.some((f) => f.id === src.fit) ? src.fit : BG_DEFAULTS.fit,
        rotate: src.rotate === true,
        intervalSec: BG_INTERVALS.some((i) => i.id === src.intervalSec) ? src.intervalSec : BG_DEFAULTS.intervalSec,
        order: BG_ORDERS.some((o) => o.id === src.order) ? src.order : BG_DEFAULTS.order,
        index: clampNumber(src.index, 0, 9999, 0),
      };
    }

    function pick(list, id, fallback) {
      return list.some((x) => x.id === id) ? id : fallback;
    }

    function loadState() {
      try {
        const raw = globalThis.localStorage && localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        state = {
          accent: ACCENTS.some((a) => a.id === parsed.accent) ? parsed.accent : null,
          night: parsed.night === true,
          emphasis: parsed.emphasis !== false,
          palette: PALETTES.some((p) => p.id === parsed.palette) ? parsed.palette : null,
          uiFont: pick(UI_FONTS, parsed.uiFont, 'system'),
          codeFont: pick(CODE_FONTS, parsed.codeFont, 'default'),
          lineHeight: pick(LINE_HEIGHTS, parsed.lineHeight, 'host'),
          tracking: pick(TRACKINGS, parsed.tracking, 'host'),
          bg: sanitizeBg(parsed.bg),
        };
      } catch (e) { /* 损坏状态忽略，走默认 */ }
    }

    function saveState() {
      try {
        if (globalThis.localStorage) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) { /* 忽略 */ }
    }

    function applyAccent() {
      if (accentDispose) { try { accentDispose(); } catch (e) { /* 忽略 */ } accentDispose = null; }
      if (!ctx || !state.accent) return;
      const a = ACCENTS.find((x) => x.id === state.accent);
      if (!a) return;
      try {
        accentDispose = ctx.theme.overrideTokens(SOURCE_ACCENT, {
          '--dsw-alias-brand-primary': { light: a.light, dark: a.dark },
        });
      } catch (e) {
        console.error('[dsh-ios-theme] 强调色覆盖失败:', e);
      }
    }

    function applyNight() {
      if (nightDispose) { try { nightDispose(); } catch (e) { /* 忽略 */ } nightDispose = null; }
      if (!ctx || !state.night) return;
      try {
        nightDispose = ctx.theme.overrideTokens(SOURCE_NIGHT, NIGHT_TOKENS);
      } catch (e) {
        console.error('[dsh-ios-theme] 夜间护眼覆盖失败:', e);
      }
    }

    function applyPalette() {
      if (paletteDispose) { try { paletteDispose(); } catch (e) { /* 忽略 */ } paletteDispose = null; }
      if (!ctx || !state.palette) return;
      const p = PALETTES.find((x) => x.id === state.palette);
      if (!p) return;
      try {
        paletteDispose = ctx.theme.overrideTokens(SOURCE_PALETTE, p.tokens);
      } catch (e) {
        console.error('[dsh-ios-theme] 调色板覆盖失败:', e);
      }
    }

    // 行高 / 字距：写 CSS 变量，样式表里让 Markdown 内容消费它们
    function applyTypeVars() {
      if (typeof document === 'undefined') return;
      try {
        const root = document.documentElement;
        const lh = LINE_HEIGHTS.find((x) => x.id === state.lineHeight);
        const tk = TRACKINGS.find((x) => x.id === state.tracking);
        if (lh && lh.value) { root.style.setProperty('--ios-lh', lh.value); root.dataset.iosLh = 'on'; }
        else { root.style.removeProperty('--ios-lh'); delete root.dataset.iosLh; }
        if (tk && tk.value) { root.style.setProperty('--ios-track', tk.value); root.dataset.iosTrack = 'on'; }
        else { root.style.removeProperty('--ios-track'); delete root.dataset.iosTrack; }
      } catch (e) { /* 忽略 */ }
    }

    function applyTypography() {
      applyTypeVars();
      if (typeDispose) { try { typeDispose(); } catch (e) { /* 忽略 */ } typeDispose = null; }
      if (!ctx) return;
      const ui = UI_FONTS.find((x) => x.id === state.uiFont);
      const code = CODE_FONTS.find((x) => x.id === state.codeFont);
      const tokens = {};
      if (ui && ui.stack) tokens['--dsw-font-family'] = { light: ui.stack, dark: ui.stack };
      if (code && code.stack) tokens['--ds-font-family-code'] = { light: code.stack, dark: code.stack };
      if (Object.keys(tokens).length === 0) return;
      try {
        typeDispose = ctx.theme.overrideTokens(SOURCE_TYPE, tokens);
      } catch (e) {
        console.error('[dsh-ios-theme] 字体覆盖失败:', e);
      }
    }

    // ===== 背景图（壁纸）=====
    // 数据：Blob 存 IndexedDB，参数并入 state。
    // 渲染：两个 z-index:-1 的 body 伪元素（::before 当前图，::after 过渡图），
    //       只改 CSS 变量与 data 标记，不新增 DOM、不依赖 DSH 的哈希类名。
    // 透出：--dsw-alias-bg-base / --dsw-specific-sidebar-fill 覆盖成
    //       color-mix(原值 N%, transparent)，原值另存 --ios-bg-*-raw 避免变量自引用。

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
    let bgDiagTimer = null;
    // 诊断：设置页里直接显示「透出层 / 渲染层」的真实状态，排障不用开 DevTools
    let bgDiag = { surface: '未启用', image: '无图' };

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
        bgSetVar('--ios-bg-surface', null);
        bgCurrentId = null;
        return;
      }
      root.dataset.iosBg = 'on';
      bgSetVar('--ios-bg-blur', bg.blur + 'px');
      bgSetVar('--ios-bg-sat', String(bg.saturation / 100));
      bgSetVar('--ios-bg-opacity', String(bg.wallpaper / 100));
      bgSetVar('--ios-bg-surface', String(bg.surface));
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
        const rawBase = (computed.getPropertyValue('--dsw-alias-bg-base') || '').trim();
        const rawSide = (computed.getPropertyValue('--dsw-specific-sidebar-fill') || '').trim();
        if (!rawBase && !rawSide) {
          bgDiag.surface = '读不到底色令牌';
          // 首屏 presenter 可能还没投影完，稍后补一次
          if (!bgSurfaceRetry) {
            bgSurfaceRetry = true;
            setTimeout(() => { bgSurfaceRetry = false; bgApplySurface(); }, 400);
          }
          return;
        }
        const percent = state.bg.surface;
        const tokens = {};
        if (rawBase && rawBase.indexOf('--ios-bg-base-raw') < 0) {
          body.style.setProperty('--ios-bg-base-raw', rawBase);
          const value = 'color-mix(in srgb, var(--ios-bg-base-raw) ' + percent + '%, transparent)';
          tokens['--dsw-alias-bg-base'] = { light: value, dark: value };
        }
        if (rawSide && rawSide.indexOf('--ios-bg-side-raw') < 0) {
          body.style.setProperty('--ios-bg-side-raw', rawSide);
          const value = 'color-mix(in srgb, var(--ios-bg-side-raw) ' + percent + '%, transparent)';
          tokens['--dsw-specific-sidebar-fill'] = { light: value, dark: value };
        }
        if (Object.keys(tokens).length === 0) {
          bgDiag.surface = '无可覆盖令牌';
          return;
        }
        // 主路径：让 CSS 里那条 !important 规则生效（压掉 body 的 inline 令牌）
        document.documentElement.dataset.iosBgSurface = 'on';
        bgDiag.surface = '底色 ' + rawBase + ' → ' + percent + '%';
        // 双保险：同时进 snapshot，两者值相同，谁赢结果都一样
        try {
          bgSurfaceDispose = ctx.theme.overrideTokens(BG_SOURCE, tokens);
        } catch (e) {
          console.error('[dsh-ios-theme] 背景透出层覆盖失败（CSS 路径仍然有效）:', e);
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
        console.error('[dsh-ios-theme] 读取背景图库失败:', e);
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
        bgApplySurface();
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
        bgApplySurface();
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
      bgApplySurface();
      bgStopRotation();
      bgPersistSoon();
      notify();
    }

    function bgSetParam(key, value) {
      if (!(key in state.bg)) return;
      state.bg[key] = value;
      if (key === 'surface') bgApplySurface();
      bgApplyVars();
      if (key === 'rotate' || key === 'intervalSec' || key === 'order') bgScheduleRotation();
      bgPersistSoon();
      notify();
    }

    function bgToggle(enabled) {
      const on = !!enabled;
      if (on && !bgImages.length) return;
      state.bg.enabled = on;
      if (on) {
        bgApplyVars();
        bgApplySurface();
        bgShowIndex(state.bg.index, false);
        bgScheduleRotation();
      } else {
        bgStopRotation();
        if (bgXfadeTimer) { clearTimeout(bgXfadeTimer); bgXfadeTimer = null; }
        bgApplyVars();
        bgApplySurface();
      }
      bgPersistSoon();
      notify();
    }

    function applyBackground() {
      if (typeof document === 'undefined') return;
      bgApplyVars();
      bgApplySurface();
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
          bgApplySurface();
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
          for (const name of ['--ios-bg-a', '--ios-bg-b', '--ios-bg-blur', '--ios-bg-sat', '--ios-bg-opacity', '--ios-bg-scrim', '--ios-bg-size', '--ios-bg-repeat']) {
            root.style.removeProperty(name);
          }
        } catch (e) { /* 忽略 */ }
      }
      bgCurrentId = null;
    }

    // 顺序即优先级：调色板打底，强调色/夜间护眼后下发（后写覆盖先写），
    // 所以「调色板 + 自定义强调色」「调色板 + 夜间护眼」都能按用户预期叠加。
    function applyAll() {
      applyPalette();
      applyAccent();
      applyNight();
      applyTypography();
    }

    function notify() {
      for (const fn of listeners.slice()) {
        try { fn(); } catch (e) { /* 忽略 */ }
      }
    }

    // —— 交互动作（修改状态 → 持久化 → 重放令牌 → 刷新 UI）——
    function setAccent(id) {
      state.accent = id;
      saveState();
      applyAccent();
      // 底色令牌被重新注册后要压回最上层，否则壁纸透出会失效
      bgApplySurface();
      notify();
    }

    function setNight(on) {
      state.night = !!on;
      saveState();
      applyNight();
      bgApplySurface();
      notify();
    }

    function setPalette(id) {
      state.palette = state.palette === id ? null : id;
      saveState();
      applyPalette();
      bgApplySurface();
      notify();
    }

    function setUiFont(id) { state.uiFont = id; saveState(); applyTypography(); notify(); }
    function setCodeFont(id) { state.codeFont = id; saveState(); applyTypography(); notify(); }
    function setLineHeight(id) { state.lineHeight = id; saveState(); applyTypography(); notify(); }
    function setTracking(id) { state.tracking = id; saveState(); applyTypography(); notify(); }

    // 一键还原 OpenCode 的排版组合：Inter 正文 + IBM Plex Mono 代码 + 150% 行高
    function applyOpenCodePreset() {
      state.uiFont = 'inter';
      state.codeFont = 'plex';
      state.lineHeight = 'normal';
      state.tracking = 'host';
      saveState();
      applyTypography();
      notify();
    }

    // —— 对话强调开关：只切 <html> 上的标记，具体样式在样式表里 ——
    function applyEmphasis() {
      if (typeof document === 'undefined') return;
      try {
        if (state.emphasis) document.documentElement.dataset.iosEmphasis = 'on';
        else delete document.documentElement.dataset.iosEmphasis;
      } catch (e) { /* 忽略 */ }
    }

    function setEmphasis(on) {
      state.emphasis = !!on;
      saveState();
      applyEmphasis();
      if (state.emphasis) startTagging();
      else stopTagging();
      notify();
    }

    // —— 引用块按类型上色：读引用块开头几个字判定语义 ——
    // 只加 data-ios-type 标记，具体颜色交给样式表，因此换强调色/明暗都会自动跟随。
    // 想加词：往对应数组里塞即可（自动转义、大小写不敏感），不用动 CSS。
    const TYPE_KEYWORDS = {
      // 红：会出事 / 别做
      danger: [
        '风险', '危险', '警告', '禁止', '坑', '不可逆', '破坏性', '不兼容', '会挂', '会崩', '踩雷',
        'risk', 'warning', 'breaking', 'danger',
      ],
      // 黄：还没定 / 要盯
      warn: [
        '待确认', '待定', '存疑', '疑问', '不确定', '未确认', '注意', '待补', '待定稿', '待核实', '待验证',
        'todo', 'pending', 'tbd',
      ],
      // 绿：建议这么做
      ok: [
        '提示', '建议', '推荐', '技巧', '最佳实践', '做法', '可行', '方案',
        'tip', 'note', 'howto',
      ],
      // 品牌色：最终判断
      key: [
        '结论', '总结', '要点', '关键', '判断', '定论', '一句话', '重要', '本质', '核心',
        'conclusion', 'summary', 'tldr',
      ],
    };

    const TYPE_RULES = Object.entries(TYPE_KEYWORDS).map(([type, words]) => ({
      type,
      re: new RegExp('^(?:' + words
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|') + ')', 'i'),
    }));

    function classifyQuote(text) {
      // 归一化：去掉行首的引用符/加粗记号，以及全角半角分隔符
      // （"TL;DR" -> "TLDR"、"**风险**" -> "风险"、"待 确认" -> "待确认"）
      const head = String(text || '')
        .replace(/^[\s>*_`"'#-]+/, '')
        .replace(/[\s:：;；,，。.、!！?？/／|]+/g, '')
        .slice(0, 12);
      for (const rule of TYPE_RULES) if (rule.re.test(head)) return rule.type;
      return null;
    }

    // 给 Markdown 内容容器打标记。
    // 真实 DOM 的类名是 CSS Modules 哈希的（如 `Pg4CGa_markdown`），但哈希保留了
    // 本地名，所以用子串匹配；同时无条件把对话内容容器也标上（双保险）。
    function markMarkdownRoots() {
      if (typeof document === 'undefined') return;
      try {
        for (const el of document.querySelectorAll('[class*="markdown" i]')) {
          if (!el.dataset.iosMd) el.dataset.iosMd = '';
        }
        for (const el of document.querySelectorAll('[data-conversation-content]')) {
          if (!el.dataset.iosMd) el.dataset.iosMd = '';
        }
      } catch (e) { /* 忽略 */ }
    }

    // 诊断读数：设置页里直接显示标记数量，省得靠猜
    function diagCounts() {
      if (typeof document === 'undefined') return null;
      try {
        return {
          md: document.querySelectorAll('[data-ios-md]').length,
          quote: document.querySelectorAll('blockquote').length,
          tagged: document.querySelectorAll('blockquote[data-ios-quote]').length,
          strong: document.querySelectorAll('[data-ios-md] :is(strong, b)').length,
        };
      } catch (e) { return null; }
    }

    function diagText() {
      const c = diagCounts();
      if (!c) return '诊断不可用';
      const on = state.emphasis ? '开' : '关';
      return `容器 ${c.md} · 引用 ${c.tagged}/${c.quote} · 加粗 ${c.strong} · 开关${on}`;
    }

    function scanAndMark(root) {
      const scope = (root && root.querySelectorAll) ? root : document;
      markMarkdownRoots();
      let nodes;
      try {
        nodes = scope.querySelectorAll('blockquote:not([data-ios-type])');
      } catch (e) { return; }
      for (const el of nodes) {
        el.dataset.iosQuote = '';
        const type = classifyQuote(el.textContent);
        if (type) el.dataset.iosType = type;
      }
    }

    let quoteObserver = null;
    let quoteScanTimer = null;

    function scheduleScan() {
      if (quoteScanTimer) return;
      quoteScanTimer = setTimeout(() => {
        quoteScanTimer = null;
        try { scanAndMark(document); } catch (e) { /* 忽略 */ }
      }, 150);
    }

    function startTagging() {
      if (typeof document === 'undefined' || quoteObserver) return;
      try {
        scanAndMark(document);
        quoteObserver = new MutationObserver(scheduleScan);
        quoteObserver.observe(document.body, { childList: true, subtree: true });
      } catch (e) { /* 忽略 */ }
    }

    function stopTagging() {
      try { if (quoteObserver) quoteObserver.disconnect(); } catch (e) { /* 忽略 */ }
      quoteObserver = null;
      if (quoteScanTimer) { clearTimeout(quoteScanTimer); quoteScanTimer = null; }
    }

    function setPreference(pref) {
      try { ctx.theme.setTheme(pref); } catch (e) { /* 未知偏好由宿主抛错，忽略 */ }
    }

    // —— iOS 分段控件（浅色/深色/自动）——
    function SegmentedControl({ value, onChange }) {
      const options = [
        { id: 'light', label: '浅色' },
        { id: 'dark', label: '深色' },
        { id: 'system', label: '自动' },
      ];
      return h('div', {
        className: 'ios-thm-seg',
        role: 'radiogroup',
        'aria-label': '外观模式',
      },
        options.map((o) => h('button', {
          key: o.id,
          role: 'radio',
          'aria-checked': value === o.id,
          className: 'ios-thm-seg-item' + (value === o.id ? ' ios-thm-seg-item-active' : ''),
          onClick: () => onChange(o.id),
        }, o.label)));
    }

    // —— 胶囊选择行（字体/行高/字距共用）——
    function ChipRow({ options, value, onSelect }) {
      return h('div', { className: 'ios-thm-chips' },
        options.map((o) => h('button', {
          key: o.id,
          className: 'ios-thm-chip' + (value === o.id ? ' ios-thm-chip-active' : ''),
          'aria-pressed': value === o.id,
          onClick: () => onSelect(o.id),
        }, o.label)));
    }

    // —— 本机是否装了这个字体（画布测宽，比 document.fonts.check 可靠）——
    function hasFont(name) {
      try {
        const c = document.createElement('canvas').getContext('2d');
        const text = 'mmmmmmmmmmlli';
        const measure = (font) => { c.font = font; return c.measureText(text).width; };
        const mono = measure('72px monospace');
        const sans = measure('72px sans-serif');
        const withMono = measure('72px "' + name + '", monospace');
        const withSans = measure('72px "' + name + '", sans-serif');
        return withMono !== mono || withSans !== sans;
      } catch (e) { return false; }
    }

    function fontDiagText() {
      if (typeof document === 'undefined') return '';
      try {
        const mark = (n) => hasFont(n) ? '✓' : '✗';
        return `本机字体：Inter ${mark('Inter')} · IBM Plex Mono ${mark('IBM Plex Mono')} · JetBrains Mono ${mark('JetBrains Mono')}`;
      } catch (e) { return ''; }
    }

    // —— 背景图卡片（拖动/粘贴导入、图库、参数、轮换）——
    function BgSlider({ label, value, min, max, step, unit, onChange }) {
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
        }));
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
        bgApplySurface();
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
            className: 'ios-thm-switch' + (bg.enabled ? ' ios-thm-switch-on' : '') + (count === 0 ? ' ios-thm-switch-disabled' : ''),
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
          h(BgSlider, { label: '模糊', value: bg.blur, min: 0, max: 40, step: 1, unit: 'px', onChange: (v) => bgSetParam('blur', v) }),
          h(BgSlider, { label: '遮罩深度', value: bg.scrim, min: 0, max: 80, step: 1, unit: '%', onChange: (v) => bgSetParam('scrim', v) }),
          h(BgSlider, { label: '壁纸透明度', value: bg.wallpaper, min: 20, max: 100, step: 1, unit: '%', onChange: (v) => bgSetParam('wallpaper', v) }),
          h(BgSlider, { label: '界面底透明度', value: bg.surface, min: 40, max: 100, step: 1, unit: '%', onChange: (v) => bgSetParam('surface', v) }),
          h(BgSlider, { label: '饱和度', value: bg.saturation, min: 0, max: 200, step: 1, unit: '%', onChange: (v) => bgSetParam('saturation', v) }),
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
                className: 'ios-thm-switch' + (bg.rotate ? ' ios-thm-switch-on' : ''),
                onClick: () => bgSetParam('rotate', !bg.rotate),
              }, h('span', { className: 'ios-thm-switch-knob' })),
              h(ChipRow, { options: BG_ORDERS, value: bg.order, onSelect: (id) => bgSetParam('order', id) })),
            h('div', { className: 'ios-thm-field' },
              h(ChipRow, { options: BG_INTERVALS, value: bg.intervalSec, onSelect: (id) => bgSetParam('intervalSec', id) }))),
          h('div', { className: 'ios-thm-inline' },
            h('button', { className: 'ios-thm-textbtn', onClick: () => bgNext() }, '下一张'),
            h('span', {
              className: 'ios-thm-diag',
              title: '渲染层：' + bgDiag.image + '\n透出层：' + bgDiag.surface,
            }, '当前 ' + Math.min(bg.index + 1, count) + ' / ' + count + ' · ' + bgDiag.image + ' · ' + bgDiag.surface)))
          : null);
    }

    // —— 设置页主体 ——
    function AppPage() {
      const [, force] = useState(0);
      useEffect(() => {
        const fn = () => force((n) => n + 1);
        listeners.push(fn);
        return () => {
          const i = listeners.indexOf(fn);
          if (i >= 0) listeners.splice(i, 1);
        };
      }, []);

      let snap = null;
      try { snap = ctx && ctx.theme ? ctx.theme.getTheme() : null; } catch (e) { /* 忽略 */ }
      const pref = snap ? snap.preference : 'system';

      return h('div', { className: 'ios-thm-page' },
        h('section', { className: 'ios-thm-card' },
          h('h3', { className: 'ios-thm-card-title' }, '外观'),
          h('p', { className: 'ios-thm-card-sub' }, '选择 DSH 的显示模式，与 iOS 显示与亮度一致'),
          h(SegmentedControl, { value: pref, onChange: setPreference })),
        h(BgCard),
        h('section', { className: 'ios-thm-card' },
          h('h3', { className: 'ios-thm-card-title' }, '强调色'),
          h('p', { className: 'ios-thm-card-sub' }, '选择后界面高亮与品牌色立即更换，重启不丢'),
          h('div', { className: 'ios-thm-swatches' },
            ACCENTS.map((a) => h('button', {
              key: a.id,
              className: 'ios-thm-swatch' + (state.accent === a.id ? ' ios-thm-swatch-active' : ''),
              style: { backgroundColor: a.light },
              title: a.label,
              'aria-label': a.label,
              'aria-pressed': state.accent === a.id,
              onClick: () => setAccent(state.accent === a.id ? null : a.id),
            },
              state.accent === a.id
                ? h('span', { className: 'ios-thm-swatch-check' }, '\u2713')
                : null)))),
        h('section', { className: 'ios-thm-card' },
          h('h3', { className: 'ios-thm-card-title' }, '调色板'),
          h('p', { className: 'ios-thm-card-sub' }, '套用 OpenCode 的中性灰阶 + 蓝色强调；与强调色/护眼叠加时后者优先；再点一次还原'),
          PALETTES.map((p) => h('button', {
            key: p.id,
            className: 'ios-thm-palette' + (state.palette === p.id ? ' ios-thm-palette-active' : ''),
            'aria-pressed': state.palette === p.id,
            onClick: () => setPalette(p.id),
          },
            h('span', { className: 'ios-thm-palette-name' },
              p.label + (state.palette === p.id ? '  \u2713 已启用' : '')),
            h('span', { className: 'ios-thm-palette-hint' }, p.hint),
            h('span', { className: 'ios-thm-palette-dots' },
              p.swatches.map((c, i) => h('span', {
                key: i,
                className: 'ios-thm-dot',
                style: { backgroundColor: c },
              })))))),
        h('section', { className: 'ios-thm-card' },
          h('h3', { className: 'ios-thm-card-title' }, '字体'),
          h('p', { className: 'ios-thm-card-sub' }, '仿 OpenCode：Inter 正文 + IBM Plex Mono 代码，行高 150%'),
          h('button', {
            className: 'ios-thm-preset',
            onClick: applyOpenCodePreset,
          }, '一键应用 OpenCode 排版'),
          h('div', { className: 'ios-thm-field' },
            h('div', { className: 'ios-thm-field-label' }, '正文字体'),
            h(ChipRow, { options: UI_FONTS, value: state.uiFont, onSelect: setUiFont })),
          h('div', { className: 'ios-thm-field' },
            h('div', { className: 'ios-thm-field-label' }, '代码字体'),
            h(ChipRow, { options: CODE_FONTS, value: state.codeFont, onSelect: setCodeFont })),
          h('div', { className: 'ios-thm-field' },
            h('div', { className: 'ios-thm-field-label' }, '行高'),
            h(ChipRow, { options: LINE_HEIGHTS, value: state.lineHeight, onSelect: setLineHeight })),
          h('div', { className: 'ios-thm-field' },
            h('div', { className: 'ios-thm-field-label' }, '字距'),
            h(ChipRow, { options: TRACKINGS, value: state.tracking, onSelect: setTracking })),
          h('div', { className: 'ios-thm-diag' }, fontDiagText())),
        h('section', { className: 'ios-thm-card' },
          h('div', { className: 'ios-thm-row' },
            h('div', { className: 'ios-thm-row-text' },
              h('div', { className: 'ios-thm-row-label' }, '夜间护眼'),
              h('div', { className: 'ios-thm-row-sub' }, '暖色纸感滤镜，仿 iOS Night Shift')),
            h('button', {
              role: 'switch',
              'aria-checked': state.night,
              className: 'ios-thm-switch' + (state.night ? ' ios-thm-switch-on' : ''),
              onClick: () => setNight(!state.night),
            }, h('span', { className: 'ios-thm-switch-knob' })))),
        h('section', { className: 'ios-thm-card' },
          h('div', { className: 'ios-thm-row' },
            h('div', { className: 'ios-thm-row-text' },
              h('div', { className: 'ios-thm-row-label' }, '对话关键信息'),
              h('div', { className: 'ios-thm-row-sub' }, '加粗更醒目；> 引用块变成重点框'),
              h('div', { className: 'ios-thm-diag' }, diagText())),
            h('button', {
              role: 'switch',
              'aria-checked': state.emphasis,
              className: 'ios-thm-switch' + (state.emphasis ? ' ios-thm-switch-on' : ''),
              onClick: () => setEmphasis(!state.emphasis),
            }, h('span', { className: 'ios-thm-switch-knob' })))));
    }

    // —— 样式表：设置页 UI + 对话关键信息强调 + 换肤过渡 ——
    // 全部颜色走宿主 --dsw-* 令牌，因此会自动跟随明暗、强调色与夜间护眼。
    const CSS = `
/* ===== 1. 设置页 UI ===== */
.ios-thm-page { display: flex; flex-direction: column; gap: 16px; padding: 4px 0 8px; }
.ios-thm-card { border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); padding: 14px 16px; }
.ios-thm-card-title { margin: 0; font-size: 13px; font-weight: 600; line-height: 20px; color: var(--dsw-alias-label-primary); }
.ios-thm-card-sub { margin: 4px 0 12px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.ios-thm-seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 9px; background: var(--dsw-alias-bg-layer-2); }
.ios-thm-seg-item { min-width: 64px; padding: 6px 14px; border: 0; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; cursor: pointer; transition: background-color .15s ease, color .15s ease; }
.ios-thm-seg-item:hover { color: var(--dsw-alias-label-primary); }
.ios-thm-seg-item-active { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-weight: 600; box-shadow: 0 1px 2px rgb(0 0 0 / 8%); }
.ios-thm-swatches { display: flex; flex-wrap: wrap; gap: 10px; }
.ios-thm-swatch { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 50%; cursor: pointer; box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%); transition: transform .12s ease, box-shadow .12s ease; }
.ios-thm-swatch:hover { transform: scale(1.08); }
.ios-thm-swatch-active { box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1), 0 0 0 4px var(--dsw-alias-label-primary); }
.ios-thm-swatch-check { color: #fff; font-size: 13px; font-weight: 700; line-height: 1; text-shadow: 0 1px 2px rgb(0 0 0 / 35%); }
.ios-thm-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.ios-thm-chip { padding: 5px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 999px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; cursor: pointer; transition: background-color .15s ease, color .15s ease, border-color .15s ease; }
.ios-thm-chip:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
.ios-thm-chip-active { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: #fff; font-weight: 600; }
.ios-thm-field { margin-top: 12px; }
.ios-thm-preset { display: inline-flex; align-items: center; gap: 6px; margin: 2px 0 4px; padding: 7px 14px; border: 1px solid var(--dsw-alias-brand-primary); border-radius: 8px; background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent); color: var(--dsw-alias-brand-primary); font-size: 12px; font-weight: 600; line-height: 18px; cursor: pointer; transition: background-color .15s ease; }
.ios-thm-preset:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); }
.ios-thm-field-label { margin-bottom: 6px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-primary); }
.ios-thm-palette { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; width: 100%; padding: 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-base); cursor: pointer; text-align: left; transition: border-color .15s ease, box-shadow .15s ease; }
.ios-thm-palette:hover { border-color: var(--dsw-alias-border-l2); }
.ios-thm-palette-active { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary); }
.ios-thm-palette-name { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.ios-thm-palette-hint { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); }
.ios-thm-palette-dots { display: flex; gap: 6px; }
.ios-thm-dot { width: 18px; height: 18px; border-radius: 6px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / 12%); }
.ios-thm-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ios-thm-row-text { min-width: 0; }
.ios-thm-row-label { font-size: 13px; font-weight: 500; line-height: 20px; color: var(--dsw-alias-label-primary); }
.ios-thm-row-sub { margin-top: 2px; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); }
.ios-thm-diag { margin-top: 6px; font-size: 11px; line-height: 16px; font-family: var(--ds-font-family-code, ui-monospace, monospace); color: var(--dsw-alias-label-tertiary); }
.ios-thm-switch { position: relative; flex: none; width: 44px; height: 26px; padding: 0; border: 0; border-radius: 13px; background: var(--dsw-alias-border-l2); cursor: pointer; transition: background-color .2s ease; }
.ios-thm-switch-on { background: var(--dsw-alias-brand-primary); }
.ios-thm-switch-knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgb(0 0 0 / 25%); transition: transform .2s ease; }
.ios-thm-switch-on .ios-thm-switch-knob { transform: translateX(18px); }

/* ===== 2. 对话关键信息强调 =====
   加粗 = 行内关键词；> 引用块 = 块级重点。
   标记由运行时脚本写入：容器类名是 CSS Modules 哈希的，不能写死。
   [data-ios-md] 给 Markdown 内容容器；[data-ios-quote] 给每个引用块（双保险）。 */
/* 加粗：12px 中文下 600→700 差异太小，补一层极淡品牌色底衬，肉眼可辨但不糊。 */
html[data-ios-emphasis="on"] [data-ios-md] :is(strong, b) {
  font-weight: 700;
  padding: 0 2px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
}
html[data-ios-emphasis="on"] [data-ios-md] [data-composer-seat] :is(strong, b) { font-weight: 600; background: none; padding: 0; }
html[data-ios-emphasis="on"] /* 终极兜底：不依赖任何标记，直接命中全部引用块（引用块只存在于 Markdown 内容中） */
html[data-ios-emphasis="on"] blockquote {
  margin: 16px 0;
  padding: 10px 14px;
  border-left: 3px solid var(--dsw-alias-brand-primary);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
}
html[data-ios-emphasis="on"] blockquote > :first-child { margin-top: 0; }
html[data-ios-emphasis="on"] blockquote > :last-child { margin-bottom: 0; }
html[data-ios-emphasis="on"] blockquote strong { color: var(--dsw-alias-brand-primary); }
blockquote[data-ios-quote] {
  margin: 16px 0;
  padding: 10px 14px;
  border-left: 3px solid var(--dsw-alias-brand-primary);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
}
html[data-ios-emphasis="on"] blockquote[data-ios-quote] > :first-child { margin-top: 0; }
html[data-ios-emphasis="on"] blockquote[data-ios-quote] > :last-child { margin-bottom: 0; }
html[data-ios-emphasis="on"] blockquote[data-ios-quote] strong { color: var(--dsw-alias-brand-primary); }

/* 类型分色：风险=红 / 待确认=黄 / 提示=绿 / 结论=品牌色（默认） */
html[data-ios-emphasis="on"] blockquote[data-ios-quote][data-ios-type="danger"] {
  border-left-color: var(--dsw-alias-state-error-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 6%, var(--dsw-alias-bg-layer-1));
}
html[data-ios-emphasis="on"] blockquote[data-ios-quote][data-ios-type="danger"] strong { color: var(--dsw-alias-state-error-primary); }
html[data-ios-emphasis="on"] blockquote[data-ios-quote][data-ios-type="warn"] {
  border-left-color: var(--dsw-alias-state-warn-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 7%, var(--dsw-alias-bg-layer-1));
}
html[data-ios-emphasis="on"] blockquote[data-ios-quote][data-ios-type="warn"] strong { color: var(--dsw-alias-state-warn-primary); }
html[data-ios-emphasis="on"] blockquote[data-ios-quote][data-ios-type="ok"] {
  border-left-color: var(--dsw-alias-state-success-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 6%, var(--dsw-alias-bg-layer-1));
}
html[data-ios-emphasis="on"] blockquote[data-ios-quote][data-ios-type="ok"] strong { color: var(--dsw-alias-state-success-primary); }
html[data-ios-emphasis="on"] blockquote[data-ios-quote][data-ios-type="key"] { border-left-color: var(--dsw-alias-brand-primary); }

/* ===== 3. 字体排版：行高 / 字距（只在用户选了非默认值时生效）===== */
html[data-ios-lh] [data-ios-md] :is(p, li, blockquote, td, th) { line-height: var(--ios-lh); }
html[data-ios-track] [data-ios-md] :is(p, li, blockquote, td, th) { letter-spacing: var(--ios-track); }

/* ===== 4. 换肤平滑过渡 ===== */
@media (prefers-reduced-motion: no-preference) {
  :root, :root * { transition-property: background-color, color, border-color, fill, stroke; transition-duration: 250ms; transition-timing-function: ease; }
}

/* ===== 5. 背景图（壁纸）=====
   ::before 是当前图，::after 是过渡图；z-index:-1 让它落在 #root 之下。
   应用底色由下面这条 !important 规则降成半透明 —— 关键点：DSH 的主题令牌是
   body 上的 inline 自定义属性（ui-layout 的 presenter 用 body.style.setProperty 写），
   inline 没带 !important，所以带 !important 的样式表规则能压过它。
   走 CSS 就绕开了 overrideTokens 的层序与投影时机，稳得多。 */
html[data-ios-bg="on"],
html[data-ios-bg="on"] body { background-color: transparent; }

html[data-ios-bg="on"][data-ios-bg-surface="on"] body {
  --dsw-alias-bg-base: color-mix(in srgb, var(--ios-bg-base-raw) var(--ios-bg-surface, 80%), transparent) !important;
  --dsw-specific-sidebar-fill: color-mix(in srgb, var(--ios-bg-side-raw) var(--ios-bg-surface, 80%), transparent) !important;
}

/* 层叠容器实底 ——「保留壁纸」与「不叠影」的分界线。
   壁纸只该在「下层没有文字」的平面上透出：窗口底、侧栏、内容区空白。
   一旦某个容器可能压在别的内容之上（右侧分栏、dockkit 面板、输入框），
   它就必须回到不透明原色，否则下层文字会从半透明上层透出来 ——
   工作区文件全屏时侧栏条目与正文叠印，就是这个原因。

   做法是在这些容器的子树上把令牌重新指回原值，而不是硬写 background：
   DSH 内部的 tabHost / composer 各自用 --dsw-alias-bg-base 铺底，
   只要它们拿到的原值不透明，整块面板（含标签栏）就自然实底，
   不必去猜哈希类名，也不会盖掉浮层原本的 bg-layer-2。 */
html[data-ios-bg="on"][data-ios-bg-surface="on"] :is(
  [data-dockkit-host],
  [data-dockkit-pane],
  [data-dockkit-float],
  [data-sidebar-right-panel],
  [data-composer-card],
  [data-composer-dock],
  [data-queue-dock]
) {
  --dsw-alias-bg-base: var(--ios-bg-base-raw);
  --dsw-specific-sidebar-fill: var(--ios-bg-side-raw);
}

/* dockkit 的 pane 自身没有背景（靠祖先 tabHost 兜底），这里再补一层，
   避免结构微调后又漏出透明底。 */
html[data-ios-bg="on"][data-ios-bg-surface="on"] [data-dockkit-pane] {
  background-color: var(--ios-bg-base-raw);
}

html[data-ios-bg="on"] body::before,
html[data-ios-bg="on"] body::after {
  content: "";
  position: fixed;
  /* 图片层向外扩出 2 倍模糊半径，吃掉 blur 造成的透明边 */
  inset: calc(var(--ios-bg-blur, 18px) * -2);
  z-index: -1;
  pointer-events: none;
  background-position: center center;
  background-repeat: var(--ios-bg-repeat, no-repeat);
  background-size: var(--ios-bg-size, cover);
  background-image: linear-gradient(var(--ios-bg-scrim, transparent), var(--ios-bg-scrim, transparent)), var(--ios-bg-a, none);
  filter: blur(var(--ios-bg-blur, 18px)) saturate(var(--ios-bg-sat, 1));
  transform: translateZ(0);
  opacity: var(--ios-bg-opacity, 1);
  transition: opacity 800ms ease;
  will-change: opacity;
}

html[data-ios-bg="on"] body::after {
  background-image: linear-gradient(var(--ios-bg-scrim, transparent), var(--ios-bg-scrim, transparent)), var(--ios-bg-b, none);
  opacity: 0;
}

html[data-ios-bg-xfade] body::after { opacity: var(--ios-bg-opacity, 1); }

html[data-ios-bg-instant] body::before,
html[data-ios-bg-instant] body::after { transition: none !important; }

@media (prefers-reduced-motion: reduce) {
  html[data-ios-bg="on"] body::before,
  html[data-ios-bg="on"] body::after { transition: none; }
}

/* ===== 6. 背景图卡片控件 ===== */
.ios-thm-drop { margin-top: 12px; padding: 14px; border: 1px dashed var(--dsw-alias-border-l2); border-radius: 10px; background: color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent); outline: none; }
.ios-thm-drop:focus-visible { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent); }
.ios-thm-drop-over { border-color: var(--dsw-alias-brand-primary); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, var(--dsw-alias-bg-base)); }
.ios-thm-drop-text { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); }
.ios-thm-drop-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.ios-thm-file { display: none; }
.ios-thm-textbtn { padding: 6px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; cursor: pointer; }
.ios-thm-textbtn:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
.ios-thm-bg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 8px; margin-top: 12px; }
.ios-thm-bg-item { position: relative; }
.ios-thm-bg-thumb { display: block; width: 100%; aspect-ratio: 16 / 10; padding: 0; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; overflow: hidden; background: var(--dsw-alias-bg-layer-2); cursor: pointer; }
.ios-thm-bg-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.ios-thm-bg-item-active .ios-thm-bg-thumb { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent); }
.ios-thm-bg-del { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; padding: 0; border: 0; border-radius: 50%; background: var(--dsw-alias-state-error-primary); color: #fff; font-size: 13px; line-height: 18px; cursor: pointer; opacity: 0; transition: opacity .15s ease; }
.ios-thm-bg-item:hover .ios-thm-bg-del, .ios-thm-bg-item:focus-within .ios-thm-bg-del { opacity: 1; }
.ios-thm-slider-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.ios-thm-slider-value { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.ios-thm-range { width: 100%; margin: 6px 0 0; accent-color: var(--dsw-alias-brand-primary); }
.ios-thm-inline { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.ios-thm-switch-disabled { opacity: .45; cursor: not-allowed; }
`;

    function installStyles() {
      if (typeof document === 'undefined') return () => {};
      const style = document.createElement('style');
      style.dataset.plugin = 'dsh-ios-theme';
      style.textContent = CSS;
      document.head.appendChild(style);
      return () => {
        if (style.parentNode) style.parentNode.removeChild(style);
      };
    }

    // —— 装配 ——
    return {
      inject: ['theme', 'slots'],
      apply(appCtx) {
        ctx = appCtx;
        loadState();
        applyAll();
        applyBackground();
        applyEmphasis();
        if (state.emphasis) startTagging();
        ctx.on('theme/change', () => {
          // overrideTokens 自己也会发 theme/change：busy 期间忽略，避免递归重算
          if (!bgSurfaceBusy) {
            const scheme = bgIsDark() ? 'dark' : 'light';
            if (scheme !== bgLastScheme) {
              bgLastScheme = scheme;
              bgApplySurface();
              bgApplyVars();
            }
          }
          notify();
        });
        bgBootstrap();

        const disposeSection = ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: SECTION_ID,
          order: SECTION_ORDER,
          label: () => '外观',
        }, AppPage));

        const disposeStyle = installStyles();

        return () => {
          try { bgTeardown(); } catch (e) { /* 忽略 */ }
          try { disposeSection(); } catch (e) { /* 忽略 */ }
          try { disposeStyle(); } catch (e) { /* 忽略 */ }
          try { stopTagging(); } catch (e) { /* 忽略 */ }
          try { if (accentDispose) accentDispose(); } catch (e) { /* 忽略 */ }
          try { if (nightDispose) nightDispose(); } catch (e) { /* 忽略 */ }
          try { if (paletteDispose) paletteDispose(); } catch (e) { /* 忽略 */ }
          try { if (typeDispose) typeDispose(); } catch (e) { /* 忽略 */ }
          try { delete document.documentElement.dataset.iosEmphasis; } catch (e) { /* 忽略 */ }
          try {
            const root = document.documentElement;
            root.style.removeProperty('--ios-lh');
            root.style.removeProperty('--ios-track');
            delete root.dataset.iosLh;
            delete root.dataset.iosTrack;
          } catch (e) { /* 忽略 */ }
          accentDispose = null;
          nightDispose = null;
          paletteDispose = null;
          typeDispose = null;
        };
      },
    };
  },
});
