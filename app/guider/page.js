import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, itemListLd, stripMarkup } from '@/lib/seo';
import { site } from '@/lib/site';
import { guides, guideGroups } from '@/lib/guides';
import { Clock, ArrowUpRight, BookOpen } from 'lucide-react';

// Guide-hub — evergreen kunnskapsinnhold og DigiHomes organiske motor.
// Guidene sto for 73 % av alle visninger i Search Console. Hub-siden er
// gruppert per tema (klynge) slik at både lesere og crawlere ser strukturen:
// én side per reell søkeintensjon, samlet under pilarene.

export const metadata = {
  title: 'Guider for utleiere: pris, depositum, skatt og regler',
  description: 'Alt du må vite som utleier, enkelt forklart: hva utleiemegler koster i provisjon, depositumsreglene, skatt og fradrag, lovlig Airbnb-utleie og husleieøkning.',
  alternates: { canonical: '/guider' },
  openGraph: {
    title: 'Guider for utleiere | DigiHome',
    description: 'Pris, depositum, skatt og korttidsutleie — kunnskapen du trenger for trygg og lønnsom utleie.',
    url: `${site.url}/guider`, type: 'website', locale: 'nb_NO',
    images: [{ url: site.url + '/og/guider.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guider for utleiere | DigiHome',
    description: 'Pris, depositum, skatt og korttidsutleie — kunnskapen du trenger for trygg og lønnsom utleie.',
    images: [site.url + '/og/guider.jpg'],
  },
};

const CATEGORY_COLORS = {
  Pris: 'bg-[#f4f0fb] text-[#7c3aed]',
  'Kom i gang': 'bg-emerald-50 text-emerald-700',
  Rådgivning: 'bg-indigo-50 text-indigo-700',
  Depositum: 'bg-amber-50 text-amber-700',
  Skatt: 'bg-sky-50 text-sky-700',
  Korttidsutleie: 'bg-rose-50 text-rose-700',
  Godkjenning: 'bg-teal-50 text-teal-700',
  Leiepris: 'bg-violet-50 text-violet-700',
};

export default function GuiderPage() {
  const groups = guideGroups();

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />

      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pt-32 sm:pt-36 pb-10">
        <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7c3aed] mb-4"><BookOpen className="w-3.5 h-3.5" /> Kunnskap for utleiere</div>
        <h1 className="text-[36px] sm:text-[52px] font-bold tracking-[-0.025em] leading-[1.05] max-w-[22ch]" style={{ fontFamily: 'var(--font-heading)' }}>Guider: alt du må vite før du leier ut</h1>
        <p className="text-[#4a4a4a] text-[16px] sm:text-[18px] mt-5 max-w-[62ch] leading-relaxed">Pris og provisjon, depositum, skatt og fradrag, korttidsutleie og lovlig husleieøkning — grundig research, enkelt forklart. Skrevet av teamet som forvalter utleieboliger i Bergen hver dag.</p>
        <p className="text-[13.5px] text-[#716b63] mt-4">{guides.length} guider · oppdatert løpende · kilder oppgitt i hver artikkel</p>

        {/* Hopp til tema — 12 guider fordelt på fire klynger blir en lang
            mobilside uten en snarvei øverst. */}
        {groups.length > 1 && (
          <nav aria-label="Hopp til tema" className="flex flex-wrap gap-2 mt-7">
            {groups.map((group) => (
              <a
                key={group.key}
                href={`#${group.key}`}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white border border-black/[0.09] text-[13.5px] font-medium text-[#55504a] hover:border-[#d9c9f5] hover:text-[#7c3aed] transition-colors"
              >
                {group.label}
                <span className="text-[#7c7568] tabular-nums">{group.items.length}</span>
              </a>
            ))}
          </nav>
        )}
      </section>

      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-16 lg:pb-24">
        <div className="space-y-14">
          {groups.map((group) => (
            <div key={group.key} id={group.key} className="scroll-mt-28">
              <div className="mb-5">
                <h2 className="text-[22px] sm:text-[28px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>{group.label}</h2>
                {group.intro ? <p className="text-[14.5px] text-[#666] mt-1.5 max-w-[64ch]">{group.intro}</p> : null}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.items.map((g) => (
                  <Link key={g.slug} href={`/guider/${g.slug}`} className="group bg-white rounded-3xl overflow-hidden border border-black/[0.06] hover:border-[#d9c9f5] shadow-[0_8px_36px_-18px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_-20px_rgba(0,0,0,0.2)] transition-all duration-200 flex flex-col">
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <img src={g.image} alt={g.imageAlt} width={640} height={360} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11.5px] font-semibold ${CATEGORY_COLORS[g.category] || 'bg-[#f1f0ee] text-[#666]'}`}>{g.category}</span>
                        <span className="inline-flex items-center gap-1 text-[12px] text-[#716b63]"><Clock className="w-3 h-3" /> {g.readMinutes} min</span>
                      </div>
                      <h3 className="text-[18px] font-bold leading-snug mb-2 group-hover:text-[#7c3aed] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{g.title}</h3>
                      <p className="text-[14px] text-[#666] leading-relaxed flex-1">{stripMarkup(g.description)}</p>
                      <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#7c3aed] mt-4">Les guiden <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
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
      <JsonLd data={itemListLd({
        name: 'Guider for utleiere',
        description: 'Pris, depositum, skatt og reglene for korttidsutleie — kunnskapen du trenger for trygg og lønnsom utleie.',
        path: '/guider',
        items: guides.map((g) => ({ name: g.title, path: `/guider/${g.slug}` })),
      })} />
      <Footer />
    </div>
  );
}
