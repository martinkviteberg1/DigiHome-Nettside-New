'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EASE, T, display } from './motion';

/* ---------------------------------------------------------------------------
   Telefonstrom — samtalen som «projiseres» opp fra telefonen hans (heroen, hjemme i sofaen).

   En ekte tråd, ikke kort som popper på plass:
   · Nye meldinger kommer inn NEDERST og skyver de eldre oppover (raden vokser 0fr → 1fr). Øverst tones tråden
     bort i en myk maske — som en samtale du ser bunnen av. Eldre slag står igjen, dempet, til de er ute av bildet.
   · Svar (DigiHome, Emma) begynner som en skriveindikator (···) som MORFER til boblen — samme glassflate, ingen
     bytte. Prikkene tones bort idet flaten vokser, og teksten kommer skarp ut av en svak uskarphet.
   · Eierens egne meldinger SENDES fra telefonen: boblen løfter seg ut av skjermen i en lett bue og lander nederst i
     tråden. Innkommende meldinger får skjermen til å gløde svakt — det er den eneste effekten ved telefonen.
   · Godkjenningen skjer i samtalen: kostnaden står i DigiHome-boblen med én knapp; ett slag senere presses knappen
     ned (han trykker på telefonen), blir grønn «Godkjent», og kvitteringen kommer under. Ingen glans, ingen stjerner.
   · Én lystråd binder tråden til telefonen — lysest ved skjermen, tones bort mot samtalen. Tegnes én gang.

   Telefonen ligger på ~(33 %, 50 %) av filmbildet (30:17). Scenen har et annet format og filmen dekker (object-cover),
   så punktet regnes om fra scenens målte størrelse. Kun transform/opacity i bevegelse — pluss bredde/høyde på ÉN liten
   flate under morfingen og grid-rader på tråden (små elementer, aldri video).
--------------------------------------------------------------------------- */

const TELEFON = { x: 0.33, y: 0.503 };      // toppen av skjermen, i filmens koordinater
const FILM_ASPEKT = 30 / 17;
/* Smal skjerm: scenen er stående (4:5.6) og viser bare ~40 % av filmens bredde — object-position 30 % (se .dh-hero-hjem). */
const HJEM_FOKUS_SMAL_X = 0.30;
/* Smal skjerm: rammen er skalert litt opp om (30 %, 100 %) — se .dh-hero-hjem-ramme. */
const HJEM_ZOOM_SMAL = 1.26;

/* Samtalen — fem slag. `fra`: 'deg' = eieren (sendes fra telefonen), 'dh' = DigiHome svarer, 'emma' = leietakeren.
   `ms` = hvor lenge slaget står før neste; `kl` = klokken i veggens stille linje. Siste slag blir stående. {adresse} byttes ut. */
export const STROM = [
  { id: 'visning', kl: '20:41', ms: 4800, chat: [{ fra: 'deg', bilder: ['/v4/annonse/kjokken-600.webp', '/v4/annonse/soverom-600.webp', '/v4/annonse/kjokken-bar-600.webp'], t: '5 bilder', kvittering: 'Levert 08:52' }, { fra: 'dh', t: 'Annonsen er ute på FINN. Visning lørdag 12:00 — 4 påmeldt.', ikon: 'prikk' }] },
  { id: 'kontrakt', kl: '20:42', ms: 5400, chat: [{ fra: 'dh', t: 'Emma signerte leiekontrakten med BankID.', ikon: 'hake' }, { fra: 'dh', t: 'Depositumet står på konto. Nøkler lørdag 12:00.' }, { fra: 'deg', t: '👍', kvittering: 'Lest' }] },
  { id: 'regnskap', kl: '20:43', ms: 4600, chat: [{ fra: 'deg', t: 'Har Emma betalt?', kvittering: 'Lest 08:12' }, { fra: 'dh', t: 'Ja — 14 500 kr kom 08:12. Bokført.' }] },
  /* Godkjenningen er selve produktet: DigiHome legger fram kostnaden i samtalen, eieren trykker Godkjenn på telefonen —
     knappen presses ned i projeksjonen, blir grønn, og Emma får svar. `tapp` er trykket (ingen boble, men et slag i takten). */
  { id: 'emma', kl: '20:44', ms: 6800, bilde: '/v4/annonse/leietaker-emma.webp', chat: [{ fra: 'emma', t: 'Hei! Varmtvannet er borte 😕' }, { fra: 'dh', t: 'Rørlegger AS kan komme i dag 14:00.', godkjenning: { hva: 'Varmtvann · Leilighet 2', belop: '2 400 kr' } }, { fra: 'deg', tapp: true }, { fra: 'emma', t: 'Varmt vann igjen — tusen takk!' }] },
  { id: 'kveld', kl: '20:45', ms: 0, slutt: true, chat: [{ fra: 'dh', t: 'Alt i orden på {adresse}. Ingenting venter på deg — god kveld.', ikon: 'hake' }] },
];
const STROM_START = 1500; const STROM_TAKT = 3000; const STROM_ETTER = 700;
/* Åpningen (direkte-modus): pushvarsel → han trykker → appen blomstrer ut. Så starter samtalen. */
const AAPNING_MS = 2500;
const BOBLE_TAKT = 1100;   // ms mellom boblene i ett slag
const T_FORSTE = 200;      // første boble i et slag

/* Ekte fjærer: --dh-fjaer/--dh-land er linear()-kurver i globals.css (cubic-bezier som reserve) */
const FJAER = 'var(--dh-fjaer)';   // pillen, avataren: rask, liten overskyting
const MORF = 'var(--dh-land)';     // morfen og landingen: myk, lander med et lite pust
const PILLE = { w: 46, h: 30 };                       // skriveindikatorens mål før den blir boble

/* Glass — tre materialer. Alltid transform/opacity i bevegelse; backdrop-filter bare på små flater.
   Ingen kant, ingen lys ramme: flaten er glasset selv — bare en svak diagonal glans gir dybde. */
const GLASS = {
  dh: { background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 48%), rgba(21,19,15,0.76)', color: '#F4F1EA', boxShadow: '0 24px 60px -24px rgba(0,0,0,0.6)' },
  deg: { background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 52%), rgba(201,160,255,0.74)', color: T.ink, boxShadow: '0 20px 50px -22px rgba(60,20,120,0.45)' },
  emma: { background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 55%), rgba(251,250,248,0.72)', color: T.ink, boxShadow: '0 20px 50px -22px rgba(0,0,0,0.35)' },
};
const glass = { backdropFilter: 'blur(18px) saturate(150%)', WebkitBackdropFilter: 'blur(18px) saturate(150%)' };

/* Én rad i tråden: vokser fra 0 til sin høyde (skyver de eldre opp). Innholdet ligger i bunnen av raden hele veien,
   så boblen står stille mens rommet over den vokser. */
function Rad({ ny, t0, children }) {
  return (
    <div className="grid" style={ny ? { animation: `v4-rad-inn 460ms ${EASE} ${Math.max(0, t0 - 60)}ms both` } : { gridTemplateRows: '1fr' }}>
      <div className="flex min-h-0 flex-col justify-end">{children}</div>
    </div>
  );
}

/* Én boble. Konvensjonen er samtalens egen: eieren (deg) til høyre i lilla glass, DigiHome og Emma til venstre — DigiHome i
   mørkt glass med merket som avatar, Emma i lyst glass med bildet sitt.
   'svar' (DigiHome/Emma): skriveindikatoren (pille) står i halehjørnet → MORFER til boblens mål → teksten kommer skarp ut
   av uskarpheten INNE i flaten (klippet av skallet mens det vokser — aldri tekst utenfor boblen).
   'send' (eieren): hele boblen sendes fra telefonens punkt (--dx/--dy) og lander i tråden — innholdet er med hele veien.
   Innholdet i flyt er usynlig og bestemmer bare målet (fraksjonell bredde måles → ingen omflyt i kopien). */
const PAD = '8px 12px';
function Avatar({ fra, m, px, ny, t0, mb = 0 }) {
  const inn = { marginBottom: mb, ...(ny ? { opacity: 0, animation: `v4-pille-inn 520ms ${FJAER} ${t0}ms both` } : {}) };
  if (fra === 'emma') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.bilde || '/v4/annonse/leietaker-emma.webp'} alt="" width={px} height={px} className="shrink-0 rounded-full object-cover" style={{ width: px, height: px, boxShadow: '0 0 0 1.5px rgba(251,250,248,0.9), 0 6px 16px -6px rgba(0,0,0,0.5)', ...inn }} />;
  }
  /* DigiHome: merket tegnes rett i en lilla sirkel (samme strøk som /brand/digihome-icon-purple.svg) — ingen ramme, ingen kant */
  return (
    <svg width={px} height={px} viewBox="0 0 60 60" aria-hidden="true" className="shrink-0" style={{ width: px, height: px, borderRadius: '50%', boxShadow: '0 6px 16px -6px rgba(0,0,0,0.5)', ...inn }}>
      <circle cx="30" cy="30" r="30" fill="#D298FF" />
      {[[45.0359, 36.7341], [42.5159, 51.0244], [47.5559, 22.4436], [18.6284, 36.7341], [29.3123, 51.0244], [34.3521, 22.4436], [16.1084, 51.0244], [21.1484, 22.4436]].map(([x, y]) => (
        <rect key={`${x}-${y}`} width="6.60155" height="14.5107" transform={`matrix(-1 0 0.173648 -0.984808 ${x} ${y})`} fill="#1F1F1F" />
      ))}
    </svg>
  );
}

function Boble({ c, m, ny, t0, fs, bildePx, avatarPx, adresse, dxy, visAvatar = true, smal = false }) {
  const fra = c.fra;
  const hoyre = fra === 'deg';
  const send = hoyre;
  const mat = GLASS[fra] || GLASS.dh;
  const radius = hoyre ? '18px 18px 6px 18px' : '18px 18px 18px 6px';
  const anker = hoyre ? { right: 0 } : { left: 0 };
  const tekst = String(c.t || '').replace('{adresse}', adresse);
  /* Innholdets mål (etter fonter) → morfens sluttverdi og kopiens faste bredde. Måles synkront før første maling.
     Kopien får målerens bredde (+1) — ikke «100 %»: skallets 1 px-kant ville gjort den 2 px smalere og brutt linjen. */
  const innRef = useRef(null);
  const [dim, setDim] = useState(null);
  useLayoutEffect(() => {
    const el = innRef.current; if (!el) return;
    /* offsetWidth (layout, upåvirket av transform — send-boblen står skalert i første bilde). +1 px så kopien aldri bryter
       linjen annerledes enn måleren. */
    setDim({ w: el.offsetWidth + 1, h: el.offsetHeight });
  }, [tekst, fs]);
  const T_MORF = t0 + 640;
  const T_TEKST = T_MORF + 200;
  const prikk = fra === 'dh' ? 'rgba(244,241,234,0.72)' : 'rgba(21,19,15,0.42)';
  const stille = !ny;

  const skall = stille || send
    ? { width: '100%', height: '100%' }
    : {
      '--bw': dim ? `${dim.w}px` : '100%', '--bh': dim ? `${dim.h}px` : '100%',
      width: PILLE.w, height: PILLE.h, opacity: 0, transformOrigin: hoyre ? '100% 100%' : '0% 100%',
      animation: `v4-pille-inn 480ms ${FJAER} ${t0}ms both, v4-morf 560ms ${MORF} ${T_MORF}ms both`,
      willChange: 'width, height, transform, opacity',
    };
  /* Ordene kommer ett og ett (38 ms mellom), skarpt ut av uskarpheten — i svar-boblen etter morfingen. Sendte bobler
     har teksten med seg hele veien. */
  const ordInn = (i) => (stille || send ? {} : { opacity: 0, animation: `v4-ord-boble 420ms ${EASE} ${T_TEKST + i * 38}ms both` });
  const ord = tekst.split(' ');

  /* Godkjenningen inne i boblen: kostnaden og én knapp. Trykket kommer ett slag senere (T_TAPP): knappen presses ned,
     blir grønn «Godkjent» med hake, en ring slår ut der fingeren var — og ved telefonen. */
  const G = c.godkjenning;
  const T_TAPP = t0 + BOBLE_TAKT + 220;
  const godkjenning = G ? (
    <span className="mt-2.5 flex items-center justify-between gap-2.5 border-t pt-2.5" style={{ borderColor: 'rgba(255,255,255,0.12)', minWidth: smal ? 0 : 196, ...ordInn(ord.length + 1) }}>
      <span className="min-w-0">
        <span className="block truncate text-[11px]" style={{ color: 'rgba(244,241,234,0.6)' }}>{G.hva}</span>
        <span className="block tabular-nums" style={{ ...display, fontSize: smal ? 15.5 : 17, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{G.belop}</span>
      </span>
      <span className="relative inline-grid h-7 shrink-0 place-items-center overflow-visible rounded-full px-3 text-[12px] font-medium" style={{ background: stille ? T.gronn : T.lilla, color: stille ? '#fff' : T.ink, ...(stille ? {} : { animation: `v4-godkjent 520ms ${EASE} ${T_TAPP}ms both` }) }} data-testid="v4-strom-godkjenn">
        {/* Etikettene ligger i samme rute og bytter idet trykket lander */}
        <span className="col-start-1 row-start-1" style={stille ? { opacity: 0 } : { animation: `v4-prikker-ut 160ms ease-out ${T_TAPP + 120}ms both` }}>Godkjenn</span>
        <span className="col-start-1 row-start-1 inline-flex items-center gap-1" style={stille ? {} : { opacity: 0, animation: `v4-ord-boble 300ms ${EASE} ${T_TAPP + 200}ms both` }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.4 6.4 L5 8.9 L9.7 3.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="24" strokeDashoffset={stille ? 0 : 24} style={stille ? undefined : { animation: `v4-hake-tegn 380ms ${EASE} ${T_TAPP + 260}ms both` }} /></svg>
          Godkjent
        </span>
        {/* Fingeren: en ring slår ut fra knappen idet han trykker */}
        {!stille && <span aria-hidden="true" className="pointer-events-none absolute h-6 w-6 rounded-full" style={{ left: 'calc(50% - 12px)', top: 'calc(50% - 12px)', border: '1px solid rgba(255,255,255,0.55)', opacity: 0, animation: `v4-ring 520ms ${EASE} ${T_TAPP}ms both` }} />}
      </span>
    </span>
  ) : null;

  const innhold = (
    <span className="inline-flex items-start gap-1.5">
      {c.ikon === 'hake' && (
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" className="mt-[3px] shrink-0" aria-hidden="true" style={ordInn(0)}>
          <path d="M2.4 6.4 L5 8.9 L9.7 3.3" stroke="#5FD39A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="24" strokeDashoffset={ny ? 24 : 0} style={ny ? { animation: `v4-hake-tegn 460ms ${EASE} ${T_TEKST + 300}ms both` } : undefined} />
        </svg>
      )}
      {c.ikon === 'prikk' && <span className="mt-[6px] inline-block h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: T.lilla, boxShadow: '0 0 10px 1px rgba(201,160,255,0.7)', ...ordInn(0) }} />}
      <span className="block">
        {ord.map((o, i) => (
          <span key={`${o}-${i}`} className="inline-block" style={{ marginRight: i < ord.length - 1 ? '0.26em' : 0, ...ordInn(i + (c.ikon ? 1 : 0)) }}>{o}</span>
        ))}
        {godkjenning}
      </span>
    </span>
  );

  return (
    <div className={`flex w-full items-end gap-1.5 pt-2 ${hoyre ? 'justify-end' : 'justify-start'}`}>
      {/* Avataren står ved den første boblen i en rekke fra samme avsender; de neste får bare plassen (som i en samtale) */}
      {!hoyre && (visAvatar ? <Avatar fra={fra} m={m} px={avatarPx} ny={ny} t0={t0} mb={G ? 17 : 0} /> : <span aria-hidden="true" className="shrink-0" style={{ width: avatarPx }} />)}
      <span
        className="relative block max-w-[86%]"
        style={send && ny ? { '--dx': `${dxy.x}px`, '--dy': `${dxy.y}px`, transformOrigin: '100% 100%', opacity: 0, animation: `v4-send 760ms ${MORF} ${t0}ms both`, willChange: 'transform, opacity' } : undefined}
      >
        <span className="relative block">
          {/* Skallet — glassflaten. I svar-modus: pille i halehjørnet → boblens mål. Teksten ligger INNE i skallet.
              Bilder sendes uten skall — bare bildene, som i en ekte samtale. */}
          {!c.bilder && <span aria-hidden="true" className="absolute bottom-0 overflow-hidden" style={{ ...anker, ...mat, ...glass, borderRadius: radius, ...skall }}>
            {!send && ny && (
              <span className="absolute inset-0 flex items-center justify-center gap-[4px]" style={{ animation: `v4-prikker-ut 200ms ease-out ${T_MORF}ms both` }}>
                {[0, 1, 2].map((d) => <span key={d} className="block h-[5px] w-[5px] rounded-full" style={{ background: prikk, animation: `v4-prikk 900ms ease-in-out ${d * 150}ms infinite` }} />)}
              </span>
            )}
            {!c.bilder && (
              <span className="absolute bottom-0 block" style={{ ...anker, width: dim ? dim.w : '100%', height: dim ? dim.h : '100%', padding: PAD, fontSize: fs, lineHeight: 1.35, color: mat.color }}>{innhold}</span>
            )}
          </span>}
          {/* Innholdet i flyt: bildene vises her; teksten er bare måler (kopien inne i skallet er den synlige) */}
          {c.bilder ? (
            /* Bildene eieren sendte: fanner ut fra midten av kortet idet det har landet, retter seg opp */
            <span ref={innRef} className="relative flex gap-[5px]">
              {c.bilder.map((b, q) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={b} src={b} alt="" width={bildePx} height={bildePx} className="rounded-[12px] object-cover" style={{ width: bildePx, height: bildePx, '--fra': `${(1 - q) * (bildePx + 5)}px`, '--rot': `${(q - 1) * 8}deg`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35), 0 14px 30px -14px rgba(0,0,0,0.55)', ...(ny ? { opacity: 0, animation: `v4-foto-fan 680ms ${FJAER} ${t0 + 560 + q * 70}ms both` } : {}) }} />
              ))}
            </span>
          ) : (
            <span ref={innRef} className="relative block" style={{ padding: PAD, fontSize: fs, lineHeight: 1.35, visibility: 'hidden' }}>{innhold}</span>
          )}
        </span>
        {/* Under godkjenningen: hvem, og når — kommer idet trykket har landet */}
        {G && (
          <span className="block pl-1 pt-[3px] text-[10px]" style={{ color: 'rgba(251,250,248,0.8)', textShadow: '0 1px 6px rgba(0,0,0,0.45)', ...(ny ? { opacity: 0, animation: `v4-tekst-inn 400ms ${EASE} ${T_TAPP + 520}ms both` } : {}) }}>Godkjent av deg · 10:04</span>
        )}
        {/* Kvittering under eierens bobler — «Levert», så «Lest». Står også på eldre slag (ingen hopp når slaget eldes). */}
        {c.kvittering && (
          <span className="block pr-1 pt-[3px] text-right text-[10px]" style={{ color: 'rgba(251,250,248,0.8)', textShadow: '0 1px 6px rgba(0,0,0,0.45)', ...(ny ? { opacity: 0, animation: `v4-tekst-inn 400ms ${EASE} ${t0 + 820}ms both` } : {}) }}>{c.kvittering}</span>
        )}
      </span>
    </div>
  );
}

/* DigiHome-merket i en lilla sirkel — samme strøk som avataren, til pushvarselet */
function DhMerke({ px }) {
  return (
    <svg width={px} height={px} viewBox="0 0 60 60" aria-hidden="true" className="shrink-0" style={{ width: px, height: px, borderRadius: '14px' }}>
      <rect width="60" height="60" rx="16" fill="#D298FF" />
      {[[45.0359, 36.7341], [42.5159, 51.0244], [47.5559, 22.4436], [18.6284, 36.7341], [29.3123, 51.0244], [34.3521, 22.4436], [16.1084, 51.0244], [21.1484, 22.4436]].map(([x, y]) => (
        <rect key={`${x}-${y}`} width="6.60155" height="14.5107" transform={`matrix(-1 0 0.173648 -0.984808 ${x} ${y})`} fill="#1F1F1F" />
      ))}
    </svg>
  );
}

/* Åpningen — ingen telefonramme, bare ett vakkert pushvarsel som stiger opp av hånden hans.
   En hårlinje trekkes fra telefonen (X,Y) opp til varselet; et varmt lilla ambient-lys blomstrer bak.
   Varselet lander med et lite pust (iOS-språk: app-ikon, navn, «nå», tittel, tekst). Han trykker — en ring
   slår ut, varselet presses, en myk glød — og hele varselet skalerer ut mens appen blomstrer i rommet. */
function Aapning({ X, Y, fx, fy, B, maalW, maalH, smal, adresse, speil = false, pil = true }) {
  const x0 = X + (speil ? -2 : 2);
  const cardW = smal ? Math.min(Math.round(maalW - 28), 306) : 300;
  const cardCx = fx + B / 2;
  const cardLeft = Math.max(12, Math.min(Math.round(cardCx - cardW / 2), Math.round(maalW - cardW - 12)));
  const cardCxReal = cardLeft + cardW / 2;
  const cardTop = Math.max(14, Math.round(fy - (smal ? 158 : 172)));
  const iconPx = smal ? 34 : 36;
  /* Hårlinjens topp: bunnen av varselet (anslått høyde) */
  const linjeY = cardTop + (smal ? 82 : 86);

  return (
    <div className="pointer-events-none absolute inset-0 z-[4]" style={{ animation: `v4-aapne-ut 500ms ${EASE} ${AAPNING_MS - 380}ms both` }} data-testid="v4-aapning">
      {/* Ambient: et varmt lilla lys som blomstrer bak varselet */}
      <span aria-hidden="true" className="absolute rounded-full" style={{ left: cardCxReal - cardW * 0.75, top: cardTop - cardW * 0.35, width: cardW * 1.5, height: cardW * 1.5, background: 'radial-gradient(circle, rgba(184,146,255,0.30) 0%, rgba(184,146,255,0.10) 40%, rgba(184,146,255,0) 68%)', filter: 'blur(3px)', animation: `v4-ambient 1000ms ${EASE} 120ms both` }} />

      {/* Hårlinjen fra hånden hans opp til varselet — kun på store skjermer (på mobil «treffer» den ikke og roter til bildet). */}
      {!smal && pil && (
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${maalW} ${maalH}`} preserveAspectRatio="none">
          <line x1={x0} y1={Y} x2={cardCxReal} y2={linjeY} stroke="rgba(244,241,234,0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" pathLength="1" strokeDasharray="1" strokeDashoffset="1" style={{ animation: `v4-strek 720ms ${EASE} 220ms both` }} />
          <circle cx={x0} cy={Y} r="2.2" fill="#FBFAF8" style={{ opacity: 0, animation: `v4-lese-inn 400ms ${EASE} 220ms both` }} />
        </svg>
      )}

      {/* Pushvarselet — stiger opp av hånden, lander med et pust */}
      <div className="absolute" style={{ left: cardLeft, top: cardTop, width: cardW, transformOrigin: '50% 100%', animation: `v4-varsel-inn 720ms ${MORF} 420ms both` }}>
        <div className="relative overflow-hidden" style={{ borderRadius: 22, padding: smal ? '13px 14px' : '14px 15px', background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 44%), rgba(28,25,22,0.62)', boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.16), 0 30px 70px -28px rgba(0,0,0,0.72), 0 12px 40px -20px rgba(160,120,255,0.4)', backdropFilter: 'blur(22px) saturate(150%)', WebkitBackdropFilter: 'blur(22px) saturate(150%)', animation: `v4-push-pust 1000ms ${EASE} 1360ms both, v4-push-trykk 460ms ${EASE} ${AAPNING_MS - 560}ms both` }}>
          <div className="flex items-start gap-2.5">
            <DhMerke px={iconPx} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold uppercase tracking-[0.07em]" style={{ fontSize: 10, color: 'rgba(244,241,234,0.66)' }}>DigiHome</span>
                <span className="ml-auto" style={{ fontSize: 10.5, color: 'rgba(244,241,234,0.5)' }}>nå</span>
              </div>
              <p className="mt-1 font-semibold leading-[1.3]" style={{ fontSize: smal ? 13.5 : 14, color: '#F7F5F1' }}>Husleie mottatt</p>
              <p className="mt-0.5 leading-[1.32]" style={{ fontSize: smal ? 12.5 : 13, color: 'rgba(244,241,234,0.66)' }}>14 500 kr fra Emma Sørensen · bokført</p>
            </div>
          </div>
          {/* Ringen der han trykker */}
          <span aria-hidden="true" className="absolute rounded-full" style={{ right: '9%', bottom: '24%', width: 26, height: 26, border: '1px solid rgba(244,241,234,0.6)', opacity: 0, animation: `v4-ring 660ms ${EASE} ${AAPNING_MS - 580}ms both` }} />
          {/* Myk glød idet appen åpnes */}
          <span aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(220,200,255,0.25) 45%, rgba(255,255,255,0) 74%)', opacity: 0, animation: `v4-skjerm-blink 500ms ${EASE} ${AAPNING_MS - 460}ms both` }} />
        </div>
      </div>
    </div>
  );
}

export default function Telefonstrom({ hjemme, redusert, smal, puls, adresse = 'Nygårdsgaten 5', direkte = false, onApnet, speil = false, pil = true }) {
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
  /* Bildene i samtalen varmes opp idet scenen er hjemme — så de aldri dukker opp halvlastet i tråden */
  useEffect(() => {
    if (!hjemme || typeof window === 'undefined') return;
    STROM.forEach((m) => { (m.chat || []).forEach((c) => (c.bilder || []).forEach((b) => { const im = new window.Image(); im.src = b; })); if (m.bilde) { const im = new window.Image(); im.src = m.bilde; } });
  }, [hjemme]);
  /* Slagene følger klokken i useFortelling: `puls` øker én gang per slag, og samtalen kommer opp litt etter (STROM_ETTER).
     Uten puls (Street View-flyten) går strømmen i egen takt. */
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

  /* Åpningen (kun direkte-modus): silhuett + pushvarsel spilles én gang idet scenen er hjemme. Når den er ferdig
     (AAPNING_MS), meldes det opp (onApnet) — da våkner veggen og samtalen starter. Redusert/ikke-direkte: appen er
     «åpen» med en gang. */
  const [apnet, setApnet] = useState(!direkte);
  useEffect(() => {
    if (!hjemme) { setApnet(false); return undefined; }
    if (!direkte || redusert) { setApnet(true); if (onApnet) onApnet(); return undefined; }
    setApnet(false);
    const t = window.setTimeout(() => { setApnet(true); if (onApnet) onApnet(); }, AAPNING_MS);
    return () => window.clearTimeout(t);
  }, [hjemme, redusert, direkte, onApnet]);

  /* Filmpunkt → scenepunkt (object-cover, sentrert) */
  const A = maal.w && maal.h ? maal.w / maal.h : FILM_ASPEKT;
  /* object-position x (ox) på smal skjerm flytter utsnittet: filmpunkt t → beholder t·R − (R − 1)·ox, R = FILM_ASPEKT/A */
  const ox = smal ? HJEM_FOKUS_SMAL_X : 0.5;
  let px = A >= FILM_ASPEKT ? TELEFON.x : TELEFON.x * (FILM_ASPEKT / A) - (FILM_ASPEKT / A - 1) * ox;
  let py = A >= FILM_ASPEKT ? 0.5 + (TELEFON.y - 0.5) * (A / FILM_ASPEKT) : TELEFON.y;
  /* Smal: rammen er skalert HJEM_ZOOM_SMAL om (30 %, 100 %) — punktet følger med */
  if (smal) { px = HJEM_FOKUS_SMAL_X + (px - HJEM_FOKUS_SMAL_X) * HJEM_ZOOM_SMAL; py = 1 - (1 - py) * HJEM_ZOOM_SMAL; }
  /* speil: filmen er speilvendt (han sitter til høyre) — da speiles skjermpunktet, og tråden står til VENSTRE for ham. */
  const X = speil ? maal.w - px * maal.w : px * maal.w; const Y = py * maal.h;
  /* Tråden står opp og til høyre for skjermen — over skulderen, aldri over ansiktet. Bunnen bindes til skjermen.
     Bredden følger scenen (204–272 px); på smal skjerm klemmes den inn så den aldri går ut av scenens høyrekant. */
  const trang = !smal && maal.w < 1010;
  /* Smal skjerm: tråden bruker mer av scenens bredde (så bobler og godkjenning aldri kuttes), men aldri helt ut til kanten. */
  const B = smal ? Math.min(Math.max(232, maal.w - 28), 264) : Math.max(204, Math.min(272, Math.round(maal.w * 0.246 - 4)));
  const off = smal || trang ? 12 : Math.round(maal.w * 0.034);
  const fx = speil
    ? Math.max(12, Math.min(X - off - B, maal.w - B - 12))
    : Math.min(X + off, smal ? Math.max(12, maal.w - B - 12) : Infinity);
  /* Smal skjerm: bunnen ligger i høyde med hendene hans (Y + 18), til høyre for telefonen. */
  const fy = smal ? Y + 18 : Y - (trang ? 26 : Math.round(maal.h * 0.042));
  /* Trådens synlige høyde — nyeste slag nederst, eldre over, øverst tones alt bort. Bunnpolstring gir skyggene rom. */
  const H = smal ? 220 : 272;
  const POLSTRING = 44;
  const inne = n >= 0;
  const fs = smal ? 13 : 13.5;
  const bildePx = smal ? 58 : 68;
  const avatarPx = 24;
  /* Lystrådens to ender: skjermpunktet og trådens nedre hjørne nærmest telefonen (venstre normalt, høyre ved speil). */
  const L0 = { x: speil ? X - 4 : X + 4, y: Y - 2 }; const L1 = speil ? { x: fx + B - 12, y: fy + 4 } : { x: fx + 12, y: fy + 4 };
  /* Eierens bobler sendes fra skjermpunktet: forskyvning fra boblens landingshjørne (nede til høyre i tråden) */
  const dxy = { x: Math.round(L0.x - (fx + B)), y: Math.round(L0.y - fy) };
  const MASKE = `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 14%, #000 30%, #000 100%)`;

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3] overflow-hidden" data-testid="v4-telefonstrom" data-n={n} data-apnet={apnet ? '1' : '0'}>
      {maal.w > 0 && hjemme && !redusert && direkte && !apnet && (
        <Aapning X={X} Y={Y} fx={fx} fy={fy} B={B} maalW={maal.w} maalH={maal.h} smal={smal} adresse={adresse} speil={speil} pil={pil} />
      )}
      {maal.w > 0 && hjemme && !redusert && apnet && (
        <>
          {/* Lystråden fra skjermen opp til tråden — lysest ved kilden, tegnes én gang. Kun store skjermer:
              på mobil står tråden rett over telefonen (maske-fade), og en linje «treffer» ikke — den kuttes. */}
          {!smal && pil && (
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${maal.w} ${maal.h}`} preserveAspectRatio="none" style={{ opacity: inne ? 1 : 0, transition: `opacity 500ms ${EASE}` }}>
            <defs>
              <linearGradient id="v4-lystrad" gradientUnits="userSpaceOnUse" x1={L0.x} y1={L0.y} x2={L1.x} y2={L1.y}>
                <stop offset="0" stopColor="#FBFAF8" stopOpacity="0.8" />
                <stop offset="0.55" stopColor="#FBFAF8" stopOpacity="0.32" />
                <stop offset="1" stopColor="#FBFAF8" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <line x1={L0.x} y1={L0.y} x2={L1.x} y2={L1.y} stroke="url(#v4-lystrad)" strokeWidth="1" vectorEffect="non-scaling-stroke" pathLength="1" strokeDasharray="1" strokeDashoffset={inne ? 0 : 1} style={{ transition: `stroke-dashoffset 1100ms ${EASE} 200ms` }} />
            <circle cx={L0.x} cy={L0.y} r="2.2" fill="#FBFAF8" style={{ opacity: inne ? 0.95 : 0, transition: `opacity 400ms ${EASE} 100ms` }} />
          </svg>
          )}
          {/* Skjermen lyser svakt opp idet noe kommer INN — det er alt. Sending og trykk trenger ingen effekt: boblen forlater
              skjermen, og knappen presses ned der den står. */}
          {inne && (STROM[n].chat || []).map((c, j) => {
            if (c.fra === 'deg') return null;
            const t0 = T_FORSTE + j * BOBLE_TAKT;
            const GLOD = 44;
            return (
              <span key={`${n}-${j}`} className="absolute block rounded-full" style={{ left: L0.x - GLOD / 2, top: L0.y - GLOD / 2 + 6, width: GLOD, height: GLOD, background: 'radial-gradient(circle, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.1) 42%, rgba(255,255,255,0) 72%)', opacity: 0, animation: `v4-bloom 900ms ${EASE} ${t0 - 120}ms both` }} />
            );
          })}
          {/* Tråden: bunnen bundet til skjermen, vokser oppover, tones bort øverst. De to forrige slagene står dempet
              over det nye til de er ute av bildet. Hele tråden svever nesten umerkelig. */}
          <div className="absolute overflow-hidden" style={{ left: fx, bottom: maal.h - fy - POLSTRING, width: B, height: H + POLSTRING, paddingBottom: POLSTRING, WebkitMaskImage: MASKE, maskImage: MASKE, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', opacity: inne ? 1 : 0, transition: `opacity 500ms ${EASE}` }} data-testid="v4-strom-flate">
            <div className="flex h-full flex-col justify-end v4-flyt" style={{ animation: 'v4-flyt 7000ms ease-in-out infinite' }}>
              {[n - 2, n - 1, n].filter((k) => k >= 0 && k < STROM.length).map((k) => {
                const m = STROM[k];
                const ny = k === n;
                const alder = n - k;
                return (
                  /* Dybdeskarphet: det nyeste slaget er skarpt; de eldre trekker seg litt bakover (mindre, svakere, ute av fokus) */
                  <div key={k} className="flex w-full flex-col" style={{ opacity: alder === 0 ? 1 : alder === 1 ? 0.5 : 0.24, transform: alder === 0 ? 'none' : `scale(${alder === 1 ? 0.965 : 0.93})`, transformOrigin: '50% 100%', filter: smal || alder === 0 ? 'none' : `blur(${alder === 1 ? 0.7 : 1.4}px)`, transition: `opacity 900ms ${EASE}, transform 900ms ${EASE}, filter 900ms ${EASE}` }} data-testid={`v4-strom-${m.id}`} aria-hidden={!ny}>
                    {(m.chat || []).map((c, j) => {
                      if (c.tapp) return null;   // trykket er ikke en boble — det lander i godkjenningen over
                      const t0 = ny ? T_FORSTE + j * BOBLE_TAKT : 0;
                      return (
                        <Rad key={j} ny={ny} t0={t0}>
                          <Boble c={c} m={m} ny={ny} t0={t0} fs={fs} bildePx={bildePx} avatarPx={avatarPx} adresse={adresse} dxy={dxy} visAvatar={j === 0 || m.chat[j - 1].fra !== c.fra} smal={smal} />
                        </Rad>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
