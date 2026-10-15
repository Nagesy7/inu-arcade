// Touch landscape: keep the canvas clear of the d-pad (left) and toolbar/A button (right) when it would overlap them.
export function fitBox(W, H, cw, ch, touch) { let s = Math.min(W / cw, H / ch), off = 0;
  if (touch && W > H) { const L = 172, R = 164, w2 = W - L - R; if (cw * s > W - 2 * Math.max(L, R) && w2 > 0) { s = Math.min(w2 / cw, H / ch); off = (L - R) / 2; } }
  if (s >= 2) s = Math.floor(s * 2) / 2; return { w: Math.floor(cw * s), h: Math.floor(ch * s), off: Math.round(off) }; }
