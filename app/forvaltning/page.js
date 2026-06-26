import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { reasons, statStrip, network } from '@/lib/site';
import { BadgeCheck, TrendingUp, Eye, Users, Wrench, Plug, Droplets, Scale, Umbrella, Sparkles, ArrowUpRight, Check, Building2 } from 'lucide-react';

const ICONS = { BadgeCheck, TrendingUp, Eye, Users, Wrench, Plug, Droplets, Scale, Umbrella, Sparkles };

const pipeline = [
  { t: 'Annonsering & styling', b: 'Profesjonell fotografering, styling og annonser på Finn, Airbnb og Booking.com.' },
  { t: 'Intelligent prising', b: 'Prisalgoritmer overvåker markedet døgnet rundt og justerer for maksimal avkastning.' },
  { t: 'Visninger & screening', b: 'Vi håndterer visninger, kredittsjekk og utvelgelse av trygge leietakere.' },
  { t: 'Digitale kontrakter', b: 'Husleiekontrakter med BankID-signering og depositumshåndtering.' },
  { t: 'Husleie & oppfølging', b: 'Automatisk innkreving, påminnelser og løpende leietakeroppfølging.' },
  { t: 'Renhold & vedlikehold', b: 'Vaktmester, renhold og håndverkere via vårt lokale partnernettverk.' },
];

export const metadata = {
  title: 'Full eiendomsforvaltning i Bergen | DigiHome',
  description: 'DigiHome håndterer hele utleieprosessen for deg — annonsering, prising, visninger, kontrakter, husleie, renhold og vedlikehold. Trygg, transparent og helautomatisk.',
  alternates: { canonical: '/forvaltning' },
};

export default function Page() {
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />
      <section className="relative min-h-[56vh] flex items-end overflow-hidden">
        <img src="/bergen-aerial.webp" alt="Bergen" className="absolute inset-0 w-full h-full object-cover" width={1600} height={900} fetchPriority="high" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,8,12,0.45) 0%, rgba(8,8,12,0.3) 40%, rgba(8,8,12,0.9) 100%)' }} />
        <div className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-14 pt-32">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#d298ff] mb-4"><Building2 className="w-3.5 h-3.5" /> Forvaltning</div>
          <h1 className="text-white font-bold tracking-[-0.025em] leading-[1.04] text-[40px] sm:text-[58px] lg:text-[68px] max-w-[18ch]" style={{ fontFamily: 'var(--font-heading)' }}>Full forvaltning, null stress</h1>
          <p className="text-white/80 text-[16px] sm:text-[19px] mt-5 max-w-[58ch] leading-relaxed">Du eier boligen. Vi gjør alt det andre — fra første annonse til siste utbetaling, samlet på én digital plattform.</p>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
        <h2 className="text-[26px] sm:text-[36px] font-bold tracking-[-0.02em] mb-3 max-w-[22ch]" style={{ fontFamily: 'var(--font-heading)' }}>Hele verdikjeden, håndtert for deg</h2>
        <p className="text-[#666] text-[15.5px] max-w-[58ch] mb-12">Hvert ledd i utleien er dekket — du trenger aldri løfte en finger.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pipeline.map((p, i) => (
            <div key={p.t} className="bg-white rounded-2xl p-7 shadow-[0_8px_36px_-18px_rgba(0,0,0,0.12)]">
              <span className="text-[13px] font-bold text-[#d298ff]">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="text-[17px] font-bold mt-2 mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>{p.t}</h3>
              <p className="text-[14px] text-[#666] leading-relaxed">{p.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-14 lg:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {statStrip.map((s) => (
              <div key={s.label}>
                <p className="text-[44px] sm:text-[56px] font-bold leading-none text-[#d298ff]" style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</p>
                <p className="text-[16px] font-semibold mt-2">{s.label}</p>
                <p className="text-[13px] text-white/50 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
        <h2 className="text-[26px] sm:text-[36px] font-bold tracking-[-0.02em] mb-12 max-w-[20ch]" style={{ fontFamily: 'var(--font-heading)' }}>Hvorfor velge DigiHome?</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {reasons.map((rsn) => {
            const Icon = ICONS[rsn.icon] || BadgeCheck;
            return (
              <div key={rsn.title} className="flex items-start gap-4 bg-white rounded-2xl p-6 shadow-[0_8px_36px_-20px_rgba(0,0,0,0.10)]">
                <div className="w-11 h-11 rounded-2xl bg-[#f4f0fb] flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-[#a463e8]" /></div>
                <div><h3 className="text-[17px] font-bold mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>{rsn.title}</h3><p className="text-[14px] text-[#666] leading-relaxed">{rsn.body}</p></div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#1a1430] to-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24 text-center">
          <h2 className="text-[28px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4 max-w-[22ch] mx-auto" style={{ fontFamily: 'var(--font-heading)' }}>La oss ta hånd om boligen din</h2>
          <p className="text-white/70 text-[16px] max-w-[50ch] mx-auto mb-8">Gratis verdivurdering. Ingen oppstartskostnader, ingen bindingstid.</p>
          <Link href="/bli-utleier" className="group inline-flex items-center gap-2 h-[54px] pl-7 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold active:scale-[0.98] transition-transform">Kom i gang<span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span></Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
