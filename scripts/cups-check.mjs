// /cups layout check: 🏠 (top-left), kibble-pay wallet pill (top-right) and the cups toolbar never overlap, each is the top
// element at its centre, and the page is readable at phone landscape 844x390 (no page-level horizontal overflow).
// URL=<arcade> API=<kibble-pay> TIDS=a,b TAG=cups node scripts/cups-check.mjs  -> /workspace/inu-arcade-shots/<TAG>-*.png
import { chromium } from 'playwright';
const U = process.env.URL || 'http://localhost:8150', API = process.env.API || '', D = '/workspace/inu-arcade-shots/', TAG = process.env.TAG || 'cups';
const TIDS = (process.env.TIDS || '').split(',').filter(Boolean);
const VPS = [['844x390', 844, 390, true], ['390x844', 390, 844, true], ['desktop', 1280, 800, false]];
const fails = []; const ok = (c, m) => { if (!c) { fails.push(m); console.log('FAIL ' + m); } };
const b = await chromium.launch(); let shots = [];
for (const [name, w, h, touch] of VPS) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  for (const view of ['list', ...TIDS, ...(name === '844x390' && TIDS[0] ? ['match:' + TIDS[0]] : [])]) {
    const tid = view.startsWith('match:') ? view.slice(6) : view === 'list' ? '' : view;
    await p.goto(`${U}/cups/?${tid ? 'tid=' + tid + '&' : ''}${API ? 'api=' + encodeURIComponent(API) : ''}`);
    await p.waitForSelector('#inu-wallet-btn', { timeout: 15000 }).catch(() => {}); await p.waitForSelector('#main .card, #main .bracket, #main .empty, #main .hd', { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(700);
    if (view.startsWith('match:')) { await p.click('.m[data-mid]').catch(() => {}); await p.waitForTimeout(300); }
    const r = await p.evaluate(() => { const R = (e) => { const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; };
      const items = [['wallet', document.querySelector('#inu-wallet-btn')], ['home', document.querySelector('#inu-home')], ['title', document.querySelector('#top h1')], ...[...document.querySelectorAll('#bar .tb')].map((e, i) => ['bar' + i, e])].filter(([, e]) => e);
      return { items: items.map(([k, e]) => { const q = R(e), t = document.elementFromPoint(q.x + q.w / 2, q.y + q.h / 2); return { k, ...q, top: !!t && (t === e || e.contains(t)) }; }),
        overflow: document.documentElement.scrollWidth - innerWidth, modal: !document.querySelector('#detail').hidden }; });
    const X = (a, c) => a.x < c.x + c.w - 0.5 && c.x < a.x + a.w - 0.5 && a.y < c.y + c.h - 0.5 && c.y < a.y + a.h - 0.5;
    const tag = `${name} ${view}`;
    ok(r.items.some((i) => i.k === 'wallet') && r.items.some((i) => i.k === 'home'), `${tag}: wallet pill + 🏠 present`);
    if (!r.modal) for (const i of r.items) ok(i.top, `${tag}: ${i.k} visible (not covered)`);
    for (let a = 0; a < r.items.length; a++) for (let c = a + 1; c < r.items.length; c++) ok(!X(r.items[a], r.items[c]), `${tag}: ${r.items[a].k} vs ${r.items[c].k} no overlap`);
    ok(r.overflow <= 1, `${tag}: no page-level horizontal overflow (${r.overflow}px)`);
    const f = `${D}${TAG}-${name}-${view.replace(/[:]/g, '-')}.png`; await p.screenshot({ path: f }); shots.push(f);
  }
  await ctx.close();
}
await b.close(); console.log(shots.join('\n')); console.log(fails.length ? `FAILED ${fails.length}` : `cups-check: all passed (${shots.length} views)`); process.exit(fails.length ? 1 : 0);
