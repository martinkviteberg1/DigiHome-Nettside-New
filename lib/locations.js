// Lokasjonsdata for programmatiske SEO-sider (/utleie/[by]).
// VIKTIG: Hver lokasjon har genuint unikt, lokalt innhold (marked, profil, FAQ)
// for å gi reell verdi og unngå Googles "scaled content abuse"-straff.
// Dekker i dag Bergen + bydeler (der DigiHome faktisk forvalter). Utvides med
// nye byer i takt med franchise-vekst.

const U = (id, pexels = false) =>
  pexels
    ? `${id}?auto=compress&cs=tinysrgb&w=1600`
    : `${id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80`;

const IMG = {
  panorama: U('https://images.unsplash.com/photo-1580946443359-1126222f9224'),
  bryggen: U('https://images.unsplash.com/photo-1609951022212-7aff21c1ab1f'),
  boats: U('https://images.pexels.com/photos/6291547/pexels-photo-6291547.jpeg', true),
  spires: U('https://images.pexels.com/photos/33583897/pexels-photo-33583897.jpeg', true),
  woodhouse: U('https://images.pexels.com/photos/11622889/pexels-photo-11622889.jpeg', true),
  modern: U('https://images.unsplash.com/photo-1696454596382-df8fd11ba53b'),
};

export const locations = [
  {
    slug: 'bergen',
    name: 'Bergen',
    type: 'by',
    region: 'Vestland',
    image: IMG.panorama,
    tagline: 'Eiendomsforvaltning i hele Bergen',
    intro:
      'Bergen er et av Norges sterkeste leiemarkeder, drevet av studenter, helsepersonell, offshore-pendlere og et voksende reiseliv. DigiHome forvalter boliger i alle bydeler — fra historiske trehus på Nordnes til moderne leiligheter i Åsane — og kombinerer langtids- og korttidsutleie for å hente ut maksimal avkastning året rundt.',
    market: { avgRent: '14 000–27 000 kr/mnd', demand: 'Svært høy', popularTypes: ['Leilighet', 'Hybel', 'Rekkehus'], note: 'Sterk sesongtopp om sommeren (turisme) og ved studiestart i august.' },
    highlights: [
      { title: 'Hele byen, ett team', body: 'Vi forvalter eiendommer i alle Bergens bydeler med lokal markedskunnskap i hvert nabolag.' },
      { title: 'Hybrid 10+2-modell', body: 'Langtidsleie 10 måneder + korttid i to høysesongmåneder gir opptil 30 % høyere inntekt enn ren langtidsutleie.' },
      { title: 'Komplett drift', body: 'Annonsering, prising, visninger, kontrakter, husleie, renhold og vedlikehold — alt samlet på én plattform.' },
    ],
    tenantProfile: 'Studenter, unge profesjonelle, helsepersonell, pendlere og tilreisende på korttidsopphold.',
    faq: [
      { q: 'Hvilke områder i Bergen dekker DigiHome?', a: 'Vi forvalter boliger i hele Bergen, inkludert Sentrum, Nordnes, Sandviken, Møhlenpris, Åsane, Fana og Laksevåg.' },
      { q: 'Hva er en typisk leiepris i Bergen?', a: 'Leieprisene i Bergen varierer fra rundt 14 000 kr/mnd for mindre leiligheter til 27 000 kr/mnd og mer for større, sentrale boliger — avhengig av bydel, størrelse og standard.' },
      { q: 'Er korttidsutleie lønnsomt i Bergen?', a: 'Ja. Bergen har en sterk turistsesong om sommeren og høy etterspørsel rundt arrangementer og studiestart, noe som gjør korttidsutleie svært lønnsomt i deler av året — spesielt sentralt.' },
    ],
    geo: { lat: 60.3913, lng: 5.3221 },
  },
  {
    slug: 'sentrum',
    name: 'Bergen sentrum',
    type: 'bydel',
    parent: 'bergen',
    region: 'Bergen',
    image: IMG.bryggen,
    tagline: 'Maksimal etterspørsel i hjertet av byen',
    intro:
      'Bergen sentrum — med Bryggen, Torgallmenningen og Festplassen — er byens mest ettertraktede leieområde. Nærhet til jobb, uteliv, kultur og kollektivknutepunkt gir konstant høy etterspørsel året rundt, og er ideelt for den lønnsomme hybridmodellen med korttidsutleie i høysesong.',
    market: { avgRent: '16 000–28 000 kr/mnd', demand: 'Svært høy', popularTypes: ['Leilighet', 'Loft', 'Studio'], note: 'Korttidsutleie skinner her — turister og forretningsreisende betaler en betydelig premie sentralt.' },
    highlights: [
      { title: 'Premium korttidsutleie', body: 'Sentrale boliger oppnår høye døgnpriser via Airbnb og Booking.com i sommer- og arrangementssesong.' },
      { title: 'Alltid utleid', body: 'Kort vei til UiB, sykehus og næringsliv betyr svært lav ledighet på langtidskontrakter.' },
      { title: 'Profesjonell styling', body: 'Vi fotograferer og styler boligen for å skille seg ut i et konkurranseutsatt sentrumsmarked.' },
    ],
    tenantProfile: 'Forretningsreisende, turister, unge profesjonelle og studenter som vil bo midt i smørøyet.',
    faq: [
      { q: 'Lønner korttidsutleie seg i Bergen sentrum?', a: 'Svært godt. Sentrum har høyest døgnpriser i byen i turistsesongen, og DigiHomes hybridmodell kombinerer dette med trygg langtidsinntekt resten av året.' },
      { q: 'Hvor høy er etterspørselen etter leie i sentrum?', a: 'Etterspørselen er svært høy hele året på grunn av nærhet til arbeidsplasser, universitet og uteliv — ledigheten er minimal.' },
      { q: 'Hvilke boligtyper er mest utleievennlige i sentrum?', a: 'Kompakte leiligheter, studioer og loft er mest etterspurt, både for langtids- og korttidsutleie.' },
    ],
    geo: { lat: 60.3929, lng: 5.3242 },
  },
  {
    slug: 'nordnes',
    name: 'Nordnes',
    type: 'bydel',
    parent: 'bergen',
    region: 'Bergen',
    image: IMG.spires,
    tagline: 'Sjarmerende halvøy med høy bostatus',
    intro:
      'Nordnes er en av Bergens mest sjarmerende og ettertraktede halvøyer, kjent for trange brosteinsgater, fargerike trehus, akvariet og sjøutsikt. Området tiltrekker seg veletablerte leietakere som verdsetter rolige omgivelser kombinert med gangavstand til sentrum.',
    market: { avgRent: '15 000–25 000 kr/mnd', demand: 'Høy', popularTypes: ['Trehusleilighet', 'Leilighet'], note: 'Stabil, kvalitetsbevisst leietakergruppe — lav gjennomtrekk og lange leieforhold.' },
    highlights: [
      { title: 'Attraktiv beliggenhet', body: 'Sjøutsikt, ro og gangavstand til sentrum gjør Nordnes-boliger svært ettertraktet.' },
      { title: 'Stabile leieforhold', body: 'Området tiltrekker seg ressurssterke leietakere som blir boende lenge — minimal ledighet.' },
      { title: 'Varsom forvaltning', body: 'Vi forvalter de karakteristiske trehusene med respekt for byggets sjel og krav.' },
    ],
    tenantProfile: 'Etablerte profesjonelle, par og mindre familier som ønsker sjarm og ro nær sentrum.',
    faq: [
      { q: 'Hva kjennetegner leiemarkedet på Nordnes?', a: 'Nordnes har stabil og høy etterspørsel fra kvalitetsbevisste leietakere, lav gjennomtrekk og relativt lange leieforhold.' },
      { q: 'Passer Nordnes for korttidsutleie?', a: 'Nordnes egner seg godt for korttidsutleie i sommersesongen takket være sjarmen og nærheten til sentrum, men hovedvekten ligger ofte på stabil langtidsutleie.' },
      { q: 'Kan dere forvalte eldre trehus på Nordnes?', a: 'Ja. Vi har erfaring med å forvalte de karakteristiske trehusene og ivaretar både vedlikehold og leietakeroppfølging.' },
    ],
    geo: { lat: 60.3997, lng: 5.3079 },
  },
  {
    slug: 'sandviken',
    name: 'Sandviken',
    type: 'bydel',
    parent: 'bergen',
    region: 'Bergen',
    image: IMG.woodhouse,
    tagline: 'Historisk sjøfront med familievennlig profil',
    intro:
      'Sandviken strekker seg langs sjøen nord for sentrum, med vernede sjøboder, hvite trehus og en avslappet, familievennlig atmosfære. Området er populært blant barnefamilier og profesjonelle som ønsker plass og natur uten å gi slipp på bynærheten.',
    market: { avgRent: '15 000–24 000 kr/mnd', demand: 'Høy', popularTypes: ['Leilighet', 'Rekkehus', 'Trehusleilighet'], note: 'Familievennlig — etterspørsel etter større boliger med flere soverom.' },
    highlights: [
      { title: 'Familievennlig', body: 'Skoler, barnehager og turområder gjør Sandviken attraktivt for langtidsleie til familier.' },
      { title: 'Sjønære boliger', body: 'Boliger med sjøutsikt og brygge oppnår en tydelig leiepremie i området.' },
      { title: 'Lange kontrakter', body: 'Familieleietakere gir forutsigbar, langsiktig inntekt med lav gjennomtrekk.' },
    ],
    tenantProfile: 'Barnefamilier og profesjonelle som ønsker plass, natur og bynærhet.',
    faq: [
      { q: 'Hvem leier vanligvis i Sandviken?', a: 'Sandviken tiltrekker seg særlig barnefamilier og profesjonelle som verdsetter plass, sjønærhet og rolige omgivelser nær sentrum.' },
      { q: 'Er større boliger lett å leie ut i Sandviken?', a: 'Ja. Det er god etterspørsel etter rekkehus og leiligheter med flere soverom, og familieleietakere gir ofte lange, stabile leieforhold.' },
      { q: 'Hva er typisk leiepris i Sandviken?', a: 'Leieprisene ligger typisk mellom 15 000 og 24 000 kr/mnd, avhengig av størrelse, standard og sjønærhet.' },
    ],
    geo: { lat: 60.4109, lng: 5.3197 },
  },
  {
    slug: 'mohlenpris',
    name: 'Møhlenpris',
    type: 'bydel',
    parent: 'bergen',
    region: 'Bergen',
    image: IMG.boats,
    tagline: 'Urbant studentnabolag tett på UiB',
    intro:
      'Møhlenpris er et tett, urbant nabolag mellom sentrum og Universitetet i Bergen, dominert av karakteristiske murgårder fra tidlig 1900-tall. Nærheten til UiB og Høgskulen gjør området til et av byens sterkeste markeder for hybler og kollektiv.',
    market: { avgRent: '8 000–18 000 kr/mnd', demand: 'Svært høy', popularTypes: ['Hybel', 'Kollektiv', 'Leilighet'], note: 'Studentdrevet — ekstrem etterspørsel ved studiestart i august.' },
    highlights: [
      { title: 'Studentmagnet', body: 'Gangavstand til UiB gir konstant tilstrømning av studentleietakere, særlig ved semesterstart.' },
      { title: 'Høy avkastning per m²', body: 'Hybler og kollektiv gir ofte høyere leieinntekt per kvadratmeter enn vanlige leiligheter.' },
      { title: 'Effektiv utleie', body: 'Vi fyller boliger raskt før studiestart og håndterer hyppigere leietakerskifter sømløst.' },
    ],
    tenantProfile: 'Studenter ved UiB og Høgskulen, samt unge i etableringsfasen.',
    faq: [
      { q: 'Er Møhlenpris bra for utleie til studenter?', a: 'Ja — Møhlenpris er et av Bergens sterkeste studentområder takket være gangavstand til UiB, med svært høy etterspørsel etter hybler og kollektiv ved studiestart.' },
      { q: 'Gir hybler høyere avkastning?', a: 'Ofte ja. Hybler og kollektiv kan gi høyere leieinntekt per kvadratmeter, men krever mer aktiv forvaltning — som DigiHome håndterer for deg.' },
      { q: 'Når er etterspørselen høyest på Møhlenpris?', a: 'Etterspørselen topper seg rundt studiestart i august, men er høy gjennom hele studieåret.' },
    ],
    geo: { lat: 60.3845, lng: 5.3203 },
  },
  {
    slug: 'asane',
    name: 'Åsane',
    type: 'bydel',
    parent: 'bergen',
    region: 'Bergen',
    image: IMG.modern,
    tagline: 'Moderne boliger med plass og vekst',
    intro:
      'Åsane er en av Bergens største og raskest voksende bydeler, med moderne leilighetskomplekser, gode kjøpesentre og enkel tilkomst via bybanen som er under utbygging. Området tiltrekker seg familier og pendlere som ønsker mer plass for pengene.',
    market: { avgRent: '12 000–20 000 kr/mnd', demand: 'Moderat til høy', popularTypes: ['Leilighet', 'Rekkehus'], note: 'Vekstområde — bybaneutbygging løfter etterspørselen fremover.' },
    highlights: [
      { title: 'Mer plass for pengene', body: 'Moderne, romslige boliger til lavere kvadratmeterpris enn sentrum — attraktivt for familier.' },
      { title: 'Vekst og infrastruktur', body: 'Bybaneutbyggingen mot Åsane forventes å løfte både etterspørsel og leiepriser.' },
      { title: 'Lavt vedlikehold', body: 'Nyere bygg betyr mindre vedlikehold og mer forutsigbar drift for utleier.' },
    ],
    tenantProfile: 'Barnefamilier og pendlere som prioriterer plass, standard og pris.',
    faq: [
      { q: 'Er Åsane et godt område for utleie?', a: 'Ja. Åsane er en bydel i vekst med moderne boliger, god etterspørsel fra familier og pendlere, og fremtidig løft fra bybaneutbyggingen.' },
      { q: 'Hvorfor velge Åsane fremfor sentrum?', a: 'Du får mer plass og standard per krone, lavere vedlikehold på nyere bygg, og en stabil familie-leietakergruppe.' },
      { q: 'Hva er typisk leiepris i Åsane?', a: 'Leieprisene ligger typisk mellom 12 000 og 20 000 kr/mnd avhengig av størrelse og standard.' },
    ],
    geo: { lat: 60.4659, lng: 5.3261 },
  },
  {
    slug: 'fana',
    name: 'Fana',
    type: 'bydel',
    parent: 'bergen',
    region: 'Bergen',
    image: IMG.modern,
    tagline: 'Grønne, attraktive boligområder i sør',
    intro:
      'Fana i sør er kjent for grønne omgivelser, villabebyggelse og attraktive boligområder som Nesttun, Paradis og Hop — alle betjent av bybanen mot sentrum. Området er svært populært blant etablerte familier som ønsker ro, natur og gode oppvekstvilkår.',
    market: { avgRent: '14 000–23 000 kr/mnd', demand: 'Høy', popularTypes: ['Enebolig', 'Rekkehus', 'Leilighet'], note: 'Bybanen gjør pendling enkelt — sterk etterspørsel langs traséen.' },
    highlights: [
      { title: 'Bybane til sentrum', body: 'Områder langs bybanen (Nesttun, Paradis, Hop) har særlig høy og stabil etterspørsel.' },
      { title: 'Familiefokus', body: 'Gode skoler og grøntområder gir lange, stabile leieforhold med familier.' },
      { title: 'Større boliger', body: 'God etterspørsel etter eneboliger og rekkehus med hage og flere soverom.' },
    ],
    tenantProfile: 'Etablerte familier som ønsker ro, natur og enkel pendling via bybanen.',
    faq: [
      { q: 'Hvorfor er Fana attraktivt for utleie?', a: 'Fana kombinerer grønne omgivelser, gode skoler og bybane til sentrum, noe som gir stabil etterspørsel fra familier — særlig langs bybanetraséen.' },
      { q: 'Hvilke boliger er mest etterspurt i Fana?', a: 'Eneboliger, rekkehus og leiligheter med flere soverom og nærhet til bybanen er mest ettertraktet.' },
      { q: 'Er leieforholdene stabile i Fana?', a: 'Ja. Familieleietakere i Fana blir ofte boende lenge, noe som gir forutsigbar inntekt og lav ledighet.' },
    ],
    geo: { lat: 60.3247, lng: 5.3517 },
  },
  {
    slug: 'laksevag',
    name: 'Laksevåg',
    type: 'bydel',
    parent: 'bergen',
    region: 'Bergen',
    image: IMG.boats,
    tagline: 'Bydel i utvikling rett over vannet',
    intro:
      'Laksevåg ligger like vest for sentrum, på andre siden av Puddefjorden, og er en bydel i tydelig utvikling. Med kort vei til sentrum, nye boligprosjekter og mer overkommelige priser tiltrekker området seg stadig flere unge kjøpere og leietakere.',
    market: { avgRent: '11 000–19 000 kr/mnd', demand: 'Moderat til høy', popularTypes: ['Leilighet', 'Rekkehus'], note: 'Prisgunstig vekstområde — god yield for utleiere som er tidlig ute.' },
    highlights: [
      { title: 'God yield', body: 'Lavere inngangspris kombinert med bynærhet gir attraktiv direkteavkastning for utleiere.' },
      { title: 'Tett på sentrum', body: 'Bare minutter fra Bergen sentrum over Puddefjordsbroen — populært blant unge leietakere.' },
      { title: 'Vekstpotensial', body: 'Nye boligprosjekter og områdeløft peker mot stigende etterspørsel og verdivekst.' },
    ],
    tenantProfile: 'Unge profesjonelle og førstegangsleietakere som vil bo bynært til en lavere pris.',
    faq: [
      { q: 'Er Laksevåg et godt sted å investere i utleie?', a: 'Laksevåg er et prisgunstig vekstområde med kort vei til sentrum, noe som kan gi god direkteavkastning for utleiere som er tidlig ute.' },
      { q: 'Hvem leier i Laksevåg?', a: 'Området tiltrekker seg særlig unge profesjonelle og førstegangsleietakere som ønsker bynær beliggenhet til en lavere pris enn sentrum.' },
      { q: 'Hva er typisk leiepris i Laksevåg?', a: 'Leieprisene ligger typisk mellom 11 000 og 19 000 kr/mnd, ofte rimeligere enn sentrale bydeler.' },
    ],
    geo: { lat: 60.3819, lng: 5.2861 },
  },
];

export function getLocation(slug) {
  return locations.find((l) => l.slug === slug) || null;
}

export function relatedLocations(slug, n = 3) {
  return locations.filter((l) => l.slug !== slug && l.type === 'bydel').slice(0, n);
}
