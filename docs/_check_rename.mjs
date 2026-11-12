// 改名收尾自检：确认包名切换彻底，且用户数据地址（存储键 / 库名）原样保留。
// 这个脚本只在改名后跑一次，不属于常规验证链。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let bad = 0;
const ok = (name, cond, detail) => {
  if (!cond) bad += 1;
  console.log((cond ? '  OK   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
};

const pkg = JSON.parse(read('package.json'));
const client = read('client.js');
const patch = read('cordis.patch.yml');

console.log('【新标识必须就位】');
ok('包名', pkg.name === '@cnhenaihui/dsh-theme-wallpaper', pkg.name);
ok('版本 2.1.0', pkg.version === '2.1.0', pkg.version);
ok('仓库地址', pkg.repository.url.includes('dsh-theme-wallpaper'), pkg.repository.url);
ok('homepage', pkg.homepage.includes('dsh-theme-wallpaper'));
ok('bugs 地址', pkg.bugs.url.includes('dsh-theme-wallpaper'));
ok('bundle.patch 仍在', pkg.dsh.bundle.patch === './cordis.patch.yml');
ok('client.platform 仍是 web', pkg.dsh.client.platform === 'web');

console.log('');
console.log('【cordis.patch.yml】');
ok('entry id 已换', patch.includes('id: theme-wallpaper'), patch.split('\n')[2] || '');
ok('包名已换', patch.includes('@cnhenaihui/dsh-theme-wallpaper'));
ok('旧 entry id 已清', !patch.includes('id: ios-theme'));

console.log('');
console.log('【client.js 运行时标识】');
ok('__ModuleLoader__ id 已换', client.includes("id: '@cnhenaihui/dsh-theme-wallpaper'"));
ok('SOURCE_THEME 已换', client.includes("'dsh-theme-wallpaper:theme'"));
ok('BG_SOURCE 已换', client.includes("'dsh-theme-wallpaper:bg'"));
ok('style 标记已换', client.includes("dataset.plugin = 'dsh-theme-wallpaper'"));
ok('日志前缀已换', client.includes('[dsh-theme-wallpaper]'));
ok('无旧 source 残留', !client.includes('dsh-ios-theme:theme') && !client.includes('dsh-ios-theme:bg'));

console.log('');
console.log('【用户数据地址必须原样保留 —— 改了就丢数据】');
ok('localStorage 键未动', client.includes("const STORAGE_KEY = 'dsh-ios-theme:v1'"));
ok('IndexedDB 库名未动', client.includes("const BG_DB_NAME = 'dsh-ios-theme'"));
ok('IndexedDB 版本未动', client.includes('const BG_DB_VERSION = 1'));
ok('store 名未动', client.includes("const BG_STORE = 'backgrounds'"));

console.log('');
console.log('【README】');
const readme = read('README.md');
ok('标题已换', readme.startsWith('# dsh-theme-wallpaper'));
ok('写了改名说明', readme.includes('Renamed / 已改名'));
ok('写了升级章节', readme.includes('Upgrading from `dsh-ios-theme`'));
ok('升级表列出存储键未变', readme.includes('dsh-ios-theme:v1') && readme.includes('**no**'));
ok('写了壁纸透出边界', readme.includes('How the wallpaper shows through'));
ok('断言数已更新', readme.includes('163'));

console.log('');
console.log(bad === 0 ? '  结论：改名彻底，用户数据地址完好' : '  结论：有 ' + bad + ' 项不合规');
process.exit(bad === 0 ? 0 : 1);
