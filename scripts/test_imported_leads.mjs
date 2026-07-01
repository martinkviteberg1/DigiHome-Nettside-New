// Local unit test of imported-leads lib (parse + import + summary + cleanup).
import { MongoClient } from 'mongodb';
import fs from 'fs';
import { parseCsv, normalizeRecord, importRecords, summarizeImported, IMPORTED_COLL } from '../lib/imported-leads.js';

const env = {};
for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const csv = `Navn;E-post;Telefon;Adresse;Postnr;Status;Kilde;Opprettet;Kontraktsverdi
Ola Testperson;ola@e2e-import.test;90000001;Storgata 1;5003;Vunnet;Meta;01.02.2025;24000
Kari Testperson;kari@e2e-import.test;90000002;Lilleveien 2;0170;Kontaktet;Finn;15.03.2025;
Per Testperson;per@e2e-import.test;90000003;Bakkegata 3;7010;Ny;Telefon;2025-04-20;
Duplikat Ola;ola@e2e-import.test;90000001;Storgata 1;5003;Vunnet;facebook;01.02.2025;24000`;

const parsed = parseCsv(csv);
console.log('DELIM headers:', parsed.headers);
console.log('rows parsed:', parsed.rows.length);
console.log('sample normalized:', JSON.stringify(normalizeRecord(parsed.rows[0]), null, 1));

const client = new MongoClient(env.MONGO_URL);
await client.connect();
const db = client.db(env.DB_NAME);

const res = await importRecords(db, parsed.rows, { batchLabel: 'E2E-UNIT-TEST', source: 'csv' });
console.log('\nIMPORT RESULT:', JSON.stringify(res, null, 1));

const summary = await summarizeImported(db);
console.log('\nSUMMARY:', JSON.stringify(summary, null, 1));

// Cleanup: remove the test batch
const del = await db.collection(IMPORTED_COLL).deleteMany({ import_batch_label: 'E2E-UNIT-TEST' });
console.log('\nCLEANUP deleted:', del.deletedCount);
const after = await db.collection(IMPORTED_COLL).countDocuments({});
console.log('imported_leads remaining:', after);

await client.close();
