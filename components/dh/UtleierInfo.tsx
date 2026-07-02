import React from 'react';
import Reveal from '@/components/dh/Reveal';
import { site } from '@/lib/site';
import {
  Camera, Users, ShieldCheck, FileSignature, KeyRound, Wrench, Banknote, LineChart,
  ChevronDown, Check, MessageCircleQuestion, Phone,
} from 'lucide-react';

// Informativ tjenesteside for huseiere (/bli-utleier) — «Warm Ink Editorial».
// Bygget etter kundetilbakemelding: direktebesøkende trengte mye mer info
// (tjenester, prismodell, FAQ) før skjemaet. Skjemaet ligger nederst (#skjema).

const eyebrow = 'inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9b6cc4]';
const h2cls = 'text-[34px] sm:text-[42px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a]';
const headingFont = { fontFamily: 'var(--font-heading)' } as React.CSSProperties;

// ─── HERO ────────────────────────────────────────────────────────────────────
export function UtleierHero() {
  return (
    <section className="bg-[#faf9f7] pt-[118px] sm:pt-[136px] pb-16 sm:pb-24">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal as="div" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
            <span className={eyebrow}>For huseiere i Bergen</span>
            <h1 className="text-[38px] sm:text-[50px] lg:text-[56px] font-bold tracking-[-0.03em] leading-[1.04] text-[#0a0a0a] mt-4" style={headingFont}>
              Utleie uten stress.<br />Vi tar oss av alt.
            </h1>
            <p className="text-[16.5px] sm:text-[17.5px] leading-relaxed text-[#57504A] mt-6 max-w-[520px]">
              Fra annonsering og visninger til kontrakt, husleie og vedlikehold — DigiHome er din lokale
              utleiemegler som håndterer hele utleien, mens du beholder inntekten og roen.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <a href="#skjema" data-testid="utleier-hero-cta" className="inline-flex items-center gap-2 h-[52px] px-7 rounded-full bg-[#0a0a0a] text-white text-[15px] font-semibold hover:bg-[#2a2a2a] transition-colors">
                Få tilbud innen 24 timer
                <span aria-hidden>→</span>
              </a>
              <a href={`tel:${site.phoneHref}`} className="inline-flex items-center gap-2 h-[52px] px-6 rounded-full bg-white text-[#0a0a0a] text-[15px] font-semibold shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-shadow">
                <Phone className="w-4 h-4 text-[#7c3aed]" /> {site.phone}
              </a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8">
              {['150+ boliger under forvaltning', '0 kr oppstart', 'Ingen bindingstid'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-[13px] text-[#57504A]">
                  <Check className="w-4 h-4 text-[#7c3aed]" /> {t}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal as="div" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="relative">
            <img src="/showcase-apartment.webp" alt="Lys og moderne utleiebolig forvaltet av DigiHome" className="w-full aspect-[4/3] object-cover rounded-3xl" />
            <div className="absolute -bottom-5 left-6 sm:left-8 bg-white rounded-2xl shadow-[0_10px_34px_rgba(10,10,10,0.12)] px-5 py-4">
              <p className="text-[12px] text-[#8A8178]">Gjennomsnittlig svartid</p>
              <p className="text-[18px] font-bold text-[#0a0a0a]" style={headingFont}>Samme dag</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── ALT VI TAR OSS AV ──────────────────────────────────────────────────────
const SERVICES = [
  { icon: Camera, t: 'Proff annonsering', d: 'Foto, tekst og annonsering der leietakerne faktisk leter.' },
  { icon: Users, t: 'Visninger', d: 'Vi møter interessentene og gjennomfører visningene for deg.' },
  { icon: ShieldCheck, t: 'Trygg leietakersjekk', d: 'Kredittsjekk, referanser og dokumentkontroll før signering.' },
  { icon: FileSignature, t: 'Kontrakt & depositum', d: 'Digital leiekontrakt med BankID og korrekt depositumskonto.' },
  { icon: KeyRound, t: 'Inn- og utflytting', d: 'Overtakelsesprotokoll, nøkler og dokumentert tilstand.' },
  { icon: Wrench, t: 'Vedlikehold', d: 'Ett kontaktpunkt — vi koordinerer håndverkere og alt praktisk.' },
  { icon: Banknote, t: 'Husleie & oppfølging', d: 'Innkreving, purring og trygg utbetaling til din konto.' },
  { icon: LineChart, t: 'Full rapportering', d: 'Løpende innsikt og ferdig grunnlag til skattemeldingen.' },
];

export function UtleierServices() {
  return (
    <section className="py-20 sm:py-28 bg-white" data-testid="utleier-services">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal as="div" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }} className="max-w-[720px] mb-14">
          <span className={eyebrow}>Alt inkludert</span>
          <h2 className={`${h2cls} mt-4`} style={headingFont}>Vi tar oss av alt — fra annonse til utflytting</h2>
          <p className="text-[15.5px] leading-relaxed text-[#57504A] mt-4">
            Én partner, ett ansvar. Dette er inkludert i forvaltningen — uten skjulte tillegg.
          </p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES.map((s, i) => (
            <Reveal as="div" key={s.t} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: (i % 4) * 0.07 }}
              className="rounded-2xl bg-[#faf9f7] p-6">
              <div className="w-11 h-11 rounded-xl bg-[#f1e8fd] flex items-center justify-center mb-4">
                <s.icon className="w-5 h-5 text-[#7c3aed]" />
              </div>
              <h3 className="text-[16px] font-bold text-[#0a0a0a]" style={headingFont}>{s.t}</h3>
              <p className="text-[13.5px] leading-relaxed text-[#57504A] mt-2">{s.d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── PRISMODELL (uten konkrete tall — bevisst valg, se admin) ───────────────
export function UtleierPrisModell() {
  return (
    <section className="py-20 sm:py-24 bg-white" data-testid="utleier-prismodell">
      <div className="max-w-[1160px] mx-auto px-6 sm:px-10">
        <Reveal as="div" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55 }}
          className="rounded-[28px] bg-[#0f0e11] px-8 sm:px-14 py-12 sm:py-16 text-center">
          <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#c9a8f0]">Prismodell</span>
          <h2 className="text-[30px] sm:text-[40px] font-bold tracking-[-0.03em] leading-[1.1] text-white mt-4 max-w-[760px] mx-auto" style={headingFont}>
            Enkel og rettferdig pris — du betaler kun når boligen tjener penger
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mt-10 max-w-[860px] mx-auto">
            {[
              ['0 kr i oppstart', 'Befaring, vurdering og klargjøring koster ingenting.'],
              ['Ingen bindingstid', 'Du kan avslutte når du vil — vi må gjøre oss fortjent til tilliten.'],
              ['Andel av leien', 'Honoraret trekkes av leieinntekten — kun når boligen er utleid.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl bg-white/[0.06] px-6 py-6 text-left">
                <Check className="w-5 h-5 text-[#c9a8f0] mb-3" />
                <p className="text-[16px] font-bold text-white" style={headingFont}>{t}</p>
                <p className="text-[13px] leading-relaxed text-white/60 mt-1.5">{d}</p>
              </div>
            ))}
          </div>
          <p className="text-[14px] text-white/55 mt-8 max-w-[560px] mx-auto">
            Nøyaktig pris avhenger av boligen og utleiemodellen du velger. Du får et konkret,
            uforpliktende tilbud innen 24 timer — helt gratis.
          </p>
          <a href="#skjema" className="inline-flex items-center gap-2 h-[52px] px-8 rounded-full bg-white text-[#0a0a0a] text-[15px] font-semibold mt-8 hover:bg-[#f0eae2] transition-colors">
            Få ditt tilbud <span aria-hidden>→</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}

// ─── HUSEIER-FAQ (+ FAQPage JSON-LD for SEO/AI-motorer) ─────────────────────
const UTLEIER_FAQ: Array<{ q: string; a: string }> = [
  { q: 'Hva koster det å bruke DigiHome?', a: 'Det er 0 kr i oppstart og ingen bindingstid. Vi tar et honorar som en andel av leieinntekten — kun når boligen faktisk er utleid. Nøyaktig pris avhenger av boligen og utleiemodellen, og du får et konkret, uforpliktende tilbud innen 24 timer.' },
  { q: 'Hvor raskt kan boligen leies ut?', a: 'De fleste boliger annonseres innen få dager etter befaring. Leietaker er normalt på plass i løpet av 2–4 uker, avhengig av marked, sesong og boligtype.' },
  { q: 'Hvilke utleiemodeller tilbyr dere?', a: 'Vi tilbyr langtidsutleie (stabil, forutsigbar leie), korttidsutleie (høyere inntekt via døgn- og ukesleie) og hybridutleie som kombinerer begge for best mulig totalinntekt gjennom året. Vi anbefaler modell basert på boligen din.' },
  { q: 'Hvordan sikrer dere riktige leietakere?', a: 'Alle leietakere gjennomgår kredittsjekk, referansesjekk og dokumentkontroll før signering. Kontrakten signeres digitalt med BankID, og depositum settes på korrekt depositumskonto.' },
  { q: 'Hvem har ansvaret for boligen underveis?', a: 'Vi følger opp leietaker, koordinerer vedlikehold og håndterer alt praktisk gjennom hele leieforholdet. Du eier — vi drifter, og du har full innsikt hele veien.' },
  { q: 'Hva skjer hvis leietaker ikke betaler?', a: 'Vi håndterer purring og oppfølging etter fastsatte rutiner, og depositumet gir ekstra sikkerhet. Du slipper de ubehagelige samtalene — det er jobben vår.' },
  { q: 'Kan jeg avslutte avtalen når som helst?', a: 'Ja. Vi har ingen bindingstid — vi må gjøre oss fortjent til tilliten din hver måned.' },
];

export function UtleierFaq() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: UTLEIER_FAQ.map(({ q, a }) => ({
      '@type': 'Question', name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  return (
    <section className="py-20 sm:py-28 bg-[#faf9f7]" data-testid="utleier-faq">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-[820px] mx-auto px-6 sm:px-10">
        <Reveal as="div" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }} className="text-center mb-12">
          <span className={eyebrow}><MessageCircleQuestion className="w-4 h-4" /> Ofte stilte spørsmål</span>
          <h2 className={`${h2cls} mt-4`} style={headingFont}>Det huseiere lurer på</h2>
        </Reveal>
        <div className="bg-white rounded-3xl px-6 sm:px-9 py-2 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          {UTLEIER_FAQ.map(({ q, a }, i) => (
            <details key={q} className="group border-b border-[#f0efec] last:border-0">
              <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span className="text-[15.5px] font-semibold text-[#0a0a0a]" style={headingFont}>{q}</span>
                <ChevronDown className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0 text-[#9b6cc4] transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="pb-6 -mt-1 text-[14.5px] leading-relaxed text-[#57504A]">{a}</p>
            </details>
          ))}
        </div>
        <p className="text-center text-[14px] text-[#8A8178] mt-8">
          Fant du ikke svaret? Ring oss på{' '}
          <a href={`tel:${site.phoneHref}`} className="text-[#7c3aed] font-semibold">{site.phone}</a>
          {' '}— vi svarer gjerne.
        </p>
      </div>
    </section>
  );
}
