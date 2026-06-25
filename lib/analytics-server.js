// Server-side analytics engine for DigiHome — førsteparts, cookieless.
// Bot-filtrering, UA-parsing, kanal-attribusjon, geo-fra-tidssone, og
// aggregering for admin-dashbordet. Holdes adskilt fra route.js for ryddighet.

import { v4 as uuidv4 } from 'uuid';
import { neighborhoods } from '@/lib/site';

// --- Bot-filtrering -------------------------------------------------------
const BOT_RE = /bot|crawl|spider|slurp|bing|google|yandex|baidu|duckduck|facebookexternalhit|facebot|ia_archiver|headless|phantom|puppeteer|playwright|lighthouse|gtmetrix|pingdom|uptime|monitor|python-requests|axios\/|node-fetch|curl|wget|httpclient|scrapy|semrush|ahrefs|mj12|dotbot|petalbot|applebot|amazonbot|gptbot|claudebot|perplexity|ccbot/i;

export function isBot(ua) {
  if (!ua) return true; // ingen user-agent = nesten alltid bot/script
  return BOT_RE.test(ua);
}

// --- UA-parsing (lettvekt, ingen ekstern avhengighet) ---------------------
export function parseUA(ua = '') {
  const u = ua.toLowerCase();
  let device = 'desktop';
  if (/ipad|tablet|playbook|silk|kindle/.test(u) || (/android/.test(u) && !/mobile/.test(u))) device = 'nettbrett';
  else if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|bb10/.test(u)) device = 'mobil';

  let browser = 'Annet';
  if (/edg\//.test(u)) browser = 'Edge';
  else if (/samsungbrowser/.test(u)) browser = 'Samsung';
  else if (/opr\/|opera/.test(u)) browser = 'Opera';
  else if (/chrome|crios/.test(u)) browser = 'Chrome';
  else if (/firefox|fxios/.test(u)) browser = 'Firefox';
  else if (/safari/.test(u)) browser = 'Safari';

  let os = 'Annet';
  if (/windows/.test(u)) os = 'Windows';
  else if (/iphone|ipad|ipod|ios/.test(u)) os = 'iOS';
  else if (/mac os x|macintosh/.test(u)) os = 'macOS';
  else if (/android/.test(u)) os = 'Android';
  else if (/linux/.test(u)) os = 'Linux';

  return { device, browser, os };
}

// --- Kanal-attribusjon ----------------------------------------------------
const SEARCH_ENGINES = /google\.|bing\.|yahoo\.|duckduckgo\.|yandex\.|ecosia\.|baidu\.|kvasir\.|startpage\./i;
const SOCIAL = /facebook\.|fb\.|instagram\.|linkedin\.|lnkd\.|t\.co|twitter\.|x\.com|tiktok\.|youtube\.|pinterest\.|reddit\.|snapchat\./i;

export function deriveChannel({ medium = '', source = '', referrer = '' } = {}) {
  const m = (medium || '').toLowerCase();
  const s = (source || '').toLowerCase();
  const r = (referrer || '').toLowerCase();

  if (/cpc|ppc|paid|cpm|display|paidsearch|paid-social/.test(m) || /facebook_ads|google_ads|adwords/.test(s)) return 'Betalt';
  if (/email|e-post|newsletter|nyhetsbrev/.test(m) || /klaviyo|mailchimp|sendgrid/.test(s)) return 'E-post';
  if (/social|sosial/.test(m) || SOCIAL.test(s) || SOCIAL.test(r)) return 'Sosialt';
  if (/organic|organisk/.test(m) || SEARCH_ENGINES.test(s) || SEARCH_ENGINES.test(r)) return 'Organisk';
  if (/referral|henvisning/.test(m)) return 'Henvisning';
  if (s && s !== 'direct' && s !== '(direct)') return 'Henvisning';
  if (r) {
    if (SEARCH_ENGINES.test(r)) return 'Organisk';
    if (SOCIAL.test(r)) return 'Sosialt';
    return 'Henvisning';
  }
  return 'Direkte';
}

// --- Geo fra tidssone (personvernvennlig, ingen IP-oppslag) ---------------
const TZ_COUNTRY = {
  'Europe/Oslo': 'Norge', 'Europe/Stockholm': 'Sverige', 'Europe/Copenhagen': 'Danmark',
  'Europe/Helsinki': 'Finland', 'Atlantic/Reykjavik': 'Island',
  'Europe/London': 'Storbritannia', 'Europe/Berlin': 'Tyskland', 'Europe/Paris': 'Frankrike',
  'Europe/Madrid': 'Spania', 'Europe/Amsterdam': 'Nederland', 'Europe/Brussels': 'Belgia',
  'Europe/Zurich': 'Sveits', 'Europe/Vienna': 'Østerrike', 'Europe/Rome': 'Italia',
  'Europe/Warsaw': 'Polen', 'Europe/Lisbon': 'Portugal', 'Europe/Dublin': 'Irland',
  'America/New_York': 'USA', 'America/Chicago': 'USA', 'America/Los_Angeles': 'USA',
  'America/Denver': 'USA', 'America/Toronto': 'Canada', 'America/Vancouver': 'Canada',
  'Asia/Dubai': 'UAE', 'Asia/Tokyo': 'Japan', 'Asia/Singapore': 'Singapore',
  'Australia/Sydney': 'Australia',
};

export function tzToCountry(tz = '') {
  if (!tz) return 'Ukjent';
  if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
  const region = tz.split('/')[0];
  if (region === 'Europe') return 'Europa (annet)';
  if (region === 'America') return 'Amerika (annet)';
  if (region === 'Asia') return 'Asia (annet)';
  if (region === 'Africa') return 'Afrika';
  if (region === 'Australia' || region === 'Pacific') return 'Oseania';
  return 'Ukjent';
}

// --- Bygg et normalisert hendelses-dokument fra /track-kall ----------------
const ALLOWED_TYPES = new Set([
  'pageview', 'address_search', 'form_start', 'form_step', 'lead_submit', 'cta_click', 'outbound',
]);

export function buildEvent(body, ua) {
  const type = ALLOWED_TYPES.has(body.type) ? body.type : 'pageview';
  const { device, browser, os } = parseUA(ua);
  const referrer = (body.referrer || '').toString().slice(0, 400);
  const source = (body.source || '').toString().slice(0, 120);
  const medium = (body.medium || '').toString().slice(0, 120);
  const channel = deriveChannel({ medium, source, referrer });
  const tz = (body.tz || '').toString().slice(0, 60);
  const now = new Date();

  return {
    id: uuidv4(),
    type,
    ts: now.toISOString(),
    day: now.toISOString().slice(0, 10),
    visitorId: (body.visitorId || '').toString().slice(0, 60),
    sessionId: (body.sessionId || '').toString().slice(0, 60),
    isNew: body.isNew === true,
    path: (body.path || '/').toString().slice(0, 300),
    referrer,
    source: source || (channel === 'Direkte' ? 'direct' : ''),
    medium,
    campaign: (body.campaign || '').toString().slice(0, 160),
    term: (body.term || '').toString().slice(0, 160),
    content: (body.content || '').toString().slice(0, 160),
    channel,
    device, browser, os,
    tz,
    country: tzToCountry(tz),
    screenW: Number(body.screenW) || null,
    meta: typeof body.meta === 'object' && body.meta ? body.meta : {},
  };
}

let _indexed = false;
export async function ensureAnalyticsIndexes(db) {
  if (_indexed) return;
  _indexed = true;
  try {
    await db.collection('events').createIndex({ ts: -1 });
    await db.collection('events').createIndex({ type: 1, ts: -1 });
    await db.collection('events').createIndex({ sessionId: 1 });
  } catch (e) { /* best-effort */ }
}

// --- Hjelpere for aggregering ---------------------------------------------
function topN(map, n, keyName = 'name') {
  return [...map.entries()]
    .map(([k, v]) => ({ [keyName]: k || '(ukjent)', ...v }))
    .sort((a, b) => (b.sessions || b.count || b.views || 0) - (a.sessions || a.count || a.views || 0))
    .slice(0, n);
}

function bump(map, key, field = 'count', n = 1) {
  if (!map.has(key)) map.set(key, {});
  const o = map.get(key);
  o[field] = (o[field] || 0) + n;
}

// --- Hovedaggregering for dashbordet --------------------------------------
export async function computeAnalytics(db, days = 30) {
  const d = Math.max(1, Math.min(Number(days) || 30, 365));
  const to = new Date();
  const from = new Date(to.getTime() - d * 24 * 60 * 60 * 1000);
  const fromIso = from.toISOString();

  // Hent hendelser i perioden (cappet for sikkerhet).
  const events = await db.collection('events')
    .find({ ts: { $gte: fromIso } })
    .project({ _id: 0 })
    .sort({ ts: 1 })
    .limit(200000)
    .toArray();

  // Sessions / visitors
  const sessions = new Set();
  const visitors = new Set();
  const newVisitors = new Set();
  const sessionsWith = { address_search: new Set(), form_start: new Set(), lead_submit: new Set() };
  const dayMap = new Map();        // day -> {pageviews, sessions:Set, leads}
  const pageMap = new Map();       // path -> {views}
  const channelMap = new Map();    // channel -> {sessions:Set, leads}
  const sourceMap = new Map();     // source -> {sessions:Set}
  const deviceMap = new Map();     // device -> {sessions:Set}
  const browserMap = new Map();    // browser -> {sessions:Set}
  const geoMap = new Map();        // country -> {sessions:Set}
  const stepMap = new Map();       // stepLabel -> {sessions:Set, order}
  let pageviews = 0;

  const ensureDay = (day) => {
    if (!dayMap.has(day)) dayMap.set(day, { day, pageviews: 0, _s: new Set(), leads: 0 });
    return dayMap.get(day);
  };
  const setBump = (map, key, sid) => {
    if (!key) key = '(ukjent)';
    if (!map.has(key)) map.set(key, { _s: new Set() });
    if (sid) map.get(key)._s.add(sid);
  };

  for (const e of events) {
    const sid = e.sessionId || e.id;
    sessions.add(sid);
    if (e.visitorId) { visitors.add(e.visitorId); if (e.isNew) newVisitors.add(e.visitorId); }
    const dd = ensureDay(e.day);
    dd._s.add(sid);

    if (e.type === 'pageview') {
      pageviews++;
      dd.pageviews++;
      bump(pageMap, e.path, 'views');
      setBump(channelMap, e.channel, sid);
      setBump(sourceMap, e.source || 'direct', sid);
      setBump(deviceMap, e.device, sid);
      setBump(browserMap, e.browser, sid);
      setBump(geoMap, e.country, sid);
    }
    if (e.type === 'address_search') sessionsWith.address_search.add(sid);
    if (e.type === 'form_start') sessionsWith.form_start.add(sid);
    if (e.type === 'lead_submit') {
      sessionsWith.lead_submit.add(sid);
      dd.leads++;
      // tilskriv lead til kanal for closed-loop
      if (!channelMap.has(e.channel)) channelMap.set(e.channel, { _s: new Set() });
      const c = channelMap.get(e.channel); c.leads = (c.leads || 0) + 1;
    }
    if (e.type === 'form_step') {
      const label = (e.meta && (e.meta.label || e.meta.step)) ? String(e.meta.label || e.meta.step) : 'steg';
      const order = Number(e.meta && e.meta.step) || 0;
      if (!stepMap.has(label)) stepMap.set(label, { _s: new Set(), order });
      stepMap.get(label)._s.add(sid);
    }
  }

  // Bygg timeseries (fyll tomme dager)
  const timeseries = [];
  for (let i = 0; i < d; i++) {
    const day = new Date(from.getTime() + i * 86400000).toISOString().slice(0, 10);
    const e = dayMap.get(day);
    timeseries.push({ day, pageviews: e ? e.pageviews : 0, sessions: e ? e._s.size : 0, leads: e ? e.leads : 0 });
  }

  const sessCount = sessions.size || 0;
  const leadCount = sessionsWith.lead_submit.size || 0;

  const channels = [...channelMap.entries()]
    .map(([k, v]) => ({ channel: k || '(ukjent)', sessions: v._s.size, leads: v.leads || 0 }))
    .sort((a, b) => b.sessions - a.sessions);

  const mapSessions = (m, keyName) => [...m.entries()]
    .map(([k, v]) => ({ [keyName]: k || '(ukjent)', sessions: v._s.size }))
    .sort((a, b) => b.sessions - a.sessions);

  const topPages = [...pageMap.entries()]
    .map(([k, v]) => ({ path: k || '/', views: v.views || 0 }))
    .sort((a, b) => b.views - a.views).slice(0, 12);

  // Trakt
  const funnel = [
    { step: 'Besøk', count: sessCount },
    { step: 'Adressesøk', count: sessionsWith.address_search.size },
    { step: 'Skjema startet', count: sessionsWith.form_start.size },
    { step: 'Lead sendt', count: leadCount },
  ];

  // Skjema-steg (drop-off) — sortert etter order
  const formSteps = [...stepMap.entries()]
    .map(([label, v]) => ({ label, count: v._s.size, order: v.order }))
    .sort((a, b) => a.order - b.order)
    .map((s, i, arr) => ({
      ...s,
      dropoff: i === 0 ? 0 : Math.max(0, arr[i - 1].count - s.count),
      rate: i === 0 ? 100 : (arr[0].count ? Math.round((s.count / arr[0].count) * 100) : 0),
    }));

  return {
    range: { days: d, from: fromIso, to: to.toISOString() },
    totals: {
      sessions: sessCount,
      pageviews,
      visitors: visitors.size,
      newVisitors: newVisitors.size,
      returningVisitors: Math.max(0, visitors.size - newVisitors.size),
      leads: leadCount,
      conversionRate: sessCount ? +(leadCount / sessCount * 100).toFixed(2) : 0,
      pagesPerSession: sessCount ? +(pageviews / sessCount).toFixed(2) : 0,
    },
    timeseries,
    topPages,
    channels,
    sources: mapSessions(sourceMap, 'source').slice(0, 10),
    devices: mapSessions(deviceMap, 'device'),
    browsers: mapSessions(browserMap, 'browser').slice(0, 8),
    geo: mapSessions(geoMap, 'country').slice(0, 10),
    funnel,
    formSteps,
  };
}

// --- Lead Intelligence: kvalitetsscore + aggregering ----------------------
const NEIGHBORHOODS_LC = neighborhoods.map((n) => n.toLowerCase());

export function detectArea(addr) {
  const a = (addr || '').toLowerCase();
  if (!a) return 'Ukjent';
  for (let i = 0; i < NEIGHBORHOODS_LC.length; i++) {
    if (a.includes(NEIGHBORHOODS_LC[i])) return neighborhoods[i];
  }
  if (a.includes('bergen')) return 'Bergen (annet)';
  return 'Annet';
}

export function leadQuality(lead) {
  let s = 0;
  if (lead.email) s += 20;
  if (lead.phone) s += 20;
  if (lead.address) s += 15;
  if (lead.finn_url) s += 15;
  if (lead.property_type) s += 10;
  if (lead.sqm || lead.bedrooms) s += 10;
  if (lead.forwarded) s += 10;
  return Math.min(100, s);
}

function pushCount(map, key) {
  if (!key) key = '(ukjent)';
  map.set(key, (map.get(key) || 0) + 1);
}
function mapToArr(map, keyName) {
  return [...map.entries()]
    .map(([k, v]) => ({ [keyName]: k, count: v }))
    .sort((a, b) => b.count - a.count);
}

export async function computeLeadIntel(db, days = 30) {
  const d = Math.max(1, Math.min(Number(days) || 30, 730));
  const fromIso = new Date(Date.now() - d * 86400000).toISOString();

  const leads = await db.collection('leads')
    .find({ createdAt: { $gte: fromIso } }).project({ _id: 0 }).sort({ createdAt: 1 }).limit(20000).toArray();
  const tenants = await db.collection('tenant_leads')
    .find({ createdAt: { $gte: fromIso } }).project({ _id: 0 }).sort({ createdAt: 1 }).limit(20000).toArray();

  const byStatus = new Map();
  const bySource = new Map();
  const byArea = new Map();
  const byType = new Map();
  const byModel = new Map();
  const dayMap = new Map();
  let forwarded = 0, qualitySum = 0, hot = 0;

  for (const l of leads) {
    const status = l.forwarded ? 'Videresendt' : (l.status === 'new' ? 'Ny' : (l.status || 'Ny'));
    pushCount(byStatus, status);
    const ch = (l.attribution && l.attribution.channel) || l.source || 'nettside';
    pushCount(bySource, ch);
    pushCount(byArea, detectArea(l.address || (l.units && l.units[0] && l.units[0].address)));
    pushCount(byType, l.property_type || 'Ikke oppgitt');
    pushCount(byModel, l.rental_model || 'Ikke oppgitt');
    if (l.forwarded) forwarded++;
    const q = leadQuality(l);
    qualitySum += q;
    if (q >= 70) hot++;
    const day = (l.createdAt || '').slice(0, 10);
    if (day) dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }
  for (const t of tenants) {
    pushCount(byType, 'Leietaker');
    const day = (t.createdAt || '').slice(0, 10);
    if (day) dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }

  const timeseries = [];
  const start = new Date(Date.now() - d * 86400000);
  for (let i = 0; i < d; i++) {
    const day = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
    timeseries.push({ day, leads: dayMap.get(day) || 0 });
  }

  const total = leads.length;
  return {
    range: { days: d, from: fromIso },
    totals: {
      leads: total,
      tenants: tenants.length,
      forwarded,
      forwardRate: total ? +(forwarded / total * 100).toFixed(1) : 0,
      avgQuality: total ? Math.round(qualitySum / total) : 0,
      hotLeads: hot,
      pending: total - forwarded,
    },
    timeseries,
    byStatus: mapToArr(byStatus, 'status'),
    bySource: mapToArr(bySource, 'source'),
    byArea: mapToArr(byArea, 'area').slice(0, 12),
    byType: mapToArr(byType, 'type').slice(0, 10),
    byModel: mapToArr(byModel, 'model'),
  };
}

// --- Komprimer analysedata til kompakt tekst for LLM-kontekst -------------
export function serializeForLLM(traffic, leads) {
  const t = (traffic && traffic.totals) || {};
  const li = (leads && leads.totals) || {};
  const lines = [];
  lines.push(`PERIODE: siste ${(traffic && traffic.range && traffic.range.days) || 30} dager.`);
  lines.push(`TRAFIKK: ${t.sessions || 0} økter, ${t.visitors || 0} besøkende (${t.newVisitors || 0} nye), ${t.pageviews || 0} sidevisninger, ${t.pagesPerSession || 0} sider/økt.`);
  lines.push(`KONVERTERING: ${t.leads || 0} leads fra ${t.sessions || 0} økter = ${t.conversionRate || 0}%.`);
  if (traffic && traffic.channels) lines.push(`KANALER (økter/leads): ${traffic.channels.map((c) => `${c.channel} ${c.sessions}/${c.leads || 0}`).join(', ')}.`);
  if (traffic && traffic.devices) lines.push(`ENHETER: ${traffic.devices.map((d) => `${d.device} ${d.sessions}`).join(', ')}.`);
  if (traffic && traffic.geo) lines.push(`LAND: ${traffic.geo.slice(0, 5).map((g) => `${g.country} ${g.sessions}`).join(', ')}.`);
  if (traffic && traffic.topPages) lines.push(`TOPP SIDER: ${traffic.topPages.slice(0, 6).map((p) => `${p.path} (${p.views})`).join(', ')}.`);
  if (traffic && traffic.funnel) lines.push(`TRAKT: ${traffic.funnel.map((f) => `${f.step} ${f.count}`).join(' → ')}.`);
  if (traffic && traffic.formSteps && traffic.formSteps.length) lines.push(`SKJEMA-STEG (andel som når): ${traffic.formSteps.map((s) => `${s.label} ${s.rate}%`).join(', ')}.`);
  lines.push(`LEADS: ${li.leads || 0} utleier-leads + ${li.tenants || 0} leietakere, snittkvalitet ${li.avgQuality || 0}/100, ${li.hotLeads || 0} varme, ${li.forwardRate || 0}% videresendt, ${li.pending || 0} venter.`);
  if (leads && leads.bySource && leads.bySource.length) lines.push(`LEADS PER KILDE: ${leads.bySource.map((s) => `${s.source} ${s.count}`).join(', ')}.`);
  if (leads && leads.byArea && leads.byArea.length) lines.push(`LEADS PER OMRÅDE: ${leads.byArea.slice(0, 6).map((a) => `${a.area} ${a.count}`).join(', ')}.`);
  return lines.join('\n');
}
