// Rewards: Bones (free currency, never cashed out) + prize tickets, earned for playing and for skill.
// Prize counter is a FIXED shop: fixed ticket price per cosmetic, no randomness, no loot boxes.
// $KIBBLE (live, real on-chain token) is only ever burned/spent for cosmetics (cabinet skins); it is never a prize or an entry fee.
export const TICKET_TIERS = { 'kibble-chomp': [800, 2000, 4000, 8000], 'bark-invaders': [400, 1200, 2500, 5000], 'pup-crossing': [300, 900, 2000, 4000], 'bone-breaker': [500, 1500, 3000, 6000], 'street-sniffer': [900, 2200, 4500, 9000], 'paw-fu-tower': [1000, 3000, 6000, 12000], 'bone-digger': [2000, 6000, 12000, 24000] };
export const DAILY_BONE_CAP = 600;
export function earn(game, score) {
  const tiers = TICKET_TIERS[game] || []; const tickets = 1 + tiers.filter((t) => score >= t).length;
  const bones = Math.min(60, 5 + Math.floor(score / 150)); return { bones, tickets };
}
export const SHOP = [
  { id: 'arcade-cap', name: 'Arcade Cap', tickets: 4, slot: 'hat', item: { id: 'arcade-cap', kind: 'cap', c: '#ff5d73', d: '#a02a3a' } },
  { id: 'pixel-shades', name: '8-Bit Shades', tickets: 6, slot: 'eyes', item: { id: 'pixel-shades', kind: 'shades', c: '#1a1424', d: '#000000' } },
  { id: 'token-scarf', name: 'Token Scarf', tickets: 8, slot: 'neck', item: { id: 'token-scarf', kind: 'scarf', c: '#f2c14e', d: '#b08a2a' } },
  { id: 'high-score-jacket', name: 'High-Score Jacket', tickets: 15, slot: 'top', item: { id: 'high-score-jacket', kind: 'jacket', c: '#4fc3e8', d: '#2a7fa0' } },
  { id: 'neon-tophat', name: 'Neon Top Hat', tickets: 20, slot: 'hat', item: { id: 'neon-tophat', kind: 'tophat', c: '#9b59d6', d: '#5a2a8a', accent: '#7ef0ff' } },
  { id: 'joystick-pin', name: 'Joystick Pin', tickets: 10, slot: 'neck', item: { id: 'joystick-pin', kind: 'pin', c: '#e0303a', d: '#801818' } },
  { id: 'glow-sneakers', name: 'Glow Sneakers', tickets: 12, slot: 'feet', item: { id: 'glow-sneakers', kind: 'sneakers', c: '#5fd37a', d: '#2a8a4a' } },
  { id: 'trail-stars', name: 'Lobby Star Trail', tickets: 25, slot: null },
];
// Per-cabinet skin hooks: sponsor slot (simulated) + burn-to-unlock skin paid with $KIBBLE (real burn via Phantom; simulated only with ?demo=1).
export const SKINS = { gold: { name: 'Gold Cabinet', burn: 250000 }, neon: { name: 'Neon Cabinet', tickets: 12 } };
export const SPONSORS = { 'kibble-chomp': null, 'bark-invaders': null, 'pup-crossing': null, 'bone-breaker': null, 'street-sniffer': null, 'paw-fu-tower': null, 'bone-digger': null }; // e.g. { name: 'Your Brand', url } set server-side later
export function newWallet() { return { bones: 0, tickets: 0, owned: [], skins: {}, today: '', todayBones: 0, plays: 0 }; }
export function grant(w, game, score, now = new Date()) {
  const day = now.toISOString().slice(0, 10); if (w.today !== day) { w.today = day; w.todayBones = 0; }
  const e = earn(game, score); const bones = Math.max(0, Math.min(e.bones, DAILY_BONE_CAP - w.todayBones));
  w.bones += bones; w.todayBones += bones; w.tickets += e.tickets; w.plays++; return { bones, tickets: e.tickets };
}
export function redeem(w, id) {
  const it = SHOP.find((s) => s.id === id); if (!it) return { ok: false, reason: 'Unknown prize' };
  if (w.owned.includes(id)) return { ok: false, reason: 'Already owned' };
  if (w.tickets < it.tickets) return { ok: false, reason: `Need ${it.tickets} tickets` };
  w.tickets -= it.tickets; w.owned.push(id); return { ok: true, item: it };
}
export function unlockSkinWithTickets(w, game, skin = 'neon') { const s = SKINS[skin]; if (!s?.tickets) return { ok: false, reason: 'Not a ticket skin' }; if ((w.skins[game] || []).includes(skin)) return { ok: false, reason: 'Already unlocked' };
  if (w.tickets < s.tickets) return { ok: false, reason: `Need ${s.tickets} tickets` }; w.tickets -= s.tickets; (w.skins[game] ||= []).push(skin); return { ok: true }; }
export async function unlockSkinWithBurn(w, game, wallet, skin = 'gold') { const s = SKINS[skin]; if (!s?.burn) return { ok: false, reason: 'Not a burn skin' }; if ((w.skins[game] || []).includes(skin)) return { ok: false, reason: 'Already unlocked' };
  const r = await wallet.burn({ amount: s.burn, itemId: `inu-arcade:skin:${game}:${skin}` }); if (!r.ok) return r; (w.skins[game] ||= []).push(skin); return { ok: true, sig: r.sig, simulated: r.simulated }; }
