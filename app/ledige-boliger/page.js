import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';
import { site } from '@/lib/site';
import ListingsGrid from '@/components/dh/ListingsGrid';
import { getPublishedListings } from '@/lib/listings-server';
import { Home, ArrowUpRight, ShieldCheck } from 'lucide-react';

// LEDIGE BOLIGER — offentlig boligflate.
//
// Server-rendret med vilje: boligene skal ligge i HTML-en for Google og
// AI-crawlere (langhalen «leilighet til leie Sandviken» er trafikk vi i dag gir
// bort til FINN). Filtrene er klientside oppe på den ferdige lista.
//
// Kun boliger som er BÅDE publiseringsklare og satt synlige i adminportalen
// vises. Innlogget admin kan legge til ?forhandsvis=1 for å se upubliserte
// kandidater — adminnøkkelen leses fra localStorage, aldri fra URL-en.

export const revalidate = 120;

export const metadata = {
  title: 'Ledige leiligheter og boliger til leie i Bergen',
  description: 'Ledige utleieboliger i Bergen forvaltet av DigiHome — kvalitetssikret utleie, digital kontrakt og depositumskonto. Se ledige leiligheter, meld interesse og bli varslet om nye boliger.',
  alternates: { canonical: '/ledige-boliger' },
  openGraph: {
  twitter: { card: 'summary_large_image', images: ['/og/ledige-boliger.jpg'] },
    title: 'Ledige boliger til leie i Bergen | DigiHome',
    description: 'Se ledige utleieboliger i Bergen. Meld interesse direkte, eller bli varslet når noe nytt blir ledig.',
    url: `${site.url}/ledige-boliger`, type: 'website', locale: 'nb_NO',
    images: [{ url: site.url + '/og/ledige-boliger.jpg', width: 1200, height: 630 }],
  },
};

export default async function LedigeBoligerPage() {
  const listings = await getPublishedListings();
  const vacant = listings.filter((l) => l.status === 'active');
  const districts = [...new Set(vacant.map((l) => l.district).filter(Boolean))];
  const amounts = vacant.map((l) => Number(l.rentAmount) || 0).filter(Boolean);
  const from = amounts.length ? Math.min(...amounts) : null;

  const itemList = vacant.length ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Ledige boliger til leie i Bergen',
    numberOfItems: vacant.length,
    itemListElement: vacant.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${site.url}/ledige-boliger/${l.slug}`,
      name: l.title,
    })),
  } : null;

  return (
    <div className="min-h-screen bg-[#fdfcfb] text-[#1f1f1f]">
      <Header />
      <JsonLd data={breadcrumbLd([{ name: 'Ledige boliger', path: '/ledige-boliger' }])} />
      <JsonLd data={webPageLd({
        name: 'Ledige boliger til leie i Bergen',
        description: 'Ledige utleieboliger i Bergen forvaltet av DigiHome. Meld interesse direkte eller bli varslet om nye boliger.',
        path: '/ledige-boliger',
        type: 'CollectionPage',
      })} />
      {itemList && <JsonLd data={itemList} />}

      <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-32 sm:px-10 sm:pt-36 lg:px-16">
        <div className="mb-4 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
          <Home className="h-3.5 w-3.5" /> Ledige boliger
        </div>
        <h1 className="max-w-[24ch] text-[36px] font-bold leading-[1.05] tracking-[-0.025em] sm:text-[52px]" style={{ fontFamily: 'var(--font-heading)' }}>
          Ledige boliger til leie i Bergen
        </h1>
        <p className="mt-5 max-w-[62ch] text-[16px] leading-relaxed text-[#4a4a4a] sm:text-[18px]">
          {vacant.length > 0
            ? <>Vi forvalter {vacant.length === 1 ? 'denne boligen' : `${vacant.length} ledige boliger`}{districts.length ? ` i ${districts.slice(0, 3).join(', ')}${districts.length > 3 ? ' med flere' : ''}` : ' i Bergen'}{from ? `, fra ${String(from).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')} kr/mnd` : ''}. Meld interesse direkte — vi svarer samme dag.</>
            : <>Alle boligene våre er utleid akkurat nå. Vi får nye boliger fortløpende i Bergen, og varsler deg gjerne før de blir annonsert.</>}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-[#78726a]">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#7c3aed]" /> Kredittsjekk og digital kontrakt</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#7c3aed]" /> Depositumskonto i bank</span>
          <Link href="/bli-leietaker" className="inline-flex items-center gap-1 font-semibold text-[#7c3aed] hover:underline">Slik leier du hos oss <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-20 sm:px-10 lg:px-16 lg:pb-28">
        <ListingsGrid listings={listings} />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-20 sm:px-10 lg:px-16">
        <div className="rounded-[30px] bg-[#0a0a0a] p-8 text-white sm:p-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#d298ff]">Er du utleier?</p>
              <h2 className="mt-3 max-w-[28ch] text-[26px] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[34px]" style={{ fontFamily: 'var(--font-heading)' }}>
                Vi finner leietakeren — og håndterer alt etterpå
              </h2>
              <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-white/70">
                Annonsering, visning, kredittsjekk, kontrakt, depositum og oppfølging. Du får leien inn på konto og slipper alt arbeidet.
              </p>
            </div>
            <Link href="/bli-utleier" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[#0a0a0a] transition-transform hover:scale-[1.02]">
              Snakk med oss <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
