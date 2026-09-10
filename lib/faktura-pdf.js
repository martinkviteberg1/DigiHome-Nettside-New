// ---------------------------------------------------------------------------
// PROFORMA-FAKTURA PDF (pdf-lib) — DigiHome Tech AS sin B2B-plattformlisens.
//   · Toppfelt: selger-identitet + PROFORMA/UTKAST-merke
//   · Fra/Til-blokker (selger/kjøper) + metatabell (nr, datoer, periode)
//   · Fakturalinjer (sammendrag eller per enhet)
//   · Totaler (eks mva / mva / å betale)
//   · Enhetsspesifikasjon — hver enhet med adresse, leietaker, periode, beløp
//     (paginerer over flere sider ved behov)
//   · Bunn: betalingsinfo (konto/IBAN), forfall, levering, notat
// Typografi: PP Right Grotesk + ABC Diatype fra /public/fonts, Helvetica-fallback.
// ---------------------------------------------------------------------------

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';

const BLEKK = rgb(0.082, 0.075, 0.063);   // #151310
const HVIT = rgb(1, 1, 1);
const LILLA = rgb(0.478, 0.247, 0.659);   // #7a3fa8
const LILLA_MYK = rgb(0.949, 0.929, 0.976);
const GRAA = rgb(0.42, 0.40, 0.37);
const GRAA_LYS = rgb(0.62, 0.60, 0.57);
const FLATE = rgb(0.969, 0.965, 0.953);
const KANTF = rgb(0.906, 0.894, 0.871);
const KANTF_MYK = rgb(0.945, 0.937, 0.922);

const A4 = [595.28, 841.89];
const MARG = 50;
const KOL = A4[0] - MARG * 2; // innholdsbredde

const kr = (n) => `${Math.round(Number(n) || 0).toLocaleString('nb-NO').replace(/\u00a0/g, ' ')} kr`;
function datoNb(iso) {
  const s = String(iso || '').slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}.${m}.${y}`;
}
function periodeNb(iso) {
  const s = String(iso || '').slice(0, 10);
  const [, m, d] = s.split('-');
  if (!m || !d) return s;
  return `${d}.${m}.`;
}

async function lastFonter(doc) {
  try {
    const fontkit = (await import('@pdf-lib/fontkit')).default;
    doc.registerFontkit(fontkit);
    const rot = path.join(process.cwd(), 'public', 'fonts');
    const les = (p) => fs.readFileSync(path.join(rot, p));
    const heading = await doc.embedFont(les('right-grotesk/PPRightGrotesk-Bold.woff'), { subset: true });
    const body = await doc.embedFont(les('diatype/ABCDiatype-Regular.woff'), { subset: true });
    const medium = await doc.embedFont(les('diatype/ABCDiatype-Medium.woff'), { subset: true });
    return { heading, body, medium, brand: true };
  } catch (e) {
    const heading = await doc.embedFont(StandardFonts.HelveticaBold);
    const body = await doc.embedFont(StandardFonts.Helvetica);
    return { heading, body, medium: heading, brand: false };
  }
}

// Avrundet rektangel (pdf-lib mangler radius på drawRectangle). yTopp = topp i sidekoord.
function boks(page, x, yTopp, w, h, r, opts = {}) {
  const rr = Math.min(r, w / 2, h / 2);
  const d = `M ${rr},0 L ${w - rr},0 Q ${w},0 ${w},${rr} L ${w},${h - rr} Q ${w},${h} ${w - rr},${h} L ${rr},${h} Q 0,${h} 0,${h - rr} L 0,${rr} Q 0,0 ${rr},0 Z`;
  page.drawSvgPath(d, { x, y: yTopp, ...opts });
}
function T(page, t, x, y, { font, size = 9.5, color = BLEKK, tracking = 0 } = {}) {
  const s = String(t ?? '');
  if (tracking > 0) {
    let cx = x;
    for (const ch of s) { page.drawText(ch, { x: cx, y, size, font, color }); cx += font.widthOfTextAtSize(ch, size) + tracking; }
    return;
  }
  page.drawText(s, { x, y, size, font, color });
}
// Høyrejustert
function TR(page, t, xRight, y, opts = {}) {
  const s = String(t ?? '');
  const w = (opts.font).widthOfTextAtSize(s, opts.size || 9.5);
  T(page, s, xRight - w, y, opts);
}
function kutt(font, t, size, maxW) {
  let s = String(t ?? '');
  if (!s) return s;
  if (font.widthOfTextAtSize(s, size) <= maxW) return s;
  while (s.length > 1 && font.widthOfTextAtSize(`${s}…`, size) > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

export async function fakturaPdf(faktura = {}) {
  const doc = await PDFDocument.create();
  const F = await lastFonter(doc);
  const sel = faktura.selger || {};
  const kjo = faktura.kjoper || {};

  let page = doc.addPage(A4);
  const Y = (topp) => A4[1] - topp; // «avstand fra topp» → pdf-koordinat (fra bunn)

  // ── Toppfelt ──────────────────────────────────────────────────────────
  T(page, sel.navn || 'DigiHome Tech AS', MARG, Y(MARG + 20), { font: F.heading, size: 20, color: BLEKK });
  T(page, 'Plattformleverandør · programvarelisens', MARG, Y(MARG + 36), { font: F.body, size: 9, color: GRAA });

  // PROFORMA-merke øverst til høyre
  const merkeW = 128; const merkeX = A4[0] - MARG - merkeW;
  boks(page, merkeX, Y(MARG), merkeW, 44, 8, { color: LILLA_MYK });
  T(page, 'PROFORMA', merkeX + 14, Y(MARG + 20), { font: F.heading, size: 15, color: LILLA });
  T(page, `Utkast · ${faktura.referanse || ''}`, merkeX + 14, Y(MARG + 35), { font: F.body, size: 8.5, color: LILLA });

  let top = MARG + 66;
  page.drawLine({ start: { x: MARG, y: Y(top) }, end: { x: A4[0] - MARG, y: Y(top) }, thickness: 1, color: KANTF });
  top += 24;

  // ── Fra / Til ──────────────────────────────────────────────────────────
  const colW = (KOL - 24) / 2;
  const fraX = MARG; const tilX = MARG + colW + 24;
  T(page, 'FRA', fraX, Y(top), { font: F.medium, size: 8, color: GRAA_LYS, tracking: 1.2 });
  T(page, 'FAKTURERES TIL', tilX, Y(top), { font: F.medium, size: 8, color: GRAA_LYS, tracking: 1.2 });
  let fy = top + 16;
  T(page, sel.navn || '', fraX, Y(fy), { font: F.medium, size: 11, color: BLEKK });
  let ty = top + 16;
  T(page, kjo.navn || '—', tilX, Y(ty), { font: F.medium, size: 11, color: BLEKK });
  fy += 15; ty += 15;

  const selLinjer = [
    sel.orgnr ? `Org.nr ${sel.orgnr}${sel.mvaRegistrert ? ' MVA' : ''}` : '',
    sel.adresse || '',
    [sel.postnr, sel.sted].filter(Boolean).join(' '),
    sel.epost || '',
    sel.telefon || '',
  ].filter(Boolean);
  const kjoLinjer = [
    kjo.orgnr ? `Org.nr ${kjo.orgnr}` : '',
    kjo.epost || '',
  ].filter(Boolean);
  for (const l of selLinjer) { T(page, kutt(F.body, l, 9, colW), fraX, Y(fy), { font: F.body, size: 9, color: GRAA }); fy += 13.5; }
  for (const l of kjoLinjer) { T(page, kutt(F.body, l, 9, colW), tilX, Y(ty), { font: F.body, size: 9, color: GRAA }); ty += 13.5; }

  top = Math.max(fy, ty) + 12;

  // ── Metatabell (nr / datoer / periode / levering) ───────────────────────
  const meta = [
    ['Fakturanr', faktura.fakturanr || 'UTKAST'],
    ['Fakturadato', datoNb(faktura.fakturaDato)],
    ['Forfallsdato', datoNb(faktura.forfallsDato)],
    ['Periode', faktura.periodeLabel || faktura.periode || ''],
  ];
  const mBoksH = 40; const mW = (KOL - 3 * 10) / 4;
  meta.forEach((mm, i) => {
    const x = MARG + i * (mW + 10);
    boks(page, x, Y(top), mW, mBoksH, 8, { color: FLATE });
    T(page, mm[0].toUpperCase(), x + 12, Y(top + 15), { font: F.medium, size: 7.5, color: GRAA_LYS, tracking: 0.8 });
    T(page, kutt(F.medium, mm[1], 10.5, mW - 24), x + 12, Y(top + 30), { font: F.medium, size: 10.5, color: BLEKK });
  });
  top += mBoksH + 26;

  // ── Fakturalinjer ────────────────────────────────────────────────────
  T(page, 'SPESIFIKASJON', MARG, Y(top), { font: F.medium, size: 8, color: GRAA_LYS, tracking: 1.2 });
  top += 14;
  // Kolonner: beskrivelse | antall | pris | beløp
  const cAntR = A4[0] - MARG - 200;
  const cPrisR = A4[0] - MARG - 100;
  const cBelR = A4[0] - MARG;
  T(page, 'Beskrivelse', MARG, Y(top), { font: F.medium, size: 8.5, color: GRAA });
  TR(page, 'Antall', cAntR, Y(top), { font: F.medium, size: 8.5, color: GRAA });
  TR(page, 'Pris', cPrisR, Y(top), { font: F.medium, size: 8.5, color: GRAA });
  TR(page, 'Beløp', cBelR, Y(top), { font: F.medium, size: 8.5, color: GRAA });
  top += 8;
  page.drawLine({ start: { x: MARG, y: Y(top) }, end: { x: A4[0] - MARG, y: Y(top) }, thickness: 0.8, color: KANTF });
  top += 16;

  const linjer = faktura.linjer || [];
  if (!linjer.length) {
    T(page, `Ingen enheter i grunnlaget for ${faktura.periodeLabel || faktura.periode}.`, MARG, Y(top), { font: F.body, size: 10, color: GRAA });
    top += 20;
  }
  for (const l of linjer) {
    const antTxt = (l.vekt != null && l.vekt !== l.antall) ? `${l.vekt} (prorata)` : `${l.antall}`;
    T(page, kutt(F.medium, l.beskrivelse || '', 10, cAntR - MARG - 20), MARG, Y(top), { font: F.medium, size: 10, color: BLEKK });
    TR(page, antTxt, cAntR, Y(top), { font: F.body, size: 10, color: GRAA });
    TR(page, kr(l.pris), cPrisR, Y(top), { font: F.body, size: 10, color: GRAA });
    TR(page, kr(l.belop), cBelR, Y(top), { font: F.medium, size: 10, color: BLEKK });
    top += 20;
  }

  top += 4;
  page.drawLine({ start: { x: MARG, y: Y(top) }, end: { x: A4[0] - MARG, y: Y(top) }, thickness: 0.8, color: KANTF });
  top += 18;

  // ── Totaler (høyrejustert blokk) ──────────────────────────────────────
  const totX = A4[0] - MARG - 220;
  const rad = (label, val, { stor = false } = {}) => {
    T(page, label, totX, Y(top), { font: stor ? F.medium : F.body, size: stor ? 12 : 10, color: stor ? BLEKK : GRAA });
    TR(page, val, cBelR, Y(top), { font: stor ? F.heading : F.medium, size: stor ? 15 : 10.5, color: stor ? BLEKK : BLEKK });
    top += stor ? 26 : 18;
  };
  rad('Sum eks. mva', kr(faktura.sumEksMva));
  rad(faktura.mvaRegistrert ? `Mva ${faktura.mvaSats}%` : 'Mva (ikke mva-registrert)', kr(faktura.mva));
  boks(page, totX - 12, Y(top), 220 + 12, 34, 8, { color: BLEKK });
  T(page, 'Å betale', totX, Y(top + 21), { font: F.medium, size: 12, color: HVIT });
  TR(page, kr(faktura.sumInkMva), cBelR - 4, Y(top + 21), { font: F.heading, size: 16, color: HVIT });
  top += 48;

  // ── Enhetsspesifikasjon (paginerer) ──────────────────────────────────
  const spec = faktura.spesifikasjon || [];
  if (spec.length) {
    const ensureRom = (behov) => {
      if (top + behov > A4[1] - MARG - 60) {
        page = doc.addPage(A4);
        top = MARG;
      }
    };
    ensureRom(60);
    T(page, `ENHETSSPESIFIKASJON · ${spec.length} enhet${spec.length === 1 ? '' : 'er'}`, MARG, Y(top), { font: F.medium, size: 8, color: GRAA_LYS, tracking: 1.2 });
    top += 16;
    // Kolonner: Adresse | Leietaker | Periode | Dager | Beløp (+ type ved per_type)
    const xAdr = MARG;
    const xLeie = MARG + 168;
    const xPer = MARG + 300;
    const xDagR = A4[0] - MARG - 84;
    const xBelR = A4[0] - MARG;
    const header = () => {
      T(page, 'Adresse', xAdr, Y(top), { font: F.medium, size: 8, color: GRAA });
      T(page, 'Leietaker', xLeie, Y(top), { font: F.medium, size: 8, color: GRAA });
      T(page, 'Leieperiode', xPer, Y(top), { font: F.medium, size: 8, color: GRAA });
      TR(page, 'Dager', xDagR, Y(top), { font: F.medium, size: 8, color: GRAA });
      TR(page, 'Beløp', xBelR, Y(top), { font: F.medium, size: 8, color: GRAA });
      top += 7;
      page.drawLine({ start: { x: MARG, y: Y(top) }, end: { x: A4[0] - MARG, y: Y(top) }, thickness: 0.7, color: KANTF });
      top += 13;
    };
    header();
    let i = 0;
    for (const e of spec) {
      ensureRom(18);
      if (top === MARG) { header(); } // ny side → gjenta kolonneoverskrift
      if (i % 2 === 1) boks(page, MARG - 4, Y(top - 11), KOL + 8, 16, 3, { color: KANTF_MYK });
      const adr = e.address || e.enhet_id || '—';
      T(page, kutt(F.body, adr, 8.5, xLeie - xAdr - 10), xAdr, Y(top), { font: F.body, size: 8.5, color: BLEKK });
      T(page, kutt(F.body, e.tenant_name || '—', 8.5, xPer - xLeie - 10), xLeie, Y(top), { font: F.body, size: 8.5, color: GRAA });
      const per = (e.move_in_date || e.move_out_date)
        ? `${e.move_in_date ? periodeNb(e.move_in_date) : '—'}–${e.move_out_date ? periodeNb(e.move_out_date) : ''}`
        : '—';
      T(page, kutt(F.body, per, 8.5, xDagR - xPer - 30), xPer, Y(top), { font: F.body, size: 8.5, color: GRAA });
      TR(page, String(e.dager ?? ''), xDagR, Y(top), { font: F.body, size: 8.5, color: GRAA });
      TR(page, kr(e.belop), xBelR, Y(top), { font: F.medium, size: 8.5, color: BLEKK });
      top += 16;
      i += 1;
    }
    top += 8;
  }

  // ── Bunn: betalingsinfo + notat ───────────────────────────────────────
  const bunnH = 76;
  if (top + bunnH > A4[1] - MARG) { page = doc.addPage(A4); top = MARG; }
  boks(page, MARG, Y(top), KOL, bunnH, 10, { color: FLATE });
  const bx = MARG + 16;
  const betLinjer = [];
  if (sel.bankkonto) betLinjer.push(`Bankkonto: ${sel.bankkonto}`);
  if (sel.iban) betLinjer.push(`IBAN: ${sel.iban}`);
  betLinjer.push(`Betalingsfrist: ${faktura.betalingsfristDager} dager (forfall ${datoNb(faktura.forfallsDato)})`);
  betLinjer.push(`Levering: ${faktura.levering === 'EHF' ? 'EHF (elektronisk faktura)' : 'PDF på e-post'}`);
  T(page, 'BETALING', bx, Y(top + 18), { font: F.medium, size: 7.5, color: GRAA_LYS, tracking: 1 });
  let bd = top + 32;
  for (const l of betLinjer.slice(0, 3)) { T(page, kutt(F.body, l, 9, (KOL / 2) - 30), bx, Y(bd), { font: F.body, size: 9, color: GRAA }); bd += 12.5; }
  if (faktura.notat) {
    const nx = MARG + KOL / 2 + 8; let nd = top + 18;
    const ord = String(faktura.notat).split(/\s+/); let linje = ''; const linjer2 = [];
    for (const w of ord) { const test = linje ? `${linje} ${w}` : w; if (F.body.widthOfTextAtSize(test, 8.5) > (KOL / 2) - 30) { linjer2.push(linje); linje = w; } else linje = test; }
    if (linje) linjer2.push(linje);
    for (const l of linjer2.slice(0, 4)) { T(page, l, nx, Y(nd), { font: F.body, size: 8.5, color: GRAA_LYS }); nd += 11.5; }
  }

  // Sidefot på alle sider
  const sider = doc.getPages();
  sider.forEach((p, idx) => {
    T(p, 'Proforma — ikke bokført. Endelig fakturanummer tildeles ved sending via regnskapssystemet.', MARG, MARG - 18, { font: F.body, size: 7.5, color: GRAA_LYS });
    TR(p, `Side ${idx + 1} av ${sider.length}`, A4[0] - MARG, MARG - 18, { font: F.body, size: 7.5, color: GRAA_LYS });
  });

  return Buffer.from(await doc.save());
}
