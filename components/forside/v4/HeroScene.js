'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EASE, T, display, tall, useSekvens, useSmal, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   HeroScene — «boligen, og dagen DigiHome tok seg av». En mikro-opplevelse.

   Prinsipp: alt er stille, unntatt én ting. Og den ene tingen er DIN.

   Lag 0  Tonal flate (T.flate) som foto og dag deler. Panelet er ett objekt.
   Lag 1  Eiendommens dag: tider · rail · hendelser. Fullførte rader dempet.
   Lag 2  Ett godkjenningskort i varm charcoal som bryter ut av høyre kant.
          Den eneste skyggen i heroen. Dit skal øyet — og fingeren.

   Tilstandsmaskin:
     1 Eiendommen · 2 DigiHome våkner · 3 Alt går av seg selv (husleie, kontrakt,
     leietaker) · 4 Et problem oppstår (varmtvann) · 5 DigiHome handler (sak →
     leverandør → pris) · 6 Systemet STOPPER: kortet venter på deg · 7 Du trykker
     · 8 Ro. Har du aldri vært inne i heroen, godkjenner Kari etter 5 s så
     historien alltid fullføres. Har du vært inne, venter den på deg.
--------------------------------------------------------------------------- */

const FASER = [
  { navn: 'foto', ms: 2000 },
  { navn: 'stig', ms: 1000 },
  { navn: 'rad1', ms: 430 },
  { navn: 'rad2', ms: 430 },
  { navn: 'rad3', ms: 440 },
  { navn: 'rad4', ms: 600 },
  { navn: 'sak', ms: 300 },
  { navn: 'lev', ms: 300 },
  { navn: 'krev', ms: 500 },
  { navn: 'kort', ms: null },      // HOLD — venter på deg
  { navn: 'godkjent', ms: 1000 },
  { navn: 'ferdig', ms: 0 },
];

/* Mobil er sin egen komposisjon: lengre på fotoet, færre steg, ingen rail. */
const FASER_SMAL = [
  { navn: 'foto', ms: 2800 },
  { navn: 'stig', ms: 900 },
  { navn: 'rad1', ms: 420 },
  { navn: 'rad2', ms: 420 },
  { navn: 'rad3', ms: 0 },
  { navn: 'rad4', ms: 600 },
  { navn: 'sak', ms: 300 },
  { navn: 'lev', ms: 300 },
  { navn: 'krev', ms: 500 },
  { navn: 'kort', ms: null },
  { navn: 'godkjent', ms: 1000 },
  { navn: 'ferdig', ms: 0 },
];

const RADER = [
  { fase: 'rad1', tid: '08:14', t: 'Husleie registrert', s: `${tall(64500)} kr · 8 av 8` },
  { fase: 'rad2', tid: '10:32', t: 'Leiekontrakt signert', s: 'Emma Sørensen · Nygårdsgaten 5A' },
  { fase: 'rad3', tid: '17:46', t: 'Spørsmål fra Ida løst', s: 'Besvart fra leiekontrakten', avatar: { src: '/v4/ida.webp', alt: 'Ida' }, skjulMobil: true },
  { fase: 'rad4', tid: '22:41', t: 'Varmtvann', s: 'Ida meldte 22:41', s2: 'Rørlegger AS bestilt · torsdag 09:00 · Ida varslet', s2Mobil: 'Rørlegger bestilt · torsdag 09:00', sak: true },
];

/* Utførte systemhandlinger — ikke tankeprosess. Dette skjedde. */
const SPOR = [
  { fase: 'sak', t: 'Sak opprettet', d: 'Varmtvann · hele bygget' },
  { fase: 'lev', t: 'Leverandør funnet', d: 'Rørlegger AS · ledig torsdag' },
  { fase: 'krev', t: 'Krever godkjenning', d: `${tall(3450)} kr` },
];

const AUTO_MS = 5000;         // Kari godkjenner etter 5 s — KUN hvis du aldri har vært inne i heroen
const CAPTION = 150;          // px — adressefeltet som ligger over fotoet
const SCENE_H = 'clamp(660px, 72vh, 720px)';
const SCENE_H_SMAL = 'clamp(600px, 74vh, 660px)';
const STRIPE = 0.43;          // andel foto synlig etter morph — header, ikke banner
/* Headeren viker for dagen på lave skjermer: dagen får alltid minst 460 px (430 på mobil). */
const STRIPE_CSS = `min(${STRIPE * 100}%, calc(100% - 460px))`;
const STRIPE_CSS_SMAL = `min(${STRIPE * 100}%, calc(100% - 430px))`;
const FOKUS_Y = 0.68;         // fokuspunkt i bildet (fasade/balkong), andel av elementhøyden

function Avatar({ src, alt, size = 28, className = '', style }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ${className}`}
      style={{ width: size, height: size, boxShadow: '0 0 0 1px rgba(21,19,15,0.10)', ...style }}
    />
  );
}

/* Prikk på railen. Fullført = hul. Aktiv = lilla. Godkjent = grønn. */
function Prikk({ tilstand }) {
  const fylt = tilstand !== 'ferdig';
  return (
    <span
      aria-hidden="true"
      className="block h-[7px] w-[7px] rounded-full"
      style={{
        background: tilstand === 'aktiv' ? T.lilla : tilstand === 'godkjent' ? T.gronn : T.flate,
        boxShadow: fylt ? 'none' : 'inset 0 0 0 1px rgba(21,19,15,0.35)',
        transition: 'background 400ms, box-shadow 400ms',
      }}
    />
  );
}

/* Mobil-markør: ferdig = hake, aktiv = lilla prikk, godkjent = grønn hake. */
function Hake({ tilstand }) {
  if (tilstand === 'aktiv') return <span aria-hidden="true" className="mt-[7px] block h-[7px] w-[7px] rounded-full" style={{ background: T.lilla }} />;
  const c = tilstand === 'godkjent' ? T.gronn : 'rgba(21,19,15,0.45)';
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-[4px]" style={{ transition: 'color 400ms', color: c }}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HakeIkon({ className = '' }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HeroScene({ eiendom }) {
  const ref = useRef(null);
  const figRef = useRef(null);
  const radRef = useRef(null);
  const smal = useSmal();
  /* Det som VISES byttes samtidig med fotoet (etter fade), ikke i det adressen velges. */
  const [vist, setVist] = useState(null);                   // { adresse, by } når personalisert
  const egen = !!vist;
  const adresse = egen ? vist.adresse : 'Nygårdsgaten 5';
  const under = egen ? (vist.by || 'Norge') : 'Bergen · 8 leiligheter';
  /* Mobil: fotoet venter på deg. Systemet våkner først når scenen er ~70 % inne. */
  const synlig = useSynlig(ref, smal ? 0.7 : 0.35);
  const faser = useMemo(() => (smal ? FASER_SMAL : FASER), [smal]);
  const { fase, er, ferdig, replay, videre, kjorer, holder } = useSekvens(faser, synlig);
  const sceneH = smal ? SCENE_H_SMAL : SCENE_H;

  /* ── Din adresse → din bolig. Street View via egen proxy, kun når panoramaet er ≤ 35 m fra
        adressen. Ellers: demo-fotoet beholdes, men adresse og data blir dine. Bytte skjer
        sekvensielt: scenen fader ut, alt byttes, spilles fra frame 1. ── */
  const [bilde, setBilde] = useState(null);
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
            /* To bilder i panelets egne formater, så Google-attribusjonen nederst aldri beskjæres:
               helbildet (frame 1) og et header-bånd rammet inn av Google selv (tettere fov, litt opp). */
            const W = ref.current.offsetWidth || 900;
            const H = ref.current.offsetHeight || 700;
            const sH = Math.min(STRIPE * H, H - (smal ? 430 : 460));
            const h = 1000;
            const w = Math.max(320, Math.min(1600, Math.round((h * W) / H)));
            const bw = 1400;
            const bh = Math.max(160, Math.min(1600, Math.round((bw * sH) / W)));
            const base = `/api/streetview?lat=${eiendom.lat}&lng=${eiendom.lng}&q=${q}`;
            const urlHel = `${base}&w=${w}&h=${h}&fov=68&pitch=14`;
            const urlBand = `${base}&w=${bw}&h=${bh}&fov=52&pitch=20`;
            const last = (u) => new Promise((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth > 0); im.onerror = () => res(false); im.src = u; });
            const [okHel, okBand] = await Promise.all([last(urlHel), last(urlBand)]);
            if (okHel) nytt = { url: urlHel, band: okBand ? urlBand : null };
          }
        }
      } catch (e) { /* fallback: demo-foto */ }
      if (avbrutt) return;
      setSkifter(true);
      window.setTimeout(() => {
        if (avbrutt) return;
        setBilde(nytt);
        setVist({ adresse: eiendom.adresse, by: eiendom.by });
        replay();
        setSkifter(false);
      }, 320);
    })();
    return () => { avbrutt = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eiendom]);

  /* Panelhøyde i px (for bunnforankring av personalisert foto i headeren). */
  const [hoyde, setHoyde] = useState(0);
  useEffect(() => {
    const m = () => { if (ref.current) setHoyde(ref.current.offsetHeight); };
    m();
    window.addEventListener('resize', m);
    return () => window.removeEventListener('resize', m);
  }, []);
  const stripePx = hoyde ? Math.min(STRIPE * hoyde, hoyde - (smal ? 430 : 460)) : 0;
  const stigTyBilde = hoyde ? ((stripePx / hoyde) - 1) * 100 : -57;

  /* Mobil får sitt eget portrett-utsnitt (bolig-hero-mobil.webp) via <picture>. */
  const fokusY = smal ? 0.62 : FOKUS_Y;
  const stigTy = ((STRIPE / 2) - fokusY) * 100;       // fokuspunktet lander midt i stripen
  const zoomStripe = smal ? 1.12 : 1.06;

  const stig = er('stig');
  const godkjent = er('godkjent');
  const aktiv = er('rad4') && !godkjent;          // saken er åpen
  const visKort = er('kort') && !godkjent;        // godkjenningskortet er ute
  const venter = holder && fase === 'kort';       // systemet har stoppet og venter på deg

  /* Ekte dato fra brukerens klokke — kun klient, for å unngå hydreringsavvik. */
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
    window.setTimeout(() => { videre(); }, 340);   // kort press-tilbakemelding, så kollaps
  }, [trykket, venter, videre]);

  /* Nullstill ved replay */
  useEffect(() => { if (fase === 'foto') { setTrykket(false); setHvem(null); } }, [fase]);

  /* Har peker/finger vært inne i heroen? Da venter vi på deg — uansett hvor lenge. */
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

  /* Auto-godkjenning KUN hvis heroen aldri har blitt rørt. Avbrytes om du kommer inn. */
  useEffect(() => {
    if (!venter || trykket) return undefined;
    const el = figRef.current;
    /* Pekeren hviler allerede over heroen (f.eks. før hydrering)? Da er den «rørt». */
    try { if (el && el.matches(':hover')) harRort.current = true; } catch (e) { /* ok */ }
    if (harRort.current) return undefined;
    let t = window.setTimeout(() => { if (!harRort.current) godkjenn('kari'); }, AUTO_MS);
    const avbryt = () => { harRort.current = true; if (t) { window.clearTimeout(t); t = null; } };
    el?.addEventListener('pointerenter', avbryt);
    el?.addEventListener('pointermove', avbryt, { passive: true });
    el?.addEventListener('touchstart', avbryt, { passive: true });
    return () => { if (t) window.clearTimeout(t); el?.removeEventListener('pointerenter', avbryt); el?.removeEventListener('pointermove', avbryt); el?.removeEventListener('touchstart', avbryt); };
  }, [venter, trykket, godkjenn]);

  /* Kortets topp følger den aktive raden (måles når raden har landet). */
  const kortRef = useRef(null);
  const [kortTop, setKortTop] = useState(null);
  useEffect(() => {
    if (!er('kort')) return undefined;
    const mal = () => {
      if (!radRef.current || !figRef.current || !kortRef.current || !ref.current) return;
      const fig = figRef.current.getBoundingClientRect();
      const rad = radRef.current.getBoundingClientRect();
      const kortH = kortRef.current.offsetHeight;
      const midt = rad.top - fig.top + rad.height / 2 - kortH / 2;   // sentrert på raden
      const maks = ref.current.offsetHeight - kortH - 20;             // aldri under panelets bunn
      setKortTop(Math.round(Math.min(midt, maks)));
    };
    mal();
    window.addEventListener('resize', mal);
    return () => window.removeEventListener('resize', mal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const visSpor = er('sak') && !godkjent;
  const knappTekst = trykket ? 'Godkjent' : 'Godkjenn';

  return (
    <figure ref={figRef} className="relative m-0" data-testid="v4-scene-wrap">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-[20px]"
        style={{ height: sceneH, background: T.flate, boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.06)', '--stripe': smal ? STRIPE_CSS_SMAL : STRIPE_CSS, opacity: skifter ? 0 : 1, transition: `opacity 300ms ${EASE}` }}
        role="img"
        aria-label={`Animert eksempel: en dag i ${adresse} med DigiHome — husleie registrert, kontrakt signert, et spørsmål fra leietaker besvart fra kontrakten, og et varmtvannsproblem løst med én godkjenning fra eier.`}
        data-testid="v4-scene"
      >
        {/* ── Foto. Kun transform: hvile → innpust (1.045) → glir opp til fasaden i headeren ── */}
        <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: stig ? 'var(--stripe)' : '100%', transition: `height 1000ms ${EASE}` }}>
          {bilde ? (
            <>
              {/* Helbildet: frame 1. Bunnforankret ved morph så attribusjonen følger med. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bilde.url}
                alt=""
                className="block w-full object-cover will-change-transform"
                style={{
                  height: sceneH,
                  objectPosition: '50% 50%',
                  filter: 'saturate(0.86) contrast(0.97)',
                  transformOrigin: '50% 100%',
                  transform: stig ? `translateY(${stigTyBilde}%)` : `scale(${kjorer ? 1.03 : 1})`,
                  opacity: stig && bilde.band ? 0 : 1,
                  transition: stig ? `transform 1000ms ${EASE}, opacity 500ms ${EASE} 300ms` : `transform 2400ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 200ms ${EASE}`,
                }}
              />
              {/* Header-båndet: samme bygning, rammet inn av Google (fov 52, pitch 20). Egen attribusjon nederst. */}
              {bilde.band && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bilde.band}
                  alt=""
                  className="absolute inset-0 block h-full w-full object-cover"
                  style={{ objectPosition: '50% 100%', filter: 'saturate(0.86) contrast(0.97)', opacity: stig ? 1 : 0, transition: stig ? `opacity 500ms ${EASE} 300ms` : `opacity 200ms ${EASE}` }}
                />
              )}
            </>
          ) : (
          <picture>
            <source media="(max-width: 639px)" srcSet="/v4/bolig-hero-mobil.webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/v4/bolig-hero.webp"
              alt=""
              fetchPriority="high"
              className="block w-full object-cover will-change-transform"
              style={{
                height: sceneH,
                objectPosition: smal ? '50% 55%' : '50% 68%',
                transformOrigin: `50% ${fokusY * 100}%`,
                /* Hvile: knapt merkbar drift ut (20 s). Scenen puster uten å loope. */
                transform: stig
                  ? `translateY(${stigTy}%) scale(${ferdig ? zoomStripe - 0.035 : zoomStripe})`
                  : `scale(${kjorer ? 1.045 : 1})`,
                transition: ferdig
                  ? 'transform 20000ms linear'
                  : stig
                    ? `transform 1000ms ${EASE}`
                    : 'transform 2400ms cubic-bezier(0.25, 0.1, 0.25, 1)',
              }}
            />
          </picture>
          )}
          <div aria-hidden="true" className="absolute inset-0" style={{ background: bilde ? 'rgba(214,190,150,0.14)' : 'rgba(214,190,150,0.08)', mixBlendMode: 'multiply' }} />
        </div>

        {/* ── Arket: [adresse over foto][eiendommens dag på flaten] — stiger ── */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col"
          style={{ height: `calc(100% - var(--stripe) + ${CAPTION}px)`, transform: stig ? 'translateY(0)' : `translateY(calc(100% - ${CAPTION}px))`, transition: `transform 1000ms ${EASE}` }}
        >
          {/* Adresse — stor og rendyrket i foto-tilstand, property header etter morph */}
          <div className={`relative shrink-0 px-6 text-white sm:px-7 ${bilde ? 'pb-9' : 'pb-5'}`} style={{ height: CAPTION, background: 'linear-gradient(180deg, rgba(21,19,15,0) 0%, rgba(21,19,15,0.28) 45%, rgba(21,19,15,0.66) 100%)' }}>
            <div className="flex h-full items-end justify-between gap-4">
              <div>
                <div className="grid">
                  <p className={`col-start-1 row-start-1 self-end ${adresse.length > 16 ? 'text-[32px] sm:text-[44px]' : 'text-[42px] sm:text-[52px]'}`} style={{ ...display, letterSpacing: '-0.035em', opacity: stig ? 0 : 1, transform: stig ? 'translateY(-6px)' : 'none', transition: stig ? `opacity 400ms ${EASE}, transform 400ms ${EASE}` : `opacity 500ms ${EASE} 250ms, transform 500ms ${EASE} 250ms` }}>{adresse}</p>
                  <p className={`col-start-1 row-start-1 self-end ${adresse.length > 16 ? 'text-[24px] sm:text-[30px]' : 'text-[28px] sm:text-[34px]'}`} style={{ ...display, letterSpacing: '-0.03em', opacity: stig ? 1 : 0, transition: stig ? `opacity 600ms ${EASE} 350ms` : `opacity 200ms ${EASE}` }}>{adresse}</p>
                </div>
                <p className="mt-1.5 text-[14px] text-white/80">{under}</p>
              </div>
            </div>
          </div>

          {/* Eiendommens dag — på flaten. Typografisk ledger med rail. Footer i bunn. */}
          <div className="flex flex-1 flex-col px-6 pb-5 pt-5 sm:px-7" style={{ background: T.flate, opacity: stig ? 1 : 0, transition: stig ? `opacity 500ms ${EASE} 450ms` : `opacity 150ms ${EASE}` }} aria-hidden={!stig}>
            <div className="flex items-center justify-between gap-4 text-[14px]">
              <p className="text-[#15130F]">I dag{dato && <span className="text-[#15130F]/45"> · {dato}</span>}</p>
              <p className="flex items-center gap-2 text-[#15130F]/60">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: aktiv ? T.lilla : T.gronn, transition: 'background 400ms' }} />
                <span className="inline-grid">
                  <span className="col-start-1 row-start-1" style={{ opacity: aktiv ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>Alt i orden</span>
                  <span className="col-start-1 row-start-1" style={{ opacity: aktiv ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>Én ting venter på deg</span>
                </span>
              </p>
            </div>

            <ul className="relative mt-3">
              {/* Railen tegnes nedover når systemet våkner */}
              <span aria-hidden="true" className="absolute bottom-0 top-0 left-[51px] hidden w-px sm:block" style={{ background: 'rgba(21,19,15,0.14)', transformOrigin: 'top', transform: stig ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 700ms ${EASE} 450ms` }} />
              {RADER.map((r0) => {
                const r = egen
                  ? {
                    ...r0,
                    s: r0.fase === 'rad1' ? `${tall(18500)} kr · på konto`
                      : r0.fase === 'rad2' ? `Emma Sørensen · ${adresse}`
                        : r0.s,
                  }
                  : r0;
                const vis = er(r.fase);
                const erAktiv = r.sak && aktiv;
                const dempet = !r.sak;
                const tilstand = r.sak ? (godkjent ? 'godkjent' : 'aktiv') : 'ferdig';
                return (
                  <li
                    key={r.tid}
                    ref={r.sak ? radRef : undefined}
                    className={`relative ${r.skjulMobil ? 'hidden sm:block' : ''}`}
                    style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', transition: `opacity 520ms ${EASE}, transform 520ms ${EASE}` }}
                  >
                    {/* Svak tonal stripe på den aktive saken */}
                    <span aria-hidden="true" className="absolute -inset-x-3 inset-y-0.5 rounded-[12px]" style={{ background: 'rgba(21,19,15,0.045)', opacity: erAktiv ? 1 : 0, transition: `opacity 500ms ${EASE}` }} />
                    <div className="relative grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-x-3 py-2.5 sm:grid-cols-[44px_16px_minmax(0,1fr)_auto] sm:py-3">
                      <span className="hidden pt-[3px] text-[13px] tabular-nums text-[#15130F]/45 sm:block">{r.tid}</span>
                      <span className="flex justify-center sm:pt-[7px]">{smal ? <Hake tilstand={tilstand} /> : <Prikk tilstand={tilstand} />}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-[15px] font-medium" style={{ color: dempet ? 'rgba(21,19,15,0.62)' : godkjent && r.sak ? 'rgba(21,19,15,0.85)' : T.ink, transition: 'color 400ms' }}>
                          {r.t}
                          {r.avatar && <Avatar src={r.avatar.src} alt={r.avatar.alt} size={20} />}
                        </span>
                        <span className="mt-0.5 block text-[13.5px] sm:truncate" style={{ color: dempet ? 'rgba(21,19,15,0.42)' : 'rgba(21,19,15,0.62)' }}>{r.s}</span>

                        {/* DigiHome handler: utførte handlinger, raskt inn. Kollapser når saken er godkjent. */}
                        {r.sak && (
                          <span className="grid" style={{ gridTemplateRows: visSpor ? '1fr' : '0fr', transition: `grid-template-rows 450ms ${EASE}` }}>
                            <span className="block min-h-0 overflow-hidden">
                              <span className="mt-2 block" data-testid="v4-spor">
                                {SPOR.map((sp0) => {
                                  const sp = egen && sp0.fase === 'sak' ? { ...sp0, d: `Varmtvann · ${adresse}` } : sp0;
                                  const v = er(sp.fase) && !godkjent;
                                  return (
                                    <span key={sp.fase} className="flex items-baseline gap-2 py-[3px] text-[13px]" style={{ opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(4px)', transition: `opacity 260ms ${EASE}, transform 260ms ${EASE}` }}>
                                      <span className="shrink-0 font-medium text-[#15130F]/85">{sp.t}</span>
                                      <span className="truncate text-[#15130F]/50">{sp.d}</span>
                                    </span>
                                  );
                                })}
                              </span>
                            </span>
                          </span>
                        )}

                        {/* Saken ekspanderer med resultatet når den er godkjent */}
                        {r.sak && (
                          <span className="grid" style={{ gridTemplateRows: godkjent ? '1fr' : '0fr', transition: `grid-template-rows 500ms ${EASE}` }}>
                            <span className="block min-h-0 overflow-hidden">
                              <span className="mt-1 block text-[13.5px] text-[#15130F] sm:truncate" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 250ms` }}>{smal && r.s2Mobil ? r.s2Mobil : r.s2}</span>
                              {/* Mobil: chippen under resultatet */}
                              <span className="mt-2 inline-flex items-center gap-2 text-[12.5px] text-[#15130F]/60 sm:hidden" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 300ms` }}>
                                {hvem === 'deg' ? <HakeIkon className="text-[#1F9D55]" /> : <Avatar src="/v4/kari.webp" alt="Kari" size={20} />}
                                <span>{hvem === 'deg' ? 'Godkjent av deg · nå' : 'Godkjent · 08:02'}</span>
                              </span>
                            </span>
                          </span>
                        )}
                      </span>
                      {r.sak && (
                        <span className="hidden items-center gap-2 pt-[2px] text-[12.5px] text-[#15130F]/60 sm:inline-flex" style={{ opacity: godkjent ? 1 : 0, transform: godkjent ? 'none' : 'translateY(4px)', transition: `opacity 400ms ${EASE} 200ms, transform 400ms ${EASE} 200ms` }} data-testid="v4-godkjent">
                          {hvem === 'deg' ? <HakeIkon className="text-[#1F9D55]" /> : <Avatar src="/v4/kari.webp" alt="Kari" size={22} />}
                          <span>{hvem === 'deg' ? 'Godkjent av deg · nå' : 'Godkjent · 08:02'}</span>
                        </span>
                      )}
                    </div>
                    <span aria-hidden="true" className="block h-px" style={{ background: 'rgba(21,19,15,0.08)' }} />
                  </li>
                );
              })}
            </ul>

            {/* Footer i bunnen — ingen løs bildetekst under scenen */}
            <div className="mt-auto flex items-center justify-between gap-4 pt-4 text-[13.5px] text-[#15130F]/50" style={{ opacity: ferdig ? 1 : 0, transition: `opacity 600ms ${EASE}` }} aria-hidden={!ferdig}>
              <span data-testid="v4-scene-tekst">Én godkjenning. Resten gikk på autopilot.</span>
              <button type="button" onClick={replay} className="shrink-0 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" style={{ pointerEvents: ferdig ? 'auto' : 'none' }} tabIndex={ferdig ? 0 : -1} data-testid="v4-replay">Spill igjen</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lag 2: godkjenningskortet. Varm charcoal, én skygge, bryter ut av høyre kant.
            Systemet har stoppet. Knappen er ekte og venter på deg. ── */}
      <div
        ref={kortRef}
        aria-hidden={!visKort}
        className="absolute z-10 rounded-[18px] text-[#F4F1EA]"
        style={{
          background: T.charcoal,
          boxShadow: '0 30px 60px -28px rgba(21,19,15,0.55), 0 1px 2px rgba(21,19,15,0.18)',
          ...(smal
            ? { left: 16, right: 16, bottom: 16 }
            : { right: -24, width: 288, top: kortTop == null ? '52%' : kortTop }),
          opacity: visKort ? 1 : 0,
          pointerEvents: visKort ? 'auto' : 'none',
          transform: visKort ? 'none' : godkjent ? 'translate(-14px, -6px) scale(0.96)' : 'translateX(28px)',
          transition: visKort
            ? `opacity 520ms ${EASE}, transform 520ms ${EASE}`
            : `opacity 380ms ${EASE}, transform 380ms ${EASE}`,
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
            <button
              type="button"
              onClick={() => godkjenn('deg')}
              tabIndex={visKort ? 0 : -1}
              aria-label={`Godkjenn rørlegger, ${tall(3450)} kroner`}
              className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`}
              style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }}
              data-testid="v4-godkjenn"
            >
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
            <p className="text-[13.5px] text-white/60">Torsdag 09:00</p>
            <p className="mt-3 text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(3450)} kr</p>
            <button
              type="button"
              onClick={() => godkjenn('deg')}
              tabIndex={visKort ? 0 : -1}
              aria-label={`Godkjenn rørlegger, ${tall(3450)} kroner`}
              className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`}
              style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }}
              data-testid="v4-godkjenn"
            >
              {trykket && <HakeIkon />}{knappTekst}
            </button>
            <p className="mt-2.5 text-[11.5px] text-white/45">Sak opprettet automatisk · sendt til deg</p>
          </div>
        )}
      </div>
    </figure>
  );
}
