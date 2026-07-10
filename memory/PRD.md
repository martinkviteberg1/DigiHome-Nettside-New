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

## Økt 5. juli 2026 (del 2) — E-postfikser (lead-varsler + kvittering) + llms.txt prod-fix
- ✅ FONTER: Fjernet @font-face (PP Right Grotesk/ABC Diatype) fra e-postene — ga uskarp/
  rar fallback i e-postklienter. Nå ren systemstack i lead-emails.js (nyhetsbrev hadde det alt).
- ✅ KAPITALISERING: cap()/titleCase()-hjelpere — Boligtype/Bygningstype/pills/modell vises nå
  «Leilighet», «Enebolig», «Huseier»; hjemmelshaver fra grunnbok CAPS → «Lilleng Anita»
  (selskapsformer AS/ASA/DA bevares i versaler).
- ✅ FJERNET «Søkeord» og «Klikk-ID» fra Sporing-seksjonen i admin-varselet (brukers ønske).
- ✅ LANDINGSSIDE er nå klikkbar lenke til full URL (BASE_URL + sti, «/» vises som «Forsiden»).
- ✅ LOGO: email-logo.png lastet opp til objektlagring (scripts/upload_public_to_storage.mjs
  --only email-logo.png) og e-poster (lead + nyhetsbrev) peker nå på /api/media/email-logo.png
  — /public følger IKKE med standalone-bygget i prod (rotårsak til 404 i brukers e-postklient).
- ✅ llms.txt VAR DØD I PROD (404 på digihome.no/llms.txt av samme grunn): innholdet flyttet til
  /lib/llms-content.txt + ny route /app/app/llms.txt/route.js + outputFileTracingIncludes.
  public/llms.txt er FJERNET (route + public-fil gir konflikt).
- Verifisert: 10/10 innholdssjekker + visuelle skjermbilder av admin-varsel og kvittering
  via /api/admin/leads/email-preview. /llms.txt 200 lokalt. Prod-logo verifisert 200 på digihome.no.

## Økt 5. juli 2026 (del 3) — Nyhetsbrev-editor: 4 oppgraderinger (Melding 281)
- ✅ TEST-UTSENDING: POST /api/admin/newsletter/test tar nå flere mottakere (kommaseparert
  eller array, maks 10, dedupe/validering) + valgfri `message` → gult banner «Melding fra
  avsender · vises kun i test» øverst i e-posten (renderNewsletterHtml({testNote})).
  UI: popover m/ flermottaker-felt + meldingstekstboks (NewsletterTab.js).
- ✅ WEBP: /api/admin/newsletter/upload konverterer nå ALT til WebP (sharp, q80, maks 1200px,
  EXIF-rotate, animert GIF beholder animasjon). Content-Type image/webp verifisert av testagent.
- ✅ BILDEKONTROLLER: Dra-håndtak nederst på bilde/hero i editoren (60–900px clamp, live
  px-badge) + inspektørfelt Høyde (tall/Auto) og Tilpasning (Fyll/Tilpass/Strekk = cover/
  contain/fill). Serialiseres til e-post-HTML (height + object-fit; klienter uten støtte
  viser bildet uskalert).
- ✅ BOLIGER-BLOKK: Ny «Boliger»-blokk i paletten. PropertyPicker i inspektøren henter
  /api/admin/properties (fallback /api/public/properties), maks 6 valg, snapshot
  {pid,title,image,meta,band} lagres i blokken. E-post: 2-kolonners kortgrid + sporet CTA.
- Testet: backend-agent 15/16 PASS (eneste avvik: Cache-Control immutable overstyres i dev
  — uvesentlig). Node-sanitetstest av render 10/10. Skjermbilder: palett, picker m/ ekte
  boliger, valgte kort i canvas, 220px+contain, dra-håndtak, test-popover.
- OBS: Testutkast «Sommerkampanje 2026» (opprettet av automasjonen) er slettet fra DB.

## Økt 5. juli 2026 (del 4) — Annonsestudio "Verdensklasse 2026": Fase A + B + C
- ✅ FASE A — AI-briefs + nye kampanjer fra UI:
  - lib/adstudio.js: searchGeoLocations (Meta adgeolocation, NO), createCampaign (PAUSED,
    validate_only-støtte), createAdSet (PAUSED, leads→OFFSITE_CONVERSIONS+pixel LEAD /
    traffic→LINK_CLICKS, geo land/by+radius, alder, advantage_audience 0 m/ auto-retry).
  - route.js: GET /admin/adstudio/geosearch, POST /admin/adstudio/campaign (lagrer i
    studio_campaigns, nullstiller ctx-cache), POST /admin/adstudio/aibrief (3 sesong-
    baserte briefs m/ leads-count + siste annonser som kontekst, LLM-feature annonsestudio_brief).
  - UI: Steg 0 har nå fane «Eksisterende annonsesett | + Ny kampanje» (NewCampaignPanel:
    navn, mål, dagsbudsjett, geo-søk m/ debounce, alder, oppsummering, auto-velg nytt adset
    etter opprettelse). Brief-steget har «La AI foreslå brief»-tryllestav → 3 klikkbare forslag.
- ✅ FASE B — Per-plassering autoformatering (9:16 + 1.91:1):
  - VIKTIG FUNN (empirisk verifisert, scripts/test-image-edit.mjs): Emergent
    /llm/v1/images/edits STØTTER bilde-til-bilde med gemini/gemini-3-pro-image-preview
    (multipart: model+prompt+image, INGEN n-param → 400). Modellen respekterer 9:16-
    instruks i prompt (768x1376, motiv bevart). gemini-2.5-flash-image ignorerer AR.
  - POST /admin/adstudio/formats {assetId} → story 1080x1920 + landscape 1200x628
    parallelt (AI-outpainting m/ AR-validering + sharp cover-normalisering; fallback
    sharp blur-extend method 'smart'), laster opp til Meta, logger bildeforbruk.
  - buildAssetFeedSpec (asset_feed_spec m/ adlabels dh_kvadrat/dh_story/dh_bred +
    asset_customization_rules: story→FB/IG story+reels, bred→right_column+search,
    kvadrat→catch-all). create + preview bruker den når storyHash/landscapeHash sendes;
    preview får da INSTAGRAM_STORY som 4. format. studio_ads lagrer placementCustomized.
  - UI: «Formater for alle plasseringer»-panel etter bildevalg (genererer, viser 3 thumbs
    m/ AI/smart-badge), kvalitetssjekk «Alle plasseringer dekket», formats i draft.
- ✅ FASE C — Verdensklasse 2026 UI:
  - Framer Motion: steg-overganger (AnimatePresence slide+blur), mockup-crossfade,
    suksess-skjerm m/ spring-ikon.
  - 3-veis mockup-veksler Facebook/Instagram/Story + ny StoryMockup (9:16 telefonramme,
    gradient-overlays, progresjonsbar, CTA-pille; bruker formats.story.url når generert).
  - Pre-flight sjekkliste i Publiser-steget (7 punkter m/ grønn/gul/rød status + teller).
  - «Alle formater»-badge i Mine annonser.
- TESTET: backend-agent 21/21 PASS (geosearch/aibrief/campaign-validate/media/formats/
  preview/regresjon). formats: begge method='ai' på 18,5s. campaign validateOnly → 502
  'utviklingsmodus' er FORVENTET til Meta-appen settes Live.
- OBS: screenshot_tool klarte ikke admin-innlogging (kjent gjenganger) — frontend visuelt
  uverifisert av hovedagent; venter på bruker/frontend-agent.

## Økt 5. juli 2026 (del 5) — Annonsestudio Fase 2: AI-kampanjesider (message match)
- ✅ POST /admin/adstudio/lp/generate: LLM (feature annonsestudio_lp) skriver komplett
  LP-config {slug, eyebrow, h1, h1B, sub, bullets[3], heroStat, proofNote, formTitle,
  cta, metaTitle, metaDesc} med message match 1:1 mot annonseteksten. 400 uten message/headline.
- ✅ POST /admin/adstudio/lp: publiserer til studio_lps (status live) m/ slug-sanitering
  + unikhet (suffix -2, -3 mot statiske LANDING-slugs og DB). Returnerer {slug, path, url}.
  GET /admin/adstudio/lps: liste (maks 30) til destinasjonsvelgeren.
- ✅ lib/landing.js: normalizeStudioLp(doc) → eksakt samme cfg-form som statiske sider
  (CampaignLanding rendrer 1:1, faq=COMMON_FAQ, source=lp-<slug> → lead-sporing gratis).
- ✅ /app/app/lp/[slug]/page.js: dynamicParams=true + revalidate=60 (ISR) +
  generateStaticParams for statiske slugs; resolveCfg = getLanding || studio_lps-oppslag.
  notFound() kastes i generateMetadata. KJENT DEV-QUIRK: ukjent slug → 200 m/ 'Ikke
  funnet'-tittel i dev (rot-loading.js streamer); prod/ISR gir ekte 404. IKKE en bug.
  MERK: force-dynamic ble prøvd først men ga 200 på ukjente slugs → byttet til ISR.
- ✅ AdStudioTab (Tekst-steget): «Egen kampanjeside — message match»-panel under
  Destinasjon: Generer (krever message+headline) → redigerbart utkast (slug-input,
  h1/sub/bullets/heroStat-preview) → Publiser (live) → settes automatisk som
  destinasjon + legges i destinasjonsvelgeren (customLinks). lpCreated/customLinks
  persisteres i draft. Annonsebildet (media.url) brukes som LP-hero.
- TESTET: backend-agent 16/16 PASS (generate/publish/unikhet/liste/rendering/noindex/
  regresjon/opprydding). LP-generering ~13 sek.

## Økt 5. juli 2026 (del 6) — Fjernstyring av plattformens LLM-modeller (via broen)
- ✅ PUT /admin/usage/llm/model med scope:'platform' → model_override_request i
  agent_bridge (thread 'model-control', from 'marketing', data {kind, feature, model}).
  Uten scope: uendret (landingsside-overrides m/ AVAILABLE_MODELS-validering).
- ✅ GET /admin/usage/api: nye felter platformControl (status per feature utledet
  kronologisk fra model-control-tråden: pending/applied/rejected, både type og
  data.kind sjekkes) + platformModels (7 kuraterte: gpt-5.4, gpt-5-mini, gpt-4o-mini,
  claude-sonnet-4-6, claude-haiku-4-5, gemini-2.5-pro, gemini-2.5-flash).
- ✅ POST /agent-bridge: whitelistet model_override_request/applied/rejected
  (koerseres ikke lenger til 'note').
- ✅ UI (ApiUsageTab): plattformens AI-rader har modellvelger + statuschip
  (⏳ venter / ✓ aktiv / avvist m/ årsak i tooltip). Optimistisk oppdatering.
- ✅ Kontrakt: docs/INTEGRATION_CONTRACT.md §10 + spec-melding annonsert på broen
  (scripts/announce-model-control.mjs — kjørt, 24 mld i integration-contract).
- VIKTIG: Faktisk modellbytte krever at PLATTFORM-agenten implementerer mottak
  (poll model-control → anvend → kvitter model_override_applied). Bruker må be
  plattform-agenten «les broen (integration-contract) og implementer model-control».
- TESTET: backend-agent 7/7 PASS (request/pending/applied/rejected/validering/
  regresjon/opprydding). Whitelist-fix eksplisitt verifisert.
- ✅ (del 6b) KOMPLETT driftsinstruks publisert på broen (scripts/publish-model-control-ops.mjs):
  spec-melding i thread 'model-control' (data.kind ops_instructions) med poll-URL-er for
  BÅDE preview og prod (digihome.no), auth (samme AGENT_BRIDGE_SECRET), 5-min polling m/
  since-markør per miljø, idempotens på id, eksakte JSON-envelopes, kuratert modelliste,
  krav om kvittering til SAMME miljø, testprosedyre. + pointer-note i integration-contract.
  Verifisert lesbar via GET /api/agent-bridge?thread=model-control.

## Økt 5. juli 2026 (del 7) — Verdensklasse performanceanalyse (PROD, read-only)
- Prod-tilgang verifisert: admin-API på digihome.no svarer med samme ADMIN_KEY (kun GETs brukt).
- FUNN: 58 huseier-leads (mars–juli), uke 27 beste uke (8). 90d: 18 526 kr annonser → blandet CPL 394 kr
  (30d: 214 kr). Juni-forbruk -53% men leads stabile → organisk base ~14/mnd. Google mikrotest CPL ~51 kr
  vs Meta 6 107 kr/pixel-lead. Skjema-funnel lekker 61% på steg 2 «Dine mål» (56 starts → 7 submits).
- KRITISK: CRM-webhooks peker på PREVIEW (bekreftet i broen 5/7) → prod-statuser frosset (49/58 new),
  wonValue=0. tier=None på alle prod-leads. 52/58 mangler attribution (eldre leads).
- STAGES: bevisst mapping (IKKE identiske): vi new/contacted/qualified/won/lost + funnelStage
  (viewing_booked/contract_sent) ↔ CRM new/contacted/qualified/viewing/proposal/signed/lost/disqualified.
  Avtalt i kontrakt: viewing→viewing_booked, proposal→contract_sent, signed→won, offer→proposal.
- BRO-STATUS: alt besvart unntatt model-control (0 svar); åpent: CRM-webhooks→prod, usage/external 404 i
  CRM-prod, deres webhook-401.
- Scripts: /app/scripts/fetch-prod-analysis.sh + analyse-prod.py (gjenbrukbare).

## FINN-studio (jul 2026) — FINN.no som tredje markedsføringskanal
- Research: FINN har IKKE annonsør-API (display bookes via selger, materiell → adops@finn.no 3 virkedager før).
  Priser 2026: Board/Netboard på FINN eiendom 110 CPM (+45 Bergen-lokasjon ≈ 155 kr CPM). Import-API for
  rubrikkannonser finnes (partneravtale) — mulig fremtidig auto-publisering av utleieboliger.
- Bygget komplett FINN-studio under Innsikt (Layers-ikon): 3 faner.
  1) Bannerstudio: WOW-motor i /app/lib/finn-banners.js (SVG→sharp, 4 temaer: midnatt/nordlys/krem(serif)/plakat,
     eyebrow-chip, aksentord, CTA-pil, alle 7 FINN-formater innenfor vektgrenser). Live preview m/ FINN-feed-mock,
     AI-tekst (4 vinkler), AI-bakgrunn (Nano Banana), design-bibliotek (finn_designs), ZIP m/ leveringsinstruks.
  2) Planlegger: budsjett/CPL-kalkulator (scenarioer), ferdig booking-e-post (m/ skreddersøm-spørsmål om
     utleier-segment), pilot-sjekkliste (localStorage).
  3) Kampanjer & måling: manuell FINN-rapport (finn_campaigns) + automatisk UTM-måling (utm_source=finn&utm_medium=display),
     benchmark mot Meta/Google CPL, budsjettprogresjon.
- Betalt trakt: 'finn' er egen betalt kanal (paidChannelOf i analytics-server.js); forbruk/klikk fra finn_campaigns.
- API: /api/admin/finnstudio/{copy,render,genbg,designs,campaigns} — alle testet 33/33 PASS.
- AdsTrendView («Utvikling» i AdsTab): full filtrering lagt til (søk/kanal/status/kampanje, stabile farger).
- ÅPENT: «Brukere & tilgang» (invitere markedsføringsteam, roller owner/markedsfører, SendGrid-invitasjon) — diskutert, ikke bygget.

## Økt 10. juli 2026 — RecipientPicker ferdig + selvbetjent løp + toveis slette-synk
- ✅ RecipientPicker (nyhetsbrev-mottakervelger): forrige økts integrasjon var UFULLSTENDIG
  (manglet import/state/rendering i NewsletterTab.js — knappen ville krasjet). Fikset +
  verifisert med skjermbilder (43 mottakere, status-chips, søk, ekskludering, bulk).
- ✅ SELVBETJENT LØP (beslutning: selvforvaltning = kunde, ikke salgslead):
  POST /api/leads m/ tier='selvforvaltning' + terms → status='won' + self_service=true +
  wonAt=createdAt + statusHistory via 'self_service'. Holdes utenfor computeVelocity.
  Admin-e-post har egen variant («Ny kunde (selvforvaltning): … — opprett konto», lilla
  eyebrow + infoboks om manuell konto-opprettelse inntil auto-provisjonering).
  «Selvbetjent»-badge (amber) i LeadsPipeline + LeadDrawer. forwardToDigiHome returnerer
  nå account (magic link-forberedelse) → lagres som platform_account + returneres i
  API-respons; BliUtleierPage viser «Gå til kontoen din»-knapp når account.onboarding_url
  kommer (validerer https). Backend-testet 8/8 (QA-leads slettet).
- ✅ SPEC SENDT over broen (tråd selfservice-provisioning, id d8365496): plattformen skal
  auto-provisjonere konto ved tier=selvforvaltning + terms_accepted, returnere synkron
  magic link i POST /api/leads-responsen, sende velkomst-e-post (re-inngang + e-postverif.)
  og webhooks (avtale_signert → won-bekreftelse, leie_aktiv → value_update). VENTER SVAR
  (Q1 synkron mulig? Q2 BankID vs e-postverif.? Q3 bekreft tier-ruting 04.07, Q4 ETA).
- ✅ TOVEIS SLETTE-SYNK (etter diskusjon om sletting/KPI-er):
  INN: webhook godtar event:'lead_deleted' (aliaser lead_archived/deleted/slettet) →
  soft delete m/ tombstone (deletedBy:'platform') i leads/tenant_leads/imported_leads;
  ukjent ref → 200 skipped, ALDRI speil-opprettelse for slette-events.
  UT: archive/undo/hard-delete sender archived:true|false via lead_pushback_outbox til
  PATCH /api/leads/status (nytt felt i queueLeadPushback); respons har crmSync.
  Backend-testet 11/11 (QA ryddet, baseline 19 verifisert).
- ✅ PURRING + kontrakt sendt i closed-loop-tråden (id 7a4bfbd6): lead_deleted-mottak LIVE
  hos oss, archived-utsending LIVE — plattformen må implementere begge + svare på
  09:49-spørsmålene (soft/hard delete hos dem? event i dag? ukjente felter i updates[]?).
- KPI-forklaring gitt bruker: arkivert/hard-slettet teller INGENSTEDS (deleted-filter
  overalt); disqualified teller i CPL/råvolum men UTENFOR vinnrate; Meta/Google beholder
  alt som allerede er fyrt uansett sletting hos oss.
- GJENSTÅR/VENTER: (a) plattform-svar på selfservice-provisioning-spec, (b) plattform-svar
  på slette-synk-kontrakten, (c) Geonorge/Infotorg-adressebytte (BLOKKERT av bruker),
  (d) prod-publish av alt dette når bruker er klar.
