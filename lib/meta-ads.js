// ---------------------------------------------------------------------------
// Meta Marketing API — les annonseforbruk (insights) for multi-kanal CAC.
// Read-only. Bruker META_AD_ACCOUNT_ID (act_XXXX) + META_SYSTEM_USER_TOKEN.
// ---------------------------------------------------------------------------
const VER = process.env.META_API_VERSION || 'v21.0';
const ACC = process.env.META_AD_ACCOUNT_ID || '';
const TOKEN = process.env.META_SYSTEM_USER_TOKEN || '';
const BASE = `https://graph.facebook.com/${VER}`;
const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

export function metaAdsConfigured() {
  return !!(ACC && TOKEN);
}

async function graph(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('access_token', TOKEN);
  const res = await fetch(url.toString());
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j && j.error && j.error.message) || `Meta API ${res.status}`);
  return j;
}

// Kontometadata (navn, valuta, status).
export async function fetchMetaAccount() {
  const j = await graph(`/${ACC}`, { fields: 'name,currency,account_status,amount_spent' });
  return {
    id: ACC,
    name: j.name || 'Meta',
    currency: j.currency || 'NOK',
    status: j.account_status,
    amountSpentTotal: j.amount_spent != null ? Number(j.amount_spent) / 100 : null,
  };
}

// Kampanje-insights for periode. since/until: 'YYYY-MM-DD'. Ellers datePreset.
export async function fetchMetaInsights({ since, until, datePreset } = {}) {
  const params = {
    level: 'campaign',
    fields: 'campaign_name,campaign_id,spend,impressions,clicks,inline_link_clicks,cpc,ctr',
    limit: '500',
  };
  if (since && until) params.time_range = JSON.stringify({ since, until });
  else params.date_preset = datePreset || 'last_30d';

  let data = await graph(`/${ACC}/insights`, params);
  let rows = (data.data || []).slice();
  let guard = 0;
  while (data.paging && data.paging.next && guard < 20) {
    const res = await fetch(data.paging.next);
    data = await res.json().catch(() => ({}));
    rows = rows.concat(data.data || []);
    guard += 1;
  }

  const campaigns = rows.map((r) => {
    const cost = Number(r.spend) || 0;
    const clicks = Number(r.clicks) || 0;
    const impressions = Number(r.impressions) || 0;
    return {
      name: r.campaign_name || r.campaign_id || '(ukjent kampanje)',
      cost,
      impressions,
      clicks,
      linkClicks: r.inline_link_clicks != null ? Number(r.inline_link_clicks) || 0 : null,
      cpc: r.cpc != null && r.cpc !== '' ? Number(r.cpc) : (clicks > 0 ? cost / clicks : null),
      ctr: r.ctr != null && r.ctr !== '' ? Number(r.ctr) : (impressions > 0 ? (clicks / impressions) * 100 : null),
    };
  });
  campaigns.sort((a, b) => b.cost - a.cost);
  return campaigns;
}

// --- Nær-sanntid: periode-mapping + cachet live-rapport (speiler Google-flyten) ---
export const META_REPORT_TTL_MS = 10 * 60 * 1000; // 10 min
export const META_PERIODS = ['last_7d', 'last_30d', 'last_90d', 'this_year', 'all'];

// Vår periode-nøkkel → Meta date_preset.
export function metaPeriodToPreset(period) {
  switch (period) {
    case 'last_7d': return 'last_7d';
    case 'last_90d': return 'last_90d';
    case 'this_year': return 'this_year';
    case 'all': return 'maximum';
    case 'last_30d':
    default: return 'last_30d';
  }
}

// Periode-nøkkel → {periodFrom, periodTo} (ISO) for lead-join-vinduet.
export function metaPeriodToRange(period) {
  const now = new Date();
  const periodTo = now.toISOString();
  const dayMs = 86400000;
  switch (period) {
    case 'last_7d': return { periodFrom: new Date(now - 7 * dayMs).toISOString(), periodTo };
    case 'last_90d': return { periodFrom: new Date(now - 90 * dayMs).toISOString(), periodTo };
    case 'this_year': return { periodFrom: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString(), periodTo };
    case 'all': return { periodFrom: '2015-01-01T00:00:00.000Z', periodTo };
    case 'last_30d':
    default: return { periodFrom: new Date(now - 30 * dayMs).toISOString(), periodTo };
  }
}

// Daglig tidsserie (konto-nivå, time_increment=1). → [{date, cost, clicks, impressions}]
export async function fetchMetaDaily({ since, until, datePreset } = {}) {
  const params = {
    level: 'account',
    fields: 'spend,impressions,clicks',
    time_increment: '1',
    limit: '500',
  };
  if (since && until) params.time_range = JSON.stringify({ since, until });
  else params.date_preset = datePreset || 'last_30d';

  let data = await graph(`/${ACC}/insights`, params);
  let rows = (data.data || []).slice();
  let guard = 0;
  while (data.paging && data.paging.next && guard < 60) {
    const res = await fetch(data.paging.next);
    data = await res.json().catch(() => ({}));
    rows = rows.concat(data.data || []);
    guard += 1;
  }
  return rows
    .map((r) => ({
      date: r.date_start,
      cost: Number(r.spend) || 0,
      clicks: Number(r.clicks) || 0,
      impressions: Number(r.impressions) || 0,
    }))
    .filter((d) => d.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Daglig tidsserie MED konverteringer (lead-actions). → [{date, cost, conversions}]
// Brukes til å se NÅR konverteringssporing faktisk begynte å registrere.
export async function fetchMetaDailyActions({ since, until, datePreset } = {}) {
  const params = {
    level: 'account',
    fields: 'spend,actions',
    time_increment: '1',
    limit: '500',
  };
  if (since && until) params.time_range = JSON.stringify({ since, until });
  else params.date_preset = datePreset || 'last_30d';
  let data = await graph(`/${ACC}/insights`, params);
  let rows = (data.data || []).slice();
  let guard = 0;
  while (data.paging && data.paging.next && guard < 60) {
    const res = await fetch(data.paging.next);
    data = await res.json().catch(() => ({}));
    rows = rows.concat(data.data || []);
    guard += 1;
  }
  return rows
    .map((r) => ({ date: r.date_start, cost: Number(r.spend) || 0, conversions: sumLeadActions(r.actions) }))
    .filter((d) => d.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}


// Bygg et meta-snapshot (samme form som meta-sync) for en periode.
async function buildMetaSnapshot(period) {
  const preset = metaPeriodToPreset(period);
  const { periodFrom, periodTo } = metaPeriodToRange(period);
  const [campaigns, account, series] = await Promise.all([
    fetchMetaInsights({ datePreset: preset }),
    fetchMetaAccount().catch(() => null),
    fetchMetaDaily({ datePreset: preset }).catch(() => []),
  ]);
  const totals = campaigns.reduce((a, c) => ({
    cost: a.cost + (c.cost || 0), clicks: a.clicks + (c.clicks || 0), impressions: a.impressions + (c.impressions || 0),
    linkClicks: a.linkClicks + (c.linkClicks || 0),
  }), { cost: 0, clicks: 0, impressions: 0, linkClicks: 0 });
  return {
    source: 'meta_api_live',
    label: (account && account.name) ? account.name : 'Meta',
    currency: (account && account.currency) || 'NOK',
    accountStatus: account ? account.status : null,
    periodFrom, periodTo, datePreset: preset,
    totals, campaigns: campaigns.slice(0, 500), series,
    account,
  };
}

// Nær-sanntid Meta-rapport med kort cache. Returnerer { snap, fetchedAt, cached, stale, error? }.
export async function getCachedMetaReport(db, period = 'last_30d', { force = false } = {}) {
  const p = META_PERIODS.includes(period) ? period : 'last_30d';
  const key = `meta_report:${p}`;
  const coll = db.collection('meta_report_cache');
  const existing = await coll.findOne({ key });
  const ageMs = existing ? (Date.now() - new Date(existing.fetchedAt).getTime()) : Infinity;
  if (!force && existing && ageMs < META_REPORT_TTL_MS) {
    return { snap: existing.snap, fetchedAt: existing.fetchedAt, cached: true, stale: false };
  }
  try {
    const snap = await buildMetaSnapshot(p);
    const fetchedAt = new Date().toISOString();
    await coll.updateOne({ key }, { $set: { key, period: p, snap, fetchedAt } }, { upsert: true });
    return { snap, fetchedAt, cached: false, stale: false };
  } catch (e) {
    if (existing) return { snap: existing.snap, fetchedAt: existing.fetchedAt, cached: true, stale: true, error: e.message };
    throw e;
  }
}

// Hent faktiske Meta-annonser med kreativ-innhold (read-only): bilde, tittel, tekst, CTA, lenke.
export async function fetchMetaCreatives({ limit = 100 } = {}) {
  const fields = [
    'id', 'name', 'status', 'effective_status',
    'campaign{name}', 'adset{name}',
    'creative{id,title,body,image_url,thumbnail_url,object_type,call_to_action_type,object_story_spec,asset_feed_spec,instagram_permalink_url,effective_object_story_id}',
  ].join(',');
  let data = await graph(`/${ACC}/ads`, { fields, limit: String(limit), thumbnail_width: '600', thumbnail_height: '600' });
  let rows = (data.data || []).slice();
  let guard = 0;
  while (data.paging && data.paging.next && guard < 10) {
    const res = await fetch(data.paging.next);
    data = await res.json().catch(() => ({}));
    rows = rows.concat(data.data || []);
    guard += 1;
  }
  const tiny = (u) => /[ps]\d{1,3}x\d{1,3}/.test(String(u || '')); // f.eks. p64x64 = liten forhåndsvisning
  return rows.map((a) => {
    const c = a.creative || {};
    const oss = c.object_story_spec || {};
    const ld = oss.link_data || oss.video_data || {};
    const cta = c.call_to_action_type || (ld.call_to_action && ld.call_to_action.type) || null;
    // Velg skarpest mulig bilde: full image_url (hvis ikke en bitteliten forhåndsvisning),
    // ellers 600px thumbnail_url, ellers postens picture.
    let image = '';
    if (c.image_url && !tiny(c.image_url)) image = c.image_url;
    else image = c.thumbnail_url || ld.picture || c.image_url || '';
    return {
      id: a.id,
      name: a.name || '',
      status: a.effective_status || a.status || '',
      campaign: (a.campaign && a.campaign.name) || '',
      adset: (a.adset && a.adset.name) || '',
      title: c.title || ld.name || '',
      body: c.body || ld.message || '',
      image,
      objectType: c.object_type || '',
      cta,
      link: ld.link || ((c.asset_feed_spec && Array.isArray(c.asset_feed_spec.link_urls) && c.asset_feed_spec.link_urls[0] && c.asset_feed_spec.link_urls[0].website_url) || '') || c.instagram_permalink_url || '',
    };
  });
}

// --- Annonse-forhåndsvisning (pixel-perfekt iframe fra Meta) -----------------
// Metas /{ad}/previews returnerer en <iframe>-HTML der src peker på
// business.facebook.com/.../preview_iframe.php?...&access_token=TOKEN.
// Vi henter src server-side slik at System User-tokenet ALDRI havner i klienten.
export const META_PREVIEW_FORMATS = [
  'MOBILE_FEED_STANDARD', 'DESKTOP_FEED_STANDARD',
  'INSTAGRAM_STANDARD', 'INSTAGRAM_STORY', 'FACEBOOK_STORY_MOBILE',
];
export function isValidPreviewFormat(f) {
  return META_PREVIEW_FORMATS.includes(String(f || ''));
}
// Returnerer absolutt preview-URL (med token) for en gitt annonse + format. Server-only.
export async function fetchMetaPreviewSrc(adId, adFormat = 'MOBILE_FEED_STANDARD') {
  const fmt = isValidPreviewFormat(adFormat) ? adFormat : 'MOBILE_FEED_STANDARD';
  const j = await graph(`/${adId}/previews`, { ad_format: fmt });
  const body = (j.data && j.data[0] && j.data[0].body) || '';
  const m = body.match(/src="([^"]+)"/);
  if (!m) return null;
  return m[1].replace(/&amp;/g, '&');
}

// Cachet versjon (10 min TTL), faller tilbake til siste kjente ved feil.
export async function getCachedMetaCreatives(db, { force = false } = {}) {
  const coll = db.collection('meta_creatives_cache');
  const existing = await coll.findOne({ key: 'meta_creatives' });
  const ageMs = existing ? (Date.now() - new Date(existing.fetchedAt).getTime()) : Infinity;
  if (!force && existing && ageMs < META_REPORT_TTL_MS) {
    return { ads: existing.ads, fetchedAt: existing.fetchedAt, cached: true, stale: false };
  }
  try {
    const ads = await fetchMetaCreatives();
    const fetchedAt = new Date().toISOString();
    await coll.updateOne({ key: 'meta_creatives' }, { $set: { key: 'meta_creatives', ads, fetchedAt } }, { upsert: true });
    return { ads, fetchedAt, cached: false, stale: false };
  } catch (e) {
    if (existing) return { ads: existing.ads, fetchedAt: existing.fetchedAt, cached: true, stale: true, error: e.message };
    throw e;
  }
}

// --- Per-annonse-innsikt (for samlet annonse-tabell + anbefalingsmotor) -----
// KUN Metas kanoniske «lead»-total. Den aggregerer allerede pixel-leads
// (offsite_conversion.fb_pixel_lead), onsite_web_lead og leadgen-skjemaer —
// å telle undertypene i tillegg ga trippeltelling. Et tidligere /lead/i-regex
// telte dessuten 'offsite_content_view_add_meta_leads' (en VISNINGS-metrikk)
// som leads → 73 «leads» som i virkeligheten var 2. Aldri gjeninnfør regex her.
const META_LEAD_ACTIONS = ['lead'];
function sumLeadActions(arr) {
  let n = 0;
  for (const a of arr || []) {
    const t = String(a.action_type || '');
    if (META_LEAD_ACTIONS.includes(t)) n += Number(a.value) || 0;
  }
  return n;
}

// Hent alle Meta-annonser m/ ytelsesmetrikk (spend/cpc/ctr/konv.) for perioden.
// Pausede annonser uten levering i vinduet får LIVSTIDS-tall som fallback
// (aliaset insights-felt m/ date_preset(maximum)) og merkes statsScope:'lifetime'
// — ellers viste tabellen bare nuller for alt som ikke kjørte akkurat nå.
//
// VIKTIG: `lifetimeFallback:false` MÅ brukes av alt som SUMMERER forbruk
// (KPI/CAC/CPL/ROAS/ukesrapport). Ellers legges livstidsforbruket til pausede
// annonser inn i periodetotalen og blåser opp annonseforbruket kraftig.
export async function fetchMetaAdsWithInsights({ datePreset = 'last_30d', since, until, limit = 200, lifetimeFallback = true } = {}) {
  const win = (since && until) ? `time_range(${JSON.stringify({ since, until })})` : `date_preset(${datePreset})`;
  const insightsFields = 'spend,impressions,reach,frequency,clicks,cpc,ctr,actions,action_values';
  const baseFields = [
    'id', 'name', 'effective_status', 'status',
    'campaign{name}', 'adset{name}',
    'creative{object_story_spec,asset_feed_spec}',
  ];
  const fetchAll = async (fields) => {
    let data = await graph(`/${ACC}/ads`, { fields, limit: String(limit) });
    let rows = (data.data || []).slice();
    let guard = 0;
    while (data.paging && data.paging.next && guard < 15) {
      const res = await fetch(data.paging.next);
      data = await res.json().catch(() => ({}));
      rows = rows.concat(data.data || []);
      guard += 1;
    }
    return rows;
  };
  let rows;
  let hasLifetime = lifetimeFallback;
  try {
    if (!lifetimeFallback) throw new Error('skip-lifetime');
    rows = await fetchAll([...baseFields, `insights.${win}{${insightsFields}}`, `insights.date_preset(maximum).as(insights_lifetime){${insightsFields}}`].join(','));
  } catch (e) {
    // Eldre API-oppførsel uten alias-støtte — eller lifetimeFallback:false
    // (summeringer skal aldri se livstidstall). Hent kun periodevinduet.
    hasLifetime = false;
    rows = await fetchAll([...baseFields, `insights.${win}{${insightsFields}}`].join(','));
  }
  return rows.map((a) => {
    const insPeriod = (a.insights && a.insights.data && a.insights.data[0]) || null;
    const insLife = hasLifetime ? ((a.insights_lifetime && a.insights_lifetime.data && a.insights_lifetime.data[0]) || null) : null;
    const periodHasData = !!insPeriod && (Number(insPeriod.impressions) > 0 || Number(insPeriod.spend) > 0);
    const lifeHasData = !!insLife && (Number(insLife.impressions) > 0 || Number(insLife.spend) > 0);
    const useLifetime = !periodHasData && lifeHasData;
    const ins = useLifetime ? insLife : (insPeriod || {});
    const oss = (a.creative && a.creative.object_story_spec) || {};
    const ld = oss.link_data || {};
    const afs = (a.creative && a.creative.asset_feed_spec) || {};
    const afsLink = (Array.isArray(afs.link_urls) && afs.link_urls[0] && (afs.link_urls[0].website_url || afs.link_urls[0].display_url)) || '';
    const linkUrl = ld.link || (ld.child_attachments && ld.child_attachments[0] && ld.child_attachments[0].link) || (oss.video_data && oss.video_data.call_to_action && oss.video_data.call_to_action.value && oss.video_data.call_to_action.value.link) || afsLink || '';
    const cost = Number(ins.spend) || 0;
    const clicks = Number(ins.clicks) || 0;
    const impressions = Number(ins.impressions) || 0;
    const conversions = sumLeadActions(ins.actions);
    const convValue = sumLeadActions(ins.action_values);
    return {
      channel: 'meta', id: a.id, name: a.name || '',
      campaign: (a.campaign && a.campaign.name) || '', adGroup: (a.adset && a.adset.name) || '',
      link: linkUrl,
      status: a.effective_status || a.status || '',
      statsScope: useLifetime ? 'lifetime' : (periodHasData ? 'period' : 'none'),
      cost: round2(cost), impressions, clicks,
      reach: Number(ins.reach) || 0,
      frequency: ins.frequency != null && ins.frequency !== '' ? round2(Number(ins.frequency)) : (Number(ins.reach) ? round2(impressions / Number(ins.reach)) : 0),
      ctr: ins.ctr != null && ins.ctr !== '' ? round2(Number(ins.ctr)) : (impressions > 0 ? round2((clicks / impressions) * 100) : 0),
      cpc: ins.cpc != null && ins.cpc !== '' ? round2(Number(ins.cpc)) : (clicks > 0 ? round2(cost / clicks) : 0),
      conversions: round2(conversions), convValue: round2(convValue),
      cpa: conversions > 0 ? round2(cost / conversions) : null,
      roas: cost > 0 ? round2(convValue / cost) : null,
    };
  }).sort((a, b) => (b.statsScope === 'period' ? b.cost : 0) - (a.statsScope === 'period' ? a.cost : 0) || b.cost - a.cost);
}

// Cachet per-annonse-tabell (10 min TTL, stale-fallback).
export async function getCachedMetaAdsTable(db, period = 'last_30d', { force = false } = {}) {
  const p = META_PERIODS.includes(period) ? period : 'last_30d';
  const key = `meta_ads_table:${p}`;
  const coll = db.collection('meta_report_cache');
  const existing = await coll.findOne({ key });
  const ageMs = existing ? (Date.now() - new Date(existing.fetchedAt).getTime()) : Infinity;
  if (!force && existing && ageMs < META_REPORT_TTL_MS) return { ads: existing.ads, fetchedAt: existing.fetchedAt, cached: true, stale: false };
  try {
    const ads = await fetchMetaAdsWithInsights({ datePreset: metaPeriodToPreset(p) });
    const fetchedAt = new Date().toISOString();
    await coll.updateOne({ key }, { $set: { key, ads, fetchedAt } }, { upsert: true });
    return { ads, fetchedAt, cached: false, stale: false };
  } catch (e) {
    if (existing) return { ads: existing.ads, fetchedAt: existing.fetchedAt, cached: true, stale: true, error: e.message };
    throw e;
  }
}

// Daglig tidsserie for ÉN annonse (time_increment=1). Brukes av detalj-modalen.
// → [{date, cost, impressions, clicks, ctr, cpc, conversions, convValue}]
export async function fetchMetaAdDaily(adId, { datePreset, since, until } = {}) {
  const id = String(adId || '').replace(/\D/g, '');
  if (!id) throw new Error('Ugyldig annonse-id');
  const params = {
    fields: 'spend,impressions,clicks,ctr,cpc,actions,action_values',
    time_increment: '1',
    limit: '500',
  };
  if (since && until) params.time_range = JSON.stringify({ since, until });
  else params.date_preset = datePreset || 'last_30d';
  let data = await graph(`/${id}/insights`, params);
  let rows = (data.data || []).slice();
  let guard = 0;
  while (data.paging && data.paging.next && guard < 60) {
    const res = await fetch(data.paging.next);
    data = await res.json().catch(() => ({}));
    rows = rows.concat(data.data || []);
    guard += 1;
  }
  return rows
    .map((r) => {
      const cost = Number(r.spend) || 0;
      const clicks = Number(r.clicks) || 0;
      const impressions = Number(r.impressions) || 0;
      return {
        date: r.date_start,
        cost: round2(cost), impressions, clicks,
        ctr: r.ctr != null && r.ctr !== '' ? round2(Number(r.ctr)) : (impressions > 0 ? round2((clicks / impressions) * 100) : 0),
        cpc: r.cpc != null && r.cpc !== '' ? round2(Number(r.cpc)) : (clicks > 0 ? round2(cost / clicks) : 0),
        conversions: round2(sumLeadActions(r.actions)),
        convValue: round2(sumLeadActions(r.action_values)),
      };
    })
    .filter((d) => d.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Pause/aktiver en Meta-annonse (krever ads_management — graceful ved feil).
export async function setMetaAdStatus(adId, status = 'PAUSED') {  const st = String(status).toUpperCase();
  if (!['ACTIVE', 'PAUSED'].includes(st)) throw new Error('Ugyldig status');
  const res = await fetch(`${BASE}/${adId}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ status: st, access_token: TOKEN }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j && j.error && j.error.message) || `Meta API ${res.status}`);
  return { ok: true, id: adId, status: st };
}
