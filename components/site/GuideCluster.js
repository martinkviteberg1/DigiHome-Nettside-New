import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { T, SVAK, HAIR } from '@/components/forside/v4/tokens';

// ---------------------------------------------------------------------------
// Klyngenavigasjon (pilar ↔ spokes).
//
// Depositum-temaet rangerte tidligere på svært ulike søk fra én og samme side
// («depositumskonto regler», «leietaker har ikke betalt depositum», «når skal
// depositum tilbakebetales»). Innholdet er delt i dedikerte sider, og denne
// komponenten holder klyngen sammen — både for leseren og for lenkegrafen.
//
// V4: én tonal flate med rader — ikke kort i kort.
// ---------------------------------------------------------------------------
export default function GuideCluster({ cluster, currentSlug }) {
  if (!cluster) return null;
  const { pillar, spokes, isPillar } = cluster;
  const items = [pillar, ...spokes].filter((g) => g && g.slug !== currentSlug);
  if (!items.length) return null;

  return (
    <section className="mx-auto w-full max-w-[820px] px-5 pb-6 sm:px-8" data-testid="guide-klynge">
      <div className="rounded-[20px] px-6 py-6 sm:px-8 sm:py-7" style={{ background: T.flate }}>
        <p className="text-[13px] font-medium" style={{ color: SVAK }}>Alt om {pillar.category.toLowerCase()}</p>
        <p className="mt-1 text-[18px] font-medium" style={{ color: T.ink }}>
          {isPillar ? 'Gå dypere i det du faktisk lurer på' : `Del av temaserien om ${pillar.category.toLowerCase()}`}
        </p>
        <ol className="mt-4 border-t" style={{ borderColor: HAIR }}>
          {items.map((g) => (
            <li key={g.slug}>
              <Link href={`/guider/${g.slug}`} className="group flex items-center justify-between gap-4 border-b py-3.5 transition-colors" style={{ borderColor: HAIR }}>
                <span className="text-[15.5px] font-medium leading-snug transition-colors group-hover:text-[#15130F]/60" style={{ color: T.ink }}>{g.title}</span>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: SVAK }} strokeWidth={1.7} />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
