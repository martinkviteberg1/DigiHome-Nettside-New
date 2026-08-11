import { NextResponse } from 'next/server';

// Produksjonsverten. Kun her håndheves clickjacking-vern på admin-konsollet,
// slik at Emergent-preview (annen vert) fortsatt kan vises i plattformens iframe.
const PROD_HOST = /(^|\.)digihome\.no$/i;

export function middleware(request) {
  const { pathname } = new URL(request.url);

  // Legacy: rydd bort gammel .aspx-URL med query til forsiden.
  if (pathname === '/PartDetail.aspx') {
    const clean = new URL('/', request.url);
    clean.search = '';
    return NextResponse.redirect(clean, 308);
  }

  // Clickjacking-vern på /admin i produksjon: hindrer at det innloggede
  // konsollet lastes i en iframe på et fremmed domene (UI-redress).
  const res = NextResponse.next();
  const host = (request.headers.get('host') || '').split(':')[0];
  if (PROD_HOST.test(host)) {
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  return res;
}

export const config = {
  matcher: ['/PartDetail.aspx', '/admin', '/admin/:path*'],
};
