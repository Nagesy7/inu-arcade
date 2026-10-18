import test from 'node:test'; import assert from 'node:assert/strict';
import { loadSettings, saveSettings, SETTINGS_KEY, stickDir, joyMode, DEAD, TRAVEL } from '../src/core/joystick.js';
import { createTouchRouter } from '../src/core/input.js';
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test('joystick setting is OFF by default (empty, missing, corrupt storage)', () => {
  assert.equal(loadSettings(mem()).joystick, false); assert.equal(loadSettings(null).joystick, false);
  const s = mem(); s.setItem(SETTINGS_KEY, '{nope'); assert.equal(loadSettings(s).joystick, false);
  s.setItem(SETTINGS_KEY, '{"joystick":"yes"}'); assert.equal(loadSettings(s).joystick, false, 'only a real true turns it on');
});
test('joystick setting persists under one shared key (all cabinets, cloud save key)', () => {
  const s = mem(); saveSettings(s, { joystick: true }); assert.equal(SETTINGS_KEY, 'inuarcade.settings.v1');
  assert.deepEqual(JSON.parse(s.getItem(SETTINGS_KEY)), { joystick: true }); assert.equal(loadSettings(s).joystick, true);
  saveSettings(s, { joystick: false }); assert.equal(loadSettings(s).joystick, false);
});
test('dead zone: small offsets give no direction in every mode', () => {
  const r = TRAVEL * DEAD - 0.5;
  for (const m of ['4way', 'h', '8way']) for (const [dx, dy] of [[r, 0], [0, -r], [-r * 0.7, r * 0.7], [0, 0]]) assert.deepEqual(stickDir(dx, dy, m), { x: null, y: null }, `${m} ${dx},${dy}`);
  assert.deepEqual(stickDir(TRAVEL * DEAD + 1, 0, '4way'), { x: 'right', y: null });
});
test('direction mapping: 4-way picks the dominant axis, horizontal ignores up/down, 8-way allows diagonals', () => {
  assert.deepEqual(stickDir(30, 10, '4way'), { x: 'right', y: null }); assert.deepEqual(stickDir(-5, -30, '4way'), { x: null, y: 'up' });
  assert.deepEqual(stickDir(8, 35, '4way'), { x: null, y: 'down' }); assert.deepEqual(stickDir(-30, 20, '4way'), { x: 'left', y: null });
  assert.deepEqual(stickDir(-30, -25, 'h'), { x: 'left', y: null }); assert.deepEqual(stickDir(3, -38, 'h'), { x: null, y: null }, 'straight up = nothing on a paddle');
  assert.deepEqual(stickDir(25, -25, '8way'), { x: 'right', y: 'up' }); assert.deepEqual(stickDir(-30, 2, '8way'), { x: 'left', y: null });
  assert.equal(joyMode('kibble-chomp', true), '4way'); assert.equal(joyMode('pup-crossing', true), '4way');
  assert.equal(joyMode('bark-invaders', true), 'h'); assert.equal(joyMode('bone-breaker', true), 'h');
  assert.equal(joyMode('bone-breaker', false), '4way', 'menus keep up/down'); assert.equal(joyMode(null, false), '8way');
});
function rig(joyOn) {
  const held = new Map(), log = []; const setTouch = (id, k) => { const p = held.get(id); if (p === k) return; held.delete(id); if (k) held.set(id, k); log.push([id, k]); };
  const keyAt = (x, y) => (x > 700 ? 'a' : x < 160 && y > 220 ? (x < 60 ? 'left' : x > 110 ? 'right' : y < 260 ? 'up' : 'down') : undefined);
  const joy = { active: joyOn, hit: (x, y) => x < 160 && y > 220, keys: (x, y) => stickDir(x - 87, y - 300, '4way'), release() {} };
  const r = createTouchRouter({ setTouch, keyAt, ids: () => [...held.keys()], joy: () => joy });
  return { r, keys: () => new Set(held.values()), held };
}
test('multi-touch: stick move + A fire at the same time, release independently', () => {
  const { r, keys } = rig(true);
  r.update([{ id: 1, x: 87, y: 300 }]); assert.deepEqual([...keys()], [], 'thumb on the centre = dead zone');
  r.update([{ id: 1, x: 125, y: 305 }]); assert.deepEqual([...keys()], ['right']);
  r.update([{ id: 1, x: 126, y: 305 }, { id: 2, x: 760, y: 300 }]); assert.deepEqual([...keys()].sort(), ['a', 'right'], 'move + fire together');
  r.update([{ id: 1, x: 87, y: 260 }, { id: 2, x: 760, y: 300 }]); assert.deepEqual([...keys()].sort(), ['a', 'up']);
  r.update([{ id: 2, x: 760, y: 300 }]); assert.deepEqual([...keys()], ['a'], 'lifting the thumb releases only the direction');
  r.update([{ id: 1, x: 125, y: 300 }]); assert.deepEqual([...keys()], ['right'], 'fire released, stick still works');
  r.update([]); assert.deepEqual([...keys()], []);
});
test('stick keeps its finger even when it slides far off the base; joystick OFF = original button routing', () => {
  const on = rig(true); on.r.update([{ id: 5, x: 87, y: 300 }]); on.r.update([{ id: 5, x: 400, y: 300 }]); assert.deepEqual([...on.keys()], ['right']);
  const off = rig(false); off.r.update([{ id: 1, x: 30, y: 240 }, { id: 2, x: 760, y: 300 }]); assert.deepEqual([...off.keys()].sort(), ['a', 'left']);
  off.r.update([{ id: 1, x: 130, y: 240 }, { id: 2, x: 760, y: 300 }]); assert.deepEqual([...off.keys()].sort(), ['a', 'right'], 'slide between d-pad buttons still retargets');
  off.r.update([]); assert.deepEqual([...off.keys()], []);
});
