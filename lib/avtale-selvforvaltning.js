// ---------------------------------------------------------------------------
// Avtale om selvforvaltning — innholdet som vises i skjemaet (AvtaleArk) og på
// /avtale/selvforvaltning. Én kilde, to visninger.
//
// VIKTIG: Versjons-ID `selvforvaltning-2025-06` er kontrakten mot backend
// (lead.terms_accepted.version) og må ikke endres uten at backend/plattform
// oppdateres. Teksten under er et utkast i klart språk basert på det tjenesten
// faktisk lover (5 % av husleien, ingen bindingstid, kontrakt m/ BankID,
// husleieoppfølging, saker som krever eiers godkjenning). Den MÅ gjennomgås
// juridisk før produksjon — tidligere fantes det ingen avtaletekst bak lenken.
// ---------------------------------------------------------------------------

import { site } from '@/lib/site';

export const AVTALE_VERSJON = 'selvforvaltning-2025-06';

export const avtaleSelvforvaltning = {
  id: AVTALE_VERSJON,
  tittel: 'Avtale om selvforvaltning',
  versjonTekst: 'Versjon 2025-06',
  undertittel: `Mellom deg som utleier og ${site.legalName}`,

  /* Det viktigste på tjue sekunder. Ikke juridisk bindende i seg selv — avtalen under gjelder. */
  kortFortalt: [
    { t: 'Pris', d: '5 % av husleien. Ingen oppstartskostnad utover dette.' },
    { t: 'Bindingstid', d: 'Ingen. Du kan avslutte når du vil — leieforholdet ditt påvirkes ikke.' },
    { t: 'Hva du får', d: 'Leiekontrakt med BankID, husleie med oppfølging og purring, saker med leverandørforslag — i én portal.' },
    { t: 'Hva som er ditt', d: 'Du er utleier og part i leieavtalen. Kostnader og leverandører settes aldri i gang uten din godkjenning.' },
  ],

  seksjoner: [
    {
      n: '1', t: 'Partene',
      p: [
        `Avtalen inngås mellom ${site.legalName} (org.nr ${site.orgNr}), ${site.address.street}, ${site.address.postal} ${site.address.city} («DigiHome») og den som registrerer seg som utleier i DigiHome — en privatperson eller et selskap («Utleier»).`,
        'Registrerer du på vegne av et selskap, bekrefter du at du har fullmakt til å inngå avtalen for selskapet.',
      ],
    },
    {
      n: '2', t: 'Tjenesten',
      p: [
        'Selvforvaltning er en digital tjeneste der Utleier selv leier ut boligen, med DigiHome som verktøy for det praktiske. Tjenesten omfatter:',
      ],
      liste: [
        'digital leiekontrakt med signering via BankID',
        'registrering og oppfølging av husleie, inkludert automatiske betalingsvarsler og purring',
        'mottak og håndtering av henvendelser fra leietaker',
        'saker om vedlikehold og feil, med forslag til leverandør og pris som Utleier godkjenner før noe bestilles',
        'dokumenter, historikk og oversikt over leieforholdet i portalen',
      ],
      etter: [
        'DigiHome er ikke part i leieavtalen mellom Utleier og leietaker. Leieforholdet reguleres av husleieloven og den enkelte leieavtalen.',
      ],
    },
    {
      n: '3', t: 'Pris og betaling',
      p: [
        'For tjenesten betaler Utleier 5 % av husleien for leieforhold som administreres gjennom DigiHome. Det er ingen etableringskostnad og ingen faste månedsgebyrer utover dette.',
        'Kostnader til leverandører (for eksempel rørlegger eller renhold) er ikke inkludert, og påløper bare når Utleier har godkjent den konkrete saken med pris.',
      ],
    },
    {
      n: '4', t: 'Utleiers ansvar',
      p: [
        'Utleier er ansvarlig for at opplysningene om bolig, leieforhold og kontaktinformasjon er riktige, og for å holde påloggingen sikker.',
        'Utleier har det juridiske ansvaret som utleier etter husleieloven, herunder for boligens stand, depositum og avslutning av leieforholdet. DigiHome tilrettelegger og varsler, men treffer ingen beslutninger som koster penger uten Utleiers godkjenning.',
      ],
    },
    {
      n: '5', t: 'DigiHomes ansvar',
      p: [
        'DigiHome skal levere tjenesten med rimelig aktsomhet og etterstrebe høy oppetid. Tjenesten leveres likevel «som den er», og DigiHome kan ikke garantere at den alltid er feilfri eller tilgjengelig.',
        'DigiHome er ikke ansvarlig for indirekte tap. Samlet ansvar er begrenset til det som følger av ufravikelig norsk lov.',
      ],
    },
    {
      n: '6', t: 'Varighet og oppsigelse',
      p: [
        'Avtalen løper fra registrering og har ingen bindingstid. Utleier kan avslutte når som helst fra portalen eller ved å kontakte DigiHome. Avslutning påvirker ikke løpende leieavtaler mellom Utleier og leietaker.',
        'DigiHome kan avslutte avtalen ved vesentlig brudd, eller med rimelig varsel dersom tjenesten legges ned. Påløpt vederlag frem til avslutning betales som avtalt.',
      ],
    },
    {
      n: '7', t: 'Personopplysninger',
      p: [
        'DigiHome behandler personopplysninger om Utleier og leietaker for å levere tjenesten, i samsvar med personvernerklæringen på digihome.no/personvern. Leietakers opplysninger behandles på vegne av Utleier der Utleier er ansvarlig etter loven.',
      ],
    },
    {
      n: '8', t: 'Endringer',
      p: [
        'DigiHome kan endre avtalen og prisen med minst 30 dagers varsel i portalen eller på e-post. Ønsker Utleier ikke å fortsette på nye vilkår, kan avtalen avsluttes uten kostnad før endringen trer i kraft.',
      ],
    },
    {
      n: '9', t: 'Lovvalg og tvister',
      p: [
        'Avtalen reguleres av norsk rett. Uenighet søkes løst i minnelighet. Hvis det ikke lykkes, er Bergen tingrett verneting.',
      ],
    },
  ],
};
