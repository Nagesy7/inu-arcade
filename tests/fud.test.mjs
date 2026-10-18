import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../src/games/fud.js';
import { joyMode } from '../src/core/joystick.js';
import * as V from '../src/core/verse.js';
const F = 1 / 60;
const run = (s, n, inp = {}) => { for (let i = 0; i < n && !s.over; i++) G.step(s, F, inp); };
const live = (opts = {}) => { const s = G.create(opts.seed || 1, opts); run(s, 91); assert.equal(s.phase, 'play'); s.nextBoss = 1e9; s.swarmT = 1e9; return s; };
const noSpawn = (s) => { s.spawnT = -1e9; return s; };
const addFoe = (s, type, dx, dy) => { s.spawnT = -1e9; const e = s.E.a[s.E.n++]; Object.assign(e, { uid: s.uid++, type, x: s.p.x + dx, y: s.p.y + dy, hp: G.FOES[type].hp, max: G.FOES[type].hp, spd: 0, r: G.FOES[type].r, flash: 0, kx: 0, ky: 0, t: 1, st: 0, dx: 0, dy: 0, orbCd: 0, boss: !!G.FOES[type].boss, elite: !!G.FOES[type].elite }); return e; };

test('fud swarm: name lives in one constant; META / size / two buttons / 8-way stick / verse district', () => {
  assert.equal(G.NAME, 'FUD Swarm'); assert.equal(G.META.id, 'fud-swarm'); assert.equal(G.W, 256); assert.equal(G.H, 256); assert.equal(G.META.buttons, 2); assert.ok(!G.META.coop2p);
  for (const k of ['blurb', 'controls', 'inuMove', 'classicNote']) assert.ok(G.META[k]);
  const src = readFileSync(new URL('../src/games/fud.js', import.meta.url), 'utf8'); assert.equal(src.match(/'FUD Swarm'/g).length, 1);
  assert.match(readFileSync(new URL('../scripts/build-pages.mjs', import.meta.url), 'utf8'), /Fud\.NAME/);
  assert.equal(joyMode('fud-swarm', true), '8way'); assert.deepEqual(G.META.verse, { district: 'fud-field', spawn: 'door-fud-swarm' });
  const v = V.readVerse(new URLSearchParams('from=verse'), { origin: 'https://inu-arcade.vercel.app', defaults: G.META.verse }); assert.equal(v.district, 'fud-field'); assert.equal(v.spawn, 'door-fud-swarm');
});

test('fud swarm: ready banner -> play; the timer scores +10 a second', () => {
  const s = G.create(1); assert.equal(s.phase, 'ready'); run(s, 91); assert.equal(s.phase, 'play'); noSpawn(s); s.nextBoss = s.swarmT = 1e9; s.p.inv = 1e9; const sc = s.score; run(s, 600); assert.equal(s.stats.secs, 10); assert.equal(s.score - sc >= 100, true);
});

test('fud swarm: entity pools are fixed size and never grow, even when the director is asked for more', () => {
  const s = live(); s.p.inv = 1e12; s.p.hp = 1e9; const caps = Object.fromEntries(['E', 'X', 'S', 'Q', 'M', 'Z', 'I'].map((k) => [k, s[k].a.length]));
  s.t = 60 * 30; s.swarmT = s.t; for (let i = 0; i < 1200; i++) { G.step(s, F, {}); if (s.phase === 'choose') G.pick(s, s.choice.opts[0]); }
  for (const [k, n] of Object.entries(caps)) { assert.equal(s[k].a.length, n, k + ' pool grew'); assert.ok(s[k].n <= s[k].cap); }
  assert.ok(s.E.n <= G.CAP.enemies && s.stats.maxOnScreen <= G.CAP.enemies); assert.ok(G.targetCount(99) < G.CAP.enemies);
});

test('fud swarm: when the crumb pool is full, new crumbs fold into the nearest one (XP is never lost)', () => {
  const s = noSpawn(live()); s.p.x = 100; s.p.y = 100; s.wep = {}; for (let i = 0; i < G.CAP.crumbs; i++) { const c = s.X.a[s.X.n++]; c.x = 600; c.y = 600; c.v = 1; c.fly = false; }
  const e = addFoe(s, 'bear', 400, 400); const tot = () => s.X.a.slice(0, s.X.n).reduce((a, c) => a + c.v, 0), before = tot(); G.hurt(s, e, 1e6); assert.equal(s.X.n, G.CAP.crumbs); assert.equal(tot(), before + G.FOES.bear.xp);
});

test('fud swarm: the Bark Ring fires on its own and pops nearby bots; kills drop kibble crumbs worth XP', () => {
  const s = noSpawn(live()); const e = addFoe(s, 'drone', 20, 0); e.hp = 1; run(s, 40); assert.ok(e.hp <= 0); assert.ok(s.stats.kills >= 1); assert.ok(s.X.n >= 1 || s.p.xp >= 1);
  run(s, 30); assert.ok(s.p.xp >= 1, 'crumb flew to the pup');
});

test('fud swarm: enough XP opens the level-up choice of 3; pick adds a trick or perk; it auto-picks after 12 s', () => {
  const s = noSpawn(live()); s.p.xp = G.need(1); run(s, 1); assert.equal(s.phase, 'choose'); assert.equal(s.choice.opts.length, 3);
  run(s, 25); G.step(s, F, { right: true }); G.step(s, F, {}); assert.equal(s.choice.sel, 1); const o = s.choice.opts[1]; G.step(s, F, { a: true }); assert.equal(s.phase, 'play'); assert.equal(s.p.lvl, 2);
  assert.equal(o.kind === 'w' ? s.wep[o.id] : s.pas[o.id], 1);
  s.p.xp = G.need(2); run(s, 1); assert.equal(s.phase, 'choose'); run(s, 60 * 12 + 2); assert.equal(s.phase, 'play');
});

test('fud swarm: at most 4 tricks and 4 perks; maxed out -> a snack option', () => {
  const s = live(); s.wep = { bark: 5, bone: 5, orbit: 5, gaze: 5 }; s.pas = { coat: 5, zoom: 5, nose: 5, teeth: 5 };
  assert.deepEqual(G.options(s), [{ kind: 's', id: 'snack', lvl: 1 }]); s.wep.gaze = 2; assert.ok(G.options(s).every((o) => o.id === 'gaze'));
});

test('fud swarm: every trick hits; orbit kibbles circle the pup', () => {
  for (const id of ['bone', 'gaze', 'tail', 'paw', 'orbit']) { const s = noSpawn(live()); s.wep = { [id]: 3 }; s.cd[id] = 1; s.p.fx = 1; s.p.fy = 0; s.p.inv = 1e9; const e = addFoe(s, 'paper', id === 'paw' ? 8 : 26, 0); e.hp = e.max = 1e6; run(s, 120); assert.ok(e.hp < 1e6, id + ' never hit'); }
  const s = live(); s.wep = { orbit: 2 }; assert.equal(G.orbitPts(s).length, 3);
});

test('fud swarm: Zoom Dash = invulnerable burst + cooldown; touching bots hurts', () => {
  const s = noSpawn(live()); s.p.inv = 0; const x = s.p.x; G.step(s, F, { a: true, right: true }); assert.ok(s.p.dashF > 0); run(s, 12, { right: true }); assert.ok(s.p.x - x > 30); assert.ok(s.p.dashCd > 0);
  const hp = s.p.hp; G.step(s, F, {}); G.step(s, F, { a: true }); assert.ok(s.p.dashF <= 0, 'cooldown blocks a second dash');
  s.p.inv = 0; s.wep = {}; addFoe(s, 'drone', 3, 0); run(s, 2); assert.ok(s.p.hp < hp);
});

test('fud swarm: Big Bark needs a full meter; Inu Mode adds the HODL shield (and the meter does not refill while shielded)', () => {
  const c = noSpawn(live()); G.step(c, F, { b: true }); assert.equal(c.stats.barks, 0); c.p.meter = 100; G.step(c, F, {}); G.step(c, F, { b: true }); assert.equal(c.stats.barks, 1); assert.equal(c.p.shield, 0);
  const s = noSpawn(live({ inu: true })); s.p.meter = 100; G.step(s, F, { b: true }); assert.equal(s.stats.howls, 1); assert.ok(s.p.shield > 0); s.p.inv = 0;
  const e = addFoe(s, 'drone', 2, 0); run(s, 2); assert.ok(e.hp <= 0, 'shield pops a touching bot'); assert.equal(s.p.hp, 100); assert.equal(s.p.meter, 0);
});

test('fud swarm: a boss arrives every 3 minutes with a warning; beating it drops a chest (level-up + heal) and Inu Mode a $KIBBLE coin', () => {
  const s = noSpawn(live({ inu: true })); s.nextBoss = s.t; run(s, 1); assert.ok(s.boss && s.boss.type === 'whale'); assert.ok(s.warn > 0); assert.ok(s.nextBoss >= s.t + G.BOSS_EVERY - 1, 'next boss 3 min later');
  G.hurt(s, s.boss, 1e9); assert.equal(s.boss, null); assert.equal(s.stats.bosses, 1); const kinds = s.I.a.slice(0, s.I.n).map((i) => i.kind); assert.ok(kinds.includes('chest') && kinds.includes('coin'));
  assert.deepEqual(G.BOSS_ORDER, ['whale', 'dump', 'king']); assert.equal(G.BOSS_EVERY, 180);
});

test('fud swarm: two lives = one SECOND WIND revive (bark + full HP), then game over', () => {
  const s = noSpawn(live()); s.p.hp = 0; run(s, 1); assert.equal(s.lives, 1); assert.equal(s.p.hp, s.p.maxHp); assert.equal(s.stats.revives, 1);
  s.p.hp = 0; s.p.inv = 0; run(s, 1); assert.equal(s.phase, 'dead'); run(s, 100); assert.equal(s.over, true);
});

test('fud swarm: difficulty ramps (more bots, tougher bots) and the bot plays a deterministic run', () => {
  assert.ok(G.targetCount(1) < G.targetCount(5) && G.targetCount(5) < G.targetCount(9)); assert.ok(G.hpMul(0) < G.hpMul(5) && G.hpMul(10) < G.hpMul(12));
  const play = (seed) => { const s = G.create(seed); let n = 0; while (!s.over && n++ < 60 * 200) G.step(s, F, G.bot(s)); return s; };
  const a = play(4), b = play(4); assert.equal(a.score, b.score); assert.ok(a.stats.kills > 50 && a.p.lvl >= 3);
});

test('fud swarm: bandana skins are cosmetic only (same run with or without)', () => {
  const play = (sk) => { const s = G.applySkin(G.create(9), sk); let n = 0; while (!s.over && n++ < 60 * 90) G.step(s, F, G.bot(s)); return [s.score, s.stats.kills, s.p.lvl]; };
  assert.deepEqual(play(['gold']), play([])); assert.deepEqual(play(['neon']), play([]));
});

test('fud swarm: ghost position follows the camera', () => {
  const s = live(); const g = G.ghostPos(s, s); assert.equal(Math.round(g.x), Math.round(s.p.x - s.cam.x)); assert.ok(g.y > G.AY - 10);
});
