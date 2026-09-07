'use client';
/* ─────────────────────────────────────────────────────────────────────────────
   DeckLevende — DigiHomes investordeck med levende budsjett.

   · Én URL, to roller: investor (?t=lenke, ev. passord) eller presenter (admin-
     sesjon via ?key=). Samme sider, samme motor (lib/budsjett-modell.js) —
     36 måneder regnes i nettleseren på under ett millisekund.
   · 70 % fortelling, 30 % modell: Forside → Hvor vi står → To motorer →
     Planen (levende) → Hva om (kort) → Det vi trenger.
   · Grafen GLIR (tween på tallseriene) — den blinker aldri.
   · Investorens valg lagres aldri på planen; de logges som hendelser
     (åpnet, side, hva-om, driver, nedlasting) i investorrommets audit.
   · Kun transform/opacity i bevegelse. Print = PDF («Last ned»).
   ───────────────────────────────────────────────────────────────────────────── */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Download, Lock, RotateCcw, Send, Check } from 'lucide-react';
import { T, display, EASE, DIM, SVAK, HAIR } from '@/components/forside/v4/tokens';
import {
  beregnInvestorModell, beregnPlattform, beregnKonsern, rensModellDrivere, rensPlattformDrivere, skalerVekst,
} from '@/lib/budsjett-modell';

const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const ymPluss = (ym, i) => { const [y, m] = String(ym || '2026-01').split('-').map(Number); const t = y * 12 + (m - 1) + i; return [Math.floor(t / 12), (t % 12) + 1]; };
const mndLabel = (ym, i, kort = true) => { const [y, m] = ymPluss(ym, i); return kort ? `${MND[m - 1]} ${String(y).slice(2)}` : `${MND[m - 1]} ${y}`; };
const nb = (n, d = 0) => (Number(n) || 0).toLocaleString('nb-NO', { maximumFractionDigits: d, minimumFractionDigits: d });
const mnok = (n) => { const v = Number(n) || 0; return Math.abs(v) >= 1e6 ? `${nb(v / 1e6, 1)} MNOK` : `${nb(v / 1000)} k`; };
const kr = (n) => `${nb(n)} kr`;
const klem = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const utExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
/* Annonsebudsjettet skaleres i ALLE faser (som skalerVekst for forvaltningen) — «dobbel vekst»
   betyr dobbelt budsjett hele veien, ikke bare i fase 1. */
const skalerAnnonse = (d, f) => ({
  ...d,
  annonsePerMnd: Math.round((Number(d.annonsePerMnd) || 0) * f),
  vekstplan: (Array.isArray(d.vekstplan) ? d.vekstplan : []).map((x) => ({ ...x, annonsePerMnd: Math.round((Number(x.annonsePerMnd) || 0) * f) })),
});

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

/* ── Grafen: stablet inntekt (forvaltning + plattform), kostnadslinje, break-even ── */
function PlanGraf({ k, startYm, hoyde = 360, kompakt = false, bredde = 1000 }) {
  const innF = useTween(k.inntekt.forvaltning); const innP = useTween(k.inntekt.plattform); const kost = useTween(k.kost.total);
  const N = k.N; const W = bredde; const H = hoyde; const padL = 52; const padR = 12; const padT = 22; const padB = 30;
  const maks = Math.max(1, ...innF.map((v, i) => v + innP[i]), ...kost) * 1.1;
  const x = (i) => padL + ((W - padL - padR) * (i + 0.5)) / N;
  const y = (v) => padT + (H - padT - padB) * (1 - v / maks);
  const bw = Math.max(4, ((W - padL - padR) / N) * 0.6);
  const be = k.sammendrag.breakEvenIdx;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Inntekt per motor og kostnader per måned" data-testid="deck-graf">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={padL} x2={W - padR} y1={y(maks * f)} y2={y(maks * f)} stroke={HAIR} />
          <text x={padL - 8} y={y(maks * f) + 4} textAnchor="end" fontSize="11" fill={SVAK}>{maks * f >= 1e6 ? `${(maks * f / 1e6).toFixed(1)} M` : `${Math.round(maks * f / 1000)} k`}</text>
        </g>
      ))}
      {innF.map((f, i) => (
        <g key={i}>
          <rect x={x(i) - bw / 2} y={y(f)} width={bw} height={Math.max(0, y(0) - y(f))} fill={T.ink} rx="2" />
          <rect x={x(i) - bw / 2} y={y(f + innP[i])} width={bw} height={Math.max(0, y(f) - y(f + innP[i]))} fill={T.lilla} rx="2" />
        </g>
      ))}
      <polyline fill="none" stroke="#B3261E" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" points={kost.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      {be !== null && be !== undefined ? (
        <g style={{ transition: `transform 650ms ${EASE}` }}>
          <line x1={x(be)} x2={x(be)} y1={padT - 4} y2={H - padB} stroke={T.gronn} strokeDasharray="3 5" strokeWidth="1.5" />
          <text x={x(be) > W - 170 ? x(be) - 8 : x(be) + 8} y={padT + 6} textAnchor={x(be) > W - 170 ? 'end' : 'start'} fontSize="12" fill={T.gronn} fontWeight="600">Break-even · {mndLabel(startYm, be)}</text>
        </g>
      ) : null}
      {Array.from({ length: N }, (_, i) => i).filter((i) => i % (kompakt || W < 700 ? 6 : 3) === 0).map((i) => (
        <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill={SVAK}>{mndLabel(startYm, i)}</text>
      ))}
    </svg>
  );
}

function Tall({ verdi, format = mnok, storrelse = 'text-[40px] lg:text-[52px]', farge = T.ink, testid }) {
  const v = useTween(Number(verdi) || 0, 600);
  // «2,6 MNOK» → tallet stort, enheten mindre og roligere.
  const str = format(v); const i = str.lastIndexOf(' ');
  const tall = i > 0 ? str.slice(0, i) : str; const enhet = i > 0 ? str.slice(i + 1) : '';
  return (
    <p className={storrelse} style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: farge }} data-testid={testid}>
      {tall}{enhet ? <span className="ml-[0.18em] text-[0.42em]" style={{ letterSpacing: '-0.01em', opacity: 0.72 }}>{enhet}</span> : null}
    </p>
  );
}

function Etikett({ children, farge = SVAK }) { return <p className="text-[13px] font-medium" style={{ color: farge }}>{children}</p>; }

/* Én side = én skjermhøyde. Ligger UTENFOR DeckLevende: definert inne i render ville React sett en
   ny komponenttype for hver tween-frame og remontert hele decket 60 ganger i sekundet. */
function Side({ id, children, morkt = false, testid }) {
  return (
    <section id={`deck-${id}`} className="deck-side relative flex min-h-[100svh] snap-start flex-col justify-center px-6 py-16 sm:px-10 lg:px-16" style={{ background: morkt ? T.charcoal : T.canvas, color: morkt ? T.offwhite : T.ink }} data-testid={testid || `deck-${id}`}>
      <div className="mx-auto w-full max-w-[1180px]">{children}</div>
    </section>
  );
}

/* ── Skruknapp: label, verdi, slider ── */
function Skru({ label, verdi, min, max, steg, format, onChange, onFerdig, basis, hint, testid }) {
  const endret = basis !== undefined && Math.abs(Number(verdi) - Number(basis)) > 1e-9;
  return (
    <label className="block py-2.5" data-testid={testid}>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[13.5px]" style={{ color: DIM }}>{label}</span>
        <span className="text-[14px] font-medium" style={{ color: endret ? '#7A3FA8' : T.ink }}>{format(verdi)}{endret ? <span className="ml-1.5 text-[11.5px]" style={{ color: SVAK }}>plan {format(basis)}</span> : null}</span>
      </span>
      {hint ? <span className="mt-0.5 block text-[11.5px]" style={{ color: SVAK }}>{hint}</span> : null}
      <input type="range" min={min} max={max} step={steg} value={verdi} onChange={(e) => onChange(Number(e.target.value))} onPointerUp={onFerdig} className="dh-slider mt-2 w-full" />
    </label>
  );
}

/* ── Preset-kort («hva om») — fakt = veksttempo per motor (skalerer ALLE faser), over(bF, bP) = absolutte
      overstyringer regnet fra planens egne drivere. Nøklene er modellens (lib/budsjett-modell.js). ── */
const PRESETS = [
  { id: 'plan', navn: 'Planen', tekst: 'Slik den er lagt.', fakt: { forv: 1, pl: 1 }, over: () => ({}) },
  { id: 'halv', navn: 'Halv vekst', tekst: 'Begge motorer vokser halvparten så fort.', fakt: { forv: 0.5, pl: 0.5 }, over: (bF, bP) => ({ pl: bP ? { organiskPerMnd: bP.organiskPerMnd * 0.5 } : {} }) },
  { id: 'dobbel', navn: 'Dobbel vekst', tekst: 'Vi trykker på gassen i begge motorer.', fakt: { forv: 2, pl: 2 }, over: () => ({}) },
  { id: 'cac', navn: 'Dobbel CAC', tekst: 'Kundene blir dyrere å hente – hver ny enhet koster det dobbelte.', fakt: { forv: 1, pl: 1 }, over: (bF, bP) => ({ forv: { provisjonPerNyEnhet: bF.provisjonPerNyEnhet * 2 }, pl: bP ? { cacPerEnhet: bP.cacPerEnhet * 2 } : {} }) },
  { id: 'churn', navn: 'Lav churn', tekst: 'Vi holder på kundene bedre – 10 % årlig frafall i begge motorer.', fakt: { forv: 1, pl: 1 }, over: (bF, bP) => ({ forv: { aarligChurnPct: Math.min(bF.aarligChurnPct, 10) }, pl: bP ? { aarligChurnPct: Math.min(bP.aarligChurnPct, 10) } : {} }) },
  { id: 'organisk', navn: 'Uten annonser', tekst: 'Plattformen vokser bare organisk.', kreverPlattform: true, fakt: { forv: 1, pl: 0 }, over: () => ({}) },
];

export default function DeckLevende({ token = '', adminKey = '', planId = '' }) {
  const [data, setData] = useState(null);
  const [feil, setFeil] = useState('');
  const [trengerPin, setTrengerPin] = useState(null);
  const [pin, setPin] = useState(''); const [pinFeil, setPinFeil] = useState('');
  const [over, setOver] = useState({ forv: {}, pl: {} });
  const [fakt, setFakt] = useState({ forv: 1, pl: 1 });
  const [preset, setPreset] = useState('plan');
  const [side, setSide] = useState(0);
  const [sporsmal, setSporsmal] = useState(''); const [spurt, setSpurt] = useState(false);
  const [musAktiv, setMusAktiv] = useState(true);
  const [smal, setSmal] = useState(false);
  const rotRef = useRef(null); const musTimer = useRef(0); const setteSider = useRef(new Set()); const aapnetLogget = useRef(false);
  useEffect(() => {
    // Smal skjerm → grafen tegnes i et smalere koordinatsystem (høyere, større tekst) — ingen skalering av bilde.
    const mq = window.matchMedia('(max-width: 640px)');
    const oppd = () => setSmal(mq.matches);
    oppd(); mq.addEventListener('change', oppd);
    return () => mq.removeEventListener('change', oppd);
  }, []);

  const qs = useMemo(() => { const p = new URLSearchParams(); if (token) p.set('t', token); if (adminKey) p.set('key', adminKey); if (planId) p.set('plan', planId); return p.toString(); }, [token, adminKey, planId]);
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

  /* ── Modell: planens drivere → veksttempo (alle faser) → investorens overstyringer ── */
  const plan = data?.plan;
  const N = plan ? Math.min(36, Math.max(1, Number(plan.antallMnd) || 12)) : 12;
  const basisF = useMemo(() => (plan ? rensModellDrivere(plan.drivere || {}) : null), [plan]);
  const basisP = useMemo(() => (plan?.plattform ? rensPlattformDrivere(plan.plattform) : null), [plan]);
  const harPlattform = !!basisP;
  const drivF = useMemo(() => (basisF ? { ...skalerVekst(basisF, fakt.forv), ...over.forv } : null), [basisF, fakt.forv, over.forv]);
  const drivP = useMemo(() => (basisP ? { ...skalerAnnonse(basisP, fakt.pl), ...over.pl } : null), [basisP, fakt.pl, over.pl]);
  const mF = useMemo(() => (plan && drivF ? beregnInvestorModell({ antallMnd: N, fakta: plan.fakta || {}, drivere: drivF, startYm: plan.startYm }) : null), [plan, drivF, N]);
  const tomP = useMemo(() => ({ N, inntekt: Array(N).fill(0), kostSum: Array(N).fill(0), enheter: Array(N).fill(0), kost: {}, unit: {}, sammendrag: {} }), [N]);
  const mP = useMemo(() => (drivP ? beregnPlattform({ antallMnd: N, drivere: drivP }) : tomP), [drivP, N, tomP]);
  const felles = useMemo(() => plan?.felles || (harPlattform ? {} : { regnskap: 0, programvare: 0, merkevare: 0 }), [plan, harPlattform]);
  const k = useMemo(() => (mF ? beregnKonsern({ forvaltning: mF, plattform: mP, felles, antallMnd: N }) : null), [mF, mP, felles, N]);
  const kBasis = useMemo(() => {
    if (!plan || !basisF) return null;
    const f = beregnInvestorModell({ antallMnd: N, fakta: plan.fakta || {}, drivere: basisF, startYm: plan.startYm });
    const p = basisP ? beregnPlattform({ antallMnd: N, drivere: basisP }) : tomP;
    return beregnKonsern({ forvaltning: f, plattform: p, felles, antallMnd: N });
  }, [plan, basisF, basisP, N, tomP, felles]);

  const velgPreset = (p) => {
    if (!basisF) return;
    setPreset(p.id);
    setFakt({ forv: p.fakt?.forv ?? 1, pl: p.fakt?.pl ?? 1 });
    const o = p.over(basisF, basisP) || {};
    setOver({ forv: o.forv || {}, pl: o.pl || {} });
    hendelse({ type: 'deck_hvaom', valg: p.navn });
  };
  const skru = (seg, key, v) => { setPreset('egen'); setOver((c) => ({ ...c, [seg]: { ...c[seg], [key]: v } })); };
  const skruTempo = (seg, v) => { setPreset('egen'); setFakt((c) => ({ ...c, [seg]: v })); };
  const skruFerdig = (label) => () => hendelse({ type: 'deck_driver', valg: label });
  const nullstill = () => { setPreset('plan'); setFakt({ forv: 1, pl: 1 }); setOver({ forv: {}, pl: {} }); };

  /* ── Navigasjon: scroll-snap + tastatur; mus skjules i ro ── */
  const sider = ['forside', 'staar', 'motorer', 'planen', 'hvaom', 'trenger'];
  const gaaTil = useCallback((i) => { const el = document.getElementById(`deck-${sider[klem(i, 0, sider.length - 1)]}`); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const tast = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); gaaTil(side + 1); }
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); gaaTil(side - 1); }
      if (e.key === 'Home') gaaTil(0); if (e.key === 'End') gaaTil(sider.length - 1);
    };
    window.addEventListener('keydown', tast); return () => window.removeEventListener('keydown', tast);
  }, [side, gaaTil]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!data) return undefined;
    const els = sider.map((s) => document.getElementById(`deck-${s}`)).filter(Boolean);
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting && en.intersectionRatio > 0.55) { const i = sider.indexOf(en.target.id.replace('deck-', '')); setSide(i); if (!setteSider.current.has(sider[i])) { setteSider.current.add(sider[i]); hendelse({ type: 'deck_side', side: sider[i] }); } } });
    }, { root: rotRef.current, threshold: [0.55] });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [data, hendelse]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Markøren skjules i ro KUN i presenter-modus (på storskjerm) — en investor som leser skal aldri miste den.
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
          {pinFeil ? <p className="mt-2 text-[13px]" style={{ color: '#B3261E' }} data-testid="deck-pin-feil">{pinFeil}</p> : null}
          <button type="submit" className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-medium" style={{ background: T.ink, color: T.offwhite }} data-testid="deck-pin-send">Åpne decket <ArrowRight className="h-4 w-4" strokeWidth={1.8} /></button>
        </form>
      </div>
    );
  }
  if (feil) return <div className="flex min-h-[100svh] items-center justify-center px-6" style={{ background: T.canvas, color: T.ink }}><div className="max-w-[420px] text-center"><h1 className="text-[32px]" style={display}>Kunne ikke åpne decket</h1><p className="mt-3 text-[15px]" style={{ color: DIM }}>{feil}</p></div></div>;
  if (!data || !k || !mF) return <div className="min-h-[100svh]" style={{ background: T.canvas }} />;

  const s = k.sammendrag; const sb = kBasis?.sammendrag || s;
  const fakta = plan.fakta || {};
  const enheterIDag = Array.isArray(fakta.enheter) ? (fakta.enheter[0] || 0) : 0;
  const honorarIDag = Array.isArray(fakta.eksisterende) ? (fakta.eksisterende[0] || 0) : 0;
  const plEnheterIDag = basisP?.startEnheter || 0;
  const be = (idx) => (idx === null || idx === undefined ? 'utenfor perioden' : mndLabel(plan.startYm, idx, false));
  const delta = (a, b) => { const d = (Number(a) || 0) - (Number(b) || 0); return d === 0 ? null : d; };
  const investor = data.investor;
  const kapBuffer = Math.round((s.kapitalbehov || 0) * 1.2 / 100000) * 100000;
  const sumAnnonse = mP.kost?.markedsforing ? mP.kost.markedsforing.reduce((a, b) => a + b, 0) : 0;
  const sumUtvikling = mP.kost?.utvikling ? mP.kost.utvikling.reduce((a, b) => a + b, 0) : 0;
  const sumLonn = mF.kost?.bemanning ? mF.kost.bemanning.reduce((a, b) => a + b, 0) : 0;
  const morkSide = sider[side] === 'motorer' || sider[side] === 'trenger';
  const fakserie = () => { const s0 = mF.nyePerMndSerie || []; if (!s0.length) return ''; const lo = Math.min(...s0); const hi = Math.max(...s0); return lo === hi ? `${nb(lo, 1)} nye enheter/mnd` : `${nb(lo, 1)}–${nb(hi, 1)} nye enheter/mnd gjennom perioden`; };

  return (
    <div ref={rotRef} className="deck-rot h-[100svh] snap-y snap-proximity overflow-y-auto scroll-smooth md:snap-mandatory" style={{ background: T.canvas, cursor: musAktiv ? 'auto' : 'none' }} data-testid="deck">
      <style>{`
        .dh-slider { -webkit-appearance: none; appearance: none; height: 2px; background: rgba(21,19,15,0.14); border-radius: 2px; outline: none; }
        .dh-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: ${T.ink}; border: 3px solid ${T.offwhite}; box-shadow: 0 0 0 1px rgba(21,19,15,0.2); cursor: pointer; }
        .dh-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: ${T.ink}; border: 3px solid ${T.offwhite}; cursor: pointer; }
        @media print { .deck-rot { height: auto !important; overflow: visible !important; } .deck-side { min-height: auto !important; page-break-after: always; padding: 32px !important; } .deck-skjul-print { display: none !important; } }
      `}</style>

      {/* Toppstripe: fremdrift + handlinger — følger sidens lys/mørke; skjules ved ro i presenter */}
      <div className="deck-skjul-print pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8" style={{ opacity: musAktiv || side === 0 ? 1 : 0, transition: `opacity 500ms ${EASE}` }}>
        <div className="pointer-events-auto flex items-center gap-1.5">
          {sider.map((sd, i) => <button key={sd} onClick={() => gaaTil(i)} aria-label={`Side ${i + 1}`} className="h-1.5 rounded-full transition-all duration-500" style={{ width: side === i ? 28 : 10, background: side === i ? (morkSide ? T.offwhite : T.ink) : (morkSide ? 'rgba(244,241,234,0.28)' : 'rgba(21,19,15,0.2)') }} />)}
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {data.presenter && data.planer?.length > 1 ? (
            <select value={plan.id} onChange={(e) => { const u = new URL(window.location.href); u.searchParams.set('plan', e.target.value); window.location.href = u.toString(); }} className="hidden h-9 max-w-[220px] rounded-full px-3 text-[12.5px] transition-colors duration-500 sm:block" style={{ background: morkSide ? 'rgba(244,241,234,0.1)' : 'rgba(21,19,15,0.06)', color: morkSide ? T.offwhite : T.ink }} data-testid="deck-planvalg">
              {data.planer.map((p) => <option key={p.id} value={p.id} style={{ color: T.ink }}>{p.navn}{p.investorSynlig ? '' : ' (ikke delt)'}</option>)}
            </select>
          ) : null}
          {preset !== 'plan' ? <button onClick={nullstill} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium" style={{ background: morkSide ? 'rgba(212,150,255,0.18)' : 'rgba(122,63,168,0.12)', color: morkSide ? T.lilla : '#7A3FA8' }} data-testid="deck-nullstill"><RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tilbake til planen</span><span className="sm:hidden">Planen</span></button> : null}
          <button onClick={lastNed} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors duration-500" style={{ background: morkSide ? 'rgba(244,241,234,0.1)' : 'rgba(21,19,15,0.06)', color: morkSide ? T.offwhite : T.ink }} data-testid="deck-lastned"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">PDF</span></button>
        </div>
      </div>

      {/* 1 · Forside */}
      <Side id="forside">
        <Etikett>{investor ? `Utarbeidet for ${investor.label}` : data.presenter ? 'Presenter' : 'Konfidensielt'} · {plan.navn} · {new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</Etikett>
        <h1 className="mt-8 max-w-[14ch] text-[56px] sm:text-[80px] lg:text-[112px]" style={{ ...display, color: T.ink }}>To motorer. Én plattform<span style={{ color: T.lilla }}>.</span></h1>
        <p className="mt-8 max-w-[52ch] text-[18px] leading-[1.5] sm:text-[21px]" style={{ color: DIM }}>DigiHome er programvaren som lar boligeiere leie ut selv – og forvaltningsselskapet som gjør jobben for dem som ikke vil. Samme plattform, to inntektsmotorer. Dette er planen for de neste {N} månedene – levende, ikke låst.</p>
        <button onClick={() => gaaTil(1)} className="deck-skjul-print mt-12 flex items-center gap-2 text-[14px] font-medium" style={{ color: T.ink }}>Bla nedover <ArrowDown className="h-4 w-4 animate-bounce" strokeWidth={1.8} /></button>
      </Side>

      {/* 2 · Hvor vi står */}
      <Side id="staar">
        <Etikett>Hvor vi står · fakta fra plattformen</Etikett>
        <h2 className="mt-5 max-w-[16ch] text-[40px] sm:text-[56px]" style={{ ...display, color: T.ink }}>Vi starter ikke fra null.</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          <div><Tall verdi={enheterIDag} format={(v) => nb(v)} /><p className="mt-3 text-[14.5px]" style={{ color: DIM }}>enheter under forvaltning i dag – signerte leiekontrakter</p></div>
          <div><Tall verdi={honorarIDag * 12} /><p className="mt-3 text-[14.5px]" style={{ color: DIM }}>årlig honorarinntekt fra dagens portefølje (eks. mva)</p></div>
          <div><Tall verdi={plEnheterIDag} format={(v) => nb(v)} /><p className="mt-3 text-[14.5px]" style={{ color: DIM }}>selvbetjente enheter på plattformen</p></div>
        </div>
        <p className="mt-12 max-w-[60ch] text-[15.5px] leading-[1.6]" style={{ color: DIM }}>Tallene over oppdateres fra signerte kontrakter når decket åpnes. Alt som følger er en plan bygget på disse – og på drivere du kan skru på selv.</p>
      </Side>

      {/* 3 · To motorer */}
      <Side id="motorer" morkt>
        <Etikett farge="rgba(244,241,234,0.6)">To motorer · unit economics per enhet per måned</Etikett>
        <h2 className="mt-5 max-w-[18ch] text-[40px] sm:text-[56px]" style={{ ...display, color: T.offwhite }}>Software skalerer. Mennesker gir margin.</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'rgba(244,241,234,0.6)' }}>Plattformen · selvbetjent · hele Norge</p>
            <p className="mt-3 text-[15.5px] leading-[1.55]" style={{ color: 'rgba(244,241,234,0.78)' }}>Eieren leier ut selv. Systemet tar annonse, kontrakt, husleie og purring. {harPlattform ? `${nb(basisP.satsPct, 1)} % av leien.` : 'Ikke modellert i denne planen.'}</p>
            {harPlattform ? (
              <dl className="mt-6 border-t" style={{ borderColor: 'rgba(244,241,234,0.14)' }}>
                {[['ARPU (eks. mva)', kr(mP.unit.arpu)], ['Bidrag etter variable kostnader', `${kr(mP.unit.bidrag)} · ${mP.unit.bruttoMarginPct} %`], ['CAC per aktivert enhet', kr(mP.unit.cac)], ['Payback', mP.unit.paybackMnd ? `${nb(mP.unit.paybackMnd, 1)} mnd` : '—'], ['LTV / CAC', mP.unit.ltvCac ? `${nb(mP.unit.ltvCac, 1)}×` : '—']].map(([l, v]) => (
                  <div key={l} className="flex items-baseline justify-between gap-4 border-b py-3" style={{ borderColor: 'rgba(244,241,234,0.14)' }}><dt className="text-[14px]" style={{ color: 'rgba(244,241,234,0.65)' }}>{l}</dt><dd className="text-[15px] font-medium" style={{ color: T.offwhite }}>{v}</dd></div>
                ))}
              </dl>
            ) : null}
          </div>
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'rgba(244,241,234,0.6)' }}>Forvaltning · fast forvalter · Bergen og omegn</p>
            <p className="mt-3 text-[15.5px] leading-[1.55]" style={{ color: 'rgba(244,241,234,0.78)' }}>En forvalter gjør jobben, eieren har siste ord. {nb(basisF.honorarPctNye, 1)} % av leien, {basisF.enheterPerAarsverk} enheter per forvalter.</p>
            <dl className="mt-6 border-t" style={{ borderColor: 'rgba(244,241,234,0.14)' }}>
              {[['Honorar per enhet (eks. mva)', kr(mF.cac?.bruttoHonorarNy || 0)], ['Bidrag før bemanning', kr(mF.cac?.bidrag || 0)], ['CAC (provisjon per ny enhet)', kr(mF.cac?.provisjon || 0)], ['Payback', mF.cac?.paybackMnd ? `${nb(mF.cac.paybackMnd, 1)} mnd` : '—'], ['Enheter per årsverk', `${basisF.enheterPerAarsverk}`]].map(([l, v]) => (
                <div key={l} className="flex items-baseline justify-between gap-4 border-b py-3" style={{ borderColor: 'rgba(244,241,234,0.14)' }}><dt className="text-[14px]" style={{ color: 'rgba(244,241,234,0.65)' }}>{l}</dt><dd className="text-[15px] font-medium" style={{ color: T.offwhite }}>{v}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </Side>

      {/* 4 · Planen (levende) */}
      <Side id="planen">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Etikett>Planen · {N} måneder · {mndLabel(plan.startYm, 0, false)} – {mndLabel(plan.startYm, N - 1, false)}</Etikett>
            <h2 className="mt-4 max-w-[16ch] text-[36px] sm:text-[48px]" style={{ ...display, color: T.ink }}>Slik ser det ut{preset !== 'plan' ? <span style={{ color: '#7A3FA8' }}> – med dine valg</span> : ''}.</h2>
          </div>
          <div className="flex items-center gap-5 text-[12.5px]" style={{ color: DIM }}>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: T.ink }} /> Forvaltning</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: T.lilla }} /> Plattform</span>
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-4" style={{ background: '#B3261E' }} /> Kostnader inkl. felles</span>
          </div>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <PlanGraf k={k} startYm={plan.startYm} hoyde={smal ? 300 : 340} bredde={smal ? 560 : 1000} />
            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4" data-testid="deck-kpi">
              {[
                ['Break-even', be(s.breakEvenIdx), delta(s.breakEvenIdx, sb.breakEvenIdx) === null ? null : `${delta(s.breakEvenIdx, sb.breakEvenIdx) > 0 ? '+' : ''}${delta(s.breakEvenIdx, sb.breakEvenIdx)} mnd`, null],
                ['Kapitalbehov', null, delta(s.kapitalbehov, sb.kapitalbehov) === null ? null : `${delta(s.kapitalbehov, sb.kapitalbehov) > 0 ? '+' : '−'}${mnok(Math.abs(delta(s.kapitalbehov, sb.kapitalbehov)))}`, s.kapitalbehov],
                ['ARR ved slutt', null, delta(s.arrExit, sb.arrExit) === null ? null : `${delta(s.arrExit, sb.arrExit) > 0 ? '+' : '−'}${mnok(Math.abs(delta(s.arrExit, sb.arrExit)))}`, s.arrExit],
                ['Resultat i perioden', null, delta(s.resultat, sb.resultat) === null ? null : `${delta(s.resultat, sb.resultat) > 0 ? '+' : '−'}${mnok(Math.abs(delta(s.resultat, sb.resultat)))}`, s.resultat],
              ].map(([l, tekst, d, tall]) => (
                <div key={l}>
                  <Etikett>{l}</Etikett>
                  {tall !== null ? <Tall verdi={tall} storrelse="text-[28px] lg:text-[34px]" farge={l === 'Resultat i perioden' && tall < 0 ? '#B3261E' : T.ink} /> : <p className="text-[28px] lg:text-[34px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.ink }}>{tekst}</p>}
                  <p className="mt-1.5 text-[12.5px]" style={{ color: d ? '#7A3FA8' : SVAK }}>{d ? `${d} mot planen` : 'som planlagt'}</p>
                </div>
              ))}
            </div>
          </div>
          <aside className="deck-skjul-print rounded-[20px] p-5" style={{ background: T.flate }} data-testid="deck-drivere">
            <p className="text-[13px] font-medium" style={{ color: T.ink }}>Skru på planen</p>
            <p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>Endringene lagres ikke – de er dine å utforske.</p>
            <div className="mt-2 divide-y" style={{ borderColor: HAIR }}>
              <Skru label="Veksttempo forvaltning" verdi={fakt.forv} basis={1} min={0.25} max={3} steg={0.25} format={(v) => `${nb(v * 100)} %`} hint={fakserie()} onChange={(v) => skruTempo('forv', v)} onFerdig={skruFerdig('veksttempo forvaltning')} testid="deck-skru-nye" />
              <Skru label="Honorar forvaltning" verdi={drivF.honorarPctNye} basis={basisF.honorarPctNye} min={4} max={15} steg={0.5} format={(v) => `${nb(v, 1)} %`} onChange={(v) => skru('forv', 'honorarPctNye', v)} onFerdig={skruFerdig('honorar')} />
              <Skru label="Enheter per forvalter" verdi={drivF.enheterPerAarsverk} basis={basisF.enheterPerAarsverk} min={40} max={250} steg={5} format={(v) => nb(v)} onChange={(v) => skru('forv', 'enheterPerAarsverk', v)} onFerdig={skruFerdig('enheter per forvalter')} />
              <Skru label="Churn forvaltning / år" verdi={drivF.aarligChurnPct} basis={basisF.aarligChurnPct} min={0} max={40} steg={1} format={(v) => `${nb(v)} %`} onChange={(v) => skru('forv', 'aarligChurnPct', v)} onFerdig={skruFerdig('churn forvaltning')} />
              {harPlattform ? (
                <>
                  <Skru label="Annonsebudsjett plattform" verdi={fakt.pl} basis={1} min={0} max={3} steg={0.25} format={(v) => `${nb(v * 100)} %`} hint={`${kr(drivP.annonsePerMnd)} per måned i fase 1`} onChange={(v) => skruTempo('pl', v)} onFerdig={skruFerdig('annonsebudsjett')} />
                  <Skru label="CAC per aktivert enhet" verdi={drivP.cacPerEnhet} basis={basisP.cacPerEnhet} min={500} max={Math.max(10000, basisP.cacPerEnhet * 3)} steg={250} format={(v) => kr(v)} onChange={(v) => skru('pl', 'cacPerEnhet', v)} onFerdig={skruFerdig('cac plattform')} />
                  <Skru label="Churn plattform / år" verdi={drivP.aarligChurnPct} basis={basisP.aarligChurnPct} min={5} max={50} steg={1} format={(v) => `${nb(v)} %`} onChange={(v) => skru('pl', 'aarligChurnPct', v)} onFerdig={skruFerdig('churn plattform')} />
                </>
              ) : null}
            </div>
          </aside>
        </div>
      </Side>

      {/* 5 · Hva om */}
      <Side id="hvaom">
        <Etikett>Spørsmål fra salen · ett trykk, ett svar</Etikett>
        <h2 className="mt-4 max-w-[16ch] text-[36px] sm:text-[48px]" style={{ ...display, color: T.ink }}>Hva om?</h2>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="deck-presets">
          {PRESETS.filter((p) => harPlattform || !p.kreverPlattform).map((p) => {
            const aktiv = preset === p.id;
            return (
              <button key={p.id} onClick={() => velgPreset(p)} className="rounded-[18px] p-4 text-left transition-[background-color,transform] duration-300 active:scale-[0.99] sm:p-5" style={{ background: aktiv ? T.ink : '#FBFAF8', color: aktiv ? T.offwhite : T.ink, boxShadow: aktiv ? 'none' : `inset 0 0 0 1px ${HAIR}` }} data-testid={`deck-preset-${p.id}`}>
                <p className="text-[16px] sm:text-[18px]" style={{ ...display, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{p.navn}</p>
                <p className="mt-2 text-[12.5px] leading-[1.45] sm:text-[13.5px]" style={{ color: aktiv ? 'rgba(244,241,234,0.7)' : DIM }}>{p.tekst}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
          <PlanGraf k={k} startYm={plan.startYm} hoyde={smal ? 280 : 300} bredde={smal ? 560 : 1000} kompakt />
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-1">
            <div><Etikett>Break-even</Etikett><p className="mt-1 text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{be(s.breakEvenIdx)}</p><p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>planen: {be(sb.breakEvenIdx)}</p></div>
            <div><Etikett>Kapitalbehov</Etikett><Tall verdi={s.kapitalbehov} storrelse="text-[26px]" /><p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>planen: {mnok(sb.kapitalbehov)}</p></div>
            <div><Etikett>ARR ved slutt</Etikett><Tall verdi={s.arrExit} storrelse="text-[26px]" /><p className="mt-1 text-[12.5px]" style={{ color: SVAK }}>planen: {mnok(sb.arrExit)}</p></div>
          </div>
        </div>
      </Side>

      {/* 6 · Det vi trenger */}
      <Side id="trenger" morkt>
        <Etikett farge="rgba(244,241,234,0.6)">Det vi trenger · avledet av planen {preset !== 'plan' ? '– med dine valg' : ''}</Etikett>
        <h2 className="mt-5 max-w-[18ch] text-[40px] sm:text-[56px]" style={{ ...display, color: T.offwhite }}>Kapital til break‑even – med margin.</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          <div><Tall verdi={kapBuffer} farge={T.offwhite} /><p className="mt-3 text-[14.5px]" style={{ color: 'rgba(244,241,234,0.7)' }}>kapitalbehov inkl. 20 % buffer – dypeste akkumulerte punkt er {mnok(s.kapitalbehov)} ({s.kapitalbehovIdx !== null ? mndLabel(plan.startYm, s.kapitalbehovIdx, false) : '—'})</p></div>
          <div><p className="text-[40px] lg:text-[52px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.offwhite }}>{be(s.breakEvenIdx)}</p><p className="mt-3 text-[14.5px]" style={{ color: 'rgba(244,241,234,0.7)' }}>konsernet går i pluss – forvaltning {be(s.breakEvenForvaltningIdx)}, plattform {harPlattform ? be(s.breakEvenPlattformIdx) : '—'}</p></div>
          <div><Tall verdi={s.arrExit} farge={T.offwhite} /><p className="mt-3 text-[14.5px]" style={{ color: 'rgba(244,241,234,0.7)' }}>årlig omsetningstakt ved slutten av perioden – {s.andelPlattformPct ?? 0} % fra plattformen</p></div>
        </div>
        <p className="mt-12 text-[13px] font-medium" style={{ color: 'rgba(244,241,234,0.6)' }}>Pengene går til · sum over perioden</p>
        <dl className="mt-3 max-w-[720px] border-t" style={{ borderColor: 'rgba(244,241,234,0.14)' }}>
          {[['Markedsføring av plattformen', mnok(sumAnnonse)], ['Utvikling og drift av plattformen', mnok(sumUtvikling)], ['Forvaltere og team', mnok(sumLonn)], ['Felleskostnader', mnok(s.sumFelles)]].filter(([, v]) => v !== '').map(([l, v]) => (
            <div key={l} className="flex items-baseline justify-between gap-4 border-b py-3" style={{ borderColor: 'rgba(244,241,234,0.14)' }}><dt className="text-[14.5px]" style={{ color: 'rgba(244,241,234,0.7)' }}>{l}</dt><dd className="text-[15px] font-medium" style={{ color: T.offwhite }}>{v}</dd></div>
          ))}
        </dl>
        {investor?.kanSporre ? (
          <form onSubmit={spor} className="deck-skjul-print mt-12 max-w-[720px]" data-testid="deck-qa">
            <p className="text-[13px] font-medium" style={{ color: 'rgba(244,241,234,0.6)' }}>Spør oss – svaret kommer i investorrommet</p>
            <div className="mt-3 flex gap-2">
              <input value={sporsmal} onChange={(e) => setSporsmal(e.target.value)} placeholder="Hva lurer du på?" className="h-12 flex-1 rounded-[12px] px-4 text-[15px] outline-none" style={{ background: 'rgba(244,241,234,0.08)', color: T.offwhite, boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.16)' }} />
              <button type="submit" className="flex h-12 items-center gap-2 rounded-[12px] px-4 text-[14px] font-medium" style={{ background: T.offwhite, color: T.ink }}>{spurt ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />} {spurt ? 'Sendt' : 'Send'}</button>
            </div>
          </form>
        ) : null}
        <p className="mt-12 text-[12.5px]" style={{ color: 'rgba(244,241,234,0.45)' }}>Konfidensielt. Planen er en modell basert på oppgitte forutsetninger og faktiske kontrakter per {plan.oppdatertAt ? new Date(plan.oppdatertAt).toLocaleDateString('nb-NO') : 'i dag'}. Ikke et tilbud om tegning.</p>
      </Side>
    </div>
  );
}
