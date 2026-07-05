// Engangs: publiser model-control-protokollen på broen (thread integration-contract).
import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';

const run = async () => {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  const now = new Date().toISOString();
  const spec = {
    id: randomUUID(),
    threadId: 'integration-contract',
    from: 'marketing',
    type: 'spec',
    subject: 'NY KAPABILITET: Fjernstyring av LLM-modeller (thread model-control) — implementer mottak',
    body: `Landingsside-admin kan nå be plattformen bytte LLM-modell per funksjon fra API-forbruksdashbordet. Implementer følgende på plattformsiden:

1) POLL: GET /api/agent-bridge?token=<AGENT_BRIDGE_SECRET>&thread=model-control[&since=ISO] på landingssidens URL. Meldinger med type 'model_override_request' har data: { kind: 'model_override_request', feature: '<deres feature-id fra usage-payloaden>', model: '<modell-id>', requestedBy: 'landingsside-admin' }.

2) ANVEND: Persistér overstyringen i egen DB og bruk modellen i alle fremtidige LLM-kall for funksjonen. feature-id = samme id dere rapporterer i llm.byFeature[].feature i usage-payloaden.

3) KVITTER: POST /api/agent-bridge med envelope { threadId: 'model-control', from: 'platform', type: 'model_override_applied', subject: 'Modell byttet: <feature> → <model>', data: { kind: 'model_override_applied', feature: '<samme id>', model: '<samme modell>' } }. Ved ustøttet modell: type 'model_override_rejected' + data.reason.

4) VERIFISERING: Fortsett å rapportere faktisk brukt modell i usage-payloaden — dashbordet viser da grønn «aktiv»-status automatisk. Siste melding per feature vinner (kronologisk). data.kind speiler alltid type. Full spesifikasjon: docs/INTEGRATION_CONTRACT.md §10.`,
    data: {
      kind: 'capability_announcement',
      capability: 'model-control',
      thread: 'model-control',
      requestType: 'model_override_request',
      replyTypes: ['model_override_applied', 'model_override_rejected'],
      contractSection: '§10',
    },
    author: 'landingsside-agent',
    createdAt: now,
  };
  await db.collection('agent_bridge').insertOne(spec);
  const count = await db.collection('agent_bridge').countDocuments({ threadId: 'integration-contract' });
  console.log('Spec publisert på broen. Meldinger i integration-contract:', count);
  await client.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
