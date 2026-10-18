// Optional virtual joystick, shared by every cabinet (and the hall). OFF by default: with it off nothing here touches the
// existing d-pad layout or input behaviour. With it on, a compact semi-transparent left-thumb stick replaces the d-pad;
// the A / START / BACK buttons stay on the right and work at the same time (multi-touch, see createTouchRouter in input.js).
export const SETTINGS_KEY = 'inuarcade.settings.v1'; // also part of the wallet cloud save (mountWallet keys in main.js)
export const DEAD = 0.28; // dead zone, fraction of the stick travel radius
export const TRAVEL = 40; // knob travel radius in CSS px
export const BASE = 112; // stick base diameter in CSS px (sits inside the 172 px left gutter fitBox keeps clear)
// Direction mapping per cabinet while playing: 4-way for maze/grid games, horizontal for paddle/shooter.
// Menus (title, initials, results...) always use 4-way so up/down still pick modes and letters.
export const JOY_MODES = { 'kibble-chomp': '4way', 'pup-crossing': '4way', 'bark-invaders': 'h', 'bone-breaker': 'h', lobby: '8way' };
export const joyMode = (cabId, playing) => (cabId ? (playing ? JOY_MODES[cabId] || '4way' : '4way') : JOY_MODES.lobby);

export function loadSettings(storage) { try { const v = JSON.parse(storage?.getItem(SETTINGS_KEY) || 'null'); return { joystick: v?.joystick === true }; } catch { return { joystick: false }; } }
export function saveSettings(storage, s) { try { storage?.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(storage), ...s })); } catch {} }

// dx, dy: finger offset from the stick centre (CSS px, +y = down). Returns { x: 'left'|'right'|null, y: 'up'|'down'|null }.
export function stickDir(dx, dy, mode = '4way', r = TRAVEL, dead = DEAD) {
  const m = Math.hypot(dx, dy), none = { x: null, y: null };
  if (m < r * dead) return none;
  const hx = dx < 0 ? 'left' : 'right', vy = dy < 0 ? 'up' : 'down';
  if (mode === 'h') return Math.abs(dx) < r * dead ? none : { x: hx, y: null };
  if (mode === '4way') return Math.abs(dx) >= Math.abs(dy) ? { x: hx, y: null } : { x: null, y: vy };
  // 8way: 45-degree sectors centred on each direction
  const a = Math.abs(Math.atan2(dy, dx)) * 180 / Math.PI; // 0 = right, 180 = left
  return { x: a < 67.5 ? 'right' : a > 112.5 ? 'left' : null, y: a > 22.5 && a < 157.5 ? vy : null };
}

// DOM stick (inside #pad). mode() -> '4way' | 'h' | '8way'. Returns the joy object the touch router uses.
export function createJoystick(pad, mode = () => '4way') {
  const el = document.createElement('div'); el.id = 'joy'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<i class="knob"></i>';
  pad.appendChild(el); const knob = el.firstChild; let on = false, cx = 0, cy = 0;
  const S = { el,
    set(v) { on = !!v; document.body.classList.toggle('joy', on); el.hidden = !on; if (!on) S.release(); },
    get active() { return on; },
    // a touch that STARTS on the stick base (plus a small margin) belongs to the stick until it lifts
    hit(x, y) { if (!on) return false; const q = el.getBoundingClientRect(), m = 16; return x >= q.left - m && x <= q.right + m && y >= q.top - m && y <= q.bottom + m; },
    keys(x, y) { const q = el.getBoundingClientRect(); cx = q.left + q.width / 2; cy = q.top + q.height / 2;
      let dx = x - cx, dy = y - cy; const d = stickDir(dx, dy, mode()); const m = Math.hypot(dx, dy); if (m > TRAVEL) { dx *= TRAVEL / m; dy *= TRAVEL / m; }
      knob.style.transform = `translate(${dx}px,${dy}px)`; el.classList.toggle('on', !!(d.x || d.y)); return d; },
    release() { knob.style.transform = ''; el.classList.remove('on'); } };
  S.set(false); return S;
}
