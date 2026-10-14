// BARK INVADERS — original fixed-shooter remix. Shiba barks down a descending rug-pull fleet; shields erode.
import { rng, clamp, aabb } from '../core/rng.js';
export const META = { id: 'bark-invaders', title: 'BARK INVADERS', color: '#ff5d73', blurb: 'The rug-pull fleet is coming down. Bark them out of the sky before they reach your kennel!', controls: 'Left/Right to move, Space / A to bark' };
export const W = 384, H = 216, PY = 196, COLS = 9, ROWS = 4, EW = 14, EH = 10, GX = 28, GY = 18;
export const ROW_PTS = [30, 20, 20, 10], WHALE_PTS = [50, 100, 150, 300];
export function create(seed = 1) { const s = { id: META.id, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, over: false, t: 0, ev: [], shots: 0, flash: 0 }; s.player = { x: W / 2, inv: 0 }; s.shields = makeShields(); wave(s); return s; }
export function makeShields() { const out = []; for (const cx of [72, 152, 232, 312]) { const cells = []; for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) if (!(y === 0 && (x === 0 || x === 7)) && !(y >= 3 && x >= 3 && x <= 4)) cells.push({ x: cx - 12 + x * 3, y: 162 + y * 3, w: 3, h: 3, hp: 2 }); out.push(cells); } return out; }
function wave(s) {
  s.fleet = []; const top = 26 + Math.min(s.level - 1, 5) * 8;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) s.fleet.push({ r, c, x: 40 + c * GX, y: top + r * GY, w: EW, h: EH, alive: true });
  s.dir = 1; s.bullet = null; s.bombs = []; s.fireT = 1.5; s.whale = null; s.whaleT = 14; s.anim = 0;
}
export const fleetSpeed = (s) => 10 + (COLS * ROWS - s.fleet.filter((e) => e.alive).length) * 1.5 + s.level * 3;
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.t += dt; s.flash = Math.max(0, s.flash - dt); const P = s.player;
  P.inv = Math.max(0, P.inv - dt);
  P.x = clamp(P.x + ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * 130 * dt, 12, W - 12);
  if ((inp.a || inp.up) && !s.bullet) { s.bullet = { x: P.x - 1, y: PY - 10, w: 2, h: 6 }; s.shots++; s.ev.push('bark'); }
  if (s.bullet) { s.bullet.y -= 280 * dt; if (s.bullet.y < 0) s.bullet = null; }
  // fleet march
  const alive = s.fleet.filter((e) => e.alive), v = fleetSpeed(s) * dt * s.dir; s.anim += dt * (fleetSpeed(s) / 20);
  const minX = Math.min(...alive.map((e) => e.x)), maxX = Math.max(...alive.map((e) => e.x + e.w));
  if ((s.dir > 0 && maxX + v > W - 6) || (s.dir < 0 && minX + v < 6)) { s.dir *= -1; for (const e of alive) e.y += 8; }
  else for (const e of alive) e.x += v;
  // enemy fire: bottom-most of a random column
  s.fireT -= dt; if (s.fireT <= 0 && alive.length) { s.fireT = Math.max(0.35, 1.25 - s.level * 0.1) * (0.6 + s.rnd() * 0.8);
    const cols = [...new Set(alive.map((e) => e.c))], col = cols[Math.floor(s.rnd() * cols.length)];
    const sh = alive.filter((e) => e.c === col).sort((a, b) => b.y - a.y)[0]; s.bombs.push({ x: sh.x + EW / 2 - 1, y: sh.y + EH, w: 3, h: 6 }); }
  for (const b of s.bombs) b.y += (85 + s.level * 10) * dt; s.bombs = s.bombs.filter((b) => b.y < H);
  // whale bonus ship
  s.whaleT -= dt; if (s.whaleT <= 0 && !s.whale) { s.whale = { x: s.dir > 0 ? -24 : W, y: 10, w: 22, h: 9, vx: s.dir > 0 ? 50 : -50 }; s.whaleT = 18; s.ev.push('honk'); }
  if (s.whale) { s.whale.x += s.whale.vx * dt; if (s.whale.x < -30 || s.whale.x > W + 30) s.whale = null; }
  // collisions: player bullet
  if (s.bullet) {
    const hit = alive.find((e) => aabb(s.bullet, e));
    if (hit) { hit.alive = false; s.score += ROW_PTS[hit.r]; s.bullet = null; s.ev.push('hit'); s.pop = { x: hit.x, y: hit.y, t: 0.25 }; }
    else if (s.whale && aabb(s.bullet, s.whale)) { const pts = WHALE_PTS[s.shots % 4]; s.score += pts; s.bonus = { pts, x: s.whale.x, y: s.whale.y, t: 1 }; s.whale = null; s.bullet = null; s.ev.push('boom'); }
    else if (hitShield(s, s.bullet)) s.bullet = null;
  }
  s.bombs = s.bombs.filter((b) => !hitShield(s, b));
  for (const e of alive) for (const sh of s.shields) for (const c of sh) if (c.hp > 0 && aabb(e, c)) c.hp = 0;
  const pbox = { x: P.x - 8, y: PY - 6, w: 16, h: 10 };
  if (P.inv <= 0 && s.bombs.some((b) => aabb(b, pbox))) { s.lives--; s.bombs = []; P.inv = 1.6; s.flash = 1; s.ev.push('boom'); if (s.lives <= 0) { s.over = true; return; } }
  if (alive.some((e) => e.alive && e.y + e.h >= PY - 6)) { s.lives = 0; s.over = true; s.ev.push('die'); return; }
  if (s.pop) { s.pop.t -= dt; if (s.pop.t <= 0) s.pop = null; } if (s.bonus) { s.bonus.t -= dt; if (s.bonus.t <= 0) s.bonus = null; }
  if (!s.fleet.some((e) => e.alive)) { s.level++; s.score += 100 * s.level; s.ev.push('level'); wave(s); }
}
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
  if (!(s.player.inv > 0 && Math.floor(now * 12) % 2)) P.blitC(ctx, P.shibaBack(), s.player.x, PY);
  if (s.bullet) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(s.bullet.x, s.bullet.y, 2, 6); }
  ctx.fillStyle = '#ff6a4a'; for (const b of s.bombs) { ctx.fillRect(b.x, b.y, 3, 3); ctx.fillRect(b.x + ((Math.floor(b.y / 3) % 2) ? 1 : 0), b.y + 3, 2, 3); }
  if (s.pop) { ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.fillText('WOOF!', s.pop.x - 4, s.pop.y + 8); }
  if (s.bonus) { ctx.fillStyle = '#7ef0ff'; ctx.font = '8px monospace'; ctx.fillText(s.bonus.pts, s.bonus.x, s.bonus.y + 8); }
}
