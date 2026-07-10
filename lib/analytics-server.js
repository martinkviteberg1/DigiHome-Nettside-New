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
  'pageview', 'address_search', 'form_start', 'form_step', 'lead_step', 'lead_submit', 'cta_click', 'outbound', 'web_vital',
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

// --- Drop-off-trakt pr. skjema + A/B-eksperimenter ------------------------
// Bryter ned onboarding-flytene (utleier/leietaker) steg-for-steg på øktnivå
// (form_start → form_step* → lead_submit) og aggregerer A/B-varianter festet
// på events (meta.ab). Brukes av admin-fanen «Trakt & A/B».
const FORM_LABELS = { utleier: 'Bli utleier', leietaker: 'Bli leietaker', ukjent: 'Ukjent skjema' };
const EXPERIMENT_LABELS = { onboard_cta: 'Onboarding CTA-tekst' };

export async function computeFunnels(db, days = 30) {
  const d = Math.max(1, Math.min(Number(days) || 30, 365));
  const fromIso = new Date(Date.now() - d * 86400000).toISOString();
  const events = await db.collection('events')
    .find({ type: { $in: ['form_start', 'form_step', 'lead_submit'] }, ts: { $gte: fromIso } })
    .project({ _id: 0, type: 1, sessionId: 1, id: 1, meta: 1, ts: 1 })
    .sort({ ts: 1 })
    .limit(200000)
    .toArray();

  const forms = new Map();      // form -> { starts:Set, submits:Set, steps:Map(stepNum->{label,_s:Set}) }
  const sessionAb = new Map();  // sid -> { exp: variant }

  const getForm = (name) => {
    const key = name || 'ukjent';
    if (!forms.has(key)) forms.set(key, { form: key, starts: new Set(), submits: new Set(), steps: new Map() });
    return forms.get(key);
  };

  for (const e of events) {
    const sid = e.sessionId || e.id;
    const m = e.meta || {};
    if (m.ab && typeof m.ab === 'object') {
      const keys = Object.keys(m.ab);
      if (keys.length && !sessionAb.has(sid)) sessionAb.set(sid, m.ab);
    }
    const fo = getForm(m.form);
    if (e.type === 'form_start') fo.starts.add(sid);
    else if (e.type === 'lead_submit') fo.submits.add(sid);
    else if (e.type === 'form_step') {
      const stepNum = Number(m.step) || 0;
      const label = String(m.label || m.step || 'Steg');
      if (!fo.steps.has(stepNum)) fo.steps.set(stepNum, { step: stepNum, label, _s: new Set() });
      const st = fo.steps.get(stepNum);
      st._s.add(sid);
      if (label && label !== 'Steg') st.label = label; // foretrekk ekte etikett
    }
  }

  // Bygg trakt pr. skjema (start → steg → sendt)
  const formsOut = [...forms.values()].map((fo) => {
    const steps = [...fo.steps.values()].sort((a, b) => a.step - b.step);
    const stepCounts = steps.map((s) => ({ key: `step_${s.step}`, label: s.label, count: s._s.size }));
    const startCount = fo.starts.size;
    const submitCount = fo.submits.size;
    // Base = høyeste tidlige tall → unngår >100 % ved manglende form_start-beacon.
    const base = Math.max(startCount, stepCounts[0] ? stepCounts[0].count : 0, submitCount) || 1;
    const rows = [{ key: 'start', label: 'Skjema åpnet', count: startCount }];
    stepCounts.forEach((s) => rows.push(s));
    rows.push({ key: 'submit', label: 'Lead sendt', count: submitCount });
    let biggest = { label: null, fromLabel: null, dropoff: 0, dropoffRate: 0 };
    const withRates = rows.map((r, i, arr) => {
      const prev = i > 0 ? arr[i - 1].count : r.count;
      const dropoff = i === 0 ? 0 : Math.max(0, prev - r.count);
      const dropoffRate = i === 0 ? 0 : (prev ? Math.round((dropoff / prev) * 100) : 0);
      if (dropoffRate > biggest.dropoffRate) biggest = { label: r.label, fromLabel: arr[i - 1].label, dropoff, dropoffRate };
      return { ...r, rate: base ? Math.round((r.count / base) * 100) : 0, dropoff, dropoffRate };
    });
    return {
      form: fo.form,
      label: FORM_LABELS[fo.form] || fo.form,
      starts: startCount,
      submits: submitCount,
      conversionRate: startCount ? +(submitCount / startCount * 100).toFixed(1) : 0,
      steps: withRates,
      biggestDropoff: biggest.label ? biggest : null,
    };
  }).filter((f) => (f.starts > 0 || f.submits > 0) && !(f.form === 'ukjent' && f.starts === 0)).sort((a, b) => b.starts - a.starts);

  // A/B-aggregering (øktnivå, på tvers av skjemaer)
  const exps = new Map(); // exp -> Map(variant -> {starts:Set, submits:Set})
  for (const e of events) {
    const sid = e.sessionId || e.id;
    const ab = sessionAb.get(sid);
    if (!ab) continue;
    for (const [exp, variant] of Object.entries(ab)) {
      if (!variant) continue;
      if (!exps.has(exp)) exps.set(exp, new Map());
      const vmap = exps.get(exp);
      const vkey = String(variant);
      if (!vmap.has(vkey)) vmap.set(vkey, { variant: vkey, starts: new Set(), submits: new Set() });
      const vo = vmap.get(vkey);
      if (e.type === 'form_start') vo.starts.add(sid);
      else if (e.type === 'lead_submit') vo.submits.add(sid);
    }
  }

  const experiments = [...exps.entries()].map(([exp, vmap]) => {
    const variants = [...vmap.values()].map((v) => {
      const starts = v.starts.size;
      const submits = v.submits.size;
      return { variant: v.variant, starts, submits, conversionRate: starts ? +(submits / starts * 100).toFixed(1) : 0, lift: null };
    }).sort((a, b) => a.variant.localeCompare(b.variant));
    const control = variants[0];
    let best = null;
    variants.forEach((v) => {
      v.lift = (control && control.conversionRate > 0) ? +(((v.conversionRate - control.conversionRate) / control.conversionRate) * 100).toFixed(1) : null;
      if (!best || v.conversionRate > best.conversionRate || (v.conversionRate === best.conversionRate && v.starts > best.starts)) best = v;
    });
    const totalStarts = variants.reduce((a, v) => a + v.starts, 0);
    const enoughData = variants.length > 1 && variants.every((v) => v.starts >= 30);
    return {
      experiment: exp,
      label: EXPERIMENT_LABELS[exp] || exp,
      variants,
      controlVariant: control ? control.variant : null,
      winner: (best && best.starts > 0) ? best.variant : null,
      totalStarts,
      enoughData,
    };
  }).sort((a, b) => b.totalStarts - a.totalStarts);

  return { range: { days: d, from: fromIso }, forms: formsOut, experiments };
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
    .find({ createdAt: { $gte: fromIso }, deleted: { $ne: true } }).project({ _id: 0 }).sort({ createdAt: 1 }).limit(20000).toArray();
  const tenants = await db.collection('tenant_leads')
    .find({ createdAt: { $gte: fromIso }, deleted: { $ne: true } }).project({ _id: 0 }).sort({ createdAt: 1 }).limit(20000).toArray();

  const byStatus = new Map();
  const bySource = new Map();
  const byArea = new Map();
  const byType = new Map();
  const byModel = new Map();
  const byPipe = new Map();
  const dayMap = new Map();
  let forwarded = 0, qualitySum = 0, hot = 0;
  let respSum = 0, respCount = 0, slaHit = 0, won = 0, lost = 0;

  const PIPE_LABEL = { new: 'Ny', contacted: 'Kontaktet', qualified: 'Kvalifisert', won: 'Vunnet', lost: 'Tapt' };

  for (const l of leads) {
    const status = l.forwarded ? 'Videresendt' : (l.status === 'new' ? 'Ny' : (l.status || 'Ny'));
    pushCount(byStatus, status);
    // Pipeline-stadie (uavhengig av auto-videresending til CRM)
    const stage = PIPE_LABEL[l.status] || 'Ny';
    pushCount(byPipe, stage);
    if (l.status === 'won') won++;
    if (l.status === 'lost') lost++;
    const ch = (l.attribution && l.attribution.channel) || l.source || 'nettside';
    pushCount(bySource, ch);
    pushCount(byArea, detectArea(l.address || (l.units && l.units[0] && l.units[0].address)));
    pushCount(byType, l.property_type || 'Ikke oppgitt');
    pushCount(byModel, l.rental_model || 'Ikke oppgitt');
    if (l.forwarded) forwarded++;
    const q = leadQuality(l);
    qualitySum += q;
    if (q >= 70) hot++;
    // Responstid: første menneskelige oppfølging (statusendring) eller auto-videresending
    const respAt = l.firstResponseAt || l.forwarded_at || null;
    if (respAt && l.createdAt) {
      const hrs = (new Date(respAt).getTime() - new Date(l.createdAt).getTime()) / 3600000;
      if (hrs >= 0 && hrs < 24 * 90) { respSum += hrs; respCount++; if (hrs <= 24) slaHit++; }
    }
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
  const PIPE_ORDER = ['Ny', 'Kontaktet', 'Kvalifisert', 'Vunnet', 'Tapt'];
  const pipeline = PIPE_ORDER.map((stage) => ({ stage, count: byPipe.get(stage) || 0 }));
  const decided = won + lost;
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
      won,
      lost,
      winRate: decided ? +(won / decided * 100).toFixed(1) : 0,
      avgResponseHours: respCount ? +(respSum / respCount).toFixed(1) : null,
      slaPct: respCount ? +(slaHit / respCount * 100).toFixed(0) : null,
    },
    timeseries,
    pipeline,
    byStatus: mapToArr(byStatus, 'status'),
    bySource: mapToArr(bySource, 'source'),
    byArea: mapToArr(byArea, 'area').slice(0, 12),
    byType: mapToArr(byType, 'type').slice(0, 10),
    byModel: mapToArr(byModel, 'model'),
  };
}

// --- Ytelse per landingsside (/lp/{slug}) ---------------------------------
// pages: [{ slug, source, path, audience }]  (audience: 'huseier' | 'leietaker')
// Kombinerer trafikk (pageview-hendelser på /lp/*) med leads (source = lp-{slug}).
export async function computeLandingPages(db, days = 30, pages = []) {
  const d = Math.max(1, Math.min(Number(days) || 30, 365));
  const fromIso = new Date(Date.now() - d * 86400000).toISOString();
  const norm = (p) => (p || '').toString().split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  const byPath = new Map();
  const bySource = new Map();
  for (const pg of pages) { byPath.set(norm(pg.path), pg.slug); bySource.set(pg.source, pg.slug); }

  const sessById = new Map(); // slug -> Set(sid)
  const pvById = new Map();   // slug -> pageviews
  const ensure = (m, k, init) => { if (!m.has(k)) m.set(k, init()); return m.get(k); };

  // Match sidevisninger mot ALLE katalog-stier (LP-er, kampanjesider, hovedsider)
  const pathPrefixes = [...new Set(pages.map((p) => norm(p.path)))].filter(Boolean);
  const pathRegex = '^(' + pathPrefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')([/?#]|$)';
  const events = await db.collection('events')
    .find({ ts: { $gte: fromIso }, type: 'pageview', path: { $regex: pathRegex } })
    .project({ _id: 0, path: 1, sessionId: 1, id: 1 })
    .limit(200000)
    .toArray();
  for (const e of events) {
    const slug = byPath.get(norm(e.path));
    if (!slug) continue;
    const sid = e.sessionId || e.id;
    ensure(sessById, slug, () => new Set()).add(sid);
    pvById.set(slug, (pvById.get(slug) || 0) + 1);
  }

  // Skjematrakt: 2-stegs LP-skjemaer (lead_step) + hovedskjemaene
  // (form_start/form_step/lead_submit). Unike sesjoner per steg.
  const funnelById = new Map(); // slug -> { start:Set, step2:Set, submit:Set }
  const stepEvents = await db.collection('events')
    .find({ ts: { $gte: fromIso }, type: { $in: ['lead_step', 'form_start', 'form_step', 'lead_submit'] } })
    .project({ _id: 0, path: 1, sessionId: 1, id: 1, meta: 1, type: 1 })
    .limit(200000)
    .toArray();
  for (const e of stepEvents) {
    const form = e.meta && e.meta.form;
    const slug = (form && bySource.get(form)) || byPath.get(norm(e.path));
    if (!slug) continue;
    let step = null;
    if (e.type === 'lead_step') step = e.meta && e.meta.step;
    else if (e.type === 'form_start') step = 'start';
    else if (e.type === 'lead_submit') step = 'submit';
    else if (e.type === 'form_step') step = Number(e.meta && e.meta.step) >= 2 ? 'step2' : 'start';
    if (!['start', 'step2', 'submit'].includes(step)) continue;
    const f = ensure(funnelById, slug, () => ({ start: new Set(), step2: new Set(), submit: new Set() }));
    f[step].add(e.sessionId || e.id);
  }

  const huseierSources = pages.filter((p) => p.audience !== 'leietaker').map((p) => p.source);
  const tenantSources = pages.filter((p) => p.audience === 'leietaker').map((p) => p.source);
  const leadAgg = new Map(); // slug -> { leads, won, wonValue, paid }
  const bumpLead = (slug, l) => {
    const a = ensure(leadAgg, slug, () => ({ leads: 0, won: 0, wonValue: 0, paid: 0 }));
    a.leads++;
    if (l.status === 'won') { a.won++; a.wonValue += Number(l.wonValue) || 0; }
    const ch = (l.attribution && l.attribution.channel) || '';
    if (l.is_paid === true || /paid|cpc|ads|betalt/i.test(ch)) a.paid++;
  };
  if (huseierSources.length) {
    const rows = await db.collection('leads')
      .find({ createdAt: { $gte: fromIso }, source: { $in: huseierSources }, deleted: { $ne: true } })
      .project({ _id: 0, source: 1, status: 1, wonValue: 1, is_paid: 1, attribution: 1 })
      .limit(50000).toArray();
    for (const l of rows) { const slug = bySource.get(l.source); if (slug) bumpLead(slug, l); }
  }
  if (tenantSources.length) {
    const rows = await db.collection('tenant_leads')
      .find({ createdAt: { $gte: fromIso }, source: { $in: tenantSources }, deleted: { $ne: true } })
      .project({ _id: 0, source: 1, status: 1, wonValue: 1, is_paid: 1, attribution: 1 })
      .limit(50000).toArray();
    for (const l of rows) { const slug = bySource.get(l.source); if (slug) bumpLead(slug, l); }
  }

  const out = pages.map((pg) => {
    const sessions = (sessById.get(pg.slug) || new Set()).size;
    const pageviews = pvById.get(pg.slug) || 0;
    const la = leadAgg.get(pg.slug) || { leads: 0, won: 0, wonValue: 0, paid: 0 };
    const fu = funnelById.get(pg.slug);
    const formStart = fu ? fu.start.size : 0;
    const formStep2 = fu ? fu.step2.size : 0;
    const formSubmit = fu ? fu.submit.size : 0;
    return {
      slug: pg.slug, source: pg.source, path: pg.path, audience: pg.audience || 'huseier',
      sessions, pageviews,
      leads: la.leads, won: la.won, wonValue: Math.round(la.wonValue), paidLeads: la.paid,
      paidShare: la.leads ? +(la.paid / la.leads * 100).toFixed(0) : 0,
      conversionRate: sessions ? +(la.leads / sessions * 100).toFixed(1) : 0,
      form: {
        start: formStart, step2: formStep2, submit: formSubmit,
        step2Rate: formStart ? +((formStep2 / formStart) * 100).toFixed(0) : 0,
        submitRate: formStart ? +((formSubmit / formStart) * 100).toFixed(0) : 0,
      },
    };
  });
  out.sort((a, b) => (b.leads - a.leads) || (b.sessions - a.sessions));

  const totals = out.reduce((acc, p) => ({
    sessions: acc.sessions + p.sessions, pageviews: acc.pageviews + p.pageviews,
    leads: acc.leads + p.leads, won: acc.won + p.won, wonValue: acc.wonValue + p.wonValue,
    formStart: acc.formStart + p.form.start, formStep2: acc.formStep2 + p.form.step2, formSubmit: acc.formSubmit + p.form.submit,
  }), { sessions: 0, pageviews: 0, leads: 0, won: 0, wonValue: 0, formStart: 0, formStep2: 0, formSubmit: 0 });
  totals.formStep2Rate = totals.formStart ? +((totals.formStep2 / totals.formStart) * 100).toFixed(0) : 0;
  totals.formSubmitRate = totals.formStart ? +((totals.formSubmit / totals.formStart) * 100).toFixed(0) : 0;
  totals.conversionRate = totals.sessions ? +(totals.leads / totals.sessions * 100).toFixed(1) : 0;

  return { range: { days: d, from: fromIso }, pages: out, totals };
}


// --- Komprimer analysedata til kompakt tekst for LLM-kontekst -------------
export function serializeForLLM(traffic, leads, extra = {}) {
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
  lines.push(`PIPELINE: vunnet ${li.won || 0}, tapt ${li.lost || 0}, vinnrate ${li.winRate || 0}%.`);
  if (li.avgResponseHours != null) lines.push(`RESPONSTID: snitt ${li.avgResponseHours} t, ${li.slaPct || 0}% innen 24t (SLA).`);
  if (leads && leads.bySource && leads.bySource.length) lines.push(`LEADS PER KILDE: ${leads.bySource.map((s) => `${s.source} ${s.count}`).join(', ')}.`);
  if (leads && leads.byArea && leads.byArea.length) lines.push(`LEADS PER OMRÅDE: ${leads.byArea.slice(0, 6).map((a) => `${a.area} ${a.count}`).join(', ')}.`);
  const wv = extra.webVitals;
  if (wv && wv.metrics && wv.metrics.length) lines.push(`YTELSE (Core Web Vitals p75): ${wv.metrics.map((m) => `${m.name} ${m.p75}${m.unit} (${m.rating})`).join(', ')}.`);
  const an = extra.anomalies;
  if (an && an.length) lines.push(`AVVIK OPPDAGET: ${an.map((a) => `${a.metric} ${a.direction === 'up' ? 'opp' : 'ned'} ${a.day} (${a.value} vs forventet ~${a.expected})`).join('; ')}.`);
  return lines.join('\n');
}

// === Core Web Vitals: aggreger p75 per metrikk (ekte brukerdata) ===========
const WV_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000, unit: 'ms' },
  INP: { good: 200, poor: 500, unit: 'ms' },
  CLS: { good: 0.1, poor: 0.25, unit: '' },
  FCP: { good: 1800, poor: 3000, unit: 'ms' },
  TTFB: { good: 800, poor: 1800, unit: 'ms' },
};
function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}
function rate(name, v) {
  const th = WV_THRESHOLDS[name];
  if (!th || v == null) return 'ukjent';
  if (v <= th.good) return 'god';
  if (v <= th.poor) return 'middels';
  return 'dårlig';
}

export async function computeWebVitals(db, days = 30) {
  const d = Math.max(1, Math.min(Number(days) || 30, 365));
  const fromIso = new Date(Date.now() - d * 86400000).toISOString();
  const events = await db.collection('events')
    .find({ type: 'web_vital', ts: { $gte: fromIso } })
    .project({ _id: 0, meta: 1, device: 1 })
    .limit(100000).toArray();

  const byName = {}; // name -> {all:[], mobil:[], desktop:[]}
  for (const e of events) {
    const name = e.meta && e.meta.name;
    const val = e.meta && Number(e.meta.value);
    if (!name || !WV_THRESHOLDS[name] || !isFinite(val)) continue;
    if (!byName[name]) byName[name] = { all: [], mobil: [], desktop: [] };
    byName[name].all.push(val);
    if (e.device === 'mobil') byName[name].mobil.push(val);
    else if (e.device === 'desktop') byName[name].desktop.push(val);
  }

  const order = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'];
  const metrics = order.filter((n) => byName[n]).map((name) => {
    const th = WV_THRESHOLDS[name];
    const arr = byName[name].all.slice().sort((a, b) => a - b);
    const mob = byName[name].mobil.slice().sort((a, b) => a - b);
    const desk = byName[name].desktop.slice().sort((a, b) => a - b);
    const round = (v) => (v == null ? null : (name === 'CLS' ? +v.toFixed(3) : Math.round(v)));
    const p75 = round(percentile(arr, 75));
    return {
      name, unit: th.unit, p75, rating: rate(name, p75), samples: arr.length,
      p75Mobile: round(percentile(mob, 75)), p75Desktop: round(percentile(desk, 75)),
      good: th.good, poor: th.poor,
    };
  });
  return { metrics, totalSamples: events.length };
}

// === Anomali-deteksjon: rullende z-score på en tidsserie ====================
export function detectAnomalies(timeseries, key, metricLabel, { window = 14, z = 2, minHistory = 7 } = {}) {
  const series = (timeseries || []).map((p) => ({ day: p.day, value: Number(p[key]) || 0 }));
  const out = [];
  for (let i = minHistory; i < series.length; i++) {
    const hist = series.slice(Math.max(0, i - window), i).map((x) => x.value);
    if (hist.length < minHistory) continue;
    const mean = hist.reduce((a, b) => a + b, 0) / hist.length;
    const variance = hist.reduce((a, b) => a + (b - mean) ** 2, 0) / hist.length;
    const std = Math.sqrt(variance);
    const cur = series[i].value;
    if (std < 0.5) continue; // for lite variasjon → hopp over
    const score = (cur - mean) / std;
    if (Math.abs(score) >= z) {
      out.push({
        metric: metricLabel, key, day: series[i].day, value: Math.round(cur),
        expected: Math.round(mean), z: +score.toFixed(1),
        direction: score > 0 ? 'up' : 'down',
        severity: Math.abs(score) >= 3 ? 'høy' : 'moderat',
      });
    }
  }
  // returner de nyeste først
  return out.sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 8);
}

// === Live: aktive økter akkurat nå ==========================================
export async function computeLive(db) {
  const now = Date.now();
  const fiveMinIso = new Date(now - 5 * 60 * 1000).toISOString();
  const thirtyMinIso = new Date(now - 30 * 60 * 1000).toISOString();
  const events = await db.collection('events')
    .find({ ts: { $gte: thirtyMinIso } })
    .project({ _id: 0, ts: 1, type: 1, path: 1, sessionId: 1, channel: 1, device: 1, country: 1 })
    .sort({ ts: -1 }).limit(5000).toArray();

  const active = new Set();
  const last30 = new Set();
  const pageMap = new Map();
  const feed = [];
  const TYPE_LABEL = {
    pageview: 'så på side', address_search: 'søkte adresse', form_start: 'startet skjema',
    form_step: 'fylte skjema', lead_submit: 'sendte lead', cta_click: 'klikket CTA', outbound: 'gikk ut', web_vital: '',
  };
  for (const e of events) {
    last30.add(e.sessionId);
    const recent = e.ts >= fiveMinIso;
    if (recent) {
      active.add(e.sessionId);
      if (e.type === 'pageview') pushCount(pageMap, e.path);
    }
    if (e.type !== 'web_vital' && feed.length < 25) {
      feed.push({ ts: e.ts, action: TYPE_LABEL[e.type] || e.type, path: e.path, channel: e.channel, device: e.device, country: e.country });
    }
  }
  return {
    activeNow: active.size,
    sessions30m: last30.size,
    topPages: [...pageMap.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    feed: feed.slice(0, 20),
    ts: new Date().toISOString(),
  };
}

// === Annonse-økonomi: join importert Google Ads-kostnad mot leads/vunnet =====
// Kobler kostnad (per kampanje) til vår closed-loop-data → CPL/CPA/ROAS.
export async function computeAdsEconomics(db, imp) {
  const toIso = imp.periodTo || new Date().toISOString();
  const fromIso = imp.periodFrom || new Date(Date.now() - 30 * 86400000).toISOString();

  const paidLeads = await db.collection('leads')
    .find({ createdAt: { $gte: fromIso, $lte: toIso }, 'attribution.channel': 'Betalt', deleted: { $ne: true } })
    .project({ _id: 0, status: 1, wonValue: 1, attribution: 1, createdAt: 1 })
    .limit(50000).toArray();

  const wonOf = (l) => l.status === 'won';
  const leadCount = paidLeads.length;
  const wonLeads = paidLeads.filter(wonOf);
  const wonCount = wonLeads.length;
  const wonValue = wonLeads.reduce((a, l) => a + (Number(l.wonValue) || 0), 0);

  // Per-kampanje lead-aggregering (join-nøkkel = attribution.campaign).
  const byCampaign = new Map();
  for (const l of paidLeads) {
    const key = String((l.attribution && l.attribution.campaign) || '').trim().toLowerCase();
    if (!byCampaign.has(key)) byCampaign.set(key, { leads: 0, won: 0, value: 0 });
    const o = byCampaign.get(key);
    o.leads++;
    if (wonOf(l)) { o.won++; o.value += Number(l.wonValue) || 0; }
  }

  const round2 = (n) => Math.round((n || 0) * 100) / 100;
  const campaigns = (imp.campaigns || []).map((c) => {
    const key = String(c.name || '').trim().toLowerCase();
    const m = byCampaign.get(key) || { leads: 0, won: 0, value: 0 };
    return {
      name: c.name,
      cost: round2(c.cost), clicks: c.clicks || 0, impressions: c.impressions || 0,
      googleConversions: round2(c.conversions),
      cpc: c.clicks ? round2(c.cost / c.clicks) : null,
      ctr: c.impressions ? round2((c.clicks / c.impressions) * 100) : null,
      leads: m.leads, cpl: m.leads ? round2(c.cost / m.leads) : null,
      won: m.won, wonValue: round2(m.value),
      cpa: m.won ? round2(c.cost / m.won) : null,
      roas: c.cost ? round2(m.value / c.cost) : null,
      matched: m.leads > 0,
    };
  }).sort((a, b) => b.cost - a.cost);

  const t = imp.totals || { cost: 0, clicks: 0, impressions: 0, conversions: 0 };
  return {
    importId: imp.id,
    label: imp.label || null,
    importedAt: imp.importedAt,
    currency: imp.currency || 'NOK',
    period: { from: fromIso, to: toIso },
    totals: {
      cost: round2(t.cost), clicks: t.clicks || 0, impressions: t.impressions || 0,
      googleConversions: round2(t.conversions),
      avgCpc: t.clicks ? round2(t.cost / t.clicks) : null,
      ctr: t.impressions ? round2((t.clicks / t.impressions) * 100) : null,
      leads: leadCount, cpl: leadCount ? round2(t.cost / leadCount) : null,
      won: wonCount, wonValue: round2(wonValue),
      cpa: wonCount ? round2(t.cost / wonCount) : null,
      roas: t.cost ? round2(wonValue / t.cost) : null,
      profit: round2(wonValue - t.cost),
    },
    campaigns,
  };
}


// --- Meta (Facebook/Instagram) annonse-økonomi: join forbruk mot Meta-tilskrevne leads ---
const META_SRC_RE = /facebook|instagram|meta|fbads|paid-social|paid_social/i;
function isMetaLead(l) {
  const a = l.attribution || {};
  if (a.fbclid || a.fbc) return true;
  const s = String(a.source || '').toLowerCase().trim();
  if (s === 'fb' || s === 'ig') return true;
  return META_SRC_RE.test(s);
}

// snap: { periodFrom, periodTo, currency, campaigns:[{name,cost,clicks,impressions,cpc,ctr}], totals:{cost,clicks,impressions}, importedAt, accountStatus, label }
export async function computeMetaEconomics(db, snap) {
  const round2 = (n) => Math.round((n || 0) * 100) / 100;
  const toIso = snap.periodTo || new Date().toISOString();
  const fromIso = snap.periodFrom || new Date(Date.now() - 30 * 86400000).toISOString();

  const allLeads = await db.collection('leads')
    .find({ createdAt: { $gte: fromIso, $lte: toIso }, deleted: { $ne: true } })
    .project({ _id: 0, status: 1, wonValue: 1, attribution: 1, createdAt: 1 })
    .limit(50000).toArray();
  const metaLeads = allLeads.filter(isMetaLead);

  const wonOf = (l) => l.status === 'won';
  const leadCount = metaLeads.length;
  const wonLeads = metaLeads.filter(wonOf);
  const wonCount = wonLeads.length;
  const wonValue = wonLeads.reduce((a, l) => a + (Number(l.wonValue) || 0), 0);

  const byCampaign = new Map();
  for (const l of metaLeads) {
    const key = String((l.attribution && l.attribution.campaign) || '').trim().toLowerCase();
    if (!byCampaign.has(key)) byCampaign.set(key, { leads: 0, won: 0, value: 0 });
    const o = byCampaign.get(key);
    o.leads++;
    if (wonOf(l)) { o.won++; o.value += Number(l.wonValue) || 0; }
  }

  const campaigns = (snap.campaigns || []).map((c) => {
    const key = String(c.name || '').trim().toLowerCase();
    const m = byCampaign.get(key) || { leads: 0, won: 0, value: 0 };
    return {
      name: c.name,
      cost: round2(c.cost), clicks: c.clicks || 0, impressions: c.impressions || 0,
      cpc: c.cpc != null ? round2(c.cpc) : (c.clicks ? round2(c.cost / c.clicks) : null),
      ctr: c.ctr != null ? round2(c.ctr) : (c.impressions ? round2((c.clicks / c.impressions) * 100) : null),
      leads: m.leads, cpl: m.leads ? round2(c.cost / m.leads) : null,
      won: m.won, wonValue: round2(m.value),
      cpa: m.won ? round2(c.cost / m.won) : null,
      roas: c.cost ? round2(m.value / c.cost) : null,
      matched: m.leads > 0,
    };
  }).sort((a, b) => b.cost - a.cost);

  const t = snap.totals || { cost: 0, clicks: 0, impressions: 0 };
  return {
    source: 'meta',
    label: snap.label || 'Meta',
    syncedAt: snap.importedAt || null,
    accountStatus: snap.accountStatus,
    currency: snap.currency || 'NOK',
    period: { from: fromIso, to: toIso },
    totals: {
      cost: round2(t.cost), clicks: t.clicks || 0, impressions: t.impressions || 0,
      avgCpc: t.clicks ? round2(t.cost / t.clicks) : null,
      ctr: t.impressions ? round2((t.clicks / t.impressions) * 100) : null,
      leads: leadCount, cpl: leadCount ? round2(t.cost / leadCount) : null,
      won: wonCount, wonValue: round2(wonValue),
      cpa: wonCount ? round2(t.cost / wonCount) : null,
      roas: t.cost ? round2(wonValue / t.cost) : null,
      profit: round2(wonValue - t.cost),
    },
    campaigns,
  };
}

// Daglig leads-serie (betalt akkvisisjon) for grafer.
// Google-leads = attribution.channel 'Betalt'; Meta-leads = isMetaLead (fbclid/kilde).
// leads (total) = union (en lead som er både betalt og meta telles én gang i total).
export async function computeAdsLeadsSeries(db, fromIso, toIso) {
  const from = fromIso || new Date(Date.now() - 30 * 86400000).toISOString();
  const to = toIso || new Date().toISOString();
  const rows = await db.collection('leads')
    .find({ createdAt: { $gte: from, $lte: to }, deleted: { $ne: true } })
    .project({ _id: 0, attribution: 1, createdAt: 1, status: 1 })
    .limit(50000).toArray();
  const byDate = new Map();
  for (const l of rows) {
    const day = String(l.createdAt || '').slice(0, 10);
    if (!day) continue;
    const a = l.attribution || {};
    const isGoogle = String(a.channel || '') === 'Betalt';
    const isMeta = isMetaLead(l);
    if (!isGoogle && !isMeta) continue;
    if (!byDate.has(day)) byDate.set(day, { date: day, googleLeads: 0, metaLeads: 0, leads: 0 });
    const o = byDate.get(day);
    if (isGoogle) o.googleLeads++;
    if (isMeta) o.metaLeads++;
    o.leads++;
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// Slå sammen Google + Meta totaler til blandet CAC/ROAS.
export function combineAdsEconomics(googleEco, metaEco) {
  const round2 = (n) => Math.round((n || 0) * 100) / 100;
  const G = (googleEco && googleEco.totals) || {};
  const M = (metaEco && metaEco.totals) || {};
  const cost = (G.cost || 0) + (M.cost || 0);
  const clicks = (G.clicks || 0) + (M.clicks || 0);
  const leads = (G.leads || 0) + (M.leads || 0);
  const won = (G.won || 0) + (M.won || 0);
  const wonValue = (G.wonValue || 0) + (M.wonValue || 0);
  return {
    cost: round2(cost), clicks, leads, won, wonValue: round2(wonValue),
    cpl: leads ? round2(cost / leads) : null,
    cpa: won ? round2(cost / won) : null,
    roas: cost ? round2(wonValue / cost) : null,
    profit: round2(wonValue - cost),
    sources: {
      google: { cost: round2(G.cost || 0), leads: G.leads || 0, won: G.won || 0, wonValue: round2(G.wonValue || 0) },
      meta: { cost: round2(M.cost || 0), leads: M.leads || 0, won: M.won || 0, wonValue: round2(M.wonValue || 0) },
    },
  };
}

// ---------------------------------------------------------------------------
// BETALT TRAKT: annonseklikk → økt → skjema → steg → innsendt → qualified → won,
// segmentert per kanal (Google Ads / Meta / organisk+annet). Bygger på at
// øktkilden (utm/gclid/fbclid) festes på HVERT event i lib/analytics.js.
// adStats (klikk/forbruk fra Ads-API-ene) sendes inn fra ruta — cachet der.
// NB: fbclid følger også organiske FB-klikk — «Meta» kan inneholde noe organisk
// FB-trafikk til annonse-URL-ene får utm-parametre (gjøres i Annonsestudio).
// ---------------------------------------------------------------------------
function paidChannelOf(source, medium) {
  const s = String(source || '').toLowerCase();
  const m = String(medium || '').toLowerCase();
  if ((s === 'google' && /cpc|ppc|paid/.test(m)) || /google_ads|adwords/.test(s)) return 'google';
  // KUN eksplisitt betalt medium teller som Meta-annonse: alle annonsene våre
  // har url_tags (utm_medium=cpc/paid_social). fbclid alene = organisk FB/IG.
  if (/^(facebook|instagram|fb|ig|meta)$/.test(s) && /cpc|ppc|paid/.test(m)) return 'meta';
  // FINN.no display-bannere tagges med utm_source=finn&utm_medium=display.
  if (/finn/.test(s) && /cpc|ppc|paid|display|cpm|banner/.test(m)) return 'finn';
  return 'other';
}

function leadPaidChannel(a = {}) {
  if (a.gclid || a.gbraid || a.wbraid) return 'google'; // klikk-id finnes kun på betalte klikk
  return paidChannelOf(a.source, a.medium); // fbclid alene teller IKKE (organisk FB)
}

const PAID_STAGES = ['sessions', 'formPage', 'start', 'step2', 'step3', 'submit'];

export async function buildPaidFunnel(db, { days = 30, adStats = {} } = {}) {
  const fromIso = new Date(Date.now() - days * 86400000).toISOString();
  const zero = () => ({ sessions: 0, formPage: 0, start: 0, step2: 0, step3: 0, submit: 0, leads: 0, qualified: 0, won: 0, wonValue: 0 });
  const agg = { google: zero(), meta: zero(), finn: zero(), other: zero() };

  // 1) Events → per-økt stadier + kanal
  const evs = await db.collection('events')
    .find({ ts: { $gte: fromIso } })
    .project({ _id: 0, sessionId: 1, type: 1, path: 1, source: 1, medium: 1, meta: 1 })
    .toArray();
  const sess = new Map();
  for (const e of evs) {
    const sid = e.sessionId;
    if (!sid) continue;
    let s = sess.get(sid);
    if (!s) { s = { chan: 'other', stages: new Set() }; sess.set(sid, s); }
    const c = paidChannelOf(e.source, e.medium);
    if (c !== 'other') s.chan = c;
    s.stages.add('sessions');
    const p = e.path || '';
    if (p.startsWith('/bli-utleier') || p.startsWith('/lp/')) s.stages.add('formPage');
    const meta = (e.meta && typeof e.meta === 'object') ? e.meta : {};
    if (e.type === 'form_start' || (e.type === 'lead_step' && meta.step === 'start')) s.stages.add('start');
    const stepN = e.type === 'form_step' ? Number(meta.step) || 0 : (e.type === 'lead_step' && meta.step === 'step2' ? 2 : 0);
    if (stepN >= 2) s.stages.add('step2');
    if (stepN >= 3) s.stages.add('step3');
    if (e.type === 'lead_submit' || (e.type === 'lead_step' && meta.step === 'submit')) s.stages.add('submit');
  }
  for (const s of sess.values()) {
    const a = agg[s.chan] || agg.other;
    for (const st of s.stages) if (a[st] != null) a[st] += 1;
  }

  // 2) Leads i perioden → per kanal + livssyklus (fra CRM-webhooks)
  // Leads UTEN attribusjon (opprettet før sporingen gikk live 2. juli 2026,
  // eller m/ blokkert sporing) legges i egen «untracked»-bøtte så de ikke
  // forurenser organisk/direkte-tallene.
  const QUAL = new Set(['qualified', 'viewing_booked', 'contract_sent', 'won']);
  const untracked = { leads: 0, qualified: 0, won: 0, wonValue: 0 };
  const leads = await db.collection('leads')
    .find({ createdAt: { $gte: fromIso }, deleted: { $ne: true } })
    .project({ _id: 0, attribution: 1, status: 1, funnelStage: 1, value: 1 })
    .toArray();
  for (const l of leads) {
    const at = l.attribution || {};
    const isTracked = !!(at.sessionId || at.visitorId);
    const a = isTracked ? (agg[leadPaidChannel(at)] || agg.other) : untracked;
    a.leads += 1;
    const st = String(l.status || '').toLowerCase();
    const fs = String(l.funnelStage || '').toLowerCase();
    if (QUAL.has(st) || QUAL.has(fs)) a.qualified += 1;
    if (st === 'won') { a.won += 1; a.wonValue += Number(l.value) || 0; }
  }

  // 3) Sett sammen kanaler m/ annonseklikk, forbruk og kost per ledd
  const mk = (key, label, ads) => {
    const a = agg[key];
    const spend = ads && ads.spend != null ? Math.round(ads.spend * 100) / 100 : null;
    const clicks = ads && ads.clicks != null ? Number(ads.clicks) : null;
    return {
      key, label,
      adClicks: clicks, spend,
      ...a,
      wonValue: Math.round(a.wonValue * 100) / 100,
      cpl: spend != null && a.leads > 0 ? Math.round((spend / a.leads) * 100) / 100 : null,
      costPerSession: spend != null && a.sessions > 0 ? Math.round((spend / a.sessions) * 100) / 100 : null,
      clickToSession: clicks > 0 && a.sessions >= 0 ? Math.round((a.sessions / clicks) * 1000) / 10 : null,
    };
  };
  const channels = [
    mk('google', 'Google Ads', adStats.google),
    mk('meta', 'Meta', adStats.meta),
    mk('finn', 'FINN.no', adStats.finn),
    mk('other', 'Organisk / direkte / annet', null),
  ];
  if (untracked.leads > 0) {
    channels.push({
      key: 'untracked', label: 'Før sporing / ukjent kilde',
      adClicks: null, spend: null,
      sessions: null, formPage: null, start: null, step2: null, step3: null, submit: null,
      leads: untracked.leads, qualified: untracked.qualified, won: untracked.won,
      wonValue: Math.round(untracked.wonValue * 100) / 100,
      cpl: null, costPerSession: null, clickToSession: null,
    });
  }
  return {
    days,
    from: fromIso.slice(0, 10),
    stages: PAID_STAGES,
    channels,
    metaNote: 'Kun trafikk med eksplisitt betalt-merking (utm_medium=cpc/paid) telles som annonsetrafikk — organiske Facebook/Instagram-klikk (kun fbclid) havner under «Organisk / annet». Leads uten attribusjon (opprettet før sporingen gikk live) vises som egen kategori.',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE-HASTIGHET: tid i hvert steg, tid til salg, flaskehalser og modne
// leads — beregnet fra statusHistory (hver statusendring har tidsstempel).
// Speilede leads (mirrored) holdes utenfor tid-til-salg (mangler ekte start-
// tidspunkt hos oss), historiske ligger i egen samling og er aldri med her.
// ═══════════════════════════════════════════════════════════════════════════
const VELOCITY_OPEN = ['new', 'contacted', 'qualified', 'viewing', 'offer'];
const VELOCITY_LABELS = { new: 'Ny', contacted: 'Kontaktet', qualified: 'Kvalifisert', viewing: 'Befaring', offer: 'Tilbud sendt' };

function chLabel(a = {}) {
  const p = leadPaidChannel(a);
  if (p === 'google') return 'Google Ads';
  if (p === 'meta') return 'Meta';
  if (p === 'finn') return 'FINN.no';
  return a.channel === 'Betalt' ? 'Betalt (annet)' : (a.channel || 'Organisk/annet');
}

export async function computeVelocity(db, days = 90) {
  const fromIso = new Date(Date.now() - days * 86400000).toISOString();
  const leads = await db.collection('leads')
    .find({ createdAt: { $gte: fromIso }, deleted: { $ne: true } })
    .project({ _id: 0, id: 1, name: 1, email: 1, status: 1, statusHistory: 1, createdAt: 1, firstResponseAt: 1, wonAt: 1, mirrored: 1, attribution: 1 })
    .limit(20000).toArray();

  const stageDur = {}; VELOCITY_OPEN.forEach((s) => { stageDur[s] = []; });
  const seenSets = [];
  const ttsAll = []; const ttsByCh = new Map();
  const firstResp = [];
  const stale = [];
  const nowMs = Date.now();

  for (const l of leads) {
    // Kronologisk stegsekvens: opprettelse teller som inngang til 'new'
    const entries = [{ status: 'new', at: l.createdAt }];
    for (const h of (l.statusHistory || [])) if (h && h.status && h.at) entries.push({ status: h.status, at: h.at });
    entries.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const seq = [];
    for (const e of entries) if (!seq.length || seq[seq.length - 1].status !== e.status) seq.push(e);
    const seen = new Set(seq.map((e) => e.status));
    seenSets.push(seen);

    // Varighet i hvert åpne steg (kun avsluttede opphold = det finnes et neste steg)
    for (let i = 0; i < seq.length; i++) {
      const cur = seq[i];
      if (!VELOCITY_OPEN.includes(cur.status) || i + 1 >= seq.length) continue;
      const startMs = new Date(cur.at).getTime();
      const endMs = new Date(seq[i + 1].at).getTime();
      if (isFinite(startMs) && isFinite(endMs) && endMs > startMs) stageDur[cur.status].push((endMs - startMs) / 3600000);
    }

    // Modne leads: åpne leads som har stått stille i nåværende steg ≥ 7 dager
    if (VELOCITY_OPEN.includes(l.status)) {
      const lastAt = seq.length ? seq[seq.length - 1].at : l.createdAt;
      const dDays = (nowMs - new Date(lastAt).getTime()) / 86400000;
      if (isFinite(dDays) && dDays >= 7) stale.push({ id: l.id, name: l.name || l.email || '(uten navn)', stage: l.status, days: Math.round(dDays), mirrored: !!l.mirrored });
    }

    // Tid til salg + første kontakt (ekskl. speil — mangler ekte starttid)
    if (!l.mirrored) {
      if (l.status === 'won' && l.wonAt) {
        const dd = (new Date(l.wonAt).getTime() - new Date(l.createdAt).getTime()) / 86400000;
        if (isFinite(dd) && dd >= 0) {
          ttsAll.push(dd);
          const ch = chLabel(l.attribution || {});
          if (!ttsByCh.has(ch)) ttsByCh.set(ch, []);
          ttsByCh.get(ch).push(dd);
        }
      }
      if (l.firstResponseAt) {
        const hh = (new Date(l.firstResponseAt).getTime() - new Date(l.createdAt).getTime()) / 3600000;
        if (isFinite(hh) && hh >= 0) firstResp.push(hh);
      }
    }
  }

  const median = (arr) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

  const stages = VELOCITY_OPEN.map((s) => ({
    stage: s, label: VELOCITY_LABELS[s], n: stageDur[s].length,
    medianHours: r1(median(stageDur[s])), avgHours: r1(avg(stageDur[s])),
  }));

  // Steg-konvertering: andel av dem som entret steget som gikk VIDERE til et
  // senere positivt steg (eller vant) — resten endte i tapt/diskvalifisert/stille.
  const conversion = VELOCITY_OPEN.map((s, i) => {
    const later = [...VELOCITY_OPEN.slice(i + 1), 'won'];
    let entered = 0, advanced = 0;
    for (const seen of seenSets) {
      if (!seen.has(s)) continue;
      entered++;
      if (later.some((x) => seen.has(x))) advanced++;
    }
    return { stage: s, label: VELOCITY_LABELS[s], entered, advanced, rate: entered ? Math.round((advanced / entered) * 1000) / 10 : null };
  });

  // Flaskehals: åpent steg med høyest median-oppholdstid (krever litt datagrunnlag)
  let bottleneck = null;
  for (const st of stages) if (st.n >= 3 && st.medianHours != null && (!bottleneck || st.medianHours > bottleneck.medianHours)) bottleneck = st;

  stale.sort((a, b) => b.days - a.days);

  return {
    ok: true, days, sample: leads.length,
    stages, conversion, bottleneck,
    timeToSale: {
      medianDays: r1(median(ttsAll)), avgDays: r1(avg(ttsAll)), n: ttsAll.length,
      perChannel: [...ttsByCh.entries()].map(([channel, arr]) => ({ channel, medianDays: r1(median(arr)), n: arr.length })).sort((a, b) => (a.medianDays ?? 1e9) - (b.medianDays ?? 1e9)),
    },
    firstResponse: { medianHours: r1(median(firstResp)), n: firstResp.length },
    stale: stale.slice(0, 15),
    note: 'Tid til salg og første kontakt måles kun på egne leads (speil fra CRM-et mangler ekte starttidspunkt). Historiske leads er aldri med.',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTVIKLING OVER TID: CPL/CAC/forbruk/leads/ROAS per uke (eller dag) per kanal.
// Daglige forbruksserier fra annonse-API-ene persisteres i daily_metrics ved
// hvert kall → varig historikk som vokser forbi API-enes egne vinduer.
// FINN (manuelle kampanjer) fordeles jevnt over kampanjeperioden.
// ═══════════════════════════════════════════════════════════════════════════
export async function computeMarketingTrends(db, { days = 84, adSeries = {} } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  // 1) Persister innkommende daglige serier (varig historikk)
  const bulk = [];
  for (const [ch, series] of Object.entries(adSeries)) {
    for (const p of (series || [])) {
      if (!p || !p.date) continue;
      bulk.push({ updateOne: { filter: { date: String(p.date).slice(0, 10), channel: ch }, update: { $set: {
        date: String(p.date).slice(0, 10), channel: ch,
        spend: Math.round((Number(p.cost ?? p.spend) || 0) * 100) / 100,
        clicks: Number(p.clicks) || 0,
        partial: String(p.date).slice(0, 10) === today,
        updatedAt: nowIso,
      } }, upsert: true } });
    }
  }
  if (bulk.length) { try { await db.collection('daily_metrics').bulkWrite(bulk, { ordered: false }); } catch (e) { /* best-effort */ } }

  // 2) FINN: manuelle kampanjer → jevn fordeling over kampanjedagene
  const finnByDay = new Map();
  try {
    const rows = await db.collection('finn_campaigns').find({}).project({ _id: 0 }).toArray();
    for (const c of rows) {
      const start = String(c.startDate || '').slice(0, 10);
      if (!start) continue;
      const sMs = new Date(start).getTime();
      const eMs = Math.min(new Date(String(c.endDate || today).slice(0, 10)).getTime(), Date.now());
      if (!isFinite(sMs) || !isFinite(eMs) || eMs < sMs) continue;
      const nDays = Math.max(1, Math.round((eMs - sMs) / 86400000) + 1);
      const perDay = (Number(c.spendNok) || 0) / nDays;
      const clicksDay = (Number(c.clicks) || 0) / nDays;
      for (let t = sMs; t <= eMs; t += 86400000) {
        const d = new Date(t).toISOString().slice(0, 10);
        const cur = finnByDay.get(d) || { spend: 0, clicks: 0 };
        cur.spend += perDay; cur.clicks += clicksDay;
        finnByDay.set(d, cur);
      }
    }
  } catch (e) { /* best-effort */ }

  // 3) Les lagret historikk for vinduet
  const fromDay = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const stored = await db.collection('daily_metrics').find({ date: { $gte: fromDay } }).project({ _id: 0 }).toArray();

  // 4) Leads + vunnede i vinduet (inkl. vunnet i vinduet men opprettet før)
  const fromIso = new Date(Date.now() - days * 86400000).toISOString();
  const proj = { _id: 0, createdAt: 1, status: 1, wonAt: 1, wonValue: 1, attribution: 1 };
  const created = await db.collection('leads').find({ createdAt: { $gte: fromIso }, deleted: { $ne: true } }).project(proj).limit(50000).toArray();
  const wonExtra = await db.collection('leads').find({ wonAt: { $gte: fromIso }, createdAt: { $lt: fromIso }, deleted: { $ne: true } }).project(proj).limit(50000).toArray();

  // 5) Grupper per periode: dag hvis ≤ 31 dager, ellers ISO-uke (mandag som nøkkel)
  const group = days <= 31 ? 'day' : 'week';
  const keyOf = (dateStr) => {
    if (group === 'day') return dateStr;
    const d = new Date(dateStr + 'T12:00:00Z');
    const wd = (d.getUTCDay() + 6) % 7; // man=0
    d.setUTCDate(d.getUTCDate() - wd);
    return d.toISOString().slice(0, 10);
  };
  const CHS = ['google', 'meta', 'finn'];
  const mkCh = () => ({ spend: 0, clicks: 0, leads: 0, won: 0, wonValue: 0 });
  const buckets = new Map(); // key → {google, meta, finn, organicLeads, totalLeads}
  const bucket = (k) => {
    if (!buckets.has(k)) buckets.set(k, { google: mkCh(), meta: mkCh(), finn: mkCh(), organicLeads: 0, totalLeads: 0 });
    return buckets.get(k);
  };

  for (const r of stored) {
    if (!CHS.includes(r.channel)) continue;
    const b = bucket(keyOf(r.date));
    b[r.channel].spend += Number(r.spend) || 0;
    b[r.channel].clicks += Number(r.clicks) || 0;
  }
  for (const [d, v] of finnByDay.entries()) {
    if (d < fromDay) continue;
    const b = bucket(keyOf(d));
    b.finn.spend += v.spend; b.finn.clicks += v.clicks;
  }
  for (const l of created) {
    const day = String(l.createdAt || '').slice(0, 10);
    if (!day || day < fromDay) continue;
    const b = bucket(keyOf(day));
    b.totalLeads++;
    const ch = leadPaidChannel(l.attribution || {});
    if (CHS.includes(ch)) b[ch].leads++; else b.organicLeads++;
  }
  for (const l of [...created, ...wonExtra]) {
    if (l.status !== 'won' || !l.wonAt) continue;
    const day = String(l.wonAt).slice(0, 10);
    if (!day || day < fromDay) continue;
    const ch = leadPaidChannel(l.attribution || {});
    if (!CHS.includes(ch)) continue;
    const b = bucket(keyOf(day));
    b[ch].won++; b[ch].wonValue += Number(l.wonValue) || 0;
  }

  const r2 = (v) => Math.round(v * 100) / 100;
  const finish = (c) => ({
    spend: r2(c.spend), clicks: Math.round(c.clicks), leads: c.leads, won: c.won, wonValue: r2(c.wonValue),
    cpl: c.leads > 0 && c.spend > 0 ? r2(c.spend / c.leads) : null,
    cac: c.won > 0 && c.spend > 0 ? r2(c.spend / c.won) : null,
    roas: c.spend > 0 ? r2(c.wonValue / c.spend) : null,
  });
  const periods = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, b]) => {
    const total = mkCh();
    for (const ch of CHS) { total.spend += b[ch].spend; total.clicks += b[ch].clicks; total.leads += b[ch].leads; total.won += b[ch].won; total.wonValue += b[ch].wonValue; }
    return {
      key, group,
      partial: group === 'day' ? key === today : keyOf(today) === key,
      google: finish(b.google), meta: finish(b.meta), finn: finish(b.finn),
      paid: finish(total),
      organicLeads: b.organicLeads, totalLeads: b.totalLeads,
    };
  });

  // 6) Retning: siste halvdel vs første halvdel av vinduet (betalt totalt)
  const half = Math.floor(periods.length / 2);
  const sumHalf = (list) => list.reduce((a, p) => ({ spend: a.spend + p.paid.spend, leads: a.leads + p.paid.leads, won: a.won + p.paid.won }), { spend: 0, leads: 0, won: 0 });
  let summary = null;
  if (periods.length >= 4) {
    const A = sumHalf(periods.slice(0, half));
    const B = sumHalf(periods.slice(half));
    const cplA = A.leads ? A.spend / A.leads : null; const cplB = B.leads ? B.spend / B.leads : null;
    const cacA = A.won ? A.spend / A.won : null; const cacB = B.won ? B.spend / B.won : null;
    const pct = (x, y) => (x != null && y != null && x > 0 ? Math.round(((y - x) / x) * 1000) / 10 : null);
    summary = { cplChangePct: pct(cplA, cplB), cacChangePct: pct(cacA, cacB), cplNow: cplB != null ? r2(cplB) : null, cacNow: cacB != null ? r2(cacB) : null };
  }

  return {
    ok: true, days, group, periods, summary,
    storedDays: new Set(stored.map((r) => r.date)).size,
    note: 'Forbruk hentes daglig fra Google/Meta og lagres varig (daily_metrics) — historikken vokser forbi annonse-API-enes egne vinduer. FINN-forbruk er manuelle kampanjer fordelt jevnt over kampanjeperioden. CPL = forbruk/leads, CAC = forbruk/vunnede, ROAS = kontraktsverdi/forbruk (kun betalte kanaler).',
  };
}
