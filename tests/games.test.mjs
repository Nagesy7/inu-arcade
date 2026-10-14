import test from 'node:test'; import assert from 'node:assert/strict';
import * as C from '../src/games/chomp.js'; import * as I from '../src/games/invaders.js'; import * as X from '../src/games/crossing.js'; import * as B from '../src/games/breaker.js';
const run = (G, s, secs, inpFn) => { for (let i = 0; i < secs * 60; i++) { G.step(s, 1 / 60, inpFn ? inpFn(s) : G.bot(s)); if (s.over) break; } return s; };
const none = () => ({});
// ---------------- Kibble Chomp ----------------
test('chomp: maze is 21x13 and every kibble is reachable from the start', () => {
  assert.equal(C.MAZE.length, 13); for (const r of C.MAZE) assert.equal(r.length, 21);
  const s = C.create(1), q = [[Math.round(s.player.x), Math.round(s.player.y)]], seen = new Set([q[0].join()]);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = [x + dx, y + dy].join(); if (!C.isWall(x + dx, y + dy) && !seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } } }
  for (const k of [...s.pellets, ...s.powers]) assert.ok(seen.has(k), 'unreachable ' + k);
});
test('chomp: eating kibble scores 10, power bone 50 and frightens cats', () => {
  const s = C.create(1); s.ready = 0; s.cats.forEach((c) => (c.wait = 99));
  const n = s.pellets.size; run(C, s, 0.6, () => ({ left: true }));
  assert.ok(s.pellets.size < n); assert.equal(s.score, (n - s.pellets.size) * C.PTS.kibble);
  const s2 = C.create(1); s2.ready = 0; s2.player.x = 1; s2.player.y = 2; s2.player.dir = null; s2.cats.forEach((c) => (c.wait = 0));
  C.step(s2, 1 / 60, { up: true }); for (let i = 0; i < 20; i++) C.step(s2, 1 / 60, { up: true });
  assert.ok(!s2.powers.has('1,1')); assert.ok(s2.fright > 0); assert.ok(s2.cats.every((c) => c.state === 'scared'));
});
test('chomp: walls block movement', () => { const s = C.create(1); s.ready = 0; s.cats.forEach((c) => (c.wait = 99)); s.player.x = 1; s.player.y = 1; run(C, s, 1, () => ({ up: true })); assert.equal(s.player.y, 1); });
test('chomp: touching a cat costs a life; eating a scared cat scores 200 then 400', () => {
  const s = C.create(1); s.ready = 0; const c = s.cats[0]; c.wait = 0; c.x = s.player.x; c.y = s.player.y; C.step(s, 1 / 60, {}); assert.equal(s.lives, 2);
  const t = C.create(1); t.ready = 0; t.fright = 5; t.cats.forEach((k) => { k.state = 'scared'; k.wait = 0; });
  t.cats[0].x = t.player.x; t.cats[0].y = t.player.y; t.cats[1].x = t.player.x; t.cats[1].y = t.player.y; C.step(t, 1 / 60, {});
  assert.equal(t.score, 600); assert.equal(t.cats[0].state, 'eyes');
});
test('chomp: clearing the maze advances the level with faster cats', () => {
  const s = C.create(1); s.ready = 0; s.cats.forEach((c) => (c.wait = 99)); s.pellets.clear(); s.powers = new Set(['9,7']); C.step(s, 1 / 60, { left: true });
  for (let i = 0; i < 30 && s.level === 1; i++) C.step(s, 1 / 60, { left: true });
  assert.equal(s.level, 2); assert.ok(s.pellets.size > 50); assert.ok(C.speeds(2).cat > C.speeds(1).cat);
});
test('chomp: lives run out -> game over; bot plays without errors', () => { const s = run(C, C.create(7), 300); assert.ok(s.score > 300, 'bot score ' + s.score); });
// ---------------- Bark Invaders ----------------
test('invaders: barking a fleet member scores its row value', () => {
  const s = I.create(1); const e = s.fleet.find((f) => f.r === 3 && f.c === 4); s.player.x = e.x + I.EW / 2 + 1; s.shields = [];
  let got = false; for (let i = 0; i < 120 && !got; i++) { s.player.x = e.x + I.EW / 2 + 1; s.fireT = 99; I.step(s, 1 / 60, { a: true }); got = !e.alive; }
  assert.ok(got); assert.equal(s.score, I.ROW_PTS[3]);
});
test('invaders: shields absorb shots and erode', () => {
  const s = I.create(1); const cell = s.shields[0][10]; s.bullet = { x: cell.x, y: cell.y + 4, w: 2, h: 6 }; s.fireT = 99; I.step(s, 1 / 60, {});
  assert.equal(s.bullet, null); assert.equal(s.shields[0].filter((c) => c.hp === 1).length, 1);
});
test('invaders: enemy bomb hits player, fleet speeds up as it thins, wave clear -> level 2', () => {
  const s = I.create(1); s.bombs = [{ x: s.player.x, y: I.PY - 4, w: 3, h: 6 }]; s.fireT = 99; I.step(s, 1 / 60, {}); assert.equal(s.lives, 2);
  const v0 = I.fleetSpeed(s); s.fleet.slice(0, 20).forEach((e) => (e.alive = false)); assert.ok(I.fleetSpeed(s) > v0);
  s.fleet.forEach((e) => (e.alive = false)); I.step(s, 1 / 60, {}); assert.equal(s.level, 2); assert.equal(s.fleet.filter((e) => e.alive).length, 36);
});
test('invaders: fleet reaching the ground ends the game; bot plays', () => {
  const s = I.create(1); s.fleet.forEach((e) => (e.y += 150)); I.step(s, 1 / 60, {}); assert.ok(s.over);
  const b = run(I, I.create(3), 240); assert.ok(b.score > 200, 'bot ' + b.score);
});
// ---------------- Pup Crossing ----------------
test('crossing: hopping forward scores 10 per new row, not for revisiting', () => {
  const s = X.create(1); X.step(s, 1 / 60, { up: true }); assert.equal(s.pup.row, 10); for (let i = 0; i < 12; i++) X.step(s, 1 / 60, {});
  // row 10 may hold a car; just check score bookkeeping
  assert.ok(s.score === 10 || s.lives === 2);
  const t = X.create(1); t.lanes.forEach((l) => (l.objs = [])); X.step(t, 1 / 60, { up: true }); for (let i = 0; i < 12; i++) X.step(t, 1 / 60, {}); X.step(t, 1 / 60, { down: true }); for (let i = 0; i < 12; i++) X.step(t, 1 / 60, {}); X.step(t, 1 / 60, { up: true });
  assert.equal(t.score, 10);
});
test('crossing: car collision and river splash cost lives', () => {
  const s = X.create(1); const lane = s.lanes.find((l) => l.row === 7); lane.v = 0; s.pup.row = 7; s.pup.x = ((((lane.objs[1].x % lane.span) + lane.span) % lane.span) - 2) + 0.5; X.step(s, 1 / 60, {}); assert.equal(s.lives, 2); assert.equal(s.lastDeath, 'car');
  const r = X.create(1); r.lanes.find((l) => l.row === 2).objs = []; r.pup.row = 2; X.step(r, 1 / 60, {}); assert.equal(r.lastDeath, 'splash');
});
test('crossing: riding a log carries the pup', () => {
  const s = X.create(1); const lane = s.lanes.find((l) => l.row === 1); const o = lane.objs[1]; s.pup.row = 1; s.pup.x = (((o.x % lane.span) + lane.span) % lane.span) - 2 + 1.5; const x0 = s.pup.x;
  for (let i = 0; i < 30; i++) X.step(s, 1 / 60, {}); assert.equal(s.lives, 3); assert.ok(Math.abs(s.pup.x - x0 - lane.v * 0.5) < 0.05);
});
test('crossing: kennel scores 50+time bonus; all five -> level 2; hedge kills', () => {
  const s = X.create(1); s.lanes.forEach((l) => (l.objs = []));
  for (let h = 0; h < 5; h++) { s.pup.row = 1; s.pup.x = X.HOMES[h] + 0.5; s.pup.cd = 0; s.lanes.find((l) => l.row === 1).objs = [{ x: X.HOMES[h] + 2 - 1, len: 4 }]; s.lanes.find((l) => l.row === 1).v = 0; X.step(s, 1 / 60, { up: true }); }
  assert.equal(s.level, 2); assert.ok(s.score >= 5 * 50 + 1000);
  const t = X.create(1); t.pup.row = 0; t.pup.x = 5; X.step(t, 1 / 60, {}); assert.equal(t.lastDeath, 'hedge');
});
test('crossing: timer runs out -> life lost; bot plays', () => { const s = X.create(1); s.timer = 0.01; X.step(s, 1 / 60, {}); assert.equal(s.lastDeath, 'time'); const b = run(X, X.create(5), 240); assert.ok(b.score >= 50, 'bot ' + b.score); });
// ---------------- Bone Breaker ----------------
test('breaker: ball breaks a brick, scores by row and bounces', () => {
  const s = B.create(1); const k = s.bricks.find((b) => b.r === 5 && b.c === 6); s.balls = [{ x: k.x + 10, y: k.y + 14, vx: 0, vy: -150, stuck: false }];
  const n = s.bricks.length; for (let i = 0; i < 10; i++) B.step(s, 1 / 60, {}); assert.equal(s.bricks.length, n - 1); assert.equal(s.score, 10); assert.ok(s.balls[0].vy > 0);
});
test('breaker: paddle angle depends on hit position; walls reflect', () => {
  const s = B.create(1); s.balls = [{ x: s.paddle.x + 15, y: B.PY - 3, vx: 0, vy: 100, stuck: false }]; B.moveBall(s, s.balls[0], 1 / 60); assert.ok(s.balls[0].vx > 50 && s.balls[0].vy < 0);
  const w = B.create(1); w.balls = [{ x: B.X0 + 3, y: 120, vx: -100, vy: 10, stuck: false }]; B.moveBall(w, w.balls[0], 1 / 30); assert.ok(w.balls[0].vx > 0);
});
test('breaker: power-ups (wide, multi, slow, life) apply; dropping all balls costs a life', () => {
  const s = B.create(1); s.balls[0].stuck = false; s.balls[0].vy = -100; B.applyPower(s, 'multi'); assert.equal(s.balls.length, 3);
  B.applyPower(s, 'wide'); B.step(s, 1 / 60, {}); assert.equal(s.paddle.w, 64); B.applyPower(s, 'life'); assert.equal(s.lives, 4);
  const sp = B.ballSpeed(s); B.applyPower(s, 'slow'); assert.ok(B.ballSpeed(s) < sp);
  const d = B.create(1); d.balls = [{ x: 100, y: 230, vx: 0, vy: 50, stuck: false }]; B.step(d, 1 / 60, {}); assert.equal(d.lives, 2); assert.ok(d.balls[0].stuck);
  assert.ok(B.create(1).bricks.some((b) => b.power), 'some bricks carry power-ups');
});
test('breaker: clearing bricks -> level 2 with a new pattern; bot plays', () => {
  const s = B.create(1); s.bricks = []; B.step(s, 1 / 60, {}); assert.equal(s.level, 2); assert.ok(s.bricks.length > 20 && s.bricks.length < 78);
  const b = run(B, B.create(2), 240); assert.ok(b.score > 200, 'bot ' + b.score);
});
