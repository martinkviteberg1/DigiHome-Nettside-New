import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { locations } from '@/lib/locations';
import { site } from '@/lib/site';
import { ArrowUpRight, MapPin } from 'lucide-react';

export const metadata = {
  title: 'Utleie i Bergen — bydel for bydel | DigiHome',
  description:
    'Profesjonell, AI-drevet eiendomsforvaltning i Bergen og alle bydeler. Finn ditt nærmeste område — fra Sentrum og Nordnes til Åsane og Fana — og se hvordan DigiHome maksimerer leieinntekten din.',
  alternates: { canonical: '/utleie' },
  openGraph: {
    title: 'Utleie i Bergen — bydel for bydel | DigiHome',
    description: 'Profesjonell eiendomsforvaltning i Bergen og alle bydeler.',
    url: `${site.url}/utleie`, type: 'website', locale: 'nb_NO',
    images: [{ url: site.url + site.ogImage }],
  },
};

export default function UtleieIndex() {
  const city = locations.filter((l) => l.type === 'by');
  const bydeler = locations.filter((l) => l.type === 'bydel');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: locations.map((l, i) => ({
      '@type': 'ListItem', position: i + 1, name: `Utleie i ${l.name}`, url: `${site.url}/utleie/${l.slug}`,
    })),
  };

  const Card = ({ l, large }) => (
    <Link href={`/utleie/${l.slug}`} className={`group relative rounded-3xl overflow-hidden ${large ? 'h-[340px]' : 'h-[230px]'}`}>
      <img src={l.image} alt={`Utleie i ${l.name}`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-[700ms]" loading={large ? 'eager' : 'lazy'} decoding="async" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,10,0.15) 0%, rgba(10,10,10,0.20) 45%, rgba(10,10,10,0.82) 100%)' }} />
      <div className="absolute inset-0 p-6 flex flex-col justify-end">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#d298ff] mb-1.5"><MapPin className="w-3 h-3" /> {l.type === 'by' ? 'By' : 'Bydel'}</span>
        <div className="flex items-end justify-between">
          <div>
            <h3 className={`text-white font-bold tracking-[-0.01em] ${large ? 'text-[28px]' : 'text-[21px]'}`} style={{ fontFamily: 'var(--font-heading)' }}>{l.name}</h3>
            <p className="text-white/70 text-[13.5px] mt-0.5 max-w-[34ch]">{l.tagline}</p>
          </div>
          <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/15 backdrop-blur text-white group-hover:bg-[#d298ff] group-hover:text-[#1f1f1f] transition-colors"><ArrowUpRight className="w-4 h-4" strokeWidth={2.4} /></span>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main className="pt-[72px]">
        <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pt-16 lg:pt-20 pb-10">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#a463e8] mb-4"><MapPin className="w-3.5 h-3.5" /> Våre områder</div>
          <h1 className="text-[40px] sm:text-[54px] lg:text-[60px] font-bold tracking-[-0.025em] leading-[1.04] max-w-[18ch]" style={{ fontFamily: 'var(--font-heading)' }}>
            Utleie i Bergen — bydel for bydel
          </h1>
          <p className="text-[17px] sm:text-[19px] text-[#555] mt-5 max-w-[58ch] leading-relaxed">
            DigiHome forvalter boliger i hele Bergen. Velg ditt område for å se lokalt leiemarked, etterspørsel og hvordan vi maksimerer inntekten din — bydel for bydel.
          </p>
        </section>

        <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-20">
          {city.map((l) => <div key={l.slug} className="mb-6"><Card l={l} large /></div>)}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {bydeler.map((l) => <Card key={l.slug} l={l} />)}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
