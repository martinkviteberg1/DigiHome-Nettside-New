// ---------------------------------------------------------------------------
// AVTALESAMMENDRAG (PDF) — profesjonelt éns-siders sammendrag av en kontrakt
// (forvaltningsavtale/leiekontrakt) generert fra plattformens registrerte
// avtaledata. Brukes som fallback når plattformen ikke har en signert
// PDF-fil lagret — originalen tar automatisk over når den finnes.
// Typografi og uttrykk matcher budsjettrapporten (pdf-lib + brand-fonter).
// ---------------------------------------------------------------------------

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';

const BLEKK = rgb(0.039, 0.039, 0.039);
const HVIT = rgb(1, 1, 1);
const LILLA = rgb(0.486, 0.227, 0.929);
const LILLA_MYK = rgb(0.937, 0.914, 0.984);
const GRAA = rgb(0.541, 0.51, 0.471);
const GRAA_LYS = rgb(0.706, 0.678, 0.639);
const FLATE = rgb(0.969, 0.965, 0.953);
const KANTF = rgb(0.929, 0.918, 0.898);
const GRONN = rgb(0.082, 0.502, 0.239);
const GRONN_MYK = rgb(0.918, 0.965, 0.933);
const RAV = rgb(0.706, 0.42, 0.035);
const RAV_MYK = rgb(0.992, 0.953, 0.878);

const A4 = [595.28, 841.89];
const MARG = 54;

const kr = (n) => `${Math.round(Number(n) || 0).toLocaleString('nb-NO').replace(/\u00a0/g, ' ')} kr`;
const dato = (iso) => {
  const s = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
};
const kutt = (s, maks = 36) => { const t = String(s || ''); return t.length > maks ? `${t.slice(0, maks - 1)}…` : t; };

async function lastFonter(doc) {
  try {
    const fontkit = (await import('@pdf-lib/fontkit')).default;
    doc.registerFontkit(fontkit);
    const rot = path.join(process.cwd(), 'public', 'fonts');
    const les = (p) => fs.readFileSync(path.join(rot, p));
    const heading = await doc.embedFont(les('right-grotesk/PPRightGrotesk-Bold.woff'), { subset: true });
    const body = await doc.embedFont(les('diatype/ABCDiatype-Regular.woff'), { subset: true });
    const medium = await doc.embedFont(les('diatype/ABCDiatype-Medium.woff'), { subset: true });
    return { heading, body, medium };
  } catch (e) {
    const heading = await doc.embedFont(StandardFonts.HelveticaBold);
    const body = await doc.embedFont(StandardFonts.Helvetica);
    return { heading, body, medium: heading };
  }
}

function boks(page, x, yTopp, w, h, r, opts = {}) {
  const rr = Math.min(r, w / 2, h / 2);
  const d = `M ${rr},0 L ${w - rr},0 Q ${w},0 ${w},${rr} L ${w},${h - rr} Q ${w},${h} ${w - rr},${h} L ${rr},${h} Q 0,${h} 0,${h - rr} L 0,${rr} Q 0,0 ${rr},0 Z`;
  page.drawSvgPath(d, { x, y: yTopp, ...opts });
}
function tekst(page, t, x, y, { font, size = 10, color = BLEKK, tracking = 0 } = {}) {
  if (tracking > 0) {
    let cx = x;
    for (const ch of String(t)) { page.drawText(ch, { x: cx, y, size, font, color }); cx += font.widthOfTextAtSize(ch, size) + tracking; }
    return;
  }
  page.drawText(String(t), { x, y, size, font, color });
}
function hoyre(page, t, xRight, y, { font, size = 10, color = BLEKK } = {}) {
  const w = font.widthOfTextAtSize(String(t), size);
  page.drawText(String(t), { x: xRight - w, y, size, font, color });
}
function linje(page, x1, y1, x2, y2, { color = KANTF, thickness = 0.75 } = {}) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness });
}

const STATUS_TEKST = { signed: 'Signert', active: 'Aktiv', pending: 'Venter signering', draft: 'Utkast', terminated: 'Avsluttet' };

export async function lagAvtaleSammendragPdf({ kontrakt }) {
  const k = kontrakt || {};
  const erForvaltning = String(k.type || '').includes('forvaltning');
  const tittel = erForvaltning ? 'Forvaltningsavtale' : 'Leiekontrakt';
  const eiendom = k.property || {};
  const eier = k.owner || {};
  const leietaker = k.tenant || {};
  const leie = Number(k.monthly_rent) || Number(k.estimated_monthly_rent) || 0;
  const leieErEstimat = !Number(k.monthly_rent) && !!Number(k.estimated_monthly_rent);
  const honorar = k.fee_model === 'percent' && Number(k.fee_percent) > 0
    ? `${String(Math.round(Number(k.fee_percent) * 1000) / 10).replace('.', ',')} % av månedsleien`
    : Number(k.fee_fixed) > 0 ? `${kr(k.fee_fixed)}/mnd (fast)` : '—';
  const honorarKr = k.fee_model === 'percent' && Number(k.fee_percent) > 0 && leie > 0
    ? `≈ ${kr(leie * Number(k.fee_percent))}/mnd` : null;
  const status = STATUS_TEKST[String(k.status || '').toLowerCase()] || (k.status ? String(k.status) : '—');
  const statusOk = ['signed', 'active'].includes(String(k.status || '').toLowerCase());

  const doc = await PDFDocument.create();
  doc.setTitle(`${tittel} — avtalesammendrag · ${eiendom.address || ''}`);
  doc.setAuthor('DigiHome AS');
  const F = await lastFonter(doc);
  const page = doc.addPage(A4);
  const [W, H] = A4;

  // Topp: ordmerke + dokumenttype
  tekst(page, 'digihome', MARG, H - 46, { font: F.heading, size: 14, color: BLEKK });
  hoyre(page, 'AVTALESAMMENDRAG', W - MARG, H - 44, { font: F.medium, size: 7, color: GRAA_LYS });
  linje(page, MARG, H - 58, W - MARG, H - 58);

  // Tittel + eiendom + statuschip
  tekst(page, tittel, MARG, H - 98, { font: F.heading, size: 25, color: BLEKK });
  tekst(page, kutt(`${eiendom.address || 'Ukjent adresse'}`, 64), MARG, H - 118, { font: F.body, size: 11, color: GRAA });
  const chipTekst = status.toUpperCase();
  const chipW = F.medium.widthOfTextAtSize(chipTekst, 7.5) + 22;
  boks(page, W - MARG - chipW, H - 92, chipW, 20, 10, { color: statusOk ? GRONN_MYK : RAV_MYK });
  tekst(page, chipTekst, W - MARG - chipW + 11, H - 105, { font: F.medium, size: 7.5, color: statusOk ? GRONN : RAV, tracking: 0.8 });

  // Kort-hjelper: gruppetittel + nøkkel/verdi-rader
  const kort = (x, yTopp, w, gruppetittel, rader) => {
    const synlige = rader.filter(([, v]) => v !== null && v !== undefined && v !== '');
    const h = 44 + synlige.length * 23;
    boks(page, x, yTopp, w, h, 12, { color: FLATE });
    tekst(page, gruppetittel.toUpperCase(), x + 16, yTopp - 22, { font: F.medium, size: 6.8, color: LILLA, tracking: 1.1 });
    let yy = yTopp - 44;
    synlige.forEach(([l, v], i) => {
      tekst(page, l, x + 16, yy, { font: F.body, size: 8.5, color: GRAA });
      hoyre(page, kutt(v, 30), x + w - 16, yy, { font: F.medium, size: 9.5, color: BLEKK });
      if (i < synlige.length - 1) linje(page, x + 16, yy - 7, x + w - 16, yy - 7, { color: KANTF, thickness: 0.5 });
      yy -= 23;
    });
    return h;
  };

  const kolW = (W - MARG * 2 - 14) / 2;
  let yV = H - 150;

  // Venstre kolonne: Parter + Eiendom · Høyre kolonne: Honorar + Tidslinje
  const hParter = kort(MARG, yV, kolW, 'Parter', [
    ['Forvalter', 'DigiHome AS'],
    ['Eier', eier.name || '—'],
    ['Leietaker', leietaker.name || null],
  ]);
  const hHonorar = kort(MARG + kolW + 14, yV, kolW, 'Honorar', [
    ['Modell', honorar],
    honorarKr ? ['Estimert honorar', honorarKr] : null,
    [leieErEstimat ? 'Estimert månedsleie' : 'Månedsleie', leie > 0 ? kr(leie) : '—'],
  ].filter(Boolean));

  const yV2 = yV - Math.max(hParter, hHonorar) - 16;
  kort(MARG, yV2, kolW, 'Eiendom', [
    ['Adresse', kutt(eiendom.address, 30) || '—'],
    ['By', eiendom.city || null],
    ['Areal', eiendom.sqm ? `${eiendom.sqm} m²` : null],
    ['Utleiemodell', eiendom.rental_model === 'hel' ? 'Hel enhet' : eiendom.rental_model === 'rom' ? 'Per rom' : (eiendom.rental_model || null)],
  ]);
  const hTid = kort(MARG + kolW + 14, yV2, kolW, 'Tidslinje', [
    ['Signert', dato(k.signed_at)],
    ['Avtalestart', dato(k.start_date)],
    ['Forventet leiestart', dato(k.expected_rent_start)],
    ['Aktivert', dato(k.activated_at)],
    ['Avtaleslutt', k.end_date ? dato(k.end_date) : 'Løpende'],
  ]);

  // Merknad: systemgenerert sammendrag — originalen tar over automatisk
  const yN = yV2 - hTid - 26 - 40;
  boks(page, MARG, yN + 66, W - MARG * 2, 66, 12, { color: LILLA_MYK });
  tekst(page, 'OM DETTE DOKUMENTET', MARG + 16, yN + 66 - 20, { font: F.medium, size: 6.8, color: LILLA, tracking: 1.1 });
  tekst(page, 'Systemgenerert sammendrag basert på registrerte avtaledata i DigiHome-plattformen.', MARG + 16, yN + 66 - 36, { font: F.body, size: 9, color: BLEKK });
  tekst(page, 'Den signerte originalen vises her automatisk så snart PDF-filen er lagret på plattformen.', MARG + 16, yN + 66 - 50, { font: F.body, size: 9, color: GRAA });

  // Fot
  linje(page, MARG, 46, W - MARG, 46);
  tekst(page, `DigiHome · ${tittel} — sammendrag`, MARG, 34, { font: F.body, size: 7, color: GRAA_LYS });
  hoyre(page, `Generert ${dato(new Date().toISOString())} · Konfidensielt`, W - MARG, 34, { font: F.body, size: 7, color: GRAA_LYS });

  return Buffer.from(await doc.save());
}
