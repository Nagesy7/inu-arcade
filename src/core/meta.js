// Modern meta layer: modes, daily seeded challenges, weekly rotating modifiers, achievements, ghost replays.
// Classic = pure arcade rules (no modifier, no twists). Inu Mode = signature move + twists + weekly modifier. Daily = Inu Mode on the day's shared seed.
export const MODES = {
  classic: { id: 'classic', name: 'CLASSIC', desc: 'Pure arcade rules and difficulty. No twists.' },
  inu: { id: 'inu', name: 'INU MODE', desc: 'Signature move, Inu twists and this week\'s modifier.' },
  daily: { id: 'daily', name: 'DAILY CHALLENGE', desc: 'Inu Mode on today\'s seed. Same run for every pup, one board per day.' },
};
export const MODE_IDS = Object.keys(MODES);
export const boardKey = (game, mode = 'classic') => (mode === 'classic' ? game : `${game}@${mode}`);
export const parseKey = (k) => { const [game, mode = 'classic'] = String(k).split('@'); return { game, mode }; };
export const dayStr = (now = Date.now()) => { const d = new Date(now); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function hash(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export const dailySeed = (game, now = Date.now()) => hash(`inu-arcade:${game}:${dayStr(now)}`) || 1;
// Weekly modifiers rotate every Monday. Same for every player that week, so the boards stay fair. Multiplier compensates for difficulty.
export const MODIFIERS = [
  { id: 'zoomies', name: 'ZOOMIES WEEK', desc: 'Everything runs 20% faster. Score x1.25.', speed: 1.2, mult: 1.25 },
  { id: 'glass-pup', name: 'GLASS PUP', desc: 'One life only. Score x2.', lives: 1, mult: 2 },
  { id: 'iron-coat', name: 'IRON COAT', desc: 'Start with 5 lives. Score x0.8.', lives: 5, mult: 0.8 },
  { id: 'diamond-paws', name: 'DIAMOND PAWS', desc: '2 lives, 10% faster. Score x1.5.', lives: 2, speed: 1.1, mult: 1.5 },
];
export function weekIndex(now = Date.now()) { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return Math.floor((d.getTime() - new Date(2026, 0, 5).getTime()) / 6048e5 + 0.5); }
export const weeklyModifier = (now = Date.now()) => MODIFIERS[((weekIndex(now) % MODIFIERS.length) + MODIFIERS.length) % MODIFIERS.length];
export const modFor = (mode, now) => (mode === 'classic' ? null : weeklyModifier(now));
export function applyMod(s, mod) { if (mod?.lives) s.lives = mod.lives; return s; }
export const finalScore = (raw, mod) => Math.floor(raw * (mod?.mult || 1));
// ---- ghost replays: input bitmask per 1/60 tick, run-length encoded ----
const BITS = { left: 1, right: 2, up: 4, down: 8, a: 16, b: 32 }; // b = second action button (two-button cabinets)
export const toMask = (inp) => Object.entries(BITS).reduce((m, [k, b]) => (inp[k] ? m | b : m), 0);
export const fromMask = (m) => ({ left: !!(m & 1), right: !!(m & 2), up: !!(m & 4), down: !!(m & 8), a: !!(m & 16), b: !!(m & 32), pressed: new Set() });
export function encode(masks) { const out = []; for (let i = 0; i < masks.length;) { let j = i; while (j < masks.length && masks[j] === masks[i] && j - i < 4095) j++; out.push((masks[i]).toString(36) + (j - i).toString(36)); i = j; } return out.join('.'); }
export function decode(str) { const out = []; if (!str) return out; for (const tok of str.split('.')) { const m = parseInt(tok[0], 36), n = parseInt(tok.slice(1), 36); for (let k = 0; k < n; k++) out.push(m); } return out; }
export function replay(G, ghost, ticks = Infinity) { const s = applyMod(G.create(ghost.seed, { inu: ghost.mode !== 'classic' }), ghost.mod); const ms = decode(ghost.rle); const dt = (1 / 60) * (ghost.mod?.speed || 1);
  for (let i = 0; i < ms.length && i < ticks && !s.over; i++) G.step(s, dt, fromMask(ms[i])); return s; }
// ---- achievements (each pays a fixed number of tickets, once) ----
export const ACHIEVEMENTS = [
  { id: 'first-coin', name: 'Insert Kibble', desc: 'Finish your first run', tickets: 2, test: (r) => true },
  { id: 'chomp-feast', name: 'Cat Nap', desc: 'Kibble Chomp: eat 4 cats in one run', tickets: 4, test: (r) => r.game === 'kibble-chomp' && r.stats.cats >= 4 },
  { id: 'chomp-clear', name: 'Clean Bowl', desc: 'Kibble Chomp: clear a maze', tickets: 5, test: (r) => r.game === 'kibble-chomp' && r.level >= 2 },
  { id: 'chomp-coin', name: 'Bag Holder', desc: 'Kibble Chomp (Inu): grab a $KIBBLE coin', tickets: 3, test: (r) => r.game === 'kibble-chomp' && r.stats.coins >= 1 },
  { id: 'inv-streak', name: 'Sharpshooter', desc: 'Bark Invaders: 15 hits without a miss', tickets: 4, test: (r) => r.game === 'bark-invaders' && r.stats.best >= 15 },
  { id: 'inv-boss', name: 'Whale Watcher', desc: 'Bark Invaders (Inu): sink the rug-pull whale', tickets: 6, test: (r) => r.game === 'bark-invaders' && r.stats.bosses >= 1 },
  { id: 'inv-wave', name: 'Fleet Rekt', desc: 'Bark Invaders: clear a wave', tickets: 4, test: (r) => r.game === 'bark-invaders' && r.level >= 2 },
  { id: 'cross-home', name: 'Park Life', desc: 'Pup Crossing: reach 3 dog-park gates in one run', tickets: 3, test: (r) => r.game === 'pup-crossing' && r.stats.homes >= 3 },
  { id: 'cross-rescue', name: 'Good Samaritan', desc: 'Pup Crossing (Inu): rescue 3 puppies', tickets: 6, test: (r) => r.game === 'pup-crossing' && r.stats.rescued >= 3 },
  { id: 'brk-rally', name: 'Rally Pup', desc: 'Bone Breaker: 20 paddle hits in a row', tickets: 4, test: (r) => r.game === 'bone-breaker' && r.stats.maxRally >= 20 },
  { id: 'brk-boss', name: 'FUD Buster', desc: 'Bone Breaker (Inu): smash the FUD-bot boss brick', tickets: 5, test: (r) => r.game === 'bone-breaker' && r.stats.bosses >= 1 },
  { id: 'snf-hide', name: 'Bin Ninja', desc: 'Street Sniffer: hide in 3 bins in one run', tickets: 3, test: (r) => r.game === 'street-sniffer' && r.stats.hides >= 3 },
  { id: 'snf-soak', name: 'Hose Down', desc: 'Street Sniffer: soak 3 cats with hydrants in one run', tickets: 4, test: (r) => r.game === 'street-sniffer' && r.stats.soaked >= 3 },
  { id: 'snf-clear', name: 'Block Party', desc: 'Street Sniffer: clear a city', tickets: 5, test: (r) => r.game === 'street-sniffer' && r.level >= 2 },
  { id: 'pf-floor', name: 'First Dan', desc: 'Paw-Fu Tower: beat the first floor boss', tickets: 5, test: (r) => r.game === 'paw-fu-tower' && r.stats.bosses >= 1 },
  { id: 'pf-combo', name: 'Flurry Paws', desc: 'Paw-Fu Tower: land a 4-hit combo', tickets: 4, test: (r) => r.game === 'paw-fu-tower' && r.stats.maxCombo >= 4 },
  { id: 'pf-zen', name: 'Inner Howl', desc: 'Paw-Fu Tower (Inu): stun foes with 3 Zen Barks in one run', tickets: 4, test: (r) => r.game === 'paw-fu-tower' && r.stats.barks >= 3 },
  { id: 'daily', name: 'Daily Grind', desc: 'Finish a Daily Challenge', tickets: 3, test: (r) => r.mode === 'daily' },
  { id: 'all-four', name: 'Arcade Rat', desc: 'Play all four cabinets', tickets: 5, test: (r, p) => ['kibble-chomp', 'bark-invaders', 'pup-crossing', 'bone-breaker'].every((g) => p.played?.[g]) },
];
export function evalAchievements(purse, run) {
  purse.ach ||= {}; purse.played ||= {}; purse.played[run.game] = (purse.played[run.game] || 0) + 1; const got = [];
  for (const a of ACHIEVEMENTS) if (!purse.ach[a.id] && a.test(run, purse)) { purse.ach[a.id] = Date.now(); purse.tickets += a.tickets; got.push(a); }
  return got;
}
