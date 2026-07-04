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
