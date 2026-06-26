import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { ArrowUpRight, Calculator, TrendingUp, BarChart3, Scale, Compass } from 'lucide-react';

const cards = [
  { icon: Calculator, t: 'Verdivurdering', b: 'Gratis, datadrevet vurdering av hva boligen din realistisk kan leies ut for — basert på markedstall og lokal erfaring.', href: '/bli-utleier', cta: 'Be om verdivurdering' },
  { icon: TrendingUp, t: 'Investeringsrådgivning', b: 'Skal du kjøpe for utleie? Vi hjelper deg vurdere yield, beliggenhet og riktig utleiemodell før du kjøper.', href: '/kontakt', cta: 'Ta kontakt' },
  { icon: BarChart3, t: 'Markedsinnsikt', b: 'Tilgang til oppdaterte leiepriser, prisutvikling og vår etterspørselsindeks — se hvor i Bergen etterspørselen er størst.', href: '/leiemarkedet/bergen', cta: 'Se leiemarkedsrapporten' },
  { icon: Scale, t: 'Juridisk rådgivning', b: 'Husleiekontrakter, depositum og tvistehåndtering kvalitetssikret gjennom vår juridiske partner Hoffmann Thinn.', href: '/kontakt', cta: 'Snåkk med oss' },
];

export const metadata = {
  title: 'Rådgivning — verdivurdering, investering og markedsinnsikt | DigiHome',
  description: 'Få datadrevet rådgivning om utleie i Bergen: gratis verdivurdering, investeringsråd, markedsinnsikt og juridisk bistand. DigiHome kjenner det lokale leiemarkedet.',
  alternates: { canonical: '/radgivning' },
};

export default function Page() {
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />
      <section className="relative min-h-[56vh] flex items-end overflow-hidden">
        <img src="/bergen-street.webp" alt="Bergen" className="absolute inset-0 w-full h-full object-cover" width={1600} height={900} fetchPriority="high" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,8,12,0.45) 0%, rgba(8,8,12,0.3) 40%, rgba(8,8,12,0.9) 100%)' }} />
        <div className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-14 pt-32">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#d298ff] mb-4"><Compass className="w-3.5 h-3.5" /> Rådgivning</div>
          <h1 className="text-white font-bold tracking-[-0.025em] leading-[1.04] text-[40px] sm:text-[58px] lg:text-[68px] max-w-[18ch]" style={{ fontFamily: 'var(--font-heading)' }}>Kloke valg starter med data</h1>
          <p className="text-white/80 text-[16px] sm:text-[19px] mt-5 max-w-[58ch] leading-relaxed">Enten du eier én bolig eller bygger en portefølje — vi gir deg innsikten du trenger for å ta trygge beslutninger.</p>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
        <div className="grid sm:grid-cols-2 gap-6">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.t} className="bg-white rounded-3xl p-8 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.12)] flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-[#f4f0fb] flex items-center justify-center mb-5"><Icon className="w-6 h-6 text-[#a463e8]" /></div>
                <h2 className="text-[21px] font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{c.t}</h2>
                <p className="text-[14.5px] text-[#666] leading-relaxed mb-6 flex-1">{c.b}</p>
                <Link href={c.href} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#a463e8] hover:gap-2.5 transition-all w-fit">{c.cta} <ArrowUpRight className="w-4 h-4" /></Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#1a1430] to-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24 text-center">
          <h2 className="text-[28px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4 max-w-[24ch] mx-auto" style={{ fontFamily: 'var(--font-heading)' }}>Usikker på hva som lønner seg?</h2>
          <p className="text-white/70 text-[16px] max-w-[50ch] mx-auto mb-8">Ta en uforpliktende prat med oss — vi gir deg ærlige råd basert på ekte markedstall.</p>
          <Link href="/kontakt" className="group inline-flex items-center gap-2 h-[54px] pl-7 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold active:scale-[0.98] transition-transform">Kontakt oss<span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span></Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
