// ---------------------------------------------------------------------------
// DEPOSITUM-KLYNGEN (pilar + tre spokes)
//
// Datagrunnlag (Search Console, 2026-05-04 → 2026-08-02):
//   /guider/depositum-regler: 1 971 visninger, 9 klikk, CTR 0,5 %, pos 11,8.
// Én side rangerte på svært ulike søkeintensjoner samtidig:
//   • «må utleier ha egen depositumskonto» / «depositum på privat konto»
//     / «depositumskonto regler» / «hvem får rentene på depositumskonto»  → depositumskonto
//   • «leietaker (har) ikke betalt depositum» / «leietaker betaler ikke depositum»
//     → leietaker-har-ikke-betalt-depositum
//   • «når skal depositum tilbakebetales» / «hvor lenge kan utleier holde
//     tilbake depositum» / «når utleier ikke betaler tilbake depositum»
//     → depositum-tilbakebetaling
// Derfor er innholdet delt i én pilar + tre dedikerte spokes med egne titler
// som matcher søket. Pilaren beholder oversikten og lenker videre.
//
// Inline-lenker i paragraphs/list/keyFacts skrives som [tekst](/sti).
// ---------------------------------------------------------------------------

const AUTHOR = { name: 'Sarah Sleeman', role: 'Daglig leder og eiendomsmegler', url: '/om-oss' };
const REVIEWER = { type: 'Organization', name: 'DigiHome fagredaksjon', role: 'Juridisk kildesjekk', url: '/metode' };

const LOV_35 = { label: 'Lovdata: husleieloven § 3-5 (depositum)', url: 'https://lovdata.no/lov/1999-03-26-17/§3-5' };
const HTU_DEP = { label: 'Husleietvistutvalget: depositum og garanti', url: 'https://www.htu.no/artikler/depositum-og-garanti' };
const HTU = { label: 'Husleietvistutvalget', url: 'https://www.htu.no/' };
const LOV_HLF = { label: 'Lovdata: husleieloven', url: 'https://lovdata.no/lov/1999-03-26-17' };
const REG_35 = { label: 'Regjeringen: tolkningsuttalelse om depositum (§ 3-5)', url: 'https://www.regjeringen.no/no/dokumenter/-3-5-departementet-svarer-pa-sporsmal-om-private-leieboliger-som-er-klausulert-til-studentboliger-kan-opprette-felles-depositumskonto/id2850248/' };

const ENT_HUSLEIELOVEN = { name: 'Husleieloven', sameAs: 'https://lovdata.no/lov/1999-03-26-17' };
const ENT_HTU = { name: 'Husleietvistutvalget', sameAs: 'https://www.htu.no/' };
const ENT_DEPOSITUM = { name: 'Depositum', sameAs: 'https://no.wikipedia.org/wiki/Depositum' };

export const depositumGuides = [
  // ═══════════════════════════════════════════════════════════════════════
  // PILAR
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'depositum-regler',
    metaTitle: 'Depositum ved utleie 2026: regler, beløp og frister',
    title: 'Depositum ved utleie: reglene du må kunne',
    description: 'Maks 6 måneders leie, egen konto i leietakers navn, utleier betaler gebyret. Se beløp, frister, hva du kan trekke fra og de vanligste feilene.',
    category: 'Depositum',
    readMinutes: 6,
    published: '2026-03-18',
    updated: '2026-08-05',
    image: '/interior-hallway.webp',
    imageAlt: 'Nøkkeloverlevering ved innflytting i leiebolig',
    keywords: ['depositum', 'depositum regler', 'hva er vanlig depositum ved utleie', 'depositum utleie', 'hva er depositum'],
    entities: [ENT_HUSLEIELOVEN, ENT_DEPOSITUM, ENT_HTU],
    spokes: ['depositumskonto', 'leietaker-har-ikke-betalt-depositum', 'depositum-tilbakebetaling'],
    answer: 'Depositum ved boligutleie kan maksimalt utgjøre seks måneders husleie, og pengene skal stå på en særskilt depositumskonto i leietakers navn. Utleier dekker kostnaden ved å opprette kontoen, og ingen av partene kan disponere beløpet alene. Rentene tilhører leietaker. Vanlig praksis i Norge er to til tre måneders leie. Depositum skal aldri betales til utleiers private konto — da kan leietaker kreve beløpet tilbake med forsinkelsesrenter.',
    keyFacts: [
      '**Maksbeløp:** seks måneders husleie (husleieloven § 3-5). Vanlig praksis: to til tre måneder.',
      '**Konto:** særskilt [depositumskonto](/guider/depositumskonto) i leietakers navn — aldri utleiers private konto.',
      '**Kostnad:** utleier dekker gebyret for å opprette kontoen.',
      '**Renter:** tilhører leietaker.',
      '**Ved utflytting:** enighet gir utbetaling straks. Ved uenighet gjelder [bankens varslingsprosedyre med fem ukers søksmålsfrist](/guider/depositum-tilbakebetaling).',
    ],
    sections: [
      {
        h2: 'Hva er depositum — og hvorfor finnes det?',
        paragraphs: [
          'Depositumet er leietakers penger som stilles som sikkerhet for skyldig husleie, skader utover normal slitasje og andre krav som følger av leieavtalen. Reglene står i husleieloven § 3-5 og er ufravikelige til leietakers gunst — du kan ikke avtale dårligere vilkår for leietaker enn loven gir.',
          'Poenget er balanse: utleier får en trygghet som gjør det mulig å leie ut uten å kreve kausjonist, og leietaker beholder eierskapet til pengene fordi de står på leietakers egen konto. Bryter du formkravene, mister du i praksis sikkerheten.',
        ],
      },
      {
        h2: 'Hvor mye kan du kreve i depositum?',
        paragraphs: [
          'Lovens maksgrense er seks måneders husleie. I praksis avtaler de fleste norske utleiere to til tre måneders leie. For en bolig med 15 000 kr i månedsleie betyr det 30 000–45 000 kr.',
          'Et høyere depositum gir mer sikkerhet, men snevrer inn søkergrunnlaget kraftig — mange gode leietakere har rett og slett ikke seks måneders leie tilgjengelig. Vurder depositumsstørrelsen som en del av prisstrategien, ikke bare som risikostyring.',
        ],
        list: [
          'Depositumet beregnes av husleien, ikke av husleie pluss felleskostnader eller strøm',
          'Avtales beløpet for høyt, er det den delen som overstiger seks måneder som er ugyldig',
          'Depositum og forskuddsleie er to ulike ting — samlet sikkerhet kan ikke overstige lovens ramme',
        ],
      },
      {
        h2: 'De fire hovedreglene',
        paragraphs: [
          'Reglene er få, men de er absolutte. Detaljene om bank, gebyr og renter er samlet i egen guide om [depositumskonto](/guider/depositumskonto).',
        ],
        list: [
          '**Maksbeløp:** depositumet kan ikke overstige seks måneders husleie',
          '**Egen konto:** pengene skal stå på særskilt depositumskonto i leietakers navn — aldri på utleiers private konto',
          '**Utleier betaler:** kostnadene ved å opprette depositumskontoen dekkes av utleier',
          '**Ingen ensidig disponering:** verken utleier eller leietaker kan ta ut pengene alene uten at lovens vilkår er oppfylt',
        ],
      },
      {
        h2: 'Hva skjer hvis depositumet er betalt feil?',
        paragraphs: [
          'Hvis leietaker har betalt depositum rett til utleiers konto, kan leietakeren når som helst kreve beløpet tilbakebetalt med forsinkelsesrenter — selv om leieforholdet fortsatt løper. Dette er en av de vanligste og dyreste feilene private utleiere gjør.',
          'Resultatet er dobbelt uheldig: du må betale pengene tilbake, og du står samtidig uten sikkerhet for resten av leieforholdet. Se [hvorfor privat konto ikke fungerer](/guider/depositumskonto) og hvordan du retter det opp.',
        ],
      },
      {
        h2: 'Utbetaling ved leieforholdets slutt',
        paragraphs: [
          'Er partene enige, instruerer de banken sammen, og pengene utbetales. Ved uenighet gjelder husleielovens prosedyre med varsling fra banken og en søksmålsfrist på fem uker. Hele forløpet, fristene og hva du lovlig kan trekke fra er beskrevet i guiden om [tilbakebetaling av depositum](/guider/depositum-tilbakebetaling).',
          'Det viktigste du gjør for å unngå konflikt, skjer før innflytting: en overtakelsesprotokoll med daterte bilder av hvert rom. Uten den står påstand mot påstand hvis det oppstår uenighet om skader.',
        ],
      },
      {
        h2: 'Når leietaker ikke betaler depositumet',
        paragraphs: [
          'Manglende innbetaling før innflytting er en klassisk situasjon som fort blir dyr hvis du håndterer den galt. Hovedregelen er enkel: overlever ikke nøklene før avtalt sikkerhet faktisk er på konto. Har det først skjedd, blir handlingsrommet ditt mye trangere.',
          'Vi har samlet fremgangsmåten, varselteksten og alternativene i en egen guide: [leietaker har ikke betalt depositum](/guider/leietaker-har-ikke-betalt-depositum).',
        ],
      },
      {
        h2: 'Alternativ: depositumsgaranti',
        paragraphs: [
          'I stedet for kontant depositum kan leietaker stille en depositumsgaranti fra et forsikringsselskap eller NAV. For utleier gir garanti fra solid utsteder tilsvarende sikkerhet, men les vilkårene: enkelte garantier krever at kravet dokumenteres raskere enn ved ordinært depositum, og noen dekker bare skyldig husleie — ikke skader.',
          'Hos DigiHome håndteres depositum og kontrakt digitalt med BankID-signering, slik at formkravene er oppfylt fra første dag. Det er en del av både selvforvaltning og full forvaltning — se [forskjellen på modellene](/guider/utleiemegler-vs-selvforvaltning).',
        ],
      },
    ],
    faqs: [
      { q: 'Hva er vanlig depositum ved utleie i Norge?', a: 'To til tre måneders husleie er det klart vanligste. Loven tillater opptil seks måneder, men høyere depositum reduserer antallet aktuelle leietakere merkbart. For en bolig til 15 000 kr i måneden betyr tre måneder 45 000 kr.' },
      { q: 'Kan utleier kreve depositum og forskuddsleie samtidig?', a: 'Sikkerheten samlet kan ikke overstige lovens ramme på seks måneders leie. Krever du tre måneders depositum, kan du ikke i tillegg kreve tre måneders forskuddsleie som sikkerhet uten å komme i konflikt med formålet i husleieloven § 3-5. Hold deg til én tydelig sikkerhetsordning.' },
      { q: 'Hva kan utleier trekke fra depositumet?', a: 'Skyldig husleie, utestående felleskostnader leietaker skulle dekket, og utbedring av skader utover normal slitasje — dokumentert mot overtakelsesprotokollen. Vanlig slitasje etter kontraktsmessig bruk kan ikke kreves dekket.' },
      { q: 'Hvem får rentene på depositumskontoen?', a: 'Rentene tilhører leietaker, og leietaker har rett til å få dem utbetalt underveis i leieforholdet.' },
      { q: 'Må depositum avtales skriftlig?', a: 'Depositumet bør alltid stå i den skriftlige leieavtalen med beløp, betalingsfrist og kontoopplysninger. Uten skriftlighet blir både beløpet og vilkårene vanskelige å dokumentere hvis det oppstår uenighet.' },
      { q: 'Gjelder de samme reglene for utleie av rom i egen bolig?', a: 'Ja. Husleielovens depositumsregler gjelder også når du leier ut et rom eller en utleiedel i boligen du selv bor i. Beløpsgrense, kontokrav og gebyransvar er de samme.' },
    ],
    author: AUTHOR,
    reviewer: REVIEWER,
    sources: [LOV_35, REG_35, HTU_DEP],
    related: ['depositumskonto', 'depositum-tilbakebetaling', 'leietaker-har-ikke-betalt-depositum'],
    cta: { label: 'La oss håndtere kontrakt og depositum for deg', href: '/bli-utleier' },
    disclaimer: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SPOKE 1 — depositumskonto
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'depositumskonto',
    metaTitle: 'Depositumskonto: reglene utleier må følge (2026)',
    title: 'Depositumskonto ved utleie: reglene, banken og rentene',
    description: 'Må utleier opprette depositumskonto? Ja. Se hvem som betaler gebyret, hvilken bank som gjelder, hvem som får rentene og hva som skjer ved privat konto.',
    category: 'Depositum',
    readMinutes: 6,
    published: '2026-08-05',
    updated: '2026-08-05',
    image: '/interior-openplan.webp',
    imageAlt: 'Utleiebolig der depositum er satt på egen depositumskonto',
    keywords: ['depositumskonto', 'depositumskonto regler', 'må utleier ha egen depositumskonto', 'depositum på privat konto', 'hvem får rentene på depositumskonto', 'hvordan fungerer depositumskonto', 'kan leietaker opprette depositumskonto'],
    entities: [ENT_HUSLEIELOVEN, ENT_DEPOSITUM],
    pillar: 'depositum-regler',
    answer: 'Ja — depositum skal stå på en særskilt depositumskonto i leietakers navn, ikke på utleiers konto. Kontoen opprettes i en finansinstitusjon som kan tilby tjenesten i Norge, og utleier dekker kostnaden ved å opprette den. Ingen av partene kan disponere beløpet alene. Rentene tilhører leietaker. Betales depositumet til utleiers private konto, kan leietaker kreve pengene tilbake med forsinkelsesrenter — også midt i leieforholdet.',
    keyFacts: [
      '**Plikt:** depositum skal på særskilt konto i **leietakers** navn (husleieloven § 3-5).',
      '**Gebyret:** dekkes av utleier.',
      '**Renter:** tilhører leietaker.',
      '**Sperret:** ingen av partene kan ta ut penger alene uten at lovens vilkår er oppfylt.',
      '**Privat konto:** ikke lovlig sikkerhet — leietaker kan kreve beløpet tilbake med forsinkelsesrenter.',
    ],
    sections: [
      {
        h2: 'Hva er en depositumskonto?',
        paragraphs: [
          'En depositumskonto er en sperret bankkonto som opprettes i leietakers navn, men der ingen av partene kan disponere pengene alene. Kontoen finnes utelukkende for å holde depositumet trygt gjennom leieforholdet, og den er regulert i husleieloven § 3-5.',
          'Formelt eier leietaker pengene. Utleier har en sikkerhetsrett i dem. Det er derfor kontoen står i leietakers navn, mens det er utleier som har plikten til å sørge for at den finnes — og som betaler for den.',
        ],
      },
      {
        h2: 'Må utleier ha egen depositumskonto?',
        paragraphs: [
          'Ja. Krever du depositum, plikter du å sørge for at beløpet settes på en særskilt depositumskonto. Dette er ikke noe du kan avtale bort, heller ikke om leietaker skulle si seg villig til det: reglene i husleieloven § 3-5 er ufravikelige til leietakers gunst.',
          'Krever du ikke depositum i det hele tatt, trenger du selvsagt ingen konto. Men i det øyeblikket du ber om sikkerhet i form av penger, følger kontoplikten med.',
        ],
        list: [
          'Kontoen skal stå i leietakers navn — ikke i utleiers navn og ikke i selskapets navn',
          'Kontoen skal opprettes i en finansinstitusjon som har rett til å tilby tjenesten i Norge',
          'Ett leieforhold = ett depositum = én konto. Ikke bland flere leietakere på samme konto',
          'Ved bytte av leietaker skal det opprettes ny konto for den nye leietakeren',
        ],
      },
      {
        h2: 'Kan depositum stå på utleiers private konto?',
        paragraphs: [
          'Nei. Depositum på utleiers private konto er ikke gyldig sikkerhet, og det er en av de dyreste feilene private utleiere gjør. Leietaker kan kreve beløpet tilbakebetalt med forsinkelsesrenter når som helst — også mens leieforholdet fortsatt løper, og selv om leietaker i utgangspunktet gikk med på ordningen.',
          'Resultatet er at du både må betale ut pengene og står uten sikkerhet for resten av leieforholdet. Har dette skjedd, bør du rette det opp raskt: opprett korrekt depositumskonto, avklar overføringen skriftlig med leietaker og dokumenter at beløpet er flyttet.',
          'Det finnes ingen «liten» versjon av denne feilen. Også et halvt depositum på privat konto er feil håndtering.',
        ],
      },
      {
        h2: 'Hvilken bank — og må det være samme bank som husleien?',
        paragraphs: [
          'Loven krever ikke at depositumskonto og husleiekonto står i samme bank. Kontoen skal opprettes i en finansinstitusjon som har rett til å tilby slik tjeneste i Norge, og det er hovedkravet.',
          'Bankvalget kan likevel ha praktisk betydning. Flere banker tilbyr en forenklet prosedyre for utbetaling av skyldig husleie fra depositumskontoen, og noen knytter denne til at husleien betales i samme bank. Vil du ha den muligheten tilgjengelig, bør du avklare de konkrete vilkårene med banken før kontoen opprettes.',
          'Mange norske banker tilbyr depositumskonto digitalt, og opprettelsen tar normalt kort tid når begge parter er identifisert med BankID.',
        ],
      },
      {
        h2: 'Hvem betaler for depositumskontoen?',
        paragraphs: [
          'Utleier. Kostnadene ved å opprette depositumskontoen skal dekkes av utleier, og dette kan ikke veltes over på leietaker. Gebyret varierer mellom bankene, og flere tilbyr det gratis eller til et lite engangsbeløp.',
          'Ved skattepliktig utleie er gebyret en ordinær driftskostnad du kan føre som [fradrag i utleieregnskapet](/guider/fradrag-utleiebolig).',
        ],
      },
      {
        h2: 'Hvem får rentene?',
        paragraphs: [
          'Rentene på depositumskontoen tilhører leietaker. Leietaker har også rett til å få rentene utbetalt underveis i leieforholdet, uten at selve depositumet røres.',
          'Utleier kan altså ikke kreve rentene som kompensasjon for gebyret eller for arbeidet med kontoen. Det er en enkel regel, men den blir jevnlig misforstått.',
        ],
      },
      {
        h2: 'Kan leietaker opprette kontoen selv?',
        paragraphs: [
          'I praksis må begge parter involveres. Kontoen står i leietakers navn og krever legitimasjon fra leietaker, men den skal samtidig registreres med utleier som sikret part — derfor må også utleier identifisere seg og godkjenne opprettelsen.',
          'Rekkefølgen er mindre viktig enn resultatet: kontoen skal være opprettet som depositumskonto, i leietakers navn, med utleier registrert, før nøklene overleveres. Er kontoen bare en vanlig sparekonto i leietakers navn, har du ingen sikkerhet.',
        ],
      },
      {
        h2: 'Slik gjør du det — steg for steg',
        list: [
          'Avtal beløpet skriftlig i leiekontrakten, sammen med betalingsfrist',
          'Opprett depositumskonto i banken, i leietakers navn og med deg registrert som utleier',
          'Send kontonummeret til leietaker skriftlig, med tydelig frist',
          'Kontroller at beløpet faktisk er kommet inn — ikke stol på skjermbilde av en betaling',
          'Overlever nøkler først når beløpet er bekreftet på kontoen',
          'Gjennomfør overtakelsesprotokoll med daterte bilder samme dag',
        ],
      },
      {
        h2: 'Vanlige feil',
        list: [
          'Depositum til utleiers private konto eller til firmakonto',
          'Vanlig sparekonto i leietakers navn i stedet for registrert depositumskonto',
          'Nøkler overlevert mot skjermbilde av betaling — se [hva du gjør når depositumet ikke kommer](/guider/leietaker-har-ikke-betalt-depositum)',
          'Utleier tar rentene',
          'Gebyret belastes leietaker',
          'Samme konto gjenbrukt for ny leietaker',
        ],
      },
    ],
    faqs: [
      { q: 'Må utleier ha egen depositumskonto?', a: 'Ja. Krever du depositum, skal beløpet stå på en særskilt depositumskonto i leietakers navn. Regelen i husleieloven § 3-5 er ufravikelig til leietakers gunst, og kan ikke avtales bort — heller ikke om leietaker sier seg villig.' },
      { q: 'Hva skjer hvis depositum er betalt til utleiers private konto?', a: 'Leietaker kan kreve beløpet tilbake med forsinkelsesrenter, også mens leieforholdet løper. Opprett korrekt depositumskonto, avklar overføringen skriftlig og dokumenter at pengene er flyttet så raskt som mulig.' },
      { q: 'Hvem får rentene på depositumskonto?', a: 'Rentene tilhører leietaker, og leietaker kan kreve dem utbetalt underveis i leieforholdet. Utleier kan ikke beholde rentene som dekning for gebyret.' },
      { q: 'Må depositumskonto og husleiekonto være i samme bank?', a: 'Loven krever det ikke. Men flere banker knytter sin forenklede prosedyre for utbetaling av skyldig husleie til at husleien betales i samme bank. Ønsker du den muligheten, bør du avklare vilkårene med banken før kontoen opprettes.' },
      { q: 'Hvor lang tid tar det å opprette depositumskonto?', a: 'Hos banker som tilbyr digital opprettelse med BankID går det normalt raskt når begge parter er identifisert. Regn likevel med noen dager mellom kontraktsignering og innflytting, slik at beløpet er bekreftet før nøkkeloverlevering.' },
      { q: 'Kan flere leietakere dele én depositumskonto?', a: 'Utgangspunktet er én konto per leieforhold. Leier flere personer sammen på samme kontrakt, er de normalt registrert på samme leieforhold. Har du flere separate leieavtaler, skal hvert forhold ha sin egen konto.' },
      { q: 'Kan jeg kreve depositumsgaranti i stedet for depositumskonto?', a: 'Ja, garanti fra forsikringsselskap eller NAV er et alternativ, og da trengs ingen depositumskonto for det beløpet garantien dekker. Les vilkårene nøye — noen garantier dekker bare skyldig husleie, ikke skader.' },
    ],
    author: AUTHOR,
    reviewer: REVIEWER,
    sources: [LOV_35, REG_35, HTU_DEP],
    related: ['depositum-regler', 'depositum-tilbakebetaling', 'leietaker-har-ikke-betalt-depositum'],
    cta: { label: 'Få depositum og kontrakt håndtert digitalt', href: '/bli-utleier' },
    disclaimer: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SPOKE 2 — leietaker har ikke betalt depositum
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'leietaker-har-ikke-betalt-depositum',
    metaTitle: 'Leietaker har ikke betalt depositum — hva gjør du?',
    title: 'Leietaker har ikke betalt depositum: slik går du frem',
    description: 'Depositumet er ikke betalt før innflytting? Se hva du gjør de første dagene, hvordan varselet bør se ut, når du kan heve avtalen — og feilene som svekker saken din.',
    category: 'Depositum',
    readMinutes: 7,
    published: '2026-08-05',
    updated: '2026-08-05',
    image: '/interior-bedroom.webp',
    imageAlt: 'Utleiebolig klar for innflytting der depositum mangler',
    keywords: ['leietaker ikke betalt depositum', 'leietaker har ikke betalt depositum', 'leietaker betaler ikke depositum', 'leietaker depositum', 'depositum ikke betalt'],
    entities: [ENT_HUSLEIELOVEN, ENT_HTU],
    pillar: 'depositum-regler',
    answer: 'Har leietaker ikke betalt depositumet, er hovedregelen enkel: ikke overlever nøklene. Send et skriftlig varsel med konkret beløp, kontonummer og en kort, tydelig frist, og gjør det klart at innflytting forutsetter at sikkerheten er på konto. Uteblir betalingen, kan manglende oppfyllelse av en avtalt hovedforpliktelse gi grunnlag for å avslutte avtalen før overtakelse. Har leietaker allerede flyttet inn, blir handlingsrommet mindre, og du bør få juridisk veiledning før du hever eller stanser leieforholdet.',
    keyFacts: [
      '**Før innflytting:** ingen nøkler før depositumet er bekreftet på [depositumskontoen](/guider/depositumskonto).',
      '**Alltid skriftlig:** varsel med beløp, kontonummer, frist og konsekvens.',
      '**Aldri privat konto** som «midlertidig løsning» — det ødelegger sikkerheten din.',
      '**Etter innflytting:** vurder nedbetalingsplan eller garanti før du eskalerer.',
      '**Konflikt:** [Husleietvistutvalget](https://www.htu.no/) behandler leietvister rimeligere og raskere enn domstolen.',
    ],
    sections: [
      {
        h2: 'Første 48 timer: dette gjør du',
        paragraphs: [
          'Situasjonen er nesten alltid den samme: kontrakten er signert, innflyttingsdatoen nærmer seg, og depositumet er ikke på konto. Da er tempo og skriftlighet det viktigste du har.',
        ],
        list: [
          'Kontroller kontoen selv — ikke stol på skjermbilde eller «den er sendt»',
          'Send skriftlig varsel samme dag med beløp, kontonummer og ny frist',
          'Gjør konsekvensen tydelig: nøkler overleveres ikke før beløpet er bekreftet',
          'Behold alt i én skriftlig kanal (e-post eller SMS) så forløpet kan dokumenteres',
          'Ikke avlys andre interessenter før pengene er inne',
        ],
      },
      {
        h2: 'Ikke overlever nøklene før sikkerheten er på plass',
        paragraphs: [
          'Depositumet er sikkerheten din. Overleverer du nøklene uten den, gir du fra deg det sterkeste virkemiddelet du har — og du sitter igjen med et pengekrav mot en person som allerede har vist at betalingen glapp.',
          'Dette er ikke firkantethet, det er risikostyring. Har leietaker en reell grunn til forsinkelse, er løsningen å utsette overtakelsen noen dager, ikke å overlevere på tillit. Avtal utsettelsen skriftlig, med ny dato og ny frist.',
          'Er du usikker på om leietakeren har betalingsevne, gjør en [ordentlig screening før du signerer neste gang](/guider/leie-ut-leilighet-bergen) — kredittsjekk og referanse fra tidligere utleier fanger opp det aller meste.',
        ],
      },
      {
        h2: 'Slik bør varselet se ut',
        paragraphs: [
          'Et godt varsel er kort, konkret og etterprøvbart. Unngå trusler og lange forklaringer — skriv det slik at det kan leses opp i en tvistesak uten at du taper troverdighet.',
        ],
        list: [
          'Hvem varselet gjelder, og hvilken leieavtale og adresse',
          'Hva som skulle vært betalt: beløp, forfallsdato og hva avtalen sier',
          'Kontonummeret til depositumskontoen',
          'Ny, konkret frist — dato og klokkeslett',
          'Konsekvensen hvis fristen ikke overholdes',
          'Dato, ditt navn og kontaktopplysninger',
        ],
      },
      {
        h2: 'Kan du avslutte avtalen?',
        paragraphs: [
          'Depositumet er en avtalt forpliktelse, og manglende betaling er derfor et mislighold. Er beløpet ikke betalt før overtakelse, står du normalt fritt til å ikke gjennomføre overtakelsen etter at du har varslet skriftlig og gitt en rimelig frist.',
          'Skal leieforholdet formelt heves, kreves det etter husleieloven at misligholdet er vesentlig. Om manglende depositum er vesentlig nok, avhenger av beløpets størrelse, hvor lenge det har gått, hva som er kommunisert og hva avtalen sier. Har leietaker først flyttet inn, blir vurderingen strengere, og utkastelse krever et eget rettslig grunnlag.',
          'Konklusjonen i praksis: håndter det før nøkkeloverlevering, og få juridisk veiledning før du hever eller stanser et leieforhold som er i gang.',
        ],
      },
      {
        h2: 'Delbetaling og nedbetalingsplan — når det er fornuftig',
        paragraphs: [
          'Noen ganger er leietakeren solid, men likviditeten kommer noen uker for sent — typisk ved studiestart, jobbskifte eller når et tidligere depositum ikke er utbetalt ennå. Da kan en nedbetalingsplan være bedre forretning enn å starte prosessen på nytt med en tom bolig.',
          'Gjør det i så fall ordentlig: hele beløpet skriftlig avtalt, med datoer, og gjerne kombinert med en delvis innbetaling før innflytting. Regn samtidig på risikoen — én måned tomgang koster deg en hel månedsleie, men et manglende depositum kan koste flere.',
        ],
        list: [
          'Krev en reell delinnbetaling før nøkkeloverlevering',
          'Skriftlig plan med konkrete datoer og beløp',
          'Vurder depositumsgaranti eller kausjonist som supplement',
          'Sett en tydelig konsekvens hvis planen brytes',
        ],
      },
      {
        h2: 'Hvis leietaker allerede har flyttet inn',
        paragraphs: [
          'Da er utgangspunktet et pengekrav, ikke en nøkkeldiskusjon. Send skriftlig betalingsvarsel med frist, og hold all kommunikasjon dokumentert. Blir det ikke løst, er Husleietvistutvalget riktig instans for boligleie — det er rimeligere og raskere enn ordinær domstolsbehandling, og vedtakene kan tvangsfullbyrdes.',
          'Ikke ta rettferdigheten i egne hender. Å bytte lås, stenge strøm eller fjerne leietakers eiendeler er ulovlig selvtekt og kan gjøre deg erstatningsansvarlig — uansett hvor klart du har rett i selve pengespørsmålet.',
        ],
      },
      {
        h2: 'Alternativer som reduserer risikoen neste gang',
        list: [
          'Depositumsgaranti fra forsikringsselskap eller NAV som alternativ til kontant depositum',
          'Kredittsjekk og referanse fra minst én tidligere utleier',
          'Betalingsfrist satt minst fem virkedager før overtakelse',
          'Kortere første leieperiode ved usikkerhet',
          'Full forvaltning, der screening, kontrakt og [depositumskonto](/guider/depositumskonto) håndteres i én prosess',
        ],
      },
      {
        h2: 'Fem feil som svekker saken din',
        list: [
          'Depositum betalt til privat konto «bare denne gangen» — [ikke gyldig sikkerhet](/guider/depositumskonto)',
          'Nøkler overlevert uten bekreftet innbetaling',
          'Muntlige avtaler om utsatt betaling',
          'Ingen frist i varselet, bare en oppfordring',
          'Selvtekt: låsbytte, stenging av strøm eller fjerning av eiendeler',
        ],
      },
    ],
    faqs: [
      { q: 'Kan jeg nekte innflytting når depositum ikke er betalt?', a: 'Er depositumet en avtalt forutsetning i kontrakten, kan du normalt utsette overtakelsen etter at du har varslet skriftlig og gitt en rimelig frist. Dokumenter varselet og fristen, og ikke overlever nøkler før beløpet er bekreftet på depositumskontoen.' },
      { q: 'Kan jeg ta imot depositum på min egen konto midlertidig?', a: 'Nei. Depositum på utleiers konto er ikke gyldig sikkerhet, og leietaker kan kreve beløpet tilbake med forsinkelsesrenter. Du ender opp uten sikkerhet og med et tilbakebetalingskrav mot deg.' },
      { q: 'Hva gjør jeg hvis bare deler av depositumet er betalt?', a: 'Behandle det som delvis mislighold: bekreft skriftlig hva som er mottatt, sett ny frist for restbeløpet, og vurder om overtakelsen skal utsettes. Er restbeløpet lite og leietaker ellers solid, kan en kort, skriftlig nedbetalingsplan være fornuftig.' },
      { q: 'Kan jeg kreve renter eller gebyr for forsinket depositum?', a: 'Er forfallsdato avtalt, kan forsinkelsesrenter være aktuelt etter forsinkelsesrenteloven. Purregebyr forutsetter at det er avtalt eller følger av inkassoregelverket. Vurder likevel om det er verdt konflikten sammenlignet med å få selve beløpet inn.' },
      { q: 'Hvor melder jeg saken hvis vi ikke blir enige?', a: 'Husleietvistutvalget behandler tvister i boligleieforhold. Det er en rimeligere og raskere ordning enn domstolen, og avgjørelsene kan tvangsfullbyrdes. Ha kontrakt, varsler og kontoutskrifter klare.' },
      { q: 'Bør jeg heller bruke depositumsgaranti?', a: 'Garanti fra et solid forsikringsselskap eller NAV kan gi tilsvarende trygghet uten at leietaker må stille kontanter, og fjerner selve innbetalingsproblemet. Kontroller alltid hva garantien dekker — flere dekker skyldig husleie, men ikke skader.' },
    ],
    author: AUTHOR,
    reviewer: REVIEWER,
    sources: [LOV_35, LOV_HLF, HTU, HTU_DEP],
    related: ['depositum-regler', 'depositumskonto', 'leie-ut-leilighet-bergen'],
    cta: { label: 'Få screening og depositum håndtert for deg', href: '/bli-utleier' },
    disclaimer: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SPOKE 3 — tilbakebetaling
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: 'depositum-tilbakebetaling',
    metaTitle: 'Når skal depositum tilbakebetales? Se fristene',
    title: 'Tilbakebetaling av depositum: frister, trekk og fem ukers regel',
    description: 'Når skal depositum betales tilbake, og hvor lenge kan utleier holde det igjen? Se bankens varslingsprosedyre, fem ukers søksmålsfrist og lovlige trekk.',
    category: 'Depositum',
    readMinutes: 6,
    published: '2026-08-05',
    updated: '2026-08-05',
    image: '/interior-living.webp',
    imageAlt: 'Utflytting fra leiebolig og oppgjør av depositum',
    keywords: ['når skal depositum tilbakebetales', 'hvor lenge kan utleier holde tilbake depositum', 'når utleier ikke betaler tilbake depositum', 'når skal depositum betales tilbake', 'depositum tilbakebetaling'],
    entities: [ENT_HUSLEIELOVEN, ENT_HTU, ENT_DEPOSITUM],
    pillar: 'depositum-regler',
    answer: 'Er partene enige om oppgjøret, skal depositumet utbetales straks etter utflytting — de instruerer banken sammen, og pengene frigis normalt innen få dager. Loven setter ingen fast antall dagers frist ved enighet. Ved uenighet gjelder husleielovens prosedyre: krever leietaker utbetaling, varsler banken utleier skriftlig, og utleier har fem uker på å dokumentere at det er reist søksmål — i praksis sak for Husleietvistutvalget. Gjøres ikke det, utbetales beløpet til leietaker.',
    keyFacts: [
      '**Enighet:** felles instruks til banken, utbetaling normalt innen få dager.',
      '**Uenighet:** banken varsler motparten — utleier har **fem uker** på å dokumentere søksmål.',
      '**Lovlige trekk:** skyldig husleie, utestående felleskostnader, skader utover normal slitasje.',
      '**Ikke lovlig:** normal slitasje, oppgradering, eller trekk uten dokumentasjon.',
      '**Beviset:** [overtakelsesprotokoll](/guider/leie-ut-leilighet-bergen) med daterte bilder ved inn- og utflytting.',
    ],
    sections: [
      {
        h2: 'Hovedregelen: enighet gir raskt oppgjør',
        paragraphs: [
          'Når leieforholdet er over og partene er enige om oppgjøret, skal depositumet utbetales uten unødig opphold. Praktisk skjer det ved at utleier og leietaker sammen instruerer banken, som frigir beløpet — normalt innen noen få bankdager.',
          'Husleieloven angir ikke et bestemt antall dager for denne situasjonen. Det betyr ikke at utleier kan trekke ut tiden: uten saklig grunn til å holde beløpet tilbake, skal oppgjøret skje straks. Sett av tid til utflyttingsbefaring den siste dagen, så kan instruksen sendes samme uke.',
        ],
      },
      {
        h2: 'Hvor lenge kan utleier holde tilbake depositumet?',
        paragraphs: [
          'Bare så lenge det finnes et reelt og dokumenterbart krav — og bare innenfor lovens prosedyre. Utleier kan ikke sitte på beløpet «til det passer», og kan heller ikke holde tilbake hele depositumet på grunn av et lite krav.',
          'Krever leietaker utbetaling, skal banken varsle utleier skriftlig. Utleier har da fem uker på å dokumentere at det er reist søksmål om kravet, i praksis ved å bringe saken inn for Husleietvistutvalget. Skjer ikke det innen fristen, utbetales beløpet til leietaker.',
          'Er kravet ditt på 8 000 kr og depositumet på 45 000 kr, er det ryddigste å frigi differansen og bare tviste om de 8 000. Det styrker saken din, og det reduserer risikoen for at hele beløpet frigis fordi håndteringen fremstår urimelig.',
        ],
      },
      {
        h2: 'Motsatt vei: utleier krever utbetaling',
        paragraphs: [
          'Utleier kan i enkelte tilfeller få utbetalt skyldig husleie fra kontoen uten dom. Det forutsetter blant annet at leieavtalen og bankforholdet oppfyller lovens vilkår, og at leietaker ikke protesterer innen fristen banken opplyser om. Prosedyren gjelder skyldig husleie — ikke krav om skader eller andre utgifter.',
          'Krav som gjelder skader, manglende rengjøring eller andre utgifter må avklares mellom partene eller avgjøres i tvist. Ta derfor kontakt med banken før du sender et krav, og få bekreftet hvilken prosedyre som gjelder for din avtale.',
        ],
      },
      {
        h2: 'Hva kan utleier lovlig trekke fra?',
        paragraphs: [
          'Depositumet dekker krav som følger av leieforholdet — ikke ønsket standardheving. Skillet mellom normal slitasje og skade er den vanligste kilden til uenighet.',
        ],
        list: [
          '**Kan trekkes:** skyldig husleie og utestående felleskostnader leietaker skulle dekket',
          '**Kan trekkes:** skader utover normal slitasje, dokumentert mot overtakelsesprotokollen',
          '**Kan trekkes:** manglende avtalt utvask, med kvittering på faktisk kostnad',
          '**Kan ikke trekkes:** normal slitasje etter kontraktsmessig bruk — merker i gulv, blekede tapeter, slitte hvitevarer',
          '**Kan ikke trekkes:** oppgraderinger du ville gjort uansett før ny utleie',
          '**Kan ikke trekkes:** anslag uten dokumentasjon — krav bør bygge på tilbud eller kvittering',
        ],
      },
      {
        h2: 'Overtakelsesprotokollen avgjør saken',
        paragraphs: [
          'I nesten alle depositumstvister er det dokumentasjonen som avgjør, ikke argumentene. En overtakelsesprotokoll signert av begge parter ved innflytting, med daterte bilder av hvert rom, gjør en skadesak nesten selvforklarende. Mangler den, står påstand mot påstand — og da taper normalt den som krever.',
          'Gjør samme øvelse ved utflytting, i samme rekkefølge og med samme utsnitt. To sammenlignbare bildesett er mer overbevisende enn en lang skriftlig beskrivelse.',
        ],
        list: [
          'Fotografer alle rom, bad, kjøkken, gulv, vegger og hvitevarer ved innflytting',
          'Les av og noter strøm- og vannmålere',
          'Signer protokollen digitalt eller på papir — begge parter beholder kopi',
          'Gjenta ved utflytting og send bildene til leietaker samme dag',
        ],
      },
      {
        h2: 'Tidslinje: fra utflytting til utbetaling',
        list: [
          '**Dag 0:** utflytting og felles befaring med bilder',
          '**Dag 1–5:** utleier oppsummerer skriftlig hva som eventuelt kreves, med dokumentasjon',
          '**Ved enighet:** felles instruks til banken — utbetaling normalt innen få bankdager',
          '**Ved uenighet:** leietaker kan kreve utbetaling; banken varsler utleier',
          '**Innen fem uker etter bankens varsel:** utleier må dokumentere reist søksmål, ellers utbetales beløpet til leietaker',
          '**Deretter:** Husleietvistutvalget behandler kravet og avgjør fordelingen',
        ],
      },
      {
        h2: 'Hvis utleier ikke betaler tilbake',
        paragraphs: [
          'Som leietaker starter du med et skriftlig krav til utleier, med frist. Skjer ingenting, kan du kreve utbetaling direkte via banken, som da varsler utleier og setter fristen på fem uker i gang. Går det fortsatt ikke i orden, er Husleietvistutvalget riktig instans.',
          'Urettmessig tilbakehold kan i tillegg utløse krav om forsinkelsesrenter. Hold all kommunikasjon skriftlig, og ta vare på kontrakt, protokoll, bilder og kontoutskrifter.',
        ],
      },
      {
        h2: 'Slik unngår du konflikten som utleier',
        list: [
          'Send en skriftlig oppsummering av oppgjøret innen få dager etter utflytting',
          'Frigi den delen av depositumet det ikke er uenighet om',
          'Dokumenter hvert krav med tilbud, faktura eller kvittering',
          'Skill tydelig mellom slitasje og skade — og innrøm slitasje',
          'La forvalteren håndtere oppgjøret hvis du ikke ønsker diskusjonen selv — se [selvforvaltning eller full forvaltning](/guider/utleiemegler-vs-selvforvaltning)',
        ],
      },
    ],
    faqs: [
      { q: 'Når skal depositum tilbakebetales?', a: 'Ved enighet skal oppgjøret skje uten unødig opphold etter utflytting — partene instruerer banken sammen, og beløpet frigis normalt innen få bankdager. Loven setter ingen fast dagsfrist for denne situasjonen, men den gir ingen rett til å utsette uten saklig grunn.' },
      { q: 'Hvor lenge kan utleier holde tilbake depositum?', a: 'Bare så lenge det finnes et reelt krav, og innenfor lovens prosedyre. Krever leietaker utbetaling, varsler banken utleier, som har fem uker på å dokumentere at søksmål er reist — ellers utbetales beløpet til leietaker.' },
      { q: 'Kan utleier holde tilbake hele depositumet for et lite krav?', a: 'Det bør ikke gjøres. Den ryddige løsningen er å frigi det ubestridte beløpet og bare tviste om selve kravet. Å holde tilbake hele beløpet for et lite krav svekker saken og kan i seg selv utløse rentekrav.' },
      { q: 'Hva gjør jeg som leietaker hvis utleier ikke betaler tilbake?', a: 'Send skriftlig krav med frist. Skjer ingenting, kan du kreve utbetaling via banken, som varsler utleier og setter fem ukers fristen i gang. Blir det ikke løst, bringer du saken inn for Husleietvistutvalget.' },
      { q: 'Kan utleier trekke for rengjøring?', a: 'Bare hvis avtalen krever utvask og den faktisk ikke er utført, og kravet dokumenteres med kvittering på reell kostnad. Normalt rent etter kontraktsmessig bruk kan ikke trekkes.' },
      { q: 'Får leietaker rentene på depositumet ved utflytting?', a: 'Ja. Rentene tilhører leietaker gjennom hele leieforholdet og utbetales sammen med depositumet — se guiden om [depositumskonto](/guider/depositumskonto).' },
      { q: 'Hva koster det å ta saken til Husleietvistutvalget?', a: 'Husleietvistutvalget har et lavt behandlingsgebyr sammenlignet med domstolsbehandling, og du trenger ikke advokat. Kontroller gjeldende gebyr på htu.no før du sender inn.' },
    ],
    author: AUTHOR,
    reviewer: REVIEWER,
    sources: [LOV_35, HTU_DEP, HTU],
    related: ['depositum-regler', 'depositumskonto', 'leietaker-har-ikke-betalt-depositum'],
    cta: { label: 'Slipp depositumsdiskusjonene', href: '/bli-utleier' },
    disclaimer: true,
  },
];
