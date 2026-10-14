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
test('chomp: original maze has no dead ends, no 2x2 open blocks, a mirrored layout, sensible no-up tiles, and a house + start', () => {
  const open = (x, y) => !C.isWall(x, y); let cells = 0;
  for (let y = 0; y < 31; y++) for (let x = 0; x < 28; x++) { if (!open(x, y)) continue; cells++; const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => open(x + dx, y + dy)).length; assert.ok(n >= 2, `dead end at ${x},${y}`); if (x < 27 && y < 30) assert.ok(!(open(x + 1, y) && open(x, y + 1) && open(x + 1, y + 1)), `2x2 open block at ${x},${y}`); }
  for (const r of C.MAZE) assert.equal(r, [...r].reverse().join(''), 'left-right symmetric');
  assert.ok(cells > 280 && cells < 360, 'corridor density ' + cells);
  for (const k of C.NO_UP) { const [x, y] = k.split(',').map(Number); assert.ok(open(x, y) && open(x, y - 1), 'no-up tile is a real up junction ' + k); }
  assert.equal(C.MAZE[12].slice(13, 15), '--'); assert.ok(open(13, 23) && open(14, 23) && open(13, 11) && open(14, 11), 'pac + blinky start tiles open');
});
test('chomp: cats leave the house and keep chasing on the new maze (no stuck cats)', () => {
  const s = C.create(7); s.ready = 0; const seen = s.cats.map(() => new Set());
  for (let i = 0; i < 60 * 40; i++) { C.step(s, F, {}); s.lives = 3; s.over = false; s.cats.forEach((c, j) => { if (c.state === 'out') seen[j].add(Math.floor(c.x / 8) + ',' + Math.floor(c.y / 8)); }); }
  seen.forEach((v, j) => assert.ok(v.size > 10, `cat ${j} roamed ${v.size} tiles`));
});
test('chomp: per-level speed table (pac, ghost, tunnel, fright, Elroy)', () => {
  assert.deepEqual(C.speeds(1), { pac: 80, pacFright: 90, ghost: 75, tunnel: 40, fright: 50, elroy1: [20, 80], elroy2: [10, 85] });
  assert.deepEqual(C.speeds(2), { pac: 90, pacFright: 95, ghost: 85, tunnel: 45, fright: 55, elroy1: [30, 90], elroy2: [15, 95] });
  assert.deepEqual(C.speeds(5), { pac: 100, pacFright: 100, ghost: 95, tunnel: 50, fright: 60, elroy1: [40, 100], elroy2: [20, 105] });
  assert.equal(C.speeds(21).pac, 90); assert.deepEqual(C.speeds(30).elroy1, [120, 100]);
  const s = C.create(1); const k = s.cats[0]; k.state = 'out'; assert.ok(Math.abs(C.catSpeed(s, k) * 60 - 0.75 * 75.75757625) < 1e-6);
  k.x = 20; k.y = 14 * 8 + 4; assert.ok(Math.abs(C.catSpeed(s, k) * 60 - 0.40 * 75.75757625) < 1e-6, 'tunnel slowdown');
});
test('chomp: fright time per level shrinks to 0; flashes table', () => {
  assert.deepEqual(C.FRIGHT_TIME.slice(1, 22), [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1, 0, 0, 0]); assert.equal(C.frightSecs(40), 0);
  const s = C.create(1); s.level = 17; s.ready = 0; s.cats[0].dir = 'left'; s.energizers = new Set(['13,23']); s.pac.x = 13 * 8 + 4 + 1; s.pac.y = 23 * 8 + 4; s.pac.dir = 'left';
  run(C, s, 4, () => ({ left: true })); assert.equal(s.frightF, 0); assert.ok(!s.cats.some((c) => c.fright), 'no fright on level 17 (reverse only)');
});
test('chomp: scatter/chase timer table per level', () => {
  assert.deepEqual(C.modeTable(1), [7, 20, 7, 20, 5, 20, 5, Infinity]); assert.deepEqual(C.modeTable(3), [7, 20, 7, 20, 5, 1033, 1 / 60, Infinity]); assert.deepEqual(C.modeTable(9), [5, 20, 5, 20, 5, 1037, 1 / 60, Infinity]);
  const s = C.create(1); s.ready = 0; s.pac.x = 1000; s.pac.y = 1000; let changed = -1; s.cats.forEach((c) => (c.state = 'house')); s.idleF = -1e9; s.dotCounters = [0, -1e9, -1e9, -1e9];
  for (let f = 1; f <= 7 * 60 + 2; f++) { C.step(s, F, {}); if (changed < 0 && s.phase === 1) changed = f; }
  assert.equal(changed, 7 * 60); assert.equal(C.scatterMode(s), false);
});
test('chomp: four targeting personalities incl. the up-direction quirk', () => {
  const s = C.create(1); s.pac.x = 14 * 8 + 4; s.pac.y = 23 * 8 + 4; s.phase = 1; // chase
  s.pac.dir = 'left'; assert.deepEqual(C.catTarget(s, s.cats[0]), { x: 14, y: 23 }); assert.deepEqual(C.catTarget(s, s.cats[1]), { x: 10, y: 23 });
  s.pac.dir = 'up'; assert.deepEqual(C.catTarget(s, s.cats[1]), { x: 10, y: 19 }, 'up quirk: 4 up AND 4 left');
  s.cats[0].x = 14 * 8 + 4; s.cats[0].y = 11 * 8 + 4; assert.deepEqual(C.catTarget(s, s.cats[2]), { x: 12 * 2 - 14, y: 21 * 2 - 11 }, 'inky: (pivot 2 up 2 left) doubled from blinky');
  s.cats[3].x = 1 * 8 + 4; s.cats[3].y = 29 * 8 + 4; assert.deepEqual(C.catTarget(s, s.cats[3]), { x: 14, y: 23 }, 'clyde far -> chase'); s.cats[3].x = 12 * 8 + 4; s.cats[3].y = 26 * 8 + 4; assert.deepEqual(C.catTarget(s, s.cats[3]), C.SCATTER[3], 'clyde near -> his corner');
  s.phase = 0; assert.deepEqual(C.catTarget(s, s.cats[1]), C.SCATTER[1]);
});
test('chomp: Elroy speed-ups follow dots left and target Pac even in scatter', () => {
  const s = C.create(1); s.elroyOff = false; const b = s.cats[0]; while (C.dotsLeft(s) > 20) s.dots.delete([...s.dots][0]); assert.equal(C.elroyLevel(s), 1); assert.ok(Math.abs(C.catSpeed(s, b) * 60 - 0.80 * 75.75757625) < 1e-6);
  while (C.dotsLeft(s) > 10) s.dots.delete([...s.dots][0]); assert.equal(C.elroyLevel(s), 2); s.phase = 0; s.pac.x = 100; s.pac.y = 188; assert.deepEqual(C.catTarget(s, b), { x: 12, y: 23 });
});
test('chomp: ghost-house dot limits (L1 inky 30, clyde 60) and the idle timer', () => {
  assert.deepEqual(C.DOT_LIMITS(1), [0, 0, 30, 60]); assert.deepEqual(C.DOT_LIMITS(2), [0, 0, 0, 50]); assert.deepEqual(C.DOT_LIMITS(3), [0, 0, 0, 0]); assert.deepEqual(C.GLOBAL_LIMITS, [0, 7, 17, 32]); assert.equal(C.idleLimit(1), 240); assert.equal(C.idleLimit(5), 180);
  const s = C.create(1); s.ready = 0; s.pac.x = 1000; C.step(s, F, {}); assert.notEqual(s.cats[1].state, 'house', 'pinky leaves at once'); assert.equal(s.cats[2].state, 'house');
  s.dotCounters[2] = 30; C.step(s, F, {}); assert.notEqual(s.cats[2].state, 'house', 'inky leaves after 30 dots'); assert.equal(s.cats[3].state, 'house');
  for (let i = 0; i < 300; i++) C.step(s, F, {}); assert.notEqual(s.cats[3].state, 'house', 'idle timer forces clyde out');
});
test('chomp: cornering lets Pac cut corners; dots stall Pac 1 frame, energizers 3', () => {
  const s = C.create(1); s.ready = 0; s.cats.forEach((c) => (c.state = 'house')); s.idleF = -1e9; s.dotCounters = [0, -1e9, -1e9, -1e9]; s.cats[1].state = 'house';
  // at (6,5) junction approaching from the right; pre-turn before the centre moves diagonally
  s.pac.x = 4 * 8 + 4 + 3; s.pac.y = 5 * 8 + 4; s.pac.dir = 'left'; s.dots.clear(); s.energizers.clear(); s.energizers.add('0,0');
  C.step(s, F, { down: true }); C.step(s, F, { down: true }); assert.equal(s.pac.dir, 'down'); assert.ok(s.pac.y > 5 * 8 + 4 && s.pac.x < 4 * 8 + 4 + 3, 'moved diagonally');
  const t = C.create(1); t.ready = 0; t.pac.x = 13 * 8 + 4; t.pac.y = 23 * 8 + 4; t.pac.dir = 'left'; t.dots = new Set(['12,23']); for (let i = 0; i < 8; i++) C.step(t, F, { left: true }); assert.equal(t.pac.stall >= 0, true); assert.equal(t.score, 10);
});
test('chomp: bonus items at 70 and 170 dots, value sequence by level; 200/400/800/1600; extra life at 10000', () => {
  assert.deepEqual(C.BONUS_DOTS, [70, 170]); assert.deepEqual([1, 2, 3, 5, 7, 9, 11, 13, 20].map((l) => C.bonusFor(l)[1]), [100, 300, 500, 700, 1000, 2000, 3000, 5000, 5000]);
  assert.deepEqual(C.PTS.ghosts, [200, 400, 800, 1600]); assert.equal(C.PTS.extraLifeAt, 10000);
  const s = C.create(1); s.ready = 0; s.eaten = 69; s.pac.x = 13 * 8 + 4; s.pac.y = 23 * 8 + 4; s.pac.dir = 'left'; for (let i = 0; i < 10; i++) C.step(s, F, { left: true }); assert.equal(s.bonus?.pts, 100);
  const e = C.create(1); e.ready = 0; e.dots.clear(); e.frightF = 300; e.cats.forEach((c, i) => { c.state = 'out'; c.fright = true; c.x = e.pac.x - 4; c.y = e.pac.y; }); for (let i = 0; i < 4; i++) { C.step(e, F, {}); e.freeze = 0; } assert.equal(e.score, 200 + 400 + 800 + 1600);
  const x = C.create(1); x.ready = 0; x.score = 9995; x.pac.x = 13 * 8 + 4; x.pac.y = 23 * 8 + 4; x.pac.dir = 'left'; for (let i = 0; i < 10; i++) C.step(x, F, { left: true }); assert.equal(x.lives, 4);
});
test('chomp: touching a cat costs a life, clearing all 244 advances the level; bot can clear level 1', () => {
  const s = C.create(1); s.ready = 0; const c = s.cats[0]; c.x = s.pac.x - 4; c.y = s.pac.y; C.step(s, F, {}); assert.equal(s.lives, 2);
  const b = run(C, C.create(3), 60 * 400); assert.ok(b.level >= 2, 'bot reached level ' + b.level);
});
// ===================== BARK INVADERS =====================
test('invaders: 224x256, 11x5 rack, 10/20/30 points, wave start heights', () => {
  assert.equal(I.W, 224); assert.equal(I.H, 256); const s = I.create(1); assert.equal(s.aliens.length, 55);
  assert.deepEqual(I.ROW_TYPE.map((t) => I.TYPE_PTS[t]), [30, 20, 20, 10, 10]);
  assert.deepEqual([1, 2, 3, 4, 7, 9, 10].map(I.waveY), [136, 160, 176, 184, 192, 192, 160]); assert.equal(Math.max(...s.aliens.map((a) => a.y)), 136);
});
test('invaders: one alien moves per frame, so a rack step takes (alive) frames and speeds up as aliens die', () => {
  const s = I.create(1); s.ready = 0; const a0 = s.aliens[0], x0 = a0.x; let frames = 0; const before = s.aliens.map((a) => a.x);
  while (s.aliens[54].x === before[54]) { I.marchOne(s); frames++; } assert.equal(frames, 55);
  assert.equal(a0.x - x0, 2); s.aliens.forEach((a, i) => { if (i > 4) a.alive = false; }); frames = 0; const b4 = s.aliens[4].x; while (s.aliens[4].x === b4) { I.marchOne(s); frames++; } assert.ok(frames <= 5, 'only 5 left: ' + frames);
  const one = I.create(1); one.aliens.forEach((a, i) => (a.alive = i === 0)); one.dir = 1; const x = one.aliens[0].x; I.marchOne(one); assert.equal(one.aliens[0].x - x, 3, 'last alien moves 3px right');
});
test('invaders: rack drops 8px and reverses at the edge', () => {
  const s = I.create(1); s.aliens.forEach((a) => (a.x += 200 - 184)); const y0 = s.aliens[0].y; for (let i = 0; i < 55 * 3; i++) I.marchOne(s); assert.equal(s.aliens[0].y, y0 + 8); assert.equal(s.dir, -1);
});
test('invaders: only one player shot on screen; must re-press to fire', () => {
  const s = I.create(1); s.ready = 0; I.step(s, F, { a: true }); assert.equal(s.shots, 1); for (let i = 0; i < 5; i++) I.step(s, F, { a: true }); assert.equal(s.shots, 1);
  while (s.shot) I.step(s, F, {}); I.step(s, F, { a: true }); assert.equal(s.shots, 2);
});
test('invaders: three bomb types, column tables, rolling shot targets the player column, reload by score', () => {
  assert.deepEqual(I.PLUNGER_COLS, [1, 7, 1, 1, 1, 4, 11, 1, 6, 3, 1, 1, 11, 9, 2, 8]); assert.deepEqual(I.SQUIGGLY_COLS, [11, 1, 6, 3, 1, 1, 11, 9, 2, 8, 2, 11, 4, 7, 10]);
  assert.deepEqual([0, 199, 200, 1000, 2000, 3000, 9999].map(I.reloadFrames), [48, 48, 16, 11, 8, 7, 7]);
  const s = I.create(1); s.ready = 0; s.player.x = s.aliens.find((a) => a.c === 8).x + 2; s.ufoT = 1e9; const seen = {};
  for (let i = 0; i < 400; i++) { s.player.x = s.aliens.find((a) => a.c === 8).x + 2; I.step(s, F, {}); s.player.dead = 0; s.lives = 3; for (const k in s.bombs) if (s.bombs[k] && !seen[k]) seen[k] = s.bombs[k].x - s.aliens[0].x; }
  assert.deepEqual(Object.keys(seen).sort(), ['plunger', 'roll', 'squiggly']); const near = (c, x) => Math.abs(s.aliens.find((q) => q.c === c).x - s.aliens[0].x + 8 - x) < 8; assert.ok(near(8, seen.roll), 'rolling shot from the column above the player'); assert.ok(near(I.PLUNGER_COLS[0] - 1, seen.plunger), 'first plunger from column 1');
});
test('invaders: mystery ship score by shot count (15-entry table, 300 on the 8th and every 15th)', () => {
  assert.equal(I.mysteryScore(8), 300); assert.equal(I.mysteryScore(23), 300); assert.equal(I.mysteryScore(38), 300); assert.equal(I.mysteryScore(1), 50); assert.equal(I.MYSTERY_FRAMES, 0x600);
  const s = I.create(1); s.ready = 0; s.shots = 22; s.ufo = { x: 100, y: 40, w: 16, h: 7, vx: 0 }; s.shot = { x: 105, y: 46, w: 1, h: 4 }; s.shots = 23; s.bombs = {}; I.step(s, F, {}); assert.equal(s.score, 300);
});
test('invaders: shields are eroded pixel by pixel; waves restart lower; extra life at 1500', () => {
  const s = I.create(1); s.ready = 0; const count = () => s.shields[0].reduce((a, b) => a + b, 0); const n0 = count(); s.shot = { x: I.SHIELD_X[0] + 4, y: I.SHIELD_Y + 6, w: 1, h: 4 }; I.step(s, F, {}); const n1 = count(); assert.ok(n1 < n0 && n0 - n1 < 40, `eroded ${n0 - n1} px`); assert.equal(s.shot, null);
  s.aliens.forEach((a) => (a.alive = false)); I.step(s, F, {}); assert.equal(s.wave, 2); assert.equal(Math.max(...s.aliens.map((a) => a.y)), 160); assert.equal(count(), n0, 'shields restored');
  s.score = 1490; s.ready = 0; s.aliens[0].alive = true; s.aliens.slice(1).forEach((a) => (a.alive = false)); s.shot = { x: s.aliens[0].x + 6, y: s.aliens[0].y + 6, w: 1, h: 4 }; I.step(s, F, {}); assert.equal(s.lives, 4);
});
test('invaders: aliens reaching the player row end the game; bot plays', () => { const s = I.create(1); s.ready = 0; s.aliens.forEach((a) => (a.y += 80)); for (let i = 0; i < 60; i++) I.marchOne(s); assert.ok(s.over); assert.ok(run(I, I.create(3), 60 * 120).score > 200); });
// ===================== PUP CROSSING =====================
test('crossing: 224x256, lane table, 60s timer, kennels, scoring', () => {
  assert.equal(X.W, 224); assert.equal(X.H, 256); assert.equal(X.TIME, 60); assert.equal(X.BAYS.length, 5); assert.equal(X.LANES.length, 10);
  assert.deepEqual(X.LANES.map((l) => l[0]), [13, 12, 11, 10, 9, 7, 6, 5, 4, 3]); assert.ok(X.LANES.filter((l) => l[1].startsWith('duck')).length === 2);
  assert.deepEqual([X.PTS.step, X.PTS.home, X.PTS.allHomes, X.PTS.fly, X.PTS.lady, X.PTS.extraLifeAt], [10, 50, 1000, 200, 200, 20000]);
  const s = X.create(1); assert.equal(s.timerF, 3600); s.lanes.forEach((l) => (l.objs = l.row <= 7 ? l.objs : [])); X.step(s, F, { up: true }); assert.equal(s.pup.row, 13); assert.equal(s.score, 10);
});
test('crossing: cars kill, water kills, logs carry, timer kills', () => {
  const s = X.create(1); const l = s.lanes.find((k) => k.row === 11); l.v = 0; s.pup.row = 11; s.pup.x = X.wrapX(l, l.objs[0]) + 8; X.step(s, F, {}); assert.equal(s.lastDeath, 'car');
  const w = X.create(1); w.lanes.find((k) => k.row === 6).objs = []; w.pup.row = 6; X.step(w, F, {}); assert.equal(w.lastDeath, 'splash');
  const c = X.create(1); const lg = c.lanes.find((k) => k.row === 5); c.pup.row = 5; c.pup.x = X.wrapX(lg, lg.objs[0]) + 48; if (c.pup.x < 20 || c.pup.x > 200) { lg.objs[0].x -= c.pup.x - 100; c.pup.x = 100; } const x0 = c.pup.x; for (let i = 0; i < 30; i++) X.step(c, F, {}); assert.equal(c.lives, 3); assert.ok(Math.abs(c.pup.x - x0 - lg.v * 30) < 0.01);
  const t = X.create(1); t.timerF = 1; t.lanes.forEach((k) => (k.objs = [])); X.step(t, F, {}); assert.equal(t.lastDeath, 'time');
});
test('crossing: diving ducks cycle surface/sink/under/rise; standing on a submerged duck drowns', () => {
  assert.equal(X.diveState(0), 'up'); assert.equal(X.diveState(X.DIVE.surface), 'sinking'); assert.equal(X.diveState(X.DIVE.surface + X.DIVE.sink), 'under'); assert.equal(X.diveState(X.DIVE.surface + X.DIVE.sink + X.DIVE.under), 'rising');
  const s = X.create(1); const l = s.lanes.find((k) => k.row === 7); const o = l.objs.find((q) => q.dive); assert.ok(o); l.v = 0; s.pup.row = 7; s.pup.x = X.wrapX(l, o) + 8;
  s.frame = X.DIVE.surface + X.DIVE.sink - o.ph + 1; X.step(s, F, {}); assert.equal(s.lastDeath, 'splash');
});
test('crossing: kennel gives 50 + 10/sec, fly +200, croc in kennel kills, hedge kills, 5 kennels -> level up faster', () => {
  const s = X.create(1); s.lanes.forEach((l) => (l.objs = [])); s.pup.row = 3; s.pup.x = X.BAYS[0]; s.lanes.find((l) => l.row === 3).objs = [{ x: 0, len: 224, kind: 'log' }]; s.lanes.find((l) => l.row === 3).v = 0; s.lanes.find((l) => l.row === 3).span = 400;
  const lg = s.lanes.find((l) => l.row === 3); lg.objs[0].x = (400 - 224) / 2; s.bay[0] = { kind: 'fly', f: 0 }; s.best = 3; s.timerF = 30 * 60 + 30; X.step(s, F, { up: true }); assert.equal(s.score, 10 + 50 + 30 * 10 + 200);
  s.bay[1] = { kind: 'croc', f: 100 }; s.pup.row = 3; s.pup.x = X.BAYS[1]; X.step(s, F, {}); for (let i = 0; i < 10; i++) X.step(s, F, {}); X.step(s, F, { up: true }); assert.equal(s.lastDeath, 'croc');
  const h = X.create(1); h.pup.row = 2; h.pup.x = 46; h.lanes.forEach((l) => (l.objs = [])); X.step(h, F, {}); assert.equal(h.lastDeath, 'hedge');
  const lv = X.create(1); lv.homes = [1, 1, 1, 1, 0]; lv.pup.row = 2; lv.pup.x = X.BAYS[4]; X.step(lv, F, {}); assert.equal(lv.level, 2); assert.ok(X.speedMul(2) > 1 && lv.snake, 'level 2: faster lanes + median snake'); assert.ok(lv.lanes.find((l) => l.row === 3).objs.some((o) => o.kind === 'croc'), 'croc on the river');
});
test('crossing: lady pup carried home +200; snake kills; bot plays', () => {
  const s = X.create(1); s.lanes.forEach((l) => (l.v = 0)); s.ladyT = 1; X.step(s, F, {}); assert.ok(s.lady); const l = s.lanes.find((k) => k.row === 6); s.pup.row = 6; s.pup.x = X.wrapX(l, l.objs[s.lady.obj]) + s.lady.off; if (s.pup.x < 10 || s.pup.x > 214) { l.objs[s.lady.obj].x -= s.pup.x - 100; s.pup.x = 100; } X.step(s, F, {}); assert.ok(s.pup.carrying);
  const k = X.create(1); k.level = 2; X.buildLevel(k); k.snake.vx = 0; k.snake.x = 100; k.pup.row = X.MEDIAN; k.pup.x = 112; k.lanes.forEach((q) => (q.objs = [])); X.step(k, F, {}); assert.equal(k.lastDeath, 'snake');
  assert.ok(run(X, X.create(5), 60 * 120).score >= 500);
});
// ===================== BONE BREAKER =====================
test('breaker: 8 rows x 14, scores 1/1/3/3/5/5/7/7 bottom-up, two screens = 896', () => {
  const s = B.create(1); assert.equal(s.bricks.length, 112); assert.deepEqual([...B.ROW_PTS].reverse(), [1, 1, 3, 3, 5, 5, 7, 7]); assert.equal(B.MAX_SCORE, 896); assert.equal(B.SCREENS, 2);
  assert.deepEqual(B.ROW_NAME, ['red', 'red', 'orange', 'orange', 'green', 'green', 'yellow', 'yellow']);
});
test('breaker: speed-ups after 4 and 12 hits and on first orange and red contact', () => {
  assert.deepEqual(B.HIT_TRIGGERS, [4, 12]); assert.equal(B.SPEEDS.length, 5);
  const s = B.create(1); s.balls[0].stuck = false; const hitRow = (r) => { const k = s.bricks.find((b) => b.r === r); s.bricks = s.bricks.filter((b) => !(b.c === k.c && b.r > r)); s.balls = [{ x: k.x + 7, y: k.y + 9, vx: 0, vy: -1.5, stuck: false }]; for (let i = 0; i < 4; i++) B.step(s, F, {}); };
  for (let i = 0; i < 3; i++) hitRow(7); assert.equal(s.speedLvl, 0); hitRow(6); assert.equal(s.speedLvl, 1, 'after 4 hits');
  hitRow(3); assert.equal(s.speedLvl, 2, 'orange contact'); hitRow(2); assert.equal(s.speedLvl, 2, 'only first orange');
  for (let i = 0; i < 6; i++) hitRow(5); assert.equal(s.hits, 12); assert.equal(s.speedLvl, 3, 'after 12 hits'); hitRow(0); assert.equal(s.speedLvl, 4, 'red contact');
});
test('breaker: paddle halves when the ball hits the top wall; 8-segment paddle angles', () => {
  const s = B.create(1); assert.equal(B.paddleW(s), 24); s.balls = [{ x: 112, y: B.TOP + 3, vx: 0, vy: -2, stuck: false }]; s.bricks = s.bricks.filter((b) => b.y > 100); B.step(s, F, {}); assert.equal(B.paddleW(s), 12);
  assert.deepEqual(B.SEG_ANGLES, [-60, -45, -30, -15, 15, 30, 45, 60]);
  const t = B.create(1); t.balls = [{ x: t.paddle.x - 11, y: B.PY - 2, vx: 0, vy: 1.5, stuck: false }]; B.moveBall(t, t.balls[0], 1); const ang = Math.atan2(t.balls[0].vx, -t.balls[0].vy) * 180 / Math.PI; assert.ok(Math.abs(ang + 60) < 0.01, 'left edge -> -60deg, got ' + ang);
});
test('breaker: clearing screen 1 gives screen 2; clearing screen 2 ends the game (classic)', () => {
  const s = B.create(1); s.bricks = []; B.step(s, F, {}); assert.equal(s.screen, 2); assert.equal(s.bricks.length, 112); s.bricks = []; B.step(s, F, {}); assert.ok(s.over && s.perfect);
  const d = B.create(1); d.balls = [{ x: 100, y: 260, vx: 0, vy: 2, stuck: false }]; B.step(d, F, {}); assert.equal(d.lives, 2);
  assert.ok(run(B, B.create(2), 60 * 120).score > 50);
});
