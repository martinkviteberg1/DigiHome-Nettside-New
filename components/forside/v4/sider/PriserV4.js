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

   Ett tall publiseres: 5 % av husleien for selvforvaltning. Alt annet er
   tilbud. Siden er bygget for å bli lest på tjue sekunder:

   1. Hero: tallet, og din husleie regnet ut ved siden av (måned/år).
   2. Fire planer som kort: Selvforvaltning, Full forvaltning, Eiendomsselskap,
      Utleiemegler. Kort tekst, fire punkter, én knapp.
   3. «Alt som er med»: én sammenligningstabell for alle fire, gruppert.
      Det er her detaljene bor, ikke i kortene.
   4. Fire nuller: oppstart, bindingstid, minstepris, tom bolig.
   5. Spørsmål og svar, avslutning.

   Ingen dobbel kalkulator, ingen tankestreker, ingen tall vi ikke står for.
--------------------------------------------------------------------------- */

const PLANER = [
  {
    id: 'selv', nr: '01', navn: 'Selvforvaltning', stor: '5\u00a0%', liten: 'av husleien som kommer inn', pris: '5 % av husleien',
    en: 'Du leier ut selv. Systemet tar rutinen.', for: 'Én bolig eller noen få · hele Norge',
    punkter: ['Annonse på FINN og leietaker som booker selv', 'Kontrakt og depositum med BankID', 'Husleie som følges opp, med purring', 'Saker, chat og årsoppgave'],
    notat: 'Ingen oppstart · ingen bindingstid · ingen minstepris',
    knapp: { tekst: 'Start med adressen', href: '/bli-utleier/start?tier=selvforvaltning' },
    lenke: { tekst: 'For boligeiere', href: '/boligeiere' },
  },
  {
    id: 'full', nr: '02', navn: 'Full forvaltning', stor: 'Tilbud', liten: 'innen 24 timer', pris: 'Tilbud innen 24 t',
    en: 'Vi tar jobben. Du bestemmer.', for: 'Deg som vil slippe driften · Bergen og omegn',
    punkter: ['Alt i selvforvaltning', 'Visning og anbefalt leietaker', 'Én fast forvalter, ett nummer', 'Vaktmester, renhold og håndverkere'],
    notat: 'Andel av husleien etter omfang · ingen bindingstid',
    knapp: { tekst: 'Få et tilbud', href: '/bli-utleier/start?tier=full_forvaltning' },
    lenke: { tekst: 'Slik fungerer forvaltning', href: '/forvaltning' },
    lilla: true,
  },
  {
    id: 'selskap', nr: '03', navn: 'Eiendomsselskap og utleiemegler', stor: 'Per enhet', liten: 'tilbud etter demo', pris: 'Per enhet',
    en: 'Alle bygg og eiere. Ett system. Teamet driver.', for: 'Selskap med eget team, eller byrå som forvalter for andre',
    punkter: ['Roller, godkjenning og full historikk', 'Saker på tvers av alle bygg', 'Husleie, purring og regnskap', 'For meglere: salg, klientkonto og oppgjør per eier'],
    notat: 'Pris etter antall enheter · demo først',
    knapp: { tekst: 'Book en demo', href: '/book-mote' },
    lenke: { tekst: 'For eiendomsselskaper', href: '/bedrift' },
    lenke2: { tekst: 'For utleiemeglere', href: '/utleiemeglere' },
  },
];

/* Sammenligningen. 1 = med, 0 = ikke med, tekst = slik det er. Rekkefølgen følger PLANER. */
const MEGLER = 'For meglere';
const SAMMENLIGN = [
  { gruppe: 'Utleie', rader: [
    ['Annonse på FINN', 1, 1, 1],
    ['Leiekontrakt signert med BankID', 1, 1, 1],
    ['Depositumskonto', 1, 1, 1],
    ['Visning og anbefalt leietaker', 0, 1, 0],
  ] },
  { gruppe: 'Drift', rader: [
    ['Saker og chat med leietaker', 1, 1, 1],
    ['Én fast forvalter', 0, 1, 0],
    ['Vaktmester, renhold og håndverkere', 0, 1, 0],
    ['Roller og godkjenning', 0, 0, 1],
    ['Saker på tvers av alle bygg', 0, 0, 1],
    ['Full historikk per enhet', 0, 0, 1],
  ] },
  { gruppe: 'Økonomi', rader: [
    ['Husleie og purring', 1, 1, 1],
    ['Årsoppgave', 1, 1, 1],
    ['Månedsrapport', 0, 1, 0],
    ['Regnskap: PowerOffice, Tripletex, Fiken', 0, 0, 1],
    ['Klientkonto og oppgjør per eier', 0, 0, MEGLER],
  ] },
  { gruppe: 'Salg og eiere', rader: [
    ['Salg fra henvendelse til signert oppdrag', 0, 0, MEGLER],
    ['Eierportal', 0, 0, MEGLER],
    ['Tilbud og landingssider med deres merkevare', 0, 0, MEGLER],
  ] },
  { gruppe: 'Kom i gang', rader: [
    ['Oppstart', 'Selv, på minutter', 'Vi setter opp', 'Onboarding av teamet, eller tre uker med parallell drift'],
    ['Bindingstid', 'Ingen', 'Ingen', 'Etter avtale'],
    ['Pris', '5 % av husleien', 'Tilbud innen 24 t', 'Per enhet'],
  ] },
];

const SPORSMAL = [
  { q: 'Er det bindingstid?', a: 'Nei. Du kan si opp når du vil. Boligen, kontrakten og historikken ligger i DigiHome og blir med deg videre.' },
  { q: 'Hva koster full forvaltning?', a: null },
  { q: 'Når betaler jeg?', a: 'Når husleien kommer inn. Står boligen tom, koster den ingenting. Selvforvaltning er fem prosent av det som faktisk betales.' },
  { q: 'Finnes det skjulte kostnader?', a: 'Nei. Prosenten dekker systemet: annonse, kontrakt, husleie, depositum, saker og årsoppgave. Tjenester utover det, som profesjonell boligfoto eller hjelp til visning, avtales alltid på forhånd med fast pris.' },
  { q: 'Hva koster det for eiendomsselskaper og utleiemeglere?', a: 'Begge betaler per enhet, altså per leieforhold i systemet. Dere får et konkret tilbud etter en demo på 30 minutter, regnet på egen portefølje. Meglere kan legge til salg, klientkonto og eierportal.' },
  { q: 'Kan jeg bytte fra selvforvaltning til full forvaltning?', a: 'Ja. Det er samme system under. Bytter du, tar vi over der du er. Boligen, kontrakten og historikken blir med.' },
  { q: 'Hva med depositum?', a: 'Depositumskonto er inkludert. Kontrakten og depositumet settes opp sammen, og begge parter signerer med BankID.' },
];

const PRIS_SVAR = (
  <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
    Full forvaltning prises etter omfang, som en andel av husleien. Du får et konkret tilbud innen 24 timer etter en{' '}
    <Link href="/book-mote" className="underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]" style={{ color: '#15130F' }}>kort samtale</Link>.
    {' '}Ingen oppstartskostnad, ingen bindingstid.
  </p>
);

const PAPIR = '#FBFAF8';

function Hake({ color = T.gronn, size = 13 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color }}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Ett plan-kort. Kort tekst; detaljene står i tabellen under. */
function Plan({ p, inn, i }) {
  return (
    <li className="flex flex-col rounded-[22px] px-6 pb-6 pt-6 sm:px-7 sm:pt-7" style={{ background: PAPIR, boxShadow: p.lilla ? `0 0 0 1.5px ${T.lilla}, 0 40px 80px -56px rgba(21,19,15,0.35)` : '0 0 0 1px rgba(21,19,15,0.08), 0 40px 80px -56px rgba(21,19,15,0.3)', ...inn(1 + i, 20) }} data-testid={`v4p-niva-${p.nr}`}>
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] tabular-nums" style={{ color: p.lilla ? T.lilla : SVAK }}>{p.nr}</p>
        <p className="text-[14.5px] font-medium" style={{ color: T.ink }}>{p.navn}</p>
      </div>
      <p className="mt-7 whitespace-nowrap text-[clamp(34px,2.4vw,44px)]" style={{ ...display, color: T.ink, lineHeight: 1 }}>
        {p.stor}{p.lilla ? <Punkt /> : null}
      </p>
      <p className="mt-2 text-[14px]" style={{ color: DIM }}>{p.liten}</p>
      <p className="mt-6 text-[16.5px] font-medium leading-[1.4]" style={{ color: T.ink }}>{p.en}</p>
      <p className="mt-1.5 text-[13px]" style={{ color: SVAK }}>{p.for}</p>
      <ul className="mt-5 flex flex-col gap-2.5 border-t pt-5" style={{ borderColor: HAIR }}>
        {p.punkter.map((l) => (
          <li key={l} className="flex items-start gap-2.5 text-[14.5px] leading-[1.45]" style={{ color: DIM }}>
            <span className="mt-[4px]"><Hake color={p.lilla ? T.lilla : T.gronn} /></span>
            {l}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[12.5px] leading-[1.5]" style={{ color: SVAK }}>{p.notat}</p>
      <div className="mt-6 flex flex-col items-start gap-3 pt-1 lg:mt-auto lg:pt-6">
        <Knapp href={p.knapp.href} variant={p.lilla ? 'lilla' : 'ink'} className="w-full justify-center" data-testid={`v4p-cta-${p.nr}`}>{p.knapp.tekst}</Knapp>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Lenke href={p.lenke.href}>{p.lenke.tekst}</Lenke>
          {p.lenke2 ? <Lenke href={p.lenke2.href}>{p.lenke2.tekst}</Lenke> : null}
        </div>
      </div>
    </li>
  );
}

/* Sammenligningen: første kolonne står fast når tabellen ruller sidelengs på små skjermer */
function Sammenligning({ inn }) {
  return (
    <div data-testid="v4p-sammenlign">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10" style={inn(0)}>
        <h2 className="text-[clamp(34px,3.6vw,60px)] lg:col-span-7" style={{ ...display, color: T.ink }}>Alt som er med<Punkt /></h2>
        <p className="max-w-[36ch] text-[16.5px] leading-[1.5] lg:col-span-4 lg:col-start-9 lg:pb-2" style={{ color: DIM }}>Samme system under alle fire. Forskjellen er hvem som gjør jobben, og hva dere trenger på toppen.</p>
      </div>
      <div className="-mx-5 mt-10 overflow-x-auto sm:mx-0 lg:mt-14" style={inn(1, 24)}>
        <table className="w-full min-w-[720px] border-collapse text-left" data-testid="v4p-tabell">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-[1] w-[32%] pb-5 pl-5 pr-6 align-bottom text-[13px] font-medium sm:pl-0" style={{ background: T.flate, color: SVAK }}>Hva</th>
              {PLANER.map((p, i) => (
                <th key={p.id} scope="col" className={`pb-5 align-bottom ${i === PLANER.length - 1 ? 'pr-5 sm:pr-4' : 'pr-4'}`}>
                  <p className="text-[15px] font-medium" style={{ color: T.ink }}>{p.navn}</p>
                  <p className="mt-0.5 text-[12.5px]" style={{ color: p.lilla ? T.lilla : SVAK }}>{p.pris}</p>
                </th>
              ))}
            </tr>
          </thead>
          {SAMMENLIGN.map((g) => (
            <tbody key={g.gruppe}>
              <tr>
                <td colSpan={4} className="sticky left-0 pb-3 pl-5 pt-8 text-[11.5px] font-medium uppercase tracking-[0.1em] sm:pl-0" style={{ color: T.lilla }}>{g.gruppe}</td>
              </tr>
              {g.rader.map((r) => (
                <tr key={r[0]} className="border-t" style={{ borderColor: HAIR }}>
                  <th scope="row" className="sticky left-0 z-[1] py-3.5 pl-5 pr-6 text-[15px] font-normal sm:pl-0" style={{ background: T.flate, color: T.ink }}>{r[0]}</th>
                  {r.slice(1).map((c, i) => (
                    <td key={i} className={`py-3.5 text-[14px] ${i === PLANER.length - 1 ? 'pr-5 sm:pr-4' : 'pr-4'}`} style={{ color: DIM }}>
                      {c === 1 ? <Hake /> : c === 0 ? <span aria-label="Ikke med" style={{ color: 'rgba(21,19,15,0.25)' }}>–</span> : c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
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

/* Heroens høyre side: din husleie → det fem prosent blir. Måned eller år, samme glidebryter. */
function Regnestykke({ leie, setLeie }) {
  const [periode, setPeriode] = useState('mnd');
  const aar = periode === 'aar';
  const k = aar ? 12 : 1;
  const mnd = Math.round(leie * 0.05);
  return (
    <div className="dh-cover-inn rounded-[22px] px-6 py-6 sm:px-7 sm:py-7" style={{ background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.08), 0 40px 90px -56px rgba(21,19,15,0.35)', animationDelay: '.14s' }} data-testid="v4p-regnestykke">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[14px] font-medium" style={{ color: T.ink }}>Regn på din bolig</p>
        {/* Periodevelger: to knapper i én pille */}
        <div className="inline-flex rounded-full p-[3px] text-[12.5px] font-medium" style={{ background: 'rgba(21,19,15,0.06)' }} role="tablist" aria-label="Periode" data-testid="v4p-periode">
          {[['mnd', 'Per måned'], ['aar', 'Per år']].map(([id, navn]) => (
            <button key={id} type="button" role="tab" aria-selected={periode === id} onClick={() => setPeriode(id)} className="rounded-full px-3 py-1.5 transition-colors" style={{ background: periode === id ? T.ink : 'transparent', color: periode === id ? '#F4F1EA' : DIM }} data-testid={`v4p-periode-${id}`}>{navn}</button>
          ))}
        </div>
      </div>
      <div className="mt-6 border-t pt-5" style={{ borderColor: HAIR }}>
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[14px]" style={{ color: SVAK }}>Husleie i måneden</p>
          <p className="text-[24px] tabular-nums" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }}><Tall v={leie} testid="v4p-leie" /></p>
        </div>
        <div className="mt-3"><Glider leie={leie} setLeie={setLeie} /></div>
        <p className="mt-2 flex justify-between text-[12px] tabular-nums" style={{ color: SVAK }}><span>{pen(MIN)} kr</span><span>{pen(MAX)} kr</span></p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-6 border-t pt-5" style={{ borderColor: HAIR }}>
        <div>
          <p className="text-[14px]" style={{ color: SVAK }}>Selvforvaltning · 5 %</p>
          <p className="mt-1.5 text-[clamp(34px,2.8vw,48px)] tabular-nums" style={{ ...display, color: T.ink, lineHeight: 1 }}><Tall v={mnd * k} testid="v4p-mnd" /></p>
          <p className="mt-1.5 text-[13px]" style={{ color: DIM }}>{aar ? 'i året' : 'i måneden'}</p>
        </div>
        <div>
          <p className="text-[14px]" style={{ color: SVAK }}>Til deg</p>
          <p className="mt-1.5 text-[clamp(34px,2.8vw,48px)] tabular-nums" style={{ ...display, color: T.ink, lineHeight: 1 }}><Tall v={(leie - mnd) * k} testid="v4p-til-deg" /></p>
          <p className="mt-1.5 text-[13px]" style={{ color: DIM }}>{aar ? 'i året' : 'utbetalt den 3. hver måned'}</p>
        </div>
      </div>
      <p className="mt-5 text-[12.5px] leading-[1.5]" style={{ color: SVAK }}>Står boligen tom, koster den ingenting. Full forvaltning og tillegg: <Link href="/priskalkulator" className="underline underline-offset-4 decoration-[#15130F]/25 hover:decoration-[#15130F]" style={{ color: T.ink }}>priskalkulatoren</Link>.</p>
    </div>
  );
}

/* Fire nuller. Det ærligste vi kan si om prisen, og det de fleste lurer på. */
const NULLER = [
  ['Oppstart', 'Ingen etableringskostnad. Adressen inn, boligen satt opp.'],
  ['Bindingstid', 'Si opp når du vil, ved månedsslutt. Historikken blir med deg.'],
  ['Minstepris', 'Fem prosent av det som faktisk betales. Ikke et gulv.'],
  ['Tom bolig', 'Kommer det ikke husleie, betaler du ingenting den måneden.'],
];
function Nuller({ inn }) {
  return (
    <div data-testid="v4p-nuller">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10" style={inn(0)}>
        <h2 className="text-[clamp(34px,3.6vw,60px)] lg:col-span-7" style={{ ...display, color: T.ink }}>Det du aldri betaler for<Punkt /></h2>
        <p className="max-w-[36ch] text-[16.5px] leading-[1.5] lg:col-span-4 lg:col-start-9 lg:pb-2" style={{ color: DIM }}>Prisen er én prosentsats av husleien som kommer inn. Det som pleier å stå med liten skrift, står her med store tall.</p>
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

const STEG = [
  ['1', 'Skriv inn adressen', 'Vi finner boligen og setter den opp.'],
  ['2', 'Leietaker og kontrakt', 'Kontrakten signeres med BankID.'],
  ['3', 'Husleie og saker følges opp', 'Du godkjenner det som koster.'],
];

export default function PriserV4() {
  const [leie, setLeie] = useState(14500);
  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="priser-v4">
      <NavV4 />
      <main>
        {/* 1. Hero: tallet, og din husleie regnet ut */}
        <Avsloring threshold={0.05} testid="v4p-hero">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-20">
              <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
                <div className="lg:col-span-7">
                  <Innledning label="Priser" tittel={<>5 % av husleien.<br />Det er prisen<Punkt /></>} ingress="Prisen for å leie ut selv med DigiHome. Ingen oppstart, ingen bindingstid, ingen minstepris. Står boligen tom, betaler du ingenting. Forvaltning, selskaper og meglere får et tilbud på sitt." maks="18ch" testid="v4p" />
                </div>
                <div className="lg:col-span-5 lg:col-start-8"><Regnestykke leie={leie} setLeie={setLeie} /></div>
              </div>

              {/* 2. Fire planer */}
              <ol className="mt-16 grid gap-5 lg:mt-24 lg:grid-cols-3" data-testid="v4p-nivaer">
                {PLANER.map((p, i) => <Plan key={p.id} p={p} inn={inn} i={i} />)}
              </ol>
            </div>
          )}
        </Avsloring>

        {/* 3. Alt som er med: én tabell for alle fire */}
        <Avsloring className="border-t" style={{ borderColor: HAIR, background: T.flate }} testid="v4p-sammenlign-seksjon">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1360px] px-5 py-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:py-28">
              <Sammenligning inn={inn} />
            </div>
          )}
        </Avsloring>

        {/* 4. Fire nuller */}
        <Avsloring className="border-t" style={{ borderColor: HAIR }} testid="v4p-nuller-seksjon">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1360px] px-5 py-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:py-28">
              <Nuller inn={inn} />
            </div>
          )}
        </Avsloring>

        <FaqSeksjon sporsmal={SPORSMAL} prisSvar={PRIS_SVAR} intro="Det korte svaret på det folk lurer på først. Fant du ikke ditt? Ta en kort samtale med oss." />
        <AvslutningSeksjon
          tittel="Start der du er"
          under="Selv eller med oss. Samme system, ingen bindingstid."
          handling={{ knapp: { href: '/kom-i-gang', tekst: 'Kom i gang' }, lenke: { href: '/book-mote', tekst: 'Book en samtale' } }}
          steg={STEG}
        />
      </main>
      <FooterV4 />
    </div>
  );
}
