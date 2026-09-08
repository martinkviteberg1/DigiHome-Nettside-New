'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { EASE, Knapp, Lenke, T, display, useSynlig } from '../motion';
import { site } from '@/lib/site';
import ForvaltningScene from './ForvaltningScene';

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

/* ── 1. Hero — lys, varm canvas. Løftet til venstre, produktflaten til høyre: måneden slik den faktisk ser ut,
   inne i én rolig flate (samme språk som filmene på forsiden). Ingen legende, ingen løse elementer — tre bevis
   under handlingen er alt som trengs. ── */
const BEVIS = [
  { t: 'Tilbud innen 24 timer', d: 'Omfang og pris, svart på hvitt.' },
  { t: 'Én fast forvalter', d: 'Ett navn. Ett nummer.' },
  { t: 'Ingen bindingstid', d: 'Boligen og historikken er din.' },
];

export function ForvaltningHero() {
  return (
    <section className="relative overflow-hidden" style={{ background: T.canvas, color: T.ink }} data-testid="v4f-hero">
      <div className="relative mx-auto w-full max-w-[1440px] px-5 pb-14 pt-8 sm:px-8 sm:pt-10 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-20 lg:pt-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-10 xl:gap-14">
          {/* Venstre: løftet */}
          <div className="min-w-0 lg:col-span-5">
            <p className="dh-cover-inn text-[14px] font-medium sm:text-[14.5px]" style={{ color: SVAK }} data-testid="v4f-label">Full forvaltning · Bergen og omegn</p>
            <h1
              className="dh-cover-inn mt-4 text-[52px] sm:text-[72px] lg:text-[clamp(60px,4.9vw,88px)]"
              style={{ ...display, color: T.ink, animationDelay: '.04s' }}
              data-testid="v4f-h1"
            >
              Vi tar jobben.<br />
              Du bestemmer<span style={{ color: T.lilla, marginLeft: '0.03em' }}>.</span>
            </h1>
            <p className="dh-cover-inn mt-6 max-w-[36ch] text-[17px] leading-[1.5] sm:text-[19px]" style={{ color: 'rgba(21,19,15,0.7)', animationDelay: '.08s' }} data-testid="v4f-ingress">
              Overlat utleien til oss. Vi finner leietaker, tar drift og oppfølging — du ser alt som skjer, og har siste ord om det som betyr noe.
            </p>
            <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: '.14s' }}>
              <Knapp href="/bli-utleier/start?tier=full_forvaltning" data-testid="v4f-cta">Få et uforpliktende tilbud</Knapp>
              <Lenke href="/book-mote" data-testid="v4f-cta-samtale">Book en samtale</Lenke>
            </div>
            {/* Tre bevis — på hårlinjer, ikke som badges */}
            <ul className="dh-cover-inn mt-10 grid grid-cols-3 gap-x-5 border-t pt-5 sm:gap-x-8" style={{ borderColor: HAIR, animationDelay: '.2s' }} data-testid="v4f-bevis">
              {BEVIS.map((b) => (
                <li key={b.t} className="min-w-0">
                  <p className="text-[13.5px] font-medium leading-[1.35] sm:text-[14.5px]" style={{ color: T.ink }}>{b.t}</p>
                  <p className="mt-1 hidden text-[13px] leading-[1.45] sm:block" style={{ color: SVAK }}>{b.d}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Høyre: produktflaten — måneden spiller fra første sekund */}
          <div className="dh-cover-inn min-w-0 lg:col-span-7" style={{ animationDelay: '.12s' }} data-testid="v4f-hero-scene">
            <ForvaltningScene />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 2. Måneden — arbeidsdelingen vist, ikke listet: en måned med alt vi gjorde (små, mange) mot den ene
   beslutningen som var din (én, stor). Under: hva som er vårt og hva som alltid er ditt. ── */
const GJORT = [
  'Annonse på FINN', 'Visning holdt', 'Interessenter svart', 'Kredittsjekk', 'Referanser ringt', 'Anbefaling skrevet',
  'Leiekontrakt satt opp', 'Signert med BankID', 'Depositum opprettet', 'Nøkler overlevert', 'Renhold bestilt', 'Overtakelsesprotokoll',
  'Husleie krevd inn', 'Innbetaling avstemt', 'Rørlegger hentet pris', 'Rørlegger fulgt opp', 'Faktura bokført', 'Leietaker svart',
  'Sak lukket', 'Vaktmester innom', 'Strøm meldt', 'Forsikring varslet', 'Dokumenter arkivert', 'Månedsrapport sendt',
  'Oppgjør utbetalt', 'Årsoppgave klar', 'Rutinebefaring', 'Brannvern sjekket', 'KPI-varsel forberedt', 'Regnskapsfører fikk bilag', 'Oppfølging planlagt',
];
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

function HakeLiten({ color = T.gronn }) {
  return (
    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color }}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Brettet: 31 små ting (lyser opp én og én) mot den ene beslutningen (mørkt kort). */
function Maanedsbrett({ synlig }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:gap-6" data-testid="v4f-brett">
      <div className="rounded-[22px] p-5 sm:p-7 lg:col-span-8" style={{ background: '#FBFAF8', boxShadow: '0 0 0 1px rgba(21,19,15,0.07)' }} data-testid="v4f-brett-vi">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[13px] font-medium" style={{ color: SVAK }}>Vi · mai</p>
          <p className="text-[13px] tabular-nums" style={{ color: SVAK }}><span style={{ color: T.ink }}>{GJORT.length}</span> ting gjort</p>
        </div>
        {/* Mobil: de første 14 + «og 17 til» — hele veggen bare fra sm */}
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Eksempler på det vi gjorde denne måneden">
          {GJORT.map((g, i) => (
            <li key={g} className={`${i >= 14 ? 'hidden sm:inline-flex' : 'inline-flex'} h-[30px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] font-medium sm:h-[32px] sm:text-[13px]`} style={{ background: 'rgba(21,19,15,0.045)', color: 'rgba(21,19,15,0.78)', opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(6px) scale(0.96)', transition: `opacity 420ms ${EASE} ${180 + i * 45}ms, transform 520ms ${EASE} ${180 + i * 45}ms` }}>
              <HakeLiten />{g}
            </li>
          ))}
          <li className="inline-flex h-[30px] items-center whitespace-nowrap rounded-full px-3 text-[12.5px] font-medium sm:hidden" style={{ boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.12)', color: SVAK, opacity: synlig ? 1 : 0, transition: `opacity 420ms ${EASE} 900ms` }}>+ {GJORT.length - 14} ting til</li>
        </ul>
      </div>
      <div className="relative flex flex-col overflow-hidden rounded-[22px] p-5 sm:p-7 lg:col-span-4" style={{ background: T.charcoal, color: T.offwhite, boxShadow: '0 40px 80px -40px rgba(0,0,0,0.5)', opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(14px)', transition: `opacity 700ms ${EASE} 900ms, transform 800ms ${EASE} 900ms` }} data-testid="v4f-brett-du">
        <div className="flex items-baseline justify-between gap-4 text-[13px]" style={{ color: 'rgba(244,241,234,0.6)' }}>
          <p className="font-medium">Du · 14. mai</p>
          <p className="tabular-nums"><span style={{ color: T.offwhite }}>1</span> beslutning</p>
        </div>
        <div className="flex-1 py-8 lg:py-10">
          <p className="text-[30px] sm:text-[34px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.02 }}>Emma flytter inn 1. juni<span style={{ color: T.lilla }}>.</span></p>
          <p className="mt-3 max-w-[30ch] text-[14px] leading-[1.5]" style={{ color: 'rgba(244,241,234,0.62)' }}>Anbefalt av forvalteren din — kredittsjekk, referanser og BankID i orden. Resten var allerede gjort.</p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t pt-4 text-[12.5px]" style={{ borderColor: 'rgba(244,241,234,0.12)', color: 'rgba(244,241,234,0.55)' }}>
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium" style={{ background: 'rgba(31,157,85,0.2)', color: '#9BE7B8' }}><HakeLiten color="#9BE7B8" />Godkjent av deg</span>
          <span className="tabular-nums">Tid brukt: 40 sek</span>
        </div>
      </div>
    </div>
  );
}

function Kolonne({ overskrift, liste, synlig, fra = 0, tone = 'ink', kolonner = 1, testid }) {
  const inn = innFor(synlig);
  const lilla = tone === 'lilla';
  return (
    <div data-testid={testid}>
      <h3 className="text-[clamp(30px,2.6vw,44px)]" style={{ ...display, color: T.ink, ...inn(fra) }}>
        {overskrift}<span style={{ color: lilla ? T.lilla : T.ink, marginLeft: '0.03em' }}>.</span>
      </h3>
      <ol className={`mt-6 border-t ${kolonner === 2 ? 'sm:grid sm:grid-cols-2 sm:gap-x-10' : ''}`} style={{ borderColor: HAIR }}>
        {liste.map((r, i) => (
          <li key={r.t} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 border-b py-4" style={{ borderColor: HAIR, ...inn(fra + 1 + i, 14) }}>
            <span className="pt-[4px] text-[12px] tabular-nums" style={{ color: lilla ? T.lilla : SVAK }}>{String(i + 1).padStart(2, '0')}</span>
            <span>
              <span className="block text-[16.5px] font-medium sm:text-[17px]" style={{ color: T.ink }}>{r.t}</span>
              <span className="mt-1 block max-w-[40ch] text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{r.d}</span>
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
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="max-w-[900px]">
          <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Arbeidsdelingen</p>
          <h2 className="mt-4 text-[clamp(38px,4.2vw,72px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4f-lofte-tittel">
            Én måned. Vi gjorde 31 ting. Du tok én beslutning<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
          </h2>
          <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(2) }}>
            Du er fortsatt eieren. Vi er hendene, øynene og telefonen som ringer. Alt som tar tid, tar vi — alt som betyr noe, bestemmer du.
          </p>
        </div>
        <div className="mt-12 lg:mt-16"><Maanedsbrett synlig={synlig} /></div>
        <div className="mt-16 grid gap-12 lg:mt-20 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-8"><Kolonne overskrift="Vi tar" liste={VI} synlig={synlig} fra={3} kolonner={2} testid="v4f-vi" /></div>
          <div className="lg:col-span-4"><Kolonne overskrift="Du bestemmer" liste={DU} synlig={synlig} fra={5} tone="lilla" testid="v4f-du" /></div>
        </div>
      </div>
    </section>
  );
}

/* ── 3. Teamet — én fast forvalter, et helt team bak. Roller, ikke én person. Kompakt: fire roller i et rutenett. ── */
const TEAM = [
  { nr: '01', t: 'Forvalteren din', d: 'Ett navn og ett nummer. Holder visning, anbefaler leietaker og følger opp håndverker og leietaker. Ringer deg når det betyr noe.' },
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
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-24 lg:pt-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Menneskene</p>
            <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4f-team-tittel">
              Én fast forvalter. Et helt team bak<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(2) }} data-testid="v4f-team-ingress">
              Du får én person å ringe — en forvalter som kjenner boligen, leietakeren og det som er avtalt. Bak henne eller ham står vaktmester, renhold, håndverkere og systemet som holder orden på alt.
            </p>

            {/* En av forvalterne — ansiktet på rollen, ikke «den eneste» — og telefonen */}
            <div className="mt-10 flex flex-wrap items-center gap-6 border-t pt-7" style={{ borderColor: HAIR, ...inn(3) }} data-testid="v4f-ledelse">
              <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full" style={{ background: '#8B7460', boxShadow: '0 0 0 1px rgba(21,19,15,0.08)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SARAH.bilde.src} srcSet={SARAH.bilde.srcSet} sizes="72px" alt={SARAH.navn} className="h-full w-full select-none object-cover" style={{ objectPosition: '50% 18%', transform: 'scale(1.25)', transformOrigin: '52% 26%' }} draggable={false} loading="lazy" />
              </div>
              <div className="min-w-0">
                <p className="text-[16px] font-medium" style={{ color: T.ink }}>{SARAH.navn} <span className="font-normal" style={{ color: SVAK }}>· daglig leder, og en av forvalterne du kan få</span></p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <a href={`tel:${site.phoneHref}`} className="text-[22px] transition-colors hover:text-[#15130F]/70" style={{ ...display, letterSpacing: '-0.03em', color: T.ink }} data-testid="v4f-telefon">{site.phone}</a>
                  <a href={`mailto:${site.email}`} className="text-[14.5px] underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:decoration-[#15130F]" style={{ color: DIM }} data-testid="v4f-epost">{site.email}</a>
                </p>
                <p className="mt-1 text-[12.5px]" style={{ color: 'rgba(21,19,15,0.42)' }}>Svarer innen 24 timer · Bergen og omegn · {SARAH.foto}</p>
              </div>
            </div>
          </div>

          <ol className="grid gap-x-8 sm:grid-cols-2 lg:col-span-6 lg:col-start-7" data-testid="v4f-team-roller">
            {TEAM.map((r, i) => (
              <li key={r.nr} className="border-t py-6" style={{ borderColor: HAIR, ...inn(2 + i, 16) }}>
                <span className="text-[12.5px] tabular-nums" style={{ color: i === 0 ? T.lilla : SVAK }}>{r.nr}</span>
                <span className="mt-3 block text-[24px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }}>{r.t}</span>
                <span className="mt-3 block text-[14.5px] leading-[1.55]" style={{ color: DIM }}>{r.d}</span>
              </li>
            ))}
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
