// ANALYSE: kanal \u2192 kunde over 90 dager. Ett vunnet salg pr. m\u00e5ned gj\u00f8r
// 30-dagersvinduet st\u00f8yfullt; 90 dager viser om en kanal FAKTISK gir kunder.
//   node scripts/analyse-channel-90d.mjs
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const KEY = process.env.ADMIN_KEY;
const r = await fetch(`https://digihome.no/api/admin/leads?key=${KEY}&limit=1000`, { signal: AbortSignal.timeout(60000) });
if (r.status !== 200) { console.log('status', r.status); process.exit(1); }
const all = (await r.json())?.leads || [];
const now = Date.now();
const days = (d) => (now - new Date(d).getTime()) / 86400000;

const chan = (l) => {
  const a = l.attribution || {};
  const s = String(a.source || l.source || '').toLowerCase();
  if (/google|adwords/.test(s)) return 'google';
  if (/meta|facebook|fb|instagram|ig/.test(s)) return 'meta';
  if (/phone|telefon|ring/.test(s)) return 'telefon';
  if (/crm|plattform/.test(s)) return 'crm-plattform';
  if (!s) return '(ingen kilde)';
  return s;
};

for (const win of [30, 90]) {
  const rows = all.filter((l) => days(l.createdAt) <= win && l.lead_type === 'huseier');
  console.log(`\n══════════ HUSEIER-LEADS SISTE ${win} DAGER (${rows.length}) ══════════`);
  const m = new Map();
  for (const l of rows) {
    const k = chan(l);
    const cur = m.get(k) || { leads: 0, won: 0, offer: 0, disq: 0, aktive: 0 };
    cur.leads += 1;
    if (l.status === 'won') cur.won += 1;
    else if (l.status === 'offer') cur.offer += 1;
    else if (l.status === 'disqualified' || l.status === 'lost') cur.disq += 1;
    else cur.aktive += 1;
    m.set(k, cur);
  }
  for (const [k, v] of [...m.entries()].sort((a, b) => b[1].leads - a[1].leads)) {
    console.log(`· ${k.padEnd(16)} leads ${String(v.leads).padStart(3)} · vunnet ${v.won} · tilbud ute ${v.offer} · diskvalifisert ${v.disq} · i arbeid ${v.aktive}`);
  }
}

console.log('\n══════════ ALLE VUNNET (uansett alder) ══════════');
for (const l of all.filter((x) => x.status === 'won').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))) {
  const a = l.attribution || {};
  console.log(`· ${String(l.createdAt).slice(0, 10)} · ${chan(l).padEnd(14)} · kampanje ${String(a.campaign || '-').padEnd(26)} · landing ${a.landing_page || '-'}`);
}
