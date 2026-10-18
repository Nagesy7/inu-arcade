// BONE DIGGER (working name: pending Zachary's approval; rename via NAME below) — original Inu digging cabinet.
// A Shiba digs down from the backyard lawn through four soil layers (loam, clay, shale, crystal) for buried bones. Every
// pixel you move carves tunnel; deeper soil is slower to dig and worth more. Burrowing pests: moles that tunnel through
// dirt, snakes that only slither along tunnels (and strike down straight ones after a hiss), and beetles that shimmer, then
// phase through soil toward you. Attack: the BARK PUMP, a short sound wave down the tunnel; each hit fluffs a pest up with
// static (stunned, harmless), four in a row pops it. Dig under a boulder and it wobbles, then drops: crush pests for big
// bonuses. Classic = these rules at classic difficulty; Inu Mode adds the Bone Boomerang (hold A, release) and $KIBBLE coins.
import { rng } from '../core/rng.js';
export const NAME = 'Bone Digger'; // single source of the player-facing name (working name)
export const META = { id: 'bone-digger', title: NAME.toUpperCase(), short: 'DIGGER', color: '#c9a36a',
  blurb: 'Dig for buried bones through four soil layers. Bark-pump moles, snakes and beetles until they pop, and drop boulders on them.',
  controls: 'Arrows / WASD / D-pad / stick to dig · A (Space/Z) Bark Pump: tap to fluff a pest up, 4 hits pops it',
  inuMove: 'BONE BOOMERANG: hold A, then release to throw a bone down the tunnel that stuns every pest it passes. $KIBBLE coins (+500) are buried twice per yard.',
  classicNote: 'Bark Pump only. Boulders, timer and pests at classic difficulty.' };
export const W = 256, H = 256, OY = 24, CELL = 16, COLS = 16, ROWS = 13, SUB = 2, SC = (COLS * CELL) / SUB, SR = (ROWS * CELL) / SUB;
// soil layers by row: row 0 is the lawn (open); then loam, clay, shale, crystal. dig = speed factor while carving.
export const LAYERS = [
  { name: 'LOAM', rows: [1, 3], dig: 0.85, pop: 200, soil: '#8a5a32', dark: '#2a160c', fleck: '#a8744a' },
  { name: 'CLAY', rows: [4, 6], dig: 0.75, pop: 300, soil: '#b0582c', dark: '#30120a', fleck: '#d07848' },
  { name: 'SHALE', rows: [7, 9], dig: 0.65, pop: 400, soil: '#5a5470', dark: '#16121e', fleck: '#7a7494' },
  { name: 'CRYSTAL', rows: [10, 12], dig: 0.55, pop: 500, soil: '#24485a', dark: '#081218', fleck: '#5fd3e8' },
];
export const layerOf = (row) => (row <= 0 ? -1 : Math.min(3, Math.floor((row - 1) / 3)));
// Yard layouts (13 rows x 16). row 0 lawn is always open. . soil, - | + pre-dug tunnel, R boulder, B bone, k kibble,
// M mole den, S snake den, E beetle den (dens are pre-dug).
export const YARDS = [
  { name: 'BACKYARD', rows: [
    '                ',
    '..k.....k....R..',
    '.R..--M--...k...',
    '..k.....B.......',
    '.....k.....|..R.',
    '..B........S..k.',
    '.......R...|....',
    '.k..-M--........',
    '..........k..B..',
    '....R...........',
    '..k.....--E--.k.',
    '.B.........R....',
    '......k.......B.'] },
  { name: 'VEGGIE PATCH', rows: [
    '                ',
    '...k..R.....k...',
    '.|.......k...R..',
    '.M..B.......-S-.',
    '.|.....k........',
    '......R...k..B..',
    '..k.........|...',
    '.--S--......E...',
    '.......B....|.k.',
    '..R.......R.....',
    '.k...k..--M--...',
    '..........k..R..',
    '.B....k.......B.'] },
  { name: 'OLD ORCHARD', rows: [
    '                ',
    '.R....k....R....',
    '...--M--......k.',
    '.k.......B..|...',
    '.....R......E...',
    '.B..k.......|.R.',
    '.......-S-......',
    '..k.R.....k..B..',
    '.............k..',
    '.--E--...R......',
    '.......k....-M-.',
    '..B..R..........',
    '.k......B....k..'] },
  { name: 'FOSSIL BEDS', rows: [
    '                ',
    '..k...R...R..k..',
    '.....|....k.....',
    '.B...S......--M-',
    '.....|..R.......',
    '..k.......k..B..',
    '.R...--E--......',
    '...........k..R.',
    '.k..B...|.......',
    '........M...k...',
    '..R.....|...--S-',
    '.......k..R.....',
    '.B..k.........B.'] },
];
export const PTS = { dig: 2, kibble: 10, bone: 100, gbone: 1000, coin: 500, crush: [500, 1000, 2000, 4000, 6000, 8000], treat: (L) => [400, 600, 800, 1000, 1500, 2000, 3000][Math.min(L - 1, 6)], timeBonus: 10, extraLifeAt: 20000 };
export const PUMP = { hits: 4, reach: 40, waveF: 10, cd: 12, decay: 75, wave: 5 }; // pops after 4 hits (3 in yards 1-2); each hit's fluff wears off after decay frames
export const popHits = (L) => (L <= 2 ? 3 : PUMP.hits);
export const BOOM = { charge: 30, speed: 3, range: 96, stun: 90, cd: 6 }; // Inu Mode Bone Boomerang
export const PHYS = { walk: 1.0 }; // px per frame in an open tunnel (x layer dig factor while carving)
export function speeds(L) { L = Math.min(L, 12); const f = (a, b, m) => Math.min(m, a + b * (L - 1));
  return { mole: f(0.45, 0.04, 0.9), burrow: f(0.3, 0.025, 0.6), snake: f(0.62, 0.05, 1.1), strike: f(2.0, 0.08, 2.8), beetle: f(0.42, 0.035, 0.8), phase: f(0.38, 0.03, 0.65), hurry: 1.35 }; }
export function windups(L) { L = Math.min(L, 12); return { hiss: Math.max(18, 34 - 2 * L), shimmer: Math.max(18, 34 - 2 * L), wobble: Math.max(32, 48 - 2 * L) }; }
export const levelSecs = (L) => Math.max(60, 110 - 5 * (L - 1));
export const enemyCount = (L) => Math.min(7, 3 + Math.floor((L - 1) / 2));
export const burrowEvery = (L) => Math.max(3, 8 - 0.5 * (L - 1)); // seconds between a mole's tunnelling sprees
export const GOLD_EVERY = 35, GOLD_SECS = 12, TREAT_SECS = 10, RESPAWN_WAVE = 5, COINS_PER_YARD = 2;
export const START = { c: 7, r: 0 };
const cx = (c) => c * CELL + CELL / 2, cy = cx;
const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }, DN = ['left', 'right', 'up', 'down'];
const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y: y + OY, c, n }), pop = (s, x, y, text, c = '#fbf1e0') => s.pops.push({ x, y: y + OY, text, c, t: 1 });
// ---------- soil ----------
const subIdx = (sx, sy) => sy * SC + sx;
export function carve(s, x0, y0, x1, y1) { let n = 0; const a = Math.max(0, Math.floor(x0 / SUB)), b = Math.min(SC - 1, Math.floor((x1 - 1) / SUB)), c = Math.max(0, Math.floor(y0 / SUB)), d = Math.min(SR - 1, Math.floor((y1 - 1) / SUB));
  for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) { const i = subIdx(x, y); if (!s.dug[i]) { s.dug[i] = 1; n++; } } return n; }
export const dugAt = (s, x, y) => x >= 0 && y >= 0 && x < COLS * CELL && y < ROWS * CELL && s.dug[subIdx(Math.floor(x / SUB), Math.floor(y / SUB))] === 1;
export const cellOpen = (s, c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && dugAt(s, cx(c), cy(r));
export function edgeOpen(s, c, r, d) { const [dx, dy] = DIRS[d], c2 = c + dx, r2 = r + dy; if (c2 < 0 || r2 < 0 || c2 >= COLS || r2 >= ROWS) return false;
  for (let k = 0; k <= CELL; k += SUB) if (!dugAt(s, cx(c) + dx * k, cy(r) + dy * k)) return false; return true; }
export const rockAt = (s, c, r) => s.rocks.some((k) => !k.gone && k.c === c && Math.round(k.y / CELL - 0.5) === r);
// ---------- setup ----------
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, over: false, t: 0, frame: 0, acc: 0, ev: [], fx: [], pops: [], shake: 0, flash: 0, extra: false,
    stats: { pops: 0, crushes: 0, bestCrush: 0, bones: 0, gbones: 0, treats: 0, coins: 0, booms: 0, pumps: 0, cells: 0, yards: 0, deepest: 0 } };
  loadYard(s); return s;
}
function loadYard(s) {
  const L = s.level, Y = YARDS[(L - 1) % YARDS.length], rows = Y.rows; s.yard = (L - 1) % YARDS.length; s.yardName = Y.name;
  s.dug = new Uint8Array(SC * SR); s.rocks = []; s.bones = []; s.kibble = []; s.coins = []; s.waves = []; s.boom = null; s.gold = null; s.treat = null; s.rocksDropped = 0; s.treatGiven = false;
  carve(s, 0, 0, COLS * CELL, CELL - 2); // the lawn lane
  const dens = [];
  for (let r = 1; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const ch = rows[r][c];
    if ('-|+MSE'.includes(ch)) { const x = cx(c), y = cy(r); carve(s, x - 6, y - 6, x + 6, y + 6);
      const lr = (dc) => '-+MSE'.includes(rows[r][c + dc] || '.'), ud = (dr) => '|+MSE'.includes((rows[r + dr] || '')[c] || '.');
      if (ch !== '|' && lr(1)) carve(s, x, y - 6, x + CELL, y + 6); if (ch !== '-' && ud(1)) carve(s, x - 6, y, x + 6, y + CELL);
      if ('MSE'.includes(ch)) dens.push({ type: { M: 'mole', S: 'snake', E: 'beetle' }[ch], c, r }); }
    if (ch === 'R') s.rocks.push({ c, y: cy(r), st: 'rest', f: 0, kills: 0, gone: false });
    if (ch === 'B') s.bones.push({ c, r, got: false });
    if (ch === 'k') s.kibble.push({ c, r, got: false }); }
  if (s.inu) { const free = []; for (let r = 4; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (rows[r][c] === '.') free.push([c, r]); for (let i = 0; i < COINS_PER_YARD; i++) { const k = free.splice(Math.floor(s.rnd() * free.length), 1)[0]; s.coins.push({ c: k[0], r: k[1], got: false }); } }
  s.dens = dens; s.timer = levelSecs(L) * 60; s.hurry = false; s.hurryT = 0; s.goldT = GOLD_EVERY * 60; s.waveT = 0; s.clearing = 0;
  s.enemies = []; const n = enemyCount(L); for (let i = 0; i < n; i++) { const d = dens[i % dens.length]; s.enemies.push(makeEnemy(s, d.type, d.c, d.r, i)); }
  resetPlayer(s); s.ready = 100;
}
function resetPlayer(s) { s.p = { x: cx(START.c), y: cy(START.r), dir: 'down', face: 1, acc: 0, moving: false, anim: 0, pumpF: 0, cd: 0, prevA: false, charge: 0, boomCd: 0, digging: false }; s.dying = 0; }
export function makeEnemy(s, type, c, r, i = 0) { return { type, i, x: cx(c), y: cy(r), home: { c, r }, dir: i % 2 ? 'left' : 'right', mode: 'walk', f: 0, acc: 0, fuzz: 0, fuzzT: 0, dead: false, cd: 120 + 60 * i, dug: 0, sd: null, wait: 120 + 60 * i }; } // pests stay in their dens for a couple of seconds
// ---------- step ----------
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.flash = Math.max(0, s.flash - dt); s.shake = Math.max(0, s.shake - dt);
  s.acc += dt * 60; while (s.acc >= 1 && !s.over) { s.acc -= 1; frame(s, inp || {}); }
}
function frame(s, inp) {
  s.frame++; s.t += 1 / 60; const p = s.p;
  if (s.ready > 0) { s.ready--; p.prevA = !!inp.a; return; }
  if (s.clearing > 0) { if (--s.clearing === 0) { s.level++; s.stats.yards++; s.ev.push('level'); const lv = s.lives; loadYard(s); s.lives = lv; } return; }
  if (s.dying > 0) { if (--s.dying === 0) afterDeath(s); rocksFrame(s); return; }
  playerFrame(s, p, inp);
  for (const e of s.enemies) if (!e.dead) enemyFrame(s, e);
  rocksFrame(s); wavesFrame(s); boomFrame(s); pickups(s); contact(s);
  // timer / hurry / respawn waves / golden bone
  if (s.timer > 0) { s.timer--; if (s.timer === 0) { s.hurry = true; s.ev.push('hurry'); pop(s, 128, 90, 'HURRY UP!', '#ff5d73'); } }
  else if (++s.hurryT % 900 === 0 && s.enemies.filter((e) => !e.dead).length < 8) { const d = s.dens[s.hurryT / 900 % s.dens.length | 0]; s.enemies.push(makeEnemy(s, 'mole', d.c, d.r)); }
  if (s.enemies.every((e) => e.dead)) { if (++s.waveT >= RESPAWN_WAVE * 60) { s.waveT = 0; for (let i = 0; i < Math.min(2, s.dens.length); i++) { const d = s.dens[(s.level + i) % s.dens.length]; s.enemies.push(makeEnemy(s, d.type, d.c, d.r, i)); } s.ev.push('tell'); } } else s.waveT = 0;
  if (s.gold) { if (--s.gold.t <= 0) s.gold = null; } else if (--s.goldT <= 0) { s.goldT = GOLD_EVERY * 60; placeGold(s); }
  if (s.treat && --s.treat.t <= 0) s.treat = null;
  if (!s.extra && s.score >= PTS.extraLifeAt) { s.extra = true; s.lives++; s.ev.push('pow'); pop(s, 128, 100, '1UP!', '#7ef0ff'); }
  if (s.bones.every((b) => b.got)) { const tb = Math.ceil(s.timer / 60) * PTS.timeBonus; s.score += tb; pop(s, 128, 100, 'YARD CLEAR! +' + tb, '#f2c14e'); s.ev.push('home'); s.clearing = 120; }
}
// ---------- player ----------
const aligned = (v) => (v - CELL / 2) % CELL === 0;
function playerFrame(s, p, inp) {
  const press = !!inp.a && !p.prevA, release = !inp.a && p.prevA; p.prevA = !!inp.a;
  if (p.cd > 0) p.cd--; if (p.boomCd > 0) p.boomCd--; if (p.pumpF > 0) p.pumpF--;
  if (press && p.cd <= 0) bark(s, p);
  if (s.inu) { if (inp.a) p.charge++; else { if (release && p.charge >= BOOM.charge && p.boomCd <= 0 && !s.boom) throwBoom(s, p); p.charge = 0; } }
  if (p.pumpF > 0) { p.moving = false; return; } // planted while the bark rings out
  let want = null; const h = inp.left ? 'left' : inp.right ? 'right' : null, v = inp.up ? 'up' : inp.down ? 'down' : null;
  if (h && v) want = (p.dir === 'left' || p.dir === 'right') ? v : h; else want = h || v;
  if (!want) { p.moving = false; return; }
  // auto-align to the lane: a turn waits until the Shiba reaches the next cell centre
  let d = want; const horiz = want === 'left' || want === 'right';
  if (horiz && !aligned(p.y)) d = p.dir === 'up' || p.dir === 'down' ? p.dir : (p.y % CELL < CELL / 2 ? 'down' : 'up');
  if (!horiz && !aligned(p.x)) d = p.dir === 'left' || p.dir === 'right' ? p.dir : (p.x % CELL < CELL / 2 ? 'right' : 'left');
  const [dx, dy] = DIRS[d]; const nx = p.x + dx, ny = p.y + dy;
  if (nx < CELL / 2 || nx > COLS * CELL - CELL / 2 || ny < CELL / 2 || ny > ROWS * CELL - CELL / 2) { p.moving = false; p.dir = d; return; }
  if (blockedByRock(s, nx, ny, p)) { p.moving = false; p.dir = d; return; }
  const front = dugAt(s, p.x + dx * 7, p.y + dy * 7) && dugAt(s, p.x + dx * 7 + dy * 5, p.y + dy * 7 + dx * 5) && dugAt(s, p.x + dx * 7 - dy * 5, p.y + dy * 7 - dx * 5);
  const lay = layerOf(Math.floor(p.y / CELL)); p.digging = !front; const spd = PHYS.walk * (front || lay < 0 ? 1 : LAYERS[lay].dig);
  p.dir = d; if (dx) p.face = dx; p.moving = true; p.acc += spd;
  while (p.acc >= 1) { p.acc -= 1; const tx = p.x + dx, ty = p.y + dy; if (blockedByRock(s, tx, ty, p)) break; p.x = tx; p.y = ty; p.anim++;
    carve(s, p.x - 6, p.y - 6, p.x + 6, p.y + 6); if (aligned(p.x) && aligned(p.y) && p.y > CELL) { const c = (p.x / CELL) | 0, r = (p.y / CELL) | 0, k = c + r * COLS; if (!(s.seen ||= new Set()).has(k)) { s.seen.add(k); s.score += PTS.dig; s.stats.cells++; s.stats.deepest = Math.max(s.stats.deepest, r); } } }
}
function blockedByRock(s, x, y, who) { for (const k of s.rocks) if (!k.gone && k.st !== 'fall' && Math.abs(cx(k.c) - x) < 14 && Math.abs(k.y - y) < 14 && !(Math.abs(cx(k.c) - who.x) < 14 && Math.abs(k.y - who.y) < 14)) return true; return false; }
// ---------- bark pump ----------
function bark(s, p) { p.cd = PUMP.cd; p.pumpF = 8; s.stats.pumps++; s.ev.push('bark'); const [dx, dy] = DIRS[p.dir];
  let len = 0; while (len < PUMP.reach && dugAt(s, p.x + dx * (len + 8), p.y + dy * (len + 8))) len += 2; // sound only travels down open tunnel
  const w = { x: p.x, y: p.y, dx, dy, len: 0, max: len + 6, f: PUMP.waveF, hit: null }; s.waves.push(w);
  // the first pest along the wave takes the hit
  let best = null, bd = 1e9; for (const e of s.enemies) { if (e.dead || e.mode === 'phase') continue; const ax = (e.x - p.x) * dx + (e.y - p.y) * dy, off = Math.abs((e.x - p.x) * dy + (e.y - p.y) * dx); if (ax > -4 && ax <= len + 14 && off < 9 && ax < bd) { bd = ax; best = e; } }
  if (best) { w.hit = best; w.max = Math.max(4, bd); pump(s, best); } }
function pump(s, e) { e.fuzz++; e.fuzzT = PUMP.decay; e.mode = 'fluff'; s.ev.push('pump');
  if (e.fuzz >= popHits(s.level)) { e.dead = true; const lay = layerOf(Math.floor(e.y / CELL)), pts = LAYERS[Math.max(0, lay)].pop; s.score += pts; s.stats.pops++; s.ev.push('pop'); fx(s, e.x, e.y, '#7ef0ff', 14); pop(s, e.x, e.y - 10, 'POOF! ' + pts, '#7ef0ff'); s.shake = 0.1; } }
function wavesFrame(s) { for (const w of s.waves) { w.f--; w.len = Math.min(w.max, w.len + PUMP.wave); } s.waves = s.waves.filter((w) => w.f > 0); }
function throwBoom(s, p) { const [dx, dy] = DIRS[p.dir]; s.boom = { x: p.x, y: p.y, dx, dy, out: 0, back: false, hit: new Set(), spin: 0 }; p.boomCd = BOOM.cd * 60; s.stats.booms++; s.ev.push('boom'); }
function boomFrame(s) { const b = s.boom; if (!b) return; b.spin++; const p = s.p;
  if (!b.back) { const nx = b.x + b.dx * BOOM.speed, ny = b.y + b.dy * BOOM.speed; b.out += BOOM.speed; if (b.out >= BOOM.range || !dugAt(s, nx + b.dx * 4, ny + b.dy * 4)) b.back = true; else { b.x = nx; b.y = ny; } }
  else { const ddx = p.x - b.x, ddy = p.y - b.y, d = Math.hypot(ddx, ddy); if (d < 6) { s.boom = null; return; } b.x += (ddx / d) * BOOM.speed; b.y += (ddy / d) * BOOM.speed; }
  for (const e of s.enemies) if (!e.dead && e.mode !== 'phase' && !b.hit.has(e) && Math.abs(e.x - b.x) < 10 && Math.abs(e.y - b.y) < 10) { b.hit.add(e); e.fuzz = Math.max(e.fuzz, 2); e.fuzzT = BOOM.stun; e.mode = 'fluff'; s.ev.push('pump'); fx(s, e.x, e.y, '#fbf1e0', 6); } }
// ---------- pests ----------
function stepTo(s, e, spd, carveIt) { const [dx, dy] = DIRS[e.dir]; e.acc += spd; let moved = 0;
  while (e.acc >= 1) { e.acc -= 1; e.x += dx; e.y += dy; moved++; if (carveIt) carve(s, e.x - 6, e.y - 6, e.x + 6, e.y + 6); if (aligned(e.x) && aligned(e.y)) { e.acc = Math.min(e.acc, 0.999); return true; } } return false; }
const atCentre = (e) => aligned(e.x) && aligned(e.y);
// BFS over open tunnel edges from the pest's cell; returns the first direction toward the target cell (or null)
export function pathDir(s, c0, r0, c1, r1, avoidRocks = true) { if (c0 === c1 && r0 === r1) return null; const prev = new Int16Array(COLS * ROWS).fill(-1), q = [c0 + r0 * COLS]; prev[q[0]] = q[0];
  while (q.length) { const k = q.shift(), c = k % COLS, r = (k / COLS) | 0; if (c === c1 && r === r1) { let n = k; while (prev[n] !== c0 + r0 * COLS) n = prev[n]; const nc = n % COLS, nr = (n / COLS) | 0; return nc > c0 ? 'right' : nc < c0 ? 'left' : nr > r0 ? 'down' : 'up'; }
    for (const d of DN) { const [dx, dy] = DIRS[d], n = c + dx + (r + dy) * COLS; if (prev[n] >= 0 || !edgeOpen(s, c, r, d) || (avoidRocks && rockAt(s, c + dx, r + dy))) continue; prev[n] = k; q.push(n); } } return null; }
function enemyFrame(s, e) {
  const p = s.p, L = s.level, sp = speeds(L), wu = windups(L), hm = s.hurry ? sp.hurry : 1; e.f++;
  if (e.wait > 0) { e.wait--; return; }
  if (e.mode === 'fluff') { if (--e.fuzzT <= 0) { e.fuzz--; e.fuzzT = PUMP.decay; if (e.fuzz <= 0) { e.fuzz = 0; e.mode = 'walk'; snap(e); } } return; }
  if (e.cd > 0) e.cd--;
  const ec = Math.round((e.x - 8) / CELL), er = Math.round((e.y - 8) / CELL), pc = Math.round((p.x - 8) / CELL), pr = Math.round((p.y - 8) / CELL);
  if (e.type === 'snake') {
    if (e.mode === 'hiss') { if (e.f >= wu.hiss) { e.mode = 'strike'; e.f = 0; e.run = 0; } return; }
    if (e.mode === 'strike') { const [dx, dy] = DIRS[e.dir]; let n = Math.floor(sp.strike); e.acc += sp.strike - n; if (e.acc >= 1) { e.acc -= 1; n++; }
      for (let i = 0; i < n; i++) { if (!dugAt(s, e.x + dx * 7, e.y + dy * 7) || e.run >= 48) { e.mode = 'rest'; e.f = 0; snap(e); return; } e.x += dx; e.y += dy; e.run++; } return; }
    if (e.mode === 'rest') { if (e.f > 40) { e.mode = 'walk'; e.cd = 120; snap(e); } return; }
    if (atCentre(e)) { if (e.cd <= 0 && (ec === pc || er === pr) && Math.abs(ec - pc) + Math.abs(er - pr) <= 3 && straightOpen(s, ec, er, pc, pr)) { e.dir = pc > ec ? 'right' : pc < ec ? 'left' : pr > er ? 'down' : 'up'; e.mode = 'hiss'; e.f = 0; s.ev.push('tell'); return; }
      e.dir = pathDir(s, ec, er, pc, pr) || wander(s, e, ec, er); if (!e.dir) return; }
    stepTo(s, e, sp.snake * hm, false); return; }
  if (e.type === 'beetle') {
    if (e.mode === 'shimmer') { if (e.f >= wu.shimmer) { e.mode = 'phase'; e.f = 0; } return; }
    if (e.mode === 'phase') { const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; e.pax = (e.pax || 0) + (dx / d) * sp.phase * hm; e.pay = (e.pay || 0) + (dy / d) * sp.phase * hm;
      const mx = Math.trunc(e.pax), my = Math.trunc(e.pay); e.x += mx; e.y += my; e.pax -= mx; e.pay -= my;
      const c = Math.round((e.x - 8) / CELL), r = Math.round((e.y - 8) / CELL);
      const md = Math.abs(c - pc) + Math.abs(r - pr); if ((e.f > 240 || (md <= 3 && md >= 2)) && cellOpen(s, c, r) && !rockAt(s, c, r)) { e.x = cx(c); e.y = cy(r); e.mode = 'emerge'; e.f = 0; e.cd = 300; fx(s, e.x, e.y, '#c58cff', 8); } return; }
    if (e.mode === 'emerge') { if (e.f >= 36) e.mode = 'walk'; return; } // solid again but dazed for a moment: harmless, pumpable
    if (atCentre(e)) { const path = pathDir(s, ec, er, pc, pr); const far = Math.abs(ec - pc) + Math.abs(er - pr);
      if (e.cd <= 0 && far <= 8 && far >= 3 && (!path || far >= 4)) { e.mode = 'shimmer'; e.f = 0; s.ev.push('tell'); return; }
      e.dir = path || wander(s, e, ec, er); if (!e.dir) return; }
    stepTo(s, e, sp.beetle * hm, false); return; }
  // mole: walks tunnels toward you; every few seconds (or when cut off) it tunnels straight at you through the dirt
  if (e.mode === 'burrow') { if (atCentre(e)) { e.dug++; if (e.dug > 5 || (e.dug > 1 && pathDir(s, ec, er, pc, pr))) { e.mode = 'walk'; e.cd = burrowEvery(L) * 60; } else { const d = burrowDir(s, ec, er, pc, pr); if (!d) { e.mode = 'walk'; e.cd = 60; return; } e.dir = d; } }
    stepTo(s, e, sp.burrow * hm, true); return; }
  if (atCentre(e)) { const path = pathDir(s, ec, er, pc, pr);
    if (!path || e.cd <= 0) { const d = burrowDir(s, ec, er, pc, pr); if (d && (!path || d !== path)) { e.mode = 'burrow'; e.dug = 0; e.dir = d; stepTo(s, e, sp.burrow * hm, true); return; } }
    e.dir = path || wander(s, e, ec, er); if (!e.dir) return; }
  stepTo(s, e, sp.mole * hm, false);
}
function snap(e) { e.x = cx(Math.round((e.x - 8) / CELL)); e.y = cy(Math.round((e.y - 8) / CELL)); e.acc = 0; }
function straightOpen(s, c0, r0, c1, r1) { const d = c1 > c0 ? 'right' : c1 < c0 ? 'left' : r1 > r0 ? 'down' : 'up', [dx, dy] = DIRS[d]; let c = c0, r = r0; while (c !== c1 || r !== r1) { if (!edgeOpen(s, c, r, d)) return false; c += dx; r += dy; } return true; }
function wander(s, e, c, r) { const back = { left: 'right', right: 'left', up: 'down', down: 'up' }[e.dir]; const opts = DN.filter((d) => edgeOpen(s, c, r, d) && !rockAt(s, c + DIRS[d][0], r + DIRS[d][1]));
  const fwd = opts.filter((d) => d !== back); const pick = fwd.length ? fwd : opts; return pick.length ? pick[Math.floor(s.rnd() * pick.length)] : null; }
function burrowDir(s, c, r, pc, pr) { const dc = pc - c, dr = pr - r; const order = Math.abs(dc) >= Math.abs(dr) ? [dc > 0 ? 'right' : 'left', dr > 0 ? 'down' : 'up'] : [dr > 0 ? 'down' : 'up', dc > 0 ? 'right' : 'left'];
  for (const d of order) { if ((d === 'left' || d === 'right') && !dc) continue; if ((d === 'up' || d === 'down') && !dr) continue; const nc = c + DIRS[d][0], nr = r + DIRS[d][1]; if (nr < 1 || nc < 0 || nc >= COLS || nr >= ROWS || rockAt(s, nc, nr)) continue; return d; } return null; }
// ---------- boulders ----------
function rocksFrame(s) { const wu = windups(s.level);
  for (const k of s.rocks) { if (k.gone) continue; const r = Math.round(k.y / CELL - 0.5);
    if (k.st === 'rest') { if (r + 1 < ROWS && dugAt(s, cx(k.c), k.y + 8 + 3)) { k.st = 'wobble'; k.f = 0; s.ev.push('wobble'); } } // tunnel right under it: wobble, then drop
    else if (k.st === 'wobble') { if (++k.f >= wu.wobble) { k.st = 'fall'; k.f = 0; k.vy = 0; } }
    else if (k.st === 'fall') { k.vy = Math.min(2.5, (k.vy || 0) + 0.12); k.fy = (k.fy || 0) + k.vy; const n = Math.floor(k.fy); k.fy -= n;
      for (let i = 0; i < n; i++) { const below = k.y + 8; if (below + 3 >= ROWS * CELL || !dugAt(s, cx(k.c), below + 3)) { land(s, k); break; } k.y++; }
      if (k.st === 'fall') { for (const e of s.enemies) if (!e.dead && e.mode !== 'phase' && Math.abs(e.x - cx(k.c)) < 12 && e.y - k.y > -4 && e.y - k.y < 14) { e.dead = true; e.crushed = true; k.kills++; fx(s, e.x, e.y, '#c9a36a', 10); }
        const p = s.p; if (!s.dying && Math.abs(p.x - cx(k.c)) < 11 && p.y - k.y > -2 && p.y - k.y < 14) die(s, 'rock'); } }
    else if (k.st === 'crumble') { if (++k.f > 30) k.gone = true; } } }
function land(s, k) { k.st = 'crumble'; k.f = 0; s.ev.push('thud'); s.shake = 0.15; s.rocksDropped++;
  if (k.kills) { const pts = PTS.crush[Math.min(k.kills, PTS.crush.length) - 1]; s.score += pts; s.stats.crushes += k.kills; s.stats.bestCrush = Math.max(s.stats.bestCrush, k.kills); s.ev.push('pop'); pop(s, cx(k.c), k.y - 12, 'CRUSH! ' + pts, '#f2c14e'); }
  if (s.rocksDropped === 2 && !s.treatGiven) { s.treatGiven = true; s.treat = { c: START.c, r: START.r, t: TREAT_SECS * 60 }; s.ev.push('blip'); pop(s, cx(START.c), 14, 'TREAT!', '#ff9ad5'); } }
// ---------- pickups / contact ----------
function near(p, c, r, d = 7) { return Math.abs(p.x - cx(c)) <= d && Math.abs(p.y - cy(r)) <= d; }
function pickups(s) { const p = s.p;
  for (const b of s.bones) if (!b.got && near(p, b.c, b.r)) { b.got = true; s.score += PTS.bone; s.stats.bones++; s.ev.push('bone'); pop(s, cx(b.c), cy(b.r) - 10, 'BONE +' + PTS.bone, '#fbf1e0'); fx(s, cx(b.c), cy(b.r), '#fbf1e0', 8); }
  for (const k of s.kibble) if (!k.got && near(p, k.c, k.r)) { k.got = true; s.score += PTS.kibble; s.ev.push('blip'); }
  for (const k of s.coins) if (!k.got && near(p, k.c, k.r)) { k.got = true; s.score += PTS.coin; s.stats.coins++; s.ev.push('coin'); pop(s, cx(k.c), cy(k.r) - 10, '$KIBBLE +' + PTS.coin, '#f2c14e'); }
  if (s.gold && near(p, s.gold.c, s.gold.r)) { s.score += PTS.gbone; s.stats.gbones++; s.ev.push('coin'); pop(s, cx(s.gold.c), cy(s.gold.r) - 10, 'GOLDEN BONE ' + PTS.gbone, '#f2c14e'); s.gold = null; }
  if (s.treat && near(p, s.treat.c, s.treat.r, 8)) { const pts = PTS.treat(s.level); s.score += pts; s.stats.treats++; s.ev.push('coin'); pop(s, p.x, p.y - 12, 'TREAT ' + pts, '#ff9ad5'); s.treat = null; } }
function placeGold(s) { const p = s.p; const opts = []; for (let r = 2; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!cellOpen(s, c, r) && !rockAt(s, c, r) && Math.abs(cx(c) - p.x) + Math.abs(cy(r) - p.y) > 64 && !s.bones.some((b) => b.c === c && b.r === r)) opts.push([c, r]);
  if (!opts.length) return; const [c, r] = opts[Math.floor(s.rnd() * opts.length)]; s.gold = { c, r, t: GOLD_SECS * 60 }; s.ev.push('blip'); }
export const harmful = (e) => !e.dead && e.wait <= 0 && !['fluff', 'phase', 'shimmer', 'emerge'].includes(e.mode);
function contact(s) { const p = s.p; if (s.dying) return; for (const e of s.enemies) if (harmful(e) && Math.abs(e.x - p.x) < 10 && Math.abs(e.y - p.y) < 10) return die(s, e.type); }
function die(s, why) { s.dying = 90; s.lastDeath = why; s.ev.push('die'); s.shake = 0.3; s.flash = 0.6; fx(s, s.p.x, s.p.y, '#ff5d73', 10); }
function afterDeath(s) { s.lives--; if (s.lives <= 0) { s.over = true; return; } resetPlayer(s); s.waves = []; s.boom = null;
  for (const e of s.enemies) if (!e.dead) { e.x = cx(e.home.c); e.y = cy(e.home.r); e.mode = 'walk'; e.fuzz = 0; e.acc = 0; e.wait = 60; e.cd = 120; } s.ready = 60; }
// ---------- bot (attract mode + human-sim) ----------
export function bot(s) { const o = {}, p = s.p; if (s.ready || s.dying || s.clearing) return o;
  const pc = Math.round((p.x - 8) / CELL), pr = Math.round((p.y - 8) / CELL), al = aligned(p.x) && aligned(p.y);
  const pressA = () => { if (!p.prevA) o.a = true; return o; };
  // 1) boulders: never stand under a wobbling or falling one
  for (const k of s.rocks) if (!k.gone && (k.st === 'wobble' || k.st === 'fall') && Math.abs(cx(k.c) - p.x) < 14 && p.y > k.y - 4) {
    if (!aligned(p.y)) { o.down = true; return o; } // finish the step away from the boulder before turning
    const kx = cx(k.c), side = p.x > kx ? 'right' : p.x < kx ? 'left' : null, c0 = Math.floor(p.x / CELL);
    const can = (d) => (d === 'left' ? c0 > 0 && !rockAt(s, c0 - 1, pr) : c0 < COLS - 1 && !rockAt(s, c0 + 1, pr));
    o[side && can(side) ? side : can('left') && (cellOpen(s, c0 - 1, pr) || !can('right')) ? 'left' : 'right'] = true; return o; }
  // 2) pests: pump anything in line down the tunnel, back off from the rest
  let thr = null, td = 1e9; for (const e of s.enemies) { if (e.dead || e.wait > 0) continue; const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y); if (d < td) { td = d; thr = e; } }
  if (thr && td < 64) { const e = thr, dx = e.x - p.x, dy = e.y - p.y, inRow = Math.abs(dy) < 6, inCol = Math.abs(dx) < 6;
    if ((inRow || inCol) && e.mode !== 'phase') { const d = inRow ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), dist = inRow ? Math.abs(dx) : Math.abs(dy), [ux, uy] = DIRS[d];
      let open = true; for (let k = 8; k < dist - 6; k += 2) if (!dugAt(s, p.x + ux * k, p.y + uy * k)) { open = false; break; }
      if (open && dist <= PUMP.reach + 12) { if (p.dir !== d) { o[d] = true; return o; } if (s.inu && p.boomCd <= 0 && !s.boom && e.mode !== 'fluff' && dist >= 44) { if (p.charge < BOOM.charge + 2) { o.a = true; return o; } return o; } return pressA(); } }
    if (harmful(e) && td < 30 || (e.type === 'snake' && e.mode === 'hiss')) { const away = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'up' : 'down'), [ax, ay] = DIRS[away];
      const ok = (d) => { const [x, y] = DIRS[d]; return pc + x >= 0 && pc + x < COLS && pr + y >= 0 && pr + y < ROWS && !rockAt(s, pc + x, pr + y); };
      if (e.type === 'snake' && e.mode === 'hiss') { for (const d of (Math.abs(dx) > Math.abs(dy) ? ['up', 'down'] : ['left', 'right'])) if (ok(d) && cellOpen(s, pc + DIRS[d][0], pr + DIRS[d][1])) { o[d] = true; return o; } }
      if (ok(away)) { o[away] = true; return o; } } }
  // 3) go dig: cheapest route to the nearest prize (Dijkstra over cells; soil costs more deeper; pests and boulders avoided)
  const goal = target(s, pc, pr); if (!goal) return o;
  if (goal.c === pc && goal.r === pr) { const gx = goal.c * CELL + 8, gy = goal.r * CELL + 8; o[gx > p.x ? 'right' : gx < p.x ? 'left' : gy > p.y ? 'down' : 'up'] = true; return o; }
  const d = route(s, pc, pr, goal); if (d) o[d] = true; else o[pc < 8 ? 'right' : 'left'] = true; return o; }
function target(s, pc, pr) { const list = [...s.bones.filter((b) => !b.got).map((b) => ({ c: b.c, r: b.r, w: 0 })), ...s.coins.filter((k) => !k.got).map((k) => ({ c: k.c, r: k.r, w: 1 }))];
  if (s.gold) list.push({ c: s.gold.c, r: s.gold.r, w: -6 }); if (s.treat) list.push({ c: s.treat.c, r: s.treat.r, w: -8 });
  let best = null, bd = 1e9; for (const t of list) { const d = Math.abs(t.c - pc) + Math.abs(t.r - pr) + t.w; if (d < bd) { bd = d; best = t; } } return best; }
function route(s, pc, pr, g) { const N = COLS * ROWS, dist = new Float32Array(N).fill(1e9), prev = new Int16Array(N).fill(-1), done = new Uint8Array(N); const st = pc + pr * COLS; dist[st] = 0;
  const danger = new Float32Array(N); for (const e of s.enemies) if (!e.dead) { const c = Math.round((e.x - 8) / CELL), r = Math.round((e.y - 8) / CELL); for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { const cc = c + x, rr = r + y; if (cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS) danger[cc + rr * COLS] += Math.max(0, 14 - 5 * (Math.abs(x) + Math.abs(y))); } }
  for (const k of s.rocks) if (!k.gone) { const r = Math.round(k.y / CELL - 0.5); for (let y = 1; y <= 3 && r + y < ROWS; y++) danger[k.c + (r + y) * COLS] += y === 1 ? 6 : 2; }
  for (let it = 0; it < N; it++) { let u = -1, ud = 1e9; for (let i = 0; i < N; i++) if (!done[i] && dist[i] < ud) { ud = dist[i]; u = i; } if (u < 0) break; done[u] = 1; const c = u % COLS, r = (u / COLS) | 0; if (c === g.c && r === g.r) break;
    for (const d of DN) { const [dx, dy] = DIRS[d], nc = c + dx, nr = r + dy; if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || rockAt(s, nc, nr)) continue; const v = nc + nr * COLS; const lay = layerOf(nr);
      const cost = edgeOpen(s, c, r, d) ? 1 : 1 / (lay < 0 ? 1 : LAYERS[lay].dig) + 0.3; const nd = ud + cost + danger[v]; if (nd < dist[v]) { dist[v] = nd; prev[v] = u; } } }
  let v = g.c + g.r * COLS; if (prev[v] < 0 && v !== st) return null; while (prev[v] !== st && prev[v] >= 0) v = prev[v]; if (v === st) return null; const nc = v % COLS, nr = (v / COLS) | 0;
  return nc > pc ? 'right' : nc < pc ? 'left' : nr > pr ? 'down' : 'up'; }
export const ghostPos = (s) => ({ x: s.p.x, y: s.p.y + OY });
export { draw } from './digger-art.js';
