// Renders 1200x630 share cards into og/ from the live title screens.
import { chromium } from 'playwright'; import { execSync } from 'node:child_process';
const URL = process.env.URL || 'http://localhost:8140'; const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 720 } });
for (const id of ['arcade', 'kibble-chomp', 'bark-invaders', 'pup-crossing', 'bone-breaker', 'street-sniffer']) {
  await p.goto(URL + (id === 'arcade' ? '/' : '/' + id)); await p.waitForTimeout(900); await p.locator('#screen').screenshot({ path: `/tmp/og-${id}.png` });
  execSync(`python3 -c "from PIL import Image; im=Image.open('/tmp/og-${id}.png').convert('RGB'); w,h=im.size; im=im.resize((1200,675),Image.NEAREST); im.crop((0,22,1200,652)).save('og/${id}.png')"`);
}
await b.close(); console.log('og cards written');
