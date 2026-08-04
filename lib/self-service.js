// ── SELVBETJENT PROVISJONERING: KONTRAKT MOT PLATTFORMEN ────────────────────
// Bygger payloaden til POST {plattform}/api/bridge/self-service-customer
// (bro-spec «self-service-provisioning», 16.07). Ligger i egen modul fordi den
// avgjør noe med reelle konsekvenser: om kunden blir opprettet som PRIVATPERSON
// eller BEDRIFT hos plattformen. Feil her gir leiekontrakt, depositum og honorar
// på en person i stedet for selskapet som faktisk eier boligen — og en 5 %-avtale
// akseptert av noen som ikke er avtalepart.
//
// Egen modul betyr også at klassifiseringen kan testes uten å opprette en ekte
// kundekonto hos plattformen.

import { normalizeOrgNr } from '@/lib/brreg';

export const SS_UNIT_TYPE = { leilighet: 'Leilighet', enebolig: 'Enebolig', rekkehus: 'Rekkehus', tomannsbolig: 'Tomannsbolig', hybel: 'Hybel', naeringsbygg: 'Næringsbygg', annet: 'Annet' };
export const RENTAL_LABELS = { dynamisk: 'Dynamisk', korttid: 'Korttid', kortid: 'Korttid', langtid: 'Langtid' };

// Er kunden en bedrift? Rekkefølgen er bevisst:
//   1. Det brukeren SELV har erklært i skjemaet veier tyngst.
//   2. Deretter registerdata om hjemmelshaver (Infotorg svarer «organisasjon»,
//      ikke «org» — den gamle likhetssjekken på 'org' klassifiserte derfor
//      foretak som privatpersoner).
//   3. Til slutt: et gyldig org.nr i seg selv er sterkt nok signal.
export function resolveOwnerKind(lead = {}) {
  const declared = String(lead.owner_kind || '').toLowerCase();
  if (/^(business|bedrift|selskap|foretak|org)/.test(declared)) return 'business';
  if (/^(private|privat|person)/.test(declared)) return 'private';
  const registryType = String(lead.registry_owner_type || '').toLowerCase();
  if (/^(org|business|bedrift|foretak|selskap|juridisk)/.test(registryType)) return 'business';
  if (normalizeOrgNr(lead.org_no || lead.registry_orgnr || '').length === 9) return 'business';
  return 'private';
}

export function ownerOrgNo(lead = {}) {
  return normalizeOrgNr(lead.org_no || lead.registry_orgnr || '');
}

export function ownerCompanyName(lead = {}) {
  return String(lead.company_name || lead.registry_owner_name || '').trim();
}

export function buildSelfServicePayload(lead = {}, { ip = '', termsUrl = '' } = {}) {
  const att = lead.attribution || {};
  const bedrooms = parseInt(String(lead.bedrooms || '').replace('+', ''), 10);
  const kind = resolveOwnerKind(lead);
  const orgNo = ownerOrgNo(lead);
  const company = ownerCompanyName(lead);

  return {
    event_id: lead.id,
    contact: {
      // Navnet er alltid MENNESKET som registrerte seg — plattformens
      // velkomst-e-post hilser på en person, ikke på et organisasjonsnummer.
      // Selskapet følger som egne felt.
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      org_no: orgNo,
      type: kind === 'business' ? 'business' : 'private',
      ...(kind === 'business' && company ? { company_name: company } : {}),
      ...(kind === 'business' && lead.company_form ? { company_form: lead.company_form } : {}),
      ...(kind === 'business' && lead.company_verified !== undefined ? { org_verified: !!lead.company_verified } : {}),
    },
    agreement: {
      version: (lead.terms_accepted && lead.terms_accepted.version) || 'selvforvaltning-2025-06',
      accepted_at: (lead.terms_accepted && lead.terms_accepted.at) || lead.createdAt,
      fee_percent: 5,
      pdf_url: termsUrl,
      acceptance_ip: ip || '',
      // Aksepterte personen på egen hånd, eller på vegne av selskapet?
      // Plattformen trenger dette for å vite hvem avtaleparten er.
      ...(kind === 'business' ? { accepted_on_behalf_of: company || orgNo || undefined, signatory: lead.name || undefined } : {}),
    },
    property: {
      address: lead.address || '',
      postal_code: lead.postal_code || '',
      city: lead.city || '',
      matrikkel: lead.matrikkel_number || '',
      unit_type: SS_UNIT_TYPE[(lead.property_type || '').toLowerCase()] || 'Annet',
      area_m2: Number(lead.sqm) > 0 ? Number(lead.sqm) : undefined,
      bedrooms: Number.isFinite(bedrooms) && bedrooms > 0 ? bedrooms : undefined,
      desired_model: RENTAL_LABELS[(lead.rental_model || '').toLowerCase()] || 'Dynamisk',
      track: 'selvforvaltning',
    },
    attribution: {
      source: lead.source || att.source || (lead.is_paid ? 'Betalt' : 'Direkte'),
      campaign: att.campaign || '',
      ad: att.ad || att.content || '',
      landing_page: att.landing_page || '',
    },
  };
}
