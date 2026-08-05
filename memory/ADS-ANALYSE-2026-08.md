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

---

# DEL 2 — UTFØRT 05.08.2026

## Korreksjoner til Del 1

Tre av mine egne funn viste seg å være feil eller for svakt begrunnet. De står her
fordi et funn som ikke tåller etterprøving er verre enn ingen funn.

**1. «Tilbakemeldingssløyfen er død» — FEIL diagnose, riktig symptom.**
Feltet heter `googleAdsWon`, ikke `googleOfflineConversion`. Proben min leste et
felt som ikke finnes og rapporterte «INGEN SPOR». Verifisert med en syntetisk
gclid: Data Manager-opplastingen returnerte `requestId` — **opplastingen
fungerer**. 0 konverteringer på «Vunnet utleier» skyldes at ingen vunnet lead
noensinne har hatt en gclid. Riktig tiltak er derfor klikk-ID-fangst og
samtykkerate, ikke integrasjonsfeilsøking.

**2. A3 (slå av Audience Network + Threads) — IKKE utført, med vilje.**
103 kr av 9 705 kr (1,06 %) fordelt på 6 klikk. Å tvinge manuelle plasseringer
setter en reell begrensning på en algoritme som allerede er læringsbegrenset, for
å spare en avrundingsfeil på et datagrunnlag av 6 klikk. Dårlig byttehandel.

**3. A5 (rett www-lenken) — IKKE utført alene.**
Meta-kreativer er uforanderlige; å rette lenken krever en ny kreativ, som
nullstiller læring og mister engasjementet på annonsen som bruker 7 796 kr.
308-omdirigeringen koster 86 ms og bevarer alle UTM-parametere (verifisert).
Rettes gratis når annonsen likevel skal peke på den nye landingssiden.

**4. AG4 «Airbnb» — IKKE pauset.**
Søkeordene der er faktisk eier-intensjon («airbnb vert», «drifte airbnb»), og hele
forbruket er 169 kr på 4 klikk. Min opprinnelige anbefaling om å pause den var
basert på for lite data.

## Google Ads — utført og verifisert mot API

| Endring | Fra | Til |
|---|---|---|
| Budstrategi, begge kampanjer | Maksimer klikk (TARGET_SPEND) | **Portefølje «DH – Maks konverteringer»** (MAXIMIZE_CONVERSIONS) |
| Søkeord «korttidsutleie av bolig» | aktiv, 2 509 kr / 0 konv | **pauset** |
| Søkeord «kombinere korttid og langtid» | pauset | **aktiv** (ren eier-intensjon) |
| Delt negativliste | 30 negative, koblet til 1 kampanje | **41 negative, koblet til begge** |
| Konverteringsverdi «Lead (skjema)» | 1 000 kr (plassholder) | **2 000 kr** (26 350 kr × 7,7 %) |
| Ny handling «Ringeklikk (nettsted)» | fantes ikke | **opprettet, SEKUNDÆR** |

Porteføljestrategi er valgt fordi 12 konv/30 d fordelt på 8 + 3 er for tynt for to
separate strategier. Porteføljen lar kampanjene dele læringen.

Ringekonverteringen er **sekundær** med vilje: et klikk på et telefonnummer er ikke
en samtale, og den vil bli langt hyppigere enn skjemaleads. Ble den primær, ville
budgivningen jaget billige klikk. Forfremmes når vi vet hva et ringeklikk er verdt.

Nye negative: korttidsleie, korttids leie, dinbnb, oslo, overnatting, ebf,
skattefritt, utleiemegler sør, søker bolig, søker leilighet, søker hybel.
«korttidsleie» blokkerer ikke «korttidsutleie» — ulike ord, kontrollert.

## Meta — utført og verifisert mot API

| Endring | Fra | Til |
|---|---|---|
| Geografi | nabolaget **Bergenhus** | **Bergen by + 25 km** |
| Est. månedlig rekkevidde | 53 800 – 63 300 | **394 900 – 464 500 (7,3×)** |

Alder (18–65), optimaliseringsmål (LEAD), plasseringer, budsjett og kreativer er
urørt. Alder ble vurdert og bevisst ikke endret: 18–24 ga faktisk 1 lead for
763 kr — bedre CPL enn kontosnittet — og 55+ med 0 leads har 11 leads som
datagrunnlag. Å snevre inn publikum mens vi kjemper mot for lite data gjør
problemet verre.

**Targeting-endring nullstiller læringsfasen. Forvent 7–14 dager med ustabile
tall. Ikke gjør nye endringer i mellomtiden.**

## Kode — implementert i preview, må deployes

| # | Endring | Fil |
|---|---|---|
| 1 | **17 hendelsestyper ble stille omdøpt til `pageview`** — ALLOWED_TYPES hadde 9 av 26 typer som klienten fyrer | `lib/analytics-server.js` |
| 2 | **Ringesporing** — én global lytter dekker alle `tel:`-lenker; førsteparts + GA4 + Google Ads + Meta Contact | `components/CallTracking.js`, `lib/gtag.js` |
| 3 | **Samtykkemåling** — `consent_view` + `consent_choice` | `components/ConsentBanner.js` |
| 4 | **Felles lukket sløyfe** — to kopier i route.js slått sammen til én modul | `lib/closed-loop.js` |
| 5 | **Årsak ved avhopp** — logger alltid hvorfor et signal ikke ble sendt | `lib/closed-loop-reasons.js` |
| 6 | **Testlead-vakt** — prober sender aldri konverteringer til live plattformer | `lib/closed-loop-reasons.js` |
| 7 | **CPL betalt vs alle** — 835 kr vs 987 kr | `lib/marketing-metrics.js`, `lib/kpi-dashboard.js` |
| 8 | **Ekte konverteringsverdi** — 2 000 kr i stedet for 0 | `lib/gtag.js` |
| 9 | **Meta-landingsside** `/lp/gratis-vurdering` med message-match | `lib/landing.js` |
| 10 | **Sløyfestatus i admin** med årsak | `components/admin/ClosedLoopPanel.js` |
| 11 | **Ringeklikk i trakten** — calls, contacts, costPerContact, consentRate | `lib/analytics-server.js` |

Verifisert: `node scripts/probe-ads-tracking.mjs` → **63 OK, 0 feil**.
Backend-testagent: **alle scenarier bestått**, ingen problemer.
Nettleserkontroll: førsteparts `call_click` (placement=footer), GA4 `call_click`,
Google Ads-konvertering med riktig `send_to`, og Meta `fbq Contact` — alle fyrte.

**Én forurensning skjedde og skal være dokumentert:** første probekjøring, før
testlead-vakten fantes, sendte én ekte Purchase på 26 350 kr til Meta og én
opplasting til Google Ads (syntetisk gclid, forkastes av Google som umatchet).
Det er derfor vakten nå finnes.

## Gjenstår

**Krever deploy:**
1. Deploy koden. Nye miljøvariabler: `NEXT_PUBLIC_GOOGLE_ADS_CALL_LABEL`, `NEXT_PUBLIC_LEAD_VALUE_NOK`.
2. `node scripts/after-deploy-google-value.mjs --dry` deretter `--live` — **først etter** at koden er live, ellers bokfører Google 0 kr pr. konvertering.
3. Pek Meta-annonsen til `https://digihome.no/lp/gratis-vurdering` (uten www) og A/B-test mot forsiden.

**Krever manuell handling i Meta (kan ikke gjøres via API):**
4. Hendelsesbehandler → Egendefinerte konverteringer → finn den med «leads» i navnet som er bygget på **ViewContent** (rapporterte 318 mot 11 ekte leads). Arkiver den eller gi den et navn som ikke inneholder «leads».

**Krever beslutning:**
5. **Meta optimaliserer mot LEAD med 2–3 leads/uke.** Selv med 7,3× publikum kommer den ikke i nærheten av 50/uke på 330 kr/dag. Alternativet er å optimalisere mot «skjema startet» (169/mnd ≈ 39/uke, nesten over terskelen) og fortsatt måle leads. Vurder etter at geo-utvidelsen har fått 14 dager.
6. **Telefonnummeret finnes bare i bunnteksten på forsiden.** Kanalen som lukker 60 % av kundene er gjemt. Etter at ringesporingen har samlet to ukers data, vet vi hva det er verdt å gjøre det mer synlig.
7. **CAPI sender Lead til Meta også når samtykkebanneret ikke er besvart.** Juridisk vurdering.
