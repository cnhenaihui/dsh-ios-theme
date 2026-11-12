#!/usr/bin/env node
/**
 * 从 dsh-opencode-palette 2.1.12 的 lib/client.js 里切出「主题引擎」的纯逻辑段。
 *
 * 为什么不用正则抓函数：上游是 esbuild 打包产物，所有模块都塞在 `(function(){...})()`
 * 里，只通过末尾的 `__mods["名"] = {...}` 导出。定位方式是「找到导出点 → 回溯到最近的
 * IIFE 开头 → 找到它自己的 `})();`」，这样拿到的永远是完整模块体，且不依赖手写偏移
 * （偏移会随上游版本漂移，回溯不会）。
 *
 * 用法：
 *   node docs/_extract_engine.mjs --check    只校验定位是否命中
 *   node docs/_extract_engine.mjs            写出 docs/_engine.snippet.js
 *
 * ⚠ 产物是**临时中间文件**，不入库（跑完确认内容无误即可删）。真正的落盘位置是
 * docs/src/03-engine.js（缩进 4 空格、裁掉字体链、注释改写过）。上游升级后：
 * 跑本脚本 → 与 docs/src/03-engine.js 比对 → 手工合并 → node docs/_assemble.mjs。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const UPSTREAM = String.raw`C:\Users\henaihui01\.dsh\profiles\desktop\node_modules\dsh-opencode-palette\lib\client.js`;
const OUT = join(HERE, '_engine.snippet.js');
const CHECK = process.argv.includes('--check');

// 只要这四个模块：色彩工具/解析、配对对比度修复、37 色槽映射、令牌与 CSS 生成、分组。
// 不取 registry / ip-presets / zh-names（那是数据，另有 _extract_themes.mjs）；
// 不取 font-face（内联 base64 字体，几十 MB）；不取 font-names（字体名净化，只服务排印 CSS）；
// 不取 custom-store（本地存储）。
//
// ⚠ 本脚本输出的是**上游原样切段**，不是 docs/src/03-engine.js 的生成器。
// src/03-engine.js 在此基础上有三处人工裁剪：删掉字体链（font-face 替身 / font-names /
// 字体预设 SANS_STACK+FONTS / codeFontStack / buildTypographyCss）、generate 只导出
// buildTokens+buildColorCss、注释改写。上游升级后重跑本脚本，需人工比对再合并。
const WANTED = ['resolve', 'pair-contrast', 'map-dsh', 'generate', 'grouping'];

const src = readFileSync(UPSTREAM, 'utf8');

/** 模块体切段：导出点 → 回溯 IIFE 开头 → 找自己的 `})();` */
function sliceModule(name) {
  const mark = `__mods["${name}"]`;
  const at = src.indexOf(mark);
  if (at < 0) return null;
  const start = src.lastIndexOf('(function () {', at);
  if (start < 0) return null;
  const close = src.indexOf('})();', at);
  if (close < 0) return null;
  const body = src.slice(start, close + 5);
  // 校验：模块体的**导出赋值**必须恰好是目标模块。
  // 注意不能直接数 `__mods["x"]` 出现次数 —— 模块之间会互相**读取**别的模块
  //（如 pair-contrast 里 `const {...} = __mods["resolve"]`），那是引用不是导出。
  // 所以只数带 `=` 的赋值形态，并要求最后一个就是自己。
  const assigns = [...body.matchAll(/__mods\["([^"]+)"\]\s*=/g)].map((m) => m[1]);
  if (assigns.length !== 1 || assigns[0] !== name) return null;
  return { body, start, end: close + 5 };
}

const found = {};
let bad = 0;
for (const name of WANTED) {
  const r = sliceModule(name);
  if (!r) {
    console.log(`MISS ${name}`);
    bad += 1;
    continue;
  }
  found[name] = r;
  const first = r.body.split('\n')[1] || '';
  console.log(`OK   ${name.padEnd(14)} ${String(r.start).padStart(8)}–${String(r.end).padEnd(8)} ${String(r.body.length).padStart(6)} 字节  ${first.trim().slice(0, 60)}`);
}

if (CHECK) {
  process.exit(bad ? 1 : 0);
}
if (bad) {
  console.error(`有 ${bad} 个模块切段失败，未写出文件`);
  process.exit(1);
}

const parts = [
  `// ══════════════════════════════════════════════════════════════════════════`,
  `// 主题引擎（逻辑段，由 docs/_extract_engine.mjs 从 dsh-opencode-palette 2.1.12 切出）`,
  `//`,
  `// 四个模块，按依赖顺序：resolve（色彩工具 + 主题解析）→ pair-contrast（配对对比度`,
  `// 修复）→ map-dsh（37 色槽 → DSH 令牌的唯一真相源）→ generate（令牌与 CSS 生成）`,
  `// → grouping（面板按色系分组）。`,
  `//`,
  `// 原样保留上游实现：这里的每个常量都是调过参的（对比度阈值、推离步长、diff 水洗的`,
  `// 候选序列），重写只会引入新偏差。要改行为请改参数并写明理由。`,
  `// ══════════════════════════════════════════════════════════════════════════`,
  ``,
  `const __mods = {};`,
  ``,
  `// registry 的替身：grouping 模块顶层就解构 \`__mods["registry"]\`，且 themeGroups() 靠它`,
  `// 遍历全部主题。上游 registry 里的 37 套主题 JSON 由 _extract_themes.mjs 单独提取成`,
  `// THEMES（与本段拼在同一作用域），所以这里只留一层薄壳指向它。`,
  `// 注意 THEMES 声明在本段之后：函数体在调用时才求值，只要不在加载期调用就没有 TDZ 问题。`,
  `__mods["registry"] = {`,
  `  SYSTEM_THEME: 'system',`,
  `  listThemes() { return Object.keys(THEMES).concat('system').sort((a, b) => a.localeCompare(b)); },`,
  `  getThemeJson(name) { return THEMES[name] || null; },`,
  `  isSystem(name) { return name === 'system'; },`,
  `  countStatic() { return Object.keys(THEMES).length; },`,
  `};`,
  ``,
];
for (const name of WANTED) {
  parts.push(`// ——————————————————— ${name} ———————————————————`);
  parts.push(found[name].body.trim());
  parts.push('');
}
const out = parts.join('\n');
writeFileSync(OUT, out, 'utf8');
console.log(`\n已写出 ${OUT}`);
console.log(`体量 ${Buffer.byteLength(out)} 字节 / ${out.split('\n').length} 行`);
