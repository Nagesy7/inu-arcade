// Ambient life (original Inu Verse pixel style): hall crowd of idle pups, cabinet marquee bulbs, the Daily Event star,
// and a light themed background loop on every cabinet's title screen. Cheap by design: a few dozen fillRects per frame,
// no per-frame allocations in the hot paths, and three levels:
//   full    = everything
//   low     = Low FX (Settings) or a low-memory device: fewer pups/particles, no bulb chase, half the title particles
//   reduced = prefers-reduced-motion: no wandering, no scrolling or blinking from this layer (a static scene)
export const FX_KEY = 'inuarcade.fx.v1';
export function loadFx(storage) { try { const v = JSON.parse(storage?.getItem(FX_KEY) || 'null'); return { low: v?.low === true }; } catch { return { low: false }; } }
export function saveFx(storage, fx) { try { storage?.setItem(FX_KEY, JSON.stringify({ low: !!fx.low })); } catch {} }
export function fxLevel({ low = false, reduced = false, lowMem = false } = {}) { return reduced ? 'reduced' : low || lowMem ? 'low' : 'full'; }
export const crowdSize = (lvl) => (lvl === 'full' ? 6 : lvl === 'low' ? 3 : 3);

const COATS = [['#e0802c', '#b65a1c'], ['#f4e6c8', '#c8b490'], ['#3a2c2a', '#1f1816'], ['#d9a066', '#a8743e'], ['#c8502a', '#8a3418'], ['#efe3cf', '#bfae8f']];
const PUP = ['.o.o.....', '.oooo...o', 'oeooo..oo', 'wwnoooooo', 'wwooooooo', '.wwwwooo.', '.o.o.o.o.'];
const PUP2 = ['.o.o.....', '.oooo..o.', 'oeooo..oo', 'wwnoooooo', 'wwooooooo', '.wwwwooo.', 'o.o...o.o']; // stride frame
const SIT = ['.o.o.....', '.oooo....', 'oeooo..o.', 'wwnoooooo', 'wwoooooo.', '.wwwwoo..', '.oo..oo..'];
const sprCache = new Map();
function pupSpr(PIX, k, frame, flip) { const key = k + ':' + frame + ':' + (flip ? 1 : 0); let s = sprCache.get(key); if (s) return s; const [o, d] = COATS[k % COATS.length];
  s = PIX.sprite('npc' + key, frame === 2 ? SIT : frame ? PUP2 : PUP, { o, d, w: '#fbf1e0', e: '#1a1424', n: '#3a2430' }, { flip }); sprCache.set(key, s); return s; }

// floor = { x0, x1, y0, y1 } walkable box; spots = [{ x, y, id }] (cabinet fronts); block = { x, y, w, h } (prize counter)
export function createCrowd(n, floor, spots, rand = Math.random) {
  return Array.from({ length: n }, (_, i) => ({ k: i, x: floor.x0 + rand() * (floor.x1 - floor.x0), y: floor.y0 + rand() * (floor.y1 - floor.y0), tx: null, ty: null, wait: rand() * 3, face: rand() < 0.5 ? 1 : -1, walk: 0, hop: 0, cheer: 0, watch: null, bubble: 0 }));
}
export function updateCrowd(C, dt, { floor, spots, block, lvl = 'full', hot = null, cheer = 0, rand = Math.random }) {
  if (lvl === 'reduced') { for (const p of C) { p.walk = 0; p.hop = 0; } return; }
  for (const p of C) {
    p.bubble = Math.max(0, p.bubble - dt); p.cheer = Math.max(0, p.cheer - dt);
    if (cheer > 0 && p.cheer <= 0 && rand() < dt * 3) { p.cheer = 0.45; p.bubble = 0.9; }
    if (p.tx == null) { p.wait -= dt;
      if (p.watch && rand() < dt * (p.watch === hot ? 0.9 : 0.25)) { p.cheer = 0.45; if (rand() < 0.5) p.bubble = 0.9; } // watching a cabinet: hop + cheer now and then
      if (p.wait <= 0) { const toCab = rand() < (hot ? 0.7 : 0.55), s = toCab ? (hot && rand() < 0.5 ? spots.find((q) => q.id === hot) || spots[(rand() * spots.length) | 0] : spots[(rand() * spots.length) | 0]) : null;
        p.tx = s ? s.x + (rand() * 16 - 8) : floor.x0 + rand() * (floor.x1 - floor.x0); p.ty = s ? floor.y0 + rand() * 8 : floor.y0 + rand() * (floor.y1 - floor.y0); p.watch = s ? s.id : null;
        if (block && p.tx > block.x - 8 && p.tx < block.x + block.w + 8 && p.ty > block.y - 14) p.tx = block.x - 14; } }
    else { const vx = p.tx - p.x, vy = p.ty - p.y, d = Math.hypot(vx, vy), sp = 26 * dt;
      if (d < 1.5) { p.tx = null; p.wait = 1.5 + rand() * 4; p.walk = 0; } else { p.x += (vx / d) * Math.min(sp, d); p.y += (vy / d) * Math.min(sp, d); p.walk += dt; if (Math.abs(vx) > 0.5) p.face = vx > 0 ? 1 : -1; } }
    p.hop = p.cheer > 0 ? Math.round(Math.sin((p.cheer / 0.45) * Math.PI) * 4) : 0;
  }
}
export function drawCrowd(ctx, C, now, PIX, lvl = 'full') {
  const order = C.slice().sort((a, b) => a.y - b.y);
  for (const p of order) { const moving = p.tx != null && lvl !== 'reduced', fr = moving ? (Math.floor(p.walk * 8) % 2) : 2, s = pupSpr(PIX, p.k, fr, p.face < 0);
    ctx.fillStyle = '#00000055'; ctx.fillRect(Math.round(p.x) - 5, Math.round(p.y) + 1, 10, 2);
    PIX.blit(ctx, s, Math.round(p.x) - 5, Math.round(p.y) - 8 - p.hop, 1);
    if (p.bubble > 0 && lvl !== 'reduced') { const bx = Math.round(p.x) + (p.face > 0 ? 3 : -6), by = Math.round(p.y) - 16 - p.hop; ctx.fillStyle = '#fbf1e0'; ctx.fillRect(bx, by, 5, 6); ctx.fillStyle = p.k % 2 ? '#ff5d73' : '#f2c14e';
      if (p.k % 2) { ctx.fillRect(bx + 2, by + 1, 1, 3); ctx.fillRect(bx + 2, by + 5 - 1, 1, 1); } else { ctx.fillRect(bx + 1, by + 3, 2, 2); ctx.fillRect(bx + 3, by + 1, 1, 3); } } // "!" or a little note
  }
}
// chasing marquee bulbs on a cabinet top (x, y = cabinet top-left, w = width)
export function drawBulbs(ctx, x, y, w, now, color, lvl = 'full') {
  const n = 5, step = (w - 4) / (n - 1), on = lvl === 'full' ? Math.floor(now * 6) % 3 : -1;
  for (let i = 0; i < n; i++) { const lit = on < 0 ? i % 2 === 0 : i % 3 === on; ctx.fillStyle = lit ? '#fff6c0' : color; ctx.globalAlpha = lit ? 1 : 0.45; ctx.fillRect(Math.round(x + 2 + i * step) - 1, y - 2, 2, 2); }
  ctx.globalAlpha = 1;
}
// Daily Event marker above a cabinet: bobbing gold star + "TODAY" plate
export function drawEventStar(ctx, cx, y, now, lvl = 'full') {
  const b = lvl === 'reduced' ? 0 : Math.round(Math.sin(now * 3) * 1.5), g = lvl === 'full' ? 0.6 + 0.4 * Math.sin(now * 5) : 1;
  ctx.globalAlpha = g; ctx.fillStyle = '#f2c14e'; const sx = Math.round(cx), sy = y + b;
  ctx.fillRect(sx, sy - 3, 1, 7); ctx.fillRect(sx - 3, sy, 7, 1); ctx.fillRect(sx - 1, sy - 1, 3, 3); ctx.fillStyle = '#fff6c0'; ctx.fillRect(sx, sy, 1, 1); ctx.globalAlpha = 1;
}
// floating dust / neon specks in the hall air (world space, 384 wide)
export function drawMotes(ctx, now, lvl = 'full', W = 384, top = 24, bottom = 98) {
  if (lvl === 'reduced') return; const n = lvl === 'full' ? 14 : 6, t = now;
  for (let i = 0; i < n; i++) { const x = (i * 53.7 + t * (4 + (i % 3) * 2)) % W, y = top + ((i * 31.3 + Math.sin(t * 0.7 + i) * 6 + t * 3) % (bottom - top));
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 2 + i); ctx.fillStyle = i % 3 ? '#7ef0ff' : '#ff9ab0'; ctx.fillRect(x | 0, y | 0, 1, 1); }
  ctx.globalAlpha = 1;
}

// ---- cabinet title-screen backgrounds (drawn behind the title text; low alpha so text stays readable) ----
const fr = (v, m) => ((v % m) + m) % m;
export function drawTitleAmbient(ctx, id, W, H, now, lvl = 'full') {
  const t = lvl === 'reduced' ? 0 : now, k = lvl === 'full' ? 1 : 0.5, n = (c) => Math.max(2, Math.round(c * k)); ctx.save();
  if (id === 'kibble-chomp') { // kibble marching along maze lanes, cat eyes blinking in the corners, a chomping pup crossing
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#2430a0'; for (const y of [H - 92, H - 60]) ctx.fillRect(0, y, W, 2);
    ctx.fillStyle = '#c88a3c'; for (let i = 0; i < n(18); i++) ctx.fillRect(fr(i * 14 - t * 20, W + 14) - 7, H - 77, 2, 2);
    ctx.globalAlpha = 0.6; const px = fr(t * 28, W + 40) - 20; ctx.fillStyle = '#e0802c'; ctx.fillRect(px, H - 81, 8, 8); ctx.fillStyle = '#07051a'; if (Math.floor(t * 6) % 2) ctx.fillRect(px + 5, H - 78, 3, 2);
    if (Math.floor(t * 0.8) % 4) { ctx.fillStyle = '#d6302f'; ctx.fillRect(10, 40, 2, 2); ctx.fillRect(15, 40, 2, 2); ctx.fillStyle = '#4fc3e8'; ctx.fillRect(W - 18, 52, 2, 2); ctx.fillRect(W - 13, 52, 2, 2); } }
  else if (id === 'bark-invaders') { // three-layer starfield drifting down + a small rug-ship silhouette passing
    for (let L = 0; L < 3; L++) { ctx.globalAlpha = 0.25 + L * 0.2; ctx.fillStyle = L === 2 ? '#fff6c0' : '#8a7ac4'; for (let i = 0; i < n(12); i++) ctx.fillRect(fr(i * 37 + L * 11, W), fr(i * 53 + L * 29 + t * (6 + L * 10), H), 1, L === 2 ? 2 : 1); }
    ctx.globalAlpha = 0.45; const sx = fr(t * 14, W + 60) - 30; ctx.fillStyle = '#9b59d6'; ctx.fillRect(sx, 46, 12, 3); ctx.fillRect(sx + 3, 44, 6, 2); ctx.fillStyle = '#fff6c0'; if (Math.floor(t * 4) % 2) ctx.fillRect(sx + 5, 49, 2, 1); }
  else if (id === 'pup-crossing') { // pond ripples up top, traffic lane at the bottom
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#1d4fa0'; ctx.fillRect(0, H - 104, W, 14); ctx.fillStyle = '#7ef0ff'; for (let i = 0; i < n(8); i++) ctx.fillRect(fr(i * 31 + t * 10, W), H - 100 + (i % 3) * 4, 6, 1);
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(fr(t * 16, W + 30) - 15, H - 98, 18, 3);
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#2a2a34'; ctx.fillRect(0, H - 86, W, 12); ctx.fillStyle = '#fbf1e0'; for (let i = 0; i < 8; i++) ctx.fillRect(fr(i * 30 - t * 30, W), H - 80, 10, 1);
    ctx.fillStyle = '#e0303a'; ctx.fillRect(W - fr(t * 40, W + 40), H - 85, 14, 6); ctx.fillStyle = '#f2c14e'; ctx.fillRect(fr(t * 26 + 90, W + 40) - 20, H - 85, 18, 6); }
  else if (id === 'bone-breaker') { // a tennis ball bouncing behind the title with a short trail, faint crate rows
    ctx.globalAlpha = 0.18; for (let r = 0; r < 3; r++) for (let i = 0; i < 11; i++) { ctx.fillStyle = ['#ff5d73', '#f2c14e', '#5fd37a'][r]; ctx.fillRect(4 + i * 20, 30 + r * 8, 18, 5); }
    const T = lvl === 'full' ? 4 : 2; for (let j = T; j >= 0; j--) { const tt = t - j * 0.05, bx = 8 + Math.abs(fr(tt * 70, 2 * (W - 16)) - (W - 16)), by = 60 + Math.abs(fr(tt * 55, 2 * (H - 150)) - (H - 150));
      ctx.globalAlpha = j ? 0.12 : 0.55; ctx.fillStyle = '#c8f04e'; ctx.fillRect(bx | 0, by | 0, 3, 3); } }
  else if (id === 'street-sniffer') { // night skyline with windows blinking on and off
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#140c30'; const base = H - 74; for (let i = 0; i < 9; i++) { const bw = 20 + (i * 7) % 12, bh = 30 + (i * 17) % 40, bx = i * 29 - 4; ctx.fillRect(bx, base - bh, bw, bh);
      for (let wy = base - bh + 4; wy < base - 4; wy += 7) for (let wx = bx + 3; wx < bx + bw - 3; wx += 6) { const on = (((wx * 7 + wy * 13) >> 2) + Math.floor(t * 0.5 + (wx % 5))) % 5 < 2; if (on) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(wx, wy, 2, 3); ctx.fillStyle = '#140c30'; } } }
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#f2c14e'; ctx.fillRect(fr(t * 30, W + 20) - 10, base - 3, 8, 3); }
  else if (id === 'paw-fu-tower') { // drifting blossom petals and two swaying lanterns
    ctx.globalAlpha = 0.5; for (let i = 0; i < n(16); i++) { const x = fr(i * 23 + t * 9 + Math.sin(t + i) * 6, W), y = fr(i * 41 + t * 14, H); ctx.fillStyle = i % 3 ? '#ff9ab0' : '#fbd0dc'; ctx.fillRect(x | 0, y | 0, 2, 1); }
    for (const [lx, ph] of [[16, 0], [W - 20, 1.3]]) { const sw = Math.round(Math.sin(t * 1.4 + ph) * 2); ctx.globalAlpha = 0.5; ctx.fillStyle = '#8a3418'; ctx.fillRect(lx + sw, 30, 1, 10); ctx.fillStyle = '#e0303a'; ctx.fillRect(lx - 3 + sw, 40, 7, 8); ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t * 3 + ph); ctx.fillStyle = '#f2c14e'; ctx.fillRect(lx - 6 + sw, 37, 13, 14); } }
  else if (id === 'bone-digger') { // soil strata at the bottom with rising dust and a glinting crystal
    ctx.globalAlpha = 0.3; ['#8a5a32', '#6a3f22', '#4a2a18'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, H - 84 + i * 10, W, 10); });
    ctx.fillStyle = '#c9a36a'; for (let i = 0; i < n(12); i++) ctx.fillRect(fr(i * 21, W), H - 60 - fr(i * 17 + t * 8, 60), 1, 1);
    ctx.globalAlpha = 0.4 + 0.4 * Math.max(0, Math.sin(t * 2.5)); ctx.fillStyle = '#7ef0ff'; ctx.fillRect(W - 40, H - 70, 3, 3); ctx.fillRect(W - 41, H - 69, 5, 1); ctx.fillStyle = '#fbf1e0'; ctx.fillRect(30, H - 62, 7, 2); ctx.fillRect(29, H - 63, 2, 4); ctx.fillRect(36, H - 63, 2, 4); }
  else if (id === 'pips-big-bark') { // drifting clouds and a few floating leaves at sunset
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#ff8a5c'; ctx.fillRect(0, 0, W, 40);
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#fbf1e0'; for (let i = 0; i < 4; i++) { const cx = fr(i * 70 + t * (4 + i * 1.5), W + 50) - 25, cy = 26 + i * 18; ctx.fillRect(cx, cy, 24, 5); ctx.fillRect(cx + 5, cy - 3, 12, 3); }
    ctx.globalAlpha = 0.5; for (let i = 0; i < n(7); i++) { ctx.fillStyle = i % 2 ? '#5fd37a' : '#f2c14e'; ctx.fillRect(fr(i * 37 + t * 12, W), fr(i * 29 + t * 9 + Math.sin(t * 2 + i) * 4, H), 2, 2); } }
  else if (id === 'shiba-scuffle') { // arena spotlights sweeping, confetti drifting
    for (const [ph, c] of [[0, '#fff6c0'], [2.1, '#7ef0ff']]) { const a = Math.sin(t * 0.8 + ph) * 0.5; ctx.globalAlpha = 0.08; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(W / 2 + (ph ? 60 : -60), 0); ctx.lineTo(W / 2 + Math.sin(a) * 160 - 20, H); ctx.lineTo(W / 2 + Math.sin(a) * 160 + 20, H); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 0.55; for (let i = 0; i < n(18); i++) { ctx.fillStyle = ['#ff5d73', '#f2c14e', '#4fc3e8', '#5fd37a'][i % 4]; ctx.fillRect(fr(i * 29 + Math.sin(t + i) * 5, W) | 0, fr(i * 47 + t * 18, H) | 0, 2, 1 + (i % 2)); } }
  ctx.restore();
}
