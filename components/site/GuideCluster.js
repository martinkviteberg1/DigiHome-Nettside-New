import Link from 'next/link';
import { Layers, ArrowUpRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Klyngenavigasjon (pilar ↔ spokes).
//
// Depositum-temaet rangerte tidligere på svært ulike søk fra én og samme side
// («depositumskonto regler», «leietaker har ikke betalt depositum», «når skal
// depositum tilbakebetales»). Innholdet er delt i dedikerte sider, og denne
// komponenten holder klyngen sammen — både for leseren og for lenkegrafen.
// ---------------------------------------------------------------------------
export default function GuideCluster({ cluster, currentSlug }) {
  if (!cluster) return null;
  const { pillar, spokes, isPillar } = cluster;
  const items = [pillar, ...spokes].filter((g) => g && g.slug !== currentSlug);
  if (!items.length) return null;

  return (
    <section className="max-w-[820px] mx-auto px-6 sm:px-10 pb-4">
      <div className="rounded-3xl bg-[#f7f5f2] border border-black/[0.05] p-6 sm:p-7">
        <p className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#7c3aed] mb-1.5">
          <Layers className="w-3.5 h-3.5" /> Alt om {pillar.category.toLowerCase()}
        </p>
        <p className="text-[14px] text-[#625d57] mb-5 max-w-[52ch]">
          {isPillar
            ? 'Dykk ned i det du faktisk trenger svar på:'
            : `Del av temaserien vår om ${pillar.category.toLowerCase()}:`}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((g) => (
            <Link
              key={g.slug}
              href={`/guider/${g.slug}`}
              className="group flex items-start justify-between gap-3 bg-white rounded-2xl px-5 py-4 border border-black/[0.05] hover:border-[#d9c9f5] transition-colors"
            >
              <span className="text-[14.5px] font-semibold leading-snug text-[#1f1f1f] group-hover:text-[#7c3aed] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{g.title}</span>
              <ArrowUpRight className="w-4 h-4 text-[#b8b0a6] group-hover:text-[#7c3aed] shrink-0 mt-0.5 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
