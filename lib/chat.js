// ─────────────────────────────────────────────────────────────────────────────
// TEAMCHAT — intern chat for portalen (owner/admin/bruker/partner).
// Én global kanal («generelt») nå, men datamodellen er kanal-klar slik at
// #budsjett, #salg osv. kan legges til senere uten omskriving.
//
//   chat_messages: {id, kanal, userId, userName, text, mentions:[{id,name}],
//                   threadId (null = rotmelding), traadNavn (kun rot, valgfri),
//                   sakId (kun rot — kobling til sak),
//                   vedlegg:[{id,name,type,size}] (filer/bilder),
//                   reaksjoner:[{emoji,userId,userName}] (emoji-reaksjoner),
//                   redigertAt (ISO ved redigering), festet (bool, festetAv/At),
//                   createdAt}
//   chat_lest:     {userId, kanal, lastReadAt}
//   chat_files:    {id, kanal, name, type, size, data(base64), uploadedBy,
//                   uploadedById, meldingId (null til meldingen sendes), at}
//   chat_file_chunks: {uploadId, index, data, at} — midlertidige opplastingsbiter
//   chat_skriver:  {userId, userName, kanal, at} — «skriver…»-heartbeat
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
export const CHAT_FIL_COLL = 'chat_files';
export const CHAT_FIL_CHUNK_COLL = 'chat_file_chunks';
export const CHAT_SKRIVER_COLL = 'chat_skriver';
export const CHAT_STD_KANAL = 'generelt';
export const CHAT_INTERNE_ROLLER = ['owner', 'admin', 'bruker', 'partner'];
// Emoji-utvalget for reaksjoner — holdes stramt og gjenkjennelig.
export const CHAT_EMOJIS = ['👍', '❤️', '😂', '🎉', '✅', '👀', '🙏', '🔥'];

const rensKanal = (k) => {
  // 60 tegn: rommer investor-kanaler («investor-<uuid>» = 45 tegn)
  const s = String(k || CHAT_STD_KANAL).toLowerCase().replace(/[^a-z0-9æøå-]/g, '').slice(0, 60);
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

export async function nyMelding(db, { kanal, userId, userName, text, mentions = [], threadId, vedlegg = [] } = {}) {
  const tekst = String(text || '').trim().slice(0, 4000);
  const vedleggIds = (Array.isArray(vedlegg) ? vedlegg : []).map((v) => String(v?.id || v || '')).filter(Boolean).slice(0, 6);
  if (!tekst && !vedleggIds.length) return { ok: false, error: 'Meldingen kan ikke være tom', status: 400 };
  if (!userId) return { ok: false, error: 'Mangler avsender', status: 400 };
  const k = rensKanal(kanal);

  // Vedlegg: valider at filene finnes, er lastet opp av avsenderen og ennå
  // ikke bundet til en annen melding — bindes til denne ved sending.
  let vedleggMeta = [];
  if (vedleggIds.length) {
    const filer = await db.collection(CHAT_FIL_COLL)
      .find({ id: { $in: vedleggIds }, meldingId: null, uploadedById: String(userId) }, { projection: { _id: 0, id: 1, name: 1, type: 1, size: 1 } })
      .toArray();
    if (filer.length !== vedleggIds.length) return { ok: false, error: 'Ett eller flere vedlegg finnes ikke', status: 400 };
    vedleggMeta = vedleggIds.map((vid) => filer.find((f) => f.id === vid));
  }

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
    vedlegg: vedleggMeta,
    reaksjoner: [],
    createdAt: new Date().toISOString(),
  };
  await db.collection(CHAT_COLL).insertOne({ ...melding });
  // Bind vedleggene til meldingen (kan ikke gjenbrukes på andre meldinger).
  if (vedleggMeta.length) {
    await db.collection(CHAT_FIL_COLL).updateMany(
      { id: { $in: vedleggMeta.map((v) => v.id) } },
      { $set: { meldingId: melding.id } },
    );
  }
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
  const slettedeIds = [String(id)];
  await db.collection(CHAT_COLL).deleteOne({ id: String(id) });
  // Slettes en rotmelding, følger hele tråden med (ingen foreldreløse svar).
  if (!doc.threadId) {
    const svar = await db.collection(CHAT_COLL).find({ threadId: String(id) }, { projection: { _id: 0, id: 1 } }).toArray();
    slettedeIds.push(...svar.map((s) => s.id));
    await db.collection(CHAT_COLL).deleteMany({ threadId: String(id) });
  }
  // Vedleggsfiler bundet til slettede meldinger ryddes (ingen foreldreløse binærdata).
  await db.collection(CHAT_FIL_COLL).deleteMany({ meldingId: { $in: slettedeIds } });
  return { ok: true };
}

// Rediger egen melding. Kun tekst/mentions endres — vedlegg, tråd og
// reaksjoner beholdes. Redigering utløser ALDRI nye varsler (ikke spam).
export async function redigerMelding(db, { id, userId, text, mentions = [] } = {}) {
  const doc = await db.collection(CHAT_COLL).findOne({ id: String(id || '') }, { projection: { _id: 0, id: 1, userId: 1, vedlegg: 1 } });
  if (!doc) return { ok: false, error: 'Ikke funnet', status: 404 };
  if (doc.userId !== String(userId)) return { ok: false, error: 'Kan bare redigere egne meldinger', status: 403 };
  const tekst = String(text || '').trim().slice(0, 4000);
  if (!tekst && !(doc.vedlegg || []).length) return { ok: false, error: 'Meldingen kan ikke være tom', status: 400 };
  // Mentions revalideres, men uten nye varsler.
  let gyldige = [];
  const inn = (Array.isArray(mentions) ? mentions : []).map((m) => String(m?.id || m || '')).filter(Boolean).slice(0, 20);
  if (inn.length) {
    const brukere = await db.collection('admin_users')
      .find({ id: { $in: inn }, role: { $in: CHAT_INTERNE_ROLLER } }, { projection: { _id: 0, id: 1, name: 1 } })
      .toArray();
    gyldige = brukere.map((b) => ({ id: b.id, name: String(b.name || '').slice(0, 80) }));
  }
  const redigertAt = new Date().toISOString();
  await db.collection(CHAT_COLL).updateOne({ id: doc.id }, { $set: { text: tekst, mentions: gyldige, redigertAt } });
  return { ok: true, text: tekst, mentions: gyldige, redigertAt };
}

// Emoji-reaksjon (toggle): samme bruker + samme emoji fjerner reaksjonen.
export async function reagerMelding(db, { id, userId, userName, emoji } = {}) {
  const e = String(emoji || '');
  if (!CHAT_EMOJIS.includes(e)) return { ok: false, error: 'Ugyldig emoji', status: 400 };
  const doc = await db.collection(CHAT_COLL).findOne({ id: String(id || '') }, { projection: { _id: 0, id: 1, reaksjoner: 1 } });
  if (!doc) return { ok: false, error: 'Ikke funnet', status: 404 };
  const eksisterende = doc.reaksjoner || [];
  const harAllerede = eksisterende.some((r) => r.userId === String(userId) && r.emoji === e);
  const reaksjoner = harAllerede
    ? eksisterende.filter((r) => !(r.userId === String(userId) && r.emoji === e))
    : [...eksisterende, { emoji: e, userId: String(userId).slice(0, 80), userName: String(userName || 'Ukjent').slice(0, 80) }].slice(0, 200);
  await db.collection(CHAT_COLL).updateOne({ id: doc.id }, { $set: { reaksjoner } });
  return { ok: true, reaksjoner };
}

// Fest/løsne en melding — festede meldinger vises i egen stripe øverst i chatten.
export async function festMelding(db, { id, festet, userId, userName } = {}) {
  const doc = await db.collection(CHAT_COLL).findOne({ id: String(id || '') }, { projection: { _id: 0, id: 1, kanal: 1 } });
  if (!doc) return { ok: false, error: 'Ikke funnet', status: 404 };
  if (festet) {
    const antall = await db.collection(CHAT_COLL).countDocuments({ kanal: doc.kanal, festet: true });
    if (antall >= 5) return { ok: false, error: 'Maks 5 festede meldinger — løsne en først', status: 400 };
  }
  await db.collection(CHAT_COLL).updateOne({ id: doc.id }, {
    $set: festet
      ? { festet: true, festetAv: String(userName || 'Ukjent').slice(0, 80), festetAvId: String(userId || '').slice(0, 80), festetAt: new Date().toISOString() }
      : { festet: false, festetAv: null, festetAvId: null, festetAt: null },
  });
  return { ok: true, festet: !!festet };
}

// Festede meldinger i kanalen (nyeste festet først).
export async function hentFestede(db, { kanal } = {}) {
  const k = rensKanal(kanal);
  return db.collection(CHAT_COLL)
    .find({ kanal: k, festet: true }, { projection: { _id: 0 } })
    .sort({ festetAt: -1 })
    .limit(5)
    .toArray();
}

// «Skriver…»-heartbeat: klienten pinger mens brukeren taster; visning henter
// navn med ferskt heartbeat (< 6 sek). Gamle heartbeats ryddes fortløpende.
export async function settSkriver(db, { kanal, userId, userName } = {}) {
  if (!userId) return { ok: false };
  const k = rensKanal(kanal);
  await db.collection(CHAT_SKRIVER_COLL).updateOne(
    { userId: String(userId), kanal: k },
    { $set: { userId: String(userId), userName: String(userName || 'Ukjent').slice(0, 80), kanal: k, at: Date.now() } },
    { upsert: true },
  );
  return { ok: true };
}

export async function hentSkriver(db, { kanal, unntattUserId } = {}) {
  const k = rensKanal(kanal);
  const grense = Date.now() - 6000;
  await db.collection(CHAT_SKRIVER_COLL).deleteMany({ at: { $lt: Date.now() - 60000 } }).catch(() => {});
  const docs = await db.collection(CHAT_SKRIVER_COLL)
    .find({ kanal: k, at: { $gt: grense }, ...(unntattUserId ? { userId: { $ne: String(unntattUserId) } } : {}) }, { projection: { _id: 0, userName: 1 } })
    .limit(5)
    .toArray();
  return docs.map((d) => d.userName);
}

// Chunket filopplasting (samme mønster som saksvedlegg): biter samles i
// chat_file_chunks, settes sammen og lagres i chat_files med meldingId null
// til meldingen sendes. Maks 8 MB per fil. Foreldreløse (aldri sendt) ryddes
// lat — eldre enn 24 t slettes ved neste opplasting.
export async function lagreFilChunk(db, { uploadId, index, total, data, name, type, kanal, userId, userName } = {}) {
  const uid = String(uploadId || '');
  const i = Number(index);
  const t = Number(total);
  const d = String(data || '');
  if (!uid || !Number.isInteger(i) || !Number.isInteger(t) || i < 0 || i >= t) {
    return { ok: false, error: 'Ugyldig chunk', status: 400 };
  }
  if (t > 16 || d.length > 1200000) return { ok: false, error: 'Filen er for stor (maks 8 MB)', status: 400 };
  if (!userId) return { ok: false, error: 'Mangler avsender', status: 400 };
  await db.collection(CHAT_FIL_CHUNK_COLL).updateOne(
    { uploadId: uid, index: i },
    { $set: { uploadId: uid, index: i, data: d, at: new Date().toISOString() } },
    { upsert: true },
  );
  const mottatt = await db.collection(CHAT_FIL_CHUNK_COLL).countDocuments({ uploadId: uid });
  if (mottatt < t) return { ok: true, complete: false, mottatt };

  const biter = await db.collection(CHAT_FIL_CHUNK_COLL).find({ uploadId: uid }).sort({ index: 1 }).toArray();
  const samlet = biter.map((b) => b.data).join('');
  await db.collection(CHAT_FIL_CHUNK_COLL).deleteMany({ uploadId: uid });
  const size = Math.round(samlet.length * 3 / 4);
  if (size > 8 * 1024 * 1024) return { ok: false, error: 'Filen er for stor (maks 8 MB)', status: 400 };
  // Lat opprydding av foreldreløse filer (aldri bundet til melding, > 24 t gamle)
  const gammelt = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  await db.collection(CHAT_FIL_COLL).deleteMany({ meldingId: null, at: { $lt: gammelt } }).catch(() => {});
  const fil = {
    id: uuidv4(),
    kanal: rensKanal(kanal),
    name: String(name || 'fil').slice(0, 200),
    type: String(type || 'application/octet-stream').slice(0, 120),
    size,
    data: samlet,
    uploadedBy: String(userName || 'Ukjent').slice(0, 80),
    uploadedById: String(userId).slice(0, 80),
    meldingId: null,
    at: new Date().toISOString(),
  };
  await db.collection(CHAT_FIL_COLL).insertOne({ ...fil });
  return { ok: true, complete: true, fil: { id: fil.id, name: fil.name, type: fil.type, size: fil.size } };
}

export async function hentFil(db, { id } = {}) {
  return db.collection(CHAT_FIL_COLL).findOne({ id: String(id || '') }, { projection: { _id: 0 } });
}

// Fjern en ennå usendt fil (angre i komponisten) — kun egne, ubundne filer.
export async function slettUbundetFil(db, { id, userId } = {}) {
  const res = await db.collection(CHAT_FIL_COLL).deleteOne({ id: String(id || ''), meldingId: null, uploadedById: String(userId || '') });
  return { ok: res.deletedCount > 0 };
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
  // Siste uleste melding fra andre — brukes som tekst i nettleservarselet
  let sisteUlest = null;
  if (ulest > 0) {
    const s = await db.collection(CHAT_COLL)
      .find(filter, { projection: { _id: 0, userName: 1, text: 1, vedlegg: 1 } })
      .sort({ createdAt: -1 }).limit(1).toArray();
    if (s[0]) sisteUlest = { userName: s[0].userName, text: String(s[0].text || '').slice(0, 90) || ((s[0].vedlegg || []).length ? '📎 Delte vedlegg' : '') };
  }
  return { ok: true, ulest, sisteAt: siste[0]?.createdAt || null, lestAt: lest?.lastReadAt || null, sisteUlest };
}

// Søk i chathistorikken: trygg regex-match på tekst, avsendernavn og trådnavn.
// Nyeste treff først — threadId følger med slik at klienten kan hoppe rett
// inn i riktig tråd (gamle rotmeldinger åpnes som trådvisning).
export async function sokMeldinger(db, { kanal, q, grense = 30 } = {}) {
  const soek = String(q || '').trim().slice(0, 80);
  if (soek.length < 2) return [];
  const k = rensKanal(kanal);
  const re = new RegExp(soek.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return db.collection(CHAT_COLL)
    .find(
      { kanal: k, $or: [{ text: re }, { userName: re }, { traadNavn: re }] },
      { projection: { _id: 0, id: 1, userName: 1, userId: 1, text: 1, createdAt: 1, threadId: 1, traadNavn: 1, vedlegg: 1 } },
    )
    .sort({ createdAt: -1 })
    .limit(Math.min(50, grense))
    .toArray();
}

// ── Lenke-forhåndsvisning (unfurl) ──────────────────────────────────────────
// Henter tittel/beskrivelse/bilde (og:-metadata) for en delt lenke, server-
// side med strengt SSRF-vern: kun http/https, aldri IP-litteraler eller
// interne vertsnavn, manuelle redirects (maks 3) som revalideres per hopp,
// 5 sek timeout og maks ~150 kB lest. Resultatet caches i 7 dager.
export const CHAT_UNFURL_COLL = 'chat_unfurl';

const UNFURL_BLOKKERT_VERT = /^(localhost|.*\.local|.*\.internal|.*\.lan|metadata\.google\.internal|0\.0\.0\.0)$/i;

function unfurlTillattUrl(raw) {
  let u;
  try { u = new URL(String(raw || '')); } catch (e) { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const vert = u.hostname.toLowerCase();
  if (!vert || UNFURL_BLOKKERT_VERT.test(vert)) return null;
  // Blokker alle IP-litteraler (IPv4/IPv6) — kun DNS-navn tillates
  if (/^[0-9:.[\]]+$/.test(vert)) return null;
  return u;
}

const unfurlMeta = (html, navn) => {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${navn}["'][^>]+content=["']([^"']*)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${navn}["']`, 'i'));
  return m ? m[1].trim() : null;
};

const unfurlDekodHtml = (s) => String(s || '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ');

export async function unfurlLenke(db, { url } = {}) {
  const start = unfurlTillattUrl(url);
  if (!start) return { ok: false, error: 'Ugyldig lenke', status: 400 };
  const noekkel = start.href.slice(0, 500);
  const cachet = await db.collection(CHAT_UNFURL_COLL).findOne({ url: noekkel }, { projection: { _id: 0 } });
  if (cachet && Date.now() - new Date(cachet.at).getTime() < 7 * 24 * 3600 * 1000) {
    return { ok: true, ...cachet };
  }
  try {
    let gjeldende = start;
    let res = null;
    for (let hopp = 0; hopp < 4; hopp += 1) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      res = await fetch(gjeldende.href, {
        redirect: 'manual',
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DigiHomeBot/1.0; lenkeforhandsvisning)', Accept: 'text/html,*/*' },
      }).finally(() => clearTimeout(timer));
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        const neste = unfurlTillattUrl(new URL(res.headers.get('location'), gjeldende.href).href);
        if (!neste) throw new Error('Blokkert redirect');
        gjeldende = neste;
        continue;
      }
      break;
    }
    if (!res || !res.ok) throw new Error('Kunne ikke hente siden');
    const type = String(res.headers.get('content-type') || '');
    if (!/text\/html/i.test(type)) throw new Error('Ikke HTML');
    // Les maks ~150 kB — nok til <head> med metadata
    const leser = res.body.getReader();
    let html = '';
    const dekoder = new TextDecoder();
    while (html.length < 150000) {
      const { done, value } = await leser.read();
      if (done) break;
      html += dekoder.decode(value, { stream: true });
    }
    leser.cancel().catch(() => {});
    const tittelTag = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const resultat = {
      url: noekkel,
      host: start.hostname.replace(/^www\./, ''),
      tittel: unfurlDekodHtml(unfurlMeta(html, 'og:title') || (tittelTag ? tittelTag[1] : '')).slice(0, 160) || null,
      beskrivelse: unfurlDekodHtml(unfurlMeta(html, 'og:description') || unfurlMeta(html, 'description') || '').slice(0, 240) || null,
      bilde: (() => {
        const b = unfurlMeta(html, 'og:image');
        if (!b) return null;
        try { return new URL(b, gjeldende.href).href.slice(0, 500); } catch (e) { return null; }
      })(),
      at: new Date().toISOString(),
    };
    if (!resultat.tittel) throw new Error('Fant ingen tittel');
    await db.collection(CHAT_UNFURL_COLL).updateOne({ url: noekkel }, { $set: resultat }, { upsert: true });
    return { ok: true, ...resultat };
  } catch (e) {
    // Negativ cache så vi ikke hamrer døde lenker
    const tomt = { url: noekkel, host: start.hostname.replace(/^www\./, ''), tittel: null, beskrivelse: null, bilde: null, at: new Date().toISOString() };
    await db.collection(CHAT_UNFURL_COLL).updateOne({ url: noekkel }, { $set: tomt }, { upsert: true }).catch(() => {});
    return { ok: true, ...tomt };
  }
}
