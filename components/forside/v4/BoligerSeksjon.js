'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { EASE, T, display, Lenke, useRedusert, useSmal, useSynlig } from './motion';
import { listingSlug } from '@/lib/listings';

/* ---------------------------------------------------------------------------
   BoligerSeksjon — «Boliger på autopilot.»

   Et galleri som glir rolig over skjermen, kant til kant. Ikke en CSS-marquee:
   én rAF-motor med hastighet som eases — driver sakte av seg selv, følger
   rullingen din (scroll → kortene glir), lar seg dra med fart og etterslep,
   og stopper mykt når musen hviler over. Piler for tastatur og for dem som vil.

   Rytme som et galleri: kortene har ulik bredde (stående · liggende · nesten
   kvadrat) i én felles høyde. Fotografiet står alene; opplysningene står
   under det, på lerretet — ikke som piller oppe i bildet.

   Hvert kort er en bolig UNDER DRIFT, ikke en annonse: under stedet står én
   stille statuslinje — grønn prikk = utleid og husleien går av seg selv, lilla
   prikk = ledig og noe skjer (visning, annonse). Det er det «autopilot» betyr.
   Ledige boliger lenker til sin egen side under /ledige-boliger.

   Dybde: fotografiet inne i kortet glir en anelse mot bevegelsen (parallakse,
   ±8 % av bredden) mens galleriet driver — rommet får dybde uten effekter.
   Kortene kommer inn ett og ett første gang seksjonen vises.

   Datakilde er den samme som den gamle forsiden: /api/public/properties
   (boliger eiere har gjort synlige i portalen — personvern-trygge felt, ingen
   adresser). Færre enn fire med egne bilder → utvalget under.
   Redusert bevegelse → vanlig horisontal rulling med snap.
--------------------------------------------------------------------------- */

const MODELL = { langtid: 'Langtidsutleie', korttid: 'Korttidsutleie', hybrid: 'Hybridutleie' };

/* Utvalget — vises til eierne har gjort nok boliger synlige i portalen. */
const UTVALG = [
  { id: 'u1', bilde: '/interior-openplan.webp', sted: 'Nordnes, Bergen', meta: '3 sov · 68 m²', modell: 'Hybridutleie', leie: '22 500', status: 'Ledig · visning lørdag 12:00' },
  { id: 'u2', bilde: '/interior-kitchen2.webp', sted: 'Sandviken, Bergen', meta: '2 sov · 52 m²', modell: 'Korttidsutleie', leie: '18 000', status: 'Ledig · annonsen er ute' },
  { id: 'u3', bilde: '/showcase-apartment.webp', sted: 'Sentrum, Bergen', meta: '3 sov · 95 m²', modell: 'Hybridutleie', leie: '26 500', status: 'Ledig fra 1. desember' },
  { id: 'u4', bilde: '/interior-bedroom2.webp', sted: 'Møhlenpris, Bergen', meta: '1 sov · 38 m²', modell: 'Langtidsutleie', leie: '14 500', utleid: true, status: 'Utleid · husleie inn 1. nov' },
  { id: 'u5', bilde: '/interior-dining.webp', sted: 'Sentrum, Bergen', meta: '2 sov · 61 m²', modell: 'Langtidsutleie', leie: '19 000', utleid: true, status: 'Utleid · ingen åpne saker' },
  { id: 'u6', bilde: '/interior-kitchen-bar.webp', sted: 'Nordnes, Bergen', meta: '2 sov · 58 m²', modell: 'Hybridutleie', leie: '21 000', status: 'Ledig · 6 påmeldt til visning' },
  { id: 'u7', bilde: '/v3/bygaard.webp', sted: 'Kalfaret, Bergen', meta: '4 sov · 112 m²', modell: 'Langtidsutleie', leie: '29 500', utleid: true, status: 'Utleid · kontrakt fornyet' },
  { id: 'u8', bilde: '/v3/hjem-spisestue.webp', sted: 'Sandviken, Bergen', meta: '3 sov · 74 m²', modell: 'Langtidsutleie', leie: '23 000', status: 'Ledig fra 1. januar' },
];

/* Galleriets rytme: bredde/høyde per posisjon. Stående · liggende · nesten kvadrat … */
const FORM = [4 / 5, 3 / 2, 5 / 4, 4 / 5, 16 / 10, 5 / 4, 4 / 5, 3 / 2];
const GAP = 20;
const DRIFT = 26;        // px/s — rolig, som et galleri som puster
const RULL = 0.28;       // hvor mye kortene glir per rullet px

function tilKort(p) {
  const deler = [];
  if (Number(p.bedrooms) > 0) deler.push(`${p.bedrooms} sov`);
  if (Number(p.sqm) > 0) deler.push(`${p.sqm} m²`);
  return {
    id: p.id,
    bilde: (p.images && p.images[0]) || null,
    sted: [p.area, p.city].filter(Boolean).join(', ') || 'Norge',
    meta: deler.join(' · '),
    modell: (p.model && MODELL[p.model]) || 'Utleie',
    leie: p.monthlyRentBand ? String(p.monthlyRentBand).replace(/\s*kr\/mnd\s*$/i, '') : null,
    utleid: p.status === 'rented',
    /* Bare det vi vet: utleid, eller ledig. Ledige boliger har sin egen side. */
    status: p.status === 'rented' ? 'Utleid · på autopilot' : 'Ledig · se boligen',
    href: p.status === 'rented' ? null : `/ledige-boliger/${listingSlug(p)}`,
  };
}

function Kort({ k, form, H, prioritet, vist = true, delay = 0 }) {
  const w = Math.round(H * form);
  const Ytre = k.href ? Link : 'div';
  const ytreProps = k.href ? { href: k.href, 'aria-label': `${k.sted} — se boligen` } : {};
  return (
    <article
      className="group shrink-0 select-none"
      style={{ width: w, opacity: vist ? 1 : 0, transform: vist ? 'none' : 'translateY(22px)', transition: `opacity 900ms ${EASE} ${delay}ms, transform 1000ms ${EASE} ${delay}ms` }}
      data-testid="bolig-kort"
    >
      <Ytre {...ytreProps} className={`block focus-visible:outline-none ${k.href ? 'cursor-pointer' : ''}`} draggable={false}>
        <div className="relative overflow-hidden rounded-[18px] sm:rounded-[20px]" style={{ height: H, background: T.flate, boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.06)' }}>
          {/* Parallakse-laget: litt bredere enn kortet, glir mot bevegelsen (settes fra motoren) */}
          <div className="absolute inset-y-0 -left-[8%] -right-[8%] will-change-transform" data-par>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={k.bilde}
              alt={`${k.sted} — ${[k.meta, k.modell].filter(Boolean).join(' · ')}`}
              draggable={false}
              loading="lazy"
              fetchPriority={prioritet ? 'auto' : 'low'}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.03]"
              style={{ transition: `transform 1400ms ${EASE}`, filter: 'saturate(0.94)' }}
            />
          </div>
          {/* Ledig: en stille invitasjon nederst i bildet når du peker */}
          {k.href ? (
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-4 pt-16 text-[13px] font-medium opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: 'linear-gradient(180deg, rgba(21,19,15,0) 0%, rgba(21,19,15,0.45) 100%)', color: T.offwhite }}>
              <span>Se boligen</span><ArrowRight className="h-4 w-4" strokeWidth={1.7} />
            </span>
          ) : null}
        </div>
        <div className="mt-3.5 flex items-start justify-between gap-4 px-0.5 sm:mt-4">
          <div className="min-w-0">
            <p className="truncate text-[18px] sm:text-[20px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.1, color: T.ink }}>{k.sted}</p>
            <p className="mt-1 truncate text-[13px] sm:text-[13.5px]" style={{ color: 'rgba(21,19,15,0.55)' }}>{[k.meta, k.modell].filter(Boolean).join(' · ')}</p>
            {/* Statuslinjen — det «autopilot» betyr for akkurat denne boligen */}
            <p className="mt-1.5 flex items-center gap-2 text-[13px] sm:text-[13.5px]" style={{ color: k.utleid ? T.gronn : 'rgba(21,19,15,0.72)' }} data-testid="bolig-status">
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: k.utleid ? T.gronn : T.lilla, boxShadow: k.utleid ? 'none' : '0 0 0 3px rgba(212,150,255,0.22)' }} />
              <span className="truncate">{k.status || (k.utleid ? 'Utleid' : 'Ledig')}</span>
            </p>
          </div>
          {k.leie ? (
            <div className="shrink-0 text-right">
              <p className="text-[17px] tabular-nums sm:text-[19px]" style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.1, color: T.ink }}>{k.leie}</p>
              <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(21,19,15,0.45)' }}>kr/mnd</p>
            </div>
          ) : null}
        </div>
      </Ytre>
    </article>
  );
}

function Pil({ retning, onClick }) {
  const Ikon = retning < 0 ? ArrowLeft : ArrowRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={retning < 0 ? 'Forrige boliger' : 'Neste boliger'}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-[background-color,transform] duration-200 hover:bg-[#15130F]/[0.06] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30"
      style={{ boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.14)', color: T.ink }}
      data-testid={retning < 0 ? 'v4-boliger-forrige' : 'v4-boliger-neste'}
    >
      <Ikon className="h-4 w-4" strokeWidth={1.7} />
    </button>
  );
}

export default function BoligerSeksjon() {
  const [kort, setKort] = useState(UTVALG);
  const [live, setLive] = useState(false);
  const redusert = useRedusert();
  const smal = useSmal();
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.12);
  const [vist, setVist] = useState(false);
  useEffect(() => { if (synlig) setVist(true); }, [synlig]);
  const synligRef = useRef(false);
  useEffect(() => { synligRef.current = synlig; }, [synlig]);

  const sporRef = useRef(null);
  const [drar, setDrar] = useState(false);
  /* All bevegelse lever her — aldri i React-state per frame. */
  const st = useRef({ x: 0, v: 0, glid: 0, fart: 0, hviler: false, drag: null, halv: 0, rullY: null });

  useEffect(() => {
    let aktiv = true;
    (async () => {
      try {
        const r = await fetch('/api/public/properties?limit=12');
        const j = await r.json();
        if (!aktiv || !j?.ok) return;
        /* Samme bilde flere ganger (testdata, kopierte annonser) skal ikke bli åtte like kort. */
        const sett = new Set();
        const l = (j.properties || []).map(tilKort).filter((k) => { if (!k.bilde || sett.has(k.bilde)) return false; sett.add(k.bilde); return true; });
        if (l.length >= 4) { setKort(l.slice(0, 8)); setLive(true); }
      } catch (e) { /* behold utvalget */ }
    })();
    return () => { aktiv = false; };
  }, []);

  const H = smal ? 216 : 420;   // mobil: 3:2-kort på 324 px — ett helt kort i bildet, neste stikker inn
  /* Minst åtte kort i sporet så løkka aldri viser tomrom. */
  const spor = useMemo(() => { let l = kort; while (l.length < 8) l = l.concat(kort); return l; }, [kort]);

  /* ── Motoren ── kjører bare mens seksjonen er i bildet (ingen rAF-løkke i bakgrunnen mens du leser resten av
        siden), og skriver bare til DOM når posisjonen faktisk har endret seg. */
  useEffect(() => {
    if (redusert || !synlig) return undefined;
    const el = sporRef.current;
    if (!el) return undefined;
    const s = st.current;
    /* Parallakse: kortenes posisjon i sporet måles én gang (og ved resize) — aldri layout-lesing i løkka */
    let kortliste = [];
    const mal = () => {
      s.halv = el.scrollWidth / 2;
      kortliste = Array.from(el.querySelectorAll('[data-testid="bolig-kort"]')).map((k) => ({ par: k.querySelector('[data-par]'), left: k.offsetLeft, w: k.offsetWidth, sist: NaN }));
    };
    mal();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(mal) : null;
    ro?.observe(el);
    let raf = 0;
    let forrige = performance.now();
    let sistX = NaN;
    s.rullY = null;
    const loop = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - forrige) / 1000));
      forrige = now;
      const vil = (s.hviler || s.drag || !synligRef.current) ? 0 : DRIFT;
      s.v += (vil - s.v) * Math.min(1, dt * 3);             // hastigheten eases — aldri hard stopp
      if (!s.drag) {
        s.x -= s.v * dt;
        if (Math.abs(s.fart) > 2) { s.x += s.fart * dt; s.fart *= Math.exp(-dt * 3.4); } else s.fart = 0;   // etterslep etter dra
        if (Math.abs(s.glid) > 0.5) { const d = s.glid * Math.min(1, dt * 5.5); s.x += d; s.glid -= d; } else s.glid = 0;   // piler
        const y = window.scrollY;
        if (s.rullY != null && synligRef.current) s.x -= (y - s.rullY) * RULL;   // rull → kortene glir
        s.rullY = y;
      }
      if (s.halv > 0) { while (s.x <= -s.halv) s.x += s.halv; while (s.x > 0) s.x -= s.halv; }
      const nx = Math.round(s.x * 100) / 100;
      if (nx !== sistX) {
        sistX = nx; el.style.transform = `translate3d(${nx}px,0,0)`;
        /* Bildet glir mot bevegelsen: kort til venstre for midten viser mer av høyre side, og omvendt (±8 % av bredden) */
        const vw = window.innerWidth || 1;
        for (let i = 0; i < kortliste.length; i += 1) {
          const k = kortliste[i];
          if (!k.par) continue;
          const midt = nx + k.left + k.w / 2;
          if (midt < -k.w || midt > vw + k.w) continue;   // utenfor bildet — ikke rør
          const rel = Math.max(-0.6, Math.min(0.6, (midt - vw / 2) / vw));
          const tx = Math.round(-rel * k.w * 0.13 * 10) / 10;
          if (tx !== k.sist) { k.sist = tx; k.par.style.transform = `translate3d(${tx}px,0,0)`; }
        }
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => { window.cancelAnimationFrame(raf); ro?.disconnect(); };
  }, [redusert, synlig, spor, H]);

  const ned = useCallback((e) => {
    if (redusert || (e.button != null && e.button !== 0)) return;
    const s = st.current;
    s.drag = { x: e.clientX, t: performance.now(), v: 0, start: e.clientX };
    s.fart = 0; s.glid = 0;
    dro.current = false;
    setDrar(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  }, [redusert]);
  const flytt = useCallback((e) => {
    const s = st.current;
    if (!s.drag) return;
    const now = performance.now();
    const dx = e.clientX - s.drag.x;
    const dt = Math.max(0.004, (now - s.drag.t) / 1000);
    s.drag.v = s.drag.v * 0.55 + (dx / dt) * 0.45;
    if (Math.abs(e.clientX - s.drag.start) > 6) dro.current = true;
    s.x += dx;
    s.drag.x = e.clientX; s.drag.t = now;
  }, []);
  const dro = useRef(false);   // ble det dratt? Da skal ikke slippet åpne lenken
  const opp = useCallback(() => {
    const s = st.current;
    if (!s.drag) return;
    s.fart = Math.max(-2200, Math.min(2200, s.drag.v));
    s.drag = null;
    setDrar(false);
  }, []);
  const klikkVakt = useCallback((e) => { if (dro.current) { e.preventDefault(); e.stopPropagation(); } }, []);
  const bla = useCallback((retning) => {
    const s = st.current;
    const forsteKort = sporRef.current?.querySelector('[data-testid="bolig-kort"]');
    const steg = (forsteKort ? forsteKort.getBoundingClientRect().width : H) + GAP;
    s.glid += -retning * steg;
  }, [H]);

  const inn = (delay = 0) => ({ opacity: vist ? 1 : 0, transform: vist ? 'none' : 'translateY(18px)', transition: `opacity 800ms ${EASE} ${delay}ms, transform 800ms ${EASE} ${delay}ms` });

  return (
    <section ref={ref} className="relative overflow-hidden" style={{ background: T.canvas }} data-testid="v4-boliger">
      <div className="mx-auto w-full max-w-[1360px] px-5 pt-16 sm:px-8 sm:pt-24 lg:w-[calc(100%-128px)] lg:px-0 lg:pt-32">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div style={inn(0)}>
            <h2 className="max-w-[14ch] text-[40px] sm:text-[52px] lg:text-[64px]" style={{ ...display, color: T.ink }} data-testid="v4-boliger-h2">
              Boliger på autopilot<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-[1.45] sm:text-[19px]" style={{ color: 'rgba(21,19,15,0.65)' }}>
              {live
                ? 'Et utvalg av boligene som driftes gjennom DigiHome i dag. Leietakere, husleie og saker — på autopilot.'
                : 'Slik ser boligene ut som driftes gjennom DigiHome. Leietakere, husleie og saker — på autopilot.'}
            </p>
          </div>
          <div className="flex items-center justify-between gap-6 lg:justify-end" style={inn(80)}>
            <Lenke href="/ledige-boliger" data-testid="v4-boliger-lenke">Se ledige boliger</Lenke>
            {!redusert ? (
              <div className="flex items-center gap-2">
                <Pil retning={-1} onClick={() => bla(-1)} />
                <Pil retning={1} onClick={() => bla(1)} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Sporet — kant til kant. Dra, rull eller la det gli. */}
      <div className="relative mt-9 pb-16 sm:mt-14 sm:pb-24 lg:pb-32" data-testid="v4-boliger-spor">
        {redusert ? (
          <div className="flex gap-5 overflow-x-auto px-5 pb-2 sm:px-8" style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
            {kort.map((k, i) => <div key={k.id} style={{ scrollSnapAlign: 'start' }}><Kort k={k} form={FORM[i % FORM.length]} H={H} prioritet={i < 2} /></div>)}
          </div>
        ) : (
          <>
            <div
              className={`relative ${drar ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ touchAction: 'pan-y' }}
              onPointerDown={ned}
              onPointerMove={flytt}
              onPointerUp={opp}
              onPointerCancel={opp}
              onPointerEnter={() => { st.current.hviler = true; }}
              onPointerLeave={() => { st.current.hviler = false; opp(); }}
              onClickCapture={klikkVakt}
            >
              <div ref={sporRef} className="flex w-max items-start will-change-transform" style={{ gap: GAP }}>
                {[0, 1].map((rep) => (
                  <div key={rep} className="flex shrink-0 items-start" style={{ gap: GAP, paddingRight: GAP }} aria-hidden={rep === 1}>
                    {spor.map((k, i) => <Kort key={`${rep}-${k.id}-${i}`} k={k} form={FORM[i % FORM.length]} H={H} prioritet={rep === 0} vist={vist} delay={rep === 0 ? 140 + Math.min(i, 5) * 90 : 0} />)}
                  </div>
                ))}
              </div>
            </div>
            {/* Kantene løses opp i lerretet */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-20 lg:w-28" style={{ background: 'linear-gradient(90deg, #F3F1EC 0%, rgba(243,241,236,0) 100%)' }} />
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-20 lg:w-28" style={{ background: 'linear-gradient(270deg, #F3F1EC 0%, rgba(243,241,236,0) 100%)' }} />
          </>
        )}
      </div>
    </section>
  );
}
