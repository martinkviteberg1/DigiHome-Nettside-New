'use client';

import React from 'react';
import { EASE, T, tall } from '../../motion';
import { Hake, Portrett, useFilm, BOLIG, EMMA } from '../filmdeler';
import { bilde, dekk, useKino, farger, KinoStage, KinoTekst, Etikett, Flyt, Fold, Rad, Sone, Merke, KinoNeste, KinoKnapp, KinoSms } from './Kino';

/* ---------------------------------------------------------------------------
   DriftKino — kapittel 3 i full bleed. «Fra melding til løst. Du trykker én gang.»

   Bygården om natten, ett vindu tent: Leilighet 2, der Emma bor. Etiketten på
   vinduet er den samme som i Annonse — her leser den «Leilighet 2 · Emma», og til
   slutt «Løst · torsdag 09:58». Emmas melding kommer rett på fotoet, blir en sak,
   rørleggeren svarer med tid og pris, eieren godkjenner — én gang. Så blir det
   morgen: fasaden tones fra natt til dag, teksten fra offwhite til blekk.

   DigiHome tar ikke over ansvaret — den sorterer, koordinerer og lar eieren
   bestemme med ett trykk.
--------------------------------------------------------------------------- */

const FASE_NAVN = ['START', 'MELD', 'SPM', 'SVAR', 'SAK', 'DETALJ', 'LEV0', 'LEV1', 'KLAR', 'TRYKK', 'GODKJENT', 'SMS', 'NATT', 'TID', 'UTFORT', 'TAKK', 'FAKTURA', 'SLUTT'];
const F = Object.fromEntries(FASE_NAVN.map((n, i) => [n, i]));
const AUTO = {
  [F.START]: 1600, [F.MELD]: 2200, [F.SPM]: 1400, [F.SVAR]: 1300,
  [F.SAK]: 1500, [F.DETALJ]: 1300,
  [F.LEV0]: 1400, [F.LEV1]: 2200,
  [F.KLAR]: 1600, [F.TRYKK]: 380, [F.GODKJENT]: 2000,
  [F.SMS]: 2200, [F.NATT]: 900,
  [F.TID]: 2000, [F.UTFORT]: 1900, [F.TAKK]: 1600, [F.FAKTURA]: 2000,
  [F.SLUTT]: 4400,
};
const SISTE = F.SLUTT;

const BILDER = [
  bilde('natt', '/v4/drift/fasade-natt-1920.webp', '/v4/drift/fasade-natt-1200.webp', 1920, 1097, '56% 46%', '70% 50%'),
  bilde('morgen', '/v4/drift/fasade-morgen-1920.webp', '/v4/drift/fasade-morgen-1200.webp', 1920, 1097, '56% 46%', '70% 50%'),
];
const K = Object.fromEntries(BILDER.map((b) => [b.id, b]));
const erMorgen = (fase) => fase >= F.TID;
const bildeFor = (fase) => (erMorgen(fase) ? 'morgen' : 'natt');
const temaFor = (fase) => (erMorgen(fase) ? 'lys' : 'mork');

/* Vinduet til Leilighet 2 i fasadebildet (andel av bildet) */
const VINDU = { x: 0.755, y: 0.57 };

const AKTER = [
  { id: 'meld', fra: F.START, tittel: 'Emma melder fra.', tekst: '22:41. Leietakeren skriver i DigiHome og legger ved et bilde. Ett oppfølgingsspørsmål avgrenser feilen — før noen rekker å ringe deg.' },
  { id: 'sak', fra: F.SAK, tittel: 'Meldingen blir en sak.', tekst: 'Bolig, leietaker, kategori og hastegrad settes fra samtalen. Du får en ferdig sortert sak — ikke en melding du må tolke.' },
  { id: 'lev', fra: F.LEV0, tittel: 'Rørleggeren får saken.', tekst: 'Rørleggeren du bruker får bildet og beskrivelsen direkte — og svarer med tidsvindu og pris, rett i saken.' },
  { id: 'god', fra: F.KLAR, tittel: 'Du godkjenner. Én gang.', tekst: 'Hvem, når og hva det koster står på ett sted. Ett trykk — så går resten av seg selv.' },
  { id: 'sms', fra: F.SMS, tittel: 'Emma får beskjed.', tekst: 'Tidspunktet går til Emma automatisk. Hun bekrefter, og rørleggeren vet at han slipper inn torsdag morgen.' },
  { id: 'tid', fra: F.TID, tittel: 'Torsdag: utført og dokumentert.', tekst: 'Rørleggeren kvitterer med bilde. Emma bekrefter at vannet er varmt. Fakturaen legger seg i saken — og i regnskapet.' },
  { id: 'slutt', fra: F.SLUTT, tittel: 'Løst. Du ringte ingen.', tekst: 'Én melding, ett trykk. Saken ligger i historikken med bilder, pris og faktura — klar for regnskapet.' },
];
const aktFor = (fase) => { let a = AKTER[0]; AKTER.forEach((x) => { if (fase >= x.fra) a = x; }); return a; };

const JONAS = { navn: 'Jonas Lie', rolle: 'Rørlegger · Lie VVS', bilde: '/v4/jonas.webp' };
const PRIS = 3900;
const BEREDER = '/v4/bereder-3x4.webp';

/* Etiketten på vinduet gjennom filmen */
function naal(fase) {
  if (fase >= F.SLUTT) return { t: 'Løst · torsdag 09:58', tone: 'gronn' };
  if (fase >= F.TAKK) return { t: 'Emma: «Varmt vann igjen. Takk!»', tone: 'emma' };
  if (fase >= F.TID) return { t: 'Leilighet 2 · rørlegger inne', tone: 'lilla' };
  if (fase >= F.SMS + 1) return { t: 'Emma: «Passer fint.»', tone: 'emma' };
  return { t: 'Leilighet 2 · Emma', tone: 'lilla' };
}

function Vindu({ fase, ov }) {
  const st = useKino();
  const g = dekk(st, K[bildeFor(fase)]);
  if (!g) return null;
  const p = g.punkt(VINDU.x, VINDU.y);
  const { t, tone } = naal(fase);
  /* På mobil ligger sonen der vinduet er — etiketten vises bare når sonen er tom */
  const vis = !st.kompakt || fase === F.START || fase >= F.SLUTT;
  const plass = st.kompakt ? 'venstre' : 'over';
  return <Etikett vis={vis} x={p.x} y={p.y} tone={tone} plass={plass} delay={fase === F.START ? 700 : 0} ov={ov} testid="v4-kino-vindu"><span key={t} className="animate-in fade-in-0 duration-500">{t}</span></Etikett>;
}

/* Chat-boble — Emma (venstre, portrett) eller DigiHome (høyre) */
function Boble({ vis, ov, delay = 0, fra = 'emma', tid, children, bilde: foto, testid }) {
  const { tema, kompakt } = useKino();
  const f = farger(tema);
  const emma = fra === 'emma';
  return (
    <Flyt vis={vis} ov={ov} delay={delay} className={`flex items-end gap-2.5 ${emma ? '' : 'justify-end'} mt-2.5`} testid={testid}>
      {emma && <Portrett src={EMMA.bilde} alt={EMMA.navn} size={26} />}
      <div className={`max-w-[86%] rounded-[16px] px-3.5 py-2.5 ${emma ? 'rounded-bl-[6px]' : 'rounded-br-[6px]'}`} style={{ background: emma ? (f.ink ? 'rgba(21,19,15,0.06)' : 'rgba(244,241,234,0.12)') : 'rgba(212,150,255,0.22)', boxShadow: `inset 0 0 0 1px ${f.hair}` }}>
        {foto && (
          <div className="mb-2 overflow-hidden rounded-[8px]" style={{ width: kompakt ? 64 : 76, aspectRatio: '3 / 4' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt="" className="h-full w-full object-cover" draggable={false} />
          </div>
        )}
        <p className={`${kompakt ? 'text-[13px]' : 'text-[13.5px]'} leading-[1.45]`} style={{ color: f.brod }}>{children}</p>
        {tid && <p className="mt-1 text-[11px] tabular-nums" style={{ color: f.svak }}>{tid}</p>}
      </div>
    </Flyt>
  );
}

/* ── 1. Meldingen ── */
function Melding({ fase, ov, anker }) {
  const vis = fase >= F.MELD && fase <= F.SVAR;
  return (
    <Sone testid="v4-kino-d-melding" bredde={420} anker={anker} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Boble vis={fase >= F.MELD} ov={ov} fra="emma" tid="22:41" bilde={BEREDER} testid="v4-kino-melding-1">Hei! Varmtvannet er borte. Har prøvd å slå berederen av og på, men ingenting skjer.</Boble>
      <Boble vis={fase >= F.SPM} ov={ov} fra="dh" tid="22:41 · DigiHome" testid="v4-kino-melding-2">Er det kaldt i alle kraner, eller bare på badet?</Boble>
      <Boble vis={fase >= F.SVAR} ov={ov} fra="emma" tid="22:42" testid="v4-kino-melding-3">Alle.</Boble>
    </Sone>
  );
}

/* ── 2. Saken · 3. Rørleggeren · 4. Godkjenn · 5. SMS ── */
function Sak({ fase, ov, anker }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.SAK && fase <= F.NATT;
  const RADER = [
    { k: 'Bolig', v: `${BOLIG.adresse}, ${BOLIG.enhet.toLowerCase()}`, d: 0 },
    { k: 'Leietaker', v: EMMA.navn, d: 160 },
    { k: 'Kategori', v: 'VVS · varmtvann', d: 320 },
    { k: 'Hastegrad', v: 'Høy · i kveld', d: 480 },
  ];
  const godkjent = fase >= F.GODKJENT;
  return (
    <Sone testid="v4-kino-d-sak" bredde={460} anker={anker} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Flyt vis={vis} ov={ov}><p className="inline-flex items-center gap-2 text-[12.5px] font-medium tabular-nums" style={{ color: f.svak }}>Sak · Nygårdsgaten 5 {fase >= F.DETALJ && <Merke tekst={godkjent ? 'Godkjent 22:58' : 'Opprettet 22:42'} tone={godkjent ? 'gronn' : 'noytral'} />}</p></Flyt>
      <div className="mt-2">
        {/* På mobil klappes saksradene sammen når SMS-en kommer — én ting om gangen */}
        <Fold open={!kompakt || fase < F.SMS} ov={ov}>
          {RADER.map((r, i) => (
            <Rad key={r.k} vis={vis} ov={ov} delay={200 + r.d} sist={false} testid={`v4-kino-sak-${i}`}
              venstre={<span className={kompakt ? 'text-[12.5px]' : 'text-[13px]'} style={{ color: f.svak }}>{r.k}</span>}
              hoyre={<span className={`${kompakt ? 'text-[13.5px]' : 'text-[14.5px]'} font-medium`} style={{ color: f.tekst }}>{r.v}</span>}
            />
          ))}
        </Fold>
        {/* Rørleggeren */}
        <Rad vis={vis && fase >= F.LEV0} ov={ov} sist testid="v4-kino-jonas"
          venstre={<><Portrett src={JONAS.bilde} alt={JONAS.navn} size={kompakt ? 30 : 34} /><span className="min-w-0"><span className={`block truncate font-medium ${kompakt ? 'text-[14px]' : 'text-[15px]'}`} style={{ color: f.tekst }}>{JONAS.navn}</span><span className="block text-[12px]" style={{ color: f.svak }}>{JONAS.rolle}</span></span></>}
          hoyre={fase >= F.LEV1 ? (
            <span className="block text-right">
              <span key="svar" className={`block font-medium tabular-nums animate-in fade-in-0 duration-300 ${kompakt ? 'text-[13.5px]' : 'text-[14.5px]'}`} style={{ color: f.tekst }}>Torsdag 09:00–11:00</span>
              <span className="block text-[12px] tabular-nums" style={{ color: f.svak }}>{tall(PRIS)} kr inkl. mva</span>
            </span>
          ) : <span key="fikk" className="text-[12.5px] animate-in fade-in-0 duration-300" style={{ color: f.svak }}>Har fått bildet og saken</span>}
        />
      </div>
      <Flyt vis={vis && fase >= F.KLAR} ov={ov} className={kompakt ? 'mt-4' : 'mt-6'}>
        <KinoKnapp presser={fase === F.TRYKK} trykket={godkjent} etter={`Godkjent · ${tall(PRIS)} kr · torsdag`} testid="v4-kino-godkjenn" stor={!kompakt}>Godkjenn · {tall(PRIS)} kr</KinoKnapp>
      </Flyt>
      <KinoSms vis={vis && fase >= F.SMS} ov={ov} til="Emma" tid="22:58" tekst="Hei Emma! Rørlegger Jonas Lie kommer torsdag mellom 09:00 og 11:00 for å fikse varmtvannet. Passer det? Svar JA eller foreslå ny tid. – DigiHome" className={kompakt ? 'mt-3' : 'mt-4'} testid="v4-kino-sms-drift" />
    </Sone>
  );
}

/* ── 6. Torsdag morgen: utført, bekreftet, fakturert ── */
function Morgen({ fase, ov, anker }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.TID && fase <= F.FAKTURA;
  return (
    <Sone testid="v4-kino-d-morgen" bredde={440} anker={anker} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Flyt vis={vis} ov={ov}><p className="text-[12.5px] font-medium tabular-nums" style={{ color: f.svak }}>Torsdag · Sak lukkes</p></Flyt>
      <div className="mt-2">
        <Rad vis={vis} ov={ov} delay={250} sist={false} testid="v4-kino-utfort"
          venstre={(
            <>
              <div className="overflow-hidden rounded-[8px]" style={{ width: kompakt ? 40 : 46, aspectRatio: '3 / 4' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={BEREDER} alt="" className="h-full w-full object-cover" draggable={false} />
              </div>
              <span className="min-w-0"><span className={`block font-medium ${kompakt ? 'text-[14px]' : 'text-[15px]'}`} style={{ color: f.tekst }}>Bereder byttet</span><span className="block text-[12px]" style={{ color: f.svak }}>{JONAS.navn} · kvittert med bilde 09:40</span></span>
            </>
          )}
          hoyre={<Merke tekst="Utført" tone="gronn" />}
        />
        <Rad vis={vis && fase >= F.UTFORT} ov={ov} sist={false} testid="v4-kino-bekreftet"
          venstre={<><Portrett src={EMMA.bilde} alt={EMMA.navn} size={kompakt ? 28 : 32} /><span className="min-w-0"><span className={`block font-medium ${kompakt ? 'text-[14px]' : 'text-[15px]'}`} style={{ color: f.tekst }}>Emma bekrefter</span><span className="block text-[12px]" style={{ color: f.svak }}>«Varmt vann igjen. Takk!» · 09:58</span></span></>}
          hoyre={<Merke tekst="Bekreftet" tone="gronn" />}
        />
        <Rad vis={vis && fase >= F.FAKTURA} ov={ov} sist testid="v4-kino-faktura"
          venstre={<span className="min-w-0"><span className={`block font-medium ${kompakt ? 'text-[14px]' : 'text-[15px]'}`} style={{ color: f.tekst }}>Faktura · {tall(PRIS)} kr</span><span className="block text-[12px]" style={{ color: f.svak }}>Lie VVS · bokført på Leilighet 2</span></span>}
          hoyre={<Merke tekst="I regnskapet" tone="gronn" />}
        />
      </div>
    </Sone>
  );
}

/* ── Slutt ── */
function Slutt({ fase, ov, anker }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.SLUTT;
  return (
    <Sone testid="v4-kino-d-slutt" bredde={420} anker={anker} style={{ pointerEvents: 'none' }}>
      <Flyt vis={vis} ov={ov} delay={300}>
        <p className="text-[12.5px] font-medium tabular-nums" style={{ color: f.svak }}>Sak · Nygårdsgaten 5 · lukket</p>
        <div className={`${kompakt ? 'mt-3' : 'mt-4'} grid grid-cols-3 gap-4`}>
          {[['Melding', '22:41'], ['Ditt trykk', '22:58'], ['Løst', 'tor 09:58']].map(([k, v]) => (
            <div key={k}><p className="text-[11.5px]" style={{ color: f.svak }}>{k}</p><p className={`mt-0.5 font-medium tabular-nums tracking-[-0.005em] ${kompakt ? 'text-[15px]' : 'text-[17px]'}`} style={{ color: f.tekst }}>{v}</p></div>
          ))}
        </div>
      </Flyt>
      {!kompakt && (
        <Flyt vis={vis} ov={ov} delay={700} className="mt-5 flex flex-wrap gap-2">
          <Merke tekst="Bilder" tone="gronn" /><Merke tekst={`${tall(PRIS)} kr`} tone="gronn" /><Merke tekst="Faktura i regnskapet" tone="gronn" />
        </Flyt>
      )}
    </Sone>
  );
}

/* Alt som skjer, skjer ved vinduet: sonen forankres til venstre for Leilighet 2 (desktop). */
function Scener({ fase, ov }) {
  const st = useKino();
  const g = dekk(st, K[bildeFor(fase)]);
  const anker = g && !st.kompakt ? g.punkt(VINDU.x, VINDU.y) : null;
  return (
    <>
      <Vindu fase={fase} ov={ov} />
      <Melding fase={fase} ov={ov} anker={anker} />
      <Sak fase={fase} ov={ov} anker={anker} />
      <Morgen fase={fase} ov={ov} anker={anker} />
      <Slutt fase={fase} ov={ov} anker={anker} />
    </>
  );
}

export default function DriftKino({ synlig, spiller, onFerdig, onFremdrift, neste, onTema }) {
  const { fase, ov, morkt } = useFilm({ synlig, spiller, AUTO, SISTE, START: F.START, HVILE: F.SLUTT, onFerdig, onFremdrift });
  const akt = aktFor(fase);
  const tema = temaFor(fase);
  React.useEffect(() => { onTema?.(tema); }, [onTema, tema]);
  const sone = fase >= F.MELD && fase < F.SLUTT;
  return (
    <KinoStage bilder={BILDER} aktiv={bildeFor(fase)} tema={tema} sone={sone} driv={false} ov={ov} synlig={synlig} morkt={morkt} fase={fase} testid="v4-kino-drift">
      <Scener fase={fase} ov={ov} />
      <KinoTekst nr="03" kapittel="Driften" akter={AKTER} id={akt.id} ov={ov} />
      <KinoNeste vis={fase >= F.SLUTT} navn={neste} dur={AUTO[F.SLUTT]} ov={ov} />
    </KinoStage>
  );
}
