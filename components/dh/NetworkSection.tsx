// Ren presentasjons-seksjon — server-komponent (kun Reveal hydreres).
import React from 'react';
import Reveal from '@/components/dh/Reveal';
import { Sparkles, Wrench, Droplets, Zap, Scale, ShieldCheck, Brush } from 'lucide-react';

const services = [
  { icon: Brush, name: 'Renhold', desc: 'Profesjonelt renhold mellom leietakere og løpende vedlikehold' },
  { icon: Wrench, name: 'Vaktmester', desc: 'Tilgjengelig for akutte og planlagte vedlikeholdsoppdrag' },
  { icon: Zap, name: 'Elektriker', desc: 'Sertifiserte elektrikere for installasjon og feilsøking' },
  { icon: Droplets, name: 'Rørlegger', desc: 'Rask responstid ved lekkasjer og rørproblemer' },
  { icon: Scale, name: 'Juridisk', desc: 'Husleiekontrakter, tvistehåndtering og rådgivning via Hoffmann Thinn' },
  { icon: ShieldCheck, name: 'Forsikring', desc: 'Optimale forsikringsløsninger for utleieboliger' },
];

export default function NetworkSection() {
  return (
    <section className="py-24 sm:py-32" style={{ backgroundColor: '#fdfcfb' }} data-testid="network-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Image */}
          <Reveal as="div"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] group">
              <img src="/bergen-harbor.webp" alt="Bergen" width={1200} height={900} className="w-full aspect-[4/3] object-cover group-hover:scale-[1.03] transition-transform duration-[1200ms] ease-out" loading="lazy" decoding="async" />
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-5 -right-3 sm:-right-5 bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-[0_16px_44px_-14px_rgba(20,10,40,0.22)] border border-[#f0ece6]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#f2f0eb] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#0a0a0a]" strokeWidth={1.6} />
                </div>
                <div>
                  <p className="text-[17px] font-bold text-[#0a0a0a] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Én kontaktperson</p>
                  <p className="text-[12px] text-[#888] mt-0.5">Vi koordinerer alt</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right: Content */}
          <div>
            <Reveal as="div"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mb-5"
            >
              <span className="inline-flex items-center gap-3">
                <span className="w-7 h-px bg-[#0a0a0a]/25" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f8a80]">Vårt nettverk</span>
              </span>
            </Reveal>
            <Reveal as="h2"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5 }}
              className="text-[32px] sm:text-[40px] font-bold text-[#0a0a0a] tracking-[-0.03em] leading-[1.08] mb-5"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Komplett forvaltning med lokale partnere
            </Reveal>
            <Reveal as="p"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="text-[15px] text-[#777] leading-[1.75] mb-9 max-w-[52ch]"
            >
              Vi har bygget et nettverk av kvalitetsleverandører i Bergen som sikrer rask respons og profesjonell håndtering av alle behov knyttet til din eiendom.
            </Reveal>

            <div className="grid grid-cols-2 gap-3.5">
              {services.map((s: any, i: number) => {
                const Icon = s.icon;
                return (
                  <Reveal as="div"
                    key={s.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                    className="group flex items-start gap-3 rounded-2xl p-4 bg-white border border-[#eeeae3] transition-all duration-400 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-18px_rgba(20,10,40,0.18)] hover:border-[#d8d3c8]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#f2f0eb] flex items-center justify-center shrink-0 transition-colors duration-300 group-hover:bg-[#e9e6de]">
                      <Icon className="w-4 h-4 text-[#0a0a0a]" strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{s.name}</p>
                      <p className="text-[12px] text-[#888] leading-relaxed mt-0.5">{s.desc}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
