import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { site, statStrip, partners } from '@/lib/site';
import { ArrowUpRight, Building2, Heart, Target, Users } from 'lucide-react';

const values = [
  { icon: Target, t: 'Resultatdrevet', b: 'Vi tjener kun penger når du gjør det. Interessene våre er fullstendig på linje med dine.' },
  { icon: Heart, t: 'Lokalt forankret', b: 'Vi kjenner Bergen — hver bydel, hvert nabolag og hva som faktisk leier ut.' },
  { icon: Users, t: 'Mennesker først', b: 'Teknologi gjør jobben enklere, men et dedikert team står alltid bak.' },
];

export const metadata = {
  title: 'Om DigiHome — Bergens smarteste eiendomsforvalter',
  description: 'DigiHome er en AI-drevet eiendomsforvalter i Bergen som hjelper boligeiere å maksimere leieinntekten trygt og enkelt. Møt teamet og lær om vår tilnærming.',
  alternates: { canonical: '/om-oss' },
};

export default function Page() {
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />
      <section className="relative min-h-[56vh] flex items-end overflow-hidden">
        <img src="/bryggen-alley.webp" alt="Bergen" className="absolute inset-0 w-full h-full object-cover" width={1600} height={900} fetchPriority="high" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,8,12,0.45) 0%, rgba(8,8,12,0.3) 40%, rgba(8,8,12,0.9) 100%)' }} />
        <div className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-14 pt-32">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#d298ff] mb-4"><Building2 className="w-3.5 h-3.5" /> Om oss</div>
          <h1 className="text-white font-bold tracking-[-0.025em] leading-[1.04] text-[40px] sm:text-[58px] lg:text-[68px] max-w-[18ch]" style={{ fontFamily: 'var(--font-heading)' }}>Utleie, slik det burde være</h1>
          <p className="text-white/80 text-[16px] sm:text-[19px] mt-5 max-w-[58ch] leading-relaxed">DigiHome ble grunnlagt for å fjerne alt styret med utleie — og samtidig gi boligeiere høyere og tryggere inntekt.</p>
        </div>
      </section>

      <section className="max-w-[1000px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
        <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.02em] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Vår historie</h2>
        <div className="space-y-5 text-[17px] leading-relaxed text-[#444]">
          <p>DigiHome startet med en enkel observasjon: utleie i Bergen var unødvendig komplisert, tidkrevende og lite lønnsomt for boligeiere som ville gjøre det riktig. Annonser, prising, visninger, kontrakter, husleie, renhold, vedlikehold — alt lå spredt, og ingen hadde tid til å gøre det optimalt.</p>
          <p>Vi bygde en plattform som samler alt på étt sted, drevet av smart teknologi og et dedikert lokalt team. Resultatet er vår dynamiske 10+2-modell, som kombinerer trygg langtidsutleie med lønnsom korttidsutleie i høysesong — og gir eiere opptil 30 % høyere inntekt.</p>
          <p>I dag forvalter vi eiendommer i hele Bergen, og vi vokser. Målet er det samme som dag én: å gjøre utleie helt sorgløst for boligeieren, og samtidig hente ut det fulle potensialet i hver eneste bolig.</p>
        </div>
      </section>

      <section className="bg-[#f6f4f1]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-20">
          <div className="grid sm:grid-cols-3 gap-6">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.t} className="bg-white rounded-2xl p-7 shadow-[0_8px_36px_-20px_rgba(0,0,0,0.10)]">
                  <div className="w-11 h-11 rounded-2xl bg-[#f4f0fb] flex items-center justify-center mb-4"><Icon className="w-5 h-5 text-[#a463e8]" /></div>
                  <h3 className="text-[18px] font-bold mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>{v.t}</h3>
                  <p className="text-[14.5px] text-[#666] leading-relaxed">{v.b}</p>
                </div>
              );
            })}
          </div>
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

      <section className="max-w-[1000px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-20">
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.12)] flex flex-col sm:flex-row items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-[#f4f0fb] flex items-center justify-center shrink-0"><span className="text-[24px] font-bold text-[#a463e8]" style={{ fontFamily: 'var(--font-heading)' }}>SS</span></div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#aaa] mb-1">Daglig leder</p>
            <h3 className="text-[22px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{site.ceo}</h3>
            <p className="text-[14px] text-[#a463e8] font-medium mb-3">{site.ceoTitle}</p>
            <p className="text-[15px] text-[#555] leading-relaxed">«Vårt løfte er enkelt: du skal slippe å tenke på utleien, og samtidig tjene mer enn du gjorde før. Vi behandler hver bolig som om den var vår egen.»</p>
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-20">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#aaa] mb-6 text-center">Våre partnere</p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {partners.map((p) => (<span key={p.name} className="text-[15px] font-semibold text-[#bbb]">{p.name}</span>))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#1a1430] to-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24 text-center">
          <h2 className="text-[28px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4 max-w-[22ch] mx-auto" style={{ fontFamily: 'var(--font-heading)' }}>Vil du bli en del av reisen?</h2>
          <p className="text-white/70 text-[16px] max-w-[50ch] mx-auto mb-8">Enten du har én bolig eller mange — vi vil gjerne høre fra deg.</p>
          <Link href="/kontakt" className="group inline-flex items-center gap-2 h-[54px] pl-7 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold active:scale-[0.98] transition-transform">Ta kontakt<span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span></Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
