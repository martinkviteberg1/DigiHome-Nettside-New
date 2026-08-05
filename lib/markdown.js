import { marked } from 'marked';
import { anchorId } from '@/lib/seo';

// ---------------------------------------------------------------------------
// Artikkel-markdown → HTML, med det redaksjonelle laget på toppen.
//
// Hvorfor ikke bare marked.parse()?
//   1. H2-ene må ha id-er for at innholdsfortegnelsen og passasjelenking skal
//      fungere — samme grep som ga guidene ankere.
//   2. Tabeller må pakkes i en scroll-container, ellers sprenger de layouten
//      på 390px mobil (56 % av trafikken).
//   3. Eksterne lenker skal ha rel="noopener" og åpnes i ny fane; interne skal
//      ikke.
//   4. Bilder i brødteksten skal lazy-lastes og ha rimelige dimensjoner.
//
// Kjøres kun på server (importerer marked + lib/seo).
// ---------------------------------------------------------------------------

export function buildArticle(markdown = '') {
  const source = String(markdown || '');
  let html = marked.parse(source, { breaks: true, gfm: true });

  // --- H2 → id + innholdsfortegnelse -------------------------------------
  const headings = [];
  const seen = new Set();

  html = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (_m, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    if (!text) return `<h2${attrs}>${inner}</h2>`;
    let id = anchorId(text) || 'seksjon';
    let n = 2;
    while (seen.has(id)) { id = `${anchorId(text)}-${n}`; n += 1; }
    seen.add(id);
    headings.push({ id, text });
    return `<h2 id="${id}" class="dh-anchor"${attrs}>${inner}</h2>`;
  });

  // --- Tabeller: scroll-container på små skjermer ------------------------
  html = html.replace(/<table>/g, '<div class="dh-table-wrap"><table>').replace(/<\/table>/g, '</table></div>');

  // --- Eksterne lenker: ny fane + noopener -------------------------------
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, (m, href) => {
    if (href.includes('digihome.no')) return m;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer"`;
  });

  // --- Bilder i brødteksten ----------------------------------------------
  html = html.replace(/<img /g, '<img loading="lazy" decoding="async" ');

  return { html, headings };
}

// Lesetid basert på 225 ord/min, som er et realistisk snitt for norsk
// fagtekst. Minimum 1 minutt — «0 min lesetid» ser ødelagt ut.
export function readingTime(markdown = '') {
  const words = String(markdown || '').replace(/[#*_>`\[\]()]/g, ' ').split(/\s+/).filter(Boolean).length;
  return { words, minutes: Math.max(1, Math.round(words / 225)) };
}
