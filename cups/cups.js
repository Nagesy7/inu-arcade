// Inu Arcade cups page: reads the kibble-pay bracket API (/api/tournaments). Never decides winners; real data only.
// Free entry, skill only: cosmetic rewards (inventory), Bones recorded for manual hand-out, no $KIBBLE, wagers or fees.
const Q = new URLSearchParams(location.search);
const API_OK = /^https:\/\/(kibble-pay\.vercel\.app|kibble-[a-z0-9-]+-prosper33\.vercel\.app)$|^http:\/\/localhost:\d+$/;
export const API = API_OK.test(Q.get('api') || '') ? Q.get('api') : 'https://kibble-pay.vercel.app';
const $ = (s) => document.querySelector(s), main = $('#main');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GAME_NAMES = { 'kibble-chomp': 'Kibble Chomp', 'bark-invaders': 'Bark Invaders', 'bone-breaker': 'Bone Breaker', 'pup-crossing': 'Pup Crossing', 'street-sniffer': 'Street Sniffer', 'paw-fu-tower': 'Paw-Fu Tower', 'bone-digger': 'Bone Digger', 'pips-big-bark': "Pip's Big Bark", 'shiba-scuffle': 'Shiba Scuffle', 'inu-rescue': 'Inu Rescue', 'meme-brawl': 'Meme Brawl' };
const gname = (g) => GAME_NAMES[g] || g;
const STATUS = { signup: 'SIGN-UP OPEN', active: 'LIVE', complete: 'COMPLETE', cancelled: 'CANCELLED', seeding: 'SEEDING' };
const RULES = 'Free entry · skill only · cosmetic rewards · no $KIBBLE, wagers or fees';
let K = null, cur = null;
const session = () => K?.kp?.session || null;
async function api(params, { method = 'GET', body } = {}) {
  const u = new URL(API + '/api/tournaments'); if (method === 'GET') for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const h = { 'content-type': 'application/json' }; if (session()) h.authorization = 'Bearer ' + session();
  const r = await fetch(u, { method, headers: h, body: method === 'GET' ? undefined : JSON.stringify(params), cache: 'no-store' });
  const j = await r.json().catch(() => ({ ok: false, reason: 'bad response' })); if (!r.ok && j.ok !== false) j.ok = false; return j;
}
const left = (ms) => { if (!ms) return ''; const d = ms - Date.now(); if (d <= 0) return 'ended'; const h = Math.floor(d / 36e5), m = Math.floor((d % 36e5) / 6e4); return h > 47 ? `${Math.floor(h / 24)}d left` : h ? `${h}h ${m}m left` : `${m}m left`; };
const fmtDur = (ms) => (ms ? `${(ms / 1000).toFixed(1)}s` : '');

export async function showList() {
  cur = null; history.replaceState(null, '', location.pathname + (Q.get('api') ? `?api=${encodeURIComponent(API)}` : ''));
  let j; try { j = await api({ op: 'list' }); } catch { j = { ok: false, reason: 'network' }; }
  if (!j.ok) { main.innerHTML = `<div class="empty"><h2>Cups are warming up</h2><p>We couldn't load the cup list right now. No cups are shown rather than made-up ones.</p><p class="muted">${esc(RULES)}</p><button class="btn" id="retry">Try again</button></div>`; $('#retry').onclick = showList; return; }
  const ts = j.tournaments || [];
  if (!ts.length) { main.innerHTML = `<div class="empty"><h2>No cups yet</h2><p>The first weekly 16-player cup hasn't been announced. When sign-up opens it will appear here.</p><p class="muted">${esc(RULES)}</p><p><a class="btn" href="/">Play the cabinets meanwhile</a></p></div>`; return; }
  const order = { signup: 0, active: 1, seeding: 1, complete: 2, cancelled: 3 };
  main.innerHTML = `<p class="rules">${esc(RULES)}${j.staging ? ' · <b class="s-cancelled">STAGING DATA</b>' : ''}</p><div class="grid">${ts.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || b.createdAt - a.createdAt).map((t) => `
    <button class="card" data-tid="${esc(t.tid)}"><h3>${esc(t.title)}</h3>
      <span class="tag s-${esc(t.status)}">${esc(STATUS[t.status] || t.status)}</span><span class="tag">${t.kind === 'meme-brawl' ? '1V1' : 'SCORE ATTACK'}</span>
      <div>${esc(gname(t.game))} · ${t.entrantCount}/${t.capacity} players</div>
      <div class="muted">${t.status === 'signup' ? esc(t.signupClosesAt ? 'Sign-up ' + left(t.signupClosesAt) : 'Sign-up open') : t.status === 'active' ? `Round ${t.currentRound} of ${t.rounds}` : t.status === 'complete' ? '🏆 ' + esc(t.winner || '') : ''}</div></button>`).join('')}</div>`;
  for (const b of main.querySelectorAll('.card')) b.onclick = () => showCup(b.dataset.tid);
}
function player(m, side) { const w = m[side], s = m.scores?.[side], seed = side === 'a' ? m.seedA : m.seedB;
  const cls = m.winner && w ? (m.winner === w ? 'w' : 'l') : '';
  return `<div class="p ${cls}"><span>${seed ? `<span class="muted">${seed}</span> ` : ''}${w ? esc(w) : m.bye ? '<span class="muted">bye</span>' : '<span class="muted">TBD</span>'}</span><span>${s ? esc(s.score) : ''}</span></div>`; }
const mStatus = (m) => m.bye ? 'bye' : m.status === 'flagged' ? '⚑ admin review' : m.status === 'done' ? (m.outcome?.kind === 'admin-decision' ? 'admin decision' : m.outcome?.kind === 'no-show' || m.outcome?.kind === 'forfeit' ? 'no-show win' : 'final') : m.status === 'open' ? 'playing' : 'waiting';
export async function showCup(tid) {
  let j; try { j = await api({ op: 'get', tid }); } catch { j = { ok: false }; }
  if (!j.ok) { main.innerHTML = `<div class="empty"><h2>Cup not found</h2><p>${esc(j.reason || 'It may have been removed.')}</p><button class="btn" id="back">All cups</button></div>`; $('#back').onclick = showList; return; }
  cur = j; const t = j.tournament; history.replaceState(null, '', `${location.pathname}?tid=${encodeURIComponent(t.tid)}${Q.get('api') ? `&api=${encodeURIComponent(API)}` : ''}`);
  const rounds = t.rounds || 0, cols = [];
  for (let r = 1; r <= rounds; r++) { const ms = j.matches.filter((m) => m.round === r), rn = j.rounds.find((x) => x.round === r);
    const name = rn?.name || (r === rounds ? 'Final' : r === rounds - 1 ? 'Semifinals' : `Round ${r}`);
    const ghosts = ms.length ? '' : Array.from({ length: (t.size || 2) >> r }, () => '<div class="m"><div class="p"><span class="muted">TBD</span></div><div class="p"><span class="muted">TBD</span></div></div>').join('');
    cols.push(`<div class="col"><h4>${esc(name)}${rn?.status === 'open' ? ' · ' + esc(left(rn.endsAt)) : ''}</h4><div class="slots">${ms.map((m) => `<button class="m ${m.you ? 'you' : ''} ${m.status === 'flagged' ? 'flagged' : ''}" data-mid="${esc(m.mid)}">${player(m, 'a')}${player(m, 'b')}<div class="st">${esc(mStatus(m))}</div></button>`).join('')}${ghosts}</div></div>`); }
  const signupBtn = t.status !== 'signup' ? '' : j.signedUp ? '<span class="tag s-signup">YOU ARE IN</span>' : session() ? '<button class="btn go" id="join">Sign up free</button>' : '<span class="muted">Connect your wallet (top right) to sign up free</span>';
  const champ = t.status === 'complete' ? `<p>🏆 Champion: <b class="s-complete">${esc(t.winnerWallet)}</b> · cosmetic goes to inventory (never sold)${t.rewards?.champion?.bones ? ` · ${esc(t.rewards.champion.bones)} Bones pending manual hand-out` : ''}</p>` : '';
  main.innerHTML = `<div class="hd"><button class="tb" id="back">◀ Cups</button><h2>${esc(t.title)}</h2><span class="tag s-${esc(t.status)}">${esc(STATUS[t.status] || t.status)}</span>
    <span>${esc(gname(t.game))} · ${t.kind === 'meme-brawl' ? 'verified ranked 1v1' : 'best score in the round window'} · ${t.entrantCount}/${t.capacity}</span>${signupBtn}</div>
    <p class="rules">${esc(RULES)} · seeded by ${t.seedBy === 'inu-score' ? 'Inu Score' : 'sign-up order'}${t.staging ? ' · <b class="s-cancelled">STAGING</b>' : ''}</p>${champ}
    ${t.status === 'signup' ? `<p>${j.entrants?.length ? 'Signed up: ' + j.entrants.map((e) => esc(e.wallet)).join(', ') : '<span class="muted">Nobody has signed up yet. Be the first.</span>'}</p>` : ''}
    ${t.status === 'cancelled' ? `<p class="muted">Cancelled: ${esc(t.cancelReason || '')}</p>` : rounds ? `<div class="bracket">${cols.join('')}</div>` : ''}`;
  $('#back').onclick = showList;
  const jb = $('#join'); if (jb) jb.onclick = async () => { jb.disabled = true; const r = await api({ op: 'signup', tid: t.tid }, { method: 'POST' }); if (!r.ok) { jb.disabled = false; jb.textContent = r.reason || 'Try again'; } else showCup(t.tid); };
  for (const b of main.querySelectorAll('.m[data-mid]')) b.onclick = () => showMatch(j.matches.find((m) => m.mid === b.dataset.mid));
}
function showMatch(m) { const t = cur.tournament, d = $('#dbody'); if (!m) return;
  const row = (side) => { const s = m.scores?.[side]; return `<p>${m[side] ? esc(m[side]) : 'TBD'}${s ? ` · ${esc(s.score)} pts${s.durationMs ? ' in ' + fmtDur(s.durationMs) : ''}` : ''}${m.winner && m.winner === m[side] ? ' 🏆' : ''}</p>`; };
  let cta = '';
  if (m.status === 'open' && m.you) cta = t.kind === 'meme-brawl' && m.link ? `<a class="btn go" href="${esc(m.link)}" target="_blank" rel="noopener">Play your 1v1 in Meme Brawl</a>` : t.kind === 'cabinet' ? `<a class="btn go" href="/${esc(t.game)}?from=tournaments&tid=${encodeURIComponent(t.tid)}&mid=${encodeURIComponent(m.mid)}">Play ${esc(gname(t.game))}</a><p class="muted">Your best verified score before the round ends counts.</p>` : '';
  else if (m.status === 'open' && t.kind === 'meme-brawl' && m.link) cta = `<a class="btn" href="${esc(m.link)}" target="_blank" rel="noopener">Room link</a>`;
  const flag = m.flag ? `<div class="note"><b>${m.flag.decision ? 'Admin decision' : 'Flagged for admin review'}</b><br>${esc(m.flag.reason)}${m.flag.decision ? `<br>Winner: ${esc(m.flag.decision.winner)} · “${esc(m.flag.decision.note)}”` : '<br><span class="muted">No coin flips: an admin decides and the decision is posted here.</span>'}</div>` : '';
  d.innerHTML = `<h2>${esc(m.mid.toUpperCase())} · ${esc(mStatus(m))}</h2>${row('a')}<p class="muted">vs</p>${row('b')}${flag}${cta}`;
  $('#detail').hidden = false; }
$('#dclose').onclick = () => { $('#detail').hidden = true; }; $('#detail').onclick = (e) => { if (e.target.id === 'detail') $('#detail').hidden = true; };
$('#b-refresh').onclick = () => (cur ? showCup(cur.tournament.tid) : showList());
const route = () => (Q.get('tid') ? showCup(Q.get('tid').toLowerCase()) : showList());
route();
// kibble-pay wallet pill (top-right) + 🏠 (top-left). Time-boxed: the page works read-only without it.
import('/src/vendor/inu-games.js').then(async (g) => {
  K = await Promise.race([g.initKibble({ game: 'inu-arcade' }), new Promise((r) => setTimeout(() => r({ mode: 'offline', kp: null }), 10000))]).catch(() => ({ mode: 'offline', kp: null }));
  g.mountFooter?.(K.mode); g.mountHome?.({ label: 'Back to Inu Verse' });
  g.mountWallet?.(K, { game: 'inu-arcade', keys: [], position: 'top-right', onWallet: () => (cur ? showCup(cur.tournament.tid) : null) });
  for (const ev of ['kibble:wallet']) { window.addEventListener(ev, () => cur && showCup(cur.tournament.tid)); document.addEventListener(ev, () => cur && showCup(cur.tournament.tid)); }
  if (cur && session()) showCup(cur.tournament.tid);
}).catch(() => {});
