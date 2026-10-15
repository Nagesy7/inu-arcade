// BONE BREAKER — original Inu paddle-and-ball (224x256 native). Classic mode = classic-difficulty rules on Inu's own
// design: 3 hand-drawn bone-yard screens of 12-wide crates (tough top crates take 2 hits), crate values by height
// 1..6, the ball speeds up every 10 paddle returns and the first time you dig into the top two rows, the paddle
// wears down 2px per 20 crates (min 16), continuous paddle angles up to 62 degrees.
import { rng, clamp } from '../core/rng.js';
export const META = { id: 'bone-breaker', title: 'BONE BREAKER', color: '#4fc3e8', blurb: 'Three bone-yard crate walls. Long rallies and deep digs speed the ball up, and your paddle wears down as you smash.', controls: 'Left/Right to move, Space / A to serve', inuMove: 'BONE SMASH (A): fire a bone through the wall, 6s cooldown. Bone power-ups (Fetch, Bone Storm, Big Bone, Pup Pack) and a FUD-bot boss brick each screen.', classicNote: 'Original Inu rules at classic difficulty.' };
export const W = 224, H = 256, X0 = 7, X1 = 217, TOP = 24, PY = 232, COLS = 12, ROWS = 7, STRIDE = 17.4, BW = 16, BH = 7, ROW0 = 50;
export const ROW_PTS = [6, 5, 4, 3, 2, 2, 1], ROW_COLOR = ['#c85ad8', '#4fc3e8', '#5fd37a', '#f2d84e', '#f08a2a', '#f08a2a', '#e8d8c0'], ROW_NAME = ['violet', 'sky', 'grass', 'sun', 'clay', 'clay', 'bone'];
// three original screens ('#' crate, 'T' tough crate = 2 hits, '.' gap); rows top to bottom
export const SCREEN_MAPS = [
  ['TTTTTTTTTTTT', '############', '##.######.##', '############', '############', '.##########.', '############'],
  ['..TTTTTTTT..', '.##########.', '###.####.###', '############', '###.####.###', '.##########.', '..########..'],
  ['TT..TTTT..TT', '############', '#.##.##.##.#', '############', '##.##..##.##', '############', '############']];
export const SCREENS = 3;
const mapPts = (m) => m.reduce((a, row, r) => a + [...row].filter((ch) => ch !== '.').length * ROW_PTS[r], 0);
export const MAX_SCORE = SCREEN_MAPS.reduce((a, m) => a + mapPts(m), 0);
export const SPEEDS = [1.6, 2.0, 2.4, 2.8, 3.2]; // px/frame per speed level
export const RALLY_STEP = 10, DEEP_ROWS = 2; // speed up every 10 paddle returns, and once on first contact with the top 2 rows
export const PADDLE_W = 24, PADDLE_MIN = 16, WEAR = { every: 20, px: 2 };
export const MAX_ANGLE = 62; // degrees from vertical at the paddle tip, linear in between
export const POWERS_INU = ['wide', 'multi', 'fetch', 'storm', 'life'], SMASH = { cd: 6 }, BOSS_PTS = 500;
const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y, c, n }), pop = (s, x, y, text, c = '#7ef0ff') => s.pops.push({ x, y, text, c, t: 1 });
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, screen: 1, over: false, t: 0, ev: [], fx: [], pops: [], shake: 0, flash: 0, acc: 0, frame: 0,
    hits: 0, broken: 0, returns: 0, speedLvl: 0, deep: false, smashCd: 0, smash: null, fetchT: 0, stormT: 0, wideT: 0, caps: [], stats: { bosses: 0, smashes: 0, maxRally: 0, rally: 0 } };
  s.paddle = { x: 112 }; layout(s); serve(s); return s;
}
function layout(s) {
  s.bricks = []; const map = SCREEN_MAPS[(s.screen - 1) % SCREEN_MAPS.length];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const ch = map[r][c]; if (ch === '.') continue; const i = r * COLS + c;
    s.bricks.push({ r, c, x: X0 + 2 + c * STRIDE, y: ROW0 + r * (BH + 1), w: BW, h: BH, hp: ch === 'T' ? 2 : 1, tough: ch === 'T', power: s.inu && (i + s.screen) % 9 === 0 ? POWERS_INU[(i >> 1) % POWERS_INU.length] : null }); }
  if (s.inu) { const hp = 8 + s.screen * 4; s.bricks.push({ r: -1, c: 6, x: 90, y: 32, w: 44, h: 12, hp, max: hp, boss: true, vx: 0.5 }); }
}
function serve(s) { s.balls = [{ x: 112, y: 140, vx: 0, vy: 0, stuck: true }]; s.serveT = 120; s.speedLvl = 0; s.returns = 0; s.deep = false; }
export const paddleW = (s) => (s.wideT > 0 ? 40 : Math.max(PADDLE_MIN, PADDLE_W - WEAR.px * Math.floor(s.broken / WEAR.every)));
export const ballSpeed = (s) => SPEEDS[s.speedLvl] * (s.slowT > 0 ? 0.7 : 1);
export function speedUp(s, why) { if (s.speedLvl < SPEEDS.length - 1) { s.speedLvl++; renorm(s); s.ev.push('pow'); } s.lastSpeedUp = why; }
function renorm(s) { const sp = ballSpeed(s); for (const b of s.balls) if (!b.stuck) { const m = Math.hypot(b.vx, b.vy) || 1; b.vx *= sp / m; b.vy *= sp / m; } }
function launch(s, b) { b.stuck = false; const dir = s.rnd() < 0.5 ? -1 : 1, a = (45 * Math.PI) / 180, sp = ballSpeed(s); b.x = 40 + s.rnd() * 144; b.y = 140; b.vx = dir * sp * Math.sin(a); b.vy = sp * Math.cos(a); s.ev.push('bounce'); }
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.flash = Math.max(0, s.flash - dt); s.shake = Math.max(0, s.shake - dt); s.inp = inp;
  if (s.inu) { s.smashCd = Math.max(0, s.smashCd - dt); s.fetchT = Math.max(0, s.fetchT - dt); s.stormT = Math.max(0, s.stormT - dt); s.wideT = Math.max(0, s.wideT - dt); }
  s.acc += dt * 60; while (s.acc >= 1 && !s.over) { s.acc -= 1; frame(s); }
}
function frame(s) {
  s.frame++; s.t += 1 / 60; const inp = s.inp || {}, pd = s.paddle, pw = paddleW(s);
  pd.x = clamp(pd.x + ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * 3, X0 + pw / 2, X1 - pw / 2);
  const stuck = s.balls.some((b) => b.stuck);
  if (stuck) { if (s.serveT > 0) s.serveT--; for (const b of s.balls) if (b.stuck && b.caught) { b.x = pd.x + b.off; b.y = PY - 3; } if (inp.a || inp.up || (s.inu && s.serveT <= 0 && s.balls.some((b) => b.caught))) for (const b of s.balls) if (b.stuck) { if (b.caught) { b.caught = false; b.stuck = false; const sp = ballSpeed(s); b.vx = sp * 0.5; b.vy = -sp * 0.86; } else launch(s, b); s.smashCd = Math.max(s.smashCd, 0.3); } }
  else if (s.inu && inp.a && s.smashCd <= 0) { s.smashCd = SMASH.cd; s.stats.smashes++; s.smash = { x: pd.x, y: PY - 4 }; s.ev.push('bark'); }
  if (s.smash) { s.smash.y -= 5; const bx = { x: s.smash.x - 3, y: s.smash.y, w: 6, h: 8 }; const k = s.bricks.find((b) => ov(bx, b)); if (k) { damage(s, k, 2); s.smash = null; } else if (s.smash.y < TOP) s.smash = null; }
  for (const k of s.bricks) if (k.boss) { k.x += k.vx; if (k.x < X0 + 2 || k.x + k.w > X1 - 2) k.vx *= -1; }
  for (const b of s.balls) if (!b.stuck) { const sp = Math.hypot(b.vx, b.vy), n = Math.ceil(sp); for (let i = 0; i < n; i++) moveBall(s, b, 1 / n); }
  s.balls = s.balls.filter((b) => b.y < H + 4);
  if (!s.balls.length) { s.lives--; s.ev.push('die'); s.flash = 1; s.shake = 0.4; s.stats.rally = 0; s.fetchT = 0; s.stormT = 0; s.wideT = 0; s.caps = []; if (s.lives <= 0) { s.over = true; return; } serve(s); }
  for (const c of s.caps) c.y += 1; const pbox = { x: pd.x - pw / 2, y: PY, w: pw, h: 4 };
  for (const c of s.caps) if (!c.got && ov({ x: c.x - 6, y: c.y - 3, w: 12, h: 6 }, pbox)) { c.got = true; applyPower(s, c.kind); } s.caps = s.caps.filter((c) => !c.got && c.y < H);
  if (!s.bricks.some((b) => !b.boss) && !s.bricks.some((b) => b.boss)) nextScreen(s);
}
function nextScreen(s) { if (s.screen >= SCREENS && !s.inu) { s.over = true; s.perfect = true; s.ev.push('level'); return; } s.screen++; s.level = s.screen; s.ev.push('level'); layout(s); pop(s, 112, 140, 'SCREEN ' + s.screen, '#f2c14e'); for (const b of s.balls) { b.y = 150; b.vy = Math.abs(b.vy); } }
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export function moveBall(s, b, f) {
  b.x += b.vx * f; b.y += b.vy * f; const R = 1.5, pd = s.paddle, pw = paddleW(s);
  if (b.x - R < X0) { b.x = X0 + R; b.vx = Math.abs(b.vx); s.ev.push('bounce'); } if (b.x + R > X1) { b.x = X1 - R; b.vx = -Math.abs(b.vx); s.ev.push('bounce'); }
  if (b.y - R < TOP) { b.y = TOP + R; b.vy = Math.abs(b.vy); s.ev.push('bounce'); }
  if (b.vy > 0 && b.y + R >= PY && b.y + R <= PY + 4 && b.x >= pd.x - pw / 2 - R && b.x <= pd.x + pw / 2 + R) {
    const off = clamp((b.x - pd.x) / (pw / 2), -1, 1), a = (off * MAX_ANGLE * Math.PI) / 180, sp = ballSpeed(s);
    b.vx = sp * Math.sin(a); b.vy = -sp * Math.cos(a); b.y = PY - R; s.ev.push('bounce'); s.stats.rally++; s.stats.maxRally = Math.max(s.stats.maxRally, s.stats.rally); if (++s.returns % RALLY_STEP === 0) speedUp(s, 'rally');
    if (s.fetchT > 0) { b.stuck = true; b.caught = true; b.off = b.x - pd.x; s.serveT = 90; } return; }
  const bx = { x: b.x - R, y: b.y - R, w: 2 * R, h: 2 * R }; const hit = s.bricks.find((k) => ov(bx, k)); if (!hit) return;
  const pierce = s.stormT > 0 && !hit.boss;
  if (!pierce) { const ox = Math.min(bx.x + bx.w - hit.x, hit.x + hit.w - bx.x), oy = Math.min(bx.y + bx.h - hit.y, hit.y + hit.h - bx.y); if (ox < oy) { b.vx = -b.vx; b.x += b.vx > 0 ? ox : -ox; } else { b.vy = -b.vy; b.y += b.vy > 0 ? oy : -oy; } }
  damage(s, hit, pierce ? 9 : 1);
}
function damage(s, hit, d) {
  if (!hit.boss && hit.r < DEEP_ROWS && !s.deep) { s.deep = true; speedUp(s, 'deep'); }
  hit.hp -= d; if (hit.hp > 0) { s.ev.push('bounce'); if (hit.boss) fx(s, hit.x + hit.w / 2, hit.y + hit.h, '#ff5d73', 5); return; }
  s.bricks.splice(s.bricks.indexOf(hit), 1);
  if (hit.boss) { s.score += BOSS_PTS; s.stats.bosses++; s.shake = 0.5; fx(s, hit.x + hit.w / 2, hit.y + 6, '#f2c14e', 40); pop(s, hit.x + 22, hit.y + 10, 'FUD BOT DOWN +500', '#f2c14e'); s.ev.push('boom'); return; }
  s.score += ROW_PTS[hit.r]; s.hits++; s.broken++; s.ev.push('brick'); fx(s, hit.x + BW / 2, hit.y + BH / 2, ROW_COLOR[hit.r], 6); if (hit.power) s.caps.push({ x: hit.x + BW / 2, y: hit.y + BH, kind: hit.power });
}
export function applyPower(s, kind) {
  s.ev.push('pow'); s.score += 0; s.pops.push({ x: s.paddle.x, y: PY - 14, text: { wide: 'BIG BONE!', multi: 'PUP PACK!', life: 'EXTRA PUP!', fetch: 'FETCH!', storm: 'BONE STORM!' }[kind], c: '#f2c14e', t: 1.2 });
  if (kind === 'wide') s.wideT = 12; if (kind === 'fetch') s.fetchT = 10; if (kind === 'storm') s.stormT = 6; if (kind === 'life') s.lives = Math.min(5, s.lives + 1);
  if (kind === 'multi') { const src = s.balls.find((b) => !b.stuck) || s.balls[0]; for (const a of [-0.5, 0.5]) { const sp = ballSpeed(s); s.balls.push({ x: src.x, y: src.y, vx: sp * Math.sin(a), vy: -sp * Math.cos(a), stuck: false }); } }
}
export function bot(s) {
  const pd = s.paddle; if (s.balls.some((b) => b.stuck)) return { a: s.frame % 30 === 0 };
  const live = s.balls.filter((b) => b.vy > 0).sort((a, b) => b.y - a.y)[0]; let tx = 112;
  if (live) { let x = live.x + live.vx * ((PY - live.y) / Math.max(0.1, live.vy)); const w = X1 - X0; x -= X0; x = ((x % (2 * w)) + 2 * w) % (2 * w); if (x > w) x = 2 * w - x; tx = X0 + x + (paddleW(s) / 4) * Math.sin(s.frame / 50); }
  const out = { left: tx < pd.x - 1.5, right: tx > pd.x + 1.5 }; if (s.inu && s.smashCd <= 0 && s.frame % 97 === 0) out.a = true; return out;
}
export const ghostPos = (s) => ({ x: s.paddle.x, y: PY + 2 });
// ---------- render ----------
const PCOL = { wide: '#5fd37a', multi: '#f2c14e', life: '#ff5d73', fetch: '#e0802c', storm: '#fbf1e0' }, PLET = { wide: 'B', multi: 'P', life: '+', fetch: 'F', storm: 'S' };
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#05040d'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#9a9ab0'; ctx.fillRect(X0 - 4, TOP - 4, 4, H - TOP + 4); ctx.fillRect(X1, TOP - 4, 4, H - TOP + 4); ctx.fillRect(X0 - 4, TOP - 4, X1 - X0 + 8, 4);
  for (const k of s.bricks) { if (k.boss) { ctx.fillStyle = '#23233a'; ctx.fillRect(k.x, k.y, k.w, k.h); ctx.fillStyle = '#ff3040'; ctx.fillRect(k.x + 10, k.y + 4, 4, 2); ctx.fillRect(k.x + k.w - 14, k.y + 4, 4, 2); ctx.fillStyle = '#ff5d73'; ctx.fillRect(k.x, k.y - 2, k.w * k.hp / k.max, 1); continue; }
    ctx.fillStyle = ROW_COLOR[k.r]; ctx.fillRect(k.x, k.y, k.w, k.h); if (k.tough) { ctx.fillStyle = k.hp > 1 ? '#6a4a8a' : '#a88ac8'; ctx.fillRect(k.x + 1, k.y + 3, k.w - 2, 1); } ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(k.x, k.y, k.w, 1); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(k.x, k.y + k.h - 1, k.w, 1); if (k.power) { ctx.fillStyle = '#fff'; ctx.fillRect(k.x + 6, k.y + 2, 2, 2); } }
  for (const c of s.caps) { ctx.fillStyle = PCOL[c.kind]; ctx.fillRect(c.x - 4, c.y - 2, 8, 4); ctx.fillRect(c.x - 7, c.y - 4, 4, 3); ctx.fillRect(c.x - 7, c.y + 1, 4, 3); ctx.fillRect(c.x + 3, c.y - 4, 4, 3); ctx.fillRect(c.x + 3, c.y + 1, 4, 3); /* bone-shaped pickup, not a capsule */ ctx.fillStyle = '#14101c'; ctx.font = '6px Silkscreen, monospace'; ctx.fillText(PLET[c.kind], c.x - 2, c.y + 2); }
  if (s.smash) { ctx.fillStyle = '#fbf1e0'; ctx.fillRect(s.smash.x - 1, s.smash.y, 2, 7); ctx.fillRect(s.smash.x - 2, s.smash.y, 4, 2); ctx.fillRect(s.smash.x - 2, s.smash.y + 6, 4, 2); }
  const pd = s.paddle, pw = paddleW(s); ctx.fillStyle = '#f6ead6'; ctx.fillRect(pd.x - pw / 2, PY, pw, 4); ctx.fillStyle = '#e8892e'; ctx.fillRect(pd.x - pw / 2, PY + 2, pw, 2);
  for (const b of s.balls) { if (s.stormT > 0) { ctx.fillStyle = 'rgba(255,240,200,.35)'; ctx.fillRect(b.x - 3, b.y - 3, 6, 6); } ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(b.x - 1.5), Math.round(b.y - 1.5), 3, 3); }
  if (s.balls.some((b) => b.stuck && !b.caught) && Math.floor(now * 2) % 2) { ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#f2c14e'; ctx.textAlign = 'center'; ctx.fillText('SERVE: A / SPACE', 112, 170); ctx.textAlign = 'left'; }
  ctx.font = '7px Silkscreen, monospace'; ctx.fillStyle = '#8a8aa0'; ctx.fillText('SCREEN ' + s.screen + '/' + (s.inu ? '∞' : SCREENS) + '  SPEED ' + (s.speedLvl + 1), 8, H - 4);
  if (s.inu) { ctx.fillStyle = s.smashCd <= 0 ? '#7ef0ff' : '#3a6a80'; ctx.fillRect(150, H - 9, 60 * (1 - s.smashCd / SMASH.cd), 3); }
}
