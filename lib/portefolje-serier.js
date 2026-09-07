// ---------------------------------------------------------------------------
// PORTEFØLJESERIER — rene månedsserier fra Leieforhold-radene (plattformens
// 1:1-eksport). Brukes av budsjett (fakta-laget), investormodell, deck og
// selskapsøkonomien (plattformlisens = enheter × pris). Ingen DB, ingen
// avhengigheter — kan importeres fra hvor som helst uten sirkler.
// ---------------------------------------------------------------------------
const r0 = (x) => Math.round(Number(x) || 0);

// Kontraktsfestet honorar per måned: utleide (alltid inne), signerte/frem-
// tidige fra innflyttingsmåneden, og kjente utflyttinger telles t.o.m.
// utflyttingsmåneden. Pipeline uten dato regnes fra inneværende måned.
// Enheter med signert leiekontrakt men uten registrert forvaltningsavtale
// estimeres med porteføljens snittsats (konsistent med honorar-trappen).
export function beregnSikretSerie(rows = [], year, antallMnd = 12) {
  const naa = new Date();
  const naaYm = naa.getUTCFullYear() * 12 + naa.getUTCMonth();
  // Snittsats fra utleide enheter som faktisk bærer honorar
  const medFee = rows.filter((r) => r.group === 'leased' && r.fee_amount > 0 && r.monthly_rent > 0);
  const leieMedFee = medFee.reduce((s, r) => s + r.monthly_rent, 0);
  const snittSats = leieMedFee > 0 ? medFee.reduce((s, r) => s + r.fee_amount, 0) / leieMedFee : 0;
  const serie = Array(antallMnd).fill(0);
  for (const r of rows) {
    if (!['leased', 'future', 'signing'].includes(r.group)) continue;
    const honorar = r.fee_amount > 0 ? r.fee_amount
      : r.pending_fee_fixed > 0 ? Math.round(r.pending_fee_fixed)
      : r.pending_fee_percent > 0 ? Math.round((r.monthly_rent || 0) * (r.pending_fee_percent / 100))
      : Math.round((r.monthly_rent || 0) * snittSats);
    if (!(honorar > 0)) continue;
    const inn = r.move_in_date ? new Date(`${r.move_in_date}T12:00:00Z`) : null;
    const ut = r.move_out_date ? new Date(`${r.move_out_date}T12:00:00Z`) : null;
    const fraYm = inn && !isNaN(inn)
      ? inn.getUTCFullYear() * 12 + inn.getUTCMonth()
      : (r.group === 'leased' ? -Infinity : naaYm);
    const tilYm = ut && !isNaN(ut) ? ut.getUTCFullYear() * 12 + ut.getUTCMonth() : Infinity;
    for (let m = 0; m < antallMnd; m++) {
      const ym = (year + Math.floor(m / 12)) * 12 + (m % 12);
      if (ym >= fraYm && ym <= tilYm) serie[m] += honorar;
    }
  }
  return serie.map(r0);
}

// BORTFALL per måned: honorar fra kontrakter med KJENT utflyttingsdato, lagt
// i måneden ETTER siste kontraktsmåned (sikret-serien teller t.o.m. utflytt-
// ingsmåneden). Serien er punktvis (hendelser) og brukes av investormodellens
// re-utleie-lag: boligen forvaltes videre etter kontraktslutt, så honoraret
// antas gjenopptatt etter et justerbart ledighetsgap — kun huseier-frafall er
// reell churn (dekkes av churn-driveren).
export function beregnBortfallSerie(rows = [], year, antallMnd = 12) {
  const medFee = rows.filter((r) => r.group === 'leased' && r.fee_amount > 0 && r.monthly_rent > 0);
  const leieMedFee = medFee.reduce((s, r) => s + r.monthly_rent, 0);
  const snittSats = leieMedFee > 0 ? medFee.reduce((s, r) => s + r.fee_amount, 0) / leieMedFee : 0;
  const serie = Array(antallMnd).fill(0);
  for (const r of rows) {
    if (!['leased', 'future', 'signing'].includes(r.group)) continue;
    const ut = r.move_out_date ? new Date(`${r.move_out_date}T12:00:00Z`) : null;
    if (!ut || isNaN(ut)) continue;
    const honorar = r.fee_amount > 0 ? r.fee_amount
      : r.pending_fee_fixed > 0 ? Math.round(r.pending_fee_fixed)
      : r.pending_fee_percent > 0 ? Math.round((r.monthly_rent || 0) * (r.pending_fee_percent / 100))
      : Math.round((r.monthly_rent || 0) * snittSats);
    if (!(honorar > 0)) continue;
    // Bortfallet skjer måneden ETTER utflyttingsmåneden
    const bortYm = ut.getUTCFullYear() * 12 + ut.getUTCMonth() + 1;
    const idx = bortYm - year * 12;
    if (idx >= 0 && idx < antallMnd) serie[idx] += honorar;
  }
  return serie.map(r0);
}

// Enheter UNDER FORVALTNING per måned: utleide og ledige teller hele veien
// (ledige enheter forvaltes selv om de står tomme), signerte/fremtidige fra
// innflyttingsmåneden, kjente utflyttinger t.o.m. utflyttingsmåneden.
// NB: leiekontraktens slutt churner IKKE forvaltningskunden.
export function beregnEnhetsSerie(rows = [], year, antallMnd = 12) {
  const naa = new Date();
  const naaYm = naa.getUTCFullYear() * 12 + naa.getUTCMonth();
  const serie = Array(antallMnd).fill(0);
  for (const r of rows) {
    if (!['leased', 'future', 'signing', 'vacant'].includes(r.group)) continue;
    const inn = r.move_in_date ? new Date(`${r.move_in_date}T12:00:00Z`) : null;
    const ut = r.move_out_date ? new Date(`${r.move_out_date}T12:00:00Z`) : null;
    const fraYm = (r.group === 'leased' || r.group === 'vacant') ? -Infinity
      : inn && !isNaN(inn) ? inn.getUTCFullYear() * 12 + inn.getUTCMonth() : naaYm;
    const tilYm = ut && !isNaN(ut) ? ut.getUTCFullYear() * 12 + ut.getUTCMonth() : Infinity;
    for (let m = 0; m < antallMnd; m++) {
      const ym = (year + Math.floor(m / 12)) * 12 + (m % 12);
      if (ym >= fraYm && ym <= tilYm) serie[m] += 1;
    }
  }
  return serie;
}
