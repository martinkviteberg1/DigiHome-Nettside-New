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

export const STANDARD_GRUNNLEGGERE = {
  digihome: { paa: true, paslagPct: 35, personer: [
    { navn: 'Sarah', rolle: 'drift', andelPct: 70, trinn: [{ fraMnd: 1, brutto: 35000 }] },
    { navn: 'Martin', rolle: 'drift', andelPct: 20, trinn: [{ fraMnd: 1, brutto: 35000 }] },
  ] },
  tech: { paa: true, paslagPct: 35, personer: [
    { navn: 'Martin', rolle: 'rd', andelPct: 80, trinn: [{ fraMnd: 1, brutto: 35000 }] },
    { navn: 'Sarah', rolle: 'sm', andelPct: 30, trinn: [{ fraMnd: 1, brutto: 35000 }] },
  ] },
};
// Skatt i konsernsammenstillingen — standard PÅ for nye budsjetter (eksisterende: av)
export const STANDARD_SKATT = { paa: false, satsPct: 22, konsernbidrag: false };

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
  // Årlig justering — gjelder fra ÅR 2 i planen (år 1 påvirkes ALDRI, så en
  // 12-måneders plan gir identiske tall uansett verdier her). Standarder for
  // NYE budsjetter; eksisterende planer får 0 (rensModellDrivere) slik at
  // lagrede tall aldri endres i det stille.
  indeksPct: 3,        // årlig KPI-/indeksregulering av leie → honorar (husleieloven § 4-2)
  lonnsvekstPct: 4,    // årlig lønnsvekst på bemanningskostnaden
  kostInflasjonPct: 3, // årlig prisvekst på øvrige kostnader (system, MF, CAC, admin, andre)
  // Performance-partner: markedsføringsbyrå betalt på resultat — fast månedshonorar
  // + andel av honoraret fra hver NY enhet i enhetens første N måneder (kohort-
  // basert, følger churn). Standard for NYE budsjetter; eksisterende planer får
  // partneren AV (rensModellDrivere) slik at lagrede tall aldri endres i det stille.
  partner: { paa: true, fastPerMnd: 12000, honorarPct: 8, varighetMnd: 12, andelNyePct: 100, fraMnd: 1 },
  // Andel av nye enheter som kommer uten anskaffelseskost (referral, SEO, eksisterende kunder).
  // CAC (provisjonPerNyEnhet) belastes bare de betalte. 0 = alle nye koster CAC (konservativt).
  organiskAndelPct: 0,
  // Trinn på faste kostnader: {adminFast|andreFaste|mfFast: [{fraMnd, belop}]} — nominelle beløp
  // fra gitt måned (se rensTrinn). Tom = grunnverdi × kostnadsinflasjon som før.
  kostTrinn: { adminFast: [], andreFaste: [], mfFast: [] },
  // Grunnleggere: lønn m/ fordeling mellom selskapene (se STANDARD_GRUNNLEGGERE.digihome).
  grunnleggere: STANDARD_GRUNNLEGGERE.digihome,
  // Skatt/konsernbidrag — brukes av konsernsammenstillingen (Digihome AS-planen er «hovedplanen»).
  skatt: { ...STANDARD_SKATT, paa: true },
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

// Geometrisk sum 1 + q + q² + … + q^(n-1) — «hvor mange fulle måneder» en kohort
// betaler når den churner med (1-q) per måned. n = 0 tolkes som livstid.
const geomSum = (q, n) => { const nn = n > 0 ? n : 600; return q < 1 ? (1 - Math.pow(q, nn)) / (1 - q) : nn; };

/* ── Trinn på faste beløp: [{fraMnd, <felt>}] — nominelle beløp som gjelder fra måned fraMnd
      (1-basert). Et utløst trinn brukes SLIK DET ER (ingen inflasjon — trinnene er allerede
      «i det årets kroner»). Før første trinn gjelder grunnverdien × inflasjon som før.
      Tom liste = ingen trinn → nøyaktig samme tall som tidligere. ── */
export function rensTrinn(arr, { maks = 1e8, felt = 'belop', minFra = 1 } = {}) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => ({ fraMnd: r0(num(x?.fraMnd, 0, { maks: 36 })), [felt]: Math.round(num(x?.[felt], 0, { maks }) * 10) / 10 }))
    .filter((x) => x.fraMnd >= minFra)
    .sort((a, b) => a.fraMnd - b.fraMnd)
    .filter((x, i, a) => a.map((y) => y.fraMnd).lastIndexOf(x.fraMnd) === i)
    .slice(0, 12);
}
export const trinnVerdi = (trinn, t, felt = 'belop') => { let v = null; for (const s of trinn || []) { if (t + 1 >= s.fraMnd) v = s[felt]; } return v; };
const fastMedTrinn = (grunn, trinn, t, kostF) => { const v = trinnVerdi(trinn, t); return v === null ? grunn * kostF : v; };

/* ── Grunnleggere: lønn til gründerne, fordelt mellom selskapene (andelPct = DETTE selskapets
      andel av personens lønn). Brutto per måned i trinn (nominelt — ingen lønnsvekst legges
      på) + arbeidsgiverpåslag. rolle styrer SaaS-klassifisering i Tech (rd / sm / ga).
      Eksisterende planer uten feltet: AV (tallene endres ikke). ── */
export const GRUNNLEGGER_ROLLER = [['rd', 'Produkt / R&D'], ['sm', 'Salg & marked'], ['ga', 'Adm. / G&A'], ['drift', 'Drift']];
export function rensGrunnleggere(g, std) {
  const inn = g && typeof g === 'object' ? g : {};
  const personerInn = Array.isArray(inn.personer) ? inn.personer : std.personer;
  return {
    paa: inn.paa === true,
    paslagPct: num(inn.paslagPct, std.paslagPct, { maks: 200 }),
    personer: personerInn.slice(0, 6).map((p, i) => ({
      navn: String(p?.navn || `Grunnlegger ${i + 1}`).slice(0, 40),
      rolle: GRUNNLEGGER_ROLLER.some(([id]) => id === p?.rolle) ? p.rolle : 'ga',
      andelPct: num(p?.andelPct, 100, { maks: 100 }),
      trinn: rensTrinn(p?.trinn, { maks: 1e6, felt: 'brutto' }),
    })),
  };
}
// Månedskost (m/ påslag) totalt og per rolle. Person uten utløst trinn koster 0 (f.eks. lønn først fra oktober).
export function grunnleggerKost(g, t) {
  const ut = { sum: 0, rd: 0, sm: 0, ga: 0, drift: 0 };
  if (!g?.paa) return ut;
  const f = 1 + g.paslagPct / 100;
  for (const p of g.personer) {
    const b = trinnVerdi(p.trinn, t, 'brutto');
    if (!b) continue;
    const k = r0((p.andelPct / 100) * b * f);
    ut[p.rolle] = (ut[p.rolle] || 0) + k; ut.sum += k;
  }
  return ut;
}

/* ── Skatt (brukes i konsernsammenstillingen): 22 % selskapsskatt per kalenderår, med fremførbart
      underskudd per selskap. Konsernbidrag (krever mor/datter > 90 %) lar overskudd i ett selskap
      dekke underskudd i det andre samme år. Betales året etter (15. feb / 15. apr, 50/50). ── */
export function rensSkatt(s) {
  const inn = s && typeof s === 'object' ? s : {};
  return { paa: inn.paa === true, satsPct: num(inn.satsPct, STANDARD_SKATT.satsPct, { maks: 60 }), konsernbidrag: inn.konsernbidrag === true };
}

/* ── Performance-partner (felles for Digihome AS og Tech) ──
      paa            av/på — eksisterende planer uten feltet: AV (tallene endres ikke)
      fastPerMnd     fast månedshonorar til byrået (indekseres med kostnadsinflasjon)
      honorarPct     % av kundens løpende inntekt (honorar / MRR) i kundens første måneder
      varighetMnd    antall måneder per ny kunde (0 = livstid)
      andelNyePct    andel av nye kunder som tilskrives partneren (100 = alle)
      fraMnd         partneren starter i måned nr (1-basert)
      gjelder        (Tech) kundegrupper honoraret gjelder for                       ── */
export function rensPartner(p, std, grupper = null) {
  const inn = p && typeof p === 'object' ? p : {};
  const ut = {
    paa: inn.paa === true,
    fastPerMnd: r0(num(inn.fastPerMnd, std.fastPerMnd, { maks: 1e7 })),
    honorarPct: num(inn.honorarPct, std.honorarPct, { maks: 100 }),
    varighetMnd: r0(num(inn.varighetMnd, std.varighetMnd, { maks: 120 })),
    andelNyePct: num(inn.andelNyePct, std.andelNyePct, { maks: 100 }),
    fraMnd: r0(num(inn.fraMnd, std.fraMnd, { min: 1, maks: 36 })),
  };
  if (grupper) ut.gjelder = Object.fromEntries(grupper.map((g) => [g, inn.gjelder && typeof inn.gjelder === 'object' ? inn.gjelder[g] !== false : true]));
  return ut;
}

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
    // Årlig justering: 0 som fallback (IKKE standardverdien) — eksisterende
    // planer uten feltene beholder nøyaktig samme tall som før.
    indeksPct: num(d.indeksPct, 0, { maks: 15 }),
    lonnsvekstPct: num(d.lonnsvekstPct, 0, { maks: 20 }),
    kostInflasjonPct: num(d.kostInflasjonPct, 0, { maks: 20 }),
    partner: rensPartner(d.partner, s.partner),
    organiskAndelPct: num(d.organiskAndelPct, 0, { maks: 100 }),
    kostTrinn: {
      adminFast: rensTrinn(d.kostTrinn?.adminFast),
      andreFaste: rensTrinn(d.kostTrinn?.andreFaste),
      mfFast: rensTrinn(d.kostTrinn?.mfFast),
    },
    grunnleggere: rensGrunnleggere(d.grunnleggere, STANDARD_GRUNNLEGGERE.digihome),
    skatt: rensSkatt(d.skatt),
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
  const kSystem = [], kBemanning = [], kMfFast = [], kProvisjon = [], kPartner = [], kAdmin = [], kAndre = [], kGrunnleggere = [];
  const kostSum = [], resultat = [];
  const prisFaktor = [], lonnFaktor = [], kostFaktor = [];
  // Performance-partner: aktiv fra fraMnd; honoraret følger kohortene av nye enheter
  const pa = d.partner;
  const partnerAktiv = (t) => pa.paa && t + 1 >= pa.fraMnd;

  // Re-utleie: kumulativt bortfalt honorar, forskjøvet med ledighetsgapet.
  // Med gap 0 gjenopptas honoraret sømløst måneden etter kontraktslutt.
  const kumBortfall = [];
  let accB = 0;
  for (let t = 0; t < N; t++) { accB += fk.bortfall[t]; kumBortfall.push(accB); }

  let kohort = 0; // akkumulerte modellerte enheter (netto etter churn)
  for (let t = 0; t < N; t++) {
    // Årlig justering — trappes per PLANÅR (måned 1–12 = år 1 → faktor 1,0).
    // Alle inntektslag unntatt oppstartshonorar indekseres (leiejustering →
    // honoraret følger leien); lønn og øvrige kostnader har egne satser.
    const aarIdx = Math.floor(t / 12);
    const prisF = Math.pow(1 + d.indeksPct / 100, aarIdx);
    const lonnF = Math.pow(1 + d.lonnsvekstPct / 100, aarIdx);
    const kostF = Math.pow(1 + d.kostInflasjonPct / 100, aarIdx);
    prisFaktor.push(Math.round(prisF * 1000) / 1000);
    lonnFaktor.push(Math.round(lonnF * 1000) / 1000);
    kostFaktor.push(Math.round(kostF * 1000) / 1000);

    const nyeT = takt(t);
    nyePerMndSerie.push(nyeT);
    // Kohort churnes FØR månedens nye legges til (nye churner ikke i signeringsmåneden)
    kohort = kohort * (1 - mChurn) + nyeT;
    const nyeAkk = kohort;
    nyeNetto.push(r1(nyeAkk));

    const eks = r0(fk.eksisterende[t] * prisF);
    const re = r0((d.reutleiePaa && t - d.reutleieGapMnd >= 0 ? kumBortfall[t - d.reutleieGapMnd] : 0) * prisF);
    const v = r0(nyeAkk * honorarNy * prisF);
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

    const cs = r0(enh * d.systemPerEnhet * kostF);
    const cb = r0((pct / 100) * fullkostAar * lonnF / 12);
    // CAC bare på betalte nye (organisk andel koster ingenting å skaffe)
    const cp = r0(nyeT * (1 - d.organiskAndelPct / 100) * d.provisjonPerNyEnhet * kostF);
    const cmf = r0(fastMedTrinn(d.mfFast, d.kostTrinn.mfFast, t, kostF));
    const cad = r0(fastMedTrinn(d.adminFast, d.kostTrinn.adminFast, t, kostF));
    const can = r0(fastMedTrinn(d.andreFaste, d.kostTrinn.andreFaste, t, kostF));
    const cg = grunnleggerKost(d.grunnleggere, t).sum;
    // Partnerhonorar: fast + % av honoraret fra kohortene som fortsatt er i
    // partnerperioden (signert etter partnerstart, yngre enn varigheten, churn-justert)
    let cpa = 0;
    if (partnerAktiv(t)) {
      const fraK = Math.max(pa.fraMnd - 1, pa.varighetMnd > 0 ? t - pa.varighetMnd + 1 : 0);
      let grunnlag = 0;
      for (let kk = fraK; kk <= t; kk++) grunnlag += nyePerMndSerie[kk] * Math.pow(1 - mChurn, t - kk);
      cpa = r0(pa.fastPerMnd * kostF + grunnlag * honorarNy * prisF * (pa.honorarPct / 100) * (pa.andelNyePct / 100));
    }
    kSystem.push(cs); kBemanning.push(cb); kMfFast.push(cmf);
    kProvisjon.push(cp); kPartner.push(cpa); kAdmin.push(cad); kAndre.push(can); kGrunnleggere.push(cg);
    const ks = cs + cb + cmf + cp + cpa + cad + can + cg;
    kostSum.push(ks);
    resultat.push(inntekt[t] - ks);
  }

  // Performance-hale: honorar som forfaller ETTER periodens slutt for kohorter som allerede er
  // signert (partnerperioden løper videre). En forpliktelse — vises som note, aldri i resultatet.
  let partnerHale = 0; let partnerHaleMnd = 0;
  if (pa.paa && pa.varighetMnd > 0) {
    for (let kk = Math.max(0, N - pa.varighetMnd + 1); kk < N; kk++) {
      if (kk + 1 < pa.fraMnd) continue;
      for (let t = N; t < kk + pa.varighetMnd; t++) {
        const prisF = Math.pow(1 + d.indeksPct / 100, Math.floor(t / 12));
        partnerHale += nyePerMndSerie[kk] * Math.pow(1 - mChurn, t - kk) * honorarNy * prisF * (pa.honorarPct / 100) * (pa.andelNyePct / 100);
        partnerHaleMnd = Math.max(partnerHaleMnd, t - N + 1);
      }
    }
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

  // Per planår (måned 1–12, 13–24, 25–36): teleskopvisning + årssammendrag.
  // ARR = exit run-rate: siste måneds inntekt × 12 — hovedtallet i en pitch.
  const aar = [];
  for (let a = 0; a * 12 < N; a++) {
    const fra = a * 12;
    const til = Math.min(N, fra + 12) - 1;
    const del = (arr) => arr.slice(fra, til + 1).reduce((s2, x) => s2 + x, 0);
    const innA = del(inntekt);
    aar.push({
      nr: a + 1,
      fraIdx: fra,
      tilIdx: til,
      antallMnd: til - fra + 1,
      inntekt: r0(innA),
      kost: r0(del(kostSum)),
      resultat: r0(innA - del(kostSum)),
      marginPct: innA > 0 ? Math.round(((innA - del(kostSum)) / innA) * 100) : null,
      enheterSlutt: enheter[til] || 0,
      nyeBrutto: r1(del(nyePerMndSerie)),
      arrExit: r0((inntekt[til] || 0) * 12),
    });
  }

  // CAC-nøkkeltall per ny enhet (før bemanning). Full CAC = provisjon + partner-
  // honorar per enhet (% av honoraret i partnerperioden, churn-justert) — fast
  // partnerhonorar er en fast S&M-kostnad og fordeles ikke per enhet.
  const bidrag = r0(honorarNy - d.systemPerEnhet);
  const partnerPerEnhet = pa.paa ? r0(honorarNy * (pa.honorarPct / 100) * (pa.andelNyePct / 100) * geomSum(1 - mChurn, pa.varighetMnd)) : 0;
  const fullCac = d.provisjonPerNyEnhet + partnerPerEnhet;
  // Blandet CAC per ny enhet når en andel kommer organisk (uten media-kost)
  const blandetCac = r0(d.provisjonPerNyEnhet * (1 - d.organiskAndelPct / 100) + partnerPerEnhet);
  const cac = {
    provisjon: d.provisjonPerNyEnhet,
    partnerPerEnhet,
    fullCac,
    blandetCac,
    organiskAndelPct: d.organiskAndelPct,
    bruttoHonorarNy: r0(honorarNy),
    systemPerEnhet: d.systemPerEnhet,
    bidrag,
    paybackMnd: fullCac > 0 && bidrag > 0 ? r1(fullCac / bidrag) : null,
    paybackProvisjonMnd: d.provisjonPerNyEnhet > 0 && bidrag > 0 ? r1(d.provisjonPerNyEnhet / bidrag) : null,
  };
  const sumPartner = sum(kPartner);
  const sumSm = sum(kMfFast) + sum(kProvisjon) + sumPartner;

  return {
    N,
    drivere: d,
    fakta: fk,
    eksisterende, reutleie, vekst, oppstart, inntekt,
    enheter, nyeNetto, nyePerMndSerie,
    behovAarsverk, budsjettertPct, utnyttelsePct,
    prisFaktor, lonnFaktor, kostFaktor,
    aar,
    kost: { system: kSystem, bemanning: kBemanning, mfFast: kMfFast, provisjon: kProvisjon, partner: kPartner, admin: kAdmin, andre: kAndre, grunnleggere: kGrunnleggere },
    kostSum, resultat, akkumulert,
    cac,
    sammendrag: {
      sumInntekt: r0(sumInntekt),
      sumEksisterende: r0(sumEksisterende),
      sumReutleie: r0(sumReutleie),
      sumModellert: r0(sumInntekt - sumEksisterende - sumReutleie),
      sumKost: r0(sumKost),
      sumPartner: r0(sumPartner),
      sumGrunnleggere: r0(sum(kGrunnleggere)),
      partnerHale: r0(partnerHale),
      partnerHaleMnd,
      sumSm: r0(sumSm),
      smAndelPct: sumInntekt > 0 ? r0((sumSm / sumInntekt) * 100) : null,
      resultat: r0(sumInntekt - sumKost),
      andelEksisterendePct: sumInntekt > 0 ? r0((sumEksisterende / sumInntekt) * 100) : null,
      enheterVedSlutt: enheter[N - 1] || 0,
      sumNyeBrutto: r1(sum(nyePerMndSerie)),
      arrExit: r0((inntekt[N - 1] || 0) * 12),
      breakEvenIdx,
      kapitalbehov: r0(-kapBunn),
      kapitalbehovIdx: kapIdx,
      mndChurnPct: Math.round(mChurn * 100 * 100) / 100,
      bemanningsVarselIdx,
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PLATTFORM — selvbetjent utleie (software). Egen motor, egne drivere.
//
//   Inntekt  = sats % × snittleie × aktive enheter (eks. mva) + ev. oppstart
//   Vekst    = organisk + betalt: annonsebudsjett ÷ CAC per aktivert enhet
//   Churn    = årlig % → kohortbasert månedlig (enheter slutter å betale)
//   Kostnad  = variabel per enhet (LLM/Places/SMS/e-sign) + support (timer per
//              100 enheter × timekost) + markedsføring + utvikling + andre faste
//
// Ingen bemanningstrapp: plattformen skalerer med enheter, ikke med folk.
// ═════════════════════════════════════════════════════════════════════════════
export const STANDARD_PLATTFORM = {
  startEnheter: 0,        // aktive selvbetjente enheter ved planstart («i dag»)
  organiskPerMnd: 2,      // nye enheter uten betalt markedsføring
  annonsePerMnd: 30000,   // betalt markedsføring for plattformen (kr/mnd), fase 1
  // Annonsefaser: [{fraMnd (>=2), annonsePerMnd}] — som forvaltningens vekstplan.
  vekstplan: [],
  cacPerEnhet: 3000,      // annonsekost per AKTIVERT enhet (lead × aktiveringsgrad)
  aarligChurnPct: 20,     // andel enheter som slutter å betale per år
  snittleie: 15000,       // snitt månedsleie per enhet
  satsPct: 5,             // plattformsats (inkl. mva, privat)
  oppstartPerEnhet: 0,    // engangsinntekt per ny enhet
  variabelPerEnhet: 60,   // API/LLM/SMS/e-signering per enhet per mnd
  supportTimerPer100: 4,  // support-timer per 100 enheter per mnd
  timekost: 650,          // kr per support-time (fullkost)
  utviklingFast: 120000,  // utvikling og drift av plattformen (kr/mnd)
  andreFaste: 0,
  indeksPct: 3,           // årlig leiejustering → inntekt (fra år 2)
  kostInflasjonPct: 3,    // årlig prisvekst på kostnader og CAC (fra år 2)
};

export function rensPlattformDrivere(d = {}) {
  const s = STANDARD_PLATTFORM;
  const faserInn = Array.isArray(d.vekstplan) ? d.vekstplan : [];
  const vekstplan = faserInn
    .map((f) => ({ fraMnd: r0(num(f?.fraMnd, 0, { maks: 36 })), annonsePerMnd: r0(num(f?.annonsePerMnd, 0, { maks: 1e8 })) }))
    .filter((f) => f.fraMnd >= 2)
    .sort((a, b) => a.fraMnd - b.fraMnd)
    .filter((f, i, arr) => arr.map((x) => x.fraMnd).lastIndexOf(f.fraMnd) === i)
    .slice(0, 11);
  return {
    startEnheter: r0(num(d.startEnheter, s.startEnheter, { maks: 1e6 })),
    organiskPerMnd: num(d.organiskPerMnd, s.organiskPerMnd, { maks: 1e4 }),
    annonsePerMnd: r0(num(d.annonsePerMnd, s.annonsePerMnd, { maks: 1e8 })),
    vekstplan,
    cacPerEnhet: r0(num(d.cacPerEnhet, s.cacPerEnhet, { min: 1, maks: 1e6 })),
    aarligChurnPct: num(d.aarligChurnPct, s.aarligChurnPct, { maks: 100 }),
    snittleie: r0(num(d.snittleie, s.snittleie, { maks: 1e6 })),
    satsPct: num(d.satsPct, s.satsPct, { maks: 100 }),
    oppstartPerEnhet: r0(num(d.oppstartPerEnhet, s.oppstartPerEnhet, { maks: 1e6 })),
    variabelPerEnhet: r0(num(d.variabelPerEnhet, s.variabelPerEnhet, { maks: 1e5 })),
    supportTimerPer100: num(d.supportTimerPer100, s.supportTimerPer100, { maks: 1e4 }),
    timekost: r0(num(d.timekost, s.timekost, { maks: 1e5 })),
    utviklingFast: r0(num(d.utviklingFast, s.utviklingFast, { maks: 1e8 })),
    andreFaste: r0(num(d.andreFaste, s.andreFaste, { maks: 1e8 })),
    indeksPct: num(d.indeksPct, s.indeksPct, { maks: 15 }),
    kostInflasjonPct: num(d.kostInflasjonPct, s.kostInflasjonPct, { maks: 20 }),
  };
}

export function beregnPlattform({ antallMnd, drivere = {} }) {
  const N = Math.min(36, Math.max(1, r0(antallMnd) || 12));
  const d = rensPlattformDrivere(drivere);
  const mChurn = 1 - Math.pow(1 - d.aarligChurnPct / 100, 1 / 12);
  const arpu = (d.snittleie * d.satsPct) / 100 / 1.25; // eks. mva per enhet per mnd
  const faser = [{ fraMnd: 1, annonsePerMnd: d.annonsePerMnd }, ...d.vekstplan];
  const annonse = (t) => { let a = d.annonsePerMnd; for (const f of faser) { if (t + 1 >= f.fraMnd) a = f.annonsePerMnd; } return a; };

  const enheter = [], nye = [], churnet = [], inntekt = [], oppstart = [];
  const kVariabel = [], kSupport = [], kMarked = [], kUtvikling = [], kAndre = [];
  const kostSum = [], resultat = [], akkumulert = [];
  let bestand = d.startEnheter;
  let akk = 0;
  for (let t = 0; t < N; t++) {
    const aarIdx = Math.floor(t / 12);
    const prisF = Math.pow(1 + d.indeksPct / 100, aarIdx);
    const kostF = Math.pow(1 + d.kostInflasjonPct / 100, aarIdx);
    const annT = r0(annonse(t) * kostF);
    const cacT = d.cacPerEnhet * kostF;
    const nyeT = d.organiskPerMnd + (cacT > 0 ? annT / cacT : 0);
    const churnT = bestand * mChurn;             // churn før månedens nye
    bestand = bestand - churnT + nyeT;
    nye.push(r1(nyeT)); churnet.push(r1(churnT)); enheter.push(r1(bestand));

    const inn = r0(bestand * arpu * prisF);
    const opp = r0(nyeT * d.oppstartPerEnhet);
    inntekt.push(inn + opp); oppstart.push(opp);

    const cv = r0(bestand * d.variabelPerEnhet * kostF);
    const csu = r0((bestand / 100) * d.supportTimerPer100 * d.timekost * kostF);
    const cu = r0(d.utviklingFast * kostF);
    const ca = r0(d.andreFaste * kostF);
    kVariabel.push(cv); kSupport.push(csu); kMarked.push(annT); kUtvikling.push(cu); kAndre.push(ca);
    const ks = cv + csu + annT + cu + ca;
    kostSum.push(ks);
    resultat.push(inn + opp - ks);
    akk += inn + opp - ks; akkumulert.push(r0(akk));
  }

  let breakEvenIdx = null;
  for (let t = 0; t < N; t++) { if (resultat[t] >= 0) { breakEvenIdx = t; break; } }
  let kapBunn = 0, kapIdx = null;
  for (let t = 0; t < N; t++) { if (akkumulert[t] < kapBunn) { kapBunn = akkumulert[t]; kapIdx = t; } }

  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const aar = [];
  for (let a = 0; a * 12 < N; a++) {
    const fra = a * 12; const til = Math.min(N, fra + 12) - 1;
    const del = (arr) => arr.slice(fra, til + 1).reduce((s2, x) => s2 + x, 0);
    const innA = del(inntekt);
    aar.push({ nr: a + 1, fraIdx: fra, tilIdx: til, antallMnd: til - fra + 1, inntekt: r0(innA), kost: r0(del(kostSum)), resultat: r0(innA - del(kostSum)), marginPct: innA > 0 ? Math.round(((innA - del(kostSum)) / innA) * 100) : null, enheterSlutt: enheter[til] || 0, nyeBrutto: r1(del(nye)), arrExit: r0((inntekt[til] || 0) * 12) });
  }

  // Unit economics per enhet (år 1-satser)
  const variabelPerEnhet = d.variabelPerEnhet + (d.supportTimerPer100 / 100) * d.timekost;
  const bidrag = arpu - variabelPerEnhet;
  const levetidMnd = mChurn > 0 ? 1 / mChurn : null;
  const ltv = levetidMnd ? bidrag * levetidMnd : null;
  const unit = {
    arpu: r0(arpu),
    variabelPerEnhet: r0(variabelPerEnhet),
    bidrag: r0(bidrag),
    bruttoMarginPct: arpu > 0 ? r0((bidrag / arpu) * 100) : null,
    cac: d.cacPerEnhet,
    paybackMnd: bidrag > 0 ? r1(d.cacPerEnhet / bidrag) : null,
    levetidMnd: levetidMnd ? r0(levetidMnd) : null,
    ltv: ltv ? r0(ltv) : null,
    ltvCac: ltv && d.cacPerEnhet > 0 ? r1(ltv / d.cacPerEnhet) : null,
  };

  return {
    N, drivere: d,
    enheter, nye, churnet, inntekt, oppstart,
    kost: { variabel: kVariabel, support: kSupport, markedsforing: kMarked, utvikling: kUtvikling, andre: kAndre },
    kostSum, resultat, akkumulert, aar, unit,
    sammendrag: {
      sumInntekt: r0(sum(inntekt)), sumKost: r0(sum(kostSum)), resultat: r0(sum(inntekt) - sum(kostSum)),
      enheterVedSlutt: enheter[N - 1] || 0, sumNyeBrutto: r1(sum(nye)), arrExit: r0((inntekt[N - 1] || 0) * 12),
      breakEvenIdx, kapitalbehov: r0(-kapBunn), kapitalbehovIdx: kapIdx, mndChurnPct: Math.round(mChurn * 100 * 100) / 100,
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// FELLES — kostnader som ikke tilhører ett segment (ledelse, regnskap, husleie,
// programvare, merkevare). Fordeles SYNLIG: etter omsetning, likt eller fast nøkkel.
// ═════════════════════════════════════════════════════════════════════════════
export const FELLES_POSTER = [
  ['ledelse', 'Ledelse og administrasjon'],
  ['regnskap', 'Regnskap og revisjon'],
  ['husleie', 'Kontor og husleie'],
  ['programvare', 'Programvare og lisenser'],
  ['merkevare', 'Merkevare og felles markedsføring'],
  ['andre', 'Andre felleskostnader'],
];
export const STANDARD_FELLES = {
  ledelse: 0, regnskap: 8000, husleie: 0, programvare: 5000, merkevare: 10000, andre: 0,
  fordeling: 'omsetning', // 'omsetning' | 'likt' | 'fast'
  forvaltningPct: 50,     // brukes ved 'fast'
  kostInflasjonPct: 3,
};
export function rensFelles(f = {}) {
  const s = STANDARD_FELLES;
  const ut = {};
  for (const [k] of FELLES_POSTER) ut[k] = r0(num(f[k], s[k], { maks: 1e8 }));
  ut.fordeling = ['omsetning', 'likt', 'fast'].includes(f.fordeling) ? f.fordeling : s.fordeling;
  ut.forvaltningPct = num(f.forvaltningPct, s.forvaltningPct, { maks: 100 });
  ut.kostInflasjonPct = num(f.kostInflasjonPct, s.kostInflasjonPct, { maks: 20 });
  return ut;
}

// ═════════════════════════════════════════════════════════════════════════════
// KONSERN — de to motorene + felles, konsolidert måned for måned.
// Break-even per segment (etter fordelt felles) og totalt; kapitalbehov = dypeste
// akkumulerte punkt for konsernet.
// ═════════════════════════════════════════════════════════════════════════════
export function beregnKonsern({ forvaltning, plattform, felles = {}, antallMnd }) {
  const N = Math.min(36, Math.max(1, r0(antallMnd) || forvaltning?.N || plattform?.N || 12));
  const fe = rensFelles(felles);
  const hent = (arr, t) => (Array.isArray(arr) && Number.isFinite(arr[t]) ? arr[t] : 0);
  const innF = [], innP = [], innT = [], kostF = [], kostP = [], kostFelles = [], fordF = [], fordP = [], kostT = [];
  const resF = [], resP = [], resT = [], akkumulert = [];
  let akk = 0;
  for (let t = 0; t < N; t++) {
    const aarIdx = Math.floor(t / 12);
    const kf = Math.pow(1 + fe.kostInflasjonPct / 100, aarIdx);
    const iF = hent(forvaltning?.inntekt, t); const iP = hent(plattform?.inntekt, t);
    const kF = hent(forvaltning?.kostSum, t); const kP = hent(plattform?.kostSum, t);
    const fellesT = r0(FELLES_POSTER.reduce((s, [k]) => s + fe[k], 0) * kf);
    let andelF;
    if (fe.fordeling === 'likt') andelF = 0.5;
    else if (fe.fordeling === 'fast') andelF = fe.forvaltningPct / 100;
    else andelF = iF + iP > 0 ? iF / (iF + iP) : 0.5;
    const fF = r0(fellesT * andelF); const fP = fellesT - fF;
    innF.push(iF); innP.push(iP); innT.push(iF + iP);
    kostF.push(kF); kostP.push(kP); kostFelles.push(fellesT); fordF.push(fF); fordP.push(fP);
    kostT.push(kF + kP + fellesT);
    resF.push(iF - kF - fF); resP.push(iP - kP - fP);
    const rt = iF + iP - kF - kP - fellesT;
    resT.push(rt); akk += rt; akkumulert.push(r0(akk));
  }
  const forsteIkkeNegativ = (arr) => { for (let t = 0; t < N; t++) { if (arr[t] >= 0) return t; } return null; };
  let kapBunn = 0, kapIdx = null;
  for (let t = 0; t < N; t++) { if (akkumulert[t] < kapBunn) { kapBunn = akkumulert[t]; kapIdx = t; } }
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const aar = [];
  for (let a = 0; a * 12 < N; a++) {
    const fra = a * 12; const til = Math.min(N, fra + 12) - 1;
    const del = (arr) => arr.slice(fra, til + 1).reduce((s2, x) => s2 + x, 0);
    aar.push({
      nr: a + 1, fraIdx: fra, tilIdx: til, antallMnd: til - fra + 1,
      inntektForvaltning: r0(del(innF)), inntektPlattform: r0(del(innP)), inntekt: r0(del(innT)),
      kostForvaltning: r0(del(kostF)), kostPlattform: r0(del(kostP)), felles: r0(del(kostFelles)), kost: r0(del(kostT)),
      resultatForvaltning: r0(del(resF)), resultatPlattform: r0(del(resP)), resultat: r0(del(resT)),
      marginPct: del(innT) > 0 ? Math.round((del(resT) / del(innT)) * 100) : null,
      arrExit: r0((innT[til] || 0) * 12),
    });
  }
  const sumInn = sum(innT); const sumKost = sum(kostT);
  return {
    N, felles: fe,
    inntekt: { forvaltning: innF, plattform: innP, total: innT },
    kost: { forvaltning: kostF, plattform: kostP, felles: kostFelles, total: kostT, fellesFordelt: { forvaltning: fordF, plattform: fordP } },
    resultat: { forvaltning: resF, plattform: resP, total: resT },
    akkumulert, aar,
    sammendrag: {
      sumInntekt: r0(sumInn), sumInntektForvaltning: r0(sum(innF)), sumInntektPlattform: r0(sum(innP)),
      sumKost: r0(sumKost), sumFelles: r0(sum(kostFelles)), resultat: r0(sumInn - sumKost),
      resultatForvaltning: r0(sum(resF)), resultatPlattform: r0(sum(resP)),
      breakEvenIdx: forsteIkkeNegativ(resT), breakEvenForvaltningIdx: forsteIkkeNegativ(resF), breakEvenPlattformIdx: forsteIkkeNegativ(resP),
      kapitalbehov: r0(-kapBunn), kapitalbehovIdx: kapIdx,
      arrExit: r0((innT[N - 1] || 0) * 12), arrExitForvaltning: r0((innF[N - 1] || 0) * 12), arrExitPlattform: r0((innP[N - 1] || 0) * 12),
      andelPlattformPct: sumInn > 0 ? r0((sum(innP) / sumInn) * 100) : null,
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// DIGIHOME TECH AS — plattformselskapet som eget budsjett.
//
// Tech selger ÉN plattform til TRE kundegrupper, hver med sin pris og sin
// vekstlogikk. Prisene er Techs (prislisten) — det Digihome AS betaler er
// bare én av dem:
//   · huseier      — selvbetjente huseiere: organisk + annonse/CAC, churn,
//                    pris i % av leie eller fast kr/enhet
//   · forvaltning  — plattformlisens fra Digihome AS: enheter under forvaltning
//                    (fra koblet Digihome AS-budsjett = fakta) × kr/enhet
//   · bedrift      — eiendomsselskaper: nye selskaper/mnd × enheter per selskap,
//                    lav churn, salgskost per selskap
// Kostnadene skalerer med enheter og programvare, ikke med folk.
// Årlig justering (pris/kost) fra år 2 — år 1 påvirkes aldri.
// ═════════════════════════════════════════════════════════════════════════════
export const STANDARD_TECH = {
  huseier: {
    startEnheter: 0, organiskPerMnd: 3, annonsePerMnd: 20000, vekstplan: [],
    cacPerEnhet: 2500, aarligChurnPct: 25, prisModell: 'pct', pris: 5, snittleie: 15000, oppstartPerEnhet: 0,
    // modus 'kroner': annonsebudsjett (faser) ÷ CAC gir nye kunder (som før).
    // modus 'kunder': planlegg nye betalte kunder per måned i trinn — motoren regner annonsebudsjettet
    // baklengs (nye × CAC). Samme mentale modell som Digihome AS' vekstplan.
    modus: 'kroner', kunderPlan: [],
  },
  forvaltning: { pris: 200, kilde: 'plan', startEnheter: 30, nyePerMnd: 2 },
  bedrift: { startSelskaper: 0, nyeSelskaperPerMnd: 0.5, enheterPerSelskap: 20, pris: 79, aarligChurnPct: 8, salgskostPerSelskap: 15000, fraMnd: 1 },
  // markedsforingFast: merkevare, innhold, verktøy — S&M som ikke er annonsekjøp
  kost: { utviklingFast: 120000, hostingFast: 5000, variabelPerEnhet: 25, supportTimerPer100: 2, timekost: 650, andreFaste: 5000, markedsforingFast: 10000 },
  // Performance-partner: fast honorar + % av abonnementet fra nye kunder i deres første måneder.
  // Gjelder alle kundegrupper som standard — kan slås av per gruppe.
  partner: { paa: true, fastPerMnd: 12000, honorarPct: 8, varighetMnd: 12, andelNyePct: 100, fraMnd: 1, gjelder: { huseier: true, bedrift: true, forvaltning: true } },
  justering: { prisIndeksPct: 3, kostInflasjonPct: 3 },
  // Trinn på faste kostnader (nominelle beløp fra gitt måned) — f.eks. AI-native utvikling 30 → 35 → 40 → 45 k per år.
  kostTrinn: { utviklingFast: [], hostingFast: [], andreFaste: [], markedsforingFast: [] },
  grunnleggere: STANDARD_GRUNNLEGGERE.tech,
};
export const TECH_KUNDEGRUPPER = ['huseier', 'bedrift', 'forvaltning'];

export function rensTechDrivere(d = {}) {
  const s = STANDARD_TECH; const h = d.huseier || {}; const f = d.forvaltning || {}; const b = d.bedrift || {}; const k = d.kost || {}; const j = d.justering || {};
  const faserInn = Array.isArray(h.vekstplan) ? h.vekstplan : [];
  const vekstplan = faserInn
    .map((x) => ({ fraMnd: r0(num(x?.fraMnd, 0, { maks: 36 })), annonsePerMnd: r0(num(x?.annonsePerMnd, 0, { maks: 1e8 })) }))
    .filter((x) => x.fraMnd >= 2).sort((a, c) => a.fraMnd - c.fraMnd)
    .filter((x, i, arr) => arr.map((y) => y.fraMnd).lastIndexOf(x.fraMnd) === i).slice(0, 11);
  return {
    huseier: {
      startEnheter: r0(num(h.startEnheter, s.huseier.startEnheter, { maks: 1e6 })),
      organiskPerMnd: num(h.organiskPerMnd, s.huseier.organiskPerMnd, { maks: 1e4 }),
      annonsePerMnd: r0(num(h.annonsePerMnd, s.huseier.annonsePerMnd, { maks: 1e8 })),
      vekstplan,
      cacPerEnhet: r0(num(h.cacPerEnhet, s.huseier.cacPerEnhet, { min: 1, maks: 1e6 })),
      aarligChurnPct: num(h.aarligChurnPct, s.huseier.aarligChurnPct, { maks: 100 }),
      prisModell: h.prisModell === 'fast' ? 'fast' : 'pct',
      pris: h.prisModell === 'fast' ? r0(num(h.pris, 600, { maks: 1e6 })) : num(h.pris, s.huseier.pris, { maks: 100 }),
      snittleie: r0(num(h.snittleie, s.huseier.snittleie, { maks: 1e6 })),
      oppstartPerEnhet: r0(num(h.oppstartPerEnhet, s.huseier.oppstartPerEnhet, { maks: 1e6 })),
      modus: h.modus === 'kunder' ? 'kunder' : 'kroner',
      kunderPlan: rensTrinn(h.kunderPlan, { maks: 1e4, felt: 'nyePerMnd' }),
    },
    forvaltning: {
      pris: r0(num(f.pris, s.forvaltning.pris, { maks: 1e5 })),
      kilde: f.kilde === 'manuell' ? 'manuell' : 'plan',
      startEnheter: r0(num(f.startEnheter, s.forvaltning.startEnheter, { maks: 1e6 })),
      nyePerMnd: num(f.nyePerMnd, s.forvaltning.nyePerMnd, { maks: 1e4 }),
    },
    bedrift: {
      startSelskaper: r0(num(b.startSelskaper, s.bedrift.startSelskaper, { maks: 1e5 })),
      nyeSelskaperPerMnd: num(b.nyeSelskaperPerMnd, s.bedrift.nyeSelskaperPerMnd, { maks: 1e3 }),
      enheterPerSelskap: r0(num(b.enheterPerSelskap, s.bedrift.enheterPerSelskap, { min: 1, maks: 1e5 })),
      pris: r0(num(b.pris, s.bedrift.pris, { maks: 1e5 })),
      aarligChurnPct: num(b.aarligChurnPct, s.bedrift.aarligChurnPct, { maks: 100 }),
      salgskostPerSelskap: r0(num(b.salgskostPerSelskap, s.bedrift.salgskostPerSelskap, { maks: 1e7 })),
      fraMnd: r0(num(b.fraMnd, s.bedrift.fraMnd, { min: 1, maks: 36 })),
    },
    kost: {
      utviklingFast: r0(num(k.utviklingFast, s.kost.utviklingFast, { maks: 1e8 })),
      hostingFast: r0(num(k.hostingFast, s.kost.hostingFast, { maks: 1e8 })),
      variabelPerEnhet: r0(num(k.variabelPerEnhet, s.kost.variabelPerEnhet, { maks: 1e5 })),
      supportTimerPer100: num(k.supportTimerPer100, s.kost.supportTimerPer100, { maks: 1e4 }),
      timekost: r0(num(k.timekost, s.kost.timekost, { maks: 1e5 })),
      andreFaste: r0(num(k.andreFaste, s.kost.andreFaste, { maks: 1e8 })),
      // 0 som fallback (ikke standarden) — eksisterende planer beholder tallene sine
      markedsforingFast: r0(num(k.markedsforingFast, 0, { maks: 1e8 })),
    },
    partner: rensPartner(d.partner, s.partner, TECH_KUNDEGRUPPER),
    justering: {
      prisIndeksPct: num(j.prisIndeksPct, s.justering.prisIndeksPct, { maks: 15 }),
      kostInflasjonPct: num(j.kostInflasjonPct, s.justering.kostInflasjonPct, { maks: 20 }),
    },
    kostTrinn: {
      utviklingFast: rensTrinn(d.kostTrinn?.utviklingFast),
      hostingFast: rensTrinn(d.kostTrinn?.hostingFast),
      andreFaste: rensTrinn(d.kostTrinn?.andreFaste),
      markedsforingFast: rensTrinn(d.kostTrinn?.markedsforingFast),
    },
    grunnleggere: rensGrunnleggere(d.grunnleggere, STANDARD_GRUNNLEGGERE.tech),
  };
}

// Fakta for Tech: enheter under forvaltning per måned (fra koblet Digihome AS-
// budsjett, ellers dagens portefølje). Null = ikke hentet → manuell trapp brukes.
export function rensTechFakta(f = {}, N = 12) {
  const serie = Array.isArray(f?.enheterForvaltning) && f.enheterForvaltning.length
    ? Array.from({ length: N }, (_, i) => r1(Number(f.enheterForvaltning[Math.min(i, f.enheterForvaltning.length - 1)]) || 0))
    : null;
  return {
    enheterForvaltning: serie,
    kilde: f?.kilde === 'portefolje' ? 'portefolje' : f?.kilde === 'plan' ? 'plan' : null,
    kildePlanId: f?.kildePlanId ? String(f.kildePlanId) : null,
    kildePlanNavn: f?.kildePlanNavn ? String(f.kildePlanNavn).slice(0, 80) : null,
    kildeSystemPerEnhet: f?.kildeSystemPerEnhet != null && Number.isFinite(Number(f.kildeSystemPerEnhet)) ? Number(f.kildeSystemPerEnhet) : null,
    oppdatertAt: f?.oppdatertAt || null,
  };
}

export const techPrisPerEnhet = (h) => (h.prisModell === 'fast' ? h.pris : (h.snittleie * h.pris) / 100 / 1.25);

export function beregnTech({ antallMnd, drivere = {}, fakta = {} }) {
  const N = Math.min(36, Math.max(1, r0(antallMnd) || 12));
  const d = rensTechDrivere(drivere);
  const fk = rensTechFakta(fakta, N);
  const h = d.huseier; const f = d.forvaltning; const b = d.bedrift; const k = d.kost;
  const mChurnH = 1 - Math.pow(1 - h.aarligChurnPct / 100, 1 / 12);
  const mChurnB = 1 - Math.pow(1 - b.aarligChurnPct / 100, 1 / 12);
  const arpuH = techPrisPerEnhet(h);
  const faser = [{ fraMnd: 1, annonsePerMnd: h.annonsePerMnd }, ...h.vekstplan];
  const annonse = (t) => { let a = h.annonsePerMnd; for (const x of faser) { if (t + 1 >= x.fraMnd) a = x.annonsePerMnd; } return a; };
  const brukPlanFakta = f.kilde === 'plan' && Array.isArray(fk.enheterForvaltning);

  const enhH = [], enhF = [], enhB = [], enhT = [], nyeH = [], selskaperB = [], nyeSelskaper = [];
  const innH = [], innF = [], innB = [], innT = [];
  const kUtv = [], kHost = [], kVar = [], kSup = [], kAnn = [], kSalg = [], kPart = [], kMf = [], kAndre = [], kGr = [], grRolle = [], kostSum = [], resultat = [], akkumulert = [];
  const pa = d.partner;
  const partnerAktiv = (t) => pa.paa && t + 1 >= pa.fraMnd;
  let bestH = h.startEnheter; let selsk = b.startSelskaper; let akk = 0;
  for (let t = 0; t < N; t++) {
    const aarIdx = Math.floor(t / 12);
    const prisF = Math.pow(1 + d.justering.prisIndeksPct / 100, aarIdx);
    const kostF = Math.pow(1 + d.justering.kostInflasjonPct / 100, aarIdx);
    // Huseiere — 'kroner': annonsebudsjett ÷ CAC gir nye; 'kunder': planlagte nye × CAC gir annonsebudsjettet
    const cacT = h.cacPerEnhet * kostF;
    let annT; let nyeT;
    if (h.modus === 'kunder') {
      const planNye = trinnVerdi(h.kunderPlan, t, 'nyePerMnd') ?? 0;
      annT = r0(planNye * cacT);
      nyeT = h.organiskPerMnd + planNye;
    } else {
      annT = r0(annonse(t) * kostF);
      nyeT = h.organiskPerMnd + (cacT > 0 ? annT / cacT : 0);
    }
    bestH = bestH - bestH * mChurnH + nyeT;
    nyeH.push(r1(nyeT)); enhH.push(r1(bestH));
    // Forvaltning (lisens)
    const eF = brukPlanFakta ? fk.enheterForvaltning[t] : r0(f.startEnheter + f.nyePerMnd * t);
    enhF.push(eF);
    // Bedrift
    const aktivB = t + 1 >= b.fraMnd;
    const nyeS = aktivB ? b.nyeSelskaperPerMnd : 0;
    selsk = selsk - selsk * mChurnB + nyeS;
    const eB = selsk * b.enheterPerSelskap;
    selskaperB.push(r1(selsk)); nyeSelskaper.push(r1(nyeS)); enhB.push(r1(eB));
    const eT = bestH + eF + eB; enhT.push(r1(eT));
    // Inntekt per strøm
    const iH = r0(bestH * arpuH * prisF) + r0(nyeT * h.oppstartPerEnhet);
    const iF = r0(eF * f.pris * prisF);
    const iB = r0(eB * b.pris * prisF);
    innH.push(iH); innF.push(iF); innB.push(iB); innT.push(iH + iF + iB);
    // Kostnader
    const cu = r0(fastMedTrinn(k.utviklingFast, d.kostTrinn.utviklingFast, t, kostF)); const ch = r0(fastMedTrinn(k.hostingFast, d.kostTrinn.hostingFast, t, kostF));
    const cv = r0(eT * k.variabelPerEnhet * kostF);
    const cs = r0((eT / 100) * k.supportTimerPer100 * k.timekost * kostF);
    const csalg = r0(nyeS * b.salgskostPerSelskap * kostF);
    const ca = r0(fastMedTrinn(k.andreFaste, d.kostTrinn.andreFaste, t, kostF));
    const cmf = r0(fastMedTrinn(k.markedsforingFast, d.kostTrinn.markedsforingFast, t, kostF));
    const gr = grunnleggerKost(d.grunnleggere, t);
    // Performance-partner: fast honorar + % av MRR fra kohortene i partnerperioden
    // (nye etter partnerstart, yngre enn varigheten, churn-justert) per kundegruppe.
    // Lisensen: økningen i enheter under forvaltning regnes som «nye» (fra mnd 2).
    let cpa = 0;
    if (partnerAktiv(t)) {
      const fraK = Math.max(pa.fraMnd - 1, pa.varighetMnd > 0 ? t - pa.varighetMnd + 1 : 0);
      let grunnlag = 0;
      for (let kk = fraK; kk <= t; kk++) {
        if (pa.gjelder.huseier) grunnlag += nyeH[kk] * Math.pow(1 - mChurnH, t - kk) * arpuH;
        if (pa.gjelder.bedrift) grunnlag += nyeSelskaper[kk] * Math.pow(1 - mChurnB, t - kk) * b.enheterPerSelskap * b.pris;
        if (pa.gjelder.forvaltning && kk >= 1) grunnlag += Math.max(0, enhF[kk] - enhF[kk - 1]) * f.pris;
      }
      cpa = r0(pa.fastPerMnd * kostF + grunnlag * prisF * (pa.honorarPct / 100) * (pa.andelNyePct / 100));
    }
    kUtv.push(cu); kHost.push(ch); kVar.push(cv); kSup.push(cs); kAnn.push(annT); kSalg.push(csalg); kPart.push(cpa); kMf.push(cmf); kAndre.push(ca); kGr.push(gr.sum); grRolle.push(gr);
    const ks = cu + ch + cv + cs + annT + csalg + cpa + cmf + ca + gr.sum;
    kostSum.push(ks);
    const res = iH + iF + iB - ks; resultat.push(res); akk += res; akkumulert.push(r0(akk));
  }
  // Performance-hale etter periodens slutt (kohorter som allerede er signert — forpliktelse, ikke resultat)
  let partnerHale = 0; let partnerHaleMnd = 0;
  if (pa.paa && pa.varighetMnd > 0) {
    for (let kk = Math.max(0, N - pa.varighetMnd + 1); kk < N; kk++) {
      if (kk + 1 < pa.fraMnd) continue;
      for (let t = N; t < kk + pa.varighetMnd; t++) {
        const prisF = Math.pow(1 + d.justering.prisIndeksPct / 100, Math.floor(t / 12));
        let g = 0;
        if (pa.gjelder.huseier) g += nyeH[kk] * Math.pow(1 - mChurnH, t - kk) * arpuH;
        if (pa.gjelder.bedrift) g += nyeSelskaper[kk] * Math.pow(1 - mChurnB, t - kk) * b.enheterPerSelskap * b.pris;
        if (pa.gjelder.forvaltning && kk >= 1) g += Math.max(0, enhF[kk] - enhF[kk - 1]) * f.pris;
        partnerHale += g * prisF * (pa.honorarPct / 100) * (pa.andelNyePct / 100);
        partnerHaleMnd = Math.max(partnerHaleMnd, t - N + 1);
      }
    }
  }
  const sum = (a) => a.reduce((s, x) => s + (Number(x) || 0), 0);
  const sumInn = sum(innT); const sumKost = sum(kostSum);
  const sumH = sum(innH); const sumF = sum(innF); const sumB = sum(innB);
  let breakEvenIdx = null; for (let t = 0; t < N; t++) { if (resultat[t] >= 0 && innT[t] > 0) { breakEvenIdx = t; break; } }
  let kapBunn = 0; let kapIdx = null; akkumulert.forEach((v, i) => { if (v < kapBunn) { kapBunn = v; kapIdx = i; } });

  // ── SaaS-lag: MRR-bevegelse, kunder (logoer), P&L etter SaaS-linjer ──
  // MRR = løpende inntekt (oppstartshonorar holdes utenfor). Churnet MRR regnes
  // på kohorten som forsvinner i måneden (huseiere og bedrift); lisensen churner
  // ikke — den følger porteføljen i Digihome AS-budsjettet.
  const mrr = []; const nyMrr = []; const churnMrr = []; const netNyMrr = [];
  const kunder = { huseier: [], bedrift: [], total: [] };
  const cogs = []; const sm = []; const rd = []; const ga = []; const brutto = []; const bruttoPct = [];
  let prevH = h.startEnheter; let prevS = b.startSelskaper; let prevF = null;
  for (let t = 0; t < N; t++) {
    const aarIdx = Math.floor(t / 12); const prisF = Math.pow(1 + d.justering.prisIndeksPct / 100, aarIdx);
    const oppT = r0(nyeH[t] * h.oppstartPerEnhet);
    const m = innT[t] - oppT; mrr.push(r0(m));
    const churnH = r0(prevH * mChurnH * arpuH * prisF);
    const churnB = r0(prevS * mChurnB * b.enheterPerSelskap * b.pris * prisF);
    const nyH = r0(nyeH[t] * arpuH * prisF);
    const nyB = r0(nyeSelskaper[t] * b.enheterPerSelskap * b.pris * prisF);
    const nyF = prevF == null ? 0 : r0(Math.max(0, innF[t] - prevF));
    const tapF = prevF == null ? 0 : r0(Math.max(0, prevF - innF[t]));
    nyMrr.push(nyH + nyB + nyF); churnMrr.push(-(churnH + churnB + tapF)); netNyMrr.push(nyH + nyB + nyF - churnH - churnB - tapF);
    prevH = enhH[t]; prevS = selskaperB[t]; prevF = innF[t];
    kunder.huseier.push(r0(enhH[t])); kunder.bedrift.push(r1(selskaperB[t])); kunder.total.push(r0(enhH[t] + selskaperB[t] + (enhF[t] > 0 ? 1 : 0)));
    const c = kVar[t] + kSup[t] + kHost[t]; cogs.push(c);
    const g = grRolle[t];
    sm.push(kAnn[t] + kSalg[t] + kPart[t] + kMf[t] + g.sm); rd.push(kUtv[t] + g.rd); ga.push(kAndre[t] + g.ga + g.drift);
    brutto.push(r0(innT[t] - c)); bruttoPct.push(innT[t] > 0 ? Math.round(((innT[t] - c) / innT[t]) * 100) : null);
  }
  const arrStart = r0(mrr[0] * 12); const arrExitV = r0(mrr[N - 1] * 12);
  const cmgr = N > 1 && mrr[0] > 0 ? Math.round((Math.pow(mrr[N - 1] / mrr[0], 1 / (N - 1)) - 1) * 1000) / 10 : null;
  const netBurn = Math.max(0, -sum(resultat)); const netNyArr = r0((mrr[N - 1] - mrr[0]) * 12);
  const burnMultiple = netNyArr > 0 && netBurn > 0 ? Math.round((netBurn / netNyArr) * 10) / 10 : netBurn === 0 ? 0 : null;
  const sumCogs = sum(cogs); const bruttoMarginPct = sumInn > 0 ? Math.round(((sumInn - sumCogs) / sumInn) * 100) : null;
  // Blandet CAC-payback: S&M i perioden / (ny MRR i perioden × bruttomargin)
  const sumSm = sum(sm); const sumNyMrr = sum(nyMrr.map((v, i) => v - (i === 0 ? 0 : 0)));
  const bm = bruttoMarginPct != null ? bruttoMarginPct / 100 : 0.8;
  const cacPaybackBlended = sumNyMrr > 0 && sumSm > 0 ? Math.round((sumSm / (sumNyMrr * bm)) * 10) / 10 : null;
  // Rule of 40 (siste 12 mnd): ARR-vekst % + EBITDA-margin %
  const s12 = Math.max(0, N - 12); const inn12 = sum(innT.slice(s12)); const res12 = sum(resultat.slice(s12));
  const vekst12 = s12 >= 12 ? (mrr[s12 - 12] > 0 ? Math.round(((mrr[N - 1] - mrr[s12 - 12]) / mrr[s12 - 12]) * 100) : null) : (mrr[0] > 0 ? Math.round(((mrr[N - 1] - mrr[0]) / mrr[0]) * 100) : null);
  const margin12 = inn12 > 0 ? Math.round((res12 / inn12) * 100) : null;
  // Rule of 40 gir bare mening med et reelt MRR-grunnlag (skalerings­fase). Under
  // 50 000 kr/mnd i basis (≈ 600 k ARR) blir vekstprosenten meningsløs (500 %+) — da vises den ikke.
  const basisMrr = s12 >= 12 ? mrr[s12 - 12] : mrr[0];
  const ruleOf40 = vekst12 != null && margin12 != null && basisMrr >= 50000 ? vekst12 + margin12 : null;
  // Brutto inntektsretensjon (GRR) på årsbasis, vektet etter MRR-andel huseier/bedrift
  const wH = sumH + sumB > 0 ? sumH / (sumH + sumB) : 1;
  const grrPct = Math.round((wH * (1 - h.aarligChurnPct / 100) + (1 - wH) * (1 - b.aarligChurnPct / 100)) * 100);
  const saas = {
    mrr, nyMrr, churnMrr, netNyMrr, kunder, cogs, sm, rd, ga, brutto, bruttoPct,
    sammendrag: {
      arrStart, arrExit: arrExitV, cmgrPct: cmgr, netNyArr, netBurn: r0(netBurn), burnMultiple, bruttoMarginPct,
      cacPaybackBlended, ruleOf40, vekst12Pct: vekst12, margin12Pct: margin12, grrPct,
      sumCogs: r0(sumCogs), sumSm: r0(sumSm), sumRd: r0(sum(rd)), sumGa: r0(sum(ga)), sumBrutto: r0(sumInn - sumCogs),
      // S&M-sammensetning: annonsekjøp · performance-partner · fast markedsføring · salg bedrift
      sm: { annonser: r0(sum(kAnn)), partner: r0(sum(kPart)), markedsforing: r0(sum(kMf)), salg: r0(sum(kSalg)), grunnleggere: r0(sum(grRolle.map((g) => g.sm))), andelPct: sumInn > 0 ? Math.round((sumSm / sumInn) * 100) : null },
      grunnleggere: { sum: r0(sum(kGr)), rd: r0(sum(grRolle.map((g) => g.rd))), sm: r0(sum(grRolle.map((g) => g.sm))), ga: r0(sum(grRolle.map((g) => g.ga + g.drift))) },
      netNyMrrSnitt: r0(sum(netNyMrr) / N), kunderVedSlutt: { huseier: kunder.huseier[N - 1], bedrift: kunder.bedrift[N - 1] },
      // MRR-bro over perioden: start (mnd 1) → nye per kundegruppe → churn → prisjustering (år 2+) → slutt.
      // Bevegelsene summeres fra mnd 2, siden start-MRR allerede inneholder mnd 1. Residualen er
      // prisindeksen ved årsskiftene (og avrunding) — vist eksplisitt så broen alltid går opp.
      bro: (() => {
        const pf = (t) => Math.pow(1 + d.justering.prisIndeksPct / 100, Math.floor(t / 12));
        let nyHus = 0; let nyBed = 0; let nyLis = 0; let ch = 0;
        for (let t = 1; t < N; t++) {
          nyHus += r0(nyeH[t] * arpuH * pf(t)); nyBed += r0(nyeSelskaper[t] * b.enheterPerSelskap * b.pris * pf(t));
          nyLis += r0(Math.max(0, innF[t] - innF[t - 1])); ch += churnMrr[t];
        }
        const start = r0(mrr[0]); const slutt = r0(mrr[N - 1]);
        const pris = r0(slutt - start - nyHus - nyBed - nyLis - ch);
        return { start, nyHuseier: r0(nyHus), nyBedrift: r0(nyBed), nyLisens: r0(nyLis), churn: r0(ch), pris, slutt };
      })(),
    },
  };
  // Unit economics. Full CAC = anskaffelseskost (media / salg) + partnerhonorar per kunde
  // (% av abonnementet i partnerperioden, churn-justert). Fast partnerhonorar er fast S&M.
  const varPerEnhet = k.variabelPerEnhet + (k.supportTimerPer100 / 100) * k.timekost;
  const bidragH = arpuH - varPerEnhet;
  const levetidH = mChurnH > 0 ? 1 / mChurnH : null;
  const bidragBSelskap = b.enheterPerSelskap * (b.pris - varPerEnhet);
  const levetidB = mChurnB > 0 ? 1 / mChurnB : null;
  const paAndel = (pa.honorarPct / 100) * (pa.andelNyePct / 100);
  const partnerH = pa.paa && pa.gjelder.huseier ? r0(arpuH * paAndel * geomSum(1 - mChurnH, pa.varighetMnd)) : 0;
  const partnerB = pa.paa && pa.gjelder.bedrift ? r0(b.enheterPerSelskap * b.pris * paAndel * geomSum(1 - mChurnB, pa.varighetMnd)) : 0;
  const partnerF = pa.paa && pa.gjelder.forvaltning ? r0(f.pris * paAndel * (pa.varighetMnd > 0 ? pa.varighetMnd : 600)) : 0;
  const fullCacH = h.cacPerEnhet + partnerH;
  const fullCacB = b.salgskostPerSelskap + partnerB;
  const unit = {
    huseier: { arpu: r0(arpuH), bidrag: r0(bidragH), bruttoMarginPct: arpuH > 0 ? Math.round((bidragH / arpuH) * 100) : null, cac: h.cacPerEnhet, partner: partnerH, fullCac: r0(fullCacH), paybackMnd: bidragH > 0 && fullCacH > 0 ? r1(fullCacH / bidragH) : null, levetidMnd: levetidH ? r1(levetidH) : null, ltv: levetidH ? r0(bidragH * levetidH) : null, ltvCac: levetidH && fullCacH > 0 ? r1((bidragH * levetidH) / fullCacH) : null },
    forvaltning: { prisPerEnhet: f.pris, bidrag: r0(f.pris - varPerEnhet), bruttoMarginPct: f.pris > 0 ? Math.round(((f.pris - varPerEnhet) / f.pris) * 100) : null, partner: partnerF },
    bedrift: { prisPerEnhet: b.pris, arpuSelskap: r0(b.enheterPerSelskap * b.pris), bidragSelskap: r0(bidragBSelskap), cacSelskap: b.salgskostPerSelskap, partner: partnerB, fullCac: r0(fullCacB), paybackMnd: bidragBSelskap > 0 && fullCacB > 0 ? r1(fullCacB / bidragBSelskap) : null, levetidMnd: levetidB ? r1(levetidB) : null, ltvCac: levetidB && fullCacB > 0 ? r1((bidragBSelskap * levetidB) / fullCacB) : null },
    variabelPerEnhet: r0(varPerEnhet),
  };
  const aar = [];
  for (let a = 0; a * 12 < N; a++) {
    const fra = a * 12; const til = Math.min(N - 1, fra + 11);
    const del = (arr) => arr.slice(fra, til + 1).reduce((s, x) => s + (Number(x) || 0), 0);
    const innA = del(innT);
    const cogsA = del(cogs);
    aar.push({ nr: a + 1, fraIdx: fra, tilIdx: til, antallMnd: til - fra + 1, inntekt: r0(innA), huseier: r0(del(innH)), forvaltning: r0(del(innF)), bedrift: r0(del(innB)), kost: r0(del(kostSum)), resultat: r0(innA - del(kostSum)), marginPct: innA > 0 ? Math.round(((innA - del(kostSum)) / innA) * 100) : null, enheterSlutt: enhT[til] || 0, arrExit: r0((mrr[til] || 0) * 12),
      cogs: r0(cogsA), brutto: r0(innA - cogsA), bruttoPct: innA > 0 ? Math.round(((innA - cogsA) / innA) * 100) : null, sm: r0(del(sm)), smAnnonser: r0(del(kAnn)), smPartner: r0(del(kPart)), smMarkedsforing: r0(del(kMf)), smSalg: r0(del(kSalg)), rd: r0(del(rd)), ga: r0(del(ga)), netNyMrr: r0(del(netNyMrr)), kunderSlutt: kunder.total[til] || 0 });
  }
  return {
    N, drivere: d, fakta: fk,
    enheter: { huseier: enhH, forvaltning: enhF, bedrift: enhB, total: enhT }, nyeHuseier: nyeH, selskaperBedrift: selskaperB, nyeSelskaper,
    inntekt: { huseier: innH, forvaltning: innF, bedrift: innB, total: innT },
    kost: { utvikling: kUtv, hosting: kHost, variabel: kVar, support: kSup, annonser: kAnn, salg: kSalg, partner: kPart, markedsforing: kMf, andre: kAndre, grunnleggere: kGr },
    kostSum, resultat, akkumulert, aar, unit, saas,
    sammendrag: {
      sumInntekt: r0(sumInn), sumKost: r0(sumKost), resultat: r0(sumInn - sumKost),
      sumGrunnleggere: r0(sum(kGr)),
      partnerHale: r0(partnerHale), partnerHaleMnd,
      sumHuseier: r0(sumH), sumForvaltning: r0(sumF), sumBedrift: r0(sumB),
      andelForvaltningPct: sumInn > 0 ? Math.round((sumF / sumInn) * 100) : null,
      andelHuseierPct: sumInn > 0 ? Math.round((sumH / sumInn) * 100) : null,
      andelBedriftPct: sumInn > 0 ? Math.round((sumB / sumInn) * 100) : null,
      breakEvenIdx, kapitalbehov: r0(-kapBunn), kapitalbehovIdx: kapIdx,
      arrExit: r0((innT[N - 1] || 0) * 12),
      enheterVedSlutt: { huseier: r0(enhH[N - 1]), forvaltning: r0(enhF[N - 1]), bedrift: r0(enhB[N - 1]), total: r0(enhT[N - 1]) },
      faktaKilde: brukPlanFakta ? (fk.kilde || 'plan') : 'manuell',
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// KONSERN-SAMMENSTILLING — ett Digihome AS-budsjett + ett Tech-budsjett.
// Lisensen elimineres på BEGGE sider (Techs inntekt og Digihome AS' kostnad).
// Avvik mellom det Digihome AS budsjetterer i systemkost og Techs lisenspris
// rapporteres — det er et styringssignal, ikke noe som skjules.
// ═════════════════════════════════════════════════════════════════════════════
export function beregnKonsernSammenstilling({ forvaltning, tech, antallMnd, skatt = null, startYm = null }) {
  const N = Math.min(36, Math.max(1, r0(antallMnd) || 12));
  const sk = rensSkatt(skatt);
  const hent = (arr, t) => (Array.isArray(arr) && t < arr.length ? Number(arr[t]) || 0 : 0);
  const innF = [], innT = [], lisens = [], kostF = [], kostT = [], inntekt = [], kost = [], resultat = [], akk = [], resF = [], resT = [], avvik = [];
  let a = 0; let aF = 0; let aT = 0; const akkF = [], akkT = [];
  for (let t = 0; t < N; t++) {
    const iF = hent(forvaltning?.inntekt, t); const iT = hent(tech?.inntekt?.total, t); const li = hent(tech?.inntekt?.forvaltning, t);
    const kF = hent(forvaltning?.kostSum, t); const kT = hent(tech?.kostSum, t);
    const sysF = hent(forvaltning?.kost?.system, t);
    innF.push(iF); innT.push(iT); lisens.push(li); kostF.push(kF); kostT.push(kT);
    const inn = iF + iT - li; const ko = kF + kT - li;
    inntekt.push(r0(inn)); kost.push(r0(ko)); const r = inn - ko; resultat.push(r0(r)); a += r; akk.push(r0(a));
    resF.push(r0(iF - kF)); aF += iF - kF; akkF.push(r0(aF));
    resT.push(r0(iT - kT)); aT += iT - kT; akkT.push(r0(aT));
    avvik.push(r0(sysF - li));
  }
  const sum = (arr) => arr.reduce((s, x) => s + (Number(x) || 0), 0);
  const be = (res, inn) => { for (let t = 0; t < N; t++) if (res[t] >= 0 && inn[t] > 0) return t; return null; };
  const kap = (ak) => { let b = 0; let idx = null; ak.forEach((v, i) => { if (v < b) { b = v; idx = i; } }); return { kapitalbehov: r0(-b), idx }; };
  const kK = kap(akk); const kF2 = kap(akkF); const kT2 = kap(akkT);

  // ── Skatt: 22 % per KALENDERÅR og selskap, fremførbart underskudd, ev. konsernbidrag.
  //    Betales året etter (15. feb / 15. apr, 50/50). Måneder utenfor perioden → «etter perioden».
  //    Uten startYm brukes planår. Kun planens måneder inngår i grunnlaget (ikke historikk).
  const sats = sk.satsPct / 100;
  const ymDel = (() => { const m = /^(\d{4})-(\d{2})$/.exec(String(startYm || '')); return m ? { y: Number(m[1]), m0: Number(m[2]) - 1 } : null; })();
  const kalAar = (t) => (ymDel ? ymDel.y + Math.floor((ymDel.m0 + t) / 12) : Math.floor(t / 12) + 1);
  const idxFor = (aarNr, mnd0) => (ymDel ? (aarNr - ymDel.y) * 12 + mnd0 - ymDel.m0 : (aarNr - 1) * 12 + mnd0);
  const skattBetalt = Array(N).fill(0);
  const perAar = []; let fremF = 0; let fremT = 0; let fremK = 0; let etterPeriode = 0; let sumBeregnet = 0;
  if (sk.paa) {
    const aarene = [...new Set(Array.from({ length: N }, (_, t) => kalAar(t)))];
    for (const y of aarene) {
      const idx = Array.from({ length: N }, (_, t) => t).filter((t) => kalAar(t) === y);
      const rF = idx.reduce((a2, t) => a2 + resF[t], 0); const rT = idx.reduce((a2, t) => a2 + resT[t], 0);
      const trekk = (res, frem) => { if (res <= 0) return { grunnlag: 0, frem: frem - res }; const brukt = Math.min(frem, res); return { grunnlag: res - brukt, frem: frem - brukt }; };
      let gF = 0; let gT = 0; let sF = 0; let sT = 0;
      if (sk.konsernbidrag) {
        const k2 = trekk(rF + rT, fremK); fremK = k2.frem; gF = k2.grunnlag; sF = r0(gF * sats);
      } else {
        const f2 = trekk(rF, fremF); fremF = f2.frem; gF = f2.grunnlag; sF = r0(gF * sats);
        const t2 = trekk(rT, fremT); fremT = t2.frem; gT = t2.grunnlag; sT = r0(gT * sats);
      }
      const sumS = sF + sT; sumBeregnet += sumS;
      // Betaling året etter: feb (mnd 1) og apr (mnd 3)
      for (const m0 of [1, 3]) {
        const ti = idxFor(y + 1, m0);
        if (ti >= 0 && ti < N) skattBetalt[ti] += r0(sumS / 2); else etterPeriode += r0(sumS / 2);
      }
      perAar.push({ aar: y, mnd: idx.length, resultatF: r0(rF), resultatT: r0(rT), grunnlagF: r0(gF), grunnlagT: r0(gT), skattF: sF, skattT: sT, sum: sumS });
    }
  }
  const kontantRes = resultat.map((r, t) => r0(r - skattBetalt[t]));
  const kontantAkk = []; let ka = 0; for (let t = 0; t < N; t++) { ka += kontantRes[t]; kontantAkk.push(r0(ka)); }
  const kKont = kap(kontantAkk);
  const skattUt = { paa: sk.paa, satsPct: sk.satsPct, konsernbidrag: sk.konsernbidrag, perAar, betalt: skattBetalt, sumBeregnet: r0(sumBeregnet), sumBetalt: r0(skattBetalt.reduce((a2, x) => a2 + x, 0)), etterPeriode: r0(etterPeriode), fremforbart: { digihome: r0(fremF), tech: r0(fremT), konsern: r0(fremK) } };
  const aar = [];
  for (let y = 0; y * 12 < N; y++) {
    const fra = y * 12; const til = Math.min(N - 1, fra + 11);
    const del = (arr) => arr.slice(fra, til + 1).reduce((s, x) => s + (Number(x) || 0), 0);
    aar.push({ nr: y + 1, fraIdx: fra, tilIdx: til, inntekt: r0(del(inntekt)), kost: r0(del(kost)), resultat: r0(del(resultat)), eliminert: r0(del(lisens)), digihome: { inntekt: r0(del(innF)), kost: r0(del(kostF)), resultat: r0(del(resF)) }, tech: { inntekt: r0(del(innT)), kost: r0(del(kostT)), resultat: r0(del(resT)) } });
  }
  const sumInn = sum(inntekt); const sumKost = sum(kost); const sumLis = sum(lisens);
  return {
    N, inntekt, kost, resultat, akkumulert: akk, lisens, avvik, aar,
    digihome: { inntekt: innF, kost: kostF, resultat: resF, akkumulert: akkF, breakEvenIdx: be(resF, innF), ...kF2 },
    tech: { inntekt: innT, kost: kostT, resultat: resT, akkumulert: akkT, breakEvenIdx: be(resT, innT), ...kT2 },
    skatt: skattUt,
    // Kontantstrøm etter betalt skatt — det reelle kapitalbehovet når skatt er på
    kontant: { resultat: kontantRes, akkumulert: kontantAkk, kapitalbehov: kKont.kapitalbehov, kapitalbehovIdx: kKont.idx, resultatEtterSkatt: r0(sumInn - sumKost - sumBeregnet) },
    sammendrag: {
      sumInntekt: r0(sumInn), sumKost: r0(sumKost), resultat: r0(sumInn - sumKost), eliminert: r0(sumLis), avvikSum: r0(sum(avvik)),
      skatt: r0(sumBeregnet), resultatEtterSkatt: r0(sumInn - sumKost - sumBeregnet), skattEtterPeriode: r0(etterPeriode),
      kapitalbehovEtterSkatt: kKont.kapitalbehov, kapitalbehovEtterSkattIdx: kKont.idx,
      breakEvenIdx: be(resultat, inntekt), kapitalbehov: kK.kapitalbehov, kapitalbehovIdx: kK.idx,
      arrExit: r0((inntekt[N - 1] || 0) * 12),
      andelTechEksternPct: sumInn > 0 ? Math.round(((sum(innT) - sumLis) / sumInn) * 100) : null,
    },
  };
}
