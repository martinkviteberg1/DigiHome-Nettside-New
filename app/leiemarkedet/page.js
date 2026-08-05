import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';
import { site } from '@/lib/site';
import { RENT_CITIES, getRentReport } from '@/lib/rentmarket';
import { ArrowUpRight, BarChart3, Database } from 'lucide-react';

export const revalidate = 3600;

export const metadata = {
  title: 'Leiemarkedet i Norge — leiepriser og etterspørsel',
  description: 'Datadrevne leiemarkedsrapporter basert på SSB og DigiHomes etterspørselsindeks. Se snittleie, prisutvikling og hvor etterspørselen er størst.',
  alternates: { canonical: '/leiemarkedet' },
  openGraph: {
    title: 'Leiemarkedet i Norge — leiepriser og etterspørsel | DigiHome',
    description: 'Datadrevne leiemarkedsrapporter basert på SSB og DigiHomes etterspørselsindeks.',
    url: `${site.url}/leiemarkedet`, type: 'website', locale: 'nb_NO',
    images: [{ url: site.url + site.ogImage }],
  },
};

export default async function Page() {
  const cities = Object.values(RENT_CITIES);
  const reports = await Promise.all(
    cities.map(async (c) => {
      try { return await getRentReport(c.slug); } catch (e) { return null; }
    })
  );

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pt-32 pb-12">
        <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7c3aed] mb-4"><BarChart3 className="w-3.5 h-3.5" /> Leiemarkedsrapporter</div>
        <h1 className="text-[40px] sm:text-[60px] font-bold tracking-[-0.025em] leading-[1.04] max-w-[18ch]" style={{ fontFamily: 'var(--font-heading)' }}>
          Leiemarkedet i Norge
        </h1>
        <p className="text-[17px] sm:text-[19px] text-[#666] mt-5 max-w-[60ch] leading-relaxed">
          Datadrevne rapporter som kombinerer offisiell statistikk fra Statistisk sentralbyrå med DigiHomes egen etterspørselsindeks. Oppdateres løpende.
        </p>
        <p className="text-[12.5px] text-[#78726a] mt-4 flex items-center gap-2"><Database className="w-3.5 h-3.5" /> Kilde: SSB leiemarkedsundersøkelse + DigiHome forvaltningsdata</p>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cities.map((c, i) => {
            const rep = reports[i];
            return (
              <Link key={c.slug} href={`/leiemarkedet/${c.slug}`} className="group relative h-[340px] rounded-3xl overflow-hidden block">
                <img src={c.image} alt={`Leiemarkedet i ${c.label}`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,8,12,0.15) 0%, rgba(8,8,12,0.85) 100%)' }} />
                <div className="absolute inset-0 p-7 flex flex-col justify-end text-white">
                  <h2 className="text-[26px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{c.label}</h2>
                  {rep?.headline?.typical2rom && (
                    <p className="text-white/80 text-[14px] mt-1">2-roms snitt: {Number(rep.headline.typical2rom).toLocaleString('nb-NO')} kr/mnd</p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#d298ff]">Se rapport <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SEO/AEO: forklarende innhold (metode + bruksverdi) — gjør siden
          siterbar for AI-søk og gir crawlere reell tekst, ikke bare kort-grid. */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-24">
        <div className="grid md:grid-cols-2 gap-10 max-w-[1100px]">
          <div>
            <h2 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Slik lager vi rapportene</h2>
            <p className="text-[15px] text-[#555] leading-[1.75]">
              Rapportene kombinerer to kilder: offisiell leiestatistikk fra Statistisk sentralbyrås
              leiemarkedsundersøkelse, og DigiHomes egne forvaltningsdata fra utleieboliger i Bergen.
              SSB-tallene gir det store bildet — snittleie per boligtype og prisutvikling over tid —
              mens våre egne data viser hva som faktisk skjer i markedet akkurat nå: etterspørsel,
              utleietid og hvilke områder som er mest attraktive.
            </p>
          </div>
          <div>
            <h2 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Hva kan du bruke tallene til?</h2>
            <p className="text-[15px] text-[#555] leading-[1.75]">
              Skal du sette riktig husleie, vurdere kjøp av utleiebolig eller velge mellom korttids-
              og langtidsutleie? Rapportene viser hva en 2-roms faktisk leies ut for, hvordan prisene
              utvikler seg, og hvor i byen etterspørselen er størst — så du kan ta beslutninger basert
              på tall, ikke magefølelse. Vil du ha en konkret vurdering av din bolig, får du en{' '}
              <Link href="/bli-utleier" className="text-[#7c3aed] font-semibold underline underline-offset-2">gratis verdivurdering her</Link>.
            </p>
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbLd([{ name: 'Leiemarkedet', path: '/leiemarkedet' }])} />
      <JsonLd data={webPageLd({
        name: 'Leiemarkedet i Norge — leiepriser og etterspørsel',
        description: 'Datadrevne leiemarkedsrapporter basert på SSB og DigiHomes etterspørselsindeks.',
        path: '/leiemarkedet',
        type: 'CollectionPage',
      })} />
      <Footer />
    </div>
  );
}
