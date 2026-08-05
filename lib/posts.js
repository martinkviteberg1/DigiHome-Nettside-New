import { getDb, clean } from '@/lib/mongodb';

// Server-side DB-hjelpere for blogg/nyheter. Brukes direkte i server-komponenter
// (anbefalt fremfor å kalle egne API-ruter fra server-komponenter).

export async function getPublishedPosts(limit = 100) {
  try {
    const db = await getDb();
    // Aggregering i stedet for find(): vi vil ha lesetid på oversiktskortene,
    // men fortsatt ikke sende hele brødteksten til klienten. $strLenCP måler
    // innholdet server-side, og $project fjerner content etterpå.
    // 1450 tegn/min ≈ 225 ord/min for norsk fagtekst (ca. 6,5 tegn per ord
    // inkludert mellomrom) — samme grunnlag som readingTime() i lib/markdown.
    const posts = await db.collection('posts')
      .aggregate([
        { $match: { status: 'published' } },
        {
          $addFields: {
            readMinutes: {
              $max: [1, { $ceil: { $divide: [{ $strLenCP: { $ifNull: ['$content', ''] } }, 1450] } }],
            },
          },
        },
        { $project: { content: 0 } },
        { $sort: { publishedAt: -1, createdAt: -1 } },
        { $limit: limit },
      ])
      .toArray();
    return posts.map(clean);
  } catch (e) { return []; }
}

export async function getPostBySlug(slug) {
  try {
    const db = await getDb();
    const post = await db.collection('posts').findOne({ slug, status: 'published' });
    return post ? clean(post) : null;
  } catch (e) { return null; }
}

export async function getAllPublishedSlugs() {
  try {
    const db = await getDb();
    const posts = await db.collection('posts')
      .find({ status: 'published' })
      .project({ slug: 1, updatedAt: 1, publishedAt: 1 })
      .toArray();
    return posts.map(clean);
  } catch (e) { return []; }
}
