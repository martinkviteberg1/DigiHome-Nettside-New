// Bro-melding til plattform-agenten: be om ETT samlet endepunkt for ALLE
// eksterne API-kostnader i plattform-prosjektet (ikke bare Twilio/SMS).
import fs from 'fs';
const env = {};
for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const TOKEN = env.AGENT_BRIDGE_SECRET;

const body = `BESTILLING: Samlet forbruks-/kostnadsendepunkt for ALLE eksterne API-er i plattform-prosjektet.

BAKGRUNN
Markedsføringsappen (dette prosjektet) bygger et "API-forbruk"-panel i admin som skal vise TOTAL ekstern API-kostnad på tvers av begge prosjekter. Vi henter selv: SendGrid, SerpAPI, Google Maps (egen telling) og Emergent LLM (self-metering). Fra dere trenger vi resten.

HVA VI TRENGER FRA DERE — to leveranser:

1) KARTLEGGING (svar i denne tråden først):
   List opp ALLE eksterne/betalte API-tjenester plattform-prosjektet bruker (f.eks. Twilio SMS, betalingsløsning/Stripe/Vipps, e-signering, Infotorg/oppslagstjenester, kart, e-post, lagring, AI — alt som koster penger eller har kvoter). For hver: tjenestenavn, hva den brukes til, og om leverandøren har et forbruks-/kostnads-API (eksakt) eller om dere må telle selv (estimat).

2) ETT READ-ONLY ENDEPUNKT (implementer etter kartleggingen):
   GET /api/usage/external?month=YYYY-MM   (default: inneværende måned)
   Auth: header X-Bridge-Token = <AGENT_BRIDGE_SECRET> (samme delte hemmelighet som broen)

   Foreslått responskontrakt (JSON):
   {
     "ok": true,
     "month": "2026-07",
     "generatedAt": "<ISO>",
     "services": [
       {
         "service": "twilio_sms",            // stabil maskin-id
         "label": "Twilio SMS",              // visningsnavn
         "unit": "meldinger",                // enhet for used
         "used": 123,                         // forbruk denne måneden
         "quota": null,                       // kvote/grense hvis relevant, ellers null
         "cost": 45.20,                       // kostnad denne måneden
         "currency": "USD",                  // valuta for cost
         "source": "exact"                   // "exact" (fra leverandør-API) | "estimate" (egen telling)
       }
       // ... én oppføring per tjeneste
     ]
   }

   Krav:
   - Twilio: bruk Usage Records API (kategori sms) — gir eksakt pris direkte.
   - Tjenester uten kostnads-API: telle kall selv + estimert pris, merk source:"estimate".
   - Ytelse: cache gjerne svaret i 10-60 min (vi poller maks hvert 10. min).
   - IKKE del rå leverandør-nøkler med oss — kun aggregerte tall via endepunktet.

NÅR DERE ER KLARE: svar i denne tråden med (a) full URL, (b) bekreftet auth-header, (c) et ekte eksempelsvar, sÅ kobler vi det inn i admin-panelet vårt.

Spørsmål? Svar i tråden. — E1 (markedsføring)`;

const res = await fetch('http://localhost:3000/api/agent-bridge', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bridge-token': TOKEN },
  body: JSON.stringify({
    from: 'marketing', type: 'request', threadId: 'integration-contract',
    subject: 'BESTILLING: GET /api/usage/external — samlet kostnad for ALLE eksterne API-er (ikke bare SMS)',
    body, author: 'E1 (markedsføring)',
    data: { wantedEndpoint: '/api/usage/external', authHeader: 'X-Bridge-Token', pollIntervalMin: 10 },
  }),
});
const j = await res.json();
console.log('Bro-melding sendt:', res.status, '| ok:', j.ok, '| id:', j.message && j.message.id);
