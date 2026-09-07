'use client';

import React from 'react';
import NavV4 from '../NavV4';
import Footer from '@/components/dh/Footer';
import { T } from '../motion';
import TillitStripe from '../TillitStripe';
import StegSeksjon from '../StegSeksjon';
import FaqSeksjon from '../FaqSeksjon';
import AvslutningSeksjon from '../AvslutningSeksjon';
import { ForvaltningHero, LofteSeksjon, TeamSeksjon, PRIS_SVAR } from './ForvaltningDeler';
import EierSitater from './EierSitater';

/* ---------------------------------------------------------------------------
   ForvaltningV4 — undersiden for full forvaltning.

   Privat og bedrift er programvare: systemet gjør jobben, du godkjenner.
   Forvaltning er en tjeneste: MENNESKER hos DigiHome gjør jobben, med samme
   system som ryggrad — og du ser alt som skjer. Løftet er derfor ikke
   «autopilot», men arbeidsdelingen: «Vi tar jobben. Du bestemmer.»

   Rekkefølge: hero (én mørk flate: løftet + måneden som spiller + rollene) →
   logoene → arbeidsdelingen (vi / du) → teamet (én fast forvalter, et helt
   team bak — roller, ikke én navngitt person) → fra eierne (ett sitat om
   gangen) → slik kommer du i gang → spørsmål og svar → avslutning.

   Kun Bergen og omegn. Aldri pris (avtales individuelt), ingen løfter om
   avkastning. Handlingen er et uforpliktende tilbud — eller en samtale.
--------------------------------------------------------------------------- */

const STEG = [
  { nr: '1', t: 'Samtalen', d: 'Tjue minutter om boligen, leietakeren og hva du vil ha hjelp med.' },
  { nr: '2', t: 'Tilbudet', d: 'Innen 24 timer: omfang og pris, svart på hvitt. Ingen bindingstid.' },
  { nr: '3', t: 'Overtakelsen', d: 'Vi henter nøkler, dokumenterer boligen og setter den opp i systemet.' },
  { nr: '4', t: 'Rolig', d: 'Husleie, saker og rapport går. Du hører fra forvalteren din når det betyr noe.' },
];

const SPORSMAL = [
  { q: 'Hva koster full forvaltning?', a: null },
  { q: 'Hva bestemmer jeg selv?', a: 'Hvem som flytter inn, husleie og vilkår, og alle kostnader over grensen du selv setter. Vi anbefaler og forbereder — du godkjenner. Vil du bo der selv eller selge, sier du fra. Ingen bindingstid.' },
  { q: 'Hvor tilbyr dere full forvaltning?', a: 'Bergen og omegn. Leier du ut andre steder, kan du bruke DigiHome som system og leie ut selv — med samme kontrakt, husleieoppfølging og saker.' },
  { q: 'Hvem er kontaktpersonen min?', a: 'Du får én fast forvalter — ett navn og ett nummer, ikke et kundesenter. Forvalteren kjenner boligen, leietakeren og det som er avtalt, og har vaktmester, renhold og DigiHome-systemet i ryggen. Hvem du får, avtaler vi når du starter.' },
  { q: 'Hva skjer når leietakeren melder fra om noe?', a: 'Meldingen går til oss. Vi vurderer saken, henter pris og følger opp håndverkeren til det er løst. Koster det mer enn grensen du har satt, spør vi deg først.' },
  { q: 'Kan jeg begynne med selvforvaltning og bytte senere?', a: 'Ja. Det er samme system under. Bytter du, tar vi over der du er — boligen, kontrakten og historikken blir med.' },
  { q: 'Er det bindingstid?', a: 'Nei. Du kan si opp når du vil. Boligen, kontrakten og historikken ligger i DigiHome og blir med deg videre.' },
];

const AVSLUTNING_STEG = [
  ['1', 'Samtalen', 'Tjue minutter om boligen og hva du vil ha hjelp med.'],
  ['2', 'Tilbudet', 'Omfang og pris innen 24 timer. Ingen bindingstid.'],
  ['3', 'Overtakelsen', 'Vi henter nøkler og setter boligen opp. Så er den vår å drive — og din å bestemme over.'],
];

export default function ForvaltningV4() {
  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="forvaltning-v4">
      <NavV4 />
      <main>
        <ForvaltningHero />
        <TillitStripe />
        <LofteSeksjon />
        <TeamSeksjon />
        <EierSitater />
        <StegSeksjon tittel={['Slik kommer', 'du i gang.']} under="Én samtale. Ett tilbud. Så tar vi over." steg={STEG} person={null} testid="v4f" />
        <FaqSeksjon sporsmal={SPORSMAL} prisSvar={PRIS_SVAR} />
        <AvslutningSeksjon
          tittel="Overlat utleien. Behold kontrollen"
          under="Én samtale. Tilbud innen 24 timer. Ingen bindingstid."
          handling={{ knapp: { href: '/bli-utleier/start?tier=full_forvaltning', tekst: 'Få et uforpliktende tilbud' }, lenke: { href: '/book-mote', tekst: 'Book en samtale' } }}
          steg={AVSLUTNING_STEG}
        />
      </main>
      <Footer />
    </div>
  );
}
