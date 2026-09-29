// ---------------------------------------------------------------------------
// PROFORMA-FAKTURA PDF (pdf-lib) — DigiHome Tech AS sin B2B-plattformlisens.
//
//  Layoutmotor: én løpende «top»-peker og en `plass(h)` som bryter til ny side
//  (med kompakt fortsettelseshode) når det trengs. Ingenting tegnes under
//  bunnmargen — sidefoten har alltid sitt eget felt. Totaler holdes alltid
//  sammen med siste linje. Tabellhoder gjentas på ny side.
//
//  Side 1: selger + PROFORMA-merke · Fra/Til · nøkkelbokser · beregningsgrunnlag
//          · fakturalinjer (sammendrag, eller gruppert per enhet) · totaler
//  Videre: enhetsspesifikasjon (adresse, leietaker, periode, dager, vekt, beløp)
//  Bunn:   betaling (konto/IBAN/frist/levering) + notat · sidefot m/ org.nr
//
//  Typografi: PP Right Grotesk + ABC Diatype fra /public/fonts, Helvetica-fallback.
// ---------------------------------------------------------------------------

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';
import { enhetDetalj, enhetMerker, enhetNavn } from './faktura';

const BLEKK = rgb(0.082, 0.075, 0.063);   // #151310
const HVIT = rgb(1, 1, 1);
const LILLA = rgb(0.478, 0.247, 0.659);   // #7a3fa8
const LILLA_MYK = rgb(0.949, 0.929, 0.976);
const GRAA = rgb(0.42, 0.40, 0.37);
const GRAA_LYS = rgb(0.62, 0.60, 0.57);
const FLATE = rgb(0.969, 0.965, 0.953);
const KANTF = rgb(0.906, 0.894, 0.871);
const KANTF_MYK = rgb(0.955, 0.949, 0.937);
const GRONN = rgb(0.12, 0.48, 0.27);
const AMBER = rgb(0.71, 0.45, 0.04);

const A4 = [595.28, 841.89];
const MARG = 50;
const KOL = A4[0] - MARG * 2;         // innholdsbredde
const BUNN = A4[1] - MARG - 26;       // ingenting tegnes under denne (sidefotens felt)

const kr = (n) => `${Math.round(Number(n) || 0).toLocaleString('nb-NO').replace(/\u00a0/g, ' ')} kr`;
const tall = (n, d = 2) => Number(n || 0).toLocaleString('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: d }).replace(/\u00a0/g, ' ');
function datoNb(iso) {
  const s = String(iso || '').slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}.${m}.${y}`;
}
// Kort dato i tabeller: «16.08.» innen fakturaperiodens år, ellers «30.06.27» — aldri tvetydig.
function periodeNb(iso, aar = null) {
  const s = String(iso || '').slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!m || !d) return s;
  if (aar && y && String(y) !== String(aar)) return `${d}.${m}.${String(y).slice(2)}`;
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
function TR(page, t, xRight, y, opts = {}) {
  const s = String(t ?? '');
  const w = (opts.font).widthOfTextAtSize(s, opts.size || 9.5);
  T(page, s, xRight - w, y, opts);
}
function bredde(font, t, size) { return font.widthOfTextAtSize(String(t ?? ''), size); }
function kutt(font, t, size, maxW) {
  let s = String(t ?? '');
  if (!s) return s;
  if (bredde(font, s, size) <= maxW) return s;
  while (s.length > 1 && bredde(font, `${s}…`, size) > maxW) s = s.slice(0, -1);
  return `${s}…`;
}
// Ordbryting → linjer som får plass i maxW.
function brytt(font, t, size, maxW, maksLinjer = 99) {
  const ord = String(t ?? '').split(/\s+/).filter(Boolean);
  const ut = []; let linje = '';
  for (const w of ord) {
    const test = linje ? `${linje} ${w}` : w;
    if (bredde(font, test, size) > maxW && linje) { ut.push(linje); linje = w; } else linje = test;
  }
  if (linje) ut.push(linje);
  if (ut.length > maksLinjer) { const k = ut.slice(0, maksLinjer); k[maksLinjer - 1] = kutt(font, `${k[maksLinjer - 1]} ${ut.slice(maksLinjer).join(' ')}`, size, maxW); return k; }
  return ut;
}
const hl = (page, x1, x2, yTopp, tykkelse = 0.8, color = KANTF) => page.drawLine({ start: { x: x1, y: yTopp }, end: { x: x2, y: yTopp }, thickness: tykkelse, color });

export async function fakturaPdf(faktura = {}) {
  const doc = await PDFDocument.create();
  const F = await lastFonter(doc);
  const sel = faktura.selger || {};
  const kjo = faktura.kjoper || {};
  const m = faktura.modell || {};
  const s = faktura.sammendrag || null;
  const erUtkast = !faktura.fakturanr || faktura.fakturanr === 'UTKAST';
  const dokTittel = erUtkast ? 'PROFORMA' : 'FAKTURA';
  const referanse = erUtkast ? `Utkast · ${faktura.referanse || ''}` : `Nr. ${faktura.fakturanr}`;

  // ── Sidemotor ────────────────────────────────────────────────────────────
  let page = doc.addPage(A4);
  let top = MARG;
  const Y = (t) => A4[1] - t;
  const nySide = () => {
    page = doc.addPage(A4);
    top = MARG;
    // Kompakt fortsettelseshode
    T(page, sel.navn || 'DigiHome Tech AS', MARG, Y(top + 10), { font: F.medium, size: 9, color: BLEKK });
    TR(page, `${dokTittel === 'PROFORMA' ? 'Proforma' : 'Faktura'} ${faktura.referanse || faktura.fakturanr || ''} · ${faktura.periodeLabel || faktura.periode || ''} · ${kjo.navn || ''}`, A4[0] - MARG, Y(top + 10), { font: F.body, size: 8.5, color: GRAA_LYS });
    top += 22;
    hl(page, MARG, A4[0] - MARG, Y(top));
    top += 22;
  };
  const plass = (h) => { if (top + h > BUNN) nySide(); };

  // ── Toppfelt ───────────────────────────────────────────────────────────────
  T(page, sel.navn || 'DigiHome Tech AS', MARG, Y(top + 20), { font: F.heading, size: 20, color: BLEKK });
  T(page, 'Plattformleverandør · programvarelisens', MARG, Y(top + 36), { font: F.body, size: 9, color: GRAA });
  {
    const merkeW = 136; const merkeX = A4[0] - MARG - merkeW;
    boks(page, merkeX, Y(top), merkeW, 44, 8, { color: erUtkast ? LILLA_MYK : BLEKK });
    T(page, dokTittel, merkeX + 14, Y(top + 20), { font: F.heading, size: 15, color: erUtkast ? LILLA : HVIT });
    T(page, kutt(F.body, referanse, 8.5, merkeW - 28), merkeX + 14, Y(top + 35), { font: F.body, size: 8.5, color: erUtkast ? LILLA : HVIT });
  }
  top += 66;
  hl(page, MARG, A4[0] - MARG, Y(top), 1);
  top += 24;

  // ── Fra / Til ──────────────────────────────────────────────────────────────
  {
    const colW = (KOL - 24) / 2;
    const fraX = MARG; const tilX = MARG + colW + 24;
    T(page, 'FRA', fraX, Y(top), { font: F.medium, size: 8, color: GRAA_LYS, tracking: 1.2 });
    T(page, 'FAKTURERES TIL', tilX, Y(top), { font: F.medium, size: 8, color: GRAA_LYS, tracking: 1.2 });
    let fy = top + 16; let ty = top + 16;
    T(page, sel.navn || '', fraX, Y(fy), { font: F.medium, size: 11, color: BLEKK });
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
      kjo.adresse || '',
      [kjo.postnr, kjo.sted].filter(Boolean).join(' '),
      kjo.epost || '',
      kjo.referanse ? `Deres ref.: ${kjo.referanse}` : '',
    ].filter(Boolean);
    for (const l of selLinjer) { T(page, kutt(F.body, l, 9, colW), fraX, Y(fy), { font: F.body, size: 9, color: GRAA }); fy += 13.5; }
    for (const l of kjoLinjer) { T(page, kutt(F.body, l, 9, colW), tilX, Y(ty), { font: F.body, size: 9, color: GRAA }); ty += 13.5; }
    if (!kjoLinjer.length && erUtkast) { T(page, 'Org.nr og adresse mangler — legg inn på kunden', tilX, Y(ty), { font: F.body, size: 8.5, color: AMBER }); ty += 13.5; }
    top = Math.max(fy, ty) + 12;
  }

  // ── Nøkkelbokser (nr / datoer / periode) ───────────────────────────────────
  {
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
    top += mBoksH + 16;
  }

  // ── Beregningsgrunnlag (etterprøvbarhet) — brytes over flere linjer, aldri kuttet ──
  {
    const deler = [];
    if (faktura.grunnlagLaast?.tid) deler.push(`Grunnlag låst ${datoNb(faktura.grunnlagLaast.tid)}`);
    else deler.push(`Grunnlag beregnet ${datoNb(faktura.grunnlagBeregnet || faktura.generert)} (ikke låst)`);
    if (faktura.grunnlagType === 'manuell') deler.push('manuelt antall');
    else if (m.grunnlag) deler.push(m.grunnlag === 'alle' ? 'alle enheter under forvaltning' : 'kun utleide enheter');
    if (faktura.grunnlagType !== 'manuell' && m.prorata != null) deler.push(m.prorata ? 'forholdsmessig per dag' : 'hel måned per enhet');
    if (s && s.ledig + s.delvis > 0 && m.grunnlag === 'alle') deler.push(`ledige teller ${m.ledigFaktor ?? 100} %`);
    if (s && s.rom > 0) deler.push(m.romModell === 'bolig' ? `${s.bofellesskap} bofellesskap = ${s.bofellesskap} enhet${s.bofellesskap === 1 ? '' : 'er'} (${s.rom} rom)` : `${s.rom} rom${(m.romFaktor ?? 100) !== 100 ? ` à ${m.romFaktor} %` : ' som hele enheter'}`);
    if (m.trinnModell) deler.push(m.trinnModell === 'progressiv' ? 'progressive trinn' : 'én trinnpris');
    if (s && s.nye > 0) deler.push(`${s.nye} ny${s.nye === 1 ? '' : 'e'} på plattformen denne måneden (telles fra registreringsdagen)`);
    if (s && s.forRegistrering > 0) deler.push(`${s.forRegistrering} registrert etter perioden (ikke fakturert)`);
    const linjerG = [];
    linjerG.push(...brytt(F.body, deler.join(' · '), 8.5, KOL, 3));
    if (s && faktura.grunnlagType !== 'manuell') {
      linjerG.push(`${s.enheter} enheter: ${s.utleid} utleid · ${s.ledig} ledig · ${s.delvis} delvis · vektet ${tall(s.vektet)}`);
      const sv = s.selvbetjent;
      if (sv && sv.registrert > 0) {
        const biter = [`Selvbetjente: ${sv.registrert} registrert`, `${sv.medLeieforhold} med leieforhold`];
        if (sv.prove) biter.push(`${sv.prove} i prøveperiode${sv.proveDager ? ` (${sv.proveDager} dager)` : ''}`);
        if (sv.dvale) biter.push(`${sv.dvale} i dvale${sv.dvaleDager ? ` (>${sv.dvaleDager} dager uten leieforhold)` : ''}`);
        if (sv.forRegistrering) biter.push(`${sv.forRegistrering} registrert etter perioden`);
        biter.push(`${sv.fakturert} fakturert`);
        if (sv.regel === 'leieforhold') biter.push('teller kun måneder med leietaker');
        linjerG.push(...brytt(F.body, biter.join(' · '), 8.5, KOL, 2));
      }
    }
    plass(linjerG.length * 12 + 8);
    for (const l of linjerG) { T(page, l, MARG, Y(top), { font: F.body, size: 8.5, color: GRAA_LYS }); top += 12; }
    top += 12;
  }

  // ── Fakturalinjer ──────────────────────────────────────────────────────────
  const cAntR = A4[0] - MARG - 200;
  const cPrisR = A4[0] - MARG - 100;
  const cBelR = A4[0] - MARG;
  const beskrW = cAntR - MARG - 60;
  const linjeHode = (tittel = 'SPESIFIKASJON') => {
    T(page, tittel, MARG, Y(top), { font: F.medium, size: 8, color: GRAA_LYS, tracking: 1.2 });
    top += 14;
    T(page, 'Beskrivelse', MARG, Y(top), { font: F.medium, size: 8.5, color: GRAA });
    TR(page, 'Antall', cAntR, Y(top), { font: F.medium, size: 8.5, color: GRAA });
    TR(page, 'Pris', cPrisR, Y(top), { font: F.medium, size: 8.5, color: GRAA });
    TR(page, 'Beløp', cBelR, Y(top), { font: F.medium, size: 8.5, color: GRAA });
    top += 8;
    hl(page, MARG, A4[0] - MARG, Y(top));
    top += 16;
  };
  plass(60);
  linjeHode();

  const linjer = faktura.linjer || [];
  const gruppert = linjer.some((l) => l.gruppe);
  if (!linjer.length) {
    T(page, `Ingen enheter i grunnlaget for ${faktura.periodeLabel || faktura.periode}.`, MARG, Y(top), { font: F.body, size: 10, color: GRAA });
    top += 20;
  }
  let sisteGruppe = null;
  const merkeTekst = (l) => (l.merker || []).map((x) => x.t).join(' · ');
  const aarP = String(faktura.periode || '').slice(0, 4) || null;
  for (const l of linjer) {
    // Gruppehode (per-enhet-modus): produktnavn + antall enheter i gruppen, én gang.
    if (gruppert && l.gruppe && l.gruppe !== sisteGruppe) {
      const antallIGruppe = linjer.filter((x) => x.gruppe === l.gruppe).length;
      plass(38);
      if (sisteGruppe) top += 4;
      T(page, l.gruppe, MARG, Y(top), { font: F.medium, size: 10, color: BLEKK });
      TR(page, `${antallIGruppe} enhet${antallIGruppe === 1 ? '' : 'er'}`, cBelR, Y(top), { font: F.body, size: 9, color: GRAA_LYS });
      top += 16;
      sisteGruppe = l.gruppe;
    }
    const erEnhet = Boolean(l.gruppe);
    const antTxt = l.type === 'minstepris' ? '' : ((l.vekt != null && l.vekt !== l.antall) ? `${tall(l.vekt)}${erEnhet ? '' : ' (vektet)'}` : tall(l.antall));
    const innrykk = erEnhet ? 12 : 0;
    const bFont = erEnhet ? F.body : F.medium; const bSize = erEnhet ? 9.5 : 10;
    // Beskrivelsen brytes over inntil to linjer — enhetsnavn kuttes aldri.
    const bLinjer = brytt(bFont, l.beskrivelse || '', bSize, beskrW - innrykk, 2);
    // Underlinje: enhetsdetalj («Leilighet · 3. etg · 30m² 1-roms») + markører (ny/prøve/ledig/…).
    const under = erEnhet ? [l.detalj, merkeTekst(l)].filter(Boolean).join('  ·  ') : '';
    const uLinjer = under ? brytt(F.body, under, 8, beskrW - innrykk, 1) : [];
    const linjeH = Math.max(1, bLinjer.length) * 12.5 + uLinjer.length * 10.5 + 5.5;
    plass(linjeH + 4);
    let by = top;
    for (const bl of bLinjer) { T(page, bl, MARG + innrykk, Y(by), { font: bFont, size: bSize, color: BLEKK }); by += 12.5; }
    for (const ul of uLinjer) { T(page, ul, MARG + innrykk, Y(by - 1.5), { font: F.body, size: 8, color: GRAA_LYS }); by += 10.5; }
    TR(page, antTxt, cAntR, Y(top), { font: F.body, size: 9.5, color: GRAA });
    TR(page, l.type === 'minstepris' ? '' : kr(l.pris), cPrisR, Y(top), { font: F.body, size: 9.5, color: GRAA });
    TR(page, kr(l.belop), cBelR, Y(top), { font: erEnhet ? F.body : F.medium, size: erEnhet ? 9.5 : 10, color: BLEKK });
    top += linjeH;
  }

  // ── Totaler — holdes alltid sammen ────────────────────────────────────────
  plass(110);
  top += 4;
  hl(page, MARG, A4[0] - MARG, Y(top));
  top += 18;
  {
    const totX = A4[0] - MARG - 220;
    const rad = (label, val) => {
      T(page, label, totX, Y(top), { font: F.body, size: 10, color: GRAA });
      TR(page, val, cBelR, Y(top), { font: F.medium, size: 10.5, color: BLEKK });
      top += 18;
    };
    rad('Sum eks. mva', kr(faktura.sumEksMva));
    rad(faktura.mvaRegistrert ? `Mva ${faktura.mvaSats} %` : 'Mva (ikke mva-registrert)', kr(faktura.mva));
    boks(page, totX - 12, Y(top), 220 + 12, 34, 8, { color: BLEKK });
    T(page, 'Å betale', totX, Y(top + 21), { font: F.medium, size: 12, color: HVIT });
    TR(page, kr(faktura.sumInkMva), cBelR - 4, Y(top + 21), { font: F.heading, size: 16, color: HVIT });
    top += 34 + 6;
    TR(page, `Forfall ${datoNb(faktura.forfallsDato)} · ${faktura.valuta || 'NOK'}`, cBelR, Y(top + 8), { font: F.body, size: 8, color: GRAA_LYS });
    top += 26;
  }

  // ── Enhetsspesifikasjon ───────────────────────────────────────────────────
  const spec = faktura.spesifikasjon || [];
  if (spec.length) {
    const alle = m.grunnlag === 'alle' && faktura.grunnlagType !== 'manuell';
    const f = Math.max(0, Math.min(1, (m.ledigFaktor ?? 100) / 100));
    // Kolonner (høyrekanter for tall). Adresse får mest plass; tekst brytes, kuttes aldri.
    const xAdr = MARG;
    const xLeie = MARG + 162;
    const xPer = MARG + 262;
    const xUtR = A4[0] - MARG - (alle ? 118 : 84);
    const xForvR = A4[0] - MARG - 76;   // kun ved «alle»
    const xVektR = A4[0] - MARG - 42;
    const xBelR = A4[0] - MARG;
    const wAdr = xLeie - xAdr - 10;
    const wLeie = xPer - xLeie - 10;
    const wPer = xUtR - xPer - 34;
    const LH = 11; // linjehøyde i tabellen
    const hode = (fortsatt = false) => {
      T(page, `ENHETSSPESIFIKASJON · ${spec.length} enhet${spec.length === 1 ? '' : 'er'}${fortsatt ? ' (forts.)' : ''}`, MARG, Y(top), { font: F.medium, size: 8, color: GRAA_LYS, tracking: 1.2 });
      top += 16;
      T(page, 'Adresse', xAdr, Y(top), { font: F.medium, size: 8, color: GRAA });
      T(page, 'Leietaker', xLeie, Y(top), { font: F.medium, size: 8, color: GRAA });
      T(page, 'Leieperiode', xPer, Y(top), { font: F.medium, size: 8, color: GRAA });
      TR(page, 'Utleid', xUtR, Y(top), { font: F.medium, size: 8, color: GRAA });
      if (alle) TR(page, 'Forvaltet', xForvR, Y(top), { font: F.medium, size: 8, color: GRAA });
      TR(page, 'Vekt', xVektR, Y(top), { font: F.medium, size: 8, color: GRAA });
      TR(page, 'Beløp', xBelR, Y(top), { font: F.medium, size: 8, color: GRAA });
      top += 7;
      hl(page, MARG, A4[0] - MARG, Y(top), 0.7);
      top += 13;
    };
    plass(80);
    top += 6;
    hode();
    // Grupper: forvaltede først, så selvbetjente (ved per_type) — med liten gruppelinje.
    const grupper = [];
    const perType = spec.some((e) => e.linjetype === 'selvbetjent') && spec.some((e) => e.linjetype === 'forvaltet');
    if (perType) {
      grupper.push({ navn: 'Forvaltede enheter', rader: spec.filter((e) => e.linjetype !== 'selvbetjent') });
      grupper.push({ navn: 'Selvbetjente enheter', rader: spec.filter((e) => e.linjetype === 'selvbetjent') });
    } else grupper.push({ navn: null, rader: spec });
    let i = 0;
    for (const g of grupper) {
      if (!g.rader.length) continue;
      if (g.navn) { plass(30); top += 2; T(page, g.navn.toUpperCase(), MARG, Y(top), { font: F.medium, size: 7.5, color: GRAA_LYS, tracking: 1 }); top += 14; }
      for (const e of g.rader) {
        // Innhold i radens tekstceller (brytes over inntil to linjer hver)
        const merker = enhetMerker(e, m).filter((x) => x.k !== 'ledig' && x.k !== 'delvis');
        const adrLinjer = brytt(F.body, enhetNavn(e), 8.5, wAdr, 2);
        const detalj = enhetDetalj(e);
        const mt = merker.map((x) => x.t).join(' · ');
        const leier = e.tenant_name || (e.status === 'ledig' ? 'Ledig' : '—');
        const leieLinjer = brytt(F.body, leier, 8.5, wLeie, 2);
        const per = (e.move_in_date || e.move_out_date)
          ? `${e.move_in_date ? periodeNb(e.move_in_date, aarP) : ''}–${e.move_out_date ? periodeNb(e.move_out_date, aarP) : ''}`
          : (e.unit_type === 'Bofellesskap' ? `${e.romUtleid ?? ''}/${e.rom ?? ''} rom utleid` : '—');
        const perLinjer = brytt(F.body, per, 8.5, wPer, 2);
        // Underlinje(r) i adressekolonnen: detalj + markører (markører får egen linje hvis de ikke får plass)
        const underAdr = [];
        if (detalj && mt && bredde(F.body, detalj, 7.5) + bredde(F.body, mt, 7.5) + 8 <= wAdr) underAdr.push({ detalj, mt });
        else {
          if (detalj) for (const d of brytt(F.body, detalj, 7.5, wAdr, 2)) underAdr.push({ detalj: d, mt: '' });
          if (mt) underAdr.push({ detalj: '', mt });
        }
        const linjerIRad = Math.max(adrLinjer.length + underAdr.length, leieLinjer.length, perLinjer.length, 1);
        const radH = linjerIRad * LH + 5;
        if (top + radH > BUNN) { nySide(); hode(true); }
        if (i % 2 === 1) boks(page, MARG - 4, Y(top - 11.5), KOL + 8, radH, 3, { color: KANTF_MYK });
        // Adresse (+ detalj/markører)
        let ay = top;
        for (const al of adrLinjer) { T(page, al, xAdr, Y(ay), { font: F.body, size: 8.5, color: BLEKK }); ay += LH; }
        for (const u of underAdr) {
          let ux = xAdr;
          if (u.detalj) { T(page, u.detalj, ux, Y(ay - 0.5), { font: F.body, size: 7.5, color: GRAA_LYS }); ux += bredde(F.body, u.detalj, 7.5) + 8; }
          if (u.mt) T(page, u.mt, ux, Y(ay - 0.5), { font: F.body, size: 7.5, color: merker.some((x) => x.k === 'ny' || x.k === 'prove') ? GRONN : GRAA_LYS });
          ay += LH;
        }
        // Leietaker + periode (brutt)
        let ly = top;
        for (const ll of leieLinjer) { T(page, ll, xLeie, Y(ly), { font: F.body, size: 8.5, color: e.status === 'ledig' ? GRAA_LYS : GRAA }); ly += LH; }
        let py = top;
        for (const pl of perLinjer) { T(page, pl, xPer, Y(py), { font: F.body, size: 8.5, color: GRAA }); py += LH; }
        // Dager: utleid i perioden (etter ev. prøvetrekk) og — ved «alle» — dager under forvaltning.
        TR(page, e.dager != null ? String(e.dager) : '—', xUtR, Y(top), { font: F.body, size: 8.5, color: e.dager > 0 ? GRAA : GRAA_LYS });
        if (alle) TR(page, e.dagerForvaltet != null ? String(e.dagerForvaltet) : '—', xForvR, Y(top), { font: F.body, size: 8.5, color: GRAA });
        const vekt = e.vekt != null ? e.vekt : (Number(e.vektUtleid || 0) + Number(e.vektLedig || 0) * f);
        TR(page, tall(vekt, 2), xVektR, Y(top), { font: F.body, size: 8.5, color: GRAA });
        TR(page, kr(e.belop), xBelR, Y(top), { font: F.medium, size: 8.5, color: BLEKK });
        top += radH;
        i += 1;
      }
    }
    // Forklaring av kolonnene — liten, brytes ved behov
    const forklaring = brytt(F.body, `Utleid = dager med leietaker i perioden${alle ? ' · Forvaltet = dager under forvaltning (ledige dager teller ' + (m.ledigFaktor ?? 100) + ' %)' : ''} · Vekt = andel av én hel enhet som faktureres`, 7.5, KOL, 2);
    plass(forklaring.length * 10 + 6);
    top += 4;
    for (const fl of forklaring) { T(page, fl, MARG, Y(top), { font: F.body, size: 7.5, color: GRAA_LYS }); top += 10; }
    top += 4;
  }

  // ── Bunn: betaling + notat — tekst brytes, boksen vokser med innholdet ────
  {
    const kolW = (KOL / 2) - 30;
    const betRaa = [];
    if (sel.bankkonto) betRaa.push(`Kontonummer: ${sel.bankkonto}`);
    if (sel.iban) betRaa.push(`IBAN: ${sel.iban}${sel.bic ? ` · BIC ${sel.bic}` : ''}`);
    if (!sel.bankkonto && !sel.iban) betRaa.push('Kontonummer: mangler i innstillingene');
    betRaa.push(`Betalingsfrist: ${faktura.betalingsfristDager} dager · forfall ${datoNb(faktura.forfallsDato)}`);
    betRaa.push(`Levering: ${faktura.levering === 'EHF' ? 'EHF (elektronisk faktura)' : 'PDF på e-post'}${erUtkast ? ' · fakturanummer og KID tildeles ved sending' : ''}`);
    const betLinjer = betRaa.flatMap((l) => brytt(F.body, l, 9, kolW, 2).map((t, i) => ({ t, amber: i === 0 && !sel.bankkonto && !sel.iban && l.startsWith('Kontonummer') })));
    const notat = faktura.notat || `Lisens for bruk av DigiHome-plattformen i ${faktura.periodeLabel || faktura.periode || 'perioden'}. Ved forsinket betaling påløper forsinkelsesrente etter forsinkelsesrenteloven.`;
    const notatLinjer = brytt(F.body, notat, 8.5, kolW, 6);
    const bunnH = Math.max(84, 32 + Math.max(betLinjer.length * 12.5, notatLinjer.length * 11.5) + 12);
    plass(bunnH + 10);
    top += 10;
    boks(page, MARG, Y(top), KOL, bunnH, 10, { color: FLATE });
    const bx = MARG + 16;
    T(page, 'BETALING', bx, Y(top + 18), { font: F.medium, size: 7.5, color: GRAA_LYS, tracking: 1 });
    let bd = top + 32;
    for (const l of betLinjer) { T(page, l.t, bx, Y(bd), { font: F.body, size: 9, color: l.amber ? AMBER : GRAA }); bd += 12.5; }
    const nx = MARG + KOL / 2 + 8; let nd = top + 18;
    T(page, 'MERKNAD', nx, Y(nd), { font: F.medium, size: 7.5, color: GRAA_LYS, tracking: 1 });
    nd += 14;
    for (const l of notatLinjer) { T(page, l, nx, Y(nd), { font: F.body, size: 8.5, color: GRAA }); nd += 11.5; }
    top += bunnH;
  }

  // ── Sidefot på alle sider ─────────────────────────────────────────────────
  const sider = doc.getPages();
  const fotV = erUtkast
    ? 'Proforma — ikke bokført. Endelig fakturanummer tildeles ved sending via regnskapssystemet.'
    : `${sel.navn || 'DigiHome Tech AS'}${sel.orgnr ? ` · Org.nr ${sel.orgnr}${sel.mvaRegistrert ? ' MVA' : ''}` : ''}${sel.epost ? ` · ${sel.epost}` : ''}`;
  sider.forEach((p, idx) => {
    hl(p, MARG, A4[0] - MARG, MARG - 8, 0.6, KANTF);
    T(p, kutt(F.body, fotV, 7.5, KOL - 80), MARG, MARG - 20, { font: F.body, size: 7.5, color: GRAA_LYS });
    TR(p, `Side ${idx + 1} av ${sider.length}`, A4[0] - MARG, MARG - 20, { font: F.body, size: 7.5, color: GRAA_LYS });
  });

  return Buffer.from(await doc.save());
}
