// ---------------------------------------------------------------------------
// Excel-eksport for Budsjett — styremøteklar arbeidsbok i verdensklasse:
//   · «Budsjett {år}»  : hele rutenettet (faste kategorier + egne poster) med
//                        LEVENDE formler, KPI-blokk øverst, sebrastriping,
//                        databarer på Sum-kolonnen, markert inneværende måned
//                        og månedskommentarer som celle-notes
//   · «Mot faktisk»    : budsjett/faktisk/avvik per måned med betinget
//                        formatering (grønt = bedre enn plan, rødt = dårligere)
//   · «Nøkkeltall»     : ledelsessammendrag — årsbudsjett (formler på tvers av
//                        ark), faktisk hittil, forventet årsslutt og margin
// Frosne ruter, fargede arkfaner, valutaformat, print-oppsett (liggende A4).
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs';
import { INNTEKT_KATEGORIER, KOSTNAD_KATEGORIER } from './budsjett';

const VALUTA = '#,##0" kr"';
const AVVIK = '+#,##0" kr";[Red]-#,##0" kr";0" kr"';
const PROSENT = '0.0" %"';
const HODE_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C0C0C' } };
const INN_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F9F5' } };
const KOST_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF6EC' } };
const SUM_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F0EA' } };
const STRIPE_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBFAF8' } };
const NAA_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F1FE' } };
const KANT = { style: 'thin', color: { argb: 'FFEDEAE4' } };
const MND = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const FREKVENS_LABEL = { engangs: 'engangs', manedlig: 'månedlig', kvartalsvis: 'kvartalsvis', arlig: 'årlig' };

const kol = (i) => String.fromCharCode(66 + i); // 0 → B … 11 → M

function nyArbeidsbok() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DigiHome Admin';
  wb.created = new Date();
  return wb;
}

function nyttArk(wb, navn, tabFarge) {
  const ws = wb.addWorksheet(navn, {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 4 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    properties: { tabColor: { argb: tabFarge } },
  });
  ws.columns = [{ width: 30 }, ...Array(12).fill({ width: 11 }), { width: 13 }];
  return ws;
}

function tittelRader(ws, tittel, undertekst) {
  ws.getCell('A1').value = tittel;
  ws.getCell('A1').font = { bold: true, size: 15 };
  ws.getCell('A2').value = undertekst;
  ws.getCell('A2').font = { size: 9, color: { argb: 'FF8A8278' } };
}

function hodeRad(ws, rad, etiketter, naaKol = -1) {
  ws.getCell(`A${rad}`).value = 'Kategori';
  etiketter.forEach((l, i) => { ws.getCell(`${kol(i)}${rad}`).value = l; });
  ws.getCell(`N${rad}`).value = 'Sum';
  for (let c = 1; c <= 14; c++) {
    const cell = ws.getRow(rad).getCell(c);
    cell.fill = HODE_FYLL;
    cell.font = { bold: true, color: { argb: c === naaKol + 2 ? 'FFD9C7FA' : 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: c === 1 ? 'left' : 'right' };
  }
}

function dataRad(ws, rad, navn, verdier, { suffix = '', stripe = false, naaKol = -1 } = {}) {
  ws.getCell(`A${rad}`).value = suffix ? `${navn}  ·  ${suffix}` : navn;
  ws.getCell(`A${rad}`).font = { size: 10 };
  verdier.forEach((v, i) => {
    const c = ws.getCell(`${kol(i)}${rad}`);
    c.value = Number(v) || 0;
    c.numFmt = VALUTA;
  });
  const n = ws.getCell(`N${rad}`);
  n.value = { formula: `SUM(B${rad}:M${rad})` };
  n.numFmt = VALUTA;
  n.font = { bold: true, size: 10 };
  for (let c = 1; c <= 14; c++) {
    const cell = ws.getRow(rad).getCell(c);
    if (c - 2 === naaKol) cell.fill = NAA_FYLL;           // inneværende måned
    else if (stripe) cell.fill = STRIPE_FYLL;              // sebrastriping
    cell.border = { bottom: KANT };
  }
}

function seksjonsRad(ws, rad, tittel, fyll, farge) {
  ws.mergeCells(`A${rad}:N${rad}`);
  const c = ws.getCell(`A${rad}`);
  c.value = tittel;
  c.fill = fyll;
  c.font = { bold: true, size: 9, color: { argb: farge } };
}

function sumRad(ws, rad, tittel, fraRad, tilRad) {
  ws.getCell(`A${rad}`).value = tittel;
  for (let i = 0; i < 12; i++) {
    const c = ws.getCell(`${kol(i)}${rad}`);
    c.value = { formula: `SUM(${kol(i)}${fraRad}:${kol(i)}${tilRad})` };
    c.numFmt = VALUTA;
  }
  ws.getCell(`N${rad}`).value = { formula: `SUM(B${rad}:M${rad})` };
  ws.getCell(`N${rad}`).numFmt = VALUTA;
  for (let c = 1; c <= 14; c++) {
    const cell = ws.getRow(rad).getCell(c);
    cell.fill = SUM_FYLL;
    cell.font = { bold: true, size: 10 };
    if (c > 1) cell.alignment = { horizontal: 'right' };
  }
}

function resultatRad(ws, rad, sumInnRad, sumKostRad) {
  ws.getCell(`A${rad}`).value = 'RESULTAT';
  for (let i = 0; i < 12; i++) {
    const c = ws.getCell(`${kol(i)}${rad}`);
    c.value = { formula: `${kol(i)}${sumInnRad}-${kol(i)}${sumKostRad}` };
    c.numFmt = AVVIK;
  }
  ws.getCell(`N${rad}`).value = { formula: `SUM(B${rad}:M${rad})` };
  ws.getCell(`N${rad}`).numFmt = AVVIK;
  for (let c = 1; c <= 14; c++) {
    const cell = ws.getRow(rad).getCell(c);
    cell.font = { bold: true, size: 10.5 };
    cell.border = { top: { style: 'double', color: { argb: 'FF0C0C0C' } } };
    if (c > 1) cell.alignment = { horizontal: 'right' };
  }
}

// Databarer på Sum-kolonnen — gir umiddelbar visuell vekting av kategoriene.
function dataBarer(ws, fraRad, tilRad, farge) {
  if (tilRad < fraRad) return;
  ws.addConditionalFormatting({
    ref: `N${fraRad}:N${tilRad}`,
    rules: [{
      type: 'dataBar', priority: 1, gradient: false,
      minLength: 0, maxLength: 100,
      cfvo: [{ type: 'min' }, { type: 'max' }],
      color: { argb: farge },
    }],
  });
}

// Betinget formatering for avviksrader: grønt = bedre enn plan, rødt = dårligere.
// `inverter` for kostnader (over budsjett = dårlig).
function avvikFormat(ws, rad, inverter = false) {
  const bra = { font: { bold: true, color: { argb: 'FF1F7A45' } }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE7F4EC' } } };
  const daarlig = { font: { bold: true, color: { argb: 'FF9F1239' } }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFDE8EC' } } };
  ws.addConditionalFormatting({
    ref: `B${rad}:N${rad}`,
    rules: [
      { type: 'cellIs', operator: 'greaterThan', formulae: [0], style: inverter ? daarlig : bra, priority: 1 },
      { type: 'cellIs', operator: 'lessThan', formulae: [0], style: inverter ? bra : daarlig, priority: 2 },
    ],
  });
}

// KPI-blokk øverst til høyre på budsjettarket — levende formler mot Sum-kolonnen.
function kpiBlokk(ws, sumInnRad, sumKostRad, resRad) {
  const blokker = [
    { fra: 'F', til: 'H', label: 'INNTEKTER / ÅR', formel: `N${sumInnRad}`, farge: 'FF1F7A45', fyll: 'FFF4F9F5' },
    { fra: 'I', til: 'K', label: 'KOSTNADER / ÅR', formel: `N${sumKostRad}`, farge: 'FF9A6B1C', fyll: 'FFFDF6EC' },
    { fra: 'L', til: 'N', label: 'RESULTAT / ÅR', formel: `N${resRad}`, farge: 'FF3757C4', fyll: 'FFEDF2FD' },
  ];
  for (const b of blokker) {
    ws.mergeCells(`${b.fra}1:${b.til}1`);
    ws.mergeCells(`${b.fra}2:${b.til}2`);
    const l = ws.getCell(`${b.fra}1`);
    l.value = b.label;
    l.font = { bold: true, size: 8, color: { argb: b.farge } };
    l.alignment = { horizontal: 'center', vertical: 'bottom' };
    l.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: b.fyll } };
    const v = ws.getCell(`${b.fra}2`);
    v.value = { formula: b.formel };
    v.numFmt = AVVIK;
    v.font = { bold: true, size: 12, color: { argb: 'FF0C0C0C' } };
    v.alignment = { horizontal: 'center', vertical: 'top' };
    v.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: b.fyll } };
  }
}

export async function lagBudsjettExcel({ budsjett, faktisk, year }) {
  const wb = nyArbeidsbok();
  const naaKol = new Date().getFullYear() === year ? new Date().getMonth() : -1;

  const egneInn = (budsjett.egnePoster || []).filter((p) => p.type === 'inn');
  const egneKost = (budsjett.egnePoster || []).filter((p) => p.type === 'kost');

  /* ═══ ARK 1: Budsjett ═══ */
  const ws = nyttArk(wb, `Budsjett ${year}`, 'FF1F7A45');
  tittelRader(ws, `DigiHome — Budsjett ${year}`,
    `Generert ${new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })} · alle tall i kr eks. mva · summer, resultat og KPI-er er levende formler`);

  hodeRad(ws, 4, MND, naaKol);
  for (let i = 0; i < 12; i++) {
    const t = budsjett.kommentarer?.[String(i)];
    if (t) ws.getCell(`${kol(i)}4`).note = { texts: [{ text: t }], margins: { insetmode: 'auto' } };
  }
  let rad = 5;

  seksjonsRad(ws, rad, 'INNTEKTER', INN_FYLL, 'FF1F7A45'); rad++;
  const innFra = rad;
  let stripe = false;
  for (const k of INNTEKT_KATEGORIER) { dataRad(ws, rad, k, budsjett.inntekter[k] || Array(12).fill(0), { stripe, naaKol }); stripe = !stripe; rad++; }
  for (const p of egneInn) { dataRad(ws, rad, p.navn, p.verdier, { suffix: `egen post (${FREKVENS_LABEL[p.frekvens] || ''})`, stripe, naaKol }); stripe = !stripe; rad++; }
  const innTil = rad - 1;
  const sumInnRad = rad;
  sumRad(ws, rad, 'Sum inntekter', innFra, innTil); rad++;

  seksjonsRad(ws, rad, 'KOSTNADER', KOST_FYLL, 'FF9A6B1C'); rad++;
  const kostFra = rad;
  stripe = false;
  for (const k of KOSTNAD_KATEGORIER) { dataRad(ws, rad, k, budsjett.kostnader[k] || Array(12).fill(0), { stripe, naaKol }); stripe = !stripe; rad++; }
  for (const p of egneKost) { dataRad(ws, rad, p.navn, p.verdier, { suffix: `egen post (${FREKVENS_LABEL[p.frekvens] || ''})${p.mapTil ? ` → ${p.mapTil}` : ''}`, stripe, naaKol }); stripe = !stripe; rad++; }
  const kostTil = rad - 1;
  const sumKostRad = rad;
  sumRad(ws, rad, 'Sum kostnader', kostFra, kostTil); rad++;

  const resRad = rad;
  resultatRad(ws, rad, sumInnRad, sumKostRad);

  kpiBlokk(ws, sumInnRad, sumKostRad, resRad);
  dataBarer(ws, innFra, innTil, 'FF9CCBAD');
  dataBarer(ws, kostFra, kostTil, 'FFE4C892');

  if (budsjett.notat) {
    rad += 2;
    ws.getCell(`A${rad}`).value = `Notat: ${budsjett.notat}`;
    ws.getCell(`A${rad}`).font = { italic: true, size: 9, color: { argb: 'FF8A8278' } };
  }

  /* ═══ ARK 2: Mot faktisk ═══ */
  const sumSerie = (serier, egne) => {
    const ut = Array(12).fill(0);
    for (const arr of Object.values(serier || {})) for (let m = 0; m < 12; m++) ut[m] += Number(arr?.[m]) || 0;
    for (const p of egne || []) for (let m = 0; m < 12; m++) ut[m] += Number(p.verdier?.[m]) || 0;
    return ut;
  };
  const budInn = sumSerie(budsjett.inntekter, egneInn);
  const budKost = sumSerie(budsjett.kostnader, egneKost);
  const fInn = faktisk?.honorar || Array(12).fill(null);
  const fKost = faktisk?.kostnaderSum || Array(12).fill(null);
  const snap = faktisk?.snapshotMnd || Array(12).fill(false);

  const wa = nyttArk(wb, 'Mot faktisk', 'FFB8860B');
  tittelRader(wa, `DigiHome — Budsjett ${year} mot faktisk`,
    'Faktiske tall fra Økonomi (signerte leiekontrakter + løpende og automatiske kostnader). ✓ i overskriften = fryst månedstall (snapshot). Avvik er levende formler — grønt er bedre enn plan.');
  hodeRad(wa, 4, MND.map((m, i) => (snap[i] ? `${m} ✓` : m)), naaKol);

  const grupper = [
    ['Inntekter', budInn, fInn, false],
    ['Kostnader', budKost, fKost, true],
    ['Resultat', budInn.map((v, i) => v - budKost[i]), fInn.map((v, i) => (v == null ? null : v - (fKost[i] || 0))), false],
  ];
  let r = 5;
  for (const [tittel, bud, fakt, inverter] of grupper) {
    const budRad = r, faktRad = r + 1, avvikRad = r + 2;
    dataRad(wa, budRad, `${tittel} — budsjett`, bud, { naaKol });
    wa.getCell(`A${faktRad}`).value = `${tittel} — faktisk`;
    wa.getCell(`A${faktRad}`).font = { size: 10 };
    fakt.forEach((v, i) => {
      const c = wa.getCell(`${kol(i)}${faktRad}`);
      if (v != null) { c.value = Math.round(v); c.numFmt = tittel === 'Resultat' ? AVVIK : VALUTA; }
    });
    wa.getCell(`N${faktRad}`).value = { formula: `SUM(B${faktRad}:M${faktRad})` };
    wa.getCell(`N${faktRad}`).numFmt = tittel === 'Resultat' ? AVVIK : VALUTA;
    wa.getCell(`N${faktRad}`).font = { bold: true, size: 10 };

    wa.getCell(`A${avvikRad}`).value = `${tittel} — avvik`;
    wa.getCell(`A${avvikRad}`).font = { size: 10, italic: true, color: { argb: 'FF8A8278' } };
    for (let i = 0; i < 12; i++) {
      const c = wa.getCell(`${kol(i)}${avvikRad}`);
      c.value = { formula: `IF(${kol(i)}${faktRad}="","",${kol(i)}${faktRad}-${kol(i)}${budRad})` };
      c.numFmt = AVVIK;
      c.font = { size: 9.5 };
    }
    wa.getCell(`N${avvikRad}`).value = { formula: `IF(N${faktRad}=0,"",N${faktRad}-SUM(B${budRad}:M${budRad}))` };
    wa.getCell(`N${avvikRad}`).numFmt = AVVIK;
    avvikFormat(wa, avvikRad, inverter);
    r += 4;
  }

  /* ═══ ARK 3: Nøkkeltall — ledelsessammendrag ═══ */
  const kjent = (i) => fInn[i] != null;
  let fInnYtd = 0, fKostYtd = 0, bInnYtd = 0, bKostYtd = 0, aarsslutt = 0, kjenteMnd = 0;
  for (let i = 0; i < 12; i++) {
    if (kjent(i)) { kjenteMnd++; fInnYtd += fInn[i]; fKostYtd += fKost[i] || 0; bInnYtd += budInn[i]; bKostYtd += budKost[i]; aarsslutt += fInn[i] - (fKost[i] || 0); }
    else aarsslutt += budInn[i] - budKost[i];
  }

  const wk = wb.addWorksheet('Nøkkeltall', {
    pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1 },
    properties: { tabColor: { argb: 'FF3757C4' } },
  });
  wk.columns = [{ width: 38 }, { width: 20 }, { width: 46 }];
  tittelRader(wk, `DigiHome — Nøkkeltall ${year}`,
    `Ledelsessammendrag · faktisk hittil dekker ${kjenteMnd} av 12 måneder · budsjett-tallene er levende formler mot Budsjett-arket`);

  const arkNavn = `'Budsjett ${year}'`;
  const kpiRader = [
    ['BUDSJETT', null, null, 'seksjon'],
    ['Inntekter (år)', { formula: `${arkNavn}!N${sumInnRad}` }, 'Sum alle inntektslinjer inkl. egne poster', VALUTA],
    ['Kostnader (år)', { formula: `${arkNavn}!N${sumKostRad}` }, 'Sum alle kostnadslinjer inkl. egne poster', VALUTA],
    ['Resultat (år)', { formula: `${arkNavn}!N${resRad}` }, 'Inntekter − kostnader', AVVIK],
    ['Resultatmargin', { formula: `IF(${arkNavn}!N${sumInnRad}=0,0,${arkNavn}!N${resRad}/${arkNavn}!N${sumInnRad}*100)` }, 'Resultat i prosent av inntektene', PROSENT],
    ['FAKTISK HITTIL I ÅR', null, null, 'seksjon'],
    ['Inntekter hittil', Math.round(fInnYtd), `Budsjett samme periode: ${Math.round(bInnYtd).toLocaleString('nb-NO')} kr`, VALUTA],
    ['Kostnader hittil', Math.round(fKostYtd), `Budsjett samme periode: ${Math.round(bKostYtd).toLocaleString('nb-NO')} kr`, VALUTA],
    ['Resultat hittil', Math.round(fInnYtd - fKostYtd), `Avvik mot plan: ${Math.round((fInnYtd - fKostYtd) - (bInnYtd - bKostYtd)).toLocaleString('nb-NO')} kr`, AVVIK],
    ['PROGNOSE', null, null, 'seksjon'],
    ['Forventet årsslutt (resultat)', Math.round(aarsslutt), 'Faktisk hittil + budsjett for resten av året', AVVIK],
    ['Avvik mot årsbudsjett', { formula: `B${14}-${arkNavn}!N${resRad}` }, 'Forventet årsslutt − budsjettert resultat', AVVIK],
  ];
  let kr = 4;
  for (const [label, verdi, forklaring, fmt] of kpiRader) {
    if (fmt === 'seksjon') {
      wk.mergeCells(`A${kr}:C${kr}`);
      const c = wk.getCell(`A${kr}`);
      c.value = label;
      c.font = { bold: true, size: 9, color: { argb: 'FF8A8278' } };
      c.fill = SUM_FYLL;
      kr++;
      continue;
    }
    wk.getCell(`A${kr}`).value = label;
    wk.getCell(`A${kr}`).font = { size: 11 };
    const v = wk.getCell(`B${kr}`);
    v.value = verdi;
    v.numFmt = fmt;
    v.font = { bold: true, size: 11 };
    v.alignment = { horizontal: 'right' };
    wk.getCell(`C${kr}`).value = forklaring || '';
    wk.getCell(`C${kr}`).font = { size: 9, color: { argb: 'FFA3A3A3' } };
    for (let c = 1; c <= 3; c++) wk.getRow(kr).getCell(c).border = { bottom: KANT };
    kr++;
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ═══ Rullerende 12 mnd — investorvisning over årsgrensen ═══
   Ett ark: vinduet [inneværende måned … +11] på tvers av to årsdokumenter.
   Faste kategorier hentes fra riktig år per kolonne; egne poster aggregeres
   til én linje per seksjon. Sum-/resultatrader er levende formler. */
export async function lagBudsjettExcelRullerende({ budsjettA, budsjettB, fraAar, fraMnd, merknad = '' }) {
  const wb = nyArbeidsbok();
  const vindu = Array.from({ length: 12 }, (_, i) => {
    const t = fraAar * 12 + fraMnd + i;
    return { y: Math.floor(t / 12), m: t % 12 };
  });
  const budFor = (y) => (y === fraAar ? budsjettA : budsjettB);
  const lesFast = (type, kat, i) => {
    const b = budFor(vindu[i].y);
    const serie = (type === 'inn' ? b?.inntekter : b?.kostnader)?.[kat];
    return Number(serie?.[vindu[i].m]) || 0;
  };
  const lesEgne = (type, i) => {
    const b = budFor(vindu[i].y);
    return (b?.egnePoster || []).filter((p) => p.type === type)
      .reduce((s, p) => s + (Number(p.verdier?.[vindu[i].m]) || 0), 0);
  };

  const ws = nyttArk(wb, 'Neste 12 mnd', 'FF6D28D9');
  tittelRader(ws, `DigiHome — Budsjett neste 12 måneder (${MND[fraMnd]} ${String(fraAar).slice(2)} → ${MND[vindu[11].m]} ${String(vindu[11].y).slice(2)})`,
    `Generert ${new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })} · alle tall i kr eks. mva · rullerende vindu over årsgrensen — summer og resultat er levende formler${merknad ? ` · ${merknad}` : ''}`);

  hodeRad(ws, 4, vindu.map((v) => `${MND[v.m]} ${String(v.y).slice(2)}`), 0);

  let rad = 5;
  const skrivSeksjon = (type, tittel, fyll, farge, kategorier) => {
    seksjonsRad(ws, rad, tittel, fyll, farge); rad++;
    const fra = rad;
    let stripe = false;
    for (const k of kategorier) {
      dataRad(ws, rad, k, vindu.map((_, i) => lesFast(type, k, i)), { stripe, naaKol: 0 });
      stripe = !stripe; rad++;
    }
    const egneVindu = vindu.map((_, i) => lesEgne(type, i));
    if (egneVindu.some((x) => x > 0)) {
      dataRad(ws, rad, 'Egne poster', egneVindu, { suffix: 'aggregert', stripe, naaKol: 0 });
      rad++;
    }
    const til = rad - 1;
    const sumR = rad;
    sumRad(ws, rad, `Sum ${tittel.toLowerCase()}`, fra, til); rad++;
    dataBarer(ws, fra, til, type === 'inn' ? 'FF9CCBAD' : 'FFE4C892');
    return sumR;
  };

  const sumInnRad = skrivSeksjon('inn', 'INNTEKTER', INN_FYLL, 'FF1F7A45', INNTEKT_KATEGORIER);
  const sumKostRad = skrivSeksjon('kost', 'KOSTNADER', KOST_FYLL, 'FF9A6B1C', KOSTNAD_KATEGORIER);
  const resRad = rad;
  resultatRad(ws, rad, sumInnRad, sumKostRad);
  kpiBlokk(ws, sumInnRad, sumKostRad, resRad);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
