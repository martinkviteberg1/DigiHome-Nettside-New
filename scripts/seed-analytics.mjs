// Seeder realistiske DEMO-analysehendelser i `events`-collection (siste 30 dager).
// Kjør: node scripts/seed-analytics.mjs  (MONGO_URL + DB_NAME settes inline fra .env)
// Disse kan slettes via admin → "Nullstill analyse" før lansering.
import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/app/.env', 'utf8').split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const MONGO_URL = env.MONGO_URL;
const DB_NAME = env.DB_NAME;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const weighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; }
  return pairs[0][0];
};

const CHANNELS = [['Organisk', 45], ['Direkte', 25], ['Sosialt', 15], ['Henvisning', 10], ['Betalt', 5]];
const SRC_BY_CH = {
  Organisk: ['google', 'bing'], Direkte: ['direct'], Sosialt: ['facebook', 'instagram', 'linkedin'],
  Henvisning: ['finn.no', 'hegnar.no'], Betalt: ['google', 'facebook'],
};
const DEVICES = [['mobil', 58], ['desktop', 38], ['nettbrett', 4]];
const BROWSERS = [['Chrome', 50], ['Safari', 35], ['Firefox', 7], ['Edge', 6], ['Samsung', 2]];
const OSES = [['iOS', 38], ['Android', 24], ['Windows', 22], ['macOS', 14], ['Linux', 2]];
const COUNTRIES = [['Norge', 88], ['Sverige', 4], ['Danmark', 3], ['Storbritannia', 3], ['USA', 2]];
const PAGES = [['/', 60], ['/bli-utleier', 22], ['/bli-leietaker', 10], ['/video', 8]];
const STEPS_UTL = ['Velkommen', 'Om deg', 'Eiendommen', 'Dine mål', 'Bekreft'];

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection('events');

  // Fjern tidligere demo (idempotent)
  await col.deleteMany({ 'meta.demo': true });

  const docs = [];
  const now = Date.now();
  for (let dayBack = 29; dayBack >= 0; dayBack--) {
    const base = now - dayBack * 86400000;
    const weekday = new Date(base).getDay();
    const dayFactor = (weekday === 0 || weekday === 6) ? 0.6 : 1; // færre i helg
    const sessions = Math.round((6 + Math.random() * 18) * dayFactor);

    for (let s = 0; s < sessions; s++) {
      const ch = weighted(CHANNELS);
      const device = weighted(DEVICES);
      const browser = weighted(BROWSERS);
      const os = weighted(OSES);
      const country = weighted(COUNTRIES);
      const tz = country === 'Norge' ? 'Europe/Oslo' : (country === 'Sverige' ? 'Europe/Stockholm' : country === 'Danmark' ? 'Europe/Copenhagen' : country === 'Storbritannia' ? 'Europe/London' : 'America/New_York');
      const source = pick(SRC_BY_CH[ch]);
      const medium = ch === 'Betalt' ? 'cpc' : (ch === 'Organisk' ? 'organic' : ch === 'Sosialt' ? 'social' : (ch === 'Henvisning' ? 'referral' : ''));
      const visitorId = randomUUID();
      const sessionId = randomUUID();
      const isNew = Math.random() < 0.7;
      const tsStart = base + Math.floor(Math.random() * 86400000);
      const common = { visitorId, sessionId, isNew, source, medium, campaign: ch === 'Betalt' ? 'vinterkampanje' : '', channel: ch, device, browser, os, tz, country, screenW: device === 'mobil' ? 390 : (device === 'nettbrett' ? 820 : 1440) };

      // 1-4 sidevisninger
      const pv = 1 + Math.floor(Math.random() * 4);
      let landed = weighted(PAGES);
      for (let i = 0; i < pv; i++) {
        const path = i === 0 ? landed : weighted(PAGES);
        const ts = new Date(tsStart + i * 45000);
        docs.push({ id: randomUUID(), type: 'pageview', ts: ts.toISOString(), day: ts.toISOString().slice(0, 10), path, referrer: ch === 'Organisk' ? 'https://www.google.com/' : (ch === 'Sosialt' ? `https://${source}.com/` : ''), ...common, meta: { demo: true } });
      }

      // Trakt
      const t0 = tsStart + pv * 45000;
      const doesSearch = Math.random() < 0.30;
      const startsForm = doesSearch && Math.random() < 0.55;
      if (doesSearch) {
        const ts = new Date(t0 + 5000);
        docs.push({ id: randomUUID(), type: 'address_search', ts: ts.toISOString(), day: ts.toISOString().slice(0, 10), path: '/', ...common, meta: { demo: true, selected: true } });
      }
      if (startsForm) {
        const isUtl = Math.random() < 0.7;
        const form = isUtl ? 'utleier' : 'leietaker';
        const stsBase = t0 + 10000;
        const tsfs = new Date(stsBase);
        docs.push({ id: randomUUID(), type: 'form_start', ts: tsfs.toISOString(), day: tsfs.toISOString().slice(0, 10), path: isUtl ? '/bli-utleier' : '/bli-leietaker', ...common, meta: { demo: true, form } });
        // Hvor langt kommer de i wizarden? (drop-off)
        const reach = 1 + Math.floor(Math.random() * 5); // 1..5 steg
        for (let st = 1; st <= reach; st++) {
          const tss = new Date(stsBase + st * 20000);
          docs.push({ id: randomUUID(), type: 'form_step', ts: tss.toISOString(), day: tss.toISOString().slice(0, 10), path: isUtl ? '/bli-utleier' : '/bli-leietaker', ...common, meta: { demo: true, form, step: st, label: STEPS_UTL[st - 1] } });
        }
        if (reach >= 5) {
          const tsl = new Date(stsBase + 6 * 20000);
          docs.push({ id: randomUUID(), type: 'lead_submit', ts: tsl.toISOString(), day: tsl.toISOString().slice(0, 10), path: isUtl ? '/bli-utleier' : '/bli-leietaker', ...common, meta: { demo: true, form, leadType: isUtl ? 'huseier' : 'leietaker' } });
        }
      }
    }
  }

  if (docs.length) await col.insertMany(docs);
  const total = await col.countDocuments({ 'meta.demo': true });
  console.log(`Seeded ${docs.length} demo-hendelser. Totalt demo i db: ${total}`);
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
