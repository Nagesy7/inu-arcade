// STREET SNIFFER (working name: pending Zachary's approval; rename via NAME below) — original Inu city-street chase.
// 32x27 tiles of 8px, 256x256 native. A Shiba sniffs kibble along city streets while the cat gang (shared personality system,
// src/core/cats.js) hunts. Unlike Kibble Chomp: an original city-block street map with alleys, two avenues of traffic that
// dog AND cats must dodge, one-way alleys both must obey, bins to hide in (cats lose track), and power-ups that never make
// cats edible: a squeaky-toy lure, fire-hydrant splash and a delivery-scooter dash. Classic = these rules at classic
// difficulty; Inu Mode: power-ups go in your pocket (A to use) and $KIBBLE coins appear.
import { rng } from '../core/rng.js';
import { personalityTarget } from '../core/cats.js';
export const NAME = 'Street Sniffer'; // single source of the player-facing name (working name)
export const META = { id: 'street-sniffer', title: NAME.toUpperCase(), short: 'SNIFF', color: '#5fd3c8',
  blurb: 'Sniff out every kibble on the city streets. Dodge traffic on the avenues, obey the one-way alleys, duck behind bins to lose the cat gang.',
  controls: 'Arrows / WASD / D-pad / stick to steer',
  inuMove: 'POCKET (A): power-ups are pocketed and used when you choose. $KIBBLE coins (+500) appear twice per city.',
  classicNote: 'Power-ups fire as soon as you grab them.' };
export const W = 256, H = 256, OY = 24, COLS = 32, ROWS = 27, TILE = 8;
// Original Inu city map. # building, . street with kibble, space = street, = avenue (traffic), > < ^ v one-way alley,
// b bin (hide), h fire hydrant, P power-up spot, C/H cat cafe walls/inside, - cafe door (cats only).
export const MAP = [
  '################################',
  '#.....h........................#',
  '#.####.####.#v#.####.#########.#',
  '#.>>>>.####.#v#.####b#########.#',
  '#.####.####.#v#.####.#########.#',
  '#..............P..............h#',
  '#.####.####.########.####.##.#.#',
  '#.####.####.########.####.##P#.#',
  '#.####.####.########.####.##.#.#',
  '#==============================#',
  '#.####.####.        .####.####.#',
  '#b####.####.#CC--CC#.####.####.#',
  '#.####.####.#CHHHHC#.####.####.#',
  '#...........#CHHHHC#...........#',
  '#.#########.#CHHHHC#.##v#.####.#',
  '#.#########.#CCCCCC#.##v#.####b#',
  '#.#########.########.##v#.####.#',
  '#==============================#',
  '#.#.##.####.########.####.####.#',
  '#.#P##b####.########.####.####.#',
  '#.#.##.####.########.####.####.#',
  '#h..............P..............#',
  '#.####.#^##.####.###.####.####.#',
  '#.####.#^##b####.###.####.<<<<.#',
  '#.####.#^##.####.###.####.####.#',
  '#...................h..........#',
  '################################',
];
export const AVENUES = [{ row: 9, dir: 1 }, { row: 17, dir: -1 }]; // one-way traffic: eastbound top, westbound bottom
export const PTS = { kibble: 10, power: 50, soak: 200, honk: 100, bump: 50, cross: 25, coin: 500, extraLifeAt: 10000 };
const PX = 1.25; // reference speed, px per frame (75 px/s)
// Street Sniffer speed tables (fraction of PX), ramps level off by level 10
export function speeds(level) { const L = Math.min(level, 10) - 1;
  return { dog: Math.min(0.98, 0.84 + 0.016 * L), dash: 1.45, cat: Math.min(0.94, 0.52 + 0.045 * L), catAlley: 0.8 /* x cat speed in one-way alleys */ }; }
export const carSpeed = (level, lane, rush = false) => Math.min(1.6, 0.5 + 0.09 * (Math.min(level, 12) - 1)) * (lane === 1 ? 1.15 : 1) * (rush ? 1.2 : 1); // px/frame
export const carCount = (level) => Math.min(4, 2 + Math.floor((level - 1) / 2));
export const RUSH_HOUR = 0.25; // <= 25% kibble left: traffic +20%
// patrol/hunt clock (seconds) [patrol, hunt, patrol, hunt, ...]: patrols shrink each cycle and level, last hunt never ends
export function moodTable(level) { const out = []; let p = Math.max(2, 7 - 0.6 * (level - 1)); for (let i = 0; i < 3; i++) { out.push(p, 16 + 2 * i + Math.min(level, 8)); p = Math.max(1, p - 1); } out.push(p, Infinity); return out; }
export const releaseAt = (level) => [0, 3, 7, 11].map((t) => Math.round(t * Math.max(0.45, 1 - 0.1 * (level - 1)) * 100) / 100); // seconds into the round
export const RELEASE_KIBBLE = 15;
export const lureSecs = (level) => Math.max(3, 7 - 0.5 * (level - 1));
export const dashSecs = (level) => Math.max(2.5, 4.5 - 0.25 * (level - 1));
export const binSecs = (level) => Math.max(2.5, 4.5 - 0.25 * (level - 1)); // max hide time, then the lid pops
export const BIN_CD = 12, HYDRANT_CD = 20, SPRAY = { secs: 1.5, len: 6 }, POWER = { every: 45, life: 10 }, COIN = { at: [80, 160], life: 12 };
export const POWERS = ['toy', 'scooter'];
export const clearBonus = (level) => Math.min(1500, 300 + 150 * (level - 1));
export const CAT0_STRETCH = 3; // seconds
export const BEDS = [{ x: 1, y: 1 }, { x: 30, y: 1 }, { x: 1, y: 25 }, { x: 30, y: 25 }]; // patrol corners
export const TRAIL_LAG = 8, MOODY_SWAP = 3, DOOR = { x: 15, y: 10 }, DOOR_X = 128;
export const CAT_COLORS = ['#7a8aa8', '#e8e4dc', '#e07a2a', '#3a3440'] /* grey, white, ginger, black alley cat */, CAT_NAMES = ['SOOT', 'MITTENS', 'MARMALADE', 'NOIR'];
const DIRS = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] }, OPP = { up: 'down', down: 'up', left: 'right', right: 'left' }, ORDER = ['up', 'left', 'down', 'right'];
const ONEWAY = { '>': 'right', '<': 'left', '^': 'up', v: 'down' };
export const tileAt = (tx, ty) => (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS ? '#' : MAP[ty][tx]);
export const isBlock = (tx, ty) => '#CH-'.includes(tileAt(tx, ty));
export const oneWay = (tx, ty) => ONEWAY[tileAt(tx, ty)] || null;
export const isAvenue = (ty) => AVENUES.some((a) => a.row === ty);
// can an actor standing on (tx,ty) move one tile in dir? One-way alleys: never enter or move against the arrow.
export function canMove(tx, ty, dir, door = false) { const [dx, dy] = DIRS[dir], nx = tx + dx, ny = ty + dy; const c = tileAt(nx, ny);
  if (c === '-') return door; if (isBlock(nx, ny)) return false;
  const here = oneWay(tx, ty), there = oneWay(nx, ny); if (here && dir !== here) return false; if (there && dir !== there) return false; return true; }
const tileOf = (a) => ({ x: Math.floor(a.x / TILE), y: Math.floor(a.y / TILE) });
const atCenter = (a) => a.x % 8 === 4 && a.y % 8 === 4;
const key = (x, y) => x + ',' + y;
const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y: y + OY, c, n }), pop = (s, x, y, text, c = '#7ef0ff') => s.pops.push({ x, y: y + OY, text, c, t: 1 });
export const SPOTS = (() => { const o = { bins: [], hydrants: [], power: [] }; MAP.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'b') o.bins.push({ x, y }); if (c === 'h') o.hydrants.push({ x, y }); if (c === 'P') o.power.push({ x, y }); })); return o; })();
const COIN_SPOTS = [[6, 13], [25, 13], [11, 21], [20, 5]];
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, over: false, t: 0, ev: [], fx: [], pops: [], shake: 0, flash: 0, acc: 0, frame: 0, extra: false,
    pocket: null, coin: null, stats: { hides: 0, soaked: 0, honks: 0, crossings: 0, powers: 0, coins: 0, cats: 0, pockets: 0 } };
  loadLevel(s); return s;
}
function loadLevel(s) {
  s.kibble = new Set(); MAP.forEach((r, y) => [...r].forEach((c, x) => { if (c === '.' || ONEWAY[c]) s.kibble.add(key(x, y)); }));
  s.total = s.kibble.size; s.eaten = 0; s.retry = false; s.binCd = {}; s.hydCd = {}; s.power = null; s.powerN = 0; s.coin = null;
  s.cars = AVENUES.map((a, lane) => { const n = carCount(s.level), span = W + 48; return Array.from({ length: n }, (_, i) => ({ lane, x: Math.round(-24 + (i * span) / n + s.rnd() * 20), acc: 0, len: 16, kind: Math.floor(s.rnd() * 3) })); }).flat();
  resetActors(s); s.ready = 120;
}
export const kibbleLeft = (s) => s.kibble.size;
export const rushHour = (s) => kibbleLeft(s) <= Math.round(s.total * RUSH_HOUR);
function resetActors(s) {
  s.dog = { x: 15 * 8 + 4, y: 21 * 8 + 4, dir: 'left', want: 'left', acc: 0, anim: 0, hidden: 0, released: false, side: null };
  s.cats = [0, 1, 2, 3].map((i) => ({ i, color: CAT_COLORS[i], x: i === 0 ? DOOR.x * 8 + 4 : [116, 128, 140][i - 1], y: i === 0 ? DOOR.y * 8 + 4 : 108, dir: i === 0 ? 'left' : 'up', acc: 0, state: i === 0 ? 'out' : 'house', eyes: false, stun: 0, sit: false, bumped: false }));
  s.phase = 0; s.phaseF = 0; s.roundF = 0; s.sinceRelease = 0; s.trail = []; s.freeze = 0; s.lure = null; s.dash = 0; s.spray = null;
}
export const patrolling = (s) => s.phase % 2 === 0;
// ---------- step: fixed 60 Hz integer frames (integer-pixel movement = no jitter) ----------
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.flash = Math.max(0, s.flash - dt); s.shake = Math.max(0, s.shake - dt);
  const anyDir = ORDER.some((d) => inp[d]);
  if (s.dog.hidden > 0) { const t = tileOf(s.dog), go = ORDER.find((d) => inp[d] && canMove(t.x, t.y, d)); if (!anyDir) s.dog.released = true; else if (s.dog.released && go) { unhide(s); s.dog.dir = go; s.dog.parked = false; } } // leave only in a direction you can actually go
  for (const d of ORDER) if (inp[d]) s.dog.want = d;
  if (s.inu && inp.a && s.pocket && !s.ready && !s.freeze) { const k = s.pocket; s.pocket = null; s.stats.pockets++; usePower(s, k); }
  s.acc += dt * 60; while (s.acc >= 1 && !s.over) { s.acc -= 1; frame(s); }
}
function frame(s) {
  s.frame++; s.t += 1 / 60;
  if (s.ready > 0) { s.ready--; moveCars(s); return; }
  if (s.freeze > 0) { s.freeze--; if (s.freeze === 0 && s.dying) { s.dying = false; afterDeath(s); } if (s.freeze === 0 && s.clearing) { s.clearing = false; s.level++; s.ev.push('level'); loadLevel(s); } return; }
  const tbl = moodTable(s.level); s.phaseF++; if (s.phase < tbl.length - 1 && s.phaseF >= Math.round(tbl[s.phase] * 60)) { s.phase++; s.phaseF = 0; }
  s.roundF++;
  if (s.dog.hidden <= 0 && s.frame % 8 === 0) { const t = tileOf(s.dog); const last = s.trail[s.trail.length - 1]; if (!last || last.x !== t.x || last.y !== t.y) { s.trail.push(t); if (s.trail.length > 32) s.trail.shift(); } }
  for (const k in s.binCd) if (s.binCd[k] > 0) s.binCd[k]--; for (const k in s.hydCd) if (s.hydCd[k] > 0) s.hydCd[k]--;
  if (s.dash > 0) s.dash--; if (s.lure && --s.lure.f <= 0) { s.lure = null; for (const c of s.cats) c.sit = false; }
  if (s.spray && --s.spray.f <= 0) s.spray = null;
  if (s.dog.hidden > 0 && --s.dog.hidden <= 0) unhide(s);
  moveDog(s); if (s.over || s.freeze) return;
  moveCars(s); houseLogic(s);
  for (const c of s.cats) moveCat(s, c);
  if (s.spray) soak(s);
  collide(s); if (s.freeze) return;
  if (s.power && --s.power.f <= 0) s.power = null;
  if (s.coin && --s.coin.f <= 0) s.coin = null;
  if (!s.extra && s.score >= PTS.extraLifeAt) { s.extra = true; s.lives++; s.ev.push('pow'); }
}
export function dogSpeed(s) { const sp = speeds(s.level); return (s.dash > 0 ? sp.dash : sp.dog) * PX; }
export function catSpeed(s, c) { const sp = speeds(s.level); if (c.eyes) return 2 * PX; if (c.state !== 'out') return 0.5 * PX; const t = tileOf(c); return sp.cat * (oneWay(t.x, t.y) ? sp.catAlley : 1) * PX; }
function moveDog(s) { const D = s.dog; if (D.hidden > 0) return; D.acc += dogSpeed(s); while (D.acc >= 1) { D.acc -= 1; dogPixel(s); if (s.freeze || s.over || D.hidden > 0) return; } }
function dogPixel(s) {
  const D = s.dog, t = tileOf(D), cx = t.x * 8 + 4, cy = t.y * 8 + 4, centred = D.x === cx && D.y === cy;
  if (D.parked) { if (D.want && canMove(t.x, t.y, D.want)) { D.dir = D.want; D.parked = false; } else return; }
  if (D.want && D.want !== D.dir) { if (D.want === OPP[D.dir] && !oneWay(t.x, t.y)) D.dir = D.want; else if (centred && canMove(t.x, t.y, D.want)) D.dir = D.want; }
  const [dx, dy] = DIRS[D.dir];
  if (centred && !canMove(t.x, t.y, D.dir)) return; // blocked (wall or against a one-way arrow)
  D.x += dx; D.y += dy; if (dx && D.y !== cy) D.y += Math.sign(cy - D.y); if (dy && D.x !== cx) D.x += Math.sign(cx - D.x); D.anim++;
  const nt = tileOf(D); if (D.x !== nt.x * 8 + 4 || D.y !== nt.y * 8 + 4) return; // tile events fire at tile centres
  const k = key(nt.x, nt.y), c = tileAt(nt.x, nt.y);
  if (s.kibble.delete(k)) { s.score += PTS.kibble; ateKibble(s); s.ev.push('chomp'); }
  // avenue crossing bonus: entered from one side, left on the other
  if (isAvenue(nt.y)) D.side ??= Math.sign(dy) || null; else if (D.side) { if (Math.sign(dy) === D.side) { s.score += PTS.cross; s.stats.crossings++; pop(s, D.x, D.y - 8, '+' + PTS.cross, '#f2c14e'); } D.side = null; }
  if (s.power && s.power.x === nt.x && s.power.y === nt.y) { const kind = s.power.kind; s.power = null; s.score += PTS.power; s.stats.powers++; s.ev.push('pow');
    if (s.inu && !s.pocket) { s.pocket = kind; pop(s, D.x, D.y - 8, 'POCKET: ' + label(kind), '#f2c14e'); } else usePower(s, kind); }
  if (s.coin && s.coin.x === nt.x && s.coin.y === nt.y) { s.score += PTS.coin; s.stats.coins++; s.coin = null; s.ev.push('coin'); pop(s, D.x, D.y - 8, '+500 $KIBBLE', '#f2c14e'); fx(s, D.x, D.y, '#f2c14e', 14); }
  if (c === 'h' && !(s.hydCd[k] > 0)) { s.hydCd[k] = HYDRANT_CD * 60; s.spray = { x: nt.x, y: nt.y, dir: D.dir, f: Math.round(SPRAY.secs * 60), tiles: sprayTiles(nt.x, nt.y, D.dir) }; s.ev.push('splash'); fx(s, D.x, D.y, '#9fd0ff', 16); }
  if (c === 'b' && !(s.binCd[k] > 0) && s.dash <= 0) { D.hidden = Math.round(binSecs(s.level) * 60); D.released = false; D.bin = k; s.stats.hides++; s.trail = []; s.ev.push('hide'); }
}
const label = (k) => (k === 'toy' ? 'SQUEAKY TOY' : 'SCOOTER');
function unhide(s) { const D = s.dog; if (D.hidden <= 0 && !D.bin) return; D.hidden = 0; if (D.bin) s.binCd[D.bin] = BIN_CD * 60; D.bin = null; D.parked = true; D.want = null; s.ev.push('blip'); } // pops out and waits for a fresh direction
export function sprayTiles(x, y, dir) { const out = [{ x, y }]; const [dx, dy] = DIRS[dir]; for (let i = 1; i <= SPRAY.len; i++) { const nx = x + dx * i, ny = y + dy * i; if (isBlock(nx, ny)) break; out.push({ x: nx, y: ny }); } return out; }
function usePower(s, kind) { const D = s.dog, t = tileOf(D);
  if (kind === 'toy') { s.lure = { x: t.x, y: t.y, f: Math.round(lureSecs(s.level) * 60) }; s.ev.push('squeak'); pop(s, D.x, D.y - 8, 'SQUEAK!', '#ff9ad0'); }
  else { s.dash = Math.round(dashSecs(s.level) * 60); for (const c of s.cats) c.bumped = false; s.ev.push('dash'); pop(s, D.x, D.y - 8, 'DASH!', '#7ef0ff'); } }
function ateKibble(s) {
  s.eaten++; s.sinceRelease++;
  if (s.eaten % POWER.every === 0) { const p = SPOTS.power[Math.floor(s.rnd() * SPOTS.power.length)]; s.power = { x: p.x, y: p.y, kind: POWERS[s.powerN++ % POWERS.length], f: POWER.life * 60 }; }
  if (s.inu && COIN.at.includes(s.eaten)) { const [x, y] = COIN_SPOTS[Math.floor(s.rnd() * COIN_SPOTS.length)]; s.coin = { x, y, f: COIN.life * 60 }; }
  if (kibbleLeft(s) === 0) { s.clearing = true; s.freeze = 120; const b = clearBonus(s.level); s.score += b; s.ev.push('home'); pop(s, 128, 100, 'CITY CLEAN +' + b, '#f2c14e'); }
}
// ---------- traffic ----------
function moveCars(s) { const rush = rushHour(s);
  for (const car of s.cars) { const a = AVENUES[car.lane]; car.acc += carSpeed(s.level, car.lane, rush); while (car.acc >= 1) { car.acc -= 1; car.x += a.dir; }
    if (a.dir > 0 && car.x > W + 24) car.x -= W + 48; if (a.dir < 0 && car.x < -24 - car.len) car.x += W + 48; } }
export const carRect = (car) => ({ x: car.x, y: AVENUES[car.lane].row * 8 + 1, w: car.len, h: 6 });
const hitCar = (s, a, pad = 1) => s.cars.some((car) => { const r = carRect(car); return a.x + 3 - pad > r.x && a.x - 3 + pad < r.x + r.w && a.y + 3 > r.y && a.y - 3 < r.y + r.h; });
// is a car about to reach tile (tx, row) within `tiles` tiles?
export function carNear(s, tx, ty, tiles = 3) { const lane = AVENUES.findIndex((a) => a.row === ty); if (lane < 0) return false; const a = AVENUES[lane], cx = tx * 8 + 4;
  return s.cars.some((car) => car.lane === lane && (a.dir > 0 ? cx - (car.x + car.len) >= -10 && cx - (car.x + car.len) < tiles * 8 : car.x - cx >= -10 && car.x - cx < tiles * 8)); }
// ---------- cats ----------
function houseLogic(s) { const pref = s.cats.find((c) => c.state === 'house'); if (!pref) return;
  if (s.roundF >= Math.round(releaseAt(s.level)[pref.i] * (s.retry ? 0.6 : 1) * 60) || s.sinceRelease >= RELEASE_KIBBLE) { pref.state = 'leaving'; s.sinceRelease = 0; } }
function moveCat(s, c) {
  if (c.i === 0 && !c.eyes && s.roundF < CAT0_STRETCH * 60) return; // the lead cat stretches on the cafe step before the round starts proper
  if (c.stun > 0) { c.stun -= 1 / 60; return; } if (c.sit) return;
  c.acc += catSpeed(s, c);
  while (c.acc >= 1) { c.acc -= 1;
    if (c.state === 'house') { c.y += c.dir === 'up' ? -1 : 1; if (c.y <= 104) c.dir = 'down'; if (c.y >= 112) c.dir = 'up'; continue; }
    if (c.state === 'leaving') { if (c.x !== DOOR_X) { c.x += Math.sign(DOOR_X - c.x); continue; } if (c.y > DOOR.y * 8 + 4) { c.y--; continue; } c.state = 'out'; c.dir = 'left'; continue; }
    if (c.state === 'entering') { if (c.x !== DOOR_X) { c.x += Math.sign(DOOR_X - c.x); continue; } if (c.y < 108) { c.y++; continue; } c.eyes = false; c.state = 'leaving'; continue; }
    if (atCenter(c)) { const t = tileOf(c);
      if (c.eyes && t.x === DOOR.x && t.y === DOOR.y) { c.state = 'entering'; continue; }
      if (s.lure && !c.eyes && t.x === s.lure.x && t.y === s.lure.y) { c.sit = true; return; }
      c.dir = chooseDir(s, c); }
    const [dx, dy] = DIRS[c.dir]; c.x += dx; c.y += dy;
  }
}
export function catTarget(s, c) {
  if (c.eyes) return DOOR;
  if (s.lure) return { x: s.lure.x, y: s.lure.y };
  if (s.dog.hidden > 0 || patrolling(s)) return BEDS[c.i]; // lost track (dog in a bin) or on patrol
  const guards = [...SPOTS.hydrants, ...(s.power ? [s.power] : [])];
  return personalityTarget(c.i, { P: tileOf(s.dog), dir: s.dog.dir, trail: s.trail, lag: TRAIL_LAG, guards, pounce: 4, flank: 4, beds: BEDS, roundF: s.roundF, swap: MOODY_SWAP });
}
function chooseDir(s, c) {
  const t = tileOf(c), door = c.eyes; let opts = ORDER.filter((d) => d !== OPP[c.dir] && canMove(t.x, t.y, d, door));
  if (!opts.length) opts = ORDER.filter((d) => canMove(t.x, t.y, d, door)); if (!opts.length) return c.dir;
  const safe = opts.filter((d) => { const ny = t.y + DIRS[d][1], nx = t.x + DIRS[d][0]; return !isAvenue(ny) || !carNear(s, nx, ny, 3); }); // cats dodge traffic too
  if (safe.length) opts = safe; else { const back = OPP[c.dir], bx = t.x + DIRS[back][0], by = t.y + DIRS[back][1]; if (canMove(t.x, t.y, back, door) && (!isAvenue(by) || !carNear(s, bx, by, 3))) return back; } // boxed in by traffic: turn back
  const tg = catTarget(s, c); let best = opts[0], bd = Infinity;
  for (const d of opts) { const dd = (t.x + DIRS[d][0] - tg.x) ** 2 + (t.y + DIRS[d][1] - tg.y) ** 2; if (dd < bd) { bd = dd; best = d; } }
  return best;
}
function soak(s) { const S = s.spray; for (const c of s.cats) { if (c.state !== 'out' || c.eyes) continue; const t = tileOf(c);
  if (S.tiles.some((q) => q.x === t.x && q.y === t.y)) { c.eyes = true; c.sit = false; c.stun = 0; s.score += PTS.soak; s.stats.soaked++; s.stats.cats++; pop(s, c.x, c.y - 6, 'SOAKED +' + PTS.soak, '#9fd0ff'); fx(s, c.x, c.y, '#9fd0ff', 10); s.ev.push('splash'); } } }
function collide(s) {
  const D = s.dog, pt = tileOf(D);
  if (D.hidden <= 0 && s.dash <= 0 && hitCar(s, D, s.level <= 2 ? 2 : 1)) return die(s, 'car'); // early cities forgive a scrape
  for (const c of s.cats) { if (c.state !== 'out' || c.eyes) continue;
    if (isAvenue(tileOf(c).y) && hitCar(s, c, 0)) { c.eyes = true; c.sit = false; c.stun = 0; s.score += PTS.honk; s.stats.honks++; s.stats.cats++; s.ev.push('honk'); pop(s, c.x, c.y - 6, 'HONK! +' + PTS.honk, '#f2c14e'); continue; }
    if (D.hidden > 0 || c.sit || c.stun > 0) continue; const ct = tileOf(c); if (ct.x !== pt.x || ct.y !== pt.y) continue;
    if (s.dash > 0) { if (!c.bumped) { c.bumped = true; c.stun = 2; s.score += PTS.bump; pop(s, c.x, c.y - 6, 'BUMP +' + PTS.bump); s.ev.push('hit'); } continue; }
    return die(s, 'cat'); }
}
function die(s, why) { s.lives--; s.lastDeath = why; s.ev.push(why === 'car' ? 'honk' : 'die'); s.flash = 1; s.shake = 0.35; fx(s, s.dog.x, s.dog.y, '#e0802c', 22); s.dying = true; s.freeze = 90; }
function afterDeath(s) { if (s.lives <= 0) { s.over = true; return; } resetActors(s); s.retry = true; s.ready = 120; s.power = null; }
// ---------- bot (attract mode / tests / human-sim brain) ----------
export function bot(s) {
  const D = s.dog, P = tileOf(D); if (D.hidden > 0) return {};
  const danger = (x, y) => (s.dash <= 0 && s.cats.some((c) => c.state === 'out' && !c.eyes && !c.sit && c.stun <= 0 && Math.abs(Math.floor(c.x / 8) - x) + Math.abs(Math.floor(c.y / 8) - y) <= 3)) || (s.dash <= 0 && isAvenue(y) && carNear(s, x, y, 5));
  const useA = !!s.pocket && s.cats.some((c) => c.state === 'out' && !c.eyes && Math.hypot(c.x - D.x, c.y - D.y) < 40);
  const q = [[P.x, P.y, null, 0]], seen = new Set([key(P.x, P.y)]); let food = null;
  while (q.length) { const [x, y, first, n] = q.shift(); const k = key(x, y);
    if (first && ((s.power && s.power.x === x && s.power.y === y) || (s.coin && s.coin.x === x && s.coin.y === y))) return { [first]: true, a: useA }; // treats first
    if (first && !food && s.kibble.has(k)) food = { first, n };
    if (food && n > food.n + 12) break; // a power-up within ~12 extra tiles beats the nearest kibble
    for (const d of ORDER) { if (!canMove(x, y, d)) continue; const nx = x + DIRS[d][0], ny = y + DIRS[d][1], nk = key(nx, ny); if (seen.has(nk) || danger(nx, ny)) continue; seen.add(nk); q.push([nx, ny, first || d, n + 1]); } }
  if (food) return { [food.first]: true, a: useA };
  if (isAvenue(P.y)) return { [D.dir]: true }; // never stop on an avenue
  return {}; // nothing safe: wait
}
export const ghostPos = (s) => ({ x: s.dog.x, y: s.dog.y + OY });
// ---------- render (256x256, Inu Verse neon city) ----------
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
const BLDG = ['#2b2150', '#24305a', '#3a2350', '#1f3a4a'];
let city = null; // pre-rendered static city layer
function cityLayer() { if (city || typeof document === 'undefined') return city; const cv = document.createElement('canvas'); cv.width = W; cv.height = ROWS * 8; const g = cv.getContext('2d');
  g.fillStyle = '#16141f'; g.fillRect(0, 0, W, ROWS * 8);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const ch = MAP[y][x], X = x * 8, Y = y * 8, h = hash(x, y);
    if (ch === '#') { g.fillStyle = BLDG[(Math.floor(x / 5) + Math.floor(y / 4)) % 4]; g.fillRect(X, Y, 8, 8);
      g.fillStyle = h % 3 ? '#f2c14e' : '#7ef0ff'; if (h % 5 < 2) g.fillRect(X + 2, Y + 2, 2, 2); if (h % 7 < 2) g.fillRect(X + 5, Y + 5, 1, 2);
      const open = (dx, dy) => !isBlock(x + dx, y + dy); g.fillStyle = '#4a3a7a'; if (open(0, -1)) g.fillRect(X, Y, 8, 1); if (open(-1, 0)) g.fillRect(X, Y, 1, 8); g.fillStyle = '#0c0a14'; if (open(0, 1)) g.fillRect(X, Y + 7, 8, 1); if (open(1, 0)) g.fillRect(X + 7, Y, 1, 8); continue; }
    if (ch === 'C' || ch === '-' || ch === 'H') { g.fillStyle = ch === 'H' ? '#3a1e2e' : '#5a2a44'; g.fillRect(X, Y, 8, 8); if (ch === '-') { g.fillStyle = '#ff9ad0'; g.fillRect(X, Y + 5, 8, 3); g.fillStyle = '#fbf1e0'; g.fillRect(X + (x % 2) * 4, Y + 5, 4, 3); } continue; }
    if (isAvenue(y)) { g.fillStyle = '#25232f'; g.fillRect(X, Y, 8, 8); g.fillStyle = '#f2c14e'; if (x % 2 === 0) g.fillRect(X + 1, Y + 4, 5, 1);
      if (!isBlock(x, y - 1) || !isBlock(x, y + 1)) { g.fillStyle = '#d8d4e0'; for (let i = 0; i < 4; i++) g.fillRect(X + 1 + i * 2, Y, 1, 8); } continue; } // zebra crossings where streets meet the avenue
    g.fillStyle = '#211f2b'; g.fillRect(X, Y, 8, 8);
    const ow = ONEWAY[ch]; if (ow) { g.fillStyle = '#4fc3e8'; const c = { right: [[2, 3, 4, 2], [5, 2, 1, 4]], left: [[2, 3, 4, 2], [2, 2, 1, 4]], up: [[3, 2, 2, 4], [2, 2, 4, 1]], down: [[3, 2, 2, 4], [2, 5, 4, 1]] }[ow]; for (const [a, b, w, hh] of c) g.fillRect(X + a, Y + b, w, hh); } }
  g.font = '6px Silkscreen, monospace'; g.fillStyle = '#ff9ad0'; g.textAlign = 'center'; g.fillText('CAT CAFE', 128, 15 * 8 + 6);
  city = cv; return city; }
const SPR = {
  bin: ['.gggggg.', 'gGGGGGGg', '.gggggg.', '.gddddg.', '.gddddg.', '.gddddg.', '.gddddg.', '..k..k..'],
  hyd: ['..rr..', '.rrrr.', 'rRrrRr', '.rrrr.', '.rrrr.', 'rrrrrr'],
  toy: ['.pppp.', 'pPpppp', 'pppppp', 'pppppp', '.pppp.', '..yy..'],
  scooter: ['...bbb..', '...bbb..', '.kkk.k..', 'ccccccc.', 'w.....w.'],
  van: ['.wwwwwwwwwwwbb..', 'wwwwwwwwwwwwbbbb', 'wwoooowwwwwwwwww', 'wwwwwwwwwwwwwwww', '.kk.........kk..'],
  taxi: ['....mmmmmm......', '..mmssmmssmm....', 'mmmmmmmmmmmmmmmm', 'mmmmmmmmmmmmmmmm', '.kk.........kk..'],
  bus: ['tttttttttttttttt', 'tsstsstsstssttt.', 'tttttttttttttttt', 'tttttttttttttttt', '.kk.........kk..'],
};
const PAL = { g: '#2f8a4a', G: '#5fd37a', d: '#24683a', k: '#14101c', r: '#e0303a', R: '#ff8a8a', p: '#ff7ac0', P: '#ffd0ea', y: '#f2c14e', b: '#c88a3c', c: '#4fc3e8', w: '#fbf1e0', o: '#e0802c', m: '#9b59d6', s: '#7ef0ff', t: '#5fd3c8' };
const CAR_KINDS = ['van', 'taxi', 'bus'];
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#06060f'; ctx.fillRect(0, 0, W, H);
  const cl = cityLayer(); if (cl) ctx.drawImage(cl, 0, OY);
  ctx.fillStyle = '#e8c890'; for (const k of s.kibble) { const [x, y] = k.split(',').map(Number); ctx.fillRect(x * 8 + 3, y * 8 + 3 + OY, 2, 2); }
  for (const b of SPOTS.bins) { const k = key(b.x, b.y), hid = s.dog.hidden > 0 && s.dog.bin === k; const shake = hid && s.dog.hidden < 60 ? Math.round(Math.sin(s.frame) * 1) : 0;
    ctx.globalAlpha = s.binCd[k] > 0 ? 0.55 : 1; P.blit(ctx, P.sprite('ssBin', SPR.bin, PAL, { outline: false }), b.x * 8 + shake, b.y * 8 + OY); ctx.globalAlpha = 1;
    if (hid) { ctx.fillStyle = '#e0802c'; ctx.fillRect(b.x * 8 + 2, b.y * 8 + OY - 2, 1, 2); ctx.fillRect(b.x * 8 + 5, b.y * 8 + OY - 2, 1, 2); } }
  for (const h of SPOTS.hydrants) { const k = key(h.x, h.y), ready = !(s.hydCd[k] > 0); ctx.globalAlpha = ready ? 1 : 0.45; P.blit(ctx, P.sprite('ssHyd', SPR.hyd, PAL, { outline: false }), h.x * 8 + 1, h.y * 8 + 1 + OY); ctx.globalAlpha = 1;
    if (ready && Math.floor(s.frame / 20) % 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(h.x * 8 + 2, h.y * 8 + 2 + OY, 1, 1); } }
  if (s.spray) for (const q of s.spray.tiles) { ctx.fillStyle = `rgba(159,208,255,${0.35 + 0.25 * Math.sin(s.frame / 2 + q.x + q.y)})`; ctx.fillRect(q.x * 8, q.y * 8 + OY, 8, 8); }
  if (s.power && (s.power.f > 120 || Math.floor(s.frame / 6) % 2)) P.blit(ctx, P.sprite('ss' + s.power.kind, SPR[s.power.kind], PAL, { outline: true }), s.power.x * 8 - 1, s.power.y * 8 - 1 + OY);
  if (s.lure) { P.blit(ctx, P.sprite('sstoy', SPR.toy, PAL, { outline: true }), s.lure.x * 8, s.lure.y * 8 + OY); if (Math.floor(s.frame / 8) % 2) { ctx.fillStyle = '#ff9ad0'; ctx.fillRect(s.lure.x * 8 + 7, s.lure.y * 8 + OY - 3, 2, 2); } }
  if (s.coin && (s.coin.f > 120 || Math.floor(s.frame / 6) % 2)) { const X = s.coin.x * 8 + 4, Y = s.coin.y * 8 + 4 + OY; ctx.fillStyle = '#f2c14e'; ctx.fillRect(X - 3, Y - 3, 7, 7); ctx.fillStyle = '#7a5210'; ctx.fillRect(X - 1, Y - 2, 2, 5); }
  for (const c of s.cats) { if (c.state === 'house' && c.y > 116) continue; const X = c.x - 5, Y = c.y - 6 + OY;
    if (c.eyes) { ctx.globalAlpha = 0.6; P.blit(ctx, P.cat('#9fd0ff'), X, Y); ctx.globalAlpha = 1; ctx.fillStyle = '#9fd0ff'; ctx.fillRect(X + 2, Y - 2, 1, 2); ctx.fillRect(X + 7, Y - 3, 1, 2); continue; } // soggy cat heading home
    P.blit(ctx, P.cat(c.color), X, Y); if (c.sit) { ctx.fillStyle = '#ff9ad0'; ctx.fillRect(X + 4, Y - 3, 3, 1); } if (c.stun > 0) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(X + ((s.frame >> 2) % 9), Y - 3, 2, 1); } }
  const D = s.dog;
  if (D.hidden <= 0 && (!s.dying || Math.floor(s.freeze / 8) % 2)) { const spr = D.dir === 'up' ? P.shibaBack() : D.dir === 'down' ? P.shibaHead() : P.shibaBody(); const bob = Math.floor(D.anim / 4) % 2;
    if (D.dir === 'left') { ctx.save(); ctx.translate(Math.round(D.x) * 2, 0); ctx.scale(-1, 1); P.blit(ctx, spr, D.x - 5, D.y - 5 + OY - bob); ctx.restore(); } else P.blit(ctx, spr, D.x - 5, D.y - 5 + OY - bob);
    if (s.dash > 0) { P.blit(ctx, P.sprite('ssscooter', SPR.scooter, PAL, { outline: false }), D.x - 4, D.y + 1 + OY); ctx.fillStyle = '#7ef0ff'; const [dx, dy] = DIRS[D.dir]; for (let i = 1; i <= 3; i++) ctx.fillRect(D.x - dx * (5 + i * 3), D.y - dy * (5 + i * 3) + OY, 1, 1); } }
  for (const car of s.cars) { const r = carRect(car), kind = CAR_KINDS[car.kind]; const spr = P.sprite('ss' + kind + AVENUES[car.lane].dir, SPR[kind], PAL, { outline: false, flip: AVENUES[car.lane].dir < 0 }); P.blit(ctx, spr, r.x, r.y + OY + 1);
    ctx.fillStyle = '#fff6c0'; ctx.fillRect(AVENUES[car.lane].dir > 0 ? r.x + r.w : r.x - 2, r.y + OY + 2, 2, 2); }
  for (const car of s.cars) { const dir = AVENUES[car.lane].dir, y = AVENUES[car.lane].row * 8 + OY; // headlight telegraph: a car about to enter blinks at the curb
    if ((dir > 0 ? car.x + car.len > -28 && car.x + car.len < 4 : car.x < W + 28 && car.x > W - 4) && (s.frame >> 3) % 2) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(dir > 0 ? 8 : W - 10, y + 2, 2, 4); ctx.fillStyle = '#f2c14e'; ctx.fillRect(dir > 0 ? 10 : W - 12, y + 3, 2, 2); } }
  ctx.fillStyle = '#06060f'; ctx.fillRect(0, OY, 2, ROWS * 8); ctx.fillRect(W - 2, OY, 2, ROWS * 8); // cars slide under the edge buildings
  if (s.ready > 0) { ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#5fd3c8'; ctx.textAlign = 'center'; ctx.fillText('SNIFF!', 128, OY + 13 * 8 + 6 - 48); ctx.textAlign = 'left'; }
  // bottom bar: level, pocket (Inu), power timers
  ctx.font = '6px Silkscreen, monospace'; ctx.fillStyle = '#8a7ac4'; ctx.fillText('CITY ' + s.level, W - 44, H - 6);
  if (s.inu) { ctx.fillStyle = '#8a7ac4'; ctx.fillText('POCKET', 84, H - 6); if (s.pocket) P.blit(ctx, P.sprite('ss' + s.pocket, SPR[s.pocket], PAL, { outline: false }), 116, H - 12); }
  if (s.lure) { ctx.fillStyle = '#ff7ac0'; ctx.fillRect(140, H - 9, 30 * s.lure.f / (lureSecs(s.level) * 60), 3); }
  if (s.dash > 0) { ctx.fillStyle = '#4fc3e8'; ctx.fillRect(140, H - 5, 30 * s.dash / (dashSecs(s.level) * 60), 3); }
  if (s.dog.hidden > 0) { ctx.fillStyle = '#5fd37a'; ctx.fillRect(176, H - 9, 30 * s.dog.hidden / (binSecs(s.level) * 60), 3); }
}
