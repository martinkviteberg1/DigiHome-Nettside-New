'use client';

import React, { useRef } from 'react';
import { EASE, T, display, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   LopetSeksjon — «Hele løpet i ett system.» (#lopet)

   Svarer på det en megler sjekker først: er det hull i løpet, og hvor mye
   gjør systemet selv? To deler, nesten uten løpende tekst:

   1. Linjen: elleve stopp fra henvendelse til årsoppgave. Fylt prikk =
      systemet gjør det. Ring = et menneske velger (leietaker, håndverker,
      utbetaling). Horisontal på store skjermer, vertikal på små.
   2. Tre kort, inn → ut: én melding kommer inn, og listen viser hva systemet
      gjorde med den. Nederst hva som venter på et menneske. Linjene kommer
      én og én, som i produktet.

   Til slutt én setning om hva som er språkmodell og hva som er regler.
   Alt på kortene står allerede andre steder på digihome.no; ingenting nytt
   loves her. Kun opacity/transform i bevegelsen.
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

/* [navn, hva et menneske velger her] — bare tre av elleve har et valg */
const STOPP = [
  ['Henvendelse'], ['Tilbud'], ['Oppdrag'], ['Annonse'], ['Visning'],
  ['Kontrakt', 'leietaker'], ['Innflytting'], ['Husleie'],
  ['Saker', 'håndverker'], ['Oppgjør', 'utbetaling'], ['Årsoppgave'],
];

const KORT = [
  {
    fra: 'Leietaker · Strandgaten 12', kl: '08:30',
    inn: 'Hei, varmtvannet er borte i hele leiligheten. Bilde vedlagt.', bilde: true,
    ut: ['Sak opprettet · varmtvann · Strandgaten 12', 'Rørlegger foreslått · pris hentet · 6 200 kr', 'Eier bedt om godkjenning i appen', 'Leietaker får beskjed når rørlegger er bestilt'],
    venter: 'Dere velger rørlegger · eier godkjenner', dere: true,
  },
  {
    fra: 'Eier · fra landingssiden', kl: '07:15',
    inn: 'Fjellveien 12, 5019 Bergen. Ønsker hjelp til utleie.',
    ut: ['Boligdata hentet · 3-roms · 72 m² · 3. etasje', 'Leieestimat · 16 800–18 200 kr/mnd', 'Tilbudsutkast med deres honorar', 'Lagt i Salg · Ny'],
    venter: 'Dere leser gjennom og sender', dere: true,
  },
  {
    fra: 'Leietaker · Løkkeveien 14', kl: '21:12',
    inn: 'Hei! Kan vi ha katt i leiligheten?',
    ut: ['Svar funnet i kontrakten · punkt 9, husdyr', 'Svar sendt: «Ja, kontrakten tillater katt.»', 'Logget på leieforholdet'],
    venter: 'Ingen handling fra dere', dere: false,
  },
];

function Hake({ color = T.gronn, size = 12 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none" className="mt-[3px] shrink-0" style={{ color }}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Prikken: fylt lilla = systemet, ring = et menneske velger */
function Prikk({ dere, bg, style }) {
  return (
    <span aria-hidden="true" className="relative z-[1] block h-[15px] w-[15px] shrink-0 rounded-full" style={{ background: dere ? bg : T.lilla, boxShadow: dere ? `inset 0 0 0 1.5px ${T.ink}` : 'none', ...style }} />
  );
}

function Linje() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.3);
  const bg = T.flate;
  return (
    <div ref={ref} data-testid="v4m-lopet-linje">
      <ol className="relative lg:grid lg:grid-cols-11">
        {/* Hårlinjen: vertikal på små skjermer, horisontal på store */}
        <span aria-hidden="true" className="absolute bottom-[20px] left-[7px] top-[20px] w-px lg:hidden" style={{ background: 'rgba(21,19,15,0.14)' }} />
        <span aria-hidden="true" className="absolute bottom-[20px] left-[7px] top-[20px] w-px lg:hidden" style={{ background: T.lilla, transformOrigin: '50% 0', transform: synlig ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 1800ms cubic-bezier(0.22, 1, 0.36, 1) 150ms` }} />
        <span aria-hidden="true" className="absolute left-[7px] top-[7px] hidden h-px lg:block" style={{ right: 'calc(100% / 11 - 7px)', background: 'rgba(21,19,15,0.14)' }} />
        <span aria-hidden="true" className="absolute left-[7px] top-[7px] hidden h-px lg:block" style={{ right: 'calc(100% / 11 - 7px)', background: T.lilla, transformOrigin: '0 50%', transform: synlig ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 1800ms cubic-bezier(0.22, 1, 0.36, 1) 150ms` }} />
        {STOPP.map(([navn, valg], i) => {
          const dere = Boolean(valg);
          const d = 150 + i * 130;
          return (
            <li key={navn} className="relative flex items-center gap-4 py-[10px] lg:block lg:py-0" data-testid={`v4m-lopet-stopp-${i}`} data-dere={dere ? '1' : '0'}>
              <Prikk dere={dere} bg={bg} style={{ transform: synlig ? 'scale(1)' : 'scale(0)', transition: `transform 520ms cubic-bezier(0.22, 1, 0.36, 1) ${d}ms` }} />
              <span className="flex min-w-0 items-baseline gap-2 lg:mt-3 lg:block" style={{ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(4px)', transition: `opacity 500ms ${EASE} ${d + 80}ms, transform 600ms ${EASE} ${d + 80}ms` }}>
                <span className="block text-[15.5px] font-medium tracking-[-0.01em] lg:text-[12.5px] xl:text-[14px]" style={{ color: T.ink }}>{navn}</span>
                {dere ? <span className="block truncate text-[12.5px] lg:mt-0.5 lg:text-[11px] xl:text-[12px]" style={{ color: SVAK }}><span className="lg:hidden">dere velger </span>{valg}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      {/* Tegnforklaring */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] lg:mt-8" style={{ color: SVAK }} data-testid="v4m-lopet-legende">
        <span className="inline-flex items-center gap-2"><span className="h-[9px] w-[9px] rounded-full" style={{ background: T.lilla }} />Systemet gjør det</span>
        <span className="inline-flex items-center gap-2"><span className="h-[9px] w-[9px] rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${T.ink}` }} />Dere velger</span>
      </div>
    </div>
  );
}

function Kort({ k, i, synlig }) {
  const base = 200 + i * 320;
  const d = (ms, y = 8) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 500ms ${EASE} ${synlig ? base + ms : 0}ms, transform 620ms ${EASE} ${synlig ? base + ms : 0}ms` });
  const utStart = 760;
  return (
    <li className="flex flex-col overflow-hidden rounded-[18px]" style={{ background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 36px 80px -48px rgba(21,19,15,0.35)', ...d(0, 14) }} data-testid={`v4m-lopet-kort-${i}`}>
      {/* Inn */}
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-baseline justify-between gap-3 text-[12px]" style={{ color: SVAK }}>
          <span className="truncate font-medium">Inn · {k.fra}</span>
          <span className="shrink-0 tabular-nums">{k.kl}</span>
        </div>
        <div className="mt-3 max-w-[94%] rounded-[14px] rounded-tl-[5px] px-4 py-3 text-[14.5px] leading-[1.45]" style={{ background: '#FFFFFF', boxShadow: `inset 0 0 0 1px ${HAIR}`, color: T.ink, ...d(180) }}>
          {k.inn}
          {k.bilde ? (
            <span className="mt-2.5 flex h-[52px] w-[76px] items-end rounded-[8px] p-1.5 text-[10px] tabular-nums" style={{ background: 'linear-gradient(160deg, rgba(21,19,15,0.10), rgba(21,19,15,0.04))', color: SVAK }}>IMG_2231</span>
          ) : null}
        </div>
      </div>
      {/* Skille */}
      <div className="mt-5 flex items-center gap-3 px-5 sm:px-6" style={d(520, 0)}>
        <span className="h-px flex-1" style={{ background: HAIR }} />
        <span className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: T.lilla }}>Systemet</span>
        <span className="h-px flex-1" style={{ background: HAIR }} />
      </div>
      {/* Ut: én linje om gangen */}
      <ul className="grid gap-2.5 px-5 pt-4 sm:px-6">
        {k.ut.map((u, j) => (
          <li key={u} className="flex items-start gap-2.5 text-[13.5px] leading-[1.4]" style={{ color: DIM, ...d(utStart + j * 240, 6) }}>
            <Hake /><span>{u}</span>
          </li>
        ))}
      </ul>
      {/* Det som venter på et menneske */}
      <div className="mt-auto px-5 pb-5 pt-5 sm:px-6 sm:pb-6" style={d(utStart + k.ut.length * 240 + 160, 4)}>
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium" style={{ background: k.dere ? 'rgba(21,19,15,0.05)' : 'rgba(31,157,85,0.10)', color: k.dere ? T.ink : '#166B3C' }}>
          <span className="h-[8px] w-[8px] rounded-full" style={k.dere ? { boxShadow: `inset 0 0 0 1.5px ${T.ink}` } : { background: T.gronn }} />{k.venter}
        </span>
      </div>
    </li>
  );
}

export default function LopetSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.15);
  const kortRef = useRef(null);
  const kortSynlig = useSynlig(kortRef, 0.25);
  const inn = (i, y = 16) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });
  return (
    <section id="lopet" ref={ref} className="relative scroll-mt-[72px] lg:scroll-mt-[64px]" style={{ background: T.flate, color: T.ink }} data-testid="v4m-lopet">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-7">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Fra henvendelse til årsoppgave</p>
            <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4m-lopet-tittel">
              Hele løpet i ett system<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
          </div>
          <p className="max-w-[46ch] text-[17px] leading-[1.5] sm:text-[18px] lg:col-span-5 lg:pb-2" style={{ color: DIM, ...inn(2) }} data-testid="v4m-lopet-ingress">
            Elleve stopp. Tre av dem trenger et menneske. Resten gjør systemet, og dere ser alt som skjer.
          </p>
        </div>

        <div className="mt-12 lg:mt-16" style={inn(3, 12)}>
          <Linje />
        </div>

        <ol ref={kortRef} className="mt-14 grid gap-4 lg:mt-20 lg:grid-cols-3 lg:gap-5" data-testid="v4m-lopet-kort">
          {KORT.map((k, i) => <Kort key={k.fra} k={k} i={i} synlig={kortSynlig} />)}
        </ol>

        <p className="mt-10 max-w-[64ch] border-t pt-6 text-[15px] leading-[1.55] lg:mt-12" style={{ borderColor: HAIR, color: DIM }} data-testid="v4m-lopet-regler">
          Meldinger og henvendelser tolkes av språkmodeller. Husleie, purring og oppgjør følger regler. Alt som koster penger, godkjennes av et menneske.
        </p>
      </div>
    </section>
  );
}
