'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   BudsjettModell — «Investormodell»: beslutningsverktøy, ikke bare budsjett.
   · Venstre rail (kollapsbar, sticky) følger investorens mentale kjede:
     PORTEFØLJE & VEKST → UNIT ECONOMICS → ORGANISASJON → FASTE KOSTNADER.
   · Nøkkeltall er diagnostiske: resultat siste måned (trenden!), break-even
     med EKSTRAPOLERING utover perioden (motoren kjøres videre til 36 mnd
     med porteføljefakta holdt flat), og kapitalbehov FREM TIL break-even.
   · Scenarioer (Konservativ/Basis/Ambisiøs) svarer på investorens egentlige
     spørsmål: «hva om salget går halvparten så fort som dere tror?»
   · Unit economics med bidragsmargin, levetid fra churn, LTV og LTV/CAC.
   · Grafen viser inntekts- og kostnadslinje som krysser i break-even.
   · Samme rene motor (lib/budsjett-modell.js) klient/server.
   ───────────────────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowRight, Trash2, RefreshCw, Loader2, Check, Plus, X, RotateCcw, ChevronDown,
  SlidersHorizontal, TrendingUp, Scale, Users, Building2, Bookmark, HelpCircle, FileSpreadsheet, FileText, ArrowLeftRight,
  CalendarDays, ChevronLeft, ChevronRight, Presentation, Megaphone,
} from 'lucide-react';
import Omvisning from '@/components/admin/Omvisning';
import KonsernModell from '@/components/admin/KonsernModell';
import ModellTopplinje, { PILL, PILL_AKTIV, PILL_LILLA, KNAPP_PRIMAER } from '@/components/admin/ModellTopplinje';
import PartnerKort from '@/components/admin/PartnerKort';
import { beregnInvestorModell, rensModellDrivere, STANDARD_DRIVERE, skalerVekst } from '@/lib/budsjett-modell';

const heading = { fontFamily: 'var(--font-heading, inherit)' };

const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
// Tallformat: nb-NO gir NBSP (U+00A0) som tusenskiller — den rendres bredt i
// overskriftsfonten. Vi bytter til SMALT no-break space (U+202F): «454 286 kr».
const smal = (s) => String(s).replace(/[\u00A0\u0020]/g, ' ');
const kr = (n) => `${smal(Math.round(Number(n) || 0).toLocaleString('nb-NO'))} kr`;
const kr0 = (n) => smal(Math.round(Number(n) || 0).toLocaleString('nb-NO'));
const ymDeler = (ym) => { const [y, m] = String(ym || '').split('-').map(Number); return { y, m }; };
const ymPluss = (ym, i) => {
  const { y, m } = ymDeler(ym);
  const t = y * 12 + (m - 1) + i;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};
const mndKort = (ym) => { const { y, m } = ymDeler(ym); return m >= 1 && m <= 12 ? `${MND_KORT[m - 1]}. ${String(y).slice(2)}` : ym; };
const mndLang = (ym) => { const { y, m } = ymDeler(ym); return m >= 1 && m <= 12 ? `${MND_KORT[m - 1]}. ${y}` : ym; };
const stor = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* ── MndVelger — moderne månedvelger-popover (erstatter native input[type=month]).
      Knapp m/ kalenderikon og lesbar måned → popover m/ årsnavigasjon og
      12-måneders grid. Måneder utenfor min/maks er deaktivert. Popoveren
      rendres position:fixed (unngår klipping i scrollende tabeller) og
      flipper over knappen når det er trangt mot bunnen av vinduet. ── */
function MndVelger({ value, min, max, onChange, testid }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, flip: false });
  const [visAar, setVisAar] = useState(() => ymDeler(value || min).y || new Date().getFullYear());
  const knappRef = useRef(null);
  const popRef = useRef(null);
  const { y: minA, m: minM } = ymDeler(min || '1900-01');
  const { y: maxA, m: maxM } = ymDeler(max || '2999-12');
  const nr = (a, m) => a * 12 + (m - 1);
  const valgt = String(value || '');

  const aapne = () => {
    const r = knappRef.current?.getBoundingClientRect();
    if (r) {
      const flip = r.bottom + 268 > window.innerHeight;
      setPos({ x: Math.max(8, Math.min(r.left, window.innerWidth - 260)), y: flip ? r.top - 6 : r.bottom + 6, flip });
    }
    setVisAar(ymDeler(valgt).y || minA || new Date().getFullYear());
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const klikk = (e) => {
      if (popRef.current?.contains(e.target) || knappRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', klikk);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', klikk); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <>
      <button type="button" ref={knappRef} onClick={() => (open ? setOpen(false) : aapne())} data-testid={testid}
        className="flex h-8 items-center gap-1.5 rounded-[8px] bg-[#f5f4f1] pl-2.5 pr-2 text-[12.5px] font-semibold text-[#57534e] ring-1 ring-transparent transition-all hover:bg-[#efedea] focus:outline-none focus:ring-[#6d28d9]/40">
        <CalendarDays className="h-3.5 w-3.5 text-[#a6a19a]" />
        {valgt ? stor(mndLang(valgt)) : 'Velg måned'}
        <ChevronDown className={`h-3 w-3 text-[#c2beb8] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div ref={popRef} className="fixed z-[90] w-[252px] rounded-[16px] bg-white p-3 shadow-[0_18px_50px_rgba(20,16,40,0.20),inset_0_0_0_1px_rgba(0,0,0,0.05)]"
          style={{ left: pos.x, top: pos.y, transform: pos.flip ? 'translateY(-100%)' : 'none' }} data-testid={testid ? `${testid}-popover` : undefined}>
          <div className="flex items-center justify-between">
            <button type="button" disabled={visAar <= minA} onClick={() => setVisAar((a) => a - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[#8f8a82] transition-colors hover:bg-[#f5f4f1] hover:text-[#1c1917] disabled:opacity-25">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[13.5px] font-bold text-[#1c1917]" style={heading}>{visAar}</span>
            <button type="button" disabled={visAar >= maxA} onClick={() => setVisAar((a) => a + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[#8f8a82] transition-colors hover:bg-[#f5f4f1] hover:text-[#1c1917] disabled:opacity-25">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {MND_KORT.map((navn, i) => {
              const ym = `${visAar}-${String(i + 1).padStart(2, '0')}`;
              const deaktivert = nr(visAar, i + 1) < nr(minA, minM) || nr(visAar, i + 1) > nr(maxA, maxM);
              const erValgt = ym === valgt;
              return (
                <button key={ym} type="button" disabled={deaktivert}
                  onClick={() => { onChange(ym); setOpen(false); }}
                  className={`h-9 rounded-[10px] text-[12px] font-bold capitalize transition-all ${erValgt
                    ? 'text-white shadow-[0_3px_10px_rgba(59,35,115,0.3)]'
                    : deaktivert ? 'cursor-not-allowed text-[#dcd9d3]' : 'text-[#57534e] hover:bg-[#f0ebfa] hover:text-[#6d28d9] active:scale-95'}`}
                  style={erValgt ? { background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)' } : {}}>
                  {navn}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
const kma = (s) => String(s).replace('.', ',');
// Viser tall med norsk tusenskille mens man skriver (kun heltallsfelt i kr)
const visTall = (v) => {
  const s = String(v ?? '').trim();
  if (s === '') return '';
  const n = Number(s.replace(/[\s\u00a0]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n).toLocaleString('nb-NO') : s;
};
// Holder porteføljefakta flat utover perioden — til ekstrapolering av break-even
// (bortfall er PUNKTVISE hendelser og utvides med 0 — ingen nye kjente bortfall)
const utvidFakta = (fk, N2) => ({
  eksisterende: Array.from({ length: N2 }, (_, i) => fk.eksisterende?.[Math.min(i, (fk.eksisterende?.length || 1) - 1)] || 0),
  enheter: Array.from({ length: N2 }, (_, i) => fk.enheter?.[Math.min(i, (fk.enheter?.length || 1) - 1)] || 0),
  bortfall: Array.from({ length: N2 }, (_, i) => fk.bortfall?.[i] || 0),
});

/* ── Kollapsbar seksjon i driver-railen ── */
const Seksjon = ({ tittel, sammendrag, ikon: Ikon, open, onToggle, children }) => (
  <div className={`-mx-2 rounded-[12px] px-2 transition-colors ${open ? 'bg-[#faf9f7]' : ''}`}>
    <button onClick={onToggle} className="group flex w-full items-center justify-between gap-2 py-2.5 text-left">
      <span className="flex min-w-0 items-center gap-2">
        {Ikon && (
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] transition-colors ${open ? 'bg-[#f0ebfa] text-[#6d28d9]' : 'bg-[#f5f4f1] text-[#a6a19a] group-hover:text-[#57534e]'}`}>
            <Ikon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className={`truncate text-[11px] font-bold uppercase tracking-[0.09em] transition-colors ${open ? 'text-[#1c1917]' : 'text-[#78716c] group-hover:text-[#1c1917]'}`}>{tittel}</span>
      </span>
      <span className="flex max-w-[48%] shrink-0 items-center gap-1.5">
        {!open && sammendrag && <span className="truncate rounded-full bg-[#f5f4f1] px-2 py-0.5 text-[11px] font-medium text-[#8f8a82]" title={sammendrag}>{sammendrag}</span>}
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#c2beb8] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </span>
    </button>
    {open && <div className="pb-2.5 pl-1">{children}</div>}
  </div>
);

/* ── Driverfelt: etikett + tall (m/ tusenskille for kr) + slider + endrings-prikk ── */
const Felt = ({ label, k, drivere, sanert, lagret, onEndre, enhet, hint, slider, readOnly, testid, heltall }) => {
  const endret = lagret && sanert && Math.abs((sanert[k] ?? 0) - (lagret[k] ?? 0)) > 1e-9;
  const vis = heltall ? visTall(drivere[k]) : drivere[k];
  const endre = (e) => onEndre(k, heltall ? e.target.value.replace(/[^\d]/g, '') : e.target.value);
  return (
    <div className="py-[6px]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-[13px] leading-tight text-[#57534e]">{label}</span>
          {endret && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6d28d9]" title="Endret siden sist lagring" />}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {readOnly ? (
            <span className="text-[13.5px] font-semibold text-[#1c1917]">{heltall ? visTall(drivere[k]) : kma(drivere[k])}</span>
          ) : (
            <input value={vis} inputMode={heltall ? 'numeric' : 'decimal'} data-testid={testid} onChange={endre}
              className={`h-8 ${heltall ? 'w-[112px]' : 'w-[100px]'} rounded-[8px] bg-[#f5f4f1] px-2 text-right text-[13.5px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40`} />
          )}
          <span className="w-12 text-[11px] text-[#a6a19a]">{enhet}</span>
        </span>
      </div>
      {slider && !readOnly && (
        <input type="range" min={slider.min} max={slider.max} step={slider.step} value={Math.min(slider.max, Math.max(slider.min, sanert?.[k] ?? slider.min))}
          onChange={(e) => onEndre(k, e.target.value)} aria-label={label}
          className="mt-1.5 h-[3px] w-full cursor-pointer appearance-none rounded-full bg-black/[0.07] accent-[#6d28d9]" />
      )}
      {hint && <p className="mt-1 text-[11px] leading-snug text-[#a6a19a]">{hint}</p>}
    </div>
  );
};

/* ── Mini-sparkline for resultat per måned (med nullinje) ── */
const Sparkline = ({ serie }) => {
  const N = serie.length;
  if (N < 2) return null;
  const W = 84, H = 26;
  const min = Math.min(...serie, 0), maks = Math.max(...serie, 0);
  const spenn = maks - min || 1;
  const x = (i) => (W / (N - 1)) * i;
  const y = (v) => H - ((v - min) / spenn) * H;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[26px] w-[84px] shrink-0" aria-hidden>
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="#e7e5e0" strokeWidth="1" strokeDasharray="2 2" />
      <polyline points={serie.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none"
        stroke={serie[N - 1] >= 0 ? '#0a7d55' : '#b3261e'} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
};

/* Sparkline for hero-flisen: gradientfylt areal + nullinje — lys utgave.
   Grønn når siste måned er positiv, rosa når den er negativ. */
const SparkHero = ({ serie }) => {
  const N = serie.length;
  if (N < 2) return null;
  const W = 148, H = 44;
  const min = Math.min(...serie, 0), maks = Math.max(...serie, 0);
  const spenn = maks - min || 1;
  const x = (i) => (W / (N - 1)) * i;
  const y = (v) => 3 + (H - 6) * (1 - (v - min) / spenn);
  const pts = serie.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const positiv = serie[N - 1] >= 0;
  const c = positiv ? '#0ea472' : '#e11d48';
  const gid = positiv ? 'sparkHeroPos' : 'sparkHeroNeg';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[44px] w-[148px] shrink-0" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.18" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="rgba(0,0,0,0.10)" strokeWidth="1" strokeDasharray="2 3" />
      <polygon points={`0,${y(0)} ${pts} ${W},${y(0)}`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(N - 1)} cy={y(serie[N - 1])} r="2.6" fill={c} />
    </svg>
  );
};

/* ── Graf 2026: lyse, avrundede søyler (inntektslag i toner) + glatte
   spline-linjer med gradientareal. Krysset mellom inntekt og kostnad ER
   break-even — markert med pille. Kapitalbunn og årsskiller like så. ── */

// Catmull-Rom → kubisk bezier: glatt kurve gjennom alle punktene
const glattSti = (pts) => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

// Liten SVG-pille med tekst — klemmes innenfor lerretet
const GrafPille = ({ x, y, tekst, fill, W }) => {
  const w = tekst.length * 5.3 + 14;
  const rx = Math.max(4, Math.min(W - w - 4, x - w / 2));
  return (
    <g pointerEvents="none">
      <rect x={rx} y={y - 9} width={w} height={17} rx="8.5" fill={fill} />
      <text x={rx + w / 2} y={y + 3} fontSize="9" fontWeight="700" fill="#fff" textAnchor="middle">{tekst}</text>
    </g>
  );
};

const Graf = ({ m, startYm }) => {
  const [hov, setHov] = useState(null);
  const N = m.N;
  const W = 960, H = 196, TOPP = 30;
  const maks = Math.max(...m.inntekt, ...m.kostSum, 1);
  const yS = (H - TOPP) / maks;
  const yV = (v) => H - v * yS;
  const slot = W / N;
  const bw = Math.max(4.5, slot * 0.54);
  const x = (i) => slot * i + (slot - bw) / 2;
  const midt = (i) => slot * i + slot / 2;
  const hopp = Math.max(1, Math.ceil(N / 10));
  const beIdx = m.sammendrag.breakEvenIdx;
  const kapIdx = m.sammendrag.kapitalbehovIdx;
  const innSti = glattSti(Array.from({ length: N }, (_, i) => [midt(i), yV(m.inntekt[i])]));
  const kostSti = glattSti(Array.from({ length: N }, (_, i) => [midt(i), yV(m.kostSum[i])]));
  const areal = N >= 2 ? `${innSti} L ${midt(N - 1).toFixed(1)} ${H} L ${midt(0).toFixed(1)} ${H} Z` : '';
  return (
    <div className="relative" data-testid="modell-graf">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" style={{ height: 'auto' }} onMouseLeave={() => setHov(null)}>
        <defs>
          <linearGradient id="grafInntektFyll" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea472" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0ea472" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Nesten usynlige hjelpelinjer + diskré beløpsakser */}
        {[0.33, 0.66, 1].map((f) => (
          <g key={f}>
            <line x1="0" x2={W} y1={yV(maks * f)} y2={yV(maks * f)} stroke="#f2f1ee" strokeWidth="1" />
            <text x="2" y={yV(maks * f) - 4} fontSize="9.5" fill="#cfcac2">{kr0(maks * f)}</text>
          </g>
        ))}
        {/* Årsskiller — flerårsplanens rytme */}
        {Array.from({ length: Math.floor((N - 1) / 12) }, (_, k) => (k + 1) * 12).map((i) => (
          <g key={`aar-${i}`} pointerEvents="none">
            <line x1={slot * i} x2={slot * i} y1="20" y2={H} stroke="#e5e2dc" strokeWidth="1" strokeDasharray="1 5" strokeLinecap="round" />
            <text x={slot * i + 5} y="15" fontSize="8.5" fill="#b5b0a8" fontWeight="700" letterSpacing="1">ÅR {i / 12 + 1}</text>
          </g>
        ))}
        {/* Hover-bakteppe */}
        {hov !== null && <rect x={slot * hov + 1} y="20" width={slot - 2} height={H - 20} rx="6" fill="rgba(28,25,23,0.035)" pointerEvents="none" />}
        {/* Søyler — inntektslagene i lyse toner, avrundet topp på øverste lag */}
        {Array.from({ length: N }, (_, i) => {
          const eksH = m.eksisterende[i] * yS;
          const reH = (m.reutleie?.[i] || 0) * yS;
          const modH = (m.vekst[i] + m.oppstart[i]) * yS;
          const dim = hov !== null && hov !== i;
          const lag = [
            { h: eksH, farge: '#a78bfa' },
            { h: reH, farge: '#6ee7b7' },
            { h: modH, farge: '#e7e1fb' },
          ];
          const sisteMedH = lag.map((l2, li) => (l2.h > 0.4 ? li : -1)).filter((li) => li >= 0).pop();
          let yTop = H;
          return (
            <g key={i} opacity={dim ? 0.4 : 1} style={{ transition: 'opacity 140ms' }}>
              {lag.map((l2, li) => {
                if (l2.h <= 0.4) return null;
                yTop -= l2.h;
                return <rect key={li} x={x(i)} y={yTop} width={bw} height={l2.h} rx={li === sisteMedH ? 3 : 1.5} fill={l2.farge} />;
              })}
              {i % hopp === 0 && (
                <text x={midt(i)} y={H + 15} textAnchor="middle" fontSize="10.5" fill="#b5b0a8">{mndKort(ymPluss(startYm, i))}</text>
              )}
              <rect x={slot * i} y="0" width={slot} height={H} fill="transparent" onMouseEnter={() => setHov(i)} />
            </g>
          );
        })}
        {/* Inntekt: glatt kurve med gradientareal · Kostnad: myk stiplet kurve */}
        <path d={areal} fill="url(#grafInntektFyll)" pointerEvents="none" />
        <path d={kostSti} fill="none" stroke="#f43f5e" strokeWidth="1.6" strokeDasharray="5 4" strokeLinecap="round" opacity="0.7" pointerEvents="none" />
        <path d={innSti} fill="none" stroke="#0ea472" strokeWidth="2" strokeLinecap="round" pointerEvents="none" />
        {/* Hover-guide + punkter på kurvene */}
        {hov !== null && (
          <g pointerEvents="none">
            <circle cx={midt(hov)} cy={yV(m.inntekt[hov])} r="3.4" fill="#fff" stroke="#0ea472" strokeWidth="2" />
            <circle cx={midt(hov)} cy={yV(m.kostSum[hov])} r="3" fill="#fff" stroke="#f43f5e" strokeWidth="1.8" />
          </g>
        )}
        {/* Kapitalbunn — dypeste akkumulerte punkt = kapitalbehovet */}
        {kapIdx !== null && m.sammendrag.kapitalbehov > 0 && (
          <g pointerEvents="none">
            <line x1={midt(kapIdx)} x2={midt(kapIdx)} y1="30" y2={H} stroke="#d97706" strokeWidth="1" strokeDasharray="2 4" opacity="0.55" strokeLinecap="round" />
            <circle cx={midt(kapIdx)} cy={H} r="3" fill="#d97706" />
            <GrafPille W={W} x={midt(kapIdx)} y="30" tekst={`Kapitalbunn −${kr0(m.sammendrag.kapitalbehov)} kr`} fill="#b45309" />
          </g>
        )}
        {/* Break-even — der inntektskurven krysser kostnadskurven */}
        {beIdx !== null && beIdx > 0 && (
          <g pointerEvents="none">
            <line x1={midt(beIdx)} x2={midt(beIdx)} y1={yV(m.inntekt[beIdx]) + 4} y2={H} stroke="#6d28d9" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" strokeLinecap="round" />
            <circle cx={midt(beIdx)} cy={yV(m.inntekt[beIdx])} r="4.5" fill="#fff" stroke="#6d28d9" strokeWidth="2" />
            <GrafPille W={W} x={midt(beIdx)} y={Math.max(12, yV(m.inntekt[beIdx]) - 18)} tekst={`Break-even · ${mndKort(ymPluss(startYm, beIdx))}`} fill="#6d28d9" />
          </g>
        )}
      </svg>
      {hov !== null && (
        <div className="pointer-events-none absolute top-0 z-20 w-[216px] -translate-x-1/2 rounded-[12px] bg-[#1c1917]/95 px-3.5 py-3 text-[12px] leading-relaxed text-white shadow-xl backdrop-blur-sm"
          style={{ left: `${Math.min(92, Math.max(8, ((hov + 0.5) / N) * 100))}%` }}>
          <p className="font-bold">{stor(mndLang(ymPluss(startYm, hov)))} · {Math.round(m.enheter[hov])} enheter</p>
          <div className="mt-1 space-y-0.5 text-white/85">
            <p className="flex justify-between gap-3"><span>Portefølje</span><span>{kr0(m.eksisterende[hov])}</span></p>
            {(m.reutleie?.[hov] || 0) > 0 && <p className="flex justify-between gap-3"><span>Forventet re-utleie</span><span>{kr0(m.reutleie[hov])}</span></p>}
            <p className="flex justify-between gap-3"><span>Modellert vekst</span><span>{kr0(m.vekst[hov] + m.oppstart[hov])}</span></p>
            <p className="flex justify-between gap-3"><span>Kostnader</span><span>−{kr0(m.kostSum[hov])}</span></p>
            <p className={`flex justify-between gap-3 border-t border-white/15 pt-0.5 font-bold ${m.resultat[hov] >= 0 ? 'text-[#7ee2b8]' : 'text-[#ff9d94]'}`}>
              <span>Resultat</span><span>{kr0(m.resultat[hov])}</span>
            </p>
          </div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
        <span className="flex items-center gap-1.5 rounded-full bg-[#f5f4f1] px-2.5 py-1 text-[#57534e]"><span className="h-2 w-2 rounded-full bg-[#a78bfa]" /> Kontraktsfestet</span>
        {(m.sammendrag.sumReutleie || 0) > 0 && <span className="flex items-center gap-1.5 rounded-full bg-[#f5f4f1] px-2.5 py-1 text-[#57534e]"><span className="h-2 w-2 rounded-full bg-[#6ee7b7]" /> Forventet re-utleie</span>}
        <span className="flex items-center gap-1.5 rounded-full bg-[#f5f4f1] px-2.5 py-1 text-[#57534e]"><span className="h-2 w-2 rounded-full bg-[#e7e1fb] ring-1 ring-black/[0.06]" /> Modellert vekst</span>
        <span className="flex items-center gap-1.5 rounded-full bg-[#f5f4f1] px-2.5 py-1 text-[#57534e]"><span className="h-[2.5px] w-4 rounded-full bg-[#0ea472]" /> Inntekt</span>
        <span className="flex items-center gap-1.5 rounded-full bg-[#f5f4f1] px-2.5 py-1 text-[#57534e]"><span className="h-[2.5px] w-4 rounded-full [background:repeating-linear-gradient(90deg,#f43f5e_0_4px,transparent_4px_7px)]" /> Kostnader</span>
      </div>
    </div>
  );
};

/* ── Bemanningskurve: glidende behov (stiplet) vs. budsjettert trapp ── */
/* ── Kapasitetsgraf: modellerte enheter vs. tilgjengelig kapasitet (trapp) ──
   Skjæringen forteller historien: når vokser porteføljen forbi det dagens
   bemanning kan bære — og når hopper kapasiteten ved neste trinn? ── */
const KpiBlokk = ({ label, verdi, under }) => (
  <div className="min-w-[150px] flex-1 rounded-[12px] bg-white px-4 py-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
    <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">{label}</p>
    <p className="mt-0.5 text-[20px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{verdi}</p>
    {under && <p className="text-[11px] text-[#a6a19a]">{under}</p>}
  </div>
);

const KapasitetGraf = ({ m, startYm, enhPerAarsverk, maalPct }) => {
  const N = m.N;
  const kapasitet = m.budsjettertPct.map((p) => (p / 100) * enhPerAarsverk);
  const buffer = kapasitet.map((k) => k * (maalPct / 100));
  const W = 960, H = 200, TOPP = 18, BUNN = 22;
  const maks = Math.max(...kapasitet, ...m.enheter, 1) * 1.12;
  const x = (i) => (W / Math.max(1, N - 1)) * i;
  const y = (v) => TOPP + (H - TOPP - BUNN) * (1 - v / maks);
  const steg = (serie) => {
    const p = [];
    for (let i = 0; i < N; i++) {
      if (i === 0) p.push(`${x(0)},${y(serie[0])}`);
      else { p.push(`${x(i)},${y(serie[i - 1])}`); p.push(`${x(i)},${y(serie[i])}`); }
    }
    return p.join(' ');
  };
  const hopp = Math.max(1, Math.ceil(N / 10));
  const varselIdx = m.sammendrag.bemanningsVarselIdx;
  return (
    <div data-testid="bemplan-graf">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }} preserveAspectRatio="none">
        {Array.from({ length: N }, (_, i) => i).filter((i) => i % hopp === 0).map((i) => (
          <text key={i} x={x(i)} y={H - 6} fontSize="10" fill="#c2beb8">{stor(mndKort(ymPluss(startYm, i)))}</text>
        ))}
        {/* buffer (mål-utnyttelse av kapasiteten) */}
        <polyline points={steg(buffer)} fill="none" stroke="#c9a35b" strokeWidth="1.2" strokeDasharray="4 3" />
        {/* tilgjengelig kapasitet — trapp */}
        <polyline points={steg(kapasitet)} fill="none" stroke="#1c1917" strokeWidth="2" strokeLinejoin="round" />
        {/* modellerte enheter */}
        <polyline points={Array.from({ length: N }, (_, i) => `${x(i)},${y(m.enheter[i])}`).join(' ')} fill="none" stroke="#6d28d9" strokeWidth="2.2" strokeLinejoin="round" />
        {/* forventet bemanningsbehov */}
        {varselIdx !== null && (
          <g>
            <line x1={x(varselIdx)} x2={x(varselIdx)} y1={TOPP} y2={H - BUNN} stroke="#9a6b1c" strokeWidth="1.4" strokeDasharray="5 3" />
            <circle cx={x(varselIdx)} cy={y(m.enheter[varselIdx])} r="4.5" fill="#fff" stroke="#9a6b1c" strokeWidth="2.2" />
            <text x={Math.min(x(varselIdx) + 7, W - 260)} y={TOPP + 10} fontSize="11" fontWeight="700" fill="#9a6b1c">
              Bemanningsbehov — {stor(mndLang(ymPluss(startYm, varselIdx)))} (utnyttelse over {kma(maalPct)} %)
            </text>
          </g>
        )}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-4 text-[11px] text-[#a6a19a]">
        <span className="flex items-center gap-1.5"><span className="h-[2.5px] w-4 rounded bg-[#6d28d9]" /> Modellerte enheter</span>
        <span className="flex items-center gap-1.5"><span className="h-[2.5px] w-4 rounded bg-[#1c1917]" /> Kapasitet m/ budsjettert bemanning</span>
        <span className="flex items-center gap-1.5"><span className="h-[2px] w-4 rounded border-t-2 border-dashed border-[#c9a35b]" /> Mål maks utnyttelse ({kma(maalPct)} %)</span>
      </div>
    </div>
  );
};

/* ── Bemanningsplan — stor drawer fra høyre. Skiller den ØKONOMISKE
      forutsetningen (lønn/kapasitet) fra selve PLANEN (hendelsesbaserte
      trinn: enhetsterskel eller dato). Redigerer et utkast — ingenting
      treffer modellen før «Bruk bemanningsplan». ── */
function BemanningsplanDrawer({ plan, fakta, drivere, readOnly, onLukk, onBruk }) {
  const [draft, setDraft] = useState(() => ({
    bemanningstrinn: (drivere.bemanningstrinn || []).map((t) => ({
      type: t.type === 'dato' ? 'dato' : 'enheter',
      fraEnheter: t.fraEnheter ?? 0,
      fraYm: t.fraYm || '',
      prosent: t.prosent,
    })),
    enheterPerAarsverk: drivere.enheterPerAarsverk,
    aarslonn: drivere.aarslonn,
    paslagPct: drivere.paslagPct,
    maalUtnyttelsePct: drivere.maalUtnyttelsePct ?? 85,
  }));

  const mB = useMemo(
    () => beregnInvestorModell({ antallMnd: plan.antallMnd, fakta, drivere: { ...drivere, ...draft }, startYm: plan.startYm }),
    [plan.antallMnd, plan.startYm, fakta, drivere, draft],
  );
  const sB = mB.drivere;
  const fullkostB = Math.round(sB.aarslonn * (1 + sB.paslagPct / 100));
  const pctNaa = mB.budsjettertPct[0] || 0;
  const kapNaa = Math.round((pctNaa / 100) * sB.enheterPerAarsverk);
  const enhNaa = Math.round(mB.enheter[0] || 0);
  const neste = sB.bemanningstrinn.filter((t) => t.prosent > pctNaa).sort((a, b) => a.prosent - b.prosent)[0] || null;
  const varselIdx = mB.sammendrag.bemanningsVarselIdx;
  const behovVedEnheter = Math.floor(kapNaa * (sB.maalUtnyttelsePct / 100));

  const settTrinn = (i, felt, v) => setDraft((d) => ({ ...d, bemanningstrinn: d.bemanningstrinn.map((t, j) => (j === i ? { ...t, [felt]: v } : t)) }));
  const leggTrinn = () => setDraft((d) => {
    const siste = d.bemanningstrinn[d.bemanningstrinn.length - 1] || { fraEnheter: 0, prosent: 30 };
    const nesteFra = (Number(String(siste.fraEnheter).replace(/\s/g, '')) || 0) + 50;
    return { ...d, bemanningstrinn: [...d.bemanningstrinn, { type: 'enheter', fraEnheter: nesteFra, fraYm: '', prosent: Math.min(2000, (Number(siste.prosent) || 0) + 25) }] };
  });
  const fjernTrinn = (i) => setDraft((d) => ({ ...d, bemanningstrinn: d.bemanningstrinn.filter((_, j) => j !== i) }));
  const settFelt = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const KostFelt = ({ label, k, enhet, heltall }) => (
    <label className="block">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#a6a19a]">{label}</span>
      <div className="mt-1 flex items-center gap-1.5">
        {readOnly ? (
          <span className="text-[14px] font-semibold text-[#1c1917]">{heltall ? visTall(draft[k]) : kma(draft[k])}</span>
        ) : (
          <input value={heltall ? visTall(draft[k]) : draft[k]} inputMode={heltall ? 'numeric' : 'decimal'} data-testid={`bemplan-${k}`}
            onChange={(e) => settFelt(k, heltall ? e.target.value.replace(/[^\d]/g, '') : e.target.value)}
            className="h-9 w-full rounded-[8px] bg-[#f5f4f1] px-2.5 text-right text-[14px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40" />
        )}
        <span className="w-12 shrink-0 text-[11px] text-[#a6a19a]">{enhet}</span>
      </div>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="bemplan-drawer">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1.5px]" onClick={onLukk} />
      <div className="relative flex h-full w-full max-w-[1080px] flex-col bg-[#faf9f7] shadow-[0_0_60px_rgba(0,0,0,0.25)] lg:w-[78vw]">
        {/* Topp */}
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] bg-white px-5 py-3.5">
          <div>
            <p className="text-[16px] font-bold text-[#1c1917]" style={heading}>Bemanningsplan</p>
            <p className="text-[12px] text-[#8f8a82]">Kapasitet og planlagte bemanningsøkninger — hendelsesbasert, følger scenarioets veksttempo</p>
          </div>
          <button onClick={onLukk} data-testid="bemplan-lukk" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[#8f8a82] transition-colors hover:bg-black/[0.05] hover:text-[#1c1917]" title="Lukk">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Innhold */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'thin' }}>
          {/* KPI-er */}
          <div className="flex flex-wrap gap-2.5">
            <KpiBlokk label="Bemanning nå" verdi={`${pctNaa} %`} under={`${kr0(Math.round((pctNaa / 100) * fullkostB / 12))} kr/mnd fullkost`} />
            <KpiBlokk label="Kapasitet nå" verdi={`${kr0(kapNaa)} enheter`} under={`${kma(sB.enheterPerAarsverk)} enh per årsverk`} />
            <KpiBlokk label="Under forvaltning" verdi={`${kr0(enhNaa)} enheter`} under="første måned i planen" />
            <KpiBlokk label="Neste planlagte nivå" verdi={neste ? `${kma(neste.prosent)} %` : '—'}
              under={neste ? (neste.type === 'dato' ? `fra ${stor(mndLang(neste.fraYm))}` : `ved ${kr0(neste.fraEnheter)} enheter`) : 'ingen flere trinn'} />
          </div>

          {/* Buffer-varsel */}
          <div className={`mt-3 rounded-[12px] px-3.5 py-2.5 text-[12.5px] font-medium leading-snug ${varselIdx !== null ? 'bg-[#fdf3e0] text-[#9a6b1c]' : 'bg-[#e7f4ee] text-[#0a7d55]'}`} data-testid="bemplan-varsel">
            {varselIdx !== null ? (
              <>Neste bemanningsbehov ved ca. <b>{kr0(behovVedEnheter)} enheter</b> ({kma(sB.maalUtnyttelsePct)} % av dagens kapasitet) — forventet <b>{stor(mndLang(ymPluss(plan.startYm, varselIdx)))}</b>. Vurder et nytt trinn før dette.</>
            ) : (
              <>Planen holder utnyttelsen under målnivået ({kma(sB.maalUtnyttelsePct)} %) i hele perioden — bemanningen bærer veksten.</>
            )}
          </div>

          {/* Enheter vs. kapasitet */}
          <div className="mt-3 rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <p className="text-[13px] font-medium text-[#8f8a82]">Enheter vs. kapasitet over tid</p>
            <div className="mt-2">
              <KapasitetGraf m={mB} startYm={plan.startYm} enhPerAarsverk={sB.enheterPerAarsverk} maalPct={sB.maalUtnyttelsePct} />
            </div>
          </div>

          {/* Bemanningstrinn — hendelsesbasert */}
          <div className="mt-3 rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <p className="text-[13px] font-medium text-[#8f8a82]">Bemanningstrinn</p>
            <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">Beskriver beslutningslogikken — ikke måned for måned. Nivået er det høyeste av alle utløste trinn; enhetsterskler følger automatisk scenarioets vekst.</p>
            <div className="mt-3 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-[0.06em] text-[#a6a19a]">
                    <th className="pb-1.5 text-left font-semibold">Utløses av</th>
                    <th className="pb-1.5 text-left font-semibold">Utløser</th>
                    <th className="pb-1.5 text-right font-semibold">Bemanning</th>
                    <th className="pb-1.5 text-right font-semibold">Kapasitet</th>
                    <th className="pb-1.5 text-right font-semibold">Fullkost/mnd</th>
                    <th className="pb-1.5 text-right font-semibold">&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.bemanningstrinn.map((t, i) => {
                    const p = Number(String(t.prosent).replace(',', '.')) || 0;
                    const kapT = Math.round((p / 100) * sB.enheterPerAarsverk);
                    const kostT = Math.round((p / 100) * fullkostB / 12);
                    const erStart = t.type === 'enheter' && (Number(String(t.fraEnheter).replace(/\s/g, '')) || 0) === 0;
                    return (
                      <tr key={i} className="border-t border-black/[0.04]" data-testid={`bemplan-trinn-${i}`}>
                        <td className="py-1.5 pr-2">
                          {readOnly ? (
                            <span className="text-[#57534e]">{erStart ? 'Nå' : t.type === 'dato' ? 'Fra måned' : 'Ved enheter'}</span>
                          ) : erStart ? (
                            <span className="inline-flex rounded-[7px] bg-[#f5f4f1] px-2 py-1 text-[12px] font-semibold text-[#57534e]">Nå</span>
                          ) : (
                            <select value={t.type} onChange={(e) => settTrinn(i, 'type', e.target.value)} data-testid={`bemplan-trinn-type-${i}`}
                              className="h-8 rounded-[8px] bg-[#f5f4f1] px-2 text-[12.5px] font-medium text-[#57534e] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40">
                              <option value="enheter">Ved enheter</option>
                              <option value="dato">Fra måned</option>
                            </select>
                          )}
                        </td>
                        <td className="py-1.5 pr-2">
                          {erStart ? (
                            <span className="text-[12.5px] text-[#a6a19a]">fra start</span>
                          ) : t.type === 'dato' ? (
                            readOnly ? <span className="font-semibold text-[#1c1917]">{t.fraYm ? stor(mndLang(t.fraYm)) : '—'}</span> : (
                              <MndVelger value={t.fraYm} min={ymPluss(plan.startYm, 1)} max={ymPluss(plan.startYm, plan.antallMnd - 1)}
                                onChange={(ym) => settTrinn(i, 'fraYm', ym)} testid={`bemplan-trinn-ym-${i}`} />
                            )
                          ) : (
                            readOnly ? <span className="font-semibold text-[#1c1917]">{kr0(t.fraEnheter)} enheter</span> : (
                              <span className="flex items-center gap-1.5">
                                <input value={visTall(t.fraEnheter)} inputMode="numeric" onChange={(e) => settTrinn(i, 'fraEnheter', e.target.value.replace(/[^\d]/g, ''))} data-testid={`bemplan-trinn-fra-${i}`}
                                  className="h-8 w-[76px] rounded-[8px] bg-[#f5f4f1] px-2 text-right text-[13px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40" />
                                <span className="text-[11.5px] text-[#a6a19a]">enheter</span>
                              </span>
                            )
                          )}
                        </td>
                        <td className="py-1.5 text-right">
                          {readOnly ? (
                            <span className="font-bold text-[#1c1917]">{kma(t.prosent)} %</span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <input value={t.prosent} inputMode="decimal" onChange={(e) => settTrinn(i, 'prosent', e.target.value)} data-testid={`bemplan-trinn-pct-${i}`}
                                className="h-8 w-[64px] rounded-[8px] bg-[#f5f4f1] px-2 text-right text-[13px] font-bold text-[#1c1917] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40" />
                              <span className="text-[11.5px] text-[#a6a19a]">%</span>
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-right font-medium text-[#57534e]">{kr0(kapT)} enh</td>
                        <td className="py-1.5 text-right font-medium text-[#57534e]">{kr0(kostT)} kr</td>
                        <td className="py-1.5 text-right">
                          {!readOnly && draft.bemanningstrinn.length > 1 && !erStart && (
                            <button onClick={() => fjernTrinn(i)} className="rounded p-1 text-[#c2beb8] transition-colors hover:text-[#c2413b]" title="Fjern trinn" data-testid={`bemplan-trinn-fjern-${i}`}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!readOnly && (
              <div className="mt-2 flex flex-wrap items-center gap-4">
                {draft.bemanningstrinn.length < 12 && (
                  <button onClick={leggTrinn} data-testid="bemplan-legg-trinn" className="flex items-center gap-1 text-[12.5px] font-semibold text-[#6d28d9] hover:text-[#4c1d95]">
                    <Plus className="h-3.5 w-3.5" /> Legg til bemanningstrinn
                  </button>
                )}
                <button
                  onClick={() => setDraft((d) => ({ ...d, bemanningstrinn: STANDARD_DRIVERE.bemanningstrinn.map((t) => ({ ...t, fraYm: '' })) }))}
                  data-testid="bemplan-standardtrapp"
                  title="Erstatter trinnene med en anbefalt trapp: 30 % nå → 50 % ved 55 enh → 75 % ved 90 → 100 % ved 140 → 150 % ved 190"
                  className="flex items-center gap-1 text-[12.5px] font-semibold text-[#8f8a82] transition-colors hover:text-[#1c1917]">
                  <RefreshCw className="h-3 w-3" /> Bruk standardtrapp
                </button>
              </div>
            )}
          </div>

          {/* Kostnadsforutsetninger */}
          <div className="mt-3 rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <p className="text-[13px] font-medium text-[#8f8a82]">Kostnadsforutsetninger</p>
            <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">Fullkost per årsverk: {kr0(fullkostB)} kr (årslønn × (1 + påslag)). Målet for maks utnyttelse styrer når systemet varsler neste bemanningsbehov.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KostFelt label="Enheter per årsverk" k="enheterPerAarsverk" enhet="enh" heltall />
              <KostFelt label="Brutto årslønn" k="aarslonn" enhet="kr/år" heltall />
              <KostFelt label="Arbeidsgiverpåslag" k="paslagPct" enhet="%" />
              <KostFelt label="Mål maks utnyttelse" k="maalUtnyttelsePct" enhet="%" />
            </div>
          </div>

          {/* Behov vs. beslutning */}
          <div className="mt-3 rounded-[12px] bg-[#faf9f7] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#a6a19a] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
            Modellen skiller <b className="text-[#57534e]">beregnet behov</b> (enheter ÷ kapasitet, glidende) fra <b className="text-[#57534e]">budsjettert bemanning</b> (denne planen — det dere faktisk betaler).
            Systemet foreslår aldri ansettelser automatisk; dere bestemmer trinnene, og modellen viser konsekvensen.
          </div>
        </div>

        {/* Bunn */}
        <div className="flex items-center justify-end gap-2 border-t border-black/[0.06] bg-white px-5 py-3">
          <button onClick={onLukk} data-testid="bemplan-avbryt" className="flex h-9 items-center rounded-[9px] px-4 text-[13px] font-medium text-[#57534e] transition-colors hover:bg-black/[0.05]">
            {readOnly ? 'Lukk' : 'Avbryt'}
          </button>
          {!readOnly && (
            <button onClick={() => onBruk(draft)} data-testid="bemplan-bruk" className={KNAPP_PRIMAER}>
              <Check className="h-3.5 w-3.5" /> Bruk bemanningsplan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Vekstgraf: søyler = nye enheter per måned (fasene synlige som trappetrinn),
      linje = enheter under forvaltning. ── */
const VekstGraf = ({ m, startYm }) => {
  const N = m.N;
  const rate = m.nyePerMndSerie || [];
  const W = 960, H = 200, TOPP = 18, BUNN = 22;
  const maksRate = Math.max(...rate, 1) * 1.3;
  const maksEnh = Math.max(...m.enheter, 1) * 1.12;
  const bw = W / Math.max(1, N);
  const x = (i) => bw * i;
  const yR = (v) => TOPP + (H - TOPP - BUNN) * (1 - v / maksRate);
  const yE = (v) => TOPP + (H - TOPP - BUNN) * (1 - v / maksEnh);
  const hopp = Math.max(1, Math.ceil(N / 10));
  return (
    <div data-testid="vekstplan-graf">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }} preserveAspectRatio="none">
        {Array.from({ length: N }, (_, i) => i).filter((i) => i % hopp === 0).map((i) => (
          <text key={i} x={x(i)} y={H - 6} fontSize="10" fill="#c2beb8">{stor(mndKort(ymPluss(startYm, i)))}</text>
        ))}
        {/* nye per måned — søyler */}
        {rate.map((v, i) => (
          <rect key={i} x={x(i) + bw * 0.16} y={yR(v)} width={bw * 0.68} height={Math.max(0, H - BUNN - yR(v))} rx="2" fill="#ddD0f7" />
        ))}
        {/* enheter under forvaltning — linje */}
        <polyline points={Array.from({ length: N }, (_, i) => `${x(i) + bw / 2},${yE(m.enheter[i])}`).join(' ')} fill="none" stroke="#6d28d9" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-4 text-[11px] text-[#a6a19a]">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-[3px] bg-[#ddd0f7]" /> Nye enheter per måned</span>
        <span className="flex items-center gap-1.5"><span className="h-[2.5px] w-4 rounded bg-[#6d28d9]" /> Enheter under forvaltning</span>
      </div>
    </div>
  );
};

/* ── Vekstplan — drawer fra høyre, samme mønster som bemanningsplanen.
      Faser med KONSTANT takt per fase, utløst av måned: fase 1 er grunntakten
      (nyePerMnd), hver ny fase overtar fra sin måned. Redigerer et utkast —
      ingenting treffer modellen før «Bruk vekstplan». ── */
function VekstplanDrawer({ plan, fakta, drivere, readOnly, onLukk, onBruk }) {
  const tilTall = (v) => Number(String(v ?? '').replace(/\s/g, '').replace(',', '.')) || 0;
  const tilStreng = (v) => String(v ?? '').replace('.', ',');
  // Fasene holdes ALLTID kronologisk sortert på «gjelder fra»-måneden —
  // sortert ved innlasting, ved månedsendring og når nye faser legges til.
  const sorterFaser = (faser) => [...faser].sort((a, b) => (Number(a.fraMnd) || 0) - (Number(b.fraMnd) || 0));
  const [draft, setDraft] = useState(() => ({
    nyePerMnd: tilStreng(drivere.nyePerMnd),
    faser: sorterFaser((drivere.vekstplan || []).map((f) => ({ fraMnd: f.fraMnd, perMnd: tilStreng(f.perMnd) }))),
  }));
  const N = plan.antallMnd;
  const ymFraIdx = (idx) => ymPluss(plan.startYm, idx - 1); // 1-basert fase-måned → ÅÅÅÅ-MM
  const idxFraYm = (ym) => {
    const [a, mn] = String(ym).split('-').map(Number);
    const [a0, m0] = String(plan.startYm).split('-').map(Number);
    if (!a || !mn || !a0 || !m0) return 2;
    return Math.max(2, Math.min(N, (a - a0) * 12 + (mn - m0) + 1));
  };

  const sanertDraft = useMemo(() => rensModellDrivere({
    ...drivere,
    nyePerMnd: tilTall(draft.nyePerMnd),
    vekstplan: draft.faser.map((f) => ({ fraMnd: f.fraMnd, perMnd: tilTall(f.perMnd) })),
  }), [draft, drivere]);
  const mV = useMemo(
    () => beregnInvestorModell({ antallMnd: N, fakta, drivere: sanertDraft, startYm: plan.startYm }),
    [N, fakta, sanertDraft, plan.startYm],
  );

  // Effektive faser (sortert) — til «nye i fasen»-kolonnen
  const effektive = useMemo(() => {
    const alle = [{ fraMnd: 1, perMnd: sanertDraft.nyePerMnd }, ...sanertDraft.vekstplan];
    return alle.map((f, i) => {
      const til = i + 1 < alle.length ? alle[i + 1].fraMnd - 1 : N;
      const mnd = Math.max(0, til - f.fraMnd + 1);
      return { ...f, tilMnd: til, mnd, sum: Math.round(f.perMnd * mnd * 10) / 10 };
    });
  }, [sanertDraft, N]);
  const nyeIFase = (fraMnd) => effektive.find((f) => f.fraMnd === fraMnd);

  const settFase = (i, k, v) => setDraft((d) => {
    const faser = d.faser.map((f, j) => (j === i ? { ...f, [k]: v } : f));
    // Månedsendring kan endre kronologien — resorter umiddelbart
    return { ...d, faser: k === 'fraMnd' ? sorterFaser(faser) : faser };
  });
  const fjernFase = (i) => setDraft((d) => ({ ...d, faser: d.faser.filter((_, j) => j !== i) }));
  const leggFase = () => setDraft((d) => {
    // Ny fase foreslås 6 mnd etter den KRONOLOGISK siste (ikke sist innlagte)
    const sisteFra = d.faser.length ? Math.max(...d.faser.map((f) => Number(f.fraMnd) || 1)) : 1;
    const sisteTakt = d.faser.length
      ? d.faser.reduce((best, f) => ((Number(f.fraMnd) || 0) >= (Number(best.fraMnd) || 0) ? f : best), d.faser[0]).perMnd
      : d.nyePerMnd;
    const fra = Math.min(N, sisteFra + 6);
    const takt = Math.round((tilTall(sisteTakt) + 1) * 10) / 10;
    return { ...d, faser: sorterFaser([...d.faser, { fraMnd: fra, perMnd: tilStreng(takt) }]) };
  });
  const foreslaaTrapp = () => setDraft((d) => {
    const r = Math.max(0.5, tilTall(d.nyePerMnd) || 1);
    const rund = (v) => Math.round(v * 10) / 10;
    const faser = [
      { fraMnd: 7, perMnd: rund(r * 2) },
      { fraMnd: 13, perMnd: rund(r * 3) },
      { fraMnd: 19, perMnd: rund(r * 4) },
    ].filter((f) => f.fraMnd <= N).map((f) => ({ fraMnd: f.fraMnd, perMnd: tilStreng(f.perMnd) }));
    return { ...d, faser };
  });

  const taktSlutt = mV.nyePerMndSerie[N - 1] || 0;
  const snittTakt = Math.round((mV.sammendrag.sumNyeBrutto / Math.max(1, N)) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="vekstplan-drawer">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1.5px]" onClick={onLukk} />
      <div className="relative flex h-full w-full max-w-[1080px] flex-col bg-[#faf9f7] shadow-[0_0_60px_rgba(0,0,0,0.25)] lg:w-[78vw]">
        {/* Topp */}
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] bg-white px-5 py-3.5">
          <div>
            <p className="text-[16px] font-bold text-[#1c1917]" style={heading}>Vekstplan</p>
            <p className="text-[12px] text-[#8f8a82]">Faser med konstant takt — hver fase overtar fra sin måned. Bemanning og kostnader følger planen automatisk.</p>
          </div>
          <button onClick={onLukk} data-testid="vekstplan-lukk" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[#8f8a82] transition-colors hover:bg-black/[0.05] hover:text-[#1c1917]" title="Lukk">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Innhold */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'thin' }}>
          {/* KPI-er */}
          <div className="flex flex-wrap gap-2.5">
            <KpiBlokk label="Takt nå" verdi={`${kma(sanertDraft.nyePerMnd)} enh/mnd`} under="fase 1 — grunntakten" />
            <KpiBlokk label="Takt ved periodeslutt" verdi={`${kma(taktSlutt)} enh/mnd`} under={sanertDraft.vekstplan.length ? `${sanertDraft.vekstplan.length + 1} faser i planen` : 'konstant hele perioden'} />
            <KpiBlokk label="Nye enheter i perioden" verdi={`${kma(mV.sammendrag.sumNyeBrutto)}`} under={`snitt ${kma(snittTakt)} per måned`} />
            <KpiBlokk label="Enheter ved periodeslutt" verdi={`${kr0(mV.sammendrag.enheterVedSlutt)}`} under="etter churn, inkl. kontraktsfestet" />
          </div>

          {/* Graf */}
          <div className="mt-3 rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <p className="text-[13px] font-medium text-[#8f8a82]">Nye enheter per måned og porteføljen over tid</p>
            <div className="mt-2">
              <VekstGraf m={mV} startYm={plan.startYm} />
            </div>
          </div>

          {/* Faser */}
          <div className="mt-3 rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <p className="text-[13px] font-medium text-[#8f8a82]">Faser</p>
            <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">Taktene er absolutte (ikke tillegg): «2 per måned fra juli» betyr at det signeres 2 nye enheter hver måned fra juli — til neste fase overtar.</p>
            <div className="mt-3 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full min-w-[560px] text-[13px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-[0.06em] text-[#a6a19a]">
                    <th className="pb-1.5 text-left font-semibold">Fase</th>
                    <th className="pb-1.5 text-left font-semibold">Gjelder fra</th>
                    <th className="pb-1.5 text-right font-semibold">Nye per måned</th>
                    <th className="pb-1.5 text-right font-semibold">Varighet</th>
                    <th className="pb-1.5 text-right font-semibold">Nye i fasen</th>
                    <th className="pb-1.5 text-right font-semibold">&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Fase 1 — grunntakten */}
                  <tr className="border-t border-black/[0.04]" data-testid="vekstplan-fase-start">
                    <td className="py-2 pr-2"><span className="inline-flex rounded-[7px] bg-[#f5f4f1] px-2 py-1 text-[12px] font-semibold text-[#57534e]">1</span></td>
                    <td className="py-2 pr-2 text-[12.5px] text-[#a6a19a]">start — {stor(mndLang(plan.startYm))}</td>
                    <td className="py-2 pr-2 text-right">
                      {readOnly ? (
                        <span className="font-semibold text-[#1c1917]">{kma(sanertDraft.nyePerMnd)}</span>
                      ) : (
                        <input value={draft.nyePerMnd} inputMode="decimal" data-testid="vekstplan-grunntakt"
                          onChange={(e) => setDraft((d) => ({ ...d, nyePerMnd: e.target.value }))}
                          className="h-8 w-[84px] rounded-[8px] bg-[#f5f4f1] px-2 text-right text-[13px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40" />
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right text-[#8f8a82]">{nyeIFase(1)?.mnd ?? N} mnd</td>
                    <td className="py-2 pr-2 text-right font-semibold text-[#1c1917]">{kma(nyeIFase(1)?.sum ?? 0)}</td>
                    <td className="py-2 text-right">&nbsp;</td>
                  </tr>
                  {draft.faser.map((f, i) => {
                    const eff = nyeIFase(Math.max(2, Math.min(N, Number(f.fraMnd) || 2)));
                    return (
                      <tr key={i} className="border-t border-black/[0.04]" data-testid={`vekstplan-fase-${i}`}>
                        <td className="py-2 pr-2"><span className="inline-flex rounded-[7px] bg-[#f0ebfa] px-2 py-1 text-[12px] font-semibold text-[#6d28d9]">{i + 2}</span></td>
                        <td className="py-2 pr-2">
                          {readOnly ? (
                            <span className="font-semibold text-[#1c1917]">{stor(mndLang(ymFraIdx(f.fraMnd)))}</span>
                          ) : (
                            <MndVelger value={ymFraIdx(f.fraMnd)} min={ymPluss(plan.startYm, 1)} max={ymPluss(plan.startYm, N - 1)}
                              onChange={(ym) => settFase(i, 'fraMnd', idxFraYm(ym))} testid={`vekstplan-fase-fra-${i}`} />
                          )}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {readOnly ? (
                            <span className="font-semibold text-[#1c1917]">{kma(tilTall(f.perMnd))}</span>
                          ) : (
                            <input value={f.perMnd} inputMode="decimal" data-testid={`vekstplan-fase-takt-${i}`}
                              onChange={(e) => settFase(i, 'perMnd', e.target.value)}
                              className="h-8 w-[84px] rounded-[8px] bg-[#f5f4f1] px-2 text-right text-[13px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40" />
                          )}
                        </td>
                        <td className="py-2 pr-2 text-right text-[#8f8a82]">{eff ? `${eff.mnd} mnd` : '—'}</td>
                        <td className="py-2 pr-2 text-right font-semibold text-[#1c1917]">{eff ? kma(eff.sum) : '—'}</td>
                        <td className="py-2 text-right">
                          {!readOnly && (
                            <button onClick={() => fjernFase(i)} data-testid={`vekstplan-fase-fjern-${i}`} title="Fjern fasen"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] text-[#c2beb8] transition-colors hover:bg-[#f6dedd] hover:text-[#c2413b]">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!readOnly && (
              <div className="mt-2 flex flex-wrap items-center gap-4">
                {draft.faser.length < 11 && (
                  <button onClick={leggFase} data-testid="vekstplan-legg-fase" className="flex items-center gap-1 text-[12.5px] font-semibold text-[#6d28d9] hover:text-[#4c1d95]">
                    <Plus className="h-3.5 w-3.5" /> Legg til fase
                  </button>
                )}
                <button onClick={foreslaaTrapp} data-testid="vekstplan-trapp"
                  title="Erstatter fasene med en anbefalt opptrapping: 2× grunntakten fra måned 7, 3× fra måned 13, 4× fra måned 19"
                  className="flex items-center gap-1 text-[12.5px] font-semibold text-[#8f8a82] transition-colors hover:text-[#1c1917]">
                  <RefreshCw className="h-3 w-3" /> Foreslå opptrapping
                </button>
                {draft.faser.length > 0 && (
                  <button onClick={() => setDraft((d) => ({ ...d, faser: [] }))} data-testid="vekstplan-nullstill"
                    className="flex items-center gap-1 text-[12.5px] font-medium text-[#a6a19a] transition-colors hover:text-[#1c1917]">
                    Konstant takt (fjern faser)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Forklaring */}
          <div className="mt-3 rounded-[12px] bg-[#faf9f7] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#a6a19a] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
            Scenarioene («Konservativt», «Ambisiøst») lagrer hele vekstplanen — og sensitivitetsanalysen skalerer alle fasene, ikke bare grunntakten.
            CAC/provisjon følger antall nye per måned, og bemanningens enhetsterskler utløses automatisk når veksten treffer dem.
          </div>
        </div>

        {/* Bunn */}
        <div className="flex items-center justify-end gap-2 border-t border-black/[0.06] bg-white px-5 py-3">
          <button onClick={onLukk} data-testid="vekstplan-avbryt" className="flex h-9 items-center rounded-[9px] px-4 text-[13px] font-medium text-[#57534e] transition-colors hover:bg-black/[0.05]">
            {readOnly ? 'Lukk' : 'Avbryt'}
          </button>
          {!readOnly && (
            <button
              onClick={() => onBruk({ nyePerMnd: tilTall(draft.nyePerMnd), vekstplan: draft.faser.map((f) => ({ fraMnd: Number(f.fraMnd) || 2, perMnd: tilTall(f.perMnd) })) })}
              data-testid="vekstplan-bruk" className={KNAPP_PRIMAER}>
              <Check className="h-3.5 w-3.5" /> Bruk vekstplan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCENARIOSAMMENLIGNING — fullskjerms A/B-duell mellom driversett.
   Investorspørsmålet: «Hva skiller konservativt fra ambisiøst — i kroner,
   måneder og enheter?» Alt beregnes live med samme motor som cockpiten.
   ═══════════════════════════════════════════════════════════════════════════ */
const FARGE_A = '#7c3aed';
const FARGE_B = '#d97706';

function SammenligningsGraf({ serieA, serieB, startYm, tittel, formatY, beA, beB }) {
  const N = Math.max(serieA.length, serieB.length);
  if (!N) return null;
  const W = 720; const H = 230; const L = 6; const R = 6; const T = 12; const B = 26;
  const alle = [...serieA, ...serieB, 0];
  const maks = Math.max(...alle); const min = Math.min(...alle);
  const spenn = (maks - min) || 1;
  const x = (i) => L + ((W - L - R) * i) / Math.max(1, N - 1);
  const y = (v) => T + (H - T - B) * (1 - (v - min) / spenn);
  const sti = (serie) => serie.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const hvert = Math.max(1, Math.ceil(N / 8));
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a6a19a]">{tittel}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 w-full" style={{ height: 'auto' }} role="img">
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={L} x2={W - R} y1={T + (H - T - B) * t} y2={T + (H - T - B) * t} stroke="#eceae5" strokeWidth="1" />
        ))}
        {min < 0 && maks > 0 && (
          <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="#c9c4bc" strokeWidth="1.2" strokeDasharray="3 3" />
        )}
        <path d={sti(serieB)} fill="none" stroke={FARGE_B} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
        <path d={sti(serieA)} fill="none" stroke={FARGE_A} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
        {beA !== null && beA >= 0 && beA < N && <circle cx={x(beA)} cy={y(serieA[beA])} r="4" fill={FARGE_A} stroke="#fff" strokeWidth="1.5" />}
        {beB !== null && beB >= 0 && beB < N && <circle cx={x(beB)} cy={y(serieB[beB])} r="4" fill={FARGE_B} stroke="#fff" strokeWidth="1.5" />}
        {Array.from({ length: N }).map((_, i) => (i % hvert === 0 ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : 'middle'} fontSize="9.5" fill="#b3aca2">{mndKort(ymPluss(startYm, i))}</text>
        ) : null))}
        <text x={L + 2} y={T + 8} fontSize="9.5" fill="#b3aca2">{formatY(maks)}</text>
        <text x={L + 2} y={H - B - 4} fontSize="9.5" fill="#b3aca2">{formatY(min)}</text>
      </svg>
    </div>
  );
}

function ScenarioSammenligning({ plan, fakta, drivere, scenarioer, aktivtScenario, onLukk }) {
  const alternativer = useMemo(() => ([
    { id: 'gjeldende', navn: 'Gjeldende forutsetninger', drivere },
    ...scenarioer.map((sc) => ({ id: sc.id, navn: sc.navn, drivere: sc.drivere })),
  ]), [drivere, scenarioer]);
  // Smart start: gjeldende mot første scenario som IKKE er det aktive settet
  const [idA, setIdA] = useState('gjeldende');
  const [idB, setIdB] = useState(() => {
    const kandidat = scenarioer.find((sc) => sc.id !== aktivtScenario) || scenarioer[0];
    return kandidat ? kandidat.id : 'gjeldende';
  });
  const altA = alternativer.find((a) => a.id === idA) || alternativer[0];
  const altB = alternativer.find((a) => a.id === idB) || alternativer[0];
  const sanA = useMemo(() => rensModellDrivere(altA.drivere), [altA]);
  const sanB = useMemo(() => rensModellDrivere(altB.drivere), [altB]);
  const mA = useMemo(() => beregnInvestorModell({ antallMnd: plan.antallMnd, fakta, drivere: sanA, startYm: plan.startYm }), [plan, fakta, sanA]);
  const mB = useMemo(() => beregnInvestorModell({ antallMnd: plan.antallMnd, fakta, drivere: sanB, startYm: plan.startYm }), [plan, fakta, sanB]);
  const N = plan.antallMnd;
  const akkum = (serie) => serie.reduce((acc, v, i) => { acc.push((acc[i - 1] || 0) + v); return acc; }, []);
  const akkA = useMemo(() => akkum(mA.resultat), [mA]);
  const akkB = useMemo(() => akkum(mB.resultat), [mB]);
  const beA = mA.sammendrag.breakEvenIdx ?? null;
  const beB = mB.sammendrag.breakEvenIdx ?? null;
  const krM = (n) => { const a = Math.abs(n); return a >= 1000000 ? `${kma((n / 1000000).toFixed(1))} mkr` : `${Math.round(n / 1000)} tkr`; };

  // Lås bakgrunnsscroll mens duellen er åpen
  useEffect(() => {
    const forrige = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = forrige; };
  }, []);

  /* KPI-duell: [label, verdiFn, deltaFn, bedreNårB(delta)=>bool|null] */
  const kpi = [
    ['Resultat i perioden', (m) => kr(m.sammendrag.resultat), () => mB.sammendrag.resultat - mA.sammendrag.resultat, (d) => (d === 0 ? null : d > 0)],
    ['Sum inntekter', (m) => kr(m.sammendrag.sumInntekt), () => mB.sammendrag.sumInntekt - mA.sammendrag.sumInntekt, (d) => (d === 0 ? null : d > 0)],
    ['Sum kostnader', (m) => kr(m.sammendrag.sumKost), () => mB.sammendrag.sumKost - mA.sammendrag.sumKost, () => null],
    ['Break-even', (m) => (m.sammendrag.breakEvenIdx !== null && m.sammendrag.breakEvenIdx !== undefined ? stor(mndLang(ymPluss(plan.startYm, m.sammendrag.breakEvenIdx))) : 'Utenfor perioden'),
      () => (beA !== null && beB !== null ? beB - beA : null), (d) => (d === 0 ? null : d < 0), 'mnd'],
    ['Kapitalbehov', (m) => (m.sammendrag.kapitalbehov > 0 ? kr(m.sammendrag.kapitalbehov) : 'Ingen'), () => mB.sammendrag.kapitalbehov - mA.sammendrag.kapitalbehov, (d) => (d === 0 ? null : d < 0)],
    ['Enheter ved slutt', (m) => kr0(m.sammendrag.enheterVedSlutt), () => mB.sammendrag.enheterVedSlutt - mA.sammendrag.enheterVedSlutt, (d) => (d === 0 ? null : d > 0), 'stk'],
    ['Resultat siste måned', (m) => kr(m.resultat[N - 1]), () => mB.resultat[N - 1] - mA.resultat[N - 1], (d) => (d === 0 ? null : d > 0)],
  ];

  /* Driverdiff — kun forutsetninger som faktisk skiller settene */
  const DRIVER_FELT = [
    ['nyePerMnd', 'Nye enheter/mnd (grunntakt)', (v) => kma(v)],
    ['snittleieNye', 'Snittleie nye enheter', kr],
    ['honorarPctNye', 'Honorarsats nye', (v) => `${kma(v)} %`],
    ['oppstartPerEnhet', 'Oppstartshonorar', kr],
    ['aarligChurnPct', 'Årlig churn', (v) => `${kma(v)} %`],
    ['systemPerEnhet', 'Systemkostnad/enhet', kr],
    ['enheterPerAarsverk', 'Enheter per årsverk', (v) => kma(v)],
    ['aarslonn', 'Årslønn per årsverk', kr],
    ['paslagPct', 'Arbeidsgiverpåslag', (v) => `${kma(v)} %`],
    ['mfFast', 'Markedsføring fast/mnd', kr],
    ['provisjonPerNyEnhet', 'Provisjon per ny enhet', kr],
    ['adminFast', 'Administrasjon fast/mnd', kr],
    ['andreFaste', 'Andre faste/mnd', kr],
    ['maalUtnyttelsePct', 'Maks utnyttelse', (v) => `${kma(v)} %`],
  ];
  const vekstTekst = (d) => [`${kma(d.nyePerMnd)}/mnd fra start`, ...(d.vekstplan || []).map((f) => `${kma(f.perMnd)}/mnd fra mnd ${f.fraMnd}`)].join(' → ');
  const diff = [
    ...DRIVER_FELT.filter(([k]) => Number(sanA[k]) !== Number(sanB[k])).map(([k, label, fmt]) => [label, fmt(sanA[k]), fmt(sanB[k])]),
    ...(JSON.stringify(sanA.vekstplan || []) !== JSON.stringify(sanB.vekstplan || []) ? [['Vekstplan (faser)', vekstTekst(sanA), vekstTekst(sanB)]] : []),
    ...(JSON.stringify(sanA.bemanningstrinn || []) !== JSON.stringify(sanB.bemanningstrinn || []) ? [['Bemanningstrapp', `${(sanA.bemanningstrinn || []).length} trinn`, `${(sanB.bemanningstrinn || []).length} trinn`]] : []),
  ];

  /* Årsvis oppsummering */
  const aarGrupper = useMemo(() => {
    const g = new Map();
    for (let i = 0; i < N; i += 1) {
      const aar = ymDeler(ymPluss(plan.startYm, i)).y;
      if (!g.has(aar)) g.set(aar, []);
      g.get(aar).push(i);
    }
    return [...g.entries()];
  }, [plan, N]);

  const velger = (id, settId, farge, testid) => (
    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[12px] bg-white px-3 py-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07)] sm:flex-none sm:min-w-[220px]">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: farge }} />
      <select
        value={id} onChange={(e) => settId(e.target.value)} data-testid={testid}
        className="w-full min-w-0 cursor-pointer bg-transparent text-[13px] font-semibold text-[#1c1917] outline-none"
      >
        {alternativer.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
      </select>
    </label>
  );

  const Delta = ({ d, enhet, bedre }) => {
    if (d === null || d === undefined) return <span className="text-[11px] font-medium text-[#c2beb8]">—</span>;
    const tekst = enhet === 'mnd' ? `${d > 0 ? '+' : ''}${d} mnd` : enhet === 'stk' ? `${d > 0 ? '+' : ''}${kr0(d)}` : `${d > 0 ? '+' : ''}${kr0(d)} kr`;
    const tone = bedre === null ? 'bg-[#f4f2ee] text-[#8f8a82]' : bedre ? 'bg-[#e7f6ef] text-[#0a7d55]' : 'bg-[#fdf0ef] text-[#b3261e]';
    return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{tekst}</span>;
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#f7f6f3]" data-testid="modell-sammenligning">
      {/* Topplinje */}
      <div className="border-b border-black/[0.06] bg-white/85 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <div className="mr-auto min-w-0">
            <p className="text-[15.5px] font-bold text-[#1c1917]" style={heading}>Scenariosammenligning</p>
            <p className="truncate text-[11.5px] text-[#a6a19a]">{plan.navn} · {plan.antallMnd} måneder</p>
          </div>
          <button onClick={onLukk} data-testid="sammenlign-lukk"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4f2ee] text-[#57534e] transition-all hover:bg-[#ece9e3] active:scale-95">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {velger(idA, setIdA, FARGE_A, 'sammenlign-velg-a')}
          <span className="text-[11px] font-bold uppercase tracking-wide text-[#c2beb8]">mot</span>
          {velger(idB, setIdB, FARGE_B, 'sammenlign-velg-b')}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="mx-auto max-w-[1160px] space-y-4">
          {scenarioer.length === 0 && (
            <div className="rounded-[14px] bg-[#fdf3e0] px-4 py-3 text-[12.5px] leading-relaxed text-[#7a5615] shadow-[inset_0_0_0_1px_rgba(154,107,28,0.14)]">
              <span className="font-bold">Tips:</span> Lagre driversettene som navngitte scenarioer («Konservativt», «Ambisiøst») fra scenariomenyen i topplinjen — da får duellen faktisk to ulike sett å sammenligne.
            </div>
          )}

          {/* KPI-duell */}
          <div className="overflow-hidden rounded-[16px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-black/[0.05] bg-[#fbfaf8] px-4 py-2.5 sm:grid sm:px-5">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a6a19a]">Nøkkeltall</span>
              <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold" style={{ color: FARGE_A }}><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: FARGE_A }} /><span className="truncate">{altA.navn}</span></span>
              <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold" style={{ color: FARGE_B }}><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: FARGE_B }} /><span className="truncate">{altB.navn}</span></span>
              <span className="text-right text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a6a19a]">Δ B−A</span>
            </div>
            {kpi.map(([label, verdiFn, deltaFn, bedreFn, enhet], i) => {
              const d = deltaFn();
              return (
                <div key={label} className={i % 2 ? 'bg-[#fbfaf8]/70' : ''}>
                  {/* ≥sm: fire kolonner på én linje */}
                  <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 sm:grid sm:px-5">
                    <span className="truncate text-[12.5px] font-medium text-[#57534e]">{label}</span>
                    <span className="truncate text-[13.5px] font-bold text-[#1c1917]" style={heading}>{verdiFn(mA)}</span>
                    <span className="truncate text-[13.5px] font-bold text-[#1c1917]" style={heading}>{verdiFn(mB)}</span>
                    <span className="text-right"><Delta d={d} enhet={enhet} bedre={d === null ? null : bedreFn(d)} /></span>
                  </div>
                  {/* Mobil: stablet — etikett + Δ øverst, A/B under hverandre m/ fargeprikk */}
                  <div className="px-4 py-2.5 sm:hidden">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[12px] font-semibold text-[#57534e]">{label}</span>
                      <Delta d={d} enhet={enhet} bedre={d === null ? null : bedreFn(d)} />
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <span className="flex min-w-0 items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: FARGE_A }} /><span className="truncate text-[13px] font-bold text-[#1c1917]" style={heading}>{verdiFn(mA)}</span></span>
                      <span className="flex min-w-0 items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: FARGE_B }} /><span className="truncate text-[13px] font-bold text-[#1c1917]" style={heading}>{verdiFn(mB)}</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grafer */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[16px] bg-white px-4 py-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] sm:px-5">
              <SammenligningsGraf serieA={akkA} serieB={akkB} startYm={plan.startYm} tittel="Akkumulert resultat — prikk = break-even" formatY={krM} beA={beA} beB={beB} />
            </div>
            <div className="rounded-[16px] bg-white px-4 py-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] sm:px-5">
              <SammenligningsGraf serieA={mA.enheter} serieB={mB.enheter} startYm={plan.startYm} tittel="Enheter under forvaltning" formatY={(v) => kr0(v)} beA={null} beB={null} />
            </div>
          </div>

          {/* Hva skiller settene */}
          <div className="rounded-[16px] bg-white px-4 py-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] sm:px-5" data-testid="sammenlign-diff">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a6a19a]">Forutsetninger som skiller settene</p>
            {diff.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-[#8f8a82]">Settene er identiske — velg to ulike scenarioer for å se forskjellene.</p>
            ) : (
              <div className="mt-2 divide-y divide-black/[0.04]">
                {diff.map(([label, a, b]) => (
                  <div key={label} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-x-3 py-2">
                    <span className="truncate text-[12.5px] font-medium text-[#57534e]">{label}</span>
                    <span className="min-w-0 break-words text-[12.5px] font-bold" style={{ color: FARGE_A }}>{a}</span>
                    <span className="min-w-0 break-words text-[12.5px] font-bold" style={{ color: FARGE_B }}>{b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Årsvis */}
          <div className="overflow-x-auto rounded-[16px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <table className="w-full min-w-[640px] text-[12.5px]">
              <thead>
                <tr className="border-b border-black/[0.05] bg-[#fbfaf8] text-left">
                  <th className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a6a19a] sm:px-5">År</th>
                  <th className="px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-[0.09em]" style={{ color: FARGE_A }}>Inntekter A</th>
                  <th className="px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-[0.09em]" style={{ color: FARGE_B }}>Inntekter B</th>
                  <th className="px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-[0.09em]" style={{ color: FARGE_A }}>Resultat A</th>
                  <th className="px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-[0.09em]" style={{ color: FARGE_B }}>Resultat B</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a6a19a] sm:px-5">Δ resultat</th>
                </tr>
              </thead>
              <tbody>
                {aarGrupper.map(([aar, idx], i) => {
                  const sumI = (m) => idx.reduce((a, ix) => a + m.inntekt[ix], 0);
                  const sumR = (m) => idx.reduce((a, ix) => a + m.resultat[ix], 0);
                  const dr = sumR(mB) - sumR(mA);
                  return (
                    <tr key={aar} className={i % 2 ? 'bg-[#fbfaf8]/70' : ''}>
                      <td className="px-4 py-2.5 font-bold text-[#1c1917] sm:px-5">{aar}</td>
                      <td className="px-3 py-2.5 text-right">{kr(sumI(mA))}</td>
                      <td className="px-3 py-2.5 text-right">{kr(sumI(mB))}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${sumR(mA) >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{kr(sumR(mA))}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${sumR(mB) >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{kr(sumR(mB))}</td>
                      <td className="px-4 py-2.5 text-right sm:px-5"><Delta d={dr} bedre={dr === 0 ? null : dr > 0} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="pb-2 text-center text-[10.5px] text-[#c2beb8]">Δ-kolonnen viser B minus A — grønt betyr at B kommer bedre ut (tidligere break-even, lavere kapitalbehov, høyere resultat).</p>
        </div>
      </div>
    </div>
  );
}

export default function BudsjettModell({ plan, api, apiKey = '', readOnly = false, onTilbake, onEndret }) {
  const [navn, setNavn] = useState(plan.navn);
  const [status, setStatus] = useState(plan.status || 'utkast');
  const [investorSynlig, setInvestorSynlig] = useState(Boolean(plan.investorSynlig));
  const [drivere, setDrivere] = useState(() => ({ ...rensModellDrivere(plan.drivere) }));
  const [lagretDrivere, setLagretDrivere] = useState(() => rensModellDrivere(plan.drivere));
  const [fakta, setFakta] = useState(plan.fakta || { eksisterende: [], enheter: [], oppdatertAt: null });
  // Horisont kan endres lokalt (utvid 12 → 24/36 mnd) — persisteres først ved
  // «Lagre». lagret*-speilene gjør at «Tilbakestill» ruller tilbake korrekt
  // også etter en mellomlagring (plan-prop'en er da foreldet).
  const [antallMnd, setAntallMnd] = useState(plan.antallMnd);
  const [lagretAntallMnd, setLagretAntallMnd] = useState(plan.antallMnd);
  const [lagretFakta, setLagretFakta] = useState(plan.fakta || { eksisterende: [], enheter: [], oppdatertAt: null });
  const [aapne, setAapne] = useState({ portefolje: true, unit: false, salg: false, org: false, faste: false, aarlig: false });
  const [railAapen, setRailAapen] = useState(true);
  // Under xl er panelet et bunn-ark som dekker innholdet — start derfor lukket
  // på mobil/nettbrett, så tallene er det første man ser.
  useEffect(() => {
    try { if (typeof window !== 'undefined' && window.innerWidth < 1280) setRailAapen(false); } catch (e) {}
  }, []);
  const [skittent, setSkittent] = useState(false);
  // Navngitte scenariosett: lagrede driversett («Konservativt» osv.) på planen.
  // Å velge et scenario laster driverne inn i editoren — «Lagre» i topplinjen
  // gjør dem til budsjettets gjeldende forutsetninger.
  const [scenarioer, setScenarioer] = useState(() => (Array.isArray(plan.scenarioer) ? plan.scenarioer : []));
  const [aktivtScenario, setAktivtScenario] = useState(null);
  const [nyScenarioNavn, setNyScenarioNavn] = useState(null); // null = lukket
  const [scenarioMenyAapen, setScenarioMenyAapen] = useState(false); // scenario-dropdown i topplinjen

  /* ── Omvisning (modell-editoren): auto-start første gang en investormodell
        åpnes; «?» i topplinjen åpner den igjen. Nøktern, presis tone. ── */
  const [tourAktiv, setTourAktiv] = useState(false);
  const [eksporterer, setEksporterer] = useState(false);
  const [eksportererPdf, setEksportererPdf] = useState(false);
  const [visSammenlign, setVisSammenlign] = useState(false);

  /* Felles nedlaster for eksportformatene */
  const lastNedEksport = async (format, fallbackNavn, settBusy) => {
    settBusy(true);
    try {
      const r = await fetch(`/api/admin/budsjett/plan/${format}?id=${encodeURIComponent(plan.id)}&key=${encodeURIComponent(apiKey)}`);
      if (!r.ok) throw new Error('Eksporten feilet');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = r.headers.get('Content-Disposition') || '';
      const mNavn = cd.match(/filename="([^"]+)"/);
      a.download = (mNavn && mNavn[1]) || fallbackNavn;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) { setFeil(`Kunne ikke eksportere til ${format === 'pdf' ? 'PDF' : 'Excel'} — prøv igjen`); }
    finally { settBusy(false); }
  };

  /* Excel-eksport — laster ned investorklar arbeidsbok (levende formler) */
  const eksporterExcel = async () => {
    if (eksporterer) return;
    await lastNedEksport('xlsx', 'digihome-vekstbudsjett.xlsx', setEksporterer);
  };
  /* PDF-rapport — investorklart dokument med forside, KPI-er og grafer */
  const eksporterPdf = async () => {
    if (eksportererPdf) return;
    await lastNedEksport('pdf', 'digihome-vekstbudsjett.pdf', setEksportererPdf);
  };
  const tourStartetRef = useRef(false);
  const tourSteg = [
    {
      id: 'nokkeltall',
      tittel: 'Nøkkeltallene',
      tekst: 'Resultat i perioden, siste måned, break-even og kapitalbehov — beregnes løpende fra forutsetningene.',
      maal: () => document.querySelector('[data-testid="modell-nokkeltall"]'),
    },
    {
      id: 'drivere',
      tittel: 'Forutsetninger',
      tekst: 'Modellens antakelser i fire grupper: portefølje & vekst, unit economics, organisasjon og faste kostnader. Endringer beregnes umiddelbart — «Lagre» gjør dem gjeldende.',
      foer: async () => setRailAapen(true),
      maal: () => document.querySelector('[data-testid="modell-drivere"]'),
    },
    {
      id: 'scenarioer',
      tittel: 'Scenariosett',
      tekst: 'Lagre driversettene som navngitte scenarioer («Konservativt», «Ambisiøst») og bytt mellom dem her i topplinjen. Det aktive settet blir budsjettets forutsetninger når du lagrer.',
      maal: () => document.querySelector('[data-testid="modell-scenariovalg"]'),
    },
    {
      id: 'vekst',
      tittel: 'Vekstplan',
      tekst: 'Veksten trenger ikke være flat: legg inn faser («2 per måned fra juli») i eget panel. Scenarioene lagrer hele vekstplanen, og bemanningens enhetsterskler følger veksten automatisk.',
      foer: async () => setAapne((a) => ({ ...a, portefolje: true })),
      maal: () => document.querySelector('[data-testid="modell-vekst-aapne"]'),
    },
    {
      id: 'bemanning',
      tittel: 'Bemanningsplan',
      tekst: 'Hendelsesbaserte bemanningstrinn — utløst av enhetsterskel eller dato — redigeres i eget panel. Modellen varsler i hovedflaten når kapasiteten nærmer seg taket.',
      foer: async () => setAapne((a) => ({ ...a, org: true })),
      maal: () => document.querySelector('[data-testid="modell-bemanning-aapne"]'),
    },
    {
      id: 'graf',
      tittel: 'Veien til break-even',
      tekst: 'Inntekter og kostnader som linjer — skjæringspunktet er break-even. Hold musepekeren over grafen for månedstall.',
      maal: () => document.querySelector('[data-testid="modell-graf"]'),
    },
    {
      id: 'matrise',
      tittel: 'Resultatoppstillingen',
      tekst: 'Måneder eller kvartaler som kolonner og resultatlinjene som rader — med akkumulert resultat og kapitalbehov nederst.',
      maal: () => document.querySelector('[data-testid="modell-matrise"]'),
    },
    {
      id: 'unit',
      tittel: 'Unit economics',
      tekst: 'Sammendraget av hva én ny enhet er verdt — bidrag før og etter normalisert bemanning, payback og LTV/CAC. Full analyse ligger på Enhetsøkonomi-siden.',
      maal: () => document.querySelector('[data-testid="modell-cac"]'),
    },
    {
      id: 'deling',
      tittel: 'Deling med investorrommet',
      tekst: '«Del» samler investorrommet, det levende decket og eksport til Excel/PDF. Investorene ser tallene skrivebeskyttet — de kan ikke endre dem.',
      maal: () => document.querySelector('[data-testid="modell-del"]'),
    },
  ];
  const tourFerdig = useCallback(() => {
    setTourAktiv(false);
    try { localStorage.setItem('dh-omvisning-budsjettmodell', '1'); } catch (e) {}
    if (apiKey) {
      fetch(`/api/admin/auth/profile?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourSett: 'budsjettmodell' }),
      }).catch(() => {});
    }
  }, [apiKey]);
  useEffect(() => {
    if (tourStartetRef.current) return undefined;
    if (typeof window === 'undefined' || window.innerWidth < 1024) return undefined;
    try { if (localStorage.getItem('dh-omvisning-budsjettmodell')) return undefined; } catch (e) {}
    // Ref settes først når timeren FYRER — StrictMode-sikkert (se BudsjettEnkel).
    const t = setTimeout(() => { tourStartetRef.current = true; setTourAktiv(true); }, 900);
    return () => clearTimeout(t);
  }, []);
  const [lagrer, setLagrer] = useState(false);
  const [lagret, setLagret] = useState(false);
  const [feil, setFeil] = useState('');
  const [henterFakta, setHenterFakta] = useState(false);
  const [endrerHorisont, setEndrerHorisont] = useState(0);
  const [visning, setVisning] = useState(plan.antallMnd > 12 ? 'teleskop' : 'mnd');
  // Segment: 'forvaltning' (denne motoren) | 'konsern' (plattform + felles + konsolidert)
  const [segment, setSegment] = useState('forvaltning');

  const m = useMemo(
    () => beregnInvestorModell({ antallMnd, fakta, drivere, startYm: plan.startYm }),
    [antallMnd, plan.startYm, fakta, drivere],
  );
  const sanert = m.drivere;
  const s = m.sammendrag;

  const veksle = (id) => setAapne((a) => ({ ...a, [id]: !a[id] }));
  const settDriver = (k, v) => { setDrivere((d) => ({ ...d, [k]: v })); setSkittent(true); };
  // Bemanningsplanen redigeres i egen drawer (utkast → «Bruk bemanningsplan»)
  const [bemAapen, setBemAapen] = useState(false);
  const brukBemanningsplan = (utkast) => {
    setDrivere((d) => ({ ...d, ...utkast }));
    setSkittent(true);
    setBemAapen(false);
  };
  // Vekstplanen (faser med konstant takt) redigeres i egen drawer
  const [vekstAapen, setVekstAapen] = useState(false);
  const brukVekstplan = (utkast) => {
    setDrivere((d) => ({ ...d, nyePerMnd: utkast.nyePerMnd, vekstplan: utkast.vekstplan }));
    setSkittent(true);
    setVekstAapen(false);
  };
  const tilbakestill = () => {
    setDrivere({ ...lagretDrivere });
    setAntallMnd(lagretAntallMnd);
    setFakta(lagretFakta);
    setSkittent(false);
  };

  const lagre = useCallback(async (overstyr = {}) => {
    if (lagrer) return;
    setLagrer(true); setFeil('');
    try {
      await api('plan', {
        method: 'PUT',
        body: {
          id: plan.id, type: 'modell',
          navn: (overstyr.navn ?? navn) || 'Budsjett',
          startYm: plan.startYm, antallMnd,
          status: overstyr.status ?? status, notat: plan.notat || '',
          investorSynlig: overstyr.investorSynlig ?? investorSynlig,
          drivere: overstyr.drivere ?? drivere,
          fakta: overstyr.fakta ?? fakta,
          scenarioer: overstyr.scenarioer ?? scenarioer,
        },
      });
      if (overstyr.stille) {
        // Scenario-operasjon: planens basis er urørt — ikke nullstill editoren.
        setLagret(true); setTimeout(() => setLagret(false), 1500);
      } else {
        setLagretDrivere(rensModellDrivere(overstyr.drivere ?? drivere));
        setLagretAntallMnd(antallMnd);
        setLagretFakta(overstyr.fakta ?? fakta);
        setSkittent(false); setLagret(true); setTimeout(() => setLagret(false), 1800);
      }
      onEndret?.();
    } catch (e) { setFeil(e.message); }
    setLagrer(false);
  }, [api, plan, navn, status, investorSynlig, drivere, fakta, scenarioer, lagrer, onEndret, antallMnd]);

  /* ── Scenariohandlinger ── */
  const velgScenario = (sc) => {
    if (!sc) {
      setDrivere({ ...lagretDrivere });
      setAktivtScenario(null);
      setSkittent(false);
      return;
    }
    setDrivere({ ...rensModellDrivere(sc.drivere) });
    setAktivtScenario(sc.id);
    setSkittent(true);
  };
  const lagreSomScenario = async () => {
    const navnSc = String(nyScenarioNavn || '').trim().slice(0, 40);
    if (!navnSc) return;
    const sc = { id: `sc-${Date.now()}`, navn: navnSc, drivere: rensModellDrivere(drivere), opprettetAt: new Date().toISOString() };
    const ny = [...scenarioer, sc];
    setScenarioer(ny);
    setNyScenarioNavn(null);
    setAktivtScenario(sc.id);
    await lagre({ scenarioer: ny, drivere: lagretDrivere, stille: true });
  };
  const oppdaterScenario = async () => {
    const ny = scenarioer.map((s) => (s.id === aktivtScenario ? { ...s, drivere: rensModellDrivere(drivere) } : s));
    setScenarioer(ny);
    await lagre({ scenarioer: ny, drivere: lagretDrivere, stille: true });
  };
  const slettScenario = async (id) => {
    const ny = scenarioer.filter((s) => s.id !== id);
    setScenarioer(ny);
    if (aktivtScenario === id) velgScenario(null);
    await lagre({ scenarioer: ny, drivere: lagretDrivere, stille: true });
  };

  const oppdaterFakta = async () => {
    if (henterFakta) return;
    setHenterFakta(true); setFeil('');
    try {
      const f = await api(`plan/forslag?startYm=${plan.startYm}&antallMnd=${antallMnd}`);
      setFakta({
        eksisterende: (f.sikret || []).map((x) => Math.max(0, Math.round(Number(x) || 0))),
        enheter: (f.enheterSerie || []).map((x) => Math.max(0, Math.round(Number(x) || 0))),
        bortfall: (f.bortfall || []).map((x) => Math.max(0, Math.round(Number(x) || 0))),
        oppdatertAt: new Date().toISOString(),
      });
      setSkittent(true);
    } catch (e) { setFeil(e.message); }
    setHenterFakta(false);
  };

  /* ── Endre horisont: utvid (eller krymp) planen til 12/24/36 mnd.
        Henter FRISKE porteføljefakta for hele den nye horisonten — utvidelsen
        står på ekte kontraktstall, ikke padding. Persisteres først ved «Lagre». ── */
  const endreHorisont = async (ny) => {
    if (ny === antallMnd || endrerHorisont || readOnly) return;
    setEndrerHorisont(ny); setFeil('');
    try {
      const f = await api(`plan/forslag?startYm=${plan.startYm}&antallMnd=${ny}`);
      setFakta({
        eksisterende: (f.sikret || []).map((x) => Math.max(0, Math.round(Number(x) || 0))),
        enheter: (f.enheterSerie || []).map((x) => Math.max(0, Math.round(Number(x) || 0))),
        bortfall: (f.bortfall || []).map((x) => Math.max(0, Math.round(Number(x) || 0))),
        oppdatertAt: new Date().toISOString(),
      });
      setAntallMnd(ny);
      setVisning(ny > 12 ? 'teleskop' : 'mnd');
      setSkittent(true);
    } catch (e) { setFeil(e.message); }
    setEndrerHorisont(0);
  };

  const slett = async () => {
    try { await api(`plan?id=${encodeURIComponent(plan.id)}`, { method: 'DELETE' }); onTilbake?.(true); }
    catch (e) { setFeil(e.message); }
  };

  /* ── Break-even-analyse med ekstrapolering: kjører motoren videre til 36 mnd
        (porteføljefakta holdes flat) hvis break-even ikke nås i perioden ── */
  const be = useMemo(() => {
    if (s.breakEvenIdx !== null) {
      const kap = -Math.min(...m.akkumulert.slice(0, s.breakEvenIdx + 1), 0);
      return { idx: s.breakEvenIdx, enheter: Math.round(m.enheter[s.breakEvenIdx]), kapital: Math.round(kap), utenfor: false };
    }
    if (antallMnd >= 36) return { ingen: true };
    const m2 = beregnInvestorModell({ antallMnd: 36, fakta: utvidFakta(fakta, 36), drivere: sanert, startYm: plan.startYm });
    const idx = m2.sammendrag.breakEvenIdx;
    if (idx === null) return { ingen: true };
    const kap = -Math.min(...m2.akkumulert.slice(0, idx + 1), 0);
    return { idx, enheter: Math.round(m2.enheter[idx]), kapital: Math.round(kap), utenfor: true };
  }, [m, s, fakta, sanert, antallMnd, plan.startYm]);

  /* ── Scenarioanalyse: Konservativ / Basis / Ambisiøs — beregnet på 36 mnd horisont ── */
  const autoScenarioer = useMemo(() => {
    const fk36 = utvidFakta(fakta, 36);
    const lag = (navn, endr) => {
      const d2 = { ...sanert, ...endr };
      const mm = beregnInvestorModell({ antallMnd: 36, fakta: fk36, drivere: d2, startYm: plan.startYm });
      const idx = mm.sammendrag.breakEvenIdx;
      const kap = idx === null ? -Math.min(...mm.akkumulert, 0) : -Math.min(...mm.akkumulert.slice(0, idx + 1), 0);
      return { navn, d: d2, idx, kap: Math.round(kap) };
    };
    return [
      lag('Konservativ', { ...skalerVekst(sanert, 0.5), aarligChurnPct: Math.min(100, sanert.aarligChurnPct + 5), honorarPctNye: Math.max(0, sanert.honorarPctNye - 1) }),
      lag('Basis', {}),
      lag('Ambisiøs', { ...skalerVekst(sanert, 2), aarligChurnPct: Math.max(0, sanert.aarligChurnPct - 3) }),
    ];
  }, [sanert, fakta]);

  /* ── Utvidet unit economics: margin, levetid fra churn, LTV, LTV/CAC —
        + normalisert bemanning (fullkost ÷ kapasitet ÷ 12) for «etter»-bildet.
        Full analyse bor på Enhetsøkonomi-siden — dette er sammendraget. ── */
  const unit = useMemo(() => {
    const mChurn = 1 - Math.pow(1 - sanert.aarligChurnPct / 100, 1 / 12);
    const levetidMnd = mChurn > 0 ? 1 / mChurn : null;
    const ltv = levetidMnd !== null ? Math.round(m.cac.bidrag * levetidMnd) : null;
    const bemPerEnhet = Math.round((sanert.aarslonn * (1 + sanert.paslagPct / 100)) / sanert.enheterPerAarsverk / 12);
    const bidragEtter = m.cac.bidrag - bemPerEnhet;
    const cacFull = m.cac.fullCac ?? m.cac.provisjon;
    return {
      margin: m.cac.bruttoHonorarNy > 0 ? Math.round((m.cac.bidrag / m.cac.bruttoHonorarNy) * 100) : null,
      levetidAar: levetidMnd !== null ? Math.round((levetidMnd / 12) * 10) / 10 : null,
      ltv,
      ltvCac: ltv !== null && cacFull > 0 ? Math.round((ltv / cacFull) * 10) / 10 : null,
      bemPerEnhet,
      bidragEtter,
      marginEtter: m.cac.bruttoHonorarNy > 0 ? Math.round((bidragEtter / m.cac.bruttoHonorarNy) * 100) : null,
      paybackEtter: bidragEtter > 0 && cacFull > 0 ? Math.round((cacFull / bidragEtter) * 10) / 10 : null,
    };
  }, [m.cac, sanert.aarligChurnPct, sanert.aarslonn, sanert.paslagPct, sanert.enheterPerAarsverk]);

  /* ── Matrise: perioder som kolonner ──
     Teleskop (standard for flerårsplaner — investorstandard): år 1 måned for
     måned (der innsikten er størst), år 2 kvartalsvis, år 3+ årlig. ── */
  const perioder = useMemo(() => {
    const mndKol = (i) => ({ label: stor(mndKort(ymPluss(plan.startYm, i))), idx: [i] });
    const grupper = (fra, til, type) => {
      const ut = [];
      for (let i = fra; i <= til; i++) {
        const { y, m: mm } = ymDeler(ymPluss(plan.startYm, i));
        const key = type === 'kvartal' ? `Q${Math.floor((mm - 1) / 3) + 1} ${String(y).slice(2)}` : String(y);
        const siste = ut[ut.length - 1];
        if (siste && siste.label === key) siste.idx.push(i); else ut.push({ label: key, idx: [i] });
      }
      return ut;
    };
    if (visning === 'mnd') return Array.from({ length: m.N }, (_, i) => mndKol(i));
    if (visning === 'kvartal') return grupper(0, m.N - 1, 'kvartal');
    if (visning === 'aar') return grupper(0, m.N - 1, 'aar');
    // teleskop
    const ut = Array.from({ length: Math.min(12, m.N) }, (_, i) => mndKol(i));
    if (m.N > 12) ut.push(...grupper(12, Math.min(24, m.N) - 1, 'kvartal'));
    if (m.N > 24) ut.push(...grupper(24, m.N - 1, 'aar'));
    return ut;
  }, [visning, m.N, plan.startYm]);

  const flyt = (serie, idx) => idx.reduce((sum, i) => sum + (serie[i] || 0), 0);
  const beholdning = (serie, idx) => serie[idx[idx.length - 1]] || 0;

  const matriseRader = useMemo(() => {
    const alleNull = (serie) => serie.every((v) => !v);
    const r = [];
    r.push({ label: 'Enheter under forvaltning', serie: m.enheter, type: 'stock', info: true, fmt: (v) => String(Math.round(v)) });
    r.push({ header: 'Inntekter' });
    r.push({ label: 'Portefølje (kontraktsfestet)', serie: m.eksisterende });
    if ((m.sammendrag.sumReutleie || 0) > 0) r.push({ label: 'Forventet re-utleie', serie: m.reutleie, gronn: true });
    r.push({ label: 'Modellert vekst', serie: m.vekst, lilla: true });
    if (!alleNull(m.oppstart)) r.push({ label: 'Oppstartshonorar', serie: m.oppstart, lilla: true });
    r.push({ label: 'Sum inntekter', serie: m.inntekt, sum: true });
    r.push({ header: 'Kostnader' });
    r.push({ label: 'System', serie: m.kost.system });
    r.push({ label: 'Bemanning', serie: m.kost.bemanning });
    r.push({ label: 'Bemanning, budsjettert %', serie: m.budsjettertPct, type: 'stock', info: true, fmt: (v) => `${v} %` });
    if (!alleNull(m.kost.mfFast)) r.push({ label: 'Fast markedsføring', serie: m.kost.mfFast });
    if (!alleNull(m.kost.provisjon)) r.push({ label: 'Salgsprovisjon (CAC)', serie: m.kost.provisjon });
    if (!alleNull(m.kost.partner || [])) r.push({ label: 'Performance-partner', serie: m.kost.partner });
    if (!alleNull(m.kost.admin)) r.push({ label: 'Administrasjon', serie: m.kost.admin });
    if (!alleNull(m.kost.andre)) r.push({ label: 'Andre faste', serie: m.kost.andre });
    r.push({ label: 'Sum kostnader', serie: m.kostSum, sum: true });
    r.push({ label: 'Resultat', serie: m.resultat, resultat: true });
    r.push({ label: 'Akkumulert resultat', serie: m.akkumulert, type: 'stock', akk: true });
    return r;
  }, [m]);

  const fullkost = Math.round(sanert.aarslonn * (1 + sanert.paslagPct / 100));
  const sisteIdx = m.N - 1;
  const antallEndret = ['nyePerMnd', 'aarligChurnPct', 'snittleieNye', 'honorarPctNye', 'oppstartPerEnhet', 'systemPerEnhet', 'enheterPerAarsverk', 'aarslonn', 'paslagPct', 'mfFast', 'provisjonPerNyEnhet', 'adminFast', 'andreFaste', 'indeksPct', 'lonnsvekstPct', 'kostInflasjonPct']
    .filter((k) => Math.abs((sanert[k] ?? 0) - (lagretDrivere[k] ?? 0)) > 1e-9).length
    + (JSON.stringify(sanert.vekstplan || []) !== JSON.stringify(lagretDrivere.vekstplan || []) ? 1 : 0)
    + (JSON.stringify(sanert.partner || {}) !== JSON.stringify(lagretDrivere.partner || {}) ? 1 : 0);

  // Bemanning: nå-situasjon (rail-sammendrag) + flaskehals-innsikt (hovedflaten)
  const pctNaa = m.budsjettertPct[0] || 0;
  const kapNaa = Math.round((pctNaa / 100) * sanert.enheterPerAarsverk);
  const varselIdx = m.sammendrag.bemanningsVarselIdx;
  const kapVedVarsel = varselIdx !== null ? Math.round(((m.budsjettertPct[varselIdx] || 0) / 100) * sanert.enheterPerAarsverk) : null;
  // Vekstplan: siste fases takt (til rail-sammendraget)
  const vekstSiste = sanert.vekstplan.length ? sanert.vekstplan[sanert.vekstplan.length - 1].perMnd : sanert.nyePerMnd;

  const breakEvenVerdi = be.ingen ? 'Nås ikke innen 36 mnd' : stor(mndLang(ymPluss(plan.startYm, be.idx)));
  const breakEvenUnder = be.ingen ? 'juster drivere eller forleng perioden' : `ved ~${be.enheter} enheter${be.utenfor ? ' · utenfor perioden' : ''}`;

  const feltProps = { drivere, sanert, lagret: lagretDrivere, onEndre: settDriver, readOnly };

  const Stat = ({ tittel, verdi, under, farge, testid, hoyre }) => (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-[14px] bg-white px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
      <div className="min-w-0">
        <p className="truncate text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">{tittel}</p>
        <p className={`mt-0.5 truncate text-[length:clamp(17px,1.35vw,23px)] font-bold tracking-[-0.015em] ${farge || 'text-[#1c1917]'}`} style={heading} data-testid={testid}>{verdi}</p>
        {under && <p className="truncate text-[11px] text-[#a6a19a]">{under}</p>}
      </div>
      {hoyre && <span className="hidden shrink-0 md:block">{hoyre}</span>}
    </div>
  );

  return (
    <div className="w-full" data-testid="modell-editor">
      {/* Topplinje — én linje: identitet til venstre, handlinger gruppert til høyre */}
      <ModellTopplinje
        selskap="digihome" testPrefix="modell"
        navn={navn} onNavn={(v) => { setNavn(v); setSkittent(true); }} readOnly={readOnly} onTilbake={onTilbake}
        startYm={plan.startYm} antallMnd={antallMnd} onHorisont={endreHorisont} horisontBusy={endrerHorisont}
        horisontHint="Porteføljefakta hentes på nytt fra leieforholdene for hele den nye perioden. Lagres først når du trykker Lagre."
        status={status} onStatus={(v) => { setStatus(v); lagre({ status: v }); }}
        investorSynlig={investorSynlig} onInvestorSynlig={(v) => { setInvestorSynlig(v); lagre({ investorSynlig: v }); }}
        delValg={[
          { id: 'deck', ikon: Presentation, label: 'Åpne investordeck', under: 'Levende deck for denne planen (presenter-modus)', href: `/investor/deck?plan=${encodeURIComponent(plan.id)}`, testid: 'modell-deck' },
          { id: 'xlsx', ikon: FileSpreadsheet, ikonFarge: 'text-[#15803d]', label: 'Last ned Excel', under: 'Arbeidsbok med levende formler', onClick: eksporterExcel, busy: eksporterer, testid: 'modell-excel-eksport' },
          { id: 'pdf', ikon: FileText, ikonFarge: 'text-[#b91c1c]', label: 'Last ned PDF', under: 'Investorklar rapport med nøkkeltall og grafer', onClick: eksporterPdf, busy: eksportererPdf, testid: 'modell-pdf-eksport' },
        ]}
        merValg={[
          { id: 'tour', ikon: HelpCircle, label: 'Omvisning', under: 'Se hvordan modellen henger sammen', onClick: () => setTourAktiv(true), testid: 'modell-tour-knapp' },
        ]}
        onSlett={slett}
        skittent={skittent} lagrer={lagrer} lagret={lagret} onLagre={() => lagre()}
        feil={feil}
        venstreEkstra={plan.plattform ? (
          <span className="hidden shrink-0 items-center gap-0.5 rounded-full bg-[#f0efec] p-0.5 lg:flex" data-testid="modell-segment">
            {[['forvaltning', 'Forvaltning'], ['konsern', 'Eldre konsern-lag']].map(([v, l]) => (
              <button key={v} onClick={() => setSegment(v)} data-testid={`modell-segment-${v}`}
                className={`h-7 rounded-full px-3 text-[11.5px] font-bold transition-all ${segment === v ? 'bg-[#1c1917] text-white' : 'text-[#8f8a82] hover:text-[#1c1917]'}`}>{l}</button>
            ))}
          </span>
        ) : null}
      >
          {/* Forutsetningssett — velg scenario direkte fra topplinjen */}
          <div className="relative" data-testid="modell-scenariovalg">
            <button onClick={() => { setScenarioMenyAapen((v) => !v); setNyScenarioNavn(null); }} data-testid="modell-scenario-meny"
              title="Velg forutsetningssett (scenario)"
              className={`${aktivtScenario ? PILL_LILLA : PILL} max-w-[210px]`}>
              <Bookmark className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden truncate sm:block">{aktivtScenario ? (scenarioer.find((sc) => sc.id === aktivtScenario)?.navn || 'Scenario') : 'Basis'}</span>
              <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-200 ${scenarioMenyAapen ? 'rotate-180' : ''} ${aktivtScenario ? 'text-[#a78bfa]' : 'text-[#c2beb8]'}`} />
            </button>
            {scenarioMenyAapen && (
              <>
                <div className="fixed inset-0 z-[59]" onClick={() => { setScenarioMenyAapen(false); setNyScenarioNavn(null); }} />
                <div className="absolute right-0 top-11 z-[60] w-[280px] rounded-[16px] bg-white p-1.5 shadow-[0_16px_48px_rgba(20,17,14,0.16)] ring-1 ring-black/[0.06]" data-testid="modell-scenario-menyliste">
                  <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">Forutsetningssett</p>
                  <button onClick={() => { velgScenario(null); setScenarioMenyAapen(false); }} data-testid="modell-scenario-basis"
                    className="flex w-full items-center justify-between gap-2 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-[#f7f6f3]">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#1c1917]">Basis</span>
                      <span className="block text-[11px] text-[#a6a19a]">Budsjettets lagrede forutsetninger</span>
                    </span>
                    {!aktivtScenario && <Check className="h-3.5 w-3.5 shrink-0 text-[#6d28d9]" />}
                  </button>
                  {scenarioer.map((sc) => (
                    <div key={sc.id} className="group/sc flex items-center rounded-[10px] transition-colors hover:bg-[#f7f6f3]">
                      <button onClick={() => { velgScenario(sc); setScenarioMenyAapen(false); }} data-testid={`modell-scenario-${sc.id}`}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 py-2 text-left">
                        <span className="block truncate text-[13px] font-semibold text-[#1c1917]">{sc.navn}</span>
                        {aktivtScenario === sc.id && <Check className="h-3.5 w-3.5 shrink-0 text-[#6d28d9]" />}
                      </button>
                      {!readOnly && (
                        <button onClick={() => slettScenario(sc.id)} title={`Slett scenarioet «${sc.navn}»`}
                          className="mr-1.5 hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#c2beb8] hover:bg-[#f6dedd] hover:text-[#c2413b] group-hover/sc:flex">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!readOnly && (
                    <>
                      <div className="mx-1.5 my-1 border-t border-black/[0.06]" />
                      {nyScenarioNavn === null ? (
                        <button onClick={() => setNyScenarioNavn('')} data-testid="modell-scenario-nytt" disabled={scenarioer.length >= 12}
                          className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#6d28d9] transition-colors hover:bg-[#f6f2fd] disabled:opacity-40">
                          <Plus className="h-3.5 w-3.5" /> Lagre gjeldende som scenario…
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 px-1.5 py-1">
                          <input autoFocus value={nyScenarioNavn} onChange={(e) => setNyScenarioNavn(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') lagreSomScenario(); if (e.key === 'Escape') setNyScenarioNavn(null); }}
                            placeholder="F.eks. Konservativt" data-testid="modell-scenario-navn"
                            className="h-8 min-w-0 flex-1 rounded-[9px] bg-[#f5f4f1] px-2.5 text-[12.5px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent placeholder:font-normal placeholder:text-[#c2beb8] focus:bg-white focus:ring-[#6d28d9]/40" />
                          <button onClick={lagreSomScenario} disabled={!String(nyScenarioNavn).trim()} data-testid="modell-scenario-lagre"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#6d28d9] text-white transition-colors hover:bg-[#5b21b6] disabled:opacity-30">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setNyScenarioNavn(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[#a6a19a] hover:bg-black/[0.05]">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {/* Scenariosammenligning — A/B-duell mellom driversett, bor hos scenarioene */}
                  <div className="mx-1.5 my-1 border-t border-black/[0.06]" />
                  <button onClick={() => { setScenarioMenyAapen(false); setVisSammenlign(true); }} data-testid="modell-sammenlign-knapp"
                    title="Sammenlign to scenarioer side ved side — resultat, break-even, kapitalbehov og drivere"
                    className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-[#f7f6f3]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-[#f5f4f1]"><ArrowLeftRight className="h-3.5 w-3.5 text-[#7c3aed]" /></span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#1c1917]">Sammenlign scenarioer</span>
                      <span className="block text-[11px] text-[#a6a19a]">Side ved side — resultat, break-even, kapitalbehov</span>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Vis/skjul forutsetninger (kun forvaltningsvisningen) */}
          {segment === 'forvaltning' && <button onClick={() => setRailAapen(!railAapen)} data-testid={railAapen ? 'modell-rail-skjul' : 'modell-rail-vis'}
            title={railAapen ? 'Skjul forutsetninger — mer plass til tallene' : 'Vis forutsetninger'}
            className={`relative ${railAapen ? PILL_AKTIV : PILL}`}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Forutsetninger</span>
            {!railAapen && antallEndret > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#6d28d9] ring-2 ring-[#f7f6f3]" />}
          </button>}
      </ModellTopplinje>

      {/* Konsern: plattform + felles + konsolidert — egen cockpit, samme plan */}
      {segment === 'konsern' ? (
        <KonsernModell plan={plan} drivere={drivere} fakta={fakta} antallMnd={antallMnd} startYm={plan.startYm} api={api} readOnly={readOnly} onLagret={onEndret} />
      ) : null}

      {/* Cockpit (forvaltning) */}
      <div className={`mt-3 flex flex-col gap-3 xl:flex-row xl:items-start ${segment === 'konsern' ? 'hidden' : ''}`}>
        {/* ── Venstre: forutsetninger — investorens mentale kjede (vis/skjul i topp-raden) ── */}
        {railAapen && (
        <>
        {/* Under xl: forutsetningene vises som et bunn-ark over innholdet —
            slipper å skyve hele cockpiten ned på mobil/nettbrett. */}
        <div className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-[2px] xl:hidden" onClick={() => setRailAapen(false)} data-testid="modell-rail-overlay" />
        <aside
          className="fixed inset-x-0 bottom-0 z-[71] max-h-[84vh] w-full shrink-0 overflow-y-auto overscroll-contain rounded-t-[22px] bg-[#f7f6f3] px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-18px_60px_rgba(20,16,40,0.28)] xl:sticky xl:inset-x-auto xl:bottom-auto xl:top-[64px] xl:z-auto xl:max-h-[calc(100vh-76px)] xl:w-[344px] xl:rounded-none xl:bg-transparent xl:p-0 xl:shadow-none"
          data-testid="modell-drivere" style={{ scrollbarWidth: 'thin' }}
        >
          {/* Mobil-topp: håndtak + Ferdig */}
          <div className="sticky top-0 z-10 -mx-3 mb-1.5 flex items-center justify-between rounded-t-[22px] bg-[#f7f6f3]/95 px-4 pb-1.5 pt-2.5 backdrop-blur xl:hidden">
            <span className="pointer-events-none absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-black/15" />
            <p className="pt-1.5 text-[13.5px] font-bold text-[#1c1917]" style={heading}>Forutsetninger</p>
            <button onClick={() => setRailAapen(false)} data-testid="modell-rail-lukk-mobil"
              className="mt-0.5 rounded-full bg-[#141414] px-3.5 py-1.5 text-[12px] font-bold text-white transition-all active:scale-95">
              Ferdig
            </button>
          </div>
          <div className="rounded-[16px] bg-white px-4 pb-3.5 pt-3.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="hidden text-[14.5px] font-bold text-[#1c1917] xl:block" style={heading}>Forutsetninger</p>
              <span className="xl:hidden" />
              {!readOnly && antallEndret > 0 && (
                <button onClick={tilbakestill} className="flex items-center gap-1 rounded-full bg-[#f0ebfa] px-2 py-0.5 text-[11px] font-bold text-[#6d28d9] transition-colors hover:bg-[#e5dbf7]" title="Tilbakestill til sist lagrede verdier">
                  <RotateCcw className="h-2.5 w-2.5" /> {antallEndret} endret · nullstill
                </button>
              )}
            </div>

            {/* Scenariovalget bor i topplinjen — her vises kun aktivt scenario-banner */}
            {aktivtScenario && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-[10px] bg-[#f6f2fd] px-2.5 py-1.5" data-testid="modell-scenario-banner">
                <p className="min-w-0 truncate text-[11px] leading-snug text-[#6d28d9]">
                  Viser <b>«{scenarioer.find((s) => s.id === aktivtScenario)?.navn}»</b> — «Lagre» gjør dette til budsjettets forutsetninger
                </p>
                {!readOnly && (
                  <button onClick={oppdaterScenario} data-testid="modell-scenario-oppdater" title="Overskriv scenarioet med driverne slik de står nå"
                    className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold text-[#6d28d9] shadow-sm transition-colors hover:bg-[#ede6fb]">
                    Oppdater
                  </button>
                )}
              </div>
            )}

            <Seksjon tittel="Portefølje & vekst" ikon={TrendingUp} open={aapne.portefolje} onToggle={() => veksle('portefolje')}
              sammendrag={`${sanert.vekstplan.length ? `${kma(sanert.nyePerMnd)}→${kma(vekstSiste)}` : kma(sanert.nyePerMnd)} nye/mnd · ${kma(sanert.aarligChurnPct)} % churn`}>
              <Felt label="Nye enheter per måned" k="nyePerMnd" {...feltProps} enhet="enh." testid="driver-nye" slider={{ min: 0, max: 10, step: 0.5 }}
                hint={sanert.vekstplan.length ? `grunntakt (fase 1) — vekstplanen øker takten til ${kma(vekstSiste)}/mnd` : null} />
              <button onClick={() => setVekstAapen(true)} data-testid="modell-vekst-aapne"
                className="mb-1.5 mt-0.5 flex w-full items-center justify-between rounded-[10px] bg-[#f0ebfa] px-3 py-2.5 text-left transition-colors hover:bg-[#e7defa]">
                <span>
                  <span className="block text-[12.5px] font-bold text-[#6d28d9]">Vekstplan</span>
                  <span className="block text-[11px] text-[#8b6bc7]">
                    {sanert.vekstplan.length
                      ? `${kma(sanert.nyePerMnd)} → ${kma(vekstSiste)} enh/mnd · ${sanert.vekstplan.length + 1} faser`
                      : 'Konstant takt — legg inn faser for økende vekst'}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#8b6bc7]" />
              </button>
              <Felt label="Årlig churn" k="aarligChurnPct" {...feltProps} enhet="%" testid="driver-churn" slider={{ min: 0, max: 40, step: 1 }} hint={`≈ ${kma(s.mndChurnPct)} %/mnd på modellerte enheter — dagens portefølje churnes ikke`} />
              {/* Re-utleie ved kontraktslutt — eget modellag, aldri blandet med kontraktsfestet */}
              <div className="mt-1 rounded-[10px] bg-[#f5f4f1] px-2.5 py-2" data-testid="driver-reutleie">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold text-[#57534e]">Re-utleie ved kontraktslutt</span>
                    <span className="block text-[10.5px] leading-snug text-[#a6a19a]">Boligen forvaltes videre — honoraret gjenopptas etter gapet</span>
                  </span>
                  <button type="button" onClick={() => !readOnly && settDriver('reutleiePaa', !sanert.reutleiePaa)} disabled={readOnly}
                    data-testid="driver-reutleie-toggle" aria-pressed={sanert.reutleiePaa}
                    className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${sanert.reutleiePaa ? 'bg-[#0a7d55]' : 'bg-[#d6d3cd]'} ${readOnly ? 'opacity-60' : ''}`}>
                    <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all ${sanert.reutleiePaa ? 'left-[18px]' : 'left-[3px]'}`} />
                  </button>
                </div>
                {sanert.reutleiePaa && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[#8f8a82]">Ledighetsgap ved skifte</span>
                    <span className="flex items-center gap-1">
                      {[0, 1, 2, 3].map((g) => (
                        <button key={g} type="button" disabled={readOnly} onClick={() => settDriver('reutleieGapMnd', g)}
                          data-testid={`driver-reutleie-gap-${g}`}
                          className={`h-6 w-6 rounded-[7px] text-[11px] font-bold transition-all ${sanert.reutleieGapMnd === g ? 'bg-[#1c1917] text-white' : 'bg-white text-[#8f8a82] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07)] hover:text-[#1c1917]'}`}>
                          {g}
                        </button>
                      ))}
                      <span className="ml-0.5 text-[10.5px] text-[#a6a19a]">mnd</span>
                    </span>
                  </div>
                )}
                {sanert.reutleiePaa && !(fakta.bortfall || []).some((x) => x > 0) && (
                  <p className="mt-1.5 text-[10.5px] leading-snug text-[#b0824a]">Trykk «Oppdater fra leieforholdene» for å hente kjente kontraktslutt inn i laget</p>
                )}
              </div>
              <Felt label="Snittleie nye enheter" k="snittleieNye" {...feltProps} enhet="kr/mnd" testid="driver-leie" heltall slider={{ min: 5000, max: 40000, step: 500 }} />
              <Felt label="Honorar nye enheter" k="honorarPctNye" {...feltProps} enhet="%" testid="driver-honorar" slider={{ min: 0, max: 20, step: 0.5 }} hint={`≈ ${kr0(m.cac.bruttoHonorarNy)} kr eks. mva per enhet/mnd`} />
            </Seksjon>

            <Seksjon tittel="Unit economics" ikon={Scale} open={aapne.unit} onToggle={() => veksle('unit')}
              sammendrag={`system ${kr0(sanert.systemPerEnhet)}/enh · bidrag ${kr0(m.cac.bidrag)}`}>
              <Felt label="Systemkostnad per enhet" k="systemPerEnhet" {...feltProps} enhet="kr/mnd" testid="driver-system" heltall hint="plattformlisensen fra Digihome Tech AS — elimineres i konsernet" />
              <Felt label="Oppstartshonorar" k="oppstartPerEnhet" {...feltProps} enhet="kr" testid="driver-oppstart" heltall hint="engangsbeløp per ny signering" />
            </Seksjon>

            <Seksjon tittel="Markedsføring & salg" ikon={Megaphone} open={aapne.salg} onToggle={() => veksle('salg')}
              sammendrag={`CAC ${kr0(m.cac.fullCac)} · ${kr0(sanert.mfFast)}/mnd${sanert.partner.paa ? ' · partner' : ''}`}>
              <Felt label="Salgsprovisjon per ny (CAC)" k="provisjonPerNyEnhet" {...feltProps} enhet="kr" testid="driver-cac" heltall hint="engangs anskaffelseskost per signert enhet" />
              <Felt label="Fast markedsføring" k="mfFast" {...feltProps} enhet="kr/mnd" testid="driver-mf" heltall hint="merkevare, innhold, verktøy — uavhengig av volum" />
              <PartnerKort
                verdi={sanert.partner} readOnly={readOnly} enhetsnavn="enhet" testid="driver-partner"
                onEndre={(p) => settDriver('partner', p)}
                perKunde={sanert.partner.paa ? m.cac.partnerPerEnhet : null}
                iPerioden={sanert.partner.paa ? s.sumPartner : null}
                andelPct={sanert.partner.paa && s.sumInntekt > 0 ? Math.round((s.sumPartner / s.sumInntekt) * 100) : null}
              />
              <p className="mt-2 text-[11px] leading-snug text-[#a6a19a]">
                S&M i perioden: <b className="text-[#57534e]">{kr0(s.sumSm)} kr</b>{s.smAndelPct != null ? ` · ${s.smAndelPct} % av inntekten` : ''}
              </p>
            </Seksjon>

            <Seksjon tittel="Organisasjon" ikon={Users} open={aapne.org} onToggle={() => veksle('org')}
              sammendrag={`${kma(sanert.enheterPerAarsverk)} enh/åv · ${pctNaa} % · kap. ${kapNaa}`}>
              {/* Økonomisk forutsetning + inngang til planen — konsekvensene bor i hovedflaten */}
              <div className="space-y-1 py-1 text-[12.5px]" data-testid="modell-bemanning-sammendrag">
                <p className="flex justify-between"><span className="text-[#8f8a82]">Enheter per årsverk</span><span className="font-semibold text-[#1c1917]">{kma(sanert.enheterPerAarsverk)}</span></p>
                <p className="flex justify-between"><span className="text-[#8f8a82]">Fullkost årsverk</span><span className="font-semibold text-[#1c1917]">{kr0(fullkost)} kr</span></p>
              </div>
              <button onClick={() => setBemAapen(true)} data-testid="modell-bemanning-aapne"
                className="mt-1.5 flex w-full items-center justify-between rounded-[10px] bg-[#f0ebfa] px-3 py-2.5 text-left transition-colors hover:bg-[#e7defa]">
                <span>
                  <span className="block text-[12.5px] font-bold text-[#6d28d9]">Bemanningsplan</span>
                  <span className="block text-[11px] text-[#8b6bc7]">{pctNaa} % nå · kapasitet {kr0(kapNaa)} enheter · {sanert.bemanningstrinn.length} trinn</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#6d28d9]" />
              </button>
            </Seksjon>

            <Seksjon tittel="Faste kostnader" ikon={Building2} open={aapne.faste} onToggle={() => veksle('faste')}
              sammendrag={`${kr0(sanert.adminFast + sanert.andreFaste)} kr/mnd`}>
              <Felt label="Administrasjon" k="adminFast" {...feltProps} enhet="kr/mnd" testid="driver-admin" heltall />
              <Felt label="Andre faste kostnader" k="andreFaste" {...feltProps} enhet="kr/mnd" testid="driver-andre" heltall />
            </Seksjon>

            <Seksjon tittel="Årlig justering" ikon={CalendarDays} open={aapne.aarlig} onToggle={() => veksle('aarlig')}
              sammendrag={`${kma(sanert.indeksPct)} % leie · ${kma(sanert.lonnsvekstPct)} % lønn · ${kma(sanert.kostInflasjonPct)} % kost`}>
              <p className="pb-1 pt-0.5 text-[11px] leading-snug text-[#a6a19a]">
                Trappes per planår — <b>år 1 påvirkes aldri</b>. Gir realistiske flerårsplaner: leien indeksjusteres, lønn og priser stiger.
              </p>
              <Felt label="Indeksregulering leie (KPI)" k="indeksPct" {...feltProps} enhet="%/år" testid="driver-indeks" slider={{ min: 0, max: 8, step: 0.5 }}
                hint="husleieloven § 4-2 — honoraret følger leien (alle inntektslag unntatt oppstartshonorar)" />
              <Felt label="Lønnsvekst" k="lonnsvekstPct" {...feltProps} enhet="%/år" testid="driver-lonnsvekst" slider={{ min: 0, max: 10, step: 0.5 }}
                hint="bemanningskostnaden justeres årlig" />
              <Felt label="Kostnadsinflasjon" k="kostInflasjonPct" {...feltProps} enhet="%/år" testid="driver-kostinflasjon" slider={{ min: 0, max: 10, step: 0.5 }}
                hint="system, markedsføring, CAC, administrasjon og andre faste" />
              {antallMnd <= 12 && (
                <p className="mt-1 rounded-[8px] bg-[#fdf3e0] px-2.5 py-1.5 text-[10.5px] leading-snug text-[#9a6b1c]">
                  Planen er {antallMnd} mnd — justeringen får først effekt i flerårsplaner (13+ måneder).
                </p>
              )}
            </Seksjon>

            {/* Bemanning som INNSIKT bor i hovedflaten — løftes kun frem når den er relevant */}

            <div className="mt-3 border-t border-black/[0.05] pt-2.5">
              <p className="text-[11.5px] leading-relaxed text-[#a6a19a]">
                Porteføljefakta: {Math.round(fakta.enheter?.[0] || 0)} enheter · {kr0(fakta.eksisterende?.[0] || 0)} kr/mnd kontraktsfestet
                {fakta.oppdatertAt ? ` · hentet ${new Date(fakta.oppdatertAt).toLocaleDateString('nb-NO')}` : ''}
              </p>
              <div className="mt-2 flex items-center justify-between">
                {!readOnly ? (
                  <button onClick={oppdaterFakta} disabled={henterFakta} data-testid="modell-oppdater-fakta"
                    className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#6d28d9] transition-colors hover:text-[#4c1d95] disabled:opacity-50">
                    {henterFakta ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Oppdater fra leieforholdene
                  </button>
                ) : <span />}
              </div>
            </div>
          </div>
        </aside>
        </>
        )}

        {/* ── Høyre: output ── */}
        <main className="min-w-0 flex-1">
          {/* Nøkkeltall — bento: lys hero-flis (resultatet) + diagnostiske fliser.
              Ett dominant tall, luftig og lyst — subtil lilla glød, ingen tunge flater. */}
          <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-12" data-testid="modell-nokkeltall">
            <div className="relative overflow-hidden rounded-[18px] bg-white px-5 py-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] xl:col-span-5">
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(380px_190px_at_92%_-25%,rgba(139,92,246,0.10),transparent_62%)]" />
              <div className="relative">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a6a19a]">Resultat i perioden</p>
                <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                  <p className={`text-[29px] font-bold leading-none tracking-[-0.02em] ${s.resultat >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`} style={heading} data-testid="modell-resultat">{kr(s.resultat)}</p>
                  <SparkHero serie={m.resultat} />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-[#f5f4f1] px-2 py-[3px] text-[10.5px] font-semibold text-[#78716c]" data-testid="modell-siste-mnd">
                    siste mnd {kr0(m.resultat[sisteIdx])} kr
                  </span>
                  <span className="rounded-full bg-[#f5f4f1] px-2 py-[3px] text-[10.5px] font-semibold text-[#78716c]">
                    første mnd {kr0(m.resultat[0])} kr
                  </span>
                  {s.sumInntekt > 0 && (
                    <span className="rounded-full bg-[#f0ebfa] px-2 py-[3px] text-[10.5px] font-semibold text-[#6d28d9]">
                      margin {Math.round((s.resultat / s.sumInntekt) * 100)} %
                    </span>
                  )}
                </div>
                {/* Inntekter mot kostnader — dekningsgraden forteller hvor langt unna balanse perioden er */}
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-black/[0.05] pt-2.5" data-testid="modell-dekning">
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#b5b0a8]">Inntekter</p>
                    <p className="truncate text-[15px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{kr(s.sumInntekt)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#b5b0a8]">Kostnader</p>
                    <p className="truncate text-[15px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{kr(s.sumKost)}</p>
                  </div>
                </div>
                {s.sumKost > 0 && (
                  <div className="mt-2">
                    <div className="flex h-[5px] overflow-hidden rounded-full bg-[#fdf0ef]">
                      <span className="h-full rounded-full bg-[#0a7d55] transition-all duration-500" style={{ width: `${Math.min(100, (s.sumInntekt / s.sumKost) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-[10.5px] text-[#a6a19a]">inntektene dekker <b className="text-[#57534e]">{Math.round((s.sumInntekt / s.sumKost) * 100)} %</b> av kostnadene i perioden</p>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:col-span-7 xl:grid-cols-2">
              <Stat tittel="Break-even" verdi={breakEvenVerdi} under={breakEvenUnder} testid="modell-breakeven" />
              <Stat tittel="Kapitalbehov til break-even" verdi={be.ingen ? (s.kapitalbehov > 0 ? kr(s.kapitalbehov) : '—') : be.kapital > 0 ? kr(be.kapital) : 'Ingen'}
                under={be.ingen ? 'maks. underskudd i perioden' : be.kapital > 0 ? 'akkumulert underskudd frem til krysset' : 'selvfinansiert fra start'}
                farge={be.ingen || be.kapital > 0 ? 'text-[#1c1917]' : 'text-[#0a7d55]'} testid="modell-kapitalbehov" />
              <Stat tittel="ARR ved slutt" verdi={s.arrExit ? kr(s.arrExit) : '—'} under="siste måneds inntekt × 12 — run-rate" farge="text-[#6d28d9]" testid="modell-arr" />
              <Stat tittel="Kontraktsfestet" verdi={s.andelEksisterendePct === null ? '—' : `${s.andelEksisterendePct} %`} under="av inntekten i perioden" testid="modell-andel" />
            </div>
          </div>

          {/* Årssammendrag — teleskopets øverste nivå: ett kort per planår med
              YoY-vekst og ARR exit run-rate (tallet en emisjonspitch bygger på) */}
          {m.aar.length > 1 && (
            <div className={`mt-2.5 grid gap-2 sm:grid-cols-2 ${m.aar.length >= 3 ? 'xl:grid-cols-3' : ''}`} data-testid="modell-aarsstripe">
              {m.aar.map((a, i) => {
                const forrige = m.aar[i - 1];
                const yoy = forrige && forrige.inntekt > 0 ? Math.round(((a.inntekt - forrige.inntekt) / forrige.inntekt) * 100) : null;
                return (
                  <div key={a.nr} className="rounded-[14px] bg-white px-4 py-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid={`modell-aar-${a.nr}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.08em] text-[#8f8a82]">
                        År {a.nr}
                        <span className="ml-1.5 font-medium normal-case tracking-normal text-[#c2beb8]">{stor(mndKort(ymPluss(plan.startYm, a.fraIdx)))} – {mndKort(ymPluss(plan.startYm, a.tilIdx))}</span>
                      </p>
                      {yoy !== null && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${yoy >= 0 ? 'bg-[#e7f4ee] text-[#0a7d55]' : 'bg-[#fdf0ef] text-[#b3261e]'}`}>
                          {yoy >= 0 ? '+' : ''}{yoy} % vekst
                        </span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
                      <p className="flex justify-between gap-2"><span className="text-[#8f8a82]">Inntekter</span><span className="font-semibold text-[#1c1917]">{kr0(a.inntekt)}</span></p>
                      <p className="flex justify-between gap-2"><span className="text-[#8f8a82]">Resultat</span><span className={`font-bold ${a.resultat >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{kr0(a.resultat)}</span></p>
                      <p className="flex justify-between gap-2"><span className="text-[#8f8a82]">Enheter v/slutt</span><span className="font-semibold text-[#1c1917]">{Math.round(a.enheterSlutt)}</span></p>
                      <p className="flex justify-between gap-2"><span className="text-[#8f8a82]" title="Siste måneds inntekt × 12 — exit run-rate">ARR ved slutt</span><span className="font-semibold text-[#6d28d9]">{kr0(a.arrExit)}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bemanning som innsikt: dukker KUN opp når kapasiteten faktisk sprenges */}
          {varselIdx !== null && (
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-[#fdf3e0] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(154,107,28,0.14)]" data-testid="modell-bemanning-innsikt">
              <p className="text-[13px] leading-snug text-[#7a5615]">
                <span className="font-bold">Bemanning blir en flaskehals {stor(mndLang(ymPluss(plan.startYm, varselIdx)))}.</span>{' '}
                Porteføljen forventes å passere {kma(sanert.maalUtnyttelsePct)} % av kapasiteten på {kr0(kapVedVarsel)} enheter.
              </p>
              <button onClick={() => setBemAapen(true)} data-testid="modell-bemanning-innsikt-aapne"
                className="flex shrink-0 items-center gap-1 rounded-[9px] bg-[#9a6b1c] px-3 py-1.5 text-[12.5px] font-bold text-white transition-colors hover:bg-[#7a5615]">
                Åpne bemanningsplan <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Graf — veien til break-even */}
          <div className="mt-2.5 rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Veien til break-even <span className="font-medium normal-case tracking-normal text-[#c2beb8]">· inntektslagene som søyler — linjene krysser i break-even</span></p>
            <Graf m={m} startYm={plan.startYm} />
          </div>

          {/* Finansmatrise */}
          <div className="mt-2.5 rounded-[16px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-1 pt-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Resultatoppstilling <span className="font-medium normal-case tracking-normal text-[#c2beb8]">· beløp i kr · beregnet fra driverne</span></p>
              <div className="flex items-center gap-0.5 rounded-[8px] bg-[#f0efec] p-0.5" data-testid="modell-visning">
                {[...(antallMnd > 12 ? [['teleskop', 'Teleskop']] : []), ['mnd', 'Måned'], ['kvartal', 'Kvartal'], ...(antallMnd > 12 ? [['aar', 'År']] : [])].map(([v, l]) => (
                  <button key={v} onClick={() => setVisning(v)} data-testid={`modell-visning-${v}`}
                    title={v === 'teleskop' ? 'År 1 måned for måned · år 2 kvartalsvis · år 3 årlig' : undefined}
                    className={`rounded-[6px] px-3 py-1 text-[12.5px] font-medium transition-colors ${visning === v ? 'bg-white text-[#1c1917] shadow-sm' : 'text-[#8f8a82] hover:text-[#57534e]'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto pb-1" data-testid="modell-matrise" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.05em] text-[#a6a19a]">
                    <th className="sticky left-0 z-10 bg-white py-2 pl-4 pr-3 text-left font-semibold">&nbsp;</th>
                    {perioder.map((p) => (
                      <th key={p.label} className="whitespace-nowrap px-2 py-2 text-right font-semibold">{p.label}</th>
                    ))}
                    <th className="sticky right-0 z-10 whitespace-nowrap border-l border-black/[0.06] bg-[#faf9f7] py-2 pl-2.5 pr-4 text-right font-semibold text-[#57534e]">Totalt</th>
                  </tr>
                </thead>
                <tbody>
                  {matriseRader.map((rad, ri) => {
                    if (rad.header) {
                      return (
                        <tr key={ri} className="bg-[#faf9f7]">
                          <td className="sticky left-0 z-10 bg-[#faf9f7] py-1.5 pl-4 pr-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8f8a82]">{rad.header}</td>
                          <td colSpan={perioder.length} className="bg-[#faf9f7]" />
                          <td className="sticky right-0 z-10 border-l border-black/[0.06] bg-[#f4f3f0]" />
                        </tr>
                      );
                    }
                    const verdi = (idx) => (rad.type === 'stock' ? beholdning(rad.serie, idx) : flyt(rad.serie, idx));
                    const total = rad.type === 'stock' ? rad.serie[m.N - 1] : rad.serie.reduce((a, b) => a + b, 0);
                    const fmt = rad.fmt || kr0;
                    const celleFarge = (v) => {
                      if (rad.resultat || rad.akk) return v >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]';
                      if (rad.info) return 'text-[#b5b0a8]';
                      if (rad.lilla) return 'text-[#6d28d9]';
                      if (rad.gronn) return 'text-[#0a7d55]';
                      return 'text-[#57534e]';
                    };
                    const vekt = rad.sum || rad.resultat ? 'font-bold' : rad.akk ? 'font-medium' : '';
                    const radBg = rad.resultat ? 'bg-[#fbfaf8]' : 'bg-white';
                    return (
                      <tr key={ri} className={`group border-t border-black/[0.04] ${rad.resultat ? 'bg-[#fbfaf8]' : ''} transition-colors hover:bg-[#f7f6f3]`}>
                        <td className={`sticky left-0 z-10 whitespace-nowrap py-[7px] pl-4 pr-3 text-left ${radBg} transition-colors group-hover:bg-[#f7f6f3] ${rad.sum || rad.resultat ? 'font-bold text-[#1c1917]' : rad.info || rad.akk ? 'text-[#8f8a82]' : 'text-[#57534e]'}`}>
                          {rad.label}
                        </td>
                        {perioder.map((p) => {
                          const v = verdi(p.idx);
                          return <td key={p.label} className={`whitespace-nowrap px-2 py-[7px] text-right ${vekt} ${celleFarge(v)}`}>{fmt(v)}</td>;
                        })}
                        <td className={`sticky right-0 z-10 whitespace-nowrap border-l border-black/[0.06] bg-[#faf9f7] py-[7px] pl-2.5 pr-4 text-right font-bold transition-colors group-hover:bg-[#f2f1ee] ${rad.resultat || rad.akk ? (total >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]') : rad.info ? 'text-[#b5b0a8]' : 'text-[#1c1917]'}`}>
                          {fmt(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scenarioer + unit economics + sensitivitet */}
          <div className="mt-2.5 grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
            {/* Scenarioer — investorens egentlige risikospørsmål */}
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="modell-scenarioer">
              <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Scenarioer</p>
              <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">Hva om salget går halvparten — eller dobbelt — så fort? Beregnet på 36 mnd horisont.</p>
              <table className="mt-3 w-full text-[12.5px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-[0.06em] text-[#a6a19a]">
                    <th className="pb-1.5 text-left font-semibold">&nbsp;</th>
                    {autoScenarioer.map((sc) => (
                      <th key={sc.navn} className={`pb-1.5 text-right font-bold ${sc.navn === 'Basis' ? 'text-[#6d28d9]' : ''}`}>{sc.navn}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-black/[0.04]">
                    <td className="py-1.5 text-[#8f8a82]">Nye enheter/mnd</td>
                    {autoScenarioer.map((sc) => <td key={sc.navn} className={`py-1.5 text-right font-medium ${sc.navn === 'Basis' ? 'text-[#1c1917]' : 'text-[#57534e]'}`}>{kma(sc.d.nyePerMnd)}</td>)}
                  </tr>
                  <tr className="border-t border-black/[0.04]">
                    <td className="py-1.5 text-[#8f8a82]">Årlig churn</td>
                    {autoScenarioer.map((sc) => <td key={sc.navn} className={`py-1.5 text-right font-medium ${sc.navn === 'Basis' ? 'text-[#1c1917]' : 'text-[#57534e]'}`}>{kma(sc.d.aarligChurnPct)} %</td>)}
                  </tr>
                  <tr className="border-t border-black/[0.04]">
                    <td className="py-1.5 text-[#8f8a82]">Honorar nye</td>
                    {autoScenarioer.map((sc) => <td key={sc.navn} className={`py-1.5 text-right font-medium ${sc.navn === 'Basis' ? 'text-[#1c1917]' : 'text-[#57534e]'}`}>{kma(sc.d.honorarPctNye)} %</td>)}
                  </tr>
                  <tr className="border-t border-black/[0.06]">
                    <td className="py-1.5 font-semibold text-[#1c1917]">Break-even</td>
                    {autoScenarioer.map((sc) => (
                      <td key={sc.navn} className={`py-1.5 text-right font-bold ${sc.idx === null ? 'text-[#b3261e]' : 'text-[#1c1917]'}`}>
                        {sc.idx === null ? '36+ mnd' : mndLang(ymPluss(plan.startYm, sc.idx))}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-black/[0.04]">
                    <td className="py-1.5 font-semibold text-[#1c1917]">Kapitalbehov</td>
                    {autoScenarioer.map((sc) => <td key={sc.navn} className="py-1.5 text-right font-bold text-[#1c1917]">{kr0(sc.kap)}</td>)}
                  </tr>
                </tbody>
              </table>
              <p className="mt-2.5 text-[10.5px] leading-snug text-[#c2beb8]">Konservativ: halv vekst, +5 pp churn, −1 pp honorar · Ambisiøs: dobbel vekst, −3 pp churn</p>
            </div>

            {/* Unit economics — sammendrag; full analyse bor på Enhetsøkonomi-siden */}
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="modell-cac">
              <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Unit economics — ny enhet</p>
              <div className="mt-3 space-y-1.5 text-[13px]">
                <div className="flex justify-between"><span className="text-[#8f8a82]">Husleie</span><span className="font-medium text-[#57534e]">{kr0(sanert.snittleieNye)} kr/mnd</span></div>
                <div className="flex justify-between"><span className="text-[#8f8a82]">Forvaltningshonorar</span><span className="font-medium text-[#57534e]">{kma(sanert.honorarPctNye)} %</span></div>
                <div className="flex justify-between"><span className="text-[#57534e]">Inntekt <span className="text-[#a6a19a]">eks. mva</span></span><span className="font-semibold text-[#1c1917]">{kr0(m.cac.bruttoHonorarNy)} kr/mnd</span></div>
                <div className="flex justify-between"><span className="text-[#57534e]">− Systemkostnad</span><span className="font-semibold text-[#1c1917]">{kr0(m.cac.systemPerEnhet)} kr</span></div>
                <div className="flex justify-between border-t border-black/[0.05] pt-1.5">
                  <span className="text-[#57534e]">= Bidrag før bemanning</span>
                  <span className={`font-bold ${m.cac.bidrag > 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{kr0(m.cac.bidrag)} kr/mnd{unit.margin !== null && <span className="ml-1 text-[11px] font-bold text-[#a6a19a]">({unit.margin} %)</span>}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534e]">− Normalisert forvalterkost <span className="text-[#c2beb8]" title={`Fullkost ${kr0(fullkost)} kr ÷ ${kr0(sanert.enheterPerAarsverk)} enheter ÷ 12`}>ⓘ</span></span>
                  <span className="font-semibold text-[#1c1917]">{kr0(unit.bemPerEnhet)} kr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534e]">= Bidrag etter bemanning</span>
                  <span className={`font-bold ${unit.bidragEtter > 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`} data-testid="modell-bidrag-etter">{kr0(unit.bidragEtter)} kr/mnd{unit.marginEtter !== null && <span className="ml-1 text-[11px] font-bold text-[#a6a19a]">({unit.marginEtter} %)</span>}</span>
                </div>
                <div className="flex justify-between border-t border-black/[0.05] pt-1.5"><span className="text-[#8f8a82]">CAC <span className="text-[#c2beb8]">(salgsprovisjon)</span></span><span className="font-medium text-[#57534e]">{kr0(m.cac.provisjon)} kr</span></div>
                {sanert.partner.paa && (
                  <>
                    <div className="flex justify-between"><span className="text-[#8f8a82]">+ Partnerhonorar <span className="text-[#c2beb8]">({sanert.partner.honorarPct.toString().replace('.', ',')} % · {sanert.partner.varighetMnd > 0 ? `${sanert.partner.varighetMnd} mnd` : 'livstid'})</span></span><span className="font-medium text-[#57534e]">{kr0(m.cac.partnerPerEnhet)} kr</span></div>
                    <div className="flex justify-between"><span className="text-[#57534e]">= Full CAC</span><span className="font-semibold text-[#1c1917]" data-testid="modell-full-cac">{kr0(m.cac.fullCac)} kr</span></div>
                  </>
                )}
                <div className="flex justify-between"><span className="text-[#8f8a82]">LTV <span className="text-[#c2beb8]">({unit.levetidAar === null ? 'fra churn' : `${kma(unit.levetidAar)} år levetid`})</span></span><span className="font-medium text-[#57534e]">{unit.ltv === null ? '—' : `${kr0(unit.ltv)} kr`}</span></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex rounded-full bg-[#f0ebfa] px-3 py-1 text-[13px] font-bold text-[#6d28d9]" data-testid="modell-payback">
                  {m.cac.paybackMnd === null ? (m.cac.bidrag <= 0 ? 'Bidrag dekker ikke system' : 'Ingen CAC') : `Payback: ${kma(m.cac.paybackMnd)} mnd`}
                </span>
                {unit.paybackEtter !== null && (
                  <span className="inline-flex rounded-full bg-[#f5f4f1] px-3 py-1 text-[13px] font-bold text-[#57534e]" title="Etter normalisert bemanning">Etter bem.: {kma(unit.paybackEtter)} mnd</span>
                )}
                {unit.ltvCac !== null && (
                  <span className="inline-flex rounded-full bg-[#e7f4ee] px-3 py-1 text-[13px] font-bold text-[#0a7d55]" data-testid="modell-ltvcac">LTV/CAC: {kma(unit.ltvCac)}×</span>
                )}
              </div>
              <a href="/admin/datarom-enheter" data-testid="modell-eo-lenke"
                className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#6d28d9] transition-colors hover:text-[#4c1d95]">
                Se full enhetsøkonomi <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Sensitivitet */}
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] lg:col-span-2 2xl:col-span-1" data-testid="modell-tornado">
              <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Sensitivitet — hva betyr mest?</p>
              <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">Effekt på periodens resultat når hver driver endres ±10 %.</p>
              <TornadoListe m={m} sanert={sanert} fakta={fakta} antallMnd={antallMnd} startYm={plan.startYm} />
            </div>
          </div>
        </main>
      </div>
      {bemAapen && (
        <BemanningsplanDrawer
          plan={{ ...plan, antallMnd }} fakta={fakta} drivere={sanert} readOnly={readOnly}
          onLukk={() => setBemAapen(false)} onBruk={brukBemanningsplan}
        />
      )}
      {vekstAapen && (
        <VekstplanDrawer
          plan={{ ...plan, antallMnd }} fakta={fakta} drivere={sanert} readOnly={readOnly}
          onLukk={() => setVekstAapen(false)} onBruk={brukVekstplan}
        />
      )}
      {visSammenlign && (
        <ScenarioSammenligning
          plan={{ ...plan, antallMnd }}
          fakta={fakta}
          drivere={drivere}
          scenarioer={scenarioer}
          aktivtScenario={aktivtScenario}
          onLukk={() => setVisSammenlign(false)}
        />
      )}
      <Omvisning steg={tourSteg} aktiv={tourAktiv} onFerdig={tourFerdig} />
    </div>
  );
}

/* ── Tornado som egen komponent (memoisert beregning) ── */
function TornadoListe({ m, sanert, fakta, antallMnd, startYm }) {
  const tornado = useMemo(() => {
    const basis = m.sammendrag.resultat;
    const kandidater = [
      ['nyePerMnd', 'Nye enheter per måned'], ['aarligChurnPct', 'Årlig churn'],
      ['snittleieNye', 'Snittleie nye enheter'], ['honorarPctNye', 'Honorar-% nye'],
      ['oppstartPerEnhet', 'Oppstartshonorar'], ['systemPerEnhet', 'Systemkostnad per enhet'],
      ['enheterPerAarsverk', 'Kapasitet per årsverk'], ['aarslonn', 'Årslønn'],
      ['paslagPct', 'Arbeidsgiverpåslag'], ['mfFast', 'Fast markedsføring'],
      ['provisjonPerNyEnhet', 'Salgsprovisjon (CAC)'], ['adminFast', 'Administrasjon'],
      ['andreFaste', 'Andre faste'],
      ['indeksPct', 'Indeksregulering (leie)'], ['lonnsvekstPct', 'Lønnsvekst'],
      ['kostInflasjonPct', 'Kostnadsinflasjon'],
      ...(sanert.partner?.paa ? [['partner.honorarPct', 'Partnerhonorar (%)'], ['partner.fastPerMnd', 'Partner fast honorar']] : []),
    ];
    // Nøstede drivere («partner.honorarPct») skaleres i sitt objekt
    const les = (k) => (k.includes('.') ? sanert[k.split('.')[0]]?.[k.split('.')[1]] : sanert[k]);
    const skriv = (k, verdi) => (k.includes('.')
      ? { ...sanert, [k.split('.')[0]]: { ...sanert[k.split('.')[0]], [k.split('.')[1]]: verdi } }
      : { ...sanert, [k]: verdi });
    const rader = kandidater.map(([k, label]) => {
      const v = les(k);
      if (!Number.isFinite(v) || v === 0) return null;
      // Veksttakten skaleres i ALLE faser — ikke bare grunntakten
      const over = (f) => (k === 'nyePerMnd' ? skalerVekst(sanert, f) : skriv(k, v * f));
      const opp = beregnInvestorModell({ antallMnd, fakta, drivere: over(1.1), startYm }).sammendrag.resultat - basis;
      const ned = beregnInvestorModell({ antallMnd, fakta, drivere: over(0.9), startYm }).sammendrag.resultat - basis;
      const spenn = (Math.abs(opp) + Math.abs(ned)) / 2;
      if (spenn < 1) return null;
      return { k, label, opp, spenn };
    }).filter(Boolean).sort((a, b) => b.spenn - a.spenn).slice(0, 7);
    return { rader, maks: Math.max(...rader.map((r) => r.spenn), 1) };
  }, [m, sanert, fakta, antallMnd]);
  return (
    <div className="mt-3 space-y-2">
      {tornado.rader.map((r) => (
        <div key={r.k} className="flex items-center gap-2.5">
          <span className="w-[164px] shrink-0 truncate text-[13px] text-[#57534e]">{r.label}</span>
          <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-black/[0.04]">
            <span className={`block h-full rounded-full transition-all duration-300 ${r.opp >= 0 ? 'bg-[#0a7d55]/70' : 'bg-[#b3261e]/60'}`} style={{ width: `${Math.max(3, (r.spenn / tornado.maks) * 100)}%` }} />
          </span>
          <span className="w-[112px] shrink-0 text-right text-[12.5px] font-semibold text-[#1c1917]">±{kr0(r.spenn)} kr</span>
        </div>
      ))}
      {tornado.rader.length === 0 && <p className="text-[12px] text-[#a6a19a]">Sett driverne over 0 for å se sensitivitet.</p>}
    </div>
  );
}
