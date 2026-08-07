'use client';

// ---------------------------------------------------------------------------
// Minimal navbar for /nyest — Claude-prinsippet: få elementer, mye luft.
// Alltid synlig: logo · Logg inn · Bli utleier · hamburger. Resten av
// sidekartet bor i hamburgermenyen, uansett skjermbredde. Én rolig linje.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { site } from '@/lib/site';
import { track } from '@/lib/analytics';

const LENKER = [
  { label: 'Selvforvaltning', href: '/selvforvaltning' },
  { label: 'Forvaltning', href: '/forvaltning' },
  { label: 'Ledige boliger', href: '/ledige-boliger' },
  { label: 'Om oss', href: '/om-oss' },
];

export default function Nav() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lås scroll bak menyen når den er åpen — føles solid, ikke som en overlay.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const startOnboarding = () => {
    try { track('cta_click', { cta: 'nyest_nav' }); } catch (e) { /* analyse skal aldri blokkere */ }
    setOpen(false);
    router.push('/bli-utleier/start');
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50" data-testid="nyest-nav">
      <div
        className={`border-b transition-all duration-500 ${
          scrolled || open
            ? 'border-[#0a0a0a]/[0.06] bg-[#fdfcfb]/92 shadow-[0_10px_30px_-24px_rgba(28,22,14,0.35)] backdrop-blur-2xl'
            : 'border-transparent bg-[#fdfcfb]/55 backdrop-blur-xl'
        }`}
      >
        <div
          className={`mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-5 transition-all duration-500 sm:gap-6 sm:px-8 lg:px-16 ${
            scrolled ? 'h-[60px]' : 'h-[72px] sm:h-[76px]'
          }`}
        >
          <Link href="/" className="group flex shrink-0 items-center" data-testid="nyest-nav-logo">
            <img
              src="/digihome-wordmark-ink.svg"
              alt="DigiHome"
              className={`w-auto transition-all duration-500 group-hover:scale-[1.02] ${scrolled ? 'h-[20px] sm:h-[22px]' : 'h-[22px] sm:h-[26px]'}`}
            />
          </Link>

          {/* Høyre side — alltid samme tre elementer. Aldri en tom topplinje. */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href={site.loginUrl}
              data-testid="nyest-nav-login"
              className="hidden h-9 items-center rounded-full px-3 text-[13.5px] font-medium tracking-[-0.005em] text-[#1f1f1f]/75 transition-colors hover:bg-[#0a0a0a]/[0.04] hover:text-[#0a0a0a] sm:inline-flex"
            >
              Logg inn
            </Link>
            <button
              onClick={startOnboarding}
              data-testid="nyest-nav-cta"
              className="inline-flex h-[38px] items-center rounded-full bg-[#0a0a0a] px-4 text-[13px] font-semibold tracking-[-0.008em] text-white transition-all duration-300 hover:bg-[#232323] active:scale-[0.98] sm:h-[42px] sm:px-5 sm:text-[13.5px]"
            >
              Bli utleier
            </button>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Lukk meny' : 'Åpne meny'}
              aria-expanded={open}
              data-testid="nyest-nav-toggle"
              className="ml-0.5 flex h-10 w-10 items-center justify-center rounded-full text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a]/[0.045] sm:ml-1"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Hamburger-panel — vises på alle skjermbredder. En rolig liste med
            store treffområder, samme tone som forsiden. */}
        {open && (
          <div className="border-t border-[#0a0a0a]/[0.06] bg-[#fdfcfb]/98 backdrop-blur-2xl">
            <nav className="mx-auto flex w-full max-w-[1400px] flex-col px-5 py-3 sm:px-8 lg:px-16">
              {LENKER.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-[#0a0a0a]/[0.06] py-4 text-[16px] font-medium tracking-[-0.012em] text-[#0a0a0a] transition-colors last:border-0 hover:text-[#0a0a0a]/70"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href={site.loginUrl}
                onClick={() => setOpen(false)}
                className="border-t border-[#0a0a0a]/[0.06] py-4 text-[15px] font-medium text-[#1f1f1f]/75 sm:hidden"
              >
                Logg inn
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
