// Pip's Big Bark art: original Inu pixel sprites (char grids -> cached canvases via pix.sprite), six parallax backdrops,
// cached per-level tile canvases and the in-play status strip. Nothing here is traced from or modelled on another game.
import { W, H, OY, VH, T, STAGES, LEVELS, KINDS, BOSSES, ZOOM, BARK, SNIFF, lit, blinking } from './pip.js';
const HEAD = ['.........o...o..', '.........oo.oo..', '........ooooooo.', '........oowooeo.', '........owwwwwwn', '.........owwww..'];
const HEAD_BARK = ['.........o...o..', '.........oo.oo..', '........ooooooo.', '........oowooeo.', '........owwwwwwn', '.........owwppw.', '..........www...'];
const HEAD_SNIFF = ['................', '.........o...o..', '.........oo.oo..', '........ooooooo.', '........oowooeoo', '........owwwwwwn'];
const TORSO = ['o.......rrrrrr..', 'oo.ooooorrrrrr..', '.oooooooooooo...', '..owwwwwwwwwo...'];
const LEGS = { stand: ['..oo.oo..oo.oo..', '..dd.dd..dd.dd..'], walk1: ['.oo...oo.oo...oo', '.dd....dd.dd...d'], walk2: ['...oooo...oooo..', '...dd.dd...dd.dd'], jump: ['...oooo..oooo...', '................'], fall: ['..oo......oo....', '.dd........dd...'] };
const PPAL = { o: '#e8892e', d: '#a85a1c', w: '#fbf1e0', e: '#1a1424', n: '#3a2430', p: '#f08a9a', r: '#e33b3b', R: '#9a1f2a' };
const SCARF = { red: ['#e33b3b', '#9a1f2a'], gold: ['#f2c14e', '#a8781c'], neon: ['#4ef0ff', '#ff4fd8'] };
const PUP = ['......c.c.', '.....cccc.', 'c....ccwec', 'cc.ccccwwn', '.cccccccc.', '..cwwwwc..', '..c.c.cc..'];
const PUP2 = ['......c.c.', '.....cccc.', 'c....ccwec', 'cc.ccccwwn', '.cccccccc.', '..cwwwwc..', '.c..c..c..'];
const PUP_PAL = { fetch: { c: '#f4ead8', w: '#ffffff', e: '#1a1424', n: '#3a2430' }, warn: { c: '#2a2238', w: '#d8a060', e: '#f2e14e', n: '#d8a060' }, sniff: { c: '#9a7a5a', w: '#e8d8c0', e: '#1a1424', n: '#3a2430' } };
const SPR = {
  rug: ['..mmmmmmmmmm..', '.mymmymmymmmmm', 'mmmmmmmmmmmrEm', 'mmymmymmymmrrm', '.mmmmmmmmmmmm.', '..kk......kk..'],
  rug2: ['..mmmmmmmmmm..', '.mmymmymmymmmm', 'mmmmmmmmmmmrEm', 'mymmymmymmmrrm', '.mmmmmmmmmmmm.', '...kk....kk...'],
  cat: ['.........c.c', 'c........ccc', 'c........cec', '.c..cccccccp', '..cccdcdcc..', '..cccccccc..', '..c.c..c.c..'],
  catWind: ['............', 'c.........c.c', '.c.......ccc', '..ccccccccec', '..cdcdccccpc', '.cc.c..c.cc.'],
  catPounce: ['..........c.c', 'c.........ccc', '.ccccccccccec', '..cdcdccccccp', '.cc.......cc.', 'c...........c'],
  pigeon: ['......kk....', '.....kkkek..', '.....kkkkyy.', '..ss.skkk...', 'gggggwkkk...', '.ggwwwwkk...', '...kkkkk....', '....y..y....'],
  pigeon2: ['......kk....', 'gg...kkkek..', '.ggg.kkkkyy.', '..gggskkk...', '...wwwkkk...', '...wwwwkk...', '...kkkkk....', '....y..y....'],
  clamShut: ['...ssssss...', '.ssSsSsSss..', 'ssssssssssss', 'SSSSSSSSSSSS', '.ssssssssss.'],
  clamOpen: ['...ssssss...', '.ssSsSsSss..', 's..........s', 's...wwww...s', 's..ewwwwe..s', 'SSSSSSSSSSSS', '.ssssssssss.'],
  wisp: ['...ff...', '..fyyf..', '.fyyyyf.', '.fywwyf.', 'fyyewyef', 'fyyyyyyf', '.fyyyyf.', '..f..f..'],
  bat: ['b........b', 'bb..bb..bb', 'bbbbbbbbbb', '.bbbebebb.', '...bbbb...'],
  batHang: ['...b..b...', '...bbbb...', '..bbebeb..', '..bbbbbb..', '...bbbb...', '....bb....'],
  kibble: ['.k.', 'kKk', '.k.'], coin: ['.yyyy.', 'yyKKyy', 'yKyyyy', 'yKyyyy', 'yyKKyy', '.yyyy.'], bone: ['ww....ww', 'wwwwwwww', 'ww....ww'],
  treat: ['..pppp..', '.pwwwwp.', 'pwrwwrwp', 'pwwwwwwp', '.bbbbbb.', 'bbbbbbbb', '.bbbbbb.'],
  pearl: ['.ww.', 'wwww', 'wwww', '.ww.'], ember: ['.f.', 'fyf', '.f.'], yarn: ['.rr.', 'rRrr', 'rrRr', '.rr.'], bomb: ['..y.', '.kk.', 'kkkk', 'kkkk', '.kk.'],
  foxfire: ['.bb.', 'bwwb', 'bwwb', '.bb.'], rock: ['.aaa.', 'aaaaa', 'aAaaa', '.aaa.'], capsule: ['.pppp.', 'pwwwwp', 'pwwwwp', 'mmmmmm', 'mmmmmm', '.mmmm.'],
};
const EPAL = { c: '#8a94b0', d: '#5a6280', e: '#f2e14e', p: '#f08a9a', m: '#9b59d6', y: '#f2c14e', r: '#3a2050', E: '#ff3d5a', k: '#2a2438', s: '#e8b8a0', S: '#b07a6a', g: '#7a8098', w: '#fbf1e0',
  f: '#ff8a3c', b: '#5a4a7a', K: '#a8781c', a: '#8a7a6a', A: '#5a4a3a', R: '#a02040' };
const PAL = { gull: { ...EPAL, k: '#f4f4f8', g: '#a8b0c0', s: '#f2c14e', y: '#f2a03c', e: '#1a1424' }, pigeon: { ...EPAL, k: '#8a90a8', s: '#5fd3a0', y: '#f2a03c', e: '#ff5d73' },
  item: { ...EPAL, k: '#c88a3c', K: '#8a5a1c', y: '#f2c14e', w: '#fbf1e0', p: '#ff9ad0', r: '#e33b3b', b: '#d8a060' }, shot: { ...EPAL, w: '#fbf1e0', b: '#7ef0ff', y: '#fff6c0', f: '#ff8a3c', r: '#e33b3b', R: '#9a1f2a', k: '#2a2438' } };
// bosses (drawn at 2x)
const BSPR = {
  scooter: ['.....kkkk.....', '.....kkkk.....', '....kkkkkk....', '..c.cccccc.c..', '..cccccccccc..', '..cwcceccecc..', '..ccccppcccc..', '...cccwwccc...', '....cccccc....', '...rrrrrrrr...', '..rrrrrrrrrr..', '..mmmmmmmmmm..', '.wm........mw.', '.k..........k.'],
  vac: ['......kk......', '.....kmmk.....', '...mmmmmmmm...', '..mmyyyyyymm..', '.mmyEyyyyEymm.', '.mmyyyyyyyymm.', '..mmmmmmmmmm..', '...mm....mm...', '....mm..mm....', '.....kkkk.....', '....kk..kk....'],
  croc: ['..........gggg', '.......ggggegg', '..gggggggggggg', 'ggGgGgGgggwwww', 'gggggggggggggg', '.gggggggggg...'],
  crocSnap: ['.........gggg.', '......ggggegg.', '...gggggggg.ww', '..gggGgGgg..w.', '.gggggggg.....', 'gggggggg..w...', '.ggggggggggwww', '..gggggggggg..'],
  fox: ['..w.w.........', '..www.........', '.wwwww.....y..', 'wwewwew...yyy.', '.wwwwwp...yfy.', '..wwww..wwyyy.', '..wwwwwwww.y..', '..wwwwwwww....', '..w.w..w.w....'],
  mole: ['....yyyy....', '...ykkkky...', '..aaaaaaaa..', '.aaaaaaaaaa.', '.aaeaaaaeaa.', '.aaaappaaaa.', 'aaaaawwaaaaa', 'aaaaaaaaaaaa', 'pp.aaaaaa.pp', '.p........p.'],
  boss: ['..c........c..', '.ccc......ccc.', '.cccccccccccc.', 'cccccccccccccc', 'cceeccccccceec', 'cccccccppccccc', 'ccccccwwwccccc', '.cyyyyyyyyyyc.', '..cccccccccc..'],
};
const BPAL = { scooter: { ...EPAL, c: '#e8a050', w: '#fbf1e0', k: '#2a2438', r: '#d6302f', m: '#7a8098', e: '#1a1424' }, vac: { ...EPAL, m: '#9b59d6', y: '#ff9ad0', E: '#ff3d5a', k: '#3a2a4a' },
  croc: { ...EPAL, g: '#4f9a6a', G: '#2f6a4a', e: '#f2e14e', w: '#fbf1e0' }, fox: { ...EPAL, w: '#f4f2ff', e: '#ff5d73', p: '#f08a9a', y: '#fff6c0', f: '#ff8a3c' },
  mole: { ...EPAL, a: '#6a5040', e: '#1a1424', p: '#f08a9a', w: '#fbf1e0', y: '#f2c14e', k: '#3a3040' }, boss: { ...EPAL, c: '#8a8a9a', e: '#f2e14e', p: '#f08a9a', w: '#fbf1e0', y: '#f2c14e' } };
// themes: sky gradient, far + near silhouettes, ground tiles
const TH = [
  { sky: ['#2a1450', '#ff8a5c'], far: '#5a2a6a', near: '#3a1a4a', top: '#d0603a', fill: '#7a3a3a', line: '#5a2a2a', lamp: '#fff6c0' },
  { sky: ['#6a4aa8', '#ffa8c8'], far: '#e890b8', near: '#b86a9a', top: '#5fd37a', fill: '#7a5a3a', line: '#5a3a2a', lamp: '#fff6c0' },
  { sky: ['#4ec8ff', '#c8f4ff'], far: '#7ad8f0', near: '#3aa0c8', top: '#f4d890', fill: '#d8b070', line: '#b08a50', lamp: '#fff6c0' },
  { sky: ['#0a0828', '#2a2060'], far: '#1a1848', near: '#121034', top: '#8a8aa8', fill: '#4a4a6a', line: '#3a3a52', lamp: '#ffb84e' },
  { sky: ['#1a1018', '#2a1a14'], far: '#2a1c18', near: '#1c1210', top: '#8a6a4a', fill: '#4a3424', line: '#2a1c14', lamp: '#f2c14e' },
  { sky: ['#06040f', '#1a0a30'], far: '#1a1440', near: '#120c2a', top: '#7a8098', fill: '#3a3a52', line: '#2a2a3a', lamp: '#ff4fd8' } ];
const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const bgCache = new Map(), tileCache = new Map();
function backdrop(th) {
  if (bgCache.has(th)) return bgCache.get(th); const t = TH[th], sky = mk(W, VH), g = sky.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, t.sky[0]); gr.addColorStop(1, t.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, VH);
  if (th === 0) { g.fillStyle = '#ffd08a'; g.beginPath(); g.arc(190, 150, 22, 0, 7); g.fill(); }
  if (th === 1) { g.fillStyle = '#fff6f8'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(30 + i * 52, 30 + (i % 2) * 14, 18, 6, 0, 0, 7); g.fill(); } }
  if (th === 2) { g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(200, 40, 16, 0, 7); g.fill(); }
  if (th === 3 || th === 5) { for (let i = 0; i < 40; i++) { g.fillStyle = i % 4 ? '#8a7ac4' : '#fbf1e0'; g.fillRect((i * 67) % W, (i * 41) % 150, 1, 1); } g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(60, 36, 10, 0, 7); g.fill(); g.fillStyle = t.sky[0]; g.beginPath(); g.arc(64, 33, 9, 0, 7); g.fill(); }
  if (th === 4) { g.fillStyle = '#3a2418'; for (let x = 0; x < W; x += 9) g.fillRect(x, 0, 6, 6 + ((x * 7) % 14)); }
  // far + near repeating strips (512 px wide)
  const strip = (col, seed, hi, kind) => { const c = mk(512, VH), q = c.getContext('2d'); q.fillStyle = col;
    for (let x = 0; x < 512;) { const w = 18 + ((x * seed) % 26), h = hi + ((x * 13 + seed * 7) % 40);
      if (kind === 'city') { q.fillRect(x, VH - h, w, h); q.fillStyle = t.lamp + '66'; for (let wy = VH - h + 4; wy < VH - 6; wy += 7) for (let wx = x + 3; wx < x + w - 3; wx += 5) if ((wx * 3 + wy) % 11 < 4) q.fillRect(wx, wy, 2, 3); q.fillStyle = col; }
      else if (kind === 'trees') { q.beginPath(); q.arc(x + w / 2, VH - h, w * 0.7, 0, 7); q.fill(); q.fillRect(x + w / 2 - 2, VH - h, 4, h); if (seed > 5) { q.fillStyle = '#ffd8ec'; for (let i = 0; i < 6; i++) q.fillRect(x + ((i * 7) % w), VH - h - 6 + ((i * 5) % 12), 2, 2); q.fillStyle = col; } }
      else if (kind === 'sea') { q.fillRect(x, VH - hi, w + 1, hi); q.fillStyle = '#ffffff55'; q.fillRect(x + 3, VH - hi + 4 + (x % 9), 6, 1); q.fillStyle = col; }
      else if (kind === 'hills') { q.beginPath(); q.moveTo(x - 20, VH); q.lineTo(x + w / 2, VH - h); q.lineTo(x + w + 20, VH); q.fill(); }
      else if (kind === 'cave') { q.beginPath(); q.moveTo(x, 0); q.lineTo(x + w / 2, h * 0.6); q.lineTo(x + w, 0); q.fill(); q.fillRect(x, VH - h / 3, w, h / 3); }
      else if (kind === 'tower') { q.fillRect(x, VH - h * 2, w, h * 2); q.fillStyle = (seed > 5 ? '#ff4fd8' : '#7ef0ff') + '55'; q.fillRect(x + 2, VH - h * 2 + 6, w - 4, 1); q.fillRect(x + 2, VH - h * 2 + 18, w - 4, 1); q.fillStyle = col; }
      x += w + 6 + ((x * 3) % 10); } return c; };
  const kinds = [['city', 'city'], ['trees', 'trees'], ['sea', 'hills'], ['hills', 'trees'], ['cave', 'cave'], ['tower', 'city']][th];
  const out = { sky, far: strip(t.far, 3, th === 2 ? 70 : 60, kinds[0]), near: strip(t.near, 7, th === 2 ? 40 : 30, kinds[1]) }; bgCache.set(th, out); return out;
}
function tileArt(g, ch, x, y, th, above) { const t = TH[th];
  if (ch === '#' || ch === 'S') { g.fillStyle = t.fill; g.fillRect(x, y, T, T); g.fillStyle = t.line; g.fillRect(x, y + 15, T, 1); g.fillRect(x + ((x >> 4) % 2 ? 4 : 11), y + 4, 1, 8);
    if (th === 4 && ((x * 7 + y * 3) >> 4) % 5 === 0) { g.fillStyle = '#c88a3c'; g.fillRect(x + 5, y + 6, 2, 2); g.fillRect(x + 9, y + 9, 2, 2); }
    if (th === 5) { g.fillStyle = '#ffffff14'; g.fillRect(x + 1, y + 1, 14, 1); g.fillStyle = '#00000033'; g.fillRect(x + 2, y + 6, 2, 2); g.fillRect(x + 12, y + 6, 2, 2); }
    if (!above) { g.fillStyle = t.top; g.fillRect(x, y, T, 4); g.fillStyle = '#ffffff33'; g.fillRect(x, y, T, 1); if (th === 1) { g.fillStyle = '#3aa05a'; g.fillRect(x + 3, y + 4, 2, 2); g.fillRect(x + 10, y + 4, 2, 1); } } }
  else if (ch === 'X') { g.fillStyle = '#a8703a'; g.fillRect(x + 1, y + 1, 14, 14); g.fillStyle = '#6a4220'; g.strokeStyle = '#6a4220'; g.fillRect(x + 1, y + 1, 14, 2); g.fillRect(x + 1, y + 13, 14, 2); g.beginPath(); g.moveTo(x + 2, y + 3); g.lineTo(x + 14, y + 13); g.stroke(); }
  else if (ch === 'Z') { g.fillStyle = '#d6302f'; g.fillRect(x + 2, y, 12, T); g.fillStyle = '#f2c14e'; for (let i = 0; i < 4; i++) g.fillRect(x + 2, y + i * 4, 12, 2); }
  else if (ch === '-') { g.fillStyle = '#5a4030'; for (let i = 0; i < 4; i++) g.fillRect(x + i * 4 + 1, y + 3, 2, 4); g.fillStyle = '#b8b8c8'; g.fillRect(x, y, T, 2); g.fillStyle = t.fill; g.fillRect(x, y + 7, T, 9); }
  else if (ch === '/') { g.fillStyle = '#b8b8c8'; g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x + T, y - 4); g.lineTo(x + T, y - 2); g.lineTo(x, y + 4); g.fill(); g.fillStyle = '#5a4030'; g.fillRect(x + 6, y - 1, 3, 8); g.fillStyle = t.fill; g.fillRect(x, y + 7, T, 9); }
  else if (ch === '=') { g.fillStyle = th === 5 ? '#7a8098' : '#a8703a'; g.fillRect(x, y, T, 5); g.fillStyle = '#ffffff44'; g.fillRect(x, y, T, 1); g.fillStyle = '#00000044'; g.fillRect(x, y + 4, T, 1); g.fillRect(x + 7, y + 1, 1, 3); }
  else if (ch === 'H') { g.fillStyle = '#5a6280'; g.fillRect(x, y, T, 3); g.fillStyle = '#f2c14e'; g.fillRect(x + 2, y, 4, 1); g.fillRect(x + 10, y, 4, 1); }
  else if (ch === '^') { g.fillStyle = '#c8ccdc'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x + i * 4, y + T); g.lineTo(x + i * 4 + 2, y + 8); g.lineTo(x + i * 4 + 4, y + T); g.fill(); } } }
const SOLIDISH = new Set(['#', 'S', 'X', 'Z', '-', '/']);
function tiles(stage) { if (tileCache.has(stage)) return tileCache.get(stage); const L = LEVELS[stage], th = STAGES[stage].theme, c = mk(L.cols * T, L.rows * T), g = c.getContext('2d');
  for (let r = 0; r < L.rows; r++) for (let col = 0; col < L.cols; col++) { const ch = L.grid[r][col]; if (ch === '.' || ch === 'S' || ch === 'G' || ch === 'L' || ch === '~') continue; tileArt(g, ch, col * T, r * T, th, r > 0 && SOLIDISH.has(L.grid[r - 1][col])); }
  tileCache.set(stage, c); return c; }
const lastAnim = new WeakMap();
function pipSprite(P, s, p) { const moving = lastAnim.get(s) !== p.anim; lastAnim.set(s, p.anim);
  const legs = p.cart ? 'stand' : !p.onG ? (p.vy < 0 || p.glide ? 'jump' : 'fall') : moving ? (Math.floor(p.anim / 6) % 2 ? 'walk1' : 'walk2') : 'stand';
  const head = p.bHold > 4 || p.yipCd > BARK.cd - 6 ? 'bark' : (p.sniffHold > 0 || (p.sniffT > 0 && !moving)) && p.onG ? 'sniff' : 'idle';
  const sk = SCARF[s.skin] || SCARF.red, hurt = p.hurtF > 0 || s.dying > 0;
  const pal = hurt ? { ...PPAL, o: '#ffd0c0', d: '#e09080', r: sk[0], R: sk[1] } : { ...PPAL, r: sk[0], R: sk[1] };
  const rows = [...(head === 'bark' ? HEAD_BARK : head === 'sniff' ? HEAD_SNIFF : HEAD), ...TORSO, ...LEGS[legs]];
  return P.sprite(`pip-${head}-${legs}-${s.skin || 'red'}${hurt ? 'h' : ''}`, rows, pal, { flip: p.face < 0 }); }
function scarf(ctx, s, p, x, y, now) { const sk = SCARF[s.skin] || SCARF.red, f = p.face, run = !p.onG || p.zoomT > 0, n = p.glide ? 16 : run ? 12 : 8, ph = now * (run ? 0.02 : 0.008);
  for (let i = 0; i < n; i++) { const yy = y + Math.round(Math.sin(ph + i * 0.55) * Math.min(2.5, i / 3)) + (p.glide ? -Math.round(i / 5) : run ? 0 : Math.round(i / 4)); const xx = x - f * (3 + i);
    ctx.fillStyle = '#1a1424'; ctx.fillRect(xx, yy - 1, 1, p.glide ? 5 : 4); ctx.fillStyle = sk[0]; ctx.fillRect(xx, yy, 1, p.glide ? 3 : 2); if (i % 3 === 2) { ctx.fillStyle = sk[1]; ctx.fillRect(xx, yy + (p.glide ? 2 : 1), 1, 1); } } }
function pup(ctx, P, kind, x, y, face, f) { const spr = P.sprite('pup-' + kind + (f ? 2 : 1), f ? PUP2 : PUP, PUP_PAL[kind] || PUP_PAL.fetch, { flip: face < 0 }); P.blit(ctx, spr, x - spr.width / 2, y - spr.height + 1); return spr; }
function tellMark(ctx, x, y, c = '#ff3d5a') { ctx.fillStyle = c; ctx.fillRect(x - 1, y - 6, 2, 4); ctx.fillRect(x - 1, y - 1, 2, 2); }
function stars(ctx, x, y, f) { ctx.fillStyle = '#f2c14e'; for (let i = 0; i < 3; i++) { const a = f / 8 + i * 2.1; ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(y + Math.sin(a) * 2), 2, 1); } }
function enemy(ctx, P, s, e) { if (e.flash && Math.floor(e.flash / 2) % 2) return; let k, pal = EPAL, x = e.x, y = e.y;
  if (e.type === 'rug') k = Math.floor(e.x / 4) % 2 ? 'rug' : 'rug2';
  else if (e.type === 'cat') k = e.st === 'wind' ? 'catWind' : e.st === 'pounce' ? 'catPounce' : 'cat';
  else if (e.type === 'pigeon' || e.type === 'gull') { k = Math.floor(s.frame / (e.st === 'coo' ? 3 : 7)) % 2 ? 'pigeon' : 'pigeon2'; pal = PAL[e.type]; }
  else if (e.type === 'clam') k = e.st === 'open' || e.stun > 0 ? 'clamOpen' : 'clamShut';
  else if (e.type === 'wisp') k = 'wisp'; else if (e.type === 'bat') k = e.st === 'hang' ? 'batHang' : 'bat';
  const spr = P.sprite('pe-' + e.type + k, SPR[k], pal, { flip: e.face < 0 }), fly = e.type === 'pigeon' || e.type === 'gull' || e.type === 'wisp' || e.type === 'bat';
  const bx = x - spr.width / 2 + (e.st === 'wind' && e.f % 4 < 2 ? 1 : 0), by = fly ? y - spr.height / 2 - 6 : y - spr.height + 1;
  if (e.type === 'wisp') { ctx.globalAlpha *= 0.65 + 0.35 * Math.sin(s.frame / 5); if (e.st === 'flare') { ctx.fillStyle = '#ff8a3c55'; ctx.beginPath(); ctx.arc(x, by + 5, 8 + (e.g % 6), 0, 7); ctx.fill(); } }
  P.blit(ctx, spr, bx, by); ctx.globalAlpha = s.storm?.on && !(s.p.sniffT > 0) ? 0.18 : 1;
  if (e.st === 'wind' || e.st === 'coo' || (e.type === 'clam' && e.st === 'open' && e.f < 24)) tellMark(ctx, x, by - 2);
  if (e.stun > 0) stars(ctx, x, by - 3, s.frame); }
function boss(ctx, P, s, B, now) { const A = s.lv.arena; if (B.flash && Math.floor(B.flash / 2) % 2) return;
  const big = (k, x, footY, flip = B.face < 0, sc = 2) => { const spr = P.sprite('pb-' + k, BSPR[k], BPAL[k === 'crocSnap' ? 'croc' : k], { flip }); P.blit(ctx, spr, x - (spr.width * sc) / 2, footY - spr.height * sc + 2, sc); return spr; };
  const dizzy = (x, y) => stars(ctx, x, y, s.frame);
  switch (B.kind) {
    case 'scooter': { if (B.st === 'intro' && B.f < 40) break; big('scooter', B.x, B.y); if (B.st === 'ride') { ctx.fillStyle = '#ffffff88'; for (let i = 1; i < 5; i++) ctx.fillRect(B.x - B.face * (16 + i * 6), B.y - 6 - i * 3, 5, 1); }
      if (B.st === 'rev') { ctx.fillStyle = '#c8ccdc'; ctx.beginPath(); ctx.arc(B.x - B.face * 18, B.y - 4 - (B.f % 10) / 2, 2 + (B.f % 10) / 3, 0, 7); ctx.fill(); if (Math.floor(B.f / 4) % 2) tellMark(ctx, B.x, B.y - 32); }
      if (B.st === 'skid') dizzy(B.x, B.y - 30); break; }
    case 'vac': { big('vac', B.x, B.y + 6, false); if (B.st === 'suck' || B.st === 'suckWind') { ctx.strokeStyle = B.st === 'suck' ? '#ffd8ec' : '#ffd8ec66'; for (let i = 0; i < 4; i++) { const r = 30 - ((s.frame * 2 + i * 8) % 30); ctx.beginPath(); ctx.arc(B.x, B.y + 8, r, 0.3, Math.PI - 0.3); ctx.stroke(); } if (B.st === 'suckWind') tellMark(ctx, B.x, B.y - 18); }
      if (B.st === 'tired') dizzy(B.x, B.y - 18); break; }
    case 'croc': { if (B.st === 'lurk' || B.st === 'intro') { ctx.fillStyle = '#7ef0ff'; const w = 10 + Math.round(Math.sin(s.frame / 6) * 3); ctx.fillRect(B.x - w, A.floor + 6, w * 2, 1); ctx.fillStyle = '#4f9a6a'; ctx.fillRect(B.x - 6, A.floor + 3, 4, 3); ctx.fillRect(B.x + 2, A.floor + 3, 4, 3); ctx.fillStyle = '#f2e14e'; ctx.fillRect(B.x - 5, A.floor + 3, 1, 1); ctx.fillRect(B.x + 4, A.floor + 3, 1, 1); if (B.f > 50 && Math.floor(B.f / 4) % 2) tellMark(ctx, B.x, A.floor - 4); break; }
      big(B.st === 'snap' ? 'crocSnap' : 'croc', B.x, B.y, B.st === 'snap' ? false : (B.side || 1) < 0); if (B.st === 'slap' && B.f < 24 && Math.floor(B.f / 4) % 2) tellMark(ctx, B.x, B.y - 18); if ((B.st === 'bask' && B.f > 20) || B.st === 'slap') stars(ctx, B.x, B.y - 16, s.frame); break; }
    case 'fox': { if (B.st === 'vanish') { ctx.fillStyle = '#fff6c0'; for (let i = 0; i < 6; i++) ctx.fillRect(B.x + Math.round(Math.cos(i + s.frame / 6) * 10), B.y - 10 + Math.round(Math.sin(i * 2 + s.frame / 5) * 8), 1, 1); break; }
      big('fox', B.x, B.y); if (B.st === 'crouch' && Math.floor(B.f / 3) % 2) tellMark(ctx, B.x, B.y - 22); if (B.st === 'fire') { ctx.fillStyle = '#7ef0ff66'; ctx.beginPath(); ctx.arc(B.x, B.y - 10, 4 + (B.f % 8), 0, 7); ctx.fill(); } if (B.st === 'dizzy') dizzy(B.x, B.y - 20); break; }
    case 'mole': { if (B.st === 'dig' || B.st === 'intro') { const sh = B.tellF ? (s.frame % 4 < 2 ? -1 : 1) : 0; ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.ellipse(B.x + sh, B.floor, 13, 6, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#8a6a4a'; for (let i = 0; i < 3; i++) ctx.fillRect(B.x - 9 + i * 7 + sh, B.floor - 4 - ((s.frame + i * 5) % 6), 2, 2); if (B.tellF && Math.floor(s.frame / 4) % 2) tellMark(ctx, B.x, B.floor - 10); break; }
      const spr = P.sprite('pb-mole', BSPR.mole, BPAL.mole); const hh = Math.min(spr.height * 2, Math.round((B.h / 24) * spr.height * 2)); ctx.drawImage(spr, 0, 0, spr.width, hh / 2, B.x - spr.width, B.floor - hh + 2, spr.width * 2, hh); if (B.st === 'stuck') dizzy(B.x, B.floor - hh - 2); break; }
    case 'claw': { const top = s.lv.tower ? A.top * T : 0; ctx.fillStyle = '#c8ccdc'; ctx.fillRect(B.x - 1, Math.min(top, B.y - 60), 2, B.y - 18 - Math.min(top, B.y - 60));
      const open = B.st === 'stuck' || B.st === 'capsules' ? 5 : B.st === 'drop' ? 2 : 0; ctx.fillStyle = '#7a8098'; ctx.fillRect(B.x - 8, B.y - 20, 16, 5); ctx.fillStyle = '#c8ccdc';
      for (const d of [-1, 1]) { ctx.fillRect(B.x + d * (6 + open) - 1, B.y - 16, 2, 10); ctx.fillRect(B.x + d * (4 + open) - 1, B.y - 7, 3, 2); }
      ctx.fillStyle = '#7ef0ff44'; ctx.beginPath(); ctx.arc(B.x, B.y - 30, 12, Math.PI, 0); ctx.fill(); big('boss', B.x, B.y - 18, false, 1);
      if (B.st === 'aim' && B.f > 40 && Math.floor(B.f / 4) % 2) { tellMark(ctx, B.x, B.y - 46); ctx.fillStyle = '#ff3d5a55'; ctx.fillRect(B.x - 10, B.floor - 2, 20, 2); }
      if (B.st === 'stuck') dizzy(B.x, B.y - 44); break; } } }
function clawFrame(ctx, s, now) { const A = s.lv.arena; if (!A || A.kind !== 'claw') return; const x0 = A.x0 + T, x1 = A.x0 + 15 * T, yT = A.top * T + 8, yB = A.floor;
  ctx.fillStyle = '#7ef0ff10'; ctx.fillRect(x0, yT, x1 - x0, yB - yT); ctx.fillStyle = '#ff4fd8'; for (let x = x0; x < x1; x += 12) if ((x / 12 + (s.frame >> 4)) % 3 === 0) ctx.fillRect(x, yT, 6, 2);
  ctx.fillStyle = '#7ef0ff33'; ctx.fillRect(x0 + 12, yT + 10, 2, yB - yT - 20); ctx.fillRect(x0 + 18, yT + 10, 1, yB - yT - 40); }
function dynTiles(ctx, s, th, c0, c1, r0, r1) { const t = TH[th];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const ch = s.grid[r]?.[c]; if (!ch || ch === '.') continue; const x = c * T, y = r * T;
    if (ch === 'S') { if (s.open.has(c + ',' + r)) { ctx.fillStyle = '#0a0612'; ctx.fillRect(x, y, T, T); ctx.fillStyle = t.line; ctx.fillRect(x, y, T, 2); }
      else { tileArt(ctx, '#', x, y, th, true); if (s.p.sniffT > 0 && Math.floor(s.frame / 6) % 2) { ctx.strokeStyle = '#fff6c0'; ctx.strokeRect(x + 2.5, y + 2.5, 11, 11); } } }
    else if (ch === 'G') { if (s.locked) { ctx.fillStyle = '#3a3a52'; ctx.fillRect(x + 2, y, 12, T); ctx.fillStyle = '#ff3d5a'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 3 + i * 4, y, 2, T); } }
    else if (ch === 'L') { const on = lit(s, c, r), bl = blinking(s, c, r) && Math.floor(s.frame / 5) % 2;
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x, y, T, 2); ctx.fillStyle = on && !bl ? t.lamp : '#5a4a3a'; ctx.fillRect(x + 2, y + 2, 12, 7); ctx.fillStyle = on && !bl ? '#ff6a3a' : '#3a2a2a'; ctx.fillRect(x + 2, y + 4, 12, 1); ctx.fillRect(x + 2, y + 7, 12, 1);
      if (on && !bl) { ctx.fillStyle = '#fff6c033'; ctx.fillRect(x - 2, y - 3, T + 4, 14); } }
    else if (ch === '~') { ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x, y + 1, T, 1); const k = (c * 7 + r) % 4; ctx.fillStyle = ['#ff9ad0', '#7ef0ff', '#f2c14e', '#fbf1e0'][k]; ctx.fillRect(x + 3, y + 2, 8, k % 2 ? 7 : 5); ctx.fillStyle = '#00000022'; ctx.fillRect(x + 3, y + 2, 8, 1); }
    else if (ch === 'H' && s.locked) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(x, y, T, 1); } } }
function itemArt(ctx, P, s, it) { const k = it.kind, spr = P.sprite('pi-' + k, SPR[k], PAL.item), bob = Math.round(Math.sin((s.frame + it.x) / 10) * (k === 'kibble' ? 1 : 2));
  if (k === 'coin' && Math.floor(s.frame / 8) % 4 === 0) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(it.x + 3, it.y - 6 + bob, 1, 1); }
  P.blit(ctx, spr, it.x - spr.width / 2, it.y - spr.height / 2 + bob); }
export function draw(ctx, s, now, P) {
  const st = STAGES[s.stage], th = st.theme, L = s.lv, cx = s.cam.x, cy = s.cam.y, p = s.p, bg = backdrop(th);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.drawImage(bg.sky, 0, OY);
  const vy = L.rows * T - VH, lift = vy > 0 ? Math.round((vy - cy) * 0.12) : 0, fx = Math.round(cx * 0.2) % 512, nx = Math.round(cx * 0.45) % 512;
  ctx.save(); ctx.beginPath(); ctx.rect(0, OY, W, VH); ctx.clip();
  ctx.drawImage(bg.far, -fx, OY + lift); ctx.drawImage(bg.far, 512 - fx, OY + lift); ctx.drawImage(bg.near, -nx, OY + lift * 2); ctx.drawImage(bg.near, 512 - nx, OY + lift * 2);
  ctx.translate(-cx, OY - cy);
  clawFrame(ctx, s, now);
  ctx.drawImage(tiles(s.stage), cx, cy, W, VH, cx, cy, W, VH);
  const c0 = Math.max(0, cx >> 4), c1 = Math.min(L.cols - 1, (cx + W) >> 4), r0 = Math.max(0, cy >> 4), r1 = Math.min(L.rows - 1, (cy + VH) >> 4); dynTiles(ctx, s, th, c0, c1, r0, r1);
  const vis = (x, y, m = 24) => x > cx - m && x < cx + W + m && y > cy - m && y < cy + VH + m;
  // checkpoints, cages, carts, traps, items
  for (const c of s.checks) if (vis(c.x, c.y)) { ctx.fillStyle = '#5a4030'; ctx.fillRect(c.x - 1, c.y - 26, 2, 26); ctx.fillStyle = c.on ? '#f2c14e' : '#8a7a6a'; ctx.fillRect(c.x - 4, c.y - 30, 8, 6); ctx.fillRect(c.x - 1, c.y - 24, 2, 2); if (c.on) { ctx.fillStyle = '#e33b3b'; ctx.fillRect(c.x + 1, c.y - 22, 8, 4); } }
  for (const c of s.cages) if (vis(c.x, c.y) && !c.open) { pup(ctx, P, 'fetch', c.x, c.y - 2, -1, Math.floor(s.frame / 20) % 2); ctx.fillStyle = '#8a90a8'; for (let i = 0; i < 5; i++) ctx.fillRect(c.x - 8 + i * 4, c.y - 16, 1, 16); ctx.fillRect(c.x - 9, c.y - 17, 18, 2); ctx.fillRect(c.x - 9, c.y - 1, 18, 1); if (Math.floor(s.frame / 30) % 3 === 0) { ctx.fillStyle = '#fbf1e0'; ctx.font = '6px Silkscreen, monospace'; ctx.fillText('HELP', c.x - 8, c.y - 20); } }
  for (const C of s.carts) if (C.st !== 'done' && vis(C.x, C.y)) { ctx.fillStyle = '#5a6280'; ctx.fillRect(C.x - 10, C.y - 9, 20, 7); ctx.fillStyle = '#8a90a8'; ctx.fillRect(C.x - 10, C.y - 9, 20, 2); ctx.fillStyle = '#1a1424'; ctx.fillRect(C.x - 8, C.y - 2, 4, 2); ctx.fillRect(C.x + 4, C.y - 2, 4, 2); if (C.st === 'idle') { ctx.fillStyle = '#c88a3c'; ctx.fillRect(C.x - 7, C.y - 11, 3, 2); ctx.fillRect(C.x, C.y - 12, 3, 3); } }
  for (const t of s.traps) if (t.st !== 'gone' && vis(t.x, t.y)) { const sh = t.st === 'shake' ? (s.frame % 4 < 2 ? -1 : 1) : 0; if (t.st !== 'fall') { ctx.fillStyle = '#c8ccdc'; ctx.fillRect(t.x, t.y0 - 40, 1, 40 - 10); } ctx.fillStyle = '#c86a3a'; ctx.fillRect(t.x - 5 + sh, t.y - 10, 10, 9); ctx.fillStyle = '#a04a2a'; ctx.fillRect(t.x - 6 + sh, t.y - 11, 12, 3); ctx.fillStyle = '#5fd37a'; ctx.fillRect(t.x - 3 + sh, t.y - 15, 2, 4); ctx.fillRect(t.x + 1 + sh, t.y - 14, 2, 3); if (t.st === 'shake') tellMark(ctx, t.x, t.y - 18); }
  for (const it of s.items) if (!it.got && !it.hidden && vis(it.x, it.y)) itemArt(ctx, P, s, it);
  if (p.sniffT > 0) { const r = s.pack.includes('sniff') ? SNIFF.rPerk : SNIFF.r; ctx.strokeStyle = `rgba(255,246,192,${0.25 + 0.15 * Math.sin(s.frame / 6)})`; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(p.x, p.y - 8, r * (0.9 + 0.1 * Math.sin(s.frame / 10)), 0, 7); ctx.stroke(); ctx.setLineDash([]);
    for (const it of s.items) if (!it.got && it.revealed && vis(it.x, it.y) && Math.floor(s.frame / 8) % 2) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(it.x - 1, it.y - 12, 2, 2); } }
  // enemies (petal storms hide them unless Pip is sniffing)
  ctx.globalAlpha = s.storm?.on && !(p.sniffT > 0) ? 0.18 : 1; for (const e of s.enemies) if (!e.gone && vis(e.x, e.y, 32)) enemy(ctx, P, s, e); ctx.globalAlpha = 1;
  if (s.boss) boss(ctx, P, s, s.boss, now);
  // shots, yips, big-bark waves, bone-erang
  for (const o of s.shots) { if (!vis(o.x, o.y)) continue; if (o.kind === 'wave') { ctx.fillStyle = '#7ef0ff'; ctx.beginPath(); ctx.ellipse(o.x, o.y + 4, 7, 7, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fbf1e0'; ctx.fillRect(o.x - 4, o.y - 3, 8, 1); continue; }
    if (o.kind === 'rock' && o.wait > 0) { ctx.fillStyle = '#8a7a6a'; ctx.fillRect(o.x - 1 + (s.frame % 3) - 1, o.y + ((s.frame * 3) % 12), 2, 2); continue; }
    const spr = P.sprite('ps-' + o.kind, SPR[o.kind], PAL.shot); P.blit(ctx, spr, o.x - spr.width / 2, o.y - spr.height / 2); }
  ctx.strokeStyle = '#fbf1e0'; ctx.lineWidth = 1; for (const y of s.yips) { const d = Math.sign(y.vx); for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(y.x - d * i * 4, y.y, 3 + i * 2, d > 0 ? -1 : Math.PI - 1, d > 0 ? 1 : Math.PI + 1); ctx.stroke(); } }
  for (const w of s.waves) { const k = w.f / 24; if (w.howl) { ctx.strokeStyle = `rgba(242,193,78,${Math.max(0, 1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w.x, w.y, 20 + w.f * 9, 0, 7); ctx.stroke(); }
    else { ctx.strokeStyle = `rgba(126,240,255,${Math.max(0, 1 - k)})`; ctx.lineWidth = 2; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(w.x + d * w.f * 5, w.y, 4 + w.f, BARK.row * 0.8, 0, d > 0 ? -1.2 : Math.PI - 1.2, d > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke(); } } ctx.lineWidth = 1; }
  if (s.bone) { const b = s.bone, spr = P.sprite('pi-bone', SPR.bone, PAL.item); ctx.save(); ctx.translate(b.x, b.y); ctx.rotate((b.f || 0) * 0.45); ctx.drawImage(spr, -spr.width / 2, -spr.height / 2); ctx.restore(); }
  // followers trail Pip; pups sent home run off-screen
  for (let i = s.pack.length - 1; i >= 0; i--) { const t = s.trail[Math.min(s.trail.length - 1, 14 * (i + 1))] || p; pup(ctx, P, s.pack[i], t.x, t.y, t.face, t.onG && Math.floor((s.frame + i * 7) / 8) % 2); }
  for (const h of s.home) { ctx.globalAlpha = Math.max(0, Math.min(1, h.t / 60)); pup(ctx, P, h.kind, h.x, h.y, h.dir, Math.floor(s.frame / 4) % 2); ctx.globalAlpha = 1; }
  // Pip
  const blink = p.inv > 0 && !s.ready && !s.dying && Math.floor(s.frame / 4) % 2;
  if (!blink) { const spr = pipSprite(P, s, p); const dy = s.dying ? -Math.round(Math.sin(Math.min(1, (60 - Math.min(60, s.dying)) / 30) * Math.PI) * 18) : 0, x = Math.round(p.x - spr.width / 2), y = p.y - spr.height + 1 + dy;
    if (p.zoomT > 0) { ctx.globalAlpha = 0.3; for (const k of [6, 12]) { const t = s.trail[k]; if (t) P.blit(ctx, spr, t.x - spr.width / 2, t.y - spr.height + 1); } ctx.globalAlpha = 1; ctx.fillStyle = '#7ef0ff'; for (let i = 0; i < 3; i++) ctx.fillRect(p.x - p.face * (12 + i * 5), p.y - 4 - i * 4, 6, 1); }
    scarf(ctx, s, p, Math.round(p.x - p.face * 1), y + 7, now); P.blit(ctx, spr, x, y);
    if (p.cart) { ctx.fillStyle = '#5a6280'; ctx.fillRect(p.cart.x - 10, p.cart.y - 9, 20, 7); ctx.fillStyle = '#8a90a8'; ctx.fillRect(p.cart.x - 10, p.cart.y - 9, 20, 2); ctx.fillStyle = '#1a1424'; ctx.fillRect(p.cart.x - 8, p.cart.y - 2, 4, 2); ctx.fillRect(p.cart.x + 4, p.cart.y - 2, 4, 2); }
    if (p.bHold > 6) { const full = p.bHold >= BARK.charge; ctx.fillStyle = full ? (Math.floor(s.frame / 3) % 2 ? '#7ef0ff' : '#fbf1e0') : '#7ef0ff88'; ctx.fillRect(p.x - 7, y - 4, Math.min(14, Math.round((14 * p.bHold) / BARK.charge)), 2); }
    if (p.sniffHold > 0 && p.sniffT <= 0) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(p.x - 7, y - 4, Math.round((14 * p.sniffHold) / SNIFF.hold), 1); }
    if (p.breath > 40) { ctx.fillStyle = '#c8f4ff'; for (let i = 0; i < 3; i++) ctx.fillRect(p.x + p.face * 6 + (i % 2), y - 4 - ((s.frame + i * 9) % 14), 2, 2); } }
  // tide + petal storm
  if (s.tide) { ctx.fillStyle = '#3aa0e855'; ctx.fillRect(cx, s.tide.y, W, cy + VH - s.tide.y); ctx.fillStyle = '#c8f4ffaa'; for (let x = cx - (cx % 8); x < cx + W; x += 8) ctx.fillRect(x + ((s.frame >> 3) % 8), s.tide.y + (((x >> 3) + (s.frame >> 4)) % 2), 5, 1); }
  ctx.restore();
  if (s.storm && (s.storm.on || s.storm.warn)) { const n = s.storm.on ? 70 : 12; if (s.storm.on) { ctx.fillStyle = '#ffb8d818'; ctx.fillRect(0, OY, W, VH); } for (let i = 0; i < n; i++) { const x = (W + 40 - ((s.frame * (3 + (i % 3)) + i * 53) % (W + 60))) | 0, y = OY + ((i * 37 + Math.floor(Math.sin((s.frame + i * 20) / 30) * 8)) % VH + VH) % VH; ctx.fillStyle = i % 3 ? '#ffb8d8' : '#fff0f6'; ctx.fillRect(x, y, 2, 1 + (i % 2)); } }
  hud(ctx, s, P);
}
function hud(ctx, s, P) { const p = s.p, B = s.boss, y = OY + 2; ctx.font = '6px Silkscreen, monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = '#0008'; ctx.fillRect(2, y - 1, 252, 9);
  for (let i = 0; i < 5; i++) { const k = s.pack[i]; ctx.fillStyle = k ? (PUP_PAL[k].c) : '#2a2440'; ctx.fillRect(5 + i * 8, y + 1, 6, 5); if (k) { ctx.fillStyle = '#1a1424'; ctx.fillRect(9 + i * 8, y + 2, 1, 1); ctx.fillStyle = PUP_PAL[k].c; ctx.fillRect(5 + i * 8, y, 1, 1); ctx.fillRect(9 + i * 8, y, 1, 1); } }
  const full = p.zoom >= ZOOM.full, zx = 50; ctx.fillStyle = '#b0a4e8'; ctx.fillText('ZOOM', zx, y + 6); ctx.fillStyle = '#2a2440'; ctx.fillRect(zx + 22, y + 1, 40, 5);
  ctx.fillStyle = p.zoomT > 0 ? '#ff9ad0' : full ? (Math.floor(s.frame / 8) % 2 ? '#7ef0ff' : '#fbf1e0') : '#3aa0c8'; ctx.fillRect(zx + 22, y + 1, p.zoomT > 0 ? Math.round((40 * p.zoomT) / ZOOM.dur) : Math.round((40 * p.zoom) / ZOOM.full), 5);
  if (full && p.zoomT <= 0) { ctx.fillStyle = '#7ef0ff'; ctx.fillText('UP!', zx + 65, y + 6); }
  ctx.fillStyle = p.sniffCd > 0 ? '#5a4a6a' : '#fff6c0'; ctx.fillText(p.sniffT > 0 ? 'SNIFF*' : 'SNIFF', 134, y + 6);
  ctx.fillStyle = '#b0a4e8'; ctx.fillText(`${s.stage + 1}-${s.loop}`, 170, y + 6);
  const secs = Math.max(0, Math.ceil(s.timer / 60)); ctx.fillStyle = secs <= 20 && Math.floor(s.frame / 15) % 2 ? '#ff3d5a' : '#f2c14e'; ctx.fillText('TIME ' + String(secs).padStart(3, '0'), 214, y + 6);
  if (B) { ctx.fillStyle = '#000a'; ctx.fillRect(40, OY + 12, W - 80, 9); ctx.fillStyle = '#3a1020'; ctx.fillRect(42, OY + 14, W - 84, 5); ctx.fillStyle = BOSSES[B.kind].mini ? '#ff9ad0' : '#ff3d5a'; ctx.fillRect(42, OY + 14, ((W - 84) * Math.max(0, B.hp)) / B.maxHp, 5); ctx.fillStyle = '#fbf1e0'; ctx.fillText(B.name, 44, OY + 19); }
  ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'center';
  if (s.ready > 0) { ctx.fillStyle = '#ff4f4f'; ctx.fillText(p.inv > 60 && s.stageT > 0 ? 'READY!' : `STAGE ${s.stage + 1}`, W / 2, OY + 100); ctx.font = '6px Silkscreen, monospace'; ctx.fillStyle = '#fbf1e0'; ctx.fillText(STAGES[s.stage].name + (s.loop > 1 ? ` · LAP ${s.loop}` : ''), W / 2, OY + 112); }
  if (B && B.st === 'intro' && !(s.ready > 0)) { ctx.fillStyle = '#ff3d5a'; ctx.fillText(B.name, W / 2, OY + 60); ctx.font = '6px Silkscreen, monospace'; ctx.fillStyle = '#fbf1e0'; ctx.fillText(BOSSES[B.kind].title.toUpperCase(), W / 2, OY + 70); ctx.font = '8px "Press Start 2P", monospace'; }
  if (s.clearing > 0 && s.clearInfo) { ctx.fillStyle = '#f2c14e'; ctx.fillText('STAGE CLEAR!', W / 2, OY + 86); ctx.font = '6px Silkscreen, monospace'; ctx.fillStyle = '#fbf1e0'; ctx.fillText(`TIME BONUS ${s.clearInfo.tb}`, W / 2, OY + 100); ctx.fillText(`PACK BONUS ${s.clearInfo.pb}`, W / 2, OY + 110); ctx.fillStyle = '#7ef0ff'; ctx.fillText('THE PACK HEADS HOME!', W / 2, OY + 124); }
  ctx.textAlign = 'left'; }
