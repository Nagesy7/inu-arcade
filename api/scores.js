// Inu Arcade score API stub (Vercel serverless). kibble-pay-ready, NOT authoritative yet.
// GET  /api/scores?game=<id>&period=daily|weekly|monthly|all  -> { game, period, entries }
// POST /api/scores { game, name, score, at }                   -> { ok, stored }
// Storage is per-instance memory (resets on cold start), so the client keeps its local board as the source of truth.
// Next step: require `Authorization: Bearer <SIWS session>` from kibblePay.signIn(), verify it with kibble-pay's
// /api/auth, bind the score to the wallet, persist in KV/Postgres, and add server-side replay checks before any prize payout.
import { addScore, board, arcadeBoard, GAME_IDS, BOARD_KEYS, PERIODS } from '../src/core/scores.js';
const db = globalThis.__inuArcadeDb ||= {};
export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store'); res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS'); res.setHeader('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') { const period = PERIODS.includes(req.query.period) ? req.query.period : 'all'; const game = req.query.game;
    if (game === 'arcade') { const mode = ['classic', 'inu', 'daily'].includes(req.query.mode) ? req.query.mode : 'classic'; return res.status(200).json({ game, mode, period, entries: arcadeBoard(db, period, Date.now(), 10, mode) }); }
    if (!BOARD_KEYS.includes(game)) return res.status(400).json({ error: 'unknown game' }); return res.status(200).json({ game, period, entries: board(db, game, period) }); }
  if (req.method === 'POST') { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
    if (!b || !BOARD_KEYS.includes(b.game)) return res.status(400).json({ error: 'unknown game' });
    const score = Math.floor(Number(b.score)); if (!Number.isFinite(score) || score < 0 || score > 10_000_000) return res.status(400).json({ error: 'bad score' });
    const e = addScore(db, b.game, { name: b.name, score, at: Date.now() }); return res.status(200).json({ ok: true, stored: e, authoritative: false }); }
  res.setHeader('allow', 'GET, POST'); return res.status(405).json({ error: 'method not allowed' });
}
