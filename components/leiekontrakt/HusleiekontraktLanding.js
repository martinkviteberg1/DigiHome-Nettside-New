'use client';

/* Offentlig SEO-landing: «Gratis husleiekontrakt med BankID-signering».
   Rolig, redaksjonelt DigiHome-design (ikke WordPress-følelse). Verdi først:
   CTA går til vår innloggingsløse wizard. Kontoen opprettes av appen ved
   signering. */

import React, { useState } from 'react';
import Link from 'next/link';
import { FileText, ShieldCheck, Wallet, Scale, Pencil, Smartphone, ArrowRight, ChevronDown, Check } from 'lucide-react';
import NavV4 from '@/components/forside/v4/NavV4';
import Footer from '@/components/dh/Footer';
import { T, display, DIM, SVAK, HAIR } from '@/components/forside/v4/tokens';
import KontraktPreview from '@/components/leiekontrakt/KontraktPreview';

const LILLA = T.lilla; const INK = T.ink; const GRONN = T.gronn;

const EKSEMPEL = {
  bolig: { adresse: 'Nygårdsgaten 5', postnr: '5015', poststed: 'Bergen', type: 'leilighet', sqm: 62, soverom: 2, mobilering: 'delvis' },
  leietaker: { kind: 'privat', navn: 'Emma Lie' },
  vilkaar: { kontraktstype: 'tidsubestemt', start: '2026-08-01', oppsigelse: '3', leie: 14500, forfallsdag: 1, utgifterInkludert: false, depositumType: 'konto', depositumMnd: 3 },
  owner: { kind: 'privat', navn: 'Martin K.' },
};

const VERDIER = [
  [FileText, 'Alt digitalt', 'Fyll ut, se kontrakten ta form og last ned – hele prosessen skjer i nettleseren.'],
  [ShieldCheck, 'BankID-signering', 'Begge parter signerer med BankID. Samme juridiske verdi som penn på papir.'],
  [Wallet, 'Depositum integrert', 'Opprett depositumskonto rett fra kontrakten – eller la den stå tom om du vil.'],
  [Scale, 'Juridisk korrekt', 'Bygget på husleieloven med paragrafene Husleietvistutvalget anbefaler.'],
  [Pencil, 'Tilpassbar', 'Legg til egne bestemmelser der du trenger det – uten at avtalen mister kraft.'],
  [Smartphone, 'Leietaker slipper app', 'Leietaker får en lenke på e-post og signerer med sin egen BankID. Ingen nedlasting.'],
];

const STEG = [
  ['01', 'Fyll inn boligen, leietaker og vilkår', 'Steg for steg – de fleste er ferdige på 3–5 minutter.'],
  ['02', 'Se kontrakten og opprett konto', 'Kontrakten fyller seg selv ut mens du skriver. Opprett konto når du er klar til å signere.'],
  ['03', 'Signer med BankID', 'Du signerer, leietaker får en lenke på e-post og signerer med sin BankID. Begge får PDF-en.'],
];

const FAQ = [
  ['Er det virkelig gratis å lage kontrakt?', 'Ja. Du fyller ut, signerer med BankID og laster ned uten kostnad. Vi tjener først penger hvis du vil ha mer – depositumskonto, husleieinnkreving eller selvforvaltning til 5 % av leien – og det er alltid valgfritt.'],
  ['Er kontrakten juridisk gyldig?', 'Ja. Den bygger på husleieloven av 26. mars 1999 nr. 17 og inneholder paragrafene Husleietvistutvalget anbefaler. Signert med BankID har den samme verdi som en håndskrevet underskrift.'],
  ['Hvor lang tid tar det?', 'De fleste er ferdige på 3–5 minutter. Du fyller inn bolig, leietaker og vilkår – så tar kontrakten form av seg selv. Deretter signerer du med BankID når det passer.'],
  ['Må leietakeren registrere seg?', 'Nei. Når du har signert, sender vi en lenke til leietakerens e-post. De åpner kontrakten i nettleseren og signerer med sin egen BankID – uten app og uten å opprette konto.'],
  ['Hva skjer etter at kontrakten er signert?', 'Begge parter får en PDF på e-post, og kontrakten arkiveres trygt. Derfra kan du enkelt legge til depositumskonto, husleieinnkreving og KPI-regulering hvis du vil.'],
];

function Faq() {
  const [aap, setAap] = useState(0);
  return (
    <div className="mx-auto max-w-2xl">
      {FAQ.map(([q, a], i) => (
        <div key={q} className="border-t" style={{ borderColor: HAIR }}>
          <button onClick={() => setAap(aap === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 py-4 text-left">
            <span className="text-[15px] font-medium" style={{ color: INK }}>{q}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${aap === i ? 'rotate-180' : ''}`} style={{ color: SVAK }} />
          </button>
          {aap === i ? <p className="pb-5 text-[14px] leading-relaxed" style={{ color: DIM, maxWidth: '60ch' }}>{a}</p> : null}
        </div>
      ))}
    </div>
  );
}

export default function HusleiekontraktLanding() {
  return (
    <main className="min-h-screen" style={{ background: T.canvas, color: INK }}>
      <style>{`
        @keyframes lkFloat { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-9px) } }
        @keyframes lkAurora { 0%{ transform: translate(0,0) scale(1) } 50%{ transform: translate(22px,-16px) scale(1.12) } 100%{ transform: translate(0,0) scale(1) } }
        .lk-float { animation: lkFloat 7s ease-in-out infinite }
        .lk-aurora { animation: lkAurora 15s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .lk-float, .lk-aurora { animation: none !important } }
      `}</style>
      <NavV4 />

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pt-28 sm:px-8 sm:pt-32">
        <div aria-hidden className="lk-aurora pointer-events-none absolute -right-10 top-4 h-[540px] w-[540px]" style={{ background: 'radial-gradient(circle, rgba(212,150,255,0.5), rgba(212,150,255,0) 70%)', filter: 'blur(56px)' }} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: 'rgba(212,150,255,0.14)', color: '#6D3A99' }}>
              <ShieldCheck className="h-3.5 w-3.5" /> Signeres med BankID
            </span>
            <h1 className="mt-5 text-[40px] leading-[0.98] sm:text-[58px]" style={{ ...display }}>Gratis husleiekontrakt med BankID-signering</h1>
            <p className="mt-5 text-[16px] leading-[1.6] sm:text-[18px]" style={{ color: DIM, maxWidth: '48ch' }}>Lag en juridisk gyldig leiekontrakt på noen minutter. Fyll inn boligen, se kontrakten ta form, og signer med BankID – helt gratis.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/utleier/husleiekontrakt/start" className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold transition-transform hover:-translate-y-0.5" style={{ background: INK, color: T.offwhite }}>
                Lag husleiekontrakt <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-[13px]" style={{ color: SVAK }}>Gratis · ingen binding · 3–5 min</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              {['Husleieloven', 'BankID', 'Depositumskonto', 'Gratis PDF'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: DIM }}><Check className="h-3.5 w-3.5" style={{ color: GRONN }} /> {t}</span>
              ))}
            </div>
          </div>
          <div className="relative lg:pl-6">
            <div className="lk-float"><KontraktPreview u={EKSEMPEL} /></div>
          </div>
        </div>
      </section>

      {/* Verdier */}
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-[28px] sm:text-[36px]" style={{ ...display }}>Hvorfor lage kontrakten hos DigiHome</h2>
          <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {VERDIER.map(([Ikon, t, d]) => (
              <div key={t}>
                <span className="grid h-10 w-10 place-items-center rounded-[10px]" style={{ background: 'rgba(212,150,255,0.14)' }}><Ikon className="h-5 w-5" style={{ color: '#6D3A99' }} strokeWidth={1.9} /></span>
                <p className="mt-3.5 text-[16px] font-semibold" style={{ color: INK }}>{t}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: DIM }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slik fungerer det */}
      <section className="px-5 py-20 sm:px-8" style={{ background: T.flate }}>
        <div className="mx-auto max-w-5xl">
          <h2 className="text-[28px] sm:text-[36px]" style={{ ...display }}>Slik lager du kontrakten</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEG.map(([nr, t, d]) => (
              <div key={nr} className="border-t pt-4" style={{ borderColor: HAIR }}>
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: LILLA }}>{nr}</span>
                <p className="mt-2 text-[16px] font-semibold" style={{ color: INK }}>{t}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: DIM }}>{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/utleier/husleiekontrakt/start" className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold" style={{ background: INK, color: T.offwhite }}>Kom i gang gratis <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* Pris */}
      <section className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[28px] sm:text-[36px]" style={{ ...display }}>Gratis kontrakt. Betal først når du vil ha mer.</h2>
          <p className="mt-4 text-[16px] leading-relaxed" style={{ color: DIM }}>Å lage og signere husleiekontrakten er gratis, uten binding. Vil du ha depositumskonto, automatisk husleieinnkreving og KPI-regulering, kan du la systemet drifte utleien for deg – <span style={{ color: INK, fontWeight: 600 }}>selvforvaltning til 5 % av husleien</span>, eller full forvaltning der vi tar alt.</p>
          <div className="mt-8">
            <Link href="/utleier/husleiekontrakt/start" className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold" style={{ background: INK, color: T.offwhite }}>Lag husleiekontrakt <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-center text-[28px] sm:text-[36px]" style={{ ...display }}>Ofte stilte spørsmål</h2>
          <Faq />
        </div>
      </section>

      <Footer />
    </main>
  );
}
