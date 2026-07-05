// Dedikert, ultralett helsesjekk for readiness-prober i produksjon.
// Ingen imports utover NextResponse, ingen DB, ingen avhengighet til den
// store catch-all-API-ruten — svarer alltid umiddelbart.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, service: 'digihome', ts: Date.now() });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
