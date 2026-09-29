// Enhetstest: selvbetjente enheter — grunnlag 'leieforhold', prøveperiode, dvale, minne.
// Kjør: node _perf/test_selvbetjent.mjs
import { beregnGrunnlag } from '../lib/pris.js';

let pass = 0; let fail = 0;
const ok = (navn, a, b) => { const eq = JSON.stringify(a) === JSON.stringify(b); if (eq) pass += 1; else { fail += 1; console.log('FAIL', navn, '\n  fikk    ', JSON.stringify(a), '\n  ventet  ', JSON.stringify(b)); } };
const nær = (navn, a, b, eps = 0.011) => { if (Math.abs(a - b) <= eps) pass += 1; else { fail += 1; console.log('FAIL', navn, 'fikk', a, 'ventet', b); } };

const settings = { mvaSats: 25, produktnavn: 'Plattformlisens' };
const planStd = { id: 'p', navn: 'Forvalter', prisModell: 'blandet', trinn: [{ fraEnheter: 0, pris: 200 }], trinnModell: 'progressiv', selvbetjentPris: 79, minstepris: 0, ledigFaktor: 100, romModell: 'rom', romFaktor: 100, selvbetjentGrunnlag: 'leieforhold', selvbetjentProveDager: 30, selvbetjentDvaleDager: 90 };
const planPerType = { ...planStd, prisModell: 'per_type' };
const kunde = { id: 'k', navn: 'K', enhetskilde: 'plattform', grunnlag: 'alle', grunnlagSelvbetjent: 'alle', prorata: true, status: 'aktiv' };

const forv = (id, ekstra = {}) => ({ enhet_id: id, address: `F ${id}`, service_level: 'Full forvaltning', income_type: 'actual', group: 'leased', tenant_name: 'T', move_in_date: '2026-01-01', forvaltning_status: 'active', forvaltning_start: '2026-01-01', ...ekstra });
const selv = (id, ekstra = {}) => ({ enhet_id: id, address: `S ${id}`, service_level: 'Selvbetjening', income_type: 'actual', group: 'leased', tenant_name: 'T', move_in_date: '2026-01-01', ...ekstra });
const ledigSelv = (id, ekstra = {}) => ({ enhet_id: id, address: `S ${id}`, service_level: 'Selvbetjening', income_type: 'estimate', group: 'vacant', tenant_name: '', move_in_date: '', ...ekstra });

// 1) Selvbetjent test-enhet uten leietaker → 0 kr, men telles som registrert
{
  const g = beregnGrunnlag([forv('f1'), ledigSelv('s1')], planStd, kunde, settings, '2026-08');
  ok('1 antall', g.antallEnheter, 1);
  ok('1 sum', g.sumEksMva, 200);
  ok('1 selv', g.sammendrag.selvbetjent, { registrert: 1, medLeieforhold: 0, prove: 0, dvale: 0, fakturert: 0, forRegistrering: 0, regel: 'leieforhold', proveDager: 30, dvaleDager: 90 });
}
// 2) Selvbetjent med leietaker siden januar → full enhet (prøve utløpt)
{
  const g = beregnGrunnlag([selv('s1')], planStd, kunde, settings, '2026-08');
  ok('2 antall', g.antallEnheter, 1); ok('2 sum', g.sumEksMva, 200);
  ok('2 selv', g.sammendrag.selvbetjent.fakturert, 1);
}
// 3) Prøveperiode: innflytting 15. aug, 30 dager prøve → aug: 0 dager fakturert
{
  const g = beregnGrunnlag([selv('s1', { move_in_date: '2026-08-15' })], planStd, kunde, settings, '2026-08');
  ok('3 sum aug', g.sumEksMva, 0);
  ok('3 stat', [g.sammendrag.selvbetjent.medLeieforhold, g.sammendrag.selvbetjent.prove, g.sammendrag.selvbetjent.fakturert], [1, 1, 0]);
  // sep: prøve varer til 13. sep (15.8 + 29 dager) → 17 av 30 dager fakturert
  const s = beregnGrunnlag([selv('s1', { move_in_date: '2026-08-15' })], planStd, kunde, settings, '2026-09');
  nær('3 vekt sep', s.linjer[0].vekt, 17 / 30);
  ok('3 sum sep', s.sumEksMva, Math.round(Math.round(17 / 30 * 100) / 100 * 200)); // vekt rundes til 2 des. før prising
  ok('3 prøvedager sep', s.linjer[0].enheter[0].dagerProve, 13);
  // okt: full
  const o = beregnGrunnlag([selv('s1', { move_in_date: '2026-08-15' })], planStd, kunde, settings, '2026-10');
  ok('3 sum okt', o.sumEksMva, 200);
}
// 4) Prøve 0 dager → fakturert fra dag én (prorata)
{
  const g = beregnGrunnlag([selv('s1', { move_in_date: '2026-08-15' })], { ...planStd, selvbetjentProveDager: 0 }, kunde, settings, '2026-08');
  nær('4 vekt', g.linjer[0].vekt, 17 / 31);
}
// 5) Minne: leietakerbytte gir IKKE ny prøve (første innflytting husket)
{
  const minne = new Map([['s1', { enhet_id: 's1', forsteInnflytting: '2025-03-01', forstSett: '2025-03-01' }]]);
  const g = beregnGrunnlag([selv('s1', { move_in_date: '2026-08-15' })], planStd, kunde, settings, '2026-08', { minne });
  nær('5 vekt m/ minne', g.linjer[0].vekt, 17 / 31);
  ok('5 prove', g.sammendrag.selvbetjent.prove, 0);
}
// 6) Dvale: 'kunde'-regel (alle) — ledig selvbetjent teller som ledig… med mindre dvale
{
  const planKunde = { ...planStd, selvbetjentGrunnlag: 'kunde' };
  const g0 = beregnGrunnlag([ledigSelv('s1')], planKunde, kunde, settings, '2026-08');
  ok('6 uten minne teller ledig', [g0.antallEnheter, g0.sumEksMva], [1, 200]);
  const minneFersk = new Map([['s1', { enhet_id: 's1', forstSett: '2026-07-01' }]]);
  const g1 = beregnGrunnlag([ledigSelv('s1')], planKunde, kunde, settings, '2026-08', { minne: minneFersk });
  ok('6 fersk (61 d) ikke dvale', [g1.antallEnheter, g1.sammendrag.selvbetjent.dvale], [1, 0]);
  const minneGammel = new Map([['s1', { enhet_id: 's1', forstSett: '2026-04-01' }]]);
  const g2 = beregnGrunnlag([ledigSelv('s1')], planKunde, kunde, settings, '2026-08', { minne: minneGammel });
  ok('6 gammel (152 d) dvale', [g2.antallEnheter, g2.sumEksMva, g2.sammendrag.selvbetjent.dvale], [0, 0, 1]);
  // sist utleid nylig → ikke dvale
  const minneNyligUtleid = new Map([['s1', { enhet_id: 's1', forstSett: '2026-01-01', sistUtleid: '2026-07-20' }]]);
  const g3 = beregnGrunnlag([ledigSelv('s1')], planKunde, kunde, settings, '2026-08', { minne: minneNyligUtleid });
  ok('6 nylig utleid ikke dvale', g3.sammendrag.selvbetjent.dvale, 0);
  // dvale av (0) → aldri
  const g4 = beregnGrunnlag([ledigSelv('s1')], { ...planKunde, selvbetjentDvaleDager: 0 }, kunde, settings, '2026-08', { minne: minneGammel });
  ok('6 dvale av', g4.antallEnheter, 1);
}
// 7) 'leieforhold'-regel ignorerer kundens prorata=false (alltid prorata)
{
  const g = beregnGrunnlag([selv('s1', { move_in_date: '2026-08-15' })], { ...planStd, selvbetjentProveDager: 0 }, { ...kunde, prorata: false }, settings, '2026-08');
  nær('7 alltid prorata', g.linjer[0].vekt, 17 / 31);
  // forvaltet følger kundens prorata=false → hel enhet
  const f = beregnGrunnlag([forv('f1', { move_in_date: '2026-08-15', forvaltning_start: '2026-08-15' })], planStd, { ...kunde, prorata: false }, settings, '2026-08');
  ok('7 forvaltet uten prorata', f.linjer[0].vekt, 1);
}
// 8) per_type: selvbetjent til 79 kr, prøve trekkes
{
  const g = beregnGrunnlag([forv('f1'), selv('s1'), selv('s2', { move_in_date: '2026-08-15' }), ledigSelv('s3')], planPerType, kunde, settings, '2026-08');
  ok('8 linjer', g.linjer.map((l) => [l.type, l.belop]), [['forvaltet', 200], ['selvbetjent', 79]]);
  ok('8 selv', g.sammendrag.selvbetjent, { registrert: 3, medLeieforhold: 2, prove: 1, dvale: 0, fakturert: 1, forRegistrering: 0, regel: 'leieforhold', proveDager: 30, dvaleDager: 90 });
  ok('8 antall', g.antallEnheter, 2);
}
// 9) Blandet: forvaltet + selvbetjent under samme trinn, progressivt over 49
{
  const rows = [...Array.from({ length: 48 }, (_, i) => forv(`f${i}`)), selv('s1'), selv('s2')];
  const g = beregnGrunnlag(rows, { ...planStd, trinn: [{ fraEnheter: 0, pris: 200 }, { fraEnheter: 50, pris: 150 }] }, kunde, settings, '2026-08');
  ok('9 segmenter', g.linjer.map((l) => [l.vekt, l.pris, l.belop]), [[49, 200, 9800], [1, 150, 150]]);
  ok('9 antall', g.antallEnheter, 50);
  ok('9 selv fakturert', g.sammendrag.selvbetjent.fakturert, 2);
}
// 10) Modell-snapshot inneholder selvbetjent-reglene
{
  const g = beregnGrunnlag([selv('s1')], planStd, kunde, settings, '2026-08');
  ok('10 modell', [g.modell.selvbetjentGrunnlag, g.modell.selvbetjentProveDager, g.modell.selvbetjentDvaleDager], ['leieforhold', 30, 90]);
}
// 11) Rom i bofellesskap, selvbetjent, prøve: 'bolig'-modell
{
  const rom = (n, inn) => selv(`b1:rom-${n}`, { unit_type: 'Rom i bofellesskap', unit_room: `Rom ${n}`, move_in_date: inn });
  const g = beregnGrunnlag([rom(1, '2026-01-01'), rom(2, '2026-01-01'), rom(3, '2026-08-15')], { ...planStd, romModell: 'bolig' }, kunde, settings, '2026-08');
  // 3 rom: to hele (1.0), ett i prøve (0) → andel 2/3
  ok('11 én enhet', g.antallEnheter, 1);
  nær('11 vekt', g.linjer[0].vekt, 2 / 3);
}
// 12) Ingen selvbetjente → sammendrag.selvbetjent null
{
  const g = beregnGrunnlag([forv('f1')], planStd, kunde, settings, '2026-08');
  ok('12 null', g.sammendrag.selvbetjent, null);
}
// 13) Inaktiv kunde → tomt
{
  const g = beregnGrunnlag([selv('s1')], planStd, { ...kunde, status: 'inaktiv' }, settings, '2026-08');
  ok('13 inaktiv', [g.antallEnheter, g.inaktiv], [0, true]);
}

// 14) Regresjon forvaltet: 'alle' m/ ledig (ledigFaktor 50), delvis prorata, utleid_mnd, minstepris
{
  const ledigForv = (id) => forv(id, { income_type: 'estimate', group: 'vacant', tenant_name: '', move_in_date: '' });
  const g = beregnGrunnlag([forv('f1'), ledigForv('f2')], { ...planStd, ledigFaktor: 50 }, kunde, settings, '2026-08');
  ok('14 alle+ledig50', [g.antallEnheter, g.linjer[0].vekt, g.sumEksMva], [2, 1.5, 300]);
  const d = beregnGrunnlag([forv('f1', { move_out_date: '2026-08-10' })], planStd, kunde, settings, '2026-08');
  // utleid 1.–10. (10 d), under forvaltning hele måneden → vU 10/31, vL 21/31, ledigFaktor 100 → vekt 1
  ok('14 delvis alle', [d.linjer[0].enheter[0].status, d.linjer[0].vekt], ['delvis', 1]);
  const u = beregnGrunnlag([forv('f1', { move_out_date: '2026-08-10' }), ledigForv('f2')], planStd, { ...kunde, grunnlag: 'utleid_mnd' }, settings, '2026-08');
  nær('14 utleid_mnd prorata', u.linjer[0].vekt, 10 / 31);
  ok('14 utleid_mnd antall', u.antallEnheter, 1);
  const m = beregnGrunnlag([forv('f1')], { ...planStd, minstepris: 990 }, kunde, settings, '2026-08');
  ok('14 minstepris', [m.sumEksMva, m.linjer.at(-1).type], [990, 'minstepris']);
}

// 15) REGISTRERING PÅ PLATTFORMEN: enhet lagt inn i september med leietaker siden 2021
{
  const gammelLeietaker = selv('s1', { move_in_date: '2021-03-01', registrert: '2026-09-10' });
  // August: fantes ikke → telles ikke, verken i antall eller stats.fakturert
  const aug = beregnGrunnlag([gammelLeietaker], planStd, kunde, settings, '2026-08');
  ok('15 aug antall', aug.antallEnheter, 0);
  ok('15 aug sum', aug.sumEksMva, 0);
  ok('15 aug forRegistrering', aug.sammendrag?.selvbetjent?.forRegistrering ?? null, 1);
  // September: registrert 10.9 → 21 utleide dager, men prøven (30 d) starter 10.9 → alt gratis
  const sep = beregnGrunnlag([gammelLeietaker], planStd, kunde, settings, '2026-09');
  ok('15 sep sum', sep.sumEksMva, 0);
  ok('15 sep stats', [sep.sammendrag.selvbetjent.medLeieforhold, sep.sammendrag.selvbetjent.prove, sep.sammendrag.selvbetjent.fakturert], [1, 1, 0]);
  // Oktober: prøve til 9.10 → 22 av 31 dager fakturert
  const okt = beregnGrunnlag([gammelLeietaker], planStd, kunde, settings, '2026-10');
  nær('15 okt vekt', okt.linjer[0].vekt, 22 / 31);
  ok('15 okt ny-flagg', okt.linjer[0].enheter[0].nyIMaaneden, false);
  ok('15 okt registrert', okt.linjer[0].enheter[0].registrert, '2026-09-10');
  // Uten prøve: september = 21/30
  const sepUtenProve = beregnGrunnlag([gammelLeietaker], { ...planStd, selvbetjentProveDager: 0 }, kunde, settings, '2026-09');
  nær('15 sep u/prøve', sepUtenProve.linjer[0].vekt, 21 / 30);
  ok('15 sep ny-flagg', sepUtenProve.linjer[0].enheter[0].nyIMaaneden, true);
  ok('15 sep nye', sepUtenProve.sammendrag.nye, 1);
}
// 16) Registrering gjelder også FORVALTEDE enheter (grunnlag 'alle'): lagt inn 20.8 → aug 12/31
{
  const f = forv('f1', { move_in_date: '2024-01-01', forvaltning_start: '2024-01-01', registrert: '2026-08-20' });
  const aug = beregnGrunnlag([f], planStd, kunde, settings, '2026-08');
  nær('16 aug vekt', aug.linjer[0].vekt, 12 / 31);
  ok('16 aug nye', aug.sammendrag.nye, 1);
  const jul = beregnGrunnlag([f], planStd, kunde, settings, '2026-07');
  ok('16 jul ikke med', [jul.antallEnheter, jul.sammendrag?.forRegistrering ?? null], [0, null]);
  // uten prorata: registrert i måneden → hel enhet (kundens valg)
  const augU = beregnGrunnlag([f], planStd, { ...kunde, prorata: false }, settings, '2026-08');
  ok('16 aug u/prorata', augU.linjer[0].vekt, 1);
}
// 17) Registrert-dato fra minnet når raden mangler den
{
  const minne = new Map([['s1', { enhet_id: 's1', registrert: '2026-09-10', forsteInnflytting: '2021-03-01' }]]);
  const aug = beregnGrunnlag([selv('s1', { move_in_date: '2021-03-01' })], planStd, kunde, settings, '2026-08', { minne });
  ok('17 aug via minne', aug.antallEnheter, 0);
}
// 18) Bofellesskap 'bolig': rom registrert i ulike måneder → bare eksisterende rom teller
{
  const rom = (n, reg) => forv(`b1:rom-${n}`, { unit_type: 'Rom i bofellesskap', unit_room: `Rom ${n}`, move_in_date: '2025-01-01', forvaltning_start: '2025-01-01', registrert: reg });
  const g = beregnGrunnlag([rom(1, '2026-01-01'), rom(2, '2026-01-01'), rom(3, '2026-09-15')], { ...planStd, romModell: 'bolig' }, kunde, settings, '2026-08');
  ok('18 aug bolig', [g.antallEnheter, g.linjer[0].enheter[0].rom], [1, 2]);
}

console.log(`${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
