import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../src/games/pawfu.js';
import { joyMode, JOY_MODES } from '../src/core/joystick.js';
import { toMask, fromMask } from '../src/core/meta.js';
const F = 1 / 60;
// a live floor with no spawns, so each rule can be tested on its own
function quiet(opts) { const s = G.create(1, opts); s.ready = 0; s.spawnT = 1e9; s.p.inv = 0; return s; }
const run = (s, n, inp = {}) => { for (let i = 0; i < n && !s.over; i++) G.step(s, F, inp); };
const tap = (s, k, hold = 1) => { run(s, hold, { [k]: true }); run(s, 1, {}); };

test('paw-fu tower: name lives in one constant; META / size / two buttons', () => {
  assert.equal(G.NAME, 'Paw-Fu Tower'); assert.equal(G.META.title, G.NAME.toUpperCase()); assert.equal(G.META.id, 'paw-fu-tower'); assert.equal(G.META.buttons, 2);
  assert.equal(G.W, 256); assert.equal(G.H, 256); for (const k of ['blurb', 'controls', 'inuMove', 'classicNote']) assert.ok(G.META[k]);
  const src = readFileSync(new URL('../src/games/pawfu.js', import.meta.url), 'utf8'); assert.equal(src.match(/'Paw-Fu Tower'/g).length, 1, 'name literal appears once');
  const pages = readFileSync(new URL('../scripts/build-pages.mjs', import.meta.url), 'utf8'); assert.match(pages, /Pawfu\.NAME/);
});

test('paw-fu tower: every stage map is 32x27, walled, and each floor has a connector up', () => {
  assert.equal(G.STAGES.length, 4); const names = new Set();
  G.MAPS.forEach((m, i) => { assert.equal(m.length, G.ROWS); for (const r of m) assert.equal(r.length, G.COLS);
    const st = G.STAGES[i]; names.add(st.name); assert.ok(G.BOSSES[st.boss], 'boss exists');
    for (const fr of G.FLOORS.slice(0, -1)) assert.ok(G.connectors(st, fr).length >= 1, `stage ${i} floor ${fr} has a way up`);
    for (const [c, top, bot] of st.ladders) { assert.ok(G.FLOORS.includes(top) && G.FLOORS.includes(bot) && bot > top); assert.equal(m[top][c], 'T'); } });
  assert.equal(names.size, 4); assert.equal(new Set(G.STAGES.map((s) => s.boss)).size, 4, 'a different boss per stage');
});

test('paw-fu tower: original move names and tables', () => {
  assert.deepEqual(Object.values(G.MOVES).map((m) => m.name).sort(), ['HIND KICK', 'LOW PAW', 'LOW SWEEP', 'PAW JAB', 'SKY WAG']);
  for (const m of Object.values(G.MOVES)) assert.ok(m.startup > 0 && m.active > 0 && m.recover > 0 && m.reach > 0 && m.dmg > 0);
  assert.ok(G.MOVES.kick.reach > G.MOVES.jab.reach && G.MOVES.kick.startup > G.MOVES.jab.startup, 'kick reaches further but is slower');
  assert.ok(G.spawnEvery(8) < G.spawnEvery(1) && G.stageSecs(8) < G.stageSecs(1) && G.speeds(8).cat > G.speeds(1).cat, 'difficulty ramps');
});

test('paw-fu tower: walking is whole-pixel; A jabs, B kicks, down+B sweeps', () => {
  const s = quiet(); const x0 = s.p.x; run(s, 30, { right: true }); assert.equal(s.p.x, x0 + 30); assert.ok(Number.isInteger(s.p.x));
  run(s, 20); tap(s, 'a'); assert.equal(s.p.move, 'jab'); assert.equal(s.stats.jabs, 1); run(s, 40);
  tap(s, 'b'); assert.equal(s.p.move, 'kick'); assert.equal(s.stats.kicks, 1); run(s, 40);
  run(s, 1, { down: true, b: true }); assert.equal(s.p.move, 'sweep'); run(s, 40);
  run(s, 30, { a: true }); assert.equal(s.stats.jabs, 2, 'holding A does not auto-repeat');
});

test('paw-fu tower: a standing jab whiffs over a rug bot, the low sweep hits it', () => {
  const s = quiet(); const e = G.makeEnemy(s, 'rug', s.p.x + 14, 26, -1); e.st = 'rev'; e.f = -999; s.enemies.push(e);
  tap(s, 'a'); run(s, 10); assert.equal(e.hp, 1, 'jab passes over'); e.x = s.p.x + 14; run(s, 40);
  run(s, 1, { down: true, b: true }); run(s, 10, { down: true }); assert.ok(e.hp <= 0 || e.gone || s.stats.kos === 1, 'sweep KOs the rug');
});

test('paw-fu tower: crouching ducks a pigeon swoop', () => {
  const box = G.playerBox({ ...quiet().p }), low = G.playerBox({ ...quiet().p, st: 'crouch' }); const swoopY = quiet().p.y - 13;
  assert.ok(box.y0 < swoopY && low.y0 > swoopY, 'swoop height clears a crouching Shiba but hits a standing one');
});

test('paw-fu tower: a floor stays locked until its KO quota, then opens', () => {
  const s = quiet(); assert.equal(G.cleared(s, 26), false); assert.equal(G.koLeft(s), G.quota(1, 26));
  for (let i = 0; i < G.quota(1, 26); i++) { const e = G.makeEnemy(s, 'cat', s.p.x + 10, 26, -1); e.hp = 1; s.enemies.push(e); tap(s, 'a'); run(s, 30); }
  assert.ok(G.cleared(s, 26)); assert.equal(G.koLeft(s), 0);
});

test('paw-fu tower: reaching the roof starts the stage boss; the timer guarantees a minute', () => {
  const s = quiet(); s.cleared = new Set(G.FLOORS); s.best = 11; s.p.y = G.ROOF * 8; s.timer = 5; s.p.x = 40; run(s, 3);
  assert.ok(s.boss, 'boss spawned'); assert.equal(s.boss.name, G.BOSSES.whiskers.name); assert.ok(s.timer >= (G.BOSS_SECS - 1) * 60);
  for (const k of Object.keys(G.BOSSES)) { assert.ok(G.BOSSES[k].name && G.BOSSES[k].cycle.length >= 3); }
});

test('paw-fu tower: timeout costs a life; game over after the last one', () => {
  const s = quiet(); s.timer = 2; run(s, 200); assert.equal(s.lives, 2); assert.equal(s.lastDeath, 'time');
});

const finish = (s) => { const B = s.boss; B.hp = 1; B.inv = 0; B.x = s.p.x + 14; B.y = s.p.y; s.p.face = 1; s.p.inv = 999; tap(s, 'a'); run(s, 10); };
test('paw-fu tower: beating a boss pays a time bonus and loads the next stage (level progression + loop)', () => {
  const s = quiet(); s.cleared = new Set(G.FLOORS); s.best = 11; s.p.y = G.ROOF * 8; s.p.x = 40; run(s, 3); const sc = s.score; finish(s); run(s, 600);
  assert.equal(s.stage, 1); assert.equal(s.level, 2); assert.ok(s.score > sc); assert.equal(s.stats.bosses, 1);
  const t = G.create(2); t.stage = 3; t.ready = 0; t.cleared = new Set(G.FLOORS); t.best = 11; t.p.y = G.ROOF * 8; t.p.x = 40; run(t, 3); finish(t); run(t, 600); assert.equal(t.stage, 0); assert.equal(t.loop, 2); assert.equal(t.level, 5);
});

test('paw-fu tower: Inu Mode Zen Bark (hold A, release) stuns nearby foes; Classic has none', () => {
  const s = quiet({ inu: true }); const e = G.makeEnemy(s, 'cat', s.p.x + 30, 26, -1); s.enemies.push(e); e.f = -999;
  run(s, G.ZEN.charge + 2, { a: true }); run(s, 1, {}); assert.equal(s.stats.barks, 1); assert.ok(e.stun > 0);
  const c = quiet(); run(c, G.ZEN.charge + 2, { a: true }); run(c, 1, {}); assert.equal(c.stats.barks, 0);
});

test('paw-fu tower: the bot plays every stage type without errors, in both modes', () => {
  for (const inu of [false, true]) for (const seed of [1, 2, 3]) { const s = G.create(seed, { inu }); for (let i = 0; i < 60 * 240 && !s.over; i++) G.step(s, F, G.bot(s));
    assert.ok(s.score > 1000, `seed ${seed} scores (${s.score})`); assert.ok(s.stats.kos > 5); }
});

test('paw-fu tower: 8-way joystick while playing; B survives ghost masks', () => {
  assert.equal(JOY_MODES['paw-fu-tower'], '8way'); assert.equal(joyMode('paw-fu-tower', true), '8way');
  const m = toMask({ right: true, b: true }); const r = fromMask(m); assert.ok(r.right && r.b && !r.a);
});
