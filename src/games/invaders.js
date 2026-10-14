// BARK INVADERS — original fixed-shooter remix. Shiba barks down a descending rug-pull fleet; shields erode.
import { rng, clamp, aabb } from '../core/rng.js';
export const META = { id: 'bark-invaders', title: 'BARK INVADERS', color: '#ff5d73', blurb: 'The rug-pull fleet is coming down. Bark them out of the sky before they reach your kennel!', controls: 'Left/Right to move, Space / A to bark', inuMove: 'MEGA WOOF: hold A for 1s, release for a piercing blast (6s cooldown). Every 3rd wave a rug-pull whale boss attacks.', classicNote: 'Pure fixed-shooter rules.' };
export const MEGA = { charge: 0.9, cd: 6, w: 22, bossDmg: 8 };
export const isBossWave = (s) => s.inu && s.level % 3 === 0;
const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y, c, n }), pop = (s, x, y, text, c = '#7ef0ff') => s.pops.push({ x, y, text, c, t: 1 });
export const W = 384, H = 216, PY = 196, COLS = 9, ROWS = 4, EW = 14, EH = 10, GX = 28, GY = 18;
export const ROW_PTS = [30, 20, 20, 10], WHALE_PTS = [50, 100, 150, 300];
export function create(seed = 1, opts = {}) { const s = { id: META.id, inu: !!opts.inu, fx: [], pops: [], shake: 0, charge: 0, megaCd: 0, prevA: false, beam: null, stats: { bosses: 0, megas: 0, streak: 0, best: 0 }, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, over: false, t: 0, ev: [], shots: 0, flash: 0 }; s.player = { x: W / 2, inv: 0 }; s.shields = makeShields(); wave(s); return s; }
export function makeShields() { const out = []; for (const cx of [72, 152, 232, 312]) { const cells = []; for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) if (!(y === 0 && (x === 0 || x === 7)) && !(y >= 3 && x >= 3 && x <= 4)) cells.push({ x: cx - 12 + x * 3, y: 162 + y * 3, w: 3, h: 3, hp: 2 }); out.push(cells); } return out; }
function wave(s) {
  s.fleet = []; const top = 26 + Math.min(s.level - 1, 5) * 8;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) s.fleet.push({ r, c, x: 40 + c * GX, y: top + r * GY, w: EW, h: EH, alive: true });
  s.boss = isBossWave(s) ? { x: 160, y: 30, w: 64, h: 24, hp: 30 + s.level * 4, max: 30 + s.level * 4, vx: 40 + s.level * 4 } : null; if (s.boss) s.fleet = s.fleet.filter((e) => e.r >= 2);
  s.dir = 1; s.bullet = null; s.bombs = []; s.fireT = 1.5; s.whale = null; s.whaleT = 14; s.anim = 0;
}
export const fleetSpeed = (s) => 10 + (COLS * ROWS - s.fleet.filter((e) => e.alive).length) * 1.5 + s.level * 3;
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.t += dt; s.flash = Math.max(0, s.flash - dt); const P = s.player;
  P.inv = Math.max(0, P.inv - dt);
  P.x = clamp(P.x + ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * 130 * dt, 12, W - 12);
  if (s.inu) { const A_ = inp.a || inp.up; s.megaCd = Math.max(0, s.megaCd - dt); if (A_) s.charge += dt; else { if (s.prevA && s.charge >= MEGA.charge && s.megaCd <= 0) megaWoof(s); s.charge = 0; } s.prevA = A_; }
  if (s.beam) { s.beam.t -= dt; if (s.beam.t <= 0) s.beam = null; }
  if ((inp.a || inp.up) && !s.bullet) { s.bullet = { x: P.x - 1, y: PY - 10, w: 2, h: 6 }; s.shots++; s.ev.push('bark'); }
  if (s.bullet) { s.bullet.y -= 280 * dt; if (s.bullet.y < 0) s.bullet = null; }
  // fleet march
  if (s.boss) { const B = s.boss; B.x += B.vx * dt; if (B.x < 8 || B.x + B.w > W - 8) B.vx *= -1; B.fireT = (B.fireT ?? 1) - dt; if (B.fireT <= 0) { B.fireT = 1.1; for (const o of [-1, 0, 1]) s.bombs.push({ x: B.x + B.w / 2 + o * 18, y: B.y + B.h, w: 3, h: 6 }); } }
  const alive = s.fleet.filter((e) => e.alive), v = fleetSpeed(s) * dt * s.dir; s.anim += dt * (fleetSpeed(s) / 20);
  if (!alive.length && s.boss) { /* boss only */ } else {
  const minX = Math.min(...alive.map((e) => e.x)), maxX = Math.max(...alive.map((e) => e.x + e.w));
  if ((s.dir > 0 && maxX + v > W - 6) || (s.dir < 0 && minX + v < 6)) { s.dir *= -1; for (const e of alive) e.y += 8; }
  else for (const e of alive) e.x += v; }
  // enemy fire: bottom-most of a random column
  s.fireT -= dt; if (s.fireT <= 0 && alive.length && !(s.boss && s.rnd() < 0.5)) { s.fireT = Math.max(0.35, 1.25 - s.level * 0.1) * (0.6 + s.rnd() * 0.8);
    const cols = [...new Set(alive.map((e) => e.c))], col = cols[Math.floor(s.rnd() * cols.length)];
    const sh = alive.filter((e) => e.c === col).sort((a, b) => b.y - a.y)[0]; s.bombs.push({ x: sh.x + EW / 2 - 1, y: sh.y + EH, w: 3, h: 6 }); }
  for (const b of s.bombs) b.y += (85 + s.level * 10) * dt; s.bombs = s.bombs.filter((b) => b.y < H);
  // whale bonus ship
  s.whaleT -= dt; if (s.whaleT <= 0 && !s.whale) { s.whale = { x: s.dir > 0 ? -24 : W, y: 10, w: 22, h: 9, vx: s.dir > 0 ? 50 : -50 }; s.whaleT = 18; s.ev.push('honk'); }
  if (s.whale) { s.whale.x += s.whale.vx * dt; if (s.whale.x < -30 || s.whale.x > W + 30) s.whale = null; }
  // collisions: player bullet
  if (s.bullet) {
    const hit = alive.find((e) => aabb(s.bullet, e));
    if (hit) { hit.alive = false; s.score += ROW_PTS[hit.r]; s.bullet = null; s.ev.push('hit'); s.pop = { x: hit.x, y: hit.y, t: 0.25 }; fx(s, hit.x + 7, hit.y + 5, hit.r === 0 ? '#9b59d6' : hit.r === 1 ? '#e0303a' : '#c8c8a0', 10); s.stats.streak++; s.stats.best = Math.max(s.stats.best, s.stats.streak); if (s.inu && s.stats.streak % 10 === 0) { s.score += 100; pop(s, hit.x, hit.y, `STREAK x${s.stats.streak} +100`, '#f2c14e'); } }
    else if (s.boss && aabb(s.bullet, s.boss)) { s.bullet = null; hurtBoss(s, 1); }
    else if (s.whale && aabb(s.bullet, s.whale)) { const pts = WHALE_PTS[s.shots % 4]; s.score += pts; s.bonus = { pts, x: s.whale.x, y: s.whale.y, t: 1 }; s.whale = null; s.bullet = null; s.ev.push('boom'); }
    else if (hitShield(s, s.bullet)) { s.bullet = null; s.stats.streak = 0; }
  }
  s.bombs = s.bombs.filter((b) => !hitShield(s, b));
  for (const e of alive) for (const sh of s.shields) for (const c of sh) if (c.hp > 0 && aabb(e, c)) c.hp = 0;
  const pbox = { x: P.x - 8, y: PY - 6, w: 16, h: 10 };
  if (s.bullet && s.bullet.y < 2) s.stats.streak = 0;
  if (P.inv <= 0 && s.bombs.some((b) => aabb(b, pbox))) { s.lives--; s.bombs = []; P.inv = 1.6; s.flash = 1; s.ev.push('boom'); s.shake = 0.45; fx(s, P.x, PY, '#e0802c', 26); if (s.lives <= 0) { s.over = true; return; } }
  if (alive.some((e) => e.alive && e.y + e.h >= PY - 6)) { s.lives = 0; s.over = true; s.ev.push('die'); return; }
  if (s.pop) { s.pop.t -= dt; if (s.pop.t <= 0) s.pop = null; } if (s.bonus) { s.bonus.t -= dt; if (s.bonus.t <= 0) s.bonus = null; }
  if (!s.fleet.some((e) => e.alive) && !s.boss) { s.level++; s.score += 100 * s.level; s.ev.push('level'); wave(s); }
}
function megaWoof(s) { const x = s.player.x; s.megaCd = MEGA.cd; s.stats.megas++; s.beam = { x: x - MEGA.w / 2, t: 0.3 }; s.ev.push('mega'); s.shake = 0.3; const box = { x: x - MEGA.w / 2, y: 0, w: MEGA.w, h: PY };
  let n = 0; for (const e of s.fleet) if (e.alive && aabb(e, box)) { e.alive = false; s.score += ROW_PTS[e.r]; n++; fx(s, e.x + 7, e.y + 5, '#7ef0ff', 8); }
  if (n > 1) { s.score += n * 20; pop(s, x, 120, `MEGA WOOF x${n}`, '#7ef0ff'); }
  for (const sh of s.shields) for (const c of sh) if (c.hp > 0 && aabb(c, box)) c.hp = 0;
  if (s.boss && aabb(s.boss, box)) hurtBoss(s, MEGA.bossDmg); }
function hurtBoss(s, d) { const B = s.boss; B.hp -= d; s.ev.push('hit'); fx(s, B.x + B.w / 2, B.y + B.h, '#3a6ed8', 6);
  if (B.hp <= 0) { s.score += 2000; s.stats.bosses++; fx(s, B.x + B.w / 2, B.y + 12, '#f2c14e', 40); pop(s, B.x, B.y + 10, 'WHALE REKT +2000', '#f2c14e'); s.shake = 0.6; s.boss = null; s.ev.push('boom'); } }
export const ghostPos = (s) => ({ x: s.player.x, y: PY });
function hitShield(s, b) { for (const sh of s.shields) for (const c of sh) if (c.hp > 0 && aabb(b, c)) { c.hp--; return true; } return false; }
export function bot(s) {
  const P = s.player, alive = s.fleet.filter((e) => e.alive); if (!alive.length) return {};
  const danger = s.bombs.find((b) => Math.abs(b.x - P.x) < 12 && b.y > 120);
  if (danger) return danger.x < P.x ? { right: true } : { left: true };
  const t = alive.reduce((a, e) => (Math.abs(e.x + 7 - P.x) < Math.abs(a.x + 7 - P.x) ? e : a));
  const tx = t.x + EW / 2 + s.dir * 6; return { left: tx < P.x - 3, right: tx > P.x + 3, a: Math.abs(tx - P.x) < 10 };
}
// ---------- render ----------
const SPR = {
  rug: [['..pppppp..', '.pyppppyp.', 'pppekkepp.', 'pppppppppp', 'p.p.p.p.p.', '.p.p.p.p.p'], ['..pppppp..', '.pyppppyp.', '.ppekkeppp', 'pppppppppp', '.p.p.p.p.p', 'p.p.p.p.p.']],
  candle: [['....r.....', '..rrrrr...', '..rerer...', '..rrrrr...', '..rrrrr...', '....r.....', '....r.....'], ['....r.....', '..rrrrr...', '..rerer...', '..rrrrr...', '..rrrrr...', '...r......', '.....r....']],
  dump: [['.gggggg.', 'ggeggegg', 'gggggggg', 'gg.ss.gg', 'gggggggg', '.g.gg.g.'], ['.gggggg.', 'ggeggegg', 'gggggggg', 'ggs..sgg', 'gggggggg', 'g..gg..g']],
};
const PAL = { p: '#9b59d6', y: '#f2c14e', e: '#fff', k: '#1a1424', r: '#e0303a', g: '#8a8a6a', s: '#3a2a20' };
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#070617'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 3 ? '#2a2850' : '#55507a'; ctx.fillRect((i * 97 + 13) % W, (i * 53 + Math.floor(now * 6)) % H, 1, 1); }
  ctx.fillStyle = '#2c6e3a'; ctx.fillRect(0, PY + 8, W, 2);
  const fr = Math.floor(s.anim) % 2;
  for (const e of s.fleet) if (e.alive) { const kind = e.r === 0 ? 'rug' : e.r === 1 ? 'candle' : 'dump'; P.blit(ctx, P.sprite(kind + fr, SPR[kind][fr], PAL), e.x, e.y); }
  if (s.whale) P.blit(ctx, P.sprite('whale', ['....bbbbbbbb....', '..bbbbbbbbbbbb..', '.bbebbbbbbbbbbbb', 'bbbbbbbbbbbbbbbw', '.bwwwwwwwwwwwbb.', '..bbbbbbbbbbb...'], { b: '#3a6ed8', e: '#fff', w: '#dfe8ff' }), s.whale.x, s.whale.y);
  for (const sh of s.shields) for (const c of sh) if (c.hp > 0) { ctx.fillStyle = c.hp > 1 ? '#c88a3c' : '#7a5222'; ctx.fillRect(c.x, c.y, c.w, c.h); }
  if (s.boss) { const B = s.boss; P.blit(ctx, P.sprite('bosswhale', ['......bbbbbbbbbbbbbbbb..........', '...bbbbbbbbbbbbbbbbbbbbbb......b', '..bbbebbbbbbbbbbbbbbbbbbbbb...bb', '.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.', 'brrrrrrrrrrrrrrrrrrrbbbbbbbbbb..', '.wwwwwwwwwwwwwwwwwwwwwwwwbbb....', '..wwwwwwwwwwwwwwwwwwwwwbb.......', '....rrrrrrrrrrrrrrrrr...........', '...rrrrrrrrrrrrrrrrrrr..........'], { b: '#2a4fa8', e: '#ff3040', w: '#c8d8ff', r: '#9b2a3a' }), B.x, B.y, 2);
    ctx.fillStyle = '#300'; ctx.fillRect(100, 13, 184, 4); ctx.fillStyle = '#ff5d73'; ctx.fillRect(100, 13, 184 * Math.max(0, B.hp / B.max), 4); ctx.font = '7px Silkscreen, monospace'; ctx.fillStyle = '#fff'; ctx.fillText('RUG-PULL WHALE', 104, 24); }
  if (s.beam) { const g = ctx.createLinearGradient(s.beam.x, 0, s.beam.x + MEGA.w, 0); g.addColorStop(0, 'rgba(126,240,255,0)'); g.addColorStop(0.5, `rgba(220,255,255,${s.beam.t * 3})`); g.addColorStop(1, 'rgba(126,240,255,0)'); ctx.fillStyle = g; ctx.fillRect(s.beam.x, 0, MEGA.w, PY - 6); }
  if (s.inu) { const c = Math.min(1, s.charge / MEGA.charge); ctx.fillStyle = '#222'; ctx.fillRect(4, 206, 40, 4); ctx.fillStyle = s.megaCd > 0 ? '#3a6a80' : c >= 1 ? '#fff' : '#7ef0ff'; ctx.fillRect(4, 206, 40 * (s.megaCd > 0 ? 1 - s.megaCd / MEGA.cd : c), 4); ctx.font = '7px Silkscreen, monospace'; ctx.fillStyle = '#7ef0ff'; ctx.fillText(s.megaCd > 0 ? 'RECHARGING' : c >= 1 ? 'RELEASE!' : 'HOLD A: MEGA WOOF', 4, 203);
    if (c > 0.2 && s.megaCd <= 0) { ctx.fillStyle = `rgba(126,240,255,${c * 0.6})`; ctx.beginPath(); ctx.arc(s.player.x, PY - 6, 3 + c * 5, 0, 7); ctx.fill(); } }
  if (!(s.player.inv > 0 && Math.floor(now * 12) % 2)) P.blitC(ctx, P.shibaBack(), s.player.x, PY);
  if (s.bullet) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(s.bullet.x, s.bullet.y, 2, 6); }
  ctx.fillStyle = '#ff6a4a'; for (const b of s.bombs) { ctx.fillRect(b.x, b.y, 3, 3); ctx.fillRect(b.x + ((Math.floor(b.y / 3) % 2) ? 1 : 0), b.y + 3, 2, 3); }
  if (s.pop) { ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.fillText('WOOF!', s.pop.x - 4, s.pop.y + 8); }
  if (s.bonus) { ctx.fillStyle = '#7ef0ff'; ctx.font = '8px monospace'; ctx.fillText(s.bonus.pts, s.bonus.x, s.bonus.y + 8); }
}
