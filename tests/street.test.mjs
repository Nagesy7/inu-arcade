import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../src/games/street.js';
import * as C from '../src/games/chomp.js';
import { joyMode, JOY_MODES } from '../src/core/joystick.js';
const F = 1 / 60;
const at = (o, x, y) => { o.x = x * 8 + 4; o.y = y * 8 + 4; };
// a live round with no traffic and every cat parked in the cafe, so each rule can be tested on its own
function quiet(opts) { const s = G.create(1, opts); s.ready = 0; s.cars = []; s.roundF = 600; for (const c of s.cats) { c.state = 'house'; c.x = 128; c.y = 108; } return s; }
const run = (s, n, inp = {}) => { for (let i = 0; i < n && !s.over; i++) G.step(s, F, inp); };

test('street sniffer: name lives in one constant; META/route/size', () => {
  assert.equal(G.META.id, 'street-sniffer'); assert.equal(G.META.title, G.NAME.toUpperCase()); assert.equal(G.W, 256); assert.equal(G.H, 256);
  assert.equal(G.MAP.length, G.ROWS); for (const r of G.MAP) assert.equal(r.length, G.COLS);
  const src = readFileSync('src/games/street.js', 'utf8'); assert.equal((src.match(/'Street Sniffer'/g) || []).length, 1, 'player-facing name is written once');
  assert.match(readFileSync('street-sniffer/index.html', 'utf8'), /og\/street-sniffer\.png/);
});
test('street sniffer: original city map, not the Kibble Chomp maze', () => {
  const a = G.MAP.join('\n'); assert.notEqual(a, C.MAZE.join('\n')); assert.ok(G.COLS !== C.COLS && G.ROWS !== C.ROWS, 'different grid');
  const S = G.SPOTS; assert.ok(S.bins.length >= 4 && S.hydrants.length >= 3 && S.power.length >= 3, 'bins, hydrants and power spots placed');
  for (const av of G.AVENUES) assert.ok(/^#=+#$/.test(G.MAP[av.row]), 'avenues run curb to curb');
  assert.ok(/[<>^v]/.test(a), 'one-way alleys exist'); const s = G.create(1); assert.ok(s.total > 200, `plenty of kibble (${s.total})`);
});
test('one-way alleys: dog and cats can only travel with the arrows', () => {
  // row 3 x2..5 is an eastbound '>' alley; column 13 rows 2..4 is a southbound 'v' alley
  assert.ok(G.canMove(3, 3, 'right')); assert.ok(!G.canMove(3, 3, 'left'), 'cannot go west in an eastbound alley');
  assert.ok(!G.canMove(6, 3, 'left'), 'cannot enter an eastbound alley from its exit'); assert.ok(G.canMove(1, 3, 'right'), 'can enter at its mouth');
  assert.ok(G.canMove(13, 1, 'down') && !G.canMove(13, 5, 'up'), 'southbound alley only entered from the north');
  const s = quiet(); at(s.dog, 4, 3); s.dog.dir = 'right'; s.dog.want = 'left'; run(s, 20, { left: true }); assert.ok(s.dog.x > 4 * 8 + 4, 'dog cannot U-turn inside an alley');
});
test('bins: dog hides, cats lose track, bin cools down; leaving needs a fresh press', () => {
  const s = quiet(); const b = G.SPOTS.bins[0]; at(s.dog, b.x, b.y - 1); s.dog.dir = 'down'; s.dog.want = 'down'; run(s, 10, { down: true });
  assert.ok(s.dog.hidden > 0, 'hidden in the bin'); assert.equal(s.stats.hides, 1);
  run(s, 5, { down: true }); assert.ok(s.dog.hidden > 0, 'still holding the old direction does not pop you out');
  const c = s.cats[0]; c.state = 'out'; at(c, b.x, b.y); run(s, 1, { down: true }); assert.ok(s.dog.hidden > 0 && !s.dying, 'a cat on the bin tile cannot catch a hidden dog');
  assert.deepEqual(G.catTarget(s, c), G.BEDS[0], 'cats lose track and patrol while you hide'); c.state = 'house'; c.x = 128; c.y = 108; run(s, 2);
  const go = ['left', 'right', 'up', 'down'].find((d) => G.canMove(b.x, b.y, d)); run(s, 1, { [go]: true }); assert.equal(s.dog.hidden, 0, 'fresh press leaves the bin');
  run(s, 30, { [go]: true }); const back = { left: 'right', right: 'left', up: 'down', down: 'up' }[go]; run(s, 40, { [back]: true });
  assert.equal(s.stats.hides, 1, 'bin is on cooldown'); assert.ok(s.binCd[b.x + ',' + b.y] > 0);
  const t = quiet(); at(t.dog, b.x, b.y - 1); t.dog.dir = 'down'; t.dog.want = 'down'; run(t, 10, { down: true }); run(t, Math.round(G.binSecs(1) * 60) + 2);
  assert.equal(t.dog.hidden, 0, 'lid pops when the timer ends'); assert.ok(t.dog.parked, 'dog waits for a direction instead of running into traffic');
});
test('hydrant splash soaks cats in the spray for +200 and sends them home', () => {
  const s = quiet(); const h = G.SPOTS.hydrants.find((q) => q.x === 6 && q.y === 1); at(s.dog, 4, 1); s.dog.dir = 'right'; s.dog.want = 'right';
  const c = s.cats[1]; c.state = 'out'; at(c, 10, 1); c.dir = 'left'; const sc = s.score; run(s, 18, { right: true });
  assert.ok(h && s.stats.soaked === 1 && c.eyes, 'cat soaked'); assert.ok(s.score >= sc + G.PTS.soak); assert.ok(G.sprayTiles(6, 1, 'right').length === G.SPRAY.len + 1);
});
test('squeaky toy lure: cats head for it and sit harmlessly', () => {
  const s = quiet(); at(s.dog, 15, 5); s.dog.dir = 'left'; s.power = { x: 15, y: 5, kind: 'toy', f: 600 }; s.dog.x += 1; run(s, 2, { left: true });
  assert.ok(s.lure, 'lure placed'); at(s.dog, 20, 5); s.dog.dir = 'right'; s.dog.want = 'right'; const c = s.cats[0]; c.state = 'out'; at(c, 11, 5); c.dir = 'right';
  assert.deepEqual(G.catTarget(s, c), { x: s.lure.x, y: s.lure.y }, 'cats target the toy'); run(s, 60, { right: true }); assert.ok(c.sit, 'cat sits at the toy'); at(s.dog, s.lure.x, s.lure.y); run(s, 1); assert.ok(!s.dying, 'a sitting cat is harmless');
});
test('scooter dash: faster, car-immune, bumping a cat stuns it', () => {
  const s = quiet(); const base = G.dogSpeed(s); s.power = { x: 14, y: 5, kind: 'scooter', f: 600 }; at(s.dog, 15, 5); s.dog.dir = 'left'; s.dog.want = 'left'; run(s, 10, { left: true });
  assert.ok(s.dash > 0 && G.dogSpeed(s) > base, 'dashing'); const c = s.cats[2]; c.state = 'out'; c.x = s.dog.x - 2; c.y = s.dog.y; c.dir = 'right'; run(s, 1);
  assert.ok(!s.dying && c.stun > 0, 'cat bumped and stunned'); at(s.dog, 3, 9); s.cars = [{ lane: 0, x: 22, acc: 0, len: 16, kind: 0 }]; run(s, 1); assert.ok(!s.dying, 'scooter shrugs off traffic');
});
test('traffic: cars knock the dog out, honk cats home, telegraph and speed up with level', () => {
  const s = quiet(); at(s.dog, 5, 9); s.dog.dir = 'up'; s.cars = [{ lane: 0, x: 34, acc: 0, len: 16, kind: 0 }]; run(s, 1); assert.ok(s.dying && s.lastDeath === 'car', 'car hits dog');
  const t = quiet(); at(t.dog, 1, 21); const c = t.cats[3]; c.state = 'out'; at(c, 20, 17); t.cars = [{ lane: 1, x: 158, acc: 0, len: 16, kind: 1 }]; run(t, 1); assert.ok(c.eyes && t.stats.honks === 1, 'car honks a cat home');
  assert.ok(G.carNear(t, 10, 17, 3) === false && G.carNear(t, 18, 17, 3), 'carNear looks up-traffic'); assert.ok(G.carSpeed(5, 0) > G.carSpeed(1, 0) && G.carCount(5) > G.carCount(1));
});
test('own tables: speeds, timers and level progression', () => {
  assert.ok(G.speeds(1).cat < G.speeds(1).dog && G.speeds(6).cat > G.speeds(1).cat); assert.ok(G.lureSecs(8) < G.lureSecs(1) && G.binSecs(8) < G.binSecs(1));
  assert.ok(G.moodTable(5)[0] < G.moodTable(1)[0]); assert.ok(G.releaseAt(5)[3] < G.releaseAt(1)[3]); assert.equal(G.clearBonus(1), 300);
  const s = quiet(); s.kibble = new Set(['1,5']); s.total = 1; at(s.dog, 1, 4); s.dog.dir = 'down'; s.dog.want = 'down'; run(s, 12, { down: true }); run(s, 130);
  assert.equal(s.level, 2, 'clearing the city loads the next one'); assert.ok(s.kibble.size > 200);
});
test('inu mode: power-ups go in the pocket (A to use), $KIBBLE coins appear; classic fires at once', () => {
  const s = quiet({ inu: true }); s.power = { x: 14, y: 5, kind: 'toy', f: 600 }; at(s.dog, 15, 5); s.dog.dir = 'left'; s.dog.want = 'left'; run(s, 10, { left: true });
  assert.equal(s.pocket, 'toy'); assert.ok(!s.lure); run(s, 1, { a: true }); assert.ok(s.lure && !s.pocket && s.stats.pockets === 1);
  const k = quiet(); k.power = { x: 14, y: 5, kind: 'toy', f: 600 }; at(k.dog, 15, 5); k.dog.dir = 'left'; k.dog.want = 'left'; run(k, 10, { left: true }); assert.ok(k.lure && !k.pocket);
  const c = quiet({ inu: true }); c.eaten = G.COIN.at[0] - 1; c.kibble.add('12,5'); at(c.dog, 13, 5); c.dog.dir = 'left'; c.dog.want = 'left'; run(c, 10, { left: true }); assert.ok(c.coin, 'coin spawned');
});
test('bot plays a full round without errors and scores', () => {
  for (const inu of [false, true]) { const s = G.create(3, { inu }); for (let i = 0; i < 60 * 90 && !s.over; i++) G.step(s, F, G.bot(s)); assert.ok(s.score > 500, `scored ${s.score}`); }
});
test('joystick: Street Sniffer uses the 4-way stick in play', () => {
  assert.equal(JOY_MODES['street-sniffer'], '4way'); assert.equal(joyMode('street-sniffer', true), '4way'); assert.equal(joyMode('street-sniffer', false), '4way');
});
test('cat personalities are shared with Kibble Chomp (one module), not copied', () => {
  for (const f of ['src/games/street.js', 'src/games/chomp.js']) assert.match(readFileSync(f, 'utf8'), /from '\.\.\/core\/cats\.js'/);
});
