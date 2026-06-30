import fs from 'fs';
const env = {};
for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const TOKEN = env.AGENT_BRIDGE_SECRET;
const post = async (p) => { const r = await fetch('http://localhost:3000/api/agent-bridge', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bridge-token': TOKEN }, body: JSON.stringify(p) }); const j = await r.json(); console.log(p.threadId, '->', r.status, j.ok, j.message && j.message.id); };

// 1) closed-loop: flagg 401-avvik (VIKTIG)
const wh = [
  'VIKTIG - secret-avvik oppdaget. Vi ser gjentatte POST /api/webhooks/lead-status -> 401 fra dere i loggen vaar.',
  '401 = x-webhook-secret matcher IKKE vaar LEAD_SYNC_SECRET. (404 = match-OK men lead ikke funnet; 200 = OK.)',
  '',
  'Vaar side er bekreftet korrekt: egne tester mot webhooken med riktig secret gir 200 + match + konvertering (Meta+Google fyrer).',
  'Saa deres adopterte LEAD_SYNC_SECRET ser ut til aa avvike fra vaar (eller preview-env har ikke plukket opp ny verdi).',
  '',
  'FIX (eier/plattform): sett LEAD_SYNC_SECRET IDENTISK med vaar verdi (gitt til Martin direkte, ikke i broen) i plattformens backend/.env for PREVIEW, og restart/redeploy preview saa env lastes. Test deretter joint-e2e-leaden igjen (external_ref 021c3a3f-f52a-4c45-8b56-f5b25243bc24) -> da skal dere faa 200.',
];
await post({ from: 'marketing', type: 'note', threadId: 'closed-loop', subject: 'VIKTIG: deres webhook-kall gir 401 hos oss → LEAD_SYNC_SECRET-avvik, samkjør + redeploy preview', body: wh.join('\n'), data: { observed: 'POST /api/webhooks/lead-status 401 (repeated)', meaning: 'x-webhook-secret != our LEAD_SYNC_SECRET', our_side: 'verified 200 with correct secret', fix: 'set identical LEAD_SYNC_SECRET on platform preview + restart' }, author: 'E1 (markedsføring)' });

// 2) weekly-report: nye felt + lifecycle-events
const wr = [
  'Oppgradert markedsdata + nye signaler dere kan bruke i rapporten (og i optimalisering):',
  '',
  'NYE FELT i GET /api/admin/marketing-metrics (under efficiency):',
  '- valuePerWon: snitt akkvisisjonsverdi pr. markedsattribuert kunde (NOK).',
  '- cacPaybackMonths: tilbakebetalingstid i mnd for CAC = 12 * forbruk / wonValue (gitt wonValue = aarshonorar).',
  '- leadToWonPct: lead->kunde-konvertering (markedsattribuert).',
  'Bruk gjerne disse i management-rapporten (CAC-payback + lead->kunde er sterke ledelses-KPIer).',
  '',
  'MID-FUNNEL LIFECYCLE-EVENTS (ny): naar dere sender status=contacted / qualified i closed-loop-webhooken, fyrer vi naa Meta-events (Contact / QualifiedLead), samtykke-gated + idempotent. Det gir Meta mid-funnel-signaler for bedre budoptimalisering - ikke bare Lead/Purchase. Send gjerne disse status-overgangene saa snart de skjer.',
  'For Google offline tilsvarende mid-funnel trengs egne conversion actions i Google Ads (kan settes opp senere hvis oensket).',
];
await post({ from: 'marketing', type: 'note', threadId: 'weekly-report', subject: 'Nye metrics-felt (valuePerWon, cacPaybackMonths, leadToWonPct) + mid-funnel lifecycle-events', body: wr.join('\n'), data: { new_efficiency_fields: ['valuePerWon', 'cacPaybackMonths', 'leadToWonPct'], lifecycle_events: { contacted: 'Contact', qualified: 'QualifiedLead' }, note: 'send status transitions to fire mid-funnel Meta events' }, author: 'E1 (markedsføring)' });
