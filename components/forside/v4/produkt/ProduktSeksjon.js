'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import { EASE, T, display, useSynlig } from '../motion';
import DriftFilm from './DriftFilm';
import OkonomiFilm from './OkonomiFilm';
import AnnonseFilm from './AnnonseFilm';
import KontraktFilm from './KontraktFilm';

/* ---------------------------------------------------------------------------
   ProduktSeksjon — «Se hele DigiHome i arbeid.» En scene, ikke et skjermbilde.

   Tre lag: modus (tabs) · statement · produktet som dominerende objekt.
   Egen verden: dyp, varm plomme. Valgfritt Bergen-skumring tonet i plommen —
   produktet står på den rolige himmelen, fjellene lever i kantene (Sana-regelen).

   Tabs i livssyklus-rekkefølge: Annonse · Kontrakt · Økonomi · Leietaker · Drift.
   Default er Annonse — livssyklusen leses fra venstre. Annonse er en historie
   (AnnonseFilm: to zoom-nivåer — annonsen skrives fra boligen, stort og frittstående;
   ved «Publiser» trekker kameraet seg tilbake og annonsen lander i produktet),
   Drift er én sak med én godkjenning. De andre er synlige, dempet og ikke klikkbare.
--------------------------------------------------------------------------- */

/* Fire kapitler i den rekkefølgen et leieforhold lever: fra ledig til valgt (Annonse), fra valgt til innflyttet
   (Kontrakt), hverdagen med leietaker og leverandør (Drift), og pengene (Økonomi). */
const TABS = [
  { id: 'annonse', navn: 'Annonse', klar: true },
  { id: 'kontrakt', navn: 'Kontrakt', klar: true },
  { id: 'drift', navn: 'Drift', klar: true },
  { id: 'okonomi', navn: 'Økonomi', klar: true },
];

const SCENER = {
  annonse: {
    tittel: ['Fra fem bilder', 'til valgt leietaker.'],
    ingress: 'Du tar bildene. DigiHome leser detaljene, skriver annonsen og legger den ut på FINN.no. Interessentene legitimerer seg og booker visning selv — du velger hvem som får boligen.',
  },
  kontrakt: {
    tittel: ['Fra valgt leietaker', 'til nøklene i hånden.'],
    ingress: 'Kontrakten er fylt ut fra annonsen og signeres med BankID av begge. Depositumet står på egen konto hos Keyhole, og overtakelsen dokumenteres i en protokoll dere signerer i døra.',
  },
  drift: {
    tittel: ['Fra melding til løst.', 'Du trykker én gang.'],
    ingress: 'Emma melder i chatten at varmtvannet er borte. Saken sorterer seg selv, rørleggeren svarer med tidspunkt og pris — du godkjenner med ett trykk. Torsdag er det fikset, og fakturaen ligger i regnskapet.',
  },
  okonomi: {
    tittel: ['Fra husleie', 'til ferdig regnskap.'],
    ingress: 'Den første i måneden kommer husleien inn — leilighet for leilighet. Den som mangler får en vennlig påminnelse med Vipps. Ved månedsslutt er alt bokført, og fakturaen fra rørleggeren ligger på riktig leilighet.',
  },
};

const IVORY = '#F4F1EA';
const INK = '#15130F';

/* Bakgrunnsvarianter — sammenlignes live i preview, velgeren fjernes når valget er tatt.
   Regel for alle: bildet er skarpt (aldri blur). Vi styrer med tone, posisjon og hvor produktet ligger.
   oslo       — brukerens bilde: hvit Oslo-bygård med balkong til venstre, lønnetre øverst til høyre, stor rolig
                himmel i midten. Produktet står sentrert på himmelen; bygården reiser seg opp bak/ved siden av det,
                treet rammer inn øverst. Lyst tema, nesten ingen overlay. Venstreforankret på desktop (bygården
                skal aldri kuttes), litt innover på mobil (bygårdens kant + himmel over den smale produktflaten).
   skumring   — Bergen-fjell i skumring, tonet i plomme. Produktet står midt på himmelen.
   arkitektur — «sykt moderne» i skumring: utkraget bygg i plomme mot lavendel (speilet, så utkragingen peker mot høyre).
   dagGlass   — Sana-varianten: supercrisp dagslys, nesten ingen overlay. Lyst tema (ink-tekst).
   dagBolig   — norsk moderne bolig (Oslo, balkonger og treverk) mot dyp blå himmel. 6000 px-kilde, srcset 2000/4000.
   plomme     — ren farge, ingen verden.

   modus 'cover' = bakgrunnsbilde som dekker. modus 'scene' = <img> med egen høyde/forankring (bygget plasseres bevisst).
   srcSet = valgfri responsiv kildeliste (ellers bygges 2000/4000 fra bilde/bilde2x). posKlasse må være literale Tailwind-klasser (JIT).
   layout 'senter' | 'venstre' — hvor tabs/statement står. seksjonBg = valgfri overstyring av flaten bak bildet.
   Produktet er alltid sentrert (filmene: AnnonseFilm, KontraktFilm, DriftFilm). */
const BAKGRUNNER = {
  osloKveld: {
    /* Samme bygård, kveldsversjon: skarpt bilde under en varm, mørk tone (à la finalen) — offwhite typografi,
       produktflaten blir det lyseste objektet. Historien skjer 22:41; kvelden passer. Tonen er lettest bak
       overskriften (så fasaden leser) og tettest nederst der flaten står. */
    bilde: '/v4/bolig-oslo-2000.webp', srcSet: '/v4/bolig-oslo-1200.webp 1200w, /v4/bolig-oslo-2000.webp 2000w', pos: '50% 30%', modus: 'cover', tema: 'mork', seksjonBg: '#1B1815', layout: 'senter',
    overlay: 'linear-gradient(180deg, rgba(21,18,15,0.58) 0%, rgba(21,18,15,0.46) 38%, rgba(21,18,15,0.62) 70%, rgba(21,18,15,0.86) 100%)',
  },
  stue: {
    /* Brukerens interiør: lys Bergen-leilighet, tom vegg midt i bildet — produktflaten står på veggen, vinduet med byen
       til venstre, sofaen til høyre. Lyst tema. Svak elfenbensveil + bunnfade så kanten mot neste seksjon blir myk. */
    bilde: '/v4/stue-2000.webp', srcSet: '/v4/stue-1200.webp 1200w, /v4/stue-2000.webp 2000w', pos: '50% 62%', modus: 'cover', tema: 'lys', seksjonBg: '#E9E4DB', layout: 'senter',
    overlay: 'linear-gradient(180deg, rgba(243,241,236,0.20) 0%, rgba(243,241,236,0.06) 35%, rgba(243,241,236,0.10) 75%, rgba(236,232,225,0.62) 100%)',
  },
  oslo: {
    /* Dempet utgave av brukerens bilde, bakt inn i asset: dybdeuskarphet r≈2,2 px (v1 var 3 px, −27 %), −29 % kontrast,
       kald ivory-veil + rolig radial lysning i midten der produktet står. Skarp original: /v4/bolig-oslo-{1200,2000}.webp.
       Overlay under: bare en svært subtil lys scrim for lesbarhet bak overskriften. */
    tema: 'lys', seksjonBg: '#DCE1EB', bilde: '/v4/bolig-oslo-dempet-2000.webp', srcSet: '/v4/bolig-oslo-dempet-1200.webp 1200w, /v4/bolig-oslo-dempet-2000.webp 2000w', modus: 'scene', hoyde: '100%', forankring: 'topp', posKlasse: 'object-[36%_0%] lg:object-[0%_0%]', layout: 'senter',
    overlay: 'radial-gradient(ellipse 70% 46% at 50% 26%, rgba(243,241,236,0.22) 0%, rgba(243,241,236,0.08) 60%, rgba(243,241,236,0) 100%), linear-gradient(180deg, rgba(223,228,236,0) 0%, rgba(223,228,236,0) 80%, rgba(220,225,235,0.35) 100%)',
  },
  skumring: {
    tema: 'mork', bilde: '/v4/skumring.webp', modus: 'cover', pos: '50% 38%', layout: 'senter',
    overlay: `linear-gradient(180deg, rgba(36,28,39,0.30) 0%, rgba(36,28,39,0.10) 30%, rgba(36,28,39,0.55) 70%, ${T.plomme} 100%)`,
  },
  arkitektur: {
    tema: 'mork', bilde: '/v4/arkitektur.webp', modus: 'scene', hoyde: '116%', forankring: 'bunn', posKlasse: 'object-[74%_100%] lg:object-[0%_100%]', layout: 'senter',
    overlay: `linear-gradient(180deg, rgba(36,28,39,0.62) 0%, rgba(36,28,39,0.36) 30%, rgba(36,28,39,0.34) 58%, rgba(36,28,39,0.80) 84%, ${T.plomme} 100%)`,
  },
  dagGlass: {
    tema: 'lys', bilde: '/v4/dag-glass-2000.webp', bilde2x: '/v4/dag-glass-4000.webp', modus: 'scene', hoyde: '128%', forankring: 'bunn', posKlasse: 'object-[75%_100%] lg:object-[0%_100%]', layout: 'senter',
    overlay: 'linear-gradient(180deg, rgba(244,241,234,0) 0%, rgba(244,241,234,0) 78%, rgba(244,241,234,0.35) 100%)',
  },
  dagBolig: {
    tema: 'mork', bilde: '/v4/dag-bolig-2000.webp', bilde2x: '/v4/dag-bolig-4000.webp', modus: 'scene', hoyde: '100%', forankring: 'bunn', posKlasse: 'object-[0%_50%] lg:object-[0%_100%]', layout: 'venstre',
    overlay: 'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.22) 100%)',
  },
  plomme: { tema: 'mork', bilde: null, modus: 'cover', pos: '50% 50%', layout: 'senter', overlay: 'none' },
};

const VELGER = [['oslo', 'Oslo · bolig'], ['osloKveld', 'Oslo · kveld'], ['stue', 'Stue · Bergen'], ['skumring', 'Skumring'], ['arkitektur', 'Arkitektur'], ['dagGlass', 'Dag · glass'], ['dagBolig', 'Dag · bolig'], ['plomme', 'Plomme']];

/* Tema: farger for alt som ikke er produktflaten.
   Tabs: segmentert pille (frostet) med én glidende, fylt markør bak den aktive. Inaktive er dempet tekst;
   ikke-klare tabs er enda mer dempet (de markerer produktbredden), men er ikke klikkbare. Festet = tettere pille + skygge. */
const TEMA = {
  mork: {
    seksjonBg: T.plomme, tekst: IVORY, ingress: 'rgba(244,241,234,0.68)',
    pille: 'rgba(36,28,39,0.42)', pilleFestet: 'rgba(36,28,39,0.78)', pilleKant: 'rgba(244,241,234,0.14)',
    markor: IVORY, markorSkygge: '0 6px 18px -8px rgba(0,0,0,0.55)', tabAktiv: INK, tabTekst: 'rgba(244,241,234,0.74)', tabDempet: 'rgba(244,241,234,0.36)', tabHover: 'hover:text-[#F4F1EA]', ring: 'focus-visible:ring-[#F4F1EA]/40',
  },
  lys: {
    seksjonBg: IVORY, tekst: INK, ingress: 'rgba(21,19,15,0.66)',
    pille: 'rgba(243,241,236,0.66)', pilleFestet: 'rgba(243,241,236,0.88)', pilleKant: 'rgba(21,19,15,0.08)',
    markor: INK, markorSkygge: '0 8px 20px -10px rgba(21,19,15,0.55)', tabAktiv: IVORY, tabTekst: 'rgba(21,19,15,0.68)', tabDempet: 'rgba(21,19,15,0.34)', tabHover: 'hover:text-[#15130F]', ring: 'focus-visible:ring-[#15130F]/30',
  },
};

/* variant: 'ramme' (standard — produktflaten som kort på bakgrunn) eller 'full' (full bleed: bildet ER scenen, ingen kort,
   ingen bakgrunnsfoto, teksttabs med lilla underline over stagen, seksjonsoverskriften står inne i filmens åpning). */
export default function ProduktSeksjon({ variant = 'ramme' }) {
  const full = variant === 'full';
  const [aktiv, setAktiv] = useState('annonse');   // starter på Annonse — livssyklusen leses fra venstre
  /* Kapitlene spiller alltid videre av seg selv (Annonse → Kontrakt → Drift). Velger brukeren en tab, fortsetter kjeden derfra. */
  const [bakgrunn, setBakgrunn] = useState('oslo');   // nøkkel i BAKGRUNNER — bygården er standard; 'stue' (interiør) ligger i velgeren
  const [velgerOpen, setVelgerOpen] = useState(false);
  const [festet, setFestet] = useState(false);   // tabs-raden ligger klistret under navigasjonen
  const [markor, setMarkor] = useState(null);    // {x, w} for den glidende markøren bak aktiv tab
  const ref = useRef(null);
  const vaktRef = useRef(null);
  const listeRef = useRef(null);
  const tabRefs = useRef({});
  const synlig = useSynlig(ref, 0.12);
  /* Filmene styres av om PRODUKTFLATEN er i bildet (ikke bare seksjonen): starter når rammen sees, pauser når den forlates,
     og kapittelbyttet skjer bare mens man ser på. */
  const sceneRef = useRef(null);
  const sceneSynlig = useSynlig(sceneRef, 0.3);
  const filmSynlig = synlig && sceneSynlig;
  const scene = SCENER[aktiv] || SCENER.drift;
  const bg = BAKGRUNNER[bakgrunn] || BAKGRUNNER.plomme;
  const tema = TEMA[bg.tema] || TEMA.mork;
  const venstre = bg.layout === 'venstre';
  const srcSet = bg.srcSet || (bg.bilde2x ? `${bg.bilde} 2000w, ${bg.bilde2x} 4000w` : undefined);

  /* Sticky tabs: en 1 px vakt rett over raden. Når vakten er skrollet forbi nav-høyden, er raden festet
     og får en frostet pille bak seg så den leser over bilde og produkt. Sjekkes på scroll (rAF-throttlet) —
     IntersectionObserver mister hopp der vakten aldri er i skjæringen. Seksjonen bruker overflow-clip
     (ikke hidden) — hidden ville gjort seksjonen til scroll-container og skrudd av sticky. */
  useEffect(() => {
    const el = vaktRef.current;
    if (!el) return undefined;
    let raf = 0;
    const sjekk = () => {
      raf = 0;
      const navH = window.innerWidth >= 1024 ? 64 : 72;
      setFestet(el.getBoundingClientRect().top < navH + 1);
    };
    const planlegg = () => { if (!raf) raf = window.requestAnimationFrame(sjekk); };
    sjekk();
    window.addEventListener('scroll', planlegg, { passive: true });
    window.addEventListener('resize', planlegg);
    return () => {
      window.removeEventListener('scroll', planlegg);
      window.removeEventListener('resize', planlegg);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  /* Glidende markør: måles fra den aktive knappen (offsetLeft/offsetWidth relativt til listen). Måles på nytt
     når listen endrer størrelse (fonter lastes, vindu endres). På smale skjermer rulles den aktive inn midt i listen. */
  useEffect(() => {
    const liste = listeRef.current;
    const maal = () => {
      const b = tabRefs.current[aktiv];
      if (!b) return;
      setMarkor({ x: b.offsetLeft, w: b.offsetWidth });
      if (liste && liste.scrollWidth > liste.clientWidth + 2) {
        liste.scrollTo({ left: b.offsetLeft - (liste.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
      }
    };
    maal();
    const ro = typeof ResizeObserver !== 'undefined' && liste ? new ResizeObserver(maal) : null;
    ro?.observe(liste);
    window.addEventListener('resize', maal);
    return () => { ro?.disconnect(); window.removeEventListener('resize', maal); };
  }, [aktiv]);

  /* Tabbytte fra festet rad: hold blikket der raden er — scroll produktet inn rett under den. */
  const bytt = (id) => {
    setAktiv(id);
    if (festet && ref.current) {
      const navH = window.innerWidth >= 1024 ? 64 : 72;
      const topp = ref.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: topp - navH + 40, behavior: 'smooth' });
    }
  };

  /* Kapitlene spiller videre av seg selv (Annonse → Kontrakt → Drift) til brukeren velger en tab. Tab-markøren glir. */
  const KAPITLER = TABS.filter((t) => t.klar).map((t) => t.id);
  /* Siste kapittel (Økonomi) går tilbake til første — livssyklusen er en sirkel */
  const nesteId = KAPITLER[(KAPITLER.indexOf(aktiv) + 1) % KAPITLER.length] || null;
  const nesteNavn = nesteId ? TABS.find((t) => t.id === nesteId).navn : null;
  const [bytter, setBytter] = useState(false);       // kapittelbytte: det gamle tones ut før det nye monteres
  /* Kapittel-fremdrift i den aktive tab-pillen (tynn linje som fylles i takt med filmen) */
  const [frem, setFrem] = useState({ andel: 0, ms: 0 });
  const onFremdrift = useCallback((f) => setFrem(f), []);
  useEffect(() => { setFrem({ andel: 0, ms: 0 }); }, [aktiv]);
  const videre = () => {
    if (!nesteId || !filmSynlig) return false;        // bare når produktflaten faktisk er i bildet — ellers looper filmen
    setBytter(true);
    window.setTimeout(() => { setAktiv(nesteId); setBytter(false); }, 360);
    return true;
  };

  if (full) {
    const lys = TEMA.lys;
    return (
      <section id="produkt" ref={ref} className="relative overflow-clip" style={{ background: IVORY, color: INK }} data-testid="v4-produkt" data-variant="full">
        <div className="relative mx-auto max-w-[1760px] px-5 pt-10 sm:px-8 lg:px-10 lg:pt-12">
          <div ref={vaktRef} aria-hidden="true" className="h-px w-full" />
          {/* Teksttabs — ord, ingen kapsel. Den lilla linjen under det aktive ordet er også kapittelets fremdrift. */}
          <div ref={listeRef} role="tablist" aria-label="Produktområder" className="flex justify-center gap-6 sm:gap-9" data-testid="v4-tabs" data-variant="tekst">
            {TABS.map((t) => {
              const er = t.id === aktiv;
              return (
                <button
                  key={t.id}
                  ref={(el) => { tabRefs.current[t.id] = el; }}
                  type="button"
                  role="tab"
                  aria-selected={er}
                  aria-disabled={!t.klar}
                  onClick={() => { if (t.klar) setAktiv(t.id); }}
                  className={`relative pb-2.5 text-[14px] tracking-[-0.005em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 sm:text-[15px] ${lys.ring} ${er ? 'font-medium' : t.klar ? 'hover:text-[#15130F]' : 'cursor-default'}`}
                  style={{ color: er ? INK : t.klar ? 'rgba(21,19,15,0.48)' : 'rgba(21,19,15,0.28)' }}
                  data-testid={`v4-tab-${t.id}`}
                >
                  {t.navn}
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden rounded-full" style={{ background: er ? 'rgba(21,19,15,0.10)' : 'transparent', transition: `background-color 300ms ${EASE}` }}>
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ background: T.lilla, width: er ? `${Math.max(6, Math.round(frem.andel * 1000) / 10)}%` : '0%', transition: er && frem.ms ? `width ${frem.ms}ms linear` : `width 300ms ${EASE}` }} data-testid={er ? 'v4-tabs-fremdrift' : undefined} />
                  </span>
                </button>
              );
            })}
          </div>
          <h2 className="sr-only" data-testid="v4-produkt-tittel">{scene.tittel[0]} {scene.tittel[1]}</h2>
        </div>
        {/* Stagen — full bredde, skjermhøy. Bildet er scenen; teksten står på den. */}
        <div ref={sceneRef} className="mt-7 lg:mt-9">
          <div key={aktiv} className="animate-in fade-in-0 duration-500" style={{ opacity: bytter ? 0 : 1, transition: `opacity 340ms ${EASE}` }}>
            {aktiv === 'drift' && <DriftFilm synlig={synlig} spiller={filmSynlig} tema="lys" onFerdig={videre} onFremdrift={onFremdrift} neste={nesteNavn} full />}
            {aktiv === 'annonse' && <AnnonseFilm synlig={synlig} spiller={filmSynlig} tema="lys" onFerdig={videre} onFremdrift={onFremdrift} neste={nesteNavn} full tittel={scene.tittel} ingress={scene.ingress} />}
            {aktiv === 'kontrakt' && <KontraktFilm synlig={synlig} spiller={filmSynlig} tema="lys" onFerdig={videre} onFremdrift={onFremdrift} neste={nesteNavn} full />}
            {aktiv === 'okonomi' && <OkonomiFilm synlig={synlig} spiller={filmSynlig} tema="lys" onFerdig={videre} onFremdrift={onFremdrift} neste={nesteNavn} full />}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="produkt" ref={ref} className="relative overflow-clip" style={{ background: bg.seksjonBg || tema.seksjonBg, color: tema.tekst }} data-testid="v4-produkt">
      {/* Verden: bildet er en ramme rundt produktet — produktet står på den roligste delen. */}
      {bg.bilde && bg.modus === 'cover' && (
        <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: `url(${bg.bilde})`, backgroundSize: 'cover', backgroundPosition: bg.pos }} />
      )}
      {bg.bilde && bg.modus === 'scene' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={bg.bilde}
          aria-hidden="true"
          alt=""
          src={bg.bilde}
          srcSet={srcSet}
          sizes={srcSet ? '100vw' : undefined}
          draggable={false}
          className={`pointer-events-none absolute left-0 w-full select-none object-cover ${bg.forankring === 'topp' ? 'top-0' : 'bottom-0'} ${bg.posKlasse}`}
          style={{ height: bg.hoyde }}
        />
      )}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: bg.overlay }} />

      <div className="relative mx-auto max-w-[1760px] px-5 pb-12 pt-12 sm:px-8 lg:px-10 lg:pb-16 lg:pt-12">
        {/* Vakt for sticky-raden */}
        <div ref={vaktRef} aria-hidden="true" className="h-px w-full" />
        {/* Modus — segmentert pille med glidende markør. Klistres under navigasjonen når man skroller i seksjonen,
            så neste område alltid er ett trykk unna. */}
        <div className={`sticky top-[72px] z-30 flex lg:top-[64px] ${venstre ? 'justify-start' : 'justify-center'}`} data-testid="v4-tabs-sticky" data-festet={festet ? '1' : '0'}>
          <div
            className="inline-flex max-w-full rounded-full p-1 transition-[background-color,box-shadow] duration-300"
            style={{
              background: festet ? tema.pilleFestet : tema.pille,
              boxShadow: `inset 0 0 0 1px ${tema.pilleKant}${festet ? ', 0 12px 32px -18px rgba(0,0,0,0.45)' : ''}`,
              backdropFilter: 'blur(16px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
            }}
          >
            <div ref={listeRef} role="tablist" aria-label="Produktområder" className="relative inline-flex max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="v4-tabs">
              {markor && (
                <span aria-hidden="true" className="absolute top-0 h-full overflow-hidden rounded-full" style={{ left: markor.x, width: markor.w, background: tema.markor, boxShadow: tema.markorSkygge, transition: `left 450ms ${EASE}, width 450ms ${EASE}, background-color 300ms ${EASE}` }} data-testid="v4-tabs-markor">
                  {/* Kapittel-fremdrift: tynn linje langs bunnen av pillen (Annonse/Kontrakt har film; Drift står stille) */}
                  <span className="absolute inset-x-3 bottom-[5px] h-[2px] overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.14)', opacity: frem.andel > 0 || frem.ms > 0 ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ background: T.lilla, width: `${Math.round(frem.andel * 1000) / 10}%`, transition: frem.ms ? `width ${frem.ms}ms linear` : 'none' }} data-testid="v4-tabs-fremdrift" />
                  </span>
                </span>
              )}
              {TABS.map((t) => {
                const er = t.id === aktiv;
                return (
                  <button
                    key={t.id}
                    ref={(el) => { tabRefs.current[t.id] = el; }}
                    type="button"
                    role="tab"
                    aria-selected={er}
                    aria-disabled={!t.klar}
                    onClick={() => { if (t.klar) bytt(t.id); }}
                    className={`relative z-[1] h-9 shrink-0 rounded-full px-3.5 text-[13.5px] tracking-[-0.005em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 sm:px-[18px] sm:text-[14px] ${tema.ring} ${er ? 'font-medium' : t.klar ? tema.tabHover : 'cursor-default'}`}
                    style={{ color: er ? tema.tabAktiv : t.klar ? tema.tabTekst : tema.tabDempet }}
                    data-testid={`v4-tab-${t.id}`}
                  >
                    {t.navn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Statement — bytter med scenen (key → sekvensiell inngang) */}
        <div className={`mt-10 max-w-[820px] lg:mt-10 ${venstre ? 'text-left' : 'mx-auto text-center'}`} style={{ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(16px)', transition: `opacity 700ms ${EASE}, transform 700ms ${EASE}` }}>
          <div key={aktiv} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-500" style={{ opacity: bytter ? 0 : 1, transition: `opacity 340ms ${EASE}` }}>
            <h2 className="text-[clamp(40px,4.8vw,78px)]" style={{ ...display, color: tema.tekst }} data-testid="v4-produkt-tittel">
              {scene.tittel[0]}<br />{scene.tittel[1]}
            </h2>
            <p className={`mt-6 max-w-[46ch] text-[17px] leading-[1.5] sm:text-[19px] ${venstre ? '' : 'mx-auto'}`} style={{ color: tema.ingress }}>{scene.ingress}</p>
          </div>
        </div>

        {/* Produktet — alltid sentrert */}
        <div ref={sceneRef} className="mt-12 lg:mt-20">
          {/* Scenebytte: den nye flaten kommer inn sekvensielt (key → ny montering), ingen overlappende crossfade */}
          <div key={aktiv} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ opacity: bytter ? 0 : 1, transform: bytter ? 'translateY(-8px)' : 'none', transition: `opacity 340ms ${EASE}, transform 340ms ${EASE}` }}>
            {aktiv === 'drift' && <DriftFilm synlig={synlig} spiller={filmSynlig} tema={bg.tema} onFerdig={videre} onFremdrift={onFremdrift} neste={nesteNavn} />}
            {aktiv === 'annonse' && <AnnonseFilm synlig={synlig} spiller={filmSynlig} tema={bg.tema} onFerdig={videre} onFremdrift={onFremdrift} neste={nesteNavn} />}
            {aktiv === 'kontrakt' && <KontraktFilm synlig={synlig} spiller={filmSynlig} tema={bg.tema} onFerdig={videre} onFremdrift={onFremdrift} neste={nesteNavn} />}
            {aktiv === 'okonomi' && <OkonomiFilm synlig={synlig} spiller={filmSynlig} tema={bg.tema} onFerdig={videre} onFremdrift={onFremdrift} neste={nesteNavn} />}
          </div>
        </div>
      </div>

      {/* Preview-velger for bakgrunn — diskré: ett lite ikon nede til venstre som åpner valgene. Fjernes når valget er låst. */}
      <div className="absolute bottom-3 left-3 z-20 flex flex-col items-start gap-2" data-testid="v4-bg-velger">
        {velgerOpen && (
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full p-1 text-[12px]" style={{ background: 'rgba(36,28,39,0.78)', boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.14)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} data-testid="v4-bg-valg">
            {VELGER.map(([id, navn]) => (
              <button key={id} type="button" onClick={() => { setBakgrunn(id); setVelgerOpen(false); }} className="h-7 rounded-full px-3" style={{ background: bakgrunn === id ? IVORY : 'transparent', color: bakgrunn === id ? T.ink : 'rgba(244,241,234,0.7)' }} data-testid={`v4-bg-${id}`}>{navn}</button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setVelgerOpen((o) => !o)}
          aria-label="Bytt bakgrunn (forhåndsvisning)"
          aria-expanded={velgerOpen}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-opacity duration-300 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          style={{ background: 'rgba(36,28,39,0.55)', color: 'rgba(244,241,234,0.85)', opacity: velgerOpen ? 0.9 : 0.28, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          data-testid="v4-bg-toggle"
        >
          <Layers className="h-3.5 w-3.5" strokeWidth={1.7} />
        </button>
      </div>
    </section>
  );
}
