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
    <nav aria-label="Innhold i artikkelen" className="mt-10 rounded-[16px] px-6 py-5" style={{ background: '#EDEAE3' }}>
      <p className="mb-3 flex items-center gap-2 text-[13.5px] font-medium" style={{ color: '#15130F' }}>
        <List className="h-3.5 w-3.5" strokeWidth={1.8} /> Innhold
      </p>
      <ol className="space-y-0.5">
        {sections.map((s, i) => (
          <li key={s.h2} className="flex gap-2.5 text-[14.5px] leading-snug">
            <span className="shrink-0 py-1.5 tabular-nums" style={{ color: 'rgba(21,19,15,0.45)' }}>{String(i + 1).padStart(2, '0')}</span>
            <a href={`#${anchorId(s.h2)}`} className="py-1.5 transition-colors hover:text-[#15130F]" style={{ color: 'rgba(21,19,15,0.75)' }}>{s.h2}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
