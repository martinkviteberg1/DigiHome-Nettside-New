import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';
import { site } from '@/lib/site';
import { guides } from '@/lib/guides';
import { Clock, ArrowUpRight, BookOpen } from 'lucide-react';

// Guide-hub — evergreen kunnskapsinnhold. SEO: fanger spørsmåls-søk med
// lavere konkurranse enn de kommersielle hovedordene. AEO: hver guide har
// direkte siterbare svar + FAQPage-schema som AI-motorer plukker opp.

export const metadata = {
  title: 'Guider for utleiere — pris, skatt og regler',
  description: 'Alt du må vite som utleier, enkelt forklart: hva utleiemegler koster, skatt på utleie, depositumsreglene og lovlig Airbnb-utleie.',
  alternates: { canonical: '/guider' },
  openGraph: {
    title: 'Guider for utleiere | DigiHome',
    description: 'Pris, skatt, depositum og korttidsutleie — kunnskapen du trenger for trygg og lønnsom utleie.',
    url: `${site.url}/guider`, type: 'website', locale: 'nb_NO',
    images: [{ url: site.url + site.ogImage }],
  },
};

const CATEGORY_COLORS = {
  Pris: 'bg-[#f4f0fb] text-[#7c3aed]',
  'Kom i gang': 'bg-emerald-50 text-emerald-700',
  Jus: 'bg-amber-50 text-amber-700',
  Skatt: 'bg-sky-50 text-sky-700',
};

export default function GuiderPage() {
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />

      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pt-32 sm:pt-36 pb-10">
        <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7c3aed] mb-4"><BookOpen className="w-3.5 h-3.5" /> Kunnskap for utleiere</div>
        <h1 className="text-[36px] sm:text-[52px] font-bold tracking-[-0.025em] leading-[1.05] max-w-[22ch]" style={{ fontFamily: 'var(--font-heading)' }}>Guider: alt du må vite før du leier ut</h1>
        <p className="text-[#4a4a4a] text-[16px] sm:text-[18px] mt-5 max-w-[60ch] leading-relaxed">Pris, skatt, depositum og reglene for korttidsutleie — grundig research, enkelt forklart. Skrevet av teamet som forvalter utleieboliger i Bergen hver dag.</p>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-16 lg:pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map((g) => (
            <Link key={g.slug} href={`/guider/${g.slug}`} className="group bg-white rounded-3xl overflow-hidden shadow-[0_8px_36px_-18px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_-20px_rgba(0,0,0,0.2)] transition-shadow flex flex-col">
              <div className="relative aspect-[16/9] overflow-hidden">
                <img src={g.image} alt={g.imageAlt} width={640} height={360} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[11.5px] font-semibold ${CATEGORY_COLORS[g.category] || 'bg-[#f1f0ee] text-[#666]'}`}>{g.category}</span>
                  <span className="inline-flex items-center gap-1 text-[12px] text-[#999]"><Clock className="w-3 h-3" /> {g.readMinutes} min</span>
                </div>
                <h2 className="text-[18px] font-bold leading-snug mb-2 group-hover:text-[#7c3aed] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{g.title}</h2>
                <p className="text-[14px] text-[#666] leading-relaxed flex-1">{g.description}</p>
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#7c3aed] mt-4">Les guiden <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-14 bg-[#0a0a0a] rounded-3xl px-8 py-10 sm:px-12 sm:py-12 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-white text-[24px] sm:text-[30px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>Heller få alt gjort for deg?</h2>
            <p className="text-white/60 text-[15px] mt-2 max-w-[48ch]">Alt guidene beskriver — pris, kontrakt, depositum, skatterapporter — er innebygget i DigiHome. Fra 5 %, uten bindingstid.</p>
          </div>
          <Link href="/bli-utleier" className="group inline-flex items-center gap-2 h-[52px] pl-6 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold shrink-0 active:scale-[0.98] transition-transform">Kom i gang<span className="inline-flex items-center justify-center w-[36px] h-[36px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span></Link>
        </div>
      </section>

      <JsonLd data={breadcrumbLd([{ name: 'Guider', path: '/guider' }])} />
      <JsonLd data={webPageLd({ name: 'Guider for utleiere', description: 'Pris, skatt, depositum og reglene for korttidsutleie — kunnskapen du trenger for trygg og lønnsom utleie.', path: '/guider', type: 'CollectionPage' })} />
      <Footer />
    </div>
  );
}
