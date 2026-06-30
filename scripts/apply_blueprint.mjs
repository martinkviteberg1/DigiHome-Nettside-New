// Engangs-orkestrering: anvend Google Ads «Launch Blueprint» på EKSISTERENDE
// kampanje «DH | Utleie | Bergen | Search». Idempotent — hopper over det som finnes.
import fs from 'fs';
const env = fs.readFileSync('/app/.env', 'utf8');
for (const l of env.split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const lib = await import('/app/lib/google-ads-native.js');
const DRY = process.argv.includes('--dry');

const CAMP_NAME = 'DH | Utleie | Bergen | Search';
const NEG_LIST_NAME = 'DH – Negative (utleier-intensjon)';
const M = (kr) => Math.round(kr * 1e6);

const AG2 = {
  name: 'AG2 - Inntekt', finalUrl: 'https://digihome.no/lp/inntekt', defaultCpcBidMicros: M(22),
  headlines: ['Opptil 30 % mer i leie','Tjen mer på utleie','Dynamisk prising 24/7','Snitt 25 000 kr/mnd Bergen','Maksimer leieinntekten','Leie ut – tjen mer','Hybrid korttid + langtid','Uten å løfte en finger','Gratis inntektsvurdering','Ingen oppstartskostnad','Smartere utleie i Bergen','Hva kan boligen tjene?','Høyere avkastning','Ingen bindingstid','Få et inntektsanslag'],
  descriptions: ['Hybridmodell + dynamisk prising gir opptil 30 % høyere leieinntekt – uten jobb for deg.','Snittinntekt i Bergen rundt 25 000 kr/mnd. Se hva din bolig kan tjene.','Ingen oppstartskostnader eller bindingstid. Betal kun når boligen gir inntekt.','Gratis, uforpliktende vurdering innen 24 timer. Kom i gang i dag.'],
  keywords: [{ text: 'leie ut bolig', matchType: 'PHRASE', cpcBidMicros: M(16) },'"leie ut leilighet bergen"','[leie ut bolig bergen]','"leie ut boligen min"','"tjene mer på utleie"','"høyere leieinntekt"','"hva kan jeg leie ut for"','"leie ut bolig uten stress"'],
};
const AG3 = {
  name: 'AG3 - 10+2', finalUrl: 'https://digihome.no/lp/10pluss2', defaultCpcBidMicros: M(20),
  headlines: ['10 mnd fast, 2 mnd sesong','Det beste fra to verdener','Trygg + lukrativ utleie','10+2-modellen','Fast leietaker + høysesong','Opptil 30 % mer inntekt','Korttid når det lønner seg','Forutsigbar leieinntekt','Utleie uten risiko','Vi styrer alt for deg','Smartere enn ren langtid','Gratis vurdering 24 t','Ingen oppstartskostnad','Airbnb + langtid i ett','Maksimer boligen din'],
  descriptions: ['10 måneder trygg langtidsleie + 2 måneder korttid i høysesong = opptil 30 % mer.','Fast leietaker mesteparten av året, ekstra avkastning når etterspørselen topper seg.','Vi håndterer alt – leietakere, prising og tilsyn. Ingen oppstartskostnad.','Gratis, uforpliktende vurdering innen 24 timer i hele Bergen.'],
  keywords: ['"korttidsutleie forvaltning bergen"','"airbnb forvaltning bergen"','"hjelp til airbnb utleie"','"kombinere korttid og langtid"','"trygg utleie av bolig"','"utleie uten risiko"'],
};
const NEGATIVES = ['til leie','leilighet til leie','bolig til leie','leie leilighet','leie leilighet bergen','finn leilighet','ledig leilighet','hybel til leie','rom til leie','leie hus','leie bolig bergen','kjøpe','til salgs','selge bolig','boligpriser','jobb','ledig stilling','stilling','lønn','gratis','kurs','utdanning','leiekontrakt mal','kontrakt mal','skjema','hotell','feriebolig','bilutleie','utleie bobil','utleie utstyr','lån','forsikring','kommunal bolig','studentbolig'];

(async () => {
  const CUST = lib.defaultCustomerId();
  console.log('Kunde:', CUST, '| MCC:', process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID, DRY ? '| (DRY RUN)' : '');
  const camp = await lib.getCampaignByName(CUST, CAMP_NAME);
  if (!camp) { console.log('FANT IKKE kampanjen:', CAMP_NAME); return; }
  console.log('Kampanje:', camp.id, '| bidding:', camp.biddingStrategyType);
  const ags = await lib.listAdGroups(CUST, camp.id);
  const have = new Set(ags.map((a) => a.name.toLowerCase().replace(/\s+/g, ' ').trim()));
  console.log('Eksisterende annonsegrupper:', ags.map((a) => `${a.name}(${a.id})`).join(', ') || '(ingen)');

  if (DRY) { console.log('\nDRY RUN — ingen endringer gjort.'); return; }

  // A) Bidding → Manuell CPC
  if (camp.biddingStrategyType !== 'MANUAL_CPC') {
    try { await lib.setCampaignManualCpc(CUST, camp.id); console.log('\n[A] Bidding → Manuell CPC: OK'); }
    catch (e) { console.log('\n[A] Bidding-endring FEIL:', e.message); }
  } else console.log('\n[A] Bidding er allerede Manuell CPC.');

  // B) Fiks AG1 maks-CPC (0,01 kr → 22 kr)
  const ag1 = ags.find((a) => /forvaltning/i.test(a.name));
  if (ag1) {
    try { await lib.setAdGroupCpcBid(CUST, ag1.id, M(22)); console.log('[B] AG1 maks-CPC → 22 kr: OK'); }
    catch (e) { console.log('[B] AG1 CPC FEIL:', e.message); }
  }

  // C) AG2 – Inntekt
  if (![...have].some((n) => n.includes('inntekt'))) {
    try { const r = await lib.addAdGroupWithAd(CUST, { campaignId: camp.id, status: 'ENABLED', ...AG2 }); console.log('[C] AG2 – Inntekt opprettet (ENABLED):', r.adGroupResourceName, `| ${r.operationCount} ops`); }
    catch (e) { console.log('[C] AG2 FEIL:', e.message); }
  } else console.log('[C] AG2 – Inntekt finnes allerede, hopper over.');

  // D) AG3 – 10+2
  if (![...have].some((n) => n.includes('10+2') || n.includes('10pluss') || n.includes('10 + 2'))) {
    try { const r = await lib.addAdGroupWithAd(CUST, { campaignId: camp.id, status: 'ENABLED', ...AG3 }); console.log('[D] AG3 – 10+2 opprettet (ENABLED):', r.adGroupResourceName, `| ${r.operationCount} ops`); }
    catch (e) { console.log('[D] AG3 FEIL:', e.message); }
  } else console.log('[D] AG3 – 10+2 finnes allerede, hopper over.');

  // E) Negativ delt liste
  try {
    const existing = await lib.gaqlSearch(CUST, `SELECT shared_set.id, shared_set.name FROM shared_set WHERE shared_set.name = '${NEG_LIST_NAME.replace(/'/g, '')}'`);
    if (existing.length) console.log('[E] Negativ liste finnes allerede, hopper over.');
    else { const r = await lib.createSharedNegativeList(CUST, { name: NEG_LIST_NAME, negatives: NEGATIVES, campaignId: camp.id }); console.log('[E] Negativ liste opprettet + festet:', r.sharedSetResourceName, `| ${NEGATIVES.length} negative`); }
  } catch (e) { console.log('[E] Negativ liste FEIL:', e.message); }

  console.log('\nFerdig.');
})().catch((e) => console.log('UNCAUGHT', e.message));
