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

## Økt 10. juli 2026 (kveld) — Nyhetsbrev-konvertering synlig i admin
- ✅ «Leads generert»-løkken lukket visuelt: GET /admin/newsletter/campaign returnerer nå
  stats.leadsGenerated/leadsCount/leadsWon (match på newsletter_source.campaignId).
  StatsView: 6. KPI-kort «Leads» + seksjon «Leads fra dette nyhetsbrevet» (navn, via
  lenke/e-post-match, verdi, status, tid). LeadDrawer: «Nyhetsbrev · <kampanje>»-badge.
  Verifisert m/ QA-seed + skjermbilder, QA slettet (baseline 19). MERK: collection =
  'newsletters' (ikke 'newsletter_campaigns').

## Økt 14. juli 2026 — Fullskjerm-flyt på Bli utleier + Øvregaten-avvik til plattformen
- ✅ /bli-utleier: innbakt skjema nederst FJERNET → én kanonisk fullskjerm-flyt
  (/bli-utleier/start). Ny UtleierCta-seksjon (mørk, premium) + UtleierStickyCta (mobil).
  ScrollToForm = redirect m/ alle params (address/utm) → betalt trafikk uberørt.
  Verifisert m/ skjermbilder + redirect-test.
- 📤 BRO (closed-loop, id b892d8ba): PROD-avvik i /api/customers/export meldt:
  ØVREGATEN 15 AS (org 928459268) = 'churned' tross nysignert leiekontrakt + aktiv
  leietaker (58m²-enhet Utleid), OG properties[] har 1 element mens plattformen har
  2 enheter (58m² + 85m²). Spurt: lifecycle-avledning, bygg-vs-enheter i kontrakten
  (foreslått units_count/units[]), fiks i prod → vi re-synker m/ POST
  /admin/economy/sync-customers. VENTER SVAR. Vår side speiler eksporten 1:1
  (lib/contracts-sync.js normalizeCustomer + lib/finance.js computePlatformCustomers)
  — ingen feil hos oss.
- VENTER FORTSATT: selfservice-provisioning-spec-svar, slette-synk-svar (begge broen).

## Økt 14. juli 2026 (del 2) — Smart adressefelt (FINN-lenke aksepteres overalt)
- ✅ Alle adressefelt (hero forside, /start-entry, wizard steg 1, ekstra-enheter) oppdager
  limt finn.no-lenke og bytter sømløst til Finn-flyten. Egne FINN-modusknapper FJERNET
  (entry-mode-finn + owner-mode-finn) → erstattet m/ passiv hint + oppdaterte placeholders
  («…eller lim inn FINN-lenke»). Ikke-finn-URL → tydelig varsel. Adressesøk dempes for
  URL-input. Hero ruter via ?finn=-param som bootstrappes i wizarden. CRO-sporing:
  form_input_mode {trigger: paste|url-param}. Verifisert m/ Playwright 8/8.
- Nøkkelfunksjoner: detectFinnUrl/looksLikeUrl (PropertyInputs), AddressField onFinnUrl-prop.

## Økt 14. juli 2026 (del 3) — Kanonisk skjema-trakt + designløft skjemasider
- ✅ TRAKT-FIKS: Skjema-flyt i admin var feil (blandet utgåtte steg Velkommen/Bekreft m/
  scramblet rekkefølge). Nå: form_step m/ flow:'utleier-v3', entry-fasene spores,
  kanonisk 1 Adresse → 2 Tjenestevalg → 3 Eiendommen → 4 Dine mål → 5 Om deg. Gamle
  events ignoreres (ren start). Verifisert m/ syntetiske events (ryddet).
- ✅ DESIGNLØFT: fsTopbar m/ ekte DigiHome-wordmark, faseindikator m/ progresjon,
  telefonnr; logo-topplinje på suksess-skjermen. Verifisert m/ skjermbilder.
- MERK: /api/track filtrerer bot-UA → Playwright genererer aldri analytics-events.

## Økt 14. juli 2026 (del 4) — Selvbetjent provisjonering LIVE + units i Kunder-synk
- ✅ PROVISJONERING BYGGET (svar på plattformens spec i PROD-broen — VIKTIG: de svarer i
  prod-broen https://digihome.no/api/agent-bridge, sjekk ALLTID begge broer!):
  provisionSelfService() POSTer til {plattform}/api/bridge/self-service-customer
  (X-Bridge-Secret + X-API-Key, event_id=lead.id, idempotent, 8s timeout) i stedet for
  forwardToDigiHome for selvbetjente. 200 → platform_account{onboarding_url(magic-login),
  portal_url, owner/property/unit/agreement-id} + provisioning_status=provisioned →
  «Gå til kontoen din»-knappen (fra 10/7) får ekte handoff. 202 → pending_manual-fallback.
  reforwardPending ekskluderer self_service. E-poster status-avhengige (admin + kvittering).
  E2E-testet 5/5 + direkte kontraktstest (idempotens OK). QA-kunder ligger igjen i
  plattform-preview (meldt dem for opprydding).
- ✅ KUNDER-SYNK: units_count/units[]/properties_count konsumeres (additivt m/ fallback);
  UI-kolonne «Enheter» m/ tooltip + «X bygg»-undertekst.
- 📤 Kvitteringer sendt i PROD-broen (id 31d9f2e5 + e7ceacdc): deploy-koordinering
  (de publiserer først, så marked-prod, så første ekte push + «Synk på nytt» på Kunder)
  + purring på slette-synk/tombstone (fortsatt ubesvart).
- VENTER: deres prod-publish (provisjonering + eksport-fiks), slette-synk-svar.

## Økt 14. juli 2026 (del 5) — SEO & AEO-modul + 2 kommersielle SEO-sider + portal-revisjon
- ✅ PORTAL-REVISJON (Huseierportalen hos plattformen): logget inn m/ fersk magic link
  (QA-persona qa-portal-audit-2026-07, idempotent provisjonering). Finnes: Oversikt,
  Meldinger (chat OK), Saker (kun visning — mangler «Ny sak»), Mine eiendommer (mangler
  «Legg til eiendom»), Økonomi/Eieroppgjør (OK), Dokumenter (KUN placeholder «kommer
  snart»). Mangler kritisk for selvforvaltning: utleieprosess-status (annonsering/
  interessenter), kontonummer for utbetaling, leietaker-/kontraktinfo, profil/innstillinger.
  Bruker sa NEI til å sende kravliste i broen foreløpig.
- ✅ SEO & AEO-MODUL (bruker: «Forbedre alt ja tenk selv»):
  · /app/lib/seo-monitor.js: runRankCheck (SerpApi, Bergen, num=30, ext_usage-telling,
    KVOTE ~100 søk/mnd delt m/ konkurrentgalleri, maks 15 kw), runAeoCheck (gpt-4o-mini
    modellkunnskap + gpt-4o-search-preview web-søk m/ url_citations), runTechAudit
    (crawler PROD-sitemap, score 0–100/side), config i settings key 'seo_config'.
  · Endepunkter: GET/PUT /api/admin/seo/config, GET /api/admin/seo/overview,
    POST /api/admin/seo/run {type: rank|aeo|tech, dry}, GET /api/cron/seo-weekly?token=
    (self-throttle 6 døgn, force=1). Samlinger: seo_rank_checks/seo_aeo_checks/seo_tech_audits.
  · Admin: ny seksjon «SEO & AEO» (Markedsføring) — SeoAeoTab.js m/ 4 faner
    (Posisjoner m/ trendgraf & topp-10-konkurrenter, AI-synlighet m/ siteringer,
    Teknisk helse side-for-side, Innstillinger). Backend-testet 9/9.
  · FØRSTE MÅLING: alle 10 kw utenfor topp 30 i Google; AEO web-sitering 50 %
    (digihome.no siteres i 3/6 AI-websvar!); tech-snitt 88/100 (30 sider, verste:
    /sommer 67, /video 67 — lange metas + manglende alt-tekster).
- ✅ INNHOLD: /utleiemegler-bergen + /airbnb-forvaltning-bergen (eksakt-match kommersielle
  sider, FAQPage+Service+Breadcrumb-schema, sammenligningstabell, bydelslenker) + i
  sitemap.js, llms-content.txt, Footer «Tjenester». MERK: teller først når bruker
  publiserer til PROD (rank/tech måler digihome.no).
- 📬 BRO-NYTT 14/7 13:06 (preview-broen): (1) SLETTE-SYNK LEVERT fra plattformen:
  lead_deleted UT (verifisert mot vårt mottak, HTTP 200), archived INN i PATCH
  /api/leads/status (de ber oss RE-SENDE arkiveringer gjort FØR nå), tombstones i
  /api/leads/export. De ber om platform_id/e-post for spøkelsene kari@fjordbygg.no +
  Mona Evelyn Bergstø. (2) SELF-SERVICE A/B-SPØRSMÅL: de spør om vi vil ha A (deres
  dedikerte /api/bridge/self-service-customer — DET VI ALLEREDE BRUKER OG HAR E2E-TESTET)
  eller B (utvide POST /api/leads). RIKTIG SVAR: A — vi er live mot A. VENTER PÅ BRUKER-OK
  før bro-svar sendes.

## Økt 14. juli 2026 (del 6) — Google Search Console-integrasjon (verdensklasse)
- ✅ GSC KOBLET TIL: Bruker opprettet service-konto (digihome-seo@digihome-477122.iam.
  gserviceaccount.com) + ga tilgang i Search Console. Env: GSC_CLIENT_EMAIL +
  GSC_PRIVATE_KEY i /app/.env (\n-escapet, koden håndterer begge former).
- ✅ /app/lib/gsc.js: EGEN RS256-JWT-signering (Node crypto, NULL nye avhengigheter)
  → token mot oauth2.googleapis.com (scope webmasters.readonly, cache 55 min).
  Eiendom auto-detektert via sites.list: sc-domain:digihome.no (siteFullUser).
  computeGscOverview (3 API-kall, delta mot forrige periode, nearWins pos 8–20,
  cache 6 t i gsc_cache, force=1), inspectUrl (URL Inspection, kun digihome.no-URLer,
  cache 24 t i gsc_inspections), gscStatus.
- ✅ Endepunkter: GET /api/admin/seo/gsc/status, GET /api/admin/seo/gsc/overview
  ?days=7|28|90[&force=1], POST /api/admin/seo/gsc/inspect {url}. Backend-testet 13/13.
- ✅ UI: «Search Console» er ny STANDARDFANE i SEO & AEO-modulen: KPI m/ delta,
  klikk/visninger-graf (to y-akser), «Nesten der»-liste (pos 8–20), toppsøkeord/
  toppsider, indekseringssjekk m/ 6 nøkkelsider + egendefinert URL. Skjermbilde-OK.
- VIKTIG KONTEKST: Eiendommen er NYOPPRETTET → Search Analytics = 0 rader (fylles
  1–3 døgn, UI viser forklarings-banner). URL Inspection LIVE: / og /bli-utleier =
  PASS «Innsendt og indeksert» (crawlet 14/7); /utleiemegler-bergen = NEUTRAL
  (ikke indeksert — finnes kun i preview til bruker publiserer prod).
- FORTSATT ÅPENT: (1) Bruker har ikke svart på bro-replikk: «A» på self-service +
  ACK slettesynk + re-send gamle arkiveringer + spøkelse-id-er. (2) Frontend-testing
  av SEO-fanen ikke kjørt (venter bruker-OK). (3) «Verdivurdering fullskjerm/modal»-
  spørsmål fra bruker gjaldt DET ANDRE prosjektet — IGNORER.

## Økt 14. juli 2026 (del 7) — SEO-innholdspakken («Fortsett med alt»)
- ✅ TEKNISKE FIKSER (tech-revisjon 88→forventet ~100 etter prod-publish):
  Alle titler ≤60 / metas ≤160 på: sommer, video, personvern, bli-utleier,
  bli-leietaker, tjenester, utleie, leiemarkedet, radgivning + MALENE for
  /utleie/[by] («Utleie i X — priser og forvaltning») og /leiemarkedet/[by]
  («Leiemarkedet i X ÅR — snittleie og priser»). Alt-tekster: LocationPage
  relaterte-kort, AutopilotFilm (3), FilmScenes (3 DigiHome-logoer). og:image:
  sommer/video/priskalkulator (krevde site-import!). JSON-LD: personvern/
  support/vilkar (webPageLd). Mini-FAQ-seksjon på /kontakt (tynt innhold).
  LOKAL SLUTTKONTROLL: 20/20 sider uten funn.
- ✅ GUIDE-HUB (/guider): /app/lib/guides.js med 5 grundige guider
  (hva-koster-utleiemegler, leie-ut-leilighet-bergen, depositum-regler,
  skatt-pa-utleie, korttidsutleie-regler). Artikkelmal /guider/[slug] med
  AEO «Kort svar»-boks øverst, Article+FAQPage+Breadcrumb-schema, relaterte
  guider, CTA per guide, disclaimer på jus/skatt. Hub-side med kortgrid.
  Lenket fra: sitemap (prio 0.8/0.7), llms-content.txt, Footer «Ressurser»,
  guide-seksjon på /nyheter. Juridiske fakta verifisert (husleieloven §3-5,
  eierseksjonsloven §24 90-døgn, borettslag 30-døgn, skattesjablonger).
- ✅ SITERBAR STATISTIKK: semantisk <table> «Snittleie i {by} {år} per
  boligtype» m/ figcaption-kildehenvisning på RentMarketPage — Dataset-schema
  m/ variableMeasured fantes allerede.
- Backend-regresjon: 26/26 bestått. Skjermbilder verifisert (hub, artikkel, tabell).
- GJENSTÅR FOR BRUKER: publisere prod (alt innhold/fikser er kun i preview),
  Google Business Profile (anbefalt sterkt), Google-anmeldelser, bro-svar
  (self-service «A» + slettesynk-ACK) venter fortsatt på bruker-OK.

## Oppdatering (feb 2026): Brukermodul, impersonering, sidebar-kollaps, saksmottak-mottakere
- **Brukermodul** `/admin/brukere` (`components/admin/Brukere.js`): egen modul i sidemenyen (Ledelse-gruppen) — statistikk, søk, legg til/inviter/rediger/slett personer. Erstatter PersonerModal-inngangene i Saker (knappene navigerer nå hit).
- **«Logg inn som bruker»**: `POST /api/admin/impersonate` (kun ekte admin; aldri owner-target, selv-imp eller kjeding). Kort sesjon (1 t) med målbrukerens identitet + `imp`-metadata; `auth/me` returnerer `impersonatedBy`. Audit i `impersonation_log`. UI: «Se som»-knapp per bruker, banner nederst («Du ser portalen som X» + «Tilbake til admin»), auto-fallback til admin-token ved utløp. Admin-token parkeres i localStorage `dh_admin_imp_original`.
- **Sidebar-kollaps** (desktop): PanelLeft-knapp i sidebar-headeren, smal ikonlist (68px) m/ tooltips, persistert i localStorage `dh_admin_sidebar_collapsed`. Mobil-drawer uendret.
- **Saksmottak-mottakere**: `GET/PUT /api/admin/dev-issue-innstillinger` (settings-doc `dev_issue_intake`: recipientIds/notifyEmail/addAsFollowers). `POST /api/bridge/dev-issue` varsler valgte mottakere in-app + ev. e-post (taskEpost, kategori 'innmeldt') og setter dem som followers; tom liste = standard (admin + utviklingsgruppen, kun in-app). UI: «Saksmottak — hvem varsles?» i ProduktAdmin-modalen (Utvikling → Produkter & komponenter), auto-lagring.
- Backend-testagent: 26/26 pass (impersonering, innstillinger, bridge m/ mottakere, regresjon).

## Ny landingsside (/ny-forside) — feb 2026
- Unloopa-inspirert «drømmende» premium-landingsside for huseiere: varm krem/fersken-himmel, salviegrønn eng, terracotta-CTA.
- AI-generert hus-maskot (Nano Banana via Emergent-nøkkel), bakgrunnsfjernet med rembg: /public/landing/*.png (+ *-fri.png).
- Seksjoner: hero m/ svevende kodebygde produktkort + maskot, tillitsstripe, 4-stegs «Slik fungerer det», bento (portal + leietaker-chat + 4 kort), trygghet m/ hjertemaskot, CTA-gradient m/ lead-skjema (POST /api/leads, source: 'ny-forside'), footer-scene m/ gigantmaskot + stor wordmark.
- Filer: /app/app/ny-forside/page.js (metadata, noindex inntil promotering), /app/components/landing/NyForside.js, /app/scripts/generer-landing-bilder.py.
- Status: skjermbildeverifisert desktop + mobil (0 px overflow), lead-skjema E2E-testet (QA-lead ryddet). Sitatkortet «Endelig helt stressfritt» er en plassholder til ekte kundesitat foreligger.

## Landingsside v2 — lilla univers (feb 2026)
- /ny-forside flyttet til DigiHome-lilla (Unloopa-nivå): lavendel-scener, violet-gradient CTA (#6d28d9→#8b5cf6), ekte logoer.
- Ekte assets: /digihome-wordmark-ink.svg (nav), /digihome-wordmark-white.svg (gigant-footer), partnerlogoer FINN/BankID/Airbnb/Booking/Creditsafe (grayscale-bånd «I godt selskap»).
- 12 AI-genererte maskotbilder (lilla tak): vink/nokkel/titter/hjerte + lupe/foto/kontrakt/mynt (steg-klistremerker) + duo (CTA-hjørne) + sovende maskot-scene («Du kan faktisk slappe av»-bånd) + hero/footer-scener. Alle frilagt med rembg (*-fri.png).
- Nye seksjoner: marquee-tillitsstripe, partnerlogo-bånd, stats-bånd (2 min/1. hver mnd/100 % digital), portal-utstilling i nettleserramme, FAQ-accordion (5 sp), pust-ut-scene.
- Verifisert: desktop-screenshots alle seksjoner, mobil 0 px overflow, FAQ/marquee/hover fungerer. Skript: scripts/generer-landing-bilder-lilla*.py.

## Footer-redesign /ny-forside (feb 2026)
- Fjernet ødelagt wordmark-white.svg-overlay (hadde mørk tekst + egen boks) fra scenen.
- Ny struktur: ren kinoscene m/ maskot som smelter inn i mørk footer (#141022) via gradient, hvit digihome-logo-white.svg + tagline + hvit CTA, lenkekolonner (Utforsk/Selskap/Juridisk — kun ekte ruter), bunnlinje m/ «Til toppen», og gigantisk fade-«digihome»-typografi klippet i bunnkanten.
- Verifisert desktop + mobil (0 px overflow).

## Enhetsøkonomi i Leieforhold (aug. 2026)
- Leieforhold har to modus: «Utleie» (plattform-speil 1:1) og «Økonomi» (honorar − fordelte felleskostnader = margin per enhet, CAC/payback, break-even).
- Datarommets «Enhetsøkonomi»-side er fjernet fra menyen (slått sammen hit); Pipeline består. dr-enheter-nøkkelen finnes fortsatt i backend for bakoverkompatibilitet.
- Kostnadsmodell (asset-light — huseier bærer boligkostnadene): felleskostnader (lønn m.m., fordeling: likt/kun utleide/etter honorar) + CAC per enhet (engangs). Kolleksjon: enhetsokonomi. Ruter: GET/PUT/DELETE /api/admin/leieforhold/okonomi[/felles|/enhet].
- Investor: Økonomi-modus som default, read-only (adminAuthed blokkerer skriving). Excel-eksporten har eget «Enhetsøkonomi»-ark.
- Plattformens GET /api/lease-income/export er levert i deres preview og treffer prod ved neste publish → visningen blir da automatisk 100 % 1:1 (motoren prøver den først). Kjent restavvik til da: honorar 18 100 vs 15 100 (intern avtale→enhet-kobling, se bro-tråd «leieforhold-view»).

## Feb 2026 — Knøsesmauet-konsistens + forvaltningsavtale-PDF (levert av plattformen)
- Honorar-totals følger nå alltid de berikede radene (totals.fee = radsum = 15 198; Knøsesmauet 10 % inkl. mva → 8 % eks. / 2 400 kr, reelt uten ~). Kildevern: transient lease-income-svikt serverer siste vellykkede henting i stedet for degradert fallback.
- Plattformen har deployet kontrakt-PDF for forvaltningsavtaler i prod (komposit-id gjenkjennes 30/30), men ingen avtaler har lagret signert fil ennå → proxy viser presis melding «Ingen signert PDF lagret ennå». Bridge-svar sendt: bestilt signed_agreement_url-kobling + server-generert fallback-PDF.
- Backendtest: 6/6 bestått (leieforhold-konsistens, Knøsesmauet-rad, PDF-proxy begge veier, auth/validering, budsjett/xlsx-regresjon).

## Feb 2026 — Investor-Budsjett (NTM) + guidet omvisning
- Investorer får nå ekte Budsjett-modul (erstattet «Kommer snart»): lander i «Neste 12 mnd» fra dags dato, med «X % kontraktsfestet»-KPI, exit run-rate-kort og modellhale over årsskiftet (kontraktsfestet honorar + videreførte des-kostnader, merket «modell» per kolonne + infoboks). Excel-eksporten (&modell=1) matcher skjermen. Admin-opplevelsen uendret (Kalenderår default, 0-hale m/ advarsel).
- Guidet omvisning på Leieforhold: egen spotlight-motor (components/admin/Omvisning.js — ingen tredjepart), 5 steg med LEVENDE scenario-demo (aktiverer «Om 3 måneder» så investoren ser tallene endre seg, nullstilles garantert). Auto-start første gang for investorer (aldri under «Se som»), «?»-knapp i verktøylinjen for alle, tastatur (←/→/Esc), prefers-reduced-motion. Sett-status: localStorage + tourSett-array på kontoen (PUT auth/profile, alle roller kan skrive egen preferanse; auth/me returnerer den).
- Backendtest: 28/28 bestått (modell24-struktur/matematikk, xlsx, investor-tilgang, tourSett-validering/idempotens, skrivesperre-regresjon).

## Feb 2026 — Datarom-Omvisning
- Samme guidede spotlight-tour på Datarom → Oversikt: 5 steg med levende fremtidsbilde-demo (aktiverer «+3 mnd» så investoren ser hero/margin/utleiegrad regnes om, nullstilles garantert). Auto-start første gang for investor (tourSett 'datarom'), «?»-knapp ved Investorpakke. Gjenbruker Omvisning-motoren — ingen backend-endringer.

## Feb 2026 — Superresponsiv investorportal
- Mobil: fikset horisontal overflow på Datarom Oversikt (grid min-content-fellen: grid-cols-1 + minmax(0,fr) + min-w-0); alle investorsider verifisert uten overflow på 390px og 768px.
- Fart: Budsjett på klientcachen (SWR med dirty-vern og invalidering ved lagring) + forvarming ved innlogging; sessionStorage-lag i klientcachen gjør at også refresh/direktelenker rendres momentant. Fanebytter måler 17–109 ms.
- Sikkerhet: klientcachen tømmes ved logout, innlogging og «Se som» start/stopp — ingen datalekkasje mellom identiteter på delt maskin.

## Oppdatering (14. feb 2026-økten, fork)
- Bugfikser (backend-testet 26/26): ny redigeringsmodal i Brukere (bunn-ark på mobil), tilgangsstyring 1:1 (investor ser NØYAKTIG avhukede moduler — modulAuthed uten investor-unntak), Datarom-Leieforhold styrbar, Safari-font (ekte 600/700-snitt + font-synthesis:none).
- ÉN KOSTNADSKILDE: finance_costs er eneste register; enhetsokonomi-felles migrert idempotent; Datarom-skuffen er fasade mot samme data; fordeling/paused-felter; alle motorer (resultat/likviditet/budsjett/datarom/marginer) leser samme kilde. Backend-testet 8/8.
- ENHETSØKONOMI (ny Datarom-side, modul dr-enheter): KPI-er (honorar/kostnad/margin per enhet, CAC/payback, break-even), skaleringsgraf (enheter + kostnad/enhet historisk), manpower-modell med BRØKSTILLINGER (min 30 %, trinn 10 %, justerbart) + margintrapp. Backend-testet.
- FRITTSTÅENDE BUDSJETTER: planer med navn + fri periode (3–24 mnd) + status utkast/vedtatt (én vedtatt per periode), porteføljeforslag (modell B skåret til vinduet), Mot faktisk for fri periode, egen editor + valg i budsjettmenyen. Kalenderår/investor-NTM urørt. Backend-testet 13/13.
- Eksempelplan «Neste 12 mnd (rullerende)» (sep 26–aug 27) ligger klar i Budsjett-menyen.

## Manuell, kuratert AI-bildestyling (feb 2026)
- Auto-pipeline styler ALDRI bilder automatisk lenger — kun AI-analyse av nye leads. Styling er en bevisst, manuell handling per lead.
- Nytt StylingPanel i Salgsradar-admin: 1) velg originalbilder i galleri, 2) velg modus (FINN-optimalisering / Lysløft / Møblering nordisk-moderne-varm) + intensitet (Varsom/Full) + valgfri fritekstinstruks, 3) Generer → reviewkø med før/etter → Bruk bildet / Prøv igjen / Forkast.
- Kandidater lagres med godkjent:false og havner ALDRI i lead.stylet (eller offentlig tilbud) før eksplisitt godkjenning.
- Ærlig merking: optimal/lysloft = «AI-forbedret foto», møblering = «AI-møblert · illustrasjon». Nødbrems i prompt: tomme rom får aldri møbler, kun lysløft.
- Parringsfiks: erstatt-semantikk per kildeUrl (maks én aktiv stylet versjon per original), jobb-basert kildeUrl-parring, duplikat i Johannes Bruns gate 1 reparert.
- API: POST/GET /api/admin/salgsradar/styling-jobber, POST /api/admin/salgsradar/styling-review, DELETE /api/admin/salgsradar/stylet-bilde. Collection: salgsradar_stylingjobber. Backendtestet 100 %.

## Dokumentmotor + BankID-signering (aug 2026)
- Saksvedlegg har nå DokumentModal (PenLine-knapp per vedlegg): BankID-signering, dokumentarkiv, delingslenker, versjoner, historikk.
- Posten signering (portalflyt) LIVE i produksjon: Commfides Auth-sertifikat i .env (POSTEN_P12_B64 + POSTEN_P12_PASSORD, org 835674622, kø digihome-saker, utløper 2029-06). mTLS via PEM (OpenSSL3 støtter ikke legacy-p12). ASiC-E/XAdES bygges i lib/signering.js — validert og akseptert av Posten (jobb 18714523).
- Flere signatarer (maks 10), valgfri rekkefølge (order 0-9), frist 1-90 dager, varsling e-post/SMS via Posten. Signert PAdES lastes automatisk ned og lagres som ny LÅST versjon; låste filer kan ikke slettes av ikke-admin.
- identifier-in-signed-documents: NAME er IKKE aktivert for org-en (FEATURE_NOT_AVAILABLE) — standard = fødselsnr+navn i signert PDF. Kan be Posten (Rune Svendsen) aktivere NAME.
- Statuspolling: scheduler hvert 2. min → POST /api/cron/signering (x-admin-key fallback); respekterer X-Next-permitted-poll-time; bekrefter (confirmation-url) FØRST etter trygg lagring.
- Dokumentarkiv: PUT arkiv {synlighet: styret/investorer/alle, kategori} → vises i Datarom → Dokumenter («Dokumentarkiv fra sakene»), rollefiltrert; nedlasting styrt av arkiv-synlighet.
- Delingslenker: /api/delt/<token>, 1-90 dager, åpningsteller, kan trekkes tilbake.
- Versjoner: chunk-upload med versjonAv, task_file_versjoner, gjenoppretting, nedlasting av gamle versjoner.
- Word-preview: .docx rendres med docx-preview i FilViser (klient-side, ingen tredjepart). Gamle .doc = kun nedlasting.
- Backendtestet 46/46 (dokumentmotor) + live Posten-verifikasjon.

### Signeringsflyt v2: direkteflyt med DigiHome-epost (aug 2026)
- Byttet fra portalflyt (Posten-epost med sikkerhetskode) til DIREKTEFLYT: DigiHome sender egen branded e-post med knapp → /api/signer/:jobbId/:sid → fersk engangs-URL fra Posten → BankID. Ingen kode å taste.
- Sekvensiell rekkefølge styres av oss (e-post til nestemann ved signering). Signatar-identitet mot Posten = intern uuid (sid) — ingen fnr sendes på forhånd.
- Exit-sider: /signering/ferdig|avvist|feil. Kansellering av direktejobber skjer lokalt (lenkesperring).
- Ekte testjobb 18714586 aktiv — venter på Martins BankID-signering (dokument: «Testdokument for signering.pdf» på sak «BankID-signering — testdokument»).

### Signeringsside med dokumentforhåndsvisning (aug 2026)
- E-postknappen går nå til offentlig side /signering/dokument/[jobbId]/[sid]: DigiHome-brandet, viser tittel/melding/avsender/frist/hvem som signerer + HELE dokumentet rendret side for side (pdfjs-dist@4, worker i /public/pdf.worker.min.mjs) + sticky «Signer med BankID»-knapp → /api/signer-redirect.
- Tilstander: allerede signert / ikke din tur (sekvensiell) / avsluttet / kansellert. Offentlige API-er: GET /api/signer-info/:jobbId/:sid og GET /api/signer-dokument/:jobbId/:sid (rate-limited, krever begge uuid-ene).
- Purring: POST /api/admin/signering/:jobbId/purring sender e-post på nytt til dem som har tur; «Purr»-knapp i DokumentModal.
- ConsentBanner skjules på /signering/* og /tilbud/*.

## Signering-modul (feb 2026) — LEVERT
- Ny adminmodul «Signering» (Ledelse-gruppen): oversikt over ALLE BankID-signeringsrunder (pågår/fullført/avvist/kansellert) med filter, søk og signatarfremdrift.
- Frittstående dokumenter kan lastes opp direkte i modulen (chunk-opplasting, sentinel-taskId 'DOKUMENTer' = 'DOKUMENTER') og sendes til signering via samme DokumentModal som i Saker.
- Sikkerhetsherding: frittstående dokumenter er admin-only på alle task-files-endepunkter (hentSynligSak-sentinel krever adminAuthed).
- Backendtestet 49/53 (alle kritiske OK): ingen sid/signerUrl-lekkasje i lister, purring/kanseller-feilstier, regresjon på saksvedlegg.
- Salgsradar: standardsortering endret til «Nyeste først» (createdAt desc) etter brukerønske.
- Opprydding (samme dag): «Signering» er nå UNDERMODUL (fane) i ny «Dokumenter»-hub (DokumenterModul.js). Dokumenter-fanen viser frittstående dokumenter + dokumentarkivet; Signering-fanen viser rundene. SigneringOversikt.js er slettet. DokumentModal skjuler signeringsseksjonen for bilder/medier (kun PDF/Word), og Word får hint om PDF-som-ny-versjon-flyten.
- Automatisk Word→PDF: nytt endepunkt POST /api/admin/task-files/:id/konverter-pdf (admin) med docx-to-pdf-wasm (lokal WASM, ingen tredjepart). PDF blir ny versjon, Word-original bevares. Knapp «Konverter til PDF for signering» i DokumentModal for .docx. Backendtestet 19/19. Gamle binære .doc støttes IKKE (kun .docx).

## DEAD-END (16. aug 2026): ALDRI poll Postens signeringskø manuelt/out-of-band (debug-skript o.l.) mens appen kjører — GET 'konsumerer' leveringen i ~10 min uten bekreftelse, og appens egen poll får 204. La cron/pollSnarest gjøre jobben. Posten straffer også for tidlig polling med eskalerende 429-vinduer — aldri nullstill nestePoll blindt.

## Designløft (16. aug 2026, kveld) — LEVERT
- Tilbudssiden (/tilbud/[slug]) BYGGET PÅ NYTT etter GPT-brief: lys varm flate (#f8f8f6), tallet som H1 («14 904 kr til deg. Hver måned.»), Sarah Sleeman (CEO) som liten kontaktperson-detalj m/portrett (/brand/sarah-sleeman-360.webp), boligbildet som hero-objekt, regnestykke-ligning, annonseutkast bak «Se hele annonseutkastet», sentence case, ingen gradients, pent() kapitaliserer FINN-adresser. IKKE gå tilbake til mørk hero med stort portrett.
- Salgsradar admin: record-FANER (Oversikt/Bilder/AI/Tilbud/Aktivitet), «Neste handling» dominant i Oversikt, kompakt klikkbar KPI-stripe, forenklede lead-rader (score som diskret tall, ikke donut), rolige statusfarger (kun vunnet/tapt farget), flate knapper (ingen gradient), radius 8-12px.

## Budsjett-modul (redesignet feb. 2026)
- Gammelt årsbudsjett-UI skrotet (data bevart i DB). Ny modul: enkle periodebudsjetter.
- To typer: **Enkelt budsjett** (fra/til måned, honorar auto-utfylt fra leieforholdene — «sikret» serie, redigerbar per måned, kun inntekter foreløpig) og **Investormodell** (driver-drevet).
- Investormodell: tre lag — FAKTA (porteføljesnapshot: kontraktsfestet honorar + enheter fra leieforholdene; leiekontrakt-slutt churner IKKE forvaltningskunden), FORUTSETNINGER (synlige drivere: nye enheter/mnd, årlig churn % → kohortbasert månedlig, snittleie/honorar nye, oppstartshonorar, systemkost/enhet, fast markedsføring, salgsprovisjon/CAC per ny enhet, admin, andre faste, årslønn + synlig arbeidsgiverpåslag), BESLUTNINGER (bemanningstrapp: budsjettert stillings-% per enhetsterskel, ved siden av glidende kapasitetsbehov + utnyttelses-%).
- Sensitivitet i sanntid: samme rene motor (lib/budsjett-modell.js) klient+server; break-even fra månedsserien; CAC-payback-KPI.
- Per budsjett-bryter «Synlig i investorrommet»; investorer/brukere ser kun delte budsjetter, alltid read-only (håndheves server-side). Backend-testet 16/16 + 11/11.

## Feb 2026 — Tilbudsside-redesign + tour-oppgradering
- /tilbud/[slug] totalredesignet som «digitalt utleieprospekt»: hero med anbefalt leie som konklusjon (tellende tall), netto-chip, før/etter-slider høyt i viewport, sentrerte seksjonshoder m/ kicker-chips, prislinjal (markedsintervall) + grunnlag i eget kort, FINN-sammenligning «Annonsen din i dag → DigiHome anbefaler» (kun ekte data), økonomiblokk-kort, tonalt/mørke seksjonsbånd som avrundede paneler, animert FAQ-accordion, kapsel-navbar ved scroll, flytende mobil bunn-CTA.
- Backend: hentTilbud eksponerer grunnlag.snittSone (kun aggregert, kun ved >=2 i sonen) — backendtestet 7/7 OK.
- Omvisning.js (delt tour-motor for Budsjett/Investormodell/Enhetsøkonomi/Leieforhold/Datarom) oppgradert: glasskort m/ blur, lilla steg-chip, klikkbar segmentert fremdriftslinje, pulserende spotlight-ring, per-steg entrance-animasjon, lilla Ferdig-knapp, tastaturhint, bottom-sheet m/ håndtak på mobil. Samme API/testids.

## Feb 2026 — Chat UI/UX-polish («forbedre alt med ui og ux layout»)
- ChatBoble.js helhetlig polert: FULLSKJERM er nå ekte to-panels layout — sidefelt (288px, skjult < md) m/ Teamchat-brand, «Hovedstrøm»-snarvei m/ siste melding, trådliste m/ ulest-badges og aktiv-markering, brukerkort nederst m/ varsel-/lydtoggler. Hovedkolonnen sentrerer feed/composer på maks 860px for lesbarhet.
- Fullskjerm på mobil = full-bleed (inset-0, ingen avrunding); FAB-boblen skjules i fullskjerm (overlappet før).
- Chat|Tråder-fanene er nå segmentert kontroll (felles kapsel m/ inset-skygge). Hover-verktøylinjen på meldinger er gruppert pill (à la Slack/Linear) i stedet for løse knapper; emoji-hurtigvelger flyttet til -top-11.
- Egendefinerte tynne scrollbars (.dh-chat-scroll) i alle chatlister. Vanlig panel litt større (430×660). Fullskjerm-bakgrunn mer dekkende (0.95) så admin-siden ikke skinner gjennom.
- Header viser «Hovedstrøm» i fullskjerm (brand ligger i sidefeltet).
- Backend-test av forrige rundes utestede pakke: søk (/admin/chat/sok), unfurl m/ SSRF-vern+cache (/admin/chat/unfurl), status m/ sisteUlest — 28/28 bestått (backend_test_chat_search_unfurl_status.py). Screenshot-verifisert: vanlig panel, fullskjerm, tråd i fullskjerm, hover-pill, mobil fullskjerm. IKKE brukerbekreftet ennå.

## Feb 2026 — Selskap-modul: Organisasjonskart + Aksjeeierbok (nye datarom-sider)
- To nye datarom-sider: «Organisasjon» (dr-organisasjon) og «Aksjeeierbok» (dr-eierbok) — vises for investorer read-only via modulavkryssing, all skriving håndheves server-side (admin).
- ORGANISASJON: interaktiv canvas (pan/zoom/pinch, myk knappe-zoom, fit) m/ dot-grid, glød per tre, radetiketter (Styret/Daglig leder/Ledelsen/Støttefunksjoner), bezier-kanter m/ gradient, DH/DT-monogram, stagger-animasjoner. BRreg-synk (åpne API-er, auto ved tomt kart, aldri overskriver manuelt, borte-roller flagges), personskuff m/ roller på tvers, «2 selskaper»-badge, cross-highlight, manuelle roller/personer m/ bilde-opplasting (256px dataURL). Mobil: starter m/ ett selskap.
- AKSJEEIERBOK: transaksjonsbasert motor i /app/lib/selskap.js (spillAv-replay m/ aksjenummer-intervaller): stiftelse/emisjon/overdragelse (FIFO-forslag + manuell)/splitt/spleis/sletting, aksjeklasser m/ stemmer, tidsreise (?dato), presise norske valideringsfeil, kjede-validering ved sletting. UI: KPI-kort m/ ikonfliser, donut + legende m/ barer, cap table m/ rangering, tidslinje m/ skinne, utskriftsvisning (print→PDF), eiere-/klasse-/innstillingsmodaler.
- Selskaper seedes idempotent: Digihome AS (835595242), Digihome Tech AS (835674622).
- Backend testet: 23/23 (selskap/eierbok) + fikset ...map-spread-bug (personnavn ble rollenavn) + pointer-capture-bug (kortklikk).
- SIGNERING-FIX: brukere m/ Dokumenter-modulen kan nå sende/kansellere/purre signering på SAKSdokumenter de kan se (før: kun admin → Sarah fikk 401). + DokumentModal members-fix ({ok,members}) og hurtigvalg-chips for signatarer fra systemet. Backend testet 12/12.
- UI/UX-polish begge sider screenshot-verifisert desktop+mobil. IKKE brukerbekreftet ennå. Eierboken er TOM — brukeren fører inn ekte stiftelse selv.

## Feb 2026 — Excel-eksport av vekstbudsjett + investor-invitasjonse-post
- NY /app/lib/budsjettplan-excel.js: investorklar .xlsx for planer (type modell + enkel): «Sammendrag» (nøkkeltall, milepæler, enhetsøkonomi/CAC), «Månedsbudsjett» (LEVENDE SUM-/resultat-/akkumulert-formler, frosne ruter, sebrastriping, grønn break-even-kolonne m/ notat, bemanningsblokk), «Forutsetninger» (drivere m/ forklaring, vekstplanfaser, bemanningstrapp, scenarioer). Fargede arkfaner, liggende A4-print, norsk valutaformat.
- Rute: GET /api/admin/budsjett/plan/xlsx?id= — modulAuthed('budsjett'), investorer får kun investorSynlig-planer (404 ellers). Knapp «Excel» i BudsjettModell-verktøylinjen (blob-nedlasting m/ filnavn fra Content-Disposition), fungerer også for investorer (readOnly).
- Invitasjons-e-post: sendVelkomstEpost har nå egen INVESTOR-gren (rolle investor/eier): «Personlig invitasjon», headerLabel Investorrom, dynamisk modulliste fra member.moduler (10 moduler mappet m/ beskrivelser), individual-modus, konfidensialitetstekst, egen footer/subject/preheader. Team-e-post uendret for andre roller. authEpostHtml fikk footerTekst-param.
- Backend testet: 19/19 bestått (eksport, tilgangskontroll, e-postgrener, cleanup). Excel verifisert lokalt mot ekte plan (formler + PK). IKKE brukerbekreftet i Outlook/Excel ennå.

## Feb 2026 — Signeringsfix (prod-kritisk) + personlig signeringsoversikt + profilbilder + brukervelgere
- ROTÅRSAK prod-bug «2 av 3 signert men viser Venter»: preview og prod delte Postens polling-kø (destruktiv) — preview konsumerte/bekreftet prods statushendelser. FIX: KO() gir nå miljøskilt kønavn (prod=digihome-saker via NEXT_PUBLIC_BASE_URL-sjekk/POSTEN_ENV, ellers -preview-suffiks); statushandlere bekrefter ALDRI hendelser for ukjente jobber; gammel preview-testjobb kansellert i DB (preview poller ikke lenger). KREVER REDEPLOY for prod. Prod-status selvheler ved neste købevegelse (hver hendelse har full signatarstatus).
- NYTT: GET /api/admin/signering/mine (alle innloggede) + «Venter på din signatur»-seksjon øverst i Dokumenter → Signering m/ ravgule kort, «Signer med BankID»-knapp (egen sid-lenke), paaTur-logikk for sekvensiell rekkefølge, amber fanebadge. Poll-helse (sist/neste sjekk mot Posten) vises i statuslinjen. Backend testet 9/9.
- PROFILBILDER: admin_users.avatar (256px JPEG dataURL, servervalidert). Egen opplasting i Min profil (+ sidebar viser bildet), admin-opplasting i Brukere → rediger. Vises i personlister/chips.
- BRUKERVELGERE: «Hent fra brukerne»-chips i organisasjonskartets «Legg til rolle» (tar med epost/tittel/bilde til org-person; lagrePerson-create honorerer nå bilde) og i aksjeeierbokens «Ny aksjonær» (navn/epost, type person) — fritekst for eksterne fungerer som før.

## Feb 2026 (forts.) — Eksportpakke + org-kart-robusthet + responsiv budsjett-cockpit
- PDF-RAPPORT: GET /api/admin/budsjett/plan/pdf — 5-siders investorrapport (mørk forside m/ DigiHome-identitet, KPI-kort, søyle-/akkumulertgrafer m/ break-even-markering, månedstabell, forutsetninger) bygget m/ pdf-lib + embeddede brand-fonter (Right Grotesk/Diatype). PDF-knapp ved siden av Excel i budsjett-cockpiten. Auth som xlsx.
- EIERBOK-EXCEL: GET /api/admin/selskap/eierbok/xlsx — 3 ark (cap table m/ levende andelsformler + kontrollsum/avstemming, transaksjonshistorikk m/ beløpsformler, aksjeklasser), tidsreise via dato-param. Excel-knapp i Aksjeeierbok-verktøylinjen.
- BUDSJETT-EXCEL: levende formler verifisert (drivere i Forutsetninger!B driver Månedsbudsjett; Årsoversikt m/ kryssark-SUM).
- ORG-KART: rotårsak til «prøv igjen»-krasj ved drag fikset (null-ref på drar.current inne i setView-updater); pointer-handlere try/catch-sikret; lokal KartFeilgrense; canvas fyller nå hele viewporten (dynamisk måling); dobbelklikk = tilpass; maks bredde 1720px.
- AVATARER OVERALT: profilbilder vises nå i chat (NavnAvatar m/ navnregister, 10 steder), saker og møter (Avatar-komponentene).
- RESPONSIV BUDSJETT-COCKPIT: KPI-rad → responsivt kort-grid (clamp-fontstørrelse, aldri avkuttede tall); Forutsetninger blir bunn-ark m/ håndtak+Ferdig på <xl; rail auto-lukket på mobil ved oppstart.
- Backend-testagent: 10/10 bestått (PDF, eierbok-xlsx, regresjon xlsx/mine/eierbok/users-avatar). Prod-endringer krever redeploy.

## Feb 2026 (forts. 2) — Scenariosammenligning (A/B-duell)
- «Sammenlign»-knapp i budsjett-cockpitens topplinje åpner fullskjerms ScenarioSammenligning (modulnivå-komponent i BudsjettModell.js): to velgere (Gjeldende forutsetninger + lagrede scenarioer, farge A=lilla/B=amber), KPI-duell m/ Δ-chips (grønn/rød etter hva som er bedre for B: tidligere break-even, lavere kapitalbehov, høyere resultat), to overlagte SVG-grafer (akkumulert resultat m/ break-even-prikker + enheter under forvaltning), driverdiff-tabell (kun felter som skiller settene, inkl. vekstplan/bemanningstrapp), årsvis tabell m/ Δ resultat. Fullt responsiv: mobil stabler KPI-rader m/ fargeprikker. Kun frontend — beregnes live m/ beregnInvestorModell/rensModellDrivere. Screenshot-verifisert desktop+mobil m/ midlertidige QAFIX-scenarioer (slettet etterpå — scenarioer:[] igjen).

## Feb 2026 (forts. 3) — Investorchat
- Investorer får chatboblen i investorrommet med EGEN låst kanal ('investor-<userId>'): chatTilgang()-resolver i alle chat-ruter tvinger investorer til egen kanal på serversiden (query/body ignoreres) — de ser ALDRI internchatten ('generelt'). Interne kan åpne investorkanaler.
- Teamet: kanalvelger-chips i chatten (Intern + én per investor, m/ avatar og ulest-badge, amber tema), GET /admin/chat/investorkanaler (ulest/sisteAt per kanal), ravgul ekstra-badge på boblen for uleste investormeldinger.
- Varsling: investor skriver → in-app til alle interne; teamet svarer → in-app til investor + e-post (throttlet 30 min/kanal via chat_epost_logg, hoppes over ved @tagging).
- Isolasjon håndhevet overalt: meldinger, reaksjoner (404 på fremmede kanaler), filer (404 hvis filens kanal ≠ investors), søk, tråder, status/lest, skriver-indikator. fest + trådnavn/sak-kobling forblir interne (UI skjult + API-vakt).
- auth/me + login returnerer nå user.id (fikset også minId/egen-melding-logikk i chat). rensKanal 40→60 tegn.
- Backend-testagent: 29/30 bestått; T9 (fil-isolasjon) verifisert manuelt etterpå: investor 404 på intern fil, 200 på egen, kanal tvinges ved opplasting. UI screenshot-verifisert for både investor og owner.

## Feb 2026 (forts. 4) — Org-kart: Blue Sky-dedupe + støtteselskaper m/ BRreg-søk
- ROTÅRSAK «Blue Sky dobbelt»: Brønnøysund lister faktisk TO ulike juridiske enheter som regnskapsførere for DigiHome Tech AS (BLUE SKY ECONOMY AS 921171986 + BLUE SKY ECONOMY BERGEN AS 936595960) — registerdata, ikke duplikatfeil. Chips viser nå orgnr så enhetene kan skilles; gamle kan skjules via personskuffen.
- Latent dedupe-bug fikset: synkFraBrreg matcher enheter på ORGNR først (navnebytte i BRreg ga tidligere duplikater); registernavn følges ved endring. dedupeEnheter(db) slår sammen enheter m/ samme orgnr (mest beriket beholdes, roller repekes, felter arves, doble roller fjernes) — kjøres i synk + selvhelbredende i hentOrganisasjon.
- NYTT: GET /admin/selskap/brreg-sok?q= (adminAuthed, 30/min) — søk i Enhetsregisteret på navn eller orgnr. POST /admin/selskap/stotte — knytt støtteselskap (advokat/regnskap/revisor/bank …) idempotent per orgnr; samme funksjonsnavn gjenbruker rollen.
- UI: «Støtteselskap»-knapp i org-kartets toolbar → modal m/ debounced BRreg-søk (navn/orgnr), valg-kort, manuell registrering som fallback, funksjonsforslag-chips (Juridisk, Regnskapsfører, Revisor, Bank & finans, Forsikring …). Enheter kan nå redigeres (nettside/kontakt) i personskuffen.
- Backend-testagent: 11/11 bestått (brreg-sok, stotte-idempotens, dedupe-selvhelbredelse, synk-regresjon — begge ekte Blue Sky-enheter bevart som separate). QAFIX-data ryddet, 0 rester.

## Feb 2026 (forts. 5) — Enhetsøkonomi: bento-redesign
- KPI-sonen bygget om til moderne bento-grid (12 kolonner): mørk hero-flis (#141414 m/ lilla/grønn glød) med bidraget i klamp-skalert kjempetall, Lønnsom/Ulønnsom-badge, den genererte konklusjonssetningen, hurtig-chips (margin/CAC/LTV-CAC) og mini-sparkline av akkumulert kontantstrøm m/ payback-punkt.
- KPI-fliser m/ innebygde mini-visualiseringer: CAC payback m/ 0–24 mnd-tidslinje og 12-mnd-markør, LTV/CAC m/ målbar og 3×-tick, bidragsmargin m/ donut-ring, LTV og årlig verdi. Ikoner (Timer/Gauge/Percent/TrendingUp/CalendarRange) i alle fliser.
- Anatomien til én enhet → vannfallsdiagram (horisontale barer fra honorarinntekt ned til bidrag etter bemanning, m/ marginprosent per nivå).
- Livsløpsgrafen fikk gradient-områdefyll. Alle kort: rounded-20/22px, mykere skygge, bold mørke titler. Kontroller (scenario/visning/lagre) som pillformede segmented controls.
- All funksjonalitet bevart: scenarioer, før/etter-bryter, lagring/tilbakestilling, «Bruk porteføljesnitt», omvisning (alle data-testids beholdt), read-only for investor. Screenshot-verifisert desktop + mobil; scenario- og visningsbytte funksjonstestet.

## Feb 2026 (forts. 6) — Signeringsfiks + vekstplan-forbedringer
- SIGNERING (prod-bug 0/3 tross 2 signert hos Posten): (1) poll-loopen respekterer nå X-Next-Permitted-Poll-Time også midt i loopen (stopper eskalerende 429-straff som lot hendelser bli liggende); (2) NY token-basert statushenting: exit-siden sender Postens status_query_token til ny offentlig rute POST /api/signering-status-token → hentStatusMedToken henter FULL status for alle signatarer (selvhelbredende, prøver jobb-hint + 5 nyeste aktive); (3) vern: statushendelser som ikke kan mappes bekreftes ALDRI (forblir i kø) + diagnose-logging; (4) NAVN til Posten: signer-identifier = 'Navn · suffiks' (postenId) — Postens portal viser navn i stedet for uuid; mapping matcher postenId/sid. Exit-URL-er har ?jobb=-hint. Backend-testagent 12/12 inkl. EKTE Posten-opprettelse m/ navneidentifier (akseptert, signerUrl koblet) + kansellering + cleanup. Prod må RE-DEPLOYES; status rettes senest når neste signatar signerer (token-veien).
- VEKSTPLAN: faser auto-sorteres kronologisk (ved lasting, månedsendring og nye faser; «Legg til fase» foreslår ut fra kronologisk siste). NY MndVelger-komponent (moderne månedvelger-popover m/ årsnavigasjon, 12-mnd-grid, min/maks-deaktivering, fixed-posisjonering m/ flipp) erstatter native input[type=month] i både vekstplan- og bemanningsplan-drawer. Screenshot-verifisert inkl. resortering.

## Feb 2026 (forts. 7) — Org-kart: Blue Sky-skjuling + større/likere kort
- Engangs-migrering (app_migreringer, kjøres automatisk i hentOrganisasjon): skjuler utdatert REGN-rolle for BLUE SKY ECONOMY AS (921171986) der Bergen-enheten (936595960) også har synlig REGN-rolle. Reverserbar via personskuffen; synk rører aldri skjult. Retter prod automatisk etter deploy. Backend-testagent 4/4.
- Layout: CH 112→72 (fjernet død plass), CW/CHIP_W 260, PAD 48, RG 52, MOR_GAP 64 → fit-zoom 67%→84%. PersonKort: fast 72px høyde (alle like), rolle+tittel på én linje, «2 selskaper»-badge FJERNET, brregBorte som oransje hjørnemerke m/ tooltip.

## Feb 2026 (forts. 8) — Budsjett: Re-utleie ved kontraktslutt
- Tidsbestemte kontrakters honorar gjenopptas nå i budsjettet (i stedet for permanent bortfall = dobbeltstraff ift. churn). beregnBortfallSerie i lib/budsjett.js: punktvise bortfall fra kjente utflyttinger; nytt fakta-felt `bortfall` fra plan/forslag. Modelldrivere: reutleiePaa (default PÅ), reutleieGapMnd (default 0, 0–6). Reutleie(t)=kumulativt bortfall forskjøvet med gap; churnes ikke; sammendrag.sumReutleie.
- Vises som EGET lag (ærlighet mot investorer): «Kontraktsfestet»-KPI forblir ren. UI: toggle + gap-knapper i Portefølje & vekst, grønt grafsegment/legend, grønn resultatrad. Excel: ny permanent rad 10 (radkart bumpet, alle formler via R-kart, 0 #REF). PDF: re-utleie i inntektssammensetning.
- Eldre planer endres IKKE i det stille — laget aktiveres først når «Oppdater fra leieforholdene» kjøres (hint vises). Backend-testagent 4/4 inkl. full XLSX-formelregresjon. Bruker må selv oppdatere fakta + lagre i sine planer, og deploye.

## Datarom → Oversikt: Kommandosenter-redesign (feb 2026)
- Oversikt redesignet til minimalistisk bento-«kommandosenter»: mørk hero-flis (honorar/mnd som dominant tall, live-indikator, fremtidsbilde-kontroller, investorpakke, veksttrapp), KPI-fliser (margin m/break-even-bar, utleiegrad-ring, pipeline, ARR-potensial, leie under forvaltning).
- NY puls-rad med driftssignaler: åpne saker (m/over frist), signeringer i gang, kontrakter som utløper ≤60 dgr, innflyttinger 30 dgr, ledig uten annonse. Team-signaler via NYTT endepunkt GET /api/admin/datarom/puls (sakerAuthed — investor får 401 og raden skjules).
- P&L-graf fikk narrativ-badge (akkumulert + mnd ført). Snarveier utvidet med «Budsjett & vekstplan» (kun admin).
- Komponenten flyttet til egen fil /app/components/admin/DataromOversikt.js (Datarom.js slanket fra ~1230 til ~750 linjer). Alle testids/omvisning bevart.
- Backend-testet 5/5 (puls + regresjon oversikt/leieforhold). Screenshot-QA desktop + mobil (0 px overflow).

## Feb 2026 (forts. 9) — Flerårsbudsjett i verdensklasse (teleskopmodell)
- Motoren (budsjett-modell.js): nye årsdrivere indeksPct (KPI-justering leie, std 3 %), lonnsvekstPct (std 4 %), kostInflasjonPct (std 3 %) — trappes per PLANÅR fra år 2 (år 1 påvirkes aldri). Eksisterende planer får 0 (uendrede tall). Nye aggregater: aar[] (per planår: inntekt/resultat/margin/enheter/ARR), arrExit, prisFaktor/kostFaktor/lonnFaktor-serier.
- UI (BudsjettModell.js): Teleskopvisning (standard for flerårsplaner — år 1 månedlig, år 2 kvartalsvis, år 3 årlig) + År-visning; årssammendrag-stripe m/ YoY-vekst og ARR; graf med ÅR 2/ÅR 3-skiller + kapitalbunn-markør; ny driverseksjon «Årlig justering»; tornado utvidet.
- BudsjettEnkel.js: 1/2/3-års hurtigvalg ved opprettelse; bortfall-serien følger med fra forslaget.
- Excel: levende faktor-rader (POWER-formler mot Forutsetninger B21/B23), kostformler ×kostnadsfaktor, ARR-kolonne i Årsoversikt, per-år-blokk + ARR i Sammendrag. PDF: ARR i KPI/årsoversikt + Årlig justering-blokk.
- Backend-testet 7/7 inkl. bakoverkompatibilitet (gamle planer B21=0) og opprydding. Screenshot-QA av hele flyten.

## Feb 2026 (forts. 10) — «Endre horisont» på lagrede planer
- BudsjettModell.js: horisontvelger (1 år/2 år/3 år) i editor-headeren. endreHorisont() henter FRISKE porteføljefakta (plan/forslag) for hele den nye horisonten (eksisterende/enheter/bortfall), setter lokal antallMnd, bytter til teleskopvisning og markerer ulagret — persisteres først ved «Lagre». «Tilbakestill» ruller tilbake horisont+fakta via lagret*-speil (robust også etter mellomlagring). Barne-drawere (vekstplan/bemanning/scenario-sammenligning) får patched plan med lokal horisont.
- Screenshot-QA: brukerens 12-mnd plan utvidet til 36 mnd i UI (uten lagring) — årsstripe, teleskop, kapitalbunn og bemanningsvarsel fungerte.

## Feb 2026 (forts. 11) — Budsjettmodulen: 2026-modernisering av UI/UX
- Liste (BudsjettEnkel): kort-grid (2 kol) m/ horisontbadge (1/2/3 år), status/investor-chips, inntekter+resultat+margin %, «sist endret», hover-løft. Opprettelsespanel m/ gradient-aksent og horisont som segmented control. Skeleton-lasting.
- Editor (BudsjettModell): nøkkeltall som bento — LYS hero-flis (hvit m/ subtil lilla radial glød; bruker ønsket IKKE mørk) med resultat, gradient-sparkline og chips (siste/første mnd, margin) + 2x2 fliser (break-even, kapitalbehov, NY ARR-flis, kontraktsfestet). Seksjonsheadere som uppercase mikro-etiketter. Verktøylinjen wrapper på mobil (fikset 116px overflow).
- Graf 2026: full omskriving — glatte catmull-rom-kurver (inntekt m/ gradientareal, kostnad stiplet rosé), lyse avrundede søyler (violet-toner + mint for re-utleie), pill-markører for Break-even og Kapitalbunn, årsskiller, hover-guide m/ punkter, pill-legend.
- Tusenskiller-bug: NBSP fra toLocaleString('nb-NO') rendret bredt i heading-font — byttet til U+202F (smalt no-break space) i kr/kr0 i begge filene.
- Screenshot-QA desktop + mobil (0 px overflow). Kun frontend — ingen backend-endringer.

## E-post-deliverability (Outlook «Annet»-fiks) — Feb 2026
- `lib/email.js`: `personlig=true` som standard — all SendGrid klikk-/åpningssporing og link-omskriving (url####.sendgrid.net) er AV for alle e-poster. Vil en flyt ha sporing, send `personlig:false` eksplisitt.
- Invitasjoner (`sendVelkomstEpost`): ny param `invitertAvEpost` → `replyTo` settes til inviterende persons e-post (person-til-person-signal). Med masternøkkel (ingen sesjon) utelates replyTo.
- Emoji fjernet fra annonse-varsel-emne (bulk-signal).
- DNS-status verifisert: DKIM s1/s2 → SendGrid OK; SPF-rot kun M365; DMARC p=none; em-CNAME (Return-Path) ikke funnet ved skanning — bruker må verifisere i SendGrid Sender Authentication.
- Brukerhandlinger (kan ikke gjøres i kode): (1) sjekk at alle 3 SendGrid-CNAMEs er publisert/verifisert, (2) valgfritt DMARC → p=quarantine, (3) Exchange-regel `X-MS-Exchange-Organization-BypassFocusedInbox=true` for hei@digihome.no gir garantert «Prioritert» internt, (4) eksterne mottakere: «Alltid flytt til Fokusert».
- Backend-testet 6/6 (invitasjonsflyt, resend, investor-gren, regresjon, opprydding).

## Moderne saks-e-poster (chat-stil) — Feb 2026
- Ny gjenbrukbar `byggSakEpost` + `sakChip` + `badgeMentionsHtml` i `lib/email.js` — samme design som chat-varslene.
- Alle Saker-e-poster redesignet: tildelt, nevnt (beskrivelse/kommentar), ny kommentar, statusendring (overgangschip «Pågår → Ferdig»), følger, innmeldt, manuell påminnelse, sjekklistepunkter, dagens frister-digest og frist-i-morgen-påminnelse (lib/reminders.js).
- @-tagger vises som lilla badges i kommentarboble og beskrivelse. Chips: status (fargetone per status), prioritet (P1 rød), frist (forfalt rød).
- Avsendernavn = «Aktør (DigiHome)» for person-hendelser; «DigiHome Saker» for systemutsendelser.
- taskEpost nye parametre: actor, kommentar, mentions, fraStatus, hendelse. 12 kallsteder oppdatert.
- Screenshot-QA av 4 varianter (QA-side slettet). Backend-testet 8/8 (alle varslingsstier, cron dry-run, regresjon, opprydding).

## Signering + dokumenter: prod-fikser og nye funksjoner — Feb 2026
- PROD-FIKS: DOCX→PDF feilet i produksjon (standalone tracer ikke docx-to-pdf.wasm). Fikset via outputFileTracingIncludes + kandidatstier i lib/dokumenter.js + feillogging.
- PROD-FIKS: PDF-forhåndsvisning (signeringsside + chat) feilet i prod (/pdf.worker.min.mjs 404 — /public shippes ikke, .mjs ikke i media-fallback). Fikset via NY rute GET /api/pdf-worker som serverer worker versjonsriktig fra pdfjs-dist; workerSrc oppdatert begge steder.
- NY: Når alle har signert sendes e-post (byggSakEpost-design m/ signatarliste) med signert PAdES-PDF som VEDLEGG til alle signatarer + avsender. Idempotent (signertEpostSendtAt-claim). 18MB-vakt. Funksjonstestet direkte.
- NY: Ved FULLFORT auto-arkiveres dokumentet alltid (standard styret · Avtaler, respekterer eksisterende valg) → synlig i Dokumenter-modulen og datarom.
- UI: Investorrommets «Dokumentarkiv fra sakene» → «Dokumentarkiv».
- Backend-testet 6/6 (pdf-worker, docx-opplasting+konvertering, arkiv, signeringsjobber, tasks, opprydding).
- Datarom-forbedringer (mappestruktur/søk/forhåndsvisning m.m.) DISKUTERT med bruker — venter på prioritering.

## Batch-signering — Feb 2026
- Velg-modus («Velg flere») i Dokumenter-modulen og saksskuffens vedleggsliste → «Send N til signering».
- SigneringBatchModal: signatarer (chips fra systemet + manuelle), rekkefølge-toggle, frist, melding — settes ÉN gang.
- POST /admin/task-files/signering-batch: én Posten-runde per dokument (felles batchId), auto DOCX→PDF (ny versjon), delresultat {opprettet, feilet}, maks 15 dok / 10 signatarer.
- ÉN samle-e-post per signatar (sendBatchSignaturEposter) med alle signeringslenkene i rolig BankID-design.
- «Neste dokument til signering (X av Y) →» på signeringssiden (allerede signert/fullført) og exit-siden (via localStorage dh_sign_siste + signer-info batch {antall, ferdig, neste}).
- Signert/aktiv-runde-dokumenter kan ikke velges (dimmet). Hvert dokument får egen signert PAdES + auto-arkiv som før.
- UI screenshot-QA via egen Playwright (velg-modus + modal). Backend-validering testet 6/6. Suksess-sti mot Posten må prøves av bruker (f.eks. liten bunt på 2) etter deploy.
- MERK: mcp_screenshot_tool kjører ikke interaksjonsskript pålitelig — bruk egen Playwright med executable_path /pw-browsers/chromium_headless_shell-1208/... for interaktiv UI-QA.

## Datarom Fase 1 — Feb 2026
- NY komponent components/admin/DataromDokumenter.js erstatter SakArkiv + gammel hvelv-liste i Datarom.js (Dokumenter-seksjonen).
- Nummerert DD-mappestruktur: 01 Selskap & styring, 02 Avtaler, 03 Rapporter, 04 Økonomi, 05 Annet. Arkivkategorier mappes 1:1; hvelv-dokumenter matches på kategori-/filnavn-regex.
- Fritekstsøk (navn/sak/kategori), mappe-pills med antall, «Kun signerte»-toggle. Søk viser flat treffliste m/ mappe-badge.
- Forhåndsvisning i nettleser: PDF via pdf.js (workerSrc /api/pdf-worker, canvas per side, maks 40 sider) + bilder; mørk fullskjermmodal m/ Last ned. Fallback-nedlasting ved feil.
- Backend: /admin/datarom/fil støtter ?inline=1 (pdf/bilder). Arkivfiler hadde inline-støtte fra før.
- QA: egen Playwright (mapper, søk-treff/0-treff, kun-signerte, modal m/ canvas). Mobil 0px overflow. Backend 6/6.

## Bilder i saker: e-post + editor + z-fiks — Feb 2026
- E-post: kommentar/beskrivelse rendres som full markdown; limte saksbilder (task_images) bygges inn som INLINE CID-vedlegg (sakBilderTilVedlegg, maks 6/12MB) — samme mekanisme som chat. mdTilEpost(kilde, maks, bildeCids). byggSakEpost fikk meldingHtml-param. Kommentar-kallsteder sender rå markdown (2000 tegn).
- Editor: MentionTekstfelt viser 48px-miniatyrer av limte bilder under feltet m/ ×-fjern (apiKey-prop lagt til; sendes fra SakSkuff/NySakModal/TasksTab-rot).
- Z-fiks: SakKort får z-40 når ...-menyen er åpen (menyen lå bak kortene under pga. hover-transform stacking context).
- QA: Playwright (meny elementFromPoint OK, bildeopplasting + miniatyr OK). Backend 5/5 (bildeopplasting, tildelt/nevnt/kommentar-e-poststier m/ CID, regresjon, opprydding).

## Signering: selvhelbredende status-sync — Feb 2026 (KRITISK PROD-FIKS)
- BRUKERFEIL: batch-dokumenter signert hos Posten viste kun første som signert i DigiHome; egen runde sto på 0/2. Rotårsak: synk hvilte kun på destruktiv polling-kø + engangs token-kall fra exit-siden — tapte hendelser ble aldri reparert.
- sisteToken (status_query_token fra exit-URL) lagres nå varig på jobben (hentStatusMedToken) og strippes fra alle klient-responser.
- NY reconcileSigneringsjobber(db, {maks, eldreEnnMs, batchId}): henter full jobbstatus direkte fra Posten m/ lagret token for I_GANG-jobber som ikke er oppdatert nylig. Kjøres fra cron-tick (hvert min), manuell poll (eldreEnnMs 15s) og for batch-søsken ved exit-besøk. Ugyldige/oppbrukte tokens $unset-es stille.
- Robust mapping: finnSignatarForAttr (eksakt → XML-unescapet (xunesc) → entydig sid-suffiks «· abc123»). Monotont vern: SIGNERT nedgraderes aldri; FULLFORT/FEILET rulles ikke tilbake av forsinket I_GANG-svar (bekreftes likevel så køen ryddes).
- Smart kø-tømming i pollSignering: direkteflyt polles først; korte poll-vinduer (≤8s, maks 20s totalt) ventes ut i samme kjøring.
- Cron-heartbeat: /api/cron/signering skriver sistCronTick i signering_config. Boot-token-auth (globalThis.__dhCronBoot, generert i scheduler — samme prosess) godtas i tillegg til CRON_SECRET/x-admin-key → synk virker selv uten nøkler i miljøet. Scheduler har offentlig-URL-fallback (NEXT_PUBLIC_BASE_URL) hvis loopback feiler, og logger tydelige feil.
- NY GET /admin/signering/diagnose: {ko, sistPoll, nestePoll, sistCronTick, aktive[{signert/antall, oppdatert, harToken, batchId}]}.
- UI (DokumenterModul → Signering): «Sjekk status nå»-knapp (poll + avstemming + toast) og ambervarsel «Automatisk synk inaktiv» når heartbeat >3 min gammel med aktive runder.
- Exit-side: regex-basert token/jobb-uthenting (tåler rar parameterrekkefølge), fetch keepalive (overlever «Neste dokument»-klikk), ett retry.
- .gitignore: .env-blokkering fjernet (deploy-blocker fra deployment-sjekk — .env må følge repoet for Emergent-deploy).
- QA: 14/14 enhetstester (scripts/qa_signering_status_test.mjs), integrasjonstest av reconcile (ugyldig token fjernes, jobb urørt), backend-testagent 7/7, UI-screenshot OK.
- PROD-GJENOPPRETTING etter deploy: åpne Dokumenter → Signering → «Sjekk status nå» (ubekreftede kø-hendelser re-leveres av Posten ~hvert 10. min og fanges da opp). Henger en runde fortsatt: signataren klikker signeringslenken i e-posten på nytt → exit-siden gir ferskt token som reparerer jobben umiddelbart.

## DRIFTSREGEL: Nye filer i /public (VIKTIG — gjelder alle agenter)
- Produksjon kjører Next.js standalone som IKKE inkluderer /public. Statiske filer serveres i prod via fallback-rewrite → /api/media/<sti> → Emergent objektlagring (digihome/public/<sti>).
- HVER gang en ny fil legges i /app/public MÅ den også lastes opp: `node scripts/upload_public_to_storage.mjs --only <filnavn>` — ellers 404 i prod (skjedde 27.08.2026 med martin-kviteberg.jpg og qr-kontakt.svg; fikset ved opplasting, virket umiddelbart uten redeploy).
- Rewriten dekker nå også .js/.pdf/.pptx (sw-deck.js + presentasjonsbackup) — DENNE endringen krever redeploy for å virke i prod.

## Salgsradar: Annonsør-deteksjon + kontaktinfo (aug 2026)
- Hver lead viser nå ANNONSØR: Privat (grønn) / Husleie.no (gul) / Utleiemegleren / Megler (rød) — parses fra FINNs company-profile-JSON (`parseAnnonsor` i lib/salgsradar.js, versjon v:2).
- Proff-annonser gir full kontaktperson: navn, tittel, telefon, e-post (vises i skuff-hode, Detaljer-rail, tabellens Utleier-kolonne).
- PRIVATE annonser: FINN viser aldri navn anonymt, men telefonen ligger i serialiserte data («"mobile","..."») når utleier har valgt å oppgi den — parser v2 fanger denne (bekreftet: 2 av 5 private annonser hadde tlf).
- Filter Privat/Megler i verktøylinjen (Privat = målgruppen inkl. Husleie.no/ukjent; Megler = konkurrent har oppdraget).
- Backfill: POST /api/admin/salgsradar/berik-annonsor (lazy fra UI når leads mangler annonsor eller har v1); agent-ingest beriker nye leads i bakgrunnen. Feilede oppslag merkes type:'ukjent' (ingen badge).
- Badges også på kanban-kort (SalgPipeline.js: AnnonsorBadge/ANNONSOR_META).

## Salgsradar: Minimalistisk salgs-skuff (aug 2026)
- Ny komponent /app/components/admin/SalgsSkuffEnkel.js erstatter det gamle detaljpanelet i splitt- og høyre-ark-visning. Fullvisningen (⤢ / «Se alt om boligen») beholder hele den gamle arbeidsflaten med faner (panel-IIFE i Salgsradar.js).
- Tre soner: (1) NESTE STEG — statusdrevet motor med ÉN stor knapp (Ring/Kopier FINN-melding/Send tilbud/Ta lead/Kjør AI-analyse); handlingene setter status, aldri omvendt. (2) VÅRE ARGUMENTER — sjekkliste fra AI-delscorer: Bilder (tilstandsmaskin: style → styler → godkjenn forslag → klare), Pris (anbefalt vs dagens >3 %), Tekst (annonseUtkast), Annonsedata. Bevis bak pil: overlays for før/etter m/ godkjenn/forkast, prisargument m/ replikk, annonseutkast, manglende felter. (3) UTFALL — Vunnet/Tapt/Ikke relevant fast bunnlinje + «Se alt om boligen».
- Megler-leads: NESTE STEG = «Megler kjører annonsen» + «Ikke relevant — feil segment» (sender årsak direkte uten modal).
- Pool-leads (selger med egen konto): NESTE STEG = «Ta lead». Leder har stille tildel-select.
- Vaktbikkje: «Send tilbud»/«Kopier FINN-melding» stoppes mildt hvis AI-bildeforslag venter på godkjenning eller ingen bilder er stylet (Style nå / Godkjenn nå / Send likevel).
- «Se over tilbudet»: iframe-forhåndsvisning m/ ?preview=1 (teller ikke åpning) + «Rediger tilbudet» → fullvisning på Tilbud-fanen.
- Utsett-meny (I morgen/Fredag/Neste uke) bruker salg.oppfolging.
- Bildestyling er fortsatt MANUELT valg (koster AI-kreditter) — ett-trykks «Style de 5 beste» bruker leadens stilforslag.

## Salgsradar: Arbeidsrom uten faner + voksende høyre-ark (aug 2026)
- Fullvisningen er ombygd: utvid (⤢) lar høyre-arket VOKSE i bredden (560px → nesten fullbredde, animert transition-[width]) — ingen modal. Samme SalgsSkuffEnkel blir venstre rail (prop onAapneFane → gaaTil(seksjon)).
- Lerretet har INGEN faner: én rolig scroll med tre seksjoner — #rom-bilder → #rom-tilbud → #rom-historikk. Skuffens knapper («Bedre bilder», «Se over tilbudet») ruller til seksjonen. Historikk = tidslinje/notat + AI-vurdering bak <details> + trimmet Detaljer-grid + statusoverstyring + slett.
- Gamle Oversikt-fane, panelhode, statusdropdown, primær-CTA og panelfot er FJERNET (skuffen dekker alt).

## Salgsradar: Verdensklasse-forenkling (aug 2026 — «hva trenger selgeren egentlig?»)
- LISTE/TABELL: Salgskraft-, Kvalitet- og delscore-kolonnene fjernet — kun Potensial igjen (+ sortvalg «Annonsekvalitet» fjernet). Tabell: Bolig/Bydel/Utleier/Status/Potensial/Leie/Anbefalt/Åpnet.
- SKUFF: segmentert fremdriftslinje fjernet (statuschip i hodet i stedet); selgerkort → én rolig linje (leder klikker for tildelingsmeny, 280px popover); VÅRE ARGUMENTER viser KUN aktive rader — grå «alt ok»-rader borte; når ingenting krever handling vises én linje «Annonsen står sterkt …» (testid skuff-arg-alt-ok).
- ARBEIDSROM: stylingvalg (FINN-klar/Lysløft/Møblering, Varsom/Full, fritekst) bak <details> «Juster stil» — primærknapp «Forbedre dette bildet» først; tilbudstekstene (personlig intro, potensialtekst, annonseutkast) bak <details> «Rediger tekstene i tilbudet».

## Tilbudsside v2 (aug 2026) — ivory/ink design-DNA fra DigiHomes huseier-tilbud
- /app/app/tilbud/[slug]/page.js totalredesignet: mørkt filmatisk cover (boligfoto, hvit logo /digihome-logo-hvit.svg — NY fil, lastet opp til objektlagring) → dokument avsløres (ivory #FEFBFA, radier 26–36px) → konklusjon (anbefalt leie) → personlig brev + AVSENDERKORT → før/etter → prislinjal/grunnlag → sammenligning → økonomi → mørk arbeidsfordeling → tonal annonse-preview → FAQ → neste steg → mørk CTA «Ja, dette høres interessant ut».
- Backend: GET /api/tilbud returnerer nå `selger` (offentlig trygt: navn/tittel/epost/telefon/avatar fra tildelt selger; null → generisk Sarah-fallback). POST /api/tilbud/kontakt flytter til Dialog og varsler owner/admin + TILDELT SELGER (dedupe). Backend-testagent: 6/6 bestått.
- MERK: digihome-logo-white.svg har MØRKE bokstaver — bruk digihome-logo-hvit.svg på mørke flater.

## Salgsradar: Listevisningen fjernet (aug 2026)
- Kun to visninger igjen: TABELL (standard — `visning` default 'tabell') og TAVLE (pipeline). Toggle har 2 ikoner (Table2 først, Columns3).
- `splitt`-modus er død (const splitt = false) — valgt lead åpner ALLTID som høyre-ark (SalgsSkuffEnkel), utvid lar arket vokse til arbeidsrom.
- Fjernet: liste-JSX, radar-visning-liste-toggle, radar-leadliste, splitt-inline-skuff, mx-auto-maksbredde-betingelser i toppområdet.

## 2026-09-02: Forside V3 — «Utleie på autopilot» (verdensklasse 2026) på /v3
- Brukerkrav: root nesten fra scratch, verdensklasse moderne 2026-layout/UI/UX, må treffe tre kjøpere (privat selvforvalt, privat full forvaltning, bedrift/portefølje) via konseptet «Utleie på autopilot».
- Budskapsarkitektur (godkjent retning, agenten fikk frie tøyler): autopilot er en GRAD, ikke en ting. Heroen universell (underlinje A: «Alt fra annonse til innbetaling går av seg selv. Du bestemmer hvor mye du vil være med.»), kroppen beviser med ekte produkt, segmentering skjer én gang: Selvbetjent (Kom i gang → /bli-utleier/start) · Forvaltning (Få vurdering → /forvaltning) · Portefølje (Book en demo → /book-mote).
- Struktur: Hero (display + eierportal-replika i full bredde, levende) → Reisen (scroll-drevet 01–05, sticky panel, nivåvelger endrer «hvem gjør det») → Statement → Bento (ekte UI-utsnitt) → Nivå (3 kort) → Trygghet (4 pilarer + dokumenterte integrasjoner) → CTA → Footer.
- Filer: app/v3/page.js (noindex), components/forside/v3/*. StegDemo.js fikk navngitte eksporter av flatene. / er uendret inntil bruker godkjenner → deretter bytt page.js til ForsideV3.
- Produktfasit hentet fra GitHub-repo martinkviteberg1/DigiHome (branch newsan) klonet til /tmp/dh-ref (ikke varig). Bekreftede integrasjoner i backend/integrations: finn, posten_signering (BankID), keyhole, lea_bank, poweroffice, fiken, channex (Airbnb/Booking), eiendomsverdi, infotorg. IKKE dokumentert: Vipps, Tripletex → fjernet fra forsiden.
- Status: shippet på /v3, screenshot-verifisert desktop+mobil, IKKE brukerbekreftet. Frontend-testagent ikke kjørt.
- Neste: brukerens visuelle aksept → evt. justeringer → bytte / til V3 → frontend-test (etter tillatelse).

## 2026-09-02 (kveld): V3 pass 2+3 — designresett etter brukerfeedback («sammenlign med Linear»)
- Bruker avviste første V3-utkast som ikke moderne. Rotårsak: fet Right Grotesk display-type, versal-eyebrows, lilla blobs/tonet skygge, for store produktfliser, svevende velgere.
- Resett (gjeldende designspråk for V3): hvit canvas · display-type = ABC Diatype Medium (Right Grotesk kun i produktmocker) · setningsform (Etikett) · ingen gradient-blobs · radius 10–16 · små knapper 40 px (Knapp/Lenke i motion.js) · hårlinjer #E8E5DF · sekundærtekst #52504B/#6B6862.
- Nav: fullbredde 64 px (OpenAI-stil), mega-paneler, mobil fullskjerm-ark. Hero: Linear-stille (luft, H1 76 px medium, én undertekst, små knapper, produkt i 1:1 med fade). HeroPortal i tre visninger styrt av global nivå-state. Reisen: velger + stegpiller i panelets topplinje.
- Status: shippet på /v3, screenshot-verifisert, IKKE brukerbekreftet. / uendret.

## Landingsside V4 (prototype, /v4) — status
- Ny fra-scratch hero: «Utleie på autopilot.» Venstre budskap, høyre boligfoto (Nygårdsgaten 5) med start-zoom → morph til eiendomskort → sekvensiell aktivitetsliste → hviletilstand. Fonter: PP Right Grotesk / ABC Diatype / Instrument Serif (fontvelger nederst til venstre er midlertidig).
- Nav (`components/forside/v4/NavV4.js`) er nå fullbredde: logo helt til venstre, Logg inn/Se DigiHome helt til høyre, kantpadding px-5/8/10. Hero beholder 1280px-container.
- Ikke brukerbekreftet: zoom/focal point, fontvalg, seksjon under hero. Root `/` er urørt.

### V4 brand-retning (etter brukerens kritikk: «for Claude/LLM-brand»)
- Låst display-font: PP Right Grotesk (H1 ~6vw, tracking −0.035em). Serif og fontvelger fjernet fra V4.
- DigiHome-lilla (#D496FF, mørk tekst) er primærknapp: nav-CTA, hero-CTA, «Godkjenn» i scenen. Ink-knapp finnes som variant.
- Canvas nyansert fra krem (#F4F1EA) til stein (#F3F1EC). Nav følger.
- Frame 1 rendyrket: «Nygårdsgaten 5 / Bergen · 8 leiligheter».
- Frame 3 = eiendommens dag (ikke AI-logg): Husleie registrert · 64 500 kr · 8 av 8 / Leiekontrakt signert · Emma Sørensen · Nygårdsgaten 5A / Spørsmål fra Jonas løst · Besvart fra leiekontrakten (Jonas-avatar) / Varmtvann · Rørlegger foreslått → Godkjenn → Rørlegger bestilt · torsdag 09:00 · Godkjent (Kari-avatar). Footer inne i scenen: «Én godkjenning fra Kari. Resten var gjort.»
- Portretter: /public/v4/jonas.webp, /public/v4/kari.webp (Unsplash, beskåret med sharp). Kun der mennesker faktisk er.
- Hero følger nav-kantene (px-5/8/10), grid 6fr/7fr. Mobil: nav-CTA skjult, tidskolonne skjult, bildet vises med fasade-fokus (imgH 1.35, translate −30 %).
- Status: shippet + screenshot-QA (1920/1366/390), ikke brukerbekreftet.

### V4 hero v-a («alt er stille, unntatt én ting») — shippet, ikke brukerbekreftet
- Lag 0: tonal flate (#EDEAE3) bak hele høyre panel, 1 px inset-ring. Header (foto) = min(43 %, 100 % − 400 px) så dagen alltid får ≥ 400 px.
- Lag 1: rail (1 px) tegnes inn ved morph; hule prikker på fullførte rader (dempet tekst), lilla prikk + tonal stripe på aktiv sak, grønn når godkjent. Jonas-avatar inline i rad 3.
- Lag 2: godkjenningskort i varm charcoal (#221F1A), off-white tekst, lilla Godkjenn, én skygge. Bryter ut 24 px over høyre kant, sentrert på Varmtvann-raden, aldri under panelbunn − 20 px (målt med refs). Mobil: kompakt kort dokket i bunnen.
- Faser: foto 2,0 → stig 1,0 → rad1–3 1,3 → rad4 0,7 → kort 1,8 → godkjent 1,0 → ferdig (≈7,8 s). Godkjent: raden ekspanderer med «Rørlegger AS bestilt · torsdag 09:00 · Jonas varslet» + Kari-chip; status → «Alt i orden».
- Kortets copy: Venter på deg · 22:41 / Rørlegger AS / Torsdag 09:00 / 3 450 kr / Godkjenn / Sak opprettet automatisk · sendt til Kari.
- Neste: seksjon 2 = produktet på desktop + mobil (beauty shot, samme sak på begge flater). Krever ekte skjermbilder fra brukeren.

### V4 mobil som egen komposisjon (etter Sana-sammenligning) — shippet, ikke brukerbekreftet
- Header 72 px på mobil (64 desktop), logo 23 px, hamburger = to 22 px-streker som blir kryss. Mobilark top-[72px].
- Hero mobil: H1 56 px, kort ingress («Hele utleien samlet. Mye av arbeidet gjort for deg.»), én full-bredde lilla CTA, stille lenke under («Vil du slippe alt? Se forvaltning →»). Desktop: knapp + lenke på rad, lenken dempet.
- Eget mobilfoto: /public/v4/bolig-hero-mobil.webp (560×901 portrett fra v3/bygaard.webp, fasade + balkong) via <picture> (max-width 639px). fokusY 0.62 på mobil.
- Egen mobilsekvens FASER_SMAL: foto 2,8 → stig 0,9 → Husleie ✓ → Kontrakt ✓ → (Jonas hoppes over) → Varmtvann («Rørlegger foreslått · 3 450 kr») → kompakt charcoal-panel dokket i bunn → godkjent («Rørlegger bestilt · torsdag 09:00» + Kari) → Alt i orden. Haker i stedet for rail/prikker på mobil.
- Mobil-scene: clamp(600px, 74vh, 660px); dagen får minst 430 px.
- Seksjon 2 (produkt desktop + mobil, komponenter, én kryss-interaksjon) er diskutert, venter på: mobil sak-skjermbilde som fasit, aksept for én interaksjon, evt. ekte komponentkode.

### V4 «tenk enda bedre»-runde — shippet, ikke brukerbekreftet
- Hoved-CTA er nå «Start med din adresse» → /bli-utleier/start (onboarding med adressesøk). Nav-CTA er fortsatt «Se DigiHome» → /omvisning. Forvaltning = stille lenke under.
- Mobil: scenen venter på brukeren (IntersectionObserver-terskel 0,7 på < 640 px; 0,35 på desktop). Førsteskjerm = statement + stille foto.
- «I dag · tor. 3. sep.» — ekte dato fra klientens klokke (nb-NO, satt i useEffect).
- Hvile-drift: etter «ferdig» går fotoet fra scale 1.06 → 1.025 over 20 s (linear). Mobil 1.12 → 1.085.
- Preload av boligfoto per flate i app/v4/page.js (<link rel=preload media=...>, fetchpriority=high), fetchpriority=high på <img>. Fontene preloades allerede av next/font.
- Ultrawide-tak: nav og hero deler max-w-[1760px] mx-auto.
- Lilla punktum trukket −0,06 em inn mot t-en.
- Nytt mobilutsnitt: bygaard.webp extract(520,150,560,751) → mindre løv i toppen.
- Utestående: seksjon 2 (produkt på desktop+mobil, samme charcoal-kort som interaksjon) venter på fasit-skjermbilde av mobil sak-visning fra brukeren.

### V4 adressefelt i heroen — shippet, ikke brukerbekreftet
- `components/forside/v4/AdresseFelt.js`: én pill (56 px, #FBFAF8, 1 px ring, lilla fokusring) med lilla «Start →» inne i feltet (kun pil på mobil). Erstatter CTA-knappen. Sekundærlenken «Vil du slippe alt? Se forvaltning» er fjernet — valget ligger i onboardingens steg 2.
- Ekte forslag fra eksisterende `GET /api/address?q=` (Google Places m/Bergen-bias, Geonorge-fallback), debounce 220 ms, maks 4, forslag med husnummer prioriteres. Tastatur ↑↓ Enter Esc, ARIA combobox/listbox.
- Valg → `GET /api/address?place_id=` → `/bli-utleier/start?address&postal&city`. Onboardingen (OwnerOnboarding2026) leser allerede disse, verifiserer, geokoder kartet og hopper til steg 2 («Hvordan vil du leie ut Nygårdsgaten 5?»). Verifisert ende-til-ende desktop + mobil. Enter uten valg = første treff; tomt felt → /bli-utleier/start uten parametere.
- Wrapper har `relative z-20` så forslagslisten ligger over scenen (som er egen stacking context via dh-cover-inn).
- Ingen backend-endringer.

### V4 hero: mikro-opplevelse (interaktiv godkjenning + din adresse → din bolig) — shippet, backend-testet, ikke brukerbekreftet
- Sekvens-hook støtter HOLD-faser (`ms: null`) + `videre()`. Kortet venter på brukeren; auto-godkjenning (Kari, 5 s) kun hvis peker/finger aldri har vært i heroen (pointerenter/move/down/touch/focus, samt :hover-sjekk).
- Handlingsspor under Varmtvann (Diatype, ikke monospace): Sak opprettet · Varmtvann · hele bygget / Leverandør funnet · Rørlegger AS · ledig torsdag / Krever godkjenning · 3 450 kr. Kollapser ved godkjent.
- Ditt trykk → grønn «✓ Godkjent» → kort kollapser → «Godkjent av deg · nå». Auto → Kari-avatar «Godkjent · 08:02». Footer: «Én godkjenning. Resten gjorde DigiHome.» Idle-puls på knappen (.v4-puls i globals.css).
- Adressevalg personaliserer heroen (ikke navigasjon): scene fader ut → adresse/rader byttes → Street View-foto om kvalitetsporten godkjenner → spilles fra frame 1. Knappen blir «Fortsett» → onboarding m/ address/postal/city.
- Backend: GET /api/streetview/meta?lat&lng&q og GET /api/streetview?lat&lng&q&w&h&fov&pitch (server-nøkkel GOOGLE_MAPS_API_KEY). Port: kun Google-pano (ikke 'CAoS…' brukerbidrag), ≤ 40 m, heading mot adressen. 204 ved avslag → demo-foto beholdes med personalisert adresse. To bilder: helbilde (fov 68/pitch 14, panelets format) + header-bånd (fov 52/pitch 20) med Google-attribusjon synlig; crossfade ved morph. Backend-testagent: 8/8 grønt. MERK: Google Maps Platform-vilkår (attribusjon, cache ≤ 30 d) må bekreftes før produksjon.
- Seksjon 2 diskutert: Sana-lignende «scene» med modus-tabs, stort desktop-canvas, mobil som sekundært lag. Venter på valg: bakgrunn, antall tabs, fasit-skjermbilder.

### V4 produktseksjon (Drift) — brukerens Oslo-bilde, sentrert mockup, ingen telefon — shippet, screenshot-QA, venter på brukervurdering
- Bakgrunn: brukerens opplastede bilde (hvit Oslo-bygård + lønnetre + stor himmel, 2000×1129). Lagret som `/app/public/v4/bolig-oslo-{1200,2000}.webp` (skarp) og `/app/public/v4/bolig-oslo-dempet-{1200,2000}.webp` (bakt demping: Gaussian 2.4 px, kontrast 0,86, metning 0,90, kald ivory-veil 16 %). Default-variant `oslo` bruker dempet + radial lysning i midten. Lyst tema (ink-tekst), seksjonBg #DCE1EB.
- Bugfiks: `<img>` i scene-modus hadde `min-w-full max-w-none` → boksen fulgte bildets aspekt og `object-position` var virkningsløs. Nå `w-full` → posKlasse fungerer (mobil 36 % → statement på himmel, desktop 0 % → bygården kuttes aldri).
- DriftScene: telefon-mockupen fjernet. Ett objekt, alltid sentrert (`max-w-[min(1320px,86vw)]`, min-h 600). Godkjenningskortet (charcoal + lilla) ligger nå kompakt i produktets høyre kolonne over Detaljer: «Venter på deg · 22:43 / Rørlegger AS · torsdag 09:00 / 3 450 kr [Godkjenn]». Godkjenn → statuschip «Bestilt», historikkrad «Godkjent av deg», Saker-badge 0, Detaljer «Godkjent · nå», Tilbakestill. Under lg: `Kompakt` — samme sak i smal produktflate (ikke telefonramme).
- Tabs: lett mode-switch (tekst + 1,5 px hårlinje under aktiv), ikke pill-container, ikke sticky. Alle fem får plass på 390 px (gap-4/14 px).
- Copy: «Fra melding til løst. DigiHome gjør resten.» / «Leietakeren melder. DigiHome oppretter saken, finner leverandør og henter pris. Du godkjenner med ett trykk.»
- Bakgrunnsvelgeren (nede til venstre) står fortsatt — fjernes når brukeren låser retningen. `justering`/`komposisjon` er fjernet fra DriftScene/BAKGRUNNER.
- Frontend-testagent ikke kjørt (krever eksplisitt tillatelse).
- Tabs justert etter tilbakemelding (retning A «minimal editorial»): inaktiv 60 % ink (også ikke-klare), aktiv 100 % ink + medium + 2 px strek, 15,5 px / 14 px mobil, gap 40/36/18 px, én hårlinje (10 % ink) under hele raden.

### V4 TillitStripe (logo-/trust-stripe) — shippet, screenshot-QA, venter på brukervurdering
- Ny `components/forside/v4/TillitStripe.js`, montert i ForsideV4 mellom hero og ProduktSeksjon. Samme stein-bakgrunn som heroen (heroens «fot»), én hårlinje øverst, ~104 px høy på desktop.
- Copy: «Koblet til tjenestene du allerede bruker.» (ikke «partnere»). Ingen kort/captions/badges/marquee.
- Logoer (brukerens valg, i livssyklusrekkefølge): FINN · BankID · Vipps · PowerOffice · Keyhole · Airbnb · Booking.com. Offisielle vektorfiler hentet fra Wikimedia Commons (FINN, Vipps, Airbnb, Booking.com) og aktørenes egne nettsider (bankid.no, usekeyhole.com, poweroffice.no), normalisert til tett viewBox i `/app/public/v4/logo/*.svg`. Vipps: clear-space-markørene fjernet.
- Tegnes monokromt via CSS mask-image + currentColor (62 % ink), høyde per logo (15–25 px) for lik opplevd størrelse. Desktop: label venstre, logoer høyre på én linje. Mobil: label over, logoer i wrap.
- MERK (ærlighet): stripen påstår kobling til alle sju. Kun BankID (via Posten signering) er dokumentert live i koden; FINN leses (Salgsradar) men publisering er uavklart; Keyhole/Vipps/PowerOffice/Airbnb/Booking.com uten evidens. Brukeren valgte utvalget eksplisitt. Logobruk må følge aktørenes brand-retningslinjer før produksjon.
- Revidert etter tilbakemelding: egen tonal flate (#EEEBE4), ingen hårlinjer, sentrert setning over logoene, seks navn (FINN · BankID · Vipps · PowerOffice · Keyhole · Airbnb; Booking.com-fil beholdt), logoer +18 % (18–29 px) og 78 % ink, Vipps optisk nedjustert 3 px, py 56/64, 48/64 px canvas-luft før seksjon 2. ProduktSeksjon: topp-padding økt (pt-16 / lg:pt-24) så tabsene starter lenger ned fra overgangen.
- Revidert igjen (bro, ikke blokk): tonal flate og spacer fjernet. Stripen deler heroens canvas, ingen linjer, pt 4–8 / pb 48–56 (~136 px totalt på desktop), sentrert setning (15 px, 58 % ink) + én rad logoer (74 % ink). Seksjon 2 følger direkte (pt-12 / lg:pt-16). Alternativ B (logoer inne i hero-viewporten) er ikke bygget — heroen er allerede full.

### V4 seksjon 3 — LeietakerSeksjon («Forstår boligen. Ikke bare meldingen.») — shippet, screenshot-QA, venter på brukervurdering
- Ny `components/forside/v4/LeietakerSeksjon.js`, montert etter ProduktSeksjon. Poeng: AI som forstår eiendom — vist som handlinger med grunnlag, ikke «AI-chat».
- Komposisjon (Sana-prinsipp): venstre stor flate (rounded 24, lg: clamp(740px,80vh,820px)) med Jonas' tråd flytende i bunnen; høyre: tittel + ingress + stort register (24 px display) der stegene lyser opp i takt med tråden og får én «grunnlag»-linje (hva systemet visste). Mobil: tittel → flate → register (`contents`-wrapper for rekkefølge).
- Tråden: Jonas sender bilde av berederen (`/v4/bereder.webp`, 4:3, fra Unsplash via vision-agent) + tekst → «Saken er registrert · haster» (mangel, eier varslet) → rørleggerkort som oppdateres på stedet (Venter på eierens godkjenning → Godkjent · besøket er bekreftet, ons. 08:02) → «Saken er løst» (tor. 10:14) → Jonas: «Fungerer igjen. Takk!». Leietakeren ser ikke pris. Ujevnt tempo (FASER), hold på venter-fasen.
- Flate-varianter med preview-velger nede til venstre: **lilla** (default, T.lilla flat), **charcoal**, **foto** (`/v4/jonas-kveld.webp`, stock — dekker ansiktet, kun som test; bygget for å kunne byttes til <video>). Velger fjernes når valgt.
- Ingen tabular-nums i tidsstempler (ga bred mellomrom i Diatype). Statement nederst: «Mindre koordinering. Færre avbrytelser. Full kontroll.»
- Åpent: flatevalg (lilla/charcoal/video), ev. ekte video/foto av leietaker.

### V4 seksjon 3 — omgjort til to akter (video/scene → morph → tråd) — shippet, screenshot-QA, venter på brukervurdering
- Brukeren avviste lilla-flate + høyrekolonne («for tung og designet, forklarende»). Ny idé fra bruker: stor scene (video av leietaker) med Sana-tekst over, som morpher til bare tråden. Bygget som ett spor, ingen kolonne.
- `LeietakerSeksjon.js` nå: Akt 1 (3,4 s) scene + «Leietakeren får svar. Du får bare beslutningen.» + én setning → morph (0,9 s: scenen mørkner til 66 %, tittel glir ut, tråd glir inn) → Akt 2: tråden sentrert nederst (bilde, melding, registrert, rørleggerkort m. in-place status, løst, «Fungerer igjen. Takk!») → «Se igjen» nederst til venstre. Under scenen: tre proof points («Registrert automatisk · Godkjent av deg · Oppdatert helt til løst»).
- Scene: `SCENE.video` (null nå) for eget opptak; fallback stillbilde med sakte scale 1.07→1 over 16 s (kun transform). PLASSHOLDER-bilder: `/v4/jonas-kveld-bred.webp` (desktop) og `/v4/jonas-kveld.webp` (mobil) — Unsplash-stock, må byttes til eget opptak.
- Stage: desktop clamp(680px,86vh,900px), mobil 92svh/min 760. Trigger ved 45 % synlig.
- Teknisk merknad: headless Chromium i screenshot-verktøyet kan ikke spille H.264 — video kan ikke QA-es visuelt her; Mixkit-klipp ble lastet ned men ikke brukt (usett).
- Gamle varianter ligger i /tmp (ikke varig): LeietakerSeksjon.lilla.js, LeietakerSeksjon.prev.js.

## V4 landingsside (/v4) — status 4. sep. (preview, rot `/` uendret)
Rekkefølge: Nav → Hero (adresse → din bolig) → Tillitstripe (ekte FINN-logo i farge) → Produkt (Drift-showcase,
full-bleed Oslo-bygård, mockup 680 px, diskré bakgrunnsvelger-ikon) → Spor («Autopilot, tilpasset måten du leier ut på»:
typografisk triptyk m/ målgruppe-piller Privat huseier / Eiendomsselskap / Forvaltning Bergen og omegn) → Leietaker
(«Forstår boligen. Ikke bare meldingen.»: brukerens 1:1-video + meldingstråd m/ maskert vindu + «Forstått fra én melding»)
→ Alt samlet (fem områder) → FAQ (shadcn Accordion, pris uten tall → kalkulator/demo) → Avslutning (full-bleed +
adressefelt + tre steg) → Footer (delt komponent).
Container-system: nav 1600/40 px · hero 1440 (calc(100%-128px)) · editorial 1360 · full-bleed-seksjoner m/ produkt ≤1400.
Leietakeren heter Ida (kvinnen i videoen) i hero/produkt/leietaker; avatar /v4/ida.webp fra videoen.
Assets: /public/v4/video/stue-{1920.mp4,1920.webm,960.mp4,poster.webp,poster-960.webp}, /public/v4/logo/finn-{farge,mono}.svg.
Åpent: brukergodkjenning av alle seksjoner; frontend-testagent kun med tillatelse; logo-bruksregler (BankID/FINN) før prod;
last opp nye /public/v4-assets til object storage før deploy; /v4/spor/*.webp er ubrukte (kan slettes).

## V4 bedriftsside (/v4/bedrift) — startet 4. sep.
Hero: «Porteføljen på autopilot.» (søster til forsiden). Adressefeltets tvilling = størrelsesvalg 10–50 · 50–250 · 250+ som
skalerer scenen (selskap, bygg, enheter, husleie, saker) og spiller dagen fra frame 1. Scene: bygg-liste + dagens drift-ledger,
kollega (Nora · økonomi) godkjenner et låsbytte, fasadevask 48 000 kr venter på ROLLEN driftssjef → kort → godkjent → «To
godkjenninger i dag. Resten gjorde DigiHome.» CTA: Book en demo (/book-mote). Sannhetsvalg: ingen terskelbeløp, ingen
regnskapseksport-løfte (PowerOffice ikke koblet). Gjenstår: seksjoner under heroen (alle bygg/én oversikt, roller & godkjenning,
økonomi per bygg, leietaker i skala, integrasjoner, pris → demo, FAQ, finale). `/bedrift` (gammel) står urørt.

## 5. sep. — V4 er rot. Nye heroer. /v5 = Sana-struktur (eksperiment)
- **Rot-bytte:** `/` → ForsideV4 (indekserbar, canonical /, OG fra lib/og-v4). `/bedrift` → BedriftV4, `/privat` → PrivatV4,
  `/forvaltning` → ForvaltningV4 (alle kun hero inntil videre; egne OG-bilder via renderOgV4 m/ `str`-param). `/v4` og
  `/v4/bedrift` redirecter (307) til rot/`/bedrift`. NavV4 «Produkt» → `/#produkt` (virker fra undersider). SporSeksjon
  forvaltning → `/forvaltning` («Se full forvaltning»). Layout themeColor → #F3F1EC. Gamle komponenter (Forside2026,
  BedriftLanding, hjem/*) ligger urørt i repoet men er ikke rutet.
- **/privat hero** (`components/forside/v4/privat/{PrivatV4,BoligScene}.js`): «Boligen på autopilot.» Scene = ETT LEIEÅR
  (aug–jul): 12-måneders rad (grønn = husleie inn, lilla = deg), ledger m/ måned i margen, varmtvann i nov → kort → året
  fortsetter (Emma sier opp i mai, ny leietaker Sander Lie i jun). Teller «Du gjorde 0→3 ting i år». Slutt: «Tolv måneder. Tre
  ting du gjorde. Resten gjorde DigiHome.» Adressefelt personaliserer (kun adresse, ingen Street View). Thumb:
  /v4/privat/bolig-thumb.webp. Underlinje: «Hele Norge · ingen bindingstid · klar på ti minutter».
- **/forvaltning hero** (`components/forside/v4/forvaltning/{ForvaltningV4,ForvaltningScene}.js`): «Vi tar jobben. Du
  bestemmer.» Label «Full forvaltning · Bergen og omegn». Scene = ÉN MÅNED med avsender per rad (Nora = din forvalter
  /v4/kari.webp, vaktmester, DH): visning → søkere vurdert → anbefalt leietaker (KORT: «Godkjenn leietaker», Emma Sørensen
  14 500 kr/mnd) → kontrakt BankID · depositum → klargjort → husleie + månedsrapport. Slutt: «Én måned. Ett valg var ditt.
  Resten gjorde DigiHome.» CTA: «Få et uforpliktende tilbud» → /bli-utleier/start?tier=full_forvaltning + lenke Book en
  samtale. Sannhet: ingen pris, ingen avkastningsløfter, «Personlig tilbud innen 24 timer · ingen oppstartskostnad · ingen
  bindingstid» (fra onboardingens SERVICES).
- **/v5 (eksperiment, noindex):** ForsideV4 m/ `hero="stage"` — Sana-struktur: sentrert «Utleie på autopilot.» (én linje
  desktop) + ingress + adressefelt m/ **ink-knapp** (lilla reservert for «Godkjenn») → ÉN scene i full bredde
  (`HeroStage.js`, flex-1, min 620/560, maks 900, radius 24). Virkeligheten fyller scenen (foto nå; `FILM`-slot for eget
  opptak: loop + exit-klipp som kuttes inn når du godkjenner + poster). Produktlaget øverst til venstre (adresse · status,
  dagen som stille linjer, Idas melding som sitat, spor, sluttlinje), kortet bryter ut til høyre på saksraden. Vignett topp/
  venstre-tung så bildet puster nederst/høyre. `?bilde=bygg` = fasaden (bolig-hero) i stedet for stuen (stue-2000). Street
  View-personalisering fungerer i full bredde (testet: Kong Oscars gate 3). Resten av siden identisk med rot.
- **Beslutning som venter på bruker:** bytte rot til stage-heroen? Foto stue vs bygg? Filme eget opptak (eier hjemme, 22:41,
  ikke skjermen) — shotliste gitt i chat. Deretter: samme struktur på privat/bedrift/forvaltning.
- QA: kompilert 200 på alle ruter, screenshots desktop 1440/1920 + mobil 390. Frontend-testagent ikke kjørt (krever tillatelse).

## 5. sep. (forts.) — Hero-veksler på rot + ny sign-up-flyt (/bli-utleier/start)
- **HeroVeksler** (`components/forside/v4/HeroVeksler.js`): to bittesmå prikker nederst til venstre på `/` (opacity .25).
  Setter cookie `dh_hero=side|stage` + router.refresh(); `app/page.js` leser cookien server-side → ingen blink. Kun designverktøy;
  fjernes når formen er valgt. `?bilde=bygg` på rot bytter scenebilde i stage-varianten.
- **StartV4** (`components/forside/v4/start/{StartV4,AdresseSok,BoligPanel,Felt}.js`) erstatter OwnerOnboarding2026 på
  `/bli-utleier/start`. Gammel flyt ligger på `/bli-utleier/start-v1`. Konsept «fortsettelsen av heroen»: V4-canvas, PP Right
  Grotesk/Diatype, ink-knapper, ingen uppercase-eyebrows/ikoner i felt/fake app-kort. Desktop: venstre steg (maks 560) + høyre
  sticky **BoligPanel** (Street View via /api/streetview når meta OK, ellers AdresseKart; tom: charcoal «Din bolig») med kvittering
  Bolig · Modell · Kontakt. Mobil: panel som 132px-stripe over stegene når adresse finnes.
  Steg: Adresse (AdresseSok m/ inline ink-knapp, FINN-lenke/-kode støttes) → Tjeneste («Hvordan vil du leie ut {gate}?», to rader:
  Lei ut selv [5 % · ingen bindingstid · hele Norge] / Full forvaltning [Én fast forvalter, Sarahs foto som human touch, personlig
  tilbud · 24 t · Bergen og omegn; utenfor: «Kommer til {by}» + Registrer interesse]) → Kontakt (Segment Privatperson/Bedrift,
  CompanyPicker gjenbrukt m/ gammel stil, navn/e-post/telefon m/ native landkode-select, avtale-avkryssing for selv, Enter
  sender, fokus på første feil). Ferdig: selv+konto → «Kontoen er klar.» + redirect 1,4 s; ellers «Takk, {fornavn}.»
  Logikk 1:1 fra v1: komplettAdresse, erBergen, tier-prefill (hopper over steg 2), FINN via /api/finn-preview, payload til
  /api/leads (flow-tag 'utleier-v4'), konto-handoff, analytics (form_start/step, tier_*, owner_kind_choice, lead_submit, trackLead).
- QA: desktop 1440 + mobil 390 screenshots for alle steg, tier-prefill, FINN-lenke, Oslo (utenfor område), valideringsfeil.
  Ingen ekte innsending testet (unngå falske leads). Frontend-testagent ikke kjørt (krever tillatelse).
- Åpent: CompanyPicker i V4-stil; tom-tilstand i panelet (charcoal) kan få mer liv; ekte innsending bør testes av bruker.
- **Løft (verdensklasse-runde):** BoligPanel har nå tre tilstander — TOM = papir «Tre steg. Ingen forpliktelse.» m/ stegliste
  og «Under ett minutt»; BOLIG = Street View m/ 18 s drift + «✓ Boligen er funnet»; kvittering m/ glidende verdier + «Registrert».
  Steg 2 er et triptyk i én flate: to kolonner (Lei ut selv / Full forvaltning) med **«hvem gjør hva»-ledger** (3 rader, lilla
  prikk der du er involvert), meta + ink-knapp per kolonne; kolonnen er klikkbar. Ferdig-tilstanden beholder layouten m/ panelet
  fylt ut; topplinjen viser alle steg fullført. Testet m/ mocket /api/leads (ingen ekte lead).
- **Steg 3 — to skreddersydde skjemaer (privat/bedrift):** `SelskapSok.js` erstatter CompanyPicker i V4-stil (pill, forslag,
  status-chip, manuell fallback, valgt rad m/ «Endre», status-bekreftelse). Bedrift: tittel «Registrer selskapet» / «Hvem skal vi
  kontakte?», selskapet først (avtalepart), **porteføljestørrelse** (Segment 1 · 2–5 · 6–20 · 20+, valgfritt → num_properties =
  nedre grense + «Portefølje: …» i notes), Kontaktperson / E-post (jobb) / Telefon. Privat: Fullt navn / E-post / Telefon.
  **Inline-validering:** feil vises først etter blur (beroert) eller etter send-forsøk; grønn hake når feltet er gyldig.
  Telefon vises formatert for NO (909 58 313), lagres som siffer. `?kind=business` forhåndsvelger Bedrift. Kvitteringen får
  «Selskap»-rad for bedrift. Testet mot ekte Enhetsregisteret (DIGIHOME AS) — ingen lead sendt.
- **Avtalevisning (AvtaleArk):** Avtalen åpnes som dokument i et ark (desktop: fra høyre 560px; mobil: bunn-ark 94svh m/ håndtak),
  ikke ny fane. Innhold: tittel · versjon · «Kort fortalt» (pris, bindingstid, hva du får, hva som er ditt) · 9 nummererte seksjoner
  · leseindikator · sticky fot «Jeg har lest og godtar avtalen» (krysser av + lukker, analytics terms_read_accept) + «Åpne som egen
  side» → `/avtale/selvforvaltning` (noindex). Esc lukker, body-scroll låses, fokus inn i arket. Innhold i én kilde:
  `lib/avtale-selvforvaltning.js` (AVTALE_VERSJON = 'selvforvaltning-2025-06' = backend-kontrakten).
  **VIKTIG:** Det fantes INGEN avtaletekst før — checkboxen lenket til /vilkar (generelle brukervilkår). Teksten er et utkast i klart
  språk basert på det tjenesten lover (5 %, ingen bindingstid, BankID-kontrakt, husleieoppfølging, godkjenning før kostnader,
  Bergen tingrett, personvern). MÅ gjennomgås juridisk før produksjon.
- Blur-validering justert: tomme felt rødmerkes kun etter send-forsøk (autofokus + klikk på «Les avtalen» ga falsk feil).

## Forside V4 — hero-scene (film) og «Boliger på autopilot» (denne runden)
- **Root `/` = én-scene-hero med film (standard).** To-kolonner-hero er alternativ 2 via veksleren (`dh_hero=side`).
- **Scenen:** 1.92:1, `max-w-[1600px]`, `lg:w-[calc(100%-64px)]`, høyde `min(880px, 100svh − 124px)`. Eksplisitt `w-full` på
  scenen — uten den overførte `aspect-ratio + max-height` seg til bredden og scenen ble «kuttet» på høyre side (Chrome).
- **Historien (HeroStage):** filmen vises ren først (1,4 s) → bildet dempes og ETT charcoal-panel (topp/venstre) leser dagen rad for rad
  (08:14 husleie · 10:32 kontrakt · 17:46 spørsmål · 22:41 melding fra Ida → ✓ sak opprettet ✓ rørlegger funnet → blokk «Til
  godkjenning 3 450 kr [Godkjenn]»). Handlingen ligger i panelet der hendelsen er — ikke i et separat kort.
  **Godkjenningen styres av filmen:** ved `FILM.trykkVed = 7.9 s` (rett før han legger telefonen i lommen) trykker historien synlig
  (knappen går ned → grønn «✓ Godkjent») hvis du ikke har trykket selv. Ingen hover-avbrudd, filmen fryses aldri. Fallback uten
  film/autoplay: 6,5 s (film) / 2,4 s (foto) i hold.
- **Slutten («hjemme»):** når historien er ferdig OG filmen er ute (`ended`, fallback 5,2 s) → panelet trekker seg, filmen pusher inn
  (1→1.06), varm fargebro (#E2C6A5 @ 0.5), stillbildet `eier-hjemme-*.webp` (han i sofaen) glir inn med samme retning (1→1.04) og
  deretter 42 s umerkelig drift (1.02). Subtil vignett-overlay på stillbildet. Tekst på den tomme veggen (57 %→95 %, over sofaryggen):
  «Én godkjenning.» / «Resten skjedde mens du gikk hjem.» + kompakt charcoal dagskort (adresse · Alt i orden · 4 rader) +
  «Prøv med din adresse ↑» (scroller/fokuserer adressefeltet) · «Spill igjen». Mobil: bunnblokk på lys gradient, 3 rader.
  Egen bolig (Street View) / uten film: panelet blir stående med sluttlinje.
- **Assets:** `/public/v4/video/eier-1920.mp4`, `eier-1280.mp4`, `eier-poster*.webp`, `eier-hjemme-1920/1280/mobil.webp`
  (brukerens sofabilde). Må lastes til object storage før prod (scripts/upload_public_to_storage.mjs).
- **BoligerSeksjon (ny):** rAF-motor (ikke CSS-marquee): rolig drift 26 px/s som eases, scroll-koblet gliding (0.28), dra med
  etterslep, myk stopp ved hover, piler (←/→). Galleri-rytme: ulik bredde (4/5 · 3/2 · 5/4 · 16/10) i én høyde (420/300),
  bilde alene + caption under (sted · sov/m²/modell · pris). Data: `/api/public/properties` dedupet på bilde; < 4 unike → UTVALG
  (8 lokale interiørbilder, Bergen-strøk). Redusert bevegelse → horisontal rulling m/ snap.
- Verifisert i nettleser: avtalen åpner som ark (ingen ny tab), Brønnøysund-søk + valg fyller panelet.
- **Slutten v3 (moderne, uten boks):** status «● Alt i orden · adresse · 22:42» → «Én godkjenning.» (opptil 76 px) → «Resten skjedde
  mens du gikk hjem.» → tre tall på hårlinje (64 500 kr · 1 min · 1) → **AdresseFelt (variant ink)** rett i sluttbildet + «Spill igjen».
  Blokk fra 62 % av bredden (den lyse veggen). Kamera: `pushVed 10.8 s` (filmen skalerer 1→1.07 over 4,4 s) → `hjemVed 11.95 s`/`ended`
  → stua inn (opacity 1,6 s, ramme 1→1.03) → **Ken Burns 1→1.055 over 16 s (ease-out)**. Scenen har `role="group"` (ikke img) fordi den
  inneholder knapp og adressefelt. Nav-innholdet følger scenens kanter på desktop (`lg:w-[calc(100%-64px)] lg:px-0`).
- **OG/lenkeforhåndsvisning:** iMessage viste varmtvannsbereder (fallback til tilfeldig bilde da dynamisk /opengraph-image ikke
  ble hentet i tide). Nå **statisk** `/public/og/forside.jpg` (1200×630, filmens første bilde + hvit logo + «Utleie på autopilot.»),
  rendret én gang via `renderOgFoto` i `lib/og-v4.js` (krever `eier-poster.jpg` ved siden av webp — Satori leser ikke webp).
  Root `app/opengraph-image.js` + `twitter-image.js` slettet; `app/page.js` + `app/layout.js` peker på den statiske filen.
  Undersider beholder egne opengraph-image.js. Merk: i dev viser og:image `http://localhost:3000` (kjent Next-dev-begrensning) —
  riktig i prod/preview-build. iMessage cacher forhåndsvisninger — test med ny URL-variant (f.eks. `?v=2`).
- **Start uten hakk:** historien (og filmen) starter når scenen er ≥ 50 % synlig OG filmen har `canplay/canplaythrough`
  (`onKlar`), fallback 3 s. Ingen unødvendig `currentTime = 0`-seek ved første start.
- **Klipp til stua:** ved `ended` + `hjemEtterMs` 800 (ikke lenger tidsstyrt 11,95 s). Push-in fra 10,8 s (1→1.08 over 5,2 s)
  dekker pusten ved døren og dissolven. Fallback 6,5 s etter ferdig hvis `ended` aldri kommer.
- **AdresseFelt `gjennomsiktig`:** frostet flate (rgba 251,250,248 @ 0.58 → 0.82 ved fokus, backdrop-blur 18px) for bruk på foto.
- **«Frys + zoom» ved ~10,8 s = bufring** (Chrome pauser nedlasting når bufferen er «nok», og rakk ikke resten på treg linje —
  push-in-zoomen fortsatte mens bildet sto). Fiks: filmen `fetch`-es helt ned som blob (2,5 MB / 1,2 MB) og spilles fra minnet
  (`src=blob:`); fallback til strømming etter 5,5 s. `eier-1920.mp4` re-enkodet CRF 25 + faststart (2,9 → 2,56 MB).
- **Film-frys, endelig fiks (verifisert med ekte avspilling, VP9 i headless Chromium — currentTime økte jevnt, ingen stall):**
  (1) Filmen hentes som blob og spilles fra minnet. (2) **Ingen transform/zoom på `<video>` noen gang** («push-in» fjernet).
  (3) Dissolven til stua starter ved `hjemVed = 11,45 s` (siste 0,6 s av filmen ligger under overgangen, 1,3 s), `ended` er reserve.
  (4) `loopWebm` (VP9 1280) velges automatisk når nettleseren ikke kan H.264 (`canPlayType`).

## For boligeiere (`/boligeiere`) — erstatter «For private» (`/privat` → 308)
- Navn: «For boligeiere» (dekker leilighet + hus; speiler «For eiendomsselskaper»). Nav, SporSeksjon (merke «Boligeier») og redirect oppdatert.
  «Forvaltning» beholdt som eget nav-punkt/side. Filer flyttet: `components/forside/v4/boligeiere/` (BoligScene, BoligeiereV4,
  VeiskilleSeksjon, SammenligningSeksjon, StegSeksjon), `app/boligeiere/{page,opengraph-image}.js`. `privat/`-mappen fjernet.
- Dramaturgi: nøytral hero («Boligen på autopilot.» + adressefelt + BoligScene) → **Veiskillet** (to flater: Selvforvaltning lys /
  Full forvaltning charcoal, samme oppbygning, pris 5 % av husleien vs. «Etter omfang · en andel av husleien») → **Sammenligningen**
  («Samme leieår. Hvem gjør hva?» — 7 hendelser, kolonner Du/DigiHome, bryter Selv/Full med sekvensert bytte) → LeietakerSeksjon →
  **Slik kommer du i gang** (4 steg + Sarah som fast forvalter) → FAQ (boligeier-spørsmål, `FaqSeksjon` har nå `sporsmal`/`prisSvar`-props)
  → AvslutningSeksjon (`tittel`/`under`-props). Innholdet holder seg til avtalen (selv: kontrakt/husleie/saker/dokumenter — ikke annonse/visning)
  og sidens løfter for full (annonse, visning, leietakervalg, kontrakt, depositum, drift, rapport). Ingen tall for full forvaltning finnes publisert.

## Språkregel: selvforvaltning er AUTOMATISERT, ikke outsourcet (brukerens presisering)
- Boligeieren er utleier og driver boligen selv; DigiHome er systemet. Det som «går av seg selv», gjør **systemet** —
  aldri «DigiHome gjør resten» / «DigiHome driver». Full forvaltning = en fast forvalter hos DigiHome driver (der er «vi tar alt» riktig).
- Gjennomført på: Veiskille (selv: «Du leier ut selv. Systemet tar rutinen.», type-piller Programvare/Tjeneste, ny ingress
  «hvem som driver boligen: du — eller en fast forvalter hos oss»), Sammenligning (kolonner skifter med modell: Du/**Systemet** vs
  Du/**Forvalteren**; `kolonner`-prop tar array eller objekt per modell; selv-radene har boligeieren som aktør i hver rad),
  BoligScene («Du bestemte N ganger i år» · «Tre beslutninger var dine. Resten gikk på autopilot.»), StegSeksjon (steg 4),
  FAQ (boligeiere + forside-default), AvslutningSeksjon, ProduktSeksjon («Systemet gjør resten.»), HeroStage/HeroScene
  («Resten gikk på autopilot.»), StartV4 (Lei ut selv: «Du er utleier. Systemet tar rutinen.» / Automatisk / Systemet foreslår · du bestemmer),
  Bedrift («Teamet driver — systemet tar rutinen», «går automatisk», kolonne Systemet), metadata-beskrivelser (/, /boligeiere, /bedrift).

## Forsiden · produktseksjonen: Annonse-historien + sticky tabs
- **Sticky tabs**: raden Annonse · Kontrakt · Økonomi · Leietaker · Drift klistrer seg under navigasjonen (top 72/64 px) mens
  produktseksjonen er i view, med frostet pille bak (tema-avhengig). Seksjonen bruker `overflow-clip` (hidden dreper sticky).
  Festet-tilstand sjekkes på scroll (rAF) — IO mistet hopp. Tab-klikk fra festet rad skroller produktet inn under raden.
  Kun Annonse og Drift har innhold; Kontrakt/Økonomi/Leietaker er dempet (ikke bygget).
- **AnnonseFilm** (`components/forside/v4/produkt/AnnonseFilm.js`, erstatter AnnonseScene): «Fra ledig til utleid. Du trykker to ganger.»
  ALT skjer innenfor produktflaten (bruker avviste zoom-ut/frittstående variant: «alt må skje innenfor den rammen vi hadde»).
  Kapitler: Bildene leses (forsidebildet viser stue → kjøkken → soverom, fakta-chips setter seg i høyrekolonnen, miniatyr får ring)
  → Møbleres (tomt rom → møblert, 900 ms dissolve, merkelapp «Illustrasjon · møblert med KI») → Skrives (spes, tittel, tekst, pris)
  → Publiseres (beslutningskort tar fakta-kolonnens plass; «Publiser» → «Publisert · ute på FINN.no») → Utleid (Emma/Martin/Sara dag 1/2/4,
  dag 6 «Send kontrakt» → BankID). Kapittel-linje under flaten (klikkbar). Redusert bevegelse: ingen overganger, start på «klar».
  Ingen skannelinjer/spinnere/skrivemaskin. Mobil: tekstblokker vokser inn (Vokse) i stedet for reservert plass.
- **Bilder**: `/public/v4/annonse/` — `stue-tom-{1200,700}.webp` er GENERERT (Gemini 2.5 Flash Image via Emergent-nøkkel, to pass,
  `scripts/generer-tomt-rom.py`) fra det ekte `interior-openplan.webp` (= `stue-moblert`). Kjøkken/soverom/spisestue/bar er ekte
  showcase-bilder. FINN-publisering vises som produktløfte etter brukerens ønske — må være/bli reelt før produksjon.

## Produktseksjonen som KAPITLER (Annonse → Kontrakt → Drift) — juni 2025
- **Ett løfte per tab.** Annonse = «Fra fem bilder til valgt leietaker.» Kontrakt = «Fra valgt leietaker til nøklene i hånden.»
  (signering + depositum + overtakelse hører i Kontrakt — ikke i Annonse; ingen egen Overtakelse-tab.) Kapitlene spiller videre av seg selv
  (`videre()` i ProduktSeksjon; `laast` når brukeren velger tab; kun når seksjonen er synlig). Filmene pauser når seksjonen er ute av bildet.
- **Overleveringsobjekt:** Emma-kortet (`ValgtKort` i filmdeler) er sluttbildet i Annonse og åpningsbildet i Kontrakt — samme plass i scenen.
  «Neste kapittel»-bro (NesteBro) med stille fyll-linje før byttet; 360 ms utfading av gammel scene før ny monteres.
- **filmdeler.js** = felles byggeklosser for alle filmer (peker/usePeker, AutoKnapp m/ hover, Sms, Chip/Lapp/Dok, Akter/Fyll, Tekstbytte, Ramme,
  useFilm, ekte FINN- og BankID-svg, BOLIG/EMMA/KARI-fakta). Nye filmer (Økonomi, Leietaker) skal bygges av disse.
- **AnnonseFilm — scenene:** (1) Kveldsåpning: bygården (`/v4/bolig-hero.webp`, kun brukt her) fyller rammen, sentrert adresse + «Ledig fra
  1. november.» + «Lag annonse»; pekeren glir inn og trykker (ring). Bruker avviste ren «knapp midt på tom flate» — bildet må være der.
  (2) BUNKE → mosaikk: bygården krymper ned i en løs bunke midt i scenen, fire bilder lander skjevt oppå (LANDING-ease, løftet skygge),
  teller «Laster opp · n av 5», så sorterer bunken seg ut i mosaikken (MORF), skygger flater ut, romnavn kommer. (3) Lesing: rolig
  kamera-drift 14 % per bilde (ikke zoom — bruker sa «for mye zoom»), nåler ligger i kameraet og motskaleres. (4) Styling: Utvalg rundt sengen
  (spotlight-dim utenfor) + instruksjonskort øverst («Instruks til stylingen · Arbeider» m/ fyll-linje, setningene kommer én og én) → skille
  høyre→venstre til 44 % (draggbart) → helt stylet; «Sengen er redd opp»-pille. Kun re opp seng — aldri møbler. (5) Utkast (banner 47 %),
  (6) FINN (ekte logo), (7) interessenter m/ portretter (`leietaker-{emma,martin,sara}.webp`), visningsslots, SMS-bobler, (8) Velg Emma →
  «Emma er valgt» → Emma-kortet. Easing: MORF (in-out) for alt som flytter seg, EASE (expo-out) for det som kommer inn.
- **KontraktFilm:** ett papir (Papir) reiser: Leiekontrakt (felt fylles i tre puljer, stiplet = hentet fra annonse/søknad) → signaturer
  (Kari 14:02, SMS til Emma, Emma 14:37, «Signert av begge») → DepositumKort (Keyhole-logo `/v4/logo/keyhole.svg`: konto i Emmas navn →
  innbetalt → sikret 37 500 kr) → samme papir blir Overtakelsesprotokoll (4 rom stående 3:4 m/ grønn hake, målerstand, 3 nøkler, rengjøring)
  → «Signer protokoll» → InnflyttetKort (charcoal). Sidespalte m/ SMS-er; flytende nederst til høyre når scenen er smal.
- **Tekstregel (bruker):** ingen «tre trykk», «seks dager», «resten gjorde systemet» — det er AI-slop. Konkret, rolig, menneskelig.
- **Moderne-pass (bruker: «gjør alt mye mer moderne»):** blur-inn på alt som kommer inn, frostet glass (GLASS i filmdeler) på etiketter over
  bilder, indre lys-hårlinje (LYSKANT) på bildefliser, hjørnemarkører på utvalget, rundere kort, glass-adressepille i åpningen, kapittel-
  fremdrift som tynn lilla linje i aktiv tab-pille (onFremdrift). Teller står nederst til venstre i scenen (unngår sticky tab-rad).

## Kamerascenen i Annonse + veggfortellingen i Hero — sept 2025 (agent-testet, ikke brukergodkjent)
- **Annonse «Begynn med bildene.» (FOTO1–STABEL) bygget om etter brukerens spec:** ikke «bakgrunn → hvit boks → telefon i boksen», men
  «eiendom → editorial tekst → intelligent lag rett over scenen». Fasaden fortsetter bak hele scenen (`Bakteppe`: samme geometri som
  åpningsflisen, statisk uskarp kopi blur 7 px/−8 % tones inn), tekst nede til venstre uten boks («01 · Annonsen» / «Begynn med bildene.» ord
  for ord / «Fem bilder fra mobilen holder.» / svak «DigiHome ordner resten…»), kamerautsnittet (`Soker`) som produktobjekt — stort avrundet
  3:2, glir inn fra høyre (48 px, 0.94→1, 1,2 s inn i FOTO1), tredelingsnett, «Fasade · 1 av 5», utløserring, autofokus-hjørner (`Autofokus`,
  v4-fokus), svart blink. Ingen telefonkropp, ingen statuslinje, ingen «1×». Hvert bilde løsner som miniatyr (flisen, transform) og lander i
  raden med fem plasser under utsnittet (`KameraRad` — raden ER telleren; 7-strekers Akter skjult t.o.m. STABEL). STABEL (2,6 s): utsnittet
  legges ned, tittel → «Vi gjør resten.» + HANDLINGER én og én («Romtype gjenkjent», «Bilde optimalisert», «Rekkefølge foreslått»). BILDER: bakteppe
  → papir, raden sorterer seg til mosaikken. Ny akt {fra: STABEL, «Vi gjør resten.»} (10 akter). Tider: FOTO1 3400, FOTO2 1100, FOTO3/4 1000,
  FOTO5 1300, STABEL 2600. Mobil: `KameraKompakt` (samme idé, stående; utsnittet står gjennom STABEL). Fjernet: `Mobil`, `RullTopp`, `SokerKompakt`.
  Regel: aldri `sw`/`sh` som lokale navn i `layout()` (kolliderer med mosaikkens) — kameraet bruker `kw`/`kh`.
- **Hero-veggen = fortelling om hva DigiHome er (`Veggfortelling` + `useFortelling` i HeroStage, kun direkte-modus):** fem beats
  Annonse «Annonsen skriver seg selv.» → Kontrakt «Signert med BankID.» → Økonomi «Betalt. Bokført.» → Drift «Noe skjer. Rørlegger booket.» →
  «Kvelden er din.» (holder 7,2 s m/ dagens tall) — loop. Ord for ord med keyframes (`v4-ord-inn/ut`, `v4-linje-inn/ut` i globals.css — ikke
  transitions, fordi ordene remonteres per beat). Faste minimumshøyder (2 linjer, align flex-end) — ingenting hopper. Register nederst
  «01 Annonse · 02 Kontrakt · 03 Økonomi · 04 Drift» (aktivt i blekk) → dagens tall i siste beat. **Telefonstrømmen følger veggen:** `puls`
  (én per beat) → hendelsen kommer 1,3 s etter at veggen har sagt det. STROM = Visning booket → Kontrakt signert → Regnskapet er ført →
  Emma bekreftet. «Husleie mottatt» og alle kr-beløp fjernet (brukerkrav). `puls === undefined` = egen takt (Street View-flyten), `null` = vent.

## Hero-video ved lasting, Hero «zoom»-variant, Økonomi-film — sept 2025 (agent-testet, ikke brukergodkjent)
- **Hero-video synlig fra første paint (fiks):** scenen hadde `opacity: 0` til React var hydrert + 350 ms (`direkteInne`) — blank hero på treg
  lasting. Fjernet JS-porten (wrapperen har allerede CSS-inngangen `dh-cover-inn`); SSR-HTML har nå `opacity:1`, video har poster + autoPlay.
  Verifisert: video spiller 0,7 s etter navigasjon.
- **Hero-variant `zoom` (HeroZoom.js + dh-zoom-* i globals.css):** tredje prikk i HeroVeksler (cookie `dh_hero=zoom`). Scenen rendres alltid
  i fullskjermstørrelse (bredde × 100svh−64) og beskjæres med `clip-path: inset(var(--dh-iy) var(--dh-ix) round var(--dh-r))` til dagens
  kortgeometri (maks 1600, 1.92:1, r 24). Utvidelsen skjer *mens kortet stiger* (p = scrollY / avstand til pinning) og er fullført nøyaktig
  når rammen pinner seg under navbaren — aldri tom canvas. HOLD 60svh i fullskjerm, så slipper den. Bildet skalerer ikke (rommet avdekkes).
  Veggteksten følger det synlige kortet (`.dh-zoom-vegg`: left calc(61% − ix·0.22), fast bredde). Kun lg+ (ren CSS-media query — ingen
  SSR-flash); under lg vanlig kort. Én HeroStage rendres. `stage` er fortsatt standard.
- **ØkonomiFilm.js (kapittel 4, tab aktivert):** «Fra husleie til ferdig regnskap.» Bygården ER regnskapet: morgenfasade (Drift-asset),
  vinduene lyser (Lys: halo + myk kjerne i kameralaget) ett og ett idet husleien registreres, etikett per vindu («Leilighet 3 · 7 400 kr»),
  Leilighet 5 venter → etikettene flyr fra vinduene og blir linjene i listen (Pille: basis i listen, translate til vinduet; MORF) → dag 3:
  SMS til Mikkel med Vipps → betalt (3. nov) → kveld (fasade-kveld krysstones, scrim/tekst mørk) → rørleggerfaktura (3 900) under listen →
  «Inn · ut» → Bokført · Overført til PowerOffice → «Betalt. Bokført.» Husleier summerer til 64 500 (samme som heroen). Null trykk fra eier.
  Faser: START, LYS1–7, VENTER, LISTE, DAG3, PURR, BETALT, MND, FAKTURA, BOKFORT, SLUTT (~31 s). Kompakt: bilde m/ prikker + liste inline.
  Siste kapittel går tilbake til Annonse (`nesteId` wrap-around i ProduktSeksjon).
- **Åpen designdiskusjon (ikke bygget):** Annonse-seksjonen oppleves som «bilde på bilde» (uskarpt fasadefoto som seksjonsbakgrunn →
  overskriftblokk → avrundet kort → film). Bruker vil beholde den hvite rammen. Foreslått: Retning A (full-bleed stage, én overskrift på
  fasaden, teksttabs m/ lilla underline, papirscener full-bleed ivory) som variant på /v6 for sammenligning. Venter på valg.

## Hero-løft (begge varianter) + zoom silkemyk + mockup-badge — sept 2025 (agent-testet, ikke brukergodkjent)
- **Veggfortellingen = kveldens tilbakeblikk (fortid):** «Annonsen skrev seg selv.» / «Emma signerte med BankID.» / «Husleien kom. Bokført.» /
  «Varmtvannet stoppet. Fikset.» / «Kvelden er din.» — én linje under hver (≤ 60 tegn, 2 linjer). Klokken tikker i statuslinjen («torsdag 20:41» → 20:45, `kl` per beat).
- **Telefonen: én hendelse om gangen** (ikke varselpanel): chip stiger fra telefonen (v4-linje-inn), forrige slipper oppover (v4-ord-ut), samme plass.
  Ingen header-rad, ingen liste. Følger fortsatt `puls` fra veggen (1,3 s etter).
- **HeroZoom silkemyk:** kritisk dempet lerp mot mål per frame (GLATTING 0.14, tidsnøytral), smoothstep-kurve, mikroskala 1.04 → 1.00 på
  `v4-film-hjem-ramme` (CSS `!important` i .dh-zoom-scene, aldri på <video>), HOLD 0.5, `lg:mb-28` etter scenen (luft til «Koblet til tjenestene»).
  SSR-standardverdier for --dh-ix/--dh-iy/--dh-r regnes i ren CSS = kortet ved p=0 → ingen blink ved lasting.
- **SystemSeksjon:** flytende «Husleie mottatt · Leilighet 3 · 13 200 kr»-badge fjernet (`HusleieKort` slettet). Raden i aktivitetslisten inne i
  dashboardet står (ikke bedt fjernet).

## Vegg premium + hero-variant «zoomfull» — sept 2025 (agent-testet, ikke brukergodkjent)
- **Veggen (begge varianter):** ett ord per setning i Instrument Serif kursiv (`kursiv`-indeks per beat: «seg selv.», «signerte», «Bokført.»,
  «Fikset.», «din»), 1.07em, aldri mer enn 1–2 ord. Tittel clamp(40px, 3.9vw, 76px), tracking −0.045em, 2-linjers fast høyde (flex-end).
  Statuslinje: grønn prikk med pulsring (v4-puls-ring), tynne skillestreker, «Alt i orden» i blekk 0.78, klokke tabular. Undertekst 19px/0.64.
  Dagens tall = tre stille kolonner (display-tall + etikett) i siste beat, staggered inn. Register 13px, gap-x-5, nummer 10.5px lilla når aktivt.
- **Variant 4 `zoomfull`** (HeroVeksler prikk 3, cookie `dh_hero=zoomfull`): som zoom, men sticky top 0 / 100svh — scenen går helt opp under
  navbaren. HeroZoom setter `html.dh-nav-klar` når e ≥ 0.96 og rammen fortsatt er pinnet (rect.bottom ≥ vh−2); globals.css gjør
  `[data-testid="v4-nav"]` gjennomsiktig (bg transparent, border transparent, backdrop blur 0) med 450 ms overgang. Klassen tas bort når scenen
  slipper → navbaren tilbake til vanlig. Nav-tekst forblir blekk (rommets topp er lys).
- **Rev. (samme dag):** kursiv serif FJERNET (bruker: «ser jævlig ut»). Veggen nå: én skrift, tre størrelser, `mix-blend-mode: multiply` på
  tekstblokken (trykkes på veggen), meta-linje uten tabular på ord (kun klokka), indeks uten nummer m/ lilla 4px-prikk foran aktivt ord,
  hårlinje 0.12, stats-kolonner. Nav i zoomfull = **lys frostet glass** (bg ivory 0.38, blur 22 + saturate 1.25, hårlinje av lys i underkant)
  — ikke gjennomsiktig. `v4-puls-dot` (opacity-puls) i stedet for ring.
- **Rev. 2 (samme dag) — lag + nav + tekst:** Lag-kilder fjernet: `backdrop-filter` over levende video (nav i zoomfull, telefon-chip) og
  `mix-blend-mode: multiply` på veggteksten — begge tvinger re-kompositering per frame. Nav i zoomfull = helt uten plate (transparent, ingen
  blur, kun farge-transition); lesbarhet fra en myk ivory-gradient i toppen av scenen (`[data-fullskjerm="1"] .dh-zoom-scene::before`, 180 px,
  opacity = --dh-p). Nav slipper platen ved e ≥ 0.2 (aldri blur over video i bevegelse). Veggteksten redusert til: overskrift (76px, 2-linjers boks)
  · én linje (20px/0.60) · hårlinje · meta-linje (adresse · torsdag 20:4x · ● Alt i orden). Indeksraden (Annonse/Kontrakt/…) FJERNET. Siste beat:
  stats-kolonner. Blekk rgba(21,19,15,0.94). Chip: solid ivory 0.94, ingen blur.

## Produktseksjon full bleed-variant — sept 2025 (agent-testet, ikke brukergodkjent)
- **Toggle:** ny lilla prikkegruppe i HeroVeksler (cookie `dh_produkt` = `ramme` | `full`), page.js → ForsideV4 `produkt` → `ProduktSeksjon variant`.
- **`full`:** ivory canvas, ingen bakgrunnsfoto/overlay, ingen overskriftblokk (H2 sr-only). Teksttabs uten kapsel (ord, 14–15px; aktivt ord i
  blekk med lilla underline som også er kapittelets fremdrift — `frem.andel/ms`), ikke sticky. Stagen = `FullStage` i filmdeler: full bredde,
  høyde clamp(660px, 100svh − 64px, 960px); filmen rendres i W/k og skaleres med k = høyde/660 (transform-origin 0 0) — layout/tekst/bilder
  følger (k ≈ 1,42 på 1920×1000). `Ramme` har `full`-prop; alle fire filmer tar `full` (AnnonseFilm bruker Ramme kun i full-modus).
- **Én overskrift:** AnnonseFilm får `tittel`/`ingress` (SCENER.annonse) → `StartTekst` viser seksjonsoverskriften på fasaden i to linjer
  (clamp(44px, 4.6vw, 82px)) + ingress (≤ 46ch) + «Lag annonse». Standardvarianten viser fortsatt «Fra ledig til utleid.».
- Kompakt (<lg): full bredde uten radius. Kjent: kamerascenen (uskarp fasade + skarpt utsnitt) står fortsatt — kan oppleves som «kopi i kopi».

## Produktseksjon full bleed → KINO-modus — (agent-testet, ikke brukergodkjent)
- **Brukerens klargjøring:** «ulikt bakgrunnsbilde for hver scene, animasjonene skjer på bildene» — ingen kort inni foto, ingen ivory-scener.
  Den første full bleed-varianten (FullStage-skalering av kortfilmen) er FORKASTET som konsept; koden (`FullStage`, `Ramme full`) ligger igjen ubrukt.
- **Ny motor** `/components/forside/v4/produkt/kino/Kino.js`: `KinoStage` (absolute inset-0; alle scenefotoer montert, dissolve: nytt bilde
  remountes UNDER det gamle som tones ut — nøkkel = aktiveringsteller; svak driv 1→1.045 over 18 s, av der etiketter er festet i fotoet;
  scrim per tema `mork`/`lys` + ekstra sone-scrim; `lag`-slot under scrimmen), `KinoTekst` (nede til venstre: «01 · Annonsen», tittel ord
  for ord via keyframes, én setning ELLER liste én og én), `Sone` (høyre/midtstilt på desktop, `anker` = forankret ved punkt i fotoet, øverst
  148px på mobil), `Etikett` (pille festet til bildepunkt, dot + ping), `Autofokus`/`Fokus` (fire hjørner), `Rad` (hårlinje), `Fold`
  (grid-rows kollaps), `Merke`, `KinoDok`, `KinoKnapp` (trykker seg selv), `KinoSms`, `KinoNeste`. `dekk()` = cover-geometri (bildeandel → px)
  så etiketter følger fotoet på alle skjermstørrelser; `bilde()` har `posLiten` for mobilutsnitt.
- **AnnonseKino** (32 faser, ~56 s): hele skjermen er kameraet (hjørner, svakt nett, «Fasade · 1 av 5», utløser høyre-midt, blits); per rom
  ligger en fullskjerms-kopi av fotoet over scenen og krymper (transform, origo 0 0) ned i bunken (5 plasser nede til høyre / oppe til høyre på
  mobil) mens neste rom allerede står bak — kopien bærer scrimmen til den løsner. LES1–3: etiketter + autofokus i fotoet (mobil: piller i sonen).
  STYLE: wipe (bredde 0→100 %, skillelinje) avdekker ryddet soverom i `lag`-slot; STYLET bytter bg til ryddet. Annonse skriver seg i sonen
  (FINN-knapp trykkes), interessenter som rader (Emma valgt), slutt = Emma + fakta. Bakgrunn: fasade-kveld → kjøkken → soverom-useng → spisestue →
  stue → (kjøkken, soverom) → stue → fasade-kveld.
- **KontraktKino** (27 faser, ~42 s): fasade-kveld (Emma valgt, Lag kontrakt) → stue-tom (felt m/ stiplet «hentet», signaturer, SMS) → soverom
  (depositum: Keyhole valgt av Emma) → fasade-morgen `lys` (tider 10/12/14, SMS) → kjøkken (protokoll, Signer) → stue-moblert (flyttet inn).
- **DriftKino** (18 faser, ~32 s): fasade-natt → fasade-morgen (`lys`). Etikett på vinduet (Leilighet 2 · Emma → «Passer fint.» → «Varmt vann
  igjen» → «Løst · torsdag 09:58»); sonen forankres til venstre for vinduet (desktop). Chat-bobler → sak → Jonas → Godkjenn → SMS → utført/faktura.
- **OkonomiKino** (17 faser, ~30 s): fasade-morgen (`lys`) → fasade-kveld. Vinduer lyser (radial glorie + kjerne m/ statisk blur, screen-blend)
  i takt med listen til høyre; etikett kun på sist tente vindu (x < 0.7 så den ikke krasjer med sonen); Mikkel purres m/ Vipps; kveld: faktura →
  bokført/PowerOffice. `driv` av (etiketter/lys festet).
- **ProduktSeksjon full-gren:** section bg #0E0D0B, stage `h-[clamp(640px,100svh,1100px)]`, filmen absolute inset-0, tabs = ord øverst
  (pt 92/86 px — under navsonen), farge følger `onTema` fra filmen. Chapter-bytte: 340 ms fade til bunnfarge (uendret mekanisme).
- **Ikke brukergodkjent.** Kjente avveininger: fasade-morgen er blek → lys scrim kan virke tåkete; nav dekker øverste 64/72 px når seksjonen
  står øverst (designet slik). Standardvarianten `ramme` er urørt.

## Kino-modus forkastet · ny åpning i ramme-varianten (AnnonseFilm) — [denne runden]
- **Bruker forlot fullskjerm-foto-konseptet** («vi skal gå vekk fra det konseptet med fullscreen bilde»). Kino-filene ligger igjen bak
  `dh_produkt=full` (kompilerer; `Kino.js` ble delvis omskrevet før pivoten — bigger type, tema per foto, `Blits`, `VinduLys`, `Topp`;
  `AnnonseKino` omskrevet til montasje-konsept; Kontrakt/Drift/Økonomi-kino uendret). Ingen videre arbeid der uten ny beskjed.
- **Ny åpning i `produkt/AnnonseFilm.js` (ramme-varianten, standard):** rammen ER DigiHome-appen.
  Faser: START (1800: tom hvit flate → logoen i to slag: ikonet setter seg m/ overshoot, ordmerket glir ut bak ikonet — `LogoGruppe`,
  ikon `/brand/digihome-icon-purple.svg` + lockup `/digihome-hero-logo.svg` maskert til teksten) → APP (1500: logoen glir til app-hodet
  øverst til venstre; «Hei, Kari.», adresselinje og «Lag annonse» midt i flaten) → PEKER/HOVER/TRYKK_START (pekeren trykker) →
  FELT (1300: knappen blir opplastingsfeltet i scenen, uniform skala fra knappens senter; adressen glir til app-hodet høyre; pekeren ut) →
  DRA (1450: pekeren kommer tilbake langt utenfra med en fanet bunke på fem miniatyrer — `HoldtBunke` som barn av `Peker`; feltet blir lilla
  slippsone når den er over) → SLIPP (1100: bunken spretter ut til fem løse bilder i bunken, `LANDING`-easing, 55 ms stagger) → BUNKE (500) →
  BILDER (2600: sorterer seg i mosaikken; romnavn lander på hver flis + «5 bilder · 4 rom + fasade») → LES1 … som før.
  Kameraet (søker/utløser/«1 av 5»), `Bakteppe`, `StartTekst`, `KameraKompakt` og «Vi gjør resten»-listen er FJERNET (det siste var dobbelt
  med LES1–3). Nye AKTER-tekster (kortere, ett poeng per akt): «Begynn med bildene.», «Sortert. Rom for rom.», «Ser hva rommet har.»,
  «Svarer før noen spør.», «Foreslår det som kan bli bedre.», «Kun sengen. Rommet står urørt.», «Utkastet skriver seg.», «Ute på FINN.no. Ett
  trykk.», «Visningen booker de selv.», «Du velger.», slutt «Emma flytter inn 1. november.».
  Mobil (`AapningKompakt`): samme flate/logo/Hei/knapp (trykker seg selv), bunken kommer opp fanet midt i feltet (DRA) og spretter ut (SLIPP).
- **filmdeler.js:** `Peker` beveger seg nå med `transform: translate3d` (ikke left/top), tar `holder` (holder bunken, skalert 0.92) og
  `children`; `usePeker` tar valgfri `inn(navn)` → hvor pekeren kommer inn fra (Annonse: 'felt' → 420/290 så den kommer utenfra rammen).
  Kontrakt/Drift bruker samme API uendret (verifisert: pekeren vises i Kontrakt).
- **Ikke brukergodkjent** — venter på visuell bekreftelse. Kun screenshot-testet (desktop 1440/1920, mobil 390).

## /forvaltning — hel side bygget (Sarah som ansikt) — [denne runden]
- `components/forside/v4/forvaltning/ForvaltningV4.js` komponerer: `ForvaltningHero` (tekst + Sarahs portrett 4:5, bildetekst m/ fotokreditt
  «Foto: Pia Bråthen») → `LofteSeksjon` («Alt som tar tid, tar vi. Alt som betyr noe, bestemmer du.» — to kolonner «Vi tar.» 6 rader /
  «Du bestemmer.» 4 rader på hårlinjer) → `MaanedSeksjon` («Slik ser en måned ut.» + eksisterende `ForvaltningScene`, nå med Sarah i stedet
  for «Nora», avatar `/brand/sarah-sleeman-360.webp`) → `BrevSeksjon` («Ett navn. Ett nummer.» — brev i jeg-form fra Sarah, tett utsnitt av
  portrettet, telefon + e-post fra `lib/site.js`) → `StegSeksjon` (Samtalen / Tilbudet / Overtakelsen / Rolig, person = Sarah) →
  `FaqSeksjon` (7 forvaltnings-spørsmål; pris-svar uten tall) → `AvslutningSeksjon` («Overlat utleien. Behold kontrollen.», CTA tilbud + samtale).
- Nye seksjoner ligger i `forvaltning/ForvaltningDeler.js`. Portrett: `/brand/sarah-sleeman-{640,1000,1600}.webp` (fra vedlagt 2000×2000).
- Regler holdt: ingen pris for full forvaltning, kun Bergen og omegn, ingen avkastningsløfter, kun opacity/transform.
- Kun screenshot-testet (1440 + 390). Ikke brukergodkjent.
- **Løft av /forvaltning (runde 2):** `MaanedSeksjon` er nå en mørk scene (charcoal, statisk lilla spotlys) med «Rollene» (Sarah / Vaktmester /
  DigiHome-merket / Du) til venstre og `ForvaltningScene` til høyre. Scenen selv: ny **månedslinje** (1. mai → 1. juni, markør som glir fra
  dag til dag — travel uke, så stille til husleien), ekte ansikter (Sarah, vaktmester = /v4/jonas.webp, DigiHome-ikonet som avsender),
  teamrad uten boks, «Venter på deg»-kortet med Emmas portrett + BankID/inntekt/referanse-piller og sprett-inn. `TillitStripe` (logoer) lagt
  mellom hero og arbeidsdelingen. Hero-portrettet setter seg (1.06 → 1) og får svak scroll-parallakse (transform, rAF) etter 2 s.

## /forvaltning hero uten Sarah + /bedrift løftet — [denne runden]
- **/forvaltning hero (mørk scene):** charcoal med statisk lilla spotlys; tekst («Vi tar jobben. Du bestemmer.», CTA tilbud + «Book en samtale»)
  til venstre, `ForvaltningScene` (måneden) til høyre og spiller fra første sekund; «Rollene» (Sarah / Vaktmester / DigiHome / Du) som
  rulletekst under. `MaanedSeksjon` fjernet (duplikat). Sarahs portrett ligger nå kun i `BrevSeksjon` (tett utsnitt + fotokreditt) og
  StegSeksjon-personen. Scenefiks: flex-kolonnen krympet tidslinjen til 0 px (ingen in-flow-innhold) → `shrink-0` på header/tidslinje/team;
  SCENE_H 720–800 så alle seks rader + bunntekst får plass; radpadding 11 px.
- **/bedrift:** `TillitStripe` under heroen; svakt spotlys bak porteføljescenen; `AltSamletSeksjon` byttet ut med ny
  `bedrift/ModulSeksjon.js` — «Bygget for team med portefølje.»: seks kapitler med produktobjekter rett på flaten (rollekjeden for én sak,
  husleie per bygg med stolper, saken melding→leverandør→pris→godkjent, signering m/ BankID-ringer, rapport per bygg og selskap m/ sum og
  PowerOffice, historikk hvem/når) + «Kontroll»-stripe (roller, historikk, BankID via Posten, eksport til regnskap). Hvert kapittel spiller
  når det kommer i bildet (useSynlig per rad). Tall og navn er eksempeldata (Strandgaten Eiendom AS, Kari Nilsen, Jonas Berg).
- Kun screenshot-testet. Ikke brukergodkjent.

## Onboarding «kartet våkner» + artikkelmaler V4 + hero-timing — [denne runden]
- **Artikler:** `/guider/[slug]` og `/nyheter/[slug]` kjører på `components/forside/v4/artikkel/ArtikkelDeler.js` (Sti, Tittel, Byline,
  KortSvar, Fakta, Bilde, StegBlokk, H2/Avsnitt/Punktliste, Kilder, Ansvar, ArtikkelCta, Rader). JSON-LD/HowTo/TOC/notFound urørt.
  `FaqSection` og `GuideCluster` reskinnet globalt til V4-rader (hårlinjer, ingen hvite kort). Ny `components/forside/v4/tokens.js`
  (uten 'use client') så server-komponenter kan bruke T/display; motion.js re-eksporterer.
- **/bli-utleier?address=…:** 400 var falsk alarm (rå «å» i curl). URL-kodet → 200 → klientredirect til `/bli-utleier/start` m/ parametre.
- **Forsiden:** heroscenen (mannen + filmen) personaliseres ikke lenger av valgt adresse (ForsideV4: `eiendom = null`). Velg → «Fortsett» →
  onboarding som før. Veggteksten kommer raskere i direkte-modus (`FORTELLING_T0_DIREKTE` 380 ms, direkteInne 120 ms, ordstagger 95 ms).
- **Onboarding høyrepanel (`start/BoligPanel.js` + ny `start/BoligKart.js`):** «Kartet våkner» — Google Maps (raster + V4 JSON-stil,
  `isFractionalZoomEnabled`) fra sekund én over Bergen (zoom 14, 60 s CSS-drift). Papirboksen «Tre steg» er fjernet; kvitteringen nederst
  (Bolig · Modell · Kontakt) er de tre stegene. Skriving: `AdresseSok` melder aktivt/øverste forslag (`onForslag`) → StartV4 henter
  Place Details (`/api/address?place_id=`, cachet) → `sikt` → nålen glir og kameraet flyr (rAF `moveCamera`, Mercator-senter, zoomkurve
  som dipper på vei; ingen Google pan/zoom-trinn). Bekreftet adresse: fly til zoom 17 → `onLandet` → hold 1,1 s → push-in (scale 1.28) +
  morph til Street View (1,4 s) → langsom drift. Fotoet slippes aldri før kartet har landet (fallback 3,5/4,5 s). Tekstfarger følger flaten.
  Enter velger forslag også når knappen er deaktivert (implisitt submit var blokkert). Mobilpanelet rendres kun < lg (`useUnderLg`) —
  før lastet desktop+mobil kart/Street View dobbelt. Valgfritt: `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` → vektorkart (stil i Cloud Console;
  paletten ligger i `public/v4/kartstil-digihome.json`). Merk: Google-logo/attribusjon ligger under kvitteringsgradienten (ToS-gråsone).
- **Tjeneste-steget:** system vs. menneske — «Lei ut selv» på lys flate (Systemet-chip, Du/Systemet-rader), «Full forvaltning» med
  forvalterportrett (/brand/sarah-sleeman-1000.webp, «Forvalterteamet · Bergen og omegn») på charcoal, offwhite knapp. Arbeidsdeling uendret.
- Testet med Chrome/Playwright-skript (tidslinje, flytur, mobil). Ikke brukergodkjent. /produkt-side og tom-tilstand-valg: bruker sa «tenk selv».
- **Runde 2 (samme dag):** Tjeneste-kortene uten foto/nøkkeltall — kompakte, lys vs. charcoal, DigiHome-merke / lite Sarah-avatar (32 px)
  foran «Systemet · Hele Norge» / «Forvalterteamet · Bergen og omegn». Hele steget står i viewport (1440×800, ingen scroll).
  **Fortsett-knappen er borte:** å velge et fullstendig forslag går videre automatisk (420 ms), FINN-lenke hentes automatisk ved innliming.
  **Full forvaltning kun ≤ 60 km fra Bergen sentrum** (`innenforOmrade(pos, postal, city)`, haversine; fallback postnr/poststed uten
  koordinater) — utenfor: kortet er låst (aria-disabled, dimmet, ikke klikkbart), knapp «Meld interesse» (outline) → kontakt i interesse-modus.
  **Kontakt-steget kompakt:** Segment inline, Fullt navn + Telefon side om side (sm+), e-post full bredde, felt 52 px, mindre luft — står
  i viewport på 1440×800. Testet med Chrome/Playwright. Ikke brukergodkjent.

## Budsjettmodul: én smart topplinje, responsive flater, performance-partner, nytt konsept-deck — [denne runden]
- **Brukerens bestilling:** «forbedre ALT med UI/UX i budsjettmodulen (verdensklasse), Tech tilpasset SaaS», «to rader i toppmenyen er
  unødvendig – tenk smartere», «fiks uresponsive bokser hvor tekst overflower», «performance marketing 8 % honorar per kunde første 12 mnd +
  fast fee (12 000) – alle kundegrupper, også Digihome AS», «oppdater decket – verdensklasse for hele konseptet inkl. budsjetter, animasjon à la
  forsiden».
- **`components/admin/ModellTopplinje.js` (ny, delt DH + Tech):** ÉN sticky linje (lg+). Venstre: ← · selskapsmerke · navn (inline-edit) ·
  [status ▾ utkast/vedtatt] · [periode · horisont ▾ 1/2/3 år]. Høyre: modellens egne kontroller (scenario ▾ m/ «Sammenlign scenarioer» som
  footer, Forutsetninger-toggle) · [Del ▾: investorrom-bryter, deck, Excel, PDF] · [⋯: omvisning, slett m/ inline-bekreft; status på mobil]
  · [Lagre m/ ulagret-prikk]. `Meny`/`MenyValg` generisk nedtrekk (utenfor-klikk, Esc, animate-in). Status kan nå settes fra DH-modellen
  (før: bare Tech). Mobil (<md): status-pillen skjules og ligger i ⋯; navn-input krymper (min 56 px).
- **Tech-modellen (`TechModell.js`):** KPI-kort m/ clamp-tekst, truncate + line-clamp (ingen overflow), grid 2/3/6 kolonner; MRR-bro
  som HTML-waterfall (ikke SVG) m/ kompakte tall («73 k») og brytbare etiketter; prisjustering vises kun ≥ 0,5 % av slutt-MRR;
  Rule of 40 vises først ved basis-MRR ≥ 50 000 kr/mnd (ellers «— tidlig fase»); «Fra budsjett / Manuelt»-toggle; rail kan skjules
  (Forutsetninger-toggle, bunn-ark under xl); seksjonstitler «Huseiere», «Lisens · Digihome AS», «Bedrift», ny «Markedsføring & salg».
- **Digihome-modellen (`BudsjettModell.js`):** topplinje via ModellTopplinje; Slett flyttet fra rail-footer til ⋯; hero-flisen viser
  Inntekter/Kostnader + dekningsgrad-bar; ny rail-seksjon «Markedsføring & salg» (CAC, fast markedsføring, PartnerKort); Unit economics =
  system + oppstart; Faste = admin + andre. Unit-kort viser «+ Partnerhonorar = Full CAC»; LTV/CAC og payback bruker full CAC. Tornado
  inkluderer partner.honorarPct / partner.fastPerMnd når partner er på. Matrise: rad «Performance-partner».
- **Motor (`lib/budsjett-modell.js`):** `rensPartner` + `partner` i STANDARD_DRIVERE og STANDARD_TECH {paa, fastPerMnd 12 000, honorarPct 8,
  varighetMnd 12 (0 = livstid), andelNyePct 100, fraMnd 1, (Tech) gjelder{huseier,bedrift,forvaltning}}. Kohortbasert: honorar = % av
  inntekten fra nye kunder yngre enn varigheten, churn-justert; lisensens «nye» = økning i enheter (fra mnd 2). Fast fee indekseres m/
  kostnadsinflasjon. **Eksisterende planer uten partner-felt → paa:false (tall uendret).** DH: kost.partner, sammendrag.sumPartner/sumSm/
  smAndelPct, cac.{partnerPerEnhet, fullCac, paybackMnd (full), paybackProvisjonMnd}. Tech: kost.partner/kost.markedsforing,
  kost.markedsforingFast (fallback 0 for gamle planer), saas.sammendrag.sm{annonser,partner,markedsforing,salg,andelPct},
  unit.*.{partner, fullCac}, aar[].sm{Annonser,Partner,Markedsforing,Salg}. Excel: ny rad + forutsetningsseksjon (R.kostSum 23→24 osv.).
- **`components/admin/PartnerKort.js` (ny, delt):** toggle-kort m/ fast honorar, %, varighet (6/12/24/livstid), tilskrevet andel, startmåned,
  (Tech) kundegruppe-chips, og motorens tall (kr per ny kunde · kr i perioden · % av inntekt).
- **Deck (`components/investor/DeckKonsept.js`, ny; `/investor/deck` peker hit — `DeckLevende.js` er nå ubrukt):** 11 sider: Forside →
  Konseptet (forsidens `HeroScene`, spiller når siden er synlig) → To selskaper, én plattform (prisliste, animert lisensstrøm) → Hvor vi står →
  Unit economics (mørk, full CAC) → Go-to-market (partner, annonser, B2B, forvaltning som kanal) → Planen Digihome AS (levende laggraf +
  skruer) → Planen Tech (MRR per kundegruppe + skruer inkl. partnerhonorar) → Konsern (eliminert lisens, bro) → Hva om (presets for begge) →
  Det vi trenger (kapital + buffer, bruk av midler, Q&A). `.deck-inn` glir inn per side (stagger via --i), grafer tweener. Tech-serier
  skyves til DH-planens tidsakse ved ulik start. **API:** `/api/investor/deck` returnerer `tech` (koblet → vedtatt samme start → samme start →
  nyeste; `?tech=` for presenter) og `techPlaner`. Investorer ser kun investorSynlige tech-planer.
- **Testing:** backend-agent 8/8 (partner-API) og 5/5 (deck-API m/ tech). Browser-smoke 1920/390 uten konsollfeil/overflow. Frontend-agent
  IKKE kjørt (må spørre bruker). Ikke brukergodkjent visuelt.
- **Åpent:** intern lisens-indeksering (Tech prisindeks vs. DH kostnadsinflasjon) er fortsatt et produktvalg (a: én kilde / b: advarsel).

## Deck løftet til «verdensklasse» (runde 2) — DeckKonsept.js
- 14 kapitler: Forside (ordvis inn-animasjon, innholdsliste) → Hvorfor (privat huseier vs. eiendomsselskap, to kort) → Konseptet (HeroScene)
  → **For hvem** (nytt: Private huseiere · Eiendomsselskaper · Forvaltning, pris + tall i dag) → Strukturen (diagram m/ animerte strømmer)
  → **Organisasjon** (org-kart: Styret felles for begge selskaper – Erik Hoffmann-Dahl (leder) + **Jens-Petter Glittenberg** (styremedlem,
  initial-avatar, ingen foto) → Ledelse Sarah/Martin + Rådgiver Kevin → Tech AS / Digihome AS m/ funksjoner; linjer tegnes ved aktivering)
  → Hvor vi står → Unit economics (Payback-bar m/ CAC-deler media/partner) → Go-to-market (S&M-miks-bar) → Plan DH → Plan Tech → Konsern
  (bro m/ andelsbarer) → Hva om → Det vi trenger (Tidslinje m/ milepæler + bruk-av-midler-bar).
- Navigasjon: fremdriftslinje, kapittelvelger (liste), opp/ned-knapper, tastatur, **N = presenternotater**. Scroll-snap: mandatory +
  scroll-snap-stop always; hjul/styreflate = nøyaktig ett kapittel per gest (treghets-hale låses ute), fri scroll inne i kapitler høyere enn
  skjermen; aktivt kapittel beregnes fra scroll-posisjon (35 %-linje). Tall teller opp og grafer bygger seg når kapitlet blir aktivt; print
  (beforeprint) gjør alt aktivt.
- Obs: brukerens tidligere testplaner («Test Martin», «Test 2», «Investormodell…», «Budsjett DigiHome») finnes ikke lenger i DB — trolig
  slettet av bruker via ny ⋯-meny; testagentene slettet kun egne QA-planer (verifisert i skript). QA-planene mine er slettet.

## Deck runde 3 — ekstern deling, ny kapittelmotor, orgkart-korreksjon (DeckKonsept.js)
- **Ekstern deling («Del»-knapp øverst til høyre i presenter):** dialog `Deling` lager rene lenker `/deck/<token>` (16 tegn) låst til
  planen (+ tech-planen) som vises nå; valgfritt passord (min 4 tegn), valgfritt utløp (7/30/90 d). Lista viser status (aktiv/trukket/utløpt),
  passord-merke, åpninger + sist aktiv, kopier, endre/sett/fjern passord, trekk tilbake/aktiver, slett. URL kopieres automatisk ved opprettelse.
  Rute: `app/deck/[token]/page.js` (+ `app/deck/layout.js` noindex). ConsentBanner/SiteAnalytics/CallTracking skjules på `/deck`.
- **API:** `/api/investor/deck/deling` GET(?plan=)/POST/PUT/DELETE (krever presenter = `modulAuthed 'budsjett'`). `lib/investor-room.js`:
  `createLink` m/ `kind:'deck'|'room'`, `planId`, `techPlanId`; `listDeckShares`; `listLinks` ekskluderer kind 'deck'. GET `/api/investor/deck?t=`
  m/ deck-lenke er låst til `link.planId`/`link.techPlanId` uavhengig av investorSynlig; `investor.ekstern:true`; 401 `{needsPin, ekstern}`.
  Backend-agent 20/20.
- **Ekstern modus (alle `?t=`/`/deck/`-lenker):** ingen valg øverst til høyre (planvalg, notater, PDF, del). Kun kapittelknapp (01/14),
  fremdriftslinje, opp/ned. «Tilbake til planen» ligger inne i skru-panelene (DH/Tech) og som preset «Planen» i Hva om. PDF-knapp nederst
  på siste kapittel for eksterne.
- **Kapittelmotor (erstatter CSS scroll-snap, som bruker sa fungerte dårlig):** roten er `fixed inset-0 overflow:hidden`; hvert kapittel er
  et absolutt lag (`.deck-side`, `data-pos` aktiv/over/under) med egen innvendig scroll; inn/ut = opacity + translateY(±9vh), 620/840 ms expo.
  `side` er sannheten. Hjul: én gest = ett kapittel; treghets-hale gjenkjennes (gap < 160 ms og ikke-økende delta) og ignoreres; ny gest
  = gap > 160 ms eller delta ≥ 1,6× forrige; lås 720 ms etter bytte; en gest som scrollet innvendig bytter aldri kapittel. Touch: sveip
  (> 56 px, eller > 32 px raskt) bytter bare når kapitlet står ved kanten i sveiperetningen ved touchstart. Tastatur som før.
  «Mer på dette kapitlet»-pille når kapitlet er høyere enn skjermen. `#kapittel`-hash leses ved last, skrives ved bytte, følges ved
  hashchange. Utgående kapittel holdes «aktivt» (tall/inn-animasjoner) til det er borte. Overlays (`data-deck-overlay`) fanger ikke hjul/touch.
  Print: alle kapitler statiske. Reduced motion: kun fade.
- **Orgkart:** Styret felles for begge selskaper = Erik Hoffmann-Dahl (styreleder), **Jens-Petter Glittenberg (foto `/team/jens-petter-
  glittenberg.webp`)**, **Sarah Sleeman og Martin C. Kviteberg (styremedlemmer i begge selskaper)**. Ledelse: Sarah (CEO) / Martin (CPO).
  Bios for alle fem under kartet. Innholdsliste på forsiden vises kun ≥ lg (mobil: kapittelknappen).
- **Copy:** Hvorfor-kort («Ti verktøy og én innboks», «Én feil koster mer enn et års honorar», «Fem systemer, ingen oversikt», «Folk gjør det
  maskiner bør gjøre»), For hvem «Én plattform. Tre veier inn.», Strukturen «Programvare skalerer …», forside-ingress.
- **DB-status:** ingen Digihome AS-modellplan finnes (bruker slettet). Main-agent la inn `QA Deck DH (slettes)` (2027-01, 24 mnd, partner på)
  så decket kan verifiseres — skal slettes av bruker/agent når egen plan finnes. Alle QA-deck-lenker slettet.
- Ikke brukergodkjent. Frontend-agent ikke kjørt.

## Budsjettmotor v3 + Base-planer + deck «styremedlem-runde» (sept 2026)
- **Motor (`lib/budsjett-modell.js`)**: `rensTrinn`/`trinnVerdi` (nominelle trinn `{fraMnd, <felt>}` — utløst trinn overstyrer grunnverdi × inflasjon);
  `kostTrinn` på DH (adminFast/andreFaste/mfFast) og Tech (utviklingFast/hostingFast/andreFaste/markedsforingFast); `grunnleggere`
  {paa, paslagPct, personer[{navn, rolle rd|sm|ga|drift, andelPct, trinn[{fraMnd, brutto}]}]} i begge (Tech klassifiserer per rolle i SaaS-
  oppstilling); DH `organiskAndelPct` (CAC bare på betalte nye, `cac.blandetCac`); `sammendrag.partnerHale/partnerHaleMnd` (forpliktelse etter
  perioden, DH + Tech); Tech `huseier.modus 'kroner'|'kunder'` + `kunderPlan[{fraMnd, nyePerMnd}]` (annonse = nye × CAC); `skatt`
  {paa, satsPct, konsernbidrag} på DH-plan → `beregnKonsernSammenstilling({skatt, startYm})` regner 22 % per kalenderår per selskap m/
  fremførbart underskudd, konsernbidrag valgfritt, betalt året etter (feb/apr 50/50) → `skatt.{perAar, betalt, etterPeriode, fremforbart}`,
  `kontant.{resultat, akkumulert, kapitalbehov}`, `sammendrag.{skatt, resultatEtterSkatt, kapitalbehovEtterSkatt}`. Eksisterende planer uten
  felt: alt AV → identiske tall (regresjon verifisert). Backend-agent 5/5 roundtrip.
- **UI**: `GrunnleggerKort.js`, `TrinnFelt.js` (delt). DH-rail: Organisk andel, trinn på admin/andre/mf, seksjon Grunnleggere, seksjon Skatt &
  konsern, partner-hale-note. Tech-rail: Kunder/Kroner-modus m/ kunderPlan- eller annonsefase-editor, trinn på utvikling/hosting/andre/mf,
  Grunnleggere (m/ rolle), hale-note, P&L-rad Grunnleggere. Konsern: KPI «Kapitalbehov etter skatt», skattetabell per kalenderår, fremførbart.
  Excel (DH): trinn-linjer eksporteres som verdiserier (merket), Grunnleggere-rad, R-indekser flyttet +1.
- **Base-planer (scripts/lag-base-planer.mjs, idempotent)**: «Base 2026–2029 · Digihome AS» (2026-08, 36 mnd, fakta fra portefølje: 31 enheter,
  31 250 kr/mnd; vekstplan 2→4→6→8→10→12→15→20→25 à 4 mnd; churn 5 %; honorar 10,5 % × 21 867 = 1 837 kr eks. mva; lisens 200; CAC 5 000 i AS
  (alternativ a); partner 8 %/12 mnd/fast 0; trapp 30→225 % ved 440; årslønn 600 k + 35 %; admin 10 k; grunnleggere Sarah 70/Martin 20,
  30→35→40→45 k fra okt 26/jan 27/28/29; skatt 22 % uten konsernbidrag; indeks 3/lønn 3,5/kost 3) og «Base 2026–2029 · Digihome Tech AS»
  (koblet; huseier/bedrift 0 = kun forvaltning; Fable 30→35→40→45 k; hosting 1 500; variabel 70/enhet; andre faste 15 k; grunnleggere Martin
  80 rd / Sarah 30 sm). Gamle «Plattform 2027–2028» og QA-planen slettet (bruker ba om å erstatte). Resultat: inntekt 10,7 m, konsern −1,2 m før
  skatt / −1,3 m etter, bunn 2,1 m aug 2028, pluss sep 2028, 417 enheter jul 2029. Avvik mot rådgiverens tabeller (+1,47 m): rådgiver startet på
  ~90 enheter (system: 31), lavere bemanningskost, hosting 250 kr og CAC i Tech. `scripts/avstem-base.mjs` skriver avstemmingen.
- **Deck**: 17 kapitler. Nytt: «Kort fortalt»-stripe på forsiden (enheter i dag→slutt, å hente, break-even, ARR), «Markedet» (≈570 000
  husholdninger leier, 23 % — SSB avrundet, VERIFISER før ekstern bruk; planen = 0,07 % av markedet), «Den ene variabelen» (CAC 4–10 k ×
  organisk 0/15/30 % → kapitalbehov etter skatt + resultat, live; avledede kort), «Risiko» (kundekost, én kodebase, jus, churn/bemanning m/
  tiltak og «Se tallene»-lenker), «Det vi trenger» (å hente = kapitalbehov etter skatt × 1,3 rundet til 250 k; hva pengene utløser;
  grunnleggerne; forpliktelser utenfor perioden: partner-hale + skatt). Konsern-kapittel m/ skatt. GTM-kort og Tech-skru («Selvbetjente
  huseiere / mnd») tilpasset ren forvaltningsbase. Preset «Med plattformkunder» erstatter «Uten annonser».
- Konsern-org i systemet: «SHD Gruppen AS» (org.nr 935 431 646) → konsernbidrag kan være mulig; ikke aktivert (avventer bruker).
- Ikke brukergodkjent. Frontend-agent ikke kjørt.

## Deck design-løft — forsidens redaksjonelle språk (sept 2026)
- Nye primitiver i DeckKonsept: `Ingress` (ingress under H2), `Todelt` (overskrift + ingress venstre 5/12, innhold høyre 7/12; `bredHoyre` 4/8),
  `Kolonne` (hårlinje-kolonne à la forsidens «veiskille»: ikon/over-etikett, display-tittel 26–30 px, tekst, hårlinjerader, fot), `Fakta` (tall i display).
  Prinsipp: hårlinjer og luft i stedet for boks-i-boks; én mørk «gjenstand» per kapittel.
- Omlagt: Hvorfor (Todelt + to Kolonner), Markedet (Todelt m/ stor Fakta + tre Kolonner), For hvem (Todelt bredHoyre + tre Kolonner m/ Fakta-par),
  Hvor vi står (Todelt + 2×2 hårlinjetall), Unit economics (Digihome AS først «· i planen», Tech-grupper «· oppside», hårlinjetopper), GTM (Kolonner),
  Risiko (2×2 hårlinjeblokker m/ «Se tallene»), Det vi trenger (tre hårlinjekolonner). Forside: TOC kompakt (13 px / py-5px) så forsiden får plass på 800 px.
- Tech Base-plan justert: hostingFast 2 500, variabelPerEnhet 40 (70 ga meningsløs margin for bedrift-enheter à 79 kr). Konsern: −0,63 m før skatt,
  −1,14 m etter, bunn 2,04 m aug 2028, pluss sep 2028. Script oppdatert.
- Ikke brukergodkjent. Frontend-agent ikke kjørt.
- **Løft 2 (signaturvisualer)**: `Punktfelt` (360 punkter = ≈570 000 husholdninger; lilla = 1 %, liten prikk = planen) i Markedet; `Bane`
  («Rullebanen»: akkumulert kontantstrøm etter skatt m/ bunn-markør og bånd for hentet kapital) i Det vi trenger; H2 avsløres ord for ord
  (`deck-ord`) på alle kapitler; Risiko har ett display-tall per risiko (+kapital ved 8 000 kr, utvikling/mnd, enheter truffet, churn %);
  bunnlinjen viser «Neste · <kapittel>» ved pilene. Mobil uten overflow, ingen konsollfeil.

## Annonsefilmen — ny åpning «filmen begynner der heroen slutter» (sept 2026)
- Bruker: «forbedre alt med starten på annonse-animasjonen … begynner med et adressefelt, fyller inn, så lag annonse … drop alt med logo … verdensklasse».
- `AnnonseFilm.js`: faser START→SKRIV→VELG→FUNNET→PEKER→HOVER→TRYKK_START (logo, app-hode og «Hei, Kari» fjernet). Samme grid som resten av
  filmen: tekstspalten (ny akt 0 «Begynn med adressen.») + scenen. Adressefeltet (heroens objekt) står midt i scenen, «Nygårdsgaten 5» skrives
  med ujevn tasterytme (`TAST`, `useSkriving`), forslagsliste som smalner (`forslagFor`), ↵-markør på første rad, Enter → «Nygårdsgaten 5,
  5015 Bergen» m/ hake. FUNNET: feltet glir opp og blir toppen av «boligarket»: fasaden (flisen 'fasade' — samme piksler som senere i
  mosaikken) til venstre, fire fakta m/ kilde (`BOLIGFAKTA`: Matrikkelen, Kartverket, Entur, Leiemarkedet) til høyre. «Lag annonse» står i
  tekstspalten (som Publiser/Velg); pekeren trykker. FELT: opplastingsfeltet vokser ut fra knappen (måles i Desktop), fasaden glir ned i det
  som første bilde; pekeren kommer med fire (`HAAND`), caption «Slipp fire bilder fra mobilen her». Mobil: samme, stablet; knappen i tekstblokken.
- Tenant-fasen het VELG → nå `VELG_LEIETAKER`. `v4-caret` keyframes i `FilmStil`. ProduktSeksjon: «Fra adressen til valgt leietaker.»
- Skjermbilder ok desktop 1920 + mobil 390 (ingen ny overflow, ingen konsollfeil). Ikke brukergodkjent; frontend-agent ikke kjørt.
- Runde 2 (samme dag): «fortsett å forbedre – timing/smoothness; hele forsiden SUPER responsiv og rask; personen i hero-videoen må være i fokus på mobil».
  · Hero mobil: `HJEM_FOKUS_SMAL_X = 0.30` (object-position 30 % 50 %) i `HeroStage.js` + Telefonstrom-matten tar hensyn til ox. Nettbrett: telefonstrøm-
    flaten smalner (196–252 px) og veggteksten starter ved max(61 %, 38 % + 208 px) – ingen kollisjon 640–1010 px. Meta-raden wrapper pent.
  · Film: tempo strammet (START 800, SKRIV-hale 560, VELG 660, FUNNET 2350), forslagslisten animerer høyden, «, 5015 Bergen» toner inn i stedet for
    teksthopp, `Akter`-strekene deler bredden på mobil (11 akter gikk utenfor kanten).
  · Ytelse: `next/dynamic` for Kontrakt/Drift/Økonomi-filmene + alle kino-varianter (ProduktSeksjon) m/ forhåndslasting av neste kapittel;
    React SSR auto-preloadet 24 bilder (alle <img> uten loading=lazy) → nå 2 (logo + LCP-poster): lazy på film-, boliger-, leietaker-, system-,
    footer- og produktbakgrunnsbilder; LeietakerSeksjon-poster som <picture> (960 på mobil); `heroFilm.js` (uten 'use client') deler FILM med
    app/page.js så preload peker på riktig LCP-bilde (sofa-loopens poster, alle flater).
- Spor-seksjonen («Autopilot, tilpasset måten du leier ut på») løftet i to trinn (bruker: «gjør denne seksjonen VERDENSKLASSE» → «løft til neste nivå»):
  · Tre levende scener (samme motor, tre utsnitt): 01 én bolig – du godkjenner det ene som koster (Godkjenn → Godkjent, to saker veksler);
    02 42 enheter i tre bygg – rutenettet fylles når husleien kommer, sak godkjent av rolle; 03 DigiHome gjør jobben – hendelser strømmer
    gjennom to rader, din rad («Du leste oppsummeringen») ligger fast. Felles slag `useTakt` (3,6 s), bare mens seksjonen sees.
  · Stage-form ≥ 1100 px rad-bredde: ett åpent panel (flex-basis-animasjon i px, innhold på faste bredder → ingen reflow), to rygger; auto-
    skift 8 s m/ lilla `Fremdrift`-linje, hover åpner, pause mens pekeren hviler på stagen. < 1100 px: stablede kolonner (md: 2 kol).
