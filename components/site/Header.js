'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { nav, site } from '@/lib/site';

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'bg-canvas/85 backdrop-blur-md border-b border-hairline'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between h-[72px]">
          <Link href="/" aria-label="DigiHome forside" className="flex items-center">
            <Image
              src="/digihome-wordmark.svg"
              alt="DigiHome"
              width={146}
              height={34}
              priority
              className="h-7 w-auto"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {nav.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className="text-sm font-medium text-ink/70 hover:text-ink transition-colors nav-underline"
              >
                {i.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <a
              href={site.loginUrl}
              className="rounded-full bg-white text-ink h-[44px] px-6 inline-flex items-center text-sm font-semibold border border-hairline hover:bg-fill transition"
            >
              Logg inn
            </a>
            <Link
              href="/bli-utleier"
              className="rounded-full bg-ink text-white h-[44px] px-6 inline-flex items-center text-sm font-semibold hover:bg-[#333] transition"
            >
              Få vurdering
            </Link>
          </div>

          <button
            className="lg:hidden h-11 w-11 -mr-2 inline-flex items-center justify-center text-ink"
            onClick={() => setOpen((v) => !v)}
            aria-label="Åpne meny"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-hairline bg-canvas">
          <nav className="max-w-shell mx-auto px-6 py-4 flex flex-col gap-1">
            {nav.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setOpen(false)}
                className="py-3 text-base font-medium text-ink border-b border-hairline/70"
              >
                {i.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 pt-4">
              <Link
                href="/bli-utleier"
                onClick={() => setOpen(false)}
                className="rounded-full bg-ink text-white h-12 inline-flex items-center justify-center text-sm font-semibold"
              >
                Få vurdering
              </Link>
              <a
                href={site.loginUrl}
                className="rounded-full bg-white text-ink h-12 inline-flex items-center justify-center text-sm font-semibold border border-hairline"
              >
                Logg inn
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
