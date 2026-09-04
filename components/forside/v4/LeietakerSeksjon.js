'use client';

import React, { useRef, useState } from 'react';
import { EASE, T, display, useSekvens, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   LeietakerSeksjon — «Forstår boligen. Ikke bare meldingen.»

   Poenget er ikke «vi har en chat». Poenget er at systemet forstår eiendom:
   når Jonas skriver at varmtvannet er borte, vet DigiHome hvilken leilighet,
   hvilken bereder, hvem som er fast rørlegger — og at det haster. Alt det
   vises som HANDLINGER med grunnlag (ikke «AI tenker»).

   Komposisjon (Sana-prinsippet): én stor flate til venstre med tråden
   flytende nederst i flaten, og til høyre et stort register der stegene
   lyser opp i takt med tråden. Hvert steg har én linje som viser hva
   systemet visste. Én sekvens, to flater.

   Flaten kan være foto (Jonas, kveld), DigiHome-lilla eller charcoal —
   sammenlignes live i preview; velgeren fjernes når valget er tatt.

   Sekvensen spiller én gang når seksjonen er i view, holder på «Venter på
   eierens godkjenning» (det er poenget) og hviler i sluttbildet.
   Redusert bevegelse → rett til sluttbildet.
--------------------------------------------------------------------------- */

/* Tempo: raskt der systemet svarer, sakte der mennesker er involvert. Aldri jevnt. */
const FASER = [
  { navn: 'start', ms: 600 },
  { navn: 'foto', ms: 650 },          // Jonas sender bildet …
  { navn: 'meldt', ms: 750 },         // … og to setninger. Systemet svarer nesten umiddelbart.
  { navn: 'registrert', ms: 1500 },   // pust — noe skjer i bakgrunnen
  { navn: 'leverandor', ms: 450 },    // rørleggerkortet
  { navn: 'venter', ms: 2400 },       // det menneskelige leddet — holdes. Dette er ditt øyeblikk.
  { navn: 'godkjent', ms: 1600 },     // neste morgen
  { navn: 'lost', ms: 1100 },         // torsdag
  { navn: 'takk', ms: 0 },            // Jonas får siste ord
];

/* Registeret. `fase` = når steget er fullført. `venter` = fasen der steget venter på deg.
   `d` = hva systemet visste / gjorde — det er her «forstår eiendom» bor. */
const STEG = [
  { fase: 'meldt', t: 'Meldt inn med bilde', d: 'Jonas, leilighet 2 · tirsdag 22:41.' },
  { fase: 'registrert', t: 'Forstått som VVS, haster', d: 'Bilde og tekst tolkes: bereder, ikke bagatell. Eier varsles.' },
  { fase: 'leverandor', t: 'Riktig rørlegger foreslått', d: 'Rørlegger AS er bygårdens faste leverandør. Ledig torsdag.' },
  { fase: 'godkjent', venter: 'venter', t: 'Godkjent av deg', tVenter: 'Venter på deg', d: 'Kostnader krever alltid ditt ja. Ett trykk.' },
  { fase: 'lost', t: 'Løst og dokumentert', d: 'Rapport og historikk ligger på boligen — for alltid.' },
];

/* Tråden fra Jonas' side.
   'bilde' / 'jonas' = hans. 'status' = det DigiHome faktisk sender leietakeren. 'kort' = rørleggeravtalen,
   som oppdateres på stedet (venter → godkjent) i stedet for å bli en ny melding.
   Ukedag i tidsstempelet: saken strekker seg over tre dager uten at tråden blir lang. Leietakeren ser ikke pris. */
const TRAD = [
  { fase: 'foto', type: 'bilde', src: '/v4/bereder.webp', alt: 'Varmtvannsbereder på badet' },
  { fase: 'meldt', type: 'jonas', tid: 'tir. 22:41', t: 'Varmtvannet er borte i hele leiligheten. Lampen på berederen blinker rødt.' },
  { fase: 'registrert', type: 'status', tid: '22:41', t: 'Saken er registrert · haster', d: 'Manglende varmtvann er en mangel. Eier er varslet.' },
  { fase: 'leverandor', type: 'kort', tid: '22:43' },
  { fase: 'lost', type: 'status', tid: 'tor. 10:14', t: 'Saken er løst', d: 'Berederen er reparert. Si fra her om noe ikke stemmer.', lost: true },
  { fase: 'takk', type: 'jonas', tid: '10:20', t: 'Fungerer igjen. Takk!' },
];

/* Flaten bak tråden. Sammenlignes live — velgeren fjernes når valget er tatt.
   foto      Jonas på kvelden, telefonen i hånden. Mørk nederst → tråden leses. Kan byttes til <video> senere.
   lilla     DigiHome-lilla som ren, flat flate. Merkevare — ikke gradient, ikke glow.
   charcoal  varm charcoal, samme tone som godkjenningskortet i heroen. */
const FLATER = {
  foto: { tema: 'mork', bilde: '/v4/jonas-kveld.webp', bg: '#1B1815', overlay: 'linear-gradient(180deg, rgba(27,24,21,0.05) 0%, rgba(27,24,21,0.15) 45%, rgba(27,24,21,0.72) 100%)' },
  lilla: { tema: 'lys', bilde: null, bg: T.lilla, overlay: 'none' },
  charcoal: { tema: 'mork', bilde: null, bg: T.charcoal, overlay: 'none' },
};
const VELGER = [['foto', 'Foto'], ['lilla', 'Lilla'], ['charcoal', 'Charcoal']];

const HAIR = 'rgba(21,19,15,0.08)';
const SKYGGE = '0 16px 40px -20px rgba(21,19,15,0.45), 0 1px 0 rgba(21,19,15,0.04)';

function Hake({ className = '' }) {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Rad som vokser inn (grid-rows 0fr → 1fr) og fader. Sluttstate er stabil layout. */
function Inn({ vis, delay = 0, children }) {
  return (
    <div className="grid" style={{ gridTemplateRows: vis ? '1fr' : '0fr', transition: `grid-template-rows 520ms ${EASE} ${delay}ms` }} aria-hidden={!vis}>
      <div className="min-h-0 overflow-hidden">
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: `opacity 420ms ${EASE} ${delay + 120}ms, transform 420ms ${EASE} ${delay + 120}ms` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Tråden — flyter nederst i flaten. Jonas mørk, DigiHome hvit. ── */
function Trad({ er, tema }) {
  const godkjent = er('godkjent');
  const venter = er('venter');
  const lys = tema === 'lys';
  /* Jonas' bobler: ink på lys flate, hvit-transparent på mørk. */
  const jonasBg = lys ? T.ink : 'rgba(255,255,255,0.16)';
  const jonasTekst = T.offwhite;
  const stempel = lys ? 'rgba(21,19,15,0.6)' : 'rgba(244,241,234,0.62)';

  return (
    <ol className="flex flex-col justify-end text-[#15130F]" data-testid="v4-trad">
      {TRAD.map((m, i) => {
        const vis = er(m.fase);
        if (m.type === 'bilde') {
          return (
            <li key={i}>
              <Inn vis={vis}>
                <div className="flex justify-end pb-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.src} alt={m.alt} width={720} height={540} draggable={false} className="block w-[200px] rounded-[16px] object-cover sm:w-[216px]" style={{ aspectRatio: '4 / 3', boxShadow: SKYGGE }} data-testid="v4-trad-bilde" />
                </div>
              </Inn>
            </li>
          );
        }
        if (m.type === 'jonas') {
          return (
            <li key={i}>
              <Inn vis={vis}>
                <div className="flex justify-end pb-3.5">
                  <div className="max-w-[84%]">
                    <p className="rounded-[16px] rounded-br-[5px] px-4 py-2.5 text-[14.5px] leading-[1.42]" style={{ background: jonasBg, color: jonasTekst }}>{m.t}</p>
                    <p className="mt-1.5 text-right text-[11.5px]" style={{ color: stempel }}>Jonas · {m.tid}</p>
                  </div>
                </div>
              </Inn>
            </li>
          );
        }
        if (m.type === 'kort') {
          /* Rørleggeravtalen — én melding som oppdateres på stedet. Statusraden kommer i 'venter', bytter i 'godkjent'. */
          return (
            <li key={i}>
              <Inn vis={vis}>
                <div className="pb-3.5">
                  <div className="max-w-[90%] rounded-[16px] rounded-bl-[5px] px-4 pb-3 pt-3" style={{ background: '#fff', boxShadow: SKYGGE }} data-testid="v4-trad-kort">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-[14.5px] font-medium">Rørlegger AS <span className="font-normal text-[#15130F]/55">· torsdag 09:00</span></p>
                      <p className="text-[11.5px] text-[#15130F]/42">{m.tid}</p>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-[1.42] text-[#15130F]/58">Bygårdens faste rørlegger · feilsøking av bereder</p>
                    <div className="grid" style={{ gridTemplateRows: venter ? '1fr' : '0fr', transition: `grid-template-rows 480ms ${EASE}` }} aria-hidden={!venter}>
                      <div className="min-h-0 overflow-hidden">
                        <div className="mt-2.5 flex items-center justify-between gap-3 border-t pt-2.5 text-[12.5px]" style={{ borderColor: HAIR, opacity: venter ? 1 : 0, transition: `opacity 380ms ${EASE} 120ms` }}>
                          <span className="inline-grid">
                            <span className="col-start-1 row-start-1 inline-flex items-center gap-2" style={{ color: 'rgba(21,19,15,0.72)', opacity: godkjent ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på eierens godkjenning
                            </span>
                            <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 font-medium" style={{ color: '#166B3C', opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 260ms` }}>
                              <Hake />Godkjent · besøket er bekreftet
                            </span>
                          </span>
                          <span className="text-[#15130F]/42" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 260ms` }}>ons. 08:02</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Inn>
            </li>
          );
        }
        /* status — det DigiHome faktisk sender leietakeren */
        return (
          <li key={i}>
            <Inn vis={vis}>
              <div className="pb-3.5">
                <div className="max-w-[90%] rounded-[16px] rounded-bl-[5px] px-4 py-2.5" style={{ background: '#fff', boxShadow: SKYGGE }}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="flex items-center gap-2 text-[14.5px] font-medium">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: m.lost ? T.gronn : 'rgba(21,19,15,0.5)' }} />
                      {m.t}
                    </p>
                    <p className="text-[11.5px] text-[#15130F]/42">{m.tid}</p>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-[1.42] text-[#15130F]/58">{m.d}</p>
                </div>
              </div>
            </Inn>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Flaten: foto / lilla / charcoal, med tråden flytende nederst ── */
function Flate({ er, flate }) {
  const f = FLATER[flate] || FLATER.lilla;
  const lys = f.tema === 'lys';
  const lost = er('lost');
  const venterNa = er('venter') && !er('godkjent');
  const label = lys ? 'rgba(21,19,15,0.62)' : 'rgba(244,241,234,0.66)';
  return (
    <div className="relative flex min-h-[560px] flex-col overflow-hidden rounded-[24px] lg:h-[clamp(740px,80vh,820px)]" style={{ background: f.bg }} data-testid="v4-leietaker-flate">
      {f.bilde && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={f.bilde} src={f.bilde} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 h-full w-full object-cover object-[50%_30%]" />
      )}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: f.overlay }} />

      {/* Kontekst — én linje øverst */}
      <div className="relative flex items-start justify-between gap-4 px-6 pt-6 text-[13px] sm:px-9 sm:pt-7" style={{ color: label }}>
        <span>Varmtvann · Nygårdsgaten 5, leilighet 2</span>
        <span className="inline-grid shrink-0">
          <span className="col-start-1 row-start-1 inline-flex items-center gap-2" style={{ opacity: lost ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: venterNa ? (lys ? T.ink : T.lilla) : 'currentColor', opacity: venterNa ? 1 : 0.6, transition: `background-color 300ms ${EASE}` }} />Under behandling
          </span>
          <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 font-medium" style={{ color: lys ? T.ink : T.offwhite, opacity: lost ? 1 : 0, transition: `opacity 300ms ${EASE} 250ms` }}>
            <Hake />Løst
          </span>
        </span>
      </div>

      {/* Tråden — i bunnen av flaten (mt-auto), vokser aldri over konteksten */}
      <div className="relative mt-auto px-6 pb-6 pt-8 sm:px-9 sm:pb-8">
        <div className="w-full max-w-[420px]">
          <Trad er={er} tema={f.tema} />
        </div>
      </div>
    </div>
  );
}

/* ── Registeret: stort, til høyre. Aktive steg i ink med én linje grunnlag; kommende steg dempet. ── */
function Steg({ er }) {
  return (
    <ol className="mt-12 lg:mt-14" data-testid="v4-steg">
      {STEG.map((s, i) => {
        const ferdig = er(s.fase);
        const venter = s.venter ? er(s.venter) && !ferdig : false;
        const aktiv = ferdig || venter;
        return (
          <li key={i} className="border-t py-4 lg:py-5" style={{ borderColor: HAIR }} data-testid={`v4-steg-${i}`}>
            <div className="grid grid-cols-[14px_minmax(0,1fr)] items-center gap-x-4">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: ferdig ? T.ink : venter ? T.lilla : 'rgba(21,19,15,0.18)', transition: `background-color 320ms ${EASE}` }} />
              <span className="text-[20px] lg:text-[24px]" style={{ ...display, letterSpacing: '-0.02em', lineHeight: 1.1, color: aktiv ? T.ink : 'rgba(21,19,15,0.3)', transition: `color 320ms ${EASE}` }}>
                {venter && s.tVenter ? s.tVenter : s.t}
              </span>
            </div>
            {/* Grunnlaget — kommer inn når steget er aktivt */}
            <div className="grid" style={{ gridTemplateRows: aktiv ? '1fr' : '0fr', transition: `grid-template-rows 420ms ${EASE}` }} aria-hidden={!aktiv}>
              <div className="min-h-0 overflow-hidden">
                <p className="pl-[30px] pt-1.5 text-[14.5px] leading-[1.45]" style={{ color: 'rgba(21,19,15,0.56)', opacity: aktiv ? 1 : 0, transition: `opacity 360ms ${EASE} 100ms` }}>{s.d}</p>
              </div>
            </div>
          </li>
        );
      })}
      <li className="border-t" style={{ borderColor: HAIR }} aria-hidden="true" />
    </ol>
  );
}

export default function LeietakerSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.3);
  const { er } = useSekvens(FASER, synlig);
  const [flate, setFlate] = useState('lilla');   // sammenlignes live i preview

  return (
    <section id="leietaker" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4-leietaker">
      <div className="mx-auto max-w-[1760px] px-5 pb-28 pt-20 sm:px-8 lg:px-10 lg:pb-36 lg:pt-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10 2xl:gap-14">
          {/* Venstre (desktop): flaten med tråden. På mobil: mellom tittel og register. */}
          <div className="order-2 lg:order-none lg:col-span-7">
            <Flate er={er} flate={flate} />
          </div>

          {/* Høyre: idé og register. På mobil løses wrapperen opp (contents) så tittel kommer først og registeret sist. */}
          <div className="contents lg:block lg:col-span-5 lg:pl-4 2xl:pl-10">
            <div className="order-1">
              <h2 className="text-[clamp(40px,3.6vw,64px)]" style={{ ...display, color: T.ink }} data-testid="v4-leietaker-tittel">
                Forstår boligen.<br />Ikke bare meldingen.
              </h2>
              <p className="mt-6 max-w-[42ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: 'rgba(21,19,15,0.66)' }}>
                Når Jonas skriver at varmtvannet er borte, vet DigiHome hvilken leilighet, hvilken bereder og hvem som er fast rørlegger — og at det haster. Du får ett spørsmål.
              </p>
            </div>
            <div className="order-3">
              <Steg er={er} />
            </div>
          </div>
        </div>

        {/* Sluttord — ord, ikke tall */}
        <p className="mt-20 text-center text-[clamp(22px,2.2vw,30px)] lg:mt-28" style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.15, color: 'rgba(21,19,15,0.82)' }} data-testid="v4-leietaker-sluttord">
          Mindre koordinering. Færre avbrytelser. Full kontroll.
        </p>
      </div>

      {/* Preview-velger for flaten — fjernes når valget er tatt */}
      <div className="absolute bottom-4 left-4 z-20 inline-flex items-center gap-1 rounded-full p-1 text-[12px]" style={{ background: 'rgba(36,28,39,0.7)', boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.14)' }} data-testid="v4-flate-velger">
        {VELGER.map(([id, navn]) => (
          <button key={id} type="button" onClick={() => setFlate(id)} className="h-7 rounded-full px-3" style={{ background: flate === id ? T.offwhite : 'transparent', color: flate === id ? T.ink : 'rgba(244,241,234,0.7)' }} data-testid={`v4-flate-${id}`}>{navn}</button>
        ))}
      </div>
    </section>
  );
}
