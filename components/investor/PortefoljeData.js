'use client';

/* ---------------------------------------------------------------------------
   PortefoljeData — «Datadrevet»-sliden.

   Poenget: DigiHome driftes på sanntidsdata. Inntekter, kostnader, honorar,
   utleiegrad og leieforhold ligger oppdatert i driftsportalen — beslutninger
   tas på faktiske tall, ikke et regneark.

   Leieforhold er en stor, klikkbar «flis» som åpner hele porteføljen (den
   ekte modulen med filtre) i en fullskjermsmodal. Øvrige fliser viser live
   nøkkeltall hentet fra samme kilde som driftsteamet ser.

   Live tall vises kun i presentasjons-/adminmodus (adminKey). Delte eksterne
   lenker får en trygg plassholder.
--------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, X, ArrowUpRight, Table2, Wallet, Percent, ShieldCheck } from 'lucide-react';
import { T, display, EASE, DIM, SVAK, HAIR } from '@/components/forside/v4/tokens';
import Leieforhold from '@/components/admin/Leieforhold';

const LILLA_M = '#7A3FA8';
const nb = (n) => (Math.round(Number(n) || 0)).toLocaleString('nb-NO').replace(/\u00A0/g, ' ');

function useTween(target, aktiv, ms = 950) {
  const [v, setV] = useState(0);
  const fra = useRef(0);
  const raf = useRef(0);
  useEffect(() => {
    const mål = aktiv ? (Number(target) || 0) : 0;
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { fra.current = mål; setV(mål); return undefined; }
    const start = performance.now(); const startV = fra.current;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(2, -10 * t);
      const cur = startV + (mål - startV) * (t >= 1 ? 1 : e);
      fra.current = cur; setV(cur);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, aktiv, ms]);
  return v;
}

const LivePunkt = ({ farge = LILLA_M }) => (
  <span className="relative flex h-1.5 w-1.5">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: farge }} />
    <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: farge }} />
  </span>
);

function StatFlis({ i, ikon: Ikon, label, verdi, enhet, aktiv, format = nb }) {
  const v = useTween(verdi, aktiv);
  return (
    <div className="deck-inn rounded-2xl bg-white p-5" data-strek="1" style={{ '--i': i, '--strek': HAIR, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: SVAK }}>
          {Ikon ? <Ikon className="h-3.5 w-3.5" style={{ color: LILLA_M }} strokeWidth={2} /> : null}{label}
        </span>
        <LivePunkt />
      </div>
      <p className="mt-3 whitespace-nowrap tabular-nums text-[26px] sm:text-[30px]" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1, color: T.ink }}>
        {format(v)}{enhet ? <span className="ml-[0.16em] text-[0.44em]" style={{ letterSpacing: '-0.01em', opacity: 0.55 }}>{enhet}</span> : null}
      </p>
    </div>
  );
}

export default function PortefoljeData({ adminKey = '', aktiv = false, besokt = false, enheterIDag = 0 }) {
  const q = `key=${encodeURIComponent(adminKey)}`;
  const [t, setT] = useState(null);
  const [feil, setFeil] = useState(false);
  const [modal, setModal] = useState(false);
  const [lfMontert, setLfMontert] = useState(false);

  const hent = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/leieforhold?${q}`, { cache: 'no-store' });
      const d = await r.json();
      if (d && d.totals) setT(d.totals); else setFeil(true);
    } catch (e) { setFeil(true); }
  }, [q]);

  useEffect(() => { if (adminKey && besokt) hent(); }, [adminKey, besokt, hent]);

  // Åpne modal → monter den tunge modulen (lazy) + lås deck-navigasjon (tastatur).
  const aapne = () => { setLfMontert(true); setModal(true); };
  useEffect(() => {
    if (!modal) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { setModal(false); e.stopPropagation(); return; }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'].includes(e.key)) e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true); // capture: kjører før deckets bobler-lytter
    return () => window.removeEventListener('keydown', onKey, true);
  }, [modal]);

  if (!adminKey) {
    return (
      <div className="mt-8 max-w-[54ch]">
        <p className="text-[15px] leading-[1.6]" style={{ color: DIM }}>Hele det operasjonelle datalaget – leieforhold, inntekter, kostnader og honorar i sanntid – vises når decket kjøres i presentasjonsmodus.</p>
      </div>
    );
  }

  const domener = ['Inntekter', 'Kostnader', 'Leieforhold', 'Honorar', 'Utleiegrad', 'Kontrakter', 'Avvik'];

  return (
    <div className="mt-8">
      {/* Databredde: alt dette ligger live i portalen */}
      <div className="deck-inn flex flex-wrap items-center gap-x-2.5 gap-y-2" style={{ '--i': 1 }}>
        <span className="text-[11.5px] font-medium uppercase tracking-[0.1em]" style={{ color: SVAK }}>Live i portalen</span>
        {domener.map((d) => (
          <span key={d} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ color: DIM, boxShadow: `inset 0 0 0 1px ${HAIR}`, background: 'rgba(255,255,255,0.5)' }}>
            <LivePunkt />{d}
          </span>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        {/* Feature: Leieforhold — klikkbar, åpner fullskjerm */}
        <button
          onClick={aapne}
          className="deck-inn group relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 text-left lg:col-span-5"
          style={{ '--i': 2, background: T.charcoal, color: T.offwhite, boxShadow: '0 30px 60px -34px rgba(21,19,15,0.5)', minHeight: 220 }}
        >
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: 'rgba(244,241,234,0.7)' }}>
              <Table2 className="h-4 w-4" style={{ color: T.lilla }} strokeWidth={2} /> Leieforhold
            </span>
            <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors group-hover:bg-white/15" style={{ boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.18)', color: T.offwhite }}>
              Åpne porteføljen <Maximize2 className="h-3 w-3" strokeWidth={2.2} />
            </span>
          </div>
          <div>
            <p className="tabular-nums text-[54px] leading-none sm:text-[64px]" style={{ ...display, letterSpacing: '-0.04em', color: T.offwhite }}>{t ? nb(t.count) : '—'}</p>
            <p className="mt-2 text-[13.5px]" style={{ color: 'rgba(244,241,234,0.66)' }}>leieforhold under forvaltning — leie, honorar og kontrakter i sanntid</p>
            {t ? (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px]" style={{ color: 'rgba(244,241,234,0.82)' }}>
                <span><b className="tabular-nums" style={{ color: T.offwhite }}>{nb(t.leased)}</b> utleid</span>
                <span><b className="tabular-nums" style={{ color: T.offwhite }}>{nb(t.signing + t.future)}</b> på vei inn</span>
                <span><b className="tabular-nums" style={{ color: T.offwhite }}>{nb(t.vacant)}</b> ledige</span>
              </div>
            ) : null}
          </div>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${T.lilla}, transparent 80%)` }} />
        </button>

        {/* Live nøkkeltall */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          <StatFlis i={2.4} ikon={Wallet} label="Leiegrunnlag i dag" verdi={t?.actual_rent || 0} enhet="kr/mnd" aktiv={aktiv} />
          <StatFlis i={2.6} ikon={ArrowUpRight} label="DigiHome-honorar i dag" verdi={t?.fee || 0} enhet="kr/mnd" aktiv={aktiv} />
          <StatFlis i={2.8} ikon={Percent} label="Utleiegrad" verdi={t?.occupancy_pct || 0} enhet="%" aktiv={aktiv} />
          <StatFlis i={3.0} ikon={ShieldCheck} label="Depositum forvaltet" verdi={t?.deposit || 0} enhet="kr" aktiv={aktiv} />
        </div>
      </div>

      <div className="deck-inn mt-6 flex items-center gap-2 text-[11.5px]" style={{ '--i': 4, color: SVAK }}>
        <LivePunkt /> Samme data som driftsteamet ser · oppdateres løpende {feil ? '· (tallene lastes i presentasjonsmodus)' : ''}
      </div>

      {/* Fullskjermsmodal: hele porteføljen med filtre (1:1 med driftsportalen) */}
      {modal ? (
        <div
          className="fixed inset-0 z-[120] flex flex-col"
          data-deck-overlay
          onWheel={(e) => e.stopPropagation()}
          style={{ background: 'rgba(21,19,15,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(false); }}
        >
          <div className="mx-auto flex h-full w-full max-w-[1680px] flex-col p-3 sm:p-5">
            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white" style={{ boxShadow: '0 40px 90px -40px rgba(0,0,0,0.6)' }}>
              <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5" style={{ borderColor: HAIR }}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: T.charcoal, color: T.offwhite }}><Table2 className="h-4 w-4" strokeWidth={2} /></span>
                  <div>
                    <p className="text-[15px] font-semibold" style={{ color: T.ink }}>Leieforhold</p>
                    <p className="flex items-center gap-1.5 text-[11.5px]" style={{ color: SVAK }}><LivePunkt /> live fra driftsportalen · samme filtre og nøkkeltall</p>
                  </div>
                </div>
                <button onClick={() => setModal(false)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-black/[0.05]" style={{ color: DIM }}>
                  Lukk <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {lfMontert ? <Leieforhold apiKey={adminKey} readOnly /> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
