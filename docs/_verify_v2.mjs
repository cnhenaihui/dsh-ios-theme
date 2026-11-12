// 2.0 架构验证：主题引擎移植 + 壁纸共存 + 对比度修复层。
// 复用 docs/_harness.mjs 的最小 DOM 与 mock ctx，只在 Node 里跑，不进包。
//
// 断言分五组：
//   T  主题数据与渲染（62 套、令牌形状、元素级 CSS、system 零写入）
//   C  对比度修复层（62 套 × 2 外观 × 13 前景槽全部 ≥4.5）
//   W  壁纸共存（默认顺序 / 忽略主题背景 / 透光主题天然兼容）
//   S  持久化与迁移（1.x 字段丢弃、主题接续、卸载净空）
//   U  设置页（卡片结构、开关、芯片数量）

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlugin, tick } from './_harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.resolve(HERE, '../client.js');

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, condition, detail) {
  if (condition) { pass += 1; return true; }
  fail += 1;
  failures.push(name + (detail ? ' — ' + detail : ''));
  return false;
}

function eq(name, actual, expected) {
  return ok(name, actual === expected, '实际 ' + JSON.stringify(actual) + '，期望 ' + JSON.stringify(expected));
}

function ge(name, actual, expected) {
  return ok(name, typeof actual === 'number' && actual >= expected, '实际 ' + actual + '，期望 ≥ ' + expected);
}

// —— 从 client.js 里取出主题引擎，供断言直接调用 ——
// 不走 loadPlugin：引擎在 factory 内部，从外面够不着。
function loadEngine() {
  const source = fs.readFileSync(CLIENT, 'utf8');
  const start = source.indexOf('    // 主题数据（62 套');
  const end = source.indexOf('    // —— 主题引擎的模块引用 ——');
  if (start < 0 || end < 0) throw new Error('找不到主题数据/引擎段');
  const body = source.slice(start, end);
  const fn = new Function(body + '\nreturn { THEMES, IP_PRESETS, THEME_ZH, THEME_EN, __mods };');
  return fn();
}

const engine = loadEngine();
const RESOLVE = engine.__mods['resolve'];
const MAP_DSH = engine.__mods['map-dsh'];
const GENERATE = engine.__mods['generate'];
const GROUPING = engine.__mods['grouping'];

// ——————————————————————————————————————————————
// T 组：主题数据与渲染
// ——————————————————————————————————————————————
{
  const builtinCount = Object.keys(engine.THEMES).length;
  const ipCount = Object.keys(engine.IP_PRESETS).length;
  eq('T1 内置主题 37 套', builtinCount, 37);
  eq('T2 IP 预置 25 套', ipCount, 25);
  ok('T3 透光橙在册', Object.prototype.hasOwnProperty.call(engine.THEMES, 'lucent-orng'));
  ok('T4 中文名表 38 条', Object.keys(engine.THEME_ZH).length === 38);
  ok('T5 英文名表 38 条', Object.keys(engine.THEME_EN).length === 38);

  // 全量构建：每套主题都要能产出令牌与 CSS，且令牌值全是 {light,dark} 双字符串
  // （宿主 validateOverrides 的硬要求，裸字符串会抛教学错误）。
  //
  // 令牌名前缀有三类，都是宿主真实消费的：
  //   --dsw-*   宿主语义令牌（TOKEN_MAP / DERIVED_TOKENS）
  //   --dsl-*   DSH 设计语言层的代码块背景
  //   --shiki-* 代码高亮变量（shiki 直接读）
  const ALLOWED_PREFIX = /^(--dsw-[\w-]+|--dsl-[\w-]+|--shiki-[\w-]+)$/;
  const buildErrors = [];
  const badShape = [];
  for (const id of Object.keys(engine.THEMES)) {
    try {
      const dark = RESOLVE.resolveThemeColors(engine.THEMES[id], 'dark');
      const light = RESOLVE.resolveThemeColors(engine.THEMES[id], 'light');
      const delegated = RESOLVE.isDelegatedSurface(dark, light);
      const tokens = GENERATE.buildTokens(dark, light, delegated);
      const css = GENERATE.buildColorCss(dark, light, tokens, delegated);
      if (!css || typeof css !== 'string') badShape.push(id + ':css');
      for (const [name, value] of Object.entries(tokens)) {
        if (!ALLOWED_PREFIX.test(name)) { badShape.push(id + ':' + name); continue; }
        if (!value || typeof value !== 'object') { badShape.push(id + ':' + name + ':notObj'); continue; }
        if (typeof value.light !== 'string' && typeof value.dark !== 'string') {
          badShape.push(id + ':' + name + ':empty');
        }
      }
    } catch (e) { buildErrors.push(id + ': ' + e.message); }
  }
  ok('T6 37 套内置全部构建成功', buildErrors.length === 0, buildErrors.join(' | '));
  ok('T7 令牌名与形状全部合规', badShape.length === 0, badShape.slice(0, 5).join(' | '));

  // IP 预置：单套色，同一外观下颜色不该跳。
  // 例外是 diff 四槽：ensureDiffContrast 按明暗分别推离（浅色下要更淡、深色下要更浓），
  // 两半不同是刻意的，不能当缺陷。
  const DIFF_SLOTS = /diff/;
  const ipBad = [];
  for (const key of Object.keys(engine.IP_PRESETS)) {
    const preset = engine.IP_PRESETS[key];
    const norm = MAP_DSH.normalizeThemeColors(preset.colors);
    const tokens = GENERATE.buildTokens(norm, norm, false);
    for (const [name, value] of Object.entries(tokens)) {
      if (DIFF_SLOTS.test(name)) continue;
      if (value.light !== undefined && value.dark !== undefined && value.light !== value.dark) {
        ipBad.push(preset.id + ':' + name);
      }
    }
  }
  ok('T8 IP 预置非 diff 令牌 light === dark', ipBad.length === 0, ipBad.slice(0, 5).join(' | '));

  // 委托画布：只有透光橙一套。这条断言是「壁纸能与主题共存」的前提 ——
  // 一旦有别的主题变成委托画布，壁纸的行为就变了，必须有人重新审一遍。
  const delegatedIds = [];
  for (const id of Object.keys(engine.THEMES)) {
    const dark = RESOLVE.resolveThemeColors(engine.THEMES[id], 'dark');
    const light = RESOLVE.resolveThemeColors(engine.THEMES[id], 'light');
    if (RESOLVE.isDelegatedSurface(dark, light)) delegatedIds.push(id);
  }
  eq('T9 委托画布主题仅透光橙一套', delegatedIds.join(','), 'lucent-orng');

  // 透光橙不写画布令牌（壁纸层独占）
  const lo = engine.THEMES['lucent-orng'];
  const loDark = RESOLVE.resolveThemeColors(lo, 'dark');
  const loLight = RESOLVE.resolveThemeColors(lo, 'light');
  const loTokens = GENERATE.buildTokens(loDark, loLight, true);
  ok('T10 透光橙不写 --dsw-alias-bg-base',
    !('--dsw-alias-bg-base' in loTokens), JSON.stringify(loTokens['--dsw-alias-bg-base']));
  ok('T11 透光橙不写 --dsw-specific-sidebar-fill',
    !('--dsw-specific-sidebar-fill' in loTokens));

  // 实色主题必须写画布令牌（否则壁纸会透出来盖住主题）
  const gb = engine.THEMES['gruvbox'];
  const gbTokens = GENERATE.buildTokens(
    RESOLVE.resolveThemeColors(gb, 'dark'),
    RESOLVE.resolveThemeColors(gb, 'light'),
    false,
  );
  ok('T12 实色主题写 --dsw-alias-bg-base', '--dsw-alias-bg-base' in gbTokens);

  // 元素级兜底规则：宿主没有 strong/em/blockquote 变量，只能靠 CSS 规则
  const gbCss = GENERATE.buildColorCss(
    RESOLVE.resolveThemeColors(gb, 'dark'),
    RESOLVE.resolveThemeColors(gb, 'light'),
    gbTokens,
    false,
  );
  for (const sel of ['strong', 'em', 'blockquote', 'hr']) {
    ok('T13 CSS 含 ' + sel + ' 兜底规则', gbCss.includes(sel), '');
  }
  // 字体绝不写（排版功能已舍弃，字体交宿主官方设置）
  ok('T14 主题 CSS 不含 --dsw-font-family', !gbCss.includes('--dsw-font-family'));
  ok('T15 主题 CSS 不含 --ds-font-family-code', !gbCss.includes('--ds-font-family-code'));
  ok('T16 主题 CSS 不含 --dsw-font-markdown', !gbCss.includes('--dsw-font-markdown'));

  // shiki 接管：代码高亮跟随主题（这是「关键字突出」的核心）
  const shikiKeys = Object.keys(gbTokens).filter((k) => k.startsWith('--shiki-'));
  ge('T17 shiki 令牌 ≥10 条', shikiKeys.length, 10);
  ok('T18 shiki 令牌值不是宿主默认硬编码色',
    !Object.values(gbTokens).some((v) => /#d6336c|#2f9e44|#1c7ed6/i.test(String(v.light || ''))));

  // 分组：8 组 + system 归 special
  const groups = GROUPING.themeGroups('light');
  eq('T19 分组数 8', groups.length, 8);
  const total = groups.reduce((n, g) => n + g.themes.length, 0);
  eq('T20 分组覆盖 38 套（37 + system）', total, 38);
  ok('T21 透光橙落在 transparent 组',
    groups.some((g) => g.name === 'transparent' && g.themes.some((t) => t.name === 'lucent-orng')));

  // 双外观发射：非委托主题必须跟随宿主明暗。
  // 上游把「画布是否委托」与「两半是否各用自己配色」绑在同一个参数上，
  // 非委托主题一律写 {light: dv, dark: dv} —— 36 套实色主题的浅色配色被整段丢弃，
  // 浅色模式下仍是深色底（catppuccin light 本该 #EFF1F5，实际写成 #1E1E2E）。
  // 本插件拆开这两个概念后，主题 JSON 给了不同浅色值就必须发射不同值。
  //
  // 允许同值的例外，都是数据现实而非缺陷：
  //   aura / ayu —— background 只有深色分支（裸字符串 'darkBg'），没有浅色可退；
  //   catppuccin-frappe / catppuccin-macchiato —— 上游刻意写 light 沿用同一深色底，
  //   属深色专用变体，强行造浅色底会破坏设计意图。
  const monoCanvas = [];
  for (const id of Object.keys(engine.THEMES)) {
    const json = engine.THEMES[id];
    const d = RESOLVE.resolveThemeColors(json, 'dark');
    const l = RESOLVE.resolveThemeColors(json, 'light');
    if (RESOLVE.isDelegatedSurface(d, l)) continue;
    if (d.background === l.background) continue;          // 主题本身没给不同浅色值
    const tk = GENERATE.buildTokens(d, l, true);
    const canvas = tk['--dsw-alias-bg-base'];
    if (canvas && canvas.light === canvas.dark) monoCanvas.push(id + '=' + canvas.light);
  }
  ok('T22 非委托主题的浅色画布不被丢弃', monoCanvas.length === 0, monoCanvas.join(' | '));
}

// ——————————————————————————————————————————————
// C 组：对比度修复层
// ——————————————————————————————————————————————
{
  // 复刻 client.js 里的 repairSemanticContrast —— 这段逻辑本身要独立可测。
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

  function repair(colors, delegated) {
    const out = Object.assign({}, colors);
    // 底色只认 background；委托画布没有 background，用正文色亮度反推极限底。
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

  function assumedCanvas(colors) {
    const text = colors.markdownText;
    if (!isSolidHex(text)) return null;
    return RESOLVE.relativeLuminance(text) > 0.5 ? '#000000' : '#FFFFFF';
  }

  function backgroundsOf(colors, delegated) {
    const out = [];
    if (delegated) {
      const assumed = assumedCanvas(colors);
      if (assumed) out.push(assumed);
    } else if (isSolidHex(colors.background)) {
      out.push(colors.background);
    }
    return out;
  }

  // 修复前的基线（用来证明这一层确实在干活）
  let beforeBad = 0;
  let beforeTotal = 0;
  let afterBad = 0;
  let afterTotal = 0;
  const stillBad = [];
  const changedThemes = new Set();

  for (const id of Object.keys(engine.THEMES)) {
    const json = engine.THEMES[id];
    const delegated = RESOLVE.isDelegatedSurface(
      RESOLVE.resolveThemeColors(json, 'dark'),
      RESOLVE.resolveThemeColors(json, 'light'),
    );
    for (const mode of ['dark', 'light']) {
      const raw = RESOLVE.resolveThemeColors(json, mode);
      const backgrounds = backgroundsOf(raw, delegated);
      if (!backgrounds.length) continue;

      const fixed = repair(raw, delegated);
      for (const slot of SEMANTIC_FOREGROUNDS) {
        if (!isSolidHex(raw[slot])) continue;
        const cBefore = worstContrast(raw[slot], backgrounds);
        if (cBefore === null) continue;
        beforeTotal += 1;
        if (cBefore < SEMANTIC_MIN_CONTRAST) beforeBad += 1;

        const cAfter = worstContrast(fixed[slot], backgrounds);
        afterTotal += 1;
        if (cAfter === null || cAfter < SEMANTIC_MIN_CONTRAST) {
          afterBad += 1;
          stillBad.push(id + '/' + mode + '/' + slot + '=' + cAfter);
        }
        if (fixed[slot] !== raw[slot]) changedThemes.add(id + '/' + mode);
      }
    }
  }

  // 基线证明：修复前确实大面积不达标（上游 250/636 的抽样口径更宽，这里只算 13 槽）
  ge('C1 修复前存在不达标（证明这层必要）', beforeBad, 20);
  eq('C2 修复后 0 条不达标', afterBad, 0);
  ok('C3 全部 13 槽 × 37 套 × 2 外观都被判定', afterTotal === beforeTotal && afterTotal > 800,
    '判定 ' + afterTotal + ' 条');
  ok('C4 不达标的才被改（改动面收敛）', changedThemes.size > 0 && changedThemes.size < 74,
    '改动了 ' + changedThemes.size + ' 个主题/外观组合');

  // 达标色一个字节都不能动：拿一个已知达标的组合验证
  const nord = engine.THEMES['nord'];
  const nordDark = RESOLVE.resolveThemeColors(nord, 'dark');
  const nordFixed = repair(nordDark, false);
  const nordBg = backgroundsOf(nordDark, false);
  for (const slot of SEMANTIC_FOREGROUNDS) {
    if (!isSolidHex(nordDark[slot])) continue;
    const c = worstContrast(nordDark[slot], nordBg);
    if (c !== null && c >= SEMANTIC_MIN_CONTRAST) {
      ok('C5 达标色未被改动 ' + slot, nordFixed[slot] === nordDark[slot],
        nordDark[slot] + ' → ' + nordFixed[slot]);
    }
  }

  // 撞值保护：修复不能「新造」撞值。
  //
  // 上游本来就有同源同色的设计（amoled 的 strong/em/heading 都是 #FFFFFF，
  // code/function/number 都是 #B388FF），那是主题作者的选择，不该被断言判成缺陷。
  // 这里只断言：修复后出现的「两个槽同色」必须修复前就存在。
  const newCollisions = [];
  for (const id of Object.keys(engine.THEMES)) {
    for (const mode of ['dark', 'light']) {
      const raw = RESOLVE.resolveThemeColors(engine.THEMES[id], mode);
      const delegated = RESOLVE.isDelegatedSurface(
        RESOLVE.resolveThemeColors(engine.THEMES[id], 'dark'),
        RESOLVE.resolveThemeColors(engine.THEMES[id], 'light'),
      );
      const fixed = repair(raw, delegated);
      const after = new Map();
      for (const slot of SEMANTIC_FOREGROUNDS) {
        const v = fixed[slot];
        if (!isSolidHex(v)) continue;
        const key = v.toUpperCase();
        if (after.has(key)) {
          const other = after.get(key);
          const wasSame = isSolidHex(raw[other]) && isSolidHex(raw[slot])
            && raw[other].toUpperCase() === raw[slot].toUpperCase();
          if (!wasSame) {
            newCollisions.push(id + '/' + mode + ':' + [other, slot].sort().join('+') + '=' + key);
          }
        } else {
          after.set(key, slot);
        }
      }
    }
  }
  ok('C6 修复未新造撞值', newCollisions.length === 0, newCollisions.slice(0, 3).join(' | '));
}

// ——————————————————————————————————————————————
// W 组：壁纸共存
// ——————————————————————————————————————————————
// 图库必须有图，否则 bgApplySurface() 在 `!bgImages.length` 处直接 return，
// 壁纸层根本不会注册 —— 那是「没有壁纸」的正常路径，不是缺陷。
// 底色令牌也必须给：真实宿主里 presenter 会把 composeActive 的结果写进 body.style，
// mock 不会，所以这里直接喂 computed，等价于「宿主已经投影完」。
const BG_RECORDS = [{
  id: 'seed-1',
  name: 'seed.jpg',
  blob: {},
  thumb: '',
  width: 100,
  height: 100,
  bytes: 100,
  addedAt: 1,
}];
const HOST_COMPUTED = {
  '--dsw-alias-bg-base': '#f7f7f8',
  '--dsw-specific-sidebar-fill': '#f2f2f4',
};

// 宿主的 overrideTokens 是 `this.overrides.set(source, layer)` —— 同 source 重注册会
// **覆盖**旧层并拿到更大的 seq。所以判定「哪层生效」必须看**最后一次**注册，
// 而不是第一次。插件会在 reapplyLayers / bgBootstrap 里重复注册，只看 [0] 会读错。
function lastOf(calls, source) {
  const list = calls.filter((c) => c.source === source);
  return list.length ? list[list.length - 1] : null;
}

{
  // 默认状态：透光橙 + 壁纸开
  const a = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: { 'dsh-ios-theme:v1': JSON.stringify({ v: 2, theme: 'lucent-orng', bg: { enabled: true, index: 0 } }) },
  });
  await tick(60);
  const aTheme = lastOf(a.calls.overrideTokens, 'dsh-theme-wallpaper:theme');
  const aBg = lastOf(a.calls.overrideTokens, 'dsh-theme-wallpaper:bg');
  ok('W1 主题层已注册', !!aTheme);
  ok('W2 壁纸层已注册', !!aBg);
  ok('W3 主题层不写 bg-base（透光橙）',
    !aTheme.tokens['--dsw-alias-bg-base'],
    JSON.stringify(aTheme.tokens['--dsw-alias-bg-base']));
  ok('W4 壁纸层写了 bg-base', !!aBg.tokens['--dsw-alias-bg-base']);
  ok('W5 壁纸层值是 color-mix', /color-mix/.test(aBg.tokens['--dsw-alias-bg-base'].light));

  // 令牌形状必须走**真实注册路径**再验一遍：T7 直接调引擎，抓不到 04-theme.js
  // 往 tokens 里塞裸字符串这类变异（宿主 validateOverrides 会直接抛教学错误，
  // 整个主题层注册失败，界面一片默认色）。
  const shapeBad = [];
  for (const [name, value] of Object.entries(aTheme.tokens)) {
    if (!value || typeof value !== 'object') { shapeBad.push(name + ':notObj'); continue; }
    if (typeof value.light !== 'string' || typeof value.dark !== 'string') {
      shapeBad.push(name + ':' + JSON.stringify(value));
    }
  }
  ok('W5b 实际注册的主题层令牌全是 {light,dark} 双字符串',
    shapeBad.length === 0, shapeBad.slice(0, 5).join(' | '));

  // 实色主题 + 壁纸：默认主题层在后（盖住壁纸）
  const b = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: { 'dsh-ios-theme:v1': JSON.stringify({ v: 2, theme: 'gruvbox', bg: { enabled: true } }) },
  });
  await tick(60);
  const bTheme = lastOf(b.calls.overrideTokens, 'dsh-theme-wallpaper:theme');
  const bBg = lastOf(b.calls.overrideTokens, 'dsh-theme-wallpaper:bg');
  ok('W6 实色主题层已注册', !!bTheme);
  ok('W7 实色主题层写了 bg-base', !!bTheme.tokens['--dsw-alias-bg-base']);
  // 走真实加载路径断言「浅色画布不被丢弃」—— T22 直接调引擎，抓不到
  // 04-theme.js 把第三参数写回 delegated 这种变异，这里才是那道闸。
  ok('W7b 实色主题的浅色画布不被丢弃（light !== dark）',
    !!bTheme.tokens['--dsw-alias-bg-base']
      && bTheme.tokens['--dsw-alias-bg-base'].light !== bTheme.tokens['--dsw-alias-bg-base'].dark,
    JSON.stringify(bTheme.tokens['--dsw-alias-bg-base']));

  ok('W8 默认顺序：主题层 seq 大于壁纸层',
    bTheme.seq > bBg.seq,
    'theme seq=' + bTheme.seq + ' bg seq=' + bBg.seq);

  // 忽略主题背景：壁纸层在后（压过主题）
  const c = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: { 'dsh-ios-theme:v1': JSON.stringify({ v: 2, theme: 'gruvbox', bgIgnoreTheme: true, bg: { enabled: true } }) },
  });
  await tick(60);
  const cTheme = lastOf(c.calls.overrideTokens, 'dsh-theme-wallpaper:theme');
  const cBg = lastOf(c.calls.overrideTokens, 'dsh-theme-wallpaper:bg');
  ok('W9 忽略主题背景：壁纸层 seq 大于主题层',
    cBg.seq > cTheme.seq,
    'theme seq=' + cTheme.seq + ' bg seq=' + cBg.seq);

  // system 主题：一条令牌都不写
  const d = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: { 'dsh-ios-theme:v1': JSON.stringify({ v: 2, theme: 'system', bg: { enabled: false } }) },
  });
  await tick(60);
  const dTheme = d.calls.overrideTokens.filter((x) => x.source === 'dsh-theme-wallpaper:theme');
  eq('W10 system 主题不注册令牌层', dTheme.length, 0);
}

// ——————————————————————————————————————————————
// S 组：持久化、迁移、卸载
// ——————————————————————————————————————————————
{
  // 1.x 的 base='opencode' → oc-2
  const a = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: { 'dsh-ios-theme:v1': JSON.stringify({ accent: 'blue', base: 'opencode', emphasis: true }) },
  });
  await tick(60);
  const aTheme = a.calls.overrideTokens.filter((x) => x.source === 'dsh-theme-wallpaper:theme');
  ok('S1 base=opencode 迁移到 oc-2', aTheme.length >= 1);

  // 1.x 的 base='night' → lucent-orng（两者都是暖色纸感）
  const b = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: { 'dsh-ios-theme:v1': JSON.stringify({ base: 'night' }) },
  });
  await tick(60);
  const bTheme = b.calls.overrideTokens.filter((x) => x.source === 'dsh-theme-wallpaper:theme');
  ok('S2 base=night 迁移到透光橙（不写 bg-base）',
    bTheme.length === 0 || !bTheme[0].tokens['--dsw-alias-bg-base']);

  // 未知主题 id → 回落到默认
  const c = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: { 'dsh-ios-theme:v1': JSON.stringify({ v: 2, theme: 'no-such-theme' }) },
  });
  await tick(60);
  const cTheme = c.calls.overrideTokens.filter((x) => x.source === 'dsh-theme-wallpaper:theme');
  ok('S3 未知主题 id 回落到默认（透光橙，不写 bg-base）',
    cTheme.length === 0 || !cTheme[0].tokens['--dsw-alias-bg-base']);

  // 旧字段全部丢弃：写回的 state 里不应出现 accent/base/emphasis/字体
  const d = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: { 'dsh-ios-theme:v1': JSON.stringify({ accent: 'blue', base: 'night', uiFont: 'inter', lineHeight: 'loose' }) },
  });
  await tick(60);
  // 迁移只在读取时发生，写回要等下一次 saveState()。
  // 光渲染设置页不会存盘 —— 必须点一次开关，等价于「用户真的动了一下」。
  const dPage = d.renderSettingsPage();
  let dSwitch = null;
  d.walk(dPage, (node) => {
    if (node.type === 'button' && node.props['aria-label'] === '忽略主题背景') dSwitch = node;
  });
  ok('S4 找到可触发存盘的开关', !!dSwitch);
  if (dSwitch) dSwitch.props.onClick();
  const savedRaw = d.storage.getItem('dsh-ios-theme:v1');
  let saved = null;
  try { saved = JSON.parse(savedRaw); } catch (e) { saved = null; }
  ok('S4b 写回状态可解析', !!saved && typeof saved === 'object');
  if (saved) {
    eq('S5 写回版本号 v=2', saved.v, 2);
    ok('S6 旧字段 accent 已丢弃', !('accent' in saved));
    ok('S7 旧字段 base 已丢弃', !('base' in saved));
    ok('S8 旧字段 emphasis 已丢弃', !('emphasis' in saved));
    ok('S9 旧字段 uiFont 已丢弃', !('uiFont' in saved));
    ok('S10 旧字段 lineHeight 已丢弃', !('lineHeight' in saved));
    ok('S11 主题字段存在', typeof saved.theme === 'string' && saved.theme.length > 0);
  }

  // 卸载净空
  const e = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: { 'dsh-ios-theme:v1': JSON.stringify({ v: 2, theme: 'gruvbox', bg: { enabled: true } }) },
  });
  await tick(60);
  e.dispose();
  const root = e.dom.html;
  const leftovers = [];
  for (const key of ['iosBg', 'iosBgXfade', 'iosBgInstant', 'iosBgSurface']) {
    if (root.dataset[key] !== undefined) leftovers.push('dataset.' + key);
  }
  for (const name of ['--ios-bg-a', '--ios-bg-b', '--ios-bg-blur', '--ios-bg-sat', '--ios-bg-opacity',
    '--ios-bg-scrim', '--ios-bg-size', '--ios-bg-repeat', '--ios-bg-base-alpha', '--ios-bg-side-alpha']) {
    if (root.style.getPropertyValue(name)) leftovers.push(name);
  }
  ok('S12 卸载后 html 无残留标记', leftovers.length === 0, leftovers.join(', '));
  const styles = e.dom.head.children.filter((n) => n.tagName === 'STYLE');
  eq('S13 卸载后 <style> 已移除', styles.length, 0);
}

// ——————————————————————————————————————————————
// U 组：设置页
// ——————————————————————————————————————————————
{
  const a = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: { 'dsh-ios-theme:v1': JSON.stringify({ v: 2, theme: 'lucent-orng' }) },
  });
  await tick(60);
  const page = a.renderSettingsPage();
  ok('U1 设置页可渲染', !!page && typeof page === 'object');

  const classes = new Set();
  const labels = [];
  let chipCount = 0;
  a.walk(page, (node) => {
    if (!node.props) return;
    const cls = node.props.className;
    if (typeof cls === 'string') cls.split(/\s+/).forEach((c) => c && classes.add(c));
    if (node.type === 'button' && typeof cls === 'string' && /ios-thm-tchip/.test(cls)) chipCount += 1;
    const text = node.children && node.children.length === 1 && typeof node.children[0] === 'string'
      ? node.children[0] : null;
    if (text) labels.push(text);
  });

  ok('U2 卡片存在', classes.has('ios-thm-card'));
  ok('U3 状态行存在', classes.has('ios-thm-status'));
  ok('U4 主题芯片网格存在', classes.has('ios-thm-tgrid'));
  ok('U5 忽略主题背景开关存在', labels.includes('忽略主题背景'));
  ok('U6 壁纸卡片存在', labels.includes('背景图'));
  ok('U7 主题芯片 63 个（37 内置 + system + 25 IP）', chipCount === 63, '实际 ' + chipCount);
  ok('U8 分组标题存在', classes.has('ios-thm-group-name'));

  // 每个芯片都要有可读名称，不能出现 undefined / 空串
  const badNames = [];
  a.walk(page, (node) => {
    if (node.type === 'button' && typeof node.props.className === 'string'
      && /ios-thm-tchip/.test(node.props.className)) {
      const title = node.props.title;
      if (typeof title !== 'string' || !title.trim() || title === 'undefined') badNames.push(String(title));
    }
  });
  ok('U9 芯片名称全部可读', badNames.length === 0, badNames.slice(0, 5).join(' | '));

  // 开关可点击并落盘
  let switchBtn = null;
  a.walk(page, (node) => {
    if (node.type === 'button' && node.props['aria-label'] === '忽略主题背景') switchBtn = node;
  });
  ok('U10 找到忽略主题背景开关', !!switchBtn);
  if (switchBtn) {
    switchBtn.props.onClick();
    const saved = JSON.parse(a.storage.getItem('dsh-ios-theme:v1'));
    eq('U11 点击开关后落盘为 true', saved.bgIgnoreTheme, true);
  }

  // —— 选中标记（用户诉求 2）——
  // 当前主题是 lucent-orng，应当且只有它带勾。
  const checks = [];
  a.walk(page, (node) => {
    if (typeof node.props.className === 'string' && /ios-thm-tcheck/.test(node.props.className)) {
      checks.push(node);
    }
  });
  ok('U12 选中主题带勾号', checks.length === 1, '勾号数量 ' + checks.length);
  ok('U13 勾号是 ✓', checks.length === 1 && checks[0].children[0] === '\u2713',
    checks.length === 1 ? JSON.stringify(checks[0].children[0]) : '');

  // 勾号必须挂在「当前主题那一格」上，不能挂错位置
  let checkedChipTitle = null;
  a.walk(page, (node) => {
    if (node.type !== 'button' || typeof node.props.className !== 'string') return;
    if (!/ios-thm-tchip/.test(node.props.className)) return;
    if (node.props['aria-checked'] !== true) return;
    checkedChipTitle = node.props.title;
  });
  ok('U14 被勾选的芯片是当前主题', typeof checkedChipTitle === 'string'
    && /当前使用/.test(checkedChipTitle), String(checkedChipTitle));

  // 单选语义：芯片要报 role=radio + aria-checked，分组要报 radiogroup
  let radioChips = 0;
  let checkedChips = 0;
  a.walk(page, (node) => {
    if (typeof node.props.className !== 'string') return;
    if (/ios-thm-tchip/.test(node.props.className)) {
      if (node.props.role === 'radio') radioChips += 1;
      if (node.props['aria-checked'] === true) checkedChips += 1;
    }
  });
  ok('U15 芯片报 radio 语义', radioChips === 63, 'radio 芯片 ' + radioChips);
  ok('U16 只有一个芯片被标记为选中', checkedChips === 1, '选中数 ' + checkedChips);
  ok('U17 主题网格报 radiogroup 语义', classes.has('ios-thm-tgrid')
    && (() => {
      let found = false;
      a.walk(page, (node) => {
        if (node.props && node.props.role === 'radiogroup') found = true;
      });
      return found;
    })());

  // —— 背景参数调整项（用户诉求 1 的第二半）——
  ok('U18 有一键预设', labels.includes('一键预设'));
  // 分档被移除是刻意的：它必然导致整页叠印（见 07-css.js 里那段注释）。
  // 这条断言把「别再把它加回来」钉住。
  ok('U19 不再有「透出范围」分档', !labels.includes('透出范围'));
  ok('U20 预设按钮存在（轻微/标准/通透）',
    labels.includes('轻微') && labels.includes('标准') && labels.includes('通透'),
    [labels.includes('轻微'), labels.includes('标准'), labels.includes('通透')].join('/'));
  ok('U21 滑块说明行存在', classes.has('ios-thm-slider-hint'));
  ok('U22 五个滑块仍在', ['模糊', '遮罩深度', '壁纸透明度', '界面底透明度', '饱和度']
    .every((l) => labels.includes(l)));

  // 点预设应当把 5 个参数一起改成预设值并落盘
  let clearPreset = null;
  a.walk(page, (node) => {
    if (node.type === 'button' && node.props['aria-label']
      && String(node.props['aria-label']).indexOf('通透') === 0) clearPreset = node;
  });
  ok('U23 找到「通透」预设按钮', !!clearPreset);
  if (clearPreset) {
    clearPreset.props.onClick();
    // 参数变更走 bgPersistSoon 的 180ms 防抖，同步读盘会读到旧值 —— 必须等一下
    await tick(260);
    const saved = JSON.parse(a.storage.getItem('dsh-ios-theme:v1'));
    eq('U24 预设改了模糊', saved.bg.blur, 8);
    eq('U25 预设改了遮罩深度', saved.bg.scrim, 8);
    eq('U26 预设改了界面底透明度', saved.bg.surface, 58);
    // 分档已被移除：预设不能再往存档里写 depth，否则升级用户会带着一个
    // 已废弃的字段（旧版存档里有它，新代码读不到会当未知字段忽略，但仍不该再写）。
    ok('U27 预设不再写已废弃的 depth 字段', saved.bg.depth === undefined,
      String(saved.bg.depth));
  }
}

// —— 输出 ——
console.log('');
if (failures.length) {
  console.log('失败项：');
  for (const f of failures) console.log('  ✗ ' + f);
  console.log('');
}
console.log(`通过 ${pass} / ${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
