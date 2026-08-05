# SEO- og AEO-analyse + tiltak — august 2026

**Datakilde:** Google Search Console API (`lib/gsc.js`, `scripts/analyse-seo.mjs`)
**Målevindu:** 2026-05-04 → 2026-08-02 (90 dager)
**Property:** digihome.no (produksjon)
**Rådata:** `/tmp/seo/gsc.txt`
**Verifisering av tiltak:** `scripts/probe-seo-aeo.mjs` → **528 OK, 0 feil** (preview)

> Alle tall under er målt i produksjon. Alle tiltak er implementert i **preview** og
> krever deploy før de får effekt. Organisk effekt kan først vurderes 3–6 uker
> etter deploy, når Google har rekrawlet og CTR-data har akkumulert.

---

## 1. Utgangspunktet

| Metrikk | Verdi |
|---|---|
| Klikk | 105 |
| Visninger | 6 317 |
| CTR | **1,7 %** |
| Snittposisjon | 11,0 |
| Mobil | 3 548 visn / 69 klikk / pos 8,5 |
| Desktop | 2 715 visn / 36 klikk / pos 13,9 |

**Konklusjonen fra dataen er entydig: dette er ikke et synlighetsproblem, det er et
klikkproblem.** Ved snittposisjon 11 er forventet CTR normalt 2–4 %; vi lå på 1,7 %.
Forsiden hadde 17 % CTR (merkevaresøk), mens guidene lå på 0,8 %.

### Trafikken kommer nesten utelukkende fra guidene

| Side | Visn | Klikk | CTR | Pos |
|---|---|---|---|---|
| /guider/depositum-regler | 1 971 | 9 | **0,5 %** | 11,8 |
| /guider/korttidsutleie-regler | 1 440 | 18 | 1,3 % | **7,4** |
| /guider/skatt-pa-utleie | 780 | 4 | 0,5 % | 23,7 |
| /leiemarkedet/bergen | 624 | 7 | 1,1 % | **6,3** |
| /guider/hva-koster-utleiemegler | 388 | 4 | 1,0 % | **7,0** |
| /utleie/bergen | 290 | 3 | 1,0 % | 12,0 |
| / (forside) | 218 | 37 | 17,0 % | 7,2 |
| /guider/leie-ut-leilighet-bergen | 117 | 2 | 1,7 % | 7,8 |
| /utleiemegler-bergen | 80 | 4 | 5,0 % | 6,0 |

Guidene sto for **4 616 av 6 317 visninger (73 %)**, men bare **37 av 105 klikk**.

---

## 2. Viktig korreksjon av tidligere hypotese

En tidligere analysenotat antydet at den organiske trafikken var **leietaker-orientert**
og dermed feil målgruppe. **Query-nivå-dataen viser at det er feil.** Depositum-søkene er
i hovedsak **utleier-intensjon**:

| Søk | Visn | Pos | Klikk | Intensjon |
|---|---|---|---|---|
| leietaker ikke betalt depositum | 25 | 10,1 | 0 | **Utleier** |
| leietaker har ikke betalt depositum | 24 | 11,6 | 0 | **Utleier** |
| depositumskonto regler | 22 | 21,1 | 0 | **Utleier** |
| må utleier ha egen depositumskonto | 21 | 15,6 | 0 | **Utleier** |
| depositum på privat konto | 21 | 10,0 | 0 | **Utleier** |
| leietaker betaler ikke depositum | 10 | 10,9 | 0 | **Utleier** |
| hvem får rentene på depositumskonto | 4 | 11,0 | 0 | **Utleier** |
| leietaker rettigheter depositum | 20 | 21,3 | 0 | Leietaker |
| når utleier ikke betaler tilbake depositum | 18 | 29,8 | 0 | Leietaker |

Innholdet traff altså riktig målgruppe. Problemet var **titler som ikke matchet søket**,
og at én side prøvde å svare på 8–10 forskjellige spørsmål samtidig.

### Kommersielle søk med 0 klikk fra topp 10 — det dyreste tapet

| Søk | Visn | Pos | Klikk |
|---|---|---|---|
| hvor mye tar utleiemegleren i provisjon | 21 | **6,4** | **0** |
| pris utleiemegler | 19 | 7,6 | 1 |
| hva koster utleiemegleren | 14 | 8,4 | **0** |
| hvor mye tar utleiemegleren | 14 | 10,5 | **0** |
| hvor mye koster utleiemegler | 10 | 10,8 | **0** |
| leiepriser bergen | 31 | **6,7** | **0** |
| utleiemegler bergen | 36 | 6,8 | 3 (8,3 %) |

Vi rangerte på posisjon 6–8 på de mest kjøpsnære søkene i markedet og fikk null klikk.
Tittelen på prisguiden inneholdt **ikke** ordet «provisjon», og leiemarkedstittelen
begynte med «Leiemarked» i stedet for søkeordet «Leiepriser».

### Søk med reell etterspørsel men dårlig posisjon

| Søk | Visn | Pos | Diagnose |
|---|---|---|---|
| skatt på utleie | 50 | **41,2** | hovedordet — for tynn dekning |
| leieinntekter | 30 | **61,3** | ingen dedikert side |
| avskrivning utleiebolig | 21 | **41,0** | var én kulepunktlinje i skatteguiden |
| fradrag utleie sekundærbolig | 16 | **40,3** | ingen dedikert side |
| gråsone utleie bolig | 20 | 27,2 | ingen side dekket temaet |
| korttidsutleie bergen | 15 | 16,7 | lokal variant ikke adressert |

---

## 3. Rotårsaker

1. **Titler skrevet for produktet, ikke for søket.** Ingen av de kommersielle titlene
   inneholdt ordet folk faktisk søkte på («provisjon», «leiepriser»), og ingen lovet et
   konkret tall.
2. **Intensjonskollisjon.** `/guider/depositum-regler` rangerte samtidig på
   depositumskonto-regler, manglende innbetaling og tilbakebetalingsfrister. Ingen
   tittel kan matche alle tre, så CTR ble 0,5 % på 1 971 visninger.
3. **Kannibalisering.** Fire av seks nyhetsartikler dekket **eksakt** samme søkeintensjon
   som fire guider (skatt, utleiemeglerpris, leie ut i Bergen, selvforvaltning). Ingen av
   artiklene hadde en enkelt visning på 90 dager — de delte bare rangeringssignalene.
4. **Ingen interne lenker i brødteksten.** Guidene refererte til hverandre i ren tekst
   («se depositumsguiden vår») uten at det var en lenke. Null lenkeverdi, null brukerflyt.
5. **AEO-gapet.** Article + FAQPage var på plass, men uten `speakable`, `wordCount`,
   entitetskobling (`about`), `HowTo`, ankere på H2, eller siterbare nøkkeltall.
6. **Ingen long-tail-arkitektur.** Fradrag/avskrivning lå på posisjon 40+ fordi temaet var
   en kulepunktliste inne i en annen guide.

---

## 4. Tiltak implementert (preview)

### A. Innholdsarkitektur: pilar + spokes

`lib/guides.js` (én fil, 6 guider) er erstattet med `lib/guides/` — tematiske filer med
**12 guider**, én per reell søkeintensjon.

**Seks nye guider, alle med målt søkevolum i GSC:**

| Ny guide | Målte søk | Visn i cluster | Posisjon i dag |
|---|---|---|---|
| `depositumskonto` | «må utleier ha egen depositumskonto», «depositum på privat konto», «depositumskonto regler», «hvem får rentene» | ~71 | 10–52 |
| `leietaker-har-ikke-betalt-depositum` | «leietaker (har) ikke betalt depositum», «leietaker betaler ikke depositum» | ~79 | 10–19 |
| `depositum-tilbakebetaling` | «når skal depositum tilbakebetales», «hvor lenge kan utleier holde tilbake» | ~48 | 5–30 |
| `fradrag-utleiebolig` | «fradrag utleie sekundærbolig», «avskrivning utleiebolig», «leieinntekter» | ~67 | 40–61 |
| `godkjent-utleiedel` | «gråsone utleie bolig», «hva koster det å få godkjent utleiedel» | ~22 | 27–39 |
| `husleieokning` | innholdsluke — ingen side dekket KPI-justering/gjengs leie | 0 (hypotese) | — |

`husleieokning` er den eneste som ikke har målt etterspørsel, fordi vi ikke hadde innhold
å rangere med. Etterspørselen er en **hypotese** som må valideres i GSC etter deploy.

**Seks eksisterende guider omskrevet** med query-matchede titler, nøkkeltall og interne
lenker. De viktigste tittelendringene:

| Side | Før | Etter |
|---|---|---|
| hva-koster-utleiemegler | Utleiemegler pris 2026: 8–12 % og gebyrer | **Hva koster utleiemegler? Provisjon 8–12 % (2026)** |
| depositum-regler | Depositumskonto 2026: 6 regler utleier må følge | **Depositum ved utleie 2026: regler, beløp og frister** |
| korttidsutleie-regler | Airbnb-regler 2026: 90/30 dager, skatt og sameie | **Airbnb-regler 2026: 90 dager sameie, 30 borettslag** |
| skatt-pa-utleie | Skatt på utleie 2026: skattefritt, 22 % og fradrag | **Skatt på utleie 2026: når er leieinntekt skattefri?** |
| /leiemarkedet/bergen | Leiemarked Bergen 2026: leiepriser etter rom | **Leiepriser i Bergen 2026: snittleie per rom** |
| /utleiemegler-bergen | Utleiemegler i Bergen — moderne alternativ | **Utleiemegler i Bergen: pris fra 5 %, ingen binding** |
| /utleie/[bydel] | Leie ut bolig i X — pris og forvaltning | **Leie ut bolig i X 2026: leiepris og forvaltning** |
| /nyheter | Nyheter & guider om utleie | **Nyheter og innsikt om utleie i Bergen** |

`depositum-regler` er gjort om til **pilar** som lenker til de tre depositum-spokene,
og de dype detaljene er flyttet ut for å unngå ny intern konkurranse.

### B. Konsolidering av kannibalisering (301)

Fire nyhetsartikler er permanent redirigert til den tilsvarende guiden i
`next.config.js`, og ekskludert fra sitemap via `REDIRECTED_POST_SLUGS`:

| Fra | Til |
|---|---|
| /nyheter/skatt-pa-utleieinntekt-2026 | /guider/skatt-pa-utleie |
| /nyheter/hva-koster-utleiemegler-i-bergen-2026 | /guider/hva-koster-utleiemegler |
| /nyheter/leie-ut-bolig-i-bergen-komplett-guide-2026 | /guider/leie-ut-leilighet-bergen |
| /nyheter/selvforvaltning-eller-full-forvaltning | /guider/utleiemegler-vs-selvforvaltning |

Bergen-vinkelen fra prisartikkelen er absorbert som egen H2 i prisguiden, så ingen
substans er tapt. Ingen av artiklene hadde visninger, så risikoen er null.

### C. AEO (Answer Engine Optimization)

- **`speakable`** på Article og BlogPosting, pekt mot `h1` + `.dh-answer` (Kort svar-boksen)
- **«Nøkkeltall»-boks** øverst på hver guide: 3–5 tallfestede, siterbare punkter
- **`wordCount`** i schema (alle guider ≥ 700 ord, verifisert i probe)
- **`about` / `mentions`** — entitetskobling mot Lovdata, Skatteetaten, DiBK, SSB, HTU, Bergen
- **`keywords`** i schema, hentet fra faktiske GSC-søk
- **`HowTo`-schema** på `leie-ut-leilighet-bergen`, med **synlige** steg på siden
  (schema for skjult innhold bryter Googles retningslinjer)
- **Ankere (`id`) på hver H2** + innholdsfortegnelse → passasjelenking og seksjonsuthenting
- **FAQPage-svar** beholder interne lenker som absolutte `<a>` (tillatt HTML i Answer.text),
  mens `Question.name` er ren tekst
- **`llms.txt`** utvidet med alle 12 guider og en ny seksjon **«Direkte svar»** med 12
  korte, kildebelagte svar AI-motorer kan sitere direkte
- **`CollectionPage` + `ItemList`** på `/guider` og `/nyheter`

### D. Intern lenking

Ny minimal inline-markup (`[tekst](/sti)`, `**fet**`) rendres til ekte `next/link` via
`components/site/RichText.js`. Konsekvenser:

- Guidene lenker nå til hverandre i brødteksten der referansen er redaksjonelt naturlig
- Kommersielle sider (`/bli-utleier`, `/priskalkulator`, `/utleiemegler-bergen`,
  `/leiemarkedet/bergen`) får kontekstuelle lenker fra informasjonssider
- Nyhetsartikler får en «Grundige guider om dette»-seksjon som matcher tags mot guider
- Klyngenavigasjon (`GuideCluster`) holder pilar og spokes koblet begge veier
- Probe verifiserer at ingen intern guide-lenke peker på en ukjent slug

### E. Filer

**Nye:**
`lib/guides/index.js`, `lib/guides/pris.js`, `lib/guides/depositum.js`,
`lib/guides/skatt.js`, `lib/guides/utleie.js`, `components/site/RichText.js`,
`components/site/GuideToc.js`, `components/site/GuideCluster.js`,
`scripts/probe-seo-aeo.mjs`

**Endret:**
`lib/seo.js` (anchorId, stripMarkup, richToSchemaHtml, speakableSpec, guideWordCount,
guideArticleLd, howToLd, itemListLd, faqLd), `app/guider/page.js`,
`app/guider/[slug]/page.js`, `app/nyheter/page.js`, `app/nyheter/[slug]/page.js`,
`app/leiemarkedet/[by]/page.js`, `app/utleie/[by]/page.js`,
`app/utleiemegler-bergen/page.js`, `app/sitemap.js`, `next.config.js`,
`components/site/FaqSection.js`, `lib/llms-content.txt`

**Slettet:** `lib/guides.js` (erstattet av `lib/guides/`)

---

## 5. Redaksjonelle forbehold

- Alt juridisk og skattemessig innhold er skrevet med kildehenvisning til Lovdata,
  Skatteetaten, DiBK, SSB eller Husleietvistutvalget, og med disclaimer.
- **Ingen faste kronebeløp** er oppgitt for kommunale byggesaksgebyrer i
  `godkjent-utleiedel` — de endres årlig, og guiden ber leseren kontrollere gjeldende
  gebyrregulativ.
- Formuleringene om depositumsutbetaling og heving er holdt beskrivende, med henvisning
  til at leseren bør søke juridisk veiledning i konkrete konflikter.
- 10+2-modellen og «opptil 30 %» er fortsatt merket som potensialestimat, ikke garanti,
  med lenke til `/metode`.

---

## 6. Hva som må gjøres etter deploy

1. **Bruker må deploye** — ingenting over er live på digihome.no ennå.
2. **Send inn sitemap på nytt** i Search Console, og bruk «Inspiser URL → Ber om
   indeksering» på de seks nye guidene for raskere oppdagelse.
3. **Kontroller de fire 301-ene** i produksjon (Search Console → Sideindeksering).
4. **Rich Results Test** på én guide med HowTo og én med FAQ, for å bekrefte at Google
   leser schemaet i produksjonsmiljøet.
5. **Mål etter 3 uker** (CTR-effekt kommer først) og etter 6 uker (posisjonseffekt) med
   `scripts/analyse-seo.mjs`. Nøkkeltall å følge:
   - Total CTR: 1,7 % → mål 3,5–4,5 %
   - `hva-koster-utleiemegler`: 1,0 % → mål 4–6 % (rangerer allerede pos 7)
   - `depositum-regler` + spokes samlet: 0,5 % → mål 2,5–3,5 %
   - `leiemarkedet/bergen`: 1,1 % → mål 4–7 % (rangerer pos 6,3)
   - `skatt på utleie`: pos 41 → mål topp 20 via fradragsguiden og intern lenking
6. **Valider husleieokning-hypotesen.** Får den ikke visninger innen 6–8 uker, er
   antakelsen om søkevolum feil og guiden bør vurderes på nytt.

## 7. Ikke gjort — bevisste valg

- **`/tjenester` (pos 4,0, 0 klikk) og `/forvaltning` (pos 1,9, 0 klikk)** er ikke endret.
  Vi har ingen query-data for disse posisjonene, og å gjette på tittel uten å vite hvilket
  søk som utløste visningen er like sannsynlig å skade som å hjelpe.
- **«airbnb» (58 visn, pos 7,7)** og **«inspeksjonsreise» (35 visn, pos 26,5)** er ignorert.
  Det første er et navigasjonssøk mot airbnb.com, det andre er irrelevant for tjenesten.
- **Ingen nye blogginnlegg er publisert.** Blogg-artiklene lever i databasen, og DB-innhold
  i preview propagerer ikke til produksjon. Alt SEO-kritisk innhold er derfor lagt i kode
  (guider), som deployer atomisk. Nye redaksjonelle innlegg bør skrives i `/admin/artikler`.
- **Tenant-funnel** (`leilighet åsane leie` o.l.) er ikke bygget ut. Det er en egen
  strategisk beslutning, ikke et SEO-tiltak, og bør avklares før det investeres i innhold.
