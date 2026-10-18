// Frame-cost check: phone-landscape viewport, 4x CPU throttle (CDP), headless Chromium. Times every rAF callback (game step +
// draw + HUD) while a real match plays, plus the rAF interval. Usage: node scripts/perf-check.mjs [game ...]  (URL env = target)
import { chromium } from 'playwright';
const URL = (process.env.URL || 'http://localhost:8140').replace(/\/$/, ''), GAMES = process.argv.slice(2).length ? process.argv.slice(2) : ['shiba-scuffle'];
const BUDGET_P95 = Number(process.env.BUDGET || 8); // ms of main-thread work per frame at 4x throttle (16.7 ms frame)
const b = await chromium.launch(); let fail = 0;
for (const g of GAMES) {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: false }); const p = await ctx.newPage();
  await p.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__cost = []; window.__gap = []; let last = 0;
    window.requestAnimationFrame = (cb) => raf((t) => { if (last) window.__gap.push(t - last); last = t; const t0 = performance.now(); cb(t); if (window.__on) window.__cost.push(performance.now() - t0); }); });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${URL}/${g}?demo=1`); await p.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.keyboard.press('Space'); await p.waitForTimeout(600); await p.keyboard.press('Space'); await p.waitForTimeout(2500); // pick -> ready -> fight
  if (g === 'fud-swarm') await p.evaluate(() => { // worst case: jump to 9:00 (director targets the enemy cap), full crumb pool, a boss, 4 maxed tricks; no level-up pauses, pup can't die
    const s = window.__arcade.cab.s; s.t = 540; s.stats.secs = 540; s.nextBoss = 541; s.swarmT = 541; s.p.xp = -1e9; s.p.maxHp = s.p.hp = 1e9; s.wep = { bark: 5, bone: 5, orbit: 5, gaze: 5 }; s.pas = { paws: 5 };
    for (let i = s.X.n; i < s.X.cap; i++) { const c = s.X.a[s.X.n++]; c.x = s.p.x + (Math.random() - 0.5) * 500; c.y = s.p.y + (Math.random() - 0.5) * 500; c.v = 1; c.fly = false; } });
  if (g === 'fud-swarm') await p.waitForTimeout(3000); // let the swarm fill in
  await p.evaluate(() => { window.__cost.length = 0; window.__gap.length = 0; window.__on = true; });
  const keys = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']; await p.keyboard.down('Space');
  for (let i = 0; i < 12; i++) { await p.keyboard.down(keys[i % 4]); await p.waitForTimeout(500); await p.keyboard.up(keys[i % 4]); if (i % 3 === 2) { await p.keyboard.press('KeyX'); await p.keyboard.press('KeyV'); } }
  await p.keyboard.up('Space');
  const r = await p.evaluate(() => { const q = (a, k) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * k))]; };
    return { frames: window.__cost.length, med: q(window.__cost, 0.5), p95: q(window.__cost, 0.95), max: Math.max(...window.__cost), gapMed: q(window.__gap, 0.5), gapP95: q(window.__gap, 0.95), phase: window.__inu?.A?.cab?.s?.phase, ents: window.__arcade?.cab?.s?.E ? ['E', 'X', 'S', 'Q', 'Z'].map((k) => k + window.__arcade.cab.s[k].n).join(' ') : '' }; });
  const ok = r.p95 < BUDGET_P95 && !errs.length; if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${g} @4x CPU, 844x390 @2x: ${r.frames} frames, frame cost median ${r.med.toFixed(2)} ms, p95 ${r.p95.toFixed(2)} ms, max ${r.max.toFixed(1)} ms; rAF interval median ${r.gapMed.toFixed(1)} ms, p95 ${r.gapP95.toFixed(1)} ms (~${(1000 / r.gapMed).toFixed(0)} fps)${r.ents ? ' entities ' + r.ents : ''}${errs.length ? ' errors ' + errs.join(' | ') : ''}`);
  await ctx.close(); }
await b.close(); process.exit(fail ? 1 : 0);
