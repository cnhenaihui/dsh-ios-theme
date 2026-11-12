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
