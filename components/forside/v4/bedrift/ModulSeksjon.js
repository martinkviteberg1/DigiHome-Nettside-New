'use client';

import React, { useRef } from 'react';
import { EASE, T, display, tall, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   ModulSeksjon — «Bygget for team med portefølje.»

   Seks kapitler som skiller et system for selskaper fra en app for én utleier.
   Hvert kapittel: nummer · tittel · én setning — og et produktobjekt rett på
   flaten (ingen kort): rollekjeden, husleie per bygg, saken fra melding til
   godkjent, signeringen, rapporten, historikken. Objektene spiller når raden
   kommer inn i bildet. Kun opacity/transform.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.10)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.45)';
const SPRETT = 'cubic-bezier(0.22, 1, 0.36, 1)';

const inn = (vis, i, y = 10) => ({ opacity: vis ? 1 : 0, transform: vis ? 'none' : `translateY(${y}px)`, transition: `opacity 600ms ${EASE} ${i}ms, transform 700ms ${SPRETT} ${i}ms` });

function Hake({ size = 12 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}

function Rad({ vis, delay = 0, venstre, hoyre, sist = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: sist ? 'none' : `1px solid ${HAIR}`, ...inn(vis, delay) }}>
      <div className="flex min-w-0 items-center gap-3">{venstre}</div>
      {hoyre != null && <div className="shrink-0 text-right">{hoyre}</div>}
    </div>
  );
}

/* 01 · Rollekjeden: én sak — tre roller, én godkjenner */
function ObjRoller({ vis }) {
  const roller = [
    { n: 'Driftssjef', g: 'Godkjenner pris', tone: 'lilla' },
    { n: 'Økonomi', g: 'Ser kostnaden', tone: 'noytral' },
    { n: 'Vaktmester', g: 'Slipper inn rørleggeren', tone: 'noytral' },
  ];
  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b pb-3" style={{ borderColor: HAIR, ...inn(vis, 0) }}>
        <div className="min-w-0">
          <p className="text-[15px] font-medium" style={{ color: T.ink }}>Lekkasje på badet</p>
          <p className="text-[13px]" style={{ color: DIM }}>Strandgaten 12 · 3B · meldt 08:12</p>
        </div>
        <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium" style={{ background: 'rgba(212,150,255,0.18)', color: T.ink }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Adressert til rolle</span>
      </div>
      {roller.map((r, i) => (
        <Rad key={r.n} vis={vis} delay={250 + i * 220} sist={i === roller.length - 1}
          venstre={(
            <>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-medium" style={{ background: r.tone === 'lilla' ? T.lilla : 'rgba(21,19,15,0.06)', color: T.ink }}>{r.n[0]}</span>
              <span className="text-[15px] font-medium" style={{ color: T.ink }}>{r.n}</span>
            </>
          )}
          hoyre={<span className="text-[13.5px]" style={{ color: r.tone === 'lilla' ? T.ink : DIM }}>{r.g}</span>}
        />
      ))}
    </div>
  );
}

/* 02 · Husleie per bygg: den 1. — stolper som fylles */
function ObjHusleie({ vis }) {
  const bygg = [
    { n: 'Strandgaten 12', inn: 38, av: 38 },
    { n: 'Nygårdsgaten 5', inn: 22, av: 24 },
    { n: 'Møhlenpris 14', inn: 32, av: 32 },
  ];
  return (
    <div>
      <div className="flex items-baseline justify-between border-b pb-3" style={{ borderColor: HAIR, ...inn(vis, 0) }}>
        <p className="text-[15px] font-medium" style={{ color: T.ink }}>Husleie · 1. november</p>
        <p className="text-[13px] tabular-nums" style={{ color: DIM }}>92 av 94 registrert</p>
      </div>
      {bygg.map((b, i) => {
        const full = b.inn === b.av;
        return (
          <div key={b.n} className="py-3" style={{ borderBottom: i < bygg.length - 1 ? `1px solid ${HAIR}` : 'none', ...inn(vis, 200 + i * 160) }}>
            <div className="flex items-center justify-between text-[14.5px]">
              <span className="font-medium" style={{ color: T.ink }}>{b.n}</span>
              <span className="inline-flex items-center gap-1.5 tabular-nums" style={{ color: full ? '#166B3C' : T.ink }}>{full && <Hake size={11} />}{b.inn} av {b.av}{!full && <span className="ml-1 text-[12.5px]" style={{ color: DIM }}>· 2 purres 3. nov</span>}</span>
            </div>
            <span className="mt-2 block h-[3px] w-full overflow-hidden rounded-full" style={{ background: 'rgba(21,19,15,0.08)' }}>
              <span className="block h-full rounded-full" style={{ background: full ? T.gronn : T.lilla, transformOrigin: 'left', transform: vis ? `scaleX(${b.inn / b.av})` : 'scaleX(0)', transition: `transform 1100ms ${EASE} ${400 + i * 160}ms` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* 03 · Saken: melding → leverandør → pris → godkjent */
function ObjSak({ vis }) {
  const steg = [
    { t: 'Meldt av leietaker', d: 'Bilde og beskrivelse · 08:12', gjort: true },
    { t: 'Rørlegger valgt', d: 'Lie VVS · avtalt torsdag 09–11', gjort: true },
    { t: `Pris innhentet · ${tall(6200)} kr`, d: 'Over grensen → krever godkjenning', gjort: true },
    { t: 'Godkjent av driftssjef', d: 'Kari Nilsen · 09:40', gjort: true, siste: true },
  ];
  return (
    <ol className="relative">
      <span aria-hidden="true" className="absolute bottom-3 left-[7px] top-3 w-px" style={{ background: 'rgba(21,19,15,0.14)', transformOrigin: 'top', transform: vis ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 1200ms ${EASE} 200ms` }} />
      {steg.map((s, i) => (
        <li key={s.t} className="relative grid grid-cols-[16px_minmax(0,1fr)] gap-x-4 py-2.5" style={inn(vis, 150 + i * 260)}>
          <span className="flex justify-center pt-[6px]"><span className="block h-[7px] w-[7px] rounded-full" style={{ background: s.siste ? T.gronn : T.ink }} /></span>
          <span>
            <span className="block text-[15px] font-medium" style={{ color: T.ink }}>{s.t}</span>
            <span className="block text-[13px]" style={{ color: DIM }}>{s.d}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* 04 · Signeringen: to parter, BankID */
function Ring({ vis, delay, size = 26 }) {
  const r = (size - 3) / 2; const omk = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(21,19,15,0.12)" strokeWidth="1.5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1F9D55" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={omk} strokeDashoffset={vis ? 0 : omk} style={{ transition: `stroke-dashoffset 900ms ${EASE} ${delay}ms` }} />
      </svg>
      <span style={{ color: '#166B3C', opacity: vis ? 1 : 0, transform: vis ? 'scale(1)' : 'scale(0.6)', transition: `opacity 300ms ${EASE} ${delay + 700}ms, transform 400ms ${SPRETT} ${delay + 700}ms` }}><Hake size={13} /></span>
    </span>
  );
}
function ObjKontrakt({ vis }) {
  const parter = [
    { n: 'Strandgaten Eiendom AS', r: 'Utleier · v/ driftssjef', tid: 'Signert 14:02', d: 300 },
    { n: 'Emma Sørensen', r: 'Leietaker · 5A', tid: 'Signert 14:11', d: 900 },
  ];
  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b pb-3" style={{ borderColor: HAIR, ...inn(vis, 0) }}>
        <div className="min-w-0">
          <p className="text-[15px] font-medium" style={{ color: T.ink }}>Leiekontrakt · Nygårdsgaten 5A</p>
          <p className="text-[13px]" style={{ color: DIM }}>Fra selskapets mal · {tall(14500)} kr/mnd · fra 1. desember</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/v4/logo/bankid.svg" alt="BankID" className="h-[16px] w-auto shrink-0 select-none opacity-80" draggable={false} />
      </div>
      {parter.map((p, i) => (
        <Rad key={p.n} vis={vis} delay={200 + i * 300} sist={i === parter.length - 1}
          venstre={(
            <>
              <Ring vis={vis} delay={p.d} />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium" style={{ color: T.ink }}>{p.n}</span>
                <span className="block text-[13px]" style={{ color: DIM }}>{p.r}</span>
              </span>
            </>
          )}
          hoyre={<span className="text-[13px] tabular-nums" style={{ color: DIM, opacity: vis ? 1 : 0, transition: `opacity 400ms ${EASE} ${p.d + 800}ms` }}>{p.tid}</span>}
        />
      ))}
      <p className="mt-3 text-[13px]" style={{ color: SVAK, ...inn(vis, 1600) }}>Arkivert på enheten · Posten signering</p>
    </div>
  );
}

/* 05 · Rapporten: per bygg, sum per selskap */
function ObjRapport({ vis }) {
  const rader = [
    { n: 'Strandgaten 12', inn: 494000, ut: 21400 },
    { n: 'Nygårdsgaten 5', inn: 286000, ut: 6200 },
    { n: 'Møhlenpris 14', inn: 410000, ut: 0 },
  ];
  const sumInn = rader.reduce((s, r) => s + r.inn, 0); const sumUt = rader.reduce((s, r) => s + r.ut, 0);
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_88px_80px_96px] gap-x-3 border-b pb-2 text-[12px] uppercase tracking-[0.06em]" style={{ color: SVAK, borderColor: HAIR, ...inn(vis, 0) }}>
        <span>November</span><span className="text-right">Inn</span><span className="text-right">Ut</span><span className="text-right">Netto</span>
      </div>
      {rader.map((r, i) => (
        <div key={r.n} className="grid grid-cols-[minmax(0,1fr)_88px_80px_96px] gap-x-3 py-2.5 text-[14px] tabular-nums" style={{ borderBottom: `1px solid ${HAIR}`, ...inn(vis, 150 + i * 140) }}>
          <span className="truncate font-medium" style={{ color: T.ink }}>{r.n}</span>
          <span className="text-right" style={{ color: T.ink }}>{tall(r.inn)}</span>
          <span className="text-right" style={{ color: DIM }}>{r.ut ? `−${tall(r.ut)}` : '—'}</span>
          <span className="text-right" style={{ color: T.ink }}>{tall(r.inn - r.ut)}</span>
        </div>
      ))}
      <div className="grid grid-cols-[minmax(0,1fr)_88px_80px_96px] gap-x-3 pt-3 text-[15px] font-medium tabular-nums" style={inn(vis, 700)}>
        <span style={{ color: T.ink }}>Strandgaten Eiendom AS</span>
        <span className="text-right" style={{ color: T.ink }}>{tall(sumInn)}</span>
        <span className="text-right" style={{ color: DIM }}>−{tall(sumUt)}</span>
        <span className="text-right" style={{ color: T.ink }}>{tall(sumInn - sumUt)}</span>
      </div>
      <p className="mt-3 inline-flex items-center gap-2 text-[13px]" style={{ color: SVAK, ...inn(vis, 900) }}>
        <span style={{ color: '#166B3C' }}><Hake size={11} /></span>Sendt til regnskap · PowerOffice
      </p>
    </div>
  );
}

/* 06 · Historikken: hvem og når */
function ObjLogg({ vis }) {
  const logg = [
    { tid: '09:40', hvem: 'Kari Nilsen · Driftssjef', hva: `Godkjente ${tall(6200)} kr · Lekkasje, Strandgaten 12` },
    { tid: '14:02', hvem: 'Kari Nilsen · Driftssjef', hva: 'Signerte leiekontrakt · Nygårdsgaten 5A' },
    { tid: '16:30', hvem: 'Jonas Berg · Vaktmester', hva: 'Kvitterte: lekkasje utbedret · bilde lagt ved' },
    { tid: '1. des', hvem: 'DigiHome', hva: 'Månedsrapport sendt · 3 bygg · 94 enheter' },
  ];
  return (
    <ol>
      {logg.map((l, i) => (
        <li key={l.tid + l.hva} className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-3 py-2.5" style={{ borderBottom: i < logg.length - 1 ? `1px solid ${HAIR}` : 'none', ...inn(vis, 120 + i * 180) }}>
          <span className="pt-[2px] text-[12.5px] tabular-nums" style={{ color: SVAK }}>{l.tid}</span>
          <span>
            <span className="block text-[14.5px]" style={{ color: T.ink }}>{l.hva}</span>
            <span className="block text-[12.5px]" style={{ color: DIM }}>{l.hvem}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

const KAPITLER = [
  { nr: '01', t: 'Roller og godkjenning', d: 'Hvem ser hva, hvem godkjenner hva. Saker adresseres til rollen — ikke til en innboks.', Obj: ObjRoller },
  { nr: '02', t: 'Husleie per bygg', d: 'Alle innbetalinger registreres den 1. Avvik purres. Dere ser status per bygg — ikke per kontoutskrift.', Obj: ObjHusleie },
  { nr: '03', t: 'Saker med leverandør og pris', d: 'Fra melding til løst: sak, leverandør, pris, godkjenning — og alt ligger på enheten etterpå.', Obj: ObjSak },
  { nr: '04', t: 'Kontrakter med BankID', d: 'Fra deres mal. Signert av begge parter med BankID gjennom Posten. Arkivert på enheten.', Obj: ObjKontrakt },
  { nr: '05', t: 'Rapport per bygg og selskap', d: 'Husleie, saker og kostnader — per bygg, per selskap, hver måned. Klar for regnskap.', Obj: ObjRapport },
  { nr: '06', t: 'Historikk på alt', d: 'Hver handling logget med hvem og når. Revisjon, overlevering og tvister blir enkle.', Obj: ObjLogg },
];

function Kapittel({ k, i }) {
  const ref = useRef(null);
  const vis = useSynlig(ref, 0.3);
  const Obj = k.Obj;
  return (
    <li ref={ref} className="grid gap-7 border-t py-10 sm:gap-8 sm:py-12 lg:grid-cols-12 lg:gap-10 lg:py-16" style={{ borderColor: HAIR }} data-testid={`v4e-modul-${i + 1}`}>
      <div className="lg:col-span-5">
        <p className="text-[13px] tabular-nums" style={{ color: T.lilla, ...inn(vis, 0) }}>{k.nr}</p>
        <h3 className="mt-3 text-[clamp(26px,2.2vw,36px)]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink, ...inn(vis, 80) }}>{k.t}</h3>
        <p className="mt-4 max-w-[40ch] text-[16.5px] leading-[1.5]" style={{ color: DIM, ...inn(vis, 160) }}>{k.d}</p>
      </div>
      <div className="lg:col-span-6 lg:col-start-7"><Obj vis={vis} /></div>
    </li>
  );
}

export default function ModulSeksjon() {
  const ref = useRef(null);
  const vis = useSynlig(ref, 0.15);
  return (
    <section id="moduler" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4e-moduler">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-12 pt-16 sm:px-8 sm:pb-16 sm:pt-20 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-24 lg:pt-28">
        <div className="max-w-[820px]">
          <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(vis, 0) }}>Plattformen</p>
          <h2 className="mt-4 text-[clamp(38px,4.2vw,72px)]" style={{ ...display, color: T.ink, ...inn(vis, 80) }} data-testid="v4e-moduler-tittel">
            Bygget for team med portefølje<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
          </h2>
          <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(vis, 160) }}>
            Seks ting som gjør DigiHome til et system for selskaper med portefølje — ikke en app for én utleier.
          </p>
        </div>
        <ol className="mt-8 border-b sm:mt-10 lg:mt-14" style={{ borderColor: HAIR }}>
          {KAPITLER.map((k, i) => <Kapittel key={k.nr} k={k} i={i} />)}
        </ol>
      </div>
    </section>
  );
}
