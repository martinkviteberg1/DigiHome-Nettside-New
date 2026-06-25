'use client';

// Mountes én gang i root layout. Sporer sidevisninger ved hver rute-endring.
// Hopper over admin-ruter (skal ikke forurense besoksstatistikken).

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics';

export default function SiteAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin')) return;
    track('pageview');
  }, [pathname]);
  return null;
}
