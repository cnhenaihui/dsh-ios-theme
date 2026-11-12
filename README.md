# dsh-theme-wallpaper

A colour-theme and wallpaper plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It layers token overrides on top of the host theme service through `ctx.theme.overrideTokens`, so it needs no build step and no runtime dependencies.

DeepSeek Harness 的配色主题与壁纸插件。通过 `ctx.theme.overrideTokens` 在宿主主题服务上叠加令牌层，零构建、零运行时依赖。

> **Renamed / 已改名**：本包原名 `@cnhenaihui/dsh-ios-theme`。1.x 是一套「iOS 风格外观调节器」，2.0 起已改为「配色主题 + 壁纸」，名字不再相符，故更名。存储键与 IndexedDB 库名刻意保留旧名，见下方[升级说明](#upgrading--升级说明)。
>
> This package was previously `@cnhenaihui/dsh-ios-theme`. Version 1.x was an iOS-flavoured appearance tuner; since 2.0 it has been a colour-theme-plus-wallpaper plugin, so the name no longer matched. The storage key and IndexedDB database name deliberately keep the old name — see [Upgrading](#upgrading--升级说明).

## Features / 功能

- **62 colour themes / 62 套配色主题** — 37 built-in themes plus 25 IP presets, grouped by hue family (warm, yellow-green, teal, cyan-blue, cool-blue, violet, translucent, special) with the IP presets in their own group. Each theme carries a full Markdown and syntax-highlight palette, so headings, bold, italics, links, inline code, blockquotes and every code token get a colour of their own instead of the host's fixed hex values. 37 套内置主题 + 25 套 IP 预置，按色系分组（暖色/黄绿/青绿/青蓝/冷蓝/蓝紫/透光/特殊），IP 预置单列一组。每套主题都自带完整的 Markdown 与语法高亮配色，标题、加粗、斜体、链接、行内代码、引用块和每一种代码 token 都有自己的颜色，不再是宿主写死的固定值。
- **Current theme is marked / 当前主题有勾选标记** — the active theme chip carries a filled ✓ badge, a brand-coloured ring, a tinted background and a heavier font weight. Four signals rather than one, so the selection stays identifiable on low-contrast themes and for colour-blind users. The chip row is exposed as a `radiogroup` with `role="radio"` + `aria-checked`. 当前主题的芯片带一个实心 ✓ 勾、品牌色描边、浅色底与加粗字重。四重信号而不是单靠颜色，弱对比主题与色觉障碍用户也能认出。整组芯片以 `radiogroup` + `role="radio"` + `aria-checked` 暴露给辅助技术。
- **Translucent themes / 透光主题** — themes whose background slots are `transparent` (Lucent Orange `lucent-orng` is the flagship) hand the canvas to the host, so a wallpaper shows through and the whole window takes on a tinted-glass look. 背景槽为 `transparent` 的主题（代表是透光橙 `lucent-orng`）把画布交给宿主，壁纸因此透出来，整窗呈现着色玻璃的观感。
- **Contrast repair / 对比度修复** — upstream ships 250 of 636 semantic colour pairs below 4.5:1 (some at 1.00:1, where bold text is literally the same colour as body text). This plugin pushes only the failing colours along the black/white axis until they clear 4.5:1, leaving passing colours byte-identical and preserving each theme's hue. 上游有 250/636 组语义色对比度低于 4.5:1（最低 1.00:1，加粗与正文同色）。本插件只把不达标的色沿黑白方向推到 4.5:1，达标的色一个字节都不动，色相保持不变。
- **Light and dark both real / 明暗各用各的配色** — most themes define a light palette as well as a dark one. The plugin emits both halves, so switching the host between light and dark gives you the theme's own light colours rather than a dark canvas pretending to be light. 多数主题同时定义了浅色与深色配色。插件两半都发射，宿主在明暗之间切换时拿到的是主题自己的浅色值，而不是一块假装成浅色的深色底。
- **Local background images / 本地背景图** — point it at local images, then choose fill or tile, sequential or random rotation, with blur, scrim, saturation and transparency. Drag-and-drop (files or whole folders), paste, and a thumbnail gallery are all supported. Images are re-encoded to ≤2560px WebP and stored as Blobs in IndexedDB. 指定本地图片作为背景，可选铺满或平铺、顺序或随机轮换，并调整模糊、遮罩、饱和度与透明度。支持拖拽（文件或整个文件夹）、粘贴，以及缩略图图库。图片统一重编码为 ≤2560px 的 WebP，以 Blob 存进 IndexedDB。
- **Three one-click presets / 三个一键预设** — 轻微 / 标准 / 通透 set blur, scrim, wallpaper opacity, interface-base opacity and saturation together as a coordinated set. The five sliders pull against each other (more blur needs more scrim; a more transparent interface makes text harder to read), so picking one by hand is fiddly. 轻微 / 标准 / 通透 三档会把模糊、遮罩、壁纸透明度、界面底透明度、饱和度一起调成协调的一组。五个滑块互相牵制（模糊越大越需要遮罩，界面底越透正文越难读），手工配平很费劲。
- **Per-slider guidance / 每个滑块带效果说明** — every slider carries a one-line hint describing which direction does what and what the cost is, rather than just restating the number. 每个滑块配一句说明，讲清「往哪边调、代价是什么」，而不是复述数值。
- **Ignore-theme-background switch / 忽略主题背景开关** — solid-canvas themes cover the wallpaper by design. Flip this on to let the wallpaper win, and the theme's canvas becomes semi-transparent instead. 实色画布的主题按设计会盖住壁纸。打开这个开关让壁纸优先，主题画布转为半透明。
- **Self-check overlay / 自检浮层** — when a wallpaper is enabled, a 15-second overlay reports whether the image layer is painted, whether the base tokens were readable, and which surfaces were covered. 启用壁纸时会出现一个 15 秒的浮层，报告渲染层是否画上、底色令牌是否读到、覆盖了哪些面。

Everything is applied through the host's theme token layer plus a small injected stylesheet for elements the token layer cannot reach (`strong`, `em`, `blockquote`, `hr`, `a`, inline `code`), so it composes with the host's own light/dark handling rather than replacing it. Typography and font families are left entirely to the host's *Settings → General → Appearance*.

全部效果都走宿主主题令牌层，另加一张小样式表兜住令牌层管不到的元素（`strong`、`em`、`blockquote`、`hr`、`a`、行内 `code`），因此与宿主自己的明暗处理叠加而非替换。排版与字体族完全交给宿主的「设置 → 通用 → 外观」。

## How the wallpaper shows through / 壁纸怎么透出来

DSH's interface is a stack of surfaces, and each layer reads a different token. The plugin only makes **two** of them translucent:

| Layer / 层 | Token | Treated |
|---|---|---|
| Window base / 窗口底 | `--dsw-alias-bg-base` | **translucent** |
| Sidebar / 侧栏 | `--dsw-specific-sidebar-fill` | **translucent** |
| Control surfaces / 控件级表面 | `--dsw-alias-bg-layer-1` | opaque |
| Popovers & menus / 浮层与菜单 | `--dsw-alias-bg-layer-2` | opaque |
| Overlays / 遮罩层 | `--dsw-alias-bg-layer-3`, `--dsw-alias-bg-overlay` | opaque |

`--dsw-alias-bg-layer-1` is **not** a card-only token — it is the shared base for every control-level surface (plugin-market cards, chat previews, sidebar buttons, segmented controls, JSON trees). Making it translucent turns the whole page see-through and text from lower layers shows through, which reads as overlapping type. So the wallpaper only comes through the window base and sidebar; anything stacked on top of them stays solid.

`--dsw-alias-bg-layer-1` **不是**「卡片专用底」，而是所有控件级表面的共用底（插件市场卡片、聊天预览、侧栏按钮、分段控件、JSON 树都用它）。把它半透明化会让整页变透，下层文字浮上来，看起来就是字体重叠。所以壁纸只从窗口底与侧栏透出，压在它们之上的面一律实底。

How visible the wallpaper is, is controlled by a single **interface-base opacity** slider. It has no "penetration depth" setting on purpose: any such setting necessarily breaks the rule above.

壁纸的明显程度由**界面底透明度**一个滑块控制。刻意不提供「透出范围」分档：任何分档都必然破坏上面这条规则。

`_probe/bg-harness.html` in the workspace is an offline repro page that demonstrates this boundary — including a switch that deliberately reintroduces the overlap bug so you can see why the token must stay opaque.

工作区里的 `_probe/bg-harness.html` 是离线复现页，用来演示这条边界 —— 其中有一个开关会刻意重现叠印 bug，直观说明这个令牌为什么必须保持不透明。

## Install / 安装

From GitHub:

```bash
dsh plugin --profile <profile> add github:cnhenaihui/dsh-theme-wallpaper
```

From npm:

```bash
dsh plugin --profile <profile> add @cnhenaihui/dsh-theme-wallpaper
```

Or from a local checkout:

```bash
dsh plugin --profile <profile> add /absolute/path/to/dsh-theme-wallpaper
```

The package declares `dsh.bundle.patch`, so the profile loads its `cordis.patch.yml` automatically on startup. Do not also add a manual `insert` line for it — the same plugin mounted from two sources fails the loader with a duplicate entry id.

包内声明了 `dsh.bundle.patch`，profile 启动时会自动加载它的 `cordis.patch.yml`。不要再手工加一行 `insert`——同一插件从两处挂载会触发重复 loader entry id，导致启动失败。

### Upgrading from `dsh-ios-theme` / 从旧包名升级

The package name, the loader entry id and the token-layer sources all changed. The **storage key and IndexedDB database name did not**:

| Thing | Value | Changed? |
|---|---|---|
| Package name | `@cnhenaihui/dsh-theme-wallpaper` | yes |
| Loader entry id | `theme-wallpaper` | yes |
| `overrideTokens` sources | `dsh-theme-wallpaper:theme` / `dsh-theme-wallpaper:bg` | yes |
| `localStorage` key | `dsh-ios-theme:v1` | **no** |
| IndexedDB database | `dsh-ios-theme` | **no** |

Those last two are where your data physically lives. Renaming them would discard your selected theme, your wallpaper settings and every imported image, with no way to recover. They are internal identifiers and do not need to match the package name.

最后两行是用户数据在磁盘上的实际地址。改名等于把已选主题、壁纸参数和全部导入的图片丢掉，且无法找回。它们是内部标识，不需要跟包名一致。

To upgrade, remove the old entry from the profile's `package.json` (`dependencies` and `dsh.profile.bundles`) and add the new package. Do not keep both — the two would mount the same plugin twice and collide.

升级时把 profile `package.json` 里旧的依赖项与 `dsh.profile.bundles` 条目换成新包名，不要两个都留着 —— 会重复挂载同一个插件而冲突。

## Configuration / 配置

All options live in DeepSeek Harness settings under **Appearance & Wallpaper**. Changes apply live; the plugin's overrides are removed cleanly when it is disabled or unmounted.

所有选项都在 DeepSeek Harness 设置的「外观与壁纸」里。修改即时生效；停用或卸载时插件叠加的令牌层与样式表会被干净地移除。

## Requirements / 要求

- DeepSeek Harness **NEXT** (`desktop-next 2.0.22-next` / `dsh 0.2.2-rc.1` and later) with the web GUI (the plugin targets `client.platform: web`).
- Node.js 20 or newer.

## Verification / 验证

`client.js` is assembled from eight segments in `docs/src/`; the build has no dependencies.

```bash
node docs/_assemble.mjs          # assemble client.js (--check validates only)
node test/run-all.mjs            # 5 layers, 163 assertions
node test/run-all.mjs --mutation # extra mutation pass (temporarily edits sources, restores)
node docs/_render_page.mjs       # render 8 preview pages to docs/_page-*.html
```

Both the assembler and `run-all.mjs` need to spawn child processes. In a sandbox that forbids `spawn` (it surfaces as `EPERM`), run the five layers directly instead:

```bash
node docs/_assemble.mjs
node docs/_selfcheck.mjs        # 23
node docs/_engine_smoke.mjs     # 21
node docs/_verify_v2.mjs        # 96
node docs/_scenario.mjs         # 23
node docs/_check_bundle.mjs     # bundle guards, incl. the no-overlap rule
```

See [`tests-report.md`](tests-report.md) for what each layer covers and what it does not.

`client.js` 由 `docs/src/` 的八段拼装而成，构建零依赖。拼装脚本与 `run-all.mjs` 都要起子进程；在禁止 `spawn` 的沙箱里（表现为 `EPERM`）改为逐层直接跑，见上面的命令。覆盖范围与未覆盖范围见 [`tests-report.md`](tests-report.md)。

## Version history / 版本历史

> **2.1.0** — renamed to `@cnhenaihui/dsh-theme-wallpaper`; added the ✓ badge on the active theme with `radiogroup` semantics; added three one-click presets and per-slider hints; removed a "penetration depth" setting that caused page-wide text overlap.
>
> 改名为 `@cnhenaihui/dsh-theme-wallpaper`；当前主题加 ✓ 勾并补齐 `radiogroup` 语义；新增三个一键预设与每个滑块的效果说明；移除会导致整页字体重叠的「透出范围」分档。
>
> **2.0.0** — a rewrite: the plugin went from an iOS-flavoured appearance tuner to a colour-theme-plus-wallpaper plugin. Accent colours, the three-way base palette, line-height/tracking controls, the night eye-care mode and the hand-rolled semantic layer are all gone, replaced by 62 themes that bring their own Markdown and syntax palettes plus a contrast-repair pass. Saved 1.x state migrates automatically (`base: 'opencode'` → `oc-2`, `base: 'night'` → `lucent-orng`); other legacy fields are dropped.
>
> 一次重构：插件从「iOS 风格外观调节器」改为「配色主题 + 壁纸」。原先的强调色、基调三选一、行高字距、夜间护眼、自研语义角色层全部移除，取而代之的是 62 套自带 Markdown/语法配色的主题，以及一层对比度修复。1.x 保存的状态会自动迁移（`base: 'opencode'` → `oc-2`，`base: 'night'` → `lucent-orng`），其余旧字段丢弃。

## License / 许可

MIT
