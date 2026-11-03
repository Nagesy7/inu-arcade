// Gamepad API support: mocked navigator.getGamepads (connect, standard mapping, left stick + dead zone, disconnect,
// no polling cost without a pad) and keyboard + touch + pad mixing in the shared input.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as GP from '../src/core/gamepad.js';

const btns = (on = []) => Array.from({ length: 17 }, (_, i) => ({ pressed: on.includes(i), value: on.includes(i) ? 1 : 0 }));
const pad = (o = {}) => ({ id: o.id || 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: o.index ?? 0, connected: true, mapping: 'standard', buttons: btns(o.on), axes: o.axes || [0, 0, 0, 0] });
function rig(list, mode = '8way') { const ev = {}, log = { keys: [], edges: [], con: [], dis: [], calls: 0 };
  const target = { addEventListener: (n, f) => { ev[n] = f; } };
  const g = GP.createGamepad({ target, getPads: () => { log.calls++; return list(); }, mode: () => mode,
    onKeys: (k) => log.keys.push([...k].sort().join(',')), onEdge: (e) => log.edges.push([...e].sort().join(',')), onConnect: (i) => log.con.push(i), onDisconnect: (i) => log.dis.push(i) });
  return { g, ev, log }; }

test('pad type detection: DualSense / 054c -> PS glyphs, anything else -> Xbox', () => {
  assert.equal(GP.padKind('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'), 'ps');
  assert.equal(GP.padKind('054c-09cc-Wireless Controller'), 'ps');
  assert.equal(GP.padKind('Xbox Wireless Controller (Vendor: 045e)'), 'xbox');
  assert.equal(GP.padKind('8BitDo Pro 2'), 'xbox'); assert.equal(GP.padKind(undefined), 'xbox');
  assert.match(GP.padHints('ps'), /✕ A\/jump · ○ B\/back/); assert.match(GP.padHints('ps'), /OPTIONS START/);
  assert.match(GP.padHints('xbox'), /^A A\/jump · B B\/back/); assert.match(GP.padHints('xbox'), /MENU START/);
});

test('standard mapping onto the shell keys: south=A east=B west/north=C back=SELECT start=START d-pad', () => {
  const k = (on) => [...GP.padKeys(pad({ on }))].sort().join(',');
  assert.equal(k([0]), 'a'); assert.equal(k([1]), 'b'); assert.equal(k([2]), 'c'); assert.equal(k([3]), 'c');
  assert.equal(k([8]), 'back'); assert.equal(k([9]), 'start'); assert.equal(k([12, 14]), 'left,up'); assert.equal(k([13, 15]), 'down,right');
  assert.equal(k([4, 5, 6, 7, 10, 11, 16]), ''); // shoulders, triggers, stick clicks, home: unmapped
  assert.equal(GP.padKeys({ buttons: [0.9, 0.2], axes: [] }).has('a'), true); // numeric button values (older browsers)
});

test('left stick: dead zone 0.3, then the joystick module direction modes', () => {
  const k = (axes, mode) => [...GP.padKeys(pad({ axes }), mode)].sort().join(',');
  assert.equal(GP.DEADZONE, 0.3); assert.equal(k([0.29, 0], '8way'), ''); assert.equal(k([0.2, 0.2], '8way'), '');
  assert.equal(k([0.8, 0], '8way'), 'right'); assert.equal(k([-0.7, -0.7], '8way'), 'left,up'); assert.equal(k([0, 1], '4way'), 'down');
  assert.equal(k([-0.7, -0.75], '4way'), 'up'); assert.equal(k([0.1, -0.9], 'h'), ''); assert.equal(k([-0.9, 0.2], 'h'), 'left');
  assert.deepEqual(GP.stickAxes(NaN, 1), { x: null, y: null }); assert.equal(k([NaN, 1], '8way'), 'down', 'a broken axis reads as centred');
});

test('connect, poll, edges, hot-unplug; no getGamepads polling while no pad is connected', () => {
  let list = []; const { g, ev, log } = rig(() => list);
  const base = log.calls; for (let i = 0; i < 100; i++) assert.equal(g.poll(), null);
  assert.equal(log.calls, base, 'no pad -> poll() never calls getGamepads'); assert.equal(g.polls, 0);
  const p = pad({ id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)' }); list = [p];
  ev.gamepadconnected({ gamepad: p }); assert.equal(g.count, 1); assert.equal(log.con[0].kind, 'ps');
  ev.gamepadconnected({ gamepad: p }); assert.equal(log.con.length, 1, 'same pad twice -> one toast');
  g.poll(); assert.deepEqual(log.keys, [], 'idle pad -> nothing to report');
  p.buttons = btns([0]); g.poll(); g.poll(); assert.deepEqual(log.keys, ['a']); assert.deepEqual(log.edges, ['a']);
  p.axes = [1, 0, 0, 0]; g.poll(); assert.deepEqual(log.keys.at(-1), 'a,right'); assert.deepEqual(log.edges.at(-1), 'right');
  ev.gamepaddisconnected({ gamepad: p }); list = []; assert.equal(g.count, 0); assert.equal(log.keys.at(-1), '', 'unplug releases every held key');
  assert.equal(log.dis[0].kind, 'ps'); const c = log.calls; g.poll(); assert.equal(log.calls, c);
});

test('two pads merge; a pad present before load is picked up', () => {
  const a = pad({ index: 0, on: [0] }), b = pad({ index: 1, id: 'Wireless Controller 054c', axes: [-1, 0] });
  const { g, log } = rig(() => [a, b]); assert.equal(g.count, 2); assert.deepEqual(log.con.map((i) => i.kind), ['xbox', 'ps']);
  g.poll(); assert.equal(log.keys.at(-1), 'a,left');
});

// Minimal DOM stubs so the real createInput (keyboard + touch + pad) runs under node.
function fakeDom() { const on = {}, target = () => ({ addEventListener: (n, f) => { (on[n] ||= []).push(f); } });
  const btn = (k) => ({ dataset: { k }, classList: { toggle() {} }, closest() { return this; } });
  globalThis.window = target(); globalThis.addEventListener = window.addEventListener; globalThis.removeEventListener = () => {};
  globalThis.document = { ...target(), getElementById: () => ({ querySelectorAll: () => [], addEventListener: () => {} }), elementFromPoint: (x) => (x < 100 ? btn('left') : btn('a')) };
  const fire = (n, e) => { for (const f of on[n] || []) f(e); };
  return { key: (type, code) => fire(type, { code, repeat: false, preventDefault() {}, target: { closest: () => null } }),
    touch: (type, list) => fire(type, { target: { closest: () => true }, preventDefault() {}, touches: list.map(([id, x]) => ({ identifier: id, clientX: x, clientY: 10 })) }) }; }

test('keyboard and touch keep working unchanged and mix with the pad', async () => {
  const dom = fakeDom(); const { createInput } = await import('../src/core/input.js?mix'); const I = createInput(window);
  dom.key('keydown', 'ArrowRight'); assert.ok(I.isDown('right')); assert.ok(I.hit('right')); I.frame();
  I.setPad(new Set(['a'])); assert.ok(I.isDown('a') && I.hit('a') && I.isDown('right'), 'pad A + keyboard right together');
  dom.touch('touchstart', [[1, 50]]); assert.ok(I.isDown('left'), 'touch d-pad works while pad + keyboard held');
  dom.touch('touchend', []); assert.ok(!I.isDown('left')); assert.ok(I.isDown('a'), 'lifting a finger does not drop the pad A');
  dom.touch('touchstart', [[2, 150]]); I.setPad(new Set()); assert.ok(I.isDown('a'), 'releasing pad A keeps the finger on A held');
  dom.touch('touchend', []); assert.ok(!I.isDown('a'));
  dom.key('keyup', 'ArrowRight'); assert.ok(!I.isDown('right')); I.frame();
  dom.key('keydown', 'Space'); assert.ok(I.hit('a')); dom.key('keyup', 'Space'); I.frame(); assert.ok(!I.any());
  I.setPad(new Set(['start'])); assert.ok(I.hit('start')); I.clear(); assert.ok(!I.isDown('start'));
});

test('wired into the shell: rAF poll, hot-plug events, toast, panel navigation, joystick knob', () => {
  const m = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), j = fs.readFileSync(new URL('../src/core/joystick.js', import.meta.url), 'utf8');
  assert.match(m, /A\.gamepad\?\.poll\(\);\n  while \(acc/); assert.match(m, /GPAD\.createGamepad\(\{ getPads: \(\) => navigator\.getGamepads/);
  assert.match(m, /target: window/); assert.match(m, /onKeys: \(k\) => input\.setPad\(k\)/); assert.match(m, /panelNav\(e\)/); assert.match(m, /#gp-toast/);
  assert.match(j, /show\(ax, ay\)/);
});
