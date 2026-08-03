import { getDb } from '@/lib/mongodb';
import { applyEnrichment, PROPERTIES_COLL } from '@/lib/properties-sync';
import {
  listingGate, toListingCard, toListingDetail, slugIdPart,
} from '@/lib/listings';

// SERVERSIDEN av boligflaten. Ligger i egen fil fordi lib/listings.js også
// brukes av klientkomponenter (adminportalen) — og da må ikke MongoDB-driveren
// dras inn i nettleserbundelen.

function sortListings(a, b) {
  if ((a.status === 'active') !== (b.status === 'active')) return a.status === 'active' ? -1 : 1;
  return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
}

async function loadRaw(filter = {}) {
  const db = await getDb();
  const docs = await db.collection(PROPERTIES_COLL)
    .find({ stale: { $ne: true }, ...filter }, { projection: { _id: 0 } })
    .limit(300)
    .toArray();
  return docs.map(applyEnrichment);
}

// Offentlig indeks — kun publiserbare boliger.
export async function getPublishedListings() {
  try {
    const rows = await loadRaw({ visible: true });
    return rows.filter((p) => listingGate(p).publishable).map(toListingCard).sort(sortListings);
  } catch (e) { return []; }
}

// Detaljside. Utleide boliger som fortsatt er synlige beholdes bevisst — vi har
// sendt ut lenker til dem i nyhetsbrev, og en 404 er et dårligere svar enn
// «denne er utleid, se disse i stedet». Siden settes til noindex når den er tom.
export async function getListingBySlug(slug) {
  const idPart = slugIdPart(slug);
  if (!idPart) return null;
  try {
    const rows = await loadRaw({ visible: true, id: { $regex: `^${idPart}` } });
    const p = rows[0];
    if (!p) return null;
    const gate = listingGate(p);
    if (!gate.contentReady) return null;
    const all = await getPublishedListings();
    const related = all.filter((c) => c.id !== p.id).slice(0, 3);
    return { listing: toListingDetail(p), available: gate.vacant, related };
  } catch (e) { return null; }
}

export async function getPublishedListingSlugs() {
  const cards = await getPublishedListings();
  return cards.map((c) => ({ slug: c.slug, updatedAt: c.updatedAt }));
}
