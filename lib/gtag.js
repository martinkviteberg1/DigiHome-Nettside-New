'use client';

// ---------------------------------------------------------------------------
// Google Analytics 4 + Google Ads + Consent Mode v2 (klient-side).
// Alt env-styrt via NEXT_PUBLIC_*. No-op når GA4-ID mangler.
// Rå klikk-ID-er (gclid/gbraid/...) lagres KUN etter markedsføringssamtykke (GDPR).
// ---------------------------------------------------------------------------

export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || '';
export const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';
export const ADS_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || '';

const CONSENT_KEY = 'dh_consent';
const CLICK_KEY = 'dh_click';

export function gaEnabled() {
  return !!GA4_ID;
}

function safeGtag() {
  if (typeof window === 'undefined') return null;
  if (typeof window.gtag !== 'function') return null;
  return window.gtag;
}

// ---- Samtykke ------------------------------------------------------------
export function getStoredConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function hasMarketingConsent() {
  const c = getStoredConsent();
  return !!(c && c.choice === 'all');
}

const GRANTED = {
  ad_storage: 'granted',
  analytics_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
};
const DENIED = {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

// Lett samtykke-cookie så SERVER-side (CAPI/offline-konv.) kan respektere valget.
// Verdi: 1 = markedsføring godtatt, 0 = kun nødvendige. Ikke httpOnly (ingen hemmelighet).
function writeConsentCookie(granted) {
  if (typeof document === 'undefined') return;
  try {
    const maxAge = 60 * 60 * 24 * 180; // 180 dager
    document.cookie = `dh_consent_mkt=${granted ? 1 : 0}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch (e) {}
}

// Oppdater Consent Mode + lagre valg. choice = 'all' | 'necessary'.
export function applyConsent(choice) {
  if (typeof window === 'undefined') return;
  const granted = choice === 'all';
  try {
    const gtag = safeGtag();
    if (gtag) {
      gtag('consent', 'update', granted ? GRANTED : DENIED);
      if (granted && GA4_ID) {
        gtag('config', GA4_ID, { send_page_view: true, anonymize_ip: true });
        gtag('event', 'page_view');
      }
    }
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ choice, ts: Date.now() })
    );
    writeConsentCookie(granted);
  } catch (e) {}
  if (granted) {
    captureClickIds();
    // Signal til Meta Pixel (og andre samtykke-gatede tagger) om at de kan lastes.
    try { window.dispatchEvent(new Event('dh-consent-granted')); } catch (e) {}
  }
}

// Re-bruk lagret samtykke ved ny sidelast (kalles fra ConsentBanner ved mount).
export function restoreConsent() {
  if (typeof window === 'undefined') return;
  const c = getStoredConsent();
  if (!c) return;
  const gtag = safeGtag();
  if (!gtag) return;
  const granted = c.choice === 'all';
  try {
    gtag('consent', 'update', granted ? GRANTED : DENIED);
    if (granted && GA4_ID) {
      gtag('config', GA4_ID, { send_page_view: true, anonymize_ip: true });
    }
    writeConsentCookie(granted);
  } catch (e) {}
  if (granted) {
    captureClickIds();
    try { window.dispatchEvent(new Event('dh-consent-granted')); } catch (e) {}
  }
}

// ---- Attribusjon: rå klikk-ID-er (samtykke-gated) ------------------------
export function captureClickIds() {
  if (typeof window === 'undefined') return;
  if (!hasMarketingConsent()) return;
  try {
    const p = new URLSearchParams(window.location.search);
    const pick = (k) => (p.get(k) || '').slice(0, 200) || null;
    const ids = {
      gclid: pick('gclid'),
      gbraid: pick('gbraid'),
      wbraid: pick('wbraid'),
      fbclid: pick('fbclid'),
      msclkid: pick('msclkid'),
    };
    // Behold eksisterende klikk-ID hvis ny landing ikke har noen.
    let prev = {};
    try { prev = JSON.parse(window.localStorage.getItem(CLICK_KEY) || '{}'); } catch (e) {}
    const merged = { ...prev };
    let hasNew = false;
    Object.keys(ids).forEach((k) => { if (ids[k]) { merged[k] = ids[k]; hasNew = true; } });
    if (hasNew || !prev.captured_at) {
      merged.captured_at = new Date().toISOString();
      merged.landing = (window.location.pathname || '').slice(0, 200);
      window.localStorage.setItem(CLICK_KEY, JSON.stringify(merged));
    }
  } catch (e) {}
}

export function getClickIds() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CLICK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

// ---- Enhanced Conversions: normalisering + hex SHA-256 -------------------
// Hasher e-post/telefon klient-side (kun med markedsføringssamtykke) og sender
// som user_data før konverteringen → tetter ITP/adblock-hull, +5–15 % match.
function normalizeEmail(raw) {
  if (!raw) return '';
  return String(raw).trim().toLowerCase();
}

function normalizePhone(raw) {
  if (!raw) return '';
  let p = String(raw).trim().replace(/[^\d+]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (!p.startsWith('+')) {
    if (p.length === 8) p = '+47' + p;                 // norsk nummer uten landkode
    else if (p.startsWith('47') && p.length === 10) p = '+' + p;
    else if (p) p = '+' + p;
  }
  return p;
}

async function sha256Hex(str) {
  if (!str) return '';
  try {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) return '';
    const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return ''; }
}

// ---- Konverteringshendelser ---------------------------------------------
export function trackPageview(path) {
  const gtag = safeGtag();
  if (!gtag || !GA4_ID) return;
  if (!hasMarketingConsent()) return;
  try {
    gtag('event', 'page_view', {
      page_path: path || (typeof window !== 'undefined' ? window.location.pathname : ''),
    });
  } catch (e) {}
}

// Mikro-konvertering: bruker startet et lead-skjema.
export function trackLeadStart(formId) {
  const gtag = safeGtag();
  try {
    if (gtag && GA4_ID) gtag('event', 'lead_start', { form_id: formId || 'unknown' });
  } catch (e) {}
  // Meta: oevre-trakt-signal (InitiateCheckout) → retargeting + budoptimalisering.
  // fbq finnes kun etter markedsfoeringssamtykke (pixelen lastes da).
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'InitiateCheckout', { content_name: formId || 'lead', content_category: 'lead' });
    }
  } catch (e) {}
}

// Sidevisning av innholdsside (Meta ViewContent) → bygger retargeting-publikum.
// fbq finnes kun etter samtykke. content_name beskriver siden/temaet.
export function trackViewContent(contentName, extra = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent', { content_name: contentName || 'side', content_category: 'page', ...extra });
    }
  } catch (e) {}
}

// Hovedkonvertering: lead sendt inn. Fyrer GA4 generate_lead + Google Ads-konvertering.
// Enhanced Conversions: hasher e-post/telefon og setter user_data (samtykke-gated) FØR konverteringen.
export async function trackLead({ value = 0, currency = 'NOK', formId, leadId, source, email, phone } = {}) {
  const gtag = safeGtag();
  if (!gtag || !GA4_ID) return;

  // Enhanced Conversions (PII → kun med markedsføringssamtykke).
  try {
    if (ADS_ID && hasMarketingConsent() && (email || phone)) {
      const [he, hp] = await Promise.all([
        sha256Hex(normalizeEmail(email)),
        sha256Hex(normalizePhone(phone)),
      ]);
      const userData = {};
      if (he) userData.sha256_email_address = he;
      if (hp) userData.sha256_phone_number = hp;
      if (Object.keys(userData).length) gtag('set', 'user_data', userData);
    }
  } catch (e) {}

  try {
    gtag('event', 'generate_lead', {
      value,
      currency,
      form_id: formId || 'unknown',
      lead_id: leadId || undefined,
      lead_source: source || undefined,
    });
    if (ADS_ID && ADS_LABEL) {
      gtag('event', 'conversion', {
        send_to: `${ADS_ID}/${ADS_LABEL}`,
        value,
        currency,
        transaction_id: leadId || undefined,
      });
    }
  } catch (e) {}

  // Meta Pixel: Lead-hendelse. eventID = lead.id → deduplikeres mot CAPI server-side.
  // Fyrer kun hvis pixelen er lastet (krever markedsføringssamtykke).
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      const cd = { content_name: formId || 'lead', content_category: source || 'lead' };
      if (value && Number(value) > 0) { cd.value = Number(value); cd.currency = currency; }
      const opts = leadId ? { eventID: String(leadId) } : undefined;
      window.fbq('track', 'Lead', cd, opts);
    }
  } catch (e) {}
}
