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
  } catch (e) {}
  if (granted) captureClickIds();
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
  } catch (e) {}
  if (granted) captureClickIds();
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
  if (!gtag || !GA4_ID) return;
  try {
    gtag('event', 'lead_start', { form_id: formId || 'unknown' });
  } catch (e) {}
}

// Hovedkonvertering: lead sendt inn. Fyrer GA4 generate_lead + Google Ads-konvertering.
export function trackLead({ value = 0, currency = 'NOK', formId, leadId, source } = {}) {
  const gtag = safeGtag();
  if (!gtag || !GA4_ID) return;
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
}
