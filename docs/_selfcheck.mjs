// 静态自检：不加载插件，只看 client.js 的模块外壳是否合规。
// 用途是在没有真实宿主的情况下，先确认「宿主能不能把这份文件当成插件装起来」。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.resolve(HERE, '../client.js');
const src = fs.readFileSync(CLIENT, 'utf8');
const lines = src.split('\n');

let pass = 0;
let fail = 0;
const fails = [];
function ok(name, cond, detail) {
  if (cond) { pass += 1; return; }
  fail += 1;
  fails.push(name + (detail ? ' — ' + detail : ''));
}

// 1. 模块外壳
ok('调用 __ModuleLoader__.load', /__ModuleLoader__\.load\(/.test(src));
ok('只 require react（宿主注入的唯一模块）',
  (() => {
    const names = [...src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
    return names.length > 0 && names.every((n) => n === 'react');
  })(),
  [...new Set([...src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]))].join(','));

// 2. 导出形状
ok('factory 返回 inject 数组', /inject:\s*\[/.test(src));
ok('inject 含 theme 与 slots', /inject:\s*\[[^\]]*'theme'[^\]]*'slots'/.test(src));
ok('导出 apply 函数', /apply\(appCtx\)\s*\{/.test(src));

// 3. 不能有的东西：网络、eval、动态 import、顶层 await
ok('无 fetch', !/\bfetch\(/.test(src));
ok('无 XMLHttpRequest', !/XMLHttpRequest/.test(src));
ok('无 eval', !/\beval\(/.test(src));
ok('无 new Function', !/new Function\(/.test(src));
ok('无动态 import', !/\bimport\(/.test(src));

// 顶层 await 会让宿主把它当 ESM 处理，而这个文件是 classic script（走 __ModuleLoader__）。
// 只判「文件最外层」：去掉所有函数体后的剩余文本里不该有 await。
// 逐个 await 往前找最近的 function/箭头函数，判断它是否在某个函数内。
const topLevelAwaits = [];
{
  const at = [];
  const re = /\bawait\b/g;
  let m;
  while ((m = re.exec(src))) at.push(m.index);
  for (const idx of at) {
    const before = src.slice(0, idx);
    // 统计还没闭合的 function/箭头作用域：粗判法看该位置是否在某个 `function` 或 `=>` 之后
    const lastFn = Math.max(
      before.lastIndexOf('function '),
      before.lastIndexOf('function('),
      before.lastIndexOf('=>'),
    );
    // 函数内 await 合法；文件顶层 await 通常出现在最后 200 行之外且无包裹
    if (lastFn < 0) topLevelAwaits.push(src.slice(idx - 40, idx + 40).replace(/\s+/g, ' '));
  }
}
ok('无顶层 await', topLevelAwaits.length === 0, topLevelAwaits.slice(0, 2).join(' | '));

// 4. 不依赖宿主 hashed 类名（DSH 的 CSS Module 类名形如 .MnhYfF_frame）
// 只看代码，不看注释 —— 注释里出现哈希类名恰恰是在解释「为什么不依赖它」。
const codeOnly = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const hashed = codeOnly.match(/\.[A-Za-z]{6}_[a-z][A-Za-z]*/g) || [];
ok('不引用宿主 hashed 类名', hashed.length === 0, [...new Set(hashed)].slice(0, 5).join(','));

// 5. 结构完整性：八段都在
for (const seg of ['01-head.js', '02-theme-data.js', '03-engine.js', '04-theme.js',
  '05-bg.js', '06-ui.js', '07-css.js', '09-assemble.js']) {
  ok('含分段 ' + seg, src.includes('// ==== ' + seg + ' ===='));
}

// 6. 编码：不能有替换字符（GBK 往返事故的指纹）
ok('无 U+FFFD 替换字符', !src.includes('\uFFFD'));

// 7. 体量合理（不是空壳，也没大到宿主读不动）
const bytes = Buffer.byteLength(src, 'utf8');
ok('体量在 100KB–1MB 之间', bytes > 100 * 1024 && bytes < 1024 * 1024, bytes + ' B');
ok('行数 > 5000', lines.length > 5000, lines.length + ' 行');

console.log('');
for (const f of fails) console.log('  ✗ ' + f);
console.log(`  ${fail ? '失败 ' + fail + ' 条' : '全部通过'}（通过 ${pass} / ${pass + fail}）`);
process.exit(fail ? 1 : 0);
