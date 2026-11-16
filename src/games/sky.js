// SKY SPRINGS — a pup bounces up drifting platforms and must not fall off the bottom of the screen.
// Planks are wood, rafts drift, cracked stones crumble, springs launch higher.
// Classic: Left/Right steer. Inu: hold A as you land for a Zoomies bounce, on a cooldown.
import { blank, pre, hurt, fx, pop, shiba, rand } from './kit.js';
export const NAME = 'Sky Springs';
export const META = {
  id: 'sky-springs', title: 'SKY SPRINGS', short: 'SKY', color: '#5fd37a', buttons: 1, freePlay: true,
  blurb: 'Bounce upward. Wood holds, rafts drift, cracked stones crumble, orange pads launch you.',
  controls: 'Left/Right or the stick to steer. The screen wraps.',
  inuMove: 'ZOOMIES (hold A as you land): a high bounce, every 3 seconds.',
  classicNote: 'Original Inu rules at classic difficulty.',
};
export const W = 224, H = 256, JUMP = -300, GRAV = 760, PR = 6;
export function create(seed = 1, opts = {}) {
  const s = blank(META.id, seed, opts, { lives: 1 });
  s.p = { x: 110, y: 30, vy: JUMP, vx: 0 }; s.cam = 30 - H * 0.62; s.maxH = 0; s.zoom = 0;
  s.plats = [{ x: 80, y: 48, w: 52, t: 'n' }]; s.top = 48; s.stats = { bounces: 0, crumbles: 0 };
  let g = 0; while (s.top > s.cam - 90 && g++ < 30) spawn(s); return s;
}
function spawn(s) {
  const climbed = Math.max(0, -s.top), gap = rand(s, 42, 52 + Math.min(36, climbed / 140)); s.top -= gap;
  const diff = Math.min(1, climbed / 5000), r = s.rnd();
  const t = r < 0.1 + diff * 0.12 ? 'm' : r < 0.18 + diff * 0.16 ? 'c' : r < 0.26 + diff * 0.12 ? 's' : 'n';
  s.plats.push({ x: rand(s, 8, W - 70), y: s.top, w: t === 'c' ? 44 : 50, t, dir: s.rnd() < 0.5 ? -1 : 1, dead: 0 });
}
export function step(s, dt, inp = {}) {
  if (!pre(s, dt)) return; const p = s.p; s.zoom = Math.max(0, s.zoom - dt);
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  p.vx += (dir * 170 - p.vx) * Math.min(1, dt * 9); p.x += p.vx * dt;
  if (p.x < -PR) p.x = W + PR; if (p.x > W + PR) p.x = -PR;
  const y0 = p.y; p.vy += GRAV * dt; p.y += p.vy * dt;
  for (const pl of s.plats) {
    if (pl.t === 'm') { pl.x += pl.dir * 46 * dt; if (pl.x < 4 || pl.x + pl.w > W - 4) pl.dir *= -1; }
    if (pl.dead) { pl.dead += dt; pl.y += 220 * dt; continue; }
    if (p.vy > 0 && y0 + PR <= pl.y + 2 && p.y + PR >= pl.y && p.x > pl.x - 4 && p.x < pl.x + pl.w + 4) {
      if (pl.t === 'c') { pl.dead = 0.01; s.stats.crumbles++; s.ev.push('brick'); fx(s, p.x, pl.y, '#9aa4b1', 6); continue; }
      p.y = pl.y - PR; const zoom = s.inu && inp.a && s.zoom <= 0 && pl.t === 'n';
      p.vy = pl.t === 's' || zoom ? JUMP * 1.45 : JUMP; if (zoom) { s.zoom = 3; pop(s, p.x, p.y - 10, 'ZOOMIES', '#f2c14e'); s.ev.push('pow'); }
      else s.ev.push(pl.t === 's' ? 'pow' : 'hop');
      s.stats.bounces++; fx(s, p.x, pl.y, pl.t === 's' ? '#e8892e' : '#c4a06a', 4);
    }
  }
  if (p.y - H * 0.42 < s.cam) s.cam = p.y - H * 0.42;
  s.maxH = Math.max(s.maxH, -p.y); s.score = Math.floor(s.maxH / 8); s.level = 1 + Math.floor(s.score / 400);
  let g = 0; while (s.top > s.cam - 100 && g++ < 8) spawn(s);
  s.plats = s.plats.filter((pl) => pl.y < s.cam + H + 30 && pl.dead < 0.8);
  if (p.y - s.cam > H + 8) { s.why = 'fell off the bottom'; if (hurt(s, 0)) return; p.vy = JUMP; p.y = s.cam + H * 0.5; }
}
export function bot(s) {
  const p = s.p, above = s.plats.filter((pl) => !pl.dead && pl.y < p.y - 2 && pl.y > p.y - 80).sort((a, b) => b.y - a.y)[0];
  if (!above) return {};
  const tx = above.x + above.w / 2;
  if (tx < p.x - 3) return { left: true };
  if (tx > p.x + 3) return { right: true };
  return s.inu && s.zoom <= 0 ? { a: true } : {};
}
export const ghostPos = (s) => ({ x: s.p.x, y: s.p.y - s.cam });
export function draw(ctx, s) {
  ctx.fillStyle = '#d7ecff'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#c5dff5'; for (let y = ((-s.cam % 24) + 24) % 24; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const ink = { n: '#c4a06a', m: '#4fc3e8', c: '#9aa4b1', s: '#c4a06a' };
  for (const pl of s.plats) {
    const y = pl.y - s.cam; if (y < -20 || y > H + 10) continue;
    ctx.globalAlpha = pl.dead ? Math.max(0, 1 - pl.dead * 2) : 1;
    ctx.fillStyle = '#1a1424'; ctx.fillRect(pl.x - 1, y - 1, pl.w + 2, 10);
    ctx.fillStyle = ink[pl.t]; ctx.fillRect(pl.x, y, pl.w, 8);
    if (pl.t === 'c') { ctx.fillStyle = '#5c6570'; ctx.fillRect(pl.x + 10, y, 2, 8); ctx.fillRect(pl.x + 24, y + 2, 8, 2); }
    if (pl.t === 's') { ctx.fillStyle = '#e8892e'; ctx.fillRect(pl.x + pl.w / 2 - 8, y - 5, 16, 5); }
    if (pl.t === 'm') { ctx.fillStyle = '#fbf1e0'; ctx.fillRect(pl.x + 4, y + 2, pl.w - 8, 2); }
    ctx.globalAlpha = 1;
  }
  const p = s.p; shiba(ctx, p.x, p.y - s.cam, { face: p.vx < 0 ? -1 : 1 });
}
export function marquee(ctx, sx, sy, t) {
  ctx.fillStyle = '#d7ecff'; ctx.fillRect(sx, sy, 30, 22);
  ctx.fillStyle = '#c4a06a'; ctx.fillRect(sx + 2, sy + 16, 12, 3); ctx.fillRect(sx + 14, sy + 8, 12, 3);
  ctx.fillStyle = '#e8892e'; ctx.fillRect(sx + 8, sy + 6 + Math.round(Math.abs(Math.sin(t * 4)) * -6) + 8, 4, 4);
}
