'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from '@/lib/motion-lite';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';

const assurances = ['Gratis vurdering', 'Svar innen 24 timer', 'Ingen binding'];

export default function CTASection() {
  const router = useRouter();
  return (
    <section className="bg-[#0a0a0a] relative overflow-hidden">
      {/* Lavender glow */}
      <div className="absolute -top-48 -right-32 w-[720px] h-[720px] rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(207,151,252,0.13) 0%, transparent 62%)',
      }} />
      <div className="absolute -bottom-56 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(155,108,196,0.09) 0%, transparent 60%)',
      }} />
      <div className="relative max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}
          className="py-24 sm:py-32 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-[7px] rounded-full bg-white/[0.06] border border-white/[0.12] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#cf97fc]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#cf97fc]">Kom i gang</span>
            </span>
            <h2 className="text-[36px] sm:text-[46px] lg:text-[54px] font-bold tracking-[-0.03em] leading-[1.06] text-white" style={{ fontFamily: 'var(--font-heading)' }} data-testid="cta-start-onboarding-button">
              Klar for å la eiendommen jobbe for deg?
            </h2>
          </div>
          <div className="lg:text-right">
            <p className="text-[16px] text-white/55 mb-8 max-w-[38ch] lg:ml-auto leading-[1.75]">
              Få en gratis vurdering og se nøyaktig hva eiendommen din kan tjene. Ingen forpliktelser.
            </p>
            <div className="flex flex-wrap items-center gap-4 lg:justify-end">
              <Button onClick={() => router.push('/bli-utleier')}
                className="rounded-full bg-white text-[#0a0a0a] hover:bg-[#f3eafc] h-[52px] px-8 text-[14px] font-semibold transition-all duration-300 hover:shadow-[0_8px_32px_rgba(207,151,252,0.28)] active:scale-[0.97] gap-2">
                Få gratis vurdering <ArrowRight className="w-4 h-4" />
              </Button>
              <Button onClick={() => router.push('/priskalkulator')} variant="ghost"
                className="rounded-full text-white/60 hover:text-white hover:bg-white/5 h-[52px] px-8 text-[14px]">
                Se hva det koster
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8 lg:justify-end">
              {assurances.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 text-[13px] text-white/45">
                  <Check className="w-3.5 h-3.5 text-[#cf97fc]" strokeWidth={2.5} /> {a}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
