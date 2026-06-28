import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { site } from '@/lib/site';

export const metadata = {
  title: 'Personvern og vilkår',
  description:
    'Slik behandler DigiHome personopplysninger i tråd med GDPR og norsk personvernlovgivning — hvilke data vi samler inn, hvorfor, hvor lenge, og hvilke rettigheter du har. Inkluderer våre vilkår for bruk.',
  alternates: { canonical: '/personvern' },
};

const updated = '1. februar 2026';

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

export default function PersonvernPage() {
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />

      <section className="max-w-[820px] mx-auto px-6 sm:px-10 lg:px-16 pt-32 sm:pt-36 pb-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9333EA] mb-3">Juridisk</p>
        <h1 className="text-[34px] sm:text-[46px] font-bold tracking-[-0.03em] leading-[1.05] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
          Personvern og vilkår
        </h1>
        <p className="text-[15px] sm:text-[17px] text-[#555] leading-relaxed mt-5 max-w-[60ch]">
          Personvernet ditt er viktig for oss. Denne erklæringen forklarer hvilke
          personopplysninger {site.name} samler inn, hvordan vi bruker dem, og
          hvilke rettigheter du har etter personvernforordningen (GDPR).
        </p>
        <p className="text-[13px] text-[#888] mt-4">Sist oppdatert: {updated}</p>
      </section>

      <div className="max-w-[820px] mx-auto px-6 sm:px-10 lg:px-16 pb-24 space-y-12">
        <Section id="behandlingsansvarlig" n="1." title="Behandlingsansvarlig">
          <p>
            {site.name} (org.nr {site.orgNr}) er behandlingsansvarlig for
            personopplysningene som behandles via denne nettsiden. Har du spørsmål
            om personvern, kontakt oss på{' '}
            <a href={`mailto:${site.email}`} className="text-[#9333EA] underline underline-offset-2">{site.email}</a>{' '}
            eller {site.phone}.
          </p>
        </Section>

        <Section id="hvilke-data" n="2." title="Hvilke opplysninger vi samler inn">
          <p>Vi samler kun inn det vi trenger for å levere tjenesten vår:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Kontaktopplysninger</strong> du selv oppgir i skjemaer — navn, e-post, telefon og adresse på boligen.</li>
            <li><strong>Eiendomsinformasjon</strong> du oppgir for verdivurdering (boligtype, areal, antall soverom, ønsket utleiemodell m.m.).</li>
            <li><strong>Bruksdata</strong> via vår egen, informasjonskapselfrie statistikk (anonymisert sidevisning, kilde og enhetstype) for å forbedre nettsiden.</li>
            <li><strong>Markedsføringsdata</strong> (f.eks. Google-klikk-ID) — kun dersom du har samtykket til markedsføringskapsler.</li>
          </ul>
        </Section>

        <Section id="formal" n="3." title="Formål og behandlingsgrunnlag">
          <p>Vi behandler opplysningene dine for å:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>besvare henvendelser og gi deg en uforpliktende verdivurdering (behandlingsgrunnlag: ditt samtykke / tiltak før avtaleinngåelse),</li>
            <li>levere og administrere forvaltningstjenesten dersom du blir kunde (oppfyllelse av avtale),</li>
            <li>forbedre og sikre nettsiden (berettiget interesse),</li>
            <li>måle effekten av markedsføring (kun ved samtykke).</li>
          </ul>
        </Section>

        <Section id="cookies" n="4." title="Informasjonskapsler (cookies)">
          <p>
            Nettsiden bruker nødvendige informasjonskapsler for at den skal fungere.
            Analyse- og markedsføringskapsler settes <strong>kun</strong> dersom du
            samtykker. Vi bruker Google Consent Mode v2, slik at ingen
            sporings­kapsler aktiveres før du har tatt et valg. Du kan når som helst
            endre eller trekke tilbake samtykket ditt via samtykkebanneret.
          </p>
        </Section>

        <Section id="deling" n="5." title="Deling med tredjeparter">
          <p>
            Vi selger aldri personopplysningene dine. Vi deler dem kun med
            databehandlere som hjelper oss å drifte tjenesten (f.eks. skylagring,
            CRM, e-post og — ved samtykke — Google Analytics/Ads). Alle
            databehandlere er underlagt databehandleravtaler og behandler data på
            våre vegne i samsvar med GDPR.
          </p>
        </Section>

        <Section id="lagringstid" n="6." title="Lagringstid">
          <p>
            Vi lagrer personopplysninger så lenge det er nødvendig for formålet de
            ble samlet inn for. Henvendelser som ikke fører til et kundeforhold
            slettes senest 12 måneder etter siste kontakt. Kundedata oppbevares så
            lenge avtaleforholdet varer, og deretter så lenge lov (f.eks.
            bokføringsloven) krever det.
          </p>
        </Section>

        <Section id="rettigheter" n="7." title="Dine rettigheter">
          <p>Etter GDPR har du rett til å:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>få innsyn i hvilke opplysninger vi har om deg,</li>
            <li>kreve retting av uriktige opplysninger,</li>
            <li>kreve sletting («retten til å bli glemt»),</li>
            <li>be om begrensning av eller protestere mot behandlingen,</li>
            <li>be om dataportabilitet, og</li>
            <li>trekke tilbake samtykke når som helst.</li>
          </ul>
          <p>
            Send en e-post til{' '}
            <a href={`mailto:${site.email}`} className="text-[#9333EA] underline underline-offset-2">{site.email}</a>{' '}
            for å bruke rettighetene dine. Du kan også klage til Datatilsynet
            (datatilsynet.no).
          </p>
        </Section>

        <Section id="sikkerhet" n="8." title="Sikkerhet">
          <p>
            Vi bruker tekniske og organisatoriske tiltak for å beskytte
            opplysningene dine, blant annet kryptert overføring (HTTPS), tilgangs­styring
            og løpende sikkerhetsvurderinger.
          </p>
        </Section>

        <hr className="border-[#eee]" />

        <Section id="vilkar" n="9." title="Vilkår for bruk">
          <p>
            Ved å bruke nettsiden og tjenestene til {site.name} godtar du følgende
            vilkår. Informasjonen på nettsiden er av generell karakter og utgjør
            ikke bindende tilbud. Verdivurderinger og inntektsestimater er
            veiledende anslag basert på markedsdata, og er ikke en garanti for
            faktisk leieinntekt. En endelig avtale inngås alltid skriftlig mellom
            deg og {site.name}.
          </p>
          <p>
            Innhold på nettsiden (tekst, design, grafikk og logoer) tilhører
            {' '}{site.name} og kan ikke gjenbrukes uten skriftlig samtykke.
            Vi tar forbehold om feil og kan oppdatere innhold og vilkår uten
            forhåndsvarsel. Norsk lov gjelder, og eventuelle tvister løses ved
            Bergen tingrett.
          </p>
        </Section>

        <Section id="endringer" n="10." title="Endringer i erklæringen">
          <p>
            Vi kan oppdatere denne personvern­erklæringen ved behov. Vesentlige
            endringer varsles på nettsiden. Datoen øverst viser når erklæringen
            sist ble endret.
          </p>
        </Section>

        <div className="pt-4">
          <Link href="/" className="inline-flex items-center gap-2 h-[48px] px-6 rounded-full bg-[#0a0a0a] text-white text-[14px] font-semibold hover:bg-black transition-colors">
            Tilbake til forsiden
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
