// Inu Arcade "alive" update: Daily Event determinism + reward rules, activity feed real-data/offline handling, ambient FX levels.
import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import * as EV from '../src/core/daily.js'; import * as R from '../src/core/rewards.js'; import * as FEED from '../src/core/feed.js'; import * as AMB from '../src/core/ambient.js';
import { GAME_IDS, HOUSE } from '../src/core/scores.js';
const W1 = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', W2 = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

test('daily event: same Sydney date -> same event, whatever the device time zone or time of day', () => {
  // 2026-11-03 in Sydney (UTC+11) runs from 2026-11-02T13:00Z to 2026-11-03T13:00Z
  const a = EV.dailyEvent(Date.parse('2026-11-02T13:00:00Z')), b = EV.dailyEvent(Date.parse('2026-11-03T12:59:59Z')), c = EV.dailyEvent('2026-11-03');
  assert.equal(a.day, '2026-11-03'); assert.deepEqual(a, b); assert.deepEqual(a, c);
  assert.notEqual(EV.dailyEvent(Date.parse('2026-11-03T13:00:00Z')).day, '2026-11-03'); // Sydney midnight rolls the event
  assert.equal(EV.sydneyDay(Date.parse('2026-11-02T12:59:59Z')), '2026-11-02');
  assert.equal(EV.sydneyDay(Date.parse('2026-07-01T14:00:00Z')), '2026-07-02'); // winter: UTC+10
  for (let i = 0; i < 5; i++) assert.deepEqual(EV.dailyEvent('2027-01-0' + (i + 1)), EV.dailyEvent('2027-01-0' + (i + 1)));
});
test('daily event: cycles all nine cabinets every 9 days, never the same cabinet twice in a row, valid goal', () => {
  const days = Array.from({ length: 400 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)), evs = days.map((d) => EV.dailyEvent(d));
  for (let i = 0; i + 9 <= evs.length; i += 9) assert.equal(new Set(evs.slice(i, i + 9).map((e) => e.game)).size, 9);
  for (let i = 1; i < evs.length; i++) assert.notEqual(evs[i].game, evs[i - 1].game);
  const modes = new Set(), tiers = new Set();
  for (const e of evs) { assert.ok(GAME_IDS.includes(e.game)); assert.ok(['classic', 'inu'].includes(e.mode)); modes.add(e.mode); tiers.add(e.tier);
    assert.equal(e.target, EV.TARGETS[e.game][e.tier]); assert.equal(e.bones, EV.EVENT_BONES[e.tier]); assert.match(e.goal, /^Score [\d,]+ in .+ (Inu Mode|Classic)$/); }
  assert.equal(modes.size, 2); assert.equal(tiers.size, 3);
  for (const g of GAME_IDS) { const h = Object.fromEntries(HOUSE[g]), t = EV.TARGETS[g]; assert.ok(t[0] < t[1] && t[1] < t[2] && t[2] < h.INU, g); }
});
test('daily event rewards: Bones and one cosmetic only; never $KIBBLE, no fees, no wallet', () => {
  assert.deepEqual(EV.REWARD_KINDS, ['bones', 'cosmetic']);
  const ev = EV.dailyEvent('2026-11-03'); assert.deepEqual(Object.keys(ev.reward).sort(), ['bones', 'cosmetic', 'cosmeticAfter']);
  const src = readFileSync(new URL('../src/core/daily.js', import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(src, /kibble(?!-chomp|\s+chomp)|wallet|fee|wager|burn|fetch\(/i);
  assert.ok(!R.SHOP.some((s) => s.id === EV.RIBBON.id)); // not purchasable, not redeemable
  assert.ok(EV.EVENT_BONES.every((b) => b > 0 && b <= R.RUN_BONE_CAP));
});
test('daily event: qualifying needs the right cabinet, mode and score, once per Sydney day; ribbon after 3 days', () => {
  const p = R.newWallet(), ev = EV.dailyEvent('2026-11-03'); // street-sniffer, inu, 3400
  assert.equal(ev.game, 'street-sniffer'); assert.equal(ev.mode, 'inu');
  assert.ok(!EV.qualifies(p, ev, { game: 'kibble-chomp', mode: 'inu', score: 99999 }));
  assert.ok(!EV.qualifies(p, ev, { game: ev.game, mode: 'classic', score: 99999 }));
  assert.ok(!EV.qualifies(p, ev, { game: ev.game, mode: 'inu', score: ev.target - 1 }));
  assert.ok(EV.qualifies(p, ev, { game: ev.game, mode: 'inu', score: ev.target }));
  assert.ok(EV.qualifies(p, ev, { game: ev.game, mode: 'daily', score: ev.target })); // Daily seed is Inu Mode
  const r = EV.markDone(p, ev); assert.equal(r.count, 1); assert.equal(r.cosmetic, null);
  assert.ok(!EV.qualifies(p, ev, { game: ev.game, mode: 'inu', score: 99999 })); assert.equal(EV.markDone(p, ev), null);
  EV.markDone(p, EV.dailyEvent('2026-11-04')); const r3 = EV.markDone(p, EV.dailyEvent('2026-11-05'));
  assert.equal(r3.cosmetic.id, 'event-ribbon'); assert.ok(p.owned.includes('event-ribbon')); assert.equal(p.bones, 0); // markDone never pays Bones itself
  const c = EV.dailyEvent('2026-11-04'); assert.ok(EV.qualifies(R.newWallet(), c, { game: c.game, mode: c.mode, score: c.target }) === (c.mode === 'classic'));
});
test('reward rules: event bonus stays inside the 60-per-run and 600-per-day Bones caps; earn() unchanged', () => {
  for (const s of [0, 149, 150, 3000, 99999]) assert.deepEqual(R.earn('kibble-chomp', s), { bones: Math.min(60, 5 + Math.floor(s / 150)), tickets: R.earn('kibble-chomp', s).tickets });
  const now = new Date('2026-11-03T02:00:00Z');
  let w = R.newWallet(); let g = R.grant(w, 'bone-digger', 3000, now, 30); assert.equal(g.bones, 55); assert.equal(g.bonus, 30); // 25 + 30
  w = R.newWallet(); g = R.grant(w, 'bone-digger', 6000, now, 30); assert.equal(g.bones, 60); assert.equal(g.bonus, 15); // 45 + 30 capped at 60
  w = R.newWallet(); g = R.grant(w, 'bone-digger', 99999, now, 30); assert.equal(g.bones, 60); assert.equal(g.bonus, 0);
  w = R.newWallet(); for (let i = 0; i < 9; i++) R.grant(w, 'bone-digger', 99999, now); assert.equal(w.bones, 540);
  g = R.grant(w, 'bone-digger', 3000, now, 30); assert.equal(g.bones, 55); assert.equal(w.bones, 595);
  g = R.grant(w, 'bone-digger', 3000, now, 30); assert.equal(g.bones, 5); assert.equal(w.todayBones, 600); assert.equal(g.bonus, 0);
  g = R.grant(w, 'bone-digger', 3000, now, 30); assert.equal(g.bones, 0); assert.equal(w.bones, R.DAILY_BONE_CAP);
  w = R.newWallet(); g = R.grant(w, 'bone-digger', 0, now, -50); assert.equal(g.bones, 5); assert.equal(g.bonus, 0); // negative bonus ignored
  w = R.newWallet(); g = R.grant(w, 'bone-digger', 3000, now); assert.deepEqual([g.bones, g.bonus], [25, 0]); // no bonus = old behaviour
  assert.ok(!('kibble' in g));
});
test('feed: parses only real kibble-pay rows for the nine cabinets, shortens wallets, drops bad rows', () => {
  const j = { pool: 'weekly', period: '2026-W45', games: [
    { id: 'street-sniffer', entries: [{ rank: 1, wallet: W1, score: 4820 }, { rank: 2, wallet: W2, score: 1200 }] },
    { id: 'bone-digger', entries: [{ rank: 1, wallet: W2, score: 9100 }, { rank: 2, wallet: 'not-a-wallet', score: 50 }, { rank: 3, wallet: W1, score: -4 }, { rank: 0, wallet: W1, score: 5 }] },
    { id: 'some-other-game', entries: [{ rank: 1, wallet: W1, score: 1 }] }, { id: 'fud-swarm', entries: [{ rank: 1, wallet: W1, score: 1 }] }, null, { id: 'pup-crossing' }] };
  const f = FEED.parseFeed(j); assert.equal(f.period, '2026-W45'); assert.equal(f.entries.length, 3);
  assert.deepEqual(f.entries.map((e) => [e.game, e.rank]), [['bone-digger', 1], ['street-sniffer', 1], ['street-sniffer', 2]]);
  for (const e of f.entries) { assert.match(e.who, /^[1-9A-HJ-NP-Za-km-z]{4}…[1-9A-HJ-NP-Za-km-z]{4}$/); assert.ok(!JSON.stringify(e).includes(W1)); assert.equal(e.src, 'kibble-pay'); }
  assert.deepEqual(FEED.parseFeed({}).entries, []); assert.deepEqual(FEED.parseFeed(null).entries, []); assert.deepEqual(FEED.parseFeed({ games: 'x' }).entries, []);
  assert.equal(FEED.shortWallet('abc'), null); assert.equal(FEED.shortWallet(W1), '7xKX…gAsU');
  assert.match(FEED.FEED_URL, /^https:\/\/kibble-pay\.vercel\.app\/api\/game\?action=scores&byGame=1&pool=weekly$/);
});
test('feed: live / empty / offline / timeout / bad HTTP all settle; nothing is invented', async () => {
  const ok = (body) => async () => ({ ok: true, status: 200, json: async () => body });
  let r = await FEED.fetchFeed({ fetchImpl: ok({ games: [{ id: 'pup-crossing', entries: [{ rank: 1, wallet: W1, score: 3000 }] }] }) });
  assert.equal(r.status, 'live'); assert.equal(r.entries.length, 1);
  r = await FEED.fetchFeed({ fetchImpl: ok({ pool: 'weekly', games: GAME_IDS.map((id) => ({ id, entries: [] })) }) }); assert.equal(r.status, 'empty'); assert.deepEqual(r.entries, []);
  r = await FEED.fetchFeed({ fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }); assert.equal(r.status, 'offline'); assert.deepEqual(r.entries, []);
  r = await FEED.fetchFeed({ fetchImpl: async () => ({ ok: false, status: 503 }) }); assert.equal(r.status, 'offline'); assert.match(r.error, /503/);
  r = await FEED.fetchFeed({ fetchImpl: ok('garbage') }); assert.equal(r.status, 'empty');
  let aborted = false; const t0 = Date.now();
  r = await FEED.fetchFeed({ timeoutMs: 150, fetchImpl: (u, o) => new Promise(() => { o.signal?.addEventListener('abort', () => { aborted = true; }); }) }); // hangs forever
  assert.equal(r.status, 'offline'); assert.equal(r.error, 'timeout'); assert.ok(Date.now() - t0 < 1000); assert.ok(aborted);
  r = await FEED.fetchFeed({ timeoutMs: 150, fetchImpl: async () => ({ ok: true, json: () => new Promise(() => {}) }) }); assert.equal(r.status, 'offline'); // body never arrives
  r = await FEED.fetchFeed({ fetchImpl: null }); assert.equal(r.status, 'offline');
});
test('withTimeout: resolves, rejects, and turns a hang into a timeout (used for initKibble)', async () => {
  assert.equal(await FEED.withTimeout(Promise.resolve(7), 100), 7);
  await assert.rejects(FEED.withTimeout(Promise.reject(new Error('boom')), 100), /boom/);
  await assert.rejects(FEED.withTimeout(new Promise(() => {}), 50, 'kibble-pay timeout'), /kibble-pay timeout/);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /withTimeout\(g\.initKibble\(/); assert.match(main, /withTimeout\(import\('\.\/vendor\/inu-games\.js'\)/); assert.match(main, /mode: 'offline'/);
});
test('feed: local device feed = real non-house runs only, newest first, initials only', () => {
  const now = Date.parse('2026-11-03T03:00:00Z');
  const db = { 'kibble-chomp': [{ name: 'INU', score: 3000, at: now - 1000, house: true }, { name: 'ZAC', score: 1200, at: now - 5000, wallet: W1 }],
    'bone-digger@inu': [{ name: 'ABC', score: 4000, at: now - 1000 }, { name: 'OLD', score: 1, at: now - 30 * 864e5 }], 'fud-swarm': [{ name: 'XXX', score: 5, at: now }] };
  const l = FEED.localFeed(db, now); assert.deepEqual(l.map((e) => [e.who, e.game, e.mode]), [['ABC', 'bone-digger', 'inu'], ['ZAC', 'kibble-chomp', 'classic']]);
  assert.ok(!JSON.stringify(l).includes(W1)); assert.deepEqual(FEED.localFeed({}, now), []); assert.deepEqual(FEED.localFeed(null, now), []);
});
test('ambient: FX levels honour reduced motion and Low FX; settings persist; reduced crowd stands still', () => {
  assert.equal(AMB.fxLevel({}), 'full'); assert.equal(AMB.fxLevel({ low: true }), 'low'); assert.equal(AMB.fxLevel({ lowMem: true }), 'low'); assert.equal(AMB.fxLevel({ low: true, reduced: true }), 'reduced');
  const m = new Map(), st = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.deepEqual(AMB.loadFx(st), { low: false }); AMB.saveFx(st, { low: true }); assert.deepEqual(AMB.loadFx(st), { low: true }); m.set(AMB.FX_KEY, '{bad'); assert.deepEqual(AMB.loadFx(st), { low: false });
  assert.ok(AMB.crowdSize('low') < AMB.crowdSize('full'));
  const floor = { x0: 10, x1: 300, y0: 110, y1: 178 }, spots = [{ id: 'a', x: 50 }, { id: 'b', x: 120 }];
  let k = 1; const rand = () => ((k = (k * 16807) % 2147483647) / 2147483647);
  const C = AMB.createCrowd(4, floor, spots, rand), before = JSON.stringify(C.map((p) => [p.x, p.y]));
  for (let i = 0; i < 300; i++) AMB.updateCrowd(C, 1 / 60, { floor, spots, lvl: 'reduced', rand }); assert.equal(JSON.stringify(C.map((p) => [p.x, p.y])), before);
  for (let i = 0; i < 600; i++) AMB.updateCrowd(C, 1 / 60, { floor, spots, block: { x: 312, y: 150, w: 66, h: 34 }, lvl: 'full', hot: 'b', cheer: 0, rand });
  assert.notEqual(JSON.stringify(C.map((p) => [p.x, p.y])), before);
  for (const p of C) { assert.ok(p.x >= floor.x0 - 20 && p.x <= floor.x1 + 20 && p.y >= floor.y0 - 1 && p.y <= floor.y1 + 1); }
});
test('ambient audio: no AudioContext before a gesture; hall + attract tracks route through the volume bus', async () => {
  const A = await import('../src/core/audio.js'); assert.equal(A.audioState(), 'none');
  A.setMusic(true, 0, 'hall'); assert.equal(A.musicTrack(), 'hall'); A.setMusic(true, 0, 'attract:bone-digger'); assert.equal(A.musicTrack(), 'attract:bone-digger'); A.setMusic(false); assert.equal(A.musicTrack(), null);
  assert.equal(A.audioState(), 'none'); A.setMusicVolume(2); assert.equal(A.musicVolume(), 1); A.setMusicVolume(-1); assert.equal(A.musicVolume(), 0); A.setMusicVolume(0.7);
  const src = readFileSync(new URL('../src/core/audio.js', import.meta.url), 'utf8'); assert.match(src, /if \(!ac \|\| muted \|\| !mus\) return;/);
});
