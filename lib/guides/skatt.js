// ---------------------------------------------------------------------------
// SKATT-KLYNGEN
//
// Datagrunnlag (Search Console, 2026-05-04 → 2026-08-02):
//   /guider/skatt-pa-utleie: 780 visninger, 4 klikk, CTR 0,5 %, pos 23,7.
//   «skatt på utleie» 50 visn / pos 41,2 · «leieinntekter» 30 visn / pos 61,3
//   «avskrivning utleiebolig» 21 visn / pos 41,0
//   «fradrag utleie sekundærbolig» 16 visn / pos 40,3
//   «skatt airbnb sekundærbolig» 18 visn / pos 10,0
// Fradrag/avskrivning rangerte på posisjon 40+ fordi temaet bare var en
// punktliste inne i hovedguiden. Det har fått egen, dyp side.
// ---------------------------------------------------------------------------

const AUTHOR = { name: 'Sarah Sleeman', role: 'Daglig leder og eiendomsmegler', url: '/om-oss' };
const REVIEWER = { type: 'Organization', name: 'DigiHome fagredaksjon', role: 'Skattefaglig kildesjekk', url: '/metode' };

const SKATT_UTLEIE = { label: 'Skatteetaten: skatt ved utleie av bolig og fritidseiendom', url: 'https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/bolig-eiendom-tomt/utleie/' };
const SKATT_KORTTID = { label: 'Skatteetaten: korttidsutleie av bolig og fritidseiendom', url: 'https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/bolig-eiendom-tomt/utleie/korttidsutleie-av-bolig-og-fritidseiendom/' };
const SKATT_VEDLIKEHOLD = { label: 'Skatteetaten: vedlikehold og påkostning', url: 'https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/bolig-eiendom-tomt/utleie/vedlikehold-eller-pakostning/' };
const METODE = { label: 'DigiHome: metode og forbehold', url: '/metode' };

const ENT_SKATTEETATEN = { name: 'Skatteetaten', sameAs: 'https://www.skatteetaten.no/' };
const ENT_SKATTELOVEN = { name: 'Skatteloven', sameAs: 'https://lovdata.no/lov/1999-03-26-14' };
const ENT_LEIEINNTEKT = { name: 'Leieinntekt', sameAs: 'https://no.wikipedia.org/wiki/Husleie' };

export const skattGuides = [
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'skatt-pa-utleie',
    metaTitle: 'Skatt på utleie 2026: når er leieinntekt skattefri?',
    title: 'Skatt på utleie av bolig: slik fungerer reglene',
    description: 'Når er leieinntekten skattefri, og når betaler du 22 %? Se grensene for egen bolig, sekundærbolig og korttidsutleie — med regneeksempler og fradrag.',
    category: 'Skatt',
    readMinutes: 8,
    published: '2026-03-18',
    updated: '2026-08-05',
    image: '/interior-living.webp',
    imageAlt: 'Stue i utleiebolig — oversikt over skattereglene',
    keywords: ['skatt på utleie', 'skatt utleie bolig', 'leieinntekter', 'skattefri utleie', 'skatt airbnb sekundærbolig', 'skatt leieinntekt sekundærbolig'],
    entities: [ENT_SKATTEETATEN, ENT_SKATTELOVEN, ENT_LEIEINNTEKT],
    spokes: ['fradrag-utleiebolig'],
    answer: 'Skatt på utleie avhenger av boligtypen: (1) Leier du ut mindre enn halvparten av boligen du selv bor i, målt i utleieverdi, er inntekten skattefri. (2) Leier du ut hele eller mer enn halvparten av egen bolig, er inntekten skattefri opptil 20 000 kr per år — overskrides grensen, skattlegges alt fra første krone. (3) Utleie av sekundærbolig beskattes som kapitalinntekt: 22 % av overskuddet etter fradrag. (4) Korttidsutleie av egen bolig, med leieforhold under 30 dager, følger en sjablongregel: 10 000 kr skattefritt, deretter skattlegges 85 % av det overskytende.',
    keyFacts: [
      '**Utleiedel i egen bolig:** skattefritt når utleiedelen har lavere utleieverdi enn den du selv bor i.',
      '**Hele egen bolig:** skattefritt opptil **20 000 kr** i året — over grensen skattlegges alt.',
      '**Sekundærbolig:** **22 %** av overskuddet, altså leie minus [fradragsberettigede kostnader](/guider/fradrag-utleiebolig).',
      '**Korttidsutleie av egen bolig:** 10 000 kr skattefritt, deretter skattlegges **85 %** av det overskytende.',
      '**Fem eller flere enheter** brukes ofte som praktisk indikator på næringsvirksomhet — men det er en helhetsvurdering.',
    ],
    sections: [
      {
        h2: 'Hvordan beskattes leieinntekter? Kort oversikt',
        paragraphs: [
          'Alle leieinntekter i Norge faller inn under én av fire situasjoner. Finn din situasjon først — da blir resten av regelverket enkelt.',
        ],
        list: [
          '**Utleiedel i boligen du selv bor i, lavere utleieverdi enn din egen del:** skattefritt, uten beløpsgrense',
          '**Hele eller mer enn halvparten av egen bolig:** skattefritt opptil 20 000 kr per år. Over grensen skattlegges hele beløpet',
          '**Sekundærbolig eller ren utleiebolig:** alltid skattepliktig kapitalinntekt, 22 % av overskuddet',
          '**Korttidsutleie av egen bolig (under 30 dager per leieforhold):** 10 000 kr skattefritt, deretter skattlegges 85 % av det overskytende',
        ],
      },
      {
        h2: 'Skattefri utleie i egen bolig',
        paragraphs: [
          'Hovedregelen mange nyter godt av: leier du ut mindre enn halvparten av din egen bolig — målt i utleieverdi, ikke kvadratmeter — er leieinntekten helt skattefri. En typisk utleiedel eller sokkelleilighet i eneboligen faller ofte inn her.',
          'At det er utleieverdien som gjelder, har praktisk betydning. En stor kjellerleilighet med lav standard kan ha lavere utleieverdi enn en mindre hoveddel med bedre lys og planløsning, selv om arealet er større. Er utleiedelen ikke godkjent for varig opphold, bør du dessuten lese guiden om [godkjent utleiedel](/guider/godkjent-utleiedel) før du leier ut.',
          'Leier du ut mer enn halvparten eller hele boligen din, for eksempel mens du er bortreist, er inntekten skattefri bare hvis den ikke overstiger 20 000 kr i inntektsåret. Går du over grensen, blir hele beløpet skattepliktig — fra første krone.',
        ],
      },
      {
        h2: 'Sekundærbolig: 22 % av overskuddet',
        paragraphs: [
          'Utleie av bolig du ikke selv bor i, altså sekundærbolig eller ren utleiebolig, er alltid skattepliktig kapitalinntekt. Skattesatsen er 22 %, men den beregnes av overskuddet — leieinntektene minus fradragsberettigede kostnader.',
          'Regneeksempel: 15 000 kr i månedsleie gir 180 000 kr i årlige leieinntekter. Trekker du fra 12 000 kr i kommunale avgifter, 6 000 kr i forsikring, 18 000 kr i vedlikehold og 10 800 kr i forvaltningshonorar, er overskuddet 133 200 kr. Skatten blir 22 % av dette, altså 29 304 kr.',
          'Fradragene er derfor ikke en detalj — de flytter skatten direkte. Hele oversikten står i egen guide: [fradrag ved utleie av bolig](/guider/fradrag-utleiebolig).',
        ],
        list: [
          'Vedlikehold, men ikke påkostning eller standardheving',
          'Kommunale avgifter, eiendomsskatt og festeavgift',
          'Forsikring av boligen',
          'Forvaltningshonorar og utleiemegler-kostnader — se [hva utleiemegler koster](/guider/hva-koster-utleiemegler)',
          'Møbler: kostnader inntil 15 000 kr kan som regel fradragsføres direkte, dyrere innbo avskrives',
          'Annonsering, reisekostnader ved tilsyn og gebyr for [depositumskonto](/guider/depositumskonto)',
        ],
      },
      {
        h2: 'Korttidsutleie av egen bolig (Airbnb-regelen)',
        paragraphs: [
          'For leieforhold i egen bolig som varer under 30 dager gjelder en egen sjablongmetode: de første 10 000 kr per år er skattefrie, og av det overskytende regnes 85 % som skattepliktig kapitalinntekt med 22 % skatt.',
          'Eksempel: tjener du 60 000 kr på korttidsutleie av egen bolig i løpet av året, er de første 10 000 kr skattefrie. Av de resterende 50 000 kr skattlegges 85 % — altså 42 500 kr — som gir 9 350 kr i skatt.',
          'Korttidsutleie av sekundærbolig følger derimot de vanlige reglene for skattepliktig utleie, uten sjablongfradraget. Da er det ordinært overskudd som skattlegges, og du fører faktiske kostnader som fradrag. Ved omfattende korttidsutleie kan aktiviteten dessuten bli regnet som næringsvirksomhet.',
          'Husk også at skatt bare er halve bildet ved korttidsutleie: eierform og vedtekter setter grenser for hvor mange døgn du kan leie ut. Se [reglene for Airbnb og korttidsutleie](/guider/korttidsutleie-regler).',
        ],
      },
      {
        h2: 'Når blir utleie næringsvirksomhet?',
        paragraphs: [
          'Skattemyndighetene gjør en helhetsvurdering av om utleie er næringsvirksomhet. Utleie av fem eller flere boenheter brukes ofte som en praktisk tommelfingerregel, men er ikke en automatisk lovgrense. Omfang, aktivitetsnivå, varighet og risiko teller også, og omfattende korttidsutleie kan bli vurdert som næring med færre enheter.',
          'Konsekvensen er betydelig: i næring beskattes overskuddet som virksomhetsinntekt med trinnskatt og trygdeavgift i tillegg, men du får samtidig et bredere fradragsrom og andre avskrivningsregler. Nærmer du deg denne grensen, bør du få det vurdert av regnskapsfører før du utvider porteføljen.',
        ],
      },
      {
        h2: 'Rapportering i skattemeldingen',
        paragraphs: [
          'Skattepliktig utleie rapporteres i skattemeldingen med inntekter og kostnader per bolig. Ta vare på kvitteringer for alt vedlikehold og alle kostnader — dokumentasjonen er gull verdt både for fradrag og ved eventuell kontroll.',
          'Digitale utleieplattformer har rapporteringsplikt til norske skattemyndigheter. Inntekter fra korttidsutleie blir derfor kjent for Skatteetaten uavhengig av hva du selv fører opp, så sørg for at skattemeldingen stemmer.',
          'Hos DigiHome får du komplette årsoppgaver over leieinntekter og kostnader, klare til skattemeldingen — en del av både selvforvaltning og full forvaltning.',
        ],
      },
    ],
    faqs: [
      { q: 'Er leieinntekt fra sokkelleilighet i egen enebolig skattefri?', a: 'Ja, som hovedregel — hvis utleiedelen har lavere utleieverdi enn den delen du selv bor i. Det er utleieverdien, ikke arealet, som avgjør. Kontroller alltid den konkrete situasjonen mot Skatteetatens gjeldende veiledning.' },
      { q: 'Hvor mye skatt betaler jeg på leieinntekter fra sekundærbolig?', a: '22 % av overskuddet, altså leieinntektene minus fradragsberettigede kostnader. Har du 180 000 kr i leie og 46 800 kr i fradragsberettigede kostnader, blir skatten 22 % av 133 200 kr — 29 304 kr.' },
      { q: 'Kan jeg trekke fra oppussing før utleie?', a: 'Vedlikehold, altså tilbakeføring til tidligere stand, er fradragsberettiget ved skattepliktig utleie. Påkostning som hever standarden er ikke fradragsberettiget, men legges til inngangsverdien. Går boligen fra skattefri til skattepliktig utleie, gjelder egne begrensninger — se guiden om fradrag.' },
      { q: 'Hva med utleie av fritidsbolig?', a: 'Egen fritidsbolig du selv bruker: 10 000 kr skattefritt per år, deretter skattlegges 85 % av det overskytende — samme sjablong som korttidsutleie av egen bolig. Ren utleiehytte beskattes fullt ut som kapitalinntekt.' },
      { q: 'Rapporterer Airbnb inntektene mine til Skatteetaten?', a: 'Ja. Digitale utleieplattformer har rapporteringsplikt til norske skattemyndigheter, så inntektene dine blir kjent for Skatteetaten uavhengig av hva du selv oppgir. Sørg for at skattemeldingen stemmer.' },
      { q: 'Blir hele beløpet skattepliktig hvis jeg går over 20 000 kr?', a: 'Ja. Ved utleie av hele eller mer enn halvparten av egen bolig er 20 000 kr en terskel, ikke et bunnfradrag. Tjener du 21 000 kr, skattlegges hele beløpet — ikke bare de 1 000 kronene over grensen.' },
      { q: 'Må jeg betale skatt på depositumet jeg mottar?', a: 'Nei. Depositum er leietakers penger som står på egen konto og er ikke inntekt for deg. Trekker du senere skyldig husleie fra depositumet, er det den husleien som er skattepliktig inntekt.' },
    ],
    author: AUTHOR,
    reviewer: { name: 'DigiHome fagredaksjon', role: 'Skattefaglig kildesjekk', url: '/metode' },
    sources: [SKATT_UTLEIE, SKATT_KORTTID, SKATT_VEDLIKEHOLD, METODE],
    related: ['fradrag-utleiebolig', 'korttidsutleie-regler', 'hva-koster-utleiemegler'],
    cta: { label: 'Få orden på utleieøkonomien', href: '/bli-utleier' },
    disclaimer: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'fradrag-utleiebolig',
    metaTitle: 'Fradrag ved utleie 2026: full liste + avskrivning',
    title: 'Fradrag ved utleie av bolig: full liste og avskrivningsreglene',
    description: 'Hva kan du trekke fra på leieinntektene? Se komplett fradragsliste for utleiebolig, grensen mellom vedlikehold og påkostning, og når du kan avskrive.',
    category: 'Skatt',
    readMinutes: 8,
    published: '2026-08-05',
    updated: '2026-08-05',
    image: '/interior-kitchen.webp',
    imageAlt: 'Oppusset kjøkken i utleiebolig — vedlikehold eller påkostning?',
    keywords: ['fradrag utleie sekundærbolig', 'avskrivning utleiebolig', 'fradrag utleiebolig', 'leieinntekter fradrag', 'vedlikehold eller påkostning', 'hva kan jeg trekke fra på utleie'],
    entities: [ENT_SKATTEETATEN, ENT_SKATTELOVEN],
    pillar: 'skatt-pa-utleie',
    answer: 'Ved skattepliktig utleie kan du trekke fra alle kostnader som knytter seg til utleien: vedlikehold, kommunale avgifter, eiendomsskatt, forsikring, forvaltningshonorar, annonsering, felleskostnader du selv dekker, og møbler eller inventar under 15 000 kr. Påkostning som hever standarden er ikke fradragsberettiget, men legges til boligens inngangsverdi og reduserer gevinstskatten ved et senere salg. Selve boligbygningen kan ikke avskrives, men inventar og løsøre over 15 000 kr med minst tre års levetid avskrives normalt med 20 % årlig saldoavskrivning.',
    keyFacts: [
      '**Forutsetning:** fradrag gis bare ved **skattepliktig** utleie — ikke ved skattefri utleie i egen bolig.',
      '**Vedlikehold:** fradragsberettiget. **Påkostning:** ikke fradrag, men øker inngangsverdien.',
      '**Møbler under 15 000 kr:** direkte fradrag samme år.',
      '**Inventar over 15 000 kr** med minst tre års levetid: avskrives normalt **20 %** per år.',
      '**Boligbygningen avskrives ikke** ved ordinær kapitalinntektsutleie.',
    ],
    sections: [
      {
        h2: 'Når har du krav på fradrag?',
        paragraphs: [
          'Fradragsretten følger skatteplikten. Er leieinntekten skattefri — typisk en utleiedel med lavere utleieverdi enn den delen du selv bor i — får du ingen fradrag for kostnader knyttet til utleien. Er inntekten skattepliktig, kan du trekke fra kostnadene som har med utleien å gjøre.',
          'Det gjelder både [sekundærbolig og ren utleiebolig](/guider/skatt-pa-utleie), og situasjoner der utleie av egen bolig blir skattepliktig fordi du går over 20 000-kronersgrensen. Ved delvis skattepliktig utleie fordeles kostnadene forholdsmessig.',
        ],
      },
      {
        h2: 'Komplett fradragsliste for utleiebolig',
        paragraphs: [
          'Dette er kostnadene norske utleiere oftest kan føre. Alle må dokumenteres med kvittering eller faktura, og de må knytte seg til den skattepliktige utleien.',
        ],
        list: [
          '**Vedlikehold:** maling, sparkling, utskifting av slitte deler, service på varmepumpe, tetting av lekkasje',
          '**Kommunale avgifter:** vann, avløp, renovasjon og feiing',
          '**Eiendomsskatt** og eventuell festeavgift',
          '**Forsikring** av boligen, og innboforsikring for møblert utleie',
          '**Felleskostnader** du selv dekker, med unntak av den delen som er nedbetaling av fellesgjeld',
          '**Forvaltningshonorar** til utleiemegler eller forvalter — se [hva utleiemegler koster](/guider/hva-koster-utleiemegler)',
          '**Annonsering** og fotografering av boligen',
          '**Møbler og inventar** med kostpris under 15 000 kr: direkte fradrag samme år',
          '**Gebyr for [depositumskonto](/guider/depositumskonto)** og andre bankgebyrer knyttet til utleien',
          '**Reisekostnader** ved tilsyn og vedlikehold, innenfor rimelige rammer',
          '**Regnskaps- og rådgivningskostnader** knyttet til utleien',
          '**Strøm, internett og oppvarming** når dette er inkludert i leien',
          '**Gjeldsrenter** på lån knyttet til boligen — føres som ordinært rentefradrag, ikke i utleieregnskapet',
        ],
      },
      {
        h2: 'Vedlikehold eller påkostning? Den viktigste grensen',
        paragraphs: [
          'Dette er der mest penger vinnes og tapes. Vedlikehold gir fradrag i år. Påkostning gir ikke fradrag, men legges til boligens inngangsverdi og reduserer gevinstskatten hvis du selger med fortjeneste. Forskjellen ligger i om du fører boligen tilbake til tidligere stand eller hever standarden.',
          'Ved utskifting til høyere standard deles kostnaden: den delen som tilsvarer å gjenopprette samme standard er vedlikehold, resten er påkostning. Bytter du et 25 år gammelt bad til samme standard, er hele kostnaden vedlikehold. Bytter du til betydelig høyere standard, må kostnaden fordeles.',
        ],
        list: [
          '**Vedlikehold:** male om, bytte slitt gulvbelegg til tilsvarende, reparere kjøkkeninnredning, skifte defekt vindu til tilsvarende',
          '**Påkostning:** nytt bad der det ikke var bad, tilbygg, oppgradering fra enkel til høy standard, ny terrasse',
          '**Delt:** utskifting til klart høyere standard — vedlikeholdsdelen gis fradrag, standardhevingen legges til inngangsverdien',
          'Ta vare på bilder av tilstanden før arbeidet — det er dokumentasjonen som avgjør i en kontroll',
        ],
      },
      {
        h2: 'Avskrivning: hva kan avskrives og hva kan ikke?',
        paragraphs: [
          'Avskrivning betyr at du fordeler kostnaden for et driftsmiddel over flere år i stedet for å ta hele fradraget umiddelbart. For utleiere er reglene kortere enn mange tror.',
          'Selve boligbygningen kan ikke avskrives ved ordinær utleie som beskattes som kapitalinntekt. Boliger anses ikke å ha den typen verdifall som gir avskrivningsrett, og dette gjelder uavhengig av hvor gammel boligen er.',
          'Inventar og løsøre er en annen sak. Har et driftsmiddel kostpris på 15 000 kr eller mer og en forventet brukstid på minst tre år, skal det normalt saldoavskrives — for inventar som møbler og hvitevarer med 20 % årlig. Er kostprisen lavere enn 15 000 kr, eller brukstiden kortere enn tre år, tas hele kostnaden som fradrag samme år.',
          'Drives utleien som næringsvirksomhet, gjelder et bredere sett avskrivningsregler, blant annet for bygg som ikke er bolig og for faste tekniske installasjoner. Nærmer du deg næringsgrensen, bør du få dette vurdert konkret av regnskapsfører.',
        ],
        list: [
          '**Kan ikke avskrives:** boligbygningen ved kapitalinntektsutleie',
          '**Avskrives 20 % saldo:** møbler, hvitevarer og annet inventar med kostpris fra 15 000 kr og minst tre års brukstid',
          '**Direkte fradrag:** inventar under 15 000 kr, eller med brukstid under tre år',
          '**Tomt** avskrives aldri',
        ],
      },
      {
        h2: 'Fra skattefri til skattepliktig utleie: begrensningen i vedlikeholdsfradraget',
        paragraphs: [
          'Har du leid ut boligen skattefritt og går over til skattepliktig utleie, er ikke vedlikeholdsfradraget fullt fra dag én. Kostnader inntil 10 000 kr kan normalt fradragsføres i sin helhet. Beløp over dette reduseres for hvert av de siste fem årene boligen har vært brukt slik at leieinntekten var skattefri.',
          'Praktisk betyr det at det kan lønne seg å planlegge rekkefølgen: større vedlikehold som utføres etter at boligen har vært skattepliktig utleid en periode, gir bedre fradragseffekt enn samme arbeid utført rett i overgangen. Kontroller den konkrete beregningen mot Skatteetatens gjeldende veiledning.',
        ],
      },
      {
        h2: 'Dokumentasjon og rapportering',
        paragraphs: [
          'Utleieregnskapet føres per bolig i skattemeldingen, med leieinntekter og kostnader. Kravet er enkelt, men absolutt: alt du fører som fradrag skal kunne dokumenteres.',
        ],
        list: [
          'Ta vare på fakturaer og kvitteringer i minst fem år',
          'Skriv en kort note til hvert større arbeid: hva som ble gjort, og hvorfor det er vedlikehold',
          'Fotografer tilstanden før og etter arbeid',
          'Hold utleiekostnader og private kostnader i separate spor — gjerne egen konto for utleien',
          'Med [full forvaltning eller selvforvaltning i DigiHome](/guider/utleiemegler-vs-selvforvaltning) får du årsoppgave med inntekter og kostnader ferdig oppstilt',
        ],
      },
      {
        h2: 'Fem feil som koster penger',
        list: [
          'Glemmer kommunale avgifter, forsikring og felleskostnader — de utgjør ofte titusener i året',
          'Fører hele et badoppgraderingsprosjekt som vedlikehold uten å skille ut standardhevingen',
          'Kaster kvitteringer etter at skattemeldingen er levert',
          'Krever fradrag ved skattefri utleie — det gir ingen effekt, og skaper feil i meldingen',
          'Glemmer at påkostning fortsatt har verdi: den reduserer gevinstskatten ved salg hvis den dokumenteres',
        ],
      },
    ],
    faqs: [
      { q: 'Hva kan jeg trekke fra ved utleie av sekundærbolig?', a: 'Vedlikehold, kommunale avgifter, eiendomsskatt, forsikring, felleskostnader du dekker, forvaltningshonorar, annonsering, bankgebyrer knyttet til utleien, reisekostnader ved tilsyn og møbler under 15 000 kr. Gjeldsrenter føres som ordinært rentefradrag.' },
      { q: 'Kan jeg avskrive utleieboligen?', a: 'Nei. Selve boligbygningen kan ikke avskrives ved ordinær utleie som beskattes som kapitalinntekt. Inventar og løsøre med kostpris fra 15 000 kr og minst tre års brukstid avskrives normalt med 20 % årlig saldoavskrivning.' },
      { q: 'Hvor går grensen mellom vedlikehold og påkostning?', a: 'Vedlikehold fører boligen tilbake til tidligere stand og gir fradrag. Påkostning hever standarden og gir ikke fradrag, men legges til inngangsverdien. Ved utskifting til høyere standard deles kostnaden mellom de to.' },
      { q: 'Kan jeg trekke fra oppussing gjort før første leietaker flyttet inn?', a: 'Kostnader som er vedlikehold og knytter seg til den skattepliktige utleien kan normalt fradragsføres. Går boligen fra skattefri til skattepliktig utleie, gjelder en begrensning: beløp over 10 000 kr reduseres ut fra hvor mange av de siste fem årene utleien var skattefri.' },
      { q: 'Er forvaltningshonorar til utleiemegler fradragsberettiget?', a: 'Ja, ved skattepliktig utleie er forvaltningshonorar og utleiemeglerkostnader ordinære fradragsberettigede driftskostnader, på linje med forsikring og kommunale avgifter.' },
      { q: 'Får jeg fradrag for egen arbeidstid på utleieboligen?', a: 'Nei. Verdien av eget arbeid gir ikke fradrag. Materialkostnader ved vedlikehold du utfører selv er derimot fradragsberettiget, forutsatt kvittering.' },
      { q: 'Kan jeg trekke fra tap ved tomgang?', a: 'Tomgang gir ingen egen fradragspost, fordi det ikke er en kostnad — det er manglende inntekt. Løpende kostnader i tomgangsperioden, som forsikring og kommunale avgifter, er likevel fradragsberettigede når boligen er ment for skattepliktig utleie.' },
    ],
    author: AUTHOR,
    reviewer: REVIEWER,
    sources: [SKATT_UTLEIE, SKATT_VEDLIKEHOLD, METODE],
    related: ['skatt-pa-utleie', 'hva-koster-utleiemegler', 'godkjent-utleiedel'],
    cta: { label: 'Få årsoppgave og kostnadsoversikt automatisk', href: '/bli-utleier' },
    disclaimer: true,
  },
];
