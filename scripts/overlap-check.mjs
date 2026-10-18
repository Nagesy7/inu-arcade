// Toolbar vs kibble-pay Connect Wallet / 🏠 overlap check. URL=<site> TAG=<prefix> node scripts/overlap-check.mjs
// At desktop 1280x800 and phone landscape 667x375 / 750x342 (hall + every cabinet, joystick off and on for phones):
// every toolbar button, the wallet button and 🏠 are each the top element at their own centre (visible + tappable),
// none of them overlap each other, and none of them cover the playfield canvas. Screenshots -> /workspace/inu-arcade-shots/.
import { chromium } from 'playwright';
const U = process.env.URL || 'http://localhost:8140', D = '/workspace/inu-arcade-shots/', TAG = process.env.TAG || 'overlap';
const fails = [], ok = (c, m) => { if (!c) { fails.push(m); console.log('FAIL ' + m); } else if (process.env.V) console.log('PASS ' + m); };
const VPS = [['desktop', 1280, 800, false], ['667x375', 667, 375, true], ['750x342', 750, 342, true]];
const b = await chromium.launch(); let n = 0;
for (const [name, w, h, touch] of VPS) for (const joy of touch ? [false, true] : [false]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  await ctx.addInitScript((j) => localStorage.setItem('inuarcade.settings.v1', JSON.stringify({ joystick: j })), joy);
  const p = await ctx.newPage();
  for (const g of ['hub', 'kibble-chomp', 'bark-invaders', 'pup-crossing', 'bone-breaker', 'street-sniffer', 'paw-fu-tower', 'bone-digger', 'pips-big-bark']) {
    await p.goto(U + (g === 'hub' ? '/' : '/' + g)); await p.waitForSelector('#inu-wallet-btn', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const R = (e) => { const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; };
      const items = [...document.querySelectorAll('#bar .tb')].map((e) => ['bar:' + e.id, e]).concat([['wallet', document.querySelector('#inu-wallet-btn')], ['home', document.querySelector('#inu-home')]]).filter(([, e]) => e && e.offsetWidth);
      const out = items.map(([k, e]) => { const q = R(e), top = document.elementFromPoint(q.x + q.w / 2, q.y + q.h / 2); return { k, ...q, top: !!top && (top === e || e.contains(top)) }; });
      const pads = [...document.querySelectorAll('#pad b, #joy')].filter((e) => e.offsetWidth && getComputedStyle(e).display !== 'none' && !e.hidden).map(R);
      return { items: out, cv: R(document.querySelector('#screen')), pads, purse: R(document.querySelector('#purse')) }; });
    const X = (a, b2) => a.x < b2.x + b2.w - 0.5 && b2.x < a.x + a.w - 0.5 && a.y < b2.y + b2.h - 0.5 && b2.y < a.y + a.h - 0.5;
    const tag = `${name}${touch ? (joy ? ' joy' : ' pad') : ''} ${g}`;
    ok(r.items.some((i) => i.k === 'wallet') && r.items.some((i) => i.k === 'home'), `${tag}: Connect Wallet + 🏠 present`);
    for (const i of r.items) { ok(i.top, `${tag}: ${i.k} visible/clickable (not covered)`); ok(!X(i, r.cv), `${tag}: ${i.k} clear of playfield`); for (const pd of r.pads) ok(!X(i, pd), `${tag}: ${i.k} clear of touch controls`); }
    for (let a = 0; a < r.items.length; a++) for (let c = a + 1; c < r.items.length; c++) ok(!X(r.items[a], r.items[c]), `${tag}: ${r.items[a].k} vs ${r.items[c].k} no overlap`);
    ok(!X(r.purse, r.cv), `${tag}: purse clear of playfield`);
    if (g === 'hub' || g === 'kibble-chomp') await p.screenshot({ path: `${D}${TAG}-${name}${touch ? (joy ? '-joy' : '-pad') : ''}-${g}.png` }); n++;
  }
  await ctx.close();
}
await b.close(); console.log(`${n} screens, ${fails.length ? fails.length + ' FAILED' : 'ALL PASS'}`); process.exit(fails.length ? 1 : 0);
