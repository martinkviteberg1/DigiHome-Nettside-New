// Møteprotokoll (MOM) som PDF — formell, arkiverbar protokoll for styremøter
// og andre interne møter. Genereres server-side med jsPDF (standardfonter i
// WinAnsi-koding dekker æøå). Brukes både som e-postvedlegg ved «Send referat»
// og som direkte nedlasting fra møteskuffen.

import { jsPDF } from 'jspdf';

const MARG = 20; // mm
const BREDDE = 210 - MARG * 2; // A4-innholdsbredde
const BUNN = 277; // sidebrytergrense (footer ligger under)

const STATUS_LABEL = { inbox: 'Innboks', doing: 'Pågår', waiting: 'Venter', done: 'Ferdig' };

function fmtDatoTid(iso) {
  if (!iso) return 'Ikke fastsatt';
  try {
    return new Date(iso).toLocaleString('nb-NO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo',
    });
  } catch (e) { return String(iso); }
}

function fmtDato(iso) {
  if (!iso) return '';
  try {
    return new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString('nb-NO', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Oslo',
    });
  } catch (e) { return String(iso); }
}

export function byggMoteProtokoll({ meeting, deltakere = [], aksjoner = [], typeLabel = 'Møte' }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 0;

  const sikrePlass = (h) => {
    if (y + h > BUNN) { doc.addPage(); y = MARG; }
  };

  // Seksjonsoverskrift i DigiHome-lilla med hairline under
  const seksjon = (tittel) => {
    sikrePlass(14);
    y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(139, 92, 246);
    doc.text(tittel.toUpperCase(), MARG, y);
    y += 1.6;
    doc.setDrawColor(235, 233, 230); doc.setLineWidth(0.25);
    doc.line(MARG, y, 210 - MARG, y);
    y += 5;
    doc.setTextColor(30, 30, 30);
  };

  const avsnitt = (tekst, { size = 10, farge = [60, 60, 60], stil = 'normal', innrykk = 0 } = {}) => {
    doc.setFont('helvetica', stil); doc.setFontSize(size);
    doc.setTextColor(farge[0], farge[1], farge[2]);
    const linjer = doc.splitTextToSize(String(tekst || ''), BREDDE - innrykk);
    for (const linje of linjer) {
      sikrePlass(5.2);
      doc.text(linje, MARG + innrykk, y);
      y += 5.2;
    }
  };

  // ── Topplinje: sort bånd med DigiHome-merke ──
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setFillColor(207, 151, 252);
  doc.circle(MARG + 1.5, 11, 1.5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text('DigiHome', MARG + 5.5, 12.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(160, 160, 160);
  doc.text('MØTEPROTOKOLL', 210 - MARG, 12.5, { align: 'right' });
  y = 34;

  // ── Tittel + metadata ──
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(10, 10, 10);
  const tittelLinjer = doc.splitTextToSize(String(meeting.title || 'Møte'), BREDDE);
  for (const l of tittelLinjer) { doc.text(l, MARG, y); y += 7.5; }
  y += 1;

  const meta = (etikett, verdi) => {
    sikrePlass(6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(140, 140, 140);
    doc.text(etikett, MARG, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
    const v = doc.splitTextToSize(String(verdi || '—'), BREDDE - 32);
    doc.text(v, MARG + 32, y);
    y += 5.5 + (v.length - 1) * 4.8;
  };
  meta('Type', typeLabel);
  meta('Tidspunkt', fmtDatoTid(meeting.datetime));
  meta('Status', meeting.status === 'avholdt' ? 'Avholdt' : 'Planlagt');
  meta('Deltakere', deltakere.length
    ? deltakere.map((p) => `${p.name || p.email}${p.tittel ? ` (${p.tittel})` : ''}`).join(', ')
    : 'Ingen registrert');

  // ── Agenda ──
  const agenda = (meeting.agenda || []).filter((p) => p && p.text);
  if (agenda.length) {
    seksjon('Agenda');
    agenda.forEach((p, i) => {
      avsnitt(`${i + 1}.  ${p.text}${p.done ? '   (behandlet)' : ''}`, { innrykk: 2 });
      y += 0.8;
    });
  }

  // ── Referat ──
  if (String(meeting.referat || '').trim()) {
    seksjon('Referat');
    avsnitt(String(meeting.referat).slice(0, 20000));
  }

  // ── Vedtak ──
  const vedtak = (meeting.vedtak || []).filter((v) => v && v.text);
  if (vedtak.length) {
    seksjon('Vedtak');
    vedtak.forEach((v, i) => {
      avsnitt(`${i + 1}.  ${v.text}`, { stil: 'bold', farge: [20, 20, 20], innrykk: 2 });
      y += 0.8;
    });
  }

  // ── Aksjonspunkter m/ ansvarlig, frist og status ──
  if (aksjoner.length) {
    seksjon('Aksjonspunkter');
    aksjoner.forEach((t, i) => {
      avsnitt(`${i + 1}.  ${t.title}`, { stil: 'bold', farge: [20, 20, 20], innrykk: 2 });
      const detaljer = [
        `Ansvarlig: ${t.ansvarligNavn || 'Ikke satt'}`,
        `Frist: ${t.dueDate ? fmtDato(t.dueDate) : 'Ingen'}`,
        `Status: ${STATUS_LABEL[t.status] || 'Innboks'}${t.archived ? ' (arkivert)' : ''}`,
      ].join('    ·    ');
      avsnitt(detaljer, { size: 8.5, farge: [130, 130, 130], innrykk: 6 });
      y += 1.2;
    });
  }

  // ── Signaturfelt (protokollformalia for styremøter) ──
  if (meeting.type === 'styremote') {
    sikrePlass(34);
    y += 10;
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(MARG, y + 12, MARG + 70, y + 12);
    doc.line(210 - MARG - 70, y + 12, 210 - MARG, y + 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(130, 130, 130);
    doc.text('Møteleder', MARG, y + 17);
    doc.text('Referent', 210 - MARG - 70, y + 17);
    y += 22;
  }

  // ── Footer på alle sider ──
  const sider = doc.getNumberOfPages();
  const generert = new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Oslo' });
  for (let s = 1; s <= sider; s++) {
    doc.setPage(s);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(170, 170, 170);
    doc.text(`DigiHome · Møteprotokoll · generert ${generert}`, MARG, 289);
    doc.text(`Side ${s} av ${sider}`, 210 - MARG, 289, { align: 'right' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// Trygt ASCII-filnavn: «Styremøte Q4 2026» → protokoll-styremote-q4-2026.pdf
export function protokollFilnavn(meeting) {
  const slug = String(meeting.title || 'mote')
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'mote';
  const dato = meeting.datetime ? String(meeting.datetime).slice(0, 10) : '';
  return `protokoll-${slug}${dato ? `-${dato}` : ''}.pdf`;
}
