// 可重复验证 harness：在 Node 里加载 client.js，用最小 DOM + mock ctx.theme 驱动，
// 断言 overrideTokens 的真实参数、字体写入、卸载残留与向后兼容。
//
// 为什么不用 jsdom：插件只用到 documentElement/body 的 style + dataset、
// head.appendChild、getComputedStyle、matchMedia、MutationObserver、localStorage、
// indexedDB 这十来个 API，手写 stub 比拉依赖更可控，也符合「不新增运行时依赖」的约束。
// 本文件只在验证时跑，不进 package.json 的 files。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.resolve(HERE, '../client.js');

// —— WCAG 2.1 ——
function hexToRgb(hex) {
  const raw = String(hex).trim().replace(/^#/, '');
  const full = raw.length === 3 ? raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2] : raw.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}
function srgb(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function lum(rgb) {
  return 0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);
}
function contrast(a, b) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return 0;
  const la = lum(ra);
  const lb = lum(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function hue(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r0, g0, b0] = rgb.map((v) => v / 255);
  const mx = Math.max(r0, g0, b0);
  const mn = Math.min(r0, g0, b0);
  const d = mx - mn;
  if (d === 0) return null;
  let h;
  if (mx === r0) h = ((g0 - b0) / d) % 6;
  else if (mx === g0) h = (b0 - r0) / d + 2;
  else h = (r0 - g0) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

// —— 最小 DOM ——
function makeStyle() {
  const map = new Map();
  return {
    map,
    setProperty(name, value) { map.set(name, String(value)); },
    removeProperty(name) { map.delete(name); },
    getPropertyValue(name) { return map.has(name) ? map.get(name) : ''; },
  };
}

function makeEl(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    style: makeStyle(),
    dataset: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    children: [],
    parentNode: null,
    textContent: '',
    id: '',
    setAttribute(name, value) { el._attrs = el._attrs || {}; el._attrs[name] = value; if (name === 'id') el.id = value; },
    getAttribute(name) { return (el._attrs && el._attrs[name]) || null; },
    removeAttribute(name) { if (el._attrs) delete el._attrs[name]; },
    hasAttribute(name) { return !!(el._attrs && name in el._attrs); },
    appendChild(child) { child.parentNode = el; el.children.push(child); return child; },
    removeChild(child) {
      const i = el.children.indexOf(child);
      if (i >= 0) el.children.splice(i, 1);
      child.parentNode = null;
      return child;
    },
    remove() { if (el.parentNode) el.parentNode.removeChild(el); },
    addEventListener() {},
    removeEventListener() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
    getContext() { return null; },
    focus() {},
    scrollIntoView() {},
  };
  return el;
}

function installDom({ computed = {}, reducedTransparency = false, platform = 'windows' } = {}) {
  const html = makeEl('html');
  const head = makeEl('head');
  const body = makeEl('body');
  html.appendChild(head);
  html.appendChild(body);
  html.dataset.platform = platform;
  html.setAttribute('data-platform', platform);

  const registry = new Map(); // id -> element
  const doc = {
    documentElement: html,
    head,
    body,
    visibilityState: 'visible',
    createElement: (tag) => makeEl(tag),
    getElementById: (id) => registry.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
  };
  // 让 appendChild 注册 id，便于 getElementById（诊断浮层用）
  const realAppend = doc.body.appendChild.bind(doc.body);
  doc.body.appendChild = (child) => {
    const out = realAppend(child);
    if (child && child.id) registry.set(child.id, child);
    return out;
  };
  const realHeadAppend = head.appendChild.bind(head);
  head.appendChild = (child) => realHeadAppend(child);

  const computedStyle = (el) => ({
    getPropertyValue: (name) => (name in computed ? computed[name] : (el.style.getPropertyValue(name) || '')),
    backgroundColor: 'rgba(0, 0, 0, 0)',
    fontFamily: '',
    color: '',
    borderLeftWidth: '0px',
    borderLeftColor: '',
  });

  const mediaMap = new Map();
  const matchMedia = (query) => {
    if (!mediaMap.has(query)) mediaMap.set(query, { matches: query.includes('reduced-transparency') ? reducedTransparency : false, addEventListener() {}, removeEventListener() {} });
    return mediaMap.get(query);
  };

  return { doc, html, head, body, computedStyle, matchMedia };
}

// —— localStorage ——
function makeStorage(seed) {
  const map = new Map(Object.entries(seed || {}));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    _dump: () => Object.fromEntries(map),
    _map: map,
  };
}

// —— 最小 IndexedDB：够 bgRefreshGallery 用 ——
function makeIndexedDb(records) {
  const store = records.map((r) => ({ ...r }));
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore() {},
    transaction() {
      const tx = {
        oncomplete: null,
        onerror: null,
        error: null,
        objectStore() {
          return {
            getAll() {
              const req = { result: store.slice(), error: null, onsuccess: null, onerror: null };
              setTimeout(() => req.onsuccess && req.onsuccess(), 0);
              return req;
            },
            put(record) { store.push(record); return {}; },
            delete(id) { const i = store.findIndex((r) => r.id === id); if (i >= 0) store.splice(i, 1); return {}; },
            clear() { store.length = 0; return {}; },
          };
        },
      };
      setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
      return tx;
    },
  };
  return {
    open() {
      const req = { result: db, error: null, onupgradeneeded: null, onsuccess: null, onerror: null };
      setTimeout(() => req.onsuccess && req.onsuccess(), 0);
      return req;
    },
  };
}

// —— 加载插件并 apply ——
export function loadPlugin(options = {}) {
  const {
    storageSeed = {},
    bgRecords = [],
    platform = 'windows',
    computed = {},
    reducedTransparency = false,
    // 两个可选开关（默认关闭，不改变既有调用方行为）：
    //   strictOverrides —— 让 mock 的 overrideTokens 按宿主 validateOverrides 的口径校验入参
    //                      （每个 value 必须是 {light,dark} 双字符串），不合规直接抛 teaching error。
    //   noFontFamily    —— 不挂 theme.setFontFamily，模拟 rc.1 之前没有该 API 的宿主，
    //                      用于验证插件退回 overrideTokens 写字体令牌的兼容分支。
    strictOverrides = false,
    noFontFamily = false,
    themeSnapshot = { preference: 'system', fontFamilies: { text: '', code: '', terminal: '' }, fontSizes: { text: 14, code: 11, terminal: 13 }, active: { id: 'light', colorScheme: 'light', tokens: {} }, themes: [], revision: 0 },
  } = options;

  const dom = installDom({ computed, reducedTransparency, platform });
  const storage = makeStorage(storageSeed);

  // 全局注入
  globalThis.window = {
    matchMedia: dom.matchMedia,
    localStorage: storage,
    addEventListener() {},
    removeEventListener() {},
    indexedDB: makeIndexedDb(bgRecords),
  };
  globalThis.document = dom.doc;
  globalThis.localStorage = storage;
  globalThis.indexedDB = makeIndexedDb(bgRecords);
  globalThis.getComputedStyle = dom.computedStyle;
  globalThis.matchMedia = dom.matchMedia;
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  globalThis.MutationObserver = class { observe() {} disconnect() {} };
  globalThis.URL = globalThis.URL || {};
  globalThis.URL.createObjectURL = () => 'blob:mock';
  globalThis.URL.revokeObjectURL = () => {};
  globalThis.Image = class { set src(v) { setTimeout(() => this.onerror && this.onerror(), 0); } };
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
  globalThis.Node = class {};

  // 捕获模块定义
  let captured = null;
  globalThis.window.__ModuleLoader__ = {
    load(def) { captured = def; },
  };

  const source = fs.readFileSync(CLIENT, 'utf8');
  // 以函数方式求值，避免污染模块图；client.js 顶层只有 __ModuleLoader__.load 调用
  // eslint-disable-next-line no-new-func
  const run = new Function('window', 'document', 'globalThis', source);
  run(globalThis.window, globalThis.document, globalThis);

  if (!captured) throw new Error('插件未调用 __ModuleLoader__.load');

  // 最小 React
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }),
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
    useRef: (init) => ({ current: init === undefined ? null : init }),
  };

  const plugin = captured.factory((id) => {
    if (id === 'react') return React;
    throw new Error('未知 require: ' + id);
  });

  // mock ctx
  const calls = { overrideTokens: [], setTheme: [], setFontFamily: [], on: [], slotRegistrations: [] };
  const layers = new Map();
  let seq = 0;

  const theme = {
    getTheme() { return themeSnapshot; },
    setTheme(id) { calls.setTheme.push(id); },
    setFontFamily(role, value) {
      calls.setFontFamily.push({ role, value });
      themeSnapshot.fontFamilies = { ...themeSnapshot.fontFamilies, [role]: value };
    },
    overrideTokens(source, tokens) {
      // strictOverrides 打开时按宿主 validateOverrides 的口径校验：
      // 裸字符串 / 缺 dark / 名字不带 --dsw- 前缀，都会在宿主侧抛错。
      if (strictOverrides) {
        const problems = [];
        for (const [key, value] of Object.entries(tokens || {})) {
          if (!/^--dsw-[\w-]+$/.test(key)) problems.push(`非法令牌名 ${key}`);
          else if (!value || typeof value !== 'object' || Array.isArray(value)
            || typeof value.light !== 'string' || typeof value.dark !== 'string') {
            // 宿主的口径只有一条：每个 value 必须是 {light,dark} 双字符串。
            // 裸字符串、缺 dark、多余的键，都在这里被拒。
            problems.push(`${key} 必须是 {light,dark} 双字符串（实际 ${JSON.stringify(value)}）`);
          }
        }
        if (problems.length) throw new Error(`[宿主 validateOverrides] ${source}: ${problems.join('; ')}`);
      }
      calls.overrideTokens.push({ source, tokens: JSON.parse(JSON.stringify(tokens)), seq: seq++ });
      layers.set(source, tokens);
      return () => { layers.delete(source); };
    },
  };

  if (noFontFamily) delete theme.setFontFamily;

  const ctx = {
    theme,
    on(event, fn) { calls.on.push(event); const d = () => {}; return d; },
    slots: {
      inject(name, cb) { calls.slotRegistrations.push({ name, phase: 'inject' }); cb(); return () => {}; },
      register(options, component) {
        calls.slotRegistrations.push({ name: options.name, id: options.id, order: options.order, label: typeof options.label === 'function' ? options.label() : options.label, component });
        return () => {};
      },
    },
  };

  const dispose = plugin.apply(ctx);

  // 渲染设置页（供验证脚本触发 UI 动作，从而驱动 saveState 等副作用）。
  // React stub 不渲染子组件，只执行 AppPage 本体 —— 足够拿到按钮的 onClick。
  function renderSettingsPage() {
    const reg = calls.slotRegistrations.find((r) => r.name === 'settings.section' && r.id);
    if (!reg || typeof reg.component !== 'function') throw new Error('settings.section 未注册可渲染组件');
    return reg.component({ close() {} });
  }

  // 深度遍历 react-stub 树。
  //
  // 关键：React stub 不渲染函数组件，h(ThemeCard, null) 只有 type 没有 children。
  // 遍历时必须把函数组件就地展开（调用 type(props) 拿回它返回的子树），
  // 否则所有子组件的 DOM 属性都看不见 —— 之前的 U 组断言全 false 就是这个原因。
  // 展开深度封顶 32 层，防止组件互相递归时把栈打爆。
  function walk(node, visit, depth) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((n) => walk(n, visit, depth)); return; }
    const level = depth || 0;
    if (level > 32) return;
    if (typeof node.type === 'function') {
      let child = null;
      try { child = node.type(node.props || {}); } catch (e) { child = null; }
      if (child) walk(child, visit, level + 1);
      return;
    }
    visit(node);
    if (node.children) walk(node.children, visit, level + 1);
  }

  return { plugin, ctx, calls, layers, dom, storage, dispose, themeSnapshot, React, renderSettingsPage, walk };
}

// 等待异步（bgRefreshGallery 等）
export function tick(ms = 10) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { contrast, hue, hexToRgb, lum };
