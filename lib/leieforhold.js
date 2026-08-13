// ---------------------------------------------------------------------------
// Leieforhold & inntekter — datalag. Speiler plattformens visning (verifisert
// mot plattformens egen eksport 13.08.2026 — «lf7-fasit»).
//
// KILDE (i prioritert rekkefølge):
//   1) GET {platform}/api/lease-income/export  (X-API-Key) — EKSAKT samme
//      rows[] + totals{} som plattformens skjerm/Excel. Prøves alltid først
//      (rask 404 om den ikke finnes ennå).
//   2) GET /api/units/export + /api/contracts/export FLETTET — enhetslisten er
//      grunnfjellet (riktige enheter, bofellesskap-rom, annonsert-status,
//      ledig-estimat), leiekontraktene gir leietaker/beløp/innflytting og
//      forvaltningsavtalene gir sats/servicenivå. source='units-contracts'.
//   3) SISTE UTVEI: avledet kun fra /api/contracts/export (gamle hull:
//      mangler rom, annonsert og ledig-estimat). source='contracts-fallback'.
//
// Radformat (kanonisk, brukes av skjerm + Excel + CSV):
//   { unit_room, address, unit_type, owner_name, tenant_name, status_label,
//     group ('leased'|'future'|'signing'|'vacant'), advertised, move_in_date,
//     monthly_rent, fee_percent, fee_amount (eks. mva), net_to_owner,
//     deposit, income_type, service_level, vat_inclusive }
//
// Statusregler (verifisert mot fasit):
//   · signert-dato mangler + status 'pending'  → Under signering
//   · startdato frem i tid                     → Fremtidig innflytting
//   · ellers                                    → Utleid
//   · enhet uten leiekontrakt                   → Ledig (+ Annonsert hvis
//     listingStatus='publisert')
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
const GRUPPE_TIL_INCOME = { leased: 'actual', future: 'expected_signed', signing: 'pending_signing', vacant: 'estimate' };

const n = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
const r0 = (x) => Math.round(n(x));
const r2 = (x) => Math.round(n(x) * 100) / 100;
const normNavn = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Honorar/mva-formel fra spec pkt. 5b: honorar-kolonnen er ALLTID eks. mva.
// privat (vat_inclusive=true): satsen er brutto → eks = brutto / 1,25
// næring (vat_inclusive=false): satsen er eks → mva legges på toppen
export function beregnHonorar({ monthly_rent, fee_percent, vat_inclusive }) {
  const brutto = n(monthly_rent) * n(fee_percent) / 100;
  const eks = vat_inclusive ? brutto / 1.25 : brutto;
  const inkl = eks * 1.25;
  return { fee_amount: r0(eks), fee_incl: r0(inkl), net_to_owner: r0(n(monthly_rent) - inkl) };
}

// Totals per spec pkt. 2: honorar/netto (t.fee/t.net) summeres KUN for
// income_type='actual'. I tillegg: garantert (utleid + signert fremtidig) og
// estimert (under signering + ledig-estimat) — samme inndeling som
// plattformens investoroversikt.
export function beregnTotals(rows) {
  const t = {
    actual_rent: 0, expected_rent: 0, pending_rent: 0, estimate_rent: 0,
    leased: 0, future: 0, signing: 0, vacant: 0,
    fee: 0, net: 0, count: rows.length, occupancy_pct: 0,
    fee_future: 0, fee_signing: 0, fee_vacant: 0,
    fee_garantert: 0, fee_estimert: 0, fee_total: 0,
    net_garantert: 0, advertised: 0,
  };
  for (const r of rows) {
    if (r.advertised) t.advertised += 1;
    if (r.group === 'leased') { t.leased += 1; t.actual_rent += n(r.monthly_rent); t.fee += n(r.fee_amount); t.net += n(r.net_to_owner); }
    else if (r.group === 'future') { t.future += 1; t.expected_rent += n(r.monthly_rent); t.fee_future += n(r.fee_amount); }
    else if (r.group === 'signing') { t.signing += 1; t.pending_rent += n(r.monthly_rent); t.fee_signing += n(r.fee_amount); }
    else { t.vacant += 1; t.estimate_rent += n(r.monthly_rent); t.fee_vacant += n(r.fee_amount); }
  }
  t.occupancy_pct = t.count ? Math.round((t.leased / t.count) * 100) : 0;
  t.fee_garantert = t.fee + t.fee_future;
  t.fee_estimert = t.fee_signing + t.fee_vacant;
  t.fee_total = t.fee_garantert + t.fee_estimert;
  t.net_garantert = t.net + rows.filter((r) => r.group === 'future').reduce((s, r) => s + n(r.net_to_owner), 0);
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
  const fp = r2(r.fee_percent ?? r.sats);
  const hon = (r.fee_amount != null && r.net_to_owner != null)
    ? { fee_amount: r0(r.fee_amount), net_to_owner: r0(r.net_to_owner) }
    : beregnHonorar({ monthly_rent: rent, fee_percent: fp, vat_inclusive: !!vat });
  return {
    enhet_id: String(r.enhet_id || (r.unit_id ? `${r.unit_id}${r.room_id ? `:${r.room_id}` : ''}` : '')).trim(),
    unit_room: String(r.unit_room || r.title || r.unit || '').trim() || 'Enhet',
    address: String(r.address || r.sub_address || '').trim(),
    unit_type: (r.unit_type === 'Rom i bofellesskap' || r.unit_kind === 'room') ? 'Rom i bofellesskap' : 'Hel enhet',
    bolig_type: String(r.bolig_type || r.unit_type_label || r.property_type || '').trim(),
    enhet_detalj: String(r.enhet_detalj || '').trim(),
    owner_name: String(r.owner_name || '').trim(),
    tenant_name: String(r.tenant_name || '').trim(),
    status_label: r.status_label || (group === 'vacant' && r.advertised ? 'Ledig (Annonsert)' : STATUS_LABEL[group]),
    group,
    advertised: !!r.advertised,
    move_in_date: String(r.move_in_date || '').slice(0, 10),
    monthly_rent: rent,
    fee_percent: fp,
    fee_amount: hon.fee_amount,
    net_to_owner: hon.net_to_owner,
    deposit: r.deposit != null ? r0(r.deposit) : null,
    income_type: INCOME_LABEL[r.income_type] ? r.income_type : GRUPPE_TIL_INCOME[group],
    service_level: (r.service_level === 'Selvbetjening' || r.service_tier === 'selvbetjening') ? 'Selvbetjening' : 'Full forvaltning',
    vat_inclusive: !!vat,
  };
}

/* ═══════════════ PRIMÆR: units/export + contracts/export flettet ═══════════════ */

const TYPE_LABEL = {
  leilighet: 'Leilighet', hybel: 'Hybel', rekkehus: 'Rekkehus', enebolig: 'Enebolig',
  hus: 'Hus', tomannsbolig: 'Tomannsbolig', sokkelleilighet: 'Sokkelleilighet', rom: 'Rom',
};
const typeNavn = (t) => TYPE_LABEL[String(t || '').toLowerCase()]
  || (t ? String(t).charAt(0).toUpperCase() + String(t).slice(1) : 'Enhet');

function enhetsTittel(u) {
  const deler = [typeNavn(u.unitType)];
  if (n(u.floor) > 0) deler.push(`${r0(u.floor)}. etg`);
  const m2 = r0(u.sqm);
  const rom = r0(u.bedrooms || u.rooms);
  if (m2) deler.push(`${m2}m²${rom ? ` ${rom}-roms` : ''}`);
  return deler.join(' · ');
}

function romTittel(u, idx) {
  const m2 = r0(u.sqm);
  const rom = r0(u.rooms || u.bedrooms);
  const grunn = [typeNavn(u.unitType), m2 ? `${m2}m²${rom ? ` ${rom}-roms` : ''}` : ''].filter(Boolean).join(' · ');
  return `${grunn} · Rom ${idx}`;
}

// Kort enhetsbeskrivelse UTEN type (typen har egen kolonne i UI): «3. etg · 62m² 2-roms».
function enhetsDetalj(u) {
  const deler = [];
  if (n(u.floor) > 0) deler.push(`${r0(u.floor)}. etg`);
  const m2 = r0(u.sqm);
  const rom = r0(u.bedrooms || u.rooms);
  if (m2) deler.push(`${m2}m²${rom ? ` ${rom}-roms` : ''}`);
  return deler.join(' · ');
}

// Statusregel verifisert mot plattformens egen eksport:
// usignert 'pending' → signering; startdato frem i tid → fremtidig; ellers utleid.
function leaseGruppe(l, idag) {
  if (!l.signed_at && l.status === 'pending') return 'signing';
  const start = String(l.start_date || '').slice(0, 10);
  if (start && start > idag) return 'future';
  return 'leased';
}

// Rangér leiekontrakter for samme leietaker (fornyelser o.l.): aktiv > signert > rest.
function leaseRang(l) {
  if (l.status === 'active') return 0;
  if (l.signed_at) return 1;
  return 2;
}

function byggFraEnheterOgKontrakter({ units, contracts, properties }, idag) {
  const propById = new Map((properties || []).map((p) => [p.id, p]));

  // Forvaltningsavtaler per bygg: aktiv > signert > øvrige (ikke terminerte).
  const forvPerBygg = new Map();
  const leierPerBygg = new Map();
  for (const c of contracts || []) {
    if (c.status === 'terminated' || c.terminated_at) continue;
    const pid = c?.property?.id;
    if (!pid) continue;
    if (String(c.type || '').includes('forvaltning')) {
      const eksisterende = forvPerBygg.get(pid);
      const rang = (x) => (x.status === 'active' ? 0 : x.status === 'signed' ? 1 : 2);
      if (!eksisterende || rang(c) < rang(eksisterende)) forvPerBygg.set(pid, c);
    } else {
      if (!leierPerBygg.has(pid)) leierPerBygg.set(pid, []);
      leierPerBygg.get(pid).push(c);
    }
  }

  // Dedupliser leiekontrakter per (bygg, leietaker) — behold beste (fornyelser).
  for (const [pid, liste] of leierPerBygg) {
    const beste = new Map();
    for (const l of liste) {
      const nk = normNavn(l?.tenant?.name) || `#${l.contract_id}`;
      const eks = beste.get(nk);
      if (!eks || leaseRang(l) < leaseRang(eks)) beste.set(nk, l);
    }
    leierPerBygg.set(pid, [...beste.values()]);
  }

  // Enheter per bygg (arkiverte utelates).
  const enheterPerBygg = new Map();
  for (const u of units || []) {
    if (u.archived) continue;
    const bid = u.buildingId || u.unitId;
    if (!enheterPerBygg.has(bid)) enheterPerBygg.set(bid, []);
    enheterPerBygg.get(bid).push(u);
  }

  const rows = [];
  for (const [bid, bUnits] of enheterPerBygg) {
    const forv = forvPerBygg.get(bid) || null;
    const bLeases = leierPerBygg.get(bid) || [];
    const eierNavn = String(forv?.owner?.name || bUnits[0]?.owner?.name || '').trim();
    // MVA-modell: EMPIRISK VERIFISERT mot plattformens egen visning/eksport
    // (13.08.2026): honorar = leie × sats DIREKTE (satsen er eks. mva for alle),
    // netto = leie − honorar×1,25. Ingen privat/næring-deling av satsen.
    const vat = false;
    const sats = forv?.fee_model === 'percent' ? r2(n(forv.fee_percent) * 100)
      : bLeases.find((k) => k.fee_model === 'percent') ? r2(n(bLeases.find((k) => k.fee_model === 'percent').fee_percent) * 100) : 0;
    const service = forv ? 'Full forvaltning' : 'Selvbetjening';

    // Knytt leiekontrakt til enhet via leietakernavnet plattformen selv viser.
    const claimed = new Set();
    const kravPerEnhet = new Map();
    for (const u of bUnits) {
      const tn = normNavn(u?.tenant?.name || (typeof u.tenant === 'string' ? u.tenant : ''));
      if (!tn) continue;
      const lease = bLeases.find((l) => !claimed.has(l) && normNavn(l?.tenant?.name) === tn);
      if (lease) { claimed.add(lease); kravPerEnhet.set(u.unitId, lease); }
    }

    const lagRad = (overstyr) => {
      const rent = n(overstyr.monthly_rent);
      const hon = beregnHonorar({ monthly_rent: rent, fee_percent: sats, vat_inclusive: vat });
      return {
        enhet_id: '',
        unit_type: 'Hel enhet',
        bolig_type: '',
        enhet_detalj: '',
        owner_name: overstyr.owner_name || eierNavn,
        advertised: false,
        move_in_date: '',
        fee_percent: sats,
        fee_amount: hon.fee_amount,
        net_to_owner: hon.net_to_owner,
        deposit: null,
        service_level: service,
        vat_inclusive: vat,
        ...overstyr,
        monthly_rent: rent,
        income_type: GRUPPE_TIL_INCOME[overstyr.group] || 'estimate',
        status_label: overstyr.status_label
          || (overstyr.group === 'vacant' && overstyr.advertised ? 'Ledig (Annonsert)' : STATUS_LABEL[overstyr.group]),
      };
    };

    const romEnheter = bUnits.filter((u) => u.rentalScope === 'room' && r0(u.roomsTotal) > 0);

    // Hele enheter (whole-scope):
    for (const u of bUnits) {
      if (romEnheter.includes(u)) continue;
      const adresse = String(u?.address?.full || u.unitLabel || '').trim();
      const annonsert = u.listingStatus === 'publisert';
      const prop = propById.get(u.unitId);
      let lease = kravPerEnhet.get(u.unitId) || null;

      // NÅVÆRENDE leietaker vinner (verifisert mot plattformen): har enheten en
      // fremtidig/usignert kontrakt OG det finnes en løpende kontrakt i samme
      // bygg som ingen enhet har gjort krav på, er det den som bor der NÅ —
      // plattformen viser én rad per enhet med nåværende leietaker, og den
      // fremtidige kontrakten telles ikke separat.
      if (lease && !romEnheter.length) {
        const gr = leaseGruppe(lease, idag);
        if (gr === 'future' || gr === 'signing') {
          const naavaerende = bLeases.find((l) => !claimed.has(l) && leaseGruppe(l, idag) === 'leased');
          if (naavaerende) { claimed.add(naavaerende); lease = naavaerende; }
        }
      }

      if (lease) {
        const gruppe = leaseGruppe(lease, idag);
        rows.push(lagRad({
          enhet_id: String(u.unitId || ''),
          unit_room: enhetsTittel(u), address: adresse, group: gruppe,
          bolig_type: typeNavn(u.unitType), enhet_detalj: enhetsDetalj(u),
          tenant_name: String(lease?.tenant?.name || '').trim(),
          monthly_rent: n(lease.monthly_rent) || n(u?.rent?.amount),
          // Innflytting vises for ALLE med kontrakt — også allerede utleide.
          move_in_date: String(lease.start_date || lease.expected_rent_start || '').slice(0, 10),
          deposit: prop?.deposit != null && n(prop.deposit) > 0 ? r0(prop.deposit) : null,
        }));
      } else if (u.status === 'utleid' && (u?.tenant?.name || typeof u.tenant === 'string')) {
        // Sikkerhetsnett: plattformen sier utleid, men kontrakten mangler i eksporten.
        rows.push(lagRad({
          enhet_id: String(u.unitId || ''),
          unit_room: enhetsTittel(u), address: adresse, group: 'leased',
          bolig_type: typeNavn(u.unitType), enhet_detalj: enhetsDetalj(u),
          tenant_name: String(u?.tenant?.name || u.tenant || '').trim(),
          monthly_rent: n(u?.rent?.amount),
        }));
      } else {
        // Uklargjorte enheter (uten areal, pris, leietaker og annonse) er ikke
        // reelle leieobjekter ennå — plattformens visning utelater dem også.
        if (!annonsert && !n(u?.rent?.amount) && u?.readiness?.hasArea === false) continue;
        rows.push(lagRad({
          enhet_id: String(u.unitId || ''),
          unit_room: enhetsTittel(u), address: adresse, group: 'vacant',
          bolig_type: typeNavn(u.unitType), enhet_detalj: enhetsDetalj(u),
          tenant_name: '', advertised: annonsert,
          monthly_rent: n(u?.rent?.amount),
          deposit: prop?.deposit != null && n(prop.deposit) > 0 ? r0(prop.deposit) : null,
        }));
      }
    }

    // Bofellesskap: én rad per rom — leiekontraktene i bygget som ikke hører
    // til en hel enhet ER rommene (verifisert mot plattformens eksport).
    if (romEnheter.length) {
      const ru = romEnheter[0];
      const adresse = String(ru?.address?.full || ru.unitLabel || '').trim();
      const egne = [...kravPerEnhet.entries()].filter(([uid]) => uid === ru.unitId).map(([, l]) => l);
      const ledigeLeases = bLeases.filter((l) => !claimed.has(l));
      const romLeases = [...egne, ...ledigeLeases].sort((a, b) => n(b.monthly_rent) - n(a.monthly_rent));
      romLeases.forEach((l, i) => {
        const gruppe = leaseGruppe(l, idag);
        rows.push(lagRad({
          enhet_id: `${ru.unitId}:rom-${i + 1}`,
          unit_room: romTittel(ru, i + 1), address: adresse, unit_type: 'Rom i bofellesskap',
          bolig_type: 'Rom', enhet_detalj: `Rom ${i + 1} av ${r0(ru.roomsTotal)}`,
          group: gruppe,
          tenant_name: String(l?.tenant?.name || '').trim(),
          monthly_rent: n(l.monthly_rent),
          move_in_date: String(l.start_date || '').slice(0, 10),
        }));
      });
      const tomme = Math.max(0, r0(ru.roomsTotal) - romLeases.length);
      for (let k = 0; k < tomme; k += 1) {
        rows.push(lagRad({
          enhet_id: `${ru.unitId}:rom-${romLeases.length + k + 1}`,
          unit_room: romTittel(ru, romLeases.length + k + 1), address: adresse,
          unit_type: 'Rom i bofellesskap', group: 'vacant', tenant_name: '',
          bolig_type: 'Rom', enhet_detalj: `Rom ${romLeases.length + k + 1} av ${r0(ru.roomsTotal)}`,
          advertised: ru.listingStatus === 'publisert', monthly_rent: 0,
        }));
      }
    }
  }
  return rows;
}

/* ═══════════════ SISTE UTVEI: avledet kun fra kontrakter ═══════════════ */

function avledFraKontrakter(contracts) {
  const idag = new Date().toISOString().slice(0, 10);
  const perEiendom = new Map();
  for (const c of contracts || []) {
    const pid = c?.property?.id || c?.property?.address || c?.contract_id;
    if (!perEiendom.has(pid)) perEiendom.set(pid, { property: c.property || {}, forvaltning: null, leie: [] });
    const e = perEiendom.get(pid);
    if (!e.property?.address && c.property?.address) e.property = c.property;
    if (String(c.type || '').includes('forvaltning')) {
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
    const vat = false; // samme empirisk verifiserte mva-modell som primærkilden
    const sats = forv?.fee_model === 'percent' ? r2(n(forv?.fee_percent) * 100)
      : e.leie.find((k) => k.fee_model === 'percent') ? r2(n(e.leie.find((k) => k.fee_model === 'percent').fee_percent) * 100) : 0;

    const aktive = e.leie.filter((k) => k.status !== 'terminated' && !k.terminated_at);
    const beste = aktive.sort((a, b) => leaseRang(a) - leaseRang(b) || n(b.monthly_rent) - n(a.monthly_rent))[0];

    let group = 'vacant';
    if (beste) group = leaseGruppe(beste, idag);

    const rent = group === 'vacant'
      ? n(forv?.estimated_monthly_rent || e.leie[0]?.estimated_monthly_rent || 0)
      : n(beste?.monthly_rent || beste?.estimated_monthly_rent || 0);
    const hon = beregnHonorar({ monthly_rent: rent, fee_percent: sats, vat_inclusive: vat });
    const tittel = `Hel enhet${p.sqm ? ` · ${p.sqm} m²` : ''}`;
    const moveIn = group === 'vacant' ? ''
      : String(beste?.start_date || beste?.expected_rent_start || '').slice(0, 10);

    rows.push({
      enhet_id: `adr:${String(p.address || '').trim().toLowerCase()}`,
      unit_room: tittel,
      address: String(p.address || '').trim(),
      unit_type: 'Hel enhet',
      bolig_type: '',
      enhet_detalj: '',
      owner_name: eierNavn,
      tenant_name: group === 'vacant' ? '' : (beste?.tenant?.name || '').trim(),
      status_label: STATUS_LABEL[group],
      group,
      advertised: false,
      move_in_date: moveIn,
      monthly_rent: rent,
      fee_percent: sats,
      fee_amount: hon.fee_amount,
      net_to_owner: hon.net_to_owner,
      deposit: null,
      income_type: GRUPPE_TIL_INCOME[group],
      service_level: forv ? 'Full forvaltning' : 'Selvbetjening',
      vat_inclusive: vat,
    });
  }
  return rows;
}

/* ═══════════════ Henting + cache ═══════════════ */

// Plattformen kan bruke 5–25 s på å svare, så vi cacher siste vellykkede svar
// i MongoDB (leieforhold_cache) og svarer umiddelbart når cachen er fersk
// (<10 min). opts.fresh=true hopper over cachen (Oppdater-knappen). Feiler
// plattformen serveres siste lagrede data med stale-flagg i stedet for feil.
const CACHE_TTL_MS = 10 * 60 * 1000;

function pentFeil(e) {
  const m = String(e?.message || e || '');
  if (e?.name === 'TimeoutError' || /abort|timeout/i.test(m)) return 'Plattformen svarte ikke i tide — prøv å oppdatere om litt.';
  if (/fetch failed|ENOTFOUND|ECONN/i.test(m)) return 'Fikk ikke kontakt med plattformen — sjekk tilkoblingen og prøv igjen.';
  return m || 'Ukjent feil mot plattformen';
}

async function hentJson(url, key, timeoutMs) {
  const res = await fetch(url, { headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${new URL(url).pathname} svarte ${res.status}`);
  return res.json();
}

async function hentFraPlattform(base, key) {
  // 1) Dedikert 1:1-endepunkt (kort frist: finnes det ikke, svarer det raskt 404).
  try {
    const j = await hentJson(`${base}/api/lease-income/export?limit=500`, key, 8000);
    const raa = j.rows || j.data || [];
    if (Array.isArray(raa) && raa.length) {
      const rows = sorterRader(raa.map(normaliserPlattformRad));
      const totals = (j.totals && typeof j.totals === 'object' && Number.isFinite(Number(j.totals.actual_rent)))
        ? { ...beregnTotals(rows), ...j.totals }
        : beregnTotals(rows);
      return { ok: true, source: 'lease-income', rows, totals };
    }
  } catch (e) { /* videre til flettet kilde */ }

  // 2) PRIMÆR: enheter + kontrakter flettet (properties gir depositum — valgfri).
  const [rU, rC, rP] = await Promise.allSettled([
    hentJson(`${base}/api/units/export?limit=500`, key, 25000),
    hentJson(`${base}/api/contracts/export?status=all&limit=500`, key, 25000),
    hentJson(`${base}/api/properties/export?limit=500`, key, 15000),
  ]);
  const contracts = rC.status === 'fulfilled' ? (rC.value.contracts || []) : null;
  const units = rU.status === 'fulfilled' ? (rU.value.units || []) : null;
  const properties = rP.status === 'fulfilled' ? (rP.value.properties || []) : [];

  if (Array.isArray(units) && units.length && Array.isArray(contracts)) {
    const idag = new Date().toISOString().slice(0, 10);
    const rows = sorterRader(byggFraEnheterOgKontrakter({ units, contracts, properties }, idag));
    return { ok: true, source: 'units-contracts', rows, totals: beregnTotals(rows) };
  }

  // 3) Siste utvei: kun kontrakter.
  if (!Array.isArray(contracts)) {
    throw (rC.status === 'rejected' ? rC.reason : new Error('contracts/export utilgjengelig'));
  }
  const rows = sorterRader(avledFraKontrakter(contracts));
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
