'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EASE, T, display, tall, useRedusert, useSekvens, useSmal, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   AarScene — «ett leieår med boligen på autopilot». Boligeiersidens hero-scene, i full bredde.

   Forsiden viser én kveld. Her er tidsskalaen ett helt leieår — for spørsmålet en boligeier egentlig har er:
   «hvor mye jobb blir dette for meg over tid?» Svaret er scenen: boligen står der, tolv måneder går, husleien
   kommer inn — og tre beslutninger var dine. Resten var rutine, og rutinen gjorde systemet.

   Ingen dashboard, ingen kort med lister. Én film:
   · Boligen (fasaden om kvelden) fyller hele flaten. Kameraet glir umerkelig nærmere gjennom året.
   · Nederst: året som ett instrument — en hårlinje med tolv måneder og en lilla spillehode som glir fra måned til
     måned. Månedene som passerer får en prikk på linjen: grønn = husleien kom, lilla = du bestemte.
   · Over linjen: det som skjedde, én setning om gangen i display — ord for ord ut av uskarpheten — med én stille
     linje under. Aldri to hendelser samtidig.
   · November: varmtvannet. Året STOPPER. Ett glasskort venter på deg — «Godkjenn». Idet du trykker, går natten over
     i morgen (samme fasade, torsdag 09:00) og året fortsetter. Har du ikke vært i scenen, trykker historien selv etter
     en stund, så filmen alltid fullføres.
   · Slutt: «Tolv måneder. Tre beslutninger var dine.» Spill igjen.

   `eiendom` (fra adressefeltet) bytter adresse og spiller fra første bilde. Redusert bevegelse → sluttbildet.
   Kun opacity/transform i bevegelse (+ én myk crossfade mellom to bilder).
--------------------------------------------------------------------------- */

const MND = ['aug', 'sep', 'okt', 'nov', 'des', 'jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul'];

const FASER = [
  { navn: 'inn', ms: 1100 },      // boligen står — adressen kommer
  { navn: 'm1', ms: 1700 },       // aug — Emma signerte (du)
  { navn: 'm2', ms: 1250 },       // sep — husleien kom
  { navn: 'm3', ms: 560 },        // okt
  { navn: 'm4', ms: 1500 },       // nov — varmtvannet
  { navn: 'kort', ms: null },     // HOLD — venter på deg
  { navn: 'godkjent', ms: 2000 }, // fikset torsdag — natt → morgen
  { navn: 'm5', ms: 560 },        // des
  { navn: 'm6', ms: 560 },        // jan
  { navn: 'm7', ms: 1500 },       // feb — spørsmål besvart
  { navn: 'm8', ms: 560 },        // mar
  { navn: 'm9', ms: 560 },        // apr
  { navn: 'm10', ms: 1600 },      // mai — Emma sa opp
  { navn: 'm11', ms: 1700 },      // jun — ny leietaker (du valgte)
  { navn: 'm12', ms: 900 },       // jul
  { navn: 'ferdig', ms: 0 },
];

/* Måneder der en beslutning var DIN (lilla prikk). Alt annet var rutine som systemet tok (grønn = husleie inn). */
const DEG_MND = { 1: true, 4: true, 11: true };

/* Det som skjedde — én setning, én linje. Nøkkelen er fasen hendelsen kommer i. */
const HENDELSER = {
  m1: { ord: ['Emma', 'signerte.'], u: 'Leiekontrakt med BankID · 14 500 kr/mnd — du signerte.', deg: true },
  m2: { ord: ['Husleien', 'kom.'], u: '14 500 kr · 1. september · bokført av seg selv.' },
  m4: { ord: ['Varmtvannet', 'er', 'borte.'], u: 'Emma meldte 22:41. Saken er opprettet, Rørlegger AS er ledig torsdag — venter på deg.' },
  godkjent: { ord: ['Fikset', 'torsdag.'], u: 'Godkjent av deg · 3 450 kr · fakturaen ligger i regnskapet. Emma fikk beskjed.', deg: true },
  m7: { ord: ['Spørsmål', 'besvart.'], u: 'Emma spurte om oppsigelsestid — svart fra kontrakten, uten deg.' },
  m10: { ord: ['Emma', 'sa', 'opp.'], u: 'Ny annonse ute samme dag · visning med seks påmeldte.' },
  m11: { ord: ['Du', 'valgte', 'Sander.'], u: 'Kontrakt signert med BankID · flytter inn 1. august.', deg: true },
  ferdig: { ord: ['Tolv', 'måneder.', 'Tre', 'beslutninger', 'var', 'dine.'], u: 'Resten gikk på autopilot.' },
};

const BILDER = {
  kveld: { src: '/v4/annonse/fasade-kveld-1920.webp', srcSet: '/v4/annonse/fasade-kveld-1200.webp 1200w, /v4/annonse/fasade-kveld-1920.webp 1920w, /v4/annonse/fasade-kveld-3840.webp 3840w' },
  morgen: { src: '/v4/drift/fasade-morgen-1920.webp', srcSet: '/v4/drift/fasade-morgen-1200.webp 1200w, /v4/drift/fasade-morgen-1920.webp 1920w, /v4/drift/fasade-morgen-3840.webp 3840w' },
};

const AUTO_MS = 5200;
const OFF = '#F4F1EA';
const DIM = 'rgba(244,241,234,0.70)';
const SVAK = 'rgba(244,241,234,0.5)';
const LANDING = 'cubic-bezier(0.22, 1.2, 0.36, 1)';

function HakeIkon({ className = '' }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Hendelsen: ordene kommer ut av uskarpheten, ett og ett; linjen under følger. Den forrige tones rolig bort oppover. */
function Hendelse({ h, ut = false, smal }) {
  if (!h) return null;
  const fs = smal ? 'clamp(28px, 8.2vw, 34px)' : 'clamp(30px, 3.1vw, 56px)';
  return (
    <div className="col-start-1 row-start-1" aria-hidden={ut} style={ut ? { animation: `v4-linje-fade-ut 520ms ${EASE} both`, pointerEvents: 'none' } : undefined}>
      <p style={{ ...display, fontSize: fs, lineHeight: 1, letterSpacing: '-0.035em', color: OFF }} data-testid="v4a-hendelse">
        {h.ord.map((o, i) => (
          <span key={`${o}-${i}`} className="inline-block" style={{ marginRight: i < h.ord.length - 1 ? '0.24em' : 0, ...(ut ? {} : { animation: `v4-ord-fade 1000ms ${EASE} ${i * 85}ms both` }) }}>{o}</span>
        ))}
      </p>
      <p className={`max-w-[46ch] ${smal ? 'mt-2.5 text-[14px]' : 'mt-3.5 text-[15.5px] sm:text-[17px]'} leading-[1.45]`} style={{ color: DIM, ...(ut ? {} : { animation: `v4-linje-fade 900ms ${EASE} ${180 + h.ord.length * 85}ms both` }) }}>{h.u}</p>
    </div>
  );
}

export default function AarScene({ eiendom }) {
  const ref = useRef(null);
  const figRef = useRef(null);
  const smal = useSmal();
  const redusert = useRedusert();
  const synlig = useSynlig(ref, smal ? 0.5 : 0.55);
  /* Scenen starter idet den er godt inne i bildet og brukeren har fått et pust — eller etter 1,2 s om den står der fra start */
  const [roet, setRoet] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setRoet(true), 1200); return () => window.clearTimeout(t); }, []);
  const { fase, er, ferdig, replay, videre, holder } = useSekvens(FASER, synlig && roet);

  /* Din adresse → din bolig. Byttes sekvensielt: fade ut → bytt → spill fra første bilde. */
  const [vist, setVist] = useState(null);
  const [skifter, setSkifter] = useState(false);
  const sisteNokkel = useRef(null);
  useEffect(() => {
    if (!eiendom || !eiendom.adresse) return undefined;
    const nokkel = `${eiendom.adresse}|${eiendom.by || ''}`;
    if (nokkel === sisteNokkel.current) return undefined;
    sisteNokkel.current = nokkel;
    setSkifter(true);
    const t = window.setTimeout(() => { setVist({ adresse: eiendom.adresse, by: eiendom.by || '' }); replay(); setSkifter(false); }, 320);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eiendom]);
  const adresse = vist ? vist.adresse : 'Nygårdsgaten 5A';
  const under = vist ? `Din bolig${vist.by ? ` · ${vist.by}` : ''}` : 'Leilighet · 2 sov · Bergen';

  const inne = er('inn');
  const godkjent = er('godkjent');
  const venter = holder && fase === 'kort';
  const visKort = er('kort') && !godkjent;
  const morgen = godkjent;

  /* Hvor mange måneder har gått? (m1..m12). Under holdet står året i november. */
  let passert = 0;
  for (let i = 1; i <= 12; i += 1) { if (er(`m${i}`)) passert = i; }
  const husleie = Math.max(0, passert - 1);   // husleie fra september
  const gjort = (er('m1') ? 1 : 0) + (godkjent ? 1 : 0) + (er('m11') ? 1 : 0);

  /* Hendelsen som står: den siste fasen med en hendelse, opp til nå. Den forrige tones bort. */
  const idx = useMemo(() => { const m = {}; FASER.forEach((f, k) => { m[f.navn] = k; }); return m; }, []);
  let aktivId = null;
  for (let k = 0; k <= idx[fase]; k += 1) { if (HENDELSER[FASER[k].navn]) aktivId = FASER[k].navn; }
  const [vistH, setVistH] = useState({ id: null, forrige: null });
  useEffect(() => {
    setVistH((v) => (v.id === aktivId ? v : { id: aktivId, forrige: v.id }));
  }, [aktivId]);
  useEffect(() => {
    if (!vistH.forrige) return undefined;
    const t = window.setTimeout(() => setVistH((v) => ({ ...v, forrige: null })), 600);
    return () => window.clearTimeout(t);
  }, [vistH.forrige, vistH.id]);
  const hendelse = vistH.id ? HENDELSER[vistH.id] : null;
  const forrige = vistH.forrige ? HENDELSER[vistH.forrige] : null;

  /* Hvem godkjente? 'deg' når du trykket, 'eier' når historien løste seg selv (du hadde ikke vært i scenen). */
  const [hvem, setHvem] = useState(null);
  const [trykket, setTrykket] = useState(false);
  const harRort = useRef(false);
  const godkjenn = useCallback((av) => {
    if (trykket || !venter) return;
    setHvem(av);
    setTrykket(true);
    window.setTimeout(() => { videre(); }, 420);
  }, [trykket, venter, videre]);
  useEffect(() => { if (fase === 'inn') { setTrykket(false); setHvem(null); } }, [fase]);
  useEffect(() => {
    const el = figRef.current;
    if (!el) return undefined;
    const f = () => { harRort.current = true; };
    el.addEventListener('pointerenter', f);
    el.addEventListener('pointermove', f, { passive: true });
    el.addEventListener('pointerdown', f);
    el.addEventListener('touchstart', f, { passive: true });
    el.addEventListener('focusin', f);
    return () => {
      el.removeEventListener('pointerenter', f); el.removeEventListener('pointermove', f); el.removeEventListener('pointerdown', f);
      el.removeEventListener('touchstart', f); el.removeEventListener('focusin', f);
    };
  }, []);
  useEffect(() => {
    if (!venter || trykket) return undefined;
    const el = figRef.current;
    try { if (el && el.matches(':hover')) harRort.current = true; } catch (e) { /* ok */ }
    if (harRort.current) return undefined;
    let t = window.setTimeout(() => { if (!harRort.current) godkjenn('eier'); }, AUTO_MS);
    const avbryt = () => { harRort.current = true; if (t) { window.clearTimeout(t); t = null; } };
    el?.addEventListener('pointerenter', avbryt);
    el?.addEventListener('pointermove', avbryt, { passive: true });
    el?.addEventListener('touchstart', avbryt, { passive: true });
    return () => { if (t) window.clearTimeout(t); el?.removeEventListener('pointerenter', avbryt); el?.removeEventListener('pointermove', avbryt); el?.removeEventListener('touchstart', avbryt); };
  }, [venter, trykket, godkjenn]);

  /* Morgenbildet hentes idet høsten går — så natt → morgen aldri venter på nettet */
  const lastMorgen = er('m2') || redusert;

  const knappTekst = trykket ? 'Godkjent' : 'Godkjenn';
  const hair = 'rgba(244,241,234,0.22)';
  const spillehodeX = passert > 0 ? `${((passert - 0.5) / 12) * 100}%` : '-2%';
  /* Etiketter på smal skjerm: hver tredje måned — resten er prikker */
  const visEtikett = (i) => !smal || i % 3 === 0;
  const bunnH = smal ? 92 : 112;   // instrumentets høyde (linje + etiketter + luft) — hendelsen står over

  return (
    <figure ref={figRef} className="relative m-0" data-testid="v4a-scene-wrap">
      <div
        ref={ref}
        className="dh-hero-scene relative w-full overflow-hidden rounded-[20px] sm:rounded-[24px]"
        style={{ background: T.charcoal, boxShadow: '0 0 0 1px rgba(21,19,15,0.08)', color: OFF, opacity: skifter ? 0 : 1, transition: `opacity 320ms ${EASE}` }}
        role="group"
        aria-label={`Animert eksempel: ett leieår i ${adresse} med DigiHome — kontrakt signert med BankID, husleie hver måned, et varmtvannsproblem løst med én godkjenning, et spørsmål besvart fra kontrakten, og ny leietaker da den forrige sa opp. Tre beslutninger var dine — rutinen gikk automatisk.`}
        data-testid="v4a-scene"
        data-fase={fase}
      >
        {/* ── Boligen: kveld → morgen. Kameraet glir umerkelig nærmere gjennom året. ── */}
        <div aria-hidden="true" className="absolute inset-0" style={{ transform: inne && !redusert ? 'scale(1.06)' : 'scale(1)', transformOrigin: smal ? '42% 60%' : '50% 62%', transition: inne ? 'transform 22000ms linear' : 'none', willChange: 'transform' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BILDER.kveld.src} srcSet={BILDER.kveld.srcSet} sizes="(min-width: 1680px) 1600px, 100vw" alt="" fetchPriority="high" decoding="async" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" style={{ objectPosition: smal ? '42% 50%' : '50% 42%' }} />
          {lastMorgen && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={BILDER.morgen.src} srcSet={BILDER.morgen.srcSet} sizes="(min-width: 1680px) 1600px, 100vw" alt="" decoding="async" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" style={{ objectPosition: smal ? '42% 50%' : '50% 42%', opacity: morgen ? 1 : 0, transition: `opacity 2200ms ${EASE}` }} data-testid="v4a-morgen" data-vis={morgen ? '1' : '0'} />
          )}
        </div>
        {/* Toning: rolig topp for adressen, dyp bunn der året og hendelsene står. Litt lettere om morgenen. */}
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,18,15,0.42) 0%, rgba(21,18,15,0.10) 22%, rgba(21,18,15,0.06) 44%, rgba(21,18,15,0.58) 70%, rgba(21,18,15,0.86) 100%)', opacity: morgen ? 0.9 : 1, transition: `opacity 2200ms ${EASE}` }} />

        {/* ── Øverst: boligen · det du gjorde ── */}
        <div className={`absolute inset-x-0 top-0 flex items-start justify-between gap-4 ${smal ? 'px-5 pt-5' : 'px-8 pt-7 lg:px-10 lg:pt-8'}`} style={{ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(8px)', transition: `opacity 800ms ${EASE} 200ms, transform 800ms ${EASE} 200ms` }}>
          <div className="min-w-0">
            <p className={`truncate ${smal ? 'text-[22px]' : 'text-[24px] lg:text-[28px]'}`} style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: OFF, textShadow: '0 1px 12px rgba(0,0,0,0.25)' }} data-testid="v4a-adresse">{adresse}</p>
            <p className={`mt-1 truncate ${smal ? 'text-[12.5px]' : 'text-[13.5px]'}`} style={{ color: DIM }}>{under}</p>
          </div>
          {/* Tallet en boligeier bryr seg om: hvor mye måtte jeg gjøre? */}
          <div className="flex shrink-0 items-start gap-5 sm:gap-7">
            <div className="text-right">
              <p className={`${smal ? 'text-[11.5px]' : 'text-[12.5px]'}`} style={{ color: SVAK }}>Du bestemte</p>
              <p className="mt-0.5 flex items-baseline justify-end gap-1.5">
                <span className={`inline-grid leading-none ${smal ? 'text-[24px]' : 'text-[28px]'}`} style={{ ...display, letterSpacing: '-0.02em', color: OFF }} data-testid="v4a-gjort">
                  {[0, 1, 2, 3].map((n) => (
                    <span key={n} className="col-start-1 row-start-1" style={{ opacity: gjort === n ? 1 : 0, transform: gjort === n ? 'none' : 'translateY(6px)', transition: `opacity 360ms ${EASE} ${gjort === n ? 200 : 0}ms, transform 500ms ${LANDING} ${gjort === n ? 200 : 0}ms` }}>{n}</span>
                  ))}
                </span>
                <span className={`${smal ? 'text-[11.5px]' : 'text-[12.5px]'}`} style={{ color: SVAK }}>{gjort === 1 ? 'gang i år' : 'ganger i år'}</span>
              </p>
            </div>
            <p className="hidden items-center gap-2 pt-0.5 text-[13px] sm:flex" style={{ color: DIM }} data-testid="v4a-status">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: visKort ? T.lilla : '#5FCB8A', transition: 'background 400ms' }} />
              <span className="inline-grid">
                <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: visKort ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>Alt i orden</span>
                <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: visKort ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>Én ting venter på deg</span>
              </span>
            </p>
          </div>
        </div>

        {/* ── Hendelsen: én setning om gangen, over året ── */}
        <div className={`absolute left-0 grid ${smal ? 'right-0 px-5' : 'px-8 lg:px-10'}`} style={{ bottom: bunnH + (smal ? 16 : 26), maxWidth: smal ? undefined : 'min(720px, 62%)' }} data-testid="v4a-hendelser" data-id={vistH.id || ''}>
          {forrige && <Hendelse key={`ut-${vistH.forrige}`} h={forrige} ut smal={smal} />}
          {hendelse && <Hendelse key={vistH.id} h={hendelse} smal={smal} />}
        </div>

        {/* ── Året: hårlinjen, tolv måneder, spillehodet ── */}
        <div className={`absolute inset-x-0 bottom-0 ${smal ? 'px-5 pb-5' : 'px-8 pb-7 lg:px-10 lg:pb-8'}`} style={{ opacity: inne ? 1 : 0, transition: `opacity 900ms ${EASE} 400ms` }} data-testid="v4a-aar">
          <div className={`flex items-center justify-between ${smal ? 'mb-4 text-[11.5px]' : 'mb-5 text-[12.5px]'}`} style={{ color: SVAK }}>
            <p>Leieåret</p>
            <p className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: '#5FCB8A' }} />Husleie inn <span className="tabular-nums" style={{ color: DIM }} data-testid="v4a-husleie">{husleie}</span> av 11</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Deg</span>
            </p>
          </div>
          <div className="relative">
            {/* Linjen — og delen som er gått */}
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px" style={{ background: hair }} />
            <span aria-hidden="true" className="absolute left-0 top-0 h-px" style={{ background: 'rgba(244,241,234,0.62)', width: passert > 0 ? `${((passert - 0.5) / 12) * 100}%` : '0%', transition: `width 700ms ${EASE}` }} />
            {/* Spillehodet: en lilla strek gjennom linjen, glir til måneden som går */}
            <span aria-hidden="true" className="absolute top-0" style={{ left: spillehodeX, transform: 'translate(-50%, -50%)', opacity: passert > 0 && !ferdig ? 1 : 0, transition: `left 700ms ${EASE}, opacity 500ms ${EASE}` }} data-testid="v4a-spillehode">
              <span className="block h-[18px] w-px" style={{ background: T.lilla, boxShadow: '0 0 10px 1px rgba(212,150,255,0.55)' }} />
            </span>
            <ol className="relative grid grid-cols-12" data-testid="v4a-mnd">
              {MND.map((m, i) => {
                const k = i + 1;
                const ok = er(`m${k}`);
                const deg = !!DEG_MND[k];
                const venterHer = k === 4 && visKort;
                const farge = venterHer ? 'transparent' : !ok ? 'transparent' : deg ? T.lilla : '#5FCB8A';
                return (
                  <li key={m} className="flex flex-col items-center">
                    <span aria-hidden="true" className={`relative -mt-[3.5px] block h-[7px] w-[7px] rounded-full ${venterHer && venter ? 'v4-puls' : ''}`} style={{ background: farge, boxShadow: ok || venterHer ? (venterHer ? `inset 0 0 0 1px ${T.lilla}` : 'none') : `inset 0 0 0 1px rgba(244,241,234,0.32)`, transform: ok ? 'scale(1)' : 'scale(0.8)', transition: `background 450ms ${EASE}, box-shadow 450ms, transform 450ms ${LANDING}` }} />
                    <span className={`mt-2.5 tabular-nums ${smal ? 'text-[11px]' : 'text-[12px]'} ${visEtikett(i) ? '' : 'invisible'}`} style={{ color: ok ? DIM : 'rgba(244,241,234,0.36)', fontWeight: ok && deg ? 500 : 400, transition: 'color 450ms' }}>{m}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* ── Slutt: spill igjen ── */}
        <div className={`absolute ${smal ? 'right-5' : 'right-8 lg:right-10'}`} style={{ bottom: bunnH + (smal ? 16 : 30), opacity: ferdig ? 1 : 0, transition: `opacity 600ms ${EASE} 600ms` }} aria-hidden={!ferdig}>
          <button type="button" onClick={replay} className="text-[13.5px] underline decoration-[#F4F1EA]/30 underline-offset-4 transition-colors hover:text-[#F4F1EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4F1EA]/40" style={{ color: DIM, pointerEvents: ferdig ? 'auto' : 'none' }} tabIndex={ferdig ? 0 : -1} data-testid="v4a-replay">Spill igjen</button>
        </div>
      </div>

      {/* ── Godkjenningskortet: året stopper her — til du har svart. Glass over boligen, ved november. ── */}
      <div
        aria-hidden={!visKort}
        className={`absolute z-10 ${smal ? 'rounded-[16px]' : 'rounded-[18px]'}`}
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 50%), rgba(21,19,15,0.74)',
          color: OFF,
          border: '1px solid rgba(255,255,255,0.11)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 30px 70px -30px rgba(0,0,0,0.7)',
          backdropFilter: 'blur(18px) saturate(150%)', WebkitBackdropFilter: 'blur(18px) saturate(150%)',
          ...(smal ? { left: 16, right: 16, bottom: bunnH + 132 } : { right: 40, width: 300, bottom: bunnH + 26 }),
          opacity: visKort ? 1 : 0,
          pointerEvents: visKort ? 'auto' : 'none',
          transform: visKort ? 'none' : godkjent ? 'translateY(-10px) scale(0.97)' : 'translateY(14px) scale(0.98)',
          transition: visKort ? `opacity 560ms ${EASE} 200ms, transform 640ms ${LANDING} 200ms` : `opacity 380ms ${EASE}, transform 380ms ${EASE}`,
        }}
        data-testid="v4a-kort"
      >
        {smal ? (
          <div className="flex items-center justify-between gap-4 p-3.5 pl-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12px]" style={{ color: DIM }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</p>
              <p className="mt-1 truncate text-[14px] font-medium">Rørlegger AS</p>
              <p className="text-[13px]" style={{ color: DIM }}>Torsdag 09:00 · {tall(3450)} kr</p>
            </div>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label={`Godkjenn rørlegger, ${tall(3450)} kroner`} className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4a-godkjenn">
              {trykket && <HakeIkon />}{knappTekst}
            </button>
          </div>
        ) : (
          <div className="p-[18px]">
            <div className="flex items-center justify-between text-[12.5px]" style={{ color: DIM }}>
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</span>
              <span className="tabular-nums">nov · 22:41</span>
            </div>
            <p className="mt-3.5 text-[15px] font-medium">Rørlegger AS</p>
            <p className="text-[13.5px]" style={{ color: DIM }}>Torsdag 09:00 · varmtvann</p>
            <p className="mt-3 text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(3450)} kr</p>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label={`Godkjenn rørlegger, ${tall(3450)} kroner`} className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4a-godkjenn">
              {trykket && <HakeIkon />}{knappTekst}
            </button>
            <p className="mt-2.5 text-[11.5px]" style={{ color: SVAK }}>Sak opprettet automatisk · Emma har fått beskjed</p>
          </div>
        )}
      </div>
    </figure>
  );
}
