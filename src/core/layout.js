// Touch landscape: keep the canvas clear of the d-pad (left) and toolbar/A button (right) when it would overlap them.
export function fitBox(W, H, cw, ch, touch) { let s = Math.min(W / cw, H / ch), off = 0;
  if (touch && W > H) { const L = 172, R = 164, w2 = W - L - R; if (cw * s > W - 2 * Math.max(L, R) && w2 > 0) { s = Math.min(w2 / cw, H / ch); off = (L - R) / 2; } }
  if (s >= 2) s = Math.floor(s * 2) / 2; return { w: Math.floor(cw * s), h: Math.floor(ch * s), off: Math.round(off) }; }
// Handheld (portrait) screen: fit a cw x ch canvas inside the bw x bh 10:9 screen box. Pixel-perfect first: the largest
// whole number of DEVICE pixels per game pixel (k / dpr CSS px). Only when that would waste too much of the screen
// (below 1 CSS px per game pixel AND k / dpr < min * fit, e.g. a 288-tall maze on a 375x667 phone) does it fall back to the exact fit (still nearest-neighbour / pixelated).
export function gbcScale(bw, bh, cw, ch, dpr = 1, min = 0.62) {
  const fit = Math.min(bw / cw, bh / ch), k = Math.floor(fit * dpr + 1e-6), exact = k >= 1 && (k / dpr >= 1 || k / dpr >= fit * min), s = exact ? k / dpr : fit;
  return { s, w: exact ? (cw * k) / dpr : Math.floor(cw * s), h: exact ? (ch * k) / dpr : Math.floor(ch * s), exact }; }
// Shell size (CSS px width; height = width * GBC_RATIO) that fits availW x availH.
export const GBC_RATIO = 1.72, GBC_SCREEN = 0.86; // screen box = 86% of the shell width, 10:9
export function gbcShell(availW, availH, max = 620) { return Math.max(200, Math.floor(Math.min(availW, availH / GBC_RATIO, max))); }
