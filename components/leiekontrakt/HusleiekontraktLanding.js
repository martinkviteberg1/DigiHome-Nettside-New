'use client';

/* Offentlig SEO-landing: «Gratis husleiekontrakt med BankID-signering».
   Verdensklasse, redaksjonelt DigiHome-uttrykk (samme stemme som forsiden):
   stein-canvas, PP Right Grotesk-display, rolig bevegelse, ekte dybde. Verdi
   først — CTA går til den innloggingsløse wizarden; kontoen opprettes i appen
   ved signering. */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FileText, ShieldCheck, Wallet, Scale, Pencil, Smartphone, ArrowRight, ChevronDown, Check, Sparkles, Clock, KeyRound, PenLine } from 'lucide-react';
import NavV4 from '@/components/forside/v4/NavV4';
import Footer from '@/components/dh/Footer';
import { T, display, DIM, SVAK, HAIR, EASE } from '@/components/forside/v4/tokens';
import KontraktPreview from '@/components/leiekontrakt/KontraktPreview';

const LILLA = T.lilla; const INK = T.ink; const GRONN = T.gronn;
const WIZARD = '/utleier/husleiekontrakt/start';

const IMG_APARTMENT = 'https://images.unsplash.com/photo-1772797583328-f83bc3f94f80?auto=format&fit=crop&w=1400&q=80';
const IMG_KEYS = 'https://images.unsplash.com/photo-1741156386380-0236c72eb6f9?auto=format&fit=crop&w=1100&q=80';

const EKSEMPEL = {
  bolig: { adresse: 'Nygårdsgaten 5', postnr: '5015', poststed: 'Bergen', type: 'leilighet', sqm: 62, soverom: 2, mobilering: 'delvis', matrikkel_str: '4601-165/96/12' },
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
  [PenLine, '01', 'Fyll inn boligen, leietaker og vilkår', 'Søk opp adressen – vi henter matrikkel og seksjon fra Eiendomsregisteret. De fleste er ferdige på 3–5 minutter.'],
  [FileText, '02', 'Se kontrakten og opprett konto', 'Kontrakten fyller seg selv ut mens du skriver. Opprett konto når du er klar til å signere.'],
  [KeyRound, '03', 'Signer med BankID', 'Du signerer, leietaker får en lenke på e-post og signerer med sin BankID. Begge får PDF-en.'],
];

const PRISER = [
  { navn: 'Kontrakt', pris: 'Gratis', enhet: '', tekst: 'Lag og signer husleiekontrakt med BankID. Last ned PDF. Ingen binding.', punkter: ['Husleieloven-mal', 'BankID-signering', 'Gratis PDF'], cta: 'Lag kontrakt', frem: false },
  { navn: 'Selvforvaltning', pris: '5 %', enhet: 'av husleien', tekst: 'La systemet drifte utleien for deg – du beholder kontrollen.', punkter: ['Depositumskonto', 'Automatisk husleieinnkreving', 'KPI-regulering & purring'], cta: 'Kom i gang', frem: true },
  { navn: 'Full forvaltning', pris: 'Alt inkludert', enhet: '', tekst: 'Vi tar hånd om hele utleien – fra leietaker til regnskap.', punkter: ['Alt i selvforvaltning', 'Utleie & visning', 'Løpende oppfølging'], cta: 'Snakk med oss', frem: false },
];

const FAQ = [
  ['Er det virkelig gratis å lage kontrakt?', 'Ja. Du fyller ut, signerer med BankID og laster ned uten kostnad. Vi tjener først penger hvis du vil ha mer – depositumskonto, husleieinnkreving eller selvforvaltning til 5 % av leien – og det er alltid valgfritt.'],
  ['Er kontrakten juridisk gyldig?', 'Ja. Den bygger på husleieloven av 26. mars 1999 nr. 17 og inneholder paragrafene Husleietvistutvalget anbefaler. Signert med BankID har den samme verdi som en håndskrevet underskrift.'],
  ['Hvor lang tid tar det?', 'De fleste er ferdige på 3–5 minutter. Du fyller inn bolig, leietaker og vilkår – så tar kontrakten form av seg selv. Deretter signerer du med BankID når det passer.'],
  ['Må leietakeren registrere seg?', 'Nei. Når du har signert, sender vi en lenke til leietakerens e-post. De åpner kontrakten i nettleseren og signerer med sin egen BankID – uten app og uten å opprette konto.'],
  ['Hva skjer etter at kontrakten er signert?', 'Begge parter får en PDF på e-post, og kontrakten arkiveres trygt. Derfra kan du enkelt legge til depositumskonto, husleieinnkreving og KPI-regulering hvis du vil.'],
];

/* Rolig scroll-avsløring — respekterer redusert bevegelse. */
function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVis(true); return undefined; }
    const io = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } }); }, { threshold: 0.14 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(20px)', transition: `opacity 720ms ${EASE} ${delay}ms, transform 720ms ${EASE} ${delay}ms` }}>{children}</Tag>;
}

function CtaKnapp({ href, children, variant = 'ink', className = '' }) {
  const stil = variant === 'ink'
    ? { background: INK, color: T.offwhite }
    : { background: T.offwhite, color: INK, boxShadow: `inset 0 0 0 1px ${HAIR}` };
  return (
    <Link href={href} className={`group inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold transition-transform duration-300 hover:-translate-y-0.5 ${className}`} style={stil}>
      {children} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
    </Link>
  );
}

function Faq() {
  const [aap, setAap] = useState(0);
  return (
    <div className="mx-auto max-w-2xl">
      {FAQ.map(([q, a], i) => (
        <div key={q} className="border-t" style={{ borderColor: HAIR }}>
          <button onClick={() => setAap(aap === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left">
            <span className="text-[15.5px] font-medium" style={{ color: INK }}>{q}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${aap === i ? 'rotate-180' : ''}`} style={{ color: SVAK }} />
          </button>
          <div className="grid transition-all duration-300" style={{ gridTemplateRows: aap === i ? '1fr' : '0fr' }}>
            <div className="overflow-hidden">
              <p className="pb-5 text-[14.5px] leading-relaxed" style={{ color: DIM, maxWidth: '60ch' }}>{a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HusleiekontraktLanding() {
  return (
    <main className="min-h-screen overflow-x-clip" style={{ background: T.canvas, color: INK }}>
      <style>{`
        @keyframes lkFloat { 0%,100%{ transform: translateY(0) rotate(-1.2deg) } 50%{ transform: translateY(-12px) rotate(-1.2deg) } }
        @keyframes lkAurora { 0%{ transform: translate(0,0) scale(1) } 50%{ transform: translate(26px,-18px) scale(1.14) } 100%{ transform: translate(0,0) scale(1) } }
        @keyframes lkChip { 0%{ opacity:0; transform: translateY(8px) scale(.96) } 100%{ opacity:1; transform: none } }
        .lk-float { animation: lkFloat 8s ease-in-out infinite }
        .lk-aurora { animation: lkAurora 17s ease-in-out infinite }
        .lk-chip { animation: lkChip .6s cubic-bezier(0.16,1,0.3,1) .5s both }
        @media (prefers-reduced-motion: reduce) { .lk-float, .lk-aurora, .lk-chip { animation: none !important } }
      `}</style>
      <NavV4 />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative px-5 pt-24 sm:px-8 sm:pt-28 lg:pt-32">
        {/* Dybde: to myke lilla-auroraer + fint rutenett */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="lk-aurora absolute -right-24 -top-10 h-[620px] w-[620px]" style={{ background: 'radial-gradient(circle, rgba(212,150,255,0.42), rgba(212,150,255,0) 70%)', filter: 'blur(60px)' }} />
          <div className="lk-aurora absolute -left-32 top-40 h-[420px] w-[420px]" style={{ background: 'radial-gradient(circle, rgba(212,150,255,0.22), rgba(212,150,255,0) 70%)', filter: 'blur(60px)', animationDelay: '3s' }} />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.04fr_0.96fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium" style={{ background: 'rgba(212,150,255,0.16)', color: '#6D3A99' }}>
              <Sparkles className="h-3.5 w-3.5" /> Gratis · signeres med BankID
            </span>
            <h1 className="mt-5 text-[clamp(42px,5.4vw,82px)]" style={{ ...display }}>
              Husleiekontrakt,<br />gjort på minutter<span style={{ color: LILLA }}>.</span>
            </h1>
            <p className="mt-6 text-[17px] leading-[1.6] sm:text-[19px]" style={{ color: DIM, maxWidth: '46ch' }}>
              Lag en juridisk gyldig leiekontrakt gratis. Søk opp boligen, se kontrakten ta form mens du skriver, og signer med BankID.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <CtaKnapp href={WIZARD}>Lag husleiekontrakt</CtaKnapp>
              <span className="inline-flex items-center gap-1.5 text-[13.5px]" style={{ color: SVAK }}><Clock className="h-4 w-4" /> 3–5 minutter · ingen binding</span>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2.5">
              {['Husleieloven', 'BankID', 'Depositumskonto', 'Gratis PDF'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-[13.5px]" style={{ color: DIM }}><Check className="h-4 w-4" style={{ color: GRONN }} /> {t}</span>
              ))}
            </div>
          </div>

          {/* Flytende «papir» med dybde + signert-chip */}
          <div className="relative">
            <div className="lk-float relative mx-auto max-w-[420px]">
              <KontraktPreview u={EKSEMPEL} />
              <div className="lk-chip absolute -bottom-4 -left-4 flex items-center gap-2 rounded-full px-3.5 py-2 sm:-left-6" style={{ background: '#fff', boxShadow: '0 18px 40px -20px rgba(21,19,15,0.4), inset 0 0 0 1px rgba(21,19,15,0.06)' }}>
                <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: 'rgba(31,157,85,0.14)' }}><Check className="h-3.5 w-3.5" style={{ color: GRONN }} /></span>
                <span className="text-[12.5px] font-medium" style={{ color: INK }}>Signert med BankID</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TILLITSTRIPE ─────────────────────────────────────────────────── */}
      <section className="px-5 pt-20 sm:px-8 sm:pt-28">
        <Reveal className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 border-y py-5 text-center text-[13px] font-medium tracking-wide" style={{ borderColor: HAIR, color: SVAK }}>
            <span>BYGGET PÅ HUSLEIELOVEN AV 1999</span>
            <span className="hidden h-1 w-1 rounded-full sm:inline-block" style={{ background: HAIR }} />
            <span>BANKID-SIGNERING</span>
            <span className="hidden h-1 w-1 rounded-full sm:inline-block" style={{ background: HAIR }} />
            <span>OPPSLAG I EIENDOMSREGISTERET</span>
            <span className="hidden h-1 w-1 rounded-full sm:inline-block" style={{ background: HAIR }} />
            <span>DEPOSITUMSKONTO</span>
          </div>
        </Reveal>
      </section>

      {/* ── VERDIER ──────────────────────────────────────────────────────── */}
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: LILLA }}>Hvorfor DigiHome</p>
            <h2 className="mt-3 max-w-[18ch] text-[32px] sm:text-[44px]" style={{ ...display }}>En kontrakt som gjør jobben for deg</h2>
          </Reveal>
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {VERDIER.map(([Ikon, t, d], i) => (
              <Reveal key={t} delay={(i % 3) * 70}>
                <div className="group h-full rounded-2xl p-5 transition-colors duration-300 hover:bg-white/60" style={{ boxShadow: `inset 0 0 0 1px transparent` }}>
                  <span className="grid h-11 w-11 place-items-center rounded-[12px] transition-transform duration-300 group-hover:-translate-y-0.5" style={{ background: 'rgba(212,150,255,0.16)' }}><Ikon className="h-5 w-5" style={{ color: '#6D3A99' }} strokeWidth={1.9} /></span>
                  <p className="mt-4 text-[17px] font-semibold" style={{ color: INK }}>{t}</p>
                  <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: DIM }}>{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUKT-MOMENT (foto + kontrakt) ─────────────────────────────── */}
      <section className="px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="relative overflow-hidden rounded-[28px]" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG_APARTMENT} alt="Lys skandinavisk leilighet" className="h-[380px] w-full object-cover sm:h-[520px]" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(21,19,15,0.62) 0%, rgba(21,19,15,0.28) 45%, rgba(21,19,15,0) 78%)' }} />
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-[30ch] px-6 sm:px-12">
                  <h2 className="text-[30px] leading-[1.02] text-white sm:text-[46px]" style={{ ...display }}>Kontrakten fyller seg selv ut</h2>
                  <p className="mt-4 text-[15px] leading-relaxed text-white/85 sm:text-[17px]">Skriv inn adressen, så henter vi matrikkel og seksjon fra Eiendomsregisteret. For sameier velger du riktig seksjon – detaljene kommer av seg selv.</p>
                  <div className="mt-7"><CtaKnapp href={WIZARD} variant="lys">Prøv nå</CtaKnapp></div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SLIK FUNGERER DET ────────────────────────────────────────────── */}
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: LILLA }}>Slik fungerer det</p>
            <h2 className="mt-3 text-[32px] sm:text-[44px]" style={{ ...display }}>Fra adresse til signert på tre steg</h2>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEG.map(([Ikon, nr, t, d], i) => (
              <Reveal key={nr} delay={i * 90}>
                <div className="relative h-full rounded-2xl bg-white/60 p-6" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-[12px]" style={{ background: INK }}><Ikon className="h-5 w-5" style={{ color: T.offwhite }} strokeWidth={1.8} /></span>
                    <span className="text-[34px] font-semibold tabular-nums" style={{ ...display, color: 'rgba(21,19,15,0.1)' }}>{nr}</span>
                  </div>
                  <p className="mt-5 text-[18px] font-semibold" style={{ color: INK }}>{t}</p>
                  <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: DIM }}>{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRISER ───────────────────────────────────────────────────────── */}
      <section className="px-5 py-20 sm:px-8" style={{ background: T.flate }}>
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center">
            <h2 className="text-[32px] sm:text-[44px]" style={{ ...display }}>Gratis kontrakt. Betal først når du vil ha mer.</h2>
            <p className="mx-auto mt-4 max-w-[60ch] text-[16px] leading-relaxed" style={{ color: DIM }}>Å lage og signere husleiekontrakten er alltid gratis. Vil du ha depositumskonto, husleieinnkreving og KPI-regulering, lar du systemet drifte utleien for deg.</p>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PRISER.map((p, i) => (
              <Reveal key={p.navn} delay={i * 80}>
                <div className="flex h-full flex-col rounded-3xl p-7" style={p.frem ? { background: INK, color: T.offwhite, boxShadow: '0 40px 80px -44px rgba(21,19,15,0.6)' } : { background: '#fff', boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold" style={{ color: p.frem ? T.offwhite : INK }}>{p.navn}</p>
                    {p.frem ? <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: LILLA, color: INK }}>Populær</span> : null}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-[34px]" style={{ ...display, color: p.frem ? T.offwhite : INK }}>{p.pris}</span>
                    {p.enhet ? <span className="text-[13px]" style={{ color: p.frem ? 'rgba(244,241,234,0.65)' : SVAK }}>{p.enhet}</span> : null}
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed" style={{ color: p.frem ? 'rgba(244,241,234,0.8)' : DIM }}>{p.tekst}</p>
                  <ul className="mt-5 space-y-2.5">
                    {p.punkter.map((pt) => (
                      <li key={pt} className="flex items-center gap-2 text-[14px]" style={{ color: p.frem ? 'rgba(244,241,234,0.92)' : INK }}>
                        <Check className="h-4 w-4 shrink-0" style={{ color: p.frem ? LILLA : GRONN }} /> {pt}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-7 pt-1">
                    <Link href={WIZARD} className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[14.5px] font-semibold transition-transform duration-300 hover:-translate-y-0.5" style={p.frem ? { background: T.offwhite, color: INK } : { background: INK, color: T.offwhite }}>
                      {p.cta} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <Reveal><h2 className="mb-6 text-center text-[32px] sm:text-[44px]" style={{ ...display }}>Ofte stilte spørsmål</h2></Reveal>
          <Reveal delay={80}><Faq /></Reveal>
        </div>
      </section>

      {/* ── AVSLUTNING (CTA-band) ────────────────────────────────────────── */}
      <section className="px-5 pb-24 sm:px-8">
        <Reveal className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[32px] px-8 py-16 text-center sm:px-12 sm:py-24" style={{ background: INK, color: T.offwhite }}>
            <div aria-hidden className="lk-aurora pointer-events-none absolute -right-16 -top-16 h-[420px] w-[420px]" style={{ background: 'radial-gradient(circle, rgba(212,150,255,0.5), rgba(212,150,255,0) 70%)', filter: 'blur(50px)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG_KEYS} alt="" aria-hidden className="pointer-events-none absolute -bottom-8 right-6 hidden h-48 w-48 rounded-3xl object-cover opacity-40 lg:block" style={{ maskImage: 'linear-gradient(180deg, transparent, #000 40%)' }} />
            <div className="relative">
              <h2 className="mx-auto max-w-[16ch] text-[36px] leading-[1.0] sm:text-[60px]" style={{ ...display }}>Lag din husleiekontrakt nå<span style={{ color: LILLA }}>.</span></h2>
              <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed" style={{ color: 'rgba(244,241,234,0.78)' }}>Gratis, juridisk gyldig og signert med BankID. De fleste er ferdige på under fem minutter.</p>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <CtaKnapp href={WIZARD} variant="lys">Lag husleiekontrakt</CtaKnapp>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </main>
  );
}
