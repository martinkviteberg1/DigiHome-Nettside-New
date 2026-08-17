// ─────────────────────────────────────────────────────────────────────────────
// Investormodell — REN beregningsmotor (ingen DB/serverimports).
// Importeres av BÅDE klient (umiddelbar sensitivitet når drivere justeres)
// og server (samme tall i investorrommet + sammendrag ved lagring).
//
// Tre lag:
//   FAKTA    — dagens portefølje fra leieforholdene: kontraktsfestet honorar
//              per måned (utleide flatt, signerte/fremtidige fra innflytting,
//              KJENTE utflyttinger ut) + enheter under forvaltning per måned.
//              Leiekontraktens slutt churner IKKE forvaltningskunden.
//   FORUTSETNINGER — synlige drivere: vekst, churn (årlig % → kohortbasert
//              månedlig), leie/honorar for nye, kostnadssatser.
//   BESLUTNINGER — bemanningstrapp: budsjettert stillingsprosent per
//              enhetsterskel (det man faktisk betaler), ved siden av glidende
//              kapasitetsbehov (enheter ÷ enheter per årsverk).
//
// Break-even beregnes fra månedsserien (første måned med resultat ≥ 0) —
// aldri analytisk, slik at kontraktsfaser/churn/trapp alltid gir riktig svar.
// ─────────────────────────────────────────────────────────────────────────────

const r0 = (x) => Math.round(Number(x) || 0);
const r1 = (x) => Math.round((Number(x) || 0) * 10) / 10;

export const STANDARD_DRIVERE = {
  // Inntekt
  nyePerMnd: 1,            // nye forvaltningsenheter signert per måned
  aarligChurnPct: 10,      // forventet årlig kundefrafall på MODELLERTE enheter
  snittleieNye: 15000,     // snitt månedsleie for nye enheter
  honorarPctNye: 10,       // honorarsats nye enheter (inkl. mva, privat)
  oppstartPerEnhet: 0,     // engangshonorar per ny signering
  // Kostnader
  systemPerEnhet: 200,     // systemkostnad per enhet per måned
  enheterPerAarsverk: 200, // kapasitet: enheter én forvalter (1,0 åv) dekker
  aarslonn: 700000,        // brutto årslønn per årsverk
  paslagPct: 35,           // arbeidsgiverpåslag (aga + feriepenger + OTP m.m.)
  mfFast: 10000,           // fast markedsføring per måned
  provisjonPerNyEnhet: 5000, // salgsprovisjon/CAC per ny enhet
  adminFast: 10000,        // administrasjon per måned
  andreFaste: 0,           // andre faste kostnader per måned
  // Beslutninger: budsjettert bemanning i trinn — {fraEnheter, prosent}
  bemanningstrinn: [{ fraEnheter: 0, prosent: 30 }],
};

const num = (v, std, { min = 0, maks = Infinity } = {}) => {
  if (v === null || v === undefined || v === '') return std;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return std;
  return Math.min(maks, Math.max(min, n));
};

export function rensModellDrivere(d = {}) {
  const s = STANDARD_DRIVERE;
  const trinnInn = Array.isArray(d.bemanningstrinn) ? d.bemanningstrinn : s.bemanningstrinn;
  const trinn = trinnInn
    .map((t) => ({ fraEnheter: r0(num(t?.fraEnheter, 0, { maks: 100000 })), prosent: r1(num(t?.prosent, 0, { maks: 2000 })) }))
    .slice(0, 12)
    .sort((a, b) => a.fraEnheter - b.fraEnheter)
    // dedupe på fraEnheter — siste vinner
    .filter((t, i, arr) => arr.findIndex((x) => x.fraEnheter === t.fraEnheter) === i);
  if (!trinn.length) trinn.push({ ...s.bemanningstrinn[0] });
  return {
    nyePerMnd: num(d.nyePerMnd, s.nyePerMnd, { maks: 1000 }),
    aarligChurnPct: num(d.aarligChurnPct, s.aarligChurnPct, { maks: 100 }),
    snittleieNye: r0(num(d.snittleieNye, s.snittleieNye, { maks: 1e6 })),
    honorarPctNye: num(d.honorarPctNye, s.honorarPctNye, { maks: 100 }),
    oppstartPerEnhet: r0(num(d.oppstartPerEnhet, s.oppstartPerEnhet, { maks: 1e6 })),
    systemPerEnhet: r0(num(d.systemPerEnhet, s.systemPerEnhet, { maks: 1e5 })),
    enheterPerAarsverk: num(d.enheterPerAarsverk, s.enheterPerAarsverk, { min: 1, maks: 1e5 }),
    aarslonn: r0(num(d.aarslonn, s.aarslonn, { maks: 1e8 })),
    paslagPct: num(d.paslagPct, s.paslagPct, { maks: 200 }),
    mfFast: r0(num(d.mfFast, s.mfFast, { maks: 1e8 })),
    provisjonPerNyEnhet: r0(num(d.provisjonPerNyEnhet, s.provisjonPerNyEnhet, { maks: 1e6 })),
    adminFast: r0(num(d.adminFast, s.adminFast, { maks: 1e8 })),
    andreFaste: r0(num(d.andreFaste, s.andreFaste, { maks: 1e8 })),
    bemanningstrinn: trinn,
  };
}

// Fakta-sanering: tallserier kuttes/fylles til N måneder.
export function rensModellFakta(f = {}, N) {
  const serie = (arr) => Array.from({ length: N }, (_, i) => Math.max(0, r0(arr?.[i])));
  return {
    eksisterende: serie(f.eksisterende), // kontraktsfestet honorar (eks. mva) per måned
    enheter: serie(f.enheter),           // enheter under forvaltning per måned
    oppdatertAt: f.oppdatertAt || null,
  };
}

export function beregnInvestorModell({ antallMnd, fakta = {}, drivere = {} }) {
  const N = Math.min(36, Math.max(1, r0(antallMnd) || 12));
  const d = rensModellDrivere(drivere);
  const fk = rensModellFakta(fakta, N);

  // Årlig churn → månedlig (geometrisk): 15 % årlig ≈ 1,345 % per måned.
  const mChurn = 1 - Math.pow(1 - d.aarligChurnPct / 100, 1 / 12);
  // Honorar eks. mva per ny enhet (privat: honorarsats inkl. mva → /1,25).
  const honorarNy = (d.snittleieNye * d.honorarPctNye) / 100 / 1.25;
  const fullkostAar = d.aarslonn * (1 + d.paslagPct / 100);
  const trinn = d.bemanningstrinn; // sortert stigende på fraEnheter

  const eksisterende = [], vekst = [], oppstart = [], inntekt = [];
  const enheter = [], nyeNetto = [];
  const behovAarsverk = [], budsjettertPct = [], utnyttelsePct = [];
  const kSystem = [], kBemanning = [], kMfFast = [], kProvisjon = [], kAdmin = [], kAndre = [];
  const kostSum = [], resultat = [];

  let kohort = 0; // akkumulerte modellerte enheter (netto etter churn)
  for (let t = 0; t < N; t++) {
    // Kohort churnes FØR månedens nye legges til (nye churner ikke i signeringsmåneden)
    kohort = kohort * (1 - mChurn) + d.nyePerMnd;
    const nyeAkk = kohort;
    nyeNetto.push(r1(nyeAkk));

    const eks = fk.eksisterende[t];
    const v = r0(nyeAkk * honorarNy);
    const opp = r0(d.nyePerMnd * d.oppstartPerEnhet);
    eksisterende.push(eks); vekst.push(v); oppstart.push(opp);
    inntekt.push(eks + v + opp);

    const enh = r1(fk.enheter[t] + nyeAkk);
    enheter.push(enh);

    // Bemanning: glidende behov vs. trinnvis budsjettert
    const behov = enh / d.enheterPerAarsverk;
    behovAarsverk.push(Math.round(behov * 100) / 100);
    let pct = trinn[0].prosent;
    for (const tr of trinn) if (enh >= tr.fraEnheter) pct = tr.prosent;
    budsjettertPct.push(pct);
    utnyttelsePct.push(pct > 0 ? r0((behov * 100 * 100) / pct) : null);

    const cs = r0(enh * d.systemPerEnhet);
    const cb = r0((pct / 100) * fullkostAar / 12);
    const cp = r0(d.nyePerMnd * d.provisjonPerNyEnhet);
    kSystem.push(cs); kBemanning.push(cb); kMfFast.push(d.mfFast);
    kProvisjon.push(cp); kAdmin.push(d.adminFast); kAndre.push(d.andreFaste);
    const ks = cs + cb + d.mfFast + cp + d.adminFast + d.andreFaste;
    kostSum.push(ks);
    resultat.push(inntekt[t] - ks);
  }

  // Break-even: fra månedsserien — aldri analytisk.
  let breakEvenIdx = null;
  for (let t = 0; t < N; t++) { if (resultat[t] >= 0) { breakEvenIdx = t; break; } }

  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const sumInntekt = sum(inntekt);
  const sumEksisterende = sum(eksisterende);
  const sumKost = sum(kostSum);

  // CAC-nøkkeltall per ny enhet (før bemanning)
  const bidrag = r0(honorarNy - d.systemPerEnhet);
  const cac = {
    provisjon: d.provisjonPerNyEnhet,
    bruttoHonorarNy: r0(honorarNy),
    systemPerEnhet: d.systemPerEnhet,
    bidrag,
    paybackMnd: d.provisjonPerNyEnhet > 0 && bidrag > 0 ? r1(d.provisjonPerNyEnhet / bidrag) : null,
  };

  return {
    N,
    drivere: d,
    fakta: fk,
    eksisterende, vekst, oppstart, inntekt,
    enheter, nyeNetto,
    behovAarsverk, budsjettertPct, utnyttelsePct,
    kost: { system: kSystem, bemanning: kBemanning, mfFast: kMfFast, provisjon: kProvisjon, admin: kAdmin, andre: kAndre },
    kostSum, resultat,
    cac,
    sammendrag: {
      sumInntekt: r0(sumInntekt),
      sumEksisterende: r0(sumEksisterende),
      sumModellert: r0(sumInntekt - sumEksisterende),
      sumKost: r0(sumKost),
      resultat: r0(sumInntekt - sumKost),
      andelEksisterendePct: sumInntekt > 0 ? r0((sumEksisterende / sumInntekt) * 100) : null,
      enheterVedSlutt: enheter[N - 1] || 0,
      breakEvenIdx,
      mndChurnPct: Math.round(mChurn * 100 * 100) / 100,
    },
  };
}
