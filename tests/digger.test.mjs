import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../src/games/digger.js';
import { joyMode, JOY_MODES } from '../src/core/joystick.js';
const F = 1 / 60;
// a live yard with every pest parked, so each rule can be tested on its own
function quiet(opts) { const s = G.create(1, opts); s.ready = 0; for (const e of s.enemies) e.wait = 1e9; return s; }
const run = (s, n, inp = {}) => { for (let i = 0; i < n && !s.over; i++) G.step(s, F, inp); };
const tap = (s, k) => { run(s, 1, { [k]: true }); run(s, 1, {}); };
const place = (s, e, c, r) => { e.x = c * 16 + 8; e.y = r * 16 + 8; e.wait = 0; e.mode = 'walk'; };

test('bone digger: name lives in one constant; META / size', () => {
  assert.equal(G.NAME, 'Bone Digger'); assert.equal(G.META.title, G.NAME.toUpperCase()); assert.equal(G.META.id, 'bone-digger'); assert.equal(G.W, 256); assert.equal(G.H, 256);
  for (const k of ['blurb', 'controls', 'inuMove', 'classicNote']) assert.ok(G.META[k]);
  const src = readFileSync(new URL('../src/games/digger.js', import.meta.url), 'utf8'); assert.equal(src.match(/'Bone Digger'/g).length, 1);
  assert.match(readFileSync(new URL('../scripts/build-pages.mjs', import.meta.url), 'utf8'), /Digger\.NAME/);
});

test('bone digger: 4 original yards, 13x16, each with bones, boulders and dens of every listed pest', () => {
  assert.equal(G.YARDS.length, 4); assert.equal(new Set(G.YARDS.map((y) => y.name)).size, 4);
  for (const y of G.YARDS) { assert.equal(y.rows.length, G.ROWS); for (const r of y.rows) assert.equal(r.length, G.COLS); assert.equal(y.rows[0].trim(), '', 'lawn row open');
    const all = y.rows.join(''); assert.ok((all.match(/B/g) || []).length >= 5); assert.ok((all.match(/R/g) || []).length >= 4); for (const d of 'MS') assert.ok(all.includes(d)); }
  assert.ok(G.YARDS.slice(1).every((y) => y.rows.join('').includes('E')), 'beetles from yard 2');
});

test('bone digger: four soil layers, deeper is slower to dig and pays more', () => {
  assert.deepEqual(G.LAYERS.map((l) => l.name), ['LOAM', 'CLAY', 'SHALE', 'CRYSTAL']);
  for (let i = 1; i < 4; i++) { assert.ok(G.LAYERS[i].dig < G.LAYERS[i - 1].dig); assert.ok(G.LAYERS[i].pop > G.LAYERS[i - 1].pop); }
  assert.equal(G.layerOf(0), -1); assert.equal(G.layerOf(1), 0); assert.equal(G.layerOf(12), 3);
});

test('bone digger: moving carves tunnel; whole-pixel movement; soil is slower than tunnel', () => {
  const s = quiet(); const y0 = s.p.y; assert.equal(G.cellOpen(s, 7, 1), false); run(s, 40, { down: true });
  assert.ok(Number.isInteger(s.p.y) && s.p.y > y0); assert.ok(G.cellOpen(s, 7, 1), 'carved');
  const a = s.p.y; run(s, 30, { down: true }); const down = s.p.y - a; run(s, 30, { up: true }); const up = a + down - s.p.y;
  assert.ok(down < up, `digging soil (${down}px) is slower than walking the open tunnel (${up}px)`); assert.ok(s.score > 0, 'new cells pay dig points');
});

test('bone digger: turns wait for the lane (auto-align), no diagonal drift', () => {
  const s = quiet(); run(s, 12, { down: true }); const x = s.p.x; let n = 0;
  while ((s.p.y - 8) % 16 !== 0 && n++ < 60) { run(s, 1, { right: true }); assert.equal(s.p.x, x, 'no sideways move between lanes'); }
  run(s, 20, { right: true }); assert.ok(s.p.x > x, 'turns once on the lane'); assert.equal((s.p.y - 8) % 16, 0);
});

test('bone digger: bark pump travels only down open tunnel; 3 hits pop a pest in yard 1 (4 later), points by layer', () => {
  const s = quiet(); const e = s.enemies[0]; G.carve(s, 0, 16 * 5, 256, 16 * 6); s.p.x = 40; s.p.y = 5 * 16 + 8; s.p.dir = 'right'; place(s, e, 4, 5); e.wait = 0; e.cd = 1e9;
  for (let i = 0; i < 3; i++) { tap(s, 'a'); run(s, 14); } assert.ok(e.dead, 'popped'); assert.equal(s.stats.pops, 1); assert.ok(s.score >= G.LAYERS[1].pop);
  const t = quiet(); t.level = 3; const f = t.enemies[0]; t.p.x = 40; t.p.y = 8; t.p.dir = 'right'; place(t, f, 4, 0); f.cd = 1e9; for (let i = 0; i < 3; i++) { tap(t, 'a'); run(t, 14); } assert.equal(f.dead, false); tap(t, 'a'); assert.ok(f.dead);
  const u = quiet(); const g = u.enemies[0]; u.p.x = 8 + 16 * 7; u.p.y = 8 + 16 * 3; G.carve(u, u.p.x - 6, u.p.y - 6, u.p.x + 6, u.p.y + 6); u.p.dir = 'right'; place(u, g, 9, 3); tap(u, 'a'); assert.equal(g.fuzz, 0, 'soil blocks the sound');
});

test('bone digger: a fluffed pest is harmless; a walking one is not', () => {
  const s = quiet(); const e = s.enemies[0]; place(s, e, 7, 0); e.mode = 'fluff'; e.fuzz = 1; e.fuzzT = 999; run(s, 5); assert.equal(s.dying, 0);
  e.mode = 'walk'; e.fuzz = 0; run(s, 2); assert.ok(s.dying > 0);
});

test('bone digger: dig under a boulder -> wobble warning -> drop -> crushes a pest for a bonus', () => {
  const s = quiet(); const k = s.rocks.find((r) => r.c === 13 && r.y === 24); const e = s.enemies[0];
  G.carve(s, 13 * 16 + 2, 16 + 2, 13 * 16 + 14, 16 * 5); s.p.x = 8; s.p.y = 8; place(s, e, 13, 3); e.cd = 1e9; e.wait = 1e9; e.mode = 'walk';
  run(s, 1); assert.equal(k.st, 'wobble'); run(s, 30); assert.equal(e.dead, false, 'warning first'); e.wait = 1e9; run(s, 120); assert.ok(e.dead && e.crushed); assert.equal(s.stats.crushes, 1); assert.ok(s.score >= G.PTS.crush[0]);
});

test('bone digger: snakes stay in tunnels and hiss before striking; moles tunnel through dirt; beetles phase', () => {
  const s = quiet(); const sn = s.enemies.find((e) => e.type === 'snake'); sn.wait = 0; sn.cd = 0; const before = s.dug.reduce((a, b) => a + b, 0); run(s, 600);
  assert.equal(s.dug.reduce((a, b) => a + b, 0), before, 'a snake never digs'); assert.ok(G.cellOpen(s, Math.round((sn.x - 8) / 16), Math.round((sn.y - 8) / 16)));
  const t = quiet(); const m = t.enemies.find((e) => e.type === 'mole'); m.wait = 0; m.cd = 0; const b2 = t.dug.reduce((a, b) => a + b, 0); run(t, 400); assert.ok(t.dug.reduce((a, b) => a + b, 0) > b2, 'a mole carves new tunnel');
  const u = G.create(1); u.level = 2; u.ready = 0; const be = G.makeEnemy(u, 'beetle', 3, 10); u.enemies = [be]; be.wait = 0; be.cd = 0; u.p.x = 8 + 16 * 3; u.p.y = 8 + 16 * 4; G.carve(u, u.p.x - 6, u.p.y - 6, u.p.x + 6, u.p.y + 6);
  G.carve(u, 0, 16 * 10 + 2, 256, 16 * 11 - 2); let seen = new Set(); for (let i = 0; i < 300; i++) { G.step(u, F, {}); seen.add(be.mode); } assert.ok(seen.has('shimmer') && seen.has('phase'), [...seen].join());
});

test('bone digger: collecting every bone clears the yard with a time bonus; level and layout progress', () => {
  const s = quiet(); for (const b of s.bones.slice(1)) b.got = true; const b = s.bones[0]; s.p.x = b.c * 16 + 8; s.p.y = b.r * 16 + 8; const sc = s.score; run(s, 2);
  assert.ok(s.score > sc + G.PTS.bone); run(s, 130); assert.equal(s.level, 2); assert.equal(s.yardName, G.YARDS[1].name); assert.ok(s.timer > 0);
});

test('bone digger: timer runs out -> HURRY (faster pests), not an instant death', () => {
  const s = quiet(); s.timer = 2; run(s, 3); assert.ok(s.hurry); assert.equal(s.lives, 3);
});

test('bone digger: Inu Mode Bone Boomerang + $KIBBLE coins; Classic has neither', () => {
  const s = quiet({ inu: true }); assert.equal(s.coins.length, G.COINS_PER_YARD); run(s, G.BOOM.charge + 2, { a: true }); run(s, 1, {}); assert.equal(s.stats.booms, 1); assert.ok(s.boom);
  const c = quiet(); assert.equal(c.coins.length, 0); run(c, G.BOOM.charge + 2, { a: true }); run(c, 1, {}); assert.equal(c.stats.booms, 0);
});

test('bone digger: the bot plays several yards in both modes without errors', () => {
  for (const inu of [false, true]) for (const seed of [1, 2]) { const s = G.create(seed, { inu }); for (let i = 0; i < 60 * 200 && !s.over; i++) G.step(s, F, G.bot(s)); assert.ok(s.level >= 3, `seed ${seed} reaches yard 3 (${s.level})`); assert.ok(s.score > 4000); }
});

test('bone digger: 4-way joystick while playing', () => { assert.equal(JOY_MODES['bone-digger'], '4way'); assert.equal(joyMode('bone-digger', true), '4way'); });
