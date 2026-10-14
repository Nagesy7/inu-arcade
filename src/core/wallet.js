// Wallet adapter (same pattern as Inu Verse). SimWallet today: local demo $KIBBLE, no chain, no real money.
// Later: setWallet(kibblePayWallet(kibblePay)) with the SDK from https://kibble-pay.vercel.app/kibble-pay.js — callers don't change.
// We never see or store seed phrases / private keys; signing happens in the user's wallet app via kibblePay.
export function simWallet(storage) {
  const K = 'inuarcade.simkibble.v1'; const get = () => { const v = Number(storage?.getItem(K)); return Number.isFinite(v) && storage?.getItem(K) !== null ? v : 100; };
  return { id: 'sim', simulated: true, address: 'SIMULATED-DEMO-WALLET', balance: async () => get(),
    async burn({ amount }) { const b = get(); if (b < amount) return { ok: false, reason: `Need ${amount} demo KIBBLE` }; storage?.setItem(K, String(b - amount)); return { ok: true, sig: 'simburn-' + Date.now().toString(36), simulated: true }; },
    async buy({ amount }) { return this.burn({ amount }); } };
}
export function kibblePayWallet(kp) {
  return { id: 'kibble-pay', simulated: false, get address() { return kp.address; }, balance: async () => Number((await kp.balance())?.ui ?? 0),
    async burn({ amount, itemId }) { const r = await kp.burn(BigInt(Math.round(amount * 1e6)), { memo: 'kibble:burn:' + itemId }); return r?.ok ? { ok: true, sig: r.signature } : { ok: false, reason: r?.error || 'Burn failed' }; },
    async buy({ itemId, amount }) { const r = await kp.buy({ itemId, priceBaseUnits: String(Math.round(amount * 1e6)) }); return r?.ok ? { ok: true, sig: r.signature } : { ok: false, reason: r?.reason || 'Payment failed' }; } };
}
let active = null; export const wallet = () => active; export const setWallet = (w) => (active = w);
