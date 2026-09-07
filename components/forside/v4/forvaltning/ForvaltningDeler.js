'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { EASE, Knapp, Lenke, T, display, useSynlig } from '../motion';
import { site } from '@/lib/site';
import ForvaltningScene from './ForvaltningScene';

/* ---------------------------------------------------------------------------
   ForvaltningDeler — seksjonene på /forvaltning.

   Forvaltning er en tjeneste: mennesker hos DigiHome gjør jobben, med
   systemet som ryggrad. Siden er derfor personlig før den er produkt:
   Sarah er ansiktet, løftet er arbeidsdelingen («Vi tar jobben. Du
   bestemmer.»), og beviset er én måned slik den faktisk ser ut.

   Aldri pris for full forvaltning — kun «uforpliktende tilbud».
   Kun Bergen og omegn. Ingen løfter om avkastning. Bevegelse: opacity/transform.
--------------------------------------------------------------------------- */

export const SARAH = {
  navn: 'Sarah Sleeman',
  rolle: 'Daglig leder — og din faste forvalter',
  bilde: { src: '/brand/sarah-sleeman-1000.webp', srcSet: '/brand/sarah-sleeman-640.webp 640w, /brand/sarah-sleeman-1000.webp 1000w, /brand/sarah-sleeman-1600.webp 1600w' },
  liten: '/brand/sarah-sleeman-640.webp',
  foto: 'Foto: Pia Bråthen',
};

const DIM = 'rgba(21,19,15,0.64)';
const SVAK = 'rgba(21,19,15,0.5)';
const HAIR = 'rgba(21,19,15,0.12)';

/* Felles «inn»-bevegelse for seksjoner: opacity + 18 px løft, forskjøvet per element */
const innFor = (synlig) => (i, y = 18) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 800ms ${EASE} ${i * 90}ms, transform 900ms ${EASE} ${i * 90}ms` });

/* ── 1. Hero — mørk scene: teksten til venstre, måneden (scenen) til høyre, rollene som rulletekst under ── */
const ROLLER = [
  { navn: 'Sarah Sleeman', rolle: 'Din forvalter', d: 'Holder visning, anbefaler leietaker, følger opp.', src: '/brand/sarah-sleeman-360.webp' },
  { navn: 'Vaktmester', rolle: 'Boligen', d: 'Renhold, nøkler og gjennomgang før innflytting.', src: '/v4/jonas.webp' },
  { navn: 'DigiHome', rolle: 'Systemet', d: 'Kontrakt med BankID, husleie, rapport.', merke: true },
  { navn: 'Du', rolle: 'Eieren', d: 'Ett valg: hvem som flytter inn.', du: true },
];

function RolleAnsikt({ r, size = 34 }) {
  if (r.merke) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/brand/digihome-icon-purple.svg" alt="" width={size} height={size} className="shrink-0 select-none" style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }} draggable={false} />;
  }
  if (r.du) {
    return <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full text-[12.5px] font-medium" style={{ width: size, height: size, background: 'rgba(244,241,234,0.08)', boxShadow: `inset 0 0 0 1.5px ${T.lilla}`, color: T.offwhite }}>Du</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={r.src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, boxShadow: '0 0 0 1px rgba(244,241,234,0.16)' }} draggable={false} />;
}

export function ForvaltningHero() {
  return (
    <section className="relative overflow-hidden lg:flex lg:min-h-[calc(100svh-64px)] lg:flex-col lg:justify-center" style={{ background: T.charcoal, color: T.offwhite }} data-testid="v4f-hero">
      {/* Spotlys bak scenen — statisk */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 58% 68% at 70% 46%, rgba(212,150,255,0.11) 0%, rgba(212,150,255,0.03) 45%, rgba(212,150,255,0) 75%)' }} />
      <div className="relative mx-auto w-full max-w-[1440px] px-5 pb-14 pt-10 sm:px-8 sm:pt-12 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-12 lg:pt-10">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12 2xl:gap-16">
          <div className="min-w-0 max-w-[560px]">
            <p className="dh-cover-inn text-[15px] font-medium" style={{ color: 'rgba(244,241,234,0.55)' }} data-testid="v4f-label">Full forvaltning · Bergen og omegn</p>
            <h1
              className="dh-cover-inn mt-4 max-w-[11ch] text-[52px] sm:text-[68px] lg:text-[clamp(60px,5vw,96px)]"
              style={{ ...display, color: T.offwhite, animationDelay: '.04s' }}
              data-testid="v4f-h1"
            >
              Vi tar jobben. Du bestemmer<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h1>
            <p className="dh-cover-inn mt-7 max-w-[38ch] text-[18px] leading-[1.45] sm:mt-8 sm:text-[20px]" style={{ color: 'rgba(244,241,234,0.72)', animationDelay: '.08s' }} data-testid="v4f-ingress">
              <span className="sm:hidden">Vi finner leietaker, tar drift og oppfølging. Du ser alt som skjer — og har siste ord.</span>
              <span className="hidden sm:inline">Overlat utleien til oss. Vi finner leietaker, tar drift og oppfølging — du ser alt som skjer, og har siste ord om det som betyr noe.</span>
            </p>
            <div className="dh-cover-inn mt-9 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: '.16s' }}>
              <Knapp href="/bli-utleier/start?tier=full_forvaltning" data-testid="v4f-cta">Få et uforpliktende tilbud</Knapp>
              <Link href="/book-mote" className="group inline-flex items-center gap-1.5 text-[15px] font-medium transition-colors hover:text-white" style={{ color: 'rgba(244,241,234,0.85)' }} data-testid="v4f-cta-samtale">
                Book en samtale
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
            <p className="dh-cover-inn mt-4 text-[14px]" style={{ color: 'rgba(244,241,234,0.5)', animationDelay: '.22s' }} data-testid="v4f-under">
              Personlig tilbud innen 24 timer · ingen oppstartskostnad · ingen bindingstid
            </p>
          </div>

          {/* Måneden — scenen spiller fra første sekund */}
          <div className="dh-cover-inn min-w-0" style={{ animationDelay: '.12s' }} data-testid="v4f-hero-scene">
            <ForvaltningScene />
          </div>
        </div>

        {/* Rollene — som rulletekst under filmen */}
        <ul className="dh-cover-inn mt-12 grid grid-cols-2 gap-x-6 gap-y-6 border-t pt-6 lg:mt-14 lg:grid-cols-4 lg:gap-x-10" style={{ borderColor: 'rgba(244,241,234,0.12)', animationDelay: '.28s' }} data-testid="v4f-roller">
          {ROLLER.map((r) => (
            <li key={r.navn} className="flex items-start gap-3">
              <RolleAnsikt r={r} />
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[15px] font-medium" style={{ color: T.offwhite }}>{r.navn}</span>
                  <span className="text-[12.5px]" style={{ color: r.du ? T.lilla : 'rgba(244,241,234,0.5)' }}>{r.rolle}</span>
                </span>
                <span className="mt-0.5 hidden text-[13.5px] leading-[1.45] sm:block" style={{ color: 'rgba(244,241,234,0.58)' }}>{r.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── 2. Løftet — arbeidsdelingen som to kolonner på hårlinjer ── */
const VI = [
  { t: 'Annonse og visning', d: 'Bilder, tekst og FINN. Vi holder visningene og møter interessentene.' },
  { t: 'Leietaker', d: 'Kredittsjekk, referanser og BankID. Du får én anbefaling — med begrunnelse.' },
  { t: 'Kontrakt og innflytting', d: 'Leiekontrakt signert med BankID, depositum, protokoll og nøkler.' },
  { t: 'Husleie', d: 'Innkreving, purring og oppfølging. Du ser pengene komme.' },
  { t: 'Drift og vedlikehold', d: 'Leietakeren melder til oss. Vi vurderer, henter pris og følger opp håndverkeren.' },
  { t: 'Regnskap og rapport', d: 'Månedsrapport og årsoppgave, klar til regnskapsføreren.' },
];
const DU = [
  { t: 'Hvem som flytter inn', d: 'Vi anbefaler. Du godkjenner — eller sier nei.' },
  { t: 'Husleie og vilkår', d: 'Nivået, varigheten og hva som er lov i boligen din.' },
  { t: 'Det som koster', d: 'Kostnader over grensen du setter, godkjenner du før noe skjer.' },
  { t: 'Når du vil noe annet', d: 'Bo der selv, selge eller ta over. Ingen bindingstid.' },
];

function Kolonne({ overskrift, liste, synlig, fra = 0, tone = 'ink', testid }) {
  const inn = innFor(synlig);
  const lilla = tone === 'lilla';
  return (
    <div data-testid={testid}>
      <h3 className="text-[clamp(34px,3vw,52px)]" style={{ ...display, color: T.ink, ...inn(fra) }}>
        {overskrift}<span style={{ color: lilla ? T.lilla : T.ink, marginLeft: '0.03em' }}>.</span>
      </h3>
      <ol className="mt-7 border-t" style={{ borderColor: HAIR }}>
        {liste.map((r, i) => (
          <li key={r.t} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 border-b py-4 sm:py-5" style={{ borderColor: HAIR, ...inn(fra + 1 + i, 14) }}>
            <span className="pt-[5px] text-[12.5px] tabular-nums" style={{ color: lilla ? T.lilla : SVAK }}>{String(i + 1).padStart(2, '0')}</span>
            <span>
              <span className="block text-[17px] font-medium sm:text-[18px]" style={{ color: T.ink }}>{r.t}</span>
              <span className="mt-1 block max-w-[44ch] text-[15px] leading-[1.5]" style={{ color: DIM }}>{r.d}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function LofteSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.12);
  const inn = innFor(synlig);
  return (
    <section id="loftet" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4f-lofte">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-28">
        <div className="max-w-[820px]">
          <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Arbeidsdelingen</p>
          <h2 className="mt-4 text-[clamp(38px,4.2vw,72px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4f-lofte-tittel">
            Alt som tar tid, tar vi. Alt som betyr noe, bestemmer du<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
          </h2>
          <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(2) }}>
            Du er fortsatt eieren. Vi er hendene, øynene og telefonen som ringer. Her er hva som er vårt — og hva som alltid er ditt.
          </p>
        </div>
        <div className="mt-14 grid gap-14 lg:mt-20 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7"><Kolonne overskrift="Vi tar" liste={VI} synlig={synlig} fra={3} testid="v4f-vi" /></div>
          <div className="lg:col-span-4 lg:col-start-9"><Kolonne overskrift="Du bestemmer" liste={DU} synlig={synlig} fra={5} tone="lilla" testid="v4f-du" /></div>
        </div>
      </div>
    </section>
  );
}

/* ── 4. Brev fra Sarah — ett navn, ett nummer ── */
export function BrevSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const inn = innFor(synlig);
  return (
    <section id="sarah" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4f-brev">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          <figure className="lg:col-span-4" style={inn(0, 24)}>
            {/* Tettere utsnitt enn i heroen — samme portrett, ny nærhet */}
            <div className="overflow-hidden rounded-[20px] sm:rounded-[24px]" style={{ aspectRatio: '1 / 1', maxWidth: 420, background: '#8B7460', boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SARAH.bilde.src} srcSet={SARAH.bilde.srcSet} sizes="(min-width: 1024px) 30vw, 100vw" alt={SARAH.navn} className="h-full w-full select-none object-cover" style={{ objectPosition: '50% 20%', transform: 'scale(1.32)', transformOrigin: '52% 26%' }} draggable={false} loading="lazy" />
            </div>
            <figcaption className="mt-3 text-[11.5px]" style={{ color: 'rgba(21,19,15,0.38)' }}>{SARAH.foto}</figcaption>
          </figure>
          <div className="lg:col-span-7 lg:col-start-6">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(1) }}>Fra forvalteren din</p>
            <h2 className="mt-4 text-[clamp(38px,3.8vw,64px)]" style={{ ...display, color: T.ink, ...inn(2) }} data-testid="v4f-brev-tittel">
              Ett navn. Ett nummer<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
            <div className="mt-8 max-w-[56ch] space-y-5 text-[18px] leading-[1.55] sm:text-[20px]" style={{ color: 'rgba(21,19,15,0.8)' }} data-testid="v4f-brev-tekst">
              <p style={inn(3)}>Når du overlater boligen til DigiHome, får du ikke et kundesenter. Du får meg.</p>
              <p style={inn(4)}>Jeg kjenner boligen din, leietakeren og det som er avtalt. Jeg tar visningene, følger opp håndverkeren og sørger for at husleien kommer. Systemet vårt tar rutinen — så jeg kan bruke tiden på det som krever skjønn.</p>
              <p style={inn(5)}>Du hører fra meg når det betyr noe. Og aldri når det ikke gjør det.</p>
            </div>
            <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t pt-6" style={{ borderColor: HAIR, ...inn(6) }}>
              <div>
                <p className="text-[24px]" style={{ ...display, letterSpacing: '-0.03em', color: T.ink }}>{SARAH.navn}</p>
                <p className="mt-1 text-[14.5px]" style={{ color: DIM }}>Daglig leder, DigiHome · Bergen</p>
              </div>
              <div className="flex flex-col gap-1 text-[15px] sm:items-end">
                <a href={`tel:${site.phoneHref}`} className="font-medium underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:decoration-[#15130F]" style={{ color: T.ink }} data-testid="v4f-telefon">{site.phone}</a>
                <a href={`mailto:${site.email}`} className="underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:decoration-[#15130F]" style={{ color: DIM }} data-testid="v4f-epost">{site.email}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Pris-svaret i FAQ — aldri et tall for full forvaltning ── */
export const PRIS_SVAR = (
  <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
    Full forvaltning prises etter omfang, som en andel av husleien. Du får et konkret tilbud innen 24 timer etter en{' '}
    <Link href="/book-mote" className="underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]" style={{ color: '#15130F' }} data-testid="v4f-faq-samtale">kort samtale</Link>
    {' '}— ingen oppstartskostnad, ingen bindingstid.
  </p>
);
