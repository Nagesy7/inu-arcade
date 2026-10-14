// Unified input: keyboard + on-screen touch pad (multi-touch, slide between buttons). Exposes held + edge-pressed keys.
// Keys: left right up down a (action/fire/jump) start back
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'a', KeyZ: 'a', KeyJ: 'a', KeyX: 'a', Enter: 'start', Escape: 'back' };
export function createInput(root = document) {
  const held = new Set(), pressed = new Set(), touchHeld = new Map(); // pointerId -> key
  const down = (k) => { if (!held.has(k)) pressed.add(k); held.add(k); }, up = (k) => held.delete(k);
  root.addEventListener('keydown', (e) => { const k = KEYMAP[e.code]; if (!k) return; e.preventDefault(); if (!e.repeat) down(k); });
  root.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) { e.preventDefault(); up(k); } });
  window.addEventListener('blur', () => held.clear());
  const pad = document.getElementById('pad');
  const keyAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('[data-k]')?.dataset.k;
  const refresh = () => { const want = new Set(touchHeld.values()); for (const k of ['left', 'right', 'up', 'down', 'a', 'start', 'back']) { const el = pad?.querySelectorAll(`[data-k="${k}"]`); const on = want.has(k); el?.forEach((e) => e.classList.toggle('on', on)); } };
  const setTouch = (id, k) => { const prev = touchHeld.get(id); if (prev === k) return; touchHeld.delete(id); if (prev && ![...touchHeld.values()].includes(prev)) up(prev); if (k) { touchHeld.set(id, k); down(k); } refresh(); };
  // Touch events (not pointer) so sliding a finger across buttons retargets, and multi-touch works on iOS.
  const onT = (e) => { if (!e.target.closest?.('#pad')) return; e.preventDefault(); const seen = new Set();
    for (const t of e.touches) { seen.add(t.identifier); setTouch(t.identifier, keyAt(t.clientX, t.clientY)); }
    for (const id of [...touchHeld.keys()]) if (!seen.has(id)) setTouch(id, null); };
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) document.addEventListener(ev, onT, { passive: false });
  pad?.addEventListener('mousedown', (e) => { const k = e.target.closest('[data-k]')?.dataset.k; if (k) { setTouch('m', k); const u = () => { setTouch('m', null); removeEventListener('mouseup', u); }; addEventListener('mouseup', u); } });
  return {
    held, isDown: (k) => held.has(k), hit: (k) => pressed.has(k), any: () => pressed.size > 0,
    frame() { const p = new Set(pressed); pressed.clear(); return p; }, // call once per tick, after game reads
    snapshot() { const h = (k) => held.has(k) || pressed.has(k); return { left: h('left'), right: h('right'), up: h('up'), down: h('down'), a: h('a'), pressed: new Set(pressed) }; }, // a tap shorter than one frame still counts
    clear() { held.clear(); pressed.clear(); touchHeld.clear(); refresh(); },
  };
}
