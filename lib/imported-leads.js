// ---------------------------------------------------------------------------
// Historiske / plattform-native leads (pre-sporing) — import + synk.
//
// Formål: gi marketing-dashbordet HELE forretningsbildet (også leads som kom
// inn før sporing, eller som opprettes manuelt direkte i plattformen), UTEN å
// sende dem som retroaktive konverteringer til Google/Meta.
//
// Lagres i egen kolleksjon `imported_leads` med flagg `pre_tracking:true`,
// slik at den LEVENDE sporings-/attribusjons-pipelinen holdes 100% ren.
// Disse skal ALDRI telles i betalt ROAS/CAC — kun i "totalt bilde"/organisk.
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';

export const IMPORTED_COLL = 'imported_leads';

// --- Normalisering -------------------------------------------------------
export function normEmail(e) {
  return (e || '').toString().trim().toLowerCase();
}
export function normPhoneDigits(p) {
  let d = (p || '').toString().replace(/\D/g, '');
  if (d.length === 8) d = '47' + d; // norsk 8-sifret → E.164 uten +
  return d;
}
export function last8(p) {
  const d = (p || '').toString().replace(/\D/g, '');
  return d.slice(-8);
}

const STATUS_MAP = {
  ny: 'new', new: 'new', open: 'new', 'åpen': 'new', apen: 'new',
  kontaktet: 'contacted', contacted: 'contacted',
  kvalifisert: 'qualified', qualified: 'qualified',
  // CRM-pipelinen: Ny → Kontaktet → Befaring → Tilbud sendt → Akseptert(=vunnet)
  befaring: 'viewing', viewing: 'viewing', visning: 'viewing',
  tilbud: 'offer', 'tilbud sendt': 'offer', tilbud_sendt: 'offer', offer: 'offer', offer_sent: 'offer', quoted: 'offer',
  akseptert: 'won', accepted: 'won',
  vunnet: 'won', won: 'won', signed: 'won', signert: 'won', closed_won: 'won', kunde: 'won',
  tapt: 'lost', lost: 'lost', closed_lost: 'lost', avvist: 'lost',
};
export const STATUSES = ['new', 'contacted', 'qualified', 'viewing', 'offer', 'won', 'lost'];
export function mapStatus(raw) {
  const r = (raw || '').toString().toLowerCase().trim();
  return STATUS_MAP[r] || (STATUSES.includes(r) ? r : 'new');
}

// Grov kanal-klassifisering (kun for visning/gruppering — ikke annonseattribusjon).
export function classifyChannel(raw) {
  const r = (raw || '').toString().toLowerCase().trim();
  if (!r) return 'unknown';
  if (/(meta|facebook|\bfb\b|instagram|\big\b)/.test(r)) return 'meta';
  if (/(google|adwords|\bgoogle ads\b|\bppc\b|\bsem\b)/.test(r)) return 'google';
  if (/finn/.test(r)) return 'finn';
  if (/(referral|anbefaling|word.?of.?mouth|munn til munn|venn)/.test(r)) return 'referral';
  if (/(phone|telefon|\btlf\b|\bcall\b|ring)/.test(r)) return 'phone';
  if (/(organic|organisk|direct|direkte|søk|search|seo)/.test(r)) return 'organic';
  if (/(email|e-?post|nyhetsbrev|newsletter)/.test(r)) return 'email';
  return 'unknown';
}

export function mapLeadType(raw) {
  const r = (raw || '').toString().toLowerCase().trim();
  if (/(leietaker|tenant|leie)/.test(r)) return 'leietaker';
  return 'huseier';
}

function parseDateIso(v) {
  if (!v) return null;
  const s = v.toString().trim();
  // Godta ISO, dd.mm.yyyy, dd/mm/yyyy, yyyy-mm-dd
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  const m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
  if (m) {
    let [, dd, mm, yy] = m;
    if (yy.length === 2) yy = '20' + yy;
    d = new Date(Number(yy), Number(mm) - 1, Number(dd));
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function parseNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v.toString().replace(/[^\d.,-]/g, '').replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) ? n : null;
}

// --- CSV-parser (håndterer ; eller , som skilletegn, siterte felt, BOM) ---
export function detectDelimiter(headerLine) {
  const c = (headerLine.match(/,/g) || []).length;
  const s = (headerLine.match(/;/g) || []).length;
  const t = (headerLine.match(/\t/g) || []).length;
  if (t >= c && t >= s) return '\t';
  return s > c ? ';' : ',';
}

export function parseCsv(text) {
  let src = (text || '').replace(/^\uFEFF/, ''); // strip BOM
  if (!src.trim()) return { headers: [], rows: [] };
  const firstLine = src.split(/\r?\n/)[0] || '';
  const delim = detectDelimiter(firstLine);
  const rows = [];
  let field = '', row = [], inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i], next = src[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delim) { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch === '\r') { /* skip */ }
      else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim());
  const body = rows.slice(1).filter((r) => r.some((c) => (c || '').trim() !== ''));
  const objs = body.map((r) => {
    const o = {};
    headers.forEach((h, idx) => { o[h] = (r[idx] != null ? r[idx] : '').trim(); });
    return o;
  });
  return { headers, rows: objs };
}

// Fleksibel kolonne-mapping: godtar norske + engelske varianter.
const FIELD_ALIASES = {
  platform_id: ['platform_id', 'platformid', 'id', 'lead_id', 'leadid', 'lead id'],
  external_ref: ['external_ref', 'externalref', 'external reference', 'ekstern_ref', 'marketing_ref'],
  source_system: ['source_system', 'sourcesystem', 'system', 'opphav'],
  name: ['name', 'navn', 'full_name', 'fullname', 'kontaktnavn', 'kontakt', 'fullt navn'],
  email: ['email', 'e-post', 'epost', 'e-mail', 'mail', 'e post'],
  phone: ['phone', 'telefon', 'tlf', 'mobil', 'mobile', 'telefonnummer', 'mobilnummer'],
  address: ['address', 'adresse', 'gateadresse', 'eiendom'],
  postal_code: ['postal_code', 'postnr', 'postnummer', 'zip', 'postcode', 'post nr'],
  preferred_area: ['preferred_area', 'desired_area', 'ønsket område', 'onsket omrade', 'områder', 'omrader'],
  budget_min: ['budget_min', 'min_budget', 'budsjett_min', 'minimum budsjett'],
  budget_max: ['budget_max', 'max_budget', 'budsjett_max', 'maks budsjett'],
  budget: ['budget', 'budsjett'],
  bedrooms: ['bedrooms', 'soverom', 'antall soverom'],
  move_in_date: ['move_in_date', 'movein', 'innflytting', 'innflyttingsdato'],
  status: ['status', 'stage', 'pipeline', 'fase', 'stadium'],
  created_at: ['created_at', 'created', 'opprettet', 'dato', 'date', 'registrert', 'opprettet_dato'],
  won_at: ['won_at', 'wonat', 'vunnet_dato', 'signert_dato', 'closed_date', 'kontraktsdato'],
  won_value: ['won_value', 'value', 'verdi', 'kontraktsverdi', 'amount', 'belop', 'beløp', 'omsetning', 'sum'],
  currency: ['currency', 'valuta'],
  channel: ['channel', 'kanal', 'source', 'kilde', 'lead_source', 'origin', 'utm_source'],
  lead_type: ['lead_type', 'leadtype', 'type', 'kundetype', 'kategori'],
};

function pickField(rowObj, aliases) {
  const lowerMap = {};
  for (const k of Object.keys(rowObj)) lowerMap[k.toLowerCase().trim()] = rowObj[k];
  for (const a of aliases) {
    if (lowerMap[a] != null && lowerMap[a] !== '') return lowerMap[a];
  }
  return '';
}

// Én rå rad (fra CSV eller API) → normalisert imported-lead-record.
export function normalizeRecord(rowObj, { channelHint } = {}) {
  const get = (key) => pickField(rowObj, FIELD_ALIASES[key] || [key]);
  const rawChannel = get('channel') || channelHint || '';
  const status = mapStatus(get('status'));
  const wonValue = parseNum(get('won_value'));
  const budgetCombined = (get('budget') || '').toString();
  const budgetNums = budgetCombined.match(/[\d\s.,]+/g) || [];
  const budgetMin = parseNum(get('budget_min')) ?? parseNum(budgetNums[0]);
  const budgetMax = parseNum(get('budget_max')) ?? parseNum(budgetNums.length > 1 ? budgetNums[budgetNums.length - 1] : budgetNums[0]);
  const rec = {
    platform_id: (get('platform_id') || '').toString().slice(0, 120) || null,
    external_ref: (get('external_ref') || '').toString().slice(0, 120) || null,
    source_system: (get('source_system') || 'platform').toString().slice(0, 60),
    name: (get('name') || '').toString().slice(0, 200),
    email: normEmail(get('email')),
    phone: (get('phone') || '').toString().slice(0, 60),
    address: (get('address') || '').toString().slice(0, 400),
    postal_code: (get('postal_code') || '').toString().slice(0, 20),
    preferred_area: (get('preferred_area') || get('address') || '').toString().slice(0, 500),
    budget_min: budgetMin,
    budget_max: budgetMax,
    bedrooms: parseNum(get('bedrooms')),
    move_in_date: parseDateIso(get('move_in_date')),
    status,
    lead_type: mapLeadType(get('lead_type')),
    channel: classifyChannel(rawChannel),
    channel_raw: (rawChannel || '').toString().slice(0, 80) || null,
    created_at: parseDateIso(get('created_at')),
    won_at: status === 'won' ? (parseDateIso(get('won_at')) || parseDateIso(get('created_at'))) : null,
    won_value: status === 'won' ? (wonValue != null ? Math.round(wonValue * 100) / 100 : null) : null,
    currency: (get('currency') || 'NOK').toString().slice(0, 3).toUpperCase(),
  };
  return rec;
}

// Bygg dedupe-nøkkel: platform_id > external_ref > email > telefon(siste 8).
function dedupeKey(rec) {
  if (rec.platform_id) return 'pid:' + rec.platform_id;
  if (rec.external_ref) return 'ext:' + rec.external_ref;
  if (rec.email) return 'em:' + rec.email;
  const l8 = last8(rec.phone);
  if (l8.length === 8) return 'ph:' + l8;
  return 'row:' + uuidv4(); // ingen id → alltid unik (kan ikke dedupe)
}

// Finn leaden i den LEVENDE (sporede) pipelinen. Da skal den IKKE importeres
// som historisk (unngå dobbelttelling) — men vi OPPDATERER status/vunnet på
// vår lead (lukket løkke: CRM-et er sannhetskilden for pipeline-status).
async function findTracked(db, rec) {
  const or = [];
  if (rec.external_ref) or.push({ id: rec.external_ref });
  if (rec.platform_id) or.push({ platform_id: rec.platform_id });
  if (rec.email) or.push({ email: rec.email });
  const l8 = last8(rec.phone);
  if (l8.length === 8) or.push({ phone: { $regex: `${l8}$` } });
  if (!or.length) return null;
  for (const c of ['leads', 'tenant_leads']) {
    const hit = await db.collection(c).findOne({ $or: or }, { projection: { _id: 0, id: 1, platform_status: 1, won_value: 1 } });
    if (hit) return { coll: c, id: hit.id };
  }
  return null;
}

// Importer et sett rå-rader. Dedup mot sporet pipeline + mot seg selv (upsert).
export async function importRecords(db, rawRows, { batchLabel, source = 'csv', channelHint } = {}) {
  const batchId = uuidv4();
  const importedAt = new Date().toISOString();
  const label = (batchLabel || `${source}-import`).toString().slice(0, 120);
  let inserted = 0, updated = 0, skippedTracked = 0, skippedEmpty = 0, updatedTracked = 0;
  const seen = new Set();

  for (const raw of rawRows) {
    const rec = normalizeRecord(raw, { channelHint });
    if (!rec.name && !rec.email && !rec.phone) { skippedEmpty++; continue; }
    // Allerede sporet → ikke importer (unngå dobbelttelling), men oppdater
    // vår lead med CRM-status/vunnet-data (lukket løkke).
    const tracked = await findTracked(db, rec);
    if (tracked) {
      skippedTracked++;
      try {
        const upd = {
          platform_status: rec.status,
          platform_status_updated_at: importedAt,
        };
        if (rec.platform_id) upd.platform_id = rec.platform_id;
        if (rec.status === 'won') {
          upd.won_at = rec.won_at || importedAt;
          if (rec.won_value != null) upd.won_value = rec.won_value;
        }
        const r = await db.collection(tracked.coll).updateOne({ id: tracked.id }, { $set: upd });
        if (r.modifiedCount) updatedTracked++;
      } catch (e) { /* status-oppdatering skal aldri velte importen */ }
      continue;
    }
    const key = dedupeKey(rec);
    if (seen.has(key)) { updated++; /* dublett i samme fil */ }
    seen.add(key);

    const doc = {
      ...rec,
      dedupe_key: key,
      pre_tracking: true,
      imported: true,
      import_source: source,
      import_batch_id: batchId,
      import_batch_label: label,
      imported_at: importedAt,
      updated_at: importedAt,
    };
    // Upsert på dedupe_key → idempotent (kjør synk flere ganger uten dublett).
    const res = await db.collection(IMPORTED_COLL).updateOne(
      { dedupe_key: key },
      {
        $set: {
          ...doc,
        },
        $setOnInsert: { id: uuidv4(), first_imported_at: importedAt },
      },
      { upsert: true }
    );
    if (res.upsertedCount) inserted++;
    else if (res.matchedCount) updated++;
  }

  return {
    ok: true,
    batchId, label, source,
    totalRows: rawRows.length,
    inserted, updated, skippedTracked, skippedEmpty, updatedTracked,
  };
}

// --- Manuell overstyring (kilde/verdi/status/notat) --------------------------
// Lagres i `override`-subdokumentet slik at de ALLTID overlever ny synk fra
// plattformen (synken $set-er kun plattform-feltene, aldri override.*).
const OVERRIDE_CHANNELS = ['google', 'meta', 'finn', 'referral', 'phone', 'organic', 'email', 'unknown'];
export async function updateImportedOverride(db, { id, ids, patch = {} }) {
  const list = (Array.isArray(ids) && ids.length ? ids : (id ? [id] : [])).map((x) => String(x).slice(0, 64)).slice(0, 500);
  if (!list.length) return { ok: false, error: 'Mangler id/ids' };
  const set = {};
  if (patch.channel !== undefined) {
    const ch = String(patch.channel || '').toLowerCase().trim();
    if (!OVERRIDE_CHANNELS.includes(ch)) return { ok: false, error: `Ugyldig kilde: ${ch}` };
    set['override.channel'] = ch;
  }
  if (patch.status !== undefined) {
    const st = mapStatus(patch.status);
    set['override.status'] = st;
  }
  if (patch.won_value !== undefined) {
    const v = patch.won_value === null || patch.won_value === '' ? null : Number(patch.won_value);
    if (v !== null && (!isFinite(v) || v < 0)) return { ok: false, error: 'Ugyldig verdi' };
    set['override.won_value'] = v;
  }
  if (patch.note !== undefined) set['override.note'] = String(patch.note || '').slice(0, 500);
  if (patch.marketing_ok !== undefined) set['override.marketing_ok'] = patch.marketing_ok === true;
  if (!Object.keys(set).length) return { ok: false, error: 'Ingen gyldige felt å oppdatere' };
  set['override.updated_at'] = new Date().toISOString();
  const r = await db.collection(IMPORTED_COLL).updateMany({ id: { $in: list } }, { $set: set });
  return { ok: true, changed: r.modifiedCount || 0, matched: r.matchedCount || 0 };
}

// Effektive felter = manuell overstyring der den finnes, ellers plattform-data.
const EFF_FIELDS = {
  eff_channel: { $ifNull: ['$override.channel', '$channel'] },
  eff_status: { $ifNull: ['$override.status', '$status'] },
  eff_won_value: { $ifNull: ['$override.won_value', '$won_value'] },
};

// Liste for Historikk-fanen (effektive felter + filtre + søk).
export async function listImported(db, { status, channel, q, limit = 100, skip = 0 } = {}) {
  const pipeline = [{ $addFields: EFF_FIELDS }];
  const match = {};
  if (status) match.eff_status = status;
  if (channel) match.eff_channel = channel;
  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ name: rx }, { email: rx }, { phone: rx }, { address: rx }];
  }
  if (Object.keys(match).length) pipeline.push({ $match: match });
  const [items, countArr] = await Promise.all([
    db.collection(IMPORTED_COLL).aggregate([
      ...pipeline,
      { $sort: { created_at: -1, imported_at: -1 } },
      { $skip: Math.max(Number(skip) || 0, 0) },
      { $limit: Math.min(Math.max(Number(limit) || 100, 1), 500) },
      { $project: { _id: 0 } },
    ]).toArray(),
    db.collection(IMPORTED_COLL).aggregate([...pipeline, { $count: 'n' }]).toArray(),
  ]);
  return { items, total: countArr[0]?.n || 0 };
}

// Aggregert oppsummering for dashbordet (adskilt "Historisk/usporet"-kohort).
export async function summarizeImported(db) {
  const coll = db.collection(IMPORTED_COLL);
  const total = await coll.countDocuments({});
  if (!total) {
    return {
      ok: true, total: 0, won: 0, wonValue: 0,
      byStatus: {}, byChannel: [], batches: [], range: { from: null, to: null },
      note: 'Ingen historiske leads importert ennå.',
    };
  }
  const effStage = { $addFields: { eff_channel: { $ifNull: ['$override.channel', '$channel'] }, eff_status: { $ifNull: ['$override.status', '$status'] }, eff_won_value: { $ifNull: ['$override.won_value', '$won_value'] } } };
  const agg = await coll.aggregate([
    effStage,
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        won: { $sum: { $cond: [{ $eq: ['$eff_status', 'won'] }, 1, 0] } },
        wonValue: { $sum: { $cond: [{ $eq: ['$eff_status', 'won'] }, { $ifNull: ['$eff_won_value', 0] }, 0] } },
      },
    },
  ]).toArray();
  const byStatusArr = await coll.aggregate([effStage, { $group: { _id: '$eff_status', n: { $sum: 1 } } }]).toArray();
  const byChannelArr = await coll.aggregate([
    effStage,
    { $group: { _id: '$eff_channel', leads: { $sum: 1 }, won: { $sum: { $cond: [{ $eq: ['$eff_status', 'won'] }, 1, 0] } }, wonValue: { $sum: { $cond: [{ $eq: ['$eff_status', 'won'] }, { $ifNull: ['$eff_won_value', 0] }, 0] } } } },
    { $sort: { leads: -1 } },
  ]).toArray();
  const batchesArr = await coll.aggregate([
    { $group: { _id: '$import_batch_id', label: { $first: '$import_batch_label' }, source: { $first: '$import_source' }, at: { $first: '$imported_at' }, n: { $sum: 1 } } },
    { $sort: { at: -1 } },
    { $limit: 50 },
  ]).toArray();
  const oldest = await coll.find({ created_at: { $ne: null } }).sort({ created_at: 1 }).limit(1).toArray();
  const newest = await coll.find({ created_at: { $ne: null } }).sort({ created_at: -1 }).limit(1).toArray();

  const byStatus = {};
  for (const s of byStatusArr) byStatus[s._id || 'unknown'] = s.n;

  const a = agg[0] || { total, won: 0, wonValue: 0 };
  return {
    ok: true,
    total: a.total,
    won: a.won,
    wonValue: Math.round((a.wonValue || 0) * 100) / 100,
    byStatus,
    byChannel: byChannelArr.map((c) => ({ channel: c._id || 'unknown', leads: c.leads, won: c.won, wonValue: Math.round((c.wonValue || 0) * 100) / 100 })),
    batches: batchesArr.map((b) => ({ batchId: b._id, label: b.label, source: b.source, at: b.at, count: b.n })),
    range: { from: oldest[0]?.created_at || null, to: newest[0]?.created_at || null },
    note: 'Historisk/usporet kohort — talt i totalbildet, men EKSKLUDERT fra betalt ROAS/CAC.',
  };
}

// Synk fra plattformens read-only export-API. Henter BÅDE eiere og
// leietakere; plattformversjoner har brukt ulike paths og responsformer.
// Idempotent: importRecords upserter på plattform-ID/external_ref/e-post/telefon.
export async function syncFromPlatform(db, { target, secret, since, until, channelHint, maxPages = 20, pageLimit = 200 } = {}) {
  if (!target) return { ok: false, error: 'Plattform-URL mangler (DIGIHOME_API_URL)' };
  const started = Date.now();
  const headers = { ...(secret ? { 'X-API-Key': secret, 'X-Webhook-Secret': secret, Authorization: `Bearer ${secret}` } : {}) };
  let lastStatus = null, lastError = null;

  const extractRows = (payload, { explicitTenant = false } = {}) => {
    if (Array.isArray(payload)) {
      const rows = payload;
      if (!explicitTenant) return rows;
      return rows.map((r) => ({ ...r, lead_type: r.lead_type || r.type || 'leietaker' }));
    }
    if (!payload || typeof payload !== 'object') return [];
    const rows = [];
    if (Array.isArray(payload.leads)) rows.push(...payload.leads);
    if (Array.isArray(payload.tenants)) rows.push(...payload.tenants.map((r) => ({ ...r, lead_type: r.lead_type || 'leietaker' })));
    if (Array.isArray(payload.tenant_leads)) rows.push(...payload.tenant_leads.map((r) => ({ ...r, lead_type: r.lead_type || 'leietaker' })));
    if (!rows.length && Array.isArray(payload.data)) rows.push(...payload.data);
    if (!rows.length && Array.isArray(payload.items)) rows.push(...payload.items);
    return explicitTenant ? rows.map((r) => ({ ...r, lead_type: r.lead_type || r.type || 'leietaker' })) : rows;
  };

  const fetchPath = async (path, { explicitTenant = false, requireTenantMarker = false } = {}) => {
    let cursor = null, page = 0, rows = [];
    do {
      const u = new URL(`${target}${path}`);
      if (since) u.searchParams.set('since', since);
      if (until) u.searchParams.set('until', until);
      u.searchParams.set('limit', String(pageLimit));
      if (cursor) u.searchParams.set('cursor', cursor);
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch(u.toString(), { headers, signal: ctrl.signal }).finally(() => clearTimeout(timer));
        lastStatus = res.status;
        if (!res.ok) { lastError = `HTTP ${res.status} på ${path}`; return null; }
        const payload = await res.json().catch(() => ({}));
        let pageRows = extractRows(payload, { explicitTenant });
        if (requireTenantMarker) {
          pageRows = pageRows
            .filter((r) => mapLeadType(r.lead_type || r.type || r.kundetype) === 'leietaker' ||
              !!(r.desired_area || r.preferred_area || r.budget || r.budget_max || r.move_in_date))
            .map((r) => ({ ...r, lead_type: r.lead_type || r.type || 'leietaker' }));
          if (!pageRows.length) return null; // query-param ble trolig ignorert
        }
        rows.push(...pageRows);
        cursor = payload?.nextCursor || payload?.next_cursor || null;
        page++;
      } catch (e) { lastError = e.message; return null; }
    } while (cursor && page < maxPages);
    return rows;
  };

  const ownerPaths = ['/api/leads/export', '/api/admin/leads/export', '/api/leads?export=1'];
  let ownerEndpoint = null, ownerRows = [];
  for (const path of ownerPaths) {
    const rows = await fetchPath(path);
    if (rows) { ownerEndpoint = path; ownerRows = rows; break; }
  }
  if (!ownerEndpoint) {
    return {
      ok: false,
      error: 'Fant ingen fungerende export-endepunkt på plattformen ennå.',
      detail: lastError, lastStatus,
      hint: 'Plattformen må eksponere GET /api/leads/export.',
    };
  }

  // Noen plattformversjoner returnerer tenants sammen med leads. Hvis ikke,
  // prøv egne tenant-endepunkter og til slutt eksplisitte type-filtre.
  let tenantRows = ownerRows.filter((r) => mapLeadType(r.lead_type || r.type || r.kundetype) === 'leietaker');
  let tenantEndpoint = tenantRows.length ? `${ownerEndpoint} (inkludert)` : null;
  if (!tenantRows.length) {
    const tenantPaths = [
      { path: '/api/tenants/export', explicitTenant: true },
      { path: '/api/admin/tenants/export', explicitTenant: true },
      { path: '/api/tenants?export=1', explicitTenant: true },
      { path: '/api/leads/export?type=tenant', requireTenantMarker: true },
      { path: '/api/leads/export?type=leietaker', requireTenantMarker: true },
      { path: '/api/leads/export?lead_type=leietaker', requireTenantMarker: true },
      { path: '/api/leads/export?lead_type=tenant', requireTenantMarker: true },
      { path: '/api/leads/export?kind=tenant', requireTenantMarker: true },
    ];
    for (const candidate of tenantPaths) {
      const rows = await fetchPath(candidate.path, candidate);
      if (rows?.length) { tenantEndpoint = candidate.path; tenantRows = rows; break; }
    }
  }

  const ownerOnly = ownerRows.filter((r) => mapLeadType(r.lead_type || r.type || r.kundetype) !== 'leietaker');
  const allRows = [...ownerOnly, ...tenantRows];
  const result = await importRecords(db, allRows, {
    batchLabel: `plattform-synk ${new Date().toISOString().slice(0, 10)}`,
    source: 'api', channelHint,
  });
  return {
    ...result,
    endpoint: ownerEndpoint,
    ownerEndpoint,
    tenantEndpoint,
    tenantSyncSupported: !!tenantEndpoint,
    fetched: allRows.length,
    fetchedOwners: ownerOnly.length,
    fetchedTenants: tenantRows.length,
    tenantWarning: tenantEndpoint ? null : 'Plattformen mangler et lesbart tenant-export-endepunkt.',
    tookMs: Date.now() - started,
  };
}
