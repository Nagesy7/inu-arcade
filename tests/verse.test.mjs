import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as V from '../src/core/verse.js';
const ORIGIN = 'https://inu-arcade.vercel.app', VR = V.VERSE;
const q = (o) => '?' + new URLSearchParams(o).toString();

test('verse contract v2: from=verse and from=inu-verse both count; district / spawn read; Scuffle defaults to arena / door-shiba-scuffle', () => {
  for (const from of ['verse', 'inu-verse']) assert.equal(V.readVerse(q({ from }), { origin: ORIGIN }).from, true);
  assert.equal(V.readVerse(q({ from: 'elsewhere' }), { origin: ORIGIN }).from, false);
  assert.equal(V.readVerse('', { origin: ORIGIN, referrer: VR + '/' }).from, true, 'a Verse referrer counts');
  assert.equal(V.readVerse('', { origin: ORIGIN, referrer: 'https://inu-verse-tawny.vercel.app.evil.example/' }).from, false, 'look-alike host does not');
  const v = V.readVerse(q({ from: 'verse', district: 'arena', spawn: 'door-shiba-scuffle' }), { origin: ORIGIN }); assert.equal(v.district, 'arena'); assert.equal(v.spawn, 'door-shiba-scuffle');
  const d = V.readVerse(q({ from: 'verse' }), { origin: ORIGIN, defaults: { district: 'arena', spawn: 'door-shiba-scuffle' } }); assert.equal(d.district, 'arena'); assert.equal(d.spawn, 'door-shiba-scuffle');
  assert.equal(V.readVerse('', { origin: ORIGIN, defaults: { district: 'arena', spawn: 'x' } }).spawn, '', 'defaults only when we came from the Verse');
  assert.equal(V.readVerse(q({ from: 'verse', spawn: 'door-<script>' }), { origin: ORIGIN }).spawn, 'door-script', 'ids are sanitised');
});

test('verse contract v2: return= allowlist is the Inu Verse origin or this Arcade origin only (no open redirects)', () => {
  const ok = [VR, VR + '/', VR + '/?spawn=door-shiba-scuffle&district=arena', ORIGIN + '/', '/', '/kibble-chomp?x=1'];
  for (const r of ok) assert.ok(V.safeReturn(r, ORIGIN), 'allowed: ' + r);
  const bad = ['https://evil.example/', 'https://inu-verse-tawny.vercel.app.evil.example/', 'https://evil.example/' + VR, '//evil.example/x', 'javascript:alert(1)', 'data:text/html,hi',
    'http://inu-verse-tawny.vercel.app/', 'https://user:pw@inu-verse-tawny.vercel.app/', 'https://inu-verse-tawny.vercel.app:444/', '\\\\evil.example', '/\\evil.example', 'https://inu-arcade.vercel.app@evil.example/', ''];
  for (const r of bad) assert.equal(V.safeReturn(r, ORIGIN), null, 'rejected: ' + r);
  const ret = VR + '/?spawn=door-shiba-scuffle&district=arena';
  assert.equal(V.returnUrl(V.readVerse(q({ from: 'verse', district: 'arena', spawn: 'door-shiba-scuffle', return: ret }), { origin: ORIGIN })), ret, '🏠 goes to return=');
  assert.equal(V.returnUrl(V.readVerse(q({ from: 'verse', spawn: 'door-shiba-scuffle', district: 'arena', return: 'https://evil.example/' }), { origin: ORIGIN })), VR + '/?spawn=door-shiba-scuffle&district=arena', 'bad return= falls back to the Verse door');
  assert.equal(V.returnUrl(V.readVerse('', { origin: ORIGIN })), VR + '/', 'no Verse params = Verse root');
  assert.equal(V.returnUrl(V.readVerse(q({ from: 'inu-verse', spawn: 'arcade' }), { origin: ORIGIN })), VR + '/?spawn=arcade', 'hall door keeps working');
});

test('verse contract v2: framed postMessage goes to the Verse origin only; nothing when top-level', () => {
  const sent = []; const parent = { postMessage: (d, o) => sent.push([d, o]) }; const w = { parent };
  assert.equal(V.post('inu-arcade:ready', { cabinetId: 'shiba-scuffle', embed: true }, w), true); assert.deepEqual(sent[0], [{ type: 'inu-arcade:ready', cabinetId: 'shiba-scuffle', embed: true }, VR]);
  const top = {}; top.parent = top; assert.equal(V.post('inu-arcade:exit', {}, top), false);
  assert.equal(sent.length, 1);
});

test('verse contract v2: the shared template wires ready on load, exit on 🏠, UX-only score at game over, allowlisted 🏠 url', () => {
  const m = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(m, /V\.post\('inu-arcade:ready', \{ cabinetId: routeId\(\) \|\| 'arcade', embed: true \}\)/);
  assert.match(m, /mountHome\?\.\(\{ url: \(\) => V\.returnUrl\(verseIn\(\)\), onLeave: \(url\) => V\.post\('inu-arcade:exit', \{ cabinetId: [^,]+, reason: 'home', url \}\)/);
  assert.match(m, /V\.post\('inu-arcade:score', \{ cabinetId: C\.id, score: C\.final, mode: C\.gmode, durationMs:/);
  assert.doesNotMatch(m, /postMessage\([^)]*'\*'\)/, 'never a wildcard target origin');
});
