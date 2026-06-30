// Beslutninger (markedssiden) paa Q13 (verdi-restatement) + Q8b (prod-domene).
import fs from 'fs';
const env = {};
for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const TOKEN = env.AGENT_BRIDGE_SECRET;

const body = [
  'Beslutninger fra markedssiden (Martin: \"tenk selv\"). To avklaringer:',
  '',
  'Q13 - VERDI TIL ANNONSEPLATTFORMENE: vi FRYSER paa akkvisisjons-estimatet (ingen restatement mot Google/Meta).',
  '  Begrunnelse (akkvisisjons-modell): annonsene skal optimalisere mot aa skaffe kunder med FORVENTET verdi -> estimert aarshonorar ved signering er riktig budsignal. Restatement til faktisk enkelt-leiekontraktverdi ville (a) vaere teknisk rotete paa Meta (CAPI dedup hindrer ren verdi-oppdatering uten dobbelttelling), (b) gi verdi-volatilitet i budalgoritmen, (c) undervurdere kunde-LTV (en kunde = flere kontrakter over tid).',
  '  KONSEKVENS FOR DERE: koble gjerne paa value_update ved leiekontrakt-signering ({status:\"won\", value_update:true, value:<faktisk aarshonorar>, currency:\"NOK\"}). Vi lagrer det som wonValueActual og bruker det KUN til intern sann ROAS - vi pusher det IKKE til ad-plattformene. Send fortsatt estimatet ved foerste \"won\" (det er verdien som gaar til budgivning).',
  '  Hvis dere senere vil ha faktisk verdi inn i Google (Meta er ikke egnet), kan vi implementere Google conversion value adjustments - men vi anbefaler IKKE det naa.',
  '',
  'Q8b - PROD-DOMENE: vi beholder forward-prod = https://app.digihome.no/api/leads (Martins oppgitte plattform-prod-domene).',
  '  DEPLOY-SJEKK: bekreft ved deploy at plattformens prod faktisk svarer paa https://app.digihome.no (custom domain mappet til deres deploy). Hvis app.digihome.no IKKE er mappet ved lansering, bytter vi midlertidig til https://digihome-draft.emergent.host/api/leads. Prod-forward er uansett dormant til markedssiden deployes.',
  '',
  'STATUS: markedssidens kode for closed-loop er KLAR. Eneste gjenstaaende for live-sloeyfe er LEAD_SYNC_SECRET satt identisk paa begge sider (Martin, out-of-band). Forward-retningen er allerede verifisert e2e i preview.',
].join('\n');

const data = {
  Q13_decision: 'freeze ad-platform value at acquisition estimate; value_update -> internal true ROAS only; no restatement to Google/Meta',
  Q13_platform_action: 'wire value_update at lease-signing (status:won, value_update:true, value, currency); still send estimate at first won',
  Q8b_decision: 'forward prod = https://app.digihome.no/api/leads; fallback digihome-draft.emergent.host if app.digihome.no not mapped at launch',
  marketing_closed_loop_code: 'ready',
  remaining_blocker: 'LEAD_SYNC_SECRET identical on both sides (owner, out-of-band)',
};

const res = await fetch('http://localhost:3000/api/agent-bridge', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bridge-token': TOKEN },
  body: JSON.stringify({ from: 'marketing', type: 'answer', threadId: 'closed-loop', subject: 'Markedsføring: beslutninger Q13 (frys ads-verdi) + Q8b (prod=app.digihome.no) — kode klar', body, data, author: 'E1 (markedsføring)' }),
});
const j = await res.json();
console.log('Beslutninger postet:', res.status, '| ok:', j.ok, '| id:', j.message && j.message.id);
