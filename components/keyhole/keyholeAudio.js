'use client';

/* =====================================================================
   DigiHome × Keyhole — filmmusikk (WebAudio, royaltyfri/egenkomponert)
   Varm, moderne cinematic-fintech: åpne pads, myk puls, sparsom arp og
   et lead-motiv. To følelsesmessige topper: «Godkjent» (kredittsjekk)
   og «Depositum sikret». Samme partitur live (AudioContext) og offline
   (WAV-render for MP4). Deterministisk.
===================================================================== */

const SEMI = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const freq = (name) => {
  const m = /^([A-G][b#]?)(\d)$/.exec(name);
  const midi = 12 * (parseInt(m[2], 10) + 1) + SEMI[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
};
const dr = (i, salt = 0) => {
  const x = Math.sin(i * 127.1 + salt * 311.7 + 13.37) * 43758.5453;
  return x - Math.floor(x);
};

export const KEYHOLE_DURATION = 53.5;

/* --- partitur (absolutte tider = film-scenene) --- */
const PADS = [
  { a: 0,    b: 8.0,  notes: ['C4', 'G4', 'D5'] },           // intro
  { a: 7.7,  b: 15.9, notes: ['F3', 'A3', 'C4', 'E4'] },     // annonse (F)
  { a: 15.7, b: 22.7, notes: ['G3', 'B3', 'D4', 'G4'] },     // søkere (G)
  { a: 22.6, b: 33.0, notes: ['A3', 'C4', 'E4', 'G4'] },     // screening Keyhole (Am7)
  { a: 32.9, b: 41.0, notes: ['F3', 'A3', 'C4', 'E4'] },     // kontrakt (F)
  { a: 40.8, b: 49.6, notes: ['C4', 'E4', 'G4', 'B4'] },     // depositum Keyhole (Cmaj7)
  { a: 49.4, b: 53.5, notes: ['C4', 'G4', 'D5', 'E5'] },     // outro (Cadd9)
];
const BASS = [
  { a: 0, b: 8.0, n: 'C2' }, { a: 7.7, b: 15.9, n: 'F2' }, { a: 15.7, b: 22.7, n: 'G2' },
  { a: 22.6, b: 33.0, n: 'A2' }, { a: 32.9, b: 41.0, n: 'F2' }, { a: 40.8, b: 49.6, n: 'C2' },
  { a: 49.4, b: 53.5, n: 'C2' },
];
const chordAt = (t) => {
  for (let i = PADS.length - 1; i >= 0; i--) if (t >= PADS[i].a) return PADS[i].notes;
  return PADS[0].notes;
};
const WHOOSHES = [7.7, 15.7, 22.2, 32.2, 40.2];
const CHIMES = [
  { t: 2.15, n: 'C6' }, { t: 29.55, n: 'C6' }, { t: 38.15, n: 'G5' },
  { t: 48.15, n: 'C6' }, { t: 50.0, n: 'E6' },
];
const LEAD = [
  { t: 3.6, n: 'E5', d: 1.6 }, { t: 5.2, n: 'G5', d: 1.8 },
  { t: 13.0, n: 'C5', d: 1.6 },
  { t: 29.6, n: 'C5', d: 0.9 }, { t: 30.05, n: 'E5', d: 0.9 }, { t: 30.5, n: 'G5', d: 1.9 },
  { t: 48.25, n: 'G5', d: 1.0 }, { t: 48.8, n: 'C6', d: 2.0 },
  { t: 50.6, n: 'E5', d: 1.2 }, { t: 51.5, n: 'G5', d: 1.4 }, { t: 52.1, n: 'C6', d: 2.6 },
];

/* --- generert romklang/støy --- */
function makeReverbIR(ctx, duration = 2.6, tau = 0.85) {
  const rate = ctx.sampleRate;
  const len = Math.ceil(rate * duration);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (dr(i % 19997, 3 + c * 7) * 2 - 1) * Math.exp(-i / (rate * tau));
  }
  return buf;
}
function makeNoiseBuffer(ctx, duration = 2) {
  const rate = ctx.sampleRate;
  const len = Math.ceil(rate * duration);
  const buf = ctx.createBuffer(1, len, rate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = dr(i % 14087, 5) * 2 - 1;
  return buf;
}

/* =====================================================================
   Hovedplanlegger — returnerer { stop }
===================================================================== */
export function scheduleKeyholeMusic(ctx, destination, fromT = 0) {
  const sources = [];
  const now = () => ctx.currentTime;

  const bus = ctx.createGain();
  bus.gain.value = 1;
  /* hale-fade inn mot slutten */
  const fadeA = 51.6, fadeB = KEYHOLE_DURATION;
  if (fadeB > fromT) {
    bus.gain.setValueAtTime(1, now() + Math.max(0, fadeA - fromT));
    bus.gain.linearRampToValueAtTime(0.0001, now() + Math.max(0.05, fadeB - fromT));
  }
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -22; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.02; comp.release.value = 0.3;
  const master = ctx.createGain();
  master.gain.value = 0.85;
  const shelfLo = ctx.createBiquadFilter(); shelfLo.type = 'lowshelf'; shelfLo.frequency.value = 130; shelfLo.gain.value = 1.8;
  const shelfHi = ctx.createBiquadFilter(); shelfHi.type = 'highshelf'; shelfHi.frequency.value = 8200; shelfHi.gain.value = 2.2;
  bus.connect(shelfLo).connect(shelfHi).connect(comp).connect(master).connect(destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = makeReverbIR(ctx);
  const revReturn = ctx.createGain(); revReturn.gain.value = 0.5;
  reverb.connect(revReturn).connect(bus);
  const send = (node, amt) => { const g = ctx.createGain(); g.gain.value = amt; node.connect(g).connect(reverb); };

  const noiseBuf = makeNoiseBuffer(ctx);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 190;
  lfo.connect(lfoGain); lfo.start(now()); sources.push(lfo);

  const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.45;
  const fb = ctx.createGain(); fb.gain.value = 0.3;
  const wet = ctx.createGain(); wet.gain.value = 0.16;
  delay.connect(fb).connect(delay); delay.connect(wet).connect(bus);

  /* --- pads (stereo-detunede sager m/ lavpass-LFO) --- */
  function padNote(f, a, b, vol = 0.046) {
    if (b <= fromT) return;
    const when = now() + Math.max(0, a - fromT);
    const offset = Math.max(0, fromT - a);
    const dur = b - Math.max(a, fromT);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 820; lp.Q.value = 0.5;
    lfoGain.connect(lp.frequency);
    g.connect(lp).connect(bus); send(g, 0.22);
    const attack = 2.2, release = 2.6;
    g.gain.setValueAtTime(offset > attack ? vol : (vol * offset) / attack, when);
    if (offset < attack) g.gain.linearRampToValueAtTime(vol, when + (attack - offset));
    const relStart = Math.max(when, when + dur - release);
    g.gain.setValueAtTime(vol, relStart);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    for (const [det, pan] of [[-6, -0.4], [6, 0.4]]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) { p.pan.value = pan; o.connect(p).connect(g); } else { o.connect(g); }
      o.start(when); o.stop(when + dur + 0.1); sources.push(o);
    }
  }
  function bassNote(f, a, b, vol = 0.1) {
    if (b <= fromT) return;
    const when = now() + Math.max(0, a - fromT);
    const offset = Math.max(0, fromT - a);
    const dur = b - Math.max(a, fromT);
    const g = ctx.createGain(); g.connect(bus);
    const attack = 1.4, release = 2.2;
    g.gain.setValueAtTime(offset > attack ? vol : (vol * offset) / attack, when);
    if (offset < attack) g.gain.linearRampToValueAtTime(vol, when + (attack - offset));
    const relStart = Math.max(when, when + dur - release);
    g.gain.setValueAtTime(vol, relStart);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    for (const [mult, v] of [[1, 1], [2, 0.28]]) {
      const og = ctx.createGain(); og.gain.value = v; og.connect(g);
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mult; o.connect(og);
      o.start(when); o.stop(when + dur + 0.1); sources.push(o);
    }
  }
  function kick(at, vol = 0.05) {
    if (at < fromT) return;
    const when = now() + (at - fromT);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 110;
    g.connect(lp).connect(bus);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.08);          // myk attack — ingen klikk
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.95);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(56, when); o.frequency.exponentialRampToValueAtTime(40, when + 0.32);
    o.connect(g); o.start(when); o.stop(when + 1.0); sources.push(o);
  }
  function pluck(f, at, k) {
    if (at < fromT) return;
    const when = now() + (at - fromT);
    const g = ctx.createGain(); g.connect(bus); g.connect(delay); send(g, 0.6);
    const v = 0.02 + 0.008 * dr(k, 23);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(v, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.6);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(g);
    o.start(when); o.stop(when + 0.65); sources.push(o);
  }
  function chime(f, at, vol = 0.04) {
    if (at < fromT - 0.2) return;
    const when = now() + Math.max(0, at - fromT);
    for (const [mult, v, dec] of [[1, vol, 1.7], [2.94, vol * 0.22, 1.0]]) {
      const g = ctx.createGain(); g.connect(bus); send(g, 0.85);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(v, when + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dec);
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mult; o.connect(g);
      o.start(when); o.stop(when + dec + 0.1); sources.push(o);
    }
  }
  function lead(f, a, d) {
    if (a + d < fromT) return;
    const when = now() + Math.max(0, a - fromT);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    g.connect(lp).connect(bus); send(g, 0.65);
    const vol = 0.054;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.28);
    g.gain.setValueAtTime(vol, when + Math.max(0.28, d - 0.9));
    g.gain.linearRampToValueAtTime(0.0001, when + d);
    const vib = ctx.createOscillator(); vib.frequency.value = 4.6;
    const vibG = ctx.createGain(); vibG.gain.setValueAtTime(0, when); vibG.gain.linearRampToValueAtTime(5.5, when + 0.6);
    vib.connect(vibG); vib.start(when); vib.stop(when + d + 0.1); sources.push(vib);
    for (const [type, v] of [['sine', 1], ['triangle', 0.45]]) {
      const og = ctx.createGain(); og.gain.value = v; og.connect(g);
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      vibG.connect(o.detune); o.connect(og); o.start(when); o.stop(when + d + 0.1); sources.push(o);
    }
  }
  function whoosh(center, vol = 0.04, f0 = 320, f1 = 2600, dur = 1.2) {
    const a = center - dur / 2;
    if (a + dur < fromT) return;
    const when = now() + Math.max(0, a - fromT);
    const offset = Math.max(0, fromT - a);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(f0, when); bp.frequency.exponentialRampToValueAtTime(f1, when + dur - offset);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + Math.max(0.05, dur / 2 - offset));
    g.gain.linearRampToValueAtTime(0.0001, when + dur - offset);
    src.connect(bp).connect(g).connect(bus); send(g, 0.3);
    src.start(when); src.stop(when + dur - offset + 0.05); sources.push(src);
  }
  function key(f, at, vol = 0.044) {
    if (at < fromT - 0.1) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900;
    g.connect(lp).connect(bus); send(g, 0.7);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 2.4);
    for (const [type, v] of [['triangle', 1], ['sine', 0.6]]) {
      const og = ctx.createGain(); og.gain.value = v; og.connect(g);
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(og);
      o.start(when); o.stop(when + 2.5); sources.push(o);
    }
  }
  function subSwell(at, dur = 0.6, vol = 0.06) {
    if (at < fromT - 0.05) return;
    const a = at - dur;
    const when = now() + Math.max(0, a - fromT);
    const end = now() + Math.max(0.02, at - fromT);
    const g = ctx.createGain(); g.connect(bus);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + 0.12);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(46, when); o.frequency.linearRampToValueAtTime(60, end);
    o.connect(g); o.start(when); o.stop(end + 0.2); sources.push(o);
  }
  function boom(at, vol = 0.07) {
    if (at < fromT - 0.1) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.9);
    g.connect(bus); send(g, 0.5);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(95, when); o.frequency.exponentialRampToValueAtTime(38, when + 0.35);
    o.connect(g); o.start(when); o.stop(when + 1.0); sources.push(o);
  }
  function thump(at, vol = 0.075) {
    if (at < fromT - 0.1) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    g.connect(lp).connect(bus); send(g, 0.4);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.7);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, when); o.frequency.exponentialRampToValueAtTime(45, when + 0.25);
    o.connect(g); o.start(when); o.stop(when + 0.75); sources.push(o);
  }
  function ping(at, f = 740) {
    if (at < fromT - 0.1) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.024, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.6);
    g.connect(bus); g.connect(delay); send(g, 0.85);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g);
    o.start(when); o.stop(when + 0.65); sources.push(o);
  }
  function chirp(at, f0, f1, vol = 0.011) {
    if (at < fromT - 0.05) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
    g.connect(bus); send(g, 0.3);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, when); o.frequency.exponentialRampToValueAtTime(f1, when + 0.08);
    o.connect(g); o.start(when); o.stop(when + 0.12); sources.push(o);
  }
  function tick(at, f = 880) {
    if (at < fromT - 0.1) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.016, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
    g.connect(bus); send(g, 0.35);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f, when); o.frequency.exponentialRampToValueAtTime(f * 1.18, when + 0.05);
    o.connect(g); o.start(when); o.stop(when + 0.13); sources.push(o);
  }
  function scribble(a, b) {
    let k = 0;
    for (let at = a; at < b; at += 0.085, k++) {
      if (at < fromT - 0.05 || dr(k, 31) < 0.25) continue;
      const when = now() + Math.max(0, at - fromT);
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 + dr(k, 32) * 900; bp.Q.value = 1.6;
      const g = ctx.createGain(); const v = 0.006 + 0.009 * dr(k, 33);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(v, when + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
      src.connect(bp).connect(g).connect(bus);
      src.start(when, dr(k, 34) * 1.5, 0.09); sources.push(src);
    }
  }
  function hat(at, vol = 0.01) {
    if (at < fromT - 0.05) return;
    const when = now() + Math.max(0, at - fromT);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
    src.connect(hp).connect(g).connect(bus);
    src.start(when, dr(Math.floor(at * 10), 51) * 1.2, 0.09); sources.push(src);
  }
  function airPad(f, a, b, vol = 0.016) {
    if (b <= fromT) return;
    const when = now() + Math.max(0, a - fromT);
    const dur = b - Math.max(a, fromT);
    const g = ctx.createGain(); g.connect(bus); send(g, 0.8);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 1.6);
    g.gain.setValueAtTime(vol, when + Math.max(1.6, dur - 1.4));
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g);
    o.start(when); o.stop(when + dur + 0.1); sources.push(o);
  }

  /* ====== planlegg partituret ====== */
  for (const s of PADS) for (const n of s.notes) padNote(freq(n), s.a, s.b);
  for (const s of BASS) bassNote(freq(s.n), s.a, s.b);

  /* varm, rolig puls (myk attack — ingen klikk), kun på hovedtaktene */
  for (let at = 8.0; at <= 48.8; at += 2.4) kick(at);
  /* musikalsk arp — bløt og sparsom */
  let k = 0;
  for (let at = 12.0; at <= 48.6; at += 1.2, k++) {
    if (dr(k, 11) < 0.5) continue;
    const tones = chordAt(at);
    const pick = tones[Math.floor(dr(k, 12) * tones.length)];
    pluck(freq(pick), at, k);
  }

  for (const w of WHOOSHES) whoosh(w, 0.032);
  for (const c of CHIMES) chime(freq(c.n), c.t);
  for (const l of LEAD) lead(freq(l.n), l.t, l.d);

  /* myke intro-tangenter */
  key(freq('Eb5'), 0.8); key(freq('C5'), 2.2); key(freq('G4'), 4.0);

  /* SFX i synk med bildet — myke og musikalske (ingen klikk/beep) */
  thump(12.3);                                   // FINN publisert (myk sub)
  /* søkere lander: mild stigende arp (G–B–D–G) i stedet for klikk */
  pluck(freq('G4'), 17.3, 201); pluck(freq('B4'), 17.8, 202); pluck(freq('D5'), 18.3, 203); pluck(freq('G5'), 18.8, 204);
  /* screening → Godkjent (topp 1): myk chime + varm swell */
  chime(freq('E5'), 26.9, 0.03);
  subSwell(29.55, 0.8, 0.075); boom(29.55, 0.05); chime(freq('C6'), 29.6, 0.042);
  /* kontrakt: signering (myk swell) */
  subSwell(38.15, 0.6, 0.05);
  /* depositum: tidslinje fylles → sikret (topp 2): stigende arp C–E–G–C */
  pluck(freq('C5'), 44.0, 211); pluck(freq('E5'), 44.9, 212); pluck(freq('G5'), 45.8, 213); pluck(freq('C6'), 46.7, 214);
  subSwell(48.15, 0.9, 0.08); boom(48.15, 0.055);
  /* outro */
  whoosh(49.4, 0.04, 500, 5200, 1.4); boom(49.8, 0.05);
  airPad(freq('C6'), 49.6, 53.5, 0.014); airPad(freq('G5'), 50.2, 53.5, 0.012);

  return {
    stop() {
      for (const s of sources) { try { s.stop(); } catch (e) { /* ok */ } try { s.disconnect(); } catch (e) { /* ok */ } }
      try { bus.disconnect(); } catch (e) { /* ok */ }
    },
  };
}

/* --- offline render til WAV (for MP4) --- */
export async function renderKeyholeWav(duration = KEYHOLE_DURATION) {
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
  scheduleKeyholeMusic(ctx, ctx.destination, 0);
  const buf = await ctx.startRendering();
  return audioBufferToWavBase64(buf);
}

function audioBufferToWavBase64(buffer) {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length * numCh * 2;
  const ab = new ArrayBuffer(44 + len);
  const view = new DataView(ab);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + len, true); writeStr(8, 'WAVE'); writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numCh, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true); view.setUint16(34, 16, true);
  writeStr(36, 'data'); view.setUint32(40, len, true);
  const chans = [];
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  const bytes = new Uint8Array(ab);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}
