// Gamepad API support (Bluetooth or USB PS5 DualSense / PS4 / Xbox / other "standard" pads), mapped onto the shell's
// existing virtual keys so every cabinet, the hall and the menus work unchanged:
//   south (✕ / A) = A, east (○ / B) = B, west (□ / X) or north (△ / Y) = C, back/share/view = SELECT, start/options/menu = START,
//   d-pad = d-pad, left stick = directions (dead zone 0.3) through the joystick module's per-cabinet direction modes.
// Hot-plug via gamepadconnected / gamepaddisconnected; poll() runs from the rAF loop but returns at once (no getGamepads
// call at all) while no pad is connected. Keyboard and touch are untouched: pad keys are held under their own ids.
import { stickDir } from './joystick.js';

export const DEADZONE = 0.3;
// W3C "standard" mapping button indices -> shell keys ('back' is the shell's SELECT button)
export const BTN = { 0: 'a', 1: 'b', 2: 'c', 3: 'c', 8: 'back', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right', 4: 'lb', 5: 'rb' };
export const KEYS = ['left', 'right', 'up', 'down', 'a', 'b', 'c', 'start', 'back', 'lb', 'rb']; // lb / rb (shoulders) only move the toolbar focus ring, never reach a cabinet
// PlayStation pads report "DualSense", "DualShock", "Wireless Controller" or Sony's USB vendor id 054c; everything else gets Xbox glyphs.
export const padKind = (id = '') => (/dualsense|dualshock|playstation|054c|sony/i.test(String(id)) ? 'ps' : 'xbox');
export const GLYPHS = {
  ps: { name: 'PS controller', a: '✕', b: '○', c: '□', back: 'SHARE', start: 'OPTIONS', lb: 'L1', rb: 'R1' },
  xbox: { name: 'Xbox controller', a: 'A', b: 'B', c: 'X', back: 'VIEW', start: 'MENU', lb: 'LB', rb: 'RB' },
};
// Short button hints for the toast, using the detected pad's glyphs.
export function padHints(kind) { const g = GLYPHS[kind] || GLYPHS.xbox;
  return `${g.a} A/jump · ${g.b} B/back · ${g.c} C · ${g.start} START/pause · ${g.back} SELECT/exit · ${g.lb}/${g.rb} toolbar`; }

const pressed = (b) => !!b && (typeof b === 'object' ? b.pressed || b.value > 0.5 : b > 0.5);
// One pad -> Set of shell keys. mode = joystick direction mode ('4way' | 'h' | '8way').
export function padKeys(gp, mode = '8way', dead = DEADZONE) {
  const out = new Set(); if (!gp || gp.connected === false) return out;
  const bs = gp.buttons || []; for (const i in BTN) if (pressed(bs[i])) out.add(BTN[i]);
  const ax = +(gp.axes?.[0] || 0), ay = +(gp.axes?.[1] || 0), d = stickAxes(ax, ay, mode, dead);
  if (d.x) out.add(d.x); if (d.y) out.add(d.y); return out;
}
// Left stick -> { x, y } directions via the joystick module (same 4-way / horizontal / 8-way rules as the touch stick).
export function stickAxes(ax, ay, mode = '8way', dead = DEADZONE) {
  if (!Number.isFinite(ax) || !Number.isFinite(ay) || Math.hypot(ax, ay) < dead) return { x: null, y: null };
  return stickDir(ax, ay, mode, 1, dead);
}

// getPads() -> navigator.getGamepads() result; onKeys(set) when the merged held keys change; onEdge(set) with keys newly
// pressed this poll (used for menu navigation); onConnect / onDisconnect({ id, index, kind }); mode() -> stick mode;
// joy (optional) = the on-screen stick, whose knob mirrors the left stick while it is visible.
export function createGamepad({ getPads, onKeys, onEdge, onConnect, onDisconnect, mode = () => '8way', joy = () => null, target } = {}) {
  const pads = new Map(); let last = '', lastSet = new Set(), knob = '';
  const S = { pads, get count() { return pads.size; }, polls: 0,
    connect(gp) { if (!gp || pads.has(gp.index)) return; const info = { id: String(gp.id || ''), index: gp.index, kind: padKind(gp.id) }; pads.set(gp.index, info); onConnect?.(info); },
    disconnect(gp) { const info = pads.get(gp?.index); if (!info) return; pads.delete(gp.index); if (!pads.size) S.release(); onDisconnect?.(info); },
    release() { if (last) { last = ''; lastSet = new Set(); onKeys?.(lastSet); } if (knob) { knob = ''; joy()?.release?.(); } },
    poll() { if (!pads.size) return null; S.polls++; // no pads -> no work at all
      let list; try { list = getPads?.() || []; } catch { list = []; }
      const keys = new Set(), m = mode(); let ax = 0, ay = 0;
      for (const gp of list) { if (!gp || !pads.has(gp.index)) continue; for (const k of padKeys(gp, m)) keys.add(k);
        const x = +(gp.axes?.[0] || 0), y = +(gp.axes?.[1] || 0); if (Math.hypot(x, y) > Math.hypot(ax, ay)) { ax = x; ay = y; } }
      const sig = KEYS.filter((k) => keys.has(k)).join(','); if (sig !== last) { const edge = new Set([...keys].filter((k) => !lastSet.has(k))); last = sig; lastSet = keys; onKeys?.(keys); if (edge.size) onEdge?.(edge); }
      const j = joy(); if (j?.active && j.show) { const on = Math.hypot(ax, ay) >= DEADZONE, kk = on ? `${ax.toFixed(2)},${ay.toFixed(2)}` : ''; if (kk !== knob) { knob = kk; if (on) j.show(ax, ay); else j.release(); } }
      return keys; },
  };
  if (target?.addEventListener) {
    target.addEventListener('gamepadconnected', (e) => S.connect(e.gamepad));
    target.addEventListener('gamepaddisconnected', (e) => S.disconnect(e.gamepad));
  }
  try { for (const gp of getPads?.() || []) if (gp && gp.connected !== false) S.connect(gp); } catch {} // already plugged in before load
  return S;
}
