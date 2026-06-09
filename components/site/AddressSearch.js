'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MapPin } from 'lucide-react';

export function AddressSearch() {
  const [value, setValue] = useState('');
  const router = useRouter();

  const submit = (e) => {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/bli-utleier?adresse=${encodeURIComponent(q)}` : '/bli-utleier');
  };

  return (
    <form onSubmit={submit} className="w-full max-w-xl">
      <div className="flex flex-col sm:flex-row items-stretch gap-2 p-2 bg-white border border-hairline rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2 flex-1 px-3">
          <MapPin className="h-5 w-5 text-quiet shrink-0" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Hva er adressen din?"
            aria-label="Adresse"
            className="w-full bg-transparent outline-none text-ink placeholder:text-quiet h-12 text-base"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-ink text-white h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-[#333] active:scale-[0.98] transition whitespace-nowrap"
        >
          Få vurdering <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-sm text-quiet">Gratis og uforpliktende · Svar innen 24 timer</p>
    </form>
  );
}
