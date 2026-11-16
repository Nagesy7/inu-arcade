// COIL — steer a growing Shiba tail around a yard, eat kibble, and don't nip your own tail or the fence.
// Directions come from the cabinet stick or the arrows. There is no second stick drawn on the playfield.
// Classic: pure steering. Inu: Bark Shed (A) drops the last three segments, on a cooldown, once you're long enough.
import { blank, edge, pre, fx, label } from './kit.js';
export const NAME = 'Coil';
export const META = {
  id: 'coil', title: 'COIL', short: 'COIL', color: '#7bed9f', buttons: 1, freePlay: true,
  blurb: 'Steer a growing tail. Eat the kibble. The fence and your own tail both end the run.',
  controls: 'Arrows or the stick steer. No second stick on the screen.',
  inuMove: 'BARK SHED (A): drop the last three segments, every 10s, once you are long enough.',
  classicNote: 'Original Inu rules at classic difficulty.',
};
export const W = 224, H = 256, COLS = 16, ROWS = 16, CELL = 12, OX = 16, OY = 32;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { left: 'right', right: 'left', up: 'down', down: 'up' };
export function create(seed = 1, opts = {}) {
  const s = blank(META.id, seed, opts, { lives: 1 });
  const y = 8; s.body = [[5, y], [4, y], [3, y]]; s.dir = 'right'; s.q = []; s.acc = 0; s.rate = 0.16; s.shed = 0;
  s.stats = { eats: 0, sheds: 0 }; place(s); return s;
}
function place(s) {
  let f, guard = 0;
  do { f = [(s.rnd() * COLS) | 0, (s.rnd() * ROWS) | 0]; } while (s.body.some((p) => p[0] === f[0] && p[1] === f[1]) && guard++ < 80);
  s.food = f;
}
function turn(s, d) {
  if (!DIRS[d]) return;
  const last = s.q.length ? s.q[s.q.length - 1] : s.dir;
  if (d === last || OPP[d] === last) return;
  if (s.q.length < 2) s.q.push(d);
}
export function step(s, dt, inp = {}) {
  if (!pre(s, dt)) return; const e = edge(s, inp);
  for (const d of Object.keys(DIRS)) if (e[d]) turn(s, d);
  s.shed = Math.max(0, s.shed - dt);
  if (s.inu && e.a && s.shed <= 0 && s.body.length > 6) { s.body.splice(s.body.length - 3, 3); s.shed = 10; s.stats.sheds++; s.ev.push('bark'); fx(s, OX + s.body[0][0] * CELL, OY + s.body[0][1] * CELL, '#fbf1e0', 6); }
  s.acc += dt; if (s.acc < s.rate) return; s.acc = 0;
  if (s.q.length) s.dir = s.q.shift();
  const [dx, dy] = DIRS[s.dir], h = s.body[0], n = [h[0] + dx, h[1] + dy];
  const px = OX + h[0] * CELL + CELL / 2, py = OY + h[1] * CELL + CELL / 2;
  if (n[0] < 0 || n[1] < 0 || n[0] >= COLS || n[1] >= ROWS) { s.why = 'hit the fence'; fx(s, px, py, '#7bed9f', 8); s.lives = 0; s.over = true; s.ev.push('die'); return; }
  if (s.body.slice(0, -1).some((p) => p[0] === n[0] && p[1] === n[1])) { s.why = 'nipped your tail'; fx(s, px, py, '#e8892e', 8); s.lives = 0; s.over = true; s.ev.push('die'); return; }
  s.body.unshift(n);
  if (n[0] === s.food[0] && n[1] === s.food[1]) { s.score += 1; s.stats.eats++; s.ev.push('blip'); s.rate = Math.max(0.07, 0.16 - s.score * 0.004); s.level = 1 + Math.floor(s.score / 8); place(s); }
  else s.body.pop();
}
export function bot(s) {
  if (s.frame % 6 !== 0) return {};
  const h = s.body[0], f = s.food, dx = f[0] - h[0], dy = f[1] - h[1];
  let d = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'down' : 'up');
  if (d === OPP[s.dir]) d = Math.abs(dx) >= Math.abs(dy) ? (dy >= 0 ? 'down' : 'up') : (dx >= 0 ? 'right' : 'left');
  if (d === OPP[s.dir]) return {};
  return { [d]: true };
}
export const ghostPos = (s) => ({ x: OX + s.body[0][0] * CELL + 6, y: OY + s.body[0][1] * CELL + 6 });
export function draw(ctx, s) {
  ctx.fillStyle = '#10161c'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#24343c'; ctx.fillRect(OX - 3, OY - 3, COLS * CELL + 6, ROWS * CELL + 6);
  ctx.fillStyle = '#162028'; ctx.fillRect(OX, OY, COLS * CELL, ROWS * CELL);
  ctx.fillStyle = '#1c2a32'; for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if ((x + y) % 2) ctx.fillRect(OX + x * CELL, OY + y * CELL, CELL, CELL);
  const f = s.food; ctx.fillStyle = '#c88a3c'; ctx.fillRect(OX + f[0] * CELL + 3, OY + f[1] * CELL + 3, 6, 6); ctx.fillStyle = '#e8c888'; ctx.fillRect(OX + f[0] * CELL + 4, OY + f[1] * CELL + 4, 2, 2);
  s.body.forEach((p, i) => {
    const x = OX + p[0] * CELL + 1, y = OY + p[1] * CELL + 1;
    ctx.fillStyle = i ? '#e8892e' : '#f6d7b0'; ctx.fillRect(x, y, CELL - 2, CELL - 2);
    if (!i) { ctx.fillStyle = '#1a1424'; ctx.fillRect(x + 2, y + 1, 2, 2); ctx.fillRect(x + 7, y + 1, 2, 2); ctx.fillStyle = '#3a2430'; ctx.fillRect(x + 4, y + 6, 3, 2); }
  });
  label(ctx, 'STICK OR ARROWS', W / 2, H - 14, '#8a7ac4', 6, 'center');
  if (s.inu) label(ctx, s.shed <= 0 && s.body.length > 6 ? 'A SHED' : 'SHED ' + Math.ceil(s.shed), 8, 22, '#7bed9f', 6);
}
export function marquee(ctx, sx, sy, t) {
  ctx.fillStyle = '#10161c'; ctx.fillRect(sx, sy, 30, 22);
  const n = 5; for (let i = 0; i < n; i++) { ctx.fillStyle = i ? '#e8892e' : '#f6d7b0'; ctx.fillRect(sx + 2 + ((i + (t * 4 | 0)) % 8) * 3, sy + 8, 3, 3); }
  ctx.fillStyle = '#c88a3c'; ctx.fillRect(sx + 20, sy + 6, 3, 3);
}
