// "Alive" end-to-end check (Playwright). URL=<site> node scripts/alive-check.mjs
// 1) No wallet (real mode, not ?demo=1): every cabinet starts, plays, ends, takes initials and shows results; Bones within caps.
// 2) Daily Event: completes once in its cabinet + mode, pays its Bones through the normal grant (<= 60/run), never twice a day.
// 3) Activity feed: real kibble-pay data or a clear empty/offline state; kibble-pay blocked -> 'offline' fast; kibble-pay hung ->
//    'offline' after the timeout (never stuck on 'loading'). 4) Audio: nothing before a gesture, hall loop after, mute works.
// 5) Reduced motion + Low FX. 6) New UI never under the wallet pill / 🏠 / toolbar. Screenshots -> /workspace/inu-arcade-shots/alive-*.
import { chromium } from 'playwright'; import { execFileSync } from 'node:child_process'; import { mkdirSync, rmSync } from 'node:fs';
const U = (process.env.URL || 'http://localhost:8140').replace(/\/$/, ''), D = '/workspace/inu-arcade-shots/', TAG = process.env.TAG || 'alive', SHOTS = process.env.SHOTS !== '0';
const GAMES = ['kibble-chomp', 'bark-invaders', 'pup-crossing', 'bone-breaker', 'street-sniffer', 'paw-fu-tower', 'bone-digger', 'pips-big-bark', 'shiba-scuffle'];
const fails = []; let passes = 0; const ok = (c, m) => { if (c) passes++; else fails.push(m); console.log((c ? 'PASS ' : 'FAIL ') + m); };
const KP = /^https:\/\/kibble-pay\.vercel\.app\//; mkdirSync(D, { recursive: true });
const b = await chromium.launch();
const X = (a, c) => a && c && a.x < c.x + c.width - 0.5 && c.x < a.x + a.width - 0.5 && a.y < c.y + c.height - 0.5 && c.y < a.y + a.height - 0.5;
async function page(opts = {}, init) { const ctx = await b.newContext({ viewport: { width: 1280, height: 760 }, ...opts }); if (init) await ctx.addInitScript(init); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); return { ctx, p, errs }; }
const st = (p) => p.evaluate(() => { const A = window.__arcade; return { scene: A.scene, mode: A.mode, cab: A.cab?.mode, id: A.cab?.id, feed: A.feed.status, n: A.feed.entries.length, bones: A.purse.bones, today: A.purse.todayBones, ev: A.purse.event, lvl: A.fxLevel(), track: A.musicTrack(), audio: A.audioState(), addr: A.wallet()?.address || null }; });
const toCab = (p, g) => p.evaluate((g) => { history.pushState({}, '', '/' + g); dispatchEvent(new PopStateEvent('popstate')); }, g);
const tapCanvas = async (p, cx, cy) => { const r = await p.locator('#screen').boundingBox(); const W = await p.evaluate(() => document.querySelector('#screen').width), H = await p.evaluate(() => document.querySelector('#screen').height); await p.mouse.click(r.x + (cx / W) * r.width, r.y + (cy / H) * r.height); };

// ---------- 1 + 2 + 4: no wallet, real mode ----------
{ const { ctx, p, errs } = await page(); const submits = []; p.on('request', (r) => { if (/action=submit|\/api\/game.*submit|signature/i.test(r.url() + (r.postData() || ''))) submits.push(r.url()); });
  await p.goto(U + '/'); await p.waitForTimeout(2500);
  let s = await st(p); ok(s.audio === 'none' && !s.addr, `no wallet + no gesture yet: no AudioContext (audio=${s.audio}), wallet address none`);
  for (let i = 0; i < 24 && (s.mode === 'loading' || s.feed === 'loading'); i++) { await p.waitForTimeout(500); s = await st(p); }
  ok(['live', 'soon', 'offline'].includes(s.mode), `kibble-pay glue settled (mode=${s.mode})`); ok(['live', 'empty', 'offline'].includes(s.feed), `activity feed settled from kibble-pay (status=${s.feed}, ${s.n} real entries)`);
  const fe = await p.evaluate(() => window.__arcade.feed.entries); ok(fe.every((e) => /^[1-9A-HJ-NP-Za-km-z]{4}…[1-9A-HJ-NP-Za-km-z]{4}$/.test(e.who) && e.src === 'kibble-pay'), `feed entries are shortened real wallets only (${fe.length})`);
  const ev = await p.evaluate(() => window.__arcade.todayEvent()); ok(GAMES.includes(ev.game) && ev.target > 0 && ev.bones > 0 && ev.bones <= 60, `daily event today (Sydney ${ev.day}): ${ev.goal} -> +${ev.bones} Bones`);
  await p.mouse.click(5, 5); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); s = await st(p); ok(s.track === 'hall' && s.audio !== 'none', `after a gesture the soft hall loop plays (track=${s.track}, audio=${s.audio})`);
  await p.keyboard.press('KeyM'); await p.waitForTimeout(100); ok(await p.evaluate(() => document.querySelector('#b-mute').getAttribute('aria-pressed') === 'true'), 'M mutes (🔇)'); await p.keyboard.press('KeyM');
  for (const g of GAMES) {
    await toCab(p, g); await p.waitForTimeout(500); s = await st(p); ok(s.cab === 'title' && s.id === g, `${g}: title screen`); await p.waitForTimeout(200); s = await st(p); ok(s.track === 'attract:' + g, `${g}: attract ambience on the title (${s.track})`);
    await p.evaluate((m) => { window.__arcade.cab.gmode = m; }, g === ev.game && ev.mode === 'classic' ? 'inu' : 'classic'); await p.keyboard.press('Space'); // keep today's event for its own test below await p.waitForTimeout(300); s = await st(p); ok(s.cab === 'play', `${g}: starts with no wallet`);
    for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space']) { await p.keyboard.down(k); await p.waitForTimeout(250); await p.keyboard.up(k); }
    s = await st(p); ok(s.cab === 'play' || s.cab === 'over', `${g}: plays (${s.cab})`); const b0 = s.bones;
    await p.evaluate(() => { const c = window.__arcade.cab.s; c.score += 600; c.over = true; c.unranked = false; }); await p.waitForTimeout(300); ok((await st(p)).cab === 'over', `${g}: ends (game over)`);
    await p.waitForTimeout(2500); ok((await st(p)).cab === 'initials', `${g}: initials`); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    s = await st(p); const panel = await p.evaluate(() => !document.querySelector('#panel').hidden && document.querySelector('#panel').dataset.kind); ok(s.cab === 'results' && panel === 'results', `${g}: results (+${s.bones - b0} Bones, today ${s.today}/600)`);
    ok(s.bones - b0 >= 0 && s.bones - b0 <= 60 && s.today <= 600, `${g}: Bones inside caps`); await p.keyboard.press('Escape'); await p.waitForTimeout(150); await p.evaluate(() => document.querySelector('#pclose').click());
  }
  ok(submits.length === 0, `no wallet: nothing was submitted to the prize board (${submits.length})`);
  // Daily Event run
  await toCab(p, ev.game); await p.waitForTimeout(400); await p.evaluate((m) => { window.__arcade.cab.gmode = m; }, ev.mode); await p.keyboard.press('Space'); await p.waitForTimeout(300);
  const b1 = (await st(p)).bones; await p.evaluate((t) => { const c = window.__arcade.cab.s; c.score = t; c.over = true; c.unranked = false; }, ev.target); await p.waitForTimeout(2800); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  s = await st(p); const res = await p.evaluate(() => window.__arcade.cab.result); const html = await p.evaluate(() => document.querySelector('#pbody').innerText);
  ok(!!res.event && s.ev?.done && s.ev.day === ev.day, `event: target ${ev.target} in ${ev.game} ${ev.mode} completes today's event`); ok(/Daily Event complete/.test(html), 'event: results panel announces it');
  ok(res.got.bones <= 60 && s.bones - b1 === res.got.bones && res.got.bonus <= ev.bones, `event: +${res.got.bones} Bones this run (event share ${res.got.bonus}) via the normal grant, <= 60`);
  if (SHOTS) await p.screenshot({ path: `${D}${TAG}-event-complete-results.png` });
  await p.evaluate(() => document.querySelector('#pclose').click()); await p.keyboard.press('Space'); await p.waitForTimeout(300);
  await p.evaluate((t) => { const c = window.__arcade.cab.s; c.score = t; c.over = true; c.unranked = false; }, ev.target * 2); await p.waitForTimeout(2800); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => window.__arcade.cab.result.event)), 'event: only once per Sydney day'); await p.evaluate(() => document.querySelector('#pclose').click());
  ok(errs.length === 0, `no page errors (${errs.join(' | ')})`); await ctx.close(); }

// ---------- 3: kibble-pay blocked / hung ----------
{ const { ctx, p, errs } = await page(); await ctx.route(KP, (r) => r.abort('internetdisconnected')); const t0 = Date.now(); await p.goto(U + '/');
  let s = await st(p); for (let i = 0; i < 30 && (s.mode === 'loading' || s.feed === 'loading'); i++) { await p.waitForTimeout(250); s = await st(p); }
  ok(s.mode === 'offline' && s.feed === 'offline' && s.n === 0, `kibble-pay blocked: mode offline + feed offline in ${((Date.now() - t0) / 1000).toFixed(1)}s, no entries invented`);
  await tapCanvas(p, 120, 16); await p.waitForTimeout(300); const tx = await p.evaluate(() => document.querySelector('#panel').dataset.kind + '|' + document.querySelector('#pbody').innerText);
  ok(tx.startsWith('today|') && /unreachable/.test(tx) && /Daily Event/.test(tx), 'offline: tapping the event band opens Today (event rules + honest offline feed state)');
  await p.evaluate(() => document.querySelector('#pclose').click()); await toCab(p, 'bone-breaker'); await p.waitForTimeout(300); await p.keyboard.press('Space'); await p.waitForTimeout(500);
  ok((await st(p)).cab === 'play', 'offline: cabinets still play'); ok(errs.length === 0, `offline: no page errors (${errs.join(' | ')})`); await ctx.close(); }
{ const { ctx, p } = await page(); await ctx.route(KP, () => {}); const t0 = Date.now(); await p.goto(U + '/', { waitUntil: 'domcontentloaded' }); // inu-profile.js is async, so a hung kibble-pay no longer blocks main.js (it still blocks 'load') await p.waitForTimeout(2000); // never answered
  let s = await st(p); ok(s.mode === 'loading', `kibble-pay hung: 'loading' at first (${s.mode})`);
  for (let i = 0; i < 40 && (s.mode === 'loading' || s.feed === 'loading'); i++) { await p.waitForTimeout(500); s = await st(p); }
  const secs = (Date.now() - t0) / 1000; ok(s.mode === 'offline' && s.feed === 'offline' && secs < 16, `kibble-pay hung: initKibble timeout -> 'offline' (not stuck on loading) after ~${secs.toFixed(1)}s; feed offline`);
  ok(await p.evaluate(() => /timeout/.test(window.__arcade.kibbleReason || '')), 'kibble-pay hung: reason is the timeout'); await ctx.close(); }

// ---------- 5: reduced motion + Low FX ----------
{ const { ctx, p } = await page({ reducedMotion: 'reduce' }); await p.goto(U + '/?demo=1'); await p.waitForTimeout(1200);
  const a = await p.evaluate(() => JSON.stringify(window.__arcade.crowd.map((q) => [q.x, q.y, q.hop]))); await p.waitForTimeout(1500); const c = await p.evaluate(() => JSON.stringify(window.__arcade.crowd.map((q) => [q.x, q.y, q.hop])));
  ok((await st(p)).lvl === 'reduced' && a === c, 'prefers-reduced-motion: FX level reduced, crowd stands still'); await ctx.close(); }
{ const { ctx, p } = await page({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); await p.goto(U + '/?demo=1'); await p.waitForTimeout(1200);
  ok((await st(p)).lvl === 'full', 'default FX level full'); await p.locator('#b-settings').tap(); await p.waitForTimeout(200);
  ok(await p.locator('#set-vol').count() === 1, 'Settings: music & ambience volume slider'); await p.locator('label.sw:has(#set-lowfx)').tap(); await p.waitForTimeout(200);
  ok((await st(p)).lvl === 'low' && JSON.parse(await p.evaluate(() => localStorage.getItem('inuarcade.fx.v1'))).low === true, 'Settings: Low FX switch -> low level, saved');
  if (SHOTS) await p.screenshot({ path: `${D}${TAG}-settings-lowfx-volume.png` });
  await p.locator('label.sw:has(#set-lowfx)').tap(); await p.locator('#pclose').tap(); await ctx.close(); }

// ---------- 6: overlap (bands are inside the canvas; canvas vs wallet pill / 🏠 / toolbar) + screenshots ----------
for (const [name, vp, touch] of [['390x844', { width: 390, height: 844 }, true], ['844x390', { width: 844, height: 390 }, false], ['desktop', { width: 1440, height: 900 }, false]]) {
  const { ctx, p, errs } = await page({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 2 }); await p.goto(U + '/'); await p.waitForSelector('#inu-wallet-btn', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { const R = (q) => { const e = document.querySelector(q); if (!e || !e.offsetWidth) return null; const z = e.getBoundingClientRect(); return { x: z.x, y: z.y, width: z.width, height: z.height }; }; return { cv: R('#screen'), wallet: R('#inu-wallet-btn'), home: R('#inu-home'), bar: R('#bar'), legal: R('#inu-legal') }; });
  for (const k of ['wallet', 'home', 'bar', 'legal']) ok(!X(r.cv, r[k]), `${name}: hall canvas (event + feed bands) clear of ${k}`);
  if (SHOTS) { await p.screenshot({ path: `${D}${TAG}-hall-${name}.png` }); await p.locator('#screen').screenshot({ path: `${D}${TAG}-hall-${name}-screen.png` }); }
  if (name === '390x844' && SHOTS) {
    await tapCanvas(p, 120, 198); await p.waitForTimeout(400); await p.screenshot({ path: `${D}${TAG}-daily-challenge.png` });
    await p.evaluate(() => { const b = document.querySelector('#pbody'); const h = [...b.querySelectorAll('h3')].find((e) => /Prize board/.test(e.textContent)); h?.scrollIntoView(); }); await p.waitForTimeout(200); await p.screenshot({ path: `${D}${TAG}-activity-feed.png` });
    await p.evaluate(() => document.querySelector('#pclose').click());
    for (const g of ['street-sniffer', 'paw-fu-tower', 'shiba-scuffle', 'bark-invaders']) { await toCab(p, g); await p.waitForTimeout(1600); await p.locator('#screen').screenshot({ path: `${D}${TAG}-title-${g}.png` }); }
    await toCab(p, 'pup-crossing'); await p.waitForTimeout(9500); await p.locator('#screen').screenshot({ path: `${D}${TAG}-attract-pup-crossing.png` });
    // GIF of the hall: 48 frames @ 12.5 fps of the screen
    await toCab(p, ''); await p.evaluate(() => { history.pushState({}, '', '/'); dispatchEvent(new PopStateEvent('popstate')); }); await p.waitForTimeout(600);
    const fd = '/tmp/alive-gif'; rmSync(fd, { recursive: true, force: true }); mkdirSync(fd);
    for (let i = 0; i < 48; i++) { if (i === 10) await p.keyboard.down('ArrowRight'); if (i === 26) await p.keyboard.up('ArrowRight'); await p.locator('#screen').screenshot({ path: `${fd}/f${String(i).padStart(3, '0')}.png` }); await p.waitForTimeout(40); }
    try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '10', '-i', `${fd}/f%03d.png`, '-vf', 'scale=480:-1:flags=neighbor,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=none', `${D}${TAG}-hall.gif`]); ok(true, 'hall GIF written'); } catch (e) { ok(false, 'hall GIF: ' + e.message); }
  }
  ok(errs.length === 0, `${name}: no page errors (${errs.join(' | ')})`); await ctx.close(); }
await b.close(); console.log(`\n${passes} PASS, ${fails.length} FAIL${fails.length ? '\n' + fails.join('\n') : ''}`); process.exit(fails.length ? 1 : 0);
