// ---------------------------------------------------------------------------
// Meta Marketing API — les annonseforbruk (insights) for multi-kanal CAC.
// Read-only. Bruker META_AD_ACCOUNT_ID (act_XXXX) + META_SYSTEM_USER_TOKEN.
// ---------------------------------------------------------------------------
const VER = process.env.META_API_VERSION || 'v21.0';
const ACC = process.env.META_AD_ACCOUNT_ID || '';
const TOKEN = process.env.META_SYSTEM_USER_TOKEN || '';
const BASE = `https://graph.facebook.com/${VER}`;

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
    fields: 'campaign_name,campaign_id,spend,impressions,clicks,cpc,ctr',
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
      cpc: r.cpc != null && r.cpc !== '' ? Number(r.cpc) : (clicks > 0 ? cost / clicks : null),
      ctr: r.ctr != null && r.ctr !== '' ? Number(r.ctr) : (impressions > 0 ? (clicks / impressions) * 100 : null),
    };
  });
  campaigns.sort((a, b) => b.cost - a.cost);
  return campaigns;
}
