import fs from 'fs';
import { MongoClient } from 'mongodb';

for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const c = await MongoClient.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 8000 });
const db = c.db(process.env.DB_NAME || undefined);
console.log('DB:', db.databaseName);
const posts = await db.collection('posts').find({}).toArray();
console.log('antall posts:', posts.length);
for (const p of posts) {
  console.log('---');
  console.log(JSON.stringify({
    slug: p.slug, status: p.status, title: p.title,
    seoTitle: p.seoTitle || null,
    seoDescription: p.seoDescription ? p.seoDescription.slice(0, 100) : null,
    excerpt: p.excerpt ? p.excerpt.slice(0, 120) : null,
    tags: p.tags, publishedAt: p.publishedAt, updatedAt: p.updatedAt,
    coverImage: p.coverImage, contentLen: String(p.content || '').length,
    keys: Object.keys(p).join('|'),
  }, null, 1));
}
const one = posts.find((p) => p.status === 'published');
console.log('\nCONTENT SAMPLE (', one?.slug, '):\n', String(one?.content || '').slice(0, 900));
await c.close();
