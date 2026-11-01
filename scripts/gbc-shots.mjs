// Handheld layout check + screenshots. URL=<site> TAG=<prefix> node scripts/gbc-shots.mjs
// 390x844 phone portrait, 844x390 phone landscape (rotate overlay), 1440x900 desktop: hall + every cabinet.
// Checks: shell fits the viewport, controls never overlap the screen, toolbar/wallet/🏠 visible and clear of screen + controls,
// pixel-perfect canvas scale on phones, page doesn't scroll. Screenshots -> /workspace/shots/<TAG>-*.png
import { chromium } from 'playwright';
const U = process.env.URL || 'http://localhost:8140', D = process.env.D || '/workspace/shots/', TAG = process.env.TAG || 'arcade-gbc';
const G = ['hub', 'kibble-chomp', 'bark-invaders', 'pup-crossing', 'bone-breaker', 'street-sniffer', 'paw-fu-tower', 'bone-digger', 'pips-big-bark', 'shiba-scuffle'];
const fails = [], ok = (c, m) => { if (!c) { fails.push(m); console.log('FAIL ' + m); } else if (process.env.V) console.log('PASS ' + m); };
const X = (a, b) => a && b && a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
const b = await chromium.launch(); let n = 0;
for (const [name, w, h, touch, dpr] of [['390x844', 390, 844, true, 3], ['375x667', 375, 667, true, 2], ['844x390', 844, 390, true, 3], ['1440x900', 1440, 900, false, 1]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: dpr }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  for (const g of G) {
    await p.goto(U + (g === 'hub' ? '/' : '/' + g + '/')); await p.waitForSelector('#inu-wallet-btn', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(700);
    if (name === '844x390') { const r = await p.evaluate(() => { const e = document.getElementById('rotate'); return getComputedStyle(e).display !== 'none' && document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('#rotate') != null; }); ok(r, `${name} ${g}: rotate overlay covers landscape phone`);
      if (g === 'hub' || g === 'kibble-chomp') { await p.screenshot({ path: `${D}${TAG}-${name}-${g}.png` }); n++; } continue; }
    const r = await p.evaluate(() => { const R = (e) => { if (!e || !e.offsetWidth || getComputedStyle(e).display === 'none') return null; const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; };
      const top = (e) => { const q = e.getBoundingClientRect(), t = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2); return !!t && (t === e || e.contains(t)); };
      const chrome = [...document.querySelectorAll('#bar .tb, #purse')].concat([document.querySelector('#inu-wallet-btn'), document.querySelector('#inu-home')]).filter((e) => e && e.offsetWidth).map((e) => ({ k: e.id || e.className, ...R(e), top: e.id === 'purse' ? true : top(e) }));
      const pads = [...document.querySelectorAll('#pad b')].map((e) => ({ k: e.dataset.k, ...R(e), top: getComputedStyle(e).display === 'none' || top(e) })).filter((q) => q.w);
      return { gbc: R(document.querySelector('#gbc')), stage: R(document.querySelector('#stage')), cv: R(document.querySelector('#screen')), chrome, pads, fit: window.__arcade.fitInfo, scroll: [scrollX, scrollY, document.documentElement.scrollHeight - innerHeight], vw: innerWidth, vh: innerHeight }; });
    const tag = `${name} ${g}`;
    ok(r.gbc.x >= 0 && r.gbc.y >= 0 && r.gbc.x + r.gbc.w <= r.vw + 0.5 && r.gbc.y + r.gbc.h <= r.vh + 0.5, `${tag}: shell fits viewport ${JSON.stringify(r.gbc)}`);
    ok(r.cv.x >= r.stage.x - 0.5 && r.cv.y >= r.stage.y - 0.5 && r.cv.x + r.cv.w <= r.stage.x + r.stage.w + 0.5 && r.cv.y + r.cv.h <= r.stage.y + r.stage.h + 0.5, `${tag}: canvas inside the screen box`);
    ok(Math.abs(r.stage.w / r.stage.h - 10 / 9) < 0.02, `${tag}: screen box is 10:9 (${r.stage.w}x${r.stage.h})`);
    if (name === '390x844') ok(r.fit.exact, `${tag}: pixel-perfect scale (${r.fit.s.toFixed(3)} css px/px)`);
    else if (touch && !r.fit.exact) console.log(`INFO ${tag}: small phone, nearest-neighbour fit ${r.fit.s.toFixed(3)}`);
    for (const q of r.pads) { ok(!X(q, r.stage), `${tag}: ${q.k} clear of screen`); ok(q.top, `${tag}: ${q.k} tappable`); for (const o of r.pads) if (o !== q) ok(!X(q, o), `${tag}: ${q.k} vs ${o.k} no overlap`); }
    for (const c of r.chrome) { ok(c.top, `${tag}: ${c.k} visible/clickable`); ok(!X(c, r.stage), `${tag}: ${c.k} clear of screen`); for (const q of r.pads) ok(!X(c, q), `${tag}: ${c.k} clear of ${q.k}`); ok(c.y + c.h <= r.vh + 0.5 && c.x + c.w <= r.vw + 0.5, `${tag}: ${c.k} on screen`); }
    ok(r.chrome.some((c) => c.k === 'inu-wallet-btn') && r.chrome.some((c) => c.k === 'inu-home'), `${tag}: wallet + 🏠 present`);
    ok(r.scroll.join() === '0,0,0', `${tag}: no scroll (${r.scroll})`);
    await p.screenshot({ path: `${D}${TAG}-${name}-${g}.png` }); n++;
    if (g !== 'hub' && ['390x844', '1440x900'].includes(name)) { // gameplay: START (on-screen pill) begins play; hold right + A together (multi-touch on phones)
      if (touch) await p.locator('#pad [data-k=start]').tap(); else await p.locator('#pad [data-k=start]').click(); await p.waitForTimeout(1800);
      ok(await p.evaluate(() => window.__arcade.cab.mode === 'play'), `${tag}: START pill starts play`);
      if (touch) { const cdp = await ctx.newCDPSession(p); const c = async (k) => { const q = await p.locator(`#pad [data-k=${k}]`).boundingBox(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; };
        const R = await c('right'), A_ = await c('a'); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...R, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...R, id: 1 }, { ...A_, id: 2 }] });
        await p.waitForTimeout(60); const held = await p.evaluate(() => [...window.__arcade.input.held].sort().join('+')); ok(held === 'a+right', `${tag}: d-pad + A held together (${held})`);
        await p.waitForTimeout(400); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      await p.screenshot({ path: `${D}${TAG}-${name}-${g}-play.png` }); n++; }
  }
  ok(!errs.length, `${name}: no page errors ${errs.join(' | ')}`); await ctx.close();
}
await b.close(); console.log(`${n} screens, ${fails.length ? fails.length + ' FAILED' : 'ALL PASS'}`); process.exit(fails.length ? 1 : 0);
