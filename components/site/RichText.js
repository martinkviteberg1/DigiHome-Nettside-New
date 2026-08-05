import Link from 'next/link';

// ---------------------------------------------------------------------------
// Lett inline-markup for redaksjonelt innhold i /lib/guides.
//   [tekst](/sti)  → intern <Link> (eller ekstern <a> for http-URL-er)
//   **tekst**      → <strong>
//
// Hvorfor ikke markdown/HTML? Interne lenker i brødteksten er det viktigste
// SEO-grepet vi manglet: guidene refererte til hverandre i ren tekst uten at
// det ga lenkeverdi eller brukerflyt. Denne minimale tokenizeren gir oss
// crawlbare next/link-lenker uten dangerouslySetInnerHTML og uten å dra inn
// en markdown-parser i hver server-komponent.
//
// JSON-LD skal ALLTID bruke stripMarkup() fra @/lib/seo på samme tekst.
// ---------------------------------------------------------------------------

const SPLIT = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g;
const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;
const BOLD = /^\*\*([^*]+)\*\*$/;

const LINK_CLS = 'text-[#7c3aed] underline decoration-[#d9c9f5] decoration-1 underline-offset-[3px] hover:decoration-[#7c3aed] transition-colors';

export function renderRich(text, keyPrefix = 'r') {
  if (text === null || text === undefined) return null;
  const raw = String(text);
  if (!SPLIT.test(raw)) return raw;
  SPLIT.lastIndex = 0;

  const parts = raw.split(SPLIT).filter((p) => p !== '' && p !== undefined);

  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;

    const link = LINK.exec(part);
    if (link) {
      const label = link[1];
      const href = link[2];
      if (/^https?:\/\//i.test(href)) {
        return (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLS}>{label}</a>
        );
      }
      return <Link key={key} href={href} className={LINK_CLS}>{label}</Link>;
    }

    const bold = BOLD.exec(part);
    // Nøstet markup: en lenke kan ligge inne i **fet tekst**. Derfor rendres
    // innholdet rekursivt, ellers lekker rå markup ut i HTML-en.
    if (bold) return <strong key={key} className="font-semibold text-[#1f1f1f]">{renderRich(bold[1], `${key}-b`)}</strong>;

    return part;
  });
}

export default function RichText({ text, as: Tag = 'p', className = '', id }) {
  return <Tag id={id} className={className}>{renderRich(text, id || 'rt')}</Tag>;
}
