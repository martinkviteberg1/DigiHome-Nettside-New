// ---------------------------------------------------------------------------
// KONTRAKT-KLYNGEN
//
// «Husleiekontrakt» og «leiekontrakt mal» er blant de største informasjonssøkene
// i norsk utleie. Denne guiden dekker den informasjonelle intensjonen (krav,
// innhold, tidsbestemt vs. tidsubestemt, depositum) og funnel-er til det gratis
// verktøyet på /utleier/husleiekontrakt (transaksjonell intensjon).
//
// Juridisk innhold er skrevet mot husleieloven (lov 26. mars 1999 nr. 17) og
// Husleietvistutvalgets anbefalinger. Tall og paragrafer er hedget der loven har
// unntak — vi lenker til Lovdata for den fulle teksten.
// ---------------------------------------------------------------------------

const AUTHOR = { name: 'Sarah Sleeman', role: 'Daglig leder og eiendomsmegler', url: '/om-oss' };
const REVIEWER = { type: 'Organization', name: 'DigiHome fagredaksjon', role: 'Juridisk kildesjekk', url: '/metode' };

const LOV_HLF = { label: 'Lovdata: husleieloven', url: 'https://lovdata.no/lov/1999-03-26-17' };
const HTU = { label: 'Husleietvistutvalget (HTU)', url: 'https://www.htu.no/' };
const FORBRUKER = { label: 'Forbrukerrådet: leiekontrakt', url: 'https://www.forbrukerradet.no/forside/bolig/leie-av-bolig/' };

const ENT_HUSLEIELOVEN = { name: 'Husleieloven', sameAs: 'https://lovdata.no/lov/1999-03-26-17' };
const ENT_HTU = { name: 'Husleietvistutvalget', sameAs: 'https://www.htu.no/' };
const ENT_DEPOSITUM = { name: 'Depositum', sameAs: 'https://no.wikipedia.org/wiki/Depositum' };

export const kontraktGuides = [
  {
    slug: 'skrive-husleiekontrakt',
    metaTitle: 'Husleiekontrakt: krav, innhold og gratis mal (2026)',
    title: 'Slik skriver du en husleiekontrakt – krav, innhold og mal',
    description: 'Hva må en husleiekontrakt inneholde, må den være skriftlig, og hva sier husleieloven om varighet, oppsigelse og depositum? Komplett guide – og en gratis mal du kan signere med BankID.',
    category: 'Kontrakt',
    readMinutes: 8,
    published: '2026-09-10',
    updated: '2026-09-10',
    image: '/interior-dining.webp',
    imageAlt: 'Utleiebolig – hva en husleiekontrakt må inneholde',
    keywords: ['husleiekontrakt', 'husleiekontrakt mal', 'leiekontrakt mal', 'hvordan skrive husleiekontrakt', 'krav til husleiekontrakt', 'standard husleiekontrakt', 'leieavtale mal', 'gratis husleiekontrakt'],
    entities: [ENT_HUSLEIELOVEN, ENT_HTU, ENT_DEPOSITUM],
    answer: 'En husleiekontrakt bør inneholde partene, boligen som leies ut, husleien og hva som er inkludert, depositum, startdato, om avtalen er tidsbestemt eller tidsubestemt, og oppsigelsestid. Kontrakten trenger ikke være skriftlig for å være gyldig, men etter husleieloven § 1-4 kan begge parter kreve skriftlig avtale – og skriftlig er alltid tryggest ved en tvist. Depositum kan være inntil seks måneders leie og skal stå på en sperret depositumskonto i leietakers navn. Med DigiHome lager du en gratis, juridisk gyldig kontrakt på noen minutter og signerer med BankID.',
    keyFacts: [
      '**Skriftlig:** ikke lovpålagt, men hver part kan kreve det (husleieloven § 1-4) – og skriftlig er tryggest.',
      '**Må med:** parter, leieobjekt, husleie, hva som er inkludert, depositum, startdato, varighet og oppsigelse.',
      '**Depositum:** maksimalt **6 måneders leie**, på sperret [depositumskonto](/guider/depositumskonto) i leietakers navn (§ 3-5).',
      '**Tidsbestemt:** som hovedregel minst **3 år** (§ 9-3), med lovbestemte unntak for bl.a. utleie av del av egen bolig.',
      '**Tidsubestemt:** løper til den sies opp – standard oppsigelsestid er **3 måneder** (§ 9-6) om ikke annet er avtalt.',
      '**BankID-signering** har samme rettslige verdi som en håndskrevet underskrift.',
    ],
    sections: [
      {
        h2: 'Må en husleiekontrakt være skriftlig?',
        paragraphs: [
          'Nei – en muntlig leieavtale er i utgangspunktet like bindende som en skriftlig. Men etter husleieloven § 1-4 kan hver av partene kreve at avtalen settes opp skriftlig. I praksis bør du alltid ha en skriftlig kontrakt: den dokumenterer hva som er avtalt om leie, depositum, varighet og vedlikehold, og er avgjørende hvis det oppstår en tvist i [Husleietvistutvalget](https://www.htu.no/).',
          'En skriftlig kontrakt beskytter begge parter. For utleier gjør den det enklere å kreve inn leie og håndtere mislighold; for leietaker sikrer den forutsigbarhet om leienivå og oppsigelse.',
        ],
      },
      {
        h2: 'Hva må en husleiekontrakt inneholde?',
        paragraphs: [
          'En god husleiekontrakt trenger ikke være komplisert, men den bør dekke disse punktene tydelig:',
        ],
        list: [
          '**Partene:** fullt navn og fødselsnummer/organisasjonsnummer og kontaktinformasjon for utleier og leietaker.',
          '**Leieobjektet:** adresse, hva som leies (hele boligen, en del, møblert/umøblert), og tilgang til bod, parkering og fellesarealer.',
          '**Husleien:** beløp per måned, forfallsdato, kontonummer, og hva som er inkludert (strøm, oppvarming, internett, kommunale avgifter).',
          '**Depositum eller garanti:** beløp (maks 6 måneders leie) og at det settes på en sperret depositumskonto i leietakers navn.',
          '**Varighet:** startdato, og om avtalen er tidsbestemt (sluttdato) eller tidsubestemt.',
          '**Oppsigelse:** oppsigelsestid og oppsigelsesvern etter husleieloven.',
          '**Husordensregler og vedlikehold:** hvem som har ansvar for hva, og regler for røyking, dyrehold og fremleie.',
          '**Overtakelse:** gjerne en overtakelsesprotokoll med daterte bilder av boligens tilstand ved innflytting.',
        ],
      },
      {
        h2: 'Tidsbestemt eller tidsubestemt leieavtale?',
        paragraphs: [
          'En **tidsubestemt** avtale løper til den blir sagt opp. Med mindre annet er avtalt, er oppsigelsestiden tre måneder regnet fra utløpet av en kalendermåned (husleieloven § 9-6). Leietaker har oppsigelsesvern, og utleier må ha en saklig grunn for å si opp.',
          'En **tidsbestemt** avtale har en fast sluttdato. Hovedregelen er at en tidsbestemt avtale må være på minst tre år (§ 9-3). Loven gjør likevel unntak – blant annet når du leier ut en del av din egen bolig, eller når du selv skal bruke boligen eller har en annen saklig grunn. Da kan kortere tid avtales, men grunnen må opplyses skriftlig i kontrakten. Gjør du ikke det, kan avtalen bli regnet som tidsubestemt.',
          'Er du i tvil om hvilken form som passer, les mer om reglene på [Lovdata](https://lovdata.no/lov/1999-03-26-17), eller bruk DigiHomes gratis kontrakt der du velger avtaletype og får riktige bestemmelser satt inn automatisk.',
        ],
      },
      {
        h2: 'Depositum og depositumskonto',
        paragraphs: [
          'Depositum er en sikkerhet for skyldig leie og eventuelle skader ved utflytting. Etter husleieloven § 3-5 kan depositumet være inntil seks måneders leie, og det skal settes på en egen sperret [depositumskonto](/guider/depositumskonto) i leietakers navn – ikke på utleiers egen konto. Utleier dekker kostnaden med å opprette kontoen, og rentene tilfaller leietaker.',
          'Ved utflytting frigis depositumet etter avtale, eller etter reglene i loven dersom partene er uenige. Les mer om [beløp og regler for depositum](/guider/depositum-regler) og hva som skjer [ved tilbakebetaling](/guider/depositum-tilbakebetaling).',
        ],
      },
      {
        h2: 'Husleie, betaling og økning',
        paragraphs: [
          'Avtal et konkret leiebeløp, forfallsdato og betalingsmåte. Leien kan justeres på to måter i leieperioden: én gang i året etter konsumprisindeksen (KPI) med minst én måneds skriftlig varsel (§ 4-2), og tidligst etter to og et halvt år kan leien tilpasses «gjengs leie» for tilsvarende boliger (§ 4-3).',
          'Sett ikke leien for lavt av frykt for tomgang – men husk at feil pris koster begge veier. Se dagens nivåer i [leiemarkedsrapporten](/leiemarkedet), og les mer om [lovlig husleieøkning](/guider/husleieokning).',
        ],
      },
      {
        h2: 'Vanlige feil å unngå',
        list: [
          'Depositum på utleiers egen konto i stedet for sperret depositumskonto – dette er i strid med loven.',
          'Tidsbestemt avtale under tre år uten å oppgi en lovlig grunn skriftlig.',
          'Uklart hva som er inkludert i leien (strøm, oppvarming, internett) – en vanlig kilde til konflikt.',
          'Ingen overtakelsesprotokoll med bilder – gjør oppgjøret ved utflytting vanskelig.',
          'Manglende signatur fra begge parter. Med BankID er signeringen dokumentert og gyldig.',
        ],
      },
      {
        h2: 'Slik lager du en gratis husleiekontrakt med DigiHome',
        paragraphs: [
          'Du trenger ikke en dyr mal eller en advokat for en trygg kontrakt. Med DigiHome fyller du inn boligen, leietaker og vilkår, ser kontrakten ta form mens du skriver, og signerer med BankID – helt gratis. Søker du opp adressen, henter vi matrikkel og seksjon fra Eiendomsregisteret, slik at detaljene fylles inn automatisk.',
          'Leietakeren slipper å laste ned en app: de får en lenke på e-post og signerer med sin egen BankID. Begge parter får kontrakten som PDF. Vil du senere ha depositumskonto, husleieinnkreving eller KPI-regulering, kan du legge det til – men å lage og signere kontrakten er alltid gratis.',
        ],
      },
    ],
    howTo: {
      name: 'Slik lager du en husleiekontrakt',
      totalTime: 'PT5M',
      steps: [
        { name: 'Fyll inn boligen', text: 'Søk opp adressen slik at matrikkel og seksjon hentes fra Eiendomsregisteret, og fyll inn boligtype, størrelse og møblering.' },
        { name: 'Legg til leietaker', text: 'Registrer leietakerens navn og e-post. For flere leietakere legger du dem inn som parter i avtalen.' },
        { name: 'Sett vilkårene', text: 'Velg tidsbestemt eller tidsubestemt avtale, leiebeløp, forfallsdato, hva som er inkludert, depositum og oppsigelsestid.' },
        { name: 'Se gjennom kontrakten', text: 'Kontrakten fyller seg selv ut mens du skriver. Legg til egne bestemmelser der du trenger det, og les gjennom.' },
        { name: 'Signer med BankID', text: 'Du signerer med BankID. Leietaker får en lenke på e-post og signerer med sin egen BankID. Begge får PDF-en.' },
      ],
    },
    faqs: [
      { q: 'Må en husleiekontrakt være skriftlig for å være gyldig?', a: 'Nei, en muntlig avtale er også bindende. Men etter husleieloven § 1-4 kan hver part kreve skriftlig kontrakt, og skriftlig er alltid tryggest ved en eventuell tvist.' },
      { q: 'Hva må en husleiekontrakt inneholde?', a: 'Partene, leieobjektet (adresse), husleien og hva som er inkludert, depositum, startdato, om avtalen er tidsbestemt eller tidsubestemt, og oppsigelsestid. En overtakelsesprotokoll med bilder anbefales i tillegg.' },
      { q: 'Hvor mye kan jeg kreve i depositum?', a: 'Inntil seks måneders leie (husleieloven § 3-5). Depositumet skal stå på en sperret depositumskonto i leietakers navn, ikke på utleiers egen konto.' },
      { q: 'Kan jeg lage en tidsbestemt kontrakt på under tre år?', a: 'Hovedregelen er minst tre år, men loven har unntak – for eksempel når du leier ut en del av egen bolig eller selv skal bruke boligen. Grunnen må da opplyses skriftlig i kontrakten, ellers kan avtalen regnes som tidsubestemt.' },
      { q: 'Er en husleiekontrakt signert med BankID gyldig?', a: 'Ja. En elektronisk signatur med BankID har samme rettslige verdi som en håndskrevet underskrift.' },
      { q: 'Koster det noe å lage en husleiekontrakt hos DigiHome?', a: 'Nei. Å lage og signere husleiekontrakten med BankID er gratis. Du betaler først hvis du vil ha depositumskonto, husleieinnkreving eller selvforvaltning – og det er alltid valgfritt.' },
    ],
    author: AUTHOR,
    reviewer: REVIEWER,
    sources: [LOV_HLF, HTU, FORBRUKER],
    related: ['depositum-regler', 'depositumskonto', 'husleieokning'],
    cta: { label: 'Lag gratis husleiekontrakt', href: '/utleier/husleiekontrakt' },
  },
];
