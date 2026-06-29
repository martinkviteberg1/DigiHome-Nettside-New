// ---------------------------------------------------------------------------
// Meta Conversions API (CAPI) — server-side hendelser (Lead + Purchase).
// Deduplikeres mot nettleser-pixelen via felles event_id.
// Bruker NEXT_PUBLIC_META_PIXEL_ID (dataset) + META_SYSTEM_USER_TOKEN.
// Hasher PII (SHA-256) per Metas krav. Kaster ALDRI — lead-flyten skal aldri feile pga. Meta.
// ---------------------------------------------------------------------------
import crypto from 'crypto';

const VER = process.env.META_API_VERSION || 'v21.0';
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
const TOKEN = process.env.META_SYSTEM_USER_TOKEN || '';
const TEST_CODE = process.env.META_TEST_EVENT_CODE || ''; // valgfri (Events Manager → Test events)

export function metaCapiConfigured() {
  return !!(PIXEL && TOKEN);
}

function sha256(v) {
  if (!v) return undefined;
  return crypto.createHash('sha256').update(String(v)).digest('hex');
}

function normEmail(e) {
  if (!e) return '';
  return String(e).trim().toLowerCase();
}

// Telefon → kun sifre m/ landkode (norsk 8-sifret → 47XXXXXXXX).
function normPhone(p) {
  if (!p) return '';
  let s = String(p).trim();
  if (s.startsWith('00')) s = s.slice(2);
  s = s.replace(/\D/g, '');
  if (s.length === 8) s = '47' + s;
  return s;
}

function normName(n) {
  if (!n) return '';
  return String(n).trim().toLowerCase().replace(/\s+/g, ' ');
}

function firstLast(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { fn: '', ln: '' };
  if (parts.length === 1) return { fn: parts[0], ln: '' };
  return { fn: parts[0], ln: parts[parts.length - 1] };
}

// Bygg _fbc fra fbclid når selve cookien mangler (Meta-format: fb.1.<ts_ms>.<fbclid>).
function fbcFromFbclid(fbclid, tsMs) {
  if (!fbclid) return undefined;
  return `fb.1.${tsMs || Date.now()}.${fbclid}`;
}

// Send én CAPI-hendelse. Returnerer {ok, status, ...}. Kaster aldri.
export async function sendMetaCapiEvent({
  eventName,
  eventId,
  eventTime,                 // ISO-streng, unix-sek eller unix-ms — normaliseres
  actionSource = 'website',
  eventSourceUrl,
  email, phone, fullName,
  fbp, fbc, fbclid,
  clientIp, userAgent,
  value, currency = 'NOK',
  customData = {},
} = {}) {
  try {
    if (!metaCapiConfigured() || !eventName) return { ok: false, error: 'not_configured' };

    // Tidsstempel → unix-sekunder
    let ts = eventTime;
    if (!ts) ts = Math.floor(Date.now() / 1000);
    else if (typeof ts === 'string') ts = Math.floor(new Date(ts).getTime() / 1000);
    else if (ts > 1e12) ts = Math.floor(ts / 1000);
    if (!isFinite(ts) || ts <= 0) ts = Math.floor(Date.now() / 1000);

    const user_data = {};
    const he = sha256(normEmail(email)); if (he) user_data.em = [he];
    const hp = sha256(normPhone(phone)); if (hp) user_data.ph = [hp];
    if (fullName) {
      const { fn, ln } = firstLast(fullName);
      const hf = sha256(normName(fn)); if (hf) user_data.fn = [hf];
      const hl = sha256(normName(ln)); if (hl) user_data.ln = [hl];
    }
    if (fbp) user_data.fbp = fbp;
    const _fbc = fbc || fbcFromFbclid(fbclid, ts * 1000);
    if (_fbc) user_data.fbc = _fbc;
    if (clientIp && clientIp !== 'unknown') user_data.client_ip_address = clientIp;
    if (userAgent) user_data.client_user_agent = userAgent;

    const custom_data = { ...customData };
    if (value != null && isFinite(Number(value)) && Number(value) > 0) {
      custom_data.value = Number(value);
      custom_data.currency = currency;
    }

    const event = {
      event_name: eventName,
      event_time: ts,
      action_source: actionSource,
      user_data,
    };
    if (eventId) event.event_id = String(eventId);
    if (eventSourceUrl) event.event_source_url = eventSourceUrl;
    if (Object.keys(custom_data).length) event.custom_data = custom_data;

    const payload = { data: [event] };
    if (TEST_CODE) payload.test_event_code = TEST_CODE;

    const url = `https://graph.facebook.com/${VER}/${PIXEL}/events?access_token=${encodeURIComponent(TOKEN)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: res.status, error: (j && j.error && j.error.message) || 'capi_error' };
    }
    return { ok: true, status: res.status, events_received: j.events_received, fbtrace_id: j.fbtrace_id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
