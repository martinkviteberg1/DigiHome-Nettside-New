// ---------------------------------------------------------------------------
// PRIS-KLYNGEN
//
// Datagrunnlag (Search Console, 2026-05-04 → 2026-08-02):
//   /guider/hva-koster-utleiemegler: 388 visninger, 4 klikk, CTR 1,0 %, pos 7,0
//   «hvor mye tar utleiemegleren i provisjon» 21 visn · pos 6,4 · 0 klikk
//   «hva koster utleiemegleren»              14 visn · pos 8,4 · 0 klikk
//   «hvor mye tar utleiemegleren»            14 visn · pos 10,5 · 0 klikk
//   «hvor mye koster utleiemegler»           10 visn · pos 10,8 · 0 klikk
//   «pris utleiemegler»                      19 visn · pos 7,6 · 1 klikk
//   «utleiemegler bergen»                    36 visn · pos 6,8 · 3 klikk
// Diagnose: siden rangerte i topp 10 på de mest kommersielle søkene, men
// tittelen manglet ordet «provisjon» og et konkret kronebeløp. Derfor 0 klikk.
// Tittel, beskrivelse, nøkkeltall og H2-er er nå skrevet mot faktiske søk, og
// Bergen-innholdet fra den kannibaliserende nyhetsartikkelen er flyttet inn hit.
// ---------------------------------------------------------------------------

const AUTHOR = { name: 'Sarah Sleeman', role: 'Daglig leder og eiendomsmegler', url: '/om-oss' };
const REVIEWER = { type: 'Organization', name: 'DigiHome fagredaksjon', role: 'Markeds- og priskildesjekk', url: '/metode' };

const SSB_LMU = { label: 'SSB: Leiemarkedsundersøkelsen', url: 'https://www.ssb.no/bygg-bolig-og-eiendom/bolig-og-boforhold/statistikk/leiemarkedsundersokelsen' };
const LOV_HLF = { label: 'Lovdata: husleieloven', url: 'https://lovdata.no/lov/1999-03-26-17' };
const METODE = { label: 'DigiHome: metode og forbehold for nøkkeltall', url: '/metode' };
const MEGLERSMART = { label: 'Meglersmart: pris på utleiemegler', url: 'https://www.meglersmart.no/pris/utleiemegler' };
const UM24 = { label: 'Utleiemegler24: pris og utleiehjelp i Bergen', url: 'https://utleiemegler24.no/omrader/vestland/bergen' };

const ENT_UTLEIEMEGLER = { name: 'Utleiemegler', sameAs: 'https://no.wikipedia.org/wiki/Eiendomsmegler' };
const ENT_BERGEN = { name: 'Bergen', sameAs: 'https://www.wikidata.org/wiki/Q26793' };
const ENT_HUSLEIELOVEN = { name: 'Husleieloven', sameAs: 'https://lovdata.no/lov/1999-03-26-17' };

export const prisGuides = [
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'hva-koster-utleiemegler',
    metaTitle: 'Hva koster utleiemegler? Provisjon 8–12 % (2026)',
    title: 'Hva koster en utleiemegler? Provisjon, gebyrer og totalpris',
    description: 'Utleiemegler tar typisk 8–12 % av husleien i provisjon, pluss etableringshonorar på en halv til én månedsleie. Se regneeksempel og hva du betaler første året.',
    category: 'Pris',
    readMinutes: 8,
    published: '2026-03-18',
    updated: '2026-08-05',
    image: '/bergen-rooftops.webp',
    imageAlt: 'Utleieboliger i Bergen — hva koster forvaltningen?',
    keywords: ['hva koster utleiemegler', 'hvor mye tar utleiemegleren i provisjon', 'hva koster utleiemegleren', 'hvor mye tar utleiemegleren', 'hvor mye koster utleiemegler', 'pris utleiemegler', 'utleiemegler bergen pris', 'utleiemegler provisjon'],
    entities: [ENT_UTLEIEMEGLER, ENT_BERGEN],
    answer: 'En utleiemegler i Norge tar vanligvis 8–12 % av husleien i løpende provisjon, pluss et etableringshonorar på en halv til én månedsleie når leietaker er på plass. For en bolig med 15 000 kr i månedsleie betyr det typisk 1 200–1 800 kr per måned og 7 500–15 000 kr i oppstart — rundt 30 000–37 000 kr første året. Kun utleieformidling, altså å finne leietaker uten løpende forvaltning, koster ofte én månedsleie. DigiHome tilbyr selvforvaltning for 5 % av husleien og full forvaltning etter individuelt tilbud, uten oppstartskostnad og uten bindingstid.',
    keyFacts: [
      '**Løpende provisjon:** typisk **8–12 %** av brutto husleie per måned.',
      '**Etableringshonorar:** ofte en halv til én månedsleie, som engangsbeløp per ny leietaker.',
      '**Kun formidling:** finne leietaker uten løpende drift koster ofte **én månedsleie**.',
      '**Førsteårskostnad ved 15 000 kr i leie:** typisk **30 000–37 000 kr** hos tradisjonelle aktører.',
      '**DigiHome:** selvforvaltning **5 %** av husleien, full forvaltning etter individuelt tilbud — 0 kr oppstart, ingen bindingstid.',
    ],
    sections: [
      {
        h2: 'Hvor mye tar utleiemegleren i provisjon?',
        paragraphs: [
          'Den løpende provisjonen ligger normalt på 8–12 % av brutto husleie per måned. Det er dette tallet folk mener når de spør hva utleiemegleren «tar». Prosentsatsen beregnes av husleien, ikke av overskuddet, og trekkes gjerne automatisk før leien overføres til deg.',
          'For en bolig med 15 000 kr i månedsleie betyr 8 % 1 200 kr per måned, og 12 % betyr 1 800 kr. Over ett år blir det 14 400–21 600 kr. På en portefølje av tre boliger er forskjellen mellom 8 % og 12 % over 21 000 kr i året — det er verdt å forhandle om.',
          'Merk at prosentsatsen alene ikke sier hva du betaler. Etableringshonorar, tillegg for visninger, fornyet utleie og håndverkerkoordinering kan legge betydelige beløp på toppen. Be alltid om totalpris for første år.',
        ],
        list: [
          '8 % av 15 000 kr = 1 200 kr/mnd = 14 400 kr/år',
          '10 % av 15 000 kr = 1 500 kr/mnd = 18 000 kr/år',
          '12 % av 15 000 kr = 1 800 kr/mnd = 21 600 kr/år',
          'DigiHome selvforvaltning: 5 % av 15 000 kr = 750 kr/mnd = 9 000 kr/år',
        ],
      },
      {
        h2: 'Dette betaler du for hos en utleiemegler',
        paragraphs: [
          'En utleiemegler tar hele eller deler av jobben med å leie ut boligen din: annonsering og fotografering, visninger, screening av leietakere med kreditt- og referansesjekk, husleiekontrakt, [depositumshåndtering](/guider/depositumskonto), innkreving av husleie og oppfølging gjennom leieforholdet.',
          'Prismodellen består som regel av to deler: et engangsbeløp når leietaker er på plass, ofte kalt etableringshonorar eller innleiingsprovisjon, og en løpende prosent av husleien så lenge forvaltningen varer.',
        ],
      },
      {
        h2: 'Typiske priser i det norske markedet',
        paragraphs: [
          'Prisene varierer mellom aktører og byer, men dette er de vanlige intervallene:',
        ],
        list: [
          'Etableringshonorar: ofte tilsvarende en halv til én månedsleie, som engangsbeløp per ny leietaker',
          'Løpende forvaltning: typisk 8–12 % av brutto husleie per måned',
          'Kun utleieformidling, uten løpende forvaltning: ofte én månedsleie',
          'Tillegg: visninger utover inkludert antall, fornyet utleie, håndverkerkoordinering og årsrapporter kan komme i tillegg hos enkelte',
        ],
      },
      {
        h2: 'Regneeksempel: bolig til 15 000 kr i måneden',
        paragraphs: [
          'Sammenlign totalkostnad, ikke prosentsats. Her er tre realistiske scenarier for det første året, med ett leietakerbytte i oppstarten:',
        ],
        list: [
          '**Tradisjonell aktør, 10 % + én månedsleie i etablering:** 18 000 kr provisjon + 15 000 kr etablering = **33 000 kr**',
          '**Tradisjonell aktør, 8 % + halv månedsleie:** 14 400 kr + 7 500 kr = **21 900 kr**',
          '**Kun formidling, én månedsleie:** **15 000 kr** — men du gjør all løpende drift selv',
          '**DigiHome selvforvaltning, 5 %, 0 kr oppstart:** **9 000 kr** — du bruker verktøyene og gjør resten selv',
          'Husk at forvaltningshonorar er en [fradragsberettiget kostnad ved skattepliktig utleie](/guider/fradrag-utleiebolig), som reduserer den reelle nettokostnaden',
        ],
      },
      {
        h2: 'Hva koster utleiemegler i Bergen?',
        paragraphs: [
          'Bergen følger de nasjonale intervallene tett, men to lokale forhold påvirker regnestykket. Etterspørselen er sterkt sesongpreget med topp rundt studiestart i august, og leieprisnivået varierer mye mellom bydelene. Begge påvirker hva honoraret faktisk koster deg i kroner.',
          'Med en typisk toroms i Bergen betyr 10 % provisjon i praksis noe forskjellig i Sentrum enn i Åsane, fordi honoraret følger leienivået. Se dagens leienivåer i [leiemarkedsrapporten for Bergen](/leiemarkedet/bergen), og bydelsoversikten under [utleie i Bergen](/utleie/bergen).',
          'Det som betyr mest for lønnsomheten er likevel ikke prosentsatsen, men tomgang og prissetting. Én måned tomt tilsvarer omtrent 8 % av årsinntekten — altså mer enn hele årsprovisjonen hos de fleste aktører. En megler som leier ut raskt og treffer riktig pris tjener seg ofte inn på det alene.',
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
          'Vi har fjernet etableringshonoraret helt og erstattet timebasert arbeid med teknologi. Selvforvaltning koster 5 % av husleien — du bruker våre digitale verktøy for annonsering, screening, kontrakt og husleie, og gjør resten selv. Full forvaltning prises individuelt ut fra boligen, og du får et konkret tilbud samme dag.',
          'Begge modeller er uten oppstartskostnader og uten bindingstid. Usikker på hvilken som passer? Les [utleiemegler eller selvforvaltning](/guider/utleiemegler-vs-selvforvaltning), eller sett sammen en pakke i [priskalkulatoren](/priskalkulator).',
        ],
      },
      {
        h2: 'Spørsmål du bør stille før du signerer',
        list: [
          'Hva er totalkostnaden første året — inkludert etablering, løpende honorar og tillegg?',
          'Er det bindingstid, og hva koster det å avslutte?',
          'Hvordan settes leieprisen — manuelt én gang, eller løpende etter markedet?',
          'Hva skjer ved bytte av leietaker — nytt etableringshonorar?',
          'Hvor mange visninger er inkludert, og hva koster de utover?',
          'Får jeg innsyn i økonomi og dokumenter underveis, eller bare årsrapport?',
        ],
      },
    ],
    faqs: [
      { q: 'Hvor mye tar utleiemegleren i provisjon?', a: 'Normalt 8–12 % av brutto husleie per måned. For en bolig med 15 000 kr i månedsleie betyr det 1 200–1 800 kr i måneden, altså 14 400–21 600 kr i året. I tillegg kommer etableringshonorar hos de fleste aktører.' },
      { q: 'Hva koster utleiemegler totalt det første året?', a: 'For en bolig til 15 000 kr i måneden ligger totalen typisk mellom 22 000 og 37 000 kr hos tradisjonelle aktører, avhengig av prosentsats og etableringshonorar. DigiHomes selvforvaltning til 5 % uten oppstartskostnad gir 9 000 kr for samme bolig.' },
      { q: 'Er utleiemegler-honoraret fradragsberettiget på skatten?', a: 'Ja — ved skattepliktig utleie er forvaltningshonorar en fradragsberettiget kostnad, på linje med vedlikehold, forsikring og kommunale avgifter. Leier du ut skattefritt, for eksempel mindre enn halvparten av egen bolig, får du ikke fradrag.' },
      { q: 'Kan jeg forhandle på prisen?', a: 'Ofte, ja — særlig med flere utleieenheter eller lang horisont. Be alltid om totalpris for første år, ikke bare prosentsatsen, slik at etableringshonorar og tillegg kommer med i sammenligningen.' },
      { q: 'Hva er forskjellen på utleiemegling og utleieforvaltning?', a: 'Utleiemegling, altså formidling, er å finne og kontraktsfeste leietaker — vanligvis mot én månedsleie. Utleieforvaltning er den løpende driften etterpå: husleie, oppfølging, vedlikehold og regnskap. Mange aktører, inkludert DigiHome, tilbyr begge deler samlet.' },
      { q: 'Lønner det seg å bruke utleiemegler?', a: 'Regnestykket avhenger av tiden din og risikoen. Feil leiepris koster fort mer enn honoraret: 500 kr for lavt per måned er 6 000 kr i året, og en måneds tomgang koster en hel månedsleie. Profesjonell prissetting, rask utleie og trygg screening er det du egentlig betaler for.' },
      { q: 'Tar utleiemegleren provisjon av husleien eller av overskuddet?', a: 'Av brutto husleie. Prosentsatsen beregnes normalt av husleien før dine kostnader, og trekkes gjerne før leien overføres til deg. Det er derfor prosentsatsen alene ikke sier hva forvaltningen koster deg netto.' },
    ],
    author: AUTHOR,
    reviewer: REVIEWER,
    sources: [SSB_LMU, MEGLERSMART, UM24, METODE],
    related: ['utleiemegler-vs-selvforvaltning', 'leie-ut-leilighet-bergen', 'fradrag-utleiebolig'],
    cta: { label: 'Se hva utleien din vil koste', href: '/priskalkulator' },
  },

  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'utleiemegler-vs-selvforvaltning',
    metaTitle: 'Utleiemegler eller selvforvaltning? Slik velger du',
    title: 'Utleiemegler eller selvforvaltning — hva passer deg?',
    description: 'Sammenlign pris, tidsbruk, ansvar og risiko ved selvforvaltning og full utleieforvaltning. Se regnestykket, og hvem de to modellene faktisk passer for.',
    category: 'Rådgivning',
    readMinutes: 7,
    published: '2026-03-18',
    updated: '2026-08-05',
    image: '/interior-openplan.webp',
    imageAlt: 'Utleiebolig med profesjonell eller selvstendig forvaltning',
    keywords: ['selvforvaltning eller full forvaltning', 'utleiemegler vs selvforvaltning', 'leie ut selv eller bruke megler', 'full forvaltning utleie', 'selvforvaltning utleie'],
    entities: [ENT_UTLEIEMEGLER, ENT_HUSLEIELOVEN],
    answer: 'Selvforvaltning passer best når du ønsker kontroll, har tid til oppfølging og vil bruke digitale verktøy til kontrakt og oversikt. Full forvaltning passer når du vil overlate annonsering, visninger, leietakervalg, kontrakt, depositum og løpende drift til et profesjonelt team. Regn på totalen, ikke bare honoraret: en måneds tomgang tilsvarer omtrent 8 % av årsinntekten, og feil leiepris koster ofte mer enn forskjellen mellom modellene. DigiHomes selvforvaltning oppgis til 5 % av husleien; full forvaltning prises individuelt.',
    keyFacts: [
      '**Selvforvaltning:** lavere honorar, full kontroll — regn 20–40 timer på første utleie og løpende oppfølging etterpå.',
      '**Full forvaltning:** høyere honorar, men annonsering, visning, screening, kontrakt og drift er inkludert.',
      '**Regn på tomgang:** én tom måned tilsvarer ca. **8 %** av årsinntekten — mer enn årsprovisjonen hos de fleste.',
      '**DigiHome:** selvforvaltning **5 %** av husleien, full forvaltning etter individuelt tilbud.',
      '**Ingen bindingstid** i noen av modellene — du kan bytte når som helst.',
    ],
    sections: [
      {
        h2: 'Kort sammenligning',
        paragraphs: ['Valget handler ikke bare om pris. Regn også på tiden din, tilgjengelighet, juridisk ansvar, leietakerrisiko og hvor raskt du kan håndtere avvik.'],
        list: [
          'Selvforvaltning: lavere tjenestekostnad, høy kontroll og mer egen tidsbruk',
          'Full forvaltning: individuelt tilbud, mindre egen tidsbruk og profesjonell operativ oppfølging',
          'Begge modeller krever at avtalen, prismodellen og ansvarsfordelingen er tydelig før oppstart',
        ],
      },
      {
        h2: 'Hva koster alternativene?',
        paragraphs: [
          'Tradisjonelle utleiemeglere oppgir ofte etableringshonorar og et løpende prosent- eller månedsbasert honorar — se [hele prisbildet i prisguiden](/guider/hva-koster-utleiemegler). Selvforvaltning er vanligvis rimeligere fordi boligeieren gjør mer selv. Full forvaltning koster mer, men bør vurderes mot spart tid, raskere håndtering og redusert operativ risiko.',
          'DigiHome oppgir 5 % av husleien for selvforvaltning. Full forvaltning prises individuelt etter bolig, tjenesteomfang og marked. Be alltid om et skriftlig tilbud som viser hele førsteårskostnaden.',
        ],
      },
      {
        h2: 'Regnestykket de fleste glemmer',
        paragraphs: [
          'Honoraret er den synlige kostnaden. De usynlige er ofte større: tomgang, feil leiepris, en leietaker som ikke betaler, og din egen tid.',
          'Med 15 000 kr i månedsleie koster én tom måned 15 000 kr. Det er mer enn hele årsprovisjonen på 8 %. Er leieprisen satt 800 kr for lavt, taper du 9 600 kr i året — hvert år kontrakten løper. Det er disse to postene som avgjør hvilken modell som faktisk lønner seg, ikke prosentsatsen isolert.',
        ],
        list: [
          'Én måned tomgang: −15 000 kr',
          'Leiepris satt 800 kr for lavt: −9 600 kr per år',
          'Egen tidsbruk første utleie: 20–40 timer',
          '[Feil depositumshåndtering](/guider/depositumskonto): risiko for tilbakebetalingskrav med renter',
        ],
      },
      {
        h2: 'Når passer selvforvaltning?',
        list: [
          'Du ønsker kontroll over valg av leietaker og kommunikasjon',
          'Du har tid til visninger, spørsmål, vedlikehold og avvik',
          'Du kjenner [husleieloven](/guider/depositum-regler), depositumsreglene og [skattereglene](/guider/skatt-pa-utleie) — eller bruker gode systemer',
          'Du bor nær boligen eller har lokale samarbeidspartnere',
        ],
      },
      {
        h2: 'Når passer full forvaltning?',
        list: [
          'Du ønsker én profesjonell kontakt for hele leieforholdet',
          'Du bor langt unna eller har flere boliger',
          'Du vil slippe annonsering, visninger, screening og løpende leietakerkontakt',
          'Du verdsetter rask håndtering og dokumenterte prosesser mer enn lavest mulig honorar',
        ],
      },
      {
        h2: 'Kan du bytte modell senere?',
        paragraphs: [
          'Hos DigiHome er det ingen bindingstid, og mange starter med selvforvaltning for å bli kjent med prosessen før de går over til full forvaltning — eller motsatt, når de har fått rutine.',
          'Bytter du leverandør, avklar tre ting skriftlig før du signerer: hva som skjer med løpende leiekontrakter, hvem som eier dokumentasjonen og historikken, og hvilke oppsigelsesfrister som gjelder.',
        ],
      },
      {
        h2: 'Fem spørsmål før du bestemmer deg',
        list: [
          'Hvor mange timer vil du realistisk bruke per måned?',
          'Hvem svarer når noe skjer på kveld eller i ferie?',
          'Hvordan dokumenteres screening, kontrakt, depositum og kommunikasjon?',
          'Hva inngår i honoraret — og hvilke tillegg kan komme?',
          'Kan du bytte modell eller avslutte uten bindingstid?',
        ],
      },
    ],
    faqs: [
      { q: 'Er selvforvaltning alltid billigst?', a: 'Tjenesteprisen er vanligvis lavere, men verdien av egen tidsbruk, tomgang, feilprising og håndtering av konflikter må tas med i regnestykket. Én tom måned koster mer enn årsprovisjonen hos de fleste aktører.' },
      { q: 'Hva gjør en utleiemegler eller forvalter?', a: 'Omfanget varierer. Full forvaltning kan inkludere annonsering, visninger, screening, kontrakt, depositum, husleie, vedlikehold og kommunikasjon. Kontroller alltid hva tilbudet faktisk inkluderer.' },
      { q: 'Kan jeg starte selv og bytte til full forvaltning senere?', a: 'Ja, dersom avtalen og systemene tillater det. Hos DigiHome er det ingen bindingstid. Avklar overgang, data, dokumenter og eventuelle oppsigelsesfrister før du velger leverandør.' },
      { q: 'Hvem har det juridiske ansvaret?', a: 'Boligeieren har fortsatt et overordnet ansvar, også når oppgaver settes bort. En forvalter kan utføre og dokumentere oppgavene, men ansvarsfordelingen bør stå tydelig i avtalen.' },
      { q: 'Hvor mye tid krever selvforvaltning i praksis?', a: 'Regn 20–40 timer på første utleie: klargjøring, foto, annonse, visninger, screening, kontrakt og innflytting. Deretter kommer løpende oppfølging, som varierer mye med leietaker og boligens tilstand.' },
    ],
    author: AUTHOR,
    reviewer: REVIEWER,
    sources: [LOV_HLF, SSB_LMU, METODE],
    related: ['hva-koster-utleiemegler', 'leie-ut-leilighet-bergen', 'depositum-regler'],
    cta: { label: 'Sammenlign DigiHomes to modeller', href: '/bli-utleier/start' },
    disclaimer: true,
  },
];
