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

import { readFileSync } from 'node:fs';
test('IP: invader sprites are not the classic arcade alien bitmaps; no blue frightened cats; no waka two-tone', () => {
  const inv = readFileSync(new URL('../src/games/invaders.js', import.meta.url), 'utf8');
  for (const row of ["'...11...', '..1111..', '.111111.', '11.11.11'", "'..1.....1..', '...1...1...', '..1111111..'", "'....1111....', '.1111111111.', '111111111111', '111..11..111'", "'.....111111.....'"]) assert.ok(!inv.includes(row), row);
  const chomp = readFileSync(new URL('../src/games/chomp.js', import.meta.url), 'utf8'); assert.ok(!chomp.includes("'#2430b8'") && !chomp.includes("'#3b57e8'"));
  const au = readFileSync(new URL('../src/core/audio.js', import.meta.url), 'utf8'); assert.ok(!au.includes('[98, 87, 78, 73]') && !au.includes("k ? 300 : 420"));
});
test('remix: leaderboard + ghost storage keys bumped to v2 so old and new scores never mix', async () => {
  const S = await import('../src/core/scores.js'); assert.equal(S.SCORES_KEY, 'inuarcade.scores.v2');
  const mem = new Map(); const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }; mem.set('inuarcade.scores.v1', JSON.stringify({ 'kibble-chomp': [{ name: 'OLD', score: 99999, at: Date.now() }] }));
  const store = S.createScoreStore(st); const db = store.load(); assert.ok(!(db['kibble-chomp'] || []).some((e) => e.name === 'OLD'), 'v1 scores are not loaded into v2 boards');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'); assert.ok(main.includes("'inuarcade.ghost.v2.'"));
});
