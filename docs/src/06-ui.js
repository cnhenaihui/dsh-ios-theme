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
