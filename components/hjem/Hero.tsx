'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, MapPin } from 'lucide-react';
import { AddressAutocomplete } from '@/components/dh/AddressAutocomplete';
import { detectFinnUrl } from '@/components/dh/PropertyInputs';
import { track } from '@/lib/analytics';
import { trackLeadStart } from '@/lib/gtag';
import { statStrip } from '@/lib/site';
import HeroMedia from './HeroMedia';

// ---------------------------------------------------------------------------
// Hero — rolig presisjon.
//
// Underveis har denne siden vært både en hard redaksjonell plakat og en myk
// samling kort med chips, tonede bånd og hvite bokser. Begge feilene har samme
// rot: flater ble brukt til å skape hierarki. Her er hierarkiet typografisk.
//
// Én papirtone. Én stor påstand. Én handling. To veier som ren tekst. Tallene
// over en hårfin linje, med metodelenke. Ingen pille-merker, ingen rammer,
// ingen bakgrunnsfarger — luften gjør jobben.
//
// Logikken er portet uendret: FINN-lim i adressefeltet, geo-parametre videre
// til onboarding, sporing, prefetch og alle test-ID-er.
// ---------------------------------------------------------------------------

export default function Hero() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [selectedData, setSelectedData] = useState<any>(null);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    try { track('cta_click', { cta: 'hero_vurdering', hasAddress: !!address }); } catch (err) { /* analyse skal aldri blokkere */ }
    try { trackLeadStart('hero'); } catch (err) { /* analyse skal aldri blokkere */ }
    // Smart felt: en limt FINN-lenke sendes rett inn i Finn-flyten.
    const finn = detectFinnUrl(address);
    if (finn) {
      try { track('form_input_mode', { form: 'hero', mode: 'finn', trigger: 'paste' }); } catch (err) { /* analyse skal aldri blokkere */ }
      router.push(`/bli-utleier/start?finn=${encodeURIComponent(finn)}`);
      return;
    }
    const params = new URLSearchParams();
    if (address) params.set('address', address);
    // Geo-ruting i onboarding: postnr/poststed følger med når adressen ble valgt
    // fra listen, slik at riktige tjenester vises.
    if (selectedData?.postalCode) params.set('postal', selectedData.postalCode);
    if (selectedData?.city) params.set('city', selectedData.city);
    const q = params.toString() ? `?${params.toString()}` : '';
    router.push(`/bli-utleier/start${q}`);
  };

  useEffect(() => { try { router.prefetch('/bli-utleier/start'); } catch (e) { /* prefetch er valgfritt */ } }, [router]);

  const handleAddressSelect = useCallback((data: any) => {
    setSelectedData(data);
    if (data?.address) {
      const clean = data.address.replace(/,\s*(Norway|Norge)$/i, '');
      setAddress(clean);
    }
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#fdfcfb] pt-[64px] lg:pt-[88px]" data-testid="hero-section">
      {/* Ett svakt lys øverst til venstre. Ikke en gradientflate, bare dybde. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px]"
        style={{ background: 'radial-gradient(105% 68% at 8% 0%, #f6f2ea 0%, rgba(246,242,234,0) 62%)' }}
      />

      <div className="e-shell relative pt-12 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28">
        <div className="grid items-center gap-x-12 gap-y-14 lg:grid-cols-12 xl:gap-x-20">
          <div className="lg:col-span-6 lg:order-1">
            <p className="e-eyebrow dh-fade-up">Forvaltning i Bergen &middot; Selvforvaltning i hele Norge</p>

            <h1 className="e-display mt-7 text-[42px] leading-[1.0] sm:text-[58px] lg:text-[62px] xl:text-[72px]">
              <span className="e-mask"><span>Utleie som</span></span>
              <span className="e-mask"><span>går av seg selv<span className="text-[#9B5BD6]">.</span></span></span>
            </h1>

            <p className="dh-fade-up e-lead mt-7 max-w-[44ch]" style={{ animationDelay: '0.2s' }}>
              Annonse, leiekontrakt med BankID, depositumskonto og husleie skjer i plattformen.
              Du velger om en forvalter i Bergen også skal møte opp — eller om du tar visningene selv.
            </p>

            <form onSubmit={handleSubmit} className="dh-fade-up relative z-30 mt-9 max-w-[500px]" style={{ animationDelay: '0.28s' }}>
              <div className="e-field flex-wrap gap-y-1.5 p-1.5 sm:h-[62px] sm:flex-nowrap sm:p-0 sm:pl-5 sm:pr-2">
                <MapPin className="ml-2 mr-2.5 h-[17px] w-[17px] shrink-0 text-[#8d877d] sm:ml-0" strokeWidth={2} aria-hidden="true" />
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  onSelect={handleAddressSelect}
                  placeholder="Skriv inn adressen din"
                  showIcon={false}
                  dataTestId="hero-address-input"
                  inputClassName="flex-1 h-[46px] sm:h-[58px] px-0 text-[15.5px] bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 placeholder:text-[#8d877d] w-full"
                  className="flex-1 min-w-[130px]"
                />
                <button
                  type="submit"
                  data-testid="hero-address-submit-button"
                  aria-label="Få gratis leievurdering"
                  className="e-btn e-btn-dark h-[48px] w-full shrink-0 px-6 text-[14.5px] sm:w-auto"
                >
                  Få vurdering <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <p className="e-meta mt-3">Gratis og uforpliktende &middot; Svar innen 24 timer</p>
            </form>

            {/* De to veiene som tekst. En lenke trenger ikke ramme for å være
                tydelig — vekt og pil holder. */}
            <div className="dh-fade-up mt-7 flex flex-wrap items-center gap-x-8 gap-y-3" style={{ animationDelay: '0.36s' }}>
              <Link href="/forvaltning" className="group inline-flex items-baseline gap-2 text-[14.5px] font-semibold text-[#0a0a0a] transition-colors hover:text-[#7c3aed]">
                Full forvaltning
                <span className="font-normal text-[#8d877d]">Bergen</span>
                <ArrowRight className="h-3.5 w-3.5 self-center transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link href="/selvforvaltning" className="group inline-flex items-baseline gap-2 text-[14.5px] font-semibold text-[#0a0a0a] transition-colors hover:text-[#7c3aed]">
                Selvforvaltning
                <span className="font-normal text-[#8d877d]">hele Norge</span>
                <ArrowRight className="h-3.5 w-3.5 self-center transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Bildene: to motiver, forskjøvet. */}
          <div className="lg:col-span-6 lg:order-2 lg:row-span-2">
            <HeroMedia />
          </div>

          {/* Tallene over en hårfin linje — ingen boks, kilden står under. */}
          <div
            className="dh-fade-up w-full max-w-[500px] border-t border-[#eae5dc] pt-7 lg:col-span-6 lg:order-3 lg:self-start"
            style={{ animationDelay: '0.44s' }}
          >
            <div className="flex flex-wrap items-start gap-x-12 gap-y-6">
              {statStrip.map((s: any) => (
                <div key={s.label}>
                  {/* Smalt mellomrom mellom tall og enhet: «24 t» får ellers et
                      hull midt i tallet i display-snittet. */}
                  <p className="e-display e-num text-[26px] sm:text-[29px]">{String(s.value).replace(' ', '\u2009')}</p>
                  <p className="mt-1.5 text-[12.5px] text-[#6f6a60]">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-5">
              <Link href="/metode" className="e-link e-meta">Estimatene er scenarioberegninger &mdash; se metode og forbehold</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
