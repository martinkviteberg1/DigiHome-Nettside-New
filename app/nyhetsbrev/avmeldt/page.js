import Link from 'next/link';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Avmeldt — DigiHome',
  robots: { index: false, follow: false },
};

// Bekreftelsesside etter avmelding fra nyhetsbrev (lenke i e-post).
export default function AvmeldtPage({ searchParams }) {
  const feil = searchParams?.feil === '1';
  return (
    <div className="min-h-screen bg-[#fdfcfb] flex items-center justify-center px-6">
      <div className="w-full max-w-[440px] rounded-3xl bg-white border border-[#eee] shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-10 text-center">
        <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[26px] w-auto mx-auto mb-8" />
        {feil ? (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </span>
            <h1 className="font-heading font-bold text-[24px] text-[#0a0a0a] mt-5 tracking-[-0.02em]">Ugyldig lenke</h1>
            <p className="text-[14.5px] text-[#888] mt-2.5 leading-[1.7]">
              Avmeldingslenken er ugyldig eller utløpt. Kontakt oss på{' '}
              <a href="mailto:hei@digihome.no" className="text-[#a463e8] underline">hei@digihome.no</a>, så ordner vi det manuelt.
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F4EE]">
              <CheckCircle2 className="w-5 h-5 text-[#18794E]" />
            </span>
            <h1 className="font-heading font-bold text-[24px] text-[#0a0a0a] mt-5 tracking-[-0.02em]">Du er meldt av</h1>
            <p className="text-[14.5px] text-[#888] mt-2.5 leading-[1.7]">
              Du vil ikke lenger motta nyhetsbrev fra DigiHome. Endret mening? Send oss en e-post, så melder vi deg på igjen.
            </p>
          </>
        )}
        <Link href="/" className="inline-flex items-center justify-center mt-7 h-11 px-6 rounded-full bg-[#0a0a0a] text-white text-[14px] font-semibold active:scale-[0.98] transition-transform">
          Til forsiden
        </Link>
      </div>
    </div>
  );
}
