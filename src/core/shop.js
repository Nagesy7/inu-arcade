// Optional Kibble Pay shop / For devs links (spec: cabal-meme-maker-shots/discover/game-specs.md). Cosmetics only:
// $KIBBLE is never needed to play. Analytics carry only product / from / site: never wallet, mint, name or score.
export const SITE = 'inu-arcade';
export const SHOP_URL = 'https://kibbleinu.com/pay?utm_source=inu-arcade&utm_medium=menu#shop-h';
export const SHOP_RESULTS_URL = 'https://kibbleinu.com/pay?utm_source=inu-arcade&utm_medium=results#shop-h';
export const DEVS_URL = 'https://kibbleinu.com/for-devs.html?utm_source=inu-arcade&utm_medium=menu';
export const COPY = {
  shop: '🛍️ Shop',
  shopTitle: 'Optional cosmetics. $KIBBLE is never needed to play.',
  devs: '🛠️ For devs',
  nudge: 'Like your look? Outfits, pets and cars for every Inu game are in the Kibble Pay shop. Optional, and never needed to play.',
  visit: 'Visit the shop →',
  notNow: 'Not now',
};
export const NUDGE_KEY = 'inu.shopNudge';
export const BANNED = /hurry|limited|last chance|don't miss|guarantee|moon|profit|prize/i;
export const eventProps = (product, from) => ({ name: 'paid_link_click', data: { product, from, site: SITE } });
// No-op when Vercel Analytics (window.va) is missing or throws.
export function trackClick(product, from, w = globalThis.window) { try { w?.va?.('event', eventProps(product, from)); } catch {} }
// At most once per browser session; sessionStorage blocked -> treat as already shown (never nag).
export function nudgeSeen(ss = globalThis.sessionStorage) { try { return ss.getItem(NUDGE_KEY) != null; } catch { return true; } }
export function markNudge(ss = globalThis.sessionStorage) { try { ss.setItem(NUDGE_KEY, '1'); } catch {} }
