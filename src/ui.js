// DOM panels: results + share, leaderboards & prize pools, prize counter, profile/wallet, Inu Rescue link.
import { A, GAMES, RESCUE_URL, save, go, startPlay, syncWallet } from './main.js';
import * as S from './core/scores.js'; import * as R from './core/rewards.js'; import { sfx } from './core/audio.js'; import * as MET from './core/meta.js';
import { avatarCanvas } from './vendor/inu-avatar.js'; import { normalizeProfile } from './vendor/profile-schema.js';
const $ = (q) => document.querySelector(q), esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const KIBBLE_PAY = 'https://kibble-pay.vercel.app';
export const panelOpen = () => !$('#panel').hidden;
export function openPanel(html, kind) { $('#pbody').innerHTML = html; $('#panel').hidden = false; $('#panel').dataset.kind = kind || ''; A.input.clear(); }
export function closePanel() { $('#panel').hidden = true; A.input?.clear(); }
$('#pclose').onclick = closePanel; $('#panel').addEventListener('pointerdown', (e) => { if (e.target.id === 'panel') closePanel(); });
export function refreshPurse() { $('#purse').textContent = `🦴 ${A.purse.bones}  🎟 ${A.purse.tickets}`; }
const title = (id) => GAMES[id]?.META.title.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase()) || 'Inu Arcade';
export function shareUrl(id, score, gmode = 'classic') { const text = `🐕🕹️ I scored ${score} on ${title(id)} (${MET.MODES[gmode].name.toLowerCase()}) at Inu Arcade! Free to play, beat me:`; const url = `${location.origin}/${id}`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`; }
export function showResults(id, r) {
  openPanel(`<h2>${esc(title(id))}</h2><p><b style="color:var(--gold);font-size:18px">${r.score}</b> points · level ${r.level}</p>
  ${r.mult !== 1 ? `<p class="small">${r.raw} × ${r.mult} weekly modifier</p>` : ''}<p>${esc(MET.MODES[r.gmode].name)} · Rank <b>#${r.drank}</b> today · <b>#${r.rank}</b> all-time</p>${r.posted ? `<p class="small">${esc(r.posted)}</p>` : ''}<p>Earned <b>+${r.got.bones} Bones</b> and <b>+${r.got.tickets} prize tickets</b> 🎟</p>
  ${r.ach?.length ? `<div class="note">🏅 Achievement${r.ach.length > 1 ? 's' : ''}: ${r.ach.map((a) => `<b>${esc(a.name)}</b> (+${a.tickets} 🎟)`).join(', ')}</div>` : ''}${r.newGhost ? '<p class="small">👻 New personal best saved as your ghost. It will race you next time and play in attract mode.</p>' : ''}
  <div><a class="btn x2" id="r-share" href="${shareUrl(id, r.score, r.gmode)}" target="_blank" rel="noopener">Share on 𝕏</a><button class="btn" id="r-copy">Copy link</button></div>
  <div><button class="btn gold" id="r-again">Play again</button><button class="btn" id="r-scores">Leaderboards</button><button class="btn" id="r-prizes">Prize counter</button><button class="btn" id="r-hall">Back to hall</button></div>
  <p class="small">Tickets come from playing and from score tiers. Bones are free play currency and can't be cashed out.</p>`, 'results');
  $('#r-again').onclick = () => { closePanel(); startPlay(); }; $('#r-scores').onclick = () => showScores(id, 'daily', r.gmode); $('#r-prizes').onclick = () => showPrizes(); $('#r-hall').onclick = () => go(null);
  $('#r-copy').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/${id}`); $('#r-copy').textContent = 'Copied!'; } catch { $('#r-copy').textContent = location.origin + '/' + id; } };
}
const fmtT = (ms) => { const h = Math.floor(ms / 36e5); return h >= 48 ? `${Math.floor(h / 24)}d` : `${h}h ${Math.floor((ms % 36e5) / 6e4)}m`; };
export function showScores(game = 'arcade', period = 'daily', mode = 'classic') {
  if (!game || !GAMES[game]) game = 'arcade'; const key = MET.boardKey(game, mode);
  const mtabs = MET.MODE_IDS.map((m) => `<button class="btn ${m === mode ? 'on' : ''}" data-m="${m}">${MET.MODES[m].name}</button>`).join('');
  const tabs = ['arcade', ...Object.keys(GAMES)].map((g) => `<button class="btn ${g === game ? 'on' : ''}" data-g="${g}">${g === 'arcade' ? 'Arcade' : esc(title(g))}</button>`).join('');
  const ptabs = S.PERIODS.map((p) => `<button class="btn ${p === period ? 'on' : ''}" data-p="${p}">${p}</button>`).join('');
  let rows;
  if (game === 'arcade') rows = S.arcadeBoard(A.db, period, Date.now(), 15, mode).map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.name)}${e.house ? ' <span class="small">(house)</span>' : ''}</td><td>${e.points}</td><td>${e.games}/4</td></tr>`).join('');
  else rows = S.board(A.db, key, period, Date.now(), 15).map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.name)}${e.house ? ' <span class="small">(house)</span>' : ''}</td><td>${e.score}</td><td class="small">${new Date(e.at).toLocaleDateString()}</td></tr>`).join('');
  const pools = ['daily', 'weekly', 'monthly'].map((p) => { const ranked = S.arcadeBoard(A.db, p, Date.now(), 10, mode); const po = S.payouts(p, ranked);
    return `<div class="card"><b>${p.toUpperCase()} POOL</b><br>${S.POOLS[p].bones} Bones + ${esc(S.POOLS[p].cosmetic)}<br>${po.map((x) => `#${x.rank} ${esc(x.name)}: ${x.bones} 🦴${x.cosmetic ? ' + 👑' : ''}`).join('<br>')}<br><span class="small">resets in ${fmtT(S.resetsIn(p))}</span></div>`; }).join('');
  openPanel(`<h2>Leaderboards</h2><div class="tabs">${mtabs}</div><div class="tabs">${tabs}</div><div class="tabs">${ptabs}</div>
  <table><tr><th>#</th><th>Pup</th><th>${game === 'arcade' ? 'Arcade pts' : 'Score'}</th><th>${game === 'arcade' ? 'Games' : 'Date'}</th></tr>${rows || '<tr><td colspan=4>No scores yet. Be the first!</td></tr>'}</table>
  <h3>Bones prize pools (free play currency, this device) · ${MET.MODES[mode].name}</h3><p class="small">This week's Inu Mode modifier: <b>${esc(MET.weeklyModifier().name)}</b>, ${esc(MET.weeklyModifier().desc)}</p><div class="grid">${pools}</div>
  <h3>$KIBBLE prize board (wallet-signed · ${period === 'all' ? 'weekly' : period})</h3><div id="srvboard" class="small">Loading…</div>
  <div class="note">Free to play. Prizes go to the top 3 on the combined Arcade board for each period, by rank only: no entry fee, no draws, no luck. Arcade points: each game's top score in the period is worth 1000, everyone else gets their share, summed over the four games. House scores (INU/PUP/DOG) are demo entries and never win. Scores are stored on this device for now; the server board is coming with kibble-pay sign-in.</div>`, 'scores');
  fillServerBoard(game, period);
  document.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => showScores(b.dataset.g, period, mode))); document.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => showScores(game, b.dataset.p, mode))); document.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => showScores(game, period, b.dataset.m)));
}
export async function showPrizes(msg = '') {
  const P = A.purse, bal = await A.wallet().balance();
  const items = R.SHOP.map((it) => { const own = P.owned.includes(it.id); return `<div class="card"><b>${esc(it.name)}</b><br><span class="small">${it.slot ? it.slot + ' cosmetic' : 'lobby effect'}</span><br>🎟 ${it.tickets}<br><button class="btn ${own ? '' : 'gold'}" data-buy="${it.id}" ${own || P.tickets < it.tickets ? 'disabled' : ''}>${own ? 'Owned' : 'Swap tickets'}</button></div>`; }).join('');
  const skins = Object.keys(GAMES).map((g) => { const has = A.purse.skins[g] || []; const sp = R.SPONSORS[g];
    return `<div class="card"><b>${esc(title(g))}</b><br><span class="small">Sponsor: ${sp ? esc(sp.name) : 'open slot'}</span><br>
    <button class="btn" data-neon="${g}" ${has.includes('neon') || P.tickets < R.SKINS.neon.tickets ? 'disabled' : ''}>${has.includes('neon') ? 'Neon ✓' : `Neon skin 🎟${R.SKINS.neon.tickets}`}</button>
    <button class="btn gold" data-gold="${g}" ${has.includes('gold') ? 'disabled' : ''}>${has.includes('gold') ? 'Gold ✓' : `Gold skin: optional burn ${R.SKINS.gold.burn} KIBBLE`}</button></div>`; }).join('');
  openPanel(`<h2>Prize Counter</h2>${msg ? `<div class="note">${esc(msg)}</div>` : ''}<p>🦴 <b>${P.bones}</b> Bones · 🎟 <b>${P.tickets}</b> tickets · ${A.wallet().simulated ? 'demo' : ''} $KIBBLE <b>${A.mode === 'demo' || A.mode === 'live' ? bal : '-'}</b> ${A.mode === 'demo' ? '<span class="small">(DEMO wallet, fake KIBBLE)</span>' : A.mode === 'live' ? '' : '<span class="small">(wallet service offline)</span>'}</p>
  <h3>Swap tickets for cosmetics</h3><div class="grid">${items}</div>
  <h3>Cabinet skins</h3><div class="grid">${skins}</div>
  <div class="note">Fixed prices, no mystery boxes, no randomness. Cosmetics show on your Shiba in the hall (equip them under 🐕 Me). Burning $KIBBLE for a Gold skin is <b>optional</b>: the tokens are destroyed (nobody receives them) and the skin is saved to your wallet. Burning is never an entry fee and never affects prizes. ${A.mode === 'demo' ? 'DEMO MODE: fake KIBBLE, nothing real.' : A.mode === 'live' ? 'Sign in under 🐕 Me first.' : '$KIBBLE is live, but the wallet service is unreachable right now. Try again shortly.'}</div>`, 'prizes');
  document.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => { const r = R.redeem(P, b.dataset.buy); if (r.ok) { sfx('ticket'); if (r.item.slot) { A.profile.outfit[r.item.slot] = r.item.item; A.profile.cosmetics = [...new Set([...A.profile.cosmetics, r.item.id])]; } save(); } showPrizes(r.ok ? `Got ${r.item.name}!${r.item.slot ? ' Equipped.' : ''}` : r.reason); }));
  document.querySelectorAll('[data-neon]').forEach((b) => (b.onclick = () => { const r = R.unlockSkinWithTickets(P, b.dataset.neon); save(); if (r.ok) sfx('pow'); showPrizes(r.ok ? 'Neon skin unlocked!' : r.reason); }));
  document.querySelectorAll('[data-gold]').forEach((b) => (b.onclick = async () => { const w = A.wallet(); if (!w.simulated && w.live && !w.address) return showPrizes('Sign in with Phantom under 🐕 Me first.'); const r = await R.unlockSkinWithBurn(P, b.dataset.gold, w); save(); if (r.ok) sfx('pow'); showPrizes(r.ok ? `Gold skin unlocked (${r.simulated ? 'simulated burn' : 'burn ' + r.sig}).` : r.reason); }));
}
const COATS = ['#e0802c', '#2a2a2a', '#f3e6cc', '#c9452a', '#8a5a3c', '#d9b38c'];
export function showProfile(msg = '') {
  const p = A.profile, owned = R.SHOP.filter((s) => s.slot && A.purse.owned.includes(s.id));
  openPanel(`<h2>Your Shiba</h2>${msg ? `<div class="note">${esc(msg)}</div>` : ''}<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start"><div id="pv"></div><div style="flex:1;min-width:220px">
  <label class="small">Name</label><input id="pf-name" maxlength="20" value="${esc(p.name)}">
  <p class="small">Coat</p><div>${COATS.map((c) => `<button class="btn" data-coat="${c}" style="background:${c};width:28px;height:24px;${p.look.coat === c ? 'outline:2px solid #fff' : ''}"></button>`).join('')}</div>
  <p class="small">Prize cosmetics</p><div>${owned.length ? owned.map((s) => `<button class="btn ${p.outfit[s.slot]?.id === s.id ? 'gold' : ''}" data-eq="${s.id}">${esc(s.name)}</button>`).join('') : '<span class="small">Win tickets and swap them at the prize counter.</span>'}</div>
  <h3>Bring your Inu Verse Shiba</h3><p class="small">Paste your Solana wallet address (public address only, never a seed phrase or private key) to load the Shiba you made in Inu Verse from the shared kibble-pay profile.</p>
  <input id="pf-wallet" placeholder="Wallet address" value="${esc(p.wallet || '')}"><button class="btn" id="pf-load">Load profile</button>
  <h3>Wallet</h3><p class="small">${A.wallet().simulated ? 'DEMO wallet (fake KIBBLE, ?demo=1)' : A.wallet().address ? 'Signed in: ' + esc(A.wallet().address) + '. Your scores post to the $KIBBLE prize board.' : 'Sign in with Phantom to post wallet-signed scores (free entry), keep burn skins on your wallet and load your Inu Verse Shiba automatically.'}</p>${!A.wallet().simulated && !A.wallet().address && A.kp ? '<button class="btn gold" id="pf-connect">Sign in with Phantom</button>' : ''}</div></div>`, 'profile');
  $('#pv').appendChild(avatarCanvas(p, 3));
  if ($('#pf-connect')) $('#pf-connect').onclick = async () => { try { await A.wallet().connect(); await syncWallet(); showProfile('Signed in. Loaded your wallet Shiba and skins.'); } catch (e) { showProfile('Sign-in failed: ' + e.message); } };
  $('#pf-name').onchange = (e) => { p.name = e.target.value.replace(/[<>]/g, '').slice(0, 20) || 'Shiba'; save(); };
  document.querySelectorAll('[data-coat]').forEach((b) => (b.onclick = () => { p.look.coat = b.dataset.coat; save(); showProfile(); }));
  document.querySelectorAll('[data-eq]').forEach((b) => (b.onclick = () => { const s = R.SHOP.find((x) => x.id === b.dataset.eq); p.outfit[s.slot] = p.outfit[s.slot]?.id === s.id ? null : s.item; save(); showProfile(); }));
  $('#pf-load').onclick = async () => { const w = $('#pf-wallet').value.trim(); if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(w)) return showProfile('That does not look like a Solana address.');
    try { const r = await fetch(`${KIBBLE_PAY}/api/profile?wallet=${encodeURIComponent(w)}`); const j = await r.json(); const keep = A.profile.outfit; A.profile = normalizeProfile(j.profile, w);
      for (const k of Object.keys(keep)) if (!A.profile.outfit[k] && keep[k]) A.profile.outfit[k] = keep[k]; save(); showProfile(j.exists ? 'Loaded your Inu Verse Shiba!' : 'No saved profile for that wallet yet, so you get the default Shiba.'); }
    catch { showProfile('Could not reach kibble-pay. Using your local Shiba.'); } };
}
export function showRescue() {
  openPanel(`<h2>Inu Rescue</h2><p>The first Inu Arcade cabinet: climb the girders, dodge everything the cat throws and rescue the pup. It runs as its own game.</p>
  <p><a class="btn gold" href="${RESCUE_URL}" target="_blank" rel="noopener">Play Inu Rescue ↗</a><button class="btn" id="rs-back">Stay in the hall</button></p>`, 'rescue');
  $('#rs-back').onclick = closePanel;
}
export function showSettings() {
  const on = !!A.settings?.joystick;
  openPanel(`<h2>⚙ Settings</h2><label class="sw"><input type="checkbox" id="set-joy" role="switch" ${on ? 'checked' : ''}><span class="swt"></span> <b>Joystick controls</b></label>
  <p class="small">Off (default): the classic d-pad buttons. On: a thumb stick on the left (4-way in Kibble Chomp and Pup Crossing, left/right in Bark Invaders and Bone Breaker). A, START and BACK stay on the right. This setting applies to every cabinet and is saved on this device and to your wallet save when you are connected.</p>`, 'settings');
  $('#set-joy').onchange = (e) => { A.setJoystick(e.target.checked); sfx('blip'); };
}
export function showAchievements() { const got = A.purse.ach || {};
  openPanel(`<h2>Achievements</h2><p class="small">${Object.keys(got).length}/${MET.ACHIEVEMENTS.length} unlocked. Each pays a fixed number of prize tickets once.</p><div class="grid">${MET.ACHIEVEMENTS.map((a) => `<div class="card ach ${got[a.id] ? '' : 'locked'}"><div>${got[a.id] ? '🏅' : '🔒'}</div><div><b>${esc(a.name)}</b><br><span class="small">${esc(a.desc)}</span><br>🎟 ${a.tickets}</div></div>`).join('')}</div>`, 'ach'); }

// Real $KIBBLE prize board + pools from kibble-pay (/api/game). game 'arcade' -> one board per cabinet + combined.
async function fillServerBoard(game, period) {
  const el = () => document.getElementById('srvboard'); const kp = A.kp, pool = period === 'all' ? 'weekly' : period;
  if (!kp) { if (el()) el().textContent = A.mode === 'demo' ? 'Demo mode: the real prize board is hidden.' : 'Prize board unavailable (kibble-pay not reachable).'; return; }
  try {
    const [b, P] = await Promise.all([kp.scores(game === 'arcade' ? 'all' : game, pool), kp.pools()]);
    const dec = P.decimals || 6, amt = (u) => (Number(u) / 10 ** dec).toLocaleString('en-US', { maximumFractionDigits: 4 }), me = A.wallet()?.address;
    const rows = b.entries.slice(0, 10).map((e) => `<tr><td>${e.rank}</td><td>${e.wallet === me ? '<b>you</b>' : esc(e.wallet.slice(0, 4) + '…' + e.wallet.slice(-4))}</td><td>${e.score}${game === 'arcade' ? ' pts' : ''}</td></tr>`).join('');
    if (el()) el().innerHTML = `<p>${pool} pool: <b>${amt(P.pools[pool].accruedBaseUnits)} KIBBLE</b> so far (funded by shop revenue, paid to the combined top 3 across all Inu games). ${A.mode === 'soon' ? '$KIBBLE is live; pool totals will refresh when the wallet service is reachable.' : ''}</p>
      <table><tr><th>#</th><th>Wallet</th><th>${game === 'arcade' ? 'Combined' : 'Best'}</th></tr>${rows || '<tr><td colspan=3>No wallet-signed scores yet. Sign in under 🐕 Me and play!</td></tr>'}</table>
      <p class="small"><a href="https://kibble-pay.vercel.app/prize-rules.html" target="_blank" rel="noopener">Prize Rules</a>: skill only, free entry, 18+.</p>`;
  } catch (e) { if (el()) el().textContent = 'Prize board error: ' + e.message; }
}
