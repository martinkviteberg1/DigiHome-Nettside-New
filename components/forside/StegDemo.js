'use client';

import React, { useState } from 'react';
import {
  ArrowRight, Check, MessageSquare, FileSignature, ShieldCheck, Sparkles,
  Wrench, RefreshCw, CalendarDays,
} from 'lucide-react';
import Avsloer from '@/components/forside/Avsloer';

/* ---------------------------------------------------------------------------
   StegDemo — «Fra manuelt arbeid til automatisert drift.»
   Klikkbar vertikal stepper (01–05) koblet til en levende produktflate.
   Demo-data og stockportretter — ingen ekte personer eller kunder.
--------------------------------------------------------------------------- */

const heading = { fontFamily: 'var(--font-heading), sans-serif' };

const STEG = [
  { nr: '01', t: 'Finn leietaker', b: 'Publiser på FINN og motta interessenter — vi hjelper deg hele veien.' },
  { nr: '02', t: 'Velg', b: 'Screening og vurdering av leietakere.' },
  { nr: '03', t: 'Signer', b: 'Digital kontrakt og BankID-signering.' },
  { nr: '04', t: 'Få betalt', b: 'Automatisk betaling, KID og purring.' },
  { nr: '05', t: 'Drift', b: 'Saker, kommunikasjon og fornyelser.' },
];

const P = (kjønn, n) => `https://randomuser.me/api/portraits/${kjønn}/${n}.jpg`;

const Avatar = ({ src, navn }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={navn} loading="lazy" className="h-[34px] w-[34px] shrink-0 rounded-full object-cover ring-2 ring-white" />
);

const Knapp = ({ children }) => (
  <span className="shrink-0 rounded-full px-3 py-[6px] text-[11px] font-semibold text-[#0A0A0A] ring-1 ring-black/[0.1] transition-colors">{children}</span>
);

/* ── 01: Finn leietaker ── */
function FlateFinn() {
  const rader = [
    [P('women', 44), 'Maria Johansen', 'Leilighet 2B · 2 rom · 54 m²', 'Nytt', '2 min siden', '#7c3aed'],
    [P('men', 32), 'Anders Pettersen', 'Leilighet 1A · 3 rom · 68 m²', 'Kontaktet', '1 time siden', '#0e7490'],
    [P('women', 68), 'Sofie Larsen', 'Leilighet 3C · 2 rom · 49 m²', 'Visning avtalt', 'I morgen kl. 15:00', '#1f7a45'],
    [P('men', 75), 'Jakob Nilsen', 'Leilighet 1A · 3 rom · 68 m²', 'Venter svar', '2 dager siden', '#9a6b1c'],
  ];
  return (
    <div>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <p className="text-[16px] font-bold text-[#0A0A0A]" style={heading}>Finn leietaker</p>
          <p className="mt-0.5 text-[12px] text-[#8d877d]">Publiser og motta interessenter på FINN</p>
        </div>
        <span className="rounded-full bg-[#7c3aed] px-3.5 py-[7px] text-[11.5px] font-semibold text-white shadow-[0_8px_18px_-6px_rgba(124,58,237,0.5)]">Ny annonse</span>
      </div>
      <div className="mt-4 flex gap-5 border-b border-black/[0.06] px-5 sm:px-6">
        {[['Annonser', null, false], ['Interessenter', 12, true], ['Visninger', null, false], ['Kandidater', null, false]].map(([t, n, aktiv]) => (
          <span key={t} className={`flex items-center gap-1.5 pb-2.5 text-[12.5px] font-semibold ${aktiv ? 'border-b-2 border-[#7c3aed] text-[#7c3aed]' : 'text-[#8d877d]'}`}>
            {t}{n ? <span className="rounded-full bg-[#F1E9FB] px-1.5 py-[1px] text-[9.5px] font-bold text-[#7c3aed]">{n}</span> : null}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 px-5 pt-3.5 sm:px-6">
        {[['Alle', 12, true], ['Nye', 4, false], ['Kontaktet', 3, false], ['Visning', 2, false], ['Venter svar', 3, false]].map(([t, n, aktiv]) => (
          <span key={t} className={`flex items-center gap-1 rounded-full px-2.5 py-[4px] text-[10.5px] font-semibold ${aktiv ? 'bg-[#141216] text-white' : 'text-[#8d877d] ring-1 ring-black/[0.08]'}`}>
            {t} <span className={aktiv ? 'text-white/60' : 'text-[#b3aca1]'}>{n}</span>
          </span>
        ))}
      </div>
      <div className="px-3 pb-4 pt-2 sm:px-4">
        {rader.map(([bilde, navn, enhet, status, når, farge]) => (
          <div key={navn} className="flex items-center gap-3 rounded-[12px] px-2 py-2.5 transition-colors hover:bg-[#FAF8F4] sm:px-3">
            <Avatar src={bilde} navn={navn} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-[#0A0A0A]" style={heading}>{navn}</p>
              <p className="truncate text-[10.5px] text-[#a49e93]">Interessert i Olaf Ryes vei 11C · {enhet}</p>
            </div>
            <div className="hidden w-[118px] shrink-0 sm:block">
              <p className="text-[11px] font-bold" style={{ color: farge }}>{status}</p>
              <p className="text-[9.5px] text-[#a49e93]">{når}</p>
            </div>
            <span className="hidden h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.08] sm:flex"><MessageSquare className="h-[11px] w-[11px] text-[#8d877d]" /></span>
            <Knapp>Se profil</Knapp>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 02: Velg / screening ── */
function FlateVelg() {
  const kandidater = [
    [P('women', 68), 'Sofie Larsen', 94, true],
    [P('men', 32), 'Anders Pettersen', 88, false],
    [P('men', 75), 'Jakob Nilsen', 76, false],
  ];
  return (
    <div className="px-5 pb-5 pt-5 sm:px-6">
      <p className="text-[16px] font-bold text-[#0A0A0A]" style={heading}>Screening — Olaf Ryes vei 11C</p>
      <p className="mt-0.5 text-[12px] text-[#8d877d]">Kandidatene vurderes på dokumentert grunnlag</p>
      <div className="mt-4 space-y-2.5">
        {kandidater.map(([bilde, navn, score, anbefalt]) => (
          <div key={navn} className={`rounded-[14px] p-3.5 ring-1 ${anbefalt ? 'bg-[#FBF9FE] ring-[#7c3aed]/25' : 'bg-white ring-black/[0.06]'}`}>
            <div className="flex items-center gap-3">
              <Avatar src={bilde} navn={navn} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13px] font-bold text-[#0A0A0A]" style={heading}>
                  {navn}
                  {anbefalt && <span className="rounded-full bg-[#7c3aed] px-2 py-[2px] text-[9px] font-bold text-white">Anbefalt</span>}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {['BankID verifisert', 'Inntekt dokumentert', 'Referanser OK'].map((k) => (
                    <span key={k} className="flex items-center gap-1 text-[10px] font-medium text-[#1f7a45]"><Check className="h-[10px] w-[10px]" strokeWidth={3} />{k}</span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[17px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>{score}</p>
                <p className="text-[8.5px] text-[#a49e93]">av 100</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 03: Signer ── */
function FlateSigner() {
  return (
    <div className="px-5 pb-5 pt-5 sm:px-6">
      <p className="text-[16px] font-bold text-[#0A0A0A]" style={heading}>Signering</p>
      <p className="mt-0.5 text-[12px] text-[#8d877d]">Leiekontrakt — Olaf Ryes vei 11C</p>
      <div className="mt-4 rounded-[14px] bg-white p-4 ring-1 ring-black/[0.06]">
        <div className="flex items-center gap-3">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F1E9FB]"><FileSignature className="h-[16px] w-[16px] text-[#7c3aed]" /></span>
          <div>
            <p className="text-[13px] font-bold text-[#0A0A0A]" style={heading}>Leiekontrakt.pdf</p>
            <p className="text-[10.5px] text-[#a49e93]">Generert av DigiHome · følger husleieloven</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {[['Martin (utleier)', 'Signert', true], ['Sofie Larsen (leietaker)', 'Venter på signering', false]].map(([navn, status, ok]) => (
            <div key={navn} className="flex items-center justify-between rounded-[10px] bg-[#FAF8F4] px-3 py-2.5">
              <span className="text-[12px] font-semibold text-[#0A0A0A]">{navn}</span>
              <span className={`flex items-center gap-1.5 text-[11px] font-bold ${ok ? 'text-[#1f7a45]' : 'text-[#9a6b1c]'}`}>
                {ok ? <Check className="h-[12px] w-[12px]" strokeWidth={3} /> : <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-[#9a6b1c]" />}{status}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 rounded-[11px] bg-[#141216] py-3 text-[12.5px] font-bold text-white">
          <ShieldCheck className="h-[14px] w-[14px] text-[#C9A6F0]" /> Signer med BankID
        </div>
        <p className="mt-2.5 text-center text-[10px] text-[#a49e93]">Arkiveres automatisk på leieforholdet når begge har signert.</p>
      </div>
    </div>
  );
}

/* ── 04: Få betalt ── */
function FlateBetalt() {
  return (
    <div className="px-5 pb-5 pt-5 sm:px-6">
      <p className="text-[16px] font-bold text-[#0A0A0A]" style={heading}>Betalinger</p>
      <p className="mt-0.5 text-[12px] text-[#8d877d]">Olaf Ryes vei 11C · Sofie Larsen · 18 500 kr/mnd</p>
      <div className="mt-4 overflow-hidden rounded-[14px] bg-white ring-1 ring-black/[0.06]">
        {[['Husleie januar', 'Betalt 1. jan', '18 500 kr', true], ['Husleie februar', 'Betalt 1. feb', '18 500 kr', true], ['Husleie mars', 'Forfall 1. mars · KID sendt', '18 500 kr', false]].map(([t, s, sum, ok], i) => (
          <div key={t} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-black/[0.05]' : ''}`}>
            <div className="flex items-center gap-3">
              <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-full ${ok ? 'bg-[#E7F3EC]' : 'bg-[#F4F1EB]'}`}>
                {ok ? <Check className="h-[11px] w-[11px] text-[#1f7a45]" strokeWidth={3} /> : <CalendarDays className="h-[11px] w-[11px] text-[#8d877d]" />}
              </span>
              <div>
                <p className="text-[12.5px] font-bold text-[#0A0A0A]" style={heading}>{t}</p>
                <p className="text-[10px] text-[#a49e93]">{s}</p>
              </div>
            </div>
            <span className={`text-[12.5px] font-bold tabular-nums ${ok ? 'text-[#1f7a45]' : 'text-[#0A0A0A]'}`}>{sum}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-[#8d877d]">
        <Sparkles className="h-[11px] w-[11px] text-[#7c3aed]" /> Purring sendes automatisk ved forsinkelse — du trenger ikke gjøre noe.
      </p>
    </div>
  );
}

/* ── 05: Drift ── */
function FlateDrift() {
  const saker = [
    [Wrench, 'Vannlekkasje på bad', 'Rørlegger booket · torsdag 09:00', 'Under arbeid', '#9a6b1c', '#FBF3E4'],
    [MessageSquare, 'Ny melding fra Emma', 'Leilighet 3C · «Når kommer vaktmesteren?»', 'Svar innen 24 t', '#7c3aed', '#F1E9FB'],
    [RefreshCw, 'Fornyelse — Leilighet 1A', 'Foreslått KPI-justering +2,9 %', 'Klar til utsending', '#1f7a45', '#E7F3EC'],
  ];
  return (
    <div className="px-5 pb-5 pt-5 sm:px-6">
      <p className="text-[16px] font-bold text-[#0A0A0A]" style={heading}>Drift og oppfølging</p>
      <p className="mt-0.5 text-[12px] text-[#8d877d]">Saker, kommunikasjon og fornyelser — samlet</p>
      <div className="mt-4 space-y-2.5">
        {saker.map(([Ikon, t, s, status, c, bg]) => (
          <div key={t} className="flex items-center gap-3 rounded-[14px] bg-white p-3.5 ring-1 ring-black/[0.06]">
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]" style={{ background: bg }}><Ikon className="h-[14px] w-[14px]" style={{ color: c }} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-[#0A0A0A]" style={heading}>{t}</p>
              <p className="truncate text-[10.5px] text-[#a49e93]">{s}</p>
            </div>
            <span className="shrink-0 rounded-full px-2.5 py-[4px] text-[10px] font-bold" style={{ color: c, background: bg }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FLATER = [FlateFinn, FlateVelg, FlateSigner, FlateBetalt, FlateDrift];

export default function StegDemo() {
  const [aktiv, setAktiv] = useState(0);
  const Flate = FLATER[aktiv];
  return (
    <section id="produkt" className="relative scroll-mt-20">
      <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 items-start gap-12 px-6 pb-16 pt-8 sm:px-10 sm:pb-24 sm:pt-12 lg:grid-cols-[0.42fr_0.58fr] lg:gap-16">
        {/* Venstre: fortelling + stepper */}
        <Avsloer>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c7466]">Alt du trenger — på ett sted</p>
          <h2 className="e-display mt-3 max-w-[16ch] text-[28px] sm:text-[38px]">Fra manuelt arbeid til automatisert drift<span className="text-[#cf97fc]">.</span></h2>
          <p className="mt-4 max-w-[38ch] text-[14.5px] leading-[1.65] text-[#6F6A60]">
            DigiHome binder sammen oppgavene som tradisjonelt har ligget i
            forskjellige systemer, innbokser og regneark.
          </p>
          {/* Mobil: sveipbare steg-chips */}
          <div className="-mx-6 mt-6 flex gap-2 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-10 sm:px-10 lg:hidden">
            {STEG.map((s, i) => (
              <button
                key={s.nr}
                onClick={(e) => {
                  setAktiv(i);
                  try {
                    const el = e.currentTarget;
                    const boks = el.parentElement;
                    boks.scrollTo({ left: el.offsetLeft - (boks.clientWidth - el.clientWidth) / 2, behavior: 'smooth' });
                  } catch (err) { /* ok */ }
                }}
                data-testid={`steg-mobil-${s.nr}`}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-[9px] text-[13px] font-semibold transition-colors ${i === aktiv ? 'bg-[#1a1a1a] text-white shadow-[0_10px_22px_-8px_rgba(17,17,17,0.45)]' : 'bg-white text-[#57534e] ring-1 ring-black/[0.08]'}`}
              >
                <span className={`text-[11px] font-bold tabular-nums ${i === aktiv ? 'text-white/70' : 'text-[#b3aca1]'}`} style={heading}>{s.nr}</span>
                {s.t}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[13px] leading-[1.6] text-[#8d877d] lg:hidden">{STEG[aktiv].b}</p>
          {/* Desktop: vertikal stepper */}
          <div className="mt-8 hidden lg:block">
            {STEG.map((s, i) => {
              const valgt = i === aktiv;
              return (
                <button key={s.nr} onClick={() => setAktiv(i)} data-testid={`steg-${s.nr}`}
                  className={`group flex w-full items-start gap-5 border-t border-[#EDE9E2] py-4 text-left transition-colors first:border-t-0 first:pt-0 ${valgt ? '' : 'opacity-60 hover:opacity-100'}`}>
                  <span className={`text-[15px] font-bold tabular-nums ${valgt ? 'text-[#1a1a1a]' : 'text-[#b3aca1]'}`} style={heading}>{s.nr}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-bold tracking-[-0.015em] text-[#0A0A0A]" style={heading}>{s.t}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-[1.6] text-[#8d877d]">{s.b}</span>
                  </span>
                  <span className={`mt-1 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full transition-all ${valgt ? 'bg-[#1a1a1a] text-white shadow-[0_8px_18px_-6px_rgba(17,17,17,0.45)]' : 'text-[#c8c3ba] ring-1 ring-black/[0.08] group-hover:text-[#1a1a1a]'}`}>
                    <ArrowRight className="h-[13px] w-[13px]" />
                  </span>
                </button>
              );
            })}
          </div>
        </Avsloer>
        {/* Høyre: levende produktflate */}
        <Avsloer delay={150} className="lg:sticky lg:top-24">
          <div key={aktiv} className="dh-cover-inn overflow-hidden rounded-[20px] bg-[#FCFBF9] shadow-[0_36px_90px_-42px_rgba(84,50,160,0.22),0_0_0_1px_rgba(0,0,0,0.05)]">
            <Flate />
          </div>
        </Avsloer>
      </div>
    </section>
  );
}
