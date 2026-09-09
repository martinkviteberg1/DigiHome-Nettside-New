import Link from 'next/link';
import NavV4 from '@/components/forside/v4/NavV4';
import FooterV4 from '@/components/forside/v4/FooterV4';
import AvslutningSeksjon from '@/components/forside/v4/AvslutningSeksjon';
import LedigeGrid, { Siffer } from '@/components/forside/v4/boliger/LedigeGrid';
import { T, display } from '@/components/forside/v4/tokens';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';
import { site } from '@/lib/site';
import { getPublishedListingsResult } from '@/lib/listings-server';
import { ArrowUpRight } from 'lucide-react';

// LEDIGE BOLIGER — offentlig boligflate.
//
// Server-rendret med vilje: boligene skal ligge i HTML-en for Google og
// AI-crawlere (langhalen «leilighet til leie Sandviken» er trafikk vi i dag gir
// bort til FINN). Filtrene er klientside oppe på den ferdige lista.
//
// Kun boliger som er BÅDE publiseringsklare og satt synlige i adminportalen
// vises. Innlogget admin kan legge til ?forhandsvis=1 for å se upubliserte
// kandidater — adminnøkkelen leses fra localStorage, aldri fra URL-en.
//
// ALLTID FERSK (force-dynamic, ikke ISR): med `revalidate` ble siden bygget
// i CI uten databasetilgang, og den tomme «Alle boligene er utleid»-versjonen
// lå i cachen til første regenerering etter hver deploy — så første besøkende
// (og Google) fikk en side som løy om at ingenting var ledig, mens forsiden
// (klient-fetch mot /api/public/properties) viste sju ledige. Ett indeksert
// Mongo-oppslag per visning er billig; en falsk «utleid»-side er dyr.

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ledige boliger til leie',
  description: 'Ledige utleieboliger forvaltet gjennom DigiHome — kredittsjekk, kontrakt med BankID og depositum i én løsning. Se ledige boliger, meld interesse og få beskjed før neste bolig annonseres.',
  alternates: { canonical: '/ledige-boliger' },
  twitter: { card: 'summary_large_image', images: ['/og/ledige-boliger.jpg'] },
  openGraph: {
    title: 'Ledige boliger til leie | DigiHome',
    description: 'Se ledige utleieboliger. Meld interesse direkte, eller få beskjed før neste bolig annonseres.',
    url: `${site.url}/ledige-boliger`, type: 'website', locale: 'nb_NO',
    images: [{ url: site.url + '/og/ledige-boliger.jpg', width: 1200, height: 630 }],
  },
};

const HAIR = 'rgba(21,19,15,0.12)';
const pen = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');

export default async function LedigeBoligerPage() {
  const { ok: dbOk, listings } = await getPublishedListingsResult();
  const ledige = listings.filter((l) => l.status === 'active');
  const omrader = [...new Set(ledige.map((l) => l.district).filter(Boolean))];
  const belop = ledige.map((l) => Number(l.rentAmount) || 0).filter(Boolean);
  const fra = belop.length ? Math.min(...belop) : null;
  const byer = [...new Set(ledige.map((l) => l.city).filter(Boolean))];

  const itemList = ledige.length ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Ledige boliger til leie',
    numberOfItems: ledige.length,
    itemListElement: ledige.map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site.url}/ledige-boliger/${l.slug}`, name: l.title })),
  } : null;

  /* Tre stille tall under overskriften — det boligsøkeren vil vite først */
  const tallrad = [
    ['Ledige nå', ledige.length ? String(ledige.length) : '—'],
    ['Fra', fra ? <><Siffer v={pen(fra)} /><span className="text-[0.55em]" style={{ color: 'rgba(21,19,15,0.5)', letterSpacing: 0 }}> kr/mnd</span></> : '—'],
    ['Områder', omrader.length ? String(omrader.length) : (byer.length ? String(byer.length) : '—')],
  ];

  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="ledige-v4">
      <NavV4 />
      <JsonLd data={breadcrumbLd([{ name: 'Ledige boliger', path: '/ledige-boliger' }])} />
      <JsonLd data={webPageLd({
        name: 'Ledige boliger til leie',
        description: 'Ledige utleieboliger forvaltet gjennom DigiHome. Meld interesse direkte eller få beskjed før neste bolig annonseres.',
        path: '/ledige-boliger',
        type: 'CollectionPage',
      })} />
      {itemList && <JsonLd data={itemList} />}

      <main>
        {/* Hero: label, én påstand i display, én setning — og tre tall på en hårlinje. Ingen by i overskriften:
            boligene sier selv hvor de er. */}
        <section className="mx-auto w-full max-w-[1360px] px-5 pb-10 pt-10 sm:px-8 sm:pt-16 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-14 lg:pt-20" data-testid="ledige-hero">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
            <div className="lg:col-span-7">
              <p className="dh-cover-inn text-[14.5px] font-medium" style={{ color: 'rgba(21,19,15,0.55)' }}>Ledige boliger</p>
              <h1 className="dh-cover-inn mt-4 text-[clamp(48px,7vw,112px)]" style={{ ...display, color: T.ink, animationDelay: '.04s' }} data-testid="ledige-h1">
                Ledig nå<span style={{ color: T.lilla }}>.</span>
              </h1>
            </div>
            <div className="lg:col-span-4 lg:col-start-9 lg:pb-3">
              <p className="dh-cover-inn max-w-[40ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: 'rgba(21,19,15,0.64)', animationDelay: '.1s' }} data-testid="ledige-ingress">
                {ledige.length > 0
                  ? <>Boliger som leies ut gjennom DigiHome. Kredittsjekk, kontrakt med BankID og depositum i én løsning — meld interesse direkte, så svarer vi samme dag.</>
                  : dbOk
                    ? <>Alt er utleid akkurat nå. Nye boliger kommer fortløpende — legg inn e-posten din, så sier vi fra før neste annonseres.</>
                    : <>Vi fikk ikke hentet boligene akkurat nå. Last siden på nytt om et øyeblikk — eller legg inn e-posten din, så sier vi fra når noe blir ledig.</>}
              </p>
              <p className="dh-cover-inn mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14.5px]" style={{ animationDelay: '.16s' }}>
                <Link href="/bli-leietaker" className="inline-flex items-center gap-1.5 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:decoration-[#15130F]" style={{ color: T.ink }} data-testid="ledige-slik">Slik leier du gjennom oss <ArrowUpRight className="h-4 w-4" strokeWidth={1.6} /></Link>
              </p>
            </div>
          </div>
          <dl className="dh-cover-inn mt-10 grid grid-cols-3 gap-6 border-t pt-5 sm:mt-14 lg:gap-10" style={{ borderColor: HAIR, animationDelay: '.22s' }} data-testid="ledige-tall">
            {tallrad.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[13px]" style={{ color: 'rgba(21,19,15,0.5)' }}>{k}</dt>
                <dd className="mt-1.5 text-[clamp(22px,2.4vw,34px)] tabular-nums" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.ink }}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto w-full max-w-[1360px] px-5 pb-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28">
          <LedigeGrid listings={listings} dbOk={dbOk} />
        </section>

        {/* Utleier? Samme avslutning som resten av siden — én setning, én handling. */}
        <AvslutningSeksjon
          tittel="Har du en bolig å leie ut"
          under="Vi finner leietakeren og tar alt etterpå — eller du gjør det selv, med systemet som tar rutinen."
          handling={{ knapp: { href: '/bli-utleier', tekst: 'Bli utleier' }, lenke: { href: '/priser', tekst: 'Se priser' } }}
        />
      </main>
      <FooterV4 />
    </div>
  );
}
