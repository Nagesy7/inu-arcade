// GUST GLIDER — a Shiba pup rides the wind between original yard towers.
// Towers are bone cairns, peaked kennels and timber with autumn crowns.
// Their silhouette is stacked, peaked or bulbous: never a capped pillar.
// Classic: flap on A / Up. Inu: a short tail-glide after each flap, plus bones in the gaps.
import { blank, edge, pre, hurt, fx, pop, shiba, bone } from './kit.js';
export const NAME = 'Gust Glider';
export const META = {
  id: 'gust-glider', title: 'GUST GLIDER', short: 'GUST', color: '#7ec8e8', buttons: 1, freePlay: true,
  blurb: 'Flap a Shiba pup through bone cairns, peaked kennels and timber. Clear a gap, score a point.',
  controls: 'A or Up to flap. The stick is optional.',
  inuMove: 'TAIL GLIDE: each flap hangs in the air a moment. Bones drift in the gaps for +3.',
  classicNote: 'Original Inu rules at classic difficulty. One knock costs a life.',
};
export const W = 224, H = 256, PX = 62, R = 6, GROUND = 228, TW = 28;
export const TOWER_KINDS = ['bone', 'kennel', 'timber'];
// Fill colours used by the towers. No capped green pillars.
export const TOWER_INK = ['#f7f1e4', '#e4d5bc', '#c4523a', '#d8b98a', '#3a2a22', '#8a5a32', '#e07a2a', '#6a3a18', '#a67c52'];
const GRAV = 720, FLAP = -268;
export function create(seed = 1, opts = {}) {
  const s = blank(META.id, seed, opts, { lives: 1 });
  s.b = { x: PX, y: 96, vy: 0 }; s.towers = []; s.spawn = 0.35; s.speed = 74; s.gap = 92; s.glide = 0; s.scrolled = 0;
  s.stats = { gaps: 0, bones: 0, knocks: 0 }; return s;
}
function flap(s) { s.b.vy = s.inu ? -292 : FLAP; s.glide = s.inu ? 0.2 : 0; s.ev.push('hop'); fx(s, s.b.x - 8, s.b.y, '#fbf1e0', 4); }
export function step(s, dt, inp = {}) {
  if (!pre(s, dt)) return; const e = edge(s, inp), b = s.b;
  if (e.a || e.up) flap(s);
  b.vy += (s.glide > 0 ? 260 : GRAV) * dt; s.glide = Math.max(0, s.glide - dt); b.y += b.vy * dt;
  s.speed += 1.05 * dt; s.gap = Math.max(68, s.gap - 0.28 * dt); s.scrolled += s.speed * dt;
  if ((s.spawn -= dt) <= 0) {
    s.spawn = 108 / s.speed;
    const kind = TOWER_KINDS[s.towers.length % TOWER_KINDS.length];
    const gy = 28 + s.rnd() * Math.max(8, GROUND - 36 - s.gap - 28);
    s.towers.push({ x: W + 6, gy, gap: s.gap, done: false, got: false, kind, treat: s.inu && s.rnd() < 0.7 });
  }
  for (const p of s.towers) {
    p.x -= s.speed * dt;
    if (!p.done && p.x + hitW(p) < b.x - R) { p.done = true; s.score += 1; s.stats.gaps++; s.ev.push('blip'); }
    if (p.treat && !p.got && Math.hypot(b.x - (p.x + TW / 2), b.y - (p.gy + p.gap * 0.5)) < 11) { p.got = true; s.score += 3; s.stats.bones++; s.ev.push('pow'); pop(s, b.x, b.y - 12, '+3'); }
    if (overlaps(b, p)) { s.stats.knocks++; s.why = 'clipped a ' + p.kind; if (hurt(s)) return; b.vy = -140; }
  }
  s.towers = s.towers.filter((p) => p.x > -TW - 20);
  if (b.y > GROUND - R) { b.y = GROUND - R; b.vy = -90; s.why = 'hit the yard'; if (hurt(s)) return; }
  if (b.y < 18) { b.y = 18; b.vy = 30; }
}
function hitW(p) { return p.kind === 'timber' ? 16 : TW; }
function overlaps(b, p) {
  const x0 = p.kind === 'timber' ? p.x + 6 : p.x + 1, x1 = x0 + hitW(p);
  if (b.x + R < x0 || b.x - R > x1) return false;
  const crown = p.kind === 'timber' ? 18 : p.kind === 'kennel' ? 14 : 0;
  return b.y - R < p.gy + (p.kind === 'timber' ? crown * 0.3 : 0) || b.y + R > p.gy + p.gap - (p.kind === 'timber' ? crown * 0.3 : 0);
}
export function bot(s) {
  if (s.frame % 9 !== 0) return {};
  const b = s.b, next = s.towers.find((p) => p.x + TW > b.x - 4);
  const target = next ? next.gy + next.gap * 0.5 : 108;
  return (b.y > target + 4 || b.vy > 70) ? { a: true } : {};
}
export const ghostPos = (s) => ({ x: s.b.x, y: s.b.y });
export function draw(ctx, s) {
  ctx.fillStyle = '#8ec8e8'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#d8eef8'; for (let i = 0; i < 4; i++) { const x = ((i * 70 - s.scrolled * 0.15) % (W + 40) + W + 40) % (W + 40) - 30; ctx.fillRect(x, 28 + i * 18, 26, 6); ctx.fillRect(x + 6, 24 + i * 18, 14, 4); }
  for (const p of s.towers) drawTower(ctx, p);
  ctx.fillStyle = '#8a6230'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#c4a06a'; ctx.fillRect(0, GROUND, W, 6);
  for (let x = -((s.scrolled * 0.5) % 16); x < W; x += 16) { ctx.fillStyle = '#6a4a28'; ctx.fillRect(x, GROUND + 10, 6, 2); }
  const b = s.b, y = s.t && s.frame === 0 ? 96 : b.y;
  shiba(ctx, b.x, y, { rot: Math.max(-0.6, Math.min(1.1, b.vy / 420)), face: 1 });
  if (s.glide > 0) { ctx.fillStyle = '#fbf1e0'; ctx.fillRect(b.x - 16, y - 2, 6, 2); }
}
function drawTower(ctx, p) {
  const x = p.x, top = p.gy, bot = p.gy + p.gap;
  if (p.kind === 'bone') { boneCairn(ctx, x, 0, top); boneCairn(ctx, x, bot, GROUND); }
  else if (p.kind === 'kennel') { kennel(ctx, x, top, -1); kennel(ctx, x, bot, 1); posts(ctx, x, 0, top - 28); posts(ctx, x, bot + 30, GROUND); }
  else { timber(ctx, x, 0, top, 1); timber(ctx, x, bot, GROUND, -1); }
  if (p.treat && !p.got) bone(ctx, x + TW / 2 - 4, bot - p.gap * 0.5);
}
function boneCairn(ctx, x, y0, y1) {
  const lo = Math.min(y0, y1), hi = Math.max(y0, y1);
  let i = 0;
  for (let y = lo; y < hi; y += 9) {
    const w = (i++ % 2) ? -5 : 4; // zigzag so the stack is not a straight column
    ctx.fillStyle = '#f7f1e4';
    ctx.fillRect(x + 9 + w, y + 1, 10, 5);
    ctx.fillRect(x + w, y - 1, 7, 9);
    ctx.fillRect(x + TW - 8 + w, y - 1, 7, 9);
    ctx.fillStyle = '#c4a06a';
    ctx.fillRect(x + 2 + w, y + 1, 2, 5);
    ctx.fillRect(x + TW - 5 + w, y + 1, 2, 5);
  }
}
function posts(ctx, x, y0, y1) { if (y1 <= y0) return; ctx.fillStyle = '#a67c52'; ctx.fillRect(x + 4, y0, 5, y1 - y0); ctx.fillRect(x + TW - 9, y0, 5, y1 - y0); ctx.fillStyle = '#6a3a18'; ctx.fillRect(x + 6, y0, 1, y1 - y0); }
function kennel(ctx, x, tip, dir) {
  const roof = 16, body = 22;
  ctx.fillStyle = '#c4523a'; ctx.beginPath();
  if (dir > 0) { ctx.moveTo(x - 2, tip + roof); ctx.lineTo(x + TW / 2, tip); ctx.lineTo(x + TW + 2, tip + roof); ctx.fill(); ctx.fillStyle = '#d8b98a'; ctx.fillRect(x + 3, tip + roof, TW - 6, body); ctx.fillStyle = '#3a2a22'; ctx.fillRect(x + TW / 2 - 4, tip + roof + 8, 8, body - 8); ctx.fillStyle = '#8a5a32'; ctx.fillRect(x + TW - 10, tip + 4, 4, 8); }
  else { ctx.moveTo(x - 2, tip - roof); ctx.lineTo(x + TW / 2, tip); ctx.lineTo(x + TW + 2, tip - roof); ctx.fill(); ctx.fillStyle = '#d8b98a'; ctx.fillRect(x + 3, tip - roof - body, TW - 6, body); ctx.fillStyle = '#3a2a22'; ctx.fillRect(x + TW / 2 - 4, tip - roof - body, 8, 10); }
}
function timber(ctx, x, y0, y1, crownAtEnd) {
  const lo = Math.min(y0, y1), hi = Math.max(y0, y1), tip = crownAtEnd > 0 ? hi : lo;
  ctx.fillStyle = '#6a3a18'; ctx.fillRect(x + TW / 2 - 2, lo, 4, hi - lo);
  ctx.fillStyle = '#8a5a32'; ctx.fillRect(x, tip + (crownAtEnd > 0 ? -12 : 2), 10, 3); ctx.fillRect(x + TW - 12, tip + (crownAtEnd > 0 ? -16 : 6), 12, 3);
  const cy = crownAtEnd > 0 ? tip - 10 : tip + 10;
  ctx.fillStyle = '#e07a2a'; ctx.fillRect(x - 8, cy - 6, TW + 16, 14); ctx.fillRect(x - 2, cy - 14, TW + 4, 10); ctx.fillRect(x + 4, cy - 20, TW - 8, 8);
  ctx.fillStyle = '#c4523a'; ctx.fillRect(x, cy - 2, 6, 5); ctx.fillRect(x + TW - 6, cy - 10, 6, 5); ctx.fillStyle = '#f2c14e'; ctx.fillRect(x + 8, cy - 8, 4, 4);
}
export function marquee(ctx, sx, sy, t) {
  ctx.fillStyle = '#8ec8e8'; ctx.fillRect(sx, sy, 30, 22);
  boneCairn(ctx, sx + 1, sy, sy + 22); timber(ctx, sx + 16, sy, sy + 22, 1);
  ctx.fillStyle = '#e8892e'; ctx.fillRect(sx + 10, sy + 8 + Math.round(Math.sin(t * 6) * 3), 5, 4);
}
