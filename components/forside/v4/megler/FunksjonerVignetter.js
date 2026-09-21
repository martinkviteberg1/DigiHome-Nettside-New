'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { EASE, T, display, tall, useRedusert } from '../motion';

/* ---------------------------------------------------------------------------
   FunksjonerVignetter — elleve små bilder fra produktet, ett per stopp.

   Hver vignett er et «vindu» fra systemet som spilles i trinn (s = 0…N):
   radene kommer én og én, tall telles, status skifter. Ingen tekstvegg —
   det er slik det ser ut når det skjer. Kun opacity/transform/width.
   Data er illustrativ, men funksjonene er hentet fra produktrepoet.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';
const FARGER = {
  gronn: { bg: 'rgba(31,157,85,0.10)', tx: '#166B3C', dot: T.gronn },
  lilla: { bg: 'rgba(212,150,255,0.22)', tx: '#7A2FB0', dot: T.lilla },
  gul: { bg: 'rgba(214,140,20,0.12)', tx: '#8A5A0B', dot: 'rgba(214,140,20,0.95)' },
  ink: { bg: 'rgba(21,19,15,0.06)', tx: T.ink, dot: 'rgba(21,19,15,0.5)' },
};

/* Trinnene: teller fra 0 til maks mens vignetten er aktiv. Redusert bevegelse → sluttbildet. */
export function useSteg(aktiv, maks, ms = 460) {
  const redusert = useRedusert();
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!aktiv) { setS(0); return undefined; }
    if (redusert) { setS(maks); return undefined; }
    setS(0);
    let k = 0;
    let iv = 0;
    /* Første trinn kommer raskt (mens panelet glir inn), resten i jevn takt */
    const t0 = window.setTimeout(() => {
      k = 1; setS(1);
      if (k >= maks) return;
      iv = window.setInterval(() => { k += 1; setS(k); if (k >= maks) window.clearInterval(iv); }, ms);
    }, Math.round(ms * 0.45));
    return () => { window.clearTimeout(t0); if (iv) window.clearInterval(iv); };
  }, [aktiv, maks, ms, redusert]);
  return s;
}

export const vis = (s, k, y = 7) => ({ opacity: s >= k ? 1 : 0, transform: s >= k ? 'none' : `translateY(${y}px)`, transition: `opacity 460ms ${EASE}, transform 560ms ${EASE}` });

/* Tall som telles opp når de skal vises */
function Tell({ til, vis: v, fmt = (n) => tall(Math.round(n)), dur = 900 }) {
  const [x, setX] = useState(0);
  useEffect(() => {
    if (!v) { setX(0); return undefined; }
    let raf; const t0 = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - t0) / dur); setX(til * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [v, til, dur]);
  return <>{fmt(x)}</>;
}

/* ── Byggesteiner ─────────────────────────────────────────────────────── */

/* Er raden i bildet? Haken tegner seg med ett strøk idet raden kommer. */
const VisCtx = createContext(true);

function Hake({ farge = 'gronn', size = 16 }) {
  const f = FARGER[farge];
  const v = useContext(VisCtx);
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: f.bg, color: f.tx, transform: v ? 'scale(1)' : 'scale(0.6)', transition: `transform 420ms cubic-bezier(0.34, 1.45, 0.64, 1) 120ms` }}>
      <svg aria-hidden="true" width={size * 0.6} height={size * 0.6} viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 14, strokeDashoffset: v ? 0 : 14, transition: v ? `stroke-dashoffset 380ms ${EASE} 220ms` : 'none' }} /></svg>
    </span>
  );
}

export function Pille({ farge = 'gronn', children, className = '' }) {
  const f = FARGER[farge];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium leading-[16px] ${className}`} style={{ background: f.bg, color: f.tx }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: f.dot }} />{children}
    </span>
  );
}

/* Vinduet: tittel + status øverst, innhold under. Statusen kan skifte med trinnet. */
function Vindu({ tittel, status, farge = 'gronn', children }) {
  return (
    <div className="flex h-full flex-col rounded-[16px]" style={{ background: '#FFFFFF', boxShadow: `inset 0 0 0 1px ${HAIR}, 0 30px 60px -44px rgba(21,19,15,0.4)` }} data-testid="v4m-funksjoner-vindu">
      <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ boxShadow: `inset 0 -1px 0 ${HAIR}` }}>
        <p className="truncate text-[13.5px] font-medium" style={{ color: T.ink }}>{tittel}</p>
        <span key={status} style={{ animation: `v4-steg-inn 380ms ${EASE} both` }}><Pille farge={farge}>{status}</Pille></span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-4 py-4">{children}</div>
    </div>
  );
}

function Rad({ a, b, s, k, ai, farge, sterk }) {
  return (
    <VisCtx.Provider value={s >= k}>
      <div className="flex items-baseline justify-between gap-4 text-[13.5px] leading-[1.4]" style={vis(s, k)}>
        <span className="inline-flex shrink-0 items-center gap-1.5" style={{ color: SVAK }}>
          {ai ? <span aria-label="Språkmodell" className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} /> : null}{a}
        </span>
        <span className="inline-flex min-w-0 items-center justify-end gap-1.5 text-right" style={{ color: farge ? FARGER[farge].tx : T.ink, fontWeight: sterk ? 500 : 400 }}>{b}</span>
      </div>
    </VisCtx.Provider>
  );
}

function Strek() { return <span aria-hidden="true" className="my-1 block h-px w-full" style={{ background: HAIR }} />; }

/* Trinnlinjen: Ny → Befaring → Tilbud → Signert */
function Steg({ liste, aktiv, farge = 'lilla' }) {
  const f = FARGER[farge];
  return (
    <ol className="flex items-center gap-1.5 text-[11.5px]" style={{ color: SVAK }}>
      {liste.map((l, i) => (
        <li key={l} className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: i < aktiv ? T.gronn : i === aktiv ? f.dot : 'rgba(21,19,15,0.18)', transition: `background 400ms ${EASE}` }} />
            <span style={{ color: i === aktiv ? T.ink : SVAK, fontWeight: i === aktiv ? 500 : 400, transition: `color 400ms ${EASE}` }}>{l}</span>
          </span>
          {i < liste.length - 1 ? <span className="h-px w-3" style={{ background: i < aktiv ? 'rgba(31,157,85,0.5)' : 'rgba(21,19,15,0.15)', transition: `background 400ms ${EASE}` }} /> : null}
        </li>
      ))}
    </ol>
  );
}

function Signatur({ s, k, navn, rolle, tid, metode = 'BankID' }) {
  const ok = s >= k;
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]" style={vis(s, k - 1 < 0 ? 0 : k - 1)}>
      <span className="inline-flex items-center gap-2">
        <span className="inline-grid h-4 w-4 place-items-center">
          <span className="col-start-1 row-start-1 h-4 w-4 rounded-full" style={{ boxShadow: `inset 0 0 0 1px rgba(21,19,15,0.2)`, opacity: ok ? 0 : 1, transition: `opacity 300ms ${EASE}` }} />
          <span className="col-start-1 row-start-1" style={{ opacity: ok ? 1 : 0, transform: ok ? 'none' : 'scale(0.5)', transition: `opacity 300ms ${EASE}, transform 420ms cubic-bezier(0.34, 1.45, 0.64, 1)` }}><Hake /></span>
        </span>
        <span style={{ color: T.ink }}>{navn}</span>
        <span style={{ color: SVAK }}>· {rolle}</span>
      </span>
      <span style={{ color: ok ? DIM : 'rgba(21,19,15,0.3)', transition: `color 300ms ${EASE}` }}>{ok ? `${metode} · ${tid}` : 'venter'}</span>
    </div>
  );
}

function Stolpe({ s, k, del, av, farge = 'gronn' }) {
  const p = s >= k ? (del / av) * 100 : 0;
  return (
    <div className="h-[6px] w-full overflow-hidden rounded-full" style={{ background: 'rgba(21,19,15,0.07)' }}>
      <span className="block h-full rounded-full" style={{ width: `${p}%`, background: FARGER[farge].dot, transition: `width 1100ms ${EASE}` }} />
    </div>
  );
}

function Boble({ s, k, fra, ai, hoyre, children }) {
  /* Assistenten «skriver» i trinnet før svaret kommer */
  const skriver = ai && s === k - 1;
  return (
    <div className={`relative flex ${hoyre ? 'justify-end' : 'justify-start'}`}>
      {skriver ? (
        <span className="absolute top-0 inline-flex h-[30px] items-center gap-1 rounded-[12px] px-3" style={{ [hoyre ? 'right' : 'left']: 0, background: hoyre ? T.ink : 'rgba(21,19,15,0.05)', animation: `v4-chat-inn 260ms ${EASE} both` }} aria-label="Skriver">
          {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: hoyre ? 'rgba(244,241,234,0.8)' : 'rgba(21,19,15,0.5)', animation: `v4-prikk 900ms ease-in-out ${i * 150}ms infinite` }} />)}
        </span>
      ) : null}
      <div className="max-w-[86%] rounded-[12px] px-3 py-2 text-[12.5px] leading-[1.4]" style={{ background: hoyre ? T.ink : 'rgba(21,19,15,0.05)', color: hoyre ? '#F4F1EA' : T.ink, borderTopLeftRadius: hoyre ? 12 : 4, borderTopRightRadius: hoyre ? 4 : 12, ...vis(s, k, 8), transformOrigin: hoyre ? '100% 0%' : '0% 0%' }}>
        <p className="mb-0.5 flex items-center gap-1.5 text-[10.5px]" style={{ color: hoyre ? 'rgba(244,241,234,0.6)' : SVAK }}>
          {ai ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} /> : null}{fra}
        </p>
        {children}
      </div>
    </div>
  );
}

/* ── De elleve vignettene ─────────────────────────────────────────────── */

function V01({ s }) {
  return (
    <Vindu tittel="Henvendelse · Fjellveien 12" status={s >= 4 ? 'Tilbud klart' : 'Ny'} farge="lilla">
      <div style={vis(s, 0)}><Steg liste={['Ny', 'Befaring', 'Tilbud', 'Signert']} aktiv={s >= 4 ? 2 : 0} /></div>
      <Strek />
      <Rad s={s} k={1} a="Fra" b="Landingssiden · 07:15" />
      <Rad s={s} k={2} a="Kartverket" b="78 m² · 3 rom · bygget 1962" />
      <Rad s={s} k={3} a="Infotorg" b={<><Hake size={14} />Eier: Kari Moen</>} />
      <Rad s={s} k={4} a="Leieestimat" ai b={<span style={{ color: T.ink }}>{s >= 4 ? <><Tell til={16800} vis={s >= 4} />–<Tell til={18200} vis={s >= 4} /> kr</> : ''}</span>} sterk />
      <Rad s={s} k={5} a="Befaring" b="Torsdag 10:00 · lagt i Outlook" />
      <Rad s={s} k={6} a="Notat" b="Vil ha svar før helgen · følg opp fredag" />
    </Vindu>
  );
}

function V02({ s }) {
  const ok = s >= 5;
  return (
    <Vindu tittel="Tilbud · Fjellveien 12" status={ok ? 'Akseptert 10:02' : 'Venter på aksept'} farge={ok ? 'gronn' : 'lilla'}>
      <Rad s={s} k={1} a="Versjon" b="2 · sendt 09:14" />
      <Rad s={s} k={2} a="Lest" b="09:31 · Kari Moen" />
      <Rad s={s} k={3} a="Honorar" b="8 % av husleien" />
      <Rad s={s} k={4} a="Oppstart" b="0 kr · ingen bindingstid" />
      <Rad s={s} k={4} a="Signering" b="BankID · kan byttes til manuell" />
      <Strek />
      <div className="mt-auto flex items-center justify-between gap-3 rounded-[12px] px-3 py-2.5" style={{ background: ok ? FARGER.gronn.bg : 'rgba(21,19,15,0.04)', transition: `background 500ms ${EASE}`, ...vis(s, 4) }}>
        <span className="inline-flex items-center gap-2 text-[13px]" style={{ color: ok ? FARGER.gronn.tx : DIM }}>
          <span className="inline-grid h-4 w-4 place-items-center">
            <span className="col-start-1 row-start-1 h-4 w-4 rounded-full" style={{ boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.2)', opacity: ok ? 0 : 1, transition: `opacity 300ms ${EASE}` }} />
            <span className="col-start-1 row-start-1" style={{ opacity: ok ? 1 : 0, transform: ok ? 'none' : 'scale(0.5)', transition: `opacity 300ms ${EASE}, transform 420ms cubic-bezier(0.34, 1.45, 0.64, 1)` }}><Hake /></span>
          </span>
          {ok ? 'Akseptert med BankID' : 'Aksept med BankID'}
        </span>
        <span className="text-[12px] tabular-nums" style={{ color: SVAK }}>{ok ? 'Kari Moen · 10:02' : 'sendt til eieren'}</span>
      </div>
    </Vindu>
  );
}

function V03({ s }) {
  return (
    <Vindu tittel="Forvaltningsavtale · Kari Moen" status={s >= 2 ? 'Signert 21:05' : 'Til signering'} farge={s >= 2 ? 'gronn' : 'lilla'}>
      <Signatur s={s} k={1} navn="DigiHome" rolle="forvalter" tid="20:58" />
      <Signatur s={s} k={2} navn="Kari Moen" rolle="eier" tid="21:05" />
      <Strek />
      <Rad s={s} k={3} a="Bolig" b="Fjellveien 12 · Full forvaltning" />
      <div className="flex items-center justify-between rounded-[10px] px-3 py-2 text-[12.5px]" style={{ border: '1px dashed rgba(21,19,15,0.25)', color: SVAK, ...vis(s, 4) }}>
        <span>+ Neste bolig</span><span>tillegg signeres separat</span>
      </div>
      <Strek />
      <Rad s={s} k={5} a="Eier opprettet" b={<><Hake size={14} />i eierportalen</>} />
      <Rad s={s} k={6} a="Bolig opprettet" b={<><Hake size={14} />klar for annonse</>} />
    </Vindu>
  );
}

function V04({ s }) {
  return (
    <Vindu tittel="Annonse · Fjellveien 12" status={s >= 5 ? 'Publisert' : 'Utkast'} farge={s >= 5 ? 'gronn' : 'ink'}>
      <div className="relative h-[72px] overflow-hidden rounded-[10px]" style={{ background: 'linear-gradient(135deg, #DCD3C6 0%, #EFE9DF 50%, #C9CFD6 100%)', ...vis(s, 1) }}>
        <span className="absolute left-2 top-2"><Pille farge="lilla">Foto forbedret</Pille></span>
        <span className="absolute bottom-2 right-2 text-[10.5px]" style={{ color: 'rgba(21,19,15,0.5)' }}>1 av 14</span>
      </div>
      <p className="text-[14.5px] font-medium leading-[1.25]" style={{ color: T.ink, ...vis(s, 2) }}>Lys 3-roms med balkong mot vest</p>
      <p className="text-[12.5px] leading-[1.45]" style={{ color: DIM, ...vis(s, 3) }}><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: T.lilla }} />Nyoppusset bad, balkong mot vest, fem minutter til Bybanen. Skrevet av assistenten, godkjent av Jonas.</p>
      <div className="flex flex-wrap gap-1.5">
        <span style={vis(s, 4)}><Pille farge="gronn">FINN</Pille></span>
        <span style={vis(s, 5)}><Pille farge="gronn">Egen boligside</Pille></span>
      </div>
      <div className="mt-auto flex flex-col gap-1.5">
        <Boble s={s} k={6} fra="Interessent · fra annonsen">Er det parkering?</Boble>
        <Boble s={s} k={7} fra="Assistent" ai hoyre>Ja, én plass i garasjen, 800 kr i måneden.</Boble>
      </div>
    </Vindu>
  );
}

const SOKERE = [['Sander Vik', '27 år · fast inntekt'], ['Amina Said', '31 år · fast inntekt'], ['Jonas Berg', '24 år · student'], ['Mette Lund', '45 år · selvstendig']];
function V05({ s }) {
  return (
    <Vindu tittel="Visning · torsdag 17:00" status="6 påmeldt" farge="ink">
      {SOKERE.map(([n, m], i) => (
        <div key={n} className="flex items-center justify-between gap-3 rounded-[10px] px-2.5 py-2 text-[13px]" style={{ background: i === 0 && s >= 5 ? FARGER.lilla.bg : 'rgba(21,19,15,0.035)', transition: `background 500ms ${EASE}`, ...vis(s, i + 1) }}>
          <span className="min-w-0">
            <span className="block truncate" style={{ color: T.ink }}>{n}{i === 0 ? <span className="ml-2 text-[11px] font-medium" style={{ color: FARGER.lilla.tx, opacity: s >= 5 ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>Anbefalt</span> : null}</span>
            <span className="block text-[11.5px]" style={{ color: SVAK }}>{m}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-[11.5px]" style={{ color: DIM }}>
            <Hake size={14} />BankID <Hake size={14} />Kreditt
          </span>
        </div>
      ))}
      <p className="mt-auto pt-1 text-[12px]" style={{ color: SVAK, ...vis(s, 5) }}>Legitimert og kredittsjekket med samtykke. Valget er deres.</p>
    </Vindu>
  );
}

function V06({ s }) {
  return (
    <Vindu tittel="Leiekontrakt · Løkkeveien 14" status={s >= 6 ? 'Signert av begge' : 'Til signering'} farge={s >= 6 ? 'gronn' : 'lilla'}>
      <Rad s={s} k={1} a="Leietaker" b="Sander Vik" />
      <Rad s={s} k={2} a="Leietid" b="3 år · KPI-regulering hvert år" />
      <Rad s={s} k={3} a="Husleie" b="17 500 kr i måneden" sterk />
      <Rad s={s} k={4} a="Depositum" b="Keyhole · 52 500 kr" />
      <Strek />
      <Signatur s={s} k={5} navn="Hanne Nes" rolle="eier" tid="20:12" metode="BankID via Idura" />
      <Signatur s={s} k={6} navn="Sander Vik" rolle="leietaker" tid="20:41" metode="BankID via Idura" />
    </Vindu>
  );
}

const ROM = [['Stue', 6], ['Kjøkken', 5], ['Bad', 4], ['Soverom', 5], ['Gang', 2], ['Bod', 2]];
function V07({ s }) {
  return (
    <Vindu tittel="Overtakelse · Løkkeveien 14" status={s >= 7 ? 'Signert av begge' : 'Pågår'} farge={s >= 7 ? 'gronn' : 'ink'}>
      <div className="grid grid-cols-3 gap-1.5">
        {ROM.map(([r, n], i) => (
          <div key={r} className="rounded-[10px] px-2.5 py-2" style={{ background: 'rgba(21,19,15,0.04)', ...vis(s, Math.floor(i / 2) + 1) }}>
            <p className="text-[12.5px]" style={{ color: T.ink }}>{r}</p>
            <p className="text-[11px] tabular-nums" style={{ color: SVAK }}>{n} bilder</p>
          </div>
        ))}
      </div>
      <Strek />
      <Rad s={s} k={4} a="Nøkler" b={<><Hake size={14} />2 · kvittert</>} />
      <Rad s={s} k={5} a="Strøm" b="48 213 kWh · Fjordkraft" />
      <Rad s={s} k={6} a="Radon" b={<><Hake size={14} />dokumentert</>} />
      <div className="mt-auto flex items-center justify-between rounded-[12px] px-3 py-2.5 text-[13px]" style={{ background: FARGER.gronn.bg, color: FARGER.gronn.tx, ...vis(s, 7) }}>
        <span className="inline-flex items-center gap-2"><Hake />PDF signert av begge</span><span className="text-[12px]" style={{ color: SVAK }}>sendt til eier og leietaker</span>
      </div>
    </Vindu>
  );
}

function V08({ s }) {
  return (
    <Vindu tittel="Husleie juni · klientkonto" status="Avstemt 06:00" farge="gronn">
      <div className="flex items-baseline justify-between" style={vis(s, 1)}>
        <span className="text-[30px] tabular-nums" style={{ ...display, color: T.ink, letterSpacing: '-0.03em' }}><Tell til={2.78} vis={s >= 1} fmt={(n) => `${n.toFixed(2).replace('.', ',')} mill.`} /></span>
        <span className="text-[12.5px] tabular-nums" style={{ color: SVAK }}>{s >= 2 ? '211 av 214 betalt' : ''}</span>
      </div>
      <Stolpe s={s} k={2} del={211} av={214} />
      <Strek />
      <Rad s={s} k={3} a="Fakturert" b="214 · 1. juni" />
      <Rad s={s} k={4} a="Påminnelse" b="3 sendt · push og e-post" farge="gul" />
      <Rad s={s} k={5} a="Honorar trukket" b={`${tall(222400)} kr`} />
      <Rad s={s} k={6} a="Utbetalt" b={<><Hake size={14} />86 eiere · 3. juni</>} sterk />
      <Rad s={s} k={6} a="Regnskap" b="bilag til PowerOffice · automatisk" />
    </Vindu>
  );
}

function V09({ s }) {
  return (
    <Vindu tittel="Sak 4812 · Varmtvann" status={s >= 5 ? 'Bestilt' : s >= 4 ? 'Venter på eier' : 'Ny'} farge={s >= 5 ? 'gronn' : 'lilla'}>
      <Boble s={s} k={1} fra="Emma Lie · leietaker · Strandgaten 12">Ikke varmt vann siden i går. Bilde av berederen vedlagt.</Boble>
      <Rad s={s} k={2} a="Kategori" ai b="Rørlegger · frist 24 timer" />
      <Rad s={s} k={3} a="Leverandør" b="Bergen Rør AS · 6 200 kr" />
      <Rad s={s} k={4} a="Over grensen" b="5 000 kr → eieren spurt i appen" farge="gul" />
      <Strek />
      <div style={vis(s, 2)}><Steg liste={['Åpen', 'Leverandør', 'Eier', 'Løst']} aktiv={s >= 5 ? 3 : s >= 4 ? 2 : 1} farge="lilla" /></div>
      <div className="mt-auto flex items-center justify-between rounded-[12px] px-3 py-2.5 text-[13px]" style={{ background: FARGER.gronn.bg, color: FARGER.gronn.tx, ...vis(s, 5) }}>
        <span className="inline-flex items-center gap-2"><Hake />Kari Moen godkjente</span><span className="text-[12px]" style={{ color: SVAK }}>i appen · 13:05</span>
      </div>
    </Vindu>
  );
}

function V10({ s }) {
  return (
    <Vindu tittel="Oppgjør juni · Kari Moen" status={s >= 5 ? 'Til PowerOffice' : 'Klar'} farge={s >= 5 ? 'gronn' : 'ink'}>
      <Rad s={s} k={1} a="Husleie inn" b={`+ ${tall(17500)} kr`} />
      <Rad s={s} k={2} a="Honorar 8 %" b={`− ${tall(1400)} kr`} />
      <Rad s={s} k={3} a="Rørlegger · sak 4812" b={`− ${tall(6200)} kr`} />
      <Strek />
      <div className="flex items-baseline justify-between" style={vis(s, 4)}>
        <span className="text-[13px]" style={{ color: SVAK }}>Utbetalt 3. juni</span>
        <span className="text-[26px] tabular-nums" style={{ ...display, color: T.ink, letterSpacing: '-0.03em' }}><Tell til={9900} vis={s >= 4} fmt={(n) => `${tall(Math.round(n))} kr`} /></span>
      </div>
      <Strek />
      <Rad s={s} k={5} a="Bilag" b={<><Hake size={14} />3 · PowerOffice Go</>} />
      <Rad s={s} k={6} a="Eierportal" b="rapport lest 4. juni" />
    </Vindu>
  );
}

const TEAM = [['Jonas Haugland', 'forvalter', '1 venter', 'lilla'], ['Ida Berg', 'oppgjør', 'alt i orden', 'gronn'], ['DigiHome-assistenten', 'svarer leietakere, eiere og interessenter', 'svarer nå', 'lilla']];
function V11({ s }) {
  return (
    <Vindu tittel="Vest Utleie AS · i dag" status="Alt i orden" farge="gronn">
      {TEAM.map(([n, r, st, f], i) => (
        <div key={n} className="flex items-center justify-between gap-3 text-[13px]" style={vis(s, i + 1)}>
          <span className="inline-flex min-w-0 items-center gap-2">
            <span className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10.5px] font-medium" style={{ background: i === 2 ? FARGER.lilla.bg : 'rgba(21,19,15,0.07)', color: i === 2 ? FARGER.lilla.tx : T.ink }}>{i === 2 ? 'AI' : n.split(' ').map((x) => x[0]).join('')}</span>
            <span className="truncate" style={{ color: T.ink }}>{n} <span style={{ color: SVAK }}>· {r}</span></span>
          </span>
          <Pille farge={f}>{st}</Pille>
        </div>
      ))}
      <Strek />
      <Rad s={s} k={4} a="Portaler" b="86 eiere · 214 leietakere · push" />
      <Strek />
      <div className="flex flex-col gap-1 text-[12px]" style={{ color: DIM }}>
        <p className="flex justify-between gap-3" style={vis(s, 5)}><span>Jonas valgte leietaker · Løkkeveien 14</span><span className="tabular-nums" style={{ color: SVAK }}>14:20</span></p>
        <p className="flex justify-between gap-3" style={vis(s, 6)}><span>Kari Moen godkjente rørlegger · appen</span><span className="tabular-nums" style={{ color: SVAK }}>13:05</span></p>
      </div>
    </Vindu>
  );
}

/* Rekkefølgen følger stoppene i FunksjonerSeksjon. steg = antall trinn i vignetten. */
export const VIGNETTER = [
  { V: V01, steg: 6 }, { V: V02, steg: 5 }, { V: V03, steg: 6 }, { V: V04, steg: 7 }, { V: V05, steg: 5 }, { V: V06, steg: 6 },
  { V: V07, steg: 7 }, { V: V08, steg: 6 }, { V: V09, steg: 5 }, { V: V10, steg: 6 }, { V: V11, steg: 6 },
];
