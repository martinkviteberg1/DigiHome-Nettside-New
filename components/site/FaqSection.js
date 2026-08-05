import { JsonLd } from '@/components/site/JsonLd';
import { faqLd } from '@/lib/seo';
import { renderRich } from '@/components/site/RichText';

// ---------------------------------------------------------------------------
// Gjenbrukbar FAQ-seksjon (server-komponent, crawlbar HTML) + FAQPage-schema.
// Google-retningslinjene krever at schema-innholdet er synlig på siden —
// derfor kobles UI og JSON-LD i samme komponent.
// <details>/<summary> gir tilgjengelig, JS-fri interaksjon.
//
// Svar kan inneholde lett inline-markup ([tekst](/sti), **fet**). Den rendres
// som ekte lenker i UI, mens faqLd() bruker stripMarkup til JSON-LD — markup
// i strukturerte data er en klassisk årsak til at rike resultater faller ut.
// ---------------------------------------------------------------------------
export default function FaqSection({ title = 'Ofte stilte spørsmål', intro, faqs = [], className = '' }) {
  if (!faqs.length) return null;
  return (
    <section className={`max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-20 ${className}`} aria-label={title}>
      <JsonLd data={faqLd(faqs)} />
      <div className="max-w-[860px]">
        <h2 className="text-[26px] sm:text-[36px] font-bold tracking-[-0.02em] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h2>
        {intro ? <p className="text-[#666] text-[15.5px] max-w-[58ch] mb-8">{intro}</p> : <div className="mb-8" />}
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group bg-white rounded-2xl shadow-[0_6px_24px_-14px_rgba(0,0,0,0.12)] open:shadow-[0_10px_36px_-16px_rgba(124,58,237,0.25)] transition-shadow">
              <summary className="flex items-center justify-between gap-4 cursor-pointer select-none list-none px-6 py-5 [&::-webkit-details-marker]:hidden">
                <span className="text-[15.5px] sm:text-[16.5px] font-semibold text-[#1f1f1f]" style={{ fontFamily: 'var(--font-heading)' }}>{f.q}</span>
                <span className="shrink-0 w-7 h-7 rounded-full bg-[#f4f0fb] text-[#7c3aed] flex items-center justify-center text-[16px] font-bold transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <div className="px-6 pb-6 -mt-1 text-[15px] leading-[1.75] text-[#4a4a4a]">{renderRich(f.a, `faq-${f.q.slice(0, 24)}`)}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
