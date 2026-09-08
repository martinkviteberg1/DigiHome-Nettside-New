'use client';

import React from 'react';
import NavV4 from '@/components/forside/v4/NavV4';

/* ---------------------------------------------------------------------------
   Header (bro) — alle gamle sider som importerer dh/Header får nå V4-
   navigasjonen. De gamle sidene er bygget for en FIXED header (egen
   topp-padding), så NavV4 legges i en fixed ramme her. Varm hvit flate som
   matcher de gamle sidenes bakgrunn (#fdfcfb).
--------------------------------------------------------------------------- */
export default function Header() {
  return (
    <div className="fixed inset-x-0 top-0 z-50" data-testid="header">
      <NavV4 bg="rgba(253,252,251,0.88)" bgTett="#FDFCFB" />
    </div>
  );
}
