// ETTER DEPLOY — la Google bruke verdien nettstedet sender, i stedet for en fast standardverdi.
//
// Kjør tørt:  node scripts/after-deploy-google-value.mjs --dry
// Kjør ekte:  node scripts/after-deploy-google-value.mjs --live
//
// REKKEFØLGEN ER VIKTIG — ikke kjør dette før koden er deployet.
//
// Bakgrunn: ingen av skjemaene sendte verdi til Google. trackLead sendte
// value: 0 på hver konvertering. Derfor sto konverteringshandlingen med
// «bruk alltid standardverdi = ja», som overstyrte nullene med 1 000 kr
// (senere 2 000 kr). Nå sender koden ekte forventningsverdi og utelater
// value-feltet helt når verdien er 0.
//
// Skrur vi av «bruk alltid standardverdi» FØR koden er live, begynner Google å
// bokføre 0 kr pr. konvertering. Derfor dette som eget steg.
//
// Etter kjøring: verifiser i Google Ads at nye konverteringer får ~2 000 kr i
// verdi, ikke 0. Får de 0, skru flagget tilbake på (--rollback) og meld fra.
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const LIVE = process.argv.includes('--live');
const ROLLBACK = process.argv.includes('--rollback');
const g = await import('/app/lib/google-ads-native.js');
const CID = g.defaultCustomerId();
const CONV_LEAD = '7665638797'; // DigiHome – Lead (skjema)
const LEAD_VALUE = Number(process.env.NEXT_PUBLIC_LEAD_VALUE_NOK || 2000);

const show = async (label) => {
  const rows = await g.gaqlSearch(CID, `SELECT conversion_action.name, conversion_action.value_settings.default_value, conversion_action.value_settings.always_use_default_value FROM conversion_action WHERE conversion_action.id = ${CONV_LEAD}`);
  const vs = rows[0]?.conversionAction?.valueSettings || {};
  console.log(`${label}: standardverdi ${vs.defaultValue} kr · bruk alltid standardverdi: ${vs.alwaysUseDefaultValue}`);
  return vs;
};

await show('FØR');

if (!LIVE && !ROLLBACK) {
  console.log('\nTørrkjøring. Dette VIL skje ved --live:');
  console.log(`  always_use_default_value: true → false`);
  console.log(`  default_value: beholdes på ${LEAD_VALUE} kr (brukes når nettstedet ikke sender verdi)`);
  console.log('\nSJEKKLISTE FØR --live:');
  console.log('  1. Er koden deployet til produksjon? (NEXT_PUBLIC_LEAD_VALUE_NOK må være med)');
  console.log('  2. Har du sett minst én ny konvertering komme inn etter deploy?');
  console.log('  3. Vet du hvordan du ruller tilbake? (--rollback)');
  process.exit(0);
}

await g.updateConversionActionValue(CID, CONV_LEAD, {
  alwaysUseDefaultValue: !!ROLLBACK,
  defaultValue: LEAD_VALUE,
});
await new Promise((r) => setTimeout(r, 2500));
await show('ETTER');
console.log(ROLLBACK
  ? '\nRullet tilbake — Google overstyrer igjen med standardverdien.'
  : '\nFerdig. Verdien nettstedet sender gjelder nå. Verifiser i Google Ads at nye konverteringer får ~' + LEAD_VALUE + ' kr, ikke 0.');
