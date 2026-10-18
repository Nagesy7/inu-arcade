import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../src/games/pip.js';
import { joyMode } from '../src/core/joystick.js';
import { encode, decode, toMask, fromMask } from '../src/core/meta.js';
const F = 1 / 60;
const run = (s, n, inp = {}) => { for (let i = 0; i < n && !s.over; i++) G.step(s, F, inp); };
const tap = (s, k, extra = {}) => { run(s, 1, { ...extra, [k]: true }); run(s, 1, extra); };
// a live stage with nobody else in it, so each rule can be tested on its own
function quiet(stage = 0, opts = {}) { const s = G.create(1, opts); s.stage = stage; G.loadStage(s); s.ready = 0; s.enemies = []; s.traps = []; s.lives = 3; run(s, 2); return s; }
const ground = (s) => { let n = 0; while (!s.p.onG && n++ < 120) run(s, 1); return s; };

test("pip's big bark: name lives in one constant; META / size / three buttons / 8-way stick", () => {
  assert.equal(G.NAME, "Pip's Big Bark"); assert.equal(G.META.id, 'pips-big-bark'); assert.equal(G.W, 256); assert.equal(G.H, 256); assert.equal(G.META.buttons, 3);
  for (const k of ['blurb', 'controls', 'inuMove', 'classicNote']) assert.ok(G.META[k]);
  const src = readFileSync(new URL('../src/games/pip.js', import.meta.url), 'utf8'); assert.equal(src.match(/"Pip's Big Bark"/g).length, 1);
  assert.match(readFileSync(new URL('../scripts/build-pages.mjs', import.meta.url), 'utf8'), /Pip\.NAME/);
  assert.equal(joyMode('pips-big-bark', true), '8way');
});

test("pip's big bark: six original stages in spec order, five bosses + one mini-boss, Grey Cat Boss last", () => {
  assert.deepEqual(G.STAGES.map((s) => s.name), ['PLAZA ROOFTOPS', 'HANAMI PARK', 'BISCUIT BEACH', 'PAWPRINT SHRINE ISLE', 'KIBBLE MINES', 'SYNDICATE TOWER']);
  assert.deepEqual(G.STAGES.map((s) => s.boss), ['scooter', 'vac', 'croc', 'fox', 'mole', 'claw']);
  assert.equal(Object.values(G.BOSSES).filter((b) => b.mini).length, 1); assert.equal(G.BOSSES.vac.mini, true);
  assert.equal(G.BOSSES.claw.name, 'GREY CAT BOSS'); assert.equal(G.BOSSES.scooter.name, 'SIR WHISKERTON');
  assert.ok(G.STAGES[1].storm && G.STAGES[2].tide); assert.ok(G.LEVELS[3].grid.some((r) => r.includes('L')), 'lantern climb'); assert.ok(G.LEVELS[4].carts.length >= 2, 'minecarts'); assert.ok(G.LEVELS[5].tower, 'vertical climb');
  for (const L of G.LEVELS) { assert.ok(L.arena && L.wps.length > 5 && L.items.length > 20 && L.cages.length >= 2); for (const r of L.grid) assert.equal(r.length, L.cols); }
});

test("pip's big bark: whole-pixel running; tail-wag double jump goes higher; scarf glide falls slower", () => {
  const s = ground(quiet()); const x0 = s.p.x; run(s, 30, { right: true }); assert.ok(Number.isInteger(s.p.x) && s.p.x > x0 + 30);
  const peak = (wag) => { const t = ground(quiet()); const y0 = t.p.y; let top = y0; t.p.x = 120; run(t, 1, { a: true });
    for (let i = 0; i < 90; i++) { const a = i < 40; G.step(t, F, { a: wag && i === 18 ? false : a, ...(wag && i === 20 ? { a: true } : {}) }); top = Math.min(top, t.p.y); } return y0 - top; };
  assert.ok(peak(true) > peak(false) + 12, `wag ${peak(true)} > single ${peak(false)}`);
  const g = ground(quiet()); run(g, 1, { a: true }); run(g, 16, { a: true }); run(g, 2); run(g, 1, { a: true }); run(g, 30, { a: true }); assert.ok(g.p.wag);
  if (!g.p.onG) { assert.ok(g.p.glide && g.p.vy <= G.PHYS.glide + 1e-9, 'gliding'); }
});

test("pip's big bark: tap B yips (stuns in the row); hold + release B = Big Bark", () => {
  const s = ground(quiet()); s.p.face = 1; const e = G.makeEnemy(s, 'rug', s.p.x + 50, s.p.y); s.enemies.push(e); e.vx = 0;
  tap(s, 'b'); assert.equal(s.stats.yips, 1); run(s, 20); assert.ok(e.stun > 0 || e.gone, 'yip stuns');
  const t = ground(quiet()); run(t, G.BARK.charge + 2, { b: true }); run(t, 2); assert.equal(t.stats.bigBarks, 1);
});

test("pip's big bark: Bone-erang flies out, curves back, collects pickups on the way and is caught", () => {
  const s = ground(quiet()); s.p.face = 1; s.items = [{ kind: 'kibble', x: s.p.x + 40, y: s.p.y - 9 }]; const sc = s.score;
  tap(s, 'c'); assert.equal(s.stats.booms, 1); assert.ok(s.bone); let far = 0; for (let i = 0; i < 200 && s.bone; i++) { run(s, 1); if (s.bone) far = Math.max(far, s.bone.x - s.p.x); }
  assert.ok(far > 40, 'flew out'); assert.equal(s.bone, null, 'caught / done'); assert.ok(s.items[0].got && s.score > sc, 'collected by the bone');
});

test("pip's big bark: hold DOWN to Sniff reveals hidden bones and treats nearby", () => {
  const s = ground(quiet()); const it = { kind: 'bone', x: s.p.x + 60, y: s.p.y - 20, hidden: true }; s.items = [it];
  run(s, G.SNIFF.hold + 4, { down: true }); assert.ok(s.p.sniffT > 0); assert.equal(it.hidden, false); assert.equal(s.stats.sniffs, 1);
});

test("pip's big bark: Zoomies meter fills from kibble; UP when full = Zoomies with wall bounces", () => {
  const s = ground(quiet()); s.items = []; for (let i = 0; i < 20; i++) s.items.push({ kind: 'kibble', x: s.p.x, y: s.p.y - 7 }); run(s, 2); assert.equal(s.p.zoom, G.ZOOM.full);
  tap(s, 'up'); assert.ok(s.p.zoomT > 0 && s.p.zoom === 0); assert.equal(s.stats.zooms, 1);
  s.p.face = -1; s.p.x = 40; run(s, 30); assert.ok(s.stats.bounces >= 1, 'bounced off the stage edge wall');
});

test("pip's big bark: rescued pups follow; a hit sends one home instead of costing a life", () => {
  const s = ground(quiet()); const c = s.cages[0]; s.p.x = c.x; s.p.y = c.y; run(s, 2); assert.equal(s.pack.length, 1); assert.equal(s.stats.rescues, 1);
  const L = s.lives; s.p.inv = 0; G.hurtPlayer(s, s.p.x - 10); assert.equal(s.pack.length, 0); assert.equal(s.lives, L); assert.equal(s.stats.sentHome, 1);
  s.p.inv = 0; G.hurtPlayer(s, s.p.x - 10); assert.equal(s.lives, L - 1); assert.equal(s.lastDeath, 'hit');
});

test("pip's big bark: the level timer runs out = TIME UP", () => {
  const s = quiet(); s.timer = 2; run(s, 3); assert.equal(s.lastDeath, 'time'); assert.ok(s.dying > 0);
});

test("pip's big bark: Inu Mode has $KIBBLE coins; with 2+ pups a Big Bark becomes the Pack Howl", () => {
  const s = ground(quiet(0, { inu: true })); assert.ok(s.items.some((i) => i.kind === 'coin')); s.pack = ['fetch', 'warn'];
  run(s, G.BARK.charge + 2, { b: true }); run(s, 2); assert.equal(s.stats.howls, 1);
  const c = ground(quiet()); assert.ok(!c.items.some((i) => i.kind === 'coin'), 'Classic has no coins');
});

test("pip's big bark: deterministic; the bot clears Plaza Rooftops and beats Sir Whiskerton", () => {
  const go = () => { const s = G.create(7, {}); s.lives = 9; let f = 0; while (s.stage === 0 && f++ < 60 * 240 && !s.over) G.step(s, F, G.bot(s)); return s; };
  const a = go(), b = go(); assert.equal(a.stage, 1, 'reached stage 2'); assert.equal(a.score, b.score); assert.equal(a.stats.bosses ?? 1, b.stats.bosses ?? 1);
});

test("pip's big bark: scarf skins are cosmetic only (same run with or without)", () => {
  const go = (sk) => { const s = G.applySkin(G.create(3, {}), sk); for (let f = 0; f < 3600 && !s.over; f++) G.step(s, F, G.bot(s)); return [s.score, s.p.x, s.p.y, s.lives]; };
  assert.equal(G.applySkin(G.create(1, {}), ['gold']).skin, 'gold'); assert.deepEqual(go([]), go(['gold'])); assert.deepEqual(go(['neon']), go([]));
});

test("pip's big bark: ghost tape keeps the C button (masks >= 36 encode safely)", () => {
  const m = [toMask({ right: true, c: true }), toMask({ a: true, b: true, c: true, left: true }), 0, toMask({ b: true })]; const ms = []; for (const x of m) for (let i = 0; i < 5; i++) ms.push(x);
  assert.deepEqual(decode(encode(ms)), ms); assert.equal(fromMask(m[0]).c, true);
});
