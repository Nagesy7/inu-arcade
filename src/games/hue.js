// HUE FLOOD — spread one colour from the top-left of a quilt until the whole board matches, inside a move limit.
// Classic: Left/Right pick a swatch, A floods. Inu: Sniff marks the swatch that grows your patch the most.
import { blank, edge, pre, pop, label } from './kit.js';
export const NAME = 'Hue Flood';
export const COLS = ['#ff5d73', '#f2c14e', '#5fd37a', '#4fc3e8', '#b57bff', '#e8892e'];
export const META = {
  id: 'hue-flood', title: 'HUE FLOOD', short: 'HUE', color: '#4fc3e8', buttons: 1, freePlay: true,
  blurb: 'Your patch starts in the corner. Spread one colour until the whole quilt matches, before moves run out.',
  controls: 'Left/Right pick a colour. A floods.',
  inuMove: 'SNIFF: the swatch that grows your patch the most is marked.',
  classicNote: 'Original Inu rules at classic difficulty.',
};
export const W = 224, H = 256;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export function flood(grid, n, c) {
  const old = grid[0]; if (old === c) return [];
  const st = [0], seen = new Uint8Array(n * n), out = []; seen[0] = 1;
  while (st.length) {
    const i = st.pop(); grid[i] = c; out.push(i); const x = i % n, y = (i / n) | 0;
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue; const j = ny * n + nx; if (!seen[j] && grid[j] === old) { seen[j] = 1; st.push(j); } }
  }
  return out;
}
export function regionSize(grid, n) {
  const c = grid[0], st = [0], seen = new Uint8Array(n * n); seen[0] = 1; let k = 0;
  while (st.length) { const i = st.pop(); k++; const x = i % n, y = (i / n) | 0; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue; const j = ny * n + nx; if (!seen[j] && grid[j] === c) { seen[j] = 1; st.push(j); } } }
  return k;
}
export function bestColor(grid, n, k) {
  let best = -1, bc = (grid[0] + 1) % k;
  for (let c = 0; c < k; c++) { if (c === grid[0]) continue; const t = grid.slice(); flood(t, n, c); const sz = regionSize(t, n); if (sz > best) { best = sz; bc = c; } }
  return bc;
}
function greedy(grid, n, k) {
  const gr = grid.slice(); let moves = 0;
  while (regionSize(gr, n) < n * n && moves < 40) { flood(gr, n, bestColor(gr, n, k)); moves++; }
  return moves;
}
export function create(seed = 1, opts = {}) {
  const s = blank(META.id, seed, opts, { lives: 1, level: 0 });
  s.stats = { clears: 0 }; s.cur = 0; s.lit = new Map(); next(s); return s;
}
function next(s) {
  s.level++; s.n = Math.min(9, 5 + Math.floor((s.level - 1) / 2)); s.k = Math.min(6, 3 + Math.floor(s.level / 3));
  s.grid = Array.from({ length: s.n * s.n }, () => (s.rnd() * s.k) | 0);
  if (regionSize(s.grid, s.n) === s.n * s.n) s.grid[s.n] = (s.grid[0] + 1) % s.k;
  s.limit = greedy(s.grid, s.n, s.k) + Math.max(1, 3 - Math.floor(s.level / 3));
  s.moves = 0; s.hint = s.inu ? bestColor(s.grid, s.n, s.k) : -1; s.cur = 0;
}
export function layout(s) { const cell = Math.floor(156 / s.n), size = cell * s.n; return { cell, size, left: Math.floor((W - size) / 2), top: 40, py: 214 }; }
export function choose(s, c) {
  if (s.over || c < 0 || c >= s.k || c === s.grid[0]) return;
  flood(s.grid, s.n, c); s.moves++; s.ev.push('blip'); s.hint = s.inu ? bestColor(s.grid, s.n, s.k) : -1;
  if (regionSize(s.grid, s.n) === s.n * s.n) {
    const bonus = Math.max(0, s.limit - s.moves) * 20; s.score += 80 * s.level + bonus; s.stats.clears++; s.ev.push('pow'); pop(s, W / 2, 28, 'QUILT +' + (80 * s.level + bonus), '#f2c14e'); next(s);
  } else if (s.moves >= s.limit) { s.why = 'out of moves'; s.lives = 0; s.over = true; s.ev.push('die'); }
}
export function step(s, dt, inp = {}) {
  if (!pre(s, dt)) return; const e = edge(s, inp);
  if (e.left || e.down) s.cur = (s.cur + s.k - 1) % s.k;
  if (e.right || e.up) s.cur = (s.cur + 1) % s.k;
  if (e.a) choose(s, s.cur);
}
export function bot(s) {
  if (s.frame % 12 !== 0) return {};
  const want = bestColor(s.grid, s.n, s.k);
  if (s.cur === want) return { a: true };
  return s.cur < want ? { right: true } : { left: true };
}
export const ghostPos = (s) => { const L = layout(s); return { x: L.left + L.cell / 2, y: L.top + L.cell / 2 }; };
export function draw(ctx, s) {
  ctx.fillStyle = '#161a2c'; ctx.fillRect(0, 0, W, H);
  const L = layout(s);
  ctx.fillStyle = '#0c0f1c'; ctx.fillRect(L.left - 4, L.top - 4, L.size + 8, L.size + 8);
  for (let i = 0; i < s.grid.length; i++) { const x = i % s.n, y = (i / s.n) | 0; ctx.fillStyle = COLS[s.grid[i]]; ctx.fillRect(L.left + x * L.cell, L.top + y * L.cell, L.cell, L.cell); }
  ctx.strokeStyle = '#fbf1e0'; ctx.lineWidth = 2; ctx.strokeRect(L.left + 1, L.top + 1, L.cell - 2, L.cell - 2);
  const w = 180 / s.k;
  for (let c = 0; c < s.k; c++) {
    const cx = 22 + c * w + w / 2; ctx.fillStyle = COLS[c]; ctx.fillRect(cx - 10, L.py - 10, 20, 20);
    if (c === s.cur) { ctx.strokeStyle = '#fbf1e0'; ctx.strokeRect(cx - 13, L.py - 13, 26, 26); }
    if (c === s.hint) { ctx.fillStyle = '#f7f1e4'; ctx.fillRect(cx - 2, L.py - 18, 4, 4); }
    label(ctx, String(c + 1), cx - 2, L.py - 4, '#1a1424', 6);
  }
  label(ctx, 'QUILT ' + s.level, 8, 24, '#c8bce8', 6);
  label(ctx, s.moves + '/' + s.limit, W - 8, 24, s.limit - s.moves <= 2 ? '#ff5d73' : '#c8bce8', 6, 'right');
}
export function marquee(ctx, sx, sy, t) {
  const cs = ['#ff5d73', '#f2c14e', '#5fd37a', '#4fc3e8'];
  for (let i = 0; i < 12; i++) { ctx.fillStyle = cs[(i + (t * 2 | 0)) % 4]; ctx.fillRect(sx + (i % 4) * 5, sy + ((i / 4) | 0) * 5, 5, 5); }
}
