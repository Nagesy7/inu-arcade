// KIBBLE CHOMP — original maze-chase remix. A Shiba eats kibble, dodges cat ghosts, power bones turn the tables.
import { rng } from '../core/rng.js';
export const META = { id: 'kibble-chomp', title: 'KIBBLE CHOMP', color: '#f2c14e', blurb: 'Eat every kibble. Dodge the bear-market cats. Grab a power bone and chase them back!', controls: 'Arrows / WASD / D-pad to steer', inuMove: 'BARK STUN (A): freezes nearby cats for 2s, 8s cooldown. $KIBBLE coins spawn twice a maze.', classicNote: 'Pure maze-chase rules.' };
export const BARK = { cd: 8, radius: 3.5, stun: 2 }, COIN = { at: [70, 140], pts: 500, life: 9 };
const fx = (s, x, y, c, n = 8) => s.fx.push({ x: OX + x * T + T / 2, y: OY + y * T + T / 2, c, n }), pop = (s, x, y, text, c = '#7ef0ff') => s.pops.push({ x: OX + x * T + T / 2, y: OY + y * T, text, c, t: 1 });
export const MAZE = [
  '#####################',
  '#o........#........o#',
  '#.##.####.#.####.##.#',
  '#...................#',
  '#.##.#.#######.#.##.#',
  '#....#....#....#....#',
  '####.### GGG ###.####',
  '#....#....P....#....#',
  '#.##.#.#######.#.##.#',
  '#...................#',
  '#.##.####.#.####.##.#',
  '#o........#........o#',
  '#####################',
];
export const COLS = 21, ROWS = 13;
export const PTS = { kibble: 10, power: 50, ghost: [200, 400, 800, 1600], clear: 500 };
const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }, OPP = { left: 'right', right: 'left', up: 'down', down: 'up' };
export const CAT_COLORS = ['#d6302f', '#f08ac0', '#4fc3e8', '#f0a030'];
export const isWall = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS || MAZE[y][x] === '#';
const find = (ch) => { const out = []; MAZE.forEach((r, y) => [...r].forEach((c, x) => c === ch && out.push({ x, y }))); return out; };
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, fx: [], pops: [], shake: 0, barkCd: 0, eaten: 0, coin: null, stats: { cats: 0, barks: 0, coins: 0 }, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, over: false, t: 0, ev: [], ready: 1.5, fright: 0, combo: 0, mode: 'scatter', modeT: 0, flash: 0 };
  loadLevel(s); return s;
}
function loadLevel(s) {
  s.pellets = new Set(); s.powers = new Set();
  MAZE.forEach((r, y) => [...r].forEach((c, x) => { if (c === '.') s.pellets.add(x + ',' + y); if (c === 'o') s.powers.add(x + ',' + y); }));
  resetActors(s);
}
function resetActors(s) {
  const p = find('P')[0]; s.player = { x: p.x, y: p.y, dir: null, want: null, mouth: 0 };
  const g = find('G'); s.cats = CAT_COLORS.map((c, i) => ({ i, color: c, x: g[i % g.length].x, y: g[i % g.length].y, home: { ...g[i % g.length] }, dir: 'up', wait: i * 2.2, state: 'normal' }));
  s.fright = 0; s.ready = 1.5; s.mode = 'scatter'; s.modeT = 0;
}
const atCenter = (e) => Math.abs(e.x - Math.round(e.x)) < 1e-6 && Math.abs(e.y - Math.round(e.y)) < 1e-6;
const open = (x, y, d) => !isWall(x + DIRS[d][0], y + DIRS[d][1]);
// Move entity `dist` tiles along the grid, calling choose() at every tile centre.
export function advance(e, dist, choose, canReverse = false) {
  for (let guard = 0; dist > 1e-9 && guard < 12; guard++) {
    if (atCenter(e)) { e.x = Math.round(e.x); e.y = Math.round(e.y); e.dir = choose(e, e.x, e.y); if (!e.dir) return; }
    else if (canReverse && e.want === OPP[e.dir]) e.dir = e.want;
    const [dx, dy] = DIRS[e.dir];
    const toC = atCenter(e) ? 1 : dx ? (dx > 0 ? Math.ceil(e.x) - e.x : e.x - Math.floor(e.x)) : (dy > 0 ? Math.ceil(e.y) - e.y : e.y - Math.floor(e.y));
    const m = Math.min(dist, toC); e.x += dx * m; e.y += dy * m; dist -= m;
    if (Math.abs(e.x - Math.round(e.x)) < 1e-6) e.x = Math.round(e.x); if (Math.abs(e.y - Math.round(e.y)) < 1e-6) e.y = Math.round(e.y);
  }
}
export const speeds = (level) => ({ player: 5.5, cat: Math.min(5.6, 4.2 + 0.25 * (level - 1)), scared: 2.6, eyes: 10 });
const frightTime = (level) => Math.max(2, 7 - (level - 1) * 0.8);
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.t += dt; s.flash = Math.max(0, s.flash - dt);
  const P = s.player; for (const d of ['left', 'right', 'up', 'down']) if (inp[d]) P.want = d;
  if (s.ready > 0) { s.ready -= dt; return; }
  if (s.fright <= 0) { s.modeT += dt; const cyc = s.modeT % 27; s.mode = cyc < 7 ? 'scatter' : 'chase'; }
  const sp = speeds(s.level);
  advance(P, sp.player * dt, (e, x, y) => (e.want && open(x, y, e.want)) ? e.want : (e.dir && open(x, y, e.dir)) ? e.dir : null, true);
  if (P.dir) P.mouth += dt;
  const k = Math.round(P.x) + ',' + Math.round(P.y);
  if (s.pellets.delete(k)) { s.score += PTS.kibble; s.ev.push('chomp'); s.eaten++; if (s.inu && COIN.at.includes(s.eaten)) { const st = find('P')[0]; s.coin = { x: st.x, y: st.y, t: COIN.life }; } }
  if (s.coin) { s.coin.t -= dt; if (s.coin.t <= 0) s.coin = null; else if (Math.hypot(s.coin.x - P.x, s.coin.y - P.y) < 0.6) { s.score += COIN.pts; s.stats.coins++; pop(s, s.coin.x, s.coin.y, '+500 $KIBBLE', '#f2c14e'); fx(s, s.coin.x, s.coin.y, '#f2c14e', 16); s.coin = null; s.ev.push('coin'); } }
  if (s.inu) { s.barkCd = Math.max(0, s.barkCd - dt); if (inp.a && s.barkCd <= 0) { s.barkCd = BARK.cd; s.stats.barks++; s.ev.push('bark'); s.shake = 0.15; s.ring = { x: P.x, y: P.y, t: 0.4 }; for (const c of s.cats) if (c.state === 'normal' && Math.hypot(c.x - P.x, c.y - P.y) <= BARK.radius) { c.stun = BARK.stun; fx(s, c.x, c.y, '#7ef0ff', 6); } } }
  if (s.ring) { s.ring.t -= dt; if (s.ring.t <= 0) s.ring = null; }
  if (s.powers.delete(k)) { s.score += PTS.power; s.fright = frightTime(s.level); s.combo = 0; s.ev.push('power'); for (const c of s.cats) if (c.state === 'normal') { c.state = 'scared'; if (c.dir) c.dir = OPP[c.dir]; } }
  if (s.fright > 0) { s.fright -= dt; if (s.fright <= 0) for (const c of s.cats) if (c.state === 'scared') c.state = 'normal'; }
  for (const c of s.cats) {
    if (c.wait > 0) { c.wait -= dt; continue; }
    if (c.stun > 0) { c.stun -= dt; continue; }
    const v = c.state === 'eyes' ? sp.eyes : c.state === 'scared' ? sp.scared : sp.cat;
    advance(c, v * dt, (e, x, y) => chooseCat(s, e, x, y));
    if (c.state === 'eyes' && Math.round(c.x) === c.home.x && Math.round(c.y) === c.home.y) { c.state = 'normal'; c.wait = 1; }
  }
  for (const c of s.cats) {
    if (c.wait > 0 || c.state === 'eyes' || c.stun > 0) continue;
    if (Math.hypot(c.x - P.x, c.y - P.y) < 0.6) {
      if (c.state === 'scared') { const pts = PTS.ghost[Math.min(3, s.combo++)]; s.score += pts; c.state = 'eyes'; s.ev.push('eatGhost'); s.stats.cats++; pop(s, c.x, c.y, '+' + pts + (s.combo > 1 ? ' x' + s.combo : '')); fx(s, c.x, c.y, c.color, 14); s.shake = 0.12; }
      else { s.lives--; s.ev.push('die'); s.flash = 1; s.shake = 0.4; fx(s, P.x, P.y, '#e0802c', 24); if (s.lives <= 0) { s.over = true; return; } resetActors(s); return; }
    }
  }
  if (s.pellets.size === 0 && s.powers.size === 0) { s.score += PTS.clear; s.level++; s.ev.push('level'); loadLevel(s); s.eaten = 0; s.pops.push({ x: 192, y: 100, text: 'MAZE CLEAR +500', c: '#f2c14e', t: 1.5 }); }
}
function target(s, c) {
  const P = s.player, pd = DIRS[P.dir || 'left'];
  if (c.state === 'eyes') return c.home;
  if (s.mode === 'scatter') return [{ x: COLS, y: -2 }, { x: 0, y: -2 }, { x: COLS, y: ROWS + 1 }, { x: 0, y: ROWS + 1 }][c.i];
  if (c.i === 0) return P;
  if (c.i === 1) return { x: P.x + pd[0] * 4, y: P.y + pd[1] * 4 };
  if (c.i === 2) { const r = s.cats[0]; return { x: 2 * P.x - r.x, y: 2 * P.y - r.y }; }
  return Math.hypot(c.x - P.x, c.y - P.y) > 6 ? P : { x: 0, y: ROWS };
}
function chooseCat(s, c, x, y) {
  let opts = Object.keys(DIRS).filter((d) => open(x, y, d) && d !== OPP[c.dir]);
  if (!opts.length) opts = Object.keys(DIRS).filter((d) => open(x, y, d));
  if (c.state === 'scared') return opts[Math.floor(s.rnd() * opts.length)];
  const t = target(s, c); let best = opts[0], bd = Infinity;
  for (const d of ['up', 'left', 'down', 'right']) if (opts.includes(d)) { const dd = (x + DIRS[d][0] - t.x) ** 2 + (y + DIRS[d][1] - t.y) ** 2; if (dd < bd) { bd = dd; best = d; } }
  return best;
}
// Attract-mode / test bot: BFS to the nearest kibble, avoiding tiles near hostile cats.
export function bot(s) {
  const P = s.player, sx = Math.round(P.x), sy = Math.round(P.y);
  const danger = (x, y) => s.cats.some((c) => c.state === 'normal' && c.wait <= 0 && Math.abs(c.x - x) + Math.abs(c.y - y) < 2.5);
  const q = [[sx, sy, null]], seen = new Set([sx + ',' + sy]);
  while (q.length) { const [x, y, first] = q.shift(); const k = x + ',' + y;
    if (first && (s.pellets.has(k) || s.powers.has(k))) return { [first]: true };
    for (const d of Object.keys(DIRS)) { const nx = x + DIRS[d][0], ny = y + DIRS[d][1], nk = nx + ',' + ny; if (isWall(nx, ny) || seen.has(nk) || danger(nx, ny)) continue; seen.add(nk); q.push([nx, ny, first || d]); } }
  return { [P.dir || 'left']: true };
}
export const ghostPos = (s) => ({ x: OX + s.player.x * T + T / 2, y: OY + s.player.y * T + T / 2 });
// ---------- render ----------
export const T = 15, OX = 34, OY = 18;
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#0b0820'; ctx.fillRect(0, 0, 384, 216);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (MAZE[y][x] === '#') {
    ctx.fillStyle = '#3b2a6e'; ctx.fillRect(OX + x * T, OY + y * T, T, T); ctx.fillStyle = '#6a52c4';
    if (!isWall(x, y - 1)) ctx.fillRect(OX + x * T, OY + y * T, T, 2); if (!isWall(x - 1, y)) ctx.fillRect(OX + x * T, OY + y * T, 2, T);
    ctx.fillStyle = '#251a48'; if (!isWall(x, y + 1)) ctx.fillRect(OX + x * T, OY + y * T + T - 2, T, 2); if (!isWall(x + 1, y)) ctx.fillRect(OX + x * T + T - 2, OY + y * T, 2, T);
  }
  const kib = P.kibble(), bn = P.bone();
  for (const k of s.pellets) { const [x, y] = k.split(',').map(Number); P.blitC(ctx, kib, OX + x * T + T / 2, OY + y * T + T / 2); }
  if (Math.floor(now * 4) % 2 === 0 || s.ready > 0) for (const k of s.powers) { const [x, y] = k.split(',').map(Number); P.blitC(ctx, bn, OX + x * T + T / 2, OY + y * T + T / 2); }
  for (const c of s.cats) {
    const cx = OX + c.x * T + T / 2, cy = OY + c.y * T + T / 2 + (Math.floor(now * 6 + c.i) % 2);
    if (c.stun > 0) { ctx.globalAlpha = 0.55; ctx.fillStyle = '#7ef0ff'; ctx.fillRect(cx - 6, cy - 9, 12, 2); }
    const spr = c.state === 'eyes' ? P.catEyes() : c.state === 'scared' ? P.catScared(s.fright < 1.5 && Math.floor(now * 8) % 2) : P.cat(c.color);
    P.blitC(ctx, spr, cx, cy); ctx.globalAlpha = 1;
  }
  if (s.coin && (s.coin.t > 2 || Math.floor(now * 8) % 2)) { const cx = OX + s.coin.x * T + T / 2, cy = OY + s.coin.y * T + T / 2 + Math.sin(now * 5) * 1.5; ctx.fillStyle = '#b08a2a'; ctx.fillRect(cx - 5, cy - 5, 10, 10); ctx.fillStyle = '#f2c14e'; ctx.fillRect(cx - 4, cy - 4, 8, 8); ctx.fillStyle = '#5a3a10'; ctx.fillRect(cx - 1, cy - 3, 2, 6); ctx.fillRect(cx - 3, cy - 1, 6, 2); }
  if (s.ring) { ctx.strokeStyle = `rgba(126,240,255,${s.ring.t * 2})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(OX + s.ring.x * T + T / 2, OY + s.ring.y * T + T / 2, (0.4 - s.ring.t) / 0.4 * BARK.radius * T, 0, 7); ctx.stroke(); }
  if (s.inu) { ctx.fillStyle = '#222'; ctx.fillRect(4, 206, 26, 4); ctx.fillStyle = s.barkCd <= 0 ? '#7ef0ff' : '#3a6a80'; ctx.fillRect(4, 206, 26 * (1 - s.barkCd / BARK.cd), 4); ctx.font = '7px Silkscreen, monospace'; ctx.fillStyle = '#7ef0ff'; ctx.fillText('BARK', 4, 203); }
  const pl = s.player, open_ = Math.floor(pl.mouth * 10) % 2 === 1;
  P.blitC(ctx, open_ ? P.shibaHeadOpen() : P.shibaHead(), OX + pl.x * T + T / 2, OY + pl.y * T + T / 2);
  if (s.ready > 0 && !s.over) { ctx.fillStyle = '#f2c14e'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText('READY, PUP!', OX + 10.5 * T, OY + 9.8 * T); ctx.textAlign = 'left'; }
}
