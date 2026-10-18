// BARK INVADERS — original Inu fixed-shooter (224x256 native). Classic mode = classic-difficulty rules on Inu's own
// design: an arrowhead fleet (5/7/9/11/11) that steps as a block on a timer that shortens as it thins, a two-pattern
// volley (aimed pebbles + a ping-pong sweep of zig-zags) on Inu reload curves, swooping divers that peel off the wing
// tips, a balloon whose value melts as it crosses, kennel shields, waves that start lower, extra life at 2000.
import { rng, clamp } from '../core/rng.js';
export const META = { id: 'bark-invaders', title: 'BARK INVADERS', color: '#ff5d73', blurb: 'A rug-pull arrowhead fleet steps down, faster as it thins, while wing-tip divers swoop at you. One bark on screen at a time.', controls: 'Left/Right to move, Space / A to bark', inuMove: 'MEGA WOOF: hold A ~1s, release for a piercing blast (6s cooldown). Every 3rd wave a rug-pull whale boss joins the fleet.', classicNote: 'Original Inu rules at classic difficulty.' };
export const W = 224, H = 256, COLS = 11, ROWS = 5, PY = 216, SHIELD_Y = 192, GROUND = 239;
export const ROW_TYPE = ['drone', 'rug', 'rug', 'bear', 'bear'], TYPE_PTS = { drone: 40, rug: 25, bear: 15 }, TYPE_W = { drone: 8, rug: 11, bear: 12 };
export const ROW_WIDTH = [5, 7, 9, 11, 11]; // arrowhead formation, centred on column 5
export const FLEET = ROW_WIDTH.reduce((a, b) => a + b, 0); // 43
export const waveY = (wave) => 128 + 12 * ((wave - 1) % 6); // bottom-row start height: lower each wave, resets every 6
// fleet step timer: frames between whole-fleet steps, from 40 (full fleet) down to 3 (last few)
export const stepFrames = (alive, total = FLEET) => Math.max(3, Math.round(3 + 37 * (alive / total) ** 1.3));
export const STEP_X = 2, STEP_DROP = 6;
// volley reload: frames between enemy shots on Inu's own curve (eases from 54 toward 14 as your score climbs)
export const reloadFrames = (score, wave = 2) => Math.max(14, Math.round(54 - 6 * Math.log2(1 + score / 150))) + (wave === 1 ? 18 : 0); // wave 1 breathes
export const maxBombs = (wave) => Math.min(4, 2 + Math.floor((wave - 1) / 2));
export const BOMB_SPEED = 1.5, BOMB_SPEED_FAST = 2; // fast once 6 or fewer remain
export const DIVE = { every: 12 * 60, first: 8 * 60, vy: 1.1, sway: 22, pts: 2 }; // a wing-tip diver swoops every 12s (double points if shot)
export const BALLOON = { every: 20 * 60, hi: 300, lo: 100 }; // balloon value melts from 300 to 100 as it crosses
export const balloonScore = (progress) => 50 * Math.round((BALLOON.hi - (BALLOON.hi - BALLOON.lo) * Math.min(1, Math.max(0, progress))) / 50);
export const BALLOON_FRAMES = BALLOON.every, SHOT_SPEED = 4, PLAYER_SPEED = 1, EXTRA_LIFE = 2000;
export const MEGA = { charge: 0.9, cd: 6, w: 20, bossDmg: 8 };
export const isBossWave = (s) => s.inu && s.wave % 3 === 0;
const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y, c, n }), pop = (s, x, y, text, c = '#7ef0ff') => s.pops.push({ x, y, text, c, t: 1 });
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, wave: 1, over: false, t: 0, ev: [], fx: [], pops: [], shake: 0, flash: 0, acc: 0, frame: 0,
    shots: 0, extra: false, charge: 0, megaCd: 0, prevA: false, beam: null, stats: { bosses: 0, megas: 0, streak: 0, best: 0 } };
  s.player = { x: 104, dead: 0 }; newWave(s); return s;
}
export function makeShield() { const b = new Uint8Array(22 * 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 22; x++) { let on = true;
  const dx = Math.abs(x - 10.5); if (y < 7 && dx > 3 + y * 1.25) on = false; /* kennel: peaked roof */ if (y >= 10 && dx <= 3.5) on = false; if (y === 9 && dx <= 2.5) on = false; b[y * 22 + x] = on ? 1 : 0; } return b; }
export const SHIELD_X = [32, 77, 122, 167];
function newWave(s) {
  const by = waveY(s.wave); s.fleet = []; // arrowhead: narrow tip on top, full width at the bottom
  for (let r = ROWS - 1; r >= 0; r--) { const w = ROW_WIDTH[r], c0 = (COLS - w) / 2; for (let k = 0; k < w; k++) { const c = c0 + k; s.fleet.push({ r, c, type: ROW_TYPE[r], x: 24 + c * 16, y: by - (ROWS - 1 - r) * 16, alive: true }); } }
  s.total = s.fleet.length; s.stepT = 0; s.dir = 1; s.anim = 0; s.shot = null; s.bombs = {}; s.sinceBomb = 0; s.volley = 0; s.sweepCol = 0; s.sweepDir = 1;
  s.diver = null; s.diveT = s.wave === 1 ? DIVE.first * 2 : DIVE.first; s.balloon = null; s.balloonT = BALLOON_FRAMES; s.shields = SHIELD_X.map(makeShield); s.player.dead = 0; s.player.x = 104; s.ready = 60;
  s.boss = isBossWave(s) ? { x: 80, y: 44, w: 48, h: 16, hp: 30 + s.wave * 3, max: 30 + s.wave * 3, vx: 0.6, fireT: 60 } : null;
}
export const alive = (s) => s.fleet.filter((a) => a.alive);
const box = (a) => ({ x: a.x + (16 - TYPE_W[a.type]) / 2, y: a.y, w: TYPE_W[a.type], h: 8 });
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.flash = Math.max(0, s.flash - dt); s.shake = Math.max(0, s.shake - dt);
  const A = !!(inp.a || inp.up);
  if (s.inu) { s.megaCd = Math.max(0, s.megaCd - dt); if (A) s.charge += dt; else { if (s.prevA && s.charge >= MEGA.charge && s.megaCd <= 0 && !s.player.dead) megaWoof(s); s.charge = 0; } }
  s.fire = s.fire || (A && !s.prevA); s.prevA = A; s.inp = inp;
  if (s.beam) { s.beam.t -= dt; if (s.beam.t <= 0) s.beam = null; }
  s.acc += dt * 60; while (s.acc >= 1 && !s.over) { s.acc -= 1; frame(s); }
}
function frame(s) {
  s.frame++; s.t += 1 / 60; const P = s.player, inp = s.inp || {};
  if (s.ready > 0) { s.ready--; s.fire = false; return; }
  if (P.dead > 0) { P.dead--; if (P.dead === 0) { if (s.lives <= 0) { s.over = true; return; } P.x = 104; } s.fire = false; return; }
  P.x = clamp(P.x + ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * PLAYER_SPEED, 8, 203);
  if (s.fire && !s.shot) { s.shot = { x: P.x + 6, y: PY - 4, w: 1, h: 4 }; s.shots++; s.ev.push('bark'); } s.fire = false;
  marchOne(s); if (s.over) return;
  // player shot
  if (s.shot) { s.shot.y -= SHOT_SPEED; const sh = s.shot; let done = false;
    const a = s.fleet.find((a) => a.alive && hit(sh, box(a)));
    const dv = s.diver && hit(sh, { x: s.diver.x, y: s.diver.y, w: 12, h: 8 });
    if (dv) { const a = s.diver.a; a.alive = false; const pts = TYPE_PTS[a.type] * DIVE.pts; s.score += pts; pop(s, s.diver.x, s.diver.y, '+' + pts, '#f2c14e'); fx(s, s.diver.x + 6, s.diver.y + 4, '#f2c14e', 12); s.diver = null; s.ev.push('hit'); done = true; streak(s, a); }
    else if (a) { a.alive = false; s.score += TYPE_PTS[a.type]; s.ev.push('hit'); s.pop = { x: a.x, y: a.y, f: 16 }; fx(s, a.x + 8, a.y + 4, a.type === 'drone' ? '#ff5dc8' : a.type === 'rug' ? '#fbf1e0' : '#5fd37a', 9); done = true; streak(s, a); }
    else if (s.balloon && hit(sh, s.balloon)) { const pts = balloonScore(s.balloon.vx > 0 ? (s.balloon.x + 16) / (W + 16) : (W - s.balloon.x) / (W + 16)); s.score += pts; s.balloonPop = { x: s.balloon.x, pts, f: 90 }; fx(s, s.balloon.x + 8, s.balloon.y + 4, '#3ad0e0', 18); s.balloon = null; s.ev.push('boom'); done = true; }
    else if (s.boss && hit(sh, s.boss)) { hurtBoss(s, 1); done = true; }
    else if (erode(s, sh, SHOT_MASK)) { done = true; s.stats.streak = 0; }
    else if (Object.values(s.bombs).some((b) => b && hit(sh, b))) { for (const k in s.bombs) if (s.bombs[k] && hit(sh, s.bombs[k])) delete s.bombs[k]; done = true; }
    else if (sh.y < 32) { done = true; s.stats.streak = 0; }
    if (done) s.shot = null; }
  bombs(s); diver(s); moveBalloon(s); boss(s);
  for (const a of s.fleet) if (a.alive && a.y + 8 >= SHIELD_Y) erodeRect(s, box(a));
  if (!s.extra && s.score >= EXTRA_LIFE) { s.extra = true; s.lives++; s.ev.push('pow'); }
  if (s.pop && --s.pop.f <= 0) s.pop = null; if (s.balloonPop && --s.balloonPop.f <= 0) s.balloonPop = null;
  if (!alive(s).length && !s.boss) { s.wave++; s.level = s.wave; s.ev.push('level'); newWave(s); }
}
function streak(s, a) { s.stats.streak++; s.stats.best = Math.max(s.stats.best, s.stats.streak); if (s.inu && s.stats.streak % 10 === 0) { s.score += 100; pop(s, a.x, a.y, `STREAK x${s.stats.streak} +100`, '#f2c14e'); } }
// The fleet moves as one block on a step timer; the timer shortens as the fleet thins (stepFrames).
export function marchOne(s) { // one frame of the march clock
  const al = alive(s).filter((a) => !a.diving); if (!al.length) return;
  if (++s.stepT < stepFrames(al.length, s.total)) return; s.stepT = 0; s.anim ^= 1; s.ev.push('march');
  const minX = Math.min(...al.map((a) => box(a).x)), maxX = Math.max(...al.map((a) => box(a).x + box(a).w));
  if ((s.dir > 0 && maxX + STEP_X >= 216) || (s.dir < 0 && minX - STEP_X <= 8)) { for (const a of al) a.y += STEP_DROP; s.dir *= -1; }
  else for (const a of al) a.x += s.dir * STEP_X;
  if (al.some((a) => a.y + 8 >= PY)) { s.lives = 0; s.over = true; s.ev.push('die'); }
}
const colBottom = (s, col) => s.fleet.filter((a) => a.alive && !a.diving && a.c === col).sort((p, q) => q.y - p.y)[0];
function bombs(s) {
  const al = alive(s).filter((a) => !a.diving); s.sinceBomb++; const sp = al.length <= 6 ? BOMB_SPEED_FAST : BOMB_SPEED;
  for (const k of Object.keys(s.bombs)) { const b = s.bombs[k]; if (!b) continue; b.y += b.kind === 'boss' ? 4 / 3 : sp; b.anim++; if (b.kind === 'zigzag') b.x += Math.floor(b.anim / 6) % 2 ? 0.25 : -0.25;
    const pb = { x: s.player.x, y: PY, w: 13, h: 8 };
    if (!s.player.dead && hit(b, pb)) { delete s.bombs[k]; playerHit(s); continue; }
    if (erode(s, b, BOMB_MASK)) { delete s.bombs[k]; continue; }
    if (b.y + b.h >= GROUND) { delete s.bombs[k]; fx(s, b.x, GROUND - 2, '#ff6a4a', 3); } }
  if (!al.length || s.player.dead || s.sinceBomb < reloadFrames(s.score, s.wave)) return;
  const live = Object.values(s.bombs).filter((b) => b.kind !== 'boss').length; if (live >= maxBombs(s.wave)) return;
  const cols = [...new Set(al.map((a) => a.c))].sort((p, q) => p - q); let src = null, kind;
  if (s.volley++ % 2 === 0) { kind = 'pebble'; // aimed: the column nearest the player, sometimes one off
    const px = s.player.x + 6; const cx = (c) => colBottom(s, c).x + 8; let c = cols.reduce((m, c) => (Math.abs(cx(c) - px) < Math.abs(cx(m) - px) ? c : m)); const j = Math.floor(s.rnd() * 3) - 1; if (cols.includes(c + j)) c += j; src = colBottom(s, c); }
  else { kind = 'zigzag'; // sweep: walks across the occupied columns and bounces at the ends
    s.sweepCol += s.sweepDir; if (s.sweepCol >= cols.length - 1 || s.sweepCol <= 0) { s.sweepCol = Math.max(0, Math.min(cols.length - 1, s.sweepCol)); s.sweepDir *= -1; } src = colBottom(s, cols[Math.min(cols.length - 1, s.sweepCol)]); }
  if (!src) return; s.bombs['v' + s.frame] = { x: src.x + 7, y: src.y + 8, w: 3, h: 7, kind, c: src.c, anim: 0 }; s.sinceBomb = 0;
}
// Divers: every DIVE.every frames a wing-tip dog (end of the lowest row) peels off and swoops toward the player.
function diver(s) {
  const D = s.diver;
  if (!D) { if (--s.diveT > 0 || s.player.dead) return; s.diveT = DIVE.every; const al = alive(s).filter((a) => !a.diving); if (al.length < 4) return;
    const low = Math.max(...al.map((a) => a.y)), row = al.filter((a) => a.y === low).sort((p, q) => p.x - q.x), a = s.rnd() < 0.5 ? row[0] : row[row.length - 1];
    a.diving = true; s.diver = { a, x: a.x + 2, y: a.y, x0: a.x + 2, t: 0 }; s.ev.push('honk'); return; }
  D.t++; D.y += DIVE.vy; const px = s.player.x; D.x0 += Math.sign(px - D.x0) * 0.35; D.x = D.x0 + Math.sin(D.t / 18) * DIVE.sway;
  if (!s.player.dead && hit({ x: D.x, y: D.y, w: 12, h: 8 }, { x: px, y: PY, w: 13, h: 8 })) { D.a.alive = false; s.diver = null; playerHit(s); return; }
  if (D.y > GROUND) { D.a.alive = false; s.diver = null; } // missed: it flies off-screen (no points)
}
function playerHit(s) { s.lives--; s.player.dead = 60; s.flash = 1; s.shake = 0.45; s.ev.push('boom'); fx(s, s.player.x + 6, PY + 4, '#e0802c', 24); s.shot = null; }
function moveBalloon(s) {
  if (!s.balloon) { if (--s.balloonT <= 0) { s.balloonT = BALLOON_FRAMES; if (alive(s).length >= 8) { const right = s.rnd() < 0.5; s.balloon = { x: right ? 208 : 0, y: 40, w: 16, h: 7, vx: right ? -1 : 1 }; s.ev.push('honk'); } } return; }
  s.balloon.x += s.balloon.vx; if (s.balloon.x < -16 || s.balloon.x > W) s.balloon = null;
}
function boss(s) { const B = s.boss; if (!B) return; B.x += B.vx; if (B.x < 8 || B.x + B.w > W - 8) B.vx *= -1; if (--B.fireT <= 0) { B.fireT = 70; if (!s.bombs.boss) s.bombs.boss = { x: B.x + B.w / 2, y: B.y + B.h, w: 3, h: 7, kind: 'boss', anim: 0 }; } }
function hurtBoss(s, d) { const B = s.boss; B.hp -= d; s.ev.push('hit'); fx(s, B.x + B.w / 2, B.y + B.h, '#3a6ed8', 6);
  if (B.hp <= 0) { s.score += 2000; s.stats.bosses++; fx(s, B.x + B.w / 2, B.y + 8, '#f2c14e', 40); pop(s, B.x + 24, B.y, 'WHALE REKT +2000', '#f2c14e'); s.shake = 0.6; s.boss = null; s.ev.push('boom'); } }
function megaWoof(s) { const x = s.player.x + 6; s.megaCd = MEGA.cd; s.stats.megas++; s.beam = { x: x - MEGA.w / 2, t: 0.3 }; s.ev.push('mega'); s.shake = 0.3; const bx = { x: x - MEGA.w / 2, y: 0, w: MEGA.w, h: PY };
  let n = 0; for (const a of s.fleet) if (a.alive && hit(box(a), bx)) { a.alive = false; s.score += TYPE_PTS[a.type]; n++; fx(s, a.x + 8, a.y + 4, '#7ef0ff', 8); }
  if (n > 1) { s.score += n * 20; pop(s, x, 120, `MEGA WOOF x${n}`, '#7ef0ff'); } erodeRect(s, bx); if (s.boss && hit(s.boss, bx)) hurtBoss(s, MEGA.bossDmg); }
// ---- shields: per-pixel bitmaps eroded by explosion masks ----
const SHOT_MASK = ['1..1...1', '..1...1.', '.111111.', '11111111', '11111111', '.111111.', '..1..1..', '1..1...1'];
const BOMB_MASK = ['..1...', '1...1.', '.1111.', '111111', '.1111.', '1.11.1', '.1..1.', '1.1..1'];
export function shieldPixel(s, i, x, y) { return s.shields[i][y * 22 + x]; }
function erode(s, r, mask) {
  for (let i = 0; i < 4; i++) { const sx = SHIELD_X[i]; if (r.x + r.w <= sx || r.x >= sx + 22 || r.y + r.h <= SHIELD_Y || r.y >= SHIELD_Y + 16) continue;
    for (let yy = Math.max(0, Math.floor(r.y - SHIELD_Y)); yy < Math.min(16, Math.ceil(r.y + r.h - SHIELD_Y)); yy++) for (let xx = Math.max(0, Math.floor(r.x - sx)); xx < Math.min(22, Math.ceil(r.x + r.w - sx)); xx++)
      if (s.shields[i][yy * 22 + xx]) { const cx = xx - Math.floor(mask[0].length / 2), cy = yy - 4; mask.forEach((row, my) => [...row].forEach((ch, mx) => { const px = cx + mx, py = cy + my; if (ch === '1' && px >= 0 && px < 22 && py >= 0 && py < 16) s.shields[i][py * 22 + px] = 0; })); s.ev.push('hit'); return true; } }
  return false;
}
function erodeRect(s, r) { for (let i = 0; i < 4; i++) { const sx = SHIELD_X[i]; for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 22; xx++) { const px = sx + xx, py = SHIELD_Y + yy; if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) s.shields[i][yy * 22 + xx] = 0; } } }
export function bot(s) {
  const P = s.player, al = alive(s); if (!al.length) return {}; const px = P.x + 6;
  const danger = Object.values(s.bombs).find((b) => b && Math.abs(b.x - px) < 11 && b.y > 150);
  if (danger) return danger.x < px ? { right: true } : { left: true };
  const lowest = al.reduce((m, a) => (a.y > m.y || (a.y === m.y && Math.abs(a.x + 8 - px) < Math.abs(m.x + 8 - px)) ? a : m));
  const tx = lowest.x + 8 + s.dir * 4; const fire = Math.abs(tx - px) < 5 && !s.shot && s.frame % 2 === 0;
  return { left: tx < px - 2, right: tx > px + 2, a: fire };
}
export const ghostPos = (s) => ({ x: s.player.x + 6, y: PY + 4 });
// ---------- render ----------
// Original "rug-pull fleet" sprites: drone = FUD drone, rug = flying rug, bear = grumpy bear head.
const SPR = { drone: [['..1..1..', '.111111.', '11.11.11', '11111111', '.1.11.1.', '..1111..', '.1....1.', '1......1'], ['..1..1..', '.111111.', '11.11.11', '11111111', '.1.11.1.', '..1111..', '..1..1..', '..1..1..']],
  rug: [['1.1.1.1.1.1', '11111111111', '1.........1', '1.111.111.1', '1.........1', '11111111111', '1.1.1.1.1.1', '...........'], ['...........', '1.1.1.1.1.1', '11111111111', '1.........1', '1.111.111.1', '1.........1', '11111111111', '.1.1.1.1.1.']],
  bear: [['11........11', '111......111', '.1111111111.', '11.111111.11', '111..11..111', '111111111111', '.11.1111.11.', '..11111111..'], ['11........11', '111......111', '.1111111111.', '11.111111.11', '111..11..111', '111111111111', '.111.11.111.', '..1......1..']] };
const TYPE_COL = { drone: '#ff5dc8', rug: '#fbf1e0', bear: '#7ee08a' };
const PLAYER = ['.1.......1...', '.11.....11...', '.111111111...', '11111111111..', '1111211121111', '1111111111111', '1111111111111', '1111111111111'];
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#05040d'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { ctx.fillStyle = i % 3 ? '#1a1838' : '#3a3666'; ctx.fillRect((i * 97 + 13) % W, 30 + ((i * 53) % 200), 1, 1); }
  for (const a of s.fleet) if (a.alive && !a.diving) P.blit(ctx, P.sprite('inv' + a.type + s.anim, SPR[a.type][s.anim], { 1: TYPE_COL[a.type] }, { outline: false }), box(a).x, a.y);
  if (s.diver) { const a = s.diver.a; P.blit(ctx, P.sprite('inv' + a.type + s.anim, SPR[a.type][s.anim], { 1: '#f2c14e' }, { outline: false }), s.diver.x, s.diver.y); }
  if (s.pop) { ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) ctx.fillRect(s.pop.x + 3 + ((i * 5) % 11), s.pop.y + ((i * 3) % 8), 1, 1); }
  if (s.balloon) P.blit(ctx, P.sprite('balloon', ['......1111......', '....11111111....', '...1111111111...', '...1.1.1.1.1.1..', '....11111111....', '......1..1......', '......1111......'], { 1: '#3ad0e0' }, { outline: false }), s.balloon.x, s.balloon.y);
  if (s.balloonPop) { ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#3ad0e0'; ctx.fillText(s.balloonPop.pts, s.balloonPop.x, 47); }
  if (s.boss) { const B = s.boss; ctx.fillStyle = '#2a4fa8'; ctx.fillRect(B.x + 4, B.y, B.w - 8, B.h); ctx.fillRect(B.x, B.y + 4, B.w, B.h - 8); ctx.fillStyle = '#ff3040'; ctx.fillRect(B.x + 10, B.y + 5, 3, 2); ctx.fillStyle = '#c8d8ff'; ctx.fillRect(B.x + 4, B.y + 11, B.w - 12, 2);
    ctx.fillStyle = '#300'; ctx.fillRect(40, 30, 144, 3); ctx.fillStyle = '#ff5d73'; ctx.fillRect(40, 30, 144 * Math.max(0, B.hp / B.max), 3); }
  ctx.fillStyle = '#e8892e'; for (let i = 0; i < 4; i++) for (let y = 0; y < 16; y++) for (let x = 0; x < 22; x++) if (s.shields[i][y * 22 + x]) ctx.fillRect(SHIELD_X[i] + x, SHIELD_Y + y, 1, 1);
  if (s.beam) { const g = ctx.createLinearGradient(s.beam.x, 0, s.beam.x + MEGA.w, 0); g.addColorStop(0, 'rgba(126,240,255,0)'); g.addColorStop(0.5, `rgba(220,255,255,${s.beam.t * 3})`); g.addColorStop(1, 'rgba(126,240,255,0)'); ctx.fillStyle = g; ctx.fillRect(s.beam.x, 0, MEGA.w, PY); }
  const pl = s.player; if (!pl.dead) P.blit(ctx, P.sprite('turret', PLAYER, { 1: '#e8892e', 2: '#14101c' }, { outline: false }), pl.x, PY); else if (Math.floor(pl.dead / 6) % 2) { ctx.fillStyle = '#e8892e'; for (let i = 0; i < 9; i++) ctx.fillRect(pl.x + ((i * 7) % 13), PY + 2 + ((i * 5) % 6), 1, 1); }
  if (s.shot) { ctx.fillStyle = '#fff'; ctx.fillRect(s.shot.x, s.shot.y, 1, 4); }
  for (const b of Object.values(s.bombs)) if (b) { ctx.fillStyle = '#fbf1e0'; const ph = Math.floor(b.anim / 4) % 2;
    if (b.kind === 'pebble') { ctx.fillRect(b.x + 1, b.y, 1, 7); ctx.fillRect(b.x + (ph ? 0 : 2), b.y + 2 + ph * 2, 1, 1); }
    else if (b.kind === 'boss') { ctx.fillRect(b.x + 1, b.y, 1, 7); ctx.fillRect(b.x, b.y + (ph ? 0 : 5), 3, 1); }
    else for (let i = 0; i < 7; i++) ctx.fillRect(b.x + ((i + ph) % 3), b.y + i, 1, 1); }
  ctx.fillStyle = '#5fd37a'; ctx.fillRect(0, GROUND, W, 1);
  if (s.inu) { const c = Math.min(1, s.charge / MEGA.charge); ctx.fillStyle = '#222'; ctx.fillRect(84, H - 8, 56, 3); ctx.fillStyle = s.megaCd > 0 ? '#3a6a80' : c >= 1 ? '#fff' : '#7ef0ff'; ctx.fillRect(84, H - 8, 56 * (s.megaCd > 0 ? 1 - s.megaCd / MEGA.cd : c), 3); }
}
