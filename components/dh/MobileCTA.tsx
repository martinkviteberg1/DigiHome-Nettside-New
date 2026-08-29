'use client';

// Sticky mobil-CTA — vises etter at brukeren har scrollet forbi hero,
// skjules nær bunnen (unngår å ligge over footer/CTA-seksjonen).
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { track } from '@/lib/analytics';
import { trackLeadStart } from '@/lib/gtag';

export default function MobileCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY > document.body.scrollHeight - 1000;
      setShow(window.scrollY > 750 && !nearBottom);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const spor = () => {
    try { track('cta_click', { cta: 'mobile_sticky' }); } catch (e) {}
    try { trackLeadStart('mobile_sticky'); } catch (e) {}
  };

  return (
    <div
      className={`lg:hidden fixed left-4 right-4 z-40 transition-all duration-500 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
      <Link
        href="/bli-utleier"
        prefetch
        onClick={spor}
        data-testid="mobile-sticky-cta"
        className="w-full h-[54px] rounded-[10px] bg-[#0a0a0a]/95 backdrop-blur-xl text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_16px_44px_-10px_rgba(10,10,10,0.55)] border border-white/[0.08] active:scale-[0.98] transition-transform"
      >
        Få gratis verdivurdering <ArrowRight className="w-4 h-4 text-[#d298ff]" />
      </Link>
    </div>
  );
}
