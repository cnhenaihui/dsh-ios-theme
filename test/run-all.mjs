// 2.0 架构验证套件总入口。
//
//   node ios-theme-plugin/test/run-all.mjs              跑全部验证
//   node ios-theme-plugin/test/run-all.mjs --mutation   额外跑变异检查（会临时改源码）
//
// 为什么要分五层：
//   1. 拼装校验 —— client.js 是 docs/src/ 八段拼出来的，先确认分段齐全、产物语法正确。
//      这一层失败，后面所有断言都在测一个不存在的文件。
//   2. 模块外壳自检 —— 静态读源码，验宿主能不能把它当插件装起来（__ModuleLoader__、
//      只 require react、无网络/无 eval、不依赖宿主哈希类名）。
//   3. 引擎自检 —— 主题数据与引擎模块的完整性（62 套、37 槽、分组、委托画布）。
//   4. 插件行为 —— 走 _harness.mjs 的最小 DOM 与 mock ctx，验令牌层、壁纸层、设置页、迁移、卸载。
//   5. 端到端场景 —— 把四件事放在一起验：选主题、开壁纸、关键字配色、壁纸真的透得出来。
//      前四层各自验一块，这一层验它们同时成立时的最终结果（含层序先后）。
//
// 每层都是独立子进程：harness 会改写 globalThis.window / document，同进程内串行也容易互相污染，
// 分开跑最干净，也让"哪一层挂了"一眼可见。

import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const NODE = process.execPath;

const LAYERS = [
  {
    id: 'assemble',
    title: '拼装校验',
    script: path.join(ROOT, 'docs', '_assemble.mjs'),
    args: ['--check'],
  },
  {
    id: 'selfcheck',
    title: '模块外壳自检',
    script: path.join(ROOT, 'docs', '_selfcheck.mjs'),
    args: [],
  },
  {
    id: 'engine',
    title: '引擎自检',
    script: path.join(ROOT, 'docs', '_engine_smoke.mjs'),
    args: [],
  },
  {
    id: 'behaviour',
    title: '插件行为验证',
    script: path.join(ROOT, 'docs', '_verify_v2.mjs'),
    args: [],
  },
  {
    id: 'scenario',
    title: '端到端场景验证',
    script: path.join(ROOT, 'docs', '_scenario.mjs'),
    args: [],
  },
];

const t0 = Date.now();
const results = [];

function line(ch = '─', n = 78) {
  return ch.repeat(n);
}

// 从子进程输出里抽「通过 N / M」这样的计数行
function parseCounts(out) {
  const m = out.match(/通过\s+(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  return { pass: Number(m[1]), total: Number(m[2]) };
}

function runLayer(layer) {
  const res = spawnSync(NODE, [layer.script, ...layer.args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000,
  });
  const out = String(res.stdout || '');
  const err = String(res.stderr || '');
  const combined = out + (err ? '\n' + err : '');
  const counts = parseCounts(out);
  return {
    layer,
    code: res.status,
    ok: res.status === 0,
    output: combined,
    counts,
  };
}

function printResult(r) {
  const tag = r.ok ? 'PASS' : 'FAIL';
  const tail = r.counts ? `（${r.counts.pass}/${r.counts.total}）` : '';
  console.log(`  ${tag}  ${r.layer.title}${tail}`);
  if (!r.ok) {
    for (const ln of r.output.split(/\r?\n/)) {
      if (/✗|失败|Error|error:|Exception/.test(ln)) console.log(`        ${ln.trim()}`);
    }
  }
}

function main() {
  console.log(line('='));
  console.log('DSH iOS Theme 插件 · 2.0 验证套件');
  const client = path.join(ROOT, 'client.js');
  console.log(`加载目标: ${path.relative(ROOT, client)} (${fs.statSync(client).size} bytes)`);
  console.log(`时间    : ${new Date().toISOString()}`);
  console.log(line('='));

  for (const layer of LAYERS) {
    console.log('');
    console.log(`━━━ ${layer.title} ━━━`);
    const r = runLayer(layer);
    results.push(r);
    printResult(r);
  }

  // 变异检查：证明断言有牙齿。默认不跑，因为它会临时改写源码。
  if (process.argv.includes('--mutation')) {
    console.log('');
    console.log('━━━ 变异检查（临时改源码，验完自动还原）━━━');
    const mutation = path.join(HERE, '_mutation.mjs');
    if (fs.existsSync(mutation)) {
      const res = spawnSync(NODE, [mutation], { cwd: ROOT, encoding: 'utf8', timeout: 600000 });
      const out = String(res.stdout || '') + String(res.stderr || '');
      const tag = res.status === 0 ? 'PASS' : 'FAIL';
      console.log(`  ${tag}  变异检查`);
      for (const ln of out.split(/\r?\n/)) {
        if (ln.trim()) console.log(`        ${ln.trim()}`);
      }
      results.push({ layer: { title: '变异检查' }, ok: res.status === 0, output: out, counts: null });
    }
  }

  // —— 汇总 ——
  const failed = results.filter((r) => !r.ok);
  const totalAssertions = results.reduce((n, r) => n + (r.counts ? r.counts.total : 0), 0);
  const passedAssertions = results.reduce((n, r) => n + (r.counts ? r.counts.pass : 0), 0);

  console.log('');
  console.log(line('='));
  console.log(`汇总：${results.length} 层 | 通过 ${results.length - failed.length} | 失败 ${failed.length}`);
  if (totalAssertions) {
    console.log(`      断言 ${passedAssertions}/${totalAssertions}`);
  }
  for (const r of results) {
    const tag = r.ok ? '✓' : '✗';
    console.log(`  ${tag} ${r.layer.title}`);
  }
  if (failed.length) {
    console.log('');
    console.log('失败层：');
    for (const r of failed) {
      console.log(`  · ${r.layer.title}`);
      for (const ln of r.output.split(/\r?\n/)) {
        if (/✗/.test(ln)) console.log(`      ${ln.trim()}`);
      }
    }
  }
  console.log('');
  console.log(`耗时 ${((Date.now() - t0) / 1000).toFixed(2)}s`);
  console.log(`结论：${failed.length === 0 ? '全部通过' : `${failed.length} 层失败`}`);
  console.log(line('='));
  return failed.length === 0 ? 0 : 1;
}

process.exit(main());
