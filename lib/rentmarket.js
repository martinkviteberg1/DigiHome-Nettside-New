// Leiemarkedsrapport — datapipeline.
// Kombinerer offisiell SSB-statistikk (Statistisk sentralbyrå, PxWeb API) med
// DigiHomes egen etterspørselsindeks til en siterbar, lenkbar PR/SEO-ressurs.
//
// Kilder:
//  - SSB tabell 09895: Gjennomsnittlig månedlig leie (kr), per prissone + antall rom + år.
//  - SSB tabell 09897: Predikert månedlig leie (kr), per prissone + antall rom/bruksareal.
//
// Rapporten caches i MongoDB ('rent_reports'). SSB oppdaterer årlig (desember),
// så 24t TTL er rikelig. Admin kan tvinge oppdatering.

import { getDb, clean } from '@/lib/mongodb';
import { locations } from '@/lib/locations';
import { chatLLM } from '@/lib/llm';

const SSB_BASE = 'https://data.ssb.no/api/v0/no/table';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 timer

// ── Bykonfigurasjon (utvides enkelt med Oslo/Trondheim/Stavanger senere) ──
export const RENT_CITIES = {
  bergen: {
    slug: 'bergen',
    label: 'Bergen',
    region: 'Vestland',
    zone09895: '03', // Bergen kommune
    zones09897: [
      { code: '03.01', label: 'Bergen sentrum', sub: 'Bergenhus' },
      { code: '03.02', label: 'Øvrige bydeler', sub: 'Resten av Bergen' },
    ],
    image:
      'https://images.unsplash.com/photo-1580946443359-1126222f9224?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    intro:
      'Bergen er et av Norges sterkeste leiemarkeder — drevet av studenter, helsepersonell, offshore-pendlere og et voksende reiseliv. Her er hva offisiell statistikk og DigiHomes egne forvaltningsdata sier om leieprisene akkurat nå.',
  },
};

export function rentCitySlugs() {
  return Object.keys(RENT_CITIES);
}

// Representative boligstørrelser i tabell 09897 (kode = "antallRom.bruksareal").
const SIZES_09897 = [
  { key: '1.030', label: '1-roms', sqm: 30, rooms: 1 },
  { key: '2.050', label: '2-roms', sqm: 50, rooms: 2 },
  { key: '3.070', label: '3-roms', sqm: 70, rooms: 3 },
  { key: '4.100', label: '4-roms', sqm: 100, rooms: 4 },
];

const ROOM_LABELS = {
  '1': '1-roms',
  '2': '2-roms',
  '3': '3-roms',
  '4': '4-roms',
  '5+': '5-roms+',
};

// ── SSB PxWeb-klient ──────────────────────────────────────────────────────
async function ssbPost(table, query) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${SSB_BASE}/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, response: { format: 'json-stat2' } }),
      signal: ctrl.signal,
      // SSB-data er stabilt; la Next cache i en time per unike spørring.
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`SSB ${table} ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// Generisk json-stat2 → liste av { <dimkode>: verdikode, value }.
function jsonstatRecords(d) {
  const ids = d.id; // f.eks ["Soner2","AntRom","ContentsCode","Tid"]
  const size = d.size;
  const values = d.value;
  // Posisjons-array per dimensjon (verdikode i rekkefølge).
  const dimOrder = ids.map((code) => {
    const idx = d.dimension[code].category.index; // {code: pos}
    const arr = [];
    Object.entries(idx).forEach(([k, p]) => { arr[p] = k; });
    return arr;
  });
  const strides = size.map((_, i) => size.slice(i + 1).reduce((a, b) => a * b, 1));
  const records = [];
  const total = values.length;
  for (let flat = 0; flat < total; flat++) {
    const rec = {};
    let rem = flat;
    for (let i = 0; i < ids.length; i++) {
      const pos = Math.floor(rem / strides[i]);
      rem -= pos * strides[i];
      rec[ids[i]] = dimOrder[i][pos];
    }
    rec.value = values[flat];
    records.push(rec);
  }
  return records;
}

function ssbUpdated(d) {
  return d.updated || null;
}

// ── Tabell 09895: månedsleie per romtall + tidsserie ──────────────────────
async function fetch09895(zoneCode) {
  const d = await ssbPost('09895', [
    { code: 'Soner2', selection: { filter: 'item', values: [zoneCode] } },
    { code: 'AntRom', selection: { filter: 'item', values: ['1', '2', '3', '4', '5+'] } },
    { code: 'ContentsCode', selection: { filter: 'item', values: ['Husleie'] } },
    { code: 'Tid', selection: { filter: 'top', values: ['6'] } },
  ]);
  const recs = jsonstatRecords(d);
  const yearsSet = new Set();
  const byRoomMap = {};
  recs.forEach((r) => {
    yearsSet.add(r.Tid);
    if (!byRoomMap[r.AntRom]) byRoomMap[r.AntRom] = [];
    byRoomMap[r.AntRom].push({ year: r.Tid, val: r.value == null ? null : Math.round(r.value) });
  });
  const years = [...yearsSet].sort();
  const byRoom = ['1', '2', '3', '4', '5+'].map((rk) => {
    const series = (byRoomMap[rk] || []).sort((a, b) => a.year.localeCompare(b.year));
    const nonNull = series.filter((s) => s.val != null);
    const last = nonNull[nonNull.length - 1] || null;
    const prev = nonNull.length >= 2 ? nonNull[nonNull.length - 2] : null;
    const yoyPct = last && prev && prev.val ? +(((last.val - prev.val) / prev.val) * 100).toFixed(1) : null;
    return {
      roomKey: rk,
      label: ROOM_LABELS[rk],
      current: last ? last.val : null,
      currentYear: last ? last.year : null,
      prev: prev ? prev.val : null,
      prevYear: prev ? prev.year : null,
      yoyPct,
      series,
    };
  });
  return { years, byRoom, updated: ssbUpdated(d) };
}

// ── Tabell 09897: predikert leie per sone + størrelse (siste år) ──────────
async function fetch09897(city) {
  const zoneCodes = city.zones09897.map((z) => z.code);
  const d = await ssbPost('09897', [
    { code: 'Soner2', selection: { filter: 'item', values: zoneCodes } },
    { code: 'AntRomBRA', selection: { filter: 'item', values: SIZES_09897.map((s) => s.key) } },
    { code: 'ContentsCode', selection: { filter: 'item', values: ['Husleie'] } },
    { code: 'Tid', selection: { filter: 'top', values: ['1'] } },
  ]);
  const recs = jsonstatRecords(d);
  const year = recs.length ? recs[0].Tid : null;
  const zones = city.zones09897.map((z) => {
    const sizes = SIZES_09897.map((s) => {
      const rec = recs.find((r) => r.Soner2 === z.code && r.AntRomBRA === s.key);
      const rent = rec && rec.value != null ? Math.round(rec.value) : null;
      return {
        key: s.key,
        label: s.label,
        sqm: s.sqm,
        rooms: s.rooms,
        rent,
        perSqm: rent ? Math.round(rent / s.sqm) : null,
      };
    });
    return { code: z.code, label: z.label, sub: z.sub, sizes };
  });
  return { year, zones, updated: ssbUpdated(d) };
}

// ── DigiHome Etterspørselsindeks ──────────────────────────────────────────
const DEMAND_BASELINE = {
  'Svært høy': 90,
  Høy: 78,
  'Moderat til høy': 64,
  Moderat: 52,
};

function demandLevel(idx) {
  if (idx >= 85) return 'Svært høy';
  if (idx >= 70) return 'Høy';
  if (idx >= 55) return 'Moderat til høy';
  return 'Moderat';
}

async function computeDemandIndex(db, citySlug) {
  // Bydeler vi faktisk dekker (fra locations.js), med kuratert baseline.
  const bydeler = locations.filter((l) => l.type === 'bydel' && l.parent === citySlug);

  // Faktiske signaler de siste 90 dagene.
  const sinceIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  let tenants = [];
  let leadCount = 0;
  try {
    tenants = await db
      .collection('tenant_leads')
      .find({ createdAt: { $gte: sinceIso } })
      .project({ preferred_area: 1 })
      .limit(2000)
      .toArray();
  } catch (e) { tenants = []; }
  try {
    leadCount = await db.collection('leads').countDocuments({ createdAt: { $gte: sinceIso } });
  } catch (e) { leadCount = 0; }

  const tenantText = tenants.map((t) => (t.preferred_area || '').toLowerCase());
  const tenantTotal = tenants.length;

  const byArea = bydeler.map((b) => {
    const base = DEMAND_BASELINE[b.market?.demand] || 60;
    const name = b.name.toLowerCase().replace('bergen ', '');
    const signals = tenantText.filter((txt) => txt && (txt.includes(name) || txt.includes(b.slug))).length;
    // Baseline er gulvet (kuratert markedskunnskap per bydel). Faktiske
    // leietaker-signaler kan kun LØFTE indeksen — aldri trekke en reelt sterk
    // bydel ned fordi få tilfeldigvis fylte ut et skjema. Maks +15 boost.
    const signalBoost = Math.min(15, signals * 3);
    const index = Math.min(100, Math.round(base + signalBoost));
    return {
      slug: b.slug,
      area: b.name,
      index,
      level: demandLevel(index),
      signals,
      baseline: base,
      popularTypes: b.market?.popularTypes || [],
    };
  }).sort((a, b) => b.index - a.index);

  const cityIndex = byArea.length
    ? Math.round(byArea.reduce((a, b) => a + b.index, 0) / byArea.length)
    : 75;

  return {
    index: cityIndex,
    level: demandLevel(cityIndex),
    byArea,
    signals: { tenants: tenantTotal, leads: leadCount, windowDays: 90 },
    note:
      'DigiHome Etterspørselsindeks (0–100) kombinerer SSBs prissoner, faktisk leietakerinteresse hos DigiHome de siste 90 dagene og vår løpende forvaltningsdata. Indeksen oppdateres kontinuerlig etter hvert som datagrunnlaget vokser.',
  };
}

// ── Deterministiske innsikter (alltid tilgjengelig) ───────────────────────
function buildInsights(city, m, z) {
  const out = [];
  const fmt = (n) => (n == null ? '–' : n.toLocaleString('nb-NO'));
  const two = m.byRoom.find((r) => r.roomKey === '2');
  if (two && two.current) {
    out.push(
      `En 2-roms leilighet i ${city.label} leies i snitt for ${fmt(two.current)} kr/mnd (${two.currentYear}).`
    );
    if (two.yoyPct != null) {
      const dir = two.yoyPct >= 0 ? 'opp' : 'ned';
      out.push(
        `Snittleien for en 2-roms har gått ${dir} ${Math.abs(two.yoyPct)} % fra ${two.prevYear} til ${two.currentYear}.`
      );
    }
  }
  const one = m.byRoom.find((r) => r.roomKey === '1');
  const four = m.byRoom.find((r) => r.roomKey === '4');
  if (one?.current && four?.current) {
    out.push(
      `Spennet går fra rundt ${fmt(one.current)} kr/mnd for en 1-roms til ${fmt(four.current)} kr/mnd for en 4-roms.`
    );
  }
  // Sone-differanse (sentrum vs øvrige) for 2-roms 50 m².
  if (z.zones.length >= 2) {
    const sentrum = z.zones[0].sizes.find((s) => s.rooms === 2);
    const ovrige = z.zones[1].sizes.find((s) => s.rooms === 2);
    if (sentrum?.rent && ovrige?.rent) {
      const diff = Math.round(((sentrum.rent - ovrige.rent) / ovrige.rent) * 100);
      out.push(
        `Sentralt (${z.zones[0].sub}) ligger en 2-roms ca. ${diff} % høyere enn i øvrige bydeler — ${fmt(sentrum.rent)} mot ${fmt(ovrige.rent)} kr/mnd.`
      );
    }
  }
  return out;
}

// Valgfri AI-narrativ (genereres ved oppdatering, lagres i rapporten).
async function buildAiSummary(city, report) {
  try {
    const ctx = {
      by: city.label,
      år: report.year,
      snittPerRom: report.byRoom.map((r) => ({ rom: r.label, kr: r.current, endringPst: r.yoyPct })),
      soner: report.zones.map((z) => ({ sone: z.label, priser: z.sizes.map((s) => ({ str: `${s.label} ${s.sqm}m²`, kr: s.rent })) })),
      etterspørsel: { indeks: report.demand.index, nivå: report.demand.level },
    };
    const SYS =
      'Du er markedsanalytiker for DigiHome, en AI-drevet eiendomsforvalter i Bergen. Skriv en kort, faktabasert markedsvurdering på norsk bokmål (3-4 setninger) basert KUN på de oppgitte tallene. Vær presis, nøktern og redaksjonell — ingen overdrivelser, ingen oppdiktede tall. Avslutt med én setning om hva dette betyr for boligeiere som vurderer utleie.';
    const answer = await chatLLM({
      messages: [
        { role: 'system', content: SYS },
        { role: 'user', content: `LEIEMARKEDSDATA (kilde SSB):\n${JSON.stringify(ctx)}` },
      ],
      maxTokens: 400,
      temperature: 0.35,
    });
    return (answer || '').trim() || null;
  } catch (e) {
    return null;
  }
}

// ── Bygg full rapport ─────────────────────────────────────────────────────
export async function buildReport(db, citySlug, { withAi = true } = {}) {
  const city = RENT_CITIES[citySlug];
  if (!city) throw new Error('Ukjent by');

  const [m, z, demand] = await Promise.all([
    fetch09895(city.zone09895),
    fetch09897(city),
    computeDemandIndex(db, citySlug),
  ]);

  const two = m.byRoom.find((r) => r.roomKey === '2') || {};
  const oneR = m.byRoom.find((r) => r.roomKey === '1') || {};
  const fourR = m.byRoom.find((r) => r.roomKey === '4') || {};

  // Trend: snitt på tvers av romtall per år (for linje/sparkline).
  const trend = m.years.map((y) => {
    const vals = m.byRoom
      .map((r) => (r.series.find((s) => s.year === y) || {}).val)
      .filter((v) => v != null);
    return { year: y, val: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
  });

  const report = {
    id: citySlug,
    city: citySlug,
    cityLabel: city.label,
    region: city.region,
    image: city.image,
    intro: city.intro,
    year: two.currentYear || (m.years[m.years.length - 1] || null),
    prevYear: two.prevYear || null,
    generatedAt: new Date().toISOString(),
    source: {
      name: 'Statistisk sentralbyrå (SSB)',
      tables: [
        { id: '09895', title: 'Gjennomsnittlig månedlig leie, etter prissone og antall rom', url: 'https://www.ssb.no/statbank/table/09895' },
        { id: '09897', title: 'Predikert månedlig leie, etter prissone og antall rom/bruksareal', url: 'https://www.ssb.no/statbank/table/09897' },
      ],
      ssbUpdated: m.updated || z.updated || null,
      license: 'Creative Commons BY 4.0',
    },
    byRoom: m.byRoom,
    years: m.years,
    trend,
    zones: z.zones,
    headline: {
      typical2rom: two.current ?? null,
      yoy2rom: two.yoyPct ?? null,
      rangeLow: oneR.current ?? null,
      rangeHigh: fourR.current ?? null,
    },
    demand,
    insights: buildInsights(city, m, z),
  };

  if (withAi) {
    report.aiSummary = await buildAiSummary(city, report);
  }

  // Persistér i cache.
  try {
    await db.collection('rent_reports').updateOne(
      { id: citySlug },
      { $set: report },
      { upsert: true }
    );
  } catch (e) { /* cache er best-effort */ }

  return report;
}

// ── Cache-aware henting ───────────────────────────────────────────────────
export async function getRentReport(citySlug, { db, force = false } = {}) {
  if (!RENT_CITIES[citySlug]) return null;
  const database = db || (await getDb());
  if (!force) {
    try {
      const cached = await database.collection('rent_reports').findOne({ id: citySlug });
      if (cached) {
        const age = Date.now() - new Date(cached.generatedAt || 0).getTime();
        if (age < TTL_MS) return clean(cached);
        // Stale → bygg på nytt, men uten AI for lav latens (AI fornyes via admin-refresh).
        try {
          return await buildReport(database, citySlug, { withAi: false });
        } catch (e) {
          return clean(cached); // fall tilbake til cache hvis SSB feiler
        }
      }
    } catch (e) { /* fall gjennom til ferskbygg */ }
  }
  return await buildReport(database, citySlug, { withAi: true });
}

export async function refreshRentReport(db, citySlug) {
  return await buildReport(db, citySlug, { withAi: true });
}
