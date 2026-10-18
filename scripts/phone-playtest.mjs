import { chromium } from 'playwright';
const U=process.env.URL||'http://localhost:8140', D='/workspace/inu-arcade-shots/', T=process.env.T||'after';
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2,...(process.env.STATE?{storageState:process.env.STATE}:{})});
const JOY=process.env.JOY==='1'; // JOY=1: run with Settings > Joystick controls ON (directions via the stick, multi-touch)
const p=await ctx.newPage(); if(JOY) await p.addInitScript(()=>localStorage.setItem('inuarcade.settings.v1','{"joystick":true}'));
const nav=async(url)=>{await p.goto(url);if(process.env.SHARE&&/vercel\.com|Login/.test(p.url()+await p.title())){await p.goto(process.env.SHARE);await p.goto(url);}}; // protected preview: SHARE link sets the bypass cookie
const cdp=await ctx.newCDPSession(p); const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i+1}))});
const stick=async(k)=>{const q=await p.locator('#joy').boundingBox();const cx=q.x+q.width/2,cy=q.y+q.height/2,o={left:[-36,0],right:[36,0],up:[0,-36],down:[0,36]}[k];
  if(k==='a'){const a=await p.locator('#pad [data-k=a]').boundingBox();await touch('touchStart',[[cx,cy]]);await touch('touchMove',[[cx+30,cy]]);await touch('touchStart',[[cx+30,cy],[a.x+a.width/2,a.y+a.height/2]]);await p.waitForTimeout(80);
    const h=await p.evaluate(()=>[...window.__arcade.input.held].sort().join('+'));console.log('  multi-touch held:',h);if(h!=='a+right')errs.push('multi-touch move+fire failed: '+h);await touch('touchEnd',[]);return;}
  await touch('touchStart',[[cx,cy]]);await touch('touchMove',[[cx+o[0],cy+o[1]]]);await p.waitForTimeout(120);await touch('touchEnd',[]);}; const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await nav(U+'/'); await p.waitForTimeout(900); await p.screenshot({path:D+T+'-hub.png'});
const info=await p.evaluate(()=>{const r=document.querySelector('#screen').getBoundingClientRect();const pad=[...document.querySelectorAll('#pad b')].map(e=>{const q=e.getBoundingClientRect();return [e.dataset.k,q.x|0,q.y|0,q.width|0,q.height|0]});const bar=document.querySelector('#bar').getBoundingClientRect();return {cv:[r.x|0,r.y|0,r.width|0,r.height|0],pad,bar:[bar.x|0,bar.y|0,bar.width|0,bar.height|0]}});
console.log(JSON.stringify(info));
for (const g of ['kibble-chomp','bark-invaders','pup-crossing','bone-breaker']) for (const m of ['classic','inu']) {
  await nav(U+'/'+g); await p.waitForTimeout(600);
  if (m==='inu') await p.evaluate(()=>window.__arcade.cab.gmode='inu');
  const a=await p.locator('[data-k=start]').first(); await a.tap(); await p.waitForTimeout(400);
  const k=['left','right','up','a'];for(const x of k){if(JOY)await stick(x);else await p.locator(`#pad [data-k=${x}]`).first().tap();await p.waitForTimeout(150);}
  await p.waitForTimeout(1200);
  const s=await p.evaluate(()=>({joy:document.body.classList.contains('joy'),mode:window.__arcade.cab.mode,g:window.__arcade.cab.gmode,ac:window.__arcade.audioState()}));
  console.log(g,m,JSON.stringify(s)); await p.screenshot({path:`${D}${T}-${g}-${m}.png`});
}
console.log('errs',errs); await b.close(); if(errs.length) process.exit(1);
