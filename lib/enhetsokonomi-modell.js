// ─────────────────────────────────────────────────────────────────────────────
// ENHETSØKONOMI — REN beregningsmotor for ÉN gjennomsnittsenhet (ingen DB).
// Importeres av både klient (live-oppdatering når drivere justeres) og server.
//
// Svarer på tre spørsmål:
//   1. Hva tjener vi på én ny enhet?           → bidrag før/etter bemanning
//   2. Hvor raskt tjener vi inn anskaffelsen?  → CAC payback
//   3. Hvor robust er økonomien?               → LTV (3 år / 5 år / teoretisk)
//
// Konvensjoner (samme som investormodellen i lib/budsjett-modell.js):
//   · Honorarsats oppgis INKL. mva (privat) — inntekt bokføres eks. mva (÷1,25).
//   · «Normalisert bemanning» = fullkost årsverk ÷ enheter per årsverk ÷ 12:
//     den andelen av en forvalter hver enhet legger beslag på i en skalert
//     virksomhet. Bidrag FØR bemanning = marginaløkonomi ved ledig kapasitet.
//   · Churn er årlig %, konvertert geometrisk til månedlig kohort-churn.
//   · LTV er overlevelsesvektet sum av månedsbidrag over valgt horisont —
//     «teoretisk LTV» (bidrag ÷ månedschurn) vises separat fordi lav churn
//     impliserer urealistisk lang levetid.
// ─────────────────────────────────────────────────────────────────────────────

const r0 = (x) => Math.round(Number(x) || 0);
const r1 = (x) => Math.round((Number(x) || 0) * 10) / 10;

export const EO_STANDARD = {
  // Inntekt
  snittleie: 22500,        // gj.sn. månedsleie for en ny enhet
  honorarPct: 10.5,        // forvaltningshonorar (inkl. mva, privat)
  tilleggPerMnd: 0,        // tilleggstjenester per enhet/mnd (eks. mva)
  oppstartPerEnhet: 0,     // engangs oppstartshonorar ved signering
  // Direkte kostnader
  systemPerEnhet: 200,     // systemkostnad per enhet per måned
  andreDirekte: 0,         // andre direkte kostnader per enhet per måned
  // Kapasitet (normalisert bemanning)
  enheterPerAarsverk: 200, // enheter én forvalter (1,0 åv) dekker
  aarslonn: 700000,        // brutto årslønn per årsverk
  paslagPct: 35,           // arbeidsgiverpåslag (aga + feriepenger + OTP m.m.)
  // Anskaffelse & levetid
  cac: 5000,               // salgsprovisjon / anskaffelseskost per ny enhet
  aarligChurnPct: 10,      // forventet årlig kundefrafall
  ltvHorisontAar: 5,       // horisont for hoved-LTV (3-/5-års + teoretisk vises alltid)
};

const num = (v, std, { min = 0, maks = Infinity } = {}) => {
  if (v === null || v === undefined || v === '') return std;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return std;
  return Math.min(maks, Math.max(min, n));
};

export function rensEoDrivere(d = {}) {
  const s = EO_STANDARD;
  return {
    snittleie: r0(num(d.snittleie, s.snittleie, { maks: 1e6 })),
    honorarPct: num(d.honorarPct, s.honorarPct, { maks: 100 }),
    tilleggPerMnd: r0(num(d.tilleggPerMnd, s.tilleggPerMnd, { maks: 1e5 })),
    oppstartPerEnhet: r0(num(d.oppstartPerEnhet, s.oppstartPerEnhet, { maks: 1e6 })),
    systemPerEnhet: r0(num(d.systemPerEnhet, s.systemPerEnhet, { maks: 1e5 })),
    andreDirekte: r0(num(d.andreDirekte, s.andreDirekte, { maks: 1e5 })),
    enheterPerAarsverk: num(d.enheterPerAarsverk, s.enheterPerAarsverk, { min: 1, maks: 1e5 }),
    aarslonn: r0(num(d.aarslonn, s.aarslonn, { maks: 1e8 })),
    paslagPct: num(d.paslagPct, s.paslagPct, { maks: 200 }),
    cac: r0(num(d.cac, s.cac, { maks: 1e6 })),
    aarligChurnPct: num(d.aarligChurnPct, s.aarligChurnPct, { maks: 100 }),
    ltvHorisontAar: r0(num(d.ltvHorisontAar, s.ltvHorisontAar, { min: 1, maks: 15 })),
  };
}

// Overlevelsesvektet LTV over H måneder: sum bidrag·(1−m)^t for t=0..H−1.
export function ltvOverMnd(bidragMnd, mnder, mChurn) {
  const b = Number(bidragMnd) || 0;
  const H = Math.max(0, r0(mnder));
  if (!(mChurn > 0)) return r0(b * H);
  return r0(b * (1 - Math.pow(1 - mChurn, H)) / mChurn);
}

export function beregnEnhet(drivere = {}) {
  const d = rensEoDrivere(drivere);

  // Inntekt (eks. mva)
  const honorarInntekt = (d.snittleie * d.honorarPct) / 100 / 1.25;
  const inntekt = honorarInntekt + d.tilleggPerMnd;

  // Kostnader
  const direkte = d.systemPerEnhet + d.andreDirekte;
  const fullkostAar = d.aarslonn * (1 + d.paslagPct / 100);
  const bemanningPerEnhet = fullkostAar / d.enheterPerAarsverk / 12;

  // Bidrag
  const bidragFor = inntekt - direkte;
  const bidragEtter = bidragFor - bemanningPerEnhet;
  const marginFor = inntekt > 0 ? (bidragFor / inntekt) * 100 : null;
  const marginEtter = inntekt > 0 ? (bidragEtter / inntekt) * 100 : null;

  // Anskaffelse: oppstartshonorar reduserer netto anskaffelseskost.
  const nettoCac = Math.max(0, d.cac - d.oppstartPerEnhet);
  const payback = (bidrag) => (bidrag > 0 ? r1(nettoCac / bidrag) : null);

  // Levetid fra churn
  const mChurn = 1 - Math.pow(1 - d.aarligChurnPct / 100, 1 / 12);
  const levetidMnd = mChurn > 0 ? 1 / mChurn : null;

  const H = d.ltvHorisontAar * 12;
  const ltvSett = (bidrag) => ({
    aar3: ltvOverMnd(bidrag, 36, mChurn),
    aar5: ltvOverMnd(bidrag, 60, mChurn),
    horisont: ltvOverMnd(bidrag, H, mChurn),
    teoretisk: mChurn > 0 ? r0(bidrag / mChurn) : null, // uendelig horisont
  });
  const ltvFor = ltvSett(bidragFor);
  const ltvEtter = ltvSett(bidragEtter);
  const ltvCac = (ltv) => (ltv !== null && d.cac > 0 ? r1(ltv / d.cac) : null);

  return {
    d,
    honorarInntekt: r0(honorarInntekt),
    inntekt: r0(inntekt),
    direkte: r0(direkte),
    fullkostAar: r0(fullkostAar),
    bemanningPerEnhet: r0(bemanningPerEnhet),
    bidragFor: r0(bidragFor),
    bidragEtter: r0(bidragEtter),
    marginFor: marginFor === null ? null : r0(marginFor),
    marginEtter: marginEtter === null ? null : r0(marginEtter),
    nettoCac: r0(nettoCac),
    paybackFor: payback(bidragFor),
    paybackEtter: payback(bidragEtter),
    mChurn,
    levetidMnd: levetidMnd === null ? null : r1(levetidMnd),
    levetidAar: levetidMnd === null ? null : r1(levetidMnd / 12),
    ltvFor,
    ltvEtter,
    ltvCacFor: ltvCac(ltvFor.horisont),
    ltvCacEtter: ltvCac(ltvEtter.horisont),
    aarligVerdiFor: r0(bidragFor * 12),
    aarligVerdiEtter: r0(bidragEtter * 12),
  };
}

/* ── Prisverktøy — «minimum attraktiv enhet» ─────────────────────────────────
   Løser inntektskravet fra ønsket bidragsmargin ETTER normalisert bemanning:
   inntekt ≥ (direkte + bemanning) / (1 − mål) → sats eller leie. ── */

function inntektskrav(d, maalMarginPct) {
  const M = Math.min(0.95, Math.max(0, (Number(maalMarginPct) || 0) / 100));
  const fullkostAar = d.aarslonn * (1 + d.paslagPct / 100);
  const bem = fullkostAar / d.enheterPerAarsverk / 12;
  const kost = d.systemPerEnhet + d.andreDirekte + bem;
  return kost / (1 - M);
}

// Minste honorarsats (inkl. mva) ved gitt husleie for å nå målmarginen.
export function minHonorarPct({ leie, maalMarginPct, drivere }) {
  const d = rensEoDrivere(drivere);
  const L = Math.max(1, Number(String(leie).replace(/\s/g, '')) || 0);
  const krav = inntektskrav(d, maalMarginPct) - d.tilleggPerMnd;
  if (krav <= 0) return 0;
  return r1((krav * 1.25 * 100) / L);
}

// Minste husleie ved gitt honorarsats for å nå målmarginen.
export function minLeie({ honorarPct, maalMarginPct, drivere }) {
  const d = rensEoDrivere(drivere);
  const p = Math.max(0.1, Number(String(honorarPct).replace(',', '.')) || 0);
  const krav = inntektskrav(d, maalMarginPct) - d.tilleggPerMnd;
  if (krav <= 0) return 0;
  return r0((krav * 1.25 * 100) / p);
}

/* ── Scenariosett — kommersielle drivere, avledet av basis ─────────────────── */

export function scenarioDrivere(basis, scenario) {
  const b = rensEoDrivere(basis);
  if (scenario === 'konservativ') {
    return rensEoDrivere({
      ...b,
      honorarPct: Math.max(0, r1(b.honorarPct - 2)),
      snittleie: r0(b.snittleie * 0.8),
      enheterPerAarsverk: r0(b.enheterPerAarsverk * 0.75),
      cac: r0(b.cac * 1.5),
      aarligChurnPct: Math.min(100, r1(b.aarligChurnPct * 2)),
    });
  }
  if (scenario === 'ambisios') {
    return rensEoDrivere({
      ...b,
      honorarPct: r1(b.honorarPct + 0.5),
      snittleie: r0(b.snittleie * 1.07),
      enheterPerAarsverk: r0(b.enheterPerAarsverk * 1.125),
      cac: r0(b.cac * 0.8),
      aarligChurnPct: Math.max(0, r1(b.aarligChurnPct * 0.7)),
    });
  }
  return b;
}
