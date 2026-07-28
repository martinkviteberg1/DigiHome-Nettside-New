import { NextResponse } from 'next/server';

export function middleware(request) {
  const clean = new URL('/', request.url);
  clean.search = '';
  return NextResponse.redirect(clean, 308);
}

export const config = {
  matcher: ['/PartDetail.aspx'],
};
