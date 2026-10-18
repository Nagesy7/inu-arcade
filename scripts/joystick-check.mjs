// Joystick layout + toggle check (Playwright, phone landscape touch). URL=<site> TAG=<prefix> node scripts/joystick-check.mjs
// 1) every cabinet + hall, joystick off and on, at 667x375 and 750x342: the stick (incl. knob travel) and the d-pad never
//    overlap the playfield canvas; screenshots /workspace/inu-arcade-shots/<TAG>-<game>-<off|on>-<WxH>.png
// Protected preview: STATE=<playwright storageState json with the Vercel share cookie> (or SHARE=<share link>, single-use).
// 2) toggle test via Settings: on -> reload -> still on -> other cabinet still on -> off -> original d-pad back.
import { chromium } from 'playwright';
const U = process.env.URL || 'http://localhost:8140', D = '/workspace/inu-arcade-shots/', TAG = process.env.TAG || 'joystick';
const GAMES = ['kibble-chomp', 'bark-invaders', 'pup-crossing', 'bone-breaker', 'street-sniffer', 'paw-fu-tower'], fails = [], ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails.push(m); };
const inter = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const b = await chromium.launch();
// protected preview: if Vercel's login page shows up, open the SHARE link (sets the bypass cookie) and retry
const nav = async (p, url) => { await p.goto(url); if (process.env.SHARE && /vercel\.com|Login/.test(p.url() + await p.title())) { await p.goto(process.env.SHARE); await p.goto(url); } };
for (const [w, h] of [[667, 375], [750, 342]]) for (const joy of [false, true]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, ...(process.env.STATE ? { storageState: process.env.STATE } : {}) });
  await ctx.addInitScript((j) => localStorage.setItem('inuarcade.settings.v1', JSON.stringify({ joystick: j })), joy);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  for (const g of ['hub', ...GAMES]) {
    await nav(p, U + (g === 'hub' ? '/' : '/' + g)); await p.waitForTimeout(700);
    if (g !== 'hub') { await p.locator('#pad [data-k=start]').tap(); await p.waitForTimeout(500); }
    const r = await p.evaluate(() => { const R = (e) => { if (!e || e.hidden || getComputedStyle(e).display === 'none') return null; const q = e.getBoundingClientRect(); return q.width ? { x: q.x, y: q.y, width: q.width, height: q.height } : null; };
      return { cv: R(document.querySelector('#screen')), joy: R(document.querySelector('#joy')), dpad: [...document.querySelectorAll('.dpad b')].map(R).filter(Boolean), btns: [...document.querySelectorAll('.btns b')].map(R).filter(Boolean), mode: window.__arcade.cab?.mode || 'hall' }; });
    const tag = `${g} ${joy ? 'on' : 'off'} ${w}x${h}`;
    if (joy) { ok(!!r.joy && r.dpad.length === 0, `${tag}: stick shown, d-pad hidden`); const reach = r.joy && { x: r.joy.x - 12, y: r.joy.y - 12, width: r.joy.width + 24, height: r.joy.height + 24 }; // knob can poke 12px past the base
      ok(!inter(reach, r.cv), `${tag}: stick (+knob travel) clear of playfield  stick=${JSON.stringify(reach && [reach.x | 0, reach.y | 0, reach.width | 0, reach.height | 0])} canvas=${[r.cv.x, r.cv.y, r.cv.width, r.cv.height].map((v) => v | 0)}`); }
    else ok(!r.joy && r.dpad.length === 4 && !r.dpad.some((d) => inter(d, r.cv)), `${tag}: original d-pad, clear of playfield`);
    ok(!r.btns.some((d) => inter(d, r.cv)), `${tag}: A/START/BACK clear of playfield (${r.mode})`);
    await p.screenshot({ path: `${D}${TAG}-${g}-${joy ? 'on' : 'off'}-${w}x${h}.png` });
    if (g === 'paw-fu-tower') { // two-button cabinet: B shown and clear; move (stick or d-pad) + tap B at the same time
      const bb = await p.evaluate(() => { const e = document.querySelector('#pad [data-k=b]'); const q = e.getBoundingClientRect(); return getComputedStyle(e).display === 'none' ? null : { x: q.x, y: q.y, width: q.width, height: q.height }; });
      ok(!!bb && !inter(bb, r.cv) && !r.btns.some((d) => !(Math.abs(d.x - bb.x) < 1 && Math.abs(d.y - bb.y) < 1) && inter(d, bb)), `${tag}: B button shown, clear of playfield and other buttons`);
      await p.waitForTimeout(1700); const cdp = await ctx.newCDPSession(p); const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q) => ({ x: q.x, y: q.y, id: q.id })) });
      const S = joy ? { x: r.joy.x + r.joy.width / 2, y: r.joy.y + r.joy.height / 2, id: 0 } : await p.evaluate(() => { const q = document.querySelector('#pad [data-k=right]').getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2, id: 0 }; });
      const B = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, id: 1 }, x0 = await p.evaluate(() => window.__arcade.cab.s.p.x);
      await T('touchStart', [S]); const S2 = joy ? { ...S, x: S.x + 34 } : S; await T('touchMove', [S2]); await p.waitForTimeout(350); await T('touchMove', [S2, B]); await p.waitForTimeout(80); await T('touchMove', [S2]); await p.waitForTimeout(300); await T('touchEnd', []);
      const q = await p.evaluate(() => ({ x: window.__arcade.cab.s.p.x, k: window.__arcade.cab.s.stats.kicks })); ok(q.x > x0 + 5 && q.k >= 1, `${tag}: hold ${joy ? 'stick' : 'd-pad'} right + tap B walks and kicks (x ${x0}->${q.x}, kicks ${q.k})`); await cdp.detach(); }
  }
  ok(errs.length === 0, `${w}x${h} joy ${joy}: no page errors ${errs.join(' | ')}`); await ctx.close();
}
// ---- toggle test (fresh profile, real Settings UI) ----
{ const ctx = await b.newContext({ viewport: { width: 750, height: 342 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, ...(process.env.STATE ? { storageState: process.env.STATE } : {}) }); const p = await ctx.newPage();
  const state = () => p.evaluate(() => ({ body: document.body.classList.contains('joy'), joy: !document.querySelector('#joy').hidden, dpad: getComputedStyle(document.querySelector('.dpad')).display !== 'none', ls: localStorage.getItem('inuarcade.settings.v1') }));
  const shot = (n) => p.screenshot({ path: `${D}${TAG}-toggle-${n}.png` });
  await nav(p, U + '/kibble-chomp'); await p.waitForTimeout(700); let s = await state();
  ok(!s.body && !s.joy && s.dpad && s.ls === null, 'toggle: default OFF, original d-pad, nothing stored'); await shot('1-default-off');
  await p.locator('#b-settings').tap(); await p.waitForTimeout(200); await shot('2-settings-off');
  await p.locator('label.sw').tap(); await p.waitForTimeout(200); await shot('3-settings-on'); s = await state();
  ok(s.body && s.joy && !s.dpad && JSON.parse(s.ls).joystick === true, 'toggle: switch ON shows the stick and saves it');
  await nav(p, p.url()); await p.waitForTimeout(800); s = await state(); ok(s.body && s.joy && !s.dpad, 'toggle: still ON after reload'); await shot('4-reload-on');
  await nav(p, U + '/pup-crossing'); await p.waitForTimeout(700); await p.locator('#pad [data-k=start]').tap(); await p.waitForTimeout(400);
  s = await state(); ok(s.body && s.joy && !s.dpad, 'toggle: ON in another cabinet (Pup Crossing)'); await shot('5-other-cabinet-on');
  await p.locator('#b-settings').tap(); await p.waitForTimeout(200); ok(await p.locator('#set-joy').isChecked(), 'toggle: switch shows ON in the other cabinet');
  await p.locator('label.sw').tap(); await p.waitForTimeout(200); await p.locator('#pclose').tap(); await p.waitForTimeout(200);
  s = await state(); ok(!s.body && !s.joy && s.dpad && JSON.parse(s.ls).joystick === false, 'toggle: switch OFF brings the original d-pad back'); await shot('6-off-original');
  await nav(p, p.url()); await p.waitForTimeout(800); s = await state(); ok(!s.body && !s.joy && s.dpad, 'toggle: still OFF after reload'); await shot('7-reload-off');
  await ctx.close(); }
await b.close(); console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASS'); process.exit(fails.length ? 1 : 0);
