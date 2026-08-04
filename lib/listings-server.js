import { getDb } from '@/lib/mongodb';
import { applyEnrichment, PROPERTIES_COLL } from '@/lib/properties-sync';
import {
  listingGate, toListingCard, toListingDetail, slugIdPart, listingSlug,
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

// ── NYHETSBREV-LANDING ─────────────────────────────────────────────────────
// Nyhetsbrevet skal peke til VÅR boligside, ikke til en tynn bekreftelsesside:
// det er der boligen er presentert ordentlig, det er der utleieenheten vises, og
// det er den lenken folk videresender. Men et brev kan inneholde en bolig som
// ikke er publisert offentlig (skjult, eller uten prisantydning), og en rå
// omlegging ville gitt 404 til mottakeren som nettopp fikk boligen tilsendt.
//
// Derfor: lavere terskel her (boligen må finnes og ha bilder), men siden nås
// BARE med et gyldig HMAC-signert token fra e-posten, og den settes alltid til
// noindex. Mottakeren har allerede sett bilde, adresse og pris i e-posten —
// ingenting nytt avsløres, og ingen upublisert bolig havner i søk.
export async function getListingBySlugForNewsletter(slug) {
  const idPart = slugIdPart(slug);
  if (!idPart) return null;
  try {
    const rows = await loadRaw({ id: { $regex: `^${idPart}` } });
    const p = rows[0];
    if (!p) return null;
    const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (!imgs.length) return null;
    const gate = listingGate(p);
    const all = await getPublishedListings();
    const related = all.filter((c) => c.id !== p.id).slice(0, 3);
    return {
      listing: toListingDetail(p),
      available: gate.vacant,
      related,
      // Tokenet i e-posten er signert med plattformens enhets-ID ELLER vår
      // lokale id, avhengig av hva boligblokken hadde. Vi returnerer begge, så
      // verifiseringen kan prøve dem uten at ID-en må stå i URL-en.
      keys: { id: p.id, externalId: p.externalId || null },
    };
  } catch (e) { return null; }
}

// Slug for en bolig-ID. Brukes til å videresende nyhetsbrevlenker som ALT er
// sendt ut (/boliginteresse?property=…) til boligsiden. E-post som er levert kan
// ikke endres, så den gamle inngangen må fortsette å virke.
export async function getListingSlugByPropertyId(pid) {
  const key = String(pid || '').trim().slice(0, 80);
  if (!key) return null;
  try {
    const rows = await loadRaw({ $or: [{ id: key }, { externalId: key }] });
    const p = rows[0];
    if (!p) return null;
    const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (!imgs.length) return null;
    return { slug: listingSlug(p), id: p.id, externalId: p.externalId || null };
  } catch (e) { return null; }
}
