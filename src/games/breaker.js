// BONE BREAKER — original paddle-and-ball remix. Bounce a tennis ball, smash kibble-crate bricks, catch power-ups.
import { clamp, aabb } from '../core/rng.js';
export const META = { id: 'bone-breaker', title: 'BONE BREAKER', color: '#4fc3e8', blurb: 'Bat the tennis ball into the crate wall. Catch falling treats for power-ups. Do not drop the ball!', controls: 'Left/Right to move, Space / A to launch', inuMove: 'BONE SMASH (A): fire a bone up through the wall, 6s cooldown. Bone power-ups (Fetch catch, Bone Storm pierce) and a FUD-bot boss brick every level.', classicNote: 'Pure paddle-and-ball rules.' };
export const POWERS_INU = ['wide', 'multi', 'fetch', 'storm', 'life'], SMASH = { cd: 6 }, BOSS_PTS = 500;
const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y, c, n }), pop = (s, x, y, text, c = '#7ef0ff') => s.pops.push({ x, y, text, c, t: 1 });
export const W = 384, H = 216, X0 = 40, X1 = 344, TOP = 14, PY = 200, BC = 13, BR = 6, BW = 22, BH = 8;
export const POWERS = ['wide', 'multi', 'slow', 'life'];
export function create(seed = 1, opts = {}) { const s = { id: META.id, inu: !!opts.inu, fx: [], pops: [], shake: 0, smashCd: 0, smash: null, fetchT: 0, stormT: 0, stats: { bosses: 0, smashes: 0, maxRally: 0, rally: 0 }, seed, score: 0, lives: 3, level: 1, over: false, t: 0, ev: [], flash: 0 }; layout(s); return s; }
export function pattern(level, r, c) { const m = (level - 1) % 3; if (m === 0) return true; if (m === 1) return (r + c) % 2 === 0 || r === 0; return Math.abs(c - 6) <= r + 1; }
function layout(s) {
  s.bricks = []; for (let r = 0; r < BR; r++) for (let c = 0; c < BC; c++) if (pattern(s.level, r, c)) {
    const i = r * BC + c; s.bricks.push({ r, c, x: X0 + 3 + c * (BW + 1), y: TOP + 14 + r * (BH + 1), w: BW, h: BH, hp: s.level >= 3 && r < 2 ? 2 : 1, power: (i + s.level) % 7 === 0 ? (s.inu ? POWERS_INU : POWERS)[(i >> 1) % (s.inu ? POWERS_INU : POWERS).length] : null }); }
  if (s.inu) { s.bricks = s.bricks.filter((b) => !(b.r <= 1 && b.c >= 5 && b.c <= 7)); const hp = 8 + s.level * 2; s.bricks.push({ r: 0, c: 6, x: X0 + 3 + 5 * (BW + 1), y: TOP + 14, w: BW * 3 + 2, h: BH * 2 + 1, hp, max: hp, boss: true, vx: 30 }); }
  s.paddle = { x: (X0 + X1) / 2, w: 40, wideT: 0 }; s.caps = []; s.slowT = 0; serve(s);
}
function serve(s) { s.balls = [{ x: s.paddle.x, y: PY - 5, vx: 0, vy: 0, stuck: true }]; s.serveT = 3; }
export const ballSpeed = (s) => Math.min(260, 150 + (s.level - 1) * 15) * (s.slowT > 0 ? 0.65 : 1);
function launch(s, b) { b.stuck = false; const sp = ballSpeed(s); b.vx = sp * 0.45; b.vy = -sp * 0.89; s.ev.push('bounce'); }
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.t += dt; s.flash = Math.max(0, s.flash - dt); const pd = s.paddle;
  pd.wideT = Math.max(0, pd.wideT - dt); s.slowT = Math.max(0, s.slowT - dt); pd.w = pd.wideT > 0 ? 64 : 40;
  pd.x = clamp(pd.x + ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * 230 * dt, X0 + pd.w / 2, X1 - pd.w / 2);
  s.serveT -= dt;
  if (s.inu) { s.smashCd = Math.max(0, s.smashCd - dt); s.fetchT = Math.max(0, s.fetchT - dt); s.stormT = Math.max(0, s.stormT - dt);
    if (inp.a && s.smashCd <= 0 && !s.balls.some((b) => b.stuck)) { s.smashCd = SMASH.cd; s.stats.smashes++; s.smash = { x: pd.x, y: PY - 4 }; s.ev.push('bark'); }
    if (s.smash) { s.smash.y -= 320 * dt; const box = { x: s.smash.x - 3, y: s.smash.y, w: 6, h: 8 }; const k = s.bricks.find((b) => aabb(box, b)); if (k) { damage(s, k, 2); s.smash = null; } else if (s.smash.y < TOP) s.smash = null; }
    for (const k of s.bricks) if (k.boss) { k.x += k.vx * dt; if (k.x < X0 + 2 || k.x + k.w > X1 - 2) k.vx *= -1; } }
  for (const b of s.balls) if (b.stuck) { b.x = pd.x + (b.off || 0); b.y = PY - 5; if (inp.a || inp.up || s.serveT <= 0) { launch(s, b); s.smashCd = Math.max(s.smashCd, 0.3); } }
  // sub-step for robust collisions
  const n = 4; for (let k = 0; k < n; k++) for (const b of s.balls) if (!b.stuck) moveBall(s, b, dt / n);
  const before = s.balls.length; s.balls = s.balls.filter((b) => b.y < H + 6);
  if (!s.balls.length) { s.lives--; s.ev.push('die'); s.flash = 1; s.shake = 0.4; s.stats.rally = 0; s.fetchT = 0; s.stormT = 0; if (s.lives <= 0) { s.over = true; return; } pd.wideT = 0; s.slowT = 0; s.caps = []; serve(s); }
  for (const c of s.caps) c.y += 60 * dt;
  const pbox = { x: pd.x - pd.w / 2, y: PY, w: pd.w, h: 5 };
  for (const c of s.caps) if (!c.got && aabb({ x: c.x - 6, y: c.y - 3, w: 12, h: 6 }, pbox)) { c.got = true; applyPower(s, c.kind); }
  s.caps = s.caps.filter((c) => !c.got && c.y < H);
  if (!s.bricks.length) { s.level++; s.score += 250 * (s.level - 1); s.ev.push('level'); layout(s); }
}
export function applyPower(s, kind) {
  s.ev.push('pow'); s.score += 25; s.lastPow = { kind, t: 1.2 };
  if (kind === 'fetch') s.fetchT = 10; if (kind === 'storm') s.stormT = 6;
  s.pops.push({ x: s.paddle.x, y: PY - 14, text: { wide: 'BIG BONE!', multi: 'PUP PACK!', slow: 'SLOW-MO!', life: 'EXTRA PUP!', fetch: 'FETCH!', storm: 'BONE STORM!' }[kind], c: '#f2c14e', t: 1.2 });
  if (kind === 'wide') s.paddle.wideT = 12; if (kind === 'slow') { s.slowT = 10; renorm(s); } if (kind === 'life') s.lives = Math.min(5, s.lives + 1);
  if (kind === 'multi') { const src = s.balls.find((b) => !b.stuck) || s.balls[0]; for (const a of [-0.5, 0.5]) { const sp = ballSpeed(s); s.balls.push({ x: src.x, y: src.y, vx: sp * Math.sin(a), vy: -sp * Math.cos(a), stuck: false }); } }
}
function renorm(s) { const sp = ballSpeed(s); for (const b of s.balls) if (!b.stuck) { const m = Math.hypot(b.vx, b.vy) || 1; b.vx *= sp / m; b.vy *= sp / m; } }
export function moveBall(s, b, dt) {
  b.x += b.vx * dt; b.y += b.vy * dt; const R = 2;
  if (b.x - R < X0) { b.x = X0 + R; b.vx = Math.abs(b.vx); s.ev.push('bounce'); } if (b.x + R > X1) { b.x = X1 - R; b.vx = -Math.abs(b.vx); s.ev.push('bounce'); }
  if (b.y - R < TOP) { b.y = TOP + R; b.vy = Math.abs(b.vy); s.ev.push('bounce'); }
  const pd = s.paddle;
  if (b.vy > 0 && b.y + R >= PY && b.y + R <= PY + 6 && b.x >= pd.x - pd.w / 2 - R && b.x <= pd.x + pd.w / 2 + R) {
    const rel = clamp((b.x - pd.x) / (pd.w / 2), -1, 1), ang = rel * 1.05, sp = ballSpeed(s); b.vx = sp * Math.sin(ang); b.vy = -sp * Math.cos(ang); b.y = PY - R; s.ev.push('bounce'); s.stats.rally++; s.stats.maxRally = Math.max(s.stats.maxRally, s.stats.rally);
    if (s.fetchT > 0) { b.stuck = true; b.off = b.x - pd.x; s.serveT = 1.5; }
  }
  const box = { x: b.x - R, y: b.y - R, w: 2 * R, h: 2 * R };
  const hit = s.bricks.find((k) => aabb(box, k)); if (!hit) return;
  const ox = Math.min(box.x + box.w - hit.x, hit.x + hit.w - box.x), oy = Math.min(box.y + box.h - hit.y, hit.y + hit.h - box.y);
  const pierce = s.stormT > 0 && !hit.boss;
  if (!pierce) { if (ox < oy) { b.vx = -b.vx; b.x += b.vx > 0 ? ox : -ox; } else { b.vy = -b.vy; b.y += b.vy > 0 ? oy : -oy; } }
  damage(s, hit, pierce ? 9 : 1);
}
function damage(s, hit, d) {
  hit.hp -= d; if (hit.hp > 0) { s.ev.push('bounce'); if (hit.boss) fx(s, hit.x + hit.w / 2, hit.y + hit.h, '#ff5d73', 5); return; }
  s.bricks.splice(s.bricks.indexOf(hit), 1);
  if (hit.boss) { s.score += BOSS_PTS; s.stats.bosses++; s.shake = 0.5; fx(s, hit.x + hit.w / 2, hit.y + hit.h / 2, '#f2c14e', 40); pop(s, hit.x, hit.y + 10, 'FUD BOT DOWN +500', '#f2c14e'); s.ev.push('boom'); return; }
  s.score += 10 * (BR - hit.r); s.ev.push('brick'); fx(s, hit.x + BW / 2, hit.y + BH / 2, ['#ff5d73', '#f0a030', '#f2c14e', '#5fd37a', '#4fc3e8', '#9b59d6'][hit.r], 7); if (hit.power) s.caps.push({ x: hit.x + BW / 2, y: hit.y + BH, kind: hit.power });
}
export const ghostPos = (s) => ({ x: s.paddle.x, y: PY + 2 });
export function bot(s) {
  if (s.inu && s.smashCd <= 0 && s.balls.some((b) => !b.stuck && b.vy < 0) && Math.sin(s.t * 7) > 0.9) return { a: true };
  const pd = s.paddle; const cap = s.caps.find((c) => c.y > 150);
  const live = s.balls.filter((b) => !b.stuck && b.vy > 0).sort((a, b) => b.y - a.y)[0];
  let tx = live ? live.x : cap ? cap.x : (X0 + X1) / 2 + Math.sin(s.t) * 60;
  if (live) { // predict landing x with wall reflections
    let x = live.x + live.vx * ((PY - live.y) / Math.max(1, live.vy)); const w = X1 - X0; x -= X0; x = ((x % (2 * w)) + 2 * w) % (2 * w); if (x > w) x = 2 * w - x; tx = X0 + x + Math.sin(s.t * 3) * 6; }
  return { left: tx < pd.x - 3, right: tx > pd.x + 3, a: s.balls.some((b) => b.stuck) };
}
// ---------- render ----------
const ROWC = ['#ff5d73', '#f0a030', '#f2c14e', '#5fd37a', '#4fc3e8', '#9b59d6'];
const PCOL = { wide: '#5fd37a', multi: '#f2c14e', slow: '#4fc3e8', life: '#ff5d73', fetch: '#e0802c', storm: '#fbf1e0' }, PLET = { wide: 'W', multi: 'M', slow: 'S', life: '+', fetch: 'F', storm: '⚡' };
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#0b0820'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#16123a'; ctx.fillRect(X0, TOP, X1 - X0, H - TOP);
  ctx.fillStyle = '#6a52c4'; ctx.fillRect(X0 - 4, TOP - 4, 4, H); ctx.fillRect(X1, TOP - 4, 4, H); ctx.fillRect(X0 - 4, TOP - 4, X1 - X0 + 8, 4);
  for (const k of s.bricks) if (k.boss) { ctx.fillStyle = '#2a2a3a'; ctx.fillRect(k.x, k.y, k.w, k.h); ctx.fillStyle = '#ff3040'; const bl = Math.floor(now * 3) % 4 ? 3 : 1; ctx.fillRect(k.x + 18, k.y + 5, 6, bl); ctx.fillRect(k.x + k.w - 24, k.y + 5, 6, bl); ctx.fillStyle = '#8a8aa0'; ctx.fillRect(k.x + 20, k.y + 12, k.w - 40, 2); ctx.fillStyle = '#ff5d73'; ctx.fillRect(k.x, k.y - 3, k.w * k.hp / k.max, 2); ctx.font = '6px Silkscreen, monospace'; ctx.fillStyle = '#ff5d73'; ctx.fillText('FUD', k.x + 2, k.y + 7); }
  if (s.smash) P.blitC(ctx, P.bone(), s.smash.x, s.smash.y);
  if (s.inu) { ctx.fillStyle = '#222'; ctx.fillRect(4, 206, 30, 4); ctx.fillStyle = s.smashCd <= 0 ? '#7ef0ff' : '#3a6a80'; ctx.fillRect(4, 206, 30 * (1 - s.smashCd / SMASH.cd), 4); ctx.font = '7px Silkscreen, monospace'; ctx.fillStyle = '#7ef0ff'; ctx.fillText('SMASH', 4, 203); if (s.stormT > 0) { ctx.fillStyle = '#fbf1e0'; ctx.fillText('STORM ' + s.stormT.toFixed(0), 4, 193); } if (s.fetchT > 0) { ctx.fillStyle = '#e0802c'; ctx.fillText('FETCH ' + s.fetchT.toFixed(0), 4, 183); } }
  for (const k of s.bricks) { if (k.boss) continue; const c = ROWC[k.r]; ctx.fillStyle = k.hp > 1 ? '#c0c0d0' : c; ctx.fillRect(k.x, k.y, k.w, k.h); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(k.x, k.y, k.w, 2); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(k.x, k.y + k.h - 2, k.w, 2);
    if (k.power) { ctx.fillStyle = '#fff'; ctx.fillRect(k.x + k.w / 2 - 1, k.y + 3, 2, 2); } }
  for (const c of s.caps) { ctx.fillStyle = PCOL[c.kind]; ctx.fillRect(c.x - 7, c.y - 4, 14, 8); ctx.fillStyle = '#1a1424'; ctx.font = 'bold 7px monospace'; ctx.fillText(PLET[c.kind], c.x - 2, c.y + 3); }
  const pd = s.paddle; ctx.fillStyle = '#fbf1e0'; ctx.fillRect(pd.x - pd.w / 2, PY, pd.w, 5); ctx.fillStyle = '#e0802c'; ctx.fillRect(pd.x - pd.w / 2, PY + 3, pd.w, 3);
  ctx.fillStyle = '#c88a3c'; ctx.fillRect(pd.x - pd.w / 2 - 3, PY - 1, 4, 7); ctx.fillRect(pd.x + pd.w / 2 - 1, PY - 1, 4, 7);
  P.blitC(ctx, P.shibaHead(), pd.x, PY + 12);
  for (const b of s.balls) { if (s.stormT > 0) { ctx.fillStyle = 'rgba(255,240,200,.35)'; ctx.fillRect(b.x - 4, b.y - 4, 8, 8); } ctx.fillStyle = '#c8f04e'; ctx.fillRect(b.x - 2, b.y - 2, 4, 4); ctx.fillStyle = '#fff'; ctx.fillRect(b.x - 1, b.y - 2, 1, 4); }
  if (false) { ctx.fillStyle = PCOL[s.lastPow.kind]; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText({ wide: 'BIG PADDLE!', multi: 'MULTI-BALL!', slow: 'SLOW-MO!', life: 'EXTRA PUP!' }[s.lastPow.kind], 192, 140); ctx.textAlign = 'left'; }
  if (s.balls.some((b) => b.stuck)) { ctx.fillStyle = '#f2c14e'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText('PRESS A / SPACE TO SERVE', 192, 150); ctx.textAlign = 'left'; }
}
