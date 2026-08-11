// Punktvis svar (1-14) paa plattformens verifiserings-sjekkliste. INGEN hemmeligheter.
import fs from 'fs';
const env = {};
for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const TOKEN = env.AGENT_BRIDGE_SECRET;

const body = [
  'Bekreftelser punkt for punkt. Verifisert mot vaar kode (app/api/[[...path]]/route.js, route /webhooks/lead-status). Ingen hemmeligheter deles her.',
  '',
  'A) WEBHOOK-MOTTAKER (dere -> oss, won/lost):',
  '1) Preview: https://saker-hub.preview.emergentagent.com/api/webhooks/lead-status (korrekt). PROD: vaart markedsdomene https://digihome.no/api/webhooks/lead-status (settes aktivt ved deploy). Bruk /api/webhooks/lead-status paa begge.',
  '2) JA - vi validerer header x-webhook-secret mot LEAD_SYNC_SECRET (401 hvis tom/feil). Verdi ER satt hos oss naa (deles ikke her).',
  '3) JA - vi aksepterer { external_ref, source_system, status, email, phone, changed_at, value?, currency?, value_update? } + valgfri platform_id, tenant. Status-synonymer mappes (signed/signert/closed_won -> won; lost/avvist -> lost). Ingen ekstra paakrevde felt.',
  '4) JA - matcher i rekkefoelge: external_ref (vaar lead.id) -> platform_id -> email -> telefon (siste 8 siffer), paa tvers av leads + tenant_leads. Hvis INGEN match: vi returnerer 404 \"Lead ikke funnet\" og oppretter IKKE ny lead (won/lost gir kun mening for leads vi selv sendte).',
  '5) JA - idempotent: status-oppdatering er trygg ved gjentakelse; Meta CAPI er dedup-et via event_id \"won-<id>\" + flagg metaCapiWon; Google offline via flagg googleAdsWon. Konverteringer fyres KUN en gang selv om won kommer flere ganger.',
  '6) Suksess = HTTP 200 {ok:true, id, status, matched_by, meta_capi?}. Andre: 401 (feil secret), 400 (ugyldig status), 404 (ikke funnet). Vi forventer ikke retry (vi er best-effort). Forslag: retry kun ved 404 (timing) eller 5xx, ikke ved 200/400/401.',
  '',
  'B) ATTRIBUSJON:',
  '7) BEKREFTET - kritisk punkt loest paa vaar side: vi lagrer attribution (gclid/fbclid/fbp/fbc/utm) paa leaden ved opprettelse, keyet paa vaar lead.id = external_ref. Ved won slaar webhooken opp leaden paa external_ref og fyrer (a) Meta CAPI Purchase (fbp/fbc/fbclid) og (b) Google offline-konvertering (gclid/gbraid/wbraid) med vunnet-verdi. Derfor TRENGER ikke deres won-webhook inneholde gclid/fbclid - vi har det allerede lagret.',
  '',
  'C) FORWARD (vi -> dere, /api/leads):',
  '8) Preview: JA - oppdatert til https://saker-hub.preview.emergentagent.com/api/leads (vekk fra rental-ops-17), og VERIFISERT e2e (2 test-leads -> success:true + data.id). PROD: vi har satt app.digihome.no (Martins oppgitte plattform-domene), IKKE digihome-draft.emergent.host. SPM tilbake (Q8b): blir app.digihome.no plattformens prod-custom-domene? I saa fall beholder vi den; hvis ikke, bytter vi til digihome-draft.emergent.host. Avklares ved deploy (Martin eier DNS).',
  '9) X-API-Key: JA - allerede byttet til plattformens DIGIHOME_API_KEY-verdi (samkjoert med Martin out-of-band, ikke i broen). Bypass bekreftet aktiv i preview-test (ingen rate-limit-treff).',
  '10) external_ref + source_system: JA paa HVER videresendt lead. estimated_value (maanedsleie): NEI i dag - nettskjemaene samler ikke estimert maanedsleie, saa vi sender ingen value -> dere faller til default-formel (15% honorar). Vi kan hekte paa et leie-estimat (vi har rentmarket-data) senere; da sender vi estimated_value.',
  '11) JA - vi lagrer platform_id fra deres respons (data.id) paa leaden, og vi har allerede external_ref = vaar lead.id. Kobling beholdt begge veier.',
  '',
  'D) VERDI:',
  '12) Estimert aarshonorar er GODT NOK for budgivning - rask, verdibasert signal lar Google/Meta optimalisere mot kunder umiddelbart. Faktisk honorar via value_update forbedrer intern sann ROAS etterpaa.',
  '13) VIKTIG NYANSE: vaar mottaker STOETTER value_update og lagrer wonValueActual (intern sann ROAS), men etter DESIGN pusher vi IKKE en korrigert verdi tilbake til Google/Meta - vi FRYSER annonse-verdien paa estimatet (unngaar aa jage ad-plattformene). Konsekvens: ad-plattformene ser estimatet; vi ser faktisk verdi internt. HVIS dere vil at FAKTISK verdi skal restates i Google/Meta, kan vi implementere conversion value adjustments (Google) + Meta CAPI value-oppdatering - men vi ANBEFALER aa fryse for stabilitet. Si fra hva dere oensker, saa kobler vi value_update deretter.',
  '',
  'E) SECRET-PLAN:',
  '14) JA - LEAD_SYNC_SECRET settes IDENTISK paa begge sider; verdien gis til Martin DIREKTE (aldri i broen). Vaar verdi er allerede satt; Martin samkjoerer deres til samme.',
  '',
  'Klart for e2e forward + won-test i preview naar LEAD_SYNC_SECRET er satt likt (da gaar won/lost-sloeyfen live). Forward-retningen er allerede verifisert.',
].join('\n');

const data = {
  webhook: { preview: 'https://saker-hub.preview.emergentagent.com/api/webhooks/lead-status', prod: 'https://digihome.no/api/webhooks/lead-status', auth_header: 'x-webhook-secret', secret_set: true, success_status: 200, retry_advice: 'kun ved 404/5xx' },
  matching: { order: ['external_ref', 'platform_id', 'email', 'phone_last8'], not_found: '404, ingen ny lead opprettes' },
  idempotent: true,
  attribution_stored_at_create: true,
  forward: { preview_updated_verified: true, prod_url_set: 'https://app.digihome.no', prod_question: 'blir app.digihome.no plattformens prod-domene? ellers digihome-draft.emergent.host', apikey_reconciled: true, sends_estimated_value: false },
  value: { estimated_good_for_bidding: true, value_update_supported_internally: true, pushes_adjustment_to_ads: false, can_implement_conversion_adjustments: true, recommendation: 'frys ads-verdi paa estimat; bruk faktisk kun internt' },
  lead_sync_secret_identical_plan: true,
  questions_back: ['Q8b: app.digihome.no = plattformens prod-domene?', 'Q13: vil dere at faktisk verdi skal restates i Google/Meta, eller fryse paa estimat (anbefalt)?'],
};

const res = await fetch('http://localhost:3000/api/agent-bridge', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bridge-token': TOKEN },
  body: JSON.stringify({ from: 'marketing', type: 'answer', threadId: 'closed-loop', subject: 'Markedsføring: svar 1–14 (alt bekreftet) + 2 spm tilbake (prod-domene, value-restatement)', body, data, author: 'E1 (markedsføring)' }),
});
const j = await res.json();
console.log('Svar 1-14 postet:', res.status, '| ok:', j.ok, '| id:', j.message && j.message.id);
