// ---------------------------------------------------------------------------
// Excel-/CSV-eksport for «Leieforhold & inntekter» — 1:1 med plattformens
// eksport (spec fra agentbro-tråd «leieforhold-view»):
//   · Ekte .xlsx med 2 ark: «Leieforhold» (14 kolonner A–N) + «Per huseier»
//   · LEVENDE modell: Honorar (K) og Netto (L) er ekte Excel-formler,
//     KPI-bånd (rad 4–7) er SUMIF/COUNTIF mot dataområdet, sum-rad nederst
//   · Nedtrekk (datavalidering) på B/F/G/N, betinget farge på Status (F) og
//     Enhetstype (B), frys A10, autofilter A9:N{n}, liggende A4-utskrift
//   · Tallformat: valuta #,##0" kr" · sats 0.0" %"
//   · CSV-variant: ;-separert, UTF-8 m/ BOM, beregnede verdier
// Filnavn: digihome-leieforhold-inntekter.xlsx / .csv
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs';

const VALUTA = '#,##0" kr"';
const SATS = '0.0" %"';
const HODE_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C0C0C' } };
const KPI_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4EFFB' } };
const SUM_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F0EA' } };

const STATUSER = ['Utleid', 'Fremtidig innflytting', 'Under signering', 'Ledig', 'Ledig (Annonsert)'];
const ENHETSTYPER = ['Hel enhet', 'Rom i bofellesskap'];
const INNTEKTSTYPER = ['Faktisk leie', 'Forventet (signert)', 'Under signering', 'Estimat'];
const SERVICENIVAA = ['Selvbetjening', 'Full forvaltning'];
const INCOME_TIL_LABEL = { actual: 'Faktisk leie', expected_signed: 'Forventet (signert)', pending_signing: 'Under signering', estimate: 'Estimat' };

// Statusfarger fra spec (chip-bakgrunner):
const STATUS_FARGE = {
  'Utleid': 'FFE7F4EC',
  'Fremtidig innflytting': 'FFE8EEFC',
  'Under signering': 'FFFDF3E0',
  'Ledig': 'FFF1ECE4',
  'Ledig (Annonsert)': 'FFF1ECE4',
};

function betingetStatus(ws, omraade) {
  ws.addConditionalFormatting({
    ref: omraade,
    rules: STATUSER.slice(0, 4).map((s, i) => ({
      type: 'containsText', operator: 'containsText', text: s, priority: i + 1,
      style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: STATUS_FARGE[s] } } },
    })),
  });
}

export async function lagLeieforholdExcel({ rows, totals, env, source }, okonomi = null) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DigiHome Admin';
  wb.created = new Date();

  /* ═══ ARK 1: Leieforhold ═══ */
  const ws = wb.addWorksheet('Leieforhold', {
    views: [{ state: 'frozen', ySplit: 9 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [
    { width: 26 }, { width: 18 }, { width: 30 }, { width: 22 }, { width: 22 },
    { width: 20 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 8 },
    { width: 15 }, { width: 15 }, { width: 12 }, { width: 16 },
  ];

  // Tittel + metadata
  ws.getCell('A1').value = 'DigiHome — Leieforhold & inntekter';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A2').value = `Generert ${new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })} · kilde: ${source === 'lease-income' ? 'plattform (1:1)' : source === 'units-contracts' ? 'plattform (enheter + kontrakter, live)' : 'kontrakter (avledet)'}`;
  ws.getCell('A2').font = { size: 9, color: { argb: 'FF8A8278' } };

  const forsteData = 10;
  const sisteData = forsteData + Math.max(rows.length, 1) - 1;

  // KPI-bånd rad 4–7 — LEVENDE SUMIF/COUNTIF mot dataområdet
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
    ws.getCell(`B${rad}`).value = { formula: `SUMIF($G$${forsteData}:$G$${sisteData},"${inntektstype}",$I$${forsteData}:$I$${sisteData})` };
    ws.getCell(`B${rad}`).numFmt = VALUTA;
    ws.getCell(`B${rad}`).font = { bold: true, size: 10 };
    ws.getCell(`B${rad}`).fill = KPI_FYLL;
    ws.getCell(`C${rad}`).value = { formula: `COUNTIF($G$${forsteData}:$G$${sisteData},"${inntektstype}")&" stk"` };
    ws.getCell(`C${rad}`).font = { size: 9, color: { argb: 'FF8A8278' } };
    ws.getCell(`C${rad}`).fill = KPI_FYLL;
  });

  // Hoderad (rad 9)
  const HODER = ['Eiendom / enhet', 'Enhetstype', 'Adresse', 'Huseier', 'Leietaker', 'Status', 'Inntektstype', 'Innflytting', 'Beløp', 'Sats', 'Honorar (eks. mva)', 'Netto til huseier', 'Depositum', 'Servicenivå'];
  const hodeRad = ws.getRow(9);
  HODER.forEach((h, i) => {
    const c = hodeRad.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    c.fill = HODE_FYLL;
    c.alignment = { vertical: 'middle' };
  });
  hodeRad.height = 20;

  // Datarader — K og L som EKTE formler (mva-divisor per rad ut fra
  // fee_vat_inclusive: privat = brutto/1,25, næring = eks. mva direkte)
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
      r.monthly_rent || 0,
      r.fee_percent || 0,
      null, null,
      r.deposit == null ? '' : r.deposit,
      r.service_level,
    ];
    rad.getCell(11).value = { formula: `ROUND(I${radNr}*J${radNr}/100${eksDivisor},0)` };
    rad.getCell(12).value = { formula: `ROUND(I${radNr}-K${radNr}*1.25,0)` };
    rad.getCell(9).numFmt = VALUTA;
    rad.getCell(10).numFmt = SATS;
    rad.getCell(11).numFmt = VALUTA;
    rad.getCell(12).numFmt = VALUTA;
    rad.getCell(13).numFmt = VALUTA;
    rad.font = { size: 10 };
  });

  // Sum-rad
  const sumRad = ws.getRow(sisteData + 1);
  sumRad.getCell(1).value = 'SUM';
  sumRad.getCell(9).value = { formula: `SUM(I${forsteData}:I${sisteData})` };
  sumRad.getCell(11).value = { formula: `SUM(K${forsteData}:K${sisteData})` };
  sumRad.getCell(12).value = { formula: `SUM(L${forsteData}:L${sisteData})` };
  sumRad.getCell(13).value = { formula: `SUM(M${forsteData}:M${sisteData})` };
  [9, 11, 12, 13].forEach((k) => { sumRad.getCell(k).numFmt = VALUTA; });
  for (let k = 1; k <= 14; k += 1) { sumRad.getCell(k).font = { bold: true, size: 10 }; sumRad.getCell(k).fill = SUM_FYLL; }

  // Nedtrekk (datavalidering) på B/F/G/N
  const dvListe = (verdier) => ({ type: 'list', allowBlank: true, formulae: [`"${verdier.join(',')}"`] });
  for (let radNr = forsteData; radNr <= sisteData; radNr += 1) {
    ws.getCell(`B${radNr}`).dataValidation = dvListe(ENHETSTYPER);
    ws.getCell(`F${radNr}`).dataValidation = dvListe(STATUSER);
    ws.getCell(`G${radNr}`).dataValidation = dvListe(INNTEKTSTYPER);
    ws.getCell(`N${radNr}`).dataValidation = dvListe(SERVICENIVAA);
  }

  // Betinget formatering: Status (F) + Enhetstype (B)
  betingetStatus(ws, `F${forsteData}:F${sisteData}`);
  ws.addConditionalFormatting({
    ref: `B${forsteData}:B${sisteData}`,
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'Rom i bofellesskap', priority: 1, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF4EFFB' } } } },
    ],
  });

  ws.autoFilter = { from: 'A9', to: `N${sisteData}` };

  /* ═══ ARK 2: Per huseier (kun realisert) ═══ */
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

  /* ═══ ARK 3: Enhetsøkonomi (honorar − fordelte felleskostnader = margin) ═══ */
  if (okonomi && (okonomi.felles?.length || Object.keys(okonomi.enheter || {}).length)) {
    const ws3 = wb.addWorksheet('Enhetsøkonomi', { pageSetup: { orientation: 'landscape', paperSize: 9 } });
    ws3.columns = [{ width: 32 }, { width: 16 }, { width: 20 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 10 }, { width: 14 }, { width: 12 }];
    ws3.getCell('A1').value = 'DigiHome — Enhetsøkonomi (asset-light: huseier bærer boligkostnadene)';
    ws3.getCell('A1').font = { bold: true, size: 12 };

    // Fordel felleskostnader per rad (samme nøkler som skjermen).
    const nok = (r) => r.enhet_id || `${r.address}|${r.unit_room}`;
    const utleide = rows.filter((r) => r.group === 'leased');
    const feeAlle = rows.reduce((s, r) => s + (r.fee_amount || 0), 0);
    const andel = new Map();
    const leggTil = (r, v) => andel.set(nok(r), (andel.get(nok(r)) || 0) + v);
    for (const p of okonomi.felles || []) {
      const b = p.belop || 0;
      if (p.fordeling === 'utleide' && utleide.length) utleide.forEach((r) => leggTil(r, b / utleide.length));
      else if (p.fordeling === 'honorar' && feeAlle > 0) rows.forEach((r) => leggTil(r, b * ((r.fee_amount || 0) / feeAlle)));
      else if (rows.length) rows.forEach((r) => leggTil(r, b / rows.length));
    }
    const fellesTot = (okonomi.felles || []).reduce((s, p) => s + (p.belop || 0), 0);
    const feeReal = utleide.reduce((s, r) => s + (r.fee_amount || 0), 0);

    // KPI-blokk
    const kpi3 = [
      ['Honorar / mnd (realisert)', feeReal],
      ['Felleskostnader / mnd', fellesTot],
      ['Margin / mnd', feeReal - fellesTot],
      ['Dekningsgrad', fellesTot > 0 ? feeReal / fellesTot : null],
    ];
    kpi3.forEach(([l, v], i) => {
      const rad = ws3.getRow(3 + i);
      rad.getCell(1).value = l; rad.getCell(1).font = { bold: true, size: 10 };
      rad.getCell(2).value = v;
      rad.getCell(2).numFmt = l === 'Dekningsgrad' ? '0 %' : VALUTA;
      rad.getCell(2).font = { bold: true, size: 10 };
      rad.getCell(1).fill = KPI_FYLL; rad.getCell(2).fill = KPI_FYLL;
    });

    // Felleskostnadsliste
    ws3.getCell('D3').value = 'Felleskostnader:'; ws3.getCell('D3').font = { bold: true, size: 10 };
    (okonomi.felles || []).forEach((p, i) => {
      const rad = ws3.getRow(4 + i);
      rad.getCell(4).value = p.navn; rad.getCell(4).font = { size: 9 };
      rad.getCell(5).value = p.belop; rad.getCell(5).numFmt = VALUTA; rad.getCell(5).font = { size: 9 };
      rad.getCell(6).value = p.fordeling === 'utleide' ? 'kun utleide' : p.fordeling === 'honorar' ? 'etter honorar' : 'likt per enhet';
      rad.getCell(6).font = { size: 9, color: { argb: 'FF8A8278' } };
    });

    // Tabell
    const hodeRad3 = 9;
    const hode3 = ws3.getRow(hodeRad3);
    ['Adresse / enhet', 'Type', 'Status', 'Honorar / mnd', 'Andel felles', 'Margin / mnd', 'Margin %', 'CAC (engangs)', 'Payback (mnd)'].forEach((h, i) => {
      const c = hode3.getCell(i + 1);
      c.value = h; c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }; c.fill = HODE_FYLL;
    });
    rows.forEach((r, i) => {
      const a = andel.get(nok(r)) || 0;
      const cac = okonomi.enheter?.[nok(r)]?.cac || 0;
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
    const siste3 = hodeRad3 + rows.length;
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

// CSV: samme 14 kolonner, ;-separert, UTF-8 m/ BOM, beregnede verdier.
export function lagLeieforholdCsv({ rows }) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linjer = [
    ['Eiendom / enhet', 'Enhetstype', 'Adresse', 'Huseier', 'Leietaker', 'Status', 'Inntektstype', 'Innflytting', 'Beløp', 'Sats', 'Honorar (eks. mva)', 'Netto til huseier', 'Depositum', 'Servicenivå'].join(';'),
    ...rows.map((r) => [
      esc(r.unit_room), esc(r.bolig_type || r.unit_type), esc(r.address), esc(r.owner_name), esc(r.tenant_name || '—'),
      esc(r.status_label), esc(INCOME_TIL_LABEL[r.income_type] || r.income_type), esc(r.move_in_date || ''),
      r.monthly_rent || 0, String(r.fee_percent || 0).replace('.', ','),
      r.fee_amount || 0, r.net_to_owner || 0, r.deposit == null ? '' : r.deposit, esc(r.service_level),
    ].join(';')),
  ];
  return '\uFEFF' + linjer.join('\n');
}
