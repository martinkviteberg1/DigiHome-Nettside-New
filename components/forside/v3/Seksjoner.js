'use client';

import React, { useRef } from 'react';
import { Check } from 'lucide-react';
import { display, heading, Avsloer, Etikett, Knapp, Lenke, tall, T, useSynlig, Inn } from './motion';

/* ---------------------------------------------------------------------------
   Seksjoner — Statement (lys) · Bilde (mørkt bånd) · For hvem (lys) ·
   Trygghet (lys) · Slutt-CTA (mørk)
--------------------------------------------------------------------------- */

const INK = '#0F0E10';

/* ── Statement — produktintro. Et ekte hjem, og det stille boligkortet som
      passer på det. Produkt i kontekst — ikke dashbord i vakuum. ── */
export function Statement() {
  return (
    <section className="relative" data-testid="v3-statement">
      <div className="mx-auto w-full max-w-[1280px] px-6 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:gap-20">
          <Avsloer className="order-2 lg:order-1">
            <figure className="relative overflow-hidden rounded-[20px]" data-testid="v3-statement-foto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/v3/hjem-spisestue.webp" alt="Lys leilighet i Bergen" loading="lazy" className="h-[440px] w-full object-cover sm:h-[540px] lg:h-[620px]" style={{ objectPosition: '50% 60%' }} />
              <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(15,14,16,0.18) 100%)' }} />
              {/* Det svevende boligkortet */}
              <div className="absolute inset-x-5 bottom-5 rounded-[14px] bg-white p-4 shadow-[0_28px_64px_-28px_rgba(20,15,30,0.5)] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[352px]" aria-hidden="true">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-bold text-[#111827]" style={heading}>Marken 8</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-[#6B7280]">5017 Bergen · 3-roms · 74 m²</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#effaf0] px-2.5 py-1 text-[11px] font-semibold text-[#15803d]"><span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" /> Utleid</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#F3F4F6] pt-3">
                  <span className="text-[12px] text-[#6B7280]">Husleie mottatt · 1. mars · KID</span>
                  <span className="text-[14.5px] font-bold text-[#111827]" style={heading}>{tall(18500)} <span className="text-[11px] font-normal text-[#9CA3AF]">kr</span></span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[12px] text-[#6B7280]">
                  <Check className="h-3.5 w-3.5 text-[#15803d]" strokeWidth={2.4} /> Alt i orden. Ingenting krever deg.
                </div>
              </div>
            </figure>
          </Avsloer>
          <Avsloer delay={120} className="order-1 lg:order-2">
            <h2 className="max-w-[15ch] text-[36px] text-[#0F0E10] sm:text-[52px] lg:text-[60px]" style={display}>Utleie skal ikke være en deltidsjobb.</h2>
            <p className="mt-6 max-w-[44ch] text-[18px] leading-[1.55] text-[#0F0E10]/65 sm:text-[20px]">
              De fleste som leier ut har én bolig og en full jobb. De som forvalter
              mange har for få timer. DigiHome er bygget for begge: systemet gjør
              det repetitive, du tar avgjørelsene — eller lar oss ta dem.
            </p>
            <div className="mt-8"><Lenke href="#reisen">Se hvordan det virker</Lenke></div>
          </Avsloer>
        </div>
      </div>
    </section>
  );
}

/* ── Bilde — Bergen i full bredde. Områdene vi kjenner, som stille pins. ── */
const OMRADER = [
  { n: 'Sentrum', x: 50, y: 56, mobil: true },
  { n: 'Nordnes', x: 31, y: 47, mobil: true },
  { n: 'Sandviken', x: 67, y: 27 },
  { n: 'Møhlenpris', x: 38, y: 70 },
  { n: 'Årstad', x: 71, y: 74, mobil: true },
];

export function Bilde() {
  const ref = useRef(null);
  const inne = useSynlig(ref, 0.3);
  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0D0B0F] text-white" data-testid="v3-bilde">
      <div className="relative h-[560px] sm:h-[640px] lg:h-[740px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bergen-aerial.webp" alt="Bergen sett fra Fløyen — byen der DigiHome forvalter sin egen portefølje" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 58%' }} />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(13,11,15,0.10) 0%, rgba(13,11,15,0.22) 40%, rgba(13,11,15,0.94) 100%)' }} />
        {/* Områdepins — dekorative, staggret inn */}
        <div aria-hidden="true" className="absolute inset-0">
          {OMRADER.map((o, i) => (
            <Inn key={o.n} vis={inne} delay={300 + i * 160} dy={6} className={`absolute ${o.mobil ? '' : 'hidden sm:block'}`} style={{ left: `${o.x}%`, top: `${o.y}%` }}>
              <span className="flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
                <span className="relative flex h-3 w-3 items-center justify-center">
                  <span className="absolute h-3 w-3 rounded-full bg-white/30" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <span className="rounded-full bg-[#0D0B0F]/70 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-sm">{o.n}</span>
              </span>
            </Inn>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-6 pb-12 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pb-16">
            <Avsloer>
              <Etikett mork>Bergen · områder vi kjenner</Etikett>
              <p className="mt-2 text-[30px] text-white sm:text-[40px]" style={display}>Vi er selv forvaltere.</p>
              <p className="mt-3 max-w-[48ch] text-[15.5px] leading-[1.6] text-white/70 sm:text-[17px]">DigiHome Forvaltning driver hele sin portefølje i Bergen på dette systemet — hver dag. Vi kjenner gatene, leieprisene og håndverkerne. Det du ser på denne siden, bruker vi selv.</p>
            </Avsloer>
            <Avsloer delay={120}><Lenke mork href="/utleie" className="shrink-0">Se områdene</Lenke></Avsloer>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── For hvem — tre kolonner: ett ekte foto, én tittel, tre setninger, én lenke.
      Ingen widgets, ingen oppdiktede tall. Segmentene lever på egne sider. ── */
const HVEM = [
  { foto: '/v3/hjem-kjokken.webp', alt: 'Kjøkken i utleieleilighet', pos: '50% 55%', t: 'Privat huseier',
    b: 'Én eller noen få boliger ved siden av full jobb. Annonse, kontrakt, husleie og saker i én portal — uten regneark, purringer og papir.',
    href: '/privat', lenke: 'For privat huseier', testid: 'privat' },
  { foto: '/v3/bergen-hus.webp', alt: 'Boliger i Fjellsiden, Bergen', pos: '50% 60%', t: 'Full forvaltning',
    b: 'Vi tar visning, kontrakt, innkreving og oppfølging i Bergen og omegn. Du følger med i samme portal og godkjenner det som koster penger.',
    href: '/forvaltning', lenke: 'Om full forvaltning', testid: 'forvaltning' },
  { foto: '/v3/bygaard.webp', alt: 'Bygård med leiligheter', pos: '50% 40%', t: 'Bedrift og portefølje',
    b: 'Team, roller, saker, leverandører og økonomi på tvers av hele eiendomsmassen. Samme system for ti enheter og for tusen.',
    href: '/bedrift', lenke: 'For bedrift og portefølje', testid: 'bedrift' },
];

export function ForHvem() {
  return (
    <section id="for-hvem" className="scroll-mt-16" data-testid="v3-for-hvem">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-24 sm:px-8 sm:py-32">
        <Avsloer>
          <h2 className="max-w-[22ch] text-[34px] text-[#0F0E10] sm:text-[44px] lg:text-[52px]" style={display}>For deg som har én bolig. Og for deg som har hundre.</h2>
        </Avsloer>
        <div className="mt-12 grid gap-x-8 gap-y-14 sm:mt-16 lg:grid-cols-3">
          {HVEM.map((h, i) => (
            <Avsloer key={h.t} delay={i * 80} className="h-full">
              <div className="flex h-full flex-col" data-testid={`v3-hvem-${h.testid}`}>
                <div className="overflow-hidden rounded-[16px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={h.foto} alt={h.alt} loading="lazy" className="h-[260px] w-full object-cover transition-transform duration-[1200ms] ease-out hover:scale-[1.03]" style={{ objectPosition: h.pos }} />
                </div>
                <h3 className="mt-7 text-[26px] text-[#0F0E10] sm:text-[28px]" style={display}>{h.t}</h3>
                <p className="mt-3 max-w-[40ch] text-[15.5px] leading-[1.6] text-[#0F0E10]/60">{h.b}</p>
                <Lenke href={h.href} className="mt-5" data-testid={`v3-hvem-lenke-${h.testid}`}>{h.lenke}</Lenke>
              </div>
            </Avsloer>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Trygghet — «Kontrollen er bygget inn.» Ren definisjonsliste, ingen ikoner.
      Kun det vi kan dokumentere. ── */
const PUNKTER = [
  ['Kontrakter etter husleieloven', 'Bygget fra mal, signert med BankID gjennom Posten Signering. Depositum på egen konto.'],
  ['Husleie som stemmer', 'KID på hver innbetaling, automatisk purring og oppgjør du kan stole på — og eksport til regnskapet.'],
  ['Du godkjenner det som koster', 'Alt som koster penger eller binder deg, stopper og venter på ett trykk fra deg. Resten går.'],
  ['Mennesker når du vil', 'Forvalter, kundeservice og håndverkere er ett trykk unna når du trenger dem. Ellers er de stille.'],
];

const INTEGRASJONER = ['FINN', 'BankID', 'Posten Signering', 'Keyhole', 'Lea Bank', 'PowerOffice', 'Fiken', 'Airbnb', 'Booking.com'];

export function Trygghet() {
  return (
    <section className="border-t border-[#0F0E10]/[0.08]" data-testid="v3-trygghet">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <Avsloer>
            <h2 className="max-w-[12ch] text-[34px] text-[#0F0E10] sm:text-[44px] lg:text-[52px]" style={display}>Kontrollen er bygget inn.</h2>
            <p className="mt-6 max-w-[40ch] text-[17px] leading-[1.55] text-[#0F0E10]/60">
              Autopilot betyr ikke at ingen har kontroll. Det betyr at kontrollen ligger i
              kontraktene, i pengeflyten og i menneskene bak — ikke i innboksen din.
            </p>
          </Avsloer>
          <Avsloer delay={120}>
            <dl className="border-t border-[#0F0E10]/[0.12]">
              {PUNKTER.map(([t, b]) => (
                <div key={t} className="grid gap-2 border-b border-[#0F0E10]/[0.08] py-6 sm:grid-cols-[240px_minmax(0,1fr)] sm:gap-8">
                  <dt className="text-[17px] font-medium tracking-[-0.015em] text-[#0F0E10]">{t}</dt>
                  <dd className="text-[15.5px] leading-[1.6] text-[#0F0E10]/60">{b}</dd>
                </div>
              ))}
            </dl>
          </Avsloer>
        </div>
        <Avsloer delay={200}>
          <div className="mt-14 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[13px] font-medium text-[#8A867F]">Snakker med det du allerede bruker</p>
            <ul className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {INTEGRASJONER.map((n) => (
                <li key={n} className="text-[15px] font-medium tracking-[-0.01em] text-[#0F0E10]/45">{n}</li>
              ))}
            </ul>
          </div>
        </Avsloer>
      </div>
    </section>
  );
}

/* ── Slutt-CTA — mørk, går rett over i footer ── */
export function SluttCTA({ onKlikk }) {
  return (
    <section className="relative overflow-hidden bg-[#0D0B0F] text-white" data-testid="v3-cta">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[520px]" style={{ background: 'radial-gradient(55% 60% at 50% 110%, rgba(212,150,255,0.14) 0%, rgba(212,150,255,0.04) 50%, transparent 78%)' }} />
      <div className="relative mx-auto w-full max-w-[1280px] px-6 py-28 text-center sm:px-8 sm:py-40">
        <Avsloer>
          <h2 className="mx-auto max-w-[14ch] text-[36px] text-white sm:text-[52px] lg:text-[64px]" style={display}>Klar for utleie på autopilot<span style={{ color: T.lilla }}>?</span></h2>
          <p className="mx-auto mt-5 max-w-[40ch] text-[16px] leading-[1.55] text-white/55 sm:text-[18px]">Kom i gang på minuttet — eller book en prat, så finner vi ut hva som passer deg.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Knapp href="/bli-utleier/start" onClick={() => onKlikk && onKlikk('bunn')} data-testid="v3-bunn-cta">Kom i gang</Knapp>
            <Knapp href="/book-mote" variant="sekundar" data-testid="v3-bunn-book">Book en prat</Knapp>
          </div>
        </Avsloer>
      </div>
    </section>
  );
}
