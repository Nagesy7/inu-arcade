// Arcade-accuracy tests: assert the rule tables and the behaviours they drive, for all four cabinets.
import test from 'node:test'; import assert from 'node:assert/strict';
import * as C from '../src/games/chomp.js'; import * as I from '../src/games/invaders.js'; import * as X from '../src/games/crossing.js'; import * as B from '../src/games/breaker.js';
const F = 1 / 60, run = (G, s, frames, f) => { for (let i = 0; i < frames && !s.over; i++) G.step(s, F, f ? f(s, i) : G.bot(s)); return s; };
// ===================== KIBBLE CHOMP =====================
test('chomp: native 224x288, 28x31 maze, 240 dots + 4 energizers, tunnel row wraps', () => {
  assert.equal(C.W, 224); assert.equal(C.H, 288); assert.equal(C.MAZE.length, 31); for (const r of C.MAZE) assert.equal(r.length, 28);
  const s = C.create(1); assert.equal(s.dots.size, 240); assert.equal(s.energizers.size, 4);
  assert.equal(C.isWall(-1, 14), false); assert.equal(C.isWall(28, 14), false); assert.equal(C.isWall(-1, 13), true);
  const q = [[14, 23]], seen = new Set(['14,23']); while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let nx = x + dx; const ny = y + dy; if (ny === 14) nx = (nx + 28) % 28; const k = nx + ',' + ny; if (!C.isWall(nx, ny) && !seen.has(k)) { seen.add(k); q.push([nx, ny]); } } }
  for (const k of [...s.dots, ...s.energizers]) assert.ok(seen.has(k), 'unreachable ' + k);
  s.ready = 0; s.cats.forEach((c) => (c.state = 'house')); s.pac.x = 4; s.pac.y = 14 * 8 + 4; s.pac.dir = 'left'; s.pac.want = 'left'; run(C, s, 20, () => ({ left: true })); assert.ok(s.pac.x > 200, 'wrapped to right side ' + s.pac.x);
});
test('chomp: original maze has no dead ends, no 2x2 open blocks, a mirrored layout, and a house + start', () => {
  const open = (x, y) => !C.isWall(x, y); let cells = 0;
  for (let y = 0; y < 31; y++) for (let x = 0; x < 28; x++) { if (!open(x, y)) continue; cells++; const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => open(x + dx, y + dy)).length; assert.ok(n >= 2, `dead end at ${x},${y}`); if (x < 27 && y < 30) assert.ok(!(open(x + 1, y) && open(x, y + 1) && open(x + 1, y + 1)), `2x2 open block at ${x},${y}`); }
  for (const r of C.MAZE) assert.equal(r, [...r].reverse().join(''), 'left-right symmetric');
  assert.ok(cells > 280 && cells < 360, 'corridor density ' + cells);
  assert.equal(C.MAZE[12].slice(13, 15), '--'); assert.ok(open(13, 23) && open(14, 23) && open(13, 11) && open(14, 11), 'pac + blinky start tiles open');
});
test('chomp: cats leave the house and keep chasing on the new maze (no stuck cats)', () => {
  const s = C.create(7); s.ready = 0; const seen = s.cats.map(() => new Set());
  for (let i = 0; i < 60 * 40; i++) { C.step(s, F, C.bot(s)); s.lives = 3; s.over = false; s.cats.forEach((c, j) => { if (c.state === 'out') seen[j].add(Math.floor(c.x / 8) + ',' + Math.floor(c.y / 8)); }); }
  seen.forEach((v, j) => assert.ok(v.size > 10, `cat ${j} roamed ${v.size} tiles`));
});
test('chomp: Inu speed curves ramp smoothly and level off; dinner bell rush near the end', () => {
  const a = C.speeds(1), b = C.speeds(5), z = C.speeds(30); assert.ok(a.pup < b.pup && b.pup <= z.pup && z.pup <= 0.97); assert.ok(a.cat < a.pup && z.cat <= 0.95 && z.cat < z.pup);
  assert.deepEqual(C.speeds(12), C.speeds(40), 'curves level off'); assert.ok(a.hedge < a.scared && a.scared < a.cat);
  const s = C.create(1); const k = s.cats[0]; k.state = 'out'; k.x = 112; k.y = 92; const base = C.catSpeed(s, k); while (C.dotsLeft(s) > Math.round(s.total * C.DINNER_BELL)) s.dots.delete([...s.dots][0]);
  assert.ok(C.dinnerBell(s)); assert.ok(Math.abs(C.catSpeed(s, k) - base - C.speeds(1).rush * 75.75757625 / 60) < 1e-9, 'every cat gets the rush');
  k.x = 20; k.y = 14 * 8 + 4; assert.ok(C.catSpeed(s, k) < base, 'hedge tunnel slowdown');
});
test('chomp: scared time shrinks per level but never hits zero; nap/prowl mood clock with shrinking naps', () => {
  assert.equal(C.scaredSecs(1), 8); assert.ok(C.scaredSecs(5) < C.scaredSecs(1)); assert.equal(C.scaredSecs(40), 1.5);
  const m1 = C.moodTable(1); assert.equal(m1.length, 8); assert.equal(m1[7], Infinity); assert.ok(m1[0] > m1[2] && m1[2] > m1[4], 'naps shrink'); assert.ok(C.moodTable(6)[0] < m1[0]);
  const s = C.create(1); s.ready = 0; s.pac.x = 1000; s.pac.y = 1000; let changed = -1; s.cats.forEach((c) => (c.state = 'house')); s.roundF = -1e9; s.sinceRelease = -1e9;
  for (let f = 1; f <= m1[0] * 60 + 2; f++) { C.step(s, F, {}); if (changed < 0 && s.phase === 1) changed = f; } assert.equal(changed, m1[0] * 60); assert.equal(C.scatterMode(s), false);
});
test('chomp: four original personalities (tracker, guard, flanker, moody) and in-maze nap beds', () => {
  const s = C.create(1); s.pac.x = 14 * 8 + 4; s.pac.y = 23 * 8 + 4; s.phase = 1; s.pac.dir = 'left';
  s.trail = Array.from({ length: 12 }, (_, i) => ({ x: i, y: 29 })); assert.deepEqual(C.catTarget(s, s.cats[0]), { x: 12 - 1 - C.TRAIL_LAG, y: 29 }, 'tracker follows the scent trail');
  assert.deepEqual(C.catTarget(s, s.cats[1]), { x: 26, y: 22 }, 'guard camps the nearest power bone'); s.energizers = new Set(['13,22']); assert.deepEqual(C.catTarget(s, s.cats[1]), { x: 14, y: 23 }, 'guard pounces when you are next to it');
  assert.deepEqual(C.catTarget(s, s.cats[2]), { x: 14, y: 18 }, 'flanker: 5 tiles off your right side (heading left)'); s.pac.dir = 'up'; assert.deepEqual(C.catTarget(s, s.cats[2]), { x: 19, y: 23 });
  s.roundF = 0; assert.deepEqual(C.catTarget(s, s.cats[3]), { x: 14, y: 23 }); s.roundF = C.MOODY_SWAP * 60; assert.ok(C.BEDS.some((b) => b.x === C.catTarget(s, s.cats[3]).x), 'moody wanders');
  s.phase = 0; s.cats.forEach((c, i) => assert.deepEqual(C.catTarget(s, c), C.BEDS[i])); for (const b of C.BEDS) assert.ok(!C.isWall(b.x, b.y), 'beds are inside the maze');
});
test('chomp: timed house release (faster each level) plus release after 12 kibble', () => {
  assert.deepEqual(C.releaseAt(1), [0, 4, 8, 12]); assert.deepEqual(C.releaseAt(2), [0, 2.2, 4.84, 7.92]); assert.ok(C.releaseAt(4)[3] < 9 && C.releaseAt(20)[3] >= 9 * 0.4 - 1e-9); assert.equal(C.RELEASE_DOTS, 12);
  const s = C.create(1); s.ready = 0; s.pac.x = 1000; C.step(s, F, {}); assert.equal(s.cats[1].state, 'house'); for (let i = 0; i < 4 * 60; i++) C.step(s, F, {}); assert.notEqual(s.cats[1].state, 'house', 'second cat out at 4s on level 1');
  assert.equal(s.cats[2].state, 'house'); s.sinceRelease = 12; C.step(s, F, {}); assert.notEqual(s.cats[2].state, 'house', '12 kibble also opens the door');
});
test('chomp: scared cats flee (no reversal tables); no tile quirks', () => {
  assert.equal(C.NO_UP, undefined); assert.equal(C.SPEED_TABLE, undefined); assert.equal(C.FRIGHT_TIME, undefined);
  const s = C.create(1); s.ready = 0; const c = s.cats[0]; s.frightF = 300; c.fright = true; c.x = 13 * 8 + 4; c.y = 11 * 8 + 4; s.pac.x = 6 * 8 + 4; s.pac.y = 11 * 8 + 4; const d0 = Math.abs(c.x - s.pac.x);
  for (let i = 0; i < 40; i++) { C.step(s, F, {}); s.pac.x = 6 * 8 + 4; s.pac.y = 11 * 8 + 4; } assert.ok(Math.hypot(c.x - s.pac.x, c.y - s.pac.y) > d0, 'moved away');
});
test('chomp: treats at 60 and 150 kibble with Inu values; 250/500/750/1000 cat combo; extra life at 8000', () => {
  assert.deepEqual(C.BONUS_DOTS, [60, 150]); assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 20].map((l) => C.bonusFor(l)[1]), [150, 250, 400, 600, 900, 1200, 1600, 2000, 2000]);
  assert.deepEqual(C.PTS.cats, [250, 500, 750, 1000]); assert.equal(C.PTS.extraLifeAt, 8000);
  const s = C.create(1); s.ready = 0; s.eaten = 59; s.pac.x = 13 * 8 + 4; s.pac.y = 23 * 8 + 4; s.pac.dir = 'left'; for (let i = 0; i < 10; i++) C.step(s, F, { left: true }); assert.equal(s.bonus?.pts, 150);
  const e = C.create(1); e.ready = 0; e.dots.clear(); e.frightF = 300; e.cats.forEach((c) => { c.state = 'out'; c.fright = true; c.x = e.pac.x - 4; c.y = e.pac.y; }); for (let i = 0; i < 4; i++) { C.step(e, F, {}); e.freeze = 0; } assert.equal(e.score, 250 + 500 + 750 + 1000);
  const x = C.create(1); x.ready = 0; x.score = 7995; x.pac.x = 13 * 8 + 4; x.pac.y = 23 * 8 + 4; x.pac.dir = 'left'; for (let i = 0; i < 10; i++) C.step(x, F, { left: true }); assert.equal(x.lives, 4);
});
test('chomp: touching a cat costs a life; bot can clear level 1 (comparable challenge)', () => {
  const s = C.create(1); s.ready = 0; const c = s.cats[0]; c.x = s.pac.x - 4; c.y = s.pac.y; C.step(s, F, {}); assert.equal(s.lives, 2);
  const b = run(C, C.create(3), 60 * 400); assert.ok(b.level >= 2, 'bot reached level ' + b.level);
});
test('chomp: cornering lets Pac cut corners; eats kibble without the old stall frames', () => {
  const s = C.create(1); s.ready = 0; s.cats.forEach((c) => (c.state = 'house')); s.roundF = -1e9; s.sinceRelease = -1e9;
  // at (6,5) junction approaching from the right; pre-turn before the centre moves diagonally
  s.pac.x = 4 * 8 + 4 + 3; s.pac.y = 5 * 8 + 4; s.pac.dir = 'left'; s.dots.clear(); s.energizers.clear(); s.energizers.add('0,0');
  C.step(s, F, { down: true }); C.step(s, F, { down: true }); assert.equal(s.pac.dir, 'down'); assert.ok(s.pac.y > 5 * 8 + 4 && s.pac.x < 4 * 8 + 4 + 3, 'moved diagonally');
  const t = C.create(1); t.ready = 0; t.pac.x = 13 * 8 + 4; t.pac.y = 23 * 8 + 4; t.pac.dir = 'left'; t.dots = new Set(['12,23']); for (let i = 0; i < 8; i++) C.step(t, F, { left: true }); assert.equal(t.pac.stall, 0); assert.equal(t.score, 10);
});
// ===================== BARK INVADERS =====================
test('invaders: 224x256 arrowhead fleet (5/7/9/11/11 = 43), Inu points, wave start heights', () => {
  assert.equal(I.W, 224); assert.equal(I.H, 256); const s = I.create(1); assert.equal(s.aliens.length, 43); assert.equal(I.FLEET, 43);
  assert.deepEqual(I.ROW_TYPE.map((t) => I.TYPE_PTS[t]), [40, 25, 25, 15, 15]); for (let r = 0; r < 5; r++) assert.equal(s.aliens.filter((a) => a.r === r).length, I.ROW_WIDTH[r]);
  assert.deepEqual([1, 2, 3, 6, 7].map(I.waveY), [128, 140, 152, 188, 128]); assert.equal(Math.max(...s.aliens.map((a) => a.y)), 128);
  assert.equal(I.PLUNGER_COLS, undefined); assert.equal(I.SQUIGGLY_COLS, undefined); assert.equal(I.MYSTERY_PTS, undefined);
});
test('invaders: whole fleet steps on a timer that shortens as it thins', () => {
  assert.equal(I.stepFrames(43), 40); assert.equal(I.stepFrames(1), 3); assert.ok(I.stepFrames(20) < I.stepFrames(30));
  const s = I.create(1); const x0 = s.aliens.map((a) => a.x); let f = 0; while (s.aliens[0].x === x0[0]) { I.marchOne(s); f++; } assert.equal(f, 40); assert.ok(s.aliens.every((a, i) => a.x - x0[i] === I.STEP_X), 'moves as one block');
  s.aliens.forEach((a, i) => (a.alive = i < 3)); const x1 = s.aliens[0].x; f = 0; while (s.aliens[0].x === x1) { I.marchOne(s); f++; } assert.ok(f <= 5, 'last few are fast: ' + f);
});
test('invaders: fleet drops 6px and reverses at the edge', () => {
  const s = I.create(1); s.aliens.forEach((a) => (a.x += 30)); const y0 = s.aliens[0].y; for (let i = 0; i < 40 * 3; i++) I.marchOne(s); assert.equal(s.aliens[0].y, y0 + I.STEP_DROP); assert.equal(s.dir, -1);
});
test('invaders: only one player shot on screen; must re-press to fire', () => {
  const s = I.create(1); s.ready = 0; I.step(s, F, { a: true }); assert.equal(s.shots, 1); for (let i = 0; i < 5; i++) I.step(s, F, { a: true }); assert.equal(s.shots, 1);
  while (s.shot) I.step(s, F, {}); I.step(s, F, { a: true }); assert.equal(s.shots, 2);
});
test('invaders: two-pattern volley (aimed pebbles + ping-pong sweep), Inu reload curve, bomb cap per wave', () => {
  assert.equal(I.reloadFrames(0), 54); assert.ok(I.reloadFrames(1000) < I.reloadFrames(200)); assert.equal(I.reloadFrames(1e7), 14); assert.deepEqual([1, 2, 3, 5, 9].map(I.maxBombs), [2, 2, 3, 4, 4]);
  const s = I.create(1); s.ready = 0; s.ufoT = 1e9; s.diveT = 1e9; const kinds = new Set(), cols = [];
  for (let i = 0; i < 900; i++) { const tgt = s.aliens.find((a) => a.alive && a.c === 8); s.player.x = tgt.x + 2; I.step(s, F, {}); s.player.dead = 0; s.lives = 3; for (const b of Object.values(s.bombs)) if (!b.seen) { b.seen = 1; kinds.add(b.kind); cols.push([b.kind, b.x, b.c]); } assert.ok(Object.keys(s.bombs).length <= I.maxBombs(1)); }
  assert.deepEqual([...kinds].sort(), ['pebble', 'zigzag']); const peb = cols.filter((c) => c[0] === 'pebble'); const ax = s.aliens.find((a) => a.c === 8).x + 7;
  assert.ok(peb.length && peb.every(([, , c]) => Math.abs(c - 8) <= 1), 'pebbles come from the column above you (+-1)'); void ax; assert.ok(new Set(cols.filter((c) => c[0] === 'zigzag').map((c) => Math.round(c[1]))).size >= 3, 'sweep walks across columns');
});
test('invaders: wing-tip diver swoops toward you and is worth double', () => {
  const s = I.create(1); s.ready = 0; s.ufoT = 1e9; s.diveT = 1; I.step(s, F, {}); assert.ok(s.diver); const a = s.diver.a; assert.ok(a.diving && a.r === 4);
  const y0 = s.diver.y; for (let i = 0; i < 10; i++) I.step(s, F, {}); assert.ok(s.diver.y > y0);
  const sc = s.score; s.shot = { x: s.diver.x + 6, y: s.diver.y + 6, w: 1, h: 4 }; s.bombs = {}; I.step(s, F, {}); assert.equal(s.score - sc, I.TYPE_PTS[a.type] * I.DIVE.pts); assert.equal(s.diver, null);
});
test('invaders: balloon value melts from 300 to 100 as it crosses', () => {
  assert.equal(I.balloonScore(0), 300); assert.equal(I.balloonScore(1), 100); assert.equal(I.balloonScore(0.5), 200);
  const s = I.create(1); s.ready = 0; s.ufo = { x: 0, y: 40, w: 16, h: 7, vx: 1 }; s.shot = { x: 5, y: 46, w: 1, h: 4 }; s.bombs = {}; I.step(s, F, {}); assert.ok(s.score >= 250);
});
test('invaders: shields are eroded pixel by pixel; waves restart lower; extra life at 2000', () => {
  const s = I.create(1); s.ready = 0; const count = () => s.shields[0].reduce((a, b) => a + b, 0); const n0 = count(); s.shot = { x: I.SHIELD_X[0] + 4, y: I.SHIELD_Y + 6, w: 1, h: 4 }; I.step(s, F, {}); const n1 = count(); assert.ok(n1 < n0 && n0 - n1 < 40, `eroded ${n0 - n1} px`); assert.equal(s.shot, null);
  s.aliens.forEach((a) => (a.alive = false)); I.step(s, F, {}); assert.equal(s.wave, 2); assert.equal(Math.max(...s.aliens.map((a) => a.y)), 140); assert.equal(count(), n0, 'shields restored');
  s.score = 1990; s.ready = 0; s.aliens[0].alive = true; s.aliens.slice(1).forEach((a) => (a.alive = false)); s.bombs = {}; s.shot = { x: s.aliens[0].x + 6, y: s.aliens[0].y + 6, w: 1, h: 4 }; I.step(s, F, {}); assert.equal(s.lives, 4);
});
test('invaders: fleet reaching the player row ends the game; bot plays', () => { const s = I.create(1); s.ready = 0; s.aliens.forEach((a) => (a.y += 80)); for (let i = 0; i < 400; i++) I.marchOne(s); assert.ok(s.over); assert.ok(run(I, I.create(3), 60 * 120).score > 200); });
// ===================== PUP CROSSING =====================
test('crossing: 224x256, Inu lanes (bins/scooters/mowers/vans/buses; frisbees/noodles/rafts), 50s timer, 4 park gates', () => {
  assert.equal(X.W, 224); assert.equal(X.H, 256); assert.equal(X.TIME, 50); assert.equal(X.GATES.length, 4); assert.equal(X.LANES.length, 10);
  assert.deepEqual(X.LANES.map((l) => l[1]), ['bin', 'scooter', 'mower', 'van', 'bus', 'frisbee2', 'noodle', 'frisbee3', 'noodle', 'raft']); assert.ok(!X.LANES.some((l) => /duck|log|croc|turtle/.test(l[1])));
  assert.deepEqual([X.PTS.step, X.PTS.home, X.PTS.allHomes, X.PTS.fly, X.PTS.lady, X.PTS.extraLifeAt], [10, 60, 800, 250, 150, 15000]);
  const s = X.create(1); assert.equal(s.timerF, 3000); s.lanes.forEach((l) => (l.objs = l.row <= 7 ? l.objs : [])); X.step(s, F, { up: true }); assert.equal(s.pup.row, 13); assert.equal(s.score, 10);
});
test('crossing: traffic kills, water kills, platforms carry, timer kills', () => {
  const s = X.create(1); const l = s.lanes.find((k) => k.row === 11); l.v = 0; s.pup.row = 11; s.pup.x = X.wrapX(l, l.objs[0]) + 8; X.step(s, F, {}); assert.equal(s.lastDeath, 'car');
  const w = X.create(1); w.lanes.find((k) => k.row === 6).objs = []; w.pup.row = 6; X.step(w, F, {}); assert.equal(w.lastDeath, 'splash');
  const c = X.create(1); const lg = c.lanes.find((k) => k.row === 4); c.pup.row = 4; lg.objs[0].x -= X.wrapX(lg, lg.objs[0]) - 60; c.pup.x = 100; const x0 = c.pup.x; for (let i = 0; i < 30; i++) X.step(c, F, {}); assert.equal(c.lives, 3); assert.ok(Math.abs(c.pup.x - x0 - lg.v * 30) < 0.01);
  const t = X.create(1); t.timerF = 1; t.lanes.forEach((k) => (k.objs = [])); X.step(t, F, {}); assert.equal(t.lastDeath, 'time');
});
test('crossing: flipping frisbees cycle up/wobble/under/back; standing on a flipped one drowns', () => {
  assert.equal(X.flipState(0), 'up'); assert.equal(X.flipState(X.FLIP.steady), 'wobble'); assert.equal(X.flipState(X.FLIP.steady + X.FLIP.wobble), 'under'); assert.equal(X.flipState(X.FLIP.steady + X.FLIP.wobble + X.FLIP.flipped), 'back');
  assert.ok(!X.create(1).lanes.some((l) => l.objs.some((o) => o.flip)), 'level 1: no flipping frisbees');
  const s = X.create(1); s.level = 2; X.buildLevel(s); const l = s.lanes.find((k) => k.row === 7); const o = l.objs.find((q) => q.flip); assert.ok(o); l.v = 0; s.pup.row = 7; s.pup.x = X.wrapX(l, o) + 8;
  s.frame = X.FLIP.steady + X.FLIP.wobble - o.ph + 1; X.step(s, F, {}); assert.equal(s.lastDeath, 'splash');
});
test('crossing: sprinklers spray the lawn on a cycle; more heads each level', () => {
  assert.deepEqual([1, 2, 3].map((l) => X.sprinklerXs(l).length), [1, 2, 3]); assert.ok(X.sprinklerOn(0, 0) && !X.sprinklerOn(X.SPRINKLER.on, 0));
  const k = X.create(1); k.lanes.forEach((q) => (q.objs = [])); k.pup.row = X.MEDIAN; k.pup.x = 112; k.frame = X.SPRINKLER.period - 1; X.step(k, F, {}); assert.equal(k.lastDeath, 'sprinkler');
  const d = X.create(1); d.lanes.forEach((q) => (q.objs = [])); d.pup.row = X.MEDIAN; d.pup.x = 112; d.frame = X.SPRINKLER.on + 5; X.step(d, F, {}); assert.equal(d.lives, 3, 'safe while it is off');
});
test('crossing: gate gives 60 + 10/sec, biscuit +250, shut gate and fence kill, 4 gates -> level up faster', () => {
  const s = X.create(1); s.lanes.forEach((l) => (l.objs = [])); s.pup.row = 3; s.pup.x = X.GATES[0]; const r3 = s.lanes.find((l) => l.row === 3); r3.objs = [{ x: (400 - 224) / 2, len: 224, kind: 'raft' }]; r3.v = 0; r3.span = 400;
  s.bay[0] = { kind: 'fly', f: 0 }; s.best = 3; s.timerF = 30 * 60 + 30; X.step(s, F, { up: true }); assert.equal(s.score, 10 + 60 + 30 * 10 + 250);
  s.bay[1] = { kind: 'shut', f: 100 }; s.pup.row = 3; s.pup.x = X.GATES[1]; for (let i = 0; i < 10; i++) X.step(s, F, {}); s.bay[1] = { kind: 'shut', f: 100 }; X.step(s, F, { up: true }); assert.equal(s.lastDeath, 'gate');
  const h = X.create(1); h.pup.row = 2; h.pup.x = 58; h.lanes.forEach((l) => (l.objs = [])); X.step(h, F, {}); assert.equal(h.lastDeath, 'fence');
  const lv = X.create(1); lv.homes = [1, 1, 1, 0]; lv.pup.row = 2; lv.pup.x = X.GATES[3]; X.step(lv, F, {}); assert.equal(lv.level, 2); assert.ok(X.speedMul(2) > X.speedMul(1) && X.speedMul(3) > 1 && lv.sprinklers.length === 2);
});
test('crossing: squeaky toy on a noodle +150 (no escort); bot plays', () => {
  const s = X.create(1); s.lanes.forEach((l) => (l.v = 0)); s.ladyT = 1; X.step(s, F, {}); assert.ok(s.lady); const l = s.lanes.find((k) => k.row === 6); s.pup.row = 6; s.pup.x = X.wrapX(l, l.objs[s.lady.obj]) + s.lady.off; if (s.pup.x < 10 || s.pup.x > 214) { l.objs[s.lady.obj].x -= s.pup.x - 100; s.pup.x = 100; }
  const sc = s.score; X.step(s, F, {}); assert.equal(s.score - sc, 150); assert.equal(s.lady, null); assert.equal(s.pup.carrying, false);
  assert.ok(run(X, X.create(5), 60 * 120).score >= 500);
});
// ===================== BONE BREAKER =====================
test('breaker: 3 original bone-yard screens of 12-wide crates, values 6..1 by height, tough top crates', () => {
  const s = B.create(1); assert.equal(B.COLS, 12); assert.equal(B.ROWS, 7); assert.equal(B.SCREENS, 3); assert.deepEqual(B.ROW_PTS, [6, 5, 4, 3, 2, 2, 1]);
  for (const m of B.SCREEN_MAPS) { assert.equal(m.length, 7); m.forEach((r) => assert.equal(r.length, 12)); } assert.ok(s.bricks.some((b) => b.tough && b.hp === 2));
  assert.equal(s.bricks.length, B.SCREEN_MAPS[0].join('').replace(/\./g, '').length); assert.ok(B.MAX_SCORE > 600 && B.MAX_SCORE !== 896); for (const b of s.bricks) assert.ok(b.x >= B.X0 && b.x + b.w <= B.X1);
  assert.equal(B.HIT_TRIGGERS, undefined); assert.equal(B.SEG_ANGLES, undefined);
});
test('breaker: speed-ups every 10 paddle returns and on the first dig into the top 2 rows', () => {
  const s = B.create(1); s.balls = [{ x: 112, y: B.PY - 2, vx: 0, vy: 1.5, stuck: false }]; for (let i = 0; i < 9; i++) { s.balls[0] = { x: s.paddle.x, y: B.PY - 2, vx: 0, vy: 1.5, stuck: false }; B.moveBall(s, s.balls[0], 1); } assert.equal(s.speedLvl, 0);
  s.balls[0] = { x: s.paddle.x, y: B.PY - 2, vx: 0, vy: 1.5, stuck: false }; B.moveBall(s, s.balls[0], 1); assert.equal(s.speedLvl, 1, 'after 10 returns');
  const k = s.bricks.find((b) => b.r === 1); s.bricks = s.bricks.filter((b) => !(b.c === k.c && b.r > 1)); s.balls = [{ x: k.x + 8, y: k.y + 10, vx: 0, vy: -1.5, stuck: false }]; for (let i = 0; i < 4; i++) B.step(s, F, {}); assert.equal(s.speedLvl, 2, 'deep dig');
  const k2 = s.bricks.find((b) => b.r === 0); s.bricks = s.bricks.filter((b) => !(b.c === k2.c && b.r > 0)); s.balls = [{ x: k2.x + 8, y: k2.y + 10, vx: 0, vy: -1.5, stuck: false }]; for (let i = 0; i < 4; i++) B.step(s, F, {}); assert.equal(s.speedLvl, 2, 'only once');
});
test('breaker: paddle wears 2px per 20 crates (min 16); continuous angles up to 62 degrees', () => {
  const s = B.create(1); assert.equal(B.paddleW(s), 24); s.broken = 20; assert.equal(B.paddleW(s), 22); s.broken = 400; assert.equal(B.paddleW(s), 16);
  const t = B.create(1); t.balls = [{ x: t.paddle.x - 12, y: B.PY - 2, vx: 0, vy: 1.5, stuck: false }]; B.moveBall(t, t.balls[0], 1); const ang = Math.atan2(t.balls[0].vx, -t.balls[0].vy) * 180 / Math.PI; assert.ok(Math.abs(ang + 62) < 0.5, 'left tip -> -62deg, got ' + ang);
  const u = B.create(1); u.balls = [{ x: u.paddle.x + 3, y: B.PY - 2, vx: 0, vy: 1.5, stuck: false }]; B.moveBall(u, u.balls[0], 1); const a2 = Math.atan2(u.balls[0].vx, -u.balls[0].vy) * 180 / Math.PI; assert.ok(Math.abs(a2 - 62 * 0.25) < 0.5, 'quarter -> 15.5deg, got ' + a2);
});
test('breaker: screens 1 -> 2 -> 3; clearing screen 3 ends the game (classic)', () => {
  const s = B.create(1); s.bricks = []; B.step(s, F, {}); assert.equal(s.screen, 2); assert.equal(s.bricks.length, B.SCREEN_MAPS[1].join('').replace(/\./g, '').length); s.bricks = []; B.step(s, F, {}); assert.equal(s.screen, 3); s.bricks = []; B.step(s, F, {}); assert.ok(s.over && s.perfect);
  const d = B.create(1); d.balls = [{ x: 100, y: 260, vx: 0, vy: 2, stuck: false }]; B.step(d, F, {}); assert.equal(d.lives, 2);
  assert.ok(run(B, B.create(2), 60 * 120).score > 50);
});
