// 一次性核对：确认关键规则真的进了 client.js 产物，且「不该存在的」确实不存在。
// 这个脚本只在排查时用，不属于常规验证链。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');

// —— 必须存在的 ——
const checks = [
  ['勾号样式类', '.ios-thm-tcheck'],
  ['勾号字符', '\\u2713'],
  ['选中态加粗底色', '.ios-thm-tchip-active'],
  ['滑块说明行', '.ios-thm-slider-hint'],
  ['名称占满剩余宽度', '.ios-thm-tname'],
  ['radio 语义', "role: 'radio'"],
  ['aria-checked 语义', "'aria-checked'"],
  ['radiogroup 语义', "role: 'radiogroup'"],
  ['一键预设逻辑', 'bgApplyPreset'],
  ['预设常量', 'BG_PRESETS'],
  ['壁纸只降窗口底', '--ios-bg-base-raw'],
  ['壁纸只降侧栏', '--ios-bg-side-raw'],
];

// —— 必须不存在的（叠印禁令）——
// 这一组比上面那组更重要。曾经为了「让卡片也透光」把 --dsw-alias-bg-layer-1
// 降成半透明，结果是设置页与插件市场满屏字体重叠 —— layer-1 是所有控件级
// 表面的共用底，不是卡片专用。这类错误在静态检查里很容易漏，必须反向钉住。
//
// 注意：清理名单（bgTeardown 里 removeProperty 的旧变量名）不算违规 ——
// 那些是「删掉别人的残留」，不是「写入」。所以下面匹配的是写入形式
// （setProperty / 样式规则），而不是变量名本身。
const forbidden = [
  ['控件层被半透明化', /--dsw-alias-bg-layer-1:\s*color-mix/],
  ['浮层 layer-2 被半透明化', /--dsw-alias-bg-layer-2:\s*color-mix/],
  ['layer-3 被半透明化', /--dsw-alias-bg-layer-3:\s*color-mix/],
  ['overlay 被半透明化', /--dsw-alias-bg-overlay:\s*color-mix/],
  ['透出范围标记仍被写入', /dataset\.iosBgDepth\s*=/],
  ['分档常量仍存在', /\bBG_DEPTHS\b/],
  ['控件层 alpha 仍被写入', /bgSetVar\('--ios-bg-layer1-alpha',\s*[^n]/],
  ['容器 alpha 仍被写入', /bgSetVar\('--ios-bg-container-alpha',\s*[^n]/],
  ['分档函数仍存在', /\bbgDepthRank\b|\bbgContainerAlpha\b/],
];

let bad = 0;
for (const [name, needle] of checks) {
  const hit = src.indexOf(needle) >= 0;
  if (!hit) bad += 1;
  console.log((hit ? '  OK   ' : '  MISS ') + name + '  (' + needle + ')');
}

console.log('');
for (const [name, re] of forbidden) {
  const n = (src.match(new RegExp(re.source, 'g')) || []).length;
  if (n > 0) bad += 1;
  console.log((n === 0 ? '  OK   ' : '  LEAK ') + name + '  (出现 ' + n + ' 处，必须为 0)');
}

const count = (re) => (src.match(re) || []).length;
console.log('');
console.log('  勾号渲染 ' + count(/ios-thm-tcheck/g) + ' 处');
console.log('  bg-base 覆盖规则 ' + count(/--dsw-alias-bg-base:\s*color-mix/g) + ' 处');
console.log('  产物大小 ' + Buffer.byteLength(src, 'utf8') + ' B');

console.log('');
console.log(bad === 0 ? '  结论：关键规则齐全，叠印禁令全部守住' : '  结论：有 ' + bad + ' 项不合规');
process.exit(bad === 0 ? 0 : 1);
