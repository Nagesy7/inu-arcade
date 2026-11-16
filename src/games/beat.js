// BEAT LANES — four lanes of notes. Left, Down, Up and Right each own a lane. Hit the line in time.
// Classic: timing and a miss meter. Inu: Howl (A) catches every lane's nearest note, on a cooldown.
import { blank, edge, pre, fx, label } from './kit.js';
export const NAME = 'Beat Lanes';
export const LANES = 4, LC = ['#ff5d73', '#f2c14e', '#5fd37a', '#4fc3e8'];
export const LANE_KEY = ['left', 'down', 'up', 'right'];
export const META = {
  id: 'beat-lanes', title: 'BEAT LANES', short: 'BEAT', color: '#ff5dd3', buttons: 1, freePlay: true,
  blurb: 'Four lanes. Left, Down, Up and Right each catch a lane as the note crosses the line.',
  controls: 'Left / Down / Up / Right hit the four lanes.',
  inuMove: 'HOWL (A): catches the closest note in every lane. 8s cooldown.',
  classicNote: 'Original Inu rules at classic difficulty. Too many misses end the song.',
};
export const W = 224, H = 256, HIT_Y = 200;
export function create(seed = 1, opts = {}) {
  const s = blank(META.id, seed, opts, { lives: 1 });
  s.bpm = 108; s.song = -1.4; s.notes = []; s.next = 0; s.combo = 0; s.hp = 8; s.judge = ''; s.jT = 0; s.howl = 0; s.laneFlash = [0, 0, 0, 0];
  s.stats = { perfects: 0, misses: 0, howls: 0 }; return s;
}
const laneX = (i) => 10 + i * 52;
export function strike(s, ln) {
  s.laneFlash[ln] = 0.12; let best = null, bd = 9;
  for (const n of s.notes) if (!n.done && n.l === ln) { const d = Math.abs(n.t - s.song); if (d < bd) { bd = d; best = n; } }
  if (best && bd < 0.18) {
    best.done = true; s.combo++; const perfect = bd < 0.075;
    s.score += (perfect ? 100 : 50) * (1 + Math.floor(s.combo / 8)); s.hp = Math.min(8, s.hp + 0.2);
    s.judge = perfect ? 'PERFECT' : 'GOOD'; s.jT = 0.45; if (perfect) s.stats.perfects++; s.ev.push('blip');
    fx(s, laneX(ln) + 22, HIT_Y, LC[ln], perfect ? 8 : 4);
    return true;
  }
  return false;
}
export function step(s, dt, inp = {}) {
  if (!pre(s, dt)) return; const e = edge(s, inp);
  s.song += dt; s.howl = Math.max(0, s.howl - dt); s.jT -= dt; const spb = 60 / s.bpm;
  for (let i = 0; i < LANES; i++) if (e[LANE_KEY[i]]) strike(s, i);
  if (s.inu && e.a && s.howl <= 0) { s.howl = 8; s.stats.howls++; s.ev.push('bark'); for (let i = 0; i < LANES; i++) strike(s, i); }
  while (s.next < s.song + 2) { if (s.next >= 0.35 && s.rnd() < 0.62) s.notes.push({ t: s.next, l: (s.rnd() * LANES) | 0, done: false }); s.next += spb; }
  for (const n of s.notes) if (!n.done && s.song - n.t > 0.18) {
    n.done = true; n.miss = true; s.combo = 0; s.hp -= 1; s.stats.misses++; s.judge = 'MISS'; s.jT = 0.4; s.ev.push('hit');
    if (s.hp <= 0) { s.why = 'too many misses'; s.lives = 0; s.over = true; s.ev.push('die'); return; }
  }
  s.notes = s.notes.filter((n) => s.song - n.t < 0.45); s.laneFlash = s.laneFlash.map((f) => Math.max(0, f - dt));
  s.level = 1 + Math.floor(Math.max(0, s.song) / 20);
}
export function bot(s) {
  if (s.frame % 3 !== 0) return {};
  let best = null, bd = 0.1;
  for (const n of s.notes) if (!n.done) { const d = n.t - s.song; if (d > -0.02 && d < bd) { bd = d; best = n; } }
  if (!best) return {};
  return { [LANE_KEY[best.l]]: true };
}
export const ghostPos = (s) => ({ x: laneX(1) + 22, y: HIT_Y });
export function draw(ctx, s) {
  ctx.fillStyle = '#120d22'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < LANES; i++) { ctx.fillStyle = i % 2 ? '#1b1533' : '#211a3d'; ctx.fillRect(laneX(i), 22, 48, H - 22); if (s.laneFlash[i] > 0) { ctx.fillStyle = LC[i]; ctx.globalAlpha = 0.35; ctx.fillRect(laneX(i), 22, 48, H - 22); ctx.globalAlpha = 1; } }
  ctx.fillStyle = '#fbf1e0'; ctx.fillRect(10, HIT_Y - 1, 204, 3);
  const marks = ['<', 'v', '^', '>'];
  for (let i = 0; i < LANES; i++) { ctx.strokeStyle = LC[i]; ctx.strokeRect(laneX(i) + 8, HIT_Y - 8, 32, 16); label(ctx, marks[i], laneX(i) + 20, HIT_Y + 14, '#8a7ac4', 6, 'center'); }
  for (const n of s.notes) { if (n.done) continue; const y = HIT_Y - (n.t - s.song) * 120; if (y < -10 || y > H) continue; ctx.fillStyle = LC[n.l]; ctx.fillRect(laneX(n.l) + 8, y - 6, 32, 12); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(laneX(n.l) + 12, y - 4, 16, 2); }
  label(ctx, String(s.score), W / 2, 24, '#fbf1e0', 8, 'center');
  if (s.combo > 1) label(ctx, s.combo + ' CHAIN', W / 2, 36, '#ff5dd3', 6, 'center');
  if (s.song < 0) label(ctx, String(Math.ceil(-s.song)), W / 2, 100, '#fbf1e0', 16, 'center');
  if (s.jT > 0) label(ctx, s.judge, W / 2, HIT_Y - 28, s.judge === 'MISS' ? '#ff5d73' : '#fbf1e0', 8, 'center');
  ctx.fillStyle = '#2a2340'; ctx.fillRect(10, H - 16, 204, 6); ctx.fillStyle = s.hp > 3 ? '#5fd37a' : '#ff5d73'; ctx.fillRect(10, H - 16, 204 * Math.max(0, s.hp) / 8, 6);
  if (s.inu) { ctx.fillStyle = s.howl <= 0 ? '#ff5dd3' : '#5a3a55'; ctx.fillRect(10, H - 24, 60 * (s.howl <= 0 ? 1 : 1 - s.howl / 8), 3); }
}
export function marquee(ctx, sx, sy, t) {
  ctx.fillStyle = '#120d22'; ctx.fillRect(sx, sy, 30, 22);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = LC[i]; ctx.fillRect(sx + 2 + i * 7, sy + 8 + Math.round(Math.sin(t * 4 + i) * 4), 5, 3); }
}
