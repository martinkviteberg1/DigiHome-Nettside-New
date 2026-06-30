import { MongoClient } from 'mongodb';

const url = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'your_database_name';
const client = new MongoClient(url);

function iso(daysAgo = 0, hour = 12) {
  const d = new Date(Date.now() - daysAgo * 86400000);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const UTLEIER_STEPS = ['Velkommen', 'Adresse', 'Eiendommen', 'Kontakt', 'Oppsummering'];
const LEIETAKER_STEPS = ['Velkommen', 'Kontakt', 'Ønsker', 'Detaljer', 'Oppsummering'];

function mkEvent(type, sid, form, extraMeta = {}) {
  return {
    id: 'seed-' + Math.random().toString(36).slice(2),
    type,
    ts: iso(Math.floor(Math.random() * 6), 10 + Math.floor(Math.random() * 8)),
    day: iso(0).slice(0, 10),
    visitorId: sid,
    sessionId: sid,
    isNew: true,
    path: form === 'utleier' ? '/bli-utleier' : '/bli-leietaker',
    channel: 'Direkte',
    device: 'desktop', browser: 'Chrome', os: 'macOS',
    country: 'Norge',
    meta: { form, ...extraMeta },
  };
}

async function main() {
  await client.connect();
  const db = client.db(dbName);
  const events = db.collection('events');
  await events.deleteMany({ 'meta.seed': true });

  const docs = [];
  // Simuler funnel for utleier: variant A vs B med ulik konvertering.
  // A: 40 starter, 12 fullfører (30%). B: 40 starter, 18 fullfører (45%).
  const configs = [
    { form: 'utleier', steps: UTLEIER_STEPS, variant: 'A', starts: 40, reach: [40, 34, 26, 18, 13], submits: 12 },
    { form: 'utleier', steps: UTLEIER_STEPS, variant: 'B', starts: 40, reach: [40, 36, 30, 24, 20], submits: 18 },
    { form: 'leietaker', steps: LEIETAKER_STEPS, variant: 'A', starts: 30, reach: [30, 25, 19, 14, 11], submits: 10 },
    { form: 'leietaker', steps: LEIETAKER_STEPS, variant: 'B', starts: 30, reach: [30, 27, 23, 18, 15], submits: 14 },
  ];

  let sidCounter = 0;
  for (const c of configs) {
    for (let i = 0; i < c.starts; i++) {
      const sid = `seedsid-${c.form}-${c.variant}-${sidCounter++}`;
      const ab = { onboard_cta: c.variant };
      docs.push(mkEvent('form_start', sid, c.form, { seed: true, ab }));
      // hvor langt nådde denne brukeren?
      for (let s = 0; s < c.steps.length; s++) {
        if (i < c.reach[s]) {
          docs.push(mkEvent('form_step', sid, c.form, { seed: true, ab, step: s + 1, label: c.steps[s] }));
        }
      }
      if (i < c.submits) {
        docs.push(mkEvent('lead_submit', sid, c.form, { seed: true, ab, leadType: c.form === 'utleier' ? 'huseier' : 'leietaker' }));
      }
    }
  }

  await events.insertMany(docs);
  console.log(`Seeded ${docs.length} funnel-events (markert meta.seed=true).`);
  await client.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
