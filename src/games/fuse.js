// TILE FUSE — slide a 4x4 of numbered tiles. Two equal numbers fuse into their sum.
// Classic: arrows / stick slide. Inu: Sniff briefly points at a slide that will fuse something.
import { blank, edge, pre, pop, fx, label } from './kit.js';
export const NAME = 'Tile Fuse';
export const META = {
  id: 'tile-fuse', title: 'TILE FUSE', short: 'FUSE', color: '#e0a36a', buttons: 1, freePlay: true,
  blurb: 'Slide the tiles. Two tiles with the same number fuse into one. No slides left ends the run.',
  controls: 'Arrows or the stick slide the board.',
  inuMove: 'SNIFF: now and then an arrow shows a slide that will fuse tiles.',
  classicNote: 'Original Inu rules at classic difficulty.',
};
export const W = 224, H = 256, N = 4;
const CELL = 36, GAP = 4, X0 = 30, Y0 = 48;
export const tileColor = (v) => v <= 2 ? '#eee4da' : v === 4 ? '#efe0c8' : ['#f2b179', '#e8892e', '#ff5d73', '#e05070', '#f2c14e', '#5fd37a', '#4fc3e8', '#b57bff', '#e0a36a'][((Math.log2(v) | 0) - 3) % 9];
const idx = (line, k, dir) => dir === 'left' ? line * 4 + k : dir === 'right' ? line * 4 + 3 - k : dir === 'up' ? k * 4 + line : (3 - k) * 4 + line;
export function canMove(s) {
  for (let i = 0; i < 16; i++) { if (!s.b[i]) return true; const x = i % 4, y = i >> 2; if (x < 3 && s.b[i] === s.b[i + 1]) return true; if (y < 3 && s.b[i] === s.b[i + 4]) return true; }
  return false;
}
function add(s) {
  const e = []; for (let i = 0; i < 16; i++) if (!s.b[i]) e.push(i); if (!e.length) return;
  const i = e[(s.rnd() * e.length) | 0]; s.b[i] = s.rnd() < 0.9 ? 2 : 4; s.pop[i] = 0.18;
}
export function create(seed = 1, opts = {}) {
  const s = blank(META.id, seed, opts, { lives: 1 });
  s.b = Array(16).fill(0); s.pop = Array(16).fill(0); s.big = false; s.hint = ''; s.hintT = 0; s.stats = { fuses: 0 };
  add(s); add(s); return s;
}
export function slide(s, dir) {
  if (s.over) return false;
  if (!canMove(s)) { s.why = 'no slides left'; s.lives = 0; s.over = true; s.ev.push('die'); return false; }
  let moved = false, gained = 0, top = 0;
  for (let line = 0; line < 4; line++) {
    const vals = []; for (let k = 0; k < 4; k++) { const v = s.b[idx(line, k, dir)]; if (v) vals.push(v); }
    const out = [], merged = [];
    for (let k = 0; k < vals.length; k++) { if (vals[k] === vals[k + 1]) { out.push(vals[k] * 2); merged.push(out.length - 1); gained += vals[k] * 2; top = Math.max(top, vals[k] * 2); k++; s.stats.fuses++; } else out.push(vals[k]); }
    for (let k = 0; k < 4; k++) { const i = idx(line, k, dir), v = out[k] || 0; if (s.b[i] !== v) moved = true; s.b[i] = v; if (merged.includes(k)) { s.pop[i] = 0.16; fx(s, X0 + (i % 4) * (CELL + GAP) + CELL / 2, Y0 + (i >> 2) * (CELL + GAP) + CELL / 2, tileColor(v), 5); } }
  }
  if (!moved) return false;
  s.score += gained; s.ev.push(gained ? 'pow' : 'blip');
  if (top >= 2 ** 11 && !s.big) { s.big = true; s.level = 2; pop(s, W / 2, 30, 'BIG FUSE', '#f2c14e'); s.ev.push('level'); }
  add(s);
  if (!canMove(s)) { s.why = 'no slides left'; s.lives = 0; s.over = true; s.ev.push('die'); }
  return true;
}
const DIRS = ['left', 'right', 'up', 'down'];
function wouldFuse(b, dir) {
  for (let line = 0; line < 4; line++) {
    const vals = []; for (let k = 0; k < 4; k++) { const v = b[idx(line, k, dir)]; if (v) vals.push(v); }
    for (let k = 0; k < vals.length - 1; k++) if (vals[k] === vals[k + 1]) return true;
  }
  return false;
}
function sniff(s) { return DIRS.find((d) => wouldFuse(s.b, d)) || ''; }
export function step(s, dt, inp = {}) {
  if (!pre(s, dt)) return; const e = edge(s, inp);
  for (const d of DIRS) if (e[d]) slide(s, d);
  for (let i = 0; i < 16; i++) s.pop[i] = Math.max(0, s.pop[i] - dt);
  if (s.inu) { s.hintT -= dt; if (s.hintT <= 0) { s.hint = sniff(s); s.hintT = 4; } }
}
export function bot(s) { if (s.frame % 18 !== 0 || s.over) return {}; return { [DIRS[((s.frame / 18) | 0) % 4]]: true }; }
export const ghostPos = (s) => ({ x: X0 + CELL, y: Y0 + CELL });
export function draw(ctx, s) {
  ctx.fillStyle = '#1d1a17'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#3b342c'; ctx.fillRect(X0 - 6, Y0 - 6, 4 * (CELL + GAP) + GAP + 8, 4 * (CELL + GAP) + GAP + 8);
  for (let i = 0; i < 16; i++) {
    const x = X0 + (i % 4) * (CELL + GAP), y = Y0 + (i >> 2) * (CELL + GAP), v = s.b[i];
    ctx.fillStyle = '#4d443a'; ctx.fillRect(x, y, CELL, CELL); if (!v) continue;
    ctx.fillStyle = tileColor(v); ctx.fillRect(x, y, CELL, CELL);
    label(ctx, String(v), x + CELL / 2, y + 14, v <= 4 ? '#5a5048' : '#fff', v < 100 ? 8 : 6, 'center');
  }
  if (s.inu && s.hint) label(ctx, 'SNIFF ' + s.hint.toUpperCase(), W / 2, 28, '#f2c14e', 6, 'center');
}
export function marquee(ctx, sx, sy, t) {
  const cs = ['#eee4da', '#f2b179', '#e8892e', '#5fd37a'];
  for (let i = 0; i < 4; i++) { ctx.fillStyle = cs[(i + (t | 0)) % 4]; ctx.fillRect(sx + 2 + (i % 2) * 10, sy + 2 + ((i / 2) | 0) * 10, 8, 8); }
}
