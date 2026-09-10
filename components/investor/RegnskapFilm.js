'use client';

/* ---------------------------------------------------------------------------
   RegnskapFilm — regnskapet som en ren investorpresentasjon.

   Henter FAKTISKE tall fra PowerOffice Go (via /api/admin/regnskap/*) og
   viser dem i deckets eget redaksjonelle språk: store display-tall, en
   rolig månedsgraf og en kompakt resultatoppstilling/balanse.

   Bevisst UTELATT (dette er en presentasjon, ikke driftsportalen):
   miljø (demo/prod), klientnavn, klientnøkler, tilkoblingsstatus,
   privilegier, «oppdater»-knapper og posteringstellere. Kun tallene.

   Motion arves fra .deck-side (deck-inn / deck-stolpe / data-strek), så
   alt kommer inn i takt med resten av slidene og respekterer
   prefers-reduced-motion (håndteres globalt i DeckKonsept).
--------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Scale, TrendingUp, Layers, RefreshCw, ChevronDown } from 'lucide-react';
import { T, display, EASE, DIM, SVAK, HAIR } from '@/components/forside/v4/tokens';

const LILLA_M = '#7A3FA8';
const GRONN = '#1F9D55';
const ROD = '#B3261E';
const LYS_HAIR = 'rgba(21,19,15,0.08)';

const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const nb = (n) => (Math.round(Number(n) || 0)).toLocaleString('nb-NO').replace(/\u00A0/g, ' ');
const kr = (n) => `${nb(n)}`;
const naaAar = new Date().getFullYear();

/* Tall som teller opp når slaget blir aktivt (expo-out). */
function useTween(target, aktiv, ms = 950) {
  const [v, setV] = useState(0);
  const fra = useRef(0);
  const raf = useRef(0);
  useEffect(() => {
    const mål = aktiv ? (Number(target) || 0) : 0;
    const start = performance.now();
    const startV = fra.current;
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { fra.current = mål; setV(mål); return undefined; }
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(2, -10 * t);
      const cur = startV + (mål - startV) * (t >= 1 ? 1 : e);
      fra.current = cur;
      setV(cur);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, aktiv, ms]);
  return v;
}

/* Stort display-tall med enhet. */
function Tall({ verdi, aktiv, farge = T.ink, storrelse = 'text-[20px] sm:text-[34px] lg:text-[42px]' }) {
  const v = useTween(verdi, aktiv);
  return (
    <p className={`whitespace-nowrap tabular-nums ${storrelse}`} style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1, color: farge }}>
      {kr(v)}<span className="ml-[0.16em] text-[0.42em]" style={{ letterSpacing: '-0.01em', opacity: 0.55 }}>kr</span>
    </p>
  );
}

/* Nøkkeltall: kompakt rad (label venstre, verdi høyre) på mobil; stort display-kort fra sm+. */
function Nokkel({ i, label, verdi, aktiv, farge = T.ink, ikon: Ikon, note }) {
  return (
    <div className="deck-inn flex items-center justify-between gap-3 border-t pt-3 sm:block sm:border-0 sm:pt-3.5" data-strek="1" style={{ '--i': i, '--strek': HAIR, borderColor: HAIR }}>
      <p className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: SVAK }}>
        {Ikon ? <Ikon className="h-3.5 w-3.5" style={{ color: LILLA_M }} strokeWidth={2} /> : null}{label}
        {note ? <span className="hidden sm:inline" /> : null}
      </p>
      <div className="sm:mt-2"><Tall verdi={verdi} aktiv={aktiv} farge={farge} /></div>
      {note ? <p className="hidden text-[11.5px] sm:mt-1.5 sm:block" style={{ color: 'rgba(21,19,15,0.4)' }}>{note}</p> : null}
    </div>
  );
}

/* Månedsgraf: inntekt (lilla) mot kostnad (charcoal), grunnlinje tegnes inn. */
function MndGraf({ maaneder, aktiv, ar }) {
  const maks = Math.max(1, ...maaneder.map((m) => Math.max(m.inntekt, m.kostnad)));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[12.5px] font-medium" style={{ color: DIM }}>Måned for måned · {ar}</p>
        <div className="flex items-center gap-4 text-[11.5px]" style={{ color: SVAK }}>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: `linear-gradient(180deg, ${T.lilla}, ${LILLA_M})` }} /> Inntekt</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: T.charcoal }} /> Kostnad</span>
        </div>
      </div>
      <div className="relative mt-4" style={{ height: 132 }}>
        <div className="deck-inn absolute inset-x-0 bottom-[18px]" data-strek="1" style={{ '--i': 3, '--strek': 'rgba(21,19,15,0.18)' }} />
        <div className="absolute inset-x-0 top-0 flex items-end justify-between gap-[3px]" style={{ height: 'calc(100% - 18px)' }}>
          {maaneder.map((m, idx) => {
            const hI = (m.inntekt / maks) * 100;
            const hK = (m.kostnad / maks) * 100;
            const aktivMnd = m.inntekt || m.kostnad;
            return (
              <div key={m.mnd} className="flex h-full flex-1 flex-col items-center justify-end">
                <div className="flex w-full items-end justify-center gap-[2px]" style={{ height: '100%' }}>
                  <span className="deck-stolpe w-1/2 max-w-[13px] rounded-t-[3px]" style={{ '--i': idx * 0.35, height: `${hI}%`, minHeight: m.inntekt ? 2 : 0, background: `linear-gradient(180deg, ${T.lilla}, ${LILLA_M})` }} />
                  <span className="deck-stolpe w-1/2 max-w-[13px] rounded-t-[3px]" style={{ '--i': idx * 0.35 + 0.15, height: `${hK}%`, minHeight: m.kostnad ? 2 : 0, background: T.charcoal }} />
                </div>
                <span className="mt-1.5 text-[9.5px]" style={{ color: aktivMnd ? DIM : 'rgba(21,19,15,0.28)' }}>{MND[m.mnd - 1]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* Rad i oppstilling/balanse — tegnes inn i sekvens. */
function Rad({ i, l, v, fet = false, under = false, farge, hoved = false }) {
  return (
    <div className={`deck-rad flex items-baseline justify-between gap-4 ${hoved ? 'border-t pt-2.5 mt-1' : 'py-[5px]'}`} style={{ '--i': i, borderColor: hoved ? 'rgba(21,19,15,0.2)' : undefined }}>
      <span className={`${under ? 'text-[12.5px]' : 'text-[13.5px]'} ${fet ? 'font-semibold' : ''}`} style={{ color: under ? SVAK : (fet ? T.ink : DIM), paddingLeft: under ? 12 : 0 }}>{l}</span>
      <span className={`whitespace-nowrap tabular-nums ${under ? 'text-[12.5px]' : 'text-[13.5px]'} ${fet ? 'font-semibold' : 'font-medium'}`} style={{ color: farge || (under ? DIM : T.ink) }}>{kr(v)}</span>
    </div>
  );
}

/* Konsern-fordeling: viser hvordan de sammenstilte tallene fordeler seg på hvert
   selskap. Rene faktiske tall per selskap + en sum-linje. Tydelig «sammenstilt». */
function KonsernFordeling({ rader, fane }) {
  const felt = fane === 'resultat'
    ? [{ k: 'inntekt', l: 'Inntekt' }, { k: 'resultat', l: 'Resultat' }]
    : [{ k: 'eiendeler', l: 'Eiendeler' }, { k: 'egenkapital', l: 'Egenkapital' }, { k: 'gjeld', l: 'Gjeld' }];
  const hovedFelt = felt[0].k;
  const maks = Math.max(1, ...rader.map((r) => Math.abs(r[hovedFelt] || 0)));
  const sum = (k) => rader.reduce((a, r) => a + (r[k] || 0), 0);
  const fargeFor = (k, v) => (k === 'resultat' ? (v >= 0 ? GRONN : ROD) : DIM);
  return (
    <div className="deck-inn mt-10 border-t pt-7" data-strek="1" style={{ '--i': 4, '--strek': HAIR, borderColor: HAIR }}>
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4" style={{ color: LILLA_M }} strokeWidth={2} />
        <p className="text-[13px] font-semibold" style={{ color: T.ink }}>Fordelt på selskapene</p>
        <span className="text-[11.5px]" style={{ color: SVAK }}>· sammenstilt, før elimineringer</span>
      </div>
      <div className="mt-4 space-y-4">
        {rader.map((r, idx) => (
          <div key={r.id} className="deck-rad" style={{ '--i': 0.4 + idx * 0.3 }}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-[13px] font-medium" style={{ color: T.ink }}>{r.navn}</span>
              <span className="flex items-center gap-4 tabular-nums text-[12.5px]">
                {felt.map((f) => (
                  <span key={f.k} style={{ color: fargeFor(f.k, r[f.k] || 0) }}>
                    <span className="mr-1 text-[10.5px]" style={{ color: SVAK }}>{f.l}</span>{kr(r[f.k] || 0)}
                  </span>
                ))}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full" style={{ background: LYS_HAIR }}>
              <span className="deck-stolpe block h-full origin-left rounded-full" style={{ '--i': 0.5 + idx * 0.3, width: `${(Math.abs(r[hovedFelt] || 0) / maks) * 100}%`, background: `linear-gradient(90deg, ${T.lilla}, ${LILLA_M})`, transformOrigin: 'left center' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t pt-3.5" style={{ borderColor: 'rgba(21,19,15,0.2)' }}>
        <span className="text-[13px] font-semibold" style={{ color: T.ink }}>Sum sammenstilt</span>
        <span className="flex items-center gap-4 tabular-nums text-[13px] font-semibold">
          {felt.map((f) => (
            <span key={f.k} style={{ color: f.k === 'resultat' ? (sum(f.k) >= 0 ? GRONN : ROD) : T.ink }}>
              <span className="mr-1 text-[10.5px] font-medium" style={{ color: SVAK }}>{f.l}</span>{kr(sum(f.k))}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

export default function RegnskapFilm({ adminKey = '', aktiv = false }) {
  const q = `key=${encodeURIComponent(adminKey)}`;
  const [selskaper, setSelskaper] = useState([]);
  const [valgtId, setValgtId] = useState('');
  const [ar, setAar] = useState(naaAar);
  const [fane, setFane] = useState('resultat');
  const [detaljert, setDetaljert] = useState(false);
  const [res, setRes] = useState(null);
  const [bal, setBal] = useState(null);
  const [konsernRader, setKonsernRader] = useState([]);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');

  const erKonsern = valgtId === '__konsern__';

  const hentSelskaper = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/regnskap/selskaper?${q}`, { cache: 'no-store' });
      const d = await r.json();
      const liste = (d.selskaper || []).map((s) => ({ id: s.id, navn: s.navn }));
      setSelskaper(liste);
      setValgtId((prev) => (prev && (prev === '__konsern__' || liste.some((s) => s.id === prev)) ? prev : (liste[0]?.id || '')));
      if (!liste.length) { setFeil('ingen'); setLaster(false); }
    } catch (e) { setFeil('feil'); setLaster(false); }
  }, [q]);

  const hentData = useCallback(async (id, aar) => {
    if (!id) return;
    setLaster(true); setFeil('');
    try {
      if (id === '__konsern__') {
        const d = await fetch(`/api/admin/regnskap/konsern?${q}&ar=${aar}&dato=${aar}-12-31`, { cache: 'no-store' }).then((r) => r.json());
        setRes(d && d.resultat && d.resultat.ok ? d.resultat : null);
        setBal(d && d.balanse && d.balanse.ok ? d.balanse : null);
        setKonsernRader(Array.isArray(d?.selskaper) ? d.selskaper : []);
        if (!(d && (d.resultat?.ok || d.balanse?.ok))) setFeil('feil');
      } else {
        const [rr, rb] = await Promise.all([
          fetch(`/api/admin/regnskap/resultat?${q}&selskap=${id}&ar=${aar}`, { cache: 'no-store' }).then((r) => r.json()),
          fetch(`/api/admin/regnskap/saldobalanse?${q}&selskap=${id}&dato=${aar}-12-31`, { cache: 'no-store' }).then((r) => r.json()),
        ]);
        setRes(rr && rr.ok ? rr : null);
        setBal(rb && rb.ok ? rb : null);
        setKonsernRader([]);
        if (!(rr && rr.ok) && !(rb && rb.ok)) setFeil('feil');
      }
    } catch (e) { setFeil('feil'); }
    setLaster(false);
  }, [q]);

  useEffect(() => { if (adminKey) hentSelskaper(); }, [adminKey, hentSelskaper]);
  useEffect(() => { if (valgtId) hentData(valgtId, ar); }, [valgtId, ar, hentData]);

  const valgt = selskaper.find((s) => s.id === valgtId);
  const g = bal?.grupper;
  const flereSelskaper = selskaper.length > 1;

  return (
    <div className="mt-7">
      {/* Kontroller: selskap · konsern · resultat|balanse · detaljer · år */}
      <div className="deck-inn flex flex-wrap items-center justify-between gap-3" style={{ '--i': 1 }}>
        <div className="flex flex-wrap items-center gap-2">
          {flereSelskaper && selskaper.map((s) => (
            <button key={s.id} onClick={() => setValgtId(s.id)} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors" style={valgtId === s.id ? { background: T.charcoal, color: T.offwhite } : { color: DIM, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>{s.navn}</button>
          ))}
          {flereSelskaper && (
            <button onClick={() => setValgtId('__konsern__')} className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors" style={erKonsern ? { background: `linear-gradient(180deg, ${T.lilla}, ${LILLA_M})`, color: '#fff' } : { color: LILLA_M, boxShadow: 'inset 0 0 0 1px rgba(122,63,168,0.35)' }}>
              <Layers className="h-3.5 w-3.5" strokeWidth={2.2} /> Konsern
            </button>
          )}
          {selskaper.length === 1 && valgt ? (
            <span className="text-[13px] font-medium" style={{ color: T.ink }}>{valgt.navn}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full p-1" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
            {[{ k: 'resultat', l: 'Resultat' }, { k: 'balanse', l: 'Balanse' }].map((f) => (
              <button key={f.k} onClick={() => setFane(f.k)} className="rounded-full px-3.5 py-1 text-[12.5px] font-medium transition-colors" style={fane === f.k ? { background: T.ink, color: T.offwhite } : { color: SVAK }}>{f.l}</button>
            ))}
          </div>
          <button onClick={() => setDetaljert((v) => !v)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors" style={detaljert ? { background: T.ink, color: T.offwhite } : { color: SVAK, boxShadow: `inset 0 0 0 1px ${HAIR}` }} aria-pressed={detaljert}>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${detaljert ? 'rotate-180' : ''}`} strokeWidth={2} /> Detaljer
          </button>
          <div className="flex items-center gap-2 text-[13px] font-medium tabular-nums" style={{ color: DIM }}>
            <button onClick={() => setAar((y) => y - 1)} className="grid h-6 w-6 place-items-center rounded-full transition-colors hover:text-black" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}`, color: SVAK }} aria-label="Forrige år">‹</button>
            <span style={{ color: T.ink }}>{ar}</span>
            <button onClick={() => setAar((y) => Math.min(naaAar, y + 1))} disabled={ar >= naaAar} className="grid h-6 w-6 place-items-center rounded-full transition-colors hover:text-black disabled:opacity-30" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}`, color: SVAK }} aria-label="Neste år">›</button>
          </div>
        </div>
      </div>
      {erKonsern ? (
        <div className="deck-inn mt-3 flex items-center gap-2 text-[11.5px]" style={{ '--i': 1.2, color: SVAK }}>
          <Layers className="h-3.5 w-3.5" style={{ color: LILLA_M }} strokeWidth={2} />
          Sammenstilt · sum av {konsernRader.length || selskaper.length} selskaper, før konserninterne elimineringer
        </div>
      ) : null}

      {laster && !res && !bal ? (
        <div className="mt-10 flex items-center gap-2.5 text-[13px]" style={{ color: SVAK }}>
          <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={2} style={{ color: LILLA_M }} /> Henter regnskapet …
        </div>
      ) : feil === 'ingen' ? (
        <div className="mt-10 text-[13.5px]" style={{ color: DIM }}>Regnskapet vises her når selskapet er koblet til.</div>
      ) : (feil === 'feil' && !res && !bal) ? (
        <div className="deck-inn mt-9 max-w-xl rounded-2xl p-6" style={{ '--i': 1.5, boxShadow: `inset 0 0 0 1px ${HAIR}`, background: 'rgba(21,19,15,0.015)' }}>
          <p className="text-[15px] font-semibold" style={{ color: T.ink }}>Kunne ikke hente tallene akkurat nå</p>
          <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: DIM }}>
            Regnskapstjenesten svarte ikke for {erKonsern ? 'konsernet' : (valgt?.navn || 'selskapet')} for {ar}. Tallene hentes direkte fra PowerOffice Go og er kanskje ikke ferdig ført for perioden ennå.
          </p>
          <button onClick={() => hentData(valgtId, ar)} className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors" style={{ background: T.ink, color: T.offwhite }}>
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} /> Prøv igjen
          </button>
        </div>
      ) : (
        <>
        <div className="mt-7 grid gap-x-12 gap-y-9 lg:grid-cols-[1.05fr_1fr]">
          {/* Venstre: nøkkeltall + graf (resultat) / nøkkeltall (balanse) */}
          <div>
            {fane === 'resultat' ? (
              <>
                <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-3">
                  <Nokkel i={1.5} label="Driftsinntekter" verdi={res?.sum?.inntekt || 0} aktiv={aktiv} ikon={ArrowUpRight} />
                  <Nokkel i={1.7} label="Driftskostnader" verdi={res?.sum?.kostnad || 0} aktiv={aktiv} ikon={ArrowDownRight} />
                  <Nokkel i={1.9} label="Driftsresultat" verdi={res?.sum?.resultat || 0} aktiv={aktiv} farge={(res?.sum?.resultat || 0) >= 0 ? GRONN : ROD} note={(res?.sum?.resultat || 0) >= 0 ? 'overskudd' : 'underskudd'} />
                </div>
                <div className="deck-inn mt-9" style={{ '--i': 3 }}>
                  <MndGraf maaneder={res?.maaneder || MND.map((_, i) => ({ mnd: i + 1, inntekt: 0, kostnad: 0 }))} aktiv={aktiv} ar={ar} />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-3">
                  <Nokkel i={1.5} label="Eiendeler" verdi={g?.eiendeler?.sum || 0} aktiv={aktiv} ikon={TrendingUp} />
                  <Nokkel i={1.7} label="Egenkapital" verdi={g?.egenkapital?.sum || 0} aktiv={aktiv} ikon={Scale} />
                  <Nokkel i={1.9} label="Gjeld" verdi={g?.gjeld?.sum || 0} aktiv={aktiv} ikon={ArrowDownRight} />
                </div>
                {/* Sammensetning: eiendeler = egenkapital + gjeld */}
                <div className="deck-inn mt-9" style={{ '--i': 3 }}>
                  <p className="text-[12.5px] font-medium" style={{ color: DIM }}>Slik er balansen satt sammen</p>
                  <div className="mt-4 space-y-3">
                    {(() => {
                      const e = g?.eiendeler?.sum || 0; const ek = g?.egenkapital?.sum || 0; const gj = g?.gjeld?.sum || 0;
                      const nevner = Math.max(1, e, ek + gj);
                      return (
                        <>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[11.5px]" style={{ color: SVAK }}><span>Eiendeler</span><span className="tabular-nums">{kr(e)} kr</span></div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: LYS_HAIR }}><span className="deck-stolpe block h-full origin-left rounded-full" style={{ '--i': 0.4, width: `${(e / nevner) * 100}%`, background: LILLA_M, transformOrigin: 'left center' }} /></div>
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[11.5px]" style={{ color: SVAK }}><span>Egenkapital + gjeld</span><span className="tabular-nums">{kr(ek + gj)} kr</span></div>
                            <div className="flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: LYS_HAIR }}>
                              <span className="deck-stolpe block h-full origin-left" style={{ '--i': 0.6, width: `${(ek / nevner) * 100}%`, background: T.charcoal, transformOrigin: 'left center' }} />
                              <span className="deck-stolpe block h-full origin-left" style={{ '--i': 0.8, width: `${(gj / nevner) * 100}%`, background: 'rgba(21,19,15,0.35)', transformOrigin: 'left center' }} />
                            </div>
                            <div className="mt-1.5 flex items-center gap-4 text-[11px]" style={{ color: SVAK }}>
                              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: T.charcoal }} /> Egenkapital</span>
                              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: 'rgba(21,19,15,0.35)' }} /> Gjeld</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Høyre: oppstilling / balanse-detaljer */}
          <div className={`deck-inn ${detaljert ? 'max-h-[440px] overflow-y-auto pr-1.5' : ''}`} style={{ '--i': 2 }}>
            {fane === 'resultat' ? (
              <div>
                <p className="text-[12.5px] font-medium" style={{ color: DIM }}>Resultatoppstilling</p>
                <div className="mt-3">
                  <Rad i={0} l="Driftsinntekter" v={res?.sum?.inntekt || 0} fet />
                  {(detaljert ? (res?.inntektKontoer || []) : (res?.inntektKontoer || []).slice(0, 4)).map((k, idx) => <Rad key={k.kontonr} i={0.4 + idx * 0.3} l={k.navn} v={k.belop} under />)}
                  <Rad i={2} l="Driftskostnader" v={res?.sum?.kostnad || 0} fet />
                  {(detaljert ? (res?.kostnadKontoer || []) : (res?.kostnadKontoer || []).slice(0, 4)).map((k, idx) => <Rad key={k.kontonr} i={2.4 + idx * 0.3} l={k.navn} v={k.belop} under />)}
                  <Rad i={4} l={`Driftsresultat ${ar}`} v={res?.sum?.resultat || 0} fet hoved farge={(res?.sum?.resultat || 0) >= 0 ? GRONN : ROD} />
                </div>
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2">
                <div>
                  <p className="text-[12.5px] font-medium" style={{ color: DIM }}>Eiendeler</p>
                  <div className="mt-3">
                    {(detaljert ? (g?.eiendeler?.kontoer || []) : (g?.eiendeler?.kontoer || []).slice(0, 5)).map((k, idx) => <Rad key={k.kontonr} i={0.3 + idx * 0.3} l={k.navn} v={k.saldo} under />)}
                    <Rad i={2} l="Sum eiendeler" v={g?.eiendeler?.sum || 0} fet hoved />
                  </div>
                </div>
                <div>
                  <p className="text-[12.5px] font-medium" style={{ color: DIM }}>Egenkapital og gjeld</p>
                  <div className="mt-3">
                    {(detaljert ? (g?.egenkapital?.kontoer || []) : (g?.egenkapital?.kontoer || []).slice(0, 2)).map((k, idx) => <Rad key={k.kontonr} i={0.3 + idx * 0.3} l={k.navn} v={k.saldo} under />)}
                    {(detaljert ? (g?.gjeld?.kontoer || []) : (g?.gjeld?.kontoer || []).slice(0, 4)).map((k, idx) => <Rad key={k.kontonr} i={1 + idx * 0.3} l={k.navn} v={k.saldo} under />)}
                    <Rad i={2.6} l="Sum egenkapital og gjeld" v={(g?.egenkapital?.sum || 0) + (g?.gjeld?.sum || 0)} fet hoved />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {erKonsern && konsernRader.length ? <KonsernFordeling rader={konsernRader} fane={fane} /> : null}
        </>
      )}

      {/* Kilde: diskret, ingen tilkoblingsdetaljer */}
      <div className="deck-inn mt-9 flex items-center gap-2 text-[11.5px]" style={{ '--i': 5, color: SVAK }}>
        <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: LILLA_M }} /><span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: LILLA_M }} /></span>
        {erKonsern ? 'Sammenstilt regnskap · hentet direkte fra PowerOffice Go' : 'Ført regnskap · hentet direkte fra PowerOffice Go'}
      </div>
    </div>
  );
}
