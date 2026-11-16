// Shared bits for the free-play Inu cabinets. No DOM, no network, no currency.
import { rng } from '../core/rng.js';

export function blank(id, seed = 1, opts = {}, extra = {}) {
  const s = {
    id, inu: !!opts?.inu, seed: seed || 1, rnd: rng(seed || 1),
    score: 0, lives: 1, level: 1, over: false, t: 0, ev: [], fx: [], pops: [],
    shake: 0, flash: 0, frame: 0, iframe: 0, stats: {}, _h: {}, why: '',
  };
  return Object.assign(s, extra);
}
// Edge from the shell's held flags (ghost replays store holds, not a pressed-set).
export function edge(s, inp = {}) {
  const e = {};
  for (const k of ['left', 'right', 'up', 'down', 'a', 'b', 'c']) { const n = !!inp[k]; e[k] = n && !s._h[k]; s._h[k] = n; }
  return e;
}
export const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y, c, n });
export const pop = (s, x, y, text, c = '#f2c14e') => s.pops.push({ x, y, text, c, t: 1 });
export function pre(s, dt) {
  s.ev.length = 0; if (s.over) return false;
  s.flash = Math.max(0, s.flash - dt); s.iframe = Math.max(0, (s.iframe || 0) - dt); s.t += dt; s.frame++; return true;
}
// Returns true when the run is over. Extra lives (weekly modifier) keep going, with a short mercy window.
export function hurt(s, iframe = 0.85) {
  if (s.over || s.iframe > 0) return !!s.over;
  s.lives -= 1; s.flash = 1; s.shake = 0.4; s.iframe = iframe;
  if (s.lives <= 0) { s.lives = 0; s.over = true; s.ev.push('die'); return true; }
  s.ev.push('hit'); return false;
}
export function label(ctx, str, x, y, col = '#fbf1e0', px = 6, align = 'left') {
  ctx.font = `${px}px Silkscreen, monospace`; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillStyle = col; ctx.fillText(str, x, y);
}
// Chunky side-on Shiba. face -1 flips. All original pixels.
export function shiba(ctx, x, y, opt = {}) {
  const sc = opt.s || 1;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(opt.face < 0 ? -sc : sc, sc); if (opt.rot) ctx.rotate(opt.rot);
  ctx.fillStyle = '#1a1424';
  ctx.fillRect(-8, -10, 4, 4); ctx.fillRect(3, -10, 4, 4); ctx.fillRect(-7, -7, 14, 13); ctx.fillRect(-12, -2, 5, 4);
  ctx.fillStyle = opt.coat || '#e8892e';
  ctx.fillRect(-7, -9, 3, 3); ctx.fillRect(4, -9, 3, 3); ctx.fillRect(-6, -6, 12, 11);
  ctx.fillStyle = '#fbf1e0'; ctx.fillRect(-11, -1, 4, 3); ctx.fillRect(-1, -3, 7, 6);
  ctx.fillStyle = '#1a1424'; ctx.fillRect(3, -2, 2, 2);
  ctx.fillStyle = '#3a2430'; ctx.fillRect(5, 1, 2, 2);
  ctx.restore();
}
export function bone(ctx, x, y, s = 1) {
  ctx.fillStyle = '#f7f1e4';
  ctx.fillRect(x, y, 8 * s, 3 * s);
  ctx.fillRect(x - 2 * s, y - s, 3 * s, 5 * s);
  ctx.fillRect(x + 7 * s, y - s, 3 * s, 5 * s);
  ctx.fillStyle = '#e4d5bc'; ctx.fillRect(x + 2 * s, y + s, 4 * s, s);
}
export const rand = (s, a, b) => a + s.rnd() * (b - a);
export const pick = (s, arr) => arr[(s.rnd() * arr.length) | 0];
