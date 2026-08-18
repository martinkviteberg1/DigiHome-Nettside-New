// ---------------------------------------------------------------------------
// Excel-eksport for VEKSTBUDSJETT (planer/investormodellen) — investorklar
// arbeidsbok i verdensklasse:
//   · «Sammendrag»     : nøkkeltall-blokk (inntekter, kostnader, resultat,
//                        break-even, kapitalbehov, enheter, CAC-payback)
//   · «Månedsbudsjett» : hele månedsserien — enheter, inntektslinjer,
//                        kostnadslinjer, resultat og akkumulert resultat med
//                        LEVENDE formler, sebrastriping, markert break-even-
//                        måned og bemanningsblokk (behov/budsjettert/utnyttelse)
//   · «Forutsetninger» : alle drivere med forklaring + vekstplanfaser +
//                        bemanningstrapp + scenariooversikt
// Frosne ruter, fargede arkfaner, valutaformat, print-oppsett (liggende A4).
// Enkle planer (type 'enkel') får samme ramme med inntekts-/kostnadsserier.
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs';
import { beregnInvestorModell } from './budsjett-modell';

const VALUTA = '#,##0" kr"';
const RESULTATFMT = '+#,##0" kr";[Red]-#,##0" kr";0" kr"';
const DESIMAL = '#,##0.0';
const PROSENT = '0" %"';
const HODE_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C0C0C' } };
const SUM_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F0EA' } };
const STRIPE_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBFAF8' } };
const BE_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF6EE' } };  // break-even-måned
const SEKSJON_FARGE = 'FF6D28D9';
const KANT = { style: 'thin', color: { argb: 'FFEDEAE4' } };
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

// 1-basert kolonneindeks → Excel-bokstav (støtter > Z for 36-måneders planer)
function bokstav(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function mndEtiketter(startYm, N) {
  const [y0, m0] = String(startYm || '').split('-').map(Number);
  return Array.from({ length: N }, (_, i) => {
    if (!y0 || !m0) return `Mnd ${i + 1}`;
    const m = (m0 - 1 + i) % 12; const y = y0 + Math.floor((m0 - 1 + i) / 12);
    return `${MND_KORT[m]} ${String(y).slice(2)}`;
  });
}

function nyArbeidsbok() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DigiHome Admin';
  wb.created = new Date();
  return wb;
}

/* Generisk måneds-ark: A = post, B.. = N måneder, siste kolonne = Sum/Ved slutt */
function nyttMndArk(wb, navn, N, tabFarge) {
  const ws = wb.addWorksheet(navn, {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 4 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    properties: { tabColor: { argb: tabFarge } },
  });
  ws.columns = [{ width: 30 }, ...Array(N).fill({ width: 10.5 }), { width: 14 }];
  return ws;
}

function tittel(ws, t, sub) {
  ws.getCell('A1').value = t;
  ws.getCell('A1').font = { bold: true, size: 15 };
  ws.getCell('A2').value = sub;
  ws.getCell('A2').font = { size: 9, color: { argb: 'FF8A8278' } };
}

function hode(ws, rad, etiketter, { sumTekst = 'Sum', beIdx = -1 } = {}) {
  const N = etiketter.length;
  ws.getCell(`A${rad}`).value = 'Post';
  etiketter.forEach((l, i) => { ws.getCell(`${bokstav(i + 2)}${rad}`).value = l; });
  ws.getCell(`${bokstav(N + 2)}${rad}`).value = sumTekst;
  for (let c = 1; c <= N + 2; c++) {
    const cell = ws.getRow(rad).getCell(c);
    cell.fill = HODE_FYLL;
    cell.font = { bold: true, color: { argb: c - 2 === beIdx ? 'FFA7E3BC' : 'FFFFFFFF' }, size: 9.5 };
    cell.alignment = { horizontal: c === 1 ? 'left' : 'right' };
  }
  if (beIdx >= 0) {
    const cell = ws.getRow(rad).getCell(beIdx + 2);
    cell.note = 'Break-even — første måned med positivt resultat';
  }
}

function seksjon(ws, rad, tekst, N) {
  ws.mergeCells(`A${rad}:${bokstav(N + 2)}${rad}`);
  const c = ws.getCell(`A${rad}`);
  c.value = tekst.toUpperCase();
  c.font = { bold: true, size: 8.5, color: { argb: SEKSJON_FARGE } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F2FD' } };
}

// Datarad. sum: 'sum' (SUM-formel) | 'siste' (verdien ved slutt) | null.
// verdier kan være tall ELLER {formula: '...'} for levende celler.
function rad(ws, r, navn, verdier, { fmt = VALUTA, sum = 'sum', stripe = false, bold = false, beIdx = -1, fyll = null } = {}) {
  const N = verdier.length;
  ws.getCell(`A${r}`).value = navn;
  ws.getCell(`A${r}`).font = { size: 10, bold };
  verdier.forEach((v, i) => {
    const c = ws.getCell(`${bokstav(i + 2)}${r}`);
    if (v && typeof v === 'object' && v.formula) c.value = v;
    else c.value = v === null || v === undefined ? null : Number(v);
    c.numFmt = fmt;
    if (bold) c.font = { bold: true, size: 10 };
  });
  const sc = ws.getCell(`${bokstav(N + 2)}${r}`);
  if (sum === 'sum') { sc.value = { formula: `SUM(B${r}:${bokstav(N + 1)}${r})` }; sc.numFmt = fmt; }
  else if (sum === 'siste') { sc.value = { formula: `${bokstav(N + 1)}${r}` }; sc.numFmt = fmt; }
  sc.font = { bold: true, size: 10 };
  for (let c = 1; c <= N + 2; c++) {
    const cell = ws.getRow(r).getCell(c);
    if (fyll) cell.fill = fyll;
    else if (c - 2 === beIdx) cell.fill = BE_FYLL;
    else if (stripe) cell.fill = STRIPE_FYLL;
    cell.border = { bottom: KANT };
  }
}

// Sumrad med levende formler over et radspenn
function sumRad(ws, r, navn, fraRad, tilRad, N, { beIdx = -1 } = {}) {
  ws.getCell(`A${r}`).value = navn;
  for (let i = 0; i < N; i++) {
    const c = ws.getCell(`${bokstav(i + 2)}${r}`);
    c.value = { formula: `SUM(${bokstav(i + 2)}${fraRad}:${bokstav(i + 2)}${tilRad})` };
    c.numFmt = VALUTA;
  }
  const sc = ws.getCell(`${bokstav(N + 2)}${r}`);
  sc.value = { formula: `SUM(B${r}:${bokstav(N + 1)}${r})` };
  sc.numFmt = VALUTA;
  for (let c = 1; c <= N + 2; c++) {
    const cell = ws.getRow(r).getCell(c);
    cell.fill = c - 2 === beIdx ? BE_FYLL : SUM_FYLL;
    cell.font = { bold: true, size: 10 };
    if (c > 1) cell.alignment = { horizontal: 'right' };
  }
}

/* Nøkkelverdi-rad på sammendragsarket */
function kv(ws, r, etikett, verdi, { fmt = null, note = null } = {}) {
  ws.getCell(`A${r}`).value = etikett;
  ws.getCell(`A${r}`).font = { size: 10, color: { argb: 'FF57534E' } };
  const c = ws.getCell(`B${r}`);
  c.value = verdi;
  if (fmt) c.numFmt = fmt;
  c.font = { bold: true, size: 11 };
  c.alignment = { horizontal: 'right' };
  if (note) {
    ws.getCell(`C${r}`).value = note;
    ws.getCell(`C${r}`).font = { size: 8.5, color: { argb: 'FF8A8278' } };
  }
  ws.getRow(r).getCell(1).border = { bottom: KANT };
  ws.getRow(r).getCell(2).border = { bottom: KANT };
}

function kvSeksjon(ws, r, tekst) {
  ws.mergeCells(`A${r}:C${r}`);
  const c = ws.getCell(`A${r}`);
  c.value = tekst.toUpperCase();
  c.font = { bold: true, size: 8.5, color: { argb: SEKSJON_FARGE } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F2FD' } };
}

const mndNavn = (startYm, idx) => {
  if (idx === null || idx === undefined) return null;
  const [y0, m0] = String(startYm || '').split('-').map(Number);
  if (!y0 || !m0) return `måned ${idx + 1}`;
  const m = (m0 - 1 + idx) % 12; const y = y0 + Math.floor((m0 - 1 + idx) / 12);
  return `${MND_KORT[m]} ${y}`;
};

export async function lagVekstbudsjettExcel({ plan }) {
  const wb = nyArbeidsbok();
  const N = plan.antallMnd;
  const etiketter = mndEtiketter(plan.startYm, N);
  const periode = `${etiketter[0]} – ${etiketter[N - 1]} · ${N} måneder`;
  const generert = new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

  const erModell = plan.type === 'modell';
  const m = erModell ? beregnInvestorModell({ antallMnd: N, fakta: plan.fakta, drivere: plan.drivere, startYm: plan.startYm }) : null;
  const s = m?.sammendrag;
  const beIdx = s?.breakEvenIdx ?? -1;

  /* ═══ Ark 1: Sammendrag ═══ */
  const ov = wb.addWorksheet('Sammendrag', {
    pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1 },
    properties: { tabColor: { argb: 'FF6D28D9' } },
  });
  ov.columns = [{ width: 34 }, { width: 20 }, { width: 46 }];
  tittel(ov, `DigiHome · ${plan.navn}`, `Vekstbudsjett · ${periode} · generert ${generert}${plan.investorSynlig ? ' · delt i investorrommet' : ''}`);

  let r = 4;
  if (erModell && s) {
    kvSeksjon(ov, r, 'Nøkkeltall for perioden'); r += 1;
    kv(ov, r, 'Sum inntekter', s.sumInntekt, { fmt: VALUTA }); r += 1;
    kv(ov, r, '— herav kontraktsfestet i dag', s.sumEksisterende, { fmt: VALUTA, note: s.andelEksisterendePct !== null ? `${s.andelEksisterendePct} % av inntektene er allerede kontraktsfestet` : null }); r += 1;
    kv(ov, r, '— herav modellert vekst', s.sumModellert, { fmt: VALUTA }); r += 1;
    kv(ov, r, 'Sum kostnader', s.sumKost, { fmt: VALUTA }); r += 1;
    kv(ov, r, 'Resultat for perioden', s.resultat, { fmt: RESULTATFMT }); r += 2;

    kvSeksjon(ov, r, 'Vekst og milepæler'); r += 1;
    kv(ov, r, 'Enheter under forvaltning ved slutt', s.enheterVedSlutt, { fmt: DESIMAL }); r += 1;
    kv(ov, r, 'Nye enheter signert (brutto)', s.sumNyeBrutto, { fmt: DESIMAL }); r += 1;
    kv(ov, r, 'Break-even', beIdx >= 0 ? mndNavn(plan.startYm, beIdx) : 'Ikke i perioden', { note: 'første måned med positivt månedsresultat' }); r += 1;
    kv(ov, r, 'Kapitalbehov (dypeste akkumulerte punkt)', s.kapitalbehov, { fmt: VALUTA, note: s.kapitalbehovIdx !== null ? `bunnen nås ${mndNavn(plan.startYm, s.kapitalbehovIdx)}` : null }); r += 1;
    kv(ov, r, 'Månedlig churn (modellert)', `${String(s.mndChurnPct).replace('.', ',')} %`, { note: `${String(m.drivere.aarligChurnPct).replace('.', ',')} % årlig, kohortbasert` }); r += 2;

    kvSeksjon(ov, r, 'Enhetsøkonomi (per ny enhet)'); r += 1;
    kv(ov, r, 'Honorar per ny enhet (eks. mva)', m.cac.bruttoHonorarNy, { fmt: VALUTA, note: `${String(m.drivere.honorarPctNye).replace('.', ',')} % av ${m.drivere.snittleieNye.toLocaleString('nb-NO')} kr snittleie` }); r += 1;
    kv(ov, r, 'Systemkostnad per enhet', m.drivere.systemPerEnhet, { fmt: VALUTA }); r += 1;
    kv(ov, r, 'Månedlig bidrag per enhet', m.cac.bidrag, { fmt: VALUTA }); r += 1;
    kv(ov, r, 'CAC / provisjon per ny enhet', m.cac.provisjon, { fmt: VALUTA }); r += 1;
    kv(ov, r, 'CAC payback', m.cac.paybackMnd !== null ? `${String(m.cac.paybackMnd).replace('.', ',')} mnd` : '—', { note: 'måneder før bidraget har dekket provisjonen' }); r += 1;
  } else {
    const sumSerie = (obj) => Object.values(obj || {}).reduce((a, arr) => a + arr.reduce((x, y) => x + (Number(y) || 0), 0), 0);
    const inn = sumSerie(plan.inntekter); const kost = sumSerie(plan.kostnader);
    kvSeksjon(ov, r, 'Nøkkeltall for perioden'); r += 1;
    kv(ov, r, 'Sum inntekter', inn, { fmt: VALUTA }); r += 1;
    kv(ov, r, 'Sum kostnader', kost, { fmt: VALUTA }); r += 1;
    kv(ov, r, 'Resultat for perioden', inn - kost, { fmt: RESULTATFMT }); r += 1;
  }
  if (plan.notat) {
    r += 1;
    kvSeksjon(ov, r, 'Notat'); r += 1;
    ov.mergeCells(`A${r}:C${r + 2}`);
    const nc = ov.getCell(`A${r}`);
    nc.value = plan.notat;
    nc.font = { size: 9.5, color: { argb: 'FF57534E' } };
    nc.alignment = { wrapText: true, vertical: 'top' };
  }

  /* ═══ Ark 2: Månedsbudsjett ═══ */
  const md = nyttMndArk(wb, 'Månedsbudsjett', N, 'FF0C0C0C');
  tittel(md, `Månedsbudsjett — ${plan.navn}`, `${periode}${beIdx >= 0 ? ` · break-even ${mndNavn(plan.startYm, beIdx)} (grønn kolonne)` : ''}`);
  hode(md, 4, etiketter, { beIdx });

  let rr = 5;
  if (erModell && m) {
    /* Fast radkart — gjør at Sammendrag/Årsoversikt kan referere levende celler.
       Kostnadslinjene er FORMLER mot driverne i Forutsetninger!B — endrer
       investoren en driver i Excel, oppdateres hele budsjettet. */
    const R = { nye: 6, enh: 7, innFra: 9, eksist: 9, vekst: 10, oppstart: 11, innSum: 12, kostFra: 14, kostSum: 20, res: 22, akk: 23, grad: 24 };
    const F = { oppstart: "Forutsetninger!$B$8", system: "Forutsetninger!$B$12", mf: "Forutsetninger!$B$15", prov: "Forutsetninger!$B$16", admin: "Forutsetninger!$B$17", andre: "Forutsetninger!$B$18" };
    const fSerie = (byggFormel) => Array.from({ length: N }, (_, i) => ({ formula: byggFormel(bokstav(i + 2)) }));

    seksjon(md, rr, 'Portefølje', N); rr += 1;
    rad(md, rr, 'Nye enheter signert per måned', m.nyePerMndSerie, { fmt: DESIMAL, sum: 'sum', beIdx }); rr += 1;
    rad(md, rr, 'Enheter under forvaltning', m.enheter, { fmt: DESIMAL, sum: 'siste', stripe: true, beIdx }); rr += 1;

    seksjon(md, rr, 'Inntekter', N); rr += 1;
    rad(md, rr, 'Kontraktsfestet honorar (dagens portefølje)', m.eksisterende, { beIdx }); rr += 1;
    rad(md, rr, 'Modellert vekst (nye enheter, kohortbasert churn)', m.vekst, { stripe: true, beIdx }); rr += 1;
    rad(md, rr, 'Oppstartshonorar', fSerie((k) => `${k}${R.nye}*${F.oppstart}`), { beIdx }); rr += 1;
    const innSumRad = rr;
    sumRad(md, rr, 'SUM INNTEKTER', R.innFra, rr - 1, N, { beIdx }); rr += 1;

    seksjon(md, rr, 'Kostnader', N); rr += 1;
    rad(md, rr, 'Systemkostnad', fSerie((k) => `${k}${R.enh}*${F.system}`), { beIdx }); rr += 1;
    rad(md, rr, 'Bemanning (budsjettert trapp)', m.kost.bemanning, { stripe: true, beIdx }); rr += 1;
    rad(md, rr, 'Markedsføring (fast)', fSerie(() => F.mf), { beIdx }); rr += 1;
    rad(md, rr, 'Salgsprovisjon / CAC', fSerie((k) => `${k}${R.nye}*${F.prov}`), { stripe: true, beIdx }); rr += 1;
    rad(md, rr, 'Administrasjon', fSerie(() => F.admin), { beIdx }); rr += 1;
    rad(md, rr, 'Andre faste kostnader', fSerie(() => F.andre), { stripe: true, beIdx }); rr += 1;
    const kostSumRad = rr;
    sumRad(md, rr, 'SUM KOSTNADER', R.kostFra, rr - 1, N, { beIdx }); rr += 1;

    seksjon(md, rr, 'Resultat', N); rr += 1;
    const resRad = rr;
    md.getCell(`A${rr}`).value = 'RESULTAT';
    for (let i = 0; i < N; i++) {
      const c = md.getCell(`${bokstav(i + 2)}${rr}`);
      c.value = { formula: `${bokstav(i + 2)}${innSumRad}-${bokstav(i + 2)}${kostSumRad}` };
      c.numFmt = RESULTATFMT;
    }
    md.getCell(`${bokstav(N + 2)}${rr}`).value = { formula: `SUM(B${rr}:${bokstav(N + 1)}${rr})` };
    md.getCell(`${bokstav(N + 2)}${rr}`).numFmt = RESULTATFMT;
    for (let c = 1; c <= N + 2; c++) {
      const cell = md.getRow(rr).getCell(c);
      cell.fill = c - 2 === beIdx ? BE_FYLL : SUM_FYLL;
      cell.font = { bold: true, size: 10 };
    }
    rr += 1;
    md.getCell(`A${rr}`).value = 'Akkumulert resultat';
    for (let i = 0; i < N; i++) {
      const c = md.getCell(`${bokstav(i + 2)}${rr}`);
      c.value = i === 0
        ? { formula: `B${resRad}` }
        : { formula: `${bokstav(i + 1)}${rr}+${bokstav(i + 2)}${resRad}` };
      c.numFmt = RESULTATFMT;
      c.font = { size: 9.5, color: { argb: 'FF57534E' } };
    }
    md.getCell(`${bokstav(N + 2)}${rr}`).value = { formula: `${bokstav(N + 1)}${rr}` };
    md.getCell(`${bokstav(N + 2)}${rr}`).numFmt = RESULTATFMT;
    rr += 1;
    md.getCell(`A${rr}`).value = 'Resultatgrad';
    md.getCell(`A${rr}`).font = { size: 9.5, color: { argb: 'FF8A8278' } };
    for (let i = 0; i < N; i++) {
      const c = md.getCell(`${bokstav(i + 2)}${rr}`);
      c.value = { formula: `IF(${bokstav(i + 2)}${innSumRad}=0,"",${bokstav(i + 2)}${resRad}/${bokstav(i + 2)}${innSumRad})` };
      c.numFmt = '0.0%';
      c.font = { size: 9, color: { argb: 'FF8A8278' } };
    }
    md.getCell(`${bokstav(N + 2)}${rr}`).value = { formula: `IF(${bokstav(N + 2)}${innSumRad}=0,"",${bokstav(N + 2)}${resRad}/${bokstav(N + 2)}${innSumRad})` };
    md.getCell(`${bokstav(N + 2)}${rr}`).numFmt = '0.0%';
    rr += 2;

    seksjon(md, rr, 'Bemanning og kapasitet', N); rr += 1;
    rad(md, rr, 'Kapasitetsbehov (årsverk)', m.behovAarsverk, { fmt: '#,##0.00', sum: 'siste', beIdx }); rr += 1;
    rad(md, rr, 'Budsjettert bemanning (%)', m.budsjettertPct, { fmt: PROSENT, sum: 'siste', stripe: true, beIdx }); rr += 1;
    const utnRad = rr;
    rad(md, rr, 'Utnyttelse (%)', m.utnyttelsePct.map((v) => (v === null ? null : v)), { fmt: PROSENT, sum: 'siste', beIdx }); rr += 2;

    md.getCell(`A${rr}`).value = '→ Kostnadslinjene er levende formler: juster driverne i Forutsetninger-arket (kolonne B), så oppdateres budsjettet, resultatet og årsoversikten automatisk.';
    md.getCell(`A${rr}`).font = { size: 8.5, italic: true, color: { argb: 'FF8A8278' } };

    // Visuell lesehjelp: databar på resultatet + fargeskala på utnyttelsen
    try {
      md.addConditionalFormatting({
        ref: `B${resRad}:${bokstav(N + 1)}${resRad}`,
        rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FF8B5CF6' }, gradient: true }],
      });
      md.addConditionalFormatting({
        ref: `B${utnRad}:${bokstav(N + 1)}${utnRad}`,
        rules: [{ type: 'colorScale', cfvo: [{ type: 'num', value: 40 }, { type: 'num', value: 85 }, { type: 'num', value: 110 }], color: [{ argb: 'FFEAF6EE' }, { argb: 'FFFDF3E7' }, { argb: 'FFF6D5D2' }] }],
      });
    } catch (e) { /* betinget formatering er pynt — aldri la den velte eksporten */ }

    md.headerFooter = { oddFooter: `&L&8DigiHome · ${plan.navn}&R&8Side &P av &N` };

    /* ═══ Ark: Årsoversikt — levende kryssark-formler mot Månedsbudsjett ═══ */
    const [aarY0, aarM0] = String(plan.startYm || '').split('-').map(Number);
    if (aarY0 && aarM0) {
      const aar = wb.addWorksheet('Årsoversikt', {
        pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1 },
        properties: { tabColor: { argb: 'FF15803D' } },
      });
      aar.columns = [{ width: 14 }, { width: 17 }, { width: 17 }, { width: 17 }, { width: 13 }, { width: 15 }, { width: 17 }];
      tittel(aar, 'Årsoversikt', `${plan.navn} · levende summer fra Månedsbudsjett-arket`);
      const hodeA = ['År', 'Inntekter', 'Kostnader', 'Resultat', 'Resultatgrad', 'Nye enheter', 'Enheter ved årsslutt'];
      hodeA.forEach((h, i) => {
        const c = aar.getRow(4).getCell(i + 1);
        c.value = h; c.fill = HODE_FYLL; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 };
        c.alignment = { horizontal: i === 0 ? 'left' : 'right' };
      });
      // Grupper månedsindekser per kalenderår
      const grupper = {};
      for (let i = 0; i < N; i++) {
        const y = aarY0 + Math.floor((aarM0 - 1 + i) / 12);
        (grupper[y] = grupper[y] || []).push(i);
      }
      let ra = 5;
      const MB = "Månedsbudsjett";
      for (const [y, idx] of Object.entries(grupper)) {
        const c0 = bokstav(idx[0] + 2); const c1 = bokstav(idx[idx.length - 1] + 2);
        aar.getCell(`A${ra}`).value = Number(y);
        aar.getCell(`A${ra}`).font = { bold: true, size: 10.5 };
        aar.getCell(`B${ra}`).value = { formula: `SUM('${MB}'!${c0}${R.innSum}:${c1}${R.innSum})` };
        aar.getCell(`C${ra}`).value = { formula: `SUM('${MB}'!${c0}${R.kostSum}:${c1}${R.kostSum})` };
        aar.getCell(`D${ra}`).value = { formula: `B${ra}-C${ra}` };
        aar.getCell(`E${ra}`).value = { formula: `IF(B${ra}=0,"",D${ra}/B${ra})` };
        aar.getCell(`F${ra}`).value = { formula: `SUM('${MB}'!${c0}${R.nye}:${c1}${R.nye})` };
        aar.getCell(`G${ra}`).value = { formula: `'${MB}'!${c1}${R.enh}` };
        aar.getCell(`B${ra}`).numFmt = VALUTA; aar.getCell(`C${ra}`).numFmt = VALUTA;
        aar.getCell(`D${ra}`).numFmt = RESULTATFMT; aar.getCell(`E${ra}`).numFmt = '0.0%';
        aar.getCell(`F${ra}`).numFmt = DESIMAL; aar.getCell(`G${ra}`).numFmt = DESIMAL;
        for (let cc = 1; cc <= 7; cc++) { aar.getRow(ra).getCell(cc).border = { bottom: KANT }; if (ra % 2) aar.getRow(ra).getCell(cc).fill = STRIPE_FYLL; }
        ra += 1;
      }
      // Totalrad
      aar.getCell(`A${ra}`).value = 'SUM';
      for (const [kol, fmt] of [['B', VALUTA], ['C', VALUTA], ['D', RESULTATFMT], ['F', DESIMAL]]) {
        aar.getCell(`${kol}${ra}`).value = { formula: `SUM(${kol}5:${kol}${ra - 1})` };
        aar.getCell(`${kol}${ra}`).numFmt = fmt;
      }
      aar.getCell(`E${ra}`).value = { formula: `IF(B${ra}=0,"",D${ra}/B${ra})` };
      aar.getCell(`E${ra}`).numFmt = '0.0%';
      aar.getCell(`G${ra}`).value = { formula: `G${ra - 1}` };
      aar.getCell(`G${ra}`).numFmt = DESIMAL;
      for (let cc = 1; cc <= 7; cc++) { const cell = aar.getRow(ra).getCell(cc); cell.fill = SUM_FYLL; cell.font = { bold: true, size: 10 }; }
    }
  } else {
    // Enkel plan: kategoriserier
    seksjon(md, rr, 'Inntekter', N); rr += 1;
    const innFra = rr;
    let stripe = false;
    for (const [navn, serie] of Object.entries(plan.inntekter || {})) { rad(md, rr, navn, serie, { stripe }); stripe = !stripe; rr += 1; }
    const innSumRad = rr;
    sumRad(md, rr, 'SUM INNTEKTER', innFra, rr - 1, N); rr += 1;
    seksjon(md, rr, 'Kostnader', N); rr += 1;
    const kostFra = rr;
    stripe = false;
    for (const [navn, serie] of Object.entries(plan.kostnader || {})) { rad(md, rr, navn, serie, { stripe }); stripe = !stripe; rr += 1; }
    const kostSumRad = rr;
    sumRad(md, rr, 'SUM KOSTNADER', kostFra, rr - 1, N); rr += 1;
    md.getCell(`A${rr}`).value = 'RESULTAT';
    for (let i = 0; i < N; i++) {
      const c = md.getCell(`${bokstav(i + 2)}${rr}`);
      c.value = { formula: `${bokstav(i + 2)}${innSumRad}-${bokstav(i + 2)}${kostSumRad}` };
      c.numFmt = RESULTATFMT;
    }
    md.getCell(`${bokstav(N + 2)}${rr}`).value = { formula: `SUM(B${rr}:${bokstav(N + 1)}${rr})` };
    md.getCell(`${bokstav(N + 2)}${rr}`).numFmt = RESULTATFMT;
    for (let c = 1; c <= N + 2; c++) { const cell = md.getRow(rr).getCell(c); cell.fill = SUM_FYLL; cell.font = { bold: true, size: 10 }; }
  }

  /* ═══ Ark 3: Forutsetninger (kun modell) ═══ */
  if (erModell && m) {
    const fo = wb.addWorksheet('Forutsetninger', {
      pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1 },
      properties: { tabColor: { argb: 'FFB45309' } },
    });
    fo.columns = [{ width: 34 }, { width: 18 }, { width: 52 }];
    tittel(fo, 'Forutsetninger og drivere', `${plan.navn} · ${periode}`);
    const d = m.drivere;
    let fr = 4;
    kvSeksjon(fo, fr, 'Inntektsdrivere'); fr += 1;
    kv(fo, fr, 'Nye enheter per måned (grunntakt)', d.nyePerMnd, { fmt: DESIMAL, note: 'fase 1 — se vekstplanen under for opptrapping' }); fr += 1;
    kv(fo, fr, 'Snittleie nye enheter', d.snittleieNye, { fmt: VALUTA }); fr += 1;
    kv(fo, fr, 'Honorarsats nye enheter', `${String(d.honorarPctNye).replace('.', ',')} %`, { note: 'inkl. mva (privatkunder) — modellen regner eks. mva' }); fr += 1;
    kv(fo, fr, 'Oppstartshonorar per enhet', d.oppstartPerEnhet, { fmt: VALUTA }); fr += 1;
    kv(fo, fr, 'Årlig churn', `${String(d.aarligChurnPct).replace('.', ',')} %`, { note: 'kohortbasert på modellerte enheter' }); fr += 2;
    kvSeksjon(fo, fr, 'Kostnadsdrivere'); fr += 1;
    kv(fo, fr, 'Systemkostnad per enhet/mnd', d.systemPerEnhet, { fmt: VALUTA }); fr += 1;
    kv(fo, fr, 'Enheter per årsverk (kapasitet)', d.enheterPerAarsverk, { fmt: '#,##0' }); fr += 1;
    kv(fo, fr, 'Årslønn per årsverk', d.aarslonn, { fmt: VALUTA, note: `+ ${String(d.paslagPct).replace('.', ',')} % arbeidsgiverpåslag` }); fr += 1;
    kv(fo, fr, 'Markedsføring fast/mnd', d.mfFast, { fmt: VALUTA }); fr += 1;
    kv(fo, fr, 'Salgsprovisjon per ny enhet', d.provisjonPerNyEnhet, { fmt: VALUTA }); fr += 1;
    kv(fo, fr, 'Administrasjon fast/mnd', d.adminFast, { fmt: VALUTA }); fr += 1;
    kv(fo, fr, 'Andre faste/mnd', d.andreFaste, { fmt: VALUTA }); fr += 2;
    kvSeksjon(fo, fr, 'Vekstplan (faser)'); fr += 1;
    kv(fo, fr, 'Fra måned 1', `${String(d.nyePerMnd).replace('.', ',')} enh/mnd`); fr += 1;
    for (const f of d.vekstplan) { kv(fo, fr, `Fra ${mndNavn(plan.startYm, f.fraMnd - 1)} (måned ${f.fraMnd})`, `${String(f.perMnd).replace('.', ',')} enh/mnd`); fr += 1; }
    fr += 1;
    kvSeksjon(fo, fr, 'Bemanningstrapp (budsjettert)'); fr += 1;
    for (const t of d.bemanningstrinn) {
      kv(fo, fr, t.type === 'dato' ? `Fra ${t.fraYm}` : `Fra ${t.fraEnheter} enheter`, `${String(t.prosent).replace('.', ',')} % stilling`); fr += 1;
    }
    kv(fo, fr, 'Planlagt maks utnyttelse', `${String(d.maalUtnyttelsePct).replace('.', ',')} %`, { note: 'varsler bemanningsbehov før kapasiteten er sprengt' }); fr += 1;
    if ((plan.scenarioer || []).length) {
      fr += 1;
      kvSeksjon(fo, fr, 'Lagrede scenarioer'); fr += 1;
      for (const sc of plan.scenarioer) { kv(fo, fr, sc.navn, 'driversett lagret på planen'); fr += 1; }
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
