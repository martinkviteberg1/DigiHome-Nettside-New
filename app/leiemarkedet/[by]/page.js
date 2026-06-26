import { notFound } from 'next/navigation';
import { getRentReport, rentCitySlugs, RENT_CITIES } from '@/lib/rentmarket';
import RentMarketPage from '@/components/dh/RentMarketPage';
import { site } from '@/lib/site';

// Revalider statisk HTML hver time (data caches uansett i Mongo med 24t TTL).
export const revalidate = 3600;

export function generateStaticParams() {
  return rentCitySlugs().map((by) => ({ by }));
}

export async function generateMetadata({ params }) {
  const city = RENT_CITIES[params.by];
  if (!city) return { title: 'Ikke funnet | DigiHome' };
  let report = null;
  try { report = await getRentReport(params.by); } catch (e) { report = null; }
  const year = report?.year || new Date().getFullYear();
  const two = report?.headline?.typical2rom;
  const title = `Leiemarkedet i ${city.label} ${year} — snittleie, priser og etterspørsel | DigiHome`;
  const desc = two
    ? `En 2-roms i ${city.label} leies i snitt for ${Number(two).toLocaleString('nb-NO')} kr/mnd (${year}). Se snittleie per boligtype, prisutvikling og hvor etterspørselen er størst. Kilde: SSB + DigiHome.`
    : `Leiepriser, prisutvikling og etterspørsel i ${city.label}, basert på SSBs leiemarkedsundersøkelse og DigiHomes egen etterspørselsindeks.`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/leiemarkedet/${city.slug}` },
    openGraph: {
      title, description: desc, url: `${site.url}/leiemarkedet/${city.slug}`,
      images: [{ url: city.image, width: 1600, height: 1067, alt: `Leiemarkedet i ${city.label}` }],
      type: 'article', locale: 'nb_NO',
    },
    twitter: { card: 'summary_large_image', title, description: desc, images: [city.image] },
  };
}

export default async function Page({ params }) {
  if (!RENT_CITIES[params.by]) notFound();
  let report = null;
  try { report = await getRentReport(params.by); } catch (e) { report = null; }
  if (!report) notFound();
  return <RentMarketPage report={report} />;
}
