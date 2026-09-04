'use client';

import React, { useCallback, useState } from 'react';
import { EASE, T, display, tall } from '../motion';

/* ---------------------------------------------------------------------------
   DriftScene — én jobb DigiHome løser, vist på to flater.

   Desktop (hovedobjekt): saken slik eieren/forvalteren ser den — historikk,
   leverandør, detaljer. Ingen laptop, ingen browser-ramme: bare produktflaten.
   Telefon (sekundært lag, overlapper kanten): det ene øyeblikket — Godkjenn.
   Én interaksjon: trykk Godkjenn på telefonen, desktop oppdaterer.

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
  { tid: '22:41', t: 'Jonas meldte', d: '«Varmtvannet er borte i hele leiligheten. Har vært sånn siden i kveld.»', sitat: true, avatar: '/v4/jonas.webp' },
  { tid: '22:41', t: 'Sak opprettet automatisk', d: 'Kategori VVS · prioritet høy · hele bygget varslet' },
  { tid: '22:43', t: 'Leverandør funnet', d: 'Rørlegger AS · fast leverandør · ledig torsdag 09:00' },
  { tid: '22:43', t: 'Pris innhentet', d: `${tall(3450)} kr inkl. mva · sendt til Kari for godkjenning` },
];

/* ── Desktop: produktflaten ── */
function Desktop({ godkjent }) {
  const NAV = ['Oversikt', 'Eiendommer', 'Leietakere', 'Saker', 'Økonomi', 'Dokumenter'];
  return (
    <div className="grid min-h-[620px] grid-cols-[224px_minmax(0,1fr)] text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-desktop">
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
              <p className="mt-1 text-[13px] text-[#15130F]/55">Leilighet 2 · meldt av Jonas · i går 22:41</p>
            </div>
            <Status godkjent={godkjent} />
          </div>

          <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            {/* Historikk */}
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#15130F]/45" style={{ letterSpacing: '0.02em', textTransform: 'none', fontSize: 13 }}>Historikk</p>
              <ol className="mt-3">
                {HISTORIKK.map((h, i) => (
                  <li key={i} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 border-t py-3.5" style={{ borderColor: HAIR }}>
                    <span className="pt-[2px] text-[12.5px] tabular-nums text-[#15130F]/45">{h.tid}</span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[14px] font-medium">{h.avatar && <Avatar src={h.avatar} alt="Jonas" size={20} />}{h.t}</span>
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
                        <span className="mt-0.5 block text-[13px] text-[#15130F]/55">Rørlegger AS bestilt · torsdag 09:00 · Jonas varslet</span>
                      </span>
                    </div>
                  </div>
                </li>
              </ol>
            </div>

            {/* Detaljer */}
            <div className="rounded-[14px] p-5 text-[13px]" style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
              <p className="text-[13px] font-medium text-[#15130F]/45">Detaljer</p>
              <dl className="mt-3 grid grid-cols-[96px_minmax(0,1fr)] gap-y-2.5">
                <dt className="text-[#15130F]/50">Leietaker</dt><dd className="flex items-center gap-2"><Avatar src="/v4/jonas.webp" alt="Jonas" size={18} />Jonas</dd>
                <dt className="text-[#15130F]/50">Enhet</dt><dd>Leilighet 2</dd>
                <dt className="text-[#15130F]/50">Kategori</dt><dd>VVS</dd>
                <dt className="text-[#15130F]/50">Leverandør</dt><dd>Rørlegger AS</dd>
                <dt className="text-[#15130F]/50">Tid</dt><dd>Torsdag 09:00</dd>
                <dt className="text-[#15130F]/50">Pris</dt><dd className="font-medium">{tall(3450)} kr</dd>
                <dt className="text-[#15130F]/50">Godkjenning</dt>
                <dd className="inline-grid">
                  <span className="col-start-1 row-start-1" style={{ opacity: godkjent ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>Venter · sendt til mobil</span>
                  <span className="col-start-1 row-start-1 text-[#166B3C]" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 250ms` }}>Godkjent · nå</span>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Telefon: det ene øyeblikket ── */
function Telefon({ godkjent, trykket, onGodkjenn }) {
  return (
    <div className="flex flex-col text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-telefon">
      <div className="flex items-center justify-between px-5 pt-4 text-[12px] text-[#15130F]/50">
        <span className="tabular-nums">22:43</span>
        <span>Nygårdsgaten 5</span>
      </div>
      <div className="px-5 pt-5">
        <p className="text-[12.5px] text-[#15130F]/50">Sak · Leilighet 2</p>
        <h4 className="mt-0.5 text-[20px] font-medium tracking-[-0.01em]">Varmtvann</h4>
      </div>

      {/* Det samme kortet som i heroen — nå i produktet */}
      <div className="mx-4 mt-4 rounded-[16px] p-4 text-[#F4F1EA]" style={{ background: T.charcoal }}>
        <div className="flex items-center justify-between text-[12px] text-white/60">
          <span className="inline-grid">
            <span className="col-start-1 row-start-1 flex items-center gap-2" style={{ opacity: godkjent ? 0 : 1, transition: `opacity 200ms ${EASE}` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</span>
            <span className="col-start-1 row-start-1 flex items-center gap-2" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 250ms` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />Bestilt</span>
          </span>
          <span className="tabular-nums">22:41</span>
        </div>
        <p className="mt-3 text-[15px] font-medium">Rørlegger AS</p>
        <p className="text-[13px] text-white/60">Torsdag 09:00</p>
        <p className="mt-3 text-[28px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(3450)} kr</p>
        <button
          type="button"
          onClick={onGodkjenn}
          disabled={godkjent}
          aria-label={`Godkjenn rørlegger, ${tall(3450)} kroner`}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }}
          data-testid="v4-produkt-godkjenn"
        >
          {trykket && <Hake />}{trykket ? 'Godkjent' : 'Godkjenn'}
        </button>
        <p className="mt-2.5 text-[11px] text-white/45">{godkjent ? 'Rørlegger AS bestilt · Jonas varslet' : 'Sak opprettet automatisk · sendt til deg'}</p>
      </div>

      <ul className="mx-5 mt-5 border-t text-[12.5px]" style={{ borderColor: HAIR }}>
        {[['22:41', 'Jonas meldte'], ['22:41', 'Sak opprettet'], ['22:43', 'Leverandør funnet']].map(([t, n]) => (
          <li key={n} className="flex items-center justify-between border-b py-2.5" style={{ borderColor: HAIR }}>
            <span className="text-[#15130F]/75">{n}</span><span className="tabular-nums text-[#15130F]/40">{t}</span>
          </li>
        ))}
      </ul>
      <div className="h-6" />
    </div>
  );
}

export default function DriftScene({ synlig, justering = 'senter', tema = 'mork' }) {
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
  const skyggeDesktop = lys
    ? '0 0 0 1px rgba(21,19,15,0.08), 0 60px 120px -40px rgba(21,19,15,0.35)'
    : '0 0 0 1px rgba(244,241,234,0.12), 0 70px 120px -50px rgba(0,0,0,0.75)';
  const skyggeTelefon = lys
    ? '0 0 0 1px rgba(21,19,15,0.10), 0 40px 90px -30px rgba(21,19,15,0.45)'
    : '0 0 0 1px rgba(244,241,234,0.14), 0 50px 100px -40px rgba(0,0,0,0.8)';
  const plassering = justering === 'venstre' ? 'lg:mx-0' : justering === 'hoyre' ? 'lg:ml-auto lg:mr-10 xl:mr-14' : '';

  return (
    <div className={`relative mx-auto max-w-[1180px] ${plassering}`} data-testid="v4-drift-scene">
      {/* Desktop — hovedobjekt. Skjult på mobil: der er telefonen produktet. */}
      <div className="hidden overflow-hidden rounded-[18px] lg:block" style={{ boxShadow: skyggeDesktop, ...inn(0) }}>
        <Desktop godkjent={godkjent} />
      </div>

      {/* Telefon — sekundært lag, overlapper nede til høyre på desktop; hovedobjekt på mobil */}
      <div className="mx-auto w-[320px] overflow-hidden rounded-[34px] lg:absolute lg:-bottom-12 lg:-right-6 lg:mx-0 lg:w-[300px] xl:-right-10" style={{ boxShadow: skyggeTelefon, ...inn(160) }}>
        <Telefon godkjent={godkjent} trykket={trykket} onGodkjenn={godkjenn} />
      </div>

      {/* Tilbakestill — stille */}
      <div className="mt-8 flex justify-center lg:mt-20" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 600ms` }} aria-hidden={!godkjent}>
        <button type="button" onClick={nullstill} tabIndex={godkjent ? 0 : -1} className={`text-[13px] underline underline-offset-4 ${lys ? 'decoration-[#15130F]/30' : 'decoration-[#F4F1EA]/30'}`} style={{ color: lys ? 'rgba(21,19,15,0.6)' : 'rgba(244,241,234,0.6)', pointerEvents: godkjent ? 'auto' : 'none' }} data-testid="v4-produkt-nullstill">Tilbakestill</button>
      </div>
    </div>
  );
}
