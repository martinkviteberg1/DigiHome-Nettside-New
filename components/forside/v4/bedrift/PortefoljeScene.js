'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EASE, T, display, tall, useSekvens, useSmal, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   PortefoljeScene v2 — «byen er dashbordet».

   Porteføljen på autopilot vises der den faktisk er: på kartet over Bergen.
   Hvert bygg er en nål. Dagen spilles som glasskort ved nålene — husleien
   kommer inn over hele byen (nålene pulser grønt i en bølge), saker løses,
   en kontrakt signeres, en kollega godkjenner et låsbytte, og én sak venter
   på driftssjefen: fasadevasken i Strandgaten 12. Den er interaktiv — trykk
   Godkjenn, eller la Ola ta den etter 5 s.

   Samme kart som Annonse-scenen og boligkortet i heroen på forsiden — én
   visuell identitet for «boligen» og «byen» gjennom hele nettstedet.

   Tilstandsmaskin: inn → bygg (nålene lander) → rad1..rad5 (kort ved nålene)
   → lev → krev → KORT (venter) → godkjent → ferdig.
   Størrelsen (10–50 · 50–250 · 250+) bytter data og spiller fra frame 1.
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
};
/* Anonyme småbygg («+3 bygg til») */
const FLERE = [[1080, 560], [560, 470], [960, 640], [1120, 760], [430, 560], [1260, 260], [870, 190], [660, 640], [1020, 430], [760, 350], [1180, 500], [1300, 700], [610, 800], [1330, 540], [480, 320], [1040, 860], [880, 880], [1230, 800], [380, 700], [1370, 400], [960, 130], [700, 180], [1100, 190], [540, 880], [1400, 620]];

export const STORRELSER = {
  liten: {
    navn: '10–50', selskap: 'Vestland Eiendom AS', initialer: 'VE', by: 'Bergen', bygg: 3, enheter: 38,
    husleieTall: 494000, husleieFmt: (n) => `${tall(Math.round(n))} kr`, innbetalt: '38 av 38', purringer: 0, saker: 6, lost: 5,
    byggListe: [['Nygårdsgaten 5', 8], ['Strandgaten 12', 14], ['Solheimsgaten 8', 16]], flere: 0,
  },
  mellom: {
    navn: '50–250', selskap: 'Bergen Bolig AS', initialer: 'BB', by: 'Bergen', bygg: 9, enheter: 214,
    husleieTall: 2.78, husleieFmt: (n) => `${n.toFixed(2).replace('.', ',')} mill.`, innbetalt: '211 av 214', purringer: 3, saker: 14, lost: 11,
    byggListe: [['Nygårdsgaten 5', 8], ['Strandgaten 12', 24], ['Solheimsgaten 8', 32], ['Kong Oscars gate 3', 18], ['Damsgårdsveien 41', 40], ['Michael Krohns gate 9', 28]], flere: 3,
  },
  stor: {
    navn: '250+', selskap: 'Nordvest Eiendom', initialer: 'NE', by: 'Bergen · Stavanger', bygg: 31, enheter: 640,
    husleieTall: 8.3, husleieFmt: (n) => `${n.toFixed(1).replace('.', ',')} mill.`, innbetalt: '632 av 640', purringer: 8, saker: 41, lost: 36,
    byggListe: [['Nygårdsgaten 5', 8], ['Strandgaten 12', 24], ['Solheimsgaten 8', 32], ['Damsgårdsveien 41', 40], ['Løkkeveien 14', 36], ['Pedersgata 22', 22]], flere: 25,
  },
};

const FASER = [
  { navn: 'inn', ms: 600 },
  { navn: 'bygg', ms: 1500 },
  { navn: 'rad1', ms: 2300 },
  { navn: 'rad2', ms: 2100 },
  { navn: 'rad3', ms: 2000 },
  { navn: 'rad4', ms: 2100 },
  { navn: 'rad5', ms: 900 },
  { navn: 'lev', ms: 700 },
  { navn: 'krev', ms: 600 },
  { navn: 'kort', ms: null },      // HOLD — venter på driftssjef (deg)
  { navn: 'godkjent', ms: 1200 },
  { navn: 'ferdig', ms: 0 },
];

const AUTO_MS = 5000;
const SCENE_H = 'clamp(620px, 70vh, 700px)';
const SCENE_H_SMAL = 'clamp(520px, 68vh, 600px)';
const HAIR = 'rgba(21,19,15,0.08)';
const PAPIR = '#FBFAF8';
const FJAER = 'cubic-bezier(0.34, 1.45, 0.64, 1)';
const LANDING = 'cubic-bezier(0.22, 1.2, 0.36, 1)';

/* Glass — samme materialer som forsidens hero */
const GLASS = {
  lys: { background: 'rgba(251,250,248,0.78)', color: T.ink, border: '1px solid rgba(255,255,255,0.75)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 22px 50px -24px rgba(21,19,15,0.35)' },
  mork: { background: 'rgba(34,31,26,0.9)', color: '#F4F1EA', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 30px 60px -28px rgba(21,19,15,0.6)' },
};
const BLUR = { backdropFilter: 'blur(14px) saturate(140%)', WebkitBackdropFilter: 'blur(14px) saturate(140%)' };

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
    { fase: 'rad1', ved: 'Nygårdsgaten 5', tid: '08:00', t: 'Husleie registrert', teller: true, s: `${d.innbetalt}${d.purringer ? ` · ${d.purringer} purringer sendt` : ''}`, alle: true },
    { fase: 'rad2', ved: 'Kong Oscars gate 3', tid: '09:12', t: `${d.saker} saker i dag`, s: `${d.lost} rutinesaker løst automatisk · ${d.saker - d.lost} til folk` },
    { fase: 'rad3', ved: 'Solheimsgaten 8', tid: '11:40', t: 'Leiekontrakt signert', s: 'Leil. 12 · BankID · 3 år' },
    { fase: 'rad4', ved: 'Solheimsgaten 8', tid: '13:05', t: 'Låsbytte godkjent', s: `Nora · økonomi · ${tall(6200)} kr`, avatar: '/v4/kari.webp' },
    { fase: 'rad5', ved: 'Strandgaten 12', tid: '14:20', t: 'Fasadevask', s: `Bergen Fasade AS · uke 46 · ${tall(48000)} kr`, sak: true },
  ];
}

export default function PortefoljeScene({ storrelse = 'mellom' }) {
  const ref = useRef(null);
  const figRef = useRef(null);
  const smal = useSmal();
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

  const inne = er('inn');
  const bygg = er('bygg');
  const godkjent = er('godkjent');
  const aktiv = er('rad5') && !godkjent;
  const visKort = er('kort') && !godkjent;
  const venter = holder && fase === 'kort';

  const [dato, setDato] = useState('');
  useEffect(() => {
    try { setDato(new Date().toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })); } catch (e) { /* ok */ }
  }, []);

  /* Hvem godkjente? 'deg' når du trykket, 'ola' når historien løste seg selv. */
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
    let t = window.setTimeout(() => { if (!harRort.current) godkjenn('ola'); }, AUTO_MS);
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
    if (navn === 'Strandgaten 12' && aktiv) return 'aktiv';
    if (navn === 'Strandgaten 12' && godkjent) return 'godkjent';
    if (naa && naa.ved === navn && !naa.alle) return 'hendelse';
    return 'ok';
  };
  const husleieBolge = fase === 'rad1';

  const knappTekst = trykket ? 'Godkjent' : 'Godkjenn';
  const kortVed = pkt(POS['Strandgaten 12']);
  const kortW = smal ? Math.min(300, maal.w - 32) : 292;
  const kortX = smal ? 16 : Math.min(kortVed.x + 26, maal.w - kortW - 16);
  const kortY = smal ? null : Math.max(72, Math.min(kortVed.y - 40, maal.h - 300));

  return (
    <figure ref={figRef} className="relative m-0" data-testid="v4b-scene-wrap">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-[22px]"
        style={{ height: sceneH, background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 40px 90px -50px rgba(21,19,15,0.35)', opacity: skifter ? 0 : 1, transition: `opacity 300ms ${EASE}` }}
        role="img"
        aria-label={`Animert eksempel: en dag i ${d.selskap} med DigiHome — ${d.bygg} bygg og ${d.enheter} enheter på kartet over ${d.by}. Husleie registrert på tvers, saker løst, en kontrakt signert, en kollega godkjenner et låsbytte, og en fasadevask venter på driftssjefens godkjenning.`}
        data-testid="v4b-scene"
      >
        {/* ── Kartet — tone-i-tone, kommer opp rolig med en svak innzoom ── */}
        {maal.w > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity: inne ? 1 : 0, transition: `opacity 1200ms ${EASE}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={smal ? '/v4/annonse/bergen-kart-m.svg' : '/v4/annonse/bergen-kart.svg'} alt="" width={1600} height={1000} draggable={false} className="absolute select-none" style={{ left: cx, top: cy, width: 1600, height: 1000, maxWidth: 'none', transform: `translate(-50%, -50%) scale(${inne ? sk : sk * 1.06})`, transformOrigin: '50% 50%', transition: `transform 2600ms cubic-bezier(0.3, 0.05, 0.7, 0.95)`, opacity: smal ? 0.7 : 1 }} />
            {/* Lys vignett — kantene toner mot papiret så kartet ikke slutter brått */}
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 72% at 50% 55%, rgba(251,250,248,0) 45%, ${PAPIR} 100%)` }} />
          </div>
        )}

        {/* ── Hodet: selskapet · dagens tall ── */}
        <div className="relative z-[5] flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6" style={{ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(8px)', transition: `opacity 600ms ${EASE} 150ms, transform 600ms ${EASE} 150ms` }}>
          <div className="min-w-0">
            <p className="truncate text-[22px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }} data-testid="v4b-selskap">{d.selskap}</p>
            <p className="mt-1 text-[13px] text-[#15130F]/55 sm:text-[13.5px]" data-testid="v4b-sum">{d.bygg} bygg · {d.enheter} enheter · {d.by}{dato && <span className="hidden sm:inline"> · {dato}</span>}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4 sm:gap-6">
            <div className="text-right">
              <p className="text-[12px] text-[#15130F]/50">Godkjenninger i dag</p>
              <p className="mt-0.5 flex items-baseline justify-end gap-1.5">
                <span className="inline-grid text-[22px] leading-none" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }}>
                  <span className="col-start-1 row-start-1" style={{ opacity: godkjent ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>{er('rad4') ? 1 : 0}</span>
                  <span className="col-start-1 row-start-1" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 200ms` }}>2</span>
                </span>
                <span className="text-[12.5px] text-[#15130F]/45">av {d.saker}</span>
              </p>
            </div>
            <div className="hidden h-8 w-px sm:block" style={{ background: HAIR }} />
            <p className="hidden items-center gap-2 text-[13px] text-[#15130F]/60 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: aktiv ? T.lilla : T.gronn, transition: 'background 400ms', animation: aktiv ? 'v4-puls-dot 1400ms ease-in-out infinite' : 'none' }} />
              <span className="inline-grid">
                <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>Alt i orden</span>
                <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>1 venter på driftssjef</span>
              </span>
            </p>
          </div>
        </div>

        {/* ── Nålene ── */}
        {maal.w > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3]" data-testid="v4b-bygg">
            {FLERE.slice(0, d.flere).map(([X, Y], i) => {
              const p = pkt([X, Y]);
              return <span key={`f${i}`} className="absolute h-[5px] w-[5px] rounded-full" style={{ left: p.x - 2.5, top: p.y - 2.5, background: husleieBolge ? 'rgba(31,157,85,0.55)' : 'rgba(21,19,15,0.22)', opacity: bygg ? 1 : 0, transform: bygg ? 'none' : 'scale(0.3)', transition: `opacity 500ms ${EASE} ${300 + i * 40}ms, transform 700ms ${LANDING} ${300 + i * 40}ms, background 600ms ${EASE} ${husleieBolge ? 200 + i * 45 : 0}ms` }} />;
            })}
            {d.byggListe.map(([navn, enh], i) => {
              const p = pkt(POS[navn] || [800, 500]);
              const st = tilstand(navn);
              const farge = st === 'aktiv' ? T.lilla : st === 'godkjent' ? T.gronn : husleieBolge ? T.gronn : T.ink;
              const hoyreSide = p.x < maal.w * 0.62;   // etiketten til høyre for nålen når det er plass
              const dekket = !!(naa && naa.ved === navn) || (navn === 'Strandgaten 12' && (visKort || godkjent));   // et kort står ved nålen
              const visEtikett = (!smal || st !== 'ok') && !dekket;
              return (
                <div key={navn} className="absolute" style={{ left: p.x, top: p.y, opacity: bygg ? 1 : 0, transition: `opacity 400ms ${EASE} ${120 + i * 110}ms` }} data-testid={`v4b-naal-${i}`} data-tilstand={st}>
                  {/* Landingsring */}
                  <span className="absolute rounded-full" style={{ left: -14, top: -14, width: 28, height: 28, boxShadow: `inset 0 0 0 1px ${farge}`, opacity: 0, animation: bygg ? `v4-ring-en 900ms ${EASE} ${200 + i * 110}ms both` : 'none' }} />
                  {/* Husleiebølgen: én ring per nål, forskjøvet etter avstand fra sentrum */}
                  {husleieBolge && <span className="absolute rounded-full" style={{ left: -14, top: -14, width: 28, height: 28, boxShadow: `inset 0 0 0 1.5px ${T.gronn}`, opacity: 0, animation: `v4-ring-en 1100ms ${EASE} ${200 + Math.hypot(p.x - cx, p.y - cy) * 1.4}ms both` }} />}
                  {/* Aktiv sak: pulserende ring */}
                  {st === 'aktiv' && <span className="absolute rounded-full" style={{ left: -14, top: -14, width: 28, height: 28, boxShadow: `inset 0 0 0 1.5px ${T.lilla}`, animation: 'v4-ring-pust 1800ms ease-in-out infinite' }} />}
                  <span className="absolute rounded-full" style={{ left: -5, top: -5, width: 10, height: 10, background: farge, boxShadow: `0 0 0 2.5px ${PAPIR}, 0 6px 14px -6px rgba(21,19,15,0.5)`, transform: bygg ? 'none' : 'translateY(-18px) scale(0.5)', transition: `transform 760ms ${LANDING} ${120 + i * 110}ms, background 500ms ${EASE} ${husleieBolge ? 200 + Math.hypot(p.x - cx, p.y - cy) * 1.4 : 0}ms` }} />
                  {visEtikett && (
                    <span className={`absolute top-[-9px] whitespace-nowrap text-[12px] leading-[18px] ${hoyreSide ? 'left-[12px]' : 'right-[12px] text-right'}`} style={{ color: st === 'ok' ? 'rgba(21,19,15,0.62)' : T.ink, transition: `color 400ms ${EASE}` }}>
                      <span className="font-medium">{navn}</span>
                      <span style={{ color: 'rgba(21,19,15,0.45)' }}> · {enh}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Hendelseskortene ved nålene — glass, kommer med en fjær, forrige tones ut ── */}
        {maal.w > 0 && [forrige, naa].filter(Boolean).map((h) => {
          const ny = h === naa;
          const p = pkt(POS[h.ved] || [800, 500]);
          const w = smal ? 224 : 262;
          const hoyre = p.x + 26 + w < maal.w - 12;
          const x = Math.max(12, Math.min(hoyre ? p.x + 26 : p.x - 26 - w, maal.w - w - 12));
          const y = Math.max(smal ? 64 : 76, Math.min(p.y - (h.teller ? 74 : 58), maal.h - 120));
          const skjul = h.sak && sakVises && (visKort || godkjent);   // saken bytter til det mørke kortet
          if (skjul) return null;
          return (
            <div key={h.fase} className="absolute z-[6]" style={{ left: x, top: y, width: w, ...GLASS.lys, ...BLUR, borderRadius: 16, transformOrigin: hoyre ? '0% 100%' : '100% 100%', opacity: ny ? 1 : 0, transform: ny ? 'none' : 'translateY(-14px) scale(0.96)', animation: ny ? `v4-glass-inn 640ms ${FJAER} both` : 'none', transition: ny ? 'none' : `opacity 480ms ${EASE}, transform 520ms ${EASE}`, pointerEvents: 'none' }} data-testid={`v4b-kort-${h.fase}`} aria-hidden={!ny}>
              {/* Hårlinje til nålen */}
              <span aria-hidden="true" className="absolute bottom-[10px] h-px" style={{ width: 26, background: 'rgba(21,19,15,0.35)', ...(hoyre ? { left: -26 } : { right: -26 }) }} />
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

        {/* ── Dagens drift — den stille linjen nederst: siste hendelse, og «Spill igjen» når dagen er over ── */}
        <div className="absolute inset-x-0 bottom-0 z-[5] flex items-center justify-between gap-4 px-5 pb-4 pt-8 sm:px-7 sm:pb-5" style={{ background: `linear-gradient(180deg, rgba(251,250,248,0) 0%, ${PAPIR} 70%)`, opacity: inne ? 1 : 0, transition: `opacity 600ms ${EASE} 400ms` }}>
          <p className="flex min-w-0 items-center gap-2.5 text-[13px] text-[#15130F]/60" data-testid="v4b-scene-tekst">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ferdig ? T.gronn : aktiv ? T.lilla : 'rgba(21,19,15,0.3)', transition: 'background 400ms' }} />
            <span key={ferdig ? 'ferdig' : naa ? naa.fase : 'start'} className="truncate animate-in fade-in-0 duration-500">
              {ferdig ? 'To godkjenninger i dag. Resten gjorde DigiHome.' : naa ? `${naa.tid} · ${naa.t}${naa.sak ? ' · venter på driftssjef' : ''}` : 'Dagen begynner'}
            </span>
          </p>
          <button type="button" onClick={replay} className="shrink-0 text-[13px] text-[#15130F]/50 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" style={{ opacity: ferdig ? 1 : 0, pointerEvents: ferdig ? 'auto' : 'none', transition: `opacity 400ms ${EASE}` }} tabIndex={ferdig ? 0 : -1} data-testid="v4b-replay">Spill igjen</button>
        </div>
      </div>

      {/* ── Godkjenningskortet — mørkt glass ved Strandgaten 12, adressert til en rolle ── */}
      <div
        aria-hidden={!visKort}
        className="absolute z-10 rounded-[18px]"
        style={{
          ...GLASS.mork, ...BLUR,
          ...(smal ? { left: 16, right: 16, bottom: 16 } : { left: kortX, top: kortY == null ? '40%' : kortY, width: kortW }),
          opacity: visKort ? 1 : 0,
          pointerEvents: visKort ? 'auto' : 'none',
          transformOrigin: '0% 100%',
          transform: visKort ? 'none' : godkjent ? 'translateY(-10px) scale(0.97)' : 'translateY(12px) scale(0.94)',
          transition: visKort ? `opacity 420ms ${EASE}, transform 620ms ${FJAER}` : `opacity 380ms ${EASE}, transform 380ms ${EASE}`,
        }}
        data-testid="v4b-kort"
      >
        {smal ? (
          <div className="flex items-center justify-between gap-4 p-3.5 pl-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12px] text-white/60"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på driftssjef</p>
              <p className="mt-1 truncate text-[14px] font-medium">Fasadevask · Strandgaten 12</p>
              <p className="text-[13px] text-white/60">Uke 46 · {tall(48000)} kr</p>
            </div>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label={`Godkjenn fasadevask, ${tall(48000)} kroner`} className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4b-godkjenn">
              {trykket && <HakeIkon />}{knappTekst}
            </button>
          </div>
        ) : (
          <div className="p-[18px]">
            <div className="flex items-center justify-between text-[12.5px] text-white/60">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på driftssjef</span>
              <span>14:20</span>
            </div>
            <p className="mt-3.5 text-[15px] font-medium">Fasadevask · Strandgaten 12</p>
            <p className="text-[13.5px] text-white/60">Bergen Fasade AS · uke 46</p>
            <p className="mt-3 text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(48000)} kr</p>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label={`Godkjenn fasadevask, ${tall(48000)} kroner`} className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4b-godkjenn">
              {trykket && <HakeIkon />}{knappTekst}
            </button>
            {/* Rollekjeden — hvem gjorde hva før det landet hos deg */}
            <ol className="mt-3.5 flex flex-col gap-1 border-t pt-3 text-[11.5px] text-white/50" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
              <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/35" />Vaktmester meldte · 14:02</li>
              <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/35" />DigiHome fant leverandør og pris</li>
              <li className="flex items-center gap-2" style={{ color: 'rgba(244,241,234,0.85)' }}><span className="h-1 w-1 rounded-full" style={{ background: T.lilla }} />Krever driftssjef — deg</li>
            </ol>
          </div>
        )}
      </div>

      {/* ── Etter godkjenning: kvitteringen ved nålen ── */}
      {maal.w > 0 && godkjent && (
        <div className="absolute z-[7]" style={{ left: smal ? 16 : kortX, top: smal ? undefined : kortY == null ? '40%' : kortY, bottom: smal ? 16 : undefined, width: smal ? 'calc(100% - 32px)' : 262, ...GLASS.lys, ...BLUR, borderRadius: 16, animation: `v4-glass-inn 640ms ${FJAER} 200ms both` }} data-testid="v4b-godkjent">
          <div className="flex items-center gap-3 px-3.5 py-3">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.12)', color: '#166B3C' }}><HakeIkon /></span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium" style={{ color: T.ink }}>Fasadevask bestilt · uke 46</p>
              <p className="truncate text-[12.5px]" style={{ color: 'rgba(21,19,15,0.6)' }}>{hvem === 'deg' ? 'Godkjent av deg · driftssjef' : 'Godkjent · Ola · driftssjef'} · beboerne varslet</p>
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}
