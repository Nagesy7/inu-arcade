// Free-play Inu wing: ten cabinets ported from the Rough Arcade prototypes.
// Local bests + the existing Bones caps. No prize-board rows, no $KIBBLE, no second stick, no capped green pillars, no round gold button.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Gust from '../src/games/gust.js';
import * as Dash from '../src/games/dash.js';
import * as Stack from '../src/games/stack.js';
import * as Hue from '../src/games/hue.js';
import * as Beat from '../src/games/beat.js';
import * as Fuse from '../src/games/fuse.js';
import * as Sky from '../src/games/sky.js';
import * as Rift from '../src/games/rift.js';
import * as Coil from '../src/games/coil.js';
import * as Spark from '../src/games/spark.js';
import { joyMode } from '../src/core/joystick.js';
import { FREE_IDS, PRIZE_IDS, addScore, board } from '../src/core/scores.js';
import * as EV from '../src/core/daily.js';
import * as FEED from '../src/core/feed.js';
import * as R from '../src/core/rewards.js';
import * as Crossing from '../src/games/crossing.js';
import * as Breaker from '../src/games/breaker.js';

const src = (f) => readFileSync(new URL('../src/games/' + f, import.meta.url), 'utf8');
const mainSrc = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const uiSrc = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const W1 = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const GAMES = [Gust, Dash, Stack, Hue, Beat, Fuse, Sky, Rift, Coil, Spark];

function mockCtx() {
  const ops = []; let fill = '#000', font = '', align = 'left';
  const ctx = {
    ops, canvas: {}, globalAlpha: 1, strokeStyle: '', lineWidth: 1, textBaseline: 'top',
    get fillStyle() { return fill; }, set fillStyle(v) { fill = v; ops.push(['style', v]); },
    get font() { return font; }, set font(v) { font = v; },
    get textAlign() { return align; }, set textAlign(v) { align = v; },
    fillRect(...a) { ops.push(['rect', fill, ...a]); }, fillText(...a) { ops.push(['text', ...a]); },
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, setTransform() {},
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, strokeRect() {}, fill() {},
  };
  return ctx;
}

test('free-play roster: ten new cabinets, Pup Crossing and Bone Breaker stay the lane and breaker games', () => {
  assert.deepEqual(GAMES.map((g) => g.META.id), FREE_IDS);
  for (const g of GAMES) {
    assert.equal(g.META.freePlay, true, g.META.id);
    assert.equal(g.META.buttons >= 1, true);
    assert.ok(g.W >= 200 && g.H >= 240 && g.H <= 320, g.META.id);
    const s = g.create(7, { inu: true });
    assert.equal(s.inu, true); assert.equal(s.over, false); assert.equal(s.joy, undefined, g.META.id + ' draws no second stick');
    g.step(s, 1 / 60, {}); g.draw(mockCtx(), s); assert.equal(typeof g.bot(s), 'object');
    assert.equal(joyMode(g.META.id, true), ['gust-glider', 'dash-line', 'sky-springs'].includes(g.META.id) ? 'h' : '4way');
  }
  assert.equal(Crossing.META.id, 'pup-crossing'); assert.equal(Breaker.META.id, 'bone-breaker');
  assert.ok(!FREE_IDS.includes('pup-crossing') && !FREE_IDS.includes('bone-breaker'));
  assert.equal(PRIZE_IDS.length, 9);
  assert.match(mainSrc, /if \(!C\.G\.META\.freePlay && w\?\.submitScore/);
  assert.match(uiSrc, /filter\(\(g\) => !GAMES\[g\]\.META\.freePlay\)/);
});

test('bones: new cabinets use the existing per-run and per-day caps, and local boards accept them', () => {
  const w = R.newWallet(), g = R.grant(w, 'gust-glider', 3000);
  assert.equal(g.bones, 25); assert.ok(g.bones <= R.RUN_BONE_CAP); assert.equal(g.tickets, 1);
  for (let i = 0; i < 20; i++) R.grant(w, 'coil', 99999);
  assert.equal(w.bones, R.DAILY_BONE_CAP);
  const db = {}; assert.ok(addScore(db, 'spark-factory', { name: 'inu', score: 50 }));
  assert.equal(board(db, 'spark-factory', 'all')[0].score, 50);
  assert.equal(addScore(db, 'not-a-cabinet', { name: 'inu', score: 1 }), null);
});

test('daily event and prize feed stay on the original nine', () => {
  const days = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
  for (const d of days) assert.ok(!FREE_IDS.includes(EV.dailyEvent(d).game), d);
  assert.equal(EV.dailyEvent('2026-11-03').game, 'street-sniffer');
  const f = FEED.parseFeed({ games: [
    { id: 'gust-glider', entries: [{ rank: 1, wallet: W1, score: 40 }] },
    { id: 'spark-factory', entries: [{ rank: 1, wallet: W1, score: 90 }] },
    { id: 'pup-crossing', entries: [{ rank: 1, wallet: W1, score: 12 }] },
  ] });
  assert.deepEqual(f.entries.map((e) => e.game), ['pup-crossing']);
});

test('gust glider: flap, gaps, towers are bone/kennel/timber, draw is not a capped green pillar', () => {
  assert.deepEqual(Gust.TOWER_KINDS, ['bone', 'kennel', 'timber']);
  assert.doesNotMatch(src('gust.js'), /flappy|pipe|2fbf71|26a35f/i);
  const s = Gust.create(1); Gust.step(s, 1 / 60, { a: true }); assert.ok(s.b.vy < -200);
  const gap = Gust.create(2); gap.towers = [{ x: gap.b.x - 40, gy: 40, gap: 120, done: false, got: false, kind: 'kennel', treat: false }];
  Gust.step(gap, 1 / 60, {}); assert.equal(gap.stats.gaps, 1); assert.equal(gap.score, 1);
  const hit = Gust.create(3); hit.b.y = 140; hit.towers = [{ x: hit.b.x - 4, gy: 30, gap: 40, done: false, got: false, kind: 'bone', treat: false }];
  Gust.step(hit, 1 / 60, {}); assert.equal(hit.over, true);
  const inu = Gust.create(4, { inu: true }); inu.b.y = 80; inu.towers = [{ x: inu.b.x - Gust.TW / 2, gy: 40, gap: 80, done: true, got: false, kind: 'timber', treat: true }];
  Gust.step(inu, 1 / 60, {}); assert.equal(inu.stats.bones, 1); assert.ok(inu.score >= 3);
  const seen = new Set(); const live = Gust.create(9); live.lives = 30;
  for (let i = 0; i < 500 && seen.size < 3; i++) { live.b.y = 100; live.b.vy = 0; Gust.step(live, 1 / 60, {}); for (const t of live.towers) seen.add(t.kind); }
  assert.deepEqual([...seen].sort(), ['bone', 'kennel', 'timber']);
  const ctx = mockCtx(); Gust.draw(ctx, live);
  const bad = ctx.ops.filter((o) => o[0] === 'style' && /2fbf71|26a35f|3dcc40/i.test(String(o[1])));
  assert.equal(bad.length, 0);
  assert.ok(ctx.ops.some((o) => o[0] === 'style' && Gust.TOWER_INK.includes(o[1])));
});

test('dash line: jump, double-jump, crate and creek', () => {
  const s = Dash.create(1); Dash.step(s, 1 / 60, { a: true }); assert.equal(s.p.jumps, 1); assert.ok(s.p.vy < 0);
  Dash.step(s, 1 / 60, {}); Dash.step(s, 1 / 60, { up: true }); assert.equal(s.p.jumps, 2);
  const hit = Dash.create(2); hit.p.y = Dash.GY; hit.obs = [{ type: 'block', x: Dash.PX, w: 20, h: 30 }];
  Dash.step(hit, 1 / 60, {}); assert.equal(hit.over, true);
  const fall = Dash.create(3); fall.p.y = Dash.GY - 2; fall.obs = [{ type: 'gap', x: Dash.PX - 10, w: 80 }];
  for (let i = 0; i < 90 && !fall.over; i++) Dash.step(fall, 1 / 60, {});
  assert.equal(fall.over, true);
  const inu = Dash.create(4, { inu: true }); inu.obs = [{ type: 'treat', x: Dash.PX, y: Dash.GY - 10, got: false }]; inu.p.y = Dash.GY;
  Dash.step(inu, 1 / 60, {}); assert.equal(inu.stats.treats, 1);
});

test('stack shift: perfect keeps the width, a miss ends a one-life run, bone glue on the third perfect', () => {
  const s = Stack.create(1); const top = s.stack[0]; s.cur.x = top.x - 1; s.cur.w = top.w;
  Stack.step(s, 1 / 60, { a: true }); assert.equal(s.stack.length, 2); assert.equal(s.stack[1].w, top.w); assert.equal(s.stats.perfects, 1);
  const miss = Stack.create(2); miss.cur.x = miss.stack[0].x + 180;
  Stack.step(miss, 1 / 60, { down: true }); assert.equal(miss.over, true); assert.equal(miss.stack.length, 1);
  const glue = Stack.create(3, { inu: true }); glue.stack[0].w = 80; glue.stack[0].x = 70;
  for (let n = 0; n < 3; n++) { const p = glue.stack[glue.stack.length - 1]; glue.cur.x = p.x; glue.cur.w = p.w; Stack.drop(glue); }
  assert.equal(glue.stats.glue, 1); assert.equal(glue.stack[glue.stack.length - 1].w, 88);
});

test('hue flood: colour spread, a clear, and running out of moves', () => {
  const a = Hue.create(8), b = Hue.create(8); assert.deepEqual(a.grid, b.grid);
  const s = Hue.create(2); const n = s.n; const lv = s.level;
  s.grid = Array(n * n).fill(1); s.grid[0] = 0; s.k = Math.max(s.k, 2); s.limit = 4; s.moves = 0; s.cur = 1;
  Hue.step(s, 1 / 60, { a: true }); assert.ok(s.score > 0); assert.equal(s.level, lv + 1); assert.equal(s.stats.clears, 1);
  const fail = Hue.create(3); const m = fail.n;
  fail.grid = Array(m * m).fill(0); fail.grid[m * m - 1] = 1; fail.k = 4; fail.limit = 1; fail.moves = 0; fail.cur = 2;
  Hue.step(fail, 1 / 60, { a: true }); assert.equal(fail.over, true);
  const hint = Hue.create(4, { inu: true }); assert.ok(hint.hint >= 0 && hint.hint < hint.k);
  assert.equal(Hue.create(4).hint, -1);
});

test('beat lanes: four directions, a timed hit, a miss, and the howl', () => {
  assert.deepEqual(Beat.LANE_KEY, ['left', 'down', 'up', 'right']);
  const s = Beat.create(1); s.song = 1; s.notes = [{ t: 1, l: 0, done: false }];
  Beat.step(s, 1 / 60, { left: true }); assert.ok(s.score >= 50); assert.equal(s.notes[0].done, true); assert.equal(s.stats.perfects >= 0, true);
  const miss = Beat.create(2); miss.song = 1; miss.hp = 1; miss.notes = [{ t: 0.2, l: 2, done: false }];
  Beat.step(miss, 1 / 60, {}); assert.equal(miss.over, true); assert.equal(miss.stats.misses, 1);
  const howl = Beat.create(3, { inu: true }); howl.song = 1; howl.howl = 0; howl.next = 99; howl.notes = [0, 1, 2, 3].map((l) => ({ t: 1, l, done: false }));
  Beat.step(howl, 1 / 60, { a: true }); assert.equal(howl.stats.howls, 1); assert.ok(howl.notes.every((n) => n.done)); assert.equal(howl.howl > 0, true);
});

test('tile fuse: matching tiles fuse, a stuck board ends the run, sniff does not spend the roll', () => {
  const s = Fuse.create(1); s.b = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  Fuse.step(s, 1 / 60, { left: true }); assert.equal(s.b[0], 4); assert.ok(s.score >= 4); assert.equal(s.stats.fuses, 1);
  const stuck = Fuse.create(2);
  stuck.b = [2, 4, 8, 16, 32, 64, 128, 256, 4, 8, 16, 32, 64, 128, 256, 512];
  assert.equal(Fuse.canMove(stuck), false);
  Fuse.step(stuck, 1 / 60, { right: true }); assert.equal(stuck.over, true);
  const sniff = Fuse.create(6, { inu: true }); const before = sniff.b.slice(); const r0 = sniff.rnd;
  Fuse.step(sniff, 1 / 60, {}); assert.equal(sniff.rnd, r0); assert.deepEqual(sniff.b, before); assert.equal(typeof sniff.hint, 'string');
});

test('sky springs: a landing bounces, steering wraps, falling off ends the run', () => {
  const s = Sky.create(1); s.p = { x: 100, y: 48, vy: 80, vx: 0 }; s.plats = [{ x: 70, y: 54, w: 60, t: 'n', dead: 0, dir: 1 }];
  Sky.step(s, 0.05, {}); assert.ok(s.stats.bounces >= 1); assert.ok(s.p.vy < 0);
  const steer = Sky.create(2); const x0 = steer.p.x; Sky.step(steer, 1 / 30, { right: true }); assert.ok(steer.p.x > x0);
  const fall = Sky.create(3); fall.p.y = fall.cam + Sky.H + 30; fall.p.vy = 40; fall.plats = [];
  Sky.step(fall, 1 / 60, {}); assert.equal(fall.over, true);
  const zoom = Sky.create(4, { inu: true }); zoom.p = { x: 100, y: 48, vy: 80, vx: 0 }; zoom.zoom = 0; zoom.plats = [{ x: 70, y: 54, w: 60, t: 'n', dead: 0, dir: 1 }];
  Sky.step(zoom, 0.05, { a: true }); assert.ok(zoom.zoom > 0);
});

test('rift runner: lanes, hop, duck, corner', () => {
  const s = Rift.create(1); Rift.step(s, 1 / 60, { left: true }); assert.equal(s.lane, -1);
  Rift.step(s, 1 / 60, {}); Rift.step(s, 1 / 60, { left: true }); assert.equal(s.lane, -1);
  Rift.step(s, 1 / 60, { right: true }); assert.equal(s.lane, 0);
  const hop = Rift.create(2); hop.objs = [{ z: 0.85, l: 0, t: 'low' }]; hop.jump = 0.4; hop.speed = 8;
  Rift.step(hop, 0.05, {}); assert.equal(hop.over, false);
  const trip = Rift.create(3); trip.objs = [{ z: 0.85, l: 0, t: 'low' }]; trip.jump = 0; trip.speed = 8;
  Rift.step(trip, 0.05, {}); assert.equal(trip.over, true);
  const turn = Rift.create(4); turn.turn = { z: 0.6, dir: 'right' }; turn.queued = 'right'; turn.speed = 10;
  Rift.step(turn, 0.05, {}); assert.equal(turn.stats.turns, 1); assert.equal(turn.turn, null);
  assert.doesNotMatch(src('rift.js'), /coin/i);
});

test('coil: tail moves, eats, nips itself, sheds, and has no on-screen stick', () => {
  assert.doesNotMatch(src('coil.js'), /dpad|d-pad|virtual joystick|joystick zone/i);
  const wall = Coil.create(1); wall.body = [[0, 8], [1, 8], [2, 8]]; wall.dir = 'left'; wall.q = []; wall.acc = wall.rate;
  Coil.step(wall, 0.02, {}); assert.equal(wall.over, true); assert.match(wall.why, /fence/);
  const eat = Coil.create(2); eat.body = [[5, 8], [4, 8], [3, 8]]; eat.dir = 'right'; eat.q = []; eat.food = [6, 8]; eat.acc = eat.rate;
  Coil.step(eat, 0.02, {}); assert.equal(eat.body.length, 4); assert.equal(eat.score, 1);
  const nip = Coil.create(3); nip.body = [[5, 8], [4, 8], [4, 7], [5, 7], [6, 7], [6, 8], [6, 9]]; nip.dir = 'right'; nip.q = []; nip.acc = nip.rate; nip.food = [0, 0];
  Coil.step(nip, 0.02, {}); assert.equal(nip.over, true); assert.match(nip.why, /tail/);
  const shed = Coil.create(4, { inu: true }); shed.body = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7]]; shed.acc = 0; shed.shed = 0;
  Coil.step(shed, 0.01, { a: true }); assert.equal(shed.body.length, 4); assert.equal(shed.stats.sheds, 1);
});

test('spark factory: paw bark, build, bell, and the button is not a round gold token', () => {
  assert.equal(Spark.BUTTON.kind, 'paw'); assert.equal(Spark.BUTTON.label, 'BARK');
  assert.doesNotMatch(src('spark.js'), /ffb800|ffd23f|coin/i);
  const s = Spark.create(1); Spark.step(s, 1 / 60, { a: true }); assert.equal(s.stats.barks, 1); assert.equal(s.bank, 1); assert.equal(Spark.perBark(s), 1);
  s.bank = 40; s.sel = 1; Spark.step(s, 1 / 60, { b: true }); assert.equal(s.own.mill, 1); assert.ok(s.bank < 40); assert.equal(s.stats.builds, 1);
  const poor = Spark.create(2); poor.sel = 4; Spark.step(poor, 1 / 60, { b: true }); assert.equal(poor.own.den, 0);
  const end = Spark.create(3); end.time = 0.01; Spark.step(end, 0.05, {}); assert.equal(end.over, true); assert.match(end.why, /shift over/);
  const ctx = mockCtx(); Spark.draw(ctx, s);
  assert.ok(ctx.ops.some((o) => o[0] === 'text' && o[1] === 'BARK'));
  const gold = ctx.ops.filter((o) => o[0] === 'rect' && /ffb800|ffd23f/i.test(String(o[1])) && o[3] > 20);
  assert.equal(gold.length, 0);
  assert.ok(ctx.ops.some((o) => o[0] === 'rect' && o[1] === '#f3c9a0'));
});
