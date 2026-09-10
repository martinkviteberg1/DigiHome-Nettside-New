// ─────────────────────────────────────────────────────────────────────────
//  lib/faktura.js — Proforma-faktura for DigiHome Tech AS sin B2B-lisens.
//
//  Bygger et komplett, strukturert fakturaobjekt fra faktureringsgrunnlaget
//  (beregnGrunnlag i lib/pris.js) + selgeropplysninger (innstillinger) + kunden.
//  Objektet driver både den rike on-skjerm-visningen og PDF-en (lib/faktura-pdf).
//
//  Vi tildeler ALDRI et ekte fakturanummer her — det gjør regnskapssystemet
//  (PowerOffice) ved faktisk sending. Forhåndsvisningen er en PROFORMA/UTKAST
//  med en lesbar referanse (prefiks-år-måned) så den kan gjenkjennes.
// ─────────────────────────────────────────────────────────────────────────

const MND = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

export function mndLabel(ym) {
  const [y, m] = String(ym || '').split('-').map(Number);
  if (!y || !m) return String(ym || '');
  return `${MND[(m - 1) % 12]} ${y}`;
}

const isoDato = (d) => new Date(d).toISOString().slice(0, 10);

export function byggFaktura({ settings = {}, plan = null, kunde = {}, grunnlag = {}, maaned = '', spesifiserPerEnhet = false } = {}) {
  const mvaRegistrert = settings.mvaRegistrert !== false;
  const [y, m] = String(maaned).split('-').map(Number);

  // Etterskuddsvis: faktura utstedes «fakturadag» i MÅNEDEN ETTER perioden.
  const fakturadag = Math.min(28, Math.max(1, Number(settings.fakturadag) || 1));
  const fakturaDato = (y && m) ? new Date(Date.UTC(y, m, fakturadag)) : new Date();
  const frist = Math.max(0, Number(settings.betalingsfristDager) || 14);
  const forfallsDato = new Date(fakturaDato.getTime() + frist * 86400000);

  // Enhetsspesifikasjon: alle enheter på tvers av linjer (adresse, leietaker, periode, beløp).
  const spesifikasjon = (grunnlag.linjer || []).flatMap((l) =>
    (l.enheter || []).map((e) => ({ ...e, linjetype: l.type, linjenavn: l.beskrivelse })),
  );

  // Fakturalinjer: sammendrag (standard) eller én linje per enhet (valgfritt).
  let linjer;
  if (spesifiserPerEnhet && spesifikasjon.length) {
    linjer = spesifikasjon.map((e) => ({
      type: e.linjetype,
      beskrivelse: `${e.linjenavn} — ${e.address || e.enhet_id || 'enhet'}`,
      antall: 1,
      vekt: e.vekt ?? 1,
      pris: e.pris ?? 0,
      belop: e.belop ?? Math.round((e.vekt ?? 1) * (e.pris ?? 0)),
      enhet: e,
    }));
  } else {
    linjer = (grunnlag.linjer || []).map((l) => ({ ...l }));
  }

  return {
    status: 'proforma',
    fakturanr: 'UTKAST',
    referanse: `${(settings.fakturaPrefiks || 'DHT')}-${maaned}`,
    fakturaDato: isoDato(fakturaDato),
    forfallsDato: isoDato(forfallsDato),
    betalingsfristDager: frist,
    periode: maaned,
    periodeLabel: mndLabel(maaned),
    levering: settings.levering === 'PdfByEmail' ? 'PdfByEmail' : 'EHF',
    valuta: grunnlag.valuta || settings.valuta || 'NOK',
    mvaRegistrert,
    mvaSats: grunnlag.mvaSats ?? (mvaRegistrert ? (settings.mvaSats ?? 25) : 0),
    selger: {
      navn: settings.selgerNavn || 'DigiHome Tech AS',
      orgnr: settings.selgerOrgnr || '',
      adresse: settings.selgerAdresse || '',
      postnr: settings.selgerPostnr || '',
      sted: settings.selgerSted || '',
      epost: settings.selgerEpost || '',
      telefon: settings.selgerTelefon || '',
      bankkonto: settings.bankkonto || '',
      iban: settings.iban || '',
      mvaRegistrert,
    },
    kjoper: {
      navn: kunde.navn || '',
      orgnr: kunde.orgnr || '',
      epost: kunde.epost || '',
    },
    plan: plan ? { navn: plan.navn, prisModell: plan.prisModell } : null,
    grunnlagType: kunde.enhetskilde === 'manuell' ? 'manuell' : (kunde.grunnlag || 'utleid_mnd'),
    linjer,
    spesifikasjon,
    antallEnheter: grunnlag.antallEnheter || 0,
    sumEksMva: grunnlag.sumEksMva || 0,
    mva: grunnlag.mva || 0,
    sumInkMva: grunnlag.sumInkMva || 0,
    notat: settings.fakturanotat || '',
    produktnavn: settings.produktnavn || 'Plattformlisens',
    spesifisertPerEnhet: !!(spesifiserPerEnhet && spesifikasjon.length),
    generert: new Date().toISOString(),
  };
}
