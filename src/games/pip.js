// PIP'S BIG BARK (approved name; NAME below) — original Inu side-scrolling platformer cabinet.
// Pip, a scrappy young Shiba with an oversized red scarf, brings home the pack the Grey Cat Syndicate and its rug bots
// scattered across Inu Verse. Six original stages (rooftops, park petal storm, beach tide, shrine lantern climb, mine
// carts, a vertical tower climb), five bosses plus a mini-boss, then the run loops harder. Bark Blast (tap yip / hold big
// bark), Bone-erang, Sniff Mode, Zoomies meter with wall-bounces, tail-wag double jump, scarf glide and pack followers
// with perks. Classic = all of that; Inu Mode adds the Pack Howl and $KIBBLE coins. 256x256 native, fixed 60 Hz steps,
// integer-pixel bodies, integer camera.
import { rng } from '../core/rng.js';
export const NAME = "Pip's Big Bark"; // single source of the player-facing name (approved)
export const META = { id: 'pips-big-bark', title: NAME.toUpperCase().replace(/ (?=BARK)/, '\u00a0'), short: 'PIP', color: '#ff4f4f', buttons: 3, music: 'pip',
  blurb: 'Pip brings the pack home! Run, tail-wag double jump and scarf-glide across six lands, bark the Grey Cat Syndicate silly and rescue your pups.',
  controls: 'Arrows run · A (Space/Z) jump, again in the air = tail-wag, hold = scarf glide · B (X/K) yip, hold + release = Big Bark · C (V/L) Bone-erang · hold DOWN = Sniff · UP when full = Zoomies',
  inuMove: 'PACK HOWL: with 2+ pups following, a full Big Bark becomes a howl that stuns everything on screen (8 s cooldown). $KIBBLE coins (+500) hide in every stage.',
  classicNote: 'Bark Blast, Bone-erang, Sniff, Zoomies, double jump, glide and the pack.' };
export const W = 256, H = 256, OY = 20, VH = H - OY, T = 16;
// ---------- tables (all original) ----------
export const PHYS = { walk: 1.5, zoom: 3, grav: 0.22, maxFall: 4.2, jumpV: -4.3, cut: -1.6, wagV: -3.8, glide: 0.7, bounceV: -5.6, bounceHi: -6.4, stompV: -3.6, coyote: 8, buffer: 8, swimG: 0.07, swimMax: 1.1, swimV: -2.1, water: 0.6, breath: 200 };
export const BARK = { cd: 10, speed: 4, range: 120, max: 2, charge: 32, bigCd: 90, row: 26, reach: 170, stun: 180, bossStun: 70, howlCd: 480, howlPack: 2 };
export const BONE = { v0: 4.4, decel: 0.15, home: 4.6, life: 210, catch: 12, cd: 12 };
export const SNIFF = { hold: 20, dur: 180, durPerk: 300, r: 150, rPerk: 210, cd: 480 };
export const ZOOM = { full: 100, kibble: 5, ko: 4, dur: 240, bounceV: -3.4 };
export const PACK_MAX = 5;
export const KINDS = [ // rescued pups, in rescue order; each trails Pip with a perk
  { id: 'fetch', name: 'MOMO', perk: 'fetches kibble and coins' },
  { id: 'warn', name: 'KUMO', perk: 'barks before traps' },
  { id: 'sniff', name: 'TARO', perk: 'longer, wider sniffs' } ];
export const PTS = { kibble: 10, coin: 500, bone: 300, treat: 1000, rescue: 500, pack: 1000, check: 200, stun: 50, stomp: 50, zoomKo: 100, timeBonus: 10, extraLifeAt: 30000, secret: 250,
  ko: { rug: 100, cat: 200, pigeon: 150, gull: 150, clam: 200, wisp: 150, bat: 120 }, boss: (i) => 3000 + 1000 * i, mini: 1500 };
export const HP = { rug: 1, cat: 2, pigeon: 1, gull: 1, clam: 2, wisp: 1, bat: 1 };
export function speeds(L) { L = Math.min(L, 14);
  return { rug: Math.min(1.2, 0.5 + 0.05 * L), cat: Math.min(1.1, 0.45 + 0.05 * L), fly: Math.min(1.3, 0.6 + 0.05 * L), swoop: Math.min(3.2, 2.1 + 0.08 * L), shot: Math.min(2.4, 1.3 + 0.08 * L), boss: Math.min(1.5, 1 + 0.06 * (L - 1)) }; }
export function windups(L) { L = Math.min(L, 14); return { cat: Math.max(14, 30 - 2 * L), coo: Math.max(14, 30 - 2 * L), flare: Math.max(18, 40 - 2 * L), clam: Math.max(20, 44 - 2 * L) }; }
export const trapWarn = (perk) => (perk ? { dist: 64, warn: 40 } : { dist: 30, warn: 16 });
export const RESPAWN_SECS = 90;
// ---------- original stages (builder ops; see build()) ----------
// rooftops: laundry lines bounce; park: petal storms hide enemies; beach: the tide rises and falls; shrine: a lantern
// climb (flicker lanterns go dark); mines: minecart rides; tower: a vertical climb to the claw machine.
export const STAGES = [
  { name: 'PLAZA ROOFTOPS', boss: 'scooter', secs: 210, gy: 11, theme: 0, ops: [
    ['g', 10], ['k', 4, 2, -7], ['e', 'rug', -2],
    ['pit', 2], ['g', 7], ['coin', -4, 3], ['e', 'pigeon', -2], ['k', 3, 2, -6],
    ['up', 1], ['g', 6], ['cage', -4], ['trap', -2],
    ['line', 7], ['k', 5, 4, -6], ['g', 5], ['e', 'rug', -2],
    ['wall', 2], ['g', 6], ['hid', 'bone', -4, 4], ['e', 'cat', -2], ['k', 3, 2, -6],
    ['dn', 1], ['g', 4], ['pit', 3], ['g', 5], ['k', 3, 3, -4], ['vault'], ['g', 4],
    ['check', -3], ['g', 7], ['e', 'pigeon', -3], ['e', 'rug', -1], ['k', 4, 2, -7],
    ['up', 2], ['g', 5], ['trap', -2], ['line', 6], ['k', 4, 4, -5], ['g', 4], ['cage', -2],
    ['pit', 3], ['g', 7], ['e', 'cat', -3], ['hid', 'treat', -5, 0], ['k', 3, 2, -7],
    ['wall', 2], ['g', 7], ['e', 'pigeon', -4], ['coin', -5, 3], ['e', 'rug', -2],
    ['dn', 2], ['g', 6], ['cage', -3], ['k', 4, 2, -6], ['arena', 'scooter']] },
  { name: 'HANAMI PARK', boss: 'vac', secs: 210, gy: 11, theme: 1, storm: true, ops: [
    ['g', 9], ['k', 4, 2, -6], ['e', 'cat', -2],
    ['plats', [[2, 3, -2], [2, 3, 0], [2, 3, 2]]], ['g', 6], ['e', 'rug', -2], ['coin', -5, 4],
    ['k', 5, 3, 0], ['g', 6], ['cage', -3], ['hid', 'bone', -5, 5],
    ['up', 2], ['g', 5], ['e', 'pigeon', -2], ['pit', 3], ['g', 6], ['k', 3, 2, -5], ['trap', -3],
    ['plats', [[2, 3, -2], [2, 2, -2]]], ['g', 5], ['e', 'cat', -2], ['vault'], ['g', 3],
    ['check', -2], ['dn', 3], ['g', 8], ['e', 'rug', -5], ['e', 'rug', -1], ['k', 6, 2, -8],
    ['wall', 2], ['g', 6], ['cage', -3], ['coin', -3, 4], ['e', 'pigeon', -1],
    ['plats', [[3, 2, -1], [2, 2, -1], [2, 3, 1]]], ['g', 6], ['hid', 'treat', -4, 0], ['e', 'cat', -2],
    ['pit', 4], ['g', 6], ['k', 4, 2, -5], ['e', 'rug', -2],
    ['up', 1], ['g', 6], ['cage', -3], ['e', 'pigeon', -1], ['k', 3, 3, -5], ['arena', 'vac']] },
  { name: 'BISCUIT BEACH', boss: 'croc', secs: 220, gy: 10, theme: 2, tide: true, floor: true, ops: [
    ['g', 9], ['k', 4, 2, -6], ['e', 'clam', -2],
    ['dn', 2], ['g', 6], ['k', 4, 1, -5], ['e', 'rug', -2], ['up', 2], ['g', 5], ['cage', -3],
    ['pit', 3], ['g', 6], ['e', 'gull', -3], ['coin', -4, 4], ['hid', 'bone', -1, 3],
    ['dn', 2], ['g', 8], ['k', 6, 1, -7], ['e', 'clam', -3], ['up', 2], ['g', 4], ['trap', -2],
    ['wall', 2], ['g', 6], ['vault'], ['g', 3], ['check', -2],
    ['dn', 3], ['g', 7], ['e', 'rug', -4], ['k', 5, 1, -6], ['up', 3], ['g', 5], ['cage', -2], ['e', 'gull', -1],
    ['plats', [[2, 3, -2], [2, 3, 0]]], ['dn', 2], ['g', 6], ['e', 'clam', -2], ['hid', 'treat', -4, 0], ['k', 3, 3, -5],
    ['up', 2], ['g', 6], ['coin', -3, 3], ['e', 'gull', -2],
    ['dn', 2], ['g', 6], ['e', 'rug', -3], ['up', 2], ['g', 5], ['cage', -3], ['k', 4, 2, -5], ['arena', 'croc']] },
  { name: 'PAWPRINT SHRINE ISLE', boss: 'fox', secs: 230, gy: 27, rows: 30, theme: 3, ops: [
    ['g', 10], ['k', 4, 2, -7], ['e', 'cat', -2], ['coin', -9, 3],
    ['plats', [[2, 3, -2, 'L'], [1, 3, -2, 'L'], [-6, 3, -2], [1, 3, -2, 'L']]], ['g', 6], ['e', 'wisp', -3], ['cage', -2], ['k', 3, 2, -6],
    ['plats', [[2, 3, -2, 'L'], [2, 3, -1, 'L'], [2, 3, -2]]], ['g', 5], ['hid', 'bone', -3, 4], ['e', 'pigeon', -2],
    ['plats', [[2, 3, -2], [1, 3, -2, 'L']]], ['g', 7], ['check', -6], ['e', 'cat', -2], ['k', 4, 2, -6],
    ['vault'], ['g', 4], ['cage', -2], ['trap', -3],
    ['plats', [[2, 3, -1, 'L'], [2, 3, -1, 'L'], [2, 3, 0]]], ['g', 6], ['e', 'wisp', -3], ['hid', 'treat', -5, 0], ['coin', -2, 3],
    ['pit', 3], ['g', 6], ['e', 'cat', -2], ['k', 4, 2, -5],
    ['plats', [[2, 3, 1, 'L'], [2, 3, 1]]], ['g', 6], ['cage', -3], ['e', 'wisp', -1], ['k', 3, 3, -5], ['arena', 'fox']] },
  { name: 'KIBBLE MINES', boss: 'mole', secs: 220, gy: 11, theme: 4, roof: 1, ops: [
    ['g', 9], ['k', 4, 2, -6], ['e', 'rug', -2], ['e', 'bat', -4],
    ['cart', [['r', 7], ['ramp'], ['gap', 4], ['r', 8], ['ramp'], ['gap', 3], ['r', 9], ['dn', 1], ['r', 6], ['ramp'], ['gap', 4], ['r', 8]]],
    ['g', 6], ['cage', -3], ['coin', -2, 3],
    ['pit', 3], ['g', 6], ['e', 'bat', -3], ['trap', -2], ['k', 3, 2, -6],
    ['up', 2], ['g', 5], ['e', 'cat', -2], ['vault'], ['g', 4], ['check', -2], ['hid', 'bone', -4, 3],
    ['dn', 2], ['g', 6], ['e', 'rug', -3], ['k', 4, 2, -6],
    ['cart', [['r', 6], ['ramp'], ['gap', 3], ['r', 7], ['r', 8], ['ramp'], ['gap', 5], ['r', 6], ['dn', 1], ['r', 10]]],
    ['g', 6], ['cage', -3], ['hid', 'treat', -5, 0], ['coin', -1, 3],
    ['wall', 2], ['g', 6], ['e', 'bat', -3], ['e', 'cat', -1], ['trap', -4],
    ['pit', 4], ['g', 6], ['cage', -3], ['k', 4, 2, -6], ['arena', 'mole']] },
  { name: 'SYNDICATE TOWER', boss: 'claw', secs: 240, tower: 71, theme: 5, ops: [
    ['k', 4, 1, 5], ['e', 'rug', 10], ['coin', 3, 2],
    ['p', 9, 4, 2], ['k', 3, 1, 0], ['p', 3, 4, 2], ['e', 'cat', 1], ['p', 9, 5, 3], ['cage', 3], ['p', 2, 4, 2, 'L'], ['hid', 'bone', 1, 2],
    ['p', 8, 3, 3, '~'], ['p', 11, 4, 4], ['e', 'rug', 1], ['k', 3, 1, 0], ['p', 5, 4, 2], ['trap', 1], ['p', 1, 4, 2], ['coin', 1, 2],
    ['p', 6, 4, 3], ['e', 'pigeon', 2], ['p', 11, 4, 2, 'L'], ['p', 7, 3, 2], ['check', 1], ['k', 3, 1, 0],
    ['p', 2, 5, 3], ['e', 'cat', 2], ['cage', 0], ['p', 9, 4, 3, 'L'], ['hid', 'treat', 1, 0], ['p', 4, 3, 3, '~'], ['p', 9, 5, 4], ['e', 'rug', 3],
    ['p', 3, 4, 3], ['k', 4, 1, 0], ['coin', 2, 2], ['p', 9, 4, 2, 'L'], ['e', 'pigeon', 1], ['p', 4, 4, 3], ['trap', 2], ['p', 10, 4, 2], ['cage', 2],
    ['p', 5, 4, 3], ['k', 3, 1, 0], ['arena', 'claw']] },
];
// ---------- level builder ----------
// Horizontal stages: a cursor walks right laying ground at height gy. Ops:
//  g n (ground) · up k / dn k (ground height) · pit n · line n (bouncy laundry line over a pit) · wall h (crate stack)
//  plats [[gap,len,dy,ch]] (one-way platforms over a pit; ch 'L' = flicker lantern) · vault (block with secret doors and a
//  treat inside) · cart [...] (minecart rail ride) · arena boss. Decorations take dx relative to the cursor (negative = on
//  ground already laid): k n h dx · e type dx · cage dx · coin dx h · hid kind dx h · trap dx · check dx.
// Tower stages: p c0 len up [ch] lays a one-way platform `up` rows above the last one; decorations are relative to it.
const SOLID = new Set(['#', 'X', 'Z', '-', '/']);
export function build(st) {
  const tower = !!st.tower, R = tower ? st.tower : st.rows || 15, MAXC = tower ? 16 : 400;
  const g = Array.from({ length: R }, () => Array(MAXC).fill('.'));
  const L = { name: st.name, rows: R, ents: [], items: [], cages: [], checks: [], traps: [], wps: [], carts: [], arena: null, start: null, tower, lantern: {} };
  const wp = (c, row) => L.wps.push({ x: c * T + 8, y: row * T });
  const fill = (c, top) => { for (let r = Math.max(0, top); r < R; r++) g[r][c] = '#'; };
  let x = 0, gy = st.gy ?? R - 1, lastC = 0, lastRow = gy, lanternN = 0;
  const deco = (op, baseC, baseRow) => { const [k, a, b, c] = op;
    if (k === 'k') { for (let i = 0; i < a; i++) L.items.push({ kind: 'kibble', x: (baseC + c + i) * T + 8, y: (baseRow - b) * T + 8 }); }
    else if (k === 'e') L.ents.push({ type: a, x: (baseC + b) * T + 8, y: baseRow * T });
    else if (k === 'cage') L.cages.push({ x: (baseC + a) * T + 8, y: baseRow * T });
    else if (k === 'coin') L.items.push({ kind: 'coin', x: (baseC + a) * T + 8, y: (baseRow - b) * T + 8, inu: true });
    else if (k === 'hid') L.items.push({ kind: a, x: (baseC + b) * T + 8, y: (baseRow - c) * T + (a === 'treat' ? -6 : 8), hidden: true });
    else if (k === 'trap') L.traps.push({ x: (baseC + a) * T + 8, y: (baseRow - (tower ? 4 : 6)) * T });
    else if (k === 'check') L.checks.push({ x: (baseC + a) * T + 8, y: baseRow * T }); };
  if (tower) {
    for (let r = 0; r < R; r++) { g[r][0] = '#'; g[r][15] = '#'; } for (let c = 0; c < 16; c++) g[R - 1][c] = '#';
    let cy = R - 1; L.start = { x: 3 * T + 8, y: cy * T }; lastC = 1; lastRow = cy; wp(3, cy);
    for (const op of st.ops) { const k = op[0];
      if (k === 'p') { const [, c0, len, up, ch = '='] = op; cy -= up; for (let c = c0; c < c0 + len; c++) { g[cy][c] = ch; if (ch === 'L') L.lantern[c + ',' + cy] = lanternN * 70; } if (ch === 'L') lanternN++; lastC = c0; lastRow = cy; wp(c0 + (len >> 1), cy); }
      else if (k === 'arena') { cy -= 4; for (let c = 1; c < 15; c++) g[cy][c] = 'H'; L.arena = { kind: op[1], x0: 0, floor: cy * T, row: cy, top: Math.max(0, cy + 1 - Math.ceil(VH / T)) * T }; wp(7, cy); }
      else deco(op, lastC, lastRow); }
    L.cols = 16;
  } else {
    L.start = { x: 2 * T + 8, y: gy * T };
    for (const op of st.ops) { const k = op[0];
      if (k === 'g') { for (let i = 0; i < op[1]; i++) fill(x + i, gy); lastRow = gy; wp(x + op[1] - 1, gy); x += op[1]; }
      else if (k === 'up') gy -= op[1]; else if (k === 'dn') gy += op[1];
      else if (k === 'pit') { if (st.floor) for (let i = 0; i < op[1]; i++) fill(x + i, st.tide ? R - 2 : R - 1); x += op[1]; }
      else if (k === 'line') { for (let i = 0; i < op[1]; i++) { g[gy][x + i] = '~'; if (st.floor) fill(x + i, R - 1); } x += op[1]; }
      else if (k === 'wall') { fill(x, gy - op[1]); for (let r = gy - op[1]; r < gy; r++) g[r][x] = 'X'; wp(x, gy - op[1]); x += 1; }
      else if (k === 'plats') { let row = gy; for (const [gap, len, dy, ch = '='] of op[1]) { if (gap > 0 && st.floor) for (let i = 0; i < gap; i++) fill(x + i, R - 1); x += gap; row += dy;
          for (let i = 0; i < len; i++) { g[row][x + i] = ch; if (ch === 'L') L.lantern[(x + i) + ',' + row] = lanternN * 70; if (st.floor) fill(x + i, R - 1); } if (ch === 'L') lanternN++; wp(x + (len >> 1), row); x += len; }
        gy = row; }
      else if (k === 'vault') { const c0 = x; for (let i = 0; i < 4; i++) fill(x + i, gy - 3); for (const r of [gy - 2, gy - 1]) { g[r][c0] = 'S'; g[r][c0 + 3] = 'S'; g[r][c0 + 1] = '.'; g[r][c0 + 2] = '.'; }
        L.items.push({ kind: 'treat', x: (c0 + 1) * T + 16, y: gy * T - 10, vault: true }, { kind: 'kibble', x: (c0 + 1) * T + 8, y: gy * T - 24 }, { kind: 'kibble', x: (c0 + 2) * T + 8, y: gy * T - 24 });
        L.vaults = (L.vaults || 0) + 1; x += 4; }
      else if (k === 'cart') { let ry = gy; for (let i = 0; i < 3; i++) fill(x + i, ry); L.carts.push({ x: (x + 2) * T, y: ry * T }); x += 3;
        for (const [rk, n] of op[1]) { if (rk === 'r') { for (let i = 0; i < n; i++) { fill(x + i, ry + 1); g[ry][x + i] = '-'; } x += n; } else if (rk === 'ramp') { fill(x, ry + 1); g[ry][x] = '/'; x += 1; }
          else if (rk === 'gap') { if (st.floor) for (let i = 0; i < n; i++) fill(x + i, R - 1); x += n; } else if (rk === 'up') ry -= n; else if (rk === 'dn') ry += n; }
        fill(x, ry - 2); g[ry - 2][x] = 'Z'; g[ry - 1][x] = 'Z'; x += 1; gy = ry; lastRow = gy; wp(x + 1, gy); }
      else if (k === 'arena') { const x0 = x; for (let i = 0; i < 16; i++) fill(x + i, gy); for (let r = 0; r < gy; r++) { g[r][x0] = 'G'; g[r][x0 + 15] = '#'; }
        if (op[1] === 'croc') for (let c = x0 + 5; c <= x0 + 10; c++) { g[gy][c] = '.'; g[gy + 1][c] = '.'; }
        if (op[1] === 'scooter') for (const c of [3, 4, 7, 8, 11, 12]) g[gy - 2][x0 + c] = '=';
        if (op[1] === 'fox') for (const [r, c] of [[gy - 4, 3], [gy - 4, 4], [gy - 7, 7], [gy - 7, 8], [gy - 4, 11], [gy - 4, 12]]) g[r][x0 + c] = '=';
        L.arena = { kind: op[1], x0: x0 * T, floor: gy * T, row: gy, top: Math.max(0, gy + 2 - Math.ceil(VH / T)) * T }; wp(x0 + 5, gy); x += 16; }
      else deco(op, x, gy);
    }
    L.cols = x;
  }
  if (st.roof) for (let c = 0; c < L.cols; c++) for (let r = 0; r <= st.roof; r++) if (g[r][c] === '.' || g[r][c] === 'G') g[r][c] = '#';
  L.grid = g.map((row) => row.slice(0, L.cols).join(''));
  return L;
}
export const LEVELS = STAGES.map(build);
// ---------- tile helpers ----------
const key = (c, r) => c + ',' + r;
export const tileAt = (s, c, r) => (c < 0 || c >= s.lv.cols ? '#' : r < 0 || r >= s.lv.rows ? '.' : s.grid[r][c]);
export function lit(s, c, r) { const ph = s.lv.lantern[key(c, r)]; if (ph === undefined) return true; return (s.frame + ph) % 240 < 170; }
export const blinking = (s, c, r) => { const ph = s.lv.lantern[key(c, r)]; if (ph === undefined) return false; const k = (s.frame + ph) % 240; return k >= 120 && k < 170; };
export function solidTile(s, c, r) { const ch = tileAt(s, c, r); if (SOLID.has(ch)) return true; if (ch === 'S') return !s.open.has(key(c, r)); if (ch === 'G') return !!s.locked; return false; }
export function floorTile(s, c, r) { if (solidTile(s, c, r)) return true; const ch = tileAt(s, c, r); if (ch === '=' || ch === '~' || ch === 'H') return true; if (ch === 'L') return lit(s, c, r); return false; }
function boxSolid(s, x, y, hw, h) { const c0 = (x - hw) >> 4, c1 = (x + hw - 1) >> 4, r0 = (y - h) >> 4, r1 = (y - 1) >> 4;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solidTile(s, c, r) || (s.locked && tileAt(s, c, r) === 'H')) return true; return false; }
export function standing(s, b) { if (b.y % T !== 0) return false; const r = b.y >> 4; for (let c = (b.x - b.hw) >> 4; c <= (b.x + b.hw - 1) >> 4; c++) if (floorTile(s, c, r)) return true; return false; }
const underTile = (s, b) => { const r = b.y >> 4; const a = tileAt(s, b.x >> 4, r); return a !== '.' ? a : tileAt(s, (b.x - b.hw) >> 4, r) !== '.' ? tileAt(s, (b.x - b.hw) >> 4, r) : tileAt(s, (b.x + b.hw - 1) >> 4, r); };
function moveX(s, b, v) { b.xa += v; const n = Math.trunc(b.xa); b.xa -= n; const d = Math.sign(n);
  for (let i = 0; i < Math.abs(n); i++) { if (boxSolid(s, b.x + d, b.y, b.hw, b.h)) { b.xa = 0; return true; } b.x += d; } return false; }
function moveY(s, b, v) { b.ya += v; const n = Math.trunc(b.ya); b.ya -= n; const d = Math.sign(n);
  for (let i = 0; i < Math.abs(n); i++) {
    if (d > 0) { if (standing(s, b)) { b.vy = 0; b.ya = 0; return 'land'; } b.y++; }
    else { if (boxSolid(s, b.x, b.y - 1, b.hw, b.h)) { b.vy = 0; b.ya = 0; return 'bonk'; } b.y--; } }
  return d > 0 && standing(s, b) ? 'land' : null; }
const fx = (s, x, y, c, n = 8) => s.fx.push({ x: x - s.cam.x, y: y - s.cam.y + OY, c, n }), pop = (s, x, y, text, c = '#fbf1e0') => s.pops.push({ x: x - s.cam.x, y: y - s.cam.y + OY, text, c, t: 1 });
// ---------- create / stage load ----------
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, loop: 1, stage: 0, over: false, t: 0, frame: 0, acc: 0, ev: [], fx: [], pops: [], shake: 0, flash: 0, extra: false,
    pack: [], rescued: 0, skin: null,
    stats: { kos: 0, stomps: 0, yips: 0, bigBarks: 0, howls: 0, booms: 0, sniffs: 0, zooms: 0, bounces: 0, rescues: 0, maxPack: 0, bosses: 0, stages: 0, coins: 0, bones: 0, treats: 0, secrets: 0, kibble: 0, sentHome: 0, wags: 0, glides: 0 } };
  loadStage(s); return s;
}
export function loadStage(s) {
  const lv = LEVELS[s.stage]; s.lv = lv; s.level = (s.loop - 1) * STAGES.length + s.stage + 1; s.grid = lv.grid.map((r) => r.split('')); s.open = new Set(); s.locked = false; s.boss = null; s.bossDone = false;
  s.timer = Math.max(150, STAGES[s.stage].secs - 10 * (s.loop - 1)) * 60;
  s.enemies = lv.ents.map((e, i) => makeEnemy(s, e.type, e.x, e.y, i));
  s.items = lv.items.filter((it) => !it.inu || s.inu).map((it) => ({ ...it, got: false, hidden: !!it.hidden }));
  s.cages = lv.cages.map((c) => ({ ...c, open: false })); s.checks = lv.checks.map((c) => ({ ...c, on: false }));
  s.traps = lv.traps.map((t) => ({ ...t, y0: t.y, st: 'hang', f: 0, vy: 0 })); s.carts = lv.carts.map((c) => ({ x: c.x, y: c.y, x0: c.x, y0: c.y, xa: 0, ya: 0, vy: 0, hw: 10, h: 8, st: 'idle' }));
  s.yips = []; s.shots = []; s.bone = null; s.waves = []; s.home = []; s.check = { ...lv.start }; s.wi = 0; s.trail = [];
  s.storm = STAGES[s.stage].storm ? { on: false, warn: false } : null; s.tide = STAGES[s.stage].tide ? { y: 0, rising: false } : null; tideFrame(s);
  s.p = null; resetPlayer(s, lv.start.x, lv.start.y); s.cam = { x: 0, y: 0 }; s.look = 0; snapCam(s); s.ready = 110; s.clearing = 0; s.dying = 0; s.stageT = 0;
}
function resetPlayer(s, x, y) { const z = s.p ? s.p.zoom : 0;
  s.p = { x, y, xa: 0, ya: 0, vy: 0, hw: 5, h: 14, face: 1, onG: true, coyote: 0, jbuf: 0, wag: false, jumping: false, glide: false, bounced: false, inv: 90, knock: 0, hurtF: 0,
    bHold: 0, yipCd: 0, bigCd: 0, boneCd: 0, sniffHold: 0, sniffT: 0, sniffCd: 0, zoom: z, zoomT: 0, cart: null, ry: 0, breath: 0, prevA: false, prevB: false, prevC: false, prevUp: false, anim: 0, air: 0, stompChain: 0, wantBig: false }; }
// ---------- step ----------
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.flash = Math.max(0, s.flash - dt); s.shake = Math.max(0, s.shake - dt);
  s.acc += dt * 60; while (s.acc >= 1 && !s.over) { s.acc -= 1; frame(s, inp); }
}
function frame(s, inp) {
  s.frame++; s.t += 1 / 60; const p = s.p;
  const a = !!inp.a, b = !!inp.b, c = !!inp.c, up = !!inp.up, aP = a && !p.prevA, bP = b && !p.prevB, bR = !b && p.prevB, cP = c && !p.prevC, upP = up && !p.prevUp;
  p.prevA = a; p.prevB = b; p.prevC = c; p.prevUp = up;
  if (s.ready > 0) { s.ready--; return; }
  if (s.clearing > 0) { if (--s.clearing === 0) nextStage(s); return; }
  if (s.dying > 0) { if (--s.dying === 0) afterDeath(s); return; }
  s.stageT++;
  if (--s.timer <= 0) { pop(s, p.x, p.y - 24, 'TIME UP!', '#ff5d73'); s.lastDeath = 'time'; return loseLife(s); }
  envFrame(s);
  playerFrame(s, inp, { a, b, aP, bP, bR, cP, upP });
  if (s.dying || s.clearing) return;
  for (const e of s.enemies) if (!e.gone && active(s, e)) enemyFrame(s, e);
  if (s.boss) bossFrame(s, s.boss);
  projFrame(s); trapsFrame(s); pickups(s); if (!s.clearing) contact(s);
  s.enemies = s.enemies.filter((e) => !e.gone || e.deadF-- > 0);
  if (!s.extra && s.score >= PTS.extraLifeAt) { s.extra = true; s.lives++; s.ev.push('pow'); pop(s, p.x, p.y - 30, '1UP!', '#5fd37a'); }
  arenaCheck(s); camera(s);
  s.trail.unshift({ x: p.x, y: p.y, face: p.face, onG: p.onG }); if (s.trail.length > 90) s.trail.length = 90;
  for (const h of s.home) { h.t--; h.x += h.dir * 2; } s.home = s.home.filter((h) => h.t > 0);
}
const has = (s, k) => s.pack.includes(k);
export const inWater = (s, b) => !!s.tide && b.y - 6 > s.tide.y;
export const TIDE = { lo: 12 * T + 10, hi: 10 * T + 12, period: 900 };
function tideFrame(s) { if (!s.tide) return; const k = (1 - Math.cos((s.frame / TIDE.period) * Math.PI * 2)) / 2; const was = s.tide.y; s.tide.y = Math.round(TIDE.lo + (TIDE.hi - TIDE.lo) * k); s.tide.rising = s.tide.y < was;
  if (s.frame % TIDE.period === Math.round(TIDE.period * 0.08) && s.p) { s.ev.push('tell'); pop(s, s.p.x, s.p.y - 34, has(s, 'warn') ? 'KUMO: TIDE COMING IN!' : 'TIDE RISING!', '#7ef0ff'); } }
function envFrame(s) { tideFrame(s);
  if (s.storm) { const k = s.frame % 960; const was = s.storm.on; s.storm.warn = k >= 540 && k < 600; s.storm.on = k >= 600 && k < 900; if (s.storm.on && !was) { s.ev.push('gust'); pop(s, s.p.x, s.p.y - 34, 'PETAL STORM!', '#ffb8d8'); } } }
// ---------- player ----------
function playerFrame(s, inp, k) {
  const p = s.p; if (p.inv > 0) p.inv--; if (p.yipCd > 0) p.yipCd--; if (p.bigCd > 0) p.bigCd--; if (p.boneCd > 0) p.boneCd--; if (p.sniffCd > 0 && p.sniffT <= 0) p.sniffCd--;
  if (p.sniffT > 0) { p.sniffT--; sniffReveal(s); if (p.sniffT === 0) p.sniffCd = SNIFF.cd; }
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  // bark: tap = yip on press, keep holding to charge, release when charged = Big Bark (or Pack Howl)
  if (k.bP && p.yipCd <= 0 && s.yips.length < BARK.max && p.hurtF <= 0) yip(s);
  if (k.b) p.bHold++; else { if (k.bR && p.bHold >= BARK.charge && p.bigCd <= 0) bigBark(s); p.bHold = 0; }
  if (k.cP && !s.bone && p.boneCd <= 0 && p.hurtF <= 0) throwBone(s);
  if (k.upP && p.zoom >= ZOOM.full && p.zoomT <= 0) { p.zoomT = ZOOM.dur; p.zoom = 0; s.stats.zooms++; s.ev.push('zoom'); pop(s, p.x, p.y - 26, 'ZOOMIES!', '#7ef0ff'); }
  if (p.cart) return cartRide(s, p, k);
  if (p.hurtF > 0) { p.hurtF--; moveX(s, p, p.knock); gravity(s, p, false); return; }
  // sniff: hold DOWN on the ground
  if (p.onG && inp.down && p.zoomT <= 0 && p.sniffT <= 0 && p.sniffCd <= 0) { if (++p.sniffHold >= SNIFF.hold) { p.sniffHold = 0; p.sniffT = has(s, 'sniff') ? SNIFF.durPerk : SNIFF.dur; s.stats.sniffs++; s.ev.push('sniff'); } gravity(s, p, k.a); return; }
  p.sniffHold = 0;
  const wet = inWater(s, p);
  let vx;
  if (p.zoomT > 0) { p.zoomT--; if (dir && dir !== p.face) p.face = dir; vx = p.face * PHYS.zoom; }
  else { if (dir) p.face = dir; vx = dir * PHYS.walk; }
  if (wet) vx *= PHYS.water;
  if (s.storm?.on && !wet) vx -= 0.3;
  if (s.boss?.pull) vx += s.boss.pull;
  if (moveX(s, p, vx) && p.zoomT > 0) { p.face = -p.face; p.vy = ZOOM.bounceV; p.ya = 0; p.onG = false; p.jumping = false; p.wag = false; p.bounced = true; s.stats.bounces++; s.ev.push('bounce'); fx(s, p.x - p.face * 6, p.y - 8, '#7ef0ff', 6); }
  if (vx && p.onG) p.anim++;
  // jump / tail-wag / swim
  if (k.aP) p.jbuf = PHYS.buffer; else if (p.jbuf > 0) p.jbuf--;
  if (wet) { if (k.aP) { const leap = p.onG || p.y - 18 < s.tide.y; p.vy = leap ? PHYS.jumpV : PHYS.swimV; p.ya = 0; p.onG = false; p.jumping = leap; p.wag = false; s.ev.push(leap ? 'hop' : 'swim'); } }
  else if (p.jbuf > 0 && (p.onG || p.coyote > 0)) { p.vy = PHYS.jumpV; p.ya = 0; p.onG = false; p.coyote = 0; p.jbuf = 0; p.wag = false; p.jumping = true; s.ev.push('hop'); }
  else if (k.aP && !p.onG && !p.wag) { p.vy = Math.min(p.vy, PHYS.wagV); p.ya = 0; p.wag = true; p.jumping = true; p.jbuf = 0; s.stats.wags++; s.ev.push('wag'); fx(s, p.x - p.face * 6, p.y - 4, '#fbf1e0', 4); }
  if (p.jumping && !k.a && p.vy < PHYS.cut) p.vy = PHYS.cut;
  gravity(s, p, k.a);
  p.breath = wet && p.y - 14 > s.tide.y ? p.breath + 1 : Math.max(0, p.breath - 3);
  if (p.breath > PHYS.breath) { p.breath = 0; pop(s, p.x, p.y - 24, 'GLUG!', '#7ef0ff'); hurtPlayer(s, p.x - p.face); }
  if (p.y > s.lv.rows * T + 24) { s.lastDeath = 'pit'; return loseLife(s); }
  if (p.zoomT <= 0 && p.inv <= 0) { const r = (p.y - 4) >> 4; for (const cx of [(p.x - 4) >> 4, (p.x + 3) >> 4]) if (tileAt(s, cx, r) === '^') { hurtPlayer(s, p.x - p.face); break; } }
  if (p.onG) checkpoints(s);
}
function gravity(s, p, holdA) {
  const wet = inWater(s, p), was = p.onG;
  if (standing(s, p) && p.vy >= 0) { if (!p.onG) land(s, p); p.vy = 0; p.coyote = PHYS.coyote; p.air = 0; p.glide = false; if (underTile(s, p) === '~') bounceLine(s, p, holdA); return; }
  p.onG = false; if (was && p.vy >= 0) p.coyote = PHYS.coyote; else if (p.coyote > 0) p.coyote--; p.air++;
  p.vy = Math.min(wet ? PHYS.swimMax : PHYS.maxFall, p.vy + (wet ? PHYS.swimG : PHYS.grav));
  p.glide = !wet && holdA && p.vy > PHYS.glide && (p.wag || p.bounced); if (p.glide) { p.vy = PHYS.glide; if (p.air % 30 === 0) s.stats.glides++; }
  const r = moveY(s, p, p.vy);
  if (r === 'land') { land(s, p); if (underTile(s, p) === '~') bounceLine(s, p, holdA); }
}
function land(s, p) { p.floorY = p.y; p.floorF = s.frame; p.onG = true; p.vy = 0; p.ya = 0; p.jumping = false; p.wag = false; p.bounced = false; p.coyote = PHYS.coyote; p.air = 0; p.stompChain = 0; }
function bounceLine(s, p, holdA) { p.floorY = p.y; p.floorF = s.frame; p.coyote = 0; p.jbuf = 0; p.vy = holdA ? PHYS.bounceHi : PHYS.bounceV; p.ya = 0; p.onG = false; p.jumping = false; p.wag = false; p.bounced = true; s.ev.push('boing'); }
function cartRide(s, p, k) { const C = p.cart;
  if (C.st === 'ride') { const hit = moveX(s, C, 2.6 + 0.05 * Math.min(10, s.level)); C.vy = Math.min(PHYS.maxFall, C.vy + PHYS.grav); moveY(s, C, C.vy);
    if (standing(s, C) && tileAt(s, C.x >> 4, C.y >> 4) === '/') { C.vy = -4.6; C.ya = 0; s.ev.push('hop'); }
    if (hit) { C.st = 'done'; p.cart = null; p.x = C.x; p.y = Math.round(C.y - 8 + Math.min(0, p.ry)); p.vy = -4.4; p.ya = 0; p.onG = false; p.jumping = false; p.wag = false; p.xa = 0; p.ry = 0; p.zoomT = 0; s.ev.push('thud'); s.shake = 0.15; return; }
    if (C.y > s.lv.rows * T + 24) { C.st = 'done'; p.cart = null; s.lastDeath = 'pit'; return loseLife(s); } }
  if (k.aP && p.ry === 0) { p.vy = PHYS.jumpV; p.jumping = true; p.wag = false; s.ev.push('hop'); } else if (k.aP && !p.wag) { p.vy = PHYS.wagV; p.wag = true; s.ev.push('wag'); }
  if (p.jumping && !k.a && p.vy < PHYS.cut) p.vy = PHYS.cut;
  if (p.ry < 0 || p.vy < 0) { p.vy = Math.min(PHYS.maxFall, p.vy + PHYS.grav); p.ry += p.vy; if (p.ry >= 0) { p.ry = 0; p.vy = 0; p.jumping = false; p.wag = false; } }
  p.x = C.x; p.y = Math.round(C.y - 8 + p.ry); p.onG = p.ry === 0; p.face = 1;
}
function boardCarts(s) { const p = s.p; if (p.cart || p.hurtF > 0) return; for (const C of s.carts) if (C.st === 'idle' && Math.abs(C.x - p.x) < 12 && p.y >= C.y - 14 && p.y <= C.y + 2 && p.vy >= 0) { C.st = 'ride'; p.cart = C; p.ry = 0; p.vy = 0; p.zoomT = 0; s.ev.push('cart'); pop(s, p.x, p.y - 28, 'ALL ABOARD!', '#f2c14e'); } }
function checkpoints(s) { const p = s.p; for (const c of s.checks) if (!c.on && Math.abs(c.x - p.x) < 12 && Math.abs(c.y - p.y) < 8) { c.on = true; s.check = { x: c.x, y: c.y }; s.score += PTS.check; s.ev.push('bell'); pop(s, c.x, c.y - 30, 'CHECKPOINT', '#7ef0ff'); } }
// ---------- moves ----------
function yip(s) { const p = s.p; p.yipCd = BARK.cd; s.stats.yips++; s.yips.push({ x: p.x + p.face * 8, y: p.y - 8, vx: p.face * BARK.speed, d: 0 }); s.ev.push('yip'); }
function bigBark(s) { const p = s.p, howl = s.inu && s.pack.length >= BARK.howlPack; p.bigCd = howl ? BARK.howlCd : BARK.bigCd; s.ev.push(howl ? 'howl' : 'bigbark'); s.shake = 0.15;
  if (howl) s.stats.howls++; else s.stats.bigBarks++; s.waves.push({ x: p.x, y: p.y - 8, f: 0, howl });
  let n = 0; const inRow = (y) => howl || Math.abs(y - (p.y - 8)) < BARK.row;
  for (const e of s.enemies) if (!e.gone && (howl ? onScreen(s, e.x, e.y) : Math.abs(e.x - p.x) < BARK.reach && inRow(e.y - e.h / 2))) { e.stun = BARK.stun; n++; }
  for (const o of s.shots) if (o.kind !== 'capsule' && (howl || (Math.abs(o.x - p.x) < BARK.reach && inRow(o.y)))) o.gone = true;
  if (s.boss && s.boss.hp > 0 && s.boss.st !== 'intro' && (howl || inRow(s.boss.y - s.boss.h / 2) && Math.abs(s.boss.x - p.x) < BARK.reach)) s.boss.stun = howl ? 120 : BARK.bossStun;
  if (n) { s.score += n * PTS.stun; pop(s, p.x, p.y - 30, `${howl ? 'PACK HOWL' : 'BIG BARK'} x${n}`, '#7ef0ff'); } }
function throwBone(s) { const p = s.p; s.stats.booms++; s.bone = { x: p.x + p.face * 6, y: p.y - 9, vx: p.face * BONE.v0, f0: p.face, f: 0, back: false, hit: new Set(), y0: p.y - 9 }; s.ev.push('whirr'); }
function sniffReveal(s) { const p = s.p, R = has(s, 'sniff') ? SNIFF.rPerk : SNIFF.r;
  for (const it of s.items) if (it.hidden && !it.got && Math.hypot(it.x - p.x, it.y - p.y) < R) { it.hidden = false; s.ev.push('ping'); pop(s, it.x, it.y - 10, '!', '#f2c14e'); }
  if (s.frame % 4) return; let opened = 0; const c0 = (p.x - R) >> 4, c1 = (p.x + R) >> 4, r0 = Math.max(0, (p.y - R) >> 4), r1 = Math.min(s.lv.rows - 1, (p.y + R) >> 4);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (tileAt(s, c, r) === 'S' && !s.open.has(key(c, r))) { s.open.add(key(c, r)); opened++; }
  if (opened) { s.stats.secrets++; s.score += PTS.secret; s.ev.push('open'); pop(s, p.x, p.y - 34, 'SECRET DOOR!', '#f2c14e'); } }
// ---------- enemies ----------
export function makeEnemy(s, type, x, y, i = 0) {
  const fly = type === 'pigeon' || type === 'gull' || type === 'wisp' || type === 'bat';
  const e = { type, x, y: fly ? (type === 'bat' ? (STAGES[s.stage].roof ? (STAGES[s.stage].roof + 1) * T + 10 : y - 6 * T) : y - 3 * T - 4) : y, ax: x, ay: 0, xa: 0, ya: 0, vy: 0, hw: 6, h: type === 'clam' ? 10 : 12, face: -1, st: 'walk', f: (i * 37) % 90, hp: HP[type], stun: 0, flash: 0, gone: false, deadF: 0, i };
  e.ay = e.y; if (type === 'clam') e.st = 'shut'; if (type === 'bat') e.st = 'hang'; if (fly && type !== 'bat') e.st = 'fly'; return e;
}
export const onScreen = (s, x, y, m = 0) => x > s.cam.x - m && x < s.cam.x + W + m && y > s.cam.y - m && y < s.cam.y + VH + m;
const active = (s, e) => onScreen(s, e.x, e.y, 56);
export const harmful = (s, e) => !e.gone && e.stun <= 0;
export const stompable = (e) => (e.type !== 'wisp' && e.type !== 'clam') || (e.type === 'clam' && e.st !== 'shut') || (e.stun > 0 && e.type !== 'wisp');
export const enemyBox = (e) => ({ x0: e.x - e.hw, x1: e.x + e.hw, y0: e.y - e.h, y1: e.y });
function enemyFrame(s, e) {
  const p = s.p, sp = speeds(s.level), wu = windups(s.level); e.f++; if (e.flash > 0) e.flash--;
  if (e.stun > 0) { e.stun--; if (e.type === 'rug' || e.type === 'cat' || e.type === 'clam') egrav(s, e); return; }
  const dx = p.x - e.x, adx = Math.abs(dx), dy = p.y - e.y;
  const walk = (v) => { const nx = e.x + Math.sign(v) * (e.hw + 2); if (!standing(s, { x: nx, y: e.y, hw: 1 }) || moveX(s, e, v)) e.face = -e.face; };
  switch (e.type) {
    case 'rug': walk(e.face * sp.rug); egrav(s, e); break;
    case 'cat':
      if (e.st === 'walk') { walk(e.face * sp.cat); egrav(s, e); if (adx < 70 && adx > 12 && Math.abs(dy) < 20 && Math.sign(dx) === e.face) { e.st = 'wind'; e.f = 0; s.ev.push('tell'); } }
      else if (e.st === 'wind') { if (e.f >= wu.cat) { e.st = 'pounce'; e.f = 0; e.vy = -3.2; e.ya = 0; e.pv = Math.min(2.4, adx / 24 + 0.4); } }
      else if (e.st === 'pounce') { moveX(s, e, e.face * e.pv); egrav(s, e); if ((e.f > 6 && standing(s, e)) || e.f > 120) { e.st = 'rest'; e.f = 0; } }
      else if (e.st === 'rest') { egrav(s, e); if (e.f > 45) { e.st = 'walk'; e.f = 0; if (adx > 8) e.face = Math.sign(dx); } }
      break;
    case 'pigeon': case 'gull':
      if (e.st === 'fly') { e.x = Math.round(e.ax + Math.sin(e.f / 50) * 28); e.y = Math.round(e.ay + Math.sin(e.f / 17) * 4); e.face = Math.sign(dx) || -1; if (adx < 80 && dy > 10 && e.f > 60) { e.st = 'coo'; e.f = 0; s.ev.push('tell'); } }
      else if (e.st === 'coo') { if (e.f >= wu.coo) { e.st = 'swoop'; e.f = 0; e.ty = p.y - 8; e.face = Math.sign(dx) || -1; } }
      else if (e.st === 'swoop') { e.x += e.face * Math.round(sp.swoop); if (e.y < e.ty) e.y += 2; if (e.f > 70 || Math.abs(e.x - e.ax) > 140) { e.st = 'rise'; e.f = 0; } }
      else if (e.st === 'rise') { e.x += Math.sign(e.ax - e.x); if (e.y > e.ay) e.y--; if (Math.abs(e.x - e.ax) < 2 && e.y <= e.ay) { e.st = 'fly'; e.f = -90; } }
      break;
    case 'clam':
      egrav(s, e); if (e.st === 'shut') { if (e.f > 80) { e.st = 'open'; e.f = 0; } }
      else if (e.st === 'open') { e.face = Math.sign(dx) || -1; if (e.f === wu.clam && adx < 120) { s.shots.push(shot(e.x + e.face * 6, e.y - 5, e.face * sp.shot, 0, 'pearl')); s.ev.push('spit'); } if (e.f > 75) { e.st = 'shut'; e.f = 0; } }
      break;
    case 'wisp':
      e.x = Math.round(e.ax + Math.sin(e.f / 40) * 22); e.y = Math.round(e.ay + Math.sin(e.f / 20) * 10);
      if (e.st === 'fly' && e.f % 150 === 149 && adx < 130) { e.st = 'flare'; e.g = 0; s.ev.push('tell'); }
      if (e.st === 'flare' && ++e.g >= wu.flare) { const d = Math.hypot(dx, dy - 8) || 1; s.shots.push(shot(e.x, e.y - 6, (dx / d) * sp.shot * 0.8, ((dy - 8) / d) * sp.shot * 0.8, 'ember')); e.st = 'fly'; s.ev.push('spit'); }
      break;
    case 'bat':
      if (e.st === 'hang') { if (adx < 56 && dy > 0) { e.st = 'drop'; e.f = 0; e.face = Math.sign(dx) || 1; s.ev.push('tell'); } }
      else if (e.st === 'drop') { e.x += e.face * 2; e.y = Math.round(e.ay + Math.sin(Math.min(e.f, 60) / 60 * Math.PI) * Math.min(64, Math.max(24, dy + 4))); if (e.f > 60) { e.st = 'flee'; e.f = 0; } }
      else if (e.st === 'flee') { e.x += e.face * 2; e.y = Math.max(e.ay, e.y - 1); if (e.f > 120) { e.st = 'hang'; e.ax = e.x; e.f = -120; } }
      break;
  }
  if (e.y > s.lv.rows * T + 32) e.gone = true;
}
function egrav(s, e) { if (standing(s, e) && e.vy >= 0) { e.vy = 0; return; } e.vy = Math.min(PHYS.maxFall, e.vy + PHYS.grav); moveY(s, e, e.vy); }
function koEnemy(s, e, how) { if (e.gone) return; e.gone = true; e.deadF = 24; const pts = PTS.ko[e.type] + (how === 'zoom' ? PTS.zoomKo : 0); s.score += pts; s.stats.kos++; s.p.zoom = Math.min(ZOOM.full, s.p.zoom + ZOOM.ko);
  fx(s, e.x, e.y - 6, '#f2c14e', 10); pop(s, e.x, e.y - 18, '+' + pts, '#f2c14e'); s.ev.push('ko'); }
function hurtEnemy(s, e, dmg) { if (e.type === 'clam' && e.st === 'shut' && e.stun <= 0) { s.ev.push('tink'); return false; } e.hp -= dmg; e.flash = 8; if (e.hp <= 0) koEnemy(s, e, 'hit'); else s.ev.push('hit'); return true; }
// ---------- projectiles ----------
function shot(x, y, vx, vy, kind) { return { x, y, vx, vy, kind, f: 0, gone: false }; }
const inBox = (x, y, b, m = 0) => x > b.x0 - m && x < b.x1 + m && y > b.y0 - m && y < b.y1 + m;
function projFrame(s) { const p = s.p;
  for (const y of s.yips) { y.x += y.vx; y.d += Math.abs(y.vx); if (y.d > BARK.range || solidTile(s, y.x >> 4, y.y >> 4)) { y.gone = true; continue; }
    for (const e of s.enemies) if (!e.gone && y.x > e.x - e.hw - 3 && y.x < e.x + e.hw + 3 && y.y > e.y - e.h - 3 && y.y < e.y + 2) { y.gone = true; hurtEnemy(s, e, 1); break; }
    if (y.gone) continue; for (const o of s.shots) if (!o.gone && o.kind !== 'wave' && o.kind !== 'rock' && Math.abs(o.x - y.x) < 6 && Math.abs(o.y - y.y) < 7) { o.gone = true; y.gone = true; s.score += 10; fx(s, o.x, o.y, '#fbf1e0', 4); }
    if (y.gone) continue; for (const c of s.cages) if (!c.open && Math.abs(c.x - y.x) < 10 && y.y > c.y - 22 && y.y < c.y) { y.gone = true; rescue(s, c); }
    const hb = s.boss && bossHitBox(s.boss); if (!y.gone && hb && inBox(y.x, y.y, hb, 3)) { y.gone = true; bossHurt(s, 1); } }
  s.yips = s.yips.filter((y) => !y.gone);
  const B = s.bone; if (B) { B.f++;
    if (!B.back) { B.x += B.vx; B.vx -= B.f0 * BONE.decel; B.y = Math.round(B.y0 - Math.sin(Math.min(1, B.f / 30) * Math.PI) * 14); if (Math.sign(B.vx) !== B.f0 || solidTile(s, B.x >> 4, B.y >> 4)) B.back = true;
      for (const e of s.enemies) if (!e.gone && !B.hit.has(e) && Math.abs(e.x - B.x) < e.hw + 5 && B.y > e.y - e.h - 5 && B.y < e.y + 4) { B.hit.add(e); hurtEnemy(s, e, 1); }
      for (const c of s.cages) if (!c.open && Math.abs(c.x - B.x) < 12 && B.y > c.y - 24 && B.y < c.y) rescue(s, c);
      const hb = s.boss && bossHitBox(s.boss); if (hb && !B.hit.has(s.boss) && inBox(B.x, B.y, hb, 5)) { B.hit.add(s.boss); bossHurt(s, 1); } }
    else { const dx = p.x - B.x, dy = p.y - 9 - B.y, d = Math.hypot(dx, dy) || 1, v = Math.min(BONE.home, 1.5 + B.f * 0.05); B.x += Math.round((dx / d) * v); B.y += Math.round((dy / d) * v);
      for (const it of s.items) if (!it.got && !it.hidden && Math.abs(it.x - B.x) < 10 && Math.abs(it.y - B.y) < 10) collect(s, it, true);
      if (d < BONE.catch) { s.bone = null; p.boneCd = BONE.cd; s.ev.push('catch'); } }
    if (s.bone && B.f > BONE.life) { s.bone = null; p.boneCd = BONE.cd; } }
  for (const o of s.shots) { o.f++;
    if (o.kind === 'rock' && o.wait > 0) { o.wait--; continue; }
    o.x += o.vx; o.y += o.vy; if (o.kind === 'yarn' || o.kind === 'bomb' || o.kind === 'rock' || o.kind === 'capsule') o.vy = Math.min(4, o.vy + 0.15);
    if (o.kind === 'wave') { if (o.f > 200 || solidTile(s, (o.x + Math.sign(o.vx) * 4) >> 4, o.y >> 4)) o.gone = true; }
    else if (o.kind === 'capsule') { if (s.boss) { const lo = s.boss.Lx + 10, hi = s.boss.R - 10; if (o.x < lo || o.x > hi) { o.x = Math.max(lo, Math.min(hi, o.x)); o.vx = -o.vx; } } if (o.vy > 0 && floorTile(s, o.x >> 4, (o.y + 6) >> 4)) { o.vy = 0; o.vx = 0; o.y = ((o.y + 6) >> 4) * T - 6; o.land ??= o.f; if (o.f - o.land > 40) { o.gone = true; const en = makeEnemy(s, o.pop || 'rug', o.x, o.y + 6); en.face = Math.sign(p.x - o.x) || 1; s.enemies.push(en); s.ev.push('pop'); fx(s, o.x, o.y, '#ff9ad0', 10); } } }
    else if (o.f > 300 || solidTile(s, o.x >> 4, o.y >> 4) || (o.kind === 'rock' && floorTile(s, o.x >> 4, o.y >> 4) && o.y % T < 5)) { if (o.kind !== 'pearl') fx(s, o.x, o.y, '#c8a878', 6); o.gone = true; } }
  s.shots = s.shots.filter((o) => !o.gone);
  for (const w of s.waves) w.f++; s.waves = s.waves.filter((w) => w.f < 24);
}
// ---------- traps / pickups / cages ----------
function trapsFrame(s) { const p = s.p, warnPerk = has(s, 'warn'), tw = trapWarn(warnPerk);
  for (const t of s.traps) { if (t.st === 'gone') continue;
    if (t.st === 'hang') { if (Math.abs(t.x - p.x) < tw.dist && p.y > t.y) { t.st = 'shake'; t.f = 0; t.warn = tw.warn; if (warnPerk) { s.ev.push('warnbark'); pop(s, p.x - p.face * 14, p.y - 26, 'KUMO: WOOF! ABOVE!', '#ffb84a'); } else s.ev.push('tell'); } }
    else if (t.st === 'shake') { if (++t.f >= t.warn) { t.st = 'fall'; t.vy = 0.5; } }
    else if (t.st === 'fall') { t.vy = Math.min(5, t.vy + 0.3); t.y += t.vy; const fr = (t.y + 8) >> 4; if (solidTile(s, t.x >> 4, fr) || (floorTile(s, t.x >> 4, fr) && (t.y + 8) % T < 6) || t.y > s.lv.rows * T) { t.st = 'gone'; fx(s, t.x, t.y + 6, '#c87a4a', 12); s.ev.push('thud'); }
      if (t.st === 'fall' && p.inv <= 0 && p.zoomT <= 0 && Math.abs(t.x - p.x) < 11 && t.y + 7 > p.y - 14 && t.y - 7 < p.y) { t.st = 'gone'; fx(s, t.x, t.y, '#c87a4a', 12); hurtPlayer(s, t.x); } } } }
function collect(s, it, byBone = false) { const p = s.p; it.got = true;
  if (it.kind === 'kibble') { s.score += PTS.kibble; s.stats.kibble++; const was = p.zoom; p.zoom = Math.min(ZOOM.full, p.zoom + ZOOM.kibble); s.ev.push('kib'); if (p.zoom >= ZOOM.full && was < ZOOM.full) pop(s, p.x, p.y - 28, 'ZOOMIES READY! (UP)', '#7ef0ff'); }
  else if (it.kind === 'coin') { s.score += PTS.coin; s.stats.coins++; s.ev.push('coin'); pop(s, it.x, it.y - 10, '+500 $KIBBLE', '#f2c14e'); }
  else if (it.kind === 'bone') { s.score += PTS.bone; s.stats.bones++; s.ev.push('pow'); pop(s, it.x, it.y - 10, 'BONE +' + PTS.bone, '#fbf1e0'); }
  else if (it.kind === 'treat') { s.score += PTS.treat; s.stats.treats++; s.ev.push('pow'); pop(s, it.x, it.y - 12, 'TREAT +' + PTS.treat, '#ff9ad0'); }
  if (byBone) fx(s, it.x, it.y, '#fbf1e0', 3); }
function pickups(s) { const p = s.p, mag = has(s, 'fetch'); boardCarts(s);
  for (const it of s.items) { if (it.got || it.hidden) continue; const dx = p.x - it.x, dy = p.y - 7 - it.y;
    if (mag && (it.kind === 'kibble' || it.kind === 'coin') && Math.abs(dx) < 56 && Math.abs(dy) < 56) { it.x += Math.sign(dx) * Math.min(2, Math.abs(dx)); it.y += Math.sign(dy) * Math.min(2, Math.abs(dy)); }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 12) collect(s, it); }
  for (const c of s.cages) if (!c.open && Math.abs(c.x - p.x) < 12 && Math.abs(c.y - p.y) < 14) rescue(s, c); }
function rescue(s, c) { c.open = true; const k = KINDS[s.rescued % KINDS.length]; s.rescued++; s.stats.rescues++; s.score += PTS.rescue; s.ev.push('rescue');
  if (s.pack.length < PACK_MAX) s.pack.push(k.id); s.stats.maxPack = Math.max(s.stats.maxPack, s.pack.length);
  pop(s, c.x, c.y - 30, `${k.name} JOINS!`, '#5fd37a'); pop(s, c.x, c.y - 21, k.perk.toUpperCase(), '#c8f0c8'); fx(s, c.x, c.y - 10, '#5fd37a', 14); }
// ---------- contact ----------
function contact(s) { const p = s.p; const P = { x0: p.x - p.hw, x1: p.x + p.hw, y0: p.y - p.h, y1: p.y };
  for (const e of s.enemies) { if (e.gone) continue; const E = enemyBox(e); if (!(P.x0 < E.x1 && P.x1 > E.x0 && P.y0 < E.y1 && P.y1 > E.y0)) continue;
    if (p.zoomT > 0) { koEnemy(s, e, 'zoom'); continue; }
    const stomp = p.vy > 0 && !p.onG && p.y - Math.ceil(p.vy) - 1 <= E.y0 + 4;
    if (stomp && stompable(e)) { koEnemy(s, e, 'stomp'); p.stompChain++; s.score += PTS.stomp * p.stompChain; s.stats.stomps++; p.vy = p.prevA ? PHYS.jumpV : PHYS.stompV; p.ya = 0; p.jumping = p.prevA; p.wag = false; s.ev.push('stomp'); continue; }
    if (stomp && e.type === 'clam') { p.vy = PHYS.stompV; p.ya = 0; s.ev.push('tink'); continue; }
    if (!harmful(s, e) || p.inv > 0) continue; hurtPlayer(s, e.x); return; }
  if (p.zoomT > 0) { for (const o of s.shots) if (!o.gone && o.kind !== 'capsule' && inBox(o.x, o.y, P, 2)) o.gone = true; }
  else if (p.inv <= 0) for (const o of s.shots) if (!o.gone && o.kind !== 'capsule' && !(o.kind === 'rock' && o.wait > 0) && inBox(o.x, o.y, P, 2) && (o.kind !== 'wave' || o.y > p.y - 10)) { if (o.kind !== 'wave') o.gone = true; hurtPlayer(s, o.x); return; }
  const B = s.boss; if (B && B.hp > 0) { const hb = bossHarmBox(B); if (hb && P.x0 < hb.x1 && P.x1 > hb.x0 && P.y0 < hb.y1 && P.y1 > hb.y0) {
    const stomp = p.vy > 0 && !p.onG && p.y - Math.ceil(p.vy) - 1 <= hb.y0 + 5, hit = bossHitBox(B);
    if (stomp && hit && B.stompable) { bossHurt(s, 2); p.vy = PHYS.jumpV; p.ya = 0; p.jumping = false; p.wag = false; s.ev.push('stomp'); }
    else if (p.zoomT <= 0 && p.inv <= 0 && B.harm) hurtPlayer(s, B.x); } }
}
export function hurtPlayer(s, fromX) { const p = s.p; if (p.inv > 0 || s.dying) return;
  if (s.pack.length) { const k = s.pack.pop(), t = s.trail[Math.min(s.trail.length - 1, 14 * (s.pack.length + 1))] || p; s.home.push({ kind: k, x: t.x, y: t.y, t: 120, dir: Math.sign(t.x - fromX) || -1 }); s.stats.sentHome++;
    pop(s, p.x, p.y - 26, `${KINDS.find((q) => q.id === k).name} RAN HOME!`, '#ffb84a'); p.inv = 110; p.zoomT = 0; s.ev.push('ouch'); s.flash = 0.8; s.shake = 0.2;
    if (!p.cart) { p.hurtF = 16; p.knock = (Math.sign(p.x - fromX) || -p.face) * 1.6; p.vy = -2.6; p.ya = 0; p.onG = false; p.jumping = false; } return; }
  s.lastDeath = 'hit'; loseLife(s); }
function loseLife(s) { const p = s.p; s.lives--; s.ev.push('die'); s.dying = 90; s.shake = 0.35; s.flash = 1; p.zoomT = 0; fx(s, p.x, p.y - 8, '#ff5d73', 14); }
function afterDeath(s) { if (s.lives <= 0) { s.over = true; return; }
  const c = s.locked ? { x: s.lv.tower ? 7 * T + 8 : s.lv.arena.x0 + 3 * T + 8, y: s.lv.arena.floor } : s.check; resetPlayer(s, c.x, c.y); s.p.inv = 120;
  s.timer = Math.max(s.timer, RESPAWN_SECS * 60); s.yips = []; s.shots = []; s.bone = null; s.waves = [];
  for (const C of s.carts) if (C.st === 'ride') { C.st = 'idle'; C.x = C.x0; C.y = C.y0; C.vy = 0; C.xa = 0; C.ya = 0; }
  for (const C of s.carts) if (C.st === 'idle' && C.x0 < c.x && s.carts.some((D) => D !== C && D.x0 > C.x0 && D.x0 < c.x)) C.st = 'done';
  for (const e of s.enemies) if (!e.gone && Math.abs(e.x - c.x) < 100 && Math.abs(e.y - c.y) < 80) e.stun = 120;
  for (const t of s.traps) if (t.st === 'shake' || t.st === 'fall') { t.st = 'hang'; t.y = t.y0; }
  if (s.boss) bossReset(s, s.boss); s.wi = 0; snapCam(s); s.ready = 50; }
function nextStage(s) { s.stage++; if (s.stage >= STAGES.length) { s.stage = 0; s.loop++; } s.ev.push('level'); const z = s.p.zoom; loadStage(s); s.p.zoom = z; }
// ---------- camera (integer, dead-zone + look-ahead; locks to the boss arena) ----------
const clampCam = (s, x, y) => ({ x: Math.max(0, Math.min(s.lv.cols * T - W, x)), y: Math.max(0, Math.min(s.lv.rows * T - VH, y)) });
const camTarget = (s) => clampCam(s, s.p.x + s.look - 128, s.p.y - 150);
function arenaCam(s) { const A = s.lv.arena; return clampCam(s, A.x0, s.lv.tower ? A.top : A.floor + 2 * T - VH); }
function snapCam(s) { s.look = s.p.face * 24; const t = s.locked ? arenaCam(s) : camTarget(s); s.cam.x = t.x; s.cam.y = t.y; }
function camera(s) { const p = s.p, cam = s.cam;
  if (s.locked) { const t = arenaCam(s); cam.x += Math.sign(t.x - cam.x) * Math.min(4, Math.abs(t.x - cam.x)); cam.y += Math.sign(t.y - cam.y) * Math.min(4, Math.abs(t.y - cam.y)); return; }
  const want = (p.zoomT > 0 ? 40 : 24) * p.face; if (s.look !== want) s.look += Math.sign(want - s.look);
  const t = camTarget(s), dz = 12;
  if (cam.x < t.x - dz) cam.x = t.x - dz; else if (cam.x > t.x + dz) cam.x = t.x + dz;
  const dzy = p.onG || p.cart ? 4 : 40; if (cam.y < t.y - dzy) cam.y = Math.min(t.y - dzy, cam.y + 4); else if (cam.y > t.y + dzy) cam.y = Math.max(t.y + dzy, cam.y - 4);
  const c = clampCam(s, cam.x, cam.y); cam.x = c.x; cam.y = c.y; }
// ---------- boss arena + bosses (original) ----------
export const BOSSES = {
  scooter: { name: 'SIR WHISKERTON', title: 'on his rocket scooter', hp: 10, mini: false },
  vac: { name: 'PETAL-VAC 3000', title: 'rug bot street sweeper (mini-boss)', hp: 8, mini: true },
  croc: { name: 'TIDE CROC', title: 'lord of the lagoon', hp: 12, mini: false },
  fox: { name: 'LANTERN FOX', title: 'keeper of the shrine lights', hp: 12, mini: false },
  mole: { name: 'MINE MOLE', title: 'foreman of the kibble mines', hp: 12, mini: false },
  claw: { name: 'GREY CAT BOSS', title: 'in the giant claw machine', hp: 14, mini: false } };
export const bossHp = (kind, loop) => BOSSES[kind].hp + 3 * (loop - 1);
function arenaCheck(s) { const A = s.lv.arena, p = s.p; if (!A || s.locked || s.bossDone) return;
  const inside = s.lv.tower ? p.onG && p.y === A.floor : p.x >= A.x0 + 40 && p.onG;
  if (inside) { s.locked = true; s.check = s.lv.tower ? { x: 7 * T + 8, y: A.floor } : { x: A.x0 + 3 * T + 8, y: A.floor }; startBoss(s); } }
function startBoss(s) { const A = s.lv.arena, k = A.kind, R = A.x0 + 15 * T, Lx = A.x0 + T; s.ev.push('boss'); s.timer = Math.max(s.timer, 75 * 60);
  s.enemies = []; s.traps = [];
  const B = { kind: k, name: BOSSES[k].name, hp: bossHp(k, s.loop), maxHp: bossHp(k, s.loop), st: 'intro', f: 0, n: 0, inv: 0, flash: 0, stun: 0, face: -1, x: R - 40, y: A.floor, hw: 12, h: 18, harm: false, stompable: false, guard: false, Lx, R, floor: A.floor, cyc: 0, pull: 0 };
  if (k === 'vac') { B.y = A.floor - 40; B.h = 16; B.hw = 14; } if (k === 'croc') { B.x = A.x0 + 8 * T; B.y = A.floor + 2 * T; B.hw = 14; B.h = 12; }
  if (k === 'fox') { B.perch = 2; B.x = A.x0 + 12 * T; B.y = A.floor - 4 * T; } if (k === 'mole') { B.hw = 13; B.h = 16; }
  if (k === 'claw') { B.x = A.x0 + 8 * T; B.cy = A.floor - 9 * T; B.y = B.cy; B.hw = 10; B.h = 14; }
  s.boss = B; pop(s, s.cam.x + 128, s.cam.y + 60, B.name, '#ff5d73'); }
function bossReset(s, B) { B.st = 'intro'; B.f = 0; B.stun = 0; B.pull = 0; B.harm = false; B.guard = false; if (B.kind === 'claw') B.y = B.cy; if (B.kind === 'croc') B.y = B.floor + 2 * T; if (B.kind === 'vac') B.y = B.floor - 40;
  if (B.kind === 'fox') { B.perch = 2; B.x = s.lv.arena.x0 + 12 * T; B.y = B.floor - 4 * T; } if (B.kind === 'mole') { B.y = B.floor; B.h = 16; } if (B.kind === 'scooter') B.x = B.R - 40; }
const hidden = (B) => B.st === 'intro' || (B.kind === 'croc' && B.st === 'lurk') || (B.kind === 'mole' && B.st === 'dig') || (B.kind === 'fox' && B.st === 'vanish');
export function bossHitBox(B) { if (B.hp <= 0 || B.guard || hidden(B)) return null; if (B.kind === 'claw' && B.st !== 'stuck') return null; return { x0: B.x - B.hw, x1: B.x + B.hw, y0: B.y - B.h, y1: B.y }; }
export function bossHarmBox(B) { if (B.hp <= 0 || B.stun > 0 || hidden(B)) return null; return { x0: B.x - B.hw, x1: B.x + B.hw, y0: B.y - B.h, y1: B.y }; }
function bossHurt(s, dmg) { const B = s.boss; if (!B || B.inv > 0 || B.hp <= 0) return; if (B.guard) { s.ev.push('tink'); return; }
  B.hp -= dmg * (B.stun > 0 ? 2 : 1); B.inv = 20; B.flash = 10; s.ev.push('hit'); s.score += 50; if (B.hp <= 0) bossKO(s, B); }
function bossKO(s, B) { const mini = BOSSES[B.kind].mini, pts = mini ? PTS.mini : PTS.boss(s.stage); s.score += pts; s.stats.bosses++; pop(s, B.x, B.y - 34, `${B.name} DOWN +${pts}`, '#f2c14e'); fx(s, B.x, B.y - 12, '#f2c14e', 30); s.ev.push('boom'); s.shake = 0.4;
  s.boss = null; s.bossDone = true; s.shots = []; s.enemies = []; const tb = Math.floor(s.timer / 60) * PTS.timeBonus, pb = s.pack.length * PTS.pack; s.score += tb + pb; s.stats.stages++;
  s.clearInfo = { tb, pb, name: B.name }; s.ev.push('home'); s.clearing = 200; }
const tell = (s, n) => Math.max(8, Math.round(n / speeds(s.level).boss));
function bossFrame(s, B) {
  const p = s.p, fast = speeds(s.level).boss, tell = (n) => Math.max(8, Math.round(n / fast)), dx = p.x - B.x, adx = Math.abs(dx); B.f++; if (B.inv > 0) B.inv--; if (B.flash > 0) B.flash--;
  B.pull = 0; if (B.stun > 0) { B.stun--; if (B.kind === 'vac' && B.y < B.floor - 18) B.y++; return; }
  const next = (st) => { B.st = st; B.f = 0; B.n = 0; B.harm = true; B.stompable = false; B.guard = false; };
  switch (B.kind) {
    case 'scooter':
      if (B.st === 'intro') { B.harm = false; if (B.f > 80) next('rev'); }
      else if (B.st === 'rev') { B.face = B.x > (B.Lx + B.R) / 2 ? -1 : 1; if (B.f === 1) s.ev.push('dash'); B.stompable = true; if (B.f > tell(44)) { next('ride'); B.guard = true; } }
      else if (B.st === 'ride') { B.guard = true; B.x += B.face * Math.round(3 * fast); if (B.x <= B.Lx + 14 || B.x >= B.R - 14) { B.x = Math.max(B.Lx + 14, Math.min(B.R - 14, B.x)); s.shake = 0.25; s.ev.push('thud'); B.cyc++; next(B.cyc % 2 ? 'skid' : 'toss'); } }
      else if (B.st === 'skid') { B.harm = false; B.stompable = true; if (B.f > tell(80)) next('rev'); }
      else if (B.st === 'toss') { B.stompable = true; if (B.f % tell(22) === 0 && B.n < 3) { B.n++; const v = Math.max(1, Math.min(2.6, adx / 48)); s.shots.push(shot(B.x, B.y - 20, Math.sign(dx) * v, -3.2, 'yarn')); s.ev.push('spit'); } if (B.f > tell(90)) next('rev'); }
      break;
    case 'vac':
      if (B.st === 'intro') { B.harm = false; if (B.f > 80) next('hover'); }
      else if (B.st === 'hover') { B.face = Math.sign(dx) || -1; if (adx > 30) B.x += Math.sign(dx); B.y = Math.round(B.floor - 40 + Math.sin(B.f / 12) * 3); if (B.f > tell(90)) { next('suckWind'); s.ev.push('tell'); } }
      else if (B.st === 'suckWind') { if (B.f > tell(30)) next('suck'); }
      else if (B.st === 'suck') { B.pull = Math.sign(B.x - p.x) * 0.75; if (B.f % 20 === 0) s.ev.push('gust'); if (B.f > 80) next('spit'); }
      else if (B.st === 'spit') { if (B.f % tell(18) === 0 && B.n < 3) { B.n++; s.shots.push(shot(B.x, B.y, (B.n - 2) * 0.9 + Math.sign(dx) * 0.6, -2.2, 'bomb')); s.ev.push('spit'); } if (B.f > tell(70)) next('tired'); }
      else if (B.st === 'tired') { B.harm = false; B.stompable = true; if (B.y < B.floor - 16) B.y++; if (B.f > tell(110)) next('hover'); }
      break;
    case 'croc': { const A = s.lv.arena, lag0 = A.x0 + 5 * T + 10, lag1 = A.x0 + 11 * T - 10;
      if (B.st === 'intro') { B.harm = false; if (B.f > 80) next('lurk'); }
      else if (B.st === 'lurk') { B.harm = false; B.y = B.floor + 2 * T; B.h = 12; const tx = Math.max(lag0, Math.min(lag1, p.x)); B.x += Math.sign(tx - B.x) * Math.min(Math.abs(tx - B.x), Math.round(1.4 * fast)); if (B.f > tell(80)) { next('snap'); s.ev.push('chomp'); } }
      else if (B.st === 'snap') { B.y = B.floor + 2 * T - Math.round(Math.sin(Math.min(1, B.f / 30) * Math.PI) * 44); B.h = 26; if (B.f > 30) { B.h = 12; next('bask'); B.side = p.x < (lag0 + lag1) / 2 ? 1 : -1; } }
      else if (B.st === 'bask') { B.harm = B.f < 20; B.stompable = true; const bx = B.side > 0 ? A.x0 + 12 * T + 8 : A.x0 + 3 * T; if (B.f < 20) { B.x += Math.sign(bx - B.x) * Math.min(5, Math.abs(bx - B.x)); B.y = B.floor; } if (B.f > tell(120)) { next('slap'); s.ev.push('tell'); } }
      else if (B.st === 'slap') { B.stompable = true; if (B.f === tell(24)) { s.shots.push(shot(B.x - 14, B.floor - 5, -1.8 * fast, 0, 'wave'), shot(B.x + 14, B.floor - 5, 1.8 * fast, 0, 'wave')); s.ev.push('splash'); } if (B.f > tell(60)) { next('lurk'); B.x = Math.max(lag0, Math.min(lag1, B.x)); } }
      break; }
    case 'fox': { const A = s.lv.arena, perches = [[A.x0 + 4 * T, A.floor - 4 * T], [A.x0 + 8 * T, A.floor - 7 * T], [A.x0 + 12 * T, A.floor - 4 * T]];
      if (B.st === 'intro') { B.harm = false; if (B.f > 80) next('perch'); }
      else if (B.st === 'perch') { B.face = Math.sign(dx) || -1; if (B.f > tell(40)) { next('fire'); s.ev.push('tell'); } }
      else if (B.st === 'fire') { if (B.f % tell(24) === 0 && B.n < (s.loop > 1 ? 3 : 2)) { B.n++; const ddx = p.x - B.x, ddy = p.y - 8 - (B.y - 10), d = Math.hypot(ddx, ddy) || 1; s.shots.push(shot(B.x, B.y - 10, (ddx / d) * 1.25 * fast, (ddy / d) * 1.25 * fast, 'foxfire')); s.ev.push('spit'); } if (B.f > tell(70)) { B.cyc++; if (B.cyc % 2) { next('crouch'); s.ev.push('tell'); } else { next('vanish'); s.ev.push('hide'); } } }
      else if (B.st === 'crouch') { B.stompable = true; if (B.f > tell(26)) { next('pounce'); B.tx = Math.max(A.x0 + 2 * T, Math.min(A.x0 + 14 * T, p.x)); B.sx = B.x; B.sy = B.y; } }
      else if (B.st === 'pounce') { const k = Math.min(1, B.f / 36); B.x = Math.round(B.sx + (B.tx - B.sx) * k); B.y = Math.round(B.sy + (B.floor - B.sy) * k - Math.sin(k * Math.PI) * 30); if (k >= 1) { s.shake = 0.2; s.ev.push('thud'); next('dizzy'); } }
      else if (B.st === 'dizzy') { B.harm = false; B.stompable = true; if (B.f > tell(90)) { next('vanish'); s.ev.push('hide'); } }
      else if (B.st === 'vanish') { B.harm = false; if (B.f > tell(40)) { let i = Math.floor(s.rnd() * 3); if (i === B.perch) i = (i + 1) % 3; B.perch = i; B.x = perches[i][0]; B.y = perches[i][1]; next('perch'); } }
      break; }
    case 'mole':
      if (B.st === 'intro') { B.harm = false; if (B.f > 80) { next('dig'); s.ev.push('hide'); } }
      else if (B.st === 'dig') { B.harm = false; B.y = B.floor; B.tellF = B.f > tell(100) - 30; if (!B.tellF) B.x += Math.sign(dx) * Math.min(adx, Math.round(1.3 * fast)); B.x = Math.max(B.Lx + 16, Math.min(B.R - 16, B.x)); if (B.f % 20 === 0) s.ev.push('rumble');
        if (B.f > tell(100)) { next('burst'); s.ev.push('boom'); s.shake = 0.3; for (let i = 0; i < 3 + Math.min(2, s.loop - 1); i++) { const rx = B.Lx + 24 + Math.floor(s.rnd() * (B.R - B.Lx - 48)); s.shots.push({ ...shot(rx, s.cam.y + 2 * T + 8, 0, 0, 'rock'), wait: 40 + i * 12 }); } } }
      else if (B.st === 'burst') { B.h = 16 + Math.round(Math.sin(Math.min(1, B.f / 20) * Math.PI / 2) * 8); if (B.f > 22) next('stuck'); }
      else if (B.st === 'stuck') { B.harm = false; B.stompable = true; if (B.f > tell(100)) { B.h = 16; next('dig'); s.ev.push('hide'); } }
      break;
    case 'claw': { const top = B.cy, phase2 = B.hp <= B.maxHp / 2;
      if (B.st === 'intro') { B.harm = false; if (B.f > 90) next('aim'); }
      else if (B.st === 'aim') { B.harm = false; B.y = top; B.x += Math.sign(dx) * Math.min(adx, Math.round((phase2 ? 2.2 : 1.6) * fast)); B.x = Math.max(B.Lx + 14, Math.min(B.R - 14, B.x)); if (B.f > tell(phase2 ? 60 : 80)) { next('drop'); s.ev.push('tell'); } }
      else if (B.st === 'drop') { if (B.f > 10) B.y = Math.min(B.floor, B.y + Math.round(4 * fast)); if (B.y >= B.floor) { s.shake = 0.3; s.ev.push('thud'); next('stuck'); } }
      else if (B.st === 'stuck') { B.harm = false; B.stompable = true; if (B.f > tell(phase2 ? 70 : 90)) next('rise'); }
      else if (B.st === 'rise') { B.harm = false; B.y = Math.max(top, B.y - 3); if (B.y <= top) { B.cyc++; next(B.cyc % 2 === 0 ? 'capsules' : 'aim'); } }
      else if (B.st === 'capsules') { B.harm = false; if (B.f === 20) { const n = phase2 ? 3 : 2; for (let i = 0; i < n; i++) s.shots.push({ ...shot(B.x, top + 10, (i - (n - 1) / 2) * 1.1, -1.5, 'capsule'), pop: phase2 && i === 1 ? 'cat' : 'rug' }); s.ev.push('spit'); } if (B.f > 60) next('aim'); }
      break; }
  }
}
// ---------- bot: attract mode / tests / human-sim brain ----------
// Follows the stage's route points (from the builder), jumps gaps / walls / steps, tail-wags and glides over long drops,
// yips at enemies in its row, Big Barks crowds, sniffs near secrets, waits out dark lanterns and shaking traps.
const groundAt = (s, x, y) => floorTile(s, x >> 4, y >> 4);
const dropBelow = (s, x, y) => { for (let k = 0; k < 7; k++) if (floorTile(s, x >> 4, (y >> 4) + k)) return k; return 99; };
function clearRun(s, x, y, d, n) { for (let i = 1; i <= n; i++) if (!floorTile(s, (x >> 4) + d * i, y >> 4) || solidTile(s, (x >> 4) + d * i, (y >> 4) - 1)) return false; return true; }
function hiddenNear(s) { const p = s.p; for (const it of s.items) if (it.hidden && !it.got && Math.abs(it.x - p.x) < 110 && Math.abs(it.y - p.y) < 90) return true;
  for (let c = (p.x >> 4) - 5; c <= (p.x >> 4) + 5; c++) for (let r = (p.y >> 4) - 3; r <= (p.y >> 4); r++) if (tileAt(s, c, r) === 'S' && !s.open.has(key(c, r))) return true; return false; }
export function bot(s) { const p = s.p, o = {}; if (s.ready || s.dying || s.clearing || p.hurtF > 0) return o;
  const press = (k) => { if (!(k === 'a' ? p.prevA : k === 'b' ? p.prevB : k === 'c' ? p.prevC : p.prevUp)) o[k] = true; };
  if (p.wantBig && p.bHold < BARK.charge + 1 && p.bigCd <= 0) { o.b = true; } else p.wantBig = false;
  if (p.cart) { const e = s.enemies.find((e) => !e.gone && e.stun <= 0 && e.x > p.x - 4 && e.x - p.x < 120 && Math.abs(e.y - p.y) < 40);
    if (e && e.x - p.x < 48 && p.ry === 0) press('a'); else if (e && Math.abs(e.y - e.h / 2 - (p.y - 8)) < 10) press('b'); if (p.ry < 0 && p.vy < 0) o.a = true; return o; }
  if (s.boss) return bossBot(s, s.boss, o, press);
  let thr = null, td = 1e9; for (const e of s.enemies) { if (e.gone) continue; const d = Math.hypot(e.x - p.x, (e.y - e.h / 2) - (p.y - 7)); if (d < td) { td = d; thr = e; } }
  const wps = s.lv.wps; if (s.lv.tower && (p.onG || s.frame - p.floorF < 2)) { const fy = p.onG ? p.y : p.floorY; let i = 0; while (i < wps.length - 1 && wps[i].y >= fy - 4) i++; s.wi = i; }
  while (!s.lv.tower && s.wi < wps.length - 1) { const w = wps[s.wi]; const reached = Math.abs(p.x - w.x) < 16 && Math.abs(p.y - w.y) < 6 && (p.onG || tileAt(s, w.x >> 4, w.y >> 4) === '~');
    const passed = s.lv.tower ? p.onG && p.y < w.y - 4 : p.x > w.x + 10 && p.y <= w.y + 4; if (reached || passed) s.wi++; else break; }
  const w = s.locked ? { x: s.lv.arena.x0 + 8 * T, y: s.lv.arena.floor } : wps[Math.min(s.wi, wps.length - 1)];
  if (p.zoom >= ZOOM.full && p.zoomT <= 0 && p.onG && !s.lv.tower && clearRun(s, p.x, p.y, 1, 9)) press('up');
  if ((p.sniffHold > 0 || p.sniffT <= 0 && p.sniffCd <= 0 && p.onG && (!thr || td > 90) && hiddenNear(s)) && !inWater(s, p)) { o.down = true; return o; }
  let d = w.x > p.x + 2 ? 1 : w.x < p.x - 2 ? -1 : 0;
  const under = s.lv.tower && Math.abs(w.x - p.x) <= 12 && w.y < p.y - 4; if (under) d = w.x > p.x + 6 ? 1 : w.x < p.x - 6 ? -1 : 0;
  const wc = w.x >> 4, wr = w.y >> 4; if (tileAt(s, wc, wr) === 'L' && p.onG && tileAt(s, p.x >> 4, p.y >> 4) !== 'L' && Math.abs(w.x - p.x) < 90 && (s.frame + s.lv.lantern[key(wc, wr)]) % 240 > 80) d = 0;
  for (const t of s.traps) if ((t.st === 'shake' || t.st === 'fall') && Math.abs(t.x - p.x) < 34) { if (Math.abs(t.x - p.x) < 16) d = d || p.face; else if ((t.x - p.x) * d > 0) d = 0; }
  if (p.onG && w.y < p.y - 20 && s.enemies.some((e) => harmful(s, e) && Math.abs(e.x - w.x) < 44 && Math.abs(e.y - w.y) < 24)) { s.botWait = (s.botWait || 0) + 1; if (s.botWait < 150) d = 0; } else s.botWait = 0;
  if (!d && thr && p.onG && Math.abs(thr.x - p.x) > 6 && Math.abs(thr.x - p.x) < 110 && Math.sign(thr.x - p.x) !== p.face) d = Math.sign(thr.x - p.x);
  if (d) o[d > 0 ? 'right' : 'left'] = true; const fd = d || p.face;
  if (thr) { const ex = thr.x - p.x, ey = (thr.y - thr.h / 2) - (p.y - 7), ahead = Math.sign(ex) === fd || Math.abs(ex) < 4;
    const row = s.enemies.filter((e) => !e.gone && e.stun <= 0 && Math.abs(e.x - p.x) < 150 && Math.abs((e.y - e.h / 2) - (p.y - 8)) < BARK.row).length;
    if (row >= 2 && p.bigCd <= 0 && p.onG) { p.wantBig = true; o.b = true; }
    else if (Math.abs(ey) < 10 && ahead && Math.abs(ex) < 110 && (thr.stun <= 0 || Math.abs(ex) < 60) && !(thr.type === 'clam' && thr.st === 'shut')) press('b');
    else if (ahead && Math.abs(ex) < 90 && ey < -6 && ey > -40 && !s.bone) press('c');
    if (thr.stun <= 0 && p.onG && Math.abs(ex) < 30 && Math.abs(ey) < 22 && (Math.sign(ex) === fd || thr.type === 'cat' && thr.st === 'pounce')) press('a'); }
  for (const q of s.shots) if (p.onG && Math.abs(q.x - p.x) < 36 && Math.abs(q.y - (p.y - 7)) < 12 && Math.sign(p.x - q.x) === Math.sign(q.vx || 1)) press('a');
  if (inWater(s, p)) { if (p.vy > -0.5 && (w.y < p.y || p.breath > 50 || !groundAt(s, p.x + fd * 10, p.y))) press('a'); return o; }
  if (p.onG && d) { const ax = p.x + d * (p.hw + 2), ax2 = p.x + d * (p.hw + 9), gap = (!groundAt(s, ax, p.y) && dropBelow(s, ax, p.y) > 1) || (!groundAt(s, ax2, p.y) && dropBelow(s, ax2, p.y) > 2 && Math.abs(w.x - p.x) > 20), wall = boxSolid(s, p.x + d * 6, p.y, p.hw, p.h) || (boxSolid(s, p.x + d * 14, p.y, p.hw, p.h) && !boxSolid(s, p.x + d * 14, p.y - 18, p.hw, p.h));
    const spike = tileAt(s, (p.x + d * 16) >> 4, (p.y - 4) >> 4) === '^', higher = w.y < p.y - 6 && Math.abs(w.x - p.x) < 60;
    if (gap || wall || spike || higher) press('a'); }
  if (p.onG && under) press('a');
  if (!p.onG) { const below = dropBelow(s, p.x + fd * 8, p.y), wallA = boxSolid(s, p.x + fd * 6, p.y, p.hw, p.h), needUp = w.y < p.y + 2 || wallA;
    if (p.vy < 0 && (needUp || below > 2)) o.a = true;
    if (!p.wag && !p.bounced && p.vy > -1.2 && ((needUp && (w.y < p.y - 20 || wallA)) || below > 3)) o.a = !p.prevA;
    else if (p.vy > 0 && below > 2 && (p.wag || p.bounced)) o.a = true; }
  return o; }
function bossBot(s, B, o, press) { const p = s.p, dx = B.x - p.x, adx = Math.abs(dx), toward = Math.sign(dx) || 1, go = (d) => { delete o.left; delete o.right; o[d > 0 ? 'right' : 'left'] = true; };
  const shoot = () => { if (p.face === toward) press('b'); else go(dx); };
  for (const q of s.shots) { const qx = q.x - p.x;
    if (q.kind === 'rock') { if (Math.abs(qx) < 18) go(qx > 0 ? -1 : 1); continue; }
    if (q.kind === 'capsule') continue;
    if (q.kind === 'foxfire') continue;
    if (Math.abs(qx) < 36 && (q.kind === 'wave' ? Math.sign(-qx) === Math.sign(q.vx) : Math.abs(q.y - (p.y - 8)) < 22) && p.onG) { if (q.kind === 'foxfire' && Math.sign(qx) === p.face) press('b'); else press('a'); } }
  const hb = bossHitBox(B), rowHit = hb && p.y - 8 > hb.y0 - 2 && p.y - 8 < hb.y1 + 2;
  if (p.bigCd <= 0 && hb && adx < 140 && rowHit && B.stun <= 0 && p.onG) { p.wantBig = true; o.b = true; }
  const keep = (lo, hi) => { if (adx > hi) go(dx); else if (adx < lo) go(-dx); };
  const r = bossMove(s, B, o, press, { dx, adx, go, keep, shoot, toward });
  for (const q of s.shots) if (q.kind === 'foxfire') { const qx = p.x - q.x, qy = p.y - 8 - q.y, d = Math.hypot(qx, qy); if (d < 80 && qx * q.vx + qy * q.vy > 0) { if (!q.dodge) { let g = Math.abs(qx) > 3 ? Math.sign(qx) : (p.x < (B.Lx + B.R) / 2 ? 1 : -1); if ((g < 0 && p.x - B.Lx < 40) || (g > 0 && B.R - p.x < 40)) g = -g; q.dodge = g; } go(q.dodge); delete o.b; break; } } if (o.right || o.left) { const d = o.right ? 1 : -1; if (p.onG && boxSolid(s, p.x + d * 6, p.y, p.hw, p.h)) press('a'); if (!p.onG && p.vy < 0 && o.a === undefined) o.a = true; }
  return r; }
function bossMove(s, B, o, press, { dx, adx, go, keep, shoot, toward }) { const p = s.p, A = s.lv.arena;
  switch (B.kind) {
    case 'scooter': { const perches = [3.5, 7.5, 11.5].map((c) => A.x0 + c * T + 8), px = perches.reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a)), onPerch = p.onG && p.y < A.floor - 8;
      if (B.st === 'rev' || B.st === 'ride' || B.st === 'intro') { if (onPerch) { if (Math.abs(px - p.x) > 10) go(px - p.x); return o; } if (Math.abs(px - p.x) > 6) go(px - p.x); if (p.onG && Math.abs(px - p.x) < 14) press('a'); if (!p.onG && p.vy < 0) o.a = true;
        if (B.st === 'ride' && Math.sign(-dx) === B.face && adx < 70 && p.onG) press('a'); return o; }
      keep(28, 60); shoot(); return o; }
    case 'vac': if (B.st === 'suck' || B.st === 'suckWind') { go(-dx); return o; }
      if (B.st === 'tired') { keep(18, 50); shoot(); return o; } keep(30, 70); if (!s.bone && adx < 100 && p.face === toward) press('c'); else if (p.face !== toward) go(dx); if (p.onG && adx < 60) press('a'); if (!p.onG && p.vy > -1 && p.vy < 0.5) press('b'); return o;
    case 'croc': { const A = s.lv.arena, safeX = p.x < A.x0 + 8 * T ? A.x0 + 3 * T : A.x0 + 13 * T;
      if (inWater(s, p)) { go(safeX - p.x); press('a'); return o; }
      if (B.st === 'lurk' || B.st === 'snap') { if (Math.abs(p.x - safeX) > 6) go(safeX - p.x); return o; }
      if (B.st === 'bask' && B.f < 20) return o; keep(22, 46); if (Math.abs(p.x - safeX) > 70) go(safeX - p.x); shoot(); return o; }
    case 'fox': { const mid = (B.Lx + B.R) / 2, roomSide = p.x < mid ? 1 : -1;
      if (B.st === 'crouch') { if (adx < 60) go(Math.abs(p.x - mid) < 40 ? -Math.sign(dx) || roomSide : roomSide); return o; }
      if (B.st === 'pounce') { const tx = B.tx; if (Math.abs(p.x - tx) < 34) go(Math.sign(p.x - tx) * (Math.min(p.x - B.Lx, B.R - p.x) < 34 ? -1 : 1) || roomSide); return o; } }
      if (B.st === 'dizzy') { keep(18, 40); shoot(); return o; }
      if (B.st === 'perch' || B.st === 'fire') { keep(40, 90); if (!s.bone && adx < 110 && p.face === toward) press('c'); else if (p.face !== toward) go(dx); } return o;
    case 'mole': if (B.st === 'dig' || B.st === 'burst') { if (adx < 48) { const away = -Math.sign(dx) || 1, room = away > 0 ? B.R - p.x : p.x - B.Lx;
        if (B.st === 'dig' && room < 56 && B.f < tell(s, 100) - 34) { go(-away); if (adx < 30 && p.onG) press('a'); } else go(away); } return o; } if (B.st === 'stuck') { keep(20, 44); shoot(); } return o;
    case 'claw': if (B.st !== 'drop') B.dodge = 0;
      for (const e of s.enemies) if (!e.gone && e.stun <= 0 && Math.abs(e.x - p.x) < 22 && Math.abs(e.y - p.y) < 16 && p.onG) press('a');
      if (B.st === 'drop') { if (adx < 34 || B.dodge) { if (!B.dodge) { let g = p.x < B.x ? -1 : 1; if ((g < 0 ? p.x - B.Lx : B.R - p.x) < 40) g = -g; B.dodge = g; } go(B.dodge); } return o; }
      if (B.st === 'stuck') { keep(20, 40); shoot(); return o; }
      { let e = null; for (const q of s.enemies) if (!q.gone && Math.abs(q.x - p.x) < 130 && Math.abs(q.x - p.x) > 5 && Math.abs(q.y - p.y) < 20 && (!e || Math.abs(q.x - p.x) < Math.abs(e.x - p.x))) e = q; if (e) { const ex = e.x - p.x; if (Math.sign(ex) === p.face) press('b'); else go(ex); if (Math.abs(ex) < 28 && e.stun <= 0) press('a'); return o; } }
      if (B.st === 'aim') { if (p.x < B.Lx + 48) go(1); else if (p.x > B.R - 48) go(-1); else if (adx < 24) go(s.frame % 200 < 100 ? 1 : -1); } return o;
  }
  return o; }
export const ghostPos = (g, s) => (s && g.stage !== s.stage ? { x: -99, y: -99 } : { x: g.p.x - (s || g).cam.x, y: g.p.y - 8 - (s || g).cam.y + OY });
// cabinet skins (Neon = tickets earned in play, Gold = the optional $KIBBLE burn) only recolour Pip's scarf: no gameplay effect
export const applySkin = (s, skins = []) => { s.skin = skins.includes('gold') ? 'gold' : skins.includes('neon') ? 'neon' : null; return s; };
export { draw } from './pip-art.js';
