// BARK INVADERS — arcade-accurate fixed-shooter rules (224x256 native), original Inu art and names.
// 11x5 rack moved one alien per frame (so the march speeds up as aliens die), one player shot, three bomb types
// (rolling = column above the player, plunger + squiggly = fixed column tables), score-based reload rate,
// mystery ship scored by shot count, pixel-eroded shields, each wave starting lower, extra life at 1500.
import { rng, clamp } from '../core/rng.js';
export const META = { id: 'bark-invaders', title: 'BARK INVADERS', color: '#ff5d73', blurb: 'An 11x5 rug-pull fleet marches down one step at a time, faster as it thins. One bark on screen at a time. Make it count.', controls: 'Left/Right to move, Space / A to bark', inuMove: 'MEGA WOOF: hold A ~1s, release for a piercing blast (6s cooldown). Every 3rd wave a rug-pull whale boss joins the fleet.', classicNote: 'Arcade-accurate tables.' };
export const W = 224, H = 256, COLS = 11, ROWS = 5, PY = 216, SHIELD_Y = 192, GROUND = 239;
export const ROW_TYPE = ['squid', 'crab', 'crab', 'octo', 'octo'], TYPE_PTS = { squid: 30, crab: 20, octo: 10 }, TYPE_W = { squid: 8, crab: 11, octo: 12 };
export const WAVE_Y = [136, 160, 176, 184, 184, 184, 192, 192, 192]; // bottom-row y at the start of each wave
export const waveY = (wave) => WAVE_Y[wave === 1 ? 0 : 1 + ((wave - 2) % 8)];
export const PLUNGER_COLS = [1, 7, 1, 1, 1, 4, 11, 1, 6, 3, 1, 1, 11, 9, 2, 8];
export const SQUIGGLY_COLS = [11, 1, 6, 3, 1, 1, 11, 9, 2, 8, 2, 11, 4, 7, 10];
export const MYSTERY_PTS = [100, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100];
export const mysteryScore = (shots) => MYSTERY_PTS[shots % 15];
export const RELOAD = [[200, 48], [1000, 16], [2000, 11], [3000, 8], [Infinity, 7]]; // [score below, frames between bombs]
export const reloadFrames = (score) => RELOAD.find(([lim]) => score < lim)[1];
export const MYSTERY_FRAMES = 0x600, SHOT_SPEED = 4, PLAYER_SPEED = 1, EXTRA_LIFE = 1500;
export const MEGA = { charge: 0.9, cd: 6, w: 20, bossDmg: 8 };
export const isBossWave = (s) => s.inu && s.wave % 3 === 0;
const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y, c, n }), pop = (s, x, y, text, c = '#7ef0ff') => s.pops.push({ x, y, text, c, t: 1 });
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, wave: 1, over: false, t: 0, ev: [], fx: [], pops: [], shake: 0, flash: 0, acc: 0, frame: 0,
    shots: 0, extra: false, charge: 0, megaCd: 0, prevA: false, beam: null, stats: { bosses: 0, megas: 0, streak: 0, best: 0 } };
  s.player = { x: 104, dead: 0 }; newWave(s); return s;
}
export function makeShield() { const b = new Uint8Array(22 * 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 22; x++) { let on = true;
  if (y < 4 && (x < 4 - y || x > 17 + y)) on = false; if (y >= 12 && x >= 5 && x <= 16) on = false; if (y >= 10 && y < 12 && x >= 7 && x <= 14) on = false; b[y * 22 + x] = on ? 1 : 0; } return b; }
export const SHIELD_X = [32, 77, 122, 167];
function newWave(s) {
  const by = waveY(s.wave); s.aliens = []; // order = bottom-left first, like the arcade's update order
  for (let r = ROWS - 1; r >= 0; r--) for (let c = 0; c < COLS; c++) s.aliens.push({ r, c, type: ROW_TYPE[r], x: 24 + c * 16, y: by - (ROWS - 1 - r) * 16, alive: true });
  s.ptr = 0; s.dir = 1; s.dropping = false; s.anim = 0; s.shot = null; s.bombs = { roll: null, plunger: null, squiggly: null }; s.bombTurn = 0; s.sinceBomb = 0; s.plIdx = 0; s.sqIdx = 0;
  s.ufo = null; s.ufoT = MYSTERY_FRAMES; s.shields = SHIELD_X.map(makeShield); s.player.dead = 0; s.player.x = 104; s.ready = 60;
  s.boss = isBossWave(s) ? { x: 80, y: 44, w: 48, h: 16, hp: 30 + s.wave * 3, max: 30 + s.wave * 3, vx: 0.6, fireT: 60 } : null;
}
export const alive = (s) => s.aliens.filter((a) => a.alive);
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
    const a = s.aliens.find((a) => a.alive && hit(sh, box(a)));
    if (a) { a.alive = false; s.score += TYPE_PTS[a.type]; s.ev.push('hit'); s.pop = { x: a.x, y: a.y, f: 16 }; fx(s, a.x + 8, a.y + 4, a.type === 'squid' ? '#ff5dc8' : a.type === 'crab' ? '#fbf1e0' : '#5fd37a', 9); done = true; streak(s, a); }
    else if (s.ufo && hit(sh, s.ufo)) { const pts = mysteryScore(s.shots); s.score += pts; s.ufoPop = { x: s.ufo.x, pts, f: 90 }; fx(s, s.ufo.x + 8, s.ufo.y + 4, '#3ad0e0', 18); s.ufo = null; s.ev.push('boom'); done = true; }
    else if (s.boss && hit(sh, s.boss)) { hurtBoss(s, 1); done = true; }
    else if (erode(s, sh, SHOT_MASK)) { done = true; s.stats.streak = 0; }
    else if (Object.values(s.bombs).some((b) => b && hit(sh, b))) { for (const k in s.bombs) if (s.bombs[k] && hit(sh, s.bombs[k])) s.bombs[k] = null; done = true; }
    else if (sh.y < 32) { done = true; s.stats.streak = 0; }
    if (done) s.shot = null; }
  bombs(s); ufo(s); boss(s);
  for (const a of s.aliens) if (a.alive && a.y + 8 >= SHIELD_Y) erodeRect(s, box(a));
  if (!s.extra && s.score >= EXTRA_LIFE) { s.extra = true; s.lives++; s.ev.push('pow'); }
  if (s.pop && --s.pop.f <= 0) s.pop = null; if (s.ufoPop && --s.ufoPop.f <= 0) s.ufoPop = null;
  if (!alive(s).length && !s.boss) { s.wave++; s.level = s.wave; s.ev.push('level'); newWave(s); }
}
function streak(s, a) { s.stats.streak++; s.stats.best = Math.max(s.stats.best, s.stats.streak); if (s.inu && s.stats.streak % 10 === 0) { s.score += 100; pop(s, a.x, a.y, `STREAK x${s.stats.streak} +100`, '#f2c14e'); } }
// One alien moves per frame. A full pass over the living aliens = one rack step, so fewer aliens = faster march.
export function marchOne(s) {
  const list = s.aliens; const n = list.length; if (!alive(s).length) return;
  let guard = 0; while (!list[s.ptr % n].alive && guard++ < n) s.ptr++;
  const a = list[s.ptr % n];
  if (s.dropping) a.y += 8; else { const only = alive(s).length === 1; a.x += s.dir > 0 ? (only ? 3 : 2) : -2; }
  if (a.y + 8 >= PY) { s.lives = 0; s.over = true; s.ev.push('die'); return; }
  s.ptr++;
  // end of pass?
  let rest = false; for (let i = s.ptr; i < n; i++) if (list[i].alive) { rest = true; break; }
  if (!rest) { s.ptr = 0; s.anim ^= 1; s.ev.push('march');
    if (s.dropping) { s.dropping = false; s.dir *= -1; }
    else { const al = alive(s); const minX = Math.min(...al.map((a) => box(a).x)), maxX = Math.max(...al.map((a) => box(a).x + box(a).w)); if ((s.dir > 0 && maxX >= 214) || (s.dir < 0 && minX <= 9)) s.dropping = true; } }
}
const colBottom = (s, col) => s.aliens.filter((a) => a.alive && a.c === col - 1).sort((p, q) => q.y - p.y)[0];
function bombs(s) {
  const al = alive(s); s.sinceBomb++; const sp = al.length <= 8 ? 5 / 3 : 4 / 3;
  for (const k of ['roll', 'plunger', 'squiggly']) { const b = s.bombs[k]; if (!b) continue; b.y += sp; b.anim++;
    const pb = { x: s.player.x, y: PY, w: 13, h: 8 };
    if (!s.player.dead && hit(b, pb)) { s.bombs[k] = null; playerHit(s); continue; }
    if (erode(s, b, BOMB_MASK)) { s.bombs[k] = null; continue; }
    if (b.y + b.h >= GROUND) { s.bombs[k] = null; fx(s, b.x, GROUND - 2, '#ff6a4a', 3); } }
  if (!al.length || s.player.dead || s.sinceBomb < reloadFrames(s.score)) return;
  const k = ['roll', 'plunger', 'squiggly'][s.bombTurn]; s.bombTurn = (s.bombTurn + 1) % 3; if (s.bombs[k]) return;
  let src = null;
  if (k === 'roll') { const near = al.reduce((m, a) => (Math.abs(a.x + 8 - (s.player.x + 6)) < Math.abs(m.x + 8 - (s.player.x + 6)) ? a : m)); src = colBottom(s, near.c + 1); }
  else if (k === 'plunger') { if (al.length === 1) return; for (let i = 0; i < 16 && !src; i++) { src = colBottom(s, PLUNGER_COLS[s.plIdx]); s.plIdx = (s.plIdx + 1) % PLUNGER_COLS.length; } }
  else { if (s.ufo) return; for (let i = 0; i < 15 && !src; i++) { src = colBottom(s, SQUIGGLY_COLS[s.sqIdx]); s.sqIdx = (s.sqIdx + 1) % SQUIGGLY_COLS.length; } }
  if (!src) return; s.bombs[k] = { x: src.x + 7, y: src.y + 8, w: 3, h: 7, kind: k, anim: 0 }; s.sinceBomb = 0;
}
function playerHit(s) { s.lives--; s.player.dead = 60; s.flash = 1; s.shake = 0.45; s.ev.push('boom'); fx(s, s.player.x + 6, PY + 4, '#e0802c', 24); s.shot = null; }
function ufo(s) {
  if (!s.ufo) { if (--s.ufoT <= 0) { s.ufoT = MYSTERY_FRAMES; if (alive(s).length >= 8 && !s.bombs.squiggly) { const right = s.shots % 2 === 1; s.ufo = { x: right ? 208 : 0, y: 40, w: 16, h: 7, vx: right ? -1 : 1 }; s.ev.push('honk'); } } return; }
  s.ufo.x += s.ufo.vx; if (s.ufo.x < -16 || s.ufo.x > W) s.ufo = null;
}
function boss(s) { const B = s.boss; if (!B) return; B.x += B.vx; if (B.x < 8 || B.x + B.w > W - 8) B.vx *= -1; if (--B.fireT <= 0) { B.fireT = 70; if (!s.bombs.plunger) s.bombs.plunger = { x: B.x + B.w / 2, y: B.y + B.h, w: 3, h: 7, kind: 'plunger', anim: 0 }; } }
function hurtBoss(s, d) { const B = s.boss; B.hp -= d; s.ev.push('hit'); fx(s, B.x + B.w / 2, B.y + B.h, '#3a6ed8', 6);
  if (B.hp <= 0) { s.score += 2000; s.stats.bosses++; fx(s, B.x + B.w / 2, B.y + 8, '#f2c14e', 40); pop(s, B.x + 24, B.y, 'WHALE REKT +2000', '#f2c14e'); s.shake = 0.6; s.boss = null; s.ev.push('boom'); } }
function megaWoof(s) { const x = s.player.x + 6; s.megaCd = MEGA.cd; s.stats.megas++; s.beam = { x: x - MEGA.w / 2, t: 0.3 }; s.ev.push('mega'); s.shake = 0.3; const bx = { x: x - MEGA.w / 2, y: 0, w: MEGA.w, h: PY };
  let n = 0; for (const a of s.aliens) if (a.alive && hit(box(a), bx)) { a.alive = false; s.score += TYPE_PTS[a.type]; n++; fx(s, a.x + 8, a.y + 4, '#7ef0ff', 8); }
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
const SPR = { squid: [['...11...', '..1111..', '.111111.', '11.11.11', '11111111', '..1..1..', '.1.11.1.', '1.1..1.1'], ['...11...', '..1111..', '.111111.', '11.11.11', '11111111', '.1.11.1.', '1......1', '.1....1.']],
  crab: [['..1.....1..', '...1...1...', '..1111111..', '.11.111.11.', '11111111111', '1.1111111.1', '1.1.....1.1', '...11.11...'], ['..1.....1..', '1..1...1..1', '1.1111111.1', '111.111.111', '11111111111', '.111111111.', '..1.....1..', '.1.......1.']],
  octo: [['....1111....', '.1111111111.', '111111111111', '111..11..111', '111111111111', '...11..11...', '..11.11.11..', '11........11'], ['....1111....', '.1111111111.', '111111111111', '111..11..111', '111111111111', '..111..111..', '.11..11..11.', '..11....11..']] };
const TYPE_COL = { squid: '#ff5dc8', crab: '#fbf1e0', octo: '#7ee08a' };
const PLAYER = ['.1.......1...', '.11.....11...', '.111111111...', '11111111111..', '1111211121111', '1111111111111', '1111111111111', '1111111111111'];
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#05040d'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { ctx.fillStyle = i % 3 ? '#1a1838' : '#3a3666'; ctx.fillRect((i * 97 + 13) % W, 30 + ((i * 53) % 200), 1, 1); }
  for (const a of s.aliens) if (a.alive) P.blit(ctx, P.sprite('inv' + a.type + s.anim, SPR[a.type][s.anim], { 1: TYPE_COL[a.type] }, { outline: false }), box(a).x, a.y);
  if (s.pop) { ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) ctx.fillRect(s.pop.x + 3 + ((i * 5) % 11), s.pop.y + ((i * 3) % 8), 1, 1); }
  if (s.ufo) P.blit(ctx, P.sprite('ufo', ['.....111111.....', '...1111111111...', '..111111111111..', '.11.11.11.11.11.', '1111111111111111', '..111..11..111..', '...1........1...'], { 1: '#3ad0e0' }, { outline: false }), s.ufo.x, s.ufo.y);
  if (s.ufoPop) { ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#3ad0e0'; ctx.fillText(s.ufoPop.pts, s.ufoPop.x, 47); }
  if (s.boss) { const B = s.boss; ctx.fillStyle = '#2a4fa8'; ctx.fillRect(B.x + 4, B.y, B.w - 8, B.h); ctx.fillRect(B.x, B.y + 4, B.w, B.h - 8); ctx.fillStyle = '#ff3040'; ctx.fillRect(B.x + 10, B.y + 5, 3, 2); ctx.fillStyle = '#c8d8ff'; ctx.fillRect(B.x + 4, B.y + 11, B.w - 12, 2);
    ctx.fillStyle = '#300'; ctx.fillRect(40, 30, 144, 3); ctx.fillStyle = '#ff5d73'; ctx.fillRect(40, 30, 144 * Math.max(0, B.hp / B.max), 3); }
  ctx.fillStyle = '#e8892e'; for (let i = 0; i < 4; i++) for (let y = 0; y < 16; y++) for (let x = 0; x < 22; x++) if (s.shields[i][y * 22 + x]) ctx.fillRect(SHIELD_X[i] + x, SHIELD_Y + y, 1, 1);
  if (s.beam) { const g = ctx.createLinearGradient(s.beam.x, 0, s.beam.x + MEGA.w, 0); g.addColorStop(0, 'rgba(126,240,255,0)'); g.addColorStop(0.5, `rgba(220,255,255,${s.beam.t * 3})`); g.addColorStop(1, 'rgba(126,240,255,0)'); ctx.fillStyle = g; ctx.fillRect(s.beam.x, 0, MEGA.w, PY); }
  const pl = s.player; if (!pl.dead) P.blit(ctx, P.sprite('turret', PLAYER, { 1: '#e8892e', 2: '#14101c' }, { outline: false }), pl.x, PY); else if (Math.floor(pl.dead / 6) % 2) { ctx.fillStyle = '#e8892e'; for (let i = 0; i < 9; i++) ctx.fillRect(pl.x + ((i * 7) % 13), PY + 2 + ((i * 5) % 6), 1, 1); }
  if (s.shot) { ctx.fillStyle = '#fff'; ctx.fillRect(s.shot.x, s.shot.y, 1, 4); }
  for (const b of Object.values(s.bombs)) if (b) { ctx.fillStyle = '#fbf1e0'; const ph = Math.floor(b.anim / 4) % 2;
    if (b.kind === 'roll') { ctx.fillRect(b.x + 1, b.y, 1, 7); ctx.fillRect(b.x + (ph ? 0 : 2), b.y + 2 + ph * 2, 1, 1); }
    else if (b.kind === 'plunger') { ctx.fillRect(b.x + 1, b.y, 1, 7); ctx.fillRect(b.x, b.y + (ph ? 0 : 5), 3, 1); }
    else for (let i = 0; i < 7; i++) ctx.fillRect(b.x + ((i + ph) % 3), b.y + i, 1, 1); }
  ctx.fillStyle = '#5fd37a'; ctx.fillRect(0, GROUND, W, 1);
  if (s.inu) { const c = Math.min(1, s.charge / MEGA.charge); ctx.fillStyle = '#222'; ctx.fillRect(84, H - 8, 56, 3); ctx.fillStyle = s.megaCd > 0 ? '#3a6a80' : c >= 1 ? '#fff' : '#7ef0ff'; ctx.fillRect(84, H - 8, 56 * (s.megaCd > 0 ? 1 - s.megaCd / MEGA.cd : c), 3); }
}
