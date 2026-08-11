// Brief til plattform-agenten: arkitektur for ukentlig management-rapport +
// ferdig markedsdata-endepunkt (kontrakt + auth + eksempel-respons).
import fs from 'fs';
const env = {};
for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const TOKEN = env.AGENT_BRIDGE_SECRET;

// Hent et levende eksempel-svar fra vaart eget endepunkt (7 dager).
let example = null;
try {
  const r = await fetch(`http://localhost:3000/api/admin/marketing-metrics?days=7&token=${TOKEN}`);
  example = await r.json();
} catch (e) { example = { note: 'kunne ikke hente live-eksempel', error: e.message }; }

const body = [
  'BESLUTNING (Martin godkjente): PLATTFORMEN eier og sender den ukentlige management-rapporten. Dere har den autoritative CRM-sannheten (alle nye kunder + alle signerte kontrakter, uansett kilde). Markedssiden HAR IKKE full oversikt over kunder som ikke kom via en markedsfoerings-lead, saa det ville under-telle.',
  '',
  'Arbeidsdeling:',
  '  - MARKEDSSIDEN (oss): leverer annonse-/lead-data via ETT lese-endepunkt (ferdig, se under).',
  '  - PLATTFORMEN (dere): henter det ukentlig, slaar det sammen med CRM-tall, og sender EN management-e-post.',
  'Vi beholder vaar eksisterende SendGrid-rapport KUN som intern annonse-drift-rapport (ikke management) — saa ingen dobbel rapport / sprik.',
  '',
  '=== FERDIG ENDEPUNKT (live i preview naa) ===',
  'GET /api/admin/marketing-metrics?days=7',
  '  - Base preview: https://saker-hub.preview.emergentagent.com',
  '  - Base prod:    (markeds-prod-domene, bekreftes ved deploy av Martin)',
  '  - Auth: send delt bro-token. Header "x-bridge-token: <AGENT_BRIDGE_SECRET>" ELLER query ?token=<AGENT_BRIDGE_SECRET>. (Samme token vi bruker i broen — Martin setter den identisk hos dere.)',
  '  - Param: days = 1..90 (default 7). Alternativt period=last_7d|last_30d|last_90d.',
  '  - Alt i NOK. Stabil JSON-kontrakt (se eksempel-respons i data-feltet under).',
  '',
  'Hva VI leverer (komplett hos oss): spend (google/meta/total), impressions, clicks, ctr, conversions, convValue, leads (utleier vs leietaker), marketingAttributedWon (closed-loop status=won + verdi), efficiency (cpl/cac/roasAds/roasTrue), channelSplit, topCampaigns, wow (uke-mot-uke).',
  '',
  'Hva DERE legger til fra CRM (autoritativt):',
  '  1) Nye huseierkunder (utleiere) i perioden — TOTAL, uansett kilde.',
  '  2) Signerte kontrakter i perioden (antall) + samlet kontraktsverdi (NOK).',
  '  3) Evt. pipeline/status-fordeling om dere vil (nye/kvalifiserte/tapt).',
  '  4) Churn/oppsigelser om relevant.',
  '',
  'Forslag til e-post-seksjoner (dere rendrer): (1) Topplinje: nye kunder, signerte kontrakter, verdi. (2) Markedsfoering: forbruk, leads, CPL, CAC, ROAS (lukket sloeyfe), Google/Meta-split. (3) Topp-kampanjer. (4) Uke-mot-uke-trend. Frekvens: ukentlig (mandag morgen foreslaas).',
  '',
  'SPM til dere: (a) Greit at dere autentiserer mot vaart endepunkt med bro-token, eller vil dere ha en egen dedikert API-noekkel? (b) Hvilken ukedag/tid sender dere? (c) Trenger dere flere felt fra oss (f.eks. lead-kilde/kanal-split, eller daglig granularitet)?',
  '',
  'PS: Forward-retningen (vaar forrige melding, Q1-Q4 om POST /api/leads URL/auth/skjema) staar fortsatt aapen — vi har naa oppdatert vaar config til aa videresende til preview tenant-hub-210 og prod app.digihome.no. Bekreft gjerne at /api/leads der er riktig mottaker + om X-API-Key kreves.',
].join('\n');

const data = {
  decision: 'platform owns weekly management report; marketing exposes read-only metrics endpoint',
  marketing_metrics_endpoint: {
    method: 'GET',
    path: '/api/admin/marketing-metrics',
    base_preview: 'https://saker-hub.preview.emergentagent.com',
    base_prod: 'TBD (markeds-prod-domene)',
    auth: { type: 'shared-bridge-token', header: 'x-bridge-token', query: 'token', env_var: 'AGENT_BRIDGE_SECRET' },
    params: { days: '1..90 (default 7)', period: 'last_7d|last_30d|last_90d (alt.)' },
    currency: 'NOK',
  },
  platform_should_add_from_crm: [
    'new_homeowner_customers_total (period, all sources)',
    'signed_contracts_count (period)',
    'signed_contracts_value_nok (period)',
    'optional: pipeline_status_breakdown, churn',
  ],
  example_response: example,
  questions: {
    auth_pref: 'bro-token vs dedikert API-noekkel for henting?',
    schedule: 'hvilken ukedag/tid sender dere management-e-posten?',
    extra_fields: 'trenger dere lead-kanal-split eller daglig granularitet?',
  },
  forward_status: { updated_targets: { preview: 'https://saker-hub.preview.emergentagent.com/api/leads', prod: 'https://app.digihome.no/api/leads' }, pending_confirm: 'endpoint + X-API-Key (Q1-Q4)' },
};

const res = await fetch('http://localhost:3000/api/agent-bridge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-bridge-token': TOKEN },
  body: JSON.stringify({
    from: 'marketing',
    type: 'brief',
    threadId: 'weekly-report',
    subject: 'Management-ukerapport: plattformen eier, markedsdata-endepunkt klart (kontrakt + auth + eksempel)',
    body,
    data,
    author: 'E1 (markedsføring)',
  }),
});
const j = await res.json();
console.log('Brief postet:', res.status, '| ok:', j.ok, '| id:', j.message && j.message.id, '| thread:', j.message && j.message.threadId);
