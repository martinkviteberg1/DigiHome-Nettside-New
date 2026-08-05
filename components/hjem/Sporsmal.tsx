import React from 'react';
import Link from 'next/link';
import { faq } from '@/lib/site';

// Samme innhold som FAQPage-JSON-LD (lib/site.js) → strukturert data matcher
// synlig tekst. <details> holder hele svaret i HTML-en uansett åpen/lukket
// tilstand, så det er crawlbart og fungerer uten JavaScript. Ikonfirkanten med
// chevron er byttet med et pluss/minus tegnet i CSS.
export default function Sporsmal() {
  return (
    <section id="faq" className="e-section bg-white" data-testid="faq-section">
      <div className="e-shell grid lg:grid-cols-12 gap-x-14 gap-y-10">
        <div className="lg:col-span-4">
          <h2 className="e-h2 max-w-[16ch]">Det folk pleier å lure på.</h2>
          <p className="e-meta mt-5 max-w-[34ch]">
            Finner du ikke svaret, ring eller skriv — vi svarer innen 24 timer.
          </p>
          <Link href="/kontakt" className="e-btn e-btn-ghost mt-6">Ta kontakt</Link>
        </div>

        <div className="lg:col-span-8 e-faq e-rule e-hair e-reveal">
          {faq.map((item: any) => (
            <details key={item.q} name="dh-faq" className="group">
              <summary className="flex items-start justify-between gap-6 cursor-pointer py-5 select-none">
                <h3 className="e-h3 text-[17px] sm:text-[19px] pr-2">{item.q}</h3>
                <span className="e-faq-sign mt-2" aria-hidden="true" />
              </summary>
              <p className="e-body pb-6 pr-10 max-w-[62ch]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
