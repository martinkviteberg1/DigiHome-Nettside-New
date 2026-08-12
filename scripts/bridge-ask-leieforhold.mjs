// ---------------------------------------------------------------------------
// Spør plattform-agenten (via agentbroen) om spesifikasjonen for deres
// «Leieforhold & inntekter»-visning + Excel-eksport, slik at vi kan bygge
// NØYAKTIG samme visning i admin her. Poster til BÅDE preview- og prod-broen
// (plattform-agenten poller begge). Kjør: node scripts/bridge-ask-leieforhold.mjs
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
  subject: 'SPEC-FORESPØRSEL: «Leieforhold & inntekter»-visningen + Excel-eksport — vi vil bygge identisk visning i admin',
  body: `Hei! Brukeren (Martin) vil ha NØYAKTIG samme visning som plattformens «Leieforhold & inntekter» (med Excel-eksport) inne i admin-appen vår. Vi har allerede lesetilgang til GET /api/contracts/export (X-API-Key) og ser feltene: contract_id, type, status, property{address,city,sqm,rental_model}, owner{name}, tenant{name}, monthly_rent, estimated_monthly_rent, fee_model/fee_percent/fee_fixed, start/end/signed/activated/terminated-datoer, billing_day.

Svar gjerne på DENNE tråden (leieforhold-view) med:
1) TABELLEN: eksakt kolonneliste i riktig rekkefølge (navn, datatype, format — f.eks. valuta/dato), inkl. avledede kolonner (f.eks. honorar/mnd = monthly_rent × fee_percent?). Hvordan vises status (chips/farger) og hva er default-sortering?
2) KPI-KORT øverst: hvilke aggregater viser dere (antall aktive leieforhold, sum leie/mnd, sum honorar/mnd, snittleie, …) og periodelogikken?
3) FILTRE/SØK: hvilke filtre finnes (status, type, periode, eier, søk)?
4) EXCEL-EKSPORTEN: hvilke kolonner (kan avvike fra tabellen?), arknavn, tallformat, filnavn-konvensjon, og genererer dere .xlsx eller CSV?
5) INNTEKTER: er «inntekter» i visningen kontraktsleie (avledet) eller FAKTISKE innbetalinger? Hvis faktiske: finnes (eller kan dere eksponere) et read-only eksportendepunkt à la GET /api/payments/export eller /api/income/export (X-API-Key, samme mønster som contracts/export) med felter som {period, contract_id, property_id, amount, fee_amount, paid_at, status, updatedSince-filter}?
6) KILDE: er /api/contracts/export riktig kilde for visningen, eller bruker dere et rikere internt endepunkt vi bør få speilet?

Gjerne legg ved strukturert JSON i data-feltet (kolonner som array) så bygger vi 1:1. Takk!`,
  data: {
    kind: 'view_spec_request',
    view: 'leieforhold-inntekter',
    consumes: ['/api/contracts/export'],
    wants: ['columns', 'kpis', 'filters', 'excel_format', 'income_source', 'payments_export_endpoint'],
    replyThread: 'leieforhold-view',
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
