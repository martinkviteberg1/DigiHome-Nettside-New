import Link from 'next/link';
import BoligeiereV4 from '@/components/forside/v4/boligeiere/BoligeiereV4';
import ScrollToForm from '@/components/dh/ScrollToForm';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, serviceLd } from '@/lib/seo';

export const metadata = {
  title: 'Utleiemegler i Bergen — full utleieforvaltning',
  description: 'Vi tar alt ved utleie av boligen din: annonsering, visninger, leietakersjekk, kontrakt og husleie. 0 kr oppstart, ingen bindingstid. Tilbud innen 24 t.',
  alternates: { canonical: '/bli-utleier' },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: 'Utleiemegler i Bergen — full utleieforvaltning | DigiHome', description: 'Annonse, visning, leietakersjekk, kontrakt med BankID og husleie — selv med systemet, eller med en fast forvalter i Bergen. 0 kr oppstart, ingen bindingstid.', url: '/bli-utleier' },
};

/* ---------------------------------------------------------------------------
   /bli-utleier — landingssiden for annonser og SEO («utleiemegler i Bergen»).

   Samme V4-side som /boligeiere (adressen er handlingen), men med egen inngang,
   tillit rett etter heroen (logoer + eiernes stemmer) og SEO-spørsmål.
   Betalt trafikk med ?address= / ?start / #skjema hopper rett inn i
   onboardingen (ScrollToForm) — konverteringsflyten for annonser er uendret.
--------------------------------------------------------------------------- */

const LINK = 'underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]';

const SPORSMAL = [
  { q: 'Hva gjør en utleiemegler — og hva gjør DigiHome?', a: 'En utleiemegler finner leietaker og setter opp kontrakt. DigiHome gjør det — og fortsetter etterpå: husleie som følges opp, saker som lander hos riktig person, rapport og årsoppgave. Du velger selv om du vil drive boligen med systemet i ryggen, eller la en fast forvalter hos oss ta alt.' },
  { q: 'Hva koster det?', a: null },
  { q: 'Hvor raskt kan boligen leies ut?', a: 'Vurdering innen 24 timer etter at du har registrert adressen. Annonsen er klar på under en time, og med visninger og leietakersjekk får de fleste signert kontrakt innen to til fire uker — avhengig av bolig og sesong.' },
  { q: 'Hvilke områder dekker dere?', a: 'Selvforvaltning fungerer i hele Norge. Full forvaltning tilbyr vi i Bergen og omegn — Sentrum, Nordnes, Sandviken, Møhlenpris, Årstad, Fana, Åsane, Laksevåg og nabokommunene.' },
  { q: 'Hvordan sikrer dere riktig leietaker?', a: 'Kredittsjekk, referanser og BankID på alle søkere. Du får én anbefaling med begrunnelse — og det er alltid du som godkjenner hvem som flytter inn.' },
  { q: 'Er det bindingstid?', a: 'Nei. Ingen oppstartskostnad og ingen bindingstid. Boligen, kontrakten og historikken ligger i DigiHome og blir med deg videre.' },
];

const PRIS_SVAR = (
  <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
    Selvforvaltning koster <strong style={{ color: '#15130F', fontWeight: 500 }}>5 % av husleien</strong> — ingen oppstart, ingen bindingstid. Full forvaltning prises etter omfang som en andel av husleien; du får et konkret tilbud innen 24 timer etter en{' '}
    <Link href="/book-mote" className={LINK} style={{ color: '#15130F' }}>kort samtale</Link>. Se{' '}
    <Link href="/priser" className={LINK} style={{ color: '#15130F' }}>prisene</Link>.
  </p>
);

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: 'Bli utleier', path: '/bli-utleier' }])} />
      <JsonLd data={serviceLd({
        name: 'Utleieforvaltning for boligeiere',
        description: 'Full utleieforvaltning i Bergen: annonsering, visninger, leietakersjekk, kontrakt, husleie og vedlikehold — eller selvforvaltning med digitale verktøy (5 % av husleien).',
        path: '/bli-utleier',
        serviceType: 'Eiendomsforvaltning',
      })} />
      <ScrollToForm />
      <BoligeiereV4
        testid="bli-utleier-v4"
        label="Utleiemegler i Bergen"
        tittel="Lei ut boligen. Uten styret"
        ingressKort="Annonse, visning, leietakersjekk, kontrakt og husleie — selv med systemet, eller med en fast forvalter."
        ingressLang="Annonse, visning, leietakersjekk, kontrakt med BankID og husleie som følges opp. Lei ut selv med systemet i ryggen — eller la en fast forvalter i Bergen ta alt. Start med adressen."
        under="0 kr oppstart · ingen bindingstid · vurdering innen 24 timer"
        sporsmal={SPORSMAL}
        prisSvar={PRIS_SVAR}
        avslutning={{ tittel: 'Start med adressen', under: 'Vurdering innen 24 timer. Selv eller med oss — resten setter vi opp sammen.' }}
        tillit
      />
    </>
  );
}
