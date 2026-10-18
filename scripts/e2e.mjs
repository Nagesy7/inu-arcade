// Real-input E2E: desktop keyboard + iPhone 13 landscape touch (CDP touch events). Saves proof/ screenshots.
import { chromium, devices } from 'playwright';
const URL = (process.env.URL || 'http://localhost:8140').replace(/\/$/, ''); const GAMES = ['kibble-chomp', 'bark-invaders', 'pup-crossing', 'bone-breaker', 'street-sniffer', 'paw-fu-tower', 'bone-digger', 'pips-big-bark', 'shiba-scuffle'];
const browser = await chromium.launch(); let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const tag = process.env.TAG || 'local';
// ---------------- desktop keyboard ----------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  const st = () => p.evaluate(() => { const A = window.__arcade, C = A.cab; return { scene: A.scene, L: A.lobby && { x: A.lobby.x, y: A.lobby.y }, id: C?.id, mode: C?.mode, score: C?.s.score, s: C && JSON.parse(JSON.stringify({ p: C.s.player || C.s.pup || C.s.paddle || C.s.dog || C.s.p, balls: C.s.balls?.length, stuck: C.s.balls?.[0]?.stuck, shots: C.s.shots, row: C.s.pup?.row })), path: location.pathname, panel: !document.querySelector('#panel').hidden }; });
  await p.goto(URL + '/'); await p.waitForTimeout(800); await p.mouse.click(5, 5);
  let a = await st(); ok(a.scene === 'lobby', 'desktop: lobby loads');
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight'); let b = await st(); ok(b.L.x > a.L.x + 20, `desktop: arrow walks Shiba ${a.L.x | 0}->${b.L.x | 0}`);
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(900); await p.keyboard.up('ArrowUp'); await p.screenshot({ path: `proof/${tag}-desktop-lobby.png` });
  // walk to Kibble Chomp cabinet by clicking it
  const box = await p.locator('#screen').boundingBox(); const sc = box.width / 384;
  await p.mouse.click(box.x + (38 + 16) * sc, box.y + 60 * sc); for (let i = 0; i < 40 && (await st()).scene !== 'cab'; i++) await p.waitForTimeout(100);
  b = await st(); ok(b.scene === 'cab' && b.id === 'kibble-chomp' && b.path === '/kibble-chomp', `desktop: clicking cabinet walks over and opens it (${b.path})`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok((await st()).scene === 'lobby', 'desktop: Esc returns to the hall');
  for (const g of GAMES) {
    await p.goto(URL + '/' + g); await p.waitForTimeout(700); ok((await st()).mode === 'title' && (await st()).id === g, `${g}: deep link opens title`);
    ok((await p.locator('meta[property="og:image"]').getAttribute('content')).endsWith(`/og/${g}.png`), `${g}: own og:image`);
    await p.screenshot({ path: `proof/${tag}-desktop-${g}-title.png` });
    await p.evaluate(() => (window.__arcade.cab.t = 6.9)); await p.waitForTimeout(2500); a = await st(); ok(a.mode === 'attract', `${g}: attract mode runs`); await p.screenshot({ path: `proof/${tag}-desktop-${g}-attract.png` });
    await p.keyboard.press('Enter'); await p.waitForTimeout(100); a = await st(); ok(a.mode === 'play', `${g}: Enter starts play`);
    if (g === 'kibble-chomp') { await p.waitForTimeout(1600); a = await st(); await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(700); await p.keyboard.up('ArrowLeft'); b = await st(); ok(b.s.p.x < a.s.p.x - 1 && b.score > 0, `${g}: ArrowLeft moves Shiba and eats kibble (x ${a.s.p.x}->${b.s.p.x.toFixed(1)}, score ${b.score})`); }
    if (g === 'bark-invaders') { await p.waitForTimeout(1100); a = await st(); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight'); await p.keyboard.down('Space'); await p.waitForTimeout(60); await p.keyboard.up('Space'); await p.waitForTimeout(30); b = await st(); ok(b.s.p.x > a.s.p.x + 20 && b.s.shots === 1, `${g}: arrows move, Space barks (shots ${b.s.shots})`); }
    if (g === 'pup-crossing') { await p.keyboard.press('ArrowUp'); await p.waitForTimeout(250); b = await st(); ok(b.s.row === 13 && b.score === 10, `${g}: ArrowUp hops forward (row ${b.s.row}, score ${b.score})`); }
    if (g === 'bone-breaker') { a = await st(); await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(300); await p.keyboard.up('ArrowLeft'); await p.keyboard.press('Space'); await p.waitForTimeout(80); b = await st(); ok(b.s.p.x < a.s.p.x - 20 && b.s.stuck === false, `${g}: paddle moves, Space serves`); }
    if (g === 'street-sniffer') { await p.waitForTimeout(2200); a = await st(); await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(700); await p.keyboard.up('ArrowLeft'); b = await st(); ok(b.s.p.x < a.s.p.x - 1 && b.score > 0, `${g}: ArrowLeft moves the Shiba and sniffs kibble (x ${a.s.p.x}->${b.s.p.x}, score ${b.score})`); }
    if (g === 'paw-fu-tower') { await p.waitForTimeout(2000); a = await st(); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(600); await p.keyboard.up('ArrowRight'); b = await st(); await p.keyboard.press('Space'); await p.waitForTimeout(500); await p.keyboard.press('KeyX'); await p.waitForTimeout(80); const q = await p.evaluate(() => window.__arcade.cab.s.stats); ok(b.s.p.x > a.s.p.x + 10 && q.jabs === 1 && q.kicks === 1, `${g}: arrows walk, Space = Paw Jab, X = Hind Kick (x ${a.s.p.x}->${b.s.p.x}, jabs ${q.jabs}, kicks ${q.kicks})`); }
    if (g === 'bone-digger') { await p.waitForTimeout(1900); a = await st(); await p.keyboard.down('ArrowDown'); await p.waitForTimeout(700); await p.keyboard.up('ArrowDown'); b = await st(); await p.keyboard.press('Space'); await p.waitForTimeout(80); const q = await p.evaluate(() => window.__arcade.cab.s.stats); ok(b.s.p.y > a.s.p.y + 10 && b.score > 0 && q.pumps === 1, `${g}: ArrowDown digs, Space = Bark Pump (y ${a.s.p.y}->${b.s.p.y}, score ${b.score}, pumps ${q.pumps})`); }
    if (g === 'pips-big-bark') { await p.waitForTimeout(2000); a = await st(); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(600); await p.keyboard.up('ArrowRight'); b = await st(); await p.keyboard.press('Space'); await p.waitForTimeout(150); const air = await p.evaluate(() => !window.__arcade.cab.s.p.onG); await p.waitForTimeout(700); await p.keyboard.press('KeyX'); await p.waitForTimeout(250); await p.keyboard.press('KeyV'); await p.waitForTimeout(80); const q = await p.evaluate(() => window.__arcade.cab.s.stats); ok(b.s.p.x > a.s.p.x + 10 && air && q.yips === 1 && q.booms === 1, `${g}: arrows run, Space jumps, X = yip, V = Bone-erang (x ${a.s.p.x}->${b.s.p.x}, air ${air}, yips ${q.yips}, booms ${q.booms})`); }
    await p.waitForTimeout(1200); await p.screenshot({ path: `proof/${tag}-desktop-${g}-play.png` });
    await p.evaluate(() => { const s = window.__arcade.cab.s; s.score += 1234; s.over = true; s.lives = 0; }); await p.waitForTimeout(300); ok((await st()).mode === 'over', `${g}: game over screen`); await p.screenshot({ path: `proof/${tag}-desktop-${g}-gameover.png` });
    await p.waitForTimeout(2300); ok((await st()).mode === 'initials', `${g}: initials entry`);
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowUp']) { await p.keyboard.press(k); await p.waitForTimeout(40); }
    await p.screenshot({ path: `proof/${tag}-desktop-${g}-initials.png` }); await p.keyboard.press('Space'); await p.waitForTimeout(300); b = await st();
    const top = await p.evaluate((g) => { const A = window.__arcade; return { ...A.db[g].find((e) => e.name === A.initials && !e.house), want: A.initials }; }, g);
    ok(b.mode === 'results' && b.panel && top?.name === top.want && top.score >= 1234, `${g}: initials saved to leaderboard (${top?.name} ${top?.score})`);
    const href = await p.locator('#r-share').getAttribute('href'); ok(href.startsWith('https://x.com/intent/post?') && href.includes(encodeURIComponent(String(top.score))) && href.includes(encodeURIComponent('/' + g)), `${g}: share-to-X link carries score + game URL`);
    await p.screenshot({ path: `proof/${tag}-desktop-${g}-results.png` }); await p.click('#pclose');
  }
  // ---- Inu Mode: select with real keys, use each signature move ----
  for (const g of GAMES) {
    await p.goto(URL + '/' + g); await p.waitForTimeout(600); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100);
    ok((await p.evaluate(() => window.__arcade.cab.gmode)) === 'inu', `${g}: ArrowRight on title selects INU MODE`); await p.screenshot({ path: `proof/${tag}-desktop-${g}-inu-title.png` });
    await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    const r = await p.evaluate(() => { const s = window.__arcade.cab.s; return { inu: s.inu, mod: !!window.__arcade.cab.mod }; }); ok(r.inu && r.mod, `${g}: Inu run has twists + weekly modifier`);
    if (g === 'kibble-chomp') { await p.waitForTimeout(2300); await p.keyboard.press('Space'); await p.waitForTimeout(60); ok((await p.evaluate(() => window.__arcade.cab.s.stats.barks)) === 1, `${g}: Space = bark stun`); }
    if (g === 'bark-invaders') { await p.keyboard.down('Space'); await p.waitForTimeout(1100); await p.keyboard.up('Space'); await p.waitForTimeout(60); ok((await p.evaluate(() => window.__arcade.cab.s.stats.megas)) === 1, `${g}: hold+release Space = Mega Woof`); }
    if (g === 'pup-crossing') { await p.keyboard.press('ArrowUp'); await p.waitForTimeout(250); await p.keyboard.press('Space'); await p.waitForTimeout(60); const q = await p.evaluate(() => window.__arcade.cab.s); ok(q.stats.leaps === 1 || q.lives < 3, `${g}: Space = zoomies leap (leaps ${q.stats.leaps})`); }
    if (g === 'bone-breaker') { await p.keyboard.press('Space'); await p.waitForTimeout(500); await p.keyboard.press('Space'); await p.waitForTimeout(60); ok((await p.evaluate(() => window.__arcade.cab.s.stats.smashes)) === 1, `${g}: Space = bone smash, boss brick present ${await p.evaluate(() => window.__arcade.cab.s.bricks.some((b) => b.boss))}`); }
    if (g === 'street-sniffer') { await p.waitForTimeout(2300); await p.evaluate(() => { window.__arcade.cab.s.pocket = 'toy'; }); await p.keyboard.press('Space'); await p.waitForTimeout(60); const q = await p.evaluate(() => { const s = window.__arcade.cab.s; return { n: s.stats.pockets, lure: !!s.lure }; }); ok(q.n === 1 && q.lure, `${g}: Space = use pocketed squeaky toy (lure ${q.lure})`); }
    if (g === 'paw-fu-tower') { await p.waitForTimeout(2000); await p.keyboard.down('Space'); await p.waitForTimeout(900); await p.keyboard.up('Space'); await p.waitForTimeout(80); ok((await p.evaluate(() => window.__arcade.cab.s.stats.barks)) === 1, `${g}: hold+release Space = Zen Bark`); }
    if (g === 'bone-digger') { await p.waitForTimeout(1900); await p.keyboard.down('Space'); await p.waitForTimeout(700); await p.keyboard.up('Space'); await p.waitForTimeout(80); ok((await p.evaluate(() => window.__arcade.cab.s.stats.booms)) === 1, `${g}: hold+release Space = Bone Boomerang`); }
    if (g === 'pips-big-bark') { await p.waitForTimeout(2000); await p.keyboard.down('KeyX'); await p.waitForTimeout(800); await p.keyboard.up('KeyX'); await p.waitForTimeout(80); const q = await p.evaluate(() => { const s = window.__arcade.cab.s; return { big: s.stats.bigBarks, coins: s.items.filter((i) => i.kind === 'coin').length }; }); ok(q.big === 1 && q.coins > 0, `${g}: hold+release X = Big Bark; Inu Mode $KIBBLE coins in the stage (${q.coins})`); }
    await p.waitForTimeout(700); await p.screenshot({ path: `proof/${tag}-desktop-${g}-inu-play.png` });
    await p.evaluate(() => { const s = window.__arcade.cab.s; s.score += 777; s.over = true; }); await p.waitForTimeout(2600); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    const k = await p.evaluate((g) => ({ inu: (window.__arcade.db[g + '@inu'] || []).length, ghost: !!localStorage.getItem('inuarcade.ghost.v2.' + g + '@inu'), ach: Object.keys(window.__arcade.purse.ach || {}).length }), g);
    ok(k.inu >= 1 && k.ghost && k.ach >= 1, `${g}: Inu score on its own board, ghost saved, achievements ${k.ach}`); await p.click('#pclose');
    await p.evaluate(() => (window.__arcade.cab.t = 7.9)); await p.keyboard.press('Escape'); await p.goto(URL + '/' + g); await p.waitForTimeout(400); await p.evaluate(() => (window.__arcade.cab.t = 7.95)); await p.waitForTimeout(400);
    ok((await p.evaluate(() => window.__arcade.cab.demo?.label)) === 'REPLAY: YOUR BEST RUN', `${g}: attract mode replays your ghost`);
    await p.keyboard.press('Enter'); await p.waitForTimeout(300); ok(await p.evaluate(() => !!window.__arcade.cab.ghost), `${g}: ghost races you on the next run`);
    if (g === 'pup-crossing') await p.screenshot({ path: `proof/${tag}-desktop-ghost-race.png` });
    await p.evaluate(() => localStorage.setItem('inuarcade.mode', 'classic'));
  }
  await p.goto(URL + '/bone-breaker'); await p.waitForTimeout(500); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(100); ok((await p.evaluate(() => window.__arcade.cab.gmode)) === 'daily', 'ArrowLeft wraps to DAILY CHALLENGE');
  await p.keyboard.press('Enter'); await p.waitForTimeout(100); const ds = await p.evaluate(() => window.__arcade.cab.seed); await p.keyboard.press('Escape'); await p.goto(URL + '/bone-breaker'); await p.waitForTimeout(400); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  ok(ds === (await p.evaluate(() => window.__arcade.cab.seed)), `daily challenge reuses today's seed (${ds})`); await p.evaluate(() => localStorage.setItem('inuarcade.mode', 'classic'));
  await p.click('#b-ach'); await p.waitForTimeout(200); await p.screenshot({ path: `proof/${tag}-desktop-achievements.png` }); await p.click('#pclose');
  await p.click('#b-crt'); ok(!(await p.evaluate(() => document.body.classList.contains('crt'))), 'CRT toggle turns off'); await p.click('#b-crt');
  await p.click('#b-scores'); await p.waitForTimeout(200); await p.click('[data-m="inu"]'); await p.waitForTimeout(150); await p.screenshot({ path: `proof/${tag}-desktop-leaderboards.png` }); ok(await p.locator('#pbody table tr').count() >= 2, 'scores panel lists arcade board');
  const tk = await p.evaluate(() => window.__arcade.purse.tickets); await p.click('#pclose'); await p.click('#b-prizes'); await p.waitForTimeout(200);
  await p.click('[data-buy="arcade-cap"]'); await p.waitForTimeout(200); const pr = await p.evaluate(() => ({ t: window.__arcade.purse.tickets, owned: window.__arcade.purse.owned, hat: window.__arcade.profile.outfit.hat?.id }));
  ok(pr.owned.includes('arcade-cap') && pr.t === tk - 4 && pr.hat === 'arcade-cap', `prize counter swaps 4 tickets for Arcade Cap (${tk}->${pr.t})`);
  await p.waitForFunction(() => !!document.getElementById('inu-legal'), null, { timeout: 20000 }).catch(() => {}); ok(/Terms.*Prize Rules/.test(await p.evaluate(() => document.getElementById('inu-legal')?.textContent || '')), 'footer: Terms + Prize Rules links');
  await p.click('#pclose'); await p.click('#b-prizes'); await p.waitForTimeout(200);
  await p.click('[data-gold="bone-breaker"]'); await p.waitForTimeout(500); ok(!(await p.evaluate(() => window.__arcade.purse.skins['bone-breaker'] || [])).includes('gold') && /Sign in with Phantom|unreachable|wallet/i.test(await p.evaluate(() => document.getElementById('pbody').textContent)), 'real mode, signed out: gold burn asks for a wallet sign-in (or says the wallet service is unreachable), nothing burned or faked');
  await p.evaluate(() => { const el = document.getElementById('srvboard'); return el && el.textContent; }); await p.click('#pclose'); await p.click('#b-scores'); await p.waitForFunction(() => !/Loading/.test(document.getElementById('srvboard')?.textContent || 'Loading'), null, { timeout: 15000 }).catch(() => {});
  ok(/pool/i.test(await p.evaluate(() => document.getElementById('srvboard')?.textContent || '')), 'scores panel shows the real kibble-pay prize board + pool'); await p.screenshot({ path: `proof/${tag}-desktop-server-board.png` });
  { const d = await ctx.newPage(); await d.goto(URL + '/?demo=1'); await d.waitForTimeout(800); await d.evaluate(() => { window.__arcade.purse.tickets = 99; }); await d.click('#b-prizes'); await d.waitForTimeout(200); await d.click('[data-gold="bone-breaker"]'); await d.waitForTimeout(300);
    ok((await d.evaluate(() => window.__arcade.purse.skins['bone-breaker'] || [])).includes('gold') && /DEMO/.test(await d.evaluate(() => document.getElementById('pbody').textContent)), 'demo (?demo=1): gold skin via labelled fake burn'); await d.close(); }
  await p.click('#pclose'); await p.click('#b-prizes'); await p.waitForTimeout(200);
  await p.screenshot({ path: `proof/${tag}-desktop-prizes.png` }); await p.click('#pclose'); await p.click('#b-profile'); await p.waitForTimeout(200); await p.screenshot({ path: `proof/${tag}-desktop-profile.png` }); await p.click('#pclose');
  await p.goto(URL + '/'); await p.waitForTimeout(800); await p.screenshot({ path: `proof/${tag}-desktop-lobby-after.png` });
  ok(errs.length === 0, 'desktop: no page errors ' + errs.join(' | ')); await ctx.close();
}
// ---------------- iPhone landscape touch ----------------
{
  const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q.x, y: q.y, id: q.id ?? i })) });
  const c = async (k) => { const b = await p.locator(`#pad [data-k="${k}"]`).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const tap = async (q) => { await touch('touchStart', [q]); await p.waitForTimeout(60); await touch('touchEnd', []); };
  const hold = async (k, ms) => { const q = await c(k); await touch('touchStart', [q]); await p.waitForTimeout(ms); await touch('touchEnd', []); };
  const st = () => p.evaluate(() => { const A = window.__arcade, C = A.cab; return { scene: A.scene, L: A.lobby && { x: A.lobby.x }, id: C?.id, mode: C?.mode, score: C?.s.score, p: C && (C.s.player || C.s.pup || C.s.paddle || C.s.dog || C.s.p), row: C?.s.pup?.row, shots: C?.s.shots, stuck: C?.s.balls?.[0]?.stuck }; });
  await p.goto(URL + '/'); await p.waitForTimeout(900); const vp = p.viewportSize(); const cv = await p.locator('#screen').boundingBox();
  ok(cv.x >= 0 && cv.y >= 0 && cv.x + cv.width <= vp.width + 1 && cv.y + cv.height <= vp.height + 1, `iphone: canvas fits ${cv.width | 0}x${cv.height | 0} in ${vp.width}x${vp.height}`);
  for (const k of ['left', 'right', 'up', 'down', 'a', 'start', 'back']) { const q = await c(k); ok(q.x > 0 && q.y > 0 && q.x < vp.width && q.y < vp.height, `iphone: ${k} button on screen`); }
  let a = await st(); await hold('right', 500); let b = await st(); ok(b.L.x > a.L.x + 15, `iphone: d-pad walks Shiba ${a.L.x | 0}->${b.L.x | 0}`);
  await p.screenshot({ path: `proof/${tag}-iphone-lobby.png` });
  const sc = cv.width / 384; await tap({ x: cv.x + (140 + 16) * sc, y: cv.y + 60 * sc }); for (let i = 0; i < 50 && (await st()).scene !== 'cab'; i++) await p.waitForTimeout(100);
  b = await st(); ok(b.id === 'bone-breaker', `iphone: tapping a cabinet opens it (${b.id})`); await tap(await c('back')); await p.waitForTimeout(200); ok((await st()).scene === 'lobby', 'iphone: BACK returns to hall');
  for (const g of GAMES) {
    await p.goto(URL + '/' + g); await p.waitForTimeout(700); await tap(await c('start')); await p.waitForTimeout(120); ok((await st()).mode === 'play', `iphone ${g}: START begins play`);
    if (g === 'kibble-chomp') ok(await p.locator('#pad [data-k=b]').isHidden(), `iphone ${g}: one-button cabinet hides B`);
    if (g === 'kibble-chomp') { await p.waitForTimeout(1600); a = await st(); await hold('right', 600); b = await st(); ok(b.p.x > a.p.x + 1, `iphone ${g}: d-pad steers (${a.p.x}->${b.p.x.toFixed(1)})`); }
    if (g === 'bark-invaders') { await p.waitForTimeout(1100); a = await st(); const R = await c('right'), A_ = await c('a'); await touch('touchStart', [R]); await p.waitForTimeout(300); await touch('touchMove', [R, { ...A_, id: 1 }]); await p.waitForTimeout(80); await touch('touchEnd', []); b = await st(); ok(b.p.x > a.p.x + 15 && b.shots >= 1, `iphone ${g}: hold right + tap A (multi-touch) moves and barks`); }
    if (g === 'pup-crossing') { await tap(await c('up')); await p.waitForTimeout(200); b = await st(); ok(b.row === 13, `iphone ${g}: tap up hops (row ${b.row})`); }
    if (g === 'street-sniffer') { await p.waitForTimeout(2200); a = await st(); await hold('left', 600); b = await st(); ok(b.p.x < a.p.x - 1, `iphone ${g}: d-pad steers (${a.p.x}->${b.p.x})`); }
    if (g === 'bone-breaker') { a = await st(); const L = await c('left'), R = await c('right'); await touch('touchStart', [L]); await p.waitForTimeout(250); await touch('touchMove', [R]); await p.waitForTimeout(400); const m = await st(); await touch('touchEnd', []); await tap(await c('a')); await p.waitForTimeout(80); b = await st(); ok(m.p.x > a.p.x - 10 && b.stuck === false, `iphone ${g}: slide left->right retargets, A serves`); }
    if (g === 'paw-fu-tower') { await p.waitForTimeout(2000); a = await st(); const R = await c('right'), B_ = await c('b'); ok(B_.x > 0 && B_.x < vp.width && B_.y < vp.height, 'iphone paw-fu-tower: B button on screen'); await touch('touchStart', [R]); await p.waitForTimeout(400); await touch('touchMove', [R, { ...B_, id: 1 }]); await p.waitForTimeout(80); await touch('touchMove', [R]); await p.waitForTimeout(300); await touch('touchEnd', []); b = await st(); const k = await p.evaluate(() => window.__arcade.cab.s.stats.kicks); ok(b.p.x > a.p.x + 5 && k >= 1, `iphone ${g}: hold right + tap B (multi-touch) walks and kicks (x ${a.p.x}->${b.p.x}, kicks ${k})`); }
    if (g === 'bone-digger') { await p.waitForTimeout(1900); a = await st(); const D = await c('down'), A_ = await c('a'); await touch('touchStart', [D]); await p.waitForTimeout(500); await touch('touchMove', [D, { ...A_, id: 1 }]); await p.waitForTimeout(80); await touch('touchMove', [D]); await p.waitForTimeout(300); await touch('touchEnd', []); b = await st(); const k = await p.evaluate(() => window.__arcade.cab.s.stats.pumps); ok(b.p.y > a.p.y + 5 && k >= 1, `iphone ${g}: hold down + tap A (multi-touch) digs and barks (y ${a.p.y}->${b.p.y}, pumps ${k})`); }
    if (g === 'pips-big-bark') { await p.waitForTimeout(2000); a = await st(); const R = await c('right'), A_ = await c('a'), B_ = await c('b'), C_ = await c('c'); ok([A_, B_, C_].every((q) => q.x > 0 && q.x < vp.width && q.y > 0 && q.y < vp.height), 'iphone pips-big-bark: A, B and C buttons on screen');
      await touch('touchStart', [R]); await p.waitForTimeout(300); await touch('touchMove', [R, { ...A_, id: 1 }]); await p.waitForTimeout(80); await touch('touchMove', [R]); await p.waitForTimeout(500); await touch('touchMove', [R, { ...B_, id: 2 }]); await p.waitForTimeout(80); await touch('touchMove', [R]); await p.waitForTimeout(250); await touch('touchMove', [R, { ...C_, id: 3 }]); await p.waitForTimeout(80); await touch('touchMove', [R]); await p.waitForTimeout(200); await touch('touchEnd', []);
      b = await st(); const q = await p.evaluate(() => window.__arcade.cab.s.stats); ok(b.p.x > a.p.x + 10 && q.yips >= 1 && q.booms >= 1, `iphone ${g}: hold right + tap A, B, C (multi-touch) runs, jumps, yips and throws (x ${a.p.x}->${b.p.x}, yips ${q.yips}, booms ${q.booms})`); }
    await p.waitForTimeout(900); await p.screenshot({ path: `proof/${tag}-iphone-${g}.png` });
    await p.evaluate(() => { const s = window.__arcade.cab.s; s.score += 500; s.over = true; }); await p.waitForTimeout(2600); ok((await st()).mode === 'initials', `iphone ${g}: initials after game over`);
    await tap(await c('up')); await tap(await c('a')); await tap(await c('a')); await tap(await c('a')); await p.waitForTimeout(300); b = await st(); ok(b.mode === 'results', `iphone ${g}: initials entered by touch`);
    if (g === 'bone-breaker') await p.screenshot({ path: `proof/${tag}-iphone-results.png` }); await p.evaluate(() => document.querySelector('#pclose').click());
  }
  await p.goto(URL + '/kibble-chomp'); await p.waitForTimeout(600); await tap(await c('right')); await p.waitForTimeout(100); ok((await st()).mode === 'title' && (await p.evaluate(() => window.__arcade.cab.gmode)) === 'inu', 'iphone: d-pad selects INU MODE');
  await tap(await c("start")); await p.waitForTimeout(2400); await tap(await c('a')); await p.waitForTimeout(80); ok((await p.evaluate(() => window.__arcade.cab.s.stats.barks)) === 1, 'iphone: A = bark stun in Inu Mode'); await p.waitForTimeout(500); await p.screenshot({ path: `proof/${tag}-iphone-inu-chomp.png` });
  const sel = await p.evaluate(() => [String(getSelection()), scrollX, scrollY, visualViewport.scale].join('|')); ok(sel === '|0|0|1', `iphone: no selection/scroll/zoom (${sel})`);
  ok(errs.length === 0, 'iphone: no page errors ' + errs.join(' | ')); await ctx.close();
}
await browser.close(); console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0);
