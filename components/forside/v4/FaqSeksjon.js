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
    a: 'Du er utleieren. Systemet oppretter saker fra leietakerens melding, foreslår leverandør og henter pris, følger opp husleie og purrer, og svarer leietakeren på det som står i kontrakten. Alt som koster penger eller binder deg, godkjenner du — med ett trykk. Vil du ikke drive selv, tar en fast forvalter hos oss full forvaltning.',
  },
  {
    q: 'Hvordan signeres leiekontrakten?',
    a: 'Med BankID, gjennom Posten signering. Begge parter signerer digitalt, og den signerte kontrakten arkiveres på boligen i DigiHome.',
  },
  {
    q: 'Er DigiHome for privatpersoner eller selskaper?',
    a: 'Begge. Boligeiere med én eller noen få boliger leier ut selv, med DigiHome som system. Eiendomsselskap får roller, godkjenning og én oversikt på tvers av bygg. Vil du slippe driften helt, tar vi forvaltningen — foreløpig i Bergen og omegn.',
  },
  {
    q: 'Hva koster det?',
    a: null, // egen visning med lenker
  },
  {
    q: 'Hvordan melder leietakeren fra om noe?',
    a: 'Leietakeren sender en melding — gjerne med bilde. Systemet forstår hvilken bolig og hva det gjelder, oppretter saken og holder leietakeren oppdatert til det er løst. Leietakeren ser aldri pris eller din godkjenning.',
  },
];

export default function FaqSeksjon({ sporsmal = SPORSMAL, prisSvar = null }) {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const inn = (i) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(16px)', transition: `opacity 700ms ${EASE} ${i * 80}ms, transform 800ms ${EASE} ${i * 80}ms` });

  return (
    <section id="faq" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4-faq">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-16 pt-6 sm:px-8 sm:pb-24 sm:pt-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-32 lg:pt-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4" style={inn(0)}>
            <h2 className="text-[clamp(38px,3.6vw,64px)]" style={{ ...display, color: T.ink }} data-testid="v4-faq-tittel">
              Spørsmål<br />og svar.
            </h2>
            <p className="mt-6 max-w-[30ch] text-[17px] leading-[1.5]" style={{ color: 'rgba(21,19,15,0.64)' }}>
              Det korte svaret på det folk lurer på først. Fant du ikke ditt? Ta en kort samtale med oss — et menneske, ikke et skjema.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Lenke href="/book-mote" data-testid="v4-faq-book">Book en samtale</Lenke>
              <a href="mailto:hei@digihome.no" className="text-[15px] underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:decoration-[#15130F]" style={{ color: 'rgba(21,19,15,0.7)' }} data-testid="v4-faq-epost">hei@digihome.no</a>
            </div>
          </div>

          {/* Registeret: nummer · spørsmål · et pluss som blir minus. Første svar står åpent, så seksjonen aldri er tom.
              Svaret kommer inn under spørsmålet, innrykket til samme kolonne. */}
          <div className="lg:col-span-7 lg:col-start-6" style={inn(1)}>
            <Accordion type="single" collapsible defaultValue="q0" className="border-t border-[#15130F]/10" data-testid="v4-faq-liste">
              {sporsmal.map((s, i) => (
                <AccordionItem key={s.q} value={`q${i}`} className="border-[#15130F]/10" data-testid={`v4-faq-${i}`}>
                  <AccordionTrigger className="group py-5 text-left hover:no-underline sm:py-6 [&>svg]:hidden">
                    <span className="grid w-full grid-cols-[36px_minmax(0,1fr)_24px] items-start gap-x-4 sm:grid-cols-[48px_minmax(0,1fr)_24px] sm:gap-x-6">
                      <span className="pt-[6px] text-[13px] tabular-nums transition-colors duration-300 group-data-[state=open]:text-[#D298FF]" style={{ color: 'rgba(21,19,15,0.45)' }}>0{i + 1}</span>
                      <span className="text-[18px] font-medium leading-[1.3] tracking-[-0.012em] text-[#15130F] transition-colors duration-300 sm:text-[21px]">{s.q}</span>
                      <span aria-hidden="true" className="relative mt-[3px] block h-6 w-6 shrink-0 rounded-full transition-[box-shadow,background-color] duration-300 group-hover:bg-[#15130F]/[0.04]" style={{ boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.16)' }}>
                        <span className="absolute left-1/2 top-1/2 h-px w-[10px] -translate-x-1/2 -translate-y-1/2 bg-[#15130F]" />
                        <span className="absolute left-1/2 top-1/2 h-[10px] w-px -translate-x-1/2 -translate-y-1/2 bg-[#15130F] transition-transform duration-300 ease-out group-data-[state=open]:scale-y-0" />
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-7 text-[16px] leading-[1.55] sm:text-[16.5px]">
                    <div className="pl-[52px] pr-8 sm:pl-[72px]">
                      {s.a ? (
                        <p className="max-w-[58ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>{s.a}</p>
                      ) : prisSvar ? prisSvar : (
                        <p className="max-w-[58ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
                          Prisen følger måten du leier ut på — antall enheter og hva du vil ha på autopilot. Private kan bruke{' '}
                          <Link href="/priskalkulator" className={LINK} style={{ color: T.ink }} data-testid="v4-faq-kalkulator">priskalkulatoren</Link>. Selskaper får et konkret forslag etter en{' '}
                          <Link href="/book-mote" className={LINK} style={{ color: T.ink }} data-testid="v4-faq-demo">demo</Link>.
                        </p>
                      )}
                    </div>
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
