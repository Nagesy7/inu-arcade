// Human-like play sim. The built-in bot is the "brain", but it only gets to re-decide once per reaction window
// (~250ms = 15 frames) and its decision is held for the whole window (no frame-perfect corrections). Hop games are
// taps (the decision fires once per window). 6% of decisions are a random wrong input, 4% are dropped, and every
// ~20s the player zones out for 0.5s. Paddle/turret games are different: hands track continuously, but the eyes lag,
// so the bot steers every frame from a STALE view (balls/bombs rewound by the 250ms reaction delay).
// Prints medians over N seeds, Classic and Inu.
const STALE = {
  'bone-breaker': (s, d) => { const v = Object.create(s); v.balls = s.balls.map((b) => (b.stuck ? b : { ...b, x: b.x - b.vx * d, y: b.y - b.vy * d })); return v; },
  'bark-invaders': (s, d) => { const v = Object.create(s); v.bombs = Object.fromEntries(Object.entries(s.bombs).map(([k, b]) => [k, b && { ...b, y: b.y - 1.5 * d }])); return v; } };
// Prints per-game median time alive, levels reached and score over N seeds, for Classic and Inu.
import * as C from '../src/games/chomp.js'; import * as BK from '../src/games/bark.js'; import * as X from '../src/games/crossing.js'; import * as B from '../src/games/breaker.js'; import * as SN from '../src/games/street.js'; import * as PF from '../src/games/pawfu.js'; import * as DG from '../src/games/digger.js'; import * as PP from '../src/games/pip.js'; import * as SC from '../src/games/shiba.js';
import { rng } from '../src/core/rng.js';
export const HUMAN = { delayF: 15, tap: false, wrong: 0.06, drop: 0.04, zoneEveryF: 1200, zoneF: 30 };
const KEYS = ['left', 'right', 'up', 'down', 'a', 'b', 'c'];
export function humanRun(G, seed, { inu = false, maxF = 60 * 300, h = HUMAN } = {}) {
  const s = G.create(seed, { inu }), r = rng(seed * 7919 + 1); let f = 0, firstLifeF = null, hold = {}; const lives0 = s.lives; const tap = h.tap || G.META.id === 'pup-crossing';
  for (; f < maxF && !s.over; f++) {
    let act = hold; const st = STALE[G.META.id];
    if (st) { act = G.bot(st(s, h.delayF)); if (f % h.delayF === 0) { const x = r(); hold = x < h.drop ? {} : x < h.drop + h.wrong ? { [KEYS[Math.floor(r() * 5)]]: true } : null; } if (hold && f % h.delayF < 6) act = hold; }
    else if (f % h.delayF === 0) { let inp = G.bot(s); const x = r(); if (x < h.drop) inp = {}; else if (x < h.drop + h.wrong) inp = { [KEYS[Math.floor(r() * 5)]]: true }; hold = inp; act = inp; }
    else if (tap) act = {};
    if (f % h.zoneEveryF < h.zoneF) act = {};
    G.step(s, 1 / 60, act); if (firstLifeF === null && s.lives < lives0) firstLifeF = f;
  }
  return { secs: f / 60, firstLife: (firstLifeF ?? f) / 60, level: s.level, score: s.score };
}
const med = (a) => { const b = [...a].sort((p, q) => p - q); return b[Math.floor(b.length / 2)]; };
export function report(N = 15) { const out = {};
  for (const [id, G] of Object.entries({ 'kibble-chomp': C, 'bark-invaders': BK, 'pup-crossing': X, 'bone-breaker': B, 'street-sniffer': SN, 'paw-fu-tower': PF, 'bone-digger': DG, 'pips-big-bark': PP, 'shiba-scuffle': SC })) for (const inu of [false, true]) {
    const rs = Array.from({ length: N }, (_, i) => humanRun(G, i + 1, { inu }));
    out[id + (inu ? '@inu' : '')] = { aliveS: med(rs.map((r) => r.secs)), firstLifeS: med(rs.map((r) => r.firstLife)), level: med(rs.map((r) => r.level)), score: med(rs.map((r) => r.score)), cleared1: rs.filter((r) => r.level >= 2).length + '/' + N }; }
  return out; }
if (import.meta.url === 'file://' + process.argv[1]) console.table(report(Number(process.argv[2]) || 15));
