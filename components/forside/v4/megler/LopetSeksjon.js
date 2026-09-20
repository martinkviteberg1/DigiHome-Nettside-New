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

/* Tre meldinger inn, og det systemet gjorde med hver. Radene er slik de ser ut i produktet:
   tekst, undertekst, og til høyre et beløp eller en status. `svar` = systemets svar til
   leietakeren, tegnet som en utgående boble. `ring` = status som venter på et menneske. */
const KORT = [
  {
    hvem: 'Emma Lie', rolle: 'Leietaker · Strandgaten 12', ini: 'EL', kl: '08:30',
    inn: 'Hei, varmtvannet er borte i hele leiligheten. Bilde vedlagt.', bilde: '/v4/bereder-3x4.webp',
    ut: [
      { t: 'Sak opprettet', m: 'Varmtvann · Strandgaten 12 · leil. 3', chip: 'Ny sak' },
      { t: 'Rørlegger foreslått, pris hentet', m: 'Ledig i dag 12–14', v: '6 200 kr' },
      { t: 'Eier bedt om godkjenning', m: 'Over grensen på 5 000 kr', chip: 'Venter', ring: true },
      { t: 'Emma har fått beskjed', m: 'Får ny melding når rørlegger er bestilt', chip: 'Sendt' },
    ],
    venter: 'Dere velger rørlegger · eier godkjenner', dere: true,
  },
  {
    hvem: 'Kari Moen', rolle: 'Eier · fra landingssiden', foto: '/v4/kari.webp', kl: '07:15',
    inn: 'Fjellveien 12, 5019 Bergen. Ønsker hjelp til utleie.',
    ut: [
      { t: 'Boligdata hentet', m: '3-roms · 72 m² · 3. etasje · 1934', chip: 'Eiendomsregisteret' },
      { t: 'Leieestimat', m: 'Fra deres egen portefølje', v: '16 800–18 200 kr' },
      { t: 'Tilbudsutkast skrevet', m: 'Med deres honorar og logo', chip: 'Utkast' },
      { t: 'Lagt i Salg', m: 'Kolonne Ny · 21 600 kr/år', chip: '10 %' },
    ],
    venter: 'Dere leser gjennom og sender', dere: true,
  },
  {
    hvem: 'Husleie ikke mottatt', rolle: 'Løkkeveien 14 · forfall 1. juni', ini: '1.', kl: '06:00', hendelse: true,
    inn: 'Forfall 1. juni · 14 200 kr · ikke mottatt ved avstemming',
    ut: [
      { t: 'Påminnelse sendt til leietaker', m: 'SMS og e-post · 3. juni', chip: 'Sendt' },
      { t: 'Purring etter husleieloven', m: 'Går 15. juni om beløpet fortsatt mangler', chip: 'Planlagt' },
      { t: 'Eier ser status i portalen', m: 'Ingen telefon nødvendig', chip: 'Oppdatert' },
      { t: 'Dere varsles før neste steg', m: 'Varsel og oppsigelse er alltid dere', chip: 'Venter', ring: true },
    ],
    venter: 'Dere bestemmer hvor det stopper', dere: true,
  },
];

function Hake({ color = T.gronn, size = 12 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color }}>
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
                <span className="block text-[15.5px] font-medium tracking-[-0.01em] lg:text-[13px] xl:text-[15px]" style={{ color: T.ink }}>{navn}</span>
                {dere ? <span className="block truncate text-[12.5px] lg:mt-0.5 lg:text-[11.5px] xl:text-[12.5px]" style={{ color: 'rgba(21,19,15,0.6)' }}><span className="lg:hidden">dere velger </span>{valg}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      {/* Tegnforklaring + tellingen */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12.5px] lg:mt-8" style={{ color: SVAK }} data-testid="v4m-lopet-legende">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="inline-flex items-center gap-2"><span className="h-[9px] w-[9px] rounded-full" style={{ background: T.lilla }} />Systemet gjør det</span>
          <span className="inline-flex items-center gap-2"><span className="h-[9px] w-[9px] rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${T.ink}` }} />Dere velger</span>
        </div>
        <span className="tabular-nums" style={{ color: T.ink }}>Systemet tar 8 av 11</span>
      </div>
    </div>
  );
}

/* Avatar: foto når vi har det, ellers initialer */
function Avatar({ k }) {
  if (k.foto) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={k.foto} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" style={{ boxShadow: `0 0 0 1px ${HAIR}` }} />;
  }
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold" style={{ background: 'rgba(21,19,15,0.06)', color: T.ink, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>{k.ini}</span>;
}

/* En status til høyre i raden: chip (evt. med ring = venter på menneske) eller et tall */
function Meta({ r }) {
  if (r.v) return <span className="shrink-0 text-[13px] font-medium tabular-nums" style={{ color: T.ink }}>{r.v}</span>;
  if (!r.chip) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: r.ring ? 'transparent' : 'rgba(21,19,15,0.05)', color: r.ring ? T.ink : DIM, boxShadow: r.ring ? `inset 0 0 0 1px rgba(21,19,15,0.35)` : 'none' }}>
      {r.ring ? <span className="h-[6px] w-[6px] rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${T.ink}` }} /> : null}{r.chip}
    </span>
  );
}

function Kort({ k, i, synlig }) {
  const base = 200 + i * 320;
  const d = (ms, y = 8) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 500ms ${EASE} ${synlig ? base + ms : 0}ms, transform 620ms ${EASE} ${synlig ? base + ms : 0}ms` });
  const utStart = 1150;
  return (
    <li className="flex flex-col overflow-hidden rounded-[20px]" style={{ background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 36px 80px -48px rgba(21,19,15,0.35)', ...d(0, 14) }} data-testid={`v4m-lopet-kort-${i}`}>
      {/* Inn: avsender, tid, boble */}
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-3" style={d(120)}>
          <Avatar k={k} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium leading-[1.2]" style={{ color: T.ink }}>{k.hvem}</p>
            <p className="truncate text-[12px] leading-[1.3]" style={{ color: SVAK }}>{k.rolle}</p>
          </div>
          <span className="shrink-0 text-[12px] tabular-nums" style={{ color: SVAK }}>{k.kl}</span>
        </div>
        {k.hendelse ? (
          <div className="mt-3 flex items-center gap-2.5 rounded-[12px] px-4 py-3 text-[13.5px] leading-[1.4]" style={{ background: 'rgba(21,19,15,0.04)', boxShadow: `inset 0 0 0 1px ${HAIR}`, color: T.ink, ...d(260) }}>
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} />
            <span>{k.inn}</span>
          </div>
        ) : (
        <div className="mt-3 max-w-[94%] rounded-[16px] rounded-tl-[6px] px-4 py-3 text-[14.5px] leading-[1.45]" style={{ background: '#FFFFFF', boxShadow: `inset 0 0 0 1px ${HAIR}`, color: T.ink, ...d(260) }}>
          {k.inn}
          {k.bilde ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={k.bilde} alt="" className="mt-3 block h-[72px] w-[56px] rounded-[10px] object-cover" style={{ boxShadow: `0 0 0 1px ${HAIR}` }} />
          ) : null}
        </div>
        )}
      </div>

      {/* Systemet arbeider: en linje tegnes fra venstre til høyre, så kommer radene */}
      <div className="mt-5 px-5 sm:px-6" style={d(560, 0)}>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: T.lilla }}>Systemet</span>
          <span className="relative h-px flex-1 overflow-hidden" style={{ background: HAIR }}>
            <span className="absolute inset-0" style={{ background: T.lilla, transformOrigin: '0 50%', transform: synlig ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 700ms cubic-bezier(0.22, 1, 0.36, 1) ${synlig ? base + 620 : 0}ms` }} />
          </span>
        </div>
      </div>

      {/* Ut: radene slik de står i produktet */}
      <ul className="grid gap-2 px-5 pt-4 sm:px-6">
        {k.ut.map((r, j) => (
          <li key={r.t} className="flex items-center gap-3 rounded-[12px] px-3 py-2.5" style={{ background: '#FFFFFF', boxShadow: `inset 0 0 0 1px ${HAIR}`, ...d(utStart + j * 260, 6) }}>
            <Hake />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium leading-[1.3]" style={{ color: T.ink }}>{r.t}</span>
              {r.m ? <span className="block truncate text-[12px] leading-[1.35]" style={{ color: SVAK }}>{r.m}</span> : null}
            </span>
            <Meta r={r} />
          </li>
        ))}
      </ul>

      {/* Det som venter på et menneske */}
      <div className="mt-auto px-5 pb-5 pt-5 sm:px-6 sm:pb-6" style={d(utStart + k.ut.length * 260 + 160, 4)}>
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
          {KORT.map((k, i) => <Kort key={k.hvem} k={k} i={i} synlig={kortSynlig} />)}
        </ol>

        <p className="mt-10 max-w-[64ch] border-t pt-6 text-[15px] leading-[1.55] lg:mt-12" style={{ borderColor: HAIR, color: DIM }} data-testid="v4m-lopet-regler">
          Meldinger og henvendelser tolkes av språkmodeller. Husleie, purring og oppgjør følger regler. Alt som koster penger, godkjennes av et menneske.
        </p>
      </div>
    </section>
  );
}
