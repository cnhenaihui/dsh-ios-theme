// 把 AppPage 的虚拟树渲染成真实 HTML，注入插件自己的 CSS 与 NEXT 的真实令牌，
// 供 vision_html_screenshot 用真 Chrome 出图后做视觉判断。
//
// 为什么要这么做：断言只能证明「代码里写了对的类名与令牌」，证明不了「长得好不好看」。
//
// 2.0 起场景换了：不再有「夜间护眼」这个独立开关，改成主题。所以预览的场景是
//   「几套有代表性的主题 × 明暗 × 壁纸」，重点看三件事：
//   1. 设置页本身在每套主题下是否仍然清晰（卡片、文字、芯片、开关）
//   2. 主题的 Markdown / 语法配色在对话内容里是否真的可辨（对比度修复层的效果）
//   3. 壁纸 + 透光橙能否透出来，实色主题下是否真的盖住壁纸
//
// 两种用法：
//   1. CLI：node docs/_render_page.mjs  → 生成 docs/_page-*.html 并打印结构自检
//   2. 被 test/_visual.mjs import：拿 SCENES / buildPage() 生成到 test/_artifacts/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlugin } from './_harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PROBE = path.resolve(ROOT, '..', '_next-probe');
const SOURCE = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');

// —— 1. 从 client.js 抽出 CSS 模板串（与运行时注入的是同一份）——
const cssStart = SOURCE.indexOf('const CSS = `');
if (cssStart < 0) throw new Error('找不到 CSS 模板');
const cssBodyStart = cssStart + 'const CSS = `'.length;
const cssEnd = SOURCE.indexOf('`;', cssBodyStart);
export const PLUGIN_CSS = SOURCE.slice(cssBodyStart, cssEnd);

// —— 2. 取出主题引擎，用它按主题 id 现场生成令牌与元素级 CSS ——
// 引擎在 factory 闭包里，外面够不着，只能按源码位置截段求值。
// 与 _verify_v2.mjs 用的是同一个截取口径，两边必须一致。
function loadEngine() {
  const start = SOURCE.indexOf('    // 主题数据（62 套');
  const end = SOURCE.indexOf('    // —— 主题引擎的模块引用 ——');
  if (start < 0 || end < 0) throw new Error('找不到主题数据/引擎段');
  const body = SOURCE.slice(start, end);
  const fn = new Function(body + '\nreturn { THEMES, IP_PRESETS, THEME_ZH, THEME_EN, __mods };');
  return fn();
}

const engine = loadEngine();
const RESOLVE = engine.__mods['resolve'];
const MAP_DSH = engine.__mods['map-dsh'];
const GENERATE = engine.__mods['generate'];

// —— 3. 复刻 client.js 的对比度修复层（预览必须与运行时看到的一致）——
const SEMANTIC_MIN_CONTRAST = 4.5;
const PUSH_STEP = 0.02;
const SEMANTIC_FOREGROUNDS = [
  'markdownStrong', 'markdownEmph', 'markdownLink', 'markdownCode',
  'markdownBlockQuote', 'markdownHeading',
  'syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxString',
  'syntaxNumber', 'syntaxType', 'syntaxOperator',
];
const SOLID_HEX = /^#[0-9a-fA-F]{6}$/;
const isSolidHex = (v) => typeof v === 'string' && SOLID_HEX.test(v);

function worstContrast(fg, backgrounds) {
  let worst = null;
  for (const bg of backgrounds) {
    const c = RESOLVE.contrastRatio(fg, bg);
    if (typeof c !== 'number' || !isFinite(c)) continue;
    if (worst === null || c < worst) worst = c;
  }
  return worst;
}

function assumedCanvas(colors) {
  const text = colors.markdownText;
  if (!isSolidHex(text)) return null;
  return RESOLVE.relativeLuminance(text) > 0.5 ? '#000000' : '#FFFFFF';
}

function repairSemanticContrast(colors, delegated) {
  const out = Object.assign({}, colors);
  const backgrounds = [];
  if (delegated) {
    const assumed = assumedCanvas(out);
    if (assumed) backgrounds.push(assumed);
  } else if (isSolidHex(out.background)) {
    backgrounds.push(out.background);
  }
  if (!backgrounds.length) return out;
  const blackWorst = worstContrast('#000000', backgrounds) || 0;
  const whiteWorst = worstContrast('#FFFFFF', backgrounds) || 0;
  const end = blackWorst >= whiteWorst ? '#000000' : '#FFFFFF';
  const taken = new Set();
  for (const slot of SEMANTIC_FOREGROUNDS) {
    const current = out[slot];
    if (!isSolidHex(current)) continue;
    const worst = worstContrast(current, backgrounds);
    if (worst === null) continue;
    if (worst >= SEMANTIC_MIN_CONTRAST) { taken.add(current.toUpperCase()); continue; }
    let next = null;
    for (let k = PUSH_STEP; k <= 1.0001; k += PUSH_STEP) {
      const candidate = RESOLVE.mixHex(current, end, Math.min(1, k)).toUpperCase();
      if (taken.has(candidate)) continue;
      const c = worstContrast(candidate, backgrounds);
      if (c !== null && c >= SEMANTIC_MIN_CONTRAST) { next = candidate; break; }
    }
    if (!next) next = end;
    out[slot] = next;
    taken.add(next);
  }
  return out;
}

/**
 * 按主题 id 生成 { tokens, css, delegated, colors }。
 * colors 是「修复后」的色槽表，预览的对话样例直接用它上色。
 */
export function renderTheme(id) {
  const preset = Object.keys(engine.IP_PRESETS)
    .map((k) => engine.IP_PRESETS[k])
    .find((p) => p && p.id === id);
  if (preset) {
    const norm = MAP_DSH.normalizeThemeColors(preset.colors);
    const fixed = repairSemanticContrast(norm, false);
    const tokens = GENERATE.buildTokens(fixed, fixed, false);
    const css = GENERATE.buildColorCss(
      RESOLVE.ensureDiffContrast(fixed, true),
      RESOLVE.ensureDiffContrast(fixed, false),
      tokens,
      false,
    );
    return { tokens, css, delegated: false, colors: { light: fixed, dark: fixed } };
  }
  const json = engine.THEMES[id];
  if (!json) throw new Error('未知主题 ' + id);
  const rawDark = RESOLVE.resolveThemeColors(json, 'dark');
  const rawLight = RESOLVE.resolveThemeColors(json, 'light');
  const delegated = RESOLVE.isDelegatedSurface(rawDark, rawLight);
  const dark = repairSemanticContrast(rawDark, delegated);
  const light = repairSemanticContrast(rawLight, delegated);
  // 第三参数恒为 true：与 client.js 的 renderTheme 一致 ——
  // 「画布是否委托」（delegated）与「两半是否各用自己配色」是两件事，
  // 非委托主题也要跟随明暗，否则浅色模式下仍是深色底。
  const tokens = GENERATE.buildTokens(dark, light, true);
  const css = GENERATE.buildColorCss(dark, light, tokens, true);
  return { tokens, css, delegated, colors: { light, dark } };
}

// —— 4. NEXT 真实令牌（抓好的 dump：--dsw-xxx = value 每行一条）——
export function readTokens(file) {
  const lines = fs.readFileSync(path.join(PROBE, file), 'utf8').split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const m = line.match(/^\s*(--[\w-]+)\s*=\s*(.+?)\s*$/);
    if (m) out.push([m[1], m[2]]);
  }
  return out;
}
export const LIGHT = readTokens('tokens-light.txt');
export const DARK = readTokens('tokens-dark.txt');

// base.css 的 body{} 里还有两条 alias 不在 design-platform 的 dump 里。
// 不注入它们，设置卡片的底色就只能走 CSS 里的 var() fallback（bg-layer-1），
// 而真实环境里走的是 settings-card-fill → bg-layer-2。预览必须与真实链一致。
const BASE_CSS_ALIASES = (() => {
  const abs = path.join(PROBE, 'css-base.css');
  const out = [];
  if (!fs.existsSync(abs)) return out;
  for (const m of fs.readFileSync(abs, 'utf8').matchAll(/(--dsw-alias-[a-z0-9-]+)\s*:\s*([^;}]+)/g)) {
    out.push([m[1], m[2].trim()]);
  }
  return out;
})();
export const BASE_EXTRA_ALIASES = BASE_CSS_ALIASES;

const BASE_EXTRA = `
  --dsw-radius-xs: 4px; --dsw-radius-sm: 8px; --dsw-radius-md: 12px;
  --dsw-radius-lg: 16px; --dsw-radius-xl: 20px; --dsw-radius-panel: 28px;
  --ds-transition-duration: .2s; --ds-transition-duration-fast: .1s;
  --ds-ease-in-out: cubic-bezier(.4, 0, .2, 1);
  --ds-font-family-code: "SF Mono", "JetBrains Mono", Consolas, monospace;
  --dsw-font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
`;

const toBlock = (pairs, indent = '  ') => pairs.map(([k, v]) => `${indent}${k}: ${v};`).join('\n');

// —— 5. 虚拟树 → HTML ——
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);

function styleToString(style) {
  if (!style || typeof style !== 'object') return '';
  return Object.entries(style)
    .map(([k, v]) => {
      const prop = k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
      return `${prop}: ${v}`;
    })
    .join('; ');
}

// React 属性名 → HTML 属性名。code 里用的是 React 的 className/htmlFor，
// 原样输出会让样式全部失配（预览图变成没有样式的裸 DOM，看不出任何问题）。
const ATTR_MAP = {
  className: 'class',
  htmlFor: 'for',
  tabIndex: 'tabindex',
  readOnly: 'readonly',
  maxLength: 'maxlength',
  ariaLabel: 'aria-label',
};
const mapAttr = (k) => ATTR_MAP[k] || k;

function render(node, depth = 0) {
  if (node === null || node === undefined || node === false || node === true) return '';
  if (Array.isArray(node)) return node.map((n) => render(n, depth)).join('');
  if (typeof node === 'string' || typeof node === 'number') return esc(node);
  if (typeof node !== 'object') return '';

  const { type, props = {}, children = [] } = node;

  // 组件：递归调用（stub 的 hooks 返回固定值，一次渲染足够看结构）
  if (typeof type === 'function') {
    if (depth > 20) return '';
    return render(type(props), depth + 1);
  }
  if (typeof type !== 'string') return '';

  const attrs = [];
  for (const [rawKey, v] of Object.entries(props)) {
    if (rawKey === 'children' || rawKey === 'key' || rawKey === 'ref') continue;
    if (rawKey.startsWith('on')) continue; // 事件在静态页里无意义
    const k = mapAttr(rawKey);
    if (rawKey === 'style') { const s = styleToString(v); if (s) attrs.push(`style="${esc(s)}"`); continue; }
    if (v === true) { attrs.push(k); continue; }
    if (v === false || v === null || v === undefined) continue;
    attrs.push(`${k}="${esc(v)}"`);
  }
  const open = `<${type}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
  const VOID = new Set(['input', 'br', 'hr', 'img', 'meta', 'link']);
  if (VOID.has(type)) return open;
  return `${open}${children.map((c) => render(c, depth + 1)).join('')}</${type}>`;
}

// —— 6. 拿到 AppPage 并渲染 ——
const harness = loadPlugin();
const tree = harness.renderSettingsPage();
export const PAGE_HTML = render(tree);

// —— 7. 组装场景 ——
/**
 * 生成一个场景的完整 HTML 文本。
 * @param {{mode:'light'|'dark', theme:string, wallpaper?:boolean}} scene
 */
export function buildPage({ mode, theme, wallpaper }) {
  const render_ = renderTheme(theme);
  const base = mode === 'dark' ? DARK : LIGHT;
  const pairs = [...base];

  // 先补 base.css 的 alias（settings-card-fill / stroke）
  for (const [k, v] of BASE_CSS_ALIASES) {
    if (!pairs.some(([name]) => name === k)) pairs.push([k, v]);
  }

  // 再叠主题令牌（与运行时 overrideTokens 的顺序一致：宿主底 → 主题覆盖）
  for (const [name, value] of Object.entries(render_.tokens)) {
    const v = value[mode];
    if (typeof v !== 'string' || v === 'transparent') continue;
    const idx = pairs.findIndex(([k]) => k === name);
    if (idx >= 0) pairs[idx] = [name, v];
    else pairs.push([name, v]);
  }

  // 壁纸场景：模拟插件把 bg-base 降到 80% 不透明、body 上有壁纸层。
  // 透光橙本来就不写 bg-base，这里补一条等价于「壁纸层接管」。
  //
  // 关键：插件运行时会把主题的真实底色读出来写进 --ios-bg-base-raw / --ios-bg-side-raw，
  // 再由 CSS 的 !important 规则混成半透明。预览必须补这两个变量 ——
  // 否则 color-mix(in srgb, var(--ios-bg-base-raw) ...) 因为变量缺失整条失效，
  // bg-base 变成空值 → 完全透明 → 文字直接压在壁纸上看不清，
  // 那测出来的就不是插件的真实效果，而是预览自己的 bug。
  if (wallpaper) {
    const solid = mode === 'light' ? '#f6efe6' : '#181209';
    const side = mode === 'light' ? '#f2f2f4' : '#111111';
    const idx = pairs.findIndex(([k]) => k === '--dsw-alias-bg-base');
    const value = `color-mix(in srgb, ${solid} 80%, transparent)`;
    if (idx >= 0) pairs[idx] = ['--dsw-alias-bg-base', value];
    else pairs.push(['--dsw-alias-bg-base', value]);
    pairs.push(['--ios-bg-base-raw', solid]);
    pairs.push(['--ios-bg-side-raw', side]);
    pairs.push(['--ios-bg-base-alpha', '80%']);
    pairs.push(['--ios-bg-side-alpha', '80%']);
  }

  // 深色标记必须挂在 body 上：NEXT 的主题 CSS 与插件生成的 CSS 都用
  // `body[data-ds-dark-theme]` 选择器（见 buildColorCss 的 delegated 分支）。
  // 挂到 html 上会让深色规则全部不匹配，预览就变成「浅色文字色 + 深色底」的假象。
  const htmlAttrs = wallpaper ? ' data-ios-bg="on" data-ios-bg-surface="on"' : '';
  const bodyAttrs = mode === 'dark' ? ' data-ds-dark-theme' : '';

  const colors = render_.colors[mode] || render_.colors.dark;
  const sample = buildSample(colors, mode);

  // 令牌必须落在 body 上（NEXT 的 presenter 就是写 body.style），html 只放基础
  const bodyVars = toBlock(pairs);
  return `<!doctype html>
<html lang="zh-CN"${htmlAttrs}>
<head>
<meta charset="utf-8">
<title>ios-theme settings · ${theme} · ${mode}${wallpaper ? ' +wallpaper' : ''}</title>
<style>
/* ===== NEXT 真实令牌（tokens-${mode}.txt）+ 主题「${theme}」覆盖 ===== */
:root {${BASE_EXTRA}
}
body {
${bodyVars}
  margin: 0;
  background-color: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}
${wallpaper ? `
/* 壁纸层：直接铺在 html 上，而不是用 body::before。
   这里要验的是「设置卡片有没有把壁纸透出来」，用 html 背景就够，
   而且不会被 body 的 z-index:-1 伪元素层级问题干扰。 */
html {
  background-image:
    radial-gradient(circle at 18% 22%, #c9752f 0, transparent 38%),
    radial-gradient(circle at 82% 68%, #3f6fc4 0, transparent 36%),
    linear-gradient(135deg, #e8d5b8, #c7d3e6 52%, #dfc7ae);
  background-attachment: fixed;
}
` : ''}
/* ===== 插件自己的样式表（与运行时注入的逐字相同）===== */
${PLUGIN_CSS}
/* ===== 主题生成的颜色 CSS（buildColorCss 的原样输出）===== */
${render_.css}
/* ===== 只有预览才需要的舞台 =====
   真实环境里设置面板是一个模态容器，底色是 --dsw-alias-bg-layer-2（实色，
   插件不会把它半透明化）。这里必须把这层补上 —— 否则壁纸会直接铺到页头文字下面，
   测出来的对比度是整个假的。 */
.stage { box-sizing: border-box; width: 720px; margin: 0 auto; padding: 28px 32px 40px; background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-panel, 28px); }
.stage-title { margin: 0 0 18px; font-size: 20px; line-height: 28px; font-weight: 600; color: var(--dsw-alias-label-primary); }
/* 对话样例区块：与设置页保持同一舞台样式，中间留出间距 */
.md-sample { margin-top: 24px; }
/* 壁纸场景下，对话区必须用 bg-base 而不是 bg-layer-2 ——
   插件把 bg-base 降成半透明、把 layer-1（小控件）也降了，但 bg-layer-2
   是浮层底（Modal / Menu / 设置面板），从不半透明化，所以设置面板保持
   不透明是对的，而工作区才透出壁纸。这里照实画。 */
${wallpaper ? `.md-sample { background: var(--dsw-alias-bg-base); backdrop-filter: blur(0px); }` : ''}
.md-sample .markdown { font-size: 14px; line-height: 1.75; }
.md-sample pre { margin: 14px 0; padding: 14px 16px; border-radius: 12px; background: var(--dsw-alias-markdown-code-block); overflow: auto; }
.md-sample pre code { font-family: var(--ds-font-family-code); font-size: 13px; }
.md-sample :not(pre) > code { padding: 0 5px; border-radius: var(--dsw-radius-sm, 8px); background: var(--dsw-alias-markdown-inline-code); border: 0.5px solid var(--dsw-alias-border-l1); }
</style>
</head>
<body${bodyAttrs}>
<div class="stage">
  <h1 class="stage-title">外观与壁纸</h1>
  ${PAGE_HTML}
</div>
<!-- ===== 对话内容样例：验证「主题自带的关键字/Markdown 配色」 =====
     这不是设置页的一部分，而是把它下面的渲染结果摆出来，
     让人眼能直接判断语义分色是否可辨、代码高亮是否跟上了主题。
     用的是 .markdown 容器（宿主真实类名），strong/em/blockquote 由主题 CSS 兜底。 -->
<div class="stage md-sample">
  <h2 class="stage-title">对话内容预览 · ${theme} · ${mode === 'dark' ? '深色' : '浅色'}</h2>
  <div class="markdown">
    ${sample}
  </div>
</div>
</body>
</html>`;
}

// 对话样例：四种语义强调 + 行内代码 + 代码块 + 列表 + 分隔线。
// 上色全部靠主题的 CSS_RULES 与 shiki 变量，这里不写任何硬编码色 ——
// 一旦预览里出现了「和主题无关的颜色」，就说明兜底规则没生效。
function buildSample(colors, mode) {
  const c = colors || {};
  return `
    <h1>标题一：主题里的 markdownHeading</h1>
    <p>普通正文，这里有 <strong>加粗的关键词</strong> 和 <em>斜体的语气强调</em>，
    还有 <code>inline_code()</code> 与 <a href="#">一个链接</a>，
    以及 <del>已废弃的旧方案</del>。</p>
    <blockquote><p>引用块：这里是主题的 markdownBlockQuote。用来验证左侧竖线是否够清楚。</p></blockquote>
    <ul><li>列表项一</li><li>列表项二，含 <code>code()</code></li></ul>
    <hr>
    <pre><code><span style="color:var(--shiki-token-keyword)">const</span> <span style="color:var(--shiki-token-function)">fetchUser</span> = <span style="color:var(--shiki-token-keyword)">async</span> (<span style="color:var(--shiki-token-parameter)">id</span>) =&gt; {
  <span style="color:var(--shiki-token-comment)">// 注释跟主题走</span>
  <span style="color:var(--shiki-token-keyword)">return</span> { <span style="color:var(--shiki-token-parameter)">id</span>: <span style="color:var(--shiki-token-string)">'u_1'</span>, <span style="color:var(--shiki-token-constant)">ok</span>: <span style="color:var(--shiki-token-constant)">true</span> };
};</code></pre>
  `.trim();
}

// 五个场景。选主题的口径：
//  · lucent-orng —— 透光橙，用户点名要的那套（委托画布，壁纸可见）
//  · gruvbox    —— 实色画布里对比度最稳的一套，做「默认长什么样」的基准
//  · catppuccin —— 浅色下语义色原本大面积不达标（strong 2.64:1），用来看修复层
//  · dracula    —— 深色系代表
export const SCENES = [
  { key: 'lucent-light', file: '_page-lucent-light.html', label: '透光橙 · 浅色', mode: 'light', theme: 'lucent-orng', wallpaper: false },
  { key: 'lucent-dark', file: '_page-lucent-dark.html', label: '透光橙 · 深色', mode: 'dark', theme: 'lucent-orng', wallpaper: false },
  { key: 'gruvbox-light', file: '_page-gruvbox-light.html', label: 'Gruvbox · 浅色', mode: 'light', theme: 'gruvbox', wallpaper: false },
  { key: 'gruvbox-dark', file: '_page-gruvbox-dark.html', label: 'Gruvbox · 深色', mode: 'dark', theme: 'gruvbox', wallpaper: false },
  { key: 'catppuccin-light', file: '_page-catppuccin-light.html', label: 'Catppuccin · 浅色（修复层）', mode: 'light', theme: 'catppuccin', wallpaper: false },
  { key: 'dracula-dark', file: '_page-dracula-dark.html', label: 'Dracula · 深色', mode: 'dark', theme: 'dracula', wallpaper: false },
  { key: 'wallpaper', file: '_page-wallpaper.html', label: '透光橙 + 壁纸', mode: 'dark', theme: 'lucent-orng', wallpaper: true },
  { key: 'ip', file: '_page-ip.html', label: 'IP 预置 · 赛博朋克2077', mode: 'dark', theme: 'cyberpunk-2077', wallpaper: false },
];

/**
 * 把所有场景写到指定目录，返回 [{ scene, path, size }]。
 * CLI 与 test/_visual.mjs 都走这一个函数，避免两套渲染路径漂移。
 */
export function generate(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const out = [];
  for (const scene of SCENES) {
    const html = buildPage(scene);
    const abs = path.join(outDir, scene.file);
    fs.writeFileSync(abs, html, 'utf8');
    out.push({ scene, path: abs, size: fs.statSync(abs).size });
  }
  return out;
}

// —— 8. CLI（node docs/_render_page.mjs）——
function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry).toLowerCase() === path.resolve(fileURLToPath(import.meta.url)).toLowerCase();
}

if (isDirectRun()) {
  for (const item of generate(HERE)) {
    console.log('wrote', item.scene.file, item.size, 'bytes');
  }

  console.log('\n页面结构自检：');
  for (const cls of ['ios-thm-status', 'ios-thm-card', 'ios-thm-tgrid', 'ios-thm-tchip', 'ios-thm-switch']) {
    const n = (PAGE_HTML.match(new RegExp(cls, 'g')) || []).length;
    console.log(`  ${cls.padEnd(24)} ${n}`);
  }
  const cardCount = (PAGE_HTML.match(/class="ios-thm-card"/g) || []).length;
  console.log(`  卡片数 (ios-thm-card)     ${cardCount}`);
}
