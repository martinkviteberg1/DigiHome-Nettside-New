import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import KontaktForm from '@/components/dh/KontaktForm';
import { site } from '@/lib/site';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';

export const metadata = {
  title: 'Kontakt DigiHome — eiendomsforvaltning i Bergen',
  description: 'Ta kontakt med DigiHome for en uforpliktende prat om utleie i Bergen. Ring, send e-post eller fyll ut skjemaet — vi svarer vanligvis innen én virkedag.',
  alternates: { canonical: '/kontakt' },
};

export default function Page() {
  const items = [
    { icon: Phone, label: 'Telefon', value: site.phone, href: `tel:${site.phoneHref}` },
    { icon: Mail, label: 'E-post', value: site.email, href: `mailto:${site.email}` },
    { icon: MapPin, label: 'Adresse', value: `${site.address.street}, ${site.address.postal} ${site.address.city}`, href: null },
    { icon: Clock, label: 'Åpningstider', value: 'Man–fre 09:00–16:00', href: null },
  ];
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />
      <section className="relative pt-32 pb-10 bg-[#0a0a0a] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(60% 80% at 80% 0%, rgba(164,99,232,0.35), transparent 70%)' }} />
        <div className="relative max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pt-6 pb-8">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#d298ff] mb-4"><Mail className="w-3.5 h-3.5" /> Kontakt</div>
          <h1 className="font-bold tracking-[-0.025em] leading-[1.04] text-[38px] sm:text-[54px] lg:text-[62px] max-w-[18ch]" style={{ fontFamily: 'var(--font-heading)' }}>La oss ta en prat</h1>
          <p className="text-white/75 text-[16px] sm:text-[18px] mt-4 max-w-[54ch] leading-relaxed">Lurer du på hva boligen din kan leies ut for, eller vil du vite mer om hvordan vi jobber? Vi er her for å hjelpe.</p>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-14 lg:py-20">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-start">
          <div>
            <h2 className="text-[24px] sm:text-[30px] font-bold tracking-[-0.02em] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Kontaktinformasjon</h2>
            <div className="space-y-4">
              {items.map((it) => {
                const Icon = it.icon;
                const inner = (
                  <div className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-[0_6px_30px_-18px_rgba(0,0,0,0.12)]">
                    <div className="w-11 h-11 rounded-2xl bg-[#f4f0fb] flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-[#a463e8]" /></div>
                    <div><p className="text-[12px] text-[#999] font-medium">{it.label}</p><p className="text-[15.5px] font-semibold text-[#1f1f1f]">{it.value}</p></div>
                  </div>
                );
                return it.href ? <a key={it.label} href={it.href} className="block hover:opacity-90 transition-opacity">{inner}</a> : <div key={it.label}>{inner}</div>;
              })}
            </div>
            <p className="text-[13px] text-[#999] mt-6 leading-relaxed">{site.legalName} · Org.nr {site.orgNr}</p>
          </div>
          <div>
            <h2 className="text-[24px] sm:text-[30px] font-bold tracking-[-0.02em] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Send oss en melding</h2>
            <KontaktForm />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
