// PUP CROSSING — original lane-hopper remix. Hop a pup across Kibble Highway and Bonewater Creek into the kennels.
import { rng } from '../core/rng.js';
export const META = { id: 'pup-crossing', title: 'PUP CROSSING', color: '#5fd37a', blurb: 'Hop across the highway, ride the logs over Bonewater Creek and fill all five kennels.', controls: 'Arrows / WASD / D-pad to hop' };
export const T = 16, COLS = 24, ROWS = 12, OY = 20, HOMES = [2, 7, 12, 17, 22], TIME = 30;
export const PTS = { step: 10, home: 50, timeBonus: 2, allHomes: 1000 };
// lane spec: [row, type, baseSpeed(tiles/s, signed), objLen, gap]
const LANES = [[1, 'log', 1.2, 4, 3], [2, 'raft', -1.6, 2, 3], [3, 'log', 0.9, 3, 4], [4, 'raft', -1.3, 3, 3],
  [6, 'truck', -0.9, 2, 5], [7, 'car', 1.7, 1, 5], [8, 'car', -1.2, 1, 4], [9, 'bus', 1.0, 2, 6], [10, 'car', -2.0, 1, 6]];
export const isRiver = (row) => row >= 1 && row <= 4, isRoad = (row) => row >= 6 && row <= 10;
export function create(seed = 1) { const s = { id: META.id, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, over: false, t: 0, ev: [], homes: [false, false, false, false, false], flash: 0 }; build(s); spawn(s); return s; }
function build(s) {
  const mul = 1 + (s.level - 1) * 0.15;
  s.lanes = LANES.map(([row, type, v, len, gap], i) => { const objs = []; const period = len + gap; for (let x = (i * 1.7) % period; x < COLS + period; x += period) objs.push({ x, len }); return { row, type, v: v * mul, objs, span: Math.ceil((COLS + period) / period) * period }; });
}
function spawn(s) { s.pup = { x: 11.5, row: 11, face: 'up', cd: 0, hopT: 0 }; s.best = 11; s.timer = TIME; s.dead = 0; }
const laneAt = (s, row) => s.lanes.find((l) => l.row === row);
// returns object in lane covering tile-space x (pup centre), with tolerance
export function objAt(lane, cx, tol = 0) { return lane.objs.find((o) => { let a = ((o.x % lane.span) + lane.span) % lane.span - 2; return cx >= a - tol && cx <= a + o.len + tol; }); }
function kill(s, why) { s.lives--; s.ev.push(why === 'splash' ? 'splash' : 'die'); s.flash = 1; s.lastDeath = why; if (s.lives <= 0) { s.over = true; return; } s.dead = 0.8; s.deadAt = { x: s.pup.x, row: s.pup.row }; }
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.t += dt; s.flash = Math.max(0, s.flash - dt);
  for (const l of s.lanes) for (const o of l.objs) o.x += l.v * dt;
  if (s.dead > 0) { s.dead -= dt; if (s.dead <= 0) spawn(s); return; }
  const p = s.pup; p.cd -= dt; p.hopT = Math.max(0, p.hopT - dt);
  if (p.cd <= 0) {
    let dx = 0, dy = 0; if (inp.up) { dy = -1; p.face = 'up'; } else if (inp.down) { dy = 1; p.face = 'down'; } else if (inp.left) { dx = -1; p.face = 'left'; } else if (inp.right) { dx = 1; p.face = 'right'; }
    if (dx || dy) { p.x = Math.max(0.5, Math.min(COLS - 0.5, p.x + dx)); p.row = Math.max(0, Math.min(11, p.row + dy)); p.cd = 0.17; p.hopT = 0.12; s.ev.push('hop');
      if (p.row < s.best) { s.best = p.row; s.score += PTS.step; } }
  }
  s.timer -= dt; if (s.timer <= 0) return kill(s, 'time');
  if (p.row === 0) {
    const h = HOMES.findIndex((hx) => Math.abs(p.x - (hx + 0.5)) < 0.75);
    if (h < 0 || s.homes[h]) return kill(s, 'hedge');
    s.homes[h] = true; s.score += PTS.home + Math.floor(s.timer) * PTS.timeBonus; s.ev.push('home');
    if (s.homes.every(Boolean)) { s.score += PTS.allHomes; s.level++; s.homes = s.homes.map(() => false); build(s); s.ev.push('level'); }
    spawn(s); return;
  }
  const lane = laneAt(s, p.row);
  if (lane && isRiver(p.row)) { const o = objAt(lane, p.x, 0.1); if (!o) return kill(s, 'splash'); p.x += lane.v * dt; if (p.x < 0.2 || p.x > COLS - 0.2) return kill(s, 'splash'); }
  if (lane && isRoad(p.row) && objAt(lane, p.x, -0.3)) return kill(s, 'car');
}
export function bot(s) {
  const p = s.pup; if (s.dead > 0 || p.cd > 0) return {};
  const safe = (row, x) => { if (row === 0) return HOMES.some((hx, i) => !s.homes[i] && Math.abs(x - (hx + 0.5)) < 0.6); const l = laneAt(s, row); if (!l) return true;
    if (isRiver(row)) return !!objAt(l, x, -0.4) && !!objAt(l, x + l.v * 0.3, -0.4); return !objAt(l, x, 0.9) && !objAt(l, x - l.v * 0.35, 0.6); };
  if (p.row === 1) { const h = HOMES.map((hx, i) => ({ hx: hx + 0.5, i })).filter((o) => !s.homes[o.i]).sort((a, b) => Math.abs(a.hx - p.x) - Math.abs(b.hx - p.x))[0];
    if (h && Math.abs(h.hx - p.x) < 0.5) return { up: true }; if (h) { const nx = p.x + Math.sign(h.hx - p.x); return safe(1, nx) ? (h.hx > p.x ? { right: true } : { left: true }) : {}; } }
  if (safe(p.row - 1, p.x)) return { up: true };
  const here = laneAt(s, p.row); if (here && !(isRiver(p.row) ? objAt(here, p.x, -0.4) : !objAt(here, p.x, 0.8))) { if (safe(p.row + 1, p.x)) return { down: true }; }
  return {};
}
// ---------- render ----------
const VEH = { car: ['.rrrr.', 'rwwrrr', 'rrrrrr', '.k..k.'], truck: ['bbbbbbbbbbccc.', 'bbbbbbbbbbcwcc', 'bbbbbbbbbbcccc', '.kk......kk.k.'], bus: ['yyyyyyyyyyyyyy', 'ywywywywywywyy', 'yyyyyyyyyyyyyy', '.kk.......kk..'] };
const VCOL = ['#e0303a', '#3a6ed8', '#f2c14e', '#b05ad8', '#40c0a0'];
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#0b0820'; ctx.fillRect(0, 0, 384, 216);
  for (let r = 0; r < ROWS; r++) { const y = OY + r * T;
    ctx.fillStyle = r === 0 ? '#1f5a2a' : isRiver(r) ? '#1d4fa0' : r === 5 || r === 11 ? '#6a4fa0' : '#2a2a34'; ctx.fillRect(0, y, 384, T);
    if (isRiver(r)) { ctx.fillStyle = '#3a72c8'; for (let x = 0; x < 384; x += 24) ctx.fillRect((x + Math.floor(now * 10 * (r % 2 ? 1 : -1))) % 384 + (x < 0 ? 384 : 0), y + 4 + (x % 3) * 3, 6, 1); }
    if (isRoad(r) && r < 10) { ctx.fillStyle = '#d8d070'; for (let x = 4; x < 384; x += 24) ctx.fillRect(x, y + T - 1, 10, 1); }
    if (r === 5 || r === 11) { ctx.fillStyle = '#8a6ac4'; for (let x = 0; x < 384; x += 8) ctx.fillRect(x + (r % 2) * 4, y + (x % 16 ? 4 : 10), 2, 2); }
  }
  HOMES.forEach((hx, i) => { const x = hx * T, y = OY; ctx.fillStyle = '#0d2a12'; ctx.fillRect(x - 2, y, T + 4, T); ctx.fillStyle = '#c88a3c'; ctx.fillRect(x - 2, y + 2, T + 4, 3); ctx.fillRect(x - 2, y + 2, 3, T - 2); ctx.fillRect(x + T - 1, y + 2, 3, T - 2);
    if (s.homes[i]) P.blitC(ctx, P.shibaHead(), x + T / 2, y + T / 2 + 1); });
  for (const l of s.lanes) for (const o of l.objs) { const x = ((((o.x % l.span) + l.span) % l.span) - 2) * T, y = OY + l.row * T;
    if (l.type === 'log') { ctx.fillStyle = '#7a4a22'; ctx.fillRect(x, y + 2, o.len * T, T - 4); ctx.fillStyle = '#a06a32'; ctx.fillRect(x, y + 3, o.len * T, 2); ctx.fillStyle = '#c89a62'; ctx.fillRect(x, y + 2, 3, T - 4); }
    else if (l.type === 'raft') for (let k = 0; k < o.len; k++) P.blit(ctx, P.sprite('duck', ['..yy...', '.yeyo..', '.yyy...', 'yyyyyy.', 'yyyyyyy', '.yyyyy.'], { y: '#f2d84e', e: '#1a1424', o: '#f08030' }, { flip: l.v > 0 }), x + k * T + 3, y + 3);
    else { const ci = (l.row * 7 + Math.round(o.x)) % VCOL.length; P.blit(ctx, P.sprite(l.type + ci, VEH[l.type], { r: VCOL[ci], b: VCOL[ci], y: '#f2c14e', w: '#cfe8ff', c: '#dddddd', k: '#111' }, { flip: l.v > 0 }), x + 1, y + 4, l.type === 'car' ? 2 : 1); }
  }
  const p = s.pup;
  if (s.dead > 0) { ctx.fillStyle = s.lastDeath === 'splash' ? '#9fd0ff' : '#ff6a4a'; ctx.font = 'bold 8px monospace'; ctx.fillText(s.lastDeath === 'splash' ? 'SPLASH!' : s.lastDeath === 'time' ? 'TOO SLOW!' : 'BONK!', s.deadAt.x * T - 12, OY + s.deadAt.row * T + 10); }
  else { const spr = p.face === 'up' ? P.shibaBack() : p.face === 'down' ? P.shibaHead() : P.sprite('pupside' + (p.face === 'left'), ['.o.o.....', '.oooo...o', 'oeooo..oo', 'wwnoooooo', 'wwooooooo', '.wwwwooo.', '.o.o.o.o.'], P.SHIBA, { flip: p.face === 'right' });
    P.blitC(ctx, spr, p.x * T, OY + p.row * T + T / 2 - (p.hopT > 0 ? 3 : 0)); }
  const tw = Math.max(0, s.timer / TIME) * 80; ctx.fillStyle = '#222'; ctx.fillRect(300, 210, 80, 4); ctx.fillStyle = s.timer < 8 ? '#e0303a' : '#5fd37a'; ctx.fillRect(300, 210, tw, 4);
}
