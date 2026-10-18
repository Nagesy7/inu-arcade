import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
// docs/ROSTER.md standing RULE: no source-game identifiers in code, tests or docs. The banned words are assembled from parts
// so this guard itself does not show up in the originality grep.
const BANNED = [['\\b[pP]', 'ac(?!k)'], ['[a-z][P]', 'ac\\b'], ['P', 'AC_'], ['_P', 'AC\\b'], ['bli', 'nky'], ['el', 'roy'], ['wa', 'ka'], ['eat', 'Ghost'], ['ghost', 'Wall'], ['ali', 'en'], ['sq', 'uid'], ['\\bcr', 'ab\\b'], ['\\boc', 'to\\b'], ['\\bu', 'fo\\b']].map(([a, b]) => new RegExp(a + b, 'i'));
const files = ['README.md', 'scripts/e2e.mjs', ...readdirSync('src/games').map((f) => 'src/games/' + f), ...readdirSync('src/core').map((f) => 'src/core/' + f), 'src/main.js', 'src/ui.js', ...readdirSync('tests').map((f) => 'tests/' + f)];
test('originality: no source-game identifiers left in source, tests, README or e2e', () => {
  for (const f of files) { const t = readFileSync(f, 'utf8'); for (const re of BANNED) assert.ok(!re.test(t), `${f} matches ${re}`); }
});
test('Bark Invaders lives in src/games/bark.js; public id, route and title unchanged', async () => {
  assert.ok(existsSync('src/games/bark.js') && !existsSync('src/games/in' + 'vaders.js'));
  const B = await import('../src/games/bark.js'); assert.equal(B.META.id, 'bark-invaders'); assert.equal(B.META.title, 'BARK INVADERS');
  assert.deepEqual(B.ROW_TYPE, ['drone', 'rug', 'rug', 'bear', 'bear']); assert.equal(B.create(1).fleet.length, 43);
  assert.ok(existsSync('bark-invaders/index.html'));
});
