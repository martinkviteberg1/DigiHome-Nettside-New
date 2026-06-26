import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { site, services, network, steps } from '@/lib/site';
import {
  Sparkles, ShieldCheck, CalendarRange, Wrench, Plug, Droplets, Scale, Umbrella,
  Repeat, LineChart, Settings2, Smartphone, ArrowUpRight, Check,
} from 'lucide-react';

const ICONS = { Sparkles, ShieldCheck, CalendarRange, Wrench, Plug, Droplets, Scale, Umbrella, Repeat, LineChart, Settings2, Smartphone };

export const metadata = {
  title: 'Tjenester — dynamisk, langtids- og korttidsutleie | DigiHome',
  description: 'DigiHome tilbyr full forvaltning av utleieboliger i Bergen: dynamisk hybridutleie (10+2), langtidsutleie og korttidsutleie. Alt fra annonsering til vedlikehold på én plattform.',
  alternates: { canonical: '/tjenester' },
};

export default function Page() {
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />
      <section className="relative min-h-[56vh] flex items-end overflow-hidden">
        <img src="/bergen-rooftops.webp" alt="Bergen" className="absolute inset-0 w-full h-full object-cover" width={1600} height={900} fetchPriority="high" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,8,12,0.45) 0%, rgba(8,8,12,0.3) 40%, rgba(8,8,12,0.9) 100%)' }} />
        <div className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-14 pt-32">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#d298ff] mb-4"><Sparkles className="w-3.5 h-3.5" /> Tjenester</div>
          <h1 className="text-white font-bold tracking-[-0.025em] leading-[1.04] text-[40px] sm:text-[58px] lg:text-[68px] max-w-[18ch]" style={{ fontFamily: 'var(--font-heading)' }}>Tre måter å leie ut på</h1>
          <p className="text-white/80 text-[16px] sm:text-[19px] mt-5 max-w-[58ch] leading-relaxed">Velg modellen som passer din bolig og dine mål. Vi håndterer resten — helt automatisk, fra første annonse til siste utbetaling.</p>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
        <div className="grid md:grid-cols-3 gap-6">
          {services.map((s) => {
            const Icon = ICONS[s.icon] || Sparkles;
            return (
              <div key={s.name} className={`rounded-3xl p-8 ${s.featured ? 'bg-gradient-to-br from-[#1f1538] to-[#120c22] text-white' : 'bg-white text-[#1f1f1f] shadow-[0_10px_40px_-18px_rgba(0,0,0,0.12)]'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${s.featured ? 'bg-[#d298ff]/15' : 'bg-[#f4f0fb]'}`}><Icon className={`w-6 h-6 ${s.featured ? 'text-[#d298ff]' : 'text-[#a463e8]'}`} /></div>
                {s.badge && <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#d298ff] mb-2">{s.badge}</span>}
                <h2 className="text-[22px] font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{s.name}</h2>
                <p className={`text-[12.5px] font-semibold uppercase tracking-[0.08em] mb-4 ${s.featured ? 'text-white/50' : 'text-[#aaa]'}`}>{s.tag}</p>
                <p className={`text-[14.5px] leading-relaxed mb-5 ${s.featured ? 'text-white/70' : 'text-[#555]'}`}>{s.description}</p>
                <div className={`inline-flex items-center gap-1.5 text-[13.5px] font-semibold ${s.featured ? 'text-[#d298ff]' : 'text-[#a463e8]'}`}><Check className="w-4 h-4" /> {s.highlight}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
          <h2 className="text-[26px] sm:text-[36px] font-bold tracking-[-0.02em] mb-3 max-w-[20ch]" style={{ fontFamily: 'var(--font-heading)' }}>Alt er inkludert</h2>
          <p className="text-white/55 text-[15px] max-w-[58ch] mb-12">Ett team, ett system. Vi håndterer hele verdikjeden gjennom vårt lokale partnernettverk.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {network.map((n) => {
              const Icon = ICONS[n.icon] || Wrench;
              return (
                <div key={n.name} className="bg-white/[0.04] rounded-2xl p-6">
                  <div className="w-10 h-10 rounded-full bg-[#d298ff]/12 flex items-center justify-center mb-4"><Icon className="w-5 h-5 text-[#d298ff]" /></div>
                  <h3 className="text-[16px] font-bold mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>{n.name}</h3>
                  <p className="text-[14px] text-white/55 leading-relaxed">{n.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
        <h2 className="text-[26px] sm:text-[36px] font-bold tracking-[-0.02em] mb-12 max-w-[20ch]" style={{ fontFamily: 'var(--font-heading)' }}>Slik fungerer det</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st) => {
            const Icon = ICONS[st.icon] || Repeat;
            return (
              <div key={st.no} className="relative">
                <span className="text-[13px] font-bold text-[#d298ff]">{st.no}</span>
                <div className="w-11 h-11 rounded-2xl bg-[#f4f0fb] flex items-center justify-center my-3"><Icon className="w-5 h-5 text-[#a463e8]" /></div>
                <h3 className="text-[17px] font-bold mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>{st.title}</h3>
                <p className="text-[14px] text-[#666] leading-relaxed">{st.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <CTA />
      <Footer />
    </div>
  );
}

function CTA() {
  return (
    <section className="bg-gradient-to-br from-[#1a1430] to-[#0a0a0a] text-white">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24 text-center">
        <h2 className="text-[28px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4 max-w-[22ch] mx-auto" style={{ fontFamily: 'var(--font-heading)' }}>Klar for smartere utleie?</h2>
        <p className="text-white/70 text-[16px] max-w-[50ch] mx-auto mb-8">Få en gratis, uforpliktende verdivurdering. Ingen oppstartskostnader, ingen bindingstid.</p>
        <Link href="/bli-utleier" className="group inline-flex items-center gap-2 h-[54px] pl-7 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold active:scale-[0.98] transition-transform">Få gratis verdivurdering<span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span></Link>
      </div>
    </section>
  );
}
