# PRD — DigiHome markedsside (Next.js) · oppdatert 2. juli 2026

## Produkt
Konverteringsoptimalisert markeds-/SaaS-side for DigiHome (utleieforvaltning Bergen) med
Google Ads/Meta-landingssider, DB-drevet blogg (/nyheter), og et fullt admin-/annonse-
dashbord (Finance & Ads, KPI, Pulse, funnel-tracking, SerpAPI-konkurrentgalleri,
Google Ads-styring via native REST API).

## Godkjent «Head of Marketing»-plan (bruker: «fortsett med p0 p1 og p2»)
- P0: Fikse 500 på POST /api/admin/ads/campaign/bidding — ✅ FERDIG (rotårsak: duplisert
  `export setAdStatus` i lib/google-ads-native.js veltet hele modulen). Live-endring utført:
  begge kampanjer kjører nå TARGET_SPEND (Maximize Clicks) med CPC-tak 32 kr (hoved
  23984331113) / 45 kr (conquest 23995748632). validateOnly-støtte lagt til.
- P1a: /lp/sammenlign (DigiHome vs. tradisjonell utleiemegler, 0 kr vs 15–25k oppstart)
  — ✅ FERDIG via LANDING-config + ny sammenligningstabell-seksjon i CampaignLanding.
- P1b: Auto-kvittering til lead + umiddelbar admin-varsling via SendGrid — ✅ FERDIG
  (lib/lead-emails.js; koblet på POST /api/leads (kvittering+varsel) og /api/tenants (varsel);
  status lagres som receipt_email/admin_notify på dokumentet; best-effort).
- P2a: RSA-tekster oppdatert LIVE («24t» → «umiddelbart» + 0 kr-prisankring): 4 nye annonser
  opprettet, 4 gamle pauset (via /api/admin/ads/update-messaging, dryRun-verifisert først).
- P2b: SEO-artikkel publisert: /nyheter/hva-koster-utleiemegler-i-bergen-2026 — ✅ FERDIG.

## Viktige beslutninger
- Sammenligningssiden bruker «Tradisjonell utleiemegler» som kolonne (juridisk trygg,
  faktabasert m/ fotnote) — fanger fortsatt Utleiemegleren-conquest-søk via annonsene.
- Annonse-final-URLs skal IKKE peke på /lp/sammenlign før ny versjon er DEPLOYET til
  digihome.no (ellers 404 på produksjonsdomenet).

## Gjenstående (backlog)
- P3: Refaktorere app/api/[[...path]]/route.js (~4000 linjer) til moduler.
- P3: Programmatiske SEO-bydelssider (/utleie/[bydel] utvidet), e-post nurture (SendGrid),
  statiske sider (/bli-utleier finnes; /forvaltning, /om-oss, /kontakt, /personvern finnes).
- Vurder: peke conquest-kampanjens final URL til /lp/sammenlign ETTER deploy.

## Test
- Backend-testagent 2026-07-02: 12/12 bestått (bidding validateOnly, lead-e-post,
  SEO-artikkel, regresjon pulse/campaigns/lp-sammenlign). Test-leads slettet.
- Admin: martin@kviteberg.no / Pyramiden2025## · legacy-nøkkel dh_admin_b3Kx92Qz7Lm4.

## 2026-07-02: LP-redesign (root-paritet)
- `/lp/*` (CampaignLanding, LeadFormPro, RentCalculator, lp-shared) redesignet til root-sidens designspraak: samme palett (#0a0a0a/#555/#888, lavendel #D298FF/#AE68E4/#9333EA), 1400px-container, fast header (72px, logo.svg, pill-CTA med sirkelpil), dot-grid-hero, bento-bildekomposisjon, root-stil kort/stats/testimonials/moerk CTA/FAQ.
- All konverteringslogikk beholdt uendret: 2-stegs skjema, tracking (GA4/Meta), A/B-test av H1, exit-intent, sticky mobil-CTA, leiekalkulator-event.
- Verifisert med skjermbilder desktop (1920px) og mobil (390px) paa /lp/inntekt og /lp/sammenlign.
- `/lp/leietaker` (CampaignLandingTenant) er IKKE redesignet enda.

## 2026-07-02 (2): Hero-stat, video-bytte, bolig-visning
- Hero-stat endret til "150+ Boliger" (HeroSection). For konsistens ogsaa oppdatert: StatsSection (150+), lib/site.js stats+statStrip (brukes av LP-ene), lib/og.js.
- Video paa forsiden (ServiceModelsSection) byttet fra /langtid-hero*.mp4 til /brandfilm-web.mp4 (samme som /pitch-deck), poster /brandfilm-poster.jpg. Baade ambient- og lyd-laget bruker naa brandfilmen.
- Sendt spec til plattform-agenten via agent-bridge (traad: homepage-properties, id b5a70fc7): behov for GET /api/properties/export (read-only, X-API-Key, publicConsent-filter, bydel ikke gateadresse, bilde-URLer, updatedSince). Venter paa svar foer bygging av "Boliger vi forvalter"-seksjon paa forsiden.

## 2026-07-03: Historiske leads i hoved-pipeline + Historisk analyse (P0 fullført)
- GET /api/admin/leads fletter naa inn `imported_leads` (44 stk: 38 huseiere → Utleiere-fanen, 6 leietakere → Leietakere-fanen) med `pre_tracking:true`, `forwarded:true` (aldri i «venter»-koeen). Egen kolleksjon → live ROAS/CAC/CPL paavirkes ALDRI (KPI-integritet verifisert: newLeads=19 kun sporede).
- Leads-tabellen (InnsiktDashboard): historiske rader har redigerbar kilde-select (manuell attribusjon → override + toveis CRM-synk via outbox), utvidet status-dropdown (Ny/Kontaktet/Kvalifisert/Befaring/Tilbud sendt/Vunnet/Tapt), lilla «Historisk»-merke i Sendt-kolonnen, «CRM» i Handling (AI/slett skjult). Toggle «Historiske (N)» i filterraden.
- Status/verdi-endringer paa historiske gaar via PUT /api/admin/imported-leads → override + pushback-koe (flushes mot CRM; 404 forventet til plattform-agenten leverer PATCH /api/leads/status).
- LeadDrawer: fallback i GET /api/admin/lead for imported-id (pre_tracking-lead, tom tidslinje), Historisk-badge, utvidede statuser, AI-vurdering skjult.
- «Historisk analyse»-panel i Historikk-fanen: historisk forbruk (seedet meta=34400, google=41 i `marketing_settings` id=historical_spend, justerbart via PUT /api/admin/imported-leads/spend), Blandet CPL (forbruk/44 leads = 783 kr), Historisk CAC (17 221 kr), Tilbakebetaling (CAC/snittverdi per mnd).
- Testet: backend-agent 18/18 bestaatt, skjermdumper av begge faner OK, `yarn build` exit 0.
- NESTE: (a) bruker-verifisering, (b) demote Historikk-fanen i sidemenyen (P3), (c) Google Ads-noekler mangler fortsatt i PROD (bruker maa redeploye/kontakte support), (d) CRM toveis-synk venter paa plattform-agent.

## 2026-07-03 (kveld): INVESTOR-ROM — levende DD-rom (Fase 1+2+3 fullført)
- NY offentlig side `/investor?t=<token>` (mørk premium-design): Konfidensielt-banner m/ mottakernavn, levende KPI-hero (MRR/ARR/enheter/LTV-CAC/payback), Vekst (MRR-graf 12 mnd SVG, MRR-bevegelse-stolper, NRR/GRR), Økonomi (resultat/runway/kontantgraf), Prognose (3 scenarier m/ velger), Dokumenter (per kategori m/ nedlasting), Q&A (still spørsmål + se svar), Metodikk-fotnoter. Ingen cookie-banner/tracking på /investor (SiteAnalytics + ConsentBanner ekskluderer).
- NY lib `/app/lib/investor-room.js`: magic links (token base64url-24B, revoke/utløp/seksjons-scoping), audit (investor_audit), dokumenthvelv (dd_documents, versjonering, bytes i Emergent objektlagring `digihome/dd/...`), chunked upload (dd_upload_chunks, 1MB chunks, maks 15MB, ext-whitelist), Q&A (dd_questions m/ isPublic-deling).
- API admin (nøkkel-gatet): GET /admin/investor-room, POST/PUT/DELETE .../links, POST .../upload-chunk + .../upload-complete, PUT/DELETE .../docs, GET .../file, PUT/DELETE .../qa. Offentlig (token): GET /investor/room (boardPack gjenbrukt, 5 min prosess-cache, NULL PII), GET /investor/file (+audit), POST /investor/qa.
- Admin-UI: ny sidemeny-seksjon «Investor-rom» (Ledelse-gruppen) → /app/components/admin/InvestorRoomTab.js med 4 paneler: Lenker (opprett+kopier, stats per lenke: visninger/nedlastinger/spørsmål, revoke/slett), Dokumenter (chunked opplasting m/ progress, ny versjon, arkiver), Q&A (svar inline + «Del med alle»), Aktivitet (audit-tidslinje).
- Testet: backend-agent 9/9 bestått (inkl. PII-sjekk, revokering→403, arkivering→404, byte-match nedlasting, opprydding). yarn build exit 0.
- QA-testdata som ligger igjen (med vilje): lenke «QA Testinvestor» + dokument «QA Testdokument» — bruker kan slette i admin.
- NESTE: bruker-verifisering av UI, evt. frontend-agent-test. Fortsatt åpent: demote Historikk-fanen, Google Ads-nøkler i prod, CRM-synk (plattform-agent).

## 2026-07-04: Bugfiks /bli-utleier-skjemaet (fra bruker)
- FEIL 1: Bergen-landingssiden (LocationPage.js) sendte `?address=Bergen` (bynavn) → skjemaet pre-fylte adressefeltet og trigget hjemmelshaver-/Eiendomsregister-oppslag paa bynavnet. FIKS: (a) LocationPage-CTAer bruker naa `/bli-utleier?start=1` (hopper til skjemaet via ScrollToForm, ingen pre-fill), (b) guard i BliUtleierPage.tsx: `?address=` pre-fylles + registeroppslag KUN naar verdien inneholder siffer (ekte gateadresse m/ husnummer); ellers bare hopp til adressesteget. `?start=1` hopper ogsaa rett til adressesteget.
- FEIL 2: «Neste»/«Tilbake» kjoerte `window.scrollTo(top:0)` → havnet paa sidetoppen (skjemaet ligger under hero paa /bli-utleier). FIKS: ny `scrollToFormTop()` som scroller til `#skjema` med 84px navbar-offset, og KUN naar skjematoppen er utenfor viewport.
- Verifisert: Playwright-test (tomt felt ved ?address=Bergen; stegbytte lander paa skjematopp, ikke sidetopp), /utleie/bergen 200 med nye lenker, yarn build exit 0.

## 2026-07-04 (ettermiddag): Forside-redesign — minimalistisk premium (brukerfeedback: «for mye lilla / AI-template»)
- DESIGNPRINSIPP ETABLERT: Lilla beholdes KUN paa logo + primaer-CTA («Bli utleier»-knappens sirkel). All dekor er naa redaksjonell ink/varm graa. Stjerner i dempet gull (#cda45c), suksess/live-indikatorer i emerald.
- Kickers: alle lilla pille-badges (bg-#f5edfc/border-#e9d9fa) byttet til tynn strek (w-7 h-px ink/25) + uppercase tracking-[0.22em] text-[#8f8a80] — i 11 forsideseksjoner.
- HowItWorksSection.tsx: totalredesign — redaksjonelt grid m/ hairline-topplinjer, smaa numeraler (01-04), ingen kort/ikoner/spokelsestal/gradient-linjer. Venstrestilt header m/ undertekst hoeyre.
- Ovrige dempinger: Hero (gronn live-puls, gronne inntektsikoner, ink fokusring/streker), ServiceModels (hvit «Mest populaer»-badge, frostet ikonchip, hvit/ink highlight-tekst), DynamicRental (ink toggle), Network/WhyChooseUs (noeytrale ikonchips), Testimonials (gull-stjerner, noeytral initial-sirkel), AboutCEO (ink sitat-strek), CTA/MobileCTA/PartnersBar/Faq (hvit/noeytral), Footer (emerald suksess, hvit fokusring), scroll-progress i globals.css: lilla gradient -> ink.
- HEADER TOTALREDESIGN (Header.tsx): «floating pill» fjernet -> fullbredde redaksjonell header der innholdet ligger i SAMME container som seksjonene (max-w-[1400px] px-6 sm:px-10 lg:px-16). Verifisert flukt: logo x=324 = hero-h1 x=324. Scrollet: bg-white/85 blur + hairline border-b (ingen skygge), h 76->62px. Mobilmeny: ink i stedet for lilla.
- yarn build exit 0. Skjermdumper verifisert (hero, how-it-works, midtseksjoner, testimonials, scrollet header).

## 2026-07-04 (sen ettermiddag): Aksentfarge-system #d298ff (verdensklasse-runde)
- Prinsipp: ETT lavendel-signaturoyeblikk per seksjon, aldri dekor-stoy. Implementert: alle kicker-streker (w-7 h-[2px] rounded bg-#d298ff), hero H1 aksent-punktum + stat-streker, Stats-streker, HowItWorks hover-border, Quality-kulepunkter, ServiceModels highlight-tekst + pil paa moerkt kort (#d298ff paa sort), CTA-seksjon lavendel-glow + checks + knapp-hover, Footer nyhetsbrev-hover, MobileCTA-pil, scroll-progress i #d298ff. ::selection var allerede lavendel (35%).
- yarn build exit 0, skjermdumper verifisert.

## 2026-07-04 (kveld): Google Ads-diagnose + optimalisering utfort via API
- PROD-SAK: «Google Ads-API ikke konfigurert» i Konkurrentanalyse = de 6 GOOGLE_ADS_*-noklene mangler i prod (finnes i preview /app/.env linje 47-52: DEVELOPER_TOKEN, CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, LOGIN_CUSTOMER_ID, CUSTOMER_ID). Bruker skal redeploye; evt. Emergent Support.
- LP-DIAGNOSE (live GAQL): 7 LP-er, kun 3 med annonser (inntekt 74 visn/5 klikk -> 11% konv!, forvaltning 50/3, sammenlign 32/1). AG3 (10pluss2) hadde kun nullvolum-fantasifraser -> 0 visn. arvet-bolig + airbnb-langtid hadde INGEN annonsegrupper. Budsjettutnyttelse ~1% (183 kr/30d av 450 kr/dag). CPC-tak allerede 45 kr (ikke flaskehals).
- UTFORT I KONTOEN (kampanje 23984331113): (1) AG3: pauset «kombinere korttid og langtid», «trygg utleie av bolig», «utleie uten risiko»; lagt til «airbnb forvaltning» + «korttidsutleie av bolig» (geo tar Bergen). (2) NY AG4 - Airbnb (adGroups/206548314668) -> https://digihome.no/lp/airbnb-langtid m/ RSA (norsk, path1=airbnb) + sokeord: «leie ut på airbnb», «airbnb utleie», «drifte airbnb», «airbnb vert», «hjelp med airbnb». Feilstavet utkast (uten å) pauset og erstattet. Policy: under review (normalt).
- BESLUTNING: arvet-bolig far IKKE search-annonser (nullvolum-intent) — reservert Meta.
- NESTE: folge opp AG4-visninger om ~1 uke; Meta prospecting-diskusjon startet med bruker.

## Økt 4. juli 2026 — To-nivå tier-modell + Google Maps-adressesøk
- ✅ FERDIG: «Bli utleier» har nytt steg 4 «Forvaltning» (ETTER adresse+kontaktinfo):
  Selvforvaltning (5 % per utleie, klikk-aksept av avtale kreves — versjon
  'selvforvaltning-2025-06') vs. Full forvaltning (INGEN pris vises — kun «Få tilbud»,
  «Mest valgt»-badge). Skjemaet er nå 6 steg. Tier-tilpasset bekreftelsesside, submit-CTA
  («Fullfør registrering» / «Få tilbud») og suksess-skjerm.
- ✅ Backend: POST /api/leads aksepterer tier (whitelist) + terms{version} → terms_accepted
  {version, at:<server-tid>}; begge videresendes til plattformen. Webhook-alias
  POST /api/webhooks/conversion (= lead-status-handler, samme LEAD_SYNC_SECRET).
  Backend-testet 7/7 (test-leads slettet).
- ✅ E-poster: buildLeadReceipt har 3 varianter (selvforvaltning: avtale-kvittering m/
  tidsstempel + konto-steg; full: tilbuds-løp UTEN pris; default uendret).
  Admin-varsel: gul tier-pill + «Valgt spor»/«Avtale»-rader + tier i emnet.
- ✅ Google Maps-migrering (ALLE adressefelter — brukers P0 fra forrige økt):
  /api/address bruker nå Google Places Autocomplete (Bergen-bias 30 km, country:no,
  language:no) med Geonorge som fallback. Nytt: ?place_id= → Place Details for
  postnummer/poststed. Nøkkel: GOOGLE_MAPS_API_KEY i .env (samme som deckens statiske
  kart — verifisert at Places API er aktivert). AddressAutocomplete velger nå postnummer
  via Details-oppslag. Migrerer automatisk: BliUtleier, Hero-søk, PriceWizard, /sommer.
- ✅ Mobil-UX-fiks adressefeltet: ved fokus (<768px) scrolles feltet til toppen så
  forslagslisten ikke skjules bak sticky-bar/cookiebanner; dropdown har maks-høyde+scroll.
- ✅ Agent Bridge: kontraktsmelding sendt til plattform-agenten (tråd integration-contract,
  id ffc74201): tier-ruting, terms_accepted, webhook-events (avtale_signert/tilbud_akseptert/
  tilbud_avslatt/eiendom_onboardet/leie_aktiv), BankID hos plattformen, ingen prislekkasje
  for full forvaltning.
- VIKTIG FOR PROD: GOOGLE_MAPS_API_KEY må også settes i produksjonsmiljøet ved neste deploy.

## Gjenstående etter denne økten
- Vente på svar fra plattform-agenten i integration-contract-tråden (tier-ruting bekreftet?).
- Google Ads API-nøkler mangler fortsatt i PROD (bruker må redeploye med env-vars).
- P3: Skjule/nedprioritere Historikk-fanen i admin.
- P2: Refaktorere app/api/[[...path]]/route.js (~5200 linjer) til moduler.
- P3: Programmatiske SEO-sider /utleie/[bydel]. P4: Meta prospecting-kampanje.

## Økt 5. juli 2026 — Komplett SEO/AEO-overhaling (alle P0+P1+P2 fikset)
- ✅ TITLER: Fjernet dobbel/trippel «| DigiHome» på 8 sider + alle artikler
  (rotårsak: layout-template `%s | DigiHome` + branding i side-titler/seoTitle;
  artikkel-metadata stripper nå innbakt branding fra DB-verdier).
  /bli-leietaker fikk ny SEO-tittel «Leie bolig i Bergen — kvalitetssikrede utleieboliger».
- ✅ llms.txt totalskrevet: Digihome AS (ikke SHD), 150+ boliger (ikke 30+), konsistent
  «opptil 30 %», ny seksjon om to-nivå-modellen, alle nye sider + oppdatert FAQ.
- ✅ KONSISTENS: BliUtleierPage endret 40 % → 30 % (3 steder: welcome-badge, welcome-bullet,
  tier-bullet) så hele nettstedet + llms.txt sier samme tall. NB: si fra hvis 40 % var ønsket!
- ✅ /investor: noindex via ny app/investor/layout.js (var indekserbar!).
- ✅ /blogg → /nyheter: 308 permanent redirect i next.config.js (+ /blogg/:slug), nav-data fikset.
- ✅ Leiemarked-titler bruker inneværende år (2026) — datakildeår beholdes i beskrivelsen.
- ✅ SITEMAP: +priskalkulator, +sommer, +support, +vilkar, +personvern (36 URL-er totalt).
- ✅ JSON-LD på alle sider som manglet: tjenester/forvaltning/bli-utleier/bli-leietaker/
  radgivning (Service+Breadcrumb), om-oss (AboutPage), kontakt (ContactPage),
  nyheter (CollectionPage+ItemList), leiemarkedet (CollectionPage), priskalkulator
  (WebApplication), video/sommer (Breadcrumb). Ny delt lib: /app/lib/seo.js.
- ✅ FAQ-seksjoner (synlig innhold + FAQPage-schema) via ny /app/components/site/FaqSection.js:
  /forvaltning (5 spm — INGEN pris for full forvaltning, kun «tilbud»), /tjenester (4 spm),
  /bli-leietaker (5 spm). Tynt innhold fikset: bli-leietaker 186→370 ord, tjenester 349→493,
  forvaltning 339→531, leiemarkedet 166→292 (ny metode/bruksverdi-seksjon).
- ✅ H1-fikser: /video hadde 2×H1 (animasjonstitler → div, sr-only H1 på siden),
  /priskalkulator hadde 0 H1 (sr-only H1 + schema). Typo «Snåkk»→«Snakk» på /radgivning.
- ✅ 2 NYE AEO-ARTIKLER publisert i posts-collection:
  «Leie ut bolig i Bergen: Komplett guide (2026)» (slug leie-ut-bolig-i-bergen-komplett-guide-2026)
  og «Selvforvaltning eller full forvaltning» (slug selvforvaltning-eller-full-forvaltning) —
  begge med interne lenker, unsplash-covers (vision_expert), BlogPosting-schema. 6 artikler totalt.
- Verifisert: full HTTP-audit (alle sider 200, ingen dobbel branding, schema OK) + skjermbilder.
- GJENSTÅR (anbefalt senere): flere leiemarked-byer (krever verifiserte SSB-data),
  10-15 flere artikler, kildehenvisning på «98 %»-påstanden.
