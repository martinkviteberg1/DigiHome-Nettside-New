'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EASE, T, display, tall, useRedusert, useSekvens, useSmal, useSynlig } from './motion';
import AdresseFelt from './AdresseFelt';

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

/* Filmen: eieren utenfor boligen om kvelden. Han leser på telefonen — og går inn.
   · Første sekundene vises filmen alene, uten lag. Så dempes bildet og dagen begynner.
   · Filmen spiller én gang. Godkjenningen skjer rett før han legger telefonen i lommen (`trykkVed`),
     så det han gjør på skjermen og det som skjer i filmen er én bevegelse.
   · `hjem`: stillbildet filmen glir over i når historien er ferdig — han hjemme i sofaen,
     kvelden er hans igjen. Høyre side av bildet er tom vegg: der står sluttteksten. */
export const FILM = {
  loop: '/v4/video/eier-1920.mp4',
  loopSmal: '/v4/video/eier-1280.mp4',
  /* VP9-kopi for nettlesere uten H.264 (enkelte Linux-Firefox/Chromium-bygg). */
  loopWebm: '/v4/video/eier-1280.webm',
  poster: '/v4/video/eier-poster.webp',
  posterSmal: '/v4/video/eier-poster-mobil.webp',
  hjem: '/v4/video/eier-hjemme-1920.webp',
  hjemSmal: '/v4/video/eier-hjemme-mobil.webp',
  /* Sekundet der han fortsatt leser — rett før telefonen går i lommen. Har du ikke trykket, trykker historien her. */
  trykkVed: 7.4,
  /* Sekundet der han går inn: her begynner overgangen til stua — mens filmen fortsatt beveger seg. Aldri på et frosset bilde. */
  /* Dissolven til stua starter `hjemVed` — de siste 0,6 s av filmen (han tar det siste steget inn) ligger
     under overgangen, så bildet beveger seg helt til stua har tatt over. Filmen selv rører vi aldri (ingen
     transform/zoom på video-elementet). `ended` er reserve. */
  hjemVed: 11.45,
  once: true,
};

/* Midlertidig scene til footagen finnes. 'stue' = hjemme hos eieren (nærmest filmkonseptet). 'bygg' = boligen. */
const BILDER = {
  stue: { src: '/v4/stue-2000.webp', srcSet: '/v4/stue-1200.webp 1200w, /v4/stue-2000.webp 2000w', smal: '/v4/stue-1200.webp', pos: '50% 66%', posSmal: '40% 50%' },
  bygg: { src: '/v4/bolig-hero.webp', srcSet: null, smal: '/v4/bolig-hero-mobil.webp', pos: '50% 62%', posSmal: '50% 55%' },
};

/* Fasene. 'foto' = filmen alene. Så dempes bildet, panelet kommer, og dagen leses én rad om gangen. */
const FASER = [
  { navn: 'foto', ms: 1400 },
  { navn: 'rad1', ms: 700 },
  { navn: 'rad2', ms: 700 },
  { navn: 'rad3', ms: 700 },
  { navn: 'rad4', ms: 1000 },    // Idas melding får litt tid
  { navn: 'sak', ms: 480 },
  { navn: 'lev', ms: 600 },
  { navn: 'krev', ms: 220 },
  { navn: 'kort', ms: null },    // HOLD — venter på deg
  { navn: 'godkjent', ms: 1400 },
  { navn: 'ferdig', ms: 0 },
];

/* Dagen. Tre stille rader — og én som trenger deg. `h` = verdi til høyre. */
const RADER = [
  { fase: 'rad1', tid: '08:14', t: 'Husleie registrert', s: '8 av 8 betalt', h: `${tall(64500)}\u00A0kr`, kompaktMobil: true },
  { fase: 'rad2', tid: '10:32', t: 'Leiekontrakt signert', s: 'Emma Sørensen · Nygårdsgaten 5A', kompaktMobil: true },
  { fase: 'rad3', tid: '17:46', t: 'Spørsmål fra Jonas besvart', s: 'Om oppsigelsestid · svart fra leiekontrakten', skjulMobil: true },
  { fase: 'rad4', tid: '22:41', t: 'Melding fra Ida', s: '«Varmtvannet er borte i hele bygget»', s2: 'Rørlegger AS bestilt · torsdag 09:00 · Ida har fått beskjed', s2Mobil: 'Rørlegger bestilt · torsdag 09:00 · Ida varslet', sak: true },
];

/* Det systemet gjorde — utført, ikke tankeprosess. */
const SPOR = [
  { fase: 'sak', t: 'Sak opprettet', d: 'Varmtvann · hele bygget', dMobil: 'hele bygget' },
  { fase: 'lev', t: 'Rørlegger funnet', d: 'Rørlegger AS · ledig torsdag 09:00', dMobil: 'torsdag 09:00' },
];

const OFF = '#F4F1EA';
const DIM = 'rgba(244,241,234,0.58)';
const HAIR = 'rgba(244,241,234,0.10)';

function HakeIkon({ className = '' }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Virkeligheten: film hvis den finnes, ellers foto. Ett bilde/én film i DOM — pluss stillbildet
   filmen glir over i når historien er ferdig (han hjemme). Filmen spiller én gang, fra det
   historien starter, og hviler på siste bilde (han ved døren) til du har godkjent. Aldri frys midt i. */
function Virkelighet({ film, bilde, smal, kjorer, ferdig, redusert, egen, fase, hjemme, onFilmFerdig, onTid, onKlar }) {
  const vidRef = useRef(null);

  /* Filmen hentes HELT ned først (2–3 MB) og spilles fra minnet — så den aldri stopper for å bufre midt i
     (det så ut som «frys + zoom»). Kommer den ikke i mål på 5,5 s, strømmes den som vanlig. */
  const filUrl = useMemo(() => {
    if (!film) return null;
    const mp4 = smal && film.loopSmal ? film.loopSmal : film.loop;
    if (!film.loopWebm || typeof document === 'undefined') return mp4;
    try {
      const kan = document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"');
      return kan ? mp4 : film.loopWebm;
    } catch (e) { return mp4; }
  }, [film, smal]);
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!filUrl || redusert) return undefined;
    let objUrl = null;
    let ferdigLastet = false;
    const ctrl = new AbortController();
    const fallback = window.setTimeout(() => { if (!ferdigLastet) setSrc(filUrl); }, 5500);
    (async () => {
      try {
        const r = await fetch(filUrl, { signal: ctrl.signal });
        if (!r.ok) throw new Error(String(r.status));
        const b = await r.blob();
        ferdigLastet = true;
        window.clearTimeout(fallback);
        objUrl = URL.createObjectURL(b);
        setSrc(objUrl);
      } catch (e) {
        if (!ctrl.signal.aborted) { ferdigLastet = true; window.clearTimeout(fallback); setSrc(filUrl); }
      }
    })();
    return () => { ctrl.abort(); window.clearTimeout(fallback); if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [filUrl, redusert]);

  /* Filmen starter når historien starter — ikke før (så bilde og tekst følger hverandre). */
  useEffect(() => {
    const v = vidRef.current;
    if (!v || !film || !src) return;
    if (fase === 'foto' && kjorer) {
      try {
        if (v.currentTime > 0.05 || v.ended) v.currentTime = 0;   // bare spol når vi faktisk starter på nytt
        v.play().catch(() => {});
      } catch (e) { /* ok */ }
    }
  }, [fase, kjorer, film, src]);

  /* Klar = nok data til å spille uten stopp. Sjekk også umiddelbart (kan være bufret fra før). */
  useEffect(() => {
    const v = vidRef.current;
    if (!v || !film || !onKlar || !src) return undefined;
    if (v.readyState >= 3) { onKlar(); return undefined; }
    const f = () => onKlar();
    v.addEventListener('canplaythrough', f);
    v.addEventListener('canplay', f);
    return () => { v.removeEventListener('canplaythrough', f); v.removeEventListener('canplay', f); };
  }, [film, onKlar, src]);

  const pos = egen ? '50% 50%' : (smal ? bilde.posSmal : bilde.pos);
  const felles = {
    className: 'absolute inset-0 h-full w-full object-cover will-change-transform',
    style: {
      objectPosition: pos,
      /* Foto: hvile → svakt innpust (1.035) → langsom drift ut (20 s). Film beveger seg selv — ingen ekstra skala. */
      transform: film && !egen ? 'scale(1)' : ferdig ? 'scale(1.0)' : kjorer ? 'scale(1.035)' : 'scale(1)',
      transition: ferdig ? 'transform 20000ms linear' : 'transform 2600ms cubic-bezier(0.25, 0.1, 0.25, 1)',
      filter: egen ? 'saturate(0.88) contrast(0.97)' : 'none',
    },
  };

  if (film && !egen) {
    const hjem = smal && film.hjemSmal ? film.hjemSmal : film.hjem;
    if (redusert) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={hjem || film.poster} alt="" {...felles} style={{ ...felles.style, objectPosition: '50% 50%' }} />;
    }
    return (
      <>
        <video
          ref={vidRef}
          {...felles}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: pos }}
          poster={smal && film.posterSmal ? film.posterSmal : film.poster}
          muted
          loop={!film.once}
          playsInline
          preload="auto"
          aria-hidden="true"
          src={src || undefined}
          onTimeUpdate={onTid ? (e) => onTid(e.currentTarget.currentTime) : undefined}
          onEnded={onFilmFerdig}
          data-testid="v4-film"
        />
        {/* Fargebro: filmens kjølige kveld glir mot stuas varme før bildet kommer — det er slik en overgang blir usynlig. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: '#E2C6A5', opacity: hjemme ? 0.5 : 0, transition: hjemme ? `opacity 900ms ${EASE}` : 'opacity 0ms linear' }} />
        {/* Stillbildet: han hjemme. Samme bevegelse gjennom klippet (inn, inn) — så pittelitt, nesten umerkelig drift. */}
        {hjem ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 will-change-transform"
            style={{
              opacity: hjemme ? 1 : 0,
              transform: hjemme ? 'scale(1.03)' : 'scale(1)',
              transition: hjemme ? `opacity 1300ms ${EASE}, transform 3600ms ${EASE}` : 'opacity 240ms linear, transform 0ms linear 240ms',
            }}
            data-testid="v4-film-hjem-ramme"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hjem}
              alt=""
              className="absolute inset-0 h-full w-full object-cover will-change-transform"
              style={{ objectPosition: '50% 50%', transform: hjemme ? 'scale(1.055)' : 'scale(1)', transition: hjemme ? 'transform 16000ms cubic-bezier(0.22, 0.61, 0.36, 1) 200ms' : 'transform 0ms linear' }}
              data-testid="v4-film-hjem"
            />
            {/* Subtil overlay: myk vignett + hint av kveldslys — bildet får dybde, teksten står roligere. */}
            <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(115% 105% at 50% 50%, rgba(21,18,15,0) 52%, rgba(21,18,15,0.22) 100%), linear-gradient(180deg, rgba(21,18,15,0.10) 0%, rgba(21,18,15,0) 28%, rgba(21,18,15,0) 72%, rgba(21,18,15,0.12) 100%)' }} />
          </div>
        ) : null}
      </>
    );
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
  const smal = useSmal();
  const redusert = useRedusert();
  const bildet = BILDER[bilde] || BILDER.stue;
  const [egen, setEgen] = useState(null);           // URL til Street View når den finnes
  /* Historien starter når scenen er godt inne i bildet (halve scenen) OG filmen er klar til å spille uten stopp —
     så første bilde aldri hakker. Blir ikke filmen klar (treg linje), starter vi likevel etter 3 s. */
  const synlig = useSynlig(ref, smal ? 0.55 : 0.5);
  const [filmKlar, setFilmKlar] = useState(false);
  const onFilmKlar = useCallback(() => setFilmKlar(true), []);
  const [ventetUt, setVentetUt] = useState(false);
  useEffect(() => {
    if (!synlig || filmKlar) return undefined;
    const t = window.setTimeout(() => setVentetUt(true), 6500);
    return () => window.clearTimeout(t);
  }, [synlig, filmKlar]);
  const harFilm = !!film && !egen;
  const start = synlig && (!harFilm || filmKlar || ventetUt);
  const { fase, er, ferdig, replay, videre, kjorer, holder } = useSekvens(FASER, start);

  /* ── Din adresse → din bolig. Street View via egen proxy når panoramaet er nært nok.
        Byttet skjer sekvensielt: fade ut → bytt → spill fra frame 1. ── */
  const [vist, setVist] = useState(null);
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
    ? RADER.map((r) => (r.fase === 'rad1' ? { ...r, s: 'Betalt · på konto', h: `${tall(18500)}\u00A0kr` } : r.fase === 'rad2' ? { ...r, s: `Emma Sørensen · ${adresse}` } : r))
    : RADER), [vist, adresse]);

  /* Første fase er filmen alene. Fra første rad dempes bildet og panelet er inne. */
  const godkjent = er('godkjent');
  const aktiv = er('rad4') && !godkjent;
  const visKort = er('kort') && !godkjent;
  const venter = holder && fase === 'kort';
  const visSpor = er('sak');

  /* Slutten: historien er ferdig OG filmen har gått ut (han har gått inn) → bildet glir over
     i ham hjemme, panelet trekker seg tilbake og sluttteksten står på veggen til høyre.
     Kommer ikke filmen i mål (nettverk, autoplay blokkert), går vi videre etter en stund. */
  const [filmFerdig, setFilmFerdig] = useState(false);
  const onFilmFerdig = useCallback(() => setFilmFerdig(true), []);
  const [hjemme, setHjemme] = useState(false);
  const kanHjem = !!film && !egen;   // uten film (eller med din egen bolig fra Street View) blir panelet stående
  useEffect(() => {
    if (!ferdig || !kanHjem) return undefined;
    if (redusert) { setHjemme(true); return undefined; }
    /* Filmen er ferdig → liten pust ved døren (kameraet beveger seg fortsatt) → stua. */
    if (filmFerdig) { setHjemme(true); return undefined; }
    const t = window.setTimeout(() => setHjemme(true), 6500);
    return () => window.clearTimeout(t);
  }, [ferdig, filmFerdig, kanHjem, redusert]);
  const inne = er('rad1') && !hjemme;

  /* Sluttbildet hentes i det saken venter — så overgangen aldri må vente på nettet. */
  useEffect(() => {
    if (!film || !er('rad4')) return;
    try { const im = new Image(); im.src = smal && film.hjemSmal ? film.hjemSmal : film.hjem; } catch (e) { /* ok */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, film, smal]);

  const [dato, setDato] = useState('');
  useEffect(() => {
    try { setDato(new Date().toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })); } catch (e) { /* ok */ }
  }, []);

  /* Hvem godkjente? 'deg' når du trykket, 'kari' når historien løste seg selv. */
  const [hvem, setHvem] = useState(null);
  const [trykket, setTrykket] = useState(false);
  const [presser, setPresser] = useState(false);   // knappen trykkes ned — synlig også når historien trykker for deg
  const godkjenn = useCallback((av) => {
    if (trykket || presser || !venter) return;
    setHvem(av);
    if (av === 'deg') {
      setTrykket(true);
      window.setTimeout(() => { videre(); }, 700);
      return;
    }
    /* Historien trykker: ned (180 ms) → slipp, grønn «Godkjent» (900 ms) → videre. */
    setPresser(true);
    window.setTimeout(() => { setPresser(false); setTrykket(true); }, 180);
    window.setTimeout(() => { videre(); }, 180 + 900);
  }, [trykket, presser, venter, videre]);
  useEffect(() => { if (fase === 'foto') { setTrykket(false); setPresser(false); setHvem(null); setFilmFerdig(false); setHjemme(false); } }, [fase]);

  /* Filmen bestemmer når: rett før han legger telefonen i lommen trykker historien — hvis du ikke har gjort det. */
  const onTid = useCallback((t) => {
    if (film && film.trykkVed && t >= film.trykkVed) godkjenn('kari');
    if (film && film.hjemVed && kanHjem && ferdig && t >= film.hjemVed) setHjemme(true);
  }, [film, godkjenn, kanHjem, ferdig]);
  /* Uten film (eller om autoplay er blokkert) trykker historien selv etter en liten stund i hold. */
  useEffect(() => {
    if (!venter || trykket || presser) return undefined;
    const id = window.setTimeout(() => godkjenn('kari'), kanHjem ? 6500 : 2400);
    return () => window.clearTimeout(id);
  }, [venter, trykket, presser, godkjenn, kanHjem]);

  const knappTekst = trykket ? 'Godkjent' : 'Godkjenn';
  const godkjentAv = hvem === 'deg' ? 'Godkjent av deg · nå' : 'Godkjent · 08:02';
  const sporListe = vist ? SPOR.map((sp) => (sp.fase === 'sak' ? { ...sp, d: `Varmtvann · ${adresse}` } : sp)) : SPOR;
  const radT = `opacity 520ms ${EASE} 120ms, transform 520ms ${EASE} 120ms`;

  return (
    <figure ref={figRef} className="relative m-0" data-testid="v4-scene-wrap">
      <div
        ref={ref}
        className="relative w-full overflow-hidden rounded-[20px] sm:rounded-[24px]"
        style={{ aspectRatio: smal ? '4 / 5.6' : '1.92 / 1', minHeight: smal ? 600 : 520, maxHeight: smal ? undefined : 'min(880px, calc(100svh - 124px))', background: T.charcoal, boxShadow: '0 0 0 1px rgba(21,19,15,0.08)', opacity: skifter ? 0 : 1, transition: `opacity 320ms ${EASE}` }}
        role="group"
        aria-label={`Animert eksempel: en dag i ${adresse} med DigiHome — husleie registrert, kontrakt signert, et spørsmål fra leietaker besvart fra kontrakten, og et varmtvannsproblem løst med én godkjenning fra eier.`}
        data-testid="v4-scene"
      >
        {/* ── Virkeligheten ── */}
        <Virkelighet film={film} bilde={bildet} smal={smal} kjorer={kjorer} ferdig={ferdig} redusert={redusert} egen={egen} fase={fase} hjemme={hjemme} onFilmFerdig={onFilmFerdig} onTid={onTid} onKlar={onFilmKlar} />

        {/* Filmen vises først helt ren. Når dagen begynner, dempes bildet — lett, filmen skal fortsatt sees. Slipper igjen hjemme. */}
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,18,15,0.38) 0%, rgba(21,18,15,0.14) 40%, rgba(21,18,15,0.02) 62%, rgba(21,18,15,0.24) 100%)', opacity: inne ? 1 : 0, transition: `opacity ${hjemme ? 900 : 1400}ms ${EASE}` }} />

        {/* ── Slutten: han hjemme. Alt står rett på den lyse veggen — ingen boks. Status · setningen · tre tall fra
              dagen · og adressefeltet, så neste steg er ett felt unna. Aldri over ham. ── */}
        <div
          className={smal ? 'absolute inset-x-0 bottom-0 px-4 pb-5 pt-24' : 'absolute flex flex-col justify-start'}
          style={{
            ...(smal ? {} : { left: '62%', right: '4.5%', top: '11%', bottom: '8%' }),
            color: T.ink,
            background: smal ? 'linear-gradient(180deg, rgba(243,241,236,0) 0%, rgba(243,241,236,0.9) 30%, rgba(243,241,236,0.98) 100%)' : 'none',
            opacity: hjemme ? 1 : 0,
            pointerEvents: hjemme ? 'auto' : 'none',
            transition: `opacity 500ms ${EASE} ${hjemme ? 400 : 0}ms`,
          }}
          aria-hidden={!hjemme}
          data-testid="v4-slutt"
        >
          {(() => {
            /* Teksten kommer når bildet har landet (≈1,4 s), én linje om gangen. */
            const linje = (i) => ({ opacity: hjemme ? 1 : 0, transform: hjemme ? 'none' : 'translateY(14px)', transition: `opacity 900ms ${EASE} ${hjemme ? 1400 + i * 120 : 0}ms, transform 900ms ${EASE} ${hjemme ? 1400 + i * 120 : 0}ms` });
            const tallene = [
              [vist ? `${tall(18500)}\u00A0kr` : `${tall(64500)}\u00A0kr`, vist || smal ? 'Husleie inn' : 'Husleie inn · 8 av 8'],
              ['1 min', smal ? 'Fra melding til rørlegger' : 'Fra Idas melding til rørlegger bestilt'],
              ['1', smal ? 'Godkjenning' : hvem === 'deg' ? 'Godkjenning — din' : 'Godkjenning — alt annet gikk av seg selv'],
            ];
            return (
              <>
                <p className="flex items-center gap-2 text-[13px] sm:text-[13.5px]" style={{ ...linje(0), color: 'rgba(21,19,15,0.58)' }} data-testid="v4-slutt-status">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: '#1F9D55' }} />
                  Alt i orden<span className="opacity-50"> · </span>{adresse}<span className="hidden opacity-50 sm:inline"> · </span><span className="hidden sm:inline">22:42</span>
                </p>
                <h3 className="mt-3 sm:mt-4" style={{ ...display, fontSize: smal ? 38 : 'clamp(44px, 6.6svh, 76px)', lineHeight: 0.95, ...linje(1) }} data-testid="v4-slutt-tittel">
                  Én godkjenning<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
                </h3>
                <p className="mt-3 max-w-[32ch] text-[15.5px] leading-[1.4] sm:mt-3.5 sm:text-[17px]" style={{ ...linje(2), color: 'rgba(21,19,15,0.62)' }}>Resten skjedde mens du gikk hjem.</p>

                {/* Tre tall — rett på veggen, hårlinje over. */}
                <dl className="mt-6 grid grid-cols-3 gap-x-5 border-t pt-4 sm:mt-8 sm:gap-x-8 sm:pt-5" style={{ borderColor: 'rgba(21,19,15,0.14)' }} data-testid="v4-slutt-tall">
                  {tallene.map(([v, l], i) => (
                    <div key={l} className="min-w-0" style={linje(3 + i * 0.6)}>
                      <dd className="m-0 text-[24px] sm:text-[30px] lg:text-[34px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{v}</dd>
                      <dt className="mt-1.5 text-[12px] leading-[1.35] sm:mt-2 sm:text-[13px]" style={{ color: 'rgba(21,19,15,0.55)' }}>{l}</dt>
                    </div>
                  ))}
                </dl>

                {/* Neste steg er ett felt unna. */}
                <div className="mt-6 max-w-[520px] sm:mt-8" style={linje(5.5)}>
                  <AdresseFelt variant="ink" gjennomsiktig />
                  <div className="mt-3 flex items-center justify-between gap-4 text-[13px]" style={{ color: 'rgba(21,19,15,0.55)' }}>
                    <span className="hidden sm:inline">Se hva DigiHome gjør for din bolig.</span>
                    <button type="button" onClick={replay} className="underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" tabIndex={hjemme ? 0 : -1} data-testid="v4-replay">Spill igjen</button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* ── Dagen: ett panel. Alt som skjedde, i rekkefølge — og handlingen der hendelsen er. ── */}
        <div
          className="absolute rounded-[18px] sm:rounded-[20px]"
          style={{
            ...(smal ? { left: 12, right: 12, top: 12 } : { left: 28, top: 28, width: 472 }),
            background: 'rgba(24,21,18,0.90)',
            color: OFF,
            boxShadow: '0 0 0 1px rgba(244,241,234,0.08), 0 40px 80px -40px rgba(0,0,0,0.6)',
            opacity: inne ? 1 : 0,
            transform: inne ? 'none' : hjemme ? 'translateY(-10px) scale(0.985)' : 'translateY(10px)',
            transition: hjemme ? `opacity 450ms ${EASE}, transform 450ms ${EASE}` : `opacity 700ms ${EASE} 200ms, transform 700ms ${EASE} 200ms`,
            pointerEvents: inne ? 'auto' : 'none',
          }}
          aria-hidden={!inne}
          data-testid="v4-stage-dag"
        >
          <div className="p-5 sm:p-6">
            {/* Boligen · status */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={`truncate ${adresse.length > 18 ? 'text-[20px] sm:text-[22px]' : 'text-[22px] sm:text-[24px]'}`} style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, textWrap: 'nowrap' }} data-testid="v4-stage-adresse">{adresse}</p>
                <p className="mt-1 truncate text-[13px]" style={{ color: DIM }}>{under}{dato && <span className="hidden sm:inline"> · I dag, {dato}</span>}</p>
              </div>
              <p className="flex shrink-0 items-center gap-2 pt-1.5 text-[12.5px]" style={{ color: 'rgba(244,241,234,0.78)' }} data-testid="v4-stage-status">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: aktiv ? T.lilla : '#5FCB8A', transition: 'background 400ms' }} />
                <span className="inline-grid">
                  <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>Alt i orden</span>
                  <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>Venter på deg</span>
                </span>
              </p>
            </div>

            {/* Dagen — radene kommer én og én; panelet vokser rolig med dem. Ingenting hopper. */}
            <ul className="mt-4 sm:mt-5" aria-hidden={!er('rad1')}>
              {rader.map((r) => {
                const vis = er(r.fase);
                return (
                  <li key={r.tid} className={r.skjulMobil ? 'hidden sm:grid' : 'grid'} style={{ gridTemplateRows: vis ? '1fr' : '0fr', transition: `grid-template-rows 520ms ${EASE}` }}>
                    <div className="min-h-0 overflow-hidden">
                      <div className="border-t py-3 sm:py-3.5" style={{ borderColor: HAIR, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: radT }}>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 sm:grid-cols-[44px_minmax(0,1fr)_auto]">
                          <span className="hidden pt-[2px] text-[13px] tabular-nums sm:block" style={{ color: 'rgba(244,241,234,0.45)' }}>{r.tid}</span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-medium leading-[1.3]" style={{ color: r.sak ? OFF : 'rgba(244,241,234,0.9)' }}>
                              {r.t}<span className="ml-2 text-[12px] font-normal tabular-nums sm:hidden" style={{ color: 'rgba(244,241,234,0.45)' }}>{r.tid}</span>
                            </span>
                            <span className={`mt-0.5 block text-[13.5px] leading-[1.4] ${r.kompaktMobil ? 'hidden sm:block' : ''}`} style={{ color: DIM }}>{smal && r.sMobil ? r.sMobil : r.s}</span>
                          </span>
                          <span className="shrink-0 pt-[2px] text-right text-[13.5px] tabular-nums" style={{ color: 'rgba(244,241,234,0.82)' }}>
                            {r.sak ? (
                              <span className="inline-grid">
                                <span className="col-start-1 row-start-1 inline-flex items-center justify-end gap-1.5 whitespace-nowrap" style={{ color: T.lilla, opacity: godkjent ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} /><span className="hidden sm:inline">Venter</span>
                                </span>
                                <span className="col-start-1 row-start-1 inline-flex items-center justify-end whitespace-nowrap" style={{ color: '#5FCB8A', opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 300ms` }}>
                                  <HakeIkon />
                                </span>
                              </span>
                            ) : r.h ? <span>{r.h}</span> : <HakeIkon className="text-[#5FCB8A]" />}
                          </span>
                        </div>

                        {r.sak ? (
                          <div className="sm:pl-[60px]">
                            {/* Det systemet gjorde — utført. */}
                            <div className="grid" style={{ gridTemplateRows: visSpor ? '1fr' : '0fr', transition: `grid-template-rows 450ms ${EASE}` }}>
                              <div className="min-h-0 overflow-hidden">
                                <ul className="mt-3 flex flex-col gap-1.5" data-testid="v4-spor">
                                  {sporListe.map((sp) => {
                                    const v = er(sp.fase);
                                    return (
                                      <li key={sp.fase} className="flex items-center gap-2.5 text-[13px]" style={{ opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(4px)', transition: `opacity 320ms ${EASE}, transform 320ms ${EASE}` }}>
                                        <HakeIkon className="shrink-0 text-[#5FCB8A]" />
                                        <span className="shrink-0 font-medium" style={{ color: 'rgba(244,241,234,0.9)' }}>{sp.t}</span>
                                        <span className="min-w-0 truncate" style={{ color: DIM }}>{smal && sp.dMobil ? sp.dMobil : sp.d}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>

                            {/* Handlingen — der hendelsen er. Systemet har stoppet. Knappen venter på deg. */}
                            <div className="grid" style={{ gridTemplateRows: er('krev') ? '1fr' : '0fr', transition: `grid-template-rows 500ms ${EASE}` }}>
                              <div className="min-h-0 overflow-hidden">
                                <div
                                  className="mt-3.5 rounded-[12px] p-3.5 sm:p-4"
                                  style={{
                                    background: godkjent ? 'rgba(95,203,138,0.10)' : 'rgba(244,241,234,0.06)',
                                    boxShadow: `inset 0 0 0 1px ${godkjent ? 'rgba(95,203,138,0.24)' : 'rgba(244,241,234,0.08)'}`,
                                    opacity: er('krev') ? 1 : 0,
                                    transform: er('krev') ? 'none' : 'translateY(6px)',
                                    transition: `opacity 480ms ${EASE} 100ms, transform 480ms ${EASE} 100ms, background 600ms ${EASE}, box-shadow 600ms ${EASE}`,
                                  }}
                                  data-testid="v4-kort"
                                >
                                  <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
                                    {/* Før: pris + Godkjenn */}
                                    <div className="col-start-1 row-start-1 flex min-w-0 items-center justify-between gap-4" style={{ opacity: godkjent ? 0 : 1, transform: godkjent ? 'translateY(-4px)' : 'none', pointerEvents: godkjent ? 'none' : 'auto', transition: `opacity 260ms ${EASE}, transform 260ms ${EASE}` }} aria-hidden={godkjent}>
                                      <div className="min-w-0">
                                        <p className="truncate text-[12.5px]" style={{ color: DIM }}>Til godkjenning<span className="hidden sm:inline"> · Rørlegger AS, torsdag 09:00</span></p>
                                        <p className="mt-1 text-[26px] sm:text-[28px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(3450)} kr</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => godkjenn('deg')}
                                        tabIndex={visKort ? 0 : -1}
                                        aria-label={`Godkjenn rørlegger, ${tall(3450)} kroner`}
                                        className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-5 text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`}
                                        style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink, transform: presser ? 'scale(0.93)' : 'none', transition: `background-color 200ms, transform ${presser ? 160 : 260}ms ${EASE}` }}
                                        data-testid="v4-godkjenn"
                                      >
                                        {trykket && <HakeIkon />}{knappTekst}
                                      </button>
                                    </div>
                                    {/* Etter: godkjent · bestilt · varslet */}
                                    <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3" style={{ opacity: godkjent ? 1 : 0, transform: godkjent ? 'none' : 'translateY(6px)', transition: `opacity 420ms ${EASE} 280ms, transform 420ms ${EASE} 280ms` }} aria-hidden={!godkjent} data-testid="v4-godkjent">
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: T.gronn, color: '#fff' }}><HakeIkon /></span>
                                      <span className="min-w-0">
                                        <span className="block text-[14px] font-medium">{godkjentAv}</span>
                                        <span className="mt-0.5 block truncate text-[13px]" style={{ color: DIM }}>{smal && r.s2Mobil ? r.s2Mobil : r.s2}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Sluttlinje i panelet — bare når scenen ikke går hjem (egen bolig fra Street View / uten film). */}
            <div className="grid" style={{ gridTemplateRows: ferdig && !kanHjem ? '1fr' : '0fr', transition: `grid-template-rows 500ms ${EASE}` }} aria-hidden={!(ferdig && !kanHjem)}>
              <div className="min-h-0 overflow-hidden">
                <div className="mt-3.5 flex items-center justify-between gap-4 border-t pt-4 text-[13px]" style={{ borderColor: HAIR, color: DIM, opacity: ferdig && !kanHjem ? 1 : 0, transition: `opacity 500ms ${EASE} 200ms` }}>
                  <span>Én godkjenning. Resten gjorde DigiHome.</span>
                  <button type="button" onClick={replay} className="shrink-0 underline decoration-[#F4F1EA]/30 underline-offset-4 transition-colors hover:text-[#F4F1EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" tabIndex={ferdig && !kanHjem ? 0 : -1} data-testid="v4-replay-panel">Spill igjen</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
