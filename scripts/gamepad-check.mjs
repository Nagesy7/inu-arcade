// Gamepad E2E with a simulated pad (navigator.getGamepads mocked + real gamepadconnected / gamepaddisconnected events).
// URL=<site> node scripts/gamepad-check.mjs . Covers: no polling without a pad, connect toast (PS + Xbox glyphs + hints),
// hall walk (stick + d-pad, dead zone), A opens a cabinet, every cabinet starts / pauses / resumes / exits on the pad,
// menus (Settings) by pad, joystick knob mirrors the stick, keyboard + touch + pad mixing, unplug, toast overlap.
import { chromium } from 'playwright'; import { mkdirSync } from 'node:fs';
const U = (process.env.URL || 'http://localhost:8140').replace(/\/$/, ''), D = '/workspace/inu-arcade-shots/', SHOTS = process.env.SHOTS !== '0';
const GAMES = ['kibble-chomp', 'bark-invaders', 'pup-crossing', 'bone-breaker', 'street-sniffer', 'paw-fu-tower', 'bone-digger', 'pips-big-bark', 'shiba-scuffle'];
let fail = 0, pass = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (c) pass++; else fail++; }; mkdirSync(D, { recursive: true });
const MOCK = () => { const pads = [null, null, null, null]; window.__gpCalls = 0;
  const mk = (id, index) => ({ id, index, connected: true, mapping: 'standard', timestamp: 0, buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] });
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => { window.__gpCalls++; return pads.slice(); } });
  const fire = (type, g) => { const e = new Event(type); Object.defineProperty(e, 'gamepad', { value: g }); dispatchEvent(e); };
  window.__pad = { connect(id, i = 0) { pads[i] = mk(id, i); fire('gamepadconnected', pads[i]); }, disconnect(i = 0) { const g = pads[i]; g.connected = false; pads[i] = null; fire('gamepaddisconnected', g); },
    btn(b, on, i = 0) { pads[i].buttons[b] = { pressed: on, touched: on, value: on ? 1 : 0 }; }, axes(x, y, i = 0) { pads[i].axes = [x, y, 0, 0]; } }; };
const b = await chromium.launch();
const X = (a, c) => a && c && a.x < c.x + c.width - 0.5 && c.x < a.x + a.width - 0.5 && a.y < c.y + c.height - 0.5 && c.y < a.y + a.height - 0.5;
async function page(opts = {}) { const ctx = await b.newContext({ viewport: { width: 1280, height: 760 }, ...opts }); await ctx.addInitScript(MOCK); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e))); return { ctx, p, errs }; }
const st = (p) => p.evaluate(() => { const A = window.__arcade; return { scene: A.scene, cab: A.cab?.mode, id: A.cab?.id, paused: !!A.cab?.paused, x: A.lobby?.x, y: A.lobby?.y, panel: !document.querySelector('#panel').hidden, kind: document.querySelector('#panel').dataset.kind, calls: window.__gpCalls, pads: A.gamepad?.count, held: [...A.input.held].sort().join(',') }; });
const press = async (p, btn, ms = 90) => { await p.evaluate((x) => window.__pad.btn(x, true), btn); await p.waitForTimeout(ms); await p.evaluate((x) => window.__pad.btn(x, false), btn); await p.waitForTimeout(90); };
const toast = (p) => p.evaluate(() => { const t = document.querySelector('#gp-toast'); if (!t) return null; const r = t.getBoundingClientRect(); return { cls: t.className, text: t.innerText, op: +getComputedStyle(t).opacity, r: { x: r.x, y: r.y, width: r.width, height: r.height } }; });
const rects = (p) => p.evaluate(() => { const R = (q) => { const e = document.querySelector(q); if (!e || !e.offsetWidth) return null; const z = e.getBoundingClientRect(); return { x: z.x, y: z.y, width: z.width, height: z.height }; };
  return { wallet: R('#inu-wallet-btn'), home: R('#inu-home'), bar: R('#bar'), legal: R('#inu-legal'), pad: R('#pad'), badge: R('.inu-profile-badge') }; });
const toCab = (p, g) => p.evaluate((g) => { history.pushState({}, '', '/' + g); dispatchEvent(new PopStateEvent('popstate')); }, g);

// ---------- desktop: hot-plug, hall, cabinets, menus, mixing with the keyboard ----------
{ const { ctx, p, errs } = await page(); await p.goto(U + '/?demo=1'); await p.waitForTimeout(1500);
  let s = await st(p); const c0 = s.calls; await p.waitForTimeout(1200); s = await st(p);
  ok(s.pads === 0 && s.calls === c0 && c0 <= 1, `no pad: rAF loop never polls navigator.getGamepads (calls ${c0} -> ${s.calls})`);
  await p.evaluate(() => window.__pad.connect('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)')); await p.waitForTimeout(350);
  let t = await toast(p); ok(t && /show/.test(t.cls) && t.op > 0.9 && /Xbox controller connected/.test(t.text) && /A A\/jump · B B\/back/.test(t.text) && /MENU START/.test(t.text), `connect: Xbox toast with hints (${t?.text.replace(/\n/g, ' / ')})`);
  let r = await rects(p); ok(!['wallet', 'home', 'bar', 'legal', 'pad', 'badge'].some((k) => X(t.r, r[k])), 'desktop 1280x760: toast clear of wallet pill, 🏠, toolbar, legal, pad, profile badge');
  if (SHOTS) await p.screenshot({ path: D + 'alive-gamepad-toast-desktop.png' });
  s = await st(p); const c1 = s.calls; await p.waitForTimeout(500); s = await st(p); ok(s.pads === 1 && s.calls > c1 + 10, `connected: polled every frame from the rAF loop (+${s.calls - c1} in 0.5s)`);
  // hall: stick inside the dead zone does nothing, past it walks; d-pad walks
  let a = await st(p); await p.evaluate(() => window.__pad.axes(0.2, 0.15)); await p.waitForTimeout(400); s = await st(p); ok(Math.abs(s.x - a.x) < 0.5 && Math.abs(s.y - a.y) < 0.5, 'hall: stick inside the 0.3 dead zone -> Shiba stays put');
  await p.evaluate(() => window.__pad.axes(0.95, 0)); await p.waitForTimeout(450); await p.evaluate(() => window.__pad.axes(0, 0)); s = await st(p); ok(s.x > a.x + 15, `hall: left stick walks right (${a.x | 0} -> ${s.x | 0})`);
  a = s; await p.evaluate(() => window.__pad.btn(14, true)); await p.waitForTimeout(400); await p.evaluate(() => window.__pad.btn(14, false)); await p.waitForTimeout(60); s = await st(p); ok(s.x < a.x - 15, `hall: d-pad left walks (${a.x | 0} -> ${s.x | 0})`);
  await p.evaluate(() => { const L = window.__arcade.lobby; L.x = 49; L.y = 140; }); await p.evaluate(() => window.__pad.axes(0, -1)); await p.waitForTimeout(600); await p.evaluate(() => window.__pad.axes(0, 0)); await p.waitForTimeout(60);
  await press(p, 0); await p.waitForTimeout(200); s = await st(p); ok(s.scene === 'cab' && s.id === 'kibble-chomp' && s.cab === 'title', `hall: walk up to a cabinet + A (south) opens it (${s.id} ${s.cab})`);
  await press(p, 8); await p.waitForTimeout(200); s = await st(p); ok(s.scene === 'lobby', 'SELECT (back/share/view) returns to the hall');
  for (const g of GAMES) { await toCab(p, g); await p.waitForTimeout(450);
    await press(p, 0); s = await st(p); const started = s.cab === 'play';
    await p.evaluate(() => window.__pad.axes(0.9, 0)); await p.evaluate(() => window.__pad.btn(15, true)); await p.waitForTimeout(150); const hr = (await st(p)).held; await p.evaluate(() => { window.__pad.axes(0, 0); window.__pad.btn(15, false); }); await p.waitForTimeout(60);
    await press(p, 9); const pz = (await st(p)).paused; await press(p, 9); const rs = !(await st(p)).paused;
    await press(p, 8); await p.waitForTimeout(150); s = await st(p);
    ok(started && /right/.test(hr) && pz && rs && s.scene === 'lobby', `${g}: pad A starts, stick/d-pad held (${hr}), START pauses + resumes, SELECT exits`); }
  // menus by pad: Settings -> d-pad to the joystick switch -> A toggles it -> stick moves the on-screen knob -> B closes
  await p.click('#b-settings'); await p.waitForTimeout(250); let found = false;
  for (let i = 0; i < 12 && !found; i++) { await press(p, 13); found = await p.evaluate(() => document.activeElement?.id === 'set-joy'); }
  const fv = await p.evaluate(() => document.activeElement?.classList.contains('gp-focus') && getComputedStyle(document.activeElement).outlineStyle !== 'none');
  ok(found && fv, 'menus: d-pad down moves a visible focus ring through Settings to the joystick switch');
  await press(p, 0); await p.waitForTimeout(150); ok(await p.evaluate(() => window.__arcade.settings.joystick === true), 'menus: A (south) toggles the focused switch');
  await press(p, 1); await p.waitForTimeout(150); s = await st(p); ok(!s.panel, 'menus: B (east) closes the panel');
  await p.evaluate(() => window.__pad.axes(-0.9, -0.2)); await p.waitForTimeout(150); const kn = await p.evaluate(() => document.querySelector('#joy .knob')?.style.transform || ''); await p.evaluate(() => window.__pad.axes(0, 0)); await p.waitForTimeout(80);
  const kn0 = await p.evaluate(() => document.querySelector('#joy .knob')?.style.transform || ''); ok(/translate\(-3\d/.test(kn) && kn0 === '', `joystick on: the on-screen knob mirrors the left stick (${kn}) and recentres`);
  await p.evaluate(() => window.__arcade.setJoystick(false));
  await p.click('#b-settings'); await p.waitForTimeout(200); await press(p, 8); await p.waitForTimeout(120); ok(!(await st(p)).panel, 'menus: SELECT also closes a panel');
  // mixing: keyboard keeps working while the pad holds a button, and after
  await p.evaluate(() => { const L = window.__arcade.lobby; L.x = 190; L.y = 170; }); await p.waitForTimeout(60); // open floor, away from any cabinet
  await p.evaluate(() => window.__pad.btn(0, true)); await p.waitForTimeout(60); a = await st(p); await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(350); await p.keyboard.up('ArrowLeft'); s = await st(p);
  ok(s.x < a.x - 10 && /\ba\b/.test(s.held), `mixing: keyboard arrows walk while the pad holds A (${a.x | 0} -> ${s.x | 0}, held ${s.held})`); await p.evaluate(() => window.__pad.btn(0, false)); await p.waitForTimeout(80);
  await toCab(p, 'bone-breaker'); await p.waitForTimeout(400); await p.keyboard.press('Enter'); await p.waitForTimeout(120); s = await st(p); ok(s.cab === 'play', 'mixing: keyboard Enter still starts a cabinet with a pad connected');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150); ok((await st(p)).scene === 'lobby', 'mixing: keyboard Esc still exits');
  // unplug
  await p.evaluate(() => window.__pad.btn(15, true)); await p.waitForTimeout(80); await p.evaluate(() => window.__pad.disconnect()); await p.waitForTimeout(300);
  t = await toast(p); s = await st(p); ok(t && /disconnected/.test(t.text) && /off/.test(t.cls) && s.pads === 0 && !/right/.test(s.held), `unplug: disconnected toast, held keys released (${t?.text})`);
  const c2 = s.calls; await p.waitForTimeout(600); ok((await st(p)).calls === c2, 'unplug: polling stops');
  a = await st(p); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(300); await p.keyboard.up('ArrowRight'); s = await st(p); ok(s.x > a.x + 10, 'after unplug: keyboard unchanged');
  ok(errs.length === 0, `desktop: no page errors (${errs.join(' | ')})`); await ctx.close(); }

// ---------- phone 390x844 touch: PS toast screenshot + touch / pad mixing ----------
{ const { ctx, p, errs } = await page({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const cdp = await ctx.newCDPSession(p);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q.x, y: q.y, id: q.id ?? i })) });
  await p.goto(U + '/?demo=1'); await p.waitForTimeout(1500);
  await p.evaluate(() => window.__pad.connect('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)')); await p.waitForTimeout(350);
  const t = await toast(p); ok(t && /PS controller connected/.test(t.text) && /✕ A\/jump · ○ B\/back/.test(t.text) && /OPTIONS START/.test(t.text) && t.text.includes('✕○□△'), `connect: PS toast with PS glyphs + hints (${t?.text.replace(/\n/g, ' / ')})`);
  const r = await rects(p); ok(!['wallet', 'home', 'bar', 'legal', 'pad', 'badge'].some((k) => X(t.r, r[k])), 'phone 390x844: toast clear of wallet pill, 🏠, toolbar, legal, pad, profile badge');
  if (SHOTS) await p.screenshot({ path: D + 'alive-gamepad-toast.png' });
  const right = await p.evaluate(() => { const z = document.querySelector('#pad [data-k="right"]').getBoundingClientRect(); return { x: z.x + z.width / 2, y: z.y + z.height / 2 }; });
  await p.evaluate(() => window.__pad.btn(0, true)); let a = await st(p); await touch('touchStart', [right]); await p.waitForTimeout(400); await touch('touchEnd', []); await p.waitForTimeout(60); let s = await st(p);
  ok(s.x > a.x + 15 && /\ba\b/.test(s.held), `mixing: touch d-pad walks while the pad holds A; lifting the finger keeps the pad's A (${a.x | 0} -> ${s.x | 0}, held ${s.held})`);
  await p.evaluate(() => window.__pad.btn(0, false)); await p.waitForTimeout(80); ok(!/\ba\b/.test((await st(p)).held), 'mixing: releasing the pad A releases it');
  a = await st(p); await p.evaluate(() => window.__pad.axes(-1, 0)); await touch('touchStart', [right]); await p.waitForTimeout(300); s = await st(p); await touch('touchEnd', []); await p.evaluate(() => window.__pad.axes(0, 0)); await p.waitForTimeout(60);
  ok(/left/.test(s.held) && /right/.test(s.held), `mixing: stick left + finger right are both held (${s.held}), each released on its own`);
  ok(!/left|right/.test((await st(p)).held), 'mixing: nothing stuck after both release');
  ok(errs.length === 0, `phone: no page errors (${errs.join(' | ')})`); await ctx.close(); }
await b.close(); console.log(`${pass} PASS, ${fail} FAIL`); process.exit(fail ? 1 : 0);
