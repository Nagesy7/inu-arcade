// Paw-Fu Tower art: original Inu pixel sprites (char grids -> cached canvases via pix.sprite) and the tower backdrop.
import { W, H, OY, ROWS, COLS, MAPS, STAGES, ROOF, HP_MAX, ZEN, BOSSES, attackBox, cleared, koLeft } from './pawfu.js';
const HEAD = ['....o..o......', '...oo.oo......', '..rrrrrrr.....', 'rr.oooooeo....', '.r.oooooowwn..', '...oooowwww...', '....ooowww....', '......oo......'];
const HEAD_BACK = ['...o.....o....', '...oo...oo....', '...ooooooo....', '..rrrrrrrrr...', '...ooooooo.rr.', '...ooooooo..r.', '....ooooo.....', '......o.......'];
const BODY = {
  stand: ['....gggggg....', '...gGggggGg...', '...o.gggg.o...', '....rrrrrr....', '....gggggg....', '....gg..gg....', '....gg..gg....', '...ooo..ooo...'],
  walk: ['....gggggg....', '...gGggggGg...', '...o.gggg.o...', '....rrrrrr....', '....gggggg....', '...gg....gg...', '..gg......gg..', '..oo......oo..'],
  jab: ['....gggggg....', '...gGgggggggoo', '...o.gggg.....', '....rrrrrr....', '....gggggg....', '...gg...gg....', '..gg.....gg...', '..oo.....oo...'],
  kick: ['....gggggg....', '...gGggggGg...', '...o.gggg.o...', '....rrrrrr....', '....ggggggggoo', '....gg........', '....gg........', '...ooo........'],
  jump: ['....gggggg....', '..ogGggggGgo..', '....gggggg....', '....rrrrrr....', '...gggggggg...', '...gg....gg...', '....oo..oo....', '..............'],
  sky: ['....gggggg....', '...gGggggGg...', '...o.gggg.o...', '....rrrrrr....', '.....ggggg....', '....gg..ggg...', '...oo.....gg..', '...........goo'],
  climb: ['..o.gggggg....', '..ggGggggGg...', '....gggggg.o..', '....rrrrrr....', '....gggggg....', '....gg..gg....', '....gg...gg...', '....oo...oo...'],
};
const CROUCH = { crouch: ['...gGggggGg...', '...o.rrrr.o...', '..ggggggggg...', '..ooo....ooo..'], sweep: ['...gGggggGg...', '...o.rrrr.....', '..gggggggggggo', '..ooo.........'], lowjab: ['...gGggggggoo.', '...o.rrrr.....', '..ggggggggg...', '..ooo....ooo..'] };
const FPAL = { o: '#e0802c', d: '#b65a1c', w: '#fbf1e0', g: '#f4f2ff', G: '#b8b4d8', r: '#d6302f', e: '#1a1424', n: '#3a2430' };
const SPR = {
  cat: ['............o.', 'c..........cc.', 'c.........cccc', 'c.........cecc', '.c.cccccccccpc', '..ccdccdcccc..', '..cccccccccc..', '..cc.cc..cc.c.', '..c...c...c..c'],
  catWind: ['c.............', 'cc............', '.cc......o.o..', '..cccc...cccc.', '..ccccccccecc.', '..cdccdccccpc.', '..cccccccccc..', '.cc.c..c.cc...'],
  catPounce: ['...........o.o', 'c..........ccc', '.cccccccccccec', '..cdccdcccccpc', '.cc.......cc..', 'cc..........cc'],
  rug: ['..mmmmmmmmmm..', '.mymmymmymmmmm', 'mmmmmmmmmmmmrE', 'mmymmymmymmmrr', 'mmmmmmmmmmmmmm', '.mymmymmymmmm.', '..mmmmmmmmmm..'],
  rug2: ['..mmmmmmmmmm..', '.mmymmymmymmmm', 'mmmmmmmmmmmmrE', 'mmmymmymmymmrr', 'mmmmmmmmmmmmmm', '.mmymmymmymmm.', '..mmmmmmmmmm..'],
  pigeon: ['......kk....', '.....kkkek..', '.....kkkkyy.', '..ss.skkk...', 'gggggwkkk...', '.ggwwwwkk...', '...kkkkk....', '....y..y....'],
  pigeon2: ['......kk....', 'gg...kkkek..', '.ggg.kkkkyy.', '..gggskkk...', '...wwwkkk...', '...wwwwkk...', '...kkkkk....', '....y..y....'],
  rat: ['.....aa.....', '....aaaa....', '...kkkkkkk..', '...aaeaakaap', '....aaaaaa..', '....kkkk....', '...kkkkkkr..', '..kkkkkkkrr.', '...kkkkkk...', '...kk..kk...', '..kk....kk..', 't...........'],
  coin: ['.yyyy.', 'yyKyyy', 'yKKKyy', 'yyKyyy', '.yyyy.'],
  hairball: ['.bb.', 'bbbb', 'bbbb', '.bb.'], feather: ['..w', '.ww', 'ww.'], star: ['.y.', 'yyy', '.y.'],
};
const EPAL = { c: '#7a8aa8', d: '#55607a', e: '#f2e14e', p: '#f08a9a', o: '#7a8aa8', m: '#9b59d6', y: '#f2c14e', r: '#3a2050', E: '#ff3d5a', k: '#8a90a8', s: '#5fd3a0', g: '#6a7088', w: '#c8ccdc', a: '#a8988a', t: '#f08a9a', K: '#b08a1c', b: '#c8a878' };
const RAT_PAL = { ...EPAL, k: '#2a2438', e: '#ff5d73', r: '#d6302f', y: '#f2a03c' };
const PIG_PAL = { ...EPAL, e: '#ff5d73', y: '#f2a03c' };
const BOSS_PAL = { whiskers: { ...EPAL, c: '#e8a050', d: '#a0601c', o: '#e8a050' }, rollo: { ...EPAL, m: '#d6302f', y: '#f2c14e', r: '#5a1020' }, coocoo: { ...PIG_PAL, k: '#b8a8d8', g: '#8a6ab8', s: '#ff9ad0' }, squeaks: { ...RAT_PAL, k: '#1a1424', r: '#f2c14e' } };
let bgCache = new Map();
function backdrop(P, stage) {
  if (bgCache.has(stage)) return bgCache.get(stage); const c = document.createElement('canvas'); c.width = W; c.height = ROWS * 8; const g = c.getContext('2d'); const st = STAGES[stage], map = MAPS[stage];
  // sky above the roof, tower wall below
  const sky = g.createLinearGradient(0, 0, 0, ROOF * 8); sky.addColorStop(0, '#0a0620'); sky.addColorStop(1, '#2a1450'); g.fillStyle = sky; g.fillRect(0, 0, W, ROOF * 8);
  g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(210 - stage * 40, 16, 7, 0, 7); g.fill(); g.fillStyle = '#2a1450'; g.beginPath(); g.arc(213 - stage * 40, 14, 6, 0, 7); g.fill();
  for (let i = 0; i < 18; i++) { g.fillStyle = i % 3 ? '#8a7ac4' : '#fbf1e0'; g.fillRect((i * 53 + stage * 17) % W, (i * 29) % (ROOF * 8 - 8), 1, 1); }
  g.fillStyle = st.wall; g.fillRect(0, ROOF * 8, W, (ROWS - ROOF) * 8);
  for (let y = ROOF * 8; y < ROWS * 8; y += 6) for (let x = (y / 6) % 2 ? 0 : 6; x < W; x += 12) { g.fillStyle = '#ffffff0a'; g.fillRect(x, y, 11, 5); }
  // windows with night sky and paper lanterns, one set per floor band
  for (let f = 0; f < 4; f++) { const top = (ROOF + 1 + f * 5) * 8; for (const wx of [40 + ((f + stage) % 3) * 24, 168 - ((f + stage) % 2) * 32]) { g.fillStyle = '#120a2a'; g.fillRect(wx, top + 6, 18, 16); g.fillStyle = '#2a1a50'; g.fillRect(wx + 1, top + 7, 16, 14); g.fillStyle = '#fff6c0'; g.fillRect(wx + 3 + f * 2, top + 9, 1, 1); g.fillStyle = '#3a2a1a'; g.fillRect(wx + 8, top + 6, 2, 16); g.fillRect(wx, top + 13, 18, 2); }
    const lx = 112 + ((f * 37 + stage * 11) % 40); g.fillStyle = '#5a3a2a'; g.fillRect(lx + 3, top, 1, 6); g.fillStyle = st.trim; g.fillRect(lx, top + 6, 7, 9); g.fillStyle = '#ffffff55'; g.fillRect(lx + 1, top + 7, 2, 7); g.fillStyle = '#1a1424'; g.fillRect(lx, top + 9, 7, 1); g.fillRect(lx, top + 12, 7, 1); }
  // posts
  for (let x = 4; x < W; x += 62) { g.fillStyle = '#00000033'; g.fillRect(x, ROOF * 8 + 8, 5, (ROWS - ROOF - 1) * 8); }
  // tiles
  for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) { const ch = map[r][col], x = col * 8, y = r * 8;
    if (ch === '|') { g.fillStyle = '#1a1028'; g.fillRect(x, y, 8, 8); g.fillStyle = st.trim + '55'; g.fillRect(col ? x : x + 6, y, 2, 8); }
    if (ch === '=' || ch === 'T') { g.fillStyle = '#7a4a22'; g.fillRect(x, y, 8, 5); g.fillStyle = '#a8703a'; g.fillRect(x, y, 8, 1); g.fillStyle = '#4a2a14'; g.fillRect(x, y + 4, 8, 1); if (col % 4 === 0) g.fillRect(x, y + 1, 1, 3); if (r === ROOF) { g.fillStyle = st.trim; g.fillRect(x, y + 5, 8, 1); } }
    if (ch === '-') { g.fillStyle = '#9a6a32'; g.fillRect(x, y, 8, 3); g.fillStyle = '#c89a52'; g.fillRect(x, y, 8, 1); }
    if (ch === 'H' || ch === 'T') { g.fillStyle = '#5f9a3a'; g.fillRect(x + 1, y + (ch === 'T' ? 5 : 0), 1, ch === 'T' ? 3 : 8); g.fillRect(x + 6, y + (ch === 'T' ? 5 : 0), 1, ch === 'T' ? 3 : 8); g.fillStyle = '#a8d070'; if (ch === 'H') { g.fillRect(x + 1, y + 2, 6, 1); g.fillRect(x + 1, y + 6, 6, 1); } } }
  // roof eaves + stage name banner
  g.fillStyle = st.trim; for (let x = 0; x < W; x += 16) { g.fillRect(x, ROOF * 8 + 6, 14, 1); }
  
  bgCache.set(stage, c); return c;
}
function fighter(P, p, now) {
  const body = p.ladder >= 0 ? 'climb' : p.move === 'sky' ? 'sky' : p.move === 'kick' ? 'kick' : p.move === 'jab' ? 'jab' : p.move === 'sweep' ? 'sweep' : p.move === 'lowjab' ? 'lowjab' : p.st === 'crouch' ? 'crouch' : p.st === 'air' ? 'jump' : p.st === 'walk' && Math.floor(p.anim / 8) % 2 ? 'walk' : 'stand';
  const active = p.move && attackBox(p) ? body : p.move ? 'stand' : body; // wind-up frames show the guard pose
  const k = p.move && !attackBox(p) && p.move !== 'sky' ? (CROUCH[p.move] ? 'crouch' : 'stand') : active;
  const rows = CROUCH[k] ? [...HEAD, ...CROUCH[k]] : k === 'climb' ? [...HEAD_BACK, ...BODY.climb] : [...HEAD, ...BODY[k]];
  const flip = k === 'climb' ? Math.floor(p.anim / 6) % 2 === 1 : p.face < 0;
  return P.sprite('pf-' + k + (p.hurtTint ? 'h' : ''), rows, p.hurtTint ? { ...FPAL, g: '#ffb0b0', G: '#d07070' } : FPAL, { flip });
}
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#06040f'; ctx.fillRect(0, 0, W, H); ctx.drawImage(backdrop(P, s.stage), 0, OY);
  if (!s.boss) { ctx.font = '6px Silkscreen, monospace'; ctx.fillStyle = STAGES[s.stage].trim; ctx.textAlign = 'center'; ctx.fillText(`FLOOR ${s.stage + 1}: ${STAGES[s.stage].name}`, W / 2, OY + ROOF * 8 - 30); ctx.textAlign = 'left'; }
  // locked connectors: red rope across ladder feet and ledge steps until that floor's KO quota is met
  { const st = STAGES[s.stage]; ctx.fillStyle = '#ff3d5a';
    for (const [c, , bot] of st.ladders) if (!cleared(s, bot)) { const x = c * 8, y = bot * 8 + OY; ctx.fillRect(x - 1, y - 6, 10, 1); ctx.fillRect(x - 1, y - 12, 10, 1); ctx.fillRect(x + 3, y - 11, 2, 4); }
    for (const [r, c0, c1] of st.ledges) if (!cleared(s, r + 2)) { ctx.globalAlpha = 0.55; ctx.fillRect(c0 * 8, r * 8 + OY, (c1 - c0 + 1) * 8, 1); ctx.globalAlpha = 1; } }
  // coin
  if (s.coin && (s.coin.f > 90 || Math.floor(s.frame / 6) % 2)) P.blit(ctx, P.sprite('pfcoin', SPR.coin, EPAL), s.coin.x - 4, s.coin.y - 8 + OY + Math.round(Math.sin(s.frame / 8)));
  // enemies
  for (const e of s.enemies) { if (e.flash && Math.floor(e.flash / 2) % 2) continue; let spr, x = e.x, y = e.y + OY;
    if (e.type === 'cat') { const k = e.st === 'wind' ? 'catWind' : e.st === 'pounce' ? 'catPounce' : 'cat'; spr = P.sprite('pf' + k, SPR[k], EPAL, { flip: e.face < 0 }); P.blit(ctx, spr, x - spr.width / 2, y - spr.height + 1); if (e.st === 'wind' && Math.floor(e.f / 4) % 2) tell(ctx, x, y - 16, '#f2e14e'); }
    else if (e.type === 'rug') { const k = Math.floor(e.x / 4) % 2 ? 'rug' : 'rug2'; spr = P.sprite('pf' + k, SPR[k], EPAL, { flip: e.face < 0 }); const sh = e.st === 'rev' ? (e.f % 4 < 2 ? -1 : 1) : 0; P.blit(ctx, spr, x - spr.width / 2 + sh, y - spr.height + 1);
      if (e.st === 'rev') { ctx.fillStyle = '#f2c14e'; ctx.fillRect(x - e.face * 9, y - 3 - (e.f % 6), 1, 1); tell(ctx, x, y - 12, '#ff3d5a', e.f); } if (e.st === 'charge') { ctx.fillStyle = '#ffffff55'; for (let i = 1; i < 4; i++) ctx.fillRect(x - e.face * (8 + i * 4), y - 4, 2, 1); } }
    else if (e.type === 'pigeon') { const k = Math.floor(s.frame / (e.st === 'coo' ? 3 : 7)) % 2 ? 'pigeon' : 'pigeon2'; spr = P.sprite('pf' + k, SPR[k], PIG_PAL, { flip: e.face < 0 }); P.blit(ctx, spr, x - spr.width / 2, y - spr.height / 2); if (e.st === 'coo') tell(ctx, x, y - 10, '#ff9ad0', e.f); }
    else if (e.type === 'rat') { spr = P.sprite('pfrat', SPR.rat, RAT_PAL, { flip: e.face < 0 }); P.blit(ctx, spr, x - spr.width / 2, y - spr.height + 1); if (e.st === 'glint' && Math.floor(e.f / 3) % 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + e.face * 6, y - 9, 3, 1); ctx.fillRect(x + e.face * 7, y - 10, 1, 3); } if (e.st === 'dash') { ctx.fillStyle = '#7ef0ff88'; ctx.fillRect(x - e.face * 14, y - 6, 8, 1); } }
    if (e.stun > 20) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(x - 3 + ((s.frame >> 2) % 7), y - 14, 2, 1); } }
  // boss
  const B = s.boss; if (B && !(B.flash && Math.floor(B.flash / 2) % 2)) { const k = { whiskers: B.st === 'hops' && B.crouch ? 'catWind' : B.st === 'hops' ? 'catPounce' : 'cat', rollo: Math.floor(B.x / 4) % 2 ? 'rug' : 'rug2', coocoo: Math.floor(s.frame / 5) % 2 ? 'pigeon' : 'pigeon2', squeaks: 'rat' }[B.kind];
    const spr = P.sprite('pfb' + B.kind + k, SPR[k], BOSS_PAL[B.kind], { flip: B.face < 0 }); const w = spr.width * 2, h = spr.height * 2, x = B.x - w / 2, y = (B.kind === 'coocoo' ? B.y + h / 2 : B.y) + OY - h + 2;
    P.blit(ctx, spr, x, y, 2); ctx.fillStyle = '#f2c14e';
    if (B.kind === 'whiskers') { ctx.fillRect(B.x - 2, y + h - 10, 3, 3); ctx.fillStyle = '#d6302f'; ctx.fillRect(B.x - 2, y + h - 13, 3, 2); }
    if (B.kind === 'rollo') { ctx.fillRect(B.x - 6, y - 4, 12, 3); ctx.fillRect(B.x - 6, y - 7, 2, 3); ctx.fillRect(B.x - 1, y - 8, 2, 4); ctx.fillRect(B.x + 4, y - 7, 2, 3); }
    if (B.kind === 'coocoo') { ctx.fillStyle = '#fbf1e0'; ctx.fillRect(B.x + B.face * 6 - 3, y + 1, 7, 2); ctx.fillStyle = '#7ef0ff'; ctx.fillRect(B.x + B.face * 6, y - 1, 1, 2); }
    if (B.kind === 'squeaks') { ctx.fillStyle = '#3a2a4a'; ctx.fillRect(x + 8, y + 2, w - 16, 5); ctx.fillStyle = '#f2c14e'; ctx.fillRect(x + 6, y - 2, 2, 6); ctx.fillRect(x + w - 8, y - 2, 2, 6); }
    if (['hops', 'rev', 'swoop', 'fan', 'glint', 'stars', 'slam', 'hairball'].includes(B.st) && B.f < 30 && Math.floor(B.f / 4) % 2) tell(ctx, B.x, y - 6, '#ff3d5a');
    if (['nap', 'dizzy', 'perch', 'tired'].includes(B.st)) { ctx.fillStyle = '#7ef0ff'; ctx.font = '6px Silkscreen, monospace'; ctx.fillText(B.st === 'nap' ? 'zZ' : '@', B.x + 6, y - 2 - ((s.frame >> 3) % 4)); } }
  // shots, shockwaves
  for (const o of s.shots) { const spr = P.sprite('pf' + o.kind, SPR[o.kind], EPAL, { outline: o.kind !== 'feather' }); P.blit(ctx, spr, o.x - spr.width / 2, o.y - spr.height / 2 + OY); }
  for (const w of s.waves) { if (w.boss) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(w.x - 3, w.y - 4 + OY, 6, 4); ctx.fillStyle = '#ff5d73'; ctx.fillRect(w.x - 2, w.y - 6 + OY, 4, 2); } else { ctx.strokeStyle = `rgba(126,240,255,${w.f / 18})`; ctx.beginPath(); ctx.arc(w.x, w.y + OY, (18 - w.f) * 2.6, 0, 7); ctx.stroke(); } }
  // player
  const p = s.p; if (!(p.inv > 0 && !s.ready && Math.floor(s.frame / 4) % 2 && p.st !== 'hurt') && !(s.dying && Math.floor(s.dying / 6) % 2)) { p.hurtTint = p.st === 'hurt'; const spr = fighter(P, p, now); P.blit(ctx, spr, p.x - spr.width / 2, p.y - spr.height + 1 + OY);
    if (s.inu && p.charge > 6) { const full = p.charge >= ZEN.charge; ctx.fillStyle = full ? (Math.floor(s.frame / 3) % 2 ? '#7ef0ff' : '#fbf1e0') : '#7ef0ff88'; ctx.fillRect(p.x - 6, p.y - 22 + OY, Math.min(12, (12 * p.charge) / ZEN.charge), 2); }
    const A = attackBox(p); if (A) { ctx.fillStyle = '#fff6c0aa'; ctx.fillRect(p.face > 0 ? A.x1 - 2 : A.x0, (A.y0 + A.y1) / 2 - 1 + OY, 3, 2); } }
  // ready / clear banners
  ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'center';
  if (s.ready > 0) { ctx.fillStyle = '#ff8a3c'; ctx.fillText(s.lives && s.p.inv > 60 ? 'READY!' : `FLOOR ${s.stage + 1}`, W / 2, OY + 120); ctx.font = '6px Silkscreen, monospace'; ctx.fillStyle = '#fbf1e0'; ctx.fillText(STAGES[s.stage].name + (s.loop > 1 ? ` · TOWER ${s.loop}` : ''), W / 2, OY + 132); }
  if (B && B.st === 'intro') { ctx.fillStyle = '#ff3d5a'; ctx.fillText(B.name, W / 2, OY + 70); ctx.font = '6px Silkscreen, monospace'; ctx.fillStyle = '#fbf1e0'; ctx.fillText(BOSSES[B.kind].title.toUpperCase(), W / 2, OY + 80); }
  if (s.clearing > 0) { ctx.fillStyle = '#f2c14e'; ctx.fillText('FLOOR CLEAR!', W / 2, OY + 110); }
  ctx.textAlign = 'left';
  // boss bar
  if (B) { ctx.fillStyle = '#000a'; ctx.fillRect(40, OY + 2, W - 80, 9); ctx.fillStyle = '#3a1020'; ctx.fillRect(42, OY + 4, W - 84, 5); ctx.fillStyle = '#ff3d5a'; ctx.fillRect(42, OY + 4, ((W - 84) * Math.max(0, B.hp)) / B.maxHp, 5); ctx.font = '6px Silkscreen, monospace'; ctx.fillStyle = '#fbf1e0'; ctx.fillText(B.name, 44, OY + 9); }
  // bottom strip: HP, stage, timer (lives icons are drawn by the cabinet HUD at bottom-left)
  const by = OY + ROWS * 8; ctx.fillStyle = '#000'; ctx.fillRect(0, by, W, H - by);
  for (let i = 0; i < HP_MAX; i++) { ctx.fillStyle = i < p.hp ? (p.hp <= 2 ? '#ff3d5a' : '#5fd37a') : '#2a2440'; ctx.fillRect(66 + i * 7, by + 7, 5, 6); }
  ctx.font = '6px Silkscreen, monospace'; ctx.fillStyle = '#8a7ac4'; ctx.fillText('HP', 54, by + 13); ctx.fillText(`FLOOR ${s.stage + 1}${s.loop > 1 ? '·' + s.loop : ''}`, 128, by + 13); { const k = koLeft(s); if (k > 0) { ctx.fillStyle = '#ff3d5a'; ctx.fillRect(168, by + 8, 5, 4); ctx.fillRect(169, by + 6, 1, 2); ctx.fillRect(171, by + 6, 1, 2); ctx.fillRect(169, by + 5, 3, 1); ctx.fillText('KO ' + k, 175, by + 13); } }
  const secs = Math.max(0, Math.ceil(s.timer / 60)); ctx.fillStyle = secs <= 15 && Math.floor(s.frame / 15) % 2 ? '#ff3d5a' : '#f2c14e'; ctx.fillText('TIME ' + String(secs).padStart(3, '0'), 200, by + 13);
  if (s.inu && p.zenCd > 0) { ctx.fillStyle = '#7ef0ff55'; ctx.fillRect(180, by + 16, (14 * p.zenCd) / (ZEN.cd * 60), 2); }
}
function tell(ctx, x, y, c, f = 0) { ctx.fillStyle = c; ctx.fillRect(x - 1, y - 4, 2, 4); ctx.fillRect(x - 1, y + 1, 2, 2); }
