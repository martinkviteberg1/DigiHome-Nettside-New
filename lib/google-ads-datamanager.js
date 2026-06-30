// ---------------------------------------------------------------------------
// Google Data Manager API — offline-konvertering (lukket sløyfe).
//
// Den klassiske ConversionUploadService.UploadClickConversions er stengt for
// nye integrasjoner. Google sin nye, påkrevde vei er Data Manager API:
//   POST https://datamanager.googleapis.com/v1/events:ingest
//
// Vi gjenbruker det native OAuth-tokenet (dual-scope: adwords + datamanager).
// loginAccount = MCC (har skrivetilgang), operatingAccount = Ads-kunden,
// productDestinationId = konverteringshandlingens numeriske ID.
// ---------------------------------------------------------------------------

import {
  getAccessToken, defaultCustomerId, loginCustomerId, googleAdsNativeConfigured,
  resolveOfflineConversionAction, conversionActionIdFromResourceName,
} from './google-ads-native';

const DM_BASE = 'https://datamanager.googleapis.com/v1';

export function dataManagerConfigured() {
  // Samme credentials som native (refresh-tokenet har datamanager-scope).
  return googleAdsNativeConfigured();
}

function dmErr(j) {
  try {
    const e = (j && j.error) || {};
    return e.message || (typeof j === 'string' ? j : JSON.stringify(j)).slice(0, 240);
  } catch (_) { return 'Data Manager API-feil'; }
}

// Cacher konverteringshandling-ID (resolves sjelden, men unngå unødige kall).
let _caCache = { id: null, at: 0 };
async function resolveConversionActionId() {
  if (_caCache.id && Date.now() - _caCache.at < 30 * 60 * 1000) return _caCache.id;
  const resolved = await resolveOfflineConversionAction(defaultCustomerId(), { create: false });
  const id = conversionActionIdFromResourceName(resolved.resourceName);
  if (id) _caCache = { id, at: Date.now() };
  return id;
}

// Lav-nivå: send en eller flere events til Data Manager.
export async function ingestEvents(events, { validateOnly = false, conversionActionId } = {}) {
  const token = await getAccessToken();
  const cust = defaultCustomerId();
  const mcc = loginCustomerId() || cust;
  const caId = conversionActionId || (await resolveConversionActionId());
  if (!caId) throw new Error('Fant ingen UPLOAD_CLICKS-konverteringshandling. Kjør «ensure» først.');
  const body = {
    validateOnly: !!validateOnly,
    destinations: [{
      reference: 'ga_offline',
      loginAccount: { accountType: 'GOOGLE_ADS', accountId: mcc },
      operatingAccount: { accountType: 'GOOGLE_ADS', accountId: cust },
      productDestinationId: String(caId),
    }],
    events: events.map((e) => ({ destinationReferences: ['ga_offline'], ...e })),
  };
  const r = await fetch(`${DM_BASE}/events:ingest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dmErr(j));
  return { ok: true, requestId: j.requestId || null, validateOnly: !!validateOnly };
}

// Høy-nivå: registrer én vunnet konvertering (gclid-basert).
export async function ingestOfflineConversion({ gclid, gbraid, wbraid, value, currency, at, transactionId, validateOnly = false } = {}) {
  const ids = [gclid, gbraid, wbraid].filter(Boolean);
  if (ids.length !== 1) throw new Error('Nøyaktig én av gclid/gbraid/wbraid må oppgis');
  const adIdentifiers = {};
  if (gclid) adIdentifiers.gclid = gclid;
  if (gbraid) adIdentifiers.gbraid = gbraid;
  if (wbraid) adIdentifiers.wbraid = wbraid;
  const event = {
    transactionId: transactionId || `dh-${Date.now()}`,
    eventTimestamp: at ? new Date(at).toISOString() : new Date().toISOString(),
    eventSource: 'WEB',
    currency: (currency || 'NOK').toUpperCase(),
    conversionValue: Number(value) > 0 ? Number(value) : (Number(process.env.GOOGLE_ADS_DEFAULT_LEAD_VALUE || '0') || 0),
    adIdentifiers,
  };
  return ingestEvents([event], { validateOnly });
}
