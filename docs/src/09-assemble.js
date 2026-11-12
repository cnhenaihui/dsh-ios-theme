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
