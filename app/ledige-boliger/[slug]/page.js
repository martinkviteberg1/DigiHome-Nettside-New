import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd } from '@/lib/seo';
import { site } from '@/lib/site';
import ListingDetail from '@/components/dh/ListingDetail';
import ListingPreview from '@/components/dh/ListingPreview';
import { getListingBySlug, getListingBySlugForNewsletter } from '@/lib/listings-server';
import { verifyPropertyInterestToken } from '@/lib/newsletter';
import { ArrowLeft, ArrowUpRight, MapPin } from 'lucide-react';

// BOLIGSIDE — fast, søkbar URL per bolig.
//
// Adresse: full gateadresse med husnummer, som i alle andre utleieannonser —
// det er informasjon boligsøkeren trenger for å vurdere beliggenheten, og det
// er samme opplysning som ligger i FINN-annonsen. Personvernregelen gjelder
// fortsatt for alt annet: aldri eier, aldri leietaker, aldri kontraktsleie på en
// utleid bolig. Prisen er den annonserte månedsleien fra utleiemodulen.
//
// Utleide boliger som fortsatt er synlige beholdes med «ikke ledig»-tilstand i
// stedet for 404 — vi har sendt lenker til dem i nyhetsbrev. De settes til
// noindex slik at død beholdning ikke havner i søk.

export const revalidate = 120;

export async function generateMetadata({ params, searchParams }) {
  const data = await getListingBySlug(params.slug);
  // Lenker fra nyhetsbrev bærer et signert token. Slike URL-er skal ALDRI
  // indekseres — de er personlige, og boligen bak kan være upublisert.
  const fromNewsletter = !!searchParams?.pt;
  if (!data) {
    if (fromNewsletter) {
      const nl = await getListingBySlugForNewsletter(params.slug);
      if (nl) {
        return {
          title: `${nl.listing.title} — DigiHome`,
          description: 'Boligen du fikk tilsendt i nyhetsbrevet fra DigiHome.',
          robots: { index: false, follow: false },
        };
      }
    }
    return { title: 'Boligen finnes ikke', robots: { index: false, follow: true } };
  }
  const { listing, available } = data;
  const place = [listing.streetAddress || listing.area, listing.district].filter(Boolean).join(', ') || listing.city;
  const facts = [listing.sqm ? `${listing.sqm} m²` : null, listing.bedrooms ? `${listing.bedrooms} soverom` : null, listing.rentText].filter(Boolean).join(' · ');
  // Redaksjonell annonsetekst er den beste meta-beskrivelsen vi kan ha: den er
  // skrevet for denne boligen. Faller tilbake på den avledede når den mangler.
  const editorial = String(listing.description || '').replace(/\s+/g, ' ').trim();
  const metaDesc = editorial
    ? `${editorial.slice(0, 155)}${editorial.length > 155 ? '…' : ''}`
    : `${listing.title} til leie i ${place}. ${facts}. Forvaltet av DigiHome: kredittsjekket leietaker, digital kontrakt og depositumskonto. Meld interesse i dag.`;
  return {
    title: available ? `${listing.title} — til leie i ${place}` : `${listing.title} — utleid`,
    description: available
      ? metaDesc
      : `${listing.title} i ${place} er utleid. Se andre ledige boliger i Bergen hos DigiHome.`,
    alternates: { canonical: `/ledige-boliger/${listing.slug}` },
    robots: available ? undefined : { index: false, follow: true },
    openGraph: {
      title: `${listing.title} | DigiHome`,
      description: `${place} · ${facts}`,
      url: `${site.url}/ledige-boliger/${listing.slug}`,
      type: 'website', locale: 'nb_NO',
      images: [{ url: listing.images?.[0] || site.url + site.ogImage }],
    },
  };
}

export default async function ListingPage({ params, searchParams }) {
  let data = await getListingBySlug(params.slug);

  // NYHETSBREV-TILGANG. Boligkortene i nyhetsbrevet peker hit — ikke til en egen
  // bekreftelsesside — fordi dette er den ene siden der boligen er presentert
  // ordentlig, og fordi det er lenken folk videresender. Men brevet kan
  // inneholde en bolig som ikke er publisert offentlig, og da ville mottakeren
  // fått 404 på boligen hun nettopp fikk tilsendt.
  //
  // Løsningen er tilgang via det HMAC-signerte tokenet som alt ligger i
  // e-postlenken: kan vi bekrefte at DENNE mottakeren fikk DENNE boligen i
  // DENNE kampanjen, viser vi siden (alltid noindex, se generateMetadata).
  // Tokenet er signert med enten plattformens enhets-ID eller vår lokale id, så
  // vi prøver begge — da slipper vi å ha ID-en i URL-en.
  let nl = null;
  const ptRaw = typeof searchParams?.pt === 'string' ? searchParams.pt : '';
  const campaignId = typeof searchParams?.c === 'string' ? searchParams.c : '';
  const rid = typeof searchParams?.r === 'string' ? searchParams.r : '';
  if (ptRaw && campaignId && rid) {
    const relaxed = await getListingBySlugForNewsletter(params.slug);
    if (relaxed) {
      const candidates = [relaxed.keys.externalId, relaxed.keys.id].filter(Boolean);
      const match = candidates.find((k) => verifyPropertyInterestToken(campaignId, rid, k, ptRaw));
      if (match) {
        data = { listing: relaxed.listing, available: relaxed.available, related: relaxed.related };
        nl = { c: campaignId, r: rid, pt: ptRaw, property: match };
      }
    }
  }

  // Ikke publisert? Vanlige besøkende får 404 — serveren avslører aldri en
  // skjult enhet. Innlogget admin kan legge til ?forhandsvis=1 og se siden slik
  // den blir, uten å publisere noe. Alltid noindex (se generateMetadata).
  if (!data) {
    if (searchParams?.forhandsvis === '1') {
      return (
        <div className="min-h-screen bg-[#fdfcfb] text-[#1f1f1f]">
          <Header />
          <ListingPreview slug={params.slug} />
          <Footer />
        </div>
      );
    }
    notFound();
  }
  const { listing, available, related } = data;
  const rentAmount = Number(listing.rentAmount) || 0;
  const place = [listing.streetAddress || listing.area, listing.district].filter(Boolean).join(', ') || listing.city;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.title,
    url: `${site.url}/ledige-boliger/${listing.slug}`,
    description: String(listing.description || '').replace(/\s+/g, ' ').trim() || `${listing.typeLabel} til leie i ${place}.`,
    image: (listing.images || []).slice(0, 6),
    datePosted: listing.updatedAt || undefined,
    provider: { '@type': 'RealEstateAgent', name: site.name, url: site.url, telephone: site.phone },
    about: {
      '@type': 'Apartment',
      name: listing.title,
      ...(listing.bedrooms ? { numberOfBedrooms: listing.bedrooms } : {}),
      ...(listing.sqm ? { floorSize: { '@type': 'QuantitativeValue', value: listing.sqm, unitCode: 'MTK' } } : {}),
      address: {
        '@type': 'PostalAddress',
        // Full gateadresse i strukturert data også — det er den som gjør at
        // Google kan plassere boligen i lokale søk.
        ...(listing.streetAddress || listing.area ? { streetAddress: listing.streetAddress || listing.area } : {}),
        ...(listing.postalCode ? { postalCode: listing.postalCode } : {}),
        addressLocality: listing.city || 'Bergen',
        addressRegion: 'Vestland',
        addressCountry: 'NO',
      },
    },
    // Eksakt månedsleie i strukturert data. Google viser prisen i rike
    // resultater bare når den er et tall — et min/maks-intervall ble filtrert
    // bort. `price` + UnitPriceSpecification med referenceQuantity 1 måned
    // sier «23 000 NOK per måned» utvetydig.
    ...(rentAmount ? {
      offers: {
        '@type': 'Offer',
        price: rentAmount,
        priceCurrency: 'NOK',
        availability: available ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
        ...(listing.availableFrom ? { availabilityStarts: listing.availableFrom } : {}),
        url: `${site.url}/ledige-boliger/${listing.slug}`,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: rentAmount,
          priceCurrency: 'NOK',
          unitText: 'MND',
          referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
        },
      },
    } : {}),
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] text-[#1f1f1f]">
      <Header />
      <JsonLd data={breadcrumbLd([{ name: 'Ledige boliger', path: '/ledige-boliger' }, { name: listing.title, path: `/ledige-boliger/${listing.slug}` }])} />
      <JsonLd data={ld} />

      <div className="mx-auto max-w-[1400px] px-4 pt-28 sm:px-10 sm:pt-32 lg:px-16">
        <Link href="/ledige-boliger" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#78726a] transition-colors hover:text-[#0a0a0a]">
          <ArrowLeft className="h-4 w-4" /> Alle ledige boliger
        </Link>
      </div>

      <ListingDetail listing={listing} available={available} nl={nl} />

      {related?.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-10 lg:px-16">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] sm:text-[26px]" style={{ fontFamily: 'var(--font-heading)' }}>Andre ledige boliger</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((c) => (
              <Link key={c.id} href={`/ledige-boliger/${c.slug}`}
                className="group flex flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-black/[0.04] shadow-[0_10px_36px_-24px_rgba(0,0,0,0.24)] transition-shadow hover:shadow-[0_18px_54px_-26px_rgba(0,0,0,0.3)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#f3f1ee]">
                  {c.images?.[0] && <img src={c.images[0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />}
                </div>
                <div className="p-5">
                  <h3 className="text-[15.5px] font-semibold leading-snug text-[#0a0a0a] group-hover:text-[#7c3aed]" style={{ fontFamily: 'var(--font-heading)' }}>{c.title}</h3>
                  <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-[#78726a]"><MapPin className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#8a837a]" /><span className="break-words">{[c.streetAddress || c.area, c.district].filter(Boolean).join(', ')}</span></p>
                  <p className="mt-3 text-[14px] font-semibold text-[#0a0a0a]">{c.rentText || 'Pris på forespørsel'}</p>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/ledige-boliger" className="mt-8 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#7c3aed] hover:underline">
            Se alle ledige boliger <ArrowUpRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      <Footer />
    </div>
  );
}
