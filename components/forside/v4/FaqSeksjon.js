'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { EASE, Lenke, T, display, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   FaqSeksjon — «Spørsmål og svar.»

   Contained, smal. Venstre: tittel + «ikke funnet svaret?». Høyre: fem svar
   på hårlinjer (shadcn Accordion). Svarene holder seg til det siden allerede
   påstår: godkjenning før kostnad, BankID via Posten signering, private /
   selskap / forvaltning (Bergen og omegn), pris via kalkulator eller demo.
   Ingen tall som ikke er publisert.
--------------------------------------------------------------------------- */

const LINK = 'underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]';

const SPORSMAL = [
  {
    q: 'Hva gjør DigiHome av seg selv — og hva må jeg gjøre?',
    a: 'DigiHome oppretter saker, foreslår leverandør og henter pris, følger opp husleie og svarer leietakeren ut fra kontrakten. Alt som koster penger eller går ut av huset, godkjenner du — med ett trykk. Du bestemmer, systemet gjør resten.',
  },
  {
    q: 'Hvordan signeres leiekontrakten?',
    a: 'Med BankID, gjennom Posten signering. Begge parter signerer digitalt, og den signerte kontrakten arkiveres på boligen i DigiHome.',
  },
  {
    q: 'Er DigiHome for privatpersoner eller selskaper?',
    a: 'Begge. Private med én eller noen få boliger bruker DigiHome selv. Eiendomsselskap får roller, godkjenning og én oversikt på tvers av bygg. Vil du slippe alt, tar vi forvaltningen — foreløpig i Bergen og omegn.',
  },
  {
    q: 'Hva koster det?',
    a: null, // egen visning med lenker
  },
  {
    q: 'Hvordan melder leietakeren fra om noe?',
    a: 'Leietakeren sender en melding — gjerne med bilde. DigiHome forstår hvilken bolig og hva det gjelder, oppretter saken og holder leietakeren oppdatert til det er løst. Leietakeren ser aldri pris eller din godkjenning.',
  },
];

export default function FaqSeksjon({ sporsmal = SPORSMAL, prisSvar = null }) {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const inn = (i) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(16px)', transition: `opacity 700ms ${EASE} ${i * 80}ms, transform 800ms ${EASE} ${i * 80}ms` });

  return (
    <section id="faq" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4-faq">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-24 pt-8 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-32 lg:pt-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4" style={inn(0)}>
            <h2 className="text-[clamp(38px,3.6vw,64px)]" style={{ ...display, color: T.ink }} data-testid="v4-faq-tittel">
              Spørsmål<br />og svar.
            </h2>
            <p className="mt-6 max-w-[30ch] text-[17px] leading-[1.5]" style={{ color: 'rgba(21,19,15,0.64)' }}>
              Fant du ikke svaret? Ta en kort samtale med oss.
            </p>
            <div className="mt-6">
              <Lenke href="/book-mote" data-testid="v4-faq-book">Book en samtale</Lenke>
            </div>
          </div>

          <div className="lg:col-span-7 lg:col-start-6" style={inn(1)}>
            <Accordion type="single" collapsible className="border-t border-[#15130F]/10" data-testid="v4-faq-liste">
              {sporsmal.map((s, i) => (
                <AccordionItem key={s.q} value={`q${i}`} className="border-[#15130F]/10" data-testid={`v4-faq-${i}`}>
                  <AccordionTrigger className="py-5 text-left text-[17px] font-medium text-[#15130F] hover:no-underline sm:py-6 sm:text-[18px] [&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:text-[#15130F]/55">
                    {s.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 pr-8 text-[16px] leading-[1.55] sm:text-[16.5px]">
                    {s.a ? (
                      <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>{s.a}</p>
                    ) : prisSvar ? prisSvar : (
                      <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
                        Prisen følger måten du leier ut på — antall enheter og hva du vil ha på autopilot. Private kan bruke{' '}
                        <Link href="/priskalkulator" className={LINK} style={{ color: T.ink }} data-testid="v4-faq-kalkulator">priskalkulatoren</Link>. Selskaper får et konkret forslag etter en{' '}
                        <Link href="/book-mote" className={LINK} style={{ color: T.ink }} data-testid="v4-faq-demo">demo</Link>.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
