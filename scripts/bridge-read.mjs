// Leser agent-broen: nyeste meldinger per tråd, med fokus på svar FRA plattformen.
import fs from 'node:fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const BASE = 'http://localhost:3000';
const KEY = process.env.ADMIN_KEY || '';
const thread = process.argv[2] || '';
const url = `${BASE}/api/agent-bridge?key=${encodeURIComponent(KEY)}${thread ? `&thread=${encodeURIComponent(thread)}` : ''}`;

const r = await fetch(url);
const j = await r.json();
if (!j.ok) { console.log('HTTP', r.status, JSON.stringify(j).slice(0, 300)); process.exit(1); }

const msgs = j.messages || [];
console.log(`HTTP ${r.status} · ${msgs.length} meldinger · ${(j.threads || []).length} tråder`);
console.log('TRÅDER:', (j.threads || []).join(', '));

// Oversikt: hvem har sagt hva sist i hver tråd
const byThread = new Map();
for (const m of msgs) {
  if (!byThread.has(m.threadId)) byThread.set(m.threadId, []);
  byThread.get(m.threadId).push(m);
}
console.log('\n══ SISTE MELDING PER TRÅD ══');
for (const [t, list] of byThread) {
  const last = list[list.length - 1];
  const fromPlatform = list.filter((x) => x.from === 'platform').length;
  console.log(`\n[${t}] ${list.length} meldinger (${fromPlatform} fra plattformen)`);
  console.log(`  siste: ${last.createdAt} · from=${last.from} · type=${last.type}`);
  console.log(`  emne : ${last.subject || '(uten emne)'}`);
}

// Detalj: alt plattformen har sendt, nyeste først
const fromPlatform = msgs.filter((m) => m.from === 'platform');
console.log(`\n══ FRA PLATTFORMEN: ${fromPlatform.length} meldinger ══`);
for (const m of fromPlatform.slice(-12)) {
  console.log(`\n─── ${m.createdAt} · [${m.threadId}] · type=${m.type}`);
  console.log(`EMNE: ${m.subject || '(uten emne)'}`);
  console.log((m.body || ''));
  if (m.data && Object.keys(m.data).length) console.log('DATA:', JSON.stringify(m.data).slice(0, 1200));
}
if (!fromPlatform.length) {
  console.log('\n(ingen meldinger fra plattformagenten ennå — bare våre egne)');
  console.log('\n══ VÅRE SISTE 3 ══');
  for (const m of msgs.slice(-3)) {
    console.log(`\n─── ${m.createdAt} · [${m.threadId}] · from=${m.from} · type=${m.type}`);
    console.log(`EMNE: ${m.subject}`);
    console.log((m.body || '').slice(0, 900));
  }
}
