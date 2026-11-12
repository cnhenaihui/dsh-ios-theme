// 把设置页真实渲染出的 DOM 树打出来，人工核对结构。
// 断言能验「有没有」，验不了「顺序对不对、挤不挤」—— 这个脚本补那一块。
import { loadPlugin, tick } from './_harness.mjs';

const BG_RECORDS = [{
  id: 'seed-1', name: 'wallpaper.jpg', blob: {}, thumb: '',
  width: 3840, height: 2160, bytes: 1024, addedAt: 1,
}];

const h = loadPlugin({
  bgRecords: BG_RECORDS,
  computed: {
    '--dsw-alias-bg-base': '#f7f7f8',
    '--dsw-specific-sidebar-fill': '#f2f2f4',
    '--dsw-alias-bg-layer-1': '#ffffff',
    '--dsw-alias-bg-layer-2': '#fafafa',
  },
  storageSeed: {
    'dsh-ios-theme:v1': JSON.stringify({ v: 2, theme: 'lucent-orng', bg: { enabled: true, index: 0 } }),
  },
});
await tick(80);

const page = h.renderSettingsPage();

function render(node, depth = 0) {
  if (node === null || node === undefined) return [];
  if (typeof node === 'string') return ['  '.repeat(depth) + '"' + node + '"'];
  if (typeof node === 'number') return ['  '.repeat(depth) + String(node)];
  if (Array.isArray(node)) return node.flatMap((n) => render(n, depth));
  if (typeof node.type === 'function') return render(node.type(node.props), depth);
  const props = node.props || {};
  const bits = [];
  if (typeof node.type === 'string') bits.push(node.type);
  if (props.className) bits.push('.' + String(props.className).trim().split(/\s+/).join('.'));
  for (const k of ['role', 'aria-checked', 'aria-pressed', 'aria-label', 'title', 'type']) {
    if (props[k] !== undefined) bits.push(k + '=' + JSON.stringify(props[k]));
  }
  const line = '  '.repeat(depth) + bits.join(' ');
  const kids = (node.children || []).flatMap((c) => render(c, depth + 1));
  return [line, ...kids];
}

const lines = render(page);

// 只打主题卡片的第一组前 3 个芯片 + 背景卡片，避免整页刷屏
let inFirstGroup = false;
let chipSeen = 0;
let printing = true;
for (const ln of lines) {
  if (ln.indexOf('ios-thm-group') >= 0) inFirstGroup = true;
  if (inFirstGroup && ln.indexOf('ios-thm-tchip') >= 0) {
    chipSeen += 1;
    if (chipSeen > 3) { printing = false; continue; }
  }
  if (printing) console.log(ln);
}

console.log('');
console.log('—— 背景卡片的参数区顺序 ——');
const wanted = ['一键预设', '透出范围', '模糊', '遮罩深度', '壁纸透明度', '界面底透明度', '饱和度', '填充方式', '轮换'];
const found = [];
for (const ln of lines) {
  const m = ln.match(/^\s*"(.+)"$/);
  if (!m) continue;
  if (wanted.includes(m[1]) && !found.includes(m[1])) found.push(m[1]);
}
console.log('实际顺序：' + found.join(' → '));
console.log('期望顺序：' + wanted.join(' → '));
console.log(found.join('|') === wanted.join('|') ? '顺序一致' : '顺序不一致');

console.log('');
console.log('—— 选中芯片的完整结构 ——');
let printed = false;
for (let i = 0; i < lines.length && !printed; i += 1) {
  if (lines[i].indexOf('ios-thm-tchip-active') >= 0) {
    for (let j = i; j < Math.min(i + 5, lines.length); j += 1) console.log(lines[j]);
    printed = true;
  }
}
