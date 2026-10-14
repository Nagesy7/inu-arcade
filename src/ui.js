// DOM panels: results + share, leaderboards & prize pools, prize counter, profile/wallet, Inu Rescue link.
import { A, GAMES, RESCUE_URL, save, go, startPlay } from './main.js';
import * as S from './core/scores.js'; import * as R from './core/rewards.js'; import { sfx } from './core/audio.js';
import { avatarCanvas } from './vendor/inu-avatar.js'; import { normalizeProfile } from './vendor/profile-schema.js';
const $ = (q) => document.querySelector(q), esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const KIBBLE_PAY = 'https://kibble-pay.vercel.app';
export const panelOpen = () => !$('#panel').hidden;
export function openPanel(html, kind) { $('#pbody').innerHTML = html; $('#panel').hidden = false; $('#panel').dataset.kind = kind || ''; A.input.clear(); }
export function closePanel() { $('#panel').hidden = true; A.input?.clear(); }
$('#pclose').onclick = closePanel; $('#panel').addEventListener('pointerdown', (e) => { if (e.target.id === 'panel') closePanel(); });
export function refreshPurse() { $('#purse').textContent = `🦴 ${A.purse.bones}  🎟 ${A.purse.tickets}`; }
const title = (id) => GAMES[id]?.META.title.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase()) || 'Inu Arcade';
export function shareUrl(id, score) { const text = `🐕🕹️ I scored ${score} on ${title(id)} at Inu Arcade! Free to play, beat me:`; const url = `${location.origin}/${id}`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`; }
export function showResults(id, r) {
  openPanel(`<h2>${esc(title(id))}</h2><p><b style="color:var(--gold);font-size:18px">${r.score}</b> points · level ${r.level}</p>
  <p>Rank <b>#${r.drank}</b> today · <b>#${r.rank}</b> all-time</p><p>Earned <b>+${r.got.bones} Bones</b> and <b>+${r.got.tickets} prize tickets</b> 🎟</p>
  <div><a class="btn x2" id="r-share" href="${shareUrl(id, r.score)}" target="_blank" rel="noopener">Share on 𝕏</a><button class="btn" id="r-copy">Copy link</button></div>
  <div><button class="btn gold" id="r-again">Play again</button><button class="btn" id="r-scores">Leaderboards</button><button class="btn" id="r-prizes">Prize counter</button><button class="btn" id="r-hall">Back to hall</button></div>
  <p class="small">Tickets come from playing and from score tiers. Bones are free play currency and can't be cashed out.</p>`, 'results');
  $('#r-again').onclick = () => { closePanel(); startPlay(); }; $('#r-scores').onclick = () => showScores(id); $('#r-prizes').onclick = () => showPrizes(); $('#r-hall').onclick = () => go(null);
  $('#r-copy').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/${id}`); $('#r-copy').textContent = 'Copied!'; } catch { $('#r-copy').textContent = location.origin + '/' + id; } };
}
const fmtT = (ms) => { const h = Math.floor(ms / 36e5); return h >= 48 ? `${Math.floor(h / 24)}d` : `${h}h ${Math.floor((ms % 36e5) / 6e4)}m`; };
export function showScores(game = 'arcade', period = 'daily') {
  if (!game || !GAMES[game]) game = game === 'arcade' || !game ? 'arcade' : 'arcade';
  const tabs = ['arcade', ...Object.keys(GAMES)].map((g) => `<button class="btn ${g === game ? 'on' : ''}" data-g="${g}">${g === 'arcade' ? 'Arcade' : esc(title(g))}</button>`).join('');
  const ptabs = S.PERIODS.map((p) => `<button class="btn ${p === period ? 'on' : ''}" data-p="${p}">${p}</button>`).join('');
  let rows;
  if (game === 'arcade') rows = S.arcadeBoard(A.db, period, Date.now(), 15).map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.name)}${e.house ? ' <span class="small">(house)</span>' : ''}</td><td>${e.points}</td><td>${e.games}/4</td></tr>`).join('');
  else rows = S.board(A.db, game, period, Date.now(), 15).map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.name)}${e.house ? ' <span class="small">(house)</span>' : ''}</td><td>${e.score}</td><td class="small">${new Date(e.at).toLocaleDateString()}</td></tr>`).join('');
  const pools = ['daily', 'weekly', 'monthly'].map((p) => { const ranked = S.arcadeBoard(A.db, p); const po = S.payouts(p, ranked);
    return `<div class="card"><b>${p.toUpperCase()} POOL</b><br>${S.POOLS[p].bones} Bones + ${esc(S.POOLS[p].cosmetic)}<br>${po.map((x) => `#${x.rank} ${esc(x.name)}: ${x.bones} 🦴${x.cosmetic ? ' + 👑' : ''}`).join('<br>')}<br><span class="small">resets in ${fmtT(S.resetsIn(p))}</span></div>`; }).join('');
  openPanel(`<h2>Leaderboards</h2><div class="tabs">${tabs}</div><div class="tabs">${ptabs}</div>
  <table><tr><th>#</th><th>Pup</th><th>${game === 'arcade' ? 'Arcade pts' : 'Score'}</th><th>${game === 'arcade' ? 'Games' : 'Date'}</th></tr>${rows || '<tr><td colspan=4>No scores yet. Be the first!</td></tr>'}</table>
  <h3>Prize pools (skill only)</h3><div class="grid">${pools}</div>
  <div class="note">Free to play. Prizes go to the top 3 on the combined Arcade board for each period, by rank only: no entry fee, no draws, no luck. Arcade points: each game's top score in the period is worth 1000, everyone else gets their share, summed over the four games. House scores (INU/PUP/DOG) are demo entries and never win. Scores are stored on this device for now; the server board is coming with kibble-pay sign-in.</div>`, 'scores');
  document.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => showScores(b.dataset.g, period))); document.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => showScores(game, b.dataset.p)));
}
export async function showPrizes(msg = '') {
  const P = A.purse, bal = await A.wallet().balance();
  const items = R.SHOP.map((it) => { const own = P.owned.includes(it.id); return `<div class="card"><b>${esc(it.name)}</b><br><span class="small">${it.slot ? it.slot + ' cosmetic' : 'lobby effect'}</span><br>🎟 ${it.tickets}<br><button class="btn ${own ? '' : 'gold'}" data-buy="${it.id}" ${own || P.tickets < it.tickets ? 'disabled' : ''}>${own ? 'Owned' : 'Swap tickets'}</button></div>`; }).join('');
  const skins = Object.keys(GAMES).map((g) => { const has = A.purse.skins[g] || []; const sp = R.SPONSORS[g];
    return `<div class="card"><b>${esc(title(g))}</b><br><span class="small">Sponsor: ${sp ? esc(sp.name) : 'open slot'}</span><br>
    <button class="btn" data-neon="${g}" ${has.includes('neon') || P.tickets < R.SKINS.neon.tickets ? 'disabled' : ''}>${has.includes('neon') ? 'Neon ✓' : `Neon skin 🎟${R.SKINS.neon.tickets}`}</button>
    <button class="btn gold" data-gold="${g}" ${has.includes('gold') ? 'disabled' : ''}>${has.includes('gold') ? 'Gold ✓' : `Gold skin: burn ${R.SKINS.gold.burn} KIBBLE`}</button></div>`; }).join('');
  openPanel(`<h2>Prize Counter</h2>${msg ? `<div class="note">${esc(msg)}</div>` : ''}<p>🦴 <b>${P.bones}</b> Bones · 🎟 <b>${P.tickets}</b> tickets · ${A.wallet().simulated ? 'demo' : ''} $KIBBLE <b>${bal}</b> ${A.wallet().simulated ? '<span class="small">(simulated wallet)</span>' : ''}</p>
  <h3>Swap tickets for cosmetics</h3><div class="grid">${items}</div>
  <h3>Cabinet skins</h3><div class="grid">${skins}</div>
  <div class="note">Fixed prices, no mystery boxes, no randomness. Cosmetics show on your Shiba in the hall (equip them under 🐕 Me). $KIBBLE is only burned for cosmetic skins. It is never an entry fee or a prize. Payments aren't live yet, so this uses a simulated demo wallet that never touches a blockchain.</div>`, 'prizes');
  document.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => { const r = R.redeem(P, b.dataset.buy); if (r.ok) { sfx('ticket'); if (r.item.slot) { A.profile.outfit[r.item.slot] = r.item.item; A.profile.cosmetics = [...new Set([...A.profile.cosmetics, r.item.id])]; } save(); } showPrizes(r.ok ? `Got ${r.item.name}!${r.item.slot ? ' Equipped.' : ''}` : r.reason); }));
  document.querySelectorAll('[data-neon]').forEach((b) => (b.onclick = () => { const r = R.unlockSkinWithTickets(P, b.dataset.neon); save(); if (r.ok) sfx('pow'); showPrizes(r.ok ? 'Neon skin unlocked!' : r.reason); }));
  document.querySelectorAll('[data-gold]').forEach((b) => (b.onclick = async () => { const r = await R.unlockSkinWithBurn(P, b.dataset.gold, A.wallet()); save(); if (r.ok) sfx('pow'); showPrizes(r.ok ? `Gold skin unlocked (${r.simulated ? 'simulated burn' : 'burn ' + r.sig}).` : r.reason); }));
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
  <p class="small">Wallet: ${A.wallet().simulated ? 'simulated demo wallet (payments not live yet)' : esc(A.wallet().address)}</p></div></div>`, 'profile');
  $('#pv').appendChild(avatarCanvas(p, 3));
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
