// "Alive" frame-cost check: hall (crowd, bulbs, motes, bands), every cabinet title screen (themed ambience), an attract loop
// and live play, at 4x CPU throttle. Viewports: 844x390 @2x (the perf-check phone-landscape size, mouse) and 390x844 @3x touch
// (the real portrait handheld). Full FX and Low FX. Usage: node scripts/alive-perf.mjs   (URL env = target, BUDGET env = p95 ms, REPEAT env = runs per scene, best p95 kept; default 3)
import { chromium } from 'playwright';
const URL = (process.env.URL || 'http://localhost:8140').replace(/\/$/, ''), BUDGET = Number(process.env.BUDGET || 8), FAST = !!process.env.FAST, REPEAT = Math.max(1, Number(process.env.REPEAT || 3));
const GAMES = ['kibble-chomp', 'bark-invaders', 'pup-crossing', 'bone-breaker', 'street-sniffer', 'paw-fu-tower', 'bone-digger', 'pips-big-bark', 'shiba-scuffle'];
const b = await chromium.launch(); let fail = 0; const rows = [];
const q = (a, k) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * k))] || 0; };
async function session(vp, low) {
  const ctx = await b.newContext({ viewport: vp.v, deviceScaleFactor: vp.dpr, hasTouch: !!vp.touch, isMobile: !!vp.touch }); const p = await ctx.newPage();
  await p.addInitScript((low) => { localStorage.setItem('inuarcade.fx.v1', JSON.stringify({ low })); const raf = window.requestAnimationFrame.bind(window); window.__cost = []; window.__on = false;
    window.requestAnimationFrame = (cb) => raf((t) => { const t0 = performance.now(); cb(t); if (window.__on) window.__cost.push(performance.now() - t0); }); }, low);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.goto(`${URL}/?demo=1`); await p.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // REPEAT runs of each scene; the best p95 is kept (other processes on a shared box only ever add time, never remove it).
  const once = async (ms, during) => { await p.evaluate(() => { window.__cost.length = 0; window.__on = true; }); if (during) await during(); else await p.waitForTimeout(ms); return p.evaluate(() => { window.__on = false; return window.__cost; }); };
  const measure = async (label, ms, during) => { let c = null, all = []; for (let i = 0; i < REPEAT; i++) { const x = await once(ms, during); all.push(q(x, 0.95)); if (!c || q(x, 0.95) < q(c, 0.95)) c = x; }
    const r = { label: `${vp.name} ${low ? 'lowFX' : 'fullFX'} ${label}`, frames: c.length, med: q(c, 0.5), p95: q(c, 0.95), max: Math.max(...c) }; const ok = r.p95 < BUDGET; if (!ok) fail++; rows.push({ ...r, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${r.label}: ${r.frames} frames, median ${r.med.toFixed(2)} ms, p95 ${r.p95.toFixed(2)} ms, max ${r.max.toFixed(1)} ms${REPEAT > 1 ? ` (best of ${REPEAT}; p95s ${all.map((v) => v.toFixed(1)).join('/')})` : ''}`); };
  await measure('hall (crowd+bulbs+bands, walking)', 0, async () => { for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) { await p.keyboard.down(k); await p.waitForTimeout(700); await p.keyboard.up(k); } await p.waitForTimeout(1500); });
  for (const g of FAST ? ['street-sniffer', 'shiba-scuffle'] : GAMES) { await p.evaluate((g) => window.history.pushState({}, '', '/' + g), g); await p.evaluate(() => dispatchEvent(new PopStateEvent('popstate'))); await p.waitForTimeout(400); await measure(`title ${g}`, 2000); }
  await p.waitForTimeout(6500); const mode = await p.evaluate(() => window.__arcade.cab?.mode); await measure(`attract (${mode}) shiba-scuffle`, 2500);
  await p.evaluate(() => { window.history.pushState({}, '', '/bone-digger'); dispatchEvent(new PopStateEvent('popstate')); }); await p.waitForTimeout(400); await p.keyboard.press('Space'); await p.waitForTimeout(800);
  await measure('play bone-digger', 0, async () => { for (let i = 0; i < 8; i++) { const k = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowDown'][i % 4]; await p.keyboard.down(k); await p.waitForTimeout(400); await p.keyboard.up(k); } });
  if (errs.length) { fail++; console.log('PAGE ERRORS', errs); } await ctx.close();
}
const VPS = [{ name: '844x390@2x', v: { width: 844, height: 390 }, dpr: 2 }, { name: '390x844@3x touch', v: { width: 390, height: 844 }, dpr: 3, touch: true }];
for (const vp of VPS) for (const low of [false, true]) await session(vp, low);
const worst = rows.reduce((a, r) => (r.p95 > a.p95 ? r : a), rows[0]); console.log(`\nWorst p95: ${worst.p95.toFixed(2)} ms (${worst.label}); budget ${BUDGET} ms; ${rows.filter((r) => r.ok).length}/${rows.length} PASS`);
await b.close(); process.exit(fail ? 1 : 0);
