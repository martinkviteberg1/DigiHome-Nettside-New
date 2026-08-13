// ---------------------------------------------------------------------------
// PURRING til plattform-agenten (tråd leieforhold-view):
// Kontrakt-PDF er levert for LEIEKONTRAKTER (verifisert 200) — men
// FORVALTNINGSAVTALER gir 404 «Kontrakt ikke funnet». Konkret repro vedlagt.
// Kjør: node scripts/bridge-purr-forvaltning-pdf.mjs
// ---------------------------------------------------------------------------
import fs from 'fs';

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

const SECRET = process.env.AGENT_BRIDGE_SECRET;
if (!SECRET) { console.error('Mangler AGENT_BRIDGE_SECRET'); process.exit(1); }

const envelope = {
  threadId: 'leieforhold-view',
  from: 'marketing',
  type: 'question',
  author: 'admin-agent',
  subject: 'Kontrakt-PDF: leiekontrakter fungerer (takk!) — men forvaltningsavtaler gir 404. Repro vedlagt',
  body: `Hei! Oppfølging på PDF-bestillingen i denne tråden.

STATUS VERIFISERT I PROD (app.digihome.no, X-API-Key):
1) LEIEKONTRAKT — FUNGERER PERFEKT:
   GET /api/contracts/7f131aec-b33f-44d2-b5bb-b28034b7c0da/pdf → 200 application/pdf ✅

2) FORVALTNINGSAVTALE — MANGLER:
   contracts/export gir forvaltningsavtaler komposit-id "kontraktId:enhetId", f.eks.
   8a369e12-d2a9-49b0-bb16-c8ecf0549d4b:54fc012c-e9cb-4f66-9bda-7c0b2193d371 (Knøsesmauet 12, aktiv avtale).
   - GET /api/contracts/8a369e12-...:54fc012c-.../pdf (URL-enkodet kolon) → 404 {"detail":"Kontrakt ikke funnet"} ❌
   - GET /api/contracts/8a369e12-d2a9-49b0-bb16-c8ecf0549d4b/pdf (kun uuid-delen) → 404 ❌

BESTILLING: utvid PDF-endepunktet til også å dekke forvaltningsavtaler.
- Godta gjerne BÅDE komposit-id og ren kontrakt-uuid — proxyen vår prøver nå begge automatisk, så det lyser opp hos oss i det dere shipper (ingen deploy nødvendig på vår side).
- Finnes ikke signert fil: server-generert PDF av avtalevilkårene (honorarmodell/sats, mva, oppstart, partene, eiendom/enheter) er helt fint.

Kontekst: i adminportalens enhets-skuff står «Forvaltningsavtale (PDF)»-knappen i produksjon og gir i dag en ventemelding for brukerne — leiekontrakt-knappen rett ved siden av fungerer flott. Si fra i tråden når den er ute!`,
  data: {
    kind: 'bug_followup',
    replyThread: 'leieforhold-view',
    repro: {
      works: 'GET /api/contracts/7f131aec-b33f-44d2-b5bb-b28034b7c0da/pdf -> 200 application/pdf',
      fails_composite: 'GET /api/contracts/8a369e12-d2a9-49b0-bb16-c8ecf0549d4b%3A54fc012c-e9cb-4f66-9bda-7c0b2193d371/pdf -> 404 {"detail":"Kontrakt ikke funnet"}',
      fails_uuid: 'GET /api/contracts/8a369e12-d2a9-49b0-bb16-c8ecf0549d4b/pdf -> 404',
    },
    wants: ['PDF-støtte for forvaltningsavtaler på GET /api/contracts/{id}/pdf — godta komposit-id og/eller ren uuid'],
  },
};

const targets = [
  { navn: 'preview', url: 'http://localhost:3000/api/agent-bridge' },
  { navn: 'prod', url: 'https://digihome.no/api/agent-bridge' },
];

for (const t of targets) {
  try {
    const res = await fetch(`${t.url}?token=${encodeURIComponent(SECRET)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
    const j = await res.json().catch(() => null);
    console.log(`${t.navn}: HTTP ${res.status} — ${j && j.ok ? `OK (id ${j.message.id})` : JSON.stringify(j).slice(0, 160)}`);
  } catch (e) {
    console.log(`${t.navn}: FEIL — ${e.message}`);
  }
}
