// Avstemming av Base-planene mot rådgiverens tabeller. Kjør: node scripts/avstem-base.mjs <adminKey>
import * as M from '/tmp/modell.mjs';
const K = process.argv[2]; const B = 'http://localhost:3000/api';
const j = async (r) => r.json();
const kr = (n) => (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + ' m' : Math.round(n / 1000) + ' k');
(async () => {
  const liste = await j(await fetch(`${B}/admin/budsjett/planer?key=${K}`));
  const dhL = liste.planer.find((p) => p.navn.startsWith('Base 2026–2029 · Digihome AS'));
  const tL = liste.planer.find((p) => p.navn.startsWith('Base 2026–2029 · Digihome Tech'));
  const dh = await j(await fetch(`${B}/admin/budsjett/plan?id=${dhL.id}&key=${K}`));
  const te = await j(await fetch(`${B}/admin/budsjett/plan?id=${tL.id}&key=${K}`));
  const P = dh.plan || dh; const T = te.plan || te;
  const m = M.beregnInvestorModell({ antallMnd: P.antallMnd, startYm: P.startYm, drivere: P.drivere, fakta: P.fakta });
  const t = M.beregnTech({ antallMnd: T.antallMnd, drivere: T.tech, fakta: T.fakta });
  const k = M.beregnKonsernSammenstilling({ forvaltning: m, tech: t, antallMnd: P.antallMnd, skatt: m.drivere.skatt, startYm: P.startYm });
  const N = P.antallMnd; const sum = (a, i0, i1) => a.slice(i0, i1).reduce((s, x) => s + x, 0);
  // kalenderår: 2026 = idx 0..4 (aug–des), 2027 = 5..16, 2028 = 17..28, 2029 = 29..35
  const aar = [['2026*', 0, 5], ['2027', 5, 17], ['2028', 17, 29], ['2029*', 29, 36], ['Sum', 0, 36]];
  const rad = (navn, serie) => console.log(navn.padEnd(30), aar.map(([, a, b]) => kr(sum(serie, a, b)).padStart(9)).join(' '));
  console.log('\n== DIGIHOME AS ==', ' '.repeat(10), aar.map(([n]) => n.padStart(9)).join(' '));
  rad('Inntekter', m.inntekt);
  rad('Lisens til Tech (system)', m.kost.system);
  rad('Operativ bemanning', m.kost.bemanning);
  rad('Founder-lønn AS-andel', m.kost.grunnleggere);
  rad('Admin', m.kost.admin);
  rad('Media-CAC', m.kost.provisjon);
  rad('Performance-honorar', m.kost.partner);
  rad('Resultat AS', m.resultat);
  console.log('Enheter: start', m.enheter[0], '→ slutt', Math.round(m.enheter[N - 1]), '· nye signert', Math.round(m.nyePerMndSerie.reduce((a, b) => a + b, 0)), '· honorar ny enhet', m.cac.bruttoHonorarNy, '· hale', m.sammendrag.partnerHale, 'kr /', m.sammendrag.partnerHaleMnd, 'mnd');
  console.log('\n== TECH ==');
  rad('Lisensinntekt fra AS', t.inntekt.forvaltning);
  rad('Utvikling (Fable)', t.kost.utvikling);
  rad('Hosting', t.kost.hosting);
  rad('Variabel (AI/BankID m.m.)', t.kost.variabel);
  rad('Andre faste', t.kost.andre);
  rad('Founder-lønn Tech-andel', t.kost.grunnleggere);
  rad('Sum kostnader Tech', t.kostSum);
  rad('Resultat Tech', t.resultat);
  console.log('\n== KONSERN ==');
  rad('Inntekt eksterne kunder', k.inntekt);
  rad('Resultat før skatt', k.resultat);
  rad('Skatt betalt', k.skatt.betalt);
  rad('Resultat etter betalt skatt', k.kontant.resultat);
  console.log('Break-even konsern (mnd idx):', k.sammendrag.breakEvenIdx, '→', k.sammendrag.breakEvenIdx != null ? M.ymPluss ? '' : '' : '', 'Kapitalbehov før skatt', kr(k.sammendrag.kapitalbehov), 'idx', k.sammendrag.kapitalbehovIdx, '· etter skatt', kr(k.sammendrag.kapitalbehovEtterSkatt), 'idx', k.sammendrag.kapitalbehovEtterSkattIdx);
  console.log('Skatt per år:', k.skatt.perAar.map((a) => `${a.aar}: DH ${kr(a.resultatF)} / Tech ${kr(a.resultatT)} → skatt ${kr(a.sum)}`).join(' | '), '· etter perioden', kr(k.skatt.etterPeriode), '· fremførbart Tech', kr(k.skatt.fremforbart.tech));
  console.log('Resultat etter skatt (periode):', kr(k.sammendrag.resultatEtterSkatt), '· lisens eliminert', kr(k.sammendrag.eliminert), '· avvik', k.sammendrag.avvikSum);
  // CAC-sensitivitet
  console.log('\n== CAC-sensitivitet (media-CAC → kapitalbehov før skatt / resultat før skatt 36 mnd) ==');
  for (const cac of [4000, 5000, 6000, 8000, 10000]) {
    const m2 = M.beregnInvestorModell({ antallMnd: N, startYm: P.startYm, drivere: { ...P.drivere, provisjonPerNyEnhet: cac }, fakta: P.fakta });
    const k2 = M.beregnKonsernSammenstilling({ forvaltning: m2, tech: t, antallMnd: N, skatt: null, startYm: P.startYm });
    console.log(String(cac).padStart(6), kr(k2.sammendrag.kapitalbehov).padStart(8), kr(k2.sammendrag.resultat).padStart(8));
  }
})();
