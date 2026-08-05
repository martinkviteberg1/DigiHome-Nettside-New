// ---------------------------------------------------------------------------
// UTLEIE- OG REGELVERKSKLYNGEN
//
// Datagrunnlag (Search Console, 2026-05-04 → 2026-08-02):
//   /guider/korttidsutleie-regler: 1 440 visn, 18 klikk, CTR 1,3 %, pos 7,4
//     «airbnb regler» 24 · «korttidsutleie» 14 · «korttidsutleie bergen» 15
//     «korttidsutleie av egen bolig» 12 · «skatt airbnb sekundærbolig» 18
//   /guider/leie-ut-leilighet-bergen: 117 visn, 2 klikk, CTR 1,7 %, pos 7,8
//   «gråsone utleie bolig» 20 visn · pos 27,2 · 0 klikk
//   «hva koster det å få godkjent utleiedel» 2 visn · pos 38,5
//     → ingen dedikert side fantes. Ny guide: godkjent-utleiedel.
//   husleieokning er en dokumentert innholdsluke (ingen side dekket temaet).
//     Etterspørselen er en hypotese til Search Console har data.
// ---------------------------------------------------------------------------

const AUTHOR = { name: 'Sarah Sleeman', role: 'Daglig leder og eiendomsmegler', url: '/om-oss' };
const REVIEWER_JUS = { type: 'Organization', name: 'DigiHome fagredaksjon', role: 'Juridisk kildesjekk', url: '/metode' };
const REVIEWER_UTLEIE = { type: 'Organization', name: 'DigiHome fagredaksjon', role: 'Utleie- og kildesjekk', url: '/metode' };

const LOV_HLF = { label: 'Lovdata: husleieloven', url: 'https://lovdata.no/lov/1999-03-26-17' };
const LOV_42 = { label: 'Lovdata: husleieloven § 4-2 (indeksregulering)', url: 'https://lovdata.no/lov/1999-03-26-17/§4-2' };
const LOV_43 = { label: 'Lovdata: husleieloven § 4-3 (gjengs leie)', url: 'https://lovdata.no/lov/1999-03-26-17/§4-3' };
const LOV_ESL24 = { label: 'Lovdata: eierseksjonsloven § 24', url: 'https://lovdata.no/lov/2017-06-16-65/§24' };
const LOV_PBL = { label: 'Lovdata: plan- og bygningsloven § 20-1', url: 'https://lovdata.no/lov/2008-06-27-71/§20-1' };
const SSB_LMU = { label: 'SSB: Leiemarkedsundersøkelsen', url: 'https://www.ssb.no/bygg-bolig-og-eiendom/bolig-og-boforhold/statistikk/leiemarkedsundersokelsen' };
const SSB_KPI = { label: 'SSB: Konsumprisindeksen (KPI)', url: 'https://www.ssb.no/priser-og-prisindekser/konsumpriser/statistikk/konsumprisindeksen' };
const HTU = { label: 'Husleietvistutvalget', url: 'https://www.htu.no/' };
const SKATT_KORTTID = { label: 'Skatteetaten: korttidsutleie av bolig og fritidseiendom', url: 'https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/bolig-eiendom-tomt/utleie/korttidsutleie-av-bolig-og-fritidseiendom/' };
const REG_ESL = { label: 'Regjeringen: spørsmål og svar om korttidsutleie i eierseksjoner', url: 'https://www.regjeringen.no/no/dokumenter/-24-25-og-46-departementet-svarer-pa-sporsmal-om-fremutleie-av-eierseksjoner/id2850243/' };
const REG_BRL = { label: 'Regjeringen: burettslagslova § 5-4 og korttidsutleie', url: 'https://www.regjeringen.no/no/dokumenter/burettslagslova-5-4-krav-til-botid-og-styregodkjennelse-ved-kortidsutleie/id3077780/' };
const DIBK_UTLEIE = { label: 'Direktoratet for byggkvalitet: bruksendring og utleiedel', url: 'https://dibk.no/bygge-selv/skal-du-endre-bruken-av-rom/' };
const DIBK_TEK = { label: 'Direktoratet for byggkvalitet: byggteknisk forskrift (TEK17)', url: 'https://dibk.no/regelverk/byggteknisk-forskrift-tek17/' };
const BERGEN_BYGG = { label: 'Bergen kommune: byggesak og bruksendring', url: 'https://www.bergen.kommune.no/innbyggerhjelpen/bolig-og-eiendom/byggesak' };
const METODE = { label: 'DigiHome: metode og forbehold', url: '/metode' };

const ENT_HUSLEIELOVEN = { name: 'Husleieloven', sameAs: 'https://lovdata.no/lov/1999-03-26-17' };
const ENT_BERGEN = { name: 'Bergen', sameAs: 'https://www.wikidata.org/wiki/Q26793' };
const ENT_AIRBNB = { name: 'Airbnb', sameAs: 'https://www.wikidata.org/wiki/Q5687232' };
const ENT_ESL = { name: 'Eierseksjonsloven', sameAs: 'https://lovdata.no/lov/2017-06-16-65' };
const ENT_TEK17 = { name: 'Byggteknisk forskrift (TEK17)', sameAs: 'https://dibk.no/regelverk/byggteknisk-forskrift-tek17/' };
const ENT_KPI = { name: 'Konsumprisindeksen', sameAs: 'https://www.ssb.no/priser-og-prisindekser/konsumpriser/statistikk/konsumprisindeksen' };

export const utleieGuides = [
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'leie-ut-leilighet-bergen',
    metaTitle: 'Leie ut leilighet i Bergen 2026: guide i 5 steg',
    title: 'Leie ut leilighet i Bergen: den komplette guiden',
    description: 'Fra riktig leiepris til kontrakt, depositum og skatt — hele prosessen for å leie ut i Bergen i fem steg. Inkludert sesong, bydeler og screening av leietaker.',
    category: 'Kom i gang',
    readMinutes: 10,
    published: '2026-03-18',
    updated: '2026-08-05',
    image: '/bergen-houses.webp',
    imageAlt: 'Bolighus i Bergen — klare for utleie',
    keywords: ['leie ut leilighet bergen', 'leie ut bolig bergen', 'leie ut bolig i bergen', 'utleie bergen', 'hvordan leie ut bolig'],
    entities: [ENT_BERGEN, ENT_HUSLEIELOVEN],
    answer: 'For å leie ut leilighet i Bergen bør du: (1) sette riktig leiepris basert på bydel og standard, (2) lage en profesjonell annonse med gode bilder, (3) gjennomføre visninger og screene leietakere med kreditt- og referansesjekk, (4) signere skriftlig husleiekontrakt og opprette depositumskonto i leietakers navn, og (5) følge husleielovens regler gjennom leieforholdet. Bergen har jevnt høy etterspørsel — spesielt sentralt og rundt studiestart i august.',
    keyFacts: [
      '**Høysesong:** juni–september, med topp rundt studiestart i august.',
      '**Normal utleietid** med riktig pris og god annonse: fra noen dager til 2–3 uker.',
      '**Tomgang koster:** én tom måned tilsvarer ca. **8 %** av årsinntekten.',
      '**Depositum:** maks seks måneders leie, på [egen konto i leietakers navn](/guider/depositumskonto).',
      '**Egen tidsbruk** ved første utleie: regn 20–40 timer.',
    ],
    howTo: {
      name: 'Slik leier du ut leilighet i Bergen',
      totalTime: 'P21D',
      steps: [
        { name: 'Sett riktig leiepris', text: 'Sammenlign aktive annonser for tilsvarende boliger i samme bydel, juster for standard, størrelse og fasiliteter — eller bruk en datadrevet prisvurdering. Feil pris er den dyreste feilen utleiere gjør.' },
        { name: 'Klargjør boligen og lag annonsen', text: 'Utbedre småfeil, vask grundig og få tatt profesjonelle bilder. Beskriv soverom, bad, oppvarming, strøm, parkering, husdyr og røyking presist og ærlig.' },
        { name: 'Gjennomfør visning og screen leietaker', text: 'Møt leietakeren personlig, gjennomfør kredittsjekk og ring minst én tidligere utleier som referanse. Velg ut fra betalingsevne og referanser — aldri ut fra forhold som rammes av diskrimineringsforbudet.' },
        { name: 'Signer kontrakt og opprett depositumskonto', text: 'Bruk skriftlig husleiekontrakt. Opprett depositumskonto i leietakers navn før nøkkeloverlevering, og gjennomfør overtakelsesprotokoll med daterte bilder av alle rom.' },
        { name: 'Drift leieforholdet', text: 'Følg opp husleie, vedlikehold og kommunikasjon. Leien kan indeksjusteres årlig etter KPI, og tilpasses gjengs leie tidligst etter to og et halvt år. Rapporter skattepliktig utleie i skattemeldingen.' },
      ],
    },
    sections: [
      {
        h2: 'Leiemarkedet i Bergen — kort fortalt',
        paragraphs: [
          'Bergen er Norges nest største leiemarked, drevet av over 30 000 studenter, et stort sykehus- og universitetsmiljø og en voksende teknologi- og energisektor. Etterspørselen er høyest fra juni til september, med en tydelig topp rundt studiestart i august.',
          'Leieprisene varierer betydelig mellom bydelene — fra sentrumsnære Nordnes og Møhlenpris til mer familieorienterte Fana og Åsane. Se løpende oppdaterte tall i [leiemarkedsrapporten for Bergen](/leiemarkedet/bergen), og bydel-for-bydel-oversikten under [utleie i Bergen](/utleie/bergen).',
        ],
      },
      {
        h2: 'Steg 1: Sett riktig leiepris',
        paragraphs: [
          'Feil pris er den dyreste feilen utleiere gjør. For høy pris gir tomgang — én måned tomt er omtrent 8 % av årsinntekten borte. For lav pris taper du tusenlapper hver måned i årevis, og du kan ikke rette det opp fritt underveis: leieøkning i et løpende leieforhold er [regulert av husleieloven](/guider/husleieokning).',
          'Sammenlign aktive annonser for tilsvarende boliger i samme bydel, juster for standard, størrelse og fasiliteter — eller bruk en datadrevet prisvurdering. DigiHome bruker AI som overvåker markedet kontinuerlig og justerer anbefalt pris etter faktisk etterspørsel.',
        ],
      },
      {
        h2: 'Steg 2: Klargjør boligen og lag annonsen',
        list: [
          'Utbedre småfeil og sørg for at boligen er nyvasket til fotografering',
          'Profesjonelle bilder løfter både klikk og oppnådd leiepris — det er verdt investeringen',
          'Beskriv det som betyr noe: soverom, bad, oppvarming, strøm inkludert eller ikke, parkering, husdyr og røyking',
          'Vær ærlig — misvisende annonser gir misfornøyde leietakere og konflikter',
          'Er utleiedelen i kjeller eller loft, sjekk at den er [godkjent for varig opphold](/guider/godkjent-utleiedel) før du annonserer',
        ],
      },
      {
        h2: 'Steg 3: Visning og valg av leietaker',
        paragraphs: [
          'Screening er den viktigste risikoreduksjonen du gjør. Gjennomfør alltid kredittsjekk, som krever saklig behov — det har du som utleier — og ring minst én tidligere utleier som referanse. Møt leietakeren personlig på visning.',
          'Vær samtidig bevisst på diskrimineringsforbudet: du kan velge leietaker ut fra betalingsevne og referanser, men ikke ut fra etnisitet, religion, kjønn, seksuell orientering eller funksjonsnedsettelse.',
        ],
      },
      {
        h2: 'Steg 4: Kontrakt, depositum og innflytting',
        paragraphs: [
          'Bruk alltid skriftlig husleiekontrakt. Velg mellom tidsbestemt leieavtale, normalt minst tre år og ett år for del av egen bolig, og tidsubestemt med oppsigelsesadgang. Depositum kan maksimalt utgjøre seks måneders leie og skal stå på [egen depositumskonto i leietakers navn](/guider/depositumskonto).',
          'Gjennomfør overtakelsesprotokoll med bilder ved innflytting. Det er ditt viktigste bevis hvis det oppstår [uenighet om depositumet ved utflytting](/guider/depositum-tilbakebetaling).',
          'Overlever aldri nøkler før depositumet er bekreftet på konto. Skulle det glippe, se [hva du gjør når leietaker ikke har betalt depositum](/guider/leietaker-har-ikke-betalt-depositum).',
        ],
      },
      {
        h2: 'Steg 5: Drift gjennom leieforholdet',
        paragraphs: [
          'Som utleier har du ansvar for at boligen er i forsvarlig stand, og vedlikeholdsplikten fordeles mellom partene etter husleieloven om ikke annet er avtalt. Husleie kan justeres årlig etter konsumprisindeksen, og tilpasses gjengs leie tidligst etter to og et halvt år — se [reglene for husleieøkning](/guider/husleieokning).',
          'Husk også skatten: reglene avhenger av om du leier ut i egen bolig eller en sekundærbolig — se [guiden om skatt på utleie](/guider/skatt-pa-utleie) og [hva du kan trekke fra](/guider/fradrag-utleiebolig).',
        ],
      },
      {
        h2: 'Leie ut selv — eller få hjelp?',
        paragraphs: [
          'Alt over kan du gjøre selv. Regn med 20–40 timer på første utleie og løpende oppfølging etterpå. Alternativet er å la noen ta jobben: hos DigiHome velger du mellom selvforvaltning til 5 % og full forvaltning etter individuelt tilbud. Begge uten bindingstid — se [sammenligningen av modellene](/guider/utleiemegler-vs-selvforvaltning) og [hva utleiemegler normalt koster](/guider/hva-koster-utleiemegler).',
        ],
      },
    ],
    faqs: [
      { q: 'Når på året er det best å leie ut i Bergen?', a: 'Juni–september er høysesong, med topp rundt studiestart i august. Legger du ut annonsen i juni–juli treffer du den største etterspørselen. Sentrale ettromsleiligheter og kollektivvennlige boliger går raskest.' },
      { q: 'Hvor lang tid tar det å finne leietaker i Bergen?', a: 'Med riktig pris og god annonse: normalt fra noen dager til 2–3 uker, avhengig av sesong, bydel og boligtype. Prises boligen feil, kan det ta måneder.' },
      { q: 'Må jeg betale skatt når jeg leier ut leiligheten?', a: 'Leier du ut mindre enn halvparten av boligen du selv bor i, målt i utleieverdi, er inntekten normalt skattefri. Utleie av sekundærbolig beskattes som kapitalinntekt med 22 % av overskuddet. Se guiden om skatt på utleie for detaljer.' },
      { q: 'Kan jeg leie ut møblert eller umøblert?', a: 'Begge deler fungerer i Bergen. Møblert passer studenter, unge i etableringsfasen og korttidsleie, og gir ofte noe høyere leie. Umøblert gir gjerne mer stabile, langsiktige leieforhold.' },
      { q: 'Hvor mye depositum bør jeg kreve?', a: 'To til tre måneders husleie er vanligst i Norge. Loven tillater opptil seks måneder, men høyere depositum reduserer antallet aktuelle leietakere merkbart, særlig i studentmarkedet.' },
      { q: 'Hvilken kontraktstype bør jeg velge?', a: 'Tidsbestemt avtale gir forutsigbarhet og er normalt minst tre år, eller ett år ved utleie av del av egen bolig. Tidsubestemt avtale gir fleksibilitet med oppsigelsesadgang for begge parter. Velg ut fra hvor lenge du vil binde boligen.' },
    ],
    author: AUTHOR,
    reviewer: REVIEWER_UTLEIE,
    sources: [LOV_HLF, SSB_LMU, HTU],
    related: ['depositum-regler', 'skatt-pa-utleie', 'hva-koster-utleiemegler', 'husleieokning'],
    cta: { label: 'Få gratis verdivurdering av leiepotensialet', href: '/bli-utleier' },
  },

  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'korttidsutleie-regler',
    metaTitle: 'Airbnb-regler 2026: 90 dager sameie, 30 borettslag',
    title: 'Airbnb og korttidsutleie: lover og regler du må kunne',
    description: 'Hvor lenge kan du leie ut på Airbnb? 90 døgn i eierseksjonssameie, 30 døgn i borettslag. Se skatt, forsikring, vedtekter og hva som gjelder i Bergen.',
    category: 'Korttidsutleie',
    readMinutes: 7,
    published: '2026-03-18',
    updated: '2026-08-05',
    image: '/bryggen-alley.webp',
    imageAlt: 'Bryggen i Bergen — populært område for korttidsutleie',
    keywords: ['airbnb regler', 'korttidsutleie', 'korttidsutleie regler', 'korttidsutleie bergen', 'korttidsutleie av egen bolig', 'airbnb 90 dager', 'hvor lenge kan jeg leie ut på airbnb'],
    entities: [ENT_AIRBNB, ENT_ESL, ENT_BERGEN],
    answer: 'Korttidsutleie reguleres ulikt etter eierform og hva som leies ut. I eierseksjonssameier er hovedregelen at korttidsutleie av hele boligseksjonen ikke kan overstige 90 døgn per år; vedtektene kan sette grensen mellom 60 og 120 døgn. I borettslag kan hele boligen normalt overlates til andre i opptil 30 døgn per år uten styrets samtykke når lovens vilkår er oppfylt. Utleie av bare et rom mens du selv bor i boligen vurderes annerledes. Skatt, vedtekter, forsikring og eventuell bruksendring må også kontrolleres.',
    keyFacts: [
      '**Eierseksjonssameie:** maks **90 døgn** per år for hele seksjonen. Vedtektene kan sette grensen mellom 60 og 120 døgn.',
      '**Borettslag:** normalt **30 døgn** per år uten styrets samtykke.',
      '**Korttidsutleie** betyr utleie i opptil 30 døgn sammenhengende.',
      '**Skatt egen bolig:** 10 000 kr skattefritt, deretter skattlegges **85 %** av det overskytende.',
      '**Forsikring:** vanlig innboforsikring dekker ofte ikke korttidsutleie — sjekk vilkårene.',
    ],
    sections: [
      {
        h2: 'Egen bolig eller sekundærbolig? Det avgjør nesten alt',
        paragraphs: [
          'Eierform, vedtekter og om du leier ut hele boligen eller bare en del av den er avgjørende. Reglene for sameier og borettslag gjelder bruksoverlating av hele boligen, mens romutleie mens du selv bor der vurderes annerledes.',
          'Sjekk derfor tre ting før du legger ut noe som helst: hvilken eierform boligen har, hva vedtektene sier, og om du leier ut hele boligen eller bare et rom.',
        ],
      },
      {
        h2: 'Eierseksjonssameier: 90-døgnsregelen',
        paragraphs: [
          'Etter eierseksjonsloven § 24 er korttidsutleie av hele boligseksjonen som hovedregel begrenset til 90 døgn per år. Med korttidsutleie menes utleie i opptil 30 døgn sammenhengende. Sameiet kan vedtektsfeste en grense mellom 60 og 120 døgn.',
          'Regelen må vurderes konkret mot hva som leies ut og sameiets gjeldende vedtekter. Utleie av bare deler av boligen mens du selv bor der er ikke det samme som korttidsutleie av hele seksjonen.',
          'Loggfør døgnene fra dag én. Det er du som må kunne dokumentere at grensen er overholdt hvis styret stiller spørsmål.',
        ],
      },
      {
        h2: 'Borettslag: strengere rammer',
        paragraphs: [
          'I borettslag gjelder brukereglene i borettslagsloven: du kan overlate bruken av hele boligen til andre i opptil 30 døgn per år uten styrets samtykke. Utover dette krever utleie godkjenning, og ren investor-utleie er som hovedregel ikke tillatt — borettslagsmodellen bygger på at andelseier selv bor i boligen.',
        ],
      },
      {
        h2: 'Korttidsutleie i Bergen — hva gjelder her?',
        paragraphs: [
          'Bergen har ikke egne kommunale døgngrenser for korttidsutleie: det er eierform og vedtekter som styrer. Til gjengjeld har byen en sesongprofil som gjør korttidsutleie kommersielt interessant — cruise- og turistsesongen fra mai til september, festivaler og arrangementer skaper etterspørselstopper som langtidsleie ikke fanger.',
          'Det er nettopp derfor kombinasjonsmodeller er populære i Bergen: langtidsleie som fundament, med en avgrenset korttidsperiode i høysesongen. Lovligheten avhenger fullt ut av eierform og vedtekter, og for borettslag er 30-døgnsrammen normalt for stram. Se [Airbnb-forvaltning i Bergen](/airbnb-forvaltning-bergen) for hvordan dette gjøres i praksis, og [leiemarkedsrapporten](/leiemarkedet/bergen) for prisnivåene.',
        ],
      },
      {
        h2: 'Skatt ved korttidsutleie',
        paragraphs: [
          'For leieforhold i egen bolig som varer under 30 dager gjelder en sjablongregel: de første 10 000 kr per år er skattefrie, og av det overskytende regnes 85 % som skattepliktig kapitalinntekt med 22 % skatt.',
          'Korttidsutleie av sekundærbolig følger derimot de vanlige reglene for skattepliktig utleie, uten sjablongfradrag. Da fører du faktiske [kostnader som fradrag](/guider/fradrag-utleiebolig) og skattlegges av overskuddet. Se hele bildet i guiden om [skatt på utleie](/guider/skatt-pa-utleie).',
        ],
      },
      {
        h2: 'Andre regler å ha kontroll på',
        list: [
          'Plattformene rapporterer inntektene dine til Skatteetaten automatisk',
          'Forsikring: vanlig innboforsikring dekker ofte ikke korttidsutleie — sjekk vilkårene eller tegn tillegg',
          'Naboer og husordensregler: støy og hyppige utskiftninger er den vanligste konfliktkilden — informer gjerne naboene',
          'Brannsikkerhet: røykvarslere, slukkeutstyr og rømningsveier er utleiers ansvar',
          'Leier du ut en utleiedel i kjeller eller loft, må den være [godkjent for varig opphold](/guider/godkjent-utleiedel)',
        ],
      },
      {
        h2: 'Slik maksimerer du lovlig: 10+2-modellen',
        paragraphs: [
          '10+2 kan være aktuelt for enkelte eierseksjoner dersom total korttidsutleie holder seg innenfor vedtektene og lovens døgngrense. I borettslag er 30-døgnsrammen vesentlig strengere, slik at to fulle måneder normalt krever særskilt avklaring eller en annen modell.',
          'En inntektsøkning på opptil 30 % er et potensialestimat, ikke en garanti. Resultatet avhenger av bolig, område, sesong, pris, kostnader og hvilke utleiemodeller som er lovlige. Se [metode- og forbeholdssiden](/metode) før du bruker estimatet som beslutningsgrunnlag.',
        ],
      },
    ],
    faqs: [
      { q: 'Kan jeg leie ut leiligheten min på Airbnb hele året?', a: 'Ikke uten videre. I et eierseksjonssameie gjelder normalt en årlig grense for korttidsutleie av hele seksjonen, og i borettslag er rammen normalt 30 døgn uten styrets samtykke når lovens vilkår er oppfylt. Vedtekter, eierform og om du leier ut hele boligen eller bare et rom må kontrolleres.' },
      { q: 'Gjelder 90-døgnsregelen når jeg leier ut et rom i boligen jeg bor i?', a: 'Utleie av bare et rom mens du selv bor i boligen er ikke det samme som korttidsutleie av hele boligseksjonen. Vurder likevel vedtekter, husordensregler, skatt, forsikring og brannsikkerhet.' },
      { q: 'Trenger jeg å søke kommunen for å drive korttidsutleie?', a: 'Normal korttidsutleie av egen bolig krever ikke bruksendring. Drives det i et omfang som ligner hotell- eller næringsvirksomhet, kan det stille seg annerledes — da bør du avklare med kommunen.' },
      { q: 'Hva skjer hvis jeg bryter 90-døgnsgrensen?', a: 'Sameiet kan kreve at den ulovlige bruken opphører, og ved vesentlig mislighold kan styret i ytterste konsekvens kreve seksjonen solgt. Ta grensene på alvor — og loggfør utleiedøgnene.' },
      { q: 'Hva regnes som korttidsutleie?', a: 'Utleie i opptil 30 døgn sammenhengende regnes som korttidsutleie i eierseksjonsloven. Leier du ut for 31 døgn eller mer i sammenheng, er det ikke korttidsutleie etter denne regelen — men andre begrensninger kan fortsatt gjelde.' },
      { q: 'Er korttidsutleie tillatt i Bergen?', a: 'Ja, Bergen har ikke egne kommunale døgngrenser. Det er eierform, vedtekter og eventuell bruksendring som setter rammene, i tillegg til skatte- og forsikringsreglene.' },
    ],
    author: AUTHOR,
    reviewer: REVIEWER_JUS,
    sources: [LOV_ESL24, REG_ESL, REG_BRL, SKATT_KORTTID, METODE],
    related: ['skatt-pa-utleie', 'godkjent-utleiedel', 'depositum-regler'],
    cta: { label: 'Se hvordan 10+2 fungerer i praksis', href: '/airbnb-forvaltning-bergen' },
    disclaimer: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'godkjent-utleiedel',
    metaTitle: 'Godkjent utleiedel: krav, kostnad og gråsonen 2026',
    title: 'Godkjent utleiedel: kravene, kostnaden og gråsonen',
    description: 'Må utleiedelen være godkjent? Se kravene til rømningsvei, romhøyde og dagslys, hva bruksendring koster, og risikoen ved å leie ut en ikke-godkjent bolig.',
    category: 'Godkjenning',
    readMinutes: 8,
    published: '2026-08-05',
    updated: '2026-08-05',
    image: '/interior-hallway.webp',
    imageAlt: 'Utleiedel i kjeller — rom godkjent for varig opphold',
    keywords: ['godkjent utleiedel', 'gråsone utleie bolig', 'hva koster det å få godkjent utleiedel', 'bruksendring utleiedel', 'ulovlig utleiedel', 'godkjent for varig opphold'],
    entities: [ENT_TEK17, ENT_BERGEN],
    answer: 'En utleiedel er «godkjent» når rommene er registrert som hoveddel, altså godkjent for varig opphold, i kommunens byggesaksarkiv. Skal du gjøre kjeller eller loft om fra tilleggsdel til hoveddel, kreves søknad om bruksendring etter plan- og bygningsloven. Sentrale krav gjelder rømningsvei, brannsikkerhet, romhøyde, dagslys og ventilasjon. For boliger oppført før 1. juli 2011 gjelder lempeligere krav ved bruksendring innenfor samme boenhet. Å leie ut en ikke-godkjent utleiedel er ikke forbudt i seg selv, men det gir risiko for pålegg, forsikringsproblemer og krav fra leietaker.',
    keyFacts: [
      '**«Godkjent»** betyr registrert som **hoveddel** — godkjent for varig opphold — i kommunens arkiv.',
      '**Søknadsplikt:** bruksendring fra tilleggsdel til hoveddel krever søknad etter plan- og bygningsloven.',
      '**Lempeligere krav** for bygg oppført **før 1. juli 2011** ved bruksendring innenfor samme boenhet.',
      '**Rømning og brann** kan ikke lempes bort — det er alltid et krav.',
      '**Kostnad:** ansvarlig søker og gebyr ligger typisk i titusenkroners-klassen; fysiske tiltak varierer mye. Kontroller kommunens gjeldende gebyrregulativ.',
    ],
    sections: [
      {
        h2: 'Hva betyr «godkjent utleiedel»?',
        paragraphs: [
          'Boligen din er delt i to kategorier i byggesaksarkivet: hoveddel og tilleggsdel. Hoveddel er rom godkjent for varig opphold — stue, kjøkken, soverom, bad, entré. Tilleggsdel er boder, kjellerrom, garasje og loft som ikke er godkjent for å bo i.',
          'Når folk sier «godkjent utleiedel», mener de at rommene i utleiedelen står registrert som hoveddel. Er de registrert som tilleggsdel, er de formelt ikke godkjent for varig opphold — uansett hvor pent det er pusset opp, og uansett om det står bad og kjøkken der.',
          'Merk skillet: dette handler om byggesak, ikke om husleieloven eller skatt. En utleiedel kan være ulovlig etter plan- og bygningsloven, samtidig som leieforholdet i seg selv er gyldig og leieinntekten skattlegges som normalt.',
        ],
      },
      {
        h2: 'Sjekk status før du gjør noe annet',
        paragraphs: [
          'Du finner status i kommunens byggesaksarkiv. Bestill byggesaksmappen for eiendommen, og se på plantegningene som ligger til grunn for siste godkjenning: der står det hva hvert rom er godkjent som.',
          'I Bergen bestiller du dette gjennom kommunens byggesakstjeneste. Har du kjøpt boligen relativt nylig, står det ofte noe om det i takst eller tilstandsrapport — men arkivet er den eneste sikre kilden.',
        ],
      },
      {
        h2: 'Kravene til rom for varig opphold',
        paragraphs: [
          'Byggteknisk forskrift setter kravene. Dette er de som oftest avgjør om en kjeller eller et loft kan bli utleiedel:',
        ],
        list: [
          '**Rømningsvei:** hvert oppholdsrom må ha godkjent rømningsmulighet — som regel et rømningsvindu med tilstrekkelig størrelse og riktig brystningshøyde, eller direkte utgang',
          '**Brannsikkerhet:** brannskille mellom boenheter, røykvarslere og slokkeutstyr',
          '**Romhøyde:** normalt 2,4 meter for nybygg. Ved bruksendring i eldre bolig kan lavere høyde aksepteres',
          '**Dagslys og utsyn:** krav til vindusareal og utsyn fra oppholdsrom',
          '**Ventilasjon og fukt:** tilstrekkelig luftskifte, og fuktsikring mot grunn i kjeller',
          '**Radon:** krav til radonforebygging i nybygg',
          '**Lydforhold:** krav til lydisolasjon mellom separate boenheter',
          '**Våtrom:** membran, sluk og fall etter forskriftskrav dersom det etableres nytt bad',
        ],
      },
      {
        h2: 'Unntakene for eldre boliger — dette gjør det mulig',
        paragraphs: [
          'Her ligger den viktigste nyansen, og den mange ikke kjenner: for byggverk oppført før 1. juli 2011 gjelder det lempeligere krav ved søknad om bruksendring fra tilleggsdel til hoveddel innenfor samme boenhet. Flere av de kravene som ellers stopper prosjektet — blant annet romhøyde, dagslys, utsyn, radon og isolasjon — er unntatt i disse tilfellene.',
          'Praktisk betyr det at en kjeller med 2,2 meter takhøyde og små vinduer likevel kan bli godkjent utleiedel, forutsatt at rømning og brannsikkerhet er i orden og resten av søknaden holder.',
          'Unntakene gjelder innenfor samme boenhet. Skal utleiedelen bli en egen, selvstendig boenhet med egen inngang, egen boenhetsadresse og fullt skille, er dette en større sak med flere krav — blant annet lyd, brann og adkomst.',
        ],
      },
      {
        h2: 'Hva koster det å få godkjent utleiedel?',
        paragraphs: [
          'Kostnaden består av tre deler, og bare den første er noenlunde forutsigbar.',
          'Kommunalt byggesaksgebyr følger kommunens gebyrregulativ og fastsettes per sakstype. Ansvarlig søker, som må være et foretak med nødvendig kompetanse, tar honorar for tegninger, søknad og oppfølging — dette ligger typisk i titusenkroners-klassen. De fysiske tiltakene er den store variabelen: et rømningsvindu er en begrenset jobb, mens nytt bad, brannskille, drenering eller senking av gulv kan bli et betydelig prosjekt.',
          'Vi oppgir bevisst ikke faste kronebeløp her, fordi gebyrer endres årlig og fordi tiltakskostnaden avhenger helt av boligen. Kontroller Bergen kommunes gjeldende gebyrregulativ, og få minst to tilbud fra ansvarlig søker før du regner på lønnsomheten.',
        ],
        list: [
          '**Kommunalt byggesaksgebyr:** etter gjeldende gebyrregulativ — sjekk kommunens satser',
          '**Ansvarlig søker og tegninger:** honorar til foretak med søknadskompetanse',
          '**Fysiske tiltak:** rømningsvindu, brannskille, ventilasjon, eventuelt bad og kjøkken',
          '**Uavhengig kontroll:** kan være påkrevd for våtrom og lufttetthet i visse saker',
        ],
      },
      {
        h2: 'Gråsonen: risikoen ved å leie ut uten godkjenning',
        paragraphs: [
          'Mange norske boliger leies ut fra rom som formelt er tilleggsdel. Det er ikke straffbart å bo der, men risikoen er reell og bør regnes på før du velger å la det ligge.',
        ],
        list: [
          '**Pålegg og tvangsmulkt:** kommunen kan kreve at ulovlig bruk opphører, og ilegge tvangsmulkt',
          '**Forsikring:** ved brann- eller vannskade kan selskapet redusere erstatningen dersom rommene ikke var godkjent for bruken',
          '**Krav fra leietaker:** boligen skal være i forsvarlig stand etter husleieloven. Er utleiedelen ulovlig, kan leietaker ha grunnlag for krav om prisavslag eller heving',
          '**Salg:** ikke-godkjent utleiedel må opplyses om, og reduserer normalt både prisantydning og interesse',
          '**Verdivurdering og finansiering:** banker og takstmenn regner ofte ikke inn leieinntekt fra rom som ikke er godkjent',
          '**Brannsikkerhet:** den reelle risikoen er den viktigste. Manglende rømningsvei er livsfarlig, ikke bare formelt feil',
        ],
      },
      {
        h2: 'Slik går du frem',
        list: [
          'Bestill byggesaksmappen og kontroller hva rommene er registrert som',
          'Få en fagperson til å vurdere rømning, brannskille, fukt og romhøyde',
          'Avklar om unntakene for bygg fra før 1. juli 2011 gjelder for din sak',
          'Innhent tilbud fra ansvarlig søker, og kontroller kommunens gebyrsatser',
          'Send søknad om bruksendring, og få ferdigattest før du annonserer utleiedelen',
          'Ta vare på ferdigattest og tegninger — de dokumenterer at [leieinntekten er basert på lovlig bruk](/guider/skatt-pa-utleie)',
        ],
      },
      {
        h2: 'Lønner det seg?',
        paragraphs: [
          'Regn det som en investering, ikke en utgift. En godkjent utleiedel gir leieinntekt som kan dokumenteres, den kan prises høyere, den er trygg å annonsere, og den regnes med i verdivurderingen ved salg og refinansiering.',
          'En utleiedel som gir 9 000 kr i månedsleie er 108 000 kr i året. Selv et prosjekt i hundretusenkroners-klassen kan da ha en akseptabel horisont — men det forutsetter at du regner på faktiske tilbud og ikke på anslag. Trenger du hjelp til å vurdere leiepotensialet først, gir vi [en konkret vurdering](/bli-utleier) før du bestemmer deg.',
        ],
      },
    ],
    faqs: [
      { q: 'Er det ulovlig å leie ut en ikke-godkjent utleiedel?', a: 'Selve utleien er ikke straffbar, men bruken av rommene kan være i strid med plan- og bygningsloven. Kommunen kan kreve at bruken opphører og ilegge tvangsmulkt, og forsikring, salgsverdi og leietakers rettigheter påvirkes.' },
      { q: 'Hva koster det å få godkjent utleiedel?', a: 'Tre kostnader: kommunalt byggesaksgebyr etter gjeldende regulativ, honorar til ansvarlig søker for tegninger og søknad, og de fysiske tiltakene. Tiltakene varierer mest — fra et rømningsvindu til nytt bad, brannskille og drenering. Innhent tilbud og kontroller kommunens satser før du regner.' },
      { q: 'Må jeg søke for å leie ut et soverom i boligen min?', a: 'Nei, ikke hvis rommet allerede er godkjent som hoveddel og du ikke etablerer en egen boenhet. Søknadsplikten utløses når du endrer bruken av rom fra tilleggsdel til hoveddel, eller oppretter en ny selvstendig boenhet.' },
      { q: 'Kreves 2,4 meter takhøyde i utleiedelen?', a: 'For nybygg er utgangspunktet 2,4 meter. Ved bruksendring fra tilleggsdel til hoveddel i bygg oppført før 1. juli 2011 gjelder lempeligere krav, og lavere romhøyde kan aksepteres. Rømning og brannsikkerhet lempes derimot ikke.' },
      { q: 'Hvordan sjekker jeg om utleiedelen er godkjent?', a: 'Bestill byggesaksmappen for eiendommen fra kommunen og se på de godkjente plantegningene. Der står det hva hvert rom er registrert som — hoveddel eller tilleggsdel. Arkivet er den eneste sikre kilden.' },
      { q: 'Påvirker godkjenningen skatten på leieinntekten?', a: 'Skatteplikten følger av utleieforholdet, ikke av byggesaksstatus. Er utleien skattepliktig, skal den rapporteres uansett. Men manglende godkjenning kan påvirke hva som anses som utleieverdi, og skaper problemer ved dokumentasjon mot bank og kjøper.' },
    ],
    author: AUTHOR,
    reviewer: REVIEWER_JUS,
    sources: [DIBK_UTLEIE, DIBK_TEK, LOV_PBL, BERGEN_BYGG],
    related: ['leie-ut-leilighet-bergen', 'skatt-pa-utleie', 'fradrag-utleiebolig'],
    cta: { label: 'Få vurdert leiepotensialet i boligen din', href: '/bli-utleier' },
    disclaimer: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'husleieokning',
    metaTitle: 'Husleieøkning 2026: KPI-regelen og gjengs leie',
    title: 'Husleieøkning: slik øker du leien lovlig',
    description: 'To lovlige måter å øke husleien: KPI-justering én gang i året med én måneds varsel, og gjengs leie tidligst etter 2,5 år med seks måneders varsel.',
    category: 'Leiepris',
    readMinutes: 7,
    published: '2026-08-05',
    updated: '2026-08-05',
    image: '/interior-dining.webp',
    imageAlt: 'Utleiebolig der husleien skal indeksjusteres',
    keywords: ['husleieøkning', 'øke husleien', 'kpi justering husleie', 'gjengs leie', 'indeksregulering husleie', 'hvor mye kan husleien økes'],
    entities: [ENT_HUSLEIELOVEN, ENT_KPI],
    answer: 'Husleien i et løpende leieforhold kan økes på to lovlige måter. (1) Indeksregulering etter husleieloven § 4-2: økningen kan ikke overstige endringen i konsumprisindeksen, kan tidligst settes i verk ett år etter forrige leiefastsetting, og krever minst én måneds skriftlig varsel. (2) Tilpasning til gjengs leie etter § 4-3: kan kreves når leieforholdet har vart minst to år og seks måneder uten annen endring enn KPI-justering, og settes tidligst i verk seks måneder etter at skriftlig krav er fremsatt. Du kan ikke øke leien fritt fordi dine egne kostnader har steget.',
    keyFacts: [
      '**KPI-justering:** maks endringen i konsumprisindeksen, tidligst **ett år** etter siste leiefastsetting, **minst én måneds** skriftlig varsel.',
      '**Gjengs leie:** krever minst **to år og seks måneder** uten annen endring, og settes i verk tidligst **seks måneder** etter skriftlig krav.',
      '**Alltid skriftlig varsel** — muntlig økning er ikke gyldig.',
      '**Egne kostnader** er ikke grunnlag for å øke leien i et løpende forhold.',
      '**Ny leietaker:** fri prissetting — se [leiemarkedsrapporten for Bergen](/leiemarkedet/bergen).',
    ],
    sections: [
      {
        h2: 'To lovlige måter å øke husleien',
        paragraphs: [
          'Husleieloven gir to spor, og de kan ikke blandes fritt. Det ene er en årlig, forsiktig justering etter prisutviklingen. Det andre er en sjeldnere tilpasning opp mot det tilsvarende boliger faktisk leies ut for i området.',
          'Utenfor disse to sporene kan leien bare endres ved at partene blir enige, eller ved at det inngås en ny leieavtale. Sender du et krav som ikke oppfyller vilkårene, er økningen ikke gyldig — og leietaker kan kreve det som er betalt for mye tilbake.',
        ],
        list: [
          '**Indeksregulering (§ 4-2):** liten, årlig justering etter konsumprisindeksen',
          '**Gjengs leie (§ 4-3):** større tilpasning, tidligst etter to og et halvt år',
          '**Ny avtale:** fri prissetting ved ny leietaker eller ny kontrakt',
        ],
      },
      {
        h2: 'KPI-justering: reglene',
        paragraphs: [
          'Indeksregulering er den vanligste og enkleste økningen. Begge parter kan kreve den, uten annen begrunnelse enn prisutviklingen. Tre vilkår må være oppfylt samtidig.',
        ],
        list: [
          'Økningen kan ikke overstige endringen i konsumprisindeksen siden forrige leiefastsetting',
          'Endringen kan tidligst settes i verk ett år etter at forrige leiefastsetting ble satt i verk',
          'Motparten må varsles skriftlig med minst én måneds frist før endringen settes i verk',
        ],
      },
      {
        h2: 'Slik regner du KPI-justeringen',
        paragraphs: [
          'Formelen er enkel: ny leie = dagens leie × (ny KPI ÷ gammel KPI). Du bruker konsumprisindeksen fra SSB for de to sammenligningsmånedene.',
          'Eksempel: leien er 15 000 kr, fastsatt med utgangspunkt i KPI for juni i fjor på 130,0. KPI for juni i år er 134,2. Ny leie blir 15 000 × (134,2 ÷ 130,0) = 15 484 kr. Runder du ned til 15 480 kr, er du trygt innenfor.',
          'Rund alltid ned, aldri opp. En økning som overstiger KPI-endringen er ikke gyldig etter § 4-2, og da faller hele justeringen — ikke bare det overskytende.',
        ],
        list: [
          'Hent KPI-tallene fra [SSB](https://www.ssb.no/priser-og-prisindekser/konsumpriser/statistikk/konsumprisindeksen)',
          'Bruk samme måned begge år, og oppgi hvilke tall du har brukt i varselet',
          'Rund ned, ikke opp',
          'Dokumenter beregningen — det gjør varselet etterprøvbart',
        ],
      },
      {
        h2: 'Gjengs leie: den større tilpasningen',
        paragraphs: [
          'Har leieforholdet vart i minst to år og seks måneder uten annen endring av leien enn KPI-justering, kan begge parter kreve at leien settes til gjengs leie. Gjengs leie er ikke det samme som markedsleie for en ny kontrakt: det er nivået tilsvarende boliger på tilsvarende avtalevilkår faktisk leies ut for i området, altså et gjennomsnitt av løpende leieforhold.',
          'Kravet må fremsettes skriftlig, og endringen kan tidligst settes i verk seks måneder etter at kravet er fremsatt. Ved fastsettingen skal det gjøres fradrag for den delen av leieverdien som skyldes leietakers egne forbedringer av boligen.',
          'I praksis betyr fristene at du må planlegge: fremsetter du kravet i januar, kan den nye leien tidligst gjelde fra juli. Blir partene uenige om nivået, kan saken bringes inn for [Husleietvistutvalget](https://www.htu.no/).',
        ],
      },
      {
        h2: 'Varselet — hva det må inneholde',
        paragraphs: [
          'Et varsel som mangler formkrav er ikke gyldig, uansett hvor rimelig økningen er. Skriv det slik at det står seg alene.',
        ],
        list: [
          'Hvem varselet gjelder, og hvilken bolig og leieavtale',
          'Hvilken hjemmel du bruker: indeksregulering eller gjengs leie',
          'Dagens leie og ny leie i kroner',
          'Beregningen ved KPI-justering: hvilke indekstall som er brukt',
          'Dato endringen settes i verk — kontroller at fristen er overholdt',
          'Dato, navn og signatur eller sporbar elektronisk sending',
        ],
      },
      {
        h2: 'Dette kan du ikke gjøre',
        list: [
          'Øke leien fordi dine egne kostnader, renter eller felleskostnader har steget',
          'Øke leien to ganger i samme tolvmånedersperiode med samme hjemmel',
          'Gjennomføre økning uten skriftlig varsel innen fristen',
          'Kreve gjengs leie før det har gått to år og seks måneder uten annen endring',
          'Bruke leieøkning som press i en konflikt om andre forhold — det svekker saken din',
        ],
      },
      {
        h2: 'Ved ny leietaker: fri prissetting',
        paragraphs: [
          'Ved ny leieavtale står du fritt til å sette prisen. Det er også det praktiske argumentet for å prise riktig fra start: er leien satt for lavt i en treårskontrakt, får du bare hentet inn KPI-justeringen underveis, og du må vente i to og et halvt år før du kan kreve gjengs leie.',
          'Sjekk nivået før du annonserer. Se [leiemarkedsrapporten for Bergen](/leiemarkedet/bergen) og bydelsoversikten under [utleie i Bergen](/utleie/bergen), eller les hele fremgangsmåten i guiden om [å leie ut leilighet i Bergen](/guider/leie-ut-leilighet-bergen).',
        ],
      },
      {
        h2: 'Vanlige feil',
        list: [
          'Muntlig beskjed om økning, uten skriftlig varsel',
          'For kort varselfrist — én måned ved KPI, seks måneder ved gjengs leie',
          'Regner opp i stedet for ned, og overstiger KPI-endringen',
          'Blander KPI-justering og gjengs leie i samme krav',
          'Glemmer at leietakers egne forbedringer skal trekkes fra ved gjengs leie',
        ],
      },
    ],
    faqs: [
      { q: 'Hvor mye kan husleien økes per år?', a: 'Ved indeksregulering kan økningen ikke overstige endringen i konsumprisindeksen siden forrige leiefastsetting, og den kan bare gjennomføres én gang per år med minst én måneds skriftlig varsel. Større økninger krever tilpasning til gjengs leie, som tidligst kan kreves etter to år og seks måneder.' },
      { q: 'Må jeg varsle husleieøkning skriftlig?', a: 'Ja. Skriftlig varsel er et vilkår. Ved indeksregulering er fristen minst én måned før økningen settes i verk. Ved gjengs leie kan endringen tidligst settes i verk seks måneder etter at skriftlig krav er fremsatt.' },
      { q: 'Hva er forskjellen på gjengs leie og markedsleie?', a: 'Markedsleie er hva boligen kan leies ut for i en ny avtale i dag. Gjengs leie er gjennomsnittet av det tilsvarende boliger på tilsvarende vilkår faktisk leies ut for, altså inkludert løpende leieforhold. Gjengs leie ligger derfor normalt lavere enn markedsleie i et stigende marked.' },
      { q: 'Kan jeg øke husleien fordi kostnadene mine har steget?', a: 'Nei, ikke i et løpende leieforhold. Økte renter, felleskostnader eller kommunale avgifter er ikke selvstendig grunnlag. Du er henvist til indeksregulering eller gjengs leie — eller til å bli enig med leietaker.' },
      { q: 'Hva skjer hvis jeg har økt leien ulovlig?', a: 'Økningen er ikke gyldig, og leietaker kan kreve det som er betalt for mye tilbake. Bli det uenighet, behandles saken av Husleietvistutvalget. Rett opp raskt og skriftlig hvis du oppdager feilen selv.' },
      { q: 'Kan leietaker kreve leien satt ned?', a: 'Ja. Reglene om gjengs leie gjelder begge parter. Har markedet falt, kan leietaker kreve tilpasning ned til gjengs leie på samme vilkår og med samme frister.' },
      { q: 'Gjelder de samme reglene for korttidsutleie?', a: 'Nei. Reglene i husleieloven § 4-2 og § 4-3 gjelder løpende boligleieforhold. Ved korttidsutleie settes prisen per opphold, og der gjelder [andre rammer](/guider/korttidsutleie-regler) — særlig døgngrenser og vedtekter.' },
    ],
    author: AUTHOR,
    reviewer: REVIEWER_JUS,
    sources: [LOV_42, LOV_43, SSB_KPI, HTU],
    related: ['leie-ut-leilighet-bergen', 'hva-koster-utleiemegler', 'depositum-regler'],
    cta: { label: 'La oss holde leien riktig for deg', href: '/bli-utleier' },
    disclaimer: true,
  },
];
