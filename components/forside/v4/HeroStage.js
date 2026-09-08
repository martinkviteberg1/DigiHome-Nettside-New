'use client';

import { FILM } from './heroFilm';
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
export { FILM };

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
/* Smal skjerm: scenen er stående (4:5.6) og viser bare ~40 % av filmens bredde. Mannen sitter til venstre i bildet
   (hodet ~29 %, telefonen 33 %) — med object-position 50 % kuttes han i venstre kant. 30 % legger utsnittet på
   ~18–58 % av filmen: han står i venstre halvdel av scenen, med veggen til høyre der telefonstrømmen projiseres. */
const HJEM_FOKUS_SMAL_X = 0.30;   // = .dh-hero-hjem i globals.css (object-position 30 % under 640 px, 50 % ellers)
/* Smal skjerm: stua er et liggende bilde i en stående ramme — hele høyden vises, og han sitter lavt, der veggteksten
   tones inn. Rammen (poster + video) skaleres derfor litt opp om et punkt i bunnen (origo 30 % 100 %, se
   .dh-hero-hjem-ramme): bunnen står, han vokser oppover og kommer opp over toningen. = CSS-verdien. */
const HJEM_ZOOM_SMAL = 1.26;
/* Samtalen — fem slag. To av dem er små samtaler: eieren spør systemet, og Emma melder fra og får svar
   (`fra`: 'deg' = eieren, 'dh' = DigiHome svarer, 'emma' = leietakeren). `ms` = hvor lenge slaget står før neste;
   `kl` = klokken i veggens stille linje. Siste slag er kveldsmeldingen — den blir stående. {adresse} byttes ut. */
const STROM = [
  { id: 'visning', kl: '20:41', ms: 4800, chat: [{ fra: 'deg', bilder: ['/v4/annonse/kjokken-600.webp', '/v4/annonse/soverom-600.webp', '/v4/annonse/kjokken-bar-600.webp'], t: '5 bilder', kvittering: 'Levert 08:52' }, { fra: 'dh', t: 'Annonsen er ute på FINN. Visning lørdag 12:00 — 4 påmeldt.', ikon: 'prikk' }] },
  { id: 'kontrakt', kl: '20:42', ms: 5400, chat: [{ fra: 'dh', t: 'Emma signerte leiekontrakten med BankID.', ikon: 'hake' }, { fra: 'dh', t: 'Depositumet står på konto. Nøkler lørdag 12:00.' }, { fra: 'deg', t: '👍', kvittering: 'Lest' }] },
  { id: 'regnskap', kl: '20:43', ms: 4600, chat: [{ fra: 'deg', t: 'Har Emma betalt?', kvittering: 'Lest 08:12' }, { fra: 'dh', t: 'Ja — 14 500 kr kom 08:12. Bokført.' }] },
  { id: 'emma', kl: '20:44', ms: 6600, bilde: '/v4/annonse/leietaker-emma.webp', chat: [{ fra: 'emma', t: 'Hei! Varmtvannet er borte 😕' }, { fra: 'dh', t: 'Rørlegger i dag 14:00 · 2 400 kr. Godkjenner du?' }, { fra: 'deg', t: 'Ja, kjør på', kvittering: 'Lest 10:04' }, { fra: 'emma', t: 'Varmt vann igjen — tusen takk!' }] },
  { id: 'kveld', kl: '20:45', ms: 0, slutt: true, chat: [{ fra: 'dh', t: 'Alt i orden på {adresse}. Ingenting venter på deg — god kveld.', ikon: 'hake' }] },
];
const STROM_START = 1500; const STROM_TAKT = 3000; const STROM_ETTER = 700;
const BOBLE_TAKT = 1050;   // ms mellom boblene i ett slag

function StromIkon({ m }) {
  if (m.bilde) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.bilde} alt="" width={26} height={26} className="h-[26px] w-[26px] shrink-0 rounded-full object-cover" draggable={false} />;
  }
  if (m.ikon === 'hake') return <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.14)', color: '#166B3C' }}><svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
  return <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(212,150,255,0.24)' }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} /></span>;
}

function Telefonstrom({ hjemme, redusert, smal, puls, adresse = 'Nygårdsgaten 5' }) {
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
  /* Slagene følger klokken i useFortelling: `puls` øker én gang per slag, og samtalen kommer opp på veggen litt
     etter (STROM_ETTER). Uten puls (Street View-flyten) går strømmen i egen takt. */
  const [n, setN] = useState(-1);
  useEffect(() => {
    if (!hjemme || redusert) { setN(-1); return undefined; }
    if (puls === null) return undefined;               // synkronisert, men klokken har ikke startet enda
    if (puls !== undefined) {
      const t = window.setTimeout(() => setN(puls), STROM_ETTER);
      return () => window.clearTimeout(t);
    }
    let id = 0;
    const t = window.setTimeout(() => { setN(0); id = window.setInterval(() => setN((k) => Math.min(k + 1, STROM.length - 1)), STROM_TAKT); }, STROM_START);
    return () => { window.clearTimeout(t); if (id) window.clearInterval(id); };
  }, [hjemme, redusert, puls]);

  /* Filmpunkt → scenepunkt (object-cover, sentrert) */
  const A = maal.w && maal.h ? maal.w / maal.h : FILM_ASPEKT;
  /* object-position x (ox) på smal skjerm flytter utsnittet: filmpunkt t → beholder t·R − (R − 1)·ox, R = FILM_ASPEKT/A */
  const ox = smal ? HJEM_FOKUS_SMAL_X : 0.5;
  let px = A >= FILM_ASPEKT ? TELEFON.x : TELEFON.x * (FILM_ASPEKT / A) - (FILM_ASPEKT / A - 1) * ox;
  let py = A >= FILM_ASPEKT ? 0.5 + (TELEFON.y - 0.5) * (A / FILM_ASPEKT) : TELEFON.y;
  /* Smal: rammen er skalert HJEM_ZOOM_SMAL om (30 %, 100 %) — punktet følger med */
  if (smal) { px = HJEM_FOKUS_SMAL_X + (px - HJEM_FOKUS_SMAL_X) * HJEM_ZOOM_SMAL; py = 1 - (1 - py) * HJEM_ZOOM_SMAL; }
  const X = px * maal.w; const Y = py * maal.h;
  /* Flatens bredde følger scenen: på mellomstore skjermer (nettbrett, 640–1000 px scene) smalner den (196–252 px) så
     den aldri går inn i veggteksten, som starter ved max(61 %, 38 % + 208 px) — se Veggfortelling. */
  const trang = !smal && maal.w < 1010;
  const B = smal ? 212 : Math.max(196, Math.min(252, Math.round(maal.w * 0.246 - 12)));
  /* Flaten står opp og til høyre for skjermen — over skulderen, aldri over ansiktet. Bunnen bindes til skjermen.
     På smal skjerm klemmes den inn så den aldri går ut av scenens høyrekant. */
  const fx = Math.min(X + (smal || trang ? 16 : Math.round(maal.w * 0.034)), smal ? Math.max(0, maal.w - B - 12) : Infinity);
  const fy = Y - (smal || trang ? 26 : Math.round(maal.h * 0.042));
  const inne = n >= 0;
  const fs = 12.5;
  const bildePx = 52;
  const avatarPx = 22;

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3] overflow-hidden" data-testid="v4-telefonstrom" data-n={n}>
      {maal.w > 0 && hjemme && !redusert && (
        <>
          {/* Hårlinjen fra skjermen opp til samtalens nedre venstre hjørne — boblene hører til telefonen */}
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${maal.w} ${maal.h}`} preserveAspectRatio="none" style={{ opacity: inne ? 1 : 0, transition: `opacity 600ms ${EASE} 500ms` }}>
            <line x1={X + 4} y1={Y - 2} x2={fx + 14} y2={fy + 1} stroke="rgba(251,250,248,0.55)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <circle cx={X + 4} cy={Y - 2} r="2" fill="rgba(251,250,248,0.95)" />
          </svg>
          {/* Samtalen: frittstående bobler (ingen boks, ingen skjerm) som kommer én og én — Emma til venstre med bilde,
              eieren til høyre i lilla, DigiHome svarer i blekk. Skriveindikator (···) før hvert svar. Forrige slags
              bobler glir opp og tones bort. Ingen glød, ingen blink. Siste slag blir stående. */}
          <div className="absolute flex flex-col justify-end" style={{ left: fx, bottom: maal.h - fy, width: B, opacity: inne ? 1 : 0, transition: `opacity 500ms ${EASE}` }} data-testid="v4-strom-flate">
            {[n - 1, n].filter((k) => k >= 0 && k < STROM.length).map((k) => {
              const m = STROM[k];
              const ny = k === n;
              const bobler = m.chat || [{ fra: 'dh', t: m.t, u: m.u, ikon: m.ikon }];
              return (
                <div key={k} className="flex w-full flex-col gap-1.5" style={{ transformOrigin: '0% 100%', animation: ny ? 'none' : `v4-boble-ut 560ms cubic-bezier(0.4, 0, 0.6, 1) both`, position: ny ? 'relative' : 'absolute', bottom: ny ? undefined : 0, left: 0, willChange: 'transform, opacity' }} data-testid={`v4-strom-${m.id}`} aria-hidden={!ny}>
                  {bobler.map((c, j) => {
                    const hoyre = c.fra !== 'emma';
                    const dh = c.fra === 'dh';
                    const t0 = ny ? 200 + j * BOBLE_TAKT : 0;               // når boblen kommer
                    const svar = dh || (c.fra === 'emma' && j > 0);          // svar får skriveindikator først
                    const tekst = String(c.t || '').replace('{adresse}', adresse);
                    return (
                      <div key={j} className={`flex w-full items-end gap-1.5 ${hoyre ? 'justify-end' : 'justify-start'}`}>
                        {c.fra === 'emma' && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={m.bilde || '/v4/annonse/leietaker-emma.webp'} alt="" width={avatarPx} height={avatarPx} className="shrink-0 rounded-full object-cover" style={{ width: avatarPx, height: avatarPx, boxShadow: '0 0 0 1.5px rgba(251,250,248,0.9)', opacity: 0, animation: `v4-chat-inn 420ms ${EASE} ${t0}ms both` }} />
                        )}
                        <span className="relative max-w-[86%]">
                          {/* Skriveindikatoren: kommer 780 ms før svaret, går idet svaret kommer */}
                          {ny && svar && (
                            <span className={`absolute bottom-0 inline-flex items-center gap-[3px] px-3 ${hoyre ? 'right-0' : 'left-0'}`} style={{ height: 30, borderRadius: hoyre ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: dh ? T.ink : 'rgba(251,250,248,0.96)', opacity: 0, animation: `v4-skriver 760ms linear ${Math.max(0, t0 - 780)}ms both` }}>
                              {[0, 1, 2].map((d) => <span key={d} className="block h-[5px] w-[5px] rounded-full" style={{ background: dh ? 'rgba(244,241,234,0.7)' : 'rgba(21,19,15,0.4)', animation: `v4-prikk 900ms ease-in-out ${d * 150}ms infinite` }} />)}
                            </span>
                          )}
                          {c.bilder ? (
                            /* Bildene eieren sendte: tre, kommer én og én */
                            <span className="flex gap-1 p-1" style={{ borderRadius: '16px 16px 4px 16px', background: T.lilla, boxShadow: '0 16px 40px -20px rgba(0,0,0,0.45)', opacity: 0, animation: `v4-chat-inn 480ms ${EASE} ${t0}ms both` }}>
                              {c.bilder.map((b, q) => (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img key={b} src={b} alt="" width={bildePx} height={bildePx} className="rounded-[12px] object-cover" style={{ width: bildePx, height: bildePx, opacity: 0, animation: `v4-chat-inn 420ms ${EASE} ${t0 + 180 + q * 160}ms both` }} />
                              ))}
                            </span>
                          ) : (
                          <span className="block" style={{ padding: '7px 12px', fontSize: fs, lineHeight: 1.35, borderRadius: hoyre ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: dh ? T.ink : c.fra === 'deg' ? T.lilla : 'rgba(251,250,248,0.96)', color: dh ? '#F4F1EA' : T.ink, boxShadow: dh ? '0 16px 40px -20px rgba(0,0,0,0.55)' : '0 16px 40px -20px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.6)', transformOrigin: hoyre ? '100% 100%' : '0% 100%', opacity: 0, animation: `v4-chat-inn 480ms ${EASE} ${t0}ms both`, willChange: 'transform, opacity' }}>
                            {c.ikon && <span className="mr-1.5 inline-block h-[6px] w-[6px] rounded-full align-middle" style={{ background: c.ikon === 'hake' ? '#5FD39A' : T.lilla }} />}
                            {tekst}{c.u ? <span className="block text-[11px]" style={{ color: 'rgba(244,241,234,0.62)' }}>{c.u}</span> : null}
                          </span>
                          )}
                          {/* Kvittering under eierens bobler — «Levert», så «Lest» */}
                          {c.kvittering && ny && (
                            <span className="block pr-1 pt-[3px] text-right text-[10px]" style={{ color: 'rgba(251,250,248,0.75)', textShadow: '0 1px 6px rgba(0,0,0,0.4)', opacity: 0, animation: `v4-chat-inn 360ms ${EASE} ${t0 + 620}ms both` }}>{c.kvittering}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
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
function Virkelighet({ film, bilde, smal, kjorer, ferdig, redusert, egen, fase, hjemme, direkte = false, onFilmFerdig, onTid, onKlar, onSpiller }) {
  const vidRef = useRef(null);
  const hjemRef = useRef(null);

  /* Direkte-modus, ytelse: LCP er posteren (et <img> med høy prioritet, mobilbeskåret på smal skjerm). Selve loopen
     (0,7–2,4 MB) hentes først etter at siden er lastet (load + et lite pust, senest etter 3,5 s) — så den aldri
     konkurrerer med bilde, fonter og hydrering om båndbredden. Når den spiller, tones den inn over posteren. */
  const [hentLoop, setHentLoop] = useState(false);
  const [loopSpiller, setLoopSpillerState] = useState(false);
  const setLoopSpiller = (v) => { setLoopSpillerState(v); if (v && onSpiller) onSpiller(); };
  /* Mannen skal bevege seg idet fortellingen starter: loopen hentes STRAKS (posteren er allerede LCP og står i HTML),
     ikke etter `load`. Fortellingen venter på at videoen faktisk spiller (se HeroStage → useFortelling). */
  useEffect(() => {
    if (!direkte || !film?.hjemVideo || redusert) return undefined;
    const t = window.setTimeout(() => setHentLoop(true), 60);
    return () => window.clearTimeout(t);
  }, [direkte, film, redusert]);

  /* Loopen hjemme (ikke-direkte): hentes først når historien er i gang (så den ikke konkurrerer med filmen om
     båndbredden), og spilles fra start idet stua kommer opp av mørket. Ingen transform på selve video-elementet. */
  useEffect(() => {
    const v = hjemRef.current;
    if (!v || !film?.hjemVideo || redusert || direkte) return;
    if (kjorer && v.preload !== 'auto') { try { v.preload = 'auto'; v.load(); } catch (e) { /* ok */ } }
  }, [kjorer, direkte, film, redusert]);
  useEffect(() => {
    const v = hjemRef.current;
    if (!v || !film?.hjemVideo || redusert) return;
    try {
      if (direkte) { if (!hentLoop) return; if (v.networkState === 3 /* NETWORK_NO_SOURCE */ || v.readyState === 0) v.load(); v.play().catch(() => {}); return; }
      if (hjemme) { if (v.currentTime > 0.05) v.currentTime = 0; v.play().catch(() => {}); } else if (!v.paused) v.pause();
    } catch (e) { /* ok */ }
  }, [hjemme, direkte, film, redusert, hentLoop]);

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
      return <img src={hjem || film.poster} alt="" {...felles} className={`${felles.className} dh-hero-hjem`} style={{ ...felles.style, objectPosition: undefined }} />;
    }
    const visHjem = direkte || hjemme;
    /* Direkte: loopens video-element får kildene først når `hentLoop` er sann (etter load). Til da står posteren. */
    const loopKilder = !direkte || hentLoop;
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
            className={`pointer-events-none absolute inset-0 will-change-transform ${direkte ? 'dh-hero-hjem-ramme' : ''}`}
            style={direkte ? { opacity: 1 } : {
              opacity: visHjem ? 1 : 0,
              transform: visHjem ? 'scale(1)' : 'scale(1.05)',
              transition: visHjem ? `opacity 420ms linear 380ms, transform 3000ms ${EASE} 520ms` : 'opacity 240ms linear, transform 0ms linear 240ms',
            }}
            data-testid="v4-film-hjem-ramme"
          >
            {/* Direkte: posteren er LCP-bildet — i HTML fra serveren, høy prioritet, mobilbeskåret under 640 px.
                Videoen ligger over og tones inn idet den spiller. */}
            {direkte && film.hjemPoster ? (
              <picture>
                {film.hjemPosterSmal ? <source media="(max-width: 639px)" srcSet={film.hjemPosterSmal} /> : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={film.hjemPoster} alt="" fetchPriority="high" decoding="async" draggable={false} className="dh-hero-hjem absolute inset-0 h-full w-full select-none object-cover" data-testid="v4-film-hjem-poster" />
              </picture>
            ) : null}
            {film.hjemVideo ? (
              <video
                ref={hjemRef}
                className="dh-hero-hjem absolute inset-0 h-full w-full object-cover"
                style={direkte ? { opacity: loopSpiller ? 1 : 0, transition: 'opacity 480ms linear' } : undefined}
                poster={direkte ? undefined : film.hjemPoster || hjem}
                muted
                loop
                playsInline
                autoPlay={direkte}
                preload={direkte ? (hentLoop ? 'auto' : 'none') : 'none'}
                disablePictureInPicture
                disableRemotePlayback
                aria-hidden="true"
                onPlaying={direkte ? () => setLoopSpiller(true) : undefined}
                data-testid="v4-film-hjem"
                data-kilder={loopKilder ? '1' : '0'}
              >
                {loopKilder && film.hjemVideoSmal ? <source src={film.hjemVideoSmal} type='video/mp4; codecs="avc1.640028"' media="(max-width: 639px)" /> : null}
                {loopKilder ? <source src={film.hjemVideo} type='video/mp4; codecs="avc1.640028"' /> : null}
                {loopKilder && film.hjemVideoWebm ? <source src={film.hjemVideoWebm} type="video/webm" /> : null}
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hjem}
                alt=""
                className="dh-hero-hjem absolute inset-0 h-full w-full object-cover will-change-transform"
                style={{ transform: hjemme ? 'scale(1.045)' : 'scale(1)', transition: hjemme ? 'transform 16000ms cubic-bezier(0.22, 0.61, 0.36, 1) 2200ms' : 'transform 0ms linear' }}
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
/* Historien fortelles i samtalen på veggen (STROM) — veggen har ingen egne overskrifter lenger. Klokken under
   (useFortelling) driver slagene: ett slag om gangen, en liten pause mellom, og så HVILE på siste bilde. */
const FORTELLING_T0 = 1500;   // rommet må komme opp av mørket før teksten begynner (ikke-direkte)
const FORTELLING_T0_DIREKTE = 140; // direkte: scenen står alt — teksten skal være der før du har rukket å scrolle
const FORTELLING_PAUSE = 640; // det gamle tones rolig ut (560 ms), et lite pust, så tones det nye inn — filmatisk, ikke klipp

/* Klokken for fortellingen. `aktiv` = veggen er synlig (hjemme). Returnerer beat (k), om ordene står (vis) og
   runden (for telefonstrømmen). Redusert bevegelse: siste beat, stille. */
function useFortelling(aktiv, redusert) {
  const [k, setK] = useState(0);
  const [vis, setVis] = useState(false);
  const startet = useRef(false);
  const SISTE = STROM.length - 1;
  useEffect(() => {
    if (!aktiv) { startet.current = false; setK(0); setVis(false); return undefined; }
    if (redusert) { setK(SISTE); setVis(true); return undefined; }
    let t;
    if (vis) {
      if (k >= SISTE) return undefined;                 // siste bilde: hvil — filmen er ferdig fortalt
      t = window.setTimeout(() => setVis(false), STROM[k].ms);
    } else {
      t = window.setTimeout(() => {
        if (startet.current) setK((kk) => Math.min(kk + 1, SISTE));
        startet.current = true;
        setVis(true);
      }, startet.current ? FORTELLING_PAUSE : FORTELLING_T0_DIREKTE);
    }
    return () => window.clearTimeout(t);
  }, [aktiv, redusert, vis, k, SISTE]);
  /* Pulsen til samtalen: én per slag — boblene kommer opp på veggen litt etter at klokken har slått */
  const puls = aktiv && !redusert && startet.current ? k : null;
  return { k, vis, puls };
}

function Veggfortelling({ hjemme, direkte, smal, fort, adresse, vist, hvem, replay, zoom = false }) {
  /* Direkte-modus: veggen er ROLIG. Én setning som står fra første bilde og aldri skifter, én linje under, en hårlinje
     og den stille meta-linjen (adresse · klokke · status). Det eneste som beveger seg er klokken, som følger samtalen
     på telefonen. Mindre og mer dempet enn en overskrift — veggen skal ikke konkurrere med ham og telefonen.
     Street View-flyten (din adresse → din bolig): som før — én setning, én linje, tallene og feltet. */
  const beat = direkte
    ? { id: 'ro', ord: ['Én', 'beslutning', 'var', 'din.'], u: 'Alt annet gikk av seg selv.', slutt: true }
    : { id: 'auto', ord: ['Utleie', 'på', 'autopilot'], u: 'Én godkjenning. Resten skjedde mens du gikk hjem.', slutt: true };
  const inne = hjemme;
  const T0 = direkte ? 0 : FORTELLING_T0;
  const fastT0 = direkte ? FORTELLING_T0_DIREKTE + 160 : FORTELLING_T0;
  const fast = (i) => ({ opacity: hjemme ? 1 : 0, transform: hjemme ? 'none' : 'translateY(12px)', transition: `opacity 900ms ${EASE} ${hjemme ? fastT0 + i * 130 : 0}ms, transform 900ms ${EASE} ${hjemme ? fastT0 + i * 130 : 0}ms` });
  /* Ordene tones inn én gang (svak uskarphet, lite løft) når rommet står. Ingen ut-animasjon — de blir stående. */
  const ordStil = (i) => (inne
    ? { animation: `${direkte ? 'v4-ord-fade' : 'v4-ord-inn'} ${direkte ? 1300 : 900}ms ${EASE} ${T0 + (direkte ? 240 : 80) + i * (direkte ? 90 : 95)}ms both`, willChange: 'transform, opacity, filter' }
    : { opacity: 0 });
  const linjeStil = (d) => (inne
    ? { animation: `${direkte ? 'v4-linje-fade' : 'v4-linje-inn'} ${direkte ? 1100 : 900}ms ${EASE} ${T0 + d}ms both` }
    : { opacity: 0 });
  const husleie = vist ? `${tall(18500)}\u00A0kr` : `${tall(64500)}\u00A0kr`;
  const slutt = !!beat.slutt;
  /* Direkte: en størrelse under overskrift — rolig, ikke plakat. Blekk med et hint av luft — aldri helt svart. */
  const fs = smal ? (direkte ? 30 : 42) : direkte ? 'clamp(28px, 2.9vw, 56px)' : 'clamp(48px, 7.4svh, 86px)';
  const blekk = direkte ? 'rgba(21,19,15,0.86)' : 'rgba(21,19,15,0.94)';
  const dempet = 'rgba(21,19,15,0.58)';
  const meta = 'rgba(21,19,15,0.50)';
  const klokke = direkte ? (STROM[Math.min(fort?.k ?? 0, STROM.length - 1)]?.kl || STROM[0].kl) : '22:42';
  const TALL = [[husleie, 'husleie inn'], ['1 min', smal ? 'til rørlegger' : 'fra melding til rørlegger'], ['1', hvem === 'deg' ? 'godkjenning — din' : 'godkjenning']];
  return (
    <div
      className={smal ? 'absolute inset-x-0 bottom-0 px-4 pb-5 pt-16' : `absolute flex flex-col justify-center ${zoom ? 'dh-zoom-vegg' : ''}`}
      style={{
        /* Venstrekanten viker for telefonstrømmens flate på mellomstore scener (flaten ender ved ~36 % + 196–252 px) */
        ...(smal ? {} : { left: 'max(61%, calc(38% + 208px))', right: '5%', top: '8%', bottom: '8%' }),
        color: blekk,
        background: smal ? 'linear-gradient(180deg, rgba(243,241,236,0) 0%, rgba(243,241,236,0.9) 24%, rgba(243,241,236,0.98) 100%)' : 'none',
        opacity: hjemme ? 1 : 0,
        pointerEvents: hjemme ? 'auto' : 'none',
        transition: `opacity 500ms ${EASE} ${hjemme ? (direkte ? 150 : 900) : 0}ms`,
      }}
      aria-hidden={!hjemme}
      data-testid="v4-slutt"
      data-beat={beat.id}
    >
      <h3 style={{ ...display, fontSize: fs, lineHeight: 0.98, letterSpacing: '-0.04em', color: blekk }} data-testid="v4-slutt-tittel">
        {beat.ord.map((o, i) => (
          <span key={`${beat.id}-${i}`} className="inline-block" style={{ ...ordStil(i), marginRight: i < beat.ord.length - 1 ? '0.22em' : 0 }}>
            {o}{slutt && !direkte && i === beat.ord.length - 1 ? <span style={{ color: T.lilla, marginLeft: '-0.03em' }}>.</span> : null}
          </span>
        ))}
      </h3>
      <p key={`u-${beat.id}`} className={`max-w-[30ch] leading-[1.45] ${direkte ? 'mt-3 text-[15px] sm:mt-4 sm:text-[17px]' : 'mt-5 text-[16.5px] sm:mt-7 sm:text-[20px]'}`} style={{ ...linjeStil(direkte ? 520 + beat.ord.length * 90 : 140 + beat.ord.length * 120), color: dempet }}>{beat.u}</p>

      {/* Hårlinjen tegnes én gang. Under: meta (adresse · klokke · status) — i Street View-flyten dagens tall. */}
      <div aria-hidden="true" className={`relative h-px ${direkte ? 'mt-7 sm:mt-9' : 'mt-9 sm:mt-12'}`} style={{ background: 'rgba(21,19,15,0.12)', transform: hjemme ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: '0 50%', transition: `transform 1200ms ${EASE} ${hjemme ? (direkte ? 900 : FORTELLING_T0 + 800) : 0}ms` }} />
      <div className="mt-5 grid" style={fast(7.5)}>
        <p className="col-start-1 row-start-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] sm:text-[13.5px]" style={{ color: meta, opacity: direkte || !slutt ? 1 : 0, transition: `opacity 500ms ${EASE} 200ms` }} aria-hidden={!direkte && slutt} data-testid="v4-slutt-status">
          <span className="whitespace-nowrap">{adresse}</span>
          <span aria-hidden="true" style={{ color: 'rgba(21,19,15,0.2)' }}>·</span>
          <span className="whitespace-nowrap tabular-nums">torsdag <span key={klokke} className="inline-block animate-in fade-in-0 duration-500">{klokke}</span></span>
          <span aria-hidden="true" className="hidden sm:inline" style={{ color: 'rgba(21,19,15,0.2)' }}>·</span>
          <span className="hidden items-center gap-2 whitespace-nowrap sm:inline-flex">
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#1F9D55', animation: hjemme ? 'v4-puls-dot 3200ms ease-in-out 1400ms infinite' : 'none' }} />
            Alt i orden
          </span>
        </p>
        {/* Dagens tall (kun Street View-flyten) — tre stille kolonner */}
        {!direkte && (
          <div className="col-start-1 row-start-1 grid grid-cols-3 gap-4" style={{ opacity: slutt ? 1 : 0, transition: `opacity 600ms ${EASE} ${slutt ? 300 : 0}ms` }} aria-hidden={!slutt} data-testid="v4-slutt-tall">
            {TALL.map(([v, l], i) => (
              <div key={l} style={{ opacity: slutt ? 1 : 0, transform: slutt ? 'none' : 'translateY(8px)', transition: `opacity 600ms ${EASE} ${slutt ? 300 + i * 120 : 0}ms, transform 800ms ${EASE} ${slutt ? 300 + i * 120 : 0}ms` }}>
                <p className="tabular-nums" style={{ ...display, fontSize: smal ? 22 : 'clamp(22px, 1.5vw, 30px)', letterSpacing: '-0.03em', lineHeight: 1, color: blekk }}>{v}</p>
                <p className="mt-1.5 text-[12px] sm:text-[12.5px]" style={{ color: meta }}>{l}</p>
              </div>
            ))}
          </div>
        )}
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

/* zoom: scenen ligger i HeroZoom (sticky, fullskjerm) og beskjæres med clip-path fra kort til hele flaten —
   verdiene kommer som CSS-variabler (--dh-ix/--dh-iy/--dh-r) fra rammen rundt. Kun lg+. */
export default function HeroStage({ eiendom, bilde = 'stue', film = FILM, zoom = false }) {
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
    const t = window.setTimeout(() => setDirekteInne(true), 40);
    return () => window.clearTimeout(t);
  }, [direkte]);
  const hjemme = direkte ? direkteInne : hjemmeState;
  /* Fortellingen starter idet videoen med eieren faktisk spiller — aldri over en frosset poster. Fallback etter 2,8 s
     (treg linje, sparemodus, video som ikke kan spille), så veggen aldri blir stående tom. */
  const [videoSpiller, setVideoSpiller] = useState(false);
  const [ventetNok, setVentetNok] = useState(false);
  useEffect(() => {
    if (!direkte || !hjemme) return undefined;
    const t = window.setTimeout(() => setVentetNok(true), 2800);
    return () => window.clearTimeout(t);
  }, [direkte, hjemme]);
  const onVideoSpiller = useCallback(() => setVideoSpiller(true), []);
  /* Fortellingen på veggen (kun direkte-modus) — og pulsen som driver telefonstrømmen i takt med den */
  const fort = useFortelling(direkte && hjemme && (videoSpiller || ventetNok || redusert || !film?.hjemVideo), redusert);
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
    <figure ref={figRef} className={`relative m-0 ${zoom ? 'dh-zoom-fig' : ''}`} data-testid="v4-scene-wrap">
      {/* zoom: klassene dh-zoom-* (globals.css, kun lg+) gjør scenen til hele rammen og beskjærer den med clip-path
          fra CSS-variablene HeroZoom skriver. Under lg: vanlig kort. */}
      <div
        ref={ref}
        className={`dh-hero-scene relative w-full overflow-hidden rounded-[20px] sm:rounded-[24px] ${zoom ? 'dh-zoom-scene' : ''}`}
        style={{ background: T.charcoal, boxShadow: '0 0 0 1px rgba(21,19,15,0.08)', opacity: skifter ? 0 : 1, transition: `opacity 320ms ${EASE}` }}
        data-zoom={zoom ? '1' : '0'}
        role="group"
        aria-label={direkte ? `Animert eksempel: eieren hjemme i sofaen mens DigiHome håndterer ${adresse} — annonse, kontrakt, husleie og drift går av seg selv; han godkjenner resten.` : `Animert eksempel: en dag i ${adresse} med DigiHome — husleie registrert, kontrakt signert, et spørsmål fra leietaker besvart fra kontrakten, og et varmtvannsproblem løst med én godkjenning fra eier.`}
        data-testid="v4-scene"
      >
        {/* ── Virkeligheten ── */}
        <Virkelighet film={film} bilde={bildet} smal={smal} kjorer={kjorer} ferdig={ferdig} redusert={redusert} egen={egen} fase={fase} hjemme={hjemme} direkte={direkte} onFilmFerdig={onFilmFerdig} onTid={onTid} onKlar={onFilmKlar} onSpiller={onVideoSpiller} />

        {/* Filmen vises først helt ren. Når dagen begynner, dempes bildet — lett, filmen skal fortsatt sees. Slipper igjen hjemme. */}
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,18,15,0.38) 0%, rgba(21,18,15,0.14) 40%, rgba(21,18,15,0.02) 62%, rgba(21,18,15,0.24) 100%)', opacity: inne ? 1 : 0, transition: `opacity ${hjemme ? 900 : 1400}ms ${EASE}` }} />

        {/* Det som skjer i appen mens han sitter der — kort som kommer opp av telefonen */}
        <Telefonstrom hjemme={hjemme} redusert={redusert} smal={smal} puls={direkte ? fort.puls : undefined} adresse={adresse} />

        {/* ── Veggen: han hjemme. Fortellingen om hva DigiHome er står rett på den lyse veggen — ingen boks. ── */}
        <Veggfortelling hjemme={hjemme} direkte={direkte} smal={smal} fort={fort} adresse={adresse} vist={vist} hvem={hvem} replay={replay} zoom={zoom} />

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
