// RIFT RUNNER — three lanes of a kennel road. Switch lanes, hop low fences, duck high bars, and turn when the sign says.
// Biscuits are score only. Classic: stick / arrows. Inu: the turn sign accepts your swipe a little earlier.
import { blank, edge, pre, hurt, fx, pop, shiba, bone, rand, pick, label } from './kit.js';
export const NAME = 'Rift Runner';
export const META = {
  id: 'rift-runner', title: 'RIFT RUNNER', short: 'RIFT', color: '#ffb142', buttons: 1, freePlay: true,
  blurb: 'Three lanes. Switch, hop the low fences, duck the high bars, and swipe the way the corner sign points.',
  controls: 'Left/Right switch lanes. Up or A hops. Down ducks.',
  inuMove: 'EARLY TURN: the corner sign takes your swipe sooner.',
  classicNote: 'Original Inu rules at classic difficulty.',
};
export const W = 224, H = 256, FAR = 34, LW = 26, HZ = 72, BY = 198;
export function create(seed = 1, opts = {}) {
  const s = blank(META.id, seed, opts, { lives: 1 });
  s.lane = 0; s.lx = 0; s.z = 0; s.speed = 8; s.objs = []; s.nextRow = 16; s.turn = null; s.nextTurn = 64;
  s.jump = 0; s.slide = 0; s.bits = 0; s.queued = null; s.swing = 0;
  s.stats = { turns: 0, biscuits: 0 }; return s;
}
const proj = (z) => { const sc = 1 / (1 + Math.max(-0.5, z) / 7); return { y: HZ + (BY - HZ) * sc, s: sc }; };
const windowZ = (s) => (s.inu ? 16 : 10);
export function step(s, dt, inp = {}) {
  if (!pre(s, dt)) return; const e = edge(s, inp);
  const turnNear = s.turn && s.turn.z < windowZ(s);
  if ((e.left || e.right) && turnNear) s.queued = e.left ? 'left' : 'right';
  else {
    if (e.left && s.lane > -1) { s.lane--; s.ev.push('blip'); }
    if (e.right && s.lane < 1) { s.lane++; s.ev.push('blip'); }
  }
  if ((e.a || e.up) && s.jump <= 0 && s.slide <= 0) { s.jump = 0.7; s.ev.push('hop'); }
  if (e.down && s.jump <= 0) { s.slide = 0.62; s.ev.push('blip'); }
  s.speed = Math.min(18, s.speed + 0.22 * dt); const mv = s.speed * dt; s.z += mv;
  s.score = Math.floor(s.z) + s.bits * 8; s.jump -= dt; s.slide -= dt; s.swing *= Math.pow(0.05, dt);
  s.lx += (s.lane - s.lx) * Math.min(1, dt * 12);
  s.nextRow -= mv; s.nextTurn -= mv;
  if (!s.turn && s.nextTurn <= FAR) { s.turn = { z: FAR, dir: pick(s, ['left', 'right']) }; s.queued = null; }
  if (s.nextRow <= 0 && !s.turn) {
    const t = pick(s, ['low', 'high', 'block', 'biscuit', 'low']);
    if (t === 'biscuit') { const l = pick(s, [-1, 0, 1]); for (let i = 0; i < 4; i++) s.objs.push({ z: FAR + i * 1.6, l, t: 'biscuit' }); }
    else if (t === 'block' && s.rnd() < 0.4) { const free = pick(s, [-1, 0, 1]); [-1, 0, 1].filter((l) => l !== free).forEach((l) => s.objs.push({ z: FAR, l, t: 'block' })); }
    else { const lanes = s.rnd() < 0.45 ? [-1, 0, 1] : [pick(s, [-1, 0, 1])]; lanes.forEach((l) => s.objs.push({ z: FAR, l, t: t === 'biscuit' ? 'biscuit' : t })); }
    s.nextRow = rand(s, 8, 13);
  }
  for (const o of s.objs) {
    const z0 = o.z; o.z -= mv;
    if (!o.hit && z0 > 0.7 && o.z <= 0.7 && o.l === s.lane) {
      o.hit = true;
      if (o.t === 'biscuit') { s.bits++; s.stats.biscuits++; s.ev.push('blip'); fx(s, W / 2 + s.lx * LW, BY - 20, '#f7f1e4', 4); continue; }
      const ok = (o.t === 'low' && s.jump > 0) || (o.t === 'high' && s.slide > 0);
      if (!ok) { s.why = o.t === 'low' ? 'tripped a low fence' : o.t === 'high' ? 'hit a high bar' : 'ran into a crate'; if (hurt(s)) return; }
    }
  }
  s.objs = s.objs.filter((o) => o.z > -1);
  if (s.turn) {
    s.turn.z -= mv;
    if (s.turn.z <= 0.45) {
      if (s.queued === s.turn.dir) { s.stats.turns++; s.bits += 2; s.score += 20; s.ev.push('pow'); s.swing = s.turn.dir === 'left' ? -1 : 1; pop(s, W / 2, HZ + 8, 'TURN', '#ffb142'); s.turn = null; s.objs = []; s.nextTurn = rand(s, 70, 110); s.nextRow = 12; }
      else { s.why = 'missed the corner'; if (hurt(s)) return; s.turn = null; s.queued = null; s.nextTurn = 36; }
    }
  }
  s.level = 1 + Math.floor(s.z / 80);
}
export function bot(s) {
  if (s.turn && s.turn.z < windowZ(s) && !s.queued && s.frame % 6 === 0) return { [s.turn.dir]: true };
  if (s.frame % 5 !== 0) return {};
  const near = s.objs.filter((o) => o.z > 0 && o.z < 7 && o.l === s.lane && !o.hit).sort((a, b) => a.z - b.z)[0];
  if (!near) return {};
  if (near.t === 'low' && s.jump <= 0) return { a: true };
  if (near.t === 'high') return { down: true };
  if (near.t === 'block') { const free = [-1, 0, 1].find((l) => l !== s.lane && !s.objs.some((o) => o.t === 'block' && o.l === l && Math.abs(o.z - near.z) < 1.2)); if (free != null) return { [free < s.lane ? 'left' : 'right']: true }; }
  return {};
}
export const ghostPos = (s) => ({ x: W / 2 + s.lx * LW, y: BY - 20 });
export function draw(ctx, s) {
  ctx.fillStyle = '#2b1d4a'; ctx.fillRect(0, 0, W, HZ); ctx.fillStyle = '#ff8a5c'; ctx.fillRect(0, HZ - 10, W, 10);
  ctx.fillStyle = '#1a1426'; ctx.fillRect(0, HZ, W, H - HZ);
  const endZ = s.turn ? s.turn.z : FAR, a = proj(endZ), b = proj(0), sw = s.swing * 40;
  const X = (lane, p) => W / 2 + sw * (1 - p.s) + lane * LW * p.s;
  ctx.fillStyle = '#5c4a6e'; ctx.beginPath(); ctx.moveTo(X(-1.6, a), a.y); ctx.lineTo(X(1.6, a), a.y); ctx.lineTo(X(1.6, b), b.y); ctx.lineTo(X(-1.6, b), b.y); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath();
  for (const l of [-0.5, 0.5]) { ctx.moveTo(X(l, a), a.y); ctx.lineTo(X(l, b), b.y); } ctx.stroke();
  if (s.turn) label(ctx, (s.turn.dir === 'left' ? '< ' : '') + 'TURN' + (s.turn.dir === 'right' ? ' >' : ''), W / 2, HZ + 16, s.turn.z < windowZ(s) ? '#1a1424' : '#fbf1e0', 8, 'center');
  const sorted = [...s.objs].filter((o) => o.z > 0 && o.z < endZ + 2).sort((p, q) => q.z - p.z);
  for (const o of sorted) {
    const p = proj(o.z), x = X(o.l, p), w = Math.max(4, LW * 0.7 * p.s);
    if (o.t === 'biscuit') bone(ctx, x - 4, p.y - 16 * p.s, Math.max(0.6, p.s));
    else if (o.t === 'low') { ctx.fillStyle = '#c4523a'; ctx.fillRect(x - w / 2, p.y - 16 * p.s, w, 16 * p.s); }
    else if (o.t === 'high') { ctx.fillStyle = '#4fc3e8'; ctx.fillRect(x - w / 2, p.y - 48 * p.s, w, 12 * p.s); ctx.fillRect(x - w / 2, p.y - 48 * p.s, 3, 48 * p.s); ctx.fillRect(x + w / 2 - 3, p.y - 48 * p.s, 3, 48 * p.s); }
    else { ctx.fillStyle = '#6a4a8a'; ctx.fillRect(x - w / 2, p.y - 40 * p.s, w, 40 * p.s); }
  }
  const px = W / 2 + s.lx * LW, hop = s.jump > 0 ? Math.sin((1 - Math.max(0, s.jump) / 0.7) * Math.PI) * 28 : 0;
  shiba(ctx, px, BY - hop + (s.slide > 0 ? 6 : 0), { s: s.slide > 0 ? 0.8 : 1 });
  label(ctx, 'BONES ' + s.bits, W - 6, 24, '#f7f1e4', 6, 'right');
}
export function marquee(ctx, sx, sy) {
  ctx.fillStyle = '#2b1d4a'; ctx.fillRect(sx, sy, 30, 10); ctx.fillStyle = '#5c4a6e'; ctx.fillRect(sx + 6, sy + 10, 18, 12);
  ctx.fillStyle = '#ffb142'; ctx.fillRect(sx + 12, sy + 14, 5, 6);
}
