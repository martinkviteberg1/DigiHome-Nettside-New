// Førsteparts, cookieless analyse-klient for DigiHome.
// Bruker localStorage (ikke cookies) → GDPR-vennlig, ingen samtykke-banner nødvendig.
// Sender hendelser til /api/track via sendBeacon (overlever sidenavigasjon).

const VID_KEY = 'dh_vid';
const SID_KEY = 'dh_sid';
const SID_TS_KEY = 'dh_sid_ts';
const SESS_SRC_KEY = 'dh_sess_src';
const ATTR_KEY = 'dh_attr';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min inaktivitet = ny økt

function uid() {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }

function tz() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
}

function parseUTM() {
  const p = new URLSearchParams(window.location.search);
  const g = (k) => (p.get(k) || '').slice(0, 160);
  let source = g('utm_source');
  let medium = g('utm_medium');
  const campaign = g('utm_campaign');
  const term = g('utm_term');
  const content = g('utm_content');
  if (!source && (p.get('gclid') || p.get('gad_source') || p.get('gbraid'))) { source = 'google'; medium = 'cpc'; }
  if (!source && p.get('fbclid')) { source = 'facebook'; medium = 'social'; }
  if (!source && p.get('msclkid')) { source = 'bing'; medium = 'cpc'; }
  return { source, medium, campaign, term, content };
}

let _state = null;

function initState() {
  if (_state) return _state;
  if (typeof window === 'undefined') return null;

  // Besøkende (vedvarende id)
  let vid = lsGet(VID_KEY);
  let isNewVisitor = false;
  if (!vid) { vid = uid(); lsSet(VID_KEY, vid); isNewVisitor = true; }

  // Økt (30 min glidende vindu)
  const now = Date.now();
  let sid = lsGet(SID_KEY);
  const lastTs = parseInt(lsGet(SID_TS_KEY) || '0', 10);
  if (!sid || (now - lastTs) > SESSION_TIMEOUT) {
    sid = uid();
    lsSet(SID_KEY, sid);
    const utm = parseUTM();
    const sessSrc = {
      source: utm.source || '', medium: utm.medium || '',
      campaign: utm.campaign || '', term: utm.term || '', content: utm.content || '',
      referrer: (document.referrer || '').slice(0, 400),
      landing: window.location.pathname,
    };
    lsSet(SESS_SRC_KEY, JSON.stringify(sessSrc));
    if (!lsGet(ATTR_KEY)) lsSet(ATTR_KEY, JSON.stringify({ ...sessSrc, ts: new Date().toISOString() }));
  }
  lsSet(SID_TS_KEY, String(now));

  let sessSrc = {};
  try { sessSrc = JSON.parse(lsGet(SESS_SRC_KEY) || '{}'); } catch (e) {}

  _state = { vid, sid, isNewVisitor, sessSrc };
  return _state;
}

function send(payload) {
  const url = '/api/track';
  let data;
  try { data = JSON.stringify(payload); } catch (e) { return; }
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([data], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch (e) {}
  try {
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true }).catch(() => {});
  } catch (e) {}
}

// Hovedfunksjon: spor en hendelse.
export function track(type, meta = {}) {
  try {
    const st = initState();
    if (!st) return;
    lsSet(SID_TS_KEY, String(Date.now())); // forleng økten
    const src = st.sessSrc || {};
    send({
      type,
      visitorId: st.vid,
      sessionId: st.sid,
      isNew: st.isNewVisitor,
      path: window.location.pathname,
      referrer: src.referrer || '',
      source: src.source || '',
      medium: src.medium || '',
      campaign: src.campaign || '',
      term: src.term || '',
      content: src.content || '',
      tz: tz(),
      screenW: window.innerWidth || null,
      meta: meta || {},
    });
  } catch (e) {}
}

// Hent attribusjon for å feste på et lead (first-touch + økt-kilde) → closed-loop.
export function getLeadAttribution() {
  try {
    const st = initState();
    if (!st) return null;
    let ft = {};
    try { ft = JSON.parse(lsGet(ATTR_KEY) || '{}'); } catch (e) {}
    const src = st.sessSrc || {};
    return {
      source: ft.source || src.source || '',
      medium: ft.medium || src.medium || '',
      campaign: ft.campaign || src.campaign || '',
      term: ft.term || src.term || '',
      content: ft.content || src.content || '',
      referrer: ft.referrer || src.referrer || '',
      landing_page: ft.landing || src.landing || '',
      visitorId: st.vid,
      sessionId: st.sid,
    };
  } catch (e) { return null; }
}
