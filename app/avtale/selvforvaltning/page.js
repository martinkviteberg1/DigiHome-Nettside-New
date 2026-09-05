import Link from 'next/link';
import { avtaleSelvforvaltning as A } from '@/lib/avtale-selvforvaltning';

/* Avtalen som egen side — samme innhold som arket i skjemaet. For lesing, utskrift og lenking. */
export const metadata = {
  title: `${A.tittel} | DigiHome`,
  description: 'Avtalen som gjelder for selvforvaltning hos DigiHome: 5 % av husleien, ingen bindingstid.',
  robots: { index: false, follow: false },
};

const INK = '#15130F';
const display = { fontFamily: 'var(--font-heading), sans-serif', fontWeight: 400, letterSpacing: '-0.035em', lineHeight: 1.0 };

export default function AvtaleSelvforvaltningPage() {
  return (
    <div className="min-h-screen antialiased" style={{ background: '#F3F1EC', color: INK }}>
      <header className="mx-auto flex h-16 w-full max-w-[880px] items-center justify-between px-6">
        <Link href="/" aria-label="DigiHome — til forsiden" className="inline-flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[18px] w-auto" />
        </Link>
        <Link href="/bli-utleier/start" className="text-[13.5px] text-[#15130F]/70 hover:text-[#15130F]">Tilbake til registreringen</Link>
      </header>
      <main className="mx-auto w-full max-w-[880px] px-6 pb-24 pt-10 sm:pt-14">
        <p className="text-[14px] font-medium text-[#15130F]/55">{A.versjonTekst}</p>
        <h1 className="mt-3 text-[40px] sm:text-[56px]" style={{ ...display, color: INK }}>{A.tittel}</h1>
        <p className="mt-4 text-[16px] text-[#15130F]/65">{A.undertittel}</p>

        <section aria-label="Kort fortalt" className="mt-10 rounded-[18px] p-6 sm:p-7" style={{ background: '#FBFAF8', boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.08)' }}>
          <p className="text-[13.5px] font-medium text-[#15130F]/60">Kort fortalt</p>
          <dl className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {A.kortFortalt.map((k) => (
              <div key={k.t}>
                <dt className="text-[15px] font-medium">{k.t}</dt>
                <dd className="mt-0.5 text-[14.5px] leading-[1.5] text-[#15130F]/65">{k.d}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[12.5px] text-[#15130F]/45">Oppsummeringen er til hjelp. Det er avtaleteksten under som gjelder.</p>
        </section>

        <ol className="mt-6 flex flex-col">
          {A.seksjoner.map((s, i) => (
            <li key={s.n} className={`py-7 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'rgba(21,19,15,0.08)' }}>
              <h2 className="flex items-baseline gap-3 text-[20px] sm:text-[22px]" style={{ ...display, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                <span className="w-7 shrink-0 text-[13px] tabular-nums" style={{ fontFamily: 'inherit', fontWeight: 400, color: 'rgba(21,19,15,0.4)' }}>{s.n}</span>
                {s.t}
              </h2>
              <div className="mt-3 flex flex-col gap-3 pl-10 text-[16px] leading-[1.65] text-[#15130F]/75">
                {s.p.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
                {s.liste ? (
                  <ul className="flex flex-col gap-1.5">
                    {s.liste.map((l) => <li key={l} className="flex gap-3"><span aria-hidden="true" className="mt-[11px] h-1 w-1 shrink-0 rounded-full" style={{ background: 'rgba(21,19,15,0.45)' }} />{l}</li>)}
                  </ul>
                ) : null}
                {s.etter ? s.etter.map((p) => <p key={p.slice(0, 40)}>{p}</p>) : null}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] text-[#15130F]/45">Avtale-ID {A.id}. Spørsmål: <a href="mailto:support@digihome.no" className="underline decoration-[#15130F]/25 underline-offset-4">support@digihome.no</a> · <Link href="/personvern" className="underline decoration-[#15130F]/25 underline-offset-4">Personvernerklæring</Link></p>
      </main>
    </div>
  );
}
