import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { site } from '@/lib/site';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';

export const metadata = {
  title: 'Brukervilkår',
  description: 'Vilkår for bruk av DigiHome — nettsiden, plattformen og mobil-appen. Gjelder utleiere, leietakere og forvaltere.',
  alternates: { canonical: '/vilkar' },
};

const updated = '2. juli 2026';

function Section({ id, n, title, children }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-[20px] sm:text-[24px] font-bold tracking-[-0.02em] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
        <span className="text-[#9333EA] mr-2">{n}</span>{title}
      </h2>
      <div className="space-y-3 text-[15px] sm:text-[16px] leading-relaxed text-[#444]">{children}</div>
    </section>
  );
}

export default function VilkarPage() {
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <JsonLd data={breadcrumbLd([{ name: 'Brukervilkår', path: '/vilkar' }])} />
      <JsonLd data={webPageLd({ name: 'Brukervilkår', description: 'Vilkår for bruk av DigiHome — nettsiden, plattformen og mobil-appen.', path: '/vilkar' })} />
      <Header />

      <section className="max-w-[820px] mx-auto px-6 sm:px-10 lg:px-16 pt-32 sm:pt-36 pb-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9333EA] mb-3">Juridisk</p>
        <h1 className="text-[34px] sm:text-[46px] font-bold tracking-[-0.03em] leading-[1.05] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
          Brukervilkår
        </h1>
        <p className="text-[15px] sm:text-[17px] text-[#555] leading-relaxed mt-5 max-w-[62ch]">
          Disse vilkårene gjelder bruk av {site.name} — både nettsiden (digihome.no),
          web-plattformen (app.digihome.no) og mobil-appen. Ved å opprette konto eller
          bruke tjenestene godtar du vilkårene.
        </p>
        <p className="text-[13px] text-[#888] mt-4">Sist oppdatert: {updated}</p>
      </section>

      <div className="max-w-[820px] mx-auto px-6 sm:px-10 lg:px-16 pb-24 space-y-12">
        <Section id="tjenesten" n="1." title="Om tjenesten">
          <p>
            {site.name} leveres av {site.legalName} (org.nr {site.orgNr}),
            {' '}{site.address.street}, {site.address.postal} {site.address.city}.
            Tjenesten omfatter utleieforvaltning av bolig i Bergen-området, med
            digital plattform og mobil-app for utleiere (boligeiere), leietakere og forvaltere.
            Spørsmål om vilkårene rettes til{' '}
            <a href="mailto:support@digihome.no" className="text-[#9333EA] underline underline-offset-2">support@digihome.no</a>.
          </p>
        </Section>

        <Section id="kontoer" n="2." title="Brukerkontoer og roller">
          <p>Plattformen har tre roller med ulik tilgang:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Utleier (boligeier):</strong> innsyn i egen bolig, leieforhold, økonomi og rapporter.</li>
            <li><strong>Leietaker:</strong> eget leieforhold, henvendelser/saker, dokumenter og betalingsinformasjon.</li>
            <li><strong>Forvalter:</strong> administrasjon av boliger og leieforhold på vegne av {site.name}.</li>
          </ul>
          <p>
            Du er ansvarlig for at opplysningene på kontoen din er riktige, og for å holde
            påloggingsinformasjonen din sikker. Kontoen er personlig og skal ikke deles.
            Mistanke om uautorisert bruk meldes til oss umiddelbart.
          </p>
        </Section>

        <Section id="bruk" n="3." title="Akseptabel bruk">
          <p>Du forplikter deg til å ikke:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>bruke tjenesten i strid med norsk lov eller tredjeparts rettigheter,</li>
            <li>laste opp innhold som er ulovlig, krenkende eller som du ikke har rett til å dele,</li>
            <li>forsøke å omgå sikkerhetsmekanismer, skaffe deg uautorisert tilgang eller forstyrre driften,</li>
            <li>kopiere eller gjenbruke tjenestens innhold eller programvare uten skriftlig samtykke.</li>
          </ul>
        </Section>

        <Section id="forvaltning" n="4." title="Forvaltningstjenesten">
          <p>
            Innhold på nettsiden — inkludert verdivurderinger, kalkulatorer og
            inntektsestimater — er veiledende og utgjør ikke bindende tilbud eller
            garanti for faktisk leieinntekt. Forvaltningsoppdrag inngås alltid i
            egen skriftlig avtale mellom deg og {site.legalName}, og den avtalen går
            foran disse vilkårene ved motstrid. Leieforhold reguleres av husleieloven
            og den enkelte leieavtalen.
          </p>
        </Section>

        <Section id="betaling" n="5." title="Betaling">
          <p>
            Betalinger som gjennomføres via web-plattformen behandles av vår
            betalingsleverandør Stripe. Husleie, depositum og honorarer følger den
            til enhver tid gjeldende leie- eller forvaltningsavtalen. Vi lagrer ikke
            fullstendige kortopplysninger selv.
          </p>
        </Section>

        <Section id="immaterielt" n="6." title="Immaterielle rettigheter">
          <p>
            Alt innhold i tjenesten — tekst, design, grafikk, logoer og programvare —
            tilhører {site.legalName} eller våre lisensgivere. Du beholder rettighetene
            til innhold du selv laster opp (f.eks. bilder), men gir oss nødvendig
            lisens til å behandle det for å levere tjenesten.
          </p>
        </Section>

        <Section id="ansvar" n="7." title="Ansvar og forbehold">
          <p>
            Tjenesten leveres «som den er». Vi etterstreber høy oppetid og korrekt
            informasjon, men kan ikke garantere at tjenesten alltid er feilfri eller
            tilgjengelig. {site.legalName} er ikke ansvarlig for indirekte tap, og vårt
            samlede ansvar er uansett begrenset til det som følger av ufravikelig norsk
            lov og eventuell skriftlig avtale mellom partene.
          </p>
        </Section>

        <Section id="avslutning" n="8." title="Avslutning av konto">
          <p>
            Du kan når som helst be om å avslutte kontoen din og få slettet dine
            personopplysninger — se{' '}
            <Link href="/slett-konto" className="text-[#9333EA] underline underline-offset-2">digihome.no/slett-konto</Link>.
            Har du et aktivt leie- eller forvaltningsforhold, gjelder avtalens
            oppsigelsesregler i tillegg. Vi kan stenge kontoer som brukes i strid med
            disse vilkårene.
          </p>
        </Section>

        <Section id="endringer" n="9." title="Endringer i vilkårene">
          <p>
            Vi kan oppdatere vilkårene ved behov. Vesentlige endringer varsles i
            tjenesten eller på e-post. Datoen øverst viser når vilkårene sist ble endret.
          </p>
        </Section>

        <Section id="lovvalg" n="10." title="Lovvalg og verneting">
          <p>
            Vilkårene reguleres av norsk lov. Tvister søkes løst i minnelighet; ellers
            er Bergen tingrett verneting.
          </p>
        </Section>

        <div className="pt-4 flex flex-wrap gap-3">
          <Link href="/personvern" className="inline-flex items-center gap-2 h-[48px] px-6 rounded-full border border-[#ddd] text-[#0a0a0a] text-[14px] font-semibold hover:border-[#9333EA] transition-colors">Personvernerklæring</Link>
          <Link href="/" className="inline-flex items-center gap-2 h-[48px] px-6 rounded-full bg-[#0a0a0a] text-white text-[14px] font-semibold hover:bg-black transition-colors">Tilbake til forsiden</Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
