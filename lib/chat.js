// ─────────────────────────────────────────────────────────────────────────────
// TEAMCHAT — intern chat for portalen (owner/admin/bruker/partner).
// Én global kanal («generelt») nå, men datamodellen er kanal-klar slik at
// #budsjett, #salg osv. kan legges til senere uten omskriving.
//
//   chat_messages: {id, kanal, userId, userName, text, mentions:[{id,name}], createdAt}
//   chat_lest:     {userId, kanal, lastReadAt}
//
// Varsling ved @-tagging (e-post + in-app) skjer i route-laget — dette laget
// er ren datalogikk slik at det kan testes uten HTTP.
// ─────────────────────────────────────────────────────────────────────────────
import { v4 as uuidv4 } from 'uuid';

export const CHAT_COLL = 'chat_messages';
export const CHAT_LEST_COLL = 'chat_lest';
export const CHAT_STD_KANAL = 'generelt';
export const CHAT_INTERNE_ROLLER = ['owner', 'admin', 'bruker', 'partner'];

const rensKanal = (k) => {
  const s = String(k || CHAT_STD_KANAL).toLowerCase().replace(/[^a-z0-9æøå-]/g, '').slice(0, 40);
  return s || CHAT_STD_KANAL;
};

export async function listMeldinger(db, { kanal, etter, grense = 100 } = {}) {
  const filter = { kanal: rensKanal(kanal) };
  if (etter) filter.createdAt = { $gt: String(etter) };
  const N = Math.min(200, Math.max(1, Math.round(grense) || 100));
  // Nyeste først fra DB (rask på indeks), snus til kronologisk for UI.
  const docs = await db.collection(CHAT_COLL)
    .find(filter, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(N)
    .toArray();
  return docs.reverse();
}

export async function nyMelding(db, { kanal, userId, userName, text, mentions = [] } = {}) {
  const tekst = String(text || '').trim().slice(0, 4000);
  if (!tekst) return { ok: false, error: 'Meldingen kan ikke være tom', status: 400 };
  if (!userId) return { ok: false, error: 'Mangler avsender', status: 400 };

  // Valider mentions mot interne brukere — kun {id, name} lagres.
  let gyldige = [];
  const inn = (Array.isArray(mentions) ? mentions : []).map((m) => String(m?.id || m || '')).filter(Boolean).slice(0, 20);
  if (inn.length) {
    const brukere = await db.collection('admin_users')
      .find({ id: { $in: inn }, role: { $in: CHAT_INTERNE_ROLLER } }, { projection: { _id: 0, id: 1, name: 1, email: 1 } })
      .toArray();
    gyldige = brukere.map((b) => ({ id: b.id, name: String(b.name || '').slice(0, 80), email: b.email || null }));
  }

  const melding = {
    id: uuidv4(),
    kanal: rensKanal(kanal),
    userId: String(userId).slice(0, 80),
    userName: String(userName || 'Ukjent').slice(0, 80),
    text: tekst,
    mentions: gyldige.map(({ id, name }) => ({ id, name })), // e-post lagres IKKE på meldingen
    createdAt: new Date().toISOString(),
  };
  await db.collection(CHAT_COLL).insertOne({ ...melding });
  // Avsenderen har naturligvis lest sin egen melding.
  await merkLest(db, { kanal: melding.kanal, userId: melding.userId });
  return { ok: true, melding, mottakere: gyldige };
}

export async function slettMelding(db, { id, userId, erAdmin } = {}) {
  const doc = await db.collection(CHAT_COLL).findOne({ id: String(id || '') }, { projection: { _id: 0, userId: 1 } });
  if (!doc) return { ok: false, error: 'Ikke funnet', status: 404 };
  if (!erAdmin && doc.userId !== userId) return { ok: false, error: 'Kan bare slette egne meldinger', status: 403 };
  await db.collection(CHAT_COLL).deleteOne({ id: String(id) });
  return { ok: true };
}

export async function merkLest(db, { kanal, userId } = {}) {
  if (!userId) return { ok: false, error: 'Mangler bruker', status: 400 };
  const k = rensKanal(kanal);
  await db.collection(CHAT_LEST_COLL).updateOne(
    { userId: String(userId), kanal: k },
    { $set: { userId: String(userId), kanal: k, lastReadAt: new Date().toISOString() } },
    { upsert: true },
  );
  return { ok: true };
}

export async function hentStatus(db, { kanal, userId } = {}) {
  const k = rensKanal(kanal);
  const lest = userId
    ? await db.collection(CHAT_LEST_COLL).findOne({ userId: String(userId), kanal: k }, { projection: { _id: 0, lastReadAt: 1 } })
    : null;
  const filter = { kanal: k };
  if (lest?.lastReadAt) filter.createdAt = { $gt: lest.lastReadAt };
  if (userId) filter.userId = { $ne: String(userId) }; // egne meldinger teller ikke som uleste
  const ulest = await db.collection(CHAT_COLL).countDocuments(filter, { limit: 100 });
  const siste = await db.collection(CHAT_COLL)
    .find({ kanal: k }, { projection: { _id: 0, createdAt: 1 } })
    .sort({ createdAt: -1 }).limit(1).toArray();
  return { ok: true, ulest, sisteAt: siste[0]?.createdAt || null };
}
