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
  if (!city) return { title: 'Ikke funnet' };
  let report = null;
  try { report = await getRentReport(params.by); } catch (e) { report = null; }
  const year = report?.year || new Date().getFullYear();
  const two = report?.headline?.typical2rom;
  // Tittel uten merkevare – layout-templaten ('%s | DigiHome') legger den til én gang.
  // Tittel-året = inneværende år (søkeintensjon «leiepriser 2026»); beskrivelsen
  // oppgir datakildeåret ærlig (SSB-tallene kan ligge ett år bak).
  const titleYear = Math.max(year, new Date().getFullYear());
  // «leiepriser bergen» ga 31 visninger på posisjon 6,7 og NULL klikk i
  // Search Console. Tittelen begynte med «Leiemarked», ikke med søkeordet, og
  // lovet ingen konkret verdi. Nå ledes tittelen av «Leiepriser» + årstall.
  const title = `Leiepriser i ${city.label} ${titleYear}: snittleie per rom`;
  const ogTitle = `${title} | DigiHome`;
  const desc = two
    ? `Leiepriser i ${city.label} ${titleYear}: en 2-roms leies i snitt for ${Number(two).toLocaleString('nb-NO')} kr/mnd (${year}). Se snittleie per boligtype, prisutvikling og etterspørsel. Kilde: SSB + DigiHome.`.slice(0, 300)
    : `Leiepriser, prisutvikling og etterspørsel i ${city.label}, basert på SSBs leiemarkedsundersøkelse og DigiHomes egen etterspørselsindeks.`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/leiemarkedet/${city.slug}` },
    openGraph: {
      // Ingen eksplisitt images -> bruker det brandede opengraph-image.js
      // (DigiHome «Leiemarkedsrapport»-kort) i stedet for et generisk stockfoto.
      title: ogTitle, description: desc, url: `${site.url}/leiemarkedet/${city.slug}`,
      type: 'article', locale: 'nb_NO',
    },
    twitter: { card: 'summary_large_image', title: ogTitle, description: desc },
  };
}

export default async function Page({ params }) {
  if (!RENT_CITIES[params.by]) notFound();
  let report = null;
  try { report = await getRentReport(params.by); } catch (e) { report = null; }
  if (!report) notFound();
  return <RentMarketPage report={report} />;
}
