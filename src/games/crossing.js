// PUP CROSSING — original Inu lane-hopper (224x256 native). Classic mode = classic-difficulty rules on Inu's own layout:
// a 5-lane street (rolling bins, scooters, mowers, vans, buses), a sprinkler lawn, a 5-lane pond crossed on drifting
// frisbees (some flip over), pool noodles and rafts, 4 dog-park gates (one may swing shut, one may hold a biscuit),
// a squeaky toy to grab, 50 s per pup, faster lanes each level, extra life at 15,000.
import { rng } from '../core/rng.js';
export const META = { id: 'pup-crossing', title: 'PUP CROSSING', color: '#5fd37a', blurb: 'Dodge bins and buses, beat the sprinklers, ride frisbees across the pond and reach the 4 dog-park gates. 50 seconds a pup.', controls: 'Arrows / WASD / D-pad to hop', inuMove: 'ZOOMIES LEAP (A): jump 2 rows, 5s cooldown. Lost puppies ride the pond more often: grab one for +300.', classicNote: 'Original Inu rules at classic difficulty.' };
export const W = 224, H = 256, T = 16, HOME_ROW = 2, START_ROW = 14, MEDIAN = 8, TIME = 50;
export const GATES = [32, 84, 140, 192], BAYS = GATES;
export const PTS = { step: 10, home: 60, perSecond: 10, allHomes: 800, fly: 250, lady: 150, extraLifeAt: 15000 };
export const isRiver = (r) => r >= 3 && r <= 7, isRoad = (r) => r >= 9 && r <= 13;
// [row, kind, speed px/frame at level 1 (+ = right), length px, count, spacing px]
export const LANES = [
  [13, 'bin', -0.6, 12, 4, 56], [12, 'scooter', 0.9, 16, 3, 80], [11, 'mower', -0.45, 20, 3, 74], [10, 'van', 1.2, 24, 2, 112], [9, 'bus', -0.7, 40, 2, 120],
  [7, 'frisbee2', 0.6, 32, 4, 56], [6, 'noodle', -0.55, 56, 3, 84], [5, 'frisbee3', 0.9, 48, 3, 80], [4, 'noodle', -1.1, 88, 2, 150], [3, 'raft', 0.7, 40, 3, 90]];
export const speedMul = (level) => Math.min(1.7, 1 + 0.1 * (level - 1));
export const FLIP = { steady: 150, wobble: 40, flipped: 50, back: 30 }; // frames: frisbees wobble, flip over (unsafe), then right themselves
const CYCLE = FLIP.steady + FLIP.wobble + FLIP.flipped + FLIP.back;
export const flipState = (f) => { const p = ((f % CYCLE) + CYCLE) % CYCLE; return p < FLIP.steady ? 'up' : p < FLIP.steady + FLIP.wobble ? 'wobble' : p < FLIP.steady + FLIP.wobble + FLIP.flipped ? 'under' : 'back'; };
export const diveState = flipState;
export const SPRINKLER = { period: 210, on: 80, reach: 20 }; // spray for 80 of every 210 frames, deadly within 20px
export const sprinklerXs = (level) => (level <= 1 ? [112] : level === 2 ? [60, 164] : [40, 112, 184]);
export const sprinklerOn = (f, i) => (f + i * 70) % SPRINKLER.period < SPRINKLER.on;
export const LEAP = { cd: 5 }, RESCUE_PTS = 300;
const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y, c, n }), pop = (s, x, y, text, c = '#7ef0ff') => s.pops.push({ x, y, text, c, t: 1 });
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, over: false, t: 0, ev: [], fx: [], pops: [], shake: 0, flash: 0, acc: 0, frame: 0, extra: false,
    homes: [0, 0, 0, 0], bay: [null, null, null, null], leapCd: 0, rescued: 0, stats: { rescued: 0, leaps: 0, homes: 0, toys: 0 } };
  buildLevel(s); spawn(s); return s;
}
export function buildLevel(s) {
  const m = speedMul(s.level);
  s.lanes = LANES.map(([row, kind, v, len, count, gap], li) => { const objs = []; let n = count; if (kind === 'van' && s.level >= 3) n = 3; if (kind === 'bin' && s.level >= 2) n = 5;
    const span = Math.max(W + 64, n * gap); for (let i = 0; i < n; i++) objs.push({ x: (i * span) / n + li * 11, len, kind, ph: i * 83, flip: kind.startsWith('frisbee') && (i === 1 || (s.level >= 2 && i === 3)) ? 1 : 0 });
    return { row, kind, v: v * m, objs, span }; });
  s.sprinklers = sprinklerXs(s.level);
  s.bay = [null, null, null, null]; s.bayT = 200; s.lady = null; s.ladyT = s.inu ? 300 : 700;
}
function spawn(s) { s.pup = { x: 112, row: START_ROW, face: 'up', hop: 0, carrying: false }; s.best = START_ROW; s.timerF = TIME * 60; s.dead = 0; }
export const wrapX = (l, o) => ((((o.x % l.span) + l.span) % l.span) - (l.span - W) / 2);
export const objLeft = wrapX;
export function objUnder(s, row, x) { const l = s.lanes.find((k) => k.row === row); if (!l) return null; return l.objs.find((o) => { const a = wrapX(l, o); return x >= a && x <= a + o.len; }) || null; }
function kill(s, why) { s.lives--; s.lastDeath = why; s.ev.push(why === 'splash' || why === 'sprinkler' ? 'splash' : 'die'); s.flash = 1; s.shake = 0.35; fx(s, s.pup.x, s.pup.row * T + 8, why === 'splash' || why === 'sprinkler' ? '#9fd0ff' : '#e0802c', 18);
  s.dead = 60; s.deadAt = { x: s.pup.x, row: s.pup.row }; }
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.flash = Math.max(0, s.flash - dt); s.shake = Math.max(0, s.shake - dt); s.inp = inp;
  if (s.inu) s.leapCd = Math.max(0, s.leapCd - dt);
  s.acc += dt * 60; while (s.acc >= 1 && !s.over) { s.acc -= 1; frame(s); }
}
export const sprayHits = (s, x) => s.sprinklers.some((sx, i) => sprinklerOn(s.frame, i) && Math.abs(x - sx) < SPRINKLER.reach);
function frame(s) {
  s.frame++; s.t += 1 / 60; const inp = s.inp || {};
  for (const l of s.lanes) for (const o of l.objs) o.x += l.v;
  homesTick(s);
  if (s.dead > 0) { if (--s.dead === 0) { if (s.lives <= 0) { s.over = true; return; } spawn(s); } return; }
  const p = s.pup;
  if (p.hop > 0) p.hop--;
  else {
    let dr = 0, dx = 0; if (inp.up) { dr = -1; p.face = 'up'; } else if (inp.down) { dr = 1; p.face = 'down'; } else if (inp.left) { dx = -1; p.face = 'left'; } else if (inp.right) { dx = 1; p.face = 'right'; }
    if (s.inu && inp.a && s.leapCd <= 0 && p.row >= HOME_ROW + 2) { dr = -2; s.leapCd = LEAP.cd; s.stats.leaps++; s.ev.push('pow'); fx(s, p.x, p.row * T, '#7ef0ff', 10); }
    if (dr || dx) { p.row = Math.max(HOME_ROW, Math.min(START_ROW, p.row + dr)); p.x = Math.max(8, Math.min(W - 8, p.x + dx * T)); p.hop = 8; s.ev.push('hop');
      while (p.row < s.best) { s.best--; s.score += PTS.step; } }
  }
  if (--s.timerF <= 0) return kill(s, 'time');
  if (p.row === HOME_ROW) return reachHome(s);
  if (isRiver(p.row)) { const l = s.lanes.find((k) => k.row === p.row), o = objUnder(s, p.row, p.x);
    if (!o) return kill(s, 'splash'); if (o.flip && flipState(s.frame + o.ph) === 'under') return kill(s, 'splash');
    p.x += l.v; if (p.x < 4 || p.x > W - 4) return kill(s, 'splash');
    if (s.lady && s.lady.row === p.row) { const ll = s.lanes.find((k) => k.row === s.lady.row); const lx = wrapX(ll, ll.objs[s.lady.obj]) + s.lady.off; if (Math.abs(lx - p.x) < 10) grabToy(s); }
  }
  if (isRoad(p.row) && (objUnder(s, p.row, p.x - 5) || objUnder(s, p.row, p.x + 5))) return kill(s, 'car');
  if (p.row === MEDIAN && sprayHits(s, p.x)) return kill(s, 'sprinkler');
  if (!s.extra && s.score >= PTS.extraLifeAt) { s.extra = true; s.lives++; s.ev.push('pow'); }
}
function grabToy(s) { const p = s.pup, pts = s.inu ? RESCUE_PTS : PTS.lady; s.score += pts; s.lady = null; s.stats.toys++; if (s.inu) { s.rescued++; s.stats.rescued++; }
  s.ev.push('ticket'); pop(s, p.x, p.row * T, (s.inu ? 'PUPPY SAVED +' : 'SQUEAKY TOY +') + pts, '#f5a0c8'); }
function homesTick(s) {
  if (--s.bayT <= 0) { s.bayT = 260; const free = [0, 1, 2, 3].filter((i) => !s.homes[i]); s.bay = s.bay.map(() => null);
    if (free.length) { const i = free[Math.floor(s.rnd() * free.length)]; s.bay[i] = s.rnd() < (s.level >= 2 ? 0.5 : 0.3) ? { kind: 'shut', f: 0 } : { kind: 'fly', f: 0 }; } }
  for (const b of s.bay) if (b) b.f++;
  if (!s.lady && --s.ladyT <= 0) { s.ladyT = s.inu ? 600 : 1200; const l = s.lanes.find((k) => k.row === 6); s.lady = { row: 6, obj: Math.floor(s.rnd() * l.objs.length), off: 24 }; }
}
export const gateShut = (b) => b && b.kind === 'shut' && b.f > 30; // swings for half a second, then it's latched
export const crocDeadly = gateShut;
function reachHome(s) {
  const p = s.pup, i = GATES.findIndex((bx) => Math.abs(p.x - bx) <= 9);
  if (i < 0) return kill(s, 'fence'); if (s.homes[i]) return kill(s, 'fence'); if (gateShut(s.bay[i])) return kill(s, 'gate');
  const secs = Math.floor(s.timerF / 60); let pts = PTS.home + secs * PTS.perSecond;
  if (s.bay[i]?.kind === 'fly') { pts += PTS.fly; pop(s, GATES[i], 40, 'BISCUIT +' + PTS.fly, '#f2c14e'); }
  s.bay[i] = null; s.homes[i] = 1; s.score += pts; s.stats.homes++; s.ev.push('home'); fx(s, GATES[i], 40, '#5fd37a', 16); pop(s, GATES[i], 28, '+' + pts, '#5fd37a');
  if (s.homes.every(Boolean)) { s.score += PTS.allHomes; s.level++; s.homes = [0, 0, 0, 0]; buildLevel(s); s.ev.push('level'); pop(s, 112, 120, 'LEVEL ' + s.level + '  +' + PTS.allHomes, '#f2c14e'); }
  spawn(s);
}
export function bot(s) {
  const p = s.pup; if (s.dead || p.hop) return {};
  const ahead = (row, x, f) => { // is (row,x) safe for the next f frames?
    if (row === HOME_ROW) return GATES.some((bx, i) => !s.homes[i] && Math.abs(x - bx) <= 6 && s.bay[i]?.kind !== 'shut');
    if (row === MEDIAN) { for (let k = 0; k <= f; k += 4) if (s.sprinklers.some((sx, i) => sprinklerOn(s.frame + k, i) && Math.abs(x - sx) < SPRINKLER.reach + 4)) return false; return true; }
    const l = s.lanes.find((k) => k.row === row); if (!l) return true;
    for (let k = 0; k <= f; k += 4) { const fake = { ...s, lanes: s.lanes.map((q) => (q === l ? { ...q, objs: q.objs.map((o) => ({ ...o, x: o.x + q.v * k })) } : q)) };
      if (isRoad(row) && (objUnder(fake, row, x - 7) || objUnder(fake, row, x + 7))) return false;
      if (isRiver(row)) { const o = objUnder(fake, row, x + l.v * k); if (!o || (o.flip && flipState(s.frame + k + o.ph) !== 'up')) return false; const a = wrapX(l, o); if (x + l.v * k < a + 6 || x + l.v * k > a + o.len - 6) return false; } }
    return true; };
  if (p.row === HOME_ROW + 1) { const tgt = GATES.map((bx, i) => ({ bx, i })).filter((o) => !s.homes[o.i] && s.bay[o.i]?.kind !== 'shut').sort((a, b) => Math.abs(a.bx - p.x) - Math.abs(b.bx - p.x))[0];
    if (tgt && Math.abs(tgt.bx - p.x) <= 6) return { up: true }; if (tgt) { const nx = p.x + Math.sign(tgt.bx - p.x) * 16; if (Math.abs(tgt.bx - p.x) < 16 && ahead(HOME_ROW, p.x, 0)) return { up: true }; if (ahead(p.row, nx, 12)) return tgt.bx > p.x ? { right: true } : { left: true }; if (ahead(p.row + 1, p.x, 12)) return { down: true }; return {}; } }
  if (ahead(p.row - 1, p.x, 24)) return { up: true };
  if (!ahead(p.row, p.x, 16)) { if (ahead(p.row + 1, p.x, 16)) return { down: true }; if (ahead(p.row, p.x - 16, 16)) return { left: true }; if (ahead(p.row, p.x + 16, 16)) return { right: true }; }
  if (isRoad(p.row) || p.row === MEDIAN || p.row === START_ROW) { if (p.x < 100 && ahead(p.row, p.x + 16, 16)) return { right: true }; if (p.x > 124 && ahead(p.row, p.x - 16, 16)) return { left: true }; }
  return {};
}
export const ghostPos = (s) => ({ x: s.pup.x, y: s.pup.row * T + 8 });
// ---------- render ----------
const VEH_COL = { bin: '#4a8a5a', scooter: '#f58ac8', mower: '#e04a3a', van: '#f2f2f2', bus: '#f2c14e' };
const PUP = { up: ['..1.....1..', '.11.....11.', '.111111111.', '11111111111', '11122222111', '.111111111.', '.111111111.', '1.111.111.1', '...1...1...'],
  side: ['.1.1.......', '.1111......', '1311111..11', '22411111111', '22111111111', '.2221111.1.', '.1..1..1...'] };
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#05040d'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d3a5e'; ctx.fillRect(0, 3 * T, W, 5 * T); ctx.fillStyle = '#1a5a86'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 37 + Math.floor(now * 10)) % W, 3 * T + ((i * 29) % 80), 3, 1); /* pond */
  ctx.fillStyle = '#2a6a2a'; ctx.fillRect(0, 2 * T - 4, W, T + 4); ctx.fillStyle = '#c8c8d8'; for (let x = 0; x < W; x += 6) ctx.fillRect(x, 2 * T, 1, T); ctx.fillRect(0, 2 * T + 2, W, 1); ctx.fillRect(0, 2 * T + 10, W, 1); /* park fence */
  for (const gx of GATES) { ctx.fillStyle = '#1e4a1e'; ctx.fillRect(gx - 10, 2 * T, 20, T); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(gx - 11, 2 * T - 3, 2, T + 3); ctx.fillRect(gx + 9, 2 * T - 3, 2, T + 3); }
  ctx.fillStyle = '#3a7a34'; ctx.fillRect(0, MEDIAN * T, W, T); ctx.fillStyle = '#2b1f4a'; ctx.fillRect(0, START_ROW * T, W, T); ctx.fillStyle = '#4a8a3e'; for (let x = 0; x < W; x += 6) ctx.fillRect(x, MEDIAN * T + ((x * 7) % 12) + 2, 1, 2);
  s.sprinklers.forEach((sx, i) => { ctx.fillStyle = '#9a9aa8'; ctx.fillRect(sx - 2, MEDIAN * T + 10, 4, 4); if (sprinklerOn(s.frame, i)) { ctx.fillStyle = 'rgba(159,208,255,0.75)'; for (let k = 0; k < 14; k++) { const a = (k / 13) * Math.PI, r = SPRINKLER.reach * (0.6 + 0.4 * ((s.frame + k * 3) % 8) / 8); ctx.fillRect(sx + Math.cos(a) * r, MEDIAN * T + 11 - Math.sin(a) * r * 0.45, 2, 1); } } });
  ctx.fillStyle = '#1a1a22'; ctx.fillRect(0, 9 * T, W, 5 * T); ctx.fillStyle = '#4a4a5a'; for (let r = 9; r < 13; r++) for (let x = 0; x < W; x += 16) ctx.fillRect(x, (r + 1) * T - 1, 8, 1);
  s.homes.forEach((h, i) => { const gx = GATES[i]; if (h) P.blit(ctx, P.sprite('pupH', PUP.up, { 1: '#e8892e', 2: '#14101c' }, { outline: false }), gx - 5, 2 * T + 3); const b = s.bay[i]; if (!b) return;
    if (b.kind === 'fly') { const by = 2 * T + 5 + (s.frame % 16 < 8 ? 0 : 1); ctx.fillStyle = '#e0a050'; ctx.fillRect(gx - 3, by, 6, 5); ctx.fillStyle = '#8a5020'; ctx.fillRect(gx - 2, by + 1, 1, 1); ctx.fillRect(gx + 1, by + 3, 1, 1); }
    else { const k = Math.min(1, b.f / 30); ctx.fillStyle = '#b07a40'; ctx.fillRect(gx - 9, 2 * T + 2, Math.round(18 * k), 12); ctx.fillStyle = '#6a4220'; for (let y = 0; y < 12; y += 4) ctx.fillRect(gx - 9, 2 * T + 3 + y, Math.round(18 * k), 1); } });
  for (const l of s.lanes) for (const o of l.objs) { const x = Math.round(wrapX(l, o)), y = l.row * T;
    if (o.kind.startsWith('frisbee')) { const st = o.flip ? flipState(s.frame + o.ph) : 'up'; if (st === 'under') { ctx.fillStyle = '#2a6a96'; for (let k = 0; k < o.len; k += 16) ctx.fillRect(x + k + 3, y + 8, 10, 1); continue; }
      for (let k = 0; k < o.len; k += 16) { const wob = st === 'wobble' ? (Math.floor(s.frame / 4) % 2) : 0; ctx.fillStyle = st === 'up' ? '#ff6a3a' : '#c8603a'; ctx.fillRect(x + k + 1, y + 4 + wob, 14, 8 - wob * 2); ctx.fillStyle = '#ffd0a0'; ctx.fillRect(x + k + 4, y + 6 + wob, 8, 1); ctx.fillRect(x + k + 4, y + 9 - wob, 8, 1); } }
    else if (o.kind === 'noodle') { ctx.fillStyle = '#c86ae0'; ctx.fillRect(x, y + 5, o.len, 7); ctx.fillStyle = '#e8a8f8'; ctx.fillRect(x, y + 6, o.len, 2); ctx.fillStyle = '#7a3a9a'; ctx.fillRect(x, y + 5, 2, 7); ctx.fillRect(x + o.len - 2, y + 5, 2, 7); }
    else if (o.kind === 'raft') { ctx.fillStyle = '#c8a060'; ctx.fillRect(x, y + 3, o.len, 10); ctx.fillStyle = '#8a6030'; for (let k = 4; k < o.len; k += 8) ctx.fillRect(x + k, y + 3, 1, 10); }
    else { const c = VEH_COL[o.kind], fw = l.v > 0; ctx.fillStyle = c;
      if (o.kind === 'bin') { ctx.fillRect(x + 1, y + 4, 10, 9); ctx.fillStyle = '#2a5a3a'; ctx.fillRect(x, y + 3, 12, 2); ctx.fillStyle = '#14101c'; const r = Math.floor(s.frame / 6) % 2; ctx.fillRect(x + 2 + r * 6, y + 13, 2, 2); } /* rolling wheelie bin */
      else { ctx.fillRect(x + 1, y + 4, o.len - 2, 8); ctx.fillStyle = '#9fd0ff'; ctx.fillRect(fw ? x + o.len - 6 : x + 2, y + 5, 4, 3); ctx.fillStyle = '#14101c'; ctx.fillRect(x + 3, y + 12, 3, 2); ctx.fillRect(x + o.len - 6, y + 12, 3, 2);
        if (o.kind === 'mower') { ctx.fillStyle = '#c8c8c8'; ctx.fillRect(fw ? x : x + o.len - 3, y + 2, 2, 6); } if (o.kind === 'bus') { ctx.fillStyle = '#9fd0ff'; for (let k = 6; k < o.len - 8; k += 6) ctx.fillRect(x + k, y + 5, 4, 3); } } } }
  if (s.lady) { const ll = s.lanes.find((k) => k.row === s.lady.row); const lx = wrapX(ll, ll.objs[s.lady.obj]) + s.lady.off;
    if (s.inu) P.blit(ctx, P.sprite('lady', PUP.up, { 1: '#f5a0c8', 2: '#14101c' }, { outline: false }), lx - 5, s.lady.row * T + 3); else { ctx.fillStyle = '#f2d84e'; ctx.fillRect(lx - 3, s.lady.row * T + 5, 7, 6); ctx.fillStyle = '#f5a0c8'; ctx.fillRect(lx - 1, s.lady.row * T + 4, 3, 2); } }
  const p = s.pup;
  if (s.dead) { ctx.fillStyle = s.lastDeath === 'splash' ? '#9fd0ff' : '#ff6a4a'; for (let k = 0; k < 8; k++) ctx.fillRect(s.deadAt.x - 6 + ((k * 5) % 12), s.deadAt.row * T + 3 + ((k * 7) % 10), 2, 2); }
  else { const side = p.face === 'left' || p.face === 'right'; const spr = P.sprite('pup' + p.face, side ? PUP.side : PUP.up, { 1: '#e8892e', 2: '#f6ead6', 3: '#14101c', 4: '#14101c' }, { outline: false, flip: p.face === 'left' });
    ctx.save(); if (p.face === 'down') { ctx.translate(p.x, p.row * T + 8); ctx.scale(1, -1); ctx.translate(-p.x, -(p.row * T + 8)); } P.blit(ctx, spr, p.x - 5, p.row * T + 3 - (p.hop > 4 ? 2 : 0)); ctx.restore();
 }
  const tw = Math.max(0, s.timerF / (TIME * 60)) * 100; ctx.fillStyle = '#222'; ctx.fillRect(116, H - 10, 100, 4); ctx.fillStyle = s.timerF < 600 ? '#e0303a' : '#5fd37a'; ctx.fillRect(216 - tw, H - 10, tw, 4);
  ctx.font = '7px Silkscreen, monospace'; ctx.fillStyle = '#c8c8c8'; ctx.fillText('TIME', 92, H - 5);
  if (s.inu) { ctx.fillStyle = s.leapCd <= 0 ? '#7ef0ff' : '#3a6a80'; ctx.fillRect(60, H - 10, 26 * (1 - s.leapCd / LEAP.cd), 4); }
}
