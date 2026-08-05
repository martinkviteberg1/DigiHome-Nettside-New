import { anchorId } from '@/lib/seo';
import { List } from 'lucide-react';

// ---------------------------------------------------------------------------
// Innholdsfortegnelse med ankerlenker.
//
// To grunner til at denne finnes:
//   1. Google kan lenke direkte til en passasje (passage/anchor-resultater),
//      som gir flere inngangsdører per side.
//   2. AI-svarmotorer bruker overskriftsstrukturen til å hente ut det avsnittet
//      som faktisk svarer på spørsmålet.
// Rendres kun når guiden har nok seksjoner til at den gir reell verdi.
// ---------------------------------------------------------------------------
export default function GuideToc({ sections = [], minSections = 5 }) {
  if (!sections.length || sections.length < minSections) return null;

  return (
    <nav aria-label="Innhold i artikkelen" className="mt-8 rounded-2xl border border-black/[0.07] bg-white px-6 py-5">
      <p className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#716b63] mb-3">
        <List className="w-3.5 h-3.5" /> Innhold
      </p>
      <ol className="space-y-0.5">
        {sections.map((s, i) => (
          <li key={s.h2} className="flex gap-2.5 text-[14.5px] leading-snug">
            <span className="text-[#7c7568] tabular-nums shrink-0 py-1.5">{i + 1}.</span>
            <a href={`#${anchorId(s.h2)}`} className="py-1.5 text-[#4a4a4a] hover:text-[#7c3aed] transition-colors">{s.h2}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
