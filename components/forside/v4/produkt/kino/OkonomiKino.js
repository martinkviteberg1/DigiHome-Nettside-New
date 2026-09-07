'use client';

import React from 'react';
import { EASE, T, display, tall } from '../../motion';
import { Hake, useFilm } from '../filmdeler';
import { dekk, useKino, farger, KinoStage, KinoTekst, Etikett, Flyt, Rad, Sone, Merke, KinoNeste, KinoSms, Teller } from './Kino';
import { FOTO } from './bilder';

/* ---------------------------------------------------------------------------
   OkonomiKino — kapittel 4 i full bleed. «Fra husleie til ferdig regnskap.»

   Bygården ER regnskapet. 1. november, tidlig morgen: fasaden alene. Så lyser
   vinduene opp ett og ett — hver husleie som registreres tenner lyset i sin
   leilighet, og listen til høyre fylles i samme takt. Sju lyser. Ett står mørkt.
   Dag 3: Mikkel får en vennlig SMS med Vipps, betaler, vinduet lyser. Så faller
   kvelden: rørleggerfakturaen fra Drift lander på Leilighet 2, måneden bokføres
   og går til regnskapet. Ingen trykk fra eieren — det er poenget.
--------------------------------------------------------------------------- */

const FASE_NAVN = ['START', 'LYS1', 'LYS2', 'LYS3', 'LYS4', 'LYS5', 'LYS6', 'LYS7', 'VENTER', 'LISTE', 'DAG3', 'PURR', 'BETALT', 'MND', 'FAKTURA', 'BOKFORT', 'SLUTT'];
const F = Object.fromEntries(FASE_NAVN.map((n, i) => [n, i]));
const AUTO = {
  [F.START]: 1800,
  [F.LYS1]: 900, [F.LYS2]: 700, [F.LYS3]: 800, [F.LYS4]: 700, [F.LYS5]: 700, [F.LYS6]: 700, [F.LYS7]: 1100,
  [F.VENTER]: 2200, [F.LISTE]: 1400,
  [F.DAG3]: 1600, [F.PURR]: 2400, [F.BETALT]: 2200,
  [F.MND]: 1700, [F.FAKTURA]: 2200, [F.BOKFORT]: 2800,
  [F.SLUTT]: 4400,
};
const SISTE = F.SLUTT;

const BILDER = [FOTO.fasadeMorgen, { ...FOTO.fasadeKveld, id: 'kveld' }];
const K = Object.fromEntries(BILDER.map((b) => [b.id, b]));
const erKveld = (fase) => fase >= F.MND;
const bildeFor = (fase) => (erKveld(fase) ? 'kveld' : 'morgen');
const temaFor = (fase) => (erKveld(fase) ? 'mork' : 'lys');
const nesteFor = (fase) => (fase < F.MND ? 'kveld' : null);

const AKTER = [
  { id: 'inn', fra: F.START, tittel: 'Husleien kommer.', tekst: '1. november. Leilighet for leilighet — uten at du sjekker kontoen.' },
  { id: 'en', fra: F.VENTER, tittel: 'Én mangler.', tekst: 'Sju av åtte har betalt. DigiHome venter til den tredje.' },
  { id: 'purr', fra: F.DAG3, tittel: 'Påminnelsen går av seg selv.', tekst: 'Mikkel får SMS med Vipps. Betalt på under et minutt.' },
  { id: 'fakt', fra: F.MND, tittel: 'Fakturaen lander riktig.', tekst: 'Rørleggerfakturaen bokføres på Leilighet 2 — med bilag.' },
  { id: 'lukk', fra: F.BOKFORT, tittel: 'Måneden lukkes.', tekst: 'Inn, ut og bilag — ført og sendt til regnskapet.' },
  { id: 'slutt', fra: F.SLUTT, tittel: 'Betalt. Bokført.', tekst: 'Neste måned skjer det igjen.' },
];
const aktFor = (fase) => { let a = AKTER[0]; AKTER.forEach((x) => { if (fase >= x.fra) a = x; }); return a; };

/* Leilighetene — vinduene i fasadebildet (andel av bildet) og husleien. Sum 64 500 kr. `lys` = fasen betalingen registreres. */
const LEIL = [
  { n: 1, x: 0.345, y: 0.62, leie: 8900, tid: '07:31', lys: F.LYS5 },
  { n: 2, x: 0.755, y: 0.57, leie: 12500, tid: '07:04', lys: F.LYS3, navn: 'Emma' },
  { n: 3, x: 0.60, y: 0.60, leie: 7400, tid: '06:52', lys: F.LYS1 },
  { n: 4, x: 0.962, y: 0.56, leie: 9200, tid: '08:12', lys: F.LYS7 },
  { n: 5, x: 0.36, y: 0.26, leie: 6800, tid: '3. nov 08:12', lys: null, navn: 'Mikkel' },
  { n: 6, x: 0.46, y: 0.23, leie: 7100, tid: '07:40', lys: F.LYS6 },
  { n: 7, x: 0.60, y: 0.22, leie: 6300, tid: '06:58', lys: F.LYS2 },
  { n: 8, x: 0.755, y: 0.19, leie: 6300, tid: '07:15', lys: F.LYS4 },
];
const SUM = LEIL.reduce((s, l) => s + l.leie, 0);
const RORLEGGER = 3900;
const betalt = (l, fase) => (l.lys != null ? fase >= l.lys : fase >= F.PURR);
const LISTE_REKKE = [...LEIL].sort((a, b) => a.n - b.n);
/* Den sist tente leiligheten (etiketten på vinduet viser bare den) */
const sistTent = (fase) => { if (fase >= F.PURR && fase < F.MND) return LEIL[4]; let s = null; LEIL.forEach((l) => { if (l.lys != null && fase >= l.lys && (!s || l.lys > s.lys)) s = l; }); return fase <= F.LYS7 + 1 ? s : null; };

/* ── Lyset i et vindu — en varm kjerne og en myk glorie. Kun opacity/transform. ── */
function Lys({ l, g, fase, ov }) {
  const paa = betalt(l, fase);
  const p = g.punkt(l.x, l.y);
  const kw = Math.round(g.dw * 0.026); const kh = Math.round(g.dh * 0.085);
  const gw = Math.round(g.dw * 0.10); const gh = Math.round(g.dh * 0.24);
  const t = ov ? 'none' : `opacity 900ms ${EASE}, transform 1400ms ${EASE}`;
  return (
    <>
      <div aria-hidden="true" className="absolute" style={{ left: p.x - gw / 2, top: p.y - gh / 2, width: gw, height: gh, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,186,105,0.50), rgba(255,186,105,0.16) 55%, rgba(255,186,105,0) 100%)', mixBlendMode: 'screen', opacity: paa ? 1 : 0, transform: paa ? 'scale(1)' : 'scale(0.6)', transition: t, willChange: 'transform, opacity' }} />
      {/* Kjernen: lys inne i vinduet — myk (statisk blur på et lite element; bare opacity/transform beveger seg) */}
      <div aria-hidden="true" className="absolute" style={{ left: p.x - kw / 2, top: p.y - kh / 2, width: kw, height: kh, borderRadius: 6, background: 'rgba(255,214,160,0.42)', boxShadow: '0 0 26px 10px rgba(255,196,120,0.30)', filter: 'blur(5px)', mixBlendMode: 'screen', opacity: paa ? 1 : 0, transform: paa ? 'scale(1)' : 'scale(0.8)', transition: t, willChange: 'transform, opacity' }} data-testid={`v4-kino-lys-${l.n}`} data-paa={paa ? '1' : '0'} />
    </>
  );
}

function Vinduer({ fase, ov }) {
  const st = useKino();
  const g = dekk(st, K[bildeFor(fase)]);
  if (!g) return null;
  const sist = sistTent(fase);
  return (
    <>
      {LEIL.map((l) => <Lys key={l.n} l={l} g={g} fase={fase} ov={ov} />)}
      {/* Kvelden: rørleggerfakturaen lander på Leilighet 2 — vinduet pulserer */}
      {!st.kompakt && (() => { const l2 = LEIL[1]; const p = g.punkt(l2.x, l2.y); const vis = fase >= F.FAKTURA && fase < F.SLUTT; return <Etikett vis={vis} x={p.x} y={p.y} tone="gronn" plass="over" delay={200} puls ov={ov} testid="v4-kino-etikett-faktura">Faktura · {tall(RORLEGGER)} kr · Leilighet 2</Etikett>; })()}
      {!st.kompakt && LEIL.filter((l) => l.x < 0.7).map((l) => {
        const p = g.punkt(l.x, l.y);
        const vis = sist?.n === l.n;
        return (
          <Etikett key={l.n} vis={vis} x={p.x} y={p.y} tone={l.n === 5 ? 'gronn' : 'lilla'} plass={l.x > 0.9 ? 'venstre' : 'over'} delay={200} ov={ov} testid={`v4-kino-etikett-${l.n}`}>
            Leilighet {l.n} · {tall(l.leie)} kr
          </Etikett>
        );
      })}
    </>
  );
}

/* ── Listen til høyre — vinduene ble regnskapet ── */
function Liste({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.LYS1 && fase <= F.BETALT;
  const antall = LEIL.filter((l) => betalt(l, fase)).length;
  const sum = LEIL.filter((l) => betalt(l, fase)).reduce((s, l) => s + l.leie, 0);
  const full = antall === LEIL.length;
  return (
    <Sone testid="v4-kino-o-liste" bredde={500} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Flyt vis={vis} ov={ov}>
        <p className="text-[12.5px] font-medium" style={{ color: f.svak }}>Husleie · november</p>
        <p className={`${kompakt ? 'mt-1 text-[40px]' : 'mt-1.5 text-[clamp(44px,3.6vw,68px)]'} leading-none`} style={{ ...display, color: full ? f.gronn : f.tekst, transition: `color 500ms ${EASE}` }} data-testid="v4-kino-sum">
          <Teller til={sum} fra={0} aktiv={vis && fase >= F.LYS1} dur={1200} ov={ov} /> <span className={kompakt ? 'text-[16px]' : 'text-[22px]'} style={{ fontFamily: 'inherit', letterSpacing: 0 }}>kr</span>
        </p>
        <p className={`${kompakt ? 'mt-1.5 text-[12.5px]' : 'mt-2 text-[13.5px]'}`} style={{ color: f.svak }}>{full ? 'Alt inne' : `av ${tall(SUM)} kr`} · {antall} av {LEIL.length} registrert</p>
      </Flyt>
      <div className={kompakt ? 'mt-2' : 'mt-4'}>
        {LISTE_REKKE.map((l, i) => {
          const b = betalt(l, fase);
          const venter = !b && fase >= F.VENTER;
          const purret = l.n === 5 && fase >= F.DAG3 && !b;
          return (
            <Rad key={l.n} vis={vis && (b || venter)} ov={ov} sist={i === LISTE_REKKE.length - 1} testid={`v4-kino-leil-${l.n}`}
              venstre={<span className={`${kompakt ? 'text-[13px]' : 'text-[14px]'} font-medium`} style={{ color: b ? f.tekst : f.svak }}>Leilighet {l.n}{l.navn ? <span className="font-normal" style={{ color: f.svak }}> · {l.navn}</span> : null}</span>}
              hoyre={(
                <span className="inline-flex items-center gap-2.5">
                  <span className={`${kompakt ? 'text-[13.5px]' : 'text-[14.5px]'}`} style={{ color: b ? f.tekst : f.svak }}>{tall(l.leie)} kr</span>
                  {b ? <Merke tekst={l.n === 5 ? 'Vipps · 3. nov' : l.tid} tone="gronn" /> : <Merke tekst={purret ? 'Påminnet' : 'Venter'} tone={purret ? 'lilla' : 'noytral'} />}
                </span>
              )}
            />
          );
        })}
      </div>
      {!kompakt && <KinoSms vis={vis && fase >= F.DAG3 && fase < F.BETALT} ov={ov} til="Mikkel" tid="3. nov 08:00" tekst="Hei Mikkel! Husleien for november (6 800 kr) er ikke registrert ennå. Betal enkelt med Vipps: digihome.no/v/9m2k – DigiHome" className="mt-4" testid="v4-kino-sms-purr" />}
    </Sone>
  );
}

/* ── Månedsslutt: fakturaen lander, måneden lukkes ── */
function Maaned({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.MND && fase < F.SLUTT;
  return (
    <Sone testid="v4-kino-o-maaned" bredde={500} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Flyt vis={vis} ov={ov}><p className="text-[12.5px] font-medium" style={{ color: f.svak }}>Månedsslutt · november</p></Flyt>
      <div className="mt-2">
        <Rad vis={vis} ov={ov} delay={250} sist={false} testid="v4-kino-o-faktura"
          venstre={<span className="min-w-0"><span className={`block font-medium ${kompakt ? 'text-[14px]' : 'text-[15px]'}`} style={{ color: f.tekst }}>Lie VVS · rørlegger</span><span className="block text-[12px]" style={{ color: f.svak }}>Varmtvann · Leilighet 2 · {fase >= F.FAKTURA ? 'bilag lagt ved' : 'faktura mottatt'}</span></span>}
          hoyre={<span className="inline-flex items-center gap-2.5"><span className={`${kompakt ? 'text-[13.5px]' : 'text-[14.5px]'}`} style={{ color: f.tekst }}>−{tall(RORLEGGER)} kr</span>{fase >= F.FAKTURA && <Merke tekst="Leilighet 2" tone="gronn" />}</span>}
        />
        <Rad vis={vis && fase >= F.BOKFORT} ov={ov} sist={false} testid="v4-kino-o-inn"
          venstre={<span className={kompakt ? 'text-[13px]' : 'text-[13.5px]'} style={{ color: f.svak }}>Inn · husleie 8 leiligheter</span>}
          hoyre={<span className={`font-medium ${kompakt ? 'text-[13.5px]' : 'text-[14.5px]'}`} style={{ color: f.tekst }}>{tall(SUM)} kr</span>}
        />
        <Rad vis={vis && fase >= F.BOKFORT} ov={ov} delay={180} sist={false} testid="v4-kino-o-ut"
          venstre={<span className={kompakt ? 'text-[13px]' : 'text-[13.5px]'} style={{ color: f.svak }}>Ut · vedlikehold</span>}
          hoyre={<span className={`font-medium ${kompakt ? 'text-[13.5px]' : 'text-[14.5px]'}`} style={{ color: f.tekst }}>−{tall(RORLEGGER)} kr</span>}
        />
        <Rad vis={vis && fase >= F.BOKFORT} ov={ov} delay={360} sist testid="v4-kino-o-netto"
          venstre={<span className={`font-medium ${kompakt ? 'text-[14px]' : 'text-[15px]'}`} style={{ color: f.tekst }}>Netto november</span>}
          hoyre={<span className={`${kompakt ? 'text-[22px]' : 'text-[26px]'}`} style={{ ...display, color: f.tekst }}>{tall(SUM - RORLEGGER)} kr</span>}
        />
      </div>
      <Flyt vis={vis && fase >= F.BOKFORT} ov={ov} delay={900} className={kompakt ? 'mt-4' : 'mt-5'}>
        <p className={`inline-flex items-center gap-2 ${kompakt ? 'text-[13.5px]' : 'text-[14.5px]'}`} style={{ color: f.brod }}>
          <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full" style={{ background: f.gronnBg, color: f.gronn }}><Hake size={10} /></span>
          Bokført med bilag · overført til PowerOffice
        </p>
      </Flyt>
    </Sone>
  );
}

/* ── Slutt ── */
function Slutt({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.SLUTT;
  return (
    <Sone testid="v4-kino-o-slutt" bredde={420} style={{ pointerEvents: 'none' }}>
      <Flyt vis={vis} ov={ov} delay={300}>
        <p className="text-[12.5px] font-medium" style={{ color: f.svak }}>November · Nygårdsgaten 5</p>
        <div className={`${kompakt ? 'mt-3' : 'mt-4'} grid grid-cols-3 gap-4`}>
          {[['Husleie inn', `${tall(SUM)} kr`], ['Påminnelser', '1 · Vipps'], ['Bilag', '1 · riktig sted']].map(([k, v]) => (
            <div key={k}><p className="text-[11.5px]" style={{ color: f.svak }}>{k}</p><p className={`mt-0.5 font-medium tracking-[-0.005em] ${kompakt ? 'text-[14px]' : 'text-[16px]'}`} style={{ color: f.tekst }}>{v}</p></div>
          ))}
        </div>
      </Flyt>
      {!kompakt && (
        <Flyt vis={vis} ov={ov} delay={700} className="mt-5 flex flex-wrap gap-2">
          <Merke tekst="Ingen trykk fra deg" tone="gronn" /><Merke tekst="Klart for regnskapsfører" tone="gronn" />
        </Flyt>
      )}
    </Sone>
  );
}

export default function OkonomiKino({ synlig, spiller, onFerdig, onFremdrift, neste, onTema }) {
  const { fase, ov, morkt } = useFilm({ synlig, spiller, AUTO, SISTE, START: F.START, HVILE: F.SLUTT, onFerdig, onFremdrift });
  const akt = aktFor(fase);
  const tema = temaFor(fase);
  React.useEffect(() => { onTema?.(tema); }, [onTema, tema]);
  const sone = fase >= F.LYS1;
  return (
    <KinoStage bilder={BILDER} aktiv={bildeFor(fase)} neste={nesteFor(fase)} tema={tema} sone={sone} driv="av" ov={ov} synlig={synlig} morkt={morkt} fase={fase} testid="v4-kino-okonomi">
      <Vinduer fase={fase} ov={ov} />
      <Liste fase={fase} ov={ov} />
      <Maaned fase={fase} ov={ov} />
      <Slutt fase={fase} ov={ov} />
      <KinoTekst nr="04" kapittel="Økonomien" akter={AKTER} id={akt.id} ov={ov} />
      <KinoNeste vis={fase >= F.SLUTT} navn={neste} dur={AUTO[F.SLUTT]} ov={ov} />
    </KinoStage>
  );
}
