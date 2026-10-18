// Leaderboards: per-game + combined Arcade board, filtered by day/week/month. Local storage now; server stub in /api/scores.
// Prizes are awarded by RANK ONLY (skill). Free to play, no paid entry, no chance-based prizes.
export const GAME_IDS = ['kibble-chomp', 'bark-invaders', 'pup-crossing', 'bone-breaker', 'street-sniffer', 'paw-fu-tower'];
export const MODE_SUFFIX = ['', '@inu', '@daily'];
export const SCORES_VERSION = 2, SCORES_KEY = 'inuarcade.scores.v' + SCORES_VERSION; // v2 = remixed original cabinets; v1 (arcade-table) scores stay in their own key
export const BOARD_KEYS = GAME_IDS.flatMap((g) => MODE_SUFFIX.map((m) => g + m));
const keyFor = (g, mode) => (mode && mode !== 'classic' ? `${g}@${mode}` : g);
export const PERIODS = ['daily', 'weekly', 'monthly', 'all'];
export function periodStart(period, now = Date.now()) {
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  if (period === 'daily') return d.getTime();
  if (period === 'weekly') { const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return d.getTime(); } // Monday
  if (period === 'monthly') { d.setDate(1); return d.getTime(); }
  return 0;
}
export const cleanName = (n) => (String(n || '').toUpperCase().replace(/[^A-Z0-9]/g, '') + '???').slice(0, 3);
export function addScore(db, game, { name, score, at = Date.now(), wallet = null, house = false }) {
  if (!BOARD_KEYS.includes(game) || !Number.isFinite(score) || score < 0) return null;
  const e = { name: cleanName(name), score: Math.floor(score), at, wallet }; if (house) e.house = true; (db[game] ||= []).push(e);
  db[game].sort((a, b) => b.score - a.score || a.at - b.at); if (db[game].length > 200) db[game].length = 200; return e;
}
// best score per player name within the period, highest first
export function board(db, game, period = 'all', now = Date.now(), n = 10) {
  const from = periodStart(period, now), best = new Map();
  for (const e of db[game] || []) if (e.at >= from && e.at <= now + 6e4 && (!best.has(e.name) || best.get(e.name).score < e.score)) best.set(e.name, e);
  return [...best.values()].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, n);
}
// Combined Arcade board: each game's top score in the period = 1000 pts; a player's best earns a share. Sum over games.
export function arcadeBoard(db, period = 'all', now = Date.now(), n = 10, mode = 'classic') {
  const tot = new Map();
  for (const g of GAME_IDS) { const b = board(db, keyFor(g, mode), period, now, 1000); const top = b[0]?.score || 0; if (!top) continue;
    for (const e of b) { const t = tot.get(e.name) || { name: e.name, points: 0, games: 0, house: !!e.house }; t.points += Math.round((1000 * e.score) / top); t.games++; tot.set(e.name, t); } }
  return [...tot.values()].sort((a, b) => b.points - a.points || b.games - a.games).slice(0, n);
}
// Prize pools (display). Funded by the arcade treasury / sponsors, paid in Bones + cosmetics to the top ranks. Never sold, never random.
export const POOLS = {
  daily: { bones: 600, cosmetic: 'Daily Champ Bandana', split: [50, 30, 20] },
  weekly: { bones: 3000, cosmetic: 'Weekly Gold Joystick Pin', split: [50, 30, 20] },
  monthly: { bones: 12000, cosmetic: 'Monthly Arcade Crown', split: [50, 30, 20] },
};
export function payouts(period, ranked) { const p = POOLS[period]; ranked = ranked.filter((e) => !e.house); return p.split.map((pct, i) => ({ rank: i + 1, name: ranked[i]?.name || '---', bones: Math.floor((p.bones * pct) / 100), cosmetic: i === 0 ? p.cosmetic : null })); }
export function resetsIn(period, now = Date.now()) { const d = new Date(periodStart(period, now));
  if (period === 'daily') d.setDate(d.getDate() + 1); else if (period === 'weekly') d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1); return d.getTime() - now; }
export function createScoreStore(storage, key = SCORES_KEY) {
  const load = () => { try { return JSON.parse(storage.getItem(key)) || {}; } catch { return {}; } };
  return { load, save: (db) => { try { storage.setItem(key, JSON.stringify(db)); } catch {} } };
}
// Optional server sync (kibble-pay-ready stub at /api/scores). Fire-and-forget; local board stays the source of truth for now.
export async function postScore(game, entry, base = '') { try { const r = await fetch(base + '/api/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ game, ...entry }) }); return r.ok ? r.json() : null; } catch { return null; } }
// House demo scores so a fresh cabinet has something to beat. Flagged house: shown, never eligible for prizes.
// House scores for the v2 (remixed) rules, scaled from the human-sim medians (scripts/human-sim.mjs): INU ~2x a typical
// first-session run, PUP ~ typical, DOG ~ beginner. Bone Breaker classic tops out at MAX_SCORE (714) over 3 screens.
export const HOUSE = { 'kibble-chomp': [['INU', 3000], ['PUP', 1500], ['DOG', 600]], 'bark-invaders': [['INU', 2500], ['PUP', 1200], ['DOG', 500]], 'pup-crossing': [['INU', 3000], ['PUP', 1500], ['DOG', 600]], 'bone-breaker': [['INU', 650], ['PUP', 400], ['DOG', 200]], 'street-sniffer': [['INU', 4500], ['PUP', 2200], ['DOG', 900]], 'paw-fu-tower': [['INU', 6000], ['PUP', 2700], ['DOG', 1200]] };
export function seedHouse(db, now = Date.now()) { if (db._seeded) return db; db._seeded = 1;
  const H = HOUSE;
  for (const [g, list] of Object.entries(H)) for (const [name, score] of list) addScore(db, g, { name, score, at: now, house: true }); return db; }
