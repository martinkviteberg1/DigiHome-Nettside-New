// ---------------------------------------------------------------------------
// Synk av FORVALTEDE BOLIGER fra DigiHome-plattformen → vises på forsiden.
// Kilde: GET {PLATFORM}/api/properties/export (read-only, X-API-Key).
// Kontrakt (agent-bro, tråd homepage-properties, 2026-07-02):
//   ?status=active|rented|paused|all  ?updatedSince=ISO  ?limit=1-500  ?offset=
//   → { ok, properties[], count, total, offset, nextOffset }  (poll til nextOffset=null)
//   Felt: id, title (personvern-trygg, uten adresse), area (gatenavn u/husnr),
//         city, type, bedrooms, sqm, images[], status, model, monthlyRentBand,
//         availableFrom, updatedAt. INGEN PII — publicConsent droppet: VI styrer
//         synlighet selv i adminportalen (default AV / skjult).
// Idempotent på externalId. `visible`-flagget bevares på tvers av synk-runder.
// Boliger som forsvinner fra eksporten markeres stale (vises aldri offentlig).
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';
import { resolveDistrict, fetchStreetDistrict, normStreet, isJunkArea, postalToDistrict } from '@/lib/geo-bergen';
import { resolveListingTitle, cleanFinnTitle } from '@/lib/listing-title';

export const PROPERTIES_COLL = 'platform_properties';
const GEO_CACHE_COLL = 'geo_street_cache';
const GEO_TTL_OK_MS = 180 * 24 * 60 * 60 * 1000;  // bydeler flytter seg ikke
const GEO_TTL_MISS_MS = 7 * 24 * 60 * 60 * 1000;  // prøv igjen om en uke
const META_KEY = 'properties_sync_meta';
const SETTINGS_COLL = 'dashboard_settings';
export const SYNC_STALE_MS = 60 * 60 * 1000; // auto-resynk hvis eldre enn 1 time

function normalize(row, baseUrl, addressIndex) {
  // Godta baade absolutte http(s)-URLer og relative stier fra plattformen —
  // relative stier prefikses med plattform-basen (f.eks. https://app.digihome.no).
  const base = (baseUrl || '').replace(/\/+$/, '');
  const images = Array.isArray(row.images)
    ? row.images
        .map((u) => {
          if (typeof u !== 'string') return null;
          const s = u.trim();
          if (!s) return null;
          if (/^https?:\/\//i.test(s)) return s;
          if (base && s.startsWith('/')) return base + s;
          return null;
        })
        .filter(Boolean)
        .slice(0, 12)
    : [];
  // BYDEL: plattformens boligeksport er personvern-trygg og har ingen adresse —
  // og sender heller ikke `district` (verifisert: 0 av 27 boliger). Bydelen
  // utledes derfor i sync-løkken via Kartverket-oppslag på gatenavnet. Her
  // beholder vi bare en bydel plattformen selv skulle sende.
  // AREA-VASK: enkelte boliger har en FINN-lenke limt inn i adressefeltet.
  // Den skal ALDRI vises i et kunderettet nyhetsbrev.
  const externalId = String(row.id || '').slice(0, 80);
  const rawArea = isJunkArea(row.area) ? null : String(row.area).slice(0, 80);
  const geo = resolveDistrict({ district: row.district, city: row.city, area: rawArea });

  // DATAKVALITET. Plattformen inneholder «tomme skall» — boligrader med
  // tittel «Leilighet», 0 soverom, 0 m² og ingen bilder (8 av 27 i produksjon).
  // De ser ut som duplikater i admin og ville gått ut i nyhetsbrevet som kort
  // uten bilde og uten info. Vi kan ikke slette dem i plattformen, men vi kan
  // flagge dem og holde dem utenfor kunderettede flater.
  const bedrooms = row.bedrooms != null ? Number(row.bedrooms) : null;
  const sqm = row.sqm != null ? Number(row.sqm) : null;
  const missingFields = [];
  if (!images.length) missingFields.push('bilder');
  if (!sqm) missingFields.push('areal');
  if (!bedrooms) missingFields.push('soverom');
  if (isJunkArea(row.area)) missingFields.push('gateadresse');
  // «Ufullstendig» krever at ALT innhold mangler — en bolig som bare venter på
  // bilder er ikke et tomt skall.
  const incomplete = !images.length && !sqm && !bedrooms;

  return {
    externalId,
    title: (row.title || '').toString().slice(0, 160),
    area: rawArea,
    district: geo.district ? String(geo.district).slice(0, 80) : null,
    districtSource: geo.source || null,
    city: row.city && !/^(norge|norway|no)$/i.test(String(row.city).trim()) ? String(row.city).slice(0, 80) : null,
    postalCode: row.postalCode ? String(row.postalCode).replace(/\D/g, '').slice(0, 4) || null : null,
    type: (row.type || 'leilighet').toString().slice(0, 30),
    bedrooms,
    sqm,
    images,
    status: (row.status || 'active').toString().slice(0, 20), // active|rented|paused
    model: row.model ? String(row.model).slice(0, 20) : null, // langtid|korttid|hybrid
    monthlyRentBand: row.monthlyRentBand ? String(row.monthlyRentBand).slice(0, 60) : null,
    availableFrom: row.availableFrom ? String(row.availableFrom).slice(0, 30) : null,
    platformUpdatedAt: row.updatedAt ? String(row.updatedAt).slice(0, 40) : null,
    incomplete,
    missingFields,
  };
}

// ---------------------------------------------------------------------------
// KANONISK ENHETSEKSPORT — GET {PLATFORM}/api/units/export (X-API-Key).
// Levert av plattformteamet 2026-08-02 etter bestilling i bro-tråd
// homepage-properties. Speiler «Enheter»-visningen i forvalterappen 1:1 og har
// feltene den personvern-trygge boligeksporten bevisst utelater: full adresse
// med husnummer, etasje, rom, eier, leietaker, faktisk vs. estimert leie,
// publicUrl, FINN-lenke og archived-flagg. Nøkkelen `unitId` er IDENTISK med
// `id` i properties/export, så koblingen er direkte (ingen gjetting).
//
// Vi BYTTER IKKE ut boligeksporten: den eier de kunderettede feltene (tittel
// uten adresse, gatenavn uten husnummer, prisintervall). Enhetseksporten legges
// på som et adminlag. Feiler den, står alt annet uendret.
// ---------------------------------------------------------------------------
function normalizeUnit(u, baseUrl) {
  const base = (baseUrl || '').replace(/\/+$/, '');
  const abs = (s) => {
    if (typeof s !== 'string') return null;
    const t = s.trim();
    if (!t) return null;
    if (/^https?:\/\//i.test(t)) return t;
    if (base && t.startsWith('/')) return base + t;
    return null;
  };
  const a = u.address || {};
  const rent = u.rent || {};
  const finn = typeof u.finnUrl === 'string' && /^https?:\/\/(www\.)?finn\.no\//i.test(u.finnUrl.trim())
    ? u.finnUrl.trim().slice(0, 300) : null;
  return {
    unitId: String(u.unitId || '').slice(0, 80),
    buildingId: u.buildingId ? String(u.buildingId).slice(0, 80) : null,
    buildingLabel: u.buildingLabel ? String(u.buildingLabel).slice(0, 120) : null,
    unitLabel: u.unitLabel ? String(u.unitLabel).slice(0, 160) : null,
    fullAddress: a.full ? String(a.full).replace(/,\s*Norge\s*$/i, '').slice(0, 160) : null,
    street: a.street ? String(a.street).slice(0, 120) : null,
    houseNumber: a.houseNumber ? String(a.houseNumber).slice(0, 20) : null,
    postalCode: a.postalCode ? (String(a.postalCode).replace(/\D/g, '').slice(0, 4) || null) : null,
    addressCity: a.city ? String(a.city).slice(0, 80) : null,
    platformDistrict: a.district ? String(a.district).slice(0, 80) : null,
    floor: u.floor != null && u.floor !== '' ? Number(u.floor) : null,
    rooms: u.rooms != null && u.rooms !== '' ? Number(u.rooms) : null,
    unitType: u.unitType ? String(u.unitType).slice(0, 40) : null,
    rentalModel: u.rentalModel ? String(u.rentalModel).slice(0, 20) : null,
    unitStatus: u.status ? String(u.status).slice(0, 30) : null, // ledig|utleid|under_signering
    ownerName: u.owner && u.owner.name ? String(u.owner.name).slice(0, 120) : null,
    tenantName: u.tenant && u.tenant.name ? String(u.tenant.name).slice(0, 120) : null,
    tenantActiveFrom: u.tenant && u.tenant.activeFrom ? String(u.tenant.activeFrom).slice(0, 30) : null,
    // LEIE: `isEstimate` er avgjørende — et estimat må ALDRI telle som faktisk
    // inntekt i KPI-ene. Vi lagrer flagget rått og viser det tydelig i admin.
    rentAmount: rent.amount != null && rent.amount !== '' ? Number(rent.amount) : null,
    rentIsEstimate: rent.isEstimate === true,
    imageCount: u.imageCount != null ? Number(u.imageCount) : null,
    coverImage: abs(u.coverImage),
    images: Array.isArray(u.images) ? u.images.map(abs).filter(Boolean).slice(0, 12) : [],
    listingStatus: u.listingStatus ? String(u.listingStatus).slice(0, 30) : null,
    publicUrl: abs(u.publicUrl),
    finnUrl: finn,
    finnkode: u.finnkode ? String(u.finnkode).slice(0, 20) : null,
    finnStatus: u.finnStatus ? String(u.finnStatus).slice(0, 20) : null,
    finnLastSeenAt: u.finnLastSeenAt ? String(u.finnLastSeenAt).slice(0, 40) : null,
    archived: u.archived === true,
  };
}

async function fetchUnitsExport({ target, key, maxPages = 5, pageLimit = 200 }) {
  const map = new Map();
  if (!target) return { map, error: 'Plattform-URL mangler' };
  let offset = 0, page = 0;
  try {
    while (page < maxPages) {
      const u = new URL(target.replace(/\/$/, '') + '/api/units/export');
      u.searchParams.set('status', 'all');
      u.searchParams.set('limit', String(pageLimit));
      u.searchParams.set('offset', String(offset));
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      let res;
      try { res = await fetch(u.toString(), { headers: key ? { 'X-API-Key': key } : {}, signal: ctrl.signal }); }
      finally { clearTimeout(t); }
      if (!res.ok) return { map, error: `HTTP ${res.status}` };
      const j = await res.json();
      if (!j || j.ok !== true || !Array.isArray(j.units)) return { map, error: 'Uventet responsformat' };
      for (const raw of j.units) {
        const n = normalizeUnit(raw, target);
        if (n.unitId) map.set(n.unitId, n);
      }
      page++;
      if (j.nextOffset == null) break;
      offset = Number(j.nextOffset);
    }
  } catch (e) {
    return { map, error: e.name === 'AbortError' ? 'Tidsavbrudd mot enhetseksporten' : e.message };
  }
  return { map, error: null };
}

// ---------------------------------------------------------------------------
// DUPLIKATDETEKSJON.
// Boligeksporten fjerner husnummer av personvernhensyn, så flere rader med
// samme gatenavn er HELT NORMALT (ulike leiligheter i samme bygg — f.eks.
// St. Hansstredet med 55, 30 og 50 m²). Derfor flagger vi bare rader som er
// IDENTISKE på gate + by + type + soverom + areal + bildeantall.
// Da er det ikke lenger en tolkning, men samme bolig registrert to ganger.
//
// LEIEMODELL ER BEVISST UTE AV NØKKELEN: ØVREGATEN 85 m² / 5 soverom lå som to
// rader, én med model=hybrid og én med model=korttid, med identisk bildeantall.
// I plattformens Enheter-visning finnes den bare ÉN gang, med profil «Dynamisk»
// (= hybrid). En enhet har én profil, så to fysisk identiske rader med ulik
// modell er samme enhet eksportert dobbelt — og den ville havnet to ganger i
// samme nyhetsbrev. Vi beholder derfor hybrid-varianten (den plattformen viser),
// ellers nyeste rad. Verifisert mot produksjon: regelen flagger 2 rader
// (ØVREGATEN-dubletten + den eldste tomme Olaf Ryes) og ingen falske treff.
// Vi sletter aldri noe.
// ---------------------------------------------------------------------------
function markDuplicates(docs = []) {
  const groups = new Map();
  for (const d of docs) {
    const key = [
      String(d.area || '').toLowerCase().trim(), String(d.city || '').toLowerCase().trim(),
      d.type || '', d.bedrooms ?? '', d.sqm ?? '', (d.images || []).length,
    ].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }
  const rank = (d) => (d.model === 'hybrid' ? 1 : 0);
  for (const [, list] of groups) {
    if (list.length < 2) { list.forEach((d) => { d.duplicate = false; d.duplicateGroupSize = 1; }); continue; }
    list.sort((a, b) => rank(b) - rank(a) || String(b.platformUpdatedAt || '').localeCompare(String(a.platformUpdatedAt || '')));
    list.forEach((d, i) => { d.duplicate = i > 0; d.duplicateGroupSize = list.length; });
  }
  return docs;
}

// ---------------------------------------------------------------------------
// BERIKELSE FRA FINN-ANNONSEN (marketing-side, aldri skrevet til plattformen).
//
// Bakgrunn: 14 av 27 boliger i plattformeksporten har images: [] — blant dem
// fire LEDIGE boliger med prisintervall (Tullins gate 70 m², Wernersholmvegen
// 52 m², Absalon Beyers gate 38 m², Magnus Barfots gate 37 m²). Et boligkort
// uten bilde ser ødelagt ut i e-post, så de kunne ikke sendes. Plattformfiksen
// er bestilt (bro-tråd homepage-properties, melding 2/2), men vi kan fylle
// hullet selv: utleieren har som regel en FINN-annonse med bilder, pris, areal
// og POSTNUMMER — og postnummer gir en sikrere bydel enn Kartverket-oppslag på
// gatenavn.
//
// `enrich` lagres som eget felt på boligdokumentet og overskrives ALDRI av
// synken (synken setter bare de feltene plattformen eier). Plattformdata vinner
// alltid der den finnes; berikelsen fyller bare hull. Sletter man FINN-lenken,
// forsvinner berikelsen og boligen faller tilbake til rene plattformdata.
// ---------------------------------------------------------------------------
export function applyEnrichment(doc) {
  if (!doc) return doc;
  const e = doc.enrich || null;
  const unit = doc.unit || null;
  const snap = doc.finnSnap || null;       // hentet annonsedata (tittel/leie)
  const ed = doc.editorial || null;        // redaksjonelle overstyringer
  const out = { ...doc };
  delete out.enrich;
  delete out.unit;
  delete out.finnSnap;
  delete out.editorial;

  const filled = [];
  if (e && e.finnUrl) {
    if (!(doc.images || []).length && Array.isArray(e.images) && e.images.length) {
      out.images = e.images.slice(0, 12);
      out.imageSource = 'finn';
      filled.push('bilder');
    }
    if (!doc.sqm && e.sqm) { out.sqm = Number(e.sqm); filled.push('areal'); }
    if (!doc.bedrooms && e.bedrooms) { out.bedrooms = Number(e.bedrooms); filled.push('soverom'); }
    // LEIE FRA FINN er en NØDLØSNING, ikke en kilde. Den brukes bare når
    // plattformen ikke har sendt noe prisintervall i det hele tatt, og merkes
    // eksplisitt slik at admin (og redaktøren i nyhetsbrevet) ser at tallet
    // ikke er bekreftet i utleiemodulen.
    if (!doc.monthlyRentBand && e.monthlyRentBand) { out.monthlyRentBand = e.monthlyRentBand; out.rentBandSource = 'finn'; filled.push('leie'); }
    // Postnummer fra FINN er mer presist enn gatenavn-oppslag hos Kartverket, så
    // den bydelen vinner over vår egen utledning — men aldri over plattformens.
    if (e.district && doc.districtSource !== 'plattform' && doc.districtSource !== 'postnummer') {
      out.district = e.district;
      out.districtSource = 'finn-postnummer';
      if (!doc.district) filled.push('bydel');
    }
    if (e.postalCode) out.postalCode = e.postalCode;
    out.finnUrl = e.finnUrl;
    out.finnCode = e.finnCode || '';
    out.finnStatus = e.finnStatus || 'ukjent';
    out.finnCheckedAt = e.finnCheckedAt || null;
    out.finnSource = 'manuell';
  } else if (unit && unit.finnUrl) {
    // Plattformen sender nå FINN-lenken selv (finnStatus er best-effort:
    // 'utgatt' når boligen er utleid, ellers 'ukjent'). Ingen manuell jobb.
    out.finnUrl = unit.finnUrl;
    out.finnCode = unit.finnkode || '';
    out.finnStatus = unit.finnStatus || 'ukjent';
    out.finnCheckedAt = unit.finnLastSeenAt || null;
    out.finnSource = 'plattform';
  }

  // ADMIN-SPEILING av «Enheter»-visningen. Disse feltene er kun for innlogget
  // admin — de strippes i listPublicProperties og på boliginteresse-siden.
  if (unit) {
    out.fullAddress = unit.fullAddress;
    out.street = unit.street;
    out.houseNumber = unit.houseNumber;
    out.floor = unit.floor;
    out.rooms = unit.rooms;
    out.unitType = unit.unitType;
    out.rentalModel = unit.rentalModel;
    out.unitStatus = unit.unitStatus;
    out.ownerName = unit.ownerName;
    out.tenantName = unit.tenantName;
    out.tenantActiveFrom = unit.tenantActiveFrom;
    out.rentAmount = unit.rentAmount;
    out.rentIsEstimate = unit.rentIsEstimate;
    out.buildingId = unit.buildingId;
    out.buildingLabel = unit.buildingLabel;
    out.listingStatus = unit.listingStatus;
    out.publicUrl = unit.publicUrl;
    out.hasUnitData = true;
  } else {
    out.hasUnitData = false;
  }

  out.enriched = filled.length > 0;
  out.enrichedFields = filled;

  // -------------------------------------------------------------------------
  // ANNONSETITTEL OG LEIEKILDE
  // Plattformtittelen er personvern-trygg og derfor generisk («Møblert
  // leilighet · 1 soverom · 52 m²»). For et boligkort i nyhetsbrevet trenger
  // vi en tittel som skiller boligene fra hverandre. Rekkefølgen er streng og
  // alltid synlig i admin: redigert → FINN-annonse → plattform (kun når den
  // ikke er generisk) → avledet fra rom/type/gate.
  //
  // Snapshotet brukes BARE hvis det er hentet fra den lenken som gjelder nå —
  // ellers viser vi en tittel fra en annonse boligen ikke lenger er koblet til.
  // -------------------------------------------------------------------------
  const snapValid = snap && snap.url && out.finnUrl && snap.url === out.finnUrl;
  out.finnTitle = cleanFinnTitle((e && e.finnTitle) || (snapValid ? snap.title : '')) || null;
  out.finnRentAmount = snapValid && Number(snap.rentAmount) > 0 ? Number(snap.rentAmount) : null;
  out.finnSnapshotAt = snapValid ? (snap.fetchedAt || null) : null;
  out.finnSnapshotStatus = snapValid ? (snap.status || null) : null;
  out.finnSnapshotStale = !!(snap && snap.url && out.finnUrl && snap.url !== out.finnUrl);
  out.editorialTitle = ed && ed.title ? String(ed.title).slice(0, 160) : null;
  out.editorialTitleAt = ed && ed.title ? (ed.updatedAt || null) : null;
  if (!out.rentBandSource) out.rentBandSource = out.monthlyRentBand ? 'plattform' : null;
  const resolved = resolveListingTitle(out);
  out.listingTitle = resolved.title;
  out.listingTitleSource = resolved.source;

  // Kvalitetsflaggene må gjelde den BERIKEDE boligen, ellers blir en bolig med
  // FINN-bilder fortsatt sperret for nyhetsbrev.
  const imgs = (out.images || []).length;
  const missing = [];
  if (!imgs) missing.push('bilder');
  if (!out.sqm) missing.push('areal');
  if (!out.bedrooms) missing.push('soverom');
  if (!out.area) missing.push('gateadresse');
  out.missingFields = missing;
  out.incomplete = !imgs && !out.sqm && !out.bedrooms;
  return out;
}

export async function getPropertiesSyncMeta(db) {
  try { return (await db.collection(SETTINGS_COLL).findOne({ key: META_KEY })) || null; } catch (e) { return null; }
}

// Full synk (offset-paginering). Bevarer visible-flagg; markerer forsvunne stale.
export async function syncPropertiesFromPlatform(db, { target, key, maxPages = 10, pageLimit = 200 } = {}) {
  if (!target) return { ok: false, error: 'Plattform-URL mangler (DIGIHOME_API_URL)' };
  const startedIso = new Date().toISOString();
  let offset = 0, page = 0, lastStatus = null, lastError = null, total = null;
  const rows = [];
  try {
    while (page < maxPages) {
      const u = new URL(target.replace(/\/$/, '') + '/api/properties/export');
      u.searchParams.set('status', 'all');
      u.searchParams.set('limit', String(pageLimit));
      u.searchParams.set('offset', String(offset));
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      let res;
      try { res = await fetch(u.toString(), { headers: key ? { 'X-API-Key': key } : {}, signal: ctrl.signal }); }
      finally { clearTimeout(t); }
      lastStatus = res.status;
      if (!res.ok) { lastError = `HTTP ${res.status}`; break; }
      const j = await res.json();
      if (!j || j.ok !== true || !Array.isArray(j.properties)) { lastError = 'Uventet responsformat'; break; }
      rows.push(...j.properties);
      total = j.total != null ? Number(j.total) : total;
      page++;
      if (j.nextOffset == null) break;
      offset = Number(j.nextOffset);
    }
  } catch (e) {
    lastError = e.name === 'AbortError' ? 'Tidsavbrudd mot plattformen' : e.message;
  }

  if (lastError && rows.length === 0) {
    try {
      await db.collection(SETTINGS_COLL).updateOne({ key: META_KEY }, { $set: { key: META_KEY, lastAttemptAt: startedIso, lastError, lastStatus } }, { upsert: true });
    } catch (e) {}
    return { ok: false, error: lastError, httpStatus: lastStatus };
  }

  const coll = db.collection(PROPERTIES_COLL);
  // Hent den kanoniske enhetseksporten og koble den på via unitId === id.
  // Feiler den, kjører synken videre på boligeksporten alene.
  const { map: unitMap, error: unitsError } = await fetchUnitsExport({ target, key });
  const docs = [];
  let unitsMatched = 0, archivedSkipped = 0;
  for (const raw of rows) {
    const p = normalize(raw, target);
    if (!p.externalId) continue;
    const unit = unitMap.get(p.externalId) || null;
    if (unit) {
      unitsMatched++;
      // Enheter plattformen har arkivert skal aldri vises. De utelates her og
      // markeres dermed stale lenger ned (vi sletter aldri rader selv).
      if (unit.archived) { archivedSkipped++; continue; }
      p.unit = unit;
      if (!p.images.length && unit.images.length) p.images = unit.images;
      if (!p.postalCode && unit.postalCode) p.postalCode = unit.postalCode;
      // Kvalitetsflaggene må regnes på nytt etter at enhetsbildene er lagt inn.
      const missing = [];
      if (!p.images.length) missing.push('bilder');
      if (!p.sqm) missing.push('areal');
      if (!p.bedrooms) missing.push('soverom');
      if (!p.area) missing.push('gateadresse');
      p.missingFields = missing;
      p.incomplete = !p.images.length && !p.sqm && !p.bedrooms;
    } else {
      p.unit = null;
    }
    // BYDEL i prioritert rekkefølge: 1) plattformens egen bydel, 2) postnummer
    // (sikrest — 15 av 22 enheter har det), 3) Kartverket-oppslag på gatenavn,
    // 4) ingen. Vi gjetter aldri en bydel.
    if (!p.district || p.districtSource !== 'plattform') {
      const zip = p.postalCode || (unit && unit.postalCode) || null;
      const zipDistrict = zip ? postalToDistrict(zip) : null;
      if (zipDistrict) {
        p.district = String(zipDistrict).slice(0, 80);
        p.districtSource = 'postnummer';
      } else {
        const hint = await cachedStreetDistrict(db, p.area);
        const geo = resolveDistrict({ district: null, hint, city: p.city, area: p.area });
        p.district = geo.district ? String(geo.district).slice(0, 80) : null;
        p.districtSource = geo.source || null;
      }
    }
    docs.push(p);
  }
  // Duplikater må vurderes på HELE settet, ikke rad for rad.
  markDuplicates(docs);

  let upserted = 0, updated = 0, withDistrict = 0, incompleteCount = 0, duplicateCount = 0;
  for (const p of docs) {
    if (p.district) withDistrict++;
    if (p.incomplete) incompleteCount++;
    if (p.duplicate) duplicateCount++;
    const r = await coll.updateOne(
      { externalId: p.externalId },
      {
        $set: { ...p, stale: false, lastSeenAt: startedIso },
        $setOnInsert: { id: uuidv4(), visible: false, createdAt: startedIso },
      },
      { upsert: true }
    );
    if (r.upsertedCount) upserted++; else if (r.modifiedCount) updated++;
  }
  // Boliger som IKKE var med i denne runden → stale (skjules overalt offentlig)
  const staleRes = await coll.updateMany({ lastSeenAt: { $ne: startedIso } }, { $set: { stale: true } });

  const meta = {
    key: META_KEY,
    lastSyncAt: startedIso,
    lastAttemptAt: startedIso,
    lastError: lastError || null,
    lastStatus,
    total: rows.length,
    platformTotal: total,
    upserted,
    updated,
    withDistrict,
    incompleteCount,
    duplicateCount,
    unitsMatched,
    unitsTotal: unitMap.size,
    unitsError: unitsError || null,
    archivedSkipped,
    staleMarked: staleRes.modifiedCount || 0,
  };
  try { await db.collection(SETTINGS_COLL).updateOne({ key: META_KEY }, { $set: meta }, { upsert: true }); } catch (e) {}
  return { ok: true, synced: rows.length, upserted, updated, withDistrict, incompleteCount, duplicateCount, unitsMatched, unitsTotal: unitMap.size, unitsError: unitsError || null, archivedSkipped, staleMarked: staleRes.modifiedCount || 0, partialError: lastError || null };
}

// ---------------------------------------------------------------------------
// Regner ut datakvalitetsflagg på nytt fra det som ALT er lagret — uten å
// hente fra plattformen. Kjøres når admin/nyhetsbrev leser boliglisten, slik at
// flaggene virker umiddelbart etter deploy i stedet for ved neste synk.
// ---------------------------------------------------------------------------
export async function refreshPropertyQuality(db) {
  try {
    const docs = await db.collection(PROPERTIES_COLL)
      .find({ stale: { $ne: true } }, { projection: { _id: 0, externalId: 1, area: 1, city: 1, type: 1, bedrooms: 1, sqm: 1, images: 1, model: 1, platformUpdatedAt: 1, incomplete: 1, duplicate: 1, missingFields: 1, enrich: 1, districtSource: 1, district: 1 } })
      .limit(500).toArray();
    if (!docs.length) return { checked: 0, updated: 0 };
    for (const d of docs) {
      // KVALITET regnes på den BERIKEDE boligen (FINN-bilder teller), mens
      // DUPLIKATER regnes på rene plattformdata — ellers ville en manuelt
      // beriket bolig «rømme» fra duplikatgruppen sin.
      const eff = applyEnrichment(d);
      const imgs = (eff.images || []).length;
      const missing = [];
      if (!imgs) missing.push('bilder');
      if (!eff.sqm) missing.push('areal');
      if (!eff.bedrooms) missing.push('soverom');
      if (!eff.area) missing.push('gateadresse');
      d._missing = missing;
      d._incomplete = !imgs && !eff.sqm && !eff.bedrooms;
      d._prevIncomplete = d.incomplete;
      d._prevDuplicate = d.duplicate;
      d._prevMissing = JSON.stringify(d.missingFields || []);
    }
    markDuplicates(docs);  // setter d.duplicate / d.duplicateGroupSize
    let updated = 0;
    for (const d of docs) {
      const unchanged = d._prevIncomplete === d._incomplete
        && d._prevDuplicate === d.duplicate
        && d._prevMissing === JSON.stringify(d._missing);
      if (unchanged) continue;
      await db.collection(PROPERTIES_COLL).updateOne(
        { externalId: d.externalId },
        { $set: { incomplete: d._incomplete, duplicate: !!d.duplicate, duplicateGroupSize: d.duplicateGroupSize || 1, missingFields: d._missing } },
      );
      updated++;
    }
    return {
      checked: docs.length,
      updated,
      incomplete: docs.filter((d) => d._incomplete).length,
      duplicates: docs.filter((d) => d.duplicate).length,
      enriched: docs.filter((d) => d.enrich && d.enrich.finnUrl).length,
    };
  } catch (e) { return { checked: 0, updated: 0, error: e.message }; }
}

// ---------------------------------------------------------------------------
// Gatenavn → bydel, med DB-cache.
//
// Plattformen har TO ulike ID-rom for boliger (boligeksporten og kontrakts-
// eksporten bruker forskjellige UUID-er for samme bolig), så vi kan ikke joine
// oss til postnummeret. Vi slår det opp hos Kartverket i stedet — offentlig
// API uten nøkkel, samme kilde som adressefeltet i onboarding.
//
// Cachen gjør at en full synk koster ett oppslag per NYE gate, ikke per bolig.
// Feilet oppslag caches kort, slik at en nede-periode hos Kartverket ikke
// låser bydelen som «ukjent» i et halvt år.
// ---------------------------------------------------------------------------
async function cachedStreetDistrict(db, area) {
  const key = normStreet(area);
  if (!key) return null;
  const now = Date.now();
  try {
    const hit = await db.collection(GEO_CACHE_COLL).findOne({ street: key });
    if (hit) {
      const ttl = hit.district ? GEO_TTL_OK_MS : GEO_TTL_MISS_MS;
      if (now - Date.parse(hit.at || 0) < ttl) return hit.district || null;
    }
  } catch (_) { /* cache er en bonus, ikke et krav */ }
  const res = await fetchStreetDistrict(key);
  try {
    await db.collection(GEO_CACHE_COLL).updateOne(
      { street: key },
      { $set: { street: key, district: res.district || null, zip: res.zip || null, reason: res.reason || null, at: new Date().toISOString() } },
      { upsert: true },
    );
  } catch (_) {}
  return res.district || null;
}

// Etterfyller bydel på boliger som alt er synket (uten å hente fra plattformen).
// Idempotent — kjøres når admin/nyhetsbrev leser boliglisten, slik at
// grupperingen virker umiddelbart etter deploy i stedet for ved neste synk.
// Rører ALDRI en bydel plattformen selv har sendt.
export async function backfillPropertyDistricts(db, { force = false } = {}) {
  try {
    const q = force
      ? { stale: { $ne: true } }
      : { stale: { $ne: true }, $or: [{ district: null }, { district: '' }, { district: { $exists: false } }, { districtSource: { $in: ['by', 'by-rå', 'poststed-rå', null] } }] };
    const rows = await db.collection(PROPERTIES_COLL)
      .find(q, { projection: { _id: 0, externalId: 1, district: 1, districtSource: 1, city: 1, area: 1 } })
      .limit(300).toArray();
    if (!rows.length) return { checked: 0, updated: 0 };
    let updated = 0, viaKartverket = 0;
    for (const p of rows) {
      if (p.districtSource === 'plattform' && p.district) continue;
      const hint = await cachedStreetDistrict(db, p.area);
      if (hint) viaKartverket++;
      const geo = resolveDistrict({ district: null, hint, city: p.city, area: p.area });
      const next = geo.district ? String(geo.district).slice(0, 80) : null;
      if (next === (p.district || null) && (geo.source || null) === (p.districtSource || null)) continue;
      await db.collection(PROPERTIES_COLL).updateOne(
        { externalId: p.externalId },
        { $set: { district: next, districtSource: geo.source || null } },
      );
      updated++;
    }
    return { checked: rows.length, updated, viaKartverket };
  } catch (e) { return { checked: 0, updated: 0, error: e.message }; }
}

// Ikke-blokkerende auto-synk hvis data er eldre enn SYNC_STALE_MS (kalles fra offentlig endepunkt).
export function maybeAutoSyncProperties(db, targetResolver) {
  (async () => {
    try {
      const meta = await getPropertiesSyncMeta(db);
      const last = meta && (meta.lastAttemptAt || meta.lastSyncAt);
      if (last && Date.now() - Date.parse(last) < SYNC_STALE_MS) return;
      const target = targetResolver();
      if (!target || !target.url) return;
      // Selv-loop-vern: i preview peker plattform-URLen på markedsføringsappen
      // selv, som ikke har /api/properties/export → 404 hvert kvarter.
      try {
        const selfHost = new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').host;
        if (selfHost && new URL(target.url).host === selfHost) {
          await db.collection(SETTINGS_COLL).updateOne(
            { key: META_KEY },
            { $set: { key: META_KEY, lastAttemptAt: new Date().toISOString(), skipped: 'Boligsynk er ikke tilgjengelig i dette miljøet (plattform-URL peker på appen selv). Bruk manuell synk mot produksjon.' } },
            { upsert: true },
          );
          return;
        }
      } catch (_) { /* uparsbar URL — la synken forsøke */ }
      await syncPropertiesFromPlatform(db, { target: target.url, key: target.key });
    } catch (e) { /* stille — offentlig endepunkt skal aldri feile pga synk */ }
  })();
}

// Admin-liste: alle ikke-stale boliger (synlige først, deretter nyest oppdatert)
export async function listAdminProperties(db) {
  const props = await db.collection(PROPERTIES_COLL)
    .find({ stale: { $ne: true } }, { projection: { _id: 0 } })
    .sort({ visible: -1, platformUpdatedAt: -1 })
    .limit(500)
    .toArray();
  return props.map(applyEnrichment);
}

// Offentlig liste: KUN synlige + ikke-stale, personvern-trygge felt.
export async function listPublicProperties(db, { limit = 12 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 12, 1), 24);
  const props = await db.collection(PROPERTIES_COLL)
    .find(
      { visible: true, stale: { $ne: true } },
      { projection: { _id: 0, id: 1, title: 1, area: 1, city: 1, type: 1, bedrooms: 1, sqm: 1, images: 1, status: 1, model: 1, monthlyRentBand: 1, availableFrom: 1, district: 1, districtSource: 1, enrich: 1 } }
    )
    .sort({ status: 1, platformUpdatedAt: -1 }) // 'active' før 'rented'
    .limit(lim)
    .toArray();
  // Berik (FINN-bilder/areal/pris fyller hull), men ikke lekk interne felt utad.
  // NB: tittel-/leiekilde-feltene er ADMIN-felt. De strippes bevisst, slik at
  // den offentlige responsen er bit for bit identisk med før.
  return props.map((p) => {
    const e = applyEnrichment(p);
    const {
      finnUrl, finnCode, finnStatus, finnCheckedAt, finnSource, hasUnitData, enriched, enrichedFields,
      districtSource, missingFields, incomplete, postalCode,
      finnTitle, finnRentAmount, finnSnapshotAt, finnSnapshotStatus, finnSnapshotStale,
      editorialTitle, editorialTitleAt, listingTitle, listingTitleSource, rentBandSource,
      ...safe
    } = e;
    return safe;
  });
}

// Sett synlighet — enkelt-id eller bulk. Returnerer antall endret.
export async function setPropertyVisibility(db, { id, ids, visible }) {
  const v = visible === true;
  const list = Array.isArray(ids) && ids.length ? ids : (id ? [id] : []);
  if (!list.length) return { ok: false, error: 'Mangler id/ids' };
  const clean = list.map((x) => String(x).slice(0, 80)).slice(0, 500);
  const r = await db.collection(PROPERTIES_COLL).updateMany({ id: { $in: clean } }, { $set: { visible: v, visibilityChangedAt: new Date().toISOString() } });
  return { ok: true, changed: r.modifiedCount || 0, visible: v };
}

// Lagre/fjerne FINN-berikelse på én bolig. `id` godtar både vår lokale UUID og
// plattformens externalId, slik at admin-UI og API kan bruke det de har.
export async function setPropertyEnrichment(db, { id, enrich }) {
  const key = String(id || '').slice(0, 80);
  if (!key) return { ok: false, error: 'Mangler id' };
  const filter = { $or: [{ id: key }, { externalId: key }] };
  const doc = await db.collection(PROPERTIES_COLL).findOne(filter, { projection: { _id: 0, id: 1, externalId: 1 } });
  if (!doc) return { ok: false, error: 'Fant ikke boligen' };
  const update = enrich
    ? { $set: { enrich: { ...enrich, updatedAt: new Date().toISOString() } } }
    : { $unset: { enrich: '' } };
  await db.collection(PROPERTIES_COLL).updateOne({ externalId: doc.externalId }, update);
  const fresh = await db.collection(PROPERTIES_COLL).findOne({ externalId: doc.externalId }, { projection: { _id: 0 } });
  return { ok: true, property: applyEnrichment(fresh) };
}

// ---------------------------------------------------------------------------
// FINN-SNAPSHOT — annonsetittel og annonsert leie fra en KOBLET FINN-annonse.
// Hentes bare når admin ber om det (aldri automatisk i synken), og skriver
// aldri over plattformens tall. Snapshotet er et vitnesbyrd: «dette sto på
// FINN den <dato>». Tittelen kan brukes i nyhetsbrevet; prisen brukes KUN til
// å vise avvik mot utleiemodulen.
// ---------------------------------------------------------------------------
export async function setPropertyFinnSnapshot(db, { id, snap }) {
  const key = String(id || '').slice(0, 80);
  if (!key) return { ok: false, error: 'Mangler id' };
  const filter = { $or: [{ id: key }, { externalId: key }] };
  const doc = await db.collection(PROPERTIES_COLL).findOne(filter, { projection: { _id: 0, externalId: 1 } });
  if (!doc) return { ok: false, error: 'Fant ikke boligen' };
  const update = snap
    ? {
      $set: {
        finnSnap: {
          url: String(snap.url || '').slice(0, 300),
          title: String(snap.title || '').slice(0, 200),
          rentAmount: Number(snap.rentAmount) > 0 ? Number(snap.rentAmount) : null,
          imageCount: Number(snap.imageCount) > 0 ? Number(snap.imageCount) : 0,
          status: snap.status === 'aktiv' ? 'aktiv' : 'utgatt',
          fetchedAt: new Date().toISOString(),
        },
      },
    }
    : { $unset: { finnSnap: '' } };
  await db.collection(PROPERTIES_COLL).updateOne({ externalId: doc.externalId }, update);
  const fresh = await db.collection(PROPERTIES_COLL).findOne({ externalId: doc.externalId }, { projection: { _id: 0 } });
  return { ok: true, property: applyEnrichment(fresh) };
}

// Redaksjonell tittel — redaktørens siste ord. Tom streng nullstiller og lar
// hierarkiet (FINN → plattform → avledet) bestemme igjen.
export async function setPropertyEditorialTitle(db, { id, title }) {
  const key = String(id || '').slice(0, 80);
  if (!key) return { ok: false, error: 'Mangler id' };
  const filter = { $or: [{ id: key }, { externalId: key }] };
  const doc = await db.collection(PROPERTIES_COLL).findOne(filter, { projection: { _id: 0, externalId: 1 } });
  if (!doc) return { ok: false, error: 'Fant ikke boligen' };
  const clean = String(title == null ? '' : title).replace(/\s+/g, ' ').trim().slice(0, 160);
  const update = clean
    ? { $set: { editorial: { title: clean, updatedAt: new Date().toISOString() } } }
    : { $unset: { editorial: '' } };
  await db.collection(PROPERTIES_COLL).updateOne({ externalId: doc.externalId }, update);
  const fresh = await db.collection(PROPERTIES_COLL).findOne({ externalId: doc.externalId }, { projection: { _id: 0 } });
  return { ok: true, cleared: !clean, property: applyEnrichment(fresh) };
}
