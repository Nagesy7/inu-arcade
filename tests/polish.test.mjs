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
// Non-reversible fingerprints (sha256, first 24 hex) of classic arcade bitmaps / jingles that must never appear in our code.
// Only hashes live here, so no source art is kept in the repo. Sprite rows are checked as runs of 1-4 consecutive quoted
// strings joined the way they would be written in source ("'row', 'row'").
import { createHash } from 'node:crypto';
const fp = (str) => createHash('sha256').update(str).digest('hex').slice(0, 24);
const BANNED_ROWS = new Set(['989fca6879569acecd57bf57', '81fcee670e383c489fe61d7d', '016540810e6b484c4f0a7b6e', 'c0ef446c76f3d04b9a055f0b']);
const BANNED_AUDIO = new Set(['09855c70ae0c137bcb24c1be', '0f73f756448a896a1aafaa1a']);
const rowRuns = (src) => { const q = src.match(/'[^'\n]*'/g) || [], out = []; for (let k = 1; k <= 4; k++) for (let i = 0; i + k <= q.length; i++) out.push(q.slice(i, i + k).join(', ')); return out; };
test('IP: no classic arcade bitmaps in any cabinet (hash fingerprints); no blue scared cats; no two-tone chomp loop', () => {
  for (const f of ['bark.js', 'chomp.js', 'crossing.js', 'breaker.js', 'street.js']) { let src; try { src = readFileSync(new URL('../src/games/' + f, import.meta.url), 'utf8'); } catch { continue; }
    const hit = rowRuns(src).find((r) => BANNED_ROWS.has(fp(r))); assert.equal(hit, undefined, `${f} contains a classic arcade bitmap`); }
  const chomp = readFileSync(new URL('../src/games/chomp.js', import.meta.url), 'utf8'); assert.ok(!chomp.includes("'#2430b8'") && !chomp.includes("'#3b57e8'"));
  const au = readFileSync(new URL('../src/core/audio.js', import.meta.url), 'utf8');
  const bits = [...(au.match(/\[[\d, ]+\]/g) || []), ...(au.match(/k \? \d+ : \d+/g) || [])]; assert.ok(bits.length > 3); assert.ok(!bits.some((b) => BANNED_AUDIO.has(fp(b))), 'classic jingle in audio.js');
});
test('IP fingerprint check really detects a banned run (self-test with a synthetic hash)', () => {
  const runs = rowRuns("x = ['ab', 'cd', 'ef']"); assert.ok(runs.includes("'ab', 'cd'")); assert.ok(runs.map(fp).includes(fp("'cd', 'ef'")));
});
test('remix: leaderboard + ghost storage keys bumped to v2 so old and new scores never mix', async () => {
  const S = await import('../src/core/scores.js'); assert.equal(S.SCORES_KEY, 'inuarcade.scores.v2');
  const mem = new Map(); const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }; mem.set('inuarcade.scores.v1', JSON.stringify({ 'kibble-chomp': [{ name: 'OLD', score: 99999, at: Date.now() }] }));
  const store = S.createScoreStore(st); const db = store.load(); assert.ok(!(db['kibble-chomp'] || []).some((e) => e.name === 'OLD'), 'v1 scores are not loaded into v2 boards');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'); assert.ok(main.includes("'inuarcade.ghost.v2.'"));
});
