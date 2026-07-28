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
    metaTitle: 'Utleiemegler pris 2026: 8–12 %, gebyrer og alternativer',
    title: 'Hva koster en utleiemegler? Priser og honorarer forklart',
    description: 'Utleiemegler koster ofte etableringshonorar pluss 8–12 % av leien. Se gebyrer, førsteårskostnad, selvforvaltning og full forvaltning.',
    category: 'Pris',
    readMinutes: 6,
    updated: '2026-07-28',
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
    author: { name: 'Sarah Sleeman', role: 'Daglig leder og eiendomsmegler', url: '/om-oss' },
    reviewer: { type: 'Organization', name: 'DigiHome fagredaksjon', role: 'Markeds- og priskildesjekk', url: '/metode' },
    sources: [
      { label: 'SSB: Leiemarkedsundersøkelsen', url: 'https://www.ssb.no/bygg-bolig-og-eiendom/bolig-og-boforhold/statistikk/leiemarkedsundersokelsen' },
      { label: 'Meglersmart: pris på utleiemegler', url: 'https://www.meglersmart.no/pris/utleiemegler' },
      { label: 'Utleiemegler24: pris og utleiehjelp i Bergen', url: 'https://utleiemegler24.no/omrader/vestland/bergen' },
      { label: 'DigiHome: metode og forbehold for nøkkeltall', url: '/metode' },
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
    updated: '2026-07-28',
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
    metaTitle: 'Depositumskonto 2026: 6 regler utleier må følge',
    title: 'Depositum ved utleie: Reglene du må kunne',
    description: 'Maks 6 måneders leie, konto i leietakers navn og privat konto er ulovlig. Se frister, utbetaling og hva du gjør hvis depositumet ikke blir betalt.',
    category: 'Jus',
    readMinutes: 5,
    updated: '2026-07-28',
    image: '/interior-hallway.webp',
    imageAlt: 'Nøkkeloverlevering ved innflytting i leiebolig',
    answer: 'Depositum ved boligutleie kan maksimalt utgjøre seks måneders husleie og skal stå på en særskilt depositumskonto i leietakers navn. Utleier betaler kostnaden ved å opprette kontoen. Pengene kan ikke disponeres ensidig. Skal banken bruke den forenklede prosedyren for å dekke skyldig husleie, må vilkårene i husleieloven være oppfylt — blant annet er kontoforholdet mellom husleie og depositum relevant. Depositum skal aldri betales til utleiers private konto.',
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
          'Bankforhold og utbetaling: valg av bank og husleiekonto kan påvirke bankens forenklede prosedyre ved skyldig husleie; kontroller de konkrete vilkårene med banken og husleieloven',
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
          'Utleier kan i enkelte tilfeller kreve utbetalt skyldig husleie fra kontoen uten dom. Dette forutsetter blant annet at leieavtalen og bankforholdet oppfyller lovens vilkår, og at leietaker ikke protesterer innen fristen.',
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
    author: { name: 'Sarah Sleeman', role: 'Daglig leder og eiendomsmegler', url: '/om-oss' },
    reviewer: { type: 'Organization', name: 'DigiHome fagredaksjon', role: 'Juridisk kildesjekk', url: '/metode' },
    sources: [
      { label: 'Lovdata: husleieloven § 3-5', url: 'https://lovdata.no/lov/1999-03-26-17/§3-5' },
      { label: 'Regjeringen: tolkningsuttalelse om depositum', url: 'https://www.regjeringen.no/no/dokumenter/-3-5-departementet-svarer-pa-sporsmal-om-private-leieboliger-som-er-klausulert-til-studentboliger-kan-opprette-felles-depositumskonto/id2850248/' },
      { label: 'Husleietvistutvalget: depositum og garanti', url: 'https://www.htu.no/artikler/depositum-og-garanti' },
    ],
    faqs: [
      { q: 'Hva gjør jeg hvis leietaker ikke har betalt depositum?', a: 'Ikke overlever boligen uten at avtalt sikkerhet er på plass, med mindre dere skriftlig avtaler noe annet. Send et tydelig skriftlig varsel og bruk aldri din private konto som midlertidig depositumskonto. Ved konflikt bør du få juridisk veiledning før du hever eller avslutter avtalen.' },
      { q: 'Hva hvis depositumet er betalt til utleiers private konto?', a: 'Leietaker kan kreve beløpet tilbake med forsinkelsesrenter. Opprett korrekt depositumskonto og avklar tilbakeføring eller overføring med banken og leietakeren så raskt som mulig.' },
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
    metaTitle: 'Skatt på utleie 2026: skattefritt, 22 % og fradrag',
    title: 'Skatt på utleie av bolig: Slik fungerer reglene',
    description: 'Skattefritt i egen bolig, 22 % på sekundærbolig og sjablongregel for korttidsutleie. Se hva som gjelder deg — og fradragene mange glemmer.',
    category: 'Skatt',
    readMinutes: 7,
    updated: '2026-07-28',
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
          'Skattemyndighetene gjør en helhetsvurdering av om utleie er næringsvirksomhet. Utleie av fem eller flere boenheter brukes ofte som en praktisk tommelfingerregel, men er ikke en automatisk lovgrense. Omfang, aktivitet, varighet og risiko teller også, og omfattende korttidsutleie kan bli vurdert som næring med færre enheter.',
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
    author: { name: 'Sarah Sleeman', role: 'Daglig leder og eiendomsmegler', url: '/om-oss' },
    reviewer: { name: 'DigiHome fagredaksjon', role: 'Skattefaglig kildesjekk', url: '/metode' },
    sources: [
      { label: 'Skatteetaten: skatt ved utleie av bolig og fritidseiendom', url: 'https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/bolig-eiendom-tomt/utleie/' },
      { label: 'Skatteetaten: korttidsutleie av bolig og fritidseiendom', url: 'https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/bolig-eiendom-tomt/utleie/korttidsutleie-av-bolig-og-fritidseiendom/' },
      { label: 'DigiHome: metode og forbehold', url: '/metode' },
    ],
    faqs: [
      { q: 'Er leieinntekt fra sokkelleilighet i egen enebolig skattefri?', a: 'Ja, som hovedregel — hvis utleiedelen har lavere utleieverdi enn den delen du selv bor i. Det er utleieverdien, ikke arealet, som avgjør. Kontroller alltid den konkrete situasjonen mot Skatteetatens gjeldende veiledning.' },
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
    metaTitle: 'Airbnb-regler 2026: 90/30 dager, skatt og sameie',
    title: 'Airbnb og korttidsutleie: Lover og regler du må kunne',
    description: 'Hvor lenge kan du leie ut på Airbnb? Se 90-døgnsregelen i sameie, 30-døgnsregelen i borettslag, skatt, forsikring og praktiske krav.',
    category: 'Jus',
    readMinutes: 6,
    updated: '2026-07-28',
    image: '/bryggen-alley.webp',
    imageAlt: 'Bryggen i Bergen — populært område for korttidsutleie',
    answer: 'Korttidsutleie reguleres ulikt etter eierform og hva som leies ut. I eierseksjonssameier er hovedregelen at korttidsutleie av hele boligseksjonen ikke kan overstige 90 døgn per år; vedtektene kan sette grensen mellom 60 og 120 døgn. I borettslag kan hele boligen normalt overlates til andre i opptil 30 døgn per år uten styrets samtykke når lovens vilkår er oppfylt. Utleie av bare et rom mens du selv bor i boligen vurderes annerledes. Skatt, vedtekter, forsikring og eventuell bruksendring må også kontrolleres.',
    sections: [
      {
        h2: 'Egen bolig eller sekundærbolig? Det avgjør nesten alt',
        paragraphs: [
          'Eierform, vedtekter og om du leier ut hele boligen eller bare en del av den er avgjørende. Reglene for sameier og borettslag gjelder bruksoverlating av hele boligen, mens romutleie mens du selv bor der vurderes annerledes.',
        ],
      },
      {
        h2: 'Eierseksjonssameier: 90-døgnsregelen',
        paragraphs: [
          'Etter eierseksjonsloven § 24 er korttidsutleie av hele boligseksjonen som hovedregel begrenset til 90 døgn per år. Med korttidsutleie menes utleie i opptil 30 døgn sammenhengende. Sameiet kan vedtektsfeste en grense mellom 60 og 120 døgn.',
          'Regelen må vurderes konkret mot hva som leies ut og sameiets gjeldende vedtekter. Utleie av bare deler av boligen mens du selv bor der er ikke det samme som korttidsutleie av hele seksjonen.',
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
          '10+2 kan være aktuelt for enkelte eierseksjoner dersom total korttidsutleie holder seg innenfor vedtektene og lovens døgnsgrense. I borettslag er 30-døgnsrammen vesentlig strengere, slik at to fulle måneder normalt krever særskilt avklaring eller en annen modell.',
          'En inntektsøkning på opptil 30 % er et potensialestimat, ikke en garanti. Resultatet avhenger av bolig, område, sesong, pris, kostnader og hvilke utleiemodeller som er lovlige. Se metode- og forbeholdssiden vår før du bruker estimatet som beslutningsgrunnlag.',
        ],
      },
    ],
    author: { name: 'Sarah Sleeman', role: 'Daglig leder og eiendomsmegler', url: '/om-oss' },
    reviewer: { type: 'Organization', name: 'DigiHome fagredaksjon', role: 'Juridisk kildesjekk', url: '/metode' },
    sources: [
      { label: 'Lovdata: eierseksjonsloven § 24', url: 'https://lovdata.no/lov/2017-06-16-65/§24' },
      { label: 'Regjeringen: spørsmål og svar om korttidsutleie i eierseksjoner', url: 'https://www.regjeringen.no/no/dokumenter/-24-25-og-46-departementet-svarer-pa-sporsmal-om-fremutleie-av-eierseksjoner/id2850243/' },
      { label: 'Regjeringen: burettslagslova § 5-4 og korttidsutleie', url: 'https://www.regjeringen.no/no/dokumenter/burettslagslova-5-4-krav-til-botid-og-styregodkjennelse-ved-kortidsutleie/id3077780/' },
      { label: 'Skatteetaten: korttidsutleie av bolig og fritidseiendom', url: 'https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/bolig-eiendom-tomt/utleie/korttidsutleie-av-bolig-og-fritidseiendom/' },
      { label: 'DigiHome: metode og forbehold', url: '/metode' },
    ],
    faqs: [
      { q: 'Kan jeg leie ut leiligheten min på Airbnb hele året?', a: 'Ikke uten videre. I et eierseksjonssameie gjelder normalt en årlig grense for korttidsutleie av hele seksjonen, og i borettslag er rammen normalt 30 døgn uten styrets samtykke når lovens vilkår er oppfylt. Vedtekter, eierform og om du leier ut hele boligen eller bare et rom må kontrolleres.' },
      { q: 'Gjelder 90-døgnsregelen når jeg leier ut et rom i boligen jeg bor i?', a: 'Utleie av bare et rom mens du selv bor i boligen er ikke det samme som korttidsutleie av hele boligseksjonen. Vurder likevel vedtekter, husordensregler, skatt, forsikring og brannsikkerhet.' },
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
