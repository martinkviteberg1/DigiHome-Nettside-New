'use client';

import React from 'react';
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
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <img src="/bergen-harbor.webp" alt="Bergen" width={1200} height={900} className="w-full aspect-[4/3] object-cover" loading="lazy" decoding="async" />
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f3ebff' }}>
                  <Sparkles className="w-5 h-5" style={{ color: '#AE68E4' }} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[18px] font-bold text-[#222]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Én kontaktperson</p>
                  <p className="text-[12px] text-[#999]">Vi koordinerer alt</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: '#AE68E4' }}>Vårt nettverk</p>
            <h2 className="text-[32px] font-bold text-[#222] tracking-[-0.03em] leading-tight mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Komplett forvaltning med lokale partnere
            </h2>
            <p className="text-[16px] text-[#717171] leading-relaxed mb-8">
              Vi har bygget et nettverk av kvalitetsleverandører i Bergen som sikrer rask respons og profesjonell håndtering av alle behov knyttet til din eiendom.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {services.map((s: any, i: number) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-xl p-4 transition-all hover:shadow-sm" style={{ backgroundColor: '#F5F5F5' }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#f3ebff' }}>
                      <Icon className="w-[16px] h-[16px]" style={{ color: '#AE68E4' }} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#222]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.name}</p>
                      <p className="text-[12px] text-[#999] leading-relaxed mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
