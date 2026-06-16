import { Clock, Sparkles, TrendingUp } from 'lucide-react';
import { Reveal } from '@/components/site/Reveal';
import { Bar } from '@/components/site/Bar';
import { CountUp } from '@/components/site/CountUp';

/*
  Seksjon 4 (/2) — «Hva det betyr i kroner.»
  Lyst, rolig. 10+2-modellen fortalt som ett tall: samme bolig, mer inntekt.
  Venstre: narrativ + to rolige modell-rader. Høyre: en ren inntektssammenligning.
  Under: en hårfin bevis-stripe med tre tall.
*/

const Eyebrow = ({ children }) => (
  <p className="font-body font-semibold uppercase text-[11px] tracking-[0.28em] text-taupe">{children}</p>
);

const proof = [
  { value: '+30%', label: 'høyere inntekt' },
  { value: '30+', label: 'boliger i Bergen' },
  { value: '98%', label: 'fornøyde eiere' },
];

export function SeksjonVerdi() {
  return (
    <section className="relative overflow-hidden bg-[#FEFBFA] text-ink">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 50% 42% at 92% 4%, rgba(155,91,214,0.05), transparent 72%)' }}
      />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-28 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* venstre: narrativ + modeller */}
          <div>
            <Reveal><Eyebrow>Hva det betyr i kroner</Eyebrow></Reveal>
            <Reveal as="h2" delay={0.05} className="mt-5 font-heading font-bold tracking-[-0.035em] leading-[1.04] text-[clamp(30px,4vw,52px)] text-ink">
              Mer ut av <span className="dh-ink-shine">samme bolig.</span>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 text-[18px] leading-relaxed text-quiet max-w-md">
                10+2-modellen kombinerer stabil langtidsleie med premium korttidsutleie i de mest lønnsomme månedene. Resultatet er opptil 30 % høyere årsinntekt — uten at du løfter en finger.
              </p>
            </Reveal>

            <div className="mt-10 space-y-3 max-w-md">
              <Reveal delay={0.12}>
                <div className="flex items-center gap-4 rounded-2xl px-5 py-4" style={{ background: 'rgba(22,18,31,0.025)' }}>
                  <span className="h-11 w-11 shrink-0 rounded-full bg-white inline-flex items-center justify-center" style={{ boxShadow: '0 1px 3px rgba(22,18,31,0.08)' }}>
                    <Clock className="h-5 w-5 text-ink" strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="font-body font-semibold text-[15px] text-ink">10 måneder langtidsleie</p>
                    <p className="text-[13.5px] text-quiet mt-0.5">Stabil, forutsigbar inntekt — annonsert på Finn.no.</p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={0.18}>
                <div className="flex items-center gap-4 rounded-2xl px-5 py-4" style={{ background: 'rgba(155,91,214,0.06)' }}>
                  <span className="h-11 w-11 shrink-0 rounded-full bg-white inline-flex items-center justify-center" style={{ boxShadow: '0 1px 3px rgba(22,18,31,0.08)' }}>
                    <Sparkles className="h-5 w-5" style={{ color: '#9B5BD6' }} strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="font-body font-semibold text-[15px] text-ink">2 måneder korttidsutleie</p>
                    <p className="text-[13.5px] text-quiet mt-0.5">Premium-priser i sesong — på Airbnb og Booking.</p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>

          {/* høyre: inntektssammenligning */}
          <Reveal delay={0.1}>
            <div
              className="rounded-[24px] bg-white p-8 sm:p-10"
              style={{ boxShadow: '0 2px 4px rgba(22,18,31,0.04), 0 40px 90px -42px rgba(22,18,31,0.30)', border: '1px solid rgba(22,18,31,0.05)' }}
            >
              <p className="font-body font-semibold uppercase text-[10.5px] tracking-[0.22em] text-taupe">Årsinntekt · samme bolig
              </p>

              <div className="mt-9 space-y-8">
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px] text-quiet">Tradisjonell langtidsleie</span>
                    <span className="font-heading font-bold tabular-nums text-[18px] text-ink/70">180 000 kr</span>
                  </div>
                  <Bar className="mt-2.5 h-2.5 rounded-full overflow-hidden" barClassName="h-full rounded-full" width="71%" />
                  <div className="-mt-2.5 h-2.5 rounded-full" style={{ background: 'rgba(22,18,31,0.06)' }} aria-hidden />
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px] font-semibold text-ink">Med 10+2-modellen</span>
                    <span className="font-heading font-bold tabular-nums text-[22px] text-ink">252 000 kr</span>
                  </div>
                  <div className="relative mt-2.5 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(22,18,31,0.06)' }}>
                    <Bar className="absolute inset-0" barClassName="h-full rounded-full" width="100%" delay={0.25} />
                    <div className="absolute inset-0 h-full rounded-full pointer-events-none" style={{ background: 'linear-gradient(90deg,#9B5BD6,#CF97FC)', clipPath: 'inset(0 0 0 0)' }} aria-hidden />
                  </div>
                </div>
              </div>

              <div className="mt-9 pt-7 flex items-center justify-between" style={{ borderTop: '1px solid rgba(22,18,31,0.08)' }}>
                <span className="text-[14px] text-quiet">Din merinntekt</span>
                <span className="inline-flex items-center gap-2 font-heading font-bold text-[22px]" style={{ color: '#18794E' }}>
                  <TrendingUp className="h-5 w-5" strokeWidth={2} />+72 000 kr
                </span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* bevis-stripe */}
        <div className="mt-20 sm:mt-24 pt-12" style={{ borderTop: '1px solid rgba(22,18,31,0.08)' }}>
          <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {proof.map((p, i) => (
              <Reveal key={p.label} delay={i * 0.08} className="text-center">
                <p className="font-heading font-bold tracking-[-0.04em] text-[clamp(30px,4.5vw,52px)] text-ink">
                  <CountUp value={p.value} />
                </p>
                <p className="mt-1.5 text-[13.5px] sm:text-[14px] text-quiet">{p.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
