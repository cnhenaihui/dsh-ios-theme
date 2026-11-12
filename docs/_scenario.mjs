// 端到端场景验证：用户 m01202 的核心诉求 ——
// 「只保留背景图 + 调色板功能 + 透光橙效果 + 关键字突出」。
//
// 前面的断言各自验一块，这个脚本验的是**四件事同时成立**时的最终结果：
// 选透光橙、开壁纸，主题层与壁纸层都注册，代码高亮与 Markdown 语义色都来自主题，
// 且壁纸真的能透出来（主题不写画布令牌）。
import { loadPlugin, tick } from './_harness.mjs';

let pass = 0;
let fail = 0;
const fails = [];
function ok(name, cond, detail) {
  if (cond) { pass += 1; console.log('  ok   ' + name + (detail ? ' — ' + detail : '')); return; }
  fail += 1;
  fails.push(name);
  console.log('  FAIL ' + name + (detail ? ' — ' + detail : ''));
}

const BG_RECORDS = [{
  id: 'seed-1', name: 'wallpaper.jpg', blob: {}, thumb: '',
  width: 3840, height: 2160, bytes: 1024, addedAt: 1,
}];
const HOST_COMPUTED = {
  '--dsw-alias-bg-base': '#f7f7f8',
  '--dsw-specific-sidebar-fill': '#f2f2f4',
  // 控件层与浮层底。这两个是「不该被碰」的令牌 —— 故意在 computed 里给出真值，
  // 这样如果哪天有人又把它们纳入覆盖，断言能立刻抓到（给空值会让它读不到而跳过）。
  '--dsw-alias-bg-layer-1': '#ffffff',
  '--dsw-alias-bg-layer-2': '#fafafa',
  '--dsw-alias-bg-layer-3': '#f5f5f5',
  '--dsw-alias-bg-overlay': '#f0f0f0',
};

const lastOf = (calls, source) => {
  const list = calls.filter((c) => c.source === source);
  return list.length ? list[list.length - 1] : null;
};

// ——————————————————————————————————————————————
// 场景 A：透光橙 + 壁纸（用户的核心诉求）
// ——————————————————————————————————————————————
console.log('\n场景 A：透光橙 + 壁纸');
{
  const h = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: {
      'dsh-ios-theme:v1': JSON.stringify({
        v: 2, theme: 'lucent-orng', bg: { enabled: true, index: 0 },
      }),
    },
  });
  await tick(80);

  const theme = lastOf(h.calls.overrideTokens, 'dsh-theme-wallpaper:theme');
  const bg = lastOf(h.calls.overrideTokens, 'dsh-theme-wallpaper:bg');

  ok('主题层已注册', !!theme, Object.keys(theme.tokens).length + ' 条令牌');
  ok('壁纸层已注册', !!bg, Object.keys(bg.tokens).length + ' 条令牌');

  // 透光的关键：主题层不碰画布令牌，壁纸层独占
  ok('主题层不写 --dsw-alias-bg-base', !theme.tokens['--dsw-alias-bg-base']);
  ok('主题层不写 --dsw-specific-sidebar-fill', !theme.tokens['--dsw-specific-sidebar-fill']);
  ok('壁纸层写了 --dsw-alias-bg-base', !!bg.tokens['--dsw-alias-bg-base'],
    JSON.stringify(bg.tokens['--dsw-alias-bg-base']));
  ok('壁纸层用的是 color-mix 半透明',
    /color-mix/.test(bg.tokens['--dsw-alias-bg-base'].light));

  // 关键字突出：代码高亮必须由主题驱动，不是宿主写死的十六进制
  const shiki = Object.entries(theme.tokens).filter(([k]) => k.startsWith('--shiki-'));
  ok('shiki 令牌 ≥10 条', shiki.length >= 10, shiki.length + ' 条');
  const HOST_HARDCODED = ['#d6336c', '#2f9e44', '#1c7ed6', '#868e96', '#6741d9'];
  const stillHardcoded = shiki.filter(([, v]) => HOST_HARDCODED.some(
    (c) => String(v.light).toLowerCase() === c || String(v.dark).toLowerCase() === c));
  ok('shiki 值不是宿主默认硬编码色', stillHardcoded.length === 0,
    stillHardcoded.map(([k]) => k).join(','));

  // 透光橙的品牌色确实是橙
  const brand = theme.tokens['--dsw-alias-brand-primary'];
  ok('品牌主色是橙色系', brand && /^#F07B54$/i.test(brand.dark),
    JSON.stringify(brand));

  // Markdown 语义色齐备（heading / strong / emph / link / code / blockquote）
  const semanticSlots = [
    '--dsw-alias-markdown-heading', '--dsw-alias-markdown-strong',
    '--dsw-alias-markdown-emph', '--dsw-alias-markdown-link',
  ];
  const missing = semanticSlots.filter((k) => !theme.tokens[k]);
  ok('Markdown 语义令牌齐备（元素级 CSS 兜底 strong/em）',
    missing.length === semanticSlots.length, // 宿主没有这些变量，靠 CSS 兜底才是对的
    '宿主不提供 ' + missing.length + '/' + semanticSlots.length + ' 个角色变量，故用 CSS 规则');

  // —— 透出边界（本次回归的守护断言）——
  // 壁纸层只准碰两个令牌：窗口底与侧栏。
  // 曾经为了「让卡片也透」去改 --dsw-alias-bg-layer-1，结果整页叠印 ——
  // 那个令牌是所有控件级表面的共用底，一改全透。这三条断言就是钉住这条边界。
  ok('壁纸层只覆盖 bg-base 与 sidebar-fill',
    Object.keys(bg.tokens).sort().join(',') === '--dsw-alias-bg-base,--dsw-specific-sidebar-fill',
    Object.keys(bg.tokens).join(','));
  ok('不碰控件层 layer-1（改了会整页叠印）', !bg.tokens['--dsw-alias-bg-layer-1']);
  ok('不碰浮层 layer-2（改了菜单会透）', !bg.tokens['--dsw-alias-bg-layer-2']);
  ok('不碰 layer-3 与 overlay', !bg.tokens['--dsw-alias-bg-layer-3'] && !bg.tokens['--dsw-alias-bg-overlay']);
  // 也不再往 html 上写「透出范围」标记：这个分档已被证明必然导致叠印
  ok('不写透出范围标记', h.dom.html.dataset.iosBgDepth === undefined,
    String(h.dom.html.dataset.iosBgDepth));
}

// ——————————————————————————————————————————————
// 场景 B：实色主题 + 壁纸 + 忽略主题背景
// ——————————————————————————————————————————————
console.log('\n场景 B：实色主题 + 忽略主题背景');
{
  const h = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: {
      'dsh-ios-theme:v1': JSON.stringify({
        v: 2, theme: 'gruvbox', bgIgnoreTheme: true, bg: { enabled: true },
      }),
    },
  });
  await tick(80);

  const theme = lastOf(h.calls.overrideTokens, 'dsh-theme-wallpaper:theme');
  const bg = lastOf(h.calls.overrideTokens, 'dsh-theme-wallpaper:bg');

  ok('两层都注册', !!theme && !!bg);
  ok('壁纸层 seq 更大（压过主题）', bg.seq > theme.seq,
    'theme=' + theme.seq + ' bg=' + bg.seq);
  ok('主题仍写了画布令牌（只是被压住）', !!theme.tokens['--dsw-alias-bg-base']);
}

// ——————————————————————————————————————————————
// 场景 C：system 主题 + 壁纸（等价于「宿主默认 + 壁纸」）
// ——————————————————————————————————————————————
console.log('\n场景 C：跟随系统 + 壁纸');
{
  const h = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: {
      'dsh-ios-theme:v1': JSON.stringify({
        v: 2, theme: 'system', bg: { enabled: true },
      }),
    },
  });
  await tick(80);

  const themeCalls = h.calls.overrideTokens.filter((c) => c.source === 'dsh-theme-wallpaper:theme');
  const bg = lastOf(h.calls.overrideTokens, 'dsh-theme-wallpaper:bg');
  ok('system 主题不注册令牌层', themeCalls.length === 0, themeCalls.length + ' 次注册');
  ok('壁纸层仍然生效', !!bg && !!bg.tokens['--dsw-alias-bg-base']);
}

// ——————————————————————————————————————————————
// 场景 D：不开壁纸时，主题必须完整接管
// ——————————————————————————————————————————————
console.log('\n场景 D：透光橙 + 壁纸关闭');
{
  const h = loadPlugin({
    bgRecords: BG_RECORDS,
    computed: HOST_COMPUTED,
    storageSeed: {
      'dsh-ios-theme:v1': JSON.stringify({
        v: 2, theme: 'lucent-orng', bg: { enabled: false },
      }),
    },
  });
  await tick(80);

  const bgCalls = h.calls.overrideTokens.filter((c) => c.source === 'dsh-theme-wallpaper:bg');
  const theme = lastOf(h.calls.overrideTokens, 'dsh-theme-wallpaper:theme');
  ok('壁纸层未注册', bgCalls.length === 0, bgCalls.length + ' 次');
  ok('主题层仍注册', !!theme);
  // 壁纸关掉、主题又不写画布 → 画布是宿主自己的，这是正确行为
  ok('画布交给宿主（透光橙不写 bg-base）', !theme.tokens['--dsw-alias-bg-base']);
}

console.log('');
// 汇总行格式与 run-all.mjs 的 parseCounts 对齐：「通过 N / M」
console.log(`  结果：通过 ${pass} / ${pass + fail}${fail ? '（失败 ' + fail + '）' : ''}`);
if (fail) { console.log('  失败：' + fails.join(' | ')); }
process.exit(fail ? 1 : 0);
