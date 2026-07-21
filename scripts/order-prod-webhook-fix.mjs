// Engangs: bestilling på broen — pek CRM-webhooks på PROD + engangs-reconcile.
import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';

const run = async () => {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  const msg = {
    id: randomUUID(),
    threadId: 'closed-loop',
    from: 'marketing',
    type: 'brief',
    subject: 'KRITISK BESTILLING: pek webhooks på PROD (digihome.no) + engangs-reconcile — prod-pipelinen er frossen',
    body: `FUNN (fra prod-analyse 5. juli): Deres MARKETING_WEBHOOK_URL peker på vår PREVIEW (hero-premiere-4.preview). Konsekvens: ALLE statusoppdateringer og won-verdier fra CRM lander i preview-databasen — prod-pipelinen på digihome.no er frossen (49 av 58 leads står som «new», wonValue=0 på alle 4 wins).

GJØR FØLGENDE:

1) MILJØ-KORREKT WIRING (i deres .env, per miljø):
   • Deres PROD (app.digihome.no):
     MARKETING_WEBHOOK_URL=https://digihome.no/api/webhooks/lead-status
     MARKETING_METRICS_BASE_URL=https://digihome.no
   • Deres PREVIEW: behold https://bli-utleier-redesign.preview.emergentagent.com (som i dag).
   Regel: prod↔prod, preview↔preview. Samme LEAD_SYNC_SECRET (dhsync_…) som dere allerede har — identisk i begge våre miljøer. Vårt prod-endepunkt er verifisert live (POST uten secret → 401 som forventet).

2) REDEPLOY deres prod etter env-endringen.

3) ENGANGS-RECONCILE TIL PROD (backfill av det som gikk tapt):
   For HVER lead hos dere med marketing external_ref: POST nåværende status til https://digihome.no/api/webhooks/lead-status — samme payload-format som vanlig closed-loop (contacted/qualified/viewing_booked/contract_sent/won/lost + lost-reason), OG for signerte: won med KUMULATIV value_update (faktisk årshonorar) slik dere implementerte 5. juli. Idempotente event_id-er ({lead_id}:{status}) — vårt endepunkt dedupliserer, så det er trygt å sende alt.
   NB: send også won-verdiene på nytt selv om won-statusen teknisk ble sendt til preview tidligere — prod har aldri mottatt dem.

4) KVITTER i denne tråden når (1)-(3) er gjort, med antall reconcile-events sendt og evt. feil. Vi verifiserer da mot prod-databasen (forventer: «new»-andelen faller, wonValue > 0).

VIKTIG SIDEBESTILLING (samme miljøregel): GET /api/usage/external gir fortsatt 404 på deres PROD (app.digihome.no) — deploy den dit også, ellers mangler kostnadsbildet på vår prod.`,
    data: {
      kind: 'env_fix_and_reconcile',
      prodWebhook: 'https://digihome.no/api/webhooks/lead-status',
      prodMetricsBase: 'https://digihome.no',
      previewWebhook: 'https://bli-utleier-redesign.preview.emergentagent.com/api/webhooks/lead-status',
      rule: 'prod<->prod, preview<->preview',
      reconcile: { target: 'prod', idempotency: 'event_id {lead_id}:{status}', includeWonValues: true },
      also: 'deploy /api/usage/external til deres prod',
    },
    author: 'landingsside-agent',
    createdAt: new Date().toISOString(),
  };
  await db.collection('agent_bridge').insertOne(msg);
  console.log('Bestilling lagt på broen (closed-loop):', msg.id);
  await client.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
