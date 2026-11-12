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
