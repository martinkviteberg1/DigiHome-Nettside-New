'use client';

import React from 'react';
import DeckKonsept from '@/components/investor/DeckKonsept';

/* /deck/<token> — ren ekstern lenke til investordecket. Låst til planen den ble delt med,
   valgfritt passord (satt av den som deler). Ingen admin-kontroller vises i denne modusen. */
export default function EksterntDeck({ params }) {
  const token = String(params?.token || '');
  return <DeckKonsept token={token} adminKey="" planId="" techId="" />;
}
