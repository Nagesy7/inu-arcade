import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../src/games/shiba.js';
import { joyMode } from '../src/core/joystick.js';
import { encode, decode, toMask, fromMask } from '../src/core/meta.js';
const F = 1 / 60;
const run = (s, n, inp = {}) => { for (let i = 0; i < n && !s.over; i++) G.step(s, F, inp); };
const tap = (s, k, extra = {}) => { run(s, 1, { ...extra, [k]: true }); run(s, 1, extra); };
// a live round with the player picked as `role`; bots frozen far away unless `keepBots`
function fight(role = 'bruno', { inu = false, keepBots = false, seed = 1 } = {}) { const s = G.create(seed, { inu }); run(s, 22); while (G.ROLE_IDS[s.pick] !== role) tap(s, 'right'); tap(s, 'a');
  assert.equal(s.phase, 'ready'); s.phaseT = 1; run(s, 1); assert.equal(s.phase, 'fight');
  if (!keepBots) for (const f of s.fighters) if (f.ctl === 'bot') { f.ctl = 'idle'; f.x = f.team === 0 ? 40 : 216; f.y = f.team === 0 ? 200 : 24; f.ai.mx = f.ai.my = 0; f.ai.a = false; }
  s.hz.t = 1e9; s.hz.st = 'idle'; return s; }
const foe = (s, i = 0) => s.fighters.filter((f) => f.team === 1)[i];
const place = (f, x, y) => { f.x = x; f.y = y; f.inv = 0; f.kx = f.ky = 0; f.stun = 0; };

test('shiba scuffle: name lives in one constant; META / size / three buttons / 8-way stick / verse district', () => {
  assert.equal(G.NAME, 'Shiba Scuffle'); assert.equal(G.META.id, 'shiba-scuffle'); assert.equal(G.W, 256); assert.equal(G.H, 256); assert.equal(G.META.buttons, 3); assert.equal(G.META.coop2p, true);
  for (const k of ['blurb', 'controls', 'inuMove', 'classicNote']) assert.ok(G.META[k]);
  const src = readFileSync(new URL('../src/games/shiba.js', import.meta.url), 'utf8'); assert.equal(src.match(/'Shiba Scuffle'/g).length, 1);
  assert.match(readFileSync(new URL('../scripts/build-pages.mjs', import.meta.url), 'utf8'), /Scuffle\.NAME/);
  assert.equal(joyMode('shiba-scuffle', true), '8way'); assert.deepEqual(G.META.verse, { district: 'arena', spawn: 'door-shiba-scuffle' });
});

test('shiba scuffle: four distinct roles; three arenas, each mirrored so both packs get the same map', () => {
  assert.deepEqual(G.ROLE_IDS, ['bruno', 'kiko', 'dango', 'zip']); assert.equal(new Set(G.ROLE_IDS.map((r) => G.ROLES[r].role)).size, 4);
  assert.equal(new Set(G.ROLE_IDS.map((r) => G.ROLES[r].atk + G.ROLES[r].sup)).size, 4);
  assert.deepEqual(G.ARENAS.map((a) => a.hazard), ['sprinkler', 'rugbot', 'surge']);
  const sw = (c) => (c === 'B' ? 'R' : c === 'R' ? 'B' : c);
  for (const m of G.MAPS) { assert.equal(m.length, G.ROWS); for (let r = 0; r < G.ROWS; r++) { assert.equal(m[r].length, G.COLS); for (let c = 0; c < G.COLS; c++) { assert.equal(sw(m[r][c]), m[r][G.COLS - 1 - c]); assert.equal(m[r][c], m[G.ROWS - 1 - r][c]); } } }
});

test('shiba scuffle: pick screen chooses your Shiba; bots fill a 3v3; ready -> fight', () => {
  const s = G.create(3); assert.equal(s.phase, 'pick'); run(s, 22); tap(s, 'right'); tap(s, 'right'); assert.equal(G.ROLE_IDS[s.pick], 'dango'); tap(s, 'a');
  assert.equal(s.fighters.length, 6); assert.equal(s.fighters.filter((f) => f.team === 0).length, 3); assert.equal(G.player(s).role, 'dango'); assert.equal(G.player(s).team, 0);
  assert.equal(new Set(s.fighters.filter((f) => f.team === 0).map((f) => f.role)).size, 3, 'your pack never doubles your role');
  run(s, 101); assert.equal(s.phase, 'fight');
});

test('shiba scuffle: the Big Bone slides toward the pack that out-numbers the other at it; contested = no move', () => {
  const s = fight(); const p = G.player(s), x0 = s.bone.x; place(p, s.bone.x, s.bone.y); run(s, 30); assert.ok(s.bone.x < x0 - 1, 'blue pulls it west');
  const r = foe(s); place(r, s.bone.x + 4, s.bone.y); r.ctl = 'idle'; const x1 = s.bone.x; for (let i = 0; i < 30; i++) { place(p, s.bone.x, s.bone.y); place(r, s.bone.x + 4, s.bone.y); run(s, 1); } assert.ok(Math.abs(s.bone.x - x1) < 0.01, 'one each = stays');
  assert.ok(s.stats.bonePx > 0);
});

test('shiba scuffle: bone home wins the round early (+time bonus); first to 2 wins the match, +1 life, next rank', () => {
  const s = fight(); const L = s.lives; s.bone.x = G.BONE.blueWin + 0.05; place(G.player(s), s.bone.x, s.bone.y); const sc = s.score; run(s, 2);
  assert.equal(s.phase, 'roundEnd'); assert.equal(s.wins[0], 1); assert.ok(s.lastRound.early); assert.ok(s.score - sc >= G.PTS.round);
  run(s, 151); assert.equal(s.phase, 'ready'); s.phaseT = 1; run(s, 1); s.bone.x = G.BONE.blueWin + 0.05; place(G.player(s), s.bone.x, s.bone.y); run(s, 2);
  assert.equal(s.phase, 'matchEnd'); assert.ok(s.lastMatch.won && s.lastMatch.flawless); assert.equal(s.lives, L + 1); assert.equal(s.stats.flawless, 1);
  run(s, 211); assert.equal(s.match, 2); assert.equal(s.arena, 1); assert.equal(G.rankOf(2), 'SCRAPPER');
});

test('shiba scuffle: losing a round costs a life; lives 0 = game over; timer decides by bone side', () => {
  const s = fight(); s.lives = 1; s.timer = 2; s.bone.x = G.BONE.x0 + 10; for (const f of s.fighters) place(f, 128, 30); run(s, 3); assert.equal(s.lastRound.winner, 1); assert.equal(s.lives, 0);
  run(s, 160); assert.ok(s.over);
});

test('shiba scuffle: every role has its own attack and a super that needs a full meter', () => {
  for (const role of G.ROLE_IDS) { const s = fight(role); const p = G.player(s), o = foe(s); place(p, 100, 120); p.cd = 0; o.ctl = 'idle'; place(o, 100 + Math.min(40, G.ROLES[role].range - 6), 120); o.maxHp = o.hp = 999;
    run(s, 1, { right: true, a: true }); run(s, 40); assert.ok(o.hp < 999, role + ' attack lands'); assert.ok(p.sup > 0, role + ' builds super');
    p.sup = 50; run(s, 1, { b: true }); run(s, 1); assert.notEqual(p.sup, 0, 'no super below full');
    p.sup = G.SUPER.full; const hp = (o.hp = 999); place(o, p.x + (role === 'zip' ? 10 : 20), p.y); run(s, 1, { b: true }); assert.equal(p.sup, 0, role + ' super fires'); run(s, 60); assert.ok(o.hp < hp || role === 'dango' && s.zones.length, role + ' super does something'); }
});

test('shiba scuffle: dodge roll = brief invulnerability + cooldown; bushes hide you from far enemies', () => {
  const s = fight(); const p = G.player(s); place(p, 120, 120); tap(s, 'c'); assert.ok(p.rollF > 0 || p.inv > 0); assert.ok(G.hurt(s, foe(s), p, 50) === false && p.hp === p.maxHp, 'invulnerable mid-roll');
  assert.ok(p.rollCd > 0); run(s, 80);
  let bush = null; for (let r = 0; r < G.ROWS && !bush; r++) for (let c = 0; c < G.COLS; c++) if (s.map[r][c] === '"') { bush = { x: c * 16 + 8, y: r * 16 + 8 }; break; }
  const o = foe(s); place(o, bush.x, bush.y); o.flash = 0; o.act = null; for (const f of s.fighters) if (f.team === 0) place(f, 128, 200); assert.equal(G.seen(s, o), false); place(p, o.x + 10, o.y); assert.equal(G.seen(s, o), true);
});

test('shiba scuffle: arena hazards fire on a warning (sprinkler / rug bot / boardwalk surge)', () => {
  const s = fight(); s.hz.st = 'idle'; s.hz.t = 1; const p = G.player(s), sp = G.SPRINKLERS(s)[0]; place(p, sp.x + 10, sp.y); run(s, 2); assert.equal(s.hz.st, 'warn'); run(s, 40); place(p, sp.x + 10, sp.y); run(s, 2); assert.ok(p.hp < p.maxHp && p.slow > 0, 'sprayed');
  assert.ok(G.inBand({ band: 0 }, 30) && !G.inBand({ band: 0 }, 120) && G.inBand({ band: 1 }, 200));
});

test('shiba scuffle: Inu Mode drops a $KIBBLE coin mid-round; Pack Rally heals packmates when a super lands', () => {
  const s = fight('dango', { inu: true }); s.timer = 30 * 60; run(s, 2); assert.ok(s.items.some((i) => i.kind === 'coin'));
  const p = G.player(s), m = s.fighters.find((f) => f.team === 0 && f !== p); place(p, 120, 120); place(m, 130, 120); m.hp = 20; p.sup = G.SUPER.full; run(s, 1, { b: true }); run(s, 1); assert.ok(m.hp >= 45); assert.equal(s.stats.rallies, 1);
  const c = fight('dango'); c.timer = 30 * 60; run(c, 2); assert.ok(!c.items.some((i) => i.kind === 'coin'), 'Classic has no coins');
});

test('shiba scuffle: desktop P2 joins as a packmate; the run becomes unranked (co-op)', () => {
  const s = fight('kiko', { keepBots: true }); assert.equal(s.unranked, false); run(s, 1, { p2: { a: true } }); run(s, 1, { p2: {} });
  const p2 = s.fighters.find((f) => f.ctl === 'p2'); assert.ok(p2 && p2.team === 0); assert.equal(s.unranked, true);
  const x = p2.x; p2.stun = 0; p2.act = null; p2.rollF = 0; run(s, 20, { p2: { right: true } }); assert.ok(p2.x > x, 'P2 moves with its own keys');
});

test('shiba scuffle: bots get tougher by rank; the bot plays a deterministic run and wins rounds', () => {
  assert.ok(G.skill(1).dmg < G.skill(4).dmg && G.skill(4).dmg < G.skill(8).dmg); assert.ok(G.skill(1).react > G.skill(6).react);
  const play = (seed) => { const s = G.create(seed); let n = 0; while (!s.over && n++ < 60 * 400) G.step(s, F, G.bot(s)); return s; };
  const a = play(5), b = play(5); assert.equal(a.score, b.score); assert.ok(a.stats.roundsWon >= 1 && a.stats.kos >= 1);
});

test('shiba scuffle: bandana skins are cosmetic only (same run with or without)', () => {
  const play = (sk) => { const s = G.applySkin(G.create(9), sk); let n = 0; while (!s.over && n++ < 60 * 120) G.step(s, F, G.bot(s)); return [s.score, s.match, s.lives]; };
  assert.deepEqual(play(['gold']), play([])); assert.deepEqual(play(['neon']), play([]));
});

test('shiba scuffle: ghost tape keeps the C (roll) button', () => {
  const m = [toMask({ c: true }), toMask({ a: true, c: true, left: true })]; const ms = [...m, ...m, 0, 0]; assert.deepEqual(decode(encode(ms)), ms); assert.equal(fromMask(m[0]).c, true);
});
