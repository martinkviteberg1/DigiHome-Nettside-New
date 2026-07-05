// ---------------------------------------------------------------------------
// Ekstern API-forbrukstelling (egen telling = estimat).
//
// Vi teller hvert fakturerbare kall mot eksterne tjenester der DET SKJER
// (SendGrid-utsending, SerpAPI-søk, Google Maps autocomplete/details) og
// priser dem mot en liten prisliste → estimert kostnad i sanntid.
// Leverandørens faktura er fasit; dette er attribusjon/trend.
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';
import { USD_TO_NOK } from '@/lib/llm-usage';

export const EXT_USAGE_COLL = 'ext_usage';

// Enhetspriser (USD) — listepriser per 2026, oppdater ved behov.
export const EXT_SERVICES = {
  sendgrid: { label: 'SendGrid', detail: 'E-postutsending (nyhetsbrev, kvitteringer, varsler)', unit: 'e-poster', usdPerUnit: 0.0006 },
  serpapi: { label: 'SerpAPI', detail: 'Konkurrentannonser (Google Ads Transparency)', unit: 'søk', usdPerUnit: 0.015 },
  google_maps_autocomplete: { label: 'Google Maps · Autocomplete', detail: 'Adressefelt i skjemaer', unit: 'kall', usdPerUnit: 0.00283 },
  google_maps_details: { label: 'Google Maps · Place Details', detail: 'Postnummer/poststed ved adressevalg', unit: 'kall', usdPerUnit: 0.017 },
};

const r = (x, d = 6) => { const m = Math.pow(10, d); return Math.round((Number(x) || 0) * m) / m; };

// Fire-and-forget: logg én forbruks-hendelse. Feiler stille.
export async function logExtUsage(db, service, units = 1) {
  try {
    if (!db || !service) return;
    const meta = EXT_SERVICES[service] || { usdPerUnit: 0 };
    const n = Math.max(1, Number(units) || 1);
    const usd = r(meta.usdPerUnit * n, 6);
    await db.collection(EXT_USAGE_COLL).insertOne({
      id: uuidv4(),
      at: new Date().toISOString(),
      service: String(service).slice(0, 60),
      units: n,
      costUsd: usd,
      costNok: r(usd * USD_TO_NOK, 4),
    });
  } catch (_) { /* stille */ }
}

// Aggregert forbruk per tjeneste siste N dager. Kjente tjenester vises alltid
// (med 0 hvis ingen bruk) slik at panelet er komplett.
export async function summarizeExtUsage(db, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  let rows = [];
  try {
    rows = await db.collection(EXT_USAGE_COLL).aggregate([
      { $match: { at: { $gte: since } } },
      { $group: { _id: '$service', units: { $sum: '$units' }, costNok: { $sum: '$costNok' }, costUsd: { $sum: '$costUsd' }, calls: { $sum: 1 } } },
    ]).toArray();
  } catch (_) { rows = []; }
  const byService = new Map(rows.map((x) => [x._id, x]));
  const r2 = (x) => Math.round((Number(x) || 0) * 10000) / 10000;
  const services = Object.entries(EXT_SERVICES).map(([id, meta]) => {
    const hit = byService.get(id) || { units: 0, costNok: 0, costUsd: 0 };
    return {
      service: id,
      label: meta.label,
      detail: meta.detail,
      unit: meta.unit,
      units: hit.units || 0,
      costNok: r2(hit.costNok),
      costUsd: r2(hit.costUsd),
      source: 'estimate',
    };
  });
  // Ukjente tjenester (fremtidige) tas også med.
  for (const row of rows) {
    if (!EXT_SERVICES[row._id]) {
      services.push({ service: row._id, label: row._id, detail: '', unit: 'kall', units: row.units || 0, costNok: r2(row.costNok), costUsd: r2(row.costUsd), source: 'estimate' });
    }
  }
  return {
    days,
    totalNok: r2(services.reduce((s, x) => s + x.costNok, 0)),
    services: services.sort((a, b) => b.costNok - a.costNok),
  };
}
