# DigiHome — Integrasjonskontrakt (markedssiden ↔ plattform)

**Én kilde til sannhet** for closed-loop-integrasjonen mellom `digihome-marketing`
(annonser/attribusjon/CAPI) og DigiHome-plattformen (CRM/kontrakter).
Versjon: 1.0 · Vedlikeholdes av marketing-agenten. Endringer koordineres i broen (thread `integration-contract`).

---

## 1. Kanaler & auth

| Kanal | URL | Auth |
|---|---|---|
| Agent-bro (koordinering) | `GET/POST /api/agent-bridge` | `?token=<AGENT_BRIDGE_SECRET>` eller header `x-bridge-token` |
| Lead-forward (marketing → plattform) | `POST {DIGIHOME_API_URL}/api/leads` og `/api/tenants` | header `X-API-Key: <DIGIHOME_API_KEY>` |
| Won/lost-webhook (plattform → marketing) | `POST {MARKETING}/api/webhooks/lead-status` | `X-Webhook-Secret` **eller** `Authorization: Bearer` **eller** `?secret=` = `<LEAD_SYNC_SECRET>` |
| Markedsmetrikker (plattform leser) | `GET {MARKETING}/api/admin/marketing-metrics` | bro-token |
| Suppression/audience (plattform/byrå leser) | `GET {MARKETING}/api/admin/audiences/*` | admin `?key=` |

> `{MARKETING}` = `https://hero-premiere-4.preview.emergentagent.com` (preview) / prod-URL.

## 2. Meldingskonvolutt (agent-bro)

```json
{
  "threadId": "closed-loop | world-class | integration-contract | weekly-report",
  "from": "marketing | platform",
  "type": "question | answer | proposal | ack | test | spec | status",
  "subject": "kort tittel",
  "body": "fritekst",
  "data": { "…strukturert nyttelast…" },
  "id": "uuid (idempotens)",
  "createdAt": "ISO-8601"
}
```

## 3. Lead-forward (marketing → plattform)

`POST /api/leads` og `/api/tenants` inneholder nå:

| Felt | Type | Beskrivelse |
|---|---|---|
| `external_ref` | string | **Vår lead-id. NØKKEL for won/lost-webhook tilbake.** |
| `source_system` | string | Alltid `"digihome-marketing"` |
| `lead_source_type` | enum | `paid` \| `paid_social` \| `organic` \| `social` \| `email` \| `referral` \| `direct` \| `manual` |
| `is_paid` | boolean | true hvis betalt kanal eller betalt klikk-ID |
| `marketing_visitor_id` | string | Vår førsteparts visitor-id (**for cross-system stitching**) |
| `attribution` | object | utm_*, gclid/gbraid/wbraid, fbclid, fbp/fbc, msclkid, ga_client_id, channel, referrer, landing_page, campaign, content, term |
| `name, email, phone, …` | | kontakt + eiendoms-/leietakerfelt |

**Plattformen bør:** lagre `external_ref`, `marketing_visitor_id`, `attribution`, `lead_source_type`, `is_paid` på lead/kunde.

## 4. Status-webhook (plattform → marketing) — HELE livssyklusen

Send **hvert** statusskifte (ikke bare won). Body:

```json
{
  "external_ref": "<vår lead-id>",
  "status": "contacted | qualified | viewing_booked | contract_sent | won | lost",
  "value": 24000,                // ved won: total kontraktsverdi (NOK)
  "currency": "NOK",
  "at": "ISO-8601",
  "lost_reason": "spam | out_of_area | not_serious | no_response | duplicate | other",  // KUN ved lost
  "platform_customer_id": "<deres kunde-id>",   // for stitching + ack
  "platform_conversion_id": "<deres CAPI/offline konverterings-id>" // valgfri ack
}
```

### 4.1 Marketing-side automatikk pr. status (samtykke-gated)

| status | Meta CAPI | Google offline | GA4 MP | Merknad |
|---|---|---|---|---|
| `contacted` | `Contact` | — | — | mid-funnel-signal |
| `qualified` | `QualifiedLead` | — | — | mid-funnel-signal |
| `viewing_booked` | `Schedule` *(planlagt)* | — | — | verdivektet |
| `contract_sent` | `SubmitApplication` *(planlagt)* | — | — | verdivektet |
| `won` | `Purchase` (value) | offline-konvertering (gclid) | `purchase` (value) | **closed-loop** |
| `lost` | — | (evt. neg. audience) | — | lost_reason → kvalitetsstyring |

Alle events er **idempotente** pr. stadium (event_id = `<status>-<external_ref>`).

## 5. Verdivekter (event value) — forslag til samkjøring

For at Meta/Google skal optimalisere mot signerte kunder, ikke bare volum:

| Event | Foreslått verdivekt |
|---|---|
| Lead | 1 |
| QualifiedLead | 4 |
| viewing_booked | 8 |
| contract_sent | 15 |
| **won** | **faktisk kontraktsverdi (NOK)** |

## 6. KPI-definisjoner (må bety det samme begge veier)

- **Lead** = innsendt skjema (marketing) / opprettet lead (CRM).
- **Qualified** = CRM har verifisert at leadet er seriøst og innenfor nedslagsfelt.
- **Won** = signert kontrakt. `value` = total kontraktsverdi (ikke månedlig).
- **CAC** = annonsekost / antall won. **ROAS** = won-verdi / annonsekost. **LTV** = forventet levetidsverdi pr. won.

## 7. Suppression & audiences (marketing eksponerer)

`GET /api/admin/audiences/suppression?key=…` → SHA-256-hashede won-kunder (e-post + tlf) klare for:
- **Meta Custom Audience** (eksklusjon) + **Lookalike seed** (won).
- **Google Customer Match** (eksklusjon + similar).

Kun samtykkede kontakter inkluderes. Formål: slutt å annonsere til allerede signerte kunder → kutt bortkastet forbruk.

## 8. Åpne punkter (koordineres i broen)

1. Plattformen setter identisk `LEAD_SYNC_SECRET` + redeployer (401→404 sett; nesten i mål).
2. Plattformen sender **hele livssyklusen** + `lost_reason` + `platform_customer_id`.
3. Enighet om **verdivekter** (§5).
4. Eierskap til annonsekontoer (in-house vs. byrå) → avgjør auto-push av audiences.
