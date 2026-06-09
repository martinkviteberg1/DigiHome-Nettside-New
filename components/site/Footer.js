import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Facebook, Linkedin } from 'lucide-react';
import { site } from '@/lib/site';

const columns = [
  {
    title: 'Tjenester',
    links: [
      { label: 'Dynamisk utleie', href: '/forvaltning' },
      { label: 'Langtidsutleie', href: '/forvaltning' },
      { label: 'Korttidsutleie', href: '/forvaltning' },
      { label: 'Rådgivning', href: '/kontakt' },
    ],
  },
  {
    title: 'Selskap',
    links: [
      { label: 'Bli utleier', href: '/bli-utleier' },
      { label: 'Bli leietaker', href: '/kontakt' },
      { label: 'Blogg', href: '/blogg' },
      { label: 'Kontakt', href: '/kontakt' },
    ],
  },
  {
    title: 'Ressurser',
    links: [
      { label: 'Om oss', href: '/om-oss' },
      { label: 'Kontakt', href: '/kontakt' },
      { label: 'Personvern', href: '/personvern' },
      { label: 'Vilkår', href: '/personvern' },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink text-white">
      <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Image
              src="/digihome-wordmark-white.svg"
              alt="DigiHome"
              width={150}
              height={35}
              className="h-7 w-auto"
            />
            <p className="mt-5 text-sm leading-relaxed text-white/60">
              Smartere utleieadministrasjon med en hybridløsning av korttids- og langtidsutleie.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a href={site.social.instagram} aria-label="Instagram" className="h-10 w-10 rounded-full border border-white/15 inline-flex items-center justify-center hover:bg-white/10 transition">
                <Instagram className="h-4 w-4" />
              </a>
              <a href={site.social.facebook} aria-label="Facebook" className="h-10 w-10 rounded-full border border-white/15 inline-flex items-center justify-center hover:bg-white/10 transition">
                <Facebook className="h-4 w-4" />
              </a>
              <a href={site.social.linkedin} aria-label="LinkedIn" className="h-10 w-10 rounded-full border border-white/15 inline-flex items-center justify-center hover:bg-white/10 transition">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-white/50">
                {col.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-white/75 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-white/50">
            © {year} SHD Forvaltning AS (DigiHome) · Org.nr {site.orgNr} · {site.address.street}, {site.address.postal} {site.address.city}
          </p>
          <div className="flex items-center gap-5 text-xs text-white/50">
            <a href={`mailto:${site.email}`} className="hover:text-white transition-colors">{site.email}</a>
            <a href={`tel:${site.phoneHref}`} className="hover:text-white transition-colors">{site.phone}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
