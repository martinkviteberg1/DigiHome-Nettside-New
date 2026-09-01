import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Footer from '@/components/dh/Footer';

export const metadata = {
  title: 'Priser | DigiHome',
  description: 'Prising for DigiHome — selvbetjent utleie for private og porteføljedrift for profesjonelle. Se kalkulatoren eller book en demo for et konkret forslag.',
  alternates: { canonical: '/priser' },
};

// ---------------------------------------------------------------------------
// Priser — v1-skall.
//
// Detaljert prisoversikt (tabeller/pakker) kommer senere; inntil da leder vi
// private til priskalkulatoren og bedrifter til demo. Ingen tall publiseres
// her før de er besluttet.
// ---------------------------------------------------------------------------
export default function PriserPage() {
  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <header className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 pt-6 sm:px-10">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[22px] w-auto" />
        </Link>
        <Link href="/" className="text-[13.5px] font-medium text-[#1f1f1f]/70 transition-colors hover:text-[#0a0a0a]">Til forsiden</Link>
      </header>
      <main className="mx-auto w-full max-w-[1280px] px-6 pb-24 pt-14 sm:px-10 sm:pt-20">
        <p className="e-label">Priser</p>
        <h1 className="e-display mt-4 max-w-[18ch] text-[36px] sm:text-[52px]">Betal for det du bruker. Ikke mer.</h1>
        <p className="mt-5 max-w-[52ch] text-[15.5px] leading-[1.65] text-[#6F6A60] sm:text-[16.5px]">
          Prisen avhenger av hvordan du bruker DigiHome. Full prisoversikt kommer —
          i mellomtiden får du et presist svar på under ett minutt.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:max-w-[900px]">
          <div className="rounded-[20px] bg-white p-7 ring-1 ring-black/[0.06] shadow-[0_1px_3px_rgba(23,18,12,0.04)] sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9B5BD6]">Privat huseier</p>
            <h2 className="mt-3 text-[22px] font-bold tracking-[-0.02em] text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading), sans-serif' }}>Regn ut for din bolig</h2>
            <p className="mt-2.5 text-[14px] leading-[1.65] text-[#6F6A60]">
              Kalkulatoren viser hva utleien koster — og hva du sitter igjen med —
              enten du velger full forvaltning eller selvbetjent.
            </p>
            <Link href="/priskalkulator" data-testid="priser-kalkulator" className="e-btn e-btn-dark group mt-6">
              Åpne priskalkulatoren
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="rounded-[20px] bg-[#0B0A09] p-7 text-white ring-1 ring-black/[0.2] sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#C9A6F0]">Bedrift</p>
            <h2 className="mt-3 text-[22px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading), sans-serif' }}>Tilpasset porteføljen</h2>
            <p className="mt-2.5 text-[14px] leading-[1.65] text-white/60">
              Prisen settes etter antall enheter og moduler. Book en demo, så får
              dere et konkret forslag samme uke.
            </p>
            <Link href="/book-mote" data-testid="priser-demo" className="e-btn e-btn-light group mt-6">
              Book en demo
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
