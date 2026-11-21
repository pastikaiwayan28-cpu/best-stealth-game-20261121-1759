// All sound is synthesized with WebAudio: no audio files, no network.
// The context is created on the first user gesture (autoplay policy).
let audioCtx = null;
let masterGain = null;
let muted = false;
let padNodes = null;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  audioCtx = new Ctor();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = muted ? 0 : 0.5;
  masterGain.connect(audioCtx.destination);
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!audioCtx || !masterGain) return;
  const t0 = audioCtx.currentTime + when;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, lowFreq) {
  if (!audioCtx || !masterGain) return;
  const len = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
  const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowFreq;
  const gain = audioCtx.createGain();
  gain.gain.value = vol;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  src.start();
}

// Soft cloth step, alternate pitch so walking has a rhythm.
export function playFootstep(sneaking, alternate) {
  if (sneaking) noiseBurst(0.05, 0.05, 500);
  else noiseBurst(0.07, 0.13, 900);
  tone(sneaking ? 90 : 120 + (alternate ? 18 : 0), 0.06, 'sine', 0.05);
}

// A guard grows suspicious: a short rising tick.
export function playSuspicionTick(level) {
  tone(420 + level * 3.2, 0.12, 'triangle', 0.10);
}

// The alarm: two dissonant brass-like stabs.
export function playAlarm() {
  tone(196, 0.5, 'sawtooth', 0.16, 0, 185);
  tone(207, 0.5, 'sawtooth', 0.12, 0.02, 196);
  tone(392, 0.35, 'square', 0.06, 0.05);
}

// Pebble skitter on stone.
export function playPebble() {
  noiseBurst(0.09, 0.16, 2400);
  tone(980, 0.05, 'square', 0.05, 0.03);
}

// Shard picked up: warm two-note chime.
export function playPickup() {
  tone(660, 0.18, 'sine', 0.16);
  tone(990, 0.3, 'sine', 0.14, 0.09);
}

// Level cleared: a small rising arpeggio.
export function playLevelClear() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.09));
}

// Caught: a low falling thud.
export function playCaught() {
  tone(220, 0.7, 'sawtooth', 0.18, 0, 55);
  noiseBurst(0.25, 0.2, 300);
}

// Full victory: a slow lantern waltz of chimes.
export function playVictory() {
  [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, 'sine', 0.12, i * 0.16));
}

// A quiet two-note night pad, started once and left running low.
export function startAmbientPad() {
  if (!audioCtx || !masterGain || padNodes) return;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.045;
  gain.connect(masterGain);
  const oscs = [55, 82.5, 110].map((freq, i) => {
    const osc = audioCtx.createOscillator();
    osc.type = i === 2 ? 'triangle' : 'sine';
    osc.frequency.value = freq;
    osc.detune.value = i === 1 ? 4 : 0;
    osc.connect(gain);
    osc.start();
    return osc;
  });
  const lfo = audioCtx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0.02;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();
  padNodes = { oscs, lfo, gain };
}
