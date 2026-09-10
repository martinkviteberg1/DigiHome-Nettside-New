// ── LEIEKONTRAKT (offentlig «verdi først»-wizard) ──────────────────────────
// Datamodell, normalisering og validering for den innloggingsløse
// husleiekontrakt-wizarden på digihome.no. Kontrakten GENERERES og SIGNERES i
// appen (Husleieloven-mal + Posten/BankID). Denne modulen eier bare det vi
// samler inn og hvordan vi bygger bro-payloaden til plattformen.
//
// Ligger i egen modul fordi feltvalideringen og lead-/lease_draft-mappingen
// kan testes uten å opprette en ekte konto hos plattformen.

import { normalizeOrgNr } from '@/lib/brreg';

export const BOLIGTYPE = { leilighet: 'Leilighet', enebolig: 'Enebolig', rekkehus: 'Rekkehus', tomannsbolig: 'Tomannsbolig', hybel: 'Hybel', annet: 'Annet' };
export const MOBLERING = { umoblert: 'Umøblert', delvis: 'Delvis møblert', moblert: 'Møblert' };
export const KONTRAKTSTYPE = { tidsubestemt: 'Tidsubestemt (løpende)', tidsbestemt: 'Tidsbestemt' };
export const OPPSIGELSE = { '1': '1 måned', '2': '2 måneder', '3': '3 måneder' };
export const DEPOSITUM_TYPE = { konto: 'Depositumskonto', garanti: 'Depositumsgaranti', ingen: 'Uten depositum' };

const str = (v) => String(v == null ? '' : v).trim();
const bool = (v) => v === true || v === 'true' || v === 1;
// Matrikkel fra Eiendomsregisteret (Infotorg/Kartverket). Kun gyldig når knr/gnr/bnr finnes.
const normMatrikkel = (m) => {
  if (!m || typeof m !== 'object') return null;
  const knr = String(m.kommunenr == null ? '' : m.kommunenr).replace(/\D/g, '');
  const gnr = String(m.gaardsnr == null ? '' : m.gaardsnr).replace(/\D/g, '');
  const bnr = String(m.bruksnr == null ? '' : m.bruksnr).replace(/\D/g, '');
  if (!knr || !gnr || !bnr) return null;
  return { kommunenr: knr, gaardsnr: gnr, bruksnr: bnr };
};
const tall = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : 0; };
const epostOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(e));

// Normaliser rå skjemadata → kanonisk utkast. Alltid trygg (aldri kast).
export function normaliserUtkast(input = {}) {
  const b = input.bolig || {};
  const l = input.leietaker || {};
  const v = input.vilkaar || {};
  const o = input.owner || {};
  return {
    bolig: {
      adresse: str(b.adresse),
      postnr: str(b.postnr).replace(/\D/g, '').slice(0, 4),
      poststed: str(b.poststed),
      type: BOLIGTYPE[b.type] ? str(b.type) : 'leilighet',
      sqm: tall(b.sqm) || null,
      soverom: tall(b.soverom) || null,
      mobilering: MOBLERING[b.mobilering] ? str(b.mobilering) : 'umoblert',
      royk: bool(b.royk),
      dyr: bool(b.dyr),
      // Eiendomsregister-berikelse (Infotorg EDR / Kartverket). Alt valgfritt —
      // wizarden virker fullt ut uten oppslag (manuell adresse).
      matrikkel: normMatrikkel(b.matrikkel),
      seksjonsnr: str(b.seksjonsnr),
      andelsnr: str(b.andelsnr).replace(/\D/g, ''),
      orgnr: str(b.orgnr).replace(/\D/g, ''),
      register_type: str(b.register_type),
      matrikkel_str: str(b.matrikkel_str),
      bruksenhetsnummer: str(b.bruksenhetsnummer),
      hjemmelshaver: str(b.hjemmelshaver),
      hjemmelshaver_type: str(b.hjemmelshaver_type),
    },
    leietaker: {
      kind: l.kind === 'bedrift' ? 'bedrift' : 'privat',
      navn: str(l.navn),
      epost: str(l.epost).toLowerCase(),
      telefon: str(l.telefon),
      org_no: normalizeOrgNr(l.org_no || ''),
      firma: str(l.firma),
      medleietakere: Array.isArray(l.medleietakere)
        ? l.medleietakere.map((m) => ({ navn: str(m && m.navn), epost: str(m && m.epost).toLowerCase() })).filter((m) => m.navn).slice(0, 4)
        : [],
    },
    vilkaar: {
      kontraktstype: v.kontraktstype === 'tidsbestemt' ? 'tidsbestemt' : 'tidsubestemt',
      start: str(v.start),
      slutt: str(v.slutt),
      oppsigelse: OPPSIGELSE[String(v.oppsigelse)] ? String(v.oppsigelse) : '3',
      leie: tall(v.leie) || null,
      forfallsdag: Math.min(28, Math.max(1, tall(v.forfallsdag) || 1)),
      utgifterInkludert: bool(v.utgifterInkludert),
      depositumType: DEPOSITUM_TYPE[v.depositumType] ? str(v.depositumType) : 'konto',
      depositumMnd: Math.min(6, Math.max(0, tall(v.depositumMnd) || 3)),
      saerlige: str(v.saerlige).slice(0, 2000),
    },
    owner: {
      navn: str(o.navn),
      epost: str(o.epost).toLowerCase(),
      telefon: str(o.telefon),
      kind: o.kind === 'bedrift' ? 'bedrift' : 'privat',
      org_no: normalizeOrgNr(o.org_no || ''),
      firma: str(o.firma),
    },
  };
}

// Validering før provisjonering (steg 5). Returnerer feltvise feil.
export function validerForOpprett(u = {}) {
  const feil = {};
  if (!str(u.owner && u.owner.navn)) feil.owner_navn = 'Skriv inn navnet ditt.';
  if (!epostOk(u.owner && u.owner.epost)) feil.owner_epost = 'Skriv inn en gyldig e-postadresse.';
  if (u.owner && u.owner.kind === 'bedrift' && normalizeOrgNr(u.owner.org_no || '').length !== 9) feil.owner_org = 'Oppgi et gyldig organisasjonsnummer (9 siffer).';
  if (!str(u.bolig && u.bolig.adresse)) feil.bolig_adresse = 'Fyll inn boligens adresse.';
  if (!str(u.leietaker && u.leietaker.navn)) feil.leietaker_navn = 'Fyll inn leietakerens navn.';
  if (!(tall(u.vilkaar && u.vilkaar.leie) > 0)) feil.leie = 'Fyll inn månedsleien.';
  return { ok: Object.keys(feil).length === 0, feil };
}

// Bygg et «lead»-objekt som buildSelfServicePayload forstår. Navnet/kontakten er
// alltid UTLEIEREN (mennesket som lager kontrakten) — ikke leietakeren.
export function leadFraUtkast(u = {}, { id, attribution = {} } = {}) {
  const o = u.owner || {};
  const b = u.bolig || {};
  const kind = o.kind === 'bedrift' ? 'business' : 'private';
  return {
    id,
    name: str(o.navn),
    email: str(o.epost).toLowerCase(),
    phone: str(o.telefon),
    owner_kind: kind,
    org_no: normalizeOrgNr(o.org_no || ''),
    company_name: str(o.firma),
    address: str(b.adresse),
    postnr: str(b.postnr),
    city: str(b.poststed),
    property_type: str(b.type) || 'leilighet',
    bedrooms: b.soverom ? String(b.soverom) : '',
    rental_type: 'langtid',
    attribution: attribution || {},
  };
}

// lease_draft: det appen trenger for å forhåndsutfylle kontrakten ved signering.
// Sendes som ekstra felt i self-service-broen. Appen ignorerer det trygt til
// den er utvidet (Fase 2) — kontoopprettelsen virker uansett.
export function buildLeaseDraft(u = {}) {
  const b = u.bolig || {};
  const l = u.leietaker || {};
  const v = u.vilkaar || {};
  return {
    schema: 'digihome.lease_draft.v1',
    property: {
      address: str(b.adresse),
      postal_code: str(b.postnr),
      city: str(b.poststed),
      type: str(b.type) || 'leilighet',
      sqm: b.sqm || null,
      bedrooms: b.soverom || null,
      furnishing: str(b.mobilering) || 'umoblert',
      smoking_allowed: !!b.royk,
      pets_allowed: !!b.dyr,
      // Autoritativ eiendomsidentifikasjon fra Eiendomsregisteret. Appen bruker
      // dette til å forhåndsutfylle matrikkel/seksjon i den signerbare kontrakten.
      registry: b.matrikkel ? {
        source: 'infotorg_edr',
        kommunenr: str(b.matrikkel.kommunenr),
        gaardsnr: str(b.matrikkel.gaardsnr),
        bruksnr: str(b.matrikkel.bruksnr),
        seksjonsnr: str(b.seksjonsnr) || null,
        andelsnr: str(b.andelsnr) || null,
        orgnr: str(b.orgnr) || null,
        matrikkel: str(b.matrikkel_str) || null,
        unit_no: str(b.bruksenhetsnummer) || null,
        building_type: str(b.register_type) || null,
        registered_owner: b.hjemmelshaver ? { name: str(b.hjemmelshaver), type: str(b.hjemmelshaver_type) || 'person' } : null,
      } : null,
    },
    tenant: {
      kind: l.kind === 'bedrift' ? 'business' : 'private',
      name: str(l.navn),
      email: str(l.epost).toLowerCase(),
      phone: str(l.telefon),
      org_no: normalizeOrgNr(l.org_no || '') || null,
      company_name: str(l.firma) || null,
      co_tenants: (l.medleietakere || []).map((m) => ({ name: str(m.navn), email: str(m.epost).toLowerCase() })),
    },
    terms: {
      contract_type: v.kontraktstype === 'tidsbestemt' ? 'fixed_term' : 'open_ended',
      start_date: str(v.start) || null,
      end_date: v.kontraktstype === 'tidsbestemt' ? (str(v.slutt) || null) : null,
      notice_months: Number(v.oppsigelse) || 3,
      monthly_rent: v.leie || null,
      rent_due_day: v.forfallsdag || 1,
      utilities_included: !!v.utgifterInkludert,
      deposit_type: str(v.depositumType) || 'konto',
      deposit_months: v.depositumMnd == null ? 3 : v.depositumMnd,
      special_terms: str(v.saerlige) || '',
    },
  };
}
