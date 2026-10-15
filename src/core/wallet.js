// Wallet adapter. Real kibble-pay SDK (https://kibble-pay.vercel.app/kibble-pay.js) by default.
// Before the $KIBBLE mint is set every burn shows SOON. simWallet (fake 1,000,000 KIBBLE) ONLY with ?demo=1.
// We never see or store seed phrases / private keys; signing happens in the user's wallet app via kibblePay.
export const GAME = 'inu-arcade';
export const PRIZE_VERSION = 2;
export const SOON = 'KIBBLE launching soon: purchases open at launch.';
export function simWallet(storage) {
  const K = 'inuarcade.simkibble.v1'; const get = () => { const v = Number(storage?.getItem(K)); return Number.isFinite(v) && storage?.getItem(K) !== null ? v : 1000000; };
  return { id: 'sim', simulated: true, address: 'DEMO-WALLET', balance: async () => get(),
    async burn({ amount }) { const b = get(); if (b < amount) return { ok: false, reason: `Need ${amount} demo KIBBLE` }; storage?.setItem(K, String(b - amount)); return { ok: true, sig: 'simburn-' + Date.now().toString(36), simulated: true }; } };
}
// placeholder while kibble-pay loads (never fakes a balance)
export const pendingWallet = () => ({ id: 'pending', simulated: false, live: false, address: null, balance: async () => 0, async burn() { return { ok: false, reason: SOON }; } });
export function kibblePayWallet(kp) {
  return { id: 'kibble-pay', simulated: false, get live() { return !!kp.cfg?.provisioned; }, get address() { return kp.session ? kp.address : null; },
    async connect() { await kp.connect(); await kp.signIn(); return kp.address; },
    balance: async () => (kp.cfg?.provisioned && kp.address ? Number((await kp.balance())?.ui ?? 0) : 0),
    // OPT-IN burn: tokens are destroyed (nobody receives them); the server records burn:<itemId> in the wallet's inventory
    async burn({ amount, itemId }) { if (!kp.cfg?.provisioned) return { ok: false, reason: SOON };
      const r = await kp.burn(String(amount), { itemId, game: GAME }); return r?.ok ? { ok: true, sig: r.signature } : { ok: false, reason: r?.error || 'Burn failed' }; },
    async inventory() { return (await kp.inventory(GAME))?.[GAME] || {}; },
    // v2 (remixed rules) prize scores: same game ids, body {game, score, durationMs, v: 2}. kibble-pay keeps them on
    // their own board (sc:<pool>:<period>:<game>@v2) (kibble-pay ff77ee1); scores without v are hidden v1.
    submitScore: (game, score, ms) => kp.submitScore(game, score, ms, { v: PRIZE_VERSION }) };
}
let active = null; export const wallet = () => active; export const setWallet = (w) => (active = w);
