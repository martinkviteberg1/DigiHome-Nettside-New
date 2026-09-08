import Link from 'next/link';
import PriceWizard from '@/components/dh/PriceWizard';
import Footer from '@/components/dh/Footer';
import FaqSection from '@/components/site/FaqSection';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = {
  title: 'Priskalkulator for utleieforvaltning',
  description: 'Beregn veiledende kostnad for selvforvaltning eller full forvaltning. Velg bolig, utleiemodell og tillegg — gratis og uforpliktende.',
  alternates: { canonical: '/priskalkulator' },
  openGraph: {
  twitter: { card: 'summary_large_image', images: ['/og/priskalkulator.jpg'] },
    title: 'Priskalkulator — se hva utleie koster | DigiHome',
    description: 'Bygg din egen forvaltningspakke og se prisen med en gang. Gratis og uforpliktende.',
    images: [{ url: site.url + '/og/priskalkulator.jpg', width: 1200, height: 630 }],
  },
};

const PRICE_FAQS = [
  { q: 'Er prisen i kalkulatoren bindende?', a: 'Nei. Kalkulatoren viser et veiledende estimat basert på valgene dine og gjeldende katalog. Full forvaltning kan kreve et individuelt tilbud etter at boligen og tjenesteomfanget er vurdert.' },
  { q: 'Hva er forskjellen på selvforvaltning og full forvaltning?', a: 'Ved selvforvaltning gjør boligeieren mer av arbeidet selv og bruker DigiHomes digitale verktøy. Ved full forvaltning håndterer DigiHome annonsering, visninger, leietakervalg, kontrakt, depositum og løpende oppfølging etter avtalt omfang.' },
  { q: 'Hvorfor spør kalkulatoren om adresse og boligtype?', a: 'Beliggenhet, størrelse, boligtype og antall soverom påvirker markedsleie, etterspørsel og hvilke tjenester som passer. Opplysningene brukes til å gjøre estimatet mer relevant.' },
  { q: 'Er inntektsestimatet garantert?', a: 'Nei. Faktisk leieinntekt avhenger av bolig, standard, marked, sesong, kostnader og lovlig utleiemodell. Se metodikksiden for definisjoner og forbehold.' },
];

// Immersiv fullskjerm-opplevelse — egen minimal toppbar, ingen vanlig header/footer.
export default function PriskalkulatorPage() {
  return (
    <>
      {/* Semantisk H1 for SEO/skjermlesere — kalkulatoren er klient-rendret. */}
      <h1 className="sr-only">Priskalkulator — se hva utleieforvaltning koster hos DigiHome</h1>
      <JsonLd data={breadcrumbLd([{ name: 'Priskalkulator', path: '/priskalkulator' }])} />
      <JsonLd data={webPageLd({
        name: 'DigiHome priskalkulator',
        description: 'Beregn veiledende kostnad for selvforvaltning eller full forvaltning. Velg bolig, utleiemodell og tillegg — gratis og uforpliktende.',
        path: '/priskalkulator',
        type: 'WebApplication',
      })} />
      <PriceWizard />
      <section className="bg-[#fdfcfb] border-t border-[#e8e3dc]">
        <div className="mx-auto max-w-[960px] px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#77716a]">Slik bruker du kalkulatoren</p>
          <h2 className="mt-3 text-[32px] font-bold tracking-[-0.035em] sm:text-[42px]" style={{ fontFamily: 'var(--font-heading)' }}>Veiledende pris før du ber om tilbud</h2>
          <p className="mt-5 max-w-[70ch] text-[15px] leading-[1.8] text-[#625d57]">Kalkulatoren hjelper deg å sammenligne servicegrad, utleiemodell og valgfrie tillegg. Resultatet er et veiledende estimat — ikke en bindende avtale. Endelig pris og tjenesteomfang fremgår alltid av tilbudet og avtalen du eventuelt godkjenner.</p>

          <div className="mt-10 grid gap-8 border-y border-[#e5e0d9] py-8 sm:grid-cols-3">
            <div><h3 className="text-[17px] font-bold">1. Beskriv boligen</h3><p className="mt-2 text-[13.5px] leading-[1.75] text-[#6d6760]">Adresse, boligtype, størrelse og soverom brukes til et mer relevant leie- og kostnadsestimat.</p></div>
            <div><h3 className="text-[17px] font-bold">2. Velg servicenivå</h3><p className="mt-2 text-[13.5px] leading-[1.75] text-[#6d6760]">Selvforvaltning passer deg som vil gjøre mer selv. Full forvaltning inkluderer flere operative oppgaver etter avtalt omfang.</p></div>
            <div><h3 className="text-[17px] font-bold">3. Se helheten</h3><p className="mt-2 text-[13.5px] leading-[1.75] text-[#6d6760]">Vurder både honorar, tillegg, egen tidsbruk, forventet leie og risiko — ikke bare én prosentsats.</p></div>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#e3ded7] bg-white p-6"><h3 className="text-[19px] font-bold">Selvforvaltning</h3><p className="mt-2 text-[13.5px] leading-[1.75] text-[#625d57]">Du beholder kontrollen og gjør mer av arbeidet selv, med digitale verktøy for blant annet avtale og oversikt. DigiHome oppgir 5 % av husleien; kontroller beregningsgrunnlaget i gjeldende avtale.</p></div>
            <div className="rounded-2xl border border-[#e3ded7] bg-white p-6"><h3 className="text-[19px] font-bold">Full forvaltning</h3><p className="mt-2 text-[13.5px] leading-[1.75] text-[#625d57]">DigiHome kan håndtere annonsering, visninger, leietakervalg, kontrakt, depositum og oppfølging. Pris tilpasses boligen og det faktiske tjenesteomfanget.</p></div>
          </div>

          <p className="mt-8 text-[13px] leading-relaxed text-[#77716a]">Se også <Link href="/guider/utleiemegler-vs-selvforvaltning" className="font-semibold underline underline-offset-4">utleiemegler versus selvforvaltning</Link> og <Link href="/metode" className="font-semibold underline underline-offset-4">metode og forbehold for estimater</Link>.</p>
        </div>
      </section>
      <FaqSection title="Spørsmål om priskalkulatoren" intro="Pris, innhold og forbehold — kort forklart." faqs={PRICE_FAQS} />
      <Footer />
    </>
  );
}
