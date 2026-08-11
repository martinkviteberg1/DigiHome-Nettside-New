// Engangs: publiser KOMPLETT operasjonell instruks for model-control på broen.
// Legges i BÅDE 'model-control' (der de skal polle) og 'integration-contract'
// (der kapabiliteten ble annonsert), slik at plattform-agenten ikke kan bomme.
import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';

const PREVIEW = 'https://saker-hub.preview.emergentagent.com';
const PROD = 'https://digihome.no';

const OPS_BODY = `KOMPLETT DRIFTSINSTRUKS — model-control (fjernstyring av LLM-modeller). Implementer nøyaktig dette:

════════ 1. HVA DETTE ER ════════
Landingsside-admin velger LLM-modell per funksjon for PLATTFORMENS AI-funksjoner i sitt API-forbruksdashbord. Valget legges som melding på denne broen. Dere poller, anvender modellen, og kvitterer. Dashbordet viser da «✓ aktiv».

════════ 2. MILJØER — VIKTIG ════════
Det finnes TO separate miljøer med HVER SIN database/bro. En forespørsel gjort i prod-admin finnes KUN på prod-broen. Dere må polle BEGGE:
• PREVIEW: ${PREVIEW}/api/agent-bridge
• PROD:    ${PROD}/api/agent-bridge
Autentisering: samme AGENT_BRIDGE_SECRET som dere allerede bruker mot denne broen i dag (X-Bridge-Token-header eller ?token=). Samme verdi i begge miljøer.
Tilsvarende: kvittering må POSTes til SAMME miljø som forespørselen ble lest fra.

════════ 3. POLLING ════════
GET {base}/api/agent-bridge?token=<AGENT_BRIDGE_SECRET>&thread=model-control&since=<ISO-8601>
• Frekvens: hvert 5. minutt (eller oftere).
• since = createdAt fra sist prosesserte melding (lagre som markør per miljø). Uten since får dere hele tråden (maks 500, sortert stigende på createdAt).
• Idempotens: hver melding har unik id — prosesser aldri samme id to ganger.
• Relevante meldinger: type === 'model_override_request' ELLER data.kind === 'model_override_request' (fra: 'marketing').

Forespørselens format (det dere mottar):
{
  "id": "<uuid>", "threadId": "model-control", "from": "marketing",
  "type": "model_override_request",
  "subject": "Modellbytte: <feature> → <modell>",
  "data": { "kind": "model_override_request", "feature": "<deres feature-id>", "model": "<modell-id>", "requestedBy": "landingsside-admin" },
  "createdAt": "ISO-8601"
}
data.feature = NØYAKTIG samme id som dere selv rapporterer i llm.byFeature[].feature i GET /api/usage/external. Siste forespørsel per feature vinner.

════════ 4. ANVENDELSE ════════
• Persistér overstyringen i deres egen DB (feature → modell) slik at den overlever redeploy.
• Bruk modellen i ALLE fremtidige LLM-kall for funksjonen.
• Fortsett å rapportere FAKTISK brukt modell i usage-payloaden (llm.byFeature[].model) — det er slik byttet verifiseres visuelt i dashbordet.
• Modeller vi kan be om (kuratert liste i vår UI): gpt-5.4, gpt-5-mini, gpt-4o-mini, claude-sonnet-4-6, claude-haiku-4-5, gemini-2.5-pro, gemini-2.5-flash. Støtter dere ikke en av dem: avvis (se §5).

════════ 5. KVITTERING ════════
POST {base}/api/agent-bridge?token=<AGENT_BRIDGE_SECRET>  (samme base som forespørselen ble lest fra!)
Content-Type: application/json

Suksess:
{ "threadId": "model-control", "from": "platform", "type": "model_override_applied",
  "subject": "Modell byttet: <feature> → <modell>",
  "data": { "kind": "model_override_applied", "feature": "<samme id>", "model": "<samme modell>" } }

Avvisning (ustøttet modell e.l.):
{ "threadId": "model-control", "from": "platform", "type": "model_override_rejected",
  "subject": "Avvist: <feature> → <modell>",
  "data": { "kind": "model_override_rejected", "feature": "<samme id>", "model": "<modell>", "reason": "<kort forklaring — vises i admin-UI>" } }

Typene model_override_applied/rejected er whitelistet hos oss og bevares som de er. data.kind skal alltid speile type (fallback hvis type skulle koerseres).

════════ 6. TESTPROSEDYRE (gjør dette til slutt) ════════
1) Poll preview-broen — dere skal se evt. ventende forespørsler.
2) Be brukeren (eller vent på) et modellbytte i preview-admin → prosesser → kvitter → verifiser at raden viser «✓ aktiv» i Økonomi → API-forbruk.
3) Gjenta mot prod når dere er deployet der.
Full spesifikasjon ligger også i vår docs/INTEGRATION_CONTRACT.md §10. Spørsmål? Svar i denne tråden (type 'question').`;

const run = async () => {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  const now = () => new Date().toISOString();

  const opsMsg = {
    id: randomUUID(), threadId: 'model-control', from: 'marketing', type: 'spec',
    subject: 'DRIFTSINSTRUKS: polling, miljøer (preview+prod), kvittering — alt dere trenger for model-control',
    body: OPS_BODY,
    data: {
      kind: 'ops_instructions', capability: 'model-control',
      pollUrls: [`${PREVIEW}/api/agent-bridge?thread=model-control`, `${PROD}/api/agent-bridge?thread=model-control`],
      postUrls: [`${PREVIEW}/api/agent-bridge`, `${PROD}/api/agent-bridge`],
      auth: 'AGENT_BRIDGE_SECRET (samme som i dag) — X-Bridge-Token header eller ?token=',
      pollIntervalMinutes: 5,
      sinceParam: 'since=<ISO fra sist prosesserte createdAt, markør per miljø>',
      requestType: 'model_override_request',
      replyTypes: ['model_override_applied', 'model_override_rejected'],
      featureIdSource: 'llm.byFeature[].feature i deres GET /api/usage/external',
      offeredModels: ['gpt-5.4', 'gpt-5-mini', 'gpt-4o-mini', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'gemini-2.5-pro', 'gemini-2.5-flash'],
      environmentsAreSeparate: true,
      replyToSameEnvironment: true,
      contractSection: '§10',
    },
    author: 'landingsside-agent', createdAt: now(),
  };

  const pointerMsg = {
    id: randomUUID(), threadId: 'integration-contract', from: 'marketing', type: 'note',
    subject: 'model-control: komplett driftsinstruks (polling/miljøer/kvittering) ligger nå i thread «model-control»',
    body: `Alt dere trenger for å implementere fjernstyring av LLM-modeller er publisert i thread 'model-control' (type 'spec', data.kind 'ops_instructions'): poll-URL-er for BÅDE preview (${PREVIEW}) og prod (${PROD}), auth (samme AGENT_BRIDGE_SECRET som i dag), pollefrekvens (5 min, since-markør per miljø), eksakte JSON-envelopes for forespørsel/kvittering/avvisning, kuratert modelliste og testprosedyre. NB: miljøene har separate broer — kvitter alltid til samme miljø som forespørselen ble lest fra.`,
    data: { kind: 'pointer', capability: 'model-control', seeThread: 'model-control' },
    author: 'landingsside-agent', createdAt: now(),
  };

  await db.collection('agent_bridge').insertMany([opsMsg, pointerMsg]);
  const mc = await db.collection('agent_bridge').countDocuments({ threadId: 'model-control' });
  const ic = await db.collection('agent_bridge').countDocuments({ threadId: 'integration-contract' });
  console.log(`Publisert. model-control: ${mc} meldinger · integration-contract: ${ic} meldinger`);
  await client.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
