import { Quote, Star } from 'lucide-react';
import { Reveal } from '@/components/site/Reveal';

/*
  Seksjon 7 (/2) — «Eiere som har sluttet å bekymre seg.»
  Lyst, redaksjonelt. Stort CEO-sitat i front, deretter tre rolige kundeomtaler.
*/

const Eyebrow = ({ children }) => (
  <p className="font-body font-semibold uppercase text-[11px] tracking-[0.28em] text-taupe">{children}</p>
);

const TESTIMONIALS = [
  { name: 'Maria S.', role: 'Eiendomseier, Nordnes', quote: 'DigiHome har økt inntekten vår med over 35 % mot forrige langtidsleie. Profesjonelt, enkelt og lønnsomt.' },
  { name: 'Thomas K.', role: 'Eiendomseier, Sandviken', quote: 'Jeg merker knapt at jeg eier en utleiebolig lenger. Alt går på autopilot, og inntekten tikker inn hver måned.' },
  { name: 'Ingrid L.', role: 'Eiendomseier, Møhlenpris', quote: 'Transparensen imponerer mest. Jeg ser nøyaktig hva som skjer, og teamet er alltid tilgjengelig når jeg trenger dem.' },
];

export function SeksjonStemmer() {
  return (
    <section className="relative overflow-hidden bg-[#FEFBFA] text-ink">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 52% 44% at 50% -4%, rgba(155,91,214,0.045), transparent 70%)' }}
      />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-28 lg:py-32">
        {/* CEO-sitat */}
        <div className="max-w-3xl mx-auto text-center">
          <Reveal><Eyebrow>Mennesker bak motoren</Eyebrow></Reveal>
          <Reveal delay={0.06}>
            <Quote className="mx-auto mt-7 h-9 w-9" style={{ color: 'rgba(155,91,214,0.35)' }} fill="currentColor" strokeWidth={0} />
          </Reveal>
          <Reveal as="blockquote" delay={0.1} className="mt-5 font-heading font-semibold tracking-[-0.025em] leading-[1.22] text-[clamp(24px,3.4vw,40px)] text-ink">
            «Teknologien gir oss dataene. Menneskene våre gjør forskjellen — et team som kjenner Bergen og behandler hjemmet ditt som sitt eget.»
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mt-9 flex items-center justify-center gap-3">
              <span className="h-12 w-12 rounded-full inline-flex items-center justify-center font-heading font-bold text-[15px]" style={{ background: 'rgba(155,91,214,0.10)', color: '#9B5BD6' }}>SS</span>
              <div className="text-left">
                <p className="font-heading font-bold text-[16px] text-ink" style={{ fontStyle: 'italic' }}>Sarah Sleeman</p>
                <p className="text-[13px] text-quiet">Daglig leder & eiendomsmegler, DigiHome</p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* kundeomtaler */}
        <div className="mt-20 grid md:grid-cols-3 gap-5 lg:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <figure className="h-full rounded-[20px] bg-white p-8 flex flex-col" style={{ border: '1px solid rgba(22,18,31,0.06)', boxShadow: '0 2px 4px rgba(22,18,31,0.03)' }}>
                <div className="flex gap-0.5" style={{ color: '#9B5BD6' }}>
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
                <blockquote className="mt-5 text-[15px] leading-relaxed text-ink/90 flex-1">“{t.quote}”</blockquote>
                <figcaption className="mt-6 pt-5 flex items-center gap-3" style={{ borderTop: '1px solid rgba(22,18,31,0.07)' }}>
                  <span className="h-10 w-10 rounded-full inline-flex items-center justify-center font-bold text-[13px]" style={{ background: 'rgba(22,18,31,0.04)', color: '#16121F' }}>
                    {t.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </span>
                  <div>
                    <p className="font-semibold text-[14.5px] text-ink">{t.name}</p>
                    <p className="text-[12.5px] text-taupe">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
