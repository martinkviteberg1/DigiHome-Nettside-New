import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb, clean } from '@/lib/mongodb';

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
