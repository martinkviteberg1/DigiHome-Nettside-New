'use client';

// ---------------------------------------------------------------------------
// Minimal navbar for /nyest — Claude-prinsippet: få lenker, mye luft.
// Fire lenker + Logg inn + én CTA. Resten av sidekartet bor i footeren.
// Samme glass-språk og logo som hovedheaderen, så merkevaren er intakt.
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

  const startOnboarding = () => {
    try { track('cta_click', { cta: 'nyest_nav' }); } catch (e) { /* analyse skal aldri blokkere */ }
    router.push('/bli-utleier/start');
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50" data-testid="nyest-nav">
      <div
        className={`border-b transition-all duration-500 ${
          scrolled
            ? 'border-[#0a0a0a]/[0.06] bg-[#fdfcfb]/88 shadow-[0_10px_30px_-24px_rgba(28,22,14,0.35)] backdrop-blur-2xl'
            : 'border-transparent bg-[#fdfcfb]/55 backdrop-blur-xl'
        }`}
      >
        <div
          className={`mx-auto flex w-full max-w-[1400px] items-center justify-between gap-6 px-6 transition-all duration-500 sm:px-10 lg:px-16 ${
            scrolled ? 'h-[62px]' : 'h-[76px]'
          }`}
        >
          <Link href="/" className="group flex shrink-0 items-center" data-testid="nyest-nav-logo">
            <img
              src="/digihome-wordmark-ink.svg"
              alt="DigiHome"
              className={`w-auto transition-all duration-500 group-hover:scale-[1.02] ${scrolled ? 'h-[22px]' : 'h-[26px]'}`}
            />
          </Link>

          <div className="flex items-center gap-8">
            <nav className="hidden items-center gap-7 lg:flex">
              {LENKER.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[13.5px] font-medium tracking-[-0.012em] text-[#1f1f1f]/70 transition-colors duration-300 hover:text-[#0a0a0a]"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-5 sm:flex">
              <Link
                href={site.loginUrl}
                className="text-[13.5px] font-medium tracking-[-0.005em] text-[#1f1f1f]/70 transition-colors hover:text-[#0a0a0a]"
              >
                Logg inn
              </Link>
              <button
                onClick={startOnboarding}
                data-testid="nyest-nav-cta"
                className="inline-flex h-[42px] items-center rounded-full bg-[#0a0a0a] px-5 text-[13.5px] font-semibold tracking-[-0.008em] text-white transition-all duration-300 hover:bg-[#232323] active:scale-[0.98]"
              >
                Bli utleier
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Lukk meny' : 'Åpne meny'}
              data-testid="nyest-nav-toggle"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a]/[0.045] lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-[#eee9e0] bg-[#fdfcfb]/97 backdrop-blur-2xl lg:hidden">
            <nav className="mx-auto flex w-full max-w-[1400px] flex-col px-6 py-4 sm:px-10">
              {LENKER.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-[#f0ece4] py-3.5 text-[15px] font-medium text-[#0a0a0a] last:border-0"
                >
                  {l.label}
                </Link>
              ))}
              <div className="flex items-center justify-between py-4">
                <Link href={site.loginUrl} className="text-[14.5px] font-medium text-[#1f1f1f]/70">
                  Logg inn
                </Link>
                <button
                  onClick={startOnboarding}
                  className="inline-flex h-[42px] items-center rounded-full bg-[#0a0a0a] px-5 text-[13.5px] font-semibold text-white"
                >
                  Bli utleier
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
