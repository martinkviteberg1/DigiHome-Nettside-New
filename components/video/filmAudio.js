'use client';

/* =====================================================================
   DigiHome — filmmusikk v2 (WebAudio)
   Moderne ambient/elektronisk underlag: pads med stereobredde og
   filterbevegelse, generert romklang, myk puls, hi-hats, sparsomt
   lead-motiv og riser inn mot finalen. Samme partitur brukes live
   (AudioContext) og offline (WAV-render for MP4).
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

export const FILM_DURATION = 72;

/* --- partitur --- */
const PAD_SECTIONS = [
  { a: 0,    b: 14.5, notes: ['C4', 'G4', 'D5'] },
  { a: 14,   b: 26.5, notes: ['Ab3', 'C4', 'Eb4', 'G4'] },
  { a: 26,   b: 38.5, notes: ['Eb3', 'G3', 'Bb3', 'D4'] },
  { a: 38,   b: 49,   notes: ['Bb3', 'D4', 'F4', 'C5'] },
  { a: 48.5, b: 59.5, notes: ['F3', 'Ab3', 'C4', 'Eb4'] },
  { a: 59,   b: 64,   notes: ['Ab3', 'C4', 'Eb4', 'C5'] },
  { a: 63.5, b: 68,   notes: ['Bb3', 'D4', 'F4', 'D5'] },
  { a: 67.5, b: 72,   notes: ['C4', 'G4', 'D5', 'Eb5'] },
];
const BASS_SECTIONS = [
  { a: 0, b: 14.5, n: 'C2' }, { a: 14, b: 26.5, n: 'Ab2' }, { a: 26, b: 38.5, n: 'Eb2' },
  { a: 38, b: 49, n: 'Bb2' }, { a: 48.5, b: 59.5, n: 'F2' }, { a: 59, b: 64, n: 'Ab2' },
  { a: 63.5, b: 68, n: 'Bb2' }, { a: 67.5, b: 72, n: 'C2' },
];
const WHOOSHES = [8, 14, 26, 38, 48.5, 59];
const CHIMES = [
  { t: 23.2, n: 'Eb5' }, { t: 36.5, n: 'G5' }, { t: 42.1, n: 'F5' },
  { t: 47.1, n: 'C6' }, { t: 53.0, n: 'Ab5' }, { t: 68.2, n: 'G5' },
];
const LEAD = [
  { t: 16.2, n: 'G4', d: 1.6 }, { t: 18.0, n: 'Bb4', d: 1.4 }, { t: 19.6, n: 'C5', d: 2.2 },
  { t: 28.2, n: 'Eb5', d: 1.6 }, { t: 30.0, n: 'D5', d: 2.0 },
  { t: 40.2, n: 'F4', d: 1.4 }, { t: 41.8, n: 'G4', d: 2.2 },
  { t: 50.8, n: 'C5', d: 1.6 }, { t: 52.8, n: 'Bb4', d: 2.0 },
  { t: 60.6, n: 'Eb5', d: 1.8 }, { t: 62.4, n: 'F5', d: 2.0 },
  { t: 68.4, n: 'G5', d: 3.0 },
];
const PULSE = { from: 10.8, to: 58.8, step: 1.2, vol: 0.06 };
const ARP = { from: 14.6, to: 58.8, step: 0.6 };

const chordAt = (t) => {
  for (let i = PAD_SECTIONS.length - 1; i >= 0; i--) {
    if (t >= PAD_SECTIONS[i].a) return PAD_SECTIONS[i].notes;
  }
  return PAD_SECTIONS[0].notes;
};

/* --- romklang-impuls (generert) --- */
function makeReverbIR(ctx, duration = 2.6, tau = 0.85) {
  const rate = ctx.sampleRate;
  const len = Math.ceil(rate * duration);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (dr(i % 19997, 3 + c * 7) * 2 - 1) * Math.exp(-i / (rate * tau));
    }
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
export function scheduleMusic(ctx, destination, fromT = 0) {
  const sources = [];
  const now = () => ctx.currentTime;

  /* busser */
  const bus = ctx.createGain();
  bus.gain.value = 1;
  if (FILM_DURATION > fromT) {
    const fadeStart = now() + Math.max(0, 70.8 - fromT);
    const fadeEnd = now() + Math.max(0, FILM_DURATION - fromT);
    bus.gain.setValueAtTime(1, fadeStart);
    bus.gain.linearRampToValueAtTime(0.0001, fadeEnd);
  }
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.knee.value = 12;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.02;
  comp.release.value = 0.3;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  /* master-EQ: varme i bunn + «air» i toppen (produksjonsglans) */
  const shelfLo = ctx.createBiquadFilter();
  shelfLo.type = 'lowshelf';
  shelfLo.frequency.value = 130;
  shelfLo.gain.value = 1.8;
  const shelfHi = ctx.createBiquadFilter();
  shelfHi.type = 'highshelf';
  shelfHi.frequency.value = 8200;
  shelfHi.gain.value = 2.4;
  bus.connect(shelfLo).connect(shelfHi).connect(comp).connect(master).connect(destination);

  /* romklang */
  const reverb = ctx.createConvolver();
  reverb.buffer = makeReverbIR(ctx);
  const revReturn = ctx.createGain();
  revReturn.gain.value = 0.55;
  reverb.connect(revReturn).connect(bus);
  const send = (node, amt) => {
    const g = ctx.createGain();
    g.gain.value = amt;
    node.connect(g).connect(reverb);
  };

  /* delt støybuffer + global filter-LFO */
  const noiseBuf = makeNoiseBuffer(ctx);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 190;
  lfo.connect(lfoGain);
  lfo.start(now());
  sources.push(lfo);

  /* delay for plukk */
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.45;
  const fb = ctx.createGain();
  fb.gain.value = 0.3;
  const wet = ctx.createGain();
  wet.gain.value = 0.18;
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(bus);

  /* --- pads: stereo-detunede sager gjennom lavpass med LFO --- */
  function padNote(f, a, b, vol = 0.038) {
    if (b <= fromT) return;
    const when = now() + Math.max(0, a - fromT);
    const offset = Math.max(0, fromT - a);
    const dur = b - Math.max(a, fromT);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 820;
    lp.Q.value = 0.5;
    lfoGain.connect(lp.frequency);
    g.connect(lp).connect(bus);
    send(g, 0.22);
    const attack = 2.2, release = 2.6;
    g.gain.setValueAtTime(offset > attack ? vol : (vol * offset) / attack, when);
    if (offset < attack) g.gain.linearRampToValueAtTime(vol, when + (attack - offset));
    const relStart = Math.max(when, when + dur - release);
    g.gain.setValueAtTime(vol, relStart);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    for (const [det, pan] of [[-6, -0.4], [6, 0.4]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) {
        p.pan.value = pan;
        o.connect(p).connect(g);
      } else {
        o.connect(g);
      }
      o.start(when);
      o.stop(when + dur + 0.1);
      sources.push(o);
    }
  }

  /* --- bass: sinus + svak oktav --- */
  function bassNote(f, a, b, vol = 0.1) {
    if (b <= fromT) return;
    const when = now() + Math.max(0, a - fromT);
    const offset = Math.max(0, fromT - a);
    const dur = b - Math.max(a, fromT);
    const g = ctx.createGain();
    g.connect(bus);
    const attack = 1.4, release = 2.2;
    g.gain.setValueAtTime(offset > attack ? vol : (vol * offset) / attack, when);
    if (offset < attack) g.gain.linearRampToValueAtTime(vol, when + (attack - offset));
    const relStart = Math.max(when, when + dur - release);
    g.gain.setValueAtTime(vol, relStart);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    for (const [mult, v] of [[1, 1], [2, 0.28]]) {
      const og = ctx.createGain();
      og.gain.value = v;
      og.connect(g);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      o.connect(og);
      o.start(when);
      o.stop(when + dur + 0.1);
      sources.push(o);
    }
  }

  /* --- myk, rund puls (hjerteslag-f\u00f8lelse, ingen klikk) --- */
  function kick(at) {
    if (at < fromT) return;
    const when = now() + (at - fromT);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 150;
    g.connect(lp).connect(bus);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(PULSE.vol, when + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.55);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(72, when);
    o.frequency.exponentialRampToValueAtTime(36, when + 0.18);
    o.connect(g);
    o.start(when);
    o.stop(when + 0.6);
    sources.push(o);
  }

  /* --- plukk (med attack-rampe, ingen klikk) --- */
  function pluck(f, at, k) {
    if (at < fromT) return;
    const when = now() + (at - fromT);
    const g = ctx.createGain();
    g.connect(bus);
    g.connect(delay);
    send(g, 0.6);
    const v = 0.022 + 0.008 * dr(k, 23);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(v, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.6);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    o.connect(g);
    o.start(when);
    o.stop(when + 0.65);
    sources.push(o);
  }

  /* --- chime (myk, med attack-rampe) --- */
  function chime(f, at, vol = 0.038) {
    if (at < fromT - 0.2) return;
    const when = now() + Math.max(0, at - fromT);
    for (const [mult, v, dec] of [[1, vol, 1.7], [2.94, vol * 0.22, 1.0]]) {
      const g = ctx.createGain();
      g.connect(bus);
      send(g, 0.85);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(v, when + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dec);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      o.connect(g);
      o.start(when);
      o.stop(when + dec + 0.1);
      sources.push(o);
    }
  }

  /* --- lead-motiv med vibrato --- */
  function lead(f, a, d) {
    if (a + d < fromT) return;
    const when = now() + Math.max(0, a - fromT);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    g.connect(lp).connect(bus);
    send(g, 0.65);
    const vol = 0.042;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.28);
    g.gain.setValueAtTime(vol, when + Math.max(0.28, d - 0.9));
    g.gain.linearRampToValueAtTime(0.0001, when + d);
    const vib = ctx.createOscillator();
    vib.frequency.value = 4.6;
    const vibG = ctx.createGain();
    vibG.gain.setValueAtTime(0, when);
    vibG.gain.linearRampToValueAtTime(5.5, when + 0.6);
    vib.connect(vibG);
    vib.start(when);
    vib.stop(when + d + 0.1);
    sources.push(vib);
    for (const [type, v] of [['sine', 1], ['triangle', 0.45]]) {
      const og = ctx.createGain();
      og.gain.value = v;
      og.connect(g);
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      vibG.connect(o.detune);
      o.connect(og);
      o.start(when);
      o.stop(when + d + 0.1);
      sources.push(o);
    }
  }

  /* --- whoosh / riser --- */
  function whoosh(center, vol = 0.045, f0 = 300, f1 = 2400, dur = 1.4) {
    const a = center - dur / 2;
    if (a + dur < fromT) return;
    const when = now() + Math.max(0, a - fromT);
    const offset = Math.max(0, fromT - a);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(f0, when);
    bp.frequency.exponentialRampToValueAtTime(f1, when + dur - offset);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + Math.max(0.05, dur / 2 - offset));
    g.gain.linearRampToValueAtTime(0.0001, when + dur - offset);
    src.connect(bp).connect(g).connect(bus);
    send(g, 0.3);
    src.start(when);
    src.stop(when + dur - offset + 0.05);
    sources.push(src);
  }

  /* ================= LYDEFFEKTER ================= */

  /* myke intro-tangenter (piano-aktig) */
  function key(f, at, vol = 0.045) {
    if (at < fromT - 0.1) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1900;
    g.connect(lp).connect(bus);
    send(g, 0.7);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 2.4);
    for (const [type, v] of [['triangle', 1], ['sine', 0.6]]) {
      const og = ctx.createGain();
      og.gain.value = v;
      og.connect(g);
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(og);
      o.start(when);
      o.stop(when + 2.5);
      sources.push(o);
    }
  }

  /* toggle: klikk + power-riser */
  function toggleOn(at) {
    if (at < fromT - 0.1) return;
    const when = now() + Math.max(0, at - fromT);
    /* klikk */
    const click = ctx.createBufferSource();
    click.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.0001, when);
    cg.gain.linearRampToValueAtTime(0.045, when + 0.004);
    cg.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    click.connect(hp).connect(cg).connect(bus);
    click.start(when, 0.3, 0.08);
    sources.push(click);
    /* power-riser */
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when + 0.05);
    g.gain.linearRampToValueAtTime(0.04, when + 0.45);
    g.gain.linearRampToValueAtTime(0.0001, when + 0.9);
    g.connect(bus);
    send(g, 0.5);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(180, when + 0.05);
    o.frequency.exponentialRampToValueAtTime(540, when + 0.85);
    o.connect(g);
    o.start(when + 0.05);
    o.stop(when + 0.95);
    sources.push(o);
  }

  /* stempel-dunk (FINN publisert) */
  function thump(at) {
    if (at < fromT - 0.1) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.085, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
    g.connect(bus);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(115, when);
    o.frequency.exponentialRampToValueAtTime(52, when + 0.12);
    o.connect(g);
    o.start(when);
    o.stop(when + 0.35);
    sources.push(o);
    const snap = ctx.createBufferSource();
    snap.buffer = noiseBuf;
    const shp = ctx.createBiquadFilter();
    shp.type = 'highpass';
    shp.frequency.value = 1400;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, when);
    sg.gain.linearRampToValueAtTime(0.03, when + 0.005);
    sg.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
    snap.connect(shp).connect(sg).connect(bus);
    snap.start(when, 0.7, 0.09);
    sources.push(snap);
  }

  /* sonar-ping (screening) */
  function ping(at, f = 740) {
    if (at < fromT - 0.1) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.026, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.6);
    g.connect(bus);
    g.connect(delay);
    send(g, 0.85);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g);
    o.start(when);
    o.stop(when + 0.65);
    sources.push(o);
  }

  /* penn-skribling (signatur) */
  function scribble(a, b) {
    let k = 0;
    for (let at = a; at < b; at += 0.085, k++) {
      if (at < fromT - 0.05 || dr(k, 31) < 0.25) continue;
      const when = now() + Math.max(0, at - fromT);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1500 + dr(k, 32) * 900;
      bp.Q.value = 1.6;
      const g = ctx.createGain();
      const v = 0.006 + 0.01 * dr(k, 33);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(v, when + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
      src.connect(bp).connect(g).connect(bus);
      src.start(when, dr(k, 34) * 1.5, 0.09);
      sources.push(src);
    }
  }

  /* mykt AI-tikk (statuspiller) */
  function tick(at, f = 880) {
    if (at < fromT - 0.1) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.018, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
    g.connect(bus);
    send(g, 0.35);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, when);
    o.frequency.exponentialRampToValueAtTime(f * 1.18, when + 0.05);
    o.connect(g);
    o.start(when);
    o.stop(when + 0.13);
    sources.push(o);
  }

  /* dyp, myk boom (finale-samling brister) */
  function boom(at, vol = 0.09) {
    if (at < fromT - 0.1) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.9);
    g.connect(bus);
    send(g, 0.5);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, when);
    o.frequency.exponentialRampToValueAtTime(38, when + 0.35);
    o.connect(g);
    o.start(when);
    o.stop(when + 1.0);
    sources.push(o);
  }

  /* meldings-blipp (chat) */
  function msgPop(at, out = false) {
    if (at < fromT - 0.1) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.045, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    g.connect(bus);
    send(g, 0.4);
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f0 = out ? 520 : 310;
    const f1 = out ? 660 : 390;
    o.frequency.setValueAtTime(f0, when);
    o.frequency.exponentialRampToValueAtTime(f1, when + 0.09);
    o.connect(g);
    o.start(when);
    o.stop(when + 0.2);
    sources.push(o);
  }

  /* magisk skimmer (Automagisk-morph) */
  function shimmer(at) {
    const notes = ['Eb6', 'G6', 'Bb6', 'C7', 'G6', 'Eb7'];
    notes.forEach((n, i) => {
      const nt = at + i * 0.06;
      if (nt < fromT - 0.1) return;
      const when = now() + Math.max(0, nt - fromT);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(0.024, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.8);
      g.connect(bus);
      send(g, 0.9);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq(n);
      o.connect(g);
      o.start(when);
      o.stop(when + 0.85);
      sources.push(o);
    });
    /* glitter-st\u00f8v */
    if (at >= fromT - 0.1) {
      const when = now() + Math.max(0, at - fromT);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 8500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(0.012, when + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.5);
      src.connect(hp).connect(g).connect(bus);
      src.start(when, 0.2, 0.55);
      sources.push(src);
    }
  }

  /* myk hi-hat — gir filmen driv (offbeat mot pulsen) */
  function hat(at, vol = 0.011) {
    if (at < fromT - 0.05) return;
    const when = now() + Math.max(0, at - fromT);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
    src.connect(hp).connect(g).connect(bus);
    src.start(when, dr(Math.floor(at * 10), 51) * 1.2, 0.09);
    sources.push(src);
  }

  /* sub-anticipation — lav svell som bygger inn mot et treffpunkt */
  function subSwell(at, dur = 0.5, vol = 0.055) {
    if (at < fromT - 0.05) return;
    const a = at - dur;
    const when = now() + Math.max(0, a - fromT);
    const end = now() + Math.max(0.02, at - fromT);
    const g = ctx.createGain();
    g.connect(bus);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + 0.12);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(46, when);
    o.frequency.linearRampToValueAtTime(60, end);
    o.connect(g);
    o.start(when);
    o.stop(end + 0.2);
    sources.push(o);
  }

  /* data-chirp — korte stigende blipp (radar-prosessering) */
  function chirp(at, f0, f1, vol = 0.011) {
    if (at < fromT - 0.05) return;
    const when = now() + Math.max(0, at - fromT);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
    g.connect(bus);
    send(g, 0.3);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, when);
    o.frequency.exponentialRampToValueAtTime(f1, when + 0.08);
    o.connect(g);
    o.start(when);
    o.stop(when + 0.12);
    sources.push(o);
  }

  /* kamera-shutter — to raske klikk (foto stylet) */
  function shutter(at) {
    for (const [d, f, v] of [[0, 3200, 0.032], [0.05, 2300, 0.026]]) {
      const nt = at + d;
      if (nt < fromT - 0.05) continue;
      const when = now() + Math.max(0, nt - fromT);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(v, when + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
      src.connect(bp).connect(g).connect(bus);
      src.start(when, 0.5 + d, 0.06);
      sources.push(src);
    }
  }

  /* luftig finale-pad */
  function airPad(f, a, b, vol = 0.016) {
    if (b <= fromT) return;
    const when = now() + Math.max(0, a - fromT);
    const dur = b - Math.max(a, fromT);
    const g = ctx.createGain();
    g.connect(bus);
    send(g, 0.8);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 1.6);
    g.gain.setValueAtTime(vol, when + Math.max(1.6, dur - 1.4));
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g);
    o.start(when);
    o.stop(when + dur + 0.1);
    sources.push(o);
  }

  /* ====== planlegg alt ====== */
  for (const s of PAD_SECTIONS) for (const n of s.notes) padNote(freq(n), s.a, s.b);
  for (const s of BASS_SECTIONS) bassNote(freq(s.n), s.a, s.b);
  for (let at = PULSE.from, k = 0; at <= PULSE.to; at += PULSE.step, k++) {
    kick(at);
  }
  /* hi-hats — offbeat driv, hopper over ~20% (menneskelig følelse) */
  for (let at = 14.9, hk = 0; at <= 58.7; at += 0.6, hk++) {
    if (dr(hk, 71) < 0.2) continue;
    hat(at, hk % 2 === 0 ? 0.012 : 0.007);
  }
  let k = 0;
  for (let at = ARP.from; at <= ARP.to; at += ARP.step, k++) {
    if (dr(k, 11) < 0.62) continue;
    const tones = chordAt(at);
    const pick = tones[Math.floor(dr(k, 12) * tones.length)];
    const up = dr(k, 13) > 0.6 ? 2 : 1;
    pluck(freq(pick) * up, at, k);
  }
  for (const w of WHOOSHES) whoosh(w);
  whoosh(67.5, 0.06, 500, 5200, 1.6); /* riser inn mot logo */
  for (const c of CHIMES) chime(freq(c.n), c.t);
  for (const l of LEAD) lead(freq(l.n), l.t, l.d);

  /* lydeffekter */
  key(freq('Eb5'), 0.9);
  key(freq('C5'), 2.5);
  key(freq('G4'), 4.0);
  key(freq('Bb4'), 6.0, 0.038);
  subSwell(10.62); /* anticipation inn mot toggle */
  toggleOn(10.45);
  /* AI-statuspiller: start (lavt) og fullført (lysere) */
  tick(15.5, 760);
  tick(16.5, 1240);
  tick(18.0, 760);
  tick(19.3, 1240);
  tick(20.6, 760);
  tick(22.6, 1240);
  shutter(19.25); /* foto stylet */
  thump(23.75);
  ping(33.2, 740);
  ping(34.4, 880);
  /* radar-prosessering: data-chirps */
  chirp(33.5, 1250, 1900);
  chirp(33.85, 1500, 2300);
  chirp(34.2, 1100, 1750);
  chirp(34.6, 1650, 2500);
  chirp(34.95, 1300, 2000);
  whoosh(36.4, 0.028, 800, 3200, 0.9); /* anamorf flare — godkjent */
  scribble(40.35, 41.7);
  whoosh(46.85, 0.03, 900, 3800, 0.9); /* anamorf flare — husleie */
  msgPop(50.55, false);
  msgPop(52.65, true);
  msgPop(54.65, false);
  /* finale: chips samles (fallende whoosh) og brister (boom + chime) */
  whoosh(63.8, 0.05, 2400, 320, 1.1);
  boom(64.12);
  chime(freq('Eb5'), 64.2, 0.034);
  shimmer(65.55);
  boom(68.0, 0.05); /* myk logo-hit */
  airPad(freq('G5'), 67.5, 72);
  airPad(freq('C6'), 68.2, 72, 0.012);

  return {
    stop() {
      for (const s of sources) {
        try { s.stop(); } catch (e) { /* ok */ }
        try { s.disconnect(); } catch (e) { /* ok */ }
      }
      try { bus.disconnect(); } catch (e) { /* ok */ }
    },
  };
}

/* --- offline render til WAV (for MP4-eksport) --- */
export async function renderMusicWav(duration = FILM_DURATION) {
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
  scheduleMusic(ctx, ctx.destination, 0);
  const buf = await ctx.startRendering();
  return audioBufferToWavBase64(buf);
}

function audioBufferToWavBase64(buffer) {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length * numCh * 2;
  const ab = new ArrayBuffer(44 + len);
  const view = new DataView(ab);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, len, true);
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
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}
