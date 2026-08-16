// ═══════════════ Dokumentmotor for saksvedlegg ═══════════════
// Utvider task_files med: dokumentarkiv (synlighet styret/investorer/alle),
// lettvekts versjonskontroll (v1/v2/v3 + gjenoppretting), tidsbegrensede
// delingslenker for eksterne, hendelseslogg per dokument og låsing etter
// BankID-signering. Binærdata for gamle versjoner ligger i task_file_versjoner.
// ══════════════════════════════════════════════════════════════

import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';

export const VERSJON_COLL = 'task_file_versjoner';
export const SYNLIGHETER = ['styret', 'investorer', 'alle'];
export const ARKIV_KATEGORIER = ['Protokoller', 'Avtaler', 'Rapporter', 'Økonomi', 'Annet'];

const now = () => new Date().toISOString();

// ── DOCX → PDF: lokal WASM-konvertering (docx-to-pdf-wasm) ────────────────────
// Kjører helt i prosessen — ingen kontorprogramvare, ingen tredjepart, og
// dokumentet forlater aldri serveren. WASM-modulen kompileres én gang og
// gjenbrukes. Merk: kun moderne .docx (zip-basert) — gamle binære .doc støttes
// ikke. Fonter som Calibri/Cambria erstattes med metrisk like fri-fonter, så
// PDF-en skal ALLTID kontrolleres visuelt før den sendes til signering.
let _docxWasm = null;
export async function konverterDocxTilPdf(docxBuffer) {
  const { convert } = await import('docx-to-pdf-wasm');
  if (!_docxWasm) {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const sti = path.join(process.cwd(), 'node_modules', 'docx-to-pdf-wasm', 'build', 'docx-to-pdf.wasm');
    _docxWasm = await WebAssembly.compile(await fs.readFile(sti));
  }
  const pdf = await convert(_docxWasm, new Uint8Array(docxBuffer));
  return Buffer.from(pdf);
}

export async function filLogg(db, filId, tekst, av = '') {
  await db.collection('task_files').updateOne(
    { id: String(filId) },
    { $push: { logg: { $each: [{ at: now(), av: String(av || '').slice(0, 120), tekst: String(tekst).slice(0, 300) }], $slice: -100 } } },
  );
}

// Oppdater metadata-speilet på saken (task.attachments[]) så lister viser
// versjon/lås/arkiv uten ekstra oppslag.
async function synkAttachmentMeta(db, fil) {
  await db.collection('tasks').updateOne(
    { id: fil.taskId, 'attachments.id': fil.id },
    {
      $set: {
        'attachments.$.name': fil.name,
        'attachments.$.type': fil.type,
        'attachments.$.size': fil.size,
        'attachments.$.versjon': fil.versjon || 1,
        'attachments.$.laast': !!fil.laast,
        'attachments.$.arkiv': !!(fil.arkiv && fil.arkiv.aktiv),
        'attachments.$.signeringStatus': (fil.signering && fil.signering.status) || null,
        updatedAt: now(),
      },
    },
  );
}

// ── Dokumentarkiv ─────────────────────────────────────────────────────────────
export async function settArkiv(db, filId, { aktiv, synlighet, kategori }, av = '') {
  const fil = await db.collection('task_files').findOne({ id: String(filId) });
  if (!fil) return { ok: false, error: 'Filen finnes ikke', status: 404 };
  const syn = SYNLIGHETER.includes(synlighet) ? synlighet : 'styret';
  const kat = ARKIV_KATEGORIER.includes(kategori) ? kategori : 'Annet';
  const arkiv = aktiv
    ? { aktiv: true, synlighet: syn, kategori: kat, at: now(), av: String(av).slice(0, 120) }
    : { aktiv: false };
  await db.collection('task_files').updateOne({ id: fil.id }, { $set: { arkiv } });
  await filLogg(db, fil.id, aktiv ? `Lagt i dokumentarkivet (${syn} · ${kat})` : 'Fjernet fra dokumentarkivet', av);
  await synkAttachmentMeta(db, { ...fil, arkiv });
  return { ok: true, arkiv };
}

// Rollebasert arkivliste: owner/admin ser alt, 'eier' (investor) ser
// investorer+alle, øvrige innloggede ser kun 'alle'.
export async function listArkiv(db, rolle) {
  const r = String(rolle || '');
  let synFilter;
  if (r === 'owner' || r === 'admin') synFilter = SYNLIGHETER;
  else if (r === 'eier') synFilter = ['investorer', 'alle'];
  else synFilter = ['alle'];
  const filer = await db.collection('task_files')
    .find({ 'arkiv.aktiv': true, 'arkiv.synlighet': { $in: synFilter } },
      { projection: { _id: 0, data: 0, logg: 0, delinger: 0 } })
    .sort({ 'arkiv.at': -1 })
    .limit(200)
    .toArray();
  // Berik med sakstittel
  const taskIds = [...new Set(filer.map((f) => f.taskId))];
  const tasks = await db.collection('tasks').find({ id: { $in: taskIds } }, { projection: { _id: 0, id: 1, title: 1 } }).toArray();
  const tittelAv = Object.fromEntries(tasks.map((t) => [t.id, t.title]));
  return filer.map((f) => ({ ...f, sakTittel: tittelAv[f.taskId] || '' }));
}

// ── Versjonskontroll ──────────────────────────────────────────────────────────
// Ny versjon: dagens binær flyttes til task_file_versjoner, hoveddoket
// oppdateres og versjonsnummeret økes. Låste (signerte) dokumenter kan få ny
// versjon (ulåst) — det starter i praksis en ny revisjonsrunde.
export async function nyVersjon(db, filId, { name, type, data }, av = '', { laas = false, loggTekst = '' } = {}) {
  const fil = await db.collection('task_files').findOne({ id: String(filId) });
  if (!fil) return { ok: false, error: 'Filen finnes ikke', status: 404 };
  const gammelVersjon = fil.versjon || 1;
  await db.collection(VERSJON_COLL).insertOne({
    id: uuidv4(),
    filId: fil.id,
    taskId: fil.taskId,
    versjon: gammelVersjon,
    name: fil.name,
    type: fil.type,
    size: fil.size,
    data: fil.data,
    laast: !!fil.laast,
    at: fil.versjonAt || fil.at,
    av: fil.versjonAv || fil.uploadedBy || '',
    arkivertAt: now(),
  });
  const nySize = Math.round(String(data || '').length * 3 / 4);
  const oppdatert = {
    name: String(name || fil.name).slice(0, 200),
    type: String(type || fil.type).slice(0, 120),
    size: nySize,
    data: String(data || ''),
    versjon: gammelVersjon + 1,
    versjonAt: now(),
    versjonAv: String(av).slice(0, 120),
    laast: !!laas,
  };
  await db.collection('task_files').updateOne({ id: fil.id }, { $set: oppdatert });
  await filLogg(db, fil.id, loggTekst || `Ny versjon lastet opp (v${gammelVersjon + 1})${laas ? ' — dokumentet er låst' : ''}`, av);
  await synkAttachmentMeta(db, { ...fil, ...oppdatert });
  await db.collection('tasks').updateOne(
    { id: fil.taskId },
    { $push: { activity: { at: now(), actor: av || 'Admin', text: loggTekst || `Lastet opp ny versjon av «${oppdatert.name}» (v${gammelVersjon + 1})` } }, $set: { updatedAt: now() } },
  ).catch(() => {});
  return { ok: true, versjon: gammelVersjon + 1 };
}

export async function listVersjoner(db, filId) {
  return db.collection(VERSJON_COLL)
    .find({ filId: String(filId) }, { projection: { _id: 0, data: 0 } })
    .sort({ versjon: -1 })
    .limit(50)
    .toArray();
}

export async function hentVersjon(db, filId, versjonId) {
  return db.collection(VERSJON_COLL).findOne({ filId: String(filId), id: String(versjonId) }, { projection: { _id: 0 } });
}

// Gjenopprett: en tidligere versjon blir ny gjeldende versjon (ikke-destruktivt)
export async function gjenopprettVersjon(db, filId, versjonId, av = '') {
  const fil = await db.collection('task_files').findOne({ id: String(filId) });
  if (!fil) return { ok: false, error: 'Filen finnes ikke', status: 404 };
  if (fil.laast) return { ok: false, error: 'Dokumentet er låst (signert) — kan ikke endres', status: 400 };
  const v = await hentVersjon(db, filId, versjonId);
  if (!v) return { ok: false, error: 'Versjonen finnes ikke', status: 404 };
  return nyVersjon(db, filId, { name: v.name, type: v.type, data: v.data }, av, { loggTekst: `Gjenopprettet v${v.versjon} som ny versjon` });
}

// ── Delingslenker for eksterne (tidsbegrenset, kan trekkes tilbake) ──────────
export async function opprettDeling(db, filId, { dager }, av = '') {
  const fil = await db.collection('task_files').findOne({ id: String(filId) });
  if (!fil) return { ok: false, error: 'Filen finnes ikke', status: 404 };
  if ((fil.delinger || []).filter((d) => !d.trukket).length >= 10) return { ok: false, error: 'Maks 10 aktive delingslenker per dokument', status: 400 };
  const d = Math.max(1, Math.min(90, Number(dager) || 7));
  const token = crypto.randomBytes(24).toString('hex');
  const deling = {
    id: uuidv4(),
    token,
    utloper: new Date(Date.now() + d * 86400000).toISOString(),
    opprettet: now(),
    av: String(av).slice(0, 120),
    apninger: 0,
    trukket: false,
  };
  await db.collection('task_files').updateOne({ id: fil.id }, { $push: { delinger: deling } });
  await filLogg(db, fil.id, `Delingslenke opprettet (gyldig ${d} dager)`, av);
  return { ok: true, deling };
}

export async function trekkDeling(db, filId, delingId, av = '') {
  const r = await db.collection('task_files').updateOne(
    { id: String(filId), 'delinger.id': String(delingId) },
    { $set: { 'delinger.$.trukket': true, 'delinger.$.trukketAt': now() } },
  );
  if (!r.matchedCount) return { ok: false, error: 'Delingslenken finnes ikke', status: 404 };
  await filLogg(db, filId, 'Delingslenke trukket tilbake', av);
  return { ok: true };
}

// Offentlig oppslag: token → fil (hvis gyldig). Teller åpninger.
export async function hentDelt(db, token) {
  const t = String(token || '');
  if (!/^[a-f0-9]{48}$/.test(t)) return null;
  const fil = await db.collection('task_files').findOne({ delinger: { $elemMatch: { token: t, trukket: { $ne: true } } } });
  if (!fil) return null;
  const deling = (fil.delinger || []).find((d) => d.token === t);
  if (!deling || new Date(deling.utloper) < new Date()) return null;
  await db.collection('task_files').updateOne(
    { id: fil.id, 'delinger.id': deling.id },
    { $inc: { 'delinger.$.apninger': 1 }, $set: { 'delinger.$.sistApnet': now() } },
  ).catch(() => {});
  return fil;
}

// ── Samlet detaljvisning for dokumentpanelet ─────────────────────────────────
export async function filDetaljer(db, filId) {
  const fil = await db.collection('task_files').findOne({ id: String(filId) }, { projection: { _id: 0, data: 0 } });
  if (!fil) return null;
  const versjoner = await listVersjoner(db, filId);
  const { SIGN_JOBB_COLL } = await import('./signering');
  const jobber = await db.collection(SIGN_JOBB_COLL)
    .find({ filId: String(filId) }, { projection: { _id: 0 } })
    .sort({ opprettet: -1 })
    .limit(10)
    .toArray();
  return {
    id: fil.id,
    taskId: fil.taskId,
    name: fil.name,
    type: fil.type,
    size: fil.size,
    versjon: fil.versjon || 1,
    laast: !!fil.laast,
    arkiv: fil.arkiv || { aktiv: false },
    logg: (fil.logg || []).slice(-40).reverse(),
    delinger: (fil.delinger || []).map((d) => ({ id: d.id, token: d.token, utloper: d.utloper, opprettet: d.opprettet, av: d.av, apninger: d.apninger || 0, trukket: !!d.trukket, sistApnet: d.sistApnet || null })),
    versjoner,
    // Aldri send signatar-hemmeligheter (sid/signerUrl) til klienten — sid er
    // nøkkelen til signatarens personlige signeringslenke.
    signering: jobber.map((j) => ({ ...j, signatarer: (j.signatarer || []).map(({ sid, signerUrl, ...rest }) => rest) })),
  };
}
