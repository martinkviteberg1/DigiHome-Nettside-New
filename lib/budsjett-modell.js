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
  nyePerMnd: 1,            // nye forvaltningsenheter signert per måned (grunntakt / fase 1)
  // Vekstplan i faser: [{fraMnd, perMnd}] — fraMnd er 1-basert måned i perioden.
  // Fase 1 (fra måned 1) styres alltid av nyePerMnd; faser her har fraMnd >= 2.
  // Tom liste = konstant takt hele perioden. Taktene er absolutte (enh/mnd).
  // Standardtrappen (kun for NYE budsjetter — rensModellDrivere faller tilbake
  // til [] for eksisterende planer, så gamle tall aldri endres i det stille):
  // 1/mnd fra start → 2/mnd fra mnd 7 → 3/mnd fra mnd 13 → 4/mnd fra mnd 19.
  // Faser utenfor planens periode utløses aldri og er ufarlige.
  vekstplan: [
    { fraMnd: 7, perMnd: 2 },
    { fraMnd: 13, perMnd: 3 },
    { fraMnd: 19, perMnd: 4 },
  ],
  aarligChurnPct: 10,      // forventet årlig kundefrafall på MODELLERTE enheter
  // Re-utleie ved kontraktslutt: boligen forvaltes videre når en tidsbestemt
  // leiekontrakt utløper — honoraret antas gjenopptatt etter et ledighetsgap.
  // Vises som EGET lag (aldri blandet med kontraktsfestet). Huseier-frafall
  // dekkes av churn-driveren — uten dette dobbeltstraffes kontraktslutt.
  reutleiePaa: true,
  reutleieGapMnd: 0,       // måneder uten inntekt ved leietakerskifte (0–6)
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
  // Kapasitetsbuffer: hvor høy utnyttelse vi PLANLEGGER for før neste trinn —
  // 85 % betyr at systemet varsler bemanningsbehov FØR kapasiteten er sprengt.
  maalUtnyttelsePct: 85,
  // Beslutninger: budsjettert bemanning i trinn — hendelsesbasert:
  //   {type:'enheter', fraEnheter, prosent}  → utløses når porteføljen når N enheter
  //   {type:'dato', fraYm, prosent}          → utløses fra en gitt måned (ÅÅÅÅ-MM)
  // Bemanningen «ratchets» opp: nivået er MAKS av alle utløste trinn.
  // Standardtrappen holder ~85 % maks utnyttelse ved 200 enheter/årsverk:
  // 30 % dekker 60 enh (trinn ved 55), 50 % → 100 (ved 90), 75 % → 150 (ved 140) osv.
  bemanningstrinn: [
    { type: 'enheter', fraEnheter: 0, prosent: 30 },
    { type: 'enheter', fraEnheter: 55, prosent: 50 },
    { type: 'enheter', fraEnheter: 90, prosent: 75 },
    { type: 'enheter', fraEnheter: 140, prosent: 100 },
    { type: 'enheter', fraEnheter: 190, prosent: 150 },
  ],
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
  const gyldigYm = (v) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(String(v || '')) ? String(v) : null);
  const trinn = trinnInn
    .map((t) => {
      const type = t?.type === 'dato' ? 'dato' : 'enheter';
      return {
        type,
        fraEnheter: type === 'enheter' ? r0(num(t?.fraEnheter, 0, { maks: 100000 })) : 0,
        fraYm: type === 'dato' ? gyldigYm(t?.fraYm) : null,
        prosent: r1(num(t?.prosent, 0, { maks: 2000 })),
      };
    })
    // dato-trinn uten gyldig måned teller ikke (f.eks. midt i redigering)
    .filter((t) => t.type === 'enheter' || t.fraYm)
    .slice(0, 12)
    .sort((a, b) => (a.type === b.type
      ? (a.type === 'enheter' ? a.fraEnheter - b.fraEnheter : String(a.fraYm).localeCompare(String(b.fraYm)))
      : (a.type === 'enheter' ? -1 : 1)))
    // dedupe på utløser — siste vinner
    .filter((t, i, arr) => arr.findIndex((x) => x.type === t.type && x.fraEnheter === t.fraEnheter && x.fraYm === t.fraYm) === i);
  if (!trinn.length) trinn.push(...s.bemanningstrinn.map((t) => ({ ...t })));
  // Vekstplan: faser med konstant takt. Kun fraMnd >= 2 lagres (fase 1 = nyePerMnd).
  const faserInn = Array.isArray(d.vekstplan) ? d.vekstplan : [];
  const vekstplan = faserInn
    .map((f) => ({
      fraMnd: r0(num(f?.fraMnd, 0, { maks: 36 })),
      perMnd: Math.round(num(f?.perMnd, 0, { maks: 1000 }) * 10) / 10,
    }))
    .filter((f) => f.fraMnd >= 2)
    .sort((a, b) => a.fraMnd - b.fraMnd)
    // dedupe på fraMnd — siste vinner (midt i redigering)
    .filter((f, i, arr) => arr.map((x) => x.fraMnd).lastIndexOf(f.fraMnd) === i)
    .slice(0, 11);
  return {
    nyePerMnd: num(d.nyePerMnd, s.nyePerMnd, { maks: 1000 }),
    vekstplan,
    aarligChurnPct: num(d.aarligChurnPct, s.aarligChurnPct, { maks: 100 }),
    reutleiePaa: d.reutleiePaa !== false,
    reutleieGapMnd: r0(num(d.reutleieGapMnd, s.reutleieGapMnd, { maks: 6 })),
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
    maalUtnyttelsePct: num(d.maalUtnyttelsePct, s.maalUtnyttelsePct, { min: 50, maks: 100 }),
    bemanningstrinn: trinn,
  };
}

// Fakta-sanering: tallserier kuttes/fylles til N måneder.
export function rensModellFakta(f = {}, N) {
  const serie = (arr) => Array.from({ length: N }, (_, i) => Math.max(0, r0(arr?.[i])));
  return {
    eksisterende: serie(f.eksisterende), // kontraktsfestet honorar (eks. mva) per måned
    enheter: serie(f.enheter),           // enheter under forvaltning per måned
    // Punktvise bortfall: honorar som faller ut av kontraktsfestet-serien når
    // kjente utflyttinger passeres — grunnlaget for re-utleie-laget. Eldre
    // planer mangler serien ([] → nuller): tallene endres aldri i det stille,
    // laget aktiveres først når fakta oppdateres fra leieforholdene.
    bortfall: serie(f.bortfall),
    oppdatertAt: f.oppdatertAt || null,
  };
}

/* ── Navngitte scenariosett: brukerdefinerte driversett («Konservativt» osv.)
      lagret på planen. Å velge et scenario laster driverne inn i editoren —
      lagrer man da, blir budsjettet stående med de forhåndsinnstillingene. ── */
export function rensScenarioer(inn) {
  if (!Array.isArray(inn)) return [];
  return inn.slice(0, 12).map((s, i) => ({
    id: (String(s?.id || '').trim() || `sc-${Date.now()}-${i}`).slice(0, 60),
    navn: (String(s?.navn || '').trim() || 'Scenario').slice(0, 40),
    drivere: rensModellDrivere(s?.drivere || {}),
    opprettetAt: typeof s?.opprettetAt === 'string' ? s.opprettetAt.slice(0, 40) : new Date().toISOString(),
  }));
}

// Skalerer HELE veksttakten (grunntakt + alle faser) med en faktor — brukes av
// sensitivitet/scenarioanalyse slik at «halv vekst» betyr halv takt i alle
// faser, ikke bare i fase 1.
export function skalerVekst(d, faktor) {
  const sk = (x) => Math.round((Number(x) || 0) * faktor * 10) / 10;
  return {
    ...d,
    nyePerMnd: sk(d.nyePerMnd),
    vekstplan: (Array.isArray(d.vekstplan) ? d.vekstplan : []).map((f) => ({ ...f, perMnd: sk(f.perMnd) })),
  };
}

export function beregnInvestorModell({ antallMnd, fakta = {}, drivere = {}, startYm = null }) {
  const N = Math.min(36, Math.max(1, r0(antallMnd) || 12));
  const d = rensModellDrivere(drivere);
  const fk = rensModellFakta(fakta, N);

  // Årlig churn → månedlig (geometrisk): 15 % årlig ≈ 1,345 % per måned.
  const mChurn = 1 - Math.pow(1 - d.aarligChurnPct / 100, 1 / 12);
  // Honorar eks. mva per ny enhet (privat: honorarsats inkl. mva → /1,25).
  const honorarNy = (d.snittleieNye * d.honorarPctNye) / 100 / 1.25;
  const fullkostAar = d.aarslonn * (1 + d.paslagPct / 100);
  // Dato-trinn løses til månedsindeks relativt til planens start; uten kjent
  // startYm regnes dato-trinnet som allerede utløst (konservativt for kostnad).
  const ymTilIdx = (ym) => {
    if (!startYm || !ym) return 0;
    const [y1, m1] = String(startYm).split('-').map(Number);
    const [y2, m2] = String(ym).split('-').map(Number);
    if (!y1 || !m1 || !y2 || !m2) return 0;
    return (y2 - y1) * 12 + (m2 - m1);
  };
  const trinn = d.bemanningstrinn.map((t) => ({ ...t, _idx: t.type === 'dato' ? ymTilIdx(t.fraYm) : null }));

  // Veksttakt per måned: fase 1 = nyePerMnd (fra måned 1), deretter gjelder
  // siste utløste fase i vekstplanen. Konstant takt når planen er tom.
  const faser = [{ fraMnd: 1, perMnd: d.nyePerMnd }, ...d.vekstplan];
  const takt = (t) => { let rt = d.nyePerMnd; for (const f of faser) { if (t + 1 >= f.fraMnd) rt = f.perMnd; } return rt; };

  const eksisterende = [], reutleie = [], vekst = [], oppstart = [], inntekt = [];
  const enheter = [], nyeNetto = [], nyePerMndSerie = [];
  const behovAarsverk = [], budsjettertPct = [], utnyttelsePct = [];
  const kSystem = [], kBemanning = [], kMfFast = [], kProvisjon = [], kAdmin = [], kAndre = [];
  const kostSum = [], resultat = [];

  // Re-utleie: kumulativt bortfalt honorar, forskjøvet med ledighetsgapet.
  // Med gap 0 gjenopptas honoraret sømløst måneden etter kontraktslutt.
  const kumBortfall = [];
  let accB = 0;
  for (let t = 0; t < N; t++) { accB += fk.bortfall[t]; kumBortfall.push(accB); }

  let kohort = 0; // akkumulerte modellerte enheter (netto etter churn)
  for (let t = 0; t < N; t++) {
    const nyeT = takt(t);
    nyePerMndSerie.push(nyeT);
    // Kohort churnes FØR månedens nye legges til (nye churner ikke i signeringsmåneden)
    kohort = kohort * (1 - mChurn) + nyeT;
    const nyeAkk = kohort;
    nyeNetto.push(r1(nyeAkk));

    const eks = fk.eksisterende[t];
    const re = d.reutleiePaa && t - d.reutleieGapMnd >= 0 ? kumBortfall[t - d.reutleieGapMnd] : 0;
    const v = r0(nyeAkk * honorarNy);
    const opp = r0(nyeT * d.oppstartPerEnhet);
    eksisterende.push(eks); reutleie.push(re); vekst.push(v); oppstart.push(opp);
    inntekt.push(eks + re + v + opp);

    const enh = r1(fk.enheter[t] + nyeAkk);
    enheter.push(enh);

    // Bemanning: glidende behov vs. hendelsesbasert budsjettert nivå.
    // Nivået er MAKS av alle utløste trinn (enhetsterskel nådd / måned passert)
    // — bemanningen «ratchets» opp og følger automatisk scenarioets veksttempo.
    const behov = enh / d.enheterPerAarsverk;
    behovAarsverk.push(Math.round(behov * 100) / 100);
    let pct = 0;
    for (const tr of trinn) {
      const utlost = tr.type === 'dato' ? t >= tr._idx : enh >= tr.fraEnheter;
      if (utlost) pct = Math.max(pct, tr.prosent);
    }
    budsjettertPct.push(pct);
    utnyttelsePct.push(pct > 0 ? r0((behov * 100 * 100) / pct) : null);

    const cs = r0(enh * d.systemPerEnhet);
    const cb = r0((pct / 100) * fullkostAar / 12);
    const cp = r0(nyeT * d.provisjonPerNyEnhet);
    kSystem.push(cs); kBemanning.push(cb); kMfFast.push(d.mfFast);
    kProvisjon.push(cp); kAdmin.push(d.adminFast); kAndre.push(d.andreFaste);
    const ks = cs + cb + d.mfFast + cp + d.adminFast + d.andreFaste;
    kostSum.push(ks);
    resultat.push(inntekt[t] - ks);
  }

  // Break-even: fra månedsserien — aldri analytisk.
  let breakEvenIdx = null;
  for (let t = 0; t < N; t++) { if (resultat[t] >= 0) { breakEvenIdx = t; break; } }

  // Akkumulert resultat + maks kapitalbehov (dypeste akkumulerte punkt).
  const akkumulert = [];
  let akk = 0;
  for (let t = 0; t < N; t++) { akk += resultat[t]; akkumulert.push(r0(akk)); }
  let kapBunn = 0, kapIdx = null;
  for (let t = 0; t < N; t++) { if (akkumulert[t] < kapBunn) { kapBunn = akkumulert[t]; kapIdx = t; } }

  // Kapasitetsbuffer: første måned der utnyttelsen passerer målnivået —
  // «forventet bemanningsbehov» (varsle FØR kapasiteten er sprengt).
  let bemanningsVarselIdx = null;
  for (let t = 0; t < N; t++) {
    if (utnyttelsePct[t] !== null && utnyttelsePct[t] > d.maalUtnyttelsePct) { bemanningsVarselIdx = t; break; }
  }

  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const sumInntekt = sum(inntekt);
  const sumEksisterende = sum(eksisterende);
  const sumReutleie = sum(reutleie);
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
    eksisterende, reutleie, vekst, oppstart, inntekt,
    enheter, nyeNetto, nyePerMndSerie,
    behovAarsverk, budsjettertPct, utnyttelsePct,
    kost: { system: kSystem, bemanning: kBemanning, mfFast: kMfFast, provisjon: kProvisjon, admin: kAdmin, andre: kAndre },
    kostSum, resultat, akkumulert,
    cac,
    sammendrag: {
      sumInntekt: r0(sumInntekt),
      sumEksisterende: r0(sumEksisterende),
      sumReutleie: r0(sumReutleie),
      sumModellert: r0(sumInntekt - sumEksisterende - sumReutleie),
      sumKost: r0(sumKost),
      resultat: r0(sumInntekt - sumKost),
      andelEksisterendePct: sumInntekt > 0 ? r0((sumEksisterende / sumInntekt) * 100) : null,
      enheterVedSlutt: enheter[N - 1] || 0,
      sumNyeBrutto: r1(sum(nyePerMndSerie)),
      breakEvenIdx,
      kapitalbehov: r0(-kapBunn),
      kapitalbehovIdx: kapIdx,
      mndChurnPct: Math.round(mChurn * 100 * 100) / 100,
      bemanningsVarselIdx,
    },
  };
}
