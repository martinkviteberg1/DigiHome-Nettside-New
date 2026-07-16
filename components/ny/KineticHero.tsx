'use client';

// ============================================================================
// KINETISK HERO (2026-konsept, kun /ny):
// 1. Kinetisk typografi — overskriften avsløres ord-for-ord med koreografert
//    stagger (blur + løft), aksent-ordet i lilla gradient.
// 2. Regelbasert personalisering — hero-vinkelen velges av trafikkilde:
//    utm/referrer med «airbnb/sommer/korttid» → korttids-vinkel, «utleiemegler/
//    langtid» → langtids-vinkel, ellers standard. Kan tvinges med ?v=kort|lang
//    (for demo/QA). Varianten spores via track('ny_concept_view').
// 3. Gamification-light — levende inntektsestimat som teller opp, og «låses
//    opp» (suksess-tilstand) når adressen velges fra listen.
// 4. Neumorfisme-detaljer — taktil chip og myke skygger (fintech-polish).
// Innholdskilder er de SAMME som roten (30 %-påstand, 25 000 kr snitt) slik at
// sidene aldri driver fra hverandre.
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, Check, ChevronDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddressAutocomplete } from '@/components/dh/AddressAutocomplete';
import { detectFinnUrl } from '@/components/dh/PropertyInputs';
import { track } from '@/lib/analytics';

type Word = string | { t: string; accent?: boolean };

const VARIANTS: Record<string, { kicker: string; lines: Word[][]; sub: string }> = {
  default: {
    kicker: 'Eiendomsforvaltning i Bergen · 150+ boliger',
    lines: [['Smartere', 'utleie.'], ['Høyere', { t: 'inntekt.', accent: true }]],
    sub: 'Teknologi møter personlig oppfølging. 10+2-modellen vår tilpasser seg markedet automatisk — og gir deg opptil 30 % mer i leieinntekt.',
  },
  kort: {
    kicker: 'Korttidsutleie i høysesong',
    lines: [['Sommeren', 'kan', 'betale'], [{ t: 'boliglånet', accent: true }, 'ditt.']],
    sub: 'Airbnb-inntekter i juni og juli — trygg langtidsleie resten av året. 10+2-modellen gir opptil 30 % høyere årsinntekt.',
  },
  lang: {
    kicker: 'Trygg langtidsutleie',
    lines: [['Utleiemegler', '—'], ['uten', { t: 'timeprisen.', accent: true }]],
    sub: 'Samme trygghet som en tradisjonell megler — bygget på teknologi. Screening, digital kontrakt og oppfølging, med opptil 30 % mer igjen til deg.',
  },
};

function resolveVariant(): string {
  try {
    const sp = new URLSearchParams(window.location.search);
    const forced = (sp.get('v') || '').toLowerCase();
    if (['kort', 'lang', 'default'].includes(forced)) return forced;
    const utm = [sp.get('utm_source'), sp.get('utm_campaign'), sp.get('utm_term'), sp.get('utm_content')].join(' ').toLowerCase();
    const ref = (document.referrer || '').toLowerCase();
    if (/airbnb|kortt|sommer|feriebolig/.test(`${utm} ${ref}`)) return 'kort';
    if (/utleiemegler|langtid|megler/.test(utm)) return 'lang';
  } catch (e) {}
  return 'default';
}

export default function KineticHero() {
  const router = useRouter();
  const [variant, setVariant] = useState<string>('default');
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState('');
  const [selectedData, setSelectedData] = useState<any>(null);
  const [income, setIncome] = useState(0);
  const rafRef = useRef<number>(0);

  // Variantvalg + sporing — kjøres én gang på klienten.
  useEffect(() => {
    const v = resolveVariant();
    setVariant(v);
    setMounted(true);
    try { track('ny_concept_view', { variant: v }); } catch (e) {}
  }, []);

  // Inntektsteller: 0 → 25 000 over ~1,4 s (starter etter overskriften).
  useEffect(() => {
    if (!mounted) return;
    const target = 25000;
    const start = performance.now() + 700;
    const dur = 1400;
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start) / dur, 0), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setIncome(Math.round((target * eased) / 100) * 100);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mounted]);

  const handleAddressSelect = useCallback((data: any) => {
    setSelectedData(data);
    if (data?.address) setAddress(data.address.replace(/,\s*(Norway|Norge)$/i, ''));
    try { track('ny_concept_address_selected', { variant }); } catch (e) {}
  }, [variant]);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    try { track('cta_click', { cta: 'ny_hero_vurdering', variant, hasAddress: !!address }); } catch (err) {}
    const finn = detectFinnUrl(address);
    if (finn) { router.push(`/bli-utleier/start?finn=${encodeURIComponent(finn)}`); return; }
    const params = new URLSearchParams();
    if (address) params.set('address', address);
    if (selectedData?.postalCode) params.set('postal', selectedData.postalCode);
    if (selectedData?.city) params.set('city', selectedData.city);
    router.push(`/bli-utleier/start${params.toString() ? `?${params.toString()}` : ''}`);
  };

  useEffect(() => { try { router.prefetch('/bli-utleier/start'); } catch (e) {} }, [router]);

  const V = VARIANTS[variant] || VARIANTS.default;
  let wordIndex = 0;

  return (
    <section className="relative overflow-hidden pt-[64px] lg:pt-[88px]" style={{ background: '#fdfcfb' }} data-testid="ny-hero">
      <style>{`
        @keyframes nyWordIn { from { opacity: 0; transform: translateY(30px) rotate(1.5deg); filter: blur(8px); } to { opacity: 1; transform: translateY(0) rotate(0); filter: blur(0); } }
        @keyframes nyFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes nyBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
        @media (prefers-reduced-motion: reduce) { .ny-word, .ny-fade { animation: none !important; opacity: 1 !important; transform: none !important; filter: none !important; } }
      `}</style>

      {/* Varm tekstur: prikk-grid + doble gløder (større dose enn roten — konsept) */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)', backgroundSize: '24px 24px', opacity: 0.4,
        maskImage: 'radial-gradient(ellipse 75% 55% at 50% 38%, black 25%, transparent 72%)', WebkitMaskImage: 'radial-gradient(ellipse 75% 55% at 50% 38%, black 25%, transparent 72%)',
      }} />
      <div aria-hidden className="absolute -top-44 left-1/2 -translate-x-1/2 w-[900px] h-[640px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.13) 0%, transparent 62%)' }} />
      <div aria-hidden className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,214,153,0.10) 0%, transparent 60%)' }} />

      <div className="relative max-w-[1100px] mx-auto px-6 sm:px-10 text-center pt-16 sm:pt-20 lg:pt-24 pb-24 sm:pb-28 min-h-[88vh] flex flex-col items-center justify-center">
        {/* Kicker */}
        <div className="ny-fade inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-[#eae7e0] shadow-[0_2px_12px_rgba(20,10,40,0.05)]" style={{ animation: 'nyFadeUp .6s ease both' }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[12px] font-semibold text-[#555] tracking-[0.02em]">{V.kicker}</span>
        </div>

        {/* Kinetisk overskrift — remountes per variant (key) så koreografien kjører på nytt */}
        <h1 key={variant} className="mt-8 font-bold tracking-[-0.038em] leading-[1.02] text-[#0a0a0a] text-[42px] sm:text-[64px] lg:text-[78px]" style={{ fontFamily: 'var(--font-heading)' }} data-testid="ny-hero-heading">
          {V.lines.map((line, li) => (
            <span key={li} className="block">
              {line.map((w, wi) => {
                const word = typeof w === 'string' ? { t: w, accent: false } : w;
                const delay = 120 + wordIndex++ * 110;
                return (
                  <span key={wi} className="ny-word inline-block will-change-transform" style={{ animation: `nyWordIn .75s cubic-bezier(.16,1,.3,1) both`, animationDelay: `${delay}ms`, marginRight: '0.22em' }}>
                    {word.accent ? (
                      <span style={{ background: 'linear-gradient(120deg, #7c3aed 10%, #cf97fc 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{word.t}</span>
                    ) : word.t}
                  </span>
                );
              })}
            </span>
          ))}
        </h1>

        <p className="ny-fade text-[16px] sm:text-[17.5px] text-[#555] leading-[1.75] mt-7 max-w-[52ch]" style={{ animation: 'nyFadeUp .6s ease both', animationDelay: '.55s' }}>{V.sub}</p>

        {/* Adresse-CTA — samme motor som roten (AddressAutocomplete + FINN-deteksjon) */}
        <form onSubmit={handleSubmit} className="ny-fade relative z-30 mt-10 w-full max-w-[560px]" style={{ animation: 'nyFadeUp .6s ease both', animationDelay: '.7s' }} data-no-enter-advance>
          <div className="flex items-center rounded-full bg-white border border-[#e6e2dc] shadow-[0_3px_18px_rgba(20,10,40,0.06)] transition-all duration-300 focus-within:border-[#7c3aed]/40 focus-within:shadow-[0_0_0_5px_rgba(124,58,237,0.07),0_20px_54px_rgba(20,10,40,0.12)]">
            <div className="pl-6"><Search className="w-[18px] h-[18px] text-[#7c3aed]" /></div>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onSelect={handleAddressSelect}
              placeholder="Hva er adressen din?"
              showIcon={false}
              dataTestId="ny-hero-address-input"
              inputClassName="flex-1 h-[62px] px-3.5 text-[15.5px] bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 placeholder:text-[#a29b92] w-full text-left"
              className="flex-1"
            />
            <div className="pr-2">
              <Button type="submit" data-testid="ny-hero-submit" className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-[48px] px-6 text-[13.5px] font-semibold transition-all duration-300 hover:shadow-[0_8px_24px_rgba(124,58,237,0.4)] active:scale-[0.97] gap-1.5">
                Få vurdering <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </form>

        {/* Levende estimat-chip (neumorfisme + gamification-light) */}
        <div className="ny-fade mt-7" style={{ animation: 'nyFadeUp .6s ease both', animationDelay: '.85s' }}>
          <div
            data-testid="ny-income-chip"
            className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-500"
            style={selectedData ? {
              background: 'linear-gradient(135deg, #f6effe, #efe4fd)',
              boxShadow: '0 10px 30px -12px rgba(124,58,237,0.35)',
              border: '1px solid #ddc8f7',
            } : {
              background: '#f4f1ec',
              boxShadow: '7px 7px 16px rgba(190,183,172,0.45), -7px -7px 16px #ffffff',
              border: '1px solid rgba(255,255,255,0.6)',
            }}
          >
            {selectedData ? (
              <>
                <span className="w-7 h-7 rounded-full bg-[#7c3aed] flex items-center justify-center"><Check className="w-4 h-4 text-white" strokeWidth={3} /></span>
                <span className="text-[13.5px] font-semibold text-[#4c1d95] text-left">Adresse bekreftet — estimatet ditt er klart i neste steg</span>
              </>
            ) : (
              <>
                <span className="w-7 h-7 rounded-full bg-white shadow-[inset_2px_2px_5px_rgba(190,183,172,0.4)] flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-[#7c3aed]" /></span>
                <span className="text-[13.5px] text-[#555] text-left">Snittinntekt i Bergen: <span className="font-bold text-[#0a0a0a] tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{income.toLocaleString('nb-NO')} kr/mnd</span></span>
              </>
            )}
          </div>
        </div>

        {/* Scroll-invitasjon */}
        <div className="ny-fade absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5" style={{ animation: 'nyFadeUp .6s ease both', animationDelay: '1.1s' }}>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#a8a199]">Se hvordan</span>
          <ChevronDown className="w-4 h-4 text-[#c9c2b8]" style={{ animation: 'nyBounce 1.8s ease-in-out infinite' }} />
        </div>
      </div>
    </section>
  );
}
