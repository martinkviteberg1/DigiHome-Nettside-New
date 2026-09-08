'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import NavV4 from '../NavV4';
import FooterV4 from '../FooterV4';
import FaqSeksjon from '../FaqSeksjon';
import AvslutningSeksjon from '../AvslutningSeksjon';
import { Knapp, Lenke, T, display, tall } from '../motion';
import { Avsloring, DIM, HAIR, Innledning, Punkt, SVAK } from './deler';

/* ---------------------------------------------------------------------------
   PriserV4 — /priser.

   Tre nivåer på hårlinjer, ikke prisbokser: Selvforvaltning (5 % av husleien —
   det eneste tallet vi publiserer), Full forvaltning (tilbud innen 24 timer —
   aldri et tall), Eiendomsselskap (tilpasset porteføljen — demo).

   Prisen er levende fra første skjerm: ved siden av overskriften står DIN husleie
   med én glidebryter — og det fem prosent faktisk blir, per måned og per år.
   Etter nivåene: fire nuller (oppstart, bindingstid, minstepris, tom bolig) —
   det ærligste vi kan si om prisen. Så «Ett leieår i tall»: husleie inn, vår
   andel, det du sitter igjen med — samme husleie som øverst (delt tilstand).
--------------------------------------------------------------------------- */

const NIVAER = [
  {
    nr: '01', navn: 'Selvforvaltning', stor: '5\u00a0%', liten: 'av husleien', en: 'Du leier ut selv. Systemet tar rutinen.', for: 'Én bolig eller noen få · hele Norge',
    liste: ['Annonse på FINN', 'Leiekontrakt signert med BankID', 'Husleie som følges opp — med purring', 'Depositumskonto', 'Saker og chat med leietaker', 'Årsoppgave klar til skatten'],
    notat: 'Ingen oppstart · ingen bindingstid · ingen minstepris',
    knapp: { tekst: 'Start med adressen', href: '/bli-utleier/start?tier=selvforvaltning' },
    lenke: { tekst: 'Slik fungerer selvforvaltning', href: '/boligeiere' },
  },
  {
    nr: '02', navn: 'Full forvaltning', stor: 'Tilbud', liten: 'innen 24 timer', en: 'Vi tar jobben. Du bestemmer.', for: 'Deg som vil slippe driften · Bergen og omegn',
    liste: ['Alt i selvforvaltning', 'Visning og anbefalt leietaker', 'Én fast forvalter — ett nummer', 'Drift: vaktmester, renhold, håndverkere', 'Månedsrapport og årsoppgave'],
    notat: 'Andel av husleien etter omfang · Bergen og omegn · ingen bindingstid',
    knapp: { tekst: 'Få et uforpliktende tilbud', href: '/bli-utleier/start?tier=full_forvaltning' },
    lenke: { tekst: 'Slik fungerer forvaltning', href: '/forvaltning' },
    lilla: true,
  },
  {
    nr: '03', navn: 'Eiendomsselskap', stor: 'Tilpasset', liten: 'porteføljen', en: 'Alle bygg. Ett system. Teamet driver.', for: 'Selskap med eget team · fra 10 enheter',
    liste: ['Roller og godkjenning', 'Saker på tvers av alle bygg', 'Husleie, purring og regnskap', 'Full historikk per enhet', 'Onboarding av teamet'],
    notat: 'Pris etter antall enheter · demo først',
    knapp: { tekst: 'Book en demo', href: '/book-mote' },
    lenke: { tekst: 'Registrer selskapet', href: '/bli-utleier/start?kind=business' },
  },
];

const SPORSMAL = [
  { q: 'Er det bindingstid?', a: 'Nei. Du kan si opp når du vil. Boligen, kontrakten og historikken ligger i DigiHome og blir med deg videre.' },
  { q: 'Hva koster full forvaltning?', a: null },
  { q: 'Når betaler jeg?', a: 'Når husleien kommer inn. Står boligen tom, koster den ingenting. Selvforvaltning er fem prosent av det som faktisk betales.' },
  { q: 'Finnes det skjulte kostnader?', a: 'Nei. Prosenten dekker systemet: annonse, kontrakt, husleie, depositum, saker og årsoppgave. Tjenester utover det — som profesjonell boligfoto eller hjelp til visning — avtales alltid på forhånd, med fast pris.' },
  { q: 'Kan jeg bytte fra selvforvaltning til full forvaltning?', a: 'Ja. Det er samme system under. Bytter du, tar vi over der du er — boligen, kontrakten og historikken blir med.' },
  { q: 'Hva med depositum?', a: 'Depositumskonto er inkludert. Kontrakten og depositumet settes opp sammen, og begge parter signerer med BankID.' },
];

const PRIS_SVAR = (
  <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
    Full forvaltning prises etter omfang, som en andel av husleien. Du får et konkret tilbud innen 24 timer etter en{' '}
    <Link href="/book-mote" className="underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]" style={{ color: '#15130F' }}>kort samtale</Link>
    {' '}— ingen oppstartskostnad, ingen bindingstid.
  </p>
);

function Niva({ n, inn, i }) {
  return (
    <li className="flex flex-col border-t pt-7 lg:pt-8" style={{ borderColor: HAIR, ...inn(1 + i, 20) }} data-testid={`v4p-niva-${n.nr}`}>
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] tabular-nums" style={{ color: n.lilla ? T.lilla : SVAK }}>{n.nr}</p>
        <p className="text-[14.5px] font-medium" style={{ color: T.ink }}>{n.navn}</p>
      </div>
      <p className="mt-8 text-[56px] sm:text-[64px] lg:text-[clamp(56px,4.6vw,76px)]" style={{ ...display, color: T.ink }}>
        {n.stor}{n.lilla ? <Punkt /> : null}
      </p>
      <p className="mt-1 text-[15px]" style={{ color: DIM }}>{n.liten}</p>
      <p className="mt-6 text-[17px] font-medium leading-[1.4]" style={{ color: T.ink }}>{n.en}</p>
      {n.for ? <p className="mt-1.5 text-[13.5px]" style={{ color: SVAK }}>{n.for}</p> : null}
      <ul className="mt-5 flex flex-col gap-2.5">
        {n.liste.map((l) => (
          <li key={l} className="flex items-start gap-2.5 text-[15px] leading-[1.45]" style={{ color: DIM }}>
            <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: n.lilla ? T.lilla : 'rgba(21,19,15,0.35)' }} />
            {l}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[13px] leading-[1.5]" style={{ color: SVAK }}>{n.notat}</p>
      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 pt-1 lg:mt-auto lg:pt-8">
        <Knapp href={n.knapp.href} variant={n.lilla ? 'lilla' : 'ink'} data-testid={`v4p-cta-${n.nr}`}>{n.knapp.tekst}</Knapp>
        <Lenke href={n.lenke.href}>{n.lenke.tekst}</Lenke>
      </div>
    </li>
  );
}

/* Display-fonten har bred hard mellomrom — bruk vanlig mellomrom + nowrap i store tall */
const pen = (n) => String(tall(n)).replace(/\u00a0/g, ' ');
const MIN = 5000; const MAX = 40000;

/* Glidebryteren: én hårlinje, en fylt del, ingen boks. Samme tilstand overalt på siden. */
function Glider({ leie, setLeie, testid = 'v4p-glider' }) {
  const pct = ((leie - MIN) / (MAX - MIN)) * 100;
  return (
    <div className="relative h-8">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: 'rgba(21,19,15,0.16)' }} />
      <div className="absolute left-0 top-1/2 h-px -translate-y-1/2" style={{ width: `${pct}%`, background: T.ink }} />
      <input
        type="range" min={MIN} max={MAX} step={500} value={leie} onChange={(e) => setLeie(Number(e.target.value))}
        aria-label="Månedsleie" aria-valuetext={`${pen(leie)} kroner i måneden`} className="v4-glider absolute inset-0 h-8 w-full cursor-pointer appearance-none bg-transparent" data-testid={testid}
      />
    </div>
  );
}

/* Tall som ruller på plass når verdien endrer seg — én rolig overgang, ikke tellende sifre */
function Tall({ v, className = '', style, testid }) {
  const [vist, setVist] = useState(v);
  const [ut, setUt] = useState(false);
  React.useEffect(() => {
    if (v === vist) return undefined;
    setUt(true);
    const t = window.setTimeout(() => { setVist(v); setUt(false); }, 90);
    return () => window.clearTimeout(t);
  }, [v, vist]);
  /* Display-fonten har et bredt mellomrom — tusenskillet tegnes som en smal luft, og «kr» står mindre og stille */
  const grupper = pen(vist).split(' ');
  return (
    <span className={`inline-block whitespace-nowrap ${className}`} style={{ opacity: ut ? 0.35 : 1, transform: ut ? 'translateY(3px)' : 'none', transition: 'opacity 140ms ease, transform 180ms ease', ...style }} data-testid={testid} aria-label={`${pen(vist)} kroner`}>
      {grupper.map((g, i) => <React.Fragment key={i}>{i > 0 && <span aria-hidden="true" className="inline-block" style={{ width: '0.2em' }} />}{g}</React.Fragment>)}
      <span style={{ fontSize: '0.5em', color: SVAK, marginLeft: '0.18em', letterSpacing: 0 }}>kr</span>
    </span>
  );
}

/* Heroens høyre side: din husleie → det fem prosent blir. Prisen er levende fra første skjerm. */
function Regnestykke({ leie, setLeie }) {
  const mnd = Math.round(leie * 0.05);
  return (
    <div className="dh-cover-inn lg:pt-3" style={{ animationDelay: '.14s' }} data-testid="v4p-regnestykke">
      <div className="border-t pt-6" style={{ borderColor: HAIR }}>
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[14px]" style={{ color: SVAK }}>Din husleie i måneden</p>
          <p className="text-[24px] tabular-nums" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }}><Tall v={leie} testid="v4p-leie" /></p>
        </div>
        <div className="mt-3"><Glider leie={leie} setLeie={setLeie} /></div>
        <p className="mt-2 flex justify-between text-[12px] tabular-nums" style={{ color: SVAK }}><span>{pen(MIN)} kr</span><span>{pen(MAX)} kr</span></p>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-6 border-t pt-6" style={{ borderColor: HAIR }}>
        <div>
          <p className="text-[14px]" style={{ color: SVAK }}>Selvforvaltning · 5 %</p>
          <p className="mt-1.5 text-[clamp(38px,3.2vw,56px)] tabular-nums" style={{ ...display, color: T.ink, lineHeight: 1 }}><Tall v={mnd} testid="v4p-mnd" /></p>
          <p className="mt-1.5 text-[13.5px]" style={{ color: DIM }}>i måneden · {pen(mnd * 12)} kr i året</p>
        </div>
        <div>
          <p className="text-[14px]" style={{ color: SVAK }}>Til deg</p>
          <p className="mt-1.5 text-[clamp(38px,3.2vw,56px)] tabular-nums" style={{ ...display, color: T.ink, lineHeight: 1 }}><Tall v={leie - mnd} /></p>
          <p className="mt-1.5 text-[13.5px]" style={{ color: DIM }}>hver måned — utbetalt den 3.</p>
        </div>
      </div>
      <p className="mt-5 text-[13px] leading-[1.5]" style={{ color: SVAK }}>Står boligen tom, koster den ingenting. Full forvaltning og tillegg: <Link href="/priskalkulator" className="underline underline-offset-4 decoration-[#15130F]/25 hover:decoration-[#15130F]" style={{ color: T.ink }}>priskalkulatoren</Link>.</p>
    </div>
  );
}

/* Fire nuller. Det ærligste vi kan si om prisen — og det de fleste lurer på. */
const NULLER = [
  ['Oppstart', 'Ingen etableringskostnad. Adressen inn, boligen satt opp.'],
  ['Bindingstid', 'Si opp når du vil — ved månedsslutt. Historikken blir med deg.'],
  ['Minstepris', 'Fem prosent av det som faktisk betales. Ikke mer, ikke et gulv.'],
  ['Tom bolig', 'Kommer det ikke husleie, betaler du ingenting den måneden.'],
];
function Nuller({ inn }) {
  return (
    <div data-testid="v4p-nuller">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10" style={inn(0)}>
        <h2 className="text-[clamp(34px,3.6vw,60px)] lg:col-span-7" style={{ ...display, color: T.ink }}>Det du aldri betaler for<Punkt /></h2>
        <p className="max-w-[36ch] text-[16.5px] leading-[1.5] lg:col-span-4 lg:col-start-9 lg:pb-2" style={{ color: DIM }}>Prisen er én prosent­sats av husleien som kommer inn. Alt annet som pleier å stå med liten skrift, står her — med store tall.</p>
      </div>
      <ol className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:mt-14 lg:grid-cols-4 lg:gap-10">
        {NULLER.map(([k, u], i) => (
          <li key={k} className="border-t pt-5" style={{ borderColor: HAIR, ...inn(1 + i, 20) }} data-testid={`v4p-null-${i}`}>
            <p className="text-[14px] font-medium" style={{ color: T.ink }}>{k}</p>
            <p className="mt-4 text-[clamp(56px,6vw,96px)] tabular-nums" style={{ ...display, color: T.ink, lineHeight: 0.95 }}>0<span className="text-[0.32em]" style={{ color: SVAK, letterSpacing: 0 }}> {i === 1 ? 'mnd' : 'kr'}</span></p>
            <p className="mt-4 max-w-[26ch] text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{u}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* Ett leieår i tall — samme husleie som øverst. Tre linjer, som en årsoppgave. */
function Leieaar({ inn, leie, setLeie }) {
  const mnd = Math.round(leie * 0.05);
  const rader = [
    ['Husleie inn', `12 × ${pen(leie)} kr`, leie * 12],
    ['Selvforvaltning', '5 % av det som kom inn', mnd * 12],
    ['Til deg', 'utbetalt den 3. hver måned', (leie - mnd) * 12],
  ];
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12" data-testid="v4p-regn">
      <div className="lg:col-span-5">
        <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Regn ut</p>
        <h2 className="mt-4 text-[clamp(34px,3.6vw,60px)]" style={{ ...display, color: T.ink, ...inn(1) }}>Ett leieår, i tall<Punkt /></h2>
        <p className="mt-5 max-w-[42ch] text-[16.5px] leading-[1.5]" style={{ color: DIM, ...inn(2) }}>Dra i husleien. Det du ser, er alt du betaler for selvforvaltning — kontrakt, husleie, saker og årsoppgave. Samme tall som øverst på siden.</p>
        <div className="mt-8 max-w-[420px]" style={inn(3)}>
          <div className="flex items-baseline justify-between gap-4"><p className="text-[14px]" style={{ color: SVAK }}>Månedsleie</p><p className="text-[20px] tabular-nums" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }}><Tall v={leie} /></p></div>
          <div className="mt-2"><Glider leie={leie} setLeie={setLeie} testid="v4p-glider-2" /></div>
        </div>
      </div>
      <ol className="lg:col-span-6 lg:col-start-7" style={inn(2)}>
        {rader.map(([k, u, v], i) => (
          <li key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 border-t py-6" style={{ borderColor: i === 2 ? T.ink : HAIR }} data-testid={`v4p-aar-${i}`}>
            <p className={`text-[17px] ${i === 2 ? 'font-medium' : ''}`} style={{ color: T.ink }}>{k}</p>
            <p className={`text-right tabular-nums ${i === 2 ? 'text-[clamp(38px,3.6vw,60px)]' : 'text-[clamp(26px,2.4vw,38px)]'}`} style={{ ...display, color: i === 1 ? DIM : T.ink, lineHeight: 1 }}><Tall v={v} testid={`v4p-aar-tall-${i}`} /></p>
            <p className="col-span-2 text-[13.5px]" style={{ color: SVAK }}>{u}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function PriserV4() {
  const [leie, setLeie] = useState(14500);
  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="priser-v4">
      <NavV4 />
      <main>
        <Avsloring threshold={0.05} testid="v4p-hero">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-20">
              <div className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-10">
                <div className="lg:col-span-7">
                  <Innledning label="Priser" tittel={<>Betal for det du bruker. Ikke mer<Punkt /></>} ingress="Selvforvaltning koster fem prosent av husleien — ingen oppstart, ingen bindingstid. Full forvaltning prises etter omfang, og eiendomsselskaper får en avtale tilpasset porteføljen." maks="16ch" testid="v4p" />
                </div>
                <div className="lg:col-span-4 lg:col-start-9"><Regnestykke leie={leie} setLeie={setLeie} /></div>
              </div>
              <ol className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-3 lg:gap-10" data-testid="v4p-nivaer">
                {NIVAER.map((n, i) => <Niva key={n.nr} n={n} inn={inn} i={i} />)}
              </ol>
            </div>
          )}
        </Avsloring>

        <Avsloring className="border-t" style={{ borderColor: HAIR }} testid="v4p-nuller-seksjon">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1360px] px-5 py-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:py-28">
              <Nuller inn={inn} />
            </div>
          )}
        </Avsloring>

        <Avsloring className="border-t" style={{ borderColor: HAIR, background: T.flate }} testid="v4p-regn-seksjon">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1360px] px-5 py-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:py-28">
              <Leieaar inn={inn} leie={leie} setLeie={setLeie} />
            </div>
          )}
        </Avsloring>

        <FaqSeksjon sporsmal={SPORSMAL} prisSvar={PRIS_SVAR} />
        <AvslutningSeksjon
          tittel="Start der du er"
          under="Selv eller med oss — samme system, ingen bindingstid."
          handling={{ knapp: { href: '/kom-i-gang', tekst: 'Kom i gang' }, lenke: { href: '/book-mote', tekst: 'Book en samtale' } }}
        />
      </main>
      <FooterV4 />
    </div>
  );
}
