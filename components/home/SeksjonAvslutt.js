import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '@/components/site/Reveal';
import { PartnerMarquee } from '@/components/site/PartnerMarquee';

/*
  Seksjon 8 (/2) — partnere + endelig CTA.
  Lyst opp til CTA-en, som er ett rolig ink-panel — et premium, fokusert avtrykk til slutt.
*/

export function SeksjonAvslutt() {
  return (
    <section className="relative overflow-hidden bg-[#FEFBFA] text-ink">
      {/* partnere */}
      <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16 pt-20 sm:pt-24">
        <Reveal>
          <p className="text-center font-body font-semibold uppercase text-[11px] tracking-[0.28em] text-taupe">Vi jobber med</p>
        </Reveal>
        <Reveal delay={0.05} className="mt-8">
          <PartnerMarquee />
        </Reveal>
      </div>

      {/* CTA */}
      <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-20 sm:py-28">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[28px] px-8 py-16 sm:px-16 sm:py-24 text-center"
            style={{ background: 'linear-gradient(180deg,#16121F,#0A0A0A)', boxShadow: '0 40px 100px -50px rgba(22,18,31,0.55)' }}
          >
            <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 0%, rgba(207,151,252,0.20), transparent 60%)' }} />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-semibold text-white/80" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#34D399' }} />
                Gratis & uforpliktende · Svar innen 24 timer
              </span>
              <h2 className="mt-7 font-heading font-bold tracking-[-0.035em] leading-[1.05] text-[clamp(32px,5vw,60px)] text-white max-w-3xl mx-auto text-balance">
                Klar for å la boligen jobbe for deg?
              </h2>
              <p className="mt-6 text-[18px] leading-relaxed text-white/65 max-w-xl mx-auto">
                Få en gratis vurdering og se nøyaktig hva boligen din kan tjene. Vi skrur på motoren — du følger med.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/bli-utleier" className="rounded-full bg-white text-ink h-[54px] px-8 inline-flex items-center justify-center gap-2 text-[15px] font-semibold hover:bg-white/90 active:scale-[0.98] transition">
                  Få gratis vurdering <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link href="/kontakt" className="rounded-full text-white h-[54px] px-8 inline-flex items-center justify-center text-[15px] font-semibold transition hover:bg-white/10" style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
                  Kontakt oss
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
