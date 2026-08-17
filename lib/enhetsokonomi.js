// ─────────────────────────────────────────────────────────────────────────────
// ENHETSØKONOMI — datalag. Kombinerer:
//   · FAKTISK porteføljeøkonomi (benchmark) fra datarom_enheter (speiler
//     Leieforhold-porteføljen via auto-synk): vektet honorar, snittleie og
//     faktisk inntekt per enhet — VEKTET (sum honorar ÷ sum leie), ikke
//     aritmetisk snitt av satser, slik at små enheter ikke skjevvrir bildet.
//   · MODELLERBARE antakelser for en NY enhet (drivere) — lagres i
//     finance_settings og er kilden budsjett/investormodellen kan arve fra.
// Arkitektur: Actuals → Benchmark → Modell.
// ─────────────────────────────────────────────────────────────────────────────
import { listEnheter } from './datarom';
import { rensEoDrivere } from './enhetsokonomi-modell';

export const EO_SETTINGS_ID = 'enhetsokonomi_drivere';

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const r0 = (v) => Math.round(n(v));
const r1 = (v) => Math.round(n(v) * 10) / 10;

/* Faktisk porteføljeøkonomi fra aktive (utleide) enheter.
   honorar-feltet er ALLTID eks. mva (samme konvensjon som Leieforhold);
   vektet sats presenteres BÅDE eks. mva og som inkl. mva-ekvivalent slik at
   den kan sammenlignes direkte med modelldriverens honorarsats (inkl. mva). */
export function beregnPortefoljeOkonomi(drift = [], oppdatertAt = null) {
  const utleide = drift.filter((e) => e.status === 'utleid');
  const medLeie = utleide.filter((e) => n(e.leie) > 0);
  const sumLeie = medLeie.reduce((s, e) => s + n(e.leie), 0);
  const sumHonorar = utleide.reduce((s, e) => s + n(e.honorar), 0); // eks. mva
  const antall = utleide.length;
  return {
    antallAktive: antall,
    antallTotalt: drift.length,
    sumLeie: r0(sumLeie),
    sumHonorar: r0(sumHonorar),
    snittleie: medLeie.length ? r0(sumLeie / medLeie.length) : 0,
    inntektPerEnhet: antall ? r0(sumHonorar / antall) : 0, // eks. mva
    vektetHonorarPct: sumLeie > 0 ? r1((sumHonorar * 1.25 * 100) / sumLeie) : null, // inkl. mva-ekv.
    vektetHonorarEksMvaPct: sumLeie > 0 ? r1((sumHonorar * 100) / sumLeie) : null,
    oppdatertAt,
  };
}

export async function hentEnhetsokonomi(db) {
  const [{ drift }, doc, sync] = await Promise.all([
    listEnheter(db),
    db.collection('finance_settings').findOne({ id: EO_SETTINGS_ID }, { projection: { _id: 0 } }).catch(() => null),
    db.collection('datarom_sync').findOne({ id: 'lf-auto' }, { projection: { _id: 0 } }).catch(() => null),
  ]);
  const portefolje = beregnPortefoljeOkonomi(drift, sync?.at || null);
  // Første gang (ingen lagrede drivere): forhåndsutfyll leie/honorar fra
  // faktisk portefølje — deretter eier admin antakelsene selv.
  let drivere = rensEoDrivere(doc?.drivere || {});
  if (!doc && portefolje.antallAktive > 0) {
    drivere = rensEoDrivere({
      ...drivere,
      snittleie: portefolje.snittleie || drivere.snittleie,
      honorarPct: portefolje.vektetHonorarPct ?? drivere.honorarPct,
    });
  }
  return { drivere, harLagret: Boolean(doc), portefolje, oppdatert: doc?.updatedAt || null };
}

export async function lagreEnhetsokonomiDrivere(db, body = {}) {
  const drivere = rensEoDrivere(body.drivere || body);
  await db.collection('finance_settings').updateOne(
    { id: EO_SETTINGS_ID },
    { $set: { id: EO_SETTINGS_ID, drivere, updatedAt: new Date().toISOString() } },
    { upsert: true },
  );
  return { ok: true, drivere };
}

/* Mapping til investormodellens drivernavn — slik at nye investormodeller
   arver den økonomiske motoren herfra (én kilde til sannhet, ikke to sett
   med «CAC = 5 000»). Budsjettets egne innsendte drivere vinner alltid. */
export function eoTilModellDrivere(eo = {}) {
  const d = rensEoDrivere(eo);
  return {
    snittleieNye: d.snittleie,
    honorarPctNye: d.honorarPct,
    oppstartPerEnhet: d.oppstartPerEnhet,
    systemPerEnhet: d.systemPerEnhet + d.andreDirekte,
    enheterPerAarsverk: d.enheterPerAarsverk,
    aarslonn: d.aarslonn,
    paslagPct: d.paslagPct,
    provisjonPerNyEnhet: d.cac,
    aarligChurnPct: d.aarligChurnPct,
  };
}
