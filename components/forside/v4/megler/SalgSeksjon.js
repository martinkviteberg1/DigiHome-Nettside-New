'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, tall, useSekvens, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   SalgSeksjon — «Fra henvendelse til signert oppdrag.»

   Slik salget faktisk ser ut i DigiHome: et pipeline-brett med fem stadier
   (Ny 10 % → Kontaktet 25 % → Befaring 50 % → Tilbud sendt 75 % → Signert
   100 %), kort med initialer, navn, bolig, verdi i kr/år, temperatur og
   kilde. Ett kort — Kari Moen, Fjellveien 12 — kommer inn fra landingssiden
   og reiser gjennom brettet mens dagen går: berikes med boligdata og
   leieestimat, ringes, befares, får tilbud (som leses), signeres med BankID —
   og blir en enhet i drift. Kortet flyttes slik det flyttes i produktet:
   løftes, vipper 0,8°, glir, setter seg. Kolonnene teller og summerer i takt.

   På smale skjermer følger kameraet kortet (brettet glir så aktiv kolonne
   står i midten). Kun transform/opacity.
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

/* Stadiene — med produktets varme progresjon i prikkene (lys → mørk), grønt for vunnet */
const STADIER = [
  { id: 'ny', navn: 'Ny', p: 10, prikk: '#C7BFB2' },
  { id: 'kontaktet', navn: 'Kontaktet', p: 25, prikk: '#D8C4A6' },
  { id: 'befaring', navn: 'Befaring', p: 50, prikk: '#C9AD84' },
  { id: 'tilbud', navn: 'Tilbud sendt', p: 75, prikk: T.lilla },
  { id: 'signert', navn: 'Signert', p: 100, prikk: T.gronn },
];

/* De andre leadene på brettet — rolige, lave i kontrast. Verdi = meglerens honorar per år. */
const ANDRE = {
  ny: [{ n: 'Per Aasheim', d: 'Møhlenpris · 2-roms', v: 15600 }],
  kontaktet: [{ n: 'Løkkeveien Eiendom AS', d: 'Portefølje · 6 enheter', v: 118000, selskap: true }],
  befaring: [{ n: 'Anne Lise Vik', d: 'Sandviken · 4-roms', v: 26400 }, { n: 'Tor Egil Moe', d: 'Fana · rekkehus', v: 24000 }],
  tilbud: [{ n: 'Helene Strand', d: 'Laksevåg · 3-roms', v: 19200 }],
  signert: [{ n: 'Bjørn Fjeldstad', d: 'Årstad · 2-roms', v: 16800 }, { n: 'Mari Holm', d: 'Sentrum · 1-roms', v: 13200 }],
};

/* Fasene: kortet er i kolonnen med samme navn. `sec` = stadium-indeks. */
const FASER = [
  { navn: 'inn', ms: 600 },
  { navn: 'ny', ms: 1500 },
  { navn: 'beriket', ms: 1700 },
  { navn: 'kontaktet', ms: 1600 },
  { navn: 'befaring', ms: 1600 },
  { navn: 'tilbud', ms: 3400 },
  { navn: 'lest', ms: 2200 },
  { navn: 'signert', ms: 2200 },
  { navn: 'ferdig', ms: null },
];
const KOLONNE_FOR = { inn: -1, ny: 0, beriket: 0, kontaktet: 1, befaring: 2, tilbud: 3, lest: 3, signert: 4, ferdig: 4 };

/* Det kortet vet, per fase */
const KORT = {
  ny: { detalj: 'Fjellveien 12, 5019 Bergen', note: 'Fra landingssiden · 07:15', temp: 'Ny' },
  beriket: { detalj: '3-roms · 72 m² · 3. etasje', note: `Leieestimat ${tall(16800)}–${tall(18200)} kr/mnd · eiendomsregisteret`, temp: 'Varm', verdi: 21600 },
  kontaktet: { detalj: '3-roms · 72 m² · 3. etasje', note: 'Ringt 09:10 · befaring avtalt i dag', temp: 'Varm', verdi: 21600 },
  befaring: { detalj: '3-roms · 72 m² · 3. etasje', note: 'Befaring 14:00 · nøkler og bilder til annonsen', temp: 'Varm', verdi: 21600 },
  tilbud: { detalj: 'Full forvaltning · deres sats', note: 'Tilbud og oppdragsavtale sendt 15:20', temp: 'Varm', verdi: 21600 },
  lest: { detalj: 'Full forvaltning · deres sats', note: 'Åpnet 19:42 · lest 2 ganger · 4 min', temp: 'Varm', verdi: 21600 },
  signert: { detalj: 'Oppdragsavtale · BankID · 21:05', note: 'Enhet opprettet · onboarding-lenke sendt til Kari', temp: 'Signert', verdi: 21600 },
  ferdig: { detalj: 'Oppdragsavtale · BankID · 21:05', note: 'Enhet opprettet · onboarding-lenke sendt til Kari', temp: 'Signert', verdi: 21600 },
};

function Init({ navn, selskap = false, tone = 'lys' }) {
  const ini = navn.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold" style={{ background: tone === 'lilla' ? 'rgba(212,150,255,0.35)' : 'rgba(21,19,15,0.05)', color: T.ink, boxShadow: `inset 0 0 0 1px ${tone === 'lilla' ? 'rgba(21,19,15,0.08)' : HAIR}` }}>{selskap ? 'AS' : ini}</span>
  );
}

function Hake({ color = T.gronn, size = 11 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color }}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Et rolig kort — de andre leadene */
function Rolig({ k, vis, i }) {
  return (
    <div className="rounded-[14px] p-3" style={{ background: '#FFFFFF', boxShadow: `inset 0 0 0 1px ${HAIR}`, opacity: vis ? 0.7 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: `opacity 500ms ${EASE} ${120 + i * 60}ms, transform 600ms ${EASE} ${120 + i * 60}ms` }}>
      <div className="flex items-center gap-2.5">
        <Init navn={k.n} selskap={k.selskap} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium leading-[1.25]" style={{ color: T.ink }}>{k.n}</p>
          <p className="truncate text-[11px] leading-[1.3]" style={{ color: SVAK }}>{k.d}</p>
        </div>
      </div>
      <p className="mt-2.5 text-[12px] tabular-nums" style={{ color: DIM }}>{tall(k.v)} <span style={{ color: SVAK }}>kr/år</span></p>
    </div>
  );
}

/* Kortet som reiser */
function Reisende({ fase, flytter, style }) {
  const k = KORT[fase] || KORT.ny;
  const signert = fase === 'signert' || fase === 'ferdig';
  const varm = k.temp === 'Varm';
  return (
    <div className="absolute left-0 top-0 rounded-[14px] p-3" style={{ background: '#FFFFFF', boxShadow: flytter ? '0 0 0 1px rgba(21,19,15,0.10), 0 28px 60px -20px rgba(21,19,15,0.35), 0 4px 12px -4px rgba(21,19,15,0.12)' : `inset 0 0 0 1px ${signert ? 'rgba(31,157,85,0.45)' : 'rgba(21,19,15,0.14)'}, 0 10px 30px -18px rgba(21,19,15,0.25)`, ...style }} data-testid="v4m-salg-kort" data-fase={fase}>
      <div className="flex items-start gap-2.5">
        <Init navn="Kari Moen" tone="lilla" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold leading-[1.25]" style={{ color: T.ink }}>Kari Moen</p>
            <span className="shrink-0 rounded-[5px] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide" style={{ background: 'rgba(21,19,15,0.06)', color: SVAK }}>Full</span>
          </div>
          <p className="truncate text-[11.5px] leading-[1.3]" style={{ color: SVAK, transition: `opacity 300ms ${EASE}` }}>{k.detalj}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: signert ? 'rgba(31,157,85,0.14)' : varm ? 'rgba(212,150,255,0.28)' : 'rgba(21,19,15,0.06)', color: signert ? '#166B3C' : T.ink, transition: `background-color 400ms ${EASE}` }}>
          {signert ? <Hake size={9} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: varm ? T.lilla : 'rgba(21,19,15,0.35)' }} />}{k.temp}
        </span>
      </div>
      <p className="mt-2.5 truncate text-[11.5px] leading-[1.35]" style={{ color: DIM }}>{k.note}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[12.5px] tabular-nums" style={{ color: T.ink, opacity: k.verdi ? 1 : 0, transition: `opacity 400ms ${EASE}` }}>{tall(k.verdi || 0)} <span style={{ color: SVAK }}>kr/år</span></p>
        <p className="text-[10.5px] tabular-nums" style={{ color: SVAK }}>{signert ? 'i drift' : 'i dag'}</p>
      </div>
    </div>
  );
}

/* ── Tilbudet — slik det ser ut for eieren ──
   Tilbudssiden i produktet: filmatisk cover med boligen, personlig hilsen fra forvalteren, det svarte kortet
   (brutto → honorar → netto), pris, og «Aksepter tilbud» som går rett til BankID. Her som et lite ark som bygger seg
   opp del for del idet kortet står i «Tilbud sendt», får lese-kvittering, og stemples signert. */
function Tilbudsark({ fase }) {
  const vis = fase === 'tilbud' || fase === 'lest' || fase === 'signert';
  const lest = fase === 'lest' || fase === 'signert';
  const signert = fase === 'signert';
  const del = (i, y = 10) => ({ opacity: vis ? 1 : 0, transform: vis ? 'none' : `translateY(${y}px)`, transition: `opacity 520ms ${EASE} ${vis ? 260 + i * 170 : 0}ms, transform 640ms ${EASE} ${vis ? 260 + i * 170 : 0}ms` });
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-[6] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0" aria-hidden={!vis} data-testid="v4m-tilbudsark" data-vis={vis ? '1' : '0'}>
      {/* Brettet dempes bak arket */}
      <div className="absolute inset-0" style={{ background: 'rgba(251,250,248,0.72)', opacity: vis ? 1 : 0, transition: `opacity 500ms ${EASE}` }} />
      <div className="relative w-full max-w-[600px] overflow-hidden rounded-[18px]" style={{ background: '#FFFFFF', boxShadow: '0 0 0 1px rgba(21,19,15,0.08), 0 40px 90px -30px rgba(21,19,15,0.45)', opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(24px) scale(0.97)', transition: `opacity 600ms ${EASE}, transform 800ms ${EASE}` }}>
        {/* Cover: boligen, filmatisk */}
        <div className="relative h-[120px] overflow-hidden sm:h-[150px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/v4/annonse/fasade-kveld-1200.webp" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 40%', transform: vis ? 'scale(1)' : 'scale(1.08)', transition: `transform 6000ms cubic-bezier(0.25, 0.1, 0.25, 1)` }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,19,15,0.05) 0%, rgba(21,19,15,0.55) 100%)' }} />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5" style={del(0)}>
            <div className="min-w-0">
              <p className="text-[11px] font-medium" style={{ color: 'rgba(244,241,234,0.7)' }}>Tilbud · Vest Utleie AS · gyldig til 28. juni</p>
              <p className="mt-1 text-[18px] sm:text-[22px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: '#F4F1EA' }}>Kari, her er tilbudet for Fjellveien 12<span style={{ color: T.lilla }}>.</span></p>
            </div>
            <span className="hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex" style={{ background: 'rgba(244,241,234,0.16)', color: '#F4F1EA', opacity: lest ? 1 : 0, transition: `opacity 500ms ${EASE}` }}>Åpnet 19:42 · lest 2 ganger</span>
          </div>
        </div>
        {/* Arket */}
        <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:gap-5 sm:p-5">
          {/* Personlig hilsen fra forvalteren */}
          <div style={del(1)}>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.08em]" style={{ color: SVAK }}>Personlig hilsen</p>
            <p className="mt-2 text-[12.5px] leading-[1.5]" style={{ color: DIM }}>Takk for en fin befaring i dag, Kari. Leiligheten er lys, godt holdt og ligger der folk vil bo — vi anbefaler 17 500 kr i måneden og legger den ut på FINN så snart du har signert.</p>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-[10.5px] font-semibold" style={{ background: 'rgba(21,19,15,0.06)', color: T.ink }}>JH</span>
              <div>
                <p className="text-[12px] font-medium" style={{ color: T.ink }}>Jonas Haugland</p>
                <p className="text-[11px]" style={{ color: SVAK }}>Forvalter · Vest Utleie</p>
              </div>
            </div>
          </div>
          {/* Det svarte kortet: brutto → honorar → netto */}
          <div className="rounded-[14px] p-4" style={{ background: T.charcoal, color: T.offwhite, ...del(2) }}>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.08em]" style={{ color: 'rgba(244,241,234,0.55)' }}>Estimat per måned</p>
            <div className="mt-3 grid gap-2 text-[12.5px]">
              <div className="flex items-baseline justify-between gap-3"><span style={{ color: 'rgba(244,241,234,0.7)' }}>Leieinntekt</span><span className="tabular-nums">{tall(17500)} kr</span></div>
              <div className="flex items-baseline justify-between gap-3"><span style={{ color: 'rgba(244,241,234,0.7)' }}>Honorar · full forvaltning</span><span className="tabular-nums">− {tall(1400)} kr</span></div>
              <div className="flex items-baseline justify-between gap-3 border-t pt-2" style={{ borderColor: 'rgba(244,241,234,0.14)' }}><span className="font-medium">Til deg</span><span className="text-[17px] tabular-nums" style={{ ...display, letterSpacing: '-0.02em' }}>{tall(16100)} kr</span></div>
            </div>
          </div>
        </div>
        {/* Pris og aksept */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4 sm:px-5 sm:pb-5" style={del(3)}>
          <p className="text-[11.5px]" style={{ color: SVAK }}>Oppdragsavtale · ingen bindingstid · 3 mnd oppsigelse · vedlegg: hva som er inkludert</p>
          <span className="inline-flex h-9 items-center gap-2 rounded-[10px] px-3.5 text-[12.5px] font-medium" style={{ background: signert ? 'rgba(31,157,85,0.14)' : T.ink, color: signert ? '#166B3C' : '#F4F1EA', transition: `background-color 400ms ${EASE}, color 400ms ${EASE}` }} data-testid="v4m-tilbud-aksept">
            {signert ? <><Hake size={11} />Signert med BankID · 21:05</> : 'Aksepter tilbud → BankID'}
          </span>
        </div>
      </div>
    </div>
  );
}

function SalgScene({ start }) {
  /* Starter idet selve brettet er i bildet (ikke bare seksjonen) — så kortet aldri har reist før noen ser det */
  const egenRef = useRef(null);
  const egenSynlig = useSynlig(egenRef, 0.35);
  const { fase, er } = useSekvens(FASER, start && egenSynlig);
  const kol = KOLONNE_FOR[fase] ?? -1;
  const inne = er('inn');
  const brettRef = useRef(null);
  const kolRef = useRef([]);
  const [pos, setPos] = useState(null);      // {x:[], w, topp}
  const [flytter, setFlytter] = useState(false);
  const [smal, setSmal] = useState(false);

  /* Mål kolonnene: hvor kortet skal ligge */
  useEffect(() => {
    const maal = () => {
      const b = brettRef.current; if (!b) return;
      const xs = kolRef.current.map((el) => (el ? el.offsetLeft : 0));
      const w = kolRef.current[0]?.offsetWidth || 200;
      setPos({ x: xs, w });
      setSmal(window.innerWidth < 900);
    };
    maal();
    const ro = typeof ResizeObserver !== 'undefined' && brettRef.current ? new ResizeObserver(maal) : null;
    if (ro && brettRef.current) ro.observe(brettRef.current);
    window.addEventListener('resize', maal);
    return () => { ro?.disconnect(); window.removeEventListener('resize', maal); };
  }, []);

  /* Løftet mens kortet flytter kolonne */
  const sistKol = useRef(-1);
  useEffect(() => {
    if (kol !== sistKol.current && kol > 0 && sistKol.current >= 0) {
      setFlytter(true);
      const t = window.setTimeout(() => setFlytter(false), 900);
      sistKol.current = kol;
      return () => window.clearTimeout(t);
    }
    sistKol.current = kol;
    return undefined;
  }, [kol]);

  const KOLW = 224;                   // fast kolonnebredde på smale skjermer (kameraet følger)
  const GAP = 12;
  const antall = (id, i) => (ANDRE[id]?.length || 0) + (kol === i ? 1 : 0);
  const sum = (id, i) => (ANDRE[id] || []).reduce((s, k) => s + k.v, 0) + (kol === i && KORT[fase]?.verdi ? KORT[fase].verdi : 0);
  const kortTopp = 44 + 10;           // under kolonnehodet
  const kortX = pos && kol >= 0 ? pos.x[kol] : 0;
  const kamera = smal && kol > 0 ? -(kol * (KOLW + GAP)) + Math.max(0, ((brettRef.current?.parentElement?.offsetWidth || 360) - KOLW) / 2) - 20 : 0;

  return (
    <div ref={egenRef} className="relative overflow-hidden rounded-[22px]" style={{ background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 48px 100px -56px rgba(21,19,15,0.4)', opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(12px)', transition: `opacity 700ms ${EASE}, transform 900ms ${EASE}` }} data-testid="v4m-salg-scene" data-fase={fase}>
      {/* Topp: brettet heter det det heter i produktet */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6" style={{ boxShadow: `inset 0 -1px 0 ${HAIR}` }}>
        <div className="flex items-center gap-3">
          <p className="text-[15px] font-medium" style={{ color: T.ink }}>Salg</p>
          <p className="text-[12.5px]" style={{ color: SVAK }}>Huseiere · Vest Utleie AS</p>
        </div>
        <p className="text-[12.5px] tabular-nums" style={{ color: SVAK }}>Pipeline <span style={{ color: T.ink }}>{tall(STADIER.reduce((s, st, i) => s + sum(st.id, i), 0))}</span> kr/år</p>
      </div>

      {/* Brettet */}
      <div className="relative overflow-hidden px-5 pb-5 pt-4 sm:px-6 sm:pb-6" data-testid="v4m-salg-brett-vindu">
        <div ref={brettRef} className="relative" style={{ display: 'grid', gridTemplateColumns: smal ? `repeat(5, ${KOLW}px)` : 'repeat(5, minmax(0, 1fr))', gap: GAP, transform: `translateX(${Math.round(kamera)}px)`, transition: `transform 900ms ${EASE}`, minHeight: smal ? 560 : 450 }} data-testid="v4m-salg-brett">
          {STADIER.map((st, i) => {
            const aktiv = kol === i;
            const n = antall(st.id, i);
            const s = sum(st.id, i);
            return (
              <div key={st.id} ref={(el) => { kolRef.current[i] = el; }} className="min-w-0" data-testid={`v4m-salg-kol-${st.id}`}>
                {/* Kolonnehodet: prikk · navn · antall · verdi · sannsynlighet */}
                <div className="flex h-[44px] items-center gap-2 border-b" style={{ borderColor: aktiv ? 'rgba(21,19,15,0.3)' : HAIR, transition: `border-color 500ms ${EASE}` }}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: st.prikk }} />
                  <span className="truncate text-[13px] font-semibold tracking-[-0.01em]" style={{ color: T.ink }}>{st.navn}</span>
                  <span className="text-[11.5px] tabular-nums" style={{ color: SVAK, transition: `color 300ms ${EASE}` }}>{n}</span>
                  <span className="ml-auto hidden text-[10.5px] tabular-nums xl:inline" style={{ color: SVAK }}>{tall(s)} kr/år</span>
                  <span className="text-[10.5px] font-semibold tabular-nums xl:ml-0 ml-auto" style={{ color: i === 4 ? T.gronn : 'rgba(21,19,15,0.35)' }}>{st.p}%</span>
                </div>
                {/* Plass til det reisende kortet øverst i aktiv kolonne */}
                <div style={{ height: aktiv ? 118 : 0, transition: `height 600ms ${EASE}` }} aria-hidden="true" />
                <div className="mt-2.5 grid gap-2.5">
                  {(ANDRE[st.id] || []).map((k, j) => <Rolig key={k.n} k={k} vis={inne} i={i + j} />)}
                </div>
              </div>
            );
          })}

          {/* Kortet som reiser — over brettet, i aktiv kolonne */}
          {pos && kol >= 0 && (
            <Reisende
              fase={fase}
              flytter={flytter}
              style={{
                width: pos.w,
                transform: `translate(${Math.round(kortX)}px, ${kortTopp}px) ${flytter ? 'rotate(0.8deg) scale(1.02)' : 'rotate(0) scale(1)'}`,
                transition: `transform 900ms ${EASE}, box-shadow 400ms ${EASE}`,
                willChange: 'transform',
                animation: fase === 'ny' ? `v4-salg-inn 700ms ${EASE} both` : 'none',
                zIndex: 5,
              }}
            />
          )}
        </div>
        <Tilbudsark fase={fase} />
      </div>

      {/* Bunnen: det som skjedde automatisk idet det ble signert */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px] sm:px-6" style={{ background: 'rgba(21,19,15,0.03)', color: SVAK, opacity: er('signert') || er('ferdig') ? 1 : 0, transition: `opacity 600ms ${EASE} 500ms` }} data-testid="v4m-salg-bunn">
        <span className="inline-flex items-center gap-2"><Hake />Fjellveien 12 opprettet som enhet · Kari fikk lenke for bilder og boliginfo · annonsen står i kø</span>
        <span className="tabular-nums">Henvendelse → signert · <span style={{ color: T.ink }}>14 timer</span></span>
      </div>
    </div>
  );
}

const PUNKTER = [
  ['Leadet kommer ferdig', 'Fra landingssiden, skjema, telefon eller import — med boligdata fra eiendomsregisteret og leieestimat kalibrert mot deres egen portefølje.'],
  ['Tilbudet skriver seg selv — og ser ut som dere', 'Personlig hilsen fra forvalteren, boligen i cover, brutto → honorar → netto, pris og avtale. Deres logo og farger. Eieren åpner en side, ikke en PDF — og dere ser når den leses.'],
  ['Signert er i drift', 'BankID-signaturen oppretter enheten, sender eieren lenke for bilder og info, og setter annonsen i kø. Varm, lun eller kald — og varsel når noe blir liggende.'],
];

export default function SalgSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.15);
  const inn = (i, y = 16) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });
  return (
    <section id="salg" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4m-salg">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-7">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Salg</p>
            <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4m-salg-tittel">
              Fra henvendelse til signert oppdrag<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
          </div>
          <p className="max-w-[46ch] text-[17px] leading-[1.5] sm:text-[18px] lg:col-span-5 lg:pb-2" style={{ color: DIM, ...inn(2) }} data-testid="v4m-salg-ingress">
            Meglere vinner på fart og tillit. Ett lead, én dag: henvendelsen kommer inn med boligen og et leieestimat, tilbudet ligger klart, og signaturen setter boligen i drift — samme kveld.
          </p>
        </div>

        <div className="mt-10 lg:mt-14" style={inn(3, 20)}>
          <SalgScene start={synlig} />
        </div>

        <ol className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-3 lg:mt-14">
          {PUNKTER.map(([t, d], i) => (
            <li key={t} className="border-t pt-5" style={{ borderColor: HAIR, ...inn(4 + i, 12) }}>
              <p className="text-[12px] tabular-nums" style={{ color: T.lilla }}>0{i + 1}</p>
              <p className="mt-2 text-[16.5px] font-medium" style={{ color: T.ink }}>{t}</p>
              <p className="mt-2 max-w-[40ch] text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
