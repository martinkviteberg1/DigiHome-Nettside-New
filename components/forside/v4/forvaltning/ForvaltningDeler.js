'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { EASE, Knapp, Lenke, T, display, useSynlig } from '../motion';
import { site } from '@/lib/site';
import ForvaltningScene, { Ansikt } from './ForvaltningScene';

/* ---------------------------------------------------------------------------
   ForvaltningDeler — seksjonene på /forvaltning.

   Forvaltning er en tjeneste: mennesker hos DigiHome gjør jobben, med
   systemet som ryggrad. Løftet er arbeidsdelingen («Vi tar jobben. Du
   bestemmer.»), beviset er én måned slik den faktisk ser ut — og teamet
   er roller (forvalter, drift, økonomi, system), ikke én navngitt person.
   Du får én fast forvalter; hvem, avtales når du starter.

   Aldri pris for full forvaltning — kun «uforpliktende tilbud».
   Kun Bergen og omegn. Ingen løfter om avkastning. Bevegelse: opacity/transform.
--------------------------------------------------------------------------- */

export const SARAH = {
  navn: 'Sarah Sleeman',
  rolle: 'Daglig leder',
  bilde: { src: '/brand/sarah-sleeman-1000.webp', srcSet: '/brand/sarah-sleeman-640.webp 640w, /brand/sarah-sleeman-1000.webp 1000w, /brand/sarah-sleeman-1600.webp 1600w' },
  liten: '/brand/sarah-sleeman-360.webp',
  foto: 'Foto: Pia Bråthen',
};

const DIM = 'rgba(21,19,15,0.64)';
const SVAK = 'rgba(21,19,15,0.5)';
const HAIR = 'rgba(21,19,15,0.12)';

/* Felles «inn»-bevegelse for seksjoner: opacity + 18 px løft, forskjøvet per element */
const innFor = (synlig) => (i, y = 18) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 800ms ${EASE} ${i * 90}ms, transform 900ms ${EASE} ${i * 90}ms` });

/* ── 1. Hero — lys, varm canvas. Kjempestort løfte over hele bredden; under: ingress + handling +
   rollene til venstre, boligen (ekte hjem) og måneden som spiller direkte på flaten til høyre.
   Forvaltning er mennesker og bolig — derfor lyst, med ansikter og et hjem, ikke mørk teknologi. ── */
const ROLLER = [
  { av: { src: SARAH.liten, navn: 'Forvalter' }, navn: 'Forvalteren din', d: 'Én fast person. Visning, leietaker, oppfølging.' },
  { av: { rolle: 'vaktmester', navn: 'Vaktmester' }, navn: 'Drift', d: 'Vaktmester, renhold og håndverkere.' },
  { av: { merke: true, navn: 'DigiHome' }, navn: 'DigiHome', d: 'Kontrakt med BankID, husleie, rapport.' },
  { av: { du: true }, navn: 'Du', d: 'Ett valg: hvem som flytter inn.', du: true },
];

function RolleMerke({ av, size = 30 }) {
  if (av.du) {
    return <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full text-[11.5px] font-medium" style={{ width: size, height: size, background: 'rgba(212,150,255,0.14)', boxShadow: `inset 0 0 0 1.5px ${T.lilla}`, color: T.ink }}>Du</span>;
  }
  return <Ansikt av={av} size={size} />;
}

function Roller({ className = '', delay = '.3s' }) {
  return (
    <ul className={`dh-cover-inn grid grid-cols-2 gap-x-6 gap-y-5 ${className}`} style={{ animationDelay: delay }} data-testid="v4f-roller">
      {ROLLER.map((r) => (
        <li key={r.navn} className="flex items-start gap-3">
          <RolleMerke av={r.av} />
          <span className="min-w-0">
            <span className="block text-[14.5px] font-medium" style={{ color: T.ink }}>{r.navn}{r.du ? <span aria-hidden="true" style={{ color: T.lilla }}>.</span> : null}</span>
            <span className="mt-0.5 block text-[13px] leading-[1.45]" style={{ color: DIM }}>{r.d}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ForvaltningHero() {
  return (
    <section className="relative overflow-hidden" style={{ background: T.canvas, color: T.ink }} data-testid="v4f-hero">
      <div className="relative mx-auto w-full max-w-[1440px] px-5 pb-16 pt-10 sm:px-8 sm:pt-12 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-20 lg:pt-14">
        <p className="dh-cover-inn text-[14.5px] font-medium sm:text-[15px]" style={{ color: SVAK }} data-testid="v4f-label">Full forvaltning · Bergen og omegn</p>

        {/* Løftet — to linjer, hele bredden */}
        <h1
          className="dh-cover-inn mt-4 text-[54px] sm:text-[80px] lg:text-[clamp(84px,7.4vw,132px)]"
          style={{ ...display, color: T.ink, animationDelay: '.04s' }}
          data-testid="v4f-h1"
        >
          Vi tar jobben.<br />
          Du bestemmer<span style={{ color: T.lilla, marginLeft: '0.03em' }}>.</span>
        </h1>

        <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          {/* Venstre: ingress, handling, rollene */}
          <div className="min-w-0 lg:col-span-4">
            <p className="dh-cover-inn max-w-[34ch] text-[18px] leading-[1.45] sm:text-[20px]" style={{ color: 'rgba(21,19,15,0.72)', animationDelay: '.08s' }} data-testid="v4f-ingress">
              Overlat utleien til oss. Vi finner leietaker, tar drift og oppfølging — du ser alt som skjer, og har siste ord om det som betyr noe.
            </p>
            <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: '.14s' }}>
              <Knapp href="/bli-utleier/start?tier=full_forvaltning" data-testid="v4f-cta">Få et uforpliktende tilbud</Knapp>
              <Lenke href="/book-mote" data-testid="v4f-cta-samtale">Book en samtale</Lenke>
            </div>
            <p className="dh-cover-inn mt-4 text-[13.5px] leading-[1.5]" style={{ color: SVAK, animationDelay: '.2s' }} data-testid="v4f-under">
              Personlig tilbud innen 24 timer · ingen oppstartskostnad · ingen bindingstid
            </p>

            {/* Rollene — legende for scenen (desktop) */}
            <div className="mt-12 hidden border-t pt-7 lg:block" style={{ borderColor: HAIR }}>
              <p className="dh-cover-inn mb-5 text-[12.5px] font-medium uppercase tracking-[0.08em]" style={{ color: SVAK, animationDelay: '.28s' }}>Hvem gjør hva</p>
              <Roller />
            </div>
          </div>

          {/* Høyre: boligen og måneden — spiller fra første sekund */}
          <div className="dh-cover-inn min-w-0 lg:col-span-8" style={{ animationDelay: '.12s' }} data-testid="v4f-hero-scene">
            <ForvaltningScene />
          </div>
        </div>

        {/* Rollene på mobil/tablet — under scenen */}
        <div className="mt-12 border-t pt-7 lg:hidden" style={{ borderColor: HAIR }}>
          <Roller delay=".2s" />
        </div>
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

/* ── 3. Teamet — én fast forvalter, et helt team bak. Roller, ikke én person. ── */
const TEAM = [
  { nr: '01', t: 'Forvalteren din', d: 'Ett navn og ett nummer. Holder visning, anbefaler leietaker og følger opp håndverker og leietaker. Svarer innen 24 timer — og ringer deg når det betyr noe.' },
  { nr: '02', t: 'Drift', d: 'Vaktmester, renhold og faste håndverkere i Bergen. Leietakeren melder fra i appen — vi vurderer, henter pris og følger opp til det er løst.' },
  { nr: '03', t: 'Økonomi', d: 'Husleie inn, purring ved behov, månedsrapport og årsoppgave. Klart til regnskapsføreren — uten at du løfter en finger.' },
  { nr: '04', t: 'Systemet', d: 'DigiHome holder orden på kontrakt, depositum, saker og dokumenter. Du logger inn når du vil — og ser det samme som vi ser.' },
];

export function TeamSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.15);
  const inn = innFor(synlig);
  return (
    <section id="teamet" ref={ref} className="relative" style={{ background: T.flate, color: T.ink }} data-testid="v4f-team">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Menneskene</p>
            <h2 className="mt-4 text-[clamp(38px,4vw,68px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4f-team-tittel">
              Én fast forvalter. Et helt team bak<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(2) }} data-testid="v4f-team-ingress">
              Du får én person å ringe — en forvalter som kjenner boligen, leietakeren og det som er avtalt. Bak henne eller ham står vaktmester, renhold, håndverkere og systemet som holder orden på alt.
            </p>

            <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t pt-6" style={{ borderColor: HAIR, ...inn(3) }}>
              <div>
                <a href={`tel:${site.phoneHref}`} className="block text-[26px] transition-colors hover:text-[#15130F]/70 sm:text-[30px]" style={{ ...display, letterSpacing: '-0.03em', color: T.ink }} data-testid="v4f-telefon">{site.phone}</a>
                <a href={`mailto:${site.email}`} className="mt-1 block text-[15px] underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:decoration-[#15130F]" style={{ color: DIM }} data-testid="v4f-epost">{site.email}</a>
              </div>
              <p className="text-[13.5px] leading-[1.5]" style={{ color: SVAK }}>Svarer innen 24 timer<br />Bergen og omegn</p>
            </div>

            {/* En av forvalterne — ansiktet på rollen, ikke «den eneste» */}
            <figure className="mt-10 flex items-end gap-5" style={inn(4)} data-testid="v4f-ledelse">
              <div className="w-[128px] shrink-0 overflow-hidden rounded-[16px] sm:w-[150px]" style={{ aspectRatio: '4 / 5', background: '#8B7460', boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SARAH.bilde.src} srcSet={SARAH.bilde.srcSet} sizes="150px" alt={SARAH.navn} className="h-full w-full select-none object-cover" style={{ objectPosition: '50% 18%', transform: 'scale(1.18)', transformOrigin: '52% 24%' }} draggable={false} loading="lazy" />
              </div>
              <figcaption className="pb-1">
                <p className="text-[17px] font-medium" style={{ color: T.ink }}>{SARAH.navn}</p>
                <p className="mt-0.5 max-w-[24ch] text-[14px] leading-[1.45]" style={{ color: DIM }}>Daglig leder — og en av forvalterne du kan få.</p>
                <p className="mt-2 text-[11.5px]" style={{ color: 'rgba(21,19,15,0.38)' }}>{SARAH.foto}</p>
              </figcaption>
            </figure>
          </div>

          <ol className="lg:col-span-6 lg:col-start-7" data-testid="v4f-team-roller">
            {TEAM.map((r, i) => (
              <li key={r.nr} className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 border-t py-7 sm:grid-cols-[56px_minmax(0,1fr)] sm:py-8" style={{ borderColor: HAIR, ...inn(2 + i, 16) }}>
                <span className="pt-2 text-[13px] tabular-nums" style={{ color: i === 0 ? T.lilla : SVAK }}>{r.nr}</span>
                <span>
                  <span className="block text-[26px] sm:text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }}>{r.t}</span>
                  <span className="mt-3 block max-w-[52ch] text-[15.5px] leading-[1.55]" style={{ color: DIM }}>{r.d}</span>
                </span>
              </li>
            ))}
            <li aria-hidden="true" className="border-t" style={{ borderColor: HAIR }} />
          </ol>
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
