import { Sparkles, ShieldCheck, CalendarRange, Check } from 'lucide-react';
import { Reveal } from '@/components/site/Reveal';

/*
  Seksjon 5 (/2) — «Tre måter å leie ut på.»
  Lyst, minimalistisk. Tre rolige kort, ett fremhevet (10+2). Ingen tunge rammer —
  hårfine linjer, myk skygge, mye luft.
*/

const Eyebrow = ({ children }) => (
  <p className="font-body font-semibold uppercase text-[11px] tracking-[0.28em] text-taupe">{children}</p>
);

const MODELS = [
  {
    icon: ShieldCheck,
    name: 'Langtidsutleie',
    tag: 'Trygt og forutsigbart',
    body: 'Full forvaltning av langtidsleie — annonsering, visninger, leietakeroppfølging og vedlikehold.',
    highlight: 'Fast månedlig inntekt',
    featured: false,
  },
  {
    icon: Sparkles,
    name: 'Dynamisk utleie',
    tag: '10+2-modellen',
    body: '10 måneder fast leietaker, 2 måneder sesongutleie. Tilpasses automatisk etter ettersp*sel.',
    highlight: 'Opptil 30 % høyere inntekt',
    featured: true,
  },
  {
    icon: CalendarRange,
    name: 'Korttidsutleie',
    tag: 'Airbnb & Booking',
    body: 'Profesjonell korttidsutleie med styling, foto, dynamisk prising og full gjesteservice.',
    highlight: 'Høy avkastning i sesong',
    featured: false,
  },
];

export function SeksjonModeller() {
  return (
    <section className="relative overflow-hidden bg-[#FEFBFA] text-ink">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 48% 40% at 8% 2%, rgba(207,151,252,0.045), transparent 72%)' }}
      />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-28 lg:py-32">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal><Eyebrow>Tjenester</Eyebrow></Reveal>
          <Reveal as="h2" delay={0.05} className="mt-5 font-heading font-bold tracking-[-0.035em] leading-[1.04] text-[clamp(30px,4.4vw,54px)] text-ink">
            Tre måter å leie ut på.
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-[18px] leading-relaxed text-quiet max-w-xl mx-auto">
              Velg modellen som passer boligen din — eller la motoren anbefale den mest lønnsomme. Samme team, samme ro, uansett hva du velger.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 lg:mt-16 grid md:grid-cols-3 gap-5 lg:gap-6">
          {MODELS.map((m, i) => {
            const Icon = m.icon;
            return (
              <Reveal key={m.name} delay={i * 0.08}>
                <div
                  className="group relative h-full rounded-[22px] p-8 lg:p-9 transition-all duration-500 hover:-translate-y-1.5"
                  style={
                    m.featured
                      ? { background: 'linear-gradient(180deg,#FFFFFF,#FCF7FF)', border: '1px solid rgba(155,91,214,0.22)', boxShadow: '0 2px 4px rgba(22,18,31,0.04), 0 30px 70px -38px rgba(155,91,214,0.45)' }
                      : { background: '#FFFFFF', border: '1px solid rgba(22,18,31,0.06)', boxShadow: '0 2px 4px rgba(22,18,31,0.03)' }
                  }
                >
                  {m.featured && (
                    <span className="absolute top-7 right-7 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide" style={{ color: '#9B5BD6', background: 'rgba(155,91,214,0.10)' }}>
                      Mest populær
                    </span>
                  )}
                  <span
                    className="h-12 w-12 rounded-full inline-flex items-center justify-center"
                    style={m.featured ? { background: 'rgba(155,91,214,0.10)' } : { background: 'rgba(22,18,31,0.04)' }}
                  >
                    <Icon className="h-5 w-5" style={{ color: m.featured ? '#9B5BD6' : '#16121F' }} strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-6 font-heading font-bold tracking-[-0.02em] text-[24px] text-ink">{m.name}</h3>
                  <p className="mt-1 text-[13.5px] font-medium text-taupe">{m.tag}</p>
                  <p className="mt-4 text-[15px] leading-relaxed text-quiet">{m.body}</p>
                  <div className="mt-7 pt-5 flex items-center gap-2" style={{ borderTop: '1px solid rgba(22,18,31,0.07)' }}>
                    <Check className="h-4 w-4" style={{ color: '#18794E' }} strokeWidth={2.4} />
                    <span className="text-[14px] font-semibold text-ink">{m.highlight}</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
