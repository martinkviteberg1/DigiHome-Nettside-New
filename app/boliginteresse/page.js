import { redirect } from 'next/navigation';
import { getListingSlugByPropertyId } from '@/lib/listings-server';
import PropertyInterestPage from '@/components/dh/PropertyInterestPage';

export const metadata = {
  title: 'Meld interesse for bolig | DigiHome',
  description: 'Bekreft interesse for en ledig bolig hos DigiHome.',
  robots: { index: false, follow: false },
};

// GAMMEL INNGANG — beholdes for e-post som ALT er sendt.
//
// Nyhetsbrevets boligkort peker nå til /ledige-boliger/<slug>: der er boligen
// presentert ordentlig, utleieenheten vises, og lenken kan trygt videresendes.
// Men brev som allerede ligger i innboksene peker hit, og de kan ikke endres.
// Derfor videresender vi til boligsiden med tokenet intakt, slik at ett-klikks
// interesse fortsetter å virke for mottakeren.
//
// Finner vi ikke boligen (slettet, uten bilder), faller vi tilbake til den
// gamle bekreftelsessiden i stedet for å gi 404 — en registrert interesse er
// for verdifull til å kastes på en teknikalitet.
const KEEP = ['c', 'r', 'pt', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

const App = async ({ searchParams }) => {
  const pid = typeof searchParams?.property === 'string' ? searchParams.property : '';
  const hit = pid ? await getListingSlugByPropertyId(pid) : null;
  if (hit?.slug) {
    const qs = new URLSearchParams();
    for (const k of KEEP) {
      const v = searchParams?.[k];
      if (typeof v === 'string' && v) qs.set(k, v);
    }
    const q = qs.toString();
    redirect(`/ledige-boliger/${hit.slug}${q ? `?${q}` : ''}`);
  }
  return <PropertyInterestPage />;
};

export default App;
