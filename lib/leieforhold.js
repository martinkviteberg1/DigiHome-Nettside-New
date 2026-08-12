// ---------------------------------------------------------------------------
// Leieforhold & inntekter — datalag. Speiler plattformens visning 1:1 etter
// spec fra plattform-agenten (agentbro-tråd «leieforhold-view», 2026-08-12).
//
// KILDE (i prioritert rekkefølge):
//   1) GET {platform}/api/lease-income/export  (X-API-Key) — EKSAKT samme
//      rows[] + totals{} som plattformens skjerm/Excel. Plattform-teamet
//      bygger denne etter vår bekreftelse på broen; vi prøver den alltid først.
//   2) FALLBACK: avledet fra GET /api/contracts/export til (1) er live.
//      Kjente hull i fallback (per spec): ledig-estimat, fee_vat_inclusive
//      per enhet, bofellesskap-rom og annonsert-status mangler → merkes
//      med source='contracts-fallback' slik at UI kan vise det.
//
// Radformat (kanonisk, brukes av skjerm + Excel + CSV):
//   { unit_room, address, unit_type, owner_name, tenant_name, status_label,
//     group ('leased'|'future'|'signing'|'vacant'), advertised, move_in_date,
//     monthly_rent, fee_percent, fee_amount (eks. mva), net_to_owner,
//     deposit, income_type, service_level, vat_inclusive }
// ---------------------------------------------------------------------------

const GRUPPE_REKKEFOLGE = { leased: 0, future: 1, signing: 2, vacant: 3 };
const STATUS_LABEL = {
  leased: 'Utleid',
  future: 'Fremtidig innflytting',
  signing: 'Under signering',
  vacant: 'Ledig',
};
const INCOME_LABEL = {
  actual: 'Faktisk leie',
  expected_signed: 'Forventet (signert)',
  pending_signing: 'Under signering',
  estimate: 'Estimat',
};

const n = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
const r0 = (x) => Math.round(n(x));

// Honorar/mva-formel fra spec pkt. 5b: honorar-kolonnen er ALLTID eks. mva.
// privat (vat_inclusive=true): satsen er brutto → eks = brutto / 1,25
// næring (vat_inclusive=false): satsen er eks → mva legges på toppen
export function beregnHonorar({ monthly_rent, fee_percent, vat_inclusive }) {
  const brutto = n(monthly_rent) * n(fee_percent) / 100;
  const eks = vat_inclusive ? brutto / 1.25 : brutto;
  const inkl = eks * 1.25;
  return { fee_amount: r0(eks), fee_incl: r0(inkl), net_to_owner: r0(n(monthly_rent) - inkl) };
}

// Totals per spec pkt. 2: honorar/netto summeres KUN for income_type='actual'.
export function beregnTotals(rows) {
  const t = {
    actual_rent: 0, expected_rent: 0, pending_rent: 0, estimate_rent: 0,
    leased: 0, future: 0, signing: 0, vacant: 0,
    fee: 0, net: 0, count: rows.length, occupancy_pct: 0,
  };
  for (const r of rows) {
    if (r.group === 'leased') { t.leased += 1; t.actual_rent += n(r.monthly_rent); t.fee += n(r.fee_amount); t.net += n(r.net_to_owner); }
    else if (r.group === 'future') { t.future += 1; t.expected_rent += n(r.monthly_rent); }
    else if (r.group === 'signing') { t.signing += 1; t.pending_rent += n(r.monthly_rent); }
    else { t.vacant += 1; t.estimate_rent += n(r.monthly_rent); }
  }
  t.occupancy_pct = t.count ? Math.round((t.leased / t.count) * 100) : 0;
  return t;
}

function sorterRader(rows) {
  return [...rows].sort((a, b) => {
    const g = (GRUPPE_REKKEFOLGE[a.group] ?? 9) - (GRUPPE_REKKEFOLGE[b.group] ?? 9);
    if (g !== 0) return g;
    return n(b.monthly_rent) - n(a.monthly_rent);
  });
}

// Tolerant normalisering av rader fra plattformens lease-income/export.
function normaliserPlattformRad(r) {
  const group = ['leased', 'future', 'signing', 'vacant'].includes(r.group) ? r.group
    : /utleid/i.test(r.status_label || '') ? 'leased'
    : /fremtidig/i.test(r.status_label || '') ? 'future'
    : /signering/i.test(r.status_label || '') ? 'signing' : 'vacant';
  const vat = r.vat_inclusive ?? r.fee_vat_inclusive ?? true;
  const rent = n(r.monthly_rent ?? r.amount ?? r.rent);
  const fp = n(r.fee_percent ?? r.sats);
  const hon = (r.fee_amount != null && r.net_to_owner != null)
    ? { fee_amount: r0(r.fee_amount), net_to_owner: r0(r.net_to_owner) }
    : beregnHonorar({ monthly_rent: rent, fee_percent: fp, vat_inclusive: !!vat });
  return {
    unit_room: String(r.unit_room || r.title || r.unit || '').trim() || 'Enhet',
    address: String(r.address || r.sub_address || '').trim(),
    unit_type: r.unit_type === 'Rom i bofellesskap' ? 'Rom i bofellesskap' : 'Hel enhet',
    owner_name: String(r.owner_name || '').trim(),
    tenant_name: String(r.tenant_name || '').trim(),
    status_label: r.status_label || (group === 'vacant' && r.advertised ? 'Ledig (Annonsert)' : STATUS_LABEL[group]),
    group,
    advertised: !!r.advertised,
    move_in_date: (group === 'future' || group === 'signing') ? String(r.move_in_date || '').slice(0, 10) : '',
    monthly_rent: rent,
    fee_percent: fp,
    fee_amount: hon.fee_amount,
    net_to_owner: hon.net_to_owner,
    deposit: r.deposit != null ? r0(r.deposit) : null,
    income_type: INCOME_LABEL[r.income_type] ? r.income_type
      : group === 'leased' ? 'actual' : group === 'future' ? 'expected_signed' : group === 'signing' ? 'pending_signing' : 'estimate',
    service_level: r.service_level === 'Selvbetjening' ? 'Selvbetjening' : 'Full forvaltning',
    vat_inclusive: !!vat,
  };
}

// FALLBACK: avled rader fra contracts/export (best effort — se hull i header).
function avledFraKontrakter(contracts) {
  const idag = new Date().toISOString().slice(0, 10);
  const perEiendom = new Map();
  for (const c of contracts || []) {
    const pid = c?.property?.id || c?.property?.address || c?.contract_id;
    if (!perEiendom.has(pid)) perEiendom.set(pid, { property: c.property || {}, forvaltning: null, leie: [] });
    const e = perEiendom.get(pid);
    if (!e.property?.address && c.property?.address) e.property = c.property;
    if (String(c.type || '').includes('forvaltning')) {
      // Foretrekk aktiv avtale som kilde til sats/eier.
      if (!e.forvaltning || c.status === 'active') e.forvaltning = c;
    } else {
      e.leie.push(c);
    }
  }

  const rows = [];
  for (const e of perEiendom.values()) {
    const p = e.property || {};
    const forv = e.forvaltning;
    const eierNavn = (forv?.owner?.name || e.leie[0]?.owner?.name || '').trim();
    // Uten fee_vat_inclusive i eksporten: AS/ASA-eiere behandles som næring
    // (sats eks. mva), øvrige som privat (sats inkl. mva) — dokumentert antakelse.
    const vat = !/\b(AS|ASA|ANS|DA)\b/i.test(eierNavn);
    const sats = forv?.fee_model === 'percent' ? n(forv?.fee_percent) * 100
      : e.leie.find((k) => k.fee_model === 'percent') ? n(e.leie.find((k) => k.fee_model === 'percent').fee_percent) * 100 : 0;

    const aktive = e.leie.filter((k) => k.status !== 'terminated' && !k.terminated_at);
    // Velg gjeldende leiekontrakt: aktiv > signert > under signering (høyest leie først).
    const aktiv = aktive.filter((k) => k.status === 'active').sort((a, b) => n(b.monthly_rent) - n(a.monthly_rent))[0];
    const signert = aktive.filter((k) => k.status === 'signed').sort((a, b) => n(b.monthly_rent) - n(a.monthly_rent))[0];
    const pending = aktive.filter((k) => k.status === 'pending').sort((a, b) => n(b.monthly_rent) - n(a.monthly_rent))[0];

    let group = 'vacant'; let kontrakt = null;
    if (aktiv) { group = 'leased'; kontrakt = aktiv; }
    else if (signert) { kontrakt = signert; group = String(signert.start_date || '').slice(0, 10) > idag ? 'future' : 'leased'; }
    else if (pending) { group = 'signing'; kontrakt = pending; }

    const rent = group === 'vacant'
      ? n(forv?.estimated_monthly_rent || e.leie[0]?.estimated_monthly_rent || 0)
      : n(kontrakt?.monthly_rent || kontrakt?.estimated_monthly_rent || 0);
    const hon = group === 'leased' ? beregnHonorar({ monthly_rent: rent, fee_percent: sats, vat_inclusive: vat })
      : beregnHonorar({ monthly_rent: group === 'vacant' ? 0 : rent, fee_percent: sats, vat_inclusive: vat });
    const tittel = `Hel enhet${p.sqm ? ` · ${p.sqm} m²` : ''}`;
    const moveIn = (group === 'future' || group === 'signing')
      ? String(kontrakt?.start_date || kontrakt?.expected_rent_start || '').slice(0, 10) : '';

    rows.push({
      unit_room: tittel,
      address: String(p.address || '').trim(),
      unit_type: 'Hel enhet',
      owner_name: eierNavn,
      tenant_name: (kontrakt?.tenant?.name || '').trim(),
      status_label: STATUS_LABEL[group],
      group,
      advertised: false,
      move_in_date: moveIn,
      monthly_rent: rent,
      fee_percent: sats,
      fee_amount: group === 'vacant' ? 0 : hon.fee_amount,
      net_to_owner: group === 'vacant' ? 0 : hon.net_to_owner,
      deposit: null,
      income_type: group === 'leased' ? 'actual' : group === 'future' ? 'expected_signed' : group === 'signing' ? 'pending_signing' : 'estimate',
      service_level: forv ? 'Full forvaltning' : 'Selvbetjening',
      vat_inclusive: vat,
    });
  }
  return rows;
}

// Hovedinngang: hent rader + totals fra plattformen (target fra
// financeSyncTarget/digiHomeTarget i route.js). Plattformen kan bruke
// 10–25 s på å svare, så vi cacher siste vellykkede svar i MongoDB
// (leieforhold_cache) og svarer umiddelbart når cachen er fersk (<10 min).
// opts.fresh=true hopper over cachen (Oppdater-knappen). Feiler plattformen
// serveres siste lagrede data med stale-flagg i stedet for en feilside.
const CACHE_TTL_MS = 10 * 60 * 1000;

function pentFeil(e) {
  const m = String(e?.message || e || '');
  if (e?.name === 'TimeoutError' || /abort|timeout/i.test(m)) return 'Plattformen svarte ikke i tide — prøv å oppdatere om litt.';
  if (/fetch failed|ENOTFOUND|ECONN/i.test(m)) return 'Fikk ikke kontakt med plattformen — sjekk tilkoblingen og prøv igjen.';
  return m || 'Ukjent feil mot plattformen';
}

async function hentFraPlattform(base, key) {
  // 1) Dedikert 1:1-endepunkt (plattformen bygger dette — prøves alltid først,
  //    kort frist: finnes det ikke svarer det raskt med 404).
  try {
    const res = await fetch(`${base}/api/lease-income/export?limit=500`, { headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const j = await res.json();
      const raa = j.rows || j.data || [];
      if (Array.isArray(raa) && raa.length) {
        const rows = sorterRader(raa.map(normaliserPlattformRad));
        const totals = (j.totals && typeof j.totals === 'object' && Number.isFinite(Number(j.totals.actual_rent)))
          ? { ...beregnTotals(rows), ...j.totals }
          : beregnTotals(rows);
        return { ok: true, source: 'lease-income', rows, totals };
      }
    }
  } catch (e) { /* faller videre til kontrakt-avledning */ }

  // 2) Fallback: avled fra contracts/export (raus frist — prod bruker 8–20 s).
  const res = await fetch(`${base}/api/contracts/export?status=all&limit=500`, { headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`contracts/export svarte ${res.status}`);
  const j = await res.json();
  const rows = sorterRader(avledFraKontrakter(j.contracts || []));
  return { ok: true, source: 'contracts-fallback', rows, totals: beregnTotals(rows) };
}

export async function hentLeieforhold(target, opts = {}) {
  const { db = null, fresh = false } = opts;
  const base = String(target?.url || '').replace(/\/+$/, '');
  const key = target?.key || '';
  const env = target?.env || '';
  if (!base || !key) return { ok: false, error: 'Plattform-API er ikke konfigurert', source: 'none', env, rows: [], totals: beregnTotals([]) };

  const cacheId = `leieforhold:${env || 'auto'}:${base}`;
  let cachet = null;
  if (db) {
    try { cachet = await db.collection('leieforhold_cache').findOne({ id: cacheId }, { projection: { _id: 0 } }); } catch (e) {}
    if (!fresh && cachet?.data?.ok && Date.now() - new Date(cachet.fetchedAt).getTime() < CACHE_TTL_MS) {
      return { ...cachet.data, env, cached: true, fetchedAt: cachet.fetchedAt };
    }
  }

  try {
    const resultat = await hentFraPlattform(base, key);
    const fetchedAt = new Date().toISOString();
    if (db) {
      try { await db.collection('leieforhold_cache').updateOne({ id: cacheId }, { $set: { id: cacheId, env, data: resultat, fetchedAt } }, { upsert: true }); } catch (e) {}
    }
    return { ...resultat, env, fetchedAt };
  } catch (e) {
    // Plattformen feilet/tidsavbrudd: server siste lagrede data i stedet for feil.
    if (cachet?.data?.ok) {
      return { ...cachet.data, env, cached: true, stale: true, fetchedAt: cachet.fetchedAt, warning: pentFeil(e) };
    }
    return { ok: false, error: pentFeil(e), source: 'none', env, rows: [], totals: beregnTotals([]) };
  }
}

export { STATUS_LABEL, INCOME_LABEL, GRUPPE_REKKEFOLGE };
