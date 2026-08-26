// ── Lyddesign for Bergen Urban-decket ──
// Alt syntetiseres med Web Audio — ingen lydfiler. Ekstremt lavmælt:
// lyden skal kjennes, ikke høres. Av som standard; «M» skrur på/av.
//
// Øyeblikk:
//   tast()   — myk tastelyd under prompt-skrivingen
//   send()   — kort «swip» opp idet prompten sendes
//   modul()  — diskré kvittering når agenten fullfører en modul
//   deploy() — dypere bekreftelse idet agenten deployer
//   reveal() — lav svellende tone inn mot portal-revealen

let ctx = null;
let master = null;
let stoyBuffer = null;
let aktiv = false;

function sikre() {
  if (typeof window === 'undefined') return false;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    // Hvit støy-buffer (gjenbrukes til tastelydene)
    const lengde = Math.floor(ctx.sampleRate * 0.1);
    stoyBuffer = ctx.createBuffer(1, lengde, ctx.sampleRate);
    const data = stoyBuffer.getChannelData(0);
    for (let i = 0; i < lengde; i += 1) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return true;
}

function tone({ freq, til = null, type = 'sine', gain = 0.05, attack = 0.005, decay = 0.25, start = 0 }) {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (til) osc.frequency.exponentialRampToValueAtTime(til, t0 + attack + decay * 0.6);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + attack + decay + 0.05);
}

export const lyd = {
  aktiver() {
    if (sikre()) aktiv = true;
  },
  deaktiver() {
    aktiv = false;
  },
  erAktiv() {
    return aktiv;
  },

  // Myk tastelyd — kort, båndpassfiltrert støy med litt tilfeldig tonehøyde
  tast() {
    if (!aktiv || !sikre()) return;
    const t0 = ctx.currentTime;
    const kilde = ctx.createBufferSource();
    kilde.buffer = stoyBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200 + Math.random() * 2600;
    filter.Q.value = 1.6;
    const g = ctx.createGain();
    const styrke = 0.014 + Math.random() * 0.012;
    g.gain.setValueAtTime(styrke, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
    kilde.connect(filter);
    filter.connect(g);
    g.connect(master);
    kilde.start(t0);
    kilde.stop(t0 + 0.06);
  },

  // «Swip» opp — som en melding som sendes
  send() {
    if (!aktiv || !sikre()) return;
    tone({ freq: 740, til: 1480, type: 'sine', gain: 0.045, attack: 0.012, decay: 0.22 });
  },

  // Diskré kvittering — modul ferdig
  modul() {
    if (!aktiv || !sikre()) return;
    tone({ freq: 1318.5, type: 'sine', gain: 0.03, attack: 0.006, decay: 0.28 });
    tone({ freq: 1975.5, type: 'sine', gain: 0.016, attack: 0.006, decay: 0.22, start: 0.02 });
  },

  // Dypere bekreftelse — deploy
  deploy() {
    if (!aktiv || !sikre()) return;
    tone({ freq: 523.25, type: 'sine', gain: 0.04, attack: 0.01, decay: 0.5 });
    tone({ freq: 659.25, type: 'sine', gain: 0.028, attack: 0.01, decay: 0.55, start: 0.05 });
    tone({ freq: 783.99, type: 'sine', gain: 0.02, attack: 0.01, decay: 0.6, start: 0.1 });
  },

  // Lavt svell — lyset tennes og portalen materialiserer seg
  reveal() {
    if (!aktiv || !sikre()) return;
    const t0 = ctx.currentTime;
    const varighet = 3.2;
    // To lave oscillatorer i oktav gjennom et lavpassfilter som åpner seg
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, t0);
    filter.frequency.exponentialRampToValueAtTime(2200, t0 + varighet * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.038, t0 + varighet * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + varighet);
    filter.connect(g);
    g.connect(master);
    [110, 220].forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.connect(filter);
      osc.start(t0);
      osc.stop(t0 + varighet + 0.1);
    });
    // Svakt skimmer øverst — nesten uhørlig
    tone({ freq: 1760, type: 'sine', gain: 0.008, attack: 1.4, decay: 1.6, start: 0.6 });
  },
};
