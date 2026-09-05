'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EASE, T, display, tall, useSekvens, useSmal, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   PortefoljeScene — «porteføljen, og dagen DigiHome tok seg av». Forsidens
   heroscene, én størrelse større.

   Lag 0  Tonal flate. Ett objekt.
   Lag 1  Porteføljen: [selskap · bygg · enheter] → byggene (venstre) og
          dagens drift (høyre) som en typografisk ledger.
   Lag 2  Ett godkjenningskort i charcoal som bryter ut av høyre kant — men
          adressert til en ROLLE: «Venter på driftssjef». Det er B2B-poenget.

   Tilstandsmaskin: inn → bygg → rad1..rad4 (husleie, saker, kontrakt, en
   kollega godkjenner noe lite) → rad5 (fasadevask, stort) → lev → krev →
   KORT (venter) → godkjent → ferdig. Ubesøkt scene: Ola (driftssjef)
   godkjenner etter 5 s så historien fullføres. Har du vært inne, venter den.

   Størrelsen (10–50 · 50–250 · 250+) bytter data og spiller fra frame 1.
--------------------------------------------------------------------------- */

const BILDE = {
  'Nygårdsgaten 5': '/v4/bygg/nygardsgaten.webp',
  'Strandgaten 12': '/v4/bygg/strandgaten.webp',
  'Solheimsgaten 8': '/v4/bygg/solheimsgaten.webp',
  'Kong Oscars gate 3': '/v4/bygg/kongoscars.webp',
  'Damsgårdsveien 41': '/v4/bygg/damsgardsveien.webp',
  'Michael Krohns gate 9': '/v4/bygg/michaelkrohns.webp',
  'Løkkeveien 14': '/v4/bygg/michaelkrohns.webp',
  'Pedersgata 22': '/v4/bygg/kongoscars.webp',
};

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
  { navn: 'inn', ms: 700 },
  { navn: 'bygg', ms: 1100 },
  { navn: 'rad1', ms: 520 },
  { navn: 'rad2', ms: 520 },
  { navn: 'rad3', ms: 520 },
  { navn: 'rad4', ms: 640 },
  { navn: 'rad5', ms: 350 },
  { navn: 'lev', ms: 350 },
  { navn: 'krev', ms: 500 },
  { navn: 'kort', ms: null },      // HOLD — venter på driftssjef (deg)
  { navn: 'godkjent', ms: 1000 },
  { navn: 'ferdig', ms: 0 },
];

const AUTO_MS = 5000;
const SCENE_H = 'clamp(620px, 70vh, 700px)';
const SCENE_H_SMAL = 'clamp(560px, 72vh, 640px)';
const HAIR = 'rgba(21,19,15,0.08)';
const PAPIR = '#FBFAF8';

/* Tall som teller opp når raden kommer (expo-out, ~1,1 s). Systemet jobber — du ser det. */
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

function Avatar({ src, alt, size = 22 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, boxShadow: '0 0 0 1px rgba(21,19,15,0.10)' }} />
  );
}

function Initial({ b, size = 22 }) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full text-[10.5px] font-medium" style={{ width: size, height: size, background: 'rgba(21,19,15,0.08)', color: 'rgba(21,19,15,0.75)', boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>{b}</span>
  );
}

function Prikk({ tilstand }) {
  const fylt = tilstand !== 'ferdig';
  return (
    <span aria-hidden="true" className="block h-[7px] w-[7px] rounded-full" style={{ background: tilstand === 'aktiv' ? T.lilla : tilstand === 'godkjent' ? T.gronn : T.flate, boxShadow: fylt ? 'none' : 'inset 0 0 0 1px rgba(21,19,15,0.35)', transition: 'background 400ms, box-shadow 400ms' }} />
  );
}

function HakeIkon({ className = '' }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Dagens rader — per størrelse. Den siste er saken som venter. */
function rader(d) {
  return [
    { fase: 'rad1', tid: '08:00', t: 'Husleie registrert', teller: true, s: `${d.innbetalt}${d.purringer ? ` · ${d.purringer} purringer sendt` : ''}` },
    { fase: 'rad2', tid: '09:12', t: 'Saker i dag', s: `${d.saker} nye · ${d.lost} rutinesaker løst` },
    { fase: 'rad3', tid: '11:40', t: 'Leiekontrakt signert', s: 'Solheimsgaten 8 · leil. 12 · BankID' },
    { fase: 'rad4', tid: '13:05', t: 'Låsbytte godkjent', s: `Nora · økonomi · ${tall(6200)} kr · Solheimsgaten 8`, avatar: { src: '/v4/kari.webp', alt: 'Nora' } },
    { fase: 'rad5', tid: '14:20', t: 'Fasadevask', s: `Strandgaten 12 · Bergen Fasade AS · uke 46 · ${tall(48000)} kr`, s2: 'Bestilt · uke 46 · beboerne i Strandgaten 12 varslet', s2Mobil: 'Bestilt · uke 46 · beboerne varslet', sak: true },
  ];
}

const SPOR = [
  { fase: 'lev', t: 'Leverandør funnet', d: 'Bergen Fasade AS · ledig uke 46' },
  { fase: 'krev', t: 'Krever godkjenning', d: `driftssjef · ${tall(48000)} kr` },
];

export default function PortefoljeScene({ storrelse = 'mellom' }) {
  const ref = useRef(null);
  const figRef = useRef(null);
  const radRef = useRef(null);
  const smal = useSmal();
  const synlig = useSynlig(ref, smal ? 0.6 : 0.35);
  const { fase, er, ferdig, replay, videre, kjorer, holder } = useSekvens(FASER, synlig);
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
  const RADER = useMemo(() => rader(d), [d]);

  const inne = er('inn');
  const bygg = er('bygg');
  const godkjent = er('godkjent');
  const aktiv = er('rad5') && !godkjent;
  const visKort = er('kort') && !godkjent;
  const venter = holder && fase === 'kort';
  const visSpor = er('lev') && !godkjent;

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

  /* Kortets topp følger den aktive raden. */
  const kortRef = useRef(null);
  const [kortTop, setKortTop] = useState(null);
  useEffect(() => {
    if (!er('kort')) return undefined;
    const mal = () => {
      if (!radRef.current || !figRef.current || !kortRef.current || !ref.current) return;
      const fig = figRef.current.getBoundingClientRect();
      const rad = radRef.current.getBoundingClientRect();
      const kortH = kortRef.current.offsetHeight;
      const midt = rad.top - fig.top - 6;   // topp-justert mot saksraden, så raden over (Nora · økonomi) holdes synlig
      const maks = ref.current.offsetHeight - kortH - 20;
      setKortTop(Math.round(Math.max(24, Math.min(midt, maks))));
    };
    mal();
    window.addEventListener('resize', mal);
    return () => window.removeEventListener('resize', mal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const knappTekst = trykket ? 'Godkjent' : 'Godkjenn';
  const statusTekst = aktiv ? 'Én sak venter på driftssjef' : 'Alt i orden';

  return (
    <figure ref={figRef} className="relative m-0" data-testid="v4b-scene-wrap">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-[20px]"
        style={{ height: sceneH, background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 40px 90px -50px rgba(21,19,15,0.35)', opacity: skifter ? 0 : 1, transition: `opacity 300ms ${EASE}` }}
        role="img"
        aria-label={`Animert eksempel: en dag i ${d.selskap} med DigiHome — ${d.bygg} bygg og ${d.enheter} enheter. Husleie registrert på tvers, saker løst, en kontrakt signert, en kollega godkjenner et låsbytte, og en fasadevask venter på driftssjefens godkjenning.`}
        data-testid="v4b-scene"
      >
        {/* ── Header: selskapet · dagens tall ── */}
        <div className="flex flex-col gap-3 px-6 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-7 sm:pt-6" style={{ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(8px)', transition: `opacity 600ms ${EASE}, transform 600ms ${EASE}` }}>
          <div className="flex min-w-0 items-center gap-3.5">
            <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] text-[13px] font-medium" style={{ background: T.flate, color: T.ink, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>{d.initialer}</span>
            <div className="min-w-0">
              <p className="truncate text-[22px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }} data-testid="v4b-selskap">{d.selskap}</p>
              <p className="mt-0.5 text-[13px] text-[#15130F]/55 sm:text-[13.5px]" data-testid="v4b-sum">{d.bygg} bygg · {d.enheter} enheter · {d.by}{dato && <span className="hidden sm:inline"> · {dato}</span>}</p>
            </div>
          </div>
          {/* Dagens beslutninger — det tallet en driftssjef bryr seg om */}
          <div className="flex shrink-0 items-center gap-5 sm:gap-6">
            <div className="text-left sm:text-right">
              <p className="text-[12px] text-[#15130F]/50">Godkjenninger i dag</p>
              <p className="mt-0.5 flex items-baseline gap-1.5 sm:justify-end">
                <span className="inline-grid text-[22px] leading-none" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }}>
                  <span className="col-start-1 row-start-1" style={{ opacity: godkjent ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>{er('rad4') ? 1 : 0}</span>
                  <span className="col-start-1 row-start-1" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 200ms` }}>2</span>
                </span>
                <span className="text-[12.5px] text-[#15130F]/45">av {d.saker} saker</span>
              </p>
            </div>
            <div className="hidden h-8 w-px sm:block" style={{ background: HAIR }} />
            <p className="flex items-center gap-2 text-[13px] text-[#15130F]/60">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: aktiv ? T.lilla : T.gronn, transition: 'background 400ms' }} />
              <span className="inline-grid">
                <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>Alt i orden</span>
                <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>{smal ? '1 venter' : '1 venter på driftssjef'}</span>
              </span>
            </p>
          </div>
        </div>

        {/* ── To kolonner: bygg (venstre, ikke på mobil) · dagens drift (høyre) ── */}
        <div className="mt-4 grid h-[calc(100%-124px)] grid-cols-1 sm:mt-6 sm:h-[calc(100%-96px)] lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          {/* Byggene — stein-kolonne med miniatyrer. Hendelsene i feeden treffer byggene her: én hendelse, flere flater. */}
          <div className="hidden min-w-0 flex-col pl-7 pr-6 pt-4 lg:flex" style={{ background: T.flate, borderRight: `1px solid ${HAIR}` }}>
            <p className="text-[13px] text-[#15130F]/45" style={{ opacity: bygg ? 1 : 0, transition: `opacity 500ms ${EASE}` }}>Bygg</p>
            <ul className="mt-2" data-testid="v4b-bygg">
              {d.byggListe.map(([navn, enh], i) => {
                const erSak = navn === 'Strandgaten 12';
                const erSol = navn === 'Solheimsgaten 8';
                let tilstand = 'ok';
                let etikett = null;
                if (erSak && aktiv) { tilstand = 'aktiv'; etikett = '1 sak venter på deg'; }
                else if (erSak && godkjent) { tilstand = 'godkjent'; etikett = 'Bestilt · uke 46'; }
                else if (erSol && er('rad4')) { tilstand = 'hendelse'; etikett = 'Låsbytte · Nora'; }
                else if (erSol && er('rad3')) { tilstand = 'hendelse'; etikett = 'Kontrakt signert'; }
                const farge = tilstand === 'aktiv' ? T.lilla : tilstand === 'godkjent' ? T.gronn : tilstand === 'hendelse' ? 'rgba(21,19,15,0.55)' : 'rgba(21,19,15,0.22)';
                return (
                  <li key={navn} className="flex items-center justify-between gap-3 py-[7px] text-[14px]" style={{ borderTop: i ? `1px solid ${HAIR}` : 'none', opacity: bygg ? 1 : 0, transform: bygg ? 'none' : 'translateY(8px)', transition: `opacity 460ms ${EASE} ${i * 70}ms, transform 460ms ${EASE} ${i * 70}ms` }}>
                    <span className="flex min-w-0 items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={BILDE[navn]} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-[8px] object-cover" style={{ boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.08)' }} />
                      <span className="min-w-0">
                        <span className="block truncate" style={{ color: tilstand === 'aktiv' ? T.ink : 'rgba(21,19,15,0.82)' }}>{navn}</span>
                        <span className="inline-grid text-[12px]">
                          <span className="col-start-1 row-start-1 whitespace-nowrap text-[#15130F]/45" style={{ opacity: etikett ? 0 : 1, transition: `opacity 260ms ${EASE}` }}>{enh} enheter</span>
                          <span className="col-start-1 row-start-1 whitespace-nowrap font-medium" style={{ color: tilstand === 'aktiv' ? T.ink : tilstand === 'godkjent' ? T.gronn : 'rgba(21,19,15,0.62)', opacity: etikett ? 1 : 0, transform: etikett ? 'none' : 'translateY(3px)', transition: `opacity 320ms ${EASE} 120ms, transform 320ms ${EASE} 120ms, color 300ms` }}>{etikett || ''}</span>
                        </span>
                      </span>
                    </span>
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: farge, transition: 'background 400ms' }} />
                  </li>
                );
              })}
              {d.flere > 0 && (
                <li className="pt-3 text-[13px] text-[#15130F]/45" style={{ opacity: bygg ? 1 : 0, transition: `opacity 460ms ${EASE} ${d.byggListe.length * 70}ms` }}>+ {d.flere} bygg til · alt i orden</li>
              )}
            </ul>
            <p className="mt-auto pb-5 text-[13px] text-[#15130F]/45" style={{ opacity: bygg ? 1 : 0, transition: `opacity 500ms ${EASE} 500ms` }}>
              Roller: driftssjef · økonomi · vaktmester
            </p>
          </div>

          {/* Dagens drift — ledger med rail */}
          <div className="flex min-w-0 flex-col px-6 pb-5 pt-4 sm:px-7" style={{ opacity: bygg ? 1 : 0, transition: `opacity 500ms ${EASE} 300ms` }} aria-hidden={!bygg}>
            <p className="text-[13px] text-[#15130F]/45 lg:hidden">Dagens drift · roller: driftssjef · økonomi · vaktmester</p>
            <p className="hidden text-[13px] text-[#15130F]/45 lg:block">Dagens drift</p>
            <ul className="relative mt-2">
              <span aria-hidden="true" className="absolute bottom-0 top-0 left-[51px] hidden w-px sm:block" style={{ background: 'rgba(21,19,15,0.14)', transformOrigin: 'top', transform: bygg ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 700ms ${EASE} 450ms` }} />
              {RADER.map((r) => {
                const vis = er(r.fase);
                const erAktiv = r.sak && aktiv;
                const dempet = !r.sak;
                const tilstand = r.sak ? (godkjent ? 'godkjent' : 'aktiv') : 'ferdig';
                return (
                  <li key={r.tid} ref={r.sak ? radRef : undefined} className="relative" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', transition: `opacity 520ms ${EASE}, transform 520ms ${EASE}` }}>
                    <span aria-hidden="true" className="absolute -inset-x-3 inset-y-0.5 rounded-[12px]" style={{ background: 'rgba(21,19,15,0.045)', opacity: erAktiv ? 1 : 0, transition: `opacity 500ms ${EASE}` }} />
                    <div className="relative grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-x-3 py-2.5 sm:grid-cols-[44px_16px_minmax(0,1fr)_auto] sm:py-3">
                      <span className="hidden pt-[3px] text-[13px] tabular-nums text-[#15130F]/45 sm:block">{r.tid}</span>
                      <span className="flex justify-center pt-[7px]"><Prikk tilstand={tilstand} /></span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-[15px] font-medium" style={{ color: dempet ? 'rgba(21,19,15,0.62)' : godkjent && r.sak ? 'rgba(21,19,15,0.85)' : T.ink, transition: 'color 400ms' }}>
                          {r.t}
                          {r.avatar && <Avatar src={r.avatar.src} alt={r.avatar.alt} size={20} />}
                        </span>
                        <span className="mt-0.5 block text-[13.5px] sm:truncate" style={{ color: dempet ? 'rgba(21,19,15,0.42)' : 'rgba(21,19,15,0.62)' }}>
                          {r.teller && <><span style={{ color: 'rgba(21,19,15,0.72)' }}><Teller vis={vis} til={d.husleieTall} fmt={d.husleieFmt} /></span> · </>}{r.s}
                        </span>

                        {r.sak && (
                          <span className="grid" style={{ gridTemplateRows: visSpor ? '1fr' : '0fr', transition: `grid-template-rows 450ms ${EASE}` }}>
                            <span className="block min-h-0 overflow-hidden">
                              <span className="mt-2 block" data-testid="v4b-spor">
                                {SPOR.map((sp) => {
                                  const v = er(sp.fase) && !godkjent;
                                  return (
                                    <span key={sp.fase} className="flex items-baseline gap-2 py-[3px] text-[13px]" style={{ opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(4px)', transition: `opacity 260ms ${EASE}, transform 260ms ${EASE}` }}>
                                      <span className="shrink-0 font-medium text-[#15130F]/85">{sp.t}</span>
                                      <span className="truncate text-[#15130F]/50">{sp.d}</span>
                                    </span>
                                  );
                                })}
                              </span>
                            </span>
                          </span>
                        )}

                        {r.sak && (
                          <span className="grid" style={{ gridTemplateRows: godkjent ? '1fr' : '0fr', transition: `grid-template-rows 500ms ${EASE}` }}>
                            <span className="block min-h-0 overflow-hidden">
                              <span className="mt-1 block text-[13.5px] text-[#15130F] sm:truncate" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 250ms` }}>{smal && r.s2Mobil ? r.s2Mobil : r.s2}</span>
                              <span className="mt-2 inline-flex items-center gap-2 text-[12.5px] text-[#15130F]/60 sm:hidden" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 300ms` }}>
                                {hvem === 'deg' ? <HakeIkon className="text-[#1F9D55]" /> : <Initial b="O" size={20} />}
                                <span>{hvem === 'deg' ? 'Godkjent av deg · driftssjef · nå' : 'Godkjent · Ola · driftssjef · 14:32'}</span>
                              </span>
                            </span>
                          </span>
                        )}
                      </span>
                      {r.sak && (
                        <span className="hidden items-center gap-2 pt-[2px] text-[12.5px] text-[#15130F]/60 sm:inline-flex" style={{ opacity: godkjent ? 1 : 0, transform: godkjent ? 'none' : 'translateY(4px)', transition: `opacity 400ms ${EASE} 200ms, transform 400ms ${EASE} 200ms` }} data-testid="v4b-godkjent">
                          {hvem === 'deg' ? <HakeIkon className="text-[#1F9D55]" /> : <Initial b="O" size={22} />}
                          <span className="whitespace-nowrap">{hvem === 'deg' ? 'Godkjent av deg · driftssjef' : 'Godkjent · Ola · driftssjef'}</span>
                        </span>
                      )}
                    </div>
                    <span aria-hidden="true" className="block h-px" style={{ background: HAIR }} />
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto flex items-center justify-between gap-4 pt-4 text-[13.5px] text-[#15130F]/50" style={{ opacity: ferdig ? 1 : 0, transition: `opacity 600ms ${EASE}` }} aria-hidden={!ferdig}>
              <span data-testid="v4b-scene-tekst">To godkjenninger i dag. Resten gjorde DigiHome.</span>
              <button type="button" onClick={replay} className="shrink-0 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" style={{ pointerEvents: ferdig ? 'auto' : 'none' }} tabIndex={ferdig ? 0 : -1} data-testid="v4b-replay">Spill igjen</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lag 2: godkjenningskortet — adressert til en rolle ── */}
      <div
        ref={kortRef}
        aria-hidden={!visKort}
        className="absolute z-10 rounded-[18px] text-[#F4F1EA]"
        style={{
          background: T.charcoal,
          boxShadow: '0 30px 60px -28px rgba(21,19,15,0.55), 0 1px 2px rgba(21,19,15,0.18)',
          ...(smal ? { left: 16, right: 16, bottom: 16 } : { right: -24, width: 300, top: kortTop == null ? '48%' : kortTop }),
          opacity: visKort ? 1 : 0,
          pointerEvents: visKort ? 'auto' : 'none',
          transform: visKort ? 'none' : godkjent ? 'translate(-14px, -6px) scale(0.96)' : 'translateX(28px)',
          transition: visKort ? `opacity 520ms ${EASE}, transform 520ms ${EASE}` : `opacity 380ms ${EASE}, transform 380ms ${EASE}`,
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
              <span className="tabular-nums">14:20</span>
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
    </figure>
  );
}
