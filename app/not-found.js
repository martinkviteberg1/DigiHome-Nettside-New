import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { ArrowRight, Home, Building2, FileText, Phone } from 'lucide-react';

export const metadata = {
  title: 'Siden finnes ikke (404)',
  description: 'Vi fant dessverre ikke siden du lette etter. Utforsk DigiHomes tjenester eller ta kontakt.',
  robots: { index: false, follow: true },
};

const links = [
  { href: '/', icon: Home, t: 'Forsiden', b: 'Tilbake til start' },
  { href: '/bli-utleier', icon: Building2, t: 'Bli utleier', b: 'Gratis verdivurdering' },
  { href: '/leiemarkedet', icon: FileText, t: 'Leiemarkedet', b: 'Live leiepriser i Bergen' },
  { href: '/kontakt', icon: Phone, t: 'Kontakt oss', b: 'Vi svarer raskt' },
];

export default function NotFound() {
  return (
    <div className="bg-canvas text-ink min-h-screen flex flex-col">
      <Header />
      <main className="relative flex-1 flex items-center overflow-hidden">
        {/* Myk lavendel-glød + prikk-grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full"
          style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.28) 0%, rgba(207,151,252,0) 70%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{ backgroundImage: 'radial-gradient(#E7E1D8 1.2px, transparent 1.2px)', backgroundSize: '32px 32px' }}
        />
        <div className="relative w-full max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-28">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-taupe mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-lavender" /> Feil 404
          </div>
          <h1
            className="font-heading font-bold tracking-[-0.035em] leading-[1.04] text-[44px] sm:text-[64px] lg:text-[76px] max-w-[16ch]"
          >
            Denne siden har flyttet ut.
          </h1>
          <p className="text-quiet text-[17px] sm:text-[20px] mt-6 max-w-[56ch] leading-relaxed">
            Lenken er kanskje utdatert, eller siden finnes ikke lenger. Her er noen gode steder å gå videre.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-ink text-canvas px-6 py-3.5 text-[15px] font-medium transition-colors hover:bg-[#333]"
            >
              Til forsiden <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/bli-utleier"
              className="inline-flex items-center gap-2 rounded-full bg-surface border border-hairline px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-fill"
            >
              Få verdivurdering
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group rounded-card bg-surface border border-hairline p-5 transition-all hover:shadow-[0_10px_30px_-12px_rgba(10,10,10,0.18)] hover:-translate-y-0.5"
              >
                <l.icon className="w-5 h-5 text-lavender" />
                <div className="mt-4 font-heading font-bold text-[17px] tracking-[-0.01em] flex items-center gap-1.5">
                  {l.t}
                  <ArrowRight className="w-4 h-4 text-taupe opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </div>
                <div className="text-quiet text-[14px] mt-1">{l.b}</div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
