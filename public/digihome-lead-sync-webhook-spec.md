# DigiHome – Webhook-spesifikasjon: to-veis lead-status-sync

**For utviklerne av DigiHome-plattformen (selve appen / CRM-et).**
**Versjon:** 1.0 · Sist oppdatert: feb 2026

---

## 1. Hva dette er

Markedssiden (`digihome.no`) sender alle leads til plattformen. For å lukke
sløyfen mot Google Ads (offline-konvertering / ROAS) trenger vi at plattformen
sender oss tilbake **statusendringer** når et lead følges opp og til slutt
**vinnes eller tapes**.

Når et lead settes til `won` med en kontraktsverdi, kan vi rapportere
konverteringen tilbake til Google Ads med riktig `gclid` og kroneverdi.
Det er dette som gjør annonsekontoen i stand til å optimalisere mot faktiske
kunder, ikke bare skjema-innsendinger.

```
   Markedsside  ──(lead + external_ref)──▶  DigiHome-plattform (oppfølging)
        ▲                                            │
        └────────(status-webhook: won/lost/…)────────┘
```

---

## 2. Endepunkt

```
POST https://digihome.no/api/webhooks/lead-status
Content-Type: application/json
X-Webhook-Secret: <DELT HEMMELIGHET>
```

> **Test/preview-miljø:** `https://bli-utleier-redesign.preview.emergentagent.com/api/webhooks/lead-status`

### Autentisering
- Send headeren **`X-Webhook-Secret`** med den delte hemmeligheten.
- Hemmeligheten deles **separat i en sikker kanal** (ikke i dette dokumentet, ikke på e-post i klartekst).
- Feil eller manglende secret → `401 { "ok": false, "error": "Uautorisert" }`.

---

## 3. Hvordan koble et lead til riktig rad (matching)

Når markedssiden sender et lead til plattformen, legger vi alltid ved feltet
**`external_ref`** (= vår interne lead-id) samt `source_system: "digihome-marketing"`.

> 👉 **Anbefaling:** Lagre `external_ref` på leadet i plattformen, og send det
> uendret tilbake i webhooken. Det gir 100 % treffsikker matching.

Vi matcher i denne rekkefølgen (første treff vinner), på tvers av både
utleier-leads og leietaker-leads:

| Prioritet | Felt i body | Matcher mot |
|-----------|-------------|-------------|
| 1 | `external_ref` | vår lead-id (det vi sendte dere) |
| 2 | `platform_id`  | deres egen id (hvis dere sendte den til oss tidligere) |
| 3 | `email`        | leadets e-post (fallback) |

Ingen treff → `404 { "ok": false, "error": "Lead ikke funnet" }`.

---

## 4. Request-body

```jsonc
{
  "external_ref": "a1b2c3d4-...",   // PÅKREVD i praksis (vår lead-id). Gir best matching.
  "platform_id": "crm-12345",       // valgfritt – deres egen id (alternativ matching)
  "email": "kunde@example.no",      // valgfritt – fallback-matching
  "status": "won",                  // PÅKREVD – se status-tabell under
  "value": 35000,                   // valgfritt – kun ved 'won'. Kontraktsverdi (tall, NOK)
  "currency": "NOK",                // valgfritt – standard 'NOK'
  "tenant": "Bergen",               // valgfritt – fri tekst, hvilken tenant/avdeling
  "changed_at": "2026-02-14T09:30:00Z" // valgfritt – ISO-8601. Default = nå
}
```

### Status-verdier
Vi normaliserer både norsk og engelsk. Send hva som er naturlig hos dere:

| Send (godtas) | Tolkes som (kanonisk) |
|---------------|------------------------|
| `ny`, `open`, `åpen` | `new` |
| `kontaktet`, `contacted` | `contacted` |
| `kvalifisert`, `qualified` | `qualified` |
| `vunnet`, `won`, `signert`, `signed`, `closed_won` | `won` |
| `tapt`, `lost`, `avvist`, `closed_lost` | `lost` |

Ukjent status → `400 { "ok": false, "error": "Ugyldig status" }`.

---

## 5. Respons

**200 OK**
```json
{ "ok": true, "id": "a1b2c3d4-...", "status": "won", "matched_by": "external_ref" }
```

| Kode | Betydning |
|------|-----------|
| `200` | Status oppdatert |
| `400` | Ugyldig/ manglende status |
| `401` | Feil eller manglende `X-Webhook-Secret` |
| `404` | Fant ikke leadet (sjekk `external_ref`) |

---

## 6. Når skal dere kalle webhooken?

Send et kall **hver gang status endres** på et lead som opprinnelig kom fra
markedssiden (`source_system: "digihome-marketing"`). Spesielt viktig:

- ➡️ **`won`** med `value` (kontraktsverdi) → utløser Google Ads-konvertering.
- ➡️ **`lost`** → så vi ikke rapporterer feil konverteringer.
- (Gjerne også `contacted` / `qualified` for responstid-/SLA-statistikk.)

Idempotent: det er trygt å sende samme status flere ganger.

---

## 7. Eksempel (cURL)

```bash
curl -X POST https://digihome.no/api/webhooks/lead-status \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: <DELT_HEMMELIGHET>" \
  -d '{
    "external_ref": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "vunnet",
    "value": 35000,
    "currency": "NOK",
    "tenant": "Bergen",
    "changed_at": "2026-02-14T09:30:00Z"
  }'
```

---

## 8. Sjekkliste for implementasjon hos dere

- [ ] Lagre `external_ref` (og `source_system`) på innkommende leads fra markedssiden.
- [ ] Trigger webhook ved hver statusendring (minst `won` og `lost`).
- [ ] Send `value` (kontraktsverdi i NOK) ved `won`.
- [ ] Sett headeren `X-Webhook-Secret` med den delte hemmeligheten.
- [ ] Logg responsen — `404` betyr feil/manglende `external_ref`.
- [ ] Retry ved nettverksfeil / 5xx (eksponentiell backoff anbefales).

---

*Spørsmål? Kontakt DigiHome-markedsteamet. Hemmeligheten (`X-Webhook-Secret`)
formidles i egen sikker kanal.*
