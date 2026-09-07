// ---------------------------------------------------------------------------
// INVESTOR-ROM (levende DD-rom) — magic links, audit-logg, dokumenthvelv, Q&A.
//
// Designprinsipper:
//  • Levende tall gjenbrukes fra finance/kpi-motoren (computeBoardPack) — én
//    sannhetskilde, aldri duplisert beregningslogikk.
//  • NULL PII: rommet viser kun aggregater. Leads/kunde-navn eksponeres aldri.
//  • Magic links: revokerbare, med utløp og seksjons-scoping per mottaker.
//  • Audit: hver visning/nedlasting/spørsmål logges per lenke («investoren
//    åpnet forecast 3 ganger denne uken» er et salgssignal).
//  • Dokumenter: metadata i Mongo, bytes i Emergent objektlagring (deploy-
//    trygt — /public kopieres ikke i standalone-bygg). Versjonering innebygd.
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export const LINKS_COLL = 'investor_links';
export const AUDIT_COLL = 'investor_audit';
export const DOCS_COLL = 'dd_documents';
export const QA_COLL = 'dd_questions';
export const CHUNKS_COLL = 'dd_upload_chunks';

export const DD_SECTIONS = ['metrics', 'economy', 'forecast', 'docs', 'qa', 'deck'];

// Lenkepassord: sha256(salt:pin). Kort PIN er greit — lenken er selv 192-bit hemmelig; passordet er
// et ekstra lag mot videresending. Verifiseres server-side, sesjon i httpOnly-cookie.
export const hashPin = (salt, pin) => crypto.createHash('sha256').update(`${salt}:${String(pin || '')}`).digest('hex');
export function verifyPin(link, pin) {
  if (!link?.pinHash) return true;
  const h = hashPin(link.pinSalt || '', pin);
  try { return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(link.pinHash)); } catch (e) { return false; }
}
// Cookie-verdi for godkjent PIN: hmac(token, pinHash) — ugyldig i samme sekund passordet endres/fjernes.
export const pinCookieValue = (link) => crypto.createHmac('sha256', link.pinHash || 'ingen').update(link.token).digest('base64url');

export const DD_CATEGORIES = [
  { key: 'selskap', label: 'Selskap & juridisk', hint: 'Stiftelsesdokument, vedtekter, aksjonæravtale, cap table' },
  { key: 'finans', label: 'Finans', hint: 'Regnskap, budsjett, kontoutskrifter, revisjonsrapporter' },
  { key: 'kommersielt', label: 'Kommersielt & marked', hint: 'Kundeavtaler (maler), prismodell, markedsanalyse' },
  { key: 'team', label: 'Team & organisasjon', hint: 'Org-kart, ansettelsesavtaler (maler), opsjonsprogram' },
  { key: 'produkt', label: 'Produkt & teknologi', hint: 'Arkitektur, roadmap, IP/varemerker' },
  { key: 'compliance', label: 'Compliance & personvern', hint: 'GDPR, databehandleravtaler, forsikring' },
  { key: 'annet', label: 'Annet', hint: 'Øvrige dokumenter' },
];
const CATEGORY_KEYS = DD_CATEGORIES.map((c) => c.key);

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per fil
const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'csv', 'txt', 'md', 'xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt', 'key', 'numbers', 'pages', 'zip'];

const nowIso = () => new Date().toISOString();

// ═══════════════════════════════════════════════════════════════════════════
// MAGIC LINKS
// ═══════════════════════════════════════════════════════════════════════════
// kind: 'room' (fullt investorrom) eller 'deck' (ren ekstern deck-lenke /deck/<token>, låst til én plan).
export async function createLink(db, { label, email, sections, expiresDays, note, pin, kind, planId, techPlanId } = {}) {
  const lbl = (label || '').toString().trim().slice(0, 120);
  if (!lbl) return { ok: false, error: 'Mangler navn/etikett på mottakeren' };
  const erDeck = kind === 'deck';
  const secs = erDeck ? ['deck'] : (Array.isArray(sections) && sections.length
    ? sections.filter((s) => DD_SECTIONS.includes(s))
    : [...DD_SECTIONS]);
  const days = Number(expiresDays);
  const expiresAt = isFinite(days) && days > 0
    ? new Date(Date.now() + Math.min(days, 365) * 86400000).toISOString()
    : null; // null = ingen utløp
  const link = {
    id: uuidv4(),
    // Deck-lenker får kortere, «ren» token (16 tegn, 96 bit) — URL-en skal tåle å leses høyt.
    token: crypto.randomBytes(erDeck ? 12 : 24).toString('base64url'),
    kind: erDeck ? 'deck' : 'room',
    label: lbl,
    email: (email || '').toString().trim().toLowerCase().slice(0, 200) || null,
    sections: secs,
    note: (note || '').toString().slice(0, 500) || null,
    planId: erDeck ? (String(planId || '').trim() || null) : null,
    techPlanId: erDeck ? (String(techPlanId || '').trim() || null) : null,
    expiresAt,
    revoked: false,
    createdAt: nowIso(),
    views: 0,
    lastViewedAt: null,
  };
  const pinStr = String(pin || '').trim();
  if (pinStr) {
    if (pinStr.length < 4 || pinStr.length > 64) return { ok: false, error: 'Passordet må være 4–64 tegn' };
    link.pinSalt = crypto.randomBytes(8).toString('hex');
    link.pinHash = hashPin(link.pinSalt, pinStr);
  }
  await db.collection(LINKS_COLL).insertOne({ ...link });
  return { ok: true, link: { ...link, pinHash: undefined, pinSalt: undefined, harPassord: Boolean(link.pinHash) } };
}

// Eksterne deck-lenker (kind 'deck') for én plan — med visningsstatistikk fra audit-loggen.
export async function listDeckShares(db, { planId } = {}) {
  const q = { kind: 'deck' };
  if (planId) q.planId = String(planId);
  const links = await db.collection(LINKS_COLL).find(q, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
  if (!links.length) return [];
  const ids = links.map((l) => l.id);
  const counts = await db.collection(AUDIT_COLL).aggregate([
    { $match: { linkId: { $in: ids }, event: { $in: ['deck_aapnet', 'deck_side', 'deck_nedlasting', 'deck_pin_feil'] } } },
    { $group: { _id: { linkId: '$linkId', event: '$event' }, n: { $sum: 1 }, sist: { $max: '$at' } } },
  ]).toArray();
  const by = {};
  for (const c of counts) { const lid = c._id.linkId; if (!by[lid]) by[lid] = {}; by[lid][c._id.event] = { n: c.n, sist: c.sist }; }
  return links.map(({ pinHash, pinSalt, ...l }) => ({
    ...l,
    harPassord: Boolean(pinHash),
    stats: {
      aapninger: by[l.id]?.deck_aapnet?.n || l.views || 0,
      sider: by[l.id]?.deck_side?.n || 0,
      nedlastinger: by[l.id]?.deck_nedlasting?.n || 0,
      feilPassord: by[l.id]?.deck_pin_feil?.n || 0,
      sistAktiv: [by[l.id]?.deck_side?.sist, by[l.id]?.deck_aapnet?.sist, l.lastViewedAt].filter(Boolean).sort().pop() || null,
    },
    status: l.revoked ? 'revoked' : (l.expiresAt && new Date(l.expiresAt) < new Date() ? 'expired' : 'active'),
  }));
}

export async function listLinks(db) {
  // Rene deck-lenker (kind 'deck') administreres fra decket selv — ikke fra investorrommet.
  const links = await db.collection(LINKS_COLL)
    .find({ kind: { $ne: 'deck' } }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
  // Aktivitets-teller per lenke (nedlastinger + spørsmål) fra audit-loggen.
  const counts = await db.collection(AUDIT_COLL).aggregate([
    { $group: { _id: { linkId: '$linkId', event: '$event' }, n: { $sum: 1 } } },
  ]).toArray();
  const byLink = {};
  for (const c of counts) {
    const lid = c._id.linkId;
    if (!byLink[lid]) byLink[lid] = {};
    byLink[lid][c._id.event] = c.n;
  }
  return links.map(({ pinHash, pinSalt, ...l }) => ({
    ...l,
    harPassord: Boolean(pinHash),
    stats: {
      views: byLink[l.id]?.view_room || l.views || 0,
      downloads: byLink[l.id]?.download_doc || 0,
      questions: byLink[l.id]?.ask_question || 0,
    },
    status: l.revoked ? 'revoked' : (l.expiresAt && new Date(l.expiresAt) < new Date() ? 'expired' : 'active'),
  }));
}

export async function updateLink(db, { id, patch = {} }) {
  if (!id) return { ok: false, error: 'Mangler id' };
  const set = {};
  if (patch.revoked !== undefined) set.revoked = patch.revoked === true;
  if (patch.label !== undefined) set.label = String(patch.label || '').trim().slice(0, 120);
  if (patch.note !== undefined) set.note = String(patch.note || '').slice(0, 500) || null;
  if (patch.sections !== undefined) {
    const secs = (Array.isArray(patch.sections) ? patch.sections : []).filter((s) => DD_SECTIONS.includes(s));
    if (!secs.length) return { ok: false, error: 'Minst én seksjon må være valgt' };
    set.sections = secs;
  }
  if (patch.expiresDays !== undefined) {
    const d = Number(patch.expiresDays);
    set.expiresAt = isFinite(d) && d > 0 ? new Date(Date.now() + Math.min(d, 365) * 86400000).toISOString() : null;
  }
  const unset = {};
  if (patch.pin !== undefined) {
    const pinStr = String(patch.pin || '').trim();
    if (!pinStr) { unset.pinHash = ''; unset.pinSalt = ''; set.pinEndretAt = nowIso(); }
    else {
      if (pinStr.length < 4 || pinStr.length > 64) return { ok: false, error: 'Passordet må være 4–64 tegn' };
      set.pinSalt = crypto.randomBytes(8).toString('hex');
      set.pinHash = hashPin(set.pinSalt, pinStr);
    }
  }
  if (!Object.keys(set).length && !Object.keys(unset).length) return { ok: false, error: 'Ingen felt å oppdatere' };
  set.updatedAt = nowIso();
  const r = await db.collection(LINKS_COLL).updateOne({ id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  if (!r.matchedCount) return { ok: false, error: 'Lenke ikke funnet' };
  return { ok: true };
}

export async function deleteLink(db, id) {
  if (!id) return { ok: false, error: 'Mangler id' };
  const r = await db.collection(LINKS_COLL).deleteOne({ id });
  return { ok: true, deleted: r.deletedCount };
}

// Valider et token fra ?t= — returnerer lenken eller null (revokert/utløpt).
export async function validateToken(db, token) {
  const t = (token || '').toString().trim();
  if (!t || t.length < 16 || t.length > 128) return null;
  const link = await db.collection(LINKS_COLL).findOne({ token: t }, { projection: { _id: 0 } });
  if (!link) return null;
  if (link.revoked) return { ...link, invalid: 'revoked' };
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) return { ...link, invalid: 'expired' };
  return link;
}

export async function recordView(db, linkId) {
  try {
    await db.collection(LINKS_COLL).updateOne({ id: linkId }, { $inc: { views: 1 }, $set: { lastViewedAt: nowIso() } });
  } catch (e) { /* best effort */ }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT-LOGG
// ═══════════════════════════════════════════════════════════════════════════
export async function logAudit(db, { linkId, label, event, meta, ua } = {}) {
  try {
    await db.collection(AUDIT_COLL).insertOne({
      id: uuidv4(),
      linkId: linkId || null,
      label: (label || '').toString().slice(0, 120) || null,
      event: (event || 'unknown').toString().slice(0, 40),
      meta: meta || null,
      ua: (ua || '').toString().slice(0, 300) || null,
      at: nowIso(),
    });
  } catch (e) { /* audit skal aldri velte forespørselen */ }
}

export async function listAudit(db, { linkId, limit = 100 } = {}) {
  const q = linkId ? { linkId } : {};
  return db.collection(AUDIT_COLL)
    .find(q, { projection: { _id: 0 } })
    .sort({ at: -1 })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 500))
    .toArray();
}

// ═══════════════════════════════════════════════════════════════════════════
// DOKUMENTHVELV — metadata + versjonering (bytes i objektlagring)
// ═══════════════════════════════════════════════════════════════════════════
export function validateFileMeta({ filename, size }) {
  const name = (filename || '').toString().trim();
  if (!name) return { ok: false, error: 'Mangler filnavn' };
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return { ok: false, error: `Filtypen .${ext} støttes ikke` };
  const s = Number(size);
  if (!isFinite(s) || s <= 0) return { ok: false, error: 'Ugyldig filstørrelse' };
  if (s > MAX_FILE_BYTES) return { ok: false, error: `Filen er for stor (maks ${Math.round(MAX_FILE_BYTES / 1048576)} MB)` };
  return { ok: true, ext };
}

export async function createDocument(db, { title, category, description, file }) {
  const cat = CATEGORY_KEYS.includes(category) ? category : 'annet';
  const doc = {
    id: uuidv4(),
    title: (title || file?.filename || 'Uten tittel').toString().slice(0, 200),
    category: cat,
    description: (description || '').toString().slice(0, 600) || null,
    currentVersion: 1,
    versions: [{ version: 1, ...file, uploadedAt: nowIso() }],
    archived: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.collection(DOCS_COLL).insertOne({ ...doc });
  return { ok: true, document: doc };
}

export async function addVersion(db, { docId, file }) {
  const doc = await db.collection(DOCS_COLL).findOne({ id: docId });
  if (!doc) return { ok: false, error: 'Dokument ikke funnet' };
  const version = (doc.currentVersion || doc.versions.length) + 1;
  await db.collection(DOCS_COLL).updateOne(
    { id: docId },
    {
      $push: { versions: { version, ...file, uploadedAt: nowIso() } },
      $set: { currentVersion: version, updatedAt: nowIso() },
    }
  );
  return { ok: true, version };
}

export async function listDocuments(db, { includeArchived = false } = {}) {
  const q = includeArchived ? {} : { archived: { $ne: true } };
  return db.collection(DOCS_COLL)
    .find(q, { projection: { _id: 0 } })
    .sort({ category: 1, updatedAt: -1 })
    .limit(500)
    .toArray();
}

export async function updateDocument(db, { id, patch = {} }) {
  if (!id) return { ok: false, error: 'Mangler id' };
  const set = {};
  if (patch.title !== undefined) set.title = String(patch.title || '').slice(0, 200);
  if (patch.description !== undefined) set.description = String(patch.description || '').slice(0, 600) || null;
  if (patch.category !== undefined) {
    if (!CATEGORY_KEYS.includes(patch.category)) return { ok: false, error: 'Ugyldig kategori' };
    set.category = patch.category;
  }
  if (patch.archived !== undefined) set.archived = patch.archived === true;
  if (!Object.keys(set).length) return { ok: false, error: 'Ingen felt å oppdatere' };
  set.updatedAt = nowIso();
  const r = await db.collection(DOCS_COLL).updateOne({ id }, { $set: set });
  if (!r.matchedCount) return { ok: false, error: 'Dokument ikke funnet' };
  return { ok: true };
}

export async function getDocument(db, id) {
  return db.collection(DOCS_COLL).findOne({ id }, { projection: { _id: 0 } });
}

export async function deleteDocument(db, id) {
  if (!id) return { ok: false, error: 'Mangler id' };
  const r = await db.collection(DOCS_COLL).deleteOne({ id });
  return { ok: true, deleted: r.deletedCount };
}

// Investor-vennlig visning: kun metadata (aldri objectPath internals utover id).
export function publicDocumentView(doc) {
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    description: doc.description,
    version: doc.currentVersion,
    filename: doc.versions?.[doc.versions.length - 1]?.filename || null,
    size: doc.versions?.[doc.versions.length - 1]?.size || null,
    updatedAt: doc.updatedAt,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CHUNKED UPLOAD — omgår proxy-grenser. Klienten sender ~1MB binær per chunk
// (base64), vi setter sammen ved complete og laster opp til objektlagring.
// ═══════════════════════════════════════════════════════════════════════════
export async function saveChunk(db, { uploadId, index, data }) {
  const uid = (uploadId || '').toString().slice(0, 64);
  const idx = Number(index);
  if (!uid || !isFinite(idx) || idx < 0 || idx > 200) return { ok: false, error: 'Ugyldig chunk' };
  const b64 = (data || '').toString();
  if (!b64 || b64.length > 2 * 1024 * 1024) return { ok: false, error: 'Chunk for stor (maks ~1.5MB binær)' };
  await db.collection(CHUNKS_COLL).updateOne(
    { uploadId: uid, index: idx },
    { $set: { uploadId: uid, index: idx, data: b64, at: nowIso() } },
    { upsert: true }
  );
  // Best effort-opprydding av forlatte chunks (> 24 t gamle)
  try {
    const cutoff = new Date(Date.now() - 24 * 3600000).toISOString();
    await db.collection(CHUNKS_COLL).deleteMany({ at: { $lt: cutoff } });
  } catch (e) {}
  return { ok: true, index: idx };
}

export async function assembleChunks(db, { uploadId, total }) {
  const uid = (uploadId || '').toString().slice(0, 64);
  const n = Number(total);
  if (!uid || !isFinite(n) || n < 1 || n > 200) return { ok: false, error: 'Ugyldig opplasting' };
  const chunks = await db.collection(CHUNKS_COLL)
    .find({ uploadId: uid }).sort({ index: 1 }).toArray();
  if (chunks.length !== n) return { ok: false, error: `Mangler chunks (${chunks.length}/${n} mottatt)` };
  const buffers = chunks.map((c) => Buffer.from(c.data, 'base64'));
  const buffer = Buffer.concat(buffers);
  if (buffer.length > MAX_FILE_BYTES) return { ok: false, error: 'Filen er for stor (maks 15 MB)' };
  return { ok: true, buffer };
}

export async function cleanupChunks(db, uploadId) {
  try { await db.collection(CHUNKS_COLL).deleteMany({ uploadId }); } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════════════════
// Q&A — investorspørsmål med svar-logg (som i ekte DD-rom)
// ═══════════════════════════════════════════════════════════════════════════
export async function askQuestion(db, { linkId, label, question }) {
  const q = (question || '').toString().trim().slice(0, 2000);
  if (q.length < 5) return { ok: false, error: 'Skriv et spørsmål (minst 5 tegn)' };
  const doc = {
    id: uuidv4(),
    linkId: linkId || null,
    label: (label || '').toString().slice(0, 120) || null,
    question: q,
    askedAt: nowIso(),
    answer: null,
    answeredAt: null,
    isPublic: false, // admin kan dele svaret med alle lenker
  };
  await db.collection(QA_COLL).insertOne({ ...doc });
  return { ok: true, question: doc };
}

// For investoren: egne spørsmål + spørsmål admin har markert som delte.
export async function listQuestionsForLink(db, linkId) {
  return db.collection(QA_COLL)
    .find({ $or: [{ linkId }, { isPublic: true }] }, { projection: { _id: 0, linkId: 0 } })
    .sort({ askedAt: -1 }).limit(200).toArray();
}

export async function listAllQuestions(db) {
  return db.collection(QA_COLL)
    .find({}, { projection: { _id: 0 } })
    .sort({ answeredAt: 1, askedAt: -1 }) // ubesvarte først
    .limit(500).toArray();
}

export async function answerQuestion(db, { id, answer, isPublic }) {
  if (!id) return { ok: false, error: 'Mangler id' };
  const set = {};
  if (answer !== undefined) {
    const a = String(answer || '').trim().slice(0, 5000);
    set.answer = a || null;
    set.answeredAt = a ? nowIso() : null;
  }
  if (isPublic !== undefined) set.isPublic = isPublic === true;
  if (!Object.keys(set).length) return { ok: false, error: 'Ingen felt å oppdatere' };
  const r = await db.collection(QA_COLL).updateOne({ id }, { $set: set });
  if (!r.matchedCount) return { ok: false, error: 'Spørsmål ikke funnet' };
  return { ok: true };
}

export async function deleteQuestion(db, id) {
  if (!id) return { ok: false, error: 'Mangler id' };
  const r = await db.collection(QA_COLL).deleteOne({ id });
  return { ok: true, deleted: r.deletedCount };
}
