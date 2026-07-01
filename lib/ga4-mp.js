// GA4 Measurement Protocol — server-side «purchase»-event ved lukket sløyfe (won).
// Supplerer Meta CAPI + Google Ads offline-konvertering: gir GA4 en server-side
// konvertering for korrekt trakt/LTV-rapportering (kunde → kontrakt → verdi).
//
// Krever env:
//   NEXT_PUBLIC_GA4_ID   — GA4 Measurement ID (G-XXXXXXX)  [finnes]
//   GA4_API_SECRET       — Measurement Protocol API secret  [MÅ opprettes i GA4]
//     GA4 Admin → Data Streams → (velg stream) → Measurement Protocol API secrets → Create
//
// Uten GA4_API_SECRET er dette en trygg no-op (ingen feil).

const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

export function ga4MpConfigured() {
  return !!(process.env.NEXT_PUBLIC_GA4_ID && process.env.GA4_API_SECRET);
}

/**
 * Sender et GA4 «purchase»-event server-side.
 * @param {object} o
 * @param {string} o.clientId  GA4 client_id (fra _ga-cookien) — foretrukket for stitching
 * @param {string} [o.userId]  valgfri bruker-id
 * @param {number} [o.value]   konverteringsverdi
 * @param {string} [o.currency='NOK']
 * @param {string} [o.transactionId] unik id (lead.id) → dedup i GA4
 * @param {object} [o.params]  ekstra event-parametere
 * @returns {Promise<{ok:boolean, status?:number, error?:string, skipped?:boolean}>}
 */
export async function sendGa4Purchase(o = {}) {
  try {
    if (!ga4MpConfigured()) return { ok: false, skipped: true, error: 'ga4_mp_not_configured' };
    const clientId = (o.clientId || '').toString().trim();
    if (!clientId) return { ok: false, skipped: true, error: 'missing_client_id' };
    const url = `${GA4_ENDPOINT}?measurement_id=${encodeURIComponent(process.env.NEXT_PUBLIC_GA4_ID)}&api_secret=${encodeURIComponent(process.env.GA4_API_SECRET)}`;
    const value = Number(o.value);
    const body = {
      client_id: clientId,
      ...(o.userId ? { user_id: String(o.userId).slice(0, 256) } : {}),
      non_personalized_ads: false,
      events: [{
        name: 'purchase',
        params: {
          currency: (o.currency || 'NOK').toString().slice(0, 3).toUpperCase(),
          ...(isFinite(value) && value > 0 ? { value: Math.round(value * 100) / 100 } : {}),
          transaction_id: (o.transactionId || '').toString().slice(0, 120) || undefined,
          engagement_time_msec: 1,
          ...(o.params || {}),
        },
      }],
    };
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(to));
    // GA4 MP returnerer 204 ved suksess (2xx = OK).
    return { ok: res.status >= 200 && res.status < 300, status: res.status };
  } catch (e) {
    return { ok: false, error: e.message || 'ga4_mp_error' };
  }
}
