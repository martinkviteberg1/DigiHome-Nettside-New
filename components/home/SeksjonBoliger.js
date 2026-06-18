'use client';

/*
  Seksjon — «Våre boliger».
  Henter ekte, publiserte boliger live fra DigiHome-plattformen via vår server-proxy
  (/api/listings — API-nøkkelen ligger trygt server-side). Rolig, redaksjonelt
  rutenett i samme lyse, premium stil. Hvert kort lenker til full annonse.
*/

import { useEffect, useState } from 'react';
import { ArrowUpRight, BedDouble, Maximize, MapPin } from 'lucide-react';
import { Reveal } from '@/components/site/Reveal';

const Eyebrow = ({ children }) => (
  <p className="font-body font-semibold uppercase text-[11px] tracking-[0.28em] text-taupe">{children}</p>
);

function priceLabel(l) {
  if (l.monthlyRent > 0) return { value: `${l.monthlyRent.toLocaleString('nb-NO')} kr`, suffix: ' / mnd' };
  if (l.rentalModel === 'korttid') return { value: 'Korttidsleie', suffix: '' };
  return { value: 'På forespørsel', suffix: '' };
}

function Card({ l }) {
  const price = priceLabel(l);
  const showStreet = l.street && l.street !== l.title;
  return (
    <a
      href={l.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-[20px] overflow-hidden bg-white transition-all duration-500 hover:-translate-y-1.5"
      style={{ border: '1px solid rgba(22,18,31,0.06)', boxShadow: '0 2px 4px rgba(22,18,31,0.03)' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'rgba(22,18,31,0.04)' }}>
        {l.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={l.cover}
            alt={l.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          {l.rentalLabel && (
            <span className="rounded-full bg-white/92 backdrop-blur px-3 py-1 text-[11.5px] font-semibold text-ink">{l.rentalLabel}</span>
          )}
        </div>
        {l.status === 'available' && (
          <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'rgba(24,121,78,0.92)', color: '#fff' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> Ledig
          </span>
        )}
        {l.imageCount > 1 && (
          <span className="absolute bottom-4 right-4 rounded-full bg-ink/55 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-white">
            {l.imageCount} bilder
          </span>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center gap-1.5 text-taupe">
          <MapPin className="h-4 w-4" strokeWidth={1.8} />
          <span className="text-[13px] font-medium">{l.city}{showStreet ? ` · ${l.street}` : ''}</span>
        </div>
        <h3 className="mt-2.5 font-heading font-bold tracking-[-0.015em] text-[18px] leading-snug text-ink line-clamp-2">{l.title}</h3>
        <div className="mt-3.5 flex items-center gap-5 text-[13.5px] text-quiet">
          {l.bedrooms ? <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4" strokeWidth={1.8} />{l.bedrooms} sov</span> : null}
          {l.sqm ? <span className="inline-flex items-center gap-1.5"><Maximize className="h-4 w-4" strokeWidth={1.8} />{l.sqm} m²</span> : null}
        </div>
        <div className="mt-5 pt-5 flex items-end justify-between" style={{ borderTop: '1px solid rgba(22,18,31,0.07)' }}>
          <p className="font-heading font-bold tracking-[-0.02em] text-[20px] text-ink leading-none">
            {price.value}
            {price.suffix && <span className="font-body font-medium text-[13px] text-quiet">{price.suffix}</span>}
          </p>
          <span className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-quiet transition-colors group-hover:text-[#9B5BD6]">
            Se bolig <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </a>
  );
}

function Skeleton() {
  return (
    <div className="rounded-[20px] overflow-hidden bg-white" style={{ border: '1px solid rgba(22,18,31,0.06)' }}>
      <div className="aspect-[4/3] animate-pulse" style={{ background: 'rgba(22,18,31,0.05)' }} />
      <div className="p-6 space-y-3">
        <div className="h-3 w-1/3 rounded animate-pulse" style={{ background: 'rgba(22,18,31,0.07)' }} />
        <div className="h-4 w-2/3 rounded animate-pulse" style={{ background: 'rgba(22,18,31,0.07)' }} />
        <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: 'rgba(22,18,31,0.06)' }} />
      </div>
    </div>
  );
}

export function SeksjonBoliger() {
  const [listings, setListings] = useState(null); // null = laster
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    let active = true;
    fetch('/api/listings?limit=6&status=published')
      .then((r) => r.json())
      .then((d) => { if (active) { setListings(d.listings || []); setTenant(d.tenant || null); } })
      .catch(() => { if (active) setListings([]); });
    return () => { active = false; };
  }, []);

  const loading = listings === null;
  // skjul seksjonen helt hvis ingenting kan vises
  if (!loading && (!listings || listings.length === 0)) return null;

  return (
    <section className="relative overflow-hidden bg-[#FEFBFA] text-ink">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 40% at 12% 4%, rgba(207,151,252,0.045), transparent 72%)' }} />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-28 lg:py-32">
        <div className="max-w-2xl">
          <Reveal><Eyebrow>Porteføljen</Eyebrow></Reveal>
          <Reveal as="h2" delay={0.05} className="mt-5 font-heading font-bold tracking-[-0.035em] leading-[1.04] text-[clamp(30px,4.4vw,54px)] text-ink">
            Boliger vi <span className="dh-ink-shine">forvalter nå.</span>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-[18px] leading-relaxed text-quiet max-w-xl">
              Ekte boliger i porteføljen vår — driftet av motoren, døgnet rundt. Trykk på en bolig for å se hele annonsen.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
            : listings.map((l, i) => (
                <Reveal key={l.id} delay={(i % 3) * 0.08}>
                  <Card l={l} />
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  );
}
