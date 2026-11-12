#!/usr/bin/env node
/**
 * 引擎自检：把 docs/src/03-engine.js 与 docs/src/02-theme-data.js 拼起来
 * 在隔离作用域里跑，验证「解析 → 生成 → 分组」整条链能通。
 *
 * 直接读拼装源分段，不读任何中间产物 —— 这样这里炸了就一定代表
 * 真正会被拼进 client.js 的那份代码有问题。
 *
 * 用法：node docs/_engine_smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));

// 拼装源分段整体缩进 4 空格，去掉后就是可直接求值的顶层代码
function dedent(text) {
  return text
    .split('\n')
    .map((l) => (l.startsWith('    ') ? l.slice(4) : l))
    .join('\n');
}

const engine = dedent(readFileSync(join(HERE, 'src', '03-engine.js'), 'utf8'));
const themes = dedent(readFileSync(join(HERE, 'src', '02-theme-data.js'), 'utf8'));

let pass = 0;
let fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok   ${name}`); }
  else { fail += 1; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

// 数据段与引擎段都只声明 const，拼在一起即可；末尾补一个导出给 vm 拿
const code = `${engine}\n${themes}\n__out = { __mods, THEMES, IP_PRESETS, THEME_ZH, THEME_EN };`;
const sandbox = { console, __out: null };
vm.createContext(sandbox);
try {
  vm.runInContext(code, sandbox, { filename: 'engine+themes' });
} catch (e) {
  console.error('拼接执行失败：', e && e.message);
  process.exit(1);
}
const { __mods, THEMES, IP_PRESETS, THEME_ZH, THEME_EN } = sandbox.__out;

const { resolveThemeColors, collectErrors, isDelegatedSurface, contrastRatio } = __mods['resolve'];
const { buildTokens, buildColorCss } = __mods['generate'];
const { themeGroups, GROUP_ORDER } = __mods['grouping'];
const { COLOR_SLOTS } = __mods['map-dsh'];

console.log('\n[1] 数据完整性');
const themeIds = Object.keys(THEMES);
ok('内置主题 37 套', themeIds.length === 37, `实际 ${themeIds.length}`);
ok('IP 预置 25 套', Object.keys(IP_PRESETS).length === 25, `实际 ${Object.keys(IP_PRESETS).length}`);
ok('中文名 38 条（含 system）', Object.keys(THEME_ZH).length === 38, `实际 ${Object.keys(THEME_ZH).length}`);
ok('英文名 38 条（含 system）', Object.keys(THEME_EN).length === 38, `实际 ${Object.keys(THEME_EN).length}`);
ok('透光橙在册', !!THEMES['lucent-orng']);

console.log('\n[2] 全量解析：每套主题两套外观都不能报错');
const resolved = {};
const broken = [];
for (const id of themeIds) {
  const json = THEMES[id];
  const dark = resolveThemeColors(json, 'dark');
  const light = resolveThemeColors(json, 'light');
  const errs = collectErrors(dark).concat(collectErrors(light));
  if (errs.length) broken.push(id + ': ' + errs.join(' | '));
  resolved[id] = { dark, light };
}
ok('37 套全部解析成功', broken.length === 0, broken.slice(0, 3).join(' ; '));

console.log('\n[3] 令牌生成：数量与两半齐整');
let tokenCounts = {};
let halfGaps = [];
const delegatedIds = [];
for (const id of themeIds) {
  const { dark, light } = resolved[id];
  const delegated = isDelegatedSurface(dark, light);
  if (delegated) delegatedIds.push(id);
  const tokens = buildTokens(dark, light, delegated);
  tokenCounts[id] = Object.keys(tokens).length;
  for (const [name, modes] of Object.entries(tokens)) {
    if (typeof modes.light !== 'string' || typeof modes.dark !== 'string') {
      halfGaps.push(id + '/' + name);
    }
  }
}
const solid = themeIds.filter((id) => !delegatedIds.includes(id));
const counts = Object.values(tokenCounts);
const solidCounts = solid.map((id) => tokenCounts[id]);
const delegatedCounts = delegatedIds.map((id) => tokenCounts[id]);
ok('非委托主题每套 ≥100 个令牌', Math.min(...solidCounts) >= 100,
  `最少 ${Math.min(...solidCounts)}（${solid.find((t) => tokenCounts[t] === Math.min(...solidCounts))}）`);
// 委托主题不写画布令牌（background 槽是 transparent → usable() 返回 null → 整条跳过），
// 所以令牌数天然少一截。这是设计，不是缺陷：画布交给宿主，壁纸才透得出来。
ok('委托主题令牌数 ≥60（少掉的正是画布那一批）', Math.min(...delegatedCounts) >= 60,
  `最少 ${Math.min(...delegatedCounts)}`);
ok('全部令牌都有 light+dark 两半', halfGaps.length === 0, halfGaps.slice(0, 5).join(', '));
console.log(`     委托画布主题 ${delegatedIds.length} 套：${delegatedIds.join(', ')}`);
console.log('     令牌数区间 ' + Math.min(...counts) + '–' + Math.max(...counts)
  + `（实色 ${Math.min(...solidCounts)}–${Math.max(...solidCounts)}`
  + ` / 透光 ${Math.min(...delegatedCounts)}–${Math.max(...delegatedCounts)}）`);

console.log('\n[4] 透光橙：画布委托给宿主');
const lo = resolved['lucent-orng'];
ok('lucent-orng 判定为委托画布', isDelegatedSurface(lo.dark, lo.light) === true);
const loTokens = buildTokens(lo.dark, lo.light, true);
ok('bg-base 为 transparent', loTokens['--dsw-alias-bg-base'] === undefined
  || loTokens['--dsw-alias-bg-base'].light === 'transparent',
  JSON.stringify(loTokens['--dsw-alias-bg-base']));
ok('primary 有值', typeof (loTokens['--dsw-alias-brand-primary'] || {}).dark === 'string');
ok('border 有值', typeof (loTokens['--dsw-alias-border-l1'] || {}).dark === 'string');

console.log('\n[5] 对比度：文字压在页面上 ≥ 4.5（非委托主题）');
const lowContrast = [];
for (const id of themeIds) {
  if (id === 'lucent-orng') continue;
  const { dark, light } = resolved[id];
  if (isDelegatedSurface(dark, light)) continue;
  const tokens = buildTokens(dark, light, false);
  for (const half of ['dark', 'light']) {
    const fg = tokens['--dsw-alias-label-primary'] && tokens['--dsw-alias-label-primary'][half];
    const bg = tokens['--dsw-alias-bg-base'] && tokens['--dsw-alias-bg-base'][half];
    if (!fg || !bg || fg === 'transparent' || bg === 'transparent') continue;
    const r = contrastRatio(fg, bg);
    if (r < 4.5) lowContrast.push(`${id}/${half} ${r.toFixed(2)} ${fg} on ${bg}`);
  }
}
ok('label-primary × bg-base 全部 ≥ 4.5', lowContrast.length === 0, lowContrast.slice(0, 4).join(' ; '));

console.log('\n[6] CSS 生成：两套外观都要有 body 作用域');
const cssIssues = [];
for (const id of themeIds) {
  const { dark, light } = resolved[id];
  const delegated = isDelegatedSurface(dark, light);
  const tokens = buildTokens(dark, light, delegated);
  const css = buildColorCss(dark, light, tokens, delegated);
  if (!css.includes('body')) cssIssues.push(id + ': 无 body 作用域');
  if (!css.includes('data-ds-dark-theme') && !delegated) cssIssues.push(id + ': 深色规则缺失');
  // 元素级兜底必须存在（strong/em/blockquote 等没有宿主变量）
  for (const sel of ['strong', 'em', 'blockquote']) {
    if (!css.includes(sel)) cssIssues.push(id + ': 缺少 ' + sel + ' 规则');
  }
}
ok('37 套 CSS 结构完整', cssIssues.length === 0, cssIssues.slice(0, 4).join(' ; '));

console.log('\n[7] 分组：每套都能归到某个色系');
const groups = themeGroups('dark');
const groupIds = groups.map((g) => g.name);
ok('分组非空', groupIds.length > 0);
ok('分组键都在 GROUP_ORDER 内', groupIds.every((g) => GROUP_ORDER.includes(g)), groupIds.join(','));
const grouped = groups.reduce((n, g) => n + g.themes.length, 0);
ok('分组覆盖全部主题（37 + system）', grouped === themeIds.length + 1, `${grouped} vs ${themeIds.length + 1}`);
ok('每组都有代表色', groups.every((g) => typeof g.color === 'string'));
console.log('     ' + groups.map((g) => g.name + '=' + g.themes.length).join(' '));

console.log('\n[8] 37 色槽：核心槽位每套都要有，扩展 5 槽允许回填');
// COLOR_SLOTS 里 32 个是「主题 JSON 直接给」的槽；后 5 个（sidebarBg/bubbleBg/inputBg/
// codeBlockBg/codeHeaderBg）是 DSH 侧扩展，resolveThemeColors 不产出，靠
// normalizeThemeColors 从 background/backgroundPanel/backgroundElement 回填。
// 所以这里分两批断言：核心槽必须齐，扩展槽必须能回填出值。
const CORE_SLOTS = COLOR_SLOTS.filter((s) => !['sidebarBg', 'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg'].includes(s.key));
const coreGaps = [];
for (const id of themeIds) {
  const c = resolved[id].dark;
  for (const slot of CORE_SLOTS) {
    if (typeof c[slot.key] !== 'string') coreGaps.push(id + '/' + slot.key);
  }
}
ok(`${CORE_SLOTS.length} 个核心槽无缺`, coreGaps.length === 0, coreGaps.slice(0, 6).join(', '));

const { normalizeThemeColors } = __mods['map-dsh'];
const fillGaps = [];
for (const id of themeIds) {
  const filled = normalizeThemeColors(resolved[id].dark);
  for (const slot of COLOR_SLOTS) {
    if (typeof filled[slot.key] !== 'string') fillGaps.push(id + '/' + slot.key);
  }
}
ok('37 槽经 normalize 后全部有值', fillGaps.length === 0, fillGaps.slice(0, 6).join(', '));

console.log(`\n结果：通过 ${pass} / ${pass + fail}${fail ? '（失败 ' + fail + '）' : ''}`);
process.exit(fail ? 1 : 0);
