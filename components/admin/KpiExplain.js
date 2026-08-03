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

import {
  FMT, QUALITY, DRILLABLE, dateShort, ratingFor,
  num, num1, kr, krM, pct, ratio,
  VIOLET, VIOLET_DEEP, EMER_TEXT,
} from './kpi/format';

export { QUALITY, DRILLABLE } from './kpi/format';
// Modalen og drill-down-visningen bor i ./kpi/* — gjeneksporteres for bakoverkompatibilitet.
export { KpiDetailModal } from './kpi/DetailModal';
export { CustomerDrill } from './kpi/Drill';

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
