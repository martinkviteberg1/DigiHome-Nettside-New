'use client';

// ---------------------------------------------------------------------------
// KPI-FORKLARINGER — «hvorfor står det dette tallet her?»
//
// Hvert nøkkeltall får en forklaring med: spørsmålet det svarer på, formelen
// med FAKTISKE tall satt inn, tallene bak, hva som er inkludert/ekskludert,
// forbehold, datakilder og drill-down til de underliggende postene.
//
// PRINSIPP: Realisert (faktisk startet leiekontrakt), kontrahert (signert, ikke
// startet) og potensial (estimat) holdes ALLTID fra hverandre. Ingen prognose
// får se ut som realisert inntekt.
// ---------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ChevronLeft, ChevronRight, Copy, Check, Calculator, Database,
  AlertTriangle, ListTree, CheckCircle2, XCircle, Link2, Info, Clock,
  Users, Home, ChevronDown, Search, Loader2, ExternalLink, Building2,
} from 'lucide-react';

const VIOLET = '#7c5cf0';
const EMER_TEXT = '#059669';

const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
const num = (v) => (v == null || !isFinite(Number(v)) ? '—' : nf0.format(Math.round(Number(v))));
const num1 = (v) => (v == null || !isFinite(Number(v)) ? '—' : nf1.format(Number(v)));
const kr = (v) => (v == null || !isFinite(Number(v)) ? '—' : `${nf0.format(Math.round(Number(v)))} kr`);
const krM = (v) => (v == null || !isFinite(Number(v)) ? '—' : `${nf0.format(Math.round(Number(v)))} kr/mnd`);
const pct = (v) => (v == null || !isFinite(Number(v)) ? '—' : `${nf1.format(Number(v))} %`);

const FMT = { kr, krM, num, num1, pct, ratio: (v) => (v == null ? '—' : `${nf1.format(Number(v))} : 1`), text: (v) => (v == null || v === '' ? '—' : String(v)) };
FMT.date = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Nøkkeltall som kan brytes ned til kunde → enhet via /api/admin/kpi/drill.
// Må holdes i synk med DRILL_KIND i lib/kpi-drill.js.
export const DRILLABLE = new Set([
  'ltv', 'ltv_cac', 'payback', 'mrr_actual', 'activation', 'ltv_cac_contracted', 'mrr_contracted',
  'mrr_potential', 'at_risk', 'time_to_rent', 'total_customers', 'cac', 'new_customers', 'revenue',
  'ttw', 'avg_value', 'conv', 'cpl', 'new_leads', 'pipeline_value', 'tenant_demand',
]);

const dateShort = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const QUALITY = {
  realised: { label: 'Realisert', dot: '#10b981', text: '#047857', bg: '#ecfdf5', border: '#a7f3d0', help: 'Faktisk startet leiekontrakt med faktisk honorar. Penger som løper nå.' },
  contracted: { label: 'Kontrahert', dot: '#f59e0b', text: '#b45309', bg: '#fffbeb', border: '#fde68a', help: 'Leiekontrakt inngått, men ikke startet. Sikret — men ikke realisert inntekt.' },
  forecast: { label: 'Prognose', dot: '#94a3b8', text: '#64748b', bg: '#f8fafc', border: '#e2e8f0', help: 'Estimat eller pipeline. Skal aldri leses som faktisk inntekt.' },
  cost: { label: 'Kostnad', dot: VIOLET, text: '#6d4ce0', bg: '#f6f3ff', border: '#e0d7ff', help: 'Faktisk annonseforbruk rapportert av Google Ads og Meta for perioden.' },
  activity: { label: 'Aktivitet', dot: '#3b82f6', text: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', help: 'Operativt måltall fra CRM — ikke et kronebeløp.' },
};

function ratingFor(ratio) {
  if (ratio == null) return null;
  if (ratio >= 5) return { label: 'Verdensklasse', color: EMER_TEXT };
  if (ratio >= 3) return { label: 'Sunn', color: '#65a30d' };
  if (ratio >= 1) return { label: 'OK', color: '#d97706' };
  return { label: 'Under press', color: '#e11d48' };
}

// ---------------------------------------------------------------------------
// BYGG FORKLARINGER fra KPI-payloaden.
// ---------------------------------------------------------------------------
export function buildExplainers(data) {
  if (!data) return [];
  const hero = data.hero || {};
  const m = data.metrics || {};
  const rm = data.revenueModel || null;
  const dq = data.dataQuality || {};
  const drill = data.drill || {};
  const per = data.period || {};
  const set = data.ltvModel || {};

  const winLabel = `${per.label || ''}${per.from ? ` · ${dateShort(per.from)} – ${dateShort(per.to)}` : ''}`;
  const ALLTIME = 'Alle tider — påvirkes ikke av periodevelgeren';
  const cac = hero.cac?.value ?? null;
  const months = rm?.lifetimeMonths || set.lifetimeMonths || 36;
  const marginPct = rm?.ltv?.grossMarginPct != null ? rm.ltv.grossMarginPct : 100;
  const hasMargin = marginPct > 0 && marginPct < 100;

  const SRC = {
    leads: 'CRM: `leads` (kun huseier-leads)',
    tenants: 'CRM: `tenant_leads`',
    contracts: 'Plattformen: leiekontrakter og forvaltningsavtaler',
    google: 'Google Ads API (kampanjenivå)',
    meta: 'Meta Marketing API (periodeforbruk)',
    platform: 'Plattformen: `platform_customers`',
    imported: 'Historisk import (`imported_leads`)',
  };

  const ownerLabel = (r) => r.owner || r.property || r.contractId || '—';

  const leaseCols = [
    { key: 'owner', label: 'Kunde', format: 'text' },
    { key: 'property', label: 'Bolig', format: 'text' },
    { key: 'monthlyRent', label: 'Leie/mnd', format: 'kr', align: 'right' },
    { key: 'feePercent', label: 'Honorar %', format: 'pct', align: 'right' },
    { key: 'fee', label: 'Honorar/mnd', format: 'kr', align: 'right', strong: true },
  ];

  const E = [];
  const push = (x) => { if (x) E.push(x); };

  // ---------------------------------------------------------------- LTV : CAC
  const r1 = ratingFor(hero.ltvCac?.value);
  push({
    id: 'ltv_cac',
    group: 'Enhetsøkonomi',
    title: 'LTV : CAC (realisert)',
    question: 'Får vi mer tilbake enn vi betaler for å skaffe en kunde?',
    value: hero.ltvCac?.value, format: 'ratio',
    quality: 'realised',
    badge: r1 ? { label: r1.label, color: r1.color } : null,
    windowLabel: winLabel,
    windowNote: 'LTV er all-time (faktiske leiekontrakter nå). CAC er kun valgt periode. Se forbehold.',
    formula: {
      text: 'LTV ÷ CAC',
      terms: [
        { label: 'LTV (realisert)', value: kr(hero.ltvCac?.ltv) },
        { op: '÷', label: 'CAC', value: kr(cac) },
      ],
      result: hero.ltvCac?.value != null ? `${num1(hero.ltvCac.value)} : 1` : '—',
    },
    inputs: [
      { label: 'LTV per kunde (realisert)', value: kr(hero.ltvCac?.ltv), note: 'faktisk honorar × levetid × margin' },
      { label: 'CAC i perioden', value: kr(cac), note: 'annonseforbruk ÷ nye kunder' },
      { label: 'Benchmark', value: 'Sunn > 3 : 1 · Verdensklasse > 5 : 1' },
    ],
    includes: [
      'LTV: kun kunder med faktisk startet leiekontrakt og faktisk honorar.',
      'CAC: alt annonseforbruk (Google + Meta) i perioden, delt på nye kunder i samme periode.',
    ],
    excludes: [
      'Estimert leie fra forvaltningsavtaler uten leiekontrakt.',
      'Signerte leiekontrakter som ikke har startet (vises som eget tall: LTV : CAC inkl. kontrahert).',
      'Leietaker-leads — de er etterspørselssiden, ikke betalende kunder.',
    ],
    caveats: [
      `Ulik tidshorisont: LTV ser ${months} måneder fram, CAC måler bare ${per.days || '—'} dager tilbake. Forholdstallet er derfor en indikator, ikke en kontantstrøm.`,
      `Levetiden på ${months} måneder er en antakelse så lenge vi ikke har nok churn-data. Se sensitivitet i inntektskvalitet-panelet.`,
      cac == null ? 'CAC mangler for perioden (ingen nye kunder eller ingen annonseforbruk) — da kan forholdstallet ikke regnes.' : null,
    ].filter(Boolean),
    sources: [SRC.contracts, SRC.google, SRC.meta, SRC.leads],
    links: [{ id: 'ltv', label: 'LTV' }, { id: 'cac', label: 'CAC' }, { id: 'ltv_cac_contracted', label: 'Inkl. kontrahert' }],
  });

  // -------------------------------------------- LTV : CAC inkl. kontraherte
  const r2 = ratingFor(hero.ltvCacContracted?.value);
  if (hero.ltvCacContracted?.ltv != null) push({
    id: 'ltv_cac_contracted',
    group: 'Enhetsøkonomi',
    title: 'LTV : CAC (inkl. kontrahert)',
    question: 'Hvordan ser enhetsøkonomien ut når signert, men ikke startet leie tas med?',
    value: hero.ltvCacContracted?.value, format: 'ratio',
    quality: 'contracted',
    badge: r2 ? { label: r2.label, color: r2.color } : null,
    windowLabel: winLabel,
    windowNote: 'Framoverskuende variant. Vises ved siden av realisert — aldri i stedet for.',
    formula: {
      text: 'LTV (inkl. kontrahert) ÷ CAC',
      terms: [
        { label: 'LTV inkl. kontrahert', value: kr(hero.ltvCacContracted?.ltv) },
        { op: '÷', label: 'CAC', value: kr(cac) },
      ],
      result: hero.ltvCacContracted?.value != null ? `${num1(hero.ltvCacContracted.value)} : 1` : '—',
    },
    inputs: [
      { label: 'Honorar per kunde m/ leiekontrakt', value: krM(hero.ltvCacContracted?.monthlyFee), note: '(faktisk MRR + kontrahert MRR) ÷ kunder med leiekontrakt' },
      { label: 'Kunder med leiekontrakt', value: num(hero.ltvCacContracted?.customersWithLease), note: 'startet eller signert' },
      { label: 'Levetid', value: `${num(months)} mnd` },
      { label: 'LTV inkl. kontrahert', value: kr(hero.ltvCacContracted?.ltv) },
      { label: 'CAC i perioden', value: kr(cac) },
    ],
    includes: [
      'Faktiske, startede leiekontrakter.',
      'Signerte leiekontrakter som ennå ikke har startet.',
    ],
    excludes: ['Estimert leie fra forvaltningsavtaler uten leiekontrakt (det er potensial, ikke kontrakt).'],
    caveats: [
      'Dette tallet er IKKE realisert inntekt. Bruk realisert LTV : CAC når du rapporterer faktisk drift.',
      'Nyttig når få kunder har startet leie ennå — da blir realisert LTV svært følsom for enkeltkontrakter.',
    ],
    sources: [SRC.contracts, SRC.google, SRC.meta],
    drill: rm?.breakdown?.contracted?.length ? {
      title: `Kontraherte leiekontrakter (${num(rm.tiers?.contracted?.count)})`,
      note: 'Signert, men ikke startet. Disse løftes inn i tallet over.',
      columns: [...leaseCols, { key: 'startDate', label: 'Starter', format: 'text' }],
      rows: rm.breakdown.contracted.map((r) => ({ ...r, owner: ownerLabel(r) })),
    } : null,
    links: [{ id: 'ltv_cac', label: 'Realisert' }, { id: 'mrr_contracted', label: 'Kontrahert MRR' }],
  });

  // ------------------------------------------------------------------- LTV
  const basis = hero.ltv?.basis || 'actual';
  const ltvFormula = basis === 'actual'
    ? {
      text: 'faktisk honorar per kunde × levetid × bruttomargin',
      terms: [
        { label: 'Honorar per kunde', value: krM(rm?.ltv?.monthlyFee) },
        { op: '×', label: 'Levetid', value: `${num(months)} mnd` },
        { op: '×', label: 'Bruttomargin', value: hasMargin ? `${num(marginPct)} %` : '100 % (omsetning)' },
      ],
      result: kr(hero.ltv?.value),
    }
    : basis === 'recurring'
      ? {
        text: 'manuelt månedshonorar × levetid × bruttomargin',
        terms: [
          { label: 'Månedshonorar (manuelt)', value: krM(set.monthlyFee) },
          { op: '×', label: 'Levetid', value: `${num(months)} mnd` },
          { op: '×', label: 'Bruttomargin', value: hasMargin ? `${num(marginPct)} %` : '100 %' },
        ],
        result: kr(hero.ltv?.value),
      }
      : {
        text: 'snitt registrert kontraktsverdi',
        terms: [
          { label: 'Registrert kundeverdi (sum)', value: kr(m.totalRevenueAllTime?.value) },
          { op: '÷', label: 'Kunder med verdi', value: num(hero.avgCustomerValue?.basedOn) },
        ],
        result: kr(hero.ltv?.value),
      };
  push({
    id: 'ltv',
    group: 'Enhetsøkonomi',
    title: 'LTV — livstidsverdi per kunde',
    question: 'Hvor mye honorar gir én kunde oss over hele kundeforholdet?',
    value: hero.ltv?.value, format: 'kr', suffix: 'kr',
    quality: basis === 'actual' ? 'realised' : basis === 'recurring' ? 'forecast' : 'forecast',
    windowLabel: basis === 'actual' ? 'Nåsituasjon — alle løpende leiekontrakter' : ALLTIME,
    windowNote: basis === 'actual'
      ? 'Bygget på leiekontrakter som løper NÅ, uavhengig av valgt periode.'
      : 'LTV-modus er ikke «Faktisk honorar» — endre under Forutsetninger for å bruke faktiske leiekontrakter.',
    formula: ltvFormula,
    inputs: basis === 'actual' ? [
      { label: 'Faktisk MRR (sum honorar)', value: krM(rm?.mrr?.actual), note: `${num(rm?.tiers?.actual?.count)} startede leiekontrakter` },
      { label: 'Kunder med leieinntekt', value: num(rm?.customers?.earning) },
      { label: 'Honorar per kunde', value: krM(rm?.ltv?.monthlyFee), note: 'faktisk MRR ÷ kunder med leieinntekt' },
      { label: 'Antatt levetid', value: `${num(months)} mnd`, note: 'settes under Forutsetninger' },
      { label: 'Bruttomargin', value: hasMargin ? `${num(marginPct)} %` : '100 % — LTV vises som omsetning' },
      ...(rm?.ltv?.sensitivity || []).map((s) => ({ label: `Sensitivitet · ${s.months} mnd levetid`, value: kr(s.ltv), muted: true })),
    ] : [
      { label: 'Sum registrert kundeverdi', value: kr(m.totalRevenueAllTime?.value) },
      { label: 'Kunder med registrert verdi', value: num(hero.avgCustomerValue?.basedOn) },
    ],
    includes: basis === 'actual' ? [
      `Leiekontrakter etter regelen: ${rm?.ruleLabel || 'signert og startet'}.`,
      'Faktisk avtalt månedsleie × faktisk honorarsats fra plattformen.',
    ] : ['Registrert kundeverdi på vunne leads.'],
    excludes: basis === 'actual' ? [
      'Estimert leie ved forvaltningsavtale — det er potensial, ikke honorar.',
      'Signerte leiekontrakter som ikke har startet (vises som kontrahert).',
      'Avsluttede/utløpte kontrakter.',
    ] : ['—'],
    caveats: [
      `Levetid på ${num(months)} mnd er en antakelse. Justér når vi har reelle churn-data.`,
      !hasMargin ? 'Bruttomargin er ikke satt, så LTV vises som omsetning — ikke bruttofortjeneste.' : null,
      (rm?.customers?.earning || 0) > 0 && (rm.customers.earning < 10) ? `Kun ${num(rm.customers.earning)} kunder med leieinntekt — snittet er følsomt for enkeltkontrakter.` : null,
    ].filter(Boolean),
    sources: [SRC.contracts],
    drill: rm?.breakdown?.actual?.length ? {
      title: `Leiekontrakter som utgjør honoraret (${num(rm.tiers?.actual?.count)})`,
      note: 'Faktisk startet og løpende. Summen av honorar/mnd = faktisk MRR.',
      columns: leaseCols,
      rows: rm.breakdown.actual.map((r) => ({ ...r, owner: ownerLabel(r) })),
      totalRow: { fee: rm.mrr?.actual },
    } : null,
    links: [{ id: 'ltv_cac', label: 'LTV : CAC' }, { id: 'mrr_actual', label: 'Realisert MRR' }, { id: 'payback', label: 'Payback' }],
  });

  // ------------------------------------------------------------------- CAC
  push({
    id: 'cac',
    group: 'Annonseøkonomi',
    title: 'CAC — kost per ny kunde',
    question: 'Hva koster det i annonsekroner å skaffe én ny kunde?',
    value: cac, format: 'kr', suffix: 'kr', inverse: true,
    quality: 'cost',
    windowLabel: winLabel,
    windowNote: 'Forbruk og kunder måles på nøyaktig samme kalenderdager.',
    formula: {
      text: 'annonseforbruk i perioden ÷ nye kunder i perioden',
      terms: [
        { label: 'Annonseforbruk', value: kr(m.spend?.total) },
        { op: '÷', label: 'Nye kunder', value: num(m.newCustomers?.value) },
      ],
      result: kr(cac),
    },
    inputs: [
      { label: 'Google Ads', value: kr(m.spend?.google), note: drill.spendSources?.googleBasis === 'campaign' ? 'kampanjenivå (autoritativt)' : 'annonsenivå' },
      { label: 'Meta', value: kr(m.spend?.meta), note: 'periodeforbruk, uten livstids-fallback' },
      { label: 'Sum forbruk', value: kr(m.spend?.total), strong: true },
      { label: 'Nye kunder i perioden', value: num(m.newCustomers?.value), note: 'status = vunnet, med vunnet-dato i perioden' },
      { label: 'Forrige periode', value: `${num(m.newCustomers?.prev)} kunder`, muted: true },
    ],
    includes: [
      'Alt betalt forbruk i Google Ads og Meta i perioden.',
      'Alle nye huseier-kunder som ble vunnet i perioden — uansett kanal.',
    ],
    excludes: [
      'Lønn, verktøy og annen anskaffelseskostnad (dette er ren annonse-CAC).',
      'Leietaker-leads og kontaktskjema.',
      'Historisk importerte kunder fra før sporing.',
    ],
    caveats: [
      'Kunder fra organisk/henvisning teller i nevneren selv om de ikke kostet annonsekroner. Det gjør CAC lavere enn en ren betalt-CAC.',
      'Kort periode + få kunder gir stort utslag. Bruk 90 dager eller lengre for en stabil CAC.',
      drill.spendSources?.googleDelta != null && Math.abs(drill.spendSources.googleDelta) > 1 ? `Google: avvik på ${kr(drill.spendSources.googleDelta)} mellom kampanje- og annonsenivå (PMax/Demand Gen rapporterer ikke på annonsenivå).` : null,
    ].filter(Boolean),
    sources: [SRC.google, SRC.meta, SRC.leads],
    drill: (drill.wonInPeriod || []).length ? {
      title: `Nye kunder i perioden (${num(drill.wonInPeriodTotal)})`,
      note: 'Dette er nevneren i CAC. Verdi = registrert kundeverdi ved signering (estimat).',
      columns: [
        { key: 'name', label: 'Kunde', format: 'text' },
        { key: 'wonAt', label: 'Vunnet', format: 'text' },
        { key: 'channel', label: 'Kanal', format: 'text' },
        { key: 'daysToWin', label: 'Dager', format: 'num1', align: 'right' },
        { key: 'value', label: 'Registrert verdi', format: 'kr', align: 'right', strong: true },
      ],
      rows: drill.wonInPeriod,
    } : null,
    links: [{ id: 'cpl', label: 'CPL' }, { id: 'spend', label: 'Annonseforbruk' }, { id: 'payback', label: 'Payback' }],
  });

  // ------------------------------------------------------------------- CPL
  push({
    id: 'cpl',
    group: 'Annonseøkonomi',
    title: 'CPL — kost per lead',
    question: 'Hva koster én ny huseier-henvendelse?',
    value: hero.cpl?.value, format: 'kr', suffix: 'kr', inverse: true,
    quality: 'cost',
    windowLabel: winLabel,
    formula: {
      text: 'annonseforbruk i perioden ÷ nye huseier-leads i perioden',
      terms: [
        { label: 'Annonseforbruk', value: kr(m.spend?.total) },
        { op: '÷', label: 'Nye huseier-leads', value: num(m.newLeads?.value) },
      ],
      result: kr(hero.cpl?.value),
    },
    inputs: [
      { label: 'Annonseforbruk', value: kr(m.spend?.total) },
      { label: 'Nye huseier-leads', value: num(m.newLeads?.value) },
      { label: 'Leietaker-leads (holdes utenfor)', value: num(m.newTenantLeads?.value), muted: true },
      { label: 'Konvertering lead → kunde', value: pct(hero.conversionRate?.value), muted: true },
    ],
    includes: ['Huseier-leads opprettet i perioden (skjema, ringeforespørsel, kampanjeside).'],
    excludes: [
      'Kontaktskjema/generelle henvendelser.',
      'Leietaker-leads (etterspørselssiden).',
      'CRM-dubletter (`mirrored`) og arkiverte leads.',
    ],
    caveats: [
      'Organiske leads teller i nevneren selv om de ikke kostet annonsekroner — reell betalt CPL er høyere.',
      'CPL alene sier ingenting om kvalitet. Les den alltid sammen med konverteringsrate og CAC.',
    ],
    sources: [SRC.google, SRC.meta, SRC.leads],
    drill: (drill.campaigns || []).length ? {
      title: 'Forbruk per kampanje/annonse i perioden',
      note: 'Topp 8 etter forbruk. «Konv.» er plattformens egen konverteringstelling, ikke våre CRM-leads.',
      columns: [
        { key: 'channel', label: 'Kanal', format: 'text' },
        { key: 'name', label: 'Kampanje', format: 'text' },
        { key: 'clicks', label: 'Klikk', format: 'num', align: 'right' },
        { key: 'conversions', label: 'Konv.', format: 'num1', align: 'right' },
        { key: 'cost', label: 'Forbruk', format: 'kr', align: 'right', strong: true },
      ],
      rows: drill.campaigns,
      totalRow: { cost: m.spend?.total },
    } : null,
    links: [{ id: 'cac', label: 'CAC' }, { id: 'conv', label: 'Konvertering' }],
  });

  // --------------------------------------------------------------- Payback
  const pb = m.paybackMonths?.basis || {};
  push({
    id: 'payback',
    group: 'Enhetsøkonomi',
    title: 'Payback — tilbakebetalingstid',
    question: 'Hvor lang tid går det før en ny kunde har betalt tilbake anskaffelseskosten?',
    value: m.paybackMonths?.value, format: 'num1', suffix: 'mnd', inverse: true,
    quality: 'realised',
    windowLabel: winLabel,
    formula: {
      text: 'CAC ÷ månedlig bruttofortjeneste  +  ventetid til første leieinntekt',
      terms: [
        { label: 'CAC', value: kr(pb.cac ?? cac) },
        { op: '÷', label: 'Honorar/mnd', value: krM(pb.monthlyGrossProfit ?? pb.monthlyFee) },
        { op: '+', label: 'Ventetid', value: `${num1(pb.waitMonths)} mnd` },
      ],
      result: m.paybackMonths?.value != null ? `${num1(m.paybackMonths.value)} mnd` : '—',
    },
    inputs: [
      { label: 'CAC', value: kr(pb.cac ?? cac) },
      { label: 'Honorar per kunde', value: krM(pb.monthlyFee) },
      { label: 'Bruttomargin', value: pb.marginPct != null ? `${num(pb.marginPct)} %` : '100 %' },
      { label: 'Månedlig bruttofortjeneste', value: krM(pb.monthlyGrossProfit), strong: true },
      { label: 'Median tid forvaltningsavtale → første leieinntekt', value: pb.daysToFirstLease != null ? `${num1(pb.daysToFirstLease)} dager` : '—', note: 'legges til som ventetid' },
    ],
    includes: ['Faktisk honorar fra startede leiekontrakter.', 'Reell ventetid før første leieinntekt.'],
    excludes: ['Estimert leie.', 'Andre kostnader enn annonseforbruk.'],
    caveats: [
      'Ventetiden er en median over få kunder og vil bevege seg mye i starten.',
      'Ved kort payback (< 12 mnd) er vekst normalt lønnsomt å skalere.',
    ],
    sources: [SRC.contracts, SRC.google, SRC.meta],
    links: [{ id: 'cac', label: 'CAC' }, { id: 'ltv', label: 'LTV' }, { id: 'time_to_rent', label: 'Tid til leieinntekt' }],
  });

  // ------------------------------------------------------------------ ROAS
  push({
    id: 'roas',
    group: 'Annonseøkonomi',
    title: 'ROAS (ekte)',
    question: 'Hvor mange kroner registrert kundeverdi får vi per annonsekrone?',
    value: m.roasTrue?.value, format: 'num1', suffix: 'x',
    quality: 'forecast',
    windowLabel: winLabel,
    formula: {
      text: 'registrert kundeverdi i perioden ÷ annonseforbruk i perioden',
      terms: [
        { label: 'Registrert kundeverdi', value: kr(m.revenue?.value) },
        { op: '÷', label: 'Annonseforbruk', value: kr(m.spend?.total) },
      ],
      result: m.roasTrue?.value != null ? `${num1(m.roasTrue.value)}x` : '—',
    },
    inputs: [
      { label: 'Registrert kundeverdi i perioden', value: kr(m.revenue?.value), note: 'estimert årshonorar satt ved signering' },
      { label: 'Annonseforbruk', value: kr(m.spend?.total) },
      { label: 'ROAS rapportert av annonseplattformene', value: m.roasAds?.value != null ? `${num1(m.roasAds.value)}x` : '—', muted: true, note: 'plattformenes egen konverteringsverdi' },
    ],
    includes: ['Kundeverdi registrert på leads som ble vunnet i perioden.'],
    excludes: ['Faktisk honorar fra leiekontrakter — det ligger i LTV og MRR, ikke her.'],
    caveats: [
      'Kundeverdien her er et ESTIMAT satt ved signering av huseierkontrakten, ikke fasit fra leiekontrakt.',
      'ROAS og LTV : CAC har ulik tidshorisont og skal ikke sammenlignes direkte.',
    ],
    sources: [SRC.leads, SRC.google, SRC.meta],
    links: [{ id: 'ltv_cac', label: 'LTV : CAC' }, { id: 'avg_value', label: 'Snitt kundeverdi' }],
  });

  // ------------------------------------------------------- Snitt kundeverdi
  push({
    id: 'avg_value',
    group: 'Kunder',
    title: 'Snitt kundeverdi',
    question: 'Hva er den gjennomsnittlige registrerte verdien per kunde?',
    value: hero.avgCustomerValue?.value, format: 'kr', suffix: 'kr',
    quality: 'forecast',
    windowLabel: ALLTIME,
    formula: {
      text: 'sum registrert kundeverdi ÷ kunder med registrert verdi',
      terms: [
        { label: 'Sum kundeverdi', value: kr(m.totalRevenueAllTime?.value) },
        { op: '÷', label: 'Kunder med verdi', value: num(hero.avgCustomerValue?.basedOn) },
      ],
      result: kr(hero.avgCustomerValue?.value),
    },
    inputs: [
      { label: 'Sum registrert kundeverdi', value: kr(m.totalRevenueAllTime?.value) },
      { label: 'Kunder totalt', value: num(m.totalCustomers?.value), note: `${num(m.totalCustomers?.tracked)} sporet + ${num(m.totalCustomers?.historical)} historisk` },
      { label: 'Kunder MED registrert verdi', value: num(hero.avgCustomerValue?.basedOn), strong: true },
      { label: 'Kunder UTEN registrert verdi', value: num(hero.avgCustomerValue?.missingValue), note: 'holdes utenfor nevneren' },
    ],
    includes: ['Sporede kunder og historisk importerte kunder — hele kundebasen.'],
    excludes: ['Kunder uten registrert verdi (ville dratt snittet kunstig ned).'],
    caveats: [
      'Verdien er estimert årshonorar satt ved signering — ikke fasit fra leiekontrakt.',
      hero.avgCustomerValue?.missingValue > 0 ? `${num(hero.avgCustomerValue.missingValue)} kunder mangler registrert verdi. Fyll dem inn for et riktigere snitt.` : null,
    ].filter(Boolean),
    sources: [SRC.leads, SRC.imported],
    links: [{ id: 'ltv', label: 'LTV' }, { id: 'total_customers', label: 'Total kunder' }],
  });

  // --------------------------------------------------------- Tid til kunde
  push({
    id: 'ttw',
    group: 'Salg',
    title: 'Tid til kunde',
    question: 'Hvor lang tid går det fra henvendelse til signert huseierkontrakt?',
    value: hero.timeToWin?.value, format: 'num1', suffix: 'dager', inverse: true,
    quality: 'activity',
    windowLabel: winLabel,
    formula: {
      text: 'snitt av (vunnet-dato − opprettet-dato) for kunder vunnet i perioden',
      terms: [
        { label: 'Kunder med målbar tid', value: num(hero.timeToWin?.sampleSize) },
        { op: '→', label: 'Snitt', value: hero.timeToWin?.value != null ? `${num1(hero.timeToWin.value)} dager` : '—' },
      ],
      result: hero.timeToWin?.value != null ? `${num1(hero.timeToWin.value)} dager` : '—',
    },
    inputs: [
      { label: 'Nye kunder i perioden', value: num(m.newCustomers?.value) },
      { label: 'Antall i utvalget', value: num(hero.timeToWin?.sampleSize), note: 'kun leads der begge datoer finnes' },
    ],
    includes: ['Huseier-leads som fikk status «vunnet» i perioden.'],
    excludes: ['Forløp over 730 dager (regnes som datastøy).', 'Kunder importert historisk uten opprettelsesdato.'],
    caveats: [
      'Leads som er registrert manuelt etter at avtalen var i boks får 0 dager og trekker snittet ned.',
      'Dette måler tid til HUSEIERKONTRAKT, ikke tid til første leieinntekt.',
    ],
    sources: [SRC.leads],
    drill: (drill.wonInPeriod || []).length ? {
      title: 'Kunder vunnet i perioden',
      note: '«Dager» = tid fra lead opprettet til vunnet.',
      columns: [
        { key: 'name', label: 'Kunde', format: 'text' },
        { key: 'wonAt', label: 'Vunnet', format: 'text' },
        { key: 'channel', label: 'Kanal', format: 'text' },
        { key: 'daysToWin', label: 'Dager', format: 'num1', align: 'right', strong: true },
      ],
      rows: drill.wonInPeriod,
    } : null,
    links: [{ id: 'time_to_rent', label: 'Tid til leieinntekt' }, { id: 'response', label: 'Responstid' }],
  });

  // ----------------------------------------------------- Konverteringsrate
  const cb = hero.conversionRate?.basis || {};
  push({
    id: 'conv',
    group: 'Salg',
    title: 'Konverteringsrate',
    question: 'Hvor stor andel av huseier-leadene blir kunder?',
    value: hero.conversionRate?.value, format: 'num1', suffix: '%',
    delta: hero.conversionRate?.delta,
    quality: 'activity',
    windowLabel: winLabel,
    formula: {
      text: 'nye kunder i perioden ÷ nye huseier-leads i perioden',
      terms: [
        { label: 'Nye kunder', value: num(cb.customers ?? m.newCustomers?.value) },
        { op: '÷', label: 'Nye leads', value: num(cb.leads ?? m.newLeads?.value) },
      ],
      result: hero.conversionRate?.value != null ? `${num1(hero.conversionRate.value)} %` : '—',
    },
    inputs: [
      { label: 'Nye kunder i perioden', value: num(cb.customers) },
      { label: 'Nye huseier-leads i perioden', value: num(cb.leads) },
      { label: 'Forrige periode', value: `${num(cb.prevCustomers)} / ${num(cb.prevLeads)} = ${pct(cb.prevPct)}`, muted: true },
    ],
    includes: ['Kun huseier-leads.'],
    excludes: ['Kontaktskjema, leietaker-leads, dubletter og arkiverte leads.'],
    caveats: [
      'Teller og nevner er fra samme periode, men et lead fra forrige periode kan bli kunde i denne — det gir «over 100 %»-effekter i korte vinduer.',
      'Bruk konverteringstrakten under for kohort-riktig bilde over tid.',
    ],
    sources: [SRC.leads],
    links: [{ id: 'cpl', label: 'CPL' }, { id: 'new_customers', label: 'Nye kunder' }],
  });

  // ---------------------------------------------------------- Nye kunder
  push({
    id: 'new_customers',
    group: 'Kunder',
    title: 'Nye kunder',
    question: 'Hvor mange nye huseiere signerte i perioden?',
    value: m.newCustomers?.value, format: 'num', delta: m.newCustomers?.delta,
    quality: 'activity',
    windowLabel: winLabel,
    formula: {
      text: 'antall huseier-leads med status «vunnet» og vunnet-dato i perioden',
      terms: [
        { label: 'Denne perioden', value: num(m.newCustomers?.value) },
        { op: 'vs', label: 'Forrige periode', value: num(m.newCustomers?.prev) },
      ],
      result: num(m.newCustomers?.value),
    },
    inputs: [
      { label: 'Nye kunder', value: num(m.newCustomers?.value) },
      { label: 'Forrige periode', value: num(m.newCustomers?.prev), muted: true },
      { label: 'Nye huseier-leads', value: num(m.newLeads?.value) },
      { label: 'Registrert verdi i perioden', value: kr(m.revenue?.value) },
    ],
    includes: ['Vunnet-dato (`wonAt`) må ligge i perioden.'],
    excludes: ['Historisk importerte kunder uten vunnet-dato.', 'Leietakere.'],
    caveats: ['«Vunnet» betyr signert huseierkontrakt — ikke at leiekontrakt er inngått eller at honorar har begynt å løpe.'],
    sources: [SRC.leads],
    drill: (drill.wonInPeriod || []).length ? {
      title: `Nye kunder i perioden (${num(drill.wonInPeriodTotal)})`,
      columns: [
        { key: 'name', label: 'Kunde', format: 'text' },
        { key: 'wonAt', label: 'Vunnet', format: 'text' },
        { key: 'channel', label: 'Kanal', format: 'text' },
        { key: 'value', label: 'Registrert verdi', format: 'kr', align: 'right', strong: true },
      ],
      rows: drill.wonInPeriod,
    } : null,
    links: [{ id: 'conv', label: 'Konvertering' }, { id: 'cac', label: 'CAC' }],
  });

  // ------------------------------------------------- Registrert kundeverdi
  push({
    id: 'revenue',
    group: 'Kunder',
    title: 'Registrert kundeverdi i perioden',
    question: 'Hvor mye verdi ble registrert på kundene som signerte i perioden?',
    value: m.revenue?.value, format: 'kr', suffix: 'kr', delta: m.revenue?.delta,
    quality: 'forecast',
    windowLabel: winLabel,
    windowNote: 'Dette er estimert verdi satt ved signering — ikke fakturert omsetning.',
    formula: {
      text: 'sum registrert kundeverdi for kunder vunnet i perioden',
      terms: [
        { label: 'Nye kunder', value: num(m.newCustomers?.value) },
        { op: '→', label: 'Sum verdi', value: kr(m.revenue?.value) },
      ],
      result: kr(m.revenue?.value),
    },
    inputs: [
      { label: 'Registrert verdi i perioden', value: kr(m.revenue?.value), strong: true },
      { label: 'Forrige periode', value: kr(m.revenue?.prev), muted: true },
      { label: 'Nye kunder', value: num(m.newCustomers?.value) },
      { label: 'Verdi per kunde', value: (m.newCustomers?.value || 0) > 0 ? kr((m.revenue?.value || 0) / m.newCustomers.value) : '—' },
      { label: 'Realisert MRR (fasit)', value: krM(rm?.mrr?.actual), note: 'faktisk honorar fra leiekontrakter', muted: true },
    ],
    includes: ['Verdi registrert på leadet ved signering av huseierkontrakt.'],
    excludes: [
      'Faktisk fakturert honorar — det ligger i realisert MRR.',
      'Kunder uten registrert verdi bidrar med 0 kr.',
    ],
    caveats: [
      'Dette er et ESTIMAT (estimert leie × honorarsats × 12), ikke inntekt. Fasit kommer først når leiekontrakten er inngått.',
      'Bruk realisert MRR / LTV når du snakker om faktiske penger.',
    ],
    sources: [SRC.leads],
    drill: (drill.wonInPeriod || []).length ? {
      title: `Kunder vunnet i perioden (${num(drill.wonInPeriodTotal)})`,
      columns: [
        { key: 'name', label: 'Kunde', format: 'text' },
        { key: 'wonAt', label: 'Vunnet', format: 'text' },
        { key: 'channel', label: 'Kanal', format: 'text' },
        { key: 'value', label: 'Registrert verdi', format: 'kr', align: 'right', strong: true },
      ],
      rows: drill.wonInPeriod,
      totalRow: { value: m.revenue?.value },
    } : null,
    links: [{ id: 'mrr_actual', label: 'Realisert MRR' }, { id: 'avg_value', label: 'Snitt kundeverdi' }],
  });

  // -------------------------------------------------------- Annonseforbruk
  const ss = drill.spendSources || m.spend?.sources || {};
  push({
    id: 'spend',
    group: 'Annonseøkonomi',
    title: 'Annonseforbruk',
    question: 'Hvor mye betalte vi for annonser i perioden — og hvor kommer tallet fra?',
    value: m.spend?.total, format: 'kr', suffix: 'kr', inverse: true,
    quality: 'cost',
    windowLabel: winLabel,
    formula: {
      text: 'Google (kampanjenivå) + Meta (periodeforbruk)',
      terms: [
        { label: 'Google Ads', value: kr(m.spend?.google) },
        { op: '+', label: 'Meta', value: kr(m.spend?.meta) },
      ],
      result: kr(m.spend?.total),
    },
    inputs: [
      { label: 'Google — grunnlag', value: ss.googleBasis === 'campaign' ? 'kampanjenivå (autoritativt)' : 'annonsenivå (fallback)' },
      { label: 'Google — kampanjenivå', value: kr(ss.googleCampaignLevel) },
      { label: 'Google — annonsenivå', value: kr(ss.googleAdLevel), muted: true },
      { label: 'Google — avvik', value: kr(ss.googleDelta), note: 'PMax/Demand Gen rapporterer ikke per annonse', muted: true },
      { label: 'Meta — annonsenivå', value: kr(ss.metaAdLevel) },
      { label: 'Meta livstids-fallback', value: ss.metaLifetimeFallback ? 'PÅ' : 'AV (riktig)' },
    ],
    includes: ['Alt forbruk rapportert for de valgte kalenderdagene.'],
    excludes: [
      'Livstidsforbruk fra pausede Meta-annonser (blåste tidligere opp totalen kraftig).',
      'Andre kanaler enn Google og Meta.',
    ],
    caveats: [
      'Annonseplattformene etterjusterer forbruk 1–3 døgn. Ferske tall kan endre seg litt.',
      'Forbruket er hentet med 5 minutters mellomlagring for å spare API-kall.',
    ],
    sources: [SRC.google, SRC.meta],
    drill: (drill.campaigns || []).length ? {
      title: 'Topp kampanjer etter forbruk',
      columns: [
        { key: 'channel', label: 'Kanal', format: 'text' },
        { key: 'name', label: 'Kampanje', format: 'text' },
        { key: 'clicks', label: 'Klikk', format: 'num', align: 'right' },
        { key: 'conversions', label: 'Konv.', format: 'num1', align: 'right' },
        { key: 'cost', label: 'Forbruk', format: 'kr', align: 'right', strong: true },
      ],
      rows: drill.campaigns,
      totalRow: { cost: m.spend?.total },
    } : null,
    links: [{ id: 'cac', label: 'CAC' }, { id: 'cpl', label: 'CPL' }],
  });

  // --------------------------------------------- MRR: realisert/kontrahert/pot
  if (rm?.hasData) {
    const ltvActual = rm.ltv?.value ?? null;
    push({
      id: 'mrr_actual',
      group: 'Inntektskvalitet',
      title: 'Realisert MRR — faktisk honorar',
      question: 'Hvor mye honorar løper faktisk inn hver måned nå?',
      value: rm.mrr?.actual, format: 'kr', suffix: 'kr/mnd',
      quality: 'realised',
      windowLabel: 'Nåsituasjon — løpende leiekontrakter',
      windowNote: 'Uavhengig av periodevelgeren. Dette er hva som faktisk løper i dag.',
      formula: {
        text: 'sum av (månedsleie × honorarsats) for startede, løpende leiekontrakter',
        terms: [
          { label: 'Startede leiekontrakter', value: num(rm.tiers?.actual?.count) },
          { op: '→', label: 'Sum honorar', value: krM(rm.mrr?.actual) },
        ],
        result: krM(rm.mrr?.actual),
      },
      inputs: [
        { label: 'Realisert MRR', value: krM(rm.mrr?.actual), strong: true },
        { label: 'Realisert ARR', value: kr(rm.tiers?.actual?.arr), note: 'MRR × 12' },
        { label: 'Kunder med leieinntekt', value: num(rm.customers?.earning) },
        { label: 'Honorar per kunde', value: krM(rm.customers?.feePerEarningCustomer) },
        { label: 'LTV per kunde (realisert)', value: kr(ltvActual), note: `× ${num(months)} mnd` },
        { label: 'Inntektskvalitet', value: pct(rm.revenueQualityPct), note: 'realisert andel av total pipeline' },
        { label: 'MRR i faresonen (90 d)', value: krM(rm.mrr?.atRisk90d), muted: true },
      ],
      includes: [`Leiekontrakter etter regelen: ${rm.ruleLabel}.`, 'Kun kontrakter som ikke er utløpt/avsluttet.'],
      excludes: ['Signert, ikke startet leie.', 'Estimert leie fra forvaltningsavtaler.'],
      caveats: [
        'Plattformens eget MRR-tall inkluderer estimert leie på enheter uten leiekontrakt og er derfor høyere. Vi rapporterer realisert her.',
        'Honorarsats hentes per kontrakt — den varierer mellom kunder.',
      ],
      sources: [SRC.contracts],
      drill: rm.breakdown?.actual?.length ? {
        title: `Startede leiekontrakter (${num(rm.tiers?.actual?.count)})`,
        columns: leaseCols,
        rows: rm.breakdown.actual.map((r) => ({ ...r, owner: ownerLabel(r) })),
        totalRow: { fee: rm.mrr?.actual },
      } : null,
      links: [{ id: 'mrr_contracted', label: 'Kontrahert' }, { id: 'mrr_potential', label: 'Potensial' }, { id: 'ltv', label: 'LTV' }],
    });

    push({
      id: 'mrr_contracted',
      group: 'Inntektskvalitet',
      title: 'Kontrahert MRR — sikret, ikke startet',
      question: 'Hvor mye honorar er signert, men har ikke begynt å løpe ennå?',
      value: rm.mrr?.contracted, format: 'kr', suffix: 'kr/mnd',
      quality: 'contracted',
      windowLabel: 'Nåsituasjon — signerte leiekontrakter med fremtidig start',
      windowNote: 'Dette er IKKE realisert inntekt. Det er sikret, og starter på oppgitt dato.',
      formula: {
        text: 'sum av (månedsleie × honorarsats) for signerte leiekontrakter som ikke har startet',
        terms: [
          { label: 'Kontrakter', value: num(rm.tiers?.contracted?.count) },
          { op: '→', label: 'Sum honorar', value: krM(rm.mrr?.contracted) },
        ],
        result: krM(rm.mrr?.contracted),
      },
      inputs: [
        { label: 'Kontrahert MRR', value: krM(rm.mrr?.contracted), strong: true },
        { label: 'Kontrahert ARR', value: kr(rm.tiers?.contracted?.arr) },
        { label: 'Kunder som bare har kontrahert leie', value: num(rm.customers?.contractedOnly) },
        { label: 'LTV inkl. kontrahert', value: kr(rm.ltv?.contractedBasis?.value), note: `${krM(rm.ltv?.contractedBasis?.monthlyFee)} × ${num(months)} mnd` },
        ...(rm.ramp || []).map((r) => ({ label: `MRR om ${r.inDays} dager`, value: krM(r.mrr), note: r.startingCount ? `+${num(r.startingCount)} kontrakt(er) starter` : 'ingen nye starter', muted: true })),
      ],
      includes: ['Signerte leiekontrakter med startdato i framtiden.'],
      excludes: ['Estimert leie uten leiekontrakt.', 'Kontrakter som allerede har startet (de er realisert).'],
      caveats: [
        'Rapporter dette separat fra realisert MRR. Summér dem aldri til «omsetning».',
        'En signert kontrakt kan fortsatt falle bort før innflytting.',
      ],
      sources: [SRC.contracts],
      drill: rm.breakdown?.contracted?.length ? {
        title: `Kontraherte leiekontrakter (${num(rm.tiers?.contracted?.count)})`,
        columns: [...leaseCols, { key: 'startDate', label: 'Starter', format: 'text' }],
        rows: rm.breakdown.contracted.map((r) => ({ ...r, owner: ownerLabel(r) })),
        totalRow: { fee: rm.mrr?.contracted },
      } : null,
      links: [{ id: 'mrr_actual', label: 'Realisert' }, { id: 'ltv_cac_contracted', label: 'LTV : CAC inkl. kontrahert' }],
    });

    push({
      id: 'mrr_potential',
      group: 'Inntektskvalitet',
      title: 'Potensial — estimert leie',
      question: 'Hvor mye honorar kan forvaltningsavtaler uten leiekontrakt gi?',
      value: rm.mrr?.potential, format: 'kr', suffix: 'kr/mnd',
      quality: 'forecast',
      windowLabel: 'Nåsituasjon — forvaltningsavtaler uten leiekontrakt',
      windowNote: 'Ren prognose. Skal aldri brukes som inntekt eller i realisert LTV.',
      formula: {
        text: 'sum av (ESTIMERT månedsleie × honorarsats) for forvaltningsavtaler uten leiekontrakt',
        terms: [
          { label: 'Forvaltningsavtaler', value: num(rm.tiers?.potential?.count) },
          { op: '→', label: 'Estimert honorar', value: krM(rm.mrr?.potential) },
        ],
        result: krM(rm.mrr?.potential),
      },
      inputs: [
        { label: 'Estimert MRR', value: krM(rm.mrr?.potential), strong: true },
        { label: 'Avtaler uten leiekontrakt', value: num(rm.tiers?.potential?.count) },
        { label: 'Avtaler med prisestimat', value: num(rm.tiers?.potential?.withEstimate), note: 'resten mangler estimert leie' },
        { label: 'Aktiveringsrate', value: pct(rm.customers?.activationRatePct), note: 'andel kunder som faktisk har leieinntekt' },
        { label: 'Forventet honorar per ny avtale', value: krM(rm.ltv?.expectedMonthlyFeePerNew) },
        { label: 'Risikojustert LTV per ny avtale', value: kr(rm.ltv?.riskAdjustedNewCustomer), note: 'forventet honorar × aktiveringsrate × levetid' },
        { label: 'Venter på leiekontrakt', value: `${num(rm.customers?.awaitingLease)} kunder` },
      ],
      includes: ['Forvaltningsavtaler der ingen levende leiekontrakt finnes på boligen.'],
      excludes: ['Alt som allerede har leiekontrakt (realisert eller kontrahert).'],
      caveats: [
        'Estimert leie er huseiers/vår antakelse. Faktisk leie kan bli lavere eller høyere.',
        'Risikojustering bruker historisk aktiveringsrate — den er usikker med få kunder.',
        'Bruk dette til prioritering og prognose, ikke til rapportering av inntekt.',
      ],
      sources: [SRC.contracts],
      drill: rm.breakdown?.potential?.length ? {
        title: `Forvaltningsavtaler uten leiekontrakt (${num(rm.tiers?.potential?.count)})`,
        columns: [
          { key: 'owner', label: 'Kunde', format: 'text' },
          { key: 'property', label: 'Bolig', format: 'text' },
          { key: 'estimatedMonthlyRent', label: 'Estimert leie', format: 'kr', align: 'right' },
          { key: 'feePercent', label: 'Honorar %', format: 'pct', align: 'right' },
          { key: 'fee', label: 'Estimert honorar', format: 'kr', align: 'right', strong: true },
        ],
        rows: rm.breakdown.potential.map((r) => ({ ...r, owner: ownerLabel(r) })),
        totalRow: { fee: rm.mrr?.potential },
      } : null,
      links: [{ id: 'mrr_actual', label: 'Realisert' }, { id: 'activation', label: 'Aktiveringsrate' }],
    });

    push({
      id: 'activation',
      group: 'Inntektskvalitet',
      title: 'Aktiveringsrate',
      question: 'Hvor stor andel av kundene har faktisk leieinntekt?',
      value: rm.customers?.activationRatePct, format: 'num1', suffix: '%',
      quality: 'realised',
      windowLabel: 'Nåsituasjon',
      formula: {
        text: 'kunder med startet leiekontrakt ÷ alle kunder med levende avtale',
        terms: [
          { label: 'Med leieinntekt', value: num(rm.customers?.earning) },
          { op: '÷', label: 'Alle kunder', value: num(rm.customers?.management) },
        ],
        result: pct(rm.customers?.activationRatePct),
      },
      inputs: [
        { label: 'Kunder med leieinntekt', value: num(rm.customers?.earning) },
        { label: 'Kunder totalt (levende avtale)', value: num(rm.customers?.management) },
        { label: 'Venter på leiekontrakt', value: num(rm.customers?.awaitingLease) },
        { label: 'Bare kontrahert leie', value: num(rm.customers?.contractedOnly) },
      ],
      includes: ['Alle kunder med minst én levende kontrakt (forvaltning eller leie).'],
      excludes: ['Kunder med avsluttede/utløpte kontrakter.'],
      caveats: ['Lav aktiveringsrate betyr at vi signerer huseiere raskere enn vi får boligene utleid — det er der pengene forsvinner.'],
      sources: [SRC.contracts],
      links: [{ id: 'time_to_rent', label: 'Tid til leieinntekt' }, { id: 'mrr_potential', label: 'Potensial' }],
    });

    push({
      id: 'time_to_rent',
      group: 'Inntektskvalitet',
      title: 'Tid til leieinntekt',
      question: 'Hvor lang tid går det fra forvaltningsavtale til første leiekontrakt?',
      value: rm.timing?.daysToFirstLease, format: 'num1', suffix: 'd', inverse: true,
      quality: 'realised',
      windowLabel: 'Median over kunder med både forvaltningsavtale og leiekontrakt',
      formula: {
        text: 'median av (første leiekontrakt-start − forvaltningsavtale-start)',
        terms: [
          { label: 'Utvalg', value: `${num(rm.timing?.sampleSize)} kunder` },
          { op: '→', label: 'Median', value: rm.timing?.daysToFirstLease != null ? `${num1(rm.timing.daysToFirstLease)} dager` : '—' },
        ],
        result: rm.timing?.daysToFirstLease != null ? `${num1(rm.timing.daysToFirstLease)} dager` : '—',
      },
      inputs: [
        { label: 'Median', value: rm.timing?.daysToFirstLease != null ? `${num1(rm.timing.daysToFirstLease)} dager` : '—' },
        { label: 'Antall i utvalget', value: num(rm.timing?.sampleSize) },
      ],
      includes: ['Kunder hvor vi har begge datoer.'],
      excludes: ['Kunder uten forvaltningsavtale i eksporten.'],
      caveats: ['Median brukes fordi enkelte utleieprosesser trekker svært langt ut og ville ødelagt et snitt.', 'Dette tallet legges til i Payback som ventetid.'],
      sources: [SRC.contracts],
      links: [{ id: 'payback', label: 'Payback' }, { id: 'activation', label: 'Aktiveringsrate' }],
    });

    push({
      id: 'at_risk',
      group: 'Inntektskvalitet',
      title: 'MRR i faresonen (90 dager)',
      question: 'Hvor mye løpende honorar utløper innen 90 dager?',
      value: rm.mrr?.atRisk90d, format: 'kr', suffix: 'kr/mnd', inverse: true,
      quality: 'realised',
      windowLabel: 'Nåsituasjon — neste 90 dager',
      formula: {
        text: 'sum honorar for løpende leiekontrakter med sluttdato innen 90 dager',
        terms: [
          { label: 'Kontrakter', value: num((rm.expiring90d || []).length) },
          { op: '→', label: 'Honorar i fare', value: krM(rm.mrr?.atRisk90d) },
        ],
        result: krM(rm.mrr?.atRisk90d),
      },
      inputs: [
        { label: 'Honorar i faresonen', value: krM(rm.mrr?.atRisk90d), strong: true },
        { label: 'Andel av realisert MRR', value: rm.mrr?.actual > 0 ? pct((rm.mrr.atRisk90d / rm.mrr.actual) * 100) : '—' },
      ],
      includes: ['Startede leiekontrakter med registrert sluttdato innen 90 dager.'],
      excludes: ['Kontrakter uten sluttdato (løpende til oppsigelse).'],
      caveats: ['Utløp betyr ikke automatisk tap — de fleste fornyes. Men de bør følges opp aktivt.'],
      sources: [SRC.contracts],
      drill: (rm.expiring90d || []).length ? {
        title: 'Leiekontrakter som utløper innen 90 dager',
        columns: [...leaseCols, { key: 'endDate', label: 'Utløper', format: 'text' }],
        rows: rm.expiring90d.map((r) => ({ ...r, owner: ownerLabel(r) })),
      } : null,
      links: [{ id: 'mrr_actual', label: 'Realisert MRR' }],
    });
  }

  // ---------------------------------------------------------- Total kunder
  push({
    id: 'total_customers',
    group: 'Kunder',
    title: 'Total kunder',
    question: 'Hvor mange kunder har vi i alt?',
    value: m.totalCustomers?.value, format: 'num',
    quality: 'activity',
    windowLabel: ALLTIME,
    formula: {
      text: 'sporede vunne leads + historisk importerte kunder',
      terms: [
        { label: 'Sporet', value: num(m.totalCustomers?.tracked) },
        { op: '+', label: 'Historisk', value: num(m.totalCustomers?.historical) },
      ],
      result: num(m.totalCustomers?.value),
    },
    inputs: [
      { label: 'Sporede kunder (CRM)', value: num(m.totalCustomers?.tracked) },
      { label: 'Historisk importerte', value: num(m.totalCustomers?.historical) },
      { label: 'Kunder på plattformen', value: num(dq.platformCustomers), note: 'aktive, ikke churnet' },
      { label: 'Avvik CRM vs plattform', value: dq.crmVsPlatformCustomerGap != null ? num(dq.crmVsPlatformCustomerGap) : '—', note: 'positivt = plattformen har flere' },
      { label: 'Kunder med leiekontrakt', value: num(dq.platformCustomersWithLease) },
    ],
    includes: ['Alle huseier-kunder, både sporede og historisk importerte.'],
    excludes: ['Leietakere.', 'Arkiverte/slettede.'],
    caveats: ['Plattformen eier den autoritative kundelisten. Avvik betyr at et lead ikke er koblet til kunden i CRM.'],
    sources: [SRC.leads, SRC.imported, SRC.platform],
    links: [{ id: 'avg_value', label: 'Snitt kundeverdi' }],
  });

  // ------------------------------------------------------------ Responstid
  push({
    id: 'response',
    group: 'Salg',
    title: 'Responstid',
    question: 'Hvor raskt svarer vi på nye henvendelser?',
    value: m.responseHours?.value, format: 'num1', suffix: 't', inverse: true,
    quality: 'activity',
    windowLabel: winLabel,
    formula: {
      text: 'snitt av (første kontakt − lead opprettet) for leads i perioden',
      terms: [
        { label: 'Målte leads', value: num(m.responseHours?.count) },
        { op: '→', label: 'Snitt', value: m.responseHours?.value != null ? `${num1(m.responseHours.value)} t` : '—' },
      ],
      result: m.responseHours?.value != null ? `${num1(m.responseHours.value)} timer` : '—',
    },
    inputs: [
      { label: 'Snitt responstid', value: m.responseHours?.value != null ? `${num1(m.responseHours.value)} timer` : '—' },
      { label: 'Innen 24 timer', value: m.responseHours?.sla24hPct != null ? `${num(m.responseHours.sla24hPct)} %` : '—', note: `${num(m.responseHours?.slaHit)} av ${num(m.responseHours?.count)}` },
      { label: 'Leads uten registrert respons', value: num(Math.max(0, (m.newLeads?.value || 0) - (m.responseHours?.count || 0))), muted: true },
    ],
    includes: ['Leads opprettet i perioden der første kontakt (eller videresending til CRM) er registrert.'],
    excludes: ['Responstid over 90 døgn (datastøy).', 'Leads uten registrert respons.'],
    caveats: ['Vi lover «svar innen 24 timer» utad — SLA-andelen er derfor viktigere enn snittet.'],
    sources: [SRC.leads],
    links: [{ id: 'conv', label: 'Konvertering' }],
  });

  // -------------------------------------------------------------- Nye leads
  push({
    id: 'new_leads',
    group: 'Salg',
    title: 'Nye huseier-leads',
    question: 'Hvor mange nye huseiere tok kontakt i perioden?',
    value: m.newLeads?.value, format: 'num', delta: m.newLeads?.delta,
    quality: 'activity',
    windowLabel: winLabel,
    formula: {
      text: 'antall huseier-leads opprettet i perioden',
      terms: [
        { label: 'Denne perioden', value: num(m.newLeads?.value) },
        { op: 'vs', label: 'Forrige periode', value: num(m.newLeads?.prev) },
      ],
      result: num(m.newLeads?.value),
    },
    inputs: [
      { label: 'Nye huseier-leads', value: num(m.newLeads?.value) },
      { label: 'Forrige periode', value: num(m.newLeads?.prev), muted: true },
      { label: 'CPL', value: kr(hero.cpl?.value) },
      ...(data.channels || []).slice(0, 6).map((c) => ({ label: `Kanal · ${c.channel}`, value: `${num(c.leads)} (${num1(c.share)} %)`, note: c.customers > 0 ? `${num(c.customers)} kunde(r)` : null, muted: true })),
    ],
    includes: ['Huseier-leads fra skjema, kampanjesider og manuell registrering.'],
    excludes: ['Kontaktskjema/generelle henvendelser.', 'Leietaker-leads.', 'CRM-dubletter og arkiverte.'],
    caveats: ['Kanalfordelingen bygger på attribusjon lagret på leadet ved opprettelse.'],
    sources: [SRC.leads],
    links: [{ id: 'cpl', label: 'CPL' }, { id: 'tenant_demand', label: 'Leietaker-etterspørsel' }],
  });

  // ------------------------------------------------------------ Etterspørsel
  push({
    id: 'tenant_demand',
    group: 'Marked',
    title: 'Etterspørsel — leietakere',
    question: 'Hvor mange boligsøkere meldte seg i perioden?',
    value: m.newTenantLeads?.value, format: 'num', delta: m.newTenantLeads?.delta,
    quality: 'activity',
    windowLabel: winLabel,
    formula: {
      text: 'antall leietaker-leads opprettet i perioden',
      terms: [
        { label: 'Denne perioden', value: num(m.newTenantLeads?.value) },
        { op: 'vs', label: 'Forrige periode', value: num(m.newTenantLeads?.prev) },
      ],
      result: num(m.newTenantLeads?.value),
    },
    inputs: [
      { label: 'Nye leietaker-leads', value: num(m.newTenantLeads?.value) },
      { label: 'Forrige periode', value: num(m.newTenantLeads?.prev), muted: true },
    ],
    includes: ['Alle leietakerregistreringer, inkludert importerte fra plattformen.'],
    excludes: ['Alt som gjelder betalende kunder — leietakere er etterspørselssiden.'],
    caveats: ['Holdes bevisst UTENFOR CPL, CAC, LTV og konverteringsrate. Ellers ville de fortynnet kunde-trakten kraftig.'],
    sources: [SRC.tenants],
    links: [{ id: 'new_leads', label: 'Huseier-leads' }],
  });

  // ------------------------------------------------------ Pipeline-potensial
  if (data.pipelineValue?.open > 0) push({
    id: 'pipeline_value',
    group: 'Marked',
    title: 'Potensial i åpne leads',
    question: 'Hva er de åpne leadene sannsynlighetsvektet verdt?',
    value: data.pipelineValue?.potential, format: 'kr', suffix: 'kr',
    quality: 'forecast',
    windowLabel: ALLTIME,
    formula: {
      text: 'åpne leads × snitt kundeverdi × historisk konvertering',
      terms: [
        { label: 'Åpne leads', value: num(data.pipelineValue?.open) },
        { op: '×', label: 'Snitt kundeverdi', value: kr(hero.avgCustomerValue?.value) },
        { op: '×', label: 'Historisk konvertering', value: data.funnel?.length ? pct(data.funnel[data.funnel.length - 1]?.pctOfTop) : '—' },
      ],
      result: kr(data.pipelineValue?.potential),
    },
    inputs: [
      { label: 'Åpne leads', value: num(data.pipelineValue?.open), note: 'ny + kontaktet + kvalifisert' },
      { label: 'Snitt kundeverdi', value: kr(hero.avgCustomerValue?.value) },
      { label: 'Grunnlag', value: data.pipelineValue?.basis || '—' },
    ],
    includes: ['Alle sporede huseier-leads som ikke er vunnet eller tapt.'],
    excludes: ['Vunne og tapte leads.'],
    caveats: ['Ren modell — ikke inntekt. Bruk den til å prioritere oppfølging, ikke til prognose i regnskapet.'],
    sources: [SRC.leads],
    links: [{ id: 'conv', label: 'Konvertering' }],
  });

  return E;
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
function Section({ icon: Icon, title, children, tone = 'default' }) {
  const toneCls = tone === 'warn' ? 'text-amber-700' : 'text-[#8b8894]';
  return (
    <div className="pt-5 mt-5 border-t border-black/[0.06] first:pt-0 first:mt-0 first:border-0">
      <p className={`text-[10.5px] font-bold uppercase tracking-[0.11em] flex items-center gap-1.5 mb-3 ${toneCls}`}>
        {Icon && <Icon className="w-3.5 h-3.5" />} {title}
      </p>
      {children}
    </div>
  );
}

function FormulaBlock({ formula }) {
  if (!formula) return null;
  return (
    <div className="rounded-2xl border border-[#7c5cf0]/20 bg-gradient-to-br from-[#f8f5ff] to-white p-4 sm:p-5">
      <p className="text-[12.5px] text-[#67646f] leading-snug">{formula.text}</p>
      <div className="mt-3.5 flex flex-wrap items-stretch gap-2">
        {(formula.terms || []).map((t, i) => (
          <React.Fragment key={i}>
            {t.op && <span className="self-center text-[#a5a3af] font-bold text-[17px] px-0.5 select-none">{t.op}</span>}
            <span className="rounded-xl bg-white border border-black/[0.07] px-3 py-2 shadow-[0_1px_2px_rgba(22,20,29,0.04)]">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.07em] text-[#a5a3af]">{t.label}</span>
              <span className="block mt-0.5 text-[15px] font-bold text-[#16141d] tabular-nums tracking-[-0.01em]">{t.value}</span>
            </span>
          </React.Fragment>
        ))}
        <span className="self-center text-[#a5a3af] font-bold text-[17px] px-0.5 select-none">=</span>
        <span className="rounded-xl px-3.5 py-2 self-stretch flex items-center" style={{ background: VIOLET }}>
          <span className="text-[16px] font-bold text-white tabular-nums tracking-[-0.01em]">{formula.result}</span>
        </span>
      </div>
    </div>
  );
}

function InputRows({ inputs = [] }) {
  return (
    <div className="rounded-xl border border-black/[0.06] overflow-hidden">
      {inputs.map((r, i) => (
        <div key={i} className={`flex items-start gap-3 px-3.5 py-2.5 ${i % 2 ? 'bg-black/[0.015]' : 'bg-white'}`}>
          <div className="min-w-0 flex-1">
            <p className={`text-[12.5px] leading-snug ${r.muted ? 'text-[#a5a3af]' : 'text-[#514e5a]'}`}>{r.label}</p>
            {r.note && <p className="text-[11px] text-[#b0aeb8] mt-0.5 leading-snug">{r.note}</p>}
          </div>
          <p className={`text-[13px] tabular-nums whitespace-nowrap ${r.strong ? 'font-bold text-[#16141d]' : r.muted ? 'text-[#a5a3af] font-medium' : 'font-semibold text-[#16141d]'}`}>{r.value}</p>
        </div>
      ))}
    </div>
  );
}

function Bullets({ items = [], icon: Icon, color }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[#514e5a]">
          <Icon className="w-3.5 h-3.5 mt-[3px] shrink-0" style={{ color }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function DrillTable({ drill }) {
  const [expanded, setExpanded] = useState(false);
  if (!drill || !(drill.rows || []).length) return null;
  const rows = expanded ? drill.rows : drill.rows.slice(0, 8);
  const cell = (r, c) => {
    const raw = r[c.key];
    const f = FMT[c.format] || FMT.text;
    return f(raw);
  };
  return (
    <div>
      {drill.note && <p className="text-[11.5px] text-[#a5a3af] mb-2.5 leading-relaxed">{drill.note}</p>}
      <div className="rounded-xl border border-black/[0.07] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-black/[0.03]">
                {drill.columns.map((c) => (
                  <th key={c.key} className={`px-3 py-2 font-semibold text-[10.5px] uppercase tracking-[0.06em] text-[#8b8894] whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={`border-t border-black/[0.05] ${i % 2 ? 'bg-black/[0.012]' : ''}`}>
                  {drill.columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.strong ? 'font-bold text-[#16141d]' : 'text-[#514e5a]'}`}>
                      <span className={c.format === 'text' ? 'block max-w-[220px] truncate' : ''} title={c.format === 'text' ? String(r[c.key] ?? '') : undefined}>{cell(r, c)}</span>
                    </td>
                  ))}
                </tr>
              ))}
              {drill.totalRow && (
                <tr className="border-t-2 border-black/[0.08] bg-black/[0.02]">
                  {drill.columns.map((c, i) => (
                    <td key={c.key} className={`px-3 py-2 font-bold text-[#16141d] ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                      {i === 0 ? 'Sum' : (drill.totalRow[c.key] != null ? (FMT[c.format] || FMT.text)(drill.totalRow[c.key]) : '')}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {drill.rows.length > 8 && (
        <button onClick={() => setExpanded((v) => !v)} className="mt-2 text-[12px] font-semibold" style={{ color: VIOLET }}>
          {expanded ? 'Vis mindre' : `Vis alle ${drill.rows.length} rader`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DRILL-DOWN: kunde → enhet. Hentes på klikk fra /api/admin/kpi/drill.
// ---------------------------------------------------------------------------
function DrillRows({ columns = [], rows = [] }) {
  if (!rows.length) return <p className="text-[11.5px] text-[#b0aeb8] px-3 py-2.5">Ingen kontrakt registrert på denne kunden ennå.</p>;
  const cell = (r, c) => (FMT[c.format] || FMT.text)(r[c.key]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11.5px]">
        <thead>
          <tr className="bg-black/[0.025]">
            {columns.map((c) => (
              <th key={c.key} className={`px-2.5 py-1.5 font-semibold text-[10px] uppercase tracking-[0.05em] text-[#a5a3af] whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} className="border-t border-black/[0.05]">
              {columns.map((c) => (
                <td key={c.key} className={`px-2.5 py-2 align-top ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.strong ? 'font-bold text-[#16141d]' : 'text-[#514e5a]'}`}>
                  {c.key === 'address' ? (
                    <span className="flex items-start gap-1.5">
                      <Home className="w-3 h-3 mt-[3px] shrink-0 text-[#c4c2cc]" />
                      <span className={`block ${c.wide ? 'max-w-[230px]' : 'max-w-[160px]'}`}>
                        <span className="block font-semibold text-[#16141d] leading-snug">{cell(r, c)}</span>
                        {r.unitMatch === 'ingen' && <span className="block text-[10px] text-[#c4c2cc]">ikke koblet til enhetsdata</span>}
                        {r.unitMatch === 'tvetydig' && <span className="block text-[10px] text-amber-600">flere enheter på samme adresse</span>}
                        {r.publicUrl && (
                          <a href={r.publicUrl} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold mt-0.5" style={{ color: VIOLET }}>
                            boligside <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </span>
                    </span>
                  ) : c.key === 'monthlyRent' ? (
                    <span>{cell(r, c)}{r.rentIsEstimate && <span className="block text-[10px] text-amber-600">estimat</span>}</span>
                  ) : c.key === 'tierLabel' ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={{
                        color: r.tier === 'actual' ? '#047857' : r.tier === 'contracted' ? '#b45309' : '#64748b',
                        background: r.tier === 'actual' ? '#ecfdf5' : r.tier === 'contracted' ? '#fffbeb' : '#f1f5f9',
                      }}>{cell(r, c)}</span>
                  ) : (
                    <span className={c.format === 'text' ? 'block max-w-[170px] truncate' : ''} title={c.format === 'text' ? String(r[c.key] ?? '') : undefined}>{cell(r, c)}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DrillGroup({ g, columns, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-xl border border-black/[0.07] overflow-hidden bg-white">
      <button onClick={() => setOpen((v) => !v)} data-testid="kpi-drill-group"
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-black/[0.02] transition-colors">
        <span className="h-7 w-7 rounded-full bg-[#7c5cf0]/[0.09] grid place-items-center shrink-0">
          <Users className="w-3.5 h-3.5" style={{ color: VIOLET }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-[#16141d] truncate">{g.name}</span>
          <span className="block text-[11px] text-[#a5a3af] truncate">{g.subtitle}</span>
        </span>
        {g.amount != null && (
          <span className="text-[13px] font-bold text-[#16141d] tabular-nums whitespace-nowrap">
            {g.amountUnit === 'kr/mnd' ? krM(g.amount) : g.amountUnit === 'stk' ? `${num(g.amount)} stk` : kr(g.amount)}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 shrink-0 text-[#c4c2cc] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-black/[0.06]">
          {(g.meta || []).length > 0 && (
            <div className="px-3.5 py-2.5 flex flex-wrap gap-1.5 bg-black/[0.015]">
              {g.meta.map((mt, i) => (
                <span key={i} className="inline-flex items-baseline gap-1 rounded-full bg-white border border-black/[0.06] px-2 py-0.5 text-[10.5px]">
                  <span className="text-[#a5a3af]">{mt.l}</span>
                  <b className="text-[#16141d]">{(FMT[mt.f] || FMT.text)(mt.v)}</b>
                  {mt.note && <span className="text-[#c4c2cc]">{mt.note}</span>}
                </span>
              ))}
            </div>
          )}
          <DrillRows columns={columns} rows={g.rows || []} />
        </div>
      )}
    </div>
  );
}

function CustomerDrill({ metric, apiKey, days }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [showUnlinked, setShowUnlinked] = useState(false);

  useEffect(() => { setState('idle'); setData(null); setErr(''); setQ(''); setShowUnlinked(false); }, [metric]);

  const load = async () => {
    if (!apiKey) { setErr('Mangler admin-nøkkel'); setState('error'); return; }
    setState('loading'); setErr('');
    try {
      const res = await fetch(`/api/admin/kpi/drill?key=${encodeURIComponent(apiKey)}&metric=${encodeURIComponent(metric)}&days=${days || 90}`);
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j.error || 'Kunne ikke hente detaljer'); setState('error'); return; }
      setData(j); setState('done');
    } catch (e) { setErr('Nettverksfeil'); setState('error'); }
  };

  if (state === 'idle') {
    return (
      <button onClick={load} data-testid="kpi-drill-load"
        className="w-full rounded-xl border border-dashed border-[#7c5cf0]/35 bg-[#7c5cf0]/[0.04] hover:bg-[#7c5cf0]/[0.09] px-4 py-3 text-left transition-colors group">
        <span className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-full bg-white grid place-items-center shrink-0 border border-[#7c5cf0]/20">
            <Building2 className="w-4 h-4" style={{ color: VIOLET }} />
          </span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-bold" style={{ color: '#6d4ce0' }}>Vis kundene og enhetene bak tallet</span>
            <span className="block text-[11px] text-[#8b8894]">Navn, adresse, etasje, leietaker, leie og honorar per enhet</span>
          </span>
          <ChevronRight className="w-4 h-4 ml-auto shrink-0 text-[#c4c2cc] group-hover:text-[#7c5cf0] transition-colors" />
        </span>
      </button>
    );
  }
  if (state === 'loading') {
    return (
      <p className="flex items-center gap-2 text-[12px] text-[#8b8894] px-1 py-3">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Henter kunder og enheter …
      </p>
    );
  }
  if (state === 'error') {
    return (
      <div className="rounded-xl bg-rose-50 border border-rose-100 px-3.5 py-2.5">
        <p className="text-[12px] text-rose-700">{err}</p>
        <button onClick={load} className="mt-1.5 text-[11.5px] font-semibold text-rose-700 underline">Prøv igjen</button>
      </div>
    );
  }

  const groups = (data.groups || []).filter((g) => {
    if (!q.trim()) return true;
    const hay = `${g.name} ${g.subtitle} ${(g.rows || []).map((r) => `${r.address} ${r.tenant || ''} ${r.unitInfo || ''}`).join(' ')} ${(g.meta || []).map((m) => m.v).join(' ')}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
  });
  const uc = data.unitCoverage;

  return (
    <div data-testid="kpi-drill-panel">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1 text-[11.5px] text-[#514e5a]">
          <Users className="w-3.5 h-3.5 text-[#a5a3af]" /> <b className="text-[#16141d]">{num(data.totals?.groups)}</b> {data.kind?.startsWith('leads') ? 'leads/kunder' : 'kunder'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1 text-[11.5px] text-[#514e5a]">
          <Home className="w-3.5 h-3.5 text-[#a5a3af]" /> <b className="text-[#16141d]">{num(data.totals?.rows)}</b> enheter/kontrakter
        </span>
        {data.totals?.amount != null && data.totals.amount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: '#7c5cf014', color: '#6d4ce0' }}>
            Sum {data.totals.amountUnit === 'kr/mnd' ? krM(data.totals.amount) : kr(data.totals.amount)}
          </span>
        )}
        {data.window?.label && <span className="text-[11px] text-[#b0aeb8]">{data.window.label}</span>}
      </div>

      {(data.groups || []).length > 4 && (
        <div className="relative mb-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#c4c2cc]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søk på kunde, adresse eller leietaker …"
            data-testid="kpi-drill-search"
            className="w-full h-9 rounded-xl border border-black/[0.08] bg-white pl-9 pr-3 text-[12px] outline-none focus:border-[#7c5cf0]/40" />
        </div>
      )}

      <div className="space-y-2">
        {groups.length === 0 && <p className="text-[12px] text-[#a5a3af] py-2">Ingen treff{q ? ` på «${q}»` : ''}.</p>}
        {groups.slice(0, 60).map((g, i) => (
          <DrillGroup key={g.key || i} g={g} columns={data.columns || []} defaultOpen={groups.length <= 3} />
        ))}
        {groups.length > 60 && <p className="text-[11.5px] text-[#a5a3af]">Viser 60 av {groups.length}. Bruk søket for å finne resten.</p>}
      </div>

      {uc && uc.rows > 0 && (
        <p className="mt-3 text-[11px] text-[#a5a3af] leading-relaxed">
          Enhetsdata koblet på {num(uc.matched)} av {num(uc.rows)} kontrakter{uc.ambiguous ? `, ${num(uc.ambiguous)} tvetydige` : ''}.
          {' '}Plattformen bruker to ulike ID-rom for kontrakter og enheter, så vi kobler på adresse og bare ved entydig treff — vi gjetter aldri.
        </p>
      )}

      {(data.unmatchedUnitsTotal || 0) > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowUnlinked((v) => !v)} data-testid="kpi-drill-unlinked"
            className="text-[11.5px] font-semibold inline-flex items-center gap-1" style={{ color: VIOLET }}>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showUnlinked ? 'rotate-180' : ''}`} />
            {num(data.unmatchedUnitsTotal)} enheter i porteføljen uten kontraktskobling
          </button>
          {showUnlinked && (
            <div className="mt-2 rounded-xl border border-black/[0.07] overflow-hidden">
              <p className="px-3 py-2 text-[11px] text-[#8b8894] bg-black/[0.02] leading-relaxed">
                Enheter fra plattformens enhets-eksport som ikke traff en kontraktsrad. Enten mangler de forvaltningsavtale i kontrakts-eksporten, eller adressen skrives ulikt i de to kildene.
              </p>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-[11.5px]">
                  <thead className="sticky top-0">
                    <tr className="bg-black/[0.03]">
                      {['Enhet', 'Detaljer', 'Eier', 'Leietaker', 'Leie', 'Status', 'Bilder'].map((h) => (
                        <th key={h} className="px-2.5 py-1.5 text-left font-semibold text-[10px] uppercase tracking-[0.05em] text-[#a5a3af] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.unmatchedUnits || []).map((u, i) => (
                      <tr key={i} className="border-t border-black/[0.05]">
                        <td className="px-2.5 py-2 font-semibold text-[#16141d] max-w-[200px]">{u.address}</td>
                        <td className="px-2.5 py-2 text-[#8b8894] max-w-[180px] truncate" title={u.unitInfo}>{u.unitInfo}</td>
                        <td className="px-2.5 py-2 text-[#514e5a] max-w-[140px] truncate">{u.owner}</td>
                        <td className="px-2.5 py-2 text-[#514e5a] max-w-[140px] truncate">{u.tenant}</td>
                        <td className="px-2.5 py-2 text-right tabular-nums text-[#514e5a] whitespace-nowrap">{u.rentAmount != null ? kr(u.rentAmount) : '—'}{u.rentIsEstimate && u.rentAmount != null ? ' (est.)' : ''}</td>
                        <td className="px-2.5 py-2 text-[#8b8894]">{u.unitStatus}</td>
                        <td className="px-2.5 py-2 text-right tabular-nums text-[#8b8894]">{num(u.imageCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {data.note && <p className="mt-3 text-[11px] text-[#b0aeb8] leading-relaxed">{data.note}</p>}
    </div>
  );
}

function toPlainText(e) {
  const L = [];
  L.push(`${e.title} — ${e.valueText}`);
  if (e.windowLabel) L.push(`Periode: ${e.windowLabel}`);
  if (e.formula) {
    L.push('');
    L.push(`Formel: ${e.formula.text}`);
    L.push(`${(e.formula.terms || []).map((t) => `${t.op ? `${t.op} ` : ''}${t.label} ${t.value}`).join('  ')} = ${e.formula.result}`);
  }
  if ((e.inputs || []).length) {
    L.push('');
    L.push('Tallene bak:');
    e.inputs.forEach((r) => L.push(`  · ${r.label}: ${r.value}${r.note ? ` (${r.note})` : ''}`));
  }
  if ((e.caveats || []).length) {
    L.push('');
    L.push('Forbehold:');
    e.caveats.forEach((c) => L.push(`  · ${c}`));
  }
  if ((e.sources || []).length) { L.push(''); L.push(`Kilder: ${e.sources.join(' · ')}`); }
  return L.join('\n');
}

export function KpiDetailModal({ explainers = [], activeId, apiKey, days, onClose, onNavigate }) {
  const idx = Math.max(0, explainers.findIndex((x) => x.id === activeId));
  const e = explainers[idx];
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef(null);

  const go = useCallback((d) => {
    const n = explainers.length;
    if (!n) return;
    onNavigate(explainers[(idx + d + n) % n].id);
  }, [explainers, idx, onNavigate]);

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); onClose(); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); go(1); }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, go]);

  useEffect(() => { setCopied(false); if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [activeId]);

  if (!e) return null;
  const q = QUALITY[e.quality] || QUALITY.activity;
  const valueText = (() => {
    const f = FMT[e.format] || FMT.text;
    if (e.value == null) return '—';
    if (e.format === 'kr') return `${nf0.format(Math.round(Number(e.value)))}${e.suffix ? ` ${e.suffix}` : ' kr'}`;
    return `${f(e.value)}${e.suffix && e.format !== 'ratio' ? ` ${e.suffix}` : ''}`;
  })();

  const copy = async () => {
    try { await navigator.clipboard.writeText(toPlainText({ ...e, valueText })); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (_) {}
  };

  const prevE = explainers[(idx - 1 + explainers.length) % explainers.length];
  const nextE = explainers[(idx + 1) % explainers.length];

  const node = (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center" data-testid="kpi-detail-modal" role="dialog" aria-modal="true" aria-label={e.title}>
      <style>{`
        @keyframes kpiModalIn { from { opacity:0; transform: translateY(18px) scale(.985) } to { opacity:1; transform:none } }
        @keyframes kpiFadeIn { from { opacity:0 } to { opacity:1 } }
      `}</style>
      <div className="absolute inset-0 bg-[#16141d]/45 backdrop-blur-[3px]" style={{ animation: 'kpiFadeIn .18s ease-out' }} onClick={onClose} />
      <div className="relative w-full sm:max-w-[720px] max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white border border-black/[0.07] shadow-[0_32px_100px_-20px_rgba(22,20,29,0.4)] overflow-hidden"
        style={{ animation: 'kpiModalIn .28s cubic-bezier(.16,1,.3,1)' }}>

        {/* Header */}
        <div className="shrink-0 px-5 sm:px-7 pt-5 pb-4 border-b border-black/[0.06]" style={{ background: 'linear-gradient(135deg, #fbfaff 0%, #ffffff 62%)' }}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.07em] border"
                  style={{ color: q.text, background: q.bg, borderColor: q.border }} title={q.help} data-testid="kpi-detail-quality">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: q.dot }} />{q.label}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#b0aeb8]">{e.group}</span>
                {e.badge && <span className="text-[10.5px] font-bold rounded-full px-2 py-0.5" style={{ color: e.badge.color, background: `${e.badge.color}14` }}>{e.badge.label}</span>}
              </div>
              <h3 className="mt-2 text-[#16141d] text-[19px] sm:text-[21px] font-bold tracking-[-0.02em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }} data-testid="kpi-detail-title">{e.title}</h3>
              {e.question && <p className="mt-1 text-[13px] text-[#8b8894] leading-snug">{e.question}</p>}
            </div>
            <button onClick={onClose} aria-label="Lukk" data-testid="kpi-detail-close"
              className="shrink-0 h-8 w-8 rounded-full bg-white border border-black/[0.08] text-[#8b8894] hover:text-[#16141d] hover:border-black/[0.18] grid place-items-center transition-colors"><X className="w-4 h-4" /></button>
          </div>

          <div className="mt-4 flex items-end gap-3 flex-wrap">
            <p className="text-[#16141d] font-bold tabular-nums tracking-[-0.035em] text-[38px] sm:text-[46px] leading-none" data-testid="kpi-detail-value">{valueText}</p>
            {e.delta != null && (
              <span className={`mb-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-bold ${e.delta === 0 ? 'text-[#8b8894] bg-black/[0.04]' : (e.inverse ? e.delta < 0 : e.delta > 0) ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                {e.delta > 0 ? '+' : e.delta < 0 ? '−' : ''}{Math.abs(e.delta)} % vs forrige
              </span>
            )}
          </div>
          <p className="mt-2 text-[11.5px] text-[#a5a3af] flex items-start gap-1.5 leading-snug">
            <Clock className="w-3.5 h-3.5 mt-[1px] shrink-0 text-[#c4c2cc]" />
            <span><b className="text-[#8b8894] font-semibold">{e.windowLabel}</b>{e.windowNote ? ` — ${e.windowNote}` : ''}</span>
          </p>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 sm:px-7 py-5">
          <Section icon={Calculator} title="Slik regnes det">
            <FormulaBlock formula={e.formula} />
            <button onClick={copy} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] px-3 py-1.5 text-[11.5px] font-semibold text-[#514e5a] transition-colors" data-testid="kpi-detail-copy">
              {copied ? <><Check className="w-3.5 h-3.5" style={{ color: EMER_TEXT }} /> Kopiert</> : <><Copy className="w-3.5 h-3.5" /> Kopier utregning</>}
            </button>
          </Section>

          {(e.inputs || []).length > 0 && (
            <Section icon={Database} title="Tallene bak">
              <InputRows inputs={e.inputs} />
            </Section>
          )}

          {((e.includes || []).length > 0 || (e.excludes || []).length > 0) && (
            <Section icon={ListTree} title="Hva er med — og hva er ikke">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {(e.includes || []).length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.07em] mb-2" style={{ color: EMER_TEXT }}>Inkluderer</p>
                    <Bullets items={e.includes} icon={CheckCircle2} color="#10b981" />
                  </div>
                )}
                {(e.excludes || []).length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#b45309] mb-2">Ekskluderer</p>
                    <Bullets items={e.excludes} icon={XCircle} color="#f59e0b" />
                  </div>
                )}
              </div>
            </Section>
          )}

          {(e.caveats || []).length > 0 && (
            <Section icon={AlertTriangle} title="Forbehold — les dette før du rapporterer" tone="warn">
              <div className="rounded-xl bg-amber-50/70 border border-amber-100 px-4 py-3">
                <Bullets items={e.caveats} icon={AlertTriangle} color="#d97706" />
              </div>
            </Section>
          )}

          {e.drill && (e.drill.rows || []).length > 0 && (
            <Section icon={ListTree} title={e.drill.title || 'Detaljer'}>
              <DrillTable drill={e.drill} />
            </Section>
          )}

          {DRILLABLE.has(e.id) && (
            <Section icon={Building2} title="Kunder og enheter bak tallet">
              <CustomerDrill metric={e.id} apiKey={apiKey} days={days} />
            </Section>
          )}

          <Section icon={Info} title="Datakilder">
            <div className="flex flex-wrap gap-1.5">
              {(e.sources || []).map((s, i) => (
                <span key={i} className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11.5px] text-[#67646f]">{s}</span>
              ))}
            </div>
            {(e.links || []).length > 0 && (
              <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11.5px] text-[#a5a3af] inline-flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Se også:</span>
                {e.links.filter((l) => explainers.some((x) => x.id === l.id)).map((l) => (
                  <button key={l.id} onClick={() => onNavigate(l.id)}
                    className="rounded-full border border-[#7c5cf0]/25 bg-[#7c5cf0]/[0.06] hover:bg-[#7c5cf0]/[0.12] px-2.5 py-1 text-[11.5px] font-semibold transition-colors" style={{ color: '#6d4ce0' }}>{l.label}</button>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Footer-navigasjon */}
        <div className="shrink-0 flex items-center gap-2 px-4 sm:px-6 py-3 border-t border-black/[0.06] bg-white">
          <button onClick={() => go(-1)} data-testid="kpi-detail-prev"
            className="min-w-0 flex-1 flex items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-black/[0.03] transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#a5a3af] shrink-0" />
            <span className="min-w-0">
              <span className="block text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#c4c2cc]">Forrige</span>
              <span className="block text-[12px] font-semibold text-[#514e5a] truncate">{prevE?.title}</span>
            </span>
          </button>
          <span className="shrink-0 text-[11px] text-[#c4c2cc] tabular-nums px-1">{idx + 1}/{explainers.length}</span>
          <button onClick={() => go(1)} data-testid="kpi-detail-next"
            className="min-w-0 flex-1 flex items-center gap-2 rounded-xl px-3 py-2 text-right justify-end hover:bg-black/[0.03] transition-colors">
            <span className="min-w-0">
              <span className="block text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#c4c2cc]">Neste</span>
              <span className="block text-[12px] font-semibold text-[#514e5a] truncate">{nextE?.title}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-[#a5a3af] shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(node, document.body) : node;
}
