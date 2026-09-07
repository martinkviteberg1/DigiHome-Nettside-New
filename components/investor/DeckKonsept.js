'use client';
/* ─────────────────────────────────────────────────────────────────────────────
   DeckKonsept — DigiHomes investordeck for HELE konseptet, med levende budsjetter.

   · Én URL, to roller: investor (?t=lenke, ev. passord) eller presenter (admin-
     sesjon via ?key=). Samme sider, samme motorer som budsjettmodulen
     (lib/budsjett-modell.js) — alt regnes i nettleseren, ingenting lagres.
   · Fortellingen: Forside → Konseptet (forsidens levende scene) → To selskaper,
     én plattform → Hvor vi står → Unit economics → Go-to-market → Planen
     Digihome AS → Planen Tech AS → Konsern → Hva om → Det vi trenger.
   · Bevegelse som på forsiden: kun opacity/transform, expo-ease, én ting i
     bevegelse om gangen. Grafer GLIR (tween) — de blinker aldri. Hver side
     «kommer inn» når den er aktiv (deck-inn, forsinket per element).
   · Print = PDF («Last ned»). prefers-reduced-motion → sluttbildet.
   ───────────────────────────────────────────────────────────────────────────── */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Download, Lock, RotateCcw, Send, Check, Megaphone, Home, Building2, Link2 } from 'lucide-react';
import { T, display, EASE, DIM, SVAK, HAIR } from '@/components/forside/v4/tokens';
import HeroScene from '@/components/forside/v4/HeroScene';
import {
  beregnInvestorModell, beregnTech, beregnKonsernSammenstilling, rensModellDrivere, rensTechDrivere, rensTechFakta, skalerVekst,
} from '@/lib/budsjett-modell';

const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const ymDeler = (ym) => { const [y, m] = String(ym || '2026-01').split('-').map(Number); return { y, m }; };
const ymPluss = (ym, i) => { const { y, m } = ymDeler(ym); const t = y * 12 + (m - 1) + i; return [Math.floor(t / 12), (t % 12) + 1]; };
const ymDiff = (a, b) => { const A = ymDeler(a); const B = ymDeler(b); return (B.y * 12 + B.m) - (A.y * 12 + A.m); };
const mndLabel = (ym, i, kort = true) => { const [y, m] = ymPluss(ym, i); return kort ? `${MND[m - 1]} ${String(y).slice(2)}` : `${MND[m - 1]} ${y}`; };
// Tusenskiller = vanlig mellomrom (Right Grotesk mangler U+00A0). Tall står alltid i nowrap-kontekst.
const nb = (n, d = 0) => (Number(n) || 0).toLocaleString('nb-NO', { maximumFractionDigits: d, minimumFractionDigits: d }).replace(/\u00A0/g, ' ');
const mnok = (n) => { const v = Number(n) || 0; return Math.abs(v) >= 1e6 ? `${nb(v / 1e6, 1)} MNOK` : `${nb(v / 1000)} k`; };
const kr = (n) => `${nb(n)} kr`;
const pct = (n, d = 0) => `${nb(n, d)} %`;
const klem = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const utExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const sum = (a) => (Array.isArray(a) ? a.reduce((s, x) => s + (Number(x) || 0), 0) : 0);
const LYS = 'rgba(244,241,234,0.7)'; const LYS_SVAK = 'rgba(244,241,234,0.5)'; const LYS_HAIR = 'rgba(244,241,234,0.14)';
const FARGE = { dh: T.ink, lisens: '#5b4a66', huseier: '#8b5cf6', bedrift: '#0ea5a4', kost: '#B3261E', tech: T.lilla };

/* Annonsekjøpet skaleres i ALLE faser (som skalerVekst for forvaltningen). */
const skalerAnnonse = (h, f) => ({
  ...h,
  annonsePerMnd: Math.round((Number(h.annonsePerMnd) || 0) * f),
  vekstplan: (Array.isArray(h.vekstplan) ? h.vekstplan : []).map((x) => ({ ...x, annonsePerMnd: Math.round((Number(x.annonsePerMnd) || 0) * f) })),
});
const flettTech = (basis, over) => {
  const ut = { ...basis };
  for (const g of Object.keys(over || {})) ut[g] = { ...(basis[g] || {}), ...(over[g] || {}) };
  return ut;
};

/* ── Tween: glir tallserier/tall mellom verdier (rAF, expo-out) ── */
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

/* ── Laggraf: stablede inntektslag + kostnadslinje + break-even. Alle serier tweenes. ── */
function LagGraf({ lag, kost, beIdx, startYm, N, hoyde = 340, bredde = 1000, kompakt = false, morkt = false, testid }) {
  const serier = lag.map((l) => useTween(l.serie)); // eslint-disable-line react-hooks/rules-of-hooks
  const kostT = useTween(kost);
  const W = bredde; const H = hoyde; const padL = 52; const padR = 12; const padT = 22; const padB = 30;
  const topp = Array.from({ length: N }, (_, i) => serier.reduce((s, sr) => s + (sr[i] || 0), 0));
  const maks = Math.max(1, ...topp, ...kostT) * 1.1;
  const x = (i) => padL + ((W - padL - padR) * (i + 0.5)) / N;
  const y = (v) => padT + (H - padT - padB) * (1 - v / maks);
  const bw = Math.max(4, ((W - padL - padR) / N) * 0.6);
  const svak = morkt ? LYS_SVAK : SVAK; const hair = morkt ? LYS_HAIR : HAIR;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Inntekt per lag og kostnader per måned" data-testid={testid}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={padL} x2={W - padR} y1={y(maks * f)} y2={y(maks * f)} stroke={hair} />
          <text x={padL - 8} y={y(maks * f) + 4} textAnchor="end" fontSize="11" fill={svak}>{maks * f >= 1e6 ? `${(maks * f / 1e6).toFixed(1)} M` : `${Math.round(maks * f / 1000)} k`}</text>
        </g>
      ))}
      {Array.from({ length: N }, (_, i) => {
        let base = 0;
        return (
          <g key={i}>
            {serier.map((sr, li) => { const v = Math.max(0, sr[i] || 0); const el = <rect key={li} x={x(i) - bw / 2} y={y(base + v)} width={bw} height={Math.max(0, y(base) - y(base + v))} fill={lag[li].farge} rx="2" opacity={lag[li].opacity ?? 1} />; base += v; return el; })}
          </g>
        );
      })}
      <polyline fill="none" stroke={FARGE.kost} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={morkt ? '5 4' : undefined} points={kostT.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      {beIdx !== null && beIdx !== undefined ? (
        <g style={{ transition: `transform 650ms ${EASE}` }}>
          <line x1={x(beIdx)} x2={x(beIdx)} y1={padT - 4} y2={H - padB} stroke={T.gronn} strokeDasharray="3 5" strokeWidth="1.5" />
          <text x={x(beIdx) > W - 170 ? x(beIdx) - 8 : x(beIdx) + 8} y={padT + 6} textAnchor={x(beIdx) > W - 170 ? 'end' : 'start'} fontSize="12" fill={T.gronn} fontWeight="600">Break-even · {mndLabel(startYm, beIdx)}</text>
        </g>
      ) : null}
      {Array.from({ length: N }, (_, i) => i).filter((i) => i % (kompakt || W < 700 ? 6 : 3) === 0).map((i) => (
        <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill={svak}>{mndLabel(startYm, i)}</text>
      ))}
    </svg>
  );
}

function Tall({ verdi, format = mnok, storrelse = 'text-[40px] lg:text-[52px]', farge = T.ink, testid }) {
  const v = useTween(Number(verdi) || 0, 600);
  const str = format(v); const i = str.lastIndexOf(' ');
  const tall = i > 0 ? str.slice(0, i) : str; const enhet = i > 0 ? str.slice(i + 1) : '';
  return (
    <p className={`whitespace-nowrap ${storrelse}`} style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: farge }} data-testid={testid}>
      {tall}{enhet ? <span className="ml-[0.18em] text-[0.42em]" style={{ letterSpacing: '-0.01em', opacity: 0.72 }}>{enhet}</span> : null}
    </p>
  );
}

function Etikett({ children, farge = SVAK, className = '' }) { return <p className={`text-[13px] font-medium ${className}`} style={{ color: farge }}>{children}</p>; }

/* Én side = én skjermhøyde. Elementer med .deck-inn glir inn når siden er aktiv (--i = rekkefølge). */
function Side({ id, children, morkt = false, aktiv = false, testid, bred = false }) {
  return (
    <section id={`deck-${id}`} data-aktiv={aktiv ? '1' : '0'} className="deck-side relative flex min-h-[100svh] snap-start flex-col justify-center px-6 py-16 sm:px-10 lg:px-16" style={{ background: morkt ? T.charcoal : T.canvas, color: morkt ? T.offwhite : T.ink }} data-testid={testid || `deck-${id}`}>
      <div className={`mx-auto w-full ${bred ? 'max-w-[1320px]' : 'max-w-[1180px]'}`}>{children}</div>
    </section>
  );
}
const Inn = ({ i = 0, children, className = '', style }) => <div className={`deck-inn ${className}`} style={{ '--i': i, ...style }}>{children}</div>;

/* ── Skruknapp: label, verdi, slider ── */
function Skru({ label, verdi, min, max, steg, format, onChange, onFerdig, basis, hint, testid }) {
  const endret = basis !== undefined && Math.abs(Number(verdi) - Number(basis)) > 1e-9;
  return (
    <label className="block py-2.5" data-testid={testid}>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[13.5px]" style={{ color: DIM }}>{label}</span>
        <span className="whitespace-nowrap text-[14px] font-medium" style={{ color: endret ? '#7A3FA8' : T.ink }}>{format(verdi)}{endret ? <span className="ml-1.5 text-[11.5px]" style={{ color: SVAK }}>plan {format(basis)}</span> : null}</span>
      </span>
      {hint ? <span className="mt-0.5 block text-[11.5px]" style={{ color: SVAK }}>{hint}</span> : null}
      <input type="range" min={min} max={max} step={steg} value={verdi} onChange={(e) => onChange(Number(e.target.value))} onPointerUp={onFerdig} className="dh-slider mt-2 w-full" />
    </label>
  );
}

/* ── Nøkkeltall med avvik mot planen ── */
function Nokkel({ label, tall, tekst, delta, format = mnok, negativRod = false, morkt = false, storrelse = 'text-[28px] lg:text-[34px]' }) {
  const farge = morkt ? T.offwhite : (negativRod && tall < 0 ? FARGE.kost : T.ink);
  return (
    <div className="min-w-0">
      <Etikett farge={morkt ? LYS_SVAK : SVAK}>{label}</Etikett>
      {tall !== null && tall !== undefined ? <Tall verdi={tall} format={format} storrelse={storrelse} farge={farge} /> : <p className={`whitespace-nowrap ${storrelse}`} style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: farge }}>{tekst}</p>}
      <p className="mt-1.5 text-[12.5px]" style={{ color: delta ? (morkt ? T.lilla : '#7A3FA8') : (morkt ? LYS_SVAK : SVAK) }}>{delta ? `${delta} mot planen` : 'som planlagt'}</p>
    </div>
  );
}

/* ── Rad i en definisjonsliste ── */
const DlRad = ({ l, v, morkt = false, fet = false }) => (
  <div className="flex items-baseline justify-between gap-4 border-b py-2.5" style={{ borderColor: morkt ? LYS_HAIR : HAIR }}>
    <dt className="text-[14px]" style={{ color: morkt ? 'rgba(244,241,234,0.65)' : DIM }}>{l}</dt>
    <dd className={`whitespace-nowrap text-[15px] ${fet ? 'font-semibold' : 'font-medium'}`} style={{ color: morkt ? T.offwhite : T.ink }}>{v}</dd>
  </div>
);

/* ── Preset-kort («hva om») — gjelder begge selskaper ── */
const PRESETS = [
  { id: 'plan', navn: 'Planen', tekst: 'Slik den er lagt.', fakt: { forv: 1, tech: 1 }, over: () => ({}) },
  { id: 'halv', navn: 'Halv vekst', tekst: 'Begge selskaper vokser halvparten så fort.', fakt: { forv: 0.5, tech: 0.5 }, over: (bF, bT) => ({ tech: bT ? { huseier: { organiskPerMnd: bT.huseier.organiskPerMnd * 0.5 }, bedrift: { nyeSelskaperPerMnd: bT.bedrift.nyeSelskaperPerMnd * 0.5 } } : {} }) },
  { id: 'dobbel', navn: 'Dobbel vekst', tekst: 'Vi trykker på gassen i begge selskaper.', fakt: { forv: 2, tech: 2 }, over: (bF, bT) => ({ tech: bT ? { bedrift: { nyeSelskaperPerMnd: bT.bedrift.nyeSelskaperPerMnd * 2 } } : {} }) },
  { id: 'cac', navn: 'Dobbel CAC', tekst: 'Kundene blir dyrere å hente – hver ny enhet koster det dobbelte.', fakt: { forv: 1, tech: 1 }, over: (bF, bT) => ({ forv: { provisjonPerNyEnhet: bF.provisjonPerNyEnhet * 2 }, tech: bT ? { huseier: { cacPerEnhet: bT.huseier.cacPerEnhet * 2 }, bedrift: { salgskostPerSelskap: bT.bedrift.salgskostPerSelskap * 2 } } : {} }) },
  { id: 'churn', navn: 'Lav churn', tekst: 'Vi holder på kundene bedre – maks 10 % årlig frafall.', fakt: { forv: 1, tech: 1 }, over: (bF, bT) => ({ forv: { aarligChurnPct: Math.min(bF.aarligChurnPct, 10) }, tech: bT ? { huseier: { aarligChurnPct: Math.min(bT.huseier.aarligChurnPct, 10) }, bedrift: { aarligChurnPct: Math.min(bT.bedrift.aarligChurnPct, 5) } } : {} }) },
  { id: 'organisk', navn: 'Uten annonser', tekst: 'Plattformen vokser bare organisk – ingen betalt trafikk.', kreverTech: true, fakt: { forv: 1, tech: 0 }, over: () => ({}) },
];

export default function DeckKonsept({ token = '', adminKey = '', planId = '', techId = '' }) {
  const [data, setData] = useState(null);
  const [feil, setFeil] = useState('');
  const [trengerPin, setTrengerPin] = useState(null);
  const [pin, setPin] = useState(''); const [pinFeil, setPinFeil] = useState('');
  const [over, setOver] = useState({ forv: {}, tech: {} });
  const [fakt, setFakt] = useState({ forv: 1, tech: 1 });
  const [preset, setPreset] = useState('plan');
  const [side, setSide] = useState(0);
  const [sporsmal, setSporsmal] = useState(''); const [spurt, setSpurt] = useState(false);
  const [musAktiv, setMusAktiv] = useState(true);
  const [smal, setSmal] = useState(false);
  const rotRef = useRef(null); const musTimer = useRef(0); const setteSider = useRef(new Set()); const aapnetLogget = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const oppd = () => setSmal(mq.matches);
    oppd(); mq.addEventListener('change', oppd);
    return () => mq.removeEventListener('change', oppd);
  }, []);

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

  /* ── Modeller: Digihome AS (forvaltning) + Digihome Tech AS (SaaS) → konsern ── */
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
  // Tech-planen kan starte en annen måned enn Digihome AS-planen — seriene skyves til samme tidsakse.
  const offset = plan && techPlan ? ymDiff(plan.startYm, techPlan.startYm) : 0;
  const skyv = useCallback((arr) => Array.from({ length: N }, (_, t) => { const tt = t - offset; return Array.isArray(arr) && tt >= 0 && tt < arr.length ? (Number(arr[tt]) || 0) : 0; }), [N, offset]);
  const tilKonsern = useCallback((m) => (m ? { inntekt: { total: skyv(m.inntekt.total), forvaltning: skyv(m.inntekt.forvaltning), huseier: skyv(m.inntekt.huseier), bedrift: skyv(m.inntekt.bedrift) }, kostSum: skyv(m.kostSum) } : null), [skyv]);
  const mTk = useMemo(() => tilKonsern(mT), [mT, tilKonsern]);
  const k = useMemo(() => (mF ? beregnKonsernSammenstilling({ forvaltning: mF, tech: mTk, antallMnd: N }) : null), [mF, mTk, N]);
  const kb = useMemo(() => (mFb ? beregnKonsernSammenstilling({ forvaltning: mFb, tech: tilKonsern(mTb), antallMnd: N }) : null), [mFb, mTb, tilKonsern, N]);

  const velgPreset = (p) => {
    if (!basisF) return;
    setPreset(p.id);
    setFakt({ forv: p.fakt?.forv ?? 1, tech: p.fakt?.tech ?? 1 });
    const o = p.over(basisF, basisT) || {};
    setOver({ forv: o.forv || {}, tech: o.tech || {} });
    hendelse({ type: 'deck_hvaom', valg: p.navn });
  };
  const skruF = (key, v) => { setPreset('egen'); setOver((c) => ({ ...c, forv: { ...c.forv, [key]: v } })); };
  const skruT = (gruppe, key, v) => { setPreset('egen'); setOver((c) => ({ ...c, tech: { ...c.tech, [gruppe]: { ...(c.tech[gruppe] || {}), [key]: v } } })); };
  const skruTempo = (seg, v) => { setPreset('egen'); setFakt((c) => ({ ...c, [seg]: v })); };
  const skruFerdig = (label) => () => hendelse({ type: 'deck_driver', valg: label });
  const nullstill = () => { setPreset('plan'); setFakt({ forv: 1, tech: 1 }); setOver({ forv: {}, tech: {} }); };

  /* ── Navigasjon: scroll-snap + tastatur; mus skjules i ro (presenter) ── */
  const sider = useMemo(() => ['forside', 'konsept', 'selskaper', 'staar', 'unit', 'gtm', 'plan-dh', 'plan-tech', 'konsern', 'hvaom', 'trenger'], []);
  const gaaTil = useCallback((i) => { const el = document.getElementById(`deck-${sider[klem(i, 0, sider.length - 1)]}`); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [sider]);
  useEffect(() => {
    const tast = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); gaaTil(side + 1); }
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); gaaTil(side - 1); }
      if (e.key === 'Home') gaaTil(0); if (e.key === 'End') gaaTil(sider.length - 1);
    };
    window.addEventListener('keydown', tast); return () => window.removeEventListener('keydown', tast);
  }, [side, gaaTil, sider]);
  useEffect(() => {
    if (!data) return undefined;
    const els = sider.map((s) => document.getElementById(`deck-${s}`)).filter(Boolean);
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting && en.intersectionRatio > 0.5) { const i = sider.indexOf(en.target.id.replace('deck-', '')); setSide(i); if (!setteSider.current.has(sider[i])) { setteSider.current.add(sider[i]); hendelse({ type: 'deck_side', side: sider[i] }); } } });
    }, { root: rotRef.current, threshold: [0.5] });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [data, hendelse, sider]);
  useEffect(() => {
    if (!data?.presenter) { setMusAktiv(true); return undefined; }
    const beveg = () => { setMusAktiv(true); window.clearTimeout(musTimer.current); musTimer.current = window.setTimeout(() => setMusAktiv(false), 2600); };
    window.addEventListener('mousemove', beveg); beveg();
    return () => { window.removeEventListener('mousemove', beveg); window.clearTimeout(musTimer.current); };
  }, [data?.presenter]);

  const lastNed = () => { hendelse({ type: 'deck_nedlasting', format: 'pdf' }); window.print(); };
  const spor = async (e) => {
    e.preventDefault(); if (!sporsmal.trim() || !token) return;
    try { await fetch(`/api/investor/qa?t=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: `[Deck · ${sider[side]}] ${sporsmal.trim()}` }) }); setSpurt(true); setSporsmal(''); } catch (e2) { /* stille */ }
  };
  const byttPlan = (param, id) => { const u = new URL(window.location.href); u.searchParams.set(param, id); window.location.href = u.toString(); };

  /* ── Tilstander før data ── */
  if (trengerPin !== null) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center px-6" style={{ background: T.canvas, color: T.ink }}>
        <form onSubmit={sendPin} className="w-full max-w-[380px]" data-testid="deck-pin">
          <p className="flex items-center gap-2 text-[13.5px] font-medium" style={{ color: SVAK }}><Lock className="h-3.5 w-3.5" /> Konfidensielt</p>
          <h1 className="mt-3 text-[36px]" style={{ ...display, color: T.ink }}>DigiHome — planen{trengerPin ? <span className="block text-[20px]" style={{ color: DIM, letterSpacing: '-0.01em', lineHeight: 1.3 }}>for {trengerPin}</span> : null}</h1>
          <p className="mt-4 text-[15px]" style={{ color: DIM }}>Lenken er personlig og passordbeskyttet. Passordet er sendt deg separat.</p>
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Passord" autoFocus data-testid="deck-pin-input"
            className="mt-6 h-[52px] w-full rounded-[14px] px-5 text-[16px] outline-none" style={{ background: '#FBFAF8', boxShadow: `inset 0 0 0 1px ${HAIR}`, color: T.ink }} />
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
  const kapBuffer = Math.round((sK.kapitalbehov || 0) * 1.2 / 100000) * 100000;
  const uT = mT?.unit || null; const uF = mF.cac || {};
  const morkSide = ['unit', 'trenger'].includes(sider[side]);
  const fakserie = () => { const s0 = mF.nyePerMndSerie || []; if (!s0.length) return ''; const lo = Math.min(...s0); const hi = Math.max(...s0); return lo === hi ? `${nb(lo, 1)} nye enheter/mnd` : `${nb(lo, 1)}–${nb(hi, 1)} nye enheter/mnd gjennom perioden`; };
  const prisHuseier = basisT ? (basisT.huseier.prisModell === 'fast' ? `${kr(basisT.huseier.pris)}/mnd` : `${nb(basisT.huseier.pris, 1)} % av leien`) : null;
  const paT = drivT?.partner; const paF = drivF?.partner;
  // Bruk av midler (konsern, hele perioden)
  const smT = saT?.sm || { annonser: 0, partner: 0, markedsforing: 0, salg: 0 };
  const bruk = [
    ['Markedsføring og salg', (sF.sumSm || 0) + (saT?.sumSm || 0), 'performance-partner, annonsekjøp, salg'],
    ['Utvikling og drift av plattformen', (mT ? sum(mT.kost.utvikling) + sum(mT.kost.hosting) : 0), 'Digihome Tech AS · R&D og hosting'],
    ['Forvaltere og team', sum(mF.kost.bemanning), 'Digihome AS · bemanningstrapp'],
    ['Øvrige faste kostnader', sum(mF.kost.admin) + sum(mF.kost.andre) + (mT ? sum(mT.kost.andre) : 0), 'administrasjon og annet'],
  ].filter(([, v]) => v > 0);
  const brukSum = bruk.reduce((s, [, v]) => s + v, 0);

  return (
    <div ref={rotRef} className="deck-rot h-[100svh] snap-y snap-proximity overflow-y-auto scroll-smooth md:snap-mandatory" style={{ background: T.canvas, cursor: musAktiv ? 'auto' : 'none' }} data-testid="deck">
      <style>{`
        .dh-slider { -webkit-appearance: none; appearance: none; height: 2px; background: rgba(21,19,15,0.14); border-radius: 2px; outline: none; }
        .dh-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: ${T.ink}; border: 3px solid ${T.offwhite}; box-shadow: 0 0 0 1px rgba(21,19,15,0.2); cursor: pointer; }
        .dh-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: ${T.ink}; border: 3px solid ${T.offwhite}; cursor: pointer; }
        .deck-side .deck-inn { opacity: 0; transform: translateY(18px); transition: opacity 700ms ${EASE}, transform 700ms ${EASE}; transition-delay: calc(var(--i, 0) * 90ms); }
        .deck-side[data-aktiv="1"] .deck-inn { opacity: 1; transform: none; }
        @keyframes deck-strom { to { stroke-dashoffset: -28; } }
        .deck-strom { stroke-dasharray: 6 8; animation: deck-strom 1.6s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .deck-side .deck-inn { opacity: 1; transform: none; transition: none; } .deck-strom { animation: none; } }
        @media print { .deck-rot { height: auto !important; overflow: visible !important; } .deck-side { min-height: auto !important; page-break-after: always; padding: 32px !important; } .deck-side .deck-inn { opacity: 1 !important; transform: none !important; } .deck-skjul-print { display: none !important; } }
      `}</style>

      {/* Toppstripe: fremdrift + handlinger — følger sidens lys/mørke; skjules ved ro i presenter */}
      <div className="deck-skjul-print pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8" style={{ opacity: musAktiv || side === 0 ? 1 : 0, transition: `opacity 500ms ${EASE}` }}>
        <div className="pointer-events-auto flex items-center gap-1.5">
          {sider.map((sd, i) => <button key={sd} onClick={() => gaaTil(i)} aria-label={`Side ${i + 1}`} title={sd} className="h-1.5 rounded-full transition-all duration-500" style={{ width: side === i ? 26 : 8, background: side === i ? (morkSide ? T.offwhite : T.ink) : (morkSide ? 'rgba(244,241,234,0.28)' : 'rgba(21,19,15,0.2)') }} />)}
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {data.presenter && data.planer?.length > 1 ? (
            <select value={plan.id} onChange={(e) => byttPlan('plan', e.target.value)} className="hidden h-9 max-w-[200px] rounded-full px-3 text-[12.5px] transition-colors duration-500 sm:block" style={{ background: morkSide ? 'rgba(244,241,234,0.1)' : 'rgba(21,19,15,0.06)', color: morkSide ? T.offwhite : T.ink }} data-testid="deck-planvalg" title="Digihome AS-plan">
              {data.planer.map((p) => <option key={p.id} value={p.id} style={{ color: T.ink }}>DH · {p.navn}{p.investorSynlig ? '' : ' (ikke delt)'}</option>)}
            </select>
          ) : null}
          {data.presenter && data.techPlaner?.length > 1 && techPlan ? (
            <select value={techPlan.id} onChange={(e) => byttPlan('tech', e.target.value)} className="hidden h-9 max-w-[200px] rounded-full px-3 text-[12.5px] transition-colors duration-500 lg:block" style={{ background: morkSide ? 'rgba(244,241,234,0.1)' : 'rgba(21,19,15,0.06)', color: morkSide ? T.offwhite : T.ink }} data-testid="deck-techvalg" title="Tech AS-plan">
              {data.techPlaner.map((p) => <option key={p.id} value={p.id} style={{ color: T.ink }}>Tech · {p.navn}{p.investorSynlig ? '' : ' (ikke delt)'}</option>)}
            </select>
          ) : null}
          {preset !== 'plan' ? <button onClick={nullstill} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium" style={{ background: morkSide ? 'rgba(212,150,255,0.18)' : 'rgba(122,63,168,0.12)', color: morkSide ? T.lilla : '#7A3FA8' }} data-testid="deck-nullstill"><RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tilbake til planen</span><span className="sm:hidden">Planen</span></button> : null}
          <button onClick={lastNed} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors duration-500" style={{ background: morkSide ? 'rgba(244,241,234,0.1)' : 'rgba(21,19,15,0.06)', color: morkSide ? T.offwhite : T.ink }} data-testid="deck-lastned"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">PDF</span></button>
        </div>
      </div>

      {/* 1 · Forside */}
      <Side id="forside" aktiv={side === 0}>
        <Inn i={0}><Etikett>{investor ? `Utarbeidet for ${investor.label}` : data.presenter ? 'Presenter' : 'Konfidensielt'} · {plan.navn}{techPlan ? ` + ${techPlan.navn}` : ''} · {new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</Etikett></Inn>
        <Inn i={1}><h1 className="mt-8 max-w-[12ch] text-[56px] sm:text-[84px] lg:text-[116px]" style={{ ...display, color: T.ink }}>Utleie på autopilot<span style={{ color: T.lilla }}>.</span></h1></Inn>
        <Inn i={2}><p className="mt-8 max-w-[54ch] text-[18px] leading-[1.5] sm:text-[21px]" style={{ color: DIM }}>DigiHome er programvaren som driver utleieboligen – leietakere, kontrakter, husleie og drift – og forvaltningsselskapet som gjør jobben for dem som ikke vil. To selskaper, én plattform. Dette er planen for de neste {N} månedene – levende, ikke låst.</p></Inn>
        <Inn i={3}><button onClick={() => gaaTil(1)} className="deck-skjul-print mt-12 flex items-center gap-2 text-[14px] font-medium" style={{ color: T.ink }}>Bla nedover <ArrowDown className="h-4 w-4 animate-bounce" strokeWidth={1.8} /></button></Inn>
      </Side>

      {/* 2 · Konseptet — forsidens levende scene: boligen, og dagen DigiHome tok seg av */}
      <Side id="konsept" aktiv={side === 1} bred>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <div>
            <Inn i={0}><Etikett>Konseptet · slik ser en dag ut</Etikett></Inn>
            <Inn i={1}><h2 className="mt-5 max-w-[14ch] text-[40px] sm:text-[56px]" style={{ ...display, color: T.ink }}>Systemet driver boligen. Eieren har siste ord.</h2></Inn>
            <Inn i={2}><p className="mt-6 max-w-[44ch] text-[16px] leading-[1.55] sm:text-[17px]" style={{ color: DIM }}>Husleie registreres, kontrakter signeres med BankID, leietakerens spørsmål besvares fra kontrakten – og når varmtvannet svikter, finner systemet rørleggeren og ber om ett trykk. Alt annet skjer av seg selv.</p></Inn>
            <Inn i={3}>
              <ul className="mt-8 grid gap-3 text-[14.5px]" style={{ color: T.ink }}>
                {[['Leietakere', 'annonse, visning, kredittsjekk og valg'], ['Kontrakt og depositum', 'BankID-signering, depositumsgaranti'], ['Husleie', 'innkreving, purring, regulering etter husleieloven'], ['Drift', 'saker fra leietaker → leverandør → godkjenning']].map(([t, u], i) => (
                  <li key={t} className="flex items-baseline gap-3 border-t py-2.5" style={{ borderColor: HAIR }}><span className="w-5 shrink-0 text-[12px] font-semibold" style={{ color: SVAK }}>0{i + 1}</span><span className="font-medium">{t}</span><span className="ml-auto text-right text-[13px]" style={{ color: SVAK }}>{u}</span></li>
                ))}
              </ul>
            </Inn>
          </div>
          <Inn i={2} className="min-w-0"><HeroScene eiendom={null} /></Inn>
        </div>
      </Side>

      {/* 3 · To selskaper, én plattform */}
      <Side id="selskaper" aktiv={side === 2} bred>
        <Inn i={0}><Etikett>Strukturen · to juridiske enheter, én plattform</Etikett></Inn>
        <Inn i={1}><h2 className="mt-5 max-w-[16ch] text-[40px] sm:text-[56px]" style={{ ...display, color: T.ink }}>Software skalerer. Forvaltning gir margin – og volum til softwaren.</h2></Inn>
        <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <Inn i={2} className="rounded-[22px] p-6 sm:p-7" style={{ background: '#FBFAF8', boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
            <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: '#7A3FA8' }}><span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: '#7A3FA8' }}>DT</span> Digihome Tech AS · programvaren</p>
            <p className="mt-3 text-[15.5px] leading-[1.5]" style={{ color: DIM }}>SaaS-plattformen. Én prisliste, tre kundegrupper – Digihome AS er én av dem.</p>
            <dl className="mt-5 border-t" style={{ borderColor: HAIR }}>
              <DlRad l="Huseiere · selvbetjent, hele Norge" v={prisHuseier || '—'} />
              <DlRad l="Eiendomsselskaper · per enhet" v={basisT ? `${kr(basisT.bedrift.pris)}/mnd` : '—'} />
              <DlRad l="Lisens til Digihome AS · per enhet" v={basisT ? `${kr(basisT.forvaltning.pris)}/mnd` : `${kr(basisF.systemPerEnhet)}/mnd`} />
              <DlRad l="Kostnadsbase" v="utvikling, hosting, support" />
            </dl>
          </Inn>
          <Inn i={3} className="flex items-center justify-center">
            {/* Lisensstrømmen: Digihome AS betaler Tech per enhet — elimineres i konsernet */}
            <div className="flex flex-col items-center gap-2 text-center lg:w-[150px]">
              <svg viewBox="0 0 120 40" className="hidden h-10 w-[120px] lg:block" aria-hidden><path d="M110 20 H10" fill="none" stroke="#7A3FA8" strokeWidth="2" className="deck-strom" strokeLinecap="round" /><path d="M18 12 L8 20 L18 28" fill="none" stroke="#7A3FA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <p className="text-[12.5px] font-medium" style={{ color: '#7A3FA8' }}>lisens {basisT ? kr(basisT.forvaltning.pris) : kr(basisF.systemPerEnhet)} per enhet/mnd</p>
              <p className="text-[11.5px]" style={{ color: SVAK }}>Tech-inntekt = Digihome AS-kostnad. Elimineres i konsernet.</p>
            </div>
          </Inn>
          <Inn i={4} className="rounded-[22px] p-6 sm:p-7" style={{ background: T.charcoal, color: T.offwhite }}>
            <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: LYS }}><span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: T.offwhite, color: T.ink }}>DH</span> Digihome AS · forvaltningen</p>
            <p className="mt-3 text-[15.5px] leading-[1.5]" style={{ color: LYS }}>En fast forvalter gjør jobben på plattformen. Eieren har siste ord. Bergen og 60 km rundt.</p>
            <dl className="mt-5 border-t" style={{ borderColor: LYS_HAIR }}>
              <DlRad morkt l="Honorar · av leien (inkl. mva)" v={pct(basisF.honorarPctNye, 1)} />
              <DlRad morkt l="Enheter per forvalter" v={nb(basisF.enheterPerAarsverk)} />
              <DlRad morkt l="Oppstartshonorar per enhet" v={kr(basisF.oppstartPerEnhet)} />
              <DlRad morkt l="Plattformlisens · kostnad per enhet" v={`${kr(basisF.systemPerEnhet)}/mnd`} />
            </dl>
          </Inn>
        </div>
        <Inn i={5}><p className="mt-8 max-w-[70ch] text-[14.5px] leading-[1.6]" style={{ color: DIM }}>Hver forvaltet enhet er samtidig en lisens på plattformen – forvaltningen er Techs største kunde i dag, og et salgsapparat for selvbetjening i morgen. På konsernnivå telles lisensen bare én gang.</p></Inn>
      </Side>

      {/* 4 · Hvor vi står */}
      <Side id="staar" aktiv={side === 3}>
        <Inn i={0}><Etikett>Hvor vi står · fakta fra plattformen</Etikett></Inn>
        <Inn i={1}><h2 className="mt-5 max-w-[16ch] text-[40px] sm:text-[56px]" style={{ ...display, color: T.ink }}>Vi starter ikke fra null.</h2></Inn>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Inn i={2}><Tall verdi={enheterIDag} format={(v) => nb(v)} /><p className="mt-3 text-[14.5px]" style={{ color: DIM }}>enheter under forvaltning – signerte leiekontrakter</p></Inn>
          <Inn i={3}><Tall verdi={honorarIDag * 12} /><p className="mt-3 text-[14.5px]" style={{ color: DIM }}>årlig honorarinntekt fra dagens portefølje (eks. mva)</p></Inn>
          <Inn i={4}><Tall verdi={plEnheterIDag} format={(v) => nb(v)} /><p className="mt-3 text-[14.5px]" style={{ color: DIM }}>selvbetjente enheter på plattformen{bedriftIDag ? ` · ${nb(bedriftIDag)} eiendomsselskaper` : ''}</p></Inn>
          <Inn i={5}><Tall verdi={enheterIDag * (basisT?.forvaltning?.pris || basisF.systemPerEnhet) * 12} /><p className="mt-3 text-[14.5px]" style={{ color: DIM }}>årlig lisensinntekt i Tech fra forvaltningen i dag</p></Inn>
        </div>
        <Inn i={6}><p className="mt-12 max-w-[64ch] text-[15.5px] leading-[1.6]" style={{ color: DIM }}>Tallene oppdateres fra signerte kontrakter når decket åpnes. Alt som følger er en plan bygget på disse – og på drivere du kan skru på selv.</p></Inn>
      </Side>

      {/* 5 · Unit economics (mørk) */}
      <Side id="unit" morkt aktiv={side === 4} bred>
        <Inn i={0}><Etikett farge={LYS_SVAK}>Unit economics · per enhet per måned · full CAC inkluderer performance-partner</Etikett></Inn>
        <Inn i={1}><h2 className="mt-5 max-w-[18ch] text-[40px] sm:text-[56px]" style={{ ...display, color: T.offwhite }}>Hver enhet betaler seg – i begge selskaper.</h2></Inn>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          <Inn i={2}>
            <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: LYS_SVAK }}><Home className="h-3.5 w-3.5" /> Tech · huseiere (selvbetjent)</p>
            {uT ? (
              <dl className="mt-4 border-t" style={{ borderColor: LYS_HAIR }}>
                <DlRad morkt l="ARPU (eks. mva)" v={kr(uT.huseier.arpu)} />
                <DlRad morkt l="Bidrag etter variable" v={`${kr(uT.huseier.bidrag)} · ${uT.huseier.bruttoMarginPct} %`} />
                <DlRad morkt l="CAC · media" v={kr(uT.huseier.cac)} />
                {uT.huseier.partner ? <DlRad morkt l={`+ partnerhonorar (${nb(paT.honorarPct, 0)} % · ${paT.varighetMnd || 'livstid'} mnd)`} v={kr(uT.huseier.partner)} /> : null}
                <DlRad morkt fet l="Payback (full CAC)" v={uT.huseier.paybackMnd ? `${nb(uT.huseier.paybackMnd, 1)} mnd` : '—'} />
                <DlRad morkt fet l="LTV / CAC" v={uT.huseier.ltvCac ? `${nb(uT.huseier.ltvCac, 1)}×` : '—'} />
              </dl>
            ) : <p className="mt-4 text-[14px]" style={{ color: LYS_SVAK }}>Tech-budsjettet er ikke delt ennå.</p>}
          </Inn>
          <Inn i={3}>
            <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: LYS_SVAK }}><Building2 className="h-3.5 w-3.5" /> Tech · eiendomsselskaper</p>
            {uT ? (
              <dl className="mt-4 border-t" style={{ borderColor: LYS_HAIR }}>
                <DlRad morkt l="Per selskap / mnd" v={`${kr(uT.bedrift.arpuSelskap)} · ${nb(basisT.bedrift.enheterPerSelskap)} enh`} />
                <DlRad morkt l="Bidrag / selskap" v={kr(uT.bedrift.bidragSelskap)} />
                <DlRad morkt l="CAC · salg" v={kr(uT.bedrift.cacSelskap)} />
                {uT.bedrift.partner ? <DlRad morkt l="+ partnerhonorar" v={kr(uT.bedrift.partner)} /> : null}
                <DlRad morkt fet l="Payback (full CAC)" v={uT.bedrift.paybackMnd ? `${nb(uT.bedrift.paybackMnd, 1)} mnd` : '—'} />
                <DlRad morkt fet l="LTV / CAC" v={uT.bedrift.ltvCac ? `${nb(uT.bedrift.ltvCac, 1)}×` : '—'} />
              </dl>
            ) : <p className="mt-4 text-[14px]" style={{ color: LYS_SVAK }}>Tech-budsjettet er ikke delt ennå.</p>}
          </Inn>
          <Inn i={4}>
            <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: LYS_SVAK }}><Link2 className="h-3.5 w-3.5" /> Digihome AS · forvaltet enhet</p>
            <dl className="mt-4 border-t" style={{ borderColor: LYS_HAIR }}>
              <DlRad morkt l="Honorar per enhet (eks. mva)" v={kr(uF.bruttoHonorarNy || 0)} />
              <DlRad morkt l="Bidrag før bemanning" v={kr(uF.bidrag || 0)} />
              <DlRad morkt l="CAC · salgsprovisjon" v={kr(uF.provisjon || 0)} />
              {uF.partnerPerEnhet ? <DlRad morkt l={`+ partnerhonorar (${nb(paF.honorarPct, 0)} % · ${paF.varighetMnd || 'livstid'} mnd)`} v={kr(uF.partnerPerEnhet)} /> : null}
              <DlRad morkt fet l="Payback (full CAC)" v={uF.paybackMnd ? `${nb(uF.paybackMnd, 1)} mnd` : '—'} />
              <DlRad morkt l="Enheter per forvalter" v={nb(basisF.enheterPerAarsverk)} />
            </dl>
          </Inn>
        </div>
      </Side>

      {/* 6 · Go-to-market */}
      <Side id="gtm" aktiv={side === 5} bred>
        <Inn i={0}><Etikett>Go-to-market · slik henter vi kundene</Etikett></Inn>
        <Inn i={1}><h2 className="mt-5 max-w-[16ch] text-[40px] sm:text-[56px]" style={{ ...display, color: T.ink }}>Betalt på resultat. Forvaltningen som kanal.</h2></Inn>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { ikon: Megaphone, t: 'Performance-partner', u: paT?.paa || paF?.paa ? `${nb((paT?.paa ? paT : paF).honorarPct, 0)} % av kundens inntekt de første ${(paT?.paa ? paT : paF).varighetMnd || '∞'} mnd + ${kr((paT?.paa ? paT : paF).fastPerMnd)} fast/mnd. Byrået tjener når vi tjener.` : 'Markedsføringsbyrå betalt på resultat – ikke aktivert i denne planen.', tall: (sF.sumPartner || 0) + smT.partner, aktiv: Boolean(paT?.paa || paF?.paa) },
            { ikon: Home, t: 'Egne annonser', u: basisT ? `${kr(basisT.huseier.annonsePerMnd)} per måned i fase 1 · ${kr(basisT.huseier.cacPerEnhet)} per aktivert enhet. Selvbetjening til huseiere i hele Norge.` : 'Betalt trafikk til selvbetjening.', tall: smT.annonser, aktiv: smT.annonser > 0 },
            { ikon: Building2, t: 'Salg til eiendomsselskaper', u: basisT ? `${nb(basisT.bedrift.nyeSelskaperPerMnd, 1)} nye selskaper/mnd fra måned ${basisT.bedrift.fraMnd} · ${nb(basisT.bedrift.enheterPerSelskap)} enheter per selskap.` : 'Direkte salg til profesjonelle utleiere.', tall: smT.salg, aktiv: smT.salg > 0 },
            { ikon: Link2, t: 'Forvaltningen', u: `${fakserie()}. Hver forvaltet enhet er en plattformlisens – og en kunde som allerede kjenner produktet.`, tall: sF.sumSm - (sF.sumPartner || 0), aktiv: true, under: 'salgsprovisjon + fast markedsføring' },
          ].map((kn, i) => (
            <Inn key={kn.t} i={2 + i} className="rounded-[20px] p-5" style={{ background: kn.aktiv ? '#FBFAF8' : 'transparent', boxShadow: `inset 0 0 0 1px ${HAIR}`, opacity: kn.aktiv ? 1 : 0.6 }}>
              <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: T.ink }}><kn.ikon className="h-4 w-4" style={{ color: '#7A3FA8' }} /> {kn.t}</p>
              <p className="mt-3 text-[13.5px] leading-[1.5]" style={{ color: DIM }}>{kn.u}</p>
              <p className="mt-4 whitespace-nowrap text-[24px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{mnok(kn.tall)}</p>
              <p className="mt-1 text-[11.5px]" style={{ color: SVAK }}>{kn.under || 'i perioden'}</p>
            </Inn>
          ))}
        </div>
        <Inn i={6} className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-[14px]" style={{ color: DIM }}>
          <span>S&M i perioden: <b style={{ color: T.ink }}>{mnok((sF.sumSm || 0) + (saT?.sumSm || 0))}</b></span>
          {sF.smAndelPct != null ? <span>Digihome AS: {sF.smAndelPct} % av inntekten</span> : null}
          {saT?.sm?.andelPct != null ? <span>Tech: {saT.sm.andelPct} % av inntekten</span> : null}
          {saT?.cacPaybackBlended != null ? <span>Blandet CAC-payback Tech: <b style={{ color: T.ink }}>{nb(saT.cacPaybackBlended, 1)} mnd</b></span> : null}
        </Inn>
      </Side>

      {/* 7 · Planen — Digihome AS (levende) */}
      <Side id="plan-dh" aktiv={side === 6} bred>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Inn i={0}><Etikett>Planen · Digihome AS · {N} måneder · {mndLabel(plan.startYm, 0, false)} – {mndLabel(plan.startYm, N - 1, false)}</Etikett></Inn>
            <Inn i={1}><h2 className="mt-4 max-w-[16ch] text-[36px] sm:text-[48px]" style={{ ...display, color: T.ink }}>Forvaltningen{preset !== 'plan' ? <span style={{ color: '#7A3FA8' }}> – med dine valg</span> : ''}.</h2></Inn>
          </div>
          <Inn i={2} className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px]" style={{ color: DIM }}>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.dh }} /> Kontraktsfestet</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: T.gronn, opacity: 0.6 }} /> Re-utleie</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.huseier }} /> Nye enheter</span>
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-4" style={{ background: FARGE.kost }} /> Kostnader</span>
          </Inn>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <Inn i={3}>
            <LagGraf N={N} startYm={plan.startYm} lag={[{ serie: mF.eksisterende, farge: FARGE.dh }, { serie: mF.reutleie || Array(N).fill(0), farge: T.gronn, opacity: 0.6 }, { serie: mF.vekst.map((v, i) => v + (mF.oppstart?.[i] || 0)), farge: FARGE.huseier }]} kost={mF.kostSum} beIdx={sF.breakEvenIdx} hoyde={smal ? 300 : 330} bredde={smal ? 560 : 1000} testid="deck-graf-dh" />
            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4" data-testid="deck-kpi-dh">
              <Nokkel label="Break-even" tekst={be(sF.breakEvenIdx)} delta={dMnd(sF.breakEvenIdx, sFb.breakEvenIdx)} />
              <Nokkel label="Kapitalbehov" tall={sF.kapitalbehov} delta={dMnok(sF.kapitalbehov, sFb.kapitalbehov)} />
              <Nokkel label="Enheter ved slutt" tall={mF.enheter[N - 1]} format={(v) => nb(v)} delta={delta(mF.enheter[N - 1], mFb.enheter[N - 1]) === null ? null : `${delta(mF.enheter[N - 1], mFb.enheter[N - 1]) > 0 ? '+' : ''}${nb(delta(mF.enheter[N - 1], mFb.enheter[N - 1]))}`} />
              <Nokkel label="Resultat i perioden" tall={sF.resultat} negativRod delta={dMnok(sF.resultat, sFb.resultat)} />
            </div>
          </Inn>
          <Inn i={4} className="deck-skjul-print rounded-[20px] p-5" style={{ background: T.flate }} data-testid="deck-drivere-dh">
            <p className="text-[13px] font-medium" style={{ color: T.ink }}>Skru på forvaltningen</p>
            <p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>Endringene lagres ikke – de er dine å utforske.</p>
            <div className="mt-2 divide-y" style={{ borderColor: HAIR }}>
              <Skru label="Veksttempo" verdi={fakt.forv} basis={1} min={0.25} max={3} steg={0.25} format={(v) => `${nb(v * 100)} %`} hint={fakserie()} onChange={(v) => skruTempo('forv', v)} onFerdig={skruFerdig('veksttempo forvaltning')} testid="deck-skru-nye" />
              <Skru label="Honorar" verdi={drivF.honorarPctNye} basis={basisF.honorarPctNye} min={4} max={15} steg={0.5} format={(v) => `${nb(v, 1)} %`} onChange={(v) => skruF('honorarPctNye', v)} onFerdig={skruFerdig('honorar')} />
              <Skru label="Enheter per forvalter" verdi={drivF.enheterPerAarsverk} basis={basisF.enheterPerAarsverk} min={40} max={250} steg={5} format={(v) => nb(v)} onChange={(v) => skruF('enheterPerAarsverk', v)} onFerdig={skruFerdig('enheter per forvalter')} />
              <Skru label="Churn per år" verdi={drivF.aarligChurnPct} basis={basisF.aarligChurnPct} min={0} max={40} steg={1} format={(v) => `${nb(v)} %`} onChange={(v) => skruF('aarligChurnPct', v)} onFerdig={skruFerdig('churn forvaltning')} />
            </div>
          </Inn>
        </div>
      </Side>

      {/* 8 · Planen — Digihome Tech AS (levende) */}
      <Side id="plan-tech" aktiv={side === 7} bred>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Inn i={0}><Etikett>Planen · Digihome Tech AS{techPlan ? ` · ${NT} måneder · ${mndLabel(techPlan.startYm, 0, false)} – ${mndLabel(techPlan.startYm, NT - 1, false)}` : ''}</Etikett></Inn>
            <Inn i={1}><h2 className="mt-4 max-w-[16ch] text-[36px] sm:text-[48px]" style={{ ...display, color: T.ink }}>Plattformen{preset !== 'plan' ? <span style={{ color: '#7A3FA8' }}> – med dine valg</span> : ''}.</h2></Inn>
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
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <Inn i={3}>
              <LagGraf N={NT} startYm={techPlan.startYm} lag={[{ serie: mT.inntekt.forvaltning, farge: FARGE.lisens }, { serie: mT.inntekt.huseier, farge: FARGE.huseier }, { serie: mT.inntekt.bedrift, farge: FARGE.bedrift }]} kost={mT.kostSum} beIdx={sT.breakEvenIdx} hoyde={smal ? 300 : 330} bredde={smal ? 560 : 1000} testid="deck-graf-tech" />
              <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4" data-testid="deck-kpi-tech">
                <Nokkel label="ARR ved slutt" tall={saT.arrExit} delta={dMnok(saT.arrExit, saTb.arrExit)} />
                <Nokkel label="Break-even" tekst={be(sT.breakEvenIdx, techPlan.startYm)} delta={dMnd(sT.breakEvenIdx, sTb.breakEvenIdx)} />
                <Nokkel label="Kapitalbehov" tall={sT.kapitalbehov} delta={dMnok(sT.kapitalbehov, sTb.kapitalbehov)} />
                <Nokkel label="Ekstern andel av inntekt" tekst={`${100 - (sT.andelForvaltningPct ?? 0)} %`} delta={delta(sT.andelForvaltningPct, sTb.andelForvaltningPct) === null ? null : `${-delta(sT.andelForvaltningPct, sTb.andelForvaltningPct) > 0 ? '+' : ''}${-delta(sT.andelForvaltningPct, sTb.andelForvaltningPct)} pp`} />
              </div>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px]" style={{ color: DIM }}>
                {saT.cmgrPct != null ? <span>MRR-vekst <b style={{ color: T.ink }}>{nb(saT.cmgrPct, 1)} %/mnd</b></span> : null}
                {saT.bruttoMarginPct != null ? <span>Bruttomargin <b style={{ color: T.ink }}>{saT.bruttoMarginPct} %</b></span> : null}
                {saT.burnMultiple != null ? <span>Burn multiple <b style={{ color: T.ink }}>{nb(saT.burnMultiple, 1)}×</b></span> : null}
                {saT.grrPct != null ? <span>Brutto retensjon <b style={{ color: T.ink }}>{saT.grrPct} %/år</b></span> : null}
              </div>
            </Inn>
            <Inn i={4} className="deck-skjul-print rounded-[20px] p-5" style={{ background: T.flate }} data-testid="deck-drivere-tech">
              <p className="text-[13px] font-medium" style={{ color: T.ink }}>Skru på plattformen</p>
              <p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>Endringene lagres ikke – de er dine å utforske.</p>
              <div className="mt-2 divide-y" style={{ borderColor: HAIR }}>
                <Skru label="Annonsekjøp" verdi={fakt.tech} basis={1} min={0} max={3} steg={0.25} format={(v) => `${nb(v * 100)} %`} hint={`${kr(drivT.huseier.annonsePerMnd)} per måned i fase 1`} onChange={(v) => skruTempo('tech', v)} onFerdig={skruFerdig('annonsekjøp')} testid="deck-skru-annonse" />
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

      {/* 9 · Konsern */}
      <Side id="konsern" aktiv={side === 8} bred>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Inn i={0}><Etikett>Konsern · Digihome AS + Digihome Tech AS · intern lisens eliminert</Etikett></Inn>
            <Inn i={1}><h2 className="mt-4 max-w-[16ch] text-[36px] sm:text-[48px]" style={{ ...display, color: T.ink }}>Samlet{preset !== 'plan' ? <span style={{ color: '#7A3FA8' }}> – med dine valg</span> : ''}.</h2></Inn>
          </div>
          <Inn i={2} className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px]" style={{ color: DIM }}>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.dh }} /> Digihome AS</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.tech }} /> Tech · ekstern inntekt</span>
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-4" style={{ background: FARGE.kost }} /> Kostnader</span>
          </Inn>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <Inn i={3}>
            <LagGraf N={N} startYm={plan.startYm} lag={[{ serie: k.digihome.inntekt, farge: FARGE.dh }, { serie: k.tech.inntekt.map((v, i) => Math.max(0, v - (k.lisens[i] || 0))), farge: FARGE.tech }]} kost={k.kost} beIdx={sK.breakEvenIdx} hoyde={smal ? 300 : 330} bredde={smal ? 560 : 1000} testid="deck-graf-konsern" />
            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4" data-testid="deck-kpi-konsern">
              <Nokkel label="Break-even konsern" tekst={be(sK.breakEvenIdx)} delta={dMnd(sK.breakEvenIdx, sKb.breakEvenIdx)} />
              <Nokkel label="Kapitalbehov konsern" tall={sK.kapitalbehov} delta={dMnok(sK.kapitalbehov, sKb.kapitalbehov)} />
              <Nokkel label="Omsetningstakt ved slutt" tall={sK.arrExit} delta={dMnok(sK.arrExit, sKb.arrExit)} />
              <Nokkel label="Resultat i perioden" tall={sK.resultat} negativRod delta={dMnok(sK.resultat, sKb.resultat)} />
            </div>
          </Inn>
          <Inn i={4} className="rounded-[20px] p-5" style={{ background: T.flate }} data-testid="deck-konsern-bro">
            <p className="text-[13px] font-medium" style={{ color: T.ink }}>Slik henger det sammen · perioden</p>
            <dl className="mt-2">
              <DlRad l="Inntekt Digihome AS" v={mnok(sum(k.digihome.inntekt))} />
              <DlRad l="Inntekt Tech" v={mnok(sum(k.tech.inntekt))} />
              <DlRad l="− intern lisens (eliminert)" v={`− ${mnok(sK.eliminert)}`} />
              <DlRad fet l="= Konserninntekt" v={mnok(sK.sumInntekt)} />
              <DlRad l="Kostnader (etter eliminering)" v={mnok(sK.sumKost)} />
              <DlRad fet l="Resultat" v={mnok(sK.resultat)} />
            </dl>
            <p className="mt-3 text-[12px] leading-[1.5]" style={{ color: SVAK }}>{sK.andelTechEksternPct != null ? `${sK.andelTechEksternPct} % av konserninntekten kommer fra eksterne plattformkunder ved slutten av perioden. ` : ''}Break-even per selskap: Digihome AS {be(k.digihome.breakEvenIdx)}, Tech {harTech ? be(k.tech.breakEvenIdx) : '—'}.</p>
          </Inn>
        </div>
      </Side>

      {/* 10 · Hva om */}
      <Side id="hvaom" aktiv={side === 9} bred>
        <Inn i={0}><Etikett>Spørsmål fra salen · ett trykk, ett svar – gjelder begge selskaper</Etikett></Inn>
        <Inn i={1}><h2 className="mt-4 max-w-[16ch] text-[36px] sm:text-[48px]" style={{ ...display, color: T.ink }}>Hva om?</h2></Inn>
        <Inn i={2} className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="deck-presets">
          {PRESETS.filter((p) => harTech || !p.kreverTech).map((p) => {
            const aktiv = preset === p.id;
            return (
              <button key={p.id} onClick={() => velgPreset(p)} className="rounded-[18px] p-4 text-left transition-[background-color,transform] duration-300 active:scale-[0.99]" style={{ background: aktiv ? T.ink : '#FBFAF8', color: aktiv ? T.offwhite : T.ink, boxShadow: aktiv ? 'none' : `inset 0 0 0 1px ${HAIR}` }} data-testid={`deck-preset-${p.id}`}>
                <p className="text-[16px] sm:text-[17px]" style={{ ...display, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{p.navn}</p>
                <p className="mt-2 text-[12px] leading-[1.45] sm:text-[12.5px]" style={{ color: aktiv ? 'rgba(244,241,234,0.7)' : DIM }}>{p.tekst}</p>
              </button>
            );
          })}
        </Inn>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
          <Inn i={3}><LagGraf N={N} startYm={plan.startYm} lag={[{ serie: k.digihome.inntekt, farge: FARGE.dh }, { serie: k.tech.inntekt.map((v, i) => Math.max(0, v - (k.lisens[i] || 0))), farge: FARGE.tech }]} kost={k.kost} beIdx={sK.breakEvenIdx} hoyde={smal ? 280 : 300} bredde={smal ? 560 : 1000} kompakt testid="deck-graf-hvaom" /></Inn>
          <Inn i={4} className="grid grid-cols-2 gap-5 lg:grid-cols-1">
            <div><Etikett>Break-even konsern</Etikett><p className="mt-1 whitespace-nowrap text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{be(sK.breakEvenIdx)}</p><p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>planen: {be(sKb.breakEvenIdx)}</p></div>
            <div><Etikett>Kapitalbehov konsern</Etikett><Tall verdi={sK.kapitalbehov} storrelse="text-[26px]" /><p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>planen: {mnok(sKb.kapitalbehov)}</p></div>
            <div><Etikett>Omsetningstakt ved slutt</Etikett><Tall verdi={sK.arrExit} storrelse="text-[26px]" /><p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>planen: {mnok(sKb.arrExit)}</p></div>
            {saT ? <div><Etikett>ARR Tech ved slutt</Etikett><Tall verdi={saT.arrExit} storrelse="text-[26px]" /><p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>planen: {mnok(saTb.arrExit)}</p></div> : null}
          </Inn>
        </div>
      </Side>

      {/* 11 · Det vi trenger (mørk) */}
      <Side id="trenger" morkt aktiv={side === 10} bred>
        <Inn i={0}><Etikett farge={LYS_SVAK}>Det vi trenger · avledet av planen {preset !== 'plan' ? '– med dine valg' : ''}</Etikett></Inn>
        <Inn i={1}><h2 className="mt-5 max-w-[18ch] text-[40px] sm:text-[56px]" style={{ ...display, color: T.offwhite }}>Kapital til break‑even – med margin.</h2></Inn>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          <Inn i={2}><Tall verdi={kapBuffer} farge={T.offwhite} /><p className="mt-3 text-[14.5px]" style={{ color: LYS }}>kapitalbehov konsern inkl. 20 % buffer – dypeste akkumulerte punkt er {mnok(sK.kapitalbehov)} ({sK.kapitalbehovIdx !== null ? mndLabel(plan.startYm, sK.kapitalbehovIdx, false) : '—'})</p></Inn>
          <Inn i={3}><p className="whitespace-nowrap text-[40px] lg:text-[52px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.offwhite }}>{be(sK.breakEvenIdx)}</p><p className="mt-3 text-[14.5px]" style={{ color: LYS }}>konsernet går i pluss – Digihome AS {be(k.digihome.breakEvenIdx)}, Tech {harTech ? be(k.tech.breakEvenIdx) : '—'}</p></Inn>
          <Inn i={4}><Tall verdi={sK.arrExit} farge={T.offwhite} /><p className="mt-3 text-[14.5px]" style={{ color: LYS }}>årlig omsetningstakt ved slutten av perioden{sK.andelTechEksternPct != null ? ` – ${sK.andelTechEksternPct} % fra eksterne plattformkunder` : ''}</p></Inn>
        </div>
        <Inn i={5}>
          <p className="mt-12 text-[13px] font-medium" style={{ color: LYS_SVAK }}>Pengene går til · sum over perioden</p>
          <dl className="mt-3 max-w-[760px] border-t" style={{ borderColor: LYS_HAIR }}>
            {bruk.map(([l, v, u]) => (
              <div key={l} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b py-3" style={{ borderColor: LYS_HAIR }}>
                <dt className="text-[14.5px]" style={{ color: LYS }}>{l} <span className="text-[12px]" style={{ color: LYS_SVAK }}>· {u}</span></dt>
                <dd className="whitespace-nowrap text-[15px] font-medium" style={{ color: T.offwhite }}>{mnok(v)} <span className="text-[12px]" style={{ color: LYS_SVAK }}>{brukSum > 0 ? `${Math.round((v / brukSum) * 100)} %` : ''}</span></dd>
              </div>
            ))}
          </dl>
        </Inn>
        {investor?.kanSporre ? (
          <Inn i={6}>
            <form onSubmit={spor} className="deck-skjul-print mt-12 max-w-[760px]" data-testid="deck-qa">
              <p className="text-[13px] font-medium" style={{ color: LYS_SVAK }}>Spør oss – svaret kommer i investorrommet</p>
              <div className="mt-3 flex gap-2">
                <input value={sporsmal} onChange={(e) => setSporsmal(e.target.value)} placeholder="Hva lurer du på?" className="h-12 flex-1 rounded-[12px] px-4 text-[15px] outline-none" style={{ background: 'rgba(244,241,234,0.08)', color: T.offwhite, boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.16)' }} />
                <button type="submit" className="flex h-12 items-center gap-2 rounded-[12px] px-4 text-[14px] font-medium" style={{ background: T.offwhite, color: T.ink }}>{spurt ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />} {spurt ? 'Sendt' : 'Send'}</button>
              </div>
            </form>
          </Inn>
        ) : null}
        <Inn i={7}><p className="mt-12 text-[12.5px]" style={{ color: 'rgba(244,241,234,0.45)' }}>Konfidensielt. Planen er en modell basert på oppgitte forutsetninger og faktiske kontrakter per {plan.oppdatertAt ? new Date(plan.oppdatertAt).toLocaleDateString('nb-NO') : 'i dag'}. Ikke et tilbud om tegning.</p></Inn>
      </Side>
    </div>
  );
}
