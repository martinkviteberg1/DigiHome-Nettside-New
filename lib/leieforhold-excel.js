// ---------------------------------------------------------------------------
// «VERDENSKLASSE» Excel-/CSV-eksport for «Leieforhold & inntekter».
//   · Ark 1 «Oversikt»    — lederdashboard: portefølje, inntekter, DigiHome-
//     honorar og økonomi (faste kostnader, margin, CAC, payback, break-even).
//     Viser også aktivt filter/scenario slik at uttrekket alltid er sporbart.
//   · Ark 2 «Leieforhold» — 15 kolonner A–O (nå med Utflytting), LEVENDE
//     modell: Honorar (L) og Netto (M) er ekte Excel-formler, KPI-bånd er
//     SUMIF/COUNTIF mot dataområdet, sum-rad nederst, nedtrekk, betinget
//     farge, frys, autofilter, liggende utskrift
//   · Ark 3 «Per huseier» — realisert leie/honorar/netto gruppert per eier
//   · Ark 4 «Økonomi»     — honorar − fordelte FASTE KOSTNADER = margin per
//     enhet, CAC/payback. Kostnadsfordelingen bruker HELE porteføljen som
//     grunnlag (meta.alleRader) slik at et filtrert uttrekk aldri endrer
//     den enkelte enhets andel — 1:1 med skjermen.
// Filter/scenario: eksport-rutene bruker lib/leieforhold-filter (samme logikk
// som skjermen) og sender ferdig filtrerte rows + meta hit.
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs';
import { radNokkel, aktiveKostnader, fordelKostnader, annonsertSplitt } from './leieforhold-filter';

const VALUTA = '#,##0" kr"';
const SATS = '0.0" %"';
const HODE_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C0C0C' } };
const KPI_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4EFFB' } };
const SUM_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F0EA' } };
const SEKSJON_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9E1' } };
const GRAA = { argb: 'FF8A8278' };

const STATUSER = ['Utleid', 'Fremtidig innflytting', 'Under signering', 'Ledig', 'Ledig (Annonsert)'];
const ENHETSTYPER = ['Hel enhet', 'Rom i bofellesskap'];
const INNTEKTSTYPER = ['Faktisk leie', 'Forventet (signert)', 'Under signering', 'Estimat'];
const SERVICENIVAA = ['Selvbetjening', 'Full forvaltning'];
const INCOME_TIL_LABEL = { actual: 'Faktisk leie', expected_signed: 'Forventet (signert)', pending_signing: 'Under signering', estimate: 'Estimat' };
const KATEGORI_LABEL = { lonn: 'Lønn', markedsforing: 'Markedsføring', programvare: 'Programvare', annet: 'Annet' };
const FORDELING_LABEL = { alle: 'likt per enhet', utleide: 'kun utleide', honorar: 'etter honorar' };

const STATUS_FARGE = {
  'Utleid': 'FFE7F4EC',
  'Fremtidig innflytting': 'FFE8EEFC',
  'Under signering': 'FFFDF3E0',
  'Ledig': 'FFF1ECE4',
  'Ledig (Annonsert)': 'FFF1ECE4',
};

const penDato = (s) => (s ? new Date(`${String(s).slice(0, 10)}T12:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function betingetStatus(ws, omraade) {
  ws.addConditionalFormatting({
    ref: omraade,
    rules: STATUSER.slice(0, 4).map((s, i) => ({
      type: 'containsText', operator: 'containsText', text: s, priority: i + 1,
      style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: STATUS_FARGE[s] } } },
    })),
  });
}

// Seksjonsoverskrift + [label, verdi, numFmt?]-rader i to kolonner fra startRad.
function kpiBlokk(ws, startRad, kolLabel, kolVerdi, tittel, rader) {
  const t = ws.getCell(`${kolLabel}${startRad}`);
  t.value = tittel.toUpperCase();
  t.font = { bold: true, size: 9, color: GRAA };
  t.fill = SEKSJON_FYLL;
  ws.getCell(`${kolVerdi}${startRad}`).fill = SEKSJON_FYLL;
  rader.forEach(([label, verdi, numFmt], i) => {
    const rad = startRad + 1 + i;
    const cl = ws.getCell(`${kolLabel}${rad}`);
    cl.value = label;
    cl.font = { size: 10 };
    const cv = ws.getCell(`${kolVerdi}${rad}`);
    cv.value = verdi;
    cv.font = { bold: true, size: 10 };
    if (numFmt) cv.numFmt = numFmt;
    cv.alignment = { horizontal: 'right' };
  });
  return startRad + 1 + rader.length; // neste ledige rad
}

export async function lagLeieforholdExcel(data, okonomi = null, meta = {}) {
  const { rows = [], totals = {}, source } = data || {};
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DigiHome Admin';
  wb.created = new Date();

  const kildeTekst = source === 'lease-income' ? 'plattform (1:1)'
    : source === 'units-contracts' ? 'plattform (enheter + kontrakter, live)'
    : 'kontrakter (avledet)';
  const filtrertUttrekk = Boolean(meta.filterTekst || meta.scenario);
  const utvalgTekst = filtrertUttrekk
    ? `Filtrert utvalg: ${rows.length}${meta.totaltAntall ? ` av ${meta.totaltAntall}` : ''} enheter${meta.filterTekst ? ` — ${meta.filterTekst}` : ''}`
    : `Hele porteføljen — ${rows.length} enheter`;
  const scenarioTekst = meta.scenario
    ? `Scenario-dato ${penDato(meta.scenario)}: fremtidige innflyttinger t.o.m. datoen telles som utleid, utflyttinger før datoen som ledig.`
    : '';

  /* ═══ Delte økonomiberegninger (1:1 med skjermen) ═══ */
  const grunnlag = meta.alleRader?.length ? meta.alleRader : rows;
  const fellesAktive = aktiveKostnader(okonomi?.felles, meta.scenario || '');
  const fellesTot = fellesAktive.reduce((s, p) => s + (p.belop || 0), 0);
  const andel = fordelKostnader(grunnlag, fellesAktive);
  const fordeltUtvalg = rows.reduce((s, r) => s + (andel.get(radNokkel(r)) || 0), 0);
  const cacFor = (r) => okonomi?.enheter?.[radNokkel(r)]?.cac || 0;
  const cacTot = rows.reduce((s, r) => s + cacFor(r), 0);
  const feeReal = totals.fee || 0;
  const dekning = fellesTot > 0 ? feeReal / fellesTot : null;
  const paybackSnitt = cacTot > 0 && feeReal > 0 ? cacTot / feeReal : null;
  const snittHonorar = totals.leased ? feeReal / totals.leased : 0;
  const tilBreakEven = fellesTot > feeReal && snittHonorar > 0 ? Math.ceil((fellesTot - feeReal) / snittHonorar) : 0;

  /* ═══════════════ ARK 1: Oversikt (lederdashboard) ═══════════════ */
  const ws0 = wb.addWorksheet('Oversikt', { pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1 } });
  ws0.columns = [{ width: 30 }, { width: 18 }, { width: 4 }, { width: 30 }, { width: 18 }];
  ws0.getCell('A1').value = 'DigiHome — Leieforhold & inntekter';
  ws0.getCell('A1').font = { bold: true, size: 16 };
  ws0.getCell('A2').value = `Generert ${new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })} kl. ${new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })} · kilde: ${kildeTekst}`;
  ws0.getCell('A2').font = { size: 9, color: GRAA };
  ws0.getCell('A3').value = utvalgTekst;
  ws0.getCell('A3').font = { size: 9, bold: filtrertUttrekk, color: filtrertUttrekk ? { argb: 'FF6D28D9' } : GRAA };
  if (scenarioTekst) {
    ws0.getCell('A4').value = scenarioTekst;
    ws0.getCell('A4').font = { size: 9, italic: true, color: { argb: 'FF9A6B1C' } };
  }

  const start0 = 6;
  // Inntektstrappen: annonserte ledige = pipeline (usignert), aldri «sikret».
  const ann = annonsertSplitt(rows);
  const sikretLeie = (totals.actual_rent || 0) + (totals.expected_rent || 0);
  const pipelineLeie = (totals.pending_rent || 0) + ann.leie;
  const ledigUtenAnnonse = Math.max(0, (totals.estimate_rent || 0) - ann.leie);
  // Venstre kolonne: Portefølje + Inntektstrappen
  const neste = kpiBlokk(ws0, start0, 'A', 'B', 'Portefølje', [
    ['Enheter i utvalget', rows.length],
    ['Utleid (betaler nå)', totals.leased || 0],
    ['Fremtidig innflytting · signert', totals.future || 0],
    ['Under signering', totals.signing || 0],
    ['Annonsert · pipeline', ann.antall],
    ['Ledig uten annonse', Math.max(0, (totals.vacant || 0) - ann.antall)],
    ['Utleiegrad', (totals.occupancy_pct || 0) / 100, '0 %'],
  ]);
  const nesteV = kpiBlokk(ws0, neste + 1, 'A', 'B', 'Inntektstrappen / mnd', [
    ['1. Leie i dag (løpende)', totals.actual_rent || 0, VALUTA],
    ['2. Kommende · signert', totals.expected_rent || 0, VALUTA],
    ['   = Sikret leie totalt', sikretLeie, VALUTA],
    ['3. Pipeline (signering + annonsert)', pipelineLeie, VALUTA],
    ['4. Ledig · uten annonse (estimat)', ledigUtenAnnonse, VALUTA],
    ['Potensial ved full utleie', (totals.actual_rent || 0) + (totals.expected_rent || 0) + (totals.pending_rent || 0) + (totals.estimate_rent || 0), VALUTA],
  ]);
  // Høyre kolonne: DigiHome-honorar + Økonomi
  const nesteH = kpiBlokk(ws0, start0, 'D', 'E', 'DigiHome / mnd (eks. mva)', [
    ['Honorar i dag', feeReal, VALUTA],
    ['Honorar sikret (m/ signert)', totals.fee_garantert ?? feeReal, VALUTA],
    ['Honorar potensial totalt', totals.fee_total ?? feeReal, VALUTA],
    ['Netto til huseiere (i dag)', totals.net || 0, VALUTA],
  ]);
  const nesteH2 = kpiBlokk(ws0, nesteH + 1, 'D', 'E', 'Økonomi (asset-light)', [
    ['Faste kostnader / mnd', fellesTot, VALUTA],
    ['Fordelt på utvalget / mnd', fordeltUtvalg, VALUTA],
    ['Margin / mnd (utvalget)', feeReal - fordeltUtvalg, VALUTA],
    ['Dekningsgrad (honorar/faste)', dekning, dekning != null ? '0 %' : undefined],
    ['CAC totalt · engangs', cacTot, VALUTA],
    ['Payback snitt (mnd)', paybackSnitt != null ? Math.round(paybackSnitt * 10) / 10 : '—', paybackSnitt != null ? '0.0' : undefined],
    ['Break-even', dekning == null ? '—' : dekning >= 1 ? 'Nådd' : `~${tilBreakEven} enheter igjen`],
  ]);
  const noteRad0 = Math.max(nesteV, nesteH2) + 2;
  ws0.getCell(`A${noteRad0}`).value = 'Inntektstrappen: Leie i dag → Kommende (signert) = sikret → Pipeline (under signering + annonsert, usignert) → Ledig uten annonse. DigiHome er asset-light: huseier bærer alle boligkostnader. Margin = honorar − fordelte faste kostnader. CAC er engangs anskaffelseskost (payback-metrikk).';
  ws0.getCell(`A${noteRad0}`).font = { size: 8.5, italic: true, color: GRAA };

  /* ═══════════════ ARK 2: Leieforhold (15 kolonner A–O) ═══════════════ */
  const ws = wb.addWorksheet('Leieforhold', {
    views: [{ state: 'frozen', ySplit: 9 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [
    { width: 26 }, { width: 18 }, { width: 30 }, { width: 22 }, { width: 22 },
    { width: 20 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 8 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 16 },
  ];

  ws.getCell('A1').value = 'DigiHome — Leieforhold & inntekter';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A2').value = `Generert ${new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })} · kilde: ${kildeTekst}`;
  ws.getCell('A2').font = { size: 9, color: GRAA };
  ws.getCell('A3').value = `${utvalgTekst}${scenarioTekst ? ` · ${scenarioTekst}` : ''}`;
  ws.getCell('A3').font = { size: 9, bold: filtrertUttrekk, color: filtrertUttrekk ? { argb: 'FF6D28D9' } : GRAA };

  const forsteData = 10;
  const sisteData = forsteData + Math.max(rows.length, 1) - 1;

  // KPI-bånd rad 4–7 — LEVENDE SUMIF/COUNTIF mot dataområdet (Beløp = kolonne J)
  const kpi = [
    ['Faktisk leie / mnd', 'Faktisk leie'],
    ['Forventet · signert / mnd', 'Forventet (signert)'],
    ['Under signering / mnd', 'Under signering'],
    ['Ledig · estimat / mnd', 'Estimat'],
  ];
  kpi.forEach(([label, inntektstype], i) => {
    const rad = 4 + i;
    ws.getCell(`A${rad}`).value = label;
    ws.getCell(`A${rad}`).font = { bold: true, size: 10 };
    ws.getCell(`A${rad}`).fill = KPI_FYLL;
    ws.getCell(`B${rad}`).value = { formula: `SUMIF($G$${forsteData}:$G$${sisteData},"${inntektstype}",$J$${forsteData}:$J$${sisteData})` };
    ws.getCell(`B${rad}`).numFmt = VALUTA;
    ws.getCell(`B${rad}`).font = { bold: true, size: 10 };
    ws.getCell(`B${rad}`).fill = KPI_FYLL;
    ws.getCell(`C${rad}`).value = { formula: `COUNTIF($G$${forsteData}:$G$${sisteData},"${inntektstype}")&" stk"` };
    ws.getCell(`C${rad}`).font = { size: 9, color: GRAA };
    ws.getCell(`C${rad}`).fill = KPI_FYLL;
  });

  // Hoderad (rad 9) — nå med Utflytting (kolonne I)
  const HODER = ['Eiendom / enhet', 'Enhetstype', 'Adresse', 'Huseier', 'Leietaker', 'Status', 'Inntektstype', 'Innflytting', 'Utflytting', 'Beløp', 'Sats', 'Honorar (eks. mva)', 'Netto til huseier', 'Depositum', 'Servicenivå'];
  const hodeRad = ws.getRow(9);
  HODER.forEach((h, i) => {
    const c = hodeRad.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    c.fill = HODE_FYLL;
    c.alignment = { vertical: 'middle' };
  });
  hodeRad.height = 20;

  // Datarader — L og M som EKTE formler (mva-divisor per rad ut fra
  // vat_inclusive: privat = brutto/1,25, næring = eks. mva direkte)
  rows.forEach((r, i) => {
    const radNr = forsteData + i;
    const rad = ws.getRow(radNr);
    const eksDivisor = r.vat_inclusive ? '/1.25' : '';
    rad.values = [
      r.unit_room,
      r.bolig_type || r.unit_type,
      r.address,
      r.owner_name,
      r.tenant_name || '—',
      r.status_label,
      INCOME_TIL_LABEL[r.income_type] || r.income_type,
      r.move_in_date || '',
      r.move_out_date || (r.tenant_name ? 'Løpende' : ''),
      r.monthly_rent || 0,
      r.fee_percent || 0,
      null, null,
      r.deposit == null ? '' : r.deposit,
      r.service_level,
    ];
    rad.getCell(12).value = { formula: `ROUND(J${radNr}*K${radNr}/100${eksDivisor},0)` };
    rad.getCell(13).value = { formula: `ROUND(J${radNr}-L${radNr}*1.25,0)` };
    rad.getCell(10).numFmt = VALUTA;
    rad.getCell(11).numFmt = SATS;
    rad.getCell(12).numFmt = VALUTA;
    rad.getCell(13).numFmt = VALUTA;
    rad.getCell(14).numFmt = VALUTA;
    rad.font = { size: 10 };
  });

  // Sum-rad
  const sumRad = ws.getRow(sisteData + 1);
  sumRad.getCell(1).value = 'SUM';
  sumRad.getCell(10).value = { formula: `SUM(J${forsteData}:J${sisteData})` };
  sumRad.getCell(12).value = { formula: `SUM(L${forsteData}:L${sisteData})` };
  sumRad.getCell(13).value = { formula: `SUM(M${forsteData}:M${sisteData})` };
  sumRad.getCell(14).value = { formula: `SUM(N${forsteData}:N${sisteData})` };
  [10, 12, 13, 14].forEach((k) => { sumRad.getCell(k).numFmt = VALUTA; });
  for (let k = 1; k <= 15; k += 1) { sumRad.getCell(k).font = { bold: true, size: 10 }; sumRad.getCell(k).fill = SUM_FYLL; }

  // Nedtrekk (datavalidering) på B/F/G/O
  const dvListe = (verdier) => ({ type: 'list', allowBlank: true, formulae: [`"${verdier.join(',')}"`] });
  for (let radNr = forsteData; radNr <= sisteData; radNr += 1) {
    ws.getCell(`B${radNr}`).dataValidation = dvListe(ENHETSTYPER);
    ws.getCell(`F${radNr}`).dataValidation = dvListe(STATUSER);
    ws.getCell(`G${radNr}`).dataValidation = dvListe(INNTEKTSTYPER);
    ws.getCell(`O${radNr}`).dataValidation = dvListe(SERVICENIVAA);
  }

  // Betinget formatering: Status (F) + Enhetstype (B)
  betingetStatus(ws, `F${forsteData}:F${sisteData}`);
  ws.addConditionalFormatting({
    ref: `B${forsteData}:B${sisteData}`,
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'Rom i bofellesskap', priority: 1, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF4EFFB' } } } },
    ],
  });

  ws.autoFilter = { from: 'A9', to: `O${sisteData}` };

  /* ═══════════════ ARK 3: Per huseier (kun realisert) ═══════════════ */
  const ws2 = wb.addWorksheet('Per huseier', { pageSetup: { orientation: 'landscape', paperSize: 9 } });
  ws2.columns = [{ width: 30 }, { width: 14 }, { width: 18 }, { width: 22 }, { width: 16 }];
  ws2.getCell('A1').value = 'Per huseier — kun realisert (faktisk leie)';
  ws2.getCell('A1').font = { bold: true, size: 12 };

  const hode2 = ws2.getRow(3);
  ['Huseier', 'Antall utleid', 'Faktisk leie / mnd', 'Honorar / mnd (eks. mva)', 'Netto / mnd'].forEach((h, i) => {
    const c = hode2.getCell(i + 1);
    c.value = h; c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }; c.fill = HODE_FYLL;
  });

  const perEier = new Map();
  for (const r of rows) {
    if (r.group !== 'leased') continue;
    const navn = r.owner_name || '—';
    if (!perEier.has(navn)) perEier.set(navn, { antall: 0, leie: 0, honorar: 0, netto: 0 });
    const e = perEier.get(navn);
    e.antall += 1; e.leie += r.monthly_rent || 0; e.honorar += r.fee_amount || 0; e.netto += r.net_to_owner || 0;
  }
  const eiere = [...perEier.entries()].sort((a, b) => b[1].leie - a[1].leie);
  eiere.forEach(([navn, e], i) => {
    const rad = ws2.getRow(4 + i);
    rad.values = [navn, e.antall, e.leie, e.honorar, e.netto];
    rad.getCell(3).numFmt = VALUTA; rad.getCell(4).numFmt = VALUTA; rad.getCell(5).numFmt = VALUTA;
    rad.font = { size: 10 };
  });
  const siste2 = 3 + Math.max(eiere.length, 1);
  const sum2 = ws2.getRow(siste2 + 1);
  sum2.getCell(1).value = 'SUM';
  sum2.getCell(2).value = { formula: `SUM(B4:B${siste2})` };
  sum2.getCell(3).value = { formula: `SUM(C4:C${siste2})` };
  sum2.getCell(4).value = { formula: `SUM(D4:D${siste2})` };
  sum2.getCell(5).value = { formula: `SUM(E4:E${siste2})` };
  [3, 4, 5].forEach((k) => { sum2.getCell(k).numFmt = VALUTA; });
  for (let k = 1; k <= 5; k += 1) { sum2.getCell(k).font = { bold: true, size: 10 }; sum2.getCell(k).fill = SUM_FYLL; }

  /* ═══════════════ ARK 4: Økonomi (honorar − faste kostnader = margin) ═══ */
  if (okonomi && ((okonomi.felles || []).length || Object.keys(okonomi.enheter || {}).length)) {
    const ws3 = wb.addWorksheet('Økonomi', { pageSetup: { orientation: 'landscape', paperSize: 9 } });
    ws3.columns = [{ width: 32 }, { width: 16 }, { width: 20 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 10 }, { width: 14 }, { width: 12 }];
    ws3.getCell('A1').value = 'DigiHome — Økonomi per enhet (asset-light: huseier bærer boligkostnadene)';
    ws3.getCell('A1').font = { bold: true, size: 12 };

    // KPI-blokk (1:1 med skjermens Økonomi-modus)
    const kpi3 = [
      ['Honorar / mnd (realisert)', feeReal, VALUTA],
      ['Faste kostnader / mnd', fellesTot, VALUTA],
      ['Fordelt på utvalget / mnd', fordeltUtvalg, VALUTA],
      ['Margin / mnd', feeReal - fordeltUtvalg, VALUTA],
      ['Dekningsgrad', dekning, dekning != null ? '0 %' : undefined],
      ['CAC totalt · engangs', cacTot, VALUTA],
    ];
    kpi3.forEach(([l, v, fmt], i) => {
      const rad = ws3.getRow(3 + i);
      rad.getCell(1).value = l; rad.getCell(1).font = { bold: true, size: 10 };
      rad.getCell(2).value = v;
      if (fmt) rad.getCell(2).numFmt = fmt;
      rad.getCell(2).font = { bold: true, size: 10 };
      rad.getCell(1).fill = KPI_FYLL; rad.getCell(2).fill = KPI_FYLL;
    });

    // Faste kostnader-liste (med kategori, fordeling og periode)
    ws3.getCell('D3').value = 'Faste kostnader (aktive):'; ws3.getCell('D3').font = { bold: true, size: 10 };
    fellesAktive.forEach((p, i) => {
      const rad = ws3.getRow(4 + i);
      rad.getCell(4).value = `${p.navn}${p.kategori ? ` (${KATEGORI_LABEL[p.kategori] || p.kategori})` : ''}`;
      rad.getCell(4).font = { size: 9 };
      rad.getCell(5).value = p.belop; rad.getCell(5).numFmt = VALUTA; rad.getCell(5).font = { size: 9 };
      const periode = p.startDato || p.sluttDato
        ? `${p.startDato ? `fra ${penDato(p.startDato)}` : ''}${p.startDato && p.sluttDato ? ' ' : ''}${p.sluttDato ? `til ${penDato(p.sluttDato)}` : ''}`
        : 'løpende';
      rad.getCell(6).value = `${FORDELING_LABEL[p.fordeling] || 'likt per enhet'} · ${periode}`;
      rad.getCell(6).font = { size: 9, color: GRAA };
    });

    // Tabell per enhet
    const hodeRad3 = Math.max(10, 5 + fellesAktive.length);
    const hode3 = ws3.getRow(hodeRad3);
    ['Adresse / enhet', 'Type', 'Status', 'Honorar / mnd', 'Andel faste', 'Margin / mnd', 'Margin %', 'CAC (engangs)', 'Payback (mnd)'].forEach((h, i) => {
      const c = hode3.getCell(i + 1);
      c.value = h; c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }; c.fill = HODE_FYLL;
    });
    rows.forEach((r, i) => {
      const a = andel.get(radNokkel(r)) || 0;
      const cac = cacFor(r);
      const rad = ws3.getRow(hodeRad3 + 1 + i);
      rad.values = [
        `${r.address}${r.unit_type === 'Rom i bofellesskap' ? ` · ${r.unit_room}` : ''}`,
        r.bolig_type || r.unit_type,
        r.status_label,
        r.fee_amount || 0,
        a,
        (r.fee_amount || 0) - a,
        r.fee_amount ? ((r.fee_amount - a) / r.fee_amount) : null,
        cac || null,
        cac && r.fee_amount ? cac / r.fee_amount : null,
      ];
      rad.font = { size: 9.5 };
      [4, 5, 6, 8].forEach((k) => { rad.getCell(k).numFmt = VALUTA; });
      rad.getCell(7).numFmt = '0 %';
      rad.getCell(9).numFmt = '0.0';
    });
    const siste3 = hodeRad3 + Math.max(rows.length, 1);
    const sum3 = ws3.getRow(siste3 + 1);
    sum3.getCell(1).value = 'SUM';
    [4, 5, 6, 8].forEach((k) => {
      const kol = String.fromCharCode(64 + k);
      sum3.getCell(k).value = { formula: `SUM(${kol}${hodeRad3 + 1}:${kol}${siste3})` };
      sum3.getCell(k).numFmt = VALUTA;
    });
    for (let k = 1; k <= 9; k += 1) { sum3.getCell(k).font = { bold: true, size: 10 }; sum3.getCell(k).fill = SUM_FYLL; }
    ws3.autoFilter = { from: `A${hodeRad3}`, to: `I${siste3}` };
    ws3.views = [{ state: 'frozen', ySplit: hodeRad3 }];
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// CSV: samme kolonner som Leieforhold-arket (nå 15 med Utflytting),
// ;-separert, UTF-8 m/ BOM, beregnede verdier. Rene data — ingen metarader.
export function lagLeieforholdCsv({ rows }) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linjer = [
    ['Eiendom / enhet', 'Enhetstype', 'Adresse', 'Huseier', 'Leietaker', 'Status', 'Inntektstype', 'Innflytting', 'Utflytting', 'Beløp', 'Sats', 'Honorar (eks. mva)', 'Netto til huseier', 'Depositum', 'Servicenivå'].join(';'),
    ...(rows || []).map((r) => [
      esc(r.unit_room), esc(r.bolig_type || r.unit_type), esc(r.address), esc(r.owner_name), esc(r.tenant_name || '—'),
      esc(r.status_label), esc(INCOME_TIL_LABEL[r.income_type] || r.income_type), esc(r.move_in_date || ''),
      esc(r.move_out_date || (r.tenant_name ? 'Løpende' : '')),
      r.monthly_rent || 0, String(r.fee_percent || 0).replace('.', ','),
      r.fee_amount || 0, r.net_to_owner || 0, r.deposit == null ? '' : r.deposit, esc(r.service_level),
    ].join(';')),
  ];
  return '\uFEFF' + linjer.join('\n');
}
