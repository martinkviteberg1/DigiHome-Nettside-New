'use client';

import React, { useCallback, useState } from 'react';
import { EASE, T, tall } from '../motion';

/* ---------------------------------------------------------------------------
   AnnonseScene — «Fra ledig til utleid.» Samme flate og språk som DriftScene:
   sidebar i stein, papirflate, ink, lilla for handling, Diatype.

   Historien: Leilighet 2 er ledig fra 1. november. Annonsen ligger ute,
   interessentene har samlet seg, spørsmål er besvart, visninger avtalt.
   Én ting venter på eieren: velge leietaker. Trykk «Send kontrakt» → status
   skifter til «Kontrakt sendt · BankID», resten av flaten oppdaterer.
   Ingen tall/funksjoner som ikke er dekket av det siden allerede sier
   (annonse, interessenter, visning, BankID-kontrakt, depositum).
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const STEIN = '#F3F1EC';
const HAIR = 'rgba(21,19,15,0.08)';

function Avatar({ src, alt, size = 24, className = '' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={size} height={size} className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size, boxShadow: '0 0 0 1px rgba(21,19,15,0.10)' }} />
  );
}

/* Initial-avatar for interessenter (ingen ekte personer) */
function Initial({ bokstav, size = 26 }) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full text-[11.5px] font-medium" style={{ width: size, height: size, background: 'rgba(21,19,15,0.07)', color: 'rgba(21,19,15,0.72)', boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>{bokstav}</span>
  );
}

function Hake({ className = '' }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Statuschip — sekvensielt bytte */
function Status({ sendt }) {
  return (
    <span className="inline-grid">
      <span className="col-start-1 row-start-1 inline-flex h-7 items-center gap-2 rounded-full px-3 text-[12.5px] font-medium" style={{ background: 'rgba(212,150,255,0.22)', color: T.ink, opacity: sendt ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Annonse aktiv · 6 dager
      </span>
      <span className="col-start-1 row-start-1 inline-flex h-7 items-center gap-2 rounded-full px-3 text-[12.5px] font-medium" style={{ background: 'rgba(31,157,85,0.14)', color: '#166B3C', opacity: sendt ? 1 : 0, transition: `opacity 300ms ${EASE} 250ms` }}>
        <Hake />Kontrakt sendt · BankID
      </span>
    </span>
  );
}

const INTERESSENTER = [
  { n: 'Emma Sørensen', b: 'E', d: 'Visning tirsdag 17:30 · ønsker fra 1. nov', for: 'Visning avtalt', etter: 'Kontrakt sendt · signeres med BankID', valgt: true },
  { n: 'Martin Berg', b: 'M', d: 'Visning tirsdag 18:00', for: 'Visning avtalt', etter: 'Varslet · boligen er reservert' },
  { n: 'Sara Haugen', b: 'S', d: 'Spørsmål om husdyr · besvart fra annonsen', for: 'Besvart', etter: 'Varslet · boligen er reservert' },
];

/* Rad i interessentlisten — høyre chip skifter sekvensielt */
function Interessent({ p, sendt, kompakt = false }) {
  const chip = (tekst, aktiv, farge, bg) => (
    <span className="col-start-1 row-start-1 inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-medium" style={{ background: bg, color: farge, opacity: aktiv ? 1 : 0, transition: `opacity ${aktiv ? 300 : 200}ms ${EASE} ${aktiv ? 250 : 0}ms` }}>{tekst}</span>
  );
  return (
    <li className={`grid items-center gap-3 border-t ${kompakt ? 'grid-cols-[26px_minmax(0,1fr)] py-2.5' : 'grid-cols-[30px_minmax(0,1fr)_auto] py-3.5'}`} style={{ borderColor: HAIR }}>
      <Initial bokstav={p.b} size={kompakt ? 24 : 30} />
      <span className="min-w-0">
        <span className={`flex items-center gap-2 ${kompakt ? 'text-[13px]' : 'text-[14px]'} font-medium`}>
          {p.n}
          {p.valgt && <span className="inline-flex h-[18px] items-center rounded-full px-1.5 text-[10.5px] font-medium" style={{ background: 'rgba(212,150,255,0.28)', color: T.ink }}>Anbefalt</span>}
        </span>
        <span className={`mt-0.5 block truncate ${kompakt ? 'text-[12px]' : 'text-[13px]'} text-[#15130F]/55`}>{kompakt ? (sendt ? p.etter : p.d) : p.d}</span>
      </span>
      {!kompakt && (
        <span className="inline-grid justify-items-end">
          {chip(p.for, !sendt, 'rgba(21,19,15,0.72)', 'rgba(21,19,15,0.06)')}
          {chip(p.etter, sendt, p.valgt ? '#166B3C' : 'rgba(21,19,15,0.72)', p.valgt ? 'rgba(31,157,85,0.14)' : 'rgba(21,19,15,0.06)')}
        </span>
      )}
    </li>
  );
}

/* Annonsekortet — slik den ligger ute */
function AnnonseKort({ kompakt = false }) {
  return (
    <div className={`overflow-hidden rounded-[14px] ${kompakt ? '' : 'grid grid-cols-[168px_minmax(0,1fr)]'}`} style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }} data-testid="v4-annonse-kort">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/v4/bolig-oslo-1200.webp" alt="Nygårdsgaten 5" className={`${kompakt ? 'h-[128px] w-full' : 'h-full min-h-[112px] w-full'} object-cover`} style={{ objectPosition: '20% 45%' }} />
      <div className={`${kompakt ? 'px-4 py-3.5' : 'px-5 py-4'}`}>
        <p className={`${kompakt ? 'text-[14px]' : 'text-[15px]'} font-medium tracking-[-0.005em]`}>Lys 2-roms med balkong i Nygårdsgaten</p>
        <p className="mt-1 text-[13px] text-[#15130F]/60">54 m² · 2. etasje · ledig 1. november</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#15130F]/55">
          <span><span className="font-medium text-[#15130F]">{tall(12500)} kr</span> /mnd</span>
          <span>Depositum 3 mnd</span>
          <span>12 bilder</span>
        </div>
      </div>
    </div>
  );
}

/* Det ene du gjør — valgt leietaker, send kontrakt. Samme mørke kort som godkjenningen i Drift. */
function ValgKort({ sendt, trykket, onSend, className = '' }) {
  return (
    <div className={`rounded-[14px] p-5 ${className}`} style={{ background: T.charcoal, color: T.offwhite, boxShadow: '0 24px 60px -30px rgba(0,0,0,0.6)' }} data-testid="v4-valgkort">
      <div className="flex items-center justify-between text-[12px]" style={{ color: 'rgba(244,241,234,0.62)' }}>
        <span className="inline-grid">
          <span className="col-start-1 row-start-1 inline-flex items-center gap-2" style={{ opacity: sendt ? 0 : 1, transition: `opacity 200ms ${EASE}` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Klar for kontrakt</span>
          <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5" style={{ color: '#7DDBA1', opacity: sendt ? 1 : 0, transition: `opacity 300ms ${EASE} 250ms` }}><Hake />Sendt til signering</span>
        </span>
        <span className="tabular-nums">18:02</span>
      </div>
      <p className="mt-3 text-[15px] font-medium">Emma Sørensen <span style={{ color: 'rgba(244,241,234,0.62)' }}>· fra 1. november</span></p>
      <p className="mt-1 text-[13px]" style={{ color: 'rgba(244,241,234,0.62)' }}>Visning gjennomført · ønsker 3 års leie</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="whitespace-nowrap text-[18px] font-medium tracking-[-0.01em] lg:text-[20px]"><span className="tabular-nums">{tall(12500)}</span> kr<span className="text-[13px] font-normal" style={{ color: 'rgba(244,241,234,0.62)' }}> /mnd</span></span>
        <button
          type="button"
          onClick={onSend}
          disabled={trykket}
          className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 text-[14px] font-medium transition-[transform,background-color] duration-200 active:scale-[0.97] disabled:cursor-default lg:px-4"
          style={{ background: trykket ? 'rgba(212,150,255,0.55)' : T.lilla, color: T.ink }}
          data-testid="v4-send-kontrakt"
        >
          {trykket && <Hake />}{trykket ? 'Sendt' : 'Send kontrakt'}
        </button>
      </div>
    </div>
  );
}

/* ── Desktop ── */
function Desktop({ sendt, trykket, onSend }) {
  const NAV = ['Oversikt', 'Eiendommer', 'Leietakere', 'Saker', 'Økonomi', 'Dokumenter'];
  return (
    <div className="grid min-h-[680px] grid-cols-[224px_minmax(0,1fr)] text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-annonse-desktop">
      <aside className="flex flex-col border-r px-4 py-5" style={{ background: STEIN, borderColor: HAIR }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-hero-logo.svg" alt="DigiHome" className="ml-1 h-[16px] w-auto" />
        <div className="mt-6 flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[13px]" style={{ background: PAPIR, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
          <span className="font-medium">Nygårdsgaten 5</span>
          <span className="text-[#15130F]/40">▾</span>
        </div>
        <nav className="mt-5 flex flex-col gap-0.5 text-[13.5px]">
          {NAV.map((n) => {
            const er = n === 'Eiendommer';
            return (
              <span key={n} className="flex items-center justify-between rounded-[8px] px-3 py-2" style={{ background: er ? 'rgba(21,19,15,0.06)' : 'transparent', color: er ? T.ink : 'rgba(21,19,15,0.62)', fontWeight: er ? 500 : 400 }}>
                {n}
                {er && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium" style={{ background: T.lilla, color: T.ink }}>{sendt ? 0 : 1}</span>}
              </span>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 px-2 pt-6 text-[13px]">
          <Avatar src="/v4/kari.webp" alt="Kari" size={26} />
          <span><span className="block font-medium">Kari Nilsen</span><span className="block text-[11.5px] text-[#15130F]/50">Eier</span></span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="flex h-12 items-center justify-between border-b px-7 text-[13px] text-[#15130F]/55" style={{ borderColor: HAIR }}>
          <span>Eiendommer <span className="mx-1.5 text-[#15130F]/30">/</span> Nygårdsgaten 5 <span className="mx-1.5 text-[#15130F]/30">/</span> <span className="text-[#15130F]">Leilighet 2 · Utleie</span></span>
          <span className="tabular-nums">I dag</span>
        </div>
        <div className="px-7 pb-7 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[22px] font-medium tracking-[-0.01em]">Leilighet 2 · ledig fra 1. november</h3>
              <p className="mt-1 text-[13px] text-[#15130F]/55">3 interessenter · 2 visninger · 1 spørsmål besvart</p>
            </div>
            <Status sendt={sendt} />
          </div>

          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_340px] gap-6">
            {/* Venstre: annonsen + interessenter */}
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[#15130F]/45">Annonsen</p>
              <div className="mt-3"><AnnonseKort /></div>

              <p className="mt-6 text-[13px] font-medium text-[#15130F]/45">Interessenter</p>
              <ol className="mt-2">
                {INTERESSENTER.map((p) => <Interessent key={p.n} p={p} sendt={sendt} />)}
              </ol>
            </div>

            {/* Høyre: valget (det ene du gjør) + detaljer */}
            <div className="flex flex-col gap-4">
              <ValgKort sendt={sendt} trykket={trykket} onSend={onSend} />
              <div className="rounded-[14px] p-5 text-[13px]" style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
                <p className="text-[13px] font-medium text-[#15130F]/45">Detaljer</p>
                <dl className="mt-3 grid grid-cols-[96px_minmax(0,1fr)] gap-y-2.5">
                  <dt className="text-[#15130F]/50">Enhet</dt><dd>Leilighet 2 · 54 m²</dd>
                  <dt className="text-[#15130F]/50">Husleie</dt><dd className="font-medium">{tall(12500)} kr /mnd</dd>
                  <dt className="text-[#15130F]/50">Depositum</dt><dd>3 mnd · {tall(37500)} kr</dd>
                  <dt className="text-[#15130F]/50">Ledig fra</dt><dd>1. november</dd>
                  <dt className="text-[#15130F]/50">Leietaker</dt>
                  <dd className="inline-grid">
                    <span className="col-start-1 row-start-1" style={{ opacity: sendt ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>Venter på deg</span>
                    <span className="col-start-1 row-start-1 text-[#166B3C]" style={{ opacity: sendt ? 1 : 0, transition: `opacity 300ms ${EASE} 250ms` }}>Emma Sørensen · kontrakt sendt</span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Under lg: samme sak i smal produktflate ── */
function Kompakt({ sendt, trykket, onSend }) {
  return (
    <div className="flex flex-col text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-annonse-kompakt">
      <div className="flex h-11 items-center justify-between border-b px-4 text-[12.5px] text-[#15130F]/55" style={{ borderColor: HAIR }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-hero-logo.svg" alt="DigiHome" className="h-[14px] w-auto" />
        <span>Nygårdsgaten 5</span>
      </div>
      <div className="px-4 pt-4">
        <p className="text-[12.5px] text-[#15130F]/50">Eiendommer <span className="mx-1 text-[#15130F]/30">/</span> Leilighet 2 · Utleie</p>
        <h4 className="mt-0.5 text-[20px] font-medium tracking-[-0.01em]">Ledig fra 1. november</h4>
        <p className="mt-1 text-[12.5px] text-[#15130F]/55">3 interessenter · 2 visninger · 1 spørsmål besvart</p>
        <div className="mt-3"><Status sendt={sendt} /></div>
      </div>

      <ValgKort className="mx-4 mt-4" sendt={sendt} trykket={trykket} onSend={onSend} />

      <div className="mx-4 mt-4"><AnnonseKort kompakt /></div>

      <ol className="mx-4 mt-4 text-[12.5px]">
        {INTERESSENTER.map((p) => <Interessent key={p.n} p={p} sendt={sendt} kompakt />)}
      </ol>
      <div className="h-5" />
    </div>
  );
}

export default function AnnonseScene({ synlig, tema = 'mork' }) {
  const [sendt, setSendt] = useState(false);
  const [trykket, setTrykket] = useState(false);
  const send = useCallback(() => {
    if (trykket) return;
    setTrykket(true);
    window.setTimeout(() => setSendt(true), 320);
  }, [trykket]);
  const nullstill = () => { setTrykket(false); setSendt(false); };

  const inn = (delay) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(28px)', transition: `opacity 800ms ${EASE} ${delay}ms, transform 800ms ${EASE} ${delay}ms` });
  const lys = tema === 'lys';
  const skygge = lys
    ? '0 0 0 1px rgba(21,19,15,0.08), 0 60px 120px -40px rgba(21,19,15,0.35)'
    : '0 0 0 1px rgba(244,241,234,0.12), 0 70px 120px -50px rgba(0,0,0,0.75)';

  return (
    <div className="relative mx-auto w-full max-w-[min(1400px,86vw)]" data-testid="v4-annonse-scene">
      <div className="hidden overflow-hidden rounded-[18px] lg:block" style={{ boxShadow: skygge, ...inn(0) }}>
        <Desktop sendt={sendt} trykket={trykket} onSend={send} />
      </div>
      <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-[18px] lg:hidden" style={{ boxShadow: skygge, ...inn(0) }}>
        <Kompakt sendt={sendt} trykket={trykket} onSend={send} />
      </div>
      <div className="absolute inset-x-0 -bottom-9 flex justify-center lg:-bottom-10" style={{ opacity: sendt ? 1 : 0, transition: `opacity 400ms ${EASE} 600ms` }} aria-hidden={!sendt}>
        <button type="button" onClick={nullstill} tabIndex={sendt ? 0 : -1} className={`text-[13px] underline underline-offset-4 ${lys ? 'decoration-[#15130F]/30' : 'decoration-[#F4F1EA]/30'}`} style={{ color: lys ? 'rgba(21,19,15,0.6)' : 'rgba(244,241,234,0.6)', pointerEvents: sendt ? 'auto' : 'none' }} data-testid="v4-annonse-nullstill">Tilbakestill</button>
      </div>
    </div>
  );
}
