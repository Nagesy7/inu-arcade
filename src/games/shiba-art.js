// Shiba Scuffle art: original pixel sprites (char grids -> cached canvases via pix.sprite), cached arena backdrops and a
// cached bush overlay, so a frame is a few dozen drawImage calls (cheap on mid-range phones).
import { W, H, OY, HB, AY, T, COLS, ROWS, ROLES, ROLE_IDS, ARENAS, BONE, ATK, SUPER, RANKS, rankOf, seen, inBush, inBand, SPRINKLERS, player } from './shiba.js';
const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const TEAM = ['#3a7bd5', '#d6302f'], SKIN = { gold: '#f2c14e', neon: '#7ef0ff' };
const GRID = {
  front: [['.o......o.', '.oo....oo.', '.oooooooo.', 'oeooooooeo', 'oowwwwwwoo', '.owwnnwwo.', '..owwwwo..', '.obbbbbbo.', '.oo.oo.oo.', '.dd.dd.dd.'],
    ['.o......o.', '.oo....oo.', '.oooooooo.', 'oeooooooeo', 'oowwwwwwoo', '.owwnnwwo.', '..owwwwo..', '.obbbbbbo.', 'oo..oo..oo', 'dd..dd..dd']],
  back: [['.o......o.', '.oo....oo.', '.oooooooo.', '.oooooooo.', '..oooooo..', '.obbbbbbo.', 'oooowwoooo', '.oo.ww.oo.', '.dd....dd.'],
    ['.o......o.', '.oo....oo.', '.oooooooo.', '.oooooooo.', '..oooooo..', '.obbbbbbo.', 'oooowwoooo', 'oo..ww..oo', 'dd......dd']],
  side: [['.........o.o..', '........ooooo.', '.o......oowoeo', 'oo.....oooowwn', '.oooooobbbwww.', '.oooooooooo...', '.owwwwwwwo....', '.oo.oo..oo.oo.', '.dd.dd..dd.dd.'],
    ['.........o.o..', '........ooooo.', '.o......oowoeo', 'oo.....oooowwn', '.oooooobbbwww.', '.oooooooooo...', '.owwwwwwwo....', '..oo.oo.oo.oo.', '..dd..d..dd.d.']] };
function shiba(P, role, view, fr, band, flip) { const R = ROLES[role]; return P.sprite(`sc-${role}-${view}-${fr}-${band}`, GRID[view][fr], { o: R.coat, d: R.dark, w: '#fbf1e0', e: '#1a1424', n: '#3a2430', b: band }, { flip }); }
const SPR = { bone: ['ww..................ww', 'www................www', '.wwwwwwwwwwwwwwwwwwww.', '.wwwwwwwwwwwwwwwwwwww.', 'www................www', 'ww..................ww'],
  treat: ['..pppp..', '.pwppwp.', 'pppppppp', 'kkkkkkkk', '.kkkkkk.'], coin: ['..YYY..', '.YOYOY.', 'YYOYYYY', 'YYOOYYY', 'YYOYOYY', '.YOYYO.', '..YYY..'],
  rug: ['...gggggggg...', '.gggggggggggg.', 'ggGGGGGGGGGGgg', 'gGgrgggggrggGg', 'gGggggggggggGg', 'ggGGGGGGGGGGgg', '.gggggggggggg.', '...kk....kk...'],
  crate: ['kkkkkkkkkkkkkk', 'kKKKKKKKKKKKKk', 'kK.kKKKKKKk.Kk', 'kKk.kKKKKk.kKk', 'kKKk.kKKk.kKKk', 'kKKKk.kk.kKKKk', 'kKKKKk..kKKKKk', 'kKKKKk..kKKKKk', 'kKKKk.kk.kKKKk', 'kKKk.kKKk.kKKk', 'kKk.kKKKKk.kKk', 'kK.kKKKKKKk.Kk', 'kKKKKKKKKKKKKk', 'kkkkkkkkkkkkkk'],
  house: ['.....rr.....', '...rrrrrr...', '.rrrrrrrrrr.', 'rrrrrrrrrrrr', '.wwwwwwwwww.', '.ww..ww..ww.', '.ww.kkkk.ww.', '.ww.kkkk.ww.', '.wwwkkkkwww.'] };
const PAL = { w: '#fbf1e0', p: '#ff9ad0', k: '#c88a3c', K: '#8a5a22', Y: '#f2c14e', O: '#b8860b', g: '#8a90a8', G: '#5a6280', r: '#ff3d5a' };
// ---------- arena backdrop (cached per arena) ----------
const THEMES = [{ a: '#4f9a4a', b: '#468c42', wall: '#2f6a34', top: '#5fbf5a', bush: '#3aa04a', bushD: '#2a7a38', dot: '#ffb8d8' },
  { a: '#5a5a6e', b: '#525266', wall: '#7a3a3a', top: '#a05040', bush: '#4a8a5a', bushD: '#2f6a40', dot: '#7a7a92' },
  { a: '#c89a5a', b: '#bc8e50', wall: '#6a4a2a', top: '#8a6a3a', bush: '#5aa86a', bushD: '#3a7a48', dot: '#e8d8a8' }];
const bgCache = new Map(), overCache = new Map();
function backdrop(s, ai) { if (bgCache.has(ai)) return bgCache.get(ai); const th = THEMES[ai], c = mk(W, ROWS * T), g = c.getContext('2d'), M = s.map;
  for (let r = 0; r < ROWS; r++) for (let x = 0; x < COLS; x++) { const ch = M[r][x], X = x * T, Y = r * T;
    g.fillStyle = (x + r) % 2 ? th.a : th.b; g.fillRect(X, Y, T, T);
    if (ai === 2) { g.fillStyle = '#a87a40'; g.fillRect(X, Y + 7, T, 1); g.fillRect(X, Y + 15, T, 1); } else if (ai === 1) { g.fillStyle = '#4a4a5c'; g.fillRect(X, Y, T, 1); g.fillRect(X, Y, 1, T); } else if ((x * 7 + r * 3) % 5 === 0) { g.fillStyle = th.dot; g.fillRect(X + 4, Y + 9, 2, 1); g.fillRect(X + 11, Y + 3, 1, 1); }
    if (ch === '#') { g.fillStyle = th.wall; g.fillRect(X, Y, T, T); g.fillStyle = th.top; g.fillRect(X, Y, T, 4); g.fillStyle = '#00000033'; g.fillRect(X, Y + T - 2, T, 2); if (ai === 1) { g.fillStyle = '#5a2a2a'; g.fillRect(X, Y + 9, T, 1); g.fillRect(X + 7, Y + 4, 1, 5); } }
    if (ch === '~') { g.fillStyle = '#3a8ac8'; g.fillRect(X + 1, Y + 2, T - 2, T - 4); g.fillStyle = '#7ec8f0'; g.fillRect(X + 3, Y + 5, 5, 1); g.fillRect(X + 8, Y + 10, 4, 1); }
    if (ch === 's') { g.fillStyle = '#8a90a8'; g.fillRect(X + 5, Y + 5, 6, 6); g.fillStyle = '#c8ccdc'; g.fillRect(X + 7, Y + 6, 2, 2); g.fillStyle = '#2a2a3a'; g.fillRect(X + 6, Y + 10, 4, 1); }
    if (ch === 'B' || ch === 'R') { g.fillStyle = ch === 'B' ? '#1c3a6a' : '#6a1c1c'; g.fillRect(X, Y, T, T); g.fillStyle = ch === 'B' ? '#3a7bd5' : '#d6302f'; g.fillRect(ch === 'B' ? X + T - 2 : X, Y, 2, T); } }
  // the tug track
  g.fillStyle = '#00000040'; for (let x = 24; x < 232; x += 6) g.fillRect(x, BONE.y - 1, 3, 2); g.fillStyle = '#fbf1e0aa'; g.fillRect(127, BONE.y - 5, 2, 10);
  g.fillStyle = '#3a7bd5'; g.fillRect(BONE.blueWin - 1, BONE.y - 12, 2, 24); g.fillStyle = '#d6302f'; g.fillRect(BONE.redWin - 1, BONE.y - 12, 2, 24);
  bgCache.set(ai, c); return c; }
function bushes(s, ai) { if (overCache.has(ai)) return overCache.get(ai); const th = THEMES[ai], c = mk(W, ROWS * T), g = c.getContext('2d');
  for (let r = 0; r < ROWS; r++) for (let x = 0; x < COLS; x++) if (s.map[r][x] === '"') { const X = x * T, Y = r * T; g.fillStyle = th.bushD; g.fillRect(X, Y + 2, T, T - 2); g.fillStyle = th.bush;
    for (const [a, b] of [[2, 1], [8, 0], [1, 7], [9, 6], [5, 10]]) g.fillRect(X + a, Y + b, 6, 5); g.fillStyle = '#ffffff22'; g.fillRect(X + 3, Y + 2, 2, 1); g.fillRect(X + 10, Y + 7, 2, 1); }
  overCache.set(ai, c); return c; }
let picnicC = null; function picnic() { if (picnicC) return picnicC; const r = ATK.picnic.r; picnicC = mk(r * 2, r * 2); const g = picnicC.getContext('2d'); g.beginPath(); g.arc(r, r, r, 0, 7); g.clip();
  for (let y = 0; y < r * 2; y += 6) for (let x = 0; x < r * 2; x += 6) { g.fillStyle = ((x + y) / 6) % 2 ? '#ff5d7366' : '#fbf1e066'; g.fillRect(x, y, 6, 6); } return picnicC; }
// ---------- fighters ----------
function fighter(ctx, P, s, f, now) { const x = Math.round(f.x), y = Math.round(f.y) - Math.round(f.hop || 0), me = f.ctl === 'p1' || f.ctl === 'p2';
  const band = me && s.skin ? SKIN[s.skin] : TEAM[f.team], side = Math.abs(f.fx) >= Math.abs(f.fy) * 0.9, view = side ? 'side' : f.fy < 0 ? 'back' : 'front', fr = f.anim ? Math.floor(f.anim / 8) % 2 : 0;
  const spr = shiba(P, f.role, view, fr, band, side && f.fx < 0);
  ctx.fillStyle = '#00000040'; ctx.fillRect(x - 6, Math.round(f.y) + 3, 12, 3);
  if (f.ctl === 'p1' || f.ctl === 'p2') { ctx.strokeStyle = f.ctl === 'p1' ? '#f2c14e' : '#5fd37a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, Math.round(f.y) + 4, 8, 3, 0, 0, 7); ctx.stroke(); }
  if (f.sup >= SUPER.full) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(now * 10); ctx.fillStyle = '#f2c14e'; ctx.fillRect(x - 7, y - 11, 14, 15); ctx.globalAlpha = 1; }
  if (f.act === 'spin') { ctx.save(); ctx.translate(x, y - 4); ctx.rotate(now * 25); ctx.drawImage(spr, -spr.width / 2, -spr.height / 2); ctx.restore(); ctx.strokeStyle = '#fbf1e0aa'; ctx.beginPath(); ctx.arc(x, y - 4, ATK.spin.r, now * 20, now * 20 + 2); ctx.stroke(); }
  else { if (f.inv > 0 && !f.rollF && Math.floor(now * 20) % 2) ctx.globalAlpha = 0.5; if (f.rollF) ctx.globalAlpha = 0.7; ctx.drawImage(spr, x - (spr.width >> 1), y - spr.height + 4); ctx.globalAlpha = 1; }
  if (f.flash > 3) { ctx.fillStyle = '#ffffffaa'; ctx.fillRect(x - 5, y - 7, 10, 8); }
  // role props (original): Bruno's helmet, Kiko's barking horn, Dango's snack pack, Zip's goggles
  const fx = side ? (f.fx < 0 ? -1 : 1) : 0, hy = y - spr.height + 4;
  if (f.role === 'bruno') { ctx.fillStyle = '#8a90a8'; ctx.fillRect(x - 4 + fx * 2, hy + 1, 8, 2); ctx.fillStyle = '#c8ccdc'; ctx.fillRect(x - 1 + fx * 2, hy, 2, 1); }
  else if (f.role === 'kiko') { if (view !== 'back') { ctx.fillStyle = '#f2c14e'; const bx = side ? x + fx * 7 : x + 4; ctx.fillRect(bx - 1, hy + 5, 3, 2); ctx.fillRect(bx + (fx || 1) * 2 - (fx < 0 ? 1 : 0), hy + 4, 1, 4); } }
  else if (f.role === 'dango') { ctx.fillStyle = '#5fd37a'; const bx = side ? x - fx * 6 - 2 : x - 3; if (view !== 'front') ctx.fillRect(bx, hy + 5, 5, 4); ctx.fillStyle = '#ff9ad0'; if (view !== 'front') ctx.fillRect(bx + 1, hy + 4, 3, 1); }
  else if (f.role === 'zip') { if (view !== 'back') { ctx.fillStyle = '#7ef0ff'; if (side) ctx.fillRect(x + fx * 3 - 1, hy + 2, 4, 2); else ctx.fillRect(x - 4, hy + 3, 9, 2); } }
  if (f.stun > 0) { ctx.fillStyle = '#f2c14e'; for (let i = 0; i < 3; i++) { const a = now * 8 + i * 2.1; ctx.fillRect(x + Math.round(Math.cos(a) * 6), hy - 3 + Math.round(Math.sin(a) * 2), 2, 2); } }
  // hp bar (+ P1/P2 tag)
  const w = 12, hp = Math.max(0, f.hp / f.maxHp); ctx.fillStyle = '#1a1424'; ctx.fillRect(x - w / 2 - 1, hy - 5, w + 2, 3); ctx.fillStyle = me ? '#f2c14e' : f.team === 0 ? '#5fd37a' : '#ff5d73'; ctx.fillRect(x - w / 2, hy - 4, Math.ceil(w * hp), 1);
  if (me) { ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = f.ctl === 'p1' ? '#f2c14e' : '#5fd37a'; ctx.fillText(f.ctl === 'p1' ? 'P1' : 'P2', x, hy - 6); ctx.textAlign = 'left'; } }
// ---------- frame ----------
export function draw(ctx, s, now, P) {
  ctx.fillStyle = '#05030f'; ctx.fillRect(0, OY, W, H - OY);
  if (s.phase === 'pick') return pickScreen(ctx, s, now, P);
  ctx.drawImage(backdrop(s, s.arena), 0, AY);
  ctx.save(); ctx.translate(0, AY);
  // kennels
  const hb = P.sprite('sc-house-b', SPR.house, { ...PAL, r: '#3a7bd5' }), hr = P.sprite('sc-house-r', SPR.house, { ...PAL, r: '#d6302f' }); ctx.drawImage(hb, 1, BONE.y - 22); ctx.drawImage(hr, W - hr.width - 1, BONE.y - 22);
  for (const k of s.crates) if (k.hp > 0) { const c = P.sprite('sc-crate', SPR.crate, PAL, { outline: false }); ctx.drawImage(c, k.c * T + 1 + (k.hit > 0 ? (k.hit-- % 2 ? 1 : -1) : 0), k.r * T + 1); }
  for (const it of s.items) { if (it.t < 120 && Math.floor(now * 8) % 2) continue; const spr = P.sprite('sc-' + it.kind, SPR[it.kind], PAL); ctx.drawImage(spr, Math.round(it.x - spr.width / 2), Math.round(it.y - spr.height / 2 + Math.sin(now * 5 + it.x) * 1.5)); }
  for (const z of s.zones) { if (z.kind === 'ring') { ctx.strokeStyle = z.heal ? '#ff9ad0' : '#fbf1e0'; ctx.globalAlpha = z.t / 16; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1.1 - z.t / 32), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    else { const c = picnic(); ctx.globalAlpha = Math.min(1, z.t / 30); ctx.drawImage(c, Math.round(z.x - c.width / 2), Math.round(z.y - c.height / 2)); ctx.globalAlpha = 1; } }
  // hazards (under the fighters)
  const z = s.hz; if (z?.kind === 'sprinkler' && z.st !== 'idle') for (const p of SPRINKLERS(s)) { if (z.st === 'warn') { ctx.fillStyle = '#9fd8ff'; if (Math.floor(now * 10) % 2) ctx.fillRect(p.x - 1, p.y - 8, 2, 3); }
    else { ctx.strokeStyle = '#9fd8ffcc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 34 * (1 - z.t / 30), 0, 7); ctx.stroke(); ctx.lineWidth = 1; } }
  if (z?.kind === 'surge' && z.st !== 'idle') { const y0 = z.band ? 160 : 16, h = z.band ? 48 : 48; ctx.fillStyle = z.st === 'warn' ? (Math.floor(now * 6) % 2 ? '#7ec8f033' : '#7ec8f018') : '#7ec8f066'; ctx.fillRect(16, y0, W - 32, h);
    if (z.st === 'surge') { ctx.fillStyle = '#fbf1e0aa'; const off = Math.floor(s.frame * 6 * z.dir); for (let i = 0; i < 10; i++) ctx.fillRect(16 + (((i * 31 + off) % (W - 40)) + (W - 40)) % (W - 40), y0 + (i * 13) % h, 8, 2); }
    else { ctx.font = '8px Silkscreen, monospace'; ctx.fillStyle = '#fbf1e0'; ctx.fillText(z.dir < 0 ? '<< SURGE' : 'SURGE >>', W / 2 - 18, y0 + 26); } }
  // the Big Bone
  const b = s.bone, bs = P.sprite('sc-bone', SPR.bone, PAL); ctx.fillStyle = '#00000040'; ctx.fillRect(Math.round(b.x) - 11, b.y + 3, 22, 3); ctx.drawImage(bs, Math.round(b.x - bs.width / 2), b.y - bs.height + 2);
  if (b.push) { ctx.fillStyle = b.push < 0 ? TEAM[0] : TEAM[1]; const d = Math.sign(b.push), ax = Math.round(b.x) + d * 16; for (let i = 0; i < Math.min(3, Math.abs(b.push)); i++) { const px = ax + d * i * 4; ctx.fillRect(px, b.y - 9, 2, 1); ctx.fillRect(px + d, b.y - 8, 2, 1); ctx.fillRect(px, b.y - 7, 2, 1); } }
  // fighters, back to front
  const list = s.fighters.filter((f) => !f.dead).sort((a, c) => a.y - c.y);
  for (const f of list) { const hidden = inBush(s, f.x, f.y); if (f.team === 1 && hidden && !seen(s, f)) continue; if (hidden) ctx.globalAlpha = 0.55; fighter(ctx, P, s, f, now); ctx.globalAlpha = 1; }
  for (const f of s.fighters) if (f.dead) { const sp = { x: f.team === 0 ? 34 : 222 }; ctx.font = '8px Silkscreen, monospace'; ctx.fillStyle = TEAM[f.team]; ctx.fillText(String(Math.ceil(f.respawn / 60)), sp.x - 2, [96, 128, 64][f.i % 3] + 2); }
  // shots
  for (const q of s.shots) { if (q.kind === 'yap') { ctx.strokeStyle = q.team === 0 ? '#bfe4ff' : '#ffc8c8'; ctx.beginPath(); ctx.arc(q.x, q.y - 4, 3, 0, 7); ctx.stroke(); }
    else if (q.kind === 'howl') { const a = Math.atan2(q.vy, q.vx); ctx.strokeStyle = q.team === 0 ? '#7ec8ff' : '#ff8a8a'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(q.x - Math.cos(a) * i * 5, q.y - 4 - Math.sin(a) * i * 5, ATK.howl.r - i * 2, a - 0.9, a + 0.9); ctx.stroke(); } ctx.lineWidth = 1; }
    else if (q.kind === 'lob') { ctx.fillStyle = '#00000040'; ctx.fillRect(Math.round(q.x) - 3, Math.round(q.y) + 1, 6, 2); const t = P.sprite('sc-treat', SPR.treat, PAL); ctx.drawImage(t, Math.round(q.x - t.width / 2), Math.round(q.y - (q.h || 0) - 8)); } }
  ctx.drawImage(bushes(s, s.arena), 0, 0);
  if (z?.kind === 'rugbot' && z.st === 'roam') { const r = P.sprite('sc-rug', SPR.rug, PAL); ctx.drawImage(r, Math.round(z.x - r.width / 2), Math.round(z.y - r.height / 2)); ctx.fillStyle = Math.floor(now * 6) % 2 ? '#ff3d5a' : '#7a1020'; ctx.fillRect(Math.round(z.x) - 1, Math.round(z.y) - 4, 2, 1); }
  ctx.restore();
  hud(ctx, s, now); banners(ctx, s, now, P);
}
function txt(ctx, t, x, y, c, size = 8, align = 'left', font = 'Silkscreen') { size = Math.max(8, size); ctx.font = `${size}px ${font === 'P' ? '"Press Start 2P"' : 'Silkscreen'}, monospace`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#000'; ctx.fillText(t, x + 1, y + 1); ctx.fillStyle = c; ctx.fillText(t, x, y); ctx.textAlign = 'left'; }
function hud(ctx, s, now) { const y = OY; ctx.fillStyle = '#0c0820'; ctx.fillRect(0, y, W, HB);
  for (let i = 0; i < 2; i++) { ctx.fillStyle = i < s.wins[0] ? TEAM[0] : '#2a2448'; ctx.fillRect(4 + i * 7, y + 3, 5, 5); ctx.fillStyle = i < s.wins[1] ? TEAM[1] : '#2a2448'; ctx.fillRect(124 + i * 7, y + 3, 5, 5); }
  txt(ctx, `M${s.match} ${rankOf(s.match)}`, 20, y + 9, '#c8bce8');
  const secs = Math.max(0, Math.ceil(s.timer / 60)), low = secs <= 10 && s.phase === 'fight'; txt(ctx, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 106, y + 9, low && Math.floor(now * 4) % 2 ? '#ff5d73' : '#f2c14e', 8, 'center');
  const p = player(s); if (p) { const full = p.sup >= SUPER.full; ctx.fillStyle = '#2a2448'; ctx.fillRect(142, y + 3, 56, 5); ctx.fillStyle = full ? (Math.floor(now * 8) % 2 ? '#f2c14e' : '#fff6c0') : '#c88a3c'; ctx.fillRect(142, y + 3, Math.round((56 * p.sup) / SUPER.full), 5);
    txt(ctx, full ? 'SUPER!' : 'SUPER', 170, y + 9, full ? '#1a1424' : '#fbf1e0', 8, 'center'); txt(ctx, 'ROLL', 252, y + 9, p.rollCd > 0 ? '#4a3a7a' : '#7ef0ff', 8, 'right'); } }
function banners(ctx, s, now, P) { const X = W / 2;
  const box = (y, h) => { ctx.fillStyle = '#000c'; ctx.fillRect(16, y, W - 32, h); ctx.strokeStyle = '#3a2a6a'; ctx.strokeRect(16.5, y + 0.5, W - 33, h - 1); };
  if (s.phase === 'ready') { box(AY + 70, 52); txt(ctx, `MATCH ${s.match} · ${ARENAS[s.arena].name}`, X, AY + 84, '#7ef0ff', 6, 'center'); txt(ctx, `ROUND ${s.round}`, X, AY + 100, '#fbf1e0', 8, 'center', 'P');
    txt(ctx, s.phaseT < 40 ? 'SCUFFLE!' : `VS ${rankOf(s.match)} PACK`, X, AY + 114, s.phaseT < 40 ? '#ff5d73' : '#c8bce8', 6, 'center'); }
  if (s.phase === 'roundEnd' && s.lastRound) { const w = s.lastRound.winner; box(AY + 76, 40); txt(ctx, w === 0 ? 'ROUND WON!' : w === 1 ? 'ROUND LOST' : 'DRAW', X, AY + 94, w === 0 ? '#5fd37a' : w === 1 ? '#ff5d73' : '#f2c14e', 8, 'center', 'P');
    txt(ctx, w === 0 ? `+${s.lastRound.pts}${s.lastRound.early ? ' · BONE HOME!' : ''}` : w === 1 ? (s.lives > 0 ? 'LOST A LIFE' : 'NO LIVES LEFT') : 'NOBODY GOT THE BONE', X, AY + 108, '#fbf1e0', 6, 'center'); }
  if (s.phase === 'matchEnd' && s.lastMatch) { box(AY + 66, 60); const m = s.lastMatch; txt(ctx, m.won ? 'MATCH WON!' : 'MATCH LOST', X, AY + 84, m.won ? '#f2c14e' : '#ff5d73', 8, 'center', 'P');
    txt(ctx, m.won ? `+${m.pts}${m.flawless ? ' FLAWLESS' : ''} · +1 LIFE` : 'REMATCH AT THE SAME RANK', X, AY + 98, '#fbf1e0', 6, 'center'); if (m.won) txt(ctx, `RANK UP: ${rankOf(s.match + 1)}`, X, AY + 112, '#7ef0ff', 6, 'center'); } }
function pickScreen(ctx, s, now, P) { const X = W / 2; txt(ctx, 'PICK YOUR SHIBA', X, OY + 22, '#4fc3e8', 8, 'center', 'P'); txt(ctx, '< > CHOOSE · A: SCUFFLE', X, OY + 34, '#8a7ac4', 6, 'center');
  ROLE_IDS.forEach((id, i) => { const R = ROLES[id], x = 6 + i * 62, y = OY + 42, on = i === s.pick; ctx.fillStyle = on ? '#2a2060' : '#140e30'; ctx.fillRect(x, y, 58, 156); ctx.strokeStyle = on ? '#f2c14e' : '#3a2a6a'; ctx.strokeRect(x + 0.5, y + 0.5, 57, 155);
    const spr = shiba(P, id, 'front', on ? Math.floor(now * 4) % 2 : 0, '#3a7bd5', false); ctx.drawImage(spr, x + 29 - spr.width, y + 10, spr.width * 2, spr.height * 2);
    txt(ctx, R.name, x + 29, y + 45, on ? '#f2c14e' : '#fbf1e0', 6, 'center'); txt(ctx, R.role, x + 29, y + 55, '#7ef0ff', 5, 'center');
    const bar = (label, v, yy) => { txt(ctx, label, x + 3, yy, '#8a7ac4'); ctx.fillStyle = '#2a2448'; ctx.fillRect(x + 25, yy - 5, 29, 4); ctx.fillStyle = '#5fd37a'; ctx.fillRect(x + 25, yy - 5, Math.round(29 * Math.min(1, v)), 4); };
    bar('HP', R.hp / 150, y + 69); bar('SPD', R.speed / 1.35, y + 79); bar('RNG', R.range / 112, y + 89);
    txt(ctx, 'A', x + 3, y + 103, '#f2c14e'); wrapT(ctx, R.atk, x + 3, y + 112, 9); txt(ctx, 'B SUPER', x + 3, y + 129, '#f2c14e'); wrapT(ctx, R.sup, x + 3, y + 138, 9); });
  txt(ctx, 'C DODGE ROLL · TUG THE BIG BONE HOME', X, OY + 210, '#c8bce8', 5, 'center'); txt(ctx, 'FIRST TO 2 ROUNDS WINS THE MATCH', X, OY + 221, '#c8bce8', 5, 'center'); }
function wrapT(ctx, t, x, y, max) { const words = t.toUpperCase().split(' '); let line = '', yy = y; for (const w of words) { if ((line + ' ' + w).trim().length > max) { txt(ctx, line.trim(), x, yy, '#fbf1e0'); yy += 9; line = w; } else line += ' ' + w; } txt(ctx, line.trim(), x, yy, '#fbf1e0'); }
