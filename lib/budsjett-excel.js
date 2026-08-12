// ---------------------------------------------------------------------------
// Excel-eksport for Budsjett — styremøteklar arbeidsbok med 2 ark:
//   · «Budsjett {år}»: hele rutenettet (faste kategorier + egne poster) med
//     LEVENDE formler — radsummer =SUM(B:M), seksjonssummer og Resultat-rad
//     er ekte Excel-formler slik at mottakeren kan justere tall selv
//   · «Mot faktisk»: budsjett/faktisk/avvik per måned for inntekter,
//     kostnader og resultat (faktisk fra Økonomi-motoren; fremtid = blank)
// Frys, seksjonfarger, valutaformat og rød-for-negativt. Filnavn:
// digihome-budsjett-{år}.xlsx
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs';
import { INNTEKT_KATEGORIER, KOSTNAD_KATEGORIER } from './budsjett';

const VALUTA = '#,##0" kr"';
const AVVIK = '+#,##0" kr";[Red]-#,##0" kr";0" kr"';
const HODE_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C0C0C' } };
const INN_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F9F5' } };
const KOST_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF6EC' } };
const SUM_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F0EA' } };
const MND = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const FREKVENS_LABEL = { engangs: 'engangs', manedlig: 'månedlig', kvartalsvis: 'kvartalsvis', arlig: 'årlig' };

const kol = (i) => String.fromCharCode(66 + i); // 0 → B … 11 → M

function sumPerMnd(serier, egne) {
  const ut = Array(12).fill(0);
  for (const arr of Object.values(serier || {})) for (let m = 0; m < 12; m++) ut[m] += Number(arr?.[m]) || 0;
  for (const p of egne || []) for (let m = 0; m < 12; m++) ut[m] += Number(p.verdier?.[m]) || 0;
  return ut;
}

function hodeRad(ws, rad) {
  ws.getCell(`A${rad}`).value = 'Kategori';
  MND.forEach((m, i) => { ws.getCell(`${kol(i)}${rad}`).value = m; });
  ws.getCell(`N${rad}`).value = 'Sum';
  for (let c = 1; c <= 14; c++) {
    const cell = ws.getRow(rad).getCell(c);
    cell.fill = HODE_FYLL;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: c === 1 ? 'left' : 'right' };
  }
}

function dataRad(ws, rad, navn, verdier, { suffix = '' } = {}) {
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
}

function seksjonsRad(ws, rad, tittel, fyll, farge) {
  ws.mergeCells(`A${rad}:N${rad}`);
  const c = ws.getCell(`A${rad}`);
  c.value = tittel;
  c.fill = fyll;
  c.font = { bold: true, size: 9, color: { argb: farge } };
}

function sumRad(ws, rad, tittel, fraRad, tilRad, { fet = true } = {}) {
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
    if (fet) cell.font = { bold: true, size: 10 };
    if (c > 1) cell.alignment = { horizontal: 'right' };
  }
}

export async function lagBudsjettExcel({ budsjett, faktisk, year }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DigiHome Admin';
  wb.created = new Date();

  const egneInn = (budsjett.egnePoster || []).filter((p) => p.type === 'inn');
  const egneKost = (budsjett.egnePoster || []).filter((p) => p.type === 'kost');

  /* ═══ ARK 1: Budsjett ═══ */
  const ws = wb.addWorksheet(`Budsjett ${year}`, {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 4 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [{ width: 30 }, ...Array(12).fill({ width: 11 }), { width: 13 }];

  ws.getCell('A1').value = `DigiHome — Budsjett ${year}`;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A2').value = `Generert ${new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })} · alle tall i kr eks. mva · radsummer og resultat er levende formler`;
  ws.getCell('A2').font = { size: 9, color: { argb: 'FF8A8278' } };

  hodeRad(ws, 4);
  let rad = 5;

  seksjonsRad(ws, rad, 'INNTEKTER', INN_FYLL, 'FF1F7A45'); rad++;
  const innFra = rad;
  for (const k of INNTEKT_KATEGORIER) { dataRad(ws, rad, k, budsjett.inntekter[k] || Array(12).fill(0)); rad++; }
  for (const p of egneInn) { dataRad(ws, rad, p.navn, p.verdier, { suffix: `egen post (${FREKVENS_LABEL[p.frekvens] || ''})` }); rad++; }
  const innTil = rad - 1;
  const sumInnRad = rad;
  sumRad(ws, rad, 'Sum inntekter', innFra, innTil); rad++;

  seksjonsRad(ws, rad, 'KOSTNADER', KOST_FYLL, 'FF9A6B1C'); rad++;
  const kostFra = rad;
  for (const k of KOSTNAD_KATEGORIER) { dataRad(ws, rad, k, budsjett.kostnader[k] || Array(12).fill(0)); rad++; }
  for (const p of egneKost) { dataRad(ws, rad, p.navn, p.verdier, { suffix: `egen post (${FREKVENS_LABEL[p.frekvens] || ''})${p.mapTil ? ` → ${p.mapTil}` : ''}` }); rad++; }
  const kostTil = rad - 1;
  const sumKostRad = rad;
  sumRad(ws, rad, 'Sum kostnader', kostFra, kostTil); rad++;

  // Resultat: levende formel Sum inntekter − Sum kostnader
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
  if (budsjett.notat) {
    rad += 2;
    ws.getCell(`A${rad}`).value = `Notat: ${budsjett.notat}`;
    ws.getCell(`A${rad}`).font = { italic: true, size: 9, color: { argb: 'FF8A8278' } };
  }

  /* ═══ ARK 2: Mot faktisk ═══ */
  const budInn = sumPerMnd(budsjett.inntekter, egneInn);
  const budKost = sumPerMnd(budsjett.kostnader, egneKost);
  const fInn = faktisk?.honorar || Array(12).fill(null);
  const fKost = faktisk?.kostnaderSum || Array(12).fill(null);

  const wa = wb.addWorksheet('Mot faktisk', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 4 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  wa.columns = [{ width: 26 }, ...Array(12).fill({ width: 11 }), { width: 13 }];
  wa.getCell('A1').value = `DigiHome — Budsjett ${year} mot faktisk`;
  wa.getCell('A1').font = { bold: true, size: 14 };
  wa.getCell('A2').value = 'Faktiske tall hentes fra Økonomi (signerte leiekontrakter + løpende kostnader). Blanke måneder = ingen faktiske tall ennå. Avvik er levende formler.';
  wa.getCell('A2').font = { size: 9, color: { argb: 'FF8A8278' } };
  hodeRad(wa, 4);

  // [tittel, budsjettserie, faktiskserie, startRad-forskyvning]
  const grupper = [
    ['Inntekter', budInn, fInn],
    ['Kostnader', budKost, fKost],
    ['Resultat', budInn.map((v, i) => v - budKost[i]), fInn.map((v, i) => (v == null ? null : v - (fKost[i] || 0)))],
  ];
  let r = 5;
  for (const [tittel, bud, fakt] of grupper) {
    const budRad = r, faktRad = r + 1, avvikRad = r + 2;
    dataRad(wa, budRad, `${tittel} — budsjett`, bud);
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
    // Luftrad mellom gruppene
    r += 4;
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
