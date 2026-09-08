'use client';

import React, { useEffect, useState } from 'react';
import { Bell, LayoutGrid, Wallet, Wrench, MessageSquare, ArrowUpRight } from 'lucide-react';
import { EASE, T, display, tall } from './motion';

/* ---------------------------------------------------------------------------
   EierApp — eierportalen på mobil, slik den står på veggen i heroen: det han
   ser på telefonen sin, stort og rolig. Én telefon, rett forfra, mørk titan-
   ramme, Dynamic Island, papirhvit skjerm. Ingen skråstilling, ingen glans-
   effekter — en ekte enhet, ikke en illustrasjon.

   Innholdet er systemets side av samme historie som boblene forteller ved
   telefonen hans: klokken i statuslinjen følger samtalen, «I dag» får én rad
   per slag (glir fram, skyver listen), tallene skifter stille (2 av 3 → 3 av
   3), og saken får en «Godkjenn»-knapp som trykkes idet han svarer «Ja, kjør
   på» i samtalen — så blir den grønn. Til slutt: «Alt i orden».

   Tegnes i fast designbredde (DW × DH) og skaleres til plassen den får.
   `k` = slaget (0–4) eller null før historien har startet.
--------------------------------------------------------------------------- */

export const APP_DW = 250; export const APP_DH = 532;
const RAMME = 7;                       // bezel
const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.07)';
const DIM = 'rgba(21,19,15,0.52)';
const GRONN = '#166B3C';

const EMMA = '/v4/annonse/leietaker-emma.webp';

/* «I dag» — én rad per slag i samtalen (STROM i HeroStage). `h` = høyre etikett. */
const RADER = [
  { id: 'visning', t: 'Annonse · Leilighet 2', u: '4 påmeldt til visning lørdag', h: 'FINN', ikon: 'finn' },
  { id: 'kontrakt', t: 'Leiekontrakt · Emma Sørensen', u: 'Signert med BankID · 3 år', h: 'BankID', ikon: 'emma' },
  { id: 'regnskap', t: 'Husleie · Leilighet 2', u: '14 500 kr · matchet mot KID', h: 'Bokført', ikon: 'hake' },
  { id: 'emma', t: 'Sak · Ingen varmtvann', u: 'Rørlegger i dag 14:00 · 2 400 kr', ikon: 'sak', knapp: true },
  { id: 'kveld', t: 'Alt i orden', u: 'Ingenting venter på deg', ikon: 'hake', ro: true },
];

function Hake({ size = 22 }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: 'rgba(31,157,85,0.12)', color: GRONN }}>
      <svg width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
}

function RadIkon({ ikon }) {
  if (ikon === 'hake') return <Hake />;
  if (ikon === 'emma') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={EMMA} alt="" width={22} height={22} className="shrink-0 rounded-full object-cover" style={{ width: 22, height: 22, boxShadow: `0 0 0 1px ${HAIR}` }} draggable={false} />;
  }
  if (ikon === 'sak') return <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(212,150,255,0.26)', color: T.ink }}><Wrench size={11} strokeWidth={2} /></span>;
  return <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold tracking-tight" style={{ background: 'rgba(21,19,15,0.06)', color: 'rgba(21,19,15,0.66)' }}>F</span>;
}

/* Én rad som vokser fram (grid-rows 0fr → 1fr) når slaget er nådd */
function Rad({ r, vis, godkjent }) {
  return (
    <div className="grid" style={{ gridTemplateRows: vis ? '1fr' : '0fr', transition: `grid-template-rows 620ms ${EASE}` }} aria-hidden={!vis} data-testid={`v4-eierapp-${r.id}`}>
      <div className="min-h-0 overflow-hidden">
        <div className="flex items-center gap-2.5 border-t py-[9px]" style={{ borderColor: HAIR, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: `opacity 480ms ${EASE} 180ms, transform 620ms ${EASE} 180ms` }}>
          <RadIkon ikon={r.ikon} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium" style={{ color: T.ink }}>{r.t}</span>
            <span className="block truncate text-[11px]" style={{ color: r.ro ? GRONN : DIM }}>{r.knapp && godkjent ? 'Godkjent · rørlegger 14:00' : r.u}</span>
          </span>
          {r.knapp ? (
            <span className="inline-flex h-[26px] shrink-0 items-center rounded-full px-3 text-[11px] font-medium tabular-nums" style={{ background: godkjent ? 'rgba(31,157,85,0.12)' : T.ink, color: godkjent ? GRONN : T.offwhite, transform: godkjent ? 'none' : 'scale(1)', transition: `background 380ms ${EASE}, color 380ms ${EASE}, transform 220ms ${EASE}` }} data-testid="v4-eierapp-godkjenn">
              {godkjent ? 'Godkjent' : 'Godkjenn'}
            </span>
          ) : r.h ? (
            <span className="shrink-0 text-[10.5px]" style={{ color: DIM }}>{r.h}</span>
          ) : (
            <ArrowUpRight size={12} style={{ color: 'rgba(21,19,15,0.3)' }} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function EierApp({ k, kl = '20:41', adresse = 'Nygårdsgaten 5', synlig = true }) {
  const n = k === null || k === undefined ? -1 : k;
  /* «Godkjenn» trykkes idet han svarer i samtalen (bobla «Ja, kjør på» kommer ~3 s inn i slaget) */
  const [godkjent, setGodkjent] = useState(false);
  useEffect(() => {
    if (n < 3) { setGodkjent(false); return undefined; }
    if (n > 3) { setGodkjent(true); return undefined; }
    const t = window.setTimeout(() => setGodkjent(true), 3100);
    return () => window.clearTimeout(t);
  }, [n]);
  const leietakere = n >= 1 ? 3 : 2;
  const betalt = n >= 2 ? 3 : 2;

  return (
    <div className="relative select-none" style={{ width: APP_DW + RAMME * 2, height: APP_DH + RAMME * 2 }} data-testid="v4-eierapp">
      {/* Sideknapper */}
      <span aria-hidden="true" className="absolute rounded-l-[2px]" style={{ left: -2, top: 96, width: 2, height: 22, background: '#2a2a2c' }} />
      <span aria-hidden="true" className="absolute rounded-l-[2px]" style={{ left: -2, top: 132, width: 2, height: 40, background: '#2a2a2c' }} />
      <span aria-hidden="true" className="absolute rounded-l-[2px]" style={{ left: -2, top: 180, width: 2, height: 40, background: '#2a2a2c' }} />
      <span aria-hidden="true" className="absolute rounded-r-[2px]" style={{ right: -2, top: 150, width: 2, height: 62, background: '#2a2a2c' }} />
      {/* Rammen: mørk titan, én lys kant øverst, dyp myk skygge mot veggen */}
      <div className="relative h-full w-full" style={{ borderRadius: 44, padding: RAMME, background: 'linear-gradient(165deg, #3b3b3e 0%, #1d1d1f 45%, #2a2a2d 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(0,0,0,0.6), 0 60px 120px -40px rgba(0,0,0,0.6), 0 24px 48px -24px rgba(0,0,0,0.45)' }}>
        <div className="relative flex h-full w-full flex-col overflow-hidden" style={{ borderRadius: 44 - RAMME, background: PAPIR, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.9)' }}>
          {/* Statuslinje + Dynamic Island */}
          <div className="relative flex items-center justify-between px-6 pt-[13px] text-[11px] font-semibold tabular-nums" style={{ color: T.ink }}>
            <span key={kl} className="inline-block animate-in fade-in-0 duration-700">{kl}</span>
            <span aria-hidden="true" className="absolute left-1/2 top-[9px] h-[22px] w-[74px] -translate-x-1/2 rounded-full" style={{ background: '#0b0b0c' }} />
            <span className="inline-flex items-center gap-1.5" aria-hidden="true">
              <svg width="14" height="10" viewBox="0 0 14 10" fill={T.ink}><rect x="0" y="6" width="2.4" height="4" rx="0.6" /><rect x="3.8" y="4" width="2.4" height="6" rx="0.6" /><rect x="7.6" y="2" width="2.4" height="8" rx="0.6" /><rect x="11.4" y="0" width="2.4" height="10" rx="0.6" /></svg>
              <svg width="22" height="10" viewBox="0 0 22 10" fill="none"><rect x="0.5" y="0.5" width="18" height="9" rx="2.5" stroke={T.ink} strokeOpacity="0.5" /><rect x="2" y="2" width="15" height="6" rx="1.2" fill={T.ink} /><rect x="19.5" y="3" width="1.8" height="4" rx="0.6" fill={T.ink} fillOpacity="0.5" /></svg>
            </span>
          </div>

          {/* Hode */}
          <div className="px-5 pt-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: 'rgba(21,19,15,0.05)', color: T.ink }}>{adresse}<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              <span className="relative inline-flex"><Bell size={15} style={{ color: DIM }} /><span className="absolute -right-0.5 -top-0.5 h-[6px] w-[6px] rounded-full" style={{ background: T.lilla, boxShadow: `0 0 0 2px ${PAPIR}` }} /></span>
            </div>
            <p className="mt-5 text-[24px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.ink }}>God kveld.</p>
            <p className="mt-1.5 text-[11.5px]" style={{ color: DIM }}>torsdag 6. november</p>
          </div>

          {/* Tallene — som tall i portalen, ikke bokser. Skifter stille med historien. */}
          <div className="mt-5 grid grid-cols-2 gap-4 border-t px-5 pt-4" style={{ borderColor: HAIR }}>
            <div>
              <p className="text-[10.5px]" style={{ color: DIM }}>Husleie · november</p>
              <p className="mt-1.5 text-[22px] tabular-nums" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1, color: T.ink }}>{tall(37600)} kr</p>
              <p key={betalt} className="mt-1.5 inline-flex items-center gap-1.5 text-[10.5px] animate-in fade-in-0 duration-700" style={{ color: betalt === 3 ? GRONN : T.ink }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: betalt === 3 ? T.gronn : T.lilla }} />{betalt} av 3 betalt
              </p>
            </div>
            <div>
              <p className="text-[10.5px]" style={{ color: DIM }}>Utleiegrad</p>
              <p key={leietakere} className="mt-1.5 text-[22px] tabular-nums animate-in fade-in-0 duration-700" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1, color: T.ink }}>{leietakere === 3 ? '100' : '67'} %</p>
              <p className="mt-1.5 text-[10.5px]" style={{ color: DIM }}>{leietakere} av 3 enheter</p>
            </div>
          </div>

          {/* I dag — radene kommer med historien */}
          <div className="mt-4 flex-1 px-5">
            <p className="text-[10.5px] font-medium" style={{ color: DIM }}>I dag</p>
            <div className="mt-1">
              {RADER.map((r, i) => <Rad key={r.id} r={r} vis={n >= i} godkjent={godkjent} />)}
            </div>
          </div>

          {/* Tab-linje */}
          <div className="flex items-center justify-around px-3 pb-[14px] pt-2 text-[9.5px]" style={{ color: DIM, borderTop: `1px solid ${HAIR}` }}>
            {[['Oversikt', LayoutGrid, true], ['Økonomi', Wallet], ['Saker', Wrench], ['Meldinger', MessageSquare]].map(([navn, Ikon, er]) => (
              <span key={navn} className="inline-flex flex-col items-center gap-1" style={{ color: er ? T.ink : DIM }}><Ikon size={15} strokeWidth={1.75} />{navn}</span>
            ))}
          </div>
          {/* Hjem-indikator */}
          <span aria-hidden="true" className="absolute bottom-[5px] left-1/2 h-[4px] w-[86px] -translate-x-1/2 rounded-full" style={{ background: 'rgba(21,19,15,0.18)' }} />
        </div>
      </div>
      {/* Et svakt lysstreif over skjermen — glass, ikke plast */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-[7px] overflow-hidden" style={{ borderRadius: 44 - RAMME, background: 'linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 38%)', opacity: synlig ? 1 : 0 }} />
    </div>
  );
}
