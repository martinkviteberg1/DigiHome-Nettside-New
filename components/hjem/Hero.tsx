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
// Hero — DigiHome-uttrykket tilbake, med håndverket beholdt.
//
// Forrige utgave var en redaksjonell plakat: fullbredde firkantet foto, tall i
// en hårfin tabell og display-typografi i 88 px. Presis, men kald — og langt
// fra det myke, varme boliguttrykket DigiHome er kjent for.
//
// Denne utgaven beholder det som ble bedre (én tydelig setning, én handling,
// tall med metodelenke, smart adressefelt med FINN-lim, god responsivitet) og
// tar tilbake det som var bedre før: avrundet bento av boligbilder, dybde,
// varm papirvask og én rolig produktflate. Ingen pris, ingen pulserende prikk,
// ingen badge-støy — kun det som er sant.
//
// All logikk (FINN-deteksjon, geo-parametre til onboarding, sporing, prefetch
// og test-ID-ene) er portet uendret.
// ---------------------------------------------------------------------------

export default function Hero() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [selectedData, setSelectedData] = useState<any>(null);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    try { track('cta_click', { cta: 'hero_vurdering', hasAddress: !!address }); } catch (err) { /* analyse må aldri blokkere hero-flyten */ }
    try { trackLeadStart('hero'); } catch (err) { /* analyse må aldri blokkere hero-flyten */ }
    // Smart felt: FINN-lenke limt i hero-søket → rett inn i Finn-flyten.
    const finn = detectFinnUrl(address);
    if (finn) {
      try { track('form_input_mode', { form: 'hero', mode: 'finn', trigger: 'paste' }); } catch (err) { /* analyse må aldri blokkere hero-flyten */ }
      router.push(`/bli-utleier/start?finn=${encodeURIComponent(finn)}`);
      return;
    }
    const params = new URLSearchParams();
    if (address) params.set('address', address);
    // Geo-ruting i onboarding: send med postnr/poststed når adressen ble valgt
    // fra listen, slik at /bli-utleier/start kan vise riktige tjenester.
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
      {/* Varm papirvask fra øvre venstre hjørne — lys, ikke gradientdekor. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px]"
        style={{ background: 'radial-gradient(115% 72% at 10% 0%, #f7f3ec 0%, rgba(247,243,236,0) 62%)' }}
      />
      {/* Et snev av DigiHome-lilla bak bildene. Knapt synlig, men det gir flaten
          temperatur i stedet for å være helt hvit. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-[-12%] h-[720px] w-[720px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(155,91,214,0.06) 0%, transparent 62%)' }}
      />

      <div className="e-shell relative pt-9 pb-14 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24">
        {/* Rekkefølgen er bevisst forskjellig: på desktop står tekst og tall i
            venstre spalte med bildene ved siden av, mens på mobil kommer
            boligbildene rett etter handlingen — tallene til slutt. */}
        <div className="grid items-center gap-x-12 gap-y-10 sm:gap-y-12 lg:grid-cols-12 xl:gap-x-16">
          {/* Venstre: ett budskap og én handling. */}
          <div className="lg:col-span-6 lg:order-1">
            <div className="dh-fade-up e-soft-sm inline-flex items-center gap-2.5 rounded-full border border-[#eae4da] bg-white/85 py-[7px] pl-2.5 pr-4 backdrop-blur-sm">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#f3eefb]">
                <MapPin className="h-[12px] w-[12px] text-[#7c3aed]" strokeWidth={2.4} aria-hidden="true" />
              </span>
              <span className="text-[12.5px] font-medium text-[#4a4640]">
                Forvaltning i Bergen <span className="text-[#b3aca1]">&middot;</span> Selvforvaltning i hele Norge
              </span>
            </div>

            <h1 className="e-display mt-6 text-[38px] leading-[1.03] sm:mt-7 sm:text-[52px] lg:text-[56px] xl:text-[64px]">
              <span className="e-mask"><span>Vi drifter utleien.</span></span>
              <span className="e-mask"><span>Du får inntekten<span className="text-[#9B5BD6]">.</span></span></span>
            </h1>

            <p className="dh-fade-up e-lead mt-6 max-w-[46ch]" style={{ animationDelay: '0.2s' }}>
              Vi tar annonsering, visninger, kontrakt, husleie og vedlikehold i Bergen og omegn.
              Vil du styre det selv, får du det samme systemet som selvforvaltning i hele Norge.
            </p>

            <form onSubmit={handleSubmit} className="dh-fade-up relative z-30 mt-8 max-w-[520px]" style={{ animationDelay: '0.28s' }}>
              <p className="mb-2 text-[13px] font-medium text-[#6f6a60]">Adressen din</p>
              <div className="e-field flex-wrap gap-y-1.5 p-1.5 sm:h-[64px] sm:flex-nowrap sm:p-0 sm:pl-5 sm:pr-2">
                <MapPin className="ml-2 mr-2.5 h-[17px] w-[17px] shrink-0 text-[#8d877d] sm:ml-0" strokeWidth={2} aria-hidden="true" />
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  onSelect={handleAddressSelect}
                  placeholder="Gate og husnummer"
                  showIcon={false}
                  dataTestId="hero-address-input"
                  inputClassName="flex-1 h-[46px] sm:h-[60px] px-0 text-[15.5px] bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 placeholder:text-[#8d877d] w-full"
                  className="flex-1 min-w-[130px]"
                />
                {/* På mobil legger knappen seg på egen linje: da får både
                    adressefeltet og trykkflaten nok plass til å være behagelige. */}
                <button
                  type="submit"
                  data-testid="hero-address-submit-button"
                  aria-label="Få gratis leievurdering"
                  className="e-btn e-btn-dark h-[50px] w-full shrink-0 px-6 text-[14.5px] sm:w-auto"
                >
                  Få vurdering <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <p className="e-meta mt-3">Gratis og uforpliktende &middot; Svar innen 24 timer</p>
            </form>
          </div>

          {/* Boligene: myk bento med én produktflate oppå. På desktop står de
              til høyre og spenner over begge radene i venstre spalte. */}
          <div className="lg:col-span-6 lg:order-2 lg:row-span-2">
            <HeroMedia />
          </div>

          {/* Tallene på én myk flate i stedet for i en hårfin tabell. Kilden
              står under, slik at estimatet aldri leses som et løfte. */}
          <div
            className="dh-fade-up e-soft w-full max-w-[520px] rounded-[26px] border border-[#ece7de] bg-white/75 px-5 py-5 backdrop-blur-sm sm:px-7 lg:col-span-6 lg:order-3 lg:self-start"
            style={{ animationDelay: '0.4s' }}
          >
              <div className="grid grid-cols-3 gap-x-3 sm:gap-x-5">
                {statStrip.map((s: any, i: number) => (
                  <div key={s.label} className={i > 0 ? 'border-l border-[#efeae1] pl-3 sm:pl-5' : ''}>
                    {/* Smalt mellomrom mellom tall og enhet: «24 t» får ellers et
                        hull midt i tallet i display-snittet. */}
                    <p className="e-display e-num text-[25px] sm:text-[29px]">{String(s.value).replace(' ', '\u2009')}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="h-[2px] w-3.5 shrink-0 rounded-full bg-[#c79bf0]" aria-hidden="true" />
                      <p className="text-[12px] font-medium leading-tight text-[#6f6a60] sm:text-[12.5px]">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            <p className="mt-4 border-t border-[#f1ece4] pt-3.5">
              <Link href="/metode" className="e-link e-meta">Estimatene er scenarioberegninger &mdash; se metode og forbehold</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
