// ─────────────────────────────────────────────────────────────────────────────
// DATAROM — investorrommets datalag.
// Alt en investor trenger for å forstå økonomien i DigiHome: enheter i drift,
// pipeline, månedlig resultat (P&L), selskapsdata og en samlet oversikt.
// Skriving er alltid admin-only (håndheves i route.js); dette laget er ren
// datalogikk slik at det kan testes uten HTTP.
// ─────────────────────────────────────────────────────────────────────────────
import { v4 as uuidv4 } from 'uuid';

export const ENHETER_COLL = 'datarom_enheter';
export const PNL_COLL = 'datarom_pnl';
export const SELSKAP_COLL = 'datarom_selskap';

export const ENHET_TYPER = ['leilighet', 'rom'];
export const DRIFT_STATUSER = ['utleid', 'ledig'];
export const PIPELINE_STATUSER = ['signert', 'forventet'];

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const r0 = (v) => Math.round(n(v));

/* ── Enheter (drift + pipeline i samme kolleksjon, skilt på `fase`) ────────── */

export function normaliserEnhet(body = {}, eksisterende = null) {
  const fase = body.fase === 'pipeline' ? 'pipeline' : body.fase === 'drift' ? 'drift' : (eksisterende?.fase || 'drift');
  const gyldige = fase === 'drift' ? DRIFT_STATUSER : PIPELINE_STATUSER;
  const status = gyldige.includes(body.status) ? body.status : (gyldige.includes(eksisterende?.status) ? eksisterende.status : gyldige[0]);
  const navn = String(body.navn ?? eksisterende?.navn ?? '').trim().slice(0, 160);
  if (!navn) return { ok: false, error: 'Enheten må ha et navn (adresse/rom)' };
  return {
    ok: true,
    enhet: {
      id: eksisterende?.id || uuidv4(),
      fase,
      type: ENHET_TYPER.includes(body.type) ? body.type : (eksisterende?.type || 'leilighet'),
      navn,
      status,
      honorar: Math.max(0, r0(body.honorar ?? eksisterende?.honorar ?? 0)),          // mnd
      kostnader: Math.max(0, r0(body.kostnader ?? eksisterende?.kostnader ?? 0)),    // direkte kostnader/mnd
      leie: Math.max(0, r0(body.leie ?? eksisterende?.leie ?? 0)),                   // brutto leie/mnd (kontekst)
      start: String(body.start ?? eksisterende?.start ?? '').slice(0, 10),           // YYYY-MM-DD (pipeline: forventet)
      notat: String(body.notat ?? eksisterende?.notat ?? '').slice(0, 500),
      kildeId: eksisterende?.kildeId || (body.kildeId ? String(body.kildeId).slice(0, 200) : null),
      createdAt: eksisterende?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

export async function listEnheter(db) {
  const alle = await db.collection(ENHETER_COLL).find({}, { projection: { _id: 0 } }).sort({ navn: 1 }).toArray();
  return {
    drift: alle.filter((e) => e.fase === 'drift'),
    pipeline: alle.filter((e) => e.fase === 'pipeline'),
  };
}

export async function lagreEnhet(db, body) {
  const eksisterende = body.id ? await db.collection(ENHETER_COLL).findOne({ id: body.id }, { projection: { _id: 0 } }) : null;
  if (body.id && !eksisterende) return { ok: false, error: 'Enheten finnes ikke' };
  const res = normaliserEnhet(body, eksisterende);
  if (!res.ok) return res;
  await db.collection(ENHETER_COLL).updateOne({ id: res.enhet.id }, { $set: res.enhet }, { upsert: true });
  return { ok: true, enhet: res.enhet };
}

export async function slettEnhet(db, id) {
  const r = await db.collection(ENHETER_COLL).deleteOne({ id: String(id || '') });
  return r.deletedCount ? { ok: true } : { ok: false, error: 'Ikke funnet' };
}

/* Import fra Leieforhold (plattformen): idempotent via kildeId. Eksisterende
   rader beholder manuelt vedlikeholdte felt (kostnader/notat) — vi oppdaterer
   kun det plattformen faktisk vet noe om. */
export async function importerFraLeieforhold(db, rows = []) {
  let opprettet = 0; let oppdatert = 0;
  const gjeldendeKildeIder = [];
  for (const r of rows) {
    if (!r || r.group === undefined) continue;
    const fase = (r.group === 'leased' || r.group === 'vacant') ? 'drift' : 'pipeline';
    const status = r.group === 'leased' ? 'utleid' : r.group === 'vacant' ? 'ledig' : r.group === 'future' ? 'signert' : 'forventet';
    const navn = [String(r.unit_room || '').trim(), String(r.address || '').trim()].filter(Boolean).join(' · ') || 'Enhet';
    const kildeId = `lf:${navn.toLowerCase()}`;
    gjeldendeKildeIder.push(kildeId);
    const eksisterende = await db.collection(ENHETER_COLL).findOne({ kildeId }, { projection: { _id: 0 } });
    const sett = {
      fase, status, navn,
      type: r.unit_type === 'Rom i bofellesskap' ? 'rom' : 'leilighet',
      honorar: Math.max(0, r0(r.fee_amount)),
      leie: Math.max(0, r0(r.monthly_rent)),
      start: String(r.move_in_date || '').slice(0, 10),
      kildeId,
      updatedAt: new Date().toISOString(),
    };
    if (eksisterende) {
      await db.collection(ENHETER_COLL).updateOne({ kildeId }, { $set: sett });
      oppdatert += 1;
    } else {
      await db.collection(ENHETER_COLL).insertOne({ id: uuidv4(), kostnader: 0, notat: '', createdAt: new Date().toISOString(), ...sett });
      opprettet += 1;
    }
  }
  // Rydd bort plattform-rader som ikke lenger finnes i porteføljen (manuelle
  // rader — kildeId=null — røres aldri).
  let fjernet = 0;
  if (rows.length) {
    const res = await db.collection(ENHETER_COLL).deleteMany({
      kildeId: { $regex: '^lf:', $nin: gjeldendeKildeIder },
    });
    fjernet = res.deletedCount || 0;
  }
  return { ok: true, opprettet, oppdatert, fjernet };
}

/* Auto-synk: Enhetsøkonomi/pipeline speiler alltid Leieforhold-porteføljen.
   Kjøres ved lasting av datarom-sidene, men maks hvert 10. minutt (lås i
   Mongo). hentRows er en async funksjon som leverer leieforhold-radene
   (typisk hentLeieforhold(...).rows — cachet og rask). Feil her skal ALDRI
   velte sidelastingen — da serveres bare eksisterende data. */
export async function autoSyncFraLeieforhold(db, hentRows, { maxAlderMs = 10 * 60 * 1000 } = {}) {
  try {
    const laas = await db.collection('datarom_sync').findOne({ id: 'lf-auto' });
    if (laas?.at && Date.now() - new Date(laas.at).getTime() < maxAlderMs) return { ok: true, skipped: true };
    await db.collection('datarom_sync').updateOne(
      { id: 'lf-auto' },
      { $set: { id: 'lf-auto', at: new Date().toISOString() } },
      { upsert: true },
    );
    const rows = await hentRows();
    if (!Array.isArray(rows) || !rows.length) return { ok: true, skipped: true, tomt: true };
    return await importerFraLeieforhold(db, rows);
  } catch (e) {
    return { ok: false, skipped: true, error: String(e?.message || e) };
  }
}

/* ── Resultat per måned (P&L) — enkle rader, kan stå tomt inntil videre ────── */

export async function listPnl(db) {
  return db.collection(PNL_COLL).find({}, { projection: { _id: 0 } }).sort({ ym: 1 }).toArray();
}

export async function lagrePnlRad(db, body = {}) {
  const ym = String(body.ym || '').slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) return { ok: false, error: 'Måned må være på formen ÅÅÅÅ-MM' };
  const rad = {
    id: (await db.collection(PNL_COLL).findOne({ ym }, { projection: { id: 1 } }))?.id || uuidv4(),
    ym,
    inntekter: Math.max(0, r0(body.inntekter)),
    kostnader: Math.max(0, r0(body.kostnader)),
    notat: String(body.notat || '').slice(0, 300),
    updatedAt: new Date().toISOString(),
  };
  await db.collection(PNL_COLL).updateOne({ ym }, { $set: rad }, { upsert: true });
  return { ok: true, rad };
}

export async function slettPnlRad(db, ym) {
  const r = await db.collection(PNL_COLL).deleteOne({ ym: String(ym || '').slice(0, 7) });
  return r.deletedCount ? { ok: true } : { ok: false, error: 'Ikke funnet' };
}

/* ── Selskap: ansatte, faste kostnader, gjeld og aksjonærlån (ett dokument) ── */

const rensLinjer = (arr, felt) => (Array.isArray(arr) ? arr : []).slice(0, 60).map((l) => {
  const ut = { id: l.id || uuidv4() };
  for (const [k, type] of felt) {
    ut[k] = type === 'tall' ? Math.max(0, r0(l[k])) : type === 'prosent' ? Math.min(100, Math.max(0, n(l[k]))) : String(l[k] || '').slice(0, 160);
  }
  return ut;
}).filter((l) => Object.values(l).some((v) => v && v !== 0));

export async function hentSelskap(db) {
  const doc = await db.collection(SELSKAP_COLL).findOne({ id: 'selskap' }, { projection: { _id: 0 } });
  return doc || { id: 'selskap', ansatte: [], faste: [], gjeld: [], laan: [], notat: '', updatedAt: null };
}

export async function lagreSelskap(db, body = {}) {
  const doc = {
    id: 'selskap',
    ansatte: rensLinjer(body.ansatte, [['rolle', 'tekst'], ['prosent', 'prosent'], ['kostnad', 'tall']]),
    faste: rensLinjer(body.faste, [['navn', 'tekst'], ['belop', 'tall']]),
    gjeld: rensLinjer(body.gjeld, [['navn', 'tekst'], ['belop', 'tall'], ['rente', 'prosent']]),
    laan: rensLinjer(body.laan, [['navn', 'tekst'], ['belop', 'tall'], ['rente', 'prosent']]),
    notat: String(body.notat || '').slice(0, 2000),
    updatedAt: new Date().toISOString(),
  };
  await db.collection(SELSKAP_COLL).updateOne({ id: 'selskap' }, { $set: doc }, { upsert: true });
  return { ok: true, selskap: doc };
}

/* ── Oversikt: alle nøkkeltall investoren møter først ──────────────────────── */

export async function beregnOversikt(db) {
  const [{ drift, pipeline }, pnl, selskap] = await Promise.all([listEnheter(db), listPnl(db), hentSelskap(db)]);

  const sum = (arr, f) => arr.reduce((a, e) => a + n(e[f]), 0);
  const utleide = drift.filter((e) => e.status === 'utleid');
  const honorarMnd = sum(utleide, 'honorar');
  const kostnaderMnd = sum(utleide, 'kostnader');
  const signert = pipeline.filter((e) => e.status === 'signert');
  const forventet = pipeline.filter((e) => e.status === 'forventet');

  // P&L-serie med akkumulert resultat (kan være tom — det er helt OK).
  let akk = 0;
  const serie = pnl.map((r) => {
    const resultat = n(r.inntekter) - n(r.kostnader);
    akk += resultat;
    return { ym: r.ym, inntekter: n(r.inntekter), kostnader: n(r.kostnader), resultat, akkumulert: akk };
  });

  const ansatteKostnad = sum(selskap.ansatte || [], 'kostnad');
  const fasteKostnader = sum(selskap.faste || [], 'belop');

  return {
    drift: {
      antall: drift.length,
      utleide: utleide.length,
      ledige: drift.length - utleide.length,
      honorarMnd,
      kostnaderMnd,
      marginMnd: honorarMnd - kostnaderMnd,
      arr: honorarMnd * 12,
      snittHonorar: utleide.length ? Math.round(honorarMnd / utleide.length) : 0,
    },
    pipeline: {
      antall: pipeline.length,
      signert: { antall: signert.length, honorarMnd: sum(signert, 'honorar') },
      forventet: { antall: forventet.length, honorarMnd: sum(forventet, 'honorar') },
    },
    pnl: { serie, harData: serie.length > 0 },
    selskap: {
      antallAnsatte: (selskap.ansatte || []).length,
      ansatteKostnadMnd: ansatteKostnad,
      fasteKostnaderMnd: fasteKostnader,
      gjeldTotal: sum(selskap.gjeld || [], 'belop'),
      laanTotal: sum(selskap.laan || [], 'belop'),
      oppdatert: selskap.updatedAt,
    },
  };
}
