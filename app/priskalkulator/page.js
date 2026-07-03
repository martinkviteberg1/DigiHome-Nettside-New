import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import PriceWizard from '@/components/dh/PriceWizard';
import { ShieldCheck, Clock, BadgeCheck } from 'lucide-react';

export const metadata = {
  title: 'Priskalkulator — se hva utleie koster | DigiHome',
  description: 'Bygg din egen forvaltningspakke og se prisen med en gang. Velg mellom Selvbetjent (5 %) og Fullforvaltning (10 %), legg til det du trenger — gratis og uforpliktende.',
  alternates: { canonical: '/priskalkulator' },
  openGraph: {
    title: 'Priskalkulator — se hva utleie koster | DigiHome',
    description: 'Bygg din egen forvaltningspakke og se prisen med en gang. Gratis og uforpliktende.',
  },
};

const trust = [
  { icon: ShieldCheck, label: 'Gratis og uforpliktende' },
  { icon: Clock, label: 'Tar under 2 minutter' },
  { icon: BadgeCheck, label: 'Svar innen 24 timer' },
];

export default function PriskalkulatorPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fdfcfb' }}>
      <Header />
      <main className="pt-28 sm:pt-32 pb-28 lg:pb-24">
        {/* Hero-intro */}
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 mb-10 sm:mb-14">
          <div className="max-w-[720px]">
            <span className="inline-flex items-center gap-2 px-3.5 py-[7px] rounded-full bg-[#f5edfc] border border-[#e9d9fa] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a765e0]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8b5fc0]">Priskalkulator</span>
            </span>
            <h1 className="text-[36px] sm:text-[48px] lg:text-[54px] font-bold tracking-[-0.035em] leading-[1.05] text-[#0a0a0a] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Bygg din pakke.<br />Se prisen live.
            </h1>
            <p className="text-[16px] text-[#777] leading-[1.75] max-w-[52ch] mb-6">
              Velg hvor mye du vil gjøre selv, legg til det du trenger — og se nøyaktig hva du sitter igjen med hver måned.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {trust.map((t) => {
                const Icon = t.icon;
                return (
                  <span key={t.label} className="inline-flex items-center gap-1.5 text-[13px] text-[#888]">
                    <Icon className="w-4 h-4 text-[#a765e0]" strokeWidth={1.8} /> {t.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <PriceWizard />
      </main>
      <Footer />
    </div>
  );
}
