'use client';

// ─────────────────────────────────────────────────────────────────────────────
// STYRERAPPORT · BUDSJETT — verdensklasse, styremøteklar budsjettvisning som blir
// et eget kapittel i styrerapporten. Tallene beregnes fra et FRYST øyeblikksbilde
// (fakta + drivere) av et budsjett fra budsjettmodulen, med SAMME rene motor
// (lib/budsjett-modell) — så en historisk rapport alltid viser møtets tall.
//
//  · Board-KPI-band: ARR (exit), resultat i perioden, break-even, kapitalbehov,
//    enheter ved slutt.
//  · Budsjettgraf: inntekt vs. kostnad med break-even-markør (redaksjonell palett).
//  · Årstabell (teleskop) + enhetsøkonomi-nøkkeltall.
//  · «Innstillinger» → skuff med ALLE forutsetningene gruppert nøyaktig som i
//    budsjettmodulen (Portefølje & vekst · Unit economics · Marked & salg ·
//    Organisasjon · Faste kostnader · Årlig justering). Redigerbar i admin,
//    skrivebeskyttet i delt visning. Endringer lagres KUN på denne rapporten.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  SlidersHorizontal, X, RefreshCw, Loader2, TrendingUp, Scale, Megaphone,
  Users, Building2, CalendarDays, Wallet, ChevronUp, ChevronDown, Trash2, PenLine,
} from 'lucide-react';
import {
  beregnInvestorModell, beregnTech, rensModellDrivere, STANDARD_DRIVERE,
} from '@/lib/budsjett-modell';

// Den EKTE budsjettmodulen (samme komponent som i admin → Budsjett), lastet lat
// så delingslenker uten budsjettkapittel ikke betaler for den. Rendres
// «innebygd» (uten topplinje/rail/omvisning) og skrivebeskyttet — forutsetninger
// endres via rapportens egen «Innstillinger»-skuff og lagres i øyeblikksbildet.
const BudsjettModell = dynamic(() => import('./BudsjettModell'), {
  ssr: false,
  loading: () => <div className="e-meta py-10 text-center">Laster budsjettmodellen …</div>,
});
const noopApi = async () => ({ ok: true });

// Bygger et plan-objekt (slik BudsjettModell forventer) fra rapportens øyeblikksbilde.
function planFraBlokk(blokk) {
  return {
    id: blokk.planId || blokk.id,
    navn: blokk.planNavn || blokk.tittel || 'Budsjett',
    selskap: blokk.selskap === 'tech' ? 'tech' : 'digihome',
    type: blokk.planType === 'tech' ? 'tech' : 'modell',
    status: 'utkast',
    investorSynlig: false,
    startYm: blokk.startYm,
    antallMnd: Number(blokk.antallMnd) || 36,
    fakta: blokk.fakta || { eksisterende: [], enheter: [], oppdatertAt: null },
    drivere: blokk.drivere || {},
    tech: blokk.tech || null,
    scenarioer: [],
  };
}

// Redaksjonell palett — identisk med StyrerapportVisning
const C = { ink: '#15130F', ink2: '#3A3733', ink3: '#6F6A60', line: '#E4DFD6', line2: '#D6CFC4', canvas: '#F3F1EC', paper: '#FDFCFB', paper2: '#EFEBE3', accent: '#7C3AED', pos: '#1B7A46', neg: '#C0362C', amber: '#9a5b00' };
const H = { fontFamily: 'var(--font-heading), sans-serif' };

const NBSP = '\u202F';
const grp = (s) => String(s).replace(/[\u00A0\u202F\u2009 ]/g, NBSP);
const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
const kr = (n) => (n == null || isNaN(n) ? '—' : `${grp(nf0.format(Math.round(Number(n))))}${NBSP}kr`);
const krKort = (n) => {
  if (n == null || isNaN(n)) return '—';
  const v = Number(n); const a = Math.abs(v);
  if (a >= 1e6) return `${grp(nf1.format(v / 1e6))}${NBSP}mill`;
  if (a >= 1e4) return `${grp(nf0.format(Math.round(v / 1000)))}k`;
  return grp(nf0.format(Math.round(v)));
};
const antall = (n) => (n == null || isNaN(n) ? '—' : grp(nf0.format(Math.round(Number(n)))));
const pct = (n) => (n == null || isNaN(n) ? '—' : `${grp(nf1.format(Number(n)))}${NBSP}%`);
const kma = (s) => String(s).replace('.', ',');
const sumSerie = (a) => (Array.isArray(a) ? a.reduce((s, x) => s + (Number(x) || 0), 0) : 0);

const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const ymDeler = (ym) => { const [y, m] = String(ym || '').split('-').map(Number); return { y, m }; };
const ymPluss = (ym, i) => { const { y, m } = ymDeler(ym); const t = y * 12 + (m - 1) + i; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; };
const mndKort = (ym) => { const { y, m } = ymDeler(ym); return m >= 1 && m <= 12 ? `${MND_KORT[m - 1]}.${String(y).slice(2)}` : ym; };
const mndLang = (ym) => { const { y, m } = ymDeler(ym); return m >= 1 && m <= 12 ? `${MND_KORT[m - 1]}. ${y}` : ym; };
const stor = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// ── Driverkatalog: SAMME grupper/etiketter som budsjettmodulens rail ─────────
const GRUPPER = [
  {
    id: 'portefolje', tittel: 'Portefølje & vekst', ikon: TrendingUp,
    felt: [
      { k: 'nyePerMnd', label: 'Nye enheter per måned', enhet: 'enh.' },
      { k: 'aarligChurnPct', label: 'Årlig churn', enhet: '%' },
      { k: 'reutleiePaa', label: 'Re-utleie ved kontraktslutt', bool: true },
      { k: 'reutleieGapMnd', label: 'Ledighetsgap ved reutleie', enhet: 'mnd' },
    ],
  },
  {
    id: 'unit', tittel: 'Unit economics', ikon: Scale,
    felt: [
      { k: 'snittleieNye', label: 'Snittleie nye enheter', enhet: 'kr/mnd', heltall: true },
      { k: 'honorarPctNye', label: 'Honorar nye enheter', enhet: '%' },
      { k: 'systemPerEnhet', label: 'Systemkostnad per enhet', enhet: 'kr/mnd', heltall: true },
      { k: 'oppstartPerEnhet', label: 'Oppstartshonorar', enhet: 'kr', heltall: true },
    ],
  },
  {
    id: 'salg', tittel: 'Markedsføring & salg', ikon: Megaphone,
    felt: [
      { k: 'provisjonPerNyEnhet', label: 'Salgsprovisjon per ny (CAC)', enhet: 'kr', heltall: true },
      { k: 'organiskAndelPct', label: 'Organisk andel av nye', enhet: '%' },
      { k: 'mfFast', label: 'Fast markedsføring', enhet: 'kr/mnd', heltall: true },
    ],
  },
  {
    id: 'org', tittel: 'Organisasjon', ikon: Users,
    felt: [
      { k: 'enheterPerAarsverk', label: 'Enheter per årsverk', enhet: 'enh.', heltall: true },
      { k: 'aarslonn', label: 'Brutto årslønn', enhet: 'kr/år', heltall: true },
      { k: 'paslagPct', label: 'Arbeidsgiverpåslag', enhet: '%' },
      { k: 'maalUtnyttelsePct', label: 'Mål maks utnyttelse', enhet: '%' },
    ],
  },
  {
    id: 'faste', tittel: 'Faste kostnader', ikon: Building2,
    felt: [
      { k: 'adminFast', label: 'Administrasjon', enhet: 'kr/mnd', heltall: true },
      { k: 'andreFaste', label: 'Andre faste kostnader', enhet: 'kr/mnd', heltall: true },
    ],
  },
  {
    id: 'aarlig', tittel: 'Årlig justering', ikon: CalendarDays,
    felt: [
      { k: 'indeksPct', label: 'Indeksregulering leie (KPI)', enhet: '%/år' },
      { k: 'lonnsvekstPct', label: 'Lønnsvekst', enhet: '%/år' },
      { k: 'kostInflasjonPct', label: 'Kostnadsinflasjon', enhet: '%/år' },
    ],
  },
];

// Beregn modellen og normaliser til én felles form for board-visningen
function brukModell(blokk) {
  const antallMnd = Math.min(60, Math.max(1, Number(blokk.antallMnd) || 12));
  const startYm = /^\d{4}-\d{2}$/.test(blokk.startYm) ? blokk.startYm : `${new Date().getFullYear()}-01`;
  try {
    if (blokk.planType === 'tech') {
      const m = beregnTech({ antallMnd, drivere: blokk.tech || {}, fakta: blokk.fakta || {} });
      return {
        ok: true, tech: true, startYm, N: m.N,
        inntekt: m.inntekt?.total || [], kostSum: m.kostSum || [], resultat: m.resultat || [],
        enheterSerie: m.enheter?.total || [],
        arrExit: m.sammendrag?.arrExit ?? null, sumResultat: m.sammendrag?.resultat ?? null,
        sumInntekt: m.sammendrag?.sumInntekt ?? null, sumKost: m.sammendrag?.sumKost ?? null,
        breakEvenIdx: m.sammendrag?.breakEvenIdx ?? null, kapitalbehov: m.sammendrag?.kapitalbehov ?? null,
        kapIdx: m.sammendrag?.kapitalbehovIdx ?? null, enheterVedSlutt: m.sammendrag?.enheterVedSlutt?.total ?? null,
        aar: m.aar || [], cac: null, m,
      };
    }
    const m = beregnInvestorModell({ antallMnd, fakta: blokk.fakta || {}, drivere: blokk.drivere || {}, startYm });
    return {
      ok: true, tech: false, startYm, N: m.N,
      inntekt: m.inntekt || [], kostSum: m.kostSum || [], resultat: m.resultat || [],
      enheterSerie: m.enheter || [],
      arrExit: m.sammendrag?.arrExit ?? null, sumResultat: m.sammendrag?.resultat ?? null,
      sumInntekt: m.sammendrag?.sumInntekt ?? null, sumKost: m.sammendrag?.sumKost ?? null,
      breakEvenIdx: m.sammendrag?.breakEvenIdx ?? null, kapitalbehov: m.sammendrag?.kapitalbehov ?? null,
      kapIdx: m.sammendrag?.kapitalbehovIdx ?? null, enheterVedSlutt: m.sammendrag?.enheterVedSlutt ?? null,
      aar: m.aar || [], cac: m.cac || null, m,
    };
  } catch (e) {
    return { ok: false, feil: e && e.message };
  }
}

// ── Budsjettgraf: inntekt (fylt kurve) vs. kostnad (stiplet) + break-even ────
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[i + 2] || p2;
    d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}, ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
function BudsjettGraf({ mm }) {
  const N = mm.N;
  const inn = mm.inntekt; const kost = mm.kostSum;
  if (!N || N < 2 || !inn.length) return null;
  const W = 660, Ht = 210, padX = 8, padT = 20, padB = 26, padR = 54;
  const maks = Math.max(1, ...inn, ...kost);
  const x = (i) => padX + (i / (N - 1)) * (W - padX - padR);
  const y = (v) => padT + (1 - v / maks) * (Ht - padT - padB);
  const innPts = inn.map((v, i) => [x(i), y(v)]);
  const kostPts = kost.map((v, i) => [x(i), y(v)]);
  const innPath = smoothPath(innPts);
  const kostPath = smoothPath(kostPts);
  const area = `${innPath} L ${x(N - 1).toFixed(1)} ${Ht - padB} L ${x(0).toFixed(1)} ${Ht - padB} Z`;
  const be = mm.breakEvenIdx;
  const kapIdx = mm.kapIdx;
  const merker = [0, Math.floor((N - 1) / 2), N - 1];
  const ruter = [1, 0.66, 0.33];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${Ht}`} className="block h-auto w-full" role="img" aria-label="Budsjett: inntekt mot kostnad">
        <defs><linearGradient id="dh-bud-grad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity="0.16" /><stop offset="100%" stopColor={C.accent} stopOpacity="0" /></linearGradient></defs>
        {ruter.map((f) => (
          <g key={f}>
            <line x1={padX} x2={W - padR} y1={y(maks * f)} y2={y(maks * f)} stroke={C.line} strokeWidth="1" />
            <text x={W - padR + 6} y={y(maks * f) + 3.5} fontSize="10.5" fill="#b5b0a8">{krKort(maks * f)}</text>
          </g>
        ))}
        <path d={area} fill="url(#dh-bud-grad)" />
        <path d={kostPath} fill="none" stroke={C.neg} strokeWidth="1.6" strokeDasharray="5 4" strokeLinecap="round" opacity="0.8" vectorEffect="non-scaling-stroke" />
        <path d={innPath} fill="none" stroke={C.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {kapIdx != null && kapIdx > 0 && kapIdx < N && (
          <line x1={x(kapIdx)} x2={x(kapIdx)} y1={padT} y2={Ht - padB} stroke={C.amber} strokeWidth="1" strokeDasharray="2 4" opacity="0.55" />
        )}
        {be != null && be > 0 && be < N && (
          <g>
            <line x1={x(be)} x2={x(be)} y1={padT} y2={Ht - padB} stroke={C.ink} strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
            <circle cx={x(be)} cy={y(inn[be])} r="4" fill={C.paper} stroke={C.accent} strokeWidth="2" />
          </g>
        )}
        <circle cx={x(N - 1)} cy={y(inn[N - 1])} r="3.6" fill={C.accent} stroke={C.paper} strokeWidth="2" />
        <circle cx={x(N - 1)} cy={y(kost[N - 1])} r="3" fill={C.neg} stroke={C.paper} strokeWidth="2" />
      </svg>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold" style={{ color: C.ink3 }}>
          <span className="inline-flex items-center gap-1.5"><span className="h-[2.5px] w-4 rounded" style={{ background: C.accent }} /> Inntekt</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-[2px] w-4 rounded" style={{ background: `repeating-linear-gradient(90deg, ${C.neg} 0 4px, transparent 4px 7px)` }} /> Kostnad</span>
          {be != null && be > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: C.paper, boxShadow: `inset 0 0 0 2px ${C.accent}` }} /> Break-even</span>}
          {kapIdx != null && kapIdx > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-[2px] w-4 rounded" style={{ background: `repeating-linear-gradient(90deg, ${C.amber} 0 3px, transparent 3px 6px)` }} /> Kapitalbunn</span>}
        </div>
        <div className="hidden gap-6 text-[11px] tabular-nums sm:flex" style={{ color: C.ink3, paddingRight: '54px' }}>
          {merker.map((i) => <span key={i}>{mndKort(ymPluss(mm.startYm, i))}</span>)}
        </div>
      </div>
    </div>
  );
}

// ── Kontantkurve: akkumulert resultat (likviditet) med nullinje + kapitalbunn ─
function CashGraf({ mm }) {
  const s = mm.m && mm.m.akkumulert;
  if (!Array.isArray(s) || s.length < 2) return null;
  const N = s.length;
  const W = 660, Ht = 180, padX = 8, padT = 18, padB = 24, padR = 54;
  const maxV = Math.max(0, ...s); const minV = Math.min(0, ...s);
  const range = (maxV - minV) || 1;
  const x = (i) => padX + (i / (N - 1)) * (W - padX - padR);
  const y = (v) => padT + (1 - (v - minV) / range) * (Ht - padT - padB);
  const pts = s.map((v, i) => [x(i), y(v)]);
  const path = smoothPath(pts);
  const y0 = y(0);
  const area = `${path} L ${x(N - 1).toFixed(1)} ${y0.toFixed(1)} L ${x(0).toFixed(1)} ${y0.toFixed(1)} Z`;
  const kapIdx = mm.kapIdx;
  const lav = minV < 0 ? minV : null;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${Ht}`} className="block h-auto w-full" role="img" aria-label="Kontantbeholdning gjennom perioden">
        <defs><linearGradient id="dh-cash-grad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity="0.14" /><stop offset="100%" stopColor={C.accent} stopOpacity="0" /></linearGradient></defs>
        <line x1={padX} x2={W - padR} y1={y0} y2={y0} stroke={C.line2} strokeWidth="1" />
        <text x={W - padR + 6} y={y0 + 3.5} fontSize="10.5" fill="#b5b0a8">0</text>
        <path d={area} fill="url(#dh-cash-grad)" />
        <path d={path} fill="none" stroke={C.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {kapIdx != null && kapIdx >= 0 && kapIdx < N && lav != null && (
          <g>
            <circle cx={x(kapIdx)} cy={y(lav)} r="4" fill={C.paper} stroke={C.amber} strokeWidth="2" />
            <text x={Math.min(W - padR - 4, x(kapIdx) + 8)} y={y(lav) + 14} fontSize="11" fontWeight="700" fill={C.amber}>−{krKort(-lav)}</text>
          </g>
        )}
        <circle cx={x(N - 1)} cy={y(s[N - 1])} r="3.6" fill={s[N - 1] >= 0 ? C.pos : C.neg} stroke={C.paper} strokeWidth="2" />
      </svg>
    </div>
  );
}

// ── Sammensetning: én rad med etikett, kr, andel og fargebar ─────────────────
function KomposRad({ navn, v, pctAv, farge }) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px]" style={{ color: C.ink2 }}>{navn}</span>
        <span className="text-[13px] font-semibold tabular-nums" style={{ color: C.ink }}>{kr(v)} <span className="ml-0.5 text-[11.5px] font-normal" style={{ color: C.ink3 }}>{pct(pctAv)}</span></span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full" style={{ background: C.paper2 }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, pctAv))}%`, background: farge }} />
      </div>
    </div>
  );
}

// ── Liten nøkkeltall-celle for enhetsøkonomi-panelet ─────────────────────────
function UeCelle({ label, verdi, sub, tone }) {
  const col = tone === 'pos' ? C.pos : tone === 'neg' ? C.neg : C.ink;
  return (
    <div className="rounded-[12px] border bg-white p-3.5" style={{ borderColor: C.line }}>
      <p className="text-[11px] leading-tight" style={{ color: C.ink3 }}>{label}</p>
      <p className="mt-1.5 font-bold tabular-nums" style={{ ...H, fontSize: '19px', lineHeight: 1, letterSpacing: '-0.02em', color: col }}>{verdi}</p>
      {sub && <p className="mt-1 text-[11px]" style={{ color: C.ink3 }}>{sub}</p>}
    </div>
  );
}

// ── Board-KPI-flis ───────────────────────────────────────────────────────────
function KpiFlis({ label, verdi, sub, tone }) {
  const col = tone === 'pos' ? C.pos : tone === 'neg' ? C.neg : C.ink;
  return (
    <div className="rounded-[14px] border bg-white p-5" style={{ borderColor: C.line }}>
      <p className="e-label">{label}</p>
      <p className="mt-3 font-bold tabular-nums" style={{ ...H, fontSize: 'clamp(22px,2.4vw,30px)', lineHeight: 1, letterSpacing: '-0.03em', color: col }}>{verdi}</p>
      {sub && <p className="e-meta mt-2">{sub}</p>}
    </div>
  );
}

// ── Innstillinger-skuff: alle forutsetninger gruppert som budsjettmodulen ────
function InnstillingerSkuff({ blokk, edit, mm, onLukk, onOppdater, oppdaterer }) {
  const readOnly = !edit;
  const dRaw = { ...STANDARD_DRIVERE, ...(blokk.drivere || {}) };
  const dNorm = rensModellDrivere(blokk.drivere || {});
  const [aapneGr, setAapneGr] = useState({ portefolje: true, unit: true, salg: false, org: false, faste: false, aarlig: false });
  const veksle = (id) => setAapneGr((a) => ({ ...a, [id]: !a[id] }));

  const settDriver = (k, v) => { if (edit) edit.oppdaterBlokk(blokk.id, { drivere: { ...(blokk.drivere || {}), [k]: v } }); };
  const visVerdi = (f) => {
    const v = dRaw[f.k];
    if (f.bool) return v ? 'På' : 'Av';
    if (f.heltall) return grp(nf0.format(Math.round(Number(v) || 0)));
    return kma(String(v ?? ''));
  };

  const cac = mm.cac;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end" data-testid="sr-budsjett-innstillinger">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onLukk} />
      <div className="relative flex h-full w-full max-w-[520px] flex-col shadow-[0_0_60px_rgba(0,0,0,0.28)]" style={{ background: C.canvas }}>
        {/* Topp */}
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: C.line, background: C.paper }}>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[15px] font-bold" style={{ ...H, color: C.ink }}><SlidersHorizontal className="h-4 w-4" style={{ color: C.accent }} /> Forutsetninger</p>
            <p className="mt-0.5 truncate text-[12px]" style={{ color: C.ink3 }}>{readOnly ? 'Slik budsjettet ble modellert til dette møtet.' : 'Endringer lagres kun på denne rapporten.'}</p>
          </div>
          <button onClick={onLukk} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] transition-colors hover:bg-black/[0.06]" style={{ color: C.ink3 }}><X className="h-4 w-4" /></button>
        </div>

        {/* Enhetsøkonomi-sammendrag (kun modell) */}
        {!blokk.planType || blokk.planType === 'modell' ? (
          <div className="border-b px-5 py-4" style={{ borderColor: C.line, background: C.paper }}>
            <p className="e-label mb-3">Enhetsøkonomi per ny enhet</p>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-[11px]" style={{ color: C.ink3 }}>Honorar</p><p className="mt-1 font-bold tabular-nums" style={{ ...H, color: C.ink }}>{cac ? kr(cac.bruttoHonorarNy) : '—'}</p></div>
              <div><p className="text-[11px]" style={{ color: C.ink3 }}>Bidrag</p><p className="mt-1 font-bold tabular-nums" style={{ ...H, color: (cac?.bidrag || 0) >= 0 ? C.pos : C.neg }}>{cac ? kr(cac.bidrag) : '—'}</p></div>
              <div><p className="text-[11px]" style={{ color: C.ink3 }}>CAC payback</p><p className="mt-1 font-bold tabular-nums" style={{ ...H, color: C.ink }}>{cac?.paybackMnd != null ? `${kma(cac.paybackMnd)} mnd` : '—'}</p></div>
            </div>
          </div>
        ) : null}

        {/* Grupper */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'thin' }}>
          {blokk.planType === 'tech' ? (
            <p className="rounded-[12px] border border-dashed p-5 text-[13px] leading-relaxed" style={{ borderColor: C.line2, color: C.ink3 }}>Dette er et Tech-budsjett (plattform). Detaljerte forutsetninger redigeres i budsjettmodulen. Bruk «Oppdater fra budsjettmodulen» for å hente inn siste tall.</p>
          ) : GRUPPER.map((gr) => {
            const Ikon = gr.ikon;
            const aapen = aapneGr[gr.id];
            return (
              <div key={gr.id} className={`mb-2 overflow-hidden rounded-[14px] border ${aapen ? 'bg-white' : ''}`} style={{ borderColor: C.line }}>
                <button onClick={() => veksle(gr.id)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: aapen ? 'rgba(124,58,237,0.10)' : C.paper2, color: aapen ? C.accent : C.ink3 }}><Ikon className="h-3.5 w-3.5" /></span>
                    <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: aapen ? C.ink : C.ink2 }}>{gr.tittel}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${aapen ? 'rotate-180' : ''}`} style={{ color: C.line2 }} />
                </button>
                {aapen && (
                  <div className="px-4 pb-3">
                    {gr.felt.map((f) => (
                      <div key={f.k} className="flex items-center justify-between gap-3 border-t py-2.5" style={{ borderColor: C.line }}>
                        <span className="text-[13px]" style={{ color: C.ink2 }}>{f.label}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {readOnly ? (
                            <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: C.ink }}>{visVerdi(f)}</span>
                          ) : f.bool ? (
                            <button onClick={() => settDriver(f.k, !dNorm[f.k])} className="rounded-full px-3 py-1 text-[12px] font-semibold transition-colors" style={{ background: dNorm[f.k] ? 'rgba(27,122,70,0.12)' : C.paper2, color: dNorm[f.k] ? C.pos : C.ink3 }}>{dNorm[f.k] ? 'På' : 'Av'}</button>
                          ) : (
                            <input
                              value={String(dRaw[f.k] ?? '')}
                              inputMode={f.heltall ? 'numeric' : 'decimal'}
                              onChange={(e) => settDriver(f.k, f.heltall ? e.target.value.replace(/[^\d]/g, '') : e.target.value.replace(/[^\d.,]/g, ''))}
                              className="h-8 w-[104px] rounded-[8px] border bg-white px-2 text-right text-[13.5px] font-semibold tabular-nums outline-none transition focus:border-[#7C3AED]"
                              style={{ borderColor: C.line2, color: C.ink }}
                            />
                          )}
                          <span className="w-11 text-[11px]" style={{ color: C.ink3 }}>{f.enhet || ''}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bunn */}
        {edit && (
          <div className="flex items-center justify-between gap-2 border-t px-5 py-3" style={{ borderColor: C.line, background: C.paper }}>
            <button onClick={onOppdater} disabled={oppdaterer || !blokk.planId} title={blokk.planId ? 'Hent siste fakta og forutsetninger fra budsjettmodulen' : 'Ingen koblet plan'} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border px-3 text-[12.5px] font-semibold transition-colors disabled:opacity-40" style={{ borderColor: C.line2, color: C.ink2 }}>
              {oppdaterer ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Oppdater fra budsjettmodulen
            </button>
            <button onClick={onLukk} className="inline-flex h-9 items-center rounded-[8px] bg-[#0A0A0A] px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#232323]">Ferdig</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function StyrerapportBudsjett({ blokk, edit = null, folio = '', visning = 'admin', idx = 0, antallBlokker = 1 }) {
  const [aapenInnst, setAapenInnst] = useState(false);
  const [oppdaterer, setOppdaterer] = useState(false);
  // Remount-signal: bumpes KUN ved ekstern oppfriskning («hent fra modul») eller
  // når et annet budsjett velges — ikke ved slider-endringer (da eier modulen sin
  // egen state og skal ikke remountes).
  const [reseed, setReseed] = useState(0);
  const mm = useMemo(() => brukModell(blokk), [blokk]);
  // Modell-planer rendres med den EKTE budsjettmodulen (identisk med admin);
  // Tech-planer beholder den redaksjonelle fallback-visningen.
  const erModellPlan = mm.ok && !mm.tech;
  const nokkel = `${blokk.planId || blokk.id}::${blokk.startYm || ''}::${reseed}`;
  // I redigering er modulen interaktiv (presentasjon): sliderne regner om live, og
  // endringene speiles tilbake i rapportens øyeblikksbilde. I les/delt er den låst.
  const budsjettProps = edit
    ? { presentasjon: true, onDrivereEndret: ({ drivere, antallMnd }) => edit.oppdaterBlokk(blokk.id, { drivere, antallMnd }) }
    : { readOnly: true };
  const kropp = mm.ok ? (erModellPlan
    ? <div className="rounded-[18px] p-3 sm:p-4" style={{ background: '#f7f6f3' }}><BudsjettModell key={nokkel} plan={planFraBlokk(blokk)} api={noopApi} apiKey={(edit && edit.apiKey) || ''} innebygd {...budsjettProps} /></div>
    : <BudsjettKropp mm={mm} blokk={blokk} />) : null;

  const kicker = (blokk.kicker || '').trim() || 'Budsjett';
  const tittel = (blokk.tittel || '').trim() || (blokk.planNavn || 'Budsjett');

  const oppdaterFraModul = async () => {
    if (!edit || !edit.oppdaterBudsjett || !blokk.planId) return;
    setOppdaterer(true);
    try { await edit.oppdaterBudsjett(blokk.id); setReseed((r) => r + 1); } finally { setOppdaterer(false); }
  };

  // Chapter head
  const hode = (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-[760px]">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-[13px] font-bold tabular-nums" style={{ ...H, color: C.accent }}>{folio}</span>
          <span className="h-px w-9" style={{ background: C.line2 }} aria-hidden />
          <span className="e-label">{kicker}</span>
        </div>
        <h2 className="e-h2">{tittel}</h2>
        {mm.ok && (
          <p className="e-lead mt-4 max-w-[680px]">
            {blokk.planType === 'tech' ? 'Plattformbudsjettet' : 'Vekstbudsjettet'} for perioden {stor(mndLang(mm.startYm))}–{mndLang(ymPluss(mm.startYm, mm.N - 1))} · {mm.N} mnd. {erModellPlan ? 'Full modell — samme motor og forutsetninger som budsjettmodulen.' : 'Modellert fra fryste forutsetninger — trykk «Innstillinger» for alle faktorene.'}
          </p>
        )}
      </div>
      {!erModellPlan && (
      <button
        type="button"
        onClick={() => setAapenInnst(true)}
        data-testid="sr-budsjett-innstillinger-knapp"
        className="dh-sr-noprint inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border px-4 text-[13px] font-semibold transition-colors hover:border-[#15130F]"
        style={{ borderColor: C.line2, background: C.paper, color: C.ink2 }}
      >
        <SlidersHorizontal className="h-4 w-4" style={{ color: C.accent }} /> Innstillinger
      </button>
      )}
    </div>
  );

  // Editor-kort (admin, redigering): tittel/kicker/plassering + flytt/slett
  if (edit) {
    const sel = 'h-9 rounded-[8px] border bg-white px-2.5 text-[12.5px] font-medium outline-none focus:border-[#15130F]';
    const RIK_ANKERE = [
      { id: 'start', label: 'Øverst' }, { id: 'sammendrag', label: 'Etter sammendrag' }, { id: 'nokkeltall', label: 'Etter nøkkeltall' },
      { id: 'resultat', label: 'Etter resultat' }, { id: 'regnskap', label: 'Etter regnskap' }, { id: 'kunder', label: 'Etter kunder' },
      { id: 'prognose', label: 'Etter prognose' }, { id: 'slutt', label: 'Nederst' },
    ];
    return (
      <section id={`sr-budsjett-${blokk.id}`} style={{ scrollMarginTop: 116, paddingTop: 'clamp(60px,7.4vw,124px)' }}>
        <div className="rounded-[18px] border bg-white p-5 sm:p-7" style={{ borderColor: C.line2 }}>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: 'rgba(124,58,237,0.10)', color: C.accent }}><Wallet className="h-3 w-3" /> Budsjett · {folio}</span>
            {blokk.planNavn && <span className="rounded-[6px] px-2 py-1 text-[11px] font-semibold" style={{ background: C.paper2, color: C.ink3 }}>{blokk.planNavn}</span>}
            <select className={sel} style={{ borderColor: C.line2, color: C.ink2 }} value={blokk.etter || 'slutt'} onChange={(e) => edit.oppdaterBlokk(blokk.id, { etter: e.target.value })} title="Plassering i rapporten">
              {RIK_ANKERE.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" className="rounded-[8px] p-2 hover:bg-black/[0.04] disabled:opacity-30" onClick={() => edit.flyttBlokk(blokk.id, -1)} disabled={idx <= 0} title="Flytt opp"><ChevronUp className="h-4 w-4" /></button>
              <button type="button" className="rounded-[8px] p-2 hover:bg-black/[0.04] disabled:opacity-30" onClick={() => edit.flyttBlokk(blokk.id, 1)} disabled={idx >= antallBlokker - 1} title="Flytt ned"><ChevronDown className="h-4 w-4" /></button>
              <button type="button" className="rounded-[8px] p-2 hover:bg-black/[0.04]" style={{ color: C.neg }} onClick={() => { if (window.confirm('Fjerne dette budsjettkapittelet?')) edit.slettBlokk(blokk.id); }} title="Fjern"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <input className="mb-2 w-full bg-transparent text-[11.5px] font-bold uppercase tracking-[0.16em] outline-none placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-[#B5AFA4]" style={{ color: C.accent }} value={blokk.kicker || ''} onChange={(e) => edit.oppdaterBlokk(blokk.id, { kicker: e.target.value })} placeholder="Kicker — f.eks. Vekstbudsjett, Prognose" />
          <input className="mb-5 w-full bg-transparent font-bold outline-none placeholder:font-semibold placeholder:text-[#C9C3B8]" style={{ ...H, color: C.ink, fontSize: 'clamp(24px,2.6vw,34px)', lineHeight: 1.1, letterSpacing: '-0.03em' }} value={blokk.tittel || ''} onChange={(e) => edit.oppdaterBlokk(blokk.id, { tittel: e.target.value })} placeholder="Overskrift på budsjettkapittelet" />
          {/* Live forhåndsvisning */}
          <div className="rounded-[14px] border p-4 sm:p-5" style={{ borderColor: C.line, background: C.canvas }}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="e-label">{erModellPlan ? 'Forhåndsvisning · juster forutsetningene direkte i panelet' : 'Forhåndsvisning'}</span>
              {erModellPlan ? (
                blokk.planId ? (
                  <button type="button" onClick={oppdaterFraModul} disabled={oppdaterer} title="Hent de nyeste tallene fra budsjettmodulen (overskriver justeringer gjort her)" className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-[12px] font-semibold disabled:opacity-50" style={{ borderColor: C.line2, background: C.paper, color: C.ink2 }}>{oppdaterer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" style={{ color: C.accent }} />} Oppdater fra modul</button>
                ) : null
              ) : (
                <button type="button" onClick={() => setAapenInnst(true)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-[12px] font-semibold" style={{ borderColor: C.line2, background: C.paper, color: C.ink2 }}><SlidersHorizontal className="h-3.5 w-3.5" style={{ color: C.accent }} /> Innstillinger</button>
              )}
            </div>
            {mm.ok ? kropp : <p className="e-meta">Kunne ikke beregne budsjettet.{mm.feil ? ` (${mm.feil})` : ''}</p>}
          </div>
        </div>
        {aapenInnst && <InnstillingerSkuff blokk={blokk} edit={edit} mm={mm} onLukk={() => setAapenInnst(false)} onOppdater={oppdaterFraModul} oppdaterer={oppdaterer} />}
      </section>
    );
  }

  // Visning (admin les / delt)
  return (
    <section id={`sr-budsjett-${blokk.id}`} style={{ scrollMarginTop: 116, paddingTop: 'clamp(60px,7.4vw,124px)' }}>
      {hode}
      {mm.ok ? kropp : (
        <div className="rounded-[14px] border border-dashed p-8" style={{ borderColor: C.line2 }}><p className="e-meta">Budsjettet er midlertidig utilgjengelig.</p></div>
      )}
      {aapenInnst && <InnstillingerSkuff blokk={blokk} edit={null} mm={mm} onLukk={() => setAapenInnst(false)} />}
    </section>
  );
}

// ── Selve tallene (KPI-band + graf + årstabell) — delt av visning og editor ──
function BudsjettKropp({ mm, blokk, kompakt = false }) {
  const vis = blokk.vis || {};
  const N = mm.N;
  const beMnd = (mm.breakEvenIdx != null && mm.breakEvenIdx >= 0) ? mndLang(ymPluss(mm.startYm, mm.breakEvenIdx)) : null;
  const mrrExit = mm.inntekt && mm.inntekt.length ? mm.inntekt[N - 1] : null;
  const margin = mm.sumInntekt > 0 ? (mm.sumResultat / mm.sumInntekt) * 100 : null;
  const erModell = !mm.tech;
  const sm = (mm.m && mm.m.sammendrag) || {};

  // Kostnadssammensetning (kun modell — Tech har egen kost-struktur)
  const k = (mm.m && mm.m.kost) || {};
  const kostRader = erModell ? [
    { navn: 'Lønn & bemanning', v: sumSerie(k.bemanning) + sumSerie(k.grunnleggere), farge: C.ink },
    { navn: 'System & drift', v: sumSerie(k.system), farge: C.accent },
    { navn: 'Marked & salg', v: sumSerie(k.mfFast) + sumSerie(k.provisjon) + sumSerie(k.partner), farge: '#B08900' },
    { navn: 'Administrasjon', v: sumSerie(k.admin), farge: C.ink3 },
    { navn: 'Andre kostnader', v: sumSerie(k.andre), farge: C.line2 },
  ].filter((r) => r.v > 0).sort((a, b) => b.v - a.v) : [];
  const kostTot = kostRader.reduce((s, r) => s + r.v, 0) || 1;

  // Inntektskilder
  const inntRader = erModell ? [
    { navn: 'Kontraktsfestet honorar', v: sm.sumEksisterende || 0, farge: C.pos },
    { navn: 'Gjenutleie', v: sm.sumReutleie || 0, farge: C.accent },
    { navn: 'Ny vekst (modellert)', v: sm.sumModellert || 0, farge: C.ink },
  ].filter((r) => r.v > 0).sort((a, b) => b.v - a.v) : [];
  const inntTot = inntRader.reduce((s, r) => s + r.v, 0) || 1;

  // Enhetsøkonomi
  const ue = mm.cac;
  const mChurn = (sm.mndChurnPct || 0) / 100;
  const levetidMnd = mChurn > 0 ? 1 / mChurn : null;
  const bidragMarginPct = ue && ue.bruttoHonorarNy > 0 ? (ue.bidrag / ue.bruttoHonorarNy) * 100 : null;
  const ltv = (ue && ue.bidrag != null && levetidMnd) ? ue.bidrag * levetidMnd : null;
  const ltvCac = (ltv != null && ue && ue.fullCac > 0) ? ltv / ue.fullCac : null;

  return (
    <>
      {/* KPI-band */}
      <div className={`grid gap-3 ${kompakt ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
        <KpiFlis label="ARR ved slutt" verdi={kr(mm.arrExit)} sub={mrrExit != null ? `${kr(mrrExit)} / mnd exit` : 'run-rate exit'} />
        <KpiFlis label="Resultat i perioden" verdi={kr(mm.sumResultat)} sub={mm.sumInntekt ? `av ${krKort(mm.sumInntekt)} inntekt` : ''} tone={(mm.sumResultat || 0) >= 0 ? 'pos' : 'neg'} />
        {!kompakt && <KpiFlis label="Driftsmargin" verdi={margin != null ? pct(margin) : '—'} sub="resultat / inntekt" tone={(margin || 0) >= 0 ? 'pos' : 'neg'} />}
        <KpiFlis label="Break-even" verdi={beMnd ? stor(mndKort(ymPluss(mm.startYm, mm.breakEvenIdx))) : (mm.breakEvenIdx === 0 ? 'Fra start' : 'Etter perioden')} sub={beMnd ? `måned ${mm.breakEvenIdx + 1}` : 'i planhorisonten'} />
        {!kompakt && <KpiFlis label="Kapitalbehov" verdi={mm.kapitalbehov > 0 ? `−${kr(mm.kapitalbehov)}` : kr(0)} sub={mm.kapitalbehov > 0 ? 'dypeste kontantbunn' : 'ingen kapitalbunn'} tone={mm.kapitalbehov > 0 ? 'neg' : 'pos'} />}
        <KpiFlis label="Enheter ved slutt" verdi={antall(mm.enheterVedSlutt)} sub="under forvaltning" />
      </div>

      {/* Inntekt mot kostnad */}
      {vis.graf !== false && (
        <div className="mt-3 rounded-[14px] border bg-white p-5 sm:p-6" style={{ borderColor: C.line }}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-[14px] font-semibold" style={{ color: C.ink }}>Inntekt mot kostnad</p>
            <span className="e-meta">{mm.N} mnd</span>
          </div>
          <BudsjettGraf mm={mm} />
        </div>
      )}

      {/* Sammensetning: hvor inntekten kommer fra / hvor pengene går */}
      {!kompakt && erModell && (kostRader.length > 0 || inntRader.length > 0) && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {inntRader.length > 0 && (
            <div className="rounded-[14px] border bg-white p-5 sm:p-6" style={{ borderColor: C.line }}>
              <p className="mb-1 text-[14px] font-semibold" style={{ color: C.ink }}>Hvor inntekten kommer fra</p>
              <p className="e-meta mb-3">Sum {kr(inntTot)} i perioden</p>
              <div>{inntRader.map((r) => <KomposRad key={r.navn} navn={r.navn} v={r.v} pctAv={(r.v / inntTot) * 100} farge={r.farge} />)}</div>
            </div>
          )}
          {kostRader.length > 0 && (
            <div className="rounded-[14px] border bg-white p-5 sm:p-6" style={{ borderColor: C.line }}>
              <p className="mb-1 text-[14px] font-semibold" style={{ color: C.ink }}>Hvor pengene går</p>
              <p className="e-meta mb-3">Sum {kr(kostTot)} i perioden</p>
              <div>{kostRader.map((r) => <KomposRad key={r.navn} navn={r.navn} v={r.v} pctAv={(r.v / kostTot) * 100} farge={r.farge} />)}</div>
            </div>
          )}
        </div>
      )}

      {/* Enhetsøkonomi */}
      {!kompakt && erModell && ue && (
        <div className="mt-3 rounded-[14px] border bg-white p-5 sm:p-6" style={{ borderColor: C.line }}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-[14px] font-semibold" style={{ color: C.ink }}>Enhetsøkonomi</p>
            <span className="e-meta">per ny enhet</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            <UeCelle label="Honorar / mnd" verdi={kr(ue.bruttoHonorarNy)} sub="eks. mva" />
            <UeCelle label="Bidrag / mnd" verdi={kr(ue.bidrag)} sub={bidragMarginPct != null ? `margin ${pct(bidragMarginPct)}` : ''} tone={(ue.bidrag || 0) >= 0 ? 'pos' : 'neg'} />
            <UeCelle label="Anskaffelse (CAC)" verdi={kr(ue.fullCac)} sub={ue.organiskAndelPct != null ? `${kma(String(ue.organiskAndelPct))} % organisk` : ''} />
            <UeCelle label="Tilbakebetalt" verdi={ue.paybackMnd != null ? `${kma(String(ue.paybackMnd))} mnd` : '—'} sub="CAC payback" />
            <UeCelle label="Kundelevetid" verdi={levetidMnd != null ? `${antall(Math.round(levetidMnd))} mnd` : '—'} sub={sm.mndChurnPct != null ? `${kma(String(sm.mndChurnPct))} % churn/mnd` : ''} />
            <UeCelle label="Verdi (LTV)" verdi={ltv != null ? kr(ltv) : '—'} sub="bidrag × levetid" />
            <UeCelle label="LTV / CAC" verdi={ltvCac != null ? `${kma(nf1.format(ltvCac))}×` : '—'} sub={ltvCac != null ? (ltvCac >= 3 ? 'sunt (≥ 3×)' : 'under 3×') : ''} tone={ltvCac != null ? (ltvCac >= 3 ? 'pos' : (ltvCac < 1 ? 'neg' : undefined)) : undefined} />
            <UeCelle label="Systemkost / mnd" verdi={kr(ue.systemPerEnhet)} sub="per enhet" />
          </div>
        </div>
      )}

      {/* Kontantbeholdning gjennom perioden */}
      {!kompakt && mm.m && Array.isArray(mm.m.akkumulert) && mm.m.akkumulert.length > 1 && (
        <div className="mt-3 rounded-[14px] border bg-white p-5 sm:p-6" style={{ borderColor: C.line }}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-[14px] font-semibold" style={{ color: C.ink }}>Kontantbeholdning gjennom perioden</p>
            <span className="e-meta">{mm.kapitalbehov > 0 ? `bunn −${krKort(mm.kapitalbehov)}` : 'ingen kapitalbunn'}</span>
          </div>
          <CashGraf mm={mm} />
          <p className="e-meta mt-3">Akkumulert resultat før finansiering. {mm.kapitalbehov > 0 ? `Dypeste punkt er kapitalbehovet — ${kr(mm.kapitalbehov)} — nådd ${mm.kapIdx != null ? `i ${mndLang(ymPluss(mm.startYm, mm.kapIdx))}` : 'i perioden'}.` : 'Driften er selvfinansierende gjennom hele perioden.'}</p>
        </div>
      )}

      {/* Per planår */}
      {vis.aar !== false && mm.aar && mm.aar.length > 0 && !kompakt && (
        <div className="mt-3 rounded-[14px] border bg-white p-5 sm:p-6" style={{ borderColor: C.line }}>
          <p className="mb-4 text-[14px] font-semibold" style={{ color: C.ink }}>Per planår</p>
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full text-[13.5px]">
              <thead><tr className="text-left">{['År', 'Inntekt', 'Kostnad', 'Resultat', 'Margin', 'Enheter', 'ARR exit'].map((t, i) => <th key={i} className={`e-label pb-3 ${i > 0 ? 'text-right' : ''}`}>{t}</th>)}</tr></thead>
              <tbody>
                {mm.aar.map((a) => (
                  <tr key={a.nr} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td className="py-3 font-semibold" style={{ color: C.ink }}>År {a.nr}</td>
                    <td className="py-3 text-right tabular-nums" style={{ color: C.ink2 }}>{kr(a.inntekt)}</td>
                    <td className="py-3 text-right tabular-nums" style={{ color: C.ink2 }}>{kr(a.kost)}</td>
                    <td className="py-3 text-right font-semibold tabular-nums" style={{ color: (a.resultat || 0) >= 0 ? C.pos : C.neg }}>{kr(a.resultat)}</td>
                    <td className="py-3 text-right tabular-nums" style={{ color: C.ink3 }}>{a.marginPct != null ? pct(a.marginPct) : '—'}</td>
                    <td className="py-3 text-right tabular-nums" style={{ color: C.ink2 }}>{antall(a.enheterSlutt)}</td>
                    <td className="py-3 text-right tabular-nums" style={{ color: C.ink2 }}>{kr(a.arrExit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kompakt (editor-forhåndsvisning): mini enhetsøkonomi under grafen */}
      {kompakt && erModell && ue && (
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <UeCelle label="Bidrag / mnd" verdi={kr(ue.bidrag)} tone={(ue.bidrag || 0) >= 0 ? 'pos' : 'neg'} />
          <UeCelle label="CAC payback" verdi={ue.paybackMnd != null ? `${kma(String(ue.paybackMnd))} mnd` : '—'} />
          <UeCelle label="LTV / CAC" verdi={ltvCac != null ? `${kma(nf1.format(ltvCac))}×` : '—'} tone={ltvCac != null && ltvCac >= 3 ? 'pos' : undefined} />
        </div>
      )}
    </>
  );
}
