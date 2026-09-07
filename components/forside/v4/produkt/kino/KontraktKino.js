'use client';

import React from 'react';
import { EASE, T, display, tall } from '../../motion';
import { Hake, Portrett, useFilm, BOLIG, EMMA, KARI } from '../filmdeler';
import { useKino, farger, KinoStage, KinoTekst, Flyt, Fold, Rad, Sone, Merke, KinoDok, KinoNeste, KinoKnapp, KinoSms, Ring, Teller, Mini } from './Kino';
import { FOTO, MINI } from './bilder';

/* ---------------------------------------------------------------------------
   KontraktKino — kapittel 2 i full bleed. «Fra valgt leietaker til nøklene i hånden.»

   Åpner der Annonse sluttet: bygården i kveldslys, Emma valgt. Så flytter
   scenen inn i boligen: kontrakten fyller seg selv ut på fotoet av stua, begge
   signerer med BankID (ringen fylles, haken lander), Emma velger depositum på
   soverommet, booker overtakelsen mot fasaden i morgenlys, protokollen tas i
   døra (kjøkkenet) med bilder av hvert rom — og til slutt står stua møblert:
   Emma har flyttet inn.

   Tre trykk fra utleier: Lag kontrakt · Signer med BankID · Signer protokoll.
--------------------------------------------------------------------------- */

const FASE_NAVN = ['START', 'KLAR1', 'TRYKK1', 'DOK', 'FYLL1', 'FYLL2', 'FYLL3', 'KLAR2', 'TRYKK2', 'SIGN1', 'SMS1', 'LEST', 'SIGN2',
  'DEP1', 'DEP2', 'DEP3', 'BOOK0', 'BOOK1', 'BOOK2', 'OVER0', 'OVER1', 'OVER2', 'OVER3', 'KLAR3', 'TRYKK3', 'SIGNERT', 'SLUTT'];
const F = Object.fromEntries(FASE_NAVN.map((n, i) => [n, i]));
const AUTO = {
  [F.START]: 1700, [F.KLAR1]: 1300, [F.TRYKK1]: 380,
  [F.DOK]: 1400, [F.FYLL1]: 1000, [F.FYLL2]: 1000, [F.FYLL3]: 1300, [F.KLAR2]: 1500, [F.TRYKK2]: 380,
  [F.SIGN1]: 1600, [F.SMS1]: 1800, [F.LEST]: 1400, [F.SIGN2]: 2000,
  [F.DEP1]: 1800, [F.DEP2]: 1500, [F.DEP3]: 2200,
  [F.BOOK0]: 1600, [F.BOOK1]: 1400, [F.BOOK2]: 2000,
  [F.OVER0]: 1600, [F.OVER1]: 1500, [F.OVER2]: 1100, [F.OVER3]: 1100, [F.KLAR3]: 1400, [F.TRYKK3]: 380, [F.SIGNERT]: 2400,
  [F.SLUTT]: 4400,
};
const SISTE = F.SLUTT;

const BILDER = [FOTO.fasadeKveld, FOTO.stue, FOTO.soverom, FOTO.fasadeMorgen, FOTO.kjokken, FOTO.moblert];

function bildeFor(fase) {
  if (fase <= F.TRYKK1) return 'fasade';
  if (fase <= F.SIGN2) return 'stue';
  if (fase <= F.DEP3) return 'soverom';
  if (fase <= F.BOOK2) return 'morgen';
  if (fase <= F.SIGNERT) return 'kjokken';
  return 'moblert';
}
function nesteFor(fase) {
  const naa = bildeFor(fase);
  for (let f = fase + 1; f <= SISTE; f += 1) { const b = bildeFor(f); if (b !== naa) return b; }
  return null;
}
/* Morgenfasaden er lys — lys scrim og blekk der. Resten: mørk scrim, offwhite. */
const temaFor = (fase) => (fase >= F.BOOK0 && fase <= F.BOOK2 ? 'lys' : 'mork');

const AKTER = [
  { id: 'valgt', fra: F.START, tittel: 'Emma er valgt.', tekst: 'Kontrakten er allerede fylt ut — fra annonsen og søknaden.' },
  { id: 'dok', fra: F.DOK, tittel: 'Kontrakten fyller seg selv ut.', tekst: 'Stiplet tekst er hentet. Les gjennom, endre om du vil — og signer.' },
  { id: 'sign', fra: F.KLAR2, tittel: 'Begge signerer med BankID.', tekst: 'Du først. Emma får en SMS og signerer på mobilen.' },
  { id: 'dep', fra: F.DEP1, tittel: 'Depositumet velger Emma selv.', tekst: 'Sperret konto eller Keyhole-garanti. Du er sikret uansett.' },
  { id: 'book', fra: F.BOOK0, tittel: 'Overtakelsen booker Emma selv.', tekst: 'Dine ledige tider. Emma velger — kalenderen din oppdateres.' },
  { id: 'over', fra: F.OVER0, tittel: 'Overtakelsen tas i døra.', tekst: 'Bilder av hvert rom, målerstand og nøkler — signert av begge.' },
  { id: 'slutt', fra: F.SLUTT, tittel: 'Emma har flyttet inn.', tekst: 'Første husleie 1. desember følges opp automatisk.' },
];
const aktFor = (fase) => { let a = AKTER[0]; AKTER.forEach((x) => { if (fase >= x.fra) a = x; }); return a; };

const DEPOSITUM = BOLIG.leie * BOLIG.depositumMnd;

/* Kontraktens felt — fylles inn i tre puljer. `kilde` = hentet (stiplet), ikke skrevet. */
const FELT = [
  { k: 'Utleier', v: KARI.navn, p: F.FYLL1 },
  { k: 'Leietaker', v: EMMA.navn, p: F.FYLL1, kilde: 'søknad' },
  { k: 'Bolig', v: `${BOLIG.adresse}, ${BOLIG.enhet.toLowerCase()}`, p: F.FYLL1, kilde: 'annonse' },
  { k: 'Leie', v: `${tall(BOLIG.leie)} kr per måned`, p: F.FYLL2, kilde: 'annonse' },
  { k: 'Depositum', v: `${tall(DEPOSITUM)} kr · ${BOLIG.depositumMnd} måneder`, p: F.FYLL2, kilde: 'annonse' },
  { k: 'Innflytting', v: BOLIG.innflytting, p: F.FYLL3, kilde: 'annonse' },
  { k: 'Varighet', v: `${BOLIG.varighet} · tidsbestemt`, p: F.FYLL3, kilde: 'søknad' },
];

const ROM = [
  { navn: 'Stue', ant: '4 bilder', fra: F.OVER1, d: 0, mini: MINI.stue },
  { navn: 'Kjøkken', ant: '3 bilder', fra: F.OVER1, d: 260, mini: MINI.kjokken },
  { navn: 'Soverom', ant: '3 bilder', fra: F.OVER1, d: 520, mini: MINI.soverom },
  { navn: 'Spisestue', ant: '2 bilder', fra: F.OVER1, d: 780, mini: MINI.spisestue },
  { navn: 'Strøm', ant: '48 213 kWh', fra: F.OVER2, d: 0 },
  { navn: 'Nøkler', ant: '3 stk · overlevert', fra: F.OVER3, d: 0 },
];

function Stiplet({ children, kilde }) {
  if (!kilde) return children;
  return <span title={`Hentet fra ${kilde}`} style={{ textDecoration: 'underline dotted', textDecorationColor: 'rgba(212,150,255,0.85)', textUnderlineOffset: 4, textDecorationThickness: 1.5 }}>{children}</span>;
}

/* Overskriften i sonen — liten, tabulær */
function Hode({ vis, ov, children, delay = 0 }) {
  const { tema } = useKino();
  const f = farger(tema);
  return <Flyt vis={vis} ov={ov} delay={delay}><p className="text-[12.5px] font-medium" style={{ color: f.svak }}>{children}</p></Flyt>;
}

/* ── 1. Emma er valgt · Lag kontrakt ── */
function Valgt({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase <= F.TRYKK1;
  return (
    <Sone testid="v4-kino-k-valgt" bredde={420} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Flyt vis={vis} ov={ov} delay={300}>
        <div className={kompakt ? 'flex items-center gap-4' : 'flex flex-col items-start gap-5'}>
          <Portrett src={EMMA.bilde} alt={EMMA.navn} size={kompakt ? 56 : 92} />
          <div>
            <p className={`${kompakt ? 'text-[18px]' : 'text-[26px]'} font-medium tracking-[-0.014em]`} style={{ color: f.tekst }}>{EMMA.navn}</p>
            <p className="mt-1 text-[13px]" style={{ color: f.svak }}>Valgt leietaker · {BOLIG.adresse}, {BOLIG.enhet.toLowerCase()}</p>
            <div className="mt-2.5"><KinoDok liste={EMMA.dok} /></div>
          </div>
        </div>
      </Flyt>
      <Flyt vis={fase >= F.KLAR1 && vis} ov={ov} className={kompakt ? 'mt-5' : 'mt-7'}>
        <KinoKnapp presser={fase === F.TRYKK1} trykket={false} testid="v4-kino-lag-kontrakt" stor={!kompakt}>Lag kontrakt</KinoKnapp>
      </Flyt>
    </Sone>
  );
}

/* ── 2. Kontrakten fyller seg ut · begge signerer med BankID ── */
function Signatur({ person, rolle, aktiv, ferdig, tid, status, ov, kompakt, f, sist, vis, delay, testid }) {
  return (
    <Rad vis={vis} ov={ov} delay={delay} sist={sist} testid={testid}
      venstre={<><Portrett src={person.bilde} alt={person.navn} size={kompakt ? 28 : 34} /><span className="min-w-0"><span className={`block truncate font-medium ${kompakt ? 'text-[13.5px]' : 'text-[14.5px]'}`} style={{ color: f.tekst }}>{person.navn}</span><span className="block text-[12px]" style={{ color: f.svak }}>{rolle}</span></span></>}
      hoyre={(
        <span className="inline-flex items-center gap-2.5">
          <span key={ferdig ? 'ok' : status} className={`${kompakt ? 'text-[12px]' : 'text-[12.5px]'} animate-in fade-in-0 duration-300`} style={{ color: ferdig ? f.gronn : f.svak }}>{ferdig ? `Signert med BankID · ${tid}` : status}</span>
          <Ring aktiv={aktiv} ferdig={ferdig} dur={1100} size={22} ov={ov} />
        </span>
      )}
    />
  );
}

function Kontrakt({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.DOK && fase <= F.SIGN2;
  const signer = fase >= F.KLAR2;
  const kariSignert = fase >= F.SIGN1; const emmaSignert = fase >= F.SIGN2;
  const emmaStatus = fase >= F.LEST ? 'Signerer på mobilen …' : fase >= F.SMS1 ? 'SMS sendt · venter' : 'Venter';
  return (
    <Sone testid="v4-kino-k-kontrakt" bredde={560} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Hode vis={vis} ov={ov}>Leiekontrakt · {emmaSignert ? 'signert av begge' : signer ? 'til signering' : 'utkast'}</Hode>
      <div className="mt-2">
        {/* På mobil klappes feltene sammen når signeringen starter — signaturene får plassen */}
        <Fold open={!kompakt || fase < F.KLAR2} ov={ov}>
          {FELT.map((r, i) => (
            <Rad key={r.k} vis={vis && fase >= r.p} ov={ov} delay={(i % 3) * 180} sist={false} testid={`v4-kino-felt-${i}`}
              venstre={<span className={`${kompakt ? 'text-[12.5px]' : 'text-[13px]'}`} style={{ color: f.svak }}>{r.k}</span>}
              hoyre={<span className={`${kompakt ? 'text-[13.5px]' : 'text-[15.5px]'} font-medium`} style={{ color: f.tekst }}><Stiplet kilde={r.kilde}>{r.v}</Stiplet></span>}
            />
          ))}
        </Fold>
      </div>
      {/* Signaturene — ringen fylles mens BankID jobber, haken lander */}
      <div className={kompakt ? 'mt-3' : 'mt-4'}>
        <Signatur person={KARI} rolle="Utleier" vis={vis && signer} aktiv={fase >= F.TRYKK2} ferdig={kariSignert} tid="14:02" status={fase >= F.TRYKK2 ? 'BankID …' : 'Signerer nå'} ov={ov} kompakt={kompakt} f={f} sist={false} testid="v4-kino-sign-kari" />
        <Signatur person={EMMA} rolle="Leietaker" vis={vis && signer} delay={120} aktiv={fase >= F.LEST} ferdig={emmaSignert} tid="14:11" status={emmaStatus} ov={ov} kompakt={kompakt} f={f} sist testid="v4-kino-sign-emma" />
      </div>
      <Flyt vis={vis && signer && fase < F.SIGN1} ov={ov} className={kompakt ? 'mt-4' : 'mt-6'} style={{ position: fase >= F.SIGN1 ? 'absolute' : 'relative' }}>
        <KinoKnapp presser={fase === F.TRYKK2} trykket={false} testid="v4-kino-signer" stor={!kompakt}>Signer med BankID</KinoKnapp>
      </Flyt>
      <KinoSms vis={vis && fase >= F.SMS1 && fase < F.SIGN2} ov={ov} til="Emma" tid="i dag 14:03" tekst="Hei Emma! Leiekontrakten for Nygårdsgaten 5 er klar. Les og signer med BankID: digihome.no/s/7ka2 – DigiHome" className="mt-4" testid="v4-kino-sms-kontrakt" />
    </Sone>
  );
}

/* ── 3. Depositum — Emma velger ── */
function Depositum({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.DEP1 && fase <= F.DEP3;
  const valgt = fase >= F.DEP2;
  const VALG = [
    { id: 'konto', t: 'Sperret depositumskonto', u: `${tall(DEPOSITUM)} kr låses på egen konto`, valgt: false },
    { id: 'keyhole', t: 'Garanti fra Keyhole', u: 'Emma beholder pengene · du er sikret likt', valgt: true },
  ];
  return (
    <Sone testid="v4-kino-k-depositum" bredde={520} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Hode vis={vis} ov={ov}>Depositum · {tall(DEPOSITUM)} kr · Emma velger</Hode>
      <div className="mt-2">
        {VALG.map((v, i) => (
          <Rad key={v.id} vis={vis} ov={ov} delay={300 + i * 200} sist={i === VALG.length - 1} dempet={valgt && !v.valgt} testid={`v4-kino-dep-${v.id}`}
            venstre={(
              <span className="min-w-0">
                <span className={`block font-medium ${kompakt ? 'text-[14px]' : 'text-[15px]'}`} style={{ color: f.tekst }}>{v.t}</span>
                <span className={`block ${kompakt ? 'text-[12px]' : 'text-[12.5px]'}`} style={{ color: f.svak }}>{v.u}</span>
              </span>
            )}
            hoyre={valgt && v.valgt ? <Merke tekst="Valgt av Emma" tone="lilla" /> : <span className="inline-block h-6" />}
          />
        ))}
      </div>
      <Flyt vis={vis && fase >= F.DEP3} ov={ov} className={kompakt ? 'mt-4' : 'mt-6'}>
        <p className="text-[12.5px]" style={{ color: f.svak }}>Emma beholder</p>
        <p className={`${kompakt ? 'text-[30px]' : 'text-[clamp(32px,2.4vw,42px)]'}`} style={{ ...display, color: f.tekst }}><Teller til={DEPOSITUM} aktiv={vis && fase >= F.DEP3} dur={1100} ov={ov} /> kr</p>
        <p className={`mt-1.5 inline-flex items-center gap-2 ${kompakt ? 'text-[13px]' : 'text-[13.5px]'}`} style={{ color: f.brod }}>
          <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full" style={{ background: f.gronnBg, color: f.gronn }}><Hake size={10} /></span>
          Du er sikret for {tall(DEPOSITUM)} kr · ingenting via din konto
        </p>
      </Flyt>
    </Sone>
  );
}

/* ── 4. Overtakelsen bookes ── */
function Booking({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.BOOK0 && fase <= F.BOOK2;
  const valgt = fase >= F.BOOK1;
  const TIDER = ['10:00', '12:00', '14:00'];
  return (
    <Sone testid="v4-kino-k-booking" bredde={520} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Hode vis={vis} ov={ov}>Overtakelse · lørdag 1. november · dine ledige tider</Hode>
      <Flyt vis={vis} ov={ov} delay={250} className="mt-3 flex gap-2.5">
        {TIDER.map((t) => {
          const er = t === '12:00';
          const on = valgt && er; const off = valgt && !er;
          return (
            <span key={t} className={`inline-flex items-center justify-center rounded-[10px] font-medium ${kompakt ? 'h-10 flex-1 text-[14px]' : 'h-11 w-[108px] text-[15px]'}`} style={{ background: on ? T.lilla : f.flate, color: on ? '#15130F' : f.tekst, boxShadow: on ? 'none' : `inset 0 0 0 1px ${f.hair}`, opacity: off ? 0.45 : 1, transform: on ? 'scale(1.04)' : 'scale(1)', transition: `background-color 400ms ${EASE}, opacity 400ms ${EASE}, transform 500ms ${EASE}` }} data-testid={`v4-kino-tid-${t}`}>
              {on && <Hake size={12} />}<span className={on ? 'ml-1.5' : ''}>{t}</span>
            </span>
          );
        })}
      </Flyt>
      <Flyt vis={vis && valgt} ov={ov} delay={200} className="mt-3"><p className={`${kompakt ? 'text-[13px]' : 'text-[13.5px]'}`} style={{ color: f.svak }}>Emma valgte 12:00 på mobilen · lagt i din kalender</p></Flyt>
      <KinoSms vis={vis && fase >= F.BOOK2} ov={ov} til="Emma" tid="i dag 15:02" tekst="Overtakelsen er bekreftet: lørdag 1. november kl. 12:00 i Nygårdsgaten 5. Ta med legitimasjon. – DigiHome" className="mt-4" testid="v4-kino-sms-booking" />
    </Sone>
  );
}

/* ── 5. Protokollen — i døra, med bilder av hvert rom ── */
function Protokoll({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.OVER0 && fase <= F.SIGNERT;
  const signert = fase >= F.SIGNERT;
  return (
    <Sone testid="v4-kino-k-protokoll" bredde={520} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Hode vis={vis} ov={ov}>Overtakelsesprotokoll · 1. november 12:00</Hode>
      <div className="mt-2">
        {ROM.map((r, i) => (
          <Rad key={r.navn} vis={vis && fase >= r.fra} ov={ov} delay={r.d} sist={i === ROM.length - 1} testid={`v4-kino-rom-${i}`}
            venstre={<>{r.mini && <Mini src={r.mini} w={kompakt ? 40 : 48} />}<span className={`font-medium ${kompakt ? 'text-[14px]' : 'text-[15px]'}`} style={{ color: f.tekst }}>{r.navn}</span></>}
            hoyre={<span className={`inline-flex items-center gap-1.5 ${kompakt ? 'text-[12.5px]' : 'text-[13px]'}`} style={{ color: f.brod }}><span style={{ color: f.gronn }}><Hake size={11} /></span>{r.ant}</span>}
          />
        ))}
      </div>
      <Flyt vis={vis && fase >= F.KLAR3} ov={ov} className={kompakt ? 'mt-4' : 'mt-6'}>
        <KinoKnapp presser={fase === F.TRYKK3} trykket={signert} etter="Signert av begge · 12:14" testid="v4-kino-signer-protokoll" stor={!kompakt}>Signer protokoll</KinoKnapp>
      </Flyt>
      {!kompakt && <KinoSms vis={vis && signert} ov={ov} delay={500} til="Emma" tid="1. nov 12:14" tekst="Velkommen hjem, Emma! Overtakelsesprotokollen er signert av begge og ligger i DigiHome. – DigiHome" className="mt-4" testid="v4-kino-sms-protokoll" />}
    </Sone>
  );
}

/* ── Slutt: Emma har flyttet inn ── */
function Slutt({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.SLUTT;
  return (
    <Sone testid="v4-kino-k-slutt" bredde={420} style={{ pointerEvents: 'none' }}>
      <Flyt vis={vis} ov={ov} delay={300}>
        <div className={kompakt ? 'flex items-center gap-4' : 'flex flex-col items-start gap-5'}>
          <Portrett src={EMMA.bilde} alt={EMMA.navn} size={kompakt ? 56 : 92} />
          <div>
            <p className={`${kompakt ? 'text-[18px]' : 'text-[26px]'} font-medium tracking-[-0.014em]`} style={{ color: f.tekst }}>{EMMA.navn}</p>
            <p className="mt-1 text-[13px]" style={{ color: f.svak }}>Flyttet inn 1. november · {BOLIG.adresse}, {BOLIG.enhet.toLowerCase()}</p>
            <div className="mt-2.5"><Merke tekst="Kontrakt · depositum · protokoll signert" tone="gronn" /></div>
          </div>
        </div>
      </Flyt>
      {!kompakt && (
        <Flyt vis={vis} ov={ov} delay={700} className="mt-6 grid grid-cols-3 gap-4 border-t pt-4" style={{ borderColor: f.hair }}>
          {[['Første husleie', '1. des'], ['Leie', `${tall(BOLIG.leie)} kr`], ['Depositum', 'Keyhole']].map(([k, v]) => (
            <div key={k}><p className="text-[11.5px]" style={{ color: f.svak }}>{k}</p><p className="mt-0.5 text-[14.5px] font-medium tracking-[-0.005em]" style={{ color: f.tekst }}>{v}</p></div>
          ))}
        </Flyt>
      )}
    </Sone>
  );
}

export default function KontraktKino({ synlig, spiller, onFerdig, onFremdrift, neste, onTema }) {
  const { fase, ov, morkt } = useFilm({ synlig, spiller, AUTO, SISTE, START: F.START, HVILE: F.SLUTT, onFerdig, onFremdrift });
  const akt = aktFor(fase);
  const tema = temaFor(fase);
  React.useEffect(() => { onTema?.(tema); }, [onTema, tema]);
  return (
    <KinoStage bilder={BILDER} aktiv={bildeFor(fase)} neste={nesteFor(fase)} tema={tema} sone driv="full" ov={ov} synlig={synlig} morkt={morkt} fase={fase} testid="v4-kino-kontrakt">
      <Valgt fase={fase} ov={ov} />
      <Kontrakt fase={fase} ov={ov} />
      <Depositum fase={fase} ov={ov} />
      <Booking fase={fase} ov={ov} />
      <Protokoll fase={fase} ov={ov} />
      <Slutt fase={fase} ov={ov} />
      <KinoTekst nr="02" kapittel="Kontrakten" akter={AKTER} id={akt.id} ov={ov} />
      <KinoNeste vis={fase >= F.SLUTT} navn={neste} dur={AUTO[F.SLUTT]} ov={ov} />
    </KinoStage>
  );
}
