// Bone Digger art: original Inu pixel sprites (char grids -> cached canvases via pix.sprite), the layered soil backdrop and an
// incrementally painted tunnel mask (only sub-cells that changed since the last frame are repainted).
import { W, H, OY, CELL, COLS, ROWS, SUB, SC, SR, LAYERS, YARDS, PUMP, BOOM, layerOf } from './digger.js';
const SPAL = { o: '#e0802c', d: '#b65a1c', w: '#fbf1e0', e: '#1a1424', n: '#3a2430', p: '#f08a9a', r: '#d6302f' };
const SHIBA = {
  side: [['.........o.o..', '........ooooo.', '.o......oowoeo', 'oo.....oooowwn', '.ooooooooowww.', '.oooooooooo...', '.owwwwwwwo....', '.oo.oo..oo.oo.', '.dd.dd..dd.dd.'],
    ['.........o.o..', '........ooooo.', '.o......oowoeo', 'oo.....oooowwn', '.ooooooooowww.', '.oooooooooo...', '.owwwwwwwo....', '..oo.oo.oo.oo.', '..dd..d..dd.d.']],
  front: [['.o......o.', '.oo....oo.', '.oooooooo.', 'oeooooooeo', 'oowwwwwwoo', '.owwnnwwo.', '..owwwwo..', '.oooooooo.', '.oo.oo.oo.', '.dd.dd.dd.'],
    ['.o......o.', '.oo....oo.', '.oooooooo.', 'oeooooooeo', 'oowwwwwwoo', '.owwnnwwo.', '..owwwwo..', '.oooooooo.', 'oo..oo..oo', 'dd..dd..dd']],
  back: [['.o......o.', '.oo....oo.', '.oooooooo.', '.oooooooo.', '..oooooo..', '.oooooooo.', 'oooowwoooo', '.oo.ww.oo.', '.dd....dd.'],
    ['.o......o.', '.oo....oo.', '.oooooooo.', '.oooooooo.', '..oooooo..', '.oooooooo.', 'oooowwoooo', 'oo..ww..oo', 'dd......dd']],
};
const EPAL = { m: '#4a3428', M: '#2e2018', n: '#f08a9a', c: '#e8d8b8', e: '#fbf1e0', g: '#5aa83c', G: '#3a7a28', y: '#d8e080', t: '#ff3d5a', b: '#7a4ac8', B: '#4a2a88', s: '#f2c14e', a: '#2a1830',
  r: '#8a8494', R: '#5a5464', h: '#b8b4c4', v: '#5f9a3a', k: '#c88a3c', K: '#8a5a22', Y: '#f2c14e', O: '#b8860b', P: '#ff9ad5', w: '#fbf1e0', x: '#1a1424' };
const SPR = {
  mole: ['...mmmmmm....', '..mmmmmmmmm..', '.mmmmmmmmmxe.', 'mmmmmmmmmmmmn', 'mMmmmmmmmmmnn', '.mmmmmmmmmm..', '.cc.mm..mmcc.', 'c.c......c.c.'],
  mole2: ['...mmmmmm....', '..mmmmmmmmm..', '.mmmmmmmmmxe.', 'mmmmmmmmmmmmn', 'mMmmmmmmmmmnn', '.mmmmmmmmmm..', '..ccmm..mcc..', '.c.c.....c.c.'],
  snake: ['.........ggg..', '........ggxgg.', '..gGg...ggggtt', '.gGgGg..gyyg..', 'gGy.gGg.gyg...', 'gg...gGggg....', '.......gg.....'],
  snake2: ['.........ggg..', '........ggxgg.', '.gGg....gggg..', 'gGgGg...gyyg..', 'Gy..gGg.gyg...', 'g....gGggg....', '.......gg.....'],
  snakeStrike: ['..........ggg.', '.........ggxgg', 'gGgGgGgGgggggt', 'gyyyyyyyyyyyg.', '.gGgGgGgGgGg..'],
  beetle: ['..a......a..', '...a....a...', '...BBBBBB...', '..BbbbbbbB..', '.Bbsbbbbsbb.', 'aBbbbBBbbbBa', '.Bbsbbbbsbb.', '..BbbbbbbB..', '.a.BBBBBB.a.'],
  beetle2: ['...a....a...', '...a....a...', '...BBBBBB...', '..BbbbbbbB..', '.Bbsbbbbsbb.', '.BbbbBBbbbB.', 'aBbsbbbbsbBa', '..BbbbbbbB..', 'a..BBBBBB..a'],
  rock: ['....vvvvv.....', '..rvvrrrrrr...', '.rrhhrrrrrrr..', 'rrhhrrrrrrrRr.', 'rrrrrrrrrRRRr.', 'rrrrrrRRrrrrRr', 'rRrrrrrrrrrrRr', 'rRRrrrrrrrRRRr', '.rRRRrrrRRRRr.', '..rRRRRRRRRr..', '....RRRRRR....'],
  bone: ['ww.....ww', 'wwwwwwwww', 'ww.....ww'], boneV: ['w.w', 'www', '.w.', '.w.', '.w.', 'www', 'w.w'],
  coin: ['..YYY..', '.YOYOY.', 'YYOYYYY', 'YYOOYYY', 'YYOYOYY', '.YOYYO.', '..YYY..'],
  treat: ['..PPPP..', '.PwPPwP.', 'PPPPPPPP', 'kkkkkkkk', 'kKkKkKkk', '.kkkkkk.'],
  kib: ['.k.', 'kkk', '.K.'],
};
const bgCache = new Map(); let tun = null;
function backdrop(yard) {
  if (bgCache.has(yard)) return bgCache.get(yard); const c = document.createElement('canvas'); c.width = W; c.height = ROWS * CELL; const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, CELL); sky.addColorStop(0, '#5fb8f0'); sky.addColorStop(1, '#bfe8ff'); g.fillStyle = sky; g.fillRect(0, 0, W, CELL);
  g.fillStyle = '#fff6c0'; g.fillRect(212 - yard * 30, 2, 6, 6); g.fillStyle = '#fbf1e0'; for (const [x, w] of [[30, 14], [96, 10], [160, 12]]) g.fillRect((x + yard * 23) % (W - 20), 3, w, 3);
  g.fillStyle = '#5f9a3a'; g.fillRect(0, CELL - 2, W, 2); g.fillStyle = '#86c94e'; for (let x = 0; x < W; x += 3) g.fillRect(x, CELL - 3 - ((x * 7) % 3 === 0 ? 1 : 0), 1, 2);
  // the doghouse at the start, flowers along the lawn
  g.fillStyle = '#d6302f'; g.fillRect(100, 2, 14, 4); g.fillStyle = '#c9a36a'; g.fillRect(101, 6, 12, 8); g.fillStyle = '#2a160c'; g.fillRect(105, 9, 4, 5);
  for (let i = 0; i < 8; i++) { const x = (i * 37 + yard * 11) % W; if (x > 96 && x < 120) continue; g.fillStyle = ['#ff9ad5', '#f2c14e', '#fbf1e0'][i % 3]; g.fillRect(x, CELL - 5, 2, 2); }
  for (let r = 1; r < ROWS; r++) { const L = LAYERS[layerOf(r)]; g.fillStyle = L.soil; g.fillRect(0, r * CELL, W, CELL); }
  let seed = 7 + yard * 131; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 420; i++) { const x = Math.floor(rnd() * W), y = CELL + Math.floor(rnd() * (ROWS - 1) * CELL), L = LAYERS[layerOf(Math.floor(y / CELL))]; g.fillStyle = L.fleck; g.fillRect(x, y, rnd() < 0.3 ? 2 : 1, 1); }
  for (let i = 0; i < 14; i++) { const x = Math.floor(rnd() * W), y = CELL + 2 + Math.floor(rnd() * 30); g.fillStyle = '#6a4a2a'; for (let k = 0; k < 6; k++) g.fillRect(x + Math.round(Math.sin(k + i) * 2), y + k, 1, 1); } // roots in the loam
  for (let i = 0; i < 6; i++) { const x = 8 + Math.floor(rnd() * (W - 16)), y = 7 * CELL + 3 + Math.floor(rnd() * 40); g.fillStyle = '#9a94b4'; g.fillRect(x, y, 4, 1); g.fillRect(x + 3, y + 1, 1, 2); g.fillRect(x, y + 3, 4, 1); g.fillRect(x, y + 1, 1, 1); } // little shell fossils in the shale
  for (let i = 0; i < 16; i++) { const x = Math.floor(rnd() * W), y = 10 * CELL + Math.floor(rnd() * 46); g.fillStyle = i % 2 ? '#7ef0ff' : '#c58cff'; g.fillRect(x, y, 1, 3); g.fillRect(x - 1, y + 1, 3, 1); } // crystals
  for (const r of [4, 7, 10]) { g.fillStyle = '#00000040'; g.fillRect(0, r * CELL, W, 1); }
  bgCache.set(yard, c); return c;
}
// tunnels: diff the dug mask against a private copy; repaint only changed sub-cells (lawn row stays sky)
function tunnels(s) {
  if (!tun || tun.ref !== s.dug) { const c = tun?.c || document.createElement('canvas'); c.width = W; c.height = ROWS * CELL; tun = { c, g: c.getContext('2d'), ref: s.dug, copy: new Uint8Array(SC * SR) }; }
  const { g, copy } = tun, d = s.dug;
  for (let i = 0; i < d.length; i++) if (d[i] !== copy[i]) { copy[i] = d[i]; const x = (i % SC) * SUB, y = Math.floor(i / SC) * SUB; if (y < CELL) continue; g.fillStyle = LAYERS[layerOf(Math.floor(y / CELL))].dark; g.fillRect(x, y, SUB, SUB); }
  return tun.c;
}
const spr = (P, k, flip = false) => P.sprite('bd' + k + (flip ? 'f' : ''), SPR[k], EPAL, { flip });
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#06040f'; ctx.fillRect(0, 0, W, H); ctx.drawImage(backdrop(s.yard), 0, OY); ctx.drawImage(tunnels(s), 0, OY);
  const Y = (y) => y + OY, blink = Math.floor(s.frame / 8) % 2;
  for (const k of s.kibble) if (!k.got) P.blitC(ctx, spr(P, 'kib'), k.c * CELL + 8, Y(k.r * CELL + 8));
  for (const b of s.bones) if (!b.got) P.blitC(ctx, spr(P, 'bone'), b.c * CELL + 8, Y(b.r * CELL + 8));
  for (const k of s.coins) if (!k.got) { P.blitC(ctx, spr(P, 'coin'), k.c * CELL + 8, Y(k.r * CELL + 8)); if (blink) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(k.c * CELL + 12, Y(k.r * CELL + 3), 1, 1); } }
  if (s.gold) { const g = s.gold; ctx.globalAlpha = g.t < 120 && blink ? 0.4 : 1; ctx.save(); ctx.filter = 'none'; P.blitC(ctx, P.sprite('bdgbone', SPR.bone, { w: '#f2c14e' }), g.c * CELL + 8, Y(g.r * CELL + 8)); ctx.restore(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff6c0'; const k = s.frame % 24; ctx.fillRect(g.c * CELL + 2 + (k % 12), Y(g.r * CELL + 2 + (k >> 2)), 1, 1); }
  if (s.treat) P.blitC(ctx, spr(P, 'treat'), s.treat.c * CELL + 8, Y(s.treat.r * CELL + 7));
  for (const k of s.rocks) { if (k.gone) continue; const wob = k.st === 'wobble' ? (Math.floor(k.f / 3) % 2 ? 1 : -1) : 0, x = k.c * CELL + 8 + wob, y = Y(k.y);
    if (k.st === 'crumble') { ctx.fillStyle = '#8a8494'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 7 + i * 3, y + 2 + ((i * 5 + k.f) % 5), 2, 2); continue; }
    P.blitC(ctx, spr(P, 'rock'), x, y); if (k.st === 'wobble' && blink) { ctx.fillStyle = '#ff3d5a'; ctx.fillRect(x - 1, y - 14, 2, 5); ctx.fillRect(x - 1, y - 8, 2, 2); } }
  // pests
  for (const e of s.enemies) { if (e.dead) continue; const flip = e.dir === 'left', alt = Math.floor(e.f / 10) % 2; let k = e.type === 'mole' ? (alt ? 'mole2' : 'mole') : e.type === 'snake' ? (e.mode === 'strike' ? 'snakeStrike' : alt ? 'snake2' : 'snake') : alt ? 'beetle2' : 'beetle';
    const sp = spr(P, k, e.type === 'beetle' ? false : flip), x = e.x, y = Y(e.y);
    if (e.wait > 0 && blink) continue;
    if (e.mode === 'phase') { ctx.globalAlpha = 0.4 + 0.15 * Math.sin(s.frame / 3); P.blitC(ctx, sp, x, y); ctx.globalAlpha = 1; ctx.strokeStyle = '#c58cff66'; ctx.strokeRect(x - 8, y - 7, 16, 14); continue; }
    if (e.mode === 'shimmer') { ctx.globalAlpha = blink ? 0.5 : 1; P.blitC(ctx, sp, x, y); ctx.globalAlpha = 1; tell(ctx, x, y - 11, '#c58cff'); continue; }
    if (e.mode === 'fluff') { const sc = 1 + 0.18 * e.fuzz; ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); P.blitC(ctx, sp, 0, 0); ctx.restore();
      ctx.strokeStyle = e.fuzzT < 16 && blink ? '#7ef0ff44' : '#7ef0ffaa'; for (let i = 0; i < e.fuzz; i++) { ctx.beginPath(); ctx.arc(x, y, 6 + i * 2.5 + (s.frame % 6) / 3, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#fff6c0'; for (let i = 0; i < e.fuzz; i++) { const a = s.frame / 6 + i * 1.7; ctx.fillRect(Math.round(x + Math.cos(a) * 9), Math.round(y + Math.sin(a) * 8), 1, 1); } continue; }
    P.blitC(ctx, sp, x, y); if (e.type === 'snake' && e.mode === 'hiss') tell(ctx, x, y - 10, '#ff3d5a'); if (e.type === 'mole' && e.mode === 'burrow' && blink) { ctx.fillStyle = LAYERS[Math.max(0, layerOf(Math.floor(e.y / CELL)))].fleck; ctx.fillRect(x - 6, y + 4, 2, 2); ctx.fillRect(x + 5, y + 5, 2, 1); } }
  // bark waves: rings of sound rolling down the tunnel
  for (const w of s.waves) { ctx.strokeStyle = `rgba(126,240,255,${0.35 + w.f / PUMP.waveF * 0.6})`; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const d = w.len - i * 6; if (d < 6) continue; const x = w.x + w.dx * d, y = Y(w.y + w.dy * d), a = Math.atan2(w.dy, w.dx); ctx.beginPath(); ctx.arc(x - w.dx * 4, y - w.dy * 4, 5 - i, a - 1.1, a + 1.1); ctx.stroke(); } }
  if (s.boom) { const b = s.boom; P.blitC(ctx, Math.floor(b.spin / 4) % 2 ? spr(P, 'boneV') : spr(P, 'bone'), b.x, Y(b.y)); }
  // the Shiba
  const p = s.p;
  if (!(s.dying && Math.floor(s.dying / 6) % 2) && !(s.ready && s.lives && blink && s.frame < 0)) { const fr = p.moving ? Math.floor(p.anim / 5) % 2 : 0, key = p.dir === 'down' ? 'front' : p.dir === 'up' ? 'back' : 'side';
    const sp = P.sprite('bdshiba' + key + fr + (p.face < 0 ? 'f' : ''), SHIBA[key][fr], SPAL, { flip: key === 'side' && p.face < 0 }); P.blitC(ctx, sp, p.x, Y(p.y));
    if (p.digging && p.moving && blink) { ctx.fillStyle = LAYERS[Math.max(0, layerOf(Math.floor(p.y / CELL)))].fleck; ctx.fillRect(p.x - p.face * 8, Y(p.y) - 3, 2, 2); ctx.fillRect(p.x - p.face * 6, Y(p.y) - 6, 1, 1); }
    if (s.inu && p.charge > 6) { const full = p.charge >= BOOM.charge; ctx.fillStyle = full ? (blink ? '#fbf1e0' : '#7ef0ff') : '#7ef0ff88'; ctx.fillRect(p.x - 6, Y(p.y) - 11, Math.min(12, (12 * p.charge) / BOOM.charge), 2); } }
  // banners
  ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'center';
  if (s.ready > 0) { ctx.fillStyle = '#c9a36a'; ctx.fillText(s.lives && s.frame > 120 ? 'READY!' : `YARD ${s.level}`, W / 2, OY + 120); ctx.font = '6px Silkscreen, monospace'; ctx.fillStyle = '#fbf1e0'; ctx.fillText(s.yardName + ' · FIND ' + s.bones.length + ' BONES', W / 2, OY + 132); }
  if (s.clearing > 0) { ctx.fillStyle = '#f2c14e'; ctx.fillText('YARD CLEAR!', W / 2, OY + 110); }
  if (s.hurry && s.timer === 0 && Math.floor(s.frame / 20) % 2 && s.hurryT < 180) { ctx.fillStyle = '#ff5d73'; ctx.fillText('HURRY UP!', W / 2, OY + 100); }
  ctx.textAlign = 'left';
  // bottom strip
  const by = OY + ROWS * CELL; ctx.fillStyle = '#06040f'; ctx.fillRect(0, by, W, H - by); ctx.font = '6px Silkscreen, monospace';
  const got = s.bones.filter((b) => b.got).length; ctx.fillStyle = '#fbf1e0'; P.blit(ctx, spr(P, 'bone'), 68, by + 9); ctx.fillText(`${got}/${s.bones.length}`, 80, by + 13);
  const lay = layerOf(Math.floor(p.y / CELL)); ctx.fillStyle = lay < 0 ? '#86c94e' : LAYERS[lay].fleck; ctx.fillText(lay < 0 ? 'LAWN' : LAYERS[lay].name, 112, by + 13);
  ctx.fillStyle = '#8a7ac4'; ctx.fillText('YARD ' + s.level, 156, by + 13);
  const secs = Math.max(0, Math.ceil(s.timer / 60)); ctx.fillStyle = s.timer === 0 ? '#ff3d5a' : secs <= 15 && Math.floor(s.frame / 15) % 2 ? '#ff3d5a' : '#f2c14e'; ctx.fillText(s.timer === 0 ? 'HURRY' : 'TIME ' + String(secs).padStart(3, '0'), 200, by + 13);
  if (s.inu) { const f = p.boomCd > 0 ? 1 - p.boomCd / (BOOM.cd * 60) : 1; ctx.fillStyle = '#3a2a4a'; ctx.fillRect(200, by + 19, 40, 2); ctx.fillStyle = f >= 1 ? '#fbf1e0' : '#7ef0ff'; ctx.fillRect(200, by + 19, Math.round(40 * f), 2); }
}
function tell(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x - 1, y - 3, 2, 4); ctx.fillRect(x - 1, y + 2, 2, 2); }
