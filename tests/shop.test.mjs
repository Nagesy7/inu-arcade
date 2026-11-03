// Optional Kibble Pay shop link + results nudge (spec: discover/game-specs.md). Link presence, banned words, wallet-free analytics.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as SHOP from '../src/core/shop.js';
const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const html = read('index.html'), ui = read('src/ui.js'), main = read('src/main.js');

test('exact copy and URLs from the spec', () => {
  assert.equal(SHOP.COPY.shop, '🛍️ Shop'); assert.equal(SHOP.COPY.shopTitle, 'Optional cosmetics. $KIBBLE is never needed to play.');
  assert.equal(SHOP.COPY.devs, '🛠️ For devs');
  assert.equal(SHOP.COPY.nudge, 'Like your look? Outfits, pets and cars for every Inu game are in the Kibble Pay shop. Optional, and never needed to play.');
  assert.equal(SHOP.COPY.visit, 'Visit the shop →'); assert.equal(SHOP.COPY.notNow, 'Not now');
  assert.equal(SHOP.SHOP_URL, 'https://kibbleinu.com/pay?utm_source=inu-arcade&utm_medium=menu#shop-h');
  assert.equal(SHOP.SHOP_RESULTS_URL, 'https://kibbleinu.com/pay?utm_source=inu-arcade&utm_medium=results#shop-h');
  assert.equal(SHOP.DEVS_URL, 'https://kibbleinu.com/for-devs.html?utm_source=inu-arcade&utm_medium=menu');
});

test('shop link is in the toolbar: new tab, noopener, tooltip copy, after the other toolbar buttons', () => {
  const a = html.match(/<a class="tb" id="b-shop"[^>]*>[^\n]*<\/a>/)?.[0]; assert.ok(a, 'link present');
  assert.match(a, /href="https:\/\/kibbleinu\.com\/pay\?utm_source=inu-arcade&amp;utm_medium=menu#shop-h"/);
  assert.match(a, /target="_blank"/); assert.match(a, /rel="noopener"/); assert.match(a, /title="Optional cosmetics\. \$KIBBLE is never needed to play\."/);
  assert.match(a, />🛍️<span class="lbl"> Shop<\/span><\/a>/);
  assert.ok(html.indexOf('id="b-shop"') > html.indexOf('id="b-mute"') && html.indexOf('id="b-shop"') < html.indexOf('id="purse"'));
  assert.match(main, /\$\('#b-shop'\)\?\.addEventListener\('click', \(\) => SHOP\.trackClick\('shop', 'inu-arcade-menu'\)\)/);
});

test('results nudge: once per session, skipped on event-complete, new tab + noopener, Not now', () => {
  assert.match(ui, /const nudge = !r\.event && !SHOP\.nudgeSeen\(\); if \(nudge\) SHOP\.markNudge\(\);/);
  assert.match(ui, /id="r-shop" href="\$\{SHOP\.SHOP_RESULTS_URL\}" target="_blank" rel="noopener"/); assert.match(ui, /id="r-nudge-no"/);
  assert.match(ui, /SHOP\.trackClick\('shop', 'inu-arcade-results'\)/);
  assert.ok(ui.indexOf('id="r-nudge"') < ui.indexOf('id="r-again"'), 'nudge above Play again');
  const m = new Map(), ss = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
  assert.equal(SHOP.nudgeSeen(ss), false); SHOP.markNudge(ss); assert.equal(SHOP.nudgeSeen(ss), true); assert.equal(m.get('inu.shopNudge'), '1');
  assert.equal(SHOP.nudgeSeen({ getItem() { throw new Error('blocked'); } }), true, 'storage blocked -> never nag');
});

test('new copy has no banned words (urgency, prize, price promises)', () => {
  for (const [k, v] of Object.entries(SHOP.COPY)) assert.ok(!SHOP.BANNED.test(v), `${k}: ${v}`);
  assert.equal(SHOP.BANNED.source, "hurry|limited|last chance|don't miss|guarantee|moon|profit|prize");
  assert.ok(SHOP.BANNED.test('Prize!') && SHOP.BANNED.test("Don't miss"));
});

test('analytics: exact event, wallet-free props, no-op without va', () => {
  const calls = []; const w = { va: (...a) => calls.push(a) };
  SHOP.trackClick('shop', 'inu-arcade-menu', w); SHOP.trackClick('shop', 'inu-arcade-results', w); SHOP.trackClick('for-devs', 'inu-arcade-menu', w);
  assert.deepEqual(calls[0], ['event', { name: 'paid_link_click', data: { product: 'shop', from: 'inu-arcade-menu', site: 'inu-arcade' } }]);
  assert.deepEqual(calls[1][1].data, { product: 'shop', from: 'inu-arcade-results', site: 'inu-arcade' });
  for (const [, e] of calls) { assert.deepEqual(Object.keys(e.data).sort(), ['from', 'product', 'site']); assert.ok(!/wallet|mint|name|score|addr/i.test(JSON.stringify(e.data))); }
  assert.doesNotThrow(() => SHOP.trackClick('shop', 'inu-arcade-menu', {})); assert.doesNotThrow(() => SHOP.trackClick('shop', 'inu-arcade-menu', undefined));
  assert.doesNotThrow(() => SHOP.trackClick('shop', 'inu-arcade-menu', { va() { throw new Error('x'); } }));
});
