// FUD Swarm art: original pixel sprites (char grids -> cached canvases via pix.sprite), one cached field canvas drawn with a
// single source-rect blit, view culling, and pooled entities, so a busy frame is ~200 small drawImage calls.
import { W, H, OY, HB, AY, VH, FW, FH, FOES, TREES, FENCE, WEAPONS, PASSIVES, WSTAT, need, orbitPts, player } from './fud.js';
const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const SKIN = { gold: '#f2c14e', neon: '#7ef0ff' };
const HERO = {
  front: [['.o......o.', '.oo....oo.', '.oooooooo.', 'oeooooooeo', 'oowwwwwwoo', '.owwnnwwo.', '..owwwwo..', '.obbbbbbo.', '.oo.oo.oo.', '.dd.dd.dd.'], ['.o......o.', '.oo....oo.', '.oooooooo.', 'oeooooooeo', 'oowwwwwwoo', '.owwnnwwo.', '..owwwwo..', '.obbbbbbo.', 'oo..oo..oo', 'dd..dd..dd']],
  back: [['.o......o.', '.oo....oo.', '.oooooooo.', '.oooooooo.', '..oooooo..', '.obbbbbbo.', 'oooowwoooo', '.oo.ww.oo.', '.dd....dd.'], ['.o......o.', '.oo....oo.', '.oooooooo.', '.oooooooo.', '..oooooo..', '.obbbbbbo.', 'oooowwoooo', 'oo..ww..oo', 'dd......dd']],
  side: [['.........o.o..', '........ooooo.', '.o......oowoeo', 'oo.....oooowwn', '.oooooobbbwww.', '.oooooooooo...', '.owwwwwwwo....', '.oo.oo..oo.oo.', '.dd.dd..dd.dd.'], ['.........o.o..', '........ooooo.', '.o......oowoeo', 'oo.....oooowwn', '.oooooobbbwww.', '.oooooooooo...', '.owwwwwwwo....', '..oo.oo.oo.oo.', '..dd..d..dd.d.']] };
const BOT = {
  drone: ['....r....', '....G....', '..ggggg..', '.gggggggg', '.gwwrwwgg', '.ggggggg.', '..GGGGG..', '...G.G...'],
  roller: ['..bbbbbb..', '.bRbbRbbb.', 'bbbbbbbbbb', 'bwrbbwrbbb', 'bbbbbbbbbb', 'bRbbRbbRbb', '.bbbbbbbb.', '..BBBBBB..'],
  paper: ['..wwwwww..', '.wwgwwwgw.', 'wwwwwwwwww', 'wwGwwwGwww', 'wwwwwwwwww', 'wwwGGGwwww', 'gw.wwwww.g', 'g..ww.ww..', '...gg.gg..'],
  shill: ['y.........', 'yy..gggg..', 'yyyggggggg', 'yyygrggrgg', 'yyygggggg.', 'yy..gGGg..', 'y...g..g..', '....G..G..'],
  bear: ['.RR......RR.', 'RRRR....RRRR', '.RrrrrrrrrR.', 'RrrwrrrrwrrR', 'Rrrkrrrrkrr.', 'RrrrrBBrrrrR', 'RrrrBBBBrrrR', '.RrrrrrrrrR.', '.RRr.RR.rRR.', '..RR....RR..'],
  whale: ['......cccc..............', '....cccccccc........cc..', '..ccccccccccccc....ccc..', '.cccwkcccccccccc..cccc..', 'ccccccccccccccccccccc...', 'cCCCCCCCCcccccccccccc...', 'cCwCwCwCCCcccccccccccc..', '.cCCCCCCCcccccccccc..ccc', '..cccccccccccccccc....cc', '....cccccccccccc........', '......CC....CC..........'],
  dump: ['....BBBBBBBBBB....', '...BbbbbbbbbbbB...', '..BbbbbbbbbbbbbB..', '.BbbrrbbbbbrrbbbB.', '.BbbrrbbbbbrrbbbB.', '.BbbbbbbbbbbbbbbB.', '.BbbbbRRRRRRbbbbB.', '.BbbbbbbbbbbbbbbB.', '.BBBBBBBBBBBBBBBB.', '..GGG........GGG..', '..GgG........GgG..'],
  king: ['.y...y...y...y..', '.yy.yyy.yyy.yy..', '.yyyyyyyyyyyyy..', '.ppppppppppppp..', 'pppppppppppppppp', 'ppwwrpppppwwrppp', 'ppwrrpppppwrrppp', 'pppppppppppppppp', 'pppPPPPPPPPPpppp', 'ppPPrPrPrPrPPppp', '.pppppppppppppp.', '..PP..PP..PP..PP'] };
const BPAL = { g: '#8a7ac4', G: '#4a3a7a', r: '#ff3d5a', w: '#fbf1e0', b: '#a8603a', B: '#6a3a22', R: '#c8302a', y: '#f2c14e', k: '#1a1424', c: '#5a8ac8', C: '#3a5a8a', p: '#9b6dff', P: '#5a3aa8' };
const FLASH = Object.fromEntries(Object.keys(BPAL).map((k) => [k, '#ffffff']));
const SPR = { crumb1: ['kk', 'kk'], crumb3: ['.k.', 'kKk', '.k.'], crumb10: ['.kk.', 'kKKk', 'kKKk', '.kk.'], bone: ['w..w', 'wwww', 'w..w'], kib: ['.k.', 'kKk', '.k.'],
  treat: ['..pp..', '.pppp.', 'pwpppp', 'pppppp', '.pppp.'], coin: ['.YYY.', 'YOYOY', 'YYOYY', 'YOYOY', '.YYY.'], magnet: ['g...g', 'g...g', 'g...g', 'rg.gr', '.ggg.'], chest: ['.KKKKKK.', 'KkkkkkkK', 'KYYYYYYK', 'KkkYYkkK', 'KkkkkkkK', 'KKKKKKKK'],
  mine: ['p.p.p', '.....', '.ppp.', 'ppppp', '.ppp.'], spam: ['rr', 'rr'] };
const PAL = { k: '#7ef0ff', K: '#fbf1e0', w: '#fbf1e0', p: '#ff9ad0', Y: '#f2c14e', O: '#b8860b', g: '#8a90a8', r: '#ff3d5a' };
const CPAL = { 1: { k: '#7ef0ff', K: '#ffffff' }, 3: { k: '#5fd37a', K: '#d8ffd8' }, 10: { k: '#f2c14e', K: '#fff6c0' } };
const CRUMB_TIERS = [[0, 3, '#7ef0ff', 2], [3, 10, '#5fd37a', 3], [10, 1e9, '#f2c14e', 4]];
let field = null;
function fieldCanvas() { if (field) return field; field = mk(FW, FH); const g = field.getContext('2d');
  for (let y = 0; y < FH; y += 32) for (let x = 0; x < FW; x += 32) { g.fillStyle = ((x + y) / 32) % 2 ? '#3e7a46' : '#43824a'; g.fillRect(x, y, 32, 32); }
  let r = 7; const rn = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 900; i++) { const x = (rn() * FW) | 0, y = (rn() * FH) | 0; g.fillStyle = rn() < 0.75 ? '#5a9a5a' : ['#ffb8d8', '#fbf1e0', '#f2c14e', '#b48cff'][(rn() * 4) | 0]; g.fillRect(x, y, rn() < 0.8 ? 1 : 2, 1); }
  g.fillStyle = '#8a7a4a55'; for (let i = 0; i < FW; i += 3) { g.fillRect(i, FH / 2 - 6 + Math.round(Math.sin(i / 40) * 8), 3, 12); g.fillRect(FW / 2 - 6 + Math.round(Math.sin(i / 50) * 8), i, 12, 3); } // crossing dirt paths
  g.fillStyle = '#6a4a2a'; g.fillRect(0, 0, FW, FENCE); g.fillRect(0, FH - FENCE, FW, FENCE); g.fillRect(0, 0, FENCE, FH); g.fillRect(FW - FENCE, 0, FENCE, FH);
  g.fillStyle = '#a8784a'; for (let i = 0; i < FW; i += 12) { g.fillRect(i, FENCE - 8, 3, 8); g.fillRect(i, FH - FENCE, 3, 8); g.fillRect(FENCE - 8, i, 8, 3); g.fillRect(FW - FENCE, i, 8, 3); }
  g.fillRect(0, FENCE - 6, FW, 2); g.fillRect(0, FH - FENCE + 4, FW, 2); g.fillRect(FENCE - 6, 0, 2, FH); g.fillRect(FW - FENCE + 4, 0, 2, FH);
  for (const t of TREES) { g.fillStyle = '#00000040'; g.beginPath(); g.ellipse(t.x + 3, t.y + 6, 15, 7, 0, 0, 7); g.fill(); g.fillStyle = '#6a4a2a'; g.fillRect(t.x - 2, t.y - 2, 4, 8);
    for (const [dx, dy, rr, c] of [[0, -8, 12, '#2f6a34'], [-6, -10, 7, '#3a8a40'], [5, -12, 7, '#3a8a40'], [-2, -15, 5, '#5fbf5a'], [3, -6, 4, '#ffb8d8']]) { g.fillStyle = c; g.beginPath(); g.arc(t.x + dx, t.y + dy, rr, 0, 7); g.fill(); } }
  return field; }
const hero = (P, view, fr, band, flip) => P.sprite(`fs-hero-${view}-${fr}-${band}`, HERO[view][fr], { o: '#e0802c', d: '#b65a1c', w: '#fbf1e0', e: '#1a1424', n: '#3a2430', b: band }, { flip });
const BC = {}; const bot = (P, type, fl) => { const k = fl ? type + 'F' : type; return BC[k] || (BC[k] = P.sprite(`fs-${k}`, BOT[type], fl ? FLASH : BPAL)); }; // local cache: no key strings per bot per frame
function txt(ctx, t, x, y, c, align = 'left', size = 8, font = 'Silkscreen') { ctx.font = `${size}px ${font === 'P' ? '"Press Start 2P"' : 'Silkscreen'}, monospace`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#000'; ctx.fillText(t, x + 1, y + 1); ctx.fillStyle = c; ctx.fillText(t, x, y); ctx.textAlign = 'left'; }
export function draw(ctx, s, now, P) {
  const cx = Math.round(s.cam.x), cy = Math.round(s.cam.y), sh = s.shake > 0 ? Math.round((Math.sin(now * 90) * s.shake) * 6) : 0, X = (x) => Math.round(x) - cx + sh, Y = (y) => Math.round(y) - cy + AY;
  const vis = (x, y, m = 24) => x > cx - m && x < cx + W + m && y > cy - m && y < cy + VH + m;
  ctx.drawImage(fieldCanvas(), cx, cy, W, VH, sh, AY, W, VH);
  ctx.save(); ctx.beginPath(); ctx.rect(0, AY, W, VH); ctx.clip();
  // pickups
  // crumbs: one fillStyle per tier and plain rects (up to 220 of them, so no per-crumb drawImage)
  for (const [lo, hi, c, sz] of CRUMB_TIERS) { ctx.fillStyle = c; for (let i = 0; i < s.X.n; i++) { const q = s.X.a[i]; if (q.v < lo || q.v >= hi || !vis(q.x, q.y, 4)) continue; ctx.fillRect(X(q.x) - (sz >> 1), Y(q.y) - (sz >> 1), sz, sz); } }
  for (let i = 0; i < s.I.n; i++) { const it = s.I.a[i]; if (!vis(it.x, it.y) || (it.t < 180 && Math.floor(now * 8) % 2)) continue; const sp = P.sprite('fs-' + it.kind, SPR[it.kind], PAL); ctx.drawImage(sp, X(it.x) - (sp.width >> 1), Y(it.y) - (sp.height >> 1) + Math.round(Math.sin(now * 5 + it.x) * 1.5)); }
  for (let i = 0; i < s.M.n; i++) { const m = s.M.a[i]; if (!vis(m.x, m.y)) continue; const sp = P.sprite('fs-mine', SPR.mine, PAL); ctx.globalAlpha = m.life < 60 && Math.floor(now * 10) % 2 ? 0.4 : 1; ctx.drawImage(sp, X(m.x) - 3, Y(m.y) - 3); ctx.globalAlpha = 1; }
  // zones under the swarm
  for (let i = 0; i < s.Z.n; i++) { const z = s.Z.a[i], a = z.t / z.len; if (z.kind === 'ring' || z.kind === 'boom') { ctx.strokeStyle = z.kind === 'boom' ? '#ff9ad0' : '#fbf1e0'; ctx.globalAlpha = a * 0.8; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(z.x), Y(z.y), z.r * (1.05 - a * 0.4), 0, 7); ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 1; } }
  // bots
  for (let i = 0; i < s.E.n; i++) { const o = s.E.a[i]; if (o.hp <= 0 || !vis(o.x, o.y, 30)) continue; const sp = bot(P, o.type, o.flash > 0), bob = o.boss ? 0 : Math.round(Math.sin(now * 6 + o.uid) * 1);
    if (o.type === 'dump' && o.st === 1 && Math.floor(now * 12) % 2) { ctx.fillStyle = '#ff3d5a55'; ctx.fillRect(X(o.x) - 20, Y(o.y) - 16, 40, 30); }
    ctx.drawImage(sp, X(o.x) - (sp.width >> 1), Y(o.y) - (sp.height >> 1) + bob);
    if (o.elite || o.boss) { const w = o.boss ? 30 : 14; ctx.fillStyle = '#1a1424'; ctx.fillRect(X(o.x) - w / 2, Y(o.y) - (sp.height >> 1) - 5, w, 2); ctx.fillStyle = '#ff5d73'; ctx.fillRect(X(o.x) - w / 2, Y(o.y) - (sp.height >> 1) - 5, Math.ceil((w * o.hp) / o.max), 2); } }
  // spam pellets + bones
  const spm = P.sprite('fs-spam', SPR.spam, PAL, { outline: false }); for (let i = 0; i < s.Q.n; i++) { const q = s.Q.a[i]; if (vis(q.x, q.y, 4)) ctx.drawImage(spm, X(q.x) - 1, Y(q.y) - 1); }
  const bn = P.sprite('fs-bone', SPR.bone, PAL); for (let i = 0; i < s.S.n; i++) { const q = s.S.a[i]; if (vis(q.x, q.y, 6)) ctx.drawImage(bn, X(q.x) - 3, Y(q.y) - 2); }
  // hero
  const p = s.p, band = s.skin ? SKIN[s.skin] : '#9b6dff', side = Math.abs(p.fx) >= Math.abs(p.fy) * 0.9, view = side ? 'side' : p.fy < 0 ? 'back' : 'front', fr = p.anim ? Math.floor(p.anim / 8) % 2 : 0, hs = hero(P, view, fr, band, side && p.fx < 0);
  if (s.phase !== 'dead' || Math.floor(now * 8) % 2) { ctx.fillStyle = '#00000040'; ctx.fillRect(X(p.x) - 6, Y(p.y) + 3, 12, 3);
    if (p.dashF > 0) { ctx.globalAlpha = 0.35; ctx.drawImage(hs, X(p.x - p.dx * 8) - (hs.width >> 1), Y(p.y - p.dy * 8) - hs.height + 4); ctx.globalAlpha = 1; }
    if (p.inv > 0 && p.dashF <= 0 && Math.floor(now * 20) % 2) ctx.globalAlpha = 0.5; ctx.drawImage(hs, X(p.x) - (hs.width >> 1), Y(p.y) - hs.height + 4); ctx.globalAlpha = 1;
    if (p.hurtF > 0) { ctx.fillStyle = '#ff5d7388'; ctx.fillRect(X(p.x) - 6, Y(p.y) - 7, 12, 9); }
    if (p.shield > 0) { ctx.strokeStyle = Math.floor(now * 10) % 2 ? '#7ef0ff' : '#fbf1e0'; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y) - 3, 12, 0, 7); ctx.stroke(); } }
  // orbiting kibbles, beams, tail arcs (over the swarm)
  const kb = P.sprite('fs-kib', SPR.kib, { k: '#c88a3c', K: '#f2c14e' }); for (const q of orbitPts(s)) ctx.drawImage(kb, X(q.x) - 2, Y(q.y) - 2);
  for (let i = 0; i < s.Z.n; i++) { const z = s.Z.a[i], a = z.t / z.len;
    if (z.kind === 'beam') { ctx.strokeStyle = '#ff3d5a'; ctx.globalAlpha = a; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(z.x), Y(z.y)); ctx.lineTo(X(z.x2), Y(z.y2)); ctx.stroke(); ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; }
    else if (z.kind === 'arc') { const ang = Math.atan2(z.y2, z.x2); ctx.strokeStyle = '#fbf1e0'; ctx.globalAlpha = a; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(z.x), Y(z.y) - 2, z.r * 0.8, ang - 1.3 + (1 - a), ang + 1.3 - (1 - a) * 0.3); ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 1; } }
  // off-screen boss pointer
  if (s.boss && !vis(s.boss.x, s.boss.y, -10)) { const a = Math.atan2(s.boss.y - p.y, s.boss.x - p.x), px = Math.max(8, Math.min(W - 8, W / 2 + Math.cos(a) * 110)), py = Math.max(AY + 14, Math.min(H - 8, AY + VH / 2 + Math.sin(a) * 100)); ctx.fillStyle = Math.floor(now * 6) % 2 ? '#ff3d5a' : '#f2c14e'; ctx.fillRect(px - 3, py - 3, 6, 6); }
  ctx.restore();
  hud(ctx, s, now);
  if (s.boss) { const b = s.boss; ctx.fillStyle = '#000a'; ctx.fillRect(40, AY + 3, 176, 12); txt(ctx, FOES[b.type].name, 128, AY + 12, '#ff9a9a', 'center'); ctx.fillStyle = '#ff3d5a'; ctx.fillRect(42, AY + 13, Math.ceil(172 * Math.max(0, b.hp) / b.max), 2); }
  if (s.warn > 0 && Math.floor(now * 4) % 2) txt(ctx, s.warnText === 'FUD SWARM!' ? 'FUD SWARM INCOMING!' : 'BOSS: ' + s.warnText, 128, AY + 40, '#ff5d73', 'center');
  if (s.phase === 'ready') { box(ctx, AY + 76, 56); txt(ctx, 'HOLD THE MEADOW', 128, AY + 94, '#9b6dff', 'center', 8, 'P'); txt(ctx, 'TRICKS FIRE ON THEIR OWN', 128, AY + 108, '#fbf1e0', 'center'); txt(ctx, 'A: ZOOM DASH · B: BIG BARK', 128, AY + 120, '#c8bce8', 'center'); }
  if (s.phase === 'choose') chooser(ctx, s, now, P);
  if (s.phase === 'dead') { box(ctx, AY + 86, 32); txt(ctx, 'THE FUD GOT YOU', 128, AY + 106, '#ff5d73', 'center', 8, 'P'); }
}
function box(ctx, y, h) { ctx.fillStyle = '#000c'; ctx.fillRect(12, y, W - 24, h); ctx.strokeStyle = '#3a2a6a'; ctx.strokeRect(12.5, y + 0.5, W - 25, h - 1); }
function hud(ctx, s, now) { const y = OY, p = s.p; ctx.fillStyle = '#0c0820'; ctx.fillRect(0, y, W, HB);
  ctx.fillStyle = '#2a2448'; ctx.fillRect(3, y + 2, 44, 6); ctx.fillStyle = p.hp < p.maxHp * 0.3 && Math.floor(now * 6) % 2 ? '#ff9a9a' : '#ff5d73'; ctx.fillRect(3, y + 2, Math.ceil((44 * Math.max(0, p.hp)) / p.maxHp), 6);
  txt(ctx, 'LV' + p.lvl, 50, y + 9, '#7ef0ff'); ctx.fillStyle = '#2a2448'; ctx.fillRect(76, y + 3, 50, 4); ctx.fillStyle = '#7ef0ff'; ctx.fillRect(76, y + 3, Math.round((50 * Math.min(p.xp, need(p.lvl))) / need(p.lvl)), 4);
  const sec = Math.floor(s.t); txt(ctx, `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, 148, y + 9, s.t > 600 ? '#ff9ad0' : '#f2c14e', 'center');
  txt(ctx, String(s.stats.kills), 196, y + 9, '#c8bce8', 'right');
  const full = p.meter >= 100; ctx.fillStyle = '#2a2448'; ctx.fillRect(202, y + 3, 50, 4); ctx.fillStyle = full ? (Math.floor(now * 8) % 2 ? '#f2c14e' : '#fff6c0') : '#c88a3c'; ctx.fillRect(202, y + 3, Math.round(p.meter / 2), 4);
  if (full) txt(ctx, 'B!', 252, y + 9, '#1a1424', 'right'); }
function chooser(ctx, s, now, P) { const c = s.choice; box(ctx, AY + 8, 206); txt(ctx, 'LEVEL UP!', 128, AY + 26, '#f2c14e', 'center', 8, 'P'); txt(ctx, 'LEFT/RIGHT + A TO PICK', 128, AY + 40, '#8a7ac4', 'center');
  c.opts.forEach((o, i) => { const x = 18 + i * 74, y = AY + 50, on = i === c.sel, D = o.kind === 'w' ? WEAPONS[o.id] : o.kind === 'p' ? PASSIVES[o.id] : { name: 'TREAT SNACK', desc: 'Heal 30, +100' };
    ctx.fillStyle = on ? '#2a2060' : '#140e30'; ctx.fillRect(x, y, 70, 150); ctx.strokeStyle = on ? (Math.floor(now * 6) % 2 ? '#f2c14e' : '#fff6c0') : '#3a2a6a'; ctx.strokeRect(x + 0.5, y + 0.5, 69, 149);
    txt(ctx, o.kind === 'w' ? 'TRICK' : o.kind === 'p' ? 'PERK' : 'SNACK', x + 35, y + 14, o.kind === 'w' ? '#ff9ad0' : '#7ef0ff', 'center');
    icon(ctx, P, o, x + 35, y + 38); let yy = y + 66; for (const w of wrap(D.name, 10)) { txt(ctx, w, x + 35, yy, on ? '#f2c14e' : '#fbf1e0', 'center'); yy += 10; }
    txt(ctx, o.lvl > 1 ? `LV ${o.lvl - 1} > ${o.lvl}` : 'NEW', x + 35, yy + 2, '#5fd37a', 'center'); yy += 16; for (const w of wrap(D.desc.toUpperCase(), 11)) { txt(ctx, w, x + 35, yy, '#c8bce8', 'center'); yy += 9; } }); }
function icon(ctx, P, o, x, y) { const m = { bark: ['..ww..', '.w..w.', 'w....w', 'w....w', '.w..w.', '..ww..'], bone: SPR.bone, orbit: ['.k..k.', 'k....k', '......', 'k....k', '.k..k.'], gaze: ['r.....', '.rr...', '...rr.', '.....r'], paw: SPR.mine, tail: ['....ww', '...ww.', '..ww..', 'www...'],
    coat: ['.pppp.', 'pppppp', 'pppppp', '.pppp.'], zoom: ['k..k..', '.k..k.', '..k..k', '.k..k.', 'k..k..'], nose: ['.kkk.', 'kKKKk', 'kKKKk', '.kkk.'], teeth: ['w.w.w.w', 'wwwwwww'], paws: ['Y.Y', '.Y.', 'Y.Y'], good: ['.r.r.', 'rrrrr', '.rrr.', '..r..'], snack: SPR.treat }[o.id] || SPR.treat;
  const sp = P.sprite('fs-ic-' + o.id, m, { ...PAL, k: '#c88a3c', K: '#f2c14e', p: '#ff9ad0' }); ctx.drawImage(sp, x - sp.width, y - sp.height, sp.width * 2, sp.height * 2); }
function wrap(t, max) { const out = []; let line = ''; for (const w of t.split(' ')) { if ((line + ' ' + w).trim().length > max) { if (line) out.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) out.push(line.trim()); return out; }
