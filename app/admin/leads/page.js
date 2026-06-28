import { redirect } from 'next/navigation';

// Konsolidert: all admin-funksjonalitet bor nå under /admin (med innlogging).
export const dynamic = 'force-dynamic';

export default function LeadsRedirect() {
  redirect('/admin');
}
