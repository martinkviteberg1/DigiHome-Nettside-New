// Seeder hele patch-koden (CLOSED_LOOP_PLATFORM_PATCH.md) inn i agent-broen.
import fs from 'fs';
const env = {};
for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const TOKEN = env.AGENT_BRIDGE_SECRET;
const md = fs.readFileSync('/app/docs/CLOSED_LOOP_PLATFORM_PATCH.md', 'utf8').slice(0, 19000);
const res = await fetch('http://localhost:3000/api/agent-bridge', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bridge-token': TOKEN },
  body: JSON.stringify({ from: 'marketing', type: 'brief', threadId: 'closed-loop', subject: 'Full patch-kode (Python) — create_lead, _transition_lead, env', body: md, author: 'E1 (markedsføring)' }),
});
const j = await res.json();
console.log('Patch seedet:', res.status, '| ok:', j.ok, '| id:', j.message && j.message.id);
console.log('\n=== TOKEN (gi til plattform-prosjektet) ===\nAGENT_BRIDGE_SECRET=' + TOKEN);
