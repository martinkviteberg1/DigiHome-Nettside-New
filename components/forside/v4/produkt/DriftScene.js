'use client';

import React, { useCallback, useState } from 'react';
import { EASE, T, display, tall } from '../motion';

/* ---------------------------------------------------------------------------
   DriftScene — én jobb DigiHome løser, på én flate.

   Ett objekt, sentrert: saken slik eieren ser den — historikk, leverandør,
   detaljer og godkjenningskortet (samme kort som i heroen). Ingen laptop,
   ingen browser-ramme, ingen telefon ved siden av: bare produktflaten.
   Én interaksjon: trykk Godkjenn i kortet, resten av flaten oppdaterer.

   Under lg vises samme sak i smal produktflate (produktet i mobilbredde —
   ikke en «telefon-mockup»).

   Visuelt språk følger portalen: lys flate (#FBFAF8), sidebar i stein,
   ink-tekst, lilla for aktiv/handling, Diatype. Alt tro mot det produktet gjør.
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

function Hake({ className = '' }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Statuschip — bytter sekvensielt (aldri to tekster samtidig) */
function Status({ godkjent }) {
  return (
    <span className="inline-grid">
      <span className="col-start-1 row-start-1 inline-flex h-7 items-center gap-2 rounded-full px-3 text-[12.5px] font-medium" style={{ background: 'rgba(212,150,255,0.22)', color: T.ink, opacity: godkjent ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på godkjenning
      </span>
      <span className="col-start-1 row-start-1 inline-flex h-7 items-center gap-2 rounded-full px-3 text-[12.5px] font-medium" style={{ background: 'rgba(31,157,85,0.14)', color: '#166B3C', opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 250ms` }}>
        <Hake />Bestilt · torsdag 09:00
      </span>
    </span>
  );
}

const HISTORIKK = [
  { tid: '22:41', t: 'Ida meldte', d: '«Varmtvannet er borte i hele leiligheten. Har vært sånn siden i kveld.»', sitat: true, avatar: '/v4/ida.webp' },
  { tid: '22:41', t: 'Sak opprettet automatisk', d: 'Kategori VVS · prioritet høy · hele bygget varslet' },
  { tid: '22:43', t: 'Leverandør funnet', d: 'Rørlegger AS · fast leverandør · ledig torsdag 09:00' },
  { tid: '22:43', t: 'Pris innhentet', d: `${tall(3450)} kr inkl. mva · sendt til deg for godkjenning` },
];

/* ── Godkjenningskortet — samme kort som i heroen, nå inne i produktet. Kompakt: én beslutning, to rader. ── */
function GodkjenningKort({ godkjent, trykket, onGodkjenn, className = '' }) {
  return (
    <div className={`rounded-[14px] px-4 pb-4 pt-3.5 text-[#F4F1EA] ${className}`} style={{ background: T.charcoal }} data-testid="v4-godkjenning-kort">
      <div className="flex items-center justify-between text-[12px] text-white/55">
        <span className="inline-grid">
          <span className="col-start-1 row-start-1 flex items-center gap-2" style={{ opacity: godkjent ? 0 : 1, transition: `opacity 200ms ${EASE}` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</span>
          <span className="col-start-1 row-start-1 flex items-center gap-2" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 250ms` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />Bestilt · Ida varslet</span>
        </span>
        <span className="tabular-nums">22:43</span>
      </div>
      <p className="mt-2 text-[14px] font-medium">Rørlegger AS <span className="font-normal text-white/55">· torsdag 09:00</span></p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[22px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(3450)} kr</span>
        <button
          type="button"
          onClick={onGodkjenn}
          disabled={godkjent}
          aria-label={`Godkjenn rørlegger, ${tall(3450)} kroner`}
          className="inline-flex h-9 min-w-[112px] items-center justify-center gap-1.5 rounded-[9px] px-4 text-[13.5px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }}
          data-testid="v4-produkt-godkjenn"
        >
          {trykket && <Hake />}{trykket ? 'Godkjent' : 'Godkjenn'}
        </button>
      </div>
    </div>
  );
}

/* ── Desktop: produktflaten ── */
function Desktop({ godkjent, trykket, onGodkjenn }) {
  const NAV = ['Oversikt', 'Eiendommer', 'Leietakere', 'Saker', 'Økonomi', 'Dokumenter'];
  return (
    <div className="grid min-h-[680px] grid-cols-[224px_minmax(0,1fr)] text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-desktop">
      {/* Sidebar */}
      <aside className="flex flex-col border-r px-4 py-5" style={{ background: STEIN, borderColor: HAIR }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-hero-logo.svg" alt="DigiHome" className="ml-1 h-[16px] w-auto" />
        <div className="mt-6 flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[13px]" style={{ background: PAPIR, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
          <span className="font-medium">Nygårdsgaten 5</span>
          <span className="text-[#15130F]/40">▾</span>
        </div>
        <nav className="mt-5 flex flex-col gap-0.5 text-[13.5px]">
          {NAV.map((n) => {
            const er = n === 'Saker';
            return (
              <span key={n} className="flex items-center justify-between rounded-[8px] px-3 py-2" style={{ background: er ? 'rgba(21,19,15,0.06)' : 'transparent', color: er ? T.ink : 'rgba(21,19,15,0.62)', fontWeight: er ? 500 : 400 }}>
                {n}
                {er && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium" style={{ background: T.lilla, color: T.ink }}>{godkjent ? 0 : 1}</span>}
              </span>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 px-2 pt-6 text-[13px]">
          <Avatar src="/v4/kari.webp" alt="Kari" size={26} />
          <span><span className="block font-medium">Kari Nilsen</span><span className="block text-[11.5px] text-[#15130F]/50">Eier</span></span>
        </div>
      </aside>

      {/* Innhold */}
      <div className="flex min-w-0 flex-col">
        <div className="flex h-12 items-center justify-between border-b px-7 text-[13px] text-[#15130F]/55" style={{ borderColor: HAIR }}>
          <span>Saker <span className="mx-1.5 text-[#15130F]/30">/</span> <span className="text-[#15130F]">Sak #2418</span></span>
          <span className="tabular-nums">I dag</span>
        </div>
        <div className="px-7 pb-7 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[22px] font-medium tracking-[-0.01em]">Varmtvannet er borte</h3>
              <p className="mt-1 text-[13px] text-[#15130F]/55">Leilighet 2 · meldt av Ida · i går 22:41</p>
            </div>
            <Status godkjent={godkjent} />
          </div>

          <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* Historikk */}
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#15130F]/45" style={{ letterSpacing: '0.02em', textTransform: 'none', fontSize: 13 }}>Historikk</p>
              <ol className="mt-3">
                {HISTORIKK.map((h, i) => (
                  <li key={i} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 border-t py-4" style={{ borderColor: HAIR }}>
                    <span className="pt-[2px] text-[12.5px] tabular-nums text-[#15130F]/45">{h.tid}</span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[14px] font-medium">{h.avatar && <Avatar src={h.avatar} alt="Ida" size={20} />}{h.t}</span>
                      <span className={`mt-0.5 block text-[13px] ${h.sitat ? 'text-[#15130F]/80' : 'text-[#15130F]/55'}`}>{h.d}</span>
                    </span>
                  </li>
                ))}
                {/* Godkjenningen din — kommer inn når du trykker */}
                <li className="grid" style={{ gridTemplateRows: godkjent ? '1fr' : '0fr', transition: `grid-template-rows 500ms ${EASE}` }} aria-hidden={!godkjent} data-testid="v4-desktop-godkjent">
                  <div className="min-h-0 overflow-hidden">
                    <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 border-t py-3.5" style={{ borderColor: HAIR, opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 250ms` }}>
                      <span className="pt-[2px] text-[12.5px] tabular-nums text-[#15130F]/45">nå</span>
                      <span>
                        <span className="flex items-center gap-2 text-[14px] font-medium"><Hake className="text-[#1F9D55]" />Godkjent av deg</span>
                        <span className="mt-0.5 block text-[13px] text-[#15130F]/55">Rørlegger AS bestilt · torsdag 09:00 · Ida varslet</span>
                      </span>
                    </div>
                  </div>
                </li>
              </ol>
            </div>

            {/* Høyre kolonne: godkjenningen (det ene du gjør) + detaljer */}
            <div className="flex flex-col gap-4">
              <GodkjenningKort godkjent={godkjent} trykket={trykket} onGodkjenn={onGodkjenn} />
              <div className="rounded-[14px] p-5 text-[13px]" style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
                <p className="text-[13px] font-medium text-[#15130F]/45">Detaljer</p>
                <dl className="mt-3 grid grid-cols-[96px_minmax(0,1fr)] gap-y-2.5">
                  <dt className="text-[#15130F]/50">Leietaker</dt><dd className="flex items-center gap-2"><Avatar src="/v4/ida.webp" alt="Ida" size={18} />Ida</dd>
                  <dt className="text-[#15130F]/50">Enhet</dt><dd>Leilighet 2</dd>
                  <dt className="text-[#15130F]/50">Kategori</dt><dd>VVS</dd>
                  <dt className="text-[#15130F]/50">Leverandør</dt><dd>Rørlegger AS</dd>
                  <dt className="text-[#15130F]/50">Tid</dt><dd>Torsdag 09:00</dd>
                  <dt className="text-[#15130F]/50">Pris</dt><dd className="font-medium">{tall(3450)} kr</dd>
                  <dt className="text-[#15130F]/50">Godkjenning</dt>
                  <dd className="inline-grid">
                    <span className="col-start-1 row-start-1" style={{ opacity: godkjent ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>Venter på deg</span>
                    <span className="col-start-1 row-start-1 text-[#166B3C]" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 250ms` }}>Godkjent · nå</span>
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

/* ── Under lg: samme sak i smal produktflate (produktet i mobilbredde) ── */
function Kompakt({ godkjent, trykket, onGodkjenn }) {
  return (
    <div className="flex flex-col text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-kompakt">
      <div className="flex h-11 items-center justify-between border-b px-4 text-[12.5px] text-[#15130F]/55" style={{ borderColor: HAIR }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-hero-logo.svg" alt="DigiHome" className="h-[14px] w-auto" />
        <span>Nygårdsgaten 5</span>
      </div>
      <div className="px-4 pt-4">
        <p className="text-[12.5px] text-[#15130F]/50">Saker <span className="mx-1 text-[#15130F]/30">/</span> Sak #2418</p>
        <h4 className="mt-0.5 text-[20px] font-medium tracking-[-0.01em]">Varmtvannet er borte</h4>
        <p className="mt-1 text-[12.5px] text-[#15130F]/55">Leilighet 2 · meldt av Ida · i går 22:41</p>
        <div className="mt-3"><Status godkjent={godkjent} /></div>
      </div>

      <GodkjenningKort className="mx-4 mt-4" godkjent={godkjent} trykket={trykket} onGodkjenn={onGodkjenn} />

      <ol className="mx-4 mt-5 text-[12.5px]">
        {HISTORIKK.map((h, i) => (
          <li key={i} className="flex items-center justify-between gap-3 border-t py-2.5" style={{ borderColor: HAIR }}>
            <span className="flex min-w-0 items-center gap-2 text-[#15130F]/80">{h.avatar && <Avatar src={h.avatar} alt="Ida" size={18} />}<span className="truncate">{h.t}</span></span>
            <span className="shrink-0 tabular-nums text-[#15130F]/40">{h.tid}</span>
          </li>
        ))}
        <li className="grid" style={{ gridTemplateRows: godkjent ? '1fr' : '0fr', transition: `grid-template-rows 500ms ${EASE}` }} aria-hidden={!godkjent}>
          <div className="min-h-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-t py-2.5" style={{ borderColor: HAIR, opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 250ms` }}>
              <span className="flex items-center gap-2 font-medium"><Hake className="text-[#1F9D55]" />Godkjent av deg</span>
              <span className="tabular-nums text-[#15130F]/40">nå</span>
            </div>
          </div>
        </li>
      </ol>
      <div className="h-5" />
    </div>
  );
}

export default function DriftScene({ synlig, tema = 'mork' }) {
  const [godkjent, setGodkjent] = useState(false);
  const [trykket, setTrykket] = useState(false);
  const godkjenn = useCallback(() => {
    if (trykket) return;
    setTrykket(true);
    window.setTimeout(() => setGodkjent(true), 320);
  }, [trykket]);
  const nullstill = () => { setTrykket(false); setGodkjent(false); };

  const inn = (delay) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(28px)', transition: `opacity 800ms ${EASE} ${delay}ms, transform 800ms ${EASE} ${delay}ms` });
  const lys = tema === 'lys';
  const skygge = lys
    ? '0 0 0 1px rgba(21,19,15,0.08), 0 60px 120px -40px rgba(21,19,15,0.35)'
    : '0 0 0 1px rgba(244,241,234,0.12), 0 70px 120px -50px rgba(0,0,0,0.75)';

  return (
    /* Alltid sentrert — ingen komposisjonsjustering, ingen sekundær flate som drar vekten til én side.
       Bredde 1400 (full-bleed-seksjon: bakgrunnen er bred, produktet følger et strammere grid). */
    <div className="relative mx-auto w-full max-w-[min(1400px,86vw)]" data-testid="v4-drift-scene">
      {/* Desktop — det ene objektet */}
      <div className="hidden overflow-hidden rounded-[18px] lg:block" style={{ boxShadow: skygge, ...inn(0) }}>
        <Desktop godkjent={godkjent} trykket={trykket} onGodkjenn={godkjenn} />
      </div>

      {/* Under lg — samme sak i smal produktflate */}
      <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-[18px] lg:hidden" style={{ boxShadow: skygge, ...inn(0) }}>
        <Kompakt godkjent={godkjent} trykket={trykket} onGodkjenn={godkjenn} />
      </div>

      {/* Tilbakestill — stille, og uten å reservere plass under produktet (ligger i seksjonens bunnmarg) */}
      <div className="absolute inset-x-0 -bottom-9 flex justify-center lg:-bottom-10" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 600ms` }} aria-hidden={!godkjent}>
        <button type="button" onClick={nullstill} tabIndex={godkjent ? 0 : -1} className={`text-[13px] underline underline-offset-4 ${lys ? 'decoration-[#15130F]/30' : 'decoration-[#F4F1EA]/30'}`} style={{ color: lys ? 'rgba(21,19,15,0.6)' : 'rgba(244,241,234,0.6)', pointerEvents: godkjent ? 'auto' : 'none' }} data-testid="v4-produkt-nullstill">Tilbakestill</button>
      </div>
    </div>
  );
}
