// Optional shop link + results nudge, in a real browser. URL=<site> node scripts/shop-check.mjs
// Toolbar 🛍️ Shop link (new tab, noopener, tooltip, analytics), no overlap with wallet pill / 🏠 / toolbar / joystick / pad / canvas at
// 390x844, 844x390 and desktop, gamepad focus ring reaches it (L1/R1), results nudge once per session (Not now / Visit), never on the
// Daily-Event-complete screen. Screenshots -> /workspace/inu-arcade-shots/preview-*.png (SHOTS=0 to skip).
import { chromium } from 'playwright'; import { mkdirSync } from 'node:fs';
const U = (process.env.URL || 'http://localhost:8140').replace(/\/$/, ''), D = '/workspace/inu-arcade-shots/', SHOTS = process.env.SHOTS !== '0'; mkdirSync(D, { recursive: true });
let fail = 0, pass = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (c) pass++; else fail++; };
const SHOP_MENU = 'https://kibbleinu.com/pay?utm_source=inu-arcade&utm_medium=menu#shop-h', SHOP_RES = 'https://kibbleinu.com/pay?utm_source=inu-arcade&utm_medium=results#shop-h';
const INIT = () => { window.__va = []; window.va = (...a) => window.__va.push(JSON.parse(JSON.stringify(a)));
  const pads = [null]; const mk = (id) => ({ id, index: 0, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] });
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => pads.slice() }); const fire = (t, g) => { const e = new Event(t); Object.defineProperty(e, 'gamepad', { value: g }); dispatchEvent(e); };
  window.__pad = { connect(id) { pads[0] = mk(id); fire('gamepadconnected', pads[0]); }, btn(b, on) { pads[0].buttons[b] = { pressed: on, value: on ? 1 : 0 }; } }; };
const b = await chromium.launch();
const X = (a, c) => a && c && a.x < c.x + c.width - 0.5 && c.x < a.x + a.width - 0.5 && a.y < c.y + c.height - 0.5 && c.y < a.y + a.height - 0.5;
async function page(opts = {}) { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts }); await ctx.addInitScript(INIT);
  await ctx.route(/^https:\/\/kibbleinu\.com\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>shop stub</title>' })); // never hit the real shop from tests
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e))); return { ctx, p, errs }; }
const R = (p) => p.evaluate(() => { const r = (q) => { const e = document.querySelector(q); if (!e || !e.offsetWidth || e.hidden) return null; const z = e.getBoundingClientRect(); return { x: z.x, y: z.y, width: z.width, height: z.height }; };
  const s = document.querySelector('#b-shop'), z = s.getBoundingClientRect(), top = document.elementFromPoint(z.x + z.width / 2, z.y + z.height / 2);
  return { shop: r('#b-shop'), wallet: r('#inu-wallet-btn'), home: r('#inu-home'), legal: r('#inu-legal'), badge: r('.inu-profile-badge'), joy: r('#joy'), pad: r('#pad'), cv: r('#screen'), dpad: r('#pad .dpad'), btns: r('#pad .btns'),
    others: [...document.querySelectorAll('#bar .tb:not(#b-shop), #purse')].map((e) => { const q = e.getBoundingClientRect(); return { id: e.id, x: q.x, y: q.y, width: q.width, height: q.height }; }), onTop: !!top?.closest?.('#b-shop'),
    inView: z.top >= 0 && z.bottom <= innerHeight && z.left >= 0 && z.right <= innerWidth }; });
const press = async (p, btn) => { await p.evaluate((x) => window.__pad.btn(x, true), btn); await p.waitForTimeout(90); await p.evaluate((x) => window.__pad.btn(x, false), btn); await p.waitForTimeout(90); };
const st = (p) => p.evaluate(() => ({ cab: window.__arcade.cab?.mode, panel: !document.querySelector('#panel').hidden && document.querySelector('#panel').dataset.kind, nudge: !!document.querySelector('#r-nudge'), va: window.__va }));
async function runToResults(p, g, score = 300) { await p.evaluate((g) => { history.pushState({}, '', '/' + g); dispatchEvent(new PopStateEvent('popstate')); }, g); await p.waitForTimeout(400);
  await p.evaluate(() => { window.__arcade.cab.gmode = 'classic'; }); await p.keyboard.press('Space'); await p.waitForTimeout(300);
  await p.evaluate((n) => { const c = window.__arcade.cab.s; c.score = n; c.over = true; c.unranked = false; }, score); await p.waitForTimeout(2800); await p.keyboard.press('Enter'); await p.waitForTimeout(500); }

// ---------- toolbar link at three sizes, overlap, joystick on/off ----------
const VPS = [{ name: '390x844', o: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, shot: 'preview-shop-hall-390x844.png' },
  { name: '844x390', o: { viewport: { width: 844, height: 390 } }, shot: 'preview-shop-hall-844x390.png' }, { name: 'desktop', o: { viewport: { width: 1440, height: 900 } }, shot: 'preview-shop-hall-desktop.png' }];
for (const vp of VPS) { const { ctx, p, errs } = await page(vp.o); await p.goto(U + '/'); await p.waitForTimeout(2500);
  const a = await p.evaluate(() => { const e = document.querySelector('#b-shop'); return e && { href: e.href, target: e.target, rel: e.rel, title: e.title, text: e.textContent.trim() }; });
  ok(a && a.href === SHOP_MENU && a.target === '_blank' && /noopener/.test(a.rel) && a.title === 'Optional cosmetics. $KIBBLE is never needed to play.' && a.text === '🛍️ Shop', `${vp.name}: 🛍️ Shop link in the toolbar (${a?.href})`);
  for (const joy of [false, true]) { await p.evaluate((j) => window.__arcade.setJoystick(j), joy); await p.waitForTimeout(300); const r = await R(p); const tag = `${vp.name} joystick ${joy ? 'on' : 'off'}`;
    const hit = ['wallet', 'home', 'legal', 'badge', 'joy', 'pad', 'cv'].filter((k) => X(r.shop, r[k])).concat(r.others.filter((o) => X(r.shop, o)).map((o) => o.id));
    ok(r.shop && r.onTop && r.inView && !hit.length, `${tag}: shop link visible, on top, clear of wallet pill / 🏠 / legal / badge / joystick / pad / screen / other toolbar buttons${hit.length ? ' HITS ' + hit.join(',') : ''}`);
    const barHit = ['wallet', 'home', 'legal', 'joy', 'dpad', 'btns'].filter((k) => r.others.some((o) => X(o, r[k])));
    const off = r.others.filter((o) => o.y < 0 || o.y + o.height > (vp.o.viewport.height) + 0.5).map((o) => o.id); barHit.push(...off); ok(!barHit.length, `${tag}: toolbar (with the extra link) on screen and clear of wallet pill / 🏠 / legal strip / joystick / pad${barHit.length ? ' HITS ' + barHit.join(',') : ''}`); }
  await p.evaluate(() => window.__arcade.setJoystick(false)); await p.waitForTimeout(200);
  if (SHOTS) { if (vp.name === 'desktop') await p.hover('#b-shop'); await p.screenshot({ path: D + vp.shot }); }
  const [tab] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), p.click('#b-shop')]); await p.waitForTimeout(200);
  const va = (await st(p)).va; ok(tab && tab.url() === SHOP_MENU && p.url().startsWith(U), `${vp.name}: click opens the shop in a new tab, arcade stays put (${tab?.url()})`);
  ok(va.length === 1 && JSON.stringify(va[0]) === JSON.stringify(['event', { name: 'paid_link_click', data: { product: 'shop', from: 'inu-arcade-menu', site: 'inu-arcade' } }]), `${vp.name}: analytics event ${JSON.stringify(va[0])}`);
  await tab?.close(); ok(errs.length === 0, `${vp.name}: no page errors (${errs.join(' | ')})`); await ctx.close(); }

// ---------- no va at all: clicking is a no-op, no errors ----------
{ const ctx = await b.newContext({ viewport: { width: 1280, height: 760 } }); await ctx.route(/^https:\/\/kibbleinu\.com\//, (r) => r.fulfill({ status: 200, body: 'stub' })); await ctx.route(/\/_vercel\//, (r) => r.abort());
  await ctx.addInitScript(() => { Object.defineProperty(window, 'va', { configurable: true, get: () => undefined, set() {} }); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e))); await p.goto(U + '/?demo=1'); await p.waitForTimeout(1200);
  const [tab] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), p.click('#b-shop')]); await p.waitForTimeout(200);
  ok(!!tab && errs.length === 0, `window.va missing: link still opens, no errors (${errs.join(' | ')})`); await ctx.close(); }

// ---------- gamepad focus ring reaches the link ----------
{ const { ctx, p, errs } = await page({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); await p.goto(U + '/?demo=1'); await p.waitForTimeout(1500);
  await p.evaluate(() => window.__pad.connect('Xbox Wireless Controller')); await p.waitForTimeout(200); const x0 = await p.evaluate(() => window.__arcade.lobby.x); let found = false;
  for (let i = 0; i < 14 && !found; i++) { await press(p, 5); found = await p.evaluate(() => document.activeElement?.id === 'b-shop'); }
  const ring = await p.evaluate(() => { const e = document.activeElement; return e.classList.contains('gp-focus') && getComputedStyle(e).outlineStyle !== 'none'; });
  ok(found && ring, 'gamepad: RB moves a visible focus ring along the toolbar to 🛍️ Shop');
  const [tab] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), press(p, 0)]); await p.waitForTimeout(200);
  const s = await st(p); ok(tab && tab.url() === SHOP_MENU && s.va.at(-1)?.[1]?.data?.from === 'inu-arcade-menu', `gamepad: A on the focused link opens the shop tab + analytics (${tab?.url()})`);
  ok(Math.abs((await p.evaluate(() => window.__arcade.lobby.x)) - x0) < 1 && !(await p.evaluate(() => window.__arcade.scene !== 'lobby')), 'gamepad: toolbar presses never reach the hall (Shiba did not move or enter a cabinet)');
  await press(p, 5); await press(p, 1); ok(await p.evaluate(() => !document.querySelector('#bar .gp-focus') && window.__arcade.barFocus === -1), 'gamepad: B leaves the toolbar');
  await tab?.close(); ok(errs.length === 0, `gamepad: no page errors (${errs.join(' | ')})`); await ctx.close(); }

// ---------- results nudge ----------
{ const { ctx, p, errs } = await page({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); await p.goto(U + '/?demo=1'); await p.waitForTimeout(1500);
  const ev = await p.evaluate(() => window.__arcade.todayEvent()); const g = ev.game === 'bone-breaker' ? 'pup-crossing' : 'bone-breaker';
  await runToResults(p, g); let s = await st(p); const txt = await p.evaluate(() => document.querySelector('#r-nudge')?.innerText || '');
  ok(s.panel === 'results' && s.nudge && txt.includes('Like your look? Outfits, pets and cars for every Inu game are in the Kibble Pay shop. Optional, and never needed to play.') && /Visit the shop →/.test(txt) && /Not now/.test(txt), 'nudge: first results screen of the session shows the exact copy + Visit the shop → / Not now');
  const order = await p.evaluate(() => { const y = (q) => document.querySelector(q).getBoundingClientRect().top; const sc = [...document.querySelectorAll('#pbody b')].find((e) => /^\d+$/.test(e.textContent)); return [sc.getBoundingClientRect().top, y('#r-nudge'), y('#r-again')]; });
  ok(order[0] < order[1] && order[1] < order[2], `nudge: below the score, above Play again (${order.map((v) => v | 0).join(' < ')})`);
  const lk = await p.evaluate(() => { const a = document.querySelector('#r-shop'); return { href: a.href, t: a.target, rel: a.rel }; }); ok(lk.href === SHOP_RES && lk.t === '_blank' && /noopener/.test(lk.rel), `nudge: Visit the shop → ${lk.href} in a new tab, noopener`);
  ok(await p.evaluate(() => sessionStorage.getItem('inu.shopNudge') !== null), "nudge: sessionStorage['inu.shopNudge'] set");
  if (SHOTS) { await p.evaluate(() => document.querySelector('#r-nudge').scrollIntoView({ block: 'center' })); await p.screenshot({ path: D + 'preview-shop-nudge.png' }); }
  // gamepad reaches the nudge button
  await p.evaluate(() => window.__pad.connect('DualSense Wireless Controller 054c')); await p.waitForTimeout(150); let f = false;
  for (let i = 0; i < 6 && !f; i++) { await press(p, 13); f = await p.evaluate(() => document.activeElement?.id === 'r-shop'); } ok(f, 'nudge: gamepad focus ring reaches Visit the shop →');
  const [tab] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), p.click('#r-shop')]); await p.waitForTimeout(200); s = await st(p);
  ok(tab && tab.url() === SHOP_RES && JSON.stringify(s.va.at(-1)) === JSON.stringify(['event', { name: 'paid_link_click', data: { product: 'shop', from: 'inu-arcade-results', site: 'inu-arcade' } }]) && !s.nudge, `nudge: Visit opens the shop tab, sends the results event, nudge goes away (${JSON.stringify(s.va.at(-1))})`);
  await tab?.close(); await p.bringToFront(); await p.evaluate(() => document.querySelector('#pclose').click()); await p.waitForTimeout(150);
  await runToResults(p, g); s = await st(p); ok(s.panel === 'results' && !s.nudge, 'nudge: at most once per session (second results screen has none)');
  await p.evaluate(() => document.querySelector('#pclose').click());
  await p.evaluate(() => sessionStorage.removeItem('inu.shopNudge')); await runToResults(p, g); s = await st(p); ok(s.nudge, 'nudge: (new session) shown again');
  await p.click('#r-nudge-no'); s = await st(p); ok(!s.nudge && s.panel === 'results' && s.va.length === 1, 'nudge: Not now hides it, no analytics, results stay'); await p.evaluate(() => document.querySelector('#pclose').click());
  // Daily-Event-complete screen: never the nudge
  await p.evaluate(() => sessionStorage.removeItem('inu.shopNudge'));
  await p.evaluate((g) => { history.pushState({}, '', '/' + g); dispatchEvent(new PopStateEvent('popstate')); }, ev.game); await p.waitForTimeout(400); await p.evaluate((m) => { window.__arcade.cab.gmode = m; }, ev.mode); await p.keyboard.press('Space'); await p.waitForTimeout(300);
  await p.evaluate((t) => { const c = window.__arcade.cab.s; c.score = t; c.over = true; c.unranked = false; }, ev.target); await p.waitForTimeout(2800); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  s = await st(p); const evTxt = await p.evaluate(() => document.querySelector('#pbody').innerText);
  ok(/Daily Event complete/.test(evTxt) && !s.nudge && (await p.evaluate(() => sessionStorage.getItem('inu.shopNudge'))) === null, 'nudge: never on the Daily-Event-complete screen (and that does not use up the once-per-session nudge)');
  ok(errs.length === 0, `nudge: no page errors (${errs.join(' | ')})`); await ctx.close(); }
await b.close(); console.log(`${pass} PASS, ${fail} FAIL`); process.exit(fail ? 1 : 0);
