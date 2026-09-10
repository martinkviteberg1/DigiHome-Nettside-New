'use client';
/* ─────────────────────────────────────────────────────────────────────────────
   DeckKonsept – DigiHomes investordeck for HELE konseptet, med levende budsjetter.

   · Én URL, tre roller: presenter (admin-sesjon via ?key=), investorrom-lenke (?t=) eller
     ren ekstern lenke (/deck/<token>, låst til én plan, valgfritt passord). Samme motorer
     som budsjettmodulen (lib/budsjett-modell.js) – alt regnes i nettleseren, ingenting lagres.
   · 17 kapitler: Forside (m/ «kort fortalt») → Hvorfor → Markedet → Konseptet → For hvem →
     Strukturen → Organisasjon → Hvor vi står → Unit economics → Go-to-market → Planen Digihome AS
     → Planen Tech → Konsern (m/ skatt) → Den ene variabelen (CAC × organisk) → Hva om → Risiko
     → Det vi trenger (emisjon, milepæler, grunnleggere, forpliktelser utenfor perioden).
   · Bevegelse som på forsiden: opacity/transform, expo-ease, én ting i bevegelse
     om gangen. Hvert kapittel «kommer inn» når det er aktivt (.deck-inn m/ --i),
     tall teller opp, grafer bygger seg fra grunnlinjen, strømmer pulserer.
   · Navigasjon: deterministisk kapittelmotor (ikke CSS scroll-snap): én gest = ett kapittel.
     Hjul/styreflate med treghetsdeteksjon, sveip på touch, tastatur (↑↓ ←→ PgUp/PgDn Home
     End, N = notater). Kapitler høyere enn skjermen scroller innvendig først – så byttes
     kapittel. Fremdriftslinje øverst, kapittelvelger, #hash for dyplenke. Print = PDF.
   ───────────────────────────────────────────────────────────────────────────── */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Download, Lock, RotateCcw, Send, Check, Megaphone, Home, Building2, Link2, Menu, X, Share2, Copy, Trash2, Eye, KeyRound, Ban, ChevronDown, Calendar, ShieldCheck, FileText, Coins, Users, User, CreditCard, Wrench, Table2, AlertTriangle, Sparkles } from 'lucide-react';
import { T, display, EASE, DIM, SVAK, HAIR } from '@/components/forside/v4/tokens';
import HeroScene from '@/components/forside/v4/HeroScene';
import HeroStage, { FILM as HERO_FILM } from '@/components/forside/v4/HeroStage';
import LosningFilm from '@/components/investor/LosningFilm';
import {
  beregnInvestorModell, beregnTech, beregnKonsernSammenstilling, rensModellDrivere, rensTechDrivere, rensTechFakta, skalerVekst,
} from '@/lib/budsjett-modell';

/* ── Små hjelpere ── */
const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const ymDeler = (ym) => { const [y, m] = String(ym || '2026-01').split('-').map(Number); return { y, m }; };
const ymPluss = (ym, i) => { const { y, m } = ymDeler(ym); const t = y * 12 + (m - 1) + i; return [Math.floor(t / 12), (t % 12) + 1]; };
const ymDiff = (a, b) => { const A = ymDeler(a); const B = ymDeler(b); return (B.y * 12 + B.m) - (A.y * 12 + A.m); };
const mndLabel = (ym, i, kort = true) => { const [y, m] = ymPluss(ym, i); return kort ? `${MND[m - 1]} ${String(y).slice(2)}` : `${MND[m - 1]} ${y}`; };
const nb = (n, d = 0) => (Number(n) || 0).toLocaleString('nb-NO', { maximumFractionDigits: d, minimumFractionDigits: d }).replace(/\u00A0/g, ' ');
const mnok = (n) => { const v = Number(n) || 0; return Math.abs(v) >= 1e6 ? `${nb(v / 1e6, 1)} MNOK` : `${nb(v / 1000)} k`; };
const kr = (n) => `${nb(n)} kr`;
const kr0 = (n) => nb(n);
const kma = (n) => String(n ?? '').replace('.', ',');
const pct = (n, d = 0) => `${nb(n, d)} %`;
const klem = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const utExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const sum = (a) => (Array.isArray(a) ? a.reduce((s, x) => s + (Number(x) || 0), 0) : 0);
const LYS = 'rgba(244,241,234,0.72)'; const LYS_SVAK = 'rgba(244,241,234,0.5)'; const LYS_HAIR = 'rgba(244,241,234,0.14)';
const LILLA_M = '#7A3FA8'; // lilla på lys flate (kontrast)
const FARGE = { dh: T.ink, lisens: '#5b4a66', huseier: '#8b5cf6', bedrift: '#0ea5a4', kost: '#B3261E', tech: T.lilla };

const skalerAnnonse = (h, f) => ({
  ...h,
  annonsePerMnd: Math.round((Number(h.annonsePerMnd) || 0) * f),
  vekstplan: (Array.isArray(h.vekstplan) ? h.vekstplan : []).map((x) => ({ ...x, annonsePerMnd: Math.round((Number(x.annonsePerMnd) || 0) * f) })),
  kunderPlan: (Array.isArray(h.kunderPlan) ? h.kunderPlan : []).map((x) => ({ ...x, nyePerMnd: Math.round((Number(x.nyePerMnd) || 0) * f * 10) / 10 })),
});
const flettTech = (basis, over) => { const ut = { ...basis }; for (const g of Object.keys(over || {})) ut[g] = { ...(basis[g] || {}), ...(over[g] || {}) }; return ut; };

/* ── Tween: glir tall/serier mellom verdier (rAF, expo-out) ── */
function useTween(target, ms = 650) {
  const [verdi, setVerdi] = useState(target);
  const fraRef = useRef(target); const rafRef = useRef(0);
  const key = Array.isArray(target) ? target.join(',') : String(target);
  useEffect(() => {
    const fra = fraRef.current; const til = target;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const steg = (now) => {
      const t = utExpo(Math.min(1, (now - start) / ms));
      const v = Array.isArray(til) ? til.map((x, i) => (Array.isArray(fra) && Number.isFinite(fra[i]) ? fra[i] + (x - fra[i]) * t : x)) : (Number.isFinite(fra) ? fra + (til - fra) * t : til);
      setVerdi(v);
      if (t < 1) rafRef.current = requestAnimationFrame(steg); else fraRef.current = til;
    };
    rafRef.current = requestAnimationFrame(steg);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); fraRef.current = Array.isArray(til) ? [...til] : til; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return verdi;
}
/* Print: alle kapitler «aktive» slik at tall og grafer står ferdige på papiret. */
function usePrint() {
  const [p, setP] = useState(false);
  useEffect(() => {
    const paa = () => setP(true); const av = () => setP(false);
    window.addEventListener('beforeprint', paa); window.addEventListener('afterprint', av);
    return () => { window.removeEventListener('beforeprint', paa); window.removeEventListener('afterprint', av); };
  }, []);
  return p;
}

/* ══════════════════════════ Primitiver ══════════════════════════ */
/* Ett kapittel = ett lag som fyller skjermen. pos: 'aktiv' | 'over' | 'under' styrer inn/ut-bevegelsen
   (CSS i roten). Innholdet kan være høyere enn skjermen – da scroller kapitlet innvendig. */
function Side({ id, children, morkt = false, aktiv = false, pos = 'under', bred = false, full = false }) {
  return (
    <section id={`deck-${id}`} data-aktiv={aktiv ? '1' : '0'} data-pos={pos} className="deck-side" style={{ background: morkt ? T.charcoal : T.canvas, color: morkt ? T.offwhite : T.ink }} data-testid={`deck-${id}`} aria-hidden={pos === 'aktiv' ? undefined : 'true'}>
      <div className="deck-side-indre flex min-h-full flex-col justify-center px-6 pb-24 pt-20 sm:px-10 lg:px-16">
        <div className={`mx-auto w-full ${full ? 'max-w-[1640px]' : bred ? 'max-w-[1360px]' : 'max-w-[1180px]'}`}>{children}</div>
      </div>
    </section>
  );
}
const Inn = ({ i = 0, children, className = '', style, strek }) => <div className={`deck-inn ${className}`} data-strek={strek ? '1' : undefined} style={{ '--i': i, ...(typeof strek === 'string' ? { '--strek': strek } : {}), ...style }}>{children}</div>;
const Kapittel = ({ nr, navn, under, morkt = false }) => (
  <Inn i={0} className="flex items-center gap-3">
    <span className="text-[11px] font-semibold tabular-nums tracking-[0.12em]" style={{ color: morkt ? T.lilla : LILLA_M }}>{String(nr).padStart(2, '0')}</span>
    <span aria-hidden="true" className="h-px w-7" style={{ background: `linear-gradient(90deg, ${morkt ? 'rgba(212,150,255,0.65)' : 'rgba(122,63,168,0.5)'}, ${morkt ? 'rgba(212,150,255,0)' : 'rgba(122,63,168,0)'})` }} />
    <span className="text-[12.5px] font-medium tracking-[0.01em]" style={{ color: morkt ? LYS_SVAK : SVAK }}>{navn}{under ? <span style={{ color: morkt ? 'rgba(244,241,234,0.35)' : 'rgba(21,19,15,0.35)' }}> · {under}</span> : null}</span>
  </Inn>
);
/* H2 avsløres ord for ord (som forsidens hero) når kapitlet er aktivt – bare for rene tekststrenger. */
const H2 = ({ children, morkt = false, maks = '16ch', className = '' }) => {
  const ord = typeof children === 'string' ? children.split(' ') : null;
  return (
    <h2 className={`mt-5 text-[38px] sm:text-[52px] lg:text-[60px] ${className}`} style={{ ...display, color: morkt ? T.offwhite : T.ink, maxWidth: maks }}>
      {ord ? ord.map((o, i) => <span key={`${o}-${i}`} className="deck-ord mr-[0.24em]" style={{ '--o': Math.min(i, 14) }}>{o}</span>) : children}
    </h2>
  );
};
/* Punktfelt: 360 punkter = ≈ 570 000 husholdninger som leier. Lilla = 1 % av markedet; den lille = planen. */
function Punktfelt({ enheterPlan = 0, marked = 570000, kol = 36, rader = 10, morkt = false, maxH = 190 }) {
  const n = kol * rader; const perPunkt = marked / n; const enProsent = Math.max(1, Math.round((marked / 100) / perPunkt));
  const planAndel = Math.min(1, enheterPlan / perPunkt); const r = 4.2; const steg = 12; const W = kol * steg; const H = rader * steg;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: maxH }} role="img" aria-label={`${nb(marked)} husholdninger som leier, planen er ${nb(enheterPlan)} enheter`} data-testid="deck-punktfelt">
      {Array.from({ length: rader }, (_, ri) => (
        <g key={ri} className="deck-inn" style={{ '--i': ri * 0.6 }}>
          {Array.from({ length: kol }, (_, ci) => {
            const idx = ri * kol + ci; const erProsent = idx < enProsent; const erPlan = idx === enProsent;
            const cx = ci * steg + steg / 2; const cy = ri * steg + steg / 2;
            if (erPlan) return <g key={ci}><circle cx={cx} cy={cy} r={r} fill="none" stroke={morkt ? T.lilla : LILLA_M} strokeWidth="0.8" strokeDasharray="1.6 1.4" /><circle cx={cx} cy={cy} r={Math.max(0.9, r * Math.sqrt(planAndel))} fill={morkt ? T.lilla : LILLA_M} /></g>;
            return <circle key={ci} cx={cx} cy={cy} r={r} fill={erProsent ? (morkt ? T.lilla : LILLA_M) : (morkt ? 'rgba(244,241,234,0.16)' : 'rgba(21,19,15,0.10)')} />;
          })}
        </g>
      ))}
    </svg>
  );
}
/* Markedsfelt – markedets skala som ett felt: hver prikk ≈ 850 husholdninger. De lilla er 1 % (5 700 enheter);
   den ringede, glødende prikken er planen (≈0,07 %). En myk lilla glød løfter 1 %-klyngen. Radene tones inn i takt
   når kapitlet er aktivt (.deck-inn). Poenget leses på et blunk: ambisjonen er en brøkdel av markedet. */
function Markedsfelt({ enheterPlan = 0, marked = 570000, kol = 42, rader = 16 }) {
  const n = kol * rader; const perPunkt = marked / n;
  const enProsent = Math.max(1, Math.round((marked / 100) / perPunkt));
  const planAndel = Math.min(1, Math.max(0.22, enheterPlan / perPunkt));
  const steg = 13; const r = 3.0; const W = kol * steg; const H = rader * steg;
  const cx = (enProsent * steg) / 2; const cy = steg * 0.5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={`${nb(marked)} husholdninger leier; planen er ca. ${nb(enheterPlan)} enheter (~0,07 %), 1 % er 5 700 enheter`} data-testid="deck-markedsfelt">
      <defs>
        <radialGradient id="mkt-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(139,92,246,0.34)" />
          <stop offset="55%" stopColor="rgba(139,92,246,0.08)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </radialGradient>
      </defs>
      <ellipse className="deck-mkt-glow" cx={cx} cy={cy} rx={(enProsent + 3.5) * steg / 2} ry={steg * 2.6} fill="url(#mkt-glow)" />
      {Array.from({ length: rader }, (_, ri) => (
        <g key={ri} className="deck-inn" style={{ '--i': 2 + ri * 0.42 }}>
          {Array.from({ length: kol }, (_, ci) => {
            const idx = ri * kol + ci; const erProsent = idx < enProsent; const erPlan = idx === enProsent;
            const x = ci * steg + steg / 2; const y = ri * steg + steg / 2;
            if (erPlan) {
              return (
                <g key={ci} data-testid="deck-mkt-plan">
                  <circle className="deck-mkt-ring" cx={x} cy={y} r={r * 2.3} fill="none" stroke={LILLA_M} strokeWidth="0.7" strokeDasharray="1.5 1.3" />
                  <circle cx={x} cy={y} r={Math.max(1.2, r * Math.sqrt(planAndel))} fill={LILLA_M} />
                </g>
              );
            }
            return <circle key={ci} cx={x} cy={y} r={erProsent ? r * 1.08 : r * 0.9} fill={erProsent ? LILLA_M : 'rgba(21,19,15,0.11)'} opacity={erProsent ? 1 : 0.9} />;
          })}
        </g>
      ))}
    </svg>
  );
}
/* Ett ledd i markeds-legenden: fargeprikk (eller ring for planen), etikett, stort tall og en dempet linje. */
function MarkedLegende({ sw, ring = false, over, v, u, fremhev = false }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {ring
          ? <span aria-hidden="true" className="relative flex h-3 w-3 items-center justify-center rounded-full" style={{ boxShadow: `inset 0 0 0 1px ${LILLA_M}` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: LILLA_M }} /></span>
          : <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: sw }} />}
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: fremhev ? LILLA_M : SVAK }}>{over}</span>
      </div>
      <p className="mt-2 text-[23px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.ink }}>{v}</p>
      <p className="mt-1.5 text-[12.5px] leading-[1.4]" style={{ color: SVAK }}>{u}</p>
    </div>
  );
}
/* Bane: akkumulert kontantstrøm (etter skatt) som «rullebane» – bunnen markeres, kapitalen som hentes vises som bånd. */
function Bane({ serie, kapital, bunnIdx, startYm, N, aktiv = true, hoyde = 220, bredde = 1000 }) {
  const mål = useMemo(() => Array.from({ length: N }, (_, i) => (aktiv ? (serie[i] || 0) : 0)), [serie, N, aktiv]);
  const v = useTween(mål, 1000);
  const W = bredde; const H = hoyde; const padL = 8; const padR = 8; const padT = 22; const padB = 26;
  const min = Math.min(0, ...serie, -(kapital || 0)) * 1.08; const maks = Math.max(1, ...serie) * 1.08;
  const x = (i) => padL + ((W - padL - padR) * i) / Math.max(1, N - 1);
  const y = (val) => padT + (H - padT - padB) * (1 - (val - min) / (maks - min));
  const d = v.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join(' ');
  const areal = `${d} L${x(N - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const bunnV = bunnIdx != null ? serie[bunnIdx] : null;
  const aarMerker = Array.from({ length: N }, (_, i) => i).filter((i) => ymDeler(ymPluss(startYm, i)).m === 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Akkumulert kontantstrøm" data-testid="deck-bane">
      {kapital > 0 ? <rect x={padL} y={y(0)} width={W - padL - padR} height={Math.max(0, y(-kapital) - y(0))} fill="rgba(212,150,255,0.10)" /> : null}
      {kapital > 0 ? <line x1={padL} x2={W - padR} y1={y(-kapital)} y2={y(-kapital)} stroke={T.lilla} strokeWidth="1" strokeDasharray="4 6" /> : null}
      <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="rgba(244,241,234,0.35)" strokeWidth="1" />
      <path d={areal} fill="rgba(244,241,234,0.08)" />
      <path d={d} fill="none" stroke={T.offwhite} strokeWidth="2" strokeLinejoin="round" />
      {aarMerker.map((i) => <text key={i} x={x(i)} y={H - 8} fontSize="11" fill="rgba(244,241,234,0.45)" textAnchor="middle">{ymDeler(ymPluss(startYm, i)).y}</text>)}
      {bunnIdx != null && aktiv ? (
        <g>
          <circle cx={x(bunnIdx)} cy={y(v[bunnIdx] || 0)} r="5" fill={T.lilla} />
          <text x={Math.min(W - 160, Math.max(10, x(bunnIdx) - 40))} y={y(bunnV) + 22} fontSize="12" fill={T.lilla}>bunn {mnok(Math.abs(bunnV || 0))} · {mndLabel(startYm, bunnIdx, false)}</text>
        </g>
      ) : null}
      {kapital > 0 ? <text x={W - padR} y={y(-kapital) - 6} fontSize="12" fill={T.lilla} textAnchor="end">hentet kapital {mnok(kapital)}</text> : null}
    </svg>
  );
}
const Etikett = ({ children, farge = SVAK, className = '' }) => <p className={`text-[12.5px] font-medium ${className}`} style={{ color: farge }}>{children}</p>;
/* Ingress under H2 – samme stemme som forsidens seksjonsingresser. */
const Ingress = ({ children, morkt = false, i = 2, maks = '46ch', className = '' }) => <Inn i={i}><p className={`mt-6 text-[16px] leading-[1.55] sm:text-[18px] ${className}`} style={{ color: morkt ? LYS : DIM, maxWidth: maks }}>{children}</p></Inn>;
/* Redaksjonelt oppsett som forsiden: overskrift + ingress til venstre (5/12), innholdet til høyre (7/12). Stables på mobil. */
const Todelt = ({ venstre, children, className = '', bredHoyre = false }) => (
  <div className={`mt-2 grid gap-10 lg:grid-cols-12 lg:gap-14 ${className}`}>
    <div className={bredHoyre ? 'lg:col-span-4' : 'lg:col-span-5'}>{venstre}</div>
    <div className={bredHoyre ? 'lg:col-span-8' : 'lg:col-span-7'}>{children}</div>
  </div>
);
/* Hårlinje-kolonne som forsidens «veiskille»: ikon, tittel i display, tekst, hårlinjerader. Ingen boks – luft og hårlinjer. */
const Kolonne = ({ i = 0, ikon: Ikon, over, tittel, tekst, rader = [], morkt = false, fot, className = '', testid }) => (
  <Inn i={i} className={`border-t pt-5 ${className}`} style={{ borderColor: morkt ? LYS_HAIR : HAIR }} data-testid={testid}>
    {(Ikon || over) ? <p className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: morkt ? T.lilla : LILLA_M }}>{Ikon ? <Ikon className="h-4 w-4" /> : null}{over}</p> : null}
    {tittel ? <p className={`${(Ikon || over) ? 'mt-3' : ''} text-[26px] sm:text-[30px]`} style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: morkt ? T.offwhite : T.ink }}>{tittel}</p> : null}
    {tekst ? <p className="mt-3 text-[14.5px] leading-[1.55]" style={{ color: morkt ? LYS : DIM }}>{tekst}</p> : null}
    {rader.length ? (
      <ul className="mt-5">
        {rader.map((r, ri) => {
          const [t, u] = Array.isArray(r) ? r : [r, null];
          return (
            <li key={ri} className="border-t py-3" style={{ borderColor: morkt ? LYS_HAIR : HAIR }}>
              <p className="text-[15px] font-medium leading-[1.35]" style={{ color: morkt ? T.offwhite : T.ink }}>{t}</p>
              {u ? <p className="mt-1 text-[13.5px] leading-[1.5]" style={{ color: morkt ? LYS : DIM }}>{u}</p> : null}
            </li>
          );
        })}
      </ul>
    ) : null}
    {fot}
  </Inn>
);
/* Løftet kort (verdensklasse): hvit flate med dybde, ikon-chip, over-etikett, tittel, rader og fot. Brukes der det gir
   «produkt»-følelse (tilbud / veier inn). Kortene er like høye (fot forankres i bunn), så raden står som ett system. */
const Kort = ({ i = 0, ikon: Ikon, over, tittel, rader = [], fot, className = '', testid }) => (
  <Inn i={i} className={`deck-kort-stor flex flex-col ${className}`} data-testid={testid}>
    {Ikon ? <span className="deck-kort-stor-ikon"><Ikon className="h-[18px] w-[18px]" strokeWidth={1.7} /></span> : null}
    {over ? <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.13em]" style={{ color: LILLA_M }}>{over}</p> : null}
    {tittel ? <p className="mt-2 text-[22px] sm:text-[25px]" style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.06, color: T.ink }}>{tittel}</p> : null}
    {rader.length ? (
      <div className="mt-4 flex flex-col gap-2.5">
        {rader.map((r, ri) => <p key={ri} className="text-[14px] leading-[1.5]" style={{ color: DIM }}>{r}</p>)}
      </div>
    ) : null}
    {fot ? <div className="mt-auto pt-6">{fot}</div> : null}
  </Inn>
);

/* Nøkkeltall i display – som forsidens tallpar. */
const Fakta = ({ v, u, morkt = false, stor = false }) => (
  <div>
    <p className={stor ? 'text-[44px] sm:text-[56px]' : 'text-[26px] sm:text-[30px]'} style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1, color: morkt ? T.offwhite : T.ink }}>{v}</p>
    <p className="mt-2 text-[12.5px] leading-[1.4]" style={{ color: morkt ? LYS_SVAK : SVAK }}>{u}</p>
  </div>
);

/* Tall som teller opp når kapitlet blir aktivt, og glir ved endringer. */
function Tall({ verdi, format = mnok, storrelse = 'text-[40px] lg:text-[54px]', farge = T.ink, aktiv = true, testid }) {
  const v = useTween(aktiv ? (Number(verdi) || 0) : 0, 900);
  const str = format(v); const i = str.lastIndexOf(' ');
  const tall = i > 0 ? str.slice(0, i) : str; const enhet = i > 0 ? str.slice(i + 1) : '';
  return (
    <p className={`whitespace-nowrap ${storrelse}`} style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1, color: farge }} data-testid={testid}>
      {tall}{enhet ? <span className="ml-[0.16em] text-[0.4em]" style={{ letterSpacing: '-0.01em', opacity: 0.66 }}>{enhet}</span> : null}
    </p>
  );
}
function Nokkel({ label, tall, tekst, delta, format = mnok, negativRod = false, morkt = false, aktiv = true, storrelse = 'text-[26px] lg:text-[32px]' }) {
  const farge = morkt ? T.offwhite : (negativRod && tall < 0 ? FARGE.kost : T.ink);
  return (
    <div className="min-w-0">
      <Etikett farge={morkt ? LYS_SVAK : SVAK}>{label}</Etikett>
      <div className="mt-1.5">
        {tall !== null && tall !== undefined ? <Tall verdi={tall} format={format} storrelse={storrelse} farge={farge} aktiv={aktiv} /> : <p className={`${storrelse}`} style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: farge }}>{tekst}</p>}
      </div>
      <p className="mt-1.5 text-[12px]" style={{ color: delta ? (morkt ? T.lilla : LILLA_M) : (morkt ? 'rgba(244,241,234,0.35)' : 'rgba(21,19,15,0.35)') }}>{delta ? `${delta} mot planen` : 'som planlagt'}</p>
    </div>
  );
}
const DlRad = ({ l, v, morkt = false, fet = false }) => (
  <div className="flex items-baseline justify-between gap-4 border-b py-2.5" style={{ borderColor: morkt ? LYS_HAIR : HAIR }}>
    <dt className="text-[13.5px]" style={{ color: morkt ? LYS : DIM }}>{l}</dt>
    <dd className={`whitespace-nowrap text-[14.5px] ${fet ? 'font-semibold' : 'font-medium'}`} style={{ color: morkt ? T.offwhite : T.ink }}>{v}</dd>
  </div>
);
function Skru({ label, verdi, min, max, steg, format, onChange, onFerdig, basis, hint, testid }) {
  const endret = basis !== undefined && Math.abs(Number(verdi) - Number(basis)) > 1e-9;
  return (
    <label className="block py-2.5" data-testid={testid}>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[13.5px]" style={{ color: DIM }}>{label}</span>
        <span className="whitespace-nowrap text-[14px] font-medium" style={{ color: endret ? LILLA_M : T.ink }}>{format(verdi)}{endret ? <span className="ml-1.5 text-[11.5px] font-normal" style={{ color: SVAK }}>plan {format(basis)}</span> : null}</span>
      </span>
      {hint ? <span className="mt-0.5 block text-[11.5px]" style={{ color: SVAK }}>{hint}</span> : null}
      <input type="range" min={min} max={max} step={steg} value={verdi} onChange={(e) => onChange(Number(e.target.value))} onPointerUp={onFerdig} className="dh-slider mt-2 w-full" />
    </label>
  );
}
/* Vannrett andelsbar (bruk av midler, S&M-miks) */
function AndelBar({ deler, morkt = false, aktiv = true }) {
  const tot = deler.reduce((s, d) => s + d.v, 0) || 1;
  const bredder = useTween(aktiv ? deler.map((d) => (d.v / tot) * 100) : deler.map(() => 0), 900);
  return (
    <div>
      <div className="flex h-[10px] w-full overflow-hidden rounded-full" style={{ background: morkt ? 'rgba(244,241,234,0.08)' : 'rgba(21,19,15,0.06)' }}>
        {deler.map((d, i) => <span key={d.l} className="h-full" style={{ width: `${bredder[i]}%`, background: d.f, transition: 'width 120ms linear' }} />)}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {deler.map((d) => (
          <div key={d.l} className="flex items-baseline gap-2 text-[12.5px]">
            <span className="mt-[2px] inline-block h-2.5 w-2.5 shrink-0 self-center rounded-[3px]" style={{ background: d.f }} />
            <span style={{ color: morkt ? LYS : DIM }}>{d.l}</span>
            <span className="font-medium" style={{ color: morkt ? T.offwhite : T.ink }}>{mnok(d.v)}</span>
            <span style={{ color: morkt ? LYS_SVAK : SVAK }}>{Math.round((d.v / tot) * 100)} %</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════ Grafer ══════════════════════════ */
/* Stablede inntektslag + kostnadslinje + break-even. Bygger seg fra grunnlinjen når aktiv; peker viser måned. */
function LagGraf({ lag, kost, beIdx, startYm, N, hoyde = 340, bredde = 1000, kompakt = false, morkt = false, aktiv = true, testid }) {
  const flat = useMemo(() => lag.flatMap((l) => Array.from({ length: N }, (_, i) => (aktiv ? Math.max(0, l.serie[i] || 0) : 0))), [lag, N, aktiv]);
  const flatT = useTween(flat, 900);
  const serier = lag.map((_, li) => flatT.slice(li * N, (li + 1) * N));
  const kostT = useTween(aktiv ? kost : kost.map(() => 0), 900);
  const [hov, setHov] = useState(null);
  const W = bredde; const H = hoyde; const padL = 52; const padR = 12; const padT = 26; const padB = 30;
  const topp = Array.from({ length: N }, (_, i) => serier.reduce((s, sr) => s + (sr[i] || 0), 0));
  // Aksen følger de reelle verdiene (ikke de tweenede) – søylene vokser mot en stabil skala
  const toppReell = Array.from({ length: N }, (_, i) => lag.reduce((s, l) => s + Math.max(0, l.serie[i] || 0), 0));
  const maks = Math.max(1, ...toppReell, ...kost) * 1.12;
  const x = (i) => padL + ((W - padL - padR) * (i + 0.5)) / N;
  const y = (v) => padT + (H - padT - padB) * (1 - v / maks);
  const bw = Math.max(4, ((W - padL - padR) / N) * 0.62);
  const svak = morkt ? LYS_SVAK : SVAK; const hair = morkt ? LYS_HAIR : HAIR;
  const pek = (e) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; const i = klem(Math.round(((px - padL) / (W - padL - padR)) * N - 0.5), 0, N - 1); setHov(i); };
  const res = hov !== null ? topp[hov] - (kost[hov] || 0) : 0;
  return (
    <div className="relative" onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-none" role="img" aria-label="Inntekt per lag og kostnader per måned" data-testid={testid} onMouseMove={pek}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y(maks * f)} y2={y(maks * f)} stroke={hair} />
            <text x={padL - 8} y={y(maks * f) + 4} textAnchor="end" fontSize="11" fill={svak}>{maks * f >= 1e6 ? `${(maks * f / 1e6).toFixed(1)} M` : `${Math.round(maks * f / 1000)} k`}</text>
          </g>
        ))}
        {hov !== null ? <rect x={x(hov) - bw / 2 - 5} y={padT - 6} width={bw + 10} height={H - padT - padB + 6} rx="6" fill={morkt ? 'rgba(244,241,234,0.06)' : 'rgba(21,19,15,0.045)'} /> : null}
        {Array.from({ length: N }, (_, i) => {
          let base = 0;
          return (
            <g key={i}>
              {serier.map((sr, li) => { const v = Math.max(0, sr[i] || 0); const el = <rect key={li} x={x(i) - bw / 2} y={y(base + v)} width={bw} height={Math.max(0, y(base) - y(base + v))} fill={lag[li].farge} rx="2" opacity={lag[li].opacity ?? 1} />; base += v; return el; })}
            </g>
          );
        })}
        <polyline fill="none" stroke={FARGE.kost} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" points={kostT.map((v, i) => `${x(i)},${y(Math.max(0, v))}`).join(' ')} />
        {aktiv && beIdx !== null && beIdx !== undefined ? (
          <g>
            <line x1={x(beIdx)} x2={x(beIdx)} y1={padT - 4} y2={H - padB} stroke={T.gronn} strokeDasharray="3 5" strokeWidth="1.5" />
            <text x={x(beIdx) > W - 180 ? x(beIdx) - 8 : x(beIdx) + 8} y={padT + 4} textAnchor={x(beIdx) > W - 180 ? 'end' : 'start'} fontSize="12" fill={T.gronn} fontWeight="600">Break-even · {mndLabel(startYm, beIdx)}</text>
          </g>
        ) : null}
        {Array.from({ length: N }, (_, i) => i).filter((i) => i % (kompakt || W < 700 ? 6 : 3) === 0).map((i) => (
          <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill={svak}>{mndLabel(startYm, i)}</text>
        ))}
      </svg>
      {hov !== null ? (
        <div className="pointer-events-none absolute top-0 rounded-[12px] px-3 py-2 text-[12px] shadow-[0_12px_32px_rgba(20,17,14,0.18)]" style={{ left: `${klem((x(hov) / W) * 100, 8, 78)}%`, background: morkt ? '#2b2822' : '#fff', color: morkt ? T.offwhite : T.ink, minWidth: 170 }}>
          <p className="font-semibold">{mndLabel(startYm, hov, false)}</p>
          {lag.map((l) => <p key={l.navn || l.farge} className="mt-0.5 flex justify-between gap-4" style={{ color: morkt ? LYS : DIM }}><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: l.farge }} />{l.navn || 'Inntekt'}</span><span>{nb(l.serie[hov] || 0)}</span></p>)}
          <p className="mt-0.5 flex justify-between gap-4" style={{ color: morkt ? LYS : DIM }}><span className="flex items-center gap-1.5"><span className="h-[2px] w-2" style={{ background: FARGE.kost }} />Kostnader</span><span>{nb(kost[hov] || 0)}</span></p>
          <p className="mt-1 flex justify-between gap-4 border-t pt-1 font-semibold" style={{ borderColor: morkt ? LYS_HAIR : HAIR, color: res >= 0 ? T.gronn : FARGE.kost }}><span>Resultat</span><span>{res >= 0 ? '' : '−'}{nb(Math.abs(res))}</span></p>
        </div>
      ) : null}
    </div>
  );
}

/* Payback-visual: hvor mange måneder bidraget bruker på å betale tilbake full CAC. */
function Payback({ mnd, maks = 24, cacDeler, bidrag, ltvCac, morkt = true, aktiv = true }) {
  const andel = useTween(aktiv && mnd ? klem(mnd / maks, 0, 1) * 100 : 0, 900);
  const cacTot = cacDeler.reduce((s, d) => s + d.v, 0) || 1;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12.5px]" style={{ color: morkt ? LYS_SVAK : SVAK }}>Payback · full CAC {kr(cacTot)}</p>
        <p className="text-[12.5px]" style={{ color: morkt ? LYS_SVAK : SVAK }}>{ltvCac ? `LTV/CAC ${nb(ltvCac, 1)}×` : ''}</p>
      </div>
      <div className="relative mt-2 h-[26px] w-full overflow-hidden rounded-[8px]" style={{ background: morkt ? 'rgba(244,241,234,0.08)' : 'rgba(21,19,15,0.06)' }}>
        <div className="absolute inset-y-0 left-0 flex overflow-hidden rounded-[8px]" style={{ width: `${andel}%`, transition: 'width 120ms linear' }}>
          {cacDeler.map((d) => <span key={d.l} className="h-full" style={{ width: `${(d.v / cacTot) * 100}%`, background: d.f }} title={`${d.l}: ${kr(d.v)}`} />)}
        </div>
        {[6, 12, 18].map((m) => <span key={m} className="absolute inset-y-0 w-px" style={{ left: `${(m / maks) * 100}%`, background: morkt ? 'rgba(244,241,234,0.18)' : 'rgba(21,19,15,0.15)' }} />)}
        <span className="absolute inset-y-0 right-2 flex items-center text-[11px]" style={{ color: morkt ? LYS_SVAK : SVAK }}>{maks} mnd</span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px]">
        <span className="text-[18px] font-medium" style={{ ...display, letterSpacing: '-0.02em', color: morkt ? T.offwhite : T.ink }}>{mnd ? `${nb(mnd, 1)} mnd` : '–'}</span>
        <span style={{ color: morkt ? LYS_SVAK : SVAK }}>bidrag {kr(bidrag)}/mnd</span>
        {cacDeler.map((d) => <span key={d.l} className="flex items-center gap-1.5" style={{ color: morkt ? LYS_SVAK : SVAK }}><span className="h-2 w-2 rounded-[2px]" style={{ background: d.f }} />{d.l} {kr(d.v)}</span>)}
      </div>
    </div>
  );
}

/* Tidslinje: perioden som én linje med merker for break-even (DH, Tech, konsern) og kapitalbunn. */
function Tidslinje({ N, startYm, merker, morkt = true, aktiv = true }) {
  const vekst = useTween(aktiv ? 100 : 0, 1100);
  return (
    <div className="relative pt-9">
      <div className="relative h-[3px] w-full rounded-full" style={{ background: morkt ? 'rgba(244,241,234,0.12)' : 'rgba(21,19,15,0.1)' }}>
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${vekst}%`, background: morkt ? 'rgba(244,241,234,0.4)' : 'rgba(21,19,15,0.3)', transition: 'width 120ms linear' }} />
        {merker.filter((m) => m.idx !== null && m.idx !== undefined).map((m) => {
          const left = ((m.idx + 0.5) / N) * 100;
          return (
            <div key={m.l} className="absolute -translate-x-1/2" style={{ left: `${left}%`, top: -7, opacity: aktiv ? 1 : 0, transition: `opacity 600ms ${EASE} ${200 + m.idx * 12}ms` }}>
              <span className="block h-[17px] w-[17px] rounded-full border-[3px]" style={{ background: m.f, borderColor: morkt ? T.charcoal : T.canvas }} />
              <span className={`absolute left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[11.5px] sm:block ${m.opp ? 'bottom-[26px]' : 'top-[24px]'}`} style={{ color: morkt ? LYS : DIM }}>
                <b style={{ color: morkt ? T.offwhite : T.ink }}>{m.l}</b> · {mndLabel(startYm, m.idx)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-9 flex justify-between text-[11px]" style={{ color: morkt ? LYS_SVAK : SVAK }}>
        <span>{mndLabel(startYm, 0, false)}</span><span>{mndLabel(startYm, N - 1, false)}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] sm:hidden">
        {merker.filter((m) => m.idx !== null && m.idx !== undefined).map((m) => <span key={m.l} className="flex items-center gap-1.5" style={{ color: morkt ? LYS : DIM }}><span className="h-2 w-2 rounded-full" style={{ background: m.f }} />{m.l} · {mndLabel(startYm, m.idx)}</span>)}
      </div>
      {merker.filter((m) => m.idx === null || m.idx === undefined).length ? <p className="mt-2 text-[12px]" style={{ color: morkt ? LYS_SVAK : SVAK }}>Utenfor perioden: {merker.filter((m) => m.idx === null || m.idx === undefined).map((m) => m.l).join(', ')}</p> : null}
    </div>
  );
}
/* Årsstolper: konserninntekt per år som stablede søyler (Digihome AS nederst, Tech · ekstern øverst) med kostnadsnivået
   som stiplet strek – veksten og lønnsomheten år for år leses på et blunk. Søylene vokser fra grunnlinjen når sliden er
   aktiv (.deck-stolpe, --i-stagger), verdier og kostnadsstrek kommer etterpå (.deck-stolpe-tekst). */
function AarStolper({ aar = [], startYm, hoyde = 230 }) {
  const maks = Math.max(1, ...aar.map((a) => Math.max(a.inntekt || 0, a.kost || 0)));
  const h = (v) => `${Math.max(0, ((Number(v) || 0) / maks) * 100)}%`;
  return (
    <div data-testid="deck-budsjett-stolper">
      <div className="relative flex items-end justify-between gap-3 sm:gap-4" style={{ height: hoyde, paddingTop: 30 }}>
        {aar.map((a, i) => {
          const te = Math.max(0, (a.tech?.inntekt || 0) - (a.eliminert || 0));
          const topp = Math.max(a.inntekt || 0, a.kost || 0);
          return (
            <div key={a.nr} className="relative flex h-full flex-1 flex-col justify-end">
              <div className="deck-stolpe-tekst absolute left-0 right-0 text-center" style={{ '--i': i, bottom: `calc(${h(topp)} + 8px)` }}>
                <p className="whitespace-nowrap text-[13px] font-semibold tabular-nums" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }}>{mnok(a.inntekt)}</p>
              </div>
              <div className="deck-stolpe relative flex w-full flex-col justify-end overflow-hidden rounded-t-[7px]" style={{ '--i': i, height: h(a.inntekt) }}>
                {te > 0 && a.inntekt > 0 ? <span className="block w-full" style={{ height: `${(te / a.inntekt) * 100}%`, background: FARGE.tech }} /> : null}
                <span className="block w-full flex-1" style={{ background: FARGE.dh }} />
              </div>
              <span aria-hidden="true" className="deck-stolpe-tekst absolute -left-1.5 -right-1.5 h-0 border-t border-dashed" style={{ '--i': i, bottom: h(a.kost), borderColor: FARGE.kost }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex justify-between gap-3 sm:gap-4">
        {aar.map((a, i) => (
          <div key={a.nr} className="deck-stolpe-tekst flex-1 text-center" style={{ '--i': i }}>
            <p className="text-[12px] font-semibold" style={{ color: T.ink }}>År {a.nr}</p>
            <p className="text-[10.5px] leading-[1.3]" style={{ color: SVAK }}>{mndLabel(startYm, a.fraIdx)} – {mndLabel(startYm, a.tilIdx)}</p>
            <p className="mt-1 text-[12px] font-semibold tabular-nums" style={{ color: (a.resultat || 0) >= 0 ? T.gronn : FARGE.kost }}>{(a.resultat || 0) >= 0 ? '+' : '−'}{mnok(Math.abs(a.resultat || 0))}</p>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ══════════════════════════ Diagrammer ══════════════════════════ */
/* Strukturen: plattformkunder → Tech ← Digihome AS ← boligeiere. Lisensstrømmen elimineres i konsernet. */
function Strukturdiagram({ basisT, basisF, prisHuseier }) {
  const Node = ({ tittel, under, barn, tone = 'lys', ikon: Ikon, testid }) => (
    <div className="rounded-[22px] p-5 sm:p-6" data-testid={testid} style={tone === 'mork' ? { background: T.charcoal, color: T.offwhite } : tone === 'lilla' ? { background: '#F6F0FB', boxShadow: `inset 0 0 0 1px rgba(122,63,168,0.22)` } : { background: '#FBFAF8', boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
      <p className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: tone === 'mork' ? LYS : tone === 'lilla' ? LILLA_M : DIM }}>{Ikon ? <Ikon className="h-3.5 w-3.5" /> : null}{tittel}</p>
      <p className="mt-1.5 text-[19px] sm:text-[21px]" style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.05, color: tone === 'mork' ? T.offwhite : T.ink }}>{under}</p>
      {barn}
    </div>
  );
  const Strom = ({ tekst, under, retning = 'h', farge = LILLA_M, dashed = true }) => (
    <div className={`flex items-center justify-center ${retning === 'h' ? 'lg:w-[128px]' : 'py-2'}`}>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <svg viewBox="0 0 120 32" className={`${retning === 'h' ? 'hidden h-8 w-[120px] lg:block' : 'block h-8 w-8 rotate-90'}`} aria-hidden>
          <path d="M6 16 H106" fill="none" stroke={farge} strokeWidth="2" className={dashed ? 'deck-strom' : ''} strokeLinecap="round" />
          <path d="M98 9 L108 16 L98 23" fill="none" stroke={farge} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="max-w-[128px] text-[11.5px] font-medium leading-tight" style={{ color: farge }}>{tekst}</p>
        {under ? <p className="max-w-[128px] text-[10.5px] leading-tight" style={{ color: SVAK }}>{under}</p> : null}
      </div>
    </div>
  );
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto_1.15fr_auto_1fr] lg:items-center" data-testid="deck-struktur">
      <Inn i={2}>
        <Node tittel="Plattformkunder" under="Huseiere og eiendomsselskaper" ikon={Home} barn={
          <dl className="mt-3 border-t" style={{ borderColor: HAIR }}>
            <DlRad l="Huseier · selvbetjent" v={prisHuseier || '–'} />
            <DlRad l="Eiendomsselskap · per enhet" v={basisT ? `${kr(basisT.bedrift.pris)}/mnd` : '–'} />
          </dl>
        } />
      </Inn>
      <Inn i={3}><Strom tekst="abonnement" under="hele Norge · selvbetjent" /></Inn>
      <Inn i={4}>
        <Node tone="lilla" tittel="Digihome Tech AS" under="Programvaren. Én prisliste." testid="deck-node-tech" barn={
          <>
            <p className="mt-3 text-[13px] leading-[1.5]" style={{ color: DIM }}>Leietakere, kontrakt med BankID, husleie og drift – som SaaS. Kostnadsbasen er utvikling, hosting og support.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{['Selvbetjening', 'Bedrift', 'Lisens til forvaltningen'].map((c) => <span key={c} className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: 'rgba(122,63,168,0.1)', color: LILLA_M }}>{c}</span>)}</div>
          </>
        } />
      </Inn>
      <Inn i={5}><Strom tekst={`lisens ${basisT ? kr(basisT.forvaltning.pris) : kr(basisF.systemPerEnhet)} per enhet/mnd`} under="Tech-inntekt = DH-kostnad · elimineres i konsernet" /></Inn>
      <Inn i={6}>
        <Node tone="mork" tittel="Digihome AS" under="Forvaltningen. Én fast forvalter." ikon={Building2} testid="deck-node-dh" barn={
          <dl className="mt-3 border-t" style={{ borderColor: LYS_HAIR }}>
            <DlRad morkt l="Honorar · av leien (inkl. mva)" v={pct(basisF.honorarPctNye, 1)} />
            <DlRad morkt l="Enheter per forvalter" v={nb(basisF.enheterPerAarsverk)} />
            <DlRad morkt l="Område" v="Bergen · 60 km" />
          </dl>
        } />
      </Inn>
    </div>
  );
}

/* ══════════════════════════ Svinghjulet (Strukturen · konsept) ══════════════════════════ */
/* Strukturens ÉN idé: et svinghjul. Forvaltningen (Digihome AS) er Techs største kunde, salgsapparat og bevis på én
   gang. Fire steg går rundt med klokka; i navet står de to selskapene med lisensen som nettes ut i konsernet. Ringen
   ruller svakt (respekterer reduced-motion). Desktop = hjul; mobil = vertikal nummerert loop. */
const HJUL = [
  { n: 1, v: 270, t: 'Vi forvalter flere boliger', u: 'Digihome AS vokser lokalt' },
  { n: 2, v: 0, t: 'Hver bolig betaler og lærer opp plattformen', u: 'lisens, data og ekte referanser' },
  { n: 3, v: 90, t: 'Plattformen blir bedre og billigere', u: 'kostnaden per bolig faller' },
  { n: 4, v: 180, t: 'Salget går lettere', u: 'og inntekten gjør runden på nytt' },
];
function HjulNav() {
  return (
    <div className="flex w-[188px] flex-col items-center gap-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: SVAK }}>Motoren</p>
      <span className="w-full rounded-full px-3 py-1.5 text-[12.5px] font-semibold" style={{ background: '#F6F0FB', color: LILLA_M, boxShadow: 'inset 0 0 0 1px rgba(122,63,168,0.22)' }}>Digihome Tech</span>
      <span className="deck-hjul-lisens inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: LILLA_M }}><ArrowUp className="h-3 w-3" strokeWidth={2} />lisens · nuller seg ut i konsern<ArrowDown className="h-3 w-3" strokeWidth={2} /></span>
      <span className="w-full rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: T.charcoal }}>Digihome AS</span>
    </div>
  );
}
function HjulKort({ n, t, u }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[14px] bg-white px-3.5 py-3" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}, 0 16px 34px -18px rgba(21,19,15,0.24)` }}>
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: LILLA_M }}>{n}</span>
      <span className="text-left leading-tight">
        <span className="block text-[13px] font-semibold" style={{ color: T.ink }}>{t}</span>
        <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: SVAK }}>{u}</span>
      </span>
    </div>
  );
}
function Svinghjul() {
  const R = 36;
  const pkt = (v) => ({ x: 50 + R * Math.cos((v * Math.PI) / 180), y: 50 + R * Math.sin((v * Math.PI) / 180) });
  const chevrons = [45, 135, 225, 315];
  return (
    <div data-testid="deck-svinghjul">
      {/* Desktop: hjulet */}
      <div className="relative mx-auto hidden aspect-square w-full max-w-[600px] sm:block">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
          {/* 1) ringen tegner seg inn når kapitlet åpnes */}
          <circle className="deck-hjul-tegn" cx="50" cy="50" r={R} stroke="rgba(122,63,168,0.22)" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="226.2" vectorEffect="non-scaling-stroke" />
          {/* 2) stiplet ring som ruller – hjulet går */}
          <circle className="deck-hjul-rot" cx="50" cy="50" r={R} stroke={LILLA_M} strokeWidth="1.3" strokeLinecap="round" strokeDasharray="0.6 6" vectorEffect="non-scaling-stroke" />
          {/* retning: med klokka */}
          {chevrons.map((a) => {
            const p = pkt(a); const cos = Math.cos((a * Math.PI) / 180); const sin = Math.sin((a * Math.PI) / 180);
            const rot = (Math.atan2(cos, -sin) * 180) / Math.PI;
            return <g key={a} className="deck-hjul-chev" transform={`translate(${p.x} ${p.y}) rotate(${rot})`}><path d="M-2 -2.4 L2.2 0 L-2 2.4" fill="none" stroke={LILLA_M} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></g>;
          })}
          {/* 3) verdien som sirkulerer: en glødende prikk går rundt hjulet */}
          <g className="deck-hjul-orbit">
            <circle cx="50" cy={50 - R} r="3.4" fill={LILLA_M} opacity="0.18" />
            <circle cx="50" cy={50 - R} r="1.7" fill={LILLA_M} />
          </g>
        </svg>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><div className="deck-inn flex justify-center" style={{ '--i': 13 }}><HjulNav /></div></div>
        {HJUL.map((s) => {
          const p = pkt(s.v);
          return (
            <div key={s.n} className="absolute w-[168px] -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <div className="deck-inn" style={{ '--i': 3 + s.n * 2.2 }}><HjulKort {...s} /></div>
            </div>
          );
        })}
      </div>
      {/* Mobil: vertikal loop */}
      <div className="sm:hidden">
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: '#F6F0FB', color: LILLA_M, boxShadow: 'inset 0 0 0 1px rgba(122,63,168,0.22)' }}>Digihome Tech</span>
          <span className="text-[10px] font-medium" style={{ color: SVAK }}>⇄ lisens</span>
          <span className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: T.charcoal }}>Digihome AS</span>
        </div>
        <ol className="relative space-y-3">
          <span aria-hidden="true" className="absolute left-[13px] top-3 bottom-3 w-px" style={{ background: 'rgba(122,63,168,0.25)' }} />
          {HJUL.map((s) => <li key={s.n} className="relative"><HjulKort {...s} /></li>)}
        </ol>
      </div>
    </div>
  );
}

/* Organisasjonskart: styre → ledelse → to selskaper med funksjoner. Linjer tegnes når kapitlet er aktivt.
   Styret er felles for Digihome AS og Digihome Tech AS: Erik (leder), Jens-Petter, Sarah og Martin. */
const TEAM = [
  { n: 'Sarah Sleeman', r: 'Daglig leder · styremedlem', kort: 'Daglig leder', img: '/team-sarah.webp', pos: '50% 20%', s: 'Eiendomsmegler, seks år i rådgivende roller i DNB. Leder kundeakkvisisjon og forvaltning. Styremedlem i begge selskaper.' },
  { n: 'Martin C. Kviteberg', r: 'Produktsjef · styremedlem', kort: 'Produktsjef', img: '/team/martin-kviteberg-face.jpg', pos: 'top', s: 'Gründer av BnbSpesialisten – en av Norges første profesjonelle utleieforvaltere. 10 år i Adonis AS frem mot exit. Styremedlem i begge selskaper.' },
  { n: 'Erik Hoffmann-Dahl', r: 'Styreleder · begge selskaper', kort: 'Styreleder', img: '/team-erik.webp', pos: 'top', s: 'Advokat og partner i Hoffmann Thinn. Tegnet selskapsstrukturen som skal bære vekst og emisjon.' },
  { n: 'Kevin Ha', r: 'AI-rådgiver', kort: 'AI-rådgiver', img: '/team/kevin-ai.jpg', pos: '50% 16%', s: 'Analytiker i DNB, siviløkonom NHH. Bygger og automatiserer plattformen med AI-drevet utvikling.' },
  { n: 'Jens-Petter Glittenberg', r: 'Styremedlem · begge selskaper', kort: 'Styremedlem', img: '/team/jens-petter-glittenberg.webp', pos: '50% 30%', s: 'Styremedlem i Digihome AS og Digihome Tech AS.' },
];
function Person({ p, liten = false, rolle }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ${liten ? 'h-10 w-10' : 'h-12 w-12'}`} style={{ boxShadow: `0 0 0 2px ${T.canvas}, 0 0 0 3px ${HAIR}`, background: p.img ? undefined : T.charcoal }}>
        {p.img ? <img src={p.img} alt={p.n} className="h-full w-full object-cover" style={{ objectPosition: p.pos }} loading="lazy" />
          : <span className="text-[13px] font-semibold" style={{ color: T.offwhite, letterSpacing: '0.02em' }}>{p.n.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('')}</span>}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold leading-[1.15]" style={{ color: T.ink }}>{p.n}</span>
        <span className="mt-0.5 block text-[11.5px] leading-[1.2]" style={{ color: LILLA_M }}>{rolle || p.r}</span>
      </span>
    </div>
  );
}
/* Stort, redaksjonelt portrettkort: foto med navn/rolle brent inn nederst + én drepende referanse under.
   zoom + zoomPos lar oss croppe tettere på ansiktet (matche innramming på tvers av bilder). */
function PortrettKort({ p, rolle, cred, zoom = 1, zoomPos = '50% 24%' }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[20px] bg-white" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}, 0 24px 50px -28px rgba(21,19,15,0.3)` }}>
      <div className="relative aspect-[4/5] w-full overflow-hidden" style={{ background: T.charcoal }}>
        {p.img
          ? <img src={p.img} alt={p.n} className="h-full w-full object-cover" style={{ objectPosition: p.pos, transform: zoom !== 1 ? `scale(${zoom})` : undefined, transformOrigin: zoomPos }} loading="lazy" />
          : <span className="flex h-full w-full items-center justify-center text-[28px] font-semibold" style={{ color: T.offwhite }}>{p.n.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('')}</span>}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5" style={{ background: 'linear-gradient(180deg, transparent, rgba(17,15,12,0.72))' }} />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-[16.5px] font-semibold leading-tight text-white">{p.n}</p>
          <p className="mt-0.5 text-[12px] font-medium tracking-[0.01em]" style={{ color: 'rgba(255,255,255,0.85)' }}>{rolle || p.r}</p>
        </div>
      </div>
      <p className="flex-1 px-4 py-3.5 text-[12.5px] leading-[1.5]" style={{ color: DIM }}>{cred || p.s}</p>
    </div>
  );
}
function OrgKart({ aarsverkStart, aarsverkSlutt, utviklingPerMnd, enheterPerAarsverk }) {
  const Boks = ({ children, className = '', tone = 'lys', testid }) => (
    <div className={`rounded-[20px] p-4 sm:p-5 ${className}`} data-testid={testid} style={tone === 'mork' ? { background: T.charcoal, color: T.offwhite } : tone === 'lilla' ? { background: '#F6F0FB', boxShadow: 'inset 0 0 0 1px rgba(122,63,168,0.22)' } : { background: '#FBFAF8', boxShadow: `inset 0 0 0 1px ${HAIR}` }}>{children}</div>
  );
  const Linje = ({ className = '', style }) => <div className={`deck-linje ${className}`} style={{ background: 'rgba(21,19,15,0.22)', ...style }} />;
  const Funksjoner = ({ liste, morkt = false }) => (
    <ul className="mt-3 grid gap-1.5">{liste.map(([t, u]) => <li key={t} className="flex items-baseline justify-between gap-3 border-t pt-1.5 text-[12.5px]" style={{ borderColor: morkt ? LYS_HAIR : HAIR }}><span className="font-medium" style={{ color: morkt ? T.offwhite : T.ink }}>{t}</span><span className="text-right text-[11.5px]" style={{ color: morkt ? LYS_SVAK : SVAK }}>{u}</span></li>)}</ul>
  );
  return (
    <div className="relative mx-auto max-w-[1080px]" data-testid="deck-orgkart">
      {/* Styret – felles for begge selskaper: Erik (leder), Jens-Petter, Sarah, Martin */}
      <Inn i={2} className="mx-auto max-w-[1000px]">
        <Boks testid="deck-org-styret">
          <p className="flex items-baseline justify-between text-[11.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: SVAK }}>Styret <span className="font-medium normal-case tracking-normal" style={{ color: LILLA_M }}>felles for Digihome AS og Digihome Tech AS</span></p>
          <div className="mt-2.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Person p={TEAM[2]} rolle="Styreleder" />
            <Person p={TEAM[4]} rolle="Styremedlem" />
            <Person p={TEAM[0]} rolle="Styremedlem" />
            <Person p={TEAM[1]} rolle="Styremedlem" />
          </div>
        </Boks>
      </Inn>
      <div className="mx-auto h-8 w-px"><Linje className="h-full w-px origin-top" style={{ transform: 'scaleY(var(--l,0))' }} /></div>
      {/* Ledelse + rådgiver */}
      <Inn i={3} className="relative">
        <div className="grid gap-3 sm:grid-cols-[1fr_minmax(0,520px)_1fr] sm:items-center">
          <span className="hidden sm:block" />
          <Boks testid="deck-org-ledelse">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: SVAK }}>Ledelse</p>
            <div className="mt-2.5 grid gap-3 sm:grid-cols-2"><Person p={TEAM[0]} rolle="Daglig leder · CEO" /><Person p={TEAM[1]} rolle="Produktsjef · CPO" /></div>
          </Boks>
          <div className="flex items-center sm:justify-self-start">
            <Linje className="hidden h-px w-6 origin-left sm:block" style={{ transform: 'scaleX(var(--l,0))', background: 'rgba(122,63,168,0.45)' }} />
            <Boks className="sm:min-w-[240px]" tone="lilla">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: LILLA_M }}>Rådgiver</p>
              <div className="mt-2.5"><Person p={TEAM[3]} liten /></div>
            </Boks>
          </div>
        </div>
      </Inn>
      {/* Grener til to selskaper */}
      <div className="relative mx-auto hidden h-10 max-w-[1080px] sm:block">
        <Linje className="absolute left-1/2 top-0 h-5 w-px origin-top -translate-x-1/2" style={{ transform: 'translateX(-50%) scaleY(var(--l,0))' }} />
        <Linje className="absolute left-1/4 right-1/4 top-5 h-px origin-center" style={{ transform: 'scaleX(var(--l,0))' }} />
        <Linje className="absolute left-1/4 top-5 h-5 w-px origin-top" style={{ transform: 'scaleY(var(--l,0))' }} />
        <Linje className="absolute right-1/4 top-5 h-5 w-px origin-top" style={{ transform: 'scaleY(var(--l,0))' }} />
      </div>
      <div className="mt-3 grid gap-3 sm:mt-0 sm:grid-cols-2">
        <Inn i={4}>
          <Boks tone="lilla" testid="deck-org-tech">
            <p className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: LILLA_M }}><span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: LILLA_M }}>DT</span> Digihome Tech AS</p>
            <p className="mt-1.5 text-[18px]" style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.05 }}>Programvaren</p>
            <Funksjoner liste={[['Produkt og utvikling', 'AI-drevet, løpende'], ['Plattformdrift og support', 'hosting, integrasjoner'], ['Salg og vekst', 'selvbetjening, bedrift, partner']]} />
            <p className="mt-3 text-[12px]" style={{ color: DIM }}>Utvikling og drift <b style={{ color: T.ink }}>{kr(utviklingPerMnd)}</b> per måned i planen.</p>
          </Boks>
        </Inn>
        <Inn i={5}>
          <Boks tone="mork" testid="deck-org-dh">
            <p className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: LYS }}><span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: T.offwhite, color: T.ink }}>DH</span> Digihome AS</p>
            <p className="mt-1.5 text-[18px]" style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.05 }}>Forvaltningen</p>
            <Funksjoner morkt liste={[['Forvalterteamet · Bergen', `${nb(enheterPerAarsverk)} enheter per forvalter`], ['Kundeakkvisisjon', 'boligeiere, performance-partner'], ['Kontrakt og jus', 'husleieloven, depositum, BankID']]} />
            <p className="mt-3 text-[12px]" style={{ color: LYS }}>Forvaltere: <b style={{ color: T.offwhite }}>{nb(aarsverkStart, 1)}</b> → <b style={{ color: T.offwhite }}>{nb(aarsverkSlutt, 1)}</b> årsverk gjennom perioden – bemanningen følger porteføljen.</p>
          </Boks>
        </Inn>
      </div>
    </div>
  );
}

/* ══════════════════════════ Slide 02 · problemet (DigiHome-stil) ══════════════════════════ */
/* Bygget som motstykket til «Utleie på autopilot»: ett varmt, kinematisk bolig-foto med ett rolig, elegant overlay –
   Autopilot står AV, alt gjøres for hånd. Ingen busy kort/lister eller mørke paneler; nydelig foto, ett glass-kort,
   deckets lilla-signatur. Detaljene (begge segmenter, AI, kostnaden) bæres i teksten til venstre. Rolig entré. */
function ManueltIDag() {
  const jobber = ['Annonse', 'Kontrakt', 'Husleie', 'Drift'];
  return (
    <div className="deck-inn relative overflow-hidden rounded-[26px]" style={{ '--i': 2, boxShadow: '0 46px 90px rgba(21,19,15,0.22), inset 0 0 0 1px rgba(21,19,15,0.06)' }}>
      <img src="/v4/stue-2000.webp" alt="En bolig som leies ut" className="deck-hv-foto h-[360px] w-full object-cover sm:h-[460px] lg:h-[512px]" style={{ filter: 'saturate(0.92) contrast(1.02)' }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,19,15,0.16) 0%, rgba(21,19,15,0) 28%, rgba(21,19,15,0) 50%, rgba(21,19,15,0.44) 100%)' }} />
      <div className="absolute left-5 top-5 sm:left-6 sm:top-6">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ background: 'rgba(243,241,236,0.86)', color: SVAK, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: LILLA_M }} />Slik er det i dag</span>
      </div>
      <div className="deck-inn absolute inset-x-5 bottom-5 sm:inset-x-6 sm:bottom-6" style={{ '--i': 4 }}>
        <div className="rounded-[20px] p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: '0 22px 50px rgba(21,19,15,0.22)' }}>
          <div className="flex items-center gap-4">
            <span className="deck-hv-spor relative inline-flex h-8 w-[54px] flex-none items-center rounded-full" style={{ background: 'rgba(21,19,15,0.16)' }}>
              <span className="deck-hv-knob absolute left-1 top-1 h-6 w-6 rounded-full bg-white" style={{ boxShadow: '0 1px 4px rgba(21,19,15,0.28)' }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[18px] font-semibold" style={{ color: T.ink }}>Autopilot <span className="rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-wide" style={{ background: 'rgba(200,60,45,0.12)', color: FARGE.kost }}>AV</span></p>
              <p className="mt-0.5 text-[13.5px]" style={{ color: SVAK }}>Hele driften håndteres manuelt – i hvert sitt system.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: HAIR }}>
            {jobber.map((j) => (<span key={j} className="rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: T.flate, color: DIM }}>{j}</span>))}
            <span className="text-[12px]" style={{ color: SVAK }}>… manuelt</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KjerneStage({ domener, core, height, chipMobil = false, variant = 'losning' }) {
  const problem = variant === 'problem';
  const bane = (d, t = 1) => { const ex = d.x + (core.x - d.x) * t; const ey = d.y + (core.y - d.y) * t; return `M ${d.x} ${d.y} C ${d.x} ${(d.y + ey) / 2}, ${ex} ${(d.y + ey) / 2}, ${ex} ${ey}`; };
  const kjerne = chipMobil ? 88 : 108;
  return (
    <div className="relative w-full" style={{ height }} data-testid={problem ? 'deck-fragment' : 'deck-losning-kjerne'}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
        {domener.map((d, i) => (problem ? (
          <path key={d.navn} d={bane(d, 0.74)} stroke="rgba(21,19,15,0.30)" strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ) : (
          <g key={d.navn}>
            <path d={bane(d)} stroke="rgba(122,63,168,0.22)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <path className="deck-los-stream" d={bane(d)} stroke={LILLA_M} strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ animationDelay: `${i * 0.18}s` }} />
          </g>
        )))}
      </svg>
      {domener.map((d) => (
        <div key={d.navn} className="deck-inn absolute" style={{ '--i': 3, left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%,-50%)' }}>
          <span className={`flex items-center gap-2 whitespace-nowrap rounded-full bg-white font-medium ${chipMobil ? 'px-3 py-2 text-[12px]' : 'px-4 py-2.5 text-[13.5px]'}`} style={{ color: problem ? DIM : T.ink, boxShadow: `inset 0 0 0 1px ${HAIR}, 0 10px 24px rgba(21,19,15,0.07)` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: problem ? 'rgba(21,19,15,0.32)' : LILLA_M }} />{d.navn}</span>
        </div>
      ))}
      <div className="deck-inn absolute" style={{ '--i': 4, left: `${core.x}%`, top: `${core.y}%`, transform: 'translate(-50%,-50%)' }}>
        {problem ? (
          <div className="relative flex flex-col items-center">
            <div className="flex items-center justify-center rounded-full" style={{ height: kjerne, width: kjerne, border: '2px dashed rgba(21,19,15,0.24)', background: 'radial-gradient(circle, rgba(21,19,15,0.05) 0%, rgba(21,19,15,0) 72%)' }}>
              <Ban style={{ height: chipMobil ? 26 : 32, width: chipMobil ? 26 : 32, color: 'rgba(21,19,15,0.30)' }} strokeWidth={1.5} />
            </div>
            <p className="relative mt-4 text-[14px] font-semibold" style={{ color: T.ink }}>Intet system</p>
            <p className="relative text-[12px]" style={{ color: SVAK }}>alt gjøres for hånd</p>
          </div>
        ) : (
        <div className="relative flex flex-col items-center">
          <div className="deck-los-gloed pointer-events-none absolute -inset-8 rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.42) 0%, rgba(139,92,246,0) 70%)' }} />
          <div className="relative flex items-center justify-center rounded-full" style={{ height: kjerne, width: kjerne, background: 'radial-gradient(circle at 34% 28%, #a878e6 0%, #7A3FA8 72%)', boxShadow: '0 22px 54px rgba(122,63,168,0.45), inset 0 1px 0 rgba(255,255,255,0.4)' }}>
            <Sparkles className={chipMobil ? 'h-8 w-8 text-white' : 'h-10 w-10 text-white'} strokeWidth={1.6} />
          </div>
          <p className="relative mt-4 text-[14px] font-semibold" style={{ color: T.ink }}>DigiHome AI</p>
          <p className="relative text-[12px]" style={{ color: SVAK }}>driver hele driften automatisk</p>
        </div>
        )}
      </div>
    </div>
  );
}
/* ══════════════════════════ Slide 03 · løsningen (DigiHome-stil) ══════════════════════════ */
/* «AI-motoren» – sitt helt egne konsept (ikke foto+toggle). De fire driftsområdene strømmer inn i én glødende,
   pulserende DigiHome AI-kjerne (lys som flyter langs linjene). Viser «ett AI-drevet system som driver alt», og er
   den visuelle motsetningen til fragmenteringen på Hvorfor. Bue-inn på desktop, kompakt ring på mobil. */
function LosningKjerne() {
  const desktop = [{ navn: 'Leietakere', x: 13, y: 17 }, { navn: 'Kontrakter', x: 38, y: 10 }, { navn: 'Husleie', x: 62, y: 10 }, { navn: 'Drift', x: 87, y: 17 }];
  const mobil = [{ navn: 'Leietakere', x: 50, y: 8 }, { navn: 'Kontrakter', x: 17, y: 37 }, { navn: 'Husleie', x: 83, y: 37 }, { navn: 'Drift', x: 50, y: 86 }];
  return (
    <div className="deck-inn w-full" style={{ '--i': 2 }}>
      <div className="hidden sm:block"><KjerneStage domener={desktop} core={{ x: 50, y: 72 }} height={460} /></div>
      <div className="sm:hidden"><KjerneStage domener={mobil} core={{ x: 50, y: 47 }} height={380} chipMobil /></div>
    </div>
  );
}
/* Slide 02 · problemet – «Utleie mangler et system». Det direkte motstykket til Løsningen: de fire driftsområdene
   (Leietakere, Kontrakter, Husleie, Drift) lever i hvert sitt frakoblede, manuelle verktøy – og det eneste som binder
   dem sammen er DU. Manuelle (stiplede) tråder løper fra verktøyene inn til et slitent «Du er systemet»-nav i midten.
   Der Løsningen har en glødende AI-kjerne, har Hvorfor et menneske som må gjøre alt for hånd. */
function FragStage({ domener, core, height, kompakt = false, aktiv = false, id = 'd' }) {
  /* Piksel-basert SVG (viewBox = faktisk bredde × høyde) så trådene er ekte kurver og punktene kan gli langs dem uten
     forvrengning. Bredden måles; høyden er fast. */
  const ref = useRef(null);
  const [W, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const m = () => setW(el.clientWidth);
    m();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(m) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const Hh = height;
  const P = (p) => ({ x: (p.x / 100) * W, y: (p.y / 100) * Hh });
  const c = P(core);
  const bane = (d) => { const a = P(d); return `M ${a.x} ${a.y} C ${a.x} ${(a.y + c.y) / 2}, ${c.x} ${(a.y + c.y) / 2}, ${c.x} ${c.y}`; };
  const kjerne = kompakt ? 102 : 136;
  const DUR = 3.0; const STEG = 0.75;   // én oppgave lander hvert 0,75 s – jevnt, uten pause
  return (
    <div ref={ref} className="relative w-full" style={{ height }} data-testid="deck-fragment">
      {W > 0 ? (
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${W} ${Hh}`} fill="none" aria-hidden="true">
          {domener.map((d, i) => (
            <path key={d.navn} id={`frag-${id}-${i}`} className="deck-frag-trad" d={bane(d)} stroke="rgba(21,19,15,0.2)" strokeWidth="1.4" strokeLinecap="round" />
          ))}
          {/* Oppgavene som lander på deg: små varme punkter glir langs trådene inn til navet – hele tiden, én etter én.
              Kun når sliden er aktiv (ytelse). */}
          {aktiv ? domener.map((d, i) => (
            <g key={`${d.navn}-p`} data-testid="deck-frag-oppgave">
              <circle r={kompakt ? 8 : 10} fill={FARGE.kost} opacity="0">
                <animateMotion dur={`${DUR}s`} begin={`${i * STEG}s`} repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.25 1"><mpath href={`#frag-${id}-${i}`} /></animateMotion>
                <animate attributeName="opacity" values="0;0.12;0.12;0" keyTimes="0;0.1;0.7;0.84" dur={`${DUR}s`} begin={`${i * STEG}s`} repeatCount="indefinite" />
              </circle>
              <circle r={kompakt ? 3 : 3.4} fill={FARGE.kost} opacity="0">
                <animateMotion dur={`${DUR}s`} begin={`${i * STEG}s`} repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.25 1"><mpath href={`#frag-${id}-${i}`} /></animateMotion>
                <animate attributeName="opacity" values="0;0.85;0.85;0" keyTimes="0;0.08;0.72;0.86" dur={`${DUR}s`} begin={`${i * STEG}s`} repeatCount="indefinite" />
              </circle>
            </g>
          )) : null}
        </svg>
      ) : null}
      {/* Verktøy-brikker – hvert driftsområde i sitt eget frakoblede verktøy */}
      {domener.map((d) => (
        <div key={d.navn} className="deck-inn absolute" style={{ '--i': 3, left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%,-50%)' }}>
          <span className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}, 0 18px 42px rgba(21,19,15,0.10)` }}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(21,19,15,0.05)' }}><d.Ikon className="h-[18px] w-[18px]" strokeWidth={1.6} style={{ color: 'rgba(21,19,15,0.5)' }} /></span>
            <span className="text-left leading-tight">
              <span className="block text-[14px] font-semibold" style={{ color: T.ink }}>{d.navn}</span>
              <span className="mt-0.5 block whitespace-nowrap text-[11.5px]" style={{ color: SVAK }}>{d.verktoy}</span>
            </span>
          </span>
        </div>
      ))}
      {/* Navet i dag: deg – mennesket som kobler alt sammen for hånd. Rolig, ren node (ikke alarm-rød). */}
      <div className="deck-inn absolute" style={{ '--i': 4, left: `${core.x}%`, top: `${core.y}%`, transform: 'translate(-50%,-50%)' }}>
        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center">
            <span aria-hidden="true" className="deck-frag-puls absolute rounded-full" style={{ height: kjerne * 1.7, width: kjerne * 1.7, background: 'radial-gradient(circle, rgba(179,38,30,0.08) 0%, rgba(179,38,30,0) 66%)' }} />
            <div className="relative flex items-center justify-center rounded-full bg-white" style={{ height: kjerne, width: kjerne, boxShadow: `inset 0 0 0 1px ${HAIR}, 0 24px 52px -22px rgba(21,19,15,0.24)` }}>
              <User style={{ height: kompakt ? 30 : 40, width: kompakt ? 30 : 40, color: T.ink }} strokeWidth={1.4} />
            </div>
          </div>
          <p className="mt-5 text-[15.5px] font-semibold" style={{ color: T.ink }}>Alt havner hos utleieren</p>
          <p className="mt-1 text-[12.5px]" style={{ color: SVAK, maxWidth: '26ch' }}>som kobler verktøyene sammen manuelt</p>
        </div>
      </div>
    </div>
  );
}
function FragmentKjerne({ aktiv = false }) {
  const desktop = [
    { navn: 'Leietakere', verktoy: 'SMS & anrop', Ikon: Users, x: 16, y: 16 },
    { navn: 'Kontrakter', verktoy: 'Word & penn', Ikon: FileText, x: 39, y: 9 },
    { navn: 'Husleie', verktoy: 'Regneark', Ikon: Coins, x: 63, y: 9 },
    { navn: 'Drift', verktoy: 'E-post & tlf', Ikon: Wrench, x: 86, y: 16 },
  ];
  const mobil = [
    { navn: 'Leietakere', verktoy: 'SMS & anrop', Ikon: Users, x: 26, y: 11 },
    { navn: 'Kontrakter', verktoy: 'Word & penn', Ikon: FileText, x: 74, y: 11 },
    { navn: 'Husleie', verktoy: 'Regneark', Ikon: Coins, x: 26, y: 37 },
    { navn: 'Drift', verktoy: 'E-post & tlf', Ikon: Wrench, x: 74, y: 37 },
  ];
  return (
    <div className="deck-inn w-full" style={{ '--i': 2 }}>
      <div className="hidden sm:block"><FragStage domener={desktop} core={{ x: 50, y: 71 }} height={540} aktiv={aktiv} id="d" /></div>
      <div className="sm:hidden"><FragStage domener={mobil} core={{ x: 50, y: 79 }} height={440} kompakt aktiv={aktiv} id="m" /></div>
    </div>
  );
}



/* ══════════════════════════ DigiHome-merket (offisiell logo) ══════════════════════════ */
/* Lilla squircle med de åtte strøkene – brukt i den cinematiske introen. Strøkene toner inn ett og ett (kun opacity,
   så SVG-matrisen på hver rect beholdes). */
const DH_STROK = [[45.0359, 36.7341], [42.5159, 51.0244], [47.5559, 22.4436], [18.6284, 36.7341], [29.3123, 51.0244], [34.3521, 22.4436], [16.1084, 51.0244], [21.1484, 22.4436]];
function DhIkon({ px = 88, className = '', style, animer = false }) {
  return (
    <svg width={px} height={px} viewBox="0 0 60 60" fill="none" aria-hidden="true" className={className} style={style}>
      <rect width="60" height="60" rx="12" fill="#D298FF" />
      {DH_STROK.map(([x, y], i) => (
        <rect key={`${x}-${y}`} className={animer ? 'deck-intro-mark' : undefined} width="6.60155" height="14.5107" transform={`matrix(-1 0 0.173648 -0.984808 ${x} ${y})`} fill="#1F1F1F" style={animer ? { '--m': i } : undefined} />
      ))}
    </svg>
  );
}


/* ══════════════════════════ Innhold ══════════════════════════ */
const KAPITLER = [
  { id: 'forside', navn: 'DigiHome' },
  { id: 'hvorfor', navn: 'Hvorfor' },
  { id: 'losning', navn: 'Løsningen' },
  { id: 'marked', navn: 'Markedet' },
  { id: 'konsept', navn: 'Konseptet' },
  { id: 'hvem', navn: 'For hvem' },
  { id: 'eier', navn: 'Strukturen' },
  { id: 'struktur', navn: 'Motoren' },
  { id: 'org', navn: 'Organisasjon' },
  { id: 'staar', navn: 'Hvor vi står' },
  { id: 'unit', navn: 'Unit economics' },
  { id: 'gtm', navn: 'Go-to-market' },
  { id: 'plan-dh', navn: 'Planen · Digihome AS' },
  { id: 'plan-tech', navn: 'Planen · Tech' },
  { id: 'konsern', navn: 'Konsern' },
  { id: 'kpi', navn: 'Nøkkeltall' },
  { id: 'budsjett', navn: 'Budsjett' },
  { id: 'variabel', navn: 'Den ene variabelen' },
  { id: 'hvaom', navn: 'Hva om' },
  { id: 'risiko', navn: 'Risiko' },
  { id: 'trenger', navn: 'Det vi trenger' },
];
const NOTATER = {
  forside: 'Åpne rolig. Én setning: vi fjerner jobben med å leie ut – med programvare, og med mennesker som bruker den samme programvaren.',
  hvorfor: 'Smerten er kjent for alle i rommet som har leid ut. Ikke tall her – gjenkjennelse.',
  losning: 'Svaret på forrige slide: ett AI-drevet system tar over hele driften. «Autopilot AV» blir «Autopilot PÅ». Høyt nivå her – detaljene kommer i Konseptet.',
  konsept: 'La scenen spille. Pek på at eieren bare trykker én gang – resten skjer.',
  hvem: 'To kundegrupper, samme system. Den private eieren velger selv eller forvalter; eiendomsselskapet får hele porteføljen på én plattform – per enhet.',
  eier: 'Enkelt: Digihome Group AS eier begge selskapene 100 %. Digihome AS er forvaltningen (mennesker, margin), Digihome Tech AS er programvaren (skalerer). Lisensen mellom dem nulles ut i konsernregnskapet.',
  struktur: 'Poenget: forvaltningen er Techs største kunde i dag, og et salgsapparat for plattformen i morgen. Lisensen telles én gang i konsernet.',
  org: 'Fire fagfelt kjent fra innsiden. Bemanningen i forvaltningen vokser med porteføljen – ikke før.',
  staar: 'Fakta fra signerte kontrakter – oppdateres hver gang decket åpnes.',
  unit: 'Full CAC inkluderer performance-partneren. Payback under 12 måneder i alle grupper er målet.',
  gtm: 'Betalt på resultat: byrået tjener når vi tjener. Forvaltningen er også en kanal.',
  'plan-dh': 'Skru på veksttempo og honorar – vis at break-even flytter seg, ikke forsvinner.',
  'plan-tech': 'MRR per kundegruppe. Ekstern andel av inntekten er det investoren ser etter.',
  konsern: 'Lisensen elimineres. Konsernets break-even og kapitalbehov etter skatt er de to tallene å huske. Skatten betales året etter.',
  marked: 'Markedet er ikke begrensningen – planen er en brøkdel av én prosent. SSB-tallene er avrundet; verifiser før ekstern bruk. Poenget: fragmentert, privat, lokalt – ingen har bygget både programvaren og driften.',
  variabel: 'Hele planen hviler på én variabel: hva en ny forvaltningskunde koster i media. Vis tabellen – la dem velge celle.',
  risiko: 'Ta risikoene før de spør. Hver risiko peker på en skrue i decket – vis at den er regnet på, ikke bortforklart.',
  hvaom: 'La salen velge. Halv vekst og dobbel CAC er de ærlige testene. «Med plattformkunder» er oppsiden vi ikke budsjetterer med.',
  trenger: 'Kapitalbehov etter skatt med 30 % buffer. Pengene går dit planen sier – og dere kan følge det i investorrommet.',
};
const PRESETS = [
  { id: 'plan', navn: 'Planen', tekst: 'Slik den er lagt.', fakt: { forv: 1, tech: 1 }, over: () => ({}) },
  { id: 'halv', navn: 'Halv vekst', tekst: 'Begge selskaper vokser halvparten så fort.', fakt: { forv: 0.5, tech: 0.5 }, over: (bF, bT) => ({ tech: bT ? { huseier: { organiskPerMnd: bT.huseier.organiskPerMnd * 0.5 }, bedrift: { nyeSelskaperPerMnd: bT.bedrift.nyeSelskaperPerMnd * 0.5 } } : {} }) },
  { id: 'dobbel', navn: 'Dobbel vekst', tekst: 'Vi trykker på gassen i begge selskaper.', fakt: { forv: 2, tech: 2 }, over: (bF, bT) => ({ tech: bT ? { bedrift: { nyeSelskaperPerMnd: bT.bedrift.nyeSelskaperPerMnd * 2 } } : {} }) },
  { id: 'cac', navn: 'Dobbel CAC', tekst: 'Kundene blir dyrere å hente – hver ny enhet koster det dobbelte.', fakt: { forv: 1, tech: 1 }, over: (bF, bT) => ({ forv: { provisjonPerNyEnhet: bF.provisjonPerNyEnhet * 2 }, tech: bT ? { huseier: { cacPerEnhet: bT.huseier.cacPerEnhet * 2 }, bedrift: { salgskostPerSelskap: bT.bedrift.salgskostPerSelskap * 2 } } : {} }) },
  { id: 'churn', navn: 'Lav churn', tekst: 'Vi holder på kundene bedre – maks 10 % årlig frafall.', fakt: { forv: 1, tech: 1 }, over: (bF, bT) => ({ forv: { aarligChurnPct: Math.min(bF.aarligChurnPct, 10) }, tech: bT ? { huseier: { aarligChurnPct: Math.min(bT.huseier.aarligChurnPct, 10) }, bedrift: { aarligChurnPct: Math.min(bT.bedrift.aarligChurnPct, 5) } } : {} }) },
  { id: 'saas', navn: 'Med plattformkunder', tekst: 'Oppsiden vi ikke budsjetterer med: selvbetjente huseiere fra år 2 og eiendomsselskaper fra år 3.', kreverTech: true, fakt: { forv: 1, tech: 1 }, over: (bF, bT) => ({ tech: bT ? { huseier: { modus: 'kunder', organiskPerMnd: Math.max(bT.huseier.organiskPerMnd, 2), kunderPlan: [{ fraMnd: 7, nyePerMnd: 5 }, { fraMnd: 13, nyePerMnd: 10 }, { fraMnd: 25, nyePerMnd: 20 }] }, bedrift: bT.bedrift.nyeSelskaperPerMnd > 0 ? {} : { nyeSelskaperPerMnd: 0.5, fraMnd: 25 } } : {} }) },
];

/* ══════════════════════════ Ekstern deling ══════════════════════════ */
/* Presenter lager rene lenker (/deck/<token>) låst til planen som vises nå. Valgfritt passord,
   valgfritt utløp. Lista viser åpninger og sist aktiv, og lenker kan trekkes tilbake eller slettes. */
function Deling({ qs, plan, techPlan, onClose }) {
  const [lenker, setLenker] = useState(null);
  const [label, setLabel] = useState(''); const [pin, setPin] = useState(''); const [utlop, setUtlop] = useState('0');
  const [lager, setLager] = useState(false); const [feil, setFeil] = useState('');
  const [ny, setNy] = useState(null); const [kopiert, setKopiert] = useState('');
  const [pinRed, setPinRed] = useState(null); // { id, verdi }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = (l) => `${origin}/deck/${l.token}`;
  const q = useMemo(() => { const p = new URLSearchParams(qs); p.set('plan', plan.id); p.delete('tech'); return p.toString(); }, [qs, plan.id]);
  const hent = useCallback(async () => {
    try { const r = await fetch(`/api/investor/deck/deling?${q}`, { cache: 'no-store' }); const j = await r.json().catch(() => ({})); setLenker(j.ok ? j.lenker : []); } catch (e) { setLenker([]); }
  }, [q]);
  useEffect(() => { hent(); }, [hent]);
  const opprett = async (e) => {
    e.preventDefault(); setFeil('');
    if (!label.trim()) { setFeil('Gi lenken et navn – gjerne hvem den går til.'); return; }
    if (pin.trim() && pin.trim().length < 4) { setFeil('Passordet må ha minst 4 tegn.'); return; }
    setLager(true);
    try {
      const r = await fetch(`/api/investor/deck/deling?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label.trim(), pin: pin.trim(), expiresDays: Number(utlop) || 0, planId: plan.id, techPlanId: techPlan?.id || null }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setFeil(j.error || 'Kunne ikke lage lenken'); return; }
      setNy({ ...j.link, medPassord: Boolean(pin.trim()) }); setLabel(''); setPin(''); hent();
      try { await navigator.clipboard.writeText(url(j.link)); setKopiert(j.link.id); window.setTimeout(() => setKopiert(''), 2200); } catch (e2) { /* ok */ }
    } catch (e3) { setFeil('Nettverksfeil'); } finally { setLager(false); }
  };
  const kopier = async (l) => { try { await navigator.clipboard.writeText(url(l)); setKopiert(l.id); window.setTimeout(() => setKopiert(''), 1800); } catch (e) { window.prompt('Kopier lenken', url(l)); } };
  const oppdater = async (id, patch) => { try { await fetch(`/api/investor/deck/deling?${q}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, patch }) }); } catch (e) { /* ok */ } setPinRed(null); hent(); };
  const slett = async (id) => { if (!window.confirm('Slette lenken? Den slutter å virke umiddelbart.')) return; try { await fetch(`/api/investor/deck/deling?${q}&id=${encodeURIComponent(id)}`, { method: 'DELETE' }); } catch (e) { /* ok */ } if (ny?.id === id) setNy(null); hent(); };
  const dato = (iso) => (iso ? new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) : null);
  const felt = 'h-11 w-full rounded-[12px] px-4 text-[14px] outline-none';
  const feltStil = { background: '#fff', boxShadow: `inset 0 0 0 1px ${HAIR}`, color: T.ink };
  const knappLiten = 'flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors';
  return (
    <div className="deck-skjul-print fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8" style={{ background: 'rgba(21,19,15,0.42)' }} onClick={onClose} data-testid="deck-deling" data-deck-overlay>
      <div className="max-h-[88svh] w-full max-w-[600px] overflow-y-auto rounded-[24px] p-6 shadow-[0_32px_90px_rgba(20,17,14,0.35)] sm:p-7" style={{ background: '#FBFAF8', color: T.ink }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: LILLA_M }}><Share2 className="h-3.5 w-3.5" /> Del eksternt</p>
            <h3 className="mt-2 text-[26px]" style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.05 }}>En ren lenke til decket.</h3>
            <p className="mt-2 text-[13.5px] leading-[1.5]" style={{ color: DIM }}>Låst til <b style={{ color: T.ink }}>{plan.navn}</b>{techPlan ? <> og <b style={{ color: T.ink }}>{techPlan.navn}</b></> : null}. Mottakeren ser decket uten planvalg og notater – men kan skru på driverne. Tallene følger planen: oppdaterer du den, oppdateres decket.</p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full p-2" style={{ color: SVAK, background: 'rgba(21,19,15,0.05)' }} aria-label="Lukk" data-testid="deck-deling-lukk"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={opprett} className="mt-5 rounded-[18px] p-4" style={{ background: T.canvas }} data-testid="deck-deling-skjema">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[12px] font-medium" style={{ color: DIM }}>Hvem går lenken til?</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="f.eks. Investinor, Ola Nordmann, styret" className={felt} style={feltStil} data-testid="deck-deling-navn" autoFocus />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium" style={{ color: DIM }}><KeyRound className="h-3 w-3" /> Passord <span style={{ color: SVAK }}>· valgfritt</span></span>
              <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Minst 4 tegn" className={felt} style={feltStil} autoComplete="off" data-testid="deck-deling-passord" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium" style={{ color: DIM }}>Utløper</span>
              <select value={utlop} onChange={(e) => setUtlop(e.target.value)} className={felt} style={feltStil} data-testid="deck-deling-utlop">
                <option value="0">Aldri – til du trekker den tilbake</option>
                <option value="7">Om 7 dager</option>
                <option value="30">Om 30 dager</option>
                <option value="90">Om 90 dager</option>
              </select>
            </label>
          </div>
          {feil ? <p className="mt-3 text-[13px]" style={{ color: FARGE.kost }} data-testid="deck-deling-feil">{feil}</p> : null}
          <button type="submit" disabled={lager} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-medium disabled:opacity-60 sm:w-auto sm:px-5" style={{ background: T.ink, color: T.offwhite }} data-testid="deck-deling-lag"><Link2 className="h-4 w-4" /> {lager ? 'Lager lenke …' : 'Lag lenke'}</button>
        </form>

        {ny ? (
          <div className="mt-4 rounded-[18px] p-4" style={{ background: '#F6F0FB', boxShadow: 'inset 0 0 0 1px rgba(122,63,168,0.22)' }} data-testid="deck-deling-ny">
            <p className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: LILLA_M }}><Check className="h-3.5 w-3.5" /> Lenken er klar{kopiert === ny.id ? ' – og kopiert' : ''}</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-[10px] px-3 py-2 text-[13px]" style={{ background: '#fff', color: T.ink }} data-testid="deck-deling-url">{url(ny)}</code>
              <button onClick={() => kopier(ny)} className="flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[12.5px] font-medium" style={{ background: T.ink, color: T.offwhite }} data-testid="deck-deling-kopier">{kopiert === ny.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {kopiert === ny.id ? 'Kopiert' : 'Kopier'}</button>
            </div>
            <p className="mt-2 text-[12px]" style={{ color: DIM }}>{ny.medPassord ? 'Send passordet i en annen kanal enn lenken – SMS eller muntlig.' : 'Alle med lenken kan åpne decket. Legg på passord hvis den skal videre til flere.'}</p>
          </div>
        ) : null}

        <div className="mt-6">
          <p className="flex items-baseline justify-between text-[11.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: SVAK }}>Delte lenker <span className="font-medium normal-case tracking-normal">{lenker ? `${lenker.length} for denne planen` : ''}</span></p>
          {lenker === null ? <p className="mt-3 text-[13px]" style={{ color: SVAK }}>Henter …</p> : !lenker.length ? <p className="mt-3 text-[13px]" style={{ color: SVAK }}>Ingen lenker ennå. Den første lager du over.</p> : (
            <ul className="mt-2 divide-y" style={{ borderColor: HAIR }} data-testid="deck-deling-liste">
              {lenker.map((l) => {
                const aktiv = l.status === 'active';
                return (
                  <li key={l.id} className="py-3" data-testid={`deck-deling-rad-${l.id}`}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-[14px] font-semibold" style={{ color: T.ink }}>{l.label}</p>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: aktiv ? 'rgba(46,125,50,0.12)' : 'rgba(21,19,15,0.07)', color: aktiv ? T.gronn : DIM }}>{aktiv ? 'aktiv' : l.status === 'revoked' ? 'trukket tilbake' : 'utløpt'}</span>
                      {l.harPassord ? <span className="flex items-center gap-1 text-[11.5px]" style={{ color: LILLA_M }}><Lock className="h-3 w-3" /> passord</span> : null}
                      <span className="ml-auto flex items-center gap-1 text-[12px]" style={{ color: SVAK }}><Eye className="h-3.5 w-3.5" /> {l.stats?.aapninger || 0} {l.stats?.aapninger === 1 ? 'åpning' : 'åpninger'}{l.stats?.sistAktiv ? ` · sist ${dato(l.stats.sistAktiv)}` : ''}{l.expiresAt ? ` · utløper ${dato(l.expiresAt)}` : ''}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-[10px] px-3 py-1.5 text-[12.5px]" style={{ background: 'rgba(21,19,15,0.04)', color: aktiv ? T.ink : SVAK, textDecoration: aktiv ? 'none' : 'line-through' }}>{url(l)}</code>
                      <button onClick={() => kopier(l)} className={knappLiten} style={{ background: 'rgba(21,19,15,0.06)', color: T.ink }} data-testid={`deck-deling-kopier-${l.id}`}>{kopiert === l.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{kopiert === l.id ? 'Kopiert' : 'Kopier'}</span></button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {pinRed?.id === l.id ? (
                        <form onSubmit={(e) => { e.preventDefault(); if (pinRed.verdi && pinRed.verdi.length < 4) return; oppdater(l.id, { pin: pinRed.verdi }); }} className="flex items-center gap-1.5">
                          <input value={pinRed.verdi} onChange={(e) => setPinRed({ id: l.id, verdi: e.target.value })} placeholder="Nytt passord (tomt = fjern)" className="h-8 w-[220px] rounded-full px-3 text-[12.5px] outline-none" style={feltStil} autoFocus data-testid={`deck-deling-pin-${l.id}`} />
                          <button type="submit" className={knappLiten} style={{ background: T.ink, color: T.offwhite }}>Lagre</button>
                          <button type="button" onClick={() => setPinRed(null)} className={knappLiten} style={{ color: DIM }}>Avbryt</button>
                        </form>
                      ) : (
                        <button onClick={() => setPinRed({ id: l.id, verdi: '' })} className={knappLiten} style={{ background: 'rgba(21,19,15,0.06)', color: T.ink }} data-testid={`deck-deling-passord-${l.id}`}><KeyRound className="h-3.5 w-3.5" /> {l.harPassord ? 'Endre passord' : 'Sett passord'}</button>
                      )}
                      {l.status !== 'expired' ? <button onClick={() => oppdater(l.id, { revoked: aktiv })} className={knappLiten} style={{ background: aktiv ? 'rgba(179,38,30,0.08)' : 'rgba(46,125,50,0.12)', color: aktiv ? FARGE.kost : T.gronn }} data-testid={`deck-deling-trekk-${l.id}`}><Ban className="h-3.5 w-3.5" /> {aktiv ? 'Trekk tilbake' : 'Aktiver igjen'}</button> : null}
                      <button onClick={() => slett(l.id)} className={knappLiten} style={{ color: DIM }} data-testid={`deck-deling-slett-${l.id}`}><Trash2 className="h-3.5 w-3.5" /> Slett</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeckKonsept({ token = '', adminKey = '', planId = '', techId = '' }) {
  const [data, setData] = useState(null);
  const [feil, setFeil] = useState('');
  const [trengerPin, setTrengerPin] = useState(null);
  const [pin, setPin] = useState(''); const [pinFeil, setPinFeil] = useState('');
  const [over, setOver] = useState({ forv: {}, tech: {} });
  const [fakt, setFakt] = useState({ forv: 1, tech: 1 });
  const [preset, setPreset] = useState('plan');
  const [side, setSide] = useState(0);
  const [visKapitler, setVisKapitler] = useState(false);
  const [visNotater, setVisNotater] = useState(false);
  const [visDeling, setVisDeling] = useState(false);
  const [visIntro, setVisIntro] = useState(true);   // cinematisk åpning før forsiden
  const [introUt, setIntroUt] = useState(false);
  const introUtRef = useRef(false);
  const introTittelRef = useRef(null);   // tittelen i introen (den som reiser)
  const coverTittelRef = useRef(null);   // tittelen på forsiden (dit den lander)
  const [sporsmal, setSporsmal] = useState(''); const [spurt, setSpurt] = useState(false);
  const [musAktiv, setMusAktiv] = useState(true);
  const [smal, setSmal] = useState(false);
  const print = usePrint();
  const rotRef = useRef(null); const musTimer = useRef(0); const setteSider = useRef(new Set()); const aapnetLogget = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const oppd = () => setSmal(mq.matches);
    oppd(); mq.addEventListener('change', oppd);
    return () => mq.removeEventListener('change', oppd);
  }, []);

  /* Cinematisk intro: DigiHome-merket + «Utleie på autopilot.» på lys flate – så MORFER tittelen (FLIP: måles og reiser
     med translate+scale) rett til sin plass på forsiden, mens lyset toner til mørke, merket «skyves gjennom» og
     kamera trekker seg rolig tilbake i scenen. Tittelen lander → resten av forsiden bygger seg rundt den.
     Én gang, kun når man åpner på forsiden. Hopp over ved print, dyplenke eller redusert bevegelse. Klikk/tast hopper.
     Overlegget avmonteres helt etter landing (ingen evig kostnad). */
  const startMorph = useCallback(() => {
    if (introUtRef.current) return;
    introUtRef.current = true;
    try {
      const iOrd = introTittelRef.current ? Array.from(introTittelRef.current.querySelectorAll('.deck-intro-flip')) : [];
      const cOrd = coverTittelRef.current ? Array.from(coverTittelRef.current.querySelectorAll('[data-ord]')) : [];
      iOrd.forEach((el) => {
        const oi = el.getAttribute('data-ord');
        const mal = cOrd.find((c) => c.getAttribute('data-ord') === oi);
        if (!mal) return;
        const a = el.getBoundingClientRect();
        const b = mal.getBoundingClientRect();
        if (a.width < 1 || b.width < 1) return;
        const s = b.width / a.width;
        const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
        const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
        el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
      });
    } catch (e) { /* morph er kosmetisk – la resten kjøre uansett */ }
    setIntroUt(true);
    window.setTimeout(() => setVisIntro(false), 1200);
  }, []);
  const hoppIntro = startMorph;
  useEffect(() => {
    if (!data) return undefined;
    if (typeof window === 'undefined') return undefined;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hash = (window.location.hash || '').replace('#', '');
    if (print || (hash && hash !== 'forside')) { introUtRef.current = true; setVisIntro(false); return undefined; }
    if (reduce) { const t = window.setTimeout(() => { introUtRef.current = true; setVisIntro(false); }, 900); return () => window.clearTimeout(t); }
    const t1 = window.setTimeout(startMorph, 2750);
    return () => window.clearTimeout(t1);
  }, [data, print, startMorph]);

  /* YTELSE: kun det aktive kapitlet skal «leve». Pause videoer i alle inaktive slides (ingen bakgrunns-dekoding),
     spill det aktive kapitlets video. (CSS pauser i tillegg alle evige animasjoner i inaktive slides.) */
  useEffect(() => {
    if (!data || typeof document === 'undefined') return;
    const r = rotRef.current; if (!r) return;
    const id = window.requestAnimationFrame(() => {
      r.querySelectorAll('.deck-side').forEach((s) => {
        const aktiv = s.getAttribute('data-pos') === 'aktiv';
        s.querySelectorAll('video').forEach((v) => {
          try { if (aktiv) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else { v.pause(); } } catch (e) { /* ignore */ }
        });
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [side, data]);

  const qs = useMemo(() => { const p = new URLSearchParams(); if (token) p.set('t', token); if (adminKey) p.set('key', adminKey); if (planId) p.set('plan', planId); if (techId) p.set('tech', techId); return p.toString(); }, [token, adminKey, planId, techId]);
  const hendelse = useCallback((body) => { if (!token) return; try { fetch(`/api/investor/deck/hendelse?${qs}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }); } catch (e) { /* stille */ } }, [qs, token]);
  const last = useCallback(async () => {
    setFeil('');
    try {
      const r = await fetch(`/api/investor/deck?${qs}`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401 && j.needsPin) { setTrengerPin(j.label || ''); return; }
      if (!r.ok) { setFeil(j.error || 'Kunne ikke åpne decket'); return; }
      setTrengerPin(null); setData(j);
      if (!aapnetLogget.current) { aapnetLogget.current = true; hendelse({ type: 'deck_aapnet' }); }
    } catch (e) { setFeil('Nettverksfeil'); }
  }, [qs, hendelse]);
  useEffect(() => { last(); }, [last]);
  const sendPin = async (e) => {
    e.preventDefault(); setPinFeil('');
    const r = await fetch(`/api/investor/deck/pin?${qs}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
    if (r.ok) { setPin(''); last(); } else setPinFeil('Feil passord. Prøv igjen.');
  };

  /* ── Modeller ── */
  const plan = data?.plan; const techPlan = data?.tech || null;
  const N = plan ? Math.min(36, Math.max(1, Number(plan.antallMnd) || 12)) : 12;
  const NT = techPlan ? Math.min(36, Math.max(1, Number(techPlan.antallMnd) || 12)) : N;
  const basisF = useMemo(() => (plan ? rensModellDrivere(plan.drivere || {}) : null), [plan]);
  const basisT = useMemo(() => (techPlan ? rensTechDrivere(techPlan.tech || {}) : null), [techPlan]);
  const faktaT = useMemo(() => (techPlan ? rensTechFakta(techPlan.fakta || {}, NT) : null), [techPlan, NT]);
  const harTech = !!basisT;
  const drivF = useMemo(() => (basisF ? { ...skalerVekst(basisF, fakt.forv), ...over.forv } : null), [basisF, fakt.forv, over.forv]);
  const drivT = useMemo(() => (basisT ? flettTech({ ...basisT, huseier: skalerAnnonse(basisT.huseier, fakt.tech) }, over.tech) : null), [basisT, fakt.tech, over.tech]);
  const mF = useMemo(() => (plan && drivF ? beregnInvestorModell({ antallMnd: N, fakta: plan.fakta || {}, drivere: drivF, startYm: plan.startYm }) : null), [plan, drivF, N]);
  const mT = useMemo(() => (drivT ? beregnTech({ antallMnd: NT, drivere: drivT, fakta: faktaT }) : null), [drivT, NT, faktaT]);
  const mFb = useMemo(() => (plan && basisF ? beregnInvestorModell({ antallMnd: N, fakta: plan.fakta || {}, drivere: basisF, startYm: plan.startYm }) : null), [plan, basisF, N]);
  const mTb = useMemo(() => (basisT ? beregnTech({ antallMnd: NT, drivere: basisT, fakta: faktaT }) : null), [basisT, NT, faktaT]);
  const offset = plan && techPlan ? ymDiff(plan.startYm, techPlan.startYm) : 0;
  const skyv = useCallback((arr) => Array.from({ length: N }, (_, t) => { const tt = t - offset; return Array.isArray(arr) && tt >= 0 && tt < arr.length ? (Number(arr[tt]) || 0) : 0; }), [N, offset]);
  const tilKonsern = useCallback((m) => (m ? { inntekt: { total: skyv(m.inntekt.total), forvaltning: skyv(m.inntekt.forvaltning), huseier: skyv(m.inntekt.huseier), bedrift: skyv(m.inntekt.bedrift) }, kostSum: skyv(m.kostSum) } : null), [skyv]);
  const mTk = useMemo(() => tilKonsern(mT), [mT, tilKonsern]);
  const k = useMemo(() => (mF ? beregnKonsernSammenstilling({ forvaltning: mF, tech: mTk, antallMnd: N, skatt: basisF?.skatt || null, startYm: plan?.startYm }) : null), [mF, mTk, N, basisF, plan?.startYm]);
  const kb = useMemo(() => (mFb ? beregnKonsernSammenstilling({ forvaltning: mFb, tech: tilKonsern(mTb), antallMnd: N, skatt: basisF?.skatt || null, startYm: plan?.startYm }) : null), [mFb, mTb, tilKonsern, N, basisF, plan?.startYm]);
  /* «Den ene variabelen»: media-CAC × organisk andel → kapitalbehov (etter skatt) og resultat. Regnes live på basisplanen. */
  const CAC_AKSE = [4000, 5000, 6000, 8000, 10000]; const ORG_AKSE = [0, 15, 30];
  const variabelMatrise = useMemo(() => {
    if (!plan || !basisF) return null;
    const tk = tilKonsern(mTb);
    return ORG_AKSE.map((org) => CAC_AKSE.map((cac) => {
      const m2 = beregnInvestorModell({ antallMnd: N, fakta: plan.fakta || {}, drivere: { ...basisF, provisjonPerNyEnhet: cac, organiskAndelPct: org }, startYm: plan.startYm });
      const k2 = beregnKonsernSammenstilling({ forvaltning: m2, tech: tk, antallMnd: N, skatt: basisF.skatt || null, startYm: plan.startYm });
      const sk = basisF.skatt?.paa;
      return { cac, org, kapital: sk ? k2.sammendrag.kapitalbehovEtterSkatt : k2.sammendrag.kapitalbehov, resultat: sk ? k2.sammendrag.resultatEtterSkatt : k2.sammendrag.resultat, be: k2.sammendrag.breakEvenIdx };
    }));
  }, [plan, basisF, mTb, tilKonsern, N]);

  const velgPreset = (p) => {
    if (!basisF) return;
    setPreset(p.id); setFakt({ forv: p.fakt?.forv ?? 1, tech: p.fakt?.tech ?? 1 });
    const o = p.over(basisF, basisT) || {}; setOver({ forv: o.forv || {}, tech: o.tech || {} });
    hendelse({ type: 'deck_hvaom', valg: p.navn });
  };
  const skruF = (key, v) => { setPreset('egen'); setOver((c) => ({ ...c, forv: { ...c.forv, [key]: v } })); };
  const skruT = (gruppe, key, v) => { setPreset('egen'); setOver((c) => ({ ...c, tech: { ...c.tech, [gruppe]: { ...(c.tech[gruppe] || {}), [key]: v } } })); };
  const skruTempo = (seg, v) => { setPreset('egen'); setFakt((c) => ({ ...c, [seg]: v })); };
  const skruFerdig = (label) => () => hendelse({ type: 'deck_driver', valg: label });
  const nullstill = () => { setPreset('plan'); setFakt({ forv: 1, tech: 1 }); setOver({ forv: {}, tech: {} }); };

  /* ── Navigasjon: deterministisk kapittelmotor ──
     `side` er sannheten. Kapitlene ligger som lag (absolutt) og glir inn/ut med CSS på data-pos.
     Én gest = ett kapittel. Kapitler høyere enn skjermen scroller innvendig først. */
  const sider = useMemo(() => KAPITLER.map((c) => c.id), []);
  const sideRef = useRef(0);
  const [utgaaende, setUtgaaende] = useState(null); // forrige kapittel holdes «aktivt» mens det glir ut
  const [merUnder, setMerUnder] = useState(false);   // aktivt kapittel har mer innhold under kanten
  const laastTilRef = useRef(0);
  const seksjon = useCallback((i) => document.getElementById(`deck-${sider[klem(i, 0, sider.length - 1)]}`), [sider]);
  const gaaTil = useCallback((i) => {
    const ny = klem(i, 0, sider.length - 1); const naa = sideRef.current;
    setVisKapitler(false);
    if (ny === naa) return;
    const el = seksjon(ny); if (el) el.scrollTop = 0;
    sideRef.current = ny; laastTilRef.current = performance.now() + 360;
    setUtgaaende(naa); setSide(ny);
  }, [sider, seksjon]);
  useEffect(() => { if (utgaaende === null) return undefined; const t = window.setTimeout(() => setUtgaaende(null), 500); return () => window.clearTimeout(t); }, [utgaaende, side]);
  /* Dyplenke: #kapittel i URL – leses ved start, oppdateres ved bytte, og følges ved hashchange. */
  useEffect(() => {
    if (!data) return undefined;
    const h = (window.location.hash || '').replace('#', ''); const i = sider.indexOf(h);
    if (i > 0 && sideRef.current === 0) { sideRef.current = i; setSide(i); }
    const paaHash = () => { const hh = (window.location.hash || '').replace('#', ''); const ii = sider.indexOf(hh); if (ii >= 0 && ii !== sideRef.current) gaaTil(ii); };
    window.addEventListener('hashchange', paaHash);
    return () => window.removeEventListener('hashchange', paaHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  useEffect(() => {
    if (!data) return;
    try { window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${sider[side]}`); } catch (e) { /* ok */ }
    if (!setteSider.current.has(sider[side])) { setteSider.current.add(sider[side]); hendelse({ type: 'deck_side', side: sider[side] }); }
  }, [side, data, sider, hendelse]);
  /* Tastatur */
  useEffect(() => {
    const tast = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (visDeling) return;
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); gaaTil(sideRef.current + 1); }
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); gaaTil(sideRef.current - 1); }
      if (e.key === 'Home') gaaTil(0); if (e.key === 'End') gaaTil(sider.length - 1);
      if (e.key === 'Escape') { setVisKapitler(false); setVisDeling(false); }
      if ((e.key === 'n' || e.key === 'N') && data?.presenter) setVisNotater((v) => !v);
    };
    window.addEventListener('keydown', tast); return () => window.removeEventListener('keydown', tast);
  }, [gaaTil, sider, data?.presenter, visDeling]);
  /* Hjul/styreflate: én gest = ett kapittel. Treghets-halen (avtagende delta, tette hendelser) gjenkjennes og
     ignoreres; en ny gest starter når det har vært stille i 160 ms ELLER delta plutselig øker igjen.
     Er kapitlet høyere enn skjermen, scroller det innvendig til kanten først – og en gest som har scrollet
     innvendig bytter aldri kapittel (ny gest kreves). */
  useEffect(() => {
    const rot = rotRef.current; if (!rot || !data) return undefined;
    let acc = 0; let laast = false; let sisteT = 0; let sisteMag = 0; let gestIndre = false;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) return;
      if (e.target?.closest?.('[data-deck-overlay]')) return; // dialoger scroller selv
      const now = performance.now(); const mag = Math.abs(e.deltaY); const gap = now - sisteT;
      const nyGest = gap > 160 || (mag > 6 && mag >= sisteMag * 1.6 && gap > 30);
      sisteT = now; sisteMag = mag;
      if (nyGest) { gestIndre = false; acc = 0; if (now >= laastTilRef.current) laast = false; }
      const sec = seksjon(sideRef.current); if (!sec) return;
      const ned = e.deltaY > 0;
      const kanIndre = ned ? sec.scrollTop + sec.clientHeight < sec.scrollHeight - 1 : sec.scrollTop > 0;
      if (kanIndre && !laast) { gestIndre = true; return; } // nativ innvendig scroll
      e.preventDefault();
      if (laast || gestIndre || now < laastTilRef.current) return;
      acc += e.deltaY;
      if (Math.abs(acc) < 28) return;
      acc = 0;
      const neste = klem(sideRef.current + (ned ? 1 : -1), 0, sider.length - 1);
      if (neste === sideRef.current) return;
      laast = true;
      gaaTil(neste);
    };
    rot.addEventListener('wheel', onWheel, { passive: false });
    return () => rot.removeEventListener('wheel', onWheel);
  }, [data, sider, seksjon, gaaTil]);
  /* Touch: sveip bytter kapittel bare når kapitlet allerede står ved kanten i sveiperetningen
     (ellers scroller det innvendig, nativt). Terskel 56 px, eller rask flikk > 32 px. */
  useEffect(() => {
    const rot = rotRef.current; if (!rot || !data) return undefined;
    let y0 = 0; let x0 = 0; let t0 = 0; let topp = true; let bunn = true; let aktiv = false;
    const start = (e) => {
      if (e.touches.length !== 1 || e.target?.closest?.('[data-deck-overlay]')) { aktiv = false; return; }
      const sec = seksjon(sideRef.current); if (!sec) return;
      aktiv = true; y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; t0 = performance.now();
      topp = sec.scrollTop <= 0; bunn = sec.scrollTop + sec.clientHeight >= sec.scrollHeight - 1;
    };
    const slutt = (e) => {
      if (!aktiv) return; aktiv = false;
      const t = e.changedTouches?.[0]; if (!t) return;
      const dy = t.clientY - y0; const dx = t.clientX - x0; const dt = performance.now() - t0;
      if (Math.abs(dx) > Math.abs(dy)) return;
      const now = performance.now(); if (now < laastTilRef.current) return;
      const ned = dy < 0; // fingeren opp = neste
      if (!(ned ? bunn : topp)) return;
      const nok = Math.abs(dy) > 56 || (Math.abs(dy) > 32 && dt < 260);
      if (!nok) return;
      gaaTil(sideRef.current + (ned ? 1 : -1));
    };
    rot.addEventListener('touchstart', start, { passive: true });
    rot.addEventListener('touchend', slutt, { passive: true });
    rot.addEventListener('touchcancel', () => { aktiv = false; }, { passive: true });
    return () => { rot.removeEventListener('touchstart', start); rot.removeEventListener('touchend', slutt); };
  }, [data, seksjon, gaaTil]);
  /* «Mer under»-hint når aktivt kapittel er høyere enn skjermen og ikke scrollet til bunnen. */
  useEffect(() => {
    if (!data) return undefined;
    const sec = seksjon(side); if (!sec) return undefined;
    const sjekk = () => setMerUnder(sec.scrollTop + sec.clientHeight < sec.scrollHeight - 24);
    sjekk();
    sec.addEventListener('scroll', sjekk, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sjekk) : null;
    if (ro) { ro.observe(sec); if (sec.firstElementChild) ro.observe(sec.firstElementChild); }
    const t = window.setTimeout(sjekk, 900);
    return () => { sec.removeEventListener('scroll', sjekk); if (ro) ro.disconnect(); window.clearTimeout(t); };
  }, [side, data, seksjon]);
  const blaMer = () => { const sec = seksjon(sideRef.current); if (sec) sec.scrollBy({ top: Math.round(sec.clientHeight * 0.8), behavior: 'smooth' }); };
  useEffect(() => {
    if (!data?.presenter) { setMusAktiv(true); return undefined; }
    const beveg = () => { setMusAktiv(true); window.clearTimeout(musTimer.current); musTimer.current = window.setTimeout(() => setMusAktiv(false), 2800); };
    window.addEventListener('mousemove', beveg); beveg();
    return () => { window.removeEventListener('mousemove', beveg); window.clearTimeout(musTimer.current); };
  }, [data?.presenter]);
  const lastNed = () => { hendelse({ type: 'deck_nedlasting', format: 'pdf' }); window.print(); };
  const spor = async (e) => {
    e.preventDefault(); if (!sporsmal.trim() || !token) return;
    try { await fetch(`/api/investor/qa?t=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: `[Deck · ${sider[side]}] ${sporsmal.trim()}` }) }); setSpurt(true); setSporsmal(''); } catch (e2) { /* stille */ }
  };
  const byttPlan = (param, id) => { const u = new URL(window.location.href); u.searchParams.set(param, id); u.hash = ''; window.location.href = u.toString(); };
  const er = (id) => print || sider[side] === id || (utgaaende !== null && sider[utgaaende] === id);
  const posFor = (i) => (i === side ? 'aktiv' : i < side ? 'over' : 'under');
  const pos = (id) => posFor(sider.indexOf(id));

  /* ── Tilstander før data ── */
  if (trengerPin !== null) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center px-6" style={{ background: T.canvas, color: T.ink }}>
        <form onSubmit={sendPin} className="w-full max-w-[380px]" data-testid="deck-pin">
          <p className="flex items-center gap-2 text-[13.5px] font-medium" style={{ color: SVAK }}><Lock className="h-3.5 w-3.5" /> Konfidensielt</p>
          <h1 className="mt-3 text-[36px]" style={{ ...display, color: T.ink }}>DigiHome – planen{trengerPin ? <span className="block text-[20px]" style={{ color: DIM, letterSpacing: '-0.01em', lineHeight: 1.3 }}>for {trengerPin}</span> : null}</h1>
          <p className="mt-4 text-[15px]" style={{ color: DIM }}>Lenken er personlig og passordbeskyttet. Passordet er sendt separat.</p>
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Passord" autoFocus data-testid="deck-pin-input" className="mt-6 h-[52px] w-full rounded-[14px] px-5 text-[16px] outline-none" style={{ background: '#FBFAF8', boxShadow: `inset 0 0 0 1px ${HAIR}`, color: T.ink }} />
          {pinFeil ? <p className="mt-2 text-[13px]" style={{ color: FARGE.kost }} data-testid="deck-pin-feil">{pinFeil}</p> : null}
          <button type="submit" className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-medium" style={{ background: T.ink, color: T.offwhite }} data-testid="deck-pin-send">Åpne decket <ArrowRight className="h-4 w-4" strokeWidth={1.8} /></button>
        </form>
      </div>
    );
  }
  if (feil) return <div className="flex min-h-[100svh] items-center justify-center px-6" style={{ background: T.canvas, color: T.ink }}><div className="max-w-[420px] text-center"><h1 className="text-[32px]" style={display}>Kunne ikke åpne decket</h1><p className="mt-3 text-[15px]" style={{ color: DIM }}>{feil}</p></div></div>;
  if (!data || !k || !mF) return <div className="min-h-[100svh]" style={{ background: T.canvas }} />;

  /* ── Avledede tall ── */
  const sF = mF.sammendrag; const sFb = mFb?.sammendrag || sF;
  const sT = mT?.sammendrag || null; const saT = mT?.saas?.sammendrag || null; const sTb = mTb?.sammendrag || sT; const saTb = mTb?.saas?.sammendrag || saT;
  const sK = k.sammendrag; const sKb = kb?.sammendrag || sK;
  const fakta = plan.fakta || {};
  const enheterIDag = Array.isArray(fakta.enheter) ? (fakta.enheter[0] || 0) : 0;
  const honorarIDag = Array.isArray(fakta.eksisterende) ? (fakta.eksisterende[0] || 0) : 0;
  const plEnheterIDag = basisT?.huseier?.startEnheter || 0;
  const bedriftIDag = basisT?.bedrift?.startSelskaper || 0;
  const be = (idx, ym = plan.startYm) => (idx === null || idx === undefined ? 'utenfor perioden' : mndLabel(ym, idx, false));
  const delta = (a, b) => { const d = (Number(a) || 0) - (Number(b) || 0); return d === 0 ? null : d; };
  const dMnok = (a, b) => { const d = delta(a, b); return d === null ? null : `${d > 0 ? '+' : '−'}${mnok(Math.abs(d))}`; };
  const dMnd = (a, b) => { const d = delta(a, b); return d === null ? null : `${d > 0 ? '+' : ''}${d} mnd`; };
  const investor = data.investor;
  const skattPaa = Boolean(basisF?.skatt?.paa);
  const kapReell = skattPaa ? (sK.kapitalbehovEtterSkatt ?? sK.kapitalbehov) : sK.kapitalbehov;
  const kapReellIdx = skattPaa ? (sK.kapitalbehovEtterSkattIdx ?? sK.kapitalbehovIdx) : sK.kapitalbehovIdx;
  const kapBuffer = Math.ceil((kapReell || 0) * 1.3 / 250000) * 250000;
  const resReell = skattPaa ? sK.resultatEtterSkatt : sK.resultat;
  const uT = mT?.unit || null; const uF = mF.cac || {};
  const morkSide = ['forside', 'unit', 'trenger'].includes(sider[side]);
  const nyeSerie = mF.nyePerMndSerie || [];
  const fakserie = () => { if (!nyeSerie.length) return ''; const lo = Math.min(...nyeSerie); const hi = Math.max(...nyeSerie); return lo === hi ? `${nb(lo, 1)} nye enheter/mnd` : `${nb(lo, 1)}–${nb(hi, 1)} nye enheter/mnd`; };
  const prisHuseier = basisT ? (basisT.huseier.prisModell === 'fast' ? `${kr(basisT.huseier.pris)}/mnd` : `${nb(basisT.huseier.pris, 1)} % av leien`) : null;
  const paT = drivT?.partner; const paF = drivF?.partner; const paAktiv = paT?.paa ? paT : paF?.paa ? paF : null;
  const smT = saT?.sm || { annonser: 0, partner: 0, markedsforing: 0, salg: 0 };
  const smDeler = [
    { l: 'Performance-partner', v: (sF.sumPartner || 0) + smT.partner, f: LILLA_M },
    { l: 'Annonsekjøp', v: smT.annonser, f: FARGE.huseier },
    { l: 'Salg til eiendomsselskaper', v: smT.salg, f: FARGE.bedrift },
    { l: 'Forvaltning · media-CAC og markedsføring', v: Math.max(0, (sF.sumSm || 0) - (sF.sumPartner || 0)), f: T.ink },
    { l: 'Fast markedsføring Tech', v: smT.markedsforing, f: '#a6a19a' },
  ].filter((d) => d.v > 0);
  const bruk = [
    { l: 'Markedsføring og salg', v: (sF.sumSm || 0) + (saT?.sumSm || 0), f: LILLA_M },
    { l: 'Utvikling og drift av plattformen', v: mT ? sum(mT.kost.utvikling) + sum(mT.kost.hosting) : 0, f: FARGE.huseier },
    { l: 'Forvaltere og team', v: sum(mF.kost.bemanning), f: T.offwhite },
    { l: 'Grunnleggerne (lønn under marked)', v: (sF.sumGrunnleggere || 0) + (mT?.sammendrag?.sumGrunnleggere || 0), f: 'rgba(244,241,234,0.7)' },
    { l: 'Øvrige faste kostnader', v: sum(mF.kost.admin) + sum(mF.kost.andre) + (mT ? sum(mT.kost.andre) : 0), f: 'rgba(244,241,234,0.4)' },
    ...(skattPaa && sK.skatt > 0 ? [{ l: 'Skatt Digihome AS', v: sK.skatt, f: 'rgba(244,241,234,0.25)' }] : []),
  ].filter((d) => d.v > 0);
  const aarsverk = (t) => ((mF.budsjettertPct?.[t] || 0) / 100);
  const konsernLag = [{ navn: 'Digihome AS', serie: k.digihome.inntekt, farge: FARGE.dh }, { navn: 'Tech · ekstern', serie: k.tech.inntekt.map((v, i) => Math.max(0, v - (k.lisens[i] || 0))), farge: FARGE.tech }];
  const enheterSlutt = Math.round(mF.enheter[N - 1] || 0);
  const kpiGrid = [
    { l: `boliger under forvaltning ved utgang – fra ${nb(enheterIDag)} i dag`, tall: enheterSlutt, format: (v) => nb(v) },
    { l: 'konsernet går i pluss', tekst: be(sK.breakEvenIdx) },
    { l: `kapital å hente – behov ${mnok(kapReell)} + 30 % buffer`, tall: kapBuffer, format: mnok },
    { l: `driftsresultat${skattPaa ? ' etter skatt' : ''} over ${N} måneder`, tall: resReell, format: mnok, farge: resReell < 0 ? FARGE.kost : T.ink },
    ...(saT?.bruttoMarginPct != null ? [{ l: 'bruttomargin i plattformen (Tech)', tekst: pct(saT.bruttoMarginPct) }] : []),
    ...(uF?.paybackMnd != null ? [{ l: 'tilbakebetalt per ny forvaltet enhet', tekst: `${nb(uF.paybackMnd, 1)} mnd` }]
      : (uT?.huseier?.ltvCac ? [{ l: 'LTV / CAC – selvbetjente huseiere', tekst: `${nb(uT.huseier.ltvCac, 1)}×` }] : [])),
  ];
  const kap = (id) => KAPITLER.findIndex((c) => c.id === id) + 1;

  const ekstern = Boolean(token); // delt lenke (investorrom eller ren deck-lenke): ingen admin-valg
  return (
    <div ref={rotRef} className="deck-rot" style={{ background: morkSide ? T.charcoal : T.canvas, cursor: musAktiv ? 'auto' : 'none', transition: `background 600ms ${EASE}` }} data-testid="deck" data-side={sider[side]} data-intro={visIntro ? (introUt ? 'ut' : '1') : '0'}>
      <style>{`
        .deck-rot { position: fixed; inset: 0; overflow: hidden; overscroll-behavior: none; }
        .deck-side { position: absolute; inset: 0; overflow-x: hidden; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: rgba(21,19,15,0.18) transparent;
          opacity: 0; visibility: hidden; pointer-events: none; transform: translate3d(0, var(--dy, 9vh), 0) scale(var(--sc, .982));
          transition: opacity 340ms ${EASE}, transform 480ms ${EASE}, visibility 0s linear 480ms; }
        /* Kun de 1–2 slidene som faktisk er i bevegelse (aktiv + utgående) promoteres til eget lag – ikke alle 21. */
        .deck-side[data-aktiv="1"] { will-change: opacity, transform; }
        .deck-side[data-pos="over"] { --dy: -7vh; }
        .deck-side[data-pos="under"] { --dy: 7vh; }
        .deck-side[data-pos="aktiv"] { --dy: 0px; --sc: 1; opacity: 1; visibility: visible; pointer-events: auto; z-index: 2; transition-delay: 0s, 0s, 0s; }
        .dh-slider { -webkit-appearance: none; appearance: none; height: 2px; background: rgba(21,19,15,0.14); border-radius: 2px; outline: none; }
        .dh-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: ${T.ink}; border: 3px solid ${T.offwhite}; box-shadow: 0 0 0 1px rgba(21,19,15,0.2); cursor: pointer; }
        .dh-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: ${T.ink}; border: 3px solid ${T.offwhite}; cursor: pointer; }
        .deck-side .deck-inn { opacity: 0; transform: translateY(20px); transition: opacity 500ms ${EASE}, transform 500ms ${EASE}; transition-delay: calc(var(--i, 0) * 52ms + 70ms); }
        .deck-side[data-aktiv="1"] .deck-inn { opacity: 1; transform: none; }
        /* ── Felles bevegelsesspråk (rolig, én ting om gangen, alt i takt med entréen) ──
           .deck-inn[data-strek] : hårlinje øverst som tegner seg inn fra venstre (erstatter statisk border-t)
           .deck-rad             : tabellrader som kommer inn i sekvens (--i)
           .deck-stolpe          : søyler som vokser fra grunnlinjen (--i); .deck-stolpe-tekst = verdien over søylen */
        .deck-side .deck-inn[data-strek] { position: relative; }
        .deck-side .deck-inn[data-strek]::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px; background: var(--strek, ${HAIR}); transform: scaleX(0); transform-origin: left center; transition: transform 620ms ${EASE}; transition-delay: calc(var(--i, 0) * 52ms + 180ms); }
        .deck-side[data-aktiv="1"] .deck-inn[data-strek]::before { transform: scaleX(1); }
        .deck-side .deck-rad { opacity: 0; transform: translateY(8px); transition: opacity 420ms ${EASE}, transform 420ms ${EASE}; transition-delay: calc(var(--i, 0) * 45ms + 260ms); }
        .deck-side[data-aktiv="1"] .deck-rad { opacity: 1; transform: none; }
        .deck-side .deck-stolpe { transform: scaleY(0); transform-origin: bottom center; transition: transform 640ms ${EASE}; transition-delay: calc(var(--i, 0) * 80ms + 320ms); }
        .deck-side[data-aktiv="1"] .deck-stolpe { transform: scaleY(1); }
        .deck-side .deck-stolpe-tekst { opacity: 0; transform: translateY(6px); transition: opacity 420ms ${EASE}, transform 420ms ${EASE}; transition-delay: calc(var(--i, 0) * 80ms + 720ms); }
        .deck-side[data-aktiv="1"] .deck-stolpe-tekst { opacity: 1; transform: none; }
        /* Slide 02 · «Autopilot AV» – kul, subtil bevegelse (kun på aktiv slide, av hensyn til ytelse):
           toggelen prøver å slå seg PÅ og faller tilbake til AV, og fotoet får en langsom kinematisk zoom. */
        .deck-hv-foto { transform: scale(1); will-change: transform; }
        .deck-side[data-aktiv="1"] .deck-hv-foto { animation: deck-hv-foto 15s ${EASE} forwards; }
        @keyframes deck-hv-foto { from { transform: scale(1); } to { transform: scale(1.065); } }
        .deck-side[data-aktiv="1"] .deck-hv-knob { animation: deck-hv-knob 4.8s ${EASE} 900ms infinite; }
        @keyframes deck-hv-knob { 0%,55% { transform: translateX(0); } 72% { transform: translateX(22px); } 80% { transform: translateX(19px); } 92%,100% { transform: translateX(0); } }
        .deck-side[data-aktiv="1"] .deck-hv-spor { animation: deck-hv-spor 4.8s ${EASE} 900ms infinite; }
        @keyframes deck-hv-spor { 0%,55% { background-color: rgba(21,19,15,0.16); } 72% { background-color: rgba(139,92,246,0.5); } 80% { background-color: rgba(139,92,246,0.4); } 92%,100% { background-color: rgba(21,19,15,0.16); } }
        /* Slide 03 · «AI-motoren» – driftsområdene strømmer inn i én glødende AI-kjerne. Lys flyter langs linjene, og
           kjernen pulserer rolig. Kun på aktiv slide (ytelse). */
        .deck-los-stream { stroke-dasharray: 4 8; }
        .deck-side[data-aktiv="1"] .deck-los-stream { animation: deck-los-stream 1s linear infinite; }
        @keyframes deck-los-stream { to { stroke-dashoffset: -12; } }
        .deck-los-gloed { will-change: transform, opacity; }
        .deck-side[data-aktiv="1"] .deck-los-gloed { animation: deck-los-gloed 3.4s ${EASE} infinite; }
        @keyframes deck-los-gloed { 0%,100% { opacity: .5; transform: scale(1); } 50% { opacity: .85; transform: scale(1.14); } }

        /* Hvorfor: trådene er statiske, stiplede (manuelle koblinger). Navet «Du» pulserer slitent. Oppgave-punktene
           som glir inn til deg animeres i SVG (animateMotion) – kun rendret når sliden er aktiv. */
        .deck-frag-trad { stroke-dasharray: 2 5; }
        .deck-side[data-aktiv="1"] .deck-frag-puls { animation: deck-frag-puls 3.8s ${EASE} infinite; }
        @keyframes deck-frag-puls { 0%,100% { opacity: .5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.06); } }
        /* Markedsfelt: myk glød bak 1 %-klyngen + pust i planringen */
        .deck-mkt-glow { opacity: .7; transform-box: fill-box; transform-origin: center; }
        .deck-side[data-aktiv="1"] .deck-mkt-glow { animation: deck-los-gloed 4.4s ${EASE} infinite; }
        .deck-mkt-ring { transform-box: fill-box; transform-origin: center; }
        .deck-side[data-aktiv="1"] .deck-mkt-ring { animation: deck-mkt-ring 3.2s ${EASE} infinite; }
        @keyframes deck-mkt-ring { 0%,100% { opacity: .9; } 50% { opacity: .32; } }
        .deck-hjul-rot { transform-box: fill-box; transform-origin: center; opacity: .9; }
        .deck-side[data-aktiv="1"] .deck-hjul-rot { animation: deck-hjul-rot 24s linear infinite; }
        @keyframes deck-hjul-rot { to { transform: rotate(360deg); } }
        /* Svinghjulet forteller i rekkefølge: ring tegnes → steg 1–4 med klokka → navet → verdien sirkulerer */
        .deck-hjul-tegn { stroke-dashoffset: 226.2; }
        .deck-side[data-aktiv="1"] .deck-hjul-tegn { animation: deck-hjul-tegn 1.5s ${EASE} .25s both; }
        @keyframes deck-hjul-tegn { to { stroke-dashoffset: 0; } }
        .deck-hjul-chev { opacity: 0; transition: opacity .6s ${EASE} 1.6s; }
        .deck-side[data-aktiv="1"] .deck-hjul-chev { opacity: 1; }
        .deck-hjul-orbit { transform-box: view-box; transform-origin: 50% 50%; opacity: 0; }
        .deck-side[data-aktiv="1"] .deck-hjul-orbit { animation: deck-hjul-orbit 9s linear 1.8s infinite, deck-hjul-orbit-inn .8s ${EASE} 1.8s both; }
        @keyframes deck-hjul-orbit { to { transform: rotate(360deg); } }
        @keyframes deck-hjul-orbit-inn { to { opacity: 1; } }
        .deck-side[data-aktiv="1"] .deck-hjul-lisens { animation: deck-hjul-lisens 2.8s ${EASE} infinite; }
        @keyframes deck-hjul-lisens { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
        /* Spekteret (For hvem): skinnen fylles fra «du gjør det selv» → «vi gjør alt» */
        .deck-spk-skinne { transform: scaleX(0); transform-origin: left; }
        .deck-side[data-aktiv="1"] .deck-spk-skinne { animation: deck-spk-skinne 1.1s ${EASE} .5s both; }
        @keyframes deck-spk-skinne { to { transform: scaleX(1); } }
        .deck-side[data-aktiv="1"] .deck-live-dot { animation: deck-live 1.8s ${EASE} infinite; }
        @keyframes deck-live { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.6); } }
        /* Strukturen (konsern): linjene tegner seg fra mor til de to selskapene */
        .deck-eier-v { transform: scaleY(0); transform-origin: top; }
        .deck-eier-h { transform: scaleX(0); transform-origin: center; }
        .deck-eier-p { opacity: 0; transform: scale(0); }
        .deck-side[data-aktiv="1"] .deck-eier-v { animation: deck-eier-v .45s ${EASE} var(--d, 0s) both; }
        .deck-side[data-aktiv="1"] .deck-eier-h { animation: deck-eier-h .5s ${EASE} var(--d, 0s) both; }
        .deck-side[data-aktiv="1"] .deck-eier-p { animation: deck-eier-p .4s ${EASE} var(--d, 0s) both; }
        @keyframes deck-eier-v { to { transform: scaleY(1); } }
        @keyframes deck-eier-h { to { transform: scaleX(1); } }
        @keyframes deck-eier-p { to { opacity: 1; transform: scale(1); } }

        .deck-side .deck-linje { --l: 0; transition: transform 460ms ${EASE} 280ms; }
        .deck-side[data-aktiv="1"] .deck-linje { --l: 1; }
        .deck-ord { display: inline-block; opacity: 0; transform: translateY(0.5em); transition: opacity 480ms ${EASE}, transform 480ms ${EASE}; transition-delay: calc(var(--o, 0) * 40ms + 120ms); }
        .deck-side[data-aktiv="1"] .deck-ord { opacity: 1; transform: none; }
        @keyframes deck-strom { to { stroke-dashoffset: -28; } }
        .deck-strom { stroke-dasharray: 6 8; animation: deck-strom 1.6s linear infinite; }
        @keyframes deck-nikk { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
        .deck-nikk { animation: deck-nikk 1.6s ${EASE} infinite; }
        /* Toppverktøyene (PDF, Del, planvalg): rene, skjult i ro – de svever inn først når du hovrer over dem øverst
           til høyre (eller tab-fokuserer). På berøring (ingen hover) står de alltid fremme. */
        .deck-verktoy { opacity: 0; transform: translateY(-8px); transition: opacity 460ms ${EASE}, transform 460ms ${EASE}; pointer-events: none; }
        .deck-topp-group:hover .deck-verktoy, .deck-topp-group:focus-within .deck-verktoy { opacity: 1; transform: none; pointer-events: auto; }
        @media (hover: none) { .deck-verktoy { opacity: 1; transform: none; pointer-events: auto; } }
        /* Verktøyvifta (slide 02): løftede kort med dybde, viftet med små skjeve vinkler og overlapp. Hylsteret bærer
           entré-animasjonen (deck-inn), kortet bærer rotasjonen – så de aldri kolliderer på samme transform. */
        .deck-kortvifte { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 6px; }
        .deck-kort-hylster { display: inline-flex; }
        .deck-kort { display: inline-flex; align-items: center; gap: 9px; padding: 9px 14px 9px 9px; border-radius: 15px; background: #FFFFFF; border: 1px solid rgba(21,19,15,0.06); box-shadow: 0 14px 30px -12px rgba(21,19,15,0.22), 0 2px 6px -2px rgba(21,19,15,0.08); transform: rotate(var(--rot, 0deg)); }
        .deck-kort-ikon { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 10px; background: rgba(122,63,168,0.08); color: ${LILLA_M}; flex: none; }
        /* Løftet «produkt»-kort (tilbud/veier inn): hvit flate med dybde. */
        .deck-kort-stor { background: #FFFFFF; border: 1px solid rgba(21,19,15,0.06); border-radius: 22px; padding: 26px 24px; box-shadow: 0 26px 50px -22px rgba(21,19,15,0.18), 0 2px 6px -3px rgba(21,19,15,0.06); }
        .deck-kort-stor-ikon { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 13px; background: rgba(122,63,168,0.09); color: ${LILLA_M}; }
        /* ── Cinematisk intro (før forsiden) ── blur-fri (kun opacity/transform → GPU, ingen lagg). Merket samler seg,
           løftet skrives ord for ord PÅ ÉN LINJE. UTGANG = per-ord-MORPH: hvert ord reiser (FLIP, inline transform) til
           sin plass på forsidens to linjer og skifter farge; lyset toner til mørke; merket skyves gjennom kamera. */
        .deck-intro { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .deck-intro[data-ut="1"] { pointer-events: none; }
        .deck-intro-bg { position: absolute; inset: 0; background: ${T.canvas}; opacity: 1; transition: opacity 1050ms cubic-bezier(0.6, 0, 0.2, 1) 120ms; }
        .deck-intro[data-ut="1"] .deck-intro-bg { opacity: 0; }
        .deck-intro-glow { position: absolute; left: 50%; top: 50%; width: 60vmin; height: 60vmin; border-radius: 50%; opacity: 0; transform: translate3d(-50%, -50%, 0) scale(0.82); background: radial-gradient(circle, rgba(212,150,255,0.22) 0%, rgba(212,150,255,0.07) 42%, rgba(212,150,255,0) 70%); animation: deck-glow-inn 1600ms ${EASE} both; }
        @keyframes deck-glow-inn { to { opacity: 1; transform: translate3d(-50%, -50%, 0) scale(1); } }
        .deck-intro[data-ut="1"] .deck-intro-glow { animation: deck-glow-ut 640ms ${EASE} both; }
        @keyframes deck-glow-ut { to { opacity: 0; transform: translate3d(-50%, -50%, 0) scale(1.3); } }
        .deck-intro-ikon { animation: deck-ikon-inn 1050ms cubic-bezier(0.22, 1.12, 0.36, 1) both; }
        @keyframes deck-ikon-inn { from { opacity: 0; transform: scale(0.72) translateY(10px); } to { opacity: 1; transform: none; } }
        .deck-intro[data-ut="1"] .deck-intro-ikon { animation: deck-ikon-ut 800ms cubic-bezier(0.6, 0, 0.3, 1) both; }
        @keyframes deck-ikon-ut { to { opacity: 0; transform: scale(2.15); } }
        .deck-intro-mark { opacity: 0; animation: deck-mark-inn 400ms ${EASE} forwards; animation-delay: calc(var(--m, 0) * 60ms + 600ms); }
        @keyframes deck-mark-inn { to { opacity: 1; } }
        .deck-intro-tittel { transition: color 640ms ${EASE} 220ms, text-shadow 640ms ${EASE} 220ms; }
        .deck-intro[data-ut="1"] .deck-intro-tittel { color: ${T.offwhite} !important; text-shadow: 0 2px 60px rgba(0,0,0,0.45); }
        .deck-intro-flip { display: inline-block; transform-origin: 50% 50%; transition: transform 1180ms cubic-bezier(0.66, 0, 0.16, 1); }
        .deck-intro-ord { display: inline-block; opacity: 0; transform: translateY(0.34em); animation: deck-ord-inn 760ms cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: calc(var(--o, 0) * 115ms + 1050ms); }
        @keyframes deck-ord-inn { to { opacity: 1; transform: none; } }
        .deck-intro-strek { transform: scaleX(0); transform-origin: 50% 50%; animation: deck-strek-inn 820ms ${EASE} 1560ms both; }
        @keyframes deck-strek-inn { to { transform: scaleX(1); } }
        .deck-intro[data-ut="1"] .deck-intro-strek { animation: deck-strek-ut 260ms ${EASE} both; }
        @keyframes deck-strek-ut { to { transform: scaleX(0); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .deck-intro-ikon, .deck-intro-mark, .deck-intro-ord, .deck-intro-strek, .deck-intro-glow, .deck-intro-flip { animation: none !important; opacity: 1 !important; transform: none !important; transition: none !important; }
          .deck-intro-glow { transform: translate3d(-50%, -50%, 0) !important; }
        }

        /* YTELSE: kun det aktive kapitlet skal «leve». Alle evige animasjoner i inaktive/skjulte slides stanses
           (video pauses i JS). Uten dette dekoder cover-videoen og Konsept-scenen samtidig – det lagget. */
        .deck-side:not([data-pos="aktiv"]), .deck-side:not([data-pos="aktiv"]) * { animation-play-state: paused !important; }

        /* Intro-hold på forsiden: forsidens tittel og innhold holdes tilbake til morphen har landet; scenen zoomer rolig ut (kamera). */
        .deck-rot[data-intro="1"] .deck-cover-tittel, .deck-rot[data-intro="ut"] .deck-cover-tittel { opacity: 0 !important; }
        .deck-rot[data-intro="1"] .deck-side[data-aktiv="1"] .deck-inn, .deck-rot[data-intro="ut"] .deck-side[data-aktiv="1"] .deck-inn { opacity: 0; transform: translateY(26px) scale(.985); transition: none; }
        .deck-cover-scene { transition: transform 1600ms cubic-bezier(0.22, 1, 0.36, 1); transform-origin: 62% 50%; }
        .deck-rot[data-intro="1"] .deck-cover-scene { transform: scale(1.06); }
        /* Coveren: merkets signaturbilde (eieren hjemme om kvelden), speilet så han står til høyre for teksten.
           Et knapt merkbart, langsomt skyv innover mens kapitlet er aktivt – kino, ikke slideshow. */
        .deck-cover-foto { transform: scaleX(-1) scale(1.02); transform-origin: 50% 50%; transition: transform 16s linear; filter: saturate(0.92); }
        .deck-side[data-aktiv="1"] .deck-cover-foto { transform: scaleX(-1) scale(1.08); }
        .deck-cover-strek { transform: scaleX(0); transform-origin: 0 50%; transition: transform 1200ms ${EASE} 900ms; }
        .deck-side[data-aktiv="1"] .deck-cover-strek { transform: scaleX(1); }
        /* Coverens scene: forsidens HeroStage, men som sceneteppe – kant til kant, uten kortets radius/skygge/høydetak. */
        .deck-cover-scene .dh-hero-scene { max-height: none !important; border-radius: 0 !important; box-shadow: none !important; }
        @media (prefers-reduced-motion: reduce) { .deck-side { transition: opacity 200ms linear, visibility 0s linear 200ms; transform: none !important; } .deck-side .deck-inn, .deck-ord { opacity: 1; transform: none; transition: none; } .deck-side .deck-inn[data-strek]::before { transform: scaleX(1); transition: none; } .deck-side .deck-rad, .deck-side .deck-stolpe, .deck-side .deck-stolpe-tekst { opacity: 1; transform: none; transition: none; } .deck-strom, .deck-nikk, .deck-hv-foto, .deck-hv-knob, .deck-hv-spor, .deck-los-stream, .deck-los-gloed, .deck-mkt-glow, .deck-mkt-ring, .deck-hjul-rot, .deck-hjul-tegn, .deck-hjul-orbit, .deck-hjul-lisens, .deck-spk-knott, .deck-spk-skinne, .deck-live-dot, .deck-eier-v, .deck-eier-h, .deck-eier-p { animation: none !important; } .deck-eier-v, .deck-eier-h, .deck-eier-p { transform: none !important; opacity: 1 !important; } .deck-hjul-tegn { stroke-dashoffset: 0 !important; } .deck-hjul-chev, .deck-hjul-orbit { opacity: 1 !important; } .deck-spk-skinne { transform: scaleX(1) !important; } .deck-side .deck-linje { --l: 1; transition: none; } .deck-cover-foto { transition: none; transform: scaleX(-1) scale(1.04); } .deck-cover-strek { transition: none; transform: scaleX(1); } }
        @media print { .deck-rot { position: static !important; overflow: visible !important; height: auto !important; } .deck-side { position: static !important; opacity: 1 !important; visibility: visible !important; transform: none !important; overflow: visible !important; page-break-after: always; } .deck-side-indre { min-height: auto !important; padding: 32px !important; } .deck-side .deck-inn, .deck-ord { opacity: 1 !important; transform: none !important; } .deck-side .deck-linje { --l: 1; } .deck-skjul-print { display: none !important; } }
      `}</style>

      {/* Cinematisk intro: merket + løftet på lys flate. Tittelen MORFER (FLIP) til sin plass på forsiden; lyset toner
          til mørke; merket skyves gjennom; kamera trekker seg tilbake. Klikk hopper over. */}
      {visIntro ? (
        <div className="deck-intro deck-skjul-print" data-ut={introUt ? '1' : '0'} onClick={hoppIntro} data-testid="deck-intro">
          <div className="deck-intro-bg" aria-hidden="true" />
          <div className="deck-intro-glow" aria-hidden="true" />
          <div className="deck-intro-inner relative flex flex-col items-center px-6">
            <div className="deck-intro-ikon"><DhIkon px={92} animer /></div>
            <h1 ref={introTittelRef} className="deck-intro-tittel mt-9 whitespace-nowrap text-[36px] sm:text-[60px] lg:text-[72px]" style={{ ...display, color: T.ink, letterSpacing: '-0.04em', lineHeight: 0.92 }}>
              <span className="deck-intro-flip mr-[0.2em]" data-ord="0" style={{ '--o': 0 }}><span className="deck-intro-ord">Utleie</span></span>
              <span className="deck-intro-flip mr-[0.2em]" data-ord="1" style={{ '--o': 1 }}><span className="deck-intro-ord">på</span></span>
              <span className="deck-intro-flip" data-ord="2" style={{ '--o': 2 }}><span className="deck-intro-ord">autopilot<span style={{ color: T.lilla }}>.</span></span></span>
            </h1>
            <div className="deck-intro-strek mt-9 h-px w-12" style={{ background: 'rgba(21,19,15,0.22)' }} />
          </div>
        </div>
      ) : null}


      {/* Fremdriftslinje */}
      <div className="deck-skjul-print pointer-events-none fixed inset-x-0 top-0 z-30 h-[3px]" style={{ background: morkSide ? 'rgba(244,241,234,0.1)' : 'rgba(21,19,15,0.07)' }}>
        <div className="h-full" style={{ width: `${((side + 1) / sider.length) * 100}%`, background: morkSide ? T.lilla : T.ink, transition: `width 600ms ${EASE}, background 500ms` }} />
      </div>

      {/* Toppstripe: kapittel (alle) + handlinger (kun presenter) – skjules ved ro i presenter */}
      <div className="deck-skjul-print pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-5 sm:px-8" style={{ opacity: musAktiv || side === 0 ? 1 : 0, transition: `opacity 500ms ${EASE}` }}>
        <button onClick={() => setVisKapitler((v) => !v)} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-500" style={{ background: morkSide ? 'rgba(244,241,234,0.08)' : 'rgba(21,19,15,0.05)', color: morkSide ? T.offwhite : T.ink, backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)', boxShadow: morkSide ? 'inset 0 0 0 1px rgba(244,241,234,0.14)' : 'inset 0 0 0 1px rgba(21,19,15,0.08)' }} data-testid="deck-kapitler" aria-label={`Kapitler · ${side + 1} av ${sider.length}`} title="Kapitler">
          <Menu className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </button>
        {!ekstern && data.presenter ? (
          <div className="deck-topp-group pointer-events-auto flex items-center" data-testid="deck-presenter-valg">
            <div className="deck-verktoy flex items-center gap-2">
            {data.planer?.length > 1 ? (
              <select value={plan.id} onChange={(e) => byttPlan('plan', e.target.value)} className="hidden h-9 max-w-[200px] rounded-full px-3 text-[12.5px] transition-colors duration-500 sm:block" style={{ background: morkSide ? 'rgba(244,241,234,0.1)' : 'rgba(21,19,15,0.06)', color: morkSide ? T.offwhite : T.ink }} data-testid="deck-planvalg" title="Digihome AS-plan">
                {data.planer.map((p) => <option key={p.id} value={p.id} style={{ color: T.ink }}>DH · {p.navn}{p.investorSynlig ? '' : ' (ikke delt)'}</option>)}
              </select>
            ) : null}
            {data.techPlaner?.length > 1 && techPlan ? (
              <select value={techPlan.id} onChange={(e) => byttPlan('tech', e.target.value)} className="hidden h-9 max-w-[200px] rounded-full px-3 text-[12.5px] transition-colors duration-500 lg:block" style={{ background: morkSide ? 'rgba(244,241,234,0.1)' : 'rgba(21,19,15,0.06)', color: morkSide ? T.offwhite : T.ink }} data-testid="deck-techvalg" title="Tech AS-plan">
                {data.techPlaner.map((p) => <option key={p.id} value={p.id} style={{ color: T.ink }}>Tech · {p.navn}{p.investorSynlig ? '' : ' (ikke delt)'}</option>)}
              </select>
            ) : null}
            {preset !== 'plan' ? <button onClick={nullstill} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium" style={{ background: morkSide ? 'rgba(212,150,255,0.18)' : 'rgba(122,63,168,0.12)', color: morkSide ? T.lilla : LILLA_M }} data-testid="deck-nullstill"><RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tilbake til planen</span><span className="sm:hidden">Planen</span></button> : null}
            <button onClick={lastNed} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors duration-500" style={{ background: morkSide ? 'rgba(244,241,234,0.1)' : 'rgba(21,19,15,0.06)', color: morkSide ? T.offwhite : T.ink }} data-testid="deck-lastned"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">PDF</span></button>
            <button onClick={() => setVisDeling(true)} className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition-colors duration-500" style={{ background: morkSide ? T.offwhite : T.ink, color: morkSide ? T.ink : T.offwhite }} data-testid="deck-del"><Share2 className="h-3.5 w-3.5" /> Del</button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Kapittelvelger */}
      {visKapitler ? (
        <div className="deck-skjul-print fixed inset-0 z-40 flex items-start justify-start p-5 sm:p-8" onClick={() => setVisKapitler(false)} data-deck-overlay>
          <div className="mt-12 w-full max-w-[380px] rounded-[22px] p-2 shadow-[0_24px_80px_rgba(20,17,14,0.25)]" style={{ background: '#FBFAF8' }} onClick={(e) => e.stopPropagation()} data-testid="deck-kapittelliste">
            <div className="flex items-center justify-between px-3 pb-1 pt-2"><p className="text-[12px] font-medium" style={{ color: SVAK }}>Kapitler</p><button onClick={() => setVisKapitler(false)} className="rounded-full p-1" style={{ color: SVAK }} aria-label="Lukk"><X className="h-4 w-4" /></button></div>
            {KAPITLER.map((c, i) => (
              <button key={c.id} onClick={() => gaaTil(i)} className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left text-[14px] transition-colors" style={{ background: side === i ? T.ink : 'transparent', color: side === i ? T.offwhite : T.ink }} data-testid={`deck-kap-${c.id}`}>
                <span className="w-6 text-[12px] tabular-nums" style={{ color: side === i ? T.lilla : LILLA_M }}>{String(i + 1).padStart(2, '0')}</span>{c.navn}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Ekstern deling (presenter) */}
      {visDeling && data.presenter ? <Deling qs={qs} plan={plan} techPlan={techPlan} onClose={() => setVisDeling(false)} /> : null}

      {/* «Mer under»-hint: kapitlet er høyere enn skjermen */}
      <div className="deck-skjul-print pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center" style={{ opacity: merUnder ? 1 : 0, transition: `opacity 400ms ${EASE}` }}>
        <button onClick={blaMer} tabIndex={merUnder ? 0 : -1} className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-full pl-3 pr-2.5 text-[12px] font-medium shadow-[0_8px_24px_rgba(20,17,14,0.14)]" style={{ background: morkSide ? T.offwhite : T.ink, color: morkSide ? T.ink : T.offwhite }} data-testid="deck-mer">Mer på dette kapitlet <ChevronDown className="deck-nikk h-3.5 w-3.5" /></button>
      </div>

      {/* Bunn: opp/ned + notater (presenter) */}
      <div className="deck-skjul-print pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between px-5 pb-5 sm:px-8" style={{ opacity: musAktiv ? 1 : 0, transition: `opacity 500ms ${EASE}` }}>
        <div className="pointer-events-auto max-w-[520px]">
          {data.presenter && visNotater && NOTATER[sider[side]] ? <div className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.5] shadow-[0_12px_40px_rgba(20,17,14,0.18)]" style={{ background: '#2b2822', color: T.offwhite }} data-testid="deck-notat"><span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: T.lilla }}>Notat</span>{NOTATER[sider[side]]}</div> : null}
        </div>
        <div className="pointer-events-auto flex items-center gap-1.5">
          {side < sider.length - 1 ? <button onClick={() => gaaTil(side + 1)} className="mr-2 hidden text-[12.5px] font-medium transition-colors duration-500 sm:block" style={{ color: morkSide ? LYS_SVAK : SVAK }} data-testid="deck-neste-navn">Neste · <span style={{ color: morkSide ? T.offwhite : T.ink }}>{KAPITLER[side + 1].navn}</span></button> : null}
          <button onClick={() => gaaTil(side - 1)} disabled={side === 0} aria-label="Forrige" className="flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-500 disabled:opacity-30" style={{ background: morkSide ? 'rgba(244,241,234,0.1)' : 'rgba(21,19,15,0.06)', color: morkSide ? T.offwhite : T.ink }} data-testid="deck-forrige"><ArrowUp className="h-4 w-4" strokeWidth={1.8} /></button>
          <button onClick={() => gaaTil(side + 1)} disabled={side === sider.length - 1} aria-label="Neste" className="flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-500 disabled:opacity-30" style={{ background: morkSide ? T.offwhite : T.ink, color: morkSide ? T.ink : T.offwhite }} data-testid="deck-neste"><ArrowDown className="h-4 w-4" strokeWidth={1.8} /></button>
        </div>
      </div>

      {/* 01 · Forside – coveren. Full-bleed video (sofa-loopen, speilvendt så han sitter til høyre) bak et rolig sløret
          lys – og oppå: pushvarselet som åpner appen + chat-boblene (gjenbruk av Telefonstrom, speilvendt). Ikke veggkort,
          ikke kart. Løftet står til venstre. Ingen innholdsfortegnelse. Resten av decket er lyst – coveren er sceneteppet. */}
      <Side id="forside" pos={pos('forside')} aktiv={er('forside')} morkt bred>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" data-testid="deck-cover-bak">
          {/* Selve forsidescenen, uendret – video-loopen med pushvarselet som åpner appen og chat-boblene. Uten kart/adressekort, uten «pil»/lystråd. */}
          <div className="deck-cover-scene absolute inset-0 flex items-center" data-testid="deck-cover-scene">
            <div className="w-full"><HeroStage eiendom={null} bilde="stue" film={HERO_FILM} utenVegg speil utenPil hold={visIntro} /></div>
          </div>
          {/* Kino-scrim: dyp ro til venstre der løftet står, klarner rolig mot ham til høyre – ingen grøt i midten. */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(17,14,11,0.97) 0%, rgba(17,14,11,0.9) 20%, rgba(17,14,11,0.58) 42%, rgba(17,14,11,0.2) 62%, rgba(17,14,11,0.04) 82%, rgba(17,14,11,0) 100%)' }} />
          {/* Topp for kontrollene, bunn for nøkkeltallene – begge svært mykt, aldri en hard kant. */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(17,14,11,0.5) 0%, rgba(17,14,11,0) 15%, rgba(17,14,11,0) 60%, rgba(17,14,11,0.34) 82%, rgba(17,14,11,0.72) 100%)' }} />
          {/* Et varmt lilla åndedrag bak ham – merkets farge i rommet, nedtonet. */}
          <div className="absolute" style={{ right: '-6%', top: '-20%', width: '54%', height: '82%', background: 'radial-gradient(circle, rgba(212,150,255,0.1) 0%, rgba(212,150,255,0.03) 44%, rgba(212,150,255,0) 70%)' }} />
        </div>

        <div className="relative max-w-[680px]">
          <Inn i={0} className="flex items-center gap-3.5">
            <span className="text-[15px] font-semibold" style={{ ...display, letterSpacing: '-0.01em', color: T.offwhite }}>DigiHome</span>
            <span className="deck-cover-strek h-px w-8" style={{ background: 'rgba(244,241,234,0.3)' }} />
            <span className="text-[11px] font-medium uppercase" style={{ letterSpacing: '0.2em', color: 'rgba(244,241,234,0.55)' }}>Investordeck</span>
          </Inn>
          {investor ? <Inn i={1}><p className="mt-5 text-[12.5px]" style={{ color: 'rgba(244,241,234,0.5)' }}>Utarbeidet for <span style={{ color: 'rgba(244,241,234,0.82)' }}>{investor.label}</span></p></Inn> : null}
          <h1 ref={coverTittelRef} className="deck-cover-tittel mt-7 w-fit text-[58px] sm:text-[88px] lg:text-[112px]" style={{ ...display, color: T.offwhite, letterSpacing: '-0.04em', lineHeight: 0.92, textShadow: '0 2px 60px rgba(0,0,0,0.45)' }}>
            <span className="block"><span className="deck-ord mr-[0.2em]" data-ord="0" style={{ '--o': 0 }}>Utleie</span><span className="deck-ord" data-ord="1" style={{ '--o': 1 }}>på</span></span>
            <span className="block"><span className="deck-ord" data-ord="2" style={{ '--o': 2 }}>autopilot<span style={{ color: T.lilla }}>.</span></span></span>
          </h1>
          <Inn i={3}><p className="mt-7 max-w-[42ch] text-[16.5px] leading-[1.6] sm:text-[18.5px]" style={{ color: 'rgba(244,241,234,0.86)' }}>Programvaren som driver utleieboligen – for private huseiere og for eiendomsselskaper med hele porteføljer. Og forvaltningen for dem som heller vil overlate driften. <span style={{ color: T.offwhite }}>To selskaper, én plattform.</span></p></Inn>
          <Inn i={5} className="deck-skjul-print mt-12 flex items-center gap-2.5 text-[11px] font-medium uppercase" style={{ letterSpacing: '0.16em', color: 'rgba(244,241,234,0.42)' }}>Bla videre <ChevronDown className="deck-nikk h-3.5 w-3.5" /></Inn>
        </div>
      </Side>

      {/* 02 · Hvorfor – PROBLEMET, motstykket til Løsningen. Venstre: «Utleie mangler et system» + kostnaden (manuell drift
          skalerer med lønn – vist som en bemanningstrapp). Høyre: de fire driftsområdene i frakoblede verktøy, manuelle
          tråder inn til «Du er systemet». Rolig og konkret – ingen busy lister eller mørke paneler. */}
      <Side id="hvorfor" pos={pos('hvorfor')} aktiv={er('hvorfor')} bred>
        <Kapittel nr={kap('hvorfor')} navn="Hvorfor" under="manuell drift som ikke skalerer" />
        <Todelt className="lg:items-center" venstre={<>
          <Inn i={1}><H2 maks="16ch">Utleie mangler et system.</H2></Inn>
          <Ingress maks="44ch">Annonsering, kontrakter, husleie og drift håndteres manuelt i frakoblede verktøy – for både privatpersoner og eiendomsselskaper. Ingen har bygget ett system som driver hele boligen.</Ingress>
          <Inn i={5} className="mt-9 border-l-2 pl-5" style={{ borderColor: FARGE.kost }}>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: FARGE.kost }}><AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} /> Kostnaden</p>
            <p className="mt-3 text-[24px] sm:text-[30px]" style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.08, color: T.ink }}>Manuell drift skalerer med lønn.</p>
            <p className="mt-3 text-[14.5px] leading-[1.55]" style={{ color: DIM, maxWidth: '42ch' }}>For eiendomsselskaper øker bemanningsbehovet i takt med porteføljen. Hver enhet legger på manuelle timer som belaster marginen.</p>
            {/* Bemanningstrappen – kostnaden gjort synlig: flere enheter → flere manuelle timer → flere folk */}
            <div className="mt-5 flex items-end gap-[6px]" data-testid="deck-kost-trapp">
              {[12, 18, 26, 36, 48, 62].map((h, i) => (
                <span key={h} aria-hidden="true" className="deck-inn w-[9px] rounded-t-[3px]" style={{ '--i': 6 + i * 0.3, height: h, background: i < 2 ? 'rgba(21,19,15,0.16)' : i < 4 ? 'rgba(179,38,30,0.38)' : FARGE.kost }} />
              ))}
              <span className="ml-3 text-[11.5px] leading-[1.3]" style={{ color: SVAK }}>flere enheter →<br />flere folk på lønn</span>
            </div>
          </Inn>
        </>}>
          <FragmentKjerne aktiv={er('hvorfor')} />
        </Todelt>
      </Side>

      {/* 03 · Løsningen – produktet som en NYDELIG EDITORIAL full-bleed bakgrunn (forsidens kino-filmer: foto +
          editorial tittel), ikke et kort. Stegene (Annonse→Kontrakt→Drift→Økonomi) spiller som bevis, styrt av
          decket (spiller kun når sliden er fremme – ytelse). LosningFilm eier hele det full-bleed oppsettet. */}
      <Side id="losning" pos={pos('losning')} aktiv={er('losning')} bred full>
        <LosningFilm aktiv={er('losning')} nr={kap('losning')} />
      </Side>


      {/* 03 · Markedet – stort, fragmentert, privat */}
      <Side id="marked" pos={pos('marked')} aktiv={er('marked')} bred>
        <Kapittel nr={kap('marked')} navn="Markedet" under="stort, privat og fragmentert" />
        <div className="mt-2 grid gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Venstre: fortellingen + de to segmentene */}
          <div className="lg:col-span-5">
            <Inn i={1}><H2 maks="13ch">Hver fjerde husholdning leier.</H2></Inn>
            <Ingress i={2} maks="40ch">Stort, privat og fragmentert. Nesten ingen utleier har et system i dag.</Ingress>
            <Inn i={3} className="mt-8">
              <div className="relative pl-5">
                <span aria-hidden="true" className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full" style={{ background: `linear-gradient(180deg, ${LILLA_M}, rgba(122,63,168,0.14))` }} />
                <p className="text-[20px] leading-[1.32] sm:text-[23px]" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }}>Markedet er ikke spørsmålet.<br /><span style={{ color: LILLA_M }}>Tempoet på kundeanskaffelse er.</span></p>
              </div>
            </Inn>
            <div className="mt-9 border-t" style={{ borderColor: HAIR }}>
              {[['Private eiere', 'Én til noen få enheter – uten system, uten forvalter, med fullt juridisk ansvar.', 'Selvbetjening og forvaltning'], ['Profesjonelle og forvaltere', 'Lokalt og manuelt: mange små aktører, regneark og e-post. Ingen har bygget både programvaren og driften.', 'Eiendomsselskaper og forvaltere']].map(([t, u, tag], i) => (
                <Inn key={t} i={4 + i} className="border-b py-4" style={{ borderColor: HAIR }}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[16px] font-medium tracking-[-0.01em]" style={{ color: T.ink }}>{t}</p>
                    <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: LILLA_M }}>Målgruppe {i + 1}</p>
                  </div>
                  <p className="mt-1.5 text-[13.5px] leading-[1.55]" style={{ color: DIM }}>{u}</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: SVAK }}>{tag}</p>
                </Inn>
              ))}
            </div>
          </div>
          {/* Høyre: skalaen som bevis – markedet mot ambisjonen */}
          <div className="lg:col-span-7">
            <Inn i={2} className="lg:pt-1.5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: SVAK }}>Norges leiemarked</p>
                <p className="text-[12px]" style={{ color: SVAK }}>hver prikk ≈ 850 husholdninger</p>
              </div>
              <div className="mt-4"><Markedsfelt enheterPlan={Math.round(mF.enheter[N - 1] || 0)} /></div>
              <div className="mt-7 grid grid-cols-1 gap-5 border-t pt-6 sm:grid-cols-3 sm:gap-6" style={{ borderColor: HAIR }}>
                <MarkedLegende sw="rgba(21,19,15,0.16)" over="Markedet" v="≈ 570 000" u="husholdninger · 23 % av alle" />
                <MarkedLegende sw={LILLA_M} fremhev over="1 % av markedet" v={`${nb(5700)}`} u={`enheter · ${nb(Math.round(5700 / Math.max(1, Math.round(mF.enheter[N - 1] || 1))))}× planen`} />
                <MarkedLegende ring fremhev over="Planen" v={`${nb((Math.round(mF.enheter[N - 1] || 0) / 570000) * 100, 2)} %`} u={`≈ ${nb(Math.round(mF.enheter[N - 1] || 0))} enheter · ${mndLabel(plan.startYm, N - 1, false)}`} />
              </div>
              <Inn i={5}>
                <p className="mt-6 max-w-[62ch] text-[13.5px] leading-[1.6]" style={{ color: DIM }}>Vi starter i Bergen og 60 km rundt – stort nok for planen, lite nok til å eie kvaliteten. Programvaren har ingen geografi. <span style={{ color: SVAK }}>SSB, boforhold (avrundet).</span></p>
              </Inn>
            </Inn>
          </div>
        </div>
      </Side>

      {/* 04 · Konseptet – forsidens levende scene */}
      <Side id="konsept" pos={pos('konsept')} aktiv={er('konsept')} bred>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,4.7fr)_minmax(0,7fr)] lg:gap-14">
          <div>
            <Kapittel nr={kap('konsept')} navn="Konseptet" under="slik ser en dag ut" />
            <Inn i={1}><H2 maks="15ch">Systemet driver boligen. Eieren har siste ord.</H2></Inn>
            <Inn i={2}><p className="mt-5 max-w-[42ch] text-[16px] leading-[1.55] sm:text-[17px]" style={{ color: DIM }}>Ett døgn i en utleiebolig. Husleie, kontrakt og leietakerens spørsmål ordner seg selv – helt til noe krever et menneske. Da, og bare da, venter systemet på eieren.</p></Inn>
            <Inn i={3} className="mt-7">
              <div className="relative pl-5">
                <span aria-hidden="true" className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full" style={{ background: `linear-gradient(180deg, ${LILLA_M}, rgba(122,63,168,0.14))` }} />
                <p className="text-[19px] leading-[1.34] sm:text-[22px]" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }}>Alt går av seg selv.<br /><span style={{ color: LILLA_M }}>Den ene beslutningen venter på eieren – ett trykk.</span></p>
              </div>
            </Inn>
            <Inn i={4} className="mt-7 border-t pt-5" style={{ borderColor: HAIR }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: SVAK }}>Dagens fasit</p>
              <div className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4" data-testid="deck-konsept-fasit">
                {[['8/8', 'husleier betalt', T.gronn], ['1', 'kontrakt signert', T.gronn], ['1', 'sak løst automatisk', T.gronn], ['1', 'beslutning – eierens', LILLA_M]].map(([v, u, c]) => (
                  <div key={u}>
                    <p className="text-[28px] sm:text-[32px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.ink }}>{v}</p>
                    <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-[1.35]" style={{ color: SVAK }}><span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />{u}</p>
                  </div>
                ))}
              </div>
            </Inn>
          </div>
          <Inn i={2} className="min-w-0">
            {er('konsept') ? <HeroScene eiendom={null} /> : <div aria-hidden="true" style={{ minHeight: 460 }} />}
          </Inn>
        </div>
      </Side>

      {/* 04 · For hvem – samme system, to kundegrupper (+ forvaltning som tjeneste) */}
      <Side id="hvem" pos={pos('hvem')} aktiv={er('hvem')} bred>
        <Kapittel nr={kap('hvem')} navn="For hvem" under="B2C, B2B og forvaltning – på én plattform" />
        <div className="mt-2 grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-7"><Inn i={1}><H2 maks="17ch">Én plattform. Tre inntektsstrømmer.</H2></Inn></div>
          <div className="lg:col-span-5"><Inn i={2}><p className="text-[15px] leading-[1.6] sm:text-[16.5px]" style={{ color: DIM, maxWidth: '46ch' }}>Private utleiere (B2C), eiendomsselskaper (B2B) og forvaltning for eiere som overlater driften. Samme kodebase og prisliste – fra én leilighet til tusen.</p></Inn></div>
        </div>
        <div className="mt-10" data-testid="deck-hvem-spekter">
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { ikon: Home, over: 'Private utleiere · B2C', niva: 'Selvbetjent', tekst: 'Leietakere, kontrakt med BankID, husleie og drift – styrt fra mobilen. Hele Norge, ingen binding.', pris: prisHuseier || '–', prisU: 'pris', trak: nb(plEnheterIDag), trakU: 'boliger i dag' },
              { ikon: Building2, over: 'Eiendomsselskaper · B2B', niva: 'Drift i skala', tekst: 'Ett system for hele organisasjonen: leietakere, betaling, saker og leverandører – med roller, rapportering og API.', pris: basisT ? `${kr(basisT.bedrift.pris)}` : '–', prisU: 'per enhet/mnd', trak: nb(bedriftIDag), trakU: 'selskaper i dag' },
              { ikon: Link2, over: 'Forvaltning', niva: 'Fullt forvaltet', tekst: 'En fast forvalter fra Digihome på samme plattform. Eieren følger alt live. Bergen og 60 km rundt.', pris: pct(basisF.honorarPctNye, 1), prisU: 'av leien, inkl. mva', trak: nb(enheterIDag), trakU: 'boliger i dag' },
            ].map((s, i) => (
              <Inn key={s.over} i={2 + i}>
                <div className="flex h-full flex-col rounded-[18px] bg-white p-5" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}, 0 18px 40px -22px rgba(21,19,15,0.2)` }}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px]" style={{ background: '#F6F0FB', color: LILLA_M, boxShadow: 'inset 0 0 0 1px rgba(122,63,168,0.2)' }}><s.ikon className="h-[18px] w-[18px]" strokeWidth={1.8} /></span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: SVAK }}>{s.over}</p>
                      <p className="text-[16px] font-semibold leading-tight tracking-[-0.01em]" style={{ color: T.ink }}>{s.niva}</p>
                    </div>
                  </div>
                  <p className="mt-3.5 flex-1 text-[13px] leading-[1.55]" style={{ color: DIM }}>{s.tekst}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4" style={{ borderColor: HAIR }}><Fakta v={s.pris} u={s.prisU} /><Fakta v={s.trak} u={s.trakU} /></div>
                </div>
              </Inn>
            ))}
          </div>
          <Inn i={5} className="mt-6">
            <div aria-hidden="true" className="hidden grid-cols-3 sm:grid">
              {[0, 1, 2].map((i) => <div key={i} className="flex justify-center"><span className="h-3 w-px" style={{ background: 'rgba(122,63,168,0.3)' }} /></div>)}
            </div>
            <div className="relative mt-1 h-[6px] w-full overflow-hidden rounded-full" style={{ background: 'rgba(122,63,168,0.12)' }}>
              <span className="deck-spk-skinne absolute inset-0 rounded-full" style={{ background: `linear-gradient(90deg, rgba(122,63,168,0.4), ${LILLA_M})` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.1em]"><span style={{ color: SVAK }}>Selvbetjent</span><span style={{ color: LILLA_M }}>Fullt forvaltet</span></div>
          </Inn>
          <Inn i={6} className="mt-6">
            <div className="flex flex-col gap-3 rounded-[16px] px-6 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: '#F6F0FB', boxShadow: 'inset 0 0 0 1px rgba(122,63,168,0.22)' }} data-testid="deck-hvem-plattform">
              <p className="text-[13.5px] leading-snug" style={{ color: T.ink }}><span className="font-semibold" style={{ color: LILLA_M }}>Én plattform – Digihome Tech.</span> Samme kode og prisliste under alle tre.</p>
              <div className="flex flex-wrap gap-1.5">
                {['Roller', 'Rapportering', 'API', 'BankID', 'Regnskap'].map((c) => <span key={c} className="rounded-full px-2.5 py-1 text-[11.5px] font-medium" style={{ background: 'rgba(122,63,168,0.1)', color: LILLA_M }}>{c}</span>)}
              </div>
            </div>
          </Inn>
        </div>
      </Side>

      {/* Strukturen · konsernet: Digihome Group AS eier Digihome AS og Digihome Tech AS */}
      <Side id="eier" pos={pos('eier')} aktiv={er('eier')} bred>
        <Kapittel nr={kap('eier')} navn="Strukturen" under="ett konsern, to selskaper, én plattform" />
        <div className="mx-auto max-w-[760px] text-center">
          <Inn i={1}><H2 maks="24ch" className="mx-auto !text-[30px] sm:!text-[40px] lg:!text-[46px]">Ett konsern. To selskaper. Én plattform.</H2></Inn>
          <Inn i={2}><p className="mx-auto mt-3 max-w-[58ch] text-[14.5px] leading-[1.55] sm:text-[16px]" style={{ color: DIM }}>Digihome Group AS eier begge selskapene fullt ut. Forvaltningen tjener penger i dag; programvaren skalerer uten grenser. De deler én kodebase.</p></Inn>
        </div>
        <div className="relative mx-auto mt-6 w-full max-w-[880px]" data-testid="deck-eier">
          {/* Morselskapet */}
          <Inn i={3} className="mx-auto w-full max-w-[340px]">
            <div className="relative overflow-hidden rounded-[18px] px-7 py-4 text-center" style={{ background: T.charcoal, boxShadow: '0 26px 54px -30px rgba(21,19,15,0.55)' }} data-testid="deck-eier-mor">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'rgba(212,150,255,0.85)' }}>Morselskap</p>
              <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-white sm:text-[24px]" style={display}>Digihome Group AS</p>
              <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(244,241,234,0.72)' }}>Eier og styrer 100 % av begge selskapene</p>
            </div>
          </Inn>
          {/* Linjene tegner seg ned: stamme → tverrlinje → to grener */}
          <div aria-hidden="true" className="relative mx-auto hidden h-[46px] w-full sm:block">
            <span className="deck-eier-v absolute top-0 h-[23px] w-px" style={{ left: 'calc(50% - 0.5px)', background: 'linear-gradient(180deg, rgba(122,63,168,0.6), rgba(122,63,168,0.42))', '--d': '.6s' }} />
            <span className="deck-eier-h absolute top-[23px] h-px" style={{ left: '25%', right: '25%', background: 'rgba(122,63,168,0.42)', '--d': '.95s' }} />
            <span className="deck-eier-v absolute top-[23px] h-[23px] w-px" style={{ left: 'calc(25% - 0.5px)', background: 'rgba(122,63,168,0.42)', '--d': '1.3s' }} />
            <span className="deck-eier-v absolute top-[23px] h-[23px] w-px" style={{ left: 'calc(75% - 0.5px)', background: 'rgba(122,63,168,0.42)', '--d': '1.3s' }} />
            <span className="deck-eier-p absolute h-1.5 w-1.5 rounded-full" style={{ left: 'calc(50% - 3px)', top: '20px', background: LILLA_M, '--d': '.9s' }} />
          </div>
          <div className="mt-5 grid gap-5 sm:mt-0 sm:grid-cols-2">
            {[
              { over: 'Forvaltningen', navn: 'Digihome AS', Ikon: Building2, tekst: 'Drifter boliger for eiere som overlater jobben – fast forvalter, honorar av leien.', metrikk: `${nb(enheterIDag)} boliger i drift i dag`, tag: 'Margin', i: 20 },
              { over: 'Programvaren', navn: 'Digihome Tech AS', Ikon: Sparkles, tekst: 'Plattformen for private utleiere (B2C), eiendomsselskaper (B2B) og forvaltningen selv.', metrikk: 'Én kodebase · én prisliste', tag: 'Skala', i: 21 },
            ].map((s) => (
              <Inn key={s.navn} i={s.i}>
                <div className="flex h-full flex-col rounded-[18px] bg-white p-5" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}, 0 20px 44px -30px rgba(21,19,15,0.22)` }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em]" style={{ color: LILLA_M }}><s.Ikon className="h-3.5 w-3.5" strokeWidth={1.9} />{s.over}</span>
                    <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold" style={{ background: 'rgba(122,63,168,0.1)', color: LILLA_M }}>100 %</span>
                  </div>
                  <p className="mt-1.5 text-[21px] font-semibold tracking-[-0.02em] sm:text-[23px]" style={{ ...display, color: T.ink }}>{s.navn}</p>
                  <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: DIM }}>{s.tekst}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t pt-2.5" style={{ borderColor: HAIR }}>
                    <span className="text-[12px] font-medium" style={{ color: T.ink }}>{s.metrikk}</span>
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em]" style={{ color: SVAK }}>{s.tag}</span>
                  </div>
                </div>
              </Inn>
            ))}
          </div>
          <Inn i={22}><p className="mx-auto mt-5 max-w-[64ch] text-center text-[12.5px] leading-[1.5]" style={{ color: SVAK }}>Lisensen Digihome AS betaler til Digihome Tech AS nulles ut i konsernregnskapet – marginen blir værende i konsernet.</p></Inn>
        </div>
      </Side>

      {/* Motoren · to selskaper som forsterker hverandre */}
      <Side id="struktur" pos={pos('struktur')} aktiv={er('struktur')} bred>
        <Kapittel nr={kap('struktur')} navn="Motoren" under="to selskaper som forsterker hverandre" />
        <div className="mt-2 grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <Inn i={1}><H2 maks="14ch">To selskaper. Én motor.</H2></Inn>
            <Ingress i={2} maks="44ch">Programvaren skalerer uten grenser. Forvaltningen tjener penger allerede i dag – og er samtidig plattformens største kunde, beste selger og strengeste testpilot. Hver av dem gjør den andre sterkere.</Ingress>
            <Inn i={3} className="mt-8">
              <div className="relative pl-5">
                <span aria-hidden="true" className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full" style={{ background: `linear-gradient(180deg, ${LILLA_M}, rgba(122,63,168,0.14))` }} />
                <p className="text-[19px] leading-[1.34] sm:text-[22px]" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }}>Hver bolig vi forvalter er også en lisens.<br /><span style={{ color: LILLA_M }}>Internt nuller den seg ut – marginen blir i konsernet.</span></p>
              </div>
            </Inn>
            <Inn i={4} className="mt-8 grid grid-cols-2 gap-6 border-t pt-6" style={{ borderColor: HAIR }} data-testid="deck-struktur-selskaper">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: LILLA_M }}>Digihome Tech AS</p>
                <p className="mt-2 text-[13.5px] leading-[1.55]" style={{ color: DIM }}>Programvaren. Én prisliste for alle. Vi tjener på kode – ikke på timer.</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: T.ink }}>Digihome AS</p>
                <p className="mt-2 text-[13.5px] leading-[1.55]" style={{ color: DIM }}>Forvaltningen. Ekte drift og margin – og et forsprang ingen ren SaaS har.</p>
              </div>
            </Inn>
          </div>
          <div className="lg:col-span-7"><Inn i={2}><Svinghjul /></Inn></div>
        </div>
      </Side>

      {/* 05 · Organisasjon */}
      <Side id="org" pos={pos('org')} aktiv={er('org')} bred>
        <Kapittel nr={kap('org')} navn="Organisasjon" under="et lite, senior team som allerede har bygget det" />
        <div className="mt-2 grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-5"><Inn i={1}><H2 maks="13ch">Bygget av utleiere, for utleiere.</H2></Inn></div>
          <div className="lg:col-span-7">
            <Inn i={2}><p className="text-[15px] leading-[1.6] sm:text-[16.5px]" style={{ color: DIM, maxWidth: '54ch' }}>Vi bygger ikke for et marked vi har lest om – vi bygger for oss selv. Plattformen drifter allerede {nb(enheterIDag)} boliger på signerte kontrakter.</p></Inn>
            <Inn i={3} className="mt-4 flex flex-wrap gap-x-7 gap-y-2.5">
              {[['Operatør + AI + jus', 'sjelden kombinasjon'], ['Bygget og i drift', 'ikke en idé på papir'], ['Felles styre', 'ett konsern, én retning']].map(([t, u]) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full" style={{ background: 'rgba(122,63,168,0.1)', color: LILLA_M }}><Check className="h-3 w-3" strokeWidth={2.8} /></span>
                  <span className="text-[14px] font-semibold" style={{ color: T.ink }}>{t}</span><span className="text-[12.5px]" style={{ color: SVAK }}>· {u}</span>
                </span>
              ))}
            </Inn>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" data-testid="deck-org-portretter">
          <Inn i={2}><PortrettKort p={TEAM[0]} rolle="Daglig leder · styremedlem" zoom={1.7} zoomPos="50% 28%" cred="Eiendomsmegler med seks år i DNB. Leder kundeakkvisisjon og forvaltning." /></Inn>
          <Inn i={3}><PortrettKort p={TEAM[1]} rolle="Produktsjef · styremedlem" cred="Grunnla BnbSpesialisten, en av Norges første proffe utleieforvaltere. 10 år i Adonis frem mot exit." /></Inn>
          <Inn i={4}><PortrettKort p={TEAM[3]} rolle="AI-rådgiver" zoom={2.0} zoomPos="50% 33%" cred="Analytiker i DNB, siviløkonom fra NHH. Bygger og automatiserer plattformen med AI." /></Inn>
          <Inn i={5}><PortrettKort p={TEAM[2]} rolle="Styreleder · advokat" cred="Partner i Hoffmann Thinn. Tegnet selskapsstrukturen som skal bære vekst og emisjon." /></Inn>
          <Inn i={6}><PortrettKort p={TEAM[4]} rolle="Styremedlem" zoom={1.18} zoomPos="51% 34%" cred="Styremedlem i Digihome AS og Digihome Tech AS." /></Inn>
        </div>
        <Inn i={7}><p className="mt-5 text-[12.5px]" style={{ color: SVAK }} data-testid="deck-org-styre">Felles styre for Digihome AS og Digihome Tech AS: Erik Hoffmann-Dahl (styreleder), Jens-Petter Glittenberg, Sarah Sleeman og Martin C. Kviteberg.</p></Inn>
      </Side>

      {/* 06 · Hvor vi står */}
      <Side id="staar" pos={pos('staar')} aktiv={er('staar')} bred>
        <Kapittel nr={kap('staar')} navn="Hvor vi står" under="live fra plattformen – ikke løfter" />
        <div className="mt-2 grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-14">
          <div className="lg:col-span-5">
            <Inn i={1}>
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ background: 'rgba(122,63,168,0.1)', color: LILLA_M }}>
                <span className="deck-live-dot h-2 w-2 rounded-full" style={{ background: LILLA_M }} /> Live · signerte kontrakter
              </span>
            </Inn>
            <Inn i={2} className="mt-4"><H2 maks="12ch">Vi starter ikke fra null.</H2></Inn>
            <Ingress i={3} maks="44ch">Tallene hentes fra signerte leiekontrakter når decket åpnes. Alt som følger er en plan bygget på disse – og på drivere som kan justeres direkte i decket.</Ingress>
          </div>
          <div className="lg:col-span-7">
            <Inn i={2}>
              <div className="rounded-[22px] p-6 sm:p-7" style={{ background: '#F6F0FB', boxShadow: 'inset 0 0 0 1px rgba(122,63,168,0.22)' }} data-testid="deck-staar-hero">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <Tall aktiv={er('staar')} verdi={enheterIDag} format={(v) => nb(v)} storrelse="text-[64px] lg:text-[84px]" farge={LILLA_M} />
                    <p className="mt-1 text-[15px] font-medium" style={{ color: T.ink }}>boliger under forvaltning</p>
                  </div>
                  <p className="mb-2 text-right text-[12.5px] font-medium leading-[1.4]" style={{ color: SVAK }}>signerte<br />leiekontrakter</p>
                </div>
              </div>
            </Inn>
            <div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-3">
              <Inn i={3} strek className="pt-4"><Tall aktiv={er('staar')} verdi={honorarIDag * 12} storrelse="text-[30px] lg:text-[38px]" /><p className="mt-2 text-[13px] leading-[1.45]" style={{ color: DIM }}>årlig honorarinntekt i dag (eks. mva)</p></Inn>
              <Inn i={4} strek className="pt-4"><Tall aktiv={er('staar')} verdi={enheterIDag * (basisT?.forvaltning?.pris || basisF.systemPerEnhet) * 12} storrelse="text-[30px] lg:text-[38px]" /><p className="mt-2 text-[13px] leading-[1.45]" style={{ color: DIM }}>årlig lisensinntekt i Tech fra forvaltningen</p></Inn>
              <Inn i={5} strek className="pt-4"><Tall aktiv={er('staar')} verdi={plEnheterIDag} format={(v) => nb(v)} storrelse="text-[30px] lg:text-[38px]" /><p className="mt-2 text-[13px] leading-[1.45]" style={{ color: DIM }}>selvbetjente enheter{bedriftIDag ? ` · ${nb(bedriftIDag)} selskaper` : ''} – oppside</p></Inn>
            </div>
            <Inn i={6} className="mt-6 flex items-center gap-2 text-[13px]" style={{ color: SVAK }}>
              <ArrowRight className="h-4 w-4" style={{ color: LILLA_M }} /> Dette er utgangspunktet – planen bygger videre herfra.
            </Inn>
          </div>
        </div>
      </Side>

      {/* 07 · Unit economics (mørk) */}
      <Side id="unit" pos={pos('unit')} morkt aktiv={er('unit')} bred>
        <Kapittel morkt nr={kap('unit')} navn="Unit economics" under="per enhet · full CAC inkluderer performance-partner" />
        <Inn i={1}><H2 morkt maks="16ch">Én enhet tjener seg inn – i begge selskaper.</H2></Inn>
        <Inn i={1}><p className="mt-5 max-w-[62ch] text-[15px] leading-[1.6] sm:text-[16px]" style={{ color: LYS }}>Payback måles i <b style={{ color: T.offwhite }}>måneder, ikke år</b>. Forvaltningen står i planen; plattformkundene er ren oppside oppå den.</p></Inn>
        <div className="mt-9 grid gap-10 md:grid-cols-3">
          <Inn i={2} strek={LYS_HAIR} className="pt-5">
            <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: LYS }}><Link2 className="h-3.5 w-3.5" /> Digihome AS · forvaltet enhet <span style={{ color: T.lilla }}>· i planen</span></p>
            <div className="mt-4"><Payback aktiv={er('unit')} mnd={uF.paybackMnd} bidrag={uF.bidrag || 0} ltvCac={null} cacDeler={[{ l: 'provisjon', v: uF.provisjon || 0, f: T.offwhite }, ...(uF.partnerPerEnhet ? [{ l: 'partner', v: uF.partnerPerEnhet, f: T.lilla }] : [])]} /></div>
            <dl className="mt-4 border-t" style={{ borderColor: LYS_HAIR }}>
              <DlRad morkt l="Honorar per enhet (eks. mva)" v={kr(uF.bruttoHonorarNy || 0)} />
              <DlRad morkt l="Plattformlisens" v={`${kr(basisF.systemPerEnhet)}/mnd`} />
              <DlRad morkt l="Enheter per forvalter" v={nb(basisF.enheterPerAarsverk)} />
            </dl>
          </Inn>
          <Inn i={3} strek={LYS_HAIR} className="pt-5">
            <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: LYS }}><Home className="h-3.5 w-3.5" /> Tech · huseiere (selvbetjent) <span style={{ color: LYS_SVAK }}>· oppside</span></p>
            {uT ? (
              <>
                <div className="mt-4"><Payback aktiv={er('unit')} mnd={uT.huseier.paybackMnd} bidrag={uT.huseier.bidrag} ltvCac={uT.huseier.ltvCac} cacDeler={[{ l: 'media', v: uT.huseier.cac, f: FARGE.huseier }, ...(uT.huseier.partner ? [{ l: 'partner', v: uT.huseier.partner, f: T.lilla }] : [])]} /></div>
                <dl className="mt-4 border-t" style={{ borderColor: LYS_HAIR }}>
                  <DlRad morkt l="ARPU (eks. mva)" v={kr(uT.huseier.arpu)} />
                  <DlRad morkt l="Bruttomargin" v={`${uT.huseier.bruttoMarginPct} %`} />
                  <DlRad morkt l="Levetid (fra churn)" v={uT.huseier.levetidMnd ? `${nb(uT.huseier.levetidMnd / 12, 1)} år` : '–'} />
                </dl>
              </>
            ) : <p className="mt-4 text-[14px]" style={{ color: LYS_SVAK }}>Tech-budsjettet er ikke delt ennå.</p>}
          </Inn>
          <Inn i={4} strek={LYS_HAIR} className="pt-5">
            <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: LYS }}><Building2 className="h-3.5 w-3.5" /> Tech · eiendomsselskaper <span style={{ color: LYS_SVAK }}>· oppside</span></p>
            {uT ? (
              <>
                <div className="mt-4"><Payback aktiv={er('unit')} mnd={uT.bedrift.paybackMnd} bidrag={uT.bedrift.bidragSelskap} ltvCac={uT.bedrift.ltvCac} cacDeler={[{ l: 'salg', v: uT.bedrift.cacSelskap, f: FARGE.bedrift }, ...(uT.bedrift.partner ? [{ l: 'partner', v: uT.bedrift.partner, f: T.lilla }] : [])]} /></div>
                <dl className="mt-4 border-t" style={{ borderColor: LYS_HAIR }}>
                  <DlRad morkt l="Per selskap / mnd" v={`${kr(uT.bedrift.arpuSelskap)} · ${nb(basisT.bedrift.enheterPerSelskap)} enh`} />
                  <DlRad morkt l="Pris per enhet" v={`${kr(basisT.bedrift.pris)}/mnd`} />
                  <DlRad morkt l="Levetid (fra churn)" v={uT.bedrift.levetidMnd ? `${nb(uT.bedrift.levetidMnd / 12, 1)} år` : '–'} />
                </dl>
              </>
            ) : <p className="mt-4 text-[14px]" style={{ color: LYS_SVAK }}>Tech-budsjettet er ikke delt ennå.</p>}
          </Inn>
        </div>
        {paAktiv ? <Inn i={5}><p className="mt-8 text-[13px]" style={{ color: LYS_SVAK }}>Performance-partner: {nb(paAktiv.honorarPct, 0)} % av kundens inntekt de første {paAktiv.varighetMnd || '∞'} månedene + {kr(paAktiv.fastPerMnd)} fast per måned. Byrået tjener når vi tjener.</p></Inn> : null}
      </Side>

      {/* 08 · Go-to-market */}
      <Side id="gtm" pos={pos('gtm')} aktiv={er('gtm')} bred>
        <Kapittel nr={kap('gtm')} navn="Go-to-market" under="slik henter vi kundene" />
        <Inn i={1}><H2 maks="18ch">Vi kjøper ikke vekst. Vi tjener den.</H2></Inn>
        <Inn i={1}><p className="mt-5 max-w-[64ch] text-[15px] leading-[1.6] sm:text-[16px]" style={{ color: DIM }}>Byrået betales på resultat, ikke på klikk. Forvaltningen er en kanal i seg selv: hver kunde kjenner allerede produktet, og hver enhet er en lisens. Salg til huseiere og eiendomsselskaper ligger utenfor planen – ren oppside.</p></Inn>
        <Inn i={2} className="mt-8">
          <p className="mb-3 text-[12.5px] font-medium" style={{ color: SVAK }}>S&M i perioden · {mnok((sF.sumSm || 0) + (saT?.sumSm || 0))}{saT?.cacPaybackBlended != null ? ` · blandet CAC-payback Tech ${nb(saT.cacPaybackBlended, 1)} mnd` : ''}</p>
          <AndelBar aktiv={er('gtm')} deler={smDeler} />
        </Inn>
        <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[
            { ikon: Megaphone, t: 'Performance-partner', u: paAktiv ? `${nb(paAktiv.honorarPct, 0)} % av kundens inntekt de første ${paAktiv.varighetMnd || '∞'} mnd + ${kr(paAktiv.fastPerMnd)} fast. Byrået tjener når vi tjener.` : 'Markedsføringsbyrå betalt på resultat – ikke aktivert i denne planen.', aktiv: Boolean(paAktiv) },
            { ikon: Link2, t: 'Forvaltningen', u: `${fakserie()} – ${kr(basisF.provisjonPerNyEnhet)} i media per signert enhet${basisF.organiskAndelPct > 0 ? `, ${nb(basisF.organiskAndelPct)} % kommer organisk` : ''}. Hver forvaltet enhet er en plattformlisens – og en kunde som allerede kjenner produktet.`, aktiv: true },
            ...(smT.annonser > 0 || smT.salg > 0 ? [
              { ikon: Home, t: 'Egne annonser', u: basisT ? `${kr(basisT.huseier.annonsePerMnd)} per måned i fase 1 · ${kr(basisT.huseier.cacPerEnhet)} per aktivert enhet. Selvbetjening til huseiere i hele Norge.` : 'Betalt trafikk til selvbetjening.', aktiv: smT.annonser > 0 },
              { ikon: Building2, t: 'Salg til eiendomsselskaper', u: basisT ? `${nb(basisT.bedrift.nyeSelskaperPerMnd, 1)} nye selskaper/mnd fra måned ${basisT.bedrift.fraMnd} · ${nb(basisT.bedrift.enheterPerSelskap)} enheter per selskap.` : 'Direkte salg til profesjonelle utleiere.', aktiv: smT.salg > 0 },
            ] : [
              { ikon: Home, t: 'Plattformkunder – oppside, ikke budsjett', u: 'Selvbetjente huseiere og eiendomsselskaper er bevisst holdt utenfor planen. Produktet er det samme; salget starter når forvaltningen har bevist enhetsøkonomien. Se «Med plattformkunder» under Hva om.', aktiv: false },
            ]),
          ].map((kn, i) => (
            <Kolonne key={kn.t} i={3 + i} ikon={kn.ikon} over={kn.aktiv ? 'I planen' : 'Oppside'} tittel={kn.t} tekst={kn.u} className={kn.aktiv ? '' : 'opacity-70'} />
          ))}
        </div>
      </Side>

      {/* 09 · Planen – Digihome AS */}
      <Side id="plan-dh" pos={pos('plan-dh')} aktiv={er('plan-dh')} bred>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Kapittel nr={kap('plan-dh')} navn="Planen · Digihome AS" under={`${N} måneder · ${mndLabel(plan.startYm, 0, false)} – ${mndLabel(plan.startYm, N - 1, false)}`} />
            <Inn i={1}><H2 className="!text-[34px] sm:!text-[44px] lg:!text-[48px]">Forvaltningen{preset !== 'plan' ? <span style={{ color: LILLA_M }}> – med justerte forutsetninger</span> : ''}.</H2></Inn>
          </div>
          <Inn i={2} className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px]" style={{ color: DIM }}>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.dh }} /> Kontraktsfestet</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: T.gronn, opacity: 0.6 }} /> Re-utleie</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.huseier }} /> Nye enheter</span>
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-4" style={{ background: FARGE.kost }} /> Kostnader</span>
          </Inn>
        </div>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <Inn i={3}>
            <LagGraf aktiv={er('plan-dh')} N={N} startYm={plan.startYm} lag={[{ navn: 'Kontraktsfestet', serie: mF.eksisterende, farge: FARGE.dh }, { navn: 'Re-utleie', serie: mF.reutleie || Array(N).fill(0), farge: T.gronn, opacity: 0.6 }, { navn: 'Nye enheter', serie: mF.vekst.map((v, i) => v + (mF.oppstart?.[i] || 0)), farge: FARGE.huseier }]} kost={mF.kostSum} beIdx={sF.breakEvenIdx} hoyde={smal ? 300 : 330} bredde={smal ? 560 : 1000} testid="deck-graf-dh" />
            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4" data-testid="deck-kpi-dh">
              <Nokkel aktiv={er('plan-dh')} label="Break-even" tekst={be(sF.breakEvenIdx)} delta={dMnd(sF.breakEvenIdx, sFb.breakEvenIdx)} />
              <Nokkel aktiv={er('plan-dh')} label="Kapitalbehov" tall={sF.kapitalbehov} delta={dMnok(sF.kapitalbehov, sFb.kapitalbehov)} />
              <Nokkel aktiv={er('plan-dh')} label="Enheter ved slutt" tall={mF.enheter[N - 1]} format={(v) => nb(v)} delta={delta(mF.enheter[N - 1], mFb.enheter[N - 1]) === null ? null : `${delta(mF.enheter[N - 1], mFb.enheter[N - 1]) > 0 ? '+' : ''}${nb(delta(mF.enheter[N - 1], mFb.enheter[N - 1]))}`} />
              <Nokkel aktiv={er('plan-dh')} label="Resultat i perioden" tall={sF.resultat} negativRod delta={dMnok(sF.resultat, sFb.resultat)} />
            </div>
          </Inn>
          <Inn i={4} className="deck-skjul-print rounded-[20px] p-5" style={{ background: T.flate }} data-testid="deck-drivere-dh">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-medium" style={{ color: T.ink }}>Skru på forvaltningen</p>
              {preset !== 'plan' ? <button onClick={nullstill} className="flex items-center gap-1 text-[12px] font-medium" style={{ color: LILLA_M }} data-testid="deck-nullstill-dh"><RotateCcw className="h-3 w-3" /> Tilbake til planen</button> : null}
            </div>
            <p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>Endringene lagres ikke – kun for utforsking.</p>
            <div className="mt-2 divide-y" style={{ borderColor: HAIR }}>
              <Skru label="Veksttempo" verdi={fakt.forv} basis={1} min={0.25} max={3} steg={0.25} format={(v) => `${nb(v * 100)} %`} hint={fakserie()} onChange={(v) => skruTempo('forv', v)} onFerdig={skruFerdig('veksttempo forvaltning')} testid="deck-skru-nye" />
              <Skru label="Honorar" verdi={drivF.honorarPctNye} basis={basisF.honorarPctNye} min={4} max={15} steg={0.5} format={(v) => `${nb(v, 1)} %`} onChange={(v) => skruF('honorarPctNye', v)} onFerdig={skruFerdig('honorar')} />
              <Skru label="Enheter per forvalter" verdi={drivF.enheterPerAarsverk} basis={basisF.enheterPerAarsverk} min={40} max={250} steg={5} format={(v) => nb(v)} onChange={(v) => skruF('enheterPerAarsverk', v)} onFerdig={skruFerdig('enheter per forvalter')} />
              <Skru label="Churn per år" verdi={drivF.aarligChurnPct} basis={basisF.aarligChurnPct} min={0} max={40} steg={1} format={(v) => `${nb(v)} %`} onChange={(v) => skruF('aarligChurnPct', v)} onFerdig={skruFerdig('churn forvaltning')} />
            </div>
          </Inn>
        </div>
      </Side>

      {/* 10 · Planen – Digihome Tech AS */}
      <Side id="plan-tech" pos={pos('plan-tech')} aktiv={er('plan-tech')} bred>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Kapittel nr={kap('plan-tech')} navn="Planen · Digihome Tech AS" under={techPlan ? `${NT} måneder · ${mndLabel(techPlan.startYm, 0, false)} – ${mndLabel(techPlan.startYm, NT - 1, false)}` : undefined} />
            <Inn i={1}><H2 className="!text-[34px] sm:!text-[44px] lg:!text-[48px]">Plattformen{preset !== 'plan' ? <span style={{ color: LILLA_M }}> – med justerte forutsetninger</span> : ''}.</H2></Inn>
          </div>
          {mT ? (
            <Inn i={2} className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px]" style={{ color: DIM }}>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.lisens }} /> Lisens · Digihome AS</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.huseier }} /> Huseiere</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.bedrift }} /> Eiendomsselskaper</span>
              <span className="flex items-center gap-1.5"><span className="h-[2px] w-4" style={{ background: FARGE.kost }} /> Kostnader</span>
            </Inn>
          ) : null}
        </div>
        {mT ? (
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
            <Inn i={3}>
              <LagGraf aktiv={er('plan-tech')} N={NT} startYm={techPlan.startYm} lag={[{ navn: 'Lisens · Digihome AS', serie: mT.inntekt.forvaltning, farge: FARGE.lisens }, { navn: 'Huseiere', serie: mT.inntekt.huseier, farge: FARGE.huseier }, { navn: 'Eiendomsselskaper', serie: mT.inntekt.bedrift, farge: FARGE.bedrift }]} kost={mT.kostSum} beIdx={sT.breakEvenIdx} hoyde={smal ? 300 : 330} bredde={smal ? 560 : 1000} testid="deck-graf-tech" />
              <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4" data-testid="deck-kpi-tech">
                <Nokkel aktiv={er('plan-tech')} label="ARR ved slutt" tall={saT.arrExit} delta={dMnok(saT.arrExit, saTb.arrExit)} />
                <Nokkel aktiv={er('plan-tech')} label="Break-even" tekst={be(sT.breakEvenIdx, techPlan.startYm)} delta={dMnd(sT.breakEvenIdx, sTb.breakEvenIdx)} />
                <Nokkel aktiv={er('plan-tech')} label="Kapitalbehov" tall={sT.kapitalbehov} delta={dMnok(sT.kapitalbehov, sTb.kapitalbehov)} />
                <Nokkel aktiv={er('plan-tech')} label="Ekstern andel av inntekt" tekst={`${100 - (sT.andelForvaltningPct ?? 0)} %`} delta={delta(sT.andelForvaltningPct, sTb.andelForvaltningPct) === null ? null : `${-delta(sT.andelForvaltningPct, sTb.andelForvaltningPct) > 0 ? '+' : ''}${-delta(sT.andelForvaltningPct, sTb.andelForvaltningPct)} pp`} />
              </div>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px]" style={{ color: DIM }}>
                {saT.cmgrPct != null ? <span>MRR-vekst <b style={{ color: T.ink }}>{nb(saT.cmgrPct, 1)} %/mnd</b></span> : null}
                {saT.bruttoMarginPct != null ? <span>Bruttomargin <b style={{ color: T.ink }}>{saT.bruttoMarginPct} %</b></span> : null}
                {saT.burnMultiple != null ? <span>Burn multiple <b style={{ color: T.ink }}>{nb(saT.burnMultiple, 1)}×</b></span> : null}
                {saT.grrPct != null ? <span>Brutto retensjon <b style={{ color: T.ink }}>{saT.grrPct} %/år</b></span> : null}
              </div>
            </Inn>
            <Inn i={4} className="deck-skjul-print rounded-[20px] p-5" style={{ background: T.flate }} data-testid="deck-drivere-tech">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-medium" style={{ color: T.ink }}>Skru på plattformen</p>
                {preset !== 'plan' ? <button onClick={nullstill} className="flex items-center gap-1 text-[12px] font-medium" style={{ color: LILLA_M }} data-testid="deck-nullstill-tech"><RotateCcw className="h-3 w-3" /> Tilbake til planen</button> : null}
              </div>
              <p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>Endringene lagres ikke – kun for utforsking.</p>
              <div className="mt-2 divide-y" style={{ borderColor: HAIR }}>
                {basisT.huseier.modus === 'kunder' || (basisT.huseier.annonsePerMnd === 0 && !(basisT.huseier.vekstplan || []).length) ? (
                  <Skru label="Selvbetjente huseiere / mnd" verdi={(drivT.huseier.kunderPlan || []).length ? Math.max(...drivT.huseier.kunderPlan.map((x) => Number(x.nyePerMnd) || 0)) : 0} basis={(basisT.huseier.kunderPlan || []).length ? Math.max(...basisT.huseier.kunderPlan.map((x) => Number(x.nyePerMnd) || 0)) : 0} min={0} max={40} steg={1} format={(v) => nb(v)} hint={`betalt via annonser · ${kr(drivT.huseier.cacPerEnhet)} per aktivert enhet`} onChange={(v) => { setPreset('egen'); setOver((c) => ({ ...c, tech: { ...c.tech, huseier: { ...(c.tech.huseier || {}), modus: 'kunder', kunderPlan: v > 0 ? [{ fraMnd: 1, nyePerMnd: v }] : [] } } })); }} onFerdig={skruFerdig('selvbetjente huseiere')} testid="deck-skru-huseiere" />
                ) : (
                  <Skru label="Annonsekjøp" verdi={fakt.tech} basis={1} min={0} max={3} steg={0.25} format={(v) => `${nb(v * 100)} %`} hint={`${kr(drivT.huseier.annonsePerMnd)} per måned i fase 1`} onChange={(v) => skruTempo('tech', v)} onFerdig={skruFerdig('annonsekjøp')} testid="deck-skru-annonse" />
                )}
                <Skru label="CAC per aktivert enhet" verdi={drivT.huseier.cacPerEnhet} basis={basisT.huseier.cacPerEnhet} min={500} max={Math.max(10000, basisT.huseier.cacPerEnhet * 3)} steg={250} format={(v) => kr(v)} onChange={(v) => skruT('huseier', 'cacPerEnhet', v)} onFerdig={skruFerdig('cac huseiere')} />
                <Skru label="Churn huseiere / år" verdi={drivT.huseier.aarligChurnPct} basis={basisT.huseier.aarligChurnPct} min={5} max={50} steg={1} format={(v) => `${nb(v)} %`} onChange={(v) => skruT('huseier', 'aarligChurnPct', v)} onFerdig={skruFerdig('churn huseiere')} />
                <Skru label="Nye eiendomsselskaper / mnd" verdi={drivT.bedrift.nyeSelskaperPerMnd} basis={basisT.bedrift.nyeSelskaperPerMnd} min={0} max={5} steg={0.25} format={(v) => nb(v, 2)} onChange={(v) => skruT('bedrift', 'nyeSelskaperPerMnd', v)} onFerdig={skruFerdig('nye bedrifter')} />
                {basisT.partner?.paa ? <Skru label="Partnerhonorar" verdi={drivT.partner.honorarPct} basis={basisT.partner.honorarPct} min={0} max={20} steg={0.5} format={(v) => `${nb(v, 1)} %`} hint={`+ ${kr(drivT.partner.fastPerMnd)} fast per måned`} onChange={(v) => skruT('partner', 'honorarPct', v)} onFerdig={skruFerdig('partnerhonorar')} /> : null}
              </div>
            </Inn>
          </div>
        ) : (
          <Inn i={3} className="mt-10 rounded-[20px] p-8 text-center" style={{ background: T.flate }}>
            <p className="text-[18px]" style={{ ...display, letterSpacing: '-0.02em' }}>Tech-budsjettet er ikke delt med investorrommet ennå.</p>
            <p className="mt-2 text-[14px]" style={{ color: DIM }}>Del et Digihome Tech AS-budsjett i budsjettmodulen, så dukker plattformens plan opp her – levende.</p>
          </Inn>
        )}
      </Side>

      {/* 11 · Konsern */}
      <Side id="konsern" pos={pos('konsern')} aktiv={er('konsern')} bred>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Kapittel nr={kap('konsern')} navn="Konsern" under="Digihome AS + Tech · intern lisens eliminert" />
            <Inn i={1}><H2 className="!text-[34px] sm:!text-[44px] lg:!text-[48px]">Samlet{preset !== 'plan' ? <span style={{ color: LILLA_M }}> – med justerte forutsetninger</span> : ''}.</H2></Inn>
          </div>
          <Inn i={2} className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px]" style={{ color: DIM }}>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.dh }} /> Digihome AS</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.tech }} /> Tech · ekstern inntekt</span>
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-4" style={{ background: FARGE.kost }} /> Kostnader</span>
          </Inn>
        </div>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          <Inn i={3}>
            <LagGraf aktiv={er('konsern')} N={N} startYm={plan.startYm} lag={konsernLag} kost={k.kost} beIdx={sK.breakEvenIdx} hoyde={smal ? 300 : 330} bredde={smal ? 560 : 1000} testid="deck-graf-konsern" />
            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4" data-testid="deck-kpi-konsern">
              <Nokkel aktiv={er('konsern')} label="Break-even konsern" tekst={be(sK.breakEvenIdx)} delta={dMnd(sK.breakEvenIdx, sKb.breakEvenIdx)} />
              <Nokkel aktiv={er('konsern')} label={skattPaa ? 'Kapitalbehov etter skatt' : 'Kapitalbehov konsern'} tall={kapReell} delta={dMnok(kapReell, skattPaa ? (sKb.kapitalbehovEtterSkatt ?? sKb.kapitalbehov) : sKb.kapitalbehov)} />
              <Nokkel aktiv={er('konsern')} label="Omsetningstakt ved slutt" tall={sK.arrExit} delta={dMnok(sK.arrExit, sKb.arrExit)} />
              <Nokkel aktiv={er('konsern')} label={skattPaa ? 'Resultat etter skatt' : 'Resultat i perioden'} tall={resReell} negativRod delta={dMnok(resReell, skattPaa ? sKb.resultatEtterSkatt : sKb.resultat)} />
            </div>
          </Inn>
          <Inn i={4} className="rounded-[20px] p-5" style={{ background: T.flate }} data-testid="deck-konsern-bro">
            <p className="text-[13px] font-medium" style={{ color: T.ink }}>Slik henger det sammen · perioden</p>
            {/* Bro: DH + Tech − lisens = konsern */}
            {(() => {
              const dh = sum(k.digihome.inntekt); const te = sum(k.tech.inntekt); const el = sK.eliminert || 0; const maks = Math.max(1, dh + te);
              const rad = (l, v, f, neg = false, fet = false) => (
                <div key={l} className="grid grid-cols-[1fr_auto] items-center gap-3 py-1.5">
                  <div className="min-w-0">
                    <p className={`truncate text-[12.5px] ${fet ? 'font-semibold' : ''}`} style={{ color: fet ? T.ink : DIM }}>{l}</p>
                    <div className="mt-1 h-[6px] w-full overflow-hidden rounded-full" style={{ background: 'rgba(21,19,15,0.06)' }}><span className="block h-full rounded-full" style={{ width: `${er('konsern') || print ? (Math.abs(v) / maks) * 100 : 0}%`, background: f, transition: `width 900ms ${EASE} 300ms` }} /></div>
                  </div>
                  <p className={`whitespace-nowrap text-[13.5px] ${fet ? 'font-semibold' : 'font-medium'}`} style={{ color: neg ? FARGE.kost : T.ink }}>{neg ? '− ' : ''}{mnok(Math.abs(v))}</p>
                </div>
              );
              return (
                <div className="mt-2 divide-y" style={{ borderColor: HAIR }}>
                  {rad('Inntekt Digihome AS', dh, FARGE.dh)}
                  {rad('Inntekt Tech', te, FARGE.tech)}
                  {rad('Intern lisens (eliminert)', el, '#a6a19a', true)}
                  {rad('Konserninntekt', sK.sumInntekt, T.gronn, false, true)}
                  {rad('Kostnader etter eliminering', sK.sumKost, FARGE.kost, true)}
                  {rad(skattPaa ? 'Resultat før skatt' : 'Resultat', sK.resultat, sK.resultat >= 0 ? T.gronn : FARGE.kost, sK.resultat < 0, !skattPaa)}
                  {skattPaa && sK.skatt > 0 ? rad(`Skatt ${basisF.skatt.satsPct} % (Digihome AS${basisF.skatt.konsernbidrag ? ', konsernbidrag' : ''})`, sK.skatt, '#a6a19a', true) : null}
                  {skattPaa ? rad('Resultat etter skatt', sK.resultatEtterSkatt, sK.resultatEtterSkatt >= 0 ? T.gronn : FARGE.kost, sK.resultatEtterSkatt < 0, true) : null}
                </div>
              );
            })()}
            <p className="mt-3 text-[12px] leading-[1.5]" style={{ color: SVAK }}>{sK.andelTechEksternPct != null && sK.andelTechEksternPct > 0 ? `${sK.andelTechEksternPct} % av konserninntekten kommer fra eksterne plattformkunder ved slutten av perioden. ` : 'Ingen eksterne plattformkunder i planen – all inntekt er forvaltning. '}Break-even per selskap: Digihome AS {be(k.digihome.breakEvenIdx)}, Tech {harTech ? be(k.tech.breakEvenIdx) : '–'}.{skattPaa && !basisF.skatt.konsernbidrag && k.skatt.fremforbart.tech > 0 ? ` Tech bygger ${mnok(k.skatt.fremforbart.tech)} i fremførbart underskudd – en skattefordel som realiseres med konsernbidrag eller når Tech tjener penger.` : ''}</p>
          </Inn>
        </div>
      </Side>

      {/* Nøkkeltall · planen destillert */}
      <Side id="kpi" pos={pos('kpi')} aktiv={er('kpi')} bred>
        <Kapittel nr={kap('kpi')} navn="Nøkkeltall" under="planen destillert til tallene som teller" />
        <div className="mt-2 grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-14">
          <div className="lg:col-span-5">
            <Inn i={1}><H2 maks="14ch">Tallene som teller.</H2></Inn>
            <Ingress i={2} maks="42ch">Hele planen koker ned til dette: hva vi bygger, når det bærer seg selv, og hva det krever av kapital.</Ingress>
            <Inn i={3} className="mt-8">
              <div className="relative overflow-hidden rounded-[22px] p-6 sm:p-7" style={{ background: T.charcoal, boxShadow: '0 30px 64px -34px rgba(21,19,15,0.6)' }}>
                <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(122,63,168,0.4), transparent 70%)' }} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(212,150,255,0.9)' }}>Omsetningstakt ved utgang</p>
                <div className="mt-2"><Tall aktiv={er('kpi')} verdi={sK.arrExit} farge={T.offwhite} storrelse="text-[52px] lg:text-[68px]" /></div>
                <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: LYS }}>årlig omsetningstakt {mndLabel(plan.startYm, N - 1, false)}{sK.andelTechEksternPct != null && sK.andelTechEksternPct > 0 ? ` · ${sK.andelTechEksternPct} % fra eksterne plattformkunder` : ' · bygget uten én ekstern plattformkunde'}</p>
              </div>
            </Inn>
          </div>
          <div className="lg:col-span-7">
            <div className="grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3">
              {kpiGrid.map((kp, i) => (
                <Inn key={kp.l} i={4 + i} strek className="pt-4">
                  {kp.tall !== undefined
                    ? <Tall aktiv={er('kpi')} verdi={kp.tall} format={kp.format} storrelse="text-[28px] lg:text-[36px]" farge={kp.farge || T.ink} />
                    : <p className="text-[28px] lg:text-[36px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: kp.farge || T.ink }}>{kp.tekst}</p>}
                  <p className="mt-2 text-[12.5px] leading-[1.45]" style={{ color: DIM }}>{kp.l}</p>
                </Inn>
              ))}
            </div>
            <Inn i={12} className="mt-8 flex items-start gap-2 text-[12.5px]" style={{ color: SVAK }}>
              <Sparkles className="mt-[1px] h-4 w-4 shrink-0" style={{ color: LILLA_M }} /> Alle tall regnes live fra planen og de signerte kontraktene – juster driverne, og nøkkeltallene følger med.
            </Inn>
          </div>
        </div>
      </Side>

      {/* Budsjett · konsern år for år */}
      <Side id="budsjett" pos={pos('budsjett')} aktiv={er('budsjett')} bred>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Kapittel nr={kap('budsjett')} navn="Budsjett" under={`konsern · ${N} måneder · eks. mva`} />
            <Inn i={1}><H2 className="!text-[34px] sm:!text-[44px] lg:!text-[48px]">Hele budsjettet på én side.</H2></Inn>
          </div>
          <Inn i={2} className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px]" style={{ color: DIM }}>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.dh }} /> Digihome AS</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.tech }} /> Tech · ekstern</span>
            <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t border-dashed" style={{ borderColor: FARGE.kost }} /> Kostnader</span>
          </Inn>
        </div>
        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <Inn i={3} className="min-w-0 overflow-x-auto" data-testid="deck-budsjett">
          {(() => {
            const yrs = k.aar;
            const arrAt = (i) => (k.inntekt[i] || 0) * 12;
            const enhAt = (i) => Math.round(mF.enheter?.[i] || 0);
            const extTech = (a) => a.tech.inntekt - a.eliminert;
            const flyt = [
              { l: 'Konserninntekt', fet: true, vals: yrs.map((a) => a.inntekt), sum: k.sammendrag.sumInntekt },
              { l: 'Digihome AS · forvaltning', indent: true, vals: yrs.map((a) => a.digihome.inntekt), sum: sum(k.digihome.inntekt) },
              { l: 'Digihome Tech AS · ekstern', indent: true, vals: yrs.map((a) => extTech(a)), sum: sum(k.tech.inntekt) - k.sammendrag.eliminert },
              { l: 'Driftskostnader', neg: true, vals: yrs.map((a) => a.kost), sum: k.sammendrag.sumKost },
              { l: skattPaa ? 'Driftsresultat før skatt' : 'Driftsresultat', fet: true, res: true, vals: yrs.map((a) => a.resultat), sum: k.sammendrag.resultat },
            ];
            const stock = [
              { l: 'Boliger under forvaltning · ved utgang', fmt: (v) => nb(v), vals: yrs.map((a) => enhAt(a.tilIdx)), sum: enhAt(N - 1) },
              { l: 'Omsetningstakt · ved utgang', vals: yrs.map((a) => arrAt(a.tilIdx)), sum: arrAt(N - 1) },
            ];
            const num = (v, o = {}) => {
              const neg = o.neg || (o.res && v < 0);
              const farge = o.res ? (v >= 0 ? T.gronn : FARGE.kost) : (o.neg ? DIM : T.ink);
              const txt = mnok(Math.abs(v));
              return <span style={{ color: farge }}>{neg ? '− ' : ''}{txt}</span>;
            };
            const th = 'px-3 py-2.5 text-right text-[11.5px] font-semibold uppercase tracking-[0.06em]';
            const td = 'px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-[14px]';
            return (
              <table className="w-full min-w-[640px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: SVAK }}>Konsern</th>
                    {yrs.map((a) => (
                      <th key={a.nr} className={th} style={{ color: T.ink }}>År {a.nr}<span className="block text-[10.5px] font-normal normal-case tracking-normal" style={{ color: SVAK }}>{mndLabel(plan.startYm, a.fraIdx)} – {mndLabel(plan.startYm, a.tilIdx)}</span></th>
                    ))}
                    <th className={th} style={{ color: LILLA_M }}>Hele perioden<span className="block text-[10.5px] font-normal normal-case tracking-normal" style={{ color: SVAK }}>{N} mnd</span></th>
                  </tr>
                </thead>
                <tbody>
                  {flyt.map((r, ri) => (
                    <tr key={r.l} className="deck-rad" style={{ '--i': ri, background: r.res ? 'rgba(122,63,168,0.05)' : 'transparent' }}>
                      <td className={`px-3 py-2.5 text-[13.5px] ${r.fet ? 'font-semibold' : ''} ${r.indent ? 'pl-6' : ''}`} style={{ borderTop: `1px solid ${HAIR}`, color: r.indent ? DIM : T.ink }}>{r.l}</td>
                      {r.vals.map((v, i) => <td key={i} className={`${td} ${r.fet ? 'font-semibold' : 'font-medium'}`} style={{ borderTop: `1px solid ${HAIR}` }}>{num(v, r)}</td>)}
                      <td className={`${td} ${r.fet ? 'font-semibold' : 'font-medium'}`} style={{ borderTop: `1px solid ${HAIR}`, color: LILLA_M }}>{num(r.sum, r)}</td>
                    </tr>
                  ))}
                  <tr><td colSpan={yrs.length + 2} className="pt-3" /></tr>
                  {stock.map((r, si) => (
                    <tr key={r.l} className="deck-rad" style={{ '--i': flyt.length + 1 + si }}>
                      <td className="px-3 py-2.5 text-[13.5px]" style={{ borderTop: `1px solid ${HAIR}`, color: T.ink }}>{r.l}</td>
                      {r.vals.map((v, i) => <td key={i} className={`${td} font-medium`} style={{ borderTop: `1px solid ${HAIR}`, color: T.ink }}>{r.fmt ? r.fmt(v) : mnok(v)}</td>)}
                      <td className={`${td} font-semibold`} style={{ borderTop: `1px solid ${HAIR}`, color: LILLA_M }}>{r.fmt ? r.fmt(r.sum) : mnok(r.sum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </Inn>
        <Inn i={4} className="rounded-[20px] p-5" style={{ background: T.flate }} data-testid="deck-budsjett-graf">
          <p className="text-[13px] font-medium" style={{ color: T.ink }}>Vekst år for år</p>
          <p className="mt-0.5 text-[12px] leading-[1.45]" style={{ color: SVAK }}>Inntekt som søyle, kostnadsnivå som strek – resultatet under.</p>
          <div className="mt-3"><AarStolper aar={k.aar} startYm={plan.startYm} hoyde={200} /></div>
        </Inn>
        </div>
        <Inn i={5}><p className="mt-4 max-w-[82ch] text-[12px] leading-[1.5]" style={{ color: SVAK }}>Konserntall etter at intern lisens mellom selskapene er eliminert{k.sammendrag.eliminert ? ` (${mnok(k.sammendrag.eliminert)} over perioden)` : ''}. «Ved utgang» = siste måned i hvert år. {skattPaa ? 'Tallene er før skatt – skatt og kapitalbehov etter skatt vises under Det vi trenger.' : 'Full plan per selskap ligger under Planen · Digihome AS og Planen · Tech.'}</p></Inn>
      </Side>


      {/* 12 · Den ene variabelen */}
      <Side id="variabel" pos={pos('variabel')} aktiv={er('variabel')} bred>
        <Kapittel nr={kap('variabel')} navn="Den ene variabelen" under="hva en ny forvaltningskunde koster i media" />
        <Inn i={1}><H2 maks="24ch">Alt hviler på ett tall: hva det koster å hente én ny kunde.</H2></Inn>
        <Inn i={2}><p className="mt-5 max-w-[68ch] text-[15px] leading-[1.55] sm:text-[16px]" style={{ color: DIM }}>Planen regner {kr0(basisF.provisjonPerNyEnhet)} kr i media per signert enhet, pluss {basisF.partner?.paa ? `${kma(basisF.partner.honorarPct)} % av honoraret i ${basisF.partner.varighetMnd} måneder` : 'ingen partner'} – til sammen {kr0(mFb.cac.fullCac)} kr, som en enhet på {kr0(mFb.cac.bruttoHonorarNy)} kr/mnd betaler tilbake på <b style={{ color: T.ink }}>{mFb.cac.bruttoHonorarNy > 0 ? nb(mFb.cac.fullCac / mFb.cac.bruttoHonorarNy, 1) : '–'} måneder</b>. Tabellen viser hva som skjer med kapitalbehovet{skattPaa ? ' etter skatt' : ''} og resultatet over {N} måneder når prisen på en kunde endrer seg – og når en andel kommer gratis.</p></Inn>
        {variabelMatrise ? (
          <Inn i={3} className="mt-8 overflow-x-auto" data-testid="deck-variabel">
            <table className="w-full min-w-[720px] text-[13.5px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th className="pb-3 pr-4 text-left text-[11.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: SVAK }}>Organisk andel ↓ · media-CAC →</th>
                  {CAC_AKSE.map((c) => <th key={c} className="pb-3 text-right text-[13px] font-semibold" style={{ color: c === basisF.provisjonPerNyEnhet ? LILLA_M : T.ink }}>{kr0(c)} kr</th>)}
                </tr>
              </thead>
              <tbody>
                {variabelMatrise.map((radx, ri) => (
                  <tr key={ORG_AKSE[ri]}>
                    <td className="border-t py-3 pr-4 text-[13px] font-semibold" style={{ borderColor: HAIR, color: ORG_AKSE[ri] === basisF.organiskAndelPct ? LILLA_M : T.ink }}>{ORG_AKSE[ri]} % organisk{ORG_AKSE[ri] === 0 ? <span className="block text-[11px] font-normal" style={{ color: SVAK }}>alle nye koster media</span> : <span className="block text-[11px] font-normal" style={{ color: SVAK }}>referral, SEO, eksisterende</span>}</td>
                    {radx.map((c) => {
                      const erPlan = c.cac === basisF.provisjonPerNyEnhet && c.org === basisF.organiskAndelPct;
                      return (
                        <td key={c.cac} className="border-t py-3 text-right" style={{ borderColor: HAIR }}>
                          <div className={`inline-block rounded-[12px] px-3 py-2 text-right ${erPlan ? '' : ''}`} style={{ background: erPlan ? T.ink : 'transparent', color: erPlan ? T.offwhite : T.ink, boxShadow: erPlan ? 'none' : `inset 0 0 0 1px ${HAIR}` }} data-testid={erPlan ? 'deck-variabel-plan' : undefined}>
                            <p className="text-[15px] font-semibold" style={{ ...display, letterSpacing: '-0.02em' }}>{mnok(c.kapital)}</p>
                            <p className="mt-0.5 text-[11.5px]" style={{ color: erPlan ? T.lilla : (c.resultat >= 0 ? T.gronn : FARGE.kost) }}>{c.resultat >= 0 ? '+' : '−'}{mnok(Math.abs(c.resultat))}</p>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[12px]" style={{ color: SVAK }}>Øverst i hver celle: kapitalbehov{skattPaa ? ' etter skatt' : ''} (dypeste akkumulerte punkt). Under: resultat{skattPaa ? ' etter skatt' : ''} over {N} måneder. Mørk celle = planen. Alt annet holdes likt – også Tech-planen.</p>
          </Inn>
        ) : null}
        {variabelMatrise ? (() => {
          // Avledede fakta fra matrisen – aldri statiske påstander
          const celle = (cac, org) => variabelMatrise[ORG_AKSE.indexOf(org)]?.[CAC_AKSE.indexOf(cac)];
          const c5 = celle(5000, 0); const c6 = celle(6000, 0); const c10 = celle(10000, 0); const c5o = celle(5000, 30);
          const payback = (cac) => (mFb.cac.bruttoHonorarNy > 0 ? nb((cac + mFb.cac.partnerPerEnhet) / mFb.cac.bruttoHonorarNy, 1) : '–');
          const kort = [
            c5 && c6 ? ['+1 000 kr per kunde', `koster ${mnok(c6.kapital - c5.kapital)} mer i kapital og ${mnok(c5.resultat - c6.resultat)} i resultat over perioden. Dette er den dyreste tusenlappen i budsjettet.`] : null,
            c5 && c5o ? ['30 % organisk', `sparer ${mnok(c5.kapital - c5o.kapital)} i kapitalbehov og løfter resultatet ${mnok(c5o.resultat - c5.resultat)}. Referral fra fornøyde eiere og forvaltningens egen kanal er derfor budsjettets viktigste gratisarbeid.`] : null,
            c10 ? ['Payback per kunde', `${payback(basisF.provisjonPerNyEnhet)} måneder i planen – ${payback(10000)} måneder selv ved 10 000 kr. En kunde betaler seg innen ett år uansett; risikoen er tempoet, ikke enhetsøkonomien.`] : null,
          ].filter(Boolean);
          return (
            <Inn i={4} className="mt-8 grid gap-4 sm:grid-cols-3">
              {kort.map(([t, u], i) => (
                <div key={t} className="rounded-[18px] p-4" style={{ background: i === 2 ? '#F6F0FB' : '#FBFAF8', boxShadow: `inset 0 0 0 1px ${i === 2 ? 'rgba(122,63,168,0.22)' : HAIR}` }}>
                  <p className="text-[15px] font-semibold" style={{ color: i === 2 ? LILLA_M : T.ink }}>{t}</p>
                  <p className="mt-1.5 text-[13px] leading-[1.5]" style={{ color: DIM }}>{u}</p>
                </div>
              ))}
            </Inn>
          );
        })() : null}
      </Side>

      {/* 13 · Hva om */}
      <Side id="hvaom" pos={pos('hvaom')} aktiv={er('hvaom')} bred>
        <Kapittel nr={kap('hvaom')} navn="Hva om" under="test forutsetningene – begge selskaper" />
        <Inn i={1}><H2 className="!text-[34px] sm:!text-[44px] lg:!text-[48px]">Endre forutsetningene. Se svaret.</H2></Inn>
        <Inn i={2} className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="deck-presets">
          {PRESETS.filter((p) => harTech || !p.kreverTech).map((p) => {
            const aktiv = preset === p.id;
            return (
              <button key={p.id} onClick={() => velgPreset(p)} className="rounded-[18px] p-4 text-left transition-[background-color,transform,box-shadow] duration-300 active:scale-[0.99]" style={{ background: aktiv ? T.ink : '#FBFAF8', color: aktiv ? T.offwhite : T.ink, boxShadow: aktiv ? 'none' : `inset 0 0 0 1px ${HAIR}` }} data-testid={`deck-preset-${p.id}`}>
                <p className="text-[16px] sm:text-[17px]" style={{ ...display, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{p.navn}</p>
                <p className="mt-2 text-[12px] leading-[1.45] sm:text-[12.5px]" style={{ color: aktiv ? 'rgba(244,241,234,0.7)' : DIM }}>{p.tekst}</p>
              </button>
            );
          })}
        </Inn>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
          <Inn i={3}><LagGraf aktiv={er('hvaom')} N={N} startYm={plan.startYm} lag={konsernLag} kost={k.kost} beIdx={sK.breakEvenIdx} hoyde={smal ? 280 : 300} bredde={smal ? 560 : 1000} kompakt testid="deck-graf-hvaom" /></Inn>
          <Inn i={4} className="grid grid-cols-2 gap-5 lg:grid-cols-1">
            <div><Etikett>Break-even konsern</Etikett><p className="mt-1 whitespace-nowrap text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{be(sK.breakEvenIdx)}</p><p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>planen: {be(sKb.breakEvenIdx)}</p></div>
            <div><Etikett>{skattPaa ? 'Kapitalbehov etter skatt' : 'Kapitalbehov konsern'}</Etikett><Tall aktiv={er('hvaom')} verdi={kapReell} storrelse="text-[26px]" /><p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>planen: {mnok(skattPaa ? (sKb.kapitalbehovEtterSkatt ?? sKb.kapitalbehov) : sKb.kapitalbehov)}</p></div>
            <div><Etikett>Omsetningstakt ved slutt</Etikett><Tall aktiv={er('hvaom')} verdi={sK.arrExit} storrelse="text-[26px]" /><p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>planen: {mnok(sKb.arrExit)}</p></div>
            {saT ? <div><Etikett>ARR Tech ved slutt</Etikett><Tall aktiv={er('hvaom')} verdi={saT.arrExit} storrelse="text-[26px]" /><p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>planen: {mnok(saTb.arrExit)}</p></div> : null}
          </Inn>
        </div>
      </Side>

      {/* 15 · Risiko – før de spør */}
      <Side id="risiko" pos={pos('risiko')} aktiv={er('risiko')} bred>
        <Kapittel nr={kap('risiko')} navn="Risiko" under="de største truslene – og tiltakene mot dem" />
        <Inn i={1}><H2 maks="22ch">Fire ting kan velte planen. Alle fire er tallfestet.</H2></Inn>
        <div className="mt-10 grid gap-x-14 gap-y-10 md:grid-cols-2">
          {(() => {
            const celle = (cac, org) => variabelMatrise?.[ORG_AKSE.indexOf(org)]?.[CAC_AKSE.indexOf(cac)];
            const c5 = celle(5000, 0); const c8 = celle(8000, 0);
            const utv = mT ? mT.kost.utvikling[Math.min(N - 1, 12)] : null;
            return [
              { t: 'Kundekost', tall: c5 && c8 ? `+${mnok(c8.kapital - c5.kapital)}` : null, tallU: 'mer kapital ved 8 000 kr', r: `Planen regner ${kr(basisF.provisjonPerNyEnhet)} i media per ny forvaltningskunde. ${c5 && c8 ? `Ved 8 000 kr øker kapitalbehovet med ${mnok(c8.kapital - c5.kapital)}.` : ''}`, m: `Performance-avtalen (${basisF.partner?.paa ? `${kma(basisF.partner.honorarPct)} % i ${basisF.partner.varighetMnd} mnd` : 'resultatbasert'}) flytter risiko til byrået. Forvaltningens egne kunder og referral er kanalen som koster null. Vi bremser veksten før vi finansierer dyre kunder.`, kap: 'variabel' },
              { t: 'Én kodebase, få hoder', tall: utv ? kr(utv) : null, tallU: 'per måned i utvikling', r: `Tech bygger AI-native uten utviklerteam${utv ? ` – ${kr(utv)}/mnd i utvikling` : ''}. Nøkkelperson- og leverandørrisiko er reell.`, m: 'Kode, data og infrastruktur eies av Digihome Tech AS – ikke av leverandøren. Arkitektur og prosesser er dokumentert. Kapasitet kan kjøpes måned for måned, ikke ansettes i panikk.', kap: 'org' },
              { t: 'Jus og regulering', tall: nb(Math.round(mF.enheter[N - 1] || 0)), tallU: 'enheter treffes samtidig av én malfeil', r: 'Husleieloven regulerer depositum, oppsigelse og regulering i detalj. Én systematisk feil i kontraktsmal eller frist treffer hele porteføljen samtidig.', m: 'Styreleder er advokat med selskaps- og kontraktsrett som fag. Kontrakter, depositum og signering er standardisert i programvaren – én rettelse gjelder alle enheter.', kap: 'org' },
              { t: 'Churn og bemanning', tall: `${kma(basisF.aarligChurnPct)} %`, tallU: 'årlig churn i planen – test 10 % i Hva om', r: `Planen antar ${kma(basisF.aarligChurnPct)} % årlig churn og en bemanningstrapp fra ${basisF.bemanningstrinn?.[0]?.prosent ?? 30} % til ${basisF.bemanningstrinn?.[basisF.bemanningstrinn.length - 1]?.prosent ?? '–'} % stilling ved ${nb(basisF.bemanningstrinn?.[basisF.bemanningstrinn.length - 1]?.fraEnheter ?? 0)} enheter.`, m: 'Forvaltningsavtaler er trege å si opp midt i et leieforhold. Modellen varsler når enheter per årsverk passerer grensen, og «Hva om» viser hva dobbel churn og halv vekst gjør med kapitalbehovet – før noen andre spør.', kap: 'hvaom' },
            ].map((x, i) => (
              <Inn key={x.t} i={2 + i} strek className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[26px] sm:text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.ink }}>{x.t}</p>
                    <button onClick={() => gaaTil(sider.indexOf(x.kap))} className="deck-skjul-print mt-2 flex items-center gap-1 text-[12.5px] font-medium" style={{ color: LILLA_M }}>Se tallene <ArrowRight className="h-3 w-3" /></button>
                  </div>
                  {x.tall ? <div className="shrink-0 text-right"><p className="text-[26px] sm:text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: LILLA_M }}>{x.tall}</p><p className="mt-1 max-w-[18ch] text-[11.5px] leading-[1.35]" style={{ color: SVAK }}>{x.tallU}</p></div> : null}
                </div>
                <p className="mt-3 text-[14.5px] leading-[1.55]" style={{ color: DIM }}>{x.r}</p>
                <p className="mt-4 border-t pt-3 text-[14.5px] leading-[1.55]" style={{ borderColor: HAIR, color: T.ink }}><span className="mr-2 text-[11.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: LILLA_M }}>Tiltak</span>{x.m}</p>
              </Inn>
            ));
          })()}
        </div>
      </Side>

      {/* 16 · Det vi trenger (mørk) */}
      <Side id="trenger" pos={pos('trenger')} morkt aktiv={er('trenger')} bred>
        <Kapittel morkt nr={kap('trenger')} navn="Det vi trenger" under={`avledet av planen${preset !== 'plan' ? ' – med justerte forutsetninger' : ''}`} />
        <Inn i={1}><H2 morkt maks="18ch">Kapital til break‑even – med margin.</H2></Inn>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <Inn i={2}><Tall aktiv={er('trenger')} verdi={kapBuffer} farge={T.offwhite} /><p className="mt-3 text-[14px] leading-[1.5]" style={{ color: LYS }}>å hente – kapitalbehov{skattPaa ? ' etter skatt' : ''} {mnok(kapReell)}{kapReellIdx !== null && kapReellIdx !== undefined ? ` (bunnen nås ${mndLabel(plan.startYm, kapReellIdx, false)})` : ''} pluss 30 % buffer for dyrere kunder, dårlige måneder og juridiske overraskelser</p></Inn>
          <Inn i={3}><p className="whitespace-nowrap text-[40px] lg:text-[54px]" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1, color: T.offwhite }}>{be(sK.breakEvenIdx)}</p><p className="mt-3 text-[14px] leading-[1.5]" style={{ color: LYS }}>konsernet går i pluss – Digihome AS {be(k.digihome.breakEvenIdx)}, Tech {harTech ? be(k.tech.breakEvenIdx) : '–'}</p></Inn>
          <Inn i={4}><Tall aktiv={er('trenger')} verdi={sK.arrExit} farge={T.offwhite} /><p className="mt-3 text-[14px] leading-[1.5]" style={{ color: LYS }}>årlig omsetningstakt ved slutten av perioden{sK.andelTechEksternPct != null ? ` – ${sK.andelTechEksternPct} % fra eksterne plattformkunder` : ''}</p></Inn>
        </div>
        <Inn i={5} className="mt-10">
          <p className="text-[12.5px] font-medium" style={{ color: LYS_SVAK }}>Milepæler i perioden</p>
          <Tidslinje aktiv={er('trenger')} N={N} startYm={plan.startYm} merker={[
            { l: 'Kapitalbunn', idx: sK.kapitalbehovIdx, f: T.lilla, opp: false },
            { l: 'Break-even DH', idx: k.digihome.breakEvenIdx, f: T.offwhite, opp: true },
            ...(harTech ? [{ l: 'Break-even Tech', idx: k.tech.breakEvenIdx, f: FARGE.huseier, opp: false }] : []),
            { l: 'Break-even konsern', idx: sK.breakEvenIdx, f: T.gronn, opp: true },
          ]} />
        </Inn>
        <Inn i={5} strek={LYS_HAIR} className="mt-10 pt-5">
          <p className="mb-2 text-[12.5px] font-medium" style={{ color: LYS_SVAK }}>Rullebanen · akkumulert kontantstrøm{skattPaa ? ' etter betalt skatt' : ''}, konsern</p>
          <Bane aktiv={er('trenger')} serie={skattPaa ? k.kontant.akkumulert : k.akkumulert} kapital={kapBuffer} bunnIdx={kapReellIdx} startYm={plan.startYm} N={N} hoyde={smal ? 200 : 220} bredde={smal ? 560 : 1000} />
        </Inn>
        <Inn i={6} className="mt-8">
          <p className="mb-3 text-[12.5px] font-medium" style={{ color: LYS_SVAK }}>Pengene går til · sum over perioden</p>
          <AndelBar morkt aktiv={er('trenger')} deler={bruk} />
        </Inn>
        <Inn i={7} className="mt-10 grid gap-10 lg:grid-cols-3">
          {(() => {
            const g = basisF.grunnleggere; const brutto = g?.paa ? g.personer.flatMap((p) => p.trinn.map((t) => t.brutto)).filter(Boolean) : [];
            const lonnTekst = brutto.length ? `${nb(Math.min(...brutto) / 1000)}–${nb(Math.max(...brutto) / 1000)} k brutto per måned` : null;
            return [
              { t: 'Hva pengene utløser', p: [`${nb(Math.round(mF.enheter[N - 1] || 0))} enheter under forvaltning ${mndLabel(plan.startYm, N - 1, false)}`, `Konsernet i pluss ${be(sK.breakEvenIdx)}${k.digihome.breakEvenIdx !== null ? ` – Digihome AS ${be(k.digihome.breakEvenIdx)}` : ''}`, `${mnok(sK.arrExit)} årlig omsetningstakt – bygget uten én ekstern plattformkunde`] },
              { t: 'Grunnleggerne', p: lonnTekst ? [`Sarah og Martin tar ${lonnTekst} i perioden – under markedslønn, i trinn som følger porteføljen`, 'Lønnen er en beslutning i planen, ikke en kostnad vi skjuler', 'Styret er felles for begge selskaper: Erik Hoffmann-Dahl (leder), Jens-Petter Glittenberg, Sarah Sleeman, Martin Kviteberg'] : ['Styret er felles for begge selskaper: Erik Hoffmann-Dahl (leder), Jens-Petter Glittenberg, Sarah Sleeman, Martin Kviteberg'] },
              { t: 'Utenfor perioden', p: [
                ...(sF.partnerHale > 0 ? [`${kr(sF.partnerHale)} i partnerhonorar forfaller etter ${mndLabel(plan.startYm, N - 1, false)} for kunder som allerede er signert (${sF.partnerHaleMnd} mnd)`] : []),
                ...(skattPaa && sK.skattEtterPeriode > 0 ? [`${kr(sK.skattEtterPeriode)} i skatt for siste år betales året etter`] : []),
                'Eksterne plattformkunder (selvbetjente huseiere, eiendomsselskaper) er oppside – ikke forutsetning. De utløser neste kapittel, ikke denne emisjonen',
              ] },
            ].map((x) => (
              <div key={x.t} className="border-t pt-5" style={{ borderColor: LYS_HAIR }}>
                <p className="text-[12.5px] font-medium" style={{ color: T.lilla }}>{x.t}</p>
                <ul className="mt-3">{x.p.map((t) => <li key={t} className="border-t py-2.5 text-[13.5px] leading-[1.5]" style={{ borderColor: LYS_HAIR, color: LYS }}>{t}</li>)}</ul>
              </div>
            ));
          })()}
        </Inn>
        {investor?.kanSporre ? (
          <Inn i={8}>
            <form onSubmit={spor} className="deck-skjul-print mt-10 max-w-[760px]" data-testid="deck-qa">
              <p className="text-[12.5px] font-medium" style={{ color: LYS_SVAK }}>Spør oss – svaret kommer i investorrommet</p>
              <div className="mt-3 flex gap-2">
                <input value={sporsmal} onChange={(e) => setSporsmal(e.target.value)} placeholder="Spørsmål til teamet" className="h-12 flex-1 rounded-[12px] px-4 text-[15px] outline-none" style={{ background: 'rgba(244,241,234,0.08)', color: T.offwhite, boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.16)' }} />
                <button type="submit" className="flex h-12 items-center gap-2 rounded-[12px] px-4 text-[14px] font-medium" style={{ background: T.offwhite, color: T.ink }}>{spurt ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />} {spurt ? 'Sendt' : 'Send'}</button>
              </div>
            </form>
          </Inn>
        ) : null}
        <Inn i={8} className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[70ch] text-[12px] leading-[1.5]" style={{ color: 'rgba(244,241,234,0.42)' }}>Konfidensielt. Planen er en modell basert på oppgitte forutsetninger og faktiske kontrakter per {plan.oppdatertAt ? new Date(plan.oppdatertAt).toLocaleDateString('nb-NO') : 'i dag'}. Ikke et tilbud om tegning.</p>
          {ekstern ? <button onClick={lastNed} className="deck-skjul-print flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium" style={{ background: 'rgba(244,241,234,0.1)', color: T.offwhite }} data-testid="deck-lastned-ekstern"><Download className="h-3.5 w-3.5" /> Last ned som PDF</button> : null}
        </Inn>
      </Side>
    </div>
  );
}
