// PREVIEW-ONLY testrigg for boliginteresse-flyten.
// Lager en mottakerrad + signert lenke slik at hele flyten (lookup → confirm)
// kan verifiseres uten å sende e-post. Skriver kun til preview-databasen.
// Kjør: node scripts/rig-interest-test.mjs
import fs from 'fs';
import crypto from 'crypto';
import { MongoClient } from 'mongodb';

function loadEnv(f) {
  for (const raw of fs.readFileSync(f, 'utf8').split('\n')) {
    const l = raw.trim(); if (!l || l.startsWith('#')) continue;
    const i = l.indexOf('='); if (i < 0) continue;
    const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.split(' #')[0].trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv('/app/.env');

const SECRET = (process.env.NEWSLETTER_SECRET || process.env.AGENT_BRIDGE_SECRET || process.env.SENDGRID_API_KEY || 'dh-nl').toString();
const ptToken = (c, r, p) => crypto.createHmac('sha256', SECRET + ':property-interest').update(`${c}:${r}:${p}`).digest('hex').slice(0, 40);

const client = new MongoClient(process.env.MONGO_URL);
await client.connect();
const db = client.db(process.env.DB_NAME || undefined);

const prop = await db.collection('platform_properties').findOne({ status: 'active', stale: { $ne: true } }, { projection: { _id: 0, externalId: 1, id: 1, title: 1, district: 1 } });
if (!prop) { console.log('FEIL: ingen ledig bolig i databasen'); process.exit(1); }

const campaignId = 'qa-interest-campaign';
const rid = 'qarid0001';
const email = 'qa-boliginteresse@example.com';

// Fjern eventuelle rester fra forrige kjøring, slik at testen er repeterbar.
await db.collection('newsletter_recipients').deleteMany({ campaignId });
await db.collection('tenant_leads').deleteMany({ email });
await db.collection('property_interest_events').deleteMany({ email });
await db.collection('newsletters').deleteOne({ id: campaignId });

await db.collection('newsletters').insertOne({
  id: campaignId, title: 'QA boliginteresse', subject: 'QA', status: 'sent',
  blocks: [], segments: [], createdAt: new Date().toISOString(), sentAt: new Date().toISOString(),
});
await db.collection('newsletter_recipients').insertOne({
  id: crypto.randomUUID(), campaignId, rid, email, name: 'QA Tester', at: new Date().toISOString(),
});

const pid = prop.externalId || prop.id;
const pt = ptToken(campaignId, rid, pid);
console.log(JSON.stringify({
  ok: true,
  bolig: { pid, title: prop.title, district: prop.district },
  campaignId, rid, email,
  lookupUrl: `/api/newsletter/property-interest/lookup?property=${pid}&c=${campaignId}&r=${rid}&pt=${pt}`,
  confirmBody: { property: pid, campaign: campaignId, r: rid, pt },
  landingUrl: `/boliginteresse?property=${pid}&c=${campaignId}&r=${rid}&pt=${pt}`,
}, null, 2));
await client.close();
