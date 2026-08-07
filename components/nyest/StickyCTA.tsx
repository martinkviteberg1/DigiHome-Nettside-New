'use client';

// ---------------------------------------------------------------------------
// Sticky mobil-CTA for /nyest — samme språk som resten av siden: «Kom i gang»
// rett til onboardingen. Vises etter første skjermhøyde, skjules nær bunnen
// så den ikke ligger over avslutningsfeltet og footeren.
// ---------------------------------------------------------------------------
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { track } from '@/lib/analytics';
import { trackLeadStart } from '@/lib/gtag';

export default function StickyCTA() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY > document.body.scrollHeight - 1100;
      setShow(window.scrollY > window.innerHeight * 0.9 && !nearBottom);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = () => {
    try { track('cta_click', { cta: 'nyest_sticky' }); } catch (e) { /* analyse skal aldri blokkere */ }
    try { trackLeadStart('nyest_sticky'); } catch (e) { /* analyse skal aldri blokkere */ }
    router.push('/bli-utleier/start');
  };

  return (
    <div
      className={`lg:hidden fixed left-4 right-4 z-40 transition-all duration-500 ${
        show ? 'opacity-100 translate-y-0' : 'pointer-events-none translate-y-6 opacity-0'
      }`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
      <button
        onClick={go}
        data-testid="nyest-sticky-cta"
        className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-[#0a0a0a]/95 text-[15px] font-semibold text-white shadow-[0_16px_44px_-10px_rgba(10,10,10,0.55)] backdrop-blur-xl transition-transform active:scale-[0.98]"
      >
        Kom i gang <ArrowRight className="h-4 w-4 text-[#d298ff]" />
      </button>
    </div>
  );
}
