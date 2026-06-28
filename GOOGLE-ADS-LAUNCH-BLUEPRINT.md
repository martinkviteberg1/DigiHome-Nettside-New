# DigiHome — Google Ads «Launch Blueprint» for Wingman

> **Formål:** En stram, kopier-og-lim playbook som Wingman-agenten skal følge **punkt for punkt** for å opprette DigiHomes første Google Ads-oppsett **trygt**.
> **Status ved oppretting:** ALT skal opprettes **PAUSET**. Wingman aktiverer ingenting. Martin ser over og skrur på manuelt.
> **Konto (Customer ID):** `985-335-6154`
> **Land/valuta:** Norge / NOK · Tidssone: Europe/Oslo

---

## 0) Beslutninger (fastsatt)
| Parameter | Verdi |
|---|---|
| Månedsbudsjett | **< 10 000 kr** → dagsbudsjett **300 kr** (≈ 9 100 kr/mnd) |
| Geografi | **Bergen + omegn** (ikke hele Norge) |
| Målgruppe | **Kun utleiere/boligeiere** (ikke leietakere) |
| Merkevarekampanje | **Nei** (vurderes når vi ser merkevaresøk i søkeordsrapporten) |
| Guardrails | **Opprett PAUSET** + harde tak innbakt (maks 300 kr/dag, maks CPC 22 kr) |
| Annonsenettverk | **Kun Søk** (Søkepartnere AV, Display AV) |
| Match-typer | **Kun phrase + exact** (INGEN broad) |
| Budstrategi | **Manuell CPC** først (bytt til Maks. konv. etter ~30 konverteringer) |

---

## 1) GUARDRAILS (ufravikelige regler for Wingman)
1. **Opprett ALT som PAUSET.** Ikke aktiver kampanje, annonsegrupper eller annonser.
2. **Ikke overskrid** 300 kr/dag total eller 22 kr maks CPC.
3. **Kun phrase- og exact-match.** Aldri broad match.
4. **Fest den delte negative søkeordslisten** (seksjon 6) FØR noe kan aktiveres.
5. **Kun ÉN kampanje med tre annonsegrupper** — nøyaktig som spesifisert.
6. **Ikke opprett** Performance Max, Display, Demand Gen eller Video.
7. **Ikke rør** konverteringshandlingen, auto-tagging eller kontoinnstillinger utover det som står her.
8. **Geo = kun tilstedeværelse** i Bergen + 25 km. Aldri hele Norge.
9. **Rapporter tilbake**: kampanje-ID, annonsegruppe-ID-er og et sammendrag for godkjenning.

---

## 2) Forutsetninger (verifiser FØR opprettelse)
- [ ] **Auto-tagging er PÅ** (Innstillinger → Kontoinnstillinger → Auto-tagging). Kritisk for at `gclid` følger med til landingssiden → offline-konvertering.
- [ ] Konverteringshandlingen **«Lead»** finnes og er aktiv:
  - Google Ads-konto: `AW-18277689710`
  - Konverteringslabel (lead): `u4XFCI27occcEO7SvYtE`
  - Enhanced Conversions for Leads = PÅ (allerede implementert i nettstedets kode).
- [ ] Sett **«Lead» som Primær** konverteringshandling (alt annet = Sekundær) — det er denne budgivningen skal optimalisere mot.

---

## 3) Kampanjeinnstillinger
| Innstilling | Verdi |
|---|---|
| Kampanjenavn | `DH \| Utleie \| Bergen \| Search` |
| Type | Søk (Search) |
| Mål | Potensielle kunder (Leads) |
| Nettverk | Søk **ON**. Søkepartnere **OFF**. Display **OFF**. |
| Dagsbudsjett | **300 kr** |
| Budstrategi | **Manuell CPC** (Forbedret CPC AV) |
| Standard maks CPC | **22 kr** (ad group-nivå; lavere på brede termer, se seksjon 5) |
| Steder | **Bergen kommune + 25 km radius** (inkl. Askøy, Øygarden, Alver, Bjørnafjorden) |
| Stedsalternativ | **«Tilstedeværelse: personer som er i / regelmessig i området»** (IKKE «interesse») |
| Språk | Norsk + Engelsk |
| Annonserotasjon | Optimaliser |
| Tidsplan | Hele uken (samle data først) |
| Final URL-suffix | (seksjon 7) |

---

## 4) Kampanjestruktur (1 kampanje → 3 annonsegrupper)
Hver annonsegruppe matcher én landingsside 1:1 (message-match).

| Annonsegruppe | Tema | Landingsside (Final URL) |
|---|---|---|
| **AG1 – Forvaltning** | Full forvaltning / utleiemegler | `https://digihome.no/lp/forvaltning` |
| **AG2 – Inntekt** | Høyere leieinntekt / leie ut | `https://digihome.no/lp/inntekt` |
| **AG3 – 10+2** | Hybrid korttid+langtid / trygg | `https://digihome.no/lp/10pluss2` |

---

## 5) Søkeord (kun phrase "..." og exact [...])

### AG1 – Forvaltning  · maks CPC 22 kr
```
"utleiemegler"
"utleiemegler bergen"
[boligforvaltning bergen]
"boligforvaltning"
"eiendomsforvaltning utleie"
"forvalte utleiebolig"
"hjelp til å leie ut bolig"
"administrere utleiebolig"
"noen som leier ut for meg"
```

### AG2 – Inntekt  · maks CPC 22 kr (sett 16 kr på "leie ut bolig")
```
"leie ut bolig"
"leie ut leilighet bergen"
[leie ut bolig bergen]
"leie ut boligen min"
"tjene mer på utleie"
"høyere leieinntekt"
"hva kan jeg leie ut for"
"leie ut bolig uten stress"
```

### AG3 – 10+2  · maks CPC 20 kr
```
"korttidsutleie forvaltning bergen"
"airbnb forvaltning bergen"
"hjelp til airbnb utleie"
"kombinere korttid og langtid"
"trygg utleie av bolig"
"utleie uten risiko"
```

---

## 6) Delt negativ søkeordsliste (FEST PÅ KAMPANJEN)
Navn: `DH – Negative (utleier-intensjon)`
> Ekskluderer leietaker-intensjon (vi jakter eiere!), kjøp/salg, jobb, gratis/mal m.m.
```
"til leie"
"leilighet til leie"
"bolig til leie"
"leie leilighet"
"leie leilighet bergen"
"finn leilighet"
"ledig leilighet"
"hybel til leie"
"rom til leie"
"leie hus"
"leie bolig bergen"
"kjøpe"
"til salgs"
"selge bolig"
"boligpriser"
"jobb"
"ledig stilling"
"stilling"
"lønn"
"gratis"
"kurs"
"utdanning"
"leiekontrakt mal"
"kontrakt mal"
"skjema"
"hotell"
"feriebolig"
"bilutleie"
"utleie bobil"
"utleie utstyr"
"lån"
"forsikring"
"kommunal bolig"
"studentbolig"
```

---

## 7) Final URL-suffix (sett på KONTO- eller kampanjenivå)
> Mater sporingen vår direkte. `gclid` legges til automatisk av auto-tagging (ikke i suffiks).
```
utm_source=google&utm_medium=cpc&utm_campaign=utleie-bergen-search&utm_term={keyword}&utm_content={creative}&matchtype={matchtype}&device={device}&network={network}
```
- Bruk **Final URL-suffix**, IKKE sporingsmal (unngår redirect).
- Nettstedet leser `utm_*` + `gclid` og lagrer på hver lead (closed-loop).

---

## 8) Responsive søkeannonser (RSA) — 3 annonser, én per gruppe
> Overskrifter ≤ 30 tegn, beskrivelser ≤ 90 tegn. Min. 8–10 overskrifter + 4 beskrivelser.
> Tips: fest «DigiHome» som Pinnet overskrift på posisjon 1 i én av overskriftene hvis ønskelig (valgfritt).

### AG1 – Forvaltning → `/lp/forvaltning`
**Overskrifter**
```
Full forvaltning i Bergen
Vi leier ut for deg
Utleie uten stress
Du eier – vi gjør jobben
Ingen oppstartskostnad
Ingen bindingstid
Dedikert forvalter
Leietakere, husleie, tilsyn
Gratis vurdering på 24 t
Eiendomsforvaltning Bergen
Full oversikt i sanntid
Betal kun ved leieinntekt
Slipp leietaker-styret
Profesjonell utleie
Bergens utleiehjelp
```
**Beskrivelser**
```
Vi tar oss av annonsering, leietakere, husleie og vedlikehold. Du mottar inntekten.
Ingen oppstartskostnader, ingen bindingstid. Betal kun en andel av leieinntekten.
Gratis, uforpliktende vurdering innen 24 timer. Se hva boligen din kan tjene.
Full forvaltning i hele Bergen – fra Nordnes til Åsane. Få en vurdering i dag.
```

### AG2 – Inntekt → `/lp/inntekt`
**Overskrifter**
```
Opptil 30 % mer i leie
Tjen mer på utleie
Dynamisk prising 24/7
Snitt 25 000 kr/mnd Bergen
Maksimer leieinntekten
Leie ut – tjen mer
Hybrid korttid + langtid
Uten å løfte en finger
Gratis inntektsvurdering
Ingen oppstartskostnad
Smartere utleie i Bergen
Hva kan boligen tjene?
Høyere avkastning
Ingen bindingstid
Få et inntektsanslag
```
**Beskrivelser**
```
Hybridmodell + dynamisk prising gir opptil 30 % høyere leieinntekt – uten jobb for deg.
Snittinntekt i Bergen rundt 25 000 kr/mnd. Se hva din bolig kan tjene.
Ingen oppstartskostnader eller bindingstid. Betal kun når boligen gir inntekt.
Gratis, uforpliktende vurdering innen 24 timer. Kom i gang i dag.
```

### AG3 – 10+2 → `/lp/10pluss2`
**Overskrifter**
```
10 mnd fast, 2 mnd sesong
Det beste fra to verdener
Trygg + lukrativ utleie
10+2-modellen
Fast leietaker + høysesong
Opptil 30 % mer inntekt
Korttid når det lønner seg
Forutsigbar leieinntekt
Utleie uten risiko
Vi styrer alt for deg
Smartere enn ren langtid
Gratis vurdering 24 t
Ingen oppstartskostnad
Airbnb + langtid i ett
Maksimer boligen din
```
**Beskrivelser**
```
10 måneder trygg langtidsleie + 2 måneder korttid i høysesong = opptil 30 % mer.
Fast leietaker mesteparten av året, ekstra avkastning når etterspørselen topper seg.
Vi håndterer alt – leietakere, prising og tilsyn. Ingen oppstartskostnad.
Gratis, uforpliktende vurdering innen 24 timer i hele Bergen.
```

---

## 9) Annonseutvidelser (kampanjenivå)

### Sitelinks (4)
| Tekst (≤25) | Beskr. linje 1 (≤35) | Beskr. linje 2 (≤35) | URL |
|---|---|---|---|
| Slik fungerer det | Tre enkle steg | Vi gjør jobben for deg | `https://digihome.no/bli-utleier` |
| Hva tjener boligen? | Gratis inntektsanslag | Svar innen 24 timer | `https://digihome.no/lp/inntekt` |
| Full forvaltning | Leietakere og husleie | Vedlikehold inkludert | `https://digihome.no/lp/forvaltning` |
| Kom i gang gratis | Ingen bindingstid | Ingen oppstartskostnad | `https://digihome.no/bli-utleier` |

### Callouts (≤25)
```
Ingen oppstartskostnad
Ingen bindingstid
Gratis vurdering på 24 t
Lokalt team i Bergen
Betal kun ved leieinntekt
Full oversikt i sanntid
```

### Strukturerte tekstutdrag
- **Overskriftstype:** Tjenester
- **Verdier:** `Annonsering, Leietakeroppfølging, Husleieinnkreving, Vedlikehold, Forvaltning, Korttidsutleie`

### Telefonutvidelse (valgfri)
- Legg til DigiHomes telefonnummer hvis ønskelig (krever samtaleregistrering for konvertering – valgfritt nå).

---

## 10) Sjekkliste før aktivering (Martin godkjenner)
- [ ] Auto-tagging PÅ
- [ ] «Lead» = Primær konvertering, Enhanced Conversions PÅ
- [ ] Final URL-suffix satt
- [ ] Negativ liste festet på kampanjen
- [ ] Dagsbudsjett 300 kr, maks CPC ≤ 22 kr verifisert
- [ ] Kun phrase/exact, ingen broad
- [ ] Geo = Bergen + 25 km, tilstedeværelse
- [ ] Alle annonser består policy (kvalifiserte påstander: «opptil 30 %» er ok)
- [ ] Alt står som **PAUSET**

---

## 11) Optimaliseringsplan (etter aktivering)
**Uke 1–2 (daglig):**
- Sjekk **søkeordsrapporten** → legg til negative søkeord for irrelevante treff.
- Pause søkeord med høyt forbruk og 0 konvertering etter ~50 klikk.

**Etter ~30 konverteringer:**
- Bytt budstrategi til **Maksimer konverteringer**, deretter eventuelt **Mål-CPA**.

**Ukentlig (closed-loop ROAS):**
- Eksporter **vunne leads** fra admin → `/admin/ads/offline-conversions` (CSV).
- Last opp i Google Ads → Verktøy → Konverteringer → Opplastninger («Conversions from clicks»-mal).
- Importer Google Ads-kostnad i admin → `/admin/ads/import` for ekte ROAS i `/admin/ads/overview`.

---

## 12) Fase B (senere, blokkert)
Live Google Ads API-sync i admin venter på **Basic Access**-godkjenning av developer token. Når godkjent: fyll inn `GOOGLE_ADS_CLIENT_ID/SECRET/REFRESH_TOKEN/LOGIN_CUSTOMER_ID` i `.env` for automatisk synk av kostnad/ROAS.
