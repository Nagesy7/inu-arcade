// Inu Arcade runtime: router, fixed-step loop, lobby hall, cabinet state machine (title/attract/play/over/initials/results).
import { createInput } from './core/input.js';
import { sfx, unlockAudio, isMuted, setMuted, setMusic } from './core/audio.js';
import * as MET from './core/meta.js';
import * as PIX from './core/pix.js';
import * as S from './core/scores.js';
import * as R from './core/rewards.js';
import { simWallet, pendingWallet, kibblePayWallet, setWallet, wallet } from './core/wallet.js';
import { drawInuAvatar } from './vendor/inu-avatar.js';
import { normalizeProfile } from './vendor/profile-schema.js';
import * as Chomp from './games/chomp.js'; import * as Invaders from './games/invaders.js'; import * as Crossing from './games/crossing.js'; import * as Breaker from './games/breaker.js';
import { openPanel, closePanel, panelOpen, showResults, showScores, showPrizes, showProfile, showRescue, refreshPurse, showAchievements } from './ui.js';

export const GAMES = { 'kibble-chomp': Chomp, 'bark-invaders': Invaders, 'pup-crossing': Crossing, 'bone-breaker': Breaker };
export const RESCUE_URL = 'https://inu-rescue.vercel.app';
const $ = (q) => document.querySelector(q);
const cv = $('#screen'), ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window; if (isTouch) document.body.classList.add('touch');
const input = createInput(window);
const LS = (() => { try { localStorage.setItem('_t', '1'); return localStorage; } catch { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; } })();
const scoreStore = S.createScoreStore(LS);
export const DEMO = new URLSearchParams(location.search).get('demo') === '1';
const PURSE_KEY = DEMO ? 'inuarcade.demo.wallet.v1' : 'inuarcade.wallet.v1'; // demo progress never leaks into real mode
export const A = { db: S.seedHouse(scoreStore.load()), purse: load(PURSE_KEY, R.newWallet()), profile: normalizeProfile(load('inuarcade.profile.v1', null)), initials: LS.getItem('inuarcade.initials') || 'AAA', scene: null, cab: null, lobby: null, input, LS };
if (!DEMO) for (const g of Object.keys(A.purse.skins || {})) A.purse.skins[g] = A.purse.skins[g].filter((k) => k !== 'gold'); // burn skins come only from the wallet's server inventory
setWallet(DEMO ? simWallet(LS) : pendingWallet()); A.wallet = wallet; A.mode = DEMO ? 'demo' : 'loading';
// kibble-pay glue: real wallet + footer (Terms / Prize Rules). Demo (fake KIBBLE) only with ?demo=1.
import('https://kibble-pay.vercel.app/inu-games.js').then(async (g) => { A.glue = g;
  const K = await g.initKibble({ game: 'inu-arcade' }); A.mode = K.mode; g.mountFooter(K.mode);
  if (K.kp) { A.kp = K.kp; setWallet(kibblePayWallet(K.kp)); if (K.kp.session && K.kp.address) syncWallet().catch(() => {}); } }).catch(() => { if (!DEMO) A.mode = 'offline'; });
// after sign-in: wallet-owned burn skins + the wallet's shared Shiba
export async function syncWallet() { const w = wallet(); if (!w?.address || w.simulated) return;
  const inv = await w.inventory(); for (const k of Object.keys(inv)) { const m = k.match(/^burn:inu-arcade:skin:([\w-]+):(\w+)$/); if (m && inv[k] > 0) { const l = (A.purse.skins[m[1]] ||= []); if (!l.includes(m[2])) l.push(m[2]); } }
  const sh = await A.glue.loadShiba(w.address); if (sh.exists) { const keep = A.profile.outfit; A.profile = sh.profile; for (const k of Object.keys(keep || {})) if (!A.profile.outfit[k] && keep[k]) A.profile.outfit[k] = keep[k]; }
  save(); }
function load(k, d) { try { const v = JSON.parse(LS.getItem(k)); return v ?? d; } catch { return d; } }
export function save() { scoreStore.save(A.db); LS.setItem(PURSE_KEY, JSON.stringify(A.purse)); LS.setItem('inuarcade.profile.v1', JSON.stringify(A.profile)); LS.setItem('inuarcade.initials', A.initials); refreshPurse(); }
window.__arcade = A;

// ---------- layout ----------
function fit() { const top = isTouch ? 0 : 34, W = innerWidth, H = innerHeight - top, cw = cv.width, ch = cv.height; let s = Math.min(W / cw, H / ch); if (s >= 2) s = Math.floor(s * 2) / 2;
  cv.style.width = Math.floor(cw * s) + 'px'; cv.style.height = Math.floor(ch * s) + 'px'; $('#stage').style.top = top + 'px'; }
addEventListener('resize', fit); fit();

// ---------- text helpers ----------
const F = (px) => `${px}px "Press Start 2P", monospace`;
export function text(str, x, y, col = '#fbf1e0', px = 8, align = 'left', shadow = true) { ctx.font = F(px); ctx.textAlign = align; ctx.textBaseline = 'top'; if (shadow) { ctx.fillStyle = '#000'; ctx.fillText(str, x + 1, y + 1); } ctx.fillStyle = col; ctx.fillText(str, x, y); ctx.textAlign = 'left'; }
function wrap(str, max) { const out = []; let line = ''; for (const w of str.split(' ')) { if ((line + ' ' + w).trim().length > max) { out.push(line.trim()); line = w; } else line += ' ' + w; } out.push(line.trim()); return out; }

// ---------- router ----------
const PATHS = [...Object.keys(GAMES), 'inu-rescue'];
function routeId() { const p = location.pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '').split('/')[0]; const h = location.hash.replace(/^#\/?/, ''); return PATHS.includes(p) ? p : PATHS.includes(h) ? h : null; }
export function go(id, push = true) {
  closePanel(); input.clear(); setMusic(false);
  if (id === 'inu-rescue') { if (push) history.pushState({}, '', '/'); toLobby(false); showRescue(); return; }
  if (id && GAMES[id]) { if (push && location.pathname !== '/' + id) history.pushState({}, '', '/' + id); openCab(id); }
  else { if (push && location.pathname !== '/') history.pushState({}, '', '/'); toLobby(false); }
}
addEventListener('popstate', () => go(routeId(), false));

// ---------- lobby ----------
export const CABS = [
  { id: 'inu-rescue', title: 'INU RESCUE', short: 'RESCUE', color: '#f08030', x: 22 },
  { id: 'kibble-chomp', title: 'KIBBLE CHOMP', short: 'CHOMP', color: Chomp.META.color, x: 82 },
  { id: 'bark-invaders', title: 'BARK INVADERS', short: 'INVADE', color: Invaders.META.color, x: 142 },
  { id: 'pup-crossing', title: 'PUP CROSSING', short: 'CROSS', color: Crossing.META.color, x: 202 },
  { id: 'bone-breaker', title: 'BONE BREAKER', short: 'BREAK', color: Breaker.META.color, x: 262 },
];
const CW = 40, CY = 30, CH = 62, FLOOR_Y = 100, COUNTER = { x: 312, y: 150, w: 66, h: 34 }, BOARD = { x: 314, y: 22, w: 66, h: 54 };
export function cabRect(c) { return { x: c.x, y: CY, w: CW, h: CH }; }
function setRes(w, h) { if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; ctx.imageSmoothingEnabled = false; fit(); } }
function toLobby(push = true) { setRes(384, 216); if (push) history.pushState({}, '', '/'); A.scene = 'lobby'; A.cab = null; A.lobby ||= { x: 192, y: 150, face: 'down', walk: 0, target: null, pending: null, t: 0 }; document.title = 'Inu Arcade · Shiba-powered retro cabinets'; }
function lobbyTargets() { return [...CABS.map((c) => ({ kind: 'cab', id: c.id, x: c.x + CW / 2, y: FLOOR_Y + 8, label: c.title })), { kind: 'prizes', x: COUNTER.x + COUNTER.w / 2, y: COUNTER.y - 10, label: 'PRIZE COUNTER' }, { kind: 'scores', x: BOARD.x + BOARD.w / 2, y: FLOOR_Y + 8, label: 'HI-SCORE BOARD' }]; }
function nearTarget(L) { return lobbyTargets().find((t) => Math.abs(t.x - L.x) < 18 && Math.abs(t.y - L.y) < 16); }
function activate(t) { if (!t) return; sfx('select'); if (t.kind === 'cab') go(t.id); else if (t.kind === 'prizes') showPrizes(); else if (t.kind === 'scores') showScores(); }
function updateLobby(dt, inp) {
  const L = A.lobby; L.t += dt; let dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), dy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
  if (dx || dy) { L.target = null; L.pending = null; }
  else if (L.target) { const vx = L.target.x - L.x, vy = L.target.y - L.y, d = Math.hypot(vx, vy); if (d < 2) { L.target = null; if (L.pending) { const p = L.pending; L.pending = null; activate(p); return; } } else { dx = vx / d; dy = vy / d; } }
  if (dx || dy) { const m = Math.hypot(dx, dy), sp = 80 * dt; let nx = Math.max(10, Math.min(374, L.x + (dx / m) * sp)), ny = Math.max(FLOOR_Y + 6, Math.min(208, L.y + (dy / m) * sp));
    if (nx > COUNTER.x - 6 && nx < COUNTER.x + COUNTER.w + 6 && ny > COUNTER.y - 2 && ny < COUNTER.y + COUNTER.h + 12) { nx = L.x; ny = L.y; }
    L.x = nx; L.y = ny; L.walk += dt; L.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'; } else L.walk = 0;
  if (inp.pressed.has('a') || inp.pressed.has('start')) activate(nearTarget(L));
}
function marqueeText() { return CABS.filter((c) => GAMES[c.id]).map((c) => { const b = S.board(A.db, c.id, 'all')[0]; return `${c.title} HI ${b ? b.name + ' ' + b.score : '---'}`; }).join('   ★   ') + '   ★   ARCADE CHAMP: ' + (S.arcadeBoard(A.db, 'daily')[0]?.name || '---') + '   ★   FREE PLAY · SKILL PRIZES ONLY   ★   '; }
function drawLobby(now) {
  const L = A.lobby;
  // floor + walls
  ctx.fillStyle = '#120c2a'; ctx.fillRect(0, 0, 384, 216);
  for (let y = FLOOR_Y; y < 216; y += 12) for (let x = 0; x < 384; x += 12) { ctx.fillStyle = ((x + y) / 12) % 2 ? '#241a4a' : '#1b1440'; ctx.fillRect(x, y, 12, 12); }
  ctx.fillStyle = '#2a1f55'; ctx.fillRect(0, 12, 384, FLOOR_Y - 12); ctx.fillStyle = '#3b2a6e'; for (let x = 0; x < 384; x += 24) ctx.fillRect(x, 14, 22, FLOOR_Y - 16);
  const glow = 0.5 + 0.5 * Math.sin(now * 2); ctx.fillStyle = `rgba(255,93,115,${0.5 + glow * 0.5})`; ctx.fillRect(0, FLOOR_Y - 3, 384, 2); ctx.fillStyle = '#4fc3e8'; ctx.fillRect(0, 22, 384, 1);
  // marquee
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 384, 12); const mt = marqueeText(); ctx.font = F(8); const mw = ctx.measureText(mt).width; const off = (now * 40) % mw;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 384, 12); ctx.clip(); for (let k = 0; k < 3; k++) text(mt, 4 - off + k * mw, 2, '#f2c14e', 8, 'left', false); ctx.restore();
  // cabinets
  for (const c of CABS) { const skin = (A.purse.skins[c.id] || []).includes('gold') ? 'gold' : (A.purse.skins[c.id] || []).includes('neon') ? 'neon' : null; drawCabinet(c, now, skin); }
  // hi-score board
  ctx.fillStyle = '#000'; ctx.fillRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h); ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 2; ctx.strokeRect(BOARD.x + 1, BOARD.y + 1, BOARD.w - 2, BOARD.h - 2);
  text('ARCADE', BOARD.x + BOARD.w / 2, BOARD.y + 4, '#f2c14e', 8, 'center', false); ctx.font = '8px Silkscreen, monospace';
  S.arcadeBoard(A.db, 'daily', Date.now(), 4).forEach((e, i) => { ctx.fillStyle = i ? '#fbf1e0' : '#7ef0ff'; ctx.fillText(`${i + 1} ${e.name} ${e.points}`, BOARD.x + 5, BOARD.y + 16 + i * 9); });
  // prize counter
  const C = COUNTER; ctx.fillStyle = '#7a4a22'; ctx.fillRect(C.x, C.y, C.w, C.h); ctx.fillStyle = '#a06a32'; ctx.fillRect(C.x, C.y, C.w, 5); ctx.fillStyle = '#5fd37a'; ctx.fillRect(C.x - 2, C.y - 30, C.w + 4, 12);
  text('PRIZES', C.x + C.w / 2, C.y - 28, '#1a1424', 8, 'center', false); for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#ff5d73', '#f2c14e', '#4fc3e8', '#9b59d6'][i]; ctx.fillRect(C.x + 6 + i * 15, C.y - 13, 9, 9); }
  PIX.blitC(ctx, PIX.sprite('ticket', ['tttttt', 't.tt.t', 'tttttt'], { t: '#ff5d73' }), C.x + C.w / 2, C.y + 20, 2);
  // player
  const fr = L.walk ? Math.floor(L.walk * 8) % 4 : 0; drawInuAvatar(ctx, A.profile, Math.round(L.x), Math.round(L.y), { scale: 0.6, face: L.face, frame: fr, shadow: true });
  if (A.purse.owned.includes('trail-stars') && L.walk) { ctx.fillStyle = '#f2c14e'; for (let i = 0; i < 3; i++) ctx.fillRect(L.x - 6 + ((now * 37 + i * 5) % 12), L.y - 2 - ((now * 23 + i * 7) % 8), 1, 1); }
  ctx.font = '8px Silkscreen, monospace'; ctx.fillStyle = '#fbf1e0'; ctx.textAlign = 'center'; ctx.fillText(A.profile.name, L.x, L.y + 2); ctx.textAlign = 'left';
  const n = nearTarget(L); const hint = n ? `${isTouch ? 'TAP A' : 'PRESS SPACE'}: ${n.label}` : isTouch ? 'TAP A CABINET TO PLAY' : 'ARROWS TO WALK · CLICK A CABINET';
  text(hint, 192, 206, n ? '#7ef0ff' : '#8a7ac4', 8, 'center');
}
function drawCabinet(c, now, skin) {
  const { x } = c, y = CY, body = skin === 'gold' ? '#c9a24a' : skin === 'neon' ? '#141428' : '#2b2150', edge = skin === 'gold' ? '#f2d070' : c.color;
  ctx.fillStyle = '#00000066'; ctx.fillRect(x + 2, y + CH, CW, 5);
  ctx.fillStyle = body; ctx.fillRect(x, y, CW, CH); ctx.fillStyle = edge; ctx.fillRect(x, y, 3, CH); ctx.fillRect(x + CW - 3, y, 3, CH);
  ctx.fillStyle = c.color; ctx.fillRect(x + 2, y + 2, CW - 4, 10); text(c.short, x + CW / 2, y + 4, '#1a1424', 5, 'center', false);
  const flick = 0.75 + 0.25 * Math.sin(now * 9 + x); ctx.globalAlpha = flick; ctx.fillStyle = '#05030f'; ctx.fillRect(x + 5, y + 15, CW - 10, 22);
  // mini attract art per cabinet
  const sx = x + 5, sy = y + 15, t = now + x;
  if (c.id === 'kibble-chomp') { for (let i = 0; i < 5; i++) { ctx.fillStyle = '#c88a3c'; ctx.fillRect(sx + 4 + i * 6, sy + 11, 2, 2); } PIX.blit(ctx, PIX.shibaHead(), sx + 1 + ((t * 8) % 22), sy + 6, 1); PIX.blit(ctx, PIX.cat('#d6302f'), sx + 18, sy + 1); }
  else if (c.id === 'bark-invaders') { for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#9b59d6' : '#e0303a'; ctx.fillRect(sx + 3 + i * 7 + Math.sin(t) * 2, sy + 3, 4, 3); } ctx.fillStyle = '#fff6c0'; ctx.fillRect(sx + 15, sy + 16 - ((t * 20) % 12), 1, 3); ctx.fillStyle = '#e0802c'; ctx.fillRect(sx + 13, sy + 18, 5, 3); }
  else if (c.id === 'pup-crossing') { ctx.fillStyle = '#1d4fa0'; ctx.fillRect(sx, sy + 2, 30, 7); ctx.fillStyle = '#7a4a22'; ctx.fillRect(sx + ((t * 10) % 30) - 6, sy + 4, 12, 3); ctx.fillStyle = '#2a2a34'; ctx.fillRect(sx, sy + 12, 30, 8); ctx.fillStyle = '#e0303a'; ctx.fillRect(sx + 30 - ((t * 14) % 36), sy + 14, 6, 4); }
  else if (c.id === 'bone-breaker') { for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) { ctx.fillStyle = ['#ff5d73', '#f2c14e', '#5fd37a'][r]; ctx.fillRect(sx + 1 + i * 6, sy + 2 + r * 3, 5, 2); } ctx.fillStyle = '#c8f04e'; ctx.fillRect(sx + 15 + Math.sin(t * 2) * 12, sy + 14 - Math.abs(Math.sin(t * 3)) * 4, 2, 2); ctx.fillStyle = '#fbf1e0'; ctx.fillRect(sx + 10 + Math.sin(t * 2) * 10, sy + 19, 10, 2); }
  else { ctx.fillStyle = '#c0392b'; for (let i = 0; i < 3; i++) ctx.fillRect(sx + (i % 2 ? 4 : 0), sy + 4 + i * 6, 26, 2); ctx.fillStyle = '#e0802c'; ctx.fillRect(sx + 4 + ((t * 6) % 18), sy + 15, 4, 4); }
  ctx.globalAlpha = 1; ctx.fillStyle = '#00000055'; ctx.fillRect(x + 4, y + 40, CW - 8, 10); ctx.fillStyle = '#d6302f'; ctx.fillRect(x + 10, y + 43, 4, 4); ctx.fillStyle = '#f2c14e'; ctx.fillRect(x + 22, y + 43, 3, 3); ctx.fillRect(x + 27, y + 43, 3, 3);
  ctx.fillStyle = '#1a1424'; ctx.fillRect(x + 16, y + 53, 8, 3); ctx.fillStyle = '#f2c14e'; ctx.fillRect(x + 19, y + 53, 2, 2);
  if (skin === 'neon') { ctx.strokeStyle = c.color; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now * 4); ctx.strokeRect(x - 0.5, y - 0.5, CW + 1, CH + 1); ctx.globalAlpha = 1; }
  if (c.id === 'inu-rescue') text('LIVE', x + CW / 2, y + CH - 8, '#5fd37a', 5, 'center');
}

// ---------- cabinet ----------
const modeKey = (C) => MET.boardKey(C.id, C.gmode);
const ghostKey = (C) => 'inuarcade.ghost.' + modeKey(C);
function openCab(id) {
  const G = GAMES[id]; setRes(G.W, G.H); A.scene = 'cab'; A.cab = { id, G, mode: 'title', t: 0, gmode: LS.getItem('inuarcade.mode') || 'classic', s: G.create(1), ini: [...A.initials], cur: 0, parts: [] };
  if (!MET.MODE_IDS.includes(A.cab.gmode)) A.cab.gmode = 'classic';
  document.title = `${G.META.title.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase())} · Inu Arcade`;
}
function newRun(C, seed) { const mod = MET.modFor(C.gmode); const s = MET.applyMod(C.G.create(seed, { inu: C.gmode !== 'classic' }), mod); return { s, mod }; }
function startPlay() { const C = A.cab; const seed = C.gmode === 'daily' ? MET.dailySeed(C.id) : (Math.random() * 1e9) | 0; const r = newRun(C, seed);
  C.s = r.s; C.mod = r.mod; C.seed = seed; C.masks = []; C.runStart = Date.now(); C.mode = 'play'; C.t = 0; C.paused = false; C.parts = [];
  const g = loadGhost(C); C.ghost = g ? { g, s: MET.applyMod(C.G.create(g.seed, { inu: g.mode !== 'classic' }), g.mod), ms: MET.decode(g.rle), i: 0 } : null;
  sfx('start'); input.clear(); }
function loadGhost(C) { try { return JSON.parse(LS.getItem(ghostKey(C))); } catch { return null; } }
function stepFx(C, dt) { const s = C.s;
  for (const f of s.fx.splice(0)) for (let i = 0; i < f.n; i++) { const a = Math.random() * 6.283, v = 20 + Math.random() * 70; C.parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, c: f.c, t: 0.4 + Math.random() * 0.4 }); }
  for (const p of C.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt; p.t -= dt; } C.parts = C.parts.filter((p) => p.t > 0).slice(-400);
  for (const p of s.pops) { p.t -= dt * 0.8; p.y -= 14 * dt; } s.pops = s.pops.filter((p) => p.t > 0); s.shake = Math.max(0, (s.shake || 0) - dt); }
function updateCab(dt, inp) {
  const C = A.cab, G = C.G; C.t += dt; const P = inp.pressed;
  if (P.has('back') && C.mode !== 'initials') return go(null);
  if (C.mode === 'title') { if (P.has('left') || P.has('right') || P.has('up') || P.has('down')) { const i = MET.MODE_IDS.indexOf(C.gmode), d = P.has('left') || P.has('up') ? -1 : 1; C.gmode = MET.MODE_IDS[(i + d + 3) % 3]; LS.setItem('inuarcade.mode', C.gmode); sfx('blip'); C.t = 0; }
    if (P.has('a') || P.has('start')) return startPlay(); if (C.t > 8) startAttract(C); return; }
  if (C.mode === 'attract') { const D = C.demo; const m = D.ms ? D.ms[D.i++] : null; G.step(C.s, dt * (D.mod?.speed || 1), D.ms ? MET.fromMask(m ?? 0) : G.bot(C.s)); C.s.fx.length = 0; C.s.pops.length = 0;
    if (P.has('a') || P.has('start')) return startPlay(); if (C.s.over || C.t > 25 || (D.ms && D.i >= D.ms.length)) { C.mode = 'title'; C.t = 0; } return; }
  if (C.mode === 'play') { if (P.has('start')) { C.paused = !C.paused; sfx('blip'); } if (C.paused) { setMusic(false); return; }
    const m = MET.toMask(inp); C.masks.push(m); G.step(C.s, dt * (C.mod?.speed || 1), MET.fromMask(m)); for (const e of C.s.ev) sfx(e); stepFx(C, dt);
    if (C.ghost && !C.ghost.s.over && C.ghost.i < C.ghost.ms.length) { const gs = C.ghost.s; G.step(gs, dt * (C.ghost.g.mod?.speed || 1), MET.fromMask(C.ghost.ms[C.ghost.i++])); gs.fx.length = 0; gs.pops.length = 0; gs.ev.length = 0; }
    setMusic(true, Math.min(3, (C.s.level - 1) + (C.s.lives <= 1 ? 1 : 0) + (C.gmode !== 'classic' ? 1 : 0)));
    if (C.s.over) { C.mode = 'over'; C.t = 0; setMusic(false); C.final = MET.finalScore(C.s.score, C.mod); } return; }
  stepFx(C, dt);
  if (C.mode === 'over') { if (C.t > 2.2) { if (C.final > 0) { C.mode = 'initials'; C.ini = [...A.initials]; C.cur = 0; } else { C.mode = 'title'; } C.t = 0; } return; }
  if (C.mode === 'initials') {
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; const ch = (d) => { const i = L.indexOf(C.ini[C.cur]); C.ini[C.cur] = L[(i + d + L.length) % L.length]; sfx('blip'); };
    if (P.has('up')) ch(1); if (P.has('down')) ch(-1); if (P.has('left') && C.cur > 0) { C.cur--; sfx('blip'); }
    if (P.has('right') || P.has('a') || P.has('start')) { if (C.cur < 2 && !P.has('start')) { C.cur++; sfx('select'); } else finishRun(); }
    return;
  }
  if (C.mode === 'results') { if (!panelOpen() && (P.has('a') || P.has('start'))) startPlay(); }
}
function startAttract(C) { C.mode = 'attract'; C.t = 0; const g = loadGhost(C);
  if (g) { C.s = MET.applyMod(C.G.create(g.seed, { inu: g.mode !== 'classic' }), g.mod); C.demo = { ms: MET.decode(g.rle), i: 0, mod: g.mod, label: 'REPLAY: YOUR BEST RUN' }; }
  else { const r = newRun(C, (Math.random() * 1e9) | 0); C.s = r.s; C.demo = { ms: null, mod: r.mod, label: 'DEMO' }; } }
function finishRun() {
  const C = A.cab, key = modeKey(C), score = C.final; A.initials = C.ini.join(''); const entry = S.addScore(A.db, key, { name: A.initials, score, wallet: wallet().simulated ? null : wallet().address });
  const all = S.board(A.db, key, 'all', Date.now(), 100), day = S.board(A.db, key, 'daily', Date.now(), 100);
  const rank = all.findIndex((e) => e.name === entry.name) + 1, drank = day.findIndex((e) => e.name === entry.name) + 1;
  const prev = loadGhost(C); let newGhost = false; if (!prev || score > (prev.score || 0)) { try { LS.setItem(ghostKey(C), JSON.stringify({ seed: C.seed, mode: C.gmode, mod: C.mod, score, rle: MET.encode(C.masks), at: Date.now() })); newGhost = true; } catch {} }
  const got = R.grant(A.purse, C.id, score); const ach = MET.evalAchievements(A.purse, { game: C.id, mode: C.gmode, score, level: C.s.level, stats: C.s.stats || {} });
  save(); sfx('ticket'); C.mode = 'results'; C.t = 0; C.result = { score, raw: C.s.score, mult: C.mod?.mult || 1, gmode: C.gmode, rank, drank, got, ach, newGhost, level: C.s.level };
  S.postScore(key, entry); showResults(C.id, C.result);
  // wallet-signed score -> kibble-pay prize board (only when signed in with a real wallet)
  const w = wallet(); if (w?.submitScore && w.address) w.submitScore(C.id, score, Date.now() - (C.runStart || Date.now())).then((r) => note(r.ok ? 'Posted to the $KIBBLE prize board (wallet-signed).' : 'Prize board: ' + r.reason)).catch((e) => note('Prize board: ' + e.message));
  function note(m) { C.result.posted = m; const pn = document.getElementById('panel'); if (pn && !pn.hidden && pn.dataset.kind === 'results') document.getElementById('pbody').insertAdjacentHTML('beforeend', `<p class="small">${m.replace(/[<>&]/g, '')}</p>`); }
}
function drawHUD(C) { const s = C.s, G = C.G, W = G.W, H = G.H; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 20); const hi = Math.max(S.board(A.db, modeKey(C), 'all')[0]?.score || 0, MET.finalScore(s.score, C.mod));
  text('1UP', 8, 1, '#ff5d73', 8, 'left', false); text(String(s.score).padStart(6, '0'), 8, 10, '#fbf1e0', 8, 'left', false);
  text('HI-SCORE', W / 2 + 18, 1, '#ff5d73', 8, 'center', false); text(String(hi).padStart(6, '0'), W / 2 + 18, 10, '#fbf1e0', 8, 'center', false);
  text(C.gmode === 'classic' ? 'CLASSIC' : C.gmode === 'daily' ? 'DAILY' : 'INU', W - 4, 2, C.gmode === 'classic' ? '#8a7ac4' : '#ff5d73', 5, 'right', false); if (C.mod) text('x' + C.mod.mult, W - 4, 11, '#f2c14e', 5, 'right', false);
  for (let i = 0; i < Math.min(5, s.lives - 1); i++) { ctx.fillStyle = '#e8892e'; ctx.fillRect(8 + i * 11, H - 12, 8, 7); ctx.fillRect(8 + i * 11, H - 14, 2, 2); ctx.fillRect(14 + i * 11, H - 14, 2, 2); } }
function centerBox(W, y, h) { ctx.fillStyle = '#000d'; ctx.fillRect(8, y, W - 16, h); ctx.strokeStyle = '#3a2a6a'; ctx.strokeRect(8.5, y + 0.5, W - 17, h - 1); }
function sText(str, x, y, col, align = 'center') { ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillStyle = col; ctx.fillText(str, x, y); ctx.textAlign = 'left'; }
function drawCab(now) {
  const C = A.cab, G = C.G, M = G.META, W = G.W, H = G.H, X = W / 2;
  if (C.mode === 'title') {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#07051a'); g.addColorStop(1, '#170828'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#25124a'; ctx.lineWidth = 1; for (let i = 0; i < 12; i++) { const y = H - 70 + i * i * 0.5 + ((now * 8) % 6); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(X + i * 6, H - 70); ctx.lineTo(X + i * 30, H); ctx.stroke(); }
    const skins = A.purse.skins[C.id] || []; if (skins.length) { ctx.strokeStyle = skins.includes('gold') ? '#f2d070' : M.color; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2); }
    const words = M.title.split(' '); words.forEach((w, i) => { text(w, X + 1, 14 + i * 20, '#000', 16, 'center', false); text(w, X, 13 + i * 20, M.color, 16, 'center', false); });
    let y = 58; wrap(M.blurb, 40).forEach((l) => { sText(l, X, y, '#c8bce8'); y += 9; }); y += 4;
    MET.MODE_IDS.forEach((m, i) => { const on = m === C.gmode, bx = 8 + i * ((W - 16) / 3), bw = (W - 16) / 3 - 2; ctx.fillStyle = on ? (m === 'classic' ? '#6a52c4' : '#ff5d73') : '#1a1438'; ctx.fillRect(bx, y, bw, 13); text(m === 'daily' ? 'DAILY' : m === 'inu' ? 'INU' : 'CLASSIC', bx + bw / 2, y + 3, on ? '#fff' : '#6a5a9a', 6, 'center', false); });
    C.modeY = y; y += 18;
    const mod = MET.modFor(C.gmode); const info = C.gmode === 'classic' ? wrap(MET.MODES.classic.desc + ' ' + (M.classicNote || ''), 40) : wrap(M.inuMove, 40), modl = C.gmode === 'classic' ? [] : wrap(`WEEKLY: ${mod.name}. ${mod.desc}`, 40);
    info.forEach((l) => { sText(l, X, y, '#fbf1e0'); y += 9; }); modl.forEach((l) => { sText(l, X, y, '#f2c14e'); y += 9; }); if (C.gmode === 'daily') { sText(`TODAY'S SEED #${MET.dailySeed(C.id) % 100000}`, X, y, '#7ef0ff'); y += 9; }
    y += 6; text('TOP PUPS', X, y, '#f2c14e', 8, 'center'); y += 12;
    S.board(A.db, modeKey(C), C.gmode === 'daily' ? 'daily' : 'all', Date.now(), 5).forEach((e, i) => { text(`${i + 1} ${e.name} ${String(e.score).padStart(6, ' ')}`, X, y, i ? '#fbf1e0' : '#7ef0ff', 8, 'center'); y += 11; });
    if (Math.floor(now * 2) % 2) text(isTouch ? 'PRESS START' : 'PRESS SPACE', X, H - 48, '#ff5d73', 8, 'center');
    sText('◀ ▶ CHANGE MODE' + (isTouch ? '' : ' · ESC: HALL'), X, H - 36, '#8a7ac4'); if (loadGhost(C)) sText('Your best run races you as a ghost', X, H - 27, '#8a7ac4');
    const sp = R.SPONSORS[C.id]; sText(sp ? `SPONSOR: ${sp.name}` : 'FREE PLAY · SKILL PRIZES ONLY', X, H - 14, '#5a4a8a');
    return;
  }
  const sh = C.s.shake > 0 && C.mode === 'play' ? C.s.shake * 8 : 0; ctx.save(); if (sh) ctx.translate(Math.round((Math.random() - 0.5) * sh), Math.round((Math.random() - 0.5) * sh));
  G.draw(ctx, C.s, now, PIX);
  if (C.ghost && C.mode === 'play' && !C.ghost.s.over && G.ghostPos) { const gp = G.ghostPos(C.ghost.s); ctx.globalAlpha = 0.35; ctx.fillStyle = '#9fd0ff'; ctx.fillRect(gp.x - 5, gp.y - 5, 10, 10); ctx.globalAlpha = 0.7; ctx.font = '6px Silkscreen, monospace'; ctx.fillStyle = '#9fd0ff'; ctx.fillText('BEST', gp.x - 8, gp.y - 7); ctx.globalAlpha = 1; }
  for (const p of C.parts) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x | 0, p.y | 0, 1.5, 1.5); } ctx.globalAlpha = 1;
  for (const p of C.s.pops) { ctx.globalAlpha = Math.min(1, p.t * 2); text(p.text, Math.max(30, Math.min(W - 30, p.x)), p.y, p.c, 5, 'center'); } ctx.globalAlpha = 1;
  ctx.restore(); drawHUD(C);
  if (C.mode === 'attract') { centerBox(W, H / 2 - 18, 34); text(C.demo.label.replace('REPLAY: ', ''), X, H / 2 - 12, M.color, 5, 'center'); if (Math.floor(now * 2) % 2) text(isTouch ? 'PRESS START' : 'PRESS SPACE', X, H / 2 + 2, '#fbf1e0', 8, 'center'); }
  if (C.mode === 'play' && C.paused) { centerBox(W, H / 2 - 12, 22); text('PAUSED', X, H / 2 - 5, '#f2c14e', 8, 'center'); }
  if (C.mode === 'play' && C.s.flash > 0.6) { ctx.fillStyle = `rgba(255,60,60,${(C.s.flash - 0.6) * 0.4})`; ctx.fillRect(0, 0, W, H); }
  if (C.mode === 'over') { centerBox(W, H / 2 - 24, 48); text('GAME OVER', X, H / 2 - 16, '#ff5d73', 8, 'center'); text('SCORE ' + C.final, X, H / 2, '#fbf1e0', 8, 'center'); if (C.mod) sText(`${C.s.score} x${C.mod.mult} weekly`, X, H / 2 + 12, '#f2c14e'); }
  if (C.mode === 'initials') { centerBox(W, H / 2 - 56, 112); text('NEW SCORE', X, H / 2 - 48, '#f2c14e', 8, 'center'); text(String(C.final), X, H / 2 - 36, '#fbf1e0', 8, 'center'); text('YOUR INITIALS', X, H / 2 - 22, '#fbf1e0', 8, 'center');
    C.ini.forEach((ch, i) => { const x = X - 30 + i * 24; if (i === C.cur && Math.floor(now * 4) % 2) { ctx.fillStyle = M.color; ctx.fillRect(x - 2, H / 2 + 12, 20, 2); } text(ch, x, H / 2 - 6, i === C.cur ? M.color : '#fbf1e0', 16); });
    sText('UP/DOWN letter · A next', X, H / 2 + 20, '#8a7ac4'); sText(`${MET.MODES[C.gmode].name} boards`, X, H / 2 + 30, '#8a7ac4'); }
  if (C.mode === 'results') { centerBox(W, H / 2 - 30, 60); text(`${C.result.score} PTS`, X, H / 2 - 22, '#f2c14e', 8, 'center'); text(`#${C.result.drank} TODAY`, X, H / 2 - 10, '#fbf1e0', 8, 'center'); sText(`+${C.result.got.bones} Bones  +${C.result.got.tickets} tickets`, X, H / 2 + 2, '#5fd37a'); if (Math.floor(now * 2) % 2) sText('A: PLAY AGAIN', X, H / 2 + 14, '#fbf1e0'); }
}
// bloom: blurred additive copy of the frame (CRT mode). Skipped where ctx.filter is unsupported.
const bloomCv = document.createElement('canvas'); const bctx = bloomCv.getContext('2d'); const canFilter = 'filter' in bctx;
function bloom() { if (!A.crt || !canFilter) return; const bw = cv.width >> 1, bh = cv.height >> 1; if (bloomCv.width !== bw || bloomCv.height !== bh) { bloomCv.width = bw; bloomCv.height = bh; } bctx.filter = 'none'; bctx.clearRect(0, 0, bw, bh); bctx.drawImage(cv, 0, 0, bw, bh); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.32; ctx.filter = 'blur(2px)'; ctx.imageSmoothingEnabled = true; ctx.drawImage(bloomCv, 0, 0, cv.width, cv.height); ctx.restore(); ctx.imageSmoothingEnabled = false; }

// ---------- canvas pointer (tap/click) ----------
function toCanvas(e) { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height }; }
cv.addEventListener('pointerdown', (e) => { unlockAudio(); if (panelOpen()) return; const p = toCanvas(e);
  if (A.scene === 'lobby') { const L = A.lobby; const c = CABS.find((c) => { const r = cabRect(c); return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h + 8; });
    const tg = lobbyTargets(); let t = c ? tg.find((t) => t.id === c.id) : null;
    if (!t && p.x >= COUNTER.x - 4 && p.x <= COUNTER.x + COUNTER.w + 4 && p.y >= COUNTER.y - 32 && p.y <= COUNTER.y + COUNTER.h) t = tg.find((t) => t.kind === 'prizes');
    if (!t && p.x >= BOARD.x && p.y <= BOARD.y + BOARD.h) t = tg.find((t) => t.kind === 'scores');
    if (t) { L.target = { x: t.x, y: t.y }; L.pending = t; } else L.target = { x: p.x, y: Math.max(FLOOR_Y + 6, p.y) }; return; }
  if (A.scene === 'cab' && A.cab.mode === 'title' && p.y >= A.cab.modeY - 3 && p.y <= A.cab.modeY + 16) { const i = Math.max(0, Math.min(2, Math.floor((p.x - 8) / ((cv.width - 16) / 3)))); A.cab.gmode = MET.MODE_IDS[i]; LS.setItem('inuarcade.mode', A.cab.gmode); sfx('blip'); A.cab.t = 0; return; }
  if (A.scene === 'cab' && ['title', 'attract'].includes(A.cab.mode)) startPlay(); });
addEventListener('keydown', unlockAudio); addEventListener('touchstart', unlockAudio, { passive: true });

// ---------- loop ----------
let last = performance.now(), acc = 0;
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t; acc += dt; const now = t / 1000;
  while (acc >= 1 / 60) { acc -= 1 / 60; const inp = input.snapshot(); if (!panelOpen()) { if (A.scene === 'lobby') updateLobby(1 / 60, inp); else if (A.scene === 'cab') updateCab(1 / 60, inp); } else if (inp.pressed.has('back')) closePanel(); input.frame(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  if (A.scene === 'lobby') drawLobby(now); else if (A.scene === 'cab') drawCab(now);
  bloom();
  requestAnimationFrame(frame);
}
A.crt = LS.getItem('inuarcade.crt') !== '0'; const crtB = $('#b-crt'); const setCrt = () => { document.body.classList.toggle('crt', A.crt); crtB.textContent = A.crt ? '📺 CRT' : '📺 off'; }; setCrt(); crtB.onclick = () => { A.crt = !A.crt; LS.setItem('inuarcade.crt', A.crt ? '1' : '0'); setCrt(); };
$('#b-ach').onclick = () => showAchievements();
$('#b-lobby').onclick = () => go(null); $('#b-scores').onclick = () => showScores(A.cab?.id); $('#b-prizes').onclick = () => showPrizes(); $('#b-profile').onclick = () => showProfile();
const mb = $('#b-mute'); const setMb = () => (mb.textContent = isMuted() ? '🔇' : '🔊'); setMb(); mb.onclick = () => { setMuted(!isMuted()); setMb(); unlockAudio(); };
for (const b of document.querySelectorAll('#bar button')) b.addEventListener('click', (e) => e.currentTarget.blur());
document.addEventListener('contextmenu', (e) => e.preventDefault());
export { startPlay, toLobby };
(async () => { try { await document.fonts.load(F(8)); await document.fonts.load('8px Silkscreen'); } catch {} refreshPurse(); go(routeId(), false); requestAnimationFrame(frame); })();

// ?wallet=<solana address> (e.g. from the Inu Verse arcade building): load that wallet's shared Shiba profile.
(async () => { try {
  const w = new URLSearchParams(location.search).get('wallet') || '';
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(w) || A.profile.wallet === w && A.profile._loaded) return;
  const r = await fetch(`https://kibble-pay.vercel.app/api/profile?wallet=${encodeURIComponent(w)}`); const j = await r.json(); if (!j.exists) return;
  const keep = A.profile.outfit; A.profile = normalizeProfile(j.profile, w); A.profile._loaded = true;
  for (const k of Object.keys(keep || {})) if (!A.profile.outfit[k] && keep[k]) A.profile.outfit[k] = keep[k];
  LS.setItem('inuarcade.profile.v1', JSON.stringify(A.profile));
} catch {} })();
// ?p=<base64url profile JSON> (Inu Verse passes the player's Shiba even before a real wallet is connected).
try { const raw = new URLSearchParams(location.search).get('p'); if (raw && raw.length < 12000) {
  const json = decodeURIComponent(escape(atob(raw.replace(/-/g, '+').replace(/_/g, '/'))));
  const p = normalizeProfile(JSON.parse(json), new URLSearchParams(location.search).get('wallet') || undefined);
  const keep = A.profile.outfit; A.profile = p; for (const k of Object.keys(keep || {})) if (!A.profile.outfit[k] && keep[k]) A.profile.outfit[k] = keep[k];
  LS.setItem('inuarcade.profile.v1', JSON.stringify(A.profile)); } } catch {}
