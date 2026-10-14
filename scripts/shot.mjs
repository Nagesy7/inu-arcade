import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:8140' + (process.argv[2] || '/')); await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/s.png' }); console.log(errs); await b.close();
