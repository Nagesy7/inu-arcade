import test from 'node:test'; import assert from 'node:assert/strict';
import { fitBox } from '../src/core/layout.js';
test('touch landscape: wide hub canvas stays clear of d-pad and right controls', () => {
  const b = fitBox(844, 390, 384, 216, true); const left = (844 - b.w) / 2 + b.off;
  assert.ok(left >= 172 - 1 && left + b.w <= 844 - 164 + 1, JSON.stringify(b)); assert.ok(b.h <= 390);
});
test('touch landscape: tall cabinet canvas still uses full height', () => { const b = fitBox(844, 390, 224, 288, true); assert.equal(b.off, 0); assert.ok(b.h >= 389); });
test('desktop: no gutters, integer-ish scale', () => { const b = fitBox(1280, 726, 384, 216, false); assert.equal(b.off, 0); assert.equal(b.w, 1152); });
test('audio mute persists and works before unlock', async () => {
  const store = new Map(); globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const a = await import('../src/core/audio.js?m'); a.setMuted(true); assert.equal(a.isMuted(), true); assert.equal(store.get('inuarcade.mute'), '1');
  a.setMuted(false); assert.equal(store.get('inuarcade.mute'), '0'); assert.equal(a.audioState(), 'none'); a.sfx('blip');
});
