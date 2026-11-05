import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
const js = fs.readFileSync('cups/cups.js', 'utf8'), html = fs.readFileSync('cups/index.html', 'utf8'), vj = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
test('cups page: reads only the kibble-pay bracket API (allowlisted), never decides winners or invents data', () => {
  assert.match(js, /\/api\/tournaments/); assert.match(js, /kibble-pay\\\.vercel\\\.app/); assert.match(js, /127\\\.0\\\.0\\\.1/);
  for (const op of ['create', 'publish', 'close-signup', 'resolve', 'advance', 'flag-resolve', 'stg-run']) assert.ok(!js.includes(`op: '${op}'`), `page must not call admin op ${op}`);
  assert.match(js, /No cups yet/); assert.match(js, /couldn't load/); assert.ok(!/Math\.random/.test(js), 'no fake data');
});
test('cups page: free entry, skill only; no $KIBBLE rewards, wagers or fees; no coin flips', () => {
  assert.match(js, /no \$KIBBLE, wagers or fees/); assert.match(js, /No coin flips/); assert.ok(!/wager:|entryFee|stake/i.test(js.replace(/no \$KIBBLE, wagers or fees/g, '')));
});
test('cups page: escapes API strings; /tournaments alias; landscape-first (no rotate gate)', () => {
  assert.match(js, /const esc = /); assert.ok(!/innerHTML = [^;]*\$\{t\.title\}/.test(js));
  assert.ok(vj.rewrites.some((r) => r.source === '/tournaments' && r.destination === '/cups')); assert.ok(!html.includes('id="rotate"'));
});
