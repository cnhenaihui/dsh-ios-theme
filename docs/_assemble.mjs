// 把 docs/src/ 下的分段源码拼成 client.js。
//
// 分段原因：client.js 有 1.1 万行，其中 02/03 两段是脚本生成的（主题数据 + 引擎），
// 手工维护整文件既看不清结构，也没法让生成脚本重复跑。分段后：
//   · 01/04/05/06/07/09 是手写源码，直接改
//   · 02/03 由 _extract_themes.mjs / _extract_engine.mjs 生成，改了上游才重跑
//
// 用法：
//   node docs/_assemble.mjs          拼装
//   node docs/_assemble.mjs --check  只校验分段存在与产物语法，不写文件

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(HERE, 'src');
const OUT = path.join(ROOT, 'client.js');

// 顺序即文件内的拼接顺序，不是执行顺序 —— 所有段都在同一个 factory 函数体里，
// 函数声明会提升，const 有 TDZ，所以段的先后必须满足 const 的读取顺序：
//   01 常量/state → 02 主题数据 → 03 引擎（__mods）→ 04 主题层（读 __mods）
//   → 05 背景图 → 06 设置页 → 07 CSS → 09 装配
const ORDER = [
  '01-head.js',
  '02-theme-data.js',
  '03-engine.js',
  '04-theme.js',
  '05-bg.js',
  '06-ui.js',
  '07-css.js',
  '09-assemble.js',
];

function main() {
  const checkOnly = process.argv.includes('--check');
  const missing = ORDER.filter((f) => !fs.existsSync(path.join(SRC, f)));
  if (missing.length) {
    console.error('缺少分段：' + missing.join(', '));
    process.exit(1);
  }

  const parts = [];
  const stats = [];
  for (const file of ORDER) {
    const raw = fs.readFileSync(path.join(SRC, file), 'utf8');
    const body = raw.replace(/\s+$/, '');
    parts.push('// ==== ' + file + ' ====\n' + body);
    stats.push([file, Buffer.byteLength(raw, 'utf8'), raw.split('\n').length]);
  }

  const output = parts.join('\n\n') + '\n';
  const bytes = Buffer.byteLength(output, 'utf8');
  const lines = output.split('\n').length;

  if (!checkOnly) {
    fs.writeFileSync(OUT, output, 'utf8');
    // 语法校验：client.js 无 import/export，是纯脚本，可以用 new Function 在同进程解析。
    //
    // 早先这里用 execFileSync(node --check)，但在禁止子进程的环境里（沙箱、受限策略）
    // 会抛 EPERM，被 catch 误报成「语法校验失败」—— 文件其实已经写对了，
    // 报错信息却指向语法，排查时会白跑一圈。同进程解析没有这个坑，也更快。
    try {
      // eslint-disable-next-line no-new-func
      new Function(output);
    } catch (e) {
      console.error('语法校验失败：');
      console.error(String((e && e.message) || e));
      process.exit(1);
    }
  }

  const width = Math.max(...stats.map((s) => s[0].length));
  for (const [file, b, l] of stats) {
    console.log('  ' + file.padEnd(width) + '  ' + String(b).padStart(7) + ' B  ' + String(l).padStart(5) + ' 行');
  }
  console.log('  ' + '合计'.padEnd(width) + '  ' + String(bytes).padStart(7) + ' B  ' + String(lines).padStart(5) + ' 行');
  console.log(checkOnly ? '校验通过（未写文件）' : '已写入 ' + OUT);
}

main();
