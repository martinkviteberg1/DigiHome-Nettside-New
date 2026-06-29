// ---------------------------------------------------------------------------
// Meta Lead Ads — hent leads fra Facebook/Instagram lead-skjemaer (leads_retrieval).
// Read-only. System-user-token gir page-token via /me/accounts → /{form}/leads.
// ---------------------------------------------------------------------------
const VER = process.env.META_API_VERSION || 'v21.0';
const TOKEN = process.env.META_SYSTEM_USER_TOKEN || '';
const BASE = `https://graph.facebook.com/${VER}`;

export function metaLeadAdsConfigured() {
  return !!TOKEN;
}

async function graph(path, params = {}, token = TOKEN) {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('access_token', token);
  const res = await fetch(url.toString());
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j && j.error && j.error.message) || `Meta API ${res.status}`);
  return j;
}

// Sider system-brukeren har tilgang til (inkl. page-token for lead-henting).
export async function fetchPages() {
  const j = await graph('/me/accounts', { fields: 'id,name,access_token', limit: '100' });
  return (j.data || []).map((p) => ({ id: p.id, name: p.name, token: p.access_token || TOKEN }));
}

// Lead-skjemaer på en side.
export async function fetchLeadForms(pageId, pageToken) {
  const j = await graph(`/${pageId}/leadgen_forms`, { fields: 'id,name,status,leads_count', limit: '100' }, pageToken);
  return (j.data || []).map((f) => ({
    id: f.id, name: f.name, status: f.status, leads_count: Number(f.leads_count) || 0,
  }));
}

// Leads for et skjema, med paginering. since = unix-sekunder (kun nyere enn dette).
export async function fetchFormLeads(formId, pageToken, { since } = {}) {
  const params = {
    fields: 'id,created_time,ad_id,ad_name,adset_name,campaign_id,campaign_name,form_id,platform,field_data',
    limit: '100',
  };
  if (since) params.filtering = JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: since }]);
  let data = await graph(`/${formId}/leads`, params, pageToken);
  let rows = (data.data || []).slice();
  let guard = 0;
  while (data.paging && data.paging.next && guard < 50) {
    const res = await fetch(data.paging.next);
    data = await res.json().catch(() => ({}));
    rows = rows.concat(data.data || []);
    guard += 1;
  }
  return rows;
}

// Hent ÉN lead (fra webhook leadgen_id). token = page-token eller system-token.
export async function fetchSingleLead(leadgenId, token) {
  return graph(`/${leadgenId}`, {
    fields: 'id,created_time,ad_id,ad_name,adset_name,campaign_id,campaign_name,form_id,platform,field_data',
  }, token || TOKEN);
}

// Hent skjemanavn (for å rute leietaker vs huseier).
export async function fetchFormName(formId, token) {
  try {
    const j = await graph(`/${formId}`, { fields: 'name' }, token || TOKEN);
    return j.name || '';
  } catch (e) { return ''; }
}

// Finn page-token for en gitt page_id (via /me/accounts). Fallback: system-token.
export async function fetchPageToken(pageId) {
  try {
    const pages = await fetchPages();
    const p = pages.find((x) => String(x.id) === String(pageId));
    return (p && p.token) || TOKEN;
  } catch (e) { return TOKEN; }
}

// field_data: [{name, values:[...]}] → flate standardfelt + egendefinerte spørsmål som notat.
export function mapLeadFields(field_data = []) {
  const dict = {};
  for (const f of field_data) {
    if (!f || !f.name) continue;
    dict[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
  }
  const STD = new Set(['full_name', 'first_name', 'last_name', 'email', 'phone_number', 'phone', 'street_address', 'city', 'post_code', 'zip', 'company_name', 'job_title']);
  const name = (dict.full_name || [dict.first_name, dict.last_name].filter(Boolean).join(' ')).trim();
  const email = dict.email || '';
  const phone = dict.phone_number || dict.phone || '';
  const address = dict.street_address || dict.city || '';
  const notes = Object.entries(dict)
    .filter(([k]) => !STD.has(k))
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join(' · ');
  return { name, email, phone, address, notes, raw: dict };
}
