import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { site } from '@/lib/site';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';

export const metadata = {
  title: 'Personvernerklæring',
  description:
    'Slik behandler DigiHome personopplysninger — i tråd med GDPR. Hva vi samler inn, databehandlere, lagringstid og dine rettigheter.',
  alternates: { canonical: '/personvern' },
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

export default function PersonvernPage() {
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <JsonLd data={breadcrumbLd([{ name: 'Personvern', path: '/personvern' }])} />
      <JsonLd data={webPageLd({ name: 'Personvernerklæring', description: 'Slik behandler DigiHome personopplysninger — i tråd med GDPR.', path: '/personvern' })} />
      <Header />

      <section className="max-w-[820px] mx-auto px-6 sm:px-10 lg:px-16 pt-32 sm:pt-36 pb-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9333EA] mb-3">Juridisk</p>
        <h1 className="text-[34px] sm:text-[46px] font-bold tracking-[-0.03em] leading-[1.05] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
          Personvernerklæring
        </h1>
        <p className="text-[15px] sm:text-[17px] text-[#555] leading-relaxed mt-5 max-w-[60ch]">
          Personvernet ditt er viktig for oss. Denne erklæringen forklarer hvilke
          personopplysninger {site.name} samler inn — via nettsiden, web-plattformen
          og mobil-appen — hvordan vi bruker dem, og hvilke rettigheter du har etter
          personvernforordningen (GDPR).
        </p>
        <p className="text-[13px] text-[#888] mt-4">Sist oppdatert: {updated}</p>
      </section>

      <div className="max-w-[820px] mx-auto px-6 sm:px-10 lg:px-16 pb-24 space-y-12">
        <Section id="behandlingsansvarlig" n="1." title="Behandlingsansvarlig">
          <p>
            {site.legalName} (org.nr {site.orgNr}), {site.address.street},{' '}
            {site.address.postal} {site.address.city}, er behandlingsansvarlig for
            personopplysningene som behandles via nettsiden, web-plattformen og
            mobil-appen. Har du spørsmål om personvern, kontakt oss på{' '}
            <a href="mailto:personvern@digihome.no" className="text-[#9333EA] underline underline-offset-2">personvern@digihome.no</a>{' '}
            eller {site.phone}.
          </p>
        </Section>

        <Section id="hvilke-data" n="2." title="Hvilke opplysninger vi samler inn">
          <p><strong>På nettsiden (digihome.no):</strong></p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Kontaktopplysninger</strong> du selv oppgir i skjemaer — navn, e-post, telefon og adresse på boligen.</li>
            <li><strong>Eiendomsinformasjon</strong> du oppgir for verdivurdering (boligtype, areal, antall soverom, ønsket utleiemodell m.m.).</li>
            <li><strong>Bruksdata</strong> via vår egen, informasjonskapselfrie statistikk (anonymisert sidevisning, kilde og enhetstype) for å forbedre nettsiden.</li>
            <li><strong>Markedsføringsdata</strong> (f.eks. Google-klikk-ID) — kun dersom du har samtykket til markedsføringskapsler.</li>
          </ul>
          <p><strong>I plattformen og mobil-appen (for utleiere, leietakere og forvaltere):</strong></p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Kontoopplysninger</strong> — navn, e-post, telefon og rolle (utleier, leietaker eller forvalter).</li>
            <li><strong>Leieforholds- og eiendomsdata</strong> — adresser, kontrakter, henvendelser/saker og betalingshistorikk knyttet til leieforholdet.</li>
            <li><strong>Bilder du laster opp</strong> — f.eks. i saker (feil/mangler) og overtakelsesprotokoller.</li>
            <li><strong>Push-varsler</strong> — enhets-token for å kunne sende deg varsler (kan skrus av i enhetens innstillinger).</li>
            <li><strong>Betalingsinformasjon</strong> — betalinger på web behandles av Stripe; vi lagrer ikke fullstendige kortopplysninger selv.</li>
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

        <Section id="deling" n="5." title="Databehandlere og deling med tredjeparter">
          <p>
            Vi selger aldri personopplysningene dine. Vi deler dem kun med
            databehandlere som hjelper oss å levere tjenesten, underlagt
            databehandleravtaler i samsvar med GDPR:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>SendGrid (Twilio)</strong> — utsending av transaksjons- og varslings-e-post.</li>
            <li><strong>PowerOffice Go</strong> — regnskap og fakturering.</li>
            <li><strong>Posten Signering</strong> — elektronisk signering av avtaler.</li>
            <li><strong>Microsoft 365</strong> — e-post og dokumenthåndtering internt.</li>
            <li><strong>Expo, Apple og Google</strong> — levering av push-varsler til mobil-appen.</li>
            <li><strong>Stripe</strong> — behandling av betalinger på web-plattformen.</li>
            <li><strong>Google Analytics/Ads og Meta</strong> — kun ved samtykke til markedsføringskapsler på nettsiden.</li>
          </ul>
          <p>
            Enkelte leverandører kan behandle data utenfor EØS. I slike tilfeller
            sikres overføringen med EU-kommisjonens standardkontrakter (SCC) eller
            tilsvarende garantier.
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
            <a href="mailto:personvern@digihome.no" className="text-[#9333EA] underline underline-offset-2">personvern@digihome.no</a>{' '}
            for å bruke rettighetene dine. Vil du slette kontoen din i plattformen
            eller appen, kan du gjøre det direkte via{' '}
            <Link href="/slett-konto" className="text-[#9333EA] underline underline-offset-2">digihome.no/slett-konto</Link>.
            Du kan også klage til Datatilsynet (datatilsynet.no).
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
            Vilkårene for bruk av nettsiden, plattformen og mobil-appen er skilt ut
            på en egen side:{' '}
            <Link href="/vilkar" className="text-[#9333EA] underline underline-offset-2">digihome.no/vilkar</Link>.
            Der finner du blant annet regler for brukerkontoer og roller, akseptabel
            bruk, betaling, ansvar og lovvalg.
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
