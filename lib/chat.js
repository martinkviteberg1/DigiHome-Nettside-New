// ─────────────────────────────────────────────────────────────────────────────
// TEAMCHAT — intern chat for portalen (owner/admin/bruker/partner).
// Én global kanal («generelt») nå, men datamodellen er kanal-klar slik at
// #budsjett, #salg osv. kan legges til senere uten omskriving.
//
//   chat_messages: {id, kanal, userId, userName, text, mentions:[{id,name}],
//                   threadId (null = rotmelding), traadNavn (kun rot, valgfri),
//                   sakId (kun rot — kobling til sak), createdAt}
//   chat_lest:     {userId, kanal, lastReadAt}
//
// TRÅDER: en melding kan besvares i tråd. Hovedstrømmen viser kun rotmeldinger
// (threadId null/mangler) med aggregert trådinfo {antall, sisteAt, navn}.
// Svar på et svar normaliseres til rot-tråden (ingen nestede tråder).
// Tråder kan navngis (traadNavn) og kobles til en sak (sakId) — se
// oppdaterTraad. listTraader gir oversikten (sortert på siste aktivitet,
// med uleste per tråd og sakstittel slått opp i én spørring).
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

export async function listMeldinger(db, { kanal, etter, grense = 100, threadId } = {}) {
  const k = rensKanal(kanal);

  // Trådvisning: rotmeldingen + alle svar, kronologisk. Roten berikes med
  // sak-kobling {id, title, status} slik at UI slipper en ekstra rundtur.
  if (threadId) {
    const tid = String(threadId);
    const docs = await db.collection(CHAT_COLL)
      .find({ kanal: k, $or: [{ id: tid }, { threadId: tid }] }, { projection: { _id: 0 } })
      .sort({ createdAt: 1 })
      .limit(300)
      .toArray();
    const rot = docs.find((d) => !d.threadId);
    if (rot?.sakId) {
      const sak = await db.collection('tasks').findOne({ id: rot.sakId }, { projection: { _id: 0, id: 1, title: 1, status: 1 } });
      if (sak) rot.sak = sak;
    }
    return docs;
  }

  // Hovedstrøm: kun rotmeldinger ({threadId: null} matcher både null og manglende felt).
  const filter = { kanal: k, threadId: null };
  if (etter) filter.createdAt = { $gt: String(etter) };
  const N = Math.min(200, Math.max(1, Math.round(grense) || 100));
  // Nyeste først fra DB (rask på indeks), snus til kronologisk for UI.
  const docs = await db.collection(CHAT_COLL)
    .find(filter, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(N)
    .toArray();
  docs.reverse();

  // Aggregert trådinfo på rotmeldingene (antall svar, siste svar, hvem).
  const ids = docs.map((d) => d.id);
  if (ids.length) {
    const agg = await db.collection(CHAT_COLL).aggregate([
      { $match: { kanal: k, threadId: { $in: ids } } },
      { $group: { _id: '$threadId', antall: { $sum: 1 }, sisteAt: { $max: '$createdAt' }, navn: { $addToSet: '$userName' } } },
    ]).toArray();
    const perTraad = new Map(agg.map((a) => [a._id, a]));
    for (const d of docs) {
      const t = perTraad.get(d.id);
      if (t) d.traad = { antall: t.antall, sisteAt: t.sisteAt, navn: (t.navn || []).slice(0, 4) };
    }
  }
  return docs;
}

export async function nyMelding(db, { kanal, userId, userName, text, mentions = [], threadId } = {}) {
  const tekst = String(text || '').trim().slice(0, 4000);
  if (!tekst) return { ok: false, error: 'Meldingen kan ikke være tom', status: 400 };
  if (!userId) return { ok: false, error: 'Mangler avsender', status: 400 };
  const k = rensKanal(kanal);

  // Trådsvar: valider at målet finnes i samme kanal — og normaliser til roten
  // (svar på et svar havner i samme tråd, aldri nestede tråder).
  let rotId = null;
  let rotDoc = null;
  if (threadId) {
    const maal = await db.collection(CHAT_COLL).findOne(
      { id: String(threadId), kanal: k },
      { projection: { _id: 0, id: 1, threadId: 1 } },
    );
    if (!maal) return { ok: false, error: 'Tråden finnes ikke', status: 404 };
    rotId = maal.threadId || maal.id;
    rotDoc = await db.collection(CHAT_COLL).findOne(
      { id: rotId },
      { projection: { _id: 0, id: 1, userId: 1, userName: 1, text: 1, traadNavn: 1 } },
    );
  }

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
    kanal: k,
    userId: String(userId).slice(0, 80),
    userName: String(userName || 'Ukjent').slice(0, 80),
    text: tekst,
    mentions: gyldige.map(({ id, name }) => ({ id, name })), // e-post lagres IKKE på meldingen
    threadId: rotId,
    createdAt: new Date().toISOString(),
  };
  await db.collection(CHAT_COLL).insertOne({ ...melding });
  // Avsenderen har naturligvis lest sin egen melding.
  await merkLest(db, { kanal: melding.kanal, userId: melding.userId });
  // Trådsvar: samle deltakere (rotforfatter + alle som har svart) slik at
  // route-laget kan sende «nytt svar i tråden»-varsler (kun in-app, aldri e-post).
  let traadInfo = null;
  if (rotId && rotDoc) {
    const deltakerIds = await db.collection(CHAT_COLL).distinct('userId', {
      kanal: k, $or: [{ id: rotId }, { threadId: rotId }],
    });
    traadInfo = {
      rotId,
      navn: rotDoc.traadNavn || null,
      rotTekst: String(rotDoc.text || '').slice(0, 80),
      deltakerIds: deltakerIds.filter(Boolean),
    };
  }
  return { ok: true, melding, mottakere: gyldige, traad: traadInfo };
}

// Navngi tråden og/eller koble den til en sak. Kun rotmeldinger — sakId
// valideres mot tasks-samlingen (aldri blind kobling).
export async function oppdaterTraad(db, { id, navn, sakId } = {}) {
  const rot = await db.collection(CHAT_COLL).findOne(
    { id: String(id || ''), threadId: null },
    { projection: { _id: 0, id: 1 } },
  );
  if (!rot) return { ok: false, error: 'Tråden finnes ikke', status: 404 };
  const set = {};
  let sak = null;
  if (navn !== undefined) set.traadNavn = String(navn || '').trim().slice(0, 80) || null;
  if (sakId !== undefined) {
    if (sakId) {
      sak = await db.collection('tasks').findOne({ id: String(sakId) }, { projection: { _id: 0, id: 1, title: 1, status: 1 } });
      if (!sak) return { ok: false, error: 'Saken finnes ikke', status: 404 };
      set.sakId = sak.id;
    } else {
      set.sakId = null;
    }
  }
  if (!Object.keys(set).length) return { ok: false, error: 'Ingenting å oppdatere', status: 400 };
  await db.collection(CHAT_COLL).updateOne({ id: rot.id }, { $set: set });
  return { ok: true, traadNavn: set.traadNavn !== undefined ? set.traadNavn : undefined, sak };
}

// Trådoversikten: alle tråder (rotmeldinger med svar, navn eller sak-kobling),
// sortert på siste aktivitet. Uleste per tråd = svar fra andre nyere enn
// brukerens lesetidspunkt. Sakstitler slås opp i én samlet spørring.
export async function listTraader(db, { kanal, userId, sakId } = {}) {
  const k = rensKanal(kanal);
  const agg = await db.collection(CHAT_COLL).aggregate([
    { $match: { kanal: k, threadId: { $ne: null } } },
    { $group: { _id: '$threadId', antall: { $sum: 1 }, sisteAt: { $max: '$createdAt' }, navn: { $addToSet: '$userName' } } },
  ]).toArray();
  const perTraad = new Map(agg.map((a) => [a._id, a]));

  const rotFilter = sakId
    ? { kanal: k, threadId: null, sakId: String(sakId) }
    : {
      kanal: k,
      threadId: null,
      $or: [
        { id: { $in: [...perTraad.keys()] } },
        { traadNavn: { $nin: [null, ''] } },
        { sakId: { $nin: [null, ''] } },
      ],
    };
  const rotter = await db.collection(CHAT_COLL).find(rotFilter, { projection: { _id: 0 } }).limit(200).toArray();

  // Uleste svar per tråd (fra andre, nyere enn brukerens lesetidspunkt)
  let ulestePerTraad = new Map();
  if (userId) {
    const lest = await db.collection(CHAT_LEST_COLL).findOne(
      { userId: String(userId), kanal: k },
      { projection: { _id: 0, lastReadAt: 1 } },
    );
    const uFilter = { kanal: k, threadId: { $ne: null }, userId: { $ne: String(userId) } };
    if (lest?.lastReadAt) uFilter.createdAt = { $gt: lest.lastReadAt };
    const uAgg = await db.collection(CHAT_COLL).aggregate([
      { $match: uFilter },
      { $group: { _id: '$threadId', antall: { $sum: 1 } } },
    ]).toArray();
    ulestePerTraad = new Map(uAgg.map((a) => [a._id, a.antall]));
  }

  const sakIds = [...new Set(rotter.map((r) => r.sakId).filter(Boolean))];
  const saker = sakIds.length
    ? await db.collection('tasks').find({ id: { $in: sakIds } }, { projection: { _id: 0, id: 1, title: 1, status: 1 } }).toArray()
    : [];
  const perSak = new Map(saker.map((s) => [s.id, s]));

  const ut = rotter.map((r) => {
    const t = perTraad.get(r.id);
    return {
      id: r.id,
      navn: r.traadNavn || null,
      tekst: String(r.text || '').slice(0, 140),
      userName: r.userName,
      userId: r.userId,
      createdAt: r.createdAt,
      antallSvar: t?.antall || 0,
      sisteAt: t?.sisteAt || r.createdAt,
      deltakere: (t?.navn || []).slice(0, 4),
      uleste: ulestePerTraad.get(r.id) || 0,
      sak: r.sakId ? (perSak.get(r.sakId) || { id: r.sakId, title: 'Sak' }) : null,
    };
  });
  ut.sort((a, b) => (a.sisteAt < b.sisteAt ? 1 : -1));
  return ut;
}

export async function slettMelding(db, { id, userId, erAdmin } = {}) {
  const doc = await db.collection(CHAT_COLL).findOne({ id: String(id || '') }, { projection: { _id: 0, userId: 1, threadId: 1 } });
  if (!doc) return { ok: false, error: 'Ikke funnet', status: 404 };
  if (!erAdmin && doc.userId !== userId) return { ok: false, error: 'Kan bare slette egne meldinger', status: 403 };
  await db.collection(CHAT_COLL).deleteOne({ id: String(id) });
  // Slettes en rotmelding, følger hele tråden med (ingen foreldreløse svar).
  if (!doc.threadId) await db.collection(CHAT_COLL).deleteMany({ threadId: String(id) });
  return { ok: true };
}

export async function merkLest(db, { kanal, userId } = {}) {
  if (!userId) return { ok: false, error: 'Mangler bruker', status: 400 };
  const k = rensKanal(kanal);
  // Returnerer FORRIGE lest-tidspunkt — klienten bruker det til
  // «Nytt siden sist»-markøren uten en ekstra rundtur.
  const forrige = await db.collection(CHAT_LEST_COLL).findOne(
    { userId: String(userId), kanal: k },
    { projection: { _id: 0, lastReadAt: 1 } },
  );
  await db.collection(CHAT_LEST_COLL).updateOne(
    { userId: String(userId), kanal: k },
    { $set: { userId: String(userId), kanal: k, lastReadAt: new Date().toISOString() } },
    { upsert: true },
  );
  return { ok: true, forrigeLestAt: forrige?.lastReadAt || null };
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
  return { ok: true, ulest, sisteAt: siste[0]?.createdAt || null, lestAt: lest?.lastReadAt || null };
}
