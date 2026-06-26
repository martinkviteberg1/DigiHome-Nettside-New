import { notFound } from 'next/navigation';
import { getLocation, relatedLocations, locations } from '@/lib/locations';
import LocationPage from '@/components/dh/LocationPage';
import { getRentReport } from '@/lib/rentmarket';
import { site } from '@/lib/site';

export const revalidate = 3600;

export function generateStaticParams() {
  return locations.map((l) => ({ by: l.slug }));
}

export function generateMetadata({ params }) {
  const loc = getLocation(params.by);
  if (!loc) return { title: 'Ikke funnet | DigiHome' };
  const title = `Utleie i ${loc.name} | DigiHome`;
  const desc = loc.intro.slice(0, 155);
  return {
    title,
    description: desc,
    alternates: { canonical: `/utleie/${loc.slug}` },
    openGraph: {
      title, description: desc, url: `${site.url}/utleie/${loc.slug}`,
      images: [{ url: loc.image, width: 1600, height: 1067, alt: `Utleie i ${loc.name}` }],
      type: 'website', locale: 'nb_NO',
    },
    twitter: { card: 'summary_large_image', title, description: desc, images: [loc.image] },
  };
}

export default async function Page({ params }) {
  const loc = getLocation(params.by);
  if (!loc) notFound();
  const related = relatedLocations(loc.slug, 3);

  // Live leiemarkedsdata (SSB + DigiHome etterspørselsindeks) — beriker siden.
  let rent = null;
  try {
    const report = await getRentReport('bergen');
    if (report) {
      rent = {
        year: report.year,
        prevYear: report.prevYear,
        byRoom: report.byRoom,
        headline: report.headline,
        cityIndex: report.demand?.index ?? null,
        cityLevel: report.demand?.level ?? null,
        topAreas: report.demand?.byArea || [],
        area: (report.demand?.byArea || []).find((a) => a.slug === loc.slug) || null,
        ssbUpdated: report.source?.ssbUpdated || null,
      };
    }
  } catch (e) { rent = null; }

  return <LocationPage loc={loc} related={related} rent={rent} />;
}
