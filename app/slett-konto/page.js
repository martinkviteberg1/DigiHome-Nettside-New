import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import DeletionForm from '@/components/site/DeletionForm';
import { site } from '@/lib/site';

export const metadata = {
  title: 'Slett kontoen din',
  description: 'Slik ber du om sletting av DigiHome-kontoen din og tilhørende persondata — i appen, via skjema eller e-post. Sletting fullføres innen 30 dager.',
  alternates: { canonical: '/slett-konto' },
};

const updated = '2. juli 2026';

export default function SlettKontoPage() {
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />

      <section className="max-w-[820px] mx-auto px-6 sm:px-10 lg:px-16 pt-32 sm:pt-36 pb-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9333EA] mb-3">Konto og persondata</p>
        <h1 className="text-[34px] sm:text-[46px] font-bold tracking-[-0.03em] leading-[1.05] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
          Slett kontoen din
        </h1>
        <p className="text-[15px] sm:text-[17px] text-[#555] leading-relaxed mt-5 max-w-[62ch]">
          Du kan når som helst be om at DigiHome-kontoen din og tilhørende
          personopplysninger slettes. Velg måten som passer deg best under —
          behandlingen er den samme.
        </p>
        <p className="text-[13px] text-[#888] mt-4">Sist oppdatert: {updated}</p>
      </section>

      <div className="max-w-[820px] mx-auto px-6 sm:px-10 lg:px-16 pb-24 space-y-12">
        <section>
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-[-0.02em] text-[#0a0a0a] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Tre måter å be om sletting</h2>
          <ol className="space-y-4">
            <li className="rounded-2xl border border-[#eee] bg-white p-5">
              <p className="font-semibold text-[15px] text-[#0a0a0a]">1. I mobil-appen</p>
              <p className="text-[14.5px] text-[#555] mt-1">Gå til <strong>Profil → Innstillinger → Slett konto</strong>. Forespørselen registreres direkte på kontoen din.</p>
            </li>
            <li className="rounded-2xl border border-[#eee] bg-white p-5">
              <p className="font-semibold text-[15px] text-[#0a0a0a]">2. Via skjemaet på denne siden</p>
              <p className="text-[14.5px] text-[#555] mt-1">Fyll ut skjemaet under med e-postadressen kontoen er registrert på.</p>
            </li>
            <li className="rounded-2xl border border-[#eee] bg-white p-5">
              <p className="font-semibold text-[15px] text-[#0a0a0a]">3. Via e-post</p>
              <p className="text-[14.5px] text-[#555] mt-1">Send e-post til{' '}<a href="mailto:personvern@digihome.no?subject=Slett%20konto" className="text-[#9333EA] underline underline-offset-2">personvern@digihome.no</a>{' '}med emnet «Slett konto», fra e-postadressen kontoen er registrert på.</p>
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-[-0.02em] text-[#0a0a0a] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Send forespørsel nå</h2>
          <DeletionForm />
        </section>

        <section className="space-y-3 text-[15px] sm:text-[16px] leading-relaxed text-[#444]">
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-[-0.02em] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Hva slettes — og hva må vi beholde</h2>
          <p><strong>Dette slettes:</strong></p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>brukerkontoen og profilopplysninger (navn, e-post, telefon),</li>
            <li>bilder du har lastet opp (saker og overtakelsesprotokoller), der lov ikke krever oppbevaring,</li>
            <li>push-varsel-token og enhets-ID,</li>
            <li>innstillinger og annen kontotilknyttet informasjon.</li>
          </ul>
          <p><strong>Dette må vi beholde en periode (lovpålagt):</strong></p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>regnskapsbilag og betalingshistorikk — inntil 5 år (bokføringsloven),</li>
            <li>signerte leie- og forvaltningsavtaler — så lenge avtaleforholdet og etterfølgende lovkrav tilsier det.</li>
          </ul>
          <p>
            Slike opplysninger skjermes og brukes ikke til andre formål enn å oppfylle lovkravene.
          </p>
        </section>

        <section className="space-y-3 text-[15px] sm:text-[16px] leading-relaxed text-[#444]">
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-[-0.02em] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Behandlingstid</h2>
          <p>
            Du får en bekreftelse innen <strong>72 timer</strong>, og slettingen
            fullføres senest <strong>30 dager</strong> etter at identiteten din er
            bekreftet. Har du et <strong>aktivt leie- eller forvaltningsforhold</strong>,
            tar vi kontakt for å avklare hvordan avtaleforpliktelsene håndteres før
            kontoen kan slettes.
          </p>
          <p>
            Se også{' '}<Link href="/personvern" className="text-[#9333EA] underline underline-offset-2">personvernerklæringen</Link>{' '}for full oversikt over behandlingen av personopplysninger, og dine rettigheter etter GDPR.
          </p>
        </section>

        <div className="pt-2">
          <Link href="/" className="inline-flex items-center gap-2 h-[48px] px-6 rounded-full bg-[#0a0a0a] text-white text-[14px] font-semibold hover:bg-black transition-colors">Tilbake til forsiden</Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
