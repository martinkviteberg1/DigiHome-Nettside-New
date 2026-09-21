'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EASE, T, display, tall, useRedusert, useSekvens, useSmal, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   MeglerKartScene — «byen er dashbordet», for utleiemeglere.

   Kartet over Bergen; porteføljen er andres boliger: hver prikk er en bolig
   med en eier, de navngitte nålene er dagens hovedpersoner. Dagen spilles:
   · 07:58  boligene lander i byen, fra sentrum og utover
   · 08:00  husleiebølgen: én ring løper over byen, boligene popper grønne
            idet den passerer — de som mangler blir gule
   · deretter lever byen: små hendelser (faktura sendt, melding besvart,
            kvittering lest …) dukker opp ved tilfeldige boliger, og telleren
            «Automatisk i dag» ruller
   · dagens fem store hendelser kommer som glasskort ved nålene, kameraet
            driver rolig mot dem, dagslinjen nederst viser hvor på dagen vi er
   · 14:20  én ting venter på forvalteren: velg leietaker i Løkkeveien 14.
            Trykk «Velg Sander», eller la Jonas ta det etter 5 s.

   Størrelsen (10–50 · 50–250 · 250+ boliger) bytter data og spiller fra
   frame 1. Kun opacity/transform/fill i bevegelsen; boligfeltet er én SVG.
--------------------------------------------------------------------------- */

/* Nålene i kartets koordinater (viewBox 1600×1000; Nygårdsgaten 5 = 800,500). Illustrativt, ikke oppmålt. */
const POS = {
  'Nygårdsgaten 5': [800, 500],
  'Strandgaten 12': [640, 250],
  'Kong Oscars gate 3': [990, 290],
  'Solheimsgaten 8': [900, 760],
  'Damsgårdsveien 41': [520, 700],
  'Michael Krohns gate 9': [700, 860],
  'Løkkeveien 14': [1180, 620],
  'Pedersgata 22': [1230, 400],
  'Fjellveien 12': [720, 390],
};
/* Klyngesentre for boligfeltet: kjente adresser + bydeler. Boligene legges rundt disse. */
const FLERE = [[1080, 560], [560, 470], [960, 640], [1120, 760], [430, 560], [1260, 260], [870, 190], [660, 640], [1020, 430], [760, 350], [1180, 500], [1300, 700], [610, 800], [1330, 540], [480, 320], [1040, 860], [880, 880], [1230, 800], [380, 700], [1370, 400], [960, 130], [700, 180], [1100, 190], [540, 880], [1400, 620]];
const SENTRE = [...Object.values(POS), ...FLERE];

/* Deterministisk «tilfeldig», så server og klient tegner samme by */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/* n boliger fordelt på klyngene, tettest i sentrum. Hver får en «egenskap» r (størrelse, utvalg til hendelser). */
function boligfelt(n, seed) {
  const r = rng(seed);
  const ut = [];
  for (let i = 0; i < n; i++) {
    const c = SENTRE[Math.floor(r() * SENTRE.length)];
    const vinkel = r() * Math.PI * 2;
    const rad = 16 + Math.pow(r(), 0.7) * 96;
    const X = Math.round(c[0] + Math.cos(vinkel) * rad);
    const Y = Math.round(c[1] + Math.sin(vinkel) * rad * 0.82);
    if (X < 300 || X > 1480 || Y < 90 || Y > 940) { i--; continue; }
    ut.push([X, Y, r()]);
  }
  return ut;
}

export const STORRELSER = {
  liten: {
    navn: '10–50', selskap: 'Fjord Utleie', initialer: 'FU', by: 'Bergen', eiere: 14, boliger: 38,
    husleieTall: 494000, husleieFmt: (n) => `${tall(Math.round(n))} kr`, innbetalt: '38 av 38', purringer: 0, saker: 6, lost: 5, sokere: 3,
    byggListe: [['Nygårdsgaten 5', 'P. Aas'], ['Strandgaten 12', 'K. Moen'], ['Solheimsgaten 8', 'A. Lie'], ['Løkkeveien 14', 'H. Nes']], flere: 0,
  },
  mellom: {
    navn: '50–250', selskap: 'Vest Utleie AS', initialer: 'VU', by: 'Bergen', eiere: 86, boliger: 214,
    husleieTall: 2.78, husleieFmt: (n) => `${n.toFixed(2).replace('.', ',')} mill.`, innbetalt: '211 av 214', purringer: 3, saker: 14, lost: 11, sokere: 3,
    byggListe: [['Nygårdsgaten 5', 'P. Aas'], ['Strandgaten 12', 'K. Moen'], ['Solheimsgaten 8', 'A. Lie'], ['Kong Oscars gate 3', 'T. Berg'], ['Damsgårdsveien 41', 'S. Vik'], ['Løkkeveien 14', 'H. Nes']], flere: 3,
  },
  stor: {
    navn: '250+', selskap: 'Nordvest Forvaltning', initialer: 'NF', by: 'Bergen · Stavanger', eiere: 240, boliger: 640,
    husleieTall: 8.3, husleieFmt: (n) => `${n.toFixed(1).replace('.', ',')} mill.`, innbetalt: '632 av 640', purringer: 8, saker: 41, lost: 36, sokere: 5,
    byggListe: [['Nygårdsgaten 5', 'P. Aas'], ['Strandgaten 12', 'K. Moen'], ['Solheimsgaten 8', 'A. Lie'], ['Michael Krohns gate 9', 'E. Dahl'], ['Pedersgata 22', 'M. Holm'], ['Løkkeveien 14', 'H. Nes']], flere: 25,
  },
};

const FASER = [
  { navn: 'inn', ms: 600 },
  { navn: 'bygg', ms: 1600 },
  { navn: 'rad1', ms: 2600 },
  { navn: 'rad2', ms: 2300 },
  { navn: 'rad3', ms: 2200 },
  { navn: 'rad4', ms: 2300 },
  { navn: 'rad5', ms: 900 },
  { navn: 'lev', ms: 700 },
  { navn: 'krev', ms: 600 },
  { navn: 'kort', ms: null },      // HOLD — venter på forvalter (deg)
  { navn: 'godkjent', ms: 1400 },
  { navn: 'ferdig', ms: 0 },
];

const AUTO_MS = 5000;
const SCENE_H = 'clamp(620px, 70vh, 700px)';
const SCENE_H_SMAL = 'clamp(520px, 68vh, 600px)';
const HAIR = 'rgba(21,19,15,0.08)';
const PAPIR = '#FBFAF8';
const FJAER = 'cubic-bezier(0.34, 1.45, 0.64, 1)';
const LANDING = 'cubic-bezier(0.22, 1.2, 0.36, 1)';
const HAST = 1.5;                  // ms per px — bølgens fart over byen
const GUL = 'rgba(214,140,20,0.9)';

/* Glass — samme materialer som forsidens hero */
const GLASS = {
  lys: { background: 'rgba(251,250,248,0.8)', color: T.ink, border: '1px solid rgba(255,255,255,0.75)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 22px 50px -24px rgba(21,19,15,0.35)' },
  mork: { background: 'rgba(34,31,26,0.9)', color: '#F4F1EA', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 30px 60px -28px rgba(21,19,15,0.6)' },
};
const BLUR = { backdropFilter: 'blur(14px) saturate(140%)', WebkitBackdropFilter: 'blur(14px) saturate(140%)' };

/* Det byen gjør selv gjennom dagen — små hendelser ved tilfeldige boliger. ai = språkmodell. */
const MIKRO = [
  ['Faktura sendt', 'ok'], ['Melding besvart', 'ai'], ['Visning avtalt', 'ok'], ['Kvittering lest', 'ai'],
  ['Strøm avlest', 'ok'], ['Påminnelse sendt', 'gul'], ['Protokoll signert', 'ok'], ['Søknad mottatt', 'ok'],
  ['Sak kategorisert', 'ai'], ['Annonse publisert', 'ok'], ['Leieestimat klart', 'ai'], ['Depositum opprettet', 'ok'],
  ['KPI-varsel sendt', 'ok'], ['Nøkler kvittert', 'ok'], ['Interessent fikk svar', 'ai'], ['Oppgjør sendt', 'ok'],
  ['Kredittsjekk klar', 'ok'], ['Bilder vurdert', 'ai'], ['Utbetaling til eier', 'ok'], ['Tilbud lest av eier', 'ok'],
];
const MIKRO_FARGE = { ok: T.gronn, ai: T.lilla, gul: GUL };

function Teller({ vis, til, fmt }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!vis) { setV(0); return undefined; }
    let raf; const t0 = performance.now(); const dur = 1100;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(2, -10 * p);
      setV(til * (p >= 1 ? 1 : e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [vis, til]);
  return <span>{fmt(v)}</span>;
}

/* Tall som ruller fra forrige til ny verdi — store sprang tar lengre tid, små tikk går fort */
function Ruller({ til }) {
  const [v, setV] = useState(til);
  const naa = useRef(til);
  useEffect(() => {
    const start = naa.current; const delta = til - start;
    if (!delta) return undefined;
    let raf; const t0 = performance.now(); const dur = Math.abs(delta) > 40 ? 1100 : 380;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const nv = Math.round(start + delta * e);
      naa.current = nv; setV(nv);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [til]);
  return <>{tall(v)}</>;
}

function HakeIkon({ className = '' }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Dagens hendelser — hver har en nål den skjer ved. */
function hendelser(d) {
  return [
    { fase: 'rad1', ved: 'Nygårdsgaten 5', tid: '08:00', t: 'Husleie inn på klientkonto', teller: true, s: `${d.innbetalt}${d.purringer ? ` · ${d.purringer} påminnelser sendt` : ''}`, alle: true },
    { fase: 'rad2', ved: 'Fjellveien 12', tid: '09:12', t: 'Ny henvendelse', s: 'Kari Moen · leieestimat 17 500 kr · tilbud klart', ny: true },
    { fase: 'rad3', ved: 'Solheimsgaten 8', tid: '11:40', t: 'Leiekontrakt signert', s: 'BankID · 3 år · depositum hos Keyhole' },
    { fase: 'rad4', ved: 'Strandgaten 12', tid: '13:05', t: 'Eier godkjente rørlegger', s: `Kari Moen · i appen · ${tall(6200)} kr`, avatar: '/v4/kari.webp' },
    { fase: 'rad5', ved: 'Løkkeveien 14', tid: '14:20', t: 'Velg leietaker', s: `${d.sokere} søknader · legitimert og kredittsjekket`, sak: true },
  ];
}

/* Klokke → hvor på dagslinjen (07:30–16:30) */
const DAG_FRA = 7 * 60 + 30; const DAG_TIL = 16 * 60 + 30;
const pst = (klokke) => { const [h, m] = klokke.split(':').map(Number); return Math.max(0, Math.min(100, ((h * 60 + m - DAG_FRA) / (DAG_TIL - DAG_FRA)) * 100)); };

export default function MeglerKartScene({ storrelse = 'mellom' }) {
  const ref = useRef(null);
  const figRef = useRef(null);
  const smal = useSmal();
  const redusert = useRedusert();
  const synlig = useSynlig(ref, smal ? 0.5 : 0.35);
  const { fase, er, ferdig, replay, videre, holder } = useSekvens(FASER, synlig);
  const sceneH = smal ? SCENE_H_SMAL : SCENE_H;

  /* Størrelsen som VISES byttes sekvensielt: fade ut → bytt → spill fra frame 1. */
  const [vist, setVist] = useState(storrelse);
  const [skifter, setSkifter] = useState(false);
  const forste = useRef(true);
  useEffect(() => {
    if (forste.current) { forste.current = false; return undefined; }
    if (storrelse === vist) return undefined;
    setSkifter(true);
    const t = window.setTimeout(() => { setVist(storrelse); replay(); setSkifter(false); }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storrelse]);
  const d = STORRELSER[vist] || STORRELSER.mellom;
  const HEND = useMemo(() => hendelser(d), [d]);
  /* Boligfeltet: alle boliger utenom de navngitte, begrenset på små skjermer */
  const antallPrikker = Math.min(d.boliger - d.byggListe.length, smal ? 220 : 640);
  const FELT = useMemo(() => boligfelt(antallPrikker, d.boliger * 7919 + antallPrikker), [antallPrikker, d.boliger]);

  /* Panelets mål → kartets skala og nålenes plass */
  const [maal, setMaal] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const f = () => setMaal({ w: el.offsetWidth, h: el.offsetHeight });
    f();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(f) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  /* Kartet: 1600×1000 skalert så byen fyller panelet, sentrum litt under midten (hodet tar toppen) */
  const sk = maal.w ? Math.max(maal.w / 1600, (maal.h * 0.78) / 1000) * (smal ? 1.25 : 1.32) : 1;
  const cx = maal.w / 2; const cy = maal.h * (smal ? 0.5 : 0.51);
  const pkt = ([X, Y]) => ({ x: Math.round(cx + (X - 800) * sk), y: Math.round(cy + (Y - 500) * sk) });
  /* Skjermposisjoner for feltet — regnes én gang per mål */
  const PUNKT = useMemo(() => FELT.map(([X, Y, r]) => { const p = pkt([X, Y]); return { x: p.x, y: p.y, r, avst: Math.hypot(p.x - cx, p.y - cy) }; }), [FELT, maal.w, maal.h, smal]); // eslint-disable-line react-hooks/exhaustive-deps
  const R = Math.hypot(maal.w, maal.h) / 2 + 24;   // bølgens ytterste radius

  const inne = er('inn');
  const bygg = er('bygg');
  const godkjent = er('godkjent');
  const aktiv = er('rad5') && !godkjent;
  const visKort = er('kort') && !godkjent;
  const venter = holder && fase === 'kort';

  /* Hvem godkjente? 'deg' når du trykket, 'jonas' når historien løste seg selv. */
  const [hvem, setHvem] = useState(null);
  const [trykket, setTrykket] = useState(false);
  const harRort = useRef(false);
  const godkjenn = useCallback((av) => {
    if (trykket || !venter) return;
    setHvem(av);
    setTrykket(true);
    window.setTimeout(() => { videre(); }, 340);
  }, [trykket, venter, videre]);
  useEffect(() => { if (fase === 'inn') { setTrykket(false); setHvem(null); } }, [fase]);

  useEffect(() => {
    const el = figRef.current;
    if (!el) return undefined;
    const f = () => { harRort.current = true; };
    el.addEventListener('pointerenter', f);
    el.addEventListener('pointermove', f, { passive: true });
    el.addEventListener('pointerdown', f);
    el.addEventListener('touchstart', f, { passive: true });
    el.addEventListener('focusin', f);
    return () => {
      el.removeEventListener('pointerenter', f);
      el.removeEventListener('pointermove', f);
      el.removeEventListener('pointerdown', f);
      el.removeEventListener('touchstart', f);
      el.removeEventListener('focusin', f);
    };
  }, []);

  useEffect(() => {
    if (!venter || trykket) return undefined;
    const el = figRef.current;
    try { if (el && el.matches(':hover')) harRort.current = true; } catch (e) { /* ok */ }
    if (harRort.current) return undefined;
    let t = window.setTimeout(() => { if (!harRort.current) godkjenn('jonas'); }, AUTO_MS);
    const avbryt = () => { harRort.current = true; if (t) { window.clearTimeout(t); t = null; } };
    el?.addEventListener('pointerenter', avbryt);
    el?.addEventListener('pointermove', avbryt, { passive: true });
    el?.addEventListener('touchstart', avbryt, { passive: true });
    return () => { if (t) window.clearTimeout(t); el?.removeEventListener('pointerenter', avbryt); el?.removeEventListener('pointermove', avbryt); el?.removeEventListener('touchstart', avbryt); };
  }, [venter, trykket, godkjenn]);

  /* Hvilken hendelse er «nå»? Den siste som er nådd. Kortene ved nålene: nå + forrige (som tones ut). */
  const naaIdx = HEND.reduce((acc, h, i) => (er(h.fase) ? i : acc), -1);
  const naa = naaIdx >= 0 ? HEND[naaIdx] : null;
  const forrige = naaIdx >= 1 ? HEND[naaIdx - 1] : null;
  const sakVises = er('rad5');

  /* Nålenes tilstand */
  const tilstand = (navn) => {
    if (navn === 'Løkkeveien 14' && aktiv) return 'aktiv';
    if (navn === 'Løkkeveien 14' && godkjent) return 'godkjent';
    if (naa && naa.ved === navn && !naa.alle) return 'hendelse';
    return 'ok';
  };
  const husleieBolge = fase === 'rad1';
  const husleieInne = er('rad1');   // etter bølgen: byen er grønn resten av dagen, de som mangler er gule
  const MANGLER = useMemo(() => new Set(FELT.map((_, i) => i).filter((i) => FELT[i][2] < (d.purringer / Math.max(1, FELT.length)) * 1.0).slice(0, d.purringer)), [FELT, d.purringer]);

  /* ── Byen lever: små hendelser ved tilfeldige boliger + telleren «Automatisk i dag» ── */
  const lever = husleieInne && !husleieBolge && !ferdig && !skifter && synlig && !redusert;
  const [mikro, setMikro] = useState([]);
  const [auto, setAuto] = useState(0);
  const mikroK = useRef(0);
  useEffect(() => { if (fase === 'inn') { setMikro([]); setAuto(0); mikroK.current = 0; } }, [fase]);
  useEffect(() => { if (fase === 'rad1') { const t = window.setTimeout(() => setAuto(d.boliger + d.purringer), 380); return () => window.clearTimeout(t); } return undefined; }, [fase, d.boliger, d.purringer]);
  useEffect(() => {
    if (!lever || !PUNKT.length || !maal.w) return undefined;
    const hendelsesNaal = naa && !naa.alle ? pkt(POS[naa.ved] || [800, 500]) : null;
    const naaler = [...d.byggListe.map(([n]) => n), 'Fjellveien 12'].map((n) => pkt(POS[n] || [800, 500]));
    const neste = () => {
      const k = mikroK.current++;
      let idx = -1;
      for (let j = 0; j < 12 && idx < 0; j++) {
        const kand = (k * 89 + 7 + j * 37) % PUNKT.length;
        const p = PUNKT[kand];
        const plass = p.x > 40 && p.x < maal.w - 170 && p.y > 96 && p.y < maal.h - 96;
        const fri = (!hendelsesNaal || Math.hypot(p.x - hendelsesNaal.x, p.y - hendelsesNaal.y) > 150)
          && naaler.every((q) => Math.abs(p.y - q.y) > 26 || p.x < q.x - 300 || p.x > q.x + 190);
        if (plass && fri) idx = kand;
      }
      if (idx < 0) return;
      const [tekst, type] = MIKRO[k % MIKRO.length];
      setMikro((m) => [...m.slice(-1), { id: k, idx, tekst, type }]);
      setAuto((a) => a + 2 + (k % 4));
    };
    const t0 = window.setTimeout(neste, 400);
    const iv = window.setInterval(neste, smal ? 3200 : 2400);
    return () => { window.clearTimeout(t0); window.clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lever, PUNKT, maal.w, maal.h, smal, naa && naa.ved]);

  /* Kameraet driver rolig mot dagens hendelse. Nålene og kartet ligger i samme lag; kortene får samme forskyvning. */
  const kam = useMemo(() => {
    if (!maal.w || !naa || naa.alle) return { x: 0, y: 0 };
    const m = pkt(POS[naa.ved] || [800, 500]);
    const dx = Math.max(-44, Math.min(44, (cx - m.x) * 0.15));
    const dy = Math.max(-30, Math.min(30, (cy - m.y) * 0.15));
    return { x: Math.round(dx), y: Math.round(dy) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maal.w, maal.h, naa && naa.ved, naa && naa.alle]);
  const KAM_T = `transform 2800ms cubic-bezier(0.3, 0.05, 0.3, 1)`;
  /* Lyset gjennom dagen: kjølig morgen → nøytral → varm ettermiddag */
  const lys = !naa ? 'rgba(120,140,190,0.05)' : naaIdx <= 0 ? 'rgba(120,140,190,0.05)' : naaIdx <= 2 ? 'rgba(120,140,190,0)' : 'rgba(230,160,80,0.06)';
  const klokke = ferdig ? '16:00' : naa ? naa.tid : bygg ? '07:58' : '07:55';
  const dagPst = inne ? pst(klokke) : 0;

  const knappTekst = trykket ? 'Valgt' : 'Velg Sander';
  const kortVed = pkt(POS['Løkkeveien 14']);
  const kortW = smal ? Math.min(300, maal.w - 32) : 292;
  const kortX = smal ? 16 : Math.min(kortVed.x + 26, maal.w - kortW - 16);
  const kortY = smal ? null : Math.max(72, Math.min(kortVed.y - 40, maal.h - 300));

  return (
    <figure ref={figRef} className="relative m-0" data-testid="v4m-scene-wrap">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-[22px]"
        style={{ height: sceneH, background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 40px 90px -50px rgba(21,19,15,0.35)', opacity: skifter ? 0 : 1, transition: `opacity 300ms ${EASE}` }}
        role="img"
        aria-label={`Animert eksempel: en dag i ${d.selskap} med DigiHome, ${d.eiere} eiere og ${d.boliger} boliger på kartet over ${d.by}. Husleie inn på klientkonto, en ny henvendelse, en kontrakt signert, en eier godkjenner en rørlegger, og valg av leietaker venter på forvalteren.`}
        data-testid="v4m-scene"
      >
        {/* ── Kartet — tone-i-tone, kommer opp rolig med en svak innzoom ── */}
        {maal.w > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity: inne ? 1 : 0, transition: `opacity 1200ms ${EASE}` }}>
            <div className="absolute inset-0" style={{ transform: `translate(${kam.x}px, ${kam.y}px)`, transition: KAM_T, willChange: 'transform' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={smal ? '/v4/annonse/bergen-kart-m.svg' : '/v4/annonse/bergen-kart.svg'} alt="" width={1600} height={1000} draggable={false} className="absolute select-none" style={{ left: cx, top: cy, width: 1600, height: 1000, maxWidth: 'none', transform: `translate(-50%, -50%) scale(${inne ? sk : sk * 1.06})`, transformOrigin: '50% 50%', transition: `transform 2600ms cubic-bezier(0.3, 0.05, 0.7, 0.95)`, opacity: smal ? 0.7 : 1 }} />
            </div>
            {/* Lys vignett — kantene toner mot papiret så kartet ikke slutter brått */}
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 72% at 50% 55%, rgba(251,250,248,0) 45%, ${PAPIR} 100%)` }} />
            {/* Dagslyset */}
            <div className="absolute inset-0" style={{ background: lys, transition: `background 1800ms ${EASE}` }} />
          </div>
        )}

        {/* ── Hodet: selskapet · dagens tall ── */}
        <div className="relative z-[5] flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6" style={{ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(8px)', transition: `opacity 600ms ${EASE} 150ms, transform 600ms ${EASE} 150ms` }}>
          <div className="min-w-0">
            <p className="truncate text-[22px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }} data-testid="v4m-selskap">{d.selskap}</p>
            <p className="mt-1 truncate text-[13px] text-[#15130F]/55 sm:text-[13.5px]" data-testid="v4m-sum">{d.eiere} eiere · {d.boliger} boliger · {d.by}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4 sm:gap-6">
            {/* Det systemet gjorde selv — ruller gjennom dagen */}
            <div className="text-right">
              <p className="text-[12px] text-[#15130F]/50"><span className="sm:hidden">Automatisk</span><span className="hidden sm:inline">Gjort automatisk i dag</span></p>
              <p className="mt-0.5 text-[22px] leading-none tabular-nums" style={{ ...display, letterSpacing: '-0.02em', color: auto ? T.ink : 'rgba(21,19,15,0.35)', transition: `color 500ms ${EASE}` }} data-testid="v4m-auto"><Ruller til={auto} /></p>
            </div>
            <div className="hidden h-8 w-px sm:block" style={{ background: HAIR }} />
            <div className="hidden text-right sm:block">
              <p className="text-[12px] text-[#15130F]/50">Godkjenninger</p>
              <p className="mt-0.5 flex items-baseline justify-end gap-1.5">
                <span className="inline-grid text-[22px] leading-none" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }}>
                  <span className="col-start-1 row-start-1" style={{ opacity: godkjent ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>{er('rad4') ? 1 : 0}</span>
                  <span className="col-start-1 row-start-1" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 200ms` }}>2</span>
                </span>
                <span className="text-[12.5px] text-[#15130F]/45">av {d.saker}</span>
              </p>
            </div>
            <div className="hidden h-8 w-px sm:block" style={{ background: HAIR }} />
            <p className="hidden text-right sm:block" data-testid="v4m-klokke">
              <span className="block text-[12px] text-[#15130F]/50">Nå</span>
              <span key={klokke} className="block text-[22px] leading-none tabular-nums" style={{ ...display, letterSpacing: '-0.02em', color: T.ink, animation: `v4-tall-inn 420ms ${EASE} both` }}>{klokke}</span>
            </p>
            <div className="hidden h-8 w-px md:block" style={{ background: HAIR }} />
            <p className="hidden items-center gap-2 text-[13px] text-[#15130F]/60 md:flex">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: aktiv ? T.lilla : T.gronn, transition: 'background 400ms', animation: aktiv ? 'v4-puls-dot 1400ms ease-in-out infinite' : 'none' }} />
              <span className="inline-grid">
                <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>Alt i orden</span>
                <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>1 venter på forvalter</span>
              </span>
            </p>
          </div>
        </div>

        {/* ── Byen: boligfeltet, bølgen, nålene, de små hendelsene ── */}
        {maal.w > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3]" style={{ transform: `translate(${kam.x}px, ${kam.y}px)`, transition: KAM_T, willChange: 'transform' }} data-testid="v4m-bygg" data-boliger={FELT.length}>
            {/* Boligfeltet — én SVG: alle boligene lander fra sentrum og utover; husleiebølgen popper dem grønne, de som mangler blir gule */}
            <svg className="absolute inset-0" width={maal.w} height={maal.h} viewBox={`0 0 ${maal.w} ${maal.h}`} style={{ overflow: 'visible' }}>
              {PUNKT.map((p, i) => {
                const mangler = MANGLER.has(i);
                const fyll = !husleieInne ? 'rgba(21,19,15,0.36)' : mangler ? GUL : husleieBolge ? 'rgba(31,157,85,0.78)' : 'rgba(31,157,85,0.52)';
                const rad = 2.1 + p.r * 1.3;
                /* Stabil etter bølgen — endres animasjonsstrengen, starter poppet på nytt */
                const forsinkelse = husleieInne ? 180 + p.avst * HAST : 0;
                return (
                  <circle
                    key={`b${i}`}
                    cx={p.x} cy={p.y} r={rad}
                    fill={fyll}
                    stroke={PAPIR} strokeWidth={1.4}
                    style={{
                      transformBox: 'fill-box', transformOrigin: 'center',
                      opacity: bygg ? 1 : 0,
                      animation: !bygg ? 'none' : husleieInne ? `v4-bolge-pop 640ms ${LANDING} ${forsinkelse}ms both` : `v4-prikk-inn 620ms ${LANDING} ${160 + p.avst * 1.1}ms both`,
                      transition: `fill 520ms ${EASE} ${forsinkelse}ms`,
                    }}
                  />
                );
              })}
            </svg>

            {/* Husleiebølgen — én ring løper fra sentrum over hele byen, i samme fart som boligene popper */}
            {husleieBolge && (
              <span className="absolute rounded-full" style={{ left: cx - R, top: cy - R, width: R * 2, height: R * 2, boxShadow: `inset 0 0 0 1.5px rgba(31,157,85,0.9), inset 0 0 40px 0 rgba(31,157,85,0.08)`, animation: `v4-bolge-ring ${Math.round(R * HAST)}ms linear 180ms both`, willChange: 'transform, opacity' }} data-testid="v4m-bolge" />
            )}

            {/* De navngitte nålene */}
            {[...d.byggListe, ...(er('rad2') ? [['Fjellveien 12', 'ny']] : [])].map(([navn, enh], i) => {
              const p = pkt(POS[navn] || [800, 500]);
              const nyNaal = navn === 'Fjellveien 12';
              const st = tilstand(navn);
              const farge = st === 'aktiv' ? T.lilla : st === 'godkjent' ? T.gronn : husleieBolge ? T.gronn : T.ink;
              const hoyreSide = p.x < maal.w * 0.62;   // etiketten til høyre for nålen når det er plass
              const dekket = !!(naa && naa.ved === navn) || (navn === 'Løkkeveien 14' && (visKort || godkjent));   // et kort står ved nålen
              const visEtikett = (!smal || st !== 'ok') && !dekket;
              const fargeN = nyNaal ? T.lilla : farge;
              const avst = Math.hypot(p.x - cx, p.y - cy);
              return (
                <div key={navn} className="absolute" style={{ left: p.x, top: p.y, opacity: bygg ? 1 : 0, transition: `opacity 400ms ${EASE} ${nyNaal ? 0 : 120 + i * 110}ms`, animation: nyNaal ? `v4-naal-inn 720ms ${LANDING} both` : 'none' }} data-testid={`v4m-naal-${i}`} data-tilstand={nyNaal ? 'ny' : st}>
                  {/* Landingsring */}
                  <span className="absolute rounded-full" style={{ left: -14, top: -14, width: 28, height: 28, boxShadow: `inset 0 0 0 1px ${fargeN}`, opacity: 0, animation: bygg ? `v4-ring-en 900ms ${EASE} ${nyNaal ? 0 : 200 + i * 110}ms both` : 'none' }} />
                  {/* Husleiebølgen passerer: én ring per nål, i bølgens takt */}
                  {husleieBolge && <span className="absolute rounded-full" style={{ left: -16, top: -16, width: 32, height: 32, boxShadow: `inset 0 0 0 1.5px ${T.gronn}`, opacity: 0, animation: `v4-ring-en 1100ms ${EASE} ${180 + avst * HAST}ms both` }} />}
                  {/* Aktiv sak: pulserende ring */}
                  {st === 'aktiv' && <span className="absolute rounded-full" style={{ left: -14, top: -14, width: 28, height: 28, boxShadow: `inset 0 0 0 1.5px ${T.lilla}`, animation: 'v4-ring-pust 1800ms ease-in-out infinite' }} />}
                  {/* Myk skygge under nålen — gir dybde mot feltet */}
                  <span className="absolute rounded-full" style={{ left: -9, top: -9, width: 18, height: 18, background: 'rgba(21,19,15,0.06)', transform: bygg ? 'none' : 'scale(0)', transition: `transform 700ms ${LANDING} ${140 + i * 110}ms` }} />
                  <span className="absolute rounded-full" style={{ left: -5, top: -5, width: 10, height: 10, background: fargeN, boxShadow: `0 0 0 2.5px ${PAPIR}, 0 6px 14px -6px rgba(21,19,15,0.5)`, transform: bygg ? 'none' : 'translateY(-18px) scale(0.5)', transition: `transform 760ms ${LANDING} ${120 + i * 110}ms, background 500ms ${EASE} ${husleieBolge ? 180 + avst * HAST : 0}ms` }} />
                  {visEtikett && (
                    <span className={`absolute top-[-9px] whitespace-nowrap text-[12px] leading-[18px] ${hoyreSide ? 'left-[12px]' : 'right-[12px] text-right'}`} style={{ color: st === 'ok' ? 'rgba(21,19,15,0.66)' : T.ink, textShadow: `0 0 6px ${PAPIR}, 0 0 2px ${PAPIR}`, transition: `color 400ms ${EASE}` }}>
                      <span className="font-medium">{navn}</span>
                      <span style={{ color: 'rgba(21,19,15,0.45)' }}> · {enh}</span>
                    </span>
                  )}
                </div>
              );
            })}

            {/* Byen lever — små hendelser ved tilfeldige boliger, kommer og går */}
            {mikro.map((m) => {
              const p = PUNKT[m.idx]; if (!p) return null;
              const farge = MIKRO_FARGE[m.type] || T.gronn;
              return (
                <div key={m.id} className="absolute" style={{ left: p.x, top: p.y, animation: `v4-mikro 2300ms ${EASE} both`, willChange: 'transform, opacity' }} data-testid="v4m-mikro" data-type={m.type}>
                  {/* Hårlinje fra boligen til lappen — så det er tydelig hvilken prikk det gjelder */}
                  <span className="absolute top-0 h-px" style={{ left: 4, width: 8, background: 'rgba(21,19,15,0.3)' }} />
                  <span className="absolute left-[12px] top-[-11px] inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 text-[11.5px] leading-none" style={{ background: 'rgba(251,250,248,0.92)', color: 'rgba(21,19,15,0.78)', boxShadow: `inset 0 0 0 1px rgba(21,19,15,0.08), 0 8px 18px -12px rgba(21,19,15,0.4)` }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: farge }} />
                    {m.tekst}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Hendelseskortene ved nålene — glass, kommer med en fjær, forrige tones ut.
              Ligger i samme kameralag som nålene, så kort og nål glir sammen når kameraet driver. ── */}
        {maal.w > 0 && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[6]" style={{ transform: `translate(${kam.x}px, ${kam.y}px)`, transition: KAM_T, willChange: 'transform' }} data-testid="v4m-kortlag">
        {[forrige, naa].filter(Boolean).map((h) => {
          const ny = h === naa;
          const p = pkt(POS[h.ved] || [800, 500]);
          const w = smal ? 224 : 262;
          const AVST = 28;                                  // fra nålens sentrum til kortets kant
          const hoyre = p.x + AVST + w < maal.w - 12;
          const x = Math.max(12, Math.min(hoyre ? p.x + AVST : p.x - AVST - w, maal.w - w - 12));
          /* Kortets første rad (adressen) ligger i nålens høyde; hårlinjen går fra nålen rett inn til den raden.
             Må kortet flyttes for å få plass, følger linjen nålen så langt kortet rekker. */
          const y = Math.max(smal ? 64 : 84, Math.min(p.y - 19, maal.h - (smal ? 150 : 132)));
          const strekY = Math.max(10, Math.min(p.y - y, 62));
          const skjul = h.sak && sakVises && (visKort || godkjent);   // saken bytter til det mørke kortet
          if (skjul) return null;
          return (
            <div key={h.fase} className="absolute" style={{ left: x, top: y, width: w, ...GLASS.lys, ...BLUR, borderRadius: 16, transformOrigin: hoyre ? `0% ${strekY}px` : `100% ${strekY}px`, opacity: ny ? 1 : 0, transform: ny ? 'none' : 'translateY(-10px) scale(0.97)', animation: ny ? `v4-glass-inn 640ms ${FJAER} both` : 'none', transition: ny ? 'none' : `opacity 480ms ${EASE}, transform 520ms ${EASE}`, pointerEvents: 'none' }} data-testid={`v4m-kort-${h.fase}`} aria-hidden={!ny}>
              {/* Hårlinje fra nålen rett inn i kortet, i nålens høyde */}
              <span aria-hidden="true" className="absolute h-px" style={{ top: strekY, width: AVST - 6, background: 'rgba(21,19,15,0.35)', ...(hoyre ? { left: -(AVST - 6) } : { right: -(AVST - 6) }), transformOrigin: hoyre ? '0% 50%' : '100% 50%', animation: ny ? `v4-strek 420ms ${EASE} 160ms both` : 'none' }} />
              <div className="px-3.5 py-3">
                <p className="flex items-center justify-between text-[11.5px]" style={{ color: 'rgba(21,19,15,0.5)' }}>
                  <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: h.sak ? T.lilla : T.gronn }} />{h.ved}</span>
                  <span>{h.tid}</span>
                </p>
                <p className="mt-1.5 flex items-center gap-2 text-[14.5px] font-medium leading-[1.25]" style={{ color: T.ink }}>
                  {h.avatar && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={h.avatar} alt="" width={20} height={20} className="rounded-full object-cover" style={{ width: 20, height: 20, boxShadow: '0 0 0 1px rgba(21,19,15,0.1)' }} />
                  )}
                  {h.t}
                  {h.teller && <span className="ml-auto text-[15px]" style={{ ...display, letterSpacing: '-0.02em' }}><Teller vis={ny} til={d.husleieTall} fmt={d.husleieFmt} /></span>}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-[1.4]" style={{ color: 'rgba(21,19,15,0.6)' }}>{h.s}</p>
              </div>
            </div>
          );
        })}
        </div>
        )}

        {/* ── Dagslinjen nederst: hvor på dagen vi er, dagens fem hendelser som merker, og siste hendelse i klartekst ── */}
        <div className="absolute inset-x-0 bottom-0 z-[5] px-5 pb-4 pt-10 sm:px-7 sm:pb-5" style={{ background: `linear-gradient(180deg, rgba(251,250,248,0) 0%, ${PAPIR} 60%)`, opacity: inne ? 1 : 0, transition: `opacity 600ms ${EASE} 400ms` }}>
          <div className="relative hidden h-[30px] sm:block" aria-hidden="true" data-testid="v4m-dagslinje">
            <span className="absolute left-0 right-0 top-[6px] h-px" style={{ background: 'rgba(21,19,15,0.1)' }} />
            <span className="absolute left-0 top-[6px] h-px" style={{ width: `${dagPst}%`, background: 'rgba(21,19,15,0.45)', transition: `width 1200ms ${EASE}` }} />
            {HEND.map((h) => {
              const passert = naaIdx >= HEND.indexOf(h);
              return <span key={h.fase} className="absolute top-[3px] h-[7px] w-px" style={{ left: `${pst(h.tid)}%`, background: h.sak ? (passert ? T.lilla : 'rgba(212,150,255,0.5)') : passert ? 'rgba(21,19,15,0.6)' : 'rgba(21,19,15,0.2)', transition: `background 500ms ${EASE}` }} />;
            })}
            <span className="absolute top-[2.5px] h-[8px] w-[8px] -translate-x-1/2 rounded-full" style={{ left: `${dagPst}%`, background: ferdig ? T.gronn : aktiv ? T.lilla : T.ink, boxShadow: `0 0 0 2px ${PAPIR}`, transition: `left 1200ms ${EASE}, background 400ms ${EASE}` }} />
            <span className="absolute left-0 top-[15px] text-[10.5px] leading-none tabular-nums" style={{ color: 'rgba(21,19,15,0.35)' }}>07:30</span>
            <span className="absolute right-0 top-[15px] text-[10.5px] leading-none tabular-nums" style={{ color: 'rgba(21,19,15,0.35)' }}>16:30</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="flex min-w-0 items-center gap-2.5 text-[13px] text-[#15130F]/60" data-testid="v4m-scene-tekst">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ferdig ? T.gronn : aktiv ? T.lilla : 'rgba(21,19,15,0.3)', transition: 'background 400ms' }} />
              <span key={ferdig ? 'ferdig' : naa ? naa.fase : 'start'} className="truncate" style={{ animation: `v4-tall-inn 480ms ${EASE} both` }}>
                {ferdig ? 'Eieren godkjente én sak. Dere valgte én leietaker. Resten gjorde systemet.' : naa ? `${naa.tid} · ${naa.t}${naa.sak ? ' · venter på forvalter' : ''}` : 'Dagen begynner'}
              </span>
            </p>
            <button type="button" onClick={replay} className="shrink-0 text-[13px] text-[#15130F]/50 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" style={{ opacity: ferdig ? 1 : 0, pointerEvents: ferdig ? 'auto' : 'none', transition: `opacity 400ms ${EASE}` }} tabIndex={ferdig ? 0 : -1} data-testid="v4m-replay">Spill av igjen</button>
          </div>
        </div>
      </div>

      {/* ── Kameralaget for det som kan trykkes: godkjenningskortet og kvitteringen følger nålen ── */}
      <div className="pointer-events-none absolute inset-0 z-10" style={{ transform: smal ? 'none' : `translate(${kam.x}px, ${kam.y}px)`, transition: KAM_T, willChange: 'transform' }}>
      {/* ── Godkjenningskortet — mørkt glass ved Løkkeveien 14, adressert til en rolle ── */}
      <div
        aria-hidden={!visKort}
        className="absolute rounded-[18px]"
        style={{
          ...GLASS.mork, ...BLUR,
          ...(smal ? { left: 16, right: 16, bottom: 16 } : { left: kortX, top: kortY == null ? '40%' : kortY, width: kortW }),
          opacity: visKort ? 1 : 0,
          pointerEvents: visKort ? 'auto' : 'none',
          transformOrigin: '0% 100%',
          transform: visKort ? 'none' : godkjent ? 'translateY(-10px) scale(0.97)' : 'translateY(12px) scale(0.94)',
          transition: visKort ? `opacity 420ms ${EASE}, transform 620ms ${FJAER}` : `opacity 380ms ${EASE}, transform 380ms ${EASE}`,
        }}
        data-testid="v4m-kort"
      >
        {smal ? (
          <div className="flex items-center justify-between gap-4 p-3.5 pl-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12px] text-white/60"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på forvalter</p>
              <p className="mt-1 truncate text-[14px] font-medium">Velg leietaker · Løkkeveien 14</p>
              <p className="text-[13px] text-white/60">Sander Vik · anbefalt blant {d.sokere} søkere</p>
            </div>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label="Velg Sander Vik som leietaker" className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4m-godkjenn">
              {trykket && <HakeIkon />}{knappTekst}
            </button>
          </div>
        ) : (
          <div className="p-[18px]">
            <div className="flex items-center justify-between text-[12.5px] text-white/60">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på forvalter</span>
              <span>14:20</span>
            </div>
            <p className="mt-3.5 text-[15px] font-medium">Velg leietaker · Løkkeveien 14</p>
            <p className="text-[13.5px] text-white/60">{d.sokere} søknader · legitimert og kredittsjekket</p>
            <p className="mt-3 text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>Sander Vik</p>
            <p className="mt-1 text-[13px] text-white/60">27 år · fast inntekt · anbefalt</p>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label="Velg Sander Vik som leietaker" className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4m-godkjenn">
              {trykket && <HakeIkon />}{knappTekst}
            </button>
            {/* Rollekjeden — hvem gjorde hva før det landet hos deg */}
            <ol className="mt-3.5 flex flex-col gap-1 border-t pt-3 text-[11.5px] text-white/50" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
              <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/35" />Visning holdt · 12 interessenter · 10:00</li>
              <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/35" />Systemet sjekket legitimasjon og kreditt</li>
              <li className="flex items-center gap-2" style={{ color: 'rgba(244,241,234,0.85)' }}><span className="h-1 w-1 rounded-full" style={{ background: T.lilla }} />Valget er deres</li>
            </ol>
          </div>
        )}
      </div>

      {/* ── Etter godkjenning: kvitteringen ved nålen ── */}
      {maal.w > 0 && godkjent && (
        <div className="absolute" style={{ left: smal ? 16 : kortX, top: smal ? undefined : kortY == null ? '40%' : kortY, bottom: smal ? 16 : undefined, width: smal ? 'calc(100% - 32px)' : 262, ...GLASS.lys, ...BLUR, borderRadius: 16, animation: `v4-glass-inn 640ms ${FJAER} 200ms both` }} data-testid="v4m-godkjent">
          <div className="flex items-center gap-3 px-3.5 py-3">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.12)', color: '#166B3C' }}><HakeIkon /></span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium" style={{ color: T.ink }}>Sander Vik valgt · kontrakt til BankID</p>
              <p className="truncate text-[12.5px]" style={{ color: 'rgba(21,19,15,0.6)' }}>{hvem === 'deg' ? 'Valgt av dere' : 'Valgt av Jonas, forvalter'} · eieren er varslet</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </figure>
  );
}
