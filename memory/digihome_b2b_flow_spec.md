# DigiHome — B2B-flyt spec (for "Systemet"-filmen i investor-deck)

Kilde: analyse av privat repo (martinkviteberg1/DigiHome, branch martindevtestnew), klonet til /tmp og slettet.
Deck-tilnærming: vi GJENSKAPER skjermene som scriptede rekonstruksjoner (som ContractDemo.tsx), importerer IKKE app-koden.

## Format
Keynote-tekst (Apple-stil, beige) ⟷ produkt-tur (rekonstruert UI + simulert markør + typewriter + spotlight).
Tone: lite salgsy, konkret/pedagogisk. Hvert keynote-kort forklarer PAINPOINT i klartekst → turen viser løsningen.
Avspilling: auto-spill med manuell kontroll (piltaster/klikk), progress-indikator.

## Salgspipeline (AdminSalg, fane "Huseier") — vektet forecast
Stadier (win-%): Ny (10) → Kontaktet (25) → Visning (50) → Tilbud sendt (75) → Akseptert (100)
Leietaker-pipeline: Registrert (10) → Kontaktet (30) → Kvalifisert (55) → Matchet (80) → Innflyttet (100)
SLA: varsel etter 4 dager uten aktivitet, alert etter 7. Lead-kort: navn, adresse, verdi, stage-dot. Statuser: signed/lost/disqualified.
Property-typer: leilighet/hus/rekkehus/hybel/annet. Strategi: Dynamisk (10+2, kort+lang, anbefalt) / Langtid / Korttid / Usikker.

## Tilbud (ProposalEditor → ProposalView → TilbudPage)
Dokument "Forvaltningsavtale": personlig hilsen ("Hei {fornavn},"), "Vi tar hånd om alt", honorar i % av leieinntekt,
minimumshonorar per boenhet/år, FAQ, "Gyldig til {dato}". Knapp "Aksepter tilbud".
Signering: Aksepter → "Sender deg videre til BankID-signering" → BankID → "Avtalen er signert" (juridisk bindende, e-post).

## Utleie-flyt (rental wizard / ProductTourRental steps)
1. Registrer boligen med AI: last opp bilder → romfordeling/fasiliteter fylles automatisk, bekreft.
2. Bildestudio: AI-bildestyling.
3. Start utleieprosess: velg strategi, leievilkår, screening-nivå.
   Screening-nivåer: (a) Åpen "flest på visning" – kort skjema, melder seg direkte. (b) Kvalifisert – utvidet skjema (inntekt/husstand), forvalter godkjenner. (c) Verifisert – full profil + automatisk kredittsjekk via Creditsafe før visning.
4. Publiser: AI-generert annonse på FINN.no + egen brandet utleieside (ett klikk).
5. Interessenter/visninger: kvalifiserte booker visning selv (kapasitet), automatiske bekreftelser + SMS-påminnelser, sanntid på visningsdagen (forsinkelser, oppmøteregistrering). "48 interesserte".
6. Screening/valg: kandidater scores (eks 94/100: inntekt 5.9x ratio, godkjent kredittsjekk) → anbefaling.
7. Kontrakt: generert fra vilkår (ContractDemo), BankID-signering.
8. Depositum: depositumskonto via bankintegrasjon ELLER depositumsforsikring (ingen kapital fryses).
9. Innflytting: digital tilstandsrapport m/bilder, nøkkeloverlevering, velkomstpakke, leietaker onboardet til egen portal (kontrakt, dokumenter, husleie, meldinger).

## Løpende drift (økonomi + saker)
Husleie kreves inn automatisk. Klientkonto-ledger. Månedlig oppgjør/utbetaling til huseier + ferdige bilag/rapport. "Honorar denne måneden" (X%).
Saker (vedlikehold): leietaker melder → "AI analyserer saken…" → leverandør → løst, dokumentert. Owner portal: sanntids åpenhet (inntekt/belegg/utbetaling).

## Skala (B2B)
Portefølje-dashboard (alle eiendommer, aktive utleieprosesser, kommende visninger i sanntid). Team, rollebasert tilgang. "Like enkelt for 10 som 1000 boliger".
Integrasjoner: FINN, Creditsafe, BankID, bank.

## App-chrome (fra ekte skjermbilde)
Mørk sidemeny (#1a1612-aktig), logo "digihome". Nav ARBEID: Oversikt, Operasjonssentral (Ny), Innboks, Leads (Pro), Reservasjoner, Kalender, Kanaler, Oppgaver, Driftsassistent. DRIFT: Eiendommer, Utleieprosesser, Leieforhold, Dokumenter, Saker, Personer. Bruker: Martin Kviteberg, martin@kviteberg.no.
Aksent: lilla. Primær CTA: grønn ("Sendt til signering"). Deck-bakgrunn: beige #f7f5f2, blekk #1c1815.
Stil-anker i deck: components/deck/ContractDemo.tsx (Operasjonssentral + Autopilot-chat + kontraktsbygger).

## Filmens akter
1. Anskaffelse: lead → pipeline → tilbud → BankID-signert avtale
2. Klargjøring: AI registrerer bolig + styler bilder → publiser FINN
3. Fra interesse til leietaker: visninger booker seg selv → screening/scoring
4. Inngåelse: kontrakt + depositum → digital innflytting → leietakerportal
5. Drift på autopilot: husleie, oppgjør/rapport, AI-saker
6. Skala: portefølje-dashboard, team, integrasjoner
7. Payoff: "Fra første henvendelse til daglig drift — ett system."

Bygges i: components/deck/SystemFilm*.tsx, testrute /app/app/film/page.js, integreres i investor-deck som egen slide etter godkjenning.
