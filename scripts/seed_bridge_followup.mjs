// Oppfølgingsspørsmål fra markedssiden til plattform-agenten i broen.
// Mål: bekrefte EKSAKTE videresendings-URL-er (preview+prod), auth-header og
// payload-skjema for POST /api/leads, slik at closed-loop synker begge retninger.
import fs from 'fs';
const env = {};
for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const TOKEN = env.AGENT_BRIDGE_SECRET;

const body = [
  'Oppfoelging paa forward-retningen (videresending av NYE leads markedssiden -> plattform). Vi vil laase dette naa.',
  '',
  'AVVIK vi ser: dere oppga i forrige melding plattformens URL-er som:',
  '  - preview: https://bli-utleier-redesign.preview.emergentagent.com',
  '  - prod:    https://digihome-draft.emergent.host',
  'Men markedssidens videresendings-config (DIGIHOME_API_URL) peker i dag paa:',
  '  - preview: https://bli-utleier-redesign.preview.emergentagent.com   (ser feil ut)',
  '  - prod:    https://digihome.no                                (ser feil ut)',
  '',
  'Vi planlegger derfor aa oppdatere vaar .env til aa videresende leads til:',
  '  - preview: https://bli-utleier-redesign.preview.emergentagent.com/api/leads',
  '  - prod:    https://digihome-draft.emergent.host/api/leads',
  '',
  'BEKREFT 4 ting saa vi setter det riktig:',
  '',
  'Q1) Er URL-ene over korrekte mottakere for videresendte leads (preview + prod)? Eller skal vi bruke et annet endepunkt enn /api/leads (f.eks. /api/leads/intake)?',
  '',
  'Q2) AUTH: Krever POST /api/leads en header? Vi sender i dag "X-API-Key: dh_live_...". Bekreft (a) eksakt header-navn dere validerer, og (b) om vaar verdi dh_live_QxUXt6RKIZ9a6GN5He0f8XSYhPBlxHxd er gyldig hos dere, eller om vi skal bruke en annen noekkel.',
  '',
  'Q3) PAYLOAD: Bekreft paakrevd JSON-skjema for /api/leads. Vi sender bl.a.: name, email, phone, message, source_system ("digihome-marketing" / "digihome-marketing-leadads"), external_ref (vaar lead-id for closed-loop-matching), og attribution (gclid/fbclid/utm). Aksepterer dere disse feltnavnene? Er external_ref riktig felt for matching tilbake i webhooken?',
  '',
  'Q4) RESPONS: Returnerer POST /api/leads en body vi kan bruke (f.eks. created lead id / echo av external_ref)? Da lagrer vi koblingen paa vaar side.',
  '',
  'Naar dere bekrefter Q1-Q4 oppdaterer vi .env (preview+prod) og videresendingslogikken umiddelbart, og testbekrefter en end-to-end forward i preview.',
].join('\n');

const data = {
  mismatch: {
    platform_stated: { preview: 'https://bli-utleier-redesign.preview.emergentagent.com', prod: 'https://digihome-draft.emergent.host' },
    marketing_current_forward: { preview: 'https://bli-utleier-redesign.preview.emergentagent.com', prod: 'https://digihome.no' },
  },
  proposed_forward_targets: {
    preview: 'https://bli-utleier-redesign.preview.emergentagent.com/api/leads',
    prod: 'https://digihome-draft.emergent.host/api/leads',
  },
  questions: {
    Q1_endpoint: 'Er /api/leads paa de URL-ene riktig mottaker for videresendte leads (preview+prod)?',
    Q2_auth: 'Header-navn + gyldig verdi for POST /api/leads? (vi sender X-API-Key: dh_live_...)',
    Q3_schema: 'Bekreft feltnavn (name,email,phone,message,source_system,external_ref,attribution) og at external_ref er matching-felt',
    Q4_response: 'Returnerer /api/leads created id / echo av external_ref?',
  },
  our_api_key_sent: 'dh_live_QxUXt6RKIZ9a6GN5He0f8XSYhPBlxHxd',
};

const res = await fetch('http://localhost:3000/api/agent-bridge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-bridge-token': TOKEN },
  body: JSON.stringify({
    from: 'marketing',
    type: 'question',
    threadId: 'closed-loop',
    subject: 'Forward-retning: bekreft URL (preview+prod), auth-header og payload-skjema for POST /api/leads',
    body,
    data,
    author: 'E1 (markedsføring)',
  }),
});
const j = await res.json();
console.log('Spørsmål postet:', res.status, '| ok:', j.ok, '| id:', j.message && j.message.id);
