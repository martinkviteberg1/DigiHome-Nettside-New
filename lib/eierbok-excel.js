// ---------------------------------------------------------------------------
// Excel-eksport for AKSJEEIERBOKEN — formell, revisjonsvennlig arbeidsbok:
//   · «Aksjeeierbok»  : cap table per dato — aksjonærer, antall, eierandel
//                       (levende formler), stemmer, aksjeklasser og aksje-
//                       nummerintervaller + kontrollsummer
//   · «Transaksjoner» : komplett historikk kronologisk — én rad per post/
//                       intervall med kurs/vederlag og notater
//   · «Aksjeklasser»  : klasseoversikt med stemmerett og fordeling
// Samme visuelle språk som budsjett-eksporten (mørke hoder, striper, frosne
// ruter, valuta-/prosentformat, liggende A4 for transaksjonsarket).
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs';

const VALUTA = '#,##0.00" kr"';
const VALUTA0 = '#,##0" kr"';
const HELTALL = '#,##0';
const PROSENT = '0.00%';
const HODE_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C0C0C' } };
const SUM_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F0EA' } };
const STRIPE_FYLL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBFAF8' } };
const SEKSJON_FARGE = 'FF6D28D9';
const KANT = { style: 'thin', color: { argb: 'FFEDEAE4' } };

const TYPE_NAVN = {
  stiftelse: 'Stiftelse', emisjon: 'Emisjon', overdragelse: 'Overdragelse',
  splitt: 'Aksjesplitt', spleis: 'Aksjespleis', sletting: 'Sletting',
};

const fmtDatoNo = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y) return String(iso);
  return `${d}.${String(m).padStart(2, '0')}.${y}`;
};
const intervallTekst = (ivs) => (ivs || [])
  .map((iv) => (iv.fra === iv.til ? `${iv.fra}` : `${iv.fra}–${iv.til}`))
  .join(', ');

function hodeRad(ws, r, titler, { hoyreFra = 1 } = {}) {
  titler.forEach((t, i) => {
    const c = ws.getRow(r).getCell(i + 1);
    c.value = t;
    c.fill = HODE_FYLL;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 };
    c.alignment = { horizontal: i + 1 > hoyreFra ? 'right' : 'left', wrapText: true };
  });
}

function tittel(ws, t, sub) {
  ws.getCell('A1').value = t;
  ws.getCell('A1').font = { bold: true, size: 15 };
  ws.getCell('A2').value = sub;
  ws.getCell('A2').font = { size: 9, color: { argb: 'FF8A8278' } };
}

export async function lagEierbokExcel({ eierbok }) {
  const { selskap, klasser, eiere, transaksjoner, capTable } = eierbok;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DigiHome Admin';
  wb.created = new Date();

  const generert = new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
  const perDato = capTable?.perDato ? ` · per ${fmtDatoNo(capTable.perDato)}` : '';
  const eierAv = Object.fromEntries((eiere || []).map((e) => [e.id, e]));
  const klasseAv = Object.fromEntries((klasser || []).map((k) => [k.id, k]));

  /* ═══ Ark 1: Aksjeeierbok (cap table) ═══ */
  const cap = wb.addWorksheet('Aksjeeierbok', {
    views: [{ state: 'frozen', ySplit: 9 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 },
    properties: { tabColor: { argb: 'FF6D28D9' } },
  });
  cap.columns = [
    { width: 32 }, { width: 11 }, { width: 14 }, { width: 13 }, { width: 11 },
    { width: 13 }, { width: 12 }, { width: 24 }, { width: 34 },
  ];
  tittel(cap, `Aksjeeierbok — ${selskap.navn}`, `Org.nr ${selskap.orgnr || '—'}${perDato} · generert ${generert} · ført i DigiHome-portalen`);

  // Selskapsblokk
  let r = 4;
  const info = [
    ['Antall aksjer', capTable ? capTable.totalAksjer : null, HELTALL],
    ['Pålydende per aksje', capTable ? capTable.palydende : selskap.palydende || null, VALUTA],
    ['Aksjekapital', capTable ? capTable.aksjekapital : null, VALUTA0],
    ['Antall stemmer', capTable ? capTable.totalStemmer : null, HELTALL],
  ];
  info.forEach(([l, v, fmt], i) => {
    const c0 = cap.getRow(4).getCell(1 + i * 2);
    const c1 = cap.getRow(4).getCell(2 + i * 2);
    c0.value = l; c0.font = { size: 8.5, color: { argb: 'FF8A8278' } };
    c1.value = v; c1.numFmt = fmt; c1.font = { bold: true, size: 10 };
    c1.alignment = { horizontal: 'left' };
  });

  if (!capTable) {
    cap.getCell('A6').value = 'Eierboken har en valideringsfeil og kan ikke summeres — se transaksjonsarket.';
    cap.getCell('A6').font = { color: { argb: 'FFC2413B' }, bold: true };
  } else {
    r = 6;
    cap.mergeCells(`A${r}:I${r}`);
    cap.getCell(`A${r}`).value = 'AKSJONÆRER';
    cap.getCell(`A${r}`).font = { bold: true, size: 8.5, color: { argb: SEKSJON_FARGE } };
    cap.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F2FD' } };
    r += 2;

    const hodeR = r;
    hodeRad(cap, r, ['Aksjonær', 'Type', 'Org.nr', 'Antall aksjer', 'Eierandel', 'Stemmer', 'Stemmeandel', 'Aksjeklasser', 'Aksjenummer'], { hoyreFra: 3 });
    r += 1;
    const forsteData = r;
    if (!(capTable.rader || []).length) {
      cap.getCell(`A${r}`).value = 'Ingen aksjer er utstedt ennå — registrer stiftelsen i portalen.';
      cap.getCell(`A${r}`).font = { italic: true, size: 9.5, color: { argb: 'FF8A8278' } };
      r += 1;
    }
    (capTable.rader || []).forEach((rad, i) => {
      const row = cap.getRow(r);
      row.getCell(1).value = rad.navn;
      row.getCell(1).font = { bold: true, size: 10 };
      row.getCell(2).value = rad.type === 'selskap' ? 'Selskap' : 'Person';
      row.getCell(3).value = rad.orgnr || '';
      row.getCell(4).value = rad.antall; row.getCell(4).numFmt = HELTALL;
      // Eierandel og stemmeandel som LEVENDE formler mot kontrollsummene
      row.getCell(5).value = { formula: `D${r}/$D$${forsteData + (capTable.rader || []).length}` };
      row.getCell(5).numFmt = PROSENT;
      row.getCell(6).value = rad.stemmer; row.getCell(6).numFmt = HELTALL;
      row.getCell(7).value = { formula: `F${r}/$F$${forsteData + (capTable.rader || []).length}` };
      row.getCell(7).numFmt = PROSENT;
      row.getCell(8).value = Object.entries(rad.klasser || {}).map(([k, a]) => `${k}: ${a}`).join(' · ');
      row.getCell(9).value = intervallTekst(rad.intervaller);
      row.getCell(9).font = { size: 8.5, color: { argb: 'FF8A8278' } };
      for (let cc = 1; cc <= 9; cc++) {
        const cell = row.getCell(cc);
        if (i % 2 === 1) cell.fill = STRIPE_FYLL;
        cell.border = { bottom: KANT };
        if (cc >= 4 && cc <= 7) cell.alignment = { horizontal: 'right' };
      }
      r += 1;
    });
    // Kontrollsum-rad (kun når det finnes aksjonærer)
    if ((capTable.rader || []).length) {
    const sumR = r;
    cap.getCell(`A${sumR}`).value = 'SUM (kontroll)';
    cap.getCell(`D${sumR}`).value = { formula: `SUM(D${forsteData}:D${sumR - 1})` };
    cap.getCell(`D${sumR}`).numFmt = HELTALL;
    cap.getCell(`E${sumR}`).value = { formula: `SUM(E${forsteData}:E${sumR - 1})` };
    cap.getCell(`E${sumR}`).numFmt = PROSENT;
    cap.getCell(`F${sumR}`).value = { formula: `SUM(F${forsteData}:F${sumR - 1})` };
    cap.getCell(`F${sumR}`).numFmt = HELTALL;
    cap.getCell(`G${sumR}`).value = { formula: `SUM(G${forsteData}:G${sumR - 1})` };
    cap.getCell(`G${sumR}`).numFmt = PROSENT;
    // Avviksvarsel: sum aksjer skal stemme med registrert total
    cap.getCell(`H${sumR}`).value = { formula: `IF(D${sumR}=${capTable.totalAksjer},"Avstemt mot ${capTable.totalAksjer} aksjer","AVVIK — kontroller transaksjonene")` };
    cap.getCell(`H${sumR}`).font = { size: 8.5, italic: true, color: { argb: 'FF15803D' } };
    for (let cc = 1; cc <= 9; cc++) {
      const cell = cap.getRow(sumR).getCell(cc);
      cell.fill = SUM_FYLL;
      if (!cell.font || !cell.font.color) cell.font = { bold: true, size: 10 };
      if (cc >= 4 && cc <= 7) cell.alignment = { horizontal: 'right' };
    }
    r = sumR + 2;
    cap.getCell(`A${r}`).value = 'Eier- og stemmeandeler er levende formler mot kontrollsummene. Aksjeeierboken føres etter aksjeloven § 4-5 med aksjenummerintervaller per aksjonær.';
    cap.getCell(`A${r}`).font = { size: 8, italic: true, color: { argb: 'FF8A8278' } };
    }
  }
  cap.headerFooter = { oddFooter: `&L&8DigiHome · Aksjeeierbok ${selskap.navn}&R&8Side &P av &N · Konfidensielt` };

  /* ═══ Ark 2: Transaksjoner ═══ */
  const tr = wb.addWorksheet('Transaksjoner', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 },
    properties: { tabColor: { argb: 'FF0C0C0C' } },
  });
  tr.columns = [
    { width: 12 }, { width: 14 }, { width: 30 }, { width: 30 }, { width: 12 },
    { width: 15 }, { width: 15 }, { width: 14 }, { width: 34 },
  ];
  tittel(tr, 'Transaksjonshistorikk', `${selskap.navn} · ${(transaksjoner || []).length} transaksjoner · kronologisk`);
  hodeRad(tr, 4, ['Dato', 'Type', 'Fra / tegnet av', 'Til / mottaker', 'Antall', 'Aksjenummer', 'Kurs/vederlag', 'Beløp', 'Notat'], { hoyreFra: 4 });

  let tRad = 5;
  let stripeT = false;
  const navnAv = (id) => eierAv[id]?.navn || 'Ukjent';
  for (const t of (transaksjoner || [])) {
    const start = tRad;
    if (t.type === 'stiftelse' || t.type === 'emisjon') {
      for (const p of (t.poster || [])) {
        const row = tr.getRow(tRad);
        row.getCell(3).value = '—';
        row.getCell(4).value = `${navnAv(p.eierId)}${p.klasseId && klasseAv[p.klasseId] && klasseAv[p.klasseId].navn !== 'Ordinære' ? ` (${klasseAv[p.klasseId].navn})` : ''}`;
        row.getCell(5).value = p.antall; row.getCell(5).numFmt = HELTALL;
        row.getCell(6).value = `${p.fraNr}–${p.tilNr}`;
        if (p.kurs !== null && p.kurs !== undefined) {
          row.getCell(7).value = p.kurs; row.getCell(7).numFmt = VALUTA;
          row.getCell(8).value = { formula: `E${tRad}*G${tRad}` }; row.getCell(8).numFmt = VALUTA0;
        }
        tRad += 1;
      }
    } else if (t.type === 'overdragelse') {
      const row = tr.getRow(tRad);
      row.getCell(3).value = navnAv(t.fraEierId);
      row.getCell(4).value = navnAv(t.tilEierId);
      const antall = (t.intervaller || []).reduce((a, iv) => a + (iv.til - iv.fra + 1), 0);
      row.getCell(5).value = antall; row.getCell(5).numFmt = HELTALL;
      row.getCell(6).value = intervallTekst(t.intervaller);
      if (t.vederlag !== null && t.vederlag !== undefined) { row.getCell(8).value = t.vederlag; row.getCell(8).numFmt = VALUTA0; }
      tRad += 1;
    } else if (t.type === 'splitt' || t.type === 'spleis') {
      const row = tr.getRow(tRad);
      row.getCell(3).value = `Faktor 1:${t.faktor}`;
      row.getCell(4).value = t.type === 'splitt' ? 'Alle aksjer splittes' : 'Alle aksjer spleises';
      tRad += 1;
    } else if (t.type === 'sletting') {
      const row = tr.getRow(tRad);
      row.getCell(3).value = '—';
      row.getCell(4).value = 'Aksjene slettes';
      const antall = (t.intervaller || []).reduce((a, iv) => a + (iv.til - iv.fra + 1), 0);
      row.getCell(5).value = antall; row.getCell(5).numFmt = HELTALL;
      row.getCell(6).value = intervallTekst(t.intervaller);
      tRad += 1;
    } else {
      tRad += 1;
    }
    // Felleskolonner på første rad i transaksjonen
    const row0 = tr.getRow(start);
    row0.getCell(1).value = fmtDatoNo(t.dato);
    row0.getCell(1).font = { bold: true, size: 9.5 };
    row0.getCell(2).value = TYPE_NAVN[t.type] || t.type;
    row0.getCell(2).font = { bold: true, size: 9.5, color: { argb: SEKSJON_FARGE } };
    row0.getCell(9).value = [t.notat, t.registrertAv ? `Registrert av ${t.registrertAv}` : null].filter(Boolean).join(' · ');
    row0.getCell(9).font = { size: 8.5, color: { argb: 'FF8A8278' } };
    // Stripe + kanter for alle radene i transaksjonen
    for (let rr2 = start; rr2 < tRad; rr2++) {
      for (let cc = 1; cc <= 9; cc++) {
        const cell = tr.getRow(rr2).getCell(cc);
        if (stripeT) cell.fill = STRIPE_FYLL;
        cell.border = { bottom: rr2 === tRad - 1 ? KANT : undefined };
        if (cc >= 5 && cc <= 8) cell.alignment = { horizontal: 'right' };
      }
    }
    stripeT = !stripeT;
  }
  if (!(transaksjoner || []).length) {
    tr.getCell('A5').value = 'Ingen transaksjoner registrert ennå.';
    tr.getCell('A5').font = { italic: true, color: { argb: 'FF8A8278' } };
  }
  tr.headerFooter = { oddFooter: `&L&8DigiHome · Transaksjoner ${selskap.navn}&R&8Side &P av &N · Konfidensielt` };

  /* ═══ Ark 3: Aksjeklasser ═══ */
  const kl = wb.addWorksheet('Aksjeklasser', {
    pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1 },
    properties: { tabColor: { argb: 'FFB45309' } },
  });
  kl.columns = [{ width: 24 }, { width: 16 }, { width: 16 }, { width: 40 }];
  tittel(kl, 'Aksjeklasser', `${selskap.navn} · generert ${generert}`);
  hodeRad(kl, 4, ['Klasse', 'Stemmer per aksje', 'Aksjer i klassen', 'Merknad'], { hoyreFra: 1 });
  let kRad = 5;
  const antallPerKlasse = {};
  if (capTable) {
    for (const rad of capTable.rader || []) {
      for (const [kNavn, a] of Object.entries(rad.klasser || {})) antallPerKlasse[kNavn] = (antallPerKlasse[kNavn] || 0) + a;
    }
  }
  for (const k of (klasser || [])) {
    const row = kl.getRow(kRad);
    row.getCell(1).value = k.navn; row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(2).value = k.stemmerPerAksje ?? 1; row.getCell(2).numFmt = '#,##0.##'; row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).value = antallPerKlasse[k.navn] || 0; row.getCell(3).numFmt = HELTALL; row.getCell(3).alignment = { horizontal: 'right' };
    row.getCell(4).value = k.beskrivelse || '';
    row.getCell(4).font = { size: 9, color: { argb: 'FF8A8278' } };
    for (let cc = 1; cc <= 4; cc++) kl.getRow(kRad).getCell(cc).border = { bottom: KANT };
    kRad += 1;
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
