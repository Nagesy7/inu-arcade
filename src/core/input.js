// Unified input: keyboard + on-screen touch pad (multi-touch, slide between buttons). Exposes held + edge-pressed keys.
// Keys: left right up down a (action/fire/jump) start back
// Desktop local 2P (co-op cabinets that opt in): Comma/Period/Slash = P2 A/B/C; once P2 joins (setP2(true)) the arrows move P2 and P1 keeps WASD.
const P2KEYS = { Comma: 'a', Period: 'b', Slash: 'c' }, P2ARROWS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'a', KeyZ: 'a', KeyJ: 'a', KeyX: 'b', KeyK: 'b', KeyC: 'b', KeyV: 'c', KeyL: 'c', Enter: 'start', Escape: 'back' };
export function createInput(root = document) {
  const held = new Set(), pressed = new Set(), touchHeld = new Map(); // pointerId -> key
  const down = (k) => { if (!held.has(k)) pressed.add(k); held.add(k); }, up = (k) => held.delete(k);
  const p2 = { on: false, held: new Set(), pressed: new Set() }, p2k = (e) => P2KEYS[e.code] || (p2.on && P2ARROWS[e.code]);
  root.addEventListener('keydown', (e) => { const q = p2k(e); if (q) { e.preventDefault(); if (!e.repeat) { if (!p2.held.has(q)) p2.pressed.add(q); p2.held.add(q); } return; }
    const k = KEYMAP[e.code]; if (!k) return; e.preventDefault(); if (!e.repeat) down(k); });
  root.addEventListener('keyup', (e) => { const q = p2k(e); if (q) { e.preventDefault(); p2.held.delete(q); return; } if (P2ARROWS[e.code]) p2.held.delete(P2ARROWS[e.code]); const k = KEYMAP[e.code]; if (k) { e.preventDefault(); up(k); } });
  window.addEventListener('blur', () => { held.clear(); p2.held.clear(); });
  const pad = document.getElementById('pad');
  const keyAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('[data-k]')?.dataset.k;
  const refresh = () => { const want = new Set(touchHeld.values()); for (const k of ['left', 'right', 'up', 'down', 'a', 'b', 'c', 'start', 'back']) { const el = pad?.querySelectorAll(`[data-k="${k}"]`); const on = want.has(k); el?.forEach((e) => e.classList.toggle('on', on)); } };
  const setTouch = (id, k) => { const prev = touchHeld.get(id); if (prev === k) return; touchHeld.delete(id); if (prev && ![...touchHeld.values()].includes(prev)) up(prev); if (k) { touchHeld.set(id, k); down(k); } refresh(); };
  const api = { joy: null }; const router = createTouchRouter({ setTouch, keyAt, ids: () => [...touchHeld.keys()], joy: () => api.joy });
  // Touch events (not pointer) so sliding a finger across buttons retargets, and multi-touch works on iOS.
  const onT = (e) => { if (!e.target.closest?.('#pad')) return; e.preventDefault(); router.update([...e.touches].map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }))); };
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) document.addEventListener(ev, onT, { passive: false });
  pad?.addEventListener('mousedown', (e) => { const k = e.target.closest('[data-k]')?.dataset.k; if (k) { setTouch('m', k); const u = () => { setTouch('m', null); removeEventListener('mouseup', u); }; addEventListener('mouseup', u); } });
  return { setJoystick: (j) => { api.joy = j; }, router,
    held, isDown: (k) => held.has(k), hit: (k) => pressed.has(k), any: () => pressed.size > 0,
    setP2(on) { if (p2.on === !!on) return; p2.on = !!on; p2.held.clear(); for (const k of ['left', 'right', 'up', 'down']) held.delete(k); },
    frame() { const p = new Set(pressed); pressed.clear(); p2.pressed.clear(); return p; }, // call once per tick, after game reads
    snapshot() { const h = (k) => held.has(k) || pressed.has(k), h2 = (k) => p2.held.has(k) || p2.pressed.has(k); return { left: h('left'), right: h('right'), up: h('up'), down: h('down'), a: h('a'), b: h('b'), c: h('c'), pressed: new Set(pressed),
      p2: { left: h2('left'), right: h2('right'), up: h2('up'), down: h2('down'), a: h2('a'), b: h2('b'), c: h2('c') } }; }, // a tap shorter than one frame still counts
    clear() { held.clear(); pressed.clear(); touchHeld.clear(); p2.held.clear(); p2.pressed.clear(); refresh(); },
  };
}

// Pure touch routing (testable without a DOM). touches: [{id, x, y}] = every finger currently down.
// Joystick OFF (joy() null or inactive): exactly the original behaviour, each finger holds the button under it.
// Joystick ON: a finger that lands on the stick drives it until lifted (one key per axis); every other finger keeps the
// button behaviour, so moving and A/fire work together.
export function createTouchRouter({ setTouch, keyAt, ids, joy }) {
  const stick = new Set(); // touch ids owned by the stick
  stick.owns = (id) => typeof id === 'string' && /^j[xy]/.test(id); // the stick's per-axis keys (released above)
  return { stick, update(touches) { const j = joy(), seen = new Set();
    for (const t of touches) { seen.add(t.id);
      if (j?.active && (stick.has(t.id) || (!ids().includes(t.id) && j.hit(t.x, t.y)))) { stick.add(t.id); const d = j.keys(t.x, t.y); setTouch('jx' + t.id, d.x); setTouch('jy' + t.id, d.y); }
      else setTouch(t.id, keyAt(t.x, t.y)); }
    for (const id of [...stick]) if (!seen.has(id)) { stick.delete(id); setTouch('jx' + id, null); setTouch('jy' + id, null); j?.release?.(); }
    for (const id of ids()) if (!stick.owns(id) && !seen.has(id)) setTouch(id, null); } };
}
