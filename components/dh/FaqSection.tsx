import React from 'react';
import Link from 'next/link';
import Reveal from '@/components/dh/Reveal';
import { faq } from '@/lib/site';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';

// Synlig FAQ-seksjon (server-komponent). Speiler `faq` i lib/site.js som også
// ligger i FAQPage-JSON-LD → strukturert data matcher synlig innhold (Googles
// krav) og gir AI-motorer (ChatGPT, Perplexity, AI Overviews) siterbart Q&A.
// <details>/<summary> gjør at hele svaret ligger i HTML-en uansett åpen/lukket
// tilstand → fullt crawlbart, tilgjengelig og uten JS-avhengighet.
export default function FaqSection() {
  return (
    <section id="faq" className="py-24 sm:py-32 bg-white" data-testid="faq-section">
      <div className="max-w-[820px] mx-auto px-6 sm:px-10">
        <Reveal
          as="div"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-3">
            <span className="w-7 h-px bg-[#0a0a0a]/25" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f8a80] inline-flex items-center gap-1.5"><MessageCircleQuestion className="w-3.5 h-3.5" /> Ofte stilte spørsmål</span>
          </span>
          <h2
            className="text-[34px] sm:text-[42px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a] mt-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Spørsmål og svar
          </h2>
          <p className="text-[15px] text-[#777] leading-[1.75] mt-4 max-w-[52ch] mx-auto">
            Det viktigste du bør vite om DigiHome, 10+2-modellen og hvordan vi maksimerer leieinntekten din.
          </p>
        </Reveal>

        <div className="border-t border-[#eee]">
          {faq.map((item: any, i: number) => (
            <Reveal
              as="details"
              key={item.q}
              name="dh-faq"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              className="border-b border-[#eee]"
            >
              <summary className="faq-question flex items-center justify-between gap-4 cursor-pointer list-none py-5 select-none [&::-webkit-details-marker]:hidden">
                <h3
                  className="text-[16px] sm:text-[18px] font-semibold text-[#0a0a0a] leading-snug"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {item.q}
                </h3>
                <span className="w-8 h-8 rounded-full bg-[#f5f0fb] flex items-center justify-center shrink-0 transition-transform duration-300 [details[open]_&]:rotate-180">
                  <ChevronDown className="w-4 h-4 text-[#8f8a80]" strokeWidth={2.4} />
                </span>
              </summary>
              <p className="faq-answer text-[15px] text-[#555] leading-[1.8] pb-6 pr-10 -mt-1">{item.a}</p>
            </Reveal>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-[14px] text-[#888]">Har du flere spørsmål?</p>
          <Link
            href="/kontakt"
            className="inline-flex items-center gap-2 mt-3 h-11 px-6 rounded-full bg-[#0a0a0a] text-white text-[14px] font-semibold active:scale-[0.98] transition-transform"
          >
            Ta kontakt med oss
          </Link>
        </div>
      </div>
    </section>
  );
}
