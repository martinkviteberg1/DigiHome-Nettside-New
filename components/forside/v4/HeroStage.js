'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EASE, T, display, tall, useRedusert, useSekvens, useSmal, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   HeroStage — én scene i full bredde. Sana-strukturen, DigiHomes innhold.

   Over scenen: sentrert setning + adressefeltet. Her: én stor flate der
   virkeligheten (foto — senere film av eieren hjemme) fyller alt, og
   produktet er et tynt lag oppå: dagen som stille linjer nederst til
   venstre, og det ene kortet som bryter inn fra høyre. Ingen dashboard.

   Historien er den samme som før — bolig → DigiHome drifter → én
   godkjenning — men fortalt kinematisk. Klokken 22:41 melder Ida om
   varmtvannet. Du er hjemme. Ett trykk.

   FILM: når footagen finnes, settes FILM (loop + exit + poster). Loopen
   spiller til du godkjenner — da kuttes det til exit-klippet: eieren legger
   telefonen fra seg fordi DU trykket. Uten FILM vises fotoet. Redusert
   bevegelse → poster/foto, sluttbildet.

   Kun opacity/transform i overlaget. Kun ett bilde/én video i DOM om gangen.
--------------------------------------------------------------------------- */

/* Sett når footagen er filmet. Eksempel:
   { loop: '/v4/video/eier-kveld.mp4', loopWebm: '/v4/video/eier-kveld.webm', exit: '/v4/video/eier-kveld-exit.mp4',
     poster: '/v4/video/eier-kveld.webp', posterSmal: '/v4/video/eier-kveld-mobil.webp' } */
export const FILM = null;

/* Midlertidig scene til footagen finnes. 'stue' = hjemme hos eieren (nærmest filmkonseptet). 'bygg' = boligen. */
const BILDER = {
  stue: { src: '/v4/stue-2000.webp', srcSet: '/v4/stue-1200.webp 1200w, /v4/stue-2000.webp 2000w', smal: '/v4/stue-1200.webp', pos: '50% 66%', posSmal: '40% 50%' },
  bygg: { src: '/v4/bolig-hero.webp', srcSet: null, smal: '/v4/bolig-hero-mobil.webp', pos: '50% 62%', posSmal: '50% 55%' },
};

const FASER = [
  { navn: 'foto', ms: 1800 },
  { navn: 'rad1', ms: 480 },
  { navn: 'rad2', ms: 480 },
  { navn: 'rad3', ms: 480 },
  { navn: 'rad4', ms: 950 },     // Idas melding får litt tid
  { navn: 'sak', ms: 320 },
  { navn: 'lev', ms: 320 },
  { navn: 'krev', ms: 520 },
  { navn: 'kort', ms: null },    // HOLD — venter på deg
  { navn: 'godkjent', ms: 1000 },
  { navn: 'ferdig', ms: 0 },
];

const RADER = [
  { fase: 'rad1', tid: '08:14', t: 'Husleie registrert', s: `${tall(64500)} kr · 8 av 8` },
  { fase: 'rad2', tid: '10:32', t: 'Leiekontrakt signert', s: 'Emma Sørensen · Nygårdsgaten 5A' },
  { fase: 'rad3', tid: '17:46', t: 'Spørsmål fra Ida løst', s: 'Besvart fra leiekontrakten', skjulMobil: true },
  { fase: 'rad4', tid: '22:41', t: 'Varmtvann', s: '«Varmtvannet er borte i hele bygget» — Ida', sMobil: '«Varmtvannet er borte» — Ida', s2: 'Rørlegger AS bestilt · torsdag 09:00 · Ida varslet', s2Mobil: 'Rørlegger bestilt · torsdag 09:00', sak: true },
];

/* Utførte systemhandlinger — ikke tankeprosess. Dette skjedde. */
const SPOR = [
  { fase: 'sak', t: 'Sak opprettet', d: 'Varmtvann · hele bygget' },
  { fase: 'lev', t: 'Leverandør funnet', d: 'Rørlegger AS · ledig torsdag' },
  { fase: 'krev', t: 'Krever godkjenning', d: `${tall(3450)} kr` },
];

const AUTO_MS = 5000;
const OFF = '#F4F1EA';
const HAIR = 'rgba(244,241,234,0.16)';

function HakeIkon({ className = '' }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Prikk({ tilstand }) {
  const fylt = tilstand !== 'ferdig';
  return (
    <span aria-hidden="true" className="block h-[7px] w-[7px] rounded-full" style={{ background: tilstand === 'aktiv' ? T.lilla : tilstand === 'godkjent' ? '#5FCB8A' : 'transparent', boxShadow: fylt ? 'none' : 'inset 0 0 0 1px rgba(244,241,234,0.5)', transition: 'background 400ms, box-shadow 400ms' }} />
  );
}

/* Virkeligheten: film hvis den finnes, ellers foto. Ett element i DOM. */
function Virkelighet({ film, bilde, smal, kjorer, ferdig, redusert, godkjent, egen }) {
  const vidRef = useRef(null);
  const exit = !!(film && film.exit && godkjent);
  useEffect(() => {
    const v = vidRef.current;
    if (!v || !film) return;
    try { v.load(); v.play().catch(() => {}); } catch (e) { /* ok */ }
  }, [exit, film]);

  const felles = {
    className: 'absolute inset-0 h-full w-full object-cover will-change-transform',
    style: {
      objectPosition: egen ? '50% 50%' : (smal ? bilde.posSmal : bilde.pos),
      /* Hvile → svakt innpust (1.035) → langsom drift ut (20 s). Puster uten å loope. */
      transform: ferdig ? 'scale(1.0)' : kjorer ? 'scale(1.035)' : 'scale(1)',
      transition: ferdig ? 'transform 20000ms linear' : 'transform 2600ms cubic-bezier(0.25, 0.1, 0.25, 1)',
      filter: egen ? 'saturate(0.88) contrast(0.97)' : 'none',
    },
  };

  if (film && !redusert && !egen) {
    return (
      <video
        key={exit ? 'exit' : 'loop'}
        ref={vidRef}
        {...felles}
        poster={smal && film.posterSmal ? film.posterSmal : film.poster}
        autoPlay
        muted
        loop={!exit}
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        {!exit && film.loopWebm && <source src={film.loopWebm} type="video/webm" />}
        <source src={exit ? film.exit : film.loop} type="video/mp4" />
      </video>
    );
  }
  if (film && !egen) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={smal && film.posterSmal ? film.posterSmal : film.poster} alt="" {...felles} />;
  }
  if (egen) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={egen} alt="" {...felles} />;
  }
  return (
    <picture>
      <source media="(max-width: 639px)" srcSet={bilde.smal} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bilde.src} srcSet={bilde.srcSet || undefined} sizes="(min-width: 1680px) 1600px, 100vw" alt="" fetchPriority="high" {...felles} />
    </picture>
  );
}

export default function HeroStage({ eiendom, bilde = 'stue', film = FILM }) {
  const ref = useRef(null);
  const figRef = useRef(null);
  const radRef = useRef(null);
  const smal = useSmal();
  const redusert = useRedusert();
  const bildet = BILDER[bilde] || BILDER.stue;
  const synlig = useSynlig(ref, smal ? 0.55 : 0.3);
  const { fase, er, ferdig, replay, videre, kjorer, holder } = useSekvens(FASER, synlig);

  /* ── Din adresse → din bolig. Street View via egen proxy når panoramaet er nært nok.
        Byttet skjer sekvensielt: fade ut → bytt → spill fra frame 1. ── */
  const [vist, setVist] = useState(null);
  const [egen, setEgen] = useState(null);           // URL til Street View når den finnes
  const [skifter, setSkifter] = useState(false);
  const sisteNokkel = useRef(null);
  useEffect(() => {
    if (!eiendom) return undefined;
    const nokkel = `${eiendom.adresse}|${eiendom.lat}|${eiendom.lng}`;
    if (nokkel === sisteNokkel.current) return undefined;
    sisteNokkel.current = nokkel;
    let avbrutt = false;
    (async () => {
      let nytt = null;
      try {
        if (Number.isFinite(eiendom.lat) && Number.isFinite(eiendom.lng) && ref.current) {
          const q = encodeURIComponent([eiendom.adresse, eiendom.by].filter(Boolean).join(', '));
          const m = await fetch(`/api/streetview/meta?lat=${eiendom.lat}&lng=${eiendom.lng}&q=${q}`).then((r) => r.json()).catch(() => null);
          if (m && m.ok) {
            const W = ref.current.offsetWidth || 1400;
            const H = ref.current.offsetHeight || 700;
            const w = 1600;
            const h = Math.max(400, Math.min(1000, Math.round((w * H) / W)));
            const url = `/api/streetview?lat=${eiendom.lat}&lng=${eiendom.lng}&q=${q}&w=${w}&h=${h}&fov=70&pitch=10`;
            const ok = await new Promise((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth > 0); im.onerror = () => res(false); im.src = url; });
            if (ok) nytt = url;
          }
        }
      } catch (e) { /* fallback: scenen beholdes, adressen blir din */ }
      if (avbrutt) return;
      setSkifter(true);
      window.setTimeout(() => {
        if (avbrutt) return;
        setEgen(nytt);
        setVist({ adresse: eiendom.adresse, by: eiendom.by });
        replay();
        setSkifter(false);
      }, 320);
    })();
    return () => { avbrutt = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eiendom]);

  const adresse = vist ? vist.adresse : 'Nygårdsgaten 5';
  const under = vist ? (vist.by || 'Norge') : 'Bergen · 8 leiligheter';
  const rader = useMemo(() => (vist
    ? RADER.map((r) => (r.fase === 'rad1' ? { ...r, s: `${tall(18500)} kr · på konto` } : r.fase === 'rad2' ? { ...r, s: `Emma Sørensen · ${adresse}` } : r))
    : RADER), [vist, adresse]);

  const inne = er('foto');
  const godkjent = er('godkjent');
  const aktiv = er('rad4') && !godkjent;
  const visKort = er('kort') && !godkjent;
  const venter = holder && fase === 'kort';
  const visSpor = er('sak') && !godkjent;

  const [dato, setDato] = useState('');
  useEffect(() => {
    try { setDato(new Date().toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })); } catch (e) { /* ok */ }
  }, []);

  /* Hvem godkjente? 'deg' når du trykket, 'kari' når historien løste seg selv. */
  const [hvem, setHvem] = useState(null);
  const [trykket, setTrykket] = useState(false);
  const harRort = useRef(false);
  const godkjenn = useCallback((av) => {
    if (trykket || !venter) return;
    setHvem(av);
    setTrykket(true);
    window.setTimeout(() => { videre(); }, 340);
  }, [trykket, venter, videre]);
  useEffect(() => { if (fase === 'foto') { setTrykket(false); setHvem(null); } }, [fase]);

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
      el.removeEventListener('pointerenter', f);
      el.removeEventListener('pointermove', f);
      el.removeEventListener('pointerdown', f);
      el.removeEventListener('touchstart', f);
      el.removeEventListener('focusin', f);
    };
  }, []);

  useEffect(() => {
    if (!venter || trykket) return undefined;
    const el = figRef.current;
    try { if (el && el.matches(':hover')) harRort.current = true; } catch (e) { /* ok */ }
    if (harRort.current) return undefined;
    let t = window.setTimeout(() => { if (!harRort.current) godkjenn('kari'); }, AUTO_MS);
    const avbryt = () => { harRort.current = true; if (t) { window.clearTimeout(t); t = null; } };
    el?.addEventListener('pointerenter', avbryt);
    el?.addEventListener('pointermove', avbryt, { passive: true });
    el?.addEventListener('touchstart', avbryt, { passive: true });
    return () => { if (t) window.clearTimeout(t); el?.removeEventListener('pointerenter', avbryt); el?.removeEventListener('pointermove', avbryt); el?.removeEventListener('touchstart', avbryt); };
  }, [venter, trykket, godkjenn]);

  /* Kortet legger seg på linje med saksraden (desktop). */
  const kortRef = useRef(null);
  const [kortTop, setKortTop] = useState(null);
  useEffect(() => {
    if (!er('kort')) return undefined;
    const mal = () => {
      if (!radRef.current || !figRef.current || !kortRef.current) return;
      const fig = figRef.current.getBoundingClientRect();
      const rad = radRef.current.getBoundingClientRect();
      const kortH = kortRef.current.offsetHeight;
      const midt = rad.top - fig.top + rad.height / 2 - kortH / 2;   // sentrert på raden
      setKortTop(Math.round(Math.max(24, Math.min(midt, fig.height - kortH - 24))));
    };
    mal();
    window.addEventListener('resize', mal);
    return () => window.removeEventListener('resize', mal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const knappTekst = trykket ? 'Godkjent' : 'Godkjenn';
  const godkjentAv = hvem === 'deg' ? 'Godkjent av deg · nå' : 'Godkjent · 08:02';

  return (
    <figure ref={figRef} className="relative m-0 flex min-h-0 flex-1 flex-col" data-testid="v4-scene-wrap">
      <div
        ref={ref}
        className="relative flex-1 overflow-hidden rounded-[20px] sm:rounded-[24px]"
        style={{ minHeight: smal ? 560 : 620, maxHeight: 900, background: T.charcoal, boxShadow: '0 0 0 1px rgba(21,19,15,0.08)', opacity: skifter ? 0 : 1, transition: `opacity 320ms ${EASE}` }}
        role="img"
        aria-label={`Animert eksempel: en dag i ${adresse} med DigiHome — husleie registrert, kontrakt signert, et spørsmål fra leietaker besvart fra kontrakten, og et varmtvannsproblem løst med én godkjenning fra eier.`}
        data-testid="v4-scene"
      >
        {/* ── Virkeligheten ── */}
        <Virkelighet film={film} bilde={bildet} smal={smal} kjorer={kjorer} ferdig={ferdig} redusert={redusert} godkjent={godkjent} egen={egen} />
        {/* Kinematisk vignett: mørkere topp og bunn, fotoet fritt i midten */}
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,18,15,0.80) 0%, rgba(21,18,15,0.70) 30%, rgba(21,18,15,0.40) 54%, rgba(21,18,15,0.06) 76%, rgba(21,18,15,0.18) 100%)' }} />
        <div aria-hidden="true" className="absolute inset-0 hidden sm:block" style={{ background: 'linear-gradient(90deg, rgba(21,18,15,0.42) 0%, rgba(21,18,15,0.18) 40%, rgba(21,18,15,0) 62%)' }} />

        {/* ── Produktlaget: boligen · status øverst, dagen som stille linjer under. Bildet får puste nederst. ── */}
        <div className="absolute inset-x-0 top-0 p-5 sm:p-7" style={{ color: OFF }}>
        <div className="flex items-start justify-between gap-4" style={{ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(6px)', transition: `opacity 700ms ${EASE} 200ms, transform 700ms ${EASE} 200ms` }}>
          <div className="min-w-0">
            <p className={`truncate ${adresse.length > 18 ? 'text-[20px] sm:text-[24px]' : 'text-[22px] sm:text-[26px]'}`} style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, textWrap: 'nowrap' }} data-testid="v4-stage-adresse">{adresse}</p>
            <p className="mt-1 text-[13px] sm:text-[13.5px]" style={{ color: 'rgba(244,241,234,0.72)' }}>{under}{dato && <span> · I dag, {dato}</span>}</p>
          </div>
          <p className="hidden shrink-0 items-center gap-2 pt-1 text-[13px] sm:flex" style={{ color: 'rgba(244,241,234,0.78)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: aktiv ? T.lilla : '#5FCB8A', transition: 'background 400ms' }} />
            <span className="inline-grid">
              <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>Alt i orden</span>
              <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>Én ting venter på deg</span>
            </span>
          </p>
        </div>

        {/* Dagen — rader fader inn på plass (layouten er stabil, ingenting hopper). */}
          <ul className="relative mt-5 max-w-[600px] sm:mt-6" data-testid="v4-stage-dag" aria-hidden={!er('rad1')}>
            {rader.map((r) => {
              const vis = er(r.fase);
              const dempet = !r.sak;
              const tilstand = r.sak ? (godkjent ? 'godkjent' : 'aktiv') : 'ferdig';
              return (
                <li key={r.tid} ref={r.sak ? radRef : undefined} className={`relative ${r.skjulMobil ? 'hidden sm:block' : ''}`} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(8px)', transition: `opacity 560ms ${EASE}, transform 560ms ${EASE}` }}>
                  <div className="grid grid-cols-[16px_minmax(0,1fr)] items-start gap-x-3 py-2 sm:grid-cols-[44px_16px_minmax(0,1fr)_auto] sm:py-2.5">
                    <span className="hidden pt-[3px] text-[13px] tabular-nums sm:block" style={{ color: 'rgba(244,241,234,0.55)' }}>{r.tid}</span>
                    <span className="flex justify-center pt-[7px]"><Prikk tilstand={tilstand} /></span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium sm:text-[15.5px]" style={{ color: dempet ? 'rgba(244,241,234,0.72)' : OFF, transition: 'color 400ms' }}>
                        {r.t}<span className="ml-2 text-[12.5px] font-normal sm:hidden" style={{ color: 'rgba(244,241,234,0.5)' }}>{r.tid}</span>
                      </span>
                      <span className="mt-0.5 block text-[13.5px] sm:truncate" style={{ color: dempet ? 'rgba(244,241,234,0.52)' : 'rgba(244,241,234,0.78)' }}>{smal && r.sMobil ? r.sMobil : r.s}</span>

                      {r.sak && (
                        <span className="grid" style={{ gridTemplateRows: visSpor ? '1fr' : '0fr', transition: `grid-template-rows 450ms ${EASE}` }}>
                          <span className="block min-h-0 overflow-hidden">
                            <span className="mt-2 block" data-testid="v4-spor">
                              {SPOR.map((sp0) => {
                                const sp = vist && sp0.fase === 'sak' ? { ...sp0, d: `Varmtvann · ${adresse}` } : sp0;
                                const v = er(sp.fase) && !godkjent;
                                return (
                                  <span key={sp.fase} className="flex items-baseline gap-2 py-[3px] text-[13px]" style={{ opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(4px)', transition: `opacity 260ms ${EASE}, transform 260ms ${EASE}` }}>
                                    <span className="shrink-0 font-medium" style={{ color: 'rgba(244,241,234,0.9)' }}>{sp.t}</span>
                                    <span className="min-w-0 truncate" style={{ color: 'rgba(244,241,234,0.55)' }}>{sp.d}</span>
                                  </span>
                                );
                              })}
                            </span>
                          </span>
                        </span>
                      )}

                      {r.sak && (
                        <span className="grid" style={{ gridTemplateRows: godkjent ? '1fr' : '0fr', transition: `grid-template-rows 500ms ${EASE}` }}>
                          <span className="block min-h-0 overflow-hidden">
                            <span className="mt-1 block text-[13.5px] sm:truncate" style={{ color: OFF, opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 250ms` }}>{smal && r.s2Mobil ? r.s2Mobil : r.s2}</span>
                            <span className="mt-2 inline-flex items-center gap-2 text-[12.5px] sm:hidden" style={{ color: 'rgba(244,241,234,0.7)', opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 300ms` }}>
                              <HakeIkon className="text-[#5FCB8A]" /><span>{godkjentAv}</span>
                            </span>
                          </span>
                        </span>
                      )}
                    </span>
                    {r.sak && (
                      <span className="hidden items-center gap-2 pt-[2px] text-[12.5px] sm:inline-flex" style={{ color: 'rgba(244,241,234,0.7)', opacity: godkjent ? 1 : 0, transform: godkjent ? 'none' : 'translateY(4px)', transition: `opacity 400ms ${EASE} 200ms, transform 400ms ${EASE} 200ms` }} data-testid="v4-godkjent">
                        <HakeIkon className="text-[#5FCB8A]" /><span className="whitespace-nowrap">{godkjentAv}</span>
                      </span>
                    )}
                  </div>
                  <span aria-hidden="true" className="block h-px" style={{ background: HAIR }} />
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex max-w-[600px] items-center justify-between gap-4 text-[13.5px]" style={{ color: 'rgba(244,241,234,0.62)', opacity: ferdig ? 1 : 0, transition: `opacity 600ms ${EASE}` }} aria-hidden={!ferdig}>
            <span data-testid="v4-scene-tekst">Én godkjenning. Resten gjorde DigiHome.</span>
            <button type="button" onClick={replay} className="shrink-0 underline decoration-[#F4F1EA]/30 underline-offset-4 transition-colors hover:text-[#F4F1EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" style={{ pointerEvents: ferdig ? 'auto' : 'none' }} tabIndex={ferdig ? 0 : -1} data-testid="v4-replay">Spill igjen</button>
          </div>
        </div>
      </div>

      {/* ── Det ene kortet. Charcoal, én skygge, bryter ut av høyre kant. Systemet har stoppet. Knappen venter på deg. ── */}
      <div
        ref={kortRef}
        aria-hidden={!visKort}
        className="absolute z-10 rounded-[18px] text-[#F4F1EA]"
        style={{
          background: T.charcoal,
          boxShadow: '0 30px 60px -28px rgba(21,19,15,0.7), 0 0 0 1px rgba(244,241,234,0.06)',
          ...(smal ? { left: 16, right: 16, bottom: 16 } : { right: -24, width: 296, top: kortTop == null ? '30%' : kortTop }),
          opacity: visKort ? 1 : 0,
          pointerEvents: visKort ? 'auto' : 'none',
          transform: visKort ? 'none' : godkjent ? 'translate(-14px, -6px) scale(0.96)' : 'translateX(28px)',
          transition: visKort ? `opacity 520ms ${EASE}, transform 520ms ${EASE}` : `opacity 380ms ${EASE}, transform 380ms ${EASE}`,
        }}
        data-testid="v4-kort"
      >
        {smal ? (
          <div className="flex items-center justify-between gap-4 p-3.5 pl-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12px] text-white/60"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</p>
              <p className="mt-1 truncate text-[14px] font-medium">Rørlegger AS</p>
              <p className="text-[13px] text-white/60">Torsdag 09:00 · {tall(3450)} kr</p>
            </div>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label={`Godkjenn rørlegger, ${tall(3450)} kroner`} className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4-godkjenn">
              {trykket && <HakeIkon />}{knappTekst}
            </button>
          </div>
        ) : (
          <div className="p-[18px]">
            <div className="flex items-center justify-between text-[12.5px] text-white/60">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</span>
              <span className="tabular-nums">22:41</span>
            </div>
            <p className="mt-3.5 text-[15px] font-medium">Rørlegger AS</p>
            <p className="text-[13.5px] text-white/60">Torsdag 09:00 · varmtvann, hele bygget</p>
            <p className="mt-3 text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(3450)} kr</p>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label={`Godkjenn rørlegger, ${tall(3450)} kroner`} className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4-godkjenn">
              {trykket && <HakeIkon />}{knappTekst}
            </button>
            <p className="mt-2.5 text-[11.5px] text-white/45">Sak opprettet automatisk · sendt til deg</p>
          </div>
        )}
      </div>
    </figure>
  );
}
