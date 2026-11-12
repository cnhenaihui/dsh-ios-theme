#!/usr/bin/env node
/**
 * _extract_themes.mjs — 从 dsh-opencode-palette 提取 62 套主题的纯数据段。
 *
 * 为什么要有这个脚本而不是手抄：
 *   62 套主题合计约 200KB，手抄必错；而这个文件只是把上游的「纯字面量」原样搬运，
 *   不参与任何逻辑。保留脚本 = 上游更新后可以一键重抽，也留下「数据从哪来」的证据。
 *
 * 输出：docs/_theme-data.snippet.js —— 一段可直接内联进 client.js 的 JS 源码，
 *   含 `THEMES`（37 套内置，kebab 键）、`IP_PRESETS`（25 套 IP 预置）、`THEME_ZH`。
 *
 * ⚠ 产物是**临时中间文件**，不入库（跑完确认内容无误即可删）。它只是「上游原样搬运」
 * 的比对基准，真正的落盘位置是 docs/src/02-theme-data.js（那里缩进 4 空格、注释改写过）。
 * 上游升级后：跑本脚本 → 与 docs/src/02-theme-data.js 比对 → 手工合并 → 重拼装。
 *
 * 用法：
 *   node docs/_extract_themes.mjs            # 生成并报告体量
 *   node docs/_extract_themes.mjs --check    # 只校验上游可读、不写文件
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UPSTREAM = String.raw`C:\Users\henaihui01\.dsh\profiles\desktop\node_modules\dsh-opencode-palette\lib\client.js`;
const OUT = path.join(HERE, '_theme-data.snippet.js');

/** 从 src 中截取 [from, to) —— 用精确锚点，避免误切。 */
function sliceBetween(src, from, to) {
  const i = src.indexOf(from);
  if (i < 0) throw new Error('找不到起点锚点: ' + from);
  const j = src.indexOf(to, i + from.length);
  if (j < 0) throw new Error('找不到终点锚点: ' + to);
  return src.slice(i, j);
}

/** 截取一个 `const NAME = {...};` 顶层字面量，返回 `{...}` 文本（含花括号）。 */
function takeObjectLiteral(src, declName) {
  const anchor = 'const ' + declName + ' = ';
  const i = src.indexOf(anchor);
  if (i < 0) throw new Error('找不到定义: ' + declName);
  const open = src.indexOf('{', i + anchor.length);
  if (open < 0) throw new Error(declName + ' 后没有 {');
  let depth = 0;
  let inStr = null;
  for (let k = open; k < src.length; k++) {
    const ch = src[k];
    if (inStr) {
      if (ch === '\\') { k++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(open, k + 1);
    }
  }
  throw new Error(declName + ' 花括号未闭合');
}

const src = fs.readFileSync(UPSTREAM, 'utf8');

// ── 1. 37 套内置主题：`const amoled = {...}` … 直到 `const SYSTEM_THEME`
const THEME_IDS = [
  'amoled', 'aura', 'ayu', 'carbonfox', 'catppuccin-frappe', 'catppuccin-macchiato',
  'catppuccin', 'cobalt2', 'cursor', 'dracula', 'everforest', 'flexoki', 'github',
  'gruvbox', 'kanagawa', 'lucent-orng', 'material', 'matrix', 'mercury', 'monokai',
  'nightowl', 'nord', 'oc-2', 'one-dark', 'onedarkpro', 'opencode', 'orng',
  'osaka-jade', 'palenight', 'rosepine', 'shadesofpurple', 'solarized', 'synthwave84',
  'tokyonight', 'vercel', 'vesper', 'zenburn',
];

/** kebab id → 上游变量名（`lucent-orng` → `lucent_orng`，`oc-2` → `oc_2`） */
function varName(id) {
  return id.replace(/-/g, '_');
}

const themeDecls = [];
const missing = [];
for (const id of THEME_IDS) {
  const name = varName(id);
  try {
    themeDecls.push('const ' + name + ' = ' + takeObjectLiteral(src, name) + ';');
  } catch (e) {
    missing.push(id + '（变量 ' + name + '）: ' + e.message);
  }
}
if (missing.length) {
  throw new Error('内置主题缺失 ' + missing.length + ' 套：\n' + missing.join('\n'));
}

// ── 2. 25 套 IP 预置
const IP_IDS = [
  'cyberpunk-2077', 'dc-comics', 'disney', 'doraemon', 'dragon-ball', 'evangelion',
  'evangelion-day', 'genshin', 'genshin-night', 'harry-potter', 'hello-kitty', 'kuromi',
  'lego', 'mario', 'mario-night', 'marvel', 'naruto', 'naruto-night', 'one-piece',
  'pokemon', 'sailor-moon', 'star-wars', 'transformers', 'ultraman', 'zelda',
];
const ipDecls = [];
for (const id of IP_IDS) {
  const name = varName(id);
  ipDecls.push('const ip_' + name + ' = ' + takeObjectLiteral(src, name) + ';');
}

// ── 3. 中文名表：上游 THEME_ZH 只有部分键有中文，其余回落英文官方名，再回落 id
const zhRaw = takeObjectLiteral(src, 'THEME_ZH');
const enRaw = takeObjectLiteral(src, 'THEME_EN');

// ── 4. 拼装输出
const body = [
  '// ══════════════════════════════════════════════════════════════════════════',
  '// 主题数据段（由 docs/_extract_themes.mjs 从 dsh-opencode-palette 2.1.12 提取）',
  '//',
  '// 形状与上游一致：{ defs: {色名→hex}, theme: {角色→{dark,light}} }。',
  '// 角色值可以是 hex、defs 里的色名、theme 里别的角色名（引用链），或 "transparent"。',
  '// background / backgroundPanel / backgroundElement 为 "transparent" 的主题',
  '// 即「透光」系（透光橙），画布交给宿主，壁纸能透出来。',
  '//',
  '// 这一段是纯数据，不含逻辑。改主题请改数据，别在这里加分支。',
  '// ══════════════════════════════════════════════════════════════════════════',
  '',
  '// —— 37 套内置主题 ——',
  ...themeDecls,
  '',
  'const THEMES = {',
  ...THEME_IDS.map((id) => '  ' + JSON.stringify(id) + ': ' + varName(id) + ','),
  '};',
  '',
  '// —— 25 套 IP 预置（自定义主题的「选基底」来源，不进主列表）——',
  ...ipDecls,
  '',
  'const IP_PRESETS = {',
  ...IP_IDS.map((id) => '  ' + JSON.stringify(id) + ': ip_' + varName(id) + ','),
  '};',
  '',
  '// —— 主题名：中文优先，缺则英文官方名，再缺则 id ——',
  'const THEME_ZH = ' + zhRaw + ';',
  'const THEME_EN = ' + enRaw + ';',
  '',
].join('\n');

if (process.argv.includes('--check')) {
  console.log('上游可读，主题数 ' + THEME_IDS.length + ' + IP ' + IP_IDS.length + '，输出体量 ' + Buffer.byteLength(body, 'utf8') + ' 字节');
  process.exit(0);
}

fs.writeFileSync(OUT, body, 'utf8');

// ── 5. 自检：输出必须是合法 JS，且能解析出期望数量
const probe = new Function(body + '\nreturn { THEMES, IP_PRESETS, THEME_ZH, THEME_EN };');
const got = probe();
const nThemes = Object.keys(got.THEMES).length;
const nIp = Object.keys(got.IP_PRESETS).length;
if (nThemes !== 37) throw new Error('THEMES 数量不对: ' + nThemes);
if (nIp !== 25) throw new Error('IP_PRESETS 数量不对: ' + nIp);

// 每套主题必须能解析出 background/primary/text 三个必需角色
for (const [id, t] of Object.entries(got.THEMES)) {
  if (!t || !t.theme || !t.defs) throw new Error(id + ' 形状不对（缺 defs/theme）');
  for (const role of ['background', 'primary', 'text']) {
    if (!(role in t.theme)) throw new Error(id + ' 缺角色 ' + role);
  }
}
for (const [id, t] of Object.entries(got.IP_PRESETS)) {
  if (!t || !t.colors) throw new Error('IP ' + id + ' 缺 colors');
  for (const role of ['background', 'primary', 'text']) {
    if (!(role in t.colors)) throw new Error('IP ' + id + ' 缺角色 ' + role);
  }
}

console.log('已写出 ' + path.relative(process.cwd(), OUT));
console.log('  内置主题 ' + nThemes + ' 套 / IP 预置 ' + nIp + ' 套');
console.log('  中文名 ' + Object.keys(got.THEME_ZH).length + ' 条 / 英文名 ' + Object.keys(got.THEME_EN).length + ' 条');
console.log('  体量 ' + Buffer.byteLength(body, 'utf8') + ' 字节');
