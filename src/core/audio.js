// Original WebAudio chiptune SFX: square/triangle/noise blips generated at runtime. No samples.
let ac = null, muted = false; try { muted = localStorage.getItem('inuarcade.mute') === '1'; } catch {}
export const isMuted = () => muted;
export function setMuted(m) { muted = m; try { localStorage.setItem('inuarcade.mute', m ? '1' : '0'); } catch {} }
export function unlockAudio() { try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch {} }
function tone(f0, f1, dur, type = 'square', vol = 0.08, delay = 0) {
  if (!ac || muted) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.08, delay = 0, hp = 800) {
  if (!ac || muted) return; const t = ac.currentTime + delay, n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  let v = 0; for (let i = 0; i < n; i++) { if (i % 6 === 0) v = Math.random() * 2 - 1; d[i] = v * (1 - i / n); }
  const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.buffer = b; g.gain.value = vol; s.connect(f).connect(g).connect(ac.destination); s.start(t);
}
const seq = (notes, step, type = 'square', vol = 0.07) => notes.forEach((n, i) => n && tone(n, n, step * 0.9, type, vol, i * step));
export const SFX = {
  blip: () => tone(880, 1320, 0.05), select: () => seq([660, 990], 0.06), coin: () => seq([988, 1319], 0.07),
  chomp: (() => { let k = 0; return () => { k ^= 1; tone(k ? 300 : 420, k ? 420 : 300, 0.06, 'triangle', 0.1); }; })(),
  power: () => seq([262, 330, 392, 523, 659], 0.05, 'square'), eatGhost: () => tone(200, 1600, 0.25, 'square', 0.07),
  bark: () => { tone(520, 180, 0.09, 'square', 0.08); noise(0.05, 0.04); }, boom: () => { noise(0.35, 0.12, 0, 200); tone(140, 40, 0.3, 'triangle', 0.1); },
  hit: () => { noise(0.08, 0.07, 0, 1500); tone(400, 120, 0.08, 'square', 0.05); }, hop: () => tone(330, 660, 0.06, 'square', 0.06),
  splash: () => noise(0.4, 0.09, 0, 400), honk: () => seq([392, 0, 392], 0.08, 'sawtooth', 0.05), home: () => seq([523, 659, 784, 1047], 0.07),
  bounce: () => tone(600, 600, 0.03, 'square', 0.05), brick: () => tone(980, 700, 0.05, 'square', 0.06), pow: () => seq([784, 988, 1175, 1568], 0.05, 'triangle', 0.09),
  die: () => seq([523, 494, 466, 440, 415, 392, 370, 349], 0.07, 'square', 0.06), level: () => seq([523, 659, 784, 659, 784, 1047], 0.08),
  start: () => seq([392, 523, 659, 784, 0, 659, 784], 0.07), ticket: () => seq([1175, 1568, 2093], 0.05, 'triangle', 0.08),
};
export function sfx(name) { try { SFX[name]?.(); } catch {} }
