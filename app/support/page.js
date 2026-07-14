import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { site } from '@/lib/site';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';
import { Mail, Phone, Trash2, ShieldCheck, FileText, MessageCircle } from 'lucide-react';

export const metadata = {
  title: 'Support og hjelp',
  description: 'Trenger du hjelp med DigiHome? Kontakt support på e-post eller telefon — vi svarer raskt. Her finner du også lenker til personvern, vilkår og kontosletting.',
  alternates: { canonical: '/support' },
};

export default function SupportPage() {
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <JsonLd data={breadcrumbLd([{ name: 'Support', path: '/support' }])} />
      <JsonLd data={webPageLd({ name: 'Support og hjelp', description: 'Kontakt DigiHome-support på e-post eller telefon — vi svarer raskt.', path: '/support' })} />
      <Header />

      <section className="max-w-[820px] mx-auto px-6 sm:px-10 lg:px-16 pt-32 sm:pt-36 pb-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9333EA] mb-3">Hjelp</p>
        <h1 className="text-[34px] sm:text-[46px] font-bold tracking-[-0.03em] leading-[1.05] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
          Support
        </h1>
        <p className="text-[15px] sm:text-[17px] text-[#555] leading-relaxed mt-5 max-w-[62ch]">
          Trenger du hjelp med appen, plattformen eller et leieforhold? Vi svarer
          raskt — som regel samme dag i åpningstiden (man–fre 09–16).
        </p>
      </section>

      <div className="max-w-[820px] mx-auto px-6 sm:px-10 lg:px-16 pb-24 space-y-10">
        <div className="grid sm:grid-cols-2 gap-4">
          <a href="mailto:support@digihome.no" className="rounded-2xl border border-[#eee] bg-white p-6 hover:border-[#9333EA] transition-colors group">
            <Mail className="w-5 h-5 text-[#9333EA]" />
            <p className="font-bold text-[16px] text-[#0a0a0a] mt-3">E-post</p>
            <p className="text-[14.5px] text-[#555] mt-1">support@digihome.no</p>
            <p className="text-[12.5px] text-[#999] mt-2">Svar innen få timer på hverdager</p>
          </a>
          <a href={`tel:${site.phoneHref}`} className="rounded-2xl border border-[#eee] bg-white p-6 hover:border-[#9333EA] transition-colors group">
            <Phone className="w-5 h-5 text-[#9333EA]" />
            <p className="font-bold text-[16px] text-[#0a0a0a] mt-3">Telefon</p>
            <p className="text-[14.5px] text-[#555] mt-1">{site.phone}</p>
            <p className="text-[12.5px] text-[#999] mt-2">Man–fre 09–16</p>
          </a>
        </div>

        <section>
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-[-0.02em] text-[#0a0a0a] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Vanlige henvendelser</h2>
          <div className="space-y-3">
            {[
              { icon: MessageCircle, t: 'Problemer med innlogging eller appen', d: 'Send e-post med hvilken enhet du bruker, så hjelper vi deg i gang.', h: 'mailto:support@digihome.no' },
              { icon: FileText, t: 'Spørsmål om leieforhold eller faktura', d: 'Oppgi adressen på boligen, så finner vi saken din raskt.', h: 'mailto:support@digihome.no' },
              { icon: ShieldCheck, t: 'Personvern og innsyn i egne data', d: 'Les personvernerklæringen, eller kontakt personvern@digihome.no.', h: '/personvern' },
              { icon: Trash2, t: 'Slette kontoen din', d: 'Egen side med skjema — sletting fullføres innen 30 dager.', h: '/slett-konto' },
            ].map((x) => (
              <Link key={x.t} href={x.h} className="flex items-start gap-4 rounded-2xl border border-[#eee] bg-white p-5 hover:border-[#9333EA] transition-colors">
                <x.icon className="w-5 h-5 text-[#9333EA] mt-0.5 shrink-0" />
                <span>
                  <span className="block font-semibold text-[15px] text-[#0a0a0a]">{x.t}</span>
                  <span className="block text-[14px] text-[#555] mt-0.5">{x.d}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <p className="text-[13px] text-[#888]">
          {site.legalName} · Org.nr {site.orgNr} · {site.address.street}, {site.address.postal} {site.address.city}
        </p>
      </div>

      <Footer />
    </div>
  );
}
