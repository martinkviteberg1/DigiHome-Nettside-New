'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddressAutocomplete } from './AddressAutocomplete';

const T = {
  heading: { no: 'Smartere utleie. Høyere inntekt.', en: 'Smarter rentals. Higher income.' },
  sub: { no: 'DigiHome kombinerer teknologi med personlig oppfølging for å maksimere leieinntekten din. Vår hybridløsning av korttids- og langtidsutleie tilpasser seg markedet automatisk.', en: 'DigiHome combines technology with personal support to maximize your rental income. Our hybrid short-term and long-term rental solution adapts to the market automatically.' },
  placeholder: { no: 'Hva er adressen din?', en: 'What is your address?' },
  cta: { no: 'Få vurdering', en: 'Get estimate' },
};

const IMG = {
  main: '/interior-hallway.webp',
  side1: '/interior-bedroom.webp',
  side2: '/bergen-houses.webp',
};

export default function HeroSection() {
  const router = useRouter();
  const locale: 'no' | 'en' = 'no';
  const [address, setAddress] = useState('');
  const [focused, setFocused] = useState(false);
  const [selectedData, setSelectedData] = useState<any>(null);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const q = address ? `?address=${encodeURIComponent(address)}` : '';
    router.push(`/bli-utleier${q}`);
  };

  // Forhåndslast skjemaet så «Få vurdering» åpner umiddelbart (ingen ventetid).
  useEffect(() => { try { router.prefetch('/bli-utleier'); } catch (e) {} }, [router]);

  const handleAddressSelect = useCallback((data: any) => {
    setSelectedData(data);
    if (data?.address) {
      const clean = data.address.replace(/,\s*(Norway|Norge)$/i, '');
      setAddress(clean);
    }
  }, []);

  return (
    <section className="pt-[64px] lg:pt-[88px] relative overflow-hidden" style={{ background: '#fdfcfb' }} data-testid="hero-section">
      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)',
        backgroundSize: '24px 24px',
        opacity: 0.45,
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, black 30%, transparent 75%)',
      }} />
      {/* Soft lavender glow */}
      <div className="absolute -top-40 right-0 w-[700px] h-[700px] rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(207,151,252,0.07) 0%, transparent 65%)',
      }} />
      <div className="relative max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pt-14 sm:pt-18 lg:pt-20 pb-20 sm:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 xl:gap-20 items-center">
          {/* Left */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-[38px] sm:text-[48px] lg:text-[56px] xl:text-[62px] font-bold tracking-[-0.035em] leading-[1.06] text-[#0a0a0a]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >{T.heading[locale]}</motion.h1>

            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
              className="text-[16px] sm:text-[17px] text-[#555] leading-[1.75] mt-7 max-w-[44ch]">
              {T.sub[locale]}
            </motion.p>

            <motion.form onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-9">
              <div
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className={`flex items-center max-w-[460px] rounded-2xl bg-white border transition-all duration-400 ${
                focused
                  ? 'border-[#cf97fc]/60 shadow-[0_0_0_3px_rgba(207,151,252,0.16),0_12px_40px_rgba(0,0,0,0.08)]'
                  : 'border-[#e5e5e5] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)]'
              }`}>
                <div className="pl-5"><Search className="w-[18px] h-[18px] text-[#737373]" /></div>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  onSelect={handleAddressSelect}
                  placeholder={T.placeholder[locale]}
                  showIcon={false}
                  dataTestId="hero-address-input"
                  inputClassName="flex-1 h-[56px] px-3.5 text-[15px] bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 placeholder:text-[#737373] w-full"
                  className="flex-1"
                />
                <div className="pr-1.5">
                  <Button type="submit" data-testid="hero-address-submit-button"
                    className="rounded-xl bg-[#0a0a0a] text-white hover:bg-black h-[44px] px-6 text-[13px] font-semibold transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] active:scale-[0.97] gap-1.5">
                    {T.cta[locale]} <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-[12px] text-[#737373] mt-3 ml-1">Gratis og uforpliktende &middot; Svar innen 24 timer</p>
            </motion.form>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.7 }}
              className="flex items-center gap-10 mt-12">
              {[{ n: '30+', l: 'Eiendommer' }, { n: '98%', l: 'Tilfredshet' }, { n: '+30%', l: 'Høyere inntekt' }].map((s: any) => (
                <div key={s.l}>
                  <p className="text-[22px] font-bold text-[#0a0a0a] tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>{s.n}</p>
                  <p className="text-[11px] text-[#aaa] mt-0.5">{s.l}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Mobile hero image */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:hidden -mx-6 sm:-mx-10"
          >
            <div className="relative rounded-[20px] mx-6 sm:mx-10 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <img
                src="/interior-openplan.webp"
                alt="Premium interiør Bergen"
                className="w-full h-[220px] sm:h-[280px] object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                <div className="bg-white/95 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                  <p className="text-[9px] text-[#999] leading-tight">Snittinntekt Bergen</p>
                  <p className="text-[15px] font-bold text-[#0a0a0a] mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>25 000 kr<span className="text-[10px] font-normal text-[#999] ml-0.5">/mnd</span></p>
                </div>
                <div className="bg-white/95 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-[#f5edfc] flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#cf97fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <span className="text-[11px] font-semibold text-[#0a0a0a]">+30%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: bento (desktop only) */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block">
            <div className="grid grid-cols-5 gap-3 h-[560px] xl:h-[600px]">
              <div className="col-span-3 rounded-[20px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] group">
                <img src={IMG.main} alt="Stue" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1000ms] ease-out" loading="eager" />
              </div>
              <div className="col-span-2 flex flex-col gap-3">
                <div className="flex-1 rounded-[20px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] group">
                  <img src={IMG.side1} alt="Soverom" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1000ms] ease-out" loading="eager" />
                </div>
                <div className="flex-1 rounded-[20px] overflow-hidden relative shadow-[0_8px_30px_rgba(0,0,0,0.06)] group">
                  <img src={IMG.side2} alt="Rom" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1000ms] ease-out" loading="lazy" />
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 1.2 }}
                    className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xl rounded-2xl px-5 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] text-[#999] leading-tight">Snittinntekt Bergen</p>
                        <p className="text-[17px] font-bold text-[#0a0a0a] mt-1 whitespace-nowrap" style={{ fontFamily: 'var(--font-heading)' }}>25 000 kr<span className="text-[11px] font-normal text-[#999] ml-0.5">/mnd</span></p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-[#f5edfc] flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-[#cf97fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
