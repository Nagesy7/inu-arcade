// Inu Verse ↔ Inu Arcade embedding contract (/workspace/inu-shared/verse-districts.md v2). Pure helpers + framed postMessage glue.
// Entry: ?from=verse|inu-verse &district=<id> &spawn=<id> &return=<url>. return= is honoured ONLY for the Inu Verse origin or this
// Arcade's own origin (never an open redirect). When framed, we post inu-arcade:ready / exit / score to the Verse origin only.
export const VERSE = 'https://inu-verse-tawny.vercel.app';
const ID = (v) => String(v || '').replace(/[^\w-]/g, '').slice(0, 40);
export function isFromVerse(q, referrer = '') { return /^(inu-)?verse$/.test(q.get('from') || '') || String(referrer || '').startsWith(VERSE + '/') || referrer === VERSE; }
// Returns an absolute URL string when `ret` is safe (https Inu Verse, or same-origin as `origin`), else null.
export function safeReturn(ret, origin) {
  if (!ret || typeof ret !== 'string' || ret.length > 2000 || /[\u0000-\u001f\\]/.test(ret)) return null;
  let u; try { u = new URL(ret, origin || VERSE + '/'); } catch { return null; }
  if (u.username || u.password) return null;
  if (u.origin === VERSE && u.protocol === 'https:') return u.href;
  if (origin && u.origin === new URL(origin).origin && /^https?:$/.test(u.protocol)) return u.href;
  return null;
}
// Parse the entry params. `defaults` = { district, spawn } from the cabinet META.verse (used when Verse sent from= but not spawn=).
export function readVerse(search = '', { origin = '', referrer = '', defaults = null } = {}) {
  let q; try { q = new URLSearchParams(search); } catch { q = new URLSearchParams(); }
  const from = isFromVerse(q, referrer), district = ID(q.get('district')) || (from && defaults?.district) || '', spawn = ID(q.get('spawn')) || (from && defaults?.spawn) || '';
  return { from, district, spawn, ret: safeReturn(q.get('return'), origin) };
}
// Where 🏠 / Back to Inu Verse goes: an allowlisted return=, else the Verse spawn we came from, else the Verse root.
export function returnUrl(v) { if (v.ret) return v.ret; return VERSE + '/' + (v.from && v.spawn ? '?spawn=' + encodeURIComponent(v.spawn) + (v.district ? '&district=' + encodeURIComponent(v.district) : '') : ''); }
export const framed = (w = globalThis.window) => { try { return !!w && w.parent && w.parent !== w; } catch { return true; } };
// postMessage to the Verse parent only (target origin pinned, so nothing leaks to a foreign embedder). UX-only; never prize truth.
export function post(type, data = {}, w = globalThis.window) { if (!framed(w)) return false; try { w.parent.postMessage({ type, ...data }, VERSE); return true; } catch { return false; } }
