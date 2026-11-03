// Activity feed: REAL scores only. Source = kibble-pay's public read endpoint (GET /api/game?action=scores&byGame=1&pool=weekly):
// wallet-signed best scores per cabinet for this Sydney week. Nothing is ever simulated or padded: if the endpoint is empty
// or unreachable we say so, and can show this device's own runs, clearly labelled THIS DEVICE (never the house INU/PUP/DOG demo rows).
// Wallets are shown shortened (4…4); local runs show their 3-letter initials only.
import { GAME_IDS } from './scores.js';
export const KP = 'https://kibble-pay.vercel.app';
export const FEED_URL = KP + '/api/game?action=scores&byGame=1&pool=weekly';
export const FEED_TIMEOUT_MS = 4000;
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const shortWallet = (a) => (typeof a === 'string' && B58.test(a) ? a.slice(0, 4) + '…' + a.slice(-4) : null);
// Rejects with Error('timeout') if p has not settled after ms (the underlying work may keep running; callers ignore it).
export function withTimeout(p, ms, label = 'timeout') { let t; return Promise.race([Promise.resolve(p).finally(() => clearTimeout(t)), new Promise((_, rej) => { t = setTimeout(() => rej(new Error(label)), ms); })]); }
// kibble-pay byGame payload -> feed entries for the nine arcade cabinets. Malformed rows are dropped, never repaired.
export function parseFeed(json, n = 12) {
  const out = []; const games = Array.isArray(json?.games) ? json.games : [];
  for (const g of games) { if (!GAME_IDS.includes(g?.id) || !Array.isArray(g.entries)) continue;
    for (const e of g.entries) { const who = shortWallet(e?.wallet), score = Number(e?.score), rank = Number(e?.rank);
      if (!who || !Number.isInteger(score) || score <= 0 || !Number.isInteger(rank) || rank < 1) continue; out.push({ game: g.id, who, score, rank, src: 'kibble-pay' }); } }
  out.sort((a, b) => a.rank - b.rank || b.score - a.score || (a.game < b.game ? -1 : 1)); // every cabinet's #1 first, then #2s, ...
  return { period: typeof json?.period === 'string' ? json.period.slice(0, 12) : '', entries: out.slice(0, n) };
}
// -> { status: 'live' | 'empty' | 'offline', entries, period, at, error }. Always settles within timeoutMs (+ a tick).
export async function fetchFeed({ fetchImpl = globalThis.fetch, url = FEED_URL, timeoutMs = FEED_TIMEOUT_MS, now = Date.now } = {}) {
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  try {
    if (!fetchImpl) throw new Error('no fetch');
    const r = await withTimeout(fetchImpl(url, { signal: ac?.signal, cache: 'no-store' }), timeoutMs);
    if (!r?.ok) throw new Error('HTTP ' + (r?.status ?? '?'));
    const j = await withTimeout(r.json(), timeoutMs); const f = parseFeed(j);
    return { status: f.entries.length ? 'live' : 'empty', entries: f.entries, period: f.period, at: now(), error: '' };
  } catch (e) { try { ac?.abort(); } catch {} return { status: 'offline', entries: [], period: '', at: now(), error: String(e?.message || e).slice(0, 80) }; }
}
// This device's real runs (newest first), house demo rows excluded. db = scores.js store.
export function localFeed(db, now = Date.now(), n = 8, days = 7) {
  const out = [], from = now - days * 864e5;
  for (const [key, list] of Object.entries(db || {})) { const game = key.split('@')[0]; if (!GAME_IDS.includes(game) || !Array.isArray(list)) continue;
    for (const e of list) if (!e.house && e.at >= from && e.at <= now + 6e4 && Number.isFinite(e.score) && e.score > 0) out.push({ game, mode: key.split('@')[1] || 'classic', who: String(e.name || '').slice(0, 3), score: e.score, at: e.at, src: 'device' }); }
  return out.sort((a, b) => b.at - a.at).slice(0, n);
}
