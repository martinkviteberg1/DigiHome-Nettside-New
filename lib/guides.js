// ---------------------------------------------------------------------------
// Guide-hub — evergreen innhold som svarer på spørsmålene boligeiere faktisk
// googler (og stiller til AI-assistenter). Hver guide er strukturert for både
// SEO (H2-hierarki, interne lenker) og AEO (direkte, siterbare svar + FAQ).
// Rendres av /app/app/guider/[slug]/page.js med Article + FAQPage-schema.
// Juridisk/skattemessig innhold er generell veiledning — disclaimers vises.
// ---------------------------------------------------------------------------

export const guides = [
  {
    slug: 'hva-koster-utleiemegler',
    metaTitle: 'Hva koster en utleiemegler? Priser 2026',
    title: 'Hva koster en utleiemegler? Priser og honorarer forklart',
    description: 'Tradisjonelle utleiemeglere tar etableringshonorar pluss 8–12 % av leien. Se hva du faktisk betaler for — og hvordan du kan betale mindre.',
    category: 'Pris',
    readMinutes: 6,
    updated: '2026-07-14',
    image: '/bergen-rooftops.webp',
    imageAlt: 'Utleieboliger i Bergen — hva koster forvaltningen?',
    // Direkte, siterbart svar øverst (AEO)
    answer: 'En utleiemegler i Norge tar vanligvis et etableringshonorar på en halv til én månedsleie, pluss et løpende forvaltningshonorar på 8–12 % av husleien. For en bolig med 15 000 kr i månedsleie betyr det typisk 10 000–15 000 kr i oppstart og 1 200–1 800 kr per måned. DigiHome tilbyr selvforvaltning for 5 % per utleieforhold og full forvaltning etter individuelt tilbud — uten oppstartskostnad og uten bindingstid.',
    sections: [
      {
        h2: 'Dette betaler du for hos en utleiemegler',
        paragraphs: [
          'En utleiemegler tar hele eller deler av jobben med å leie ut boligen din: annonsering og fotografering, visninger, screening av leietakere med kreditt- og referansesjekk, husleiekontrakt, depositumshåndtering, innkreving av husleie og oppfølging gjennom leieforholdet.',
          'Prismodellen består som regel av to deler: et engangsbeløp når leietaker er på plass (etableringshonorar eller «innleiingsprovisjon»), og en løpende prosent av husleien så lenge forvaltningen varer.',
        ],
      },
      {
        h2: 'Typiske priser i det norske markedet',
        paragraphs: [
          'Prisene varierer mellom aktører og byer, men dette er de vanlige intervallene:',
        ],
        list: [
          'Etableringshonorar: ofte tilsvarende en halv til én månedsleie (engangsbeløp per nye leietaker)',
          'Løpende forvaltning: typisk 8–12 % av brutto husleie per måned',
          'Kun utleieformidling (finne leietaker, uten løpende forvaltning): ofte én månedsleie',
          'Tillegg: visninger utover inkludert antall, fornyet utleie, håndverkerkoordinering og årsrapporter kan komme i tillegg hos enkelte',
        ],
      },
      {
        h2: 'Hva påvirker prisen?',
        paragraphs: [
          'Beliggenhet og boligtype betyr mye: en sentrumsleilighet med høy etterspørsel er billigere å forvalte enn en enebolig med hage og flere leieforhold. Antall enheter gir ofte rabatt. Og tjenestenivået — fra ren formidling til full drift med vedlikehold — er den største prisdriveren.',
          'Vær særlig oppmerksom på bindingstid: mange tradisjonelle avtaler binder deg i 6–12 måneder, slik at du betaler selv om du er misfornøyd.',
        ],
      },
      {
        h2: 'Slik priser DigiHome det',
        paragraphs: [
          'Vi har fjernet etableringshonoraret helt og erstattet timebasert arbeid med teknologi. Selvforvaltning koster 5 % per utleieforhold — du bruker våre digitale verktøy for annonsering, screening, kontrakt og husleie, og gjør resten selv. Full forvaltning prises individuelt ut fra boligen, og du får et konkret tilbud samme dag.',
          'Begge modeller er uten oppstartskostnader og uten bindingstid. Med 10+2-modellen (langtidsleie kombinert med korttidsutleie i høysesong) øker mange utleiere årsinntekten med opptil 30 % — som i praksis mer enn dekker honoraret.',
        ],
      },
      {
        h2: 'Spørsmål du bør stille før du signerer',
        list: [
          'Hva er totalkostnaden første året — inkludert etablering, løpende honorar og tillegg?',
          'Er det bindingstid, og hva koster det å avslutte?',
          'Hvordan settes leieprisen — manuelt én gang, eller løpende etter markedet?',
          'Hva skjer ved bytte av leietaker — nytt etableringshonorar?',
          'Får jeg innsyn i økonomi og dokumenter underveis, eller bare årsrapport?',
        ],
      },
    ],
    faqs: [
      { q: 'Er utleiemegler-honoraret fradragsberettiget på skatten?', a: 'Ja — ved skattepliktig utleie er forvaltningshonorar en fradragsberettiget kostnad, på linje med vedlikehold, forsikring og kommunale avgifter. Leier du ut skattefritt (f.eks. mindre enn halvparten av egen bolig), får du ikke fradrag.' },
      { q: 'Kan jeg forhandle på prisen?', a: 'Ofte, ja — særlig med flere utleieenheter eller lang horisont. Be alltid om totalpris for første år, ikke bare prosentsatsen, slik at etableringshonorar og tillegg kommer med i sammenligningen.' },
      { q: 'Hva er forskjellen på utleiemegling og utleieforvaltning?', a: 'Utleiemegling (formidling) er å finne og kontraktsfeste leietaker — vanligvis mot én månedsleie. Utleieforvaltning er den løpende driften etterpå: husleie, oppfølging, vedlikehold og regnskap. Mange aktører, inkludert DigiHome, tilbyr begge deler samlet.' },
      { q: 'Lønner det seg å bruke utleiemegler?', a: 'Regnestykket avhenger av tiden din og risikoen. Feil leiepris koster fort mer enn honoraret: 500 kr for lavt per måned er 6 000 kr i året, og en måneds tomgang koster en hel månedsleie. Profesjonell prissetting, rask utleie og trygg screening er det du egentlig betaler for.' },
    ],
    related: ['leie-ut-leilighet-bergen', 'skatt-pa-utleie'],
    cta: { label: 'Se hva utleien din vil koste', href: '/priskalkulator' },
  },

  {
    slug: 'leie-ut-leilighet-bergen',
    metaTitle: 'Leie ut leilighet i Bergen — guide 2026',
    title: 'Leie ut leilighet i Bergen: Den komplette guiden',
    description: 'Alt du må vite for å leie ut i Bergen: riktig leiepris, annonsering, visning, screening, kontrakt og reglene du må kunne. Steg for steg.',
    category: 'Kom i gang',
    readMinutes: 9,
    updated: '2026-07-14',
    image: '/bergen-houses.webp',
    imageAlt: 'Bolighus i Bergen — klare for utleie',
    answer: 'For å leie ut leilighet i Bergen bør du: (1) sette riktig leiepris basert på bydel og standard, (2) lage en profesjonell annonse med gode bilder, (3) gjennomføre visninger og screene leietakere med kreditt- og referansesjekk, (4) signere skriftlig husleiekontrakt og opprette depositumskonto, og (5) følge husleielovens regler gjennom leieforholdet. Bergen har jevnt høy etterspørsel — spesielt sentralt og rundt studiestart i august.',
    sections: [
      {
        h2: 'Leiemarkedet i Bergen — kort fortalt',
        paragraphs: [
          'Bergen er Norges nest største leiemarked, drevet av over 30 000 studenter, et stort sykehus- og universitetsmiljø og en voksende teknologi- og energisektor. Etterspørselen er høyest fra juni til september, med en tydelig topp rundt studiestart i august.',
          'Leieprisene varierer betydelig mellom bydelene — fra sentrumsnære Nordnes og Møhlenpris til mer familieorienterte Fana og Åsane. Se våre løpende oppdaterte tall i leiemarkedsrapporten for Bergen, og bydel-for-bydel-oversikten under utleieområdene våre.',
        ],
      },
      {
        h2: 'Steg 1: Sett riktig leiepris',
        paragraphs: [
          'Feil pris er den dyreste feilen utleiere gjør. For høy pris gir tomgang (én måned tomt = 8 % av årsinntekten borte), for lav pris taper du tusenlapper hver måned i årevis.',
          'Sammenlign aktive annonser for tilsvarende boliger i samme bydel, juster for standard, størrelse og fasiliteter — eller bruk en datadrevet prisvurdering. DigiHome bruker AI som overvåker markedet kontinuerlig og justerer anbefalt pris etter faktisk etterspørsel.',
        ],
      },
      {
        h2: 'Steg 2: Klargjør boligen og lag annonsen',
        list: [
          'Utbedre småfeil og sørg for at boligen er nyvasket til fotografering',
          'Profesjonelle bilder løfter både klikk og oppnådd leiepris — det er verdt investeringen',
          'Beskriv det som betyr noe: soverom, bad, oppvarming, strøm inkludert/eksludert, parkering, husdyr og røyking',
          'Vær ærlig — misvisende annonser gir misfornøyde leietakere og konflikter',
        ],
      },
      {
        h2: 'Steg 3: Visning og valg av leietaker',
        paragraphs: [
          'Screening er den viktigste risikoreduksjonen du gjør. Gjennomfør alltid kredittsjekk (krever saklig behov — det har du som utleier) og ring minst én tidligere utleier som referanse. Møt leietakeren personlig på visning.',
          'Vær samtidig bevisst på diskrimineringsforbudet: du kan velge leietaker ut fra betalingsevne og referanser, men ikke ut fra etnisitet, religion, kjønn, seksuell orientering eller funksjonsnedsettelse.',
        ],
      },
      {
        h2: 'Steg 4: Kontrakt, depositum og innflytting',
        paragraphs: [
          'Bruk alltid skriftlig husleiekontrakt. Velg mellom tidsbestemt leieavtale (normalt minst tre år, ett år for del av egen bolig) og tidsubestemt med oppsigelsesadgang. Depositum kan maksimalt utgjøre seks måneders leie og skal stå på egen depositumskonto i leietakers navn — les detaljene i depositumsguiden vår.',
          'Gjennomfør overtakelsesprotokoll med bilder ved innflytting. Det er ditt viktigste bevis hvis det oppstår uenighet om skader ved utflytting.',
        ],
      },
      {
        h2: 'Steg 5: Drift gjennom leieforholdet',
        paragraphs: [
          'Som utleier har du ansvar for at boligen er i forsvarlig stand, og vedlikeholdsplikten fordeles mellom partene etter husleieloven (om ikke annet er avtalt). Husleie kan justeres årlig etter konsumprisindeksen, og hvert tredje år til «gjengs leie».',
          'Husk også skatten: reglene avhenger av om du leier ut i egen bolig eller en sekundærbolig — se skatteguiden vår for detaljene.',
        ],
      },
      {
        h2: 'Leie ut selv — eller få hjelp?',
        paragraphs: [
          'Alt over kan du gjøre selv. Regn med 20–40 timer på første utleie og løpende oppfølging etterpå. Alternativet er å la noen ta jobben: hos DigiHome velger du mellom selvforvaltning (5 % — du bruker verktøyene våre) og full forvaltning (vi tar alt, individuelt tilbud). Begge uten bindingstid, og med 10+2-modellen som kan øke årsinntekten med opptil 30 %.',
        ],
      },
    ],
    faqs: [
      { q: 'Når på året er det best å leie ut i Bergen?', a: 'Juni–september er høysesong, med topp rundt studiestart i august. Legger du ut annonsen i juni–juli treffer du den største etterspørselen. Sentrale ettromsleiligheter og kollektivvennlige boliger går raskest.' },
      { q: 'Hvor lang tid tar det å finne leietaker i Bergen?', a: 'Med riktig pris og god annonse: normalt fra noen dager til 2–3 uker, avhengig av sesong, bydel og boligtype. Prises boligen feil, kan det ta måneder.' },
      { q: 'Må jeg betale skatt når jeg leier ut leiligheten?', a: 'Leier du ut mindre enn halvparten av boligen du selv bor i (målt i utleieverdi), er inntekten normalt skattefri. Utleie av sekundærbolig beskattes som kapitalinntekt med 22 % av overskuddet. Se vår egen guide om skatt på utleie for detaljer.' },
      { q: 'Kan jeg leie ut møblert eller umøblert?', a: 'Begge deler fungerer i Bergen. Møblert passer studenter, unge i etableringsfasen og korttidsleie, og gir ofte noe høyere leie. Umøblert gir gjerne mer stabile, langsiktige leieforhold.' },
    ],
    related: ['depositum-regler', 'skatt-pa-utleie', 'hva-koster-utleiemegler'],
    cta: { label: 'Få gratis verdivurdering av leiepotensialet', href: '/bli-utleier' },
  },

  {
    slug: 'depositum-regler',
    metaTitle: 'Depositum ved utleie: reglene (2026)',
    title: 'Depositum ved utleie: Reglene du må kunne',
    description: 'Maks 6 måneders leie, egen depositumskonto i leietakers navn — og utleier betaler gebyret. Slik gjør du depositum riktig, steg for steg.',
    category: 'Jus',
    readMinutes: 5,
    updated: '2026-07-14',
    image: '/interior-hallway.webp',
    imageAlt: 'Nøkkeloverlevering ved innflytting i leiebolig',
    answer: 'Depositum ved boligutleie kan maksimalt utgjøre seks måneders husleie og skal settes på en egen depositumskonto i leietakers navn, i samme bank som husleien betales til. Utleier betaler kostnadene ved å opprette kontoen. Ingen av partene kan disponere pengene alene — utbetaling krever enighet, dom eller at banken følger husleielovens varslingsregler. Å be leietaker betale depositum til utleiers private konto er ulovlig.',
    sections: [
      {
        h2: 'Hva er depositum — og hvorfor finnes det?',
        paragraphs: [
          'Depositumet er leietakers penger som stilles som sikkerhet for skyldig husleie, skader utover normal slitasje og andre krav som følger av leieavtalen. Reglene står i husleieloven § 3-5 og er ufravikelige til leietakers gunst — du kan ikke avtale dårligere vilkår for leietaker.',
        ],
      },
      {
        h2: 'De fire hovedreglene',
        list: [
          'Maksbeløp: depositumet kan ikke overstige seks måneders husleie (de fleste avtaler tre måneder)',
          'Egen konto: pengene skal stå på særskilt depositumskonto i leietakers navn — aldri på utleiers private konto',
          'Samme bank: kontoen skal være i samme bank som leietaker betaler husleien til',
          'Utleier betaler: kostnadene ved å opprette depositumskontoen skal dekkes av utleier',
        ],
      },
      {
        h2: 'Hva skjer hvis depositumet er betalt feil?',
        paragraphs: [
          'Hvis leietaker har betalt depositum rett til utleiers konto, kan leietakeren når som helst kreve beløpet tilbakebetalt med forsinkelsesrenter — selv om leieforholdet fortsatt løper. Dette er en av de vanligste og dyreste feilene private utleiere gjør.',
        ],
      },
      {
        h2: 'Utbetaling ved leieforholdets slutt',
        paragraphs: [
          'Er partene enige, instruerer de banken sammen, og pengene utbetales. Ved uenighet gjelder husleielovens prosedyre: krever leietaker utbetaling, skal banken varsle utleier skriftlig. Utleier har da fem uker på å dokumentere at det er reist søksmål (i praksis sak for Husleietvistutvalget) — ellers utbetales beløpet til leietaker.',
          'Utleier kan kreve utbetalt skyldig husleie fra kontoen uten dom, hvis leieavtalen sier at leien går inn på konto i samme bank og leietaker ikke protesterer innen fristen.',
        ],
      },
      {
        h2: 'Alternativ: depositumsgaranti',
        paragraphs: [
          'I stedet for kontant depositum kan leietaker stille en depositumsgaranti fra et forsikringsselskap eller NAV. For utleier gir garanti fra solid utsteder tilsvarende sikkerhet, men les vilkårene: enkelte garantier krever at kravet dokumenteres raskere enn ved ordinært depositum.',
          'Hos DigiHome håndteres depositum og kontrakt digitalt med BankID-signering, slik at alt blir riktig fra første dag — det er en del av både selvforvaltning og full forvaltning.',
        ],
      },
    ],
    faqs: [
      { q: 'Kan utleier kreve både depositum og garanti?', a: 'Ja, men samlet sikkerhet kan ikke overstige seks måneders leie. Summen av depositum og garanti må altså holde seg innenfor maksgrensen.' },
      { q: 'Hvor raskt skal depositumet tilbakebetales etter utflytting?', a: 'Loven setter ingen eksakt frist ved enighet — da bør det skje umiddelbart. Ved uenighet gjelder bankens varslingsprosedyre med fem ukers søksmålsfrist for utleier. Trekk aldri ut tid uten saklig grunn.' },
      { q: 'Hva kan utleier trekke fra depositumet?', a: 'Skyldig husleie, utestående felleskostnader leietaker skulle dekket, og utbedring av skader utover normal slitasje — dokumentert mot overtakelsesprotokollen. Vanlig slitasje etter kontraktsmessig bruk kan ikke kreves dekket.' },
      { q: 'Hvem får rentene på depositumskontoen?', a: 'Rentene tilhører leietaker, og leietaker har rett til å få dem utbetalt underveis i leieforholdet.' },
    ],
    related: ['leie-ut-leilighet-bergen', 'korttidsutleie-regler'],
    cta: { label: 'La oss håndtere kontrakt og depositum for deg', href: '/bli-utleier' },
    disclaimer: true,
  },

  {
    slug: 'skatt-pa-utleie',
    metaTitle: 'Skatt på utleie av bolig — slik funker det',
    title: 'Skatt på utleie av bolig: Slik fungerer reglene',
    description: 'Skattefritt i egen bolig, 22 % på sekundærbolig og sjablongregel for korttidsutleie. Se hva som gjelder deg — og fradragene mange glemmer.',
    category: 'Skatt',
    readMinutes: 7,
    updated: '2026-07-14',
    image: '/interior-living.webp',
    imageAlt: 'Stue i utleiebolig — oversikt over skattereglene',
    answer: 'Skatt på utleie avhenger av boligtypen: (1) Leier du ut mindre enn halvparten av boligen du selv bor i, målt i utleieverdi, er inntekten skattefri. (2) Leier du ut hele eller mer enn halvparten av egen bolig, er inntekten skattefri opptil 20 000 kr per år — overskrides grensen, skattlegges alt fra første krone. (3) Utleie av sekundærbolig beskattes som kapitalinntekt: 22 % av overskuddet etter fradrag. (4) Korttidsutleie av egen bolig (leieforhold under 30 dager) følger en sjablongregel: 10 000 kr skattefritt, deretter skattlegges 85 % av det overskytende.',
    sections: [
      {
        h2: 'Skattefri utleie i egen bolig',
        paragraphs: [
          'Hovedregelen mange nyter godt av: leier du ut mindre enn halvparten av din egen bolig — målt i utleieverdi, ikke kvadratmeter — er leieinntekten helt skattefri. En typisk utleiedel eller sokkelleilighet i eneboligen faller ofte inn her.',
          'Leier du ut mer enn halvparten eller hele boligen din (f.eks. mens du er bortreist), er inntekten skattefri bare hvis den ikke overstiger 20 000 kr i inntektsåret. Går du over grensen, blir hele beløpet skattepliktig — fra første krone.',
        ],
      },
      {
        h2: 'Sekundærbolig: 22 % av overskuddet',
        paragraphs: [
          'Utleie av bolig du ikke selv bor i (sekundærbolig/utleiebolig) er alltid skattepliktig kapitalinntekt. Skattesatsen er 22 %, men den beregnes av overskuddet — altså leieinntektene minus fradragsberettigede kostnader.',
        ],
        list: [
          'Vedlikehold (ikke påkostning/standardheving)',
          'Kommunale avgifter, eiendomsskatt og festeavgift',
          'Forsikring av boligen',
          'Forvaltningshonorar og utleiemegler-kostnader',
          'Møbler: kostnader inntil 15 000 kr kan som regel fradragsføres direkte; dyrere innbo avskrives',
          'Reisekostnader ved tilsyn (innenfor rimelige rammer)',
        ],
      },
      {
        h2: 'Korttidsutleie av egen bolig (Airbnb-regelen)',
        paragraphs: [
          'For leieforhold i egen bolig som varer under 30 dager gjelder en egen sjablongmetode: de første 10 000 kr per år er skattefrie, og av det overskytende regnes 85 % som skattepliktig kapitalinntekt (22 %).',
          'Eksempel: tjener du 60 000 kr på Airbnb-utleie av egen bolig i løpet av året, er de første 10 000 kr skattefrie. Av de resterende 50 000 kr skattlegges 85 % — altså 42 500 kr — som gir 9 350 kr i skatt.',
          'Korttidsutleie av sekundærbolig følger derimot de vanlige reglene for skattepliktig utleie, uten sjablongfradraget. Ved omfattende korttidsutleie kan aktiviteten dessuten bli regnet som næringsvirksomhet.',
        ],
      },
      {
        h2: 'Når blir utleie næringsvirksomhet?',
        paragraphs: [
          'Tommelfingerregelen fra skattemyndighetene: utleie av fem eller flere boenheter regnes normalt som næringsvirksomhet — da beskattes overskuddet vesentlig hardere (som næringsinntekt), men gir også andre fradragsmuligheter. Ved kortidsutleie med høyt aktivitetsnivå (hyppige utskiftninger, tilleggstjenester) kan grensen nås tidligere.',
        ],
      },
      {
        h2: 'Rapportering i skattemeldingen',
        paragraphs: [
          'Skattepliktig utleie rapporteres i skattemeldingen med inntekter og kostnader per bolig. Ta vare på kvitteringer for alt vedlikehold og alle kostnader — dokumentasjonen er gull verdt både for fradrag og ved eventuell kontroll.',
          'Hos DigiHome får du komplette årsoppgaver over leieinntekter og kostnader, klare til skattemeldingen — en del av både selvforvaltning og full forvaltning.',
        ],
      },
    ],
    faqs: [
      { q: 'Er leieinntekt fra sokkelleilighet i egen enebolig skattefri?', a: 'Ja, som hovedregel — hvis utleiedelen har lavere utleieverdi enn den delen du selv bor i. Det er utleieverdien, ikke arealet, som avgjør. Dette er en av de mest brukte skattefordelene i Norge.' },
      { q: 'Kan jeg trekke fra oppussing før utleie?', a: 'Vedlikehold (tilbakeføring til tidligere stand) er fradragsberettiget ved skattepliktig utleie — påkostning (standardheving) er det ikke, men legges til inngangsverdien. Merk: går boligen fra skattefri til skattepliktig utleie, gjelder egne begrensninger første året.' },
      { q: 'Hva med utleie av fritidsbolig?', a: 'Egen fritidsbolig du selv bruker: 10 000 kr skattefritt per år, deretter skattlegges 85 % av det overskytende — samme sjablong som korttidsutleie av egen bolig. Ren utleiehytte beskattes fullt ut som kapitalinntekt.' },
      { q: 'Rapporterer Airbnb inntektene mine til Skatteetaten?', a: 'Ja. Digitale utleieplattformer har rapporteringsplikt til norske skattemyndigheter, så inntektene dine blir kjent for Skatteetaten uavhengig av hva du selv oppgir. Sørg for at skattemeldingen stemmer.' },
    ],
    related: ['korttidsutleie-regler', 'hva-koster-utleiemegler'],
    cta: { label: 'Få orden på utleieøkonomien', href: '/bli-utleier' },
    disclaimer: true,
  },

  {
    slug: 'korttidsutleie-regler',
    metaTitle: 'Airbnb og korttidsutleie: reglene 2026',
    title: 'Airbnb og korttidsutleie: Lover og regler du må kunne',
    description: '90-døgnsregelen for sekundærbolig, 30-døgnsregelen i borettslag og skatten på korttidsutleie — alt om lovlig Airbnb-utleie, enkelt forklart.',
    category: 'Jus',
    readMinutes: 6,
    updated: '2026-07-14',
    image: '/bryggen-alley.webp',
    imageAlt: 'Bryggen i Bergen — populært område for korttidsutleie',
    answer: 'Korttidsutleie av din egen primærbolig er som hovedregel lovlig uten døgnbegrensning. For sekundærbolig i eierseksjonssameier gjelder en grense på 90 døgn korttidsutleie per år (sameiet kan vedtektsfeste mellom 60 og 120 døgn). I borettslag kan du normalt korttidsutleie egen bolig i opptil 30 døgn per år uten styrets samtykke. Skattemessig er de første 10 000 kr fra korttidsutleie av egen bolig skattefrie; deretter skattlegges 85 % av det overskytende.',
    sections: [
      {
        h2: 'Egen bolig eller sekundærbolig? Det avgjør nesten alt',
        paragraphs: [
          'Reglene skiller mellom boligen du selv bor i (primærbolig) og boliger du eier i tillegg (sekundærbolig). Å leie ut ditt eget hjem mens du er på ferie er langt friere regulert enn å drive løpende Airbnb-utleie av en leilighet du ikke bor i.',
        ],
      },
      {
        h2: 'Eierseksjonssameier: 90-døgnsregelen',
        paragraphs: [
          'Etter eierseksjonsloven § 24 er korttidsutleie av en seksjon du ikke selv bor i begrenset til 90 døgn per år. Med korttidsutleie menes utleie i under 30 døgn sammenhengende. Sameiet kan i vedtektene justere grensen — men bare innenfor intervallet 60 til 120 døgn.',
          'Bor du selv i seksjonen, rammes du ikke av 90-døgnsgrensen for utleie av egen bolig — men sjekk alltid sameiets vedtekter og husordensregler for øvrige begrensninger.',
        ],
      },
      {
        h2: 'Borettslag: strengere rammer',
        paragraphs: [
          'I borettslag gjelder brukereglene i borettslagsloven: du kan overlate bruken av hele boligen til andre i opptil 30 døgn per år uten styrets samtykke. Utover dette krever utleie godkjenning, og ren investor-utleie er som hovedregel ikke tillatt — borettslagsmodellen bygger på at andelseier selv bor i boligen.',
        ],
      },
      {
        h2: 'Andre regler å ha kontroll på',
        list: [
          'Skatt: 10 000 kr skattefritt per år ved korttidsutleie av egen bolig, deretter skattlegges 85 % av det overskytende — se skatteguiden vår',
          'Plattformene rapporterer inntektene dine til Skatteetaten automatisk',
          'Forsikring: vanlig innboforsikring dekker ofte ikke korttidsutleie — sjekk vilkårene eller tegn tillegg',
          'Naboer og husordensregler: støy og hyppige utskiftninger er den vanligste konfliktkilden — informer gjerne naboene',
          'Brannsikkerhet: røykvarslere, slukkeutstyr og rømningsveier er utleiers ansvar',
        ],
      },
      {
        h2: 'Slik maksimerer du lovlig: 10+2-modellen',
        paragraphs: [
          'For de fleste boligeiere er ren helårs-Airbnb verken lovlig (sekundærbolig i sameie) eller lønnsom (tomme netter i lavsesong, mer slitasje, høyere drift). DigiHomes 10+2-modell løser begge deler: 10 måneder forutsigbar langtidsleie, kombinert med korttidsutleie i de 2 mest lønnsomme høysesongmånedene i Bergen.',
          'Resultatet er opptil 30 % høyere årsinntekt enn ren langtidsleie — godt innenfor 90-døgnsgrensen, og med profesjonell drift av gjester, renhold og prising. Les mer på siden vår om Airbnb-forvaltning i Bergen.',
        ],
      },
    ],
    faqs: [
      { q: 'Kan jeg leie ut leiligheten min på Airbnb hele året?', a: 'Bare hvis du selv bor der (primærbolig) og verken sameievedtekter eller borettslagsregler setter grenser. En sekundærbolig i et eierseksjonssameie er begrenset til 90 døgn korttidsutleie per år, og i borettslag er rammene enda strengere.' },
      { q: 'Gjelder 90-døgnsregelen når jeg leier ut et rom i boligen jeg bor i?', a: 'Nei. Utleie av deler av egen bolig mens du selv bor der, rammes ikke av 90-døgnsgrensen. Grensen gjelder seksjoner som ikke brukes som egen bolig.' },
      { q: 'Trenger jeg å søke kommunen for å drive korttidsutleie?', a: 'Normal korttidsutleie av egen bolig krever ikke bruksendring. Drives det i et omfang som ligner hotell- eller næringsvirksomhet, kan det stille seg annerledes — da bør du avklare med kommunen.' },
      { q: 'Hva skjer hvis jeg bryter 90-døgnsgrensen?', a: 'Sameiet kan kreve at den ulovlige bruken opphører, og ved vesentlig mislighold kan styret i ytterste konsekvens kreve seksjonen solgt. Ta grensene på alvor — og loggfør utleiedøgnene.' },
    ],
    related: ['skatt-pa-utleie', 'depositum-regler'],
    cta: { label: 'Se hvordan 10+2 fungerer i praksis', href: '/airbnb-forvaltning-bergen' },
    disclaimer: true,
  },
];

export const getGuide = (slug) => guides.find((g) => g.slug === slug) || null;
export const relatedGuides = (guide) => (guide.related || []).map(getGuide).filter(Boolean);
