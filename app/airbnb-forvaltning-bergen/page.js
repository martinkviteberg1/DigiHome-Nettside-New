import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import FaqSection from '@/components/site/FaqSection';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, serviceLd } from '@/lib/seo';
import { site } from '@/lib/site';
import { Camera, LineChart, MessageSquare, Sparkles, KeyRound, Receipt, ArrowUpRight, CalendarRange, ShieldCheck, MapPin } from 'lucide-react';

// Kommersiell SEO-side for «airbnb forvaltning bergen» / «airbnb utleie bergen».
// Konkurrentene (Cityhost, Roomsly, Smidle) vinner med eksakt-match-sider —
// denne matcher intensjonen og løfter samtidig 10+2-modellen som differensiator.

export const metadata = {
  title: 'Airbnb-forvaltning i Bergen — full service',
  description: 'Profesjonell Airbnb-forvaltning i Bergen: annonser på Airbnb og Booking.com, dynamisk prising, gjestehåndtering, renhold og rapportering. Uten bindingstid.',
  alternates: { canonical: '/airbnb-forvaltning-bergen' },
  openGraph: {
    title: 'Airbnb-forvaltning i Bergen — full service | DigiHome',
    description: 'Vi tar hele Airbnb-driften: annonser, dynamisk prising, gjester, renhold og oppgjør — kombinert med langtidsutleie for maksimal årsinntekt.',
    url: `${site.url}/airbnb-forvaltning-bergen`, type: 'website', locale: 'nb_NO',
    images: [{ url: site.url + site.ogImage }],
  },
};

const INCLUDED = [
  { icon: Camera, t: 'Annonse, foto & styling', b: 'Profesjonell fotografering og optimaliserte annonser på Airbnb og Booking.com som skiller seg ut.' },
  { icon: LineChart, t: 'Dynamisk prising', b: 'Prisen justeres automatisk etter sesong, arrangementer og etterspørsel i Bergen — natt for natt.' },
  { icon: MessageSquare, t: 'Gjestekommunikasjon', b: 'Vi svarer gjestene raskt, håndterer innsjekk og løser alt underveis — hele døgnet.' },
  { icon: Sparkles, t: 'Renhold & klargjøring', b: 'Hotellstandard renhold, sengetøy og forbruksvarer mellom hvert opphold.' },
  { icon: KeyRound, t: 'Nøkkelfri adgang', b: 'Smarte låser og selvbetjent innsjekk — ingen nøkkeloverlevering, full kontroll.' },
  { icon: Receipt, t: 'Oppgjør & rapportering', b: 'Månedlige utbetalinger og full oversikt over inntekter og belegg i huseierportalen.' },
];

const FAQS = [
  { q: 'Hva koster Airbnb-forvaltning i Bergen?', a: 'Full Airbnb-forvaltning hos DigiHome prises individuelt ut fra boligen, beliggenheten og sesongpotensialet — du får et konkret, uforpliktende tilbud fra en lokal rådgiver, som regel samme dag. Det er ingen oppstartskostnader og ingen bindingstid. Vil du gjøre deler av jobben selv, koster selvforvaltning 5 % per utleieforhold.' },
  { q: 'Hvor mye kan jeg tjene på Airbnb-utleie i Bergen?', a: 'Bergen har sterk turistsesong fra mai til september og høy etterspørsel rundt konferanser og arrangementer. Med vår hybride 10+2-modell — langtidsutleie i 10 måneder og korttidsutleie i 2 høysesongmåneder — oppnår utleiere opptil 30 % høyere årsinntekt enn ren langtidsutleie. Snittinntekten per bolig hos DigiHome er rundt 25 000 kr/mnd.' },
  { q: 'Er Airbnb-utleie lovlig i Bergen?', a: 'Ja, men reglene avhenger av boligtypen. Kortidsutleie av egen bolig (der du selv bor) er som hovedregel tillatt. For sekundærboliger i eierseksjonssameier gjelder en grense på 90 døgn korttidsutleie per år, og borettslag har egne, strengere regler. DigiHome holder styr på regelverket for deg — 10+2-modellen er nettopp bygget for å maksimere inntekten innenfor rammene.' },
  { q: 'Hvem tar seg av gjestene?', a: 'Vi gjør det. All kommunikasjon fra booking til utsjekk, døgnet rundt — inkludert innsjekk, spørsmål underveis og eventuelle problemer. Du trenger aldri svare på en gjestemelding.' },
  { q: 'Er det bindingstid?', a: 'Nei. Airbnb-forvaltning hos DigiHome er uten bindingstid — du kan avslutte eller bytte til ren langtidsutleie når du vil.' },
];

export default function Page() {
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative min-h-[56vh] flex items-end overflow-hidden">
        <img src="/bryggen-alley.webp" alt="Airbnb-leilighet ved Bryggen i Bergen" className="absolute inset-0 w-full h-full object-cover" width={1600} height={900} fetchPriority="high" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,8,12,0.45) 0%, rgba(8,8,12,0.3) 40%, rgba(8,8,12,0.9) 100%)' }} />
        <div className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-14 pt-32">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#d298ff] mb-4"><CalendarRange className="w-3.5 h-3.5" /> Korttidsutleie</div>
          <h1 className="text-white font-bold tracking-[-0.025em] leading-[1.04] text-[38px] sm:text-[56px] lg:text-[66px] max-w-[18ch]" style={{ fontFamily: 'var(--font-heading)' }}>Airbnb-forvaltning i Bergen</h1>
          <p className="text-white/80 text-[16px] sm:text-[19px] mt-5 max-w-[58ch] leading-relaxed">Vi tar hele driften — annonser, dynamisk prising, gjester, renhold og oppgjør. Du ser bare inntekten tikke inn.</p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/bli-utleier" className="group inline-flex items-center gap-2 h-[52px] pl-6 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold active:scale-[0.98] transition-transform">Få tilbud samme dag<span className="inline-flex items-center justify-center w-[36px] h-[36px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span></Link>
            <Link href="/tjenester" className="inline-flex items-center h-[52px] px-6 rounded-full border border-white/25 text-white text-[15px] font-semibold hover:bg-white/10 transition-colors">Se alle tjenester</Link>
          </div>
        </div>
      </section>

      {/* Alt inkludert */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
        <h2 className="text-[26px] sm:text-[36px] font-bold tracking-[-0.02em] mb-3 max-w-[24ch]" style={{ fontFamily: 'var(--font-heading)' }}>Alt du trenger for lønnsom korttidsutleie</h2>
        <p className="text-[#666] text-[15.5px] max-w-[58ch] mb-12">Fra første annonse til siste utbetaling — profesjonell drift i hotellklasse.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {INCLUDED.map((p) => (
            <div key={p.t} className="bg-white rounded-2xl p-7 shadow-[0_8px_36px_-18px_rgba(0,0,0,0.12)]">
              <div className="w-11 h-11 rounded-2xl bg-[#f4f0fb] flex items-center justify-center mb-4"><p.icon className="w-5 h-5 text-[#7c3aed]" /></div>
              <h3 className="text-[17px] font-bold mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>{p.t}</h3>
              <p className="text-[14px] text-[#666] leading-relaxed">{p.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 10+2 — differensiatoren */}
      <section className="bg-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#d298ff] mb-4"><ShieldCheck className="w-3.5 h-3.5" /> Smartere enn ren Airbnb</div>
            <h2 className="text-[28px] sm:text-[40px] font-bold tracking-[-0.02em] leading-[1.1] max-w-[20ch]" style={{ fontFamily: 'var(--font-heading)' }}>10+2-modellen: Airbnb når det lønner seg — trygg langtidsleie resten av året</h2>
            <p className="text-white/70 text-[15.5px] leading-relaxed mt-5 max-w-[56ch]">Ren korttidsutleie gir tomme netter i lavsesong, mer slitasje — og for sekundærboliger i sameier en 90-døgnsgrense per år. Derfor kombinerer vi: <strong className="text-white">10 måneder forutsigbar langtidsleie + 2 måneder korttid i høysesongen</strong>, der Bergen-prisene er på sitt høyeste. Resultatet er opptil 30 % høyere årsinntekt — helt innenfor regelverket.</p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/tjenester" className="inline-flex items-center gap-2 h-[48px] px-6 rounded-full bg-white/10 text-white text-[14.5px] font-semibold hover:bg-white/15 transition-colors">Slik fungerer 10+2 <ArrowUpRight className="w-4 h-4" /></Link>
              <Link href="/leiemarkedet/bergen" className="inline-flex items-center gap-2 h-[48px] px-6 rounded-full bg-white/10 text-white text-[14.5px] font-semibold hover:bg-white/15 transition-colors">Leiemarkedet i Bergen <ArrowUpRight className="w-4 h-4" /></Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {[{ v: '+30 %', l: 'høyere årsinntekt', s: 'med 10+2 vs. ren langtidsleie' }, { v: '25 000 kr', l: 'snittinntekt per måned', s: 'per bolig i Bergen' }, { v: '90 døgn', l: 'korttidsgrensen', s: 'for sekundærbolig i sameier — vi holder styr' }, { v: '0 kr', l: 'oppstartskostnad', s: 'ingen bindingstid' }].map((x) => (
              <div key={x.l} className="bg-white/[0.06] rounded-2xl p-6">
                <p className="text-[30px] sm:text-[36px] font-bold leading-none text-[#d298ff]" style={{ fontFamily: 'var(--font-heading)' }}>{x.v}</p>
                <p className="text-[14.5px] font-semibold mt-2">{x.l}</p>
                <p className="text-[12.5px] text-white/50 mt-1">{x.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Områder */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-20">
        <h2 className="text-[26px] sm:text-[36px] font-bold tracking-[-0.02em] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Best betalte korttidsområder i Bergen</h2>
        <p className="text-[#666] text-[15.5px] max-w-[58ch] mb-8">Sentrale bydeler med gangavstand til Bryggen, Fisketorget og Fløibanen gir høyest nattpris og belegg.</p>
        <div className="flex flex-wrap gap-2.5">
          {[['Sentrum', 'sentrum'], ['Nordnes', 'nordnes'], ['Sandviken', 'sandviken'], ['Møhlenpris', 'mohlenpris'], ['Årstad', 'arstad'], ['Laksevåg', 'laksevag']].map(([name, slug]) => (
            <Link key={slug} href={`/utleie/${slug}`} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white shadow-[0_4px_18px_-10px_rgba(0,0,0,0.15)] text-[14px] font-semibold text-[#1f1f1f] hover:text-[#7c3aed] transition-colors"><MapPin className="w-3.5 h-3.5 text-[#7c3aed]" /> {name}</Link>
          ))}
          <Link href="/utleie" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#0a0a0a] text-white text-[14px] font-semibold hover:bg-[#2a2a2a] transition-colors">Alle områder <ArrowUpRight className="w-3.5 h-3.5" /></Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#1a1430] to-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24 text-center">
          <h2 className="text-[28px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4 max-w-[24ch] mx-auto" style={{ fontFamily: 'var(--font-heading)' }}>Klar for gjester — uten å løfte en finger?</h2>
          <p className="text-white/70 text-[16px] max-w-[52ch] mx-auto mb-8">Registrer boligen på under to minutter og få et uforpliktende tilbud på Airbnb-forvaltning — som regel samme dag.</p>
          <Link href="/bli-utleier" className="group inline-flex items-center gap-2 h-[54px] pl-7 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold active:scale-[0.98] transition-transform">Kom i gang<span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span></Link>
        </div>
      </section>

      <FaqSection
        title="Ofte stilte spørsmål om Airbnb-forvaltning"
        intro="Pris, regler og inntektspotensial — kort forklart."
        faqs={FAQS}
      />
      <JsonLd data={breadcrumbLd([{ name: 'Airbnb-forvaltning i Bergen', path: '/airbnb-forvaltning-bergen' }])} />
      <JsonLd data={serviceLd({
        name: 'Airbnb-forvaltning i Bergen',
        description: 'Full forvaltning av korttidsutleie i Bergen: annonser på Airbnb og Booking.com, dynamisk prising, gjestekommunikasjon, renhold, nøkkelfri adgang og månedlige oppgjør.',
        path: '/airbnb-forvaltning-bergen',
        serviceType: 'Korttidsutleie-forvaltning',
      })} />
      <Footer />
    </div>
  );
}
