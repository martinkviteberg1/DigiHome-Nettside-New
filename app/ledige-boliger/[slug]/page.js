import Link from 'next/link';
import { notFound } from 'next/navigation';
import NavV4 from '@/components/forside/v4/NavV4';
import FooterV4 from '@/components/forside/v4/FooterV4';
import AvslutningSeksjon from '@/components/forside/v4/AvslutningSeksjon';
import BoligDetalj from '@/components/forside/v4/boliger/BoligDetalj';
import { RelaterteKort } from '@/components/forside/v4/boliger/LedigeGrid';
import { T, display } from '@/components/forside/v4/tokens';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd } from '@/lib/seo';
import { site } from '@/lib/site';
import ListingPreview from '@/components/dh/ListingPreview';
import { getListingBySlug, getListingBySlugForNewsletter } from '@/lib/listings-server';
import { verifyPropertyInterestToken } from '@/lib/newsletter';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

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
      : `${listing.title} i ${place} er utleid. Se andre ledige boliger hos DigiHome.`,
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
        <div className="min-h-screen antialiased" style={{ background: T.canvas, color: T.ink }}>
          <NavV4 />
          <div className="pt-6"><ListingPreview slug={params.slug} /></div>
          <FooterV4 />
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
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="bolig-v4">
      <NavV4 />
      <JsonLd data={breadcrumbLd([{ name: 'Ledige boliger', path: '/ledige-boliger' }, { name: listing.title, path: `/ledige-boliger/${listing.slug}` }])} />
      <JsonLd data={ld} />

      <main>
        <div className="mx-auto w-full max-w-[1360px] px-5 pb-6 pt-8 sm:px-8 sm:pt-10 lg:w-[calc(100%-128px)] lg:px-0">
          <Link href="/ledige-boliger" className="inline-flex items-center gap-1.5 text-[14px] transition-colors hover:text-[#15130F]" style={{ color: 'rgba(21,19,15,0.6)' }} data-testid="listing-back">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.7} /> Alle ledige boliger
          </Link>
        </div>

        <BoligDetalj listing={listing} available={available} nl={nl} />

        {related?.length > 0 && (
          <section className="mx-auto w-full max-w-[1360px] border-t px-5 py-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:py-20" style={{ borderColor: 'rgba(21,19,15,0.12)' }} data-testid="listing-related">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-[clamp(28px,3vw,44px)]" style={{ ...display, color: T.ink }}>Andre ledige boliger<span style={{ color: T.lilla }}>.</span></h2>
              <Link href="/ledige-boliger" className="inline-flex items-center gap-1.5 text-[15px] underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:decoration-[#15130F]" style={{ color: T.ink }}>Se alle <ArrowUpRight className="h-4 w-4" strokeWidth={1.6} /></Link>
            </div>
            <RelaterteKort listings={related} />
          </section>
        )}

        <AvslutningSeksjon
          tittel="Har du en bolig å leie ut"
          under="Vi finner leietakeren og tar alt etterpå — eller du gjør det selv, med systemet som tar rutinen."
          handling={{ knapp: { href: '/bli-utleier', tekst: 'Bli utleier' }, lenke: { href: '/priser', tekst: 'Se priser' } }}
        />
      </main>
      <FooterV4 />
    </div>
  );
}
