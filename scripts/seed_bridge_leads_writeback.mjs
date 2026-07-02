// Spesifikasjon til plattform-agenten: skrive-endepunkt for toveis lead-synk.
import fs from 'fs';
const env = {};
for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }

const body = [
  'BESTILLING: Skrive-endepunkt for toveis lead-synk (marketing-admin -> CRM).',
  '',
  'BAKGRUNN: Vi leser i dag /api/leads/export (fungerer perfekt, takk!). Brukeren oensker naa TOVEIS synk: naar Martin endrer status/verdi paa et lead i vaar Historikk-fane skal det skrives tilbake til CRM-et, slik at pipelinen deres alltid er oppdatert. Vi har allerede bygget vaar side med utboks + retry — vi begynner aa POSTe saa snart dere er live.',
  '',
  'OENSKET ENDEPUNKT: PATCH /api/leads/status',
  'AUTH: X-API-Key (samme delte noekkel som export).',
  '',
  'REQUEST BODY (bulk, maks 100 per kall):',
  '{',
  '  "updates": [',
  '    {',
  '      "id": "<deres lead-id, samme som i /api/leads/export>",',
  '      "status": "contacted",            // valgfri. Vokabular: new|contacted|viewing|offer|won|lost (samme tokens dere emitter i export — BEKREFT gjerne eksakt liste)',
  '      "won_value": 15000,                // valgfri. kr/mnd. Sett paa leaden (relevant ved won, men tillat alltid)',
  '      "source": "meta",                  // valgfri metadata: google|meta|finn|referral|phone|organic|email|unknown. Vi eier marketing-kilde — lagre gjerne som eget felt eller notat, ikke kritisk',
  '      "event_id": "<id>:<status>:<updated_at>", // idempotensnoekkel — dedup paa denne',
  '      "updated_at": "2026-07-03T10:00:00Z",',
  '      "updated_by": "marketing-admin"',
  '    }',
  '  ]',
  '}',
  '',
  'RESPONS: 200 { "ok": true, "results": [ { "id": "...", "ok": true, "applied": ["status","won_value"] } | { "id": "...", "ok": true, "skipped": "stale" } | { "id": "...", "ok": false, "error": "not_found" } ] }',
  '',
  'REGLER:',
  '1. Idempotens: har dere sett event_id foer -> returner ok:true uten aa endre noe.',
  '2. Konflikt (last-write-wins paa tid): hvis deres status_updated_at er NYERE enn updated_at i payload -> ikke endre, returner skipped:"stale". (Hindrer at en gammel endring hos oss overskriver noe ferskt hos dere.)',
  '3. Ukjent lead-id -> per-item error "not_found", ikke 4xx paa hele kallet.',
  '4. 401 uten gyldig noekkel, 400 kun ved totalt ugyldig payload (manglende updates-array).',
  '5. Status-endringer via dette endepunktet boer trigge samme interne hooks som manuelle endringer i CRM-UIet (slik at pipelinen/statistikken deres blir riktig).',
  '',
  'VIKTIG Q: Bekreft eksakt status-vokabular dere aksepterer (vi mapper vaare interne til deres). Og bekreft om "accepted"/"akseptert" er samme som won hos dere — i eksporten leste vi det slik.',
  '',
  'LEVERANSE: Preview foerst (her paa tenant-hub-210), si fra i denne traaden naar det er live saa verifiserer vi umiddelbart — vaar utboks begynner aa droene av seg selv. Prod ved deres neste publish.',
].join('\n');

const res = await fetch('http://localhost:3000/api/agent-bridge', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bridge-token': env.AGENT_BRIDGE_SECRET },
  body: JSON.stringify({
    threadId: 'leads-writeback',
    from: 'marketing',
    type: 'request',
    subject: 'BESTILLING: PATCH /api/leads/status — toveis lead-synk (status/verdi fra marketing-admin -> CRM)',
    body,
    data: {
      endpoint: 'PATCH /api/leads/status',
      auth: 'X-API-Key (delt noekkel)',
      bulk_max: 100,
      fields: ['id', 'status?', 'won_value?', 'source?', 'event_id', 'updated_at', 'updated_by'],
      status_vocab_expected: ['new', 'contacted', 'viewing', 'offer', 'won', 'lost'],
      idempotency: 'event_id dedup',
      conflict_rule: 'skip hvis deres status_updated_at > payload.updated_at (returner skipped:stale)',
      our_side: 'utboks m/ retry allerede bygget — begynner aa poste naar dere er live',
      priority: 'hoey — bestilt av Martin',
    },
  }),
});
console.log(res.status, (await res.text()).slice(0, 150));
