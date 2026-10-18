// FUD Swarm (working name; rename via NAME). Original Inu survival field: one Shiba holds the meadow against endless waves
// of FUD bots. Your treats-and-tricks fire on their own; you steer, dash and pick an upgrade every level. Original Inu
// design: names, bots, upgrades, art and music are all Inu-made.
// Perf: every moving thing lives in a fixed-size pool (no per-frame allocation), enemies are capped, and hits use a
// coarse spatial grid, so a frame stays cheap with 150 bots on screen.
import { rng } from '../core/rng.js';
export const NAME = 'FUD Swarm';
export const META = { id: 'fud-swarm', title: NAME.toUpperCase(), short: 'FUD', color: '#9b6dff', buttons: 2, music: 'fud',
  verse: { district: 'fud-field', spawn: 'door-fud-swarm' },
  blurb: 'Hold the meadow against endless FUD bots. Your tricks fire on their own: steer, dash, and pick an upgrade every level.',
  controls: 'Move: arrows / stick · attacks fire automatically · A (Space/Z) Zoom Dash (dodges through bots) · B (X/K) Big Bark when the meter is full · level up: left/right + A to pick',
  inuMove: 'HODL HOWL: in Inu Mode a full-meter Big Bark also gives you a 3 s HODL shield (no damage, and bots that touch you pop). Elite bots and bosses drop $KIBBLE coins (+500).',
  classicNote: 'Pure survival: the bots get tougher every minute and a boss arrives every 3 minutes. How long can you hold?' };
export const W = 256, H = 256, OY = 20, HB = 10, AY = OY + HB, VH = H - AY, FW = 768, FH = 768;
// ---------- tables (all original) ----------
export const CAP = { enemies: 150, crumbs: 220, shots: 64, spam: 60, mines: 8, zones: 24, items: 16 };
export const FOES = {
  drone: { name: 'DOUBT DRONE', hp: 10, spd: 0.55, dmg: 6, xp: 1, pts: 10, r: 6 },
  roller: { name: 'RUG ROLLER', hp: 8, spd: 1.2, dmg: 8, xp: 1, pts: 15, r: 6 },
  paper: { name: 'PAPER HANDS', hp: 42, spd: 0.34, dmg: 10, xp: 3, pts: 40, r: 8 },
  shill: { name: 'SHILL SPAMMER', hp: 18, spd: 0.45, dmg: 6, xp: 3, pts: 40, r: 7 },
  bear: { name: 'BEAR BOT', hp: 170, spd: 0.4, dmg: 16, xp: 10, pts: 200, r: 11, elite: true },
  whale: { name: 'FUD WHALE', hp: 900, spd: 0.42, dmg: 20, xp: 40, pts: 2500, r: 18, boss: true },
  dump: { name: 'THE GREAT DUMP', hp: 1900, spd: 0.4, dmg: 24, xp: 60, pts: 5000, r: 18, boss: true },
  king: { name: 'KING FUD', hp: 3400, spd: 0.38, dmg: 26, xp: 90, pts: 7500, r: 20, boss: true } };
export const BOSS_ORDER = ['whale', 'dump', 'king'], BOSS_EVERY = 180; // seconds
export const WEAPONS = {
  bark: { name: 'BARK RING', desc: 'Shockwave around you', max: 5 },
  bone: { name: 'BONE TOSS', desc: 'Throws bones at the nearest bot', max: 5 },
  orbit: { name: 'KIBBLE ORBIT', desc: 'Kibbles circle you', max: 5 },
  gaze: { name: 'LASER GAZE', desc: 'Beam through a line of bots', max: 5 },
  paw: { name: 'PAW MINES', desc: 'Drops paw-print mines', max: 5 },
  tail: { name: 'TAIL WHIP', desc: 'Swipes in front of you', max: 5 } };
export const PASSIVES = {
  coat: { name: 'THICK COAT', desc: '+20 max HP, heal 20', max: 5 },
  zoom: { name: 'ZOOMIES', desc: '+8% move speed', max: 5 },
  nose: { name: 'BIG NOSE', desc: '+35% pickup range', max: 5 },
  teeth: { name: 'SHARP TEETH', desc: '+12% damage', max: 5 },
  paws: { name: 'QUICK PAWS', desc: '-8% trick cooldowns', max: 5 },
  good: { name: 'GOOD PUP', desc: 'Regen +0.5 HP/s', max: 5 } };
export const MAX_W = 4, MAX_P = 4, LIVES = 2;
export const PTS = { sec: 10, overtimeSec: 20, level: 100, crumb: 2, coin: 500, treat: 50 };
// weapon stats by level (1-based)
export const WSTAT = {
  bark: (l) => ({ cd: 74 - l * 6, r: 30 + l * 6, dmg: 7 + l * 3 }),
  bone: (l) => ({ cd: 54 - l * 3, n: l >= 4 ? 3 : l >= 2 ? 2 : 1, dmg: 12 + l * 3, pierce: 1 + (l >> 1), speed: 3.2 }),
  orbit: (l) => ({ n: 1 + l, r: 24 + l * 2, dmg: 6 + l * 1.5, spin: 0.055 + l * 0.005 }),
  gaze: (l) => ({ cd: 96 - l * 9, len: 120 + l * 10, dmg: 14 + l * 5 }),
  paw: (l) => ({ cd: 84 - l * 6, r: 26 + l * 2, dmg: 22 + l * 6, max: 3 + l }),
  tail: (l) => ({ cd: 48 - l * 3, r: 40 + l * 3, dmg: 10 + l * 3 }) };
export const need = (L) => 4 + 3 * L + Math.floor(L * L * 0.35);
export const minutes = (s) => s.t / 60;
export const hpMul = (m) => 1 + 0.22 * m + (m > 10 ? 0.5 * (m - 10) : 0);
export const spdMul = (m) => Math.min(1.4, 1 + 0.03 * m);
export const targetCount = (m) => Math.min(CAP.enemies - 10, Math.floor(10 + 7 * m + 1.6 * m * m));
// ---------- pools (fixed objects, swap-remove; nothing allocated per frame) ----------
function pool(n, mk) { return { a: Array.from({ length: n }, mk), n: 0, cap: n }; }
function take(P) { return P.n < P.cap ? P.a[P.n++] : null; }
function drop(P, i) { const o = P.a[i]; P.a[i] = P.a[P.n - 1]; P.a[P.n - 1] = o; P.n--; }
const mkE = () => ({ uid: 0, type: 'drone', x: 0, y: 0, hp: 0, max: 0, spd: 0, r: 6, flash: 0, kx: 0, ky: 0, t: 0, st: 0, dx: 0, dy: 0, orbCd: 0, boss: false, elite: false });
const mkX = () => ({ x: 0, y: 0, v: 1, fly: false });
const mkS = () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, dmg: 0, pierce: 0, hit: [0, 0, 0, 0, 0, 0], nh: 0 });
const mkM = () => ({ x: 0, y: 0, life: 0 });
const mkZ = () => ({ kind: 'ring', x: 0, y: 0, x2: 0, y2: 0, r: 0, t: 0, len: 1, c: 0 });
const mkI = () => ({ kind: 'treat', x: 0, y: 0, t: 0 });
// ---------- field ----------
export const TREES = [[120, 140], [610, 120], [250, 300], [520, 330], [140, 560], [640, 600], [380, 180], [380, 600], [90, 360], [690, 380], [300, 470], [470, 480]].map(([x, y]) => ({ x, y, r: 11 }));
export const FENCE = 20; // playable area is FENCE..FW-FENCE
// ---------- state ----------
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, seed, rnd: rng(seed), score: 0, lives: LIVES, level: 1, over: false, t: 0, frame: 0, ev: [], fx: [], pops: [], shake: 0, flash: 0,
    phase: 'ready', phaseT: 90, prev: {}, uid: 1, spawnT: 0, nextBoss: BOSS_EVERY, bossN: 0, swarmT: 75, warn: 0, warnText: '', acc: 0, fxBudget: 0,
    p: { x: FW / 2, y: FH / 2, hp: 100, maxHp: 100, fx: 1, fy: 0, inv: 60, dashF: 0, dashCd: 0, dx: 0, dy: 0, lvl: 1, xp: 0, meter: 0, shield: 0, anim: 0, hurtF: 0 },
    cam: { x: FW / 2 - W / 2, y: FH / 2 - VH / 2 }, wep: { bark: 1 }, pas: {}, cd: { bark: 30, bone: 0, gaze: 0, paw: 0, tail: 0 }, orbA: 0, choice: null, boss: null,
    E: pool(CAP.enemies, mkE), X: pool(CAP.crumbs, mkX), S: pool(CAP.shots, mkS), Q: pool(CAP.spam, mkS), M: pool(CAP.mines, mkM), Z: pool(CAP.zones, mkZ), I: pool(CAP.items, mkI),
    grid: Array.from({ length: GC * GC }, () => []),
    stats: { kills: 0, bosses: 0, maxLvl: 1, dashes: 0, barks: 0, howls: 0, coins: 0, treats: 0, secs: 0, weapons: 1, revives: 0, maxOnScreen: 0, crumbs: 0 } };
  return s; }
const GS = 32, GC = FW / GS;
export const player = (s) => s.p;
const ev = (s, n) => { if (!s.ev.includes(n)) s.ev.push(n); };
const toScr = (s, x, y) => ({ x: x - s.cam.x, y: y - s.cam.y + AY });
function pop(s, x, y, text, c = '#fbf1e0') { if (s.pops.length > 6) return; const q = toScr(s, x, y); s.pops.push({ x: q.x, y: q.y, text, c, t: 1 }); }
function fx(s, x, y, c, n = 6) { if (s.fxBudget <= 0) return; s.fxBudget--; const q = toScr(s, x, y); s.fx.push({ x: q.x, y: q.y, c, n }); }
export const mul = (s) => ({ dmg: 1 + 0.12 * (s.pas.teeth || 0), cd: 1 - 0.08 * (s.pas.paws || 0), spd: 1 + 0.08 * (s.pas.zoom || 0), mag: 26 * (1 + 0.35 * (s.pas.nose || 0)), regen: 0.5 * (s.pas.good || 0) });
// ---------- step ----------
const keys = (i) => ({ left: !!i?.left, right: !!i?.right, up: !!i?.up, down: !!i?.down, a: !!i?.a, b: !!i?.b });
export function step(s, dt, inp = {}) {
  const k = keys(inp), pv = s.prev, e = { aP: k.a && !pv.a, bP: k.b && !pv.b, lP: k.left && !pv.left, rP: k.right && !pv.right, uP: k.up && !pv.up, dP: k.down && !pv.down }; s.prev = k;
  s.frame++; s.fxBudget = 6; if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 2); if (s.shake > 0) s.shake = Math.max(0, s.shake - dt);
  if (s.over) return;
  if (s.phase === 'ready') { if (--s.phaseT <= 0) { s.phase = 'play'; ev(s, 'fight'); } camera(s); return; }
  if (s.phase === 'dead') { if (--s.phaseT <= 0) { s.over = true; s.phase = 'over'; } return; }
  if (s.phase === 'choose') { const c = s.choice; if (e.lP || e.uP) { c.sel = (c.sel + c.opts.length - 1) % c.opts.length; ev(s, 'blip'); } if (e.rP || e.dP) { c.sel = (c.sel + 1) % c.opts.length; ev(s, 'blip'); }
    if (++c.t > 20 && (e.aP || c.t > 60 * 12)) pick(s, c.opts[c.sel]); return; }
  const f = Math.min(2, dt * 60); s.t += f / 60; const sec = Math.floor(s.t); if (sec > s.stats.secs) { s.stats.secs = sec; s.score += s.t > 600 ? PTS.overtimeSec : PTS.sec; }
  s.level = Math.min(9, 1 + Math.floor(s.t / 150));
  playerFrame(s, k, e, f); camera(s); director(s); buildGrid(s); weapons(s); enemiesFrame(s, f); shotsFrame(s, f); spamFrame(s, f); minesFrame(s); crumbsFrame(s, f); itemsFrame(s); zonesFrame(s);
  if (s.E.n > s.stats.maxOnScreen) s.stats.maxOnScreen = s.E.n;
  if (s.p.hp <= 0) die(s); else if (s.p.xp >= need(s.p.lvl)) levelUp(s);
}
function camera(s) { s.cam.x = Math.max(0, Math.min(FW - W, s.p.x - W / 2)); s.cam.y = Math.max(0, Math.min(FH - VH, s.p.y - VH / 2)); }
function solidTree(x, y, r) { for (const t of TREES) { const dx = x - t.x, dy = y - t.y; if (dx * dx + dy * dy < (t.r + r) * (t.r + r)) return true; } return false; }
function playerFrame(s, k, e, f) { const p = s.p, M = mul(s);
  if (p.inv > 0) p.inv -= f; if (p.dashCd > 0) p.dashCd -= f; if (p.shield > 0) p.shield -= f; if (p.hurtF > 0) p.hurtF -= f;
  if (M.regen && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + (M.regen / 60) * f);
  let mx = (k.right ? 1 : 0) - (k.left ? 1 : 0), my = (k.down ? 1 : 0) - (k.up ? 1 : 0); if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; }
  if (mx || my) { p.fx = mx; p.fy = my; p.anim += f; } else p.anim = 0;
  if (e.aP && p.dashCd <= 0 && p.dashF <= 0) { const l = Math.hypot(mx, my); p.dx = l ? mx / l : p.fx; p.dy = l ? my / l : p.fy; const ll = Math.hypot(p.dx, p.dy) || 1; p.dx /= ll; p.dy /= ll; p.dashF = 12; p.dashCd = 90; p.inv = Math.max(p.inv, 16); s.stats.dashes++; ev(s, 'dash'); }
  let vx, vy; if (p.dashF > 0) { p.dashF -= f; vx = p.dx * 3.4; vy = p.dy * 3.4; } else { const v = 1.1 * M.spd; vx = mx * v; vy = my * v; }
  move(p, vx * f, vy * f, 6);
  if (e.bP && p.meter >= 100) bigBark(s); }
function move(o, dx, dy, r) { const nx = Math.max(FENCE + r, Math.min(FW - FENCE - r, o.x + dx)); if (!solidTree(nx, o.y, r)) o.x = nx; const ny = Math.max(FENCE + r, Math.min(FH - FENCE - r, o.y + dy)); if (!solidTree(o.x, ny, r)) o.y = ny; }
function bigBark(s) { const p = s.p; p.meter = 0; s.stats.barks++; s.shake = 0.3; s.flash = 0.5; ev(s, 'bigbark'); zone(s, 'ring', p.x, p.y, 96, 20);
  forNear(s, p.x, p.y, 96, (o, d) => { hurt(s, o, 35 * mul(s).dmg); if (!o.boss) { const l = d || 1; o.kx += ((o.x - p.x) / l) * 5; o.ky += ((o.y - p.y) / l) * 5; } });
  for (let i = s.Q.n - 1; i >= 0; i--) { const q = s.Q.a[i]; if (Math.hypot(q.x - p.x, q.y - p.y) < 110) drop(s.Q, i); }
  if (s.inu) { p.shield = 180; s.stats.howls++; pop(s, p.x, p.y - 18, 'HODL HOWL!', '#7ef0ff'); ev(s, 'howl'); } else pop(s, p.x, p.y - 18, 'BIG BARK!', '#f2c14e'); }
// ---------- spawning ----------
function director(s) { const m = minutes(s);
  if (s.t >= s.nextBoss && !s.boss) { const type = BOSS_ORDER[s.bossN % 3], lap = Math.floor(s.bossN / 3); const b = spawn(s, type, true); if (b) { b.hp = b.max = FOES[type].hp * (1 + lap * 1.5) * (1 + 0.1 * m); s.boss = b; s.bossN++; s.nextBoss += BOSS_EVERY; s.warn = 150; s.warnText = FOES[type].name; ev(s, 'boss'); } }
  if (s.warn > 0) s.warn--;
  if (s.t >= s.swarmT) { s.swarmT += 75; const n = Math.min(24, s.E.cap - s.E.n - 6); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; spawnAt(s, 'drone', s.p.x + Math.cos(a) * 150, s.p.y + Math.sin(a) * 150); } if (n > 0) { s.warn = Math.max(s.warn, 90); s.warnText = 'FUD SWARM!'; ev(s, 'swarm'); } }
  if (++s.spawnT < 20) return; s.spawnT = 0; const want = targetCount(m) - s.E.n; if (want <= 0) return;
  for (let i = 0; i < Math.min(4 + (m >> 2), want); i++) spawn(s, pickType(s, m)); }
function pickType(s, m) { const w = [['drone', 10], ['roller', m >= 1 ? 4 + m : 0], ['paper', m >= 2 ? 3 + m : 0], ['shill', m >= 3 ? 2 + m * 0.6 : 0], ['bear', m >= 4 ? Math.min(3, 0.6 + 0.2 * m) : 0]];
  let tot = 0; for (const [, x] of w) tot += x; let r = s.rnd() * tot; for (const [t, x] of w) { if ((r -= x) < 0) return t; } return 'drone'; }
function spawn(s, type, boss = false) { const a = s.rnd() * Math.PI * 2, d = boss ? 140 : 150 + s.rnd() * 30; return spawnAt(s, type, s.p.x + Math.cos(a) * d, s.p.y + Math.sin(a) * d); }
function spawnAt(s, type, x, y) { const o = take(s.E); if (!o) return null; const F = FOES[type], m = minutes(s);
  Object.assign(o, { uid: s.uid++, type, x: Math.max(FENCE, Math.min(FW - FENCE, x)), y: Math.max(FENCE, Math.min(FH - FENCE, y)), hp: F.hp * hpMul(m), spd: F.spd * spdMul(m), r: F.r, flash: 0, kx: 0, ky: 0, t: (s.rnd() * 60) | 0, st: 0, dx: 0, dy: 0, orbCd: 0, boss: !!F.boss, elite: !!F.elite });
  o.max = o.hp; return o; }
// ---------- grid ----------
function buildGrid(s) { const G = s.grid; for (let i = 0; i < G.length; i++) G[i].length = 0; for (let i = 0; i < s.E.n; i++) { const o = s.E.a[i]; G[cell(o.x, o.y)].push(o); } }
const cell = (x, y) => Math.max(0, Math.min(GC - 1, (y / GS) | 0)) * GC + Math.max(0, Math.min(GC - 1, (x / GS) | 0));
export function forNear(s, x, y, r, fn) { const c0 = Math.max(0, ((x - r - 20) / GS) | 0), c1 = Math.min(GC - 1, ((x + r + 20) / GS) | 0), r0 = Math.max(0, ((y - r - 20) / GS) | 0), r1 = Math.min(GC - 1, ((y + r + 20) / GS) | 0);
  for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) { const L = s.grid[rr * GC + cc]; for (let i = 0; i < L.length; i++) { const o = L[i]; if (o.hp <= 0) continue; const d = Math.hypot(o.x - x, o.y - y); if (d < r + o.r) fn(o, d); } } }
function nearest(s, x, y, maxD) { let best = null, bd = maxD; forNear(s, x, y, maxD, (o, d) => { if (d < bd) { bd = d; best = o; } }); return best; }
// ---------- weapons (auto) ----------
function zone(s, kind, x, y, r, len, x2 = 0, y2 = 0, c = 0) { const z = take(s.Z); if (!z) return; z.kind = kind; z.x = x; z.y = y; z.r = r; z.t = len; z.len = len; z.x2 = x2; z.y2 = y2; z.c = c; }
function weapons(s) { const p = s.p, M = mul(s);
  for (const id of Object.keys(s.wep)) { const l = s.wep[id]; if (id === 'orbit') continue; if ((s.cd[id] -= 1) > 0) continue; const W_ = WSTAT[id](l); s.cd[id] = Math.max(10, W_.cd * M.cd);
    if (id === 'bark') { zone(s, 'ring', p.x, p.y, W_.r, 12); forNear(s, p.x, p.y, W_.r, (o, d) => { hurt(s, o, W_.dmg * M.dmg); if (!o.boss) { const k = 1.6 / (d || 1); o.kx += (o.x - p.x) * k; o.ky += (o.y - p.y) * k; } }); ev(s, 'ring'); }
    else if (id === 'bone') { const t = nearest(s, p.x, p.y, 170); if (!t) { s.cd[id] = 6; continue; } const a0 = Math.atan2(t.y - p.y, t.x - p.x); for (let i = 0; i < W_.n; i++) { const q = take(s.S); if (!q) break; const a = a0 + (i - (W_.n - 1) / 2) * 0.22; Object.assign(q, { x: p.x, y: p.y - 3, vx: Math.cos(a) * W_.speed, vy: Math.sin(a) * W_.speed, life: 60, dmg: W_.dmg * M.dmg, pierce: W_.pierce, nh: 0 }); } ev(s, 'toss'); }
    else if (id === 'gaze') { const t = nearest(s, p.x, p.y, 170); if (!t) { s.cd[id] = 6; continue; } const a = Math.atan2(t.y - p.y, t.x - p.x), x2 = p.x + Math.cos(a) * W_.len, y2 = p.y + Math.sin(a) * W_.len; zone(s, 'beam', p.x, p.y - 4, 0, 10, x2, y2);
      const cx = (p.x + x2) / 2, cy = (p.y + y2) / 2; forNear(s, cx, cy, W_.len / 2 + 8, (o) => { if (segDist(o.x, o.y, p.x, p.y, x2, y2) < 6 + o.r) hurt(s, o, W_.dmg * M.dmg); }); ev(s, 'zap'); }
    else if (id === 'paw') { if (s.M.n >= W_.max) { s.cd[id] = 20; continue; } const m = take(s.M); if (m) { m.x = p.x; m.y = p.y; m.life = 420; } }
    else if (id === 'tail') { const fx_ = p.fx || 1, fy_ = p.fy, l = Math.hypot(fx_, fy_) || 1, ux = fx_ / l, uy = fy_ / l; zone(s, 'arc', p.x, p.y, W_.r, 9, ux, uy);
      forNear(s, p.x, p.y, W_.r, (o, d) => { if (d < 10 || ((o.x - p.x) * ux + (o.y - p.y) * uy) / (d || 1) > 0.1) { hurt(s, o, W_.dmg * M.dmg); o.kx += ux * 1.2; o.ky += uy * 1.2; } }); ev(s, 'whip'); } }
  if (s.wep.orbit) { const W_ = WSTAT.orbit(s.wep.orbit); s.orbA += W_.spin; for (let i = 0; i < W_.n; i++) { const a = s.orbA + (i * Math.PI * 2) / W_.n, x = p.x + Math.cos(a) * W_.r, y = p.y + Math.sin(a) * W_.r; forNear(s, x, y, 5, (o) => { if (o.orbCd > s.frame) return; o.orbCd = s.frame + 18; hurt(s, o, W_.dmg * M.dmg); }); } } }
export function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1; let t = ((px - ax) * vx + (py - ay) * vy) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - vx * t, py - ay - vy * t); }
export function orbitPts(s) { if (!s.wep.orbit) return []; const W_ = WSTAT.orbit(s.wep.orbit), out = []; for (let i = 0; i < W_.n; i++) { const a = s.orbA + (i * Math.PI * 2) / W_.n; out.push({ x: s.p.x + Math.cos(a) * W_.r, y: s.p.y + Math.sin(a) * W_.r }); } return out; }
// ---------- damage / death ----------
export function hurt(s, o, amt) { if (o.hp <= 0) return false; o.hp -= amt; o.flash = 4; if (o.hp <= 0) { kill(s, o); return true; } ev(s, 'hit'); return false; }
function kill(s, o) { const F = FOES[o.type]; s.stats.kills++; s.score += F.pts; if (s.p.shield <= 0) s.p.meter = Math.min(100, s.p.meter + (o.boss ? 40 : o.elite ? 8 : 0.6)); // no refill while shielded (no shield chains) fx(s, o.x, o.y, o.boss ? '#f2c14e' : '#b48cff', o.boss ? 16 : 5); ev(s, o.boss ? 'bossdown' : 'pop');
  crumb(s, o.x, o.y, F.xp); const r = s.rnd();
  if (o.boss) { s.stats.bosses++; s.boss = null; item(s, 'chest', o.x, o.y); if (s.inu) item(s, 'coin', o.x + 14, o.y); pop(s, o.x, o.y - 20, `${F.name} DOWN! +${F.pts}`, '#f2c14e'); s.shake = 0.4; }
  else if (o.elite) { if (s.inu) item(s, 'coin', o.x, o.y); else if (r < 0.5) item(s, 'treat', o.x, o.y); }
  else if (r < 0.012) item(s, 'treat', o.x, o.y); else if (r < 0.016) item(s, 'magnet', o.x, o.y); else if (s.inu && r < 0.024) item(s, 'coin', o.x, o.y);
  o.hp = 0; }
function crumb(s, x, y, v) { let c = take(s.X); if (!c) { // pool full: fold the value into the nearest crumb (no new object)
    let best = s.X.a[0], bd = 1e9; for (let i = 0; i < s.X.n; i++) { const q = s.X.a[i], d = Math.abs(q.x - x) + Math.abs(q.y - y); if (d < bd) { bd = d; best = q; } } best.v += v; return; }
  c.x = x; c.y = y; c.v = v; c.fly = false; }
function item(s, kind, x, y) { const i = take(s.I); if (!i) return; i.kind = kind; i.x = x; i.y = y; i.t = 1800; }
function hitPlayer(s, dmg) { const p = s.p; if (p.inv > 0 || p.dashF > 0 || p.shield > 0) return false; p.hp -= dmg * (1 + 0.04 * minutes(s)); p.inv = 30; p.hurtF = 10; s.flash = 0.25; ev(s, 'ouch'); return true; }
function die(s) { const p = s.p; if (s.lives > 1) { s.lives--; s.stats.revives++; p.hp = p.maxHp; p.inv = 150; p.meter = 100; bigBark(s); pop(s, p.x, p.y - 22, 'SECOND WIND!', '#5fd37a'); ev(s, 'revive'); return; }
  s.lives = 0; s.phase = 'dead'; s.phaseT = 90; ev(s, 'ko'); s.shake = 0.5; }
// ---------- enemies ----------
function enemiesFrame(s, f) { const p = s.p, m = minutes(s);
  for (let i = s.E.n - 1; i >= 0; i--) { const o = s.E.a[i]; if (o.hp <= 0) { drop(s.E, i); continue; }
    if (o.flash > 0) o.flash--; o.t++; let dx = p.x - o.x, dy = p.y - o.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; let v = o.spd;
    if (o.type === 'roller') { if (o.t % 70 === 1) { o.dx = dx; o.dy = dy; } dx = o.dx || dx; dy = o.dy || dy; }
    else if (o.type === 'shill') { if (d < 80) { dx = -dx; dy = -dy; v *= 0.6; } if (o.t % 120 === 0 && d < 200) spam(s, o.x, o.y, Math.atan2(p.y - o.y, p.x - o.x), 1.4); }
    else if (o.type === 'whale') { if (o.t % 110 === 0) for (let j = 0; j < 3; j++) spawnAt(s, 'drone', o.x + (j - 1) * 20, o.y + 16); }
    else if (o.type === 'dump') { const ph = o.t % 200; if (ph === 140) { o.dx = dx; o.dy = dy; o.st = 1; ev(s, 'warnbark'); } if (ph >= 140 && ph < 160) v = 0; else if (ph >= 160) { dx = o.dx; dy = o.dy; v = 2.6; } else o.st = 0; }
    else if (o.type === 'king') { if (o.t % 130 === 0) { for (let j = 0; j < 12; j++) spam(s, o.x, o.y, (j / 12) * Math.PI * 2 + o.t * 0.01, 1.2); ev(s, 'spam'); } if (o.t % 200 === 100) for (let j = 0; j < 4; j++) spawnAt(s, 'roller', o.x + (j - 1.5) * 18, o.y - 18); }
    o.x += (dx * v + o.kx) * f; o.y += (dy * v + o.ky) * f; o.kx *= 0.8; o.ky *= 0.8;
    if (o.x < FENCE || o.x > FW - FENCE || o.y < FENCE || o.y > FH - FENCE) { o.x = Math.max(FENCE, Math.min(FW - FENCE, o.x)); o.y = Math.max(FENCE, Math.min(FH - FENCE, o.y)); if (o.type === 'roller') { o.dx = -o.dx; o.dy = -o.dy; } }
    // light separation inside its own grid cell (keeps the swarm readable without O(n^2))
    if ((o.t & 1) === 0 && !o.boss) { const L = s.grid[cell(o.x, o.y)]; for (let j = 0; j < L.length && j < 8; j++) { const q = L[j]; if (q === o) continue; const sx = o.x - q.x, sy = o.y - q.y, sd = sx * sx + sy * sy, rr = o.r + q.r; if (sd > 0.01 && sd < rr * rr) { const k2 = 0.3 / Math.sqrt(sd); o.x += sx * k2; o.y += sy * k2; } } }
    const cd = Math.hypot(p.x - o.x, p.y - o.y); if (cd < o.r + 6) { if (p.shield > 0 && !o.boss) hurt(s, o, 999); else hitPlayer(s, FOES[o.type].dmg); }
    if (!o.boss && cd > 420) { const a = s.rnd() * Math.PI * 2; o.x = Math.max(FENCE, Math.min(FW - FENCE, p.x + Math.cos(a) * 160)); o.y = Math.max(FENCE, Math.min(FH - FENCE, p.y + Math.sin(a) * 160)); } } } // stragglers re-enter near you
function spam(s, x, y, a, v) { const q = take(s.Q); if (!q) return; q.x = x; q.y = y; q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v; q.life = 200; q.dmg = 6; }
function shotsFrame(s, f) { for (let i = s.S.n - 1; i >= 0; i--) { const q = s.S.a[i]; q.x += q.vx * f; q.y += q.vy * f; q.life -= f; let gone = q.life <= 0 || q.x < 0 || q.y < 0 || q.x > FW || q.y > FH;
    if (!gone) forNear(s, q.x, q.y, 4, (o) => { if (q.pierce <= 0) return; for (let j = 0; j < q.nh; j++) if (q.hit[j] === o.uid) return; if (q.nh < 6) q.hit[q.nh++] = o.uid; hurt(s, o, q.dmg); q.pierce--; });
    if (gone || q.pierce <= 0) drop(s.S, i); } }
function spamFrame(s, f) { const p = s.p; for (let i = s.Q.n - 1; i >= 0; i--) { const q = s.Q.a[i]; q.x += q.vx * f; q.y += q.vy * f; q.life -= f; if (Math.hypot(q.x - p.x, q.y - p.y) < 7) { hitPlayer(s, q.dmg); q.life = 0; } if (q.life <= 0) drop(s.Q, i); } }
function minesFrame(s) { const M_ = mul(s), W_ = s.wep.paw ? WSTAT.paw(s.wep.paw) : null; for (let i = s.M.n - 1; i >= 0; i--) { const m = s.M.a[i]; m.life--; let boom = false;
    if (W_) forNear(s, m.x, m.y, 4, () => { boom = true; }); if (boom || m.life <= 0) { if (boom) { zone(s, 'boom', m.x, m.y, W_.r, 14); forNear(s, m.x, m.y, W_.r, (o) => hurt(s, o, W_.dmg * M_.dmg)); ev(s, 'boom'); } drop(s.M, i); } } }
function crumbsFrame(s, f) { const p = s.p, mag = mul(s).mag; for (let i = s.X.n - 1; i >= 0; i--) { const c = s.X.a[i]; const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
    if (d < mag || c.fly) { c.fly = true; const v = Math.max(2, 5 - d / 20) * f; c.x += (dx / (d || 1)) * Math.min(v, d); c.y += (dy / (d || 1)) * Math.min(v, d); }
    if (d < 7) { p.xp += c.v; s.score += c.v * PTS.crumb; s.stats.crumbs += c.v; ev(s, 'kib'); drop(s.X, i); } } }
function itemsFrame(s) { const p = s.p; for (let i = s.I.n - 1; i >= 0; i--) { const it = s.I.a[i]; if (--it.t <= 0) { drop(s.I, i); continue; } if (Math.hypot(p.x - it.x, p.y - it.y) > 10) continue;
    if (it.kind === 'treat') { p.hp = Math.min(p.maxHp, p.hp + 30); s.score += PTS.treat; s.stats.treats++; pop(s, it.x, it.y - 10, 'TREAT +30', '#ff9ad0'); ev(s, 'treat'); }
    else if (it.kind === 'magnet') { for (let j = 0; j < s.X.n; j++) s.X.a[j].fly = true; pop(s, it.x, it.y - 10, 'SNIFF ALL!', '#7ef0ff'); ev(s, 'sniff'); }
    else if (it.kind === 'coin') { s.score += PTS.coin; s.stats.coins++; pop(s, it.x, it.y - 10, '+500 $KIBBLE', '#f2c14e'); ev(s, 'coin'); }
    else if (it.kind === 'chest') { p.hp = Math.min(p.maxHp, p.hp + 40); p.xp = Math.max(p.xp, need(p.lvl)); pop(s, it.x, it.y - 10, 'BONE CHEST!', '#f2c14e'); ev(s, 'rescue'); }
    drop(s.I, i); } }
function zonesFrame(s) { for (let i = s.Z.n - 1; i >= 0; i--) if (--s.Z.a[i].t <= 0) drop(s.Z, i); }
// ---------- level up ----------
export function options(s) { const out = [], nw = Object.keys(s.wep).length, np = Object.keys(s.pas).length;
  for (const [id, w] of Object.entries(WEAPONS)) { const l = s.wep[id] || 0; if (l ? l < w.max : nw < MAX_W) out.push({ kind: 'w', id, lvl: l + 1 }); }
  for (const [id, w] of Object.entries(PASSIVES)) { const l = s.pas[id] || 0; if (l ? l < w.max : np < MAX_P) out.push({ kind: 'p', id, lvl: l + 1 }); }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(s.rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.length ? out.slice(0, 3) : [{ kind: 's', id: 'snack', lvl: 1 }]; }
function levelUp(s) { const p = s.p; p.xp -= need(p.lvl); p.lvl++; s.stats.maxLvl = p.lvl; s.score += PTS.level; s.choice = { opts: options(s), sel: 0, t: 0 }; s.phase = 'choose'; ev(s, 'levelup'); }
export function pick(s, o) { const p = s.p;
  if (o.kind === 'w') { s.wep[o.id] = o.lvl; if (o.lvl === 1) { s.cd[o.id] = 10; s.stats.weapons++; } }
  else if (o.kind === 'p') { s.pas[o.id] = o.lvl; if (o.id === 'coat') { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); } }
  else { p.hp = Math.min(p.maxHp, p.hp + 30); s.score += 100; }
  s.choice = null; s.phase = 'play'; p.inv = Math.max(p.inv, 30); ev(s, 'select'); }
// ---------- bot (attract mode / human-sim brain) ----------
const WPRI = ['bone', 'orbit', 'gaze', 'tail', 'paw', 'bark'], PPRI = ['coat', 'teeth', 'paws', 'good', 'zoom', 'nose'];
export function botPick(s) { const c = s.choice; let best = 0, bs = -1e9; c.opts.forEach((o, i) => { const sc = o.kind === 'w' ? 100 - WPRI.indexOf(o.id) * 5 + (o.lvl > 1 ? 20 : 0) : o.kind === 'p' ? 60 - PPRI.indexOf(o.id) * 5 : 0; if (sc > bs) { bs = sc; best = i; } }); return best; }
export function bot(s) { const o = {};
  if (s.phase === 'choose') { const want = botPick(s); if (s.choice.sel !== want) { if (s.frame % 4 === 0) o.right = true; } else if (s.choice.t > 24 && s.frame % 4 < 2) o.a = true; return o; }
  if (s.phase !== 'play') return o; const p = s.p; let vx = 0, vy = 0, danger = 0;
  forNear(s, p.x, p.y, 70, (e, d) => { const w = (FOES[e.type].dmg / 6) * (e.boss ? 3 : 1) / Math.max(36, d * d); vx += (p.x - e.x) * w; vy += (p.y - e.y) * w; if (d < 30 + e.r) danger++; });
  for (let i = 0; i < s.Q.n; i++) { const q = s.Q.a[i], d = Math.hypot(q.x - p.x, q.y - p.y); if (d < 40) { vx += (p.x - q.x) / (d * d + 20) * 2; vy += (p.y - q.y) / (d * d + 20) * 2; } }
  let cx = null, cd = 140; for (let i = 0; i < s.X.n; i++) { const c = s.X.a[i], d = Math.abs(c.x - p.x) + Math.abs(c.y - p.y); if (d < cd) { cd = d; cx = c; } }
  for (let i = 0; i < s.I.n; i++) { const c = s.I.a[i], d = Math.abs(c.x - p.x) + Math.abs(c.y - p.y); if (d < 200 && (c.kind !== 'treat' || p.hp < p.maxHp * 0.7)) { cd = d * 0.5; cx = c; } }
  const dl = Math.hypot(vx, vy); if (dl) { vx /= dl; vy /= dl; }
  if (cx && danger < 2) { const d = Math.hypot(cx.x - p.x, cx.y - p.y) || 1; const w = dl ? 0.6 : 1; vx += ((cx.x - p.x) / d) * w; vy += ((cx.y - p.y) / d) * w; }
  const edge = 70; if (p.x < edge) vx += 0.8; if (p.x > FW - edge) vx -= 0.8; if (p.y < edge) vy += 0.8; if (p.y > FH - edge) vy -= 0.8;
  if (!dl && !cx) { vx += (FW / 2 - p.x) / 300 + Math.cos(s.t * 0.7) * 0.6; vy += (FH / 2 - p.y) / 300 + Math.sin(s.t * 0.5) * 0.6; }
  for (const t of TREES) { const d = Math.hypot(p.x - t.x, p.y - t.y); if (d < 26) { vx += (p.x - t.x) / d; vy += (p.y - t.y) / d; } }
  const l = Math.hypot(vx, vy); if (l > 0.2) { vx /= l; vy /= l; if (vx > 0.38) o.right = true; if (vx < -0.38) o.left = true; if (vy > 0.38) o.down = true; if (vy < -0.38) o.up = true; }
  if (danger >= 2 && p.dashCd <= 0) o.a = true; if (p.meter >= 100 && (danger >= 3 || p.hp < p.maxHp * 0.35)) o.b = true;
  return o; }
// ---------- misc API ----------
export const ghostPos = (g, s) => ({ x: g.p.x - (s || g).cam.x, y: g.p.y - 6 - (s || g).cam.y + AY });
export const applySkin = (s, skins = []) => { s.skin = skins.includes('gold') ? 'gold' : skins.includes('neon') ? 'neon' : null; return s; }; // cosmetic only: recolours your bandana
export { draw } from './fud-art.js';
