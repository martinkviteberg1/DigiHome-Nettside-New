'use client';

// ============================================================================
// SCROLLYTELLING: 10+2-MODELLEN (2026-konsept, kun /ny)
// Sticky kapittel der scrollen driver fortellingen i tre akter:
//   Akt 1 (0–1/3):  Langtidsannonsen (FINN-stil) — 10 måneder stabil leie
//   Akt 2 (1/3–2/3): Samme bolig blir sommerannonse (Airbnb-stil)
//   Akt 3 (2/3–1):  Resultatet — 234 000 kr/år (+30 %) med månedslinje
// Tallene er identiske med rotens 10+2-seksjon (én sannhet: 180k → 234k = +30%).
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { Star, ShieldCheck, CalendarDays } from 'lucide-react';

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);
const IMG = '/interior-openplan.webp';

const ACTS = [
  { kicker: 'August – mai', title: 'Trygg langtidsleie i bunn', sub: 'Grundig screenet leietaker, digital kontrakt og stabil inntekt ti måneder i året.' },
  { kicker: 'Juni – juli', title: 'Samme bolig. Sommerpriser.', sub: 'Når Bergen koker, bytter boligen kanal — korttidsleie med dynamisk prising i høysesongen.' },
  { kicker: 'Hele året', title: 'Resultatet: +30 % i året', sub: 'To markeder, én bolig, null ekstra arbeid for deg. Det er 10+2-modellen.' },
];

export default function ScrollyTenTwo() {
  const ref = useRef<HTMLElement | null>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current; if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        if (total <= 0) return;
        setP(clamp01(-rect.top / total));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  const act = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
  const finnOp = clamp01(1 - (p - 0.26) / 0.1);
  const airIn = clamp01((p - 0.3) / 0.1);
  const airOut = clamp01(1 - (p - 0.6) / 0.1);
  const airOp = Math.min(airIn, airOut);
  const resOp = clamp01((p - 0.64) / 0.12);
  const A = ACTS[act];

  return (
    <section ref={ref as any} className="relative" style={{ height: '320vh', backgroundColor: '#fdfcfb' }} data-testid="ny-scrolly">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div aria-hidden className="pointer-events-none absolute -top-24 right-[6%] w-[640px] h-[520px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.09) 0%, transparent 65%)' }} />
        <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-16 items-center">

          {/* Venstre: fortellingen (skifter per akt) */}
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-[#a678e8]">Én bolig. To markeder.</p>
            <div key={act} style={{ animation: 'nyActIn .5s ease both' }}>
              <p className="inline-flex items-center gap-1.5 mt-5 px-3 py-1.5 rounded-full bg-white border border-[#eae7e0] text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#555]"><CalendarDays className="w-3.5 h-3.5 text-[#7c3aed]" /> {A.kicker}</p>
              <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.03em] text-[#0a0a0a] mt-3 leading-[1.08]" style={{ fontFamily: 'var(--font-heading)' }}>{A.title}</h2>
              <p className="text-[15.5px] text-[#555] leading-relaxed mt-4 max-w-[46ch]">{A.sub}</p>
            </div>

            {/* Akt-indikator */}
            <div className="flex items-center gap-2.5 mt-9">
              {ACTS.map((a, i) => (
                <div key={i} className="h-[4px] rounded-full transition-all duration-500" style={{ width: act === i ? 44 : 20, backgroundColor: act === i ? '#7c3aed' : '#e5e0d8' }} />
              ))}
            </div>

            {/* Månedslinje: 10 langtid (ink) + 2 sommer (lilla) */}
            <div className="mt-7">
              <div className="flex gap-1">
                {Array.from({ length: 12 }).map((_, i) => {
                  const isSummer = i === 10 || i === 11; // jun + jul (visuelt sist)
                  const active = act === 2 || (act === 0 && !isSummer) || (act === 1 && isSummer);
                  return <div key={i} className="h-[10px] flex-1 rounded-[3px] transition-all duration-500" style={{ backgroundColor: isSummer ? (active ? '#a463e8' : '#eadef8') : (active ? '#0a0a0a' : '#e8e4dd') }} />;
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#a8a199]"><span>10 mnd langtid</span><span className="text-[#a463e8]">2 mnd sommer</span></div>
            </div>
          </div>

          {/* Høyre: annonsekort som morfer + resultatpanel */}
          <div className="relative h-[440px] sm:h-[500px] hidden sm:block">
            {/* FINN-stil kort */}
            <div className="absolute inset-x-6 top-2 rounded-[22px] bg-white border border-[#ececec] shadow-[0_24px_70px_-30px_rgba(20,10,40,0.3)] overflow-hidden transition-transform duration-200 will-change-transform" style={{ opacity: finnOp, transform: `translateY(${(1 - finnOp) * -26}px) rotate(${-1.5 - (1 - finnOp) * 3}deg) scale(${0.97 + finnOp * 0.03})` }}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#f0f0f0]">
                <span className="text-[15px] font-black tracking-tight" style={{ color: '#0063fb' }}>FINN<span className="text-[#0a0a0a]">.no</span></span>
                <span className="text-[11px] font-semibold text-[#716b63] uppercase tracking-[0.08em]">Til leie</span>
              </div>
              <img src={IMG} alt="Lys 3-roms leilighet på Nordnes — langtidsutleie" className="w-full h-[210px] object-cover" loading="lazy" />
              <div className="p-5">
                <p className="font-bold text-[16.5px] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Lys 3-roms med sjøutsikt — Nordnes</p>
                <p className="text-[13px] text-[#716b63] mt-1">62 m² · 2 soverom · Balkong</p>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-[19px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>15 000 kr<span className="text-[12.5px] font-medium text-[#716b63]"> /måned</span></p>
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full"><ShieldCheck className="w-3.5 h-3.5" /> Screenet leietaker</span>
                </div>
              </div>
            </div>

            {/* Airbnb-stil kort */}
            <div className="absolute inset-x-6 top-2 rounded-[22px] bg-white border border-[#ececec] shadow-[0_24px_70px_-30px_rgba(124,58,237,0.35)] overflow-hidden transition-transform duration-200 will-change-transform" style={{ opacity: airOp, transform: `translateY(${(1 - airIn) * 30}px) rotate(${(1 - airIn) * 3}deg)` }}>
              <img src={IMG} alt="Samme leilighet som sommerutleie — korttidsleie i Bergen" className="w-full h-[230px] object-cover" loading="lazy" />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[16.5px] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Hele leiligheten · Nordnes</p>
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#0a0a0a]"><Star className="w-3.5 h-3.5 fill-[#0a0a0a]" /> 4,92</span>
                </div>
                <p className="text-[13px] text-[#716b63] mt-1">4 gjester · 2 soverom · Sjøutsikt</p>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-[19px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>2 450 kr<span className="text-[12.5px] font-medium text-[#716b63]"> /natt</span></p>
                  <span className="text-[11.5px] font-semibold text-[#7c3aed] bg-[#f4edfe] px-2.5 py-1 rounded-full">Dynamisk prising</span>
                </div>
              </div>
            </div>

            {/* Resultatpanel */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 transition-all duration-300" style={{ opacity: resOp, transform: `translateY(calc(-50% + ${(1 - resOp) * 34}px))`, pointerEvents: resOp > 0.5 ? 'auto' : 'none' }}>
              <div className="rounded-[26px] bg-white border border-[#efe9ff] shadow-[0_30px_80px_-32px_rgba(124,58,237,0.4)] p-7 sm:p-9">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#a678e8]">Årsinntekt — samme bolig</p>
                <div className="grid grid-cols-2 gap-6 mt-6">
                  <div>
                    <p className="text-[11px] text-[#8f8a80] uppercase tracking-[0.12em] font-semibold">Kun langtid</p>
                    <p className="text-[26px] sm:text-[30px] font-bold text-[#9a938a] mt-1 line-through decoration-[#d8d2c8] decoration-2" style={{ fontFamily: 'var(--font-heading)' }}>180 000 kr</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#8f8a80] uppercase tracking-[0.12em] font-semibold">10+2-modellen</p>
                    <p className="text-[26px] sm:text-[30px] font-bold mt-1" style={{ fontFamily: 'var(--font-heading)', background: 'linear-gradient(135deg, #7c3aed 0%, #cf97fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>234 000 kr</p>
                  </div>
                </div>
                <div className="mt-6 pt-5 border-t border-[#f3eee6] flex items-center justify-between">
                  <p className="text-[13px] text-[#555]">10 mnd á 15 000 + sommerleie ≈ 84 000</p>
                  <span className="text-[13px] font-bold text-white bg-[#0a0a0a] px-3.5 py-1.5 rounded-full">+30 %</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobil: statisk resultatkort (scrolly-kortene er skjult under sm) */}
          <div className="sm:hidden rounded-[22px] bg-white border border-[#efe9ff] shadow-[0_24px_60px_-28px_rgba(124,58,237,0.35)] p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a678e8]">Årsinntekt — samme bolig</p>
            <p className="text-[15px] text-[#716b63] mt-3 line-through">Kun langtid: 180 000 kr</p>
            <p className="text-[24px] font-bold mt-1" style={{ fontFamily: 'var(--font-heading)', background: 'linear-gradient(135deg, #7c3aed 0%, #cf97fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>10+2: 234 000 kr (+30 %)</p>
          </div>
        </div>
      </div>
      <style>{`@keyframes nyActIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </section>
  );
}
