// DASH LINE — a Shiba sprints a kennel track. Jump crates, clear creek gaps, double-jump the tall ones.
// Classic: A / Up jumps, again in the air. Inu: biscuits over the track refresh a jump and score.
import { blank, edge, pre, hurt, fx, pop, shiba, bone, rand, pick } from './kit.js';
export const NAME = 'Dash Line';
export const META = {
  id: 'dash-line', title: 'DASH LINE', short: 'DASH', color: '#ff7b54', buttons: 1, freePlay: true,
  blurb: 'Auto-run the kennel track. Jump the crates and clear the creek gaps. Tap again in the air.',
  controls: 'A or Up to jump. Tap again in the air.',
  inuMove: 'TREAT HOP: biscuits hang over the track. Grab one for +25 and a fresh jump.',
  classicNote: 'Original Inu rules at classic difficulty.',
};
export const W = 224, H = 256, PX = 48, PS = 14, GY = 196;
export function create(seed = 1, opts = {}) {
  const s = blank(META.id, seed, opts, { lives: 1 });
  s.p = { y: GY, vy: 0, jumps: 0 }; s.obs = []; s.speed = 118; s.dist = 0; s.next = 90;
  s.stats = { jumps: 0, treats: 0 }; return s;
}
function jump(s) { const p = s.p; if (p.jumps >= 2) return; p.vy = p.jumps ? -300 : -360; p.jumps++; s.stats.jumps++; s.ev.push('hop'); }
const overGap = (s) => s.obs.some((o) => o.type === 'gap' && PX + PS / 2 > o.x + 4 && PX + PS / 2 < o.x + o.w - 4);
export function step(s, dt, inp = {}) {
  if (!pre(s, dt)) return; const e = edge(s, inp), p = s.p;
  if (e.a || e.up) jump(s);
  s.speed += 4 * dt; const mv = s.speed * dt; s.dist += mv; s.score = Math.floor(s.dist / 28) + s.stats.treats * 25;
  for (const o of s.obs) o.x -= mv;
  s.obs = s.obs.filter((o) => o.x + (o.w || 8) > -16);
  s.next -= mv;
  if (s.next <= 0) {
    const t = pick(s, ['block', 'block', 'tall', 'gap', 'double']);
    if (t === 'gap') s.obs.push({ type: 'gap', x: W + 8, w: rand(s, 46, 72) });
    else if (t === 'double') { s.obs.push({ type: 'block', x: W + 8, w: 18, h: 22 }); s.obs.push({ type: 'block', x: W + 70, w: 18, h: 22 }); }
    else s.obs.push({ type: 'block', x: W + 8, w: rand(s, 16, 28), h: t === 'tall' ? rand(s, 44, 56) : rand(s, 18, 28) });
    if (s.inu && s.rnd() < 0.45) s.obs.push({ type: 'treat', x: W + rand(s, 24, 80), y: GY - rand(s, 36, 58) });
    s.next = rand(s, 150, 240);
  }
  p.vy += 1000 * dt; const y0 = p.y; p.y += p.vy * dt;
  if (p.y >= GY && !overGap(s)) { if (p.jumps) fx(s, PX + 6, GY, '#fbf1e0', 4); p.y = GY; p.vy = 0; p.jumps = 0; }
  else if (p.y > GY) p.jumps = Math.max(p.jumps, 2);
  for (const o of s.obs) {
    if (o.type === 'treat' && !o.got && PX < o.x + 8 && PX + PS > o.x && p.y - PS < o.y + 8 && p.y > o.y - 4) { o.got = true; s.stats.treats++; if (p.jumps) p.jumps = 1; s.ev.push('pow'); pop(s, o.x, o.y - 8, '+25'); }
    if (o.type === 'block' && s.iframe <= 0 && PX + PS - 2 > o.x && PX + 2 < o.x + o.w && p.y > GY - o.h + 2 && y0 > GY - o.h - 8) { s.why = 'ran into a crate'; if (hurt(s)) return; p.vy = -200; }
  }
  if (p.y > H + 20) { s.why = 'fell in the creek'; if (hurt(s)) return; p.y = GY; p.vy = 0; p.jumps = 0; }
}
export function bot(s) {
  if (s.frame % 8 !== 0) return {};
  const p = s.p, o = s.obs.find((q) => q.x + (q.w || 0) > PX - 4 && q.x < PX + 64 && q.type !== 'treat');
  if (!o) return {};
  if (o.type === 'gap' && o.x < PX + 28) return { a: true };
  if (o.type === 'block' && o.x < PX + 36 && (p.jumps === 0 || (o.h > 40 && p.jumps === 1))) return { a: true };
  return {};
}
export const ghostPos = (s) => ({ x: PX + 6, y: s.p.y - 6 });
export function draw(ctx, s) {
  ctx.fillStyle = '#241c3a'; ctx.fillRect(0, 0, W, H);
  const off = s.dist;
  ctx.fillStyle = '#3a3160'; for (let i = -1; i < 5; i++) { const x = i * 64 - (off * 0.2) % 64; ctx.fillRect(x, GY - 36, 28, 36); ctx.fillRect(x + 8, GY - 52, 14, 16); }
  ctx.fillStyle = '#2a6a5a'; ctx.fillRect(0, GY, W, H - GY); ctx.fillStyle = '#3a8a72'; ctx.fillRect(0, GY, W, 4);
  for (const o of s.obs) {
    if (o.type === 'gap') { ctx.fillStyle = '#1a3050'; ctx.fillRect(o.x, GY, o.w, H - GY); ctx.fillStyle = '#4fc3e8'; ctx.fillRect(o.x, GY, o.w, 3); }
    else if (o.type === 'treat' && !o.got) bone(ctx, o.x, o.y);
    else if (o.type === 'block') { ctx.fillStyle = '#c4523a'; ctx.fillRect(o.x, GY - o.h, o.w, o.h); ctx.fillStyle = '#e8d4b0'; ctx.fillRect(o.x + 2, GY - o.h + 3, o.w - 4, 3); ctx.fillStyle = '#f7f1e4'; ctx.fillRect(o.x - 1, GY - 5, 4, 4); ctx.fillRect(o.x + o.w - 4, GY - 5, 4, 4); }
  }
  const p = s.p; shiba(ctx, PX + 8, p.y - 2, { rot: p.jumps ? Math.min(1, s.t * 6 % 6) * 0.2 : 0 });
}
export function marquee(ctx, sx, sy) {
  ctx.fillStyle = '#241c3a'; ctx.fillRect(sx, sy, 30, 22); ctx.fillStyle = '#2a6a5a'; ctx.fillRect(sx, sy + 16, 30, 6);
  ctx.fillStyle = '#c4523a'; ctx.fillRect(sx + 16, sy + 8, 8, 8); ctx.fillStyle = '#e8892e'; ctx.fillRect(sx + 4, sy + 10, 6, 6);
}
