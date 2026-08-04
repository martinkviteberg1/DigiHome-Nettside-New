# Fullstendig analyse: Meta + Google Ads (produksjon)

**Analysedato:** 2026-08-05
**Låst målevindu:** 2026-07-06 → 2026-08-04 (30 dager, samme kalenderdager for alle kilder)
**Datakilder:** Meta Marketing API (rådata), Google Ads API v21 (GAQL), produksjonens
`/api/admin/kpi`, `/api/admin/leads` og `/api/admin/analytics` (førsteparts øktdata).
**Ingen endringer er gjort i annonsekontoene.**

Scripts som produserte tallene (kan kjøres på nytt):
`scripts/analyse-ads-meta.mjs`, `analyse-ads-meta-events.mjs`, `analyse-ads-meta-window.mjs`,
`analyse-ads-meta-leak.mjs`, `analyse-ads-google.mjs`, `analyse-ads-google-conv.mjs`,
`analyse-prod-funnel.mjs`, `analyse-prod-kpi.mjs`, `analyse-prod-sessions.mjs`,
`analyse-channel-90d.mjs`, `analyse-offline-conv.mjs`, `analyse-consent-gating.mjs`.

---

## 1. Samlet bilde i vinduet

| | Google Ads | Meta | Betalt totalt |
|---|---|---|---|
| Forbruk | 12 015 kr | 9 705 kr | 21 720 kr |
| Klikk | 282 | 582 (361 lenkeklikk) | – |
| CTR | 8,75 % / 4,82 % | 1,13 % | – |
| CPC | 42 kr | 17 kr (27 kr pr. lenkeklikk) | – |
| Økter (førsteparts) | 264 | 402 | 666 |
| Kost pr. økt | 47 kr | 24 kr | – |
| Nådde side med skjema | 242 (92 %) | 104 (26 %) | – |
| Leads i CRM | 13 | 9 | 22 |
| CPL (CRM-fasit) | 924 kr | 1 078 kr | 987 kr |
| Nye kunder i vinduet | 0 | 2 | 2 |

Øvrige leads i vinduet: nettside/organisk 4, crm-plattform 4 → 30 huseier-leads totalt
(KPI-filtrert tall: 26).

**Økonomi (produksjonens egne tall, faktisk grunnlag):**
CAC 10 860 kr · LTV 74 880 kr · LTV:CAC 6,9:1 · kontrahert 12,7:1 ·
lead→kunde 7,7 % · tid til vunnet 3,4 dager (n=2) · MRR faktisk 4 160 kr,
kontrahert 30 330 kr, potensial 6 700 kr.

**Livstid:** Meta 44 934 kr siden 12.11.2025 · Google 12 630 kr totalt
(kampanjene startet ~1. juli 2026) → ca. 57 600 kr i annonser til nå.

**Kanal → kunde, 90 dager:**
telefon 5 leads → **3 vunnet** · meta 12 → 2 vunnet · google 14 → 0 vunnet
(2 tilbud ute, 10 i arbeid) · nettside 6 → 0 (3 tilbud ute) · crm-plattform 4 → 0 ·
ukjent kilde 20 → 0.

---

## 2. Viktigste funn

### 2.1 «Leads» i Meta Ads Manager kan være ~30× for høyt
I vinduet: kanonisk `lead` = **11**. Samtidig rapporteres
`offsite_content_view_add_meta_leads` = **318** — en egendefinert konvertering med
«leads» i navnet som er bygget på **ViewContent** (sidevisning). Ser man på den
kolonnen, ser CPL ut som ~30 kr i stedet for ~880 kr.

- DigiHomes eget dashbord teller **riktig** (kun `lead`, se `lib/meta-ads.js`).
- Kunne ikke hente konverteringens navn via API (0 treff på annonsekontoen,
  business-edge ikke tilgjengelig med dagens token) → må åpnes manuelt i
  Hendelsesbehandler → Egendefinerte konverteringer.
- Samme mønster for en konvertering som heter noe med `20_s_calls`
  (`offsite_content_view_add_20_s_calls` = 318, `offsite_initiate_checkout_...` = 169).

### 2.2 Meta er læringsbegrenset
Annonsesettet optimaliserer korrekt mot LEAD
(`promoted_object.custom_event_type = LEAD`), men får bare 11 leads/30 dager
≈ 2–3 pr. uke. Meta trenger ~50 optimaliseringshendelser pr. annonsesett pr. uke.
Konsekvens: dyre visninger (CPM 188 kr) og ustabil levering.

### 2.3 Målgruppen er ett nabolag
Geo = nabolaget **Bergenhus** (home/recent). Estimert månedlig rekkevidde
53 800–63 300. 330 kr/dag inn i dette gir ukentlig frekvens 2,0–2,5 og
30-dagers frekvens 3,52.

### 2.4 Meta sender alt til forsiden
Alle tre aktive annonser peker til `/`. Bare 26 % av Meta-øktene kommer videre til
en side med skjema (`/bli-utleier` eller `/lp/*`), mot 92 % for Google.
Økt→lead: Meta 2,2 % mot Google 4,9 %.
**Nyanse:** begge Meta-kundene i vinduet landet likevel på `/`. Dette skal testes,
ikke antas.

### 2.5 «38 % av klikkene lander ikke» er en MÅLEFEIL, ikke tapt trafikk
Meta: 361 lenkeklikk → 136 «landing page views» (38 %). Men førsteparts øktdata
viser **402 økter** (111 % av lenkeklikkene). Meta-pixelen lastes først etter
«godta alle» i samtykkebanneret (`components/MetaPixel.js`), så
PageView/ViewContent/LPV mangler for alle som ikke samtykker.
Anslått samtykkerate 35–45 % (Facebook 46 %, Instagram 29 %).
Lead-hendelsen går server-side via CAPI og rammes ikke.

### 2.6 Google byr på klikk, ikke kunder
Begge kampanjer bruker **TARGET_SPEND (Maksimer klikk)**, selv om det finnes en
fungerende primær konverteringshandling («DigiHome – Lead (skjema)», WEBPAGE,
SUBMIT_LEAD_FORM, ONE_PER_CLICK) med 12 konverteringer i vinduet. CPC 42 kr.

### 2.7 Konverteringsverdien til Google er en plassholder
«DigiHome – Lead (skjema)»: standardverdi **1 000 kr** med
*bruk alltid standardverdi = ja*. Alle 12 konverteringer får verdi 1 000 kr
(«verdi 12 000»). Verdibasert budgivning vil derfor optimalisere mot noe fiktivt.

### 2.8 Tilbakemeldingssløyfen til Google er død
«DigiHome – Vunnet utleier» (UPLOAD_CLICKS) er **primær og aktiv**, men har
**0 konverteringer**. Bare 10 av 62 leads (90 d) har gclid, og ingen av de vunne
hadde gclid eller spor av opplasting. Google får aldri vite hvem som ble kunde.

### 2.9 Google betaler for feil intensjon (~2 700 kr/mnd)
| Annonsegruppe | Forbruk 30 d | Konv |
|---|---|---|
| AG3 – 10+2 | 2 532 kr | 0 |
| AG4 – Airbnb | 169 kr | 0 |

Søkeordet `"korttidsutleie av bolig"` (phrase) trekker inn folk som vil **leie**
kort, ikke eiere: «korttidsleie bergen» 1 050 kr / 0 konv, «korttidsleie oslo»,
«korttidsleie leilighet», «dinbnb» 349 kr / 0 konv, «leiekontrakt korttidsleie».
Landingssidene er teknisk identiske med de som konverterer
(`/lp/10pluss2` 52 klikk / 0 konv vs `/lp/inntekt` 90 klikk / 5 konv), så det er
intensjonen som feiler — ikke siden.
Negative søkeord finnes (13 + 6 + delt liste «DH – Negative (utleier-intensjon)»),
men dekker ikke korttidsleie / dinbnb / oslo / «til leie» / «søker».

### 2.10 45,5 % av visningene tapt på annonserangering
Hovedkampanjen: søkeandel 50,6 %, tapt pga. rangering 45,5 %, tapt pga. budsjett
bare 3,9 %. 3 av 5 annonsegrupper har annonsestyrke **POOR**.

### 2.11 Ingen ringesporing — beste kanal er usporet
Telefon står for **3 av 5** vunne kunder siste 90 dager. `tel:`-lenker finnes i
header, footer, LP-er og skjema, men **ingen** hendelse logges noe sted (verken
førsteparts, GA4, Google Ads eller Meta). Betalte kanaler blir systematisk
underkreditert, og Google Ads får ikke tellet ring-konverteringer.

### 2.12 Det som faktisk fungerer
- Google AG2 «Inntekt»: 4 888 kr → 7 konv · `/lp/inntekt` 3 848 kr → 5 konv (5,6 %).
- Konkurrentkampanje mot «utleiemegleren»: 2 813 kr → 3 konv, CPA 938 kr,
  søkeandel 77 %.
- Mobil = 83 % av Google-forbruket og 8 av 11 konverteringer.
- Meta-pixel: first-party cookie aktiv, automatisk avansert matching aktiv,
  CAPI Lead sendt uten feil for 31 leads (90 d).
- **Produksjonens KPI-tall for annonseforbruk stemmer krone for krone med rådata**
  (Google 12 015,44 · Meta 9 704,98 · `windowAligned: true` ·
  `metaLifetimeFallback: false`).

---

## 3. Svakheter i egen måling

1. **CPL i admin** (835 kr) deler annonseforbruk på alle 26 huseier-leads, også
   organiske/plattform. Ekte betalt CPL = 21 720 / 22 = **987 kr**.
2. **20 av 62 leads** siste 90 dager har ukjent kilde — attribusjonen gikk live
   for ca. 4–5 uker siden. Historikk kan ikke rekonstrueres.
3. **CAPI sender Lead også uten besvart samtykkebanner**
   (`marketingAllowed()` returnerer true når cookien mangler). Juridisk vurdering
   bør gjøres, evt. strammes inn.
4. **LTV = månedshonorar × 36 uten margin-nedjustering** → 6,9:1 er et
   bruttohonorar-multiplum, ikke fortjeneste.
5. Google Ads har kun vært i drift ~5 uker. **Ikke konkluder om Google på 0 vunne**
   — 2 tilbud er ute og 10 leads er i arbeid.

---

## 4. Prioriterte tiltak (ikke utført — venter på beslutning)

### A. Kontoinnstillinger (krever brukerens godkjenning)
| # | Tiltak | Forventet effekt |
|---|---|---|
| A1 | Google: Maksimer klikk → Maksimer konverteringer (senere tCPA ~900 kr) | Lavere CPA, samme budsjett |
| A2 | Google: pause AG3 + AG4 med dagens søkeord, legg inn negativene | Frigjør ~2 700 kr/mnd |
| A3 | Meta: slå av Audience Network + Threads | 103 kr/mnd, 0 leads |
| A4 | Meta: utvid geo fra Bergenhus til Bergen kommune + omegn | Ut av læringsbegrensning |
| A5 | Meta: rett annonselenke til `https://digihome.no/` (uten www, fjerner 308) | Færre hopp på mobil |
| A6 | Meta: rydd egendefinert «leads»-konvertering bygget på ViewContent | Ærlige tall i Ads Manager |

### B. Kodeendringer i preview (må deployes)
| # | Tiltak | Hvorfor |
|---|---|---|
| B1 | Ringesporing: `tel:`-klikk → førsteparts hendelse + Google Ads-konvertering + Meta-hendelse | Beste kanal er usporet |
| B2 | Automatisk offline-opplasting til «Vunnet utleier» ved status=won med gclid, med status i admin | Google lærer hvem som ble kunde |
| B3 | Egen Meta-LP med skjema først (`/lp/gratis-vurdering`), A/B mot forsiden | Økt→lead 2,2 % → mål 3,5–4,9 % |
| B4 | CPL i admin: del på betalte leads; vis «CPL betalt» og «kost pr. lead totalt» | Riktig styringstall |
| B5 | Send ekte konverteringsverdi til Google i stedet for 1 000 kr flat | Verdibasert budgivning blir mulig |
| B6 | Mål og vis samtykkerate; vurder mindre påtrengende banner | Bedre signal til Meta |

**Regnestykke for B3:** 402 Meta-økter i vinduet. Ved Googles 4,9 % → 20 leads
(CPL ~485 kr). Forsiktig anslag 3,5 % → 14 leads (CPL ~690 kr). Dagens: 9 leads,
CPL 1 078 kr.
