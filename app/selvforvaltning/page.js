import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, serviceLd, faqLd, howToLd, stripMarkup } from '@/lib/seo';
import { site } from '@/lib/site';
import { guides } from '@/lib/guides';
import { getCatalog } from '@/lib/catalog-server';
import {
  SELF_LEVEL_KEY, SELF_START_PATH, SELF_PUBLIC_NAME,
  serviceLevel, catalogAddon, monthlyFee, minFeeThreshold, fmtNok,
} from '@/lib/catalog';
import {
  Check, Minus, ShieldCheck, MapPin, ArrowRight, ArrowUpRight, Clock,
  Wallet, FileSignature, Megaphone, MessagesSquare, LayoutDashboard, PiggyBank,
  UserCheck, ClipboardCheck, Wrench, Calculator, Home,
} from 'lucide-react';

// ── SELVFORVALTNING: PRODUKTSIDEN ────────────────────────────────────────────
// Selvforvaltning fantes som produkt (5 % av leien, hele landet, umiddelbar
// start), men hadde ingen egen URL — den var en radioknapp inne i
// registreringsskjemaet, valgt ETTER at brukeren hadde gitt fra seg
// kontaktinfo. Da finnes det ingenting å rangere, lenke til eller annonsere
// mot, og 72 % av den organiske trafikken (guider om depositum, skatt og
// husleieøkning — altså folk som gjør det selv) ble møtt med «la oss gjøre
// det for deg».
//
// Alle tall og innholdslister hentes fra tjenestekatalogen (lib/catalog.js,
// med overstyring fra settings.wizard_catalog), slik at denne siden aldri kan
// vise andre priser enn priskalkulatoren.

export const revalidate = 3600;

export const metadata = {
  title: 'Selvforvaltning: leie ut boligen selv med kontrakt og innkreving',
  description: 'Du holder visningene og velger leietaker selv. FINN-annonse, leiekontrakt med BankID, depositumskonto, husleieinnkreving og full oversikt ligger i DigiHome. Tilgjengelig i hele Norge — 5 % av husleien, ingen minstepris og ingen bindingstid.',
  alternates: { canonical: '/selvforvaltning' },
  openGraph: {
    title: 'Selvforvaltning — leie ut boligen selv | DigiHome',
    description: 'Du velger leietaker. Annonse, kontrakt, depositumskonto og husleieinnkreving ligger i det samme systemet vi drifter forvaltningsboligene våre i.',
    url: `${site.url}/selvforvaltning`, type: 'website', locale: 'nb_NO',
    images: [{ url: site.url + site.ogImage }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Selvforvaltning — leie ut boligen selv | DigiHome',
    description: 'Du velger leietaker. Annonse, kontrakt, depositumskonto og innkreving ligger i systemet.',
    images: [site.url + site.ogImage],
  },
};

// Ikon per katalogpunkt. Katalogen er tekst (den kan overstyres av admin), så
// vi matcher på nøkkelord og faller tilbake til et nøytralt ikon.
function iconFor(label = '') {
  const t = label.toLowerCase();
  if (t.includes('finn')) return Megaphone;
  if (t.includes('kontrakt')) return FileSignature;
  if (t.includes('husleie') || t.includes('innkrev') || t.includes('purring')) return Wallet;
  if (t.includes('depositum')) return PiggyBank;
  if (t.includes('chat') || t.includes('leietaker')) return MessagesSquare;
  if (t.includes('dashboard') || t.includes('oversikt')) return LayoutDashboard;
  if (t.includes('visning')) return UserCheck;
  if (t.includes('befaring')) return ClipboardCheck;
  if (t.includes('vedlikehold')) return Wrench;
  return Check;
}

// Kort presisering av hva «du gjør selv»-punktene betyr i praksis. Nøkkelord-
// matchet på samme måte som iconFor, fordi katalogteksten kan overstyres av
// admin — finner vi ikke punktet, viser vi ingen ekstra linje.
function hintFor(label = '') {
  const t = label.toLowerCase();
  if (t.includes('visning')) return 'Du møter kandidatene og bestemmer hvem som får boligen.';
  if (t.includes('befaring')) return 'Du dokumenterer standen ved inn- og utflytting.';
  if (t.includes('vedlikehold')) return 'Du bestiller håndverker når noe må utbedres.';
  return '';
}

// Guider som treffer nøyaktig denne leseren: hen har bestemt seg for å gjøre
// jobben selv og trenger regelverket, ikke en selger.
const DIY_GUIDE_SLUGS = [
  'utleiemegler-vs-selvforvaltning',
  'depositumskonto',
  'husleieokning',
  'skatt-pa-utleie',
];

export default async function SelvforvaltningPage() {
  const catalog = await getCatalog();
  const self = serviceLevel(catalog, SELF_LEVEL_KEY);
  const visning = catalogAddon(catalog, 'visningshjelp');
  const threshold = minFeeThreshold(self);
  const examples = [10000, 15000, 20000, 25000].map((rent) => ({ rent, fee: monthlyFee(rent, self) }));
  const priceLine = `${self.pct} % av husleien${self.minMonthly ? ` · min. ${fmtNok(self.minMonthly)} kr/mnd` : ''}`;
  const diyGuides = DIY_GUIDE_SLUGS.map((s) => guides.find((g) => g.slug === s)).filter(Boolean);

  const steps = [
    { t: 'Legg inn adressen', d: 'Vi henter opplysningene om boligen automatisk, så du slipper å fylle ut skjemaer.' },
    { t: 'Opprett konto og signer', d: 'Avtalen signeres digitalt med BankID, og du får tilgang til utleiedashboardet med en gang.' },
    { t: 'Annonsen går ut på FINN', d: 'Du holder visningene og velger leietaker. Vi ordner kontrakt, depositumskonto og innkreving.' },
  ];

  // Utsnitt av utleiedashboardet. Siden skal VISE hva produktet er, i stedet for
  // å ankre seg i prosenten: hver rad er en funksjon som ligger i katalogen over
  // hva selvforvaltning inneholder. Merket som illustrasjon i foten av kortet.
  const panelRows = [
    { icon: Megaphone, t: 'FINN-annonse', s: 'Publisert av DigiHome', chip: 'Aktiv' },
    { icon: FileSignature, t: 'Leiekontrakt', s: 'Signert med BankID', chip: 'Signert' },
    { icon: PiggyBank, t: 'Depositumskonto', s: 'Sperret konto i leietakers navn', v: `${fmtNok(49500)} kr` },
    { icon: Wallet, t: 'Husleie', s: 'Innkreving og purring', v: `${fmtNok(16500)} kr/mnd` },
    { icon: LayoutDashboard, t: 'Oversikt', s: 'Betalinger, dokumenter og meldinger', chip: 'Samlet' },
  ];

  // Rekkefølgen er bevisst: leseren skal forstå arbeidsdelingen og dekningen før
  // prisen, ellers blir prosenten det eneste hen husker fra siden. Spørsmålet om
  // pris beholdes ordrett, fordi det er det folk faktisk søker etter.
  const faqs = [
    {
      q: 'Hva gjør jeg selv, og hva gjør DigiHome?',
      a: `Du holder visningene, velger leietaker, gjør inn- og utflyttingsbefaring og håndterer vedlikehold. DigiHome leverer systemet rundt: ${self.included.map((s) => s.charAt(0).toLowerCase() + s.slice(1)).join(', ')}.`,
    },
    {
      q: 'Kan jeg bruke selvforvaltning utenfor Bergen?',
      a: 'Ja. Selvforvaltning er heldigital og tilgjengelig i hele Norge. Full forvaltning, der vi tar visninger, befaring og vedlikehold, tilbys foreløpig kun i Bergen og omegn.',
    },
    {
      q: 'Hva koster selvforvaltning?',
      a: `${self.pct} % av husleien. Leier du ut for ${fmtNok(15000)} kr i måneden koster det ${fmtNok(monthlyFee(15000, self))} kr. ${self.minMonthly ? `Minsteprisen er ${fmtNok(self.minMonthly)} kr per måned. ` : 'Det er ingen minstepris. '}Ingen oppstartskostnad og ingen bindingstid — honoraret følger leien.`,
    },
    {
      q: 'Hvem holder visningene?',
      a: visning
        ? `Det gjør du. Vil du slippe det, kan du kjøpe visningshjelp: ${fmtNok(visning.price)} kr per visning. Da møter vi kandidatene for deg, men du bestemmer fortsatt hvem som får boligen.`
        : 'Det gjør du. Du bestemmer selv hvem som får boligen.',
    },
    {
      q: 'Kan jeg leie ut på korttid eller Airbnb med selvforvaltning?',
      a: 'Nei. Selvforvaltning er laget for langtidsutleie. Dynamisk utleie (10+2-modellen), der boligen kombinerer langtid og korttid i høysesong, krever full forvaltning fordi vi da håndterer gjestebytter, renhold og prisstyring.',
    },
    {
      q: 'Kan jeg gå over til full forvaltning senere?',
      a: 'Ta kontakt, så ser vi på det. Full forvaltning tilbys i Bergen og omegn, og siden alt allerede ligger i systemet — kontrakt, depositum og leiehistorikk — trenger du ikke starte på nytt.',
    },
  ];

  // Prisraden ligger nederst med vilje. Leseren skal først se at systemet er det
  // samme, og at forskjellen er hvem som møter opp — ikke sammenligne to tall.
  const compareRows = [
    { label: 'Hvor', self: 'Hele Norge', full: 'Bergen og omegn' },
    { label: 'Utleiemodell', self: 'Langtidsutleie', full: 'Langtid eller dynamisk (10+2)' },
    { label: 'Annonsering på FINN.no', self: true, full: true },
    { label: 'Digital kontrakt med BankID', self: true, full: true },
    { label: 'Depositumskonto', self: true, full: true },
    { label: 'Husleieinnkreving og purring', self: true, full: true },
    { label: 'Utleiedashboard og chat', self: true, full: true },
    { label: 'Visninger og leietakervalg', self: visning ? 'Du — eller kjøp visningshjelp' : 'Du gjør det selv', full: true },
    { label: 'Inn- og utflyttingsbefaring', self: false, full: true },
    { label: 'Vedlikeholdskoordinering', self: false, full: true },
    { label: 'Dedikert forvalter', self: false, full: true },
    { label: 'Pris', self: priceLine, full: 'Etter tilbud — vi vurderer boligen først' },
  ];

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <JsonLd data={breadcrumbLd([
        { name: 'Hjem', item: '/' },
        { name: 'Selvforvaltning', item: '/selvforvaltning' },
      ])} />
      <JsonLd data={serviceLd({
        name: 'Selvforvaltning av utleiebolig',
        description: `Digital selvforvaltning for utleiere: FINN-annonse, kontrakt med BankID-signering, depositumskonto, husleieinnkreving og utleiedashboard. ${priceLine}.`,
        path: '/selvforvaltning',
        serviceType: 'Selvforvaltning av utleiebolig',
      })} />
      <JsonLd data={faqLd(faqs)} />
      <JsonLd data={howToLd({
        name: 'Slik leier du ut boligen selv med DigiHome',
        description: 'Tre steg fra adresse til publisert FINN-annonse.',
        path: '/selvforvaltning',
        steps: steps.map((s) => ({ name: s.t, text: s.d })),
      })} />

      <Header />

      <main className="pt-[72px]">
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="max-w-[1160px] mx-auto px-6 sm:px-10 pt-12 lg:pt-16 pb-4">
          <div className="grid lg:grid-cols-[1.06fr_1fr] gap-10 lg:gap-14 items-start">
            <div>
              {/* Én rolig linje i stedet for tre pastellmerker. Produktnavn og
                  dekningsområde er fakta leseren trenger — ikke pynt. */}
              <p className="flex flex-wrap items-center gap-2.5 text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#6f6a60]">
                {SELF_PUBLIC_NAME}
                <span className="w-[3px] h-[3px] rounded-full bg-[#c2bab0]" aria-hidden="true" />
                <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#18794E]" /> Hele Norge</span>
              </p>

              <h1 className="mt-5 text-[33px] sm:text-[43px] lg:text-[50px] font-bold tracking-[-0.03em] leading-[1.06] text-balance" style={{ fontFamily: 'var(--font-heading)' }}>
                Leie ut boligen selv — du velger leietaker, vi holder orden på resten
              </h1>

              <p className="mt-5 text-[16.5px] sm:text-[17.5px] text-[#4a4a4a] leading-[1.72] max-w-[56ch]">
                Selvforvaltning er DigiHome uten forvalteren. Du holder visningene og bestemmer
                hvem som får boligen. FINN-annonsen, leiekontrakten, depositumskontoen og
                husleieinnkrevingen ligger i samme system som forvaltningsboligene våre — du
                styrer det bare selv.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={SELF_START_PATH}
                  className="group inline-flex items-center gap-2 h-[54px] px-7 rounded-full bg-[#0a0a0a] text-white font-semibold text-[15.5px] hover:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.45)] transition-all active:scale-[0.98]"
                >
                  Registrer boligen
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#hvem-gjor-hva"
                  className="inline-flex items-center gap-2 h-[54px] px-6 rounded-full bg-white border border-black/[0.1] font-semibold text-[15px] text-[#1f1f1f] hover:border-[#d9c9f5] transition-colors"
                >
                  Se hva som er inkludert
                </a>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[#5f5a53]">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#18794E]" /> Signering med BankID</span>
                <span className="inline-flex items-center gap-1.5"><PiggyBank className="w-4 h-4 text-[#18794E]" /> Depositum på sperret konto</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#18794E]" /> Ingen bindingstid</span>
              </div>
            </div>

            {/* Produktflate, ikke priskort: det første leseren ser skal være hva
                hen faktisk får tilgang til. Radene speiler katalogens
                inkludert-liste, og kortet er merket som illustrasjon. */}
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-[26px] border border-black/[0.07] shadow-[0_26px_74px_-34px_rgba(0,0,0,0.3)] overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-black/[0.06]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-[#f4f0fb] flex items-center justify-center shrink-0">
                      <Home className="w-[17px] h-[17px] text-[#7c3aed]" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold leading-tight truncate">Fjellveien 24B</p>
                      <p className="text-[12px] text-[#6b665f] leading-tight mt-0.5">3-roms · 68 m²</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E8F4EE] text-[#18794E] text-[11.5px] font-semibold shrink-0">Utleid</span>
                </div>

                <div className="divide-y divide-black/[0.05]">
                  {panelRows.map((r) => {
                    const Icon = r.icon;
                    return (
                      <div key={r.t} className="flex items-center gap-3.5 px-5 sm:px-6 py-3.5">
                        <span className="w-8 h-8 rounded-lg bg-[#f7f5f2] flex items-center justify-center shrink-0">
                          <Icon className="w-[15px] h-[15px] text-[#5f5a53]" strokeWidth={2} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-semibold leading-tight">{r.t}</p>
                          <p className="text-[12px] text-[#6b665f] leading-tight mt-0.5">{r.s}</p>
                        </div>
                        {r.v ? (
                          <span className="text-[13px] font-semibold tabular-nums shrink-0">{r.v}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#18794E] shrink-0">
                            <Check className="w-3.5 h-3.5" strokeWidth={2.6} /> {r.chip}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="px-5 sm:px-6 py-3.5 bg-[#fdfcfb] border-t border-black/[0.06] text-[11.5px] text-[#6b665f]">
                  Illustrasjon av utleiedashboardet du får tilgang til
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── HVEM GJØR HVA ─────────────────────────────────────────────── */}
        {/* Var tidligere to seksjoner («Dette er inkludert i 5 %» og «Dette gjør
            du selv»). Slått sammen fordi arbeidsdelingen ER produktet, og den
            forstås best når begge kolonnene står ved siden av hverandre. */}
        <section id="hvem-gjor-hva" className="max-w-[1160px] mx-auto px-6 sm:px-10 py-14 sm:py-20 scroll-mt-24">
          <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.025em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Hvem gjør hva
          </h2>
          <p className="mt-3 text-[15.5px] text-[#666] max-w-[62ch] leading-relaxed">
            Systemet er det samme som forvaltningskundene våre bruker. Forskjellen er
            arbeidsdelingen: du tar den delen som krever at et menneske møter opp.
          </p>

          <div className="mt-9 grid lg:grid-cols-[1.35fr_1fr] gap-7 lg:gap-10 items-start">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#6d28d9]">DigiHome leverer</p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {self.included.map((item) => {
                  const Icon = iconFor(item);
                  return (
                    <div key={item} className="bg-white rounded-2xl border border-black/[0.06] px-4 py-4 flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-[#f4f0fb] flex items-center justify-center shrink-0">
                        <Icon className="w-[17px] h-[17px] text-[#7c3aed]" strokeWidth={2} />
                      </span>
                      <p className="text-[14px] font-semibold leading-snug">{item}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#6f6a60]">Du gjør selv</p>
              <div className="mt-4 bg-white rounded-2xl border border-black/[0.06] divide-y divide-black/[0.05]">
                {self.notIncluded.map((item) => {
                  const Icon = iconFor(item);
                  const hint = hintFor(item);
                  return (
                    <div key={item} className="px-4 sm:px-5 py-4 flex items-start gap-3">
                      <span className="w-9 h-9 rounded-xl bg-[#f5f3f0] flex items-center justify-center shrink-0">
                        <Icon className="w-[17px] h-[17px] text-[#5f5a53]" strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold leading-snug">{item}</p>
                        {hint ? <p className="mt-1 text-[13px] text-[#6b665f] leading-relaxed">{hint}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3.5 text-[13.5px] text-[#6b665f] leading-relaxed">
                Vi sier det rett ut, for det er her forskjellen mellom selvforvaltning og full
                forvaltning ligger.
              </p>
            </div>
          </div>

          {/* Én mørk stripe med begge veiene videre for den som ikke vil gjøre
              alt selv — i stedet for et eget tilleggskort med pris i tittelen. */}
          <div className="mt-9 bg-[#0a0a0a] rounded-[26px] p-7 sm:p-9 lg:p-10 text-white grid lg:grid-cols-[1.2fr_1fr] gap-7 lg:gap-12">
            <div>
              <h3 className="text-[21px] sm:text-[24px] font-bold leading-tight tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>
                Vil du ikke holde visningene selv?
              </h3>
              <p className="mt-3 text-[15px] text-white/75 leading-relaxed">
                Vi kan møte kandidatene for deg. Du bestemmer fortsatt hvem som får boligen — vi
                stiller bare opp med nøkkelen.
              </p>
              {visning ? (
                <p className="mt-3 text-[13.5px] text-white/70">
                  Visningshjelp: {fmtNok(visning.price)} kr per visning.
                </p>
              ) : null}
            </div>
            <div className="lg:border-l lg:border-white/15 lg:pl-11">
              <p className="text-[14.5px] text-white/75 leading-relaxed">
                Skal vi ta <em>hele</em> jobben — visninger, befaring, vedlikehold og en dedikert
                forvalter — er det full forvaltning du vil ha. Den tilbys i Bergen og omegn.
              </p>
              <Link href="/forvaltning" className="mt-5 inline-flex items-center gap-2 text-[14.5px] font-semibold text-[#d298ff] hover:text-white transition-colors">
                Se full forvaltning <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── SLIK KOMMER DU I GANG ─────────────────────────────────────── */}
        <section className="bg-white border-y border-black/[0.06]">
          <div className="max-w-[1160px] mx-auto px-6 sm:px-10 py-14 sm:py-20">
            <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.025em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Slik kommer du i gang
            </h2>
            <div className="mt-9 grid sm:grid-cols-3 gap-5">
              {steps.map((s, i) => (
                <div key={s.t} className="bg-[#fdfcfb] rounded-2xl border border-black/[0.06] p-6">
                  <span className="font-heading text-[12px] font-bold tracking-[0.15em] text-[#7c3aed]">STEG 0{i + 1}</span>
                  <h3 className="mt-3 text-[18px] font-bold leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>{s.t}</h3>
                  <p className="mt-2 text-[14.5px] text-[#666] leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
            <Link href={SELF_START_PATH} className="group mt-8 inline-flex items-center gap-2 h-[52px] px-6 rounded-full bg-[#0a0a0a] text-white font-semibold text-[15px] hover:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.45)] transition-all active:scale-[0.98]">
              Registrer boligen <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* ── PRIS ──────────────────────────────────────────────────────── */}
        {/* Prisen står samlet på ett sted, etter at leseren har sett hva
            produktet faktisk er. Tallene kommer fra tjenestekatalogen, så siden
            kan aldri vise noe annet enn priskalkulatoren. */}
        <section id="pris" className="max-w-[1160px] mx-auto px-6 sm:px-10 py-14 sm:py-20 scroll-mt-24">
          <div className="bg-white rounded-[28px] border border-black/[0.07] p-7 sm:p-10 lg:p-12 grid lg:grid-cols-2 gap-9 lg:gap-16">
            <div>
              <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.025em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                Hva det koster
              </h2>
              <p className="mt-3.5 text-[15.5px] text-[#4a4a4a] leading-[1.75] max-w-[46ch]">
                Honoraret følger leien: {self.pct} % av husleien
                {self.minMonthly
                  ? `, med en minstepris på ${fmtNok(self.minMonthly)} kr per måned. Ingen oppstartskostnad og ingen bindingstid.`
                  : '. Ingen minstepris, ingen oppstartskostnad og ingen bindingstid.'}
              </p>
              {self.minMonthly ? (
                <p className="mt-3 text-[13.5px] text-[#6b665f] leading-relaxed">
                  Minsteprisen slår inn under {fmtNok(threshold)} kr i månedsleie.
                </p>
              ) : null}
              <Link href="/priskalkulator" className="mt-6 inline-flex items-center gap-2 h-[48px] px-5 rounded-full border border-black/[0.12] font-semibold text-[14.5px] hover:border-[#d9c9f5] transition-colors">
                <Calculator className="w-4 h-4" /> Regn ut for din bolig
              </Link>
            </div>
            <div className="lg:border-l lg:border-black/[0.07] lg:pl-14">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#6f6a60]">Eksempler</p>
              <div className="mt-3 divide-y divide-black/[0.06]">
                {examples.map((e) => (
                  <div key={e.rent} className="flex items-center justify-between gap-4 py-3 text-[14.5px]">
                    <span className="text-[#5f5a53]">{fmtNok(e.rent)} kr/mnd i leie</span>
                    <span className="font-semibold tabular-nums">{fmtNok(e.fee)} kr/mnd</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[12.5px] text-[#6b665f] leading-relaxed">
                Regnet ut med samme prismodell som priskalkulatoren.
              </p>
            </div>
          </div>
        </section>

        {/* ── SAMMENLIGNING ─────────────────────────────────────────────── */}
        <section className="bg-white border-y border-black/[0.06]">
          <div className="max-w-[1160px] mx-auto px-6 sm:px-10 py-14 sm:py-20">
            <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.025em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Selvforvaltning eller full forvaltning?
            </h2>
            <p className="mt-3 text-[15.5px] text-[#666] max-w-[62ch] leading-relaxed">
              Forskjellen er ikke kvaliteten på systemet — det er det samme. Forskjellen er hvor
              mye du selv vil gjøre.
            </p>

            <div className="mt-9 rounded-3xl border border-black/[0.08] overflow-hidden">
              <div className="grid grid-cols-[1.15fr_1fr_1fr] sm:grid-cols-[1.5fr_1fr_1fr] bg-[#fdfcfb] border-b border-black/[0.08]">
                <div className="px-3.5 sm:px-6 py-4" />
                <div className="px-2.5 sm:px-6 py-4 text-center bg-[#faf7ff]">
                  <p className="text-[13.5px] sm:text-[15px] font-bold">Selvforvaltning</p>
                  <p className="text-[11px] text-[#7c3aed] font-semibold mt-0.5">Du gjør visningene</p>
                </div>
                <div className="px-2.5 sm:px-6 py-4 text-center">
                  <p className="text-[13.5px] sm:text-[15px] font-bold">Full forvaltning</p>
                  <p className="text-[11px] text-[#6f6a60] font-semibold mt-0.5">Vi gjør alt</p>
                </div>
              </div>

              {compareRows.map((r, i) => {
                const cell = (v, isSelf) => {
                  if (v === true) return <Check className={`w-[18px] h-[18px] mx-auto ${isSelf ? 'text-[#7c3aed]' : 'text-[#18794E]'}`} strokeWidth={2.6} />;
                  if (v === false) return <Minus className="w-[18px] h-[18px] mx-auto text-[#8a837a]" strokeWidth={2.4} />;
                  return <span className={`text-[12.5px] sm:text-[14px] leading-snug ${isSelf ? 'font-semibold' : 'text-[#5f5a53]'}`}>{v}</span>;
                };
                return (
                  <div key={r.label} className={`grid grid-cols-[1.15fr_1fr_1fr] sm:grid-cols-[1.5fr_1fr_1fr] items-center ${i % 2 ? 'bg-[#fdfcfb]' : ''} ${i < compareRows.length - 1 ? 'border-b border-black/[0.05]' : ''}`}>
                    <div className="px-3.5 sm:px-6 py-3.5 text-[12.5px] sm:text-[14.5px] font-medium text-[#4a4a4a] leading-snug">{r.label}</div>
                    <div className="px-2.5 sm:px-6 py-3.5 text-center bg-[#faf7ff]">{cell(r.self, true)}</div>
                    <div className="px-2.5 sm:px-6 py-3.5 text-center">{cell(r.full, false)}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={SELF_START_PATH} className="group inline-flex items-center gap-2 h-[52px] px-6 rounded-full bg-[#0a0a0a] text-white font-semibold text-[15px] hover:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.45)] transition-all active:scale-[0.98]">
                Start med selvforvaltning <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/bli-utleier" className="inline-flex items-center gap-2 h-[52px] px-6 rounded-full bg-white border border-black/[0.1] font-semibold text-[15px] hover:border-[#d9c9f5] transition-colors">
                Få tilbud på full forvaltning
              </Link>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="max-w-[820px] mx-auto px-6 sm:px-10 py-14 sm:py-20">
          <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.025em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Ofte stilte spørsmål
          </h2>
          <div className="mt-8 divide-y divide-black/[0.07]">
            {faqs.map((f) => (
              <div key={f.q} className="py-6">
                <h3 className="text-[17px] sm:text-[18.5px] font-bold leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>{f.q}</h3>
                <p className="mt-2.5 text-[15px] text-[#4a4a4a] leading-[1.8]">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── GUIDER FOR DEG SOM GJØR DET SELV ──────────────────────────── */}
        {diyGuides.length > 0 ? (
          <section className="bg-white border-t border-black/[0.06]">
            <div className="max-w-[1160px] mx-auto px-6 sm:px-10 py-14 sm:py-20">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#6f6a60]">Kunnskapsbase</p>
              <h2 className="mt-2.5 text-[26px] sm:text-[34px] font-bold tracking-[-0.025em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                Guider for deg som gjør det selv
              </h2>
              <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {diyGuides.map((g) => (
                  <Link key={g.slug} href={`/guider/${g.slug}`} className="group bg-[#fdfcfb] rounded-2xl border border-black/[0.06] hover:border-[#d9c9f5] p-5 sm:p-6 flex flex-col transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-[#f4f0fb] text-[#7c3aed] text-[11px] font-semibold">{g.category}</span>
                      <span className="inline-flex items-center gap-1 text-[12px] text-[#6b665f]"><Clock className="w-3 h-3" /> {g.readMinutes} min</span>
                    </div>
                    <h3 className="mt-3 text-[16px] font-bold leading-snug group-hover:text-[#7c3aed] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{g.title}</h3>
                    <p className="mt-2 text-[13.5px] text-[#666] leading-relaxed flex-1">{stripMarkup(g.description).slice(0, 110)}…</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7c3aed]">Les guiden <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── AVSLUTTENDE CTA ───────────────────────────────────────────── */}
        <section className="max-w-[1160px] mx-auto px-6 sm:px-10 pb-16 sm:pb-24 pt-14 sm:pt-20">
          <div className="bg-[#0a0a0a] rounded-[32px] px-8 py-12 sm:px-14 sm:py-16 text-center">
            <h2 className="text-white text-[28px] sm:text-[40px] font-bold tracking-[-0.03em] leading-[1.1] text-balance" style={{ fontFamily: 'var(--font-heading)' }}>
              Klar til å leie ut selv?
            </h2>
            <p className="mt-4 text-[15.5px] sm:text-[17px] text-white/75 leading-relaxed max-w-[52ch] mx-auto">
              Legg inn adressen, signer med BankID og få annonsen ut på FINN. Du velger leietaker —
              vi holder orden på resten.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href={SELF_START_PATH} className="group inline-flex items-center gap-2 h-[54px] px-7 rounded-full bg-white text-[#0a0a0a] font-semibold text-[15.5px] hover:shadow-[0_12px_32px_-10px_rgba(255,255,255,0.35)] transition-all active:scale-[0.98]">
                Kom i gang i dag <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href={`tel:${site.phoneHref}`} className="inline-flex items-center gap-2 h-[54px] px-6 rounded-full border border-white/25 text-white font-semibold text-[15px] hover:bg-white/10 transition-colors">
                Ring {site.phone}
              </a>
            </div>
            <p className="mt-6 text-[12.5px] text-white/60">
              Tilgjengelig i hele Norge · Signering med BankID · Ingen bindingstid
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
