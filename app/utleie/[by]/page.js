import { notFound } from 'next/navigation';
import { getLocation, relatedLocations, locations } from '@/lib/locations';
import LocationPage from '@/components/dh/LocationPage';
import { site } from '@/lib/site';

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

export default function Page({ params }) {
  const loc = getLocation(params.by);
  if (!loc) notFound();
  const related = relatedLocations(loc.slug, 3);
  return <LocationPage loc={loc} related={related} />;
}
