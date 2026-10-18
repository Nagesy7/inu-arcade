// Original WebAudio chiptune SFX: square/triangle/noise blips generated at runtime. No samples.
let ac = null, master = null, muted = false; try { muted = localStorage.getItem('inuarcade.mute') === '1'; } catch {}
export const isMuted = () => muted;
export function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 1; try { localStorage.setItem('inuarcade.mute', m ? '1' : '0'); } catch {} }
export function unlockAudio() { try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  if (!ac) { ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    const b = ac.createBuffer(1, 1, 22050), src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination); src.start(0); } // iOS: silent blip inside the gesture
  if (ac.state !== 'running') ac.resume?.(); } catch {} }
export const audioState = () => (ac ? ac.state : 'none');
function tone(f0, f1, dur, type = 'square', vol = 0.08, delay = 0) {
  if (!ac || muted) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g).connect(route || master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.08, delay = 0, hp = 800) {
  if (!ac || muted) return; const t = ac.currentTime + delay, n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  let v = 0; for (let i = 0; i < n; i++) { if (i % 6 === 0) v = Math.random() * 2 - 1; d[i] = v * (1 - i / n); }
  const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.buffer = b; g.gain.value = vol; s.connect(f).connect(g).connect(route || master); s.start(t);
}
const seq = (notes, step, type = 'square', vol = 0.07) => notes.forEach((n, i) => n && tone(n, n, step * 0.9, type, vol, i * step));
export const SFX = {
  blip: () => tone(880, 1320, 0.05), select: () => seq([660, 990], 0.06), coin: () => seq([988, 1319], 0.07),
  chomp: (() => { let k = 0; return () => { k = (k + 1) % 3; noise(0.025, 0.05, 0, 2500 + k * 900); tone(700 + k * 120, 650 + k * 120, 0.025, 'square', 0.04); }; })(), /* kibble crunch */
  power: () => seq([262, 330, 392, 523, 659], 0.05, 'square'), eatCat: () => tone(200, 1600, 0.25, 'square', 0.07),
  bark: () => { tone(520, 180, 0.09, 'square', 0.08); noise(0.05, 0.04); }, boom: () => { noise(0.35, 0.12, 0, 200); tone(140, 40, 0.3, 'triangle', 0.1); },
  hit: () => { noise(0.08, 0.07, 0, 1500); tone(400, 120, 0.08, 'square', 0.05); }, hop: () => tone(330, 660, 0.06, 'square', 0.06),
  splash: () => noise(0.4, 0.09, 0, 400), honk: () => seq([392, 0, 392], 0.08, 'sawtooth', 0.05), home: () => seq([523, 659, 784, 1047], 0.07),
  bounce: () => tone(600, 600, 0.03, 'square', 0.05), brick: () => tone(980, 700, 0.05, 'square', 0.06), pow: () => seq([784, 988, 1175, 1568], 0.05, 'triangle', 0.09),
  die: () => seq([523, 494, 466, 440, 415, 392, 370, 349], 0.07, 'square', 0.06), level: () => seq([523, 659, 784, 659, 784, 1047], 0.08),
  start: () => seq([392, 523, 659, 784, 0, 659, 784], 0.07), ticket: () => seq([1175, 1568, 2093], 0.05, 'triangle', 0.08),
};
// one-shot limiter: per-SFX cooldown + max concurrent voices (chomp/march/bounce can fire every frame and used to stack into noise)
const CD = { pump: 0.06, pop: 0.08, bone: 0.08, wobble: 0.25, thud: 0.15, hurry: 1, jab: 0.05, kick: 0.06, ko: 0.08, ouch: 0.15, tell: 0.12, open: 0.3, boss: 0.5, squeak: 0.1, dash: 0.15, hide: 0.1, honk: 0.12, splash: 0.15, chomp: 0.06, march: 0.08, bounce: 0.04, brick: 0.035, hit: 0.05, blip: 0.03, yip: 0.06, bigbark: 0.2, howl: 0.5, whirr: 0.1, catch: 0.08, sniff: 0.4, ping: 0.12, zoom: 0.4, wag: 0.06, boing: 0.06, kib: 0.045, rescue: 0.3, bell: 0.3, cart: 0.3, swim: 0.1, gust: 0.4, spit: 0.08, tink: 0.06, stomp: 0.05, warnbark: 0.4, rumble: 0.25 }, lastAt = {}; let ends = [];
export const MAX_VOICES = 10;
export function gate(name, now, cd = CD[name] ?? 0.04, dur = 0.25) { ends = ends.filter((t) => t > now); if (ends.length >= MAX_VOICES || now - (lastAt[name] ?? -1e9) < cd) return false; lastAt[name] = now; ends.push(now + dur); return true; }
export function sfx(name) { try { if (ac && !muted && gate(name, ac.currentTime)) SFX[name]?.(); } catch {} }
if (typeof document !== 'undefined') { document.addEventListener('visibilitychange', () => { if (ac && document.hidden) ac.suspend?.(); }); addEventListener('pagehide', () => ac?.suspend?.()); } // resume happens via unlockAudio on visible
SFX.squeak = () => { tone(1400, 2100, 0.05, 'square', 0.05); tone(2100, 1500, 0.06, 'square', 0.04); }; /* rubber toy */
SFX.dash = () => { tone(180, 520, 0.18, 'sawtooth', 0.06); noise(0.12, 0.04, 0.02, 1800); }; /* scooter rev */
SFX.hide = () => { noise(0.06, 0.06, 0, 900); tone(240, 160, 0.07, 'triangle', 0.07); }; /* bin lid clunk */
SFX.jab = () => { noise(0.03, 0.05, 0, 3000); tone(520, 300, 0.04, 'square', 0.04); }; /* paw jab swish */
SFX.kick = () => { noise(0.06, 0.06, 0, 1600); tone(300, 140, 0.07, 'triangle', 0.08); }; /* hind kick whump */
SFX.ko = () => seq([660, 880, 1320], 0.05, 'square', 0.05); SFX.ouch = () => { tone(500, 200, 0.12, 'sawtooth', 0.06); noise(0.06, 0.05, 0, 900); };
SFX.tell = () => tone(1800, 1800, 0.03, 'square', 0.035); /* enemy wind-up tick */ SFX.open = () => seq([392, 523, 784], 0.06, 'triangle', 0.08);
SFX.boss = () => { seq([196, 0, 196, 233, 262], 0.09, 'sawtooth', 0.06); noise(0.2, 0.05, 0.1, 300); };
SFX.pump = (() => { let k = 0; return () => { k = (k + 1) % 4; tone(330 + k * 110, 520 + k * 140, 0.06, 'triangle', 0.06); }; })(); /* bark-pump fluff, rising per hit */
SFX.pop = () => { noise(0.08, 0.07, 0, 2200); seq([1047, 1568, 2093], 0.04, 'square', 0.05); }; SFX.bone = () => seq([784, 988, 1175], 0.05, 'triangle', 0.07);
SFX.wobble = () => { tone(140, 120, 0.05, 'square', 0.05); tone(170, 150, 0.05, 'square', 0.04); }; SFX.thud = () => { noise(0.18, 0.09, 0, 400); tone(90, 50, 0.16, 'sine', 0.1); };
SFX.hurry = () => seq([880, 0, 880, 0, 880], 0.06, 'square', 0.05);
SFX.mega = () => { tone(110, 880, 0.35, 'sawtooth', 0.09); noise(0.3, 0.1, 0.05, 300); };
// ---- dynamic chiptune: original 4-bar loop in A minor; intensity 0..3 adds layers and tempo ----
const BASS = [45, 45, 52, 45, 48, 48, 55, 48, 43, 43, 50, 43, 40, 40, 47, 52], ARP = [[57, 60, 64], [60, 64, 67], [55, 59, 62], [52, 56, 59]];
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
let mus = null, route = null; // route: music notes go to the current track's bus
export function setMusic(on, intensity = 0, track = 'arcade') {
  if (!on) { if (mus) { clearInterval(mus.id); mus.bus?.gain.setTargetAtTime(0, ac.currentTime, 0.02); mus = null; } return; } // stop: also silence the notes already queued ahead
  if (mus && mus.track !== track) setMusic(false);
  if (!mus) { mus = { step: 0, next: 0, intensity, track, id: null, bus: ac ? ac.createGain() : null }; if (mus.bus) mus.bus.connect(master); mus.id = setInterval(tick, 25); }
  mus.intensity = Math.max(0, Math.min(3, intensity));
}
function tick() {
  if (!ac || muted || !mus) return; const bpm = 118 + mus.intensity * 12, sp = 60 / bpm / 2; if (mus.next < ac.currentTime) mus.next = ac.currentTime + 0.05;
  if (!mus.bus) { mus.bus = ac.createGain(); mus.bus.connect(master); } route = mus.bus;
  if (mus.track === 'pip') return pipTick();
  while (mus.next < ac.currentTime + 0.12) { const i = mus.step % 16, bar = Math.floor(mus.step / 16) % 4, d = mus.next - ac.currentTime, I = mus.intensity;
    tone(mtof(BASS[i] - 12 + (bar === 3 ? 2 : 0)), mtof(BASS[i] - 12 + (bar === 3 ? 2 : 0)), sp * 0.8, 'triangle', 0.07, d);
    if (I >= 1 && i % 2 === 0) { const ch = ARP[bar]; tone(mtof(ch[(i / 2) % 3] + 12), mtof(ch[(i / 2) % 3] + 12), sp * 0.5, 'square', 0.025, d); }
    if (I >= 2) noise(0.03, i % 4 === 2 ? 0.05 : 0.02, d, i % 4 === 2 ? 1200 : 6000);
    if (I >= 3 && i % 4 === 0) tone(mtof(ARP[bar][0] + 24), mtof(ARP[bar][2] + 24), sp * 1.5, 'square', 0.02, d);
    mus.step++; mus.next += sp; }
  route = null;
}
SFX.march = (() => { let k = 0; const N = [131, 165, 147]; return () => { tone(N[k], N[k] * 1.05, 0.06, 'triangle', 0.08); noise(0.03, 0.03, 0, 300); k = (k + 1) % 3; }; })(); /* rising paw-thump */

// Pip's Big Bark: original bouncy D-major chiptune (two-bar lead phrases over a walking bass; more layers as intensity rises)
const PIP_BASS = [38, 50, 45, 50, 43, 55, 45, 57, 35, 47, 42, 47, 40, 52, 45, 49];
const PIP_LEAD = [[74, 0, 78, 81, 0, 78, 76, 74, 76, 0, 74, 71, 0, 69, 71, 0], [74, 0, 78, 81, 83, 81, 78, 0, 79, 78, 76, 0, 74, 0, 0, 0], [71, 0, 74, 78, 0, 76, 74, 71, 73, 0, 76, 79, 0, 78, 76, 0], [74, 76, 78, 0, 81, 0, 78, 76, 74, 0, 69, 0, 74, 0, 0, 0]];
function pipTick() { const bpm = 132 + mus.intensity * 8, sp = 60 / bpm / 2; if (mus.next < ac.currentTime) mus.next = ac.currentTime + 0.05;
  while (mus.next < ac.currentTime + 0.12) { const i = mus.step % 16, bar = Math.floor(mus.step / 16) % 4, d = mus.next - ac.currentTime, I = mus.intensity, b = PIP_BASS[(i >> 1) + (bar % 2) * 8] - 12;
    if (i % 2 === 0) tone(mtof(b), mtof(b), sp * 0.9, 'triangle', 0.08, d);
    const n = PIP_LEAD[bar][i]; if (n) tone(mtof(n), mtof(n), sp * 0.7, 'square', 0.022, d);
    if (I >= 1 && n && i % 4 === 0) tone(mtof(n - 12), mtof(n - 12), sp * 0.4, 'square', 0.014, d);
    if (I >= 1) noise(0.02, i % 4 === 2 ? 0.045 : 0.015, d, i % 4 === 2 ? 1500 : 7000);
    if (I >= 2 && i % 8 === 4) tone(mtof(n ? n + 7 : 81), mtof(n ? n + 7 : 81), sp * 0.3, 'square', 0.012, d);
    mus.step++; mus.next += sp; }
  route = null; }
SFX.yip = (() => { let k = 0; return () => { k = (k + 1) % 2; tone(900 + k * 80, 620, 0.05, 'square', 0.06); }; })(); /* short pup yip */
SFX.bigbark = () => { tone(420, 140, 0.18, 'sawtooth', 0.09); noise(0.12, 0.06, 0, 700); };
SFX.howl = () => { tone(300, 620, 0.3, 'triangle', 0.09); tone(620, 480, 0.35, 'triangle', 0.07, 0.28); noise(0.2, 0.04, 0, 1200); };
SFX.whirr = () => { tone(500, 900, 0.08, 'triangle', 0.05); tone(900, 500, 0.08, 'triangle', 0.04, 0.08); }; SFX.catch = () => seq([660, 990], 0.04, 'triangle', 0.06);
SFX.sniff = () => { noise(0.05, 0.05, 0, 3000); noise(0.05, 0.05, 0.09, 3000); noise(0.05, 0.05, 0.18, 3000); }; SFX.ping = () => seq([1319, 1760], 0.06, 'triangle', 0.06);
SFX.zoom = () => { tone(300, 1400, 0.25, 'square', 0.06); seq([784, 988, 1319], 0.04, 'triangle', 0.05); }; SFX.wag = () => tone(500, 900, 0.07, 'triangle', 0.06);
SFX.boing = () => { tone(260, 700, 0.1, 'triangle', 0.08); }; SFX.kib = (() => { let k = 0; return () => { k = (k + 1) % 4; tone(1200 + k * 90, 1500 + k * 90, 0.03, 'square', 0.035); }; })();
SFX.rescue = () => seq([523, 659, 784, 1047, 784, 1047], 0.06, 'triangle', 0.08); SFX.bell = () => { tone(1568, 1560, 0.4, 'triangle', 0.06); tone(2093, 2090, 0.3, 'sine', 0.04); };
SFX.cart = () => { tone(150, 260, 0.2, 'sawtooth', 0.05); noise(0.15, 0.04, 0, 900); }; SFX.swim = () => noise(0.08, 0.05, 0, 1800);
SFX.gust = () => noise(0.5, 0.05, 0, 500); SFX.spit = () => tone(700, 300, 0.07, 'square', 0.05); SFX.tink = () => tone(2400, 2300, 0.04, 'square', 0.04);
SFX.stomp = (() => { let k = 0; return () => { k = Math.min(5, k + 1); setTimeout(() => (k = 0), 900); tone(300 + k * 120, 600 + k * 160, 0.07, 'square', 0.07); }; })();
SFX.warnbark = () => { tone(700, 400, 0.06, 'square', 0.06); tone(700, 400, 0.06, 'square', 0.06, 0.1); }; SFX.rumble = () => { noise(0.25, 0.06, 0, 120); tone(70, 50, 0.25, 'sine', 0.08); };
