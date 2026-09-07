import { Plus } from 'lucide-react';
import { JsonLd } from '@/components/site/JsonLd';
import { faqLd } from '@/lib/seo';
import { renderRich } from '@/components/site/RichText';
import { T, display, SVAK, HAIR } from '@/components/forside/v4/tokens';

// ---------------------------------------------------------------------------
// Gjenbrukbar FAQ-seksjon (server-komponent, crawlbar HTML) + FAQPage-schema.
// Google-retningslinjene krever at schema-innholdet er synlig på siden —
// derfor kobles UI og JSON-LD i samme komponent.
// <details>/<summary> gir tilgjengelig, JS-fri interaksjon.
//
// V4: rader på hårlinjer i stedet for hvite kort. `smal` justerer bredden
// til artikkelkolonnen (820) — standard er 1100 som øvrige V4-seksjoner.
//
// Svar kan inneholde lett inline-markup ([tekst](/sti), **fet**). Den rendres
// som ekte lenker i UI, mens faqLd() bruker stripMarkup til JSON-LD — markup
// i strukturerte data er en klassisk årsak til at rike resultater faller ut.
// ---------------------------------------------------------------------------
export default function FaqSection({ title = 'Ofte stilte spørsmål', intro, faqs = [], className = '', smal = false, label = null }) {
  if (!faqs.length) return null;
  return (
    <section className={`mx-auto w-full ${smal ? 'max-w-[820px]' : 'max-w-[1100px]'} px-5 py-16 sm:px-8 lg:py-20 ${className}`} aria-label={title} data-testid="faq-seksjon">
      <JsonLd data={faqLd(faqs)} />
      {label ? <p className="text-[13.5px] font-medium" style={{ color: SVAK }}>{label}</p> : null}
      <h2 className={`${label ? 'mt-3' : ''} text-[clamp(30px,3.2vw,44px)]`} style={{ ...display, color: T.ink }}>
        {title}<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
      </h2>
      {intro ? <p className="mt-4 max-w-[58ch] text-[16px] leading-[1.55]" style={{ color: 'rgba(21,19,15,0.64)' }}>{intro}</p> : null}
      <div className="mt-8 border-t" style={{ borderColor: HAIR }}>
        {faqs.map((f) => (
          <details key={f.q} className="group border-b" style={{ borderColor: HAIR }}>
            <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
              <span className="text-[17px] font-medium leading-snug sm:text-[18px]" style={{ color: T.ink }}>{f.q}</span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors group-open:bg-[#15130F] group-open:text-white" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}`, color: T.ink }} aria-hidden="true">
                <Plus className="h-4 w-4 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.8} />
              </span>
            </summary>
            <div className="-mt-1 max-w-[64ch] pb-6 text-[15.5px] leading-[1.7]" style={{ color: 'rgba(21,19,15,0.74)' }}>{renderRich(f.a, `faq-${f.q.slice(0, 24)}`)}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
