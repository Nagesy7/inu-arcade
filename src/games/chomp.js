// KIBBLE CHOMP — arcade-accurate maze-chase rules (28x31 maze, 224x288 native), original Inu art and names.
// Rule tables follow the documented 1980 maze-chase behaviour: per-level speed %, scatter/chase timers, fright time,
// four targeting personalities (incl. the up-direction overflow quirk), ghost-house dot counters, "Elroy" speed-ups,
// cornering, 1/3-frame dot stalls, bonus sequence, extra life at 10,000. Inu Mode adds Bark Stun + $KIBBLE coins.
import { rng } from '../core/rng.js';
export const META = { id: 'kibble-chomp', title: 'KIBBLE CHOMP', color: '#f2c14e', blurb: 'Clear the maze of kibble. Four bear-market cats hunt you, each its own way. Power bones turn the hunt around.', controls: 'Arrows / WASD / D-pad to steer', inuMove: 'BARK STUN (A): freezes nearby cats for 2s, 8s cooldown. $KIBBLE coins (+500) appear twice a maze.', classicNote: 'Arcade-accurate tables.' };
export const W = 224, H = 288, OY = 24, COLS = 28, ROWS = 31, TILE = 8;
// Original Inu Arcade maze (v4): 28x31, mirrored halves, 240 kibble + 4 power bones, side tunnel on row 14, no dead ends.
const HALF = [
  '##############', '#.....#.......', '#.###.#.####.#', '#o###.#.####.#', '#.###.#.####.#', '#.............', '#.##.#####.###', '#.##.#####.###', '#....##      #', '####.## #### #', '####.## #### #', '####.         ', '####.## # ###-', '####.## # #HHH', '    .##   #HHH', '####.## # #HHH', '####.## # ####', '####.         ', '####.## # ####', '#....##..     ', '#.##.#####.###', '#.##.#####.###', '#o.#.......###', '##.#.##.##....', '##...##.######', '####.##.######', '#.......#.....', '#.#####.#.####', '#.#####.#.####', '#.............', '##############'];
export const MAZE = HALF.map((r) => r + [...r].reverse().join(''));
export const PTS = { dot: 10, energizer: 50, ghosts: [200, 400, 800, 1600], extraLifeAt: 10000 };
const PX100 = 75.75757625 / 60; // 100% speed in px/frame
// Per-level speed table (% of max): [pac, pacFright, ghost, ghostTunnel, ghostFright, elroy1Dots, elroy1%, elroy2Dots, elroy2%]
export const SPEED_TABLE = [
  null, [80, 90, 75, 40, 50, 20, 80, 10, 85], [90, 95, 85, 45, 55, 30, 90, 15, 95], [90, 95, 85, 45, 55, 40, 90, 20, 95], [90, 95, 85, 45, 55, 40, 90, 20, 95],
  [100, 100, 95, 50, 60, 40, 100, 20, 105], [100, 100, 95, 50, 60, 50, 100, 25, 105], [100, 100, 95, 50, 60, 50, 100, 25, 105], [100, 100, 95, 50, 60, 50, 100, 25, 105],
  [100, 100, 95, 50, 60, 60, 100, 30, 105], [100, 100, 95, 50, 60, 60, 100, 30, 105], [100, 100, 95, 50, 60, 60, 100, 30, 105], [100, 100, 95, 50, 60, 80, 100, 40, 105],
  [100, 100, 95, 50, 60, 80, 100, 40, 105], [100, 100, 95, 50, 60, 80, 100, 40, 105], [100, 100, 95, 50, 60, 100, 100, 50, 105], [100, 100, 95, 50, 60, 100, 100, 50, 105],
  [100, 100, 95, 50, 60, 100, 100, 50, 105], [100, 100, 95, 50, 60, 100, 100, 50, 105], [100, 100, 95, 50, 60, 120, 100, 60, 105], [100, 100, 95, 50, 60, 120, 100, 60, 105],
  [90, 90, 95, 50, 60, 120, 100, 60, 105]];
export const speeds = (level) => { const t = SPEED_TABLE[Math.min(level, 21)]; return { pac: t[0], pacFright: t[1], ghost: t[2], tunnel: t[3], fright: t[4], elroy1: [t[5], t[6]], elroy2: [t[7], t[8]] }; };
// fright seconds per level (index = level), then flashes
export const FRIGHT_TIME = [null, 6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1, 0, 0, 0];
export const FRIGHT_FLASHES = [null, 5, 5, 5, 5, 5, 5, 5, 5, 3, 5, 5, 3, 3, 5, 3, 3, 0, 3, 0, 0, 0];
export const frightSecs = (level) => FRIGHT_TIME[Math.min(level, 21)];
// scatter/chase phases in seconds (Infinity = rest of level)
export function modeTable(level) { if (level === 1) return [7, 20, 7, 20, 5, 20, 5, Infinity]; if (level <= 4) return [7, 20, 7, 20, 5, 1033, 1 / 60, Infinity]; return [5, 20, 5, 20, 5, 1037, 1 / 60, Infinity]; }
export const BONUS = [null, ['BISCUIT', 100], ['CHEW TOY', 300], ['BACON', 500], ['BACON', 500], ['T-BONE', 700], ['T-BONE', 700], ['SQUEAKER', 1000], ['SQUEAKER', 1000], ['GOLD COLLAR', 2000], ['GOLD COLLAR', 2000], ['DOG BELL', 3000], ['DOG BELL', 3000], ['KENNEL KEY', 5000]];
export const bonusFor = (level) => BONUS[Math.min(level, 13)];
export const BONUS_DOTS = [70, 170], BONUS_SECS = 9.5;
export const DOT_LIMITS = (level) => (level === 1 ? [0, 0, 30, 60] : level === 2 ? [0, 0, 0, 50] : [0, 0, 0, 0]); // per ghost index (Blinky, Pinky, Inky, Clyde)
export const GLOBAL_LIMITS = [0, 7, 17, 32];
export const idleLimit = (level) => (level < 5 ? 240 : 180); // frames without a dot before forcing a release
export const SCATTER = [{ x: 25, y: -3 }, { x: 2, y: -3 }, { x: 27, y: 32 }, { x: 0, y: 32 }];
export const NO_UP = ['12,11', '15,11', '10,23', '17,23']; // cats can't turn up here (above the house + above the start lane)
export const BARK = { cd: 8, radius: 3.5, stun: 2 }, COIN = { at: [100, 200], pts: 500, life: 9 };
const DIRS = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] }, OPP = { up: 'down', down: 'up', left: 'right', right: 'left' }, ORDER = ['up', 'left', 'down', 'right'];
export const CAT_COLORS = ['#e8343c', '#f58ac8', '#3ad0e0', '#f5a23a'], CAT_NAMES = ['BEARISH', 'PANIC', 'DUMPY', 'FUDDY'];
export function isWall(tx, ty) { if (ty === 14 && (tx < 0 || tx >= COLS)) return false; if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true; const c = MAZE[ty][tx]; return c === '#' || c === 'H' || c === '-'; }
const ghostWall = (tx, ty, eyes) => { if (ty >= 0 && ty < ROWS && tx >= 0 && tx < COLS && MAZE[ty][tx] === '-') return !eyes; return isWall(tx, ty); };
const tileOf = (a) => ({ x: Math.floor(a.x / TILE), y: Math.floor(a.y / TILE) });
const atCenter = (a) => a.x % 8 === 4 && a.y % 8 === 4;
export const inTunnel = (a) => { const t = tileOf(a); return t.y === 14 && (t.x <= 3 || t.x >= 24); };
const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y: y + OY, c, n }), pop = (s, x, y, text, c = '#7ef0ff') => s.pops.push({ x, y: y + OY, text, c, t: 1 });
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, over: false, t: 0, ev: [], fx: [], pops: [], shake: 0, flash: 0, acc: 0, frame: 0, extra: false,
    barkCd: 0, coin: null, stats: { cats: 0, barks: 0, coins: 0 } };
  loadLevel(s); return s;
}
function loadLevel(s) {
  s.dots = new Set(); s.energizers = new Set(); MAZE.forEach((r, y) => [...r].forEach((c, x) => { if (c === '.') s.dots.add(x + ',' + y); if (c === 'o') s.energizers.add(x + ',' + y); }));
  s.total = s.dots.size + s.energizers.size; s.eaten = 0; s.bonus = null; s.bonusShown = 0; s.useGlobal = false; s.dotCounters = [0, 0, 0, 0]; resetActors(s); s.ready = 120;
}
export const dotsLeft = (s) => s.dots.size + s.energizers.size;
function resetActors(s) {
  s.pac = { x: 112, y: 188, dir: 'left', want: 'left', acc: 0, stall: 0, anim: 0 };
  s.cats = [0, 1, 2, 3].map((i) => ({ i, color: CAT_COLORS[i], x: [112, 112, 96, 128][i], y: [92, 116, 116, 116][i], dir: i === 0 ? 'left' : i === 1 ? 'down' : 'up', acc: 0, state: i === 0 ? 'out' : 'house', fright: false, eyes: false, stun: 0, leaving: false }));
  s.frightF = 0; s.combo = 0; s.phase = 0; s.phaseF = 0; s.idleF = 0; s.elroyOff = s.lives < 3 && s.useGlobal; s.freeze = 0;
}
export function scatterMode(s) { return s.phase % 2 === 0; }
// ---------- main step: integer frames at 60 Hz ----------
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.flash = Math.max(0, s.flash - dt); s.shake = Math.max(0, s.shake - dt);
  for (const d of ORDER) if (inp[d]) s.pac.want = d;
  if (s.inu) { s.barkCd = Math.max(0, s.barkCd - dt); if (inp.a && s.barkCd <= 0 && !s.ready && !s.freeze) bark(s); }
  s.acc += dt * 60; while (s.acc >= 1 && !s.over) { s.acc -= 1; frame(s); }
}
function frame(s) {
  s.frame++; s.t += 1 / 60;
  if (s.ready > 0) { s.ready--; return; }
  if (s.freeze > 0) { s.freeze--; if (s.freeze === 0 && s.dying) { s.dying = false; afterDeath(s); } if (s.freeze === 0 && s.clearing) { s.clearing = false; s.level++; s.ev.push('level'); loadLevel(s); } return; }
  // mode timer (paused while frightened)
  if (s.frightF > 0) { s.frightF--; if (s.frightF === 0) { for (const c of s.cats) c.fright = false; } }
  else { const tbl = modeTable(s.level); s.phaseF++; if (s.phase < tbl.length - 1 && s.phaseF >= Math.round(tbl[s.phase] * 60)) { s.phase++; s.phaseF = 0; for (const c of s.cats) if (c.state === 'out' && !c.eyes) c.reverse = true; } }
  movePac(s); if (s.over || s.freeze) return;
  houseLogic(s);
  for (const c of s.cats) moveCat(s, c);
  collide(s);
  if (s.bonus) { s.bonus.f--; if (s.bonus.f <= 0) s.bonus = null; else { const t = tileOf(s.pac); if (t.y === 17 && (t.x === 13 || t.x === 14)) { s.score += s.bonus.pts; s.ev.push('coin'); pop(s, 112, 136, '+' + s.bonus.pts, '#f2c14e'); fx(s, 112, 140, '#f2c14e', 14); s.bonus = null; } } }
  if (s.coin) { s.coin.f--; if (s.coin.f <= 0) s.coin = null; else { const t = tileOf(s.pac); if (t.x === s.coin.tx && t.y === s.coin.ty) { s.score += COIN.pts; s.stats.coins++; pop(s, s.pac.x, s.pac.y - 8, '+500 $KIBBLE', '#f2c14e'); fx(s, s.pac.x, s.pac.y, '#f2c14e', 16); s.ev.push('coin'); s.coin = null; } } }
  if (!s.extra && s.score >= PTS.extraLifeAt) { s.extra = true; s.lives++; s.ev.push('pow'); }
}
export function pacSpeed(s) { const sp = speeds(s.level); return (s.frightF > 0 ? sp.pacFright : sp.pac) / 100 * PX100; }
export function catSpeed(s, c) { const sp = speeds(s.level); if (c.eyes) return 2 * PX100 * 1.0; if (c.state !== 'out') return 0.5 * PX100; if (inTunnel(c)) return sp.tunnel / 100 * PX100; if (c.fright) return sp.fright / 100 * PX100;
  if (c.i === 0 && !s.elroyOff) { const left = dotsLeft(s); if (left <= sp.elroy2[0]) return sp.elroy2[1] / 100 * PX100; if (left <= sp.elroy1[0]) return sp.elroy1[1] / 100 * PX100; } return sp.ghost / 100 * PX100; }
export const elroyLevel = (s) => { if (s.elroyOff) return 0; const sp = speeds(s.level), left = dotsLeft(s); return left <= sp.elroy2[0] ? 2 : left <= sp.elroy1[0] ? 1 : 0; };
function wrapX(a) { if (a.x < -8) a.x += COLS * 8 + 16; else if (a.x > COLS * 8 + 8) a.x -= COLS * 8 + 16; }
function movePac(s) {
  const P = s.pac; if (P.stall > 0) { P.stall--; return; }
  P.acc += pacSpeed(s); while (P.acc >= 1) { P.acc -= 1; pacPixel(s); if (s.freeze || s.over) return; }
}
function pacPixel(s) {
  const P = s.pac, t = tileOf(P), cx = t.x * 8 + 4, cy = t.y * 8 + 4;
  if (P.want && P.want !== P.dir) { if (P.want === OPP[P.dir]) P.dir = P.want; else if (!isWall(t.x + DIRS[P.want][0], t.y + DIRS[P.want][1])) P.dir = P.want; }
  const [dx, dy] = DIRS[P.dir]; const onAxis = dx ? P.x === cx : P.y === cy;
  if (onAxis && isWall(t.x + dx, t.y + dy)) { // blocked: still allow finishing a corner
    if (dx && P.y !== cy) P.y += Math.sign(cy - P.y); else if (dy && P.x !== cx) P.x += Math.sign(cx - P.x); return; }
  P.x += dx; P.y += dy; // cornering: also drift toward the lane centre on the other axis (pre-/post-turn gives a distance advantage)
  if (dx && P.y !== cy) P.y += Math.sign(cy - P.y); if (dy && P.x !== cx) P.x += Math.sign(cx - P.x);
  wrapX(P); P.anim++;
  const nt = tileOf(P), k = nt.x + ',' + nt.y;
  if (s.dots.delete(k)) { s.score += PTS.dot; P.stall = 1; ateDot(s); s.ev.push('chomp'); }
  else if (s.energizers.delete(k)) { s.score += PTS.energizer; P.stall = 3; ateDot(s); energize(s); }
}
function ateDot(s) {
  s.eaten++; s.idleF = 0;
  if (s.useGlobal) s.globalCounter = (s.globalCounter || 0) + 1; else { const pref = s.cats.find((c) => c.state === 'house'); if (pref) s.dotCounters[pref.i]++; }
  if (BONUS_DOTS.includes(s.eaten)) { const [name, pts] = bonusFor(s.level); s.bonus = { name, pts, f: Math.round(BONUS_SECS * 60) }; }
  if (s.inu && COIN.at.includes(s.eaten)) { const spots = [[1, 1], [26, 1], [1, 29], [26, 29]]; const [tx, ty] = spots[Math.floor(s.rnd() * 4)]; s.coin = { tx, ty, f: COIN.life * 60 }; }
  if (dotsLeft(s) === 0) { s.clearing = true; s.freeze = 120; s.ev.push('home'); }
}
function energize(s) {
  const f = frightSecs(s.level); s.combo = 0; s.ev.push('power');
  for (const c of s.cats) if (!c.eyes) { if (c.state === 'out') c.reverse = true; if (f > 0) c.fright = true; }
  s.frightF = Math.round(f * 60);
}
function houseLogic(s) {
  s.idleF++; const inHouse = s.cats.filter((c) => c.state === 'house'); if (!inHouse.length) return; const pref = inHouse[0];
  let release = false;
  if (s.useGlobal) { const g = s.globalCounter || 0; if (g >= GLOBAL_LIMITS[pref.i]) { release = true; if (pref.i === 3) s.useGlobal = false; } }
  else if (s.dotCounters[pref.i] >= DOT_LIMITS(s.level)[pref.i]) release = true;
  if (s.idleF >= idleLimit(s.level)) { release = true; s.idleF = 0; }
  if (release) { pref.state = 'leaving'; if (pref.i === 3) s.elroyOff = false; }
}
function moveCat(s, c) {
  if (c.stun > 0) { c.stun -= 1 / 60; return; }
  c.acc += catSpeed(s, c);
  while (c.acc >= 1) { c.acc -= 1;
    if (c.state === 'house') { c.y += c.dir === 'up' ? -1 : 1; if (c.y <= 112) c.dir = 'down'; if (c.y >= 120) c.dir = 'up'; continue; }
    if (c.state === 'leaving') { if (c.x !== 112) { c.x += Math.sign(112 - c.x); continue; } if (c.y > 92) { c.y--; continue; } c.state = 'out'; c.dir = 'left'; continue; }
    if (c.state === 'entering') { if (c.y < 116) { c.y++; continue; } c.eyes = false; c.fright = false; c.state = 'leaving'; continue; }
    if (atCenter(c)) {
      if (c.eyes && c.x === 112 && c.y === 92) { c.state = 'entering'; c.x = 112; continue; }
      if (c.reverse) { c.reverse = false; c.dir = OPP[c.dir]; } else c.dir = chooseDir(s, c);
    } else if (c.reverse) { c.reverse = false; c.dir = OPP[c.dir]; }
    const [dx, dy] = DIRS[c.dir]; c.x += dx; c.y += dy; wrapX(c);
  }
}
export function catTarget(s, c) {
  const P = tileOf(s.pac), d = DIRS[s.pac.dir];
  if (c.eyes) return { x: 13, y: 11 };
  const elroyChase = c.i === 0 && elroyLevel(s) > 0;
  if (scatterMode(s) && !elroyChase) return SCATTER[c.i];
  if (c.i === 0) return P;
  if (c.i === 1) { const q = s.pac.dir === 'up' ? { x: P.x - 4, y: P.y - 4 } : { x: P.x + d[0] * 4, y: P.y + d[1] * 4 }; return q; } // up-direction overflow quirk
  if (c.i === 2) { const piv = s.pac.dir === 'up' ? { x: P.x - 2, y: P.y - 2 } : { x: P.x + d[0] * 2, y: P.y + d[1] * 2 }; const b = tileOf(s.cats[0]); return { x: 2 * piv.x - b.x, y: 2 * piv.y - b.y }; }
  const me = tileOf(c); return (me.x - P.x) ** 2 + (me.y - P.y) ** 2 > 64 ? P : SCATTER[3];
}
function chooseDir(s, c) {
  const t = tileOf(c); const opts = ORDER.filter((d) => d !== OPP[c.dir] && !ghostWall(t.x + DIRS[d][0], t.y + DIRS[d][1], c.eyes) && !(d === 'up' && !c.fright && !c.eyes && NO_UP.includes(t.x + ',' + t.y)));
  if (!opts.length) return OPP[c.dir];
  if (c.fright && !c.eyes) { const r = ORDER[Math.floor(s.rnd() * 4)]; if (opts.includes(r)) return r; return ORDER.find((d) => opts.includes(d)); }
  const tg = catTarget(s, c); let best = opts[0], bd = Infinity;
  for (const d of opts) { const dd = (t.x + DIRS[d][0] - tg.x) ** 2 + (t.y + DIRS[d][1] - tg.y) ** 2; if (dd < bd) { bd = dd; best = d; } }
  return best;
}
function collide(s) {
  const pt = tileOf(s.pac);
  for (const c of s.cats) { if (c.state !== 'out' || c.eyes || c.stun > 0) continue; const ct = tileOf(c); if (ct.x !== pt.x || ct.y !== pt.y) continue;
    if (c.fright) { const pts = PTS.ghosts[Math.min(3, s.combo++)]; s.score += pts; c.eyes = true; c.fright = false; s.stats.cats++; s.freeze = 60; s.ev.push('eatGhost'); pop(s, c.x, c.y - 6, '+' + pts); fx(s, c.x, c.y, c.color, 14); s.shake = 0.1; return; }
    s.lives--; s.ev.push('die'); s.flash = 1; s.shake = 0.35; fx(s, s.pac.x, s.pac.y, '#e0802c', 22); s.dying = true; s.freeze = 90; return; }
}
function afterDeath(s) { if (s.lives <= 0) { s.over = true; return; } s.useGlobal = true; s.globalCounter = 0; resetActors(s); s.elroyOff = true; s.ready = 120; s.bonus = null; }
function bark(s) { s.barkCd = BARK.cd; s.stats.barks++; s.ev.push('bark'); s.shake = 0.15; s.ring = { x: s.pac.x, y: s.pac.y, t: 0.4 };
  for (const c of s.cats) if (c.state === 'out' && !c.eyes && Math.hypot(c.x - s.pac.x, c.y - s.pac.y) <= BARK.radius * 8) { c.stun = BARK.stun; fx(s, c.x, c.y, '#7ef0ff', 6); } }
// ---------- bot (attract mode / tests) ----------
export function bot(s) {
  const P = tileOf(s.pac); const bad = (x, y) => s.cats.some((c) => c.state === 'out' && !c.eyes && !c.fright && Math.abs(Math.floor(c.x / 8) - x) + Math.abs(Math.floor(c.y / 8) - y) <= 3);
  const q = [[P.x, P.y, null]], seen = new Set([P.x + ',' + P.y]);
  while (q.length) { const [x, y, first] = q.shift(); const k = x + ',' + y;
    if (first && (s.dots.has(k) || s.energizers.has(k) || s.cats.some((c) => c.fright && !c.eyes && Math.floor(c.x / 8) === x && Math.floor(c.y / 8) === y))) return { [first]: true };
    for (const d of ORDER) { let nx = x + DIRS[d][0]; const ny = y + DIRS[d][1]; if (ny === 14) nx = (nx + COLS) % COLS; const nk = nx + ',' + ny; if (isWall(nx, ny) || seen.has(nk) || bad(nx, ny)) continue; seen.add(nk); q.push([nx, ny, first || d]); } }
  return { [s.pac.dir]: true };
}
export const ghostPos = (s) => ({ x: s.pac.x, y: s.pac.y + OY });
// ---------- render (224x288) ----------
const SPR_PAC = { // 13x13 sharp side-profile Shiba head (faces right; flipped for left)
  side: ['....oo.......', '...ooo...oo..', '...odoo.ooo..', '..ooooooooo..', '.oooooooweoo.', 'ooooooooooonn', 'oooooooowwww.', 'oooooooww....', 'ooooooowwww..', '.oooooowwwww.', '.oooooooww...', '..ooooooo....', '...ooooo.....'],
  side2: ['....oo.......', '...ooo...oo..', '...odoo.ooo..', '..ooooooooo..', '.oooooooweoo.', 'ooooooooooonn', 'oooooooowww..', 'ooooooow.....', 'ooooooo......', 'ooooooow.....', '.oooooowwww..', '..ooooooo....', '...ooooo.....'],
  down: ['.oo.......oo.', '.odo.....odo.', '.ooooooooooo.', 'ooooooooooooo', 'oowweooewwoo', 'owwwwwwwwwwwo', 'owwwwnnnwwwwo', 'owwwwwnwwwwwo', '.owwwwwwwwwo.', '.owww...wwwo.', '..owwwwwwwo..', '...ooooooo...', '.............'],
  up: ['.oo.......oo.', '.odo.....odo.', '.ooooooooooo.', 'ooooooooooooo', 'ooooooooooooo', 'oooooddoooooo', 'ooooddddooooo', 'oooooddoooooo', '.ooooooooooo.', '.ooooooooooo.', '..ooooooooo..', '...ooooooo...', '.............'],
};
const PAC_PAL = { o: '#e8892e', d: '#a8521a', w: '#f6ead6', e: '#14101c', n: '#14101c' };
const CAT = { body: ['...c......c...', '..ccc....ccc..', '..cccccccccc..', '.cccccccccccc.', '.cwwccccccwwc.', '.cwpccccccwpc.', '.cccccccccccc.', '.cccckkkkcccc.', 'cccccccccccccc', 'cccccccccccccc', 'cccccccccccccc', 'cccccccccccccc', 'cc.ccc..ccc.cc', 'c...c....c...c'],
  scared: ['...c......c...', '..ccc....ccc..', '..cccccccccccc', '.cccccccccccc.', '.ccyyccccyycc.', '.ccyyccccyycc.', '.cccccccccccc.', '.cycycycycycc.', 'cccccccccccccc', 'cccccccccccccc', 'cccccccccccccc', 'cccccccccccccc', 'cc.ccc..ccc.cc', 'c...c....c...c'] };
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#06060f'; ctx.fillRect(0, 0, W, H);
  const flashMaze = s.clearing && Math.floor(s.freeze / 12) % 2;
  const wallC = flashMaze ? '#ffffff' : '#3b57e8', fillC = '#0a0c26';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const ch = MAZE[y][x]; const X = x * 8, Y = y * 8 + OY;
    if (ch === '-') { ctx.fillStyle = '#f5b0c8'; ctx.fillRect(X, Y + 3, 8, 2); continue; }
    if (ch !== '#') continue; ctx.fillStyle = fillC; ctx.fillRect(X, Y, 8, 8); ctx.fillStyle = wallC;
    const open = (dx, dy) => { const c = MAZE[y + dy]?.[x + dx]; return c !== undefined && c !== '#' && c !== 'H' && c !== '-'; };
    if (open(0, -1)) ctx.fillRect(X, Y + 1, 8, 1); if (open(0, 1)) ctx.fillRect(X, Y + 6, 8, 1); if (open(-1, 0)) ctx.fillRect(X + 1, Y, 1, 8); if (open(1, 0)) ctx.fillRect(X + 6, Y, 1, 8);
    if (open(-1, -1) && !open(-1, 0) && !open(0, -1)) ctx.fillRect(X + 1, Y + 1, 1, 1); if (open(1, -1) && !open(1, 0) && !open(0, -1)) ctx.fillRect(X + 6, Y + 1, 1, 1);
    if (open(-1, 1) && !open(-1, 0) && !open(0, 1)) ctx.fillRect(X + 1, Y + 6, 1, 1); if (open(1, 1) && !open(1, 0) && !open(0, 1)) ctx.fillRect(X + 6, Y + 6, 1, 1); }
  ctx.fillStyle = '#f0c890'; for (const k of s.dots) { const [x, y] = k.split(','); ctx.fillRect(x * 8 + 3, y * 8 + 3 + OY, 2, 2); }
  if (Math.floor(s.frame / 10) % 2 || s.ready) for (const k of s.energizers) { const [x, y] = k.split(',').map(Number); const X = x * 8, Y = y * 8 + OY; ctx.fillStyle = '#fbf1e0'; ctx.fillRect(X + 1, Y + 2, 2, 4); ctx.fillRect(X + 5, Y + 2, 2, 4); ctx.fillRect(X + 2, Y + 3, 4, 2); }
  if (s.bonus) { ctx.fillStyle = '#c8402a'; ctx.fillRect(108, OY + 136, 9, 7); ctx.fillStyle = '#f2c14e'; ctx.fillRect(110, OY + 138, 5, 3); }
  if (s.coin && (s.coin.f > 120 || Math.floor(s.frame / 6) % 2)) { const X = s.coin.tx * 8 + 4, Y = s.coin.ty * 8 + 4 + OY; ctx.fillStyle = '#f2c14e'; ctx.fillRect(X - 3, Y - 3, 7, 7); ctx.fillStyle = '#7a5210'; ctx.fillRect(X - 1, Y - 2, 2, 5); }
  const flashF = FRIGHT_FLASHES[Math.min(s.level, 21)] * 28;
  for (const c of s.cats) { const X = c.x - 7, Y = c.y - 7 + OY;
    if (c.eyes) { ctx.fillStyle = '#fff'; ctx.fillRect(X + 3, Y + 4, 3, 3); ctx.fillRect(X + 8, Y + 4, 3, 3); ctx.fillStyle = '#2a3fe8'; const [dx, dy] = DIRS[c.dir]; ctx.fillRect(X + 4 + dx, Y + 5 + dy, 1, 1); ctx.fillRect(X + 9 + dx, Y + 5 + dy, 1, 1); continue; }
    if (c.fright) { const blink = s.frightF < flashF && Math.floor(s.frightF / 14) % 2 === 0; P.blit(ctx, P.sprite('catS' + blink, CAT.scared, { c: blink ? '#e8e8ff' : '#2430b8', y: blink ? '#e8343c' : '#f0d0a0' }, { outline: false }), X, Y); continue; }
    P.blit(ctx, P.sprite('cat2' + c.color, CAT.body, { c: c.color, w: '#ffffff', p: '#14101c', k: '#14101c' }, { outline: false }), X, Y);
    const [dx, dy] = DIRS[c.dir]; ctx.fillStyle = '#14101c'; ctx.fillRect(X + 2 + Math.max(0, dx), Y + 4 + Math.max(0, dy), 1, 1); ctx.fillRect(X + 10 + Math.max(0, dx), Y + 4 + Math.max(0, dy), 1, 1);
    if (c.stun > 0) { ctx.fillStyle = '#7ef0ff'; ctx.fillRect(X, Y - 3, 14, 1); } }
  if (!s.dying || Math.floor(s.freeze / 8) % 2) { const p = s.pac, open = Math.floor(p.anim / 4) % 2; let spr;
    if (p.dir === 'left' || p.dir === 'right') spr = P.sprite('pacS' + open + p.dir, open ? SPR_PAC.side2 : SPR_PAC.side, PAC_PAL, { outline: false, flip: p.dir === 'left' }); else spr = P.sprite('pac' + p.dir, SPR_PAC[p.dir], PAC_PAL, { outline: false });
    P.blit(ctx, spr, p.x - 6, p.y - 6 + OY); }
  if (s.ring) { s.ring.t -= 1 / 60; if (s.ring.t <= 0) s.ring = null; else { ctx.strokeStyle = `rgba(126,240,255,${s.ring.t * 2})`; ctx.beginPath(); ctx.arc(s.ring.x, s.ring.y + OY, (0.4 - s.ring.t) / 0.4 * BARK.radius * 8, 0, 7); ctx.stroke(); } }
  if (s.ready > 0) { ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#f2c14e'; ctx.textAlign = 'center'; ctx.fillText('READY!', 112, OY + 17 * 8 + 7); ctx.textAlign = 'left'; }
  // bottom: bonus history
  for (let l = Math.max(1, s.level - 6), i = 0; l <= s.level; l++, i++) { ctx.fillStyle = '#c8402a'; ctx.fillRect(W - 12 - i * 12, H - 13, 8, 7); }
  if (s.inu) { ctx.fillStyle = '#222'; ctx.fillRect(84, H - 10, 40, 3); ctx.fillStyle = s.barkCd <= 0 ? '#7ef0ff' : '#3a6a80'; ctx.fillRect(84, H - 10, 40 * (1 - s.barkCd / BARK.cd), 3); }
}
