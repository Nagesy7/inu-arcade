import { chromium } from 'playwright';
const U='http://localhost:8140', D='/workspace/inu-arcade-shots/', T=process.env.T||'after';
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await p.goto(U+'/'); await p.waitForTimeout(900); await p.screenshot({path:D+T+'-hub.png'});
const info=await p.evaluate(()=>{const r=document.querySelector('#screen').getBoundingClientRect();const pad=[...document.querySelectorAll('#pad b')].map(e=>{const q=e.getBoundingClientRect();return [e.dataset.k,q.x|0,q.y|0,q.width|0,q.height|0]});const bar=document.querySelector('#bar').getBoundingClientRect();return {cv:[r.x|0,r.y|0,r.width|0,r.height|0],pad,bar:[bar.x|0,bar.y|0,bar.width|0,bar.height|0]}});
console.log(JSON.stringify(info));
for (const g of ['kibble-chomp','bark-invaders','pup-crossing','bone-breaker']) for (const m of ['classic','inu']) {
  await p.goto(U+'/'+g); await p.waitForTimeout(600);
  if (m==='inu') await p.evaluate(()=>window.__arcade.cab.gmode='inu');
  const a=await p.locator('[data-k=start]').first(); await a.tap(); await p.waitForTimeout(400);
  const k=['left','right','up','a'];for(const x of k){await p.locator(`#pad [data-k=${x}]`).first().tap();await p.waitForTimeout(150);}
  await p.waitForTimeout(1200);
  const s=await p.evaluate(()=>({mode:window.__arcade.cab.mode,g:window.__arcade.cab.gmode,ac:window.__arcade.audioState()}));
  console.log(g,m,JSON.stringify(s)); await p.screenshot({path:`${D}${T}-${g}-${m}.png`});
}
console.log('errs',errs); await b.close();
