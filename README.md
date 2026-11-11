# dsh-ios-theme

An iOS-flavoured appearance plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It layers its own theme overrides on top of the host theme service through `ctx.theme.overrideTokens`, so it needs no build step and no runtime dependencies.

DeepSeek Harness 的 iOS 风格外观插件。通过 `ctx.theme.overrideTokens` 在宿主主题服务上叠加令牌层，零构建、零运行时依赖。

## Features / 功能

- **Theme modes / 深浅色** — light, dark and follow-system. 浅色、深色，以及跟随系统自动切换。
- **Accent palettes / 强调色板** — the iOS system colours (blue, purple, pink, red, orange, yellow) applied to `--dsw-alias-brand-primary`, persisted in `localStorage`. 用 iOS 系统色覆盖品牌主色，选择本地持久化。
- **Night eye-care / 夜间护眼** — a warm overlay for late sessions, with an adjustable auto-off timer. 夜间暖色滤镜，可设定自动关闭时长。
- **OpenCode palettes and typography / 调色板与字体排版** — the semantic colours of OpenCode's default `oc-2` theme applied as paired alias tokens, plus a type scale and font stacks (Inter, JetBrains Mono, IBM Plex Mono, Cascadia Code). 套用 OpenCode 默认 `oc-2` 主题的真实语义色（成对覆盖 alias 令牌），并提供字号阶梯与字体栈。
- **Conversation emphasis / 对话重点样式** — emphasis styling for the conversation view. 对话视图的重点样式。
- **Local background images / 本地背景图** — point it at local images, then choose fill or tile, and sequential or random rotation, with blur and transparency. 指定本地图片作为背景，可选铺满或平铺、顺序或随机轮换，并调整模糊与透明度。

Everything is applied through the host's theme token layer, so it composes with the built-in light/dark themes rather than replacing them.

全部效果都走宿主主题令牌层，与内置深浅色主题叠加而非替换。

## Install / 安装

From GitHub:

```bash
dsh plugin --profile <profile> add github:cnhenaihui/dsh-ios-theme
```

Or from a local checkout:

```bash
dsh plugin --profile <profile> add /absolute/path/to/dsh-ios-theme
```

The package declares `dsh.bundle.patch`, so the profile loads its `cordis.patch.yml` automatically on startup. Do not also add a manual `insert` line for it — the same plugin mounted from two sources fails the loader with a duplicate entry id.

包内声明了 `dsh.bundle.patch`，profile 启动时会自动加载它的 `cordis.patch.yml`。不要再手工加一行 `insert`——同一插件从两处挂载会触发重复 loader entry id，导致启动失败。

## Configuration / 配置

All options live in DeepSeek Harness settings. Changes apply live; the plugin's overrides are removed cleanly when it is disabled or unmounted.

所有选项都在 DeepSeek Harness 的设置里。修改即时生效；停用或卸载时插件叠加的令牌层会被干净地移除。

## Requirements / 要求

- DeepSeek Harness with the web GUI (the plugin targets `client.platform: web`).
- Node.js 20 or newer.

## License / 许可

MIT
