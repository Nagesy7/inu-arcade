import test from 'node:test'; import assert from 'node:assert/strict';
import { kibblePayWallet, PRIZE_VERSION } from '../src/core/wallet.js';
import { HOUSE } from '../src/core/scores.js';
test('prize scores go to kibble-pay as v2: same game id + {v: 2}', async () => {
  const calls = []; const kp = { submitScore: async (...a) => { calls.push(a); return { ok: true }; } };
  await kibblePayWallet(kp).submitScore('kibble-chomp', 1234, 60000);
  assert.equal(PRIZE_VERSION, 2); assert.deepEqual(calls[0], ['kibble-chomp', 1234, 60000, { v: 2 }]);
});
test('v2 house scores are rescaled and ordered', () => {
  for (const [g, l] of Object.entries(HOUSE)) { assert.equal(l.length, 3, g); assert.ok(l[0][1] > l[1][1] && l[1][1] > l[2][1], g); }
  assert.ok(HOUSE['bone-breaker'][0][1] <= 714, 'breaker house fits classic MAX_SCORE');
});
