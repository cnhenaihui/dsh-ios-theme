// 断言有牙齿的证明：故意破坏源码，确认对应断言确实会 FAIL，再原样还原。
//
//   node ios-theme-plugin/test/_mutation.mjs
//
// 为什么需要这一步：一条断言写出来永远是「通过」的，它可能压根没看住那个行为
// （选择器写错、取错了覆盖层、变量名打错都算）。只有把它对应的实现改坏、
// 看它确实变红，才能证明这条断言是活的。
//
// 做法：改 docs/src/ 里的分段源码 → 重跑 _assemble.mjs 拼装 → 跑 _verify_v2.mjs
// → 从输出里抓失败断言名 → 与预期比对 → 还原源码 → 重新拼装 → 校验 sha256。
// 之所以改分段源码而不是直接改 client.js：client.js 是拼装产物，直接改会在下一次
// 拼装时被覆盖，改源码才和真实工作流一致。
//
// 「未捕获」= 变异之后那条断言仍然 PASS，说明它没有真正看住这个行为。

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'docs', 'src');
const ASSEMBLE = path.join(ROOT, 'docs', '_assemble.mjs');
const VERIFY = path.join(ROOT, 'docs', '_verify_v2.mjs');
const CLIENT = path.join(ROOT, 'client.js');
const NODE = process.execPath;

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);

const MUTATIONS = [
  {
    id: 'M1',
    desc: '把「两半各用自己配色」改回 delegated（36 套实色主题的浅色画布被丢弃）',
    file: '04-theme.js',
    from: 'const tokens = GENERATE.buildTokens(dark, light, true);',
    to: 'const tokens = GENERATE.buildTokens(dark, light, delegated);',
    expect: ['W7b'],
  },
  {
    id: 'M2',
    desc: '把 reapplyLayers 的两个分支对调（默认顺序下壁纸压过实色主题）',
    file: '04-theme.js',
    from: `      if (state.bgIgnoreTheme) {
        applyTheme();
        bgApplySurface();
      } else {
        bgApplySurface();
        applyTheme();
      }`,
    to: `      if (state.bgIgnoreTheme) {
        bgApplySurface();
        applyTheme();
      } else {
        applyTheme();
        bgApplySurface();
      }`,
    expect: ['W8'],
  },
  {
    id: 'M3',
    desc: '让透光橙也写画布令牌（壁纸会被主题层盖住）',
    file: '04-theme.js',
    from: '        result = { tokens, css, delegated, meta: themeMetaOf(id, delegated) };',
    to: "        if (id === 'lucent-orng') tokens['--dsw-alias-bg-base'] = { light: '#f7f7f8', dark: '#101010' };\n        result = { tokens, css, delegated, meta: themeMetaOf(id, delegated) };",
    expect: ['W3'],
  },
  {
    id: 'M4',
    desc: '让 system 主题也注册令牌层（跟随宿主被破坏）',
    file: '04-theme.js',
    from: `        result = {
          tokens: {},
          css: '',
          delegated: true,`,
    to: `        result = {
          tokens: { '--dsw-alias-bg-base': { light: '#ffffff', dark: '#000000' } },
          css: '',
          delegated: true,`,
    expect: ['W10'],
  },
  {
    id: 'M5',
    desc: '卸载时不调 bgTeardown（html 上残留壁纸标记与变量）',
    file: '09-assemble.js',
    from: "          try { bgTeardown(); } catch (e) { /* 忽略 */ }",
    to: "          /* mutation: 卸载清理被删 */",
    expect: ['S12'],
  },
  {
    id: 'M6',
    desc: '忽略主题背景开关点击后不落盘',
    file: '06-ui.js',
    from: 'onClick: () => setBgIgnoreTheme(!on),',
    to: 'onClick: () => {},',
    expect: ['U11'],
  },
  {
    id: 'M7',
    desc: '破坏令牌形状：把一条令牌写成裸字符串（宿主 validateOverrides 会拒）',
    file: '04-theme.js',
    from: '        result = { tokens, css, delegated, meta: themeMetaOf(id, delegated) };',
    to: "        tokens['--dsw-alias-brand-primary'] = '#ff0000';\n        result = { tokens, css, delegated, meta: themeMetaOf(id, delegated) };",
    expect: ['W5b'],
  },
];

const ORIGINAL_SHA = sha(fs.readFileSync(CLIENT));

function runNode(script, args = []) {
  return spawnSync(NODE, [script, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
}

// 先探一次能不能起子进程。
//
// 变异检查的每一步都要「改源码 → 重新拼装 → 跑验证」，两步都得起独立进程
// （_verify_v2.mjs 结尾有 process.exit，不能同进程 import）。
// 受限环境（沙箱、禁 spawn 的策略）里 spawnSync 返回 status=null + EPERM，
// 若不先探，每个变异都会走「拼装失败 → SKIP」分支，报告读起来像是
// from/to 锚点写错了 —— 真正的原因在环境。这里一次探明，直接说清楚。
function canSpawn() {
  try {
    const probe = spawnSync(NODE, ['-e', '0'], { cwd: ROOT, encoding: 'utf8', timeout: 15000 });
    return probe.status === 0;
  } catch (e) {
    return false;
  }
}

if (!canSpawn()) {
  console.log('');
  console.log('  跳过：当前环境不允许起子进程（spawn EPERM）。');
  console.log('  变异检查需要「改源码 → 重拼装 → 跑验证」各起一个 node 进程，');
  console.log('  沙箱或受限策略下无法执行。请在普通终端里跑：');
  console.log('    node ios-theme-plugin/test/run-all.mjs --mutation');
  console.log('');
  console.log('  源码未被改动，client.js 保持原样。');
  process.exit(0);
}

function assemble() {
  const res = runNode(ASSEMBLE);
  return res.status === 0;
}

function failedNames() {
  const res = runNode(VERIFY);
  const out = String(res.stdout || '') + String(res.stderr || '');
  const names = [];
  for (const ln of out.split(/\r?\n/)) {
    const m = ln.match(/✗\s+(\S+)/);
    if (m) names.push(m[1]);
  }
  return { names, out, code: res.status };
}

let caught = 0;
let missed = 0;
const lines = [];

for (const mut of MUTATIONS) {
  const file = path.join(SRC, mut.file);
  const original = fs.readFileSync(file, 'utf8');

  if (!original.includes(mut.from)) {
    lines.push(`${mut.id} SKIP 锚点未找到（${mut.file}）：${mut.from.slice(0, 60)}`);
    missed += 1;
    continue;
  }

  const mutated = original.replace(mut.from, mut.to);
  fs.writeFileSync(file, mutated, 'utf8');

  let ok = false;
  try {
    if (!assemble()) {
      lines.push(`${mut.id} SKIP 变异后拼装/语法校验失败（说明 from/to 本身不合法）`);
      missed += 1;
      continue;
    }
    const { names } = failedNames();
    const hit = mut.expect.filter((e) => names.some((n) => n === e || n.startsWith(e)));
    const miss = mut.expect.filter((e) => !hit.includes(e));
    if (miss.length === 0) {
      lines.push(`${mut.id} 捕获 ✓  期望 [${mut.expect.join(', ')}] 全部 FAIL`);
      caught += 1;
      ok = true;
    } else {
      lines.push(`${mut.id} 未捕获 ✗  期望 [${mut.expect.join(', ')}]，漏了 [${miss.join(', ')}]；实际失败 ${names.length ? names.join(' ') : '无'}`);
      missed += 1;
    }
  } finally {
    fs.writeFileSync(file, original, 'utf8');
    assemble();
  }
}

const restoredSha = sha(fs.readFileSync(CLIENT));

console.log('');
for (const ln of lines) console.log('  ' + ln);
console.log('');
console.log(`  捕获 ${caught} / ${caught + missed}`);
console.log(`  源码还原 sha256 ${restoredSha} ${restoredSha === ORIGINAL_SHA ? '(与变异前一致)' : '(不一致！)'}`);

const bad = missed > 0 || restoredSha !== ORIGINAL_SHA;
console.log(`  结论：${bad ? '有变异未被捕获或源码未还原' : '全部变异都被对应断言捕获'}`);
process.exit(bad ? 1 : 0);
