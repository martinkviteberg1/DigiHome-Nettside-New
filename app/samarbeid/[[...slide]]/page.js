/* /samarbeid[/<kapittel>] – den private invitasjonen. SERVER-KOMPONENT: cookien sjekkes her, før noe sendes.
 *  Uten gyldig sesjon rendres bare gaten (klient) – brevets tekst ligger i en server-only modul og havner aldri i JS-bundlen.
 *  Med gyldig sesjon sendes teksten som props til brevet. Alltid dynamisk og uten caching. */
import React from 'react';
import { cookies } from 'next/headers';
import Gate from '../../../components/samarbeid/Gate';
import Brev from '../../../components/samarbeid/brev/Brev';
import { HERO_SIZES, INNHOLD, portrettKilder } from '../../../components/samarbeid/brev/innhold';
import { SAMARBEID_COOKIE, samarbeidAutentisert, samarbeidPassord } from '../../../lib/samarbeid-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* Gaten forhåndslaster hero-portrettene (bare bilde-URL-er, ingen tekst) mens passordet skrives – så står invitasjonen klar i det den åpnes. */
const VARM = INNHOLD.AVSENDERE.map((p) => ({ ...portrettKilder(p), sizes: HERO_SIZES }));

export default function SamarbeidPage({ params }) {
  const cookie = cookies().get(SAMARBEID_COOKIE)?.value;
  const authed = samarbeidAutentisert(cookie);
  if (!authed) return <Gate configured={!!samarbeidPassord()} varm={VARM} />;
  const start = Array.isArray(params?.slide) ? params.slide[0] : params?.slide;
  return <Brev start={start || ''} innhold={INNHOLD} />;
}
