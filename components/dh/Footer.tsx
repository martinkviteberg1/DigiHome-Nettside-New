'use client';

import React from 'react';
import FooterV4 from '@/components/forside/v4/FooterV4';

/* ---------------------------------------------------------------------------
   Footer (bro) — alle sider som importerer den gamle dh/Footer får nå V4-
   footeren. Beholder `org`-proppen (signeringssider). `variant` ignoreres.
--------------------------------------------------------------------------- */
export default function Footer({ org }: { org?: { company_name?: string; org_number?: string; company_address?: string; company_email?: string; company_phone?: string } | null; variant?: string }) {
  return <FooterV4 org={org || undefined} />;
}
