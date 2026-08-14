// ---------------------------------------------------------------------------
// ÉN KOSTNADSKILDE — konsolidering av DigiHomes faste/estimerte kostnader.
//
// Historikk: kostnader levde i TO registre — `finance_costs` (Økonomi →
// Kostnader, driver økonomimotoren) og `enhetsokonomi` type 'felles'
// (Datarom-skuffen, driver enhetsmarginer i Leieforhold). To sannheter ga
// rot og risiko for dobbeltføring.
//
// Nå: `finance_costs` er ENESTE register. Denne modulen:
//   · migrerer gamle enhetsokonomi-felles-poster inn (idempotent, én gang)
//   · eksponerer en «felles»-FASADE (norske felter, kr/mnd) slik at
//     Leieforhold/Datarom/KostnadsSkuff leser og skriver samme data
//   · mapper kategorier begge veier (lonn ↔ Lønn osv.)
//
// finance_costs-dokument (utvidet):
//   { id, name, category, amount, frequency, startDate, endDate, vendor,
//     source, note, fordeling: 'alle'|'utleide'|'honorar', paused: bool }
// ---------------------------------------------------------------------------

import { v4 as uuidv4 } from 'uuid';
import { COSTS_COLL, COST_CATEGORIES, monthlyCost, listCosts, upsertCost } from './finance';

export const FORDELINGER = ['alle', 'utleide', 'honorar'];

// Norsk kategorinøkkel (fasade/skuff) → Økonomi-kategori (finance_costs)
export const KAT_TIL_CATEGORY = {
  lonn: 'Lønn', husleie: 'Husleie', programvare: 'Programvare/SaaS', saas: 'Programvare/SaaS',
  regnskap: 'Regnskap', api: 'API/LLM', llm: 'API/LLM', apillm: 'API/LLM',
  markedsforing: 'Markedsføring', annet: 'Annet',
};
export const CATEGORY_TIL_KAT = {
  'Lønn': 'lonn', 'Husleie': 'husleie', 'Programvare/SaaS': 'programvare',
  'Regnskap': 'regnskap', 'API/LLM': 'apillm', 'Markedsføring': 'markedsforing', 'Annet': 'annet',
};

// finance_costs-dokument → «felles»-fasadeform (norske felter, belop = kr/mnd)
export function tilFellesForm(c) {
  return {
    id: c.id,
    type: 'felles',
    navn: c.name || '',
    belop: Math.round(monthlyCost(c)),
    kategori: CATEGORY_TIL_KAT[c.category] || 'annet',
    fordeling: FORDELINGER.includes(c.fordeling) ? c.fordeling : 'alle',
    aktiv: c.paused !== true,
    startDato: c.startDate || '',
    sluttDato: c.endDate || '',
    // Metadata (lese-only i fasaden — original frekvens/beløp bor i Økonomi):
    frekvens: c.frequency || 'monthly',
    belopOriginal: Number(c.amount) || 0,
    kilde: c.source || 'manual',
    updatedAt: c.updatedAt || null,
  };
}

// Idempotent migrering: flytter gamle enhetsokonomi-felles-poster inn i
// finance_costs (samme id gjenbrukes), og merker originalen `migrert: true`
// (beholdes for sporbarhet/rollback — leses aldri igjen).
export async function migrerFellesKostnader(db) {
  let gamle = [];
  try {
    gamle = await db.collection('enhetsokonomi').find({ type: 'felles', migrert: { $ne: true } }).toArray();
  } catch (e) { return 0; }
  let flyttet = 0;
  for (const p of gamle) {
    const id = p.id || uuidv4();
    try {
      const finnes = await db.collection(COSTS_COLL).findOne({ id }, { projection: { _id: 1 } });
      if (!finnes) {
        const now = new Date().toISOString();
        await db.collection(COSTS_COLL).insertOne({
          id,
          createdAt: p.createdAt || now,
          updatedAt: now,
          name: String(p.navn || 'Uten navn').slice(0, 120),
          category: KAT_TIL_CATEGORY[String(p.kategori || '').toLowerCase()] || 'Annet',
          amount: Math.max(0, Number(p.belop) || 0),
          frequency: 'monthly',
          startDate: p.startDato || null,
          endDate: p.sluttDato || null,
          vendor: '',
          source: 'enhetsokonomi',
          note: '',
          fordeling: FORDELINGER.includes(p.fordeling) ? p.fordeling : 'alle',
          paused: p.aktiv === false,
        });
        flyttet += 1;
      }
      await db.collection('enhetsokonomi').updateOne(
        { id: p.id, type: 'felles' },
        { $set: { migrert: true, migrertAt: new Date().toISOString() } },
      );
    } catch (e) { /* neste post — migreringen er idempotent og prøves igjen */ }
  }
  return flyttet;
}

// Alle manuelle kostnader i fasadeform (inkl. pausede — UI viser status).
export async function listFellesKostnader(db) {
  await migrerFellesKostnader(db);
  const alle = await listCosts(db);
  return alle.map(tilFellesForm).sort((a, b) => (b.belop || 0) - (a.belop || 0));
}

// Skriv fra skuffen (fasadeform inn) → finance_costs. Ved oppdatering av en
// ikke-månedlig post normaliseres den til månedlig (samme økonomi/mnd).
export async function upsertFellesKostnad(db, bEo = {}) {
  const navn = String(bEo.navn || '').trim().slice(0, 120);
  const belop = Math.max(0, Math.round(Number(bEo.belop) || 0));
  if (!navn || !belop) return { ok: false, error: 'Navn og beløp kreves', status: 400 };
  const gyldigDato = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
  const start = gyldigDato(bEo.startDato);
  const slutt = gyldigDato(bEo.sluttDato);
  if (start && slutt && slutt < start) return { ok: false, error: 'Sluttdato kan ikke være før startdato', status: 400 };
  const id = String(bEo.id || '').trim() || uuidv4();
  const category = KAT_TIL_CATEGORY[String(bEo.kategori || '').toLowerCase()] || 'Annet';
  const now = new Date().toISOString();
  const doc = {
    name: navn,
    category: COST_CATEGORIES.includes(category) ? category : 'Annet',
    amount: belop,
    frequency: 'monthly',
    startDate: start || null,
    endDate: slutt || null,
    fordeling: FORDELINGER.includes(bEo.fordeling) ? bEo.fordeling : 'alle',
    paused: bEo.aktiv === false,
    updatedAt: now,
  };
  await db.collection(COSTS_COLL).updateOne(
    { id },
    { $set: doc, $setOnInsert: { id, createdAt: now, vendor: '', source: 'datarom', note: '' } },
    { upsert: true },
  );
  return { ok: true, id };
}

export async function slettFellesKostnad(db, id) {
  if (!id) return { ok: false, error: 'Ikke funnet', status: 404 };
  const r = await db.collection(COSTS_COLL).deleteOne({ id: String(id) });
  if (!r.deletedCount) return { ok: false, error: 'Ikke funnet', status: 404 };
  return { ok: true };
}
