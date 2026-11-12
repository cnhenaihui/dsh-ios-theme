# DSH iOS Theme 插件 · 验证报告

- 被测对象：`ios-theme-plugin/client.js`（`@cnhenaihui/dsh-ios-theme` **v2.0.0**，392,304 字节 / 11,708 行）
- 环境：Windows / Node v24.21.0 / 无网络、无交互、无外部依赖
- 复跑命令：`node ios-theme-plugin/test/run-all.mjs`
- 变异验证：`node ios-theme-plugin/test/_mutation.mjs`
- 生成时间：2026-11-12

---

## 结论

**5 层验证、142 条断言，全部通过，退出码 0。**

| 层 | 断言 | 通过 | 说明 |
|---|---|---|---|
| 1. 拼装校验 | — | PASS | `docs/src/` 八段齐全，拼装产物通过 `node --check` |
| 2. 模块外壳自检 | 23 | 23 | 宿主能把它当插件装起来的全部前置条件 |
| 3. 引擎自检 | 21 | 21 | 62 套主题数据完整性、令牌生成、分组 |
| 4. 插件行为验证 | 80 | 80 | 令牌层 / 壁纸层 / 设置页 / 迁移 / 卸载 |
| 5. 端到端场景验证 | 18 | 18 | 主题 + 壁纸 + 关键字配色 + 层序同时成立 |

变异验证 **7 / 7 全部被捕获**，源码还原 sha256 一致。

---

## 一、这一版改了什么

2.0.0 是一次重构，不是增量修改。插件从「iOS 风格外观调节器」变成「配色主题 + 壁纸」：

**移除**（用户裁决，m01202）：强调色九色板、基调三选一、行高与字距、夜间护眼模式、自研语义角色层（加粗底衬 + 引用块四色分类）。

**保留**：背景图全套（IndexedDB 存储、模糊/遮罩/透明度、轮换、拖拽与粘贴导入、macOS 侧栏降透明度、层叠容器实底）。

**新增**：62 套源自 OpenCode 的主题（37 套内置 + 25 套 IP 预置，含透光橙 `lucent-orng`），每套自带完整 Markdown 与语法高亮配色；一层对比度修复；「忽略主题背景」开关。

### 为什么不再自己写语义层

上游 37 套主题里，每套都定义了 6 个 Markdown 角色（`markdownHeading` / `markdownLink` / `markdownCode` / `markdownEmph` / `markdownStrong` / `markdownBlockQuote`）和 7 个语法角色（`syntaxComment` / `syntaxKeyword` / `syntaxFunction` / `syntaxType` / `syntaxNumber` / `syntaxString` / `syntaxOperator`）。宿主 NEXT 只提供 11 个容器级 Markdown 令牌，**没有** strong/em/blockquote/heading 的角色变量，所以上游用元素级 CSS 规则兜底（`strong{color:...}` 这种）。

我们原来那套语义层是在宿主令牌之上「再发明一层」，颜色必须自己推；现在直接吃主题自带的配色，色相由主题作者定，我们只负责保证读得出来。这是分工变化，不是功能退化。

---

## 二、两个真缺陷（都是移植过程中查出来的）

### 缺陷 1：36 套实色主题的浅色画布被整段丢弃

**现象**：选中 catppuccin 后切到浅色模式，背景仍是 `#1E1E2E`（深色），主题定义里的 `#EFF1F5` 从未生效。

**根因**：上游 `buildTokens(darkColors, lightColors, delegated)` 的第三个参数同时承担了两个职责 ——「画布是否委托宿主」和「light/dark 两半是否各用自己配色」。代码里：

```js
if (!del) {
  if (singlePalette) { tokens[name] = { light: lok?lv:dv, dark: dok?dv:lv }; return; }
  if (dok) tokens[name] = { light: dv, dark: dv };   // ← 非委托主题强制两半同深色值
  return;
}
```

上游是**换肤**插件，选中一套主题就固定成那套外观，这样写没问题。但本插件的状态行承诺「明暗跟随宿主」，且 37 套里 36 套都给了可用的浅色背景（只有 `lucent-orng` 是 `transparent`）。

**修法**：把两个概念拆开。`delegated` 仍由 `isDelegatedSurface()` 判定，只决定画布令牌要不要写、壁纸层会不会被盖住；发射模式第三参数恒传 `true`。

```js
const tokens = GENERATE.buildTokens(dark, light, true);
const css = GENERATE.buildColorCss(dark, light, tokens, true);
```

**验证**：令牌数不变（实色 106 / 透光 70）；`light !== dark` 的令牌 105/106；无令牌出现两侧全空；透光橙的 `--dsw-alias-bg-base` 依然整条跳过（`usable()` 对 `transparent` 返回 `null`），画布委托语义未破坏。

**守着它的断言**：`W7b`（走真实加载路径，验实际注册的 `--dsw-alias-bg-base` 两半不同）+ `T22`（引擎层，全 37 套扫描）。变异 M1 把第三参数改回 `delegated`，`W7b` 立刻变红。

### 缺陷 2：开关关闭态看起来像开启

**现象**：透光橙下，「忽略主题背景」开关的开与关都是橙红色轨道，肉眼分不出当前状态。

**根因**：透光橙把 `--dsw-alias-border-l1..l4` 全映射成橙色，而开关关闭态轨道用的正是 `var(--dsw-alias-border-l3)`。

**修法**：轨道改用中性灰 `color-mix(in srgb, var(--dsw-alias-label-secondary) 42%, transparent)`；并照宿主 `primitives/Switch` 的做法，用 `aria-checked` 驱动视觉。宿主 `Switch.module.css` 里的注释说得很清楚：

> The on/off appearance keys off aria-checked rather than a parallel class, so the visual state cannot disagree with the state assistive technology reads.

配套删掉了所有 `ios-thm-switch-on` 类名拼接 —— 保留一个平行类名就等于留了一条「视觉与语义不同步」的路。

---

## 三、对比度修复层

### 为什么必须加这一层

上游只修宿主文字对（`HOST_TEXT_PAIRS` 59 条，全是 `label-*` × `bg-*`），**完全不碰语义色**。实测 37 套 × 2 外观 × 13 个语义前景槽：

```
957 对判定，255 对低于 4.5:1
```

最极端的几个：

| 主题 / 外观 | 槽 | 前景 | 底色 | 对比度 |
|---|---|---|---|---|
| cursor / light | markdownStrong | `#141414` | `#141414` | **1.00:1** |
| vesper / dark | markdownStrong | `#FFFFFF` | `#FFFFFF` | **1.00:1** |
| osaka-jade / dark | markdownStrong | `#C1C497` | `#C1C497` | **1.00:1** |
| dracula / light | syntaxString | `#F1FA8C` | `#F8F8F2` | 1.05:1 |
| catppuccin / light | syntaxOperator | `#04A5E5` | `#EFF1F5` | 2.47:1 |
| catppuccin / light | markdownStrong | `#FE640B` | `#EFF1F5` | 2.64:1 |
| cobalt2 / dark | syntaxComment | `#088CFF` | `#193549` | 3.77:1 |

1.00:1 意味着加粗与正文完全同色 —— 「关键信息突出」这个功能在那些主题里等于不存在，与用户 m01202 的核心诉求直接冲突。

### 修法

只把不达标的色沿黑/白方向推，达标的色一个字节都不动：

```js
for (const slot of SEMANTIC_FOREGROUNDS) {
  const current = out[slot];
  if (!isSolidHex(current)) continue;
  const worst = worstContrast(current, backgrounds);
  if (worst >= SEMANTIC_MIN_CONTRAST) { taken.add(current.toUpperCase()); continue; }
  for (let k = PUSH_STEP; k <= 1.0001; k += PUSH_STEP) {
    const candidate = RESOLVE.mixHex(current, end, Math.min(1, k)).toUpperCase();
    if (taken.has(candidate)) continue;
    if (worstContrast(candidate, backgrounds) >= SEMANTIC_MIN_CONTRAST) { next = candidate; break; }
  }
  out[slot] = next;
}
```

关键取舍：

1. **底色只认 `background` 一个**。一开始我把 `markdownText` 也当底色，结果把「加粗 vs 正文」这种正常组合判成 1.00:1，957 对里 836 对不达标 —— 全是误报。`markdownText` 是正文前景色，与 strong/em 并列，不是底。
2. **委托画布用假定底**。透光橙的 `background` 是 `transparent`，真实底色是壁纸无从得知。按 `markdownText` 的亮度假定极限底（浅字假定黑底、深字假定白底），保证在任何壁纸上都读得出来。实测透光橙 13 槽全部达标，最低 6.75:1。
3. **不新造撞值**。amoled 的 strong/em/heading 本来就是同一个 `#FFFFFF`，code/function/number 都是 `#B388FF` —— 那是主题设计。断言只要求「修复后出现的撞值必须修复前就存在」。

### 守着它的断言

`C1`（修复前 ≥20 条不达标，证明这层必要）/ `C2`（修复后 0 条）/ `C3`（判定数 >800）/ `C4`（改动面收敛）/ `C5`（达标色未被改动）/ `C6`（未新造撞值）。

---

## 四、壁纸与主题的共存

这是移植里最需要显式设计的部分。

### 机制

宿主的 `overrideTokens(source, tokens)` 是 `this.overrides.set(source, layer)` —— **同 source 重注册会覆盖旧层并拿到更大的 seq**，`composeActive` 按 seq 升序合并，后注册的压在上面。所以「哪层在上」完全由注册顺序决定。

插件有两层：`dsh-theme-wallpaper:theme` 与 `dsh-theme-wallpaper:bg`。`reapplyLayers()` 按 `bgIgnoreTheme` 决定顺序：

```js
if (state.bgIgnoreTheme) {
  applyTheme();        // 主题先
  bgApplySurface();    // 壁纸后 → 壁纸压过主题
} else {
  bgApplySurface();    // 壁纸先
  applyTheme();        // 主题后 → 主题盖住壁纸
}
```

### 为什么透光橙天然和谐

`lucent-orng` 的三个背景槽全是 `'transparent'`。`buildTokens` 里的 `usable()` 对 `transparent` 返回 `null`，`put2()` 发现两半都不可用就整条跳过 —— 于是**主题层压根不写 `--dsw-alias-bg-base` 和 `--dsw-specific-sidebar-fill`**，壁纸层独占这两个令牌，不需要任何特殊处理。

实色主题则相反，会写实色画布，把壁纸完全盖住。这是主题的设计意图，所以默认让主题赢；想用壁纸就打开「忽略主题背景」。

### 踩过的坑：`applyBackground()` 重复注册

`applyBackground()` 内部原本也调 `bgApplySurface()`，而 `apply()` 里已经调过 `reapplyLayers()`（内含 `bgApplySurface()`）—— 于是壁纸层被注册两次，第二次 seq 更大，把 `reapplyLayers()` 精心排好的顺序打乱。实测 `theme seq=0 bg seq=1`（期望 theme 更大）。

修法：`applyBackground()` 只做渲染层（`bgApplyVars` + `bgShowIndex` + `bgScheduleRotation`），令牌层统一交给 `reapplyLayers()`。同一文件里另外 7 处 `bgApplySurface()` 调用也一并改成 `reapplyLayers()`。

### 守着它的断言

`W1`–`W10`（含 `W5b` 令牌形状、`W7b` 浅色画布、`W8` 默认顺序、`W9` 忽略背景顺序、`W10` system 零写入）。

**这里有个测试方法论上的坑值得记下来**：判定「哪层生效」必须看**最后一次**注册，不能取 `[0]`。我一开始取第一次，读到的是 seq=0 的旧层，导致 `W8` 假失败，排查了半天。现在统一用 `lastOf(calls, source)`。

### 端到端场景：四件事同时成立（第 5 层）

`W` 组验的是每一层各自正确，但用户真正要的是「选透光橙 + 开壁纸 + 关键字有颜色 + 壁纸真的透得出来」这四件事同时成立。所以另起一层 `docs/_scenario.mjs`，18 条断言分四个场景：

| 场景 | 验什么 | 关键断言 |
|---|---|---|
| A 透光橙 + 壁纸 | 用户的核心诉求 | 主题层 70 条令牌且**不写**画布令牌；壁纸层独占 `bg-base` 且是 `color-mix` 半透明；shiki 10 条全由主题驱动，不含宿主默认的 `#d6336c` 等硬编码色 |
| B 实色主题 + 忽略背景 | 覆盖顺序 | 两层都注册且 `bg.seq > theme.seq`；主题仍写画布令牌（只是被压住，可随时关开关退回） |
| C 跟随系统 + 壁纸 | 不选主题也要能用 | `system` 零注册，壁纸层照常生效 |
| D 透光橙 + 壁纸关闭 | 无壁纸时不塌 | 壁纸层未注册，主题层仍注册，画布交还宿主 |

场景 A 里有一条断言写得有点绕，值得解释：`--dsw-alias-markdown-strong` 这类角色令牌**在宿主里根本不存在**（宿主只有 11 个容器级 Markdown 令牌），所以断言写的是「缺失 4/4 → 通过」，因为正确做法是走主题自带的元素级 CSS 兜底 `strong{color:...}`。如果哪天有人给宿主补了这些变量却忘了改这边，这条断言会翻红提醒。

这一层抓到的东西是前四层抓不到的：`W8` 只验 `reapplyLayers()` 里的分支对错，场景 B 验的是**经过完整 `apply()` 装配后**最终生效的 seq 大小关系。

---

## 五、62 套主题的数据完整性

### 数据体量

| 项目 | 字节 |
|---|---|
| 37 套内置主题 | 169,906 |
| 25 套 IP 预置 | 28,735 |
| 提取后的数据段 | 203,809 |
| 引擎段（6 个模块） | 87,647 |
| **最终 client.js** | **392,304** |

不移植的：上游内联的 base64 woff2 字体（`FONT_FACE_CSS`，数十 MB）、排版引擎（`buildTypographyCss`，用户已裁决舍弃）。

### 断言

- `T1`–`T5`：37 内置 / 25 IP / 中文名 38 条 / 英文名 38 条 / 透光橙在册
- `T6`–`T7`：37 套全部构建成功；令牌名与形状全部合规（`--dsw-*` / `--dsl-*` / `--shiki-*` 三类前缀都是宿主真实消费的）
- `T8`：IP 预置非 diff 令牌 `light === dark`（单套色）；diff 槽两半不同是 `ensureDiffContrast` 刻意按明暗分别推离
- `T9`：委托画布主题**仅透光橙一套** —— 这条是壁纸行为的前提，一旦有别的主题变成委托画布，壁纸的行为就变了，必须有人重新审
- `T10`–`T12`：透光橙不写画布令牌 / 实色主题写
- `T13`：CSS 含 `strong` / `em` / `blockquote` / `hr` 元素级兜底（宿主没有这些角色变量）
- `T14`–`T16`：主题 CSS 不含 `--dsw-font-family` / `--ds-font-family-code` / `--dsw-font-markdown` —— 排版交宿主
- `T17`–`T18`：shiki 令牌 ≥10 条，且值不是宿主默认硬编码色（`#d6336c` 等）
- `T19`–`T21`：8 个色系分组覆盖 38 套，透光橙落在 `transparent` 组
- `T22`：非委托主题的浅色画布不被丢弃

### 一个刻意的取舍：不走 `generateTheme()`

`generateTheme()` 内部无条件调 `buildTypographyCss()`，会写 `--dsw-font-family` / `--ds-font-family-code` / `--dsw-font-markdown-*` 一整套字体变量和 `body{font-size:13px}`。排版功能已舍弃，所以只取颜色那一半：`resolveThemeColors → buildTokens + buildColorCss`。`T14`–`T16` 就是守着这条边界。

---

## 六、持久化与迁移

### 存储契约（不变）

- localStorage key：`dsh-ios-theme:v1`（**逐字保留**，不因版本号改 key）
- IndexedDB：db `dsh-ios-theme` v1，store `backgrounds`，keyPath `id`
- 记录形状：`{id, name, blob, thumb, width, height, bytes, addedAt}`

### 1.x → 2.0 迁移

```js
// base: 'opencode' → theme: 'oc-2'   （两者都是中性灰）
// base: 'night'    → theme: 'lucent-orng'（两者都是暖色纸感）
// 其余旧字段（accent / emphasis / syntax / uiFont / codeFont / terminalFont /
//             lineHeight / tracking / fontRestore）一律丢弃
```

`night` 优先于 palette 的判断沿用 1.x 的迁移口径：旧版夜间护眼开启时调色板本来就失效，保留用户当时看到的样子。

### 断言

`S1`–`S3` 迁移与回落；`S4`–`S11` 写回 `v:2` 且旧字段全丢；`S12`–`S13` 卸载净空（html 无残留标记、`<style>` 已移除）。

**注意**：迁移发生在**读取时**，写回要等下一次 `saveState()`。所以断言里要先触发一次交互（点开关）再读 storage —— `S4` 就是干这个的。

---

## 七、设置页

结构从 5 张卡变成 2 张卡 + 1 行开关：

```
状态行（当前主题 · 明暗 · 画布归属）
  ├ 主题卡（9 个分组 × 芯片网格，共 63 个芯片 = 37 内置 + system + 25 IP）
  ├ 忽略主题背景开关行
  └ 背景图卡（导入 / 拖拽 / 粘贴 / 缩略图网格 / 模糊 / 遮罩 / 透明度 / 填充方式 / 轮换）
```

`U1`–`U11` 覆盖：卡片与状态行存在、芯片网格存在、63 个芯片、名称全可读（不出现 `undefined`）、开关可点击并落盘。

### 芯片设计

双色圆点：底色用主题的 `background`，右侧 `box-shadow: inset -4px 0 0 0 <primary>` 叠品牌色。透光主题没有 `background`（`transparent`），画成空心描边圈 —— 一眼能认出「这套是透光的」。

---

## 八、变异验证（断言有牙齿的证明）

`test/_mutation.mjs` 故意破坏源码，确认对应断言变红，再原样还原：

| 变异 | 破坏什么 | 期望捕获 | 结果 |
|---|---|---|---|
| M1 | 把「两半各用自己配色」改回 `delegated` | `W7b` | 捕获 ✓ |
| M2 | `reapplyLayers` 两个分支对调 | `W8` | 捕获 ✓ |
| M3 | 让透光橙也写画布令牌 | `W3` | 捕获 ✓ |
| M4 | 让 system 主题也注册令牌层 | `W10` | 捕获 ✓ |
| M5 | 卸载时不调 `bgTeardown` | `S12` | 捕获 ✓ |
| M6 | 开关点击后不落盘 | `U11` | 捕获 ✓ |
| M7 | 往 tokens 里塞裸字符串 | `W5b` | 捕获 ✓ |

**7 / 7 捕获，源码还原 sha256 一致。**

### 为什么 M3 / M7 的期望改过

一开始 M3 期望 `[W3, T10]`、M7 期望 `[T7]`，实际只捕获到 `W3` / 无。原因：`T7`、`T10` 直接调引擎，**绕过了 `04-theme.js`**，所以 `04-theme.js` 层的变异它们看不见。

这不是放宽断言，是补了一道闸：新增 `W5b`（走真实注册路径验令牌形状）。现在 `04-theme.js` 里任何往 tokens 塞非法形状的改动都会被 `W5b` 抓住。

这条经验值得记住：**断言走哪条路径，决定了它能看见哪一层的错误**。引擎层断言看不见适配层的问题，反之亦然。

---

## 九、人眼复核清单

自动化断言只能证明「颜色对比度达标」「结构存在」「顺序正确」，证明不了「好看」。以下需要人眼过一遍。

预览页不入库（8 个文件合计 446KB，是产物不是源码）。先跑一次生成：

```
node docs/_render_page.mjs
```

会在 `docs/` 下写出 8 个 `_page-*.html`，浏览器直接打开即可。它们每次都从 `client.js` 现读现渲染，改了插件重跑就同步。

| 场景 | 文件 | 看什么 |
|---|---|---|
| 透光橙 · 深色 | `_page-lucent-dark.html` | 橙色调是否协调，代码高亮分色是否清楚 |
| 透光橙 · 浅色 | `_page-lucent-light.html` | 浅色下橙色是否过艳 |
| 透光橙 + 壁纸 | `_page-wallpaper.html` | 透光效果是否自然，文字是否仍可读 |
| Gruvbox · 深/浅 | `_page-gruvbox-dark.html` / `-light.html` | 明暗切换是否真的两套配色 |
| Catppuccin · 浅色 | `_page-catppuccin-light.html` | 对比度修复后的加粗/斜体/链接是否协调 |
| Dracula · 深色 | `_page-dracula-dark.html` | 紫色系下的语义色层次 |
| IP 预置 | `_page-ip.html` | 赛博朋克2077 的观感 |

需要重点看的：

1. **对比度修复有没有把颜色推得「脏」** —— 推离只在黑/白方向混色，理论上保持色相，但幅度大的时候可能显得发灰。
2. **芯片网格的密度** —— 63 个芯片分 9 组，滚动手感如何。
3. **透光橙 + 壁纸的实际观感** —— 这是用户 m01202 的核心诉求，自动化测不出「好不好看」。
4. **明暗切换的过渡** —— 250ms 的 `background-color`/`color` 过渡在主题切换时会不会闪。

---

## 十、没有验证到的

诚实列出边界：

1. **真实宿主里的加载** —— 全部断言跑在 `docs/_harness.mjs` 的最小 DOM 与 mock ctx 上。mock 覆盖了 `overrideTokens` 的 seq 语义、`getComputedStyle`、`localStorage`、`IndexedDB` 桩，但不是真浏览器。真机上需要确认：插件被宿主加载后设置页能正常渲染、主题切换无闪烁、壁纸在真实三栏布局里的观感。
2. **`prefers-reduced-transparency` 与 darwin 侧栏的实际效果** —— 逻辑在 `bgSurfaceAlpha()` / `bgSideFactor()` 里，断言只验了数值计算，没验真机观感。
3. **`system` 主题下壁纸的表现** —— 场景 C 已验令牌层零注册、壁纸层独立生效，等价于「宿主默认 + 壁纸」；但真机观感没看过。
4. **IndexedDB 大图（接近 64MB 上限）** —— 只验了流程，没验极限体量。
5. **63 个芯片的全量视觉** —— 只抽样看了 8 个场景。
6. **端到端场景的观感** —— 第 5 层验的是层序与令牌归属（谁写了哪个令牌、谁的 seq 更大），证明不了「透光橙 + 壁纸」在真机三栏布局里好不好看。这一条只能靠人眼，见 §九 第 3 项。

---

## 十一、仓库里有什么

```
client.js                拼装产物（38 万字节），插件唯一入口
docs/src/                八段源码 —— 改代码改这里
docs/_assemble.mjs       拼装器
docs/_harness.mjs        mock DOM + mock ctx（断言都跑在它上面）
docs/_verify_v2.mjs      插件行为验证 80 条
docs/_scenario.mjs       端到端场景验证 18 条
docs/_engine_smoke.mjs   引擎自检 21 条
docs/_selfcheck.mjs      模块外壳自检 23 条
docs/_extract_themes.mjs 从上游抽 62 套主题数据（上游升级后重跑）
docs/_extract_engine.mjs 从上游抽引擎逻辑段（上游升级后重跑）
docs/_render_page.mjs    生成 8 个预览页（产物不入库）
test/run-all.mjs         五层编排器（--mutation 加第 6 层）
test/_mutation.mjs       7 个变异，验断言是否真的在守东西
tests-report.md          本文件
```

**只改 `client.js` 会被下次拼装覆盖。** 手写段是 01/04/05/06/07/09，02/03 由 `_extract_*.mjs` 生成后人工裁剪过。

上游（`dsh-opencode-palette`）升级后，`_extract_themes.mjs` / `_extract_engine.mjs` 会写出 `_theme-data.snippet.js` / `_engine.snippet.js` 两个临时中间文件，**那是比对基准，不是落盘位置**：与 `docs/src/02-theme-data.js` / `03-engine.js` 比对后手工合并，然后删掉中间文件、重跑 `_assemble.mjs`。

1.x 时代的测试套件、验证脚本、评审报告已随 2.0 重构一并删除 —— 它们测的架构（基调三选一、语义角色层、字体接管）在 2.0 里不存在了，留着只会误导。
