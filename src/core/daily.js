// Daily Event: one free challenge per Sydney calendar day, the same for every player worldwide.
// Deterministic: the Australia/Sydney date picks the cabinet (cycling all nine, never the same one two days running),
// the mode (CLASSIC / INU) and a score target taken from the house-score ladder in scores.js.
// Rewards are Bones (topped up inside the normal run through rewards.grant, so the 60-per-run and 600-per-day caps
// still apply) and, after three completed events, one cosmetic (Event Ribbon). Never $KIBBLE, no wagers, no fees,
// no paid entry, no wallet needed. Progress lives in the local purse only (no new currency, no server ledger).
import { HOUSE, GAME_IDS } from './scores.js';
import { hash } from './meta.js';
export const TZ = 'Australia/Sydney';
export const EVENT_GAMES = GAME_IDS; // the nine live cabinets
export const NAMES = { 'kibble-chomp': 'KIBBLE CHOMP', 'bark-invaders': 'BARK INVADERS', 'pup-crossing': 'PUP CROSSING', 'bone-breaker': 'BONE BREAKER', 'street-sniffer': 'STREET SNIFFER', 'paw-fu-tower': 'PAW-FU TOWER', 'bone-digger': 'BONE DIGGER', 'pips-big-bark': "PIP'S BIG BARK", 'shiba-scuffle': 'SHIBA SCUFFLE' };
const nice = (v) => { const m = v >= 10000 ? 1000 : v >= 1000 ? 100 : 25; return Math.max(m, Math.round(v / m) * m); };
// Three tiers per cabinet from the house ladder: DOG (beginner), PUP (typical run), halfway from PUP to INU.
export const TARGETS = Object.fromEntries(EVENT_GAMES.map((g) => { const h = Object.fromEntries(HOUSE[g]); return [g, [nice(h.DOG), nice(h.PUP), nice((h.PUP + h.INU) / 2)]]; }));
export const TIER_NAMES = ['WARM-UP', 'CHALLENGE', 'HOT STREAK'];
export const EVENT_BONES = [15, 20, 30]; // bonus Bones per tier, still inside the per-run and per-day caps
export const RIBBON_AFTER = 3; // completed events (on different days) to earn the Event Ribbon
export const RIBBON = { id: 'event-ribbon', name: 'Event Ribbon', slot: 'neck', item: { id: 'event-ribbon', kind: 'ribbon', c: '#7ef0ff', d: '#2a7fa0' } };
export const EVENT_COSMETICS = [RIBBON];
export const REWARD_KINDS = ['bones', 'cosmetic']; // the only reward types an event can ever pay
// YYYY-MM-DD in Sydney, whatever the device time zone.
export function sydneyDay(now = Date.now()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
  const g = (k) => p.find((x) => x.type === k).value; return `${g('year')}-${g('month')}-${g('day')}`;
}
const dayNumber = (day) => Math.round(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) / 864e5);
export function dailyEvent(now = Date.now()) {
  const day = typeof now === 'string' ? now : sydneyDay(now), h = hash('inu-arcade:event:' + day), n = dayNumber(day);
  const game = EVENT_GAMES[(((n * 4 + 7) % 9) + 9) % 9]; // step 4 (coprime with 9): every cabinet once per 9 days, never twice in a row
  const tier = (h >>> 5) % 3, mode = (h >>> 9) % 2 ? 'inu' : 'classic', target = TARGETS[game][tier], bones = EVENT_BONES[tier];
  return { day, game, mode, tier, target, bones, name: NAMES[game], tierName: TIER_NAMES[tier], reward: { bones, cosmetic: RIBBON.id, cosmeticAfter: RIBBON_AFTER },
    goal: `Score ${target.toLocaleString('en-US')} in ${titleCase(NAMES[game])} ${mode === 'inu' ? 'Inu Mode' : 'Classic'}`,
    short: `${NAMES[game]} ${mode === 'inu' ? 'INU' : 'CLASSIC'} ${target.toLocaleString('en-US')}+` };
}
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])\w/g, (c) => c.toUpperCase()).replace("Pip'S", "Pip's");
// Inu Mode events also count runs on the Daily seed (that is Inu Mode on a shared seed). Classic events need Classic.
export const modeOk = (ev, mode) => (ev.mode === 'inu' ? mode === 'inu' || mode === 'daily' : mode === 'classic');
export const doneToday = (purse, ev) => purse?.event?.day === ev.day && !!purse.event.done;
export function qualifies(purse, ev, run) { return !!run && run.game === ev.game && modeOk(ev, run.mode) && Number.isFinite(run.score) && run.score >= ev.target && !doneToday(purse, ev); }
// Mark today's event done (once per Sydney day). Bones are NOT added here: the caller passes ev.bones to rewards.grant as the
// run's bonus so the normal caps apply. Returns what was unlocked.
export function markDone(purse, ev) {
  if (doneToday(purse, ev)) return null; purse.event = { day: ev.day, done: true }; purse.eventDays = (purse.eventDays || 0) + 1;
  purse.owned ||= []; let cosmetic = null; if (purse.eventDays >= RIBBON_AFTER && !purse.owned.includes(RIBBON.id)) { purse.owned.push(RIBBON.id); cosmetic = RIBBON; }
  return { day: ev.day, count: purse.eventDays, cosmetic };
}
export function progress(purse, ev) { return { done: doneToday(purse, ev), count: purse?.eventDays || 0, ribbon: !!purse?.owned?.includes(RIBBON.id), toRibbon: Math.max(0, RIBBON_AFTER - (purse?.eventDays || 0)) }; }
export function resetsIn(now = Date.now()) { // ms until the next Sydney midnight
  const day = sydneyDay(now); let lo = now, hi = now + 26 * 36e5; while (hi - lo > 1000) { const mid = Math.floor((lo + hi) / 2); if (sydneyDay(mid) === day) lo = mid; else hi = mid; } return hi - now;
}
