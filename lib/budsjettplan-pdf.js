// ---------------------------------------------------------------------------
// PDF-RAPPORT for vekstbudsjett/investormodell — «verdensklasse» investordokument
// bygget med pdf-lib (ingen eksterne tjenester):
//   Side 1  Mørk forside — DigiHome-identitet, tittel, periode, nøkkelstripe
//   Side 2  Nøkkeltall — KPI-kort, vekst & lønnsomhet, enhetsøkonomi
//   Side 3  Utvikling — søylediagram (inntekter/kostnader) + akkumulert kurve
//           med break-even-markering, og årsoversikt-tabell
//   Side 4  Månedsbudsjett — kompakt tabell for hele perioden
//   Side 5  Forutsetninger — drivere, vekstplan, bemanningstrapp, notat
// Typografi: PP Right Grotesk (overskrifter) + ABC Diatype (brødtekst) fra
// /public/fonts — faller stille tilbake til Helvetica hvis embedding feiler.
// ---------------------------------------------------------------------------

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';
import { beregnInvestorModell } from './budsjett-modell';

/* ── Palett ─────────────────────────────────────────────────────────────── */
const BLEKK = rgb(0.039, 0.039, 0.039);        // #0a0a0a
const HVIT = rgb(1, 1, 1);
const LILLA = rgb(0.486, 0.227, 0.929);        // #7c3aed
const LILLA_MYK = rgb(0.937, 0.914, 0.984);    // #efe9fb
const GRAA = rgb(0.541, 0.510, 0.471);         // #8a8278
const GRAA_LYS = rgb(0.706, 0.678, 0.639);     // #b4ada3
const FLATE = rgb(0.969, 0.965, 0.953);        // #f7f6f3
const KANTF = rgb(0.929, 0.918, 0.898);        // #edeae5
const GRONN = rgb(0.082, 0.502, 0.239);        // #15803d
const GRONN_MYK = rgb(0.918, 0.965, 0.933);    // #eaf6ee
const ROD = rgb(0.761, 0.255, 0.231);          // #c2413b

const A4 = [595.28, 841.89];
const MARG = 54;
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

/* ── Tall- og datoformat ────────────────────────────────────────────────── */
const kr = (n) => `${Math.round(Number(n) || 0).toLocaleString('nb-NO').replace(/\u00a0/g, ' ')} kr`;
const krKompakt = (n) => {
  const v = Number(n) || 0; const a = Math.abs(v);
  if (a >= 1000000) return `${(v / 1000000).toFixed(1).replace('.', ',').replace(',0', '')} mkr`;
  if (a >= 1000) return `${Math.round(v / 1000)} tkr`;
  return `${Math.round(v)} kr`;
};
const des = (n) => (Number(n) || 0).toLocaleString('nb-NO', { maximumFractionDigits: 1 }).replace(/\u00a0/g, ' ');
const kommatall = (n) => String(n ?? '').replace('.', ',');

function mndEtiketter(startYm, N) {
  const [y0, m0] = String(startYm || '').split('-').map(Number);
  return Array.from({ length: N }, (_, i) => {
    if (!y0 || !m0) return `M${i + 1}`;
    const m = (m0 - 1 + i) % 12; const y = y0 + Math.floor((m0 - 1 + i) / 12);
    return `${MND_KORT[m]} ${String(y).slice(2)}`;
  });
}
function mndNavn(startYm, idx) {
  if (idx === null || idx === undefined || idx < 0) return null;
  const [y0, m0] = String(startYm || '').split('-').map(Number);
  if (!y0 || !m0) return `måned ${idx + 1}`;
  const m = (m0 - 1 + idx) % 12; const y = y0 + Math.floor((m0 - 1 + idx) / 12);
  return `${MND_KORT[m]} ${y}`;
}

/* ── Fonter: brand-fonter fra /public/fonts, Helvetica som fallback ─────── */
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

/* ── Tegnehjelpere ──────────────────────────────────────────────────────── */
// Avrundet rektangel via SVG-path (pdf-lib har ikke radius på drawRectangle).
// y-parameteren = TOPPEN av boksen i sidekoordinater.
function boks(page, x, yTopp, w, h, r, opts = {}) {
  const rr = Math.min(r, w / 2, h / 2);
  const d = `M ${rr},0 L ${w - rr},0 Q ${w},0 ${w},${rr} L ${w},${h - rr} Q ${w},${h} ${w - rr},${h} L ${rr},${h} Q 0,${h} 0,${h - rr} L 0,${rr} Q 0,0 ${rr},0 Z`;
  page.drawSvgPath(d, { x, y: yTopp, ...opts });
}
function tekst(page, t, x, y, { font, size = 10, color = BLEKK, tracking = 0 } = {}) {
  if (tracking > 0) {
    // enkel sporing for sperrede etiketter
    let cx = x;
    for (const ch of String(t)) {
      page.drawText(ch, { x: cx, y, size, font, color });
      cx += font.widthOfTextAtSize(ch, size) + tracking;
    }
    return;
  }
  page.drawText(String(t), { x, y, size, font, color });
}
function hoyre(page, t, xRight, y, { font, size = 10, color = BLEKK } = {}) {
  const w = font.widthOfTextAtSize(String(t), size);
  page.drawText(String(t), { x: xRight - w, y, size, font, color });
}
function senter(page, t, xMid, y, { font, size = 10, color = BLEKK } = {}) {
  const w = font.widthOfTextAtSize(String(t), size);
  page.drawText(String(t), { x: xMid - w / 2, y, size, font, color });
}
function linje(page, x1, y1, x2, y2, { color = KANTF, thickness = 0.75 } = {}) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness });
}

/* Ordmerke + topplinje på innholdssider */
function sideHode(page, F, tittelTekst, side) {
  const [W, H] = A4;
  tekst(page, 'digihome', MARG, H - 44, { font: F.heading, size: 13, color: BLEKK });
  hoyre(page, 'KONFIDENSIELT', W - MARG, H - 42, { font: F.medium, size: 6.5, color: GRAA_LYS });
  linje(page, MARG, H - 56, W - MARG, H - 56);
  tekst(page, tittelTekst, MARG, H - 84, { font: F.heading, size: 19, color: BLEKK });
  return H - 108; // start-Y for innhold
}
function sideFot(page, F, planNavn, side, totalt) {
  const [W] = A4;
  linje(page, MARG, 44, W - MARG, 44);
  tekst(page, `DigiHome · ${planNavn}`, MARG, 32, { font: F.body, size: 7, color: GRAA_LYS });
  hoyre(page, `Konfidensielt investormateriale · Side ${side} av ${totalt}`, W - MARG, 32, { font: F.body, size: 7, color: GRAA_LYS });
}

/* ── Hovedfunksjon ──────────────────────────────────────────────────────── */
export async function lagVekstbudsjettPdf({ plan }) {
  const doc = await PDFDocument.create();
  doc.setTitle(`DigiHome — ${plan.navn}`);
  doc.setAuthor('DigiHome');
  doc.setSubject('Vekstbudsjett / investormodell');
  const F = await lastFonter(doc);

  const N = plan.antallMnd;
  const etiketter = mndEtiketter(plan.startYm, N);
  const periode = `${etiketter[0]} – ${etiketter[N - 1]}`;
  const generert = new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
  const erModell = plan.type === 'modell';
  const m = erModell ? beregnInvestorModell({ antallMnd: N, fakta: plan.fakta, drivere: plan.drivere, startYm: plan.startYm }) : null;

  // Felles månedsserier (også for enkle planer)
  let innSerie; let kostSerie;
  if (erModell && m) { innSerie = m.inntekt; kostSerie = m.kostSum; }
  else {
    const summer = (obj) => Array.from({ length: N }, (_, i) => Object.values(obj || {}).reduce((a, arr) => a + (Number(arr?.[i]) || 0), 0));
    innSerie = summer(plan.inntekter); kostSerie = summer(plan.kostnader);
  }
  const resSerie = innSerie.map((v, i) => v - kostSerie[i]);
  const akkSerie = resSerie.reduce((acc, v, i) => { acc.push((acc[i - 1] || 0) + v); return acc; }, []);
  const sumInn = innSerie.reduce((a, b) => a + b, 0);
  const sumKost = kostSerie.reduce((a, b) => a + b, 0);
  const beIdx = erModell && m ? (m.sammendrag.breakEvenIdx ?? -1) : resSerie.findIndex((v) => v > 0);
  const s = m?.sammendrag;

  const totaltSider = erModell ? 5 : 4;
  let sideNr = 1;

  /* ════ SIDE 1: FORSIDE (mørk) ════ */
  {
    const page = doc.addPage(A4);
    const [W, H] = A4;
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BLEKK });
    // Myk lilla glød oppe til høyre + diskré ring
    page.drawEllipse({ x: W - 60, y: H - 40, xScale: 260, yScale: 260, color: LILLA, opacity: 0.16 });
    page.drawEllipse({ x: W - 60, y: H - 40, xScale: 170, yScale: 170, color: LILLA, opacity: 0.12 });
    page.drawEllipse({ x: 40, y: 120, xScale: 200, yScale: 200, color: LILLA, opacity: 0.07 });

    tekst(page, 'digihome', MARG, H - 76, { font: F.heading, size: 20, color: HVIT });
    tekst(page, 'KONFIDENSIELT · INVESTORMATERIALE', MARG, H - 96, { font: F.medium, size: 6.5, color: rgb(0.62, 0.58, 0.54), tracking: 1.4 });

    // Tittelblokk
    let y = H - 340;
    tekst(page, 'VEKSTBUDSJETT', MARG, y + 34, { font: F.medium, size: 9, color: rgb(0.72, 0.6, 0.97), tracking: 2.2 });
    // Tittel over maks to linjer
    const tittelStr = String(plan.navn || 'Vekstbudsjett');
    const maksB = W - MARG * 2 - 40;
    let l1 = tittelStr; let l2 = '';
    if (F.heading.widthOfTextAtSize(tittelStr, 40) > maksB) {
      const ord = tittelStr.split(' ');
      l1 = ''; l2 = '';
      for (const o of ord) {
        if (!l2 && F.heading.widthOfTextAtSize(`${l1} ${o}`.trim(), 40) <= maksB) l1 = `${l1} ${o}`.trim();
        else l2 = `${l2} ${o}`.trim();
      }
    }
    tekst(page, l1, MARG, y, { font: F.heading, size: 40, color: HVIT });
    if (l2) { y -= 48; tekst(page, l2, MARG, y, { font: F.heading, size: 40, color: HVIT }); }
    y -= 34;
    tekst(page, `${periode} · ${N} måneder · generert ${generert}`, MARG, y, { font: F.body, size: 11, color: rgb(0.66, 0.63, 0.6) });
    if (plan.investorSynlig) { y -= 18; tekst(page, 'Delt i investorrommet', MARG, y, { font: F.body, size: 9, color: rgb(0.55, 0.52, 0.49) }); }

    // Nøkkelstripe nederst
    const stripeY = 150;
    linje(page, MARG, stripeY + 44, W - MARG, stripeY + 44, { color: rgb(0.18, 0.18, 0.18) });
    const nokler = erModell && s ? [
      ['SUM INNTEKTER', kr(s.sumInntekt)],
      ['RESULTAT', kr(s.resultat)],
      ['ENHETER VED SLUTT', des(s.enheterVedSlutt)],
      ['BREAK-EVEN', beIdx >= 0 ? mndNavn(plan.startYm, beIdx) : 'Utenfor perioden'],
    ] : [
      ['SUM INNTEKTER', kr(sumInn)],
      ['SUM KOSTNADER', kr(sumKost)],
      ['RESULTAT', kr(sumInn - sumKost)],
      ['PERIODE', `${N} mnd`],
    ];
    const bredde = (W - MARG * 2) / nokler.length;
    nokler.forEach(([l, v], i) => {
      const x = MARG + i * bredde;
      tekst(page, l, x, stripeY + 22, { font: F.medium, size: 6.5, color: rgb(0.5, 0.47, 0.44), tracking: 1 });
      tekst(page, v, x, stripeY + 4, { font: F.heading, size: 12.5, color: HVIT });
    });
    tekst(page, 'Utarbeidet av DigiHome · digihome.no', MARG, 64, { font: F.body, size: 7.5, color: rgb(0.42, 0.4, 0.38) });
    sideNr += 1;
  }

  /* ════ SIDE 2: NØKKELTALL ════ */
  {
    const page = doc.addPage(A4);
    const [W] = A4;
    let y = sideHode(page, F, 'Nøkkeltall for perioden', sideNr);

    // KPI-kort i 2 kolonner × 3 rader
    const kort = erModell && s ? [
      ['Sum inntekter', kr(s.sumInntekt), s.andelEksisterendePct !== null ? `${s.andelEksisterendePct} % kontraktsfestet i dag` : ''],
      ['Sum kostnader', kr(s.sumKost), ''],
      ['Resultat for perioden', kr(s.resultat), s.sumInntekt > 0 ? `${kommatall(Math.round((s.resultat / s.sumInntekt) * 1000) / 10)} % resultatgrad` : ''],
      ['Kapitalbehov', kr(s.kapitalbehov), s.kapitalbehovIdx !== null ? `dypeste punkt ${mndNavn(plan.startYm, s.kapitalbehovIdx)}` : 'dypeste akkumulerte punkt'],
      ['Break-even', beIdx >= 0 ? mndNavn(plan.startYm, beIdx) : 'Utenfor perioden', 'første måned med positivt resultat'],
      ['Enheter under forvaltning', des(s.enheterVedSlutt), `${des(s.sumNyeBrutto)} nye signert brutto`],
    ] : [
      ['Sum inntekter', kr(sumInn), ''],
      ['Sum kostnader', kr(sumKost), ''],
      ['Resultat for perioden', kr(sumInn - sumKost), sumInn > 0 ? `${kommatall(Math.round(((sumInn - sumKost) / sumInn) * 1000) / 10)} % resultatgrad` : ''],
      ['Break-even', beIdx >= 0 ? mndNavn(plan.startYm, beIdx) : 'Utenfor perioden', 'første måned med positivt resultat'],
    ];
    const kW = (W - MARG * 2 - 14) / 2; const kH = 72;
    kort.forEach(([l, v, sub], i) => {
      const kx = MARG + (i % 2) * (kW + 14);
      const ky = y - Math.floor(i / 2) * (kH + 12);
      boks(page, kx, ky, kW, kH, 10, { color: FLATE });
      tekst(page, l.toUpperCase(), kx + 16, ky - 22, { font: F.medium, size: 6.5, color: GRAA, tracking: 0.8 });
      const erResultat = /resultat for/i.test(l);
      const vFarge = erResultat ? ((erModell && s ? s.resultat : sumInn - sumKost) >= 0 ? GRONN : ROD) : BLEKK;
      tekst(page, v, kx + 16, ky - 44, { font: F.heading, size: 17, color: vFarge });
      if (sub) tekst(page, sub, kx + 16, ky - 60, { font: F.body, size: 7.5, color: GRAA_LYS });
    });
    y -= Math.ceil(kort.length / 2) * (kH + 12) + 16;

    if (erModell && m && s) {
      // Inntektssammensetning: kontraktsfestet vs modellert (stabel-linje)
      tekst(page, 'INNTEKTSSAMMENSETNING', MARG, y, { font: F.medium, size: 7, color: LILLA, tracking: 1.2 });
      y -= 16;
      const bW = W - MARG * 2;
      const andel = s.sumInntekt > 0 ? s.sumEksisterende / s.sumInntekt : 0;
      boks(page, MARG, y, bW, 14, 7, { color: LILLA_MYK });
      if (andel > 0.02) boks(page, MARG, y, Math.max(14, bW * andel), 14, 7, { color: LILLA });
      y -= 28;
      tekst(page, `Kontraktsfestet i dag: ${kr(s.sumEksisterende)} (${s.andelEksisterendePct ?? 0} %)`, MARG, y, { font: F.medium, size: 8.5, color: LILLA });
      hoyre(page, `${(s.sumReutleie || 0) > 0 ? `Re-utleie: ${kr(s.sumReutleie)} · ` : ''}Modellert vekst: ${kr(s.sumModellert)}`, W - MARG, y, { font: F.medium, size: 8.5, color: GRAA });
      y -= 30;

      // Enhetsøkonomi
      tekst(page, 'ENHETSØKONOMI (PER NY ENHET)', MARG, y, { font: F.medium, size: 7, color: LILLA, tracking: 1.2 });
      y -= 8;
      const okoRader = [
        ['Honorar per ny enhet (eks. mva)', kr(m.cac.bruttoHonorarNy), `${kommatall(m.drivere.honorarPctNye)} % av ${kr(m.drivere.snittleieNye)} snittleie`],
        ['Systemkostnad per enhet', kr(m.drivere.systemPerEnhet), ''],
        ['Månedlig bidrag per enhet', kr(m.cac.bidrag), ''],
        ['CAC / provisjon per ny enhet', kr(m.cac.provisjon), ''],
        ['CAC payback', m.cac.paybackMnd !== null ? `${kommatall(m.cac.paybackMnd)} mnd` : '—', 'måneder før bidraget dekker provisjonen'],
        ['Månedlig churn (modellert)', `${kommatall(s.mndChurnPct)} %`, `${kommatall(m.drivere.aarligChurnPct)} % årlig, kohortbasert`],
      ];
      for (const [l, v, note] of okoRader) {
        y -= 18;
        tekst(page, l, MARG, y, { font: F.body, size: 9, color: rgb(0.34, 0.33, 0.31) });
        hoyre(page, v, MARG + 300, y, { font: F.medium, size: 9.5, color: BLEKK });
        if (note) tekst(page, note, MARG + 318, y, { font: F.body, size: 7.5, color: GRAA_LYS });
        linje(page, MARG, y - 5, W - MARG, y - 5);
      }
    }

    sideFot(page, F, plan.navn, sideNr, totaltSider);
    sideNr += 1;
  }

  /* ════ SIDE 3: UTVIKLING (grafer + årsoversikt) ════ */
  {
    const page = doc.addPage(A4);
    const [W] = A4;
    let y = sideHode(page, F, 'Utvikling gjennom perioden', sideNr);

    /* Graf 1: inntekter vs kostnader per måned */
    const gX = MARG + 34; const gW = W - MARG * 2 - 34;
    const g1H = 150; const g1Bunn = y - g1H - 24;
    const maks = Math.max(...innSerie, ...kostSerie, 1);
    tekst(page, 'INNTEKTER (LILLA) MOT KOSTNADER (GRÅ) PER MÅNED', MARG, y, { font: F.medium, size: 7, color: LILLA, tracking: 1 });
    // gridlinjer
    for (let gi = 0; gi <= 3; gi++) {
      const gy = g1Bunn + (g1H * gi) / 3;
      linje(page, gX, gy, gX + gW, gy, { color: KANTF, thickness: 0.5 });
      hoyre(page, krKompakt((maks * gi) / 3), gX - 6, gy - 2.5, { font: F.body, size: 6.5, color: GRAA_LYS });
    }
    const slotW = gW / N;
    const barW = Math.min(9, slotW * 0.34);
    for (let i = 0; i < N; i++) {
      const bx = gX + i * slotW + slotW / 2;
      if (beIdx === i) page.drawRectangle({ x: gX + i * slotW + 1, y: g1Bunn, width: slotW - 2, height: g1H, color: GRONN_MYK });
      const hInn = (innSerie[i] / maks) * g1H;
      const hKost = (kostSerie[i] / maks) * g1H;
      page.drawRectangle({ x: bx - barW - 1, y: g1Bunn, width: barW, height: Math.max(1, hInn), color: LILLA });
      page.drawRectangle({ x: bx + 1, y: g1Bunn, width: barW, height: Math.max(1, hKost), color: rgb(0.72, 0.7, 0.67) });
      if (i % Math.ceil(N / 12) === 0) senter(page, etiketter[i], bx, g1Bunn - 12, { font: F.body, size: 6, color: GRAA_LYS });
    }
    if (beIdx >= 0) tekst(page, `Grønt felt = break-even (${mndNavn(plan.startYm, beIdx)})`, gX, g1Bunn - 26, { font: F.body, size: 7, color: GRONN });

    /* Graf 2: akkumulert resultat */
    let y2 = g1Bunn - 52;
    tekst(page, 'AKKUMULERT RESULTAT (KAPITALBEHOV = DYPESTE PUNKT)', MARG, y2, { font: F.medium, size: 7, color: LILLA, tracking: 1 });
    const g2H = 120; const g2Bunn = y2 - g2H - 20;
    const aMaks = Math.max(...akkSerie, 0); const aMin = Math.min(...akkSerie, 0);
    const spenn = (aMaks - aMin) || 1;
    const aY = (v) => g2Bunn + ((v - aMin) / spenn) * g2H;
    // null-linje
    linje(page, gX, aY(0), gX + gW, aY(0), { color: GRAA_LYS, thickness: 0.75 });
    hoyre(page, '0', gX - 6, aY(0) - 2.5, { font: F.body, size: 6.5, color: GRAA_LYS });
    hoyre(page, krKompakt(aMaks), gX - 6, aY(aMaks) - 2.5, { font: F.body, size: 6.5, color: GRAA_LYS });
    if (aMin < 0) hoyre(page, krKompakt(aMin), gX - 6, aY(aMin) - 2.5, { font: F.body, size: 6.5, color: GRAA_LYS });
    // kurve som linjesegmenter + punkter
    for (let i = 0; i < N; i++) {
      const x1 = gX + (i + 0.5) * slotW;
      if (i > 0) {
        const x0 = gX + (i - 0.5) * slotW;
        linje(page, x0, aY(akkSerie[i - 1]), x1, aY(akkSerie[i]), { color: akkSerie[i] >= 0 ? GRONN : ROD, thickness: 1.6 });
      }
    }
    // dypeste punkt-markør
    const dypIdx = akkSerie.indexOf(Math.min(...akkSerie));
    if (dypIdx >= 0 && akkSerie[dypIdx] < 0) {
      const dx = gX + (dypIdx + 0.5) * slotW;
      page.drawEllipse({ x: dx, y: aY(akkSerie[dypIdx]), xScale: 3, yScale: 3, color: ROD });
      tekst(page, `${krKompakt(akkSerie[dypIdx])} (${mndNavn(plan.startYm, dypIdx)})`, Math.min(dx + 8, gX + gW - 90), aY(akkSerie[dypIdx]) - 3, { font: F.medium, size: 7, color: ROD });
    }

    /* Årsoversikt-tabell */
    let y3 = g2Bunn - 46;
    tekst(page, 'ÅRSOVERSIKT', MARG, y3, { font: F.medium, size: 7, color: LILLA, tracking: 1.2 });
    y3 -= 10;
    const [y0Aar, m0Aar] = String(plan.startYm || '').split('-').map(Number);
    const grupper = {};
    for (let i = 0; i < N; i++) {
      const nyY = y0Aar && m0Aar ? y0Aar + Math.floor((m0Aar - 1 + i) / 12) : 'Perioden';
      (grupper[nyY] = grupper[nyY] || []).push(i);
    }
    const kol = [MARG, MARG + 120, MARG + 228, MARG + 330, MARG + 395, W - MARG];
    const hodeT = ['År', 'Inntekter', 'Kostnader', 'Resultat', 'Res.grad', 'Enheter v/slutt'];
    boks(page, MARG - 8, y3, W - MARG * 2 + 16, 20, 6, { color: BLEKK });
    hodeT.forEach((h, i) => {
      if (i === 0) tekst(page, h, kol[i], y3 - 14, { font: F.medium, size: 8, color: HVIT });
      else hoyre(page, h, kol[i], y3 - 14, { font: F.medium, size: 8, color: HVIT });
    });
    y3 -= 20;
    for (const [aarNavn, idx] of Object.entries(grupper)) {
      y3 -= 18;
      const iSum = idx.reduce((a, i) => a + innSerie[i], 0);
      const kSum = idx.reduce((a, i) => a + kostSerie[i], 0);
      const rSum = iSum - kSum;
      tekst(page, String(aarNavn), kol[0], y3, { font: F.medium, size: 9, color: BLEKK });
      hoyre(page, kr(iSum), kol[1], y3, { font: F.body, size: 9, color: BLEKK });
      hoyre(page, kr(kSum), kol[2], y3, { font: F.body, size: 9, color: BLEKK });
      hoyre(page, kr(rSum), kol[3], y3, { font: F.medium, size: 9, color: rSum >= 0 ? GRONN : ROD });
      hoyre(page, iSum > 0 ? `${kommatall(Math.round((rSum / iSum) * 1000) / 10)} %` : '—', kol[4], y3, { font: F.body, size: 9, color: GRAA });
      hoyre(page, erModell && m ? des(m.enheter[idx[idx.length - 1]]) : '—', kol[5], y3, { font: F.body, size: 9, color: BLEKK });
      linje(page, MARG - 8, y3 - 5, W - MARG + 8, y3 - 5);
    }
    // Totalrad
    y3 -= 18;
    tekst(page, 'SUM', kol[0], y3, { font: F.heading, size: 9, color: BLEKK });
    hoyre(page, kr(sumInn), kol[1], y3, { font: F.medium, size: 9, color: BLEKK });
    hoyre(page, kr(sumKost), kol[2], y3, { font: F.medium, size: 9, color: BLEKK });
    hoyre(page, kr(sumInn - sumKost), kol[3], y3, { font: F.heading, size: 9, color: (sumInn - sumKost) >= 0 ? GRONN : ROD });
    hoyre(page, sumInn > 0 ? `${kommatall(Math.round(((sumInn - sumKost) / sumInn) * 1000) / 10)} %` : '—', kol[4], y3, { font: F.medium, size: 9, color: GRAA });
    hoyre(page, erModell && m ? des(m.enheter[N - 1]) : '—', kol[5], y3, { font: F.medium, size: 9, color: BLEKK });

    sideFot(page, F, plan.navn, sideNr, totaltSider);
    sideNr += 1;
  }

  /* ════ SIDE 4: MÅNEDSBUDSJETT (kompakt tabell) ════ */
  {
    const page = doc.addPage(A4);
    const [W] = A4;
    let y = sideHode(page, F, 'Månedsbudsjett', sideNr);
    const kol = erModell
      ? [MARG, MARG + 80, MARG + 140, MARG + 245, MARG + 345, MARG + 425, W - MARG]
      : [MARG, MARG + 150, MARG + 260, MARG + 370, W - MARG];
    const hodeT = erModell
      ? ['Måned', 'Enheter', 'Nye (brutto)', 'Inntekter', 'Kostnader', 'Resultat', 'Akkumulert']
      : ['Måned', 'Inntekter', 'Kostnader', 'Resultat', 'Akkumulert'];
    boks(page, MARG - 8, y, W - MARG * 2 + 16, 20, 6, { color: BLEKK });
    hodeT.forEach((h, i) => {
      if (i === 0) tekst(page, h, kol[i], y - 14, { font: F.medium, size: 7.5, color: HVIT });
      else hoyre(page, h, kol[i], y - 14, { font: F.medium, size: 7.5, color: HVIT });
    });
    y -= 22;
    const radH = Math.min(16.5, (y - 70) / N);
    for (let i = 0; i < N; i++) {
      y -= radH;
      if (i === beIdx) page.drawRectangle({ x: MARG - 8, y: y - 4, width: W - MARG * 2 + 16, height: radH, color: GRONN_MYK });
      else if (i % 2 === 1) page.drawRectangle({ x: MARG - 8, y: y - 4, width: W - MARG * 2 + 16, height: radH, color: FLATE });
      const fontS = 7.8;
      tekst(page, etiketter[i], kol[0], y, { font: F.medium, size: fontS, color: BLEKK });
      if (erModell && m) {
        hoyre(page, des(m.enheter[i]), kol[1], y, { font: F.body, size: fontS, color: GRAA });
        hoyre(page, des(m.nyePerMndSerie[i]), kol[2], y, { font: F.body, size: fontS, color: GRAA });
        hoyre(page, kr(innSerie[i]), kol[3], y, { font: F.body, size: fontS, color: BLEKK });
        hoyre(page, kr(kostSerie[i]), kol[4], y, { font: F.body, size: fontS, color: BLEKK });
        hoyre(page, kr(resSerie[i]), kol[5], y, { font: F.medium, size: fontS, color: resSerie[i] >= 0 ? GRONN : ROD });
        hoyre(page, kr(akkSerie[i]), kol[6], y, { font: F.body, size: fontS, color: akkSerie[i] >= 0 ? GRONN : GRAA });
      } else {
        hoyre(page, kr(innSerie[i]), kol[1], y, { font: F.body, size: fontS, color: BLEKK });
        hoyre(page, kr(kostSerie[i]), kol[2], y, { font: F.body, size: fontS, color: BLEKK });
        hoyre(page, kr(resSerie[i]), kol[3], y, { font: F.medium, size: fontS, color: resSerie[i] >= 0 ? GRONN : ROD });
        hoyre(page, kr(akkSerie[i]), kol[4], y, { font: F.body, size: fontS, color: akkSerie[i] >= 0 ? GRONN : GRAA });
      }
    }
    if (beIdx >= 0) {
      y -= 20;
      tekst(page, `Grønn rad = break-even (${mndNavn(plan.startYm, beIdx)})`, MARG, y, { font: F.body, size: 7, color: GRONN });
    }
    sideFot(page, F, plan.navn, sideNr, totaltSider);
    sideNr += 1;
  }

  /* ════ SIDE 5: FORUTSETNINGER (kun modell) ════ */
  if (erModell && m) {
    const page = doc.addPage(A4);
    const [W] = A4;
    let y = sideHode(page, F, 'Forutsetninger og drivere', sideNr);
    const d = m.drivere;

    const kolonne = (x, tittelK, rader) => {
      let yy = y;
      tekst(page, tittelK, x, yy, { font: F.medium, size: 7, color: LILLA, tracking: 1.2 });
      yy -= 6;
      for (const [l, v] of rader) {
        yy -= 17;
        tekst(page, l, x, yy, { font: F.body, size: 8.5, color: rgb(0.34, 0.33, 0.31) });
        hoyre(page, v, x + 225, yy, { font: F.medium, size: 8.5, color: BLEKK });
        linje(page, x, yy - 4.5, x + 225, yy - 4.5);
      }
      return yy;
    };
    const kolV = kolonne(MARG, 'INNTEKTSDRIVERE', [
      ['Nye enheter per måned (grunntakt)', des(d.nyePerMnd)],
      ['Snittleie nye enheter', kr(d.snittleieNye)],
      ['Honorarsats nye enheter', `${kommatall(d.honorarPctNye)} %`],
      ['Oppstartshonorar per enhet', kr(d.oppstartPerEnhet)],
      ['Årlig churn (kohortbasert)', `${kommatall(d.aarligChurnPct)} %`],
    ]);
    const kolH = kolonne(MARG + 253, 'KOSTNADSDRIVERE', [
      ['Systemkostnad per enhet/mnd', kr(d.systemPerEnhet)],
      ['Enheter per årsverk', String(d.enheterPerAarsverk)],
      ['Årslønn per årsverk', kr(d.aarslonn)],
      ['Arbeidsgiverpåslag', `${kommatall(d.paslagPct)} %`],
      ['Markedsføring fast/mnd', kr(d.mfFast)],
      ['Salgsprovisjon per ny enhet', kr(d.provisjonPerNyEnhet)],
      ['Administrasjon fast/mnd', kr(d.adminFast)],
      ['Andre faste/mnd', kr(d.andreFaste)],
    ]);
    y = Math.min(kolV, kolH) - 34;

    // Vekstplan + bemanningstrapp side ved side
    let yv = y;
    tekst(page, 'VEKSTPLAN (FASER)', MARG, yv, { font: F.medium, size: 7, color: LILLA, tracking: 1.2 });
    yv -= 6;
    const faser = [[`Fra måned 1`, `${kommatall(d.nyePerMnd)} enh/mnd`], ...(d.vekstplan || []).map((f) => [`Fra ${mndNavn(plan.startYm, f.fraMnd - 1)}`, `${kommatall(f.perMnd)} enh/mnd`])];
    for (const [l, v] of faser) {
      yv -= 17;
      tekst(page, l, MARG, yv, { font: F.body, size: 8.5, color: rgb(0.34, 0.33, 0.31) });
      hoyre(page, v, MARG + 225, yv, { font: F.medium, size: 8.5, color: BLEKK });
      linje(page, MARG, yv - 4.5, MARG + 225, yv - 4.5);
    }
    let yb = y;
    tekst(page, 'BEMANNINGSTRAPP (BUDSJETTERT)', MARG + 253, yb, { font: F.medium, size: 7, color: LILLA, tracking: 1.2 });
    yb -= 6;
    for (const t of (d.bemanningstrinn || [])) {
      yb -= 17;
      tekst(page, t.type === 'dato' ? `Fra ${t.fraYm}` : `Fra ${t.fraEnheter} enheter`, MARG + 253, yb, { font: F.body, size: 8.5, color: rgb(0.34, 0.33, 0.31) });
      hoyre(page, `${kommatall(t.prosent)} % stilling`, MARG + 253 + 225, yb, { font: F.medium, size: 8.5, color: BLEKK });
      linje(page, MARG + 253, yb - 4.5, MARG + 253 + 225, yb - 4.5);
    }
    yb -= 17;
    tekst(page, 'Planlagt maks utnyttelse', MARG + 253, yb, { font: F.body, size: 8.5, color: rgb(0.34, 0.33, 0.31) });
    hoyre(page, `${kommatall(d.maalUtnyttelsePct)} %`, MARG + 253 + 225, yb, { font: F.medium, size: 8.5, color: BLEKK });

    // Notat
    if (plan.notat) {
      let yn = Math.min(yv, yb) - 40;
      tekst(page, 'NOTAT', MARG, yn, { font: F.medium, size: 7, color: LILLA, tracking: 1.2 });
      yn -= 16;
      // enkel tekstbryting
      const ord = String(plan.notat).split(/\s+/);
      let linjeT = '';
      const maksW = W - MARG * 2;
      for (const o of ord) {
        const prov = `${linjeT} ${o}`.trim();
        if (F.body.widthOfTextAtSize(prov, 8.5) > maksW) {
          tekst(page, linjeT, MARG, yn, { font: F.body, size: 8.5, color: rgb(0.34, 0.33, 0.31) });
          yn -= 13; linjeT = o;
          if (yn < 70) break;
        } else linjeT = prov;
      }
      if (linjeT && yn >= 70) tekst(page, linjeT, MARG, yn, { font: F.body, size: 8.5, color: rgb(0.34, 0.33, 0.31) });
    }

    sideFot(page, F, plan.navn, sideNr, totaltSider);
  }

  return Buffer.from(await doc.save());
}
