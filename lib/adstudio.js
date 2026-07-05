// ---------------------------------------------------------------------------
// Annonsestudio — Meta Marketing API (skrivelag).
// Oppretter annonsebilder, creatives og annonser (alltid PAUSED først).
// Bruker META_AD_ACCOUNT_ID (act_XXXX) + META_SYSTEM_USER_TOKEN (verifisert
// med skrivetilgang). Alle opprettelser støtter validate_only (Metas egen
// validering uten å faktisk opprette noe).
// ---------------------------------------------------------------------------
const VER = process.env.META_API_VERSION || 'v21.0';
const ACC = () => process.env.META_AD_ACCOUNT_ID || '';
const TOKEN = () => process.env.META_SYSTEM_USER_TOKEN || '';
const BASE = `https://graph.facebook.com/${VER}`;

export function adstudioConfigured() {
  return !!(ACC() && TOKEN());
}

function metaError(j, status) {
  const e = j && j.error;
  const msg = (e && (e.error_user_msg || e.message)) || `Meta API ${status}`;
  const err = new Error(msg);
  err.metaCode = e && e.code;
  err.metaSubcode = e && e.error_subcode;
  return err;
}

async function gGET(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
  url.searchParams.set('access_token', TOKEN());
  const res = await fetch(url.toString());
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw metaError(j, res.status);
  return j;
}

async function gPOST(path, body = {}) {
  const form = new URLSearchParams();
  Object.entries(body).forEach(([k, v]) => {
    if (v == null) return;
    form.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  });
  form.set('access_token', TOKEN());
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw metaError(j, res.status);
  return j;
}

// --- Kontekst: konto, side, kampanjer + annonsesett (for veiviser-steg 1) ---
export async function fetchAdStudioContext() {
  const [account, pages, campaigns, adsets] = await Promise.all([
    gGET(`/${ACC()}`, { fields: 'name,currency,account_status' }),
    gGET('/me/accounts', { fields: 'id,name' }),
    gGET(`/${ACC()}/campaigns`, {
      fields: 'id,name,status,effective_status,objective,special_ad_categories,daily_budget,lifetime_budget,created_time',
      limit: '100',
    }),
    gGET(`/${ACC()}/adsets`, {
      fields: 'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,optimization_goal,billing_event,destination_type,promoted_object,targeting{geo_locations,age_min,age_max}',
      limit: '200',
    }),
  ]);
  const page = (pages.data || [])[0] || null;
  const setsByCampaign = {};
  (adsets.data || []).forEach((s) => {
    const t = s.targeting || {};
    const geo = t.geo_locations || {};
    const cities = (geo.cities || []).map((c) => c.name).filter(Boolean);
    const countries = geo.countries || [];
    (setsByCampaign[s.campaign_id] = setsByCampaign[s.campaign_id] || []).push({
      id: s.id,
      name: s.name,
      status: s.effective_status || s.status,
      dailyBudget: s.daily_budget ? Number(s.daily_budget) / 100 : null,
      lifetimeBudget: s.lifetime_budget ? Number(s.lifetime_budget) / 100 : null,
      optimizationGoal: s.optimization_goal || null,
      destinationType: s.destination_type || null,
      geo: cities.length ? cities.join(', ') : countries.join(', '),
      age: t.age_min ? `${t.age_min}–${t.age_max || '65+'}` : null,
    });
  });
  const camps = (campaigns.data || [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      status: c.effective_status || c.status,
      objective: c.objective || null,
      specialAdCategories: c.special_ad_categories || [],
      dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
      adsets: (setsByCampaign[c.id] || []),
    }))
    // Aktive kampanjer med leads-mål først — det er dit nye annonser normalt skal.
    .sort((a, b) => {
      const rank = (x) => (x.status === 'ACTIVE' ? 0 : 1) + (String(x.objective).includes('LEAD') ? 0 : 0.5);
      return rank(a) - rank(b);
    });
  return {
    account: { id: ACC(), name: account.name, currency: account.currency || 'NOK' },
    page: page ? { id: page.id, name: page.name } : null,
    campaigns: camps,
  };
}

// --- Last opp annonsebilde (buffer → image_hash) --------------------------
export async function uploadAdImage(buf, filename = 'annonse.jpg') {
  const j = await gPOST(`/${ACC()}/adimages`, { bytes: buf.toString('base64'), name: filename });
  const images = j.images || {};
  const first = images[Object.keys(images)[0]] || {};
  if (!first.hash) throw new Error('Meta returnerte ingen image_hash');
  return { hash: first.hash, url: first.url || null, width: first.width || null, height: first.height || null };
}

// --- Bygg creative-spec (gjenbrukes av preview + create) -------------------
export function buildCreativeSpec({ pageId, link, message, headline, description, imageHash, cta = 'LEARN_MORE' }) {
  return {
    object_story_spec: {
      page_id: pageId,
      link_data: {
        link,
        message,
        name: headline,
        description: description || undefined,
        image_hash: imageHash,
        call_to_action: { type: cta, value: { link } },
      },
    },
    // Sporing: Metas dynamiske plassholdere fylles ved visning — kampanje-/
    // annonsenavn flyter automatisk inn i vår UTM-attribusjon.
    url_tags: 'utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}',
  };
}

// --- Ekte Meta-forhåndsvisning (iframe-HTML) uten å opprette noe -----------
export async function generatePreviews(creativeSpec, formats = ['DESKTOP_FEED_STANDARD', 'MOBILE_FEED_STANDARD', 'INSTAGRAM_STANDARD']) {
  const out = [];
  for (const f of formats) {
    try {
      const j = await gGET(`/${ACC()}/generatepreviews`, {
        creative: JSON.stringify(creativeSpec),
        ad_format: f,
      });
      const body = j.data && j.data[0] && j.data[0].body;
      if (body) out.push({ format: f, html: body });
    } catch (e) {
      out.push({ format: f, error: e.message });
    }
  }
  return out;
}

// --- Opprett creative + annonse (PAUSED). validateOnly → ingenting lagres --
export async function createStudioAd({ adsetId, adName, creativeSpec, validateOnly = false }) {
  const exec = validateOnly ? { execution_options: ['validate_only'] } : {};
  const creative = await gPOST(`/${ACC()}/adcreatives`, {
    name: `${adName} — creative`,
    ...creativeSpec,
    ...exec,
  });
  if (validateOnly) {
    // Valider også selve annonse-objektet mot annonsesettet (uten creative-id
    // kan vi ikke validere ad-endepunktet fullt; creative-valideringen er den
    // strengeste og fanger policy-/formatfeil).
    return { validated: true };
  }
  const ad = await gPOST(`/${ACC()}/ads`, {
    name: adName,
    adset_id: adsetId,
    creative: { creative_id: creative.id },
    status: 'PAUSED',
  });
  return { creativeId: creative.id, adId: ad.id };
}

// --- Pause/aktiver annonse --------------------------------------------------
export async function setAdStatus(adId, status) {
  if (!['ACTIVE', 'PAUSED'].includes(status)) throw new Error('Ugyldig status');
  await gPOST(`/${adId}`, { status });
  return true;
}

// --- Live status + nøkkeltall for studio-annonser ---------------------------
export async function fetchAdsLive(adIds = []) {
  const out = {};
  await Promise.all(adIds.map(async (id) => {
    try {
      const j = await gGET(`/${id}`, {
        fields: 'id,name,status,effective_status,adset_id,campaign_id,insights.date_preset(last_30d){spend,impressions,clicks,ctr,actions}',
      });
      const ins = j.insights && j.insights.data && j.insights.data[0];
      const leadAction = ins && (ins.actions || []).find((a) => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');
      out[id] = {
        status: j.effective_status || j.status,
        spend: ins ? Number(ins.spend) || 0 : 0,
        impressions: ins ? Number(ins.impressions) || 0 : 0,
        clicks: ins ? Number(ins.clicks) || 0 : 0,
        ctr: ins ? Number(ins.ctr) || 0 : 0,
        leads: leadAction ? Number(leadAction.value) || 0 : 0,
      };
    } catch (e) {
      out[id] = { status: 'UKJENT', error: e.message };
    }
  }));
  return out;
}
