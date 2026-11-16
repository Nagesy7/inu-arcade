// STACK SHIFT — drop sliding slabs onto a tower of bunks. Overhang is sliced off. A perfect keeps the width.
// Classic: A / Down drops. Inu: every third perfect, Bone Glue gives a little width back.
import { blank, edge, pre, hurt, pop, fx } from './kit.js';
export const NAME = 'Stack Shift';
export const META = {
  id: 'stack-shift', title: 'STACK SHIFT', short: 'STACK', color: '#8be9fd', buttons: 1, freePlay: true,
  blurb: 'Drop each bunk on the tower. Whatever hangs over is sliced off. Line it up to keep it wide.',
  controls: 'A or Down to drop the bunk.',
  inuMove: 'BONE GLUE: every third perfect fit adds a little width back.',
  classicNote: 'Original Inu rules at classic difficulty.',
};
export const W = 224, H = 256, BH = 14, PERFECT = 4;
const COLS = ['#e8d4b0', '#f2c14e', '#e8892e', '#d07050', '#7ec8a3', '#4fc3e8', '#b57bff', '#f6d7b8', '#c4523a', '#8a6230'];
export const slabColor = (i) => COLS[i % COLS.length];
export function create(seed = 1, opts = {}) {
  const s = blank(META.id, seed, opts, { lives: 1 });
  s.base = 228; s.stack = [{ x: 62, w: 100 }]; s.debris = []; s.cam = 0; s.combo = 0; s.stats = { perfects: 0, glue: 0 };
  fresh(s); return s;
}
function fresh(s) {
  const top = s.stack[s.stack.length - 1], dir = s.stack.length % 2 ? 1 : -1;
  s.cur = { x: dir > 0 ? -top.w * 0.25 : W - top.w * 0.75, w: top.w, dir, sp: Math.min(240, 96 + s.stack.length * 7) };
}
export function drop(s) {
  const c = s.cur, p = s.stack[s.stack.length - 1], y = s.base - s.stack.length * BH;
  if (Math.abs(c.x - p.x) < PERFECT) {
    c.x = p.x; s.combo++; s.stats.perfects++; s.ev.push('blip'); fx(s, c.x + c.w / 2, y, '#fff', 8);
    if (s.inu && s.combo % 3 === 0 && c.w < 100) { const add = Math.min(8, 100 - c.w); c.w += add; c.x -= add / 2; s.stats.glue++; pop(s, W / 2, 36, 'BONE GLUE', '#f2c14e'); s.ev.push('pow'); }
    else if (s.combo > 1) pop(s, W / 2, 36, 'PERFECT x' + s.combo, '#8be9fd');
  } else {
    s.combo = 0;
    const l = Math.max(c.x, p.x), r = Math.min(c.x + c.w, p.x + p.w);
    if (r - l < 8) { s.debris.push({ x: c.x, y, w: c.w, vy: 0, i: s.stack.length }); s.why = 'missed the tower'; if (!hurt(s)) fresh(s); return; }
    s.debris.push({ x: c.x < p.x ? c.x : r, y, w: c.w - (r - l), vy: 0, i: s.stack.length });
    c.x = l; c.w = r - l; s.ev.push('brick');
  }
  s.stack.push({ x: c.x, w: c.w }); s.score += 1 + Math.max(0, s.combo - 1); s.level = s.stack.length; fresh(s);
}
export function step(s, dt, inp = {}) {
  if (!pre(s, dt)) return; const e = edge(s, inp), c = s.cur;
  c.x += c.dir * c.sp * dt;
  if (c.dir > 0 && c.x > W - c.w * 0.65) c.dir = -1;
  if (c.dir < 0 && c.x < -c.w * 0.35) c.dir = 1;
  if (e.a || e.down) drop(s);
  const target = Math.max(0, (s.stack.length - 8) * BH); s.cam += (target - s.cam) * Math.min(1, dt * 5);
  for (const d of s.debris) { d.vy += 700 * dt; d.y += d.vy * dt; }
  s.debris = s.debris.filter((d) => d.y < H + 40);
}
export function bot(s) {
  const c = s.cur, p = s.stack[s.stack.length - 1];
  if (Math.abs(c.x - p.x) < PERFECT && s.frame % 2 === 0) return { a: true };
  return {};
}
export const ghostPos = (s) => ({ x: s.cur.x + s.cur.w / 2, y: 80 });
export function draw(ctx, s) {
  ctx.fillStyle = '#1b2140'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#12152b'; ctx.fillRect(0, 200, W, 56);
  ctx.save(); ctx.translate(0, Math.round(s.cam));
  s.stack.forEach((b, i) => { const y = s.base - i * BH; ctx.fillStyle = slabColor(i); ctx.fillRect(b.x, y, b.w, BH - 2); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(b.x, y, b.w, 2); if (i % 4 === 0) { ctx.fillStyle = '#f7f1e4'; ctx.fillRect(b.x + b.w / 2 - 6, y + 4, 12, 3); ctx.fillRect(b.x + b.w / 2 - 8, y + 3, 3, 5); ctx.fillRect(b.x + b.w / 2 + 5, y + 3, 3, 5); } });
  for (const d of s.debris) { ctx.fillStyle = slabColor(d.i); ctx.fillRect(d.x, d.y, d.w, BH - 2); }
  if (!s.over) { const y = s.base - s.stack.length * BH; ctx.fillStyle = slabColor(s.stack.length); ctx.fillRect(s.cur.x, y, s.cur.w, BH - 2); }
  ctx.restore();
}
export function marquee(ctx, sx, sy, t) {
  ctx.fillStyle = '#1b2140'; ctx.fillRect(sx, sy, 30, 22);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = slabColor(i); ctx.fillRect(sx + 4 + (i % 2) * 2, sy + 16 - i * 4, 16 - i, 3); }
  ctx.fillStyle = slabColor(4); ctx.fillRect(sx + 2 + Math.round(Math.sin(t * 3) * 4), sy + 2, 12, 3);
}
