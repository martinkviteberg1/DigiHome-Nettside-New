// ---------------------------------------------------------------------------
// Delt filter-/scenario-logikk for «Leieforhold & inntekter».
// Brukes av BÅDE skjermen (components/admin/Leieforhold.js) og eksport-rutene
// (xlsx/csv i app/api) slik at Excel/CSV alltid viser NØYAKTIG det samme som
// skjermen. Kun rene funksjoner — ingen server-avhengigheter, trygt å
// importere klient-side.
// ---------------------------------------------------------------------------

export const TOM_FILTER = Object.freeze({ status: [], typer: [], inntekt: [], eiere: [] });

export const LF_GRUPPE_LABEL = { leased: 'Utleid', future: 'Fremtidig', signing: 'Under signering', vacant: 'Ledig' };
export const LF_INNTEKT_LABEL = { actual: 'Faktisk leie', expected_signed: 'Forventet (signert)', pending_signing: 'Under signering', estimate: 'Estimat' };

export const radNokkel = (r) => r.enhet_id || `${r.address}|${r.unit_room}`;

const n = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
const idagStr = () => new Date().toISOString().slice(0, 10);
const erDato = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

/* ── Scenario: hvordan ser porteføljen ut på en valgt (fremtidig) dato? ────
   · «future»-kontrakt med innflytting ≤ dato  → telles som utleid (realisert)
   · «leased» med utflytting < dato            → telles som ledig (potensial)
   · «signing» røres ikke — usignert er fortsatt usikkert
   Radene merkes med _scenario: 'inn' | 'ut' for diskret UI-markering. */
export function anvendScenario(rows, dato) {
  if (!erDato(dato) || dato <= idagStr()) return rows;
  return (rows || []).map((r) => {
    if (r.group === 'future' && r.move_in_date && r.move_in_date <= dato) {
      return { ...r, group: 'leased', income_type: 'actual', status_label: 'Utleid', advertised: false, _scenario: 'inn' };
    }
    if (r.group === 'leased' && r.move_out_date && r.move_out_date < dato) {
      return { ...r, group: 'vacant', income_type: 'estimate', status_label: 'Ledig', _scenario: 'ut' };
    }
    return r;
  });
}

/* ── Flervalgs-filter + fritekstsøk (samme felt som skjermens søk) ───────── */
export function filtrerRader(rows, filtre = TOM_FILTER, sok = '') {
  let ut = rows || [];
  const f = filtre || TOM_FILTER;
  if (f.status?.length) ut = ut.filter((r) => f.status.includes(r.group));
  if (f.typer?.length) ut = ut.filter((r) => f.typer.includes(r.bolig_type || r.unit_type || 'Ukjent'));
  if (f.inntekt?.length) ut = ut.filter((r) => f.inntekt.includes(r.income_type));
  if (f.eiere?.length) ut = ut.filter((r) => f.eiere.includes(r.owner_name || '—'));
  const s = String(sok || '').trim().toLowerCase();
  if (s) ut = ut.filter((r) => `${r.unit_room} ${r.address} ${r.owner_name} ${r.tenant_name} ${r.bolig_type || ''}`.toLowerCase().includes(s));
  return ut;
}

export function antallAktiveFiltre(filtre) {
  const f = filtre || TOM_FILTER;
  return (f.status?.length || 0) + (f.typer?.length || 0) + (f.inntekt?.length || 0) + (f.eiere?.length || 0);
}

export function harFilter(filtre, sok = '') {
  return antallAktiveFiltre(filtre) > 0 || Boolean(String(sok || '').trim());
}

/* ── Query-string for eksport-lenker (leses av parseFilterParams) ────────── */
export function tilQuery(filtre = TOM_FILTER, sok = '', scenario = '') {
  const p = new URLSearchParams();
  const f = filtre || TOM_FILTER;
  if (f.status?.length) p.set('status', f.status.join(','));
  if (f.typer?.length) p.set('typer', f.typer.join(','));
  if (f.inntekt?.length) p.set('inntekt', f.inntekt.join(','));
  if (f.eiere?.length) p.set('eiere', f.eiere.join(','));
  if (String(sok || '').trim()) p.set('sok', String(sok).trim());
  if (erDato(scenario)) p.set('scenario', scenario);
  return p.toString();
}

export function parseFilterParams(sp) {
  const les = (k) => String(sp.get(k) || '').split(',').map((s) => s.trim()).filter(Boolean);
  const scenario = String(sp.get('scenario') || '');
  return {
    filtre: { status: les('status'), typer: les('typer'), inntekt: les('inntekt'), eiere: les('eiere') },
    sok: String(sp.get('sok') || ''),
    scenario: erDato(scenario) ? scenario : '',
  };
}

/* ── Menneskelesbar beskrivelse (Excel-metadata) ─────────────────────────── */
export function filterBeskrivelse(filtre, sok = '', scenario = '') {
  const deler = [];
  const f = filtre || TOM_FILTER;
  if (f.status?.length) deler.push(`Status: ${f.status.map((s) => LF_GRUPPE_LABEL[s] || s).join(', ')}`);
  if (f.typer?.length) deler.push(`Type: ${f.typer.join(', ')}`);
  if (f.inntekt?.length) deler.push(`Inntekt: ${f.inntekt.map((s) => LF_INNTEKT_LABEL[s] || s).join(', ')}`);
  if (f.eiere?.length) deler.push(`Huseier: ${f.eiere.join(', ')}`);
  if (String(sok || '').trim()) deler.push(`Søk: «${String(sok).trim()}»`);
  if (erDato(scenario)) deler.push(`Scenario-dato: ${scenario}`);
  return deler.join(' · ');
}

/* ── Totals — samme matematikk som lib/leieforhold.js beregnTotals().
   Duplisert hit som ren funksjon slik at klientkomponenten kan regne
   filtrerte KPI-er uten server-avhengigheter. HOLD DE TO I SYNK. ─────────── */
export function beregnTotals(rows) {
  const t = {
    actual_rent: 0, expected_rent: 0, pending_rent: 0, estimate_rent: 0,
    leased: 0, future: 0, signing: 0, vacant: 0,
    fee: 0, net: 0, count: (rows || []).length, occupancy_pct: 0,
    fee_future: 0, fee_signing: 0, fee_vacant: 0,
    fee_garantert: 0, fee_estimert: 0, fee_total: 0,
    net_garantert: 0, advertised: 0,
  };
  for (const r of rows || []) {
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
  t.net_garantert = t.net + (rows || []).filter((r) => r.group === 'future').reduce((s, r) => s + n(r.net_to_owner), 0);
  return t;
}

/* ── Faste kostnader som er aktive på gitt dato (scenario-støtte) ──────────
   En post teller når: aktiv !== false OG startDato ≤ dato OG sluttDato ≥ dato */
export function aktiveKostnader(felles, dato = '') {
  const d = erDato(dato) ? dato : idagStr();
  return (felles || []).filter((p) => {
    if (p.aktiv === false) return false;
    if (p.startDato && String(p.startDato).slice(0, 10) > d) return false;
    if (p.sluttDato && String(p.sluttDato).slice(0, 10) < d) return false;
    return true;
  });
}

/* ── Fordel faste kostnader per enhet etter postens fordelingsnøkkel.
   Fordelingsgrunnlaget er HELE porteføljen (grunnlagRows) — filtrering i UI
   endrer aldri den enkelte enhets andel. Returnerer Map<radNokkel, kr/mnd>. */
export function fordelKostnader(grunnlagRows, fellesAktive) {
  const kart = new Map();
  const rows = grunnlagRows || [];
  if (!rows.length) return kart;
  const utleide = rows.filter((r) => r.group === 'leased');
  const feeAlle = rows.reduce((s, r) => s + n(r.fee_amount), 0);
  const leggTil = (r, v) => kart.set(radNokkel(r), (kart.get(radNokkel(r)) || 0) + v);
  for (const post of fellesAktive || []) {
    const b = n(post.belop);
    if (!b) continue;
    if (post.fordeling === 'utleide' && utleide.length) utleide.forEach((r) => leggTil(r, b / utleide.length));
    else if (post.fordeling === 'honorar' && feeAlle > 0) rows.forEach((r) => leggTil(r, b * (n(r.fee_amount) / feeAlle)));
    else rows.forEach((r) => leggTil(r, b / rows.length));
  }
  return kart;
}
