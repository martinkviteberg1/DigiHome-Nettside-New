'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from '@/lib/motion-lite';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  const router = useRouter();
  return (
    <section className="bg-[#0a0a0a]">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}
          className="py-24 sm:py-32 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-[34px] sm:text-[44px] lg:text-[50px] font-bold tracking-[-0.03em] leading-[1.08] text-white" style={{ fontFamily: 'var(--font-heading)' }} data-testid="cta-start-onboarding-button">
              Klar for å la eiendommen jobbe for deg?
            </h2>
          </div>
          <div className="lg:text-right">
            <p className="text-[16px] text-white/55 mb-8 max-w-[38ch] lg:ml-auto leading-[1.75]">
              Få en gratis vurdering og se nøyaktig hva eiendommen din kan tjene. Ingen forpliktelser.
            </p>
            <div className="flex flex-wrap items-center gap-4 lg:justify-end">
              <Button onClick={() => router.push('/bli-utleier')}
                className="rounded-full bg-white text-[#0a0a0a] hover:bg-white/90 h-[50px] px-8 text-[14px] font-semibold transition-all duration-200 hover:shadow-[0_4px_20px_rgba(255,255,255,0.15)] active:scale-[0.97] gap-2">
                Få gratis vurdering <ArrowRight className="w-4 h-4" />
              </Button>
              <Button onClick={() => router.push('/kontakt')} variant="ghost"
                className="rounded-full text-white/55 hover:text-white/70 hover:bg-white/5 h-[50px] px-8 text-[14px]">
                Kontakt oss
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
