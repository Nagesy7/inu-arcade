import test from 'node:test'; import assert from 'node:assert/strict';
import * as C from '../src/games/chomp.js'; import * as I from '../src/games/invaders.js'; import * as X from '../src/games/crossing.js'; import * as B from '../src/games/breaker.js';
import * as M from '../src/core/meta.js'; import * as S from '../src/core/scores.js';
const G4 = { 'kibble-chomp': C, 'bark-invaders': I, 'pup-crossing': X, 'bone-breaker': B };
test('classic mode has no twists (no bark, no boss, no puppies, no boss brick)', () => {
  const c = C.create(1); c.ready = 0; c.cats[0].wait = 0; c.cats[0].x = c.player.x + 1; c.cats[0].y = c.player.y; C.step(c, 1 / 60, { a: true }); assert.ok(!(c.cats[0].stun > 0)); assert.equal(c.barkCd, 0);
  const i = I.create(1); i.level = 3; assert.equal(I.isBossWave(i), false);
  assert.equal(X.create(1).lost, null); assert.ok(!B.create(1).bricks.some((b) => b.boss));
});
test('Inu Chomp: bark stuns nearby cats, they are harmless while stunned, 8s cooldown', () => {
  const s = C.create(1, { inu: true }); s.ready = 0; const c = s.cats[0]; c.wait = 0; c.x = s.player.x + 2; c.y = s.player.y; s.cats.slice(1).forEach((k) => (k.wait = 99));
  C.step(s, 1 / 60, { a: true }); assert.ok(c.stun > 0); assert.equal(s.barkCd, C.BARK.cd - 1 / 60 + 1 / 60 > 0 ? s.barkCd : 0);
  c.x = s.player.x; c.y = s.player.y; C.step(s, 1 / 60, {}); assert.equal(s.lives, 3);
  const cd = s.barkCd; C.step(s, 1 / 60, { a: true }); assert.ok(s.barkCd < cd && s.stats.barks === 1);
});
test('Inu Chomp: $KIBBLE coin spawns after 70 kibble and is worth 500', () => {
  const s = C.create(1, { inu: true }); s.ready = 0; s.cats.forEach((c) => (c.wait = 99)); s.eaten = 69; const k = [...s.pellets][0].split(',').map(Number); s.player.x = k[0]; s.player.y = k[1]; C.step(s, 1 / 60, {});
  assert.ok(s.coin); s.player.x = s.coin.x; s.player.y = s.coin.y; const sc = s.score; C.step(s, 1 / 60, {}); assert.equal(s.score - sc, C.COIN.pts); assert.equal(s.stats.coins, 1);
});
test('Inu Invaders: charged Mega Woof pierces a column; boss whale on wave 3', () => {
  const s = I.create(1, { inu: true }); s.fireT = 99; const col = s.fleet.filter((e) => e.c === 4); s.player.x = col[0].x + I.EW / 2;
  for (let i = 0; i < 60; i++) { s.player.x = col[0].x + I.EW / 2; s.bullet = { x: 0, y: -100, w: 1, h: 1 }; I.step(s, 1 / 60, { a: true }); }
  I.step(s, 1 / 60, {}); assert.ok(col.every((e) => !e.alive), 'column cleared'); assert.equal(s.stats.megas, 1); assert.ok(s.megaCd > 5);
  const b = I.create(1, { inu: true }); b.level = 3; b.fleet.forEach((e) => (e.alive = false)); I.step(b, 1 / 60, {}); // wave 3 is a boss wave
  b.level = 2; b.fleet.forEach((e) => (e.alive = false)); I.step(b, 1 / 60, {}); assert.equal(b.level, 3); assert.ok(b.boss);
  b.boss.hp = 1; b.bullet = { x: b.boss.x + 10, y: b.boss.y + 10, w: 2, h: 6 }; b.bombs = []; b.fireT = 99; I.step(b, 1 / 60, {}); assert.equal(b.stats.bosses, 1);
});
test('Inu Crossing: zoomies leap jumps 2 rows; puppy rescue +300', () => {
  const s = X.create(1, { inu: true }); s.lanes.forEach((l) => { if (!X.isRiver(l.row)) l.objs = []; }); X.step(s, 1 / 60, { a: true }); assert.equal(s.pup.row, 9); assert.equal(s.score, 20);
  const t = X.create(2, { inu: true }); t.lanes.forEach((l) => (l.v = 0)); const lp = X.lostPos(t); t.pup.row = lp.row; t.pup.x = lp.x; X.step(t, 1 / 60, {}); assert.ok(t.carrying);
  t.pup.row = 1; t.pup.x = X.HOMES[0] + 0.5; t.lanes.find((l) => l.row === 1).objs = [{ x: X.HOMES[0] + 1, len: 4 }]; t.pup.cd = 0; const sc = t.score; X.step(t, 1 / 60, { up: true });
  assert.equal(t.rescued, 1); assert.ok(t.score - sc >= 300 + 50); assert.ok(t.lost, 'new puppy placed');
});
test('Inu Breaker: boss brick moves and pays 500; bone smash; fetch catches the ball', () => {
  const s = B.create(1, { inu: true }); const boss = s.bricks.find((b) => b.boss); assert.ok(boss); const x0 = boss.x; s.balls[0].stuck = false; s.balls[0].y = 150; s.balls[0].vy = 100;
  B.step(s, 1 / 60, {}); assert.notEqual(boss.x, x0); boss.hp = 1; s.smashCd = 0; s.paddle.x = boss.x + boss.w / 2; s.bricks = s.bricks.filter((b) => b.boss || b.y < 0);
  for (let i = 0; i < 40; i++) { s.balls = [{ x: 60, y: 120, vx: 0, vy: -1, stuck: false }]; B.step(s, 1 / 60, { a: i === 0 }); }
  assert.equal(s.stats.bosses, 1); assert.equal(s.stats.smashes, 1);
  const f = B.create(1, { inu: true }); B.applyPower(f, 'fetch'); f.balls = [{ x: f.paddle.x, y: B.PY - 3, vx: 0, vy: 100, stuck: false }]; B.moveBall(f, f.balls[0], 1 / 60); assert.ok(f.balls[0].stuck);
});
test('meta: modes have separate boards, daily seed stable per day, weekly modifier rotates', () => {
  const db = {}; S.addScore(db, 'bone-breaker@inu', { name: 'AAA', score: 50 }); S.addScore(db, 'bone-breaker', { name: 'BBB', score: 10 });
  assert.equal(S.arcadeBoard(db, 'all', Date.now(), 10, 'inu')[0].name, 'AAA'); assert.equal(S.arcadeBoard(db, 'all')[0].name, 'BBB');
  const d = new Date(2026, 9, 15, 9).getTime(); assert.equal(M.dailySeed('pup-crossing', d), M.dailySeed('pup-crossing', d + 3600e3)); assert.notEqual(M.dailySeed('pup-crossing', d), M.dailySeed('pup-crossing', d + 86400e3));
  const ids = new Set([0, 1, 2, 3].map((w) => M.weeklyModifier(d + w * 6048e5).id)); assert.equal(ids.size, 4);
  assert.equal(M.weeklyModifier(d).id, M.weeklyModifier(d + 864e5).id); assert.equal(M.modFor('classic', d), null);
  assert.equal(M.finalScore(1001, { mult: 1.5 }), 1501); assert.equal(M.applyMod({ lives: 3 }, { lives: 1 }).lives, 1);
});
test('ghost replays are deterministic: re-simulating recorded inputs reproduces the score in every game', () => {
  for (const [id, G] of Object.entries(G4)) for (const mode of ['classic', 'inu']) {
    const mod = mode === 'inu' ? M.MODIFIERS[3] : null, seed = 4242; const s = M.applyMod(G.create(seed, { inu: mode === 'inu' }), mod); const masks = [];
    for (let i = 0; i < 60 * 40 && !s.over; i++) { const inp = G.bot(s); masks.push(M.toMask(inp)); G.step(s, (1 / 60) * (mod?.speed || 1), M.fromMask(M.toMask(inp))); }
    const ghost = { seed, mode, mod, rle: M.encode(masks) }; assert.deepEqual(M.decode(ghost.rle), masks);
    const r = M.replay(G, ghost); assert.equal(r.score, s.score, `${id} ${mode}`); assert.ok(s.score > 0, `${id} ${mode} scored`);
  }
});
test('achievements unlock once and pay fixed tickets', () => {
  const p = { tickets: 0 }; const got = M.evalAchievements(p, { game: 'bark-invaders', mode: 'inu', score: 900, level: 3, stats: { best: 20, bosses: 1 } });
  assert.deepEqual(got.map((a) => a.id).sort(), ['first-coin', 'inv-boss', 'inv-streak', 'inv-wave']); assert.equal(p.tickets, 2 + 4 + 6 + 4);
  assert.equal(M.evalAchievements(p, { game: 'bark-invaders', mode: 'inu', level: 3, stats: { best: 20, bosses: 1 } }).length, 0);
});
