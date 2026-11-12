/**
 * dsh-theme-wallpaper — 浏览器半（DSH NEXT 0.2.2-rc.1 适配版，2.1.0）
 *
 * 两块功能，其余全部舍弃：
 *  1. 主题（主功能）—— 移植 dsh-opencode-palette 的 62 套配色（37 套内置 + 25 套 IP 预置），
 *     每套自带 Markdown 语义色与 7 组语法高亮色，即「对话关键信息突出」。
 *     颜色经 37 个语义色槽映射到 DSH 的 110 个 alias 令牌，同时发射元素级兜底规则
 *     （strong/em/blockquote/hr/a/code 这些宿主没有变量的元素）。
 *  2. 背景图（壁纸）—— 本地图片存 IndexedDB，两个 z-index:-1 的 body 伪元素渲染。
 *
 * —— 为什么是「主题 + 壁纸」而不是各自独立 ——
 *  62 套主题里只有「透光橙」（lucent-orng）把画布交给宿主（background 三个槽都是
 *  transparent），它天生透出壁纸。其余 61 套写实色画布，会把壁纸完全盖住。
 *  因此提供「忽略主题背景」开关：打开后壁纸层强制压在最上面，任何主题都能透光。
 *
 * —— 移植时补的一层（上游没有）——
 *  上游 62 套主题的 Markdown/语法色有 250/636 对低于 WCAG 4.5:1，最差 1.00:1
 *  （加粗与正文同色）。上游自己的对比度修复只覆盖界面文字（label-* × bg-*），
 *  完全没管语义色。若不补，浅色模式下「关键信息突出」等于没有。
 *  这里在色槽层加 repairSemanticContrast()：只把读不出来的前景色沿黑白推离到 4.5:1，
 *  达标的色一个不动，推离时避开本次已输出的值以免层级塌成同一个色。
 *
 * —— NEXT 适配要点 ——
 *  · 令牌面：NEXT 把同类视觉语义拆成 110 个正交 alias，绝大多数直连 --dsw-static-*。
 *    上游 TOKEN_MAP 覆盖 70 条 + DERIVED_TOKENS 派生 30 条，比手写名单更完整。
 *  · 不覆盖 `--dsw-alias-state-business-primary`：138/241 处消费是焦点环 fallback，
 *    浅色下 4/9 强调色作焦点环达不到 WCAG 1.4.11 的 3:1。
 *  · 不覆盖 `--dsw-specific-menu`：0.1.7 起菜单是半透明材料，覆盖成不透明底会杀掉毛玻璃。
 *  · 字体完全不碰：NEXT 的终端字体只认 ctx.theme.setFontFamily，CSS 变量那条路对
 *    xterm 无效；字体交给宿主官方设置。
 *  · 背景透出：darwin 分支对 sidebar-fill 有二次 color-mix（40%/50%），插件再半透明化
 *    就是三次衰减；prefers-reduced-transparency: reduce 分支也会被插件放大成更透。
 *  · 壁纸只透窗口底与侧栏（bg-base / sidebar-fill）。控件级表面（bg-layer-1）
 *    是整页共用底，一旦半透明化就是满屏字体重叠 —— 详见 07-css.js 那段禁令注释。
 *
 * 机制参照 dsh-opencode-palette 的成熟路径：settings.section 注册设置页、
 * theme.overrideTokens 叠加令牌层 + <style> 注入元素级规则（双写）、
 * localStorage 持久化、IndexedDB 存图、ctx.effect 清理。
 */
window.__ModuleLoader__.load({
  id: '@cnhenaihui/dsh-theme-wallpaper',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef } = React;

    // —— 常量 ——
    const SOURCE_THEME = 'dsh-theme-wallpaper:theme';
    // ⚠ 存储键刻意保持 'dsh-ios-theme:v1' 不变（包名已改，这两个不动）。
    // 它是用户数据在磁盘上的地址：改了等于把已选主题、壁纸参数、导入的图片
    // 全部丢掉，且无法找回。存储键是内部实现细节，不需要跟包名一致。
    const STORAGE_KEY = 'dsh-ios-theme:v1';
    const SECTION_ID = 'appearance';
    const SECTION_ORDER = 25;
    const STYLE_ATTR = 'data-ios-theme-style';

    // —— 背景图（壁纸）——
    // 图片存 IndexedDB（Blob，不占 localStorage 配额），参数并入同一份 state。
    // 渲染层是两个 z-index:-1 的 body 伪元素：不 append 节点、不碰 DSH 的哈希类名。
    const BG_SOURCE = 'dsh-theme-wallpaper:bg';
    // ⚠ 同 STORAGE_KEY：IndexedDB 库名保持 'dsh-ios-theme'，改名会丢图库。
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

    // —— 一键预设 ——
    // 5 个滑块互相牵制（模糊↑ 就要遮罩↑，界面底越透 文字越难读），
    // 让用户自己找平衡点成本太高。三档预设覆盖「几乎看不出来 / 能看见但安静 /
    // 明显是壁纸」三种典型诉求，滑块的定位从预设出发微调即可。
    const BG_PRESETS = [
      {
        id: 'soft',
        label: '轻微',
        hint: '只透一层淡淡的影子',
        bg: { blur: 28, scrim: 34, wallpaper: 100, surface: 92, saturation: 96 },
      },
      {
        id: 'standard',
        label: '标准',
        hint: '能看出壁纸，文字仍然清晰',
        bg: { blur: 18, scrim: 20, wallpaper: 100, surface: 78, saturation: 100 },
      },
      {
        id: 'clear',
        label: '通透',
        hint: '壁纸明显，浅色主题下建议加深遮罩',
        bg: { blur: 8, scrim: 8, wallpaper: 100, surface: 58, saturation: 108 },
      },
    ];

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

    // —— 语义色对比度下限 ——
    // WCAG 2.1 AA 正文标准。主题自带的语义色大面积不达标（上游 250/636 对 < 4.5），
    // 这一层把它们推到达标，见 repairSemanticContrast()。
    const SEMANTIC_MIN_CONTRAST = 4.5;
    // 推离步长：2% 一档，100 步覆盖全程。步长越小越贴近原色相，但计算量线性增长。
    const PUSH_STEP = 0.02;

    // 需要保读的前景色槽。
    //
    // 底色只有一个：主题的 background。
    // 曾经把 markdownText 也当成底色 —— 那是错的，markdownText 是正文前景色，
    // 拿它当底会把「加粗 vs 正文」这种正常组合判成 1.00:1，实测 957 对里误报 591 对。
    // 委托画布（透光橙）的 background 是 transparent，真实底色是壁纸无从得知，
    // 按 markdownText 的亮度假定一个极限底，见 repairSemanticContrast()。
    const SEMANTIC_FOREGROUNDS = [
      'markdownStrong',
      'markdownEmph',
      'markdownLink',
      'markdownCode',
      'markdownBlockQuote',
      'markdownHeading',
      'syntaxComment',
      'syntaxKeyword',
      'syntaxFunction',
      'syntaxString',
      'syntaxNumber',
      'syntaxType',
      'syntaxOperator',
    ];

    // —— 模块级运行时状态（apply 内初始化，组件经闭包访问）——
    let ctx = null;
    let themeDispose = null;
    let themeStyleEl = null;
    let listeners = [];
    let state = {
      // 主题 id：37 套内置 + 25 套 IP 预置的任意一个，或 'system'（跟随宿主）。
      // 默认「透光橙」—— 它把画布交给宿主，是唯一能和壁纸共存的主题。
      theme: 'lucent-orng',
      // 忽略主题背景：打开后壁纸层强制压在最上面，实色主题也能透光。
      // 默认关 —— 实色主题的设计意图是纯色界面，不该被默认破坏。
      bgIgnoreTheme: false,
      bg: { ...BG_DEFAULTS },
    };

    // 主题渲染缓存：id → { tokens, css, delegated }。
    // 构建一次约 3~6ms（37 套全量 120ms），缓存住避免每次 notify 重算。
    const themeCache = new Map();

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

    // —— 主题 id 校验 ——
    // 合法的 id 是 THEMES 的键、IP_PRESETS 里的 id、或 'system'。
    // 不做前缀判断：THEMES 与 IP_PRESETS 是两个不同形状的容器，统一在这里收口。
    function isKnownTheme(id) {
      if (typeof id !== 'string' || !id) return false;
      if (id === 'system') return true;
      if (Object.prototype.hasOwnProperty.call(THEMES, id)) return true;
      return ipPresetIds().indexOf(id) >= 0;
    }

    // IP 预置的 id 列表（容器键是 ip_xxx，对外 id 是连字符形式）。
    // 每次重建是 25 次属性读取，比维护一份静态名单更不容易漂移。
    let ipPresetIdCache = null;
    function ipPresetIds() {
      if (ipPresetIdCache) return ipPresetIdCache;
      const out = [];
      for (const key of Object.keys(IP_PRESETS)) {
        const p = IP_PRESETS[key];
        if (p && typeof p.id === 'string') out.push(p.id);
      }
      ipPresetIdCache = out;
      return out;
    }

    function ipPresetById(id) {
      for (const key of Object.keys(IP_PRESETS)) {
        const p = IP_PRESETS[key];
        if (p && p.id === id) return p;
      }
      return null;
    }

    function loadState() {
      let parsed = {};
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) parsed = JSON.parse(raw) || {};
      } catch (e) { parsed = {}; }

      // 迁移：1.x 存的是 accent / base / emphasis / syntax / 字体 / 行高等字段，
      // 2.0 只剩主题 + 壁纸。旧字段一律丢弃，不猜测用户意图 —— 那些功能已经不存在了。
      //
      // 唯一的例外是主题：1.4+ 的基调 'opencode' 对应的就是现在的 oc-2 主题，
      // 用户当时看到的灰阶界面能原样接上，不会升级后突然变样。
      let theme = 'lucent-orng';
      if (isKnownTheme(parsed.theme)) {
        theme = parsed.theme;
      } else if (parsed.base === 'opencode') {
        theme = 'oc-2';
      } else if (parsed.base === 'night') {
        theme = 'lucent-orng';
      }

      state = {
        theme,
        bgIgnoreTheme: parsed.bgIgnoreTheme === true,
        bg: sanitizeBg(parsed.bg),
      };
    }

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          v: 2,
          theme: state.theme,
          bgIgnoreTheme: state.bgIgnoreTheme,
          bg: state.bg,
        }));
      } catch (e) { /* 配额满/隐私模式：静默失败，内存态仍然可用 */ }
    }

    function notify() {
      for (const fn of listeners.slice()) {
        try { fn(); } catch (e) { /* 忽略 */ }
      }
    }
