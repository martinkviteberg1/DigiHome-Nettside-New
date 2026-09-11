# Bro-spec: Leiekontrakt-utkast → appen (Fase 2)

> Til app-teamet (DigiHome-appen / okt-branch). Nettsiden (digihome.no) er bygget
> og live. Denne specen beskriver den LILLE utvidelsen appen trenger for at den
> offentlige «verdi først»-kontraktsflyten skal fullføres helt til BankID.

## Kontekst — hva nettsiden gjør nå (ferdig)
- SEO-landing: `https://digihome.no/utleier/husleiekontrakt`
- Innloggingsløs wizard: `https://digihome.no/utleier/husleiekontrakt/start`
  (bolig → leietaker → vilkår → forhåndsvisning → konto). Utkast lagres anonymt
  hos oss (`leiekontrakt_utkast`, opak token) — ingen innlogging.
- Ved «Opprett konto og gå til signering» kaller nettsiden den EKSISTERENDE broen
  `POST {app}/api/bridge/self-service-customer` (header `X-Bridge-Secret`,
  `X-API-Key`) — nå med to ekstra felt:
  - `source: "leiekontrakt"`
  - `lease_draft: { ... }`  (schema `digihome.lease_draft.v1`, se under)
- Kontoen opprettes som i dag som UBEKREFTET (email_verified=false) og appen
  sender magic-link. Nettsiden viser «Sjekk innboksen» (gjenbruker
  eksisterende e-postverifisering + `resend-verification` / `change-email`).

## Det appen må gjøre (3 punkter)

### 1) Ta imot og lagre `lease_draft`
Utvid `POST /api/bridge/self-service-customer` til å lese valgfritt `lease_draft`
og lagre det som et **lease draft** knyttet til den nye kontoen/eieren.
Returner gjerne `lease_draft_ref` i svaret (valgfritt — nettsiden krever det ikke).
Ukjente felt skal ignoreres trygt (nettsiden virker allerede uten dette).

**`lease_draft` (schema `digihome.lease_draft.v1`):**
```json
{
  "schema": "digihome.lease_draft.v1",
  "property": { "address": "Nygårdsgaten 5", "postal_code": "5015", "city": "Bergen",
    "type": "leilighet|enebolig|rekkehus|tomannsbolig|hybel|annet", "sqm": 62, "bedrooms": 2,
    "furnishing": "umoblert|delvis|moblert", "smoking_allowed": false, "pets_allowed": false },
  "tenant": { "kind": "private|business", "name": "Emma Lie", "email": "emma@...",
    "phone": "...", "org_no": null, "company_name": null,
    "co_tenants": [{ "name": "...", "email": "..." }] },
  "terms": { "contract_type": "open_ended|fixed_term", "start_date": "2026-08-01",
    "end_date": null, "notice_months": 3, "monthly_rent": 14500, "rent_due_day": 1,
    "utilities_included": false, "deposit_type": "konto|garanti|ingen",
    "deposit_months": 3, "special_terms": "" }
}
```
Dette mapper 1:1 til deres `LeaseCreate` / kontraktsmal (Husleieloven).

**NYTT (additivt, valgfritt) — `property.registry`** (satt når brukeren slo opp
boligen i Eiendomsregisteret i wizarden; `null` ved manuell adresse):
```json
"property": {
  "...": "feltene over",
  "registry": {
    "source": "infotorg_edr",
    "kommunenr": "4601", "gaardsnr": "165", "bruksnr": "96",
    "seksjonsnr": "12",          // eierseksjon (null hvis ikke seksjonert)
    "andelsnr": null,            // borettslag-andel (null hvis ikke borettslag)
    "orgnr": null,               // borettslagets org.nr (kun borettslag)
    "matrikkel": "4601-165/96/12",
    "unit_no": "H0301",          // bruksenhetsnummer / bolignr
    "building_type": "sameie|borettslag|enebolig|tomannsbolig|rekkehus",
    "registered_owner": { "name": "Ola Nordmann", "type": "person|organisasjon" }
  }
}
```
Bruk `registry` til å forhåndsutfylle matrikkel/seksjon/andel/bolignr i den
autoritative kontrakten, og `registered_owner` som forslag til utleier-part
(brukeren kan ha endret det i wizarden — `owner` i broen er alltid fasit).
Ukjente felt ignoreres trygt; eldre payloads uten `registry` er fortsatt gyldige.

> **Infotorg/Eiendomsregisteret: INGEN endring nødvendig i appen.** Nettsiden har
> sin egen Infotorg-klient (`/api/infotorg/*`, rate-limitet) og gjør oppslaget
> selv. Tidligere idé om å åpne appens `/api/infotorg/*` for bro-token er
> **frafalt** — ignorer den om den ble nevnt.

### 2) Magic-link åpner utkastet ferdig utfylt
Når en bruker bekrefter e-posten via magic-link og kontoen har et lagret
`lease_draft`: send dem rett inn i signeringswizarden med feltene
**forhåndsutfylt** (f.eks. `/utleier/husleiekontrakt/start` på signeringssteget,
eller `/leiekontrakt/utkast/:token`). Målet: bruker ser sin egen kontrakt og
trykker «Signer med BankID» — uten å fylle inn noe på nytt.

### 3) Bekreft Posten/BankID i PROD (blokker)
Koden faller tilbake til `mock`-signering hvis Posten ikke er konfigurert
(`leases.py`: `send-for-signing` / `sign_lease`). **Verifiser at ekte
Posten/BankID er aktiv i prod** før vi driver trafikk hit — ellers sender vi
folk inn i en falsk signering. Deploy okt-branchen med denne utvidelsen.

## Sikkerhet / robusthet
- Samme delte hemmelighet som i dag (`AGENT_BRIDGE_SECRET` via `X-Bridge-Secret`).
- Idempotent på `event_id` (som eksisterende self-service).
- Ingen passord sendes fra nettsiden — passordløst via magic-link.
- Nettsiden er allerede live og fungerer for KONTOOPPRETTELSE i dag; punktene
  over aktiverer bare utkast-forhåndsutfylling + garantert ekte BankID.

## LÅST KONTRAKT (11. sep 2026) — selvbetjent provisjonering + e-postverifisering (B)
App-agenten fant et account-takeover-hull (`/api/leads` åpent + `_ensure_owner` gjenbrukte konto + returnerte handoff-lenke). Løsning: appen eier verifisering (opsjon B) + tetting. Kontrakten er låst; nettsiden er allerede oppdatert til å følge den.

### Svar-kontrakt (POST /api/bridge/self-service-customer og /api/leads self-service)
| Situasjon | HTTP | Body (nøkkelfelt) | Nettsiden gjør |
|---|---|---|---|
| Ny kunde opprettet | 200 | `{ success:true, self_service:true, status:"provisioned", account:{ account_id, onboarding_url, expires_at }, verification:"email_code" }` | Redirect til `account.onboarding_url` (appens begrensede «bekreft e-post → lag passord»-sesjon) |
| E-post finnes allerede | 200 | `{ success:true, self_service:true, status:"existing_account", email_masked, login_url }` | Egen «du har allerede en konto»-skjerm; INGEN account/tokens. Appen sender innloggingslenke til kontoeier |
| Feil hos oss | 202 | `{ success:false, self_service:true, status:"pending_manual", message }` | «Vi tar kontakt» |
| Self-service uten gyldig X-API-Key | 202 | `status:"pending_manual"` | Lagres som lead + forvalteroppgave; ingen konto, ingen lenke |

Diskriminator = `data.status`: `provisioned`→redirect, `existing_account`→egen skjerm, alt annet→«vi tar kontakt».

### Nettside-side (IMPLEMENTERT, agent-/regresjonstestet i preview)
- `provisionSelfService()` (route.js): status-styrt mapping; redirect KUN på `provisioned` via `account.onboarding_url` (defense-in-depth — aldri kun fordi en onboarding_url finnes). Legacy (uten `status`, men success/handoff_url) → behandles som provisioned (bakoverkompat i overgangen). `existing_account` → account{status,existing_account,email_masked,login_url}. 202 → pendingManual.
- `/leiekontrakt/opprett`: existing_account-gren + redirect kun på provisioned + idempotent-gren håndterer existing_account. Lagrer status/existing_account/login_url på `platform_account`.
- Frontends: `StartV4.js` (ny «Du har allerede en konto»-skjerm; redirect kun på status==='provisioned') og `HusleiekontraktWizard.js` (SjekkInnboksen existing_account-variant).
- Nettsiden sender ALLTID `X-Bridge-Secret` + `X-API-Key` server-til-server på broen. Generisk lead-forward sender også `X-API-Key` → trygt for appen å låse `/api/leads` bak nøkkel.

### App-side (app-agenten gjør — IKKE nettsidens ansvar)
- UMIDDELBAR TETTING: eksisterende e-post → aldri gjenbruk/handoff (send `existing_account` + e-post til eier; skjemaets avtale/bolig påføres først når eier logger inn). `/api/leads` provisjonerer kun med gyldig X-API-Key, ellers lead + pending_manual.
- B: bro-kontoer `email_verified:false`; handoff-sesjon begrenset til bekreft/passord til 6-sifret kode (10 min, maks 5, hashet) er riktig; «send ny kode» + «feil e-post? endre»; velkomst-magic-link beviser eierskap → rett til passord.

### Åpne punkter
- Ende-til-ende funksjonell verifisering av existing_account/provisioned skjer først når appen deployer kontrakten (eller mot en kontrollert staging-bro). Nettsiden er agent-/regresjonstestet i preview, ikke brukerbekreftet.
- Rotere GitHub-tokenet som ble delt i chatten tidligere.
