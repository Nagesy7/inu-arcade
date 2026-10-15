// PUP CROSSING — arcade-accurate lane-hopper rules (224x256 native), original Inu art and names.
// 5 road lanes + 5 river lanes with fixed patterns, diving turtles(ducks), crocodiles (logs + in kennels), snakes,
// bonus biscuit, lady pup, 60 s timer, 5 kennels per level, per-level speed ramp, extra life at 20,000.
import { rng } from '../core/rng.js';
export const META = { id: 'pup-crossing', title: 'PUP CROSSING', color: '#5fd37a', blurb: 'Five lanes of traffic, five lanes of river, five kennels. 60 seconds a pup. Ducks dive, crocs lurk, snakes slither.', controls: 'Arrows / WASD / D-pad to hop', inuMove: 'ZOOMIES LEAP (A): jump 2 rows, 5s cooldown. Lost puppies ride the logs more often: carry one home for +300.', classicNote: 'Arcade-accurate tables.' };
export const W = 224, H = 256, T = 16, HOME_ROW = 2, START_ROW = 14, MEDIAN = 8, TIME = 60;
export const BAYS = [24, 68, 112, 156, 200];
export const PTS = { step: 10, home: 50, perSecond: 10, allHomes: 1000, fly: 200, lady: 200, extraLifeAt: 20000 };
export const isRiver = (r) => r >= 3 && r <= 7, isRoad = (r) => r >= 9 && r <= 13;
// [row, kind, speed px/frame at level 1 (+ = right), length px, count, spacing px]
export const LANES = [
  [13, 'car', -0.5, 16, 3, 72], [12, 'dozer', 0.5, 16, 3, 72], [11, 'car2', -0.75, 16, 3, 72], [10, 'racer', 1.5, 16, 1, 224], [9, 'truck', -0.6, 32, 2, 112],
  [7, 'duck3', -0.75, 48, 4, 64], [6, 'log', 0.5, 48, 3, 80], [5, 'log', 1.25, 96, 2, 160], [4, 'duck2', -0.75, 32, 4, 64], [3, 'log', 0.75, 64, 3, 96]];
export const speedMul = (level) => Math.min(1.8, 1 + 0.12 * (level - 1));
export const DIVE = { surface: 180, sink: 30, under: 60, rise: 30 }; // frames
const CYCLE = DIVE.surface + DIVE.sink + DIVE.under + DIVE.rise;
export const diveState = (f) => { const p = f % CYCLE; return p < DIVE.surface ? 'up' : p < DIVE.surface + DIVE.sink ? 'sinking' : p < DIVE.surface + DIVE.sink + DIVE.under ? 'under' : 'rising'; };
export const LEAP = { cd: 5 }, RESCUE_PTS = 300;
const fx = (s, x, y, c, n = 8) => s.fx.push({ x, y, c, n }), pop = (s, x, y, text, c = '#7ef0ff') => s.pops.push({ x, y, text, c, t: 1 });
export function create(seed = 1, opts = {}) {
  const s = { id: META.id, inu: !!opts.inu, seed, rnd: rng(seed), score: 0, lives: 3, level: 1, over: false, t: 0, ev: [], fx: [], pops: [], shake: 0, flash: 0, acc: 0, frame: 0, extra: false,
    homes: [0, 0, 0, 0, 0], bay: [null, null, null, null, null], leapCd: 0, rescued: 0, stats: { rescued: 0, leaps: 0, homes: 0 } };
  buildLevel(s); spawn(s); return s;
}
export function buildLevel(s) {
  const m = speedMul(s.level);
  s.lanes = LANES.map(([row, kind, v, len, count, gap], li) => { const objs = []; let n = count; if (kind === 'racer' && s.level >= 3) n = 2; if (kind === 'car' && s.level >= 2) n = 4;
    const span = Math.max(W + 64, n * gap); for (let i = 0; i < n; i++) objs.push({ x: (i * span) / n + li * 13, len, kind, ph: i * 97, dive: (kind.startsWith('duck') && (i === 0 || (s.level >= 2 && i === 2))) ? 1 : 0 });
    if (row === 3 && s.level >= 2) { objs[1].kind = 'croc'; objs[1].len = 64; }
    return { row, kind, v: v * m, objs, span }; });
  s.snake = s.level >= 2 ? { x: 0, vx: 0.5 * m, row: MEDIAN } : null; s.logSnake = s.level >= 3 ? { lane: 5, off: 0, dir: 1 } : null;
  s.bay = [null, null, null, null, null]; s.bayT = 240; s.lady = null; s.ladyT = s.inu ? 300 : 900;
}
function spawn(s) { s.pup = { x: 112, row: START_ROW, face: 'up', hop: 0, carrying: false }; s.best = START_ROW; s.timerF = TIME * 60; s.dead = 0; }
export const wrapX = (l, o) => ((((o.x % l.span) + l.span) % l.span) - (l.span - W) / 2);
export const objLeft = wrapX;
export function objUnder(s, row, x) { const l = s.lanes.find((k) => k.row === row); if (!l) return null; return l.objs.find((o) => { const a = wrapX(l, o); return x >= a && x <= a + o.len; }) || null; }
function kill(s, why) { s.lives--; s.lastDeath = why; s.ev.push(why === 'splash' ? 'splash' : 'die'); s.flash = 1; s.shake = 0.35; fx(s, s.pup.x, s.pup.row * T + 8, why === 'splash' ? '#9fd0ff' : '#e0802c', 18);
  if (s.pup.carrying) { s.pup.carrying = false; } s.dead = 60; s.deadAt = { x: s.pup.x, row: s.pup.row }; }
export function step(s, dt, inp) {
  s.ev.length = 0; if (s.over) return; s.flash = Math.max(0, s.flash - dt); s.shake = Math.max(0, s.shake - dt); s.inp = inp;
  if (s.inu) s.leapCd = Math.max(0, s.leapCd - dt);
  s.acc += dt * 60; while (s.acc >= 1 && !s.over) { s.acc -= 1; frame(s); }
}
function frame(s) {
  s.frame++; s.t += 1 / 60; const inp = s.inp || {};
  for (const l of s.lanes) for (const o of l.objs) o.x += l.v;
  if (s.snake) { s.snake.x += s.snake.vx; if (s.snake.x < 0 || s.snake.x > W - 24) s.snake.vx *= -1; }
  if (s.logSnake) { s.logSnake.off += s.logSnake.dir * 0.4; if (s.logSnake.off < 0 || s.logSnake.off > 72) s.logSnake.dir *= -1; }
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
    if (!o) return kill(s, 'splash'); if (o.dive && diveState(s.frame + o.ph) === 'under') return kill(s, 'splash');
    if (o.kind === 'croc') { const a = wrapX(l, o), head = l.v > 0 ? p.x > a + o.len - 16 : p.x < a + 16; if (head) return kill(s, 'croc'); }
    p.x += l.v; if (p.x < 4 || p.x > W - 4) return kill(s, 'splash');
    if (s.logSnake && p.row === s.logSnake.lane) { const sl = s.lanes.find((k) => k.row === s.logSnake.lane); const sx = wrapX(sl, sl.objs[0]) + s.logSnake.off; if (Math.abs(p.x - sx - 12) < 10) return kill(s, 'snake'); }
    // lady pup / lost puppy riding a log
    if (s.lady && !p.carrying && s.lady.row === p.row) { const ll = s.lanes.find((k) => k.row === s.lady.row); const lx = wrapX(ll, ll.objs[s.lady.obj]) + s.lady.off; if (Math.abs(lx - p.x) < 10) { p.carrying = true; s.lady = null; s.ev.push('ticket'); pop(s, p.x, p.row * T, s.inu ? 'GOT PUP!' : 'LADY PUP!', '#f5a0c8'); } }
  }
  if (isRoad(p.row) && objUnder(s, p.row, p.x - 5) || isRoad(p.row) && objUnder(s, p.row, p.x + 5)) return kill(s, 'car');
  if (s.snake && p.row === MEDIAN && Math.abs(p.x - s.snake.x - 12) < 12) return kill(s, 'snake');
  if (!s.extra && s.score >= PTS.extraLifeAt) { s.extra = true; s.lives++; s.ev.push('pow'); }
}
function homesTick(s) {
  if (--s.bayT <= 0) { s.bayT = 300; const free = [0, 1, 2, 3, 4].filter((i) => !s.homes[i]); s.bay = s.bay.map(() => null);
    if (free.length) { const i = free[Math.floor(s.rnd() * free.length)]; s.bay[i] = s.level >= 2 && s.rnd() < 0.5 ? { kind: 'croc', f: 0 } : { kind: 'fly', f: 0 }; } }
  for (const b of s.bay) if (b) b.f++;
  if (!s.lady && --s.ladyT <= 0) { s.ladyT = s.inu ? 600 : 1500; const l = s.lanes.find((k) => k.row === 6); s.lady = { row: 6, obj: Math.floor(s.rnd() * l.objs.length), off: 16 }; }
}
export const crocDeadly = (b) => b && b.kind === 'croc' && b.f > 60; // peeks for 1s, then the jaws are out
function reachHome(s) {
  const p = s.pup, i = BAYS.findIndex((bx) => Math.abs(p.x - bx) <= 8);
  if (i < 0) return kill(s, 'hedge'); if (s.homes[i]) return kill(s, 'hedge'); if (crocDeadly(s.bay[i])) return kill(s, 'croc');
  const secs = Math.floor(s.timerF / 60); let pts = PTS.home + secs * PTS.perSecond;
  if (s.bay[i]?.kind === 'fly') { pts += PTS.fly; pop(s, BAYS[i], 40, 'BISCUIT +200', '#f2c14e'); }
  if (p.carrying) { if (s.inu) { pts += RESCUE_PTS; s.rescued++; s.stats.rescued++; } else pts += PTS.lady; pop(s, BAYS[i], 56, s.inu ? 'PUPPY SAVED +300' : 'LADY PUP +200', '#f5a0c8'); }
  s.bay[i] = null; s.homes[i] = 1; s.score += pts; s.stats.homes++; s.ev.push('home'); fx(s, BAYS[i], 40, '#5fd37a', 16); pop(s, BAYS[i], 28, '+' + pts, '#5fd37a');
  if (s.homes.every(Boolean)) { s.score += PTS.allHomes; s.level++; s.homes = [0, 0, 0, 0, 0]; buildLevel(s); s.ev.push('level'); pop(s, 112, 120, 'LEVEL ' + s.level + '  +1000', '#f2c14e'); }
  spawn(s);
}
export function bot(s) {
  const p = s.pup; if (s.dead || p.hop) return {};
  const ahead = (row, x, f) => { // is (row,x) safe for the next f frames?
    if (row === HOME_ROW) return BAYS.some((bx, i) => !s.homes[i] && Math.abs(x - bx) <= 5 && !(s.bay[i]?.kind === 'croc'));
    const l = s.lanes.find((k) => k.row === row); if (!l) return !(s.snake && row === MEDIAN && Math.abs(x - s.snake.x - 12) < 20);
    for (let k = 0; k <= f; k += 4) { const fake = { ...s, lanes: s.lanes.map((q) => (q === l ? { ...q, objs: q.objs.map((o) => ({ ...o, x: o.x + q.v * k })) } : q)) };
      if (isRoad(row) && (objUnder(fake, row, x - 7) || objUnder(fake, row, x + 7))) return false;
      if (isRiver(row)) { const o = objUnder(fake, row, x + l.v * k); if (!o || o.kind === 'croc' || (o.dive && diveState(s.frame + k + o.ph) !== 'up')) return false; const a = wrapX(l, o); if (x + l.v * k < a + 6 || x + l.v * k > a + o.len - 6) return false; } }
    return true; };
  if (p.row === HOME_ROW + 1) { const tgt = BAYS.map((bx, i) => ({ bx, i })).filter((o) => !s.homes[o.i] && s.bay[o.i]?.kind !== 'croc').sort((a, b) => Math.abs(a.bx - p.x) - Math.abs(b.bx - p.x))[0];
    if (tgt && Math.abs(tgt.bx - p.x) <= 5) return { up: true }; if (tgt) { const nx = p.x + Math.sign(tgt.bx - p.x) * 16; if (Math.abs(tgt.bx - p.x) < 16 && ahead(HOME_ROW, p.x, 0)) return { up: true }; if (ahead(p.row, nx, 12)) return tgt.bx > p.x ? { right: true } : { left: true }; if (ahead(p.row + 1, p.x, 12)) return { down: true }; return {}; } }
  if (ahead(p.row - 1, p.x, 24)) return { up: true };
  if (!ahead(p.row, p.x, 16)) { if (ahead(p.row + 1, p.x, 16)) return { down: true }; if (ahead(p.row, p.x - 16, 16)) return { left: true }; if (ahead(p.row, p.x + 16, 16)) return { right: true }; }
  if (isRoad(p.row) || p.row === MEDIAN || p.row === START_ROW) { if (p.x < 100 && ahead(p.row, p.x + 16, 16)) return { right: true }; if (p.x > 124 && ahead(p.row, p.x - 16, 16)) return { left: true }; }
  return {};
}
export const ghostPos = (s) => ({ x: s.pup.x, y: s.pup.row * T + 8 });
// ---------- render ----------
const CARS = { car: ['..1111111.....', '.111222111111.', '11122221111111', '11111111111111', '.33........33.'], car2: ['....111111....', '..1112221111..', '11111111111111', '11111111111111', '.33........33.'],
  dozer: ['44...1111111..', '44.1111221111.', '4441111111111.', '44111111111111', '..333....333..'], racer: ['.....1111.....', '1111111221111.', '11111111111111', '.1111111111111', '.33.......33..'],
  truck: ['2222.11111111111111111111111111.', '2222.11111111111111111111111111.', '2222111111111111111111111111111.', '22221111111111111111111111111111', '.33.....33.....................33'] };
const CAR_COL = { car: '#f2c14e', car2: '#f58ac8', dozer: '#5fd37a', racer: '#ffffff', truck: '#d8d8d8' };
const PUP = { up: ['..1.....1..', '.11.....11.', '.111111111.', '11111111111', '11122222111', '.111111111.', '.111111111.', '1.111.111.1', '...1...1...'],
  side: ['.1.1.......', '.1111......', '1311111..11', '22411111111', '22111111111', '.2221111.1.', '.1..1..1...'] };
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#05040d'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0c2a5a'; ctx.fillRect(0, 3 * T, W, 5 * T); ctx.fillStyle = '#123a74'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 37 + Math.floor(now * 12)) % W, 3 * T + ((i * 29) % 80), 4, 1);
  ctx.fillStyle = '#0f3d1c'; ctx.fillRect(0, 2 * T - 4, W, T + 4); for (const bx of BAYS) { ctx.fillStyle = '#05140a'; ctx.fillRect(bx - 9, 2 * T, 18, T); }
  ctx.fillStyle = '#2b1f4a'; ctx.fillRect(0, MEDIAN * T, W, T); ctx.fillRect(0, START_ROW * T, W, T); ctx.fillStyle = '#3d2c6a'; for (let x = 0; x < W; x += 8) { ctx.fillRect(x, MEDIAN * T + 2, 4, 1); ctx.fillRect(x + 4, START_ROW * T + 13, 4, 1); }
  ctx.fillStyle = '#101018'; ctx.fillRect(0, 9 * T, W, 5 * T); ctx.fillStyle = '#4a4a5a'; for (let r = 9; r < 13; r++) for (let x = 0; x < W; x += 16) ctx.fillRect(x, (r + 1) * T - 1, 8, 1);
  s.homes.forEach((h, i) => { if (h) P.blit(ctx, P.sprite('pupH', PUP.up, { 1: '#e8892e', 2: '#14101c' }, { outline: false }), BAYS[i] - 5, 2 * T + 3); const b = s.bay[i]; if (!b) return;
    if (b.kind === 'fly') { const by = 2 * T + 5 + (s.frame % 16 < 8 ? 0 : 1); ctx.fillStyle = '#e0a050'; ctx.fillRect(BAYS[i] - 3, by, 6, 5); ctx.fillStyle = '#8a5020'; ctx.fillRect(BAYS[i] - 2, by + 1, 1, 1); ctx.fillRect(BAYS[i] + 1, by + 3, 1, 1); } /* bonus biscuit, not a fly */
    else { ctx.fillStyle = '#3a8a3a'; const op = crocDeadly(b) ? 10 : 4; ctx.fillRect(BAYS[i] - 6, 2 * T + 14 - op, 12, op); ctx.fillStyle = '#ff3040'; ctx.fillRect(BAYS[i] - 3, 2 * T + 15 - op, 1, 1); ctx.fillRect(BAYS[i] + 2, 2 * T + 15 - op, 1, 1); } });
  for (const l of s.lanes) for (const o of l.objs) { const x = Math.round(wrapX(l, o)), y = l.row * T;
    if (o.kind === 'log') { ctx.fillStyle = '#6a3e1c'; ctx.fillRect(x, y + 3, o.len, 10); ctx.fillStyle = '#8a5428'; ctx.fillRect(x, y + 4, o.len, 2); ctx.fillStyle = '#b07a40'; ctx.fillRect(x, y + 3, 3, 10); ctx.fillRect(x + o.len - 3, y + 3, 3, 10); }
    else if (o.kind === 'croc') { ctx.fillStyle = '#2f7a3a'; ctx.fillRect(x, y + 4, o.len, 8); ctx.fillStyle = '#4fa04a'; for (let k = 4; k < o.len - 16; k += 6) ctx.fillRect(x + k, y + 3, 3, 2); const hx = l.v > 0 ? x + o.len - 16 : x; ctx.fillStyle = '#3f9a4a'; ctx.fillRect(hx, y + 2, 16, 11); ctx.fillStyle = '#ff3040'; ctx.fillRect(hx + (l.v > 0 ? 10 : 4), y + 4, 2, 2); ctx.fillStyle = '#fff'; ctx.fillRect(hx + 2, y + 11, 12, 1); }
    else if (o.kind.startsWith('duck')) { const st = o.dive ? diveState(s.frame + o.ph) : 'up'; if (st === 'under') { ctx.fillStyle = '#3a72c8'; ctx.fillRect(x + 2, y + 9, o.len - 4, 1); continue; }
      const n = o.len / 16; for (let k = 0; k < n; k++) { const dx = x + k * 16; ctx.fillStyle = st === 'up' ? '#f2d84e' : '#9a8a3e'; ctx.fillRect(dx + 2, y + 6, 12, 7); ctx.fillRect(dx + (l.v < 0 ? 2 : 9), y + 2, 5, 5); ctx.fillStyle = '#f08030'; ctx.fillRect(dx + (l.v < 0 ? 0 : 14), y + 4, 2, 2); ctx.fillStyle = '#14101c'; ctx.fillRect(dx + (l.v < 0 ? 3 : 12), y + 3, 1, 1); } }
    else P.blit(ctx, P.sprite('veh' + o.kind, CARS[o.kind], { 1: CAR_COL[o.kind], 2: '#9fd0ff', 3: '#14101c', 4: '#c8c8c8' }, { outline: false, flip: l.v > 0 }), x + 1, y + 5); }
  if (s.snake) { ctx.fillStyle = '#c84aa0'; for (let k = 0; k < 6; k++) ctx.fillRect(s.snake.x + k * 4, MEDIAN * T + 7 + Math.round(Math.sin(now * 8 + k)) * 2, 4, 3); ctx.fillStyle = '#ff3040'; ctx.fillRect(s.snake.x + (s.snake.vx > 0 ? 24 : -2), MEDIAN * T + 8, 2, 1); }
  if (s.logSnake) { const sl = s.lanes.find((k) => k.row === s.logSnake.lane); const sx = wrapX(sl, sl.objs[0]) + s.logSnake.off; ctx.fillStyle = '#c84aa0'; for (let k = 0; k < 6; k++) ctx.fillRect(sx + k * 4, s.logSnake.lane * T + 5 + Math.round(Math.sin(now * 8 + k)), 4, 3); }
  if (s.lady) { const ll = s.lanes.find((k) => k.row === s.lady.row); const lx = wrapX(ll, ll.objs[s.lady.obj]) + s.lady.off; P.blit(ctx, P.sprite('lady', PUP.up, { 1: '#f5a0c8', 2: '#14101c' }, { outline: false }), lx - 5, s.lady.row * T + 3); }
  const p = s.pup;
  if (s.dead) { ctx.fillStyle = s.lastDeath === 'splash' ? '#9fd0ff' : '#ff6a4a'; for (let k = 0; k < 8; k++) ctx.fillRect(s.deadAt.x - 6 + ((k * 5) % 12), s.deadAt.row * T + 3 + ((k * 7) % 10), 2, 2); }
  else { const side = p.face === 'left' || p.face === 'right'; const spr = P.sprite('pup' + p.face, side ? PUP.side : PUP.up, { 1: '#e8892e', 2: '#f6ead6', 3: '#14101c', 4: '#14101c' }, { outline: false, flip: p.face === 'left' });
    ctx.save(); if (p.face === 'down') { ctx.translate(p.x, p.row * T + 8); ctx.scale(1, -1); ctx.translate(-p.x, -(p.row * T + 8)); } P.blit(ctx, spr, p.x - 5, p.row * T + 3 - (p.hop > 4 ? 2 : 0)); ctx.restore();
    if (p.carrying) { ctx.fillStyle = '#f5a0c8'; ctx.fillRect(p.x + 4, p.row * T + 2, 4, 4); } }
  const tw = Math.max(0, s.timerF / (TIME * 60)) * 100; ctx.fillStyle = '#222'; ctx.fillRect(116, H - 10, 100, 4); ctx.fillStyle = s.timerF < 600 ? '#e0303a' : '#5fd37a'; ctx.fillRect(216 - tw, H - 10, tw, 4);
  ctx.font = '7px Silkscreen, monospace'; ctx.fillStyle = '#c8c8c8'; ctx.fillText('TIME', 92, H - 5);
  if (s.inu) { ctx.fillStyle = s.leapCd <= 0 ? '#7ef0ff' : '#3a6a80'; ctx.fillRect(60, H - 10, 26 * (1 - s.leapCd / LEAP.cd), 4); }
}
