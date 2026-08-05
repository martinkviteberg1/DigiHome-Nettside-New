// FASE 1 — Google Ads-optimalisering (august 2026).
// Kjør ALLTID tørt først:  node scripts/apply-google-optim.mjs --dry
// Deretter for ekte:       node scripts/apply-google-optim.mjs --live
//
// Idempotent: hvert steg sjekker nåværende tilstand og hopper over det som
// allerede er gjort. Rullebakk-instruks står nederst i utskriften.
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const LIVE = process.argv.includes('--live');
const DRY = !LIVE;
if (DRY) console.log('*** TØRRKJØRING (validateOnly) — ingen endringer lagres ***\n');
else console.log('*** LIVE — endringer lagres i kontoen ***\n');

const g = await import('/app/lib/google-ads-native.js');
const CID = g.defaultCustomerId();
const opt = { validateOnly: DRY };

const CAMPAIGNS = {
  bergen: '23984331113',       // DH | Utleie | Bergen | Search
  konkurrent: '23995748632',   // DigiHome – Konkurrent · Utleiemegleren
};
const SHARED_SET = `customers/${CID}/sharedSets/12138896339`; // DH – Negative (utleier-intensjon)
const AG3 = '197242001519';
const KW_KORTTIDSUTLEIE = `customers/${CID}/adGroupCriteria/${AG3}~2237660126358`; // "korttidsutleie av bolig" — 2 509 kr, 0 konv
const KW_KOMBINERE = `customers/${CID}/adGroupCriteria/${AG3}~2488284092096`;       // "kombinere korttid og langtid" — pauset, eier-intensjon
const CONV_LEAD = '7665638797'; // DigiHome – Lead (skjema)

// Forventet verdi pr. lead = snitt kundeverdi × historisk lukkerate.
// 26 350 kr × 7,7 % ≈ 2 029 kr → vi runder ned til 2 000 for å være nøkterne.
const LEAD_VALUE = 2000;

// Negative søkeord som mangler. Utledet fra faktiske søketermer siste 30 dager
// der DigiHome betalte for folk som vil LEIE, ikke leie ut.
// «korttidsleie» blokkerer IKKE «korttidsutleie» (ulike ord) — sjekket.
const NEW_NEGATIVES = [
  'korttidsleie',      // 1 426 kr / 0 konv (bergen, oslo, leilighet, leiekontrakt)
  'korttids leie',
  'dinbnb',            // 349 kr / 0 konv — konkurrent for korttidsGJESTER
  'oslo',              // 83 kr — vi selger bare i Bergen
  'overnatting',
  'ebf',               // 88 kr — Etat for boligforvaltning (kommunalt)
  'skattefritt',       // 87 kr — «skatt» blokkerer ikke «skattefritt»
  'utleiemegler sør',  // 88 kr — konkurrent i annen region
  'søker bolig',
  'søker leilighet',
  'søker hybel',
];

const log = [];
const step = async (label, fn) => {
  try {
    const r = await fn();
    console.log(`✓ ${label}${r && r.note ? ` — ${r.note}` : ''}`);
    log.push({ label, ok: true, ...(r || {}) });
  } catch (e) {
    console.log(`✗ ${label}\n    ${String(e.message || e).slice(0, 300)}`);
    log.push({ label, ok: false, error: String(e.message || e) });
  }
};

// ---------------------------------------------------------------------------
console.log('══ 1. PORTEFØLJE-BUDSTRATEGI: Maksimer konverteringer ══');
console.log('   Begrunnelse: 12 konv/30 d fordelt på to kampanjer (8 + 3) er for tynt');
console.log('   for to separate strategier. En portefølje lar dem dele læringen.\n');

const STRAT_NAME = 'DH – Maks konverteringer (portefølje)';
let stratRn = null;
await step(`Finn/opprett budstrategi «${STRAT_NAME}»`, async () => {
  const found = await g.findBiddingStrategy(CID, STRAT_NAME);
  if (found) { stratRn = found.resourceName; return { note: `finnes allerede (${found.type})` }; }
  const r = await g.createPortfolioBiddingStrategy(CID, { name: STRAT_NAME, type: 'MAXIMIZE_CONVERSIONS', ...opt });
  stratRn = r.resourceName;
  return { note: DRY ? 'validert (opprettes ved --live)' : `opprettet ${r.resourceName}` };
});

for (const [key, id] of Object.entries(CAMPAIGNS)) {
  await step(`Kampanje ${key}: fest til porteføljen`, async () => {
    const rows = await g.gaqlSearch(CID, `SELECT campaign.bidding_strategy, campaign.bidding_strategy_type FROM campaign WHERE campaign.id = ${id}`);
    const cur = rows[0]?.campaign || {};
    if (cur.biddingStrategy && stratRn && cur.biddingStrategy === stratRn) return { note: 'allerede festet' };
    if (!stratRn) return { note: 'hopper over — strategien finnes ikke ennå (tørrkjøring)' };
    await g.setCampaignBiddingStrategy(CID, id, stratRn, opt);
    return { note: `fra ${cur.biddingStrategyType} → MAXIMIZE_CONVERSIONS (portefølje)` };
  });
}

// ---------------------------------------------------------------------------
console.log('\n══ 2. SØKEORD: stopp pengesluket, slipp løs eier-intensjonen ══');

await step('Pause "korttidsutleie av bolig" (2 509 kr / 0 konv)', async () => {
  const rows = await g.gaqlSearch(CID, `SELECT ad_group_criterion.status FROM ad_group_criterion WHERE ad_group_criterion.resource_name = '${KW_KORTTIDSUTLEIE}'`);
  if (rows[0]?.adGroupCriterion?.status === 'PAUSED') return { note: 'allerede pauset' };
  await g.setKeywordStatus(CID, KW_KORTTIDSUTLEIE, 'PAUSED', opt);
  return {};
});

await step('Aktiver "kombinere korttid og langtid" (ren eier-intensjon)', async () => {
  const rows = await g.gaqlSearch(CID, `SELECT ad_group_criterion.status FROM ad_group_criterion WHERE ad_group_criterion.resource_name = '${KW_KOMBINERE}'`);
  if (rows[0]?.adGroupCriterion?.status === 'ENABLED') return { note: 'allerede aktiv' };
  await g.setKeywordStatus(CID, KW_KOMBINERE, 'ENABLED', opt);
  return {};
});

// ---------------------------------------------------------------------------
console.log('\n══ 3. NEGATIVE SØKEORD ══');

await step(`Legg til ${NEW_NEGATIVES.length} negative i delt liste`, async () => {
  const rows = await g.gaqlSearch(CID, `SELECT shared_criterion.keyword.text FROM shared_criterion WHERE shared_set.id = 12138896339`);
  const have = new Set(rows.map((r) => String(r.sharedCriterion?.keyword?.text || '').toLowerCase()));
  const missing = NEW_NEGATIVES.filter((k) => !have.has(k.toLowerCase()));
  if (!missing.length) return { note: 'alle finnes allerede' };
  await g.addSharedNegativeKeywords(CID, SHARED_SET, missing, opt);
  return { note: `${missing.length} nye: ${missing.join(', ')}` };
});

await step('Koble delt negativliste til konkurrentkampanjen', async () => {
  const rows = await g.gaqlSearch(CID, `SELECT campaign.id, campaign_shared_set.shared_set FROM campaign_shared_set WHERE campaign.id = ${CAMPAIGNS.konkurrent}`);
  if (rows.some((r) => r.campaignSharedSet?.sharedSet === SHARED_SET)) return { note: 'allerede koblet' };
  await g.linkSharedSetToCampaign(CID, CAMPAIGNS.konkurrent, SHARED_SET, opt);
  return { note: 'listen gjaldt tidligere BARE Bergen-kampanjen' };
});

// ---------------------------------------------------------------------------
console.log('\n══ 4. KONVERTERINGSVERDI ══');
console.log('   1 000 kr var en plassholder. 2 000 kr = snitt kundeverdi 26 350 kr × 7,7 %.');
console.log('   Vi beholder «bruk alltid standardverdi» inntil koden sender ekte verdi.\n');

await step(`Sett standardverdi på «Lead (skjema)» til ${LEAD_VALUE} kr`, async () => {
  const rows = await g.gaqlSearch(CID, `SELECT conversion_action.value_settings.default_value, conversion_action.value_settings.always_use_default_value FROM conversion_action WHERE conversion_action.id = ${CONV_LEAD}`);
  const vs = rows[0]?.conversionAction?.valueSettings || {};
  if (Number(vs.defaultValue) === LEAD_VALUE) return { note: 'allerede riktig' };
  await g.updateConversionActionValue(CID, CONV_LEAD, { defaultValue: LEAD_VALUE, ...opt });
  return { note: `fra ${vs.defaultValue} kr → ${LEAD_VALUE} kr` };
});

// ---------------------------------------------------------------------------
console.log('\n══ 5. RINGEKONVERTERING (grunnlag for ringesporing i koden) ══');

const CALL_ACTION_NAME = 'DigiHome – Ringeklikk (nettsted)';
await step(`Opprett konverteringshandling «${CALL_ACTION_NAME}»`, async () => {
  const rows = await g.gaqlSearch(CID, `SELECT conversion_action.id, conversion_action.name FROM conversion_action WHERE conversion_action.name = '${CALL_ACTION_NAME}'`);
  if (rows.length) {
    const id = rows[0].conversionAction.id;
    const lbl = await g.getConversionActionLabel(CID, id);
    return { note: `finnes (id ${id})${lbl ? ` · send_to: ${lbl.sendTo}` : ''}`, id, label: lbl };
  }
  // Ringeklikk er et sterkt, men ikke-verifisert signal → verdi settes lavere enn
  // et innsendt skjema (60 % av 2 000 kr).
  const r = await g.createWebConversionAction(CID, {
    name: CALL_ACTION_NAME, category: 'PHONE_CALL_LEAD', countingType: 'ONE_PER_CLICK',
    defaultValue: 1200, alwaysUseDefaultValue: true, primaryForGoal: true, ...opt,
  });
  if (DRY) return { note: 'validert (opprettes ved --live)' };
  const id = String(r.resourceName || '').split('/').pop();
  const lbl = await g.getConversionActionLabel(CID, id);
  return { note: `opprettet id ${id}${lbl ? ` · send_to: ${lbl.sendTo}` : ' · fant ikke etikett ennå'}`, id, label: lbl };
});

// ---------------------------------------------------------------------------
console.log('\n══ OPPSUMMERING ══');
const ok = log.filter((l) => l.ok).length;
console.log(`${ok}/${log.length} steg OK${DRY ? ' (tørrkjøring)' : ''}`);
for (const l of log.filter((x) => !x.ok)) console.log(`  FEIL: ${l.label} → ${l.error}`);

if (LIVE) {
  console.log('\nRULLEBAKK om noe skulle gå galt:');
  console.log('  Budstrategi: sett kampanjene tilbake med setCampaignMaximizeConversions →');
  console.log('    eller i grensesnittet: Budgivning → Maksimer klikk (TARGET_SPEND).');
  console.log('  Søkeord: setKeywordStatus(...ENABLED/PAUSED) på samme ressursnavn.');
  console.log('  Negative: fjernes i grensesnittet under Delte lister.');
}
