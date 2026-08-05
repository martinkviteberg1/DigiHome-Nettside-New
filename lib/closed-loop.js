// ---------------------------------------------------------------------------
// LUKKET SLØYFE — send utfallet tilbake til annonseplattformene.
//
// Denne logikken fantes tidligere i TO nesten identiske kopier i route.js: én
// for admin-ruten (/admin/lead-status) og én for plattform-webhooken
// (/webhooks/lead-status). Kopiene hadde allerede kommet i utakt — webhook-veien
// hadde idempotenssjekk og allowAdConversions-vakt, admin-veien hadde ikke.
// Én kilde til sannhet fjerner den klassen av feil.
//
// Viktigste designvalg: vi logger ALLTID et utfall, også når vi hopper av.
// Tidligere gjorde Google-grenen ingenting i stillhet når gclid manglet, og da
// ser konverteringshandlingen «Vunnet utleier» ut som en ødelagt integrasjon
// (0 konverteringer) — mens sannheten var at ingen vunne leads hadde klikk-ID.
// Årsakene krever helt ulike tiltak, så de må være synlige.
// ---------------------------------------------------------------------------

import { sendMetaCapiEvent, metaCapiConfigured } from '@/lib/meta-capi';
import { dataManagerConfigured, ingestOfflineConversion } from '@/lib/google-ads-datamanager';
import { ga4MpConfigured, sendGa4Purchase } from '@/lib/ga4-mp';
import { isSyntheticLead, resolveSkipReason } from '@/lib/closed-loop-reasons';

// Samtykke: kun eksplisitt «nei» blokkerer. Mangler valget, regnes det som
// tillatt (leadet har selv sendt inn skjemaet med vilkårene).
export function marketingAllowed(consent) {
  return consent !== false;
}

async function mark(db, coll, id, field, value) {
  try { await db.collection(coll).updateOne({ id }, { $set: { [field]: value } }); } catch (e) { /* best-effort */ }
}

/**
 * Sender Purchase/offline-konvertering til Meta, Google Ads og GA4 når et lead
 * vinnes. Idempotent: et signal som allerede er sendt OK, sendes ikke igjen.
 *
 * @returns {{meta: object|null, google: object|null, ga4: object|null}}
 */
export async function recordWonConversions({ db, coll, lead, update = {}, nowIso, allowAdConversions = true } = {}) {
  const out = { meta: null, google: null, ga4: null };
  if (!db || !coll || !lead || !lead.id) return out;
  const at = nowIso || new Date().toISOString();
  const id = lead.id;
  const att = lead.attribution || {};
  const consentOk = marketingAllowed(lead.marketingConsent);
  const defaultValue = Number(process.env.GOOGLE_ADS_DEFAULT_LEAD_VALUE) || 0;
  // Prober og QA-leads skal aldri nå annonseplattformene. Uten denne vakten
  // legger én testkjøring en falsk Purchase inn i Metas optimalisering.
  const synthetic = isSyntheticLead(lead);
  const hasClickId = !!(att.gclid || att.gbraid || att.wbraid);
  const skip = {
    meta: resolveSkipReason('meta', { allowAdConversions, configured: metaCapiConfigured(), consentOk, synthetic }),
    google: resolveSkipReason('google', { allowAdConversions, configured: dataManagerConfigured(), consentOk, hasClickId, synthetic }),
    ga4: resolveSkipReason('ga4', { allowAdConversions: true, configured: ga4MpConfigured(), consentOk, synthetic }),
  };

  // --- Meta CAPI: Purchase --------------------------------------------------
  if (!(lead.metaCapiWon && lead.metaCapiWon.ok)) {
    if (!skip.meta) {
      try {
        const capi = await sendMetaCapiEvent({
          eventName: 'Purchase',
          eventId: `won-${id}`, // samme event_id fra begge veier → Meta dedupliserer
          eventTime: update.wonAt || at,
          actionSource: 'system_generated',
          email: lead.email, phone: lead.phone, fullName: lead.name,
          fbp: att.fbp, fbc: att.fbc, fbclid: att.fbclid,
          externalId: att.visitorId, zip: lead.postal_code, country: 'no',
          value: update.wonValue || defaultValue || undefined,
          currency: update.wonCurrency || 'NOK',
          customData: { content_name: lead.lead_type || 'lead', lead_event_id: id },
        });
        out.meta = { ok: capi.ok, error: capi.ok ? undefined : capi.error };
        await mark(db, coll, id, 'metaCapiWon', { ok: capi.ok, at, error: capi.ok ? null : (capi.error || null) });
      } catch (e) {
        out.meta = { ok: false, error: e.message };
        await mark(db, coll, id, 'metaCapiWon', { ok: false, at, error: e.message });
      }
    } else {
      out.meta = { ok: false, skipped: true, reason: skip.meta };
      await mark(db, coll, id, 'metaCapiWon', { ok: false, skipped: true, reason: skip.meta, at });
    }
  }

  // --- Google Ads: offline-konvertering («Vunnet utleier») ------------------
  if (!(lead.googleAdsWon && lead.googleAdsWon.ok)) {
    if (!skip.google) {
      try {
        const up = await ingestOfflineConversion({
          gclid: att.gclid, gbraid: att.gbraid, wbraid: att.wbraid,
          value: update.wonValue || defaultValue,
          currency: update.wonCurrency || 'NOK',
          at: update.wonAt || at,
          transactionId: id,
        });
        out.google = { ok: up.ok, requestId: up.requestId || null };
        await mark(db, coll, id, 'googleAdsWon', { ok: up.ok, at, requestId: up.requestId || null, error: null });
      } catch (e) {
        out.google = { ok: false, error: e.message };
        await mark(db, coll, id, 'googleAdsWon', { ok: false, at, error: e.message });
      }
    } else {
      out.google = { ok: false, skipped: true, reason: skip.google };
      await mark(db, coll, id, 'googleAdsWon', { ok: false, skipped: true, reason: skip.google, at });
    }
  }

  // --- GA4 Measurement Protocol: purchase ----------------------------------
  if (!(lead.ga4Won && lead.ga4Won.ok)) {
    if (!skip.ga4) {
      try {
        const g = await sendGa4Purchase({
          clientId: att.ga_client_id || att.visitorId || lead.marketing_visitor_id,
          userId: lead.marketing_visitor_id || undefined,
          value: update.wonValue || 0,
          currency: update.wonCurrency || 'NOK',
          transactionId: id,
          params: { lead_source_type: lead.lead_source_type || undefined, campaign: att.campaign || undefined },
        });
        out.ga4 = { ok: g.ok, status: g.status || null, skipped: !!g.skipped };
        // GA4 hopper av uten klient-ID. Det er et helt annet problem enn en
        // API-feil, så det skal ikke vises som rødt i admin.
        await mark(db, coll, id, 'ga4Won', g.skipped
          ? { ok: false, skipped: true, reason: g.reason || 'mangler_ga4_klient_id', at }
          : { ok: g.ok, at, status: g.status || null, error: g.ok ? null : (g.error || null) });
      } catch (e) {
        out.ga4 = { ok: false, error: e.message };
        await mark(db, coll, id, 'ga4Won', { ok: false, at, error: e.message });
      }
    } else {
      out.ga4 = { ok: false, skipped: true, reason: skip.ga4 };
      await mark(db, coll, id, 'ga4Won', { ok: false, skipped: true, reason: skip.ga4, at });
    }
  }

  return out;
}
