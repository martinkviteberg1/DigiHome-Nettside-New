// ── BOLIGINTERESSE UT TIL DIGIHOME-PLATTFORMEN: SANNTID + SIKKERHETSNETT ────
//
// Plattformen eier samtalen med interessenten. Vi leverer på to kanaler, og de
// utfyller hverandre med vilje:
//
//   1. KØEN (platform_interest_outbox) skrives ALLTID først. Den er
//      sikkerhetsnettet plattformen puller hvert 15. minutt og kvitterer for.
//      Ingenting går tapt om nettet, en deploy eller et sertifikat svikter.
//   2. WEBHOOK forsøkes umiddelbart etterpå, slik at interessenten havner i
//      forvalterens «Interessenter»-innboks i SANNTID. En interessent som får
//      svar samme time konverterer; en som får svar i morgen er borte.
//
// Kontrakten er avtalt med plattformagenten (bro-tråd property-interest-dialog):
//   POST <base>/api/public/property-interest/incoming
//   body   { item: { ...outbox-item... } }
//   auth   x-digihome-signature: sha256=<hex HMAC-SHA256 over RÅ body>
//          (fallback: x-bridge-token) — begge med AGENT_BRIDGE_SECRET
//   idempotens  item.id · tråd-tilhørighet  contact.email + unitId
//   svar   200 { success: true, data: { status: created|appended|duplicate|unmatched, lead_id } }
//
// Vi retryer ALDRI inne i selve interesse-forespørselen: et menneske som melder
// interesse skal ikke vente på et annet system. Feiler webhooken, planlegges nytt
// forsøk med backoff (sveip via /api/cron/interest-webhook-retry), og posten blir
// liggende «pending» slik at plattformens pull tar den uansett.

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export const OUTBOX_COLL = 'platform_interest_outbox';

// Forsøksplan. Vi gir opp SANNTIDS-kanalen etter dette, aldri køen.
export const MAX_WEBHOOK_ATTEMPTS = 5;
const BACKOFF_MIN = [1, 5, 15, 60, 180];

// Merker QA-trafikk eksplisitt. Uten dette havner probe-personer i en ekte
// forvalters innboks, og da slutter innboksen å bli lest.
const TEST_MAIL_RE = /@(example\.(com|org|net|no)|test\.(no|com)|mailinator\.com)$/i;
export const isTestEmail = (email) => TEST_MAIL_RE.test(String(email || '').trim());

const hostOf = (u) => { try { return new URL(String(u)).host.toLowerCase(); } catch (e) { return ''; } };
const isPreviewHost = (h) => /\.preview\.emergentagent\.com$/i.test(String(h || ''));

export function ownHosts(env = process.env) {
  return [env.NEXT_PUBLIC_BASE_URL, env.NEXT_PUBLIC_CANONICAL_URL].map(hostOf).filter(Boolean);
}

// Kjører vi på produksjonsdomenet? Avgjør om vi får snakke med et preview hos
// plattformen: ekte interessenters navn og telefon skal ikke havne i et testmiljø,
// uansett hvor praktisk det er under utvikling.
export function isProdSite(env = process.env) {
  const h = hostOf(env.NEXT_PUBLIC_BASE_URL || '');
  return !!h && !isPreviewHost(h) && !/^(localhost|127\.0\.0\.1)/.test(h);
}

// Hvor skal sanntidspushen? Ikke konfigurert = køen alene. Det er en gyldig
// driftsmodus, ikke en feil.
export function webhookTarget(env = process.env) {
  const secret = String(env.AGENT_BRIDGE_SECRET || '').trim();
  const prod = isProdSite(env);
  const raw = String((prod ? env.DIGIHOME_INTEREST_WEBHOOK_URL_PROD : '') || env.DIGIHOME_INTEREST_WEBHOOK_URL || '').trim();
  if (!raw) return { ok: false, reason: 'webhook ikke konfigurert' };
  if (!secret) return { ok: false, reason: 'mangler delt hemmelighet' };
  const h = hostOf(raw);
  if (!h) return { ok: false, reason: 'ugyldig webhook-URL' };
  // Loopback-vern: DIGIHOME_API_URL peker i dag på vår egen preview, og en push
  // til oss selv ville laget en evig runddans uten at noen får meldingen.
  if (ownHosts(env).includes(h)) return { ok: false, reason: 'webhook peker på oss selv' };
  if (prod && isPreviewHost(h)) return { ok: false, reason: 'preview-endepunkt blokkert fra produksjon' };
  return { ok: true, url: raw, secret, host: h };
}

export function signBody(raw, secret) {
  return `sha256=${crypto.createHmac('sha256', String(secret)).update(String(raw), 'utf8').digest('hex')}`;
}

// Intern leveringsbokføring sendes ikke over tråden — plattformen skal lese
// interessen, ikke vår køtilstand.
const INTERNAL_FIELDS = new Set([
  '_id', 'status', 'webhookAttempts', 'webhookGaveUp', 'lastWebhookAt', 'lastWebhookHttp',
  'lastWebhookError', 'nextWebhookAt', 'deliveredAt', 'deliveredVia', 'platformRef', 'platformStatus',
]);
export function wireItem(item) {
  const out = {};
  for (const [k, v] of Object.entries(item || {})) if (!INTERNAL_FIELDS.has(k)) out[k] = v;
  return out;
}

export function buildInterestItem(leadDoc = {}, ev = {}, extra = {}) {
  const email = leadDoc.email || '';
  return {
    id: uuidv4(),
    leadId: leadDoc.id,
    platformLeadId: leadDoc.platform_id || null,
    unitId: ev.unitId || ev.propertyId,
    propertyId: ev.propertyId,
    localPropertyId: ev.localPropertyId || null,
    propertyTitle: ev.propertyTitle,
    propertyAddress: ev.propertyAddress,
    propertySlug: ev.propertySlug,
    propertyUrl: ev.propertyUrl,
    rentalScope: ev.rentalScope,
    scope: ev.scope,
    scopeLabel: ev.scopeLabel,
    message: ev.message || '',
    contact: { name: leadDoc.name || '', email, phone: leadDoc.phone || '' },
    source: ev.source,
    at: ev.at,
    ...(extra || {}),
    test: isTestEmail(email),
    status: 'pending',
    webhookAttempts: 0,
    createdAt: new Date().toISOString(),
  };
}

// Nettverksfeil og 5xx er forbigående — 4xx er vår feil og løses ikke av å
// prøve igjen. 429/408 er unntaket: de ber oss eksplisitt vente.
const isRetryableHttp = (s) => s === 0 || s >= 500 || s === 408 || s === 425 || s === 429;

export async function pushInterestWebhook(item, target = null, env = process.env) {
  const t = target || webhookTarget(env);
  if (!t.ok) return { attempted: false, reason: t.reason };
  const raw = JSON.stringify({ item: wireItem(item) });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Number(env.INTEREST_WEBHOOK_TIMEOUT_MS || 5000));
  try {
    const r = await fetch(t.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // HMAC over RÅ body — signaturen må dekke nøyaktig de bytene vi sender.
        'x-digihome-signature': signBody(raw, t.secret),
        'x-bridge-token': t.secret,
        'x-idempotency-key': String(item?.id || ''),
        'user-agent': 'digihome-marketing/interest-webhook',
      },
      body: raw,
      signal: ctrl.signal,
    });
    const text = await r.text().catch(() => '');
    let j = null; try { j = text ? JSON.parse(text) : null; } catch (e) { j = null; }
    const d = (j && (j.data || j.result)) || {};
    const ok = r.ok && j?.success !== false && j?.ok !== false;
    return {
      attempted: true,
      ok,
      http: r.status,
      platformRef: d.lead_id || d.leadId || d.id || null,
      // 'unmatched' = de lagret meldingen, men kjente ikke igjen enheten. Da
      // finnes ingen samtale PÅ boligen ennå, og det må forvalteren få se.
      platformStatus: d.status || null,
      error: ok ? null : String((j && (j.error || j.message)) || `HTTP ${r.status}`).slice(0, 200),
      retryable: ok ? false : isRetryableHttp(r.status),
    };
  } catch (e) {
    const aborted = e?.name === 'AbortError';
    return {
      attempted: true, ok: false, http: 0, retryable: true,
      error: String(aborted ? 'tidsavbrudd' : (e?.message || e)).slice(0, 200),
    };
  } finally { clearTimeout(timer); }
}

function backoffAt(attempts, now) {
  const min = BACKOFF_MIN[Math.min(attempts, BACKOFF_MIN.length) - 1] || BACKOFF_MIN[BACKOFF_MIN.length - 1];
  return new Date(now.getTime() + min * 60000).toISOString();
}

export async function applyWebhookResult(db, item, res, { attemptsBefore = 0 } = {}) {
  const now = new Date();
  const iso = now.toISOString();
  const attempts = Number(attemptsBefore || 0) + 1;
  const set = {
    lastWebhookAt: iso,
    lastWebhookHttp: Number(res.http || 0),
    lastWebhookError: res.error || null,
    webhookAttempts: attempts,
  };
  if (res.ok) {
    set.status = 'delivered';
    set.deliveredAt = iso;
    set.deliveredVia = 'webhook';
    set.platformRef = res.platformRef || null;
    set.platformStatus = res.platformStatus || null;
    set.nextWebhookAt = null;
    set.webhookGaveUp = false;
  } else if (!res.retryable || attempts >= MAX_WEBHOOK_ATTEMPTS) {
    // Vi slutter å pushe, men posten blir liggende «pending» slik at
    // plattformens 15-minutters pull tar den. Ingen interesse går tapt.
    set.webhookGaveUp = true;
    set.nextWebhookAt = null;
  } else {
    set.webhookGaveUp = false;
    set.nextWebhookAt = backoffAt(attempts, now);
  }
  await db.collection(OUTBOX_COLL).updateOne({ id: item.id }, { $set: set });
  return set;
}

// Legg i kø + push én gang. Kastes aldri: en boliginteresse skal lagres og
// kvitteres til brukeren selv om plattformen er nede.
export async function enqueueInterest(db, leadDoc, ev, extra = {}) {
  if (!db || !ev) return null;
  try {
    const doc = buildInterestItem(leadDoc, ev, extra);
    await db.collection(OUTBOX_COLL).insertOne({ ...doc });
    try {
      const res = await pushInterestWebhook(doc);
      if (res.attempted) await applyWebhookResult(db, doc, res, { attemptsBefore: 0 });
    } catch (e) { /* køen er sikkerhetsnettet — pullen tar den */ }
    return doc.id;
  } catch (e) { return null; }
}

// Sveip: nye forsøk på det sanntidskanalen bommet på. Kjøres av cron og kan
// trygt kjøres ofte — backoff og attempt-tak styrer arbeidsmengden.
export async function retryInterestWebhooks(db, { limit = 25 } = {}) {
  const t = webhookTarget();
  const base = { checked: 0, delivered: 0, retried: 0, gaveUp: 0, at: new Date().toISOString() };
  if (!t.ok) return { ok: true, skipped: t.reason, ...base };
  const nowIso = new Date().toISOString();
  const q = {
    status: 'pending',
    webhookGaveUp: { $ne: true },
    $and: [
      // Poster fra før webhooken fantes har ingen tellere — de skal med.
      { $or: [{ webhookAttempts: { $exists: false } }, { webhookAttempts: { $lt: MAX_WEBHOOK_ATTEMPTS } }] },
      { $or: [{ nextWebhookAt: null }, { nextWebhookAt: { $exists: false } }, { nextWebhookAt: { $lte: nowIso } }] },
    ],
  };
  const items = await db.collection(OUTBOX_COLL)
    .find(q, { projection: { _id: 0 } })
    .sort({ createdAt: 1 })
    .limit(Math.min(100, Math.max(1, Number(limit) || 25)))
    .toArray();
  const out = { ...base, checked: items.length, host: t.host };
  for (const it of items) {
    const res = await pushInterestWebhook(it, t);
    if (!res.attempted) break;
    const set = await applyWebhookResult(db, it, res, { attemptsBefore: Number(it.webhookAttempts || 0) });
    if (set.status === 'delivered') out.delivered += 1;
    else if (set.webhookGaveUp) out.gaveUp += 1;
    else out.retried += 1;
  }
  return { ok: true, ...out };
}

// ── HVOR FORVALTEREN SVARER ────────────────────────────────────────────────
// Plattformen oppretter samtalen på enheten (rental_leads) og sender svaret til
// interessenten SELV, med tokenlenke slik at hun kan svare uten innlogging. Vi
// lenker derfor dit i stedet for å drive en andre innboks.
// Basen må aldri bli oss selv (DIGIHOME_API_URL peker på vår egen preview), og
// aldri et testmiljø når vi kjører i produksjon.
export function platformAppBase(env = process.env) {
  const prod = isProdSite(env);
  const cands = prod
    ? [env.DIGIHOME_APP_URL_PROD, env.DIGIHOME_API_URL_PROD]
    : [env.DIGIHOME_APP_URL, env.DIGIHOME_APP_URL_PROD, env.DIGIHOME_API_URL_PROD];
  for (const c of cands) {
    const v = String(c || '').trim();
    if (!v) continue;
    let origin = '';
    try { origin = new URL(v).origin; } catch (e) { continue; }
    const h = hostOf(origin);
    if (!h || ownHosts(env).includes(h)) continue;
    if (prod && isPreviewHost(h)) continue;
    return origin;
  }
  return null;
}

// Deep-link til ÉN interessent-samtale (avtalt mønster hos plattformen).
export function platformThreadUrl(ref, env = process.env) {
  const base = platformAppBase(env);
  if (!base || !ref) return null;
  const pattern = String(env.DIGIHOME_THREAD_PATH || '/portal/meldinger/{ref}').trim();
  const path = pattern.replace('{ref}', encodeURIComponent(String(ref)));
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function platformInboxUrl(env = process.env) {
  const base = platformAppBase(env);
  if (!base) return null;
  const p = String(env.DIGIHOME_INBOX_PATH || '/portal/meldinger').trim();
  return `${base}${p.startsWith('/') ? p : `/${p}`}`;
}

// Per-bolig «Henvendelser» — nyttig når vi ennå ikke har en samtale-ID.
export function platformUnitUrl(unitId, env = process.env) {
  const base = platformAppBase(env);
  if (!base || !unitId) return null;
  const pattern = String(env.DIGIHOME_UNIT_PATH || '/utleie/{id}').trim();
  const path = pattern.replace('{id}', encodeURIComponent(String(unitId)));
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

// Leveringstilstand slik admin skal se den: hentet, i kø, eller trenger e-post.
// Uten dette gjetter forvalteren — og to svar til samme person er verre enn ingen.
export function deliveryView(q, unitId) {
  const ref = q?.platformRef || null;
  return {
    // 'ukjent' = interessen ble registrert før køen fantes. Da finnes ingen
    // samtale i plattformen, og forvalteren må svare på e-post.
    status: q ? (q.status || 'pending') : 'ukjent',
    via: q?.deliveredVia || null,
    queuedAt: q?.createdAt || null,
    deliveredAt: q?.deliveredAt || null,
    platformRef: ref,
    platformStatus: q?.platformStatus || null,
    attempts: Number(q?.webhookAttempts || 0),
    gaveUp: !!q?.webhookGaveUp,
    lastError: q?.lastWebhookError || null,
    threadUrl: platformThreadUrl(ref),
    inboxUrl: platformInboxUrl(),
    unitUrl: platformUnitUrl(unitId),
  };
}
