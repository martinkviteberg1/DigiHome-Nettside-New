/* ═══════════ OFFENTLIG TILBUDSSIDE — server-komponent ═══════════
   Verdensklasse 2026-praksis: data hentes fra MongoDB på serveren og
   HTML rendres komplett før første maling — ingen spinner, ingen
   klientside-fetch. Coveret ER førsteinntrykket.

   · Åpningssporing skjer server-side, men ALDRI for:
     – ?preview=1 (admin-forhåndsvisning i Salgsradar)
     – bots/lenke-forhåndsvisninger (iMessage, WhatsApp, Slack, crawlere)
       — ellers ville hver delte lenke talt som «åpnet av huseier».
   · robots noindex — tilbudssider er private og skal aldri i søkemotorer.
   · OG-metadata gjør delte lenker premium i meldingsapper.
   All UI/interaktivitet bor i ./TilbudClient.js. */

import { headers } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { hentTilbud } from '@/lib/salgsradar';
import TilbudClient from './TilbudClient';

export const dynamic = 'force-dynamic';

/* Lenke-forhåndsvisninger og crawlere skal aldri telle som åpninger */
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|twitterbot|linkedinbot|slackbot|discord|skypeuripreview|pinterest|vkshare|quora|bitly|snapchat|viber|iframely|embedly|preview/i;

const pent = (s) => String(s || '').toLowerCase().replace(/(^|[\s\-\/])([a-zæøå])/g, (m, f, b) => f + b.toUpperCase());

export async function generateMetadata({ params }) {
  const privat = { robots: { index: false, follow: false } };
  try {
    const db = await getDb();
    const t = await hentTilbud(db, String(params?.slug || ''));
    if (!t) return { title: 'DigiHome', ...privat };
    const adresse = pent(t.adresse || 'Boligen din');
    const base = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
    const bilde = (t.bilder || [])[0] || (base ? `${base}/brand/tilbud-cover-bergen.jpg` : null);
    return {
      title: `${adresse} — personlig utleievurdering · DigiHome`,
      description: `Konkret vurdering av utleiepotensialet for ${adresse}: anbefalt leie, presentasjon og hva du sitter igjen med hver måned.`,
      ...privat,
      openGraph: {
        title: `${adresse} — personlig utleievurdering`,
        description: 'DigiHome har gått gjennom annonsen og laget en konkret vurdering.',
        type: 'website',
        ...(bilde ? { images: [{ url: bilde }] } : {}),
      },
    };
  } catch (e) {
    return { title: 'DigiHome', ...privat };
  }
}

function IkkeFunnet() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FEFBFA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/digihome-wordmark-ink.svg" alt="DigiHome" style={{ height: 24, opacity: 0.9 }} />
      <p style={{ fontSize: 14, color: '#9A968F', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
        Fant ikke tilbudet. Lenken kan være utløpt — ta kontakt med oss, så sender vi en ny.
      </p>
    </div>
  );
}

export default async function TilbudSide({ params, searchParams }) {
  const slug = String(params?.slug || '');
  const erPreview = Boolean(searchParams && Object.prototype.hasOwnProperty.call(searchParams, 'preview'));
  const ua = headers().get('user-agent') || '';
  const erBot = BOT_RE.test(ua);

  let tilbud = null;
  try {
    const db = await getDb();
    tilbud = await hentTilbud(db, slug, { sporAapning: Boolean(slug) && !erPreview && !erBot });
  } catch (e) {
    // DB utilgjengelig → rolig feilside fremfor krasj
  }
  if (!tilbud) return <IkkeFunnet />;

  // JSON-rundtur garanterer serialiserbare props over server/klient-grensen
  return <TilbudClient tilbud={JSON.parse(JSON.stringify(tilbud))} slug={slug} />;
}
