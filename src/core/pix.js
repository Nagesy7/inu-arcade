// Tiny pixel-art sprite system (Inu Verse style: chunky pixels, dark outline). All art original, drawn from char maps.
const cache = new Map();
const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
// palette chars -> colours; '.' = transparent. Outline 'k' auto-added around non-transparent pixels when outline=true.
export function sprite(name, rows, pal, { outline = true, flip = false } = {}) {
  const key = name + (flip ? ':f' : ''); if (cache.has(key)) return cache.get(key);
  const h = rows.length, w = Math.max(...rows.map((r) => r.length)), o = outline ? 1 : 0, c = mk(w + 2 * o, h + 2 * o), g = c.getContext('2d');
  const at = (x, y) => { const r = rows[y]; if (!r) return '.'; const ch = r[flip ? w - 1 - x : x]; return ch === undefined ? '.' : ch; };
  if (outline) { g.fillStyle = '#1a1424'; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y) !== '.') for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.fillRect(x + o + dx, y + o + dy, 1, 1); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = at(x, y); if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x + o, y + o, 1, 1); } }
  cache.set(key, c); return c;
}
export function blit(ctx, spr, x, y, s = 1) { ctx.drawImage(spr, Math.round(x), Math.round(y), spr.width * s, spr.height * s); }
export function blitC(ctx, spr, cx, cy, s = 1) { blit(ctx, spr, cx - (spr.width * s) / 2, cy - (spr.height * s) / 2, s); }

// ---- shared palette & sprites ----
export const SHIBA = { o: '#e0802c', d: '#b65a1c', w: '#fbf1e0', e: '#1a1424', n: '#3a2430', p: '#f08a9a', r: '#d6302f' };
export const shibaHead = (coat = '#e0802c', dark = '#b65a1c') => sprite('shibaHead' + coat, [
  '.o.....o.', 'oo.....oo', 'odo...odo', 'ooooooooo', 'oweoooewo', 'owwwnwwwo', 'owwwpwwwo', '.owwwwwo.', '..ooooo..',
], { ...SHIBA, o: coat, d: dark });
export const shibaHeadOpen = (coat = '#e0802c', dark = '#b65a1c') => sprite('shibaHeadOpen' + coat, [
  '.o.....o.', 'oo.....oo', 'odo...odo', 'ooooooooo', 'oweoooewo', 'owwwnwwwo', 'ow.....wo', '.ow...wo.', '..ooooo..',
], { ...SHIBA, o: coat, d: dark });
// side-view Shiba body (for crossing / invaders turret)
export const shibaBody = (coat = '#e0802c') => sprite('shibaBody' + coat, [
  '.o.o.....', '.oooo...o', 'oeooo..oo', 'wwnoooooo', 'wwooooooo', '.wwwwooo.', '.o.o.o.o.',
], { ...SHIBA, o: coat });
export const shibaBack = (coat = '#e0802c') => sprite('shibaBack' + coat, [
  '.o.....o.', '.oo...oo.', '.ooooooo.', 'ooooooooo', '.owwwwwo.', '.ooooooo.', '.oo.w.oo.', '.o.ooo.o.', '..o...o..',
], { ...SHIBA, o: coat });
export const cat = (c) => sprite('cat' + c, [
  'c.......c', 'cc.....cc', 'ccccccccc', 'cwecccewc', 'ccccpcccc', 'cwccccwcc', 'ccccccccc', 'ccccccccc', 'c.c.c.c.c',
], { c, w: '#ffffff', e: '#1a1424', p: '#f08a9a' });
export const catScared = (blink) => sprite('catScared' + blink, [
  'c.......c', 'cc.....cc', 'ccccccccc', 'ccwcccwcc', 'ccccccccc', 'cwcwcwcwc', 'ccccccccc', 'ccccccccc', 'c.c.c.c.c',
], { c: blink ? '#f0f0ff' : '#2b3fb8', w: blink ? '#d6302f' : '#f6e9b0' });
export const catEyes = () => sprite('catEyes', ['.........', '.........', '.........', '.we...we.', '.........'], { w: '#fff', e: '#2b3fb8' }, { outline: false });
export const bone = () => sprite('bone', ['ww...ww', 'wwwwwww', 'ww...ww'], { w: '#fbf1e0' });
export const kibble = () => sprite('kibble', ['.k.', 'kkk', '.k.'], { k: '#c88a3c' }, { outline: false });
