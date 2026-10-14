import test from 'node:test'; import assert from 'node:assert/strict';
import * as C from '../src/games/chomp.js'; import * as I from '../src/games/invaders.js'; import * as X from '../src/games/crossing.js'; import * as B from '../src/games/breaker.js';
import * as M from '../src/core/meta.js'; import * as S from '../src/core/scores.js';
const F = 1 / 60, G4 = { 'kibble-chomp': C, 'bark-invaders': I, 'pup-crossing': X, 'bone-breaker': B };
test('classic has no Inu twists', () => {
  const c = C.create(1); c.ready = 0; C.step(c, F, { a: true }); assert.equal(c.stats.barks, 0);
  const i = I.create(1); i.wave = 3; assert.equal(I.isBossWave(i), false); assert.ok(!B.create(1).bricks.some((b) => b.boss || b.power));
  const x = X.create(1); x.pup.row = 10; x.lanes.forEach((l) => (l.objs = [])); X.step(x, F, { a: true }); assert.equal(x.pup.row, 10);
});
test('Inu Chomp: bark stuns nearby cats (harmless while stunned); $KIBBLE coin', () => {
  const s = C.create(1, { inu: true }); s.ready = 0; const c = s.cats[0]; c.x = s.pac.x + 16; c.y = s.pac.y; C.step(s, F, { a: true }); assert.ok(c.stun > 0); c.x = s.pac.x; c.y = s.pac.y; C.step(s, F, {}); assert.equal(s.lives, 3);
  const k = C.create(1, { inu: true }); k.ready = 0; k.eaten = 99; k.pac.x = 9 * 8 + 4; k.pac.y = 23 * 8 + 4; k.pac.dir = 'left'; for (let i = 0; i < 8; i++) C.step(k, F, { left: true }); assert.ok(k.coin);
});
test('Inu Invaders: Mega Woof pierces a column; boss whale on wave 3', () => {
  const s = I.create(1, { inu: true }); s.ready = 0; s.ufoT = 1e9; const col = s.aliens.filter((a) => a.c === 5); s.player.x = col[0].x + 2;
  for (let i = 0; i < 60; i++) { s.player.x = col[0].x + 2; I.step(s, F, { a: true }); s.shot = null; } I.step(s, F, {}); assert.ok(col.every((a) => !a.alive)); assert.equal(s.stats.megas, 1);
  const b = I.create(1, { inu: true }); b.wave = 2; b.aliens.forEach((a) => (a.alive = false)); b.ready = 0; I.step(b, F, {}); assert.equal(b.wave, 3); assert.ok(b.boss);
});
test('Inu Crossing: zoomies leap 2 rows; lost puppy +300', () => {
  const s = X.create(1, { inu: true }); s.lanes.forEach((l) => { if (X.isRoad(l.row)) l.objs = []; }); X.step(s, F, { a: true }); assert.equal(s.pup.row, 12); assert.equal(s.score, 20);
  const t = X.create(1, { inu: true }); t.lanes.forEach((l) => (l.objs = [])); t.pup.carrying = true; t.pup.row = 2; t.pup.x = X.BAYS[2]; t.timerF = 60; X.step(t, F, {}); assert.equal(t.stats.rescued, 1); assert.equal(t.score, 50 + 0 + 300);
});
test('Inu Breaker: boss brick + power-ups + bone smash', () => {
  const s = B.create(1, { inu: true }); assert.ok(s.bricks.some((b) => b.boss)); assert.ok(s.bricks.some((b) => b.power)); s.balls[0].stuck = false; s.balls[0].vy = -1; s.balls[0].vx = 0.5; B.step(s, F, { a: true }); assert.equal(s.stats.smashes, 1);
  B.applyPower(s, 'multi'); assert.equal(s.balls.length, 3);
});
test('modes have separate boards; daily seed per day; weekly modifier rotates', () => {
  const db = {}; S.addScore(db, 'bone-breaker@inu', { name: 'AAA', score: 50 }); S.addScore(db, 'bone-breaker', { name: 'BBB', score: 10 });
  assert.equal(S.arcadeBoard(db, 'all', Date.now(), 10, 'inu')[0].name, 'AAA'); assert.equal(S.arcadeBoard(db, 'all')[0].name, 'BBB');
  const d = new Date(2026, 9, 15, 9).getTime(); assert.equal(M.dailySeed('pup-crossing', d), M.dailySeed('pup-crossing', d + 3600e3)); assert.notEqual(M.dailySeed('pup-crossing', d), M.dailySeed('pup-crossing', d + 864e5));
  assert.equal(new Set([0, 1, 2, 3].map((w) => M.weeklyModifier(d + w * 6048e5).id)).size, 4); assert.equal(M.modFor('classic', d), null);
});
test('ghost replays are deterministic in every game and mode', () => {
  for (const [id, G] of Object.entries(G4)) for (const mode of ['classic', 'inu']) {
    const mod = mode === 'inu' ? M.MODIFIERS[3] : null, seed = 4242; const s = M.applyMod(G.create(seed, { inu: mode === 'inu' }), mod); const masks = [];
    for (let i = 0; i < 60 * 30 && !s.over; i++) { const m = M.toMask(G.bot(s)); masks.push(m); G.step(s, F * (mod?.speed || 1), M.fromMask(m)); }
    const r = M.replay(G, { seed, mode, mod, rle: M.encode(masks) }); assert.equal(r.score, s.score, `${id} ${mode}`); assert.ok(s.score > 0, `${id} ${mode} scored`);
  }
});
test('achievements unlock once with fixed tickets', () => { const p = { tickets: 0 }; const got = M.evalAchievements(p, { game: 'bark-invaders', mode: 'inu', level: 3, stats: { best: 20, bosses: 1 } }); assert.equal(got.length, 4); assert.equal(M.evalAchievements(p, { game: 'bark-invaders', mode: 'inu', level: 3, stats: { best: 20, bosses: 1 } }).length, 0); });
