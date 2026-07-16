import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import FaqSection from '@/components/site/FaqSection';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, serviceLd } from '@/lib/seo';
import { site, statStrip } from '@/lib/site';
import { locations } from '@/lib/locations';
import { Megaphone, LineChart, Users, FileSignature, Banknote, Wrench, ArrowUpRight, Check, X, KeyRound, MapPin } from 'lucide-react';

// Kommersiell SEO-side for søket «utleiemegler bergen» — bygget for å matche
// søkeintensjonen eksakt (konkurrentene som rangerer har dedikerte sider).
// AEO: direkte, siterbare svar («Hva koster en utleiemegler?») + FAQPage-schema.

export const metadata = {
  title: 'Utleiemegler i Bergen — moderne alternativ',
  description: 'Vurderer du utleiemegler i Bergen? DigiHome gjør hele jobben — annonsering, visninger, kontrakter og husleie — med AI-prising og uten bindingstid.',
  alternates: { canonical: '/utleiemegler-bergen' },
  openGraph: {
    title: 'Utleiemegler i Bergen — moderne alternativ | DigiHome',
    description: 'Alt en utleiemegler gjør — annonsering, visninger, kontrakter og husleie — med AI-prising, uten oppstartskostnader og uten bindingstid.',
    url: `${site.url}/utleiemegler-bergen`, type: 'website', locale: 'nb_NO',
    images: [{ url: site.url + site.ogImage }],
  },
};

const TASKS = [
  { icon: Megaphone, t: 'Annonsering & styling', b: 'Profesjonelle bilder og annonser på Finn.no — og på Airbnb/Booking.com når korttid lønner seg.' },
  { icon: LineChart, t: 'Riktig leiepris', b: 'AI-prising overvåker leiemarkedet i Bergen døgnet rundt, slik at boligen aldri ligger feil i pris.' },
  { icon: Users, t: 'Visninger & screening', b: 'Vi håndterer visninger, kredittsjekk og referansesjekk — og velger trygge leietakere.' },
  { icon: FileSignature, t: 'Digitale kontrakter', b: 'Husleiekontrakt med BankID-signering og korrekt depositumshåndtering.' },
  { icon: Banknote, t: 'Husleie & oppgjør', b: 'Automatisk innkreving, purring og månedlige eieroppgjør rett til konto.' },
  { icon: Wrench, t: 'Drift & vedlikehold', b: 'Renhold, vaktmester og håndverkere via vårt lokale partnernettverk i Bergen.' },
];

const COMPARE = [
  { row: 'Oppstartskostnad', trad: 'Etableringshonorar — ofte tilsvarende en halv til én månedsleie', dh: 'Ingen. Null oppstartskostnader', good: true },
  { row: 'Løpende honorar', trad: 'Typisk 8–12 % av leien, uansett innsats', dh: 'Selvforvaltning 5 % per utleieforhold — eller full forvaltning etter uforpliktende tilbud', good: true },
  { row: 'Bindingstid', trad: 'Ofte 6–12 måneder', dh: 'Ingen bindingstid — avslutt når du vil', good: true },
  { row: 'Prissetting', trad: 'Manuell vurdering ved innflytting', dh: 'AI-prising som følger markedet kontinuerlig', good: true },
  { row: 'Korttid + langtid', trad: 'Som regel kun langtidsutleie', dh: '10+2-modellen: langtid + korttid i høysesong — opptil 30 % høyere inntekt', good: true },
  { row: 'Innsyn', trad: 'Rapport på e-post, gjerne månedlig', dh: 'Egen huseierportal med økonomi, dokumenter og meldinger i sanntid', good: true },
];

const FAQS = [
  { q: 'Hva koster en utleiemegler i Bergen?', a: 'Tradisjonelle utleiemeglere tar vanligvis et etableringshonorar (ofte tilsvarende en halv til én månedsleie) pluss et løpende forvaltningshonorar på rundt 8–12 % av leien. Hos DigiHome koster selvforvaltning 5 % per utleieforhold uten faste kostnader, mens full forvaltning prises individuelt — du får et uforpliktende tilbud samme dag. Ingen oppstartskostnader, ingen bindingstid.' },
  { q: 'Hva gjør en utleiemegler?', a: 'En utleiemegler håndterer utleien for deg: annonsering og visninger, screening og valg av leietaker, husleiekontrakt, depositum, innkreving av husleie og oppfølging gjennom leieforholdet. DigiHome gjør alt dette — i tillegg til AI-basert prissetting og mulighet for korttidsutleie i høysesong.' },
  { q: 'Utleiemegler eller leie ut selv — hva lønner seg?', a: 'Det avhenger av tiden din og boligen. Leier du ut selv sparer du honoraret, men bærer risikoen for feil leiepris, dårlig screening og alt det praktiske. Med DigiHome kan du velge begge deler: selvforvaltning (5 %) der du gjør jobben med våre digitale verktøy, eller full forvaltning der vi tar alt.' },
  { q: 'Er det bindingstid hos DigiHome?', a: 'Nei. Både selvforvaltning og full forvaltning er uten bindingstid — du kan avslutte når du vil.' },
  { q: 'Hvor raskt finner dere leietaker i Bergen?', a: 'Bergen har høy etterspørsel etter leieboliger, spesielt rundt studiestart og i sentrale bydeler. Med riktig pris og profesjonell annonse finner vi som regel kvalifiserte leietakere i løpet av dager til få uker, avhengig av sesong og beliggenhet.' },
];

export default function Page() {
  const bydeler = locations.filter((l) => l.type === 'bydel');
  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative min-h-[56vh] flex items-end overflow-hidden">
        <img src="/bergen-rooftops.webp" alt="Utleieboliger i Bergen sett fra taket" className="absolute inset-0 w-full h-full object-cover" width={1600} height={900} fetchPriority="high" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,8,12,0.45) 0%, rgba(8,8,12,0.3) 40%, rgba(8,8,12,0.9) 100%)' }} />
        <div className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-14 pt-32">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#d298ff] mb-4"><KeyRound className="w-3.5 h-3.5" /> Utleiemegler i Bergen</div>
          <h1 className="text-white font-bold tracking-[-0.025em] leading-[1.04] text-[38px] sm:text-[56px] lg:text-[66px] max-w-[20ch]" style={{ fontFamily: 'var(--font-heading)' }}>Utleiemegler i Bergen — bare smartere</h1>
          <p className="text-white/80 text-[16px] sm:text-[19px] mt-5 max-w-[58ch] leading-relaxed">Alt en tradisjonell utleiemegler gjør — annonsering, visninger, kontrakter og husleie — med AI-prising, uten oppstartskostnader og uten bindingstid.</p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/bli-utleier" className="group inline-flex items-center gap-2 h-[52px] pl-6 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold active:scale-[0.98] transition-transform">Få tilbud samme dag<span className="inline-flex items-center justify-center w-[36px] h-[36px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span></Link>
            <Link href="/priskalkulator" className="inline-flex items-center h-[52px] px-6 rounded-full border border-white/25 text-white text-[15px] font-semibold hover:bg-white/10 transition-colors">Se priskalkulator</Link>
          </div>
        </div>
      </section>

      {/* AEO-vennlig direkte svar */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-20">
        <h2 className="text-[26px] sm:text-[36px] font-bold tracking-[-0.02em] mb-4 max-w-[24ch]" style={{ fontFamily: 'var(--font-heading)' }}>Hva gjør en utleiemegler — og hva bør det koste?</h2>
        <p className="text-[#4a4a4a] text-[16px] leading-[1.8] max-w-[72ch]">
          En utleiemegler tar hele jobben med å leie ut boligen din: annonsering, visninger, screening av leietakere, kontrakt, depositum og husleie.
          I Bergen tar tradisjonelle utleiemeglere vanligvis et etableringshonorar pluss <strong>8–12 % av leien</strong> løpende.
          DigiHome leverer det samme — og mer — for <strong>5 % per utleieforhold</strong> med selvforvaltning, eller full forvaltning etter et uforpliktende tilbud. Alltid uten oppstartskostnader og uten bindingstid.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {TASKS.map((p) => (
            <div key={p.t} className="bg-white rounded-2xl p-7 shadow-[0_8px_36px_-18px_rgba(0,0,0,0.12)]">
              <div className="w-11 h-11 rounded-2xl bg-[#f4f0fb] flex items-center justify-center mb-4"><p.icon className="w-5 h-5 text-[#7c3aed]" /></div>
              <h3 className="text-[17px] font-bold mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>{p.t}</h3>
              <p className="text-[14px] text-[#666] leading-relaxed">{p.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sammenligning */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-16 lg:pb-24">
        <h2 className="text-[26px] sm:text-[36px] font-bold tracking-[-0.02em] mb-3 max-w-[24ch]" style={{ fontFamily: 'var(--font-heading)' }}>Tradisjonell utleiemegler vs. DigiHome</h2>
        <p className="text-[#666] text-[15.5px] max-w-[58ch] mb-10">Samme trygghet og service — men bygget på teknologi i stedet for timepris.</p>
        <div className="bg-white rounded-3xl shadow-[0_8px_36px_-18px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1.1fr_1.4fr_1.6fr] gap-4 px-7 py-4 border-b border-black/[0.06] text-[12px] font-semibold uppercase tracking-[0.1em] text-[#716b63]">
            <span />
            <span>Tradisjonell utleiemegler</span>
            <span className="text-[#7c3aed]">DigiHome</span>
          </div>
          {COMPARE.map((r) => (
            <div key={r.row} className="grid sm:grid-cols-[1.1fr_1.4fr_1.6fr] gap-2 sm:gap-4 px-7 py-5 border-b border-black/[0.04] last:border-0">
              <span className="text-[14.5px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{r.row}</span>
              <span className="flex items-start gap-2 text-[14px] text-[#777]"><X className="w-4 h-4 text-[#ccc] mt-0.5 shrink-0" />{r.trad}</span>
              <span className="flex items-start gap-2 text-[14px] text-[#1f1f1f] font-medium"><Check className="w-4 h-4 text-[#7c3aed] mt-0.5 shrink-0" />{r.dh}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Statlinje */}
      <section className="bg-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-14 lg:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {statStrip.map((s) => (
              <div key={s.label}>
                <p className="text-[44px] sm:text-[56px] font-bold leading-none text-[#d298ff]" style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</p>
                <p className="text-[16px] font-semibold mt-2">{s.label}</p>
                <p className="text-[13px] text-white/50 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bydeler — intern lenkekraft + lokal relevans */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-20">
        <h2 className="text-[26px] sm:text-[36px] font-bold tracking-[-0.02em] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Lokal utleiemegler i hele Bergen</h2>
        <p className="text-[#666] text-[15.5px] max-w-[58ch] mb-8">Vi kjenner leiemarkedet bydel for bydel — se lokal etterspørsel og leiepriser der boligen din ligger.</p>
        <div className="flex flex-wrap gap-2.5">
          {bydeler.map((l) => (
            <Link key={l.slug} href={`/utleie/${l.slug}`} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white shadow-[0_4px_18px_-10px_rgba(0,0,0,0.15)] text-[14px] font-semibold text-[#1f1f1f] hover:text-[#7c3aed] transition-colors">
              <MapPin className="w-3.5 h-3.5 text-[#7c3aed]" /> {l.name}
            </Link>
          ))}
          <Link href="/utleie" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#0a0a0a] text-white text-[14px] font-semibold hover:bg-[#2a2a2a] transition-colors">Alle områder <ArrowUpRight className="w-3.5 h-3.5" /></Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#1a1430] to-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24 text-center">
          <h2 className="text-[28px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4 max-w-[24ch] mx-auto" style={{ fontFamily: 'var(--font-heading)' }}>Slipp utleiejobben — behold inntekten</h2>
          <p className="text-white/70 text-[16px] max-w-[52ch] mx-auto mb-8">Registrer boligen på under to minutter. Uforpliktende tilbud fra en lokal rådgiver — som regel samme dag.</p>
          <Link href="/bli-utleier" className="group inline-flex items-center gap-2 h-[54px] pl-7 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold active:scale-[0.98] transition-transform">Kom i gang<span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span></Link>
        </div>
      </section>

      <FaqSection
        title="Ofte stilte spørsmål om utleiemegler i Bergen"
        intro="Det folk lurer på før de velger utleiemegler."
        faqs={FAQS}
      />
      <JsonLd data={breadcrumbLd([{ name: 'Utleiemegler i Bergen', path: '/utleiemegler-bergen' }])} />
      <JsonLd data={serviceLd({
        name: 'Utleiemegler i Bergen',
        description: 'Komplett utleiemeglertjeneste i Bergen: annonsering, visninger, screening, digitale kontrakter, husleie og oppfølging — med AI-prising, uten oppstartskostnader og uten bindingstid.',
        path: '/utleiemegler-bergen',
        serviceType: 'Utleiemegling',
      })} />
      <Footer />
    </div>
  );
}
