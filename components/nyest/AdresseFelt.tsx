'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MapPin } from 'lucide-react';
import { AddressAutocomplete } from '@/components/dh/AddressAutocomplete';
import { detectFinnUrl } from '@/components/dh/PropertyInputs';
import { track } from '@/lib/analytics';
import { trackLeadStart } from '@/lib/gtag';

// ---------------------------------------------------------------------------
// Adressefeltet — hele konseptet på /nyest.
//
// Én input, én knapp. Samme velprøvde logikk som forsiden: Geonorge-
// autocomplete, FINN-lim sendes rett i Finn-flyten, og postnr/poststed følger
// med til onboardingen når adressen velges fra listen.
// ---------------------------------------------------------------------------

type Props = {
  source: string;
  testId: string;
  buttonLabel?: string;
};

export default function AdresseFelt({ source, testId, buttonLabel = 'Kom i gang' }: Props) {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [selectedData, setSelectedData] = useState<any>(null);

  useEffect(() => {
    try { router.prefetch('/bli-utleier/start'); } catch (e) { /* prefetch er valgfritt */ }
  }, [router]);

  const handleAddressSelect = useCallback((data: any) => {
    setSelectedData(data);
    if (data?.address) {
      const clean = data.address.replace(/,\s*(Norway|Norge)$/i, '');
      setAddress(clean);
    }
  }, []);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    try { track('cta_click', { cta: source, hasAddress: !!address }); } catch (err) { /* analyse skal aldri blokkere */ }
    try { trackLeadStart(source); } catch (err) { /* analyse skal aldri blokkere */ }
    const finn = detectFinnUrl(address);
    if (finn) {
      try { track('form_input_mode', { form: source, mode: 'finn', trigger: 'paste' }); } catch (err) { /* analyse skal aldri blokkere */ }
      router.push(`/bli-utleier/start?finn=${encodeURIComponent(finn)}`);
      return;
    }
    const params = new URLSearchParams();
    if (address) params.set('address', address);
    if (selectedData?.postalCode) params.set('postal', selectedData.postalCode);
    if (selectedData?.city) params.set('city', selectedData.city);
    const q = params.toString() ? `?${params.toString()}` : '';
    router.push(`/bli-utleier/start${q}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative z-30 w-full" data-testid={`${testId}-form`}>
      <div className="e-field relative flex-wrap gap-y-1.5 p-1.5 sm:h-[62px] sm:flex-nowrap sm:p-0 sm:pl-5 sm:pr-2">
        <MapPin className="ml-2 mr-2.5 h-[17px] w-[17px] shrink-0 text-[#8d877d] sm:ml-0" strokeWidth={2} aria-hidden="true" />
        <AddressAutocomplete
          value={address}
          onChange={setAddress}
          onSelect={handleAddressSelect}
          placeholder="Skriv inn adressen din"
          showIcon={false}
          dataTestId={`${testId}-input`}
          inputClassName="flex-1 h-[46px] sm:h-[58px] px-0 text-[15.5px] bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 placeholder:text-[#8d877d] w-full"
          className="flex-1 min-w-[130px] !static"
        />
        <button
          type="submit"
          data-testid={`${testId}-submit`}
          aria-label={buttonLabel}
          className="group e-btn e-btn-dark h-[48px] w-full shrink-0 px-6 text-[14.5px] sm:w-auto"
        >
          {buttonLabel} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </form>
  );
}
