'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, tall } from '../motion';

/* ---------------------------------------------------------------------------
   filmdeler — felles byggeklosser for produktfilmene (Annonse, Kontrakt, …).

   Alle filmene deler samme ramme (H × bredde), samme papirfarge, samme peker,
   samme knapper, chips, SMS-bobler og fremdriftsstreker — så kapitlene leses som
   én sammenhengende fortelling. Emma-kortet er overleveringsobjektet: Annonse
   slutter med det, Kontrakt åpner med det.
--------------------------------------------------------------------------- */

export const PAPIR = '#FBFAF8';
export const HVIT = '#FFFFFF';
export const STEIN = '#F3F1EC';
export const HAIR = 'rgba(21,19,15,0.08)';
export const DIM = 'rgba(21,19,15,0.55)';
export const OFF = '#F4F1EA';
export const H = 660;          // rammens høyde (desktop)
export const P = 48;           // rammens indre marg
/* Easing for det som FLYTTER seg (kamera-følelse: myk inn, myk landing). EASE (expo-out) for det som kommer inn. */
export const MORF = 'cubic-bezier(0.65, 0, 0.18, 1)';
/* Moderne overflater: indre lys-hårlinje på bildefliser, frostet glass på etiketter over bilder, blur-inn på det som kommer inn */
export const LYSKANT = 'inset 0 0 0 1px rgba(255,255,255,0.32)';
/* Ingen backdrop-filter (blur bak bevegelige flater tegnes om per frame — dyrt på mobil); flaten er tett nok. */
export const GLASS = { background: 'rgba(251,250,248,0.94)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.55), 0 6px 20px -10px rgba(21,19,15,0.35)' };
export const BLUR_INN = 'blur(6px)';

export const TONE = {
  noytral: { background: 'rgba(21,19,15,0.06)', color: 'rgba(21,19,15,0.72)' },
  lilla: { background: 'rgba(212,150,255,0.22)', color: T.ink },
  gronn: { background: 'rgba(31,157,85,0.14)', color: '#166B3C' },
};

/* Boligen og leietakeren — samme fakta i alle kapitler */
export const BOLIG = { adresse: 'Nygårdsgaten 5', enhet: 'Leilighet 2', by: 'Bergen', leie: 12500, depositumMnd: 3, innflytting: '1. november', innflyttingKort: '1. nov', varighet: '3 år', prom: '54 m²' };
export const EMMA = { navn: 'Emma Sørensen', fornavn: 'Emma', bilde: '/v4/annonse/leietaker-emma.webp', dok: ['BankID', 'Inntekt', 'Referanse'] };
export const KARI = { navn: 'Kari Nilsen', fornavn: 'Kari', bilde: '/v4/kari.webp' };

/* Keyframes for pekerens ring og nålenes ping — legges én gang i hver film */
export function FilmStil() {
  return <style>{'@keyframes v4-ring { from { transform: scale(0.45); opacity: 0.6 } to { transform: scale(1.7); opacity: 0 } } @keyframes v4-ping { from { transform: scale(0.6); opacity: 0.55 } to { transform: scale(2.6); opacity: 0 } } @keyframes v4-caret { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }'}</style>;
}

/* ── Små byggeklosser ── */

export function Hake({ size = 14 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* FINN-logoen (ekte): mørkeblått blad + lyseblått felt med FINN, hvit kant. viewBox 184×64. */
export function Finn({ h = 16, className = '' }) {
  const w = Math.round((h * 184) / 64);
  return (
    <svg role="img" aria-label="FINN" width={w} height={h} viewBox="0 0 184 64" className={`inline-block shrink-0 align-middle ${className}`}>
      <path fill="#06bffc" d="M179.8 58V6c0-1-.8-1.9-1.9-1.9H66c-1 0-1.9.8-1.9 1.9v53.8H178c1 0 1.8-.8 1.8-1.8" />
      <path fill="#0063fc" d="M22.5 4.2H6C5 4.2 4.2 5 4.2 6v52c0 1 .8 1.9 1.9 1.9H60V41.5C59.9 20.9 43.2 4.2 22.5 4.2" />
      <path fill="#fff" d="M178 0H66c-3.3 0-6 2.7-6 6v17.4C53.2 9.6 38.9 0 22.5 0H6C2.7 0 0 2.7 0 6v52c0 3.3 2.7 6 6 6h172c3.3 0 6-2.7 6-6V6c0-3.3-2.7-6-6-6m1.8 58c0 1-.8 1.9-1.9 1.9H64.1V6c0-1 .8-1.9 1.9-1.9h112c1 0 1.9.8 1.9 1.9v52zM4.2 58V6C4.2 5 5 4.2 6 4.2h16.5c20.6 0 37.4 16.8 37.4 37.4v18.3H6c-1-.1-1.8-.9-1.8-1.9" />
      <path fill="#fff" d="M110.1 21.1h-4.2c-.7 0-1.2.5-1.2 1.2v19.3c0 .7.5 1.2 1.2 1.2h4.2c.7 0 1.2-.5 1.2-1.2V22.3c0-.6-.6-1.2-1.2-1.2m-12 0H83c-.7 0-1.2.5-1.2 1.2v19.3c0 .7.5 1.2 1.2 1.2h4.2c.7 0 1.2-.5 1.2-1.2v-4h7.7c.7 0 1.2-.5 1.2-1.2v-3.2c0-.7-.5-1.2-1.2-1.2h-7.7v-4.9h9.7c.7 0 1.2-.5 1.2-1.2v-3.7c0-.5-.6-1.1-1.2-1.1m62.8 0h-4.2c-.7 0-1.2.5-1.2 1.2v9.5l-6.6-10c-.3-.4-.8-.7-1.3-.7h-3.2c-.7 0-1.2.5-1.2 1.2v19.3c0 .7.5 1.2 1.2 1.2h4.2c.7 0 1.2-.5 1.2-1.2v-9.4l6.5 9.8c.3.4.8.7 1.3.7h3.4c.7 0 1.2-.5 1.2-1.2V22.3c-.1-.6-.6-1.2-1.3-1.2m-25.4 0h-4.2c-.7 0-1.2.5-1.2 1.2v9.5l-6.6-10c-.3-.4-.8-.7-1.3-.7H119c-.7 0-1.2.5-1.2 1.2v19.3c0 .7.5 1.2 1.2 1.2h4.2c.7 0 1.2-.5 1.2-1.2v-9.4l6.5 9.8c.3.4.8.7 1.3.7h3.4c.7 0 1.2-.5 1.2-1.2V22.3c-.1-.6-.6-1.2-1.3-1.2" />
    </svg>
  );
}

/* BankID — ekte logo (svg i /public/v4/logo). Mono, arver ikke farge: tegnes i blekk. */
export function BankIdMerke({ h = 14, className = '' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img loading="lazy" decoding="async" src="/v4/logo/bankid.svg" alt="BankID" className={`inline-block shrink-0 align-middle ${className}`} style={{ height: h, width: 'auto' }} draggable={false} />
  );
}

export function Portrett({ src, alt, size = 40, className = '' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img loading="lazy" decoding="async" src={src} alt={alt} width={size} height={size} className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size, boxShadow: '0 0 0 1px rgba(21,19,15,0.10), inset 0 0 0 1px rgba(255,255,255,0.4)' }} draggable={false} />
  );
}

export function Inn({ vis, delay = 0, y = 10, children, className = '', ov, style }) {
  return (
    <div className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : `translateY(${y}px)`, filter: vis ? 'blur(0px)' : BLUR_INN, transition: ov ? 'none' : `opacity 500ms ${EASE} ${vis ? delay : 0}ms, transform 500ms ${EASE} ${vis ? delay : 0}ms, filter 500ms ${EASE} ${vis ? delay : 0}ms`, pointerEvents: vis ? 'auto' : 'none', ...style }} aria-hidden={!vis}>
      {children}
    </div>
  );
}

export function Vokse({ vis, children, className = '', ov, delay = 150 }) {
  return (
    <div className={`grid ${className}`} style={{ gridTemplateRows: vis ? '1fr' : '0fr', transition: ov ? 'none' : `grid-template-rows 600ms ${EASE}` }} aria-hidden={!vis}>
      <div className="min-h-0 overflow-hidden">
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', filter: vis ? 'blur(0px)' : BLUR_INN, transition: ov ? 'none' : `opacity 500ms ${EASE} ${vis ? delay : 0}ms, transform 500ms ${EASE} ${vis ? delay : 0}ms, filter 500ms ${EASE} ${vis ? delay : 0}ms` }}>{children}</div>
      </div>
    </div>
  );
}

export function Chip({ tekst, tone = 'noytral', liten = false, className = '', testid }) {
  const hake = tone === 'gronn';
  return (
    <span key={tekst} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 font-medium animate-in fade-in-0 duration-300 ${liten ? 'text-[11.5px]' : 'text-[12px]'} ${className}`} style={{ ...TONE[tone], height: liten ? 24 : 28 }} data-testid={testid}>
      {hake ? <Hake size={12} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone === 'lilla' ? T.lilla : 'rgba(21,19,15,0.35)' }} />}
      {tekst}
    </span>
  );
}

export function Lapp({ vis, children, className = '', delay = 0, testid, ov }) {
  return (
    <span className={`absolute z-[4] inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-medium ${className}`} style={{ ...GLASS, color: T.ink, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(4px)', filter: vis ? 'blur(0px)' : 'blur(4px)', transition: ov ? 'none' : `opacity 400ms ${EASE} ${vis ? delay : 0}ms, transform 400ms ${EASE} ${vis ? delay : 0}ms, filter 400ms ${EASE} ${vis ? delay : 0}ms` }} aria-hidden={!vis} data-testid={testid}>
      {children}
    </span>
  );
}

export function Dok({ liste }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {liste.map((d) => (
        <span key={d} className="inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10.5px] font-medium animate-in fade-in-0 duration-300" style={{ background: 'rgba(31,157,85,0.12)', color: '#166B3C' }}><Hake size={9} />{d}</span>
      ))}
    </span>
  );
}

/* Knapp som trykkes av seg selv. `hover` = pekeren hviler på den. `knappRef` lar pekeren finne den. */
export function AutoKnapp({ presser, trykket, hover = false, children, etter, testid, stor = false, knappRef, morkt = false }) {
  const bg = trykket ? 'rgba(212,150,255,0.55)' : presser || hover ? T.lillaHover : T.lilla;
  return (
    <span
      ref={knappRef}
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-medium ${stor ? 'h-12 rounded-[12px] px-6 text-[15px]' : 'h-10 rounded-[10px] px-4 text-[14px]'}`}
      style={{ background: bg, color: T.ink, transform: presser ? 'scale(0.95)' : hover ? 'scale(1.02)' : 'none', transition: `transform 220ms ${EASE}, background-color 220ms ${EASE}, box-shadow 400ms ${EASE}`, boxShadow: stor && !presser && !trykket ? (hover ? `0 22px 48px -20px rgba(160,90,220,${morkt ? 0.9 : 0.7})` : `0 18px 40px -22px rgba(160,90,220,${morkt ? 0.75 : 0.55})`) : 'none' }}
      data-testid={testid}
      data-trykket={trykket ? '1' : '0'}
    >
      {trykket ? <><Hake />{etter}</> : children}
    </span>
  );
}

/* Pekeren — glir inn fra nede til høyre, hviler på knappen, trykker (krymper mot spissen + tynn ring), tones bort. */
export function Peker({ pos, vis, presser, hopp, ring, holder = false, children = null }) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[9]"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`, opacity: vis ? 1 : 0, transition: hopp ? 'none' : vis ? `transform 950ms cubic-bezier(0.5, 0, 0.12, 1), opacity 350ms ${EASE}` : `opacity 260ms ${EASE}`, willChange: 'transform' }}
      aria-hidden="true"
      data-testid="v4-peker"
      data-vis={vis ? '1' : '0'}
    >
      {ring > 0 && (
        <span key={ring} className="absolute -left-[13px] -top-[13px] block h-[26px] w-[26px] rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${T.ink}`, animation: 'v4-ring 560ms cubic-bezier(0.2, 0.6, 0.2, 1) forwards' }} />
      )}
      {children}
      <svg width="22" height="26" viewBox="0 0 22 26" className="relative z-[1]" style={{ display: 'block', transform: presser ? 'scale(0.86)' : holder ? 'scale(0.92)' : 'scale(1)', transformOrigin: '3px 2px', transition: `transform 160ms ${EASE}`, filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.35))' }}>
        <path d="M3 2.5v18.6l4.6-4.3 3.3 7.4 3.6-1.6-3.2-7.2 6.4-.6z" fill={T.ink} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* Peker-logikk: `maal` = { fase: knappnavn }, `presser` = Set av trykkfaser. Måler målknappen relativt til rammen,
   kommer inn fra en forskjøvet posisjon og glir til målet. */
export function usePeker(fase, rammeRef, knapper, maal, presser, inn = null) {
  const [st, setSt] = useState({ x: 0, y: 0, vis: false, hopp: true, ring: 0 });
  const forrige = useRef(null);
  useEffect(() => {
    const navn = maal[fase];
    if (!navn) {
      forrige.current = null;
      setSt((s) => (s.vis ? { ...s, vis: false, hopp: false } : s));
      return undefined;
    }
    const nytt = forrige.current !== navn;
    forrige.current = navn;
    let raf = 0;
    const t = window.setTimeout(() => {
      const ramme = rammeRef.current; const el = knapper.current[navn];
      if (!ramme || !el) return;
      const r = ramme.getBoundingClientRect(); const b = el.getBoundingClientRect();
      const x = Math.round(b.left - r.left + b.width * 0.6); const y = Math.round(b.top - r.top + b.height * 0.62);
      if (nytt) {
        const fra = inn?.(navn) || { x: 230, y: 150 };   // der pekeren kommer inn fra (relativt til målet)
        setSt((s) => ({ ...s, x: x + fra.x, y: y + fra.y, vis: false, hopp: true }));
        raf = window.requestAnimationFrame(() => { raf = window.requestAnimationFrame(() => setSt((s) => ({ ...s, x, y, vis: true, hopp: false }))); });
      } else {
        setSt((s) => ({ ...s, x, y, vis: true, hopp: false }));
      }
    }, nytt ? 320 : 0);
    return () => { window.clearTimeout(t); window.cancelAnimationFrame(raf); };
  }, [fase, rammeRef, knapper, maal, inn]);
  useEffect(() => { if (presser.has(fase)) setSt((s) => ({ ...s, ring: s.ring + 1 })); }, [fase, presser]);
  return { ...st, presser: presser.has(fase) };
}

/* Sekvensielt tekstbytte: det gamle går ut (240 ms), så kommer det nye inn — aldri to tekster samtidig. */
export function Tekstbytte({ id, ov, children, className = '' }) {
  const [vist, setVist] = useState(id);
  const [ut, setUt] = useState(false);
  useEffect(() => {
    if (id === vist) return undefined;
    if (ov) { setVist(id); return undefined; }
    setUt(true);
    const t = window.setTimeout(() => { setVist(id); setUt(false); }, 240);
    return () => window.clearTimeout(t);
  }, [id, vist, ov]);
  return (
    <div className={className} style={{ opacity: ut ? 0 : 1, transform: ut ? 'translateY(-6px)' : 'none', filter: ut ? 'blur(5px)' : 'blur(0px)', transition: ov ? 'none' : ut ? `opacity 240ms ${EASE}, transform 240ms ${EASE}, filter 240ms ${EASE}` : `opacity 560ms ${EASE} 40ms, transform 560ms ${EASE} 40ms, filter 560ms ${EASE} 40ms` }} data-testid="v4-tekstbytte" data-vist={vist}>
      {children(vist)}
    </div>
  );
}

/* ── Fremdrift — stille streker ── */
export function Fyll({ aktiv, gjort, dur, morkt = false }) {
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!aktiv) { setFull(false); return undefined; }
    let id2 = 0;
    const id = window.requestAnimationFrame(() => { id2 = window.requestAnimationFrame(() => setFull(true)); });
    return () => { window.cancelAnimationFrame(id); window.cancelAnimationFrame(id2); };
  }, [aktiv]);
  const bredde = gjort ? '100%' : aktiv && full ? '100%' : '0%';
  return <span className="absolute inset-y-0 left-0 rounded-full" style={{ background: aktiv ? T.lilla : morkt ? 'rgba(244,241,234,0.7)' : 'rgba(21,19,15,0.35)', width: bredde, transition: aktiv && full ? `width ${dur}ms linear` : 'none' }} />;
}

/* Én strek per akt. `varighet(i)` = aktens lengde i ms, `navn(i)` = aria-label. `morkt` = på mørk flate. */
export function Akter({ antall, aktiv, varighet, onVelg, navn, morkt = false }) {
  return (
    <ol className="flex w-full items-center gap-1.5 sm:w-auto sm:gap-2" aria-label="Akter" data-testid="v4-akter">
      {/* Smalt: strekene deler bredden, så raden aldri går utenfor kanten uansett antall akter. Fra sm: 28 px hver. */}
      {Array.from({ length: antall }, (_, i) => (
        <li key={i} className="min-w-0 flex-1 sm:w-7 sm:flex-none">
          <button type="button" onClick={() => onVelg(i)} aria-label={navn(i)} aria-current={i === aktiv ? 'step' : undefined} className="block w-full py-3 focus-visible:outline-none" data-testid={`v4-akt-${i}`}>
            <span className="relative block h-[2px] w-full overflow-hidden rounded-full" style={{ background: morkt ? 'rgba(244,241,234,0.22)' : 'rgba(21,19,15,0.12)', transition: `background-color 900ms ${EASE}` }}>
              <Fyll aktiv={i === aktiv} gjort={i < aktiv} dur={varighet(i)} morkt={morkt} />
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/* Broen til neste kapittel — stille linje som fylles mens sluttbildet står, så glir tab-markøren videre. */
export function NesteBro({ aktiv, dur, navn, ov }) {
  if (!navn) return null;
  return (
    <div data-testid="v4-neste">
      <p className="text-[12px]" style={{ color: 'rgba(21,19,15,0.42)' }}>Neste kapittel</p>
      <p className="mt-1 inline-flex items-center gap-2 text-[17px] font-medium" style={{ color: T.ink }}>
        {navn}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </p>
      <span className="relative mt-3 block h-[2px] w-[132px] overflow-hidden rounded-full" style={{ background: 'rgba(21,19,15,0.10)' }}>
        <Fyll aktiv={aktiv && !ov} gjort={false} dur={dur} />
      </span>
    </div>
  );
}

/* SMS-boble — slik meldingen ser ut hos mottakeren. */
export function Sms({ vis, til, tid, tekst, ov, delay = 500, testid, className = 'mt-3' }) {
  return (
    <Vokse vis={vis} ov={ov} delay={delay}>
      <div className={`${className} rounded-[16px] px-3.5 py-3`} style={{ background: 'rgba(21,19,15,0.05)', boxShadow: `inset 0 0 0 1px ${HAIR}` }} data-testid={testid}>
        <div className="flex items-center justify-between text-[11.5px]" style={{ color: DIM }}>
          <span className="inline-flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2.5h8a1 1 0 011 1v4a1 1 0 01-1 1H5L2.5 10.5V8.5H2a1 1 0 01-1-1v-4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
            SMS til {til}
          </span>
          <span>{tid}</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-[1.45] text-[#15130F]/82">{tekst}</p>
      </div>
    </Vokse>
  );
}

/* Emma-kortet — overleveringsobjektet. Annonse slutter med det, Kontrakt åpner med det. */
export function ValgtKort({ kompakt = false, status = 'Valgt leietaker', fakta, className = '' }) {
  const rader = fakta || [['Innflytting', BOLIG.innflyttingKort], ['Leie', `${tall(BOLIG.leie)} kr`], ['Ønsker', BOLIG.varighet]];
  return (
    <div className={`mx-auto w-full rounded-[20px] text-center ${kompakt ? 'max-w-[340px] p-5' : 'max-w-[380px] p-7'} ${className}`} style={{ background: HVIT, boxShadow: `0 0 0 1px ${HAIR}, 0 40px 90px -50px rgba(21,19,15,0.4)` }} data-testid="v4-valgt-kort">
      <Portrett src={EMMA.bilde} alt={EMMA.navn} size={kompakt ? 64 : 76} className="mx-auto" />
      <p className={`${kompakt ? 'mt-3.5 text-[19px]' : 'mt-4 text-[22px]'} font-medium tracking-[-0.012em]`}>{EMMA.navn}</p>
      <p className="mt-1 text-[13px]" style={{ color: DIM }}>{status} · {BOLIG.adresse}, {BOLIG.enhet.toLowerCase()}</p>
      <div className="mt-3 flex justify-center"><Dok liste={EMMA.dok} /></div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4 text-left" style={{ borderColor: HAIR }}>
        {rader.map(([k, v]) => (
          <div key={k}><p className="text-[11.5px]" style={{ color: DIM }}>{k}</p><p className="mt-0.5 text-[14px] font-medium tracking-[-0.005em]">{v}</p></div>
        ))}
      </div>
    </div>
  );
}

/* Bilde i fast forhold som faller inn */
export function Bilde({ src, alt, pos, vis, delay = 0, ov, className = '', ratio = '3 / 2' }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: ratio, background: 'rgba(21,19,15,0.05)', boxShadow: `0 0 0 1px ${HAIR}, ${LYSKANT}`, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(-14px)', transition: ov ? 'none' : `opacity 500ms ${EASE} ${vis ? delay : 0}ms, transform 700ms ${EASE} ${vis ? delay : 0}ms` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" decoding="async" src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: pos || '50% 50%' }} draggable={false} />
    </div>
  );
}

/* Rammen som måler sin egen bredde (for absolutt layout) */
export function useBredde() {
  const ref = useRef(null);
  const [W, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const maal = () => setW(el.offsetWidth);
    maal();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(maal) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  return [ref, W];
}

/* Desktop/kompakt-valg og filmens klokke: går fasene automatisk, looper eller gir fra seg til `onFerdig`. */
/* Andel av filmen som er unnagjort når fasen `fase` er ferdig (0–1) — til kapittel-fremdrift i tab-raden */
export function fremdriftFor(AUTO, SISTE, fase) {
  let sum = 0; let til = 0;
  for (let f = 0; f <= SISTE; f += 1) { sum += AUTO[f] || 0; if (f <= fase) til = sum; }
  return sum ? til / sum : 0;
}

export function useFilm({ synlig, spiller = synlig, AUTO, SISTE, START, HVILE, onFerdig, onFremdrift, holdt = false }) {
  const [fase, setFase] = useState(START);
  const [startet, setStartet] = useState(false);
  const [ov, setOv] = useState(false);
  const [morkt, setMorkt] = useState(false);
  const [bred, setBred] = useState(null);
  const ferdigRef = useRef(onFerdig);
  useEffect(() => { ferdigRef.current = onFerdig; }, [onFerdig]);
  const fremRef = useRef(onFremdrift);
  useEffect(() => { fremRef.current = onFremdrift; }, [onFremdrift]);
  useEffect(() => { fremRef.current?.({ andel: fremdriftFor(AUTO, SISTE, fase), ms: fase === START ? 0 : AUTO[fase] || 0 }); }, [fase, AUTO, SISTE, START]);

  useEffect(() => {
    const r = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (r) { setOv(true); setFase(HVILE); }
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return undefined;
    const sett = () => setBred(mq.matches);
    sett();
    mq.addEventListener?.('change', sett);
    return () => mq.removeEventListener?.('change', sett);
  }, [HVILE]);

  useEffect(() => { if (spiller && !startet) setStartet(true); }, [spiller, startet]);

  useEffect(() => {
    if (!startet || morkt || holdt || !spiller) return undefined;   // ute av bildet → filmen venter der den er
    const ms = AUTO[fase];
    if (ms == null) return undefined;
    const t = window.setTimeout(() => {
      if (fase >= SISTE) {
        if (ov) { setFase(HVILE); return; }
        if (ferdigRef.current?.()) return;           // forelderen tar over — neste kapittel
        setMorkt(true);
        window.setTimeout(() => { setFase(START); window.setTimeout(() => setMorkt(false), 700); }, 500);
      } else {
        setFase((f) => f + 1);
      }
    }, ms);
    return () => window.clearTimeout(t);
  }, [fase, startet, ov, morkt, holdt, spiller, AUTO, SISTE, START, HVILE]);

  const hopp = (f) => { setMorkt(false); setStartet(true); setFase(f); };
  return { fase, ov, morkt, bred, hopp };
}

/* Full bleed-stage: filmen er laget for W × 660. Her fyller den hele bredden og (nesten) hele skjermhøyden — rammen får
   høyden clamp(660, 100svh − nav, 960), og filmen rendres i bredden W/k og skaleres opp med k = høyde/660 (transform,
   origo øverst til venstre). Alt inne i filmen (layout, tekst, bilder) følger — 1920-kildene holder til k ≈ 1,45. */
function FullStage({ bred, inn, blend, children }) {
  const ref = useRef(null);
  const [m, setM] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const maal = () => setM({ w: el.clientWidth, h: el.clientHeight });
    maal();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(maal) : null;
    ro?.observe(el);
    window.addEventListener('resize', maal);
    return () => { ro?.disconnect(); window.removeEventListener('resize', maal); };
  }, []);
  const k = m.h ? m.h / H : 1;
  const w = m.w ? Math.round(m.w / k) : null;
  return (
    <div ref={ref} className={`relative w-full overflow-hidden ${bred === null ? 'hidden lg:block' : ''}`} style={{ height: 'clamp(660px, calc(100svh - 64px), 960px)', background: PAPIR, ...inn }} data-testid="v4-fullstage" data-k={k.toFixed(3)}>
      <div style={{ width: w ? `${w}px` : '100%', height: H, transform: `scale(${k})`, transformOrigin: '0 0', ...blend }}>{children}</div>
    </div>
  );
}

/* Ytre ramme — samme skygge/radius i alle kapitler. `full`: rammeløs, full bredde, skjermhøy (FullStage). */
export function Ramme({ synlig, tema, ov, morkt, bred, desktop, kompakt, testid, fase, ekstra, full = false, naken = false }) {
  const inn = { opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(28px)', transition: ov ? 'none' : `opacity 800ms ${EASE}, transform 800ms ${EASE}` };
  const skygge = tema === 'lys'
    ? '0 0 0 1px rgba(21,19,15,0.08), 0 60px 120px -40px rgba(21,19,15,0.35)'
    : '0 0 0 1px rgba(244,241,234,0.12), 0 70px 120px -50px rgba(0,0,0,0.75)';
  const blend = { opacity: morkt ? 0 : 1, transition: ov ? 'none' : `opacity 450ms ${EASE}` };
  // naken: ingen ramme/skygge — innholdet står rett på siden (brukes i decket, «animasjonen skjer på bakgrunnen»)
  const flate = naken ? { boxShadow: 'none', background: 'transparent' } : { boxShadow: skygge, background: PAPIR };
  const hjorne = naken ? '' : 'rounded-[18px]';
  if (full) {
    return (
      <div className="relative w-full" data-testid={testid} data-fase={fase} data-full="1" {...ekstra}>
        <FilmStil />
        {bred !== false && <FullStage bred={bred} inn={inn} blend={blend}>{desktop}</FullStage>}
        {bred !== true && (
          <div className={`w-full overflow-hidden ${bred === null ? 'lg:hidden' : ''}`} style={{ background: PAPIR, ...inn }}>
            <div style={blend}>{kompakt}</div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="relative mx-auto w-full max-w-[min(1400px,86vw)]" data-testid={testid} data-fase={fase} {...ekstra}>
      <FilmStil />
      {bred !== false && (
        <div className={`overflow-hidden ${hjorne} ${bred === null ? 'hidden lg:block' : ''}`} style={{ ...flate, ...inn }}>
          <div style={blend}>{desktop}</div>
        </div>
      )}
      {bred !== true && (
        <div className={`mx-auto w-full max-w-[440px] overflow-hidden ${hjorne} ${bred === null ? 'lg:hidden' : ''}`} style={{ ...flate, ...inn }}>
          <div style={blend}>{kompakt}</div>
        </div>
      )}
    </div>
  );
}
