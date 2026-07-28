import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = {
  title: 'Metode og dokumentasjon av DigiHome-tall',
  description: 'Slik beregner og dokumenterer DigiHome nøkkeltall om leieinntekt, portefølje og kundetilfredshet. Se definisjoner, forbehold og oppdateringsdato.',
  alternates: { canonical: '/metode' },
  openGraph: {
    title: 'Metode og dokumentasjon | DigiHome',
    description: 'Definisjoner, datagrunnlag og forbehold for DigiHomes publiserte nøkkeltall.',
    url: `${site.url}/metode`,
    images: [{ url: site.url + site.ogImage }],
  },
};

const facts = [
  {
    title: '«Opptil 30 % høyere inntekt»',
    text: 'Dette er et potensialestimat for boliger som er egnet for dynamisk eller kombinert utleie, sammenlignet med et relevant langtidsestimat for samme bolig og periode. Resultatet varierer med bydel, standard, størrelse, sesong, beleggsgrad, døgnpris, driftskostnader og hvilke utleiemodeller som er lovlige for boligen. Påstanden er ikke en garanti for den enkelte eiendom.',
  },
  {
    title: '«Ca. 25 000 kr per måned»',
    text: 'Dette er et avrundet indikativt nivå brukt i markedsføringen, ikke et løfte om oppnåelig leie for alle boliger. Personlige vurderinger skal bygge på boligtype, størrelse, standard, beliggenhet, sesong og sammenlignbare markedsdata. Oppgi alltid adressen for en konkret vurdering.',
  },
  {
    title: '«150+ boliger»',
    text: 'Tallet skal forstås som akkumulert portefølje og/eller boliger DigiHome har forvaltet eller hatt operativt ansvar for. Det skal ikke tolkes som et offentlig sanntidstall for aktive leieforhold med mindre dette uttrykkelig oppgis. Tallet oppdateres manuelt når dokumentert grunnlag endres.',
  },
  {
    title: 'Kundetilfredshet og vurderinger',
    text: 'Prosent- og ratingspåstander skal bare brukes når måleperiode, antall svar, kanal og beregningsmåte kan dokumenteres. Dersom dokumentasjonen ikke er publisert, skal tallet behandles som intern markedsinformasjon og ikke som en uavhengig anmeldelsesscore.',
  },
];

export default function MethodPage() {
  const updated = '28. juli 2026';
  return (
    <div className="min-h-screen bg-[#fdfcfb] text-[#1f1f1f]">
      <Header />
      <main className="mx-auto max-w-[900px] px-6 pb-20 pt-32 sm:px-10 sm:pt-36">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#77716a]">Dokumentasjon · sist oppdatert {updated}</p>
        <h1 className="mt-4 max-w-[16ch] text-[38px] font-bold leading-[1.04] tracking-[-0.04em] sm:text-[54px]" style={{ fontFamily: 'var(--font-heading)' }}>Slik beregner vi tallene våre</h1>
        <p className="mt-6 max-w-[68ch] text-[16px] leading-[1.8] text-[#5f5a54]">DigiHome bruker nøkkeltall for å forklare tjenester, erfaring og mulig inntektspotensial. Denne siden definerer hva tallene betyr, hvilke forbehold som gjelder og hvordan de bør tolkes.</p>

        <section className="mt-12 divide-y divide-[#e6e1da] border-y border-[#e6e1da]">
          {facts.map((fact) => (
            <div key={fact.title} className="grid gap-3 py-7 sm:grid-cols-[250px_1fr] sm:gap-8">
              <h2 className="text-[17px] font-bold tracking-[-0.015em]" style={{ fontFamily: 'var(--font-heading)' }}>{fact.title}</h2>
              <p className="text-[14.5px] leading-[1.8] text-[#625d57]">{fact.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="text-[26px] font-bold tracking-[-0.025em]" style={{ fontFamily: 'var(--font-heading)' }}>Datakilder og kvalitet</h2>
          <ul className="mt-5 space-y-3 text-[14.5px] leading-[1.75] text-[#625d57]">
            <li>• Opplysninger registrert på boliger og leieforhold i DigiHome-plattformen.</li>
            <li>• Offentlig tilgjengelige markeds- og regelkilder, blant annet SSB, Skatteetaten, Lovdata og FINN-markedet der dette er relevant.</li>
            <li>• Personlige vurderinger skal alltid kvalitetssikres før de brukes som beslutningsgrunnlag.</li>
            <li>• Manglende boligdata skal vises som «ikke oppgitt» — aldri som nullverdi.</li>
          </ul>
        </section>

        <section className="mt-12 rounded-2xl border border-[#e1dcd5] bg-white p-6 sm:p-8">
          <h2 className="text-[22px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Viktig forbehold</h2>
          <p className="mt-3 text-[14.5px] leading-[1.8] text-[#625d57]">Estimater erstatter ikke en individuell verdivurdering, juridisk rådgivning eller skatterådgivning. Lover, skatteregler og markedsforhold kan endres. Kontroller alltid gjeldende informasjon hos den offisielle kilden.</p>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/bli-utleier/start" className="inline-flex h-12 items-center rounded-full bg-[#171513] px-6 text-[13.5px] font-bold text-white">Få personlig vurdering</Link>
          <Link href="/guider" className="inline-flex h-12 items-center rounded-full border border-[#d9d4cd] bg-white px-6 text-[13.5px] font-semibold">Se guider og kilder</Link>
        </div>
      </main>
      <JsonLd data={breadcrumbLd([{ name: 'Metode', path: '/metode' }])} />
      <JsonLd data={webPageLd({ name: 'DigiHome metode og dokumentasjon', description: 'Definisjoner, datagrunnlag og forbehold for DigiHomes publiserte nøkkeltall.', path: '/metode' })} />
      <Footer />
    </div>
  );
}
