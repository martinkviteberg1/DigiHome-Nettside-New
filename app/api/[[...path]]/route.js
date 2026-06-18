import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb, clean } from '@/lib/mongodb';

const RENTAL_LABELS = { dynamisk: 'Dynamisk', korttid: 'Korttid', kortid: 'Korttid', langtid: 'Langtid' };

function streetFromAddress(addr) {
  return (addr || '').split(',')[0].trim();
}

function normalizeListing(l) {
  const street = streetFromAddress(l.address);
  const title = (l.title && l.title.trim()) ? l.title.trim() : (street || `Bolig i ${l.city || 'Norge'}`);
  const rent = Number(l.monthly_rent) || 0;
  const images = Array.isArray(l.images) ? l.images.filter(Boolean) : [];
  return {
    id: l.id,
    url: l.public_url || '',
    title,
    city: l.city || '',
    street,
    sqm: Number(l.sqm) || null,
    bedrooms: Number(l.bedrooms) || null,
    bathrooms: Number(l.bathrooms) || null,
    rentalModel: (l.rental_model || '').toLowerCase(),
    rentalLabel: RENTAL_LABELS[(l.rental_model || '').toLowerCase()] || '',
    status: l.status || '',
    monthlyRent: rent,
    currency: l.currency || 'NOK',
    cover: l.cover_image || images[0] || null,
    images: images.slice(0, 8),
    imageCount: Number(l.image_count) || images.length,
  };
}

function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }));
}

async function handleRoute(request, { params }) {
  const { path = [] } = params;
  const route = `/${path.join('/')}`;
  const method = request.method;

  try {
    // --- Adresse-autofullføring (Geonorge, gratis offentlig API, ingen nøkkel) ---
    if (route === '/address' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const q = (searchParams.get('q') || '').trim();
      if (q.length < 3) return cors(NextResponse.json({ suggestions: [] }));
      try {
        const url = `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(q)}&fuzzy=true&treffPerSide=6&side=0&asciiKompatibel=true`;
        const r = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!r.ok) return cors(NextResponse.json({ suggestions: [] }));
        const data = await r.json();
        const seen = new Set();
        const suggestions = (data.adresser || [])
          .map((a) => {
            const text = a.adressetekst || '';
            const sub = `${a.postnummer || ''} ${a.poststed || ''}`.trim();
            return { text, sub, label: sub ? `${text}, ${sub}` : text };
          })
          .filter((s) => {
            if (!s.text || seen.has(s.label)) return false;
            seen.add(s.label);
            return true;
          });
        return cors(NextResponse.json({ suggestions }));
      } catch (e) {
        return cors(NextResponse.json({ suggestions: [] }));
      }
    }

    // --- Boliger (proxy til DigiHome-plattformens public listings API) ---
    if (route === '/listings' && method === 'GET') {
      const apiBase = process.env.DIGIHOME_API_URL;
      const apiKey = process.env.DIGIHOME_API_KEY;
      if (!apiBase || !apiKey) {
        return cors(NextResponse.json({ tenant: null, count: 0, listings: [], error: 'not_configured' }));
      }
      const { searchParams } = new URL(request.url);
      const limit = searchParams.get('limit') ?? '0';
      const status = searchParams.get('status') ?? 'published';
      try {
        const upstream = `${apiBase}/api/public/listings?limit=${encodeURIComponent(limit)}&status=${encodeURIComponent(status)}`;
        const r = await fetch(upstream, {
          headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
          next: { revalidate: 600 },
        });
        if (!r.ok) {
          return cors(NextResponse.json({ tenant: null, count: 0, listings: [], error: `upstream_${r.status}` }));
        }
        const data = await r.json();
        const listings = Array.isArray(data.listings)
          ? data.listings.map(normalizeListing).filter((l) => l.cover)
          : [];
        return cors(NextResponse.json({ tenant: data.tenant || null, count: listings.length, listings }));
      } catch (e) {
        return cors(NextResponse.json({ tenant: null, count: 0, listings: [], error: 'fetch_failed' }));
      }
    }

    const db = await getDb();

    // Health
    if ((route === '/' || route === '/root') && method === 'GET') {
      return cors(NextResponse.json({ message: 'DigiHome API', ok: true }));
    }

    // --- Leads ---
    if (route === '/leads' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }

      const hasSomething = body.name || body.email || body.phone || body.address;
      if (!hasSomething) {
        return cors(NextResponse.json({ error: 'Mangler kontaktinformasjon' }, { status: 400 }));
      }

      const lead = {
        id: uuidv4(),
        name: (body.name || '').toString().slice(0, 200),
        email: (body.email || '').toString().slice(0, 200),
        phone: (body.phone || '').toString().slice(0, 60),
        address: (body.address || '').toString().slice(0, 300),
        propertyType: (body.propertyType || '').toString().slice(0, 120),
        message: (body.message || '').toString().slice(0, 4000),
        source: (body.source || 'web').toString().slice(0, 60),
        status: 'new',
        createdAt: new Date().toISOString(),
      };

      await db.collection('leads').insertOne(lead);
      return cors(NextResponse.json({ ok: true, lead: clean(lead) }, { status: 201 }));
    }

    if (route === '/leads' && method === 'GET') {
      const leads = await db.collection('leads').find({}).sort({ createdAt: -1 }).limit(500).toArray();
      return cors(NextResponse.json(leads.map(clean)));
    }

    return cors(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }));
  } catch (error) {
    console.error('API Error:', error);
    return cors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }));
  }
}

export const GET = handleRoute;
export const POST = handleRoute;
export const PUT = handleRoute;
export const DELETE = handleRoute;
export const PATCH = handleRoute;
