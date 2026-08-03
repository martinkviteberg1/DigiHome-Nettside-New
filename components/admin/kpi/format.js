'use client';

// ---------------------------------------------------------------------------
// Delte formattere, farger og design-tokens for nøkkeltall-flaten.
// Alt tallformat er nb-NO med tabular-nums, så kolonner alltid står i rette.
// ---------------------------------------------------------------------------

export const VIOLET = '#7C5CF0';
export const VIOLET_DEEP = '#6D4CE0';
export const VIOLET_SOFT = '#A78BFA';
export const INK = '#16141D';
export const INK_2 = '#514E5A';
export const INK_3 = '#8B8894';
export const INK_4 = '#B0AEB8';
export const HAIR = 'rgba(22,20,29,0.07)';
export const EMER = '#10B981';
export const EMER_TEXT = '#047857';
export const AMBER = '#F59E0B';
export const AMBER_TEXT = '#B45309';
export const SLATE = '#94A3B8';
export const SLATE_TEXT = '#64748B';

// Gjenbrukbare klassestrenger — holder kortene visuelt identiske overalt.
export const CARD = 'rounded-[20px] bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(16,14,24,0.04)]';
export const CARD_HOVER = 'transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_1px_2px_rgba(16,14,24,0.04),0_16px_40px_-20px_rgba(16,14,24,0.22)] hover:-translate-y-[3px] hover:border-[#7C5CF0]/25 active:translate-y-0 active:shadow-[0_1px_2px_rgba(16,14,24,0.04)]';
export const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CF0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
export const LABEL = 'text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#8B8894]';
export const EYEBROW = 'text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#B0AEB8]';

const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });

export const num = (v) => (v == null || !isFinite(Number(v)) ? '—' : nf0.format(Math.round(Number(v))));
export const num1 = (v) => (v == null || !isFinite(Number(v)) ? '—' : nf1.format(Number(v)));
export const kr = (v) => (v == null || !isFinite(Number(v)) ? '—' : `${nf0.format(Math.round(Number(v)))} kr`);
export const krM = (v) => (v == null || !isFinite(Number(v)) ? '—' : `${nf0.format(Math.round(Number(v)))} kr/mnd`);
export const pct = (v) => (v == null || !isFinite(Number(v)) ? '—' : `${nf1.format(Number(v))} %`);
export const ratio = (v) => (v == null || !isFinite(Number(v)) ? '—' : `${nf1.format(Number(v))} : 1`);

// Kompakt kronebeløp for trange kort: 128 400 → 128,4k
export const krCompact = (v) => {
  const n = Number(v);
  if (v == null || !isFinite(n)) return '—';
  if (Math.abs(n) >= 1000000) return `${nf1.format(n / 1000000)}M`;
  if (Math.abs(n) >= 10000) return `${nf0.format(Math.round(n / 1000))}k`;
  return nf0.format(Math.round(n));
};

export const dateShort = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const FMT = {
  kr, krM, num, num1, pct, ratio,
  text: (v) => (v == null || v === '' ? '—' : String(v)),
  date: (v) => {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d)) return String(v);
    return d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
};

// Inntektskvalitet — samme fargespråk overalt, så «realisert» aldri kan
// forveksles med «prognose».
export const QUALITY = {
  realised: { label: 'Realisert', dot: EMER, text: EMER_TEXT, bg: '#ECFDF5', border: '#A7F3D0', tint: 'rgba(16,185,129,0.10)', help: 'Faktisk startet leiekontrakt med faktisk honorar. Penger som løper nå.' },
  contracted: { label: 'Kontrahert', dot: AMBER, text: AMBER_TEXT, bg: '#FFFBEB', border: '#FDE68A', tint: 'rgba(245,158,11,0.10)', help: 'Leiekontrakt inngått, men ikke startet. Sikret — men ikke realisert inntekt.' },
  forecast: { label: 'Prognose', dot: SLATE, text: SLATE_TEXT, bg: '#F8FAFC', border: '#E2E8F0', tint: 'rgba(148,163,184,0.12)', help: 'Estimat eller pipeline. Skal aldri leses som faktisk inntekt.' },
  cost: { label: 'Kostnad', dot: VIOLET, text: VIOLET_DEEP, bg: '#F6F3FF', border: '#E0D7FF', tint: 'rgba(124,92,240,0.10)', help: 'Faktisk annonseforbruk rapportert av Google Ads og Meta for perioden.' },
  activity: { label: 'Aktivitet', dot: '#3B82F6', text: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', tint: 'rgba(59,130,246,0.10)', help: 'Operativt måltall fra CRM — ikke et kronebeløp.' },
};

export function ratingFor(r) {
  if (r == null) return null;
  if (r >= 5) return { label: 'Verdensklasse', color: EMER_TEXT };
  if (r >= 3) return { label: 'Sunn', color: '#65A30D' };
  if (r >= 1) return { label: 'OK', color: '#D97706' };
  return { label: 'Under press', color: '#E11D48' };
}

// Nøkkeltall som kan brytes ned til kunde → enhet via /api/admin/kpi/drill.
// Må holdes i synk med DRILL_KIND i lib/kpi-drill.js.
export const DRILLABLE = new Set([
  'ltv', 'ltv_cac', 'payback', 'mrr_actual', 'activation', 'ltv_cac_contracted', 'mrr_contracted',
  'mrr_potential', 'at_risk', 'time_to_rent', 'total_customers', 'cac', 'new_customers', 'revenue',
  'ttw', 'avg_value', 'conv', 'cpl', 'new_leads', 'pipeline_value', 'tenant_demand',
]);
