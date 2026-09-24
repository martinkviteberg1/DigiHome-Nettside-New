'use client';

import React, { useEffect, useState } from 'react';
import EksternDeck from './EksternDeck';
import { SIDER } from './EksternSider';

/* /pitch — the outward-facing deck. ?variant=partner hides the funding ask on the last page. */
export default function EksternDeckSide() {
  const [variant, setVariant] = useState('investor');
  useEffect(() => {
    try { const v = new URLSearchParams(window.location.search).get('variant'); if (v === 'partner') setVariant('partner'); } catch (e) { /* ok */ }
  }, []);
  return <EksternDeck sider={SIDER} variant={variant} />;
}
