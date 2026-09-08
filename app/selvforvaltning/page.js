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
    images: [{ url: site.url + '/og/selvforvaltning.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Selvforvaltning — leie ut boligen selv | DigiHome',
    description: 'Du velger leietaker. Annonse, kontrakt, depositumskonto og innkreving ligger i systemet.',
    images: [site.url + '/og/selvforvaltning.jpg'],
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
        <section className="e-shell pt-12 lg:pt-20 pb-4">
          <div className="grid lg:grid-cols-12 gap-x-14 gap-y-12 items-start">
            <div className="lg:col-span-7">
              {/* Én rolig linje i stedet for tre pastellmerker. Produktnavn og
                  dekningsområde er fakta leseren trenger — ikke pynt. */}
              <p className="e-label flex flex-wrap items-center gap-2.5">
                {SELF_PUBLIC_NAME}
                <span className="w-6 h-px bg-[#d6cfc4]" aria-hidden="true" />
                Hele Norge
              </p>

              <h1 className="e-display mt-6 text-[36px] sm:text-[50px] lg:text-[62px] max-w-[17ch]">
                Leie ut boligen selv — du velger leietaker, vi holder orden på resten
              </h1>

              <p className="e-lead mt-7 max-w-[54ch]">
                Selvforvaltning er DigiHome uten forvalteren. Du holder visningene og bestemmer
                hvem som får boligen. FINN-annonsen, leiekontrakten, depositumskontoen og
                husleieinnkrevingen ligger i samme system som forvaltningsboligene våre — du
                styrer det bare selv.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href={SELF_START_PATH} className="group e-btn e-btn-dark">
                  Registrer boligen
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#hvem-gjor-hva" className="e-btn e-btn-ghost">
                  Se hva som er inkludert
                </a>
              </div>

              {/* Tre fakta uten ikoner: hakene i grønt hørte til et annet
                  fargespråk, og et ikon per punkt er nettopp den slitasjen
                  siden skulle bli kvitt. */}
              <div className="e-rule mt-9 pt-5 flex flex-wrap items-center gap-x-3 gap-y-2 e-meta">
                <span>Signering med BankID</span>
                <span className="w-1 h-1 rounded-full bg-[#c2bab0]" aria-hidden="true" />
                <span>Depositum på sperret konto</span>
                <span className="w-1 h-1 rounded-full bg-[#c2bab0]" aria-hidden="true" />
                <span>Ingen bindingstid</span>
              </div>
            </div>

            {/* Produktflate, ikke priskort: det første leseren ser skal være hva
                hen faktisk får tilgang til. Radene speiler katalogens
                inkludert-liste, og kortet er merket som illustrasjon. */}
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <div className="bg-white rounded-[8px] border border-[#e6e1d9] shadow-[0_26px_74px_-40px_rgba(0,0,0,0.28)] overflow-hidden">
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
          <div className="relative flex items-baseline gap-4">
            <span className="e-index xl:absolute xl:-left-[52px] xl:top-[2px]">01</span>
            <span className="e-label">Arbeidsdelingen</span>
          </div>
          <div className="e-rule mt-4 pt-8 sm:pt-10 grid lg:grid-cols-12 gap-x-10 gap-y-5 items-end">
            <h2 className="e-h2 lg:col-span-7 max-w-[18ch]">Hvem gjør hva.</h2>
            <p className="e-lead lg:col-span-5 lg:pb-1.5 max-w-[44ch]">
              Systemet er det samme som forvaltningskundene våre bruker. Forskjellen er
              arbeidsdelingen: du tar den delen som krever at et menneske møter opp.
            </p>
          </div>

          {/* To hårfine lister i stedet for kort med lilla ikonfirkanter. Ikon per
              punkt tilførte ingen informasjon — det gjorde bare at seks like
              rader så ut som noe en mal hadde generert. */}
          <div className="mt-12 sm:mt-16 grid lg:grid-cols-2 gap-x-14 gap-y-12 items-start">
            <div>
              <p className="e-label">DigiHome leverer</p>
              <div className="e-rule e-hair mt-4">
                {self.included.map((item) => (
                  <p key={item} className="py-3.5 text-[15px] text-[#0a0a0a]">{item}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="e-label">Du gjør selv</p>
              <div className="e-rule e-hair mt-4">
                {self.notIncluded.map((item) => {
                  const hint = hintFor(item);
                  return (
                    <div key={item} className="py-3.5">
                      <p className="text-[15px] text-[#0a0a0a]">{item}</p>
                      {hint ? <p className="e-meta mt-1">{hint}</p> : null}
                    </div>
                  );
                })}
              </div>
              <p className="e-meta mt-4 max-w-[44ch]">
                Vi sier det rett ut, for det er her forskjellen mellom selvforvaltning og full
                forvaltning ligger.
              </p>
            </div>
          </div>

          {/* Én mørk stripe med begge veiene videre for den som ikke vil gjøre
              alt selv — i stedet for et eget tilleggskort med pris i tittelen. */}
          <div className="mt-14 bg-[#0a0a0a] rounded-[8px] p-7 sm:p-10 lg:p-12 text-white grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-14">
            <div>
              <h3 className="e-h3 !text-white text-[21px] sm:text-[25px] max-w-[22ch]">
                Vil du ikke holde visningene selv?
              </h3>
              <p className="mt-4 text-[15px] text-white/75 leading-[1.7] max-w-[46ch]">
                Vi kan møte kandidatene for deg. Du bestemmer fortsatt hvem som får boligen — vi
                stiller bare opp med nøkkelen.
              </p>
              {visning ? (
                <p className="mt-4 text-[13.5px] text-white/70">
                  Visningshjelp: {fmtNok(visning.price)} kr per visning.
                </p>
              ) : null}
            </div>
            <div className="lg:border-l lg:border-white/15 lg:pl-12">
              <p className="text-[14.5px] text-white/75 leading-[1.7]">
                Skal vi ta <em>hele</em> jobben — visninger, befaring, vedlikehold og en dedikert
                forvalter — er det full forvaltning du vil ha. Den tilbys i Bergen og omegn.
              </p>
              <Link href="/forvaltning" className="mt-6 inline-flex items-center gap-2 text-[14.5px] font-semibold text-[#d298ff] hover:text-white transition-colors">
                Se full forvaltning <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── SLIK KOMMER DU I GANG ─────────────────────────────────────── */}
        <section className="bg-white border-y border-[#e6e1d9]">
          <div className="e-shell e-section">
            <div className="relative flex items-baseline gap-4">
              <span className="e-index xl:absolute xl:-left-[52px] xl:top-[2px]">02</span>
              <span className="e-label">Oppstart</span>
            </div>
            <div className="e-rule mt-4 pt-8 sm:pt-10">
              <h2 className="e-h2 max-w-[18ch]">Slik kommer du i gang.</h2>
            </div>

            <div className="mt-10 sm:mt-12 e-rule e-hair">
              {steps.map((s, i) => (
                <div key={s.t} className="grid lg:grid-cols-12 gap-x-10 gap-y-2 py-6 sm:py-8">
                  <p className="e-display e-num lg:col-span-1 text-[26px] sm:text-[32px] !text-[#c2bab0]">0{i + 1}</p>
                  <h3 className="e-h3 lg:col-span-4">{s.t}</h3>
                  <p className="e-body lg:col-span-7 max-w-[60ch]">{s.d}</p>
                </div>
              ))}
            </div>

            <Link href={SELF_START_PATH} className="group mt-10 e-btn e-btn-dark">
              Registrer boligen <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* ── PRIS ──────────────────────────────────────────────────────── */}
        {/* Prisen står samlet på ett sted, etter at leseren har sett hva
            produktet faktisk er. Tallene kommer fra tjenestekatalogen, så siden
            kan aldri vise noe annet enn priskalkulatoren. */}
        <section id="pris" className="e-shell e-section scroll-mt-24">
          <div className="relative flex items-baseline gap-4">
            <span className="e-index xl:absolute xl:-left-[52px] xl:top-[2px]">03</span>
            <span className="e-label">Pris</span>
          </div>
          <div className="e-rule mt-4 pt-8 sm:pt-12 grid lg:grid-cols-12 gap-x-16 gap-y-10 items-start">
            <div className="lg:col-span-6">
              <h2 className="e-h2 max-w-[14ch]">Hva det koster.</h2>
              <p className="e-lead mt-6 max-w-[44ch]">
                Honoraret følger leien: {self.pct} % av husleien
                {self.minMonthly
                  ? `, med en minstepris på ${fmtNok(self.minMonthly)} kr per måned. Ingen oppstartskostnad og ingen bindingstid.`
                  : '. Ingen minstepris, ingen oppstartskostnad og ingen bindingstid.'}
              </p>
              {self.minMonthly ? (
                <p className="e-meta mt-4">
                  Minsteprisen slår inn under {fmtNok(threshold)} kr i månedsleie.
                </p>
              ) : null}
              <Link href="/priskalkulator" className="mt-8 e-btn e-btn-ghost e-btn-sm">
                <Calculator className="w-4 h-4" /> Regn ut for din bolig
              </Link>
            </div>
            <div className="lg:col-span-6 lg:pl-14 lg:border-l lg:border-[#e6e1d9]">
              <p className="e-label">Eksempler</p>
              <div className="mt-4 e-rule e-hair">
                {examples.map((e) => (
                  <div key={e.rent} className="flex items-center justify-between gap-4 py-3.5 text-[14.5px]">
                    <span className="text-[#6f6a60]">{fmtNok(e.rent)} kr/mnd i leie</span>
                    <span className="font-semibold e-num">{fmtNok(e.fee)} kr/mnd</span>
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
            <div className="relative flex items-baseline gap-4">
              <span className="e-index xl:absolute xl:-left-[52px] xl:top-[2px]">04</span>
              <span className="e-label">Sammenligning</span>
            </div>
            <div className="e-rule mt-4 pt-8 sm:pt-10 grid lg:grid-cols-12 gap-x-10 gap-y-5 items-end">
              <h2 className="e-h2 lg:col-span-7 max-w-[20ch]">Selvforvaltning eller full forvaltning?</h2>
              <p className="e-lead lg:col-span-5 lg:pb-1.5 max-w-[44ch]">
                Forskjellen er ikke kvaliteten på systemet — det er det samme. Forskjellen er hvor
                mye du selv vil gjøre.
              </p>
            </div>

            {/* En ekte tabell med hårfine linjer, ikke et avrundet kort med
                lilla kolonnetint. Haker i blekk: grønt og lilla hørte til et
                annet fargespråk og ga tabellen tre aksenter for mye. */}
            <div className="mt-12 sm:mt-16 overflow-hidden">
              <div className="grid grid-cols-[1.15fr_1fr_1fr] sm:grid-cols-[1.6fr_1fr_1fr] border-t border-b border-[#d6cfc4]">
                <div className="px-1 sm:px-2 py-4" />
                <div className="px-2.5 sm:px-5 py-4 text-center bg-[#f6f3ee]">
                  <p className="text-[13.5px] sm:text-[15px] font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Selvforvaltning</p>
                  <p className="e-label mt-1.5">Du gjør visningene</p>
                </div>
                <div className="px-2.5 sm:px-5 py-4 text-center">
                  <p className="text-[13.5px] sm:text-[15px] font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Full forvaltning</p>
                  <p className="e-label mt-1.5">Vi gjør alt</p>
                </div>
              </div>

              {compareRows.map((r, i) => {
                const cell = (v, isSelf) => {
                  if (v === true) return <Check className="w-[17px] h-[17px] mx-auto text-[#0a0a0a]" strokeWidth={2.4} />;
                  if (v === false) return <Minus className="w-[17px] h-[17px] mx-auto text-[#c2bab0]" strokeWidth={2.2} />;
                  return <span className={`text-[12.5px] sm:text-[14px] leading-snug ${isSelf ? 'font-semibold text-[#0a0a0a]' : 'text-[#6f6a60]'}`}>{v}</span>;
                };
                return (
                  <div key={r.label} className={`grid grid-cols-[1.15fr_1fr_1fr] sm:grid-cols-[1.6fr_1fr_1fr] items-center ${i < compareRows.length - 1 ? 'border-b border-[#e6e1d9]' : 'border-b border-[#d6cfc4]'}`}>
                    <div className="px-1 sm:px-2 py-4 text-[12.5px] sm:text-[14.5px] text-[#3a3733] leading-snug">{r.label}</div>
                    <div className="px-2.5 sm:px-5 py-4 text-center bg-[#f6f3ee]">{cell(r.self, true)}</div>
                    <div className="px-2.5 sm:px-5 py-4 text-center">{cell(r.full, false)}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={SELF_START_PATH} className="group e-btn e-btn-dark">
                Start med selvforvaltning <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/bli-utleier" className="e-btn e-btn-ghost">
                Få tilbud på full forvaltning
              </Link>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="e-shell e-section">
          <div className="grid lg:grid-cols-12 gap-x-14 gap-y-10">
            <div className="lg:col-span-4">
              <div className="relative flex items-baseline gap-4">
                <span className="e-index xl:absolute xl:-left-[52px] xl:top-[2px]">05</span>
                <span className="e-label">Spørsmål og svar</span>
              </div>
              <h2 className="e-h2 mt-6 max-w-[16ch]">Det folk spør om.</h2>
            </div>
            <div className="lg:col-span-8 e-faq e-rule e-hair">
              {faqs.map((f) => (
                <details key={f.q} name="sf-faq" className="group">
                  <summary className="flex items-start justify-between gap-6 cursor-pointer py-5 select-none">
                    <h3 className="e-h3 text-[17px] sm:text-[19px] pr-2">{f.q}</h3>
                    <span className="e-faq-sign mt-2" aria-hidden="true" />
                  </summary>
                  <p className="e-body pb-6 pr-10 max-w-[62ch]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── GUIDER FOR DEG SOM GJØR DET SELV ──────────────────────────── */}
        {diyGuides.length > 0 ? (
          <section className="bg-white border-t border-[#e6e1d9]">
            <div className="e-shell e-section">
              <div className="relative flex items-baseline gap-4">
                <span className="e-index xl:absolute xl:-left-[52px] xl:top-[2px]">06</span>
                <span className="e-label">Kunnskapsbase</span>
              </div>
              <div className="e-rule mt-4 pt-8 sm:pt-10">
                <h2 className="e-h2 max-w-[20ch]">Guider for deg som gjør det selv.</h2>
              </div>

              {/* Fire guider som en innholdsfortegnelse. Kort med pilleformede
                  kategorimerker sa mindre enn tittelen gjør alene. */}
              <div className="mt-10 e-rule e-hair">
                {diyGuides.map((g) => (
                  <Link key={g.slug} href={`/guider/${g.slug}`} className="group grid lg:grid-cols-12 gap-x-10 gap-y-1.5 py-5 sm:py-6 items-baseline">
                    <p className="e-label lg:col-span-2">{g.category}</p>
                    <h3 className="e-h3 lg:col-span-5 text-[17px] sm:text-[20px] transition-colors duration-300 group-hover:text-[#7c3aed]">{g.title}</h3>
                    <p className="e-meta lg:col-span-4 max-w-[46ch]">{stripMarkup(g.description).slice(0, 96)}…</p>
                    <p className="e-meta lg:col-span-1 lg:text-right whitespace-nowrap">{g.readMinutes} min</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── AVSLUTTENDE CTA ───────────────────────────────────────────── */}
        <section className="bg-[#0a0a0a] text-white">
          <div className="e-shell e-section">
            <span className="e-label !text-white/55">Kom i gang</span>
            <h2 className="e-display !text-white mt-6 text-[34px] sm:text-[50px] lg:text-[58px] max-w-[18ch]">
              Klar til å leie ut selv?
            </h2>
            <p className="mt-6 text-[16px] sm:text-[18px] text-white/70 leading-[1.62] max-w-[52ch]">
              Legg inn adressen, signer med BankID og få annonsen ut på FINN. Du velger leietaker —
              vi holder orden på resten.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href={SELF_START_PATH} className="group e-btn e-btn-light">
                Registrer boligen <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href={`tel:${site.phoneHref}`} className="e-btn e-btn-ghost !border-white/25 !text-white hover:!border-white">
                Ring {site.phone}
              </a>
            </div>
            <p className="mt-12 pt-6 border-t border-white/12 text-[12.5px] text-white/55">
              Tilgjengelig i hele Norge · Signering med BankID · Ingen bindingstid
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
