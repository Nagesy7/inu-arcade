// Shiba Scuffle (working name): an original top-down 3v3 Shiba team brawler. Two packs of three tug the Big Bone into
// their own kennel. Four original fighter roles (Bruiser, Barker, Snacker, Zoomer) with their own attack + super, a dodge
// roll for everyone, arena hazards (sprinklers, a runaway rug bot, tide surges), crates, treats and bushes to hide in.
// Matches are first to 2 rounds; every round you lose costs a life, every match you win earns one back and ranks you up
// against tougher bot packs. All names, roles, moves, maps and art are original. Fixed 60 Hz, deterministic (seeded).
import { rng } from '../core/rng.js';
export const NAME = 'Shiba Scuffle'; // single source of the player-facing name (working name, pending approval)
export const META = { id: 'shiba-scuffle', title: NAME.toUpperCase(), short: 'SCUFF', color: '#4fc3e8', buttons: 3, coop2p: true, music: 'scuffle', verse: { district: 'arena', spawn: 'door-shiba-scuffle' },
  blurb: 'Three Shibas a side. Tug the Big Bone into your kennel, bark the other pack silly and climb the ranks.',
  controls: 'Move: arrows / stick · A (Space/Z) attack, hold to keep swinging (auto-aims) · B (X/K) super when charged · C (V/L) dodge roll · desktop P2: arrows + , . / (co-op, unranked)',
  inuMove: 'PACK RALLY: when your super lands, nearby packmates heal 25 and gain 30 super charge. $KIBBLE coins (+500) pop out of crates.',
  classicNote: 'Pick a role, tug the Big Bone home, first to 2 rounds wins the match.' };
export const W = 256, H = 256, OY = 20, HB = 10, AY = OY + HB, T = 16, COLS = 16, ROWS = 14; // arena 256x224 at AY
// ---------- tables (all original) ----------
export const ROLES = {
  bruno: { name: 'BRUNO', role: 'BRUISER', hp: 150, speed: 0.95, range: 28, cd: 30, coat: '#c86a2a', dark: '#8a4416', atk: 'Shoulder Shove', sup: 'Belly Flop' },
  kiko: { name: 'KIKO', role: 'BARKER', hp: 95, speed: 1.0, range: 112, cd: 36, coat: '#e0802c', dark: '#b65a1c', atk: 'Yap Volley', sup: 'Echo Howl' },
  dango: { name: 'DANGO', role: 'SNACKER', hp: 100, speed: 1.0, range: 96, cd: 42, coat: '#f0dcb4', dark: '#c8a878', atk: 'Treat Lob', sup: 'Picnic Blanket' },
  zip: { name: 'ZIP', role: 'ZOOMER', hp: 95, speed: 1.35, range: 46, cd: 44, coat: '#3a3040', dark: '#1e1824', atk: 'Nip Dash', sup: 'Tail Tornado' } };
export const ROLE_IDS = Object.keys(ROLES);
export const ATK = { shove: { dmg: 20, knock: 3.4, arc: 0.3, hitAt: 5, len: 12 }, yap: { dmg: 10, speed: 3.2, n: 3, gap: 5, r: 4 }, lob: { dmg: 18, heal: 12, flight: 22, r: 20 }, dash: { dmg: 22, v: 4.6, len: 9, knock: 2.2 },
  flop: { dmg: 32, r: 36, stun: 45, len: 20, dist: 44 }, howl: { dmg: 28, speed: 3, range: 170, r: 12, knock: 2.6 }, picnic: { r: 36, len: 240, heal: 0.35, slow: 0.5, dps: 0.1 }, spin: { len: 90, dmg: 7, every: 8, r: 15, boost: 1.6 },
  roll: { len: 10, v: 3.2, cd: 75 } };
export const SUPER = { full: 100, perDmg: 1.1, perF: 0.03, ko: 20 };
export const PTS = { dmg: 1, ko: 150, assist: 50, bonePx: 1, round: 1000, match: 2500, flawless: 1000, timeBonus: 10, coin: 500, crate: 20, treat: 50 };
export const ROUND_SECS = 60, RESPAWN = 180, BONE = { y: 112, x0: 128, r: 30, v: 0.09, blueWin: 30, redWin: 226 }, LIVES = 3, MAX_LIVES = 5;
export const RANKS = ['PUPPY', 'SCRAPPER', 'BRAWLER', 'TOP DOG', 'ALPHA', 'LEGEND'];
export const rankOf = (m) => RANKS[Math.min(RANKS.length - 1, m - 1)];
// bot skill by match: reaction frames, aim error (rad), chance to roll away from incoming fire, aggression
export function skill(m) { m = Math.min(m, 10); return { react: Math.max(5, 15 - m), aim: Math.max(0.06, 0.38 - 0.04 * m), roll: Math.min(0.65, 0.12 + 0.06 * m), aggro: Math.min(1, 0.45 + 0.07 * m), dmg: Math.min(1.3, 0.62 + 0.08 * m) }; }
// ---------- arenas: left halves (cols 0-7) of rows 0-6; mirrored left/right and top/bottom so both packs get the same map ----------
// '#' wall · 'c' crate · '"' bush (hide) · 's' sprinkler · '~' puddle (slow) · 'B' kennel (left; mirrors to 'R')
export const ARENAS = [
  { name: 'SAKURA YARD', hazard: 'sprinkler', half: ['########', '#...""..', '#.c.""..', '#......#', '#..s....', '#....c..', 'B.......'] },
  { name: 'ROOFTOP PLAZA', hazard: 'rugbot', half: ['########', '#.....""', '#.##..c.', '#.#.....', '#...c.##', '#.......', 'B.......'] },
  { name: 'BOARDWALK', hazard: 'surge', half: ['########', '#~~.....', '#~..c...', '#...""#.', '#.......', '#..c...~', 'B.......'] } ];
export function buildArena(i) { const A = ARENAS[i % ARENAS.length];
  const top = A.half.map((l) => (l + [...l].reverse().join('')).replace(/B$/, 'R')); const rows = [...top, ...[...top].reverse()];
  return rows.map((r) => r.split('')); }
export const MAPS = ARENAS.map((_, i) => buildArena(i));
const SOLID = new Set(['#']);
export const tileAt = (s, c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? '#' : s.map[r][c]);
export const crateAt = (s, c, r) => s.crates.find((k) => k.c === c && k.r === r && k.hp > 0);
export function solidAt(s, x, y) { const c = Math.floor(x / T), r = Math.floor(y / T); const ch = tileAt(s, c, r); return SOLID.has(ch) || (ch === 'c' && !!crateAt(s, c, r)); }
export const boxHits = (s, x, y, h = 5) => solidAt(s, x - h, y - h) || solidAt(s, x + h - 0.01, y - h) || solidAt(s, x - h, y + h - 0.01) || solidAt(s, x + h - 0.01, y + h - 0.01);
export const inBush = (s, x, y) => tileAt(s, Math.floor(x / T), Math.floor(y / T)) === '"';
export const spawnPt = (team, i) => ({ x: team === 0 ? 34 : 222, y: [96, 128, 64][i % 3] + (i >= 3 ? 8 : 0) });
// ---------- state ----------
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, seed, rnd: rng(seed), score: 0, lives: LIVES, level: 1, match: 1, over: false, t: 0, frame: 0, ev: [], fx: [], pops: [], shake: 0, flash: 0,
    phase: 'pick', phaseT: 0, pick: 0, role: null, wins: [0, 0], round: 1, roundsThisMatch: 0, unranked: false, prev: {}, prev2: {}, acc: { dmg: 0, bone: 0 },
    stats: { kos: 0, assists: 0, deaths: 0, dmg: 0, supers: 0, rolls: 0, roundsWon: 0, roundsLost: 0, matches: 0, flawless: 0, crates: 0, treats: 0, coins: 0, rallies: 0, bonePx: 0, heals: 0, bestRank: 1 } };
  s.fighters = []; s.shots = []; s.zones = []; s.items = []; s.crates = []; s.hz = null; s.map = MAPS[0]; s.arena = 0; s.timer = ROUND_SECS * 60;
  return s; }
const P = (s) => s.fighters.find((f) => f.ctl === 'p1');
export const player = P;
function makeFighter(team, role, i, ctl) { const R = ROLES[role], sp = spawnPt(team, i);
  return { team, role, i, ctl, x: sp.x, y: sp.y, hp: R.hp, maxHp: R.hp, fx: team === 0 ? 1 : -1, fy: 0, mx: 0, my: 0, cd: 20, sup: 0, act: null, actF: 0, ax: 1, ay: 0, rollF: 0, rollCd: 0,
    stun: 0, kx: 0, ky: 0, dead: false, respawn: 0, inv: 60, calm: 0, slow: 0, hitBy: new Map(), anim: 0, ai: { t: 0, mx: 0, my: 0, a: false, b: false, c: false, wob: 0 }, rugCd: 0, kos: 0, flash: 0 }; }
// a new match: arena, both packs (player keeps the role picked at the start; bots pick a mix)
function startMatch(s) {
  s.arena = (s.match - 1) % ARENAS.length; s.map = MAPS[s.arena]; s.wins = [0, 0]; s.roundsThisMatch = 0; s.level = s.match; s.stats.bestRank = Math.max(s.stats.bestRank, s.match);
  const mates = ROLE_IDS.filter((r) => r !== s.role), pickR = (pool) => pool.splice(Math.floor(s.rnd() * pool.length), 1)[0];
  const blue = [s.role, pickR(mates), pickR(mates)], foes = [...ROLE_IDS], red = [pickR(foes), pickR(foes), pickR(foes)];
  const keepP2 = s.fighters.some((f) => f.ctl === 'p2');
  s.fighters = [...blue.map((r, i) => makeFighter(0, r, i, i === 0 ? 'p1' : i === 1 && keepP2 ? 'p2' : 'bot')), ...red.map((r, i) => makeFighter(1, r, i, 'bot'))];
  startRound(s); }
function startRound(s) {
  s.crates = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (s.map[r][c] === 'c') s.crates.push({ c, r, hp: 30, hit: 0 });
  s.shots = []; s.zones = []; s.items = []; s.bone = { x: BONE.x0, y: BONE.y, v: 0, push: 0 }; s.timer = ROUND_SECS * 60; s.roundKos = [0, 0]; s.coinDrop = false;
  for (const f of s.fighters) { const sp = spawnPt(f.team, f.i); Object.assign(f, { x: sp.x, y: sp.y, hp: f.maxHp, dead: false, respawn: 0, inv: 60, act: null, actF: 0, rollF: 0, stun: 0, kx: 0, ky: 0, slow: 0, sup: Math.min(f.sup, 60), cd: 20, fx: f.team === 0 ? 1 : -1, fy: 0 }); f.hitBy.clear(); }
  const hz = ARENAS[s.arena].hazard; s.hz = { kind: hz, t: 120, st: 'idle', band: 0, x: 128, y: 40, vx: 0.8, vy: 0.6 };
  s.phase = 'ready'; s.phaseT = 100; s.ev.push('bell'); }
// ---------- step ----------
const keys = (inp) => ({ left: !!inp?.left, right: !!inp?.right, up: !!inp?.up, down: !!inp?.down, a: !!inp?.a, b: !!inp?.b, c: !!inp?.c });
const edge = (k, prev) => ({ ...k, aP: k.a && !prev.a, bP: k.b && !prev.b, cP: k.c && !prev.c, upP: k.up && !prev.up, dnP: k.down && !prev.down, lP: k.left && !prev.left, rP: k.right && !prev.right });
export function step(s, dt, inp = {}) {
  s.frame++; s.t += dt; const k1 = edge(keys(inp), s.prev); s.prev = keys(inp); const raw2 = inp.p2 ? keys(inp.p2) : null, k2 = raw2 ? edge(raw2, s.prev2) : null; if (raw2) s.prev2 = raw2;
  if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 2);
  if (s.phase === 'pick') { if (k1.lP || k1.upP) { s.pick = (s.pick + ROLE_IDS.length - 1) % ROLE_IDS.length; s.ev.push('blip'); } if (k1.rP || k1.dnP) { s.pick = (s.pick + 1) % ROLE_IDS.length; s.ev.push('blip'); }
    if (++s.phaseT > 20 && (k1.aP || s.phaseT > 60 * 20)) { s.role = ROLE_IDS[s.pick]; s.ev.push('select'); startMatch(s); } return; }
  // desktop co-op: player 2 joins as a packmate (the run becomes unranked)
  if (k2 && k2.aP && !s.fighters.some((f) => f.ctl === 'p2') && s.phase !== 'over') { const m = s.fighters.find((f) => f.team === 0 && f.ctl === 'bot'); if (m) { m.ctl = 'p2'; s.unranked = true; pop(s, m.x, m.y - 16, 'P2 JOINED · CO-OP (UNRANKED)', '#5fd37a'); s.ev.push('select'); } }
  if (s.phase === 'ready') { if (--s.phaseT <= 0) { s.phase = 'fight'; s.ev.push('fight'); } animIdle(s); return; }
  if (s.phase === 'roundEnd' || s.phase === 'matchEnd') { if (--s.phaseT <= 0) afterRound(s); animIdle(s); return; }
  // fight
  const sk = skill(s.match);
  for (const f of s.fighters) { if (f.ctl === 'bot') brain(s, f, sk); }
  for (const f of s.fighters) fighterFrame(s, f, f.ctl === 'p1' ? k1 : f.ctl === 'p2' ? (k2 || edge(keys({}), {})) : null, sk);
  shotsFrame(s); zonesFrame(s); hazardFrame(s); itemsFrame(s); boneFrame(s);
  if (s.inu && !s.coinDrop && s.timer < 30 * 60) { s.coinDrop = true; s.items.push({ kind: 'coin', x: 128, y: 40 + 144 * (s.round % 2), t: 900 }); }
  if (--s.timer <= 0) { const d = s.bone.x - BONE.x0; endRound(s, Math.abs(d) < 4 ? (s.roundKos[0] === s.roundKos[1] ? -1 : s.roundKos[0] > s.roundKos[1] ? 0 : 1) : d < 0 ? 0 : 1, false); }
  if (s.bone.x <= BONE.blueWin) endRound(s, 0, true); else if (s.bone.x >= BONE.redWin) endRound(s, 1, true);
  const sc = Math.floor(s.acc.dmg) + Math.floor(s.acc.bone); if (sc > 0) { s.score += sc; s.acc.dmg -= Math.floor(s.acc.dmg); s.acc.bone -= Math.floor(s.acc.bone); }
}
function animIdle(s) { for (const f of s.fighters) { f.anim = 0; if (f.inv > 0) f.inv--; } }
const pop = (s, x, y, text, c = '#fbf1e0') => s.pops.push({ x, y: y + AY, text, c, t: 1 });
const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y: y + AY, c, n });
// ---------- fighters ----------
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isP = (f) => f && (f.ctl === 'p1' || f.ctl === 'p2');
export const alive = (s, team) => s.fighters.filter((f) => !f.dead && (team === undefined || f.team === team));
// hidden in a bush unless a rival is close (or the hider is flashing from a hit / mid-attack)
export const seen = (s, f, by) => !inBush(s, f.x, f.y) || f.flash > 0 || !!f.act || s.fighters.some((o) => o.team !== f.team && !o.dead && dist(o, f) < 30) || (by && dist(by, f) < 30);
export function los(s, a, b) { const d = dist(a, b), n = Math.ceil(d / 6); for (let i = 1; i < n; i++) { const t = i / n; if (solidAt(s, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false; } return true; }
function moveF(s, f, dx, dy) { let hit = false; if (dx) { if (!boxHits(s, f.x + dx, f.y)) f.x += dx; else hit = true; } if (dy) { if (!boxHits(s, f.x, f.y + dy)) f.y += dy; else hit = true; } return hit; }
const puddle = (s, f) => tileAt(s, Math.floor(f.x / T), Math.floor(f.y / T)) === '~';
export function speedOf(s, f) { return 1.1 * ROLES[f.role].speed * (f.slow > 0 ? 0.55 : 1) * (puddle(s, f) ? 0.65 : 1) * (f.act === 'spin' ? ATK.spin.boost : 1) * (f.act === 'shove' ? 0.4 : 1); }
// player aim: nearest seen rival inside range and roughly ahead; otherwise straight ahead
export function autoAim(s, f, range) { let best = null, bd = 1e9;
  for (const o of s.fighters) { if (o.team === f.team || o.dead || !seen(s, o, f)) continue; const d = dist(f, o); if (d > range + 18) continue; const dot = ((o.x - f.x) * f.fx + (o.y - f.y) * f.fy) / (d || 1); if (dot < 0.1 && d > 22) continue; if (d < bd) { bd = d; best = o; } }
  if (!best) return { x: f.fx, y: f.fy, t: null }; const d = dist(f, best) || 1; return { x: (best.x - f.x) / d, y: (best.y - f.y) / d, t: best }; }
function fighterFrame(s, f, k, sk) {
  if (f.dead) { if (--f.respawn <= 0) { const sp = spawnPt(f.team, f.i); Object.assign(f, { x: sp.x, y: sp.y, hp: f.maxHp, dead: false, inv: 90, act: null, stun: 0, kx: 0, ky: 0, slow: 0 }); f.hitBy.clear(); if (isP(f)) s.ev.push('hop'); } return; }
  if (f.inv > 0) f.inv--; if (f.cd > 0) f.cd--; if (f.rollCd > 0) f.rollCd--; if (f.slow > 0) f.slow--; if (f.flash > 0) f.flash--; if (f.rugCd > 0) f.rugCd--; f.calm++;
  f.sup = Math.min(SUPER.full, f.sup + SUPER.perF); if (f.calm > 150 && f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + 0.25);
  if (Math.abs(f.kx) + Math.abs(f.ky) > 0.05) { moveF(s, f, f.kx, f.ky); f.kx *= 0.82; f.ky *= 0.82; } else { f.kx = 0; f.ky = 0; }
  if (f.stun > 0) { f.stun--; return; }
  let mx = 0, my = 0, a = false, bP = false, cP = false;
  if (k) { mx = (k.right ? 1 : 0) - (k.left ? 1 : 0); my = (k.down ? 1 : 0) - (k.up ? 1 : 0); if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; } a = k.a; bP = k.bP; cP = k.cP; }
  else { mx = f.ai.mx; my = f.ai.my; a = f.ai.a; bP = f.ai.b; cP = f.ai.c; f.ai.b = false; f.ai.c = false; }
  if (f.rollF > 0) { f.rollF--; moveF(s, f, f.rx * ATK.roll.v, f.ry * ATK.roll.v); return; }
  if (f.act) { actFrame(s, f); if (f.act === 'dash' || f.act === 'flop') return; }
  if (mx || my) { const v = speedOf(s, f); moveF(s, f, mx * v, my * v); if (f.act !== 'spin') { f.fx = mx; f.fy = my; } f.anim++; } else f.anim = 0;
  if (cP && f.rollCd <= 0 && f.act !== 'flop') { const l = Math.hypot(mx, my); f.rx = l ? mx / l : f.fx; f.ry = l ? my / l : f.fy; f.rollF = ATK.roll.len; f.rollCd = ATK.roll.cd; f.inv = Math.max(f.inv, ATK.roll.len); if (f.act !== 'spin') f.act = null; if (isP(f)) s.stats.rolls++; s.ev.push('roll'); return; }
  if (bP && f.sup >= SUPER.full && !f.act) return doSuper(s, f);
  if (a && f.cd <= 0 && !f.act) doAttack(s, f);
}
function aimFor(s, f, range) { if (!isP(f)) { const l = Math.hypot(f.ai.ax, f.ai.ay) || 1; return { x: f.ai.ax / l, y: f.ai.ay / l, t: f.ai.tgt }; } return autoAim(s, f, range); }
function doAttack(s, f) { const R = ROLES[f.role], am = aimFor(s, f, R.range); f.ax = am.x; f.ay = am.y; f.cd = R.cd; f.fx = am.x; f.fy = am.y; f.act = { bruno: 'shove', kiko: 'yap', dango: 'lob', zip: 'dash' }[f.role]; f.actF = 0; f.hitSet = new Set();
  if (f.act === 'lob') { const t = am.t, d = t ? Math.min(R.range, dist(f, t)) : R.range * 0.8; const tx = f.x + am.x * d, ty = f.y + am.y * d; s.shots.push({ kind: 'lob', team: f.team, owner: f, x: f.x, y: f.y, sx: f.x, sy: f.y, tx, ty, f: 0, len: ATK.lob.flight }); f.act = null; s.ev.push('lob'); }
  else s.ev.push(f.act === 'shove' ? 'shove' : f.act === 'dash' ? 'dash' : 'yap'); }
function doSuper(s, f) { const am = aimFor(s, f, f.role === 'kiko' ? 170 : f.role === 'zip' ? 60 : 60); f.ax = am.x; f.ay = am.y; f.fx = am.x; f.fy = am.y; f.sup = 0; f.supHit = false; f.actF = 0; f.hitSet = new Set(); if (isP(f)) s.stats.supers++; s.shake = 0.12;
  if (f.role === 'bruno') { f.act = 'flop'; f.fx0 = f.x; f.fy0 = f.y; s.ev.push('flopup'); }
  else if (f.role === 'kiko') { f.act = 'howling'; s.shots.push({ kind: 'howl', team: f.team, owner: f, x: f.x + am.x * 8, y: f.y + am.y * 8, vx: am.x * ATK.howl.speed, vy: am.y * ATK.howl.speed, life: ATK.howl.range / ATK.howl.speed, hit: new Set(), sup: true }); s.ev.push('howl'); }
  else if (f.role === 'dango') { f.act = null; s.zones.push({ team: f.team, owner: f, x: f.x, y: f.y, r: ATK.picnic.r, t: ATK.picnic.len }); s.ev.push('picnic'); rally(s, f); }
  else { f.act = 'spin'; s.ev.push('spin'); } }
function rally(s, f) { if (!s.inu || f.supHit) return; f.supHit = true; let n = 0; for (const o of alive(s, f.team)) if (o !== f && dist(o, f) < 60) { o.hp = Math.min(o.maxHp, o.hp + 25); o.sup = Math.min(SUPER.full, o.sup + 30); n++; fx(s, o.x, o.y - 6, '#5fd37a', 6); }
  if (n) { if (isP(f)) s.stats.rallies++; pop(s, f.x, f.y - 18, 'PACK RALLY!', '#5fd37a'); s.ev.push('rally'); } }
function actFrame(s, f) { const A = f.act; f.actF++;
  if (A === 'shove') { if (f.actF === ATK.shove.hitAt) { for (const o of s.fighters) { if (o.team === f.team || o.dead) continue; const d = dist(f, o); if (d > ROLES.bruno.range) continue; const dot = ((o.x - f.x) * f.ax + (o.y - f.y) * f.ay) / (d || 1); if (dot < ATK.shove.arc && d > 8) continue; hurt(s, f, o, ATK.shove.dmg, f.ax * ATK.shove.knock, f.ay * ATK.shove.knock); }
      hitCrateAt(s, f.x + f.ax * 14, f.y + f.ay * 14, 20, f); } if (f.actF >= ATK.shove.len) f.act = null; }
  else if (A === 'yap') { if ((f.actF - 1) % ATK.yap.gap === 0) s.shots.push({ kind: 'yap', team: f.team, owner: f, x: f.x + f.ax * 6, y: f.y + f.ay * 6, vx: f.ax * ATK.yap.speed, vy: f.ay * ATK.yap.speed, life: ROLES.kiko.range / ATK.yap.speed });
    if (f.actF >= ATK.yap.n * ATK.yap.gap) f.act = null; }
  else if (A === 'dash') { const hit = moveF(s, f, f.ax * ATK.dash.v, f.ay * ATK.dash.v); for (const o of s.fighters) if (o.team !== f.team && !o.dead && !f.hitSet.has(o) && dist(f, o) < 12) { f.hitSet.add(o); hurt(s, f, o, ATK.dash.dmg, f.ax * ATK.dash.knock, f.ay * ATK.dash.knock); f.actF = ATK.dash.len; }
    if (hit) { hitCrateAt(s, f.x + f.ax * 9, f.y + f.ay * 9, 15, f); f.actF = ATK.dash.len; } if (f.actF >= ATK.dash.len) f.act = null; }
  else if (A === 'flop') { const t = f.actF / ATK.flop.len, d = ATK.flop.dist / ATK.flop.len; moveF(s, f, f.ax * d, f.ay * d); f.hop = Math.sin(t * Math.PI) * 14; f.inv = Math.max(f.inv, 2);
    if (f.actF >= ATK.flop.len) { f.act = null; f.hop = 0; s.shake = 0.25; s.ev.push('flop'); s.zones.push({ kind: 'ring', x: f.x, y: f.y, r: ATK.flop.r, t: 16, team: f.team });
      for (const o of s.fighters) if (o.team !== f.team && !o.dead && dist(o, f) < ATK.flop.r) { const d2 = dist(o, f) || 1; hurt(s, f, o, ATK.flop.dmg, ((o.x - f.x) / d2) * 2.5, ((o.y - f.y) / d2) * 2.5, ATK.flop.stun, true); }
      for (const k of s.crates) if (k.hp > 0 && Math.hypot(k.c * T + 8 - f.x, k.r * T + 8 - f.y) < ATK.flop.r) damageCrate(s, k, 40, f); } }
  else if (A === 'howling') { if (f.actF >= 14) f.act = null; }
  else if (A === 'spin') { if (f.actF % ATK.spin.every === 0) { let any = false; for (const o of s.fighters) if (o.team !== f.team && !o.dead && dist(o, f) < ATK.spin.r) { const d2 = dist(o, f) || 1; hurt(s, f, o, ATK.spin.dmg, ((o.x - f.x) / d2) * 1.6, ((o.y - f.y) / d2) * 1.6, 0, true); any = true; } if (any) s.ev.push('nip'); }
    if (f.actF >= ATK.spin.len) f.act = null; } }
// damage (src null = arena hazard). Returns true on a KO.
export function hurt(s, src, o, amt, kx = 0, ky = 0, stun = 0, sup = false, dot = false) {
  if (o.dead || (o.inv > 0 && !dot)) return false; if (src && src.team === 1) amt *= skill(s.match).dmg;
  o.hp -= amt; o.calm = 0; if (!dot) o.flash = 6; if (o.act !== 'spin') { o.kx += kx; o.ky += ky; if (stun) o.stun = Math.max(o.stun, stun); }
  if (src) { src.calm = 0; src.sup = Math.min(SUPER.full, src.sup + amt * SUPER.perDmg * (sup ? 0 : 1)); o.hitBy.set(src, s.frame); if (sup) rally(s, src); if (isP(src)) { s.acc.dmg += amt * PTS.dmg; s.stats.dmg += amt; } }
  if (!dot) { s.ev.push(isP(o) ? 'ouch' : 'hit'); fx(s, o.x, o.y - 4, o.team === 0 ? '#9fd0ff' : '#ff9a9a', 3); }
  if (o.hp <= 0) { ko(s, src, o); return true; } return false; }
function ko(s, src, o) { o.dead = true; o.hp = 0; o.respawn = RESPAWN; o.act = null; o.rollF = 0; s.roundKos[1 - o.team]++; fx(s, o.x, o.y - 4, '#fbf1e0', 12); s.ev.push('ko'); s.shake = Math.max(s.shake, 0.12);
  if (src) { src.kos++; src.sup = Math.min(SUPER.full, src.sup + SUPER.ko); if (isP(src)) { s.score += PTS.ko; s.stats.kos++; pop(s, o.x, o.y - 14, 'KO! +' + PTS.ko, '#f2c14e'); } }
  for (const [h, t] of o.hitBy) if (h !== src && isP(h) && h.team !== o.team && s.frame - t < 180) { s.score += PTS.assist; s.stats.assists++; pop(s, h.x, h.y - 14, 'ASSIST +' + PTS.assist, '#7ef0ff'); }
  if (isP(o)) { s.stats.deaths++; s.flash = 0.8; pop(s, o.x, o.y - 14, 'KNOCKED OUT', '#ff5d73'); } }
// ---------- crates, shots, zones, hazards, items ----------
function hitCrateAt(s, x, y, d, by) { const k = crateAt(s, Math.floor(x / T), Math.floor(y / T)); if (k) damageCrate(s, k, d, by); }
function damageCrate(s, k, d, by) { k.hp -= d; k.hit = 6; s.ev.push('tink'); if (k.hp > 0) return; const x = k.c * T + 8, y = k.r * T + 8; fx(s, x, y, '#c88a3c', 10); s.ev.push('crate');
  if (isP(by)) { s.score += PTS.crate; s.stats.crates++; } const r = s.rnd(); if (s.inu && r < 0.3) s.items.push({ kind: 'coin', x, y, t: 900 }); else if (r < 0.75) s.items.push({ kind: 'treat', x, y, t: 900 }); }
function shotsFrame(s) {
  for (const q of s.shots) {
    if (q.kind === 'lob') { q.f++; const t = q.f / q.len; q.x = q.sx + (q.tx - q.sx) * t; q.y = q.sy + (q.ty - q.sy) * t; q.h = Math.sin(t * Math.PI) * 26;
      if (q.f >= q.len) { q.gone = true; s.ev.push('splat'); s.zones.push({ kind: 'ring', x: q.x, y: q.y, r: ATK.lob.r, t: 10, team: q.team, heal: true });
        for (const o of s.fighters) { if (o.dead || dist(o, q) > ATK.lob.r) continue; if (o.team === q.team) { if (o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + ATK.lob.heal); if (isP(q.owner)) s.stats.heals += ATK.lob.heal; } } else hurt(s, q.owner, o, ATK.lob.dmg, 0, 0); }
        for (const k of s.crates) if (k.hp > 0 && Math.hypot(k.c * T + 8 - q.x, k.r * T + 8 - q.y) < ATK.lob.r) damageCrate(s, k, 15, q.owner); }
      continue; }
    q.x += q.vx; q.y += q.vy; if (--q.life <= 0) { q.gone = true; continue; }
    if (solidAt(s, q.x, q.y)) { hitCrateAt(s, q.x, q.y, q.kind === 'howl' ? 30 : 8, q.owner); if (q.kind !== 'howl' || tileAt(s, Math.floor(q.x / T), Math.floor(q.y / T)) === '#') { q.gone = true; continue; } }
    const r = q.kind === 'howl' ? ATK.howl.r : ATK.yap.r;
    for (const o of s.fighters) { if (o.team === q.team || o.dead || dist(o, q) > r + 5) continue;
      if (q.kind === 'yap') { hurt(s, q.owner, o, ATK.yap.dmg, q.vx * 0.3, q.vy * 0.3); q.gone = true; break; }
      if (!q.hit.has(o)) { q.hit.add(o); hurt(s, q.owner, o, ATK.howl.dmg, (q.vx / ATK.howl.speed) * ATK.howl.knock, (q.vy / ATK.howl.speed) * ATK.howl.knock, 0, true); } } }
  s.shots = s.shots.filter((q) => !q.gone); }
function zonesFrame(s) { for (const z of s.zones) { z.t--; if (z.kind === 'ring') continue;
    for (const o of s.fighters) { if (o.dead || dist(o, z) > z.r) continue; if (o.team === z.team) { if (o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + ATK.picnic.heal); if (isP(z.owner)) s.stats.heals += ATK.picnic.heal; } } else { o.slow = Math.max(o.slow, 2); hurt(s, z.owner, o, ATK.picnic.dps, 0, 0, 0, true, true); } } }
  s.zones = s.zones.filter((z) => z.t > 0); }
export const SPRINKLERS = (s) => { const out = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (s.map[r][c] === 's') out.push({ x: c * T + 8, y: r * T + 8 }); return out; };
function hazardFrame(s) { const z = s.hz; if (!z) return; z.t--;
  if (z.kind === 'sprinkler') { if (z.st === 'idle' && z.t <= 0) { z.st = 'warn'; z.t = 40; s.ev.push('drip'); } else if (z.st === 'warn' && z.t <= 0) { z.st = 'spray'; z.t = 24; z.hit = new Set(); s.ev.push('spray'); }
    else if (z.st === 'spray') { for (const p of SPRINKLERS(s)) for (const o of s.fighters) { if (o.dead || z.hit.has(o)) continue; const d = dist(o, p); if (d < 34) { z.hit.add(o); hurt(s, null, o, 4, ((o.x - p.x) / (d || 1)) * 2.6, ((o.y - p.y) / (d || 1)) * 2.6); o.slow = 60; } }
      if (z.t <= 0) { z.st = 'idle'; z.t = 240; } } }
  else if (z.kind === 'rugbot') { if (z.t > 0 && z.st === 'idle') return; z.st = 'roam';
    const nx = z.x + z.vx, ny = z.y + z.vy; if (boxHits(s, nx, z.y, 7)) { z.vx = -z.vx; s.ev.push('bump'); } else z.x = nx; if (boxHits(s, z.x, ny, 7)) { z.vy = -z.vy; s.ev.push('bump'); } else z.y = ny;
    for (const o of s.fighters) if (!o.dead && o.rugCd <= 0 && dist(o, z) < 12) { o.rugCd = 45; const d = dist(o, z) || 1; hurt(s, null, o, 12, ((o.x - z.x) / d) * 3, ((o.y - z.y) / d) * 3); s.ev.push('boing'); } }
  else if (z.kind === 'surge') { if (z.st === 'idle' && z.t <= 0) { z.st = 'warn'; z.t = 60; z.band = 1 - z.band; z.dir = s.rnd() < 0.5 ? -1 : 1; s.ev.push('drip'); } else if (z.st === 'warn' && z.t <= 0) { z.st = 'surge'; z.t = 30; z.hit = new Set(); s.ev.push('surge'); }
    else if (z.st === 'surge') { for (const o of s.fighters) { if (o.dead || !inBand(z, o.y)) continue; o.kx = z.dir * 2.2; if (!z.hit.has(o)) { z.hit.add(o); hurt(s, null, o, 6, 0, 0); o.slow = 50; } } if (z.t <= 0) { z.st = 'idle'; z.t = 360; } } } }
export const inBand = (z, y) => (z.band ? y > 160 : y < 64);
function itemsFrame(s) { for (const it of s.items) { if (--it.t <= 0) { it.gone = true; continue; }
    for (const o of s.fighters) { if (o.dead || dist(o, it) > 10) continue;
      if (it.kind === 'treat') { if (o.hp >= o.maxHp && !isP(o)) continue; o.hp = Math.min(o.maxHp, o.hp + 35); it.gone = true; s.ev.push('treat'); if (isP(o)) { s.score += PTS.treat; s.stats.treats++; pop(s, it.x, it.y - 10, 'TREAT +35', '#ff9ad0'); } break; }
      if (it.kind === 'coin') { it.gone = true; s.ev.push('coin'); if (isP(o)) { s.score += PTS.coin; s.stats.coins++; pop(s, it.x, it.y - 10, '+500 $KIBBLE', '#f2c14e'); } break; } } }
  s.items = s.items.filter((i) => !i.gone); }
// the Big Bone: slides toward the pack with more Shibas next to it (contested = it stays put)
export function bonePull(s) { let b = 0, r = 0; for (const f of s.fighters) if (!f.dead && f.stun <= 0 && dist(f, s.bone) < BONE.r) f.team === 0 ? b++ : r++; return { b, r }; }
function boneFrame(s) { const { b, r } = bonePull(s), x0 = s.bone.x; s.bone.v = BONE.v * Math.max(-3, Math.min(3, r - b)); s.bone.x += s.bone.v; s.bone.push = r - b;
  const dx = s.bone.x - x0; if (dx < 0) for (const f of s.fighters) if (isP(f) && !f.dead && dist(f, s.bone) < BONE.r) { s.acc.bone += -dx * PTS.bonePx; s.stats.bonePx += -dx; } }
// ---------- rounds / matches ----------
function endRound(s, winner, early) { if (s.phase !== 'fight') return; s.phase = 'roundEnd'; s.phaseT = 150; s.roundsThisMatch++; s.lastRound = { winner, early };
  if (winner === 0) { s.wins[0]++; s.stats.roundsWon++; const pts = PTS.round * s.match + (early ? Math.floor(s.timer / 60) * PTS.timeBonus : 0); s.score += pts; s.lastRound.pts = pts; s.ev.push('roundwin'); }
  else if (winner === 1) { s.wins[1]++; s.stats.roundsLost++; s.lives--; s.ev.push('roundlose'); } else s.ev.push('blip');
  if (s.lives > 0 && (s.wins[0] >= 2 || s.wins[1] >= 2 || s.roundsThisMatch >= 5)) { s.phase = 'matchEnd'; s.phaseT = 210; const won = s.wins[0] > s.wins[1]; s.lastMatch = { won, flawless: won && s.wins[1] === 0 };
    if (won) { const pts = PTS.match * s.match + (s.lastMatch.flawless ? PTS.flawless : 0); s.score += pts; s.lastMatch.pts = pts; s.stats.matches++; if (s.lastMatch.flawless) s.stats.flawless++; s.lives = Math.min(MAX_LIVES, s.lives + 1); s.ev.push('matchwin'); } } }
function afterRound(s) { if (s.lives <= 0) { s.over = true; s.phase = 'over'; return; }
  if (s.phase === 'matchEnd') { if (s.lastMatch.won) s.match++; s.round = 1; startMatch(s); return; } s.round++; startRound(s); }
// ---------- bots (also the attract-mode / human-sim brain for the player) ----------
function steer(s, f, gx, gy) { let dx = gx - f.x, dy = gy - f.y; const d = Math.hypot(dx, dy); if (d < 3) return { x: 0, y: 0 }; dx /= d; dy /= d;
  for (const a of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, 2.6, -2.6]) { const c = Math.cos(a), sn = Math.sin(a), x = dx * c - dy * sn, y = dx * sn + dy * c; if (!boxHits(s, f.x + x * 7, f.y + y * 7) && !boxHits(s, f.x + x * 3, f.y + y * 3)) return { x, y }; }
  return { x: dx, y: dy }; }
const threat = (s, f) => s.shots.find((q) => q.team !== f.team && q.kind !== 'lob' && dist(q, f) < 44 && ((f.x - q.x) * q.vx + (f.y - q.y) * q.vy) > 0 && Math.abs((f.x - q.x) * q.vy - (f.y - q.y) * q.vx) / (Math.hypot(q.vx, q.vy) || 1) < 10);
function brain(s, f, sk, force = false) { const ai = f.ai; if (f.dead) return; if (!force && (s.frame + f.i * 3 + f.team * 7) % sk.react !== 0) return;
  const R = ROLES[f.role], foes = s.fighters.filter((o) => o.team !== f.team && !o.dead && seen(s, o, f)); let tgt = null, td = 1e9; for (const o of foes) { const d = dist(f, o) - (o.hp / o.maxHp) * 20; if (d < td) { td = d; tgt = o; } }
  const tdist = tgt ? dist(f, tgt) : 1e9, side = f.team === 0 ? 1 : -1; let gx = s.bone.x + side * 10, gy = s.bone.y + [-14, 14, 0][f.i % 3];
  const low = f.hp < f.maxHp * 0.3, treat = s.items.filter((i) => i.kind === 'treat' && dist(i, f) < 140).sort((a, b) => dist(a, f) - dist(b, f))[0], coin = s.items.find((i) => i.kind === 'coin' && dist(i, f) < 90);
  if (low && treat) { gx = treat.x; gy = treat.y; } else if (low && f.role !== 'bruno' && tdist < 70) { const sp = spawnPt(f.team, f.i); gx = sp.x; gy = sp.y; } else if (coin && !tgt) { gx = coin.x; gy = coin.y; }
  else if (tgt && tdist < R.range + 40 && s.rnd() < sk.aggro + 0.3) { const pref = f.role === 'kiko' || f.role === 'dango' ? R.range * 0.7 : 6, d = tdist || 1;
    const px = tgt.x + ((f.x - tgt.x) / d) * pref, py = tgt.y + ((f.y - tgt.y) / d) * pref, w = Math.hypot(s.bone.x - tgt.x, s.bone.y - tgt.y) < 70 ? 0.85 : 0.5; gx = px * w + gx * (1 - w); gy = py * w + gy * (1 - w); }
  else if (s.hz?.kind === 'surge' && s.hz.st === 'warn' && inBand(s.hz, gy)) gy = 112;
  if (s.hz?.kind === 'surge' && s.hz.st !== 'idle' && inBand(s.hz, f.y)) gy = 112;
  const m = steer(s, f, gx, gy); ai.mx = m.x; ai.my = m.y; ai.a = false; ai.tgt = tgt;
  if (tgt) { const lead = f.role === 'kiko' ? tdist / ATK.yap.speed : 0, ex = tgt.x + (tgt.ai?.mx || 0) * lead * 0.6 - f.x, ey = tgt.y + (tgt.ai?.my || 0) * lead * 0.6 - f.y, an = Math.atan2(ey, ex) + (s.rnd() - 0.5) * 2 * sk.aim;
    ai.ax = Math.cos(an); ai.ay = Math.sin(an); const clear = f.role === 'dango' || los(s, f, tgt); if (clear && tdist < R.range + 4) ai.a = true;
    if (f.sup >= SUPER.full && clear) { const near = foes.filter((o) => dist(o, f) < 40).length; if ((f.role === 'bruno' && tdist < 44) || (f.role === 'kiko' && tdist < 150) || (f.role === 'zip' && tdist < 40) || (f.role === 'dango' && (near >= 1 || f.hp < f.maxHp * 0.5))) ai.b = true; } }
  else { ai.ax = f.fx; ai.ay = f.fy; const k = s.crates.find((c) => c.hp > 0 && Math.hypot(c.c * T + 8 - f.x, c.r * T + 8 - f.y) < 24); if (k) { ai.ax = k.c * T + 8 - f.x; ai.ay = k.r * T + 8 - f.y; ai.a = f.role !== 'dango'; } }
  const q = threat(s, f); if (q && f.rollCd <= 0 && s.rnd() < sk.roll) { ai.c = true; ai.mx = -q.vy; ai.my = q.vx; const l = Math.hypot(ai.mx, ai.my) || 1; ai.mx /= l; ai.my /= l; } }
// G.bot: drives the player's fighter as keys (attract mode, ghost-free demo, human-sim). Plays at a mid skill tier.
export function bot(s) { const o = {};
  if (s.phase === 'pick') { const want = ROLE_IDS.indexOf(['kiko', 'bruno', 'zip', 'dango'][s.seed % 4]); if (s.pick !== want) { if (s.frame % 4 === 0) o.right = true; } else if (s.phaseT > 24 && s.frame % 4 < 2) o.a = true; return o; }
  const f = P(s); if (!f || f.dead || s.phase !== 'fight') return o; const sk = { ...skill(4), react: 1 }; brain(s, f, sk, true); const ai = f.ai;
  if (ai.mx > 0.38) o.right = true; if (ai.mx < -0.38) o.left = true; if (ai.my > 0.38) o.down = true; if (ai.my < -0.38) o.up = true;
  if (ai.a && ai.tgt) { // aim by facing: point the stick at the target for the auto-aim cone when standing still
    if (!(o.left || o.right || o.up || o.down)) { if (ai.ax > 0.38) o.right = true; if (ai.ax < -0.38) o.left = true; if (ai.ay > 0.38) o.down = true; if (ai.ay < -0.38) o.up = true; } o.a = true; }
  if (ai.b) o.b = true; if (ai.c) o.c = true; ai.b = false; ai.c = false; return o; }
// ---------- misc API ----------
export const ghostPos = (g, s) => { const f = P(g); return f && !f.dead && g.phase === 'fight' && (!s || g.match === s.match) ? { x: Math.round(f.x), y: Math.round(f.y) + AY - 6 } : { x: -99, y: -99 }; };
export const applySkin = (s, skins = []) => { s.skin = skins.includes('gold') ? 'gold' : skins.includes('neon') ? 'neon' : null; return s; }; // cosmetic only: recolours your bandana
export { draw } from './shiba-art.js';
