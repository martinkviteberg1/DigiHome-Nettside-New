'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Scale, Banknote, HeartHandshake, Layers } from 'lucide-react';
import { heading, Avsloer } from './motion';
import { NIVAAER } from './Reisen';

/* ---------------------------------------------------------------------------
   Seksjoner — Statement · Nivå (gaffelen) · Trygghet · Slutt-CTA
--------------------------------------------------------------------------- */

/* ── Statement — puster. Kjempetype, mye luft. ── */
export function Statement() {
  return (
    <section className="relative" data-testid="v3-statement">
      <div className="mx-auto w-full max-w-[1320px] px-6 py-28 sm:px-10 sm:py-40">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
          <Avsloer>
            <h2 className="e-display max-w-[11ch] text-[44px] sm:text-[64px] lg:text-[84px]">Utleie skal ikke være en deltidsjobb<span className="text-[#cf97fc]">.</span></h2>
          </Avsloer>
          <Avsloer delay={140} className="lg:pt-3">
            <p className="text-[18px] leading-[1.6] text-[#3A3733] sm:text-[21px]">
              De fleste som leier ut har én bolig og en full jobb. De som forvalter
              mange har for få timer. DigiHome er bygget for begge: systemet gjør
              det repetitive, du tar avgjørelsene — eller lar oss ta dem.
            </p>
          </Avsloer>
        </div>
      </div>
    </section>
  );
}

/* ── Bilde — det ene puste-øyeblikket med foto. Sant, lokalt, varmt. ── */
export function Bilde() {
  return (
    <section data-testid="v3-bilde">
      <div className="mx-auto w-full max-w-[1320px] px-6 sm:px-10">
        <Avsloer>
          <figure className="relative overflow-hidden rounded-[24px] sm:rounded-[28px]">
            <div className="relative h-[380px] sm:h-[520px] lg:h-[600px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bergen-aerial.webp" alt="Bergen sett fra Fløyen — byen der DigiHome forvalter sin egen portefølje" loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: '50% 60%' }} />
              <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(11,10,9,0) 28%, rgba(11,10,9,0.34) 58%, rgba(11,10,9,0.82) 100%)' }} />
            </div>
            <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-7 text-white sm:flex-row sm:items-end sm:justify-between sm:p-10">
              <div className="max-w-[40ch]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Bergen</p>
                <p className="mt-2 text-[22px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[30px]" style={heading}>Vi er selv forvaltere.</p>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-white/75 sm:text-[15.5px]">DigiHome Forvaltning driver hele sin portefølje i Bergen på dette systemet — hver dag. Det du ser på denne siden, bruker vi selv.</p>
              </div>
              <Link href="/om-oss" className="group inline-flex shrink-0 items-center gap-2 text-[14px] font-semibold text-white">Om oss <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></Link>
            </figcaption>
          </figure>
        </Avsloer>
      </div>
    </section>
  );
}

/* ── Nivå — segmenteringen skjer én gang, her. ── */
const KORT = [
  {
    id: 'selv', eyebrow: 'Selvbetjent', t: 'Du styrer. Systemet jobber.',
    b: 'For deg som leier ut én eller noen få boliger og vil ha full kontroll — uten regneark, purringer og papir.',
    punkter: ['FINN-annonse og interessenter', 'BankID-kontrakt og depositum', 'Husleie med KID og purring', 'Saker og meldinger i appen'],
    meta: 'Hele Norge', cta: 'Kom i gang', href: '/bli-utleier/start', mer: '/privat',
    hvem: ['A', 'D', 'A', 'A', 'D'],
  },
  {
    id: 'forvaltning', eyebrow: 'Full forvaltning', t: 'Vi tar jobben. Du ser alt.',
    b: 'For deg som vil eie, ikke drifte. Din egen forvalter tar visning, kontrakt, innkreving og oppfølging — du følger med i samme portal.',
    punkter: ['Visning og utvelgelse', 'Kontrakt og innflytting', 'Innkreving og oppgjør', 'Din egen forvalter'],
    meta: 'Bergen og omegn', cta: 'Få vurdering', href: '/forvaltning', mer: '/forvaltning',
    hvem: ['H', 'H', 'H', 'A', 'H'],
  },
  {
    id: 'portefolje', eyebrow: 'Portefølje', t: 'Hele porteføljen på én flate.',
    b: 'For forvaltere og eiendomsselskap med mange enheter. Team, roller, saker, leverandører, kalender og økonomi — i ett system som skalerer.',
    punkter: ['Team og roller', 'Saker og leverandører', 'Kalender for kort- og langtid', 'Økonomi og rapportering'],
    meta: 'Fra 5 til 1000+ enheter', cta: 'Book en demo', href: '/book-mote', mer: '/bedrift',
    hvem: ['A', 'T', 'A', 'A', 'T'], mork: true,
  },
];

/* Fem små piller: hvem gjør steg 01–05 på dette nivået */
function HvemRad({ hvem, mork }) {
  const farge = (k) => {
    if (k === 'A') return mork ? { background: 'rgba(207,151,252,0.22)', color: '#E7D6FF' } : { background: '#F1EAFB', color: '#6D4FB0' };
    if (k === 'H') return { background: '#0A0A0A', color: '#fff' };
    return mork ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' } : { background: '#fff', color: '#0A0A0A', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' };
  };
  const tekst = { A: 'Auto', H: 'DigiHome', D: 'Du', T: 'Team' };
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Hvem gjør hvert steg">
      {hvem.map((k, i) => (
        <span key={i} className="inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold" style={farge(k)}>
          <span className="tabular-nums opacity-60" style={heading}>0{i + 1}</span> {tekst[k]}
        </span>
      ))}
    </div>
  );
}

export function Nivaa({ nivaa, setNivaa }) {
  return (
    <section id="nivaa" className="scroll-mt-20" data-testid="v3-nivaa">
      <div className="mx-auto w-full max-w-[1320px] px-6 py-24 sm:px-10 sm:py-32">
        <Avsloer>
          <p className="e-label !text-[#7c7466]">Tre grader av autopilot</p>
          <h2 className="e-display mt-4 max-w-[14ch] text-[38px] sm:text-[52px] lg:text-[64px]">Én bolig eller hundre<span className="text-[#cf97fc]">?</span></h2>
          <p className="mt-5 max-w-[52ch] text-[16px] leading-[1.65] text-[#6F6A60] sm:text-[17px]">
            Samme system, samme oversikt, samme kontrakter. Forskjellen er hvor mye
            du vil sitte ved rattet — og du kan ta over når du vil.
          </p>
        </Avsloer>
        <div className="mt-12 grid gap-4 lg:grid-cols-3 lg:gap-5 sm:mt-16">
          {KORT.map((k, i) => {
            const valgt = nivaa === i;
            return (
              <Avsloer key={k.id} delay={i * 90} className="h-full">
                <article
                  onMouseEnter={() => setNivaa && setNivaa(i)}
                  data-testid={`v3-kort-${k.id}`}
                  className={`relative flex h-full flex-col rounded-[28px] p-8 transition-[box-shadow,transform] duration-300 sm:p-9 ${k.mork ? 'bg-[#0B0A09] text-white ring-1 ring-black/[0.2]' : 'bg-white ring-1 ring-black/[0.06]'} ${valgt ? 'shadow-[0_36px_80px_-40px_rgba(84,50,160,0.35)] -translate-y-[2px]' : 'shadow-[0_1px_2px_rgba(23,18,12,0.04)]'}`}
                >
                  {k.mork && <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(155,91,214,0.16) 0%, transparent 62%)' }} />}
                  <div className="relative">
                    <p className={`e-label ${k.mork ? '!text-[#C9A6F0]' : '!text-[#7c7466]'}`}>{k.eyebrow}</p>
                    <h3 className={`e-display mt-4 text-[26px] sm:text-[30px] ${k.mork ? '!text-white' : ''}`}>{k.t}</h3>
                    <p className={`mt-4 text-[14.5px] leading-[1.65] ${k.mork ? 'text-white/60' : 'text-[#6F6A60]'}`}>{k.b}</p>
                    <div className="mt-6"><HvemRad hvem={k.hvem} mork={k.mork} /></div>
                    <ul className={`mt-7 space-y-2.5 border-t pt-6 ${k.mork ? 'border-white/[0.12]' : 'border-[#ECE8E0]'}`}>
                      {k.punkter.map((p) => (
                        <li key={p} className={`flex items-center gap-2.5 text-[14px] ${k.mork ? 'text-white/85' : 'text-[#3A3733]'}`}>
                          <Check className={`h-4 w-4 shrink-0 ${k.mork ? 'text-[#C9A6F0]' : 'text-[#6D4FB0]'}`} strokeWidth={2.4} /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="relative mt-auto pt-8">
                    <p className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${k.mork ? 'text-white/40' : 'text-[#a49e93]'}`}>{k.meta}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                      <Link href={k.href} prefetch data-testid={`v3-kort-cta-${k.id}`} className={`e-btn e-btn-sm group !rounded-full ${k.mork ? 'e-btn-light' : 'e-btn-dark shadow-[0_14px_30px_-14px_rgba(17,17,17,0.32)]'}`}>
                        {k.cta} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                      <Link href={k.mer} className={`text-[14px] font-semibold transition-colors ${k.mork ? 'text-white/60 hover:text-white' : 'text-[#0A0A0A]/60 hover:text-[#0A0A0A]'}`}>Les mer</Link>
                    </div>
                  </div>
                </article>
              </Avsloer>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Trygghet — fire pilarer som treffer alle tre. Kun det vi kan dokumentere. ── */
const PILARER = [
  { Ikon: Scale, t: 'Juridisk trygt', b: 'Kontrakter etter husleieloven, signert med BankID gjennom Posten Signering. Depositum på egen konto.' },
  { Ikon: Banknote, t: 'Pengene stemmer', b: 'Husleie med KID, automatisk purring og oppgjør du kan stole på — og eksport til regnskapet.' },
  { Ikon: HeartHandshake, t: 'Mennesker når du vil', b: 'Forvalter, kundeservice og leverandører er ett trykk unna når du trenger dem. Ellers er de stille.' },
  { Ikon: Layers, t: 'Bygget for skala', b: 'Samme system for én bolig og tusen. Team, roller og rapportering vokser med deg.' },
];

const INTEGRASJONER = ['FINN', 'BankID', 'Posten Signering', 'Keyhole', 'Lea Bank', 'PowerOffice', 'Fiken', 'Airbnb', 'Booking.com'];

export function Trygghet() {
  return (
    <section className="border-t border-[#ECE8E0]" data-testid="v3-trygghet">
      <div className="mx-auto w-full max-w-[1320px] px-6 py-24 sm:px-10 sm:py-32">
        <Avsloer>
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <p className="e-label !text-[#7c7466]">Trygghet</p>
              <h2 className="e-display mt-4 max-w-[12ch] text-[38px] sm:text-[52px] lg:text-[64px]">Trygt. Norsk. Etter boka<span className="text-[#cf97fc]">.</span></h2>
            </div>
            <p className="max-w-[46ch] text-[16px] leading-[1.65] text-[#6F6A60] sm:text-[17px] lg:pb-3">
              Autopilot betyr ikke at ingen har kontroll. Det betyr at kontrollen
              er bygget inn — i kontraktene, i pengeflyten og i menneskene bak.
            </p>
          </div>
        </Avsloer>
        <Avsloer delay={120}>
          <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8">
            {PILARER.map((p) => (
              <div key={p.t} className="border-t border-[#D6CFC4] pt-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F1EAFB]"><p.Ikon className="h-[19px] w-[19px] text-[#6D4FB0]" strokeWidth={1.7} /></span>
                <p className="mt-5 text-[19px] font-bold tracking-[-0.02em] text-[#0A0A0A]" style={heading}>{p.t}</p>
                <p className="mt-2.5 text-[14.5px] leading-[1.65] text-[#6F6A60]">{p.b}</p>
              </div>
            ))}
          </div>
        </Avsloer>
        <Avsloer delay={200}>
          <div className="mt-20 flex flex-col gap-5 border-t border-[#ECE8E0] pt-8 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#a49e93]">Snakker med det du allerede bruker</p>
            <ul className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {INTEGRASJONER.map((n) => {
                const logo = n === 'FINN' ? '/finn-logo.png' : n === 'BankID' ? '/bankid-logo.png' : null;
                return (
                  <li key={n} className="flex items-center">
                    {logo
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={logo} alt={n} loading="lazy" className="h-[18px] w-auto opacity-60 grayscale" />
                      : <span className="text-[15px] font-bold tracking-[-0.01em] text-[#9b948a]" style={heading}>{n}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        </Avsloer>
      </div>
    </section>
  );
}

/* ── Slutt-CTA ── */
export function SluttCTA({ nivaa = 0, onKlikk }) {
  const n = NIVAAER[nivaa];
  return (
    <section className="relative overflow-hidden border-t border-[#ECE8E0]" data-testid="v3-cta">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(155,91,214,0.10) 0%, transparent 62%)' }} />
      <div className="relative mx-auto w-full max-w-[1320px] px-6 py-28 text-center sm:px-10 sm:py-40">
        <Avsloer>
          <h2 className="e-display mx-auto max-w-[14ch] text-[44px] sm:text-[64px] lg:text-[84px]">Klar for utleie på autopilot<span className="text-[#cf97fc]">?</span></h2>
          <p className="mx-auto mt-6 max-w-[40ch] text-[16px] leading-[1.65] text-[#6F6A60] sm:text-[18px]">Kom i gang på minuttet — eller book en prat, så finner vi riktig grad av autopilot for deg.</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href={n.href} prefetch onClick={() => onKlikk && onKlikk('bunn')} data-testid="v3-bunn-cta" className="e-btn e-btn-dark group !rounded-full shadow-[0_14px_30px_-14px_rgba(17,17,17,0.32)]">
              {n.cta} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/book-mote" prefetch className="e-btn e-btn-ghost !rounded-full !bg-white" data-testid="v3-bunn-book">Book en prat</Link>
          </div>
        </Avsloer>
      </div>
    </section>
  );
}
