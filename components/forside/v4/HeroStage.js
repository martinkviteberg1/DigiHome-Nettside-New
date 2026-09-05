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
  /* Sluttbildet lever: han i sofaen, kvelden er hans. Sømløs 14 s loop (scripts/lag-hjemme-loop.py) — H.264 1920/1280,
     VP9 som reserve, første bilde som poster. Stillbildene over brukes ved redusert bevegelse. */
  hjemVideo: '/v4/video/eier-hjemme-loop-1920.mp4?v=2',
  hjemVideoSmal: '/v4/video/eier-hjemme-loop-1280.mp4?v=2',
  hjemVideoWebm: '/v4/video/eier-hjemme-loop-1280.webm?v=2',
  hjemPoster: '/v4/video/eier-hjemme-loop-poster.webp?v=2',
  /* direkte: heroen åpner rett i sofaen — ingen gåtur, ingen panelhistorie. Loopen er scenen fra første bilde;
     tekst og feeden fra mobilen kommer inn i rolig rekkefølge. (Din adresse → Street View-flyten er som før.) */
  direkte: true,
  /* Sekundet der han fortsatt leser — rett før telefonen går i lommen. Har du ikke trykket, trykker historien her. */
  trykkVed: 7.4,
  /* Filmen er 12,04 s og slutter med ham på trappen foran døren. Dissolven til stua starter `hjemVed` — så sent at
     hele gangen inn til døren spilles ferdig, og de siste bildene (han står ved døren) ligger under overgangen.
     Timeren settes presist fra filmens klokke (ikke bare timeupdate, som tikker hvert ~250 ms). Filmen selv rører
     vi aldri (ingen transform/zoom på video-elementet). `ended` er reserve. */
  hjemVed: 11.9,
  once: true,
};

/* ---------------------------------------------------------------------------
   Telefonstrøm — det som skjer i DigiHome-appen mens han sitter i sofaen.
   En glassflate «projiseres» opp fra telefonen hans, bundet til skjermen med
   én hårlinje: DigiHome-feeden. Hvert tredje sekund kommer en ny hendelse inn
   øverst (husleie inn, Emma bekrefter, faktura bokført …), de eldre glir ned,
   den eldste slipper — og en stille ring treffer skjermen. Ingen fingre å
   synkronisere mot; rytmen er systemets.

   Telefonen ligger på ~(33 %, 50 %) av filmbildet (30:17). Scenen har et
   annet format (1.92:1 / 4:5.6) og filmen dekker (object-cover), så punktet
   regnes om fra scenens målte størrelse. Kun transform/opacity (+ animert
   grid-template-rows på radene).
--------------------------------------------------------------------------- */
const TELEFON = { x: 0.33, y: 0.503 };      // toppen av skjermen, i filmens koordinater
const FILM_ASPEKT = 30 / 17;
/* Rekkefølgen følger veggen: Annonse → Kontrakt → Økonomi → Drift. Ingen beløp, ingen «forfaller». */
const STROM = [
  { id: 'visning', t: 'Visning booket', u: 'Lørdag 12:00 · 2 påmeldte', ikon: 'prikk' },
  { id: 'kontrakt', t: 'Kontrakt signert', u: 'Leilighet 3 · BankID', ikon: 'hake' },
  { id: 'regnskap', t: 'Regnskapet er ført', u: 'September · 8 av 8 betalt', ikon: 'hake' },
  { id: 'emma', t: 'Emma bekreftet', u: '«Varmt vann igjen. Takk!»', bilde: '/v4/annonse/leietaker-emma.webp' },
];
const STROM_START = 2400; const STROM_TAKT = 3000; const STROM_ETTER = 1300;
const STROM_TID = ['nå', '3 min', '9 min', '14 min'];

function StromIkon({ m }) {
  if (m.bilde) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.bilde} alt="" width={26} height={26} className="h-[26px] w-[26px] shrink-0 rounded-full object-cover" draggable={false} />;
  }
  if (m.ikon === 'hake') return <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.14)', color: '#166B3C' }}><svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
  return <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(212,150,255,0.24)' }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} /></span>;
}

function Telefonstrom({ hjemme, redusert, smal, puls }) {
  const ref = useRef(null);
  const [maal, setMaal] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const f = () => setMaal({ w: el.offsetWidth, h: el.offsetHeight });
    f();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(f) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  /* Hendelsene følger veggfortellingen: `puls` øker én gang per beat, og hendelsen kommer opp av telefonen litt
     etter at veggen har sagt det (STROM_ETTER). Uten puls (Street View-flyten) går strømmen i egen takt. */
  const [n, setN] = useState(-1);
  useEffect(() => {
    if (!hjemme || redusert) { setN(-1); return undefined; }
    if (puls === null) return undefined;               // synkronisert, men veggen har ikke sagt noe enda (eller siste beat)
    if (puls !== undefined) {
      const t = window.setTimeout(() => setN(puls), STROM_ETTER);
      return () => window.clearTimeout(t);
    }
    let id = 0;
    const t = window.setTimeout(() => { setN(0); id = window.setInterval(() => setN((k) => k + 1), STROM_TAKT); }, STROM_START);
    return () => { window.clearTimeout(t); if (id) window.clearInterval(id); };
  }, [hjemme, redusert, puls]);

  /* Filmpunkt → scenepunkt (object-cover, sentrert) */
  const A = maal.w && maal.h ? maal.w / maal.h : FILM_ASPEKT;
  const px = A >= FILM_ASPEKT ? TELEFON.x : 0.5 + (TELEFON.x - 0.5) * (FILM_ASPEKT / A);
  const py = A >= FILM_ASPEKT ? 0.5 + (TELEFON.y - 0.5) * (A / FILM_ASPEKT) : TELEFON.y;
  const X = px * maal.w; const Y = py * maal.h;
  const B = smal ? 212 : 252;
  /* Flaten står opp og til høyre for skjermen — over skulderen, aldri over ansiktet. Bunnen bindes til skjermen. */
  const fx = X + (smal ? 16 : Math.round(maal.w * 0.034)); const fy = Y - (smal ? 26 : Math.round(maal.h * 0.042));
  const inne = n >= 0;
  const rader = inne ? [n, n - 1, n - 2, n - 3].filter((k) => k >= 0) : [];

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3] overflow-hidden" data-testid="v4-telefonstrom" data-n={n}>
      {maal.w > 0 && hjemme && !redusert && (
        <>
          {/* Ringen på skjermen — hver gang noe nytt kommer */}
          {inne && <span key={`ring-${n}`} className="absolute h-3 w-3 rounded-full" style={{ left: X - 6, top: Y - 6, boxShadow: '0 0 0 1.5px rgba(251,250,248,0.9)', animation: 'v4-ping 1300ms cubic-bezier(0.2, 0.6, 0.2, 1) forwards', opacity: 0 }} />}
          {/* Hårlinjen fra skjermen opp til flatens nedre venstre hjørne */}
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${maal.w} ${maal.h}`} preserveAspectRatio="none" style={{ opacity: inne ? 1 : 0, transition: `opacity 500ms ${EASE} 300ms` }}>
            <line x1={X + 4} y1={Y - 2} x2={fx + 16} y2={fy + 1} stroke="rgba(251,250,248,0.6)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <circle cx={X + 4} cy={Y - 2} r="2" fill="rgba(251,250,248,0.95)" />
          </svg>
          {/* Flaten */}
          <div className="absolute" style={{ left: fx, bottom: maal.h - fy, width: B, transformOrigin: '0% 100%', opacity: inne ? 1 : 0, transform: inne ? 'translateY(0px) scale(1)' : 'translateY(14px) scale(0.94)', transition: `opacity 600ms ${EASE} 500ms, transform 800ms cubic-bezier(0.2, 0.7, 0.2, 1) 500ms`, willChange: 'transform, opacity' }} data-testid="v4-strom-flate">
            <div className="overflow-hidden rounded-[18px] px-3 pb-2 pt-2.5" style={{ background: smal ? 'rgba(251,250,248,0.94)' : 'rgba(251,250,248,0.80)', backdropFilter: smal ? 'none' : 'blur(14px) saturate(1.2)', WebkitBackdropFilter: smal ? 'none' : 'blur(14px) saturate(1.2)', color: T.ink, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.75), 0 24px 60px -24px rgba(0,0,0,0.6), 0 2px 10px -2px rgba(0,0,0,0.25)' }}>
              <div className="flex items-center justify-between px-0.5 text-[10.5px] font-medium" style={{ color: 'rgba(21,19,15,0.55)' }}>
                <span className="inline-flex items-center gap-1.5">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/brand/digihome-icon-purple.svg" alt="" width={12} height={12} className="h-3 w-3" draggable={false} />DigiHome</span>
                <span>Nygårdsgaten 5</span>
              </div>
              <div className="mt-1">
                {rader.map((k, i) => {
                  const m = STROM[k % STROM.length];
                  const ut = i === 3;
                  return (
                    <div key={k} className="grid" style={{ gridTemplateRows: ut ? '0fr' : '1fr', opacity: ut ? 0 : 1, transition: `grid-template-rows 600ms ${EASE}, opacity 400ms ${EASE}`, animation: i === 0 ? `v4-feed-inn 650ms cubic-bezier(0.2, 0.7, 0.2, 1) both` : 'none' }} data-testid={`v4-strom-${m.id}`}>
                      <div className="min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2.5 py-2" style={{ borderTop: i === 0 ? '1px solid transparent' : '1px solid rgba(21,19,15,0.07)' }}>
                          <StromIkon m={m} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-medium leading-[1.25]">{m.t}</span>
                            <span className="block truncate text-[11px] leading-[1.3]" style={{ color: 'rgba(21,19,15,0.56)' }}>{m.u}</span>
                          </span>
                          <span className="shrink-0 text-[10.5px] tabular-nums" style={{ color: 'rgba(21,19,15,0.45)' }}>{STROM_TID[i] || ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
  { navn: 'godkjent', ms: 1000 },   // grønn «Godkjent» leses — så oppsummerer panelet seg
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
function Virkelighet({ film, bilde, smal, kjorer, ferdig, redusert, egen, fase, hjemme, direkte = false, onFilmFerdig, onTid, onKlar }) {
  const vidRef = useRef(null);
  const hjemRef = useRef(null);

  /* Loopen hjemme: hentes først når historien er i gang (så den ikke konkurrerer med filmen om båndbredden),
     og spilles fra start idet stua kommer opp av mørket. Ingen transform på selve video-elementet.
     I direkte-modus er loopen selve scenen: hentes og spilles fra første stund. */
  useEffect(() => {
    const v = hjemRef.current;
    if (!v || !film?.hjemVideo || redusert) return;
    if ((kjorer || direkte) && v.preload !== 'auto') { try { v.preload = 'auto'; v.load(); } catch (e) { /* ok */ } }
  }, [kjorer, direkte, film, redusert]);
  useEffect(() => {
    const v = hjemRef.current;
    if (!v || !film?.hjemVideo || redusert) return;
    try {
      if (hjemme || direkte) { if (!direkte && v.currentTime > 0.05) v.currentTime = 0; v.play().catch(() => {}); } else if (!v.paused) v.pause();
    } catch (e) { /* ok */ }
  }, [hjemme, direkte, film, redusert]);

  /* Filmen ligger i HTML-en fra serveren (<source> med media/type) — nettleseren begynner å hente den idet
     siden parses, lenge før React er hydrert. Ingen fetch→blob først (det var 2–3 MB å vente på før første
     bilde). Kildevalget skjer i nettleseren: 1280 på smal skjerm, 1920 ellers, VP9 der H.264 mangler. */

  /* Filmen starter når historien starter — ikke før (så bilde og tekst følger hverandre). */
  useEffect(() => {
    const v = vidRef.current;
    if (!v || !film || redusert) return;
    if (fase === 'foto' && kjorer) {
      try {
        if (v.currentTime > 0.05 || v.ended) v.currentTime = 0;   // bare spol når vi faktisk starter på nytt
        v.play().catch(() => {});
      } catch (e) { /* ok */ }
    }
  }, [fase, kjorer, film, redusert]);

  /* Klar = nok data til å begynne å spille (HAVE_FUTURE_DATA). Sjekk også umiddelbart (kan være bufret fra før).
     Resten av filen strømmer inn mens den spiller — 12 s film, 1,2–2,5 MB. */
  useEffect(() => {
    const v = vidRef.current;
    if (!v || !film || !onKlar || redusert) return undefined;
    if (v.readyState >= 3) { onKlar(); return undefined; }
    const f = () => onKlar();
    v.addEventListener('canplaythrough', f);
    v.addEventListener('canplay', f);
    v.addEventListener('loadeddata', f);
    return () => { v.removeEventListener('canplaythrough', f); v.removeEventListener('canplay', f); v.removeEventListener('loadeddata', f); };
  }, [film, onKlar, redusert]);

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
    const visHjem = direkte || hjemme;
    return (
      <>
        {!direkte && (
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
            onTimeUpdate={onTid ? (e) => onTid(e.currentTarget.currentTime) : undefined}
            onEnded={onFilmFerdig}
            data-testid="v4-film"
          >
            {/* Nettleseren velger: smal skjerm → 1280, ellers 1920. Uten H.264 (enkelte Linux-bygg) → VP9. */}
            {film.loopSmal ? <source src={film.loopSmal} type='video/mp4; codecs="avc1.640028"' media="(max-width: 639px)" /> : null}
            <source src={film.loop} type='video/mp4; codecs="avc1.640028"' />
            {film.loopWebm ? <source src={film.loopWebm} type="video/webm" /> : null}
          </video>
        )}
        {/* Stua: han hjemme. Etter filmen kommer den opp av mørket med et lite «setter seg» (1.05 → 1) og et varmt
            lysoverskudd som stilner. I direkte-modus står den der fra første bilde. */}
        {hjem ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 will-change-transform"
            style={{
              opacity: visHjem ? 1 : 0,
              transform: visHjem ? 'scale(1)' : 'scale(1.05)',
              transition: direkte ? 'none' : visHjem ? `opacity 420ms linear 380ms, transform 3000ms ${EASE} 520ms` : 'opacity 240ms linear, transform 0ms linear 240ms',
            }}
            data-testid="v4-film-hjem-ramme"
          >
            {film.hjemVideo ? (
              <video
                ref={hjemRef}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: '50% 50%' }}
                poster={film.hjemPoster || hjem}
                muted
                loop
                playsInline
                autoPlay={direkte}
                preload={direkte ? 'auto' : 'none'}
                aria-hidden="true"
                data-testid="v4-film-hjem"
              >
                {film.hjemVideoSmal ? <source src={film.hjemVideoSmal} type='video/mp4; codecs="avc1.640028"' media="(max-width: 639px)" /> : null}
                <source src={film.hjemVideo} type='video/mp4; codecs="avc1.640028"' />
                {film.hjemVideoWebm ? <source src={film.hjemVideoWebm} type="video/webm" /> : null}
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hjem}
                alt=""
                className="absolute inset-0 h-full w-full object-cover will-change-transform"
                style={{ objectPosition: '50% 50%', transform: hjemme ? 'scale(1.045)' : 'scale(1)', transition: hjemme ? 'transform 16000ms cubic-bezier(0.22, 0.61, 0.36, 1) 2200ms' : 'transform 0ms linear' }}
                data-testid="v4-film-hjem"
              />
            )}
            {/* Lysoverskudd: varmt lys som stilner idet rommet kommer til syne (bare etter filmen) */}
            {!direkte && <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(85% 75% at 60% 38%, rgba(255,236,212,0.62) 0%, rgba(255,236,212,0.26) 55%, rgba(255,236,212,0) 100%)', opacity: hjemme ? 0 : 1, transition: hjemme ? `opacity 1700ms ${EASE} 700ms` : 'opacity 0ms linear' }} />}
            {/* Subtil overlay: myk vignett + hint av kveldslys — bildet får dybde, teksten står roligere. */}
            <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(115% 105% at 50% 50%, rgba(21,18,15,0) 52%, rgba(21,18,15,0.22) 100%), linear-gradient(180deg, rgba(21,18,15,0.10) 0%, rgba(21,18,15,0) 28%, rgba(21,18,15,0) 72%, rgba(21,18,15,0.12) 100%)' }} />
          </div>
        ) : null}
        {/* Dyppet: filmen går ned i varm mørke (≈0,6 s), stua kommer opp av den (≈1,3 s). Bare etter filmen. */}
        {!direkte && <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: '#17120E', opacity: 0, animation: hjemme ? 'v4-dipp 1900ms linear both' : 'none' }} data-testid="v4-dipp" />}
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

/* ---------------------------------------------------------------------------
   Veggfortellingen — den lyse veggen til høyre for ham er ikke plass til én setning, men til historien om hva
   DigiHome er. Fem beats, kort: Annonse → Kontrakt → Økonomi → Drift → «Kvelden er din.» Hvert beat er én
   setning i display, ord for ord (blur-inn), én linje under, og et stille register nederst (Annonse · Kontrakt ·
   Økonomi · Drift) der det aktive ordet er blekk. Siste beat holder lenger og viser dagens tall. Så begynner det
   igjen — som loopen. Telefonstrømmen følger fortellingen: idet veggen sier «Annonsen skriver seg selv.», kommer
   «Visning booket» opp fra telefonen hans. Én koreografi, to flater.
   Kun opacity/transform/filter på små tekstelementer. Faste minimumshøyder — ingenting hopper.
--------------------------------------------------------------------------- */
const FORTELLING = [
  { id: 'annonse', ord: ['Annonsen', 'skriver', 'seg', 'selv.'], u: 'Fem bilder fra mobilen. Ferdig annonse — ute på FINN.', ms: 3300 },
  { id: 'kontrakt', ord: ['Signert', 'med', 'BankID.'], u: 'Leietaker, kontrakt, depositum og overtakelse — i samme flyt.', ms: 3300 },
  { id: 'okonomi', ord: ['Betalt.', 'Bokført.'], u: 'Husleien kommer inn hver måned. Regnskapet fører seg selv.', ms: 3300 },
  { id: 'drift', ord: ['Noe', 'skjer.', 'Rørlegger', 'booket.'], u: 'Leietakeren melder fra i appen. Du godkjenner. Resten går.', ms: 3400 },
  { id: 'kveld', ord: ['Kvelden', 'er', 'din'], u: 'Alt som kan gå av seg selv, gjør det. Du godkjenner resten.', ms: 7200, slutt: true },
];
const REGISTER = [
  { id: 'annonse', t: 'Annonse' },
  { id: 'kontrakt', t: 'Kontrakt' },
  { id: 'okonomi', t: 'Økonomi' },
  { id: 'drift', t: 'Drift' },
];
const FORTELLING_T0 = 1500;   // rommet må komme opp av mørket før teksten begynner
const FORTELLING_PAUSE = 340; // det gamle går ut, så kommer det nye

/* Klokken for fortellingen. `aktiv` = veggen er synlig (hjemme). Returnerer beat (k), om ordene står (vis) og
   runden (for telefonstrømmen). Redusert bevegelse: siste beat, stille. */
function useFortelling(aktiv, redusert) {
  const [k, setK] = useState(0);
  const [vis, setVis] = useState(false);
  const [runde, setRunde] = useState(0);
  const startet = useRef(false);
  useEffect(() => {
    if (!aktiv) { startet.current = false; setK(0); setVis(false); setRunde(0); return undefined; }
    if (redusert) { setK(FORTELLING.length - 1); setVis(true); return undefined; }
    let t;
    if (vis) {
      t = window.setTimeout(() => setVis(false), FORTELLING[k].ms);
    } else {
      t = window.setTimeout(() => {
        if (startet.current) {
          if (k === FORTELLING.length - 1) setRunde((r) => r + 1);
          setK((kk) => (kk + 1) % FORTELLING.length);
        }
        startet.current = true;
        setVis(true);
      }, startet.current ? FORTELLING_PAUSE : FORTELLING_T0);
    }
    return () => window.clearTimeout(t);
  }, [aktiv, redusert, vis, k]);
  /* Pulsen til telefonen: én per beat i de fire første — telefonen får hendelsen litt etter at veggen har sagt det */
  const puls = aktiv && !redusert && startet.current && k < REGISTER.length ? runde * REGISTER.length + k : null;
  return { k, vis, runde, puls };
}

function Veggfortelling({ hjemme, direkte, smal, fort, adresse, vist, hvem, replay }) {
  const { k, vis } = fort;
  /* Uten direkte-modus (din adresse → Street View) står veggen som før: én setning, én linje, feltet. */
  const beat = direkte ? FORTELLING[k] : { id: 'auto', ord: ['Utleie', 'på', 'autopilot'], u: 'Én godkjenning. Resten skjedde mens du gikk hjem.', slutt: true };
  const inne = direkte ? hjemme && vis : hjemme;
  const T0 = direkte ? 0 : FORTELLING_T0;
  /* Konstantene (status, hårlinje, registeret) kommer én gang med rommet; beat-teksten følger klokken */
  const fast = (i) => ({ opacity: hjemme ? 1 : 0, transform: hjemme ? 'none' : 'translateY(12px)', transition: `opacity 900ms ${EASE} ${hjemme ? FORTELLING_T0 + i * 130 : 0}ms, transform 900ms ${EASE} ${hjemme ? FORTELLING_T0 + i * 130 : 0}ms` });
  /* Ordene monteres på nytt per beat (key) — derfor keyframes, ikke transitions: inn (blur, nedenfra) når de står,
     ut (opp, blur) når beatet er over. Før rommet er oppe: bare skjult. */
  const ut = direkte && hjemme && !vis;
  const ordStil = (i) => (inne
    ? { animation: `v4-ord-inn 820ms ${EASE} ${T0 + 120 + i * 120}ms both`, willChange: 'transform, opacity' }
    : ut ? { animation: `v4-ord-ut 300ms ${EASE} ${i * 24}ms both` } : { opacity: 0 });
  const linjeStil = (d) => (inne
    ? { animation: `v4-linje-inn 820ms ${EASE} ${T0 + d}ms both` }
    : ut ? { animation: `v4-linje-ut 280ms ${EASE} 60ms both` } : { opacity: 0 });
  const husleie = vist ? `${tall(18500)}\u00A0kr` : `${tall(64500)}\u00A0kr`;
  const slutt = !!beat.slutt;
  const fs = smal ? (direkte ? 36 : 42) : direkte ? 'clamp(38px, 5.4svh, 62px)' : 'clamp(48px, 7.4svh, 86px)';
  return (
    <div
      className={smal ? 'absolute inset-x-0 bottom-0 px-4 pb-5 pt-24' : 'absolute flex flex-col justify-center'}
      style={{
        ...(smal ? {} : { left: '61%', right: '5%', top: '8%', bottom: '8%' }),
        color: T.ink,
        background: smal ? 'linear-gradient(180deg, rgba(243,241,236,0) 0%, rgba(243,241,236,0.9) 30%, rgba(243,241,236,0.98) 100%)' : 'none',
        opacity: hjemme ? 1 : 0,
        pointerEvents: hjemme ? 'auto' : 'none',
        transition: `opacity 500ms ${EASE} ${hjemme ? 900 : 0}ms`,
      }}
      aria-hidden={!hjemme}
      data-testid="v4-slutt"
      data-beat={beat.id}
    >
      <p className="flex items-center gap-2 text-[13px] sm:text-[13.5px]" style={{ ...fast(0), color: 'rgba(21,19,15,0.58)' }} data-testid="v4-slutt-status">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: '#1F9D55' }} />
        Alt i orden<span className="opacity-50"> · </span>{adresse}<span className="hidden opacity-50 sm:inline"> · </span><span className="hidden sm:inline">{direkte ? 'torsdag kveld' : '22:42'}</span>
      </p>
      {/* Setningen — fast høyde for to linjer, så ingenting under flytter seg mellom beatene */}
      <h3 className="mt-3 sm:mt-5" style={{ ...display, fontSize: fs, lineHeight: 0.96, letterSpacing: '-0.04em', ...(direkte ? { minHeight: 'calc(2 * 0.96em)', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-end' } : {}) }} data-testid="v4-slutt-tittel">
        {beat.ord.map((o, i) => (
          <span key={`${beat.id}-${i}`} className="inline-block" style={{ ...ordStil(i), marginRight: i < beat.ord.length - 1 ? '0.22em' : 0 }}>
            {o}{slutt && i === beat.ord.length - 1 ? <span style={{ color: T.lilla, marginLeft: '0.02em' }}>.</span> : null}
          </span>
        ))}
      </h3>
      <p key={`u-${beat.id}`} className="mt-4 max-w-[30ch] text-[16px] leading-[1.42] sm:mt-5 sm:text-[18px]" style={{ ...linjeStil(120 + beat.ord.length * 120), color: 'rgba(21,19,15,0.66)', minHeight: direkte ? '2.84em' : undefined }}>{beat.u}</p>

      {/* Hårlinjen tegnes én gang — under den: registeret (hva DigiHome er) i de fire beatene, dagens tall i det siste */}
      <div aria-hidden="true" className="mt-7 h-px sm:mt-9" style={{ background: 'rgba(21,19,15,0.16)', transform: hjemme ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: '0 50%', transition: `transform 1200ms ${EASE} ${hjemme ? FORTELLING_T0 + 800 : 0}ms` }} />
      <div className="mt-4 grid" style={fast(7.5)}>
        {direkte && (
          <p className="col-start-1 row-start-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] sm:text-[13.5px]" style={{ opacity: slutt ? 0 : 1, transition: `opacity 500ms ${EASE} ${slutt ? 0 : 200}ms` }} aria-hidden={slutt} data-testid="v4-register">
            {REGISTER.map((r, i) => {
              const paa = r.id === beat.id;
              return (
                <span key={r.id} className="inline-flex items-center gap-2 tabular-nums" style={{ color: paa ? T.ink : 'rgba(21,19,15,0.38)', fontWeight: paa ? 500 : 400, transition: `color 500ms ${EASE}` }} data-paa={paa ? '1' : '0'}>
                  <span className="text-[11px]" style={{ color: paa ? '#7A3FB0' : 'rgba(21,19,15,0.30)', transition: `color 500ms ${EASE}` }}>0{i + 1}</span>
                  {r.t}
                </span>
              );
            })}
          </p>
        )}
        <p className="col-start-1 row-start-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] tabular-nums sm:text-[13.5px]" style={{ color: 'rgba(21,19,15,0.56)', opacity: slutt ? 1 : 0, transition: `opacity 500ms ${EASE} ${slutt ? 300 : 0}ms` }} aria-hidden={!slutt} data-testid="v4-slutt-tall">
          <span><span style={{ color: T.ink, fontWeight: 500 }}>{husleie}</span> husleie inn</span>
          <span className="opacity-40">·</span>
          {direkte ? (
            <span><span style={{ color: T.ink, fontWeight: 500 }}>3</span> {smal ? 'spørsmål besvart' : 'leietakerspørsmål besvart'}</span>
          ) : (
            <span><span style={{ color: T.ink, fontWeight: 500 }}>1 min</span> {smal ? 'til rørlegger' : 'fra melding til rørlegger bestilt'}</span>
          )}
          <span className="opacity-40">·</span>
          <span><span style={{ color: T.ink, fontWeight: 500 }}>1</span> godkjenning{hvem === 'deg' || direkte ? ' — din' : ''}</span>
        </p>
      </div>

      {/* Neste steg er ett felt unna (ikke i direkte-modus — feltet står allerede over scenen). */}
      {!direkte && (
        <div className="mt-7 max-w-[520px] sm:mt-9" style={fast(9.5)}>
          <AdresseFelt variant="ink" gjennomsiktig />
          <div className="mt-3 flex items-center justify-between gap-4 text-[13px]" style={{ color: 'rgba(21,19,15,0.55)' }}>
            <span className="hidden sm:inline">Skriv adressen din — se hva som går av seg selv.</span>
            <button type="button" onClick={replay} className="underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" tabIndex={hjemme ? 0 : -1} data-testid="v4-replay">Spill igjen</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HeroStage({ eiendom, bilde = 'stue', film = FILM }) {
  const ref = useRef(null);
  const figRef = useRef(null);
  const smal = useSmal();
  const redusert = useRedusert();
  const bildet = BILDER[bilde] || BILDER.stue;
  const [egen, setEgen] = useState(null);           // URL til Street View når den finnes
  /* Historien starter når scenen er godt inne i bildet (halve scenen) OG filmen har nok data til å begynne —
     så første bilde aldri hakker. Filmen hentes fra HTML-parsing, så dette er normalt umiddelbart. Blir den
     ikke klar (treg linje), starter vi likevel etter 2,5 s. */
  const synlig = useSynlig(ref, smal ? 0.55 : 0.7);
  /* Ikke i det siden laster: filmen begynner idet du scroller og scenen er inne (70 % synlig) — kjapt på scroll.
     Scroller du ikke (hele scenen synlig fra start, du bare ser), starter den etter 4 s. */
  const [roet, setRoet] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setRoet(true), 4000);
    const f = () => setRoet(true);
    const opts = { passive: true, once: true };
    window.addEventListener('scroll', f, opts);
    window.addEventListener('wheel', f, opts);
    window.addEventListener('touchmove', f, opts);
    return () => { window.clearTimeout(t); window.removeEventListener('scroll', f); window.removeEventListener('wheel', f); window.removeEventListener('touchmove', f); };
  }, []);
  const [filmKlar, setFilmKlar] = useState(false);
  const onFilmKlar = useCallback(() => setFilmKlar(true), []);
  const [ventetUt, setVentetUt] = useState(false);
  useEffect(() => {
    if (!synlig || filmKlar) return undefined;
    const t = window.setTimeout(() => setVentetUt(true), 2500);
    return () => window.clearTimeout(t);
  }, [synlig, filmKlar]);
  const harFilm = !!film && !egen;
  /* Direkte: heroen åpner i sofaen — ingen gåtur, ingen panelhistorie (sekvensen står stille).
     Din adresse (Street View) skrur direkte-modus av og kjører panelhistorien som før. */
  const direkte = !!(film && film.direkte) && !egen;
  const start = !direkte && synlig && roet && (!harFilm || filmKlar || ventetUt);
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
  const [hjemmeState, setHjemme] = useState(false);
  const [sammen, setSammen] = useState(false);       // radene har foldet seg sammen til én linje
  const [panelUte, setPanelUte] = useState(false);   // panelet har løftet seg av bildet
  const kanHjem = !!film && !egen;   // uten film (eller med din egen bolig fra Street View) blir panelet stående
  /* Direkte: scenen står fra første bilde; tekst og feed kommer inn et lite øyeblikk etter montering (så entréen
     faktisk animerer). */
  const [direkteInne, setDirekteInne] = useState(false);
  useEffect(() => {
    if (!direkte) { setDirekteInne(false); return undefined; }
    const t = window.setTimeout(() => setDirekteInne(true), 350);
    return () => window.clearTimeout(t);
  }, [direkte]);
  const hjemme = direkte ? direkteInne : hjemmeState;
  /* Fortellingen på veggen (kun direkte-modus) — og pulsen som driver telefonstrømmen i takt med den */
  const fort = useFortelling(direkte && hjemme, redusert);
  useEffect(() => {
    if (!ferdig || !kanHjem) return undefined;
    if (redusert) { setHjemme(true); return undefined; }
    /* Filmen er ferdig → liten pust ved døren (kameraet beveger seg fortsatt) → stua. */
    if (filmFerdig) { setHjemme(true); return undefined; }
    const t = window.setTimeout(() => setHjemme(true), 6500);
    return () => window.clearTimeout(t);
  }, [ferdig, filmFerdig, kanHjem, redusert]);
  const inne = er('rad1') && !hjemme && !panelUte;

  /* Oppsummeringen — etter godkjenningen. Radene folder seg sammen (nyeste først), én linje står igjen under
     adressen («Dagen er gjort. Én ting trengte deg.»), så løfter hele panelet seg av bildet og filmen får lyset
     tilbake mens han går inn. Panelet skal ikke stå og «vente» på slutten. */
  useEffect(() => {
    if (!ferdig || !kanHjem || redusert) return undefined;
    setSammen(true);
    const t = window.setTimeout(() => setPanelUte(true), 1400);
    return () => window.clearTimeout(t);
  }, [ferdig, kanHjem, redusert]);

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
  const hjemTimer = useRef(0);
  useEffect(() => { if (fase === 'foto') { setTrykket(false); setPresser(false); setHvem(null); setFilmFerdig(false); setHjemme(false); setSammen(false); setPanelUte(false); window.clearTimeout(hjemTimer.current); hjemTimer.current = 0; } }, [fase]);

  /* Filmen bestemmer når: rett før han legger telefonen i lommen trykker historien — hvis du ikke har gjort det.
     Og overgangen hjem settes som en presis timer fra filmens klokke idet vi er under et halvt sekund unna `hjemVed`
     (timeupdate alene tikker hvert ~250 ms — for grovt for et klipp). */
  const onTid = useCallback((t) => {
    if (film && film.trykkVed && t >= film.trykkVed) godkjenn('kari');
    if (film && film.hjemVed && kanHjem && ferdig && !hjemTimer.current) {
      const rest = film.hjemVed - t;
      if (rest <= 0.5) hjemTimer.current = window.setTimeout(() => setHjemme(true), Math.max(0, Math.round(rest * 1000)));
    }
  }, [film, godkjenn, kanHjem, ferdig]);
  useEffect(() => () => window.clearTimeout(hjemTimer.current), []);
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
        style={{ aspectRatio: smal ? '4 / 5.6' : '1.92 / 1', minHeight: smal ? 600 : 520, maxHeight: smal ? undefined : 'min(880px, calc(100svh - 124px))', background: T.charcoal, boxShadow: '0 0 0 1px rgba(21,19,15,0.08)', opacity: skifter || (direkte && !direkteInne) ? 0 : 1, transition: `opacity ${direkte && !skifter ? 1100 : 320}ms ${EASE}` }}
        role="group"
        aria-label={direkte ? `Animert eksempel: eieren hjemme i sofaen mens DigiHome håndterer ${adresse} — annonse, kontrakt, husleie og drift går av seg selv; han godkjenner resten.` : `Animert eksempel: en dag i ${adresse} med DigiHome — husleie registrert, kontrakt signert, et spørsmål fra leietaker besvart fra kontrakten, og et varmtvannsproblem løst med én godkjenning fra eier.`}
        data-testid="v4-scene"
      >
        {/* ── Virkeligheten ── */}
        <Virkelighet film={film} bilde={bildet} smal={smal} kjorer={kjorer} ferdig={ferdig} redusert={redusert} egen={egen} fase={fase} hjemme={hjemme} direkte={direkte} onFilmFerdig={onFilmFerdig} onTid={onTid} onKlar={onFilmKlar} />

        {/* Filmen vises først helt ren. Når dagen begynner, dempes bildet — lett, filmen skal fortsatt sees. Slipper igjen hjemme. */}
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,18,15,0.38) 0%, rgba(21,18,15,0.14) 40%, rgba(21,18,15,0.02) 62%, rgba(21,18,15,0.24) 100%)', opacity: inne ? 1 : 0, transition: `opacity ${hjemme ? 900 : 1400}ms ${EASE}` }} />

        {/* Det som skjer i appen mens han sitter der — kort som kommer opp av telefonen */}
        <Telefonstrom hjemme={hjemme} redusert={redusert} smal={smal} puls={direkte ? fort.puls : undefined} />

        {/* ── Veggen: han hjemme. Fortellingen om hva DigiHome er står rett på den lyse veggen — ingen boks. ── */}
        <Veggfortelling hjemme={hjemme} direkte={direkte} smal={smal} fort={fort} adresse={adresse} vist={vist} hvem={hvem} replay={replay} />

        {/* ── Dagen: ett panel. Alt som skjedde, i rekkefølge — og handlingen der hendelsen er. ── */}
        <div
          className="absolute rounded-[18px] sm:rounded-[20px]"
          style={{
            ...(smal ? { left: 12, right: 12, top: 12 } : { left: 28, top: 28, width: 472 }),
            background: 'rgba(24,21,18,0.90)',
            color: OFF,
            boxShadow: '0 0 0 1px rgba(244,241,234,0.08), 0 40px 80px -40px rgba(0,0,0,0.6)',
            opacity: inne ? 1 : 0,
            transform: inne ? 'none' : hjemme || panelUte ? 'translateY(-10px) scale(0.985)' : 'translateY(10px)',
            transition: hjemme || panelUte ? `opacity 560ms ${EASE}, transform 560ms ${EASE}` : `opacity 700ms ${EASE} 200ms, transform 700ms ${EASE} 200ms`,
            pointerEvents: inne ? 'auto' : 'none',
          }}
          aria-hidden={!inne}
          data-testid="v4-stage-dag"
          data-sammen={sammen ? '1' : '0'}
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

            {/* Dagen — radene kommer én og én; panelet vokser rolig med dem. Ingenting hopper.
                Når historien er ferdig, folder de seg sammen igjen — nyeste først — til én linje. */}
            <ul className="mt-4 sm:mt-5" aria-hidden={!er('rad1') || sammen}>
              {rader.map((r, ri) => {
                const vis = er(r.fase) && !sammen;
                const inn = (rader.length - 1 - ri) * 90;   // forsinkelse i sammenfoldingen: nederste rad først
                return (
                  <li key={r.tid} className={r.skjulMobil ? 'hidden sm:grid' : 'grid'} style={{ gridTemplateRows: vis ? '1fr' : '0fr', transition: sammen ? `grid-template-rows 460ms ${EASE} ${inn + 120}ms` : `grid-template-rows 520ms ${EASE}` }}>
                    <div className="min-h-0 overflow-hidden">
                      <div className="border-t py-3 sm:py-3.5" style={{ borderColor: HAIR, opacity: vis ? 1 : 0, transform: vis ? 'none' : sammen ? 'translateY(-6px)' : 'translateY(6px)', transition: sammen ? `opacity 280ms ${EASE} ${inn}ms, transform 320ms ${EASE} ${inn}ms` : radT }}>
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

            {/* Oppsummeringen — én linje der dagen sto. Kommer idet radene har foldet seg sammen. */}
            <div className="grid" style={{ gridTemplateRows: sammen ? '1fr' : '0fr', transition: `grid-template-rows 480ms ${EASE} ${sammen ? 360 : 0}ms` }} aria-hidden={!sammen}>
              <div className="min-h-0 overflow-hidden">
                <p className="mt-4 border-t pt-4 text-[15px] leading-[1.4] sm:mt-5 sm:text-[15.5px]" style={{ borderColor: HAIR, color: 'rgba(244,241,234,0.9)', opacity: sammen ? 1 : 0, transform: sammen ? 'none' : 'translateY(6px)', transition: `opacity 480ms ${EASE} ${sammen ? 560 : 0}ms, transform 480ms ${EASE} ${sammen ? 560 : 0}ms` }} data-testid="v4-oppsummering">
                  Dagen er gjort<span style={{ color: T.lilla }}>.</span> <span style={{ color: DIM }}>{hvem === 'deg' ? 'Én ting trengte deg — ett trykk.' : 'Én ting trengte deg. Resten gikk av seg selv.'}</span>
                </p>
              </div>
            </div>

            {/* Sluttlinje i panelet — bare når scenen ikke går hjem (egen bolig fra Street View / uten film). */}
            <div className="grid" style={{ gridTemplateRows: ferdig && !kanHjem ? '1fr' : '0fr', transition: `grid-template-rows 500ms ${EASE}` }} aria-hidden={!(ferdig && !kanHjem)}>
              <div className="min-h-0 overflow-hidden">
                <div className="mt-3.5 flex items-center justify-between gap-4 border-t pt-4 text-[13px]" style={{ borderColor: HAIR, color: DIM, opacity: ferdig && !kanHjem ? 1 : 0, transition: `opacity 500ms ${EASE} 200ms` }}>
                  <span>Én godkjenning. Resten gikk på autopilot.</span>
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
