// ---------------------------------------------------------------------------
// Avtale om selvforvaltning — innholdet som vises i skjemaet (AvtaleArk) og på
// /avtale/selvforvaltning. Én kilde, to visninger.
//
// VERSJON: `selvforvaltning-2026-09`. Versjons-ID-en lagres på leaden
// (lead.terms_accepted.version) og sendes plattformen som agreement.version
// (fri streng — plattformen validerer ikke mot en liste). Endres teksten
// materielt, skal ID-en bumpes, slik at vi alltid vet hvilken tekst en kunde
// faktisk godtok. Eldre kunder beholder sin versjon.
//
// MODELLEN (avklart med eier, speiler plattformens service_tier=self_service):
//   DigiHome står for annonsering (DigiHome er annonsør/kontakt på FINN),
//   leiekontrakt med BankID, pengehåndtering (fakturerer leie m/ KID til
//   klientkonto, purrer, betaler ut minus 5 %) og depositumskonto. Eier
//   selvforvalter det løpende leieforholdet i portalen (visning, valg av
//   leietaker, chat, saker, fornyelse, utflytting). Ny utleie går gjennom
//   DigiHome. Ingen minstepris, ingen bindingstid. Tillegg prises separat.
//
// Teksten er skrevet i klart språk og dekker det DigiHome trenger: fullmakt,
// klientkonto/utbetaling, inkasso-beslutninger hos eier, lovlig utleie,
// diskrimineringsvern, skatt/forsikring hos eier, databehandleravtale,
// ansvarsbegrensning, suspensjon, angrerett (angrerettloven) og verneting.
// Den bør likevel kvalitetssikres av advokat før den brukes i stor skala.
// ---------------------------------------------------------------------------

import { site } from '@/lib/site';

export const AVTALE_VERSJON = 'selvforvaltning-2026-09';

const PERSONVERN = 'digihome.no/personvern';
const SUPPORT = 'support@digihome.no';

export const avtaleSelvforvaltning = {
  id: AVTALE_VERSJON,
  tittel: 'Avtale om selvforvaltning',
  versjonTekst: 'Versjon 2026-09',
  undertittel: `Mellom deg som utleier og ${site.legalName}`,

  /* Det viktigste på tjue sekunder. Ikke juridisk bindende i seg selv — avtalen under gjelder. */
  kortFortalt: [
    { t: 'Pris', d: '5 % av innbetalt husleie, trukket før utbetaling. Ingen oppstartskostnad, ingen minstepris. Tilleggstjenester bestilles og prises for seg.' },
    { t: 'Bindingstid', d: 'Ingen. Si opp når du vil — avtalen løper ut måneden, og leieforholdet ditt påvirkes ikke.' },
    { t: 'Hva DigiHome gjør', d: 'Annonse på FINN, leiekontrakt med BankID, innkreving av husleie med purring, depositumskonto og utbetaling til deg — pluss portalen med chat, saker og dokumenter.' },
    { t: 'Hva du gjør', d: 'Du er utleier og part i leieavtalen. Du holder visninger, velger leietaker, følger opp leieforholdet og godkjenner alt som koster penger.' },
  ],

  seksjoner: [
    {
      n: '1', t: 'Partene og hvordan avtalen inngås',
      p: [
        `Avtalen inngås mellom ${site.legalName} (org.nr ${site.orgNr}), ${site.address.street}, ${site.address.postal} ${site.address.city} («DigiHome») og den som registrerer seg som utleier for selvforvaltning i DigiHome — en privatperson eller et selskap («du» eller «Utleier»).`,
        'Avtalen er bindende når du huker av for at du har lest og godtar den i registreringen. Aksepten, tidspunktet og avtaleversjonen lagres, og du får en kopi på e-post.',
        'Du må være over 18 år. Registrerer du på vegne av et selskap, bekrefter du at du har fullmakt til å binde selskapet, og selskapet blir part i avtalen.',
        `Avtalen består av denne teksten, personvernerklæringen på ${PERSONVERN}, gjeldende prisliste for tilleggstjenester og bestillinger du gjør i portalen. Ved motstrid går denne teksten foran.`,
      ],
    },
    {
      n: '2', t: 'Ord som brukes i avtalen',
      p: [],
      liste: [
        'Boligen: utleieenheten du registrerer i portalen. Avtalen gjelder per bolig — registrerer du flere, gjelder samme vilkår for hver av dem.',
        'Leieforholdet: avtalen mellom deg og leietaker etter husleieloven.',
        'Husleien: det leietaker skal betale per måned etter leieavtalen, inkludert faste tillegg som faktureres sammen med leien (for eksempel strøm eller internett når det inngår i leiebeløpet). Depositum er ikke husleie.',
        'Portalen: DigiHomes nettløsning og app der du og leietaker bruker tjenesten.',
        'Klientkontoen: bankkonto DigiHome disponerer for kundenes midler, holdt atskilt fra DigiHomes egne penger.',
      ],
    },
    {
      n: '3', t: 'Hva DigiHome gjør',
      p: [
        'Selvforvaltning betyr at du leier ut selv, med DigiHome som system, betalingsformidler og annonsør. DigiHome leverer:',
      ],
      liste: [
        'Annonsering: annonse for boligen på FINN.no (standardannonse) og digihome.no, med DigiHome som annonsør og kontaktpunkt. Henvendelser fra interessenter samles i portalen.',
        'Leiekontrakt: digital leiekontrakt etter husleieloven, med signering via BankID, lagret i portalen.',
        'Husleie: fakturering av husleien til leietaker med KID, registrering av innbetalinger, automatiske betalingsvarsler og purring.',
        'Utbetaling: husleien utbetales til bankkontoen din etter fradrag for honorar og eventuelle tillegg du har bestilt.',
        'Depositum: opprettelse av depositumskonto i bank i leietakers navn, slik husleieloven krever.',
        'Portalen: oversikt over leieforholdet, chat med leietaker, saker, dokumenter, historikk og økonomi.',
      ],
      etter: [
        'DigiHome er ikke part i leieforholdet, og treffer ingen beslutninger på dine vegne som koster deg penger, utover det som følger av denne avtalen (honorar og tillegg du selv har bestilt).',
      ],
    },
    {
      n: '4', t: 'Hva du gjør selv',
      p: [
        'Du er utleier etter husleieloven, med de rettighetene og pliktene det gir. Du står for det løpende leieforholdet:',
      ],
      liste: [
        'visninger og valg av leietaker (kreditt- og referansesjekk og visningshjelp kan bestilles som tillegg)',
        'innhold og riktighet i annonsen — tekst, bilder, pris, areal og hva som er inkludert',
        'innflytting, utflytting, nøkler og befaring',
        'vedlikehold, feilretting og oppfølging av saker fra leietaker — du velger leverandør og godkjenner kostnaden',
        'fornyelser, endringer, oppsigelser og eventuelle tvister med leietaker',
        'å svare leietaker innen rimelig tid og holde kontaktopplysningene dine oppdaterte',
      ],
      etter: [
        'DigiHome gir deg verktøy, varsler og forslag — ikke juridisk rådgivning. Er du usikker på leieavtalens innhold eller står i en konflikt, bør du søke egen rådgivning. Juridisk trygghetspakke kan bestilles som tillegg.',
      ],
    },
    {
      n: '5', t: 'Fullmakt',
      p: [
        'For å kunne levere tjenesten gir du DigiHome fullmakt til, i ditt navn og på dine vegne, å:',
      ],
      liste: [
        'publisere og administrere annonsen for boligen, og stå som annonsør og kontaktpunkt overfor FINN.no og andre kanaler',
        'sende leiekontrakten til signering og motta den signerte kontrakten',
        'fakturere og kreve inn husleien, motta betaling på klientkontoen, sende betalingsvarsler og purringer, og gi leietaker betalingsinformasjon',
        'opprette depositumskonto sammen med leietaker og bank, og be om utbetaling fra kontoen når husleielovens vilkår er oppfylt',
        'kommunisere med leietaker om betaling, kontrakt og praktiske forhold som gjelder tjenesten',
      ],
      etter: [
        'Fullmakten gjelder så lenge avtalen løper, og bare det som er nødvendig for å levere tjenesten. Du kan når som helst be DigiHome stanse en konkret handling. DigiHome inngår ikke nye leieavtaler, endrer ikke leien og sier ikke opp leietaker — det gjør du selv i portalen.',
      ],
    },
    {
      n: '6', t: 'Annonsering og ny utleie',
      p: [
        'DigiHome publiserer annonsen når du har fylt ut det som kreves og bekreftet innholdet. DigiHome kan rette åpenbare feil og tilpasse formatet til kanalen, og kan avslå eller fjerne en annonse som strider mot lov, kanalens regler eller god skikk — for eksempel diskriminerende krav til leietaker (likestillings- og diskrimineringsloven).',
        'Du garanterer at du har rett til å bruke bildene og tekstene du legger inn, og gir DigiHome rett til å bruke dem for å markedsføre boligen så lenge den leies ut gjennom DigiHome.',
        'Standardannonse på FINN.no er inkludert. Ekstra synlighet, profesjonell foto og andre tillegg bestilles og betales for seg.',
        'Blir boligen ledig mens avtalen løper, skjer ny annonsering og ny leiekontrakt gjennom DigiHome. Du kan ikke bruke DigiHomes annonse eller interessenter fra portalen til å inngå leieavtale utenom DigiHome mens avtalen løper.',
        'DigiHome garanterer ikke at boligen blir utleid, når det skjer, eller til hvilken leie.',
      ],
    },
    {
      n: '7', t: 'Leiekontrakten',
      p: [
        'Leiekontrakten bygger på husleieloven og DigiHomes standardmal. Du bestemmer og kontrollerer innholdet — leie, varighet, depositum, oppsigelsestid og eventuelle særvilkår — før den sendes til signering, og har ansvaret for at vilkårene er lovlige og riktige.',
        'Signering skjer elektronisk med BankID. En elektronisk signert kontrakt er like bindende som en på papir. Kontrakten lagres i portalen for deg og leietaker.',
        'Endringer i et løpende leieforhold — fornyelse, leiejustering etter husleieloven, oppsigelse — gjør du selv i portalen. DigiHome oppdaterer faktureringen deretter.',
      ],
    },
    {
      n: '8', t: 'Husleie, klientkonto og utbetaling',
      p: [
        'Husleien faktureres leietaker og betales til klientkontoen. Midlene tilhører deg og holdes atskilt fra DigiHomes egne penger.',
        'Utbetaling til bankkontoen du har registrert skjer etter at leien er registrert innbetalt, med fradrag for DigiHomes honorar og eventuelle forfalte tillegg du har bestilt. Tidspunkt, beløp og trekk vises i portalen, og du får en spesifikasjon for hver utbetaling.',
        'Du er ansvarlig for at kontonummeret er riktig. Utbetaling til kontonummeret du selv har registrert, er frigjørende for DigiHome.',
        'Delbetalinger og for mye betalt leie håndteres etter leieavtalen, og feilinnbetalinger tilbakeføres til betaleren. DigiHome kan motregne forfalt honorar og tillegg i senere utbetalinger.',
        'Betaler leietaker leien direkte til deg, må du registrere det i portalen. Honoraret påløper også for slik leie og faktureres da for seg.',
        'Portalen gir deg oversikt over innbetalinger, honorar og utbetalinger som du kan bruke i skattemeldingen.',
      ],
    },
    {
      n: '9', t: 'Purring, varsler og inkasso',
      p: [
        'Ved manglende betaling sender DigiHome automatiske betalingsvarsler og purring til leietaker i tråd med inkassoloven og husleieloven, og varsler deg i portalen.',
        'Videre skritt — betalingsoppfordring med varsel om tvangsfravikelse (husleieloven § 9-9 og tvangsfullbyrdelsesloven), oversendelse til inkasso, forliksråd eller namsmyndighet — er dine beslutninger og settes bare i gang etter din uttrykkelige godkjenning. Kostnadene ved slike skritt bærer du, med mindre de dekkes av leietaker.',
        'DigiHome garanterer ikke at leietaker betaler, og dekker ikke tapt leie.',
      ],
    },
    {
      n: '10', t: 'Depositum',
      p: [
        'Depositumskonto opprettes i leietakers navn i bank, og beløpet kan ikke overstige seks måneders leie (husleieloven § 3-5). Bankens gebyr for kontoen dekkes av deg som utleier, slik loven krever.',
        'Verken du eller DigiHome kan disponere depositumet alene. Utbetaling ved leieslutt skjer etter husleielovens regler — ved enighet mellom deg og leietaker, eller etter rettskraftig avgjørelse. DigiHome bistår med å be banken om utbetaling når vilkårene er oppfylt.',
        'Du er ansvarlig for at depositum kreves og håndteres lovlig. Depositum som mottas på annen måte enn på depositumskonto, er ditt ansvar alene.',
      ],
    },
    {
      n: '11', t: 'Honorar og tilleggstjenester',
      p: [
        'Honoraret er 5 % av innbetalt husleie for hvert leieforhold som administreres gjennom DigiHome. Det er ingen etableringskostnad, ingen minstepris og ingen faste månedsgebyrer. Oppgitte priser inkluderer merverdiavgift der tjenesten er avgiftspliktig.',
        'Honoraret trekkes ved utbetaling. Kan det ikke trekkes — for eksempel fordi leien er betalt direkte til deg — faktureres det med 14 dagers betalingsfrist. Ved forsinket betaling påløper forsinkelsesrente etter forsinkelsesrenteloven og eventuelt purregebyr etter inkassoloven.',
        'Tilleggstjenester — for eksempel profesjonell foto, kreditt- og referansesjekk, visningshjelp, innflyttingsklargjøring og juridisk trygghetspakke — er ikke inkludert. De bestilles i portalen eller ved henvendelse, til prisen som vises når du bestiller, og trekkes fra neste utbetaling eller faktureres.',
        'Kostnader til leverandører du selv velger (rørlegger, renhold og lignende) er ditt forhold til leverandøren, med mindre annet er avtalt skriftlig. Beløp DigiHome legger ut for på din anmodning, viderefaktureres eller trekkes fra utbetaling.',
      ],
    },
    {
      n: '12', t: 'Ditt ansvar som utleier',
      p: [
        'Du bekrefter og er ansvarlig for at:',
      ],
      liste: [
        'du eier boligen eller har rett til å leie den ut, og har nødvendige samtykker fra medeiere, sameie, borettslag eller bank',
        'boligen lovlig kan leies ut som boenhet, og oppfyller krav til brannsikkerhet, rømningsvei, elektrisk anlegg, radon og rom godkjent for varig opphold',
        'opplysningene du gir om deg, boligen, leien og leieforholdet er riktige og oppdaterte, og at du melder endringer uten opphold',
        'du har egnet forsikring for bygning og eventuelt innbo eller utleie — DigiHome forsikrer ikke boligen',
        'du rapporterer og betaler skatt av leieinntektene — DigiHome gir ikke skatterådgivning',
        'du følger husleieloven, likestillings- og diskrimineringsloven og annet regelverk i annonsering, valg av leietaker og gjennom leieforholdet',
        'du ikke bruker tjenesten til ulovlige formål, hvitvasking eller fremleie du ikke har rett til',
      ],
      etter: [
        'Får DigiHome krav fra leietaker, myndigheter eller andre som skyldes at du har brutt avtalen, gitt feil opplysninger eller brutt loven, skal du holde DigiHome skadesløs for rimelige kostnader og tap.',
      ],
    },
    {
      n: '13', t: 'Kontoen din og bruk av portalen',
      p: [
        'Du er ansvarlig for påloggingen din og for alt som skjer fra kontoen. Bruk et sterkt passord, ikke del tilgangen, og varsle DigiHome straks ved mistanke om misbruk. Gir du medhjelpere tilgang der portalen har funksjon for det, svarer du for deres bruk.',
        'Du skal ikke misbruke portalen: ikke omgå sikkerhet, ikke hente ut data automatisk, ikke laste opp skadelig eller ulovlig innhold, og ikke bruke opplysninger om leietakere og interessenter til andre formål enn utleie av boligen.',
        'DigiHome kan stenge eller begrense tilgangen midlertidig ved mistanke om misbruk, sikkerhetsbrudd eller ulovlig bruk, og ved forfalt honorar som ikke er betalt etter purring. Du varsles, og løpende fakturering og utbetaling til deg fortsetter så langt det er mulig.',
        'All kommunikasjon om avtalen skjer elektronisk — i portalen, på e-post og SMS til kontaktopplysningene du har registrert. Varsler regnes som mottatt når de er sendt dit. Varsler DigiHome sender leietaker på dine vegne, kan sendes på samme måte.',
      ],
    },
    {
      n: '14', t: 'Tilgjengelighet og tredjeparter',
      p: [
        'DigiHome arbeider for høy oppetid og varsler planlagt vedlikehold der det er mulig. Tjenesten kan likevel være utilgjengelig i kortere perioder, og DigiHome kan endre, forbedre eller fjerne funksjoner så lenge kjernen i tjenesten (punkt 3) leveres.',
        'Tjenesten bruker tredjeparter — blant annet BankID og Posten signering, banker og betalingsinfrastruktur, FINN.no, e-post- og SMS-leverandører og kredittopplysningsforetak. DigiHome er ikke ansvarlig for feil, forsinkelser eller nedetid hos disse, men hjelper deg så langt det er rimelig med å finne en løsning.',
        'DigiHome kan bruke automatiserte hjelpemidler og kunstig intelligens til utkast, forslag og prioritering — for eksempel annonsetekst eller sortering av saker. Forslag er hjelp: du kontrollerer og godkjenner det som sendes eller bestilles.',
      ],
    },
    {
      n: '15', t: 'Rettigheter til plattform, innhold og data',
      p: [
        'DigiHome eier portalen, programvaren, malene, designet og varemerkene. Du får en begrenset, ikke-eksklusiv rett til å bruke portalen til egen utleie så lenge avtalen løper.',
        'Du eier innholdet du legger inn — bilder, tekster og dokumenter. Du gir DigiHome rett til å lagre, vise, tilpasse og formidle innholdet så langt det trengs for å levere tjenesten og markedsføre boligen.',
        'DigiHome kan bruke anonymiserte og aggregerte data — for eksempel leienivåer og utleietid — til statistikk, markedsinnsikt og forbedring av tjenesten. Slike data kan ikke knyttes til deg, boligen eller leietaker.',
        'Når avtalen opphører, kan du laste ned kontrakter, oppgjør og dokumenter fra portalen i 90 dager. Deretter lagres opplysninger bare så lenge lov krever det, blant annet etter bokføringsloven, slik det står i personvernerklæringen.',
      ],
    },
    {
      n: '16', t: 'Personopplysninger og databehandleravtale',
      p: [
        `DigiHome behandler personopplysninger om deg for å inngå og oppfylle avtalen, fakturere, oppfylle lovkrav og forbedre tjenesten. For denne behandlingen er DigiHome behandlingsansvarlig. Detaljene står i personvernerklæringen på ${PERSONVERN}.`,
        'For opplysninger om leietaker og interessenter i ditt leieforhold er du behandlingsansvarlig, og DigiHome behandler dem på dine vegne som databehandler. Dette punktet er databehandleravtalen mellom oss etter personvernforordningen artikkel 28:',
      ],
      liste: [
        'DigiHome behandler opplysningene bare for å levere tjenesten, etter instruksjonene du gir gjennom bruk av portalen, eller når loven krever det',
        'DigiHome sørger for taushetsplikt hos alle som behandler opplysningene, og for egnede tekniske og organisatoriske sikkerhetstiltak',
        'DigiHome kan bruke underdatabehandlere til drift, e-post og SMS, signering og betaling. Oversikten står i personvernerklæringen; endringer varsles i portalen eller på e-post, og du kan protestere med saklig grunn',
        'DigiHome bistår deg rimelig med å svare på henvendelser fra de registrerte, sikre behandlingen og håndtere brudd. Brudd på personopplysningssikkerheten varsles deg uten ugrunnet opphold',
        'DigiHome sletter eller leverer tilbake opplysningene når avtalen opphører, med mindre loven krever fortsatt lagring, og gir deg den informasjonen som trengs for å vise at pliktene er overholdt',
        'DigiHome overfører ikke opplysninger ut av EØS uten gyldig overføringsgrunnlag',
      ],
      etter: [
        'Kreditt- og referansesjekk av kandidater gjøres bare der du har bestilt det, med kandidatens samtykke og etter reglene for kredittopplysning. Resultatet kan bare brukes til å vurdere leieforholdet.',
        'Du er ansvarlig for å ha lovlig grunnlag for opplysningene du selv samler inn og legger inn i portalen, og for å informere leietaker om din behandling der loven krever det. DigiHome informerer leietaker om DigiHomes egen behandling.',
      ],
    },
    {
      n: '17', t: 'DigiHomes ansvar',
      p: [
        'DigiHome skal levere tjenesten fagmessig og med rimelig aktsomhet. Feil rettes innen rimelig tid etter at du har meldt fra.',
        'DigiHome er ikke ansvarlig for leietakers betalingsmislighold eller skader på boligen, tap fordi boligen står tom, leieavtalens innhold eller dine beslutninger i leieforholdet, feil i opplysninger du eller leietaker har gitt, forhold hos tredjeparter (punkt 14), eller forhold utenfor DigiHomes kontroll — som strømbrudd, nettverksfeil, streik, offentlige pålegg eller alvorlige hendelser (force majeure).',
        'DigiHome er ikke ansvarlig for indirekte tap, herunder tapt inntekt, tapt fortjeneste eller følgeskader. DigiHomes samlede ansvar per kalenderår er begrenset til honoraret du har betalt de siste tolv månedene for den boligen kravet gjelder.',
        'Begrensningene gjelder ikke ved forsett eller grov uaktsomhet fra DigiHome, eller der de strider mot ufravikelig lov, herunder reglene som verner forbrukere.',
        'Krav må meldes skriftlig innen rimelig tid, og senest tre måneder etter at du oppdaget eller burde ha oppdaget grunnlaget for kravet.',
      ],
    },
    {
      n: '18', t: 'Varighet og oppsigelse',
      p: [
        'Avtalen løper fra du godtar den, uten bindingstid.',
        'Du kan si opp når som helst i portalen eller ved å skrive til DigiHome. Avtalen opphører ved utgangen av måneden oppsigelsen er mottatt. Leie som er fakturert eller innbetalt før opphør, gjøres opp som normalt, og honorar påløper for leie innbetalt til og med opphørsdatoen.',
        'Ved opphør fjernes annonsen og faktureringen stanser. Du må gi leietaker ny betalingsinformasjon — DigiHome kan sende et standardvarsel om dette på dine vegne. Leieforholdet påvirkes ikke, og depositumskontoen står i banken som før. Dokumentene dine er tilgjengelige etter punkt 15.',
        'DigiHome kan si opp avtalen med 30 dagers varsel, og med umiddelbar virkning ved vesentlig brudd: honorar som ikke er betalt etter purring, ulovlig utleie, misbruk av portalen, feilaktige opplysninger av betydning, eller bruk som utsetter DigiHome, leietaker eller andre for risiko. DigiHome kan også si opp med rimelig varsel dersom tjenesten legges ned eller ikke lenger kan leveres for boligen.',
      ],
    },
    {
      n: '19', t: 'Angrerett for privatpersoner',
      p: [
        'Er du privatperson, har du 14 dagers angrerett fra du godtar avtalen (angrerettloven). Du angrer ved å gi DigiHome tydelig melding, for eksempel på e-post. Standard angreskjema følger med bekreftelsen du får på e-post, og fås også ved henvendelse.',
        'Ved å godta avtalen ber du om at tjenesten starter straks, også innenfor angrefristen. Angrer du etter at tjenesten er tatt i bruk, betaler du honorar for leie innbetalt fram til meldingen. Publisert annonse fjernes, og en leiekontrakt som allerede er signert med leietaker, gjelder uavhengig av at avtalen med DigiHome opphører.',
      ],
    },
    {
      n: '20', t: 'Endringer og overdragelse',
      p: [
        'DigiHome kan endre avtalen og prisene med minst 30 dagers varsel i portalen eller på e-post. Endringer som er til din fordel, følger av lov eller bare gjelder nye funksjoner, kan gjelde straks. Ønsker du ikke de nye vilkårene, kan du si opp avtalen uten kostnad før endringen trer i kraft. Bruker du tjenesten etter det, har du godtatt endringen.',
        'DigiHome kan overdra avtalen til et selskap i samme konsern eller til den som overtar virksomheten, uten at vilkårene svekkes. Du kan overdra avtalen til ny eier av boligen bare med DigiHomes skriftlige samtykke.',
      ],
    },
    {
      n: '21', t: 'Lovvalg og tvister',
      p: [
        `Avtalen reguleres av norsk rett. Uenighet søker vi først å løse i minnelighet — ta kontakt på ${SUPPORT}. Er du privatperson, kan du også klage til Forbrukertilsynet.`,
        'Løses ikke saken, kan den bringes inn for norske domstoler med Bergen tingrett som verneting, med de begrensningene som følger av tvisteloven for forbrukere.',
      ],
    },
  ],
};
