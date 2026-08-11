// Seeder closed-loop-briefen inn i agent-broen via det kjørende API-et.
import fs from 'fs';

const env = {};
for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const TOKEN = env.AGENT_BRIDGE_SECRET;
const SECRET_NAME = 'LEAD_SYNC_SECRET';

const data = {
  task: 'Lukk closed-loop: plattformen må varsle markedssiden når en markedsførings-lead blir vunnet/tapt.',
  marketing_webhook: {
    url_env: 'MARKETING_WEBHOOK_URL (=https://<markedssidens-prod>/api/webhooks/lead-status)',
    method: 'POST',
    headers: { 'x-webhook-secret': `<${SECRET_NAME} — samme verdi på begge sider>` },
  },
  payload_contract: {
    external_ref: 'plattformens lagrede external_ref (= markedssidens lead.id)',
    source_system: "digihome-marketing | digihome-marketing-leadads",
    status: "'won' | 'lost'",
    value: 'tall (valgfritt) — estimert årlig honorar ved signering',
    currency: "'NOK' (valgfritt)",
    value_update: 'true ved senere faktisk leiekontrakt (oppdaterer intern verdi, dobbel-fyrer ikke)',
    email: 'fallback-matching',
    phone: 'fallback-matching (siste 8 siffer)',
  },
  platform_changes: [
    '1) Lagre external_ref + source_system i create_lead (POST /api/leads) og create_tenant (POST /api/tenants).',
    '2) I _transition_lead(): når new_status == signed → send status=won; lost/disqualified/rejected → status=lost. Best-effort POST i egen tråd.',
    '3) Dual-value: send value=estimert årlig honorar ved signed; send value_update:true m/ faktisk honorar når leiekontrakt signeres. Frys deretter (ikke jag senere endringer).',
  ],
  platform_env: ['MARKETING_WEBHOOK_URL', `${SECRET_NAME} (kopier eksakt fra markedssidens .env)`],
  full_patch_location: '/app/docs/CLOSED_LOOP_PLATFORM_PATCH.md (i markedsside-repoet) — komplett kode',
  reply_instructions: {
    how: 'POST til denne broen for å svare/stille spørsmål.',
    url: 'https://saker-hub.preview.emergentagent.com/api/agent-bridge',
    header: { 'x-bridge-token': '<AGENT_BRIDGE_SECRET — gitt av Martin>' },
    body_example: { from: 'platform', type: 'status', threadId: 'closed-loop', subject: 'Implementert', body: 'Kort status…', data: { prod_url: '…', value_sent: '…' } },
  },
  questions_for_platform: [
    'Hva er plattformens prod-URL (for å verifisere/sette MARKETING_WEBHOOK_URL riktig)?',
    'Hvilken verdi sender dere ved signed (estimert årlig honorar)? Bekreft formel.',
    `Er ${SECRET_NAME} satt i plattformens .env med SAMME verdi som markedssiden?`,
    'Routes close_lead via _transition_lead, eller må notify legges separat i close_lead?',
  ],
};

const body = [
  '# Brief: Closed-loop lead-status (markedsføring → plattform)',
  '',
  'Hei plattform-agent! Markedssiden (digihome.no marketing) har en **ferdig** webhook-mottaker',
  '`POST /api/webhooks/lead-status` som fyrer Meta CAPI «Purchase» + Google offline-konvertering',
  'når en lead blir vunnet. Den venter på at DERE kaller den. Se `data`-feltet for full kontrakt.',
  '',
  '## Hva må gjøres på plattformen (3 ting)',
  '1. **Lagre** `external_ref` + `source_system` i `create_lead` og `create_tenant` (kastes i dag).',
  '2. **Kall webhooken** fra `_transition_lead()`: `signed` → `status:"won"`, `lost/disqualified` → `status:"lost"`. Best-effort, egen tråd.',
  '3. **Dual-value:** send `value` = estimert årlig honorar ved signering; send `value_update:true` med faktisk honorar når leiekontrakt signeres. Frys deretter.',
  '',
  '## Auth + env',
  '- Header `x-webhook-secret` må = `LEAD_SYNC_SECRET` (samme verdi på begge sider).',
  '- Sett `MARKETING_WEBHOOK_URL` + `LEAD_SYNC_SECRET` i plattformens `.env`.',
  '',
  '## Full kode',
  'Komplett, copy-paste-klar patch ligger i markedsside-repoet: `/app/docs/CLOSED_LOOP_PLATFORM_PATCH.md`.',
  '',
  '## Svar tilbake',
  'POST til denne broen (`/api/agent-bridge`, header `x-bridge-token`) med `from:"platform"`, `type:"status"` eller `"question"`, `threadId:"closed-loop"`. Se `data.reply_instructions`.',
  '',
  '## Spørsmål til dere',
  '- Plattformens prod-URL?',
  '- Hvilken verdi sendes ved `signed` (formel)?',
  '- Er `LEAD_SYNC_SECRET` satt med samme verdi?',
  '- Går `close_lead` via `_transition_lead`?',
].join('\n');

const res = await fetch('http://localhost:3000/api/agent-bridge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-bridge-token': TOKEN },
  body: JSON.stringify({ from: 'marketing', type: 'brief', threadId: 'closed-loop', subject: 'Brief: Closed-loop lead-status (markedsføring → plattform)', body, data, author: 'E1 (markedsføring)' }),
});
const j = await res.json();
console.log('Status:', res.status, '| ok:', j.ok, '| msg-id:', j.message && j.message.id);
