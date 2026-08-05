// ---------------------------------------------------------------------------
// REN LOGIKK for lukket sløyfe — ingen imports, ingen nettverk, ingen database.
//
// Ligger i egen fil av to grunner:
//  1. Den kan enhetstestes for ALLE grener uten å sende én eneste ekte
//     konvertering til Meta eller Google. Da slipper vi å velge mellom
//     testdekning og rene måledata.
//  2. Rekkefølgen på årsakene er et bevisst designvalg, ikke en tilfeldighet.
//     Den må stå ett sted.
// ---------------------------------------------------------------------------

// Syntetiske leads (prober, QA, demo) skal ALDRI sende konverteringer til
// annonseplattformene. Én test som markerer et lead som «vunnet» ville ellers
// legge en falsk Purchase på 26 350 kr inn i Metas optimalisering.
// Reserverte testdomener iht. RFC 2606/6761 + vårt eget probe-domene.
export function isSyntheticLead(lead = {}) {
  if (lead.qa === true || lead.isTest === true) return true;
  const email = String(lead.email || '').toLowerCase();
  if (/@(.+\.)?(test|invalid|example|localhost)$/.test(email)) return true;
  if (/@(example\.(com|org|net)|probe\.test)$/.test(email)) return true;
  if (/^probe-|^qa-/i.test(String(lead.name || ''))) return true;
  return false;
}

/**
 * Hvorfor ble konverteringen IKKE sendt? Returnerer null når alt er i orden.
 *
 * Rekkefølgen er viktig: vi rapporterer den FØRSTE blokkeringen, fra den mest
 * grunnleggende til den mest spesifikke. «mangler_gclid» skal bare oppstå når
 * alt annet er på plass — ellers peker vi på feil tiltak.
 *
 * @param {'meta'|'google'|'ga4'} platform
 */
export function resolveSkipReason(platform, {
  allowAdConversions = true,
  configured = true,
  consentOk = true,
  hasClickId = true,
  synthetic = false,
} = {}) {
  if (synthetic) return 'testlead';
  if (!allowAdConversions) return 'annonsekonverteringer_av';
  if (!configured) return platform === 'ga4' ? 'ga4_api_secret_mangler' : 'ikke_konfigurert';
  if (!consentOk) return 'ingen_markedsforingssamtykke';
  if (platform === 'google' && !hasClickId) return 'mangler_gclid';
  return null;
}

// Menneskelig forklaring — brukes i admin. Årsakene krever ulike tiltak:
// mangler_gclid → klikk-ID-fangst · ingen samtykke → samtykkerate ·
// ikke konfigurert → miljøvariabler.
export const SKIP_REASON_TEXT = {
  testlead: 'testlead — sendes aldri til annonseplattformene',
  annonsekonverteringer_av: 'annonsekonverteringer er slått av',
  ikke_konfigurert: 'integrasjonen mangler oppsett',
  ingen_markedsforingssamtykke: 'brukeren samtykket ikke til markedsføring',
  mangler_gclid: 'ingen Google klikk-ID på leadet',
  ga4_api_secret_mangler: 'GA4 API-hemmelighet mangler',
  mangler_ga4_klient_id: 'ingen GA4-klient-ID på leadet',
};
