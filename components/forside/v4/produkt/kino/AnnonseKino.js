'use client';

import React from 'react';
import { EASE, T, display, tall } from '../../motion';
import { Finn, Portrett, useFilm, BOLIG, EMMA } from '../filmdeler';
import { INK, UT, dekk, useKino, farger, KinoStage, KinoTekst, Topp, Blits, Etikett, VinduLys, Wipe, Teller, Tall, Skriver, Flyt, Fold, Rad, Sone, Merke, KinoDok, KinoKnapp, Hode } from './Kino';
import { FOTO, VINDU } from './bilder';

/* ---------------------------------------------------------------------------
   AnnonseKino — kapittel 1. «Fra fem bilder til valgt leietaker.»

   1  Montasje: fem harde kutt — fasade, kjøkken, soverom, spisestue, stue.
      Ett blaff per bilde, telleren øverst til venstre går 1 → 5.
   2  Lesing: på stua lander tre etiketter i fotoet — det leietakere spør om.
   3  Sengen: soverommet er uoppredd. Én skillelinje går over skjermen og
      avdekker den oppredde sengen. Kun sengen er endret.
   4  Annonsen skriver seg selv til høyre: tittel, fakta, pris som teller.
      Publiser på FINN — knappen trykker seg selv.
   5  Interessentene kommer med BankID, booker visning, Emma velges.
   6  Tilbake til fasaden i kveldslys: Emmas vindu lyser. Hun flytter inn.
--------------------------------------------------------------------------- */

const FASE_NAVN = ['START', 'K2', 'K3', 'K4', 'K5', 'LES', 'SENG', 'RE', 'BYGG', 'TITTEL', 'SPES', 'PRIS', 'KLAR', 'TRYKK', 'PUB',
  'INT1', 'INT2', 'INT3', 'BOOK', 'ETTER', 'VELG', 'VALGT', 'SLUTT'];
const F = Object.fromEntries(FASE_NAVN.map((n, i) => [n, i]));
const AUTO = {
  [F.START]: 1900, [F.K2]: 1000, [F.K3]: 1000, [F.K4]: 1000, [F.K5]: 1600,
  [F.LES]: 4200, [F.SENG]: 1600, [F.RE]: 3000,
  [F.BYGG]: 1300, [F.TITTEL]: 2100, [F.SPES]: 900, [F.PRIS]: 1500, [F.KLAR]: 1300, [F.TRYKK]: 380, [F.PUB]: 2100,
  [F.INT1]: 1200, [F.INT2]: 1000, [F.INT3]: 1000, [F.BOOK]: 2200, [F.ETTER]: 2000, [F.VELG]: 380, [F.VALGT]: 2300,
  [F.SLUTT]: 4400,
};
const SISTE = F.SLUTT;

const BILDER = [FOTO.fasadeKveld, FOTO.kjokken, FOTO.soveromUseng, FOTO.soverom, FOTO.spisestue, FOTO.stue];
const K = Object.fromEntries(BILDER.map((b) => [b.id, b]));

/* Montasjen: rekkefølgen bildene tas i */
const OPPTAK = [
  { fase: F.START, id: 'fasade', navn: 'Fasade' },
  { fase: F.K2, id: 'kjokken', navn: 'Kjøkken' },
  { fase: F.K3, id: 'soverom-useng', navn: 'Soverom' },
  { fase: F.K4, id: 'spisestue', navn: 'Spisestue' },
  { fase: F.K5, id: 'stue', navn: 'Stue' },
];
const opptakFor = (fase) => { let o = OPPTAK[0]; OPPTAK.forEach((x) => { if (fase >= x.fase) o = x; }); return o; };

function bildeFor(fase) {
  if (fase <= F.K5) return opptakFor(fase).id;
  if (fase === F.LES) return 'stue';
  if (fase <= F.RE) return 'soverom-useng';
  if (fase <= F.VALGT) return 'stue';
  return 'fasade';
}
const kuttFor = (fase) => fase >= F.K2 && fase <= F.K5;
const drivFor = (fase) => (fase >= F.BYGG && fase <= F.VALGT ? 'full' : fase >= F.SLUTT ? 'sett' : fase <= F.K5 ? 'sett' : 'av');
function nesteFor(fase) {
  const naa = bildeFor(fase);
  for (let f = fase + 1; f <= SISTE; f += 1) { const b = bildeFor(f); if (b !== naa) return b; }
  return null;
}

/* Teksten nede til venstre — én akt om gangen */
const AKTER = [
  { id: 'ta', fra: F.START, kicker: `${BOLIG.adresse} · ${BOLIG.by}`, tittel: 'Ta fem bilder.', tekst: 'Resten skriver seg selv mens de lastes opp.' },
  { id: 'les', fra: F.LES, kicker: 'Bildene leses', tittel: 'Vi ser det leietakere spør om.', tekst: 'Vinduer, kjøkkenøy, parkett — lest rett ut av fotoene.' },
  { id: 'seng', fra: F.SENG, kicker: 'Forslag', tittel: 'Sengen er uoppredd.', tekst: 'DigiHome foreslår å re den opp — digitalt.' },
  { id: 're', fra: F.RE, kicker: 'Redigert', tittel: 'Kun sengen. Rommet står urørt.', tekst: 'Lys, vegger og alt som er fast, er som på bildet.' },
  { id: 'bygg', fra: F.BYGG, kicker: 'Utkast · 14:01', tittel: 'Annonsen skriver seg selv.', tekst: 'Overskrift, fakta og pris — fra det bildene viste.' },
  { id: 'finn', fra: F.PUB, kicker: 'FINN.no · 14:02', tittel: 'Ute på FINN.', tekst: 'Ett trykk. Interessentene legitimerer seg med BankID.' },
  { id: 'int', fra: F.INT1, kicker: 'Samme kveld', tittel: 'Interessentene kommer.', tekst: 'Verifisert med BankID før du ser dem.' },
  { id: 'book', fra: F.BOOK, kicker: 'Tirsdag', tittel: 'Visningen booker de selv.', tekst: 'De velger tid og får bekreftelsen på SMS. Du møter opp.' },
  { id: 'velg', fra: F.ETTER, kicker: 'Etter visning', tittel: 'Du velger.', tekst: 'Inntekt og referanse ligger klart. De andre får beskjed samtidig.' },
  { id: 'slutt', fra: F.SLUTT, kicker: `${BOLIG.adresse} · ${BOLIG.enhet}`, tittel: 'Emma flytter inn 1. november.', tekst: 'Kontrakten er allerede fylt ut — neste kapittel.' },
];
const aktFor = (fase) => { let a = AKTER[0]; AKTER.forEach((x) => { if (fase >= x.fra) a = x; }); return a; };

/* Det systemet ser i stua — punkt (andel av bildet). Holder seg unna teksten nede til venstre. */
const PINNER = [
  { id: 'vinduer', t: 'Store vinduer', p: [0.31, 0.29], plass: 'hoyre', d: 900 },
  { id: 'oy', t: 'Kjøkkenøy', p: [0.46, 0.575], plass: 'hoyre', d: 1500 },
  { id: 'parkett', t: 'Parkett', p: [0.73, 0.71], plass: 'over', d: 2100 },
];
const SENG = { p: [0.56, 0.60] };

const ANNONSE = {
  tittel: 'Lys 2-roms med åpen kjøkkenløsning i Nygårdsgaten',
  spes: `${BOLIG.prom} · 1 soverom · 2. etasje · parkett · ledig ${BOLIG.innflytting}`,
};

/* Interessentene */
const FOLK = [
  {
    n: EMMA.navn, bilde: EMMA.bilde, fra: F.INT1,
    d: (f) => (f >= F.VALGT ? 'Valgt · kontrakten forberedes' : f >= F.ETTER ? 'Visning gjennomført · ønsker 3 års leie' : f >= F.BOOK ? 'Visning tirsdag 17:30 · bekreftet på SMS' : 'Meldte interesse via FINN'),
    dok: (f) => (f >= F.ETTER ? ['BankID', 'Inntekt', 'Referanse'] : f >= F.BOOK ? ['BankID', 'Inntekt'] : ['BankID']),
    merke: (f) => (f >= F.VALGT ? ['Valgt', 'lilla'] : f >= F.ETTER ? ['Anbefalt', 'lilla'] : f >= F.BOOK ? ['Visning 17:30', 'noytral'] : null),
  },
  {
    n: 'Martin Berg', bilde: '/v4/annonse/leietaker-martin.webp', fra: F.INT2,
    d: (f) => (f >= F.VALGT ? 'Varslet på SMS · boligen er utleid' : f >= F.ETTER ? 'Visning gjennomført' : f >= F.BOOK ? 'Visning tirsdag 18:00 · bekreftet på SMS' : 'Meldte interesse via FINN'),
    dok: (f) => (f >= F.ETTER ? ['BankID', 'Inntekt'] : ['BankID']),
    merke: (f) => (f >= F.VALGT ? ['Varslet', 'noytral'] : f >= F.BOOK ? ['Visning 18:00', 'noytral'] : null),
  },
  {
    n: 'Sara Haugen', bilde: '/v4/annonse/leietaker-sara.webp', fra: F.INT3,
    d: (f) => (f >= F.VALGT ? 'Varslet på SMS · boligen er utleid' : f >= F.BOOK ? 'Spurte om husdyr · besvart fra annonsen' : 'Meldte interesse via FINN'),
    dok: () => ['BankID'],
    merke: (f) => (f >= F.VALGT ? ['Varslet', 'noytral'] : null),
  },
];

/* ── Kameratelleren øverst til venstre: «Fasade · 1 av 5» ── */
function Teller5({ fase, ov }) {
  const { tema, kompakt } = useKino();
  const f = farger(tema);
  const vis = fase <= F.K5;
  const o = opptakFor(fase);
  const i = OPPTAK.indexOf(o);
  return (
    <Topp vis={vis} ov={ov} testid="v4-kino-teller">
      <p className={`flex items-baseline gap-3 ${kompakt ? 'text-[13px]' : 'text-[14px]'}`}>
        <span className={`${kompakt ? 'text-[30px]' : 'text-[clamp(34px,2.6vw,48px)]'} leading-none`} style={{ ...display, color: f.tekst }}><Tall>{`0${i + 1}`}</Tall><span style={{ color: f.svak }}> / 05</span></span>
        <span key={o.id} className="font-medium animate-in fade-in-0 slide-in-from-bottom-1 duration-400" style={{ color: f.brod }}>{o.navn}</span>
      </p>
      {/* Fem streker — den aktive fylles */}
      <span className="mt-3 flex gap-1.5" aria-hidden="true">
        {OPPTAK.map((x, k) => <span key={x.id} className="block h-[2px] w-7 rounded-full" style={{ background: k <= i ? T.lilla : f.hair, transition: `background-color 300ms ${EASE}` }} />)}
      </span>
    </Topp>
  );
}

/* ── Etikettene i fotoet (desktop) · merker i sonen (mobil) ── */
function Pinner({ fase, ov }) {
  const st = useKino();
  const { kompakt } = st;
  if (!st.w) return null;
  const les = fase === F.LES;
  const seng = fase === F.SENG; const re = fase >= F.RE && fase < F.BYGG;
  if (kompakt) {
    const vis = les || seng || re;
    return (
      <Sone testid="v4-kino-pinner" style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity 350ms ${EASE}`, pointerEvents: 'none' }}>
        <div className="flex flex-wrap gap-2">
          {PINNER.map((p) => <Flyt key={p.id} vis={les} ov={ov} delay={les ? Math.round(p.d * 0.6) : 0} y={8} style={{ position: les ? 'relative' : 'absolute' }}><Merke tekst={p.t} tone="noytral" /></Flyt>)}
          <Flyt vis={seng} ov={ov} delay={300} y={8} style={{ position: seng ? 'relative' : 'absolute' }}><Merke tekst="Uoppredd seng · forslag: re opp" tone="lilla" /></Flyt>
          <Flyt vis={re} ov={ov} delay={2000} y={8} style={{ position: re ? 'relative' : 'absolute' }}><Merke tekst="Redigert · kun sengen" tone="gronn" /></Flyt>
        </div>
      </Sone>
    );
  }
  const gs = dekk(st, K.stue); const gsov = dekk(st, K['soverom-useng']);
  if (!gs || !gsov) return null;
  const sp = gsov.punkt(SENG.p[0], SENG.p[1]);
  return (
    <>
      {PINNER.map((p) => { const pt = gs.punkt(p.p[0], p.p[1]); return <Etikett key={p.id} vis={les} x={pt.x} y={pt.y} tone="noytral" plass={p.plass} delay={p.d} ov={ov} testid={`v4-kino-pin-${p.id}`}>{p.t}</Etikett>; })}
      <Etikett vis={seng} x={sp.x} y={sp.y} tone="lilla" plass="over" delay={500} ov={ov} testid="v4-kino-pin-seng">Uoppredd seng · forslag: re opp</Etikett>
      <Etikett vis={re} x={sp.x} y={sp.y} tone="gronn" plass="over" delay={2300} ov={ov} testid="v4-kino-redigert">Redigert · kun sengen</Etikett>
    </>
  );
}

/* ── Annonsen skrives til høyre; ved publisering komprimeres den til én linje og interessentene tar plassen ── */
function Annonsen({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.BYGG && fase <= F.VALGT;
  const pub = fase >= F.PUB;
  const folk = fase >= F.INT1;
  return (
    <Sone testid="v4-kino-annonsen" bredde={580} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Hode vis={vis} ov={ov} delay={500}>
        <span key={pub ? 'pub' : 'utkast'} className="inline-flex items-center gap-2 animate-in fade-in-0 duration-400">
          {pub ? <><Finn h={13} /><span>Publisert på FINN.no · 14:02</span></> : 'Utkast til annonse'}
        </span>
      </Hode>
      {/* Tittel: skrives inn stor; blir én linje når interessentene kommer */}
      <Flyt vis={vis && fase >= F.TITTEL} ov={ov}>
        <h4 className={`${folk ? (kompakt ? 'mt-1 text-[16px]' : 'mt-1.5 text-[18px]') : (kompakt ? 'mt-1.5 min-h-[2.3em] text-[22px]' : 'mt-2 min-h-[2.3em] text-[clamp(24px,1.85vw,34px)]')} font-medium leading-[1.14] tracking-[-0.018em] ${folk ? 'truncate' : ''}`} style={{ color: f.tekst, transition: ov ? 'none' : `font-size 500ms ${EASE}` }} data-testid="v4-kino-annonse-tittel">
          <Skriver tekst={ANNONSE.tittel} aktiv={vis && fase >= F.TITTEL} ms={24} delay={150} ov={ov} markor={!pub} testid="v4-kino-skriver" />
        </h4>
      </Flyt>
      <Fold open={!folk} ov={ov}>
        <div className={`${kompakt ? 'mt-2' : 'mt-3'} flex items-end justify-between gap-6`}>
          <Flyt vis={vis && fase >= F.SPES} ov={ov}><p className={kompakt ? 'text-[13px]' : 'text-[14.5px]'} style={{ color: f.brod }}>{ANNONSE.spes}</p></Flyt>
          <Flyt vis={vis && fase >= F.PRIS} ov={ov}>
            <p className={`${kompakt ? 'text-[30px]' : 'text-[clamp(32px,2.4vw,46px)]'} leading-none`} style={{ ...display, whiteSpace: 'nowrap', color: f.tekst }} data-testid="v4-kino-pris">
              <Teller til={BOLIG.leie} aktiv={vis && fase >= F.PRIS} dur={1100} ov={ov} /> kr<span className={kompakt ? 'text-[13px]' : 'text-[15px]'} style={{ color: f.svak, fontFamily: 'inherit', letterSpacing: 0 }}> / mnd</span>
            </p>
          </Flyt>
        </div>
        <Flyt vis={vis && fase >= F.KLAR} ov={ov} className={kompakt ? 'mt-4' : 'mt-6'}>
          <KinoKnapp presser={fase === F.TRYKK} trykket={pub} etter="Publisert på FINN" testid="v4-kino-publiser" stor={!kompakt}><Finn h={14} /> Publiser på FINN</KinoKnapp>
        </Flyt>
      </Fold>
      {/* Interessentene */}
      <Fold open={folk} ov={ov}>
        <p className={`${kompakt ? 'mt-1 text-[12.5px]' : 'mt-1.5 text-[13px]'}`} style={{ color: f.brod }}><Tall>{tall(BOLIG.leie)}</Tall> kr / mnd · {BOLIG.prom} · 2. etasje</p>
        <div className={kompakt ? 'mt-4' : 'mt-6'}>
          <Hode vis={folk} ov={ov}>Interessenter · {FOLK.filter((p) => fase >= p.fra).length} med BankID</Hode>
          <div className="mt-1">
            {FOLK.map((p, i) => {
              const m = p.merke(fase);
              return (
                <Rad key={p.n} vis={fase >= p.fra} ov={ov} sist={i === FOLK.length - 1} dempet={fase >= F.VALGT && i > 0} testid={`v4-kino-person-${i}`}
                  venstre={(
                    <>
                      <Portrett src={p.bilde} alt={p.n} size={kompakt ? 36 : 44} />
                      <span className="min-w-0">
                        <span className={`block truncate font-medium ${kompakt ? 'text-[14.5px]' : 'text-[15.5px]'}`} style={{ color: f.tekst }}>{p.n}</span>
                        <span key={p.d(fase)} className={`block truncate ${kompakt ? 'text-[12px]' : 'text-[13px]'} animate-in fade-in-0 duration-300`} style={{ color: f.svak }}>{p.d(fase)}</span>
                      </span>
                    </>
                  )}
                  hoyre={(
                    <span className="flex flex-col items-end gap-1.5">
                      {m ? <Merke tekst={m[0]} tone={m[1]} /> : <span className="h-[26px]" />}
                      {!kompakt && <KinoDok liste={p.dok(fase)} />}
                    </span>
                  )}
                />
              );
            })}
          </div>
          <Flyt vis={fase >= F.ETTER} ov={ov} className={kompakt ? 'mt-4' : 'mt-6'}>
            <KinoKnapp presser={fase === F.VELG} trykket={fase >= F.VALGT} etter="Emma er valgt" testid="v4-kino-velg" stor={!kompakt}>Velg Emma</KinoKnapp>
          </Flyt>
        </div>
      </Fold>
    </Sone>
  );
}

/* ── Slutt: fasaden i kveldslys — Emmas vindu lyser ── */
function Vindu({ fase, ov }) {
  const st = useKino();
  const g = dekk(st, K.fasade);
  if (!g) return null;
  const vis = fase >= F.SLUTT;
  const p = g.punkt(VINDU[2].x, VINDU[2].y);
  return (
    <>
      <VinduLys p={p} g={g} paa={vis} ov={ov} testid="v4-kino-lys-emma" />
      <Etikett vis={vis} x={p.x} y={p.y} tone="emma" plass={st.kompakt ? 'venstre' : 'over'} delay={900} ov={ov} testid="v4-kino-vindu">Leilighet 2 · Emma</Etikett>
    </>
  );
}

export default function AnnonseKino({ synlig, spiller, onFerdig, onFremdrift, onTema }) {
  const { fase, ov, morkt } = useFilm({ synlig, spiller, AUTO, SISTE, START: F.START, HVILE: F.SLUTT, onFerdig, onFremdrift });
  const akt = aktFor(fase);
  const b = K[bildeFor(fase)];
  const tema = b.tema;
  React.useEffect(() => { onTema?.(tema); }, [onTema, tema]);
  const sone = fase >= F.BYGG && fase <= F.VALGT;
  const kutt = kuttFor(fase);
  return (
    <KinoStage bilder={BILDER} aktiv={b.id} neste={nesteFor(fase)} tema={tema} sone={sone} driv={drivFor(fase)} kutt={kutt} ov={ov} morkt={morkt} fase={fase} testid="v4-kino-annonse"
      lag={fase >= F.SENG && fase <= F.RE ? <Wipe b={K.soverom} paa={fase >= F.RE} ferdig={false} ov={ov} dur={2400} delay={300} /> : null}>
      <Blits nokkel={kutt ? fase : null} ov={ov} />
      <Teller5 fase={fase} ov={ov} />
      <Pinner fase={fase} ov={ov} />
      <Annonsen fase={fase} ov={ov} />
      <Vindu fase={fase} ov={ov} />
      <KinoTekst akter={AKTER} id={akt.id} ov={ov} />
    </KinoStage>
  );
}
