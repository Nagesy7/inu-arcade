import test from 'node:test'; import assert from 'node:assert/strict';
import * as S from '../src/core/scores.js'; import * as R from '../src/core/rewards.js'; import { simWallet } from '../src/core/wallet.js';
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
test('scores: per-game board keeps best per player and filters by period', () => {
  const db = {}, now = new Date(2026, 9, 15, 12).getTime(), day = 864e5;
  S.addScore(db, 'kibble-chomp', { name: 'zac', score: 500, at: now }); S.addScore(db, 'kibble-chomp', { name: 'ZAC', score: 900, at: now - 3 * day });
  S.addScore(db, 'kibble-chomp', { name: 'bob', score: 700, at: now - 40 * day }); S.addScore(db, 'nope', { name: 'x', score: 1 });
  assert.deepEqual(S.board(db, 'kibble-chomp', 'daily', now).map((e) => [e.name, e.score]), [['ZAC', 500]]);
  assert.equal(S.board(db, 'kibble-chomp', 'monthly', now)[0].score, 900);
  assert.equal(S.board(db, 'kibble-chomp', 'all', now).length, 2); assert.equal(db.nope, undefined);
});
test('scores: combined arcade board normalises each game to 1000', () => {
  const db = {}, now = Date.now(); S.addScore(db, 'kibble-chomp', { name: 'AAA', score: 1000, at: now }); S.addScore(db, 'kibble-chomp', { name: 'BBB', score: 500, at: now });
  S.addScore(db, 'bone-breaker', { name: 'BBB', score: 300, at: now }); const b = S.arcadeBoard(db, 'daily', now);
  assert.deepEqual(b.map((e) => [e.name, e.points]), [['BBB', 1500], ['AAA', 1000]]);
  const p = S.payouts('daily', b); assert.equal(p[0].bones, 300); assert.equal(p[0].name, 'BBB'); assert.equal(p[2].name, '---');
});
test('scores: week starts Monday', () => { const thu = new Date(2026, 9, 15, 9).getTime(); assert.equal(new Date(S.periodStart('weekly', thu)).getDay(), 1); });
test('rewards: tickets by skill tier, bones capped daily, fixed prize counter', () => {
  assert.deepEqual(R.earn('kibble-chomp', 0), { bones: 5, tickets: 1 }); assert.equal(R.earn('kibble-chomp', 9000).tickets, 5);
  const w = R.newWallet(); for (let i = 0; i < 30; i++) R.grant(w, 'kibble-chomp', 99999); assert.equal(w.bones, R.DAILY_BONE_CAP); assert.equal(w.tickets, 150);
  const r = R.redeem(w, 'arcade-cap'); assert.ok(r.ok); assert.equal(w.tickets, 146); assert.equal(R.redeem(w, 'arcade-cap').ok, false);
  const poor = R.newWallet(); assert.equal(R.redeem(poor, 'neon-tophat').ok, false);
});
test('rewards: neon skin by tickets, gold skin by (simulated) burn', async () => {
  const w = R.newWallet(); w.tickets = 12; assert.ok(R.unlockSkinWithTickets(w, 'bone-breaker').ok); assert.equal(w.tickets, 0);
  const sw = simWallet(mem()); assert.equal(await sw.balance(), 1000000); const r = await R.unlockSkinWithBurn(w, 'bone-breaker', sw); assert.ok(r.ok && r.simulated); assert.equal(await sw.balance(), 750000);
  assert.deepEqual(w.skins['bone-breaker'], ['neon', 'gold']);
});
test('house scores never win prizes', async () => { const S = await import('../src/core/scores.js'); const db = S.seedHouse({}); S.addScore(db, 'kibble-chomp', { name: 'ZAC', score: 10 }); const p = S.payouts('daily', S.arcadeBoard(db, 'daily')); assert.equal(p[0].name, 'ZAC'); assert.equal(p[1].name, '---'); });
