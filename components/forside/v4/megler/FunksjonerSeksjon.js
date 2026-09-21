'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EASE, T, display, useRedusert, useSmal, useSynlig } from '../motion';
import { VIGNETTER, useSteg } from './FunksjonerVignetter';

/* ---------------------------------------------------------------------------
   FunksjonerSeksjon — «Alt systemet gjør.» (#funksjoner)

   Produktet vist stopp for stopp, ikke et ark med brikker:
   · Skinnen (desktop): én linje med elleve stopp. Linjen tegnes når
     seksjonen kommer i bildet, stoppene popper inn etter hverandre. En
     lilla løper glir langs linjen til det aktive stoppet; strekningen bak
     er fylt, og strekningen fram til neste fylles på 7 s — så går det
     videre av seg selv, til du tar over. Hover holder. Piltaster virker.
     På mobil er skinnen en rullbar rad, og panelet har pilknapper.
   · Panelet bytter i retning: det gamle glir ut oppover, det nye inn
     nedenfra (eller omvendt når du går bakover). Til venstre stoppet, én
     setning om hva systemet gjør selv, brikkene og én linje om hva dere
     gjør. Til høyre vinduet fra produktet, som spilles i trinn: rader
     kommer, haker tegnes, tall telles, assistenten skriver før den svarer.
     Vinduet vipper svakt etter pekeren (desktop) — det er et objekt, ikke
     et bilde.
   · Søk demper brikker som ikke treffer, viser hvilke stopp som har treff,
     og hopper til det første. Null treff → vei til demoen.
   · «Se alle på ett ark» åpner hele spesifikasjonen under panelet.

   Innholdet er hentet fra produktrepoet (backend/routes, services), ikke
   fra markedstekst. Kun opacity/transform i bevegelsen.
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';
const AUTO = 7000;
const FJAER = 'cubic-bezier(0.34, 1.3, 0.64, 1)';

const ai = (t) => ({ t, ai: true });
const kommer = (t) => ({ t, kommer: true });

/* [stopp, hva systemet gjør selv, hva dere gjør, brikker, aksent] */
const STOPP = [
  ['Henvendelse', 'Henter boligdata fra Kartverket og eier fra Infotorg, og regner ut leieestimat før dere har ringt tilbake.', 'Befaringen.',
    ['Salgstavle med stadier', 'Kontaktskjema med e-postverifisering', 'Boligdata fra Kartverket', 'Eieroppslag fra Infotorg', ai('Leieestimat'), 'Befaring synkronisert med Outlook', 'Notater og oppfølging per henvendelse'], 'lilla'],
  ['Tilbud', 'Tilbudet sendes med versjonsnummer, og dere ser når det blir lest. Eieren aksepterer med BankID.', 'Setter honoraret.',
    ['Tilbud med versjoner', 'Lest-status', 'Aksept med BankID', 'Manuell aksept', 'Bytte av signeringsmetode', kommer('Deres logo og farger')], 'ink'],
  ['Oppdrag', 'Forvaltningsavtalen signeres med BankID. Eier og bolig ligger i systemet samme kveld.', 'Velger modell per bolig.',
    ['Forvaltningsavtale med BankID', 'Tillegg per ny bolig', 'Onboarding av eier og bolig', 'Bilag ved bytte av modell', 'Selvforvaltning eller full forvaltning per bolig'], 'ink'],
  ['Annonse', 'Skriver teksten, forbedrer bildene, publiserer på FINN og egen boligside, og svarer interessentene i chatten.', 'Godkjenner teksten.',
    ['Publisering på FINN', 'Import fra FINN', ai('Annonsetekst skrevet av AI'), ai('Fotoforbedring'), 'Egen boligside per bolig', ai('Chat i annonsen'), 'Airbnb, Booking og VRBO via Channex', 'Guesty'], 'lilla'],
  ['Visning', 'Avtaler visningen, legitimerer søkerne med BankID og kjører kredittsjekk med samtykke.', 'Velger leietaker.',
    ['Visningsbooking, tre typer', 'Legitimering med BankID', 'Kredittsjekk med samtykke', 'Søknader samlet per bolig', 'Interessenter fra FINN og egen side'], 'ink'],
  ['Kontrakt', 'Setter opp kontrakten, oppretter depositumskontoen og sender til signering med BankID.', 'Godkjenner vilkårene.',
    ['Kontraktbygger', 'BankID via Idura', 'Signering via Posten', 'Signering på SMS', 'Depositumskonto hos Keyhole', 'Garanti fra Lea Bank eller Tryg', 'KPI-regulering', 'Tillegg og endringer'], 'ink'],
  ['Innflytting', 'Overtakelsesprotokoll rom for rom med bilder, strømmåler og nøkler. Signert PDF til begge parter.', 'Går gjennom boligen.',
    ['Overtakelsesprotokoll', 'Rom for rom med bilder', 'Nøkler', 'Strømmåler og leverandør', 'Radon', 'PDF signert av begge'], 'ink'],
  ['Husleie', 'Fakturerer, følger opp, purrer, trekker honorar og betaler ut til eier fra klientkonto.', 'Ingenting – før noen ikke betaler.',
    ['Egen fakturamotor', 'Faktura til leietaker', 'Husleie inn på klientkonto', 'Honorar trukket per eier', 'Utbetaling til eier', 'Påminnelse på push og e-post', 'Purring', 'Overføring til PowerOffice'], 'gronn'],
  ['Saker', 'Lager sak av meldingen, setter kategori og frist, foreslår leverandør og ber eier om godkjenning over grensen.', 'Velger håndverker.',
    [ai('Sak fra melding'), ai('Kategori og frist satt av AI'), 'Status fra åpen til løst', 'Leverandørregister med priser', 'Venter på leverandør eller godkjenning', 'Eiergodkjenning over grense', ai('Bilder vurdert av AI'), ai('Kvitteringer lest av AI')], 'lilla'],
  ['Oppgjør', 'Oppgjørsrapport per eier med bilag, klar for PowerOffice Go eller Fiken.', 'Ser over før det sendes.',
    ['Oppgjørsrapport per eier', 'Honorar etter avtale', 'PowerOffice Go', 'Fiken', 'Bilag per eier og bolig', kommer('Tripletex')], 'gronn'],
  ['Plattform', 'Eier- og leietakerportal, mobilapp med push, full logg og en assistent som svarer i chatten.', 'Bestemmer hvem som ser hva.',
    ['Eierportal', 'Leietakerportal', 'Roller og rettigheter', 'Full logg', 'Driftssenter og oversikt', 'Mobilapp med push', 'Microsoft 365', ai('Assistent i chat med leietaker, eier og interessent'), 'Kunnskap, tilbakemelding og analyse for assistenten', 'Nyhetsbrev'], 'lilla'],
];
const N = STOPP.length;

const HURTIG = ['BankID', 'AI', 'Klientkonto', 'FINN', 'Regnskap', 'Eier'];

const normal = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const tekst = (b) => (typeof b === 'string' ? b : b.t);
const erAi = (b) => typeof b !== 'string' && !!b.ai;
const erKommer = (b) => typeof b !== 'string' && !!b.kommer;

const SYNONYM = { ai: ['ai'], regnskap: ['poweroffice', 'fiken', 'tripletex', 'bilag'], eier: ['eier', 'klientkonto', 'oppgjor', 'honorar'] };
function treff(b, stopp, n) {
  if (!n) return true;
  const t = normal(tekst(b));
  if (t.includes(n) || normal(stopp).includes(n)) return true;
  if (n === 'ai' && erAi(b)) return true;
  const syn = SYNONYM[n];
  return !!syn && syn.some((x) => t.includes(x));
}
const antallTreff = (i, n) => STOPP[i][3].filter((b) => treff(b, STOPP[i][0], n)).length;
const nr = (i) => String(i + 1).padStart(2, '0');
/* Stoppets plass på skinnen (midt i sin kolonne) */
const pos = (i) => ((i + 0.5) / N) * 100;

function Marker({ t, n }) {
  if (!n) return t;
  const i = normal(t).indexOf(n);
  if (i < 0) return t;
  return <>{t.slice(0, i)}<mark style={{ background: 'transparent', color: 'inherit', textDecoration: 'underline', textDecorationColor: T.lilla, textDecorationThickness: 2, textUnderlineOffset: 3 }}>{t.slice(i, i + n.length)}</mark>{t.slice(i + n.length)}</>;
}

/* Tall som telles opp når de kommer i bildet */
function Tell({ til, vis }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!vis) { setV(0); return undefined; }
    let raf; const t0 = performance.now(); const dur = 900;
    const tick = (t) => { const p = Math.min(1, (t - t0) / dur); setV(Math.round(til * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [vis, til]);
  return <>{v}</>;
}

function Brikke({ b, n, stopp, i, liten }) {
  const er = treff(b, stopp, n);
  const k = erKommer(b);
  return (
    <li
      className={`inline-flex items-center gap-2 rounded-full ${liten ? 'px-2.5 py-1 text-[12.5px]' : 'px-3 py-1.5 text-[13.5px]'} leading-[1.3] transition-[transform,box-shadow,opacity] duration-300 hover:-translate-y-px`}
      style={{
        background: k ? 'transparent' : '#FFFFFF',
        color: k ? SVAK : T.ink,
        boxShadow: k ? 'none' : `inset 0 0 0 1px ${HAIR}, 0 1px 0 rgba(21,19,15,0.03)`,
        border: k ? '1px dashed rgba(21,19,15,0.28)' : '1px solid transparent',
        opacity: er ? 1 : 0.22,
        animation: `v4-steg-inn 460ms ${EASE} ${120 + i * 40}ms both`,
      }}
      data-treff={er ? '1' : '0'}
    >
      {erAi(b) ? <span aria-label="Språkmodell" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} /> : null}
      <span><Marker t={tekst(b)} n={n} /></span>
      {k ? <span className="text-[10.5px] uppercase tracking-[0.08em]" style={{ color: SVAK }}>kommer</span> : null}
    </li>
  );
}

/* Vinduet fra produktet — spilles i trinn mens det er aktivt */
function Vignett({ i, aktiv }) {
  const { V, steg } = VIGNETTER[i];
  const s = useSteg(aktiv, steg, 460);
  return <V s={s} />;
}

/* Overgang mellom stopp: det gamle glir ut, det nye inn — i retningen man går. Framover forbi siste = framover. */
function useOvergang(aktiv) {
  const [lag, setLag] = useState({ naa: aktiv, forrige: null, retning: 1 });
  useEffect(() => {
    setLag((l) => (l.naa === aktiv ? l : { naa: aktiv, forrige: l.naa, retning: (aktiv === 0 && l.naa === N - 1) || (aktiv > l.naa && !(aktiv === N - 1 && l.naa === 0)) ? 1 : -1 }));
    const t = window.setTimeout(() => setLag((l) => ({ ...l, forrige: null })), 480);
    return () => window.clearTimeout(t);
  }, [aktiv]);
  return lag;
}

/* To lag i samme rute: det som går ut og det som kommer inn. Stabile nøkler per stopp så vignetten beholder trinnene sine mens den glir ut. */
function Lag({ lag, render }) {
  const liste = [];
  if (lag.forrige != null) liste.push({ i: lag.forrige, ut: true });
  liste.push({ i: lag.naa, ut: false });
  return (
    <div className="grid">
      {liste.map(({ i, ut }) => (
        <div key={`s-${i}`} className="col-start-1 row-start-1 min-w-0" style={{ '--dir': lag.retning, animation: ut ? `v4-panel-ut 380ms ${EASE} both` : `v4-panel-inn 560ms ${EASE} both`, pointerEvents: ut ? 'none' : 'auto' }} aria-hidden={ut || undefined}>
          {render(i, ut)}
        </div>
      ))}
    </div>
  );
}

function PilKnapp({ retning, onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-[background-color,transform] duration-200 hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}`, color: T.ink }} data-testid={`v4m-funksjoner-${retning > 0 ? 'neste' : 'forrige'}`}>
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: retning > 0 ? 'none' : 'rotate(180deg)' }}><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

export default function FunksjonerSeksjon() {
  const ref = useRef(null);
  const panelRef = useRef(null);
  const rammeRef = useRef(null);
  const glansRef = useRef(null);
  const synlig = useSynlig(ref, 0.08);
  const panelSynlig = useSynlig(panelRef, 0.3);
  const redusert = useRedusert();
  const smal = useSmal();
  const [q, setQ] = useState('');
  const [aktiv, setAktiv] = useState(0);
  const [tattOver, setTattOver] = useState(false);   // brukeren har valgt selv → ingen automatikk
  const [holder, setHolder] = useState(false);       // pekeren er over panelet → fremdriften står
  const [runde, setRunde] = useState(0);
  const [alle, setAlle] = useState(false);
  const barRef = useRef(null);
  const lag = useOvergang(aktiv);

  const n = normal(q.trim());
  const total = useMemo(() => STOPP.reduce((a, s) => a + s[3].length, 0), []);
  const antallAi = useMemo(() => STOPP.reduce((a, s) => a + s[3].filter(erAi).length, 0), []);
  const treffPer = useMemo(() => STOPP.map((_, i) => antallTreff(i, n)), [n]);
  const antall = n ? treffPer.reduce((a, b) => a + b, 0) : total;
  const stoppMedTreff = n ? treffPer.map((t, i) => (t ? i : -1)).filter((i) => i >= 0) : [];

  /* Automatikk: går til neste stopp hvert 7. sekund til du tar over. Står når pekeren er over panelet eller ved søk. */
  const auto = !tattOver && !n && !redusert;
  const kjorer = auto && panelSynlig && !holder;
  useEffect(() => {
    if (!kjorer) return undefined;
    const t = window.setTimeout(() => setAktiv((a) => (a + 1) % N), AUTO);
    return () => window.clearTimeout(t);
  }, [kjorer, aktiv, runde]);
  /* Fremdriften i skinnen starter på nytt sammen med klokken når panelet kommer i bildet igjen */
  useEffect(() => { if (panelSynlig) setRunde((r) => r + 1); }, [panelSynlig]);

  const velg = useCallback((i) => { setAktiv(((i % N) + N) % N); setTattOver(true); }, []);
  const tast = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); velg(aktiv + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); velg(aktiv - 1); }
  };

  /* Søk: hopp til første stopp med treff når det aktive ikke har noen */
  useEffect(() => {
    if (!n) return;
    if (treffPer[aktiv]) return;
    const f = treffPer.findIndex((t) => t > 0);
    if (f >= 0) setAktiv(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  /* Mobil: rull skinnen så det aktive stoppet står midt i */
  useEffect(() => {
    const bar = barRef.current;
    if (!smal || !bar) return;
    const el = bar.children[aktiv];
    if (!el) return;
    bar.scrollTo({ left: el.offsetLeft - bar.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [aktiv, smal]);

  /* Vinduet vipper svakt etter pekeren (bare mus, bare desktop) — rett på DOM, ingen re-render */
  const vipp = useCallback((e) => {
    const el = rammeRef.current; const glans = glansRef.current;
    if (!el || smal || redusert || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; const py = (e.clientY - r.top) / r.height;
    el.style.transition = 'transform 140ms linear';
    el.style.transform = `perspective(1400px) rotateX(${((0.5 - py) * 4).toFixed(2)}deg) rotateY(${((px - 0.5) * 5).toFixed(2)}deg)`;
    if (glans) { glans.style.opacity = '1'; glans.style.background = `radial-gradient(420px circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(255,255,255,0.55), rgba(255,255,255,0) 60%)`; }
  }, [smal, redusert]);
  const rett = useCallback(() => {
    const el = rammeRef.current; const glans = glansRef.current;
    if (!el) return;
    el.style.transition = `transform 800ms ${EASE}`;
    el.style.transform = 'perspective(1400px) rotateX(0deg) rotateY(0deg)';
    if (glans) glans.style.opacity = '0';
  }, []);

  const inn = (i, y = 14) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 80}ms, transform 800ms ${EASE} ${i * 80}ms` });
  const aksent = STOPP[aktiv][4];
  const GLOD = { lilla: 'rgba(212,150,255,0.28)', gronn: 'rgba(31,157,85,0.14)', ink: 'rgba(21,19,15,0.06)' };

  return (
    <section id="funksjoner" ref={ref} className="relative scroll-mt-[72px] lg:scroll-mt-[64px]" style={{ background: T.flate, color: T.ink }} data-testid="v4m-funksjoner">
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
              Elleve stopp, fra første henvendelse til oppgjør. Vist som stikkord og skjermbilder fra systemet.
            </p>
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[13.5px]" style={{ color: SVAK }} data-testid="v4m-funksjoner-tall">
              <div className="flex items-baseline gap-2"><dt className="sr-only">Funksjoner</dt><dd><span className="text-[26px] tabular-nums" style={{ ...display, color: T.ink }}><Tell til={total} vis={synlig} /></span> funksjoner</dd></div>
              <div className="flex items-baseline gap-2"><dt className="sr-only">Med språkmodell</dt><dd className="inline-flex items-baseline gap-2"><span className="text-[26px] tabular-nums" style={{ ...display, color: T.ink }}><Tell til={antallAi} vis={synlig} /></span> <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />med språkmodell</span></dd></div>
              <div className="flex items-baseline gap-2"><dt className="sr-only">Stopp</dt><dd><span className="text-[26px] tabular-nums" style={{ ...display, color: T.ink }}><Tell til={N} vis={synlig} /></span> stopp</dd></div>
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
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søk, for eksempel KPI, Keyhole eller purring" className="h-12 w-full rounded-full pl-11 pr-16 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_2px_rgba(212,150,255,0.7)]" style={{ background: '#FFFFFF', color: T.ink, boxShadow: `inset 0 0 0 1px ${HAIR}` }} data-testid="v4m-funksjoner-sok" />
              {q ? <button type="button" onClick={() => setQ('')} aria-label="Tøm søk" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-[12px]" style={{ color: DIM, background: 'rgba(21,19,15,0.05)' }} data-testid="v4m-funksjoner-tom">Tøm</button> : null}
            </label>
            <p className="text-[13.5px] tabular-nums" style={{ color: n ? T.ink : SVAK }} data-testid="v4m-funksjoner-antall" aria-live="polite">{n ? `${antall} av ${total} treff${stoppMedTreff.length ? ` · ${stoppMedTreff.length} stopp` : ''}` : ''}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]" style={{ color: SVAK }}>
            <span className="mr-1">Mange spør om:</span>
            {HURTIG.map((h) => {
              const er = normal(h) === n;
              return <button key={h} type="button" onClick={() => setQ(er ? '' : h)} className="rounded-full px-2.5 py-1 transition-colors" style={{ background: er ? T.ink : 'rgba(21,19,15,0.05)', color: er ? '#F4F1EA' : DIM }} data-testid={`v4m-funksjoner-hurtig-${normal(h)}`}>{h}</button>;
            })}
          </div>
        </div>

        {/* Skinnen: elleve stopp på én linje */}
        <nav aria-label="Stoppene" className="mt-12 lg:mt-16" style={inn(4, 18)} onKeyDown={tast} data-testid="v4m-funksjoner-indeks">
          {/* Desktop: linjen, løperen og stoppene */}
          <div className="relative hidden lg:block" style={{ height: 54 }}>
            {/* Linjen tegnes fra venstre */}
            <span aria-hidden="true" className="absolute top-[6px] h-px origin-left" style={{ left: `${pos(0)}%`, right: `${100 - pos(N - 1)}%`, background: 'rgba(21,19,15,0.14)', transform: synlig ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 1100ms ${EASE} 150ms` }} />
            {/* Strekningen bak det aktive stoppet er fylt */}
            <span aria-hidden="true" className="absolute top-[6px] h-px" style={{ left: `${pos(0)}%`, width: `${Math.max(0, pos(aktiv) - pos(0))}%`, background: 'rgba(21,19,15,0.55)', transition: `width 700ms ${FJAER}`, opacity: synlig ? 1 : 0 }} />
            {/* Fremdriften fram til neste: fylles på 7 s */}
            {auto && aktiv < N - 1 ? <span key={`${aktiv}-${runde}`} aria-hidden="true" className="absolute top-[6px] h-px origin-left" style={{ left: `${pos(aktiv)}%`, width: `${pos(1) - pos(0)}%`, background: T.lilla, animation: `v4-fremdrift ${AUTO}ms linear both`, animationPlayState: kjorer ? 'running' : 'paused' }} data-testid="v4m-funksjoner-fremdrift" /> : null}
            {/* Løperen glir til det aktive stoppet */}
            <span aria-hidden="true" className="absolute top-0 h-[13px] w-[13px] -translate-x-1/2 rounded-full" style={{ left: `${pos(aktiv)}%`, background: T.lilla, boxShadow: `0 0 0 3px ${T.flate}, 0 0 0 4.5px rgba(212,150,255,0.45)`, transition: `left 700ms ${FJAER}, transform 300ms ${EASE}`, opacity: synlig ? 1 : 0 }} data-testid="v4m-funksjoner-loper" />
            <ol className="grid grid-cols-11">
              {STOPP.map(([stopp, , , b], i) => {
                const er = i === aktiv;
                const her = n ? treffPer[i] : b.length;
                const dempet = n && !her;
                const passert = i < aktiv;
                return (
                  <li key={stopp} className="relative min-w-0">
                    <button type="button" onClick={() => velg(i)} aria-current={er ? 'true' : undefined} className="group flex w-full flex-col items-center gap-2 pt-0 text-center focus-visible:outline-none" data-testid={`v4m-funksjoner-indeks-${i}`}>
                      {/* Stoppet på linjen — popper inn etter hverandre */}
                      <span className="relative block h-[13px] w-[13px]">
                        <span className="absolute inset-[3px] rounded-full" style={{ background: passert ? 'rgba(21,19,15,0.55)' : dempet ? 'rgba(21,19,15,0.15)' : 'rgba(21,19,15,0.3)', boxShadow: `0 0 0 2.5px ${T.flate}`, transform: synlig ? (er ? 'scale(0)' : 'scale(1)') : 'scale(0)', transition: `transform 500ms ${FJAER} ${synlig ? 200 + i * 55 : 0}ms, background 400ms ${EASE}` }} />
                        {/* Fokusring/hover */}
                        <span className="absolute -inset-1 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" style={{ boxShadow: `inset 0 0 0 1px rgba(21,19,15,0.25)` }} />
                      </span>
                      <span className="flex max-w-full items-baseline justify-center gap-1.5 px-1 text-[13px] transition-colors duration-300" style={{ color: er ? T.ink : dempet ? 'rgba(21,19,15,0.28)' : DIM, opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(6px)', transition: `opacity 500ms ${EASE} ${260 + i * 55}ms, transform 500ms ${EASE} ${260 + i * 55}ms, color 300ms ${EASE}` }}>
                        <span className="text-[11px] tabular-nums" style={{ color: er ? T.lilla : 'rgba(21,19,15,0.35)' }}>{nr(i)}</span>
                        <span className={`truncate ${er ? 'font-medium' : ''}`}>{stopp}</span>
                        {n ? <span className="text-[11px] tabular-nums" style={{ color: her ? T.ink : 'rgba(21,19,15,0.3)' }}>{her}</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          {/* Mobil/tablet: rullbar rad */}
          <ol ref={barRef} className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 lg:hidden" style={{ scrollbarWidth: 'none' }}>
            {STOPP.map(([stopp, , , b], i) => {
              const er = i === aktiv;
              const her = n ? treffPer[i] : b.length;
              const dempet = n && !her;
              return (
                <li key={stopp} className="shrink-0">
                  <button type="button" onClick={() => velg(i)} aria-current={er ? 'true' : undefined} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors duration-300" style={{ background: er ? T.ink : 'rgba(21,19,15,0.05)', color: er ? '#F4F1EA' : dempet ? 'rgba(21,19,15,0.3)' : DIM }} data-testid={`v4m-funksjoner-indeks-m-${i}`}>
                    <span className="text-[11px] tabular-nums" style={{ color: er ? T.lilla : 'rgba(21,19,15,0.35)' }}>{nr(i)}</span>
                    <span className={er ? 'font-medium' : ''}>{stopp}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Panelet: stoppet + brikkene til venstre, vinduet fra produktet til høyre */}
        <div
          ref={panelRef}
          className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-12 lg:gap-10"
          style={inn(5, 18)}
          onPointerEnter={() => setHolder(true)}
          onPointerLeave={() => { setHolder(false); setRunde((r) => r + 1); }}
          data-testid="v4m-funksjoner-panel"
          data-aktiv={aktiv}
        >
          <div className="min-w-0 lg:col-span-5">
            <Lag lag={lag} render={(i) => {
              const [navn, gjor, dere, brikker] = STOPP[i];
              return (
                <div>
                  <p className="text-[12.5px] tabular-nums" style={{ color: T.lilla }}>{nr(i)} <span style={{ color: SVAK }}>av {N}</span></p>
                  <h3 className="mt-2 text-[34px] sm:text-[40px]" style={{ ...display, color: T.ink }} data-testid={i === aktiv ? 'v4m-funksjoner-stopp' : undefined}>{navn}</h3>
                  <p className="mt-4 max-w-[44ch] text-[16.5px] leading-[1.5] sm:text-[17.5px]" style={{ color: T.ink }}>{gjor}</p>
                  <ul className="mt-5 flex flex-wrap gap-2" data-testid={i === aktiv ? 'v4m-funksjoner-brikker' : undefined}>
                    {brikker.map((b, j) => <Brikke key={tekst(b)} b={b} n={n} stopp={navn} i={j} liten />)}
                  </ul>
                  <p className="mt-5 flex items-center gap-2.5 text-[14px]" style={{ color: DIM }}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.ink }} />
                    <span><span className="font-medium" style={{ color: T.ink }}>Dere:</span> {dere}</span>
                  </p>
                  {n && stoppMedTreff.length > 1 && i === aktiv ? (
                    <p className="mt-5 flex flex-wrap items-center gap-1.5 text-[12.5px]" style={{ color: SVAK }} data-testid="v4m-funksjoner-treffstopp">
                      <span className="mr-1">Treff også i:</span>
                      {stoppMedTreff.filter((x) => x !== aktiv).map((x) => (
                        <button key={x} type="button" onClick={() => velg(x)} className="rounded-full px-2.5 py-1 transition-colors hover:bg-white" style={{ background: 'rgba(21,19,15,0.05)', color: DIM }}>{STOPP[x][0]} <span className="tabular-nums" style={{ color: 'rgba(21,19,15,0.4)' }}>{treffPer[x]}</span></button>
                      ))}
                    </p>
                  ) : null}
                </div>
              );
            }} />
          </div>

          <div className="relative min-w-0 lg:col-span-7">
            {/* Gløden bak vinduet skifter med stoppet */}
            {Object.entries(GLOD).map(([k, v]) => (
              <div key={k} aria-hidden="true" className="pointer-events-none absolute -inset-4 rounded-[36px] sm:-inset-8" style={{ background: `radial-gradient(60% 55% at 50% 45%, ${v} 0%, rgba(0,0,0,0) 72%)`, opacity: aksent === k ? 1 : 0, transition: `opacity 900ms ${EASE}` }} />
            ))}
            <div ref={rammeRef} onPointerMove={vipp} onPointerLeave={rett} className="relative rounded-[22px] p-2.5 sm:p-3" style={{ background: PAPIR, boxShadow: `inset 0 0 0 1px ${HAIR}, 0 40px 90px -60px rgba(21,19,15,0.35)`, transformStyle: 'preserve-3d', willChange: 'transform' }} data-testid="v4m-funksjoner-ramme">
              {/* Glansen følger pekeren */}
              <div ref={glansRef} aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[22px]" style={{ opacity: 0, transition: `opacity 500ms ${EASE}`, mixBlendMode: 'soft-light' }} />
              <div className="flex items-center justify-between gap-4 px-2.5 pb-2.5 pt-1 text-[12px]" style={{ color: SVAK }}>
                <span className="font-medium"><span className="sm:hidden">I systemet</span><span className="hidden sm:inline">Slik ser det ut i systemet</span></span>
                <span className="inline-flex items-center gap-2.5">
                  <span className="hidden items-center gap-1.5 sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />språkmodell</span>
                  <span key={aktiv} className="whitespace-nowrap tabular-nums" style={{ animation: `v4-steg-inn 400ms ${EASE} both` }}>{nr(aktiv)} · {STOPP[aktiv][0]}</span>
                  <span className="inline-flex items-center gap-1"><PilKnapp retning={-1} onClick={() => velg(aktiv - 1)} label="Forrige stopp" /><PilKnapp retning={1} onClick={() => velg(aktiv + 1)} label="Neste stopp" /></span>
                </span>
              </div>
              <div className="min-h-[330px] sm:min-h-[350px]" data-testid="v4m-funksjoner-vignett" data-nr={aktiv}>
                <Lag lag={lag} render={(i, ut) => <Vignett i={i} aktiv={ut || panelSynlig || redusert} />} />
              </div>
            </div>
          </div>
        </div>

        {/* Null treff */}
        {n && antall === 0 ? (
          <div className="mt-8 rounded-[16px] px-6 py-6" style={{ background: '#FFFFFF', boxShadow: `inset 0 0 0 1px ${HAIR}` }} data-testid="v4m-funksjoner-null">
            <p className="text-[17px] font-medium" style={{ color: T.ink }}>Ingen treff på «{q.trim()}».</p>
            <p className="mt-1.5 text-[15px]" style={{ color: DIM }}>Spør oss i demoen. Finnes det ikke, sier vi det.</p>
            <a href="#demo" className="mt-4 inline-flex items-center rounded-full px-4 py-2 text-[14px] font-medium" style={{ background: T.ink, color: '#F4F1EA' }} data-testid="v4m-funksjoner-null-demo">Book en demo</a>
          </div>
        ) : null}

        {/* Hele arket — alle brikkene på ett sted */}
        <div className="mt-10 lg:mt-14" style={inn(6)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setAlle((a) => !a)} aria-expanded={alle} aria-controls="v4m-funksjoner-ark" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium transition-colors" style={{ background: alle ? T.ink : '#FFFFFF', color: alle ? '#F4F1EA' : T.ink, boxShadow: alle ? 'none' : `inset 0 0 0 1px ${HAIR}` }} data-testid="v4m-funksjoner-alle">
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: alle ? 'rotate(180deg)' : 'none', transition: `transform 300ms ${EASE}` }}><path d="M2 4.5l4 3 4-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {alle ? 'Skjul arket' : n ? `Se alle ${antall} treff på ett ark` : `Se alle ${total} på ett ark`}
            </button>
            <p className="text-[13.5px]" style={{ color: SVAK }} data-testid="v4m-funksjoner-note">Alt som ikke er merket «kommer», finnes i systemet i dag og kan vises i en demo.</p>
          </div>
          <div id="v4m-funksjoner-ark" className="grid" style={{ gridTemplateRows: alle ? '1fr' : '0fr', transition: `grid-template-rows 600ms ${EASE}` }}>
            <div className="overflow-hidden">
              <div className="mt-5 rounded-[22px]" style={{ background: PAPIR, boxShadow: `inset 0 0 0 1px ${HAIR}`, opacity: alle ? 1 : 0, transform: alle ? 'none' : 'translateY(-8px)', transition: `opacity 400ms ${EASE} ${alle ? 150 : 0}ms, transform 500ms ${EASE} ${alle ? 150 : 0}ms` }}>
                <div className="flex items-center justify-between gap-4 px-5 py-3.5 text-[12px] sm:px-7" style={{ color: SVAK, boxShadow: `inset 0 -1px 0 ${HAIR}` }}>
                  <span className="font-medium">Spesifikasjon · DigiHome for utleiemeglere</span>
                  <span className="tabular-nums">Hentet fra produktet · juni 2025</span>
                </div>
                <ol data-testid="v4m-funksjoner-ark">
                  {alle ? STOPP.map(([stopp, , , b], i) => {
                    const her = b.filter((x) => treff(x, stopp, n)).length;
                    return (
                      <li key={stopp} className={`px-5 py-5 transition-opacity duration-300 sm:px-7 ${i === N - 1 ? '' : 'border-b'}`} style={{ borderColor: HAIR, opacity: her ? 1 : 0.3 }} data-testid={`v4m-funksjoner-${i}`} data-treff={her}>
                        <div className="flex items-baseline justify-between gap-4">
                          <button type="button" onClick={() => { velg(i); panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="flex items-baseline gap-3 text-left text-[20px] transition-colors hover:underline lg:text-[22px]" style={{ ...display, color: T.ink, lineHeight: 1.05, textDecorationColor: T.lilla, textUnderlineOffset: 6 }}>
                            <span className="text-[12px] tabular-nums" style={{ color: T.lilla }}>{nr(i)}</span>
                            {stopp}
                          </button>
                          <span className="text-[12.5px] tabular-nums" style={{ color: SVAK }}>{n ? `${her} av ${b.length}` : b.length}</span>
                        </div>
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {b.map((x, j) => <Brikke key={tekst(x)} b={x} n={n} stopp={stopp} i={Math.min(j, 8)} liten />)}
                        </ul>
                      </li>
                    );
                  }) : null}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
