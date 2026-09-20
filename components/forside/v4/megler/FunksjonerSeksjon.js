'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EASE, T, display, useSmal, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   FunksjonerSeksjon — «Alt systemet gjør.» (#funksjoner)

   Spesifikasjonsarket, bygget som en indeks:
   · Til venstre (desktop) står de elleve stoppene som en fast liste med
     antall; det stoppet som er i bildet lyser. Klikk hopper dit.
     På mobil er listen en rullbar rad som blir stående under menyen.
   · Til høyre: stoppene med brikker. Stikkord, ikke setninger. Brikker som
     gjøres av språkmodeller har en lilla prikk. Stiplet = på vei.
   · Søkefeltet demper alt som ikke treffer og understreker treffet i ordet.
     Hurtigvalg under feltet for det meglere spør om først. Null treff gir en
     vei til demoen, ikke en tom side.

   Innholdet er hentet fra produktrepoet (backend/routes, services), ikke
   fra markedstekst. Kun opacity/transform i bevegelsen.
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

/* En brikke: streng, eller { t, ai?: true, kommer?: true } */
const ai = (t) => ({ t, ai: true });
const kommer = (t) => ({ t, kommer: true });

const STOPP = [
  ['Henvendelse', ['Salgspipeline med stadier', 'Kontaktskjema med e-postverifisering', 'Boligdata fra Kartverket', 'Eieroppslag fra Infotorg', ai('Leieestimat'), 'Befaring med Outlook-synk', 'Notater og oppfølging per lead']],
  ['Tilbud', ['Tilbud med versjoner', 'Lest-status', 'Aksept med BankID', 'Manuell aksept', 'Bytte av signeringsmetode', kommer('Deres logo og farger')]],
  ['Oppdrag', ['Forvaltningsavtale med BankID', 'Tillegg per ny bolig', 'Onboarding av eier og bolig', 'Bilag ved bytte av modell', 'Selvforvaltning eller full forvaltning per bolig']],
  ['Annonse', ['Publisering på FINN', 'Import fra FINN', ai('Annonsetekst skrevet av AI'), ai('Fotoforbedring'), 'Egen landingsside per bolig', ai('Chat i annonsen'), 'Airbnb, Booking og VRBO via Channex', 'Guesty']],
  ['Visning', ['Visningsbooking, tre typer', 'Legitimering med BankID', 'Kredittsjekk med samtykke', 'Søknader samlet per bolig', 'Interessenter fra FINN og egen side']],
  ['Kontrakt', ['Kontraktbygger', 'BankID via Idura', 'Posten signering', 'SMS-signering', 'Depositumskonto hos Keyhole', 'Lea Bank eller Tryg garanti', 'KPI-regulering', 'Tillegg og endringer']],
  ['Innflytting', ['Overtakelsesprotokoll', 'Rom for rom med bilder', 'Nøkler', 'Strømmåler og leverandør', 'Radon', 'PDF signert av begge']],
  ['Husleie', ['Egen fakturamotor', 'Faktura til leietaker', 'Husleie inn på klientkonto', 'Honorar trukket per eier', 'Utbetaling til eier', 'Påminnelse på push og e-post', 'Purring', 'Bro til PowerOffice']],
  ['Saker', [ai('Sak fra melding'), ai('AI-kategorisering og SLA'), 'Status fra åpen til løst', 'Leverandørregister med priser', 'Venter på leverandør eller godkjenning', 'Eiergodkjenning over grense', ai('Bilder tolket av AI'), ai('Kvitteringer lest av AI')]],
  ['Oppgjør', ['Oppgjørsrapport per eier', 'Honorar etter avtale', 'PowerOffice Go', 'Fiken', 'Bilag per eier og bolig', kommer('Tripletex')]],
  ['Plattform', ['Eierportal', 'Leietakerportal', 'Roller og rettigheter', 'Full logg', 'Driftssenter og oversikt', 'Mobilapp med push', 'Microsoft 365', ai('Assistent i chat med leietaker, eier og interessent'), 'Kunnskap, feedback og analyse for assistenten', 'Nyhetsbrev']],
];

const HURTIG = ['BankID', 'AI', 'Klientkonto', 'FINN', 'Regnskap', 'Eier'];

const normal = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const tekst = (b) => (typeof b === 'string' ? b : b.t);
const erAi = (b) => typeof b !== 'string' && !!b.ai;
const erKommer = (b) => typeof b !== 'string' && !!b.kommer;

/* Treffer brikken søket? «AI» treffer også alt som er merket ai, «regnskap» treffer regnskapssystemene. */
const SYNONYM = { ai: ['ai'], regnskap: ['poweroffice', 'fiken', 'tripletex', 'bilag'], eier: ['eier', 'klientkonto', 'oppgjor', 'honorar'] };
function treff(b, stopp, n) {
  if (!n) return true;
  const t = normal(tekst(b));
  if (t.includes(n) || normal(stopp).includes(n)) return true;
  if (n === 'ai' && erAi(b)) return true;
  const syn = SYNONYM[n];
  return !!syn && syn.some((x) => t.includes(x));
}

/* Understrek treffet i ordet */
function Marker({ t, n }) {
  if (!n) return t;
  const i = normal(t).indexOf(n);
  if (i < 0) return t;
  return <>{t.slice(0, i)}<mark style={{ background: 'transparent', color: 'inherit', textDecoration: 'underline', textDecorationColor: T.lilla, textDecorationThickness: 2, textUnderlineOffset: 3 }}>{t.slice(i, i + n.length)}</mark>{t.slice(i + n.length)}</>;
}

function Brikke({ b, n, stopp, synlig, i }) {
  const er = treff(b, stopp, n);
  const k = erKommer(b);
  return (
    <li
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13.5px] leading-[1.3]"
      style={{
        background: k ? 'transparent' : PAPIR,
        color: k ? SVAK : T.ink,
        boxShadow: k ? 'none' : `inset 0 0 0 1px ${HAIR}`,
        border: k ? '1px dashed rgba(21,19,15,0.28)' : '1px solid transparent',
        opacity: synlig ? (er ? 1 : 0.18) : 0,
        transform: synlig ? 'none' : 'translateY(6px)',
        transition: `opacity 420ms ${EASE} ${synlig ? 40 + i * 28 : 0}ms, transform 520ms ${EASE} ${synlig ? 40 + i * 28 : 0}ms`,
      }}
      data-treff={er ? '1' : '0'}
    >
      {erAi(b) ? <span aria-label="Språkmodell" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} /> : null}
      <span><Marker t={tekst(b)} n={n} /></span>
      {k ? <span className="text-[10.5px] uppercase tracking-[0.08em]" style={{ color: SVAK }}>kommer</span> : null}
    </li>
  );
}

/* Ett stopp med brikker. Melder fra når det er i bildet, så indeksen kan lyse. */
function Rad({ stopp, brikker, i, n, onSynlig }) {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) onSynlig(i); }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [i, onSynlig]);
  const antall = brikker.filter((b) => treff(b, stopp, n)).length;
  const noen = antall > 0;
  return (
    <li id={`fn-${i}`} ref={ref} className="scroll-mt-[140px] border-t py-7 transition-opacity duration-300 lg:py-8" style={{ borderColor: HAIR, opacity: noen ? 1 : 0.3 }} data-testid={`v4m-funksjoner-${i}`} data-treff={antall}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="flex items-baseline gap-3 text-[24px] lg:text-[28px]" style={{ ...display, color: T.ink, lineHeight: 1.05 }}>
          <span className="text-[12.5px] tabular-nums" style={{ color: T.lilla }}>{String(i + 1).padStart(2, '0')}</span>
          {stopp}
        </h3>
        <span className="text-[12.5px] tabular-nums" style={{ color: SVAK }}>{n ? `${antall} av ${brikker.length}` : brikker.length}</span>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {brikker.map((b, j) => <Brikke key={tekst(b)} b={b} n={n} stopp={stopp} synlig={synlig} i={j} />)}
      </ul>
    </li>
  );
}

export default function FunksjonerSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.08);
  const [q, setQ] = useState('');
  const [aktiv, setAktiv] = useState(0);
  const smal = useSmal();
  const barRef = useRef(null);
  /* Mobil: hold det aktive stoppet synlig i den rullbare raden */
  useEffect(() => {
    const bar = barRef.current;
    if (!smal || !bar) return;
    const el = bar.children[aktiv];
    if (!el) return;
    bar.scrollTo({ left: el.offsetLeft - bar.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [aktiv, smal]);
  const inn = (i, y = 14) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 80}ms, transform 800ms ${EASE} ${i * 80}ms` });

  const n = normal(q.trim());
  const alle = useMemo(() => STOPP.reduce((a, [, b]) => a + b.length, 0), []);
  const antall = n ? STOPP.reduce((a, [s, b]) => a + b.filter((x) => treff(x, s, n)).length, 0) : alle;
  const antallAi = useMemo(() => STOPP.reduce((a, [, b]) => a + b.filter(erAi).length, 0), []);

  const hopp = (i) => {
    const el = document.getElementById(`fn-${i}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="funksjoner" ref={ref} className="relative scroll-mt-[72px] lg:scroll-mt-[64px]" style={{ background: T.canvas, color: T.ink }} data-testid="v4m-funksjoner">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        {/* Hodet */}
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-7">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Funksjoner</p>
            <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4m-funksjoner-tittel">
              Alt systemet gjør<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-2" style={inn(2)}>
            <p className="max-w-[46ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM }}>
              Elleve stopp, {alle} funksjoner, ingen forklaringer. Det dere lurer på, står her eller kan spørres om i demoen.
            </p>
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[13.5px]" style={{ color: SVAK }}>
              <div className="flex items-baseline gap-2"><dt className="sr-only">Funksjoner</dt><dd><span className="text-[22px] tabular-nums" style={{ ...display, color: T.ink }}>{alle}</span> funksjoner</dd></div>
              <div className="flex items-baseline gap-2"><dt className="sr-only">Med språkmodell</dt><dd className="inline-flex items-baseline gap-2"><span className="text-[22px] tabular-nums" style={{ ...display, color: T.ink }}>{antallAi}</span> <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />gjøres av språkmodeller</span></dd></div>
              <div className="flex items-baseline gap-2"><dt className="sr-only">Stopp</dt><dd><span className="text-[22px] tabular-nums" style={{ ...display, color: T.ink }}>11</span> stopp</dd></div>
            </dl>
          </div>
        </div>

        {/* Søk + hurtigvalg */}
        <div className="mt-10 lg:mt-14" style={inn(3)}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block w-full max-w-[560px]">
              <span className="sr-only">Søk i funksjoner</span>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: SVAK }}>
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" /><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Søk, for eksempel KPI, Keyhole eller purring"
                className="h-12 w-full rounded-full pl-11 pr-5 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_2px_rgba(212,150,255,0.7)]"
                style={{ background: PAPIR, color: T.ink, boxShadow: `inset 0 0 0 1px ${HAIR}` }}
                data-testid="v4m-funksjoner-sok"
              />
              {q ? <button type="button" onClick={() => setQ('')} aria-label="Tøm søk" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-[12px]" style={{ color: DIM, background: 'rgba(21,19,15,0.05)' }} data-testid="v4m-funksjoner-tom">Tøm</button> : null}
            </label>
            <p className="text-[13.5px] tabular-nums" style={{ color: n ? T.ink : SVAK }} data-testid="v4m-funksjoner-antall" aria-live="polite">
              {n ? `${antall} av ${alle} treffer` : ''}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]" style={{ color: SVAK }}>
            <span className="mr-1">Ofte spurt:</span>
            {HURTIG.map((h) => {
              const er = normal(h) === n;
              return <button key={h} type="button" onClick={() => setQ(er ? '' : h)} className="rounded-full px-2.5 py-1 transition-colors" style={{ background: er ? T.ink : 'rgba(21,19,15,0.05)', color: er ? '#F4F1EA' : DIM }} data-testid={`v4m-funksjoner-hurtig-${normal(h)}`}>{h}</button>;
            })}
          </div>
        </div>

        {/* Indeks + ark */}
        <div className="mt-10 lg:mt-14 lg:grid lg:grid-cols-12 lg:gap-10" style={inn(4, 18)}>
          {/* Indeksen: fast liste på desktop, rullbar rad på mobil */}
          <nav aria-label="Stoppene" className="sticky top-[72px] z-[2] -mx-5 px-5 py-3 lg:top-[88px] lg:col-span-3 lg:mx-0 lg:self-start lg:px-0 lg:py-0" style={{ background: T.canvas }} data-testid="v4m-funksjoner-indeks">
            <ol ref={barRef} className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-t lg:pb-0" style={{ borderColor: HAIR }}>
              {STOPP.map(([stopp, brikker], i) => {
                const er = i === aktiv;
                const antallHer = n ? brikker.filter((b) => treff(b, stopp, n)).length : brikker.length;
                return (
                  <li key={stopp} className="shrink-0 lg:border-b" style={{ borderColor: HAIR }}>
                    <button type="button" onClick={() => hopp(i)} aria-current={er ? 'true' : undefined} className="flex items-center gap-3 rounded-full px-3 py-1.5 text-[13px] transition-colors lg:w-full lg:rounded-none lg:px-0 lg:py-3 lg:text-[14.5px]" style={smal ? { background: er ? T.ink : 'rgba(21,19,15,0.05)', color: er ? '#F4F1EA' : DIM } : { background: 'transparent', color: er ? T.ink : (antallHer ? DIM : 'rgba(21,19,15,0.3)') }} data-testid={`v4m-funksjoner-indeks-${i}`}>
                      <span className="hidden w-[3px] self-stretch rounded-full lg:block" style={{ background: er ? T.lilla : 'transparent', transition: `background 300ms ${EASE}` }} />
                      <span className="hidden text-[12px] tabular-nums lg:inline" style={{ color: er ? T.lilla : 'rgba(21,19,15,0.35)' }}>{String(i + 1).padStart(2, '0')}</span>
                      <span className={er ? 'font-medium' : ''}>{stopp}</span>
                      <span className="ml-auto hidden text-[12.5px] tabular-nums lg:inline" style={{ color: 'rgba(21,19,15,0.4)' }}>{antallHer}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 hidden items-center gap-2 text-[12.5px] lg:flex" style={{ color: SVAK }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Gjøres av språkmodeller</p>
            <p className="mt-1.5 hidden items-center gap-2 text-[12.5px] lg:flex" style={{ color: SVAK }}><span className="inline-block h-[10px] w-[18px] rounded-full" style={{ border: '1px dashed rgba(21,19,15,0.35)' }} />På vei</p>
          </nav>

          {/* Arket */}
          <div className="mt-4 lg:col-span-9 lg:mt-0">
            <ol data-testid="v4m-funksjoner-ark">
              {STOPP.map(([stopp, brikker], i) => <Rad key={stopp} stopp={stopp} brikker={brikker} i={i} n={n} onSynlig={setAktiv} />)}
            </ol>
            {n && antall === 0 ? (
              <div className="mt-6 rounded-[18px] px-6 py-6" style={{ background: PAPIR, boxShadow: `inset 0 0 0 1px ${HAIR}` }} data-testid="v4m-funksjoner-null">
                <p className="text-[17px] font-medium" style={{ color: T.ink }}>Ingen treff på «{q.trim()}».</p>
                <p className="mt-1.5 text-[15px]" style={{ color: DIM }}>Spør oss i demoen. Finnes det ikke, sier vi det.</p>
                <a href="#demo" className="mt-4 inline-flex items-center rounded-full px-4 py-2 text-[14px] font-medium" style={{ background: T.ink, color: '#F4F1EA' }} data-testid="v4m-funksjoner-null-demo">Book en demo</a>
              </div>
            ) : null}
            <p className="mt-8 max-w-[64ch] text-[14.5px] leading-[1.55]" style={{ color: SVAK }} data-testid="v4m-funksjoner-note">
              Alt uten «kommer» finnes i systemet i dag og kan vises i en demo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
