// Korrekt closed-loop e2e-verifisering FRA markedssiden:
// 1) Opprett markedslead (forward til plattform, external_ref = vaar lead.id)
// 2) Simuler plattformens won-webhook tilbake med samme external_ref + secret
// 3) Sjekk match + konvertering-flagg, rydd opp.
import fs from 'fs';
import { MongoClient } from 'mongodb';
const env = {};
for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const BASE = 'http://localhost:3000';
const SECRET = env.LEAD_SYNC_SECRET;

// 1) Opprett lead med fake test-gclid/fbclid
const createRes = await fetch(`${BASE}/api/leads`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Closed Loop Verify', email: 'cl-verify@example.test', phone: '+4790099887',
    address: 'Sløyfeveien 9, 5003 Bergen', property_type: 'leilighet', lead_type: 'huseier',
    notes: 'closed-loop verifisering fra markedssiden',
    attribution: { gclid: 'TEST_GCLID_LOOP_VERIFY', fbclid: 'TEST_FBCLID_LOOP' },
  }),
});
const created = await createRes.json();
const leadId = created.id || (created.lead && created.lead.id);
console.log('1) Lead opprettet:', leadId, '| forwarded:', created.forwarded, '| platform_id:', created.lead && created.lead.platform_id);

// 2) Simuler plattformens won-webhook tilbake (matcher paa external_ref = vaar lead.id)
const whRes = await fetch(`${BASE}/api/webhooks/lead-status`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-webhook-secret': SECRET },
  body: JSON.stringify({ external_ref: leadId, source_system: 'digihome-marketing', status: 'won', value: 36000, currency: 'NOK', email: 'cl-verify@example.test', changed_at: new Date().toISOString() }),
});
const wh = await whRes.json();
console.log('2) Webhook-svar:', whRes.status, '| ok:', wh.ok, '| status:', wh.status, '| matched_by:', wh.matched_by, '| meta_capi:', JSON.stringify(wh.meta_capi));

// 3) Inspiser lead-flagg + rydd opp
const c = new MongoClient(env.MONGO_URL); await c.connect();
const db = c.db(env.DB_NAME);
const lead = await db.collection('leads').findOne({ id: leadId }, { projection: { _id: 0, status: 1, wonValue: 1, wonValueEstimate: 1, wonCurrency: 1, metaCapiWon: 1, googleAdsWon: 1 } });
console.log('3) Lead etter won:', JSON.stringify(lead));
const del = await db.collection('leads').deleteOne({ id: leadId });
console.log('   Ryddet test-lead:', del.deletedCount);
await c.close();
