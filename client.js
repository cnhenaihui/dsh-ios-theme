// ==== 01-head.js ====
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

// ==== 02-theme-data.js ====
    // ══════════════════════════════════════════════════════════════════════════
    // 主题数据（62 套，由 docs/_extract_themes.mjs 从 dsh-opencode-palette 2.1.12 提取）
    //
    // 37 套内置主题：{ defs: {色名→hex}, theme: {角色→{dark,light}} }
    // 25 套 IP 预置：{ appearance, basePreset, colors:{37槽}, id, name, schema, updatedAt }
    //
    // 角色值可以是 hex、defs 里的色名、theme 里别的角色名（引用链），或 "transparent"。
    // background / backgroundPanel / backgroundElement 为 "transparent" 的主题
    // 即「透光」系（透光橙），画布交给宿主，壁纸能透出来。
    //
    // 这一段是纯数据，不含逻辑。改主题请改数据，别在这里加分支。
    // 体量约 200KB —— 换来 62 套完整配色（含 Markdown 语义色与语法高亮色），
    // 是「以调色板功能为主」的核心资产。
    // ══════════════════════════════════════════════════════════════════════════

    // —— 37 套内置主题 ——
    const amoled = {
      "defs": {},
      "theme": {
    "background": {
      "dark": "#000000",
      "light": "#F0F0F0"
    },
    "backgroundPanel": {
      "dark": "#121212",
      "light": "#E0E0E0"
    },
    "backgroundElement": {
      "dark": "#242424",
      "light": "#D0D0D0"
    },
    "text": {
      "dark": "#FFFFFF",
      "light": "#0A0A0A"
    },
    "textMuted": {
      "dark": "#A5A5A5",
      "light": "#3B3B3B"
    },
    "primary": {
      "dark": "#B388FF",
      "light": "#6200FF"
    },
    "secondary": {
      "dark": "#FF4081",
      "light": "#F8007C"
    },
    "accent": {
      "dark": "#FF4081",
      "light": "#FF0080"
    },
    "error": {
      "dark": "#FF1744",
      "light": "#FA1743"
    },
    "warning": {
      "dark": "#FFEA00",
      "light": "#AD7400"
    },
    "success": {
      "dark": "#00FF88",
      "light": "#00934B"
    },
    "info": {
      "dark": "#18FFFF",
      "light": "#0087C4"
    },
    "border": {
      "dark": "#D6D6D6",
      "light": "#2F2F2F"
    },
    "borderActive": {
      "dark": "#ADADAD",
      "light": "#545454"
    },
    "syntaxComment": {
      "dark": "#7D7D7D",
      "light": "#636363"
    },
    "syntaxKeyword": {
      "dark": "#FF00FF",
      "light": "#AA00C7"
    },
    "syntaxFunction": {
      "dark": "#B388FF",
      "light": "#6200FF"
    },
    "syntaxVariable": {
      "dark": "#FFFFFF",
      "light": "#0A0A0A"
    },
    "syntaxString": {
      "dark": "#00FF88",
      "light": "#00733B"
    },
    "syntaxNumber": {
      "dark": "#B388FF",
      "light": "#6200FF"
    },
    "syntaxType": {
      "dark": "#18FFFF",
      "light": "#006A9A"
    },
    "syntaxOperator": {
      "dark": "#A5A5A5",
      "light": "#3B3B3B"
    },
    "markdownLink": {
      "dark": "#FF4081",
      "light": "#C40062"
    },
    "markdownHeading": {
      "dark": "#FFFFFF",
      "light": "#0A0A0A"
    },
    "markdownCode": {
      "dark": "#B388FF",
      "light": "#6200FF"
    },
    "markdownEmph": {
      "dark": "#FFFFFF",
      "light": "#0A0A0A"
    },
    "markdownStrong": {
      "dark": "#FFFFFF",
      "light": "#0A0A0A"
    },
    "markdownBlockQuote": {
      "dark": "#A5A5A5",
      "light": "#3B3B3B"
    },
    "markdownHorizontalRule": {
      "dark": "#D6D6D6",
      "light": "#2F2F2F"
    },
    "diffAdded": {
      "dark": "#00FF88",
      "light": "#00E676"
    },
    "diffRemoved": {
      "dark": "#FF1744",
      "light": "#FF1744"
    },
    "diffAddedBg": {
      "dark": "#00381E",
      "light": "#CEEFDF"
    },
    "diffRemovedBg": {
      "dark": "#38050F",
      "light": "#F2D2D8"
    },
    "diffAddedLineNumberBg": {
      "dark": "#00381E",
      "light": "#CEEFDF"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#38050F",
      "light": "#F2D2D8"
    }
      }
    };
    const aura = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg": "#0f0f0f",
    "darkBgPanel": "#15141b",
    "darkBorder": "#2d2d2d",
    "darkFgMuted": "#989898",
    "darkFg": "#edecee",
    "purple": "#A77FFF",
    "pink": "#f694ff",
    "blue": "#82e2ff",
    "red": "#ff6767",
    "orange": "#ffca85",
    "cyan": "#61ffca",
    "green": "#9dff65"
      },
      "theme": {
    "primary": "purple",
    "secondary": "pink",
    "accent": "purple",
    "error": "red",
    "warning": "orange",
    "success": "cyan",
    "info": "purple",
    "text": "darkFg",
    "textMuted": "darkFgMuted",
    "background": "darkBg",
    "backgroundPanel": "darkBgPanel",
    "backgroundElement": "darkBgPanel",
    "border": "darkBorder",
    "borderActive": "darkFgMuted",
    "borderSubtle": "darkBorder",
    "diffAdded": "cyan",
    "diffRemoved": "red",
    "diffContext": "darkFgMuted",
    "diffHunkHeader": "darkFgMuted",
    "diffHighlightAdded": "cyan",
    "diffHighlightRemoved": "red",
    "diffAddedBg": "#354933",
    "diffRemovedBg": "#3f191a",
    "diffContextBg": "darkBgPanel",
    "diffLineNumber": "#898989",
    "diffAddedLineNumberBg": "#162620",
    "diffRemovedLineNumberBg": "#26161a",
    "markdownText": "darkFg",
    "markdownHeading": "purple",
    "markdownLink": "pink",
    "markdownLinkText": "purple",
    "markdownCode": "cyan",
    "markdownBlockQuote": "darkFgMuted",
    "markdownEmph": "orange",
    "markdownStrong": "purple",
    "markdownHorizontalRule": "darkFgMuted",
    "markdownListItem": "purple",
    "markdownListEnumeration": "purple",
    "markdownImage": "pink",
    "markdownImageText": "purple",
    "markdownCodeBlock": "darkFg",
    "syntaxComment": "darkFgMuted",
    "syntaxKeyword": "pink",
    "syntaxFunction": "purple",
    "syntaxVariable": "purple",
    "syntaxString": "cyan",
    "syntaxNumber": "green",
    "syntaxType": "purple",
    "syntaxOperator": "pink",
    "syntaxPunctuation": "darkFg"
      }
    };
    const ayu = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg": "#0B0E14",
    "darkBgAlt": "#0D1017",
    "darkLine": "#11151C",
    "darkPanel": "#0F131A",
    "darkFg": "#BFBDB6",
    "darkFgMuted": "#94979E",
    "darkGutter": "#6C7380",
    "darkTag": "#39BAE6",
    "darkFunc": "#FFB454",
    "darkEntity": "#59C2FF",
    "darkString": "#AAD94C",
    "darkRegexp": "#95E6CB",
    "darkMarkup": "#F07178",
    "darkKeyword": "#FF8F40",
    "darkSpecial": "#E6B673",
    "darkComment": "#ACB6BF",
    "darkConstant": "#D2A6FF",
    "darkOperator": "#F29668",
    "darkAdded": "#7FD962",
    "darkRemoved": "#F26D78",
    "darkAccent": "#E6B450",
    "darkError": "#D95757",
    "darkIndentActive": "#6C7380"
      },
      "theme": {
    "primary": "darkEntity",
    "secondary": "darkConstant",
    "accent": "darkAccent",
    "error": "darkError",
    "warning": "darkSpecial",
    "success": "darkAdded",
    "info": "darkTag",
    "text": "darkFg",
    "textMuted": "darkFgMuted",
    "background": "darkBg",
    "backgroundPanel": "darkPanel",
    "backgroundElement": "darkBgAlt",
    "border": "darkGutter",
    "borderActive": "darkIndentActive",
    "borderSubtle": "darkLine",
    "diffAdded": "darkAdded",
    "diffRemoved": "darkRemoved",
    "diffContext": "darkComment",
    "diffHunkHeader": "darkComment",
    "diffHighlightAdded": "darkString",
    "diffHighlightRemoved": "darkMarkup",
    "diffAddedBg": "#20303b",
    "diffRemovedBg": "#37222c",
    "diffContextBg": "darkPanel",
    "diffLineNumber": "diffContext",
    "diffAddedLineNumberBg": "#1b2b34",
    "diffRemovedLineNumberBg": "#2d1f26",
    "markdownText": "darkFg",
    "markdownHeading": "darkConstant",
    "markdownLink": "darkEntity",
    "markdownLinkText": "darkTag",
    "markdownCode": "darkString",
    "markdownBlockQuote": "darkSpecial",
    "markdownEmph": "darkSpecial",
    "markdownStrong": "darkFunc",
    "markdownHorizontalRule": "darkFgMuted",
    "markdownListItem": "darkEntity",
    "markdownListEnumeration": "darkTag",
    "markdownImage": "darkEntity",
    "markdownImageText": "darkTag",
    "markdownCodeBlock": "darkFg",
    "syntaxComment": "darkComment",
    "syntaxKeyword": "darkKeyword",
    "syntaxFunction": "darkFunc",
    "syntaxVariable": "darkEntity",
    "syntaxString": "darkString",
    "syntaxNumber": "darkConstant",
    "syntaxType": "darkSpecial",
    "syntaxOperator": "darkOperator",
    "syntaxPunctuation": "darkFg"
      }
    };
    const carbonfox = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "bg0": "#0d0d0d",
    "bg1": "#161616",
    "bg1a": "#1a1a1a",
    "bg2": "#1e1e1e",
    "bg3": "#262626",
    "bg4": "#303030",
    "fg0": "#ffffff",
    "fg1": "#f2f4f8",
    "fg2": "#a9afbc",
    "fg3": "#9AA0A8",
    "lbg0": "#ffffff",
    "lbg1": "#f4f4f4",
    "lbg2": "#e8e8e8",
    "lbg3": "#dcdcdc",
    "lfg0": "#000000",
    "lfg1": "#161616",
    "lfg2": "#525252",
    "lfg3": "#6f6f6f",
    "red": "#ee5396",
    "green": "#25be6a",
    "yellow": "#08bdba",
    "blue": "#78a9ff",
    "magenta": "#be95ff",
    "cyan": "#3CB5FF",
    "white": "#dfdfe0",
    "orange": "#3ddbd9",
    "pink": "#ff7eb6",
    "blueBright": "#8cb6ff",
    "cyanBright": "#52c7ff",
    "greenBright": "#46c880",
    "redLight": "#9f1853",
    "greenLight": "#198038",
    "yellowLight": "#007d79",
    "blueLight": "#0043ce",
    "magentaLight": "#6929c4",
    "cyanLight": "#0072c3",
    "warning": "#f1c21b",
    "diffGreen": "#50fa7b",
    "diffRed": "#ff6b6b",
    "diffGreenBg": "#0f2418",
    "diffRedBg": "#2a1216"
      },
      "theme": {
    "primary": {
      "dark": "cyan",
      "light": "blueLight"
    },
    "secondary": {
      "dark": "blue",
      "light": "blueLight"
    },
    "accent": {
      "dark": "pink",
      "light": "redLight"
    },
    "error": {
      "dark": "red",
      "light": "redLight"
    },
    "warning": {
      "dark": "warning",
      "light": "yellowLight"
    },
    "success": {
      "dark": "green",
      "light": "greenLight"
    },
    "info": {
      "dark": "blue",
      "light": "blueLight"
    },
    "text": {
      "dark": "fg1",
      "light": "lfg1"
    },
    "textMuted": {
      "dark": "fg3",
      "light": "lfg3"
    },
    "background": {
      "dark": "bg1",
      "light": "lbg0"
    },
    "backgroundPanel": {
      "dark": "bg1a",
      "light": "lbg1"
    },
    "backgroundElement": {
      "dark": "bg2",
      "light": "lbg1"
    },
    "border": {
      "dark": "bg4",
      "light": "lbg3"
    },
    "borderActive": {
      "dark": "cyan",
      "light": "blueLight"
    },
    "borderSubtle": {
      "dark": "bg3",
      "light": "lbg2"
    },
    "diffAdded": {
      "dark": "diffGreen",
      "light": "greenLight"
    },
    "diffRemoved": {
      "dark": "diffRed",
      "light": "redLight"
    },
    "diffContext": {
      "dark": "fg3",
      "light": "lfg3"
    },
    "diffHunkHeader": {
      "dark": "blue",
      "light": "blueLight"
    },
    "diffHighlightAdded": {
      "dark": "#7dffaa",
      "light": "greenLight"
    },
    "diffHighlightRemoved": {
      "dark": "#ff9999",
      "light": "redLight"
    },
    "diffAddedBg": {
      "dark": "diffGreenBg",
      "light": "#defbe6"
    },
    "diffRemovedBg": {
      "dark": "diffRedBg",
      "light": "#fff1f1"
    },
    "diffContextBg": {
      "dark": "bg1",
      "light": "lbg1"
    },
    "diffLineNumber": {
      "dark": "#808792",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "diffGreenBg",
      "light": "#defbe6"
    },
    "diffRemovedLineNumberBg": {
      "dark": "diffRedBg",
      "light": "#fff1f1"
    },
    "markdownText": {
      "dark": "fg1",
      "light": "lfg1"
    },
    "markdownHeading": {
      "dark": "blueBright",
      "light": "blueLight"
    },
    "markdownLink": {
      "dark": "blue",
      "light": "blueLight"
    },
    "markdownLinkText": {
      "dark": "cyan",
      "light": "cyanLight"
    },
    "markdownCode": {
      "dark": "green",
      "light": "greenLight"
    },
    "markdownBlockQuote": {
      "dark": "fg3",
      "light": "lfg3"
    },
    "markdownEmph": {
      "dark": "magenta",
      "light": "magentaLight"
    },
    "markdownStrong": {
      "dark": "fg0",
      "light": "lfg0"
    },
    "markdownHorizontalRule": {
      "dark": "bg4",
      "light": "lbg3"
    },
    "markdownListItem": {
      "dark": "cyan",
      "light": "cyanLight"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "cyanLight"
    },
    "markdownImage": {
      "dark": "blue",
      "light": "blueLight"
    },
    "markdownImageText": {
      "dark": "cyan",
      "light": "cyanLight"
    },
    "markdownCodeBlock": {
      "dark": "fg2",
      "light": "lfg2"
    },
    "syntaxComment": {
      "dark": "fg3",
      "light": "lfg3"
    },
    "syntaxKeyword": {
      "dark": "magenta",
      "light": "magentaLight"
    },
    "syntaxFunction": {
      "dark": "blueBright",
      "light": "blueLight"
    },
    "syntaxVariable": {
      "dark": "white",
      "light": "lfg1"
    },
    "syntaxString": {
      "dark": "green",
      "light": "greenLight"
    },
    "syntaxNumber": {
      "dark": "orange",
      "light": "yellowLight"
    },
    "syntaxType": {
      "dark": "yellow",
      "light": "yellowLight"
    },
    "syntaxOperator": {
      "dark": "fg2",
      "light": "lfg2"
    },
    "syntaxPunctuation": {
      "dark": "fg2",
      "light": "lfg1"
    }
      }
    };
    const catppuccin_frappe = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "frappeRosewater": "#f2d5cf",
    "frappeFlamingo": "#eebebe",
    "frappePink": "#f4b8e4",
    "frappeMauve": "#ca9ee6",
    "frappeRed": "#e78284",
    "frappeMaroon": "#ea999c",
    "frappePeach": "#ef9f76",
    "frappeYellow": "#e5c890",
    "frappeGreen": "#a6d189",
    "frappeTeal": "#81c8be",
    "frappeSky": "#99d1db",
    "frappeSapphire": "#85c1dc",
    "frappeBlue": "#8da4e2",
    "frappeLavender": "#babbf1",
    "frappeText": "#c6d0f5",
    "frappeSubtext1": "#b5bfe2",
    "frappeSubtext0": "#a5adce",
    "frappeOverlay2": "#B0B6CA",
    "frappeOverlay1": "#838ba7",
    "frappeOverlay0": "#737994",
    "frappeSurface2": "#626880",
    "frappeSurface1": "#787D8E",
    "frappeSurface0": "#414559",
    "frappeBase": "#303446",
    "frappeMantle": "#292c3c",
    "frappeCrust": "#232634"
      },
      "theme": {
    "primary": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "secondary": {
      "dark": "frappeMauve",
      "light": "frappeMauve"
    },
    "accent": {
      "dark": "frappePink",
      "light": "frappePink"
    },
    "error": {
      "dark": "frappeRed",
      "light": "frappeRed"
    },
    "warning": {
      "dark": "frappeYellow",
      "light": "frappeYellow"
    },
    "success": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "info": {
      "dark": "frappeTeal",
      "light": "frappeTeal"
    },
    "text": {
      "dark": "frappeText",
      "light": "frappeText"
    },
    "textMuted": {
      "dark": "frappeOverlay2",
      "light": "frappeOverlay2"
    },
    "background": {
      "dark": "frappeBase",
      "light": "frappeBase"
    },
    "backgroundPanel": {
      "dark": "frappeMantle",
      "light": "frappeMantle"
    },
    "backgroundElement": {
      "dark": "frappeCrust",
      "light": "frappeCrust"
    },
    "border": {
      "dark": "frappeSurface0",
      "light": "frappeSurface0"
    },
    "borderActive": {
      "dark": "frappeSurface1",
      "light": "frappeSurface1"
    },
    "borderSubtle": {
      "dark": "frappeSurface2",
      "light": "frappeSurface2"
    },
    "diffAdded": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "diffRemoved": {
      "dark": "frappeRed",
      "light": "frappeRed"
    },
    "diffContext": {
      "dark": "frappeOverlay2",
      "light": "frappeOverlay2"
    },
    "diffHunkHeader": {
      "dark": "frappePeach",
      "light": "frappePeach"
    },
    "diffHighlightAdded": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "diffHighlightRemoved": {
      "dark": "frappeRed",
      "light": "frappeRed"
    },
    "diffAddedBg": {
      "dark": "#29342b",
      "light": "#29342b"
    },
    "diffRemovedBg": {
      "dark": "#3a2a31",
      "light": "#3a2a31"
    },
    "diffContextBg": {
      "dark": "frappeMantle",
      "light": "frappeMantle"
    },
    "diffLineNumber": "textMuted",
    "diffAddedLineNumberBg": {
      "dark": "#223025",
      "light": "#223025"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2f242b",
      "light": "#2f242b"
    },
    "markdownText": {
      "dark": "frappeText",
      "light": "frappeText"
    },
    "markdownHeading": {
      "dark": "frappeMauve",
      "light": "frappeMauve"
    },
    "markdownLink": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "markdownLinkText": {
      "dark": "frappeSky",
      "light": "frappeSky"
    },
    "markdownCode": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "markdownBlockQuote": {
      "dark": "frappeYellow",
      "light": "frappeYellow"
    },
    "markdownEmph": {
      "dark": "frappeYellow",
      "light": "frappeYellow"
    },
    "markdownStrong": {
      "dark": "frappePeach",
      "light": "frappePeach"
    },
    "markdownHorizontalRule": {
      "dark": "frappeSubtext0",
      "light": "frappeSubtext0"
    },
    "markdownListItem": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "markdownListEnumeration": {
      "dark": "frappeSky",
      "light": "frappeSky"
    },
    "markdownImage": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "markdownImageText": {
      "dark": "frappeSky",
      "light": "frappeSky"
    },
    "markdownCodeBlock": {
      "dark": "frappeText",
      "light": "frappeText"
    },
    "syntaxComment": {
      "dark": "frappeOverlay2",
      "light": "frappeOverlay2"
    },
    "syntaxKeyword": {
      "dark": "frappeMauve",
      "light": "frappeMauve"
    },
    "syntaxFunction": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "syntaxVariable": {
      "dark": "frappeRed",
      "light": "frappeRed"
    },
    "syntaxString": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "syntaxNumber": {
      "dark": "frappePeach",
      "light": "frappePeach"
    },
    "syntaxType": {
      "dark": "frappeYellow",
      "light": "frappeYellow"
    },
    "syntaxOperator": {
      "dark": "frappeSky",
      "light": "frappeSky"
    },
    "syntaxPunctuation": {
      "dark": "frappeText",
      "light": "frappeText"
    }
      }
    };
    const catppuccin_macchiato = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "macRosewater": "#f4dbd6",
    "macFlamingo": "#f0c6c6",
    "macPink": "#f5bde6",
    "macMauve": "#c6a0f6",
    "macRed": "#ed8796",
    "macMaroon": "#ee99a0",
    "macPeach": "#f5a97f",
    "macYellow": "#eed49f",
    "macGreen": "#a6da95",
    "macTeal": "#8bd5ca",
    "macSky": "#91d7e3",
    "macSapphire": "#7dc4e4",
    "macBlue": "#8aadf4",
    "macLavender": "#b7bdf8",
    "macText": "#cad3f5",
    "macSubtext1": "#b8c0e0",
    "macSubtext0": "#a5adcb",
    "macOverlay2": "#A1A8C1",
    "macOverlay1": "#8087a2",
    "macOverlay0": "#6e738d",
    "macSurface2": "#5b6078",
    "macSurface1": "#6D7082",
    "macSurface0": "#363a4f",
    "macBase": "#24273a",
    "macMantle": "#1e2030",
    "macCrust": "#181926"
      },
      "theme": {
    "primary": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "secondary": {
      "dark": "macMauve",
      "light": "macMauve"
    },
    "accent": {
      "dark": "macPink",
      "light": "macPink"
    },
    "error": {
      "dark": "macRed",
      "light": "macRed"
    },
    "warning": {
      "dark": "macYellow",
      "light": "macYellow"
    },
    "success": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "info": {
      "dark": "macTeal",
      "light": "macTeal"
    },
    "text": {
      "dark": "macText",
      "light": "macText"
    },
    "textMuted": {
      "dark": "macOverlay2",
      "light": "macOverlay2"
    },
    "background": {
      "dark": "macBase",
      "light": "macBase"
    },
    "backgroundPanel": {
      "dark": "macMantle",
      "light": "macMantle"
    },
    "backgroundElement": {
      "dark": "macCrust",
      "light": "macCrust"
    },
    "border": {
      "dark": "macSurface0",
      "light": "macSurface0"
    },
    "borderActive": {
      "dark": "macSurface1",
      "light": "macSurface1"
    },
    "borderSubtle": {
      "dark": "macSurface2",
      "light": "macSurface2"
    },
    "diffAdded": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "diffRemoved": {
      "dark": "macRed",
      "light": "macRed"
    },
    "diffContext": {
      "dark": "macOverlay2",
      "light": "macOverlay2"
    },
    "diffHunkHeader": {
      "dark": "macPeach",
      "light": "macPeach"
    },
    "diffHighlightAdded": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "diffHighlightRemoved": {
      "dark": "macRed",
      "light": "macRed"
    },
    "diffAddedBg": {
      "dark": "#29342b",
      "light": "#29342b"
    },
    "diffRemovedBg": {
      "dark": "#3a2a31",
      "light": "#3a2a31"
    },
    "diffContextBg": {
      "dark": "macMantle",
      "light": "macMantle"
    },
    "diffLineNumber": "textMuted",
    "diffAddedLineNumberBg": {
      "dark": "#223025",
      "light": "#223025"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2f242b",
      "light": "#2f242b"
    },
    "markdownText": {
      "dark": "macText",
      "light": "macText"
    },
    "markdownHeading": {
      "dark": "macMauve",
      "light": "macMauve"
    },
    "markdownLink": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "markdownLinkText": {
      "dark": "macSky",
      "light": "macSky"
    },
    "markdownCode": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "markdownBlockQuote": {
      "dark": "macYellow",
      "light": "macYellow"
    },
    "markdownEmph": {
      "dark": "macYellow",
      "light": "macYellow"
    },
    "markdownStrong": {
      "dark": "macPeach",
      "light": "macPeach"
    },
    "markdownHorizontalRule": {
      "dark": "macSubtext0",
      "light": "macSubtext0"
    },
    "markdownListItem": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "markdownListEnumeration": {
      "dark": "macSky",
      "light": "macSky"
    },
    "markdownImage": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "markdownImageText": {
      "dark": "macSky",
      "light": "macSky"
    },
    "markdownCodeBlock": {
      "dark": "macText",
      "light": "macText"
    },
    "syntaxComment": {
      "dark": "macOverlay2",
      "light": "macOverlay2"
    },
    "syntaxKeyword": {
      "dark": "macMauve",
      "light": "macMauve"
    },
    "syntaxFunction": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "syntaxVariable": {
      "dark": "macRed",
      "light": "macRed"
    },
    "syntaxString": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "syntaxNumber": {
      "dark": "macPeach",
      "light": "macPeach"
    },
    "syntaxType": {
      "dark": "macYellow",
      "light": "macYellow"
    },
    "syntaxOperator": {
      "dark": "macSky",
      "light": "macSky"
    },
    "syntaxPunctuation": {
      "dark": "macText",
      "light": "macText"
    }
      }
    };
    const catppuccin = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "lightRosewater": "#dc8a78",
    "lightFlamingo": "#dd7878",
    "lightPink": "#ea76cb",
    "lightMauve": "#8839ef",
    "lightRed": "#d20f39",
    "lightMaroon": "#e64553",
    "lightPeach": "#fe640b",
    "lightYellow": "#df8e1d",
    "lightGreen": "#40a02b",
    "lightTeal": "#179299",
    "lightSky": "#04a5e5",
    "lightSapphire": "#209fb5",
    "lightBlue": "#1e66f5",
    "lightLavender": "#7287fd",
    "lightText": "#4c4f69",
    "lightSubtext1": "#5c5f77",
    "lightSubtext0": "#6c6f85",
    "lightOverlay2": "#7c7f93",
    "lightOverlay1": "#8c8fa1",
    "lightOverlay0": "#9ca0b0",
    "lightSurface2": "#acb0be",
    "lightSurface1": "#bcc0cc",
    "lightSurface0": "#ccd0da",
    "lightBase": "#eff1f5",
    "lightMantle": "#e6e9ef",
    "lightCrust": "#dce0e8",
    "darkRosewater": "#f5e0dc",
    "darkFlamingo": "#f2cdcd",
    "darkPink": "#f5c2e7",
    "darkMauve": "#cba6f7",
    "darkRed": "#f38ba8",
    "darkMaroon": "#eba0ac",
    "darkPeach": "#fab387",
    "darkYellow": "#f9e2af",
    "darkGreen": "#a6e3a1",
    "darkTeal": "#94e2d5",
    "darkSky": "#89dceb",
    "darkSapphire": "#74c7ec",
    "darkBlue": "#89b4fa",
    "darkLavender": "#b4befe",
    "darkText": "#cdd6f4",
    "darkSubtext1": "#bac2de",
    "darkSubtext0": "#a6adc8",
    "darkOverlay2": "#9A9FB7",
    "darkOverlay1": "#7f849c",
    "darkOverlay0": "#6c7086",
    "darkSurface2": "#585b70",
    "darkSurface1": "#676978",
    "darkSurface0": "#313244",
    "darkBase": "#1e1e2e",
    "darkMantle": "#181825",
    "darkCrust": "#11111b"
      },
      "theme": {
    "primary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkMauve",
      "light": "lightMauve"
    },
    "accent": {
      "dark": "darkPink",
      "light": "lightPink"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkTeal",
      "light": "lightTeal"
    },
    "text": {
      "dark": "darkText",
      "light": "lightText"
    },
    "textMuted": {
      "dark": "darkOverlay2",
      "light": "lightOverlay2"
    },
    "background": {
      "dark": "darkBase",
      "light": "lightBase"
    },
    "backgroundPanel": {
      "dark": "darkMantle",
      "light": "lightMantle"
    },
    "backgroundElement": {
      "dark": "darkCrust",
      "light": "lightCrust"
    },
    "border": {
      "dark": "darkSurface0",
      "light": "lightSurface0"
    },
    "borderActive": {
      "dark": "darkSurface1",
      "light": "lightSurface1"
    },
    "borderSubtle": {
      "dark": "darkSurface2",
      "light": "lightSurface2"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkOverlay2",
      "light": "lightOverlay2"
    },
    "diffHunkHeader": {
      "dark": "darkPeach",
      "light": "lightPeach"
    },
    "diffHighlightAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffHighlightRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffAddedBg": {
      "dark": "#24312b",
      "light": "#d6f0d9"
    },
    "diffRemovedBg": {
      "dark": "#3c2a32",
      "light": "#f6dfe2"
    },
    "diffContextBg": {
      "dark": "darkMantle",
      "light": "lightMantle"
    },
    "diffLineNumber": {
      "dark": "textMuted",
      "light": "#5b5d63"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1e2a25",
      "light": "#c9e3cb"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#32232a",
      "light": "#e9d3d6"
    },
    "markdownText": {
      "dark": "darkText",
      "light": "lightText"
    },
    "markdownHeading": {
      "dark": "darkMauve",
      "light": "lightMauve"
    },
    "markdownLink": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLinkText": {
      "dark": "darkSky",
      "light": "lightSky"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkPeach",
      "light": "lightPeach"
    },
    "markdownHorizontalRule": {
      "dark": "darkSubtext0",
      "light": "lightSubtext0"
    },
    "markdownListItem": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkSky",
      "light": "lightSky"
    },
    "markdownImage": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownImageText": {
      "dark": "darkSky",
      "light": "lightSky"
    },
    "markdownCodeBlock": {
      "dark": "darkText",
      "light": "lightText"
    },
    "syntaxComment": {
      "dark": "darkOverlay2",
      "light": "lightOverlay2"
    },
    "syntaxKeyword": {
      "dark": "darkMauve",
      "light": "lightMauve"
    },
    "syntaxFunction": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkPeach",
      "light": "lightPeach"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkSky",
      "light": "lightSky"
    },
    "syntaxPunctuation": {
      "dark": "darkText",
      "light": "lightText"
    }
      }
    };
    const cobalt2 = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "background": "#193549",
    "backgroundAlt": "#122738",
    "backgroundPanel": "#1f4662",
    "foreground": "#ffffff",
    "foregroundMuted": "#C3CAD7",
    "yellow": "#ffc600",
    "yellowBright": "#ffe14c",
    "orange": "#ff9d00",
    "orangeBright": "#ffb454",
    "mint": "#2affdf",
    "mintBright": "#7efff5",
    "blue": "#4DACFF",
    "blueBright": "#5cb7ff",
    "pink": "#FF638C",
    "pinkBright": "#ff86a5",
    "green": "#9eff80",
    "greenBright": "#b9ff9f",
    "purple": "#9a5feb",
    "purpleBright": "#b88cfd",
    "red": "#ff0088",
    "redBright": "#ff5fb3"
      },
      "theme": {
    "primary": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "secondary": {
      "dark": "purple",
      "light": "#7c4dff"
    },
    "accent": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "error": {
      "dark": "red",
      "light": "#e91e63"
    },
    "warning": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "success": {
      "dark": "green",
      "light": "#4caf50"
    },
    "info": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "text": {
      "dark": "foreground",
      "light": "#193549"
    },
    "textMuted": {
      "dark": "foregroundMuted",
      "light": "#5c6b7d"
    },
    "background": {
      "dark": "#193549",
      "light": "#ffffff"
    },
    "backgroundPanel": {
      "dark": "#122738",
      "light": "#f5f7fa"
    },
    "backgroundElement": {
      "dark": "#1f4662",
      "light": "#e8ecf1"
    },
    "border": {
      "dark": "#1f4662",
      "light": "#d3dae3"
    },
    "borderActive": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "borderSubtle": {
      "dark": "#0e1e2e",
      "light": "#e8ecf1"
    },
    "diffAdded": {
      "dark": "green",
      "light": "#4caf50"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "#e91e63"
    },
    "diffContext": {
      "dark": "foregroundMuted",
      "light": "#5c6b7d"
    },
    "diffHunkHeader": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "diffHighlightAdded": {
      "dark": "greenBright",
      "light": "#4caf50"
    },
    "diffHighlightRemoved": {
      "dark": "redBright",
      "light": "#e91e63"
    },
    "diffAddedBg": {
      "dark": "#1a3a2a",
      "light": "#e8f5e9"
    },
    "diffRemovedBg": {
      "dark": "#3a1a2a",
      "light": "#ffebee"
    },
    "diffContextBg": {
      "dark": "#122738",
      "light": "#f5f7fa"
    },
    "diffLineNumber": "textMuted",
    "diffAddedLineNumberBg": {
      "dark": "#1a3a2a",
      "light": "#e8f5e9"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1a2a",
      "light": "#ffebee"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#193549"
    },
    "markdownHeading": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "markdownLink": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "markdownLinkText": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "markdownCode": {
      "dark": "green",
      "light": "#4caf50"
    },
    "markdownBlockQuote": {
      "dark": "foregroundMuted",
      "light": "#5c6b7d"
    },
    "markdownEmph": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "markdownStrong": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "markdownHorizontalRule": {
      "dark": "#2d5a7b",
      "light": "#d3dae3"
    },
    "markdownListItem": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "markdownListEnumeration": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "markdownImage": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "markdownImageText": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#193549"
    },
    "syntaxComment": {
      "dark": "#088CFF",
      "light": "#5c6b7d"
    },
    "syntaxKeyword": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "syntaxFunction": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#193549"
    },
    "syntaxString": {
      "dark": "green",
      "light": "#4caf50"
    },
    "syntaxNumber": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "syntaxType": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "syntaxOperator": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#193549"
    }
      }
    };
    const cursor = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg": "#181818",
    "darkPanel": "#141414",
    "darkElement": "#262626",
    "darkFg": "#e4e4e4",
    "darkMuted": "#A5A5A5",
    "darkBorder": "#e4e4e413",
    "darkBorderActive": "#e4e4e426",
    "darkCyan": "#88c0d0",
    "darkBlue": "#81a1c1",
    "darkGreen": "#3fa266",
    "darkGreenBright": "#70b489",
    "darkRed": "#e34671",
    "darkRedBright": "#fc6b83",
    "darkYellow": "#f1b467",
    "darkOrange": "#d2943e",
    "darkPink": "#E394DC",
    "darkPurple": "#AAA0FA",
    "darkTeal": "#82D2CE",
    "darkSyntaxYellow": "#F8C762",
    "darkSyntaxOrange": "#EFB080",
    "darkSyntaxGreen": "#A8CC7C",
    "darkSyntaxBlue": "#87C3FF",
    "lightBg": "#fcfcfc",
    "lightPanel": "#f3f3f3",
    "lightElement": "#ededed",
    "lightFg": "#141414",
    "lightMuted": "#141414ad",
    "lightBorder": "#14141413",
    "lightBorderActive": "#14141426",
    "lightTeal": "#6f9ba6",
    "lightBlue": "#3c7cab",
    "lightBlueDark": "#206595",
    "lightGreen": "#1f8a65",
    "lightGreenBright": "#55a583",
    "lightRed": "#cf2d56",
    "lightRedBright": "#e75e78",
    "lightOrange": "#db704b",
    "lightYellow": "#c08532",
    "lightPurple": "#9e94d5",
    "lightPurpleDark": "#6049b3",
    "lightPink": "#b8448b",
    "lightMagenta": "#b3003f"
      },
      "theme": {
    "primary": {
      "dark": "darkCyan",
      "light": "lightTeal"
    },
    "secondary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "accent": {
      "dark": "darkCyan",
      "light": "lightTeal"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "text": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "textMuted": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "background": {
      "dark": "darkBg",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "darkPanel",
      "light": "lightPanel"
    },
    "backgroundElement": {
      "dark": "darkElement",
      "light": "lightElement"
    },
    "border": {
      "dark": "darkBorder",
      "light": "lightBorder"
    },
    "borderActive": {
      "dark": "darkCyan",
      "light": "lightTeal"
    },
    "borderSubtle": {
      "dark": "#0f0f0f",
      "light": "#e0e0e0"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "diffHunkHeader": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "diffHighlightAdded": {
      "dark": "darkGreenBright",
      "light": "lightGreenBright"
    },
    "diffHighlightRemoved": {
      "dark": "darkRedBright",
      "light": "lightRedBright"
    },
    "diffAddedBg": {
      "dark": "#3fa26633",
      "light": "#1f8a651f"
    },
    "diffRemovedBg": {
      "dark": "#b8004933",
      "light": "#cf2d5614"
    },
    "diffContextBg": {
      "dark": "darkPanel",
      "light": "lightPanel"
    },
    "diffLineNumber": {
      "dark": "#eeeeee87",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#3fa26633",
      "light": "#1f8a651f"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#b8004933",
      "light": "#cf2d5614"
    },
    "markdownText": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownHeading": {
      "dark": "darkPurple",
      "light": "lightBlueDark"
    },
    "markdownLink": {
      "dark": "darkTeal",
      "light": "lightBlueDark"
    },
    "markdownLinkText": {
      "dark": "darkBlue",
      "light": "lightMuted"
    },
    "markdownCode": {
      "dark": "darkPink",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "markdownEmph": {
      "dark": "darkTeal",
      "light": "lightFg"
    },
    "markdownStrong": {
      "dark": "darkSyntaxYellow",
      "light": "lightFg"
    },
    "markdownHorizontalRule": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "markdownListItem": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightMuted"
    },
    "markdownImage": {
      "dark": "darkCyan",
      "light": "lightBlueDark"
    },
    "markdownImageText": {
      "dark": "darkBlue",
      "light": "lightMuted"
    },
    "markdownCodeBlock": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxComment": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "syntaxKeyword": {
      "dark": "darkTeal",
      "light": "lightMagenta"
    },
    "syntaxFunction": {
      "dark": "darkSyntaxOrange",
      "light": "lightOrange"
    },
    "syntaxVariable": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxString": {
      "dark": "darkPink",
      "light": "lightPurple"
    },
    "syntaxNumber": {
      "dark": "darkSyntaxYellow",
      "light": "lightPink"
    },
    "syntaxType": {
      "dark": "darkSyntaxOrange",
      "light": "lightBlueDark"
    },
    "syntaxOperator": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxPunctuation": {
      "dark": "darkFg",
      "light": "lightFg"
    }
      }
    };
    const dracula = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "background": "#282a36",
    "currentLine": "#44475a",
    "selection": "#44475a",
    "foreground": "#f8f8f2",
    "comment": "#CCD2E2",
    "cyan": "#8be9fd",
    "green": "#50fa7b",
    "orange": "#ffb86c",
    "pink": "#ff79c6",
    "purple": "#bd93f9",
    "red": "#ff5555",
    "yellow": "#f1fa8c"
      },
      "theme": {
    "primary": {
      "dark": "purple",
      "light": "purple"
    },
    "secondary": {
      "dark": "pink",
      "light": "pink"
    },
    "accent": {
      "dark": "cyan",
      "light": "cyan"
    },
    "error": {
      "dark": "red",
      "light": "red"
    },
    "warning": {
      "dark": "yellow",
      "light": "yellow"
    },
    "success": {
      "dark": "green",
      "light": "green"
    },
    "info": {
      "dark": "orange",
      "light": "orange"
    },
    "text": {
      "dark": "foreground",
      "light": "#282a36"
    },
    "textMuted": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "background": {
      "dark": "#282a36",
      "light": "#f8f8f2"
    },
    "backgroundPanel": {
      "dark": "#21222c",
      "light": "#e8e8e2"
    },
    "backgroundElement": {
      "dark": "currentLine",
      "light": "#d8d8d2"
    },
    "border": {
      "dark": "currentLine",
      "light": "#c8c8c2"
    },
    "borderActive": {
      "dark": "purple",
      "light": "purple"
    },
    "borderSubtle": {
      "dark": "#191a21",
      "light": "#e0e0e0"
    },
    "diffAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffContext": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "diffHunkHeader": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "diffHighlightAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffHighlightRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffAddedBg": {
      "dark": "#1a3a1a",
      "light": "#e0ffe0"
    },
    "diffRemovedBg": {
      "dark": "#3a1a1a",
      "light": "#ffe0e0"
    },
    "diffContextBg": {
      "dark": "#21222c",
      "light": "#e8e8e2"
    },
    "diffLineNumber": {
      "dark": "#989aa4",
      "light": "#686865"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1a3a1a",
      "light": "#e0ffe0"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1a1a",
      "light": "#ffe0e0"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#282a36"
    },
    "markdownHeading": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownLink": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownLinkText": {
      "dark": "pink",
      "light": "pink"
    },
    "markdownCode": {
      "dark": "green",
      "light": "green"
    },
    "markdownBlockQuote": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "yellow"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "orange"
    },
    "markdownHorizontalRule": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "markdownListItem": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownImage": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownImageText": {
      "dark": "pink",
      "light": "pink"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#282a36"
    },
    "syntaxComment": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "syntaxKeyword": {
      "dark": "pink",
      "light": "pink"
    },
    "syntaxFunction": {
      "dark": "green",
      "light": "green"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#282a36"
    },
    "syntaxString": {
      "dark": "yellow",
      "light": "yellow"
    },
    "syntaxNumber": {
      "dark": "purple",
      "light": "purple"
    },
    "syntaxType": {
      "dark": "cyan",
      "light": "cyan"
    },
    "syntaxOperator": {
      "dark": "pink",
      "light": "pink"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#282a36"
    }
      }
    };
    const everforest = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkStep1": "#2d353b",
    "darkStep2": "#333c43",
    "darkStep3": "#343f44",
    "darkStep4": "#3d484d",
    "darkStep5": "#475258",
    "darkStep6": "#7a8478",
    "darkStep7": "#859289",
    "darkStep8": "#9da9a0",
    "darkStep9": "#a7c080",
    "darkStep10": "#83c092",
    "darkStep11": "#BEC3BD",
    "darkStep12": "#D9CEB5",
    "darkRed": "#e67e80",
    "darkOrange": "#e69875",
    "darkGreen": "#a7c080",
    "darkCyan": "#83c092",
    "darkYellow": "#dbbc7f",
    "lightStep1": "#fdf6e3",
    "lightStep2": "#efebd4",
    "lightStep3": "#f4f0d9",
    "lightStep4": "#efebd4",
    "lightStep5": "#e6e2cc",
    "lightStep6": "#a6b0a0",
    "lightStep7": "#939f91",
    "lightStep8": "#829181",
    "lightStep9": "#8da101",
    "lightStep10": "#35a77c",
    "lightStep11": "#a6b0a0",
    "lightStep12": "#5c6a72",
    "lightRed": "#f85552",
    "lightOrange": "#f57d26",
    "lightGreen": "#8da101",
    "lightCyan": "#35a77c",
    "lightYellow": "#dfa000"
      },
      "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "secondary": {
      "dark": "#7fbbb3",
      "light": "#3a94c5"
    },
    "accent": {
      "dark": "#d699b6",
      "light": "#df69ba"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    },
    "backgroundPanel": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "backgroundElement": {
      "dark": "darkStep3",
      "light": "lightStep3"
    },
    "border": {
      "dark": "darkStep7",
      "light": "lightStep7"
    },
    "borderActive": {
      "dark": "darkStep8",
      "light": "lightStep8"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "#4fd6be",
      "light": "#1e725c"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "#b8db87",
      "light": "#4db380"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "#20303b",
      "light": "#d5e5d5"
    },
    "diffRemovedBg": {
      "dark": "#37222c",
      "light": "#f7d8db"
    },
    "diffContextBg": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "diffLineNumber": {
      "dark": "#a0a5a7",
      "light": "#5b5951"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1b2b34",
      "light": "#c5d5c5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1f26",
      "light": "#e7c8cb"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "#d699b6",
      "light": "#df69ba"
    },
    "markdownLink": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "#d699b6",
      "light": "#df69ba"
    },
    "syntaxFunction": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
      }
    };
    const flexoki = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "black": "#100F0F",
    "base950": "#1C1B1A",
    "base900": "#282726",
    "base850": "#343331",
    "base800": "#403E3C",
    "base700": "#575653",
    "base600": "#A8A8A5",
    "base500": "#878580",
    "base300": "#B7B5AC",
    "base200": "#CECDC3",
    "base150": "#DAD8CE",
    "base100": "#E6E4D9",
    "base50": "#F2F0E5",
    "paper": "#FFFCF0",
    "red400": "#D14D41",
    "red600": "#AF3029",
    "orange400": "#DF854A",
    "orange600": "#BC5215",
    "yellow400": "#D0A215",
    "yellow600": "#AD8301",
    "green400": "#879A39",
    "green600": "#66800B",
    "cyan400": "#3AA99F",
    "cyan600": "#24837B",
    "blue400": "#4788BF",
    "blue600": "#205EA6",
    "purple400": "#8B7EC8",
    "purple600": "#5E409D",
    "magenta400": "#CE5D97",
    "magenta600": "#A02F6F"
      },
      "theme": {
    "primary": {
      "dark": "orange400",
      "light": "blue600"
    },
    "secondary": {
      "dark": "blue400",
      "light": "purple600"
    },
    "accent": {
      "dark": "purple400",
      "light": "orange600"
    },
    "error": {
      "dark": "red400",
      "light": "red600"
    },
    "warning": {
      "dark": "orange400",
      "light": "orange600"
    },
    "success": {
      "dark": "green400",
      "light": "green600"
    },
    "info": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "text": {
      "dark": "base200",
      "light": "black"
    },
    "textMuted": {
      "dark": "base600",
      "light": "base600"
    },
    "background": {
      "dark": "black",
      "light": "paper"
    },
    "backgroundPanel": {
      "dark": "base950",
      "light": "base50"
    },
    "backgroundElement": {
      "dark": "base900",
      "light": "base100"
    },
    "border": {
      "dark": "base700",
      "light": "base300"
    },
    "borderActive": {
      "dark": "base600",
      "light": "base500"
    },
    "borderSubtle": {
      "dark": "base800",
      "light": "base200"
    },
    "diffAdded": {
      "dark": "green400",
      "light": "green600"
    },
    "diffRemoved": {
      "dark": "red400",
      "light": "red600"
    },
    "diffContext": {
      "dark": "base600",
      "light": "base600"
    },
    "diffHunkHeader": {
      "dark": "blue400",
      "light": "blue600"
    },
    "diffHighlightAdded": {
      "dark": "green400",
      "light": "green600"
    },
    "diffHighlightRemoved": {
      "dark": "red400",
      "light": "red600"
    },
    "diffAddedBg": {
      "dark": "#1A2D1A",
      "light": "#D5E5D5"
    },
    "diffRemovedBg": {
      "dark": "#2D1A1A",
      "light": "#F7D8DB"
    },
    "diffContextBg": {
      "dark": "base950",
      "light": "base50"
    },
    "diffLineNumber": {
      "dark": "#888883",
      "light": "#5a5955"
    },
    "diffAddedLineNumberBg": {
      "dark": "#152515",
      "light": "#C5D5C5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#251515",
      "light": "#E7C8CB"
    },
    "markdownText": {
      "dark": "base200",
      "light": "black"
    },
    "markdownHeading": {
      "dark": "purple400",
      "light": "purple600"
    },
    "markdownLink": {
      "dark": "blue400",
      "light": "blue600"
    },
    "markdownLinkText": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "markdownCode": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "markdownBlockQuote": {
      "dark": "yellow400",
      "light": "yellow600"
    },
    "markdownEmph": {
      "dark": "yellow400",
      "light": "yellow600"
    },
    "markdownStrong": {
      "dark": "orange400",
      "light": "orange600"
    },
    "markdownHorizontalRule": {
      "dark": "base600",
      "light": "base600"
    },
    "markdownListItem": {
      "dark": "orange400",
      "light": "orange600"
    },
    "markdownListEnumeration": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "markdownImage": {
      "dark": "magenta400",
      "light": "magenta600"
    },
    "markdownImageText": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "markdownCodeBlock": {
      "dark": "base200",
      "light": "black"
    },
    "syntaxComment": {
      "dark": "base600",
      "light": "base600"
    },
    "syntaxKeyword": {
      "dark": "green400",
      "light": "green600"
    },
    "syntaxFunction": {
      "dark": "orange400",
      "light": "orange600"
    },
    "syntaxVariable": {
      "dark": "blue400",
      "light": "blue600"
    },
    "syntaxString": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "syntaxNumber": {
      "dark": "purple400",
      "light": "purple600"
    },
    "syntaxType": {
      "dark": "yellow400",
      "light": "yellow600"
    },
    "syntaxOperator": {
      "dark": "base300",
      "light": "base600"
    },
    "syntaxPunctuation": {
      "dark": "base300",
      "light": "base600"
    }
      }
    };
    const github = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg": "#0d1117",
    "darkBgAlt": "#010409",
    "darkBgPanel": "#161b22",
    "darkFg": "#c9d1d9",
    "darkFgMuted": "#949DA6",
    "darkBlue": "#59A6FF",
    "darkGreen": "#3fb950",
    "darkRed": "#f85149",
    "darkOrange": "#d29922",
    "darkPurple": "#bc8cff",
    "darkPink": "#ff7b72",
    "darkYellow": "#e3b341",
    "darkCyan": "#39c5cf",
    "lightBg": "#ffffff",
    "lightBgAlt": "#f6f8fa",
    "lightBgPanel": "#f0f3f6",
    "lightFg": "#24292f",
    "lightFgMuted": "#57606a",
    "lightBlue": "#0969da",
    "lightGreen": "#1a7f37",
    "lightRed": "#cf222e",
    "lightOrange": "#bc4c00",
    "lightPurple": "#8250df",
    "lightPink": "#bf3989",
    "lightYellow": "#9a6700",
    "lightCyan": "#1b7c83"
      },
      "theme": {
    "primary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "text": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "textMuted": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "background": {
      "dark": "darkBg",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "backgroundElement": {
      "dark": "darkBgPanel",
      "light": "lightBgPanel"
    },
    "border": {
      "dark": "#30363d",
      "light": "#d0d7de"
    },
    "borderActive": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "borderSubtle": {
      "dark": "#21262d",
      "light": "#d8dee4"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "diffHunkHeader": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "diffHighlightAdded": {
      "dark": "#3fb950",
      "light": "#1a7f37"
    },
    "diffHighlightRemoved": {
      "dark": "#f85149",
      "light": "#cf222e"
    },
    "diffAddedBg": {
      "dark": "#033a16",
      "light": "#dafbe1"
    },
    "diffRemovedBg": {
      "dark": "#67060c",
      "light": "#ffebe9"
    },
    "diffContextBg": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "diffLineNumber": {
      "dark": "#95999e",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#033a16",
      "light": "#dafbe1"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#67060c",
      "light": "#ffebe9"
    },
    "markdownText": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownHeading": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLink": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkPink",
      "light": "lightPink"
    },
    "markdownBlockQuote": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "#30363d",
      "light": "#d0d7de"
    },
    "markdownListItem": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxComment": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "syntaxKeyword": {
      "dark": "darkPink",
      "light": "lightRed"
    },
    "syntaxFunction": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "syntaxVariable": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxString": {
      "dark": "darkCyan",
      "light": "lightBlue"
    },
    "syntaxNumber": {
      "dark": "darkBlue",
      "light": "lightCyan"
    },
    "syntaxType": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxOperator": {
      "dark": "darkPink",
      "light": "lightRed"
    },
    "syntaxPunctuation": {
      "dark": "darkFg",
      "light": "lightFg"
    }
      }
    };
    const gruvbox = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg0": "#282828",
    "darkBg1": "#3c3836",
    "darkBg2": "#504945",
    "darkBg3": "#665c54",
    "darkFg0": "#fbf1c7",
    "darkFg1": "#EDDFBA",
    "darkGray": "#DAD5CF",
    "darkRed": "#cc241d",
    "darkGreen": "#98971a",
    "darkYellow": "#d79921",
    "darkBlue": "#458588",
    "darkPurple": "#b16286",
    "darkAqua": "#689d6a",
    "darkOrange": "#d65d0e",
    "darkRedBright": "#FC7B6B",
    "darkGreenBright": "#b8bb26",
    "darkYellowBright": "#fabd2f",
    "darkBlueBright": "#88A99C",
    "darkPurpleBright": "#D58DA1",
    "darkAquaBright": "#8ec07c",
    "darkOrangeBright": "#fe8019",
    "lightBg0": "#fbf1c7",
    "lightBg1": "#ebdbb2",
    "lightBg2": "#d5c4a1",
    "lightBg3": "#bdae93",
    "lightFg0": "#282828",
    "lightFg1": "#3c3836",
    "lightGray": "#7c6f64",
    "lightRed": "#9d0006",
    "lightGreen": "#79740e",
    "lightYellow": "#b57614",
    "lightBlue": "#076678",
    "lightPurple": "#8f3f71",
    "lightAqua": "#427b58",
    "lightOrange": "#af3a03"
      },
      "theme": {
    "primary": {
      "dark": "darkBlueBright",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkPurpleBright",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "error": {
      "dark": "darkRedBright",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrangeBright",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkYellowBright",
      "light": "lightYellow"
    },
    "text": {
      "dark": "darkFg1",
      "light": "lightFg1"
    },
    "textMuted": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "background": {
      "dark": "darkBg0",
      "light": "lightBg0"
    },
    "backgroundPanel": {
      "dark": "darkBg1",
      "light": "lightBg1"
    },
    "backgroundElement": {
      "dark": "darkBg2",
      "light": "lightBg2"
    },
    "border": {
      "dark": "darkBg3",
      "light": "lightBg3"
    },
    "borderActive": {
      "dark": "darkFg1",
      "light": "lightFg1"
    },
    "borderSubtle": {
      "dark": "darkBg2",
      "light": "lightBg2"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "diffHunkHeader": {
      "dark": "darkAqua",
      "light": "lightAqua"
    },
    "diffHighlightAdded": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "diffHighlightRemoved": {
      "dark": "darkRedBright",
      "light": "lightRed"
    },
    "diffAddedBg": {
      "dark": "#32302f",
      "light": "#dcd8a4"
    },
    "diffRemovedBg": {
      "dark": "#322929",
      "light": "#e2c7c3"
    },
    "diffContextBg": {
      "dark": "darkBg1",
      "light": "lightBg1"
    },
    "diffLineNumber": {
      "dark": "#a8a29e",
      "light": "#564f43"
    },
    "diffAddedLineNumberBg": {
      "dark": "#2a2827",
      "light": "#cec99e"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2a2222",
      "light": "#d3bdb9"
    },
    "markdownText": {
      "dark": "darkFg1",
      "light": "lightFg1"
    },
    "markdownHeading": {
      "dark": "darkBlueBright",
      "light": "lightBlue"
    },
    "markdownLink": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "markdownLinkText": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "markdownCode": {
      "dark": "darkYellowBright",
      "light": "lightYellow"
    },
    "markdownBlockQuote": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "markdownEmph": {
      "dark": "darkPurpleBright",
      "light": "lightPurple"
    },
    "markdownStrong": {
      "dark": "darkOrangeBright",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "markdownListItem": {
      "dark": "darkBlueBright",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "markdownImage": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "markdownImageText": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "markdownCodeBlock": {
      "dark": "darkFg1",
      "light": "lightFg1"
    },
    "syntaxComment": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "syntaxKeyword": {
      "dark": "darkRedBright",
      "light": "lightRed"
    },
    "syntaxFunction": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "syntaxVariable": {
      "dark": "darkBlueBright",
      "light": "lightBlue"
    },
    "syntaxString": {
      "dark": "darkYellowBright",
      "light": "lightYellow"
    },
    "syntaxNumber": {
      "dark": "darkPurpleBright",
      "light": "lightPurple"
    },
    "syntaxType": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "syntaxOperator": {
      "dark": "darkOrangeBright",
      "light": "lightOrange"
    },
    "syntaxPunctuation": {
      "dark": "darkFg1",
      "light": "lightFg1"
    }
      }
    };
    const kanagawa = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "sumiInk0": "#1F1F28",
    "sumiInk1": "#2A2A37",
    "sumiInk2": "#363646",
    "sumiInk3": "#54546D",
    "fujiWhite": "#DCD7BA",
    "oldWhite": "#C8C093",
    "fujiGray": "#BABAB6",
    "oniViolet": "#9D88BD",
    "crystalBlue": "#7E9CD8",
    "carpYellow": "#C38D9D",
    "sakuraPink": "#D27E99",
    "waveAqua": "#76946A",
    "roninYellow": "#D7A657",
    "dragonRed": "#E82424",
    "lotusGreen": "#98BB6C",
    "waveBlue": "#2D4F67",
    "lightBg": "#F2E9DE",
    "lightPaper": "#EAE4D7",
    "lightText": "#54433A",
    "lightGray": "#9E9389"
      },
      "theme": {
    "primary": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "secondary": {
      "dark": "oniViolet",
      "light": "oniViolet"
    },
    "accent": {
      "dark": "sakuraPink",
      "light": "sakuraPink"
    },
    "error": {
      "dark": "dragonRed",
      "light": "dragonRed"
    },
    "warning": {
      "dark": "roninYellow",
      "light": "roninYellow"
    },
    "success": {
      "dark": "lotusGreen",
      "light": "lotusGreen"
    },
    "info": {
      "dark": "waveAqua",
      "light": "waveAqua"
    },
    "text": {
      "dark": "fujiWhite",
      "light": "lightText"
    },
    "textMuted": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "background": {
      "dark": "sumiInk0",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "sumiInk1",
      "light": "lightPaper"
    },
    "backgroundElement": {
      "dark": "sumiInk2",
      "light": "#E3DCD2"
    },
    "border": {
      "dark": "sumiInk3",
      "light": "#D4CBBF"
    },
    "borderActive": {
      "dark": "carpYellow",
      "light": "carpYellow"
    },
    "borderSubtle": {
      "dark": "sumiInk2",
      "light": "#DCD4C9"
    },
    "diffAdded": {
      "dark": "lotusGreen",
      "light": "lotusGreen"
    },
    "diffRemoved": {
      "dark": "dragonRed",
      "light": "dragonRed"
    },
    "diffContext": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "diffHunkHeader": {
      "dark": "waveBlue",
      "light": "waveBlue"
    },
    "diffHighlightAdded": {
      "dark": "#A9D977",
      "light": "#89AF5B"
    },
    "diffHighlightRemoved": {
      "dark": "#F24A4A",
      "light": "#D61F1F"
    },
    "diffAddedBg": {
      "dark": "#252E25",
      "light": "#EAF3E4"
    },
    "diffRemovedBg": {
      "dark": "#362020",
      "light": "#FBE6E6"
    },
    "diffContextBg": {
      "dark": "sumiInk1",
      "light": "lightPaper"
    },
    "diffLineNumber": {
      "dark": "#9090a0",
      "light": "#65615c"
    },
    "diffAddedLineNumberBg": {
      "dark": "#202820",
      "light": "#DDE8D6"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2D1C1C",
      "light": "#F2DADA"
    },
    "markdownText": {
      "dark": "fujiWhite",
      "light": "lightText"
    },
    "markdownHeading": {
      "dark": "oniViolet",
      "light": "oniViolet"
    },
    "markdownLink": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "markdownLinkText": {
      "dark": "waveAqua",
      "light": "waveAqua"
    },
    "markdownCode": {
      "dark": "lotusGreen",
      "light": "lotusGreen"
    },
    "markdownBlockQuote": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "markdownEmph": {
      "dark": "carpYellow",
      "light": "carpYellow"
    },
    "markdownStrong": {
      "dark": "roninYellow",
      "light": "roninYellow"
    },
    "markdownHorizontalRule": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "markdownListItem": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "markdownListEnumeration": {
      "dark": "waveAqua",
      "light": "waveAqua"
    },
    "markdownImage": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "markdownImageText": {
      "dark": "waveAqua",
      "light": "waveAqua"
    },
    "markdownCodeBlock": {
      "dark": "fujiWhite",
      "light": "lightText"
    },
    "syntaxComment": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "syntaxKeyword": {
      "dark": "oniViolet",
      "light": "oniViolet"
    },
    "syntaxFunction": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "syntaxVariable": {
      "dark": "fujiWhite",
      "light": "lightText"
    },
    "syntaxString": {
      "dark": "lotusGreen",
      "light": "lotusGreen"
    },
    "syntaxNumber": {
      "dark": "roninYellow",
      "light": "roninYellow"
    },
    "syntaxType": {
      "dark": "carpYellow",
      "light": "carpYellow"
    },
    "syntaxOperator": {
      "dark": "sakuraPink",
      "light": "sakuraPink"
    },
    "syntaxPunctuation": {
      "dark": "fujiWhite",
      "light": "lightText"
    }
      }
    };
    const lucent_orng = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkStep6": "#3c3c3c",
    "darkStep11": "#929292",
    "darkStep12": "#eeeeee",
    "darkSecondary": "#EE7948",
    "darkAccent": "#FFF7F1",
    "darkRed": "#e06c75",
    "darkOrange": "#F07B54",
    "darkBlue": "#6ba1e6",
    "darkCyan": "#56b6c2",
    "darkYellow": "#e5c07b",
    "darkPanelBg": "#2a1a1599",
    "lightStep6": "#d4d4d4",
    "lightStep11": "#545454",
    "lightStep12": "#1a1a1a",
    "lightSecondary": "#E67546",
    "lightAccent": "#c94d24",
    "lightRed": "#d1383d",
    "lightOrange": "#C04A23",
    "lightBlue": "#0062d1",
    "lightCyan": "#2F818F",
    "lightYellow": "#95711A",
    "lightPanelBg": "#fff5f099"
      },
      "theme": {
    "primary": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "secondary": {
      "dark": "darkSecondary",
      "light": "lightSecondary"
    },
    "accent": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "selectedListItemText": {
      "dark": "#0a0a0a",
      "light": "#ffffff"
    },
    "background": {
      "dark": "transparent",
      "light": "transparent"
    },
    "backgroundPanel": {
      "dark": "transparent",
      "light": "transparent"
    },
    "backgroundElement": {
      "dark": "transparent",
      "light": "transparent"
    },
    "backgroundMenu": {
      "dark": "darkPanelBg",
      "light": "lightPanelBg"
    },
    "border": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "borderActive": {
      "dark": "darkSecondary",
      "light": "lightAccent"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "diffRemovedBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "diffContextBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "diffLineNumber": "textMuted",
    "diffAddedLineNumberBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "diffRemovedLineNumberBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownLink": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownBlockQuote": {
      "dark": "darkAccent",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkSecondary",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxFunction": {
      "dark": "darkSecondary",
      "light": "lightAccent"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxNumber": {
      "dark": "darkAccent",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
      }
    };
    const material = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg": "#263238",
    "darkBgAlt": "#1e272c",
    "darkBgPanel": "#37474f",
    "darkFg": "#eeffff",
    "darkFgMuted": "#C5CED2",
    "darkRed": "#f07178",
    "darkPink": "#f78c6c",
    "darkOrange": "#ffcb6b",
    "darkYellow": "#ffcb6b",
    "darkGreen": "#c3e88d",
    "darkCyan": "#89ddff",
    "darkBlue": "#82aaff",
    "darkPurple": "#c792ea",
    "darkViolet": "#bb80b3",
    "lightBg": "#fafafa",
    "lightBgAlt": "#f5f5f5",
    "lightBgPanel": "#e7e7e8",
    "lightFg": "#263238",
    "lightFgMuted": "#90a4ae",
    "lightRed": "#e53935",
    "lightPink": "#ec407a",
    "lightOrange": "#f4511e",
    "lightYellow": "#ffb300",
    "lightGreen": "#91b859",
    "lightCyan": "#39adb5",
    "lightBlue": "#6182b8",
    "lightPurple": "#7c4dff",
    "lightViolet": "#945eb8"
      },
      "theme": {
    "primary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "text": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "textMuted": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "background": {
      "dark": "darkBg",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "backgroundElement": {
      "dark": "darkBgPanel",
      "light": "lightBgPanel"
    },
    "border": {
      "dark": "#37474f",
      "light": "#e0e0e0"
    },
    "borderActive": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "borderSubtle": {
      "dark": "#1e272c",
      "light": "#eeeeee"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "diffHunkHeader": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "diffHighlightAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffHighlightRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffAddedBg": {
      "dark": "#2e3c2b",
      "light": "#e8f5e9"
    },
    "diffRemovedBg": {
      "dark": "#3c2b2b",
      "light": "#ffebee"
    },
    "diffContextBg": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "diffLineNumber": {
      "dark": "#9aa2a6",
      "light": "#6a6e70"
    },
    "diffAddedLineNumberBg": {
      "dark": "#2e3c2b",
      "light": "#e8f5e9"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3c2b2b",
      "light": "#ffebee"
    },
    "markdownText": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownHeading": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLink": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownLinkText": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "#37474f",
      "light": "#e0e0e0"
    },
    "markdownListItem": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImageText": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "markdownCodeBlock": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxComment": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "syntaxKeyword": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "syntaxFunction": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxVariable": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkFg",
      "light": "lightFg"
    }
      }
    };
    const matrix = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "matrixInk0": "#0a0e0a",
    "matrixInk1": "#0e130d",
    "matrixInk2": "#141c12",
    "matrixInk3": "#1e2a1b",
    "rainGreen": "#2eff6a",
    "rainGreenDim": "#1cc24b",
    "rainGreenHi": "#62ff94",
    "rainCyan": "#00efff",
    "rainTeal": "#24f6d9",
    "rainPurple": "#c770ff",
    "rainOrange": "#ffa83d",
    "alertRed": "#ff4b4b",
    "alertYellow": "#e6ff57",
    "alertBlue": "#30b3ff",
    "rainGray": "#8ca391",
    "lightBg": "#eef3ea",
    "lightPaper": "#e4ebe1",
    "lightInk1": "#dae1d7",
    "lightText": "#203022",
    "lightGray": "#748476"
      },
      "theme": {
    "primary": {
      "dark": "rainGreen",
      "light": "rainGreenDim"
    },
    "secondary": {
      "dark": "rainCyan",
      "light": "rainTeal"
    },
    "accent": {
      "dark": "rainPurple",
      "light": "rainPurple"
    },
    "error": {
      "dark": "alertRed",
      "light": "alertRed"
    },
    "warning": {
      "dark": "alertYellow",
      "light": "alertYellow"
    },
    "success": {
      "dark": "rainGreenHi",
      "light": "rainGreenDim"
    },
    "info": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "text": {
      "dark": "rainGreenHi",
      "light": "lightText"
    },
    "textMuted": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "background": {
      "dark": "matrixInk0",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "matrixInk1",
      "light": "lightPaper"
    },
    "backgroundElement": {
      "dark": "matrixInk2",
      "light": "lightInk1"
    },
    "border": {
      "dark": "matrixInk3",
      "light": "lightGray"
    },
    "borderActive": {
      "dark": "rainGreen",
      "light": "rainGreenDim"
    },
    "borderSubtle": {
      "dark": "matrixInk2",
      "light": "lightInk1"
    },
    "diffAdded": {
      "dark": "rainGreenDim",
      "light": "rainGreenDim"
    },
    "diffRemoved": {
      "dark": "alertRed",
      "light": "alertRed"
    },
    "diffContext": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "diffHunkHeader": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "diffHighlightAdded": {
      "dark": "#77ffaf",
      "light": "#5dac7e"
    },
    "diffHighlightRemoved": {
      "dark": "#ff7171",
      "light": "#d53a3a"
    },
    "diffAddedBg": {
      "dark": "#132616",
      "light": "#e0efde"
    },
    "diffRemovedBg": {
      "dark": "#261212",
      "light": "#f9e5e5"
    },
    "diffContextBg": {
      "dark": "matrixInk1",
      "light": "lightPaper"
    },
    "diffLineNumber": {
      "dark": "textMuted",
      "light": "#556156"
    },
    "diffAddedLineNumberBg": {
      "dark": "#0f1b11",
      "light": "#d6e7d2"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#1b1414",
      "light": "#f2d2d2"
    },
    "markdownText": {
      "dark": "rainGreenHi",
      "light": "lightText"
    },
    "markdownHeading": {
      "dark": "rainCyan",
      "light": "rainTeal"
    },
    "markdownLink": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "markdownLinkText": {
      "dark": "rainTeal",
      "light": "rainTeal"
    },
    "markdownCode": {
      "dark": "rainGreenDim",
      "light": "rainGreenDim"
    },
    "markdownBlockQuote": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "markdownEmph": {
      "dark": "rainOrange",
      "light": "rainOrange"
    },
    "markdownStrong": {
      "dark": "alertYellow",
      "light": "alertYellow"
    },
    "markdownHorizontalRule": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "markdownListItem": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "markdownListEnumeration": {
      "dark": "rainTeal",
      "light": "rainTeal"
    },
    "markdownImage": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "markdownImageText": {
      "dark": "rainTeal",
      "light": "rainTeal"
    },
    "markdownCodeBlock": {
      "dark": "rainGreenHi",
      "light": "lightText"
    },
    "syntaxComment": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "syntaxKeyword": {
      "dark": "rainPurple",
      "light": "rainPurple"
    },
    "syntaxFunction": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "syntaxVariable": {
      "dark": "rainGreenHi",
      "light": "lightText"
    },
    "syntaxString": {
      "dark": "rainGreenDim",
      "light": "rainGreenDim"
    },
    "syntaxNumber": {
      "dark": "rainOrange",
      "light": "rainOrange"
    },
    "syntaxType": {
      "dark": "alertYellow",
      "light": "alertYellow"
    },
    "syntaxOperator": {
      "dark": "rainTeal",
      "light": "rainTeal"
    },
    "syntaxPunctuation": {
      "dark": "rainGreenHi",
      "light": "lightText"
    }
      }
    };
    const mercury = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "purple-800": "#3442a6",
    "purple-700": "#465bd1",
    "purple-600": "#5266eb",
    "purple-400": "#8da4f5",
    "purple-300": "#a7b6f8",
    "red-700": "#b0175f",
    "red-600": "#d03275",
    "red-400": "#fc92b4",
    "green-700": "#036e43",
    "green-600": "#188554",
    "green-400": "#77c599",
    "orange-700": "#a44200",
    "orange-600": "#c45000",
    "orange-400": "#fc9b6f",
    "blue-600": "#007f95",
    "blue-400": "#77becf",
    "neutral-1000": "#10101a",
    "neutral-950": "#171721",
    "neutral-900": "#1e1e2a",
    "neutral-800": "#272735",
    "neutral-700": "#363644",
    "neutral-600": "#535461",
    "neutral-500": "#70707d",
    "neutral-400": "#A8A8B1",
    "neutral-300": "#c3c3cc",
    "neutral-200": "#dddde5",
    "neutral-100": "#f4f5f9",
    "neutral-050": "#fbfcfd",
    "neutral-000": "#ffffff",
    "neutral-150": "#ededf3",
    "border-light": "#7073931a",
    "border-light-subtle": "#7073930f",
    "border-dark": "#b4b7c81f",
    "border-dark-subtle": "#b4b7c814",
    "diff-added-light": "#1885541a",
    "diff-removed-light": "#d032751a",
    "diff-added-dark": "#77c59933",
    "diff-removed-dark": "#fc92b433"
      },
      "theme": {
    "primary": {
      "light": "purple-600",
      "dark": "purple-400"
    },
    "secondary": {
      "light": "purple-700",
      "dark": "purple-300"
    },
    "accent": {
      "light": "purple-400",
      "dark": "purple-400"
    },
    "error": {
      "light": "red-700",
      "dark": "red-400"
    },
    "warning": {
      "light": "orange-700",
      "dark": "orange-400"
    },
    "success": {
      "light": "green-700",
      "dark": "green-400"
    },
    "info": {
      "light": "blue-600",
      "dark": "blue-400"
    },
    "text": {
      "light": "neutral-700",
      "dark": "neutral-200"
    },
    "textMuted": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "background": {
      "light": "neutral-000",
      "dark": "neutral-950"
    },
    "backgroundPanel": {
      "light": "neutral-050",
      "dark": "neutral-1000"
    },
    "backgroundElement": {
      "light": "neutral-100",
      "dark": "neutral-800"
    },
    "border": {
      "light": "border-light",
      "dark": "border-dark"
    },
    "borderActive": {
      "light": "purple-600",
      "dark": "purple-400"
    },
    "borderSubtle": {
      "light": "border-light-subtle",
      "dark": "border-dark-subtle"
    },
    "diffAdded": {
      "light": "green-700",
      "dark": "green-400"
    },
    "diffRemoved": {
      "light": "red-700",
      "dark": "red-400"
    },
    "diffContext": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "diffHunkHeader": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "diffHighlightAdded": {
      "light": "green-700",
      "dark": "green-400"
    },
    "diffHighlightRemoved": {
      "light": "red-700",
      "dark": "red-400"
    },
    "diffAddedBg": {
      "light": "diff-added-light",
      "dark": "diff-added-dark"
    },
    "diffRemovedBg": {
      "light": "diff-removed-light",
      "dark": "diff-removed-dark"
    },
    "diffContextBg": {
      "light": "neutral-050",
      "dark": "neutral-900"
    },
    "diffLineNumber": {
      "light": "neutral-600",
      "dark": "neutral-300"
    },
    "diffAddedLineNumberBg": {
      "light": "diff-added-light",
      "dark": "diff-added-dark"
    },
    "diffRemovedLineNumberBg": {
      "light": "diff-removed-light",
      "dark": "diff-removed-dark"
    },
    "markdownText": {
      "light": "neutral-700",
      "dark": "neutral-200"
    },
    "markdownHeading": {
      "light": "neutral-900",
      "dark": "neutral-000"
    },
    "markdownLink": {
      "light": "purple-700",
      "dark": "purple-400"
    },
    "markdownLinkText": {
      "light": "purple-600",
      "dark": "purple-300"
    },
    "markdownCode": {
      "light": "green-700",
      "dark": "green-400"
    },
    "markdownBlockQuote": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "markdownEmph": {
      "light": "orange-700",
      "dark": "orange-400"
    },
    "markdownStrong": {
      "light": "neutral-900",
      "dark": "neutral-100"
    },
    "markdownHorizontalRule": {
      "light": "border-light",
      "dark": "border-dark"
    },
    "markdownListItem": {
      "light": "neutral-900",
      "dark": "neutral-000"
    },
    "markdownListEnumeration": {
      "light": "purple-600",
      "dark": "purple-400"
    },
    "markdownImage": {
      "light": "purple-700",
      "dark": "purple-400"
    },
    "markdownImageText": {
      "light": "purple-600",
      "dark": "purple-300"
    },
    "markdownCodeBlock": {
      "light": "neutral-700",
      "dark": "neutral-200"
    },
    "syntaxComment": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "syntaxKeyword": {
      "light": "purple-700",
      "dark": "purple-400"
    },
    "syntaxFunction": {
      "light": "purple-600",
      "dark": "purple-400"
    },
    "syntaxVariable": {
      "light": "blue-600",
      "dark": "blue-400"
    },
    "syntaxString": {
      "light": "green-700",
      "dark": "green-400"
    },
    "syntaxNumber": {
      "light": "orange-700",
      "dark": "orange-400"
    },
    "syntaxType": {
      "light": "blue-600",
      "dark": "blue-400"
    },
    "syntaxOperator": {
      "light": "purple-700",
      "dark": "purple-400"
    },
    "syntaxPunctuation": {
      "light": "neutral-700",
      "dark": "neutral-200"
    }
      }
    };
    const monokai = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "background": "#272822",
    "backgroundAlt": "#1e1f1c",
    "backgroundPanel": "#3e3d32",
    "foreground": "#f8f8f2",
    "comment": "#C2C1B8",
    "red": "#f92672",
    "orange": "#fd971f",
    "lightOrange": "#e69f66",
    "yellow": "#e6db74",
    "green": "#a6e22e",
    "cyan": "#66d9ef",
    "blue": "#66d9ef",
    "purple": "#ae81ff",
    "pink": "#FA4989"
      },
      "theme": {
    "primary": {
      "dark": "cyan",
      "light": "blue"
    },
    "secondary": {
      "dark": "purple",
      "light": "purple"
    },
    "accent": {
      "dark": "green",
      "light": "green"
    },
    "error": {
      "dark": "red",
      "light": "red"
    },
    "warning": {
      "dark": "yellow",
      "light": "orange"
    },
    "success": {
      "dark": "green",
      "light": "green"
    },
    "info": {
      "dark": "orange",
      "light": "orange"
    },
    "text": {
      "dark": "foreground",
      "light": "#272822"
    },
    "textMuted": {
      "dark": "comment",
      "light": "#75715e"
    },
    "background": {
      "dark": "#272822",
      "light": "#fafafa"
    },
    "backgroundPanel": {
      "dark": "#1e1f1c",
      "light": "#f0f0f0"
    },
    "backgroundElement": {
      "dark": "#3e3d32",
      "light": "#e0e0e0"
    },
    "border": {
      "dark": "#3e3d32",
      "light": "#d0d0d0"
    },
    "borderActive": {
      "dark": "cyan",
      "light": "blue"
    },
    "borderSubtle": {
      "dark": "#1e1f1c",
      "light": "#e8e8e8"
    },
    "diffAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffContext": {
      "dark": "comment",
      "light": "#75715e"
    },
    "diffHunkHeader": {
      "dark": "comment",
      "light": "#75715e"
    },
    "diffHighlightAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffHighlightRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffAddedBg": {
      "dark": "#1a3a1a",
      "light": "#e0ffe0"
    },
    "diffRemovedBg": {
      "dark": "#3a1a1a",
      "light": "#ffe0e0"
    },
    "diffContextBg": {
      "dark": "#1e1f1c",
      "light": "#f0f0f0"
    },
    "diffLineNumber": {
      "dark": "#9b9b95",
      "light": "#686868"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1a3a1a",
      "light": "#e0ffe0"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1a1a",
      "light": "#ffe0e0"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#272822"
    },
    "markdownHeading": {
      "dark": "pink",
      "light": "pink"
    },
    "markdownLink": {
      "dark": "cyan",
      "light": "blue"
    },
    "markdownLinkText": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownCode": {
      "dark": "green",
      "light": "green"
    },
    "markdownBlockQuote": {
      "dark": "comment",
      "light": "#75715e"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "orange"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "orange"
    },
    "markdownHorizontalRule": {
      "dark": "comment",
      "light": "#75715e"
    },
    "markdownListItem": {
      "dark": "cyan",
      "light": "blue"
    },
    "markdownListEnumeration": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownImage": {
      "dark": "cyan",
      "light": "blue"
    },
    "markdownImageText": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#272822"
    },
    "syntaxComment": {
      "dark": "comment",
      "light": "#75715e"
    },
    "syntaxKeyword": {
      "dark": "pink",
      "light": "pink"
    },
    "syntaxFunction": {
      "dark": "green",
      "light": "green"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#272822"
    },
    "syntaxString": {
      "dark": "yellow",
      "light": "orange"
    },
    "syntaxNumber": {
      "dark": "purple",
      "light": "purple"
    },
    "syntaxType": {
      "dark": "cyan",
      "light": "blue"
    },
    "syntaxOperator": {
      "dark": "pink",
      "light": "pink"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#272822"
    }
      }
    };
    const nightowl = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "nightOwlBg": "#011627",
    "nightOwlFg": "#d6deeb",
    "nightOwlBlue": "#82AAFF",
    "nightOwlCyan": "#7fdbca",
    "nightOwlGreen": "#c5e478",
    "nightOwlYellow": "#ecc48d",
    "nightOwlOrange": "#F78C6C",
    "nightOwlRed": "#EF5350",
    "nightOwlPink": "#ff5874",
    "nightOwlPurple": "#c792ea",
    "nightOwlMuted": "#91A7B8",
    "nightOwlGray": "#7C8D8D",
    "nightOwlLightGray": "#89a4bb",
    "nightOwlPanel": "#0b253a"
      },
      "theme": {
    "primary": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "secondary": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "accent": {
      "dark": "nightOwlPurple",
      "light": "nightOwlPurple"
    },
    "error": {
      "dark": "nightOwlRed",
      "light": "nightOwlRed"
    },
    "warning": {
      "dark": "nightOwlYellow",
      "light": "nightOwlYellow"
    },
    "success": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "info": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "text": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    },
    "textMuted": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "background": {
      "dark": "nightOwlBg",
      "light": "nightOwlBg"
    },
    "backgroundPanel": {
      "dark": "nightOwlPanel",
      "light": "nightOwlPanel"
    },
    "backgroundElement": {
      "dark": "nightOwlPanel",
      "light": "nightOwlPanel"
    },
    "border": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "borderActive": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "borderSubtle": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "diffAdded": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "diffRemoved": {
      "dark": "nightOwlRed",
      "light": "nightOwlRed"
    },
    "diffContext": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "diffHunkHeader": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "diffHighlightAdded": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "diffHighlightRemoved": {
      "dark": "nightOwlRed",
      "light": "nightOwlRed"
    },
    "diffAddedBg": {
      "dark": "#0a2e1a",
      "light": "#0a2e1a"
    },
    "diffRemovedBg": {
      "dark": "#2d1b1b",
      "light": "#2d1b1b"
    },
    "diffContextBg": {
      "dark": "nightOwlPanel",
      "light": "nightOwlPanel"
    },
    "diffLineNumber": {
      "dark": "#7791a6",
      "light": "#7791a6"
    },
    "diffAddedLineNumberBg": {
      "dark": "#0a2e1a",
      "light": "#0a2e1a"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1b1b",
      "light": "#2d1b1b"
    },
    "markdownText": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    },
    "markdownHeading": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "markdownLink": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "markdownLinkText": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "markdownCode": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "markdownBlockQuote": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "markdownEmph": {
      "dark": "nightOwlPurple",
      "light": "nightOwlPurple"
    },
    "markdownStrong": {
      "dark": "nightOwlYellow",
      "light": "nightOwlYellow"
    },
    "markdownHorizontalRule": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "markdownListItem": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "markdownListEnumeration": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "markdownImage": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "markdownImageText": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "markdownCodeBlock": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    },
    "syntaxComment": {
      "dark": "nightOwlGray",
      "light": "nightOwlGray"
    },
    "syntaxKeyword": {
      "dark": "nightOwlPurple",
      "light": "nightOwlPurple"
    },
    "syntaxFunction": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "syntaxVariable": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    },
    "syntaxString": {
      "dark": "nightOwlYellow",
      "light": "nightOwlYellow"
    },
    "syntaxNumber": {
      "dark": "nightOwlOrange",
      "light": "nightOwlOrange"
    },
    "syntaxType": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "syntaxOperator": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "syntaxPunctuation": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    }
      }
    };
    const nord = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "nord0": "#2E3440",
    "nord1": "#3B4252",
    "nord2": "#434C5E",
    "nord3": "#9399A5",
    "nord4": "#D8DEE9",
    "nord5": "#E5E9F0",
    "nord6": "#ECEFF4",
    "nord7": "#8FBCBB",
    "nord8": "#88C0D0",
    "nord9": "#96B1CB",
    "nord10": "#5E81AC",
    "nord11": "#C7757C",
    "nord12": "#DAA08D",
    "nord13": "#EBCB8B",
    "nord14": "#A3BE8C",
    "nord15": "#C3A5BD"
      },
      "theme": {
    "primary": {
      "dark": "nord8",
      "light": "nord10"
    },
    "secondary": {
      "dark": "nord9",
      "light": "nord9"
    },
    "accent": {
      "dark": "nord7",
      "light": "nord7"
    },
    "error": {
      "dark": "nord11",
      "light": "nord11"
    },
    "warning": {
      "dark": "nord12",
      "light": "nord12"
    },
    "success": {
      "dark": "nord14",
      "light": "nord14"
    },
    "info": {
      "dark": "nord8",
      "light": "nord10"
    },
    "text": {
      "dark": "nord6",
      "light": "nord0"
    },
    "textMuted": {
      "dark": "#D4D8DE",
      "light": "nord1"
    },
    "background": {
      "dark": "nord0",
      "light": "nord6"
    },
    "backgroundPanel": {
      "dark": "nord1",
      "light": "nord5"
    },
    "backgroundElement": {
      "dark": "nord2",
      "light": "nord4"
    },
    "border": {
      "dark": "nord2",
      "light": "nord3"
    },
    "borderActive": {
      "dark": "nord3",
      "light": "nord2"
    },
    "borderSubtle": {
      "dark": "nord2",
      "light": "nord3"
    },
    "diffAdded": {
      "dark": "nord14",
      "light": "nord14"
    },
    "diffRemoved": {
      "dark": "nord11",
      "light": "nord11"
    },
    "diffContext": {
      "dark": "#8B95A7",
      "light": "nord3"
    },
    "diffHunkHeader": {
      "dark": "#8B95A7",
      "light": "nord3"
    },
    "diffHighlightAdded": {
      "dark": "nord14",
      "light": "nord14"
    },
    "diffHighlightRemoved": {
      "dark": "nord11",
      "light": "nord11"
    },
    "diffAddedBg": {
      "dark": "#3B4252",
      "light": "#E5E9F0"
    },
    "diffRemovedBg": {
      "dark": "#3B4252",
      "light": "#E5E9F0"
    },
    "diffContextBg": {
      "dark": "nord1",
      "light": "nord5"
    },
    "diffLineNumber": {
      "dark": "#a9aeb6",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#3B4252",
      "light": "#E5E9F0"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3B4252",
      "light": "#E5E9F0"
    },
    "markdownText": {
      "dark": "nord4",
      "light": "nord0"
    },
    "markdownHeading": {
      "dark": "nord8",
      "light": "nord10"
    },
    "markdownLink": {
      "dark": "nord9",
      "light": "nord9"
    },
    "markdownLinkText": {
      "dark": "nord7",
      "light": "nord7"
    },
    "markdownCode": {
      "dark": "nord14",
      "light": "nord14"
    },
    "markdownBlockQuote": {
      "dark": "#A6AEBB",
      "light": "nord3"
    },
    "markdownEmph": {
      "dark": "nord12",
      "light": "nord12"
    },
    "markdownStrong": {
      "dark": "nord13",
      "light": "nord13"
    },
    "markdownHorizontalRule": {
      "dark": "#8B95A7",
      "light": "nord3"
    },
    "markdownListItem": {
      "dark": "nord8",
      "light": "nord10"
    },
    "markdownListEnumeration": {
      "dark": "nord7",
      "light": "nord7"
    },
    "markdownImage": {
      "dark": "nord9",
      "light": "nord9"
    },
    "markdownImageText": {
      "dark": "nord7",
      "light": "nord7"
    },
    "markdownCodeBlock": {
      "dark": "nord4",
      "light": "nord0"
    },
    "syntaxComment": {
      "dark": "#A6AEBB",
      "light": "nord3"
    },
    "syntaxKeyword": {
      "dark": "nord9",
      "light": "nord9"
    },
    "syntaxFunction": {
      "dark": "nord8",
      "light": "nord8"
    },
    "syntaxVariable": {
      "dark": "nord7",
      "light": "nord7"
    },
    "syntaxString": {
      "dark": "nord14",
      "light": "nord14"
    },
    "syntaxNumber": {
      "dark": "nord15",
      "light": "nord15"
    },
    "syntaxType": {
      "dark": "nord7",
      "light": "nord7"
    },
    "syntaxOperator": {
      "dark": "nord9",
      "light": "nord9"
    },
    "syntaxPunctuation": {
      "dark": "nord4",
      "light": "nord0"
    }
      }
    };
    const oc_2 = {
      "defs": {},
      "theme": {
    "background": {
      "dark": "#1F1F1F",
      "light": "#F7F7F7"
    },
    "backgroundPanel": {
      "dark": "#1C1C1C",
      "light": "#F8F8F8"
    },
    "backgroundElement": {
      "dark": "#232323",
      "light": "#F3F3F3"
    },
    "text": {
      "dark": "#EDEDED",
      "light": "#171717"
    },
    "textMuted": {
      "dark": "#A4A4A4",
      "light": "#4E4E4E"
    },
    "primary": {
      "dark": "#FAB283",
      "light": "#717248"
    },
    "secondary": {
      "dark": "#1257FF",
      "light": "#034CFF"
    },
    "accent": {
      "dark": "#034CFF",
      "light": "#034CFF"
    },
    "error": {
      "dark": "#FC533A",
      "light": "#FC533A"
    },
    "warning": {
      "dark": "#FCD53A",
      "light": "#A58E0F"
    },
    "success": {
      "dark": "#12C905",
      "light": "#0FA604"
    },
    "info": {
      "dark": "#EDB2F1",
      "light": "#A753AE"
    },
    "border": {
      "dark": "#282828",
      "light": "#DBDBDB"
    },
    "borderActive": {
      "dark": "#AEAAA8",
      "light": "#5F5C5B"
    },
    "syntaxComment": {
      "dark": "#8F8F8F",
      "light": "#727272"
    },
    "syntaxKeyword": {
      "dark": "#EDB2F1",
      "light": "#A452AB"
    },
    "syntaxFunction": {
      "dark": "#FAB283",
      "light": "#717248"
    },
    "syntaxVariable": {
      "dark": "#EDEDED",
      "light": "#171717"
    },
    "syntaxString": {
      "dark": "#00CEB9",
      "light": "#008174"
    },
    "syntaxNumber": {
      "dark": "#93E9F6",
      "light": "#007B80"
    },
    "syntaxType": {
      "dark": "#FCD53A",
      "light": "#8A6F00"
    },
    "syntaxOperator": {
      "dark": "#A4A4A4",
      "light": "#4E4E4E"
    },
    "markdownLink": {
      "dark": "#4A7FFF",
      "light": "#034CFF"
    },
    "markdownHeading": {
      "dark": "#EDEDED",
      "light": "#171717"
    },
    "markdownCode": {
      "dark": "#FAB283",
      "light": "#717248"
    },
    "markdownEmph": {
      "dark": "#EDEDED",
      "light": "#171717"
    },
    "markdownStrong": {
      "dark": "#EDEDED",
      "light": "#171717"
    },
    "markdownBlockQuote": {
      "dark": "#A4A4A4",
      "light": "#4E4E4E"
    },
    "markdownHorizontalRule": {
      "dark": "#282828",
      "light": "#DBDBDB"
    },
    "diffAdded": {
      "dark": "#12C905",
      "light": "#12C905"
    },
    "diffRemoved": {
      "dark": "#FC533A",
      "light": "#FC533A"
    },
    "diffAddedBg": {
      "dark": "#445043",
      "light": "#EBF6EA"
    },
    "diffRemovedBg": {
      "dark": "#502A25",
      "light": "#F8E0DD"
    },
    "diffAddedLineNumberBg": {
      "dark": "#445043",
      "light": "#EBF6EA"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#502A25",
      "light": "#F8E0DD"
    }
      }
    };
    const one_dark = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg": "#282c34",
    "darkBgAlt": "#21252b",
    "darkBgPanel": "#353b45",
    "darkFg": "#C6CAD3",
    "darkFgMuted": "#BBBEC3",
    "darkPurple": "#c678dd",
    "darkBlue": "#61afef",
    "darkRed": "#e06c75",
    "darkGreen": "#98c379",
    "darkYellow": "#e5c07b",
    "darkOrange": "#d19a66",
    "darkCyan": "#56b6c2",
    "lightBg": "#fafafa",
    "lightBgAlt": "#f0f0f1",
    "lightBgPanel": "#eaeaeb",
    "lightFg": "#383a42",
    "lightFgMuted": "#a0a1a7",
    "lightPurple": "#a626a4",
    "lightBlue": "#4078f2",
    "lightRed": "#e45649",
    "lightGreen": "#50a14f",
    "lightYellow": "#c18401",
    "lightOrange": "#986801",
    "lightCyan": "#0184bc"
      },
      "theme": {
    "primary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "text": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "textMuted": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "background": {
      "dark": "darkBg",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "backgroundElement": {
      "dark": "darkBgPanel",
      "light": "lightBgPanel"
    },
    "border": {
      "dark": "#393f4a",
      "light": "#d1d1d2"
    },
    "borderActive": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "borderSubtle": {
      "dark": "#2c313a",
      "light": "#e0e0e1"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "diffHunkHeader": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "diffHighlightAdded": {
      "dark": "#aad482",
      "light": "#489447"
    },
    "diffHighlightRemoved": {
      "dark": "#e8828b",
      "light": "#d65145"
    },
    "diffAddedBg": {
      "dark": "#2c382b",
      "light": "#eafbe9"
    },
    "diffRemovedBg": {
      "dark": "#3a2d2f",
      "light": "#fce9e8"
    },
    "diffContextBg": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "diffLineNumber": {
      "dark": "#9398a2",
      "light": "#666666"
    },
    "diffAddedLineNumberBg": {
      "dark": "#283427",
      "light": "#e1f3df"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#36292b",
      "light": "#f5e2e1"
    },
    "markdownText": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownHeading": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "markdownLink": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "markdownListItem": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxComment": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "syntaxKeyword": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "syntaxFunction": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkFg",
      "light": "lightFg"
    }
      }
    };
    const onedarkpro = {
      "defs": {},
      "theme": {
    "background": {
      "dark": "#1E222A",
      "light": "#F5F6F8"
    },
    "backgroundPanel": {
      "dark": "#282C34",
      "light": "#E7E8EB"
    },
    "backgroundElement": {
      "dark": "#32363F",
      "light": "#D9DADE"
    },
    "text": {
      "dark": "#ABB2BF",
      "light": "#2B303B"
    },
    "textMuted": {
      "dark": "#B5B8BD",
      "light": "#404144"
    },
    "primary": {
      "dark": "#61AFEF",
      "light": "#406DC8"
    },
    "secondary": {
      "dark": "#E06C75",
      "light": "#D85462"
    },
    "accent": {
      "dark": "#E06C75",
      "light": "#D85462"
    },
    "error": {
      "dark": "#E06C75",
      "light": "#CF646C"
    },
    "warning": {
      "dark": "#E5C07B",
      "light": "#A97C52"
    },
    "success": {
      "dark": "#98C379",
      "light": "#479461"
    },
    "info": {
      "dark": "#56B6C2",
      "light": "#4C8ABC"
    },
    "border": {
      "dark": "#949BA7",
      "light": "#4B5059"
    },
    "borderActive": {
      "dark": "#7E848F",
      "light": "#6C6F77"
    },
    "syntaxComment": {
      "dark": "#8E939C",
      "light": "#636975"
    },
    "syntaxKeyword": {
      "dark": "#C678DD",
      "light": "#A626A4"
    },
    "syntaxFunction": {
      "dark": "#61AFEF",
      "light": "#3B65BA"
    },
    "syntaxVariable": {
      "dark": "#ABB2BF",
      "light": "#2B303B"
    },
    "syntaxString": {
      "dark": "#98C379",
      "light": "#38744C"
    },
    "syntaxNumber": {
      "dark": "#D19A66",
      "light": "#8D6001"
    },
    "syntaxType": {
      "dark": "#56B6C2",
      "light": "#3C6D94"
    },
    "syntaxOperator": {
      "dark": "#B5B8BD",
      "light": "#404144"
    },
    "markdownLink": {
      "dark": "#E17079",
      "light": "#AF4450"
    },
    "markdownHeading": {
      "dark": "#ABB2BF",
      "light": "#2B303B"
    },
    "markdownCode": {
      "dark": "#61AFEF",
      "light": "#3B65BA"
    },
    "markdownEmph": {
      "dark": "#ABB2BF",
      "light": "#2B303B"
    },
    "markdownStrong": {
      "dark": "#ABB2BF",
      "light": "#2B303B"
    },
    "markdownBlockQuote": {
      "dark": "#B5B8BD",
      "light": "#404144"
    },
    "markdownHorizontalRule": {
      "dark": "#949BA7",
      "light": "#4B5059"
    },
    "diffAdded": {
      "dark": "#98C379",
      "light": "#4FA66D"
    },
    "diffRemoved": {
      "dark": "#E06C75",
      "light": "#E06C75"
    },
    "diffAddedBg": {
      "dark": "#283735",
      "light": "#EEF4F2"
    },
    "diffRemovedBg": {
      "dark": "#3F2D36",
      "light": "#F5EFF1"
    },
    "diffAddedLineNumberBg": {
      "dark": "#283735",
      "light": "#EEF4F2"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3F2D36",
      "light": "#F5EFF1"
    }
      }
    };
    const opencode = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkStep1": "#0a0a0a",
    "darkStep2": "#141414",
    "darkStep3": "#1e1e1e",
    "darkStep4": "#282828",
    "darkStep5": "#323232",
    "darkStep6": "#3c3c3c",
    "darkStep7": "#484848",
    "darkStep8": "#696969",
    "darkStep9": "#fab283",
    "darkStep10": "#ffc09f",
    "darkStep11": "#9F9F9F",
    "darkStep12": "#eeeeee",
    "darkSecondary": "#5c9cf5",
    "darkAccent": "#9d7cd8",
    "darkRed": "#e06c75",
    "darkOrange": "#f5a742",
    "darkGreen": "#7fd88f",
    "darkCyan": "#56b6c2",
    "darkYellow": "#e5c07b",
    "lightStep1": "#ffffff",
    "lightStep2": "#fafafa",
    "lightStep3": "#f5f5f5",
    "lightStep4": "#ebebeb",
    "lightStep5": "#e1e1e1",
    "lightStep6": "#d4d4d4",
    "lightStep7": "#b8b8b8",
    "lightStep8": "#a0a0a0",
    "lightStep9": "#3b7dd8",
    "lightStep10": "#2968c3",
    "lightStep11": "#8a8a8a",
    "lightStep12": "#1a1a1a",
    "lightSecondary": "#7b5bb6",
    "lightAccent": "#d68c27",
    "lightRed": "#d1383d",
    "lightOrange": "#d68c27",
    "lightGreen": "#3d9a57",
    "lightCyan": "#318795",
    "lightYellow": "#b0851f"
      },
      "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "secondary": {
      "dark": "darkSecondary",
      "light": "lightSecondary"
    },
    "accent": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    },
    "backgroundPanel": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "backgroundElement": {
      "dark": "darkStep3",
      "light": "lightStep3"
    },
    "border": {
      "dark": "darkStep7",
      "light": "lightStep7"
    },
    "borderActive": {
      "dark": "darkStep8",
      "light": "lightStep8"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "#4fd6be",
      "light": "#1e725c"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "#b8db87",
      "light": "#4db380"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "#20303b",
      "light": "#d5e5d5"
    },
    "diffRemovedBg": {
      "dark": "#37222c",
      "light": "#f7d8db"
    },
    "diffContextBg": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "diffLineNumber": {
      "dark": "#8f8f8f",
      "light": "#595959"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1b2b34",
      "light": "#c5d5c5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1f26",
      "light": "#e7c8cb"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "markdownLink": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "syntaxFunction": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
      }
    };
    const orng = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkStep1": "#0a0a0a",
    "darkStep2": "#141414",
    "darkStep3": "#1e1e1e",
    "darkStep4": "#282828",
    "darkStep5": "#323232",
    "darkStep6": "#3c3c3c",
    "darkStep7": "#484848",
    "darkStep8": "#606060",
    "darkStep9": "#F07B54",
    "darkStep10": "#EE7948",
    "darkStep11": "#9F9F9F",
    "darkStep12": "#eeeeee",
    "darkSecondary": "#EE7948",
    "darkAccent": "#FFF7F1",
    "darkRed": "#e06c75",
    "darkOrange": "#EC5B2B",
    "darkBlue": "#6ba1e6",
    "darkCyan": "#56b6c2",
    "darkYellow": "#e5c07b",
    "lightStep1": "#ffffff",
    "lightStep2": "#FFF7F1",
    "lightStep3": "#f5f0eb",
    "lightStep4": "#ebebeb",
    "lightStep5": "#e1e1e1",
    "lightStep6": "#d4d4d4",
    "lightStep7": "#b8b8b8",
    "lightStep8": "#a0a0a0",
    "lightStep9": "#EC5B2B",
    "lightStep10": "#c94d24",
    "lightStep11": "#8a8a8a",
    "lightStep12": "#1a1a1a",
    "lightSecondary": "#EE7948",
    "lightAccent": "#c94d24",
    "lightRed": "#d1383d",
    "lightOrange": "#EC5B2B",
    "lightBlue": "#0062d1",
    "lightCyan": "#318795",
    "lightYellow": "#b0851f"
      },
      "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "secondary": {
      "dark": "darkSecondary",
      "light": "lightSecondary"
    },
    "accent": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "selectedListItemText": {
      "dark": "#0a0a0a",
      "light": "#ffffff"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    },
    "backgroundPanel": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "backgroundElement": {
      "dark": "darkStep3",
      "light": "lightStep3"
    },
    "border": {
      "dark": "#EC5B2B",
      "light": "#EC5B2B"
    },
    "borderActive": {
      "dark": "#EE7948",
      "light": "#c94d24"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "#6ba1e6",
      "light": "#0062d1"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "#6ba1e6",
      "light": "#0062d1"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "#1a2a3d",
      "light": "#e0edfa"
    },
    "diffRemovedBg": {
      "dark": "#37222c",
      "light": "#f7d8db"
    },
    "diffContextBg": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "diffLineNumber": {
      "dark": "diffContext",
      "light": "#595755"
    },
    "diffAddedLineNumberBg": {
      "dark": "#162535",
      "light": "#d0e5f5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1f26",
      "light": "#e7c8cb"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "#EC5B2B",
      "light": "#EC5B2B"
    },
    "markdownLink": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownBlockQuote": {
      "dark": "#FFF7F1",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "#EE7948",
      "light": "#EC5B2B"
    },
    "markdownHorizontalRule": {
      "dark": "#EC5B2B",
      "light": "#EC5B2B"
    },
    "markdownListItem": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "#EC5B2B",
      "light": "#EC5B2B"
    },
    "syntaxFunction": {
      "dark": "#EE7948",
      "light": "#c94d24"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxNumber": {
      "dark": "#FFF7F1",
      "light": "#EC5B2B"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
      }
    };
    const osaka_jade = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg0": "#111c18",
    "darkBg1": "#1a2520",
    "darkBg2": "#23372B",
    "darkBg3": "#3d4a44",
    "darkFg0": "#C1C497",
    "darkFg1": "#9aa88a",
    "darkGray": "#ABB6AF",
    "darkRed": "#FF5345",
    "darkGreen": "#549e6a",
    "darkYellow": "#4D9959",
    "darkBlue": "#539677",
    "darkMagenta": "#D2689C",
    "darkCyan": "#2DD5B7",
    "darkWhite": "#F6F5DD",
    "darkRedBright": "#db9f9c",
    "darkGreenBright": "#63b07a",
    "darkYellowBright": "#E5C736",
    "darkBlueBright": "#ACD4CF",
    "darkMagentaBright": "#75bbb3",
    "darkCyanBright": "#8CD3CB",
    "lightBg0": "#F6F5DD",
    "lightBg1": "#E8E7CC",
    "lightBg2": "#D5D4B8",
    "lightBg3": "#A8A78C",
    "lightFg0": "#111c18",
    "lightFg1": "#1a2520",
    "lightGray": "#53685B",
    "lightRed": "#c7392d",
    "lightGreen": "#3d7a52",
    "lightYellow": "#b5a020",
    "lightBlue": "#3d7560",
    "lightMagenta": "#a8527a",
    "lightCyan": "#1faa90"
      },
      "theme": {
    "primary": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "secondary": {
      "dark": "darkMagenta",
      "light": "lightMagenta"
    },
    "accent": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellowBright",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "textMuted": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "background": {
      "dark": "darkBg0",
      "light": "lightBg0"
    },
    "backgroundPanel": {
      "dark": "darkBg1",
      "light": "lightBg1"
    },
    "backgroundElement": {
      "dark": "darkBg2",
      "light": "lightBg2"
    },
    "border": {
      "dark": "darkBg3",
      "light": "lightBg3"
    },
    "borderActive": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "borderSubtle": {
      "dark": "darkBg2",
      "light": "lightBg2"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "diffHunkHeader": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "diffHighlightAdded": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "diffHighlightRemoved": {
      "dark": "darkRedBright",
      "light": "lightRed"
    },
    "diffAddedBg": {
      "dark": "#15241c",
      "light": "#e0eee5"
    },
    "diffRemovedBg": {
      "dark": "#241515",
      "light": "#eee0e0"
    },
    "diffContextBg": {
      "dark": "darkBg1",
      "light": "lightBg1"
    },
    "diffLineNumber": {
      "dark": "#828b87",
      "light": "#5f5e4f"
    },
    "diffAddedLineNumberBg": {
      "dark": "#121f18",
      "light": "#d5e5da"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#1f1212",
      "light": "#e5d5d5"
    },
    "markdownText": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "markdownHeading": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownLink": {
      "dark": "darkCyanBright",
      "light": "lightCyan"
    },
    "markdownLinkText": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownCode": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "markdownEmph": {
      "dark": "darkMagenta",
      "light": "lightMagenta"
    },
    "markdownStrong": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "markdownHorizontalRule": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "markdownListItem": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownListEnumeration": {
      "dark": "darkCyanBright",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkCyanBright",
      "light": "lightCyan"
    },
    "markdownImageText": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownCodeBlock": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "syntaxComment": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "syntaxKeyword": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxFunction": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxVariable": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "syntaxString": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkMagenta",
      "light": "lightMagenta"
    },
    "syntaxType": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxOperator": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxPunctuation": {
      "dark": "darkFg0",
      "light": "lightFg0"
    }
      }
    };
    const palenight = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "background": "#292d3e",
    "backgroundAlt": "#1e2132",
    "backgroundPanel": "#32364a",
    "foreground": "#C1C6DC",
    "foregroundBright": "#bfc7d5",
    "comment": "#B5B9CB",
    "red": "#f07178",
    "orange": "#f78c6c",
    "yellow": "#ffcb6b",
    "green": "#c3e88d",
    "cyan": "#89ddff",
    "blue": "#82aaff",
    "purple": "#c792ea",
    "magenta": "#ff5370",
    "pink": "#f07178"
      },
      "theme": {
    "primary": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "secondary": {
      "dark": "purple",
      "light": "#a854f2"
    },
    "accent": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "error": {
      "dark": "red",
      "light": "#e53935"
    },
    "warning": {
      "dark": "yellow",
      "light": "#ffb300"
    },
    "success": {
      "dark": "green",
      "light": "#91b859"
    },
    "info": {
      "dark": "orange",
      "light": "#f4511e"
    },
    "text": {
      "dark": "foreground",
      "light": "#292d3e"
    },
    "textMuted": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "background": {
      "dark": "#292d3e",
      "light": "#fafafa"
    },
    "backgroundPanel": {
      "dark": "#1e2132",
      "light": "#f5f5f5"
    },
    "backgroundElement": {
      "dark": "#32364a",
      "light": "#e7e7e8"
    },
    "border": {
      "dark": "#32364a",
      "light": "#e0e0e0"
    },
    "borderActive": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "borderSubtle": {
      "dark": "#1e2132",
      "light": "#eeeeee"
    },
    "diffAdded": {
      "dark": "green",
      "light": "#91b859"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "#e53935"
    },
    "diffContext": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "diffHunkHeader": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "diffHighlightAdded": {
      "dark": "green",
      "light": "#91b859"
    },
    "diffHighlightRemoved": {
      "dark": "red",
      "light": "#e53935"
    },
    "diffAddedBg": {
      "dark": "#2e3c2b",
      "light": "#e8f5e9"
    },
    "diffRemovedBg": {
      "dark": "#3c2b2b",
      "light": "#ffebee"
    },
    "diffContextBg": {
      "dark": "#1e2132",
      "light": "#f5f5f5"
    },
    "diffLineNumber": {
      "dark": "#a0a2af",
      "light": "#6a6e70"
    },
    "diffAddedLineNumberBg": {
      "dark": "#2e3c2b",
      "light": "#e8f5e9"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3c2b2b",
      "light": "#ffebee"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#292d3e"
    },
    "markdownHeading": {
      "dark": "purple",
      "light": "#a854f2"
    },
    "markdownLink": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "markdownLinkText": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "markdownCode": {
      "dark": "green",
      "light": "#91b859"
    },
    "markdownBlockQuote": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "#ffb300"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "#f4511e"
    },
    "markdownHorizontalRule": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "markdownListItem": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "markdownImage": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "markdownImageText": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#292d3e"
    },
    "syntaxComment": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "syntaxKeyword": {
      "dark": "purple",
      "light": "#a854f2"
    },
    "syntaxFunction": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#292d3e"
    },
    "syntaxString": {
      "dark": "green",
      "light": "#91b859"
    },
    "syntaxNumber": {
      "dark": "orange",
      "light": "#f4511e"
    },
    "syntaxType": {
      "dark": "yellow",
      "light": "#ffb300"
    },
    "syntaxOperator": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#292d3e"
    }
      }
    };
    const rosepine = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "base": "#191724",
    "surface": "#1f1d2e",
    "overlay": "#26233a",
    "muted": "#A6A4B5",
    "subtle": "#908caa",
    "text": "#e0def4",
    "love": "#eb6f92",
    "gold": "#f6c177",
    "rose": "#ebbcba",
    "pine": "#568DA3",
    "foam": "#9ccfd8",
    "iris": "#c4a7e7",
    "highlightLow": "#21202e",
    "highlightMed": "#403d52",
    "highlightHigh": "#524f67",
    "moonBase": "#232136",
    "moonSurface": "#2a273f",
    "moonOverlay": "#393552",
    "moonMuted": "#6e6a86",
    "moonSubtle": "#908caa",
    "moonText": "#e0def4",
    "dawnBase": "#faf4ed",
    "dawnSurface": "#fffaf3",
    "dawnOverlay": "#f2e9e1",
    "dawnMuted": "#9893a5",
    "dawnSubtle": "#797593",
    "dawnText": "#575279"
      },
      "theme": {
    "primary": {
      "dark": "foam",
      "light": "pine"
    },
    "secondary": {
      "dark": "iris",
      "light": "#907aa9"
    },
    "accent": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "error": {
      "dark": "love",
      "light": "#b4637a"
    },
    "warning": {
      "dark": "gold",
      "light": "#ea9d34"
    },
    "success": {
      "dark": "pine",
      "light": "#286983"
    },
    "info": {
      "dark": "foam",
      "light": "#56949f"
    },
    "text": {
      "dark": "#e0def4",
      "light": "#575279"
    },
    "textMuted": {
      "dark": "muted",
      "light": "dawnMuted"
    },
    "background": {
      "dark": "base",
      "light": "dawnBase"
    },
    "backgroundPanel": {
      "dark": "surface",
      "light": "dawnSurface"
    },
    "backgroundElement": {
      "dark": "overlay",
      "light": "dawnOverlay"
    },
    "border": {
      "dark": "highlightMed",
      "light": "#dfdad9"
    },
    "borderActive": {
      "dark": "foam",
      "light": "pine"
    },
    "borderSubtle": {
      "dark": "highlightLow",
      "light": "#f4ede8"
    },
    "diffAdded": {
      "dark": "pine",
      "light": "#286983"
    },
    "diffRemoved": {
      "dark": "love",
      "light": "#b4637a"
    },
    "diffContext": {
      "dark": "muted",
      "light": "dawnMuted"
    },
    "diffHunkHeader": {
      "dark": "iris",
      "light": "#907aa9"
    },
    "diffHighlightAdded": {
      "dark": "pine",
      "light": "#286983"
    },
    "diffHighlightRemoved": {
      "dark": "love",
      "light": "#b4637a"
    },
    "diffAddedBg": {
      "dark": "#1f2d3a",
      "light": "#e5f2f3"
    },
    "diffRemovedBg": {
      "dark": "#3a1f2d",
      "light": "#fce5e8"
    },
    "diffContextBg": {
      "dark": "surface",
      "light": "dawnSurface"
    },
    "diffLineNumber": {
      "dark": "#9491a6",
      "light": "#6c6875"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1f2d3a",
      "light": "#e5f2f3"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1f2d",
      "light": "#fce5e8"
    },
    "markdownText": {
      "dark": "#e0def4",
      "light": "#575279"
    },
    "markdownHeading": {
      "dark": "iris",
      "light": "#907aa9"
    },
    "markdownLink": {
      "dark": "foam",
      "light": "pine"
    },
    "markdownLinkText": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "markdownCode": {
      "dark": "pine",
      "light": "#286983"
    },
    "markdownBlockQuote": {
      "dark": "muted",
      "light": "dawnMuted"
    },
    "markdownEmph": {
      "dark": "gold",
      "light": "#ea9d34"
    },
    "markdownStrong": {
      "dark": "love",
      "light": "#b4637a"
    },
    "markdownHorizontalRule": {
      "dark": "highlightMed",
      "light": "#dfdad9"
    },
    "markdownListItem": {
      "dark": "foam",
      "light": "pine"
    },
    "markdownListEnumeration": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "markdownImage": {
      "dark": "foam",
      "light": "pine"
    },
    "markdownImageText": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "markdownCodeBlock": {
      "dark": "#e0def4",
      "light": "#575279"
    },
    "syntaxComment": {
      "dark": "muted",
      "light": "dawnMuted"
    },
    "syntaxKeyword": {
      "dark": "pine",
      "light": "#286983"
    },
    "syntaxFunction": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "syntaxVariable": {
      "dark": "#e0def4",
      "light": "#575279"
    },
    "syntaxString": {
      "dark": "gold",
      "light": "#ea9d34"
    },
    "syntaxNumber": {
      "dark": "iris",
      "light": "#907aa9"
    },
    "syntaxType": {
      "dark": "foam",
      "light": "#56949f"
    },
    "syntaxOperator": {
      "dark": "subtle",
      "light": "dawnSubtle"
    },
    "syntaxPunctuation": {
      "dark": "subtle",
      "light": "dawnSubtle"
    }
      }
    };
    const shadesofpurple = {
      "defs": {},
      "theme": {
    "background": {
      "dark": "#1A102B",
      "light": "#F7EBFF"
    },
    "backgroundPanel": {
      "dark": "#29203A",
      "light": "#EADEF3"
    },
    "backgroundElement": {
      "dark": "#392F49",
      "light": "#DDD0E8"
    },
    "text": {
      "dark": "#F5F0FF",
      "light": "#3B2C59"
    },
    "textMuted": {
      "dark": "#B7B3C0",
      "light": "#423B4B"
    },
    "primary": {
      "dark": "#C792FF",
      "light": "#7455EB"
    },
    "secondary": {
      "dark": "#FF7AC6",
      "light": "#CA55A9"
    },
    "accent": {
      "dark": "#FF7AC6",
      "light": "#FF6BD5"
    },
    "error": {
      "dark": "#FF7AC6",
      "light": "#CA55A9"
    },
    "warning": {
      "dark": "#FFD580",
      "light": "#9A7D2D"
    },
    "success": {
      "dark": "#7BE0B0",
      "light": "#2A9268"
    },
    "info": {
      "dark": "#7DD4FF",
      "light": "#408AA6"
    },
    "border": {
      "dark": "#D2CCDD",
      "light": "#594B74"
    },
    "borderActive": {
      "dark": "#AFA8BB",
      "light": "#77698E"
    },
    "syntaxComment": {
      "dark": "#B363FF",
      "light": "#8043CC"
    },
    "syntaxKeyword": {
      "dark": "#FF9D00",
      "light": "#A14E00"
    },
    "syntaxFunction": {
      "dark": "#C792FF",
      "light": "#684CD3"
    },
    "syntaxVariable": {
      "dark": "#F5F0FF",
      "light": "#3B2C59"
    },
    "syntaxString": {
      "dark": "#A5FF90",
      "light": "#277329"
    },
    "syntaxNumber": {
      "dark": "#FF628C",
      "light": "#AD3B5E"
    },
    "syntaxType": {
      "dark": "#FAD000",
      "light": "#7D6100"
    },
    "syntaxOperator": {
      "dark": "#B7B3C0",
      "light": "#423B4B"
    },
    "markdownLink": {
      "dark": "#FF7AC6",
      "light": "#9E4284"
    },
    "markdownHeading": {
      "dark": "#F5F0FF",
      "light": "#3B2C59"
    },
    "markdownCode": {
      "dark": "#C792FF",
      "light": "#684CD3"
    },
    "markdownEmph": {
      "dark": "#F5F0FF",
      "light": "#3B2C59"
    },
    "markdownStrong": {
      "dark": "#F5F0FF",
      "light": "#3B2C59"
    },
    "markdownBlockQuote": {
      "dark": "#B7B3C0",
      "light": "#423B4B"
    },
    "markdownHorizontalRule": {
      "dark": "#D2CCDD",
      "light": "#594B74"
    },
    "diffAdded": {
      "dark": "#7BE0B0",
      "light": "#3DD598"
    },
    "diffRemoved": {
      "dark": "#FF7AC6",
      "light": "#FF6BD5"
    },
    "diffAddedBg": {
      "dark": "#273745",
      "light": "#F0EDFA"
    },
    "diffRemovedBg": {
      "dark": "#442045",
      "light": "#F8E5FD"
    },
    "diffAddedLineNumberBg": {
      "dark": "#273745",
      "light": "#F0EDFA"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#442045",
      "light": "#F8E5FD"
    }
      }
    };
    const solarized = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "base03": "#002b36",
    "base02": "#073642",
    "base01": "#A9B5B8",
    "base00": "#657b83",
    "base0": "#B7C1C2",
    "base1": "#93a1a1",
    "base2": "#eee8d5",
    "base3": "#fdf6e3",
    "yellow": "#BB9315",
    "orange": "#DA815B",
    "red": "#DE3E3B",
    "magenta": "#E174A9",
    "violet": "#6D72C4",
    "blue": "#5FAADE",
    "cyan": "#39A89F",
    "green": "#8FA114"
      },
      "theme": {
    "primary": {
      "dark": "blue",
      "light": "blue"
    },
    "secondary": {
      "dark": "violet",
      "light": "violet"
    },
    "accent": {
      "dark": "cyan",
      "light": "cyan"
    },
    "error": {
      "dark": "red",
      "light": "red"
    },
    "warning": {
      "dark": "yellow",
      "light": "yellow"
    },
    "success": {
      "dark": "green",
      "light": "green"
    },
    "info": {
      "dark": "orange",
      "light": "orange"
    },
    "text": {
      "dark": "base0",
      "light": "base00"
    },
    "textMuted": {
      "dark": "base01",
      "light": "base1"
    },
    "background": {
      "dark": "base03",
      "light": "base3"
    },
    "backgroundPanel": {
      "dark": "base02",
      "light": "base2"
    },
    "backgroundElement": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "border": {
      "dark": "base02",
      "light": "base2"
    },
    "borderActive": {
      "dark": "base01",
      "light": "base1"
    },
    "borderSubtle": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "diffAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffContext": {
      "dark": "base01",
      "light": "base1"
    },
    "diffHunkHeader": {
      "dark": "base01",
      "light": "base1"
    },
    "diffHighlightAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffHighlightRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffAddedBg": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "diffRemovedBg": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "diffContextBg": {
      "dark": "base02",
      "light": "base2"
    },
    "diffLineNumber": {
      "dark": "#8b9b9f",
      "light": "#5f6969"
    },
    "diffAddedLineNumberBg": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "markdownText": {
      "dark": "base0",
      "light": "base00"
    },
    "markdownHeading": {
      "dark": "blue",
      "light": "blue"
    },
    "markdownLink": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownLinkText": {
      "dark": "violet",
      "light": "violet"
    },
    "markdownCode": {
      "dark": "green",
      "light": "green"
    },
    "markdownBlockQuote": {
      "dark": "base01",
      "light": "base1"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "yellow"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "orange"
    },
    "markdownHorizontalRule": {
      "dark": "base01",
      "light": "base1"
    },
    "markdownListItem": {
      "dark": "blue",
      "light": "blue"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownImage": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownImageText": {
      "dark": "violet",
      "light": "violet"
    },
    "markdownCodeBlock": {
      "dark": "base0",
      "light": "base00"
    },
    "syntaxComment": {
      "dark": "base01",
      "light": "base1"
    },
    "syntaxKeyword": {
      "dark": "green",
      "light": "green"
    },
    "syntaxFunction": {
      "dark": "blue",
      "light": "blue"
    },
    "syntaxVariable": {
      "dark": "cyan",
      "light": "cyan"
    },
    "syntaxString": {
      "dark": "cyan",
      "light": "cyan"
    },
    "syntaxNumber": {
      "dark": "magenta",
      "light": "magenta"
    },
    "syntaxType": {
      "dark": "yellow",
      "light": "yellow"
    },
    "syntaxOperator": {
      "dark": "green",
      "light": "green"
    },
    "syntaxPunctuation": {
      "dark": "base0",
      "light": "base00"
    }
      }
    };
    const synthwave84 = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "background": "#262335",
    "backgroundAlt": "#1e1a29",
    "backgroundPanel": "#2a2139",
    "foreground": "#ffffff",
    "foregroundMuted": "#9EA3CB",
    "pink": "#ff7edb",
    "pinkBright": "#ff92df",
    "cyan": "#36f9f6",
    "cyanBright": "#72f1f8",
    "yellow": "#fede5d",
    "yellowBright": "#fff95d",
    "orange": "#ff8b39",
    "orangeBright": "#ff9f43",
    "purple": "#b084eb",
    "purpleBright": "#c792ea",
    "red": "#fe4450",
    "redBright": "#ff5e5b",
    "green": "#72f1b8",
    "greenBright": "#97f1d8"
      },
      "theme": {
    "primary": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "secondary": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "accent": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "error": {
      "dark": "red",
      "light": "#f44336"
    },
    "warning": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "success": {
      "dark": "green",
      "light": "#4caf50"
    },
    "info": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "text": {
      "dark": "foreground",
      "light": "#262335"
    },
    "textMuted": {
      "dark": "foregroundMuted",
      "light": "#5c5c8a"
    },
    "background": {
      "dark": "#262335",
      "light": "#fafafa"
    },
    "backgroundPanel": {
      "dark": "#1e1a29",
      "light": "#f5f5f5"
    },
    "backgroundElement": {
      "dark": "#2a2139",
      "light": "#eeeeee"
    },
    "border": {
      "dark": "#495495",
      "light": "#e0e0e0"
    },
    "borderActive": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "borderSubtle": {
      "dark": "#241b2f",
      "light": "#f0f0f0"
    },
    "diffAdded": {
      "dark": "green",
      "light": "#4caf50"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "#f44336"
    },
    "diffContext": {
      "dark": "foregroundMuted",
      "light": "#5c5c8a"
    },
    "diffHunkHeader": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "diffHighlightAdded": {
      "dark": "greenBright",
      "light": "#4caf50"
    },
    "diffHighlightRemoved": {
      "dark": "redBright",
      "light": "#f44336"
    },
    "diffAddedBg": {
      "dark": "#1a3a2a",
      "light": "#e8f5e9"
    },
    "diffRemovedBg": {
      "dark": "#3a1a2a",
      "light": "#ffebee"
    },
    "diffContextBg": {
      "dark": "#1e1a29",
      "light": "#f5f5f5"
    },
    "diffLineNumber": {
      "dark": "#959bc1",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1a3a2a",
      "light": "#e8f5e9"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1a2a",
      "light": "#ffebee"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#262335"
    },
    "markdownHeading": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "markdownLink": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "markdownLinkText": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "markdownCode": {
      "dark": "green",
      "light": "#4caf50"
    },
    "markdownBlockQuote": {
      "dark": "foregroundMuted",
      "light": "#5c5c8a"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "markdownHorizontalRule": {
      "dark": "#495495",
      "light": "#e0e0e0"
    },
    "markdownListItem": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "markdownListEnumeration": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "markdownImage": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "markdownImageText": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#262335"
    },
    "syntaxComment": {
      "dark": "foregroundMuted",
      "light": "#5c5c8a"
    },
    "syntaxKeyword": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "syntaxFunction": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#262335"
    },
    "syntaxString": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "syntaxNumber": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "syntaxType": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "syntaxOperator": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#262335"
    }
      }
    };
    const tokyonight = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkStep1": "#1a1b26",
    "darkStep2": "#1e2030",
    "darkStep3": "#222436",
    "darkStep4": "#292e42",
    "darkStep5": "#3b4261",
    "darkStep6": "#545c7e",
    "darkStep7": "#737aa2",
    "darkStep8": "#9099b2",
    "darkStep9": "#82aaff",
    "darkStep10": "#89b4fa",
    "darkStep11": "#9CA3C6",
    "darkStep12": "#c8d3f5",
    "darkRed": "#ff757f",
    "darkOrange": "#ff966c",
    "darkYellow": "#ffc777",
    "darkGreen": "#c3e88d",
    "darkCyan": "#86e1fc",
    "darkPurple": "#c099ff",
    "lightStep1": "#e1e2e7",
    "lightStep2": "#d5d6db",
    "lightStep3": "#c8c9ce",
    "lightStep4": "#b9bac1",
    "lightStep5": "#a8aecb",
    "lightStep6": "#9699a8",
    "lightStep7": "#737a8c",
    "lightStep8": "#5a607d",
    "lightStep9": "#2e7de9",
    "lightStep10": "#1a6ce7",
    "lightStep11": "#8990a3",
    "lightStep12": "#3760bf",
    "lightRed": "#f52a65",
    "lightOrange": "#b15c00",
    "lightYellow": "#8c6c3e",
    "lightGreen": "#587539",
    "lightCyan": "#007197",
    "lightPurple": "#9854f1"
      },
      "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "secondary": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    },
    "backgroundPanel": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "backgroundElement": {
      "dark": "darkStep3",
      "light": "lightStep3"
    },
    "border": {
      "dark": "darkStep7",
      "light": "lightStep7"
    },
    "borderActive": {
      "dark": "darkStep8",
      "light": "lightStep8"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "#4fd6be",
      "light": "#1e725c"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "#b8db87",
      "light": "#4db380"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "#20303b",
      "light": "#d5e5d5"
    },
    "diffRemovedBg": {
      "dark": "#37222c",
      "light": "#f7d8db"
    },
    "diffContextBg": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "diffLineNumber": {
      "dark": "#8f909a",
      "light": "#59595b"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1b2b34",
      "light": "#c5d5c5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1f26",
      "light": "#e7c8cb"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "markdownLink": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "syntaxFunction": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
      }
    };
    const vercel = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "background100": "#0A0A0A",
    "background200": "#000000",
    "gray100": "#1A1A1A",
    "gray200": "#1F1F1F",
    "gray300": "#292929",
    "gray400": "#2E2E2E",
    "gray500": "#727272",
    "gray600": "#AAAAAA",
    "gray700": "#8F8F8F",
    "gray900": "#A1A1A1",
    "gray1000": "#EDEDED",
    "blue600": "#0099FF",
    "blue700": "#006AE7",
    "blue900": "#52A8FF",
    "blue1000": "#EBF8FF",
    "red700": "#E5484D",
    "red900": "#FF6166",
    "red1000": "#FDECED",
    "amber700": "#FFB224",
    "amber900": "#F2A700",
    "amber1000": "#FDF4DC",
    "green700": "#46A758",
    "green900": "#63C46D",
    "green1000": "#E6F9E9",
    "teal700": "#12A594",
    "teal900": "#0AC7AC",
    "purple700": "#8E4EC6",
    "purple900": "#BF7AF0",
    "pink700": "#E93D82",
    "pink900": "#F75590",
    "highlightPink": "#FF0080",
    "highlightPurple": "#F81CE5",
    "cyan": "#50E3C2",
    "lightBackground": "#FFFFFF",
    "lightGray100": "#FAFAFA",
    "lightGray200": "#EAEAEA",
    "lightGray600": "#666666",
    "lightGray1000": "#171717"
      },
      "theme": {
    "primary": {
      "dark": "blue700",
      "light": "blue700"
    },
    "secondary": {
      "dark": "blue900",
      "light": "#0062D1"
    },
    "accent": {
      "dark": "purple700",
      "light": "purple700"
    },
    "error": {
      "dark": "red700",
      "light": "#DC3545"
    },
    "warning": {
      "dark": "amber700",
      "light": "#FF9500"
    },
    "success": {
      "dark": "green700",
      "light": "#388E3C"
    },
    "info": {
      "dark": "blue900",
      "light": "blue700"
    },
    "text": {
      "dark": "gray1000",
      "light": "lightGray1000"
    },
    "textMuted": {
      "dark": "gray600",
      "light": "lightGray600"
    },
    "background": {
      "dark": "background200",
      "light": "lightBackground"
    },
    "backgroundPanel": {
      "dark": "gray100",
      "light": "lightGray100"
    },
    "backgroundElement": {
      "dark": "gray300",
      "light": "lightGray200"
    },
    "border": {
      "dark": "gray200",
      "light": "lightGray200"
    },
    "borderActive": {
      "dark": "gray500",
      "light": "#999999"
    },
    "borderSubtle": {
      "dark": "gray100",
      "light": "#EAEAEA"
    },
    "diffAdded": {
      "dark": "green900",
      "light": "green700"
    },
    "diffRemoved": {
      "dark": "red900",
      "light": "red700"
    },
    "diffContext": {
      "dark": "gray600",
      "light": "lightGray600"
    },
    "diffHunkHeader": {
      "dark": "gray600",
      "light": "lightGray600"
    },
    "diffHighlightAdded": {
      "dark": "green900",
      "light": "green700"
    },
    "diffHighlightRemoved": {
      "dark": "red900",
      "light": "red700"
    },
    "diffAddedBg": {
      "dark": "#0B1D0F",
      "light": "#E6F9E9"
    },
    "diffRemovedBg": {
      "dark": "#2A1314",
      "light": "#FDECED"
    },
    "diffContextBg": {
      "dark": "background200",
      "light": "lightBackground"
    },
    "diffLineNumber": {
      "dark": "#8a8a8a",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#0F2613",
      "light": "#D6F5D6"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3C1618",
      "light": "#FFE5E5"
    },
    "markdownText": {
      "dark": "gray1000",
      "light": "lightGray1000"
    },
    "markdownHeading": {
      "dark": "purple900",
      "light": "purple700"
    },
    "markdownLink": {
      "dark": "blue900",
      "light": "blue700"
    },
    "markdownLinkText": {
      "dark": "teal900",
      "light": "teal700"
    },
    "markdownCode": {
      "dark": "green900",
      "light": "green700"
    },
    "markdownBlockQuote": {
      "dark": "gray600",
      "light": "lightGray600"
    },
    "markdownEmph": {
      "dark": "amber900",
      "light": "amber700"
    },
    "markdownStrong": {
      "dark": "pink900",
      "light": "pink700"
    },
    "markdownHorizontalRule": {
      "dark": "gray500",
      "light": "#999999"
    },
    "markdownListItem": {
      "dark": "gray1000",
      "light": "lightGray1000"
    },
    "markdownListEnumeration": {
      "dark": "blue900",
      "light": "blue700"
    },
    "markdownImage": {
      "dark": "teal900",
      "light": "teal700"
    },
    "markdownImageText": {
      "dark": "cyan",
      "light": "teal700"
    },
    "markdownCodeBlock": {
      "dark": "gray1000",
      "light": "lightGray1000"
    },
    "syntaxComment": {
      "dark": "gray600",
      "light": "#888888"
    },
    "syntaxKeyword": {
      "dark": "pink900",
      "light": "pink700"
    },
    "syntaxFunction": {
      "dark": "purple900",
      "light": "purple700"
    },
    "syntaxVariable": {
      "dark": "blue900",
      "light": "blue700"
    },
    "syntaxString": {
      "dark": "green900",
      "light": "green700"
    },
    "syntaxNumber": {
      "dark": "amber900",
      "light": "amber700"
    },
    "syntaxType": {
      "dark": "teal900",
      "light": "teal700"
    },
    "syntaxOperator": {
      "dark": "pink900",
      "light": "pink700"
    },
    "syntaxPunctuation": {
      "dark": "gray1000",
      "light": "lightGray1000"
    }
      }
    };
    const vesper = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "vesperBg": "#101010",
    "vesperFg": "#FFF",
    "vesperComment": "#8b8b8b",
    "vesperKeyword": "#A0A0A0",
    "vesperFunction": "#FFC799",
    "vesperString": "#99FFE4",
    "vesperNumber": "#FFC799",
    "vesperError": "#FF8080",
    "vesperWarning": "#FFC799",
    "vesperSuccess": "#99FFE4",
    "vesperMuted": "#A0A0A0"
      },
      "theme": {
    "primary": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "secondary": {
      "dark": "#99FFE4",
      "light": "#99FFE4"
    },
    "accent": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "error": {
      "dark": "vesperError",
      "light": "vesperError"
    },
    "warning": {
      "dark": "vesperWarning",
      "light": "vesperWarning"
    },
    "success": {
      "dark": "vesperSuccess",
      "light": "vesperSuccess"
    },
    "info": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "text": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "textMuted": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "background": {
      "dark": "vesperBg",
      "light": "#FFF"
    },
    "backgroundPanel": {
      "dark": "vesperBg",
      "light": "#F0F0F0"
    },
    "backgroundElement": {
      "dark": "vesperBg",
      "light": "#E0E0E0"
    },
    "border": {
      "dark": "#282828",
      "light": "#D0D0D0"
    },
    "borderActive": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "borderSubtle": {
      "dark": "#1C1C1C",
      "light": "#E8E8E8"
    },
    "diffAdded": {
      "dark": "vesperSuccess",
      "light": "vesperSuccess"
    },
    "diffRemoved": {
      "dark": "vesperError",
      "light": "vesperError"
    },
    "diffContext": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "diffHunkHeader": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "diffHighlightAdded": {
      "dark": "vesperSuccess",
      "light": "vesperSuccess"
    },
    "diffHighlightRemoved": {
      "dark": "vesperError",
      "light": "vesperError"
    },
    "diffAddedBg": {
      "dark": "#0d2818",
      "light": "#e8f5e8"
    },
    "diffRemovedBg": {
      "dark": "#281a1a",
      "light": "#f5e8e8"
    },
    "diffContextBg": {
      "dark": "vesperBg",
      "light": "#F8F8F8"
    },
    "diffLineNumber": {
      "dark": "textMuted",
      "light": "#6a6a6a"
    },
    "diffAddedLineNumberBg": {
      "dark": "#0d2818",
      "light": "#e8f5e8"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#281a1a",
      "light": "#f5e8e8"
    },
    "markdownText": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownHeading": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "markdownLink": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "markdownLinkText": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "markdownCode": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "markdownBlockQuote": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownEmph": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownStrong": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownHorizontalRule": {
      "dark": "#65737E",
      "light": "#65737E"
    },
    "markdownListItem": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownListEnumeration": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownImage": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "markdownImageText": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "markdownCodeBlock": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "syntaxComment": {
      "dark": "vesperComment",
      "light": "vesperComment"
    },
    "syntaxKeyword": {
      "dark": "vesperKeyword",
      "light": "vesperKeyword"
    },
    "syntaxFunction": {
      "dark": "vesperFunction",
      "light": "vesperFunction"
    },
    "syntaxVariable": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "syntaxString": {
      "dark": "vesperString",
      "light": "vesperString"
    },
    "syntaxNumber": {
      "dark": "vesperNumber",
      "light": "vesperNumber"
    },
    "syntaxType": {
      "dark": "vesperFunction",
      "light": "vesperFunction"
    },
    "syntaxOperator": {
      "dark": "vesperKeyword",
      "light": "vesperKeyword"
    },
    "syntaxPunctuation": {
      "dark": "vesperFg",
      "light": "vesperBg"
    }
      }
    };
    const zenburn = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "bg": "#3F3F3F",
    "bgAlt": "#474747",
    "bgPanel": "#4E4E4E",
    "fg": "#E9E9DE",
    "fgMuted": "#DBDBDB",
    "red": "#D7AAAA",
    "redBright": "#dca3a3",
    "green": "#A4BBA4",
    "greenBright": "#9EBD9E",
    "yellow": "#f0dfaf",
    "yellowDim": "#e0cf9f",
    "blue": "#8cd0d3",
    "blueDim": "#7cb8bb",
    "magenta": "#dc8cc3",
    "cyan": "#93e0e3",
    "orange": "#dfaf8f"
      },
      "theme": {
    "primary": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "secondary": {
      "dark": "magenta",
      "light": "#8f5f8f"
    },
    "accent": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "error": {
      "dark": "red",
      "light": "#8f5f5f"
    },
    "warning": {
      "dark": "yellow",
      "light": "#8f8f5f"
    },
    "success": {
      "dark": "green",
      "light": "#5f8f5f"
    },
    "info": {
      "dark": "orange",
      "light": "#8f7f5f"
    },
    "text": {
      "dark": "fg",
      "light": "#3f3f3f"
    },
    "textMuted": {
      "dark": "fgMuted",
      "light": "#6f6f6f"
    },
    "background": {
      "dark": "bg",
      "light": "#ffffef"
    },
    "backgroundPanel": {
      "dark": "bgAlt",
      "light": "#f5f5e5"
    },
    "backgroundElement": {
      "dark": "bgPanel",
      "light": "#ebebdb"
    },
    "border": {
      "dark": "#5f5f5f",
      "light": "#d0d0c0"
    },
    "borderActive": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "borderSubtle": {
      "dark": "#4f4f4f",
      "light": "#e0e0d0"
    },
    "diffAdded": {
      "dark": "green",
      "light": "#5f8f5f"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "#8f5f5f"
    },
    "diffContext": {
      "dark": "fgMuted",
      "light": "#6f6f6f"
    },
    "diffHunkHeader": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "diffHighlightAdded": {
      "dark": "greenBright",
      "light": "#5f8f5f"
    },
    "diffHighlightRemoved": {
      "dark": "redBright",
      "light": "#8f5f5f"
    },
    "diffAddedBg": {
      "dark": "#4f5f4f",
      "light": "#efffef"
    },
    "diffRemovedBg": {
      "dark": "#5f4f4f",
      "light": "#ffefef"
    },
    "diffContextBg": {
      "dark": "bgAlt",
      "light": "#f5f5e5"
    },
    "diffLineNumber": {
      "dark": "#d2d2d2",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#4f5f4f",
      "light": "#efffef"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#5f4f4f",
      "light": "#ffefef"
    },
    "markdownText": {
      "dark": "fg",
      "light": "#3f3f3f"
    },
    "markdownHeading": {
      "dark": "yellow",
      "light": "#8f8f5f"
    },
    "markdownLink": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "markdownLinkText": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "markdownCode": {
      "dark": "green",
      "light": "#5f8f5f"
    },
    "markdownBlockQuote": {
      "dark": "fgMuted",
      "light": "#6f6f6f"
    },
    "markdownEmph": {
      "dark": "yellowDim",
      "light": "#8f8f5f"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "#8f7f5f"
    },
    "markdownHorizontalRule": {
      "dark": "fgMuted",
      "light": "#6f6f6f"
    },
    "markdownListItem": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "markdownImage": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "markdownImageText": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "markdownCodeBlock": {
      "dark": "fg",
      "light": "#3f3f3f"
    },
    "syntaxComment": {
      "dark": "#A4BBA4",
      "light": "#5f7f5f"
    },
    "syntaxKeyword": {
      "dark": "yellow",
      "light": "#8f8f5f"
    },
    "syntaxFunction": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "syntaxVariable": {
      "dark": "fg",
      "light": "#3f3f3f"
    },
    "syntaxString": {
      "dark": "red",
      "light": "#8f5f5f"
    },
    "syntaxNumber": {
      "dark": "greenBright",
      "light": "#5f8f5f"
    },
    "syntaxType": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "syntaxOperator": {
      "dark": "yellow",
      "light": "#8f8f5f"
    },
    "syntaxPunctuation": {
      "dark": "fg",
      "light": "#3f3f3f"
    }
      }
    };

    const THEMES = {
      "amoled": amoled,
      "aura": aura,
      "ayu": ayu,
      "carbonfox": carbonfox,
      "catppuccin-frappe": catppuccin_frappe,
      "catppuccin-macchiato": catppuccin_macchiato,
      "catppuccin": catppuccin,
      "cobalt2": cobalt2,
      "cursor": cursor,
      "dracula": dracula,
      "everforest": everforest,
      "flexoki": flexoki,
      "github": github,
      "gruvbox": gruvbox,
      "kanagawa": kanagawa,
      "lucent-orng": lucent_orng,
      "material": material,
      "matrix": matrix,
      "mercury": mercury,
      "monokai": monokai,
      "nightowl": nightowl,
      "nord": nord,
      "oc-2": oc_2,
      "one-dark": one_dark,
      "onedarkpro": onedarkpro,
      "opencode": opencode,
      "orng": orng,
      "osaka-jade": osaka_jade,
      "palenight": palenight,
      "rosepine": rosepine,
      "shadesofpurple": shadesofpurple,
      "solarized": solarized,
      "synthwave84": synthwave84,
      "tokyonight": tokyonight,
      "vercel": vercel,
      "vesper": vesper,
      "zenburn": zenburn,
    };

    // —— 25 套 IP 预置（自定义主题的「选基底」来源，不进主列表）——
    const ip_cyberpunk_2077 = {"appearance": "dark", "basePreset": "cyberpunk-2077", "colors": {"background": "#151112", "backgroundElement": "#2C2829", "backgroundPanel": "#231B19", "border": "#625B51", "borderActive": "#FFF847", "bubbleBg": "#2A231D", "codeBlockBg": "#0E0A0B", "codeHeaderBg": "#100B08", "diffAdded": "#91A657", "diffAddedBg": "#14170C", "diffAddedLineNumberBg": "#1D2111", "diffRemoved": "#FF1932", "diffRemovedBg": "#240407", "diffRemovedLineNumberBg": "#36050B", "error": "#FF1932", "info": "#4A96B8", "inputBg": "#261F1B", "markdownBlockQuote": "#89929E", "markdownCode": "#B7D072", "markdownEmph": "#E1BF9A", "markdownHeading": "#E8DF04", "markdownLink": "#84CFEF", "markdownStrong": "#E6D7BA", "primary": "#FBF405", "secondary": "#D51666", "sidebarBg": "#1C1616", "success": "#CDED66", "syntaxComment": "#847C6A", "syntaxFunction": "#B8ECFA", "syntaxKeyword": "#C3B50C", "syntaxNumber": "#AD7B3E", "syntaxOperator": "#7876A5", "syntaxString": "#A2B772", "syntaxType": "#7A9E92", "text": "#C2BFB0", "textMuted": "#A7B4BC", "warning": "#E7A257"}, "id": "cyberpunk-2077", "name": "赛博朋克2077", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_dc_comics = {"appearance":"dark","basePreset":"dc-comics","colors":{"background":"#0C1326","backgroundElement":"#263356","backgroundPanel":"#09203F","border":"#7C7D7F","borderActive":"#D6F0FF","bubbleBg":"#0F437D","codeBlockBg":"#000515","codeHeaderBg":"#122543","diffAdded":"#8BB551","diffAddedBg":"#131B0E","diffAddedLineNumberBg":"#0A0F12","diffRemoved":"#D37B6D","diffRemovedBg":"#221A17","diffRemovedLineNumberBg":"#18100D","error":"#BE4B48","info":"#91C1CF","inputBg":"#192D52","markdownBlockQuote":"#A3BDD6","markdownCode":"#ECD1B4","markdownEmph":"#82BBE8","markdownHeading":"#B8D8ED","markdownLink":"#0392CE","markdownStrong":"#FFFFFF","primary":"#0373B3","secondary":"#E4BA56","sidebarBg":"#0A0F12","success":"#64AB65","syntaxComment":"#717F8A","syntaxFunction":"#008AC9","syntaxKeyword":"#BDA3B0","syntaxNumber":"#E6B189","syntaxOperator":"#7D7875","syntaxString":"#89BF81","syntaxType":"#BEDCDE","text":"#FEFAD4","textMuted":"#BDC0C5","warning":"#C2A595"},"id":"dc-comics","name":"DC","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T12:05:00+08:00"};
    const ip_disney = {"appearance": "light", "basePreset": "disney", "colors": {"background": "#DEEAF1", "backgroundElement": "#C9D6DE", "backgroundPanel": "#CDE2EC", "border": "#9AB4C1", "borderActive": "#876B31", "bubbleBg": "#EEF2F7", "codeBlockBg": "#F4F4F9", "codeHeaderBg": "#D0DBE3", "diffAdded": "#355132", "diffAddedBg": "#DEE9E3", "diffAddedLineNumberBg": "#CADFD0", "diffRemoved": "#872F3A", "diffRemovedBg": "#EDDDE1", "diffRemovedLineNumberBg": "#E3C1C6", "error": "#B12C34", "info": "#1C63A6", "inputBg": "#E5EDF4", "markdownBlockQuote": "#3C5873", "markdownCode": "#7A2137", "markdownEmph": "#7C537F", "markdownHeading": "#301C4A", "markdownLink": "#114586", "markdownStrong": "#240E33", "primary": "#903B5C", "secondary": "#3E7389", "sidebarBg": "#D6E6EF", "success": "#457245", "syntaxComment": "#676890", "syntaxFunction": "#2C597B", "syntaxKeyword": "#6E2645", "syntaxNumber": "#874B36", "syntaxOperator": "#756361", "syntaxString": "#316057", "syntaxType": "#503661", "text": "#071A49", "textMuted": "#31346A", "warning": "#AF543D"}, "id": "disney", "name": "迪士尼", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T10:15:00+08:00"};
    const ip_doraemon = {"appearance": "light", "basePreset": "doraemon", "colors": {"background": "#EFF9FF", "backgroundElement": "#AEE2FE", "backgroundPanel": "#D0EFFF", "border": "#B7DDF4", "borderActive": "#025DA1", "bubbleBg": "#E4F6FF", "codeBlockBg": "#C5EBFF", "codeHeaderBg": "#B9E7FE", "diffAdded": "#36473D", "diffAddedBg": "#E8EFEA", "diffAddedLineNumberBg": "#D7E2DA", "diffRemoved": "#7D141A", "diffRemovedBg": "#FDE4E5", "diffRemovedLineNumberBg": "#FBD1D3", "error": "#6F1319", "info": "#2D61A1", "inputBg": "#FBFDFF", "markdownBlockQuote": "#666666", "markdownCode": "#7B4F42", "markdownEmph": "#843F59", "markdownHeading": "#056D96", "markdownLink": "#063F6B", "markdownStrong": "#0C0C10", "primary": "#135F7B", "secondary": "#9E7F09", "sidebarBg": "#DBF2FF", "success": "#496352", "syntaxComment": "#626262", "syntaxFunction": "#204069", "syntaxKeyword": "#821823", "syntaxNumber": "#5A3B34", "syntaxOperator": "#4B5B62", "syntaxString": "#3E5345", "syntaxType": "#175B7B", "text": "#1A1617", "textMuted": "#202E42", "warning": "#733D18"}, "id": "doraemon", "name": "哆啦A梦", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T11:51:21+08:00"};
    const ip_dragon_ball = {"appearance":"light","basePreset":"dragon-ball","colors":{"background":"#FAF1EA","backgroundElement":"#F0ECE3","backgroundPanel":"#F5E2D1","border":"#A38040","borderActive":"#103347","bubbleBg":"#FFFFFF","codeBlockBg":"#F7DEC0","codeHeaderBg":"#F0C59B","diffAdded":"#0A3325","diffAddedBg":"#D1C3A7","diffAddedLineNumberBg":"#B9B298","diffRemoved":"#330C07","diffRemovedBg":"#D8BCA2","diffRemovedLineNumberBg":"#C4A790","error":"#6B1C21","info":"#266670","inputBg":"#FDFDFD","markdownBlockQuote":"#4E5752","markdownCode":"#6B2800","markdownEmph":"#614834","markdownHeading":"#704010","markdownLink":"#2B4D66","markdownStrong":"#120C0E","primary":"#BD3C03","secondary":"#194E70","sidebarBg":"#EDC89B","success":"#367036","syntaxComment":"#70615C","syntaxFunction":"#664C19","syntaxKeyword":"#42365C","syntaxNumber":"#61435F","syntaxOperator":"#756148","syntaxString":"#612B05","syntaxType":"#335C22","text":"#241913","textMuted":"#573E2A","warning":"#7A4C00"},"id":"dragon-ball","name":"龙珠","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T11:20:00+08:00"};
    const ip_evangelion = {"appearance": "dark", "basePreset": "evangelion", "colors": {"background": "#151419", "backgroundElement": "#1E2B50", "backgroundPanel": "#111B3E", "border": "#382A5F", "borderActive": "#7A91BA", "bubbleBg": "#212558", "codeBlockBg": "#1F1D32", "codeHeaderBg": "#2B334F", "diffAdded": "#AFC755", "diffAddedBg": "#2A2D2A", "diffAddedLineNumberBg": "#212227", "diffRemoved": "#D78A90", "diffRemovedBg": "#2F1D25", "diffRemovedLineNumberBg": "#241A24", "error": "#E3796A", "info": "#7DA0D8", "inputBg": "#141520", "markdownBlockQuote": "#BAC6DC", "markdownCode": "#CAA0B3", "markdownEmph": "#97AD50", "markdownHeading": "#FAAB00", "markdownLink": "#A1CCF6", "markdownStrong": "#FEFEFE", "primary": "#BB96F5", "secondary": "#BEAFCF", "sidebarBg": "#282242", "success": "#DBFD68", "syntaxComment": "#8B8996", "syntaxFunction": "#C2DEF4", "syntaxKeyword": "#B4B3D0", "syntaxNumber": "#F9B219", "syntaxOperator": "#7D90AC", "syntaxString": "#89B872", "syntaxType": "#DEBAC7", "text": "#D5D8DE", "textMuted": "#CEBEBD", "warning": "#B2750A"}, "id": "evangelion", "name": "新世纪福音战士", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T11:00:00+08:00"};
    const ip_evangelion_day = {"appearance": "light", "basePreset": "evangelion-day", "colors": {"background": "#EFF2F7", "backgroundElement": "#E8E8F2", "backgroundPanel": "#FEFEFE", "border": "#87AFE3", "borderActive": "#382A5F", "bubbleBg": "#DDD3F6", "codeBlockBg": "#C9E1F4", "codeHeaderBg": "#A9C3E0", "diffAdded": "#2B4429", "diffAddedBg": "#E5EBDD", "diffAddedLineNumberBg": "#F8FAF9", "diffRemoved": "#4D2638", "diffRemovedBg": "#EDDEDE", "diffRemovedLineNumberBg": "#EACAC6", "error": "#422329", "info": "#0F2242", "inputBg": "#CAD0D8", "markdownBlockQuote": "#4A5164", "markdownCode": "#67575A", "markdownEmph": "#525D38", "markdownHeading": "#5D4523", "markdownLink": "#0044A0", "markdownStrong": "#111B3E", "primary": "#473D94", "secondary": "#3D3660", "sidebarBg": "#CCD5E5", "success": "#344D2C", "syntaxComment": "#2E5891", "syntaxFunction": "#414F63", "syntaxKeyword": "#564A77", "syntaxNumber": "#604C29", "syntaxOperator": "#4F4A9A", "syntaxString": "#243A2E", "syntaxType": "#4F3F47", "text": "#181824", "textMuted": "#282A45", "warning": "#785614"}, "id": "evangelion-day", "name": "新世纪福音战士·晴空", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_genshin = {"appearance":"light","basePreset":"genshin","colors":{"background":"#F4E9D4","backgroundElement":"#EEDCBC","backgroundPanel":"#E9DEC3","border":"#DCCEB2","borderActive":"#8F6F55","bubbleBg":"#F5E2D7","codeBlockBg":"#F3ECE0","codeHeaderBg":"#E5CFAC","diffAdded":"#45554D","diffAddedBg":"#E9DDC1","diffAddedLineNumberBg":"#D0CEB4","diffRemoved":"#9F3721","diffRemovedBg":"#EFD9BC","diffRemovedLineNumberBg":"#EAC9AC","error":"#92331F","info":"#4E658C","inputBg":"#F5F3EF","markdownBlockQuote":"#664F45","markdownCode":"#65463B","markdownEmph":"#526157","markdownHeading":"#2E375A","markdownLink":"#435982","markdownStrong":"#442920","primary":"#2A3B6B","secondary":"#9A7855","sidebarBg":"#D7C19E","success":"#49655A","syntaxComment":"#73594B","syntaxFunction":"#51554D","syntaxKeyword":"#2E345E","syntaxNumber":"#6B513C","syntaxOperator":"#595745","syntaxString":"#514D6E","syntaxType":"#394E7A","text":"#402C27","textMuted":"#553E38","warning":"#7F6247"},"id":"genshin","name":"原神","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T10:42:22+08:00"};
    const ip_genshin_night = {"appearance":"dark","basePreset":"genshin-night","colors":{"background":"#432E27","backgroundElement":"#3B3533","backgroundPanel":"#352427","border":"#7A6C5C","borderActive":"#E2C49D","bubbleBg":"#3F3F3A","codeBlockBg":"#2F1F29","codeHeaderBg":"#473733","diffAdded":"#7D9D8B","diffAddedBg":"#2E2E2A","diffAddedLineNumberBg":"#333632","diffRemoved":"#D28B7C","diffRemovedBg":"#302C28","diffRemovedLineNumberBg":"#442824","error":"#CE8070","info":"#9FC0CF","inputBg":"#2E2B28","markdownBlockQuote":"#B8AD93","markdownCode":"#B69571","markdownEmph":"#77A398","markdownHeading":"#B1CEE0","markdownLink":"#93B4C8","markdownStrong":"#E8DCC1","primary":"#8EA793","secondary":"#DCB581","sidebarBg":"#392D27","success":"#6D9689","syntaxComment":"#998776","syntaxFunction":"#85B0A6","syntaxKeyword":"#BAD8E3","syntaxNumber":"#DDBD8E","syntaxOperator":"#948C76","syntaxString":"#8490C3","syntaxType":"#93A4CB","text":"#F5E5D0","textMuted":"#C6BBA1","warning":"#DDAA77"},"id":"genshin-night","name":"原神·夜航","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_harry_potter = {"appearance": "dark", "basePreset": "harry-potter", "colors": {"background": "#0B223B", "backgroundElement": "#16374F", "backgroundPanel": "#102A45", "border": "#415366", "borderActive": "#FCDB8C", "bubbleBg": "#133250", "codeBlockBg": "#050F1A", "codeHeaderBg": "#1B3F5E", "diffAdded": "#A9CCC0", "diffAddedBg": "#233E50", "diffAddedLineNumberBg": "#395762", "diffRemoved": "#D9A1A3", "diffRemovedBg": "#2C3045", "diffRemovedLineNumberBg": "#4A3C4E", "error": "#E05A55", "info": "#3DD3FF", "inputBg": "#0D2740", "markdownBlockQuote": "#939CA5", "markdownCode": "#E0BE5C", "markdownEmph": "#C5B3C4", "markdownHeading": "#FFDAB5", "markdownLink": "#8BDBFE", "markdownStrong": "#FEFEFE", "primary": "#CAA654", "secondary": "#C56F72", "sidebarBg": "#071523", "success": "#91BEAE", "syntaxComment": "#80807E", "syntaxFunction": "#2E9FD0", "syntaxKeyword": "#AC93AA", "syntaxNumber": "#BB8964", "syntaxOperator": "#73818E", "syntaxString": "#599CB6", "syntaxType": "#79C7D2", "text": "#EEEEEC", "textMuted": "#BABAB8", "warning": "#D4A681"}, "id": "harry-potter", "name": "哈利波特", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T10:20:00+08:00"};
    const ip_hello_kitty = {"appearance": "light", "basePreset": "hello-kitty", "colors": {"background": "#FFFFFF", "backgroundElement": "#FAD8E3", "backgroundPanel": "#FBE6EF", "border": "#F4B4D0", "borderActive": "#C8152D", "bubbleBg": "#EE86A7", "codeBlockBg": "#FFFFFF", "codeHeaderBg": "#F4B4D0", "diffAdded": "#1E452E", "diffAddedBg": "#DEF4EA", "diffAddedLineNumberBg": "#CBEDDE", "diffRemoved": "#9F1627", "diffRemovedBg": "#F8CEDD", "diffRemovedLineNumberBg": "#F4B4D0", "error": "#B00C3F", "info": "#4F86C5", "inputBg": "#FBE6EF", "markdownBlockQuote": "#565656", "markdownCode": "#7F5D3B", "markdownEmph": "#596E72", "markdownHeading": "#9D274C", "markdownLink": "#2663AE", "markdownStrong": "#000000", "primary": "#C8152D", "secondary": "#0E52A5", "sidebarBg": "#EEA9BC", "success": "#1B6A42", "syntaxComment": "#737378", "syntaxFunction": "#446A99", "syntaxKeyword": "#D12E63", "syntaxNumber": "#705235", "syntaxOperator": "#966E45", "syntaxString": "#1A7548", "syntaxType": "#14417A", "text": "#231815", "textMuted": "#40404A", "warning": "#91720D"}, "id": "hello-kitty", "name": "HelloKitty", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_kuromi = {"appearance": "light", "basePreset": "kuromi", "colors": {"background": "#F4ECFA", "backgroundElement": "#E2D2EE", "backgroundPanel": "#ECE0F5", "border": "#DCCAE9", "borderActive": "#8D6AAE", "bubbleBg": "#FBDFED", "codeBlockBg": "#FBF7FD", "codeHeaderBg": "#EEE2F5", "diffAdded": "#1B7150", "diffAddedBg": "#E1F3E9", "diffAddedLineNumberBg": "#CCEBD9", "diffRemoved": "#a31638", "diffRemovedBg": "#FBE4EC", "diffRemovedLineNumberBg": "#F5D1DE", "error": "#A81B38", "info": "#4A52B4", "inputBg": "#FCF9FE", "markdownBlockQuote": "#775B84", "markdownCode": "#8E2A62", "markdownEmph": "#A63D70", "markdownHeading": "#552A6B", "markdownLink": "#7441A8", "markdownStrong": "#1B1123", "primary": "#BD3064", "secondary": "#a84ab2", "sidebarBg": "#EBDEF4", "success": "#256B57", "syntaxComment": "#736379", "syntaxFunction": "#6E49A8", "syntaxKeyword": "#ad386b", "syntaxNumber": "#96521A", "syntaxOperator": "#7C5F90", "syntaxString": "#2c6f5d", "syntaxType": "#4A5AA8", "text": "#241A2C", "textMuted": "#45384d", "warning": "#7E5610"}, "id": "kuromi", "name": "库洛米", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-19T23:05:00+08:00"};
    const ip_lego = {"appearance": "light", "basePreset": "lego", "colors": {"background": "#edeef0", "backgroundElement": "#d7d8dc", "backgroundPanel": "#f6f6f7", "border": "#c9cacf", "borderActive": "#a80d0f", "bubbleBg": "#ffffff", "codeBlockBg": "#e3e5e9", "codeHeaderBg": "#d9dce2", "diffAdded": "#1b6c2d", "diffAddedBg": "#d9f2e3", "diffAddedLineNumberBg": "#c4e9d3", "diffRemoved": "#9b194c", "diffRemovedBg": "#f9dfe7", "diffRemovedLineNumberBg": "#f0c3d3", "error": "#a01a4e", "info": "#087080", "inputBg": "#fbfbfc", "markdownBlockQuote": "#686b71", "markdownCode": "#6d28d9", "markdownEmph": "#5a5e64", "markdownHeading": "#2e3238", "markdownLink": "#0055bf", "markdownStrong": "#141416", "primary": "#d01012", "secondary": "#ae8000", "sidebarBg": "#e2e3e7", "success": "#1e7e34", "syntaxComment": "#5c6065", "syntaxFunction": "#6d581a", "syntaxKeyword": "#7f4389", "syntaxNumber": "#4d5f1e", "syntaxOperator": "#625e56", "syntaxString": "#356239", "syntaxType": "#2c5c90", "text": "#1a1a1b", "textMuted": "#383a3d", "warning": "#b34700"}, "id": "lego", "name": "乐高", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-19T23:05:00+08:00"};
    const ip_mario = {"appearance": "light", "basePreset": "mario", "colors": {"background": "#F5F9FF", "backgroundElement": "#EAF2FF", "backgroundPanel": "#EFF5FF", "border": "#C7DBFF", "borderActive": "#4E7BCE", "bubbleBg": "#E5EFFF", "codeBlockBg": "#F8FAFF", "codeHeaderBg": "#EDF3FF", "diffAdded": "#134407", "diffAddedBg": "#E6F6E6", "diffAddedLineNumberBg": "#BDE9BD", "diffRemoved": "#AB4108", "diffRemovedBg": "#FBEFE9", "diffRemovedLineNumberBg": "#F5DACB", "error": "#94210D", "info": "#486EB6", "inputBg": "#FAFCFF", "markdownBlockQuote": "#7E5A52", "markdownCode": "#584036", "markdownEmph": "#903809", "markdownHeading": "#173D7D", "markdownLink": "#B6260E", "markdownStrong": "#000000", "primary": "#C7280E", "secondary": "#0C4BAA", "sidebarBg": "#F2F7FF", "success": "#0D6305", "syntaxComment": "#7A726E", "syntaxFunction": "#335687", "syntaxKeyword": "#A8240D", "syntaxNumber": "#8E5522", "syntaxOperator": "#736B67", "syntaxString": "#7E370B", "syntaxType": "#50720D", "text": "#1D100A", "textMuted": "#4F4540", "warning": "#6F5803"}, "id": "mario", "name": "超级马里奥", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T10:30:00+08:00"};
    const ip_mario_night = {"appearance": "dark", "basePreset": "mario-night", "colors": {"background": "#060A12", "backgroundElement": "#0E1829", "backgroundPanel": "#0B121F", "border": "#40302D", "borderActive": "#5A96FF", "bubbleBg": "#0C1421", "codeBlockBg": "#04060A", "codeHeaderBg": "#05080E", "diffAdded": "#00AA00", "diffAddedBg": "#001A00", "diffAddedLineNumberBg": "#002500", "diffRemoved": "#E2421F", "diffRemovedBg": "#210600", "diffRemovedLineNumberBg": "#310900", "error": "#F7470E", "info": "#3F69B2", "inputBg": "#080E17", "markdownBlockQuote": "#B69892", "markdownCode": "#B89179", "markdownEmph": "#F7DC66", "markdownHeading": "#B5D0FF", "markdownLink": "#63A7F2", "markdownStrong": "#FFEFEC", "primary": "#C32300", "secondary": "#4284DA", "sidebarBg": "#090F1A", "success": "#84D310", "syntaxComment": "#A37A74", "syntaxFunction": "#529DF0", "syntaxKeyword": "#F34525", "syntaxNumber": "#FF9A39", "syntaxOperator": "#99726D", "syntaxString": "#AFE264", "syntaxType": "#F3CD24", "text": "#FFE2DE", "textMuted": "#C7948D", "warning": "#B69A1B"}, "id": "mario-night", "name": "超级马里奥·夜行", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_marvel = {"appearance":"dark","basePreset":"marvel","colors":{"background":"#0C0C10","backgroundElement":"#2D2D32","backgroundPanel":"#252529","border":"#40404A","borderActive":"#F11E22","bubbleBg":"#1C1C22","codeBlockBg":"#000000","codeHeaderBg":"#333337","diffAdded":"#40947D","diffAddedBg":"#171D14","diffAddedLineNumberBg":"#0D0D0F","diffRemoved":"#F56568","diffRemovedBg":"#4E1C26","diffRemovedLineNumberBg":"#331310","error":"#F77B7E","info":"#81B0DE","inputBg":"#18181C","markdownBlockQuote":"#B4B29F","markdownCode":"#C8AB7C","markdownEmph":"#F9A7A9","markdownHeading":"#F7E4AB","markdownLink":"#D4C794","markdownStrong":"#FFFFFF","primary":"#D32B28","secondary":"#EAC38D","sidebarBg":"#121216","success":"#62B59C","syntaxComment":"#7A7A7F","syntaxFunction":"#E4A05A","syntaxKeyword":"#F44A4D","syntaxNumber":"#A0A2AC","syntaxOperator":"#9D7A72","syntaxString":"#F0E5D8","syntaxType":"#FFCB05","text":"#EEEEF4","textMuted":"#BDBDC3","warning":"#DB7930"},"id":"marvel","name":"漫威","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T11:58:35+08:00"};
    const ip_naruto = {"appearance":"light","basePreset":"naruto","colors":{"background":"#F7F5EF","backgroundElement":"#E0D9C7","backgroundPanel":"#F0EDE8","border":"#C1C2C7","borderActive":"#1C578C","bubbleBg":"#FFDBDD","codeBlockBg":"#EBE6D6","codeHeaderBg":"#D0C5A7","diffAdded":"#134C3A","diffAddedBg":"#CFDFD8","diffAddedLineNumberBg":"#DDF8EC","diffRemoved":"#7D263A","diffRemovedBg":"#E2CDCE","diffRemovedLineNumberBg":"#FEEFF0","error":"#AB475A","info":"#407AA8","inputBg":"#FDFBF7","markdownBlockQuote":"#666B5F","markdownCode":"#7C3D18","markdownEmph":"#975A60","markdownHeading":"#203E74","markdownLink":"#0869A8","markdownStrong":"#171923","primary":"#A0542D","secondary":"#364364","sidebarBg":"#C4C0B4","success":"#477C68","syntaxComment":"#5A6A54","syntaxFunction":"#48609A","syntaxKeyword":"#823B29","syntaxNumber":"#5A5A03","syntaxOperator":"#66676D","syntaxString":"#335A4A","syntaxType":"#44668D","text":"#2B2D39","textMuted":"#3B3F4F","warning":"#6C6A25"},"id":"naruto","name":"火影忍者","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_naruto_night = {"appearance":"dark","basePreset":"naruto-night","colors":{"background":"#0A0E18","backgroundElement":"#232C3D","backgroundPanel":"#1E2334","border":"#38393F","borderActive":"#7CA3D6","bubbleBg":"#3A3746","codeBlockBg":"#121319","codeHeaderBg":"#27324F","diffAdded":"#ADE3CD","diffAddedBg":"#1D2D26","diffAddedLineNumberBg":"#294036","diffRemoved":"#EB929E","diffRemovedBg":"#352023","diffRemovedLineNumberBg":"#4D393A","error":"#D76979","info":"#7C8CA7","inputBg":"#1C1C2B","markdownBlockQuote":"#9A9BA2","markdownCode":"#E5A88C","markdownEmph":"#EDAAAF","markdownHeading":"#F0DC94","markdownLink":"#97B8E9","markdownStrong":"#FBFCFF","primary":"#EF9568","secondary":"#5C6D91","sidebarBg":"#181920","success":"#83A294","syntaxComment":"#82887D","syntaxFunction":"#8E9ED8","syntaxKeyword":"#F39984","syntaxNumber":"#C9C474","syntaxOperator":"#86868B","syntaxString":"#B2D3C6","syntaxType":"#6F8DBC","text":"#E7E8EC","textMuted":"#B1B3BC","warning":"#E2C377"},"id":"naruto-night","name":"火影忍者·暗部","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_one_piece = {"appearance":"light","basePreset":"one-piece","colors":{"background":"#E3F3FB","backgroundElement":"#9FD6F9","backgroundPanel":"#CEEBFA","border":"#C1E5FA","borderActive":"#866830","bubbleBg":"#E6F3FC","codeBlockBg":"#B4DFF9","codeHeaderBg":"#95D2F9","diffAdded":"#315847","diffAddedBg":"#EDF0B3","diffAddedLineNumberBg":"#DBE9BF","diffRemoved":"#51192D","diffRemovedBg":"#E6E1EB","diffRemovedLineNumberBg":"#E5D7E1","error":"#930B19","info":"#1B638A","inputBg":"#F2F6F9","markdownBlockQuote":"#2B5E90","markdownCode":"#105067","markdownEmph":"#703E22","markdownHeading":"#B21C2B","markdownLink":"#144DA5","markdownStrong":"#171D2E","primary":"#C32635","secondary":"#91774D","sidebarBg":"#C3E6FA","success":"#3B674E","syntaxComment":"#3C617F","syntaxFunction":"#6C5733","syntaxKeyword":"#A41523","syntaxNumber":"#553323","syntaxOperator":"#6A5B4C","syntaxString":"#284A41","syntaxType":"#164589","text":"#0F284B","textMuted":"#15355E","warning":"#934D20"},"id":"one-piece","name":"海贼王","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T10:45:00+08:00"};
    const ip_pokemon = {"appearance": "dark", "basePreset": "pokemon", "colors": {"background": "#1C1C22", "backgroundElement": "#48484D", "backgroundPanel": "#37373B", "border": "#40404A", "borderActive": "#FEED79", "bubbleBg": "#28282D", "codeBlockBg": "#0C0C10", "codeHeaderBg": "#58585A", "diffAdded": "#7FC9AE", "diffAddedBg": "#0A2828", "diffAddedLineNumberBg": "#191917", "diffRemoved": "#FE4C1C", "diffRemovedBg": "#0C0406", "diffRemovedLineNumberBg": "#141000", "error": "#F93D32", "info": "#289BCA", "inputBg": "#000000", "markdownBlockQuote": "#BDBDC3", "markdownCode": "#FDE7B5", "markdownEmph": "#F9B584", "markdownHeading": "#E3C371", "markdownLink": "#95C7F8", "markdownStrong": "#FFFFFF", "primary": "#FFCB05", "secondary": "#799DFE", "sidebarBg": "#060606", "success": "#7AA85D", "syntaxComment": "#85858A", "syntaxFunction": "#6E9BBC", "syntaxKeyword": "#C790A3", "syntaxNumber": "#C5A863", "syntaxOperator": "#7A7A7F", "syntaxString": "#80CAAF", "syntaxType": "#658F8B", "text": "#EEEEF4", "textMuted": "#D3D3D8", "warning": "#FB8603"}, "id": "pokemon", "name": "宝可梦", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T12:20:00+08:00"};
    const ip_sailor_moon = {"appearance": "light", "basePreset": "sailor-moon", "colors": {"background": "#ffeef5", "backgroundElement": "#fed1e5", "backgroundPanel": "#fed7e9", "border": "#ffe2ef", "borderActive": "#8b1b50", "bubbleBg": "#fff6fa", "codeBlockBg": "#ffe1ee", "codeHeaderBg": "#fedaea", "diffAdded": "#004144", "diffAddedBg": "#8dbabe", "diffAddedLineNumberBg": "#9cc3c6", "diffRemoved": "#78000c", "diffRemovedBg": "#f9cbcf", "diffRemovedLineNumberBg": "#fad3d6", "error": "#aa171f", "info": "#1659a7", "inputBg": "#ffe9f3", "markdownBlockQuote": "#5b4e76", "markdownCode": "#102e80", "markdownEmph": "#74284f", "markdownHeading": "#2e52a6", "markdownLink": "#2449ef", "markdownStrong": "#020a25", "primary": "#c51e56", "secondary": "#133284", "sidebarBg": "#ffdeed", "success": "#006d72", "syntaxComment": "#516384", "syntaxFunction": "#1830d8", "syntaxKeyword": "#9b003e", "syntaxNumber": "#6f4a00", "syntaxOperator": "#625477", "syntaxString": "#375d39", "syntaxType": "#025a7b", "text": "#041541", "textMuted": "#2e4066", "warning": "#845a00"}, "id": "sailor-moon", "name": "美少女战士", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T10:45:00+08:00"};
    const ip_star_wars = {"appearance": "dark", "basePreset": "star-wars", "colors": {"background": "#0F0814", "backgroundElement": "#2E2235", "backgroundPanel": "#211627", "border": "#41304B", "borderActive": "#7AD2FF", "bubbleBg": "#36293D", "codeBlockBg": "#0A050D", "codeHeaderBg": "#1A1020", "diffAdded": "#7DD2B5", "diffAddedBg": "#102822", "diffAddedLineNumberBg": "#183A31", "diffRemoved": "#D65166", "diffRemovedBg": "#2A0B11", "diffRemovedLineNumberBg": "#400709", "error": "#EB3D48", "info": "#97A5FE", "inputBg": "#271C2E", "markdownBlockQuote": "#7986C4", "markdownCode": "#FAEAD3", "markdownEmph": "#D17380", "markdownHeading": "#FCE39F", "markdownLink": "#78C1E9", "markdownStrong": "#F5FAFB", "primary": "#CD1E28", "secondary": "#30B4EC", "sidebarBg": "#150C1A", "success": "#6EC3AE", "syntaxComment": "#827893", "syntaxFunction": "#A5E0FF", "syntaxKeyword": "#CBA8EC", "syntaxNumber": "#D09A06", "syntaxOperator": "#7C738F", "syntaxString": "#8ADCD0", "syntaxType": "#D09A90", "text": "#E8E3DB", "textMuted": "#9DA7D2", "warning": "#E28950"}, "id": "star-wars", "name": "星球大战", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T10:30:00+08:00"};
    const ip_transformers = {"appearance": "dark", "basePreset": "transformers", "colors": {"background": "#08122B", "backgroundElement": "#0D2354", "backgroundPanel": "#04133A", "border": "#4D5A60", "borderActive": "#F4C803", "bubbleBg": "#241340", "codeBlockBg": "#020B1C", "codeHeaderBg": "#0A2250", "diffAdded": "#8F8C7D", "diffAddedBg": "#182135", "diffAddedLineNumberBg": "#232A3B", "diffRemoved": "#BC9D80", "diffRemovedBg": "#1E2335", "diffRemovedLineNumberBg": "#30313E", "error": "#FF5B02", "info": "#0A6999", "inputBg": "#022447", "markdownBlockQuote": "#907E68", "markdownCode": "#AD7FB0", "markdownEmph": "#FB9A7A", "markdownHeading": "#FBF377", "markdownLink": "#0B8FBF", "markdownStrong": "#FFFFFF", "primary": "#D70A2B", "secondary": "#3366A8", "sidebarBg": "#021128", "success": "#A7ABAA", "syntaxComment": "#767C72", "syntaxFunction": "#E1AA00", "syntaxKeyword": "#FF0044", "syntaxNumber": "#D9B9A0", "syntaxOperator": "#727A85", "syntaxString": "#8E979C", "syntaxType": "#F68C8E", "text": "#CFE2E8", "textMuted": "#BDC1C2", "warning": "#B07400"}, "id": "transformers", "name": "变形金刚", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T12:37:23+08:00"};
    const ip_ultraman = {"appearance": "dark", "basePreset": "ultraman", "colors": {"background": "#000600", "backgroundElement": "#161945", "backgroundPanel": "#14163C", "border": "#2F3D6A", "borderActive": "#87C3F5", "bubbleBg": "#111433", "codeBlockBg": "#060B11", "codeHeaderBg": "#191C4E", "diffAdded": "#3C9B6F", "diffAddedBg": "#08190E", "diffAddedLineNumberBg": "#0C2416", "diffRemoved": "#C9667B", "diffRemovedBg": "#1A1210", "diffRemovedLineNumberBg": "#281919", "error": "#F05F4E", "info": "#2AA1B7", "inputBg": "#0E112A", "markdownBlockQuote": "#91B2B7", "markdownCode": "#D0B26C", "markdownEmph": "#B6A8CB", "markdownHeading": "#C0ECFF", "markdownLink": "#51AEB5", "markdownStrong": "#F8FBE6", "primary": "#D52518", "secondary": "#EFCB5D", "sidebarBg": "#0A0F1F", "success": "#2F9877", "syntaxComment": "#747D86", "syntaxFunction": "#3A80FA", "syntaxKeyword": "#D95638", "syntaxNumber": "#F4C738", "syntaxOperator": "#8774A2", "syntaxString": "#67CDA6", "syntaxType": "#8CCDE9", "text": "#DEEFF6", "textMuted": "#AFB9BB", "warning": "#BD8E36"}, "id": "ultraman", "name": "奥特曼", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T12:51:03+08:00"};
    const ip_zelda = {"appearance":"light","basePreset":"zelda","colors":{"background":"#FAF8EF","backgroundElement":"#DCF7AA","backgroundPanel":"#EEEEE0","border":"#B7C9AF","borderActive":"#267593","bubbleBg":"#FDFCF3","codeBlockBg":"#F7F4EB","codeHeaderBg":"#D4ECAB","diffAdded":"#3B610C","diffAddedBg":"#DFE9CF","diffAddedLineNumberBg":"#D3E2C0","diffRemoved":"#7B4129","diffRemovedBg":"#F0E1D9","diffRemovedLineNumberBg":"#EBDACB","error":"#9E5D4B","info":"#617488","inputBg":"#FEFEF5","markdownBlockQuote":"#47614E","markdownCode":"#26645D","markdownEmph":"#5E5C16","markdownHeading":"#28444A","markdownLink":"#225B73","markdownStrong":"#142D14","primary":"#204A5D","secondary":"#827717","sidebarBg":"#F5F2E9","success":"#466E12","syntaxComment":"#5D6E60","syntaxFunction":"#484915","syntaxKeyword":"#163817","syntaxNumber":"#56271A","syntaxOperator":"#556966","syntaxString":"#235D56","syntaxType":"#455A68","text":"#1E371D","textMuted":"#2E4832","warning":"#77370C"},"id":"zelda","name":"塞尔达传说","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T10:30:00+08:00"};

    const IP_PRESETS = {
      "cyberpunk-2077": ip_cyberpunk_2077,
      "dc-comics": ip_dc_comics,
      "disney": ip_disney,
      "doraemon": ip_doraemon,
      "dragon-ball": ip_dragon_ball,
      "evangelion": ip_evangelion,
      "evangelion-day": ip_evangelion_day,
      "genshin": ip_genshin,
      "genshin-night": ip_genshin_night,
      "harry-potter": ip_harry_potter,
      "hello-kitty": ip_hello_kitty,
      "kuromi": ip_kuromi,
      "lego": ip_lego,
      "mario": ip_mario,
      "mario-night": ip_mario_night,
      "marvel": ip_marvel,
      "naruto": ip_naruto,
      "naruto-night": ip_naruto_night,
      "one-piece": ip_one_piece,
      "pokemon": ip_pokemon,
      "sailor-moon": ip_sailor_moon,
      "star-wars": ip_star_wars,
      "transformers": ip_transformers,
      "ultraman": ip_ultraman,
      "zelda": ip_zelda,
    };

    // —— 主题名：中文优先，缺则英文官方名，再缺则 id ——
    const THEME_ZH = {
    opencode: "opencode", tokyonight: "东京之夜", dracula: "德古拉", gruvbox: "Gruvbox",
    matrix: "黑客帝国", rosepine: "玫瑰松林", catppuccin: "卡布奇诺", "catppuccin-frappe": "卡布奇诺·冰沙",
    "catppuccin-macchiato": "卡布奇诺·玛奇朵", solarized: "Solarized", synthwave84: "合成波 84",
    everforest: "常青森林", nord: "北极", kanagawa: "神奈川", nightowl: "夜猫子",
    "one-dark": "One Dark", monokai: "Monokai", palenight: "苍白之夜", material: "材料设计",
    ayu: "Ayu", carbonfox: "碳狐", cobalt2: "钴蓝", cursor: "Cursor", aura: "光环",
    flexoki: "Flexoki", github: "GitHub", zenburn: "禅燃", mercury: "水星",
    "osaka-jade": "大阪翡翠", vesper: "黄昏星", vercel: "Vercel", "lucent-orng": "透光橙",
    orng: "纯橙", amoled: "AMOLED", "oc-2": "OC 2", onedarkpro: "One Dark Pro",
    shadesofpurple: "紫影", system: "跟随系统",
    };
    const THEME_EN = {
    opencode: "opencode", tokyonight: "Tokyo Night", dracula: "Dracula", gruvbox: "Gruvbox",
    matrix: "Matrix", rosepine: "Rosé Pine", catppuccin: "Catppuccin", "catppuccin-frappe": "Catppuccin Frappe",
    "catppuccin-macchiato": "Catppuccin Macchiato", solarized: "Solarized", synthwave84: "SynthWave '84",
    everforest: "Everforest", nord: "Nord", kanagawa: "Kanagawa", nightowl: "Night Owl",
    "one-dark": "One Dark", monokai: "Monokai", palenight: "Palenight", material: "Material",
    ayu: "Ayu", carbonfox: "CarbonFox", cobalt2: "Cobalt2", cursor: "Cursor", aura: "Aura",
    flexoki: "Flexoki", github: "GitHub", zenburn: "Zenburn", mercury: "Mercury",
    "osaka-jade": "Osaka Jade", vesper: "Vesper", vercel: "Vercel", "lucent-orng": "Lucent Orange",
    orng: "Orange", amoled: "AMOLED", "oc-2": "OC 2", onedarkpro: "One Dark Pro",
    shadesofpurple: "Shades of Purple", system: "System",
    };

// ==== 03-engine.js ====
    // ══════════════════════════════════════════════════════════════════════════
    // 主题引擎（逻辑段，由 docs/_extract_engine.mjs 从 dsh-opencode-palette 2.1.12 切出）
    //
    // 四个模块，按依赖顺序：resolve（色彩工具 + 主题解析）→ pair-contrast（配对对比度
    // 修复）→ map-dsh（37 色槽 → DSH 令牌的唯一真相源）→ generate（令牌与 CSS 生成）
    // → grouping（面板按色系分组）。
    //
    // 已裁掉上游的字体链（font-face / font-names / 排印 CSS）：本插件不设排版，
    // 字体交给宿主「通用设置 → 外观」。裁掉的部分在 _extract_engine.mjs 里同步注明。
    //
    // 原样保留上游实现：这里的每个常量都是调过参的（对比度阈值、推离步长、diff 水洗的
    // 候选序列），重写只会引入新偏差。要改行为请改参数并写明理由。
    // ══════════════════════════════════════════════════════════════════════════

    const __mods = {};

    // registry 的替身：grouping 模块顶层就解构 `__mods["registry"]`，且 themeGroups() 靠它
    // 遍历全部主题。上游 registry 里的 37 套主题 JSON 由 _extract_themes.mjs 单独提取成
    // THEMES（与本段拼在同一作用域），所以这里只留一层薄壳指向它。
    // 注意 THEMES 声明在本段之后：函数体在调用时才求值，只要不在加载期调用就没有 TDZ 问题。
    __mods["registry"] = {
      SYSTEM_THEME: 'system',
      listThemes() { return Object.keys(THEMES).concat('system').sort((a, b) => a.localeCompare(b)); },
      getThemeJson(name) { return THEMES[name] || null; },
      isSystem(name) { return name === 'system'; },
      countStatic() { return Object.keys(THEMES).length; },
    };

    // ——————————————————— resolve ———————————————————
    (function () {
    // resolve.ts — 颜色解析器：把 opencode 主题 JSON 的颜色引用链解析为确定 HEX
    // 支持：hex 字符串 / 'transparent'|'none' / defs 引用 / theme 自引用 / ANSI 数字 / {dark,light} 变体
    // 循环引用抛错；单键解析失败由 resolveThemeColors 捕获为 { __error }，不影响其余颜色
    // ANSI 16 色（opencode ansiToRgba 同源）
    const ANSI_16 = [
    '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#C0C0C0',
    '#808080', '#FF0000', '#00FF00', '#FFFF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFFFF',
    ];
    function ansiToHex(code) {
    if (!Number.isInteger(code) || code < 0 || code > 255)
        return '#FF00FF'; // 非法值兜底（品红=显眼错误）
    if (code < 16)
        return ANSI_16[code];
    if (code < 232) {
        const index = code - 16;
        const b = index % 6;
        const g = Math.floor(index / 6) % 6;
        const r = Math.floor(index / 36);
        const val = (x) => (x === 0 ? 0 : x * 40 + 55);
        return rgbToHex(val(r), val(g), val(b));
    }
    const gray = (code - 232) * 10 + 8;
    return rgbToHex(gray, gray, gray);
    }
    function rgbToHex(r, g, b) {
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return ('#' + c(r) + c(g) + c(b)).toUpperCase();
    }
    /** 解析任意入参为 RGB；非 HEX 输入会得到 NaN 通道（历史宽容语义，调用方自行判断） */
    function hexToRgb(hex) {
    let t = String(hex || '').trim();
    if (t[0] === '#')
        t = t.slice(1);
    if (t.length === 3)
        t = t.split('').map((x) => x + x).join('');
    if (t.length === 4)
        t = t.split('').map((x) => x + x).join('');
    const n = parseInt(t, 16);
    if (t.length === 8)
        return { r: (n >>> 24) & 255, g: (n >>> 16) & 255, b: (n >>> 8) & 255, a: n & 255 };
    return { r: (n >>> 16) & 255, g: (n >>> 8) & 255, b: n & 255, a: 255 };
    }
    // 提亮/压暗：f>0 向白混合，f<0 向黑混合
    function shade(hex, f) {
    const { r, g, b } = hexToRgb(hex);
    const target = f >= 0 ? 255 : 0;
    const k = Math.abs(f);
    return rgbToHex(r + (target - r) * k, g + (target - g) * k, b + (target - b) * k);
    }
    // 带透明度（输出 rgba()）
    function withAlpha(hex, a) {
    const { r, g, b } = hexToRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }
    // 对比文字色：亮底→深字，暗底→浅字
    function contrastText(hex) {
    const { r, g, b } = hexToRgb(hex);
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luma > 0.6 ? '#141414' : '#F4F4F5';
    }
    const HEX_RE = /^#([0-9a-fA-F]{3,8})$/;
    function resolveColor(ref, defs, theme, mode, chain) {
    const seen = chain || [];
    if (typeof ref === 'number')
        return ansiToHex(ref);
    if (typeof ref === 'string') {
        const t = ref.trim();
        if (t === 'none' || t === 'transparent')
            return 'transparent';
        if (HEX_RE.test(t))
            return t.toUpperCase();
        if (seen.includes(t)) {
            throw new Error('循环颜色引用: ' + seen.concat(t).join(' -> '));
        }
        const next = (defs && defs[t]) || (theme && theme[t]);
        if (next === undefined)
            throw new Error('未知颜色引用 \"' + t + '\"（不在 defs 与 theme 中）');
        return resolveColor(next, defs, theme, mode, seen.concat(t));
    }
    if (typeof ref === 'object' && ref !== null) {
        const v = ref[mode] !== undefined ? ref[mode] : (ref.dark !== undefined ? ref.dark : ref.light);
        if (v === undefined)
            throw new Error('颜色变体缺少 dark/light: ' + JSON.stringify(ref));
        return resolveColor(v, defs, theme, mode, seen);
    }
    throw new Error('非法颜色值: ' + String(ref));
    }
    // 解析整个主题 → { 颜色: hex|transparent|{__error} }
    function resolveThemeColors(json, mode) {
    const m = mode || 'dark';
    const src = json && typeof json === 'object' ? json : {};
    const defs = src.defs || {};
    const theme = src.theme || {};
    const out = {};
    for (const key of Object.keys(theme)) {
        if (key === 'thinkingOpacity')
            continue;
        try {
            out[key] = resolveColor(theme[key], defs, theme, m, []);
        }
        catch (e) {
            out[key] = { __error: e instanceof Error ? e.message : String(e) };
        }
    }
    // opencode 同款兜底：selectedListItemText 缺省=background；backgroundMenu 缺省=backgroundElement
    if (out.selectedListItemText === undefined)
        out.selectedListItemText = out.background;
    if (out.backgroundMenu === undefined)
        out.backgroundMenu = out.backgroundElement;
    return out;
    }
    // 收集解析失败清单（供调用方告警/测试）
    function collectErrors(colors) {
    const out = [];
    for (const key of Object.keys(colors || {})) {
        const v = colors[key];
        if (v && typeof v === 'object' && v.__error)
            out.push(key + ': ' + v.__error);
    }
    return out;
    }
    // 画布归属（issue 45）：主要背景槽位在两套外观下均为 transparent → 主题不拥有画布，
    // 底色归宿主；其上的文字不得再假设深色底。按槽位判定，不按主题名硬编码。
    const SURFACE_SLOTS = ['background', 'backgroundPanel', 'backgroundElement'];
    function isDelegatedSurface(darkColors, lightColors) {
    const d = darkColors || {};
    const l = lightColors || {};
    return SURFACE_SLOTS.every((k) => d[k] === 'transparent' && l[k] === 'transparent');
    }
    // ── diff 可读性兜底（issue 80）：WCAG 对比度 + tint 派生 ──
    // 上游手写 diff 背景与底色无亲缘关系（nord Bg = panel 色），且 TUI/桌面均无校验，
    // V2 v2.0.29 同样没修。引擎在 token 落子前把不达标的背景重算为“底色染一点红/绿”，
    // 必要时提亮/压暗前景，保证深浅两外观下 4 对 fg/bg 达标，且增删背景不原样同值。
    // 只动派生输出，不改上游主题数据 JSON；缺失/透明/解析失败原样跳过（lucent 系行为不变）。
    const DIFF_CONTRAST_THRESHOLD = 4.5;
    const DIFF_TINT_DARK = 0.22;
    const DIFF_TINT_LIGHT = 0.14;
    function mixHex(a, b, k) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    return rgbToHex(A.r + (B.r - A.r) * k, A.g + (B.g - A.g) * k, A.b + (B.b - A.b) * k);
    }
    function channelLuminance(v) {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }
    function relativeLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
    }
    function contrastRatio(a, b) {
    const l1 = relativeLuminance(a);
    const l2 = relativeLuminance(b);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
    }
    // 在给定不透明底色上取「可读文字色」：纯黑/纯白中对比度更高者。
    // 任意底色下至少一者 >= 4.58（WCAG 黑/白端点），用于宿主硬编码白字（tooltip 标签）的覆盖兜底；
    // 与 contrastText 的区别：contrastText 返回柔和的 #141414/#F4F4F5，观感好但中灰底不保证 AA。
    function readableTextOn(bgHex) {
    try {
        return contrastRatio('#000000', bgHex) >= contrastRatio('#FFFFFF', bgHex) ? '#000000' : '#FFFFFF';
    }
    catch (e) {
        return '#FFFFFF';
    }
    }
    // 8 位 hex（含 alpha）按底色混合为不透明；不透明原样大写返回
    function blendOntoBase(fgHex, baseHex) {
    const t = String(fgHex || '').trim();
    if (/^#[0-9a-fA-F]{8}$/.test(t)) {
        const alpha = parseInt(t.slice(7, 9), 16) / 255;
        const F = hexToRgb('#' + t.slice(1, 7));
        const B = hexToRgb(baseHex);
        return rgbToHex(F.r * alpha + B.r * (1 - alpha), F.g * alpha + B.g * (1 - alpha), F.b * alpha + B.b * (1 - alpha));
    }
    return String(fgHex).toUpperCase();
    }
    function isSkipped(v) {
    if (v === undefined || v === null || v === 'transparent')
        return true;
    return typeof v === 'object' && Boolean(v.__error);
    }
    // 单外观 diff 兜底：输入单套解析色（含 background），返回补丁后的浅拷贝
    // isDark=true 用 dark 常数（tint 0.22，向黑压暗找达标）；false 用 light 常数（tint 0.14，向白提亮）
    function ensureDiffContrast(colors, isDark = true, threshold = DIFF_CONTRAST_THRESHOLD) {
    const src = colors || {};
    const base = src.background;
    // WIP 原文此处只判 isSkipped；保留同一运行时语义（base 非字符串的路径不进 engine 输入面）
    if (isSkipped(base))
        return Object.assign({}, src);
    const alpha = isDark ? DIFF_TINT_DARK : DIFF_TINT_LIGHT;
    const bgTarget = isDark ? '#000000' : '#FFFFFF';
    const fgTarget = isDark ? '#FFFFFF' : '#000000';
    const out = Object.assign({}, src);
    const groups = [
        { fg: 'diffAdded', bgs: ['diffAddedBg', 'diffAddedLineNumberBg'] },
        { fg: 'diffRemoved', bgs: ['diffRemovedBg', 'diffRemovedLineNumberBg'] },
    ];
    for (const g of groups) {
        const fg0 = src[g.fg];
        if (isSkipped(fg0) || typeof fg0 !== 'string')
            continue;
        // 先看两个 Bg 是否都已达标：都达标则不动（保住好主题原值）
        let needFix = false;
        for (const bk of g.bgs) {
            const bv = src[bk];
            if (isSkipped(bv) || typeof bv !== 'string')
                continue;
            let eff = bv;
            try {
                eff = blendOntoBase(bv, base);
            }
            catch (e) {
                continue;
            }
            try {
                if (contrastRatio(fg0, eff) < threshold)
                    needFix = true;
            }
            catch (e) {
                needFix = true;
            }
        }
        if (!needFix)
            continue;
        // 最小改动搜索：fg 提亮步进最小，背景压暗步进最小，首个双 Bg 达标即停
        let fixed = null;
        const jSteps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
        const kSteps = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
        for (const j of jSteps) {
            const fgC = j === 0 ? fg0 : mixHex(fg0, fgTarget, j);
            const tintedC = mixHex(base, fgC, alpha);
            const bgCands = [];
            let ok = true;
            for (const bk of g.bgs) {
                const bv = src[bk];
                if (isSkipped(bv) || typeof bv !== 'string') {
                    bgCands.push(null);
                    continue;
                }
                let found = null;
                for (const k of kSteps) {
                    const cand = mixHex(tintedC, bgTarget, k);
                    try {
                        if (contrastRatio(fgC, cand) >= threshold) {
                            found = cand;
                            break;
                        }
                    }
                    catch (e) {
                        continue;
                    }
                }
                if (found === null) {
                    ok = false;
                    break;
                }
                bgCands.push(found);
            }
            if (ok) {
                fixed = { fgC, bgCands, j };
                break;
            }
        }
        const fix = fixed;
        if (!fix)
            continue;
        if (fix.j > 0)
            out[g.fg] = fix.fgC;
        g.bgs.forEach((bk, i) => {
            const c = fix.bgCands[i];
            if (c !== null)
                out[bk] = c;
        });
    }
    // 增删背景不可同值透出：若修完仍相等（上游同值输入），把删除侧再压一档（仍保达标）
    const ab = out.diffAddedBg;
    const db = out.diffRemovedBg;
    if (typeof ab === 'string' && typeof db === 'string' && ab.toUpperCase() === db.toUpperCase()) {
        const delFg = out.diffRemoved;
        if (typeof delFg === 'string' && !isSkipped(delFg)) {
            const tinted = mixHex(base, delFg, alpha);
            for (const k of [0.4, 0.6, 0.8, 1.0]) {
                const cand = mixHex(tinted, bgTarget, k);
                if (cand.toUpperCase() === ab.toUpperCase())
                    continue;
                try {
                    if (contrastRatio(delFg, cand) >= threshold) {
                        out.diffRemovedBg = cand;
                        break;
                    }
                }
                catch (e) {
                    continue;
                }
            }
        }
    }
    const ag = out.diffAddedLineNumberBg;
    const dg = out.diffRemovedLineNumberBg;
    if (typeof ag === 'string' && typeof dg === 'string' && ag.toUpperCase() === dg.toUpperCase()) {
        const delFg = out.diffRemoved;
        if (typeof delFg === 'string' && !isSkipped(delFg)) {
            const tinted = mixHex(base, delFg, alpha);
            for (const k of [0.4, 0.6, 0.8, 1.0]) {
                const cand = mixHex(tinted, bgTarget, k);
                if (cand.toUpperCase() === ag.toUpperCase())
                    continue;
                try {
                    if (contrastRatio(delFg, cand) >= threshold) {
                        out.diffRemovedLineNumberBg = cand;
                        break;
                    }
                }
                catch (e) {
                    continue;
                }
            }
        }
    }
    return out;
    }

    __mods["resolve"] = { ansiToHex, rgbToHex, hexToRgb, shade, withAlpha, contrastText, resolveColor, resolveThemeColors, collectErrors, isDelegatedSurface, DIFF_CONTRAST_THRESHOLD, DIFF_TINT_DARK, DIFF_TINT_LIGHT, mixHex, relativeLuminance, contrastRatio, readableTextOn, blendOntoBase, ensureDiffContrast }
    })();

    // ——————————————————— pair-contrast ———————————————————
    (function () {
    // pair-contrast.ts — 宿主真实「文字色压在背景色上」配对的对比度兜底
    //
    // 为什么需要这一层：插件只往宿主注入颜色 token，但宿主 CSS 里有大量「同一规则内
    // 同时设 background 与 color」的配对（按钮、药丸、层级卡片、错误提示…）。只要主题给的
    // 两种颜色离得太近，那处文字就读不出来——2026-10 的截图事故（inline diff 行底）就是
    // 这一类的最坏形态。diffWash（map-dsh.ts）负责行底那种「水洗」语义，本层负责其余所有
    // 已知配对：不发明新颜色，只在不达标时把其中一侧沿黑/白推离到刚过阈值的最小一步。
    //
    // 数据来源（可复现）：宿主 app.asar 的 CSS 里扫所有
    //   background(-color):var(--dsw-alias-X) 与 color:var(--dsw-alias-Y) 同时出现的规则体
    // 去重后得到下面这张表。宿主升级后若新增配对，按同样口径重扫并补表即可；测试会遍历全表。
    const { blendOntoBase, contrastRatio, hexToRgb, mixHex, rgbToHex } = __mods["resolve"]
    /** WCAG AA 正文阈值；小字（11–13px）宿主里普遍存在，因此不降到 3:1（那是大字/图标口径） */
    const PAIR_CONTRAST_MIN = 4.5;
    /** 推离档位：1% 一档，小步优先保住主题原色的观感 */
    const PUSH_STEPS = Array.from({ length: 100 }, (_, i) => (i + 1) / 100);
    /** 兜底迭代轮数：这是防震荡的**上限**，不是收敛保证；真没收敛会落在 unresolved 里由测试暴露 */
    const MAX_ROUNDS = 4;
    // 只认合法长度：#rgb/#rgba/#rrggbb/#rrggbbaa（5/7 位是坏值，不能当颜色）
    const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    // 只认逗号语法的 rgb()/rgba()；颜色 4 / 空格斜杠语法解析不了 → 该配对进 skipped（如实报告，不猜）
    const RGBA_COLOR = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/;
    const HOST_TEXT_PAIRS = [
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-interactive-bg-hover' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-layer-1' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-interactive-bg-hover' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-base' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-markdown-code-block' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-module-platform' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-layer-3' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-layer-2' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-base' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-layer-1' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-module-platform' },
    { fg: '--dsw-alias-bg-layer-3', bg: '--dsw-alias-label-primary' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-markdown-code-block' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-interactive-bg-hover-solid' },
    { fg: '--dsw-alias-label-primary-foreground', bg: '--dsw-alias-button-primary-fill' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-layer-2' },
    { fg: '--dsw-alias-state-error-primary', bg: '--dsw-alias-interactive-bg-hover-danger' },
    { fg: '--dsw-alias-label-primary-inverted', bg: '--dsw-alias-button-contrast-fill' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-state-warn-tertiary' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-button-ghost-active-fill' },
    { fg: '--dsw-alias-state-warn-label', bg: '--dsw-alias-state-warn-tertiary' },
    { fg: '--dsw-alias-state-business-primary', bg: '--dsw-alias-interactive-bg-hover' },
    { fg: '--dsw-alias-state-warn-primary', bg: '--dsw-alias-state-warn-tertiary' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-button-floating-fill' },
    { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-interactive-bg-hover' },
    { fg: '--dsw-alias-state-business-primary', bg: '--dsw-alias-state-business-tertiary' },
    { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-bg-skeleton' },
    { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-bg-module-platform' },
    { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-bg-layer-2' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-button-elevated-fill' },
    { fg: '--dsw-alias-toast-label', bg: '--dsw-alias-toast-bg' },
    { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-fill-tsp-secondary' },
    { fg: '--dsw-alias-bg-layer-3', bg: '--dsw-alias-state-error-primary' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-interactive-bg-hover-solid' },
    { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-markdown-code-block' },
    { fg: '--dsw-alias-label-primary-bluish', bg: '--dsw-alias-state-business-tertiary' },
    { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-button-ghost-active-fill' },
    { fg: '--dsw-alias-label-caption', bg: '--dsw-alias-interactive-bg-hover' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-fill-l1' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-fill-l2' },
    { fg: '--dsw-alias-state-warn-label', bg: '--dsw-alias-bg-module-platform' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-layer-3' },
    { fg: '--dsw-alias-state-error-primary', bg: '--dsw-alias-bg-base' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-l2' },
    { fg: '--dsw-alias-label-primary-inverted', bg: '--dsw-alias-label-primary' },
    { fg: '--dsw-alias-label-caption', bg: '--dsw-alias-markdown-code-block-banner' },
    { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-bg-layer-1' },
    { fg: '--dsw-alias-label-caption', bg: '--dsw-alias-bg-module-platform' },
    { fg: '--dsw-alias-label-caption', bg: '--dsw-alias-bg-layer-2' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-overlay' },
    { fg: '--dsw-alias-state-success-primary', bg: '--dsw-alias-state-success-tertiary' },
    { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-layer-4' },
    // inline diff 行（编辑/写入工具）：行底由 map-dsh 的 diffWash 派生（还要求对代码块底成带），
    // 这里只作为配对断言与二道保险——diffWash 已保证达标，本层通常不会动它们。
    { fg: '--dsw-alias-state-error-primary', bg: '--dsw-alias-code-diff-deleted' },
    { fg: '--dsw-alias-state-success-primary', bg: '--dsw-alias-code-diff-added' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-markdown-code-block-banner' },
    { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-markdown-tag' },
    { fg: '--dsw-alias-label-primary-inverted', bg: '--dsw-alias-brand-primary' },
    ];
    // 谁算「文字色 token」：只有这些槽在宿主里专用于压在别人身上；其余（bg-*、fill-*、
    // interactive-bg-*、button-*-fill、markdown-*、state-*-tertiary、brand-*）都是「面」，
    // 面与面相遇（如药丸里文字色取面 token）时不该动面，留给上层判断。
    const TEXT_TOKEN = [
    /^--dsw-alias-label-/,
    /^--dsw-alias-toast-label$/,
    /^--dsw-alias-state-.*-(primary|label)$/,
    ];
    function isTextToken(name) {
    return TEXT_TOKEN.some((re) => re.test(name));
    }
    // 全局文字锚（正文/次要/弱化/说明）：它们被宿主到处当文字色用，绝不作为「面」被推离——
    // 为一个角落里的反白徽标去挪全局正文色，会让整个界面一起变样。作为文字侧仍然可以修（那是可读性本身）。
    const LABEL_ANCHOR = /^--dsw-alias-label-(primary|secondary|tertiary|caption)(-bluish|-foreground|-inverted)?$/;
    /**
     * 决定这条配对修哪一侧：
     * - 文字色 vs 面 → 修文字色（面是布局骨架，动它会牵一片）；
     * - 面当文字压文字色当底（如错误药丸用 bg-layer-3 当字色）→ 修那个「当底的状态色」；
     * - 要以全局文字锚当底面被推离、或面 vs 面（两侧都是骨架 token）→ 不动，交测试暴露问题
     *   而不是悄悄改骨架。
     */
    function preferredRepairSide(fg, bg) {
    const fgText = isTextToken(fg);
    const bgText = isTextToken(bg);
    if (fgText && !bgText)
        return 'fg';
    if (bgText && !fgText)
        return LABEL_ANCHOR.test(bg) ? null : 'bg';
    if (fgText && bgText)
        return 'fg';
    return null;
    }
    /** 解析 #rgb/#rrggbb/#rrggbbaa 与 rgb()/rgba()；transparent、空值、非颜色一律 null */
    function parseColor(raw) {
    if (!raw)
        return null;
    const v = raw.trim();
    if (v === 'transparent' || v === 'none')
        return null;
    if (HEX_COLOR.test(v)) {
        const { r, g, b, a } = hexToRgb(v);
        return { hex: rgbToHex(r, g, b), alpha: a / 255 };
    }
    const m = RGBA_COLOR.exec(v);
    if (m) {
        return {
            hex: rgbToHex(Number(m[1]), Number(m[2]), Number(m[3])),
            alpha: m[4] === undefined ? 1 : Number(m[4]),
        };
    }
    return null;
    }
    function parsed(values, name) {
    return parseColor(values[name]);
    }
    /** 半透明值按这一半的页面底压平成不透明色再比较（浮层底、diff 底常用 alpha） */
    function solid(c, page) {
    if (c.alpha >= 1)
        return c.hex;
    return blendOntoBase(c.hex + Math.round(c.alpha * 255).toString(16).padStart(2, '0'), page);
    }
    /** 本 token 能不能当修复目标：只有不透明色才能被推离，rgba/transparent 属于设计意图（半透明浮层），不碰 */
    function repairable(values, name) {
    const c = parsed(values, name);
    return c !== null && c.alpha >= 1;
    }
    function contrastOf(a, b, page) {
    return contrastRatio(solid(a, page), solid(b, page));
    }
    function constraintsFor(pairs, values) {
    const cons = new Map();
    const unjudgeable = [];
    for (const pair of pairs) {
        const side = preferredRepairSide(pair.fg, pair.bg);
        if (!side)
            continue;
        const self = side === 'fg' ? pair.fg : pair.bg;
        const other = side === 'fg' ? pair.bg : pair.fg;
        // 首选一侧不可动（半透明/缺席/不存在）时退另一侧；两侧都不可动就记进 unjudgeable
        let target = self;
        let partner = other;
        if (!repairable(values, target) || !parsed(values, partner)) {
            target = other;
            partner = self;
        }
        if (!repairable(values, target) || !parsed(values, partner)) {
            unjudgeable.push(pair.fg + ' on ' + pair.bg);
            continue;
        }
        const item = { other: partner };
        const list = cons.get(target);
        if (list)
            list.push(item);
        else
            cons.set(target, [item]);
    }
    return { cons, unjudgeable };
    }
    /** 候选值在全部约束上的最小对比度（无约束 → Infinity） */
    function minContrast(value, list, snapshot, page) {
    let worst = Infinity;
    for (const c of list) {
        const other = parsed(snapshot, c.other);
        if (!other)
            continue;
        worst = Math.min(worst, contrastOf(value, other, page));
    }
    return worst;
    }
    /**
     * 沿黑/白推离，取「满足全部约束的最小一步」（每步 1%，先小后大，两侧同一步时取更充裕的那侧）。
     * `taken` 是本次已经写出的其它 token 值：跳过撞值的那一档，免得「正文色 / 次要色」在弱对比
     * 主题里被推成同一个灰（层级塌掉）。找不到这样一步 → 说明这些约束物理上不可同时满足（例：同一个
     * 「反白字」要同时压住浅色填充和深色主色），此时**保持原值**：把设计色挪到中间灰只会让每一处都
     * 变糊，宁可停在主题作者的选择上，由 infeasible 名单如实暴露出来。
     */
    function pushOnce(current, list, snapshot, page, min, avoid) {
    for (const step of PUSH_STEPS) {
        let stepBest = null;
        for (const end of ['#000000', '#FFFFFF']) {
            const candidate = mixHex(current.hex, end, step);
            if (candidate.toUpperCase() === current.hex.toUpperCase())
                continue;
            if (avoid && avoid(candidate.toUpperCase()))
                continue;
            const flatCandidate = { hex: candidate, alpha: 1 };
            const slack = minContrast(flatCandidate, list, snapshot, page);
            if (slack >= min) {
                if (!stepBest || slack > stepBest.slack)
                    stepBest = { value: candidate, slack };
            }
        }
        if (stepBest)
            return stepBest;
    }
    return null;
    }
    function pushUntilSatisfied(current, list, snapshot, page, min, avoid) {
    // 先找不撞值的解；只有全部档位都撞（极端主题）才退回允许撞值，最后才判定不可行
    const free = pushOnce(current, list, snapshot, page, min, avoid);
    if (free)
        return { value: free.value, infeasible: false };
    const any = pushOnce(current, list, snapshot, page, min);
    if (any)
        return { value: any.value, infeasible: false };
    return { value: current.hex, infeasible: true };
    }
    /**
     * 诊断用：按这一半的 token 表算某条配对的对比度。判不了（缺槽 / 半透明且没有页面底）→ null。
     * 测试与后续排查都用它，避免再抄一份颜色解析。
     */
    function pairContrastRatio(values, pair) {
    const fg = parsed(values, pair.fg);
    const bg = parsed(values, pair.bg);
    if (!fg || !bg)
        return null;
    const pageColor = parsed(values, '--dsw-alias-bg-base');
    if (fg.alpha >= 1 && bg.alpha >= 1)
        return contrastOf(fg, bg, '#000000');
    if (!pageColor || pageColor.alpha < 1)
        return null;
    return contrastOf(fg, bg, pageColor.hex);
    }
    /**
     * 就地把一半 token 表里「文字压在背景上读不出来」的配对修到达标。
     * 只动配对里指定的那一侧，不增删 token，不改已达标的值 → 对绝大多数主题是纯恒等变换。
     */
    function repairPairContrast(values, pairs = HOST_TEXT_PAIRS, min = PAIR_CONTRAST_MIN) {
    const pageColor = parsed(values, '--dsw-alias-bg-base');
    // 页面底不可用或本身半透明（委托画布 / 作者没给底色）= 判不出真实观感，整段跳过：宁可不改，
    // 也不拿一个假的底色去算对比度（旧版这么做会把正文色推到中间灰）。
    if (!pageColor || pageColor.alpha < 1)
        return { judged: false, changed: [], infeasible: [], unresolved: [], skipped: [] };
    const page = pageColor.hex;
    const { cons, unjudgeable } = constraintsFor(pairs, values);
    const changed = [];
    const infeasible = [];
    /** 起点快照：判断两个 token 是否「同一个源的孪生」（label-primary 与 label-primary-dimmed 都取 text） */
    const originals = { ...values };
    /** 本次已写出的值 → 拿走它的 token：推离时避开别人的值，保住层级（正文色 / 次要色不会塌成同一个灰） */
    const assigned = new Map();
    for (let round = 0; round < MAX_ROUNDS; round++) {
        const snapshot = { ...values };
        let touched = false;
        for (const name of [...cons.keys()].sort()) {
            const current = parsed(snapshot, name);
            if (!current || current.alpha < 1)
                continue;
            const list = cons.get(name);
            if (!list || minContrast(current, list, snapshot, page) >= min)
                continue;
            // 撞值回避只对「起点色不同」的 token 生效：同源孪生本来就该同值，不该被之一拆开
            const avoid = (value) => {
                const owner = assigned.get(value);
                if (owner === undefined || owner === name)
                    return false;
                return (originals[owner] || '').toUpperCase() !== (originals[name] || '').toUpperCase();
            };
            const next = pushUntilSatisfied(current, list, snapshot, page, min, avoid);
            if (next.infeasible && !infeasible.includes(name))
                infeasible.push(name);
            if (next.value.toUpperCase() === current.hex.toUpperCase())
                continue;
            values[name] = next.value;
            assigned.set(next.value.toUpperCase(), name);
            if (!changed.includes(name))
                changed.push(name);
            touched = true;
        }
        if (!touched)
            break;
    }
    const unresolved = [];
    const skipped = [...unjudgeable];
    for (const pair of pairs) {
        const fg = parsed(values, pair.fg);
        const bg = parsed(values, pair.bg);
        const id = pair.fg + ' on ' + pair.bg;
        if (!fg || !bg) {
            if (!skipped.includes(id))
                skipped.push(id);
            continue;
        }
        if (contrastOf(fg, bg, page) < min)
            unresolved.push(id);
    }
    return { judged: true, changed, infeasible, unresolved, skipped };
    }

    __mods["pair-contrast"] = { PAIR_CONTRAST_MIN, HOST_TEXT_PAIRS, preferredRepairSide, pairContrastRatio, repairPairContrast }
    })();

    // ——————————————————— map-dsh ———————————————————
    (function () {
    // map-dsh.ts — ★ 单一真相源：opencode 主题语义颜色 → DSH 界面 CSS 变量/元素规则
    // DSH 升级改 CSS 变量名时，只需要改这一个文件。
    // 值 = opencode 颜色名；generate.ts 负责取值与派生（提亮/透明/对比色）。
    const { shade, withAlpha, contrastText, mixHex, readableTextOn, contrastRatio, blendOntoBase } = __mods["resolve"]
    // 派生 token 的 helpers 来自 resolve.ts（shade/withAlpha/contrastText）
    // 派生 token 的取槽助手：解析失败的颜色在历史行为里会流入 helper 被宽容处理（不抛错、由
    // buildTokens 的 try/catch 兜底或原样输出），这里保持同一运行时语义，仅把类型收窄成 string。
    const slot = (c, key) => c[key];
    // ── 1. token 层：theme.overrideTokens 注册的 --dsw-alias-* 变量 ──
    // 格式: [DSH 变量, 来源颜色]（来源缺失/透明/解析失败 → 该 token 自动跳过，不污染）
    // 高度梯子（第一性原理：opencode background/backgroundPanel/backgroundElement 本就是
    // 深色 step1<step2<step3 台阶，与 DSH base<panel<element 浮起方向一致）：
    //   step1 页面底 ← DSH 950 级（base/sidebar/unselected）；
    //   step2 浮起面（中层）← DSH 850 级（tag/placeholder/bubble/multi-select 芯片）；
    //   step3 浮层 ← DSH 750~800 级（citation/banner/toast/tooltip/tip/selector）。
    const TOKEN_MAP = [
    // 页面底：step1（DSH 深色 900~950 级：base/sidebar/unselected）
    ['--dsw-alias-bg-base', 'background'],
    ['--dsw-alias-bg-layer-1', 'background'],
    ['--dsw-alias-bg-layer-2', 'background'],
    ['--dsw-alias-bg-overlay', 'background'],
    ['--dsw-alias-bg-layer-3', 'background'],
    ['--dsw-specific-sidebar-fill', 'sidebarBg'],
    // F3 退出：--dsw-specific-menu 不透明底杀毛玻璃（DSH 0.1.7 起半透明材料 + web-styling 禁止覆盖菜单材料）
    // 老版影响为菜单回默认、可读，不算功能回归；菜单材料/滤镜变量永不输出。
    ['--dsw-alias-markdown-code-segment-unselected', 'background'],
    ['--dsw-alias-markdown-code-segment-selected', 'backgroundElement'],
    // 浮起面（中层芯片）：step2（DSH 深色 850 级：tag/placeholder/bubble/multi-select）
    ['--dsw-alias-markdown-tag', 'backgroundPanel'],
    ['--dsw-alias-markdown-placeholder', 'backgroundPanel'],
    ['--dsw-specific-bubble', 'bubbleBg'],
    ['--dsw-alias-bg-multi-select', 'backgroundPanel'],
    // 浮层：step3（DSH 深色 750~800 级：citation/banner/toast/tooltip/tip/selector）
    ['--dsw-alias-markdown-citation', 'backgroundElement'],
    ['--dsw-alias-bg-module-platform', 'backgroundElement'],
    ['--dsw-specific-selector', 'backgroundElement'],
    ['--dsw-specific-tip', 'backgroundElement'],
    ['--dsw-specific-bubble-highlight', 'backgroundElement'],
    // 输入框/代码块底 = backgroundPanel；横幅/按钮面 = backgroundElement
    ['--dsw-specific-input-major', 'inputBg'],
    ['--dsw-specific-login-input', 'inputBg'],
    ['--dsw-alias-markdown-code-block', 'codeBlockBg'],
    ['--dsw-alias-markdown-code-block-banner', 'codeHeaderBg'],
    // F2 新头部（DSH 0.1.7 CodeCard.header 只读此变量，不读 banner token；老横幅路径保留，老版继续命中）
    ['--dsl-code-block-background', 'codeHeaderBg'],
    ['--dsw-alias-toast-bg', 'backgroundElement'],
    ['--dsw-alias-tooltip-bg', 'backgroundElement'],
    ['--dsw-alias-button-elevated-fill', 'backgroundPanel'],
    ['--dsw-alias-button-floating-fill', 'backgroundPanel'],
    // 文字层级
    ['--dsw-alias-label-primary', 'text'],
    ['--dsw-alias-label-primary-dimmed', 'text'],
    ['--dsw-alias-label-secondary', 'textMuted'],
    ['--dsw-alias-label-tertiary', 'textMuted'],
    ['--dsw-alias-label-caption', 'textMuted'],
    ['--dsw-alias-label-primary-bluish', 'markdownLink'],
    // F1 链接（上游 .markdown a 只读此变量；老 bluish/shiki-link/裸 a 规则全部保留，加法兼容）
    ['--dsw-alias-link', 'markdownLink'],
    // 品牌与状态（含旧报告 R2/R3 修复后迁入派生的 invert/dimmed/ghost，见 §2）
    ['--dsw-alias-brand-primary', 'primary'],
    ['--dsw-alias-brand-text', 'primary'],
    ['--dsw-alias-button-primary-fill', 'primary'],
    ['--dsw-alias-button-info-fill', 'info'],
    ['--dsw-alias-button-contrast-fill', 'text'],
    ['--dsw-alias-state-error-primary', 'error'],
    ['--dsw-alias-state-warn-primary', 'warning'],
    ['--dsw-alias-state-warn-label', 'warning'],
    ['--dsw-alias-state-success-primary', 'success'],
    ['--dsw-alias-state-business-primary', 'primary'],
    // 边框（DSH 深色 l3/l4 = 白 16%/20% 强边框 → 主题 borderActive）
    ['--dsw-alias-border-l1', 'border'],
    ['--dsw-alias-border-l2', 'borderActive'],
    ['--dsw-alias-border-l2-darkmode-thin', 'borderActive'],
    ['--dsw-alias-border-l3', 'borderActive'],
    ['--dsw-alias-border-l4', 'borderActive'],
    ['--dsw-alias-button-ghost-active-border', 'borderActive'],
    // F5 新增缺口（DSH 0.1.7 rc.1/rc.2 design-platform diff 全量直配；缺槽/透明靠 usable() 跳过，不污染）
    // file-diff-* 的「底/行号槽」是背景槽、marker 是前景槽，直配即可（对比度由 ensureDiffContrast 兜底）；
    // state-idle 取中性次级（缺槽即跳过）；菜单/toast 取中性直配；
    // code-diff-added/deleted 不是前景而是**水洗底**，不能直配 diffAdded/diffRemoved，由 generate.ts
    // 在末段按最终状态色调 deriveDiffWash 派生；tooltip 键帽底不能与浮层底同值，同样走派生（#120）。
    ['--dsw-alias-file-diff-added-bg', 'diffAddedBg'],
    ['--dsw-alias-file-diff-added-gutter', 'diffAddedLineNumberBg'],
    ['--dsw-alias-file-diff-added-marker', 'diffAdded'],
    ['--dsw-alias-file-diff-deleted-bg', 'diffRemovedBg'],
    ['--dsw-alias-file-diff-deleted-gutter', 'diffRemovedLineNumberBg'],
    ['--dsw-alias-file-diff-deleted-marker', 'diffRemoved'],
    ['--dsw-alias-state-idle-primary', 'secondary'],
    ['--dsw-alias-menu-icon', 'textMuted'],
    ['--dsw-alias-toast-label', 'text'],
    // 内联代码无芯片（opencode TUI 风格，固定 transparent）
    ['--dsw-alias-markdown-inline-code', '__transparent__'],
    ];
    // #120 缺陷 B：宿主键帽底默认 color-mix(tooltip-bg, white 18%)，浮层底换成主题浅色 surface 后
    // 键帽与浮层几乎同色。派生取「浮层底 → 其在底上的可读文字色」混合，并保证与浮层底至少
    // KEYCAP_MIN_CONTRAST 的可辨差异（16% 起步，不足则按 4% 步进加浓，上限 40%）。
    const KEYCAP_MIN_CONTRAST = 1.5;
    const KEYCAP_MIX_START = 0.16;
    const KEYCAP_MIX_STEP = 0.04;
    const KEYCAP_MIX_MAX = 0.4;
    function keycapColor(bg) {
    const target = readableTextOn(bg);
    let mix = KEYCAP_MIX_START;
    let color = mixHex(bg, target, mix);
    while (contrastRatio(color, bg) < KEYCAP_MIN_CONTRAST && mix < KEYCAP_MIX_MAX) {
        mix += KEYCAP_MIX_STEP;
        color = mixHex(bg, target, mix);
    }
    return color;
    }
    // 行内 diff 的加/删行（宿主 `_add_17vb8_48` / `_del_17vb8_38`）：
    //   ._add { color: var(--dsw-alias-state-success-primary); background: var(--dsw-alias-code-diff-added) }
    //   ._del { color: var(--dsw-alias-state-error-primary);   background: var(--dsw-alias-code-diff-deleted) }
    // 这两个 token 是**行底色**，配对文字是 state-success/error-primary（宿主默认值本身也只是
    // 绿/红 500 级 a08·a12 的水洗）。旧实现按名字把 diffAdded/diffRemoved 当「前景」直配进来 →
    // 行底变成不透明高饱和色；在 diffAdded ≈ success 的主题（catppuccin 全家）里文字与底同一个色，
    // 行内 diff 整行看不见（写入/编辑展示的截图事故）。
    // 派生时机：buildTokens **末段**（配对对比度修复之后）由 generate.ts 调 deriveDiffWash——行内
    // 文字色若被推离过，行底必须跟着重算，所以不能放进 DERIVED_TOKENS（那里只拿得到颜色键）。
    // 派生规则（第一性原理：底要服务固定的文字色 T，同时得看得出是一条色带）：
    //   1) 种子 = 主题自己的 diff 底（diffAddedBg/diffRemovedBg，进 buildTokens 前已过 ensureDiffContrast）；
    //   2) T 在种子上达标、且种子与卡片底可辨 → 直接用（保住主题原本的 diff 色调，不发明新颜色）；
    //   3) 达标但与卡片底同色（主题自己的 diff 底就等于代码底，色带消失）→ 退回宿主语义：
    //      状态色在卡片底上的水洗，取仍能让 T 达标的最高浓度（宿主默认就是 a08·a12 水洗）；
    //   4) 仍不成带（文字色对卡片底没余量）→ 把种子沿端点推（先远离 T：T 偏亮往黑、T 偏暗往白），
    //      取第一档「既达标又成带」；先推远离端是为了保住主题 diff 色的色相；
    //   5) 画布本身贴住两端、推到极限都成不了带 → 可读优先（退回水洗/首个达标值）；
    //   6) 种子缺槽/透明（委托画布）→ 交还宿主默认。
    const DIFF_WASH_MIN_CONTRAST = 4.5;
    // 行底与卡片底的倍率：1.12 = 目标强度（宿主默认水洗的量级），1.08 = 硬地板（低于此色带就看不见）。
    // 画布本身贴住黑/白时（深色画布 + 深色 diff 底）地板也可能到不了（contrast(画布,最远端点) 就是天花板），
    // 这时按「可读优先 + 可达范围内最大可辨度」返回，测试用 min(地板, 天花板) 作判据。
    const DIFF_WASH_MIN_CUE = 1.12;
    const DIFF_WASH_FLOOR_CUE = 1.08;
    // 水洗浓度档位（从低到高）：上限 0.4，再高行底就贴住文字色，回到旧缺陷的「字底同色」
    const DIFF_WASH_TINT_STEPS = [0.04, 0.08, 0.12, 0.16, 0.2, 0.24, 0.28, 0.32, 0.36, 0.4];
    // 推离档位（1% → 100%，1% 一档）：小步优先保住主题 diff 色的色相，细档让「刚可辨」落在最小偏离处
    const DIFF_WASH_PUSH_STEPS = Array.from({ length: 100 }, (_, i) => (i + 1) / 100);
    const ALPHA_HEX = /^#[0-9a-fA-F]{8}$/;
    const HEX_ANY = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    // 取一个不透明色：8 位 hex 先按 onto 压平（onto 缺失视为不可用）；缺槽/透明/非颜色 → null
    function flatToken(raw, onto) {
    if (!raw || raw === 'transparent' || !HEX_ANY.test(raw))
        return null;
    if (ALPHA_HEX.test(raw))
        return onto ? blendOntoBase(raw, onto) : null;
    return raw;
    }
    // 入参都是**已落地的 token 值**（不是颜色键）：这样可以在 buildTokens 末段按最终值派生——
    // pair-contrast 可能已经把状态色（行内文字色）推离过，行底必须跟着重算，否则两边各自为政。
    // fg = state-success/error-primary、seed = file-diff-*-bg、page = bg-base、card = markdown-code-block。
    function deriveDiffWash(fgToken, seedToken, pageToken, cardToken) {
    // 画布：行内 diff 落在代码块卡片上（宿主 `_block_1u3n2_1` 的 background = markdown-code-block），
    // 卡片留空退回页面底；两者都不可用 = 委托画布，这块底本该由宿主决定。
    const page = flatToken(pageToken);
    const card = flatToken(cardToken, page);
    const canvas = card || page;
    if (!canvas)
        return 'transparent';
    const seed = flatToken(seedToken, canvas) || canvas;
    const fg = flatToken(fgToken, seed);
    if (!fg)
        return 'transparent';
    const readable = (bg) => contrastRatio(fg, bg) >= DIFF_WASH_MIN_CONTRAST;
    const cue = (bg) => contrastRatio(bg, canvas);
    if (readable(seed) && cue(seed) >= DIFF_WASH_MIN_CUE)
        return seed;
    // 候选按「偏离种子由小到大」排：水洗（= 宿主语义：状态色按浓度叠在卡片底上）排在推离之前
    const candidates = [];
    const tint = readable(seed) ? tintOnto(fg, canvas, readable) : null;
    if (tint)
        candidates.push(tint);
    // 远离文字色的方向：文字偏亮则把底推向黑，文字偏暗则推向白。越远离越可读。
    const away = contrastRatio('#000000', fg) >= contrastRatio('#FFFFFF', fg) ? '#000000' : '#FFFFFF';
    const toward = away === '#000000' ? '#FFFFFF' : '#000000';
    for (const step of DIFF_WASH_PUSH_STEPS) {
        for (const end of [away, toward]) {
            const cand = mixHex(seed, end, step);
            if (readable(cand))
                candidates.push(cand);
        }
    }
    // 取第一个够可辨的候选（偏离最小）；都不够 → 退守地板；地板也到不了（画布贴住黑白）→ 取可达
    // 范围内最可辨的那个。三级顺序保证「正常主题落在最小偏离处」，极端画布才拿最大值。
    let best = null;
    for (const cand of candidates) {
        if (cue(cand) >= DIFF_WASH_MIN_CUE)
            return cand;
        if (best === null || cue(cand) > cue(best))
            best = cand;
    }
    for (const cand of candidates) {
        if (cue(cand) >= DIFF_WASH_FLOOR_CUE)
            return cand;
    }
    return best || seed;
    }
    // 状态色在画布上的水洗色：返回仍满足 readable 的最高浓度档，全档都不达标 → null
    function tintOnto(fg, canvas, readable) {
    for (let i = DIFF_WASH_TINT_STEPS.length - 1; i >= 0; i--) {
        const tinted = mixHex(canvas, fg, DIFF_WASH_TINT_STEPS[i]);
        if (readable(tinted))
            return tinted;
    }
    return null;
    }
    // ── 2. 派生 token：值不是直接取自颜色，而是按规则计算 ──
    // 格式: [DSH 变量, 计算函数(colors) → 值]（colors = resolveThemeColors 输出）
    const DERIVED_TOKENS = [
    ['--dsw-alias-button-primary-hover', (c) => shade(c.primary, 0.12)],
    ['--dsw-alias-button-info-hover', (c) => shade(c.info, 0.12)],
    ['--dsw-alias-label-primary-inverted', (c) => contrastText(c.text)],
    ['--dsw-alias-label-primary-foreground', (c) => contrastText(c.primary)],
    // R3 修复：brand 底上的字 = 主色的反色（旧值裸 text 在主色偏深时不可读）
    ['--dsw-alias-brand-primary-invert', (c) => contrastText(c.primary)],
    // R2 修复：dimmed/ghost 是主色/文字的弱填充，不是中性输入框底
    ['--dsw-alias-button-primary-dimmed', (c) => withAlpha(c.primary, 0.2)],
    ['--dsw-alias-button-ghost-active-fill', (c) => withAlpha(c.text, 0.1)],
    // 骨架屏：DSH 深色 #ffffff14（白 8%）→ 文字 8% 透明
    ['--dsw-alias-bg-skeleton', (c) => withAlpha(c.text, 0.08)],
    // 状态 secondary = 主色提亮（DSH 深色 red/green/amber-400，即更亮的同色）
    ['--dsw-alias-state-error-secondary', (c) => shade(c.error, 0.25)],
    ['--dsw-alias-state-success-secondary', (c) => shade(c.success, 0.25)],
    ['--dsw-alias-state-warn-secondary', (c) => shade(c.warning, 0.25)],
    // 状态 tertiary = 同色弱底（DSH 深色 green/amber-900 暗饱和底 ≈ 主题色 14% 透明）
    ['--dsw-alias-state-success-tertiary', (c) => withAlpha(c.success, 0.14)],
    ['--dsw-alias-state-warn-tertiary', (c) => withAlpha(c.warning, 0.14)],
    ['--dsw-alias-state-business-tertiary', (c) => withAlpha(c.primary, 0.12)],
    // 行内 diff 行底（--dsw-alias-code-diff-added/deleted）不在这里：它依赖「最终落地的状态色」，
    // 必须在 buildTokens 末段、配对对比度修复之后再派生 → generate.ts 调 deriveDiffWash。
    ['--dsw-alias-label-dimmed', (c) => withAlpha(c.textMuted, 0.8)],
    ['--dsw-alias-button-tool-bar-fill', (c) => withAlpha(c.text, 0.1)],
    ['--dsw-alias-button-tool-bar-hover', (c) => withAlpha(c.text, 0.16)],
    ['--dsw-alias-button-tool-bar-fill-invisible', (c) => withAlpha(c.text, 0.04)],
    ['--dsw-alias-button-floating-hover', (c) => slot(c, 'backgroundElement')],
    ['--dsw-alias-button-ghost-active-hover', (c) => slot(c, 'backgroundElement')],
    ['--dsw-alias-interactive-bg-active', (c) => withAlpha(c.text, 0.14)],
    ['--dsw-alias-interactive-bg-hover', (c) => withAlpha(c.text, 0.08)],
    ['--dsw-alias-interactive-bg-hover-accent', (c) => withAlpha(c.primary, 0.2)],
    ['--dsw-alias-interactive-bg-hover-danger', (c) => withAlpha(c.error, 0.15)],
    ['--dsw-alias-interactive-bg-hover-solid', (c) => slot(c, 'backgroundElement')],
    // issue 70：宿主用 inverted 做真实边框（dsh-prompt 实证无 fallback 直引）；text-alpha 无色相，与彩色 border 并置即橙灰混杂，故跟边框走（inverted=border，inverted2=borderActive，与 l1/l2 对齐）
    ['--dsw-alias-border-inverted', (c) => slot(c, 'border')],
    ['--dsw-alias-border-inverted2', (c) => slot(c, 'borderActive')],
    ['--dsw-alias-scrollbar-bg-l1', (c) => withAlpha(c.text, 0.08)],
    ['--dsw-alias-scrollbar-bg-l2', (c) => withAlpha(c.text, 0.08)],
    ['--dsw-alias-scrollbar-hover-l1', (c) => slot(c, 'borderActive')],
    ['--dsw-alias-scrollbar-hover-l2', (c) => slot(c, 'borderActive')],
    // 侧边栏/设置面板导航项悬停与选中：DSH 默认随明暗模式取浅/深两套值，
    // 调色板未覆盖时在浅色系统（无 data-ds-dark-theme）下会白字撞浅底
    ['--dsw-specific-sidebar-nav-item-hover', (c) => withAlpha(c.text, 0.08)],
    ['--dsw-specific-sidebar-nav-item-active', (c) => withAlpha(c.text, 0.14)],
    ['--dsw-specific-sidebar-nav-item-active-accent', (c) => withAlpha(c.primary, 0.35)],
    // #120 缺陷 B：键帽底 = 浮层底 → 可读文字色混合（keycapColor 保证可辨识）；
    // 背景透明（委托画布）→ transparent 跳过，交还宿主默认配色。
    ['--dsw-alias-tooltip-key-bg', (c) => {
            const bg = c.backgroundElement;
            if (typeof bg !== 'string' || bg === 'transparent')
                return 'transparent';
            return keycapColor(bg);
        }],
    ];
    // ── 3. shiki 语法高亮变量（DSH 只认 10 个，opencode 的 9 个颜色做角色合并）──
    const SHIKI_MAP = [
    ['--shiki-foreground', 'text'],
    ['--shiki-token-comment', 'syntaxComment'],
    ['--shiki-token-keyword', 'syntaxKeyword'],
    ['--shiki-token-function', 'syntaxFunction'],
    ['--shiki-token-parameter', 'syntaxType'], // 类型≈参数槽（DSH 无独立 type 槽）
    ['--shiki-token-constant', 'syntaxNumber'],
    ['--shiki-token-string', 'syntaxString'],
    ['--shiki-token-string-expression', 'syntaxString'],
    ['--shiki-token-punctuation', 'syntaxOperator'], // 操作符≈标点槽
    ['--shiki-token-link', 'markdownLink'],
    ];
    // ── 4. 元素级规则：DSH 没有对应变量的部分，用选择器兜底 ──
    // 格式: { selector, prop, from }（from 缺失/透明 → 规则跳过）
    const CSS_RULES = [
    { selector: 'body h1,body h2,body h3,body h4,body h5,body h6', prop: 'color', from: 'markdownHeading' },
    { selector: 'a', prop: 'color', from: 'markdownLink' },
    // F1 链接：与上游 MarkdownText.module.css 选择器镜像（.markdown a 0,1,1 碾压裸 a 0,0,1；老 a 规则保留，老版继续命中）
    { selector: '.markdown a, .markdown .fileLink', prop: 'color', from: 'markdownLink' },
    { selector: 'code:not(pre code)', prop: 'color', from: 'markdownCode' },
    { selector: 'em', prop: 'color', from: 'markdownEmph' },
    { selector: 'strong', prop: 'color', from: 'markdownStrong' },
    { selector: 'blockquote', prop: 'color', from: 'markdownBlockQuote' },
    // issue 70：hr 跟边框走（桌面转换器惯例 markdownHorizontalRule=border；orng 数据里 hr 灰而 border 橙即混杂源）
    { selector: 'hr', prop: 'borderColor', from: 'border' },
    ];
    // ── 4b. tooltip 标签色选择器（#120）──
    // DSH 宿主 tooltip 气泡的标签色硬编码为 --dsw-static-neutral-bluish-00（白），没有 alias 变量可覆盖；
    // 全站 role="tooltip" 只此一处（气泡 span，内嵌 kbd 键帽），故用元素规则覆盖。
    // 特异性：`body [role="tooltip"]` = (0,1,1) > 宿主 `._bubble_xxx` = (0,1,0)，且本插件 <style> 后注入 → 双重胜出。
    // 文字色由 generate.ts 按 tooltip-bg 现算（正文色优先，不足 4.5 退纯黑/白）。
    const TOOLTIP_TEXT_SELECTOR = '[role="tooltip"]';
    // ── 6. 自定义主题 37 个颜色元数据（#84 建，#92 定稿组名；key 口径与 prototypes/custom-editor-83.prototype.html 的 GROUPS/ALL_KEYS_37/BG_KEYS 一致）──
    // 7 大分组 = 背景与表面 8 + 文字 2 + 品牌与状态 6 + 边框 2 + 改动对比 6 + Markdown 6 + 代码高亮 7 = 37
    // allowTransparent 仅 8 个背景槽为 true（其余 29 槽设 transparent 会被编辑器 reducer 拦截）；fallback 为 5 个扩展槽的默认继承源；previewSlot 为微缩画布 data-slot（恒等于 key）。
    const COLOR_SLOT_GROUPS = [
    { id: 'bg', keys: ['background', 'backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg'] },
    { id: 'text', keys: ['text', 'textMuted'] },
    { id: 'brand', keys: ['primary', 'secondary', 'info', 'success', 'warning', 'error'] },
    { id: 'border', keys: ['border', 'borderActive'] },
    { id: 'diff', keys: ['diffAdded', 'diffRemoved', 'diffAddedBg', 'diffRemovedBg', 'diffAddedLineNumberBg', 'diffRemovedLineNumberBg'] },
    { id: 'md', keys: ['markdownHeading', 'markdownLink', 'markdownCode', 'markdownEmph', 'markdownStrong', 'markdownBlockQuote'] },
    { id: 'syn', keys: ['syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator'] },
    ];
    const COLOR_SLOTS = [
    { key: 'background', group: 'bg', allowTransparent: true, fallback: null, previewSlot: 'background' },
    { key: 'backgroundPanel', group: 'bg', allowTransparent: true, fallback: null, previewSlot: 'backgroundPanel' },
    { key: 'backgroundElement', group: 'bg', allowTransparent: true, fallback: null, previewSlot: 'backgroundElement' },
    { key: 'sidebarBg', group: 'bg', allowTransparent: true, fallback: 'background', previewSlot: 'sidebarBg' },
    { key: 'bubbleBg', group: 'bg', allowTransparent: true, fallback: 'backgroundPanel', previewSlot: 'bubbleBg' },
    { key: 'inputBg', group: 'bg', allowTransparent: true, fallback: 'backgroundPanel', previewSlot: 'inputBg' },
    { key: 'codeBlockBg', group: 'bg', allowTransparent: true, fallback: 'backgroundPanel', previewSlot: 'codeBlockBg' },
    { key: 'codeHeaderBg', group: 'bg', allowTransparent: true, fallback: 'backgroundElement', previewSlot: 'codeHeaderBg' },
    { key: 'text', group: 'text', allowTransparent: false, fallback: null, previewSlot: 'text' },
    { key: 'textMuted', group: 'text', allowTransparent: false, fallback: null, previewSlot: 'textMuted' },
    { key: 'primary', group: 'brand', allowTransparent: false, fallback: null, previewSlot: 'primary' },
    { key: 'secondary', group: 'brand', allowTransparent: false, fallback: null, previewSlot: 'secondary' },
    { key: 'info', group: 'brand', allowTransparent: false, fallback: null, previewSlot: 'info' },
    { key: 'success', group: 'brand', allowTransparent: false, fallback: null, previewSlot: 'success' },
    { key: 'warning', group: 'brand', allowTransparent: false, fallback: null, previewSlot: 'warning' },
    { key: 'error', group: 'brand', allowTransparent: false, fallback: null, previewSlot: 'error' },
    { key: 'border', group: 'border', allowTransparent: false, fallback: null, previewSlot: 'border' },
    { key: 'borderActive', group: 'border', allowTransparent: false, fallback: null, previewSlot: 'borderActive' },
    { key: 'diffAdded', group: 'diff', allowTransparent: false, fallback: null, previewSlot: 'diffAdded' },
    { key: 'diffRemoved', group: 'diff', allowTransparent: false, fallback: null, previewSlot: 'diffRemoved' },
    { key: 'diffAddedBg', group: 'diff', allowTransparent: false, fallback: null, previewSlot: 'diffAddedBg' },
    { key: 'diffRemovedBg', group: 'diff', allowTransparent: false, fallback: null, previewSlot: 'diffRemovedBg' },
    { key: 'diffAddedLineNumberBg', group: 'diff', allowTransparent: false, fallback: null, previewSlot: 'diffAddedLineNumberBg' },
    { key: 'diffRemovedLineNumberBg', group: 'diff', allowTransparent: false, fallback: null, previewSlot: 'diffRemovedLineNumberBg' },
    { key: 'markdownHeading', group: 'md', allowTransparent: false, fallback: null, previewSlot: 'markdownHeading' },
    { key: 'markdownLink', group: 'md', allowTransparent: false, fallback: null, previewSlot: 'markdownLink' },
    { key: 'markdownCode', group: 'md', allowTransparent: false, fallback: null, previewSlot: 'markdownCode' },
    { key: 'markdownEmph', group: 'md', allowTransparent: false, fallback: null, previewSlot: 'markdownEmph' },
    { key: 'markdownStrong', group: 'md', allowTransparent: false, fallback: null, previewSlot: 'markdownStrong' },
    { key: 'markdownBlockQuote', group: 'md', allowTransparent: false, fallback: null, previewSlot: 'markdownBlockQuote' },
    { key: 'syntaxComment', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxComment' },
    { key: 'syntaxKeyword', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxKeyword' },
    { key: 'syntaxFunction', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxFunction' },
    { key: 'syntaxType', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxType' },
    { key: 'syntaxNumber', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxNumber' },
    { key: 'syntaxString', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxString' },
    { key: 'syntaxOperator', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxOperator' },
    ];
    // 32 色内置配色 → 37 色完整配色：仅补齐未显式指定的 5 个扩展槽（已显式的保持不动，纯函数不改入参）。
    // 回退链：sidebarBg←background；bubbleBg/inputBg/codeBlockBg←backgroundPanel；codeHeaderBg←backgroundElement。
    function normalizeThemeColors(colors) {
    const c = Object.assign({}, colors || {});
    if (c.sidebarBg === undefined || c.sidebarBg === null)
        c.sidebarBg = c.background;
    if (c.bubbleBg === undefined || c.bubbleBg === null)
        c.bubbleBg = c.backgroundPanel;
    if (c.inputBg === undefined || c.inputBg === null)
        c.inputBg = c.backgroundPanel;
    if (c.codeBlockBg === undefined || c.codeBlockBg === null)
        c.codeBlockBg = c.backgroundPanel;
    if (c.codeHeaderBg === undefined || c.codeHeaderBg === null)
        c.codeHeaderBg = c.backgroundElement;
    return c;
    }

    __mods["map-dsh"] = { TOKEN_MAP, deriveDiffWash, DERIVED_TOKENS, SHIKI_MAP, CSS_RULES, TOOLTIP_TEXT_SELECTOR, COLOR_SLOT_GROUPS, COLOR_SLOTS, normalizeThemeColors }
    })();


    // ——————————————————— generate ———————————————————
    (function () {
    // generate.ts — 生成器：解析后的主题颜色 + 排印参数 → DSH 注入物 { tokens, css }
    // 不变式：输出完全由输入决定（确定性）；system 主题（colors=null）只输出排印，不碰颜色
    const { TOKEN_MAP, DERIVED_TOKENS, SHIKI_MAP, CSS_RULES, normalizeThemeColors, TOOLTIP_TEXT_SELECTOR, deriveDiffWash } = __mods["map-dsh"]
    const { withAlpha, isDelegatedSurface, ensureDiffContrast, blendOntoBase, contrastRatio, readableTextOn } = __mods["resolve"]
    const { repairPairContrast } = __mods["pair-contrast"]
    const TRANSPARENT = 'transparent';
    function isError(v) {
    return typeof v === 'object' && v !== null && Boolean(v.__error);
    }
    function usable(colors, from) {
    const c = colors;
    const v = c[from];
    if (v === undefined || v === null)
        return null;
    if (v === TRANSPARENT)
        return null;
    if (isError(v))
        return null;
    return v;
    }
    // token 层：overrideTokens 需要的 { light, dark } 对象
    // issue 45：委托画布按外观取作者值，缺半边不跨外观回填（宁可缺席走宿主默认，也不伪造对侧值）。
    // #120 缺陷 A：单套色（自定义 / IP 主题，delegated=false）两半各自按自己的 isDark 修复——
    // light 半用 light repair（向白提亮），dark 半用 dark repair（向黑压暗）；旧实现把 dark 修复
    // 写进两半，浅色自定义主题的 diff 底因此被压成 #000000。单参调用仍兼容（两半同源，仅兜底方向不同）。
    function buildTokens(darkColors, lightColors, delegated) {
    const rawDark = darkColors || {};
    const rawLight = (lightColors === undefined) ? rawDark : (lightColors || {});
    // #120 缺陷 A：lightColors 与 darkColors 是同一对象 = 单套色主题（renderCustomTheme 传 norm 两次）
    // 还是两套配色（预置主题，light/dark 各自解析）？只有单套色主题需要「两半各自修复」。
    const singlePalette = lightColors !== undefined && lightColors === darkColors;
    darkColors = ensureDiffContrast(normalizeThemeColors(rawDark), true);
    const light = ensureDiffContrast(normalizeThemeColors(rawLight), false);
    const del = (lightColors === undefined) ? false : !!delegated;
    const tokens = {};
    const put2 = (name, lv, dv) => {
        const lok = lv !== null && lv !== undefined;
        const dok = dv !== null && dv !== undefined;
        if (!lok && !dok)
            return;
        if (!del) {
            if (singlePalette) {
                // 单套色主题（自定义 / IP 主题）：两半各自按自己的 isDark 修复。light 半用第 79 行的
                // light repair（向白提亮），dark 半用 dark repair（向黑压暗）；旧实现把 dark 修复写进
                // 两半，浅色自定义主题的 diff 底因此被压成 #000000。半边缺失回填另一侧，保持容错。
                const lightValue = (lv !== null && lv !== undefined) ? lv : dv;
                const darkValue = (dv !== null && dv !== undefined) ? dv : lv;
                tokens[name] = { light: lightValue, dark: darkValue };
                return;
            }
            // 两套配色但非委托画布（自持预置主题）：维持 issue 45 的「两半深色同值=深色观感」，
            // 颜色 CSS 走联合选择器同步用 dark 半；此处改动会破坏该不变式，故只对单套色生效。
            if (dok)
                tokens[name] = { light: dv, dark: dv };
            return;
        }
        if (lok && dok)
            tokens[name] = { light: lv, dark: dv };
        else if (dok)
            tokens[name] = { dark: dv };
        else if (lv !== null && lv !== undefined)
            tokens[name] = { light: lv };
    };
    for (const [dshVar, from] of TOKEN_MAP) {
        if (from === '__transparent__') {
            put2(dshVar, TRANSPARENT, TRANSPARENT);
            continue;
        }
        put2(dshVar, usable(light, from), usable(darkColors, from));
    }
    for (const [dshVar, fn] of DERIVED_TOKENS) {
        // 元组元素在 map-dsh 未类型化时是 (string | fn) 联合；运行时非函数一律跳过（原实现也是 try 后跳过）
        if (typeof dshVar !== 'string' || typeof fn !== 'function')
            continue;
        let lv;
        try {
            lv = fn(light);
        }
        catch (e) {
            lv = undefined;
        }
        let dv;
        try {
            dv = fn(darkColors);
        }
        catch (e) {
            dv = undefined;
        }
        if (lv === TRANSPARENT)
            lv = null;
        if (dv === TRANSPARENT)
            dv = null;
        put2(dshVar, lv, dv);
    }
    for (const [dshVar, from] of SHIKI_MAP) {
        put2(dshVar, usable(light, from), usable(darkColors, from));
    }
    // 配对对比度兜底（pair-contrast.ts）：宿主里真实存在的「文字色压在同一规则的背景色上」
    // 配对（主色按钮反白字、错误药丸、警告标签、错误提示文字…）不达标时，只把其中一侧沿黑/白
    // 推离到刚过 4.5 的最小一步；已经在阈上的主题一个字节都不会变。两半各自按自己的页面底判定。
    // 行内 diff 行底（code-diff-*）此刻还没生成，因此那两条配对不参与本步——紧接着由
    // deriveDiffWash 按**修复后**的状态色重新派生，天然满足配对与「色带可见」。
    const halves = ['light', 'dark'];
    const settled = {};
    for (const half of halves) {
        const values = {};
        for (const name of Object.keys(tokens))
            values[name] = tokens[name][half];
        const repaired = repairPairContrast(values);
        for (const name of repaired.changed) {
            const next = { ...tokens[name] };
            if (half === 'light')
                next.light = values[name];
            else
                next.dark = values[name];
            tokens[name] = next;
        }
        settled[half] = values;
    }
    // 行内 diff 行底：按每半**修复后**的值派生，再交回 put2 —— 半边存在性、「单套色主题两半各自
    // 修复」、「非委托主题两半同深色值」这些规则与其它 token 走同一条路，不另开写入口。
    const wash = (half, fg, seed) => {
        const value = deriveDiffWash(settled[half][fg], settled[half][seed], settled[half]['--dsw-alias-bg-base'], settled[half]['--dsw-alias-markdown-code-block']);
        return value === TRANSPARENT ? null : value;
    };
    for (const [name, fg, seed] of [
        ['--dsw-alias-code-diff-added', '--dsw-alias-state-success-primary', '--dsw-alias-file-diff-added-bg'],
        ['--dsw-alias-code-diff-deleted', '--dsw-alias-state-error-primary', '--dsw-alias-file-diff-deleted-bg'],
    ]) {
        put2(name, wash('light', fg, seed), wash('dark', fg, seed));
    }
    return tokens;
    }
    // ── tooltip 标签色（#120）──
    // DSH 宿主 tooltip 气泡的标签色在 CSS 里硬编码 --dsw-static-neutral-bluish-00（白），不读主题 alias，
    // 只映射 tooltip-bg 会出现「白字压浅色浮层」（浅色主题实测 1.00–1.25:1）。这里按 tooltip 底现算
    // 文字色并用元素规则覆盖：正文色优先（观感一致）；与底不足 4.5 时退纯黑/白（任意底至少一者 >= 4.58）。
    // 浮层底透明/缺席（委托画布）→ null 不发规则，交还宿主默认深底白字。
    const TOOLTIP_BG_TOKEN = '--dsw-alias-tooltip-bg';
    const TOOLTIP_TEXT_SOURCE = '--dsw-alias-label-primary';
    const TOOLTIP_TEXT_THRESHOLD = 4.5;
    function tooltipTextColor(tokens, mode) {
    const bg = tokens[TOOLTIP_BG_TOKEN] && tokens[TOOLTIP_BG_TOKEN][mode];
    if (!bg || bg === TRANSPARENT)
        return null;
    // tooltip 底可能带 alpha：先按宿主页面底（该半的 bg-base）合成为不透明色再算对比
    let bgEff = bg;
    const page = tokens['--dsw-alias-bg-base'] && tokens['--dsw-alias-bg-base'][mode];
    if (page && page !== TRANSPARENT) {
        try {
            bgEff = blendOntoBase(bg, page);
        }
        catch (e) {
            bgEff = bg;
        }
    }
    const text = tokens[TOOLTIP_TEXT_SOURCE] && tokens[TOOLTIP_TEXT_SOURCE][mode];
    if (text && text !== TRANSPARENT) {
        try {
            if (contrastRatio(blendOntoBase(text, bgEff), bgEff) >= TOOLTIP_TEXT_THRESHOLD)
                return text;
        }
        catch (e) { /* 退兜底 */ }
    }
    return readableTextOn(bgEff);
    }
    // 颜色 CSS（仅主题模式；system 不调用）
    // issue 45：自持画布走 legacy 联合选择器（字节一致）；委托画布按外观分区发射，
    // 浅色走宿主默认作用域，深色走宿主深色作用域。
    // #120：两分支都追加 tooltip 标签色规则（宿主唯一没有 alias 可覆盖的硬编码文字色）。
    function buildColorCss(darkColors, lightColors, tokens, delegated) {
    if (darkColors)
        darkColors = normalizeThemeColors(darkColors);
    if (lightColors)
        lightColors = normalizeThemeColors(lightColors);
    if (!delegated) {
        const decls = [];
        for (const name of Object.keys(tokens)) {
            const v = tokens[name] && tokens[name].dark;
            if (v && v !== TRANSPARENT)
                decls.push(name + ':' + v + ';');
        }
        const rules = [];
        for (const rule of CSS_RULES) {
            const v = usable(darkColors, rule.from);
            if (v === null)
                continue;
            rules.push(rule.selector + '{' + rule.prop + ':' + v + ';}');
        }
        // #120：tooltip 标签色覆盖（单套色两半的 tooltip 底同源，取 dark 半即可）
        const tooltipText = tooltipTextColor(tokens, 'dark');
        if (tooltipText !== null)
            rules.push('body ' + TOOLTIP_TEXT_SELECTOR + '{color:' + tooltipText + ';}');
        // 内联代码无芯片背景（固定规则，opencode TUI 同款）
        rules.push('code:not(pre code){background:transparent;}');
        return 'body,body[data-ds-dark-theme]{' + decls.join('') + '}' + rules.join('');
    }
    const declsFor = (mode) => {
        const out = [];
        for (const name of Object.keys(tokens)) {
            const v = tokens[name] && tokens[name][mode];
            if (v && v !== TRANSPARENT)
                out.push(name + ':' + v + ';');
        }
        return out.join('');
    };
    const scopeSel = (sel, prefix) => (/^body\b/.test(sel) ? sel.replace(/^body\b/, prefix) : prefix + ' ' + sel);
    const rulesFor = (colors, prefix) => {
        const out = [];
        for (const rule of CSS_RULES) {
            const v = usable(colors, rule.from);
            if (v === null)
                continue;
            out.push(scopeSel(rule.selector, prefix) + '{' + rule.prop + ':' + v + ';}');
        }
        return out.join('');
    };
    // #120：tooltip 标签色按两半各自的浮层底现算；浮层底透明的半边不发规则（宿主默认深底白字）
    const tooltipLight = tooltipTextColor(tokens, 'light');
    const tooltipDark = tooltipTextColor(tokens, 'dark');
    return 'body{' + declsFor('light') + '}' +
        'body[data-ds-dark-theme]{' + declsFor('dark') + '}' +
        rulesFor(lightColors, 'body') +
        rulesFor(darkColors, 'body[data-ds-dark-theme]') +
        (tooltipLight === null ? '' : 'body ' + TOOLTIP_TEXT_SELECTOR + '{color:' + tooltipLight + ';}') +
        (tooltipDark === null ? '' : 'body[data-ds-dark-theme] ' + TOOLTIP_TEXT_SELECTOR + '{color:' + tooltipDark + ';}') +
        'code:not(pre code){background:transparent;}';
    }
    // 只导出颜色两件套。上游另有 generateTheme / renderCustomTheme / customPreviewColors，
    // 那三个是「自定义 37 色编辑器」与「单套色主题」的入口，本插件没有这两个功能（主题来自
    // 上游 62 套固定配色，用户不改单个色槽），且它们内部无条件调用排印 CSS ——
    // 排版已按裁决舍弃，一并裁掉。
    __mods["generate"] = { buildTokens, buildColorCss }
    })();

    // ——————————————————— grouping ———————————————————
    (function () {
    // grouping.ts — 色系分组：按主题主色色相将 34 个主题分到色系组
    // 组合 1 布局依赖：组标题（色点+名称+数量）+ 组内 mini 芯片
    // 纯逻辑、无 DOM，node 可直接测试
    const { getThemeJson, isSystem, listThemes } = __mods["registry"]
    const { resolveThemeColors, hexToRgb } = __mods["resolve"]
    const GROUP_ORDER = ['warm', 'yellow-green', 'teal', 'cyan-blue', 'cool-blue', 'violet', 'neutral', 'transparent', 'special'];
    const GROUP_COLORS = {
    warm: '#FAB283',
    'yellow-green': '#A7C080',
    teal: '#2DD5B7',
    'cyan-blue': '#88C0D0',
    'cool-blue': '#82AAFF',
    violet: '#C4A7E7',
    neutral: '#9E9E9E',
    transparent: '#8B8B95',
    special: '#8B8B95',
    };
    // 色相：hex → 0-360；中性（低饱和/无色）→ -2；无值 → -1
    function hueOf(hex) {
    if (!hex)
        return -1;
    const { r, g, b } = hexToRgb(hex);
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const d = max - min;
    if (d === 0)
        return -2;
    const rr = r / 255, gg = g / 255, bb = b / 255;
    let h;
    if (max === rr)
        h = ((gg - bb) / d) % 6;
    else if (max === gg)
        h = (bb - rr) / d + 2;
    else
        h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0)
        h += 360;
    if (max === 0 ? 0 : d / max < 0.18)
        return -2;
    return h;
    }
    // ── 色系边界冻结（#68，2026-10-06 并排实测后拍板）──
    // 阈值 160 / 200 / 230 取「色族分界」的惯例整数，不按当前 38 主题样本拟合：
    //   warm <35 ｜ 黄绿 35–90 ｜ 青绿 90–160 ｜ 青蓝 160–200 ｜ 冷蓝 200–230 ｜ 蓝紫 ≥230
    // 契约是「分区」，数字只是实现：若改成按样本取的中点（163.2/197.7/242.9），上游一加主题它就
    // 既非惯例、也非最优，成为历史化石。主题数据钉在不可变 commit（sync-themes 的 OPCODE_SHA ＋
    // MANIFEST 指纹），越界只可能发生在人为 --update-baseline 升级时——所以薄余量是跳闸线，不是风险。
    // 实测余量（dark 基线主色，最近主题距边界；tests/group-boundary.test.mjs 守 ≥2°）：
    //   160：Gruvbox 157.1（下 2.9）／大阪翡翠 169.3（上 9.3）
    //   200：Cursor·北极 193.3（下 6.7）／Ayu 202.0（上 2.0）
    //   230：水星 226.7（下 3.3）／光环 259.0（上 29.0）　（区间内任意阈值分组不变；±5° 最多翻 3 个主题）
    // 160 两侧的观感差主要来自饱和度（Gruvbox 灰青 vs 大阪翡翠 鲜亮），色相序仍是唯一判据：分组只做
    // 导航、不做色彩描述，故不引入第二维（色度）判据——引入即产生无法全序化的并列桶。
    // 中文名体例（同步冻结）：青字头覆盖 [90,200)（青绿／青蓝 共享字头、尾字分色向），[200,230) 用冷字头
    // （冷蓝）区分纯蓝段。整组名体系 = 两端温度锚（暖橙／冷蓝）＋中段邻接复合（黄绿／青绿／青蓝／蓝紫），
    // 本就不是平行前缀；英文侧按英语习惯（Teal／Violet 为单词色名）而非与中文同构，同样冻结。
    // 分组键恒取 dark 基线（issue 47）：浅色宿主的芯片预览色可落在别组（7 个主题），既有裁决、不是漂移。
    function groupOf(name, colors) {
    if (isSystem(name))
        return 'special';
    if (colors.background === null)
        return 'transparent';
    const h = hueOf(colors.primary);
    if (h === -2)
        return 'neutral';
    if (h < 35)
        return 'warm';
    if (h < 90)
        return 'yellow-green';
    if (h < 160)
        return 'teal';
    if (h < 200)
        return 'cyan-blue';
    if (h < 230)
        return 'cool-blue';
    return 'violet';
    }
    // 解析单个主题的预览关键色（transparent → null）
    // mode 缺省 dark（调用方兼容）；面板按宿主外观传入 light/dark（issue 45）
    function resolvePreview(name, mode) {
    if (isSystem(name)) {
        return { background: null, text: null, primary: null, accent: null, error: null, warning: null, success: null };
    }
    const json = getThemeJson(name);
    if (!json)
        return null;
    const c = resolveThemeColors(json, mode || 'dark');
    const pick = (k) => {
        const v = c[k];
        if (v === undefined)
            return undefined;
        if (typeof v === 'string')
            return v === 'transparent' ? null : v;
        return null; // ColorError：解析失败的颜色没有可预览色
    };
    return {
        background: pick('background'),
        text: pick('text'),
        primary: pick('primary'),
        accent: pick('accent'),
        error: pick('error'),
        warning: pick('warning'),
        success: pick('success'),
    };
    }
    function themeGroups(mode) {
    const m = mode || 'dark';
    const buckets = {};
    for (const name of listThemes()) {
        // listThemes 只给注册表内名字：system 有固定色对象，其余必有 JSON，解析必非空
        const colors = resolvePreview(name, m);
        const groupKey = m === 'dark' ? colors : resolvePreview(name, 'dark');
        const g = groupOf(name, groupKey);
        (buckets[g] = buckets[g] || []).push({ name: name, colors: colors });
    }
    return GROUP_ORDER
        .filter((g) => buckets[g] !== undefined)
        .map((g) => ({ name: g, color: GROUP_COLORS[g], themes: buckets[g] }));
    }

    __mods["grouping"] = { GROUP_ORDER, GROUP_COLORS, hueOf, groupOf, resolvePreview, themeGroups }
    })();

// ==== 04-theme.js ====
    // —— 主题引擎的模块引用 ——
    // 02 段（引擎）执行时填充 __mods；这里是取值，不是重新定义。
    const RESOLVE = __mods['resolve'];
    const MAP_DSH = __mods['map-dsh'];
    const GENERATE = __mods['generate'];
    const GROUPING = __mods['grouping'];

    // 只认不透明的 6 位 hex。带 alpha 的（rgba/#rrggbbaa）和 'transparent' 都不碰 ——
    // 半透明是设计意图（比如引用块底色、代码块叠加），推离它会破坏原意。
    const SOLID_HEX = /^#[0-9a-fA-F]{6}$/;

    function isSolidHex(value) {
      return typeof value === 'string' && SOLID_HEX.test(value);
    }

    // 一个前景色在若干底色上的「最差」对比度。最差达标才算达标。
    function worstContrast(fg, backgrounds) {
      let worst = null;
      for (const bg of backgrounds) {
        const c = RESOLVE.contrastRatio(fg, bg);
        if (typeof c !== 'number' || !isFinite(c)) continue;
        if (worst === null || c < worst) worst = c;
      }
      return worst;
    }

    /**
     * 语义色对比度修复（上游没有这一层）。
     *
     * 上游 62 套主题的 Markdown/语法色有 250/636 对低于 4.5:1，最差 1.00:1
     * （加粗与正文完全同色，等于没有加粗）。上游的 repairPairContrast 只覆盖
     * HOST_TEXT_PAIRS 里那 59 条界面文字对，语义色一条都没进去，所以永远不会被修。
     *
     * 做法：在「色槽层」修，而不是令牌层 —— 一个色槽同时喂 overrideTokens 的令牌
     * 和 <style> 里的元素级规则（strong/em/blockquote…），修色槽两处一起受益。
     *
     * 规则：
     *  · 已达标 → 一个字节都不动（保住主题原味，这是用户明确要的）
     *  · 未达标 → 保持色相，向黑或白逐档混，第一档达标就停（2% 步长，尽量贴近原色）
     *  · 推离时避开本次已用过的色值，免得两个角色塌成同一个颜色
     *  · 极端情况兜底到纯黑/纯白（任一底色上至少一端 ≥4.58，数学上必然达标）
     */
    // 委托画布（透光橙）的 background 是 transparent，真实底色是壁纸，运行时才知道。
    // 拿正文色 markdownText 的亮度反推一个极限底：正文是浅色的，假定底色就是黑的。
    // 这样修出来的前景色在黑底上达标，在真实壁纸上（通常比纯黑亮）也基本达标；
    // 反之亦然。宁可修得保守一点，也不让加粗在浅色壁纸上彻底消失。
    function assumedCanvas(colors) {
      const text = colors.markdownText;
      if (!isSolidHex(text)) return null;
      return RESOLVE.relativeLuminance(text) > 0.5 ? '#000000' : '#FFFFFF';
    }

    function repairSemanticContrast(colors, delegated) {
      const out = Object.assign({}, colors);

      // 底色只有一个：主题的 background。
      // markdownText 不能当底色 —— 它是正文前景，拿它当底会把「加粗 vs 正文」
      // 这种正常组合判成 1.00:1（实测 957 对里误报 591 对）。
      const backgrounds = [];
      if (delegated) {
        const assumed = assumedCanvas(out);
        if (assumed) backgrounds.push(assumed);
      } else if (isSolidHex(out.background)) {
        backgrounds.push(out.background);
      }
      if (!backgrounds.length) return out;

      // 选推离方向：看黑端还是白端能给出的对比度更高。
      // 用所有底色的最差值来选，避免对某个底修好了、对另一个底更糟。
      const blackWorst = worstContrast('#000000', backgrounds) || 0;
      const whiteWorst = worstContrast('#FFFFFF', backgrounds) || 0;
      const end = blackWorst >= whiteWorst ? '#000000' : '#FFFFFF';

      // 已占用的色值。初始为空 —— 达标色只登记不修改。
      const taken = new Set();

      for (const slot of SEMANTIC_FOREGROUNDS) {
        const current = out[slot];
        if (!isSolidHex(current)) continue;

        const worst = worstContrast(current, backgrounds);
        if (worst === null) continue;
        if (worst >= SEMANTIC_MIN_CONTRAST) {
          taken.add(current.toUpperCase());
          continue;
        }

        let next = null;
        for (let k = PUSH_STEP; k <= 1.0001; k += PUSH_STEP) {
          const candidate = RESOLVE.mixHex(current, end, Math.min(1, k)).toUpperCase();
          if (taken.has(candidate)) continue;
          const c = worstContrast(candidate, backgrounds);
          if (c !== null && c >= SEMANTIC_MIN_CONTRAST) {
            next = candidate;
            break;
          }
        }
        if (!next) next = end;

        out[slot] = next;
        taken.add(next);
      }

      return out;
    }

    // —— 主题元信息 ——
    // 名称口径：中文名优先，其次 IP 预置自带的中文名，再次官方英文名，最后退回 id。
    // 这跟上游 zh-names 模块的口径一致：13 套没有公认中文译名的保留原名。
    function themeMetaOf(id, delegated) {
      const preset = ipPresetById(id);
      const name = THEME_ZH[id] || (preset && preset.name) || THEME_EN[id] || id;
      return { id, name, delegated };
    }

    /**
     * 渲染一套主题：令牌层数据 + 元素级 CSS。
     *
     * 只取颜色那一半：resolveThemeColors → buildTokens + buildColorCss。
     * 上游的 generateTheme() 已在引擎里裁掉（它内部无条件写一整套字体变量和
     * body{font-size:13px}），排版功能按用户裁决舍弃，字体交给宿主官方设置。
     */
    function renderTheme(id) {
      const cached = themeCache.get(id);
      if (cached) return cached;

      let result = null;

      if (id === 'system') {
        // 跟随宿主：不注册任何令牌层、不注入任何规则，宿主自己就是最终结果。
        result = {
          tokens: {},
          css: '',
          delegated: true,
          meta: { id: 'system', name: THEME_ZH.system || '跟随系统', delegated: true },
        };
      } else if (Object.prototype.hasOwnProperty.call(THEMES, id)) {
        const json = THEMES[id];
        const darkRaw = RESOLVE.resolveThemeColors(json, 'dark');
        const lightRaw = RESOLVE.resolveThemeColors(json, 'light');
        const delegated = RESOLVE.isDelegatedSurface(darkRaw, lightRaw);
        const dark = repairSemanticContrast(darkRaw, delegated);
        const light = repairSemanticContrast(lightRaw, delegated);
        // 第三参数（是否按明暗分别发射）恒为 true —— 与「画布是否委托」是两件事：
        //  · delegated 由 isDelegatedSurface 判定（三背景槽是否都 transparent），
        //    决定画布令牌要不要写、壁纸层会不会被盖住，供 UI 与层序使用；
        //  · 发射模式决定 light/dark 两半是否各用自己那套配色。
        // 上游把两者绑在同一个参数上：非委托主题一律写 {light:dv, dark:dv}，
        // 于是 36 套实色主题的浅色配色被整段丢弃，浅色模式下仍是深色底
        // （catppuccin light 本该是 #EFF1F5，实际写成 #1E1E2E）。上游是换肤插件，
        // 选中即固定外观，这样没错；但本插件的主题是跟随宿主明暗的，
        // 主题 JSON 里 37 套有 36 套都给了可用的浅色值，必须用起来。
        // 拆开后：令牌数不变（106 / 70），只是两半各用各的；
        // 透光橙的 bg-base 依然整条跳过（usable() 对 transparent 返回 null），
        // 所以画布委托的语义没有被破坏。
        const tokens = GENERATE.buildTokens(dark, light, true);
        const css = GENERATE.buildColorCss(dark, light, tokens, true);
        result = { tokens, css, delegated, meta: themeMetaOf(id, delegated) };
      } else {
        const preset = ipPresetById(id);
        if (!preset) return null;
        // IP 预置只有一套色（没有 dark/light 之分），所以两半传同一个对象：
        // buildTokens 内部判定 singlePalette，会把同一个值同时写进 light 和 dark。
        const norm = MAP_DSH.normalizeThemeColors(preset.colors);
        const fixed = repairSemanticContrast(norm, false);
        const tokens = GENERATE.buildTokens(fixed, fixed, false);
        const css = GENERATE.buildColorCss(fixed, fixed, tokens, false);
        result = { tokens, css, delegated: false, meta: themeMetaOf(id, false) };
      }

      themeCache.set(id, result);
      return result;
    }

    // 芯片上画的小色点：底/字/品牌/强调四色足够辨认主题性格。
    function previewOf(id, mode) {
      if (id === 'system') return null;
      if (Object.prototype.hasOwnProperty.call(THEMES, id)) {
        return GROUPING.resolvePreview(id, mode);
      }
      const preset = ipPresetById(id);
      if (!preset) return null;
      const c = MAP_DSH.normalizeThemeColors(preset.colors);
      return {
        background: c.background,
        text: c.text,
        primary: c.primary,
        accent: c.accent,
        error: c.error,
        warning: c.warning,
        success: c.success,
      };
    }

    function disposeThemeLayer() {
      if (themeDispose) {
        try { themeDispose(); } catch (e) { /* 宿主已卸载 */ }
        themeDispose = null;
      }
      if (themeStyleEl) {
        if (themeStyleEl.parentNode) themeStyleEl.parentNode.removeChild(themeStyleEl);
        themeStyleEl = null;
      }
    }

    /**
     * 把当前主题装上去。两条腿走路（跟上游一致）：
     *  1. ctx.theme.overrideTokens() —— 令牌层，参与宿主的 composeActive 合并，
     *     宿主会在明暗切换时自动重算，这是「跟随系统」能工作的前提。
     *  2. <style> 注入 buildColorCss() 的输出 —— 令牌层管不到的元素
     *     （strong / em / blockquote / hr / a / code:not(pre code)）靠它兜底。
     *     顺带也写了 body{--dsw-*}，会被宿主 inline 的同名变量压掉，无害。
     */
    function applyTheme() {
      disposeThemeLayer();
      const render = renderTheme(state.theme);
      if (!render || !ctx) return;

      if (render.css && typeof document !== 'undefined') {
        const style = document.createElement('style');
        style.setAttribute(STYLE_ATTR, state.theme);
        style.textContent = render.css;
        document.head.appendChild(style);
        themeStyleEl = style;
      }

      const names = Object.keys(render.tokens);
      if (names.length) {
        themeDispose = ctx.theme.overrideTokens(SOURCE_THEME, render.tokens);
      }
    }

    /**
     * 重放所有覆盖层，顺序即优先级（后注册的 seq 更大，排在合并链上层）。
     *
     * 两种顺序对应两种诉求：
     *  · 默认（bgIgnoreTheme=false）：壁纸层先、主题层后 → 实色主题盖住壁纸，
     *    这是主题的设计意图；而透光橙不写画布令牌，壁纸层照样生效。
     *  · 打开「忽略主题背景」：主题层先、壁纸层后 → 壁纸压过任何主题的实色画布。
     *
     * 顺带解决一个副作用：bgApplySurface() 要读 getComputedStyle(body) 的当前底色
     * 才能算出 color-mix 的百分比，所以它必须在主题层注册之后跑，读到的才是
     * 「这个主题下的底色」。默认顺序下它读的是宿主底色 —— 对透光橙正好等价。
     */
    function reapplyLayers() {
      if (state.bgIgnoreTheme) {
        applyTheme();
        bgApplySurface();
      } else {
        bgApplySurface();
        applyTheme();
      }
    }

    function setTheme(id) {
      if (!isKnownTheme(id) || state.theme === id) return;
      state.theme = id;
      saveState();
      reapplyLayers();
      notify();
    }

    function setBgIgnoreTheme(value) {
      const next = value === true;
      if (state.bgIgnoreTheme === next) return;
      state.bgIgnoreTheme = next;
      saveState();
      reapplyLayers();
      notify();
    }

    // 当前主题的元信息（设置页标题行与诊断文案用）。
    function currentThemeMeta() {
      const render = renderTheme(state.theme);
      if (render) return render.meta;
      return { id: state.theme, name: state.theme, delegated: false };
    }

// ==== 05-bg.js ====
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

// ==== 06-ui.js ====
    // ══════════════════════════════════════════════════════════════════════════
    // 设置页 UI
    //
    // 三块：主题（主功能，62 套按色系分组）/ 壁纸 / 忽略主题背景开关。
    // 卡片顺序即重要性顺序 —— 主题在前，壁纸在后。
    // ══════════════════════════════════════════════════════════════════════════

    // 当前明暗。主题自带 light / dark 两套配色，靠宿主 body[data-ds-dark-theme] 切换，
    // 插件不自己维护明暗状态 —— 那是官方 General 页的职责（D5 去重决策）。
    function currentMode() {
      try {
        const snap = ctx && ctx.theme && ctx.theme.getTheme ? ctx.theme.getTheme() : null;
        const active = snap && snap.active;
        if (active && active.colorScheme === 'dark') return 'dark';
      } catch (e) { /* 宿主未就绪 */ }
      return 'light';
    }

    // —— 胶囊选择行（壁纸填充/顺序/间隔共用）——
    function ChipRow({ options, value, onSelect }) {
      return h('div', { className: 'ios-thm-chips' },
        options.map((o) => h('button', {
          key: o.id,
          type: 'button',
          className: 'ios-thm-chip' + (value === o.id ? ' ios-thm-chip-active' : ''),
          'aria-pressed': value === o.id,
          onClick: () => onSelect(o.id),
        }, o.label)));
    }

    // 一个主题芯片：左侧色点 + 名称 + 选中勾。色点用主题自己的 background/primary。
    //
    // 选中态为什么要加勾号：原来只靠一圈品牌色描边区分「当前用这套」，
    // 但描边和 hover 描边在弱对比主题下几乎一样，色盲用户也分不出色差。
    // 勾号是形状信号，不依赖颜色辨识；描边与勾号同时保留，任一通道都能认出。
    function ThemeChip({ id, name, colors, active, onSelect }) {
      const dot = colors && (colors.background || colors.primary)
        ? (colors.background || colors.primary)
        : null;
      const dot2 = colors && colors.primary ? colors.primary : null;
      return h('button', {
        type: 'button',
        className: 'ios-thm-tchip' + (active ? ' ios-thm-tchip-active' : ''),
        // role=radio + aria-checked 是「一组里只能选一个」的正确语义；
        // aria-pressed 保留是为了不破坏既有断言与旧宿主兼容。
        role: 'radio',
        'aria-checked': !!active,
        'aria-pressed': !!active,
        title: active ? name + '（当前使用）' : name,
        onClick: () => onSelect(id),
      },
        // 双色圆点：底色 + 品牌色，一眼看出主题性格。透明主题只画描边圈。
        h('span', {
          className: 'ios-thm-tdot' + (dot ? '' : ' ios-thm-tdot-empty'),
          style: dot
            ? { backgroundColor: dot, boxShadow: dot2 ? 'inset -4px 0 0 0 ' + dot2 : 'none' }
            : undefined,
        }),
        h('span', { className: 'ios-thm-tname' }, name),
        // 勾号只给选中的那个渲染：全部渲染会让每格都多一个空位，名称更挤。
        // aria-hidden 因为语义已由 aria-checked 表达，读屏再念一次「对勾」是噪音。
        active ? h('span', { className: 'ios-thm-tcheck', 'aria-hidden': 'true' }, '\u2713') : null);
    }

    // —— 主题卡片：按色系分组 ——
    // 分组由引擎的 grouping 模块算（hue 聚成 9 组），这里只管画。
    // 62 套平铺找起来累，分组 + 组色标题是 opencode-palette 验证过的信息组织方式。
    const GROUP_LABELS = {
      warm: '暖色',
      'yellow-green': '黄绿',
      teal: '青绿',
      'cyan-blue': '青蓝',
      'cool-blue': '冷蓝',
      violet: '蓝紫',
      neutral: '中性',
      transparent: '透光',
      special: '特殊',
    };

    function ThemeCard() {
      const mode = currentMode();
      const groups = GROUPING.themeGroups(mode);

      // IP 预置不在 themeGroups 里（那是 THEMES 的 37 套 + system），单独收成一组。
      const ipChips = ipPresetIds().map((id) => {
        const preset = ipPresetById(id);
        return { id, name: (preset && preset.name) || id, colors: previewOf(id, mode) };
      });

      const sections = groups.map((g) => ({
        key: g.name,
        label: GROUP_LABELS[g.name] || g.name,
        color: g.color,
        chips: g.themes.map((t) => ({
          id: t.name,
          name: THEME_ZH[t.name] || THEME_EN[t.name] || t.name,
          colors: t.colors,
        })),
      }));

      if (ipChips.length) {
        sections.push({ key: 'ip', label: 'IP 预置', color: '#8B8B95', chips: ipChips });
      }

      return h('div', { className: 'ios-thm-card' },
        h('div', { className: 'ios-thm-card-title' }, '主题'),
        h('div', { className: 'ios-thm-card-sub' },
          '62 套配色，每套自带 Markdown 与代码高亮色；另有「跟随系统」不覆盖任何颜色。切换后立即生效，明暗跟随宿主。'),
        sections.map((sec) => h('div', { key: sec.key, className: 'ios-thm-group' },
          h('div', { className: 'ios-thm-group-head' },
            h('span', { className: 'ios-thm-group-dot', style: { backgroundColor: sec.color } }),
            h('span', { className: 'ios-thm-group-name' }, sec.label),
            h('span', { className: 'ios-thm-group-count' }, String(sec.chips.length))),
          // role=radiogroup：让读屏把这一格当成「单选组」，配合芯片上的 role=radio。
          // aria-label 用分组名，否则读屏只念「单选按钮组」不说是哪一组。
          h('div', { className: 'ios-thm-tgrid', role: 'radiogroup', 'aria-label': sec.label },
            sec.chips.map((c) => h(ThemeChip, {
              key: c.id,
              id: c.id,
              name: c.name,
              colors: c.colors,
              active: state.theme === c.id,
              onSelect: setTheme,
            }))))));
    }

    // —— 主题状态行（只读）——
    // 官方 General 页已经能切明暗、调字体，这里不重复造开关（D5 决策）。
    // 只说明「现在是什么主题、明暗是什么、壁纸会不会被盖住」。
    function themeStatusText() {
      const meta = currentThemeMeta();
      const mode = currentMode() === 'dark' ? '深色' : '浅色';
      const parts = [meta.name + ' · ' + mode];
      if (meta.delegated) parts.push('画布交给宿主，壁纸可见');
      else if (state.bg.enabled && !state.bgIgnoreTheme) parts.push('实色画布，壁纸被盖住');
      return parts.join(' · ');
    }

    // —— 忽略主题背景 ——
    // 打开后壁纸层排在主题层之后（seq 更大 → 合并时胜出），且读到的是主题的实色底，
    // 于是变成「主题色 N% + 壁纸透出」—— 任何主题都能得到透光效果，不只是透光橙。
    function IgnoreThemeRow() {
      const on = state.bgIgnoreTheme;
      const meta = currentThemeMeta();
      const hint = meta.delegated
        ? '当前主题本身透光，此开关不影响'
        : on
          ? '壁纸压在主题之上，主题底色变成半透明'
          : '主题的实色画布会盖住壁纸';
      return h('div', { className: 'ios-thm-row' },
        h('div', { className: 'ios-thm-row-text' },
          h('div', { className: 'ios-thm-row-label' }, '忽略主题背景'),
          h('div', { className: 'ios-thm-row-sub' }, hint)),
        h('button', {
          type: 'button',
          role: 'switch',
          'aria-checked': on,
          'aria-label': '忽略主题背景',
          className: 'ios-thm-switch',
          onClick: () => setBgIgnoreTheme(!on),
        }, h('span', { className: 'ios-thm-switch-knob' })));
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

      return h('div', { className: 'ios-thm-page' },
        h('div', { className: 'ios-thm-status' },
          h('div', { className: 'ios-thm-status-main' }, themeStatusText()),
          h('div', { className: 'ios-thm-status-hint' },
            '明暗与字体由「通用设置 → 外观」控制，本页只负责配色与壁纸。')),
        h(ThemeCard, null),
        h(IgnoreThemeRow, null),
        h(BgCard, null));
    }

// ==== 07-css.js ====
    // ══════════════════════════════════════════════════════════════════════════
    // 样式表
    //
    // 四节：1 设置页 UI / 2 换肤过渡 / 3 背景图（壁纸）/ 4 背景图卡片控件
    //
    // 全部走宿主 --dsw-* 令牌，零硬编码颜色 —— 宿主换明暗时自动跟随。
    // 唯一例外是背景图自身的 color-mix 与 scrim，那必须由用户参数驱动。
    // ══════════════════════════════════════════════════════════════════════════

    const CSS = `
/* ===== 1. 设置页 UI ===== */
/* 卡片走宿主为设置页专门准备的语义令牌（settings-card-fill / -stroke），
   而不是手写 bg-layer-1 + border-l1 —— 前者会跟着 NEXT 的卡片规范走。 */
.ios-thm-page { display: flex; flex-direction: column; gap: 14px; padding: 2px 0 8px; }
.ios-thm-card { border: 1px solid var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l1)); border-radius: var(--dsw-radius-lg, 16px); background: var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-1)); padding: 16px; }

/* 页头状态行：刻意不用卡片样式，与设置行同级（13px / 20px 行高）。
   只读说明，不放任何开关 —— 明暗与字体归官方 General 页管（D5 去重）。 */
.ios-thm-status { display: flex; flex-direction: column; gap: 3px; padding: 0 2px 2px; }
.ios-thm-status-main { font-size: 13px; font-weight: 500; line-height: 20px; color: var(--dsw-alias-label-primary); }
.ios-thm-status-hint { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }

.ios-thm-card-title { margin: 0; font-size: 13px; font-weight: 600; line-height: 20px; color: var(--dsw-alias-label-primary); }
.ios-thm-card-sub { margin: 4px 0 12px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }

/* —— 主题选择：按色系分组 —— */
/* 62 套平铺会让人无从下手。分组标题用色系代表色的小圆点 + 数量，
   组内芯片两列自适应。组间距 14px，组内行距 8px —— 层次靠间距拉开，不靠加边框。 */
.ios-thm-group { margin-top: 14px; }
.ios-thm-group:first-of-type { margin-top: 0; }
.ios-thm-group-head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.ios-thm-group-dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%; }
.ios-thm-group-name { font-size: 12px; font-weight: 600; line-height: 18px; color: var(--dsw-alias-label-primary); }
.ios-thm-group-count { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }

.ios-thm-tgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; }
.ios-thm-tchip { display: flex; align-items: center; gap: 7px; min-width: 0; padding: 7px 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 12px); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 18px; text-align: left; cursor: pointer; transition: border-color .15s ease, box-shadow .15s ease, background-color .15s ease; }
.ios-thm-tchip:hover { border-color: var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-layer-2); }
.ios-thm-tchip:focus-visible { outline: none; box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent); }
/* 选中态：描边 + 底色 + 字重 + 勾号四重信号。
   之前只有一圈品牌色描边，和 hover 描边在弱对比主题下几乎分不出，
   色觉障碍用户也认不出。勾号是形状信号，不依赖颜色辨识。 */
.ios-thm-tchip-active {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, var(--dsw-alias-bg-base));
  font-weight: 600;
}
/* 勾号缩到 12px 是为了不挤名称：芯片最小宽 112px，减去 padding、色点、两处 gap
   只剩约 50px 给文字，勾号再大就放不下 4 个汉字了。 */
.ios-thm-tcheck {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  margin-left: auto;
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary-foreground, #fff);
  font-size: 8px;
  line-height: 1;
  font-weight: 700;
}
/* 色点：左半是主题背景色，右半 inset 描出品牌色 —— 一眼看出这套主题的性格。
   透光主题没有实色背景，只画一个描边空心圈，不假装有颜色。 */
.ios-thm-tdot { flex: 0 0 auto; width: 14px; height: 14px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgb(0 0 0 / 14%); }
.ios-thm-tdot-empty { border: 1px solid var(--dsw-alias-border-l3); background: transparent; box-shadow: none; }
/* 名称占满剩余宽度并在超长时省略，勾号才能稳定贴到右侧 ——
   否则名称短的主题会把勾号顶到中间，一行芯片里勾号位置忽左忽右。 */
.ios-thm-tname { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 滑块说明行：讲清「往哪边调、代价是什么」，不是复述数值。 */
.ios-thm-slider-hint { margin-top: 4px; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); }

/* —— 通用控件 —— */
.ios-thm-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.ios-thm-chip { padding: 5px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 999px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; cursor: pointer; transition: background-color .15s ease, color .15s ease, border-color .15s ease; }
.ios-thm-chip:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
/* 选中胶囊 = 品牌色底 + 前景色。前景走 label-primary-foreground 而不是写死 #fff：
   深色主题的品牌色偏亮，白字会读不出来。 */
.ios-thm-chip-active { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-label-primary-foreground, #fff); font-weight: 600; }
.ios-thm-field { margin-top: 12px; }
.ios-thm-preset { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto; white-space: nowrap; margin: 2px 0 4px; padding: 7px 14px; border: 1px solid var(--dsw-alias-brand-primary); border-radius: var(--dsw-radius-sm, 8px); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent); color: var(--dsw-alias-brand-primary); font-size: 12px; font-weight: 600; line-height: 18px; cursor: pointer; transition: background-color .15s ease; }
.ios-thm-preset:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); }
.ios-thm-field-label { margin-bottom: 6px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-primary); }

.ios-thm-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ios-thm-row-text { min-width: 0; }
.ios-thm-row-label { font-size: 13px; font-weight: 500; line-height: 20px; color: var(--dsw-alias-label-primary); }
.ios-thm-row-sub { margin-top: 2px; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); }

/* 诊断读数用 label-secondary 而不是 label-tertiary：
   浅色下 tertiary(#81858c) 11px 对白底只有 3.71:1，达不到 4.5；
   secondary(#61666b) 是 5.80:1。诊断信息可以弱化，但不能弱到看不清。 */
.ios-thm-diag { margin-top: 6px; font-size: 11px; line-height: 16px; font-family: var(--ds-font-family-code, ui-monospace, monospace); color: var(--dsw-alias-label-secondary); }

/* 开关：尺寸/圆角/滑块位移全部对齐 NEXT 的 primitives/Switch（36×20，padding 2px，
   轨道 999px 胶囊，滑块 16×16，选中右移 16px）。与宿主控件并排时大小一致。 */
/* 轨道关闭态不能用 --dsw-alias-border-l3：多数主题（尤其透光橙）会把
   border-l1..l4 映射成品牌色，于是「关」和「开」看起来一样。轨道是控件填充，
   语义上属于中性面 —— 用 label-secondary 混出中灰，与品牌色形成明确对照。
   开启/关闭的视觉由 aria-checked 驱动（与宿主 primitives/Switch 一致），
   避免出现「类名说开着、辅助技术读到关着」的分裂状态。 */
.ios-thm-switch { box-sizing: border-box; position: relative; flex: 0 0 auto; width: 36px; height: 20px; padding: 2px; border: 0; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-label-secondary) 42%, transparent); cursor: pointer; }
.ios-thm-switch[aria-checked="true"] { background: var(--dsw-alias-brand-primary); }
.ios-thm-switch-knob { display: block; width: 16px; height: 16px; border-radius: 50%; background: var(--dsw-alias-label-primary-foreground, #fff); transition: transform 120ms ease; }
.ios-thm-switch[aria-checked="false"] .ios-thm-switch-knob { background: var(--dsw-alias-switch-thumb); }
.ios-thm-switch[aria-checked="true"] .ios-thm-switch-knob { transform: translateX(16px); }
.ios-thm-switch:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.ios-thm-switch-disabled { opacity: .45; cursor: not-allowed; }

/* ===== 2. 换肤平滑过渡 ===== */
/* 250ms 让配色切换不刺眼。只列颜色相关属性 —— 写 all 会拖累滚动与布局。 */
@media (prefers-reduced-motion: no-preference) {
  :root, :root * { transition-property: background-color, color, border-color, fill, stroke; transition-duration: 250ms; transition-timing-function: ease; }
}

/* ===== 3. 背景图（壁纸）=====
   ::before 是当前图，::after 是过渡图；z-index:-1 让它落在 #root 之下。
   应用底色由下面这条 !important 规则降成半透明 —— 关键点：DSH 的主题令牌是
   body 上的 inline 自定义属性（ui-layout 的 presenter 用 body.style.setProperty 写），
   inline 没带 !important，所以带 !important 的样式表规则能压过它。
   走 CSS 就绕开了 overrideTokens 的层序与投影时机，稳得多。 */
html[data-ios-bg="on"],
html[data-ios-bg="on"] body { background-color: transparent; }

html[data-ios-bg="on"][data-ios-bg-surface="on"] body {
  --dsw-alias-bg-base: color-mix(in srgb, var(--ios-bg-base-raw) var(--ios-bg-base-alpha, 80%), transparent) !important;
  --dsw-specific-sidebar-fill: color-mix(in srgb, var(--ios-bg-side-raw) var(--ios-bg-side-alpha, 80%), transparent) !important;
}

/* —— 只碰 bg-base 与 sidebar-fill 两个令牌，别的一概不动 ——
   曾经在这里加过一条 [data-ios-bg-depth] 规则，把 --dsw-alias-bg-layer-1
   也降成半透明，想让「卡片也透光」。实测结果是整页叠印：layer-1 不是卡片专用底，
   而是所有控件级表面的共用底（插件市场卡片、聊天预览、侧栏按钮、分段控件…），
   一改全透，下层正文立刻从这些面浮上来。截图里设置页与插件市场满屏字体重叠
   就是这个原因。

   结论（也是这条注释的用处，防止以后有人再想「更透一点」）：
   壁纸只从窗口底与侧栏透出，压在它们之上的任何面都必须保持实底。
   「透多少」由界面底透明度一个参数控制，不再给分档。 */

/* 层叠容器实底 ——「保留壁纸」与「不叠影」的分界线。
   壁纸只该在「下层没有文字」的平面上透出：窗口底、侧栏、内容区空白。
   一旦某个容器可能压在别的内容之上（右侧分栏、dockkit 面板、输入框），
   它就必须回到不透明原色，否则下层文字会从半透明上层透出来 ——
   工作区文件全屏时侧栏条目与正文叠印，就是这个原因。

   做法是在这些容器的子树上把令牌重新指回原值，而不是硬写 background：
   DSH 内部的 tabHost / composer 各自用 --dsw-alias-bg-base 铺底，
   只要它们拿到的原值不透明，整块面板（含标签栏）就自然实底，
   不必去猜哈希类名，也不会盖掉浮层原本的 bg-layer-2。

   NEXT 的钩子补齐：
   · data-dockkit-empty —— 空 tab host，_emptyTabHost 自己也铺 bg-base，
     原先没收口，空分栏会透出壁纸；
   · data-dockkit-surface / data-dockkit-column —— dockkit 根与外层 cell，
     兜住「多 pane 同时可见」的布局；
   · data-composer-overlay —— 覆盖层原来漏在外面，输入框后面的正文会透上来。
   注意 data-dockkit-pane 只在「非浮窗且 active」时才有值，非 active pane 靠
   [data-dockkit-host] 那一档兜底 —— 两档都要留。 */
html[data-ios-bg="on"][data-ios-bg-surface="on"] :is(
  [data-dockkit-surface],
  [data-dockkit-host],
  [data-dockkit-column],
  [data-dockkit-pane],
  [data-dockkit-float],
  [data-dockkit-empty],
  [data-sidebar-right-panel],
  [data-composer-card],
  [data-composer-dock],
  [data-composer-seat],
  [data-composer-overlay],
  [data-queue-dock]
) {
  --dsw-alias-bg-base: var(--ios-bg-base-raw);
  --dsw-specific-sidebar-fill: var(--ios-bg-side-raw);
}

/* dockkit 的 pane 自身在部分布局下不画底（靠祖先 tabHost 兜底），这里再补一层，
   避免结构微调后又漏出透明底。浮窗（_float）自带 bg-layer-2，不在此列。 */
html[data-ios-bg="on"][data-ios-bg-surface="on"] :is([data-dockkit-pane], [data-dockkit-empty]) {
  background-color: var(--ios-bg-base-raw);
}

/* composer 侧只做「令牌指回原值」，不硬写 background：
   [data-composer-card] 自己在 NEXT 里用 --dsw-specific-input-major 铺底（实色），
   给它盖一层 background-color: var(--ios-bg-base-raw) 会把输入框那层略亮/略暗的
   层次抹平，反而变难看。真正需要收的是它内部消费 --dsw-alias-bg-base 的子元素
   （附件 chip、命令面板、覆盖层），那些靠上面那条 :is() 令牌重定向就够了。
   [data-composer-seat] 是几何占位容器，也不能硬铺 —— 会在壁纸上切出一条横带。 */

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

/* ===== 4. 背景图卡片控件 ===== */
.ios-thm-drop { margin-top: 12px; padding: 14px; border: 1px dashed var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 12px); background: color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent); outline: none; }
.ios-thm-drop:focus-visible { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent); }
.ios-thm-drop-over { border-color: var(--dsw-alias-brand-primary); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, var(--dsw-alias-bg-base)); }
.ios-thm-drop-text { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); }
.ios-thm-drop-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.ios-thm-file { display: none; }
.ios-thm-textbtn { padding: 6px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm, 8px); background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; cursor: pointer; }
.ios-thm-textbtn:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
.ios-thm-bg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 8px; margin-top: 12px; }
.ios-thm-bg-item { position: relative; }
.ios-thm-bg-thumb { display: block; width: 100%; aspect-ratio: 16 / 10; padding: 0; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm, 8px); overflow: hidden; background: var(--dsw-alias-bg-layer-2); cursor: pointer; }
.ios-thm-bg-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.ios-thm-bg-item-active .ios-thm-bg-thumb { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent); }
.ios-thm-bg-del { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; padding: 0; border: 0; border-radius: 50%; background: var(--dsw-alias-state-error-primary); color: #fff; font-size: 13px; line-height: 18px; cursor: pointer; opacity: 0; transition: opacity .15s ease; }
.ios-thm-bg-item:hover .ios-thm-bg-del, .ios-thm-bg-item:focus-within .ios-thm-bg-del { opacity: 1; }
.ios-thm-slider-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.ios-thm-slider-value { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.ios-thm-range { width: 100%; margin: 6px 0 0; accent-color: var(--dsw-alias-brand-primary); }
.ios-thm-inline { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
`;

// ==== 09-assemble.js ====
    // ══════════════════════════════════════════════════════════════════════════
    // 装配
    // ══════════════════════════════════════════════════════════════════════════

    function installStyles() {
      if (typeof document === 'undefined') return () => {};
      const style = document.createElement('style');
      style.dataset.plugin = 'dsh-theme-wallpaper';
      style.textContent = CSS;
      document.head.appendChild(style);
      return () => {
        if (style.parentNode) style.parentNode.removeChild(style);
      };
    }

    return {
      inject: ['theme', 'slots'],
      apply(appCtx) {
        ctx = appCtx;
        loadState();

        // 顺序有讲究：
        //  1. 主题层先装 —— 它决定底色，而 bgApplySurface() 要读「当前底色」才能
        //     算出 color-mix 的百分比。reapplyLayers() 内部按 bgIgnoreTheme 决定先后。
        //  2. 壁纸再上 —— 读到的就是「主题之后」的底色。
        reapplyLayers();
        applyBackground();

        // ctx.on 返回 disposer，必须留住 —— 否则插件被禁用后这个监听器还挂在宿主上，
        // 每次 theme/change 都会调进已经拆卸的模块（A19「卸载净空」）。
        const disposeThemeChange = ctx.on('theme/change', () => {
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

        // settings.section 在 rc.1 仍是受支持的第三方入口（契约 list/root，id 必填、
        // order 升序、label 支持 thunk）。id/order 与官方五个 section 都不冲突。
        // 文案必须是「外观与壁纸」而不是「外观」：官方 General 页里已经有一行叫「外观」
        //（settings.general.item id='appearance'），两个同名入口会让用户不知道该点哪个。
        // icon 不注册 —— 宿主会降级成齿轮 IconSettingsOutlineMedium(16)，语义合适。
        const disposeSection = ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: SECTION_ID,
          order: SECTION_ORDER,
          label: () => '外观与壁纸',
        }, AppPage));

        const disposeStyle = installStyles();

        return () => {
          try { bgTeardown(); } catch (e) { /* 忽略 */ }
          try { disposeSection(); } catch (e) { /* 忽略 */ }
          try { disposeStyle(); } catch (e) { /* 忽略 */ }
          try { disposeThemeChange(); } catch (e) { /* 忽略 */ }
          // 主题层与元素级 CSS 都要撤：令牌层撤不干净会让宿主一直用插件的配色。
          try { disposeThemeLayer(); } catch (e) { /* 忽略 */ }
          themeCache.clear();
          listeners.length = 0;
        };
      },
    };
  },
});
