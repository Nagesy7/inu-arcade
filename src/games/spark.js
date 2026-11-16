// SPARK FACTORY — a two-minute kennel shift. Bark the paw to make sparks, then build machines that make more.
// The button is a paw, not a round token. Sparks exist only inside the shift: they are the score, not a currency.
// Classic: A barks, Left/Right pick a machine, B builds it. Inu: every 8th bark in a rush counts double.
import { blank, edge, pre, fx, pop, label } from './kit.js';
export const NAME = 'Spark Factory';
export const BUTTON = { kind: 'paw', label: 'BARK' };
export const SHIFT = 120;
export const MACHINES = [
  { id: 'yap', name: 'BIGGER BARK', base: 25, desc: 'x2 each bark', col: '#e8892e' },
  { id: 'mill', name: 'TAIL MILL', base: 15, rate: 1, col: '#7ec8a3' },
  { id: 'ken', name: 'DYNAMO', base: 100, rate: 8, col: '#4fc3e8' },
  { id: 'fan', name: 'YARD FAN', base: 800, rate: 45, col: '#b57bff' },
  { id: 'den', name: 'DEN CORE', base: 6000, rate: 280, col: '#ff5d73' },
];
export const META = {
  id: 'spark-factory', title: 'SPARK FACTORY', short: 'SPARK', color: '#e8892e', buttons: 2, freePlay: true,
  blurb: 'Two minutes. Bark the paw, build machines, and make as many sparks as you can before the bell.',
  controls: 'A barks the paw. Left/Right pick a machine. B builds it.',
  inuMove: 'RUSH BARK: every 8th bark in a hurry counts double.',
  classicNote: 'Original Inu rules at classic difficulty. The shift is two minutes.',
};
export const W = 224, H = 256;
const fmt = (n) => { n = Math.floor(Math.abs(n)); if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'; if (n >= 10000) return (n / 1000).toFixed(1) + 'k'; return String(n); };
export const perBark = (s) => 2 ** (s.own.yap || 0);
export const costOf = (s, it) => Math.floor(it.base * Math.pow(it.id === 'yap' ? 2.6 : 1.15, s.own[it.id] || 0));
export const rateOf = (s) => MACHINES.reduce((n, it) => n + (it.rate || 0) * (s.own[it.id] || 0), 0);
export function create(seed = 1, opts = {}) {
  const s = blank(META.id, seed, opts, { lives: 1 });
  s.bank = 0; s.total = 0; s.own = { yap: 0, mill: 0, ken: 0, fan: 0, den: 0 }; s.time = SHIFT; s.sel = 0; s.pulse = 0; s.hold = 0; s.rush = 0;
  s.stats = { barks: 0, builds: 0 }; return s;
}
function earn(s, n) { s.bank += n; s.total += n; s.score = Math.floor(s.total); }
export function bark(s) {
  let v = perBark(s);
  if (s.inu) { s.rush = s.t - s.lastBark < 0.45 ? s.rush + 1 : 1; s.lastBark = s.t; if (s.rush % 8 === 0) v *= 2; }
  earn(s, v); s.pulse = 0.12; s.stats.barks++; s.ev.push('bark'); fx(s, W / 2, 86, '#f6d7b0', 5); pop(s, W / 2 + (s.rnd() * 24 - 12), 70, '+' + v, '#fbf1e0');
}
export function build(s) {
  const it = MACHINES[s.sel]; if (!it) return;
  const c = costOf(s, it);
  if (s.bank < c) { s.ev.push('blip'); return; }
  s.bank -= c; s.own[it.id]++; s.stats.builds++; s.ev.push('pow'); fx(s, 28, rowY(s.sel) + 8, it.col, 6);
}
const rowY = (i) => 124 + i * 24;
export function step(s, dt, inp = {}) {
  if (!pre(s, dt)) return; const e = edge(s, inp);
  if (e.left || e.up) s.sel = (s.sel + MACHINES.length - 1) % MACHINES.length;
  if (e.right || e.down) s.sel = (s.sel + 1) % MACHINES.length;
  if (inp.a) { s.hold -= dt; if (e.a || s.hold <= 0) { bark(s); s.hold = 0.16; } } else s.hold = 0;
  if (e.b) build(s);
  earn(s, rateOf(s) * dt); s.pulse -= dt; s.time -= dt;
  if (s.time <= 0) { s.time = 0; s.why = 'shift over, ' + fmt(rateOf(s)) + '/s'; s.lives = 0; s.over = true; s.ev.push('level'); }
}
export function bot(s) {
  if (s.frame % 8 === 0) return { a: true };
  if (s.frame % 30 === 4) return { b: true };
  if (s.frame % 45 === 2) return { right: true };
  return {};
}
export const ghostPos = (s) => ({ x: W / 2, y: 84 });
export function drawPaw(ctx, cx, cy, pulse) {
  const sc = 1 + Math.max(0, pulse) * 0.18;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
  const toes = [[-18, -18], [-6, -24], [6, -24], [18, -18]];
  ctx.fillStyle = '#1a1424';
  for (const [x, y] of toes) ctx.fillRect(x - 7, y - 6, 14, 12);
  ctx.fillRect(-22, -8, 44, 28);
  ctx.fillStyle = '#f3c9a0'; ctx.fillRect(-20, -6, 40, 24);
  ctx.fillStyle = '#e07a3a';
  for (const [x, y] of toes) ctx.fillRect(x - 5, y - 4, 10, 8);
  ctx.fillRect(-7, 2, 14, 10);
  label(ctx, BUTTON.label, 0, 4, '#3a2430', 6, 'center');
  ctx.restore();
}
export function draw(ctx, s) {
  ctx.fillStyle = '#17142a'; ctx.fillRect(0, 0, W, H);
  label(ctx, fmt(s.bank) + ' SPARKS', W / 2, 22, '#fbf1e0', 8, 'center');
  label(ctx, fmt(rateOf(s)) + '/s  ' + perBark(s) + '/BARK', W / 2, 34, '#c8bce8', 6, 'center');
  const m = Math.floor(s.time / 60), sec = Math.floor(s.time % 60);
  label(ctx, m + ':' + String(sec).padStart(2, '0'), W - 8, 22, s.time < 15 ? '#ff5d73' : '#c8bce8', 6, 'right');
  drawPaw(ctx, W / 2, 86, s.pulse);
  MACHINES.forEach((it, i) => {
    const y = rowY(i), c = costOf(s, it), can = s.bank >= c;
    ctx.fillStyle = i === s.sel ? '#3a3058' : '#241c40'; ctx.fillRect(8, y, 208, 22);
    if (i === s.sel) { ctx.strokeStyle = '#f2c14e'; ctx.strokeRect(8.5, y + 0.5, 207, 21); }
    ctx.fillStyle = it.col; ctx.fillRect(14, y + 4, 14, 14);
    label(ctx, String(s.own[it.id]), 17, y + 7, '#1a1424', 6);
    label(ctx, it.name, 34, y + 3, can ? '#fbf1e0' : '#8a86a8', 6);
    label(ctx, it.desc || '+' + it.rate + '/s', 34, y + 12, '#a7a3c4', 5);
    label(ctx, fmt(c), 208, y + 7, can ? '#f6d7b0' : '#6d6990', 6, 'right');
  });
}
export function marquee(ctx, sx, sy, t) {
  ctx.fillStyle = '#17142a'; ctx.fillRect(sx, sy, 30, 22);
  ctx.fillStyle = '#f3c9a0'; ctx.fillRect(sx + 8, sy + 8, 14, 8);
  ctx.fillStyle = '#e07a3a'; ctx.fillRect(sx + 6, sy + 4, 4, 4); ctx.fillRect(sx + 12, sy + 3, 4, 4); ctx.fillRect(sx + 18, sy + 4, 4, 4);
  if (Math.floor(t * 4) % 2) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(sx + 22, sy + 6, 2, 2); }
}
