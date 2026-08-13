// ─────────────────────────────────────────────────────────────────────────────
// INVESTORPAKKE (XLSX) — hele datarommet i én styremøteklar arbeidsbok.
// Ett ark per seksjon investoren har tilgang til: Oversikt, Resultat per måned,
// Enheter i drift, Pipeline, Budsjett neste 12 mnd og Selskap. Levende formler
// (SUM/avvik) slik at mottakeren kan regne videre selv.
// ─────────────────────────────────────────────────────────────────────────────
import ExcelJS from 'exceljs';
import { beregnOversikt, listEnheter, listPnl, hentSelskap } from '@/lib/datarom';
import { hentBudsjett, INNTEKT_KATEGORIER, KOSTNAD_KATEGORIER } from '@/lib/budsjett';

const INK = 'FF1D1730';
const VIOLET = 'FF8B5CF6';
const LILLA_LYS = 'FFF4F1FB';
const GRONN = 'FF2C7A44';
const ROD = 'FFBE123C';
const GRAA = 'FF7D7692';
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

const kr0 = '#,##0 "kr"';

function nyBok() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DigiHome';
  wb.created = new Date();
  return wb;
}

function nyttArk(wb, navn) {
  const ws = wb.addWorksheet(navn, { views: [{ showGridLines: false }], properties: { tabColor: { argb: VIOLET } } });
  return ws;
}

function tittel(ws, tekst, under) {
  ws.getCell('A1').value = tekst;
  ws.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: INK } };
  ws.getCell('A2').value = under;
  ws.getCell('A2').font = { name: 'Calibri', size: 10, color: { argb: GRAA } };
  ws.getRow(1).height = 22;
}

function hode(ws, rad, etiketter) {
  etiketter.forEach((t, i) => {
    const c = ws.getCell(rad, i + 1);
    c.value = t;
    c.font = { size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
    c.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle' };
    c.border = { bottom: { style: 'thin', color: { argb: VIOLET } } };
  });
  ws.getRow(rad).height = 18;
}

function celle(ws, rad, kol, verdi, { fmt = kr0, bold = false, farge = INK, venstre = false, stripe = false } = {}) {
  const c = ws.getCell(rad, kol);
  c.value = verdi;
  c.numFmt = typeof verdi === 'number' || verdi?.formula ? fmt : undefined;
  c.font = { size: 10, bold, color: { argb: farge } };
  c.alignment = { horizontal: venstre ? 'left' : 'right' };
  if (stripe) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF9FE' } };
  return c;
}

/* ── Ark: Oversikt ─────────────────────────────────────────────────────────── */
function arkOversikt(wb, o, navn) {
  const ws = nyttArk(wb, 'Oversikt');
  ws.columns = [{ width: 34 }, { width: 18 }, { width: 4 }, { width: 34 }, { width: 18 }];
  tittel(ws, 'DigiHome — Investorpakke', `Konfidensielt · generert ${new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}${navn ? ` for ${navn}` : ''}`);

  const kpi = (rad, kol, etikett, verdi, fmt = kr0, farge = INK) => {
    const e = ws.getCell(rad, kol); e.value = etikett; e.font = { size: 9, bold: true, color: { argb: GRAA } };
    const v = ws.getCell(rad, kol + 1); v.value = verdi; v.numFmt = typeof verdi === 'number' ? fmt : undefined;
    v.font = { size: 11, bold: true, color: { argb: farge } }; v.alignment = { horizontal: 'right' };
  };

  ws.getCell('A4').value = 'DRIFT'; ws.getCell('A4').font = { size: 10, bold: true, color: { argb: VIOLET } };
  kpi(5, 1, 'Enheter i drift', o.drift.antall, '0');
  kpi(6, 1, '— utleid / ledig', `${o.drift.utleide} / ${o.drift.ledige}`);
  kpi(7, 1, 'Honorar per måned (MRR)', o.drift.honorarMnd);
  kpi(8, 1, 'Run-rate per år (ARR)', o.drift.arr, kr0, VIOLET);
  kpi(9, 1, 'Direkte kostnader per måned', o.drift.kostnaderMnd);
  kpi(10, 1, 'Margin per måned', o.drift.marginMnd, kr0, o.drift.marginMnd >= 0 ? GRONN : ROD);
  kpi(11, 1, 'Snitt honorar per utleid enhet', o.drift.snittHonorar);

  ws.getCell('D4').value = 'PIPELINE'; ws.getCell('D4').font = { size: 10, bold: true, color: { argb: VIOLET } };
  kpi(5, 4, 'Enheter på vei', o.pipeline.antall, '0');
  kpi(6, 4, 'Signert — antall', o.pipeline.signert.antall, '0');
  kpi(7, 4, 'Signert — honorar/mnd', o.pipeline.signert.honorarMnd, kr0, GRONN);
  kpi(8, 4, 'Forventet — antall', o.pipeline.forventet.antall, '0');
  kpi(9, 4, 'Forventet — honorar/mnd', o.pipeline.forventet.honorarMnd);

  ws.getCell('D11').value = 'SELSKAP'; ws.getCell('D11').font = { size: 10, bold: true, color: { argb: VIOLET } };
  kpi(12, 4, 'Ansatte (roller)', o.selskap.antallAnsatte, '0');
  kpi(13, 4, 'Lønnskostnad per måned', o.selskap.ansatteKostnadMnd);
  kpi(14, 4, 'Faste kostnader per måned', o.selskap.fasteKostnaderMnd);
  kpi(15, 4, 'Gjeld totalt', o.selskap.gjeldTotal);
  kpi(16, 4, 'Aksjonærlån totalt', o.selskap.laanTotal);
}

/* ── Ark: Resultat per måned ───────────────────────────────────────────────── */
function arkResultat(wb, pnl) {
  const ws = nyttArk(wb, 'Resultat per måned');
  ws.columns = [{ width: 14 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 16 }, { width: 34 }];
  tittel(ws, 'Resultat per måned', 'Fra oppstart til i dag — resultat og akkumulert regnes med levende formler');
  hode(ws, 4, ['Måned', 'Inntekter', 'Kostnader', 'Resultat', 'Akkumulert', 'Notat']);
  ws.views = [{ state: 'frozen', ySplit: 4, showGridLines: false }];

  if (!pnl.length) {
    ws.getCell('A5').value = 'Ingen måneder registrert ennå — legges inn i portalen under Datarom → Resultatregnskap.';
    ws.getCell('A5').font = { size: 10, italic: true, color: { argb: GRAA } };
    return;
  }
  pnl.forEach((r, i) => {
    const rad = 5 + i;
    const [y, m] = r.ym.split('-');
    celle(ws, rad, 1, `${MND_KORT[Number(m) - 1]} ${y}`, { venstre: true, fmt: undefined, stripe: i % 2 === 1 });
    celle(ws, rad, 2, r.inntekter, { stripe: i % 2 === 1 });
    celle(ws, rad, 3, r.kostnader, { stripe: i % 2 === 1 });
    celle(ws, rad, 4, { formula: `B${rad}-C${rad}` }, { bold: true, stripe: i % 2 === 1 });
    celle(ws, rad, 5, { formula: i === 0 ? `D${rad}` : `E${rad - 1}+D${rad}` }, { stripe: i % 2 === 1 });
    celle(ws, rad, 6, r.notat || '', { venstre: true, fmt: undefined, stripe: i % 2 === 1 });
  });
  const sumRad = 5 + pnl.length;
  celle(ws, sumRad, 1, 'SUM', { venstre: true, bold: true, fmt: undefined });
  ['B', 'C', 'D'].forEach((k, i) => celle(ws, sumRad, 2 + i, { formula: `SUM(${k}5:${k}${sumRad - 1})` }, { bold: true, farge: i === 2 ? VIOLET : INK }));
  ws.getRow(sumRad).border = { top: { style: 'double', color: { argb: INK } } };
}

/* ── Ark: Enheter i drift ──────────────────────────────────────────────────── */
function arkEnheter(wb, drift) {
  const ws = nyttArk(wb, 'Enheter i drift');
  ws.columns = [{ width: 40 }, { width: 10 }, { width: 10 }, { width: 13 }, { width: 14 }, { width: 16 }, { width: 13 }, { width: 26 }];
  tittel(ws, 'Enheter i drift', 'Per enhet: brutto leie, DigiHome-honorar, direkte kostnader og margin');
  hode(ws, 4, ['Enhet', 'Type', 'Status', 'Leie/mnd', 'Honorar/mnd', 'Dir. kostn./mnd', 'Margin/mnd', 'Notat']);
  ws.views = [{ state: 'frozen', ySplit: 4, showGridLines: false }];
  ws.autoFilter = { from: 'A4', to: 'H4' };

  drift.forEach((e, i) => {
    const rad = 5 + i; const stripe = i % 2 === 1;
    celle(ws, rad, 1, e.navn, { venstre: true, fmt: undefined, stripe });
    celle(ws, rad, 2, e.type === 'rom' ? 'Rom' : 'Leilighet', { venstre: true, fmt: undefined, stripe });
    celle(ws, rad, 3, e.status === 'utleid' ? 'Utleid' : 'Ledig', { venstre: true, fmt: undefined, stripe, farge: e.status === 'utleid' ? GRONN : GRAA });
    celle(ws, rad, 4, e.leie || 0, { stripe });
    celle(ws, rad, 5, e.honorar || 0, { stripe });
    celle(ws, rad, 6, e.kostnader || 0, { stripe });
    celle(ws, rad, 7, { formula: `E${rad}-F${rad}` }, { bold: true, stripe });
    celle(ws, rad, 8, e.notat || '', { venstre: true, fmt: undefined, stripe });
  });
  const sumRad = 5 + drift.length;
  celle(ws, sumRad, 1, `SUM (${drift.length} enheter)`, { venstre: true, bold: true, fmt: undefined });
  ['D', 'E', 'F', 'G'].forEach((k, i) => celle(ws, sumRad, 4 + i, { formula: `SUM(${k}5:${k}${sumRad - 1})` }, { bold: true, farge: i === 3 ? VIOLET : INK }));
  ws.getRow(sumRad).border = { top: { style: 'double', color: { argb: INK } } };
}

/* ── Ark: Pipeline ─────────────────────────────────────────────────────────── */
function arkPipeline(wb, pipeline) {
  const ws = nyttArk(wb, 'Pipeline');
  ws.columns = [{ width: 40 }, { width: 10 }, { width: 12 }, { width: 15 }, { width: 13 }, { width: 14 }, { width: 26 }];
  tittel(ws, 'Pipeline — enheter på vei inn', 'Signert = kontrakt på plass · Forventet = i dialog/under signering');
  hode(ws, 4, ['Enhet', 'Type', 'Status', 'Forventet start', 'Leie/mnd', 'Honorar/mnd', 'Notat']);
  ws.views = [{ state: 'frozen', ySplit: 4, showGridLines: false }];
  ws.autoFilter = { from: 'A4', to: 'G4' };

  const sortert = [...pipeline].sort((a, b) => (a.status === b.status ? String(a.start).localeCompare(String(b.start)) : a.status === 'signert' ? -1 : 1));
  sortert.forEach((e, i) => {
    const rad = 5 + i; const stripe = i % 2 === 1;
    celle(ws, rad, 1, e.navn, { venstre: true, fmt: undefined, stripe });
    celle(ws, rad, 2, e.type === 'rom' ? 'Rom' : 'Leilighet', { venstre: true, fmt: undefined, stripe });
    celle(ws, rad, 3, e.status === 'signert' ? 'Signert' : 'Forventet', { venstre: true, fmt: undefined, stripe, farge: e.status === 'signert' ? GRONN : GRAA });
    celle(ws, rad, 4, e.start || '', { venstre: true, fmt: undefined, stripe });
    celle(ws, rad, 5, e.leie || 0, { stripe });
    celle(ws, rad, 6, e.honorar || 0, { stripe });
    celle(ws, rad, 7, e.notat || '', { venstre: true, fmt: undefined, stripe });
  });
  const n1 = 5 + sortert.length;
  celle(ws, n1, 1, `SUM (${sortert.length} enheter)`, { venstre: true, bold: true, fmt: undefined });
  ['E', 'F'].forEach((k, i) => celle(ws, n1, 5 + i, { formula: `SUM(${k}5:${k}${n1 - 1})` }, { bold: true }));
  celle(ws, n1 + 1, 1, 'Herav signert — honorar/mnd', { venstre: true, fmt: undefined });
  celle(ws, n1 + 1, 6, { formula: `SUMIF(C5:C${n1 - 1},"Signert",F5:F${n1 - 1})` }, { bold: true, farge: GRONN });
  celle(ws, n1 + 2, 1, 'Herav forventet — honorar/mnd', { venstre: true, fmt: undefined });
  celle(ws, n1 + 2, 6, { formula: `SUMIF(C5:C${n1 - 1},"Forventet",F5:F${n1 - 1})` }, { bold: true, farge: GRAA });
  ws.getRow(n1).border = { top: { style: 'double', color: { argb: INK } } };
}

/* ── Ark: Budsjett neste 12 mnd (rullerende vindu fra budsjettmodulen) ─────── */
async function arkBudsjett(wb, db) {
  const naa = new Date();
  const iAar = naa.getFullYear();
  const vindu = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(iAar, naa.getMonth() + i, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [dNaa, dNeste] = await Promise.all([hentBudsjett(db, iAar), hentBudsjett(db, iAar + 1)]);
  const doc = (y) => (y === iAar ? dNaa : dNeste);
  const les = (type, kat, { y, m }) => Number(doc(y)?.[type]?.[kat]?.[m]) || 0;
  const egneSum = (type, { y, m }) => ((doc(y)?.egnePoster) || []).filter((p) => p.type === (type === 'inntekter' ? 'inn' : 'kost')).reduce((a, p) => a + (Number(p.verdier?.[m]) || 0), 0);

  const ws = nyttArk(wb, 'Budsjett 12 mnd');
  ws.columns = [{ width: 26 }, ...Array(12).fill({ width: 11 }), { width: 13 }];
  tittel(ws, 'Budsjett — neste 12 måneder', `Rullerende vindu ${MND_KORT[vindu[0].m]} ${vindu[0].y} → ${MND_KORT[vindu[11].m]} ${vindu[11].y} (fra budsjettmodulen)`);
  hode(ws, 4, ['Kategori', ...vindu.map((v) => `${MND_KORT[v.m]} ${String(v.y).slice(2)}`), 'Sum']);
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 4, showGridLines: false }];

  let rad = 5;
  const dataRad = (navn, verdier, { bold = false, farge = INK } = {}) => {
    celle(ws, rad, 1, navn, { venstre: true, bold, fmt: undefined, farge });
    verdier.forEach((v, i) => celle(ws, rad, 2 + i, v, { bold, farge }));
    celle(ws, rad, 14, { formula: `SUM(B${rad}:M${rad})` }, { bold: true, farge });
    rad += 1;
  };
  const blokk = (tittelTekst, type, kategorier) => {
    celle(ws, rad, 1, tittelTekst, { venstre: true, bold: true, fmt: undefined, farge: VIOLET });
    rad += 1;
    const fra = rad;
    kategorier.forEach((kat) => dataRad(kat, vindu.map((v) => les(type, kat, v))));
    const egne = vindu.map((v) => egneSum(type, v));
    if (egne.some((v) => v > 0)) dataRad('Egne poster', egne);
    const til = rad - 1;
    celle(ws, rad, 1, `Sum ${tittelTekst.toLowerCase()}`, { venstre: true, bold: true, fmt: undefined });
    for (let k = 0; k < 13; k += 1) {
      const kol = String.fromCharCode(66 + k); // B..N
      celle(ws, rad, 2 + k, { formula: `SUM(${kol}${fra}:${kol}${til})` }, { bold: true });
    }
    const sumRad = rad;
    rad += 2;
    return sumRad;
  };
  const innRad = blokk('Inntekter', 'inntekter', INNTEKT_KATEGORIER);
  const kostRad = blokk('Kostnader', 'kostnader', KOSTNAD_KATEGORIER);
  celle(ws, rad, 1, 'RESULTAT', { venstre: true, bold: true, fmt: undefined, farge: VIOLET });
  for (let k = 0; k < 13; k += 1) {
    const kol = String.fromCharCode(66 + k);
    celle(ws, rad, 2 + k, { formula: `${kol}${innRad}-${kol}${kostRad}` }, { bold: true, farge: VIOLET });
  }
  ws.getRow(rad).border = { top: { style: 'double', color: { argb: INK } } };
}

/* ── Ark: Selskap ──────────────────────────────────────────────────────────── */
function arkSelskap(wb, selskap) {
  const ws = nyttArk(wb, 'Selskap');
  ws.columns = [{ width: 36 }, { width: 14 }, { width: 14 }, { width: 30 }];
  tittel(ws, 'Selskap', 'Ansatte, faste kostnader, gjeld og aksjonærlån — vedlikeholdt av DigiHome');
  let rad = 4;
  const blokk = (navn, rader, kolonner) => {
    celle(ws, rad, 1, navn.toUpperCase(), { venstre: true, bold: true, fmt: undefined, farge: VIOLET }); rad += 1;
    hode(ws, rad, kolonner.map((k) => k.l)); rad += 1;
    if (!rader.length) { celle(ws, rad, 1, 'Ingen registrert', { venstre: true, fmt: undefined, farge: GRAA }); rad += 2; return; }
    const fra = rad;
    rader.forEach((r, i) => {
      kolonner.forEach((k, ki) => celle(ws, rad, ki + 1, r[k.f] ?? '', { venstre: ki === 0, fmt: k.fmt, stripe: i % 2 === 1 }));
      rad += 1;
    });
    const belopKol = kolonner.findIndex((k) => k.sum);
    if (belopKol >= 0) {
      celle(ws, rad, 1, 'Sum', { venstre: true, bold: true, fmt: undefined });
      const kol = String.fromCharCode(65 + belopKol);
      celle(ws, rad, belopKol + 1, { formula: `SUM(${kol}${fra}:${kol}${rad - 1})` }, { bold: true });
      rad += 1;
    }
    rad += 1;
  };
  blokk('Ansatte', selskap.ansatte || [], [{ l: 'Rolle', f: 'rolle' }, { l: 'Stilling %', f: 'prosent', fmt: '0"%"' }, { l: 'Kostnad/mnd', f: 'kostnad', fmt: kr0, sum: true }]);
  blokk('Faste kostnader', selskap.faste || [], [{ l: 'Post', f: 'navn' }, { l: 'Beløp/mnd', f: 'belop', fmt: kr0, sum: true }]);
  blokk('Gjeld', selskap.gjeld || [], [{ l: 'Långiver', f: 'navn' }, { l: 'Beløp', f: 'belop', fmt: kr0, sum: true }, { l: 'Rente %', f: 'rente', fmt: '0.0"%"' }]);
  blokk('Aksjonærlån', selskap.laan || [], [{ l: 'Aksjonær', f: 'navn' }, { l: 'Beløp', f: 'belop', fmt: kr0, sum: true }, { l: 'Rente %', f: 'rente', fmt: '0.0"%"' }]);
  if (selskap.notat) {
    celle(ws, rad, 1, 'NOTAT', { venstre: true, bold: true, fmt: undefined, farge: VIOLET }); rad += 1;
    const c = ws.getCell(rad, 1); c.value = selskap.notat; c.font = { size: 10, color: { argb: INK } }; c.alignment = { wrapText: true, vertical: 'top' };
    ws.mergeCells(rad, 1, rad + 3, 4);
  }
}

/* ── Hovedinngang: bygg pakken (kun seksjoner brukeren har tilgang til) ────── */
export async function byggInvestorpakke(db, { navn = '', tilgang = null } = {}) {
  const har = (k) => !tilgang || tilgang.includes(k);
  const wb = nyBok();
  const [oversikt, { drift, pipeline }, pnl, selskap] = await Promise.all([
    beregnOversikt(db), listEnheter(db), listPnl(db), hentSelskap(db),
  ]);
  if (har('dr-oversikt')) arkOversikt(wb, oversikt, navn);
  if (har('dr-resultat')) arkResultat(wb, pnl);
  if (har('dr-enheter')) arkEnheter(wb, drift);
  if (har('dr-pipeline')) arkPipeline(wb, pipeline);
  if (har('budsjett')) await arkBudsjett(wb, db);
  if (har('dr-selskap')) arkSelskap(wb, selskap);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
