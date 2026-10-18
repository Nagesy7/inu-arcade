// PAW-FU TOWER (working name: pending Zachary's approval; rename via NAME below) — original Inu climb-and-fight cabinet.
// A Shiba martial artist climbs a five-floor tower section per stage (ladders, ledge steps, drop gaps), fighting patterned
// enemies with original Inu moves (Paw Jab, Hind Kick, Low Sweep, Sky Wag), then beats the stage boss on the roof.
// Four original stages and bosses, then the tower loops harder. Classic = the core moves; Inu Mode adds the Zen Bark
// (hold A, release) and $KIBBLE coin drops. 256x256 native, fixed 60 Hz steps, integer-pixel movement.
import { rng } from '../core/rng.js';
export const NAME = 'Paw-Fu Tower'; // single source of the player-facing name (working name)
export const META = { id: 'paw-fu-tower', title: NAME.toUpperCase(), short: 'PAW-FU', color: '#ff8a3c', buttons: 2,
  blurb: 'Climb the tower floor by floor. Paw Jab and Hind Kick through alley cats, rug bots, pigeons and ninja rats, then beat the boss on the roof.',
  controls: 'Arrows walk / climb / crouch, UP jumps · A (Space/Z) Paw Jab · B (X/K) Hind Kick · DOWN+B Low Sweep · B in the air: Sky Wag',
  inuMove: 'ZEN BARK: hold A, release when the paw glows to stun every enemy close by (6 s cooldown). $KIBBLE coins (+500) drop from every 6th KO.',
  classicNote: 'Paw Jab, Hind Kick, Low Sweep and Sky Wag only.' };
export const W = 256, H = 256, OY = 20, COLS = 32, ROWS = 27, TILE = 8;
export const FLOORS = [26, 21, 16, 11, 6]; // floor rows, bottom to roof
export const ROOF = 6;
// ---------- original stage layouts ----------
// gaps: [c0, c1] holes in a floor (drop through); ladders: [col, topFloorRow, bottomFloorRow]; ledges: [row, c0, c1]
// (ledge steps sit 2 rows above a floor: hop onto the ledge, then hop up through the floor above).
export const STAGES = [
  { name: 'LANTERN GATE', boss: 'whiskers', types: ['cat', 'rug'], wall: '#3a2050', trim: '#ff5d73',
    gaps: { 21: [[12, 14]], 16: [[21, 23]], 11: [[5, 7]] }, ladders: [[27, 21, 26], [4, 16, 21], [24, 11, 16], [14, 6, 11]], ledges: [[24, 6, 9], [19, 17, 20], [14, 10, 13], [9, 26, 29]] },
  { name: 'LAUNDRY LOFTS', boss: 'rollo', types: ['cat', 'rug', 'pigeon'], wall: '#1f3a4a', trim: '#7ef0ff',
    gaps: { 21: [[6, 8], [22, 23]], 16: [[13, 16]], 11: [[3, 4], [26, 28]] }, ladders: [[16, 21, 26], [28, 16, 21], [9, 11, 16], [21, 6, 11]], ledges: [[24, 25, 28], [19, 2, 5], [14, 18, 21], [9, 6, 9]] },
  { name: 'PIGEON SPIRE', boss: 'coocoo', types: ['pigeon', 'cat', 'rat'], wall: '#2a3a24', trim: '#c8f04e',
    gaps: { 21: [[17, 19]], 16: [[4, 6], [25, 27]], 11: [[14, 17]] }, ladders: [[3, 21, 26], [20, 16, 21], [11, 11, 16], [28, 6, 11]], ledges: [[24, 12, 15], [19, 10, 13], [14, 21, 24], [9, 8, 11]] },
  { name: 'SHADOW PAGODA', boss: 'squeaks', types: ['cat', 'rug', 'pigeon', 'rat'], wall: '#2a1a1a', trim: '#f2c14e',
    gaps: { 21: [[9, 11], [24, 26]], 16: [[16, 18]], 11: [[6, 7], [20, 22]] }, ladders: [[18, 21, 26], [6, 16, 21], [27, 11, 16], [11, 6, 11]], ledges: [[24, 2, 5], [19, 22, 25], [14, 12, 15], [9, 24, 27]] },
];
export function buildMap(st) {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill(' '));
  for (let r = 0; r < ROWS; r++) { g[r][0] = '|'; g[r][COLS - 1] = '|'; }
  for (const fr of FLOORS) for (let c = 1; c < COLS - 1; c++) if (!(st.gaps[fr] || []).some(([a, b]) => c >= a && c <= b)) g[fr][c] = '=';
  for (const [r, a, b] of st.ledges) for (let c = a; c <= b; c++) g[r][c] = '-';
  for (const [c, top, bot] of st.ladders) { for (let r = top + 1; r < bot; r++) g[r][c] = 'H'; g[top][c] = 'T'; }
  return g.map((r) => r.join(''));
}
export const MAPS = STAGES.map(buildMap);
// ---------- tables (all original) ----------
export const PTS = { hit: 10, ko: { cat: 100, rug: 150, pigeon: 120, rat: 200 }, tier: 50, boss: (stage) => 1500 + 500 * stage, timeBonus: 10, combo: 10, coin: 500, bark: 30, extraLifeAt: 20000 };
export const HP_MAX = 10; export const HEAL = { open: 1, boss: HP_MAX }; // +1 HP when a floor opens, full HP after a boss
// moves: frames at 60 Hz; reach in px from the body centre; y0..y1 hitbox rows relative to the feet (negative = up)
export const MOVES = {
  jab: { name: 'PAW JAB', startup: 3, active: 4, recover: 7, reach: 15, y0: -14, y1: -8, dmg: 1, push: 2 },
  kick: { name: 'HIND KICK', startup: 6, active: 5, recover: 11, reach: 21, y0: -12, y1: -6, dmg: 2, push: 4 },
  lowjab: { name: 'LOW PAW', startup: 3, active: 4, recover: 7, reach: 13, y0: -8, y1: -2, dmg: 1, push: 2 },
  sweep: { name: 'LOW SWEEP', startup: 5, active: 6, recover: 13, reach: 22, y0: -5, y1: 0, dmg: 2, push: 3 },
  sky: { name: 'SKY WAG', startup: 2, active: 600, recover: 4, reach: 12, y0: -6, y1: 3, dmg: 2, push: 3 },
};
export const ZEN = { charge: 36, radius: 44, stun: 2.2, cd: 6 }; // Inu Mode: frames to charge, px, s, s
export const PHYS = { walk: 1.0, climb: 0.8, jumpV: -3.0, grav: 0.16, maxFall: 3.2, jumpCd: 6 };
export const DMG = { bump: 1, pounce: 2, rug: 1, charge: 2, swoop: 2, dash: 2, boss: 2, bossBig: 3, shot: 2 };
export const HURT = { inv: 50, stun: 14, knock: 1.5 };
export function speeds(L) { L = Math.min(L, 12);
  return { cat: Math.min(0.9, 0.42 + 0.04 * L), rug: Math.min(1.6, 0.75 + 0.07 * L), fly: Math.min(1.4, 0.65 + 0.05 * L), swoop: Math.min(3, 1.8 + 0.1 * L), dash: Math.min(3.6, 2.4 + 0.1 * L) }; }
export function windups(L) { L = Math.min(L, 12); return { cat: Math.max(12, 32 - 2 * L), rug: Math.max(16, 38 - 2 * L), coo: Math.max(16, 40 - 2 * L), glint: Math.max(10, 30 - 2 * L) }; }
export const chargeX = (L) => Math.min(2, 1.4 + 0.08 * (L - 1)); // rug charge = roll speed x this
export const spawnEvery = (L) => Math.max(1.2, 2.6 - 0.15 * (L - 1)); // seconds between spawns (x2.5 once the floor is open)
export const maxEnemies = (L) => Math.min(5, 2 + Math.floor(L / 2));
export const stageSecs = (L) => Math.max(90, 160 - 8 * (L - 1));
export const bossHp = (stage, loop) => [12, 14, 14, 16][stage] + 3 * (loop - 1);
export const COIN_EVERY = 6, RESPAWN_TIME = 30;
const DIRS = ['left', 'right', 'up', 'down'];
// ---------- map helpers ----------
const tile = (s, c, r) => (r < 0 || r >= ROWS || c < 0 || c >= COLS ? '|' : MAPS[s.stage][r][c]);
export const isPlat = (ch) => ch === '=' || ch === '-' || ch === 'T';
// a floor's way up (its ladders and ledge steps) stays folded away until you KO that floor's quota of enemies
export const cleared = (s, fr) => fr === ROOF || s.cleared.has(fr);
const platAt = (s, c, r) => { const ch = tile(s, c, r); return ch === '-' ? cleared(s, tierOf(r * 8)) : isPlat(ch); };
export const standAt = (s, x, y) => y % 8 === 0 && (platAt(s, (x - 3) >> 3, y >> 3) || platAt(s, (x + 3) >> 3, y >> 3));
export const quota = (L, fr) => Math.min(5, 2 + Math.floor((L - 1) / 2) + (fr <= 16 && L > 1 ? 1 : 0)); // KOs needed to open a floor
export const tierOf = (y) => { let best = 26; for (const fr of FLOORS) if (fr * 8 >= y && fr < best) best = fr; return best; };
const ladderCol = (s, x, r) => { const c = x >> 3; for (const cc of [c, c - 1, c + 1]) { const ch = tile(s, cc, r); if ((ch === 'H' || ch === 'T') && Math.abs(cc * 8 + 4 - x) <= 5) return cc; } return -1; };
export const connectors = (st, fr) => [...st.ladders.filter((l) => l[2] === fr).map((l) => ({ kind: 'ladder', x: l[0] * 8 + 4 })), ...st.ledges.filter((l) => l[0] === fr - 2).map((l) => ({ kind: 'ledge', x: ((l[1] + l[2] + 1) * 8) / 2, row: l[0] }))];
const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y: y + OY, c, n }), pop = (s, x, y, text, c = '#fbf1e0') => s.pops.push({ x, y: y + OY, text, c, t: 1 });
// ---------- create ----------
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, loop: 1, stage: 0, over: false, t: 0, frame: 0, acc: 0, ev: [], fx: [], pops: [], shake: 0, flash: 0, extra: false,
    stats: { jabs: 0, kicks: 0, kos: 0, hits: 0, bosses: 0, stages: 0, coins: 0, barks: 0, maxCombo: 0, sweeps: 0, skys: 0, tiers: 0 } };
  loadStage(s); return s;
}
function loadStage(s) {
  s.level = (s.loop - 1) * STAGES.length + s.stage + 1; s.timer = stageSecs(s.level) * 60; s.best = 26; s.enemies = []; s.shots = []; s.boss = null; s.bossDone = false;
  s.spawnT = 40; s.koN = s.koN || 0; s.cleared = new Set(); s.kosHere = 0; s.coin = null; s.clearing = 0; s.hitstop = 0; s.waves = []; resetPlayer(s, 26, 3 * 8 + 4); s.ready = 100;
}
function resetPlayer(s, fr, x) { s.p = { x, y: fr * 8, vy: 0, vyAcc: 0, xAcc: 0, face: 1, st: 'stand', f: 0, hp: HP_MAX, inv: 60, ladder: -1, move: null, atkId: 0, hitIds: new Set(), knock: 0, jumpCd: 0, charge: 0, zenCd: 0, combo: 0, comboT: 0, prevA: false, prevB: false, anim: 0, crouch: false }; }
// ---------- step ----------
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.flash = Math.max(0, s.flash - dt); s.shake = Math.max(0, s.shake - dt);
  s.inp = inp; s.acc += dt * 60; while (s.acc >= 1 && !s.over) { s.acc -= 1; frame(s, inp); }
}
function frame(s, inp) {
  s.frame++; s.t += 1 / 60; const p = s.p;
  const a = !!inp.a, b = !!inp.b, aP = a && !p.prevA, bP = b && !p.prevB, aR = !a && p.prevA; p.prevA = a; p.prevB = b;
  if (s.ready > 0) { s.ready--; return; }
  if (s.hitstop > 0) { s.hitstop--; return; }
  if (s.clearing > 0) { if (--s.clearing === 0) nextStage(s); return; }
  if (s.dying > 0) { if (--s.dying === 0) afterDeath(s); return; }
  if (--s.timer <= 0) { s.lastDeath = 'time'; pop(s, p.x, p.y - 24, 'TIME UP!', '#ff5d73'); return loseLife(s); }
  playerFrame(s, inp, aP, bP, aR);
  if (s.dying || s.clearing) return;
  spawner(s);
  for (const e of s.enemies) enemyFrame(s, e);
  if (s.boss) bossFrame(s, s.boss);
  shotsFrame(s);
  hits(s); if (s.dying) return;
  contact(s);
  s.enemies = s.enemies.filter((e) => !e.gone);
  if (s.coin && --s.coin.f <= 0) s.coin = null;
  if (s.coin && Math.abs(s.coin.x - p.x) < 8 && Math.abs(s.coin.y - p.y) < 10) { s.score += PTS.coin; s.stats.coins++; s.coin = null; s.ev.push('coin'); pop(s, p.x, p.y - 20, '+500 $KIBBLE', '#f2c14e'); }
  if (!s.extra && s.score >= PTS.extraLifeAt) { s.extra = true; s.lives++; s.ev.push('pow'); }
}
// ---------- player ----------
const grounded = (s, p) => p.ladder < 0 && p.vy === 0 && standAt(s, p.x, p.y);
function playerFrame(s, inp, aP, bP, aR) {
  const p = s.p; p.f++; if (p.inv > 0) p.inv--; if (p.jumpCd > 0) p.jumpCd--; if (p.zenCd > 0) p.zenCd--; if (p.comboT > 0 && --p.comboT === 0) p.combo = 0;
  const onG = grounded(s, p);
  // hurt: knocked back, no control
  if (p.st === 'hurt') { if (p.f >= HURT.stun) p.st = 'stand'; else { moveX(s, p, p.knock); } gravity(s, p); return; }
  // Inu Mode Zen Bark: hold A to charge, release when charged
  if (s.inu) { if (inp.a && p.zenCd <= 0) p.charge++; else if (aR) { if (p.charge >= ZEN.charge && p.zenCd <= 0) zenBark(s); p.charge = 0; } else p.charge = 0; }
  // ladder
  if (p.ladder >= 0) { climb(s, p, inp); return; }
  // attacks in progress
  if (p.move) { const m = MOVES[p.move]; p.mf++;
    if (p.move === 'sky') { gravity(s, p); moveX(s, p, p.face * 1.2); if (grounded(s, p)) { p.move = null; p.st = 'stand'; } return; }
    if (p.mf >= m.startup + m.active + m.recover) { p.move = null; } else { if (!onG) gravity(s, p); return; } }
  const crouch = onG && inp.down && ladderCol(s, p.x, p.y >> 3) < 0; p.crouch = crouch;
  // start attacks
  if ((aP || bP) && !(s.inu && p.charge >= ZEN.charge)) {
    const mv = !onG ? (bP ? 'sky' : 'jab') : crouch ? (bP ? 'sweep' : 'lowjab') : bP ? 'kick' : 'jab';
    p.move = mv; p.mf = 0; p.atkId++; p.hitIds = new Set(); s.ev.push(mv === 'jab' || mv === 'lowjab' ? 'jab' : 'kick'); if (mv === 'jab' || mv === 'lowjab') s.stats.jabs++; else s.stats.kicks++; if (mv === 'sweep') s.stats.sweeps++; if (mv === 'sky') s.stats.skys++; p.anim = 0;
    if (inp.left) p.face = -1; else if (inp.right) p.face = 1; return; }
  if (crouch) { p.st = 'crouch'; return; }
  // ladders: up at a ladder bottom, down at a ladder top
  if (onG && inp.up && cleared(s, tierOf(p.y))) { const c = ladderCol(s, p.x, (p.y >> 3) - 1); if (c >= 0) { p.ladder = c; p.x = c * 8 + 4; p.st = 'climb'; return; } }
  if (onG && inp.down) { const c = ladderCol(s, p.x, p.y >> 3); if (c >= 0 && tile(s, c, p.y >> 3) === 'T') { p.ladder = c; p.x = c * 8 + 4; p.y += 1; p.st = 'climb'; return; } }
  // walk
  const dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0); if (dx) p.face = dx;
  moveX(s, p, dx * PHYS.walk); if (dx && onG) p.anim++;
  // jump
  if (onG && inp.up && p.jumpCd <= 0) { p.vy = PHYS.jumpV; p.vyAcc = 0; s.ev.push('hop'); }
  gravity(s, p);
  p.st = grounded(s, p) ? (dx ? 'walk' : 'stand') : 'air';
  if (grounded(s, p)) tierCheck(s, p);
}
function moveX(s, a, v) { a.xAcc = (a.xAcc || 0) + Math.abs(v); const d = Math.sign(v); while (a.xAcc >= 1) { a.xAcc -= 1; const nx = a.x + d; if (nx < 12 || nx > W - 12) { a.xAcc = 0; break; } a.x = nx; } }
function gravity(s, a) {
  const was = standAt(s, a.x, a.y) && a.vy >= 0; if (was && a.vy === 0) return; // standing still on a platform
  a.vy = Math.min(PHYS.maxFall, a.vy + PHYS.grav); a.vyAcc += a.vy;
  while (Math.abs(a.vyAcc) >= 1) { const d = Math.sign(a.vyAcc); a.vyAcc -= d; a.y += d;
    if (d > 0 && standAt(s, a.x, a.y)) { a.vy = 0; a.vyAcc = 0; if (a === s.p) { a.jumpCd = PHYS.jumpCd; } return; }
    if (a.y > ROWS * 8) { a.y = 26 * 8; a.vy = 0; a.vyAcc = 0; return; } }
}
function climb(s, p, inp) {
  p.st = 'climb'; const dy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0); if (!dy) return;
  p.xAcc += PHYS.climb; while (p.xAcc >= 1) { p.xAcc -= 1; p.y += dy; p.anim++;
    const r = p.y >> 3; if (dy < 0 && p.y % 8 === 0 && tile(s, p.ladder, r) === 'T') { p.ladder = -1; p.vy = 0; p.st = 'stand'; tierCheck(s, p); return; }
    if (dy > 0 && p.y % 8 === 0 && isPlat(tile(s, p.ladder, r)) && tile(s, p.ladder, r) !== 'T') { p.ladder = -1; p.vy = 0; p.st = 'stand'; return; }
    if (dy < 0 && !['H', 'T'].includes(tile(s, p.ladder, (p.y - 1) >> 3))) { p.ladder = -1; return; } }
}
function tierCheck(s, p) { const fr = tierOf(p.y); if (p.y === fr * 8 && fr < s.best) { s.best = fr; s.kosHere = 0; s.spawnT = Math.min(s.spawnT, 40); for (const e of s.enemies) if (tierOf(e.fr * 8) !== fr) { e.gone = true; fx(s, e.x, e.y - 4, '#8a7ac4', 5); } /* left-behind enemies scatter */ s.score += PTS.tier; s.stats.tiers++; pop(s, p.x, p.y - 22, 'FLOOR UP +' + PTS.tier, '#7ef0ff'); s.ev.push('pow'); if (fr === ROOF && !s.boss && !s.bossDone) startBoss(s); } }
function zenBark(s) { const p = s.p; p.zenCd = ZEN.cd * 60; s.stats.barks++; s.ev.push('bark'); fx(s, p.x, p.y - 8, '#7ef0ff', 20); s.waves.push({ x: p.x, y: p.y - 8, f: 18 });
  for (const e of s.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < ZEN.radius) { e.stun = ZEN.stun * 60; hurtEnemy(s, e, 1, 0); s.score += PTS.bark; }
  if (s.boss && Math.abs(s.boss.x - p.x) < ZEN.radius && Math.abs(s.boss.y - p.y) < 30) { s.boss.stun = 50; } }
// ---------- hitboxes ----------
export function playerBox(p) { const h = p.st === 'crouch' || p.move === 'sweep' || p.move === 'lowjab' ? 9 : p.ladder >= 0 ? 15 : 15; return { x0: p.x - 5, x1: p.x + 5, y0: p.y - h, y1: p.y }; }
export function attackBox(p) { if (!p.move) return null; const m = MOVES[p.move]; if (p.mf < m.startup || p.mf >= m.startup + m.active) return null;
  const a = p.x + p.face * 2, b = p.x + p.face * m.reach; return { x0: Math.min(a, b), x1: Math.max(a, b), y0: p.y + m.y0, y1: p.y + m.y1 }; }
export const overlap = (A, B) => A && B && A.x0 < B.x1 && A.x1 > B.x0 && A.y0 < B.y1 && A.y1 > B.y0;
export function enemyBox(e) { const d = { cat: [6, 10], rug: [7, 6], pigeon: [5, 8], rat: [5, 11] }[e.type]; if (e.type === 'pigeon') return { x0: e.x - d[0], x1: e.x + d[0], y0: e.y - 4, y1: e.y + 4 }; return { x0: e.x - d[0], x1: e.x + d[0], y0: e.y - d[1], y1: e.y }; }
export function bossBox(b) { const h = b.kind === 'rollo' ? 14 : b.kind === 'coocoo' ? 16 : 22; if (b.kind === 'coocoo') return { x0: b.x - 11, x1: b.x + 11, y0: b.y - 6, y1: b.y + 6 }; if (b.st === 'slash') return { x0: b.x - 11, x1: b.x + 11, y0: b.y - 12, y1: b.y }; return { x0: b.x - 11, x1: b.x + 11, y0: b.y - h, y1: b.y }; }
function hits(s) {
  const p = s.p, A = attackBox(p); if (!A) return;
  for (const e of s.enemies) { if (e.gone || p.hitIds.has(e)) continue; if (overlap(A, enemyBox(e))) { p.hitIds.add(e); landHit(s, MOVES[p.move]); hurtEnemy(s, e, MOVES[p.move].dmg, MOVES[p.move].push * p.face); } }
  const B = s.boss; if (B && !p.hitIds.has(B) && B.hp > 0 && overlap(A, bossBox(B))) { p.hitIds.add(B); if (B.inv > 0 || B.guard) { s.ev.push('blip'); return; } landHit(s, MOVES[p.move]); B.hp -= MOVES[p.move].dmg; B.inv = 18; B.flash = 8; s.stats.hits++; if (B.hp <= 0) bossKO(s, B); }
  for (const sh of s.shots) if (!sh.gone && sh.breakable && overlap(A, sh.box())) { sh.gone = true; s.score += PTS.hit; pop(s, sh.x, sh.y - 6, 'SWAT!', '#7ef0ff'); }
}
function landHit(s, m) { const p = s.p; s.hitstop = 3; s.score += PTS.hit; s.stats.hits++; p.combo++; p.comboT = 45; if (p.combo >= 2) { s.score += PTS.combo * p.combo; s.stats.maxCombo = Math.max(s.stats.maxCombo, p.combo); } s.ev.push('hit'); if (p.move === 'sky') { p.vy = -1.6; p.vyAcc = 0; } }
function hurtEnemy(s, e, dmg, push) { e.hp -= dmg; e.flash = 8; e.stun = Math.max(e.stun || 0, 14); if (e.st === 'wind' || e.st === 'rev' || e.st === 'coo' || e.st === 'glint') e.st = e.type === 'pigeon' ? 'fly' : e.type === 'rat' ? 'ground' : e.type === 'rug' ? 'roll' : 'walk'; // a hit cancels the wind-up
  if (push) { e.x = Math.max(12, Math.min(W - 12, e.x + push)); if (e.type !== 'pigeon' && !standAt(s, e.x, e.y) && e.type !== 'rat') e.vy = 0.1; }
  if (e.hp <= 0) { e.gone = true; const pts = PTS.ko[e.type]; s.score += pts; s.stats.kos++; s.koN++; floorKO(s, e); fx(s, e.x, e.y - 5, '#f2c14e', 12); pop(s, e.x, e.y - 14, 'KO +' + pts, '#f2c14e'); s.ev.push('ko');
    if (s.inu && s.koN % COIN_EVERY === 0 && !s.coin) { const y = e.type === 'pigeon' ? tierOf(e.y) * 8 : tierOf(e.y) * 8; s.coin = { x: e.x, y, f: 8 * 60 }; } } }
function floorKO(s, e) { const fr = tierOf(s.p.y); if (fr !== s.best || cleared(s, fr)) return; s.kosHere++;
  if (s.kosHere >= quota(s.level, fr)) { s.cleared.add(fr); s.ev.push('open'); s.p.hp = Math.min(HP_MAX, s.p.hp + HEAL.open); pop(s, s.p.x, s.p.y - 30, 'WAY UP OPEN! +1 HP', '#7ef0ff'); } }
export const koLeft = (s) => { const fr = tierOf(s.p.y); return fr === s.best && !cleared(s, fr) ? quota(s.level, fr) - s.kosHere : 0; };
function contact(s) { const p = s.p; if (p.inv > 0 || p.st === 'hurt') return; const P = playerBox(p);
  for (const e of s.enemies) { if (e.gone || e.stun > 0 || e.st === 'cling' || e.st === 'enter') continue; if (e.dmg() > 0 && overlap(P, enemyBox(e))) return hurtPlayer(s, e.dmg(), Math.sign(p.x - e.x) || -e.face); } // walking / resting cats only block, never hurt
  const B = s.boss; if (B && B.hp > 0 && B.stun <= 0 && B.st !== 'intro' && (B.big || B.kind !== 'coocoo') && overlap(P, bossBox(B))) return hurtPlayer(s, B.big ? DMG.bossBig : DMG.boss, Math.sign(p.x - B.x) || 1); // a hovering Coocoo is safe to touch: only her swoop hurts
  for (const sh of s.shots) if (!sh.gone && overlap(P, sh.box())) { sh.gone = true; return hurtPlayer(s, sh.dmg, Math.sign(p.x - sh.x) || 1); }
  for (const w of s.waves) if (w.boss && Math.abs(w.x - p.x) < 6 && p.y === w.y && p.vy === 0) return hurtPlayer(s, DMG.shot, Math.sign(p.x - w.x) || 1); }
export function hurtPlayer(s, dmg, dir) { const p = s.p; p.hp -= dmg; p.inv = HURT.inv; p.st = 'hurt'; p.f = 0; p.move = null; p.charge = 0; p.ladder = -1; p.knock = dir * HURT.knock; p.combo = 0; s.ev.push('ouch'); s.flash = 0.8; s.shake = 0.2; fx(s, p.x, p.y - 8, '#ff5d73', 8);
  if (p.hp <= 0) { s.lastDeath = 'ko'; loseLife(s); } }
function loseLife(s) { s.lives--; s.ev.push('die'); s.dying = 80; s.shake = 0.35; }
function afterDeath(s) { if (s.lives <= 0) { s.over = true; return; }
  const fr = s.best === ROOF && s.boss ? ROOF : s.best; resetPlayer(s, fr, fr === 26 ? 28 : 16); s.p.inv = 90; s.timer = Math.min(stageSecs(s.level) * 60, Math.max(s.timer, 0) + RESPAWN_TIME * 60);
  s.enemies = []; s.shots = []; s.waves = []; s.spawnT = 120; s.ready = 60; if (s.boss) { s.boss.st = 'intro'; s.boss.f = 30; s.boss.i = -1; s.boss.x = W - 40; s.boss.y = s.boss.kind === 'coocoo' ? ROOF * 8 - 30 : ROOF * 8; } }
function nextStage(s) { s.stage++; if (s.stage >= STAGES.length) { s.stage = 0; s.loop++; } s.ev.push('level'); const lives = s.lives; loadStage(s); s.lives = lives; }
// ---------- enemies ----------
function spawner(s) { if (s.boss || s.bossDone) return; if (--s.spawnT > 0) return; const L = s.level; s.spawnT = Math.round(spawnEvery(L) * 60 * (koLeft(s) > 0 ? 1 : 2.5));
  const st = STAGES[s.stage], p = s.p, fr = tierOf(p.y); if (fr === ROOF) return; if (s.enemies.filter((e) => e.fr === fr).length >= maxEnemies(L)) return;
  const type = st.types[Math.floor(s.rnd() * st.types.length)], side = p.x < W / 2 ? 1 : -1, x = side > 0 ? W - 14 : 14;
  s.enemies.push(makeEnemy(s, type, x, fr, -side)); }
export function makeEnemy(s, type, x, fr, face) {
  const L = s.level, e = { type, x, y: fr * 8, fr, face, st: 'walk', f: 0, hp: type === 'pigeon' ? 1 : type === 'rug' ? (L >= 3 ? 2 : 1) : 2, vy: 0, vyAcc: 0, xAcc: 0, stun: 0, flash: 0, swoops: 0 };
  e.dmg = () => (type === 'cat' ? (e.st === 'pounce' ? DMG.pounce : 0) : type === 'rug' ? (e.st === 'charge' ? DMG.charge : DMG.rug) : type === 'pigeon' ? DMG.swoop : e.st === 'dash' ? DMG.dash : DMG.bump);
  if (type === 'rug') e.st = 'roll';
  if (type === 'pigeon') { e.st = 'fly'; e.hy = fr * 8 - 30; e.y = e.hy; }
  if (type === 'rat') { e.st = 'cling'; e.y = fr * 8 - 18; e.x = x < W / 2 ? 10 : W - 10; e.f = -20; }
  return e;
}
function enemyFrame(s, e) {
  const p = s.p, L = s.level, sp = speeds(L), wu = windups(L); e.f++; if (e.flash > 0) e.flash--;
  if (e.stun > 0) { e.stun--; if (e.type !== 'pigeon' && e.type !== 'rat') gravity(s, e); else if (e.type === 'pigeon' && e.st === 'swoop') e.st = 'rise'; return; }
  const same = tierOf(e.y) === tierOf(p.y) && p.ladder < 0, dx = p.x - e.x, adx = Math.abs(dx);
  const walk = (v) => { const nx = e.x + Math.sign(v) * 4; if (!standAt(s, nx, e.y) || nx < 12 || nx > W - 12) { e.face = -e.face; return; } moveX(s, e, v); };
  if (e.type === 'cat') {
    if (e.st === 'walk') { if (same) e.face = Math.sign(dx) || e.face; walk(e.face * sp.cat); gravity(s, e); if (same && adx < 40 && adx > 10 && Math.sign(dx) === e.face) { e.st = 'wind'; e.f = 0; s.ev.push('tell'); } }
    else if (e.st === 'wind') { if (e.f >= wu.cat) { e.st = 'pounce'; e.f = 0; e.vy = -2.2; e.vyAcc = 0; e.pv = Math.min(2, Math.abs(p.x - e.x) / 26 + 0.3); } }
    else if (e.st === 'pounce') { moveX(s, e, e.face * (e.pv || 2)); gravity(s, e); if (e.f > 4 && e.vy === 0 && standAt(s, e.x, e.y)) { e.st = 'rest'; e.f = 0; } if (e.f > 120) e.st = 'rest'; }
    else if (e.st === 'rest') { gravity(s, e); if (e.f >= 40) { e.st = 'walk'; e.f = 0; } }
  } else if (e.type === 'rug') {
    if (e.st === 'roll') { walk(e.face * sp.rug); gravity(s, e); if (same && adx < 72 && adx > 24 && Math.sign(dx) === e.face) { e.st = 'rev'; e.f = 0; s.ev.push('tell'); } }
    else if (e.st === 'rev') { if (e.f >= wu.rug) { e.st = 'charge'; e.f = 0; } }
    else if (e.st === 'charge') { const f0 = e.face; walk(e.face * sp.rug * chargeX(L)); gravity(s, e); if (e.face !== f0 || e.f > 150) { e.st = 'roll'; e.f = -60; } }
  } else if (e.type === 'pigeon') {
    if (e.st === 'fly') { e.face = Math.sign(dx) || e.face; moveX(s, e, e.face * sp.fly); e.y += Math.sign(e.hy - e.y);
      if (e.swoops >= 3) { e.face = e.x < W / 2 ? -1 : 1; e.st = 'leave'; }
      else if (same && adx < 56 && e.f > 40) { e.st = 'coo'; e.f = 0; s.ev.push('tell'); } }
    else if (e.st === 'coo') { if (e.f >= wu.coo) { e.st = 'swoop'; e.f = 0; e.ty = p.y - 13; e.face = Math.sign(p.x - e.x) || e.face; e.swoops++; } }
    else if (e.st === 'swoop') { moveX(s, e, e.face * sp.swoop); if (e.y < e.ty) e.y = Math.min(e.ty, e.y + 2); if (e.f > 50 || e.x <= 12 || e.x >= W - 12) { e.st = 'rise'; e.f = 0; } }
    else if (e.st === 'rise') { moveX(s, e, e.face * sp.fly); if (e.y > e.hy) e.y--; else { e.st = 'fly'; e.f = 0; } }
    else if (e.st === 'leave') { moveX(s, e, e.face * sp.fly * 1.5); e.y--; if (e.x <= 12 || e.x >= W - 12 || e.y < 0) e.gone = true; }
  } else if (e.type === 'rat') {
    if (e.st === 'cling') { e.face = e.x < W / 2 ? 1 : -1; if (e.f >= 40 && same) { e.st = 'hop'; e.f = 0; e.vy = -2.2; e.vyAcc = 0; e.tx = Math.max(24, Math.min(W - 24, p.x - Math.sign(dx || 1) * 44)); } }
    else if (e.st === 'hop') { moveX(s, e, Math.sign(e.tx - e.x) * 2); gravity(s, e); if (e.f > 6 && e.vy === 0 && standAt(s, e.x, e.y)) { e.st = 'ground'; e.f = 0; } if (e.f > 90 && e.vy === 0) { e.st = 'ground'; e.f = 0; } }
    else if (e.st === 'ground') { gravity(s, e); e.face = Math.sign(dx) || e.face; if (e.f > 16) { if (same) { e.st = 'glint'; e.f = 0; s.ev.push('tell'); } else if (e.f > 60) { e.st = 'back'; e.f = 0; e.vy = -2.4; e.vyAcc = 0; } } }
    else if (e.st === 'glint') { if (e.f >= wu.glint) { e.st = 'dash'; e.f = 0; } }
    else if (e.st === 'dash') { const f0 = e.face; walk(e.face * sp.dash); gravity(s, e); if (e.f > 20 || e.face !== f0) { e.st = 'ground'; e.f = -10; e.dashes = (e.dashes || 0) + 1; if (e.dashes >= 2) { e.st = 'back'; e.f = 0; e.vy = -2.4; e.vyAcc = 0; } } }
    else if (e.st === 'back') { const wx = e.x < W / 2 ? 10 : W - 10; e.x += Math.sign(wx - e.x) * 2; e.vy = Math.min(PHYS.maxFall, e.vy + PHYS.grav); e.vyAcc += e.vy; while (Math.abs(e.vyAcc) >= 1) { const d = Math.sign(e.vyAcc); e.vyAcc -= d; e.y += d; } if (Math.abs(e.x - wx) <= 2 || e.y > tierOf(e.y) * 8) { e.x = wx; e.y = e.fr * 8 - 18; e.vy = 0; e.st = 'cling'; e.f = -60; e.dashes = 0; } }
  }
  if (e.y > ROWS * 8 + 20) e.gone = true;
}
// ---------- bosses (original) ----------
export const BOSSES = {
  whiskers: { name: 'MAJOR WHISKERS', title: 'tabby drill sergeant', cycle: ['stalk', 'hops', 'hairball', 'nap'] },
  rollo: { name: 'RUGLORD ROLLO', title: 'king of the rolled rugs', cycle: ['rev', 'charge', 'dizzy', 'slam', 'minis'] },
  coocoo: { name: 'DUCHESS COOCOO', title: 'queen of the rooftop flock', cycle: ['hover', 'swoop', 'fan', 'perch'] },
  squeaks: { name: 'SHOGUN SQUEAKS', title: 'master of the wall-hop', cycle: ['wallhop', 'glint', 'slash', 'stars', 'tired'] },
};
export const BOSS_SECS = 60;
function startBoss(s) { const st = STAGES[s.stage], k = st.boss; s.enemies = []; s.ev.push('boss'); s.timer = Math.max(s.timer, BOSS_SECS * 60); /* the roof bell grants at least a minute for the boss */
  s.boss = { kind: k, name: BOSSES[k].name, x: W - 36, y: k === 'coocoo' ? ROOF * 8 - 30 : ROOF * 8, hp: bossHp(s.stage, s.loop), maxHp: bossHp(s.stage, s.loop), st: 'intro', f: 0, i: -1, face: -1, inv: 0, flash: 0, stun: 0, vy: 0, vyAcc: 0, xAcc: 0, big: false, guard: false }; }
function bossNext(s, B) { const cyc = BOSSES[B.kind].cycle; B.i = (B.i + 1) % cyc.length; B.st = cyc[B.i]; B.f = 0; B.big = false; B.guard = false; B.n = 0; if (['hops', 'hairball', 'rev', 'swoop', 'fan', 'glint', 'stars', 'slam'].includes(B.st)) s.ev.push('tell'); }
function bossFrame(s, B) {
  const p = s.p, L = s.level, wu = windups(L), sp = speeds(L), dx = p.x - B.x, adx = Math.abs(dx); B.f++; if (B.inv > 0) B.inv--; if (B.flash > 0) B.flash--;
  if (B.stun > 0) { B.stun--; return; }
  const fast = Math.min(1.6, 1 + 0.06 * (L - 1)), tell = (n) => Math.round(n / fast);
  switch (B.st) {
    case 'intro': if (B.f > 70) bossNext(s, B); break;
    // MAJOR WHISKERS
    case 'stalk': B.face = Math.sign(dx) || B.face; if (adx > 30) moveX(s, B, B.face * sp.cat); if (B.f > 70) bossNext(s, B); break;
    case 'hops': { const k = B.f % tell(44); if (k === 0 && B.f > 0) { B.n++; if (B.n > 3) { bossNext(s, B); break; } } if (k < tell(18)) { B.face = Math.sign(dx) || B.face; B.crouch = true; } else { B.crouch = false; if (k === tell(18)) { B.vy = -2.4; B.vyAcc = 0; } moveX(s, B, B.face * 1.8); } B.big = !B.crouch; gravity(s, B); break; }
    case 'hairball': if (B.f === tell(30)) { const v = Math.max(0.8, Math.min(2.4, adx / 40)); s.shots.push(shot(s, B.x + B.face * 10, B.y - 16, Math.sign(dx) * v, -2.2, 'hairball')); s.ev.push('kick'); } if (B.f > tell(60)) bossNext(s, B); break;
    case 'nap': if (B.f > 90 - 4 * L) bossNext(s, B); break;
    // RUGLORD ROLLO
    case 'rev': B.face = Math.sign(dx) || B.face; if (B.f > tell(40)) { B.st = 'charge'; B.f = 0; B.i = BOSSES.rollo.cycle.indexOf('charge'); } break;
    case 'charge': B.big = true; B.guard = true; moveX(s, B, B.face * Math.min(3.4, 2.4 + 0.1 * L)); if (B.x <= 14 || B.x >= W - 14) { s.shake = 0.3; s.ev.push('boom'); B.guard = false; bossNext(s, B); } break;
    case 'dizzy': if (B.f > 80 - 3 * L) bossNext(s, B); break;
    case 'slam': if (B.f === tell(30)) { B.vy = -2.6; B.vyAcc = 0; } if (B.f > tell(30)) { gravity(s, B); if (B.vy === 0 && B.f > tell(30) + 4 && !B.n) { B.n = 1; s.shake = 0.3; s.ev.push('boom'); s.waves.push({ x: B.x - 12, y: B.y, vx: -1.6, f: 160, boss: true }, { x: B.x + 12, y: B.y, vx: 1.6, f: 160, boss: true }); } } if (B.f > tell(30) + 70) bossNext(s, B); break;
    case 'minis': if (B.f === 20 && s.enemies.length < 3) { s.enemies.push(makeEnemy(s, 'rug', 20, ROOF, 1)); } if (B.f > 60) bossNext(s, B); break;
    // DUCHESS COOCOO
    case 'hover': B.face = Math.sign(dx) || B.face; moveX(s, B, Math.sign(dx) * sp.fly); B.y += Math.sign(ROOF * 8 - 32 - B.y); if (B.f > 70) bossNext(s, B); break;
    case 'swoop': if (B.f < tell(30)) { B.ty = p.y - 16; B.face = Math.sign(dx) || B.face; } else { B.big = true; moveX(s, B, B.face * sp.swoop); if (B.y < B.ty + 2) B.y += 2; if (B.x <= 14 || B.x >= W - 14 || B.f > tell(30) + 90) { B.st = 'rise'; B.f = 0; } } break;
    case 'rise': B.big = false; if (B.y > ROOF * 8 - 32) B.y--; else bossNext(s, B); break;
    case 'fan': if (B.f === tell(24)) { for (const v of [-1, 0, 1]) s.shots.push(shot(s, B.x, B.y + 6, v * 1.2 + Math.sign(dx) * 0.4, 1.4, 'feather')); s.ev.push('kick'); } if (B.f > tell(24) + 40) bossNext(s, B); break;
    case 'perch': if (B.y < ROOF * 8 - 8) B.y++; if (B.f > 100 - 4 * L) { B.st = 'rise'; B.f = 0; } break;
    // SHOGUN SQUEAKS
    case 'wallhop': { const wx = B.x < W / 2 ? W - 16 : 16; if (B.f === 1) { B.vy = -3; B.vyAcc = 0; B.tx = wx; } B.guard = true; B.x += Math.sign(B.tx - B.x) * Math.min(3, Math.abs(B.tx - B.x)); gravity(s, B); if (B.f > 8 && B.vy === 0) { B.guard = false; B.face = B.x < W / 2 ? 1 : -1; bossNext(s, B); } break; }
    case 'glint': if (B.f > tell(28)) { B.st = 'slash'; B.f = 0; B.i = BOSSES.squeaks.cycle.indexOf('slash'); } break;
    case 'slash': B.big = true; { const f0 = B.x; moveX(s, B, B.face * sp.dash); if (B.x === f0 || B.f > 90) bossNext(s, B); } break;
    case 'stars': if (B.f === tell(26) || B.f === tell(26) + 24) { B.face = Math.sign(dx) || B.face; s.shots.push(shot(s, B.x + B.face * 10, p.y - 12 > B.y - 22 ? B.y - 12 : B.y - 12, B.face * 2.2, 0, 'star')); s.ev.push('kick'); } if (B.f > tell(26) + 50) bossNext(s, B); break;
    case 'tired': if (B.f > 80 - 3 * L) bossNext(s, B); break;
  }
}
function shot(s, x, y, vx, vy, kind) { const o = { x, y, vx, vy, kind, gone: false, f: 0, dmg: DMG.shot, breakable: kind !== 'star' };
  o.box = () => ({ x0: o.x - 3, x1: o.x + 3, y0: o.y - 3, y1: o.y + 3 }); return o; }
function shotsFrame(s) {
  for (const o of s.shots) { o.f++; o.x += o.vx; o.y += o.vy; if (o.kind === 'hairball') o.vy += 0.08; if (o.x < 4 || o.x > W - 4 || o.y > ROWS * 8 || o.f > 300) o.gone = true;
    if (o.kind === 'hairball' && o.vy > 0 && o.y >= ROOF * 8 - 2) { o.gone = true; fx(s, o.x, o.y, '#c8a878', 6); } if (o.kind === 'feather' && o.y >= ROOF * 8) o.gone = true; }
  s.shots = s.shots.filter((o) => !o.gone);
  for (const w of s.waves) { w.f--; if (w.vx) w.x += w.vx; } s.waves = s.waves.filter((w) => w.f > 0 && w.x > 8 && w.x < W - 8);
}
function bossKO(s, B) { const pts = PTS.boss(s.stage); s.score += pts; s.stats.bosses++; pop(s, B.x, B.y - 30, `${B.name} DOWN +${pts}`, '#f2c14e'); fx(s, B.x, B.y - 12, '#f2c14e', 30); s.ev.push('boom');
  s.boss = null; s.bossDone = true; s.shots = []; s.waves = []; s.enemies = []; const tb = Math.floor(s.timer / 60) * PTS.timeBonus; s.score += tb; s.stats.stages++; s.p.hp = HEAL.boss; pop(s, 128, 90, 'TIME BONUS +' + tb, '#7ef0ff'); s.ev.push('home'); s.clearing = 150; }
// ---------- bot: attract mode / tests / human-sim brain ----------
export function bot(s) { const o = botRaw(s), p = s.p; if (grounded(s, p) && !o.up && !o.down && (o.left || o.right)) { const d = o.right ? 1 : -1; if (!standAt(s, p.x + d * 7, p.y) && standAt(s, p.x + d * 30, p.y)) o.up = true; } return o; } // hop over drop gaps
function botRaw(s) {
  const p = s.p, o = {}; if (s.ready || s.dying || s.clearing || p.st === 'hurt') return o;
  const press = (k) => { if (!(k === 'a' ? p.prevA : p.prevB)) o[k] = true; return o; };
  if (s.inu && p.zenCd <= 0 && grounded(s, p)) { const near = s.enemies.filter((e) => !e.gone && Math.hypot(e.x - p.x, e.y - p.y) < ZEN.radius - 6).length + (s.boss && Math.abs(s.boss.x - p.x) < 30 ? 2 : 0);
    if (p.charge > 0 && p.charge < ZEN.charge) { o.a = true; return o; } if (p.charge >= ZEN.charge) return o; if (near >= 2 && !p.move) { o.a = true; return o; } } // Inu: hold A for the Zen Bark when crowded
  if (p.move && p.move !== 'sky') return o;
  const same = (e) => tierOf(e.y) === tierOf(p.y);
  // threats first
  let thr = null, td = 1e9; for (const e of s.enemies) { if (e.gone || e.stun > 0) continue; const d = Math.abs(e.x - p.x); if ((same(e) || e.type === 'pigeon') && d < td && e.st !== 'cling') { td = d; thr = e; } }
  if (p.ladder >= 0) { o.up = true; return o; } // on a ladder: keep climbing (backing down just ping-pongs)
  const B = s.boss;
  if (B) return bossBot(s, B, o, press);
  if (thr && td < 60) { const e = thr, dx = e.x - p.x, toward = Math.sign(dx), coming = Math.sign(-dx) === e.face;
    const face = () => { if (p.face !== toward) o[toward > 0 ? 'right' : 'left'] = true; };
    if (e.type === 'rug') { if (td <= 24 && p.st !== 'air') { face(); o.down = true; return press('b'); } if (e.st === 'charge' && coming) return o; if (td > 24) { o[toward > 0 ? 'right' : 'left'] = true; return o; } }
    if (e.type === 'cat') { if (td <= 19) { face(); return press(td <= 13 ? 'a' : 'b'); } if (e.st === 'pounce' && coming) { o[toward > 0 ? 'left' : 'right'] = true; return o; } if (e.st === 'wind' && td < 30) { o[toward > 0 ? 'right' : 'left'] = true; return o; } }
    if (e.type === 'pigeon') { if (e.st === 'swoop' && Math.abs(e.y - (p.y - 12)) < 6) { if (td <= 14) { face(); return press('a'); } if (coming && td < 44) { o.down = true; return o; } } if (e.st === 'coo' && td < 50) { o.down = true; return o; } }
    if (e.type === 'rat' && same(e)) { if (td <= 20) { face(); return press('b'); } if (e.st === 'dash' && coming && td < 34) { o.up = true; return o; } if (e.st === 'glint') { o[toward > 0 ? 'right' : 'left'] = true; return o; } } }
  if (s.coin && Math.abs(s.coin.y - p.y) < 4) { o[s.coin.x > p.x ? 'right' : 'left'] = true; return o; }
  if (koLeft(s) > 0) { if (thr && same(thr) && td > 18) o[thr.x > p.x ? 'right' : 'left'] = true; else if (!thr && Math.abs(p.x - 128) > 30) o[p.x < 128 ? 'right' : 'left'] = true; return o; } // floor still locked: go fight
  return nav(s, o);
}
function nav(s, o) { const p = s.p, st = STAGES[s.stage], fr = tierOf(p.y);
  if (fr === ROOF) return o;
  const cs = connectors(st, fr); if (!cs.length) return o; let c = cs[0]; for (const k of cs) if (Math.abs(k.x - p.x) < Math.abs(c.x - p.x)) c = k;
  if (p.y % 8 === 0 && tile(s, (p.x - 3) >> 3, p.y >> 3) === '-' || tile(s, (p.x + 3) >> 3, p.y >> 3) === '-' && p.y % 8 === 0) { o.up = true; return o; } // on a ledge step: hop up
  const d = c.x - p.x; if (Math.abs(d) > (c.kind === 'ladder' ? 0 : 5)) { o[d > 0 ? 'right' : 'left'] = true; return o; }
  o.up = true; return o; }
function bossBot(s, B, o, press) { const p = s.p, dx = B.x - p.x, adx = Math.abs(dx), toward = Math.sign(dx) || 1, go = (d) => { o[d > 0 ? 'right' : 'left'] = true; };
  for (const sh of s.shots) if (Math.abs(sh.x - p.x) < 26 && sh.y > p.y - 20) { if (sh.kind === 'star') { o.down = true; return o; } if (Math.abs(sh.x - p.x) < 14) { if (p.face !== Math.sign(sh.x - p.x)) go(sh.x - p.x); return press('a'); } }
  for (const w of s.waves) if (w.boss && Math.abs(w.x - p.x) < 20 && Math.sign(p.x - w.x) === Math.sign(w.vx)) { o.up = true; return o; }
  const danger = B.st === 'charge' || B.st === 'slash' || (B.st === 'hops' && !B.crouch) || (B.st === 'swoop' && B.f >= 20);
  if (B.st === 'swoop' && B.f >= 20 && adx < 50) { o.down = true; return o; }
  if ((B.st === 'charge' || B.st === 'slash') && adx < 36 && Math.sign(-dx) === B.face) { o.up = true; go(-dx); return o; }
  if (B.st === 'rev' || B.st === 'glint') { if (adx < 40) { go(-dx); return o; } return o; }
  if (danger && adx < 24) { go(-dx); return o; }
  if (B.kind === 'coocoo' && B.y < ROOF * 8 - 14) { if (p.st === 'air') { if (adx < 16 && p.vy > -1.2) return press('b'); return o; } if (adx < 10) { o.up = true; return o; } go(dx); return o; }
  if (adx <= 20 && !B.guard) { if (p.face !== toward) go(dx); return press(adx <= 14 ? 'a' : 'b'); }
  if (adx > 16) go(dx); return o; }
export const ghostPos = (s) => ({ x: s.p.x, y: s.p.y - 8 + OY });
// draw lives in pawfu-art.js to keep this file about rules
export { draw } from './pawfu-art.js';
