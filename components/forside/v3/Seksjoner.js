'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Scale, Banknote, HeartHandshake, Layers } from 'lucide-react';
import { display, Avsloer, Etikett, Knapp, Lenke } from './motion';
import { NIVAAER } from './Reisen';

/* ---------------------------------------------------------------------------
   Seksjoner (mørk) — Statement · Bilde · Nivå · Trygghet · Slutt-CTA
--------------------------------------------------------------------------- */

/* ── Statement — puster. ── */
export function Statement() {
  return (
    <section className="relative" data-testid="v3-statement">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-28 sm:px-8 sm:py-40">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
          <Avsloer>
            <h2 className="max-w-[17ch] text-[36px] text-white sm:text-[52px] lg:text-[64px]" style={display}>Utleie skal ikke være en deltidsjobb<span className="text-[#CF97FC]">.</span></h2>
          </Avsloer>
          <Avsloer delay={140} className="lg:pt-3">
            <p className="text-[18px] leading-[1.55] text-white/65 sm:text-[20px]">
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

/* ── Bilde — det ene fotoet. Sant, lokalt, varmt. ── */
export function Bilde() {
  return (
    <section data-testid="v3-bilde">
      <div className="mx-auto w-full max-w-[1280px] px-6 sm:px-8">
        <Avsloer>
          <figure className="relative overflow-hidden rounded-[14px] border border-white/[0.08] sm:rounded-[16px]">
            <div className="relative h-[380px] sm:h-[520px] lg:h-[600px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bergen-aerial.webp" alt="Bergen sett fra Fløyen — byen der DigiHome forvalter sin egen portefølje" loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: '50% 60%' }} />
              <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,11,0.05) 0%, rgba(10,10,11,0.25) 45%, rgba(10,10,11,0.88) 100%)' }} />
            </div>
            <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-7 text-white sm:flex-row sm:items-end sm:justify-between sm:p-10">
              <div className="max-w-[40ch]">
                <Etikett>Bergen</Etikett>
                <p className="mt-2 text-[22px] font-medium leading-[1.15] tracking-[-0.02em] sm:text-[28px]">Vi er selv forvaltere.</p>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-white/70 sm:text-[15.5px]">DigiHome Forvaltning driver hele sin portefølje i Bergen på dette systemet — hver dag. Det du ser på denne siden, bruker vi selv.</p>
              </div>
              <Lenke href="/om-oss" className="shrink-0">Om oss</Lenke>
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
    hvem: ['A', 'T', 'A', 'A', 'T'], lys: true,
  },
];

/* Fem små piller: hvem gjør steg 01–05 på dette nivået */
function HvemRad({ hvem, lys }) {
  const farge = (k) => {
    if (k === 'A') return lys ? { background: '#F1EAFB', color: '#6D4FB0' } : { background: 'rgba(207,151,252,0.15)', color: '#D9B4FF' };
    if (k === 'H') return lys ? { background: '#0A0A0B', color: '#fff' } : { background: '#fff', color: '#0A0A0B' };
    return lys ? { background: '#fff', color: '#0A0A0B', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.9)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)' };
  };
  const tekst = { A: 'Auto', H: 'DigiHome', D: 'Du', T: 'Team' };
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Hvem gjør hvert steg">
      {hvem.map((k, i) => (
        <span key={i} className="inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium" style={farge(k)}>
          <span className="tabular-nums opacity-60">0{i + 1}</span> {tekst[k]}
        </span>
      ))}
    </div>
  );
}

export function Nivaa({ nivaa, setNivaa }) {
  return (
    <section id="nivaa" className="scroll-mt-16" data-testid="v3-nivaa">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-24 sm:px-8 sm:py-32">
        <Avsloer>
          <Etikett>Tre grader av autopilot</Etikett>
          <h2 className="mt-3 max-w-[14ch] text-[34px] text-white sm:text-[44px] lg:text-[52px]" style={display}>Én bolig eller hundre<span className="text-[#CF97FC]">?</span></h2>
          <p className="mt-5 max-w-[52ch] text-[16px] leading-[1.55] text-white/55 sm:text-[17px]">
            Samme system, samme oversikt, samme kontrakter. Forskjellen er hvor mye
            du vil sitte ved rattet — og du kan ta over når du vil.
          </p>
        </Avsloer>
        <div className="mt-10 grid gap-3 sm:mt-12 lg:grid-cols-3">
          {KORT.map((k, i) => {
            const valgt = nivaa === i;
            return (
              <Avsloer key={k.id} delay={i * 90} className="h-full">
                <article
                  onMouseEnter={() => setNivaa && setNivaa(i)}
                  data-testid={`v3-kort-${k.id}`}
                  className={`relative flex h-full flex-col rounded-[14px] border p-7 transition-colors duration-300 sm:p-8 ${k.lys ? 'border-white bg-white text-[#0A0A0B]' : valgt ? 'border-white/30 bg-[#111113]' : 'border-white/[0.08] bg-[#111113]'}`}
                >
                  <div className="relative">
                    <Etikett mork={!k.lys}>{k.eyebrow}</Etikett>
                    <h3 className={`mt-3 text-[22px] sm:text-[26px] ${k.lys ? 'text-[#0A0A0B]' : 'text-white'}`} style={display}>{k.t}</h3>
                    <p className={`mt-3 text-[14.5px] leading-[1.6] ${k.lys ? 'text-[#52504B]' : 'text-white/55'}`}>{k.b}</p>
                    <div className="mt-6"><HvemRad hvem={k.hvem} lys={k.lys} /></div>
                    <ul className={`mt-6 space-y-2.5 border-t pt-5 ${k.lys ? 'border-[#E8E5DF]' : 'border-white/[0.08]'}`}>
                      {k.punkter.map((p) => (
                        <li key={p} className={`flex items-center gap-2.5 text-[14px] ${k.lys ? 'text-[#3A3733]' : 'text-white/85'}`}>
                          <Check className={`h-4 w-4 shrink-0 ${k.lys ? 'text-[#0A0A0B]' : 'text-[#D9B4FF]'}`} strokeWidth={2.2} /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="relative mt-auto pt-8">
                    <p className={`text-[13px] ${k.lys ? 'text-[#8A867F]' : 'text-white/40'}`}>{k.meta}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                      <Knapp href={k.href} variant={k.lys ? 'lys' : 'primar'} data-testid={`v3-kort-cta-${k.id}`}>{k.cta}</Knapp>
                      <Link href={k.mer} className={`text-[14px] font-medium transition-colors ${k.lys ? 'text-[#52504B] hover:text-[#0A0A0B]' : 'text-white/55 hover:text-white'}`}>Les mer</Link>
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

/* ── Trygghet — fire pilarer. Kun det vi kan dokumentere. ── */
const PILARER = [
  { Ikon: Scale, t: 'Juridisk trygt', b: 'Kontrakter etter husleieloven, signert med BankID gjennom Posten Signering. Depositum på egen konto.' },
  { Ikon: Banknote, t: 'Pengene stemmer', b: 'Husleie med KID, automatisk purring og oppgjør du kan stole på — og eksport til regnskapet.' },
  { Ikon: HeartHandshake, t: 'Mennesker når du vil', b: 'Forvalter, kundeservice og leverandører er ett trykk unna når du trenger dem. Ellers er de stille.' },
  { Ikon: Layers, t: 'Bygget for skala', b: 'Samme system for én bolig og tusen. Team, roller og rapportering vokser med deg.' },
];

const INTEGRASJONER = ['FINN', 'BankID', 'Posten Signering', 'Keyhole', 'Lea Bank', 'PowerOffice', 'Fiken', 'Airbnb', 'Booking.com'];

export function Trygghet() {
  return (
    <section className="border-t border-white/[0.08]" data-testid="v3-trygghet">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-24 sm:px-8 sm:py-32">
        <Avsloer>
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <Etikett>Trygghet</Etikett>
              <h2 className="mt-3 max-w-[12ch] text-[34px] text-white sm:text-[44px] lg:text-[52px]" style={display}>Trygt. Norsk. Etter boka<span className="text-[#CF97FC]">.</span></h2>
            </div>
            <p className="max-w-[46ch] text-[16px] leading-[1.55] text-white/55 sm:text-[17px] lg:pb-2">
              Autopilot betyr ikke at ingen har kontroll. Det betyr at kontrollen
              er bygget inn — i kontraktene, i pengeflyten og i menneskene bak.
            </p>
          </div>
        </Avsloer>
        <Avsloer delay={120}>
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {PILARER.map((p) => (
              <div key={p.t} className="border-t border-white/[0.12] pt-5">
                <p.Ikon className="h-[22px] w-[22px] text-white" strokeWidth={1.6} />
                <p className="mt-5 text-[18px] font-medium tracking-[-0.015em] text-white">{p.t}</p>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-white/55">{p.b}</p>
              </div>
            ))}
          </div>
        </Avsloer>
        <Avsloer delay={200}>
          <div className="mt-16 flex flex-col gap-5 border-t border-white/[0.08] pt-7 lg:flex-row lg:items-center lg:justify-between">
            <Etikett>Snakker med det du allerede bruker</Etikett>
            <ul className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {INTEGRASJONER.map((n) => {
                const logo = n === 'FINN' ? '/finn-logo.png' : n === 'BankID' ? '/bankid-logo.png' : null;
                return (
                  <li key={n} className="flex items-center">
                    {logo
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={logo} alt={n} loading="lazy" className="h-[18px] w-auto opacity-70 brightness-0 invert" />
                      : <span className="text-[15px] font-medium tracking-[-0.01em] text-white/45">{n}</span>}
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
    <section className="relative overflow-hidden border-t border-white/[0.08]" data-testid="v3-cta">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[520px]" style={{ background: 'radial-gradient(55% 60% at 50% 110%, rgba(207,151,252,0.14) 0%, rgba(207,151,252,0.04) 50%, transparent 78%)' }} />
      <div className="relative mx-auto w-full max-w-[1280px] px-6 py-28 text-center sm:px-8 sm:py-40">
        <Avsloer>
          <h2 className="mx-auto max-w-[14ch] text-[36px] text-white sm:text-[52px] lg:text-[64px]" style={display}>Klar for utleie på autopilot<span className="text-[#CF97FC]">?</span></h2>
          <p className="mx-auto mt-5 max-w-[40ch] text-[16px] leading-[1.55] text-white/55 sm:text-[18px]">Kom i gang på minuttet — eller book en prat, så finner vi riktig grad av autopilot for deg.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Knapp href={n.href} onClick={() => onKlikk && onKlikk('bunn')} data-testid="v3-bunn-cta">{n.cta}</Knapp>
            <Knapp href="/book-mote" variant="sekundar" data-testid="v3-bunn-book">Book en prat</Knapp>
          </div>
        </Avsloer>
      </div>
    </section>
  );
}
