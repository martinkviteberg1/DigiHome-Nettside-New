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
