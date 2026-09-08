'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, Lenke, T, display, tall, useRedusert, useSmal, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   AltSamletSeksjon — «Hele utleien. Ett sted.»

   Produktseksjonen viste ETT område i dybden. Denne svarer på «og resten?» — de fem områdene i livssyklusen,
   i rekkefølge, én linje hver. Contained editorial: register på hårlinjer, ingen ikoner, ingen kort — heller ikke rundt fragmentene.

   Det nye: registeret LEVER. Én og samme leietaker (Emma) går gjennom alle fem — og for hvert område står et lite,
   ekte fragment av produktet på scenen ved siden av: annonsen hun meldte seg på, kontrakten hun signerte, husleien
   hun betalte, spørsmålet hun stilte, saken som ble løst. Leselyset går rolig nedover registeret av seg selv;
   trykk på en rad, så står det der (musen alene endrer ingenting). Slik ser man at «det som skjer i ett, oppdaterer de andre» — uten at
   noen sier det.
--------------------------------------------------------------------------- */

const OMRADER = [
  { nr: '01', id: 'annonse', navn: 'Annonse', t: 'Lag annonsen én gang. Interessenter og visninger samlet på boligen.' },
  { nr: '02', id: 'kontrakt', navn: 'Kontrakt', t: 'Leiekontrakten signeres med BankID. Depositum og innflytting følger.' },
  { nr: '03', id: 'okonomi', navn: 'Økonomi', t: 'Husleien registreres, følges opp og purres. Du ser hva som er inne — per bolig.' },
  { nr: '04', id: 'leietaker', navn: 'Leietaker', t: 'Spørsmål besvares fra kontrakten. Meldinger som trenger noe, blir saker.' },
  { nr: '05', id: 'drift', navn: 'Drift', t: 'Fra melding til løst: sak, leverandør og pris — du godkjenner med ett trykk.' },
];

/* Én linje under fragmentet: hva som skjedde her — og hva det utløste et annet sted */
const FORKLARING = {
  annonse: 'Annonsen ble laget fra boligen. Emma meldte seg på visning — og lå klar som leietaker da kontrakten skulle skrives.',
  kontrakt: 'Kontrakten ble satt opp med det som alt lå på boligen, signert med BankID — og husleien begynte å følge seg selv.',
  okonomi: 'Husleien matches mot KID og bokføres. Blir den ikke betalt, går varsel og purring uten at du løfter en finger.',
  leietaker: 'Spørsmål besvares fra kontrakten. Trenger noe deg, løftes det — resten holder systemet i samtalen.',
  drift: 'Meldingen ble en sak, saken fikk en leverandør og en pris. Du godkjente. Fakturaen lå i regnskapet etterpå.',
};

const HAIR = 'rgba(21,19,15,0.10)';
const DIM = 'rgba(21,19,15,0.55)';
const GRONN = '#1F9D55';
const TAKT = 4200;
const EMMA = '/v4/annonse/leietaker-emma.webp';

function Prikk({ farge = GRONN }) { return <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: farge }} />; }
function Hake({ size = 12, farge = GRONN }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7.5l3 3 6-6.5" stroke={farge} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
/* Fem fragmenter av produktet — samme leietaker hele veien. Ingen kort, ingen flate bak: innholdet står rett på
   siden, på hårlinjer, i sidens egen typografi. Bildet er det eneste med kant — og det er et fotografi. */
const RAD = 'flex items-baseline justify-between gap-4 border-t py-3.5 text-[15px]';

function Fragment({ id }) {
  if (id === 'annonse') {
    return (
      <div className="w-full" data-frag="annonse">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/v4/annonse/stue-moblert-700.webp" alt="" width={700} height={440} loading="lazy" decoding="async" className="aspect-[16/10] w-full rounded-[18px] object-cover" />
        <div className="mt-5 flex items-baseline justify-between text-[13px]" style={{ color: DIM }}><span>FINN · annonse</span><span className="tabular-nums">1 240 visninger</span></div>
        <p className="mt-1.5 text-[24px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Nygårdsgaten 5 · 2 rom</p>
        <div className={`mt-4 ${RAD}`} style={{ borderColor: HAIR }}>
          <span style={{ color: DIM }}>Visning lørdag 12:00</span>
          <span className="inline-flex items-center gap-2">
            <span className="flex -space-x-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={EMMA} alt="" width={22} height={22} loading="lazy" className="h-[22px] w-[22px] rounded-full object-cover" style={{ boxShadow: `0 0 0 1.5px ${T.canvas}` }} />
              {['MH', 'SL'].map((i) => <span key={i} className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[9px] font-medium" style={{ background: 'rgba(21,19,15,0.08)', boxShadow: `0 0 0 1.5px ${T.canvas}` }}>{i}</span>)}
            </span>
            <span className="font-medium">4 påmeldt</span>
          </span>
        </div>
      </div>
    );
  }
  if (id === 'kontrakt') {
    return (
      <div className="w-full" data-frag="kontrakt">
        <div className="flex items-baseline justify-between text-[13px]" style={{ color: DIM }}><span>Leiekontrakt · Nygårdsgaten 5</span><span className="tabular-nums">28. okt</span></div>
        <div className="mt-5 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={EMMA} alt="" width={56} height={56} loading="lazy" className="h-14 w-14 rounded-full object-cover" />
          <div><p className="text-[24px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Emma Sørensen</p><p className="mt-1 text-[14px]" style={{ color: DIM }}>3 år · fra 1. november · 14 500 kr/mnd</p></div>
        </div>
        <dl className="mt-6">
          <div className={RAD} style={{ borderColor: HAIR }}><dt style={{ color: DIM }}>Signert</dt><dd className="inline-flex items-center gap-1.5 font-medium" style={{ color: GRONN }}><Hake />BankID · begge parter</dd></div>
          <div className={RAD} style={{ borderColor: HAIR }}><dt style={{ color: DIM }}>Depositum</dt><dd className="tabular-nums font-medium">{tall(37500)} kr · garanti</dd></div>
          <div className={`${RAD} border-b`} style={{ borderColor: HAIR }}><dt style={{ color: DIM }}>Innflytting</dt><dd className="font-medium">1. nov · protokoll klar</dd></div>
        </dl>
      </div>
    );
  }
  if (id === 'okonomi') {
    const rader = [['nov', '1. nov'], ['okt', '1. okt'], ['sep', '1. sep']];
    return (
      <div className="w-full" data-frag="okonomi">
        <div className="flex items-baseline justify-between text-[13px]" style={{ color: DIM }}><span>Husleie · Leilighet 2</span><span>Emma Sørensen</span></div>
        <p className="mt-3 text-[44px] tabular-nums sm:text-[52px]" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1 }}>{tall(14500)} kr<span className="text-[15px]" style={{ color: DIM, letterSpacing: 0 }}> /mnd</span></p>
        <ol className="mt-6">
          {rader.map(([m, d], i) => (
            <li key={m} className={`${RAD} ${i === rader.length - 1 ? 'border-b' : ''}`} style={{ borderColor: HAIR }}>
              <span className="w-10 uppercase tabular-nums" style={{ color: DIM }}>{m}</span><span className="tabular-nums">{tall(14500)} kr</span><span className="inline-flex items-center gap-2" style={{ color: GRONN }}><Prikk />betalt · {d}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[13px]" style={{ color: DIM }}>Matchet mot KID · bokført av seg selv</p>
      </div>
    );
  }
  if (id === 'leietaker') {
    return (
      <div className="w-full" data-frag="leietaker">
        <div className="flex items-baseline justify-between text-[13px]" style={{ color: DIM }}><span>Meldinger · Emma</span><span className="tabular-nums">tir. 22:14</span></div>
        <div className="mt-5 flex flex-col gap-2.5">
          <div className="flex items-end justify-end gap-2.5"><span className="max-w-[78%] px-4 py-2.5 text-[15px] leading-[1.4]" style={{ background: T.ink, color: T.offwhite, borderRadius: '18px 18px 5px 18px' }}>Hei! Kan jeg ha katt i leiligheten?</span>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={EMMA} alt="" width={26} height={26} loading="lazy" className="h-[26px] w-[26px] rounded-full object-cover" /></div>
          <div className="flex items-end gap-2.5">
            <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full" style={{ background: T.lilla }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.ink }} /></span>
            <span className="max-w-[84%] px-4 py-2.5 text-[15px] leading-[1.4]" style={{ background: 'rgba(21,19,15,0.06)', borderRadius: '18px 18px 18px 5px' }}>Ja — kontrakten din tillater husdyr etter avtale. Jeg har sendt spørsmålet til utleier, du hører fra oss i morgen.</span>
          </div>
        </div>
        <p className="mt-5 border-t pt-3.5 text-[13px]" style={{ borderColor: HAIR, color: DIM }}>Svart fra kontrakten · punkt 9 · 22:14</p>
      </div>
    );
  }
  return (
    <div className="w-full" data-frag="drift">
      <div className="flex items-baseline justify-between text-[13px]" style={{ color: DIM }}><span className="inline-flex items-center gap-2"><Prikk />Løst</span><span className="tabular-nums">tor. 09:58</span></div>
      <p className="mt-3 text-[24px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Ingen varmtvann · Leilighet 2</p>
      <p className="mt-1.5 text-[14px]" style={{ color: DIM }}>Meldt av Emma tir. 22:41 · Rørlegger AS torsdag 08–10</p>
      <div className="mt-6 flex items-center justify-between border-t border-b py-4" style={{ borderColor: HAIR }}>
        <span className="text-[36px] tabular-nums" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(2400)} kr</span>
        <span className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium" style={{ background: 'rgba(31,157,85,0.12)', color: GRONN }}><Hake />Godkjent av deg</span>
      </div>
      <p className="mt-3 text-[13px]" style={{ color: DIM }}>Fakturaen ligger i regnskapet · Emma fikk beskjed</p>
    </div>
  );
}

export default function AltSamletSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const smal = useSmal();
  const redusert = useRedusert();
  const inn = (i) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(16px)', transition: `opacity 700ms ${EASE} ${i * 80}ms, transform 800ms ${EASE} ${i * 80}ms` });

  /* Leselyset: går nedover registeret av seg selv (TAKT) når seksjonen er i bildet; pek/trykk holder i 9 s. */
  const [aktiv, setAktiv] = useState(0);
  const pause = useRef(0);
  useEffect(() => {
    if (!synlig || redusert) return undefined;
    const id = window.setInterval(() => { if (Date.now() < pause.current) return; setAktiv((a) => (a + 1) % OMRADER.length); }, TAKT);
    return () => window.clearInterval(id);
  }, [synlig, redusert]);
  const [manuell, setManuell] = useState(false);
  const velg = (i) => { pause.current = Date.now() + 12000; setAktiv(i); setManuell(true); };
  useEffect(() => {
    if (!manuell) return undefined;
    const t = window.setTimeout(() => setManuell(false), 12000);
    return () => window.clearTimeout(t);
  }, [manuell, aktiv]);

  /* Fragmentet: det aktive står skarpt; det forrige tones bort mens det nye kommer (begge i samme rute). */
  const [vist, setVist] = useState({ id: OMRADER[0].id, forrige: null });
  useEffect(() => {
    const id = OMRADER[aktiv].id;
    setVist((v) => (v.id === id ? v : { id, forrige: v.id }));
    const t = window.setTimeout(() => setVist((v) => ({ ...v, forrige: null })), 600);
    return () => window.clearTimeout(t);
  }, [aktiv]);

  const scene = (
    <div className="relative grid h-full w-full items-center" data-testid="v4-alt-scene" data-aktiv={vist.id}>
      {vist.forrige && (
        <div key={`ut-${vist.forrige}`} className="col-start-1 row-start-1" aria-hidden="true" style={{ animation: `v4-frag-ut 520ms ${EASE} both`, pointerEvents: 'none' }}><Fragment id={vist.forrige} /></div>
      )}
      <div key={vist.id} className="col-start-1 row-start-1" style={{ animation: redusert ? 'none' : `v4-frag-inn 700ms ${EASE} 60ms both` }}><Fragment id={vist.id} /></div>
    </div>
  );

  /* Scenen: ingen flate, ingen boks — én kolonne rett på siden. Øverst samme leietaker hele veien, i midten
     fragmentet fra området som er valgt, nederst én linje om hva det utløste. */
  const stage = (
    <div className="flex h-full flex-col" style={{ minHeight: smal ? 380 : 520 }} data-testid="v4-alt-stage">
      <div className="flex items-center justify-between gap-4 border-b pb-4 text-[13px]" style={{ color: DIM, borderColor: HAIR }}>
        <span className="inline-flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={EMMA} alt="" width={22} height={22} loading="lazy" className="h-[22px] w-[22px] shrink-0 rounded-full object-cover" />
          <span className="truncate"><span className="font-medium" style={{ color: T.ink }}>Emma Sørensen</span><span className="hidden sm:inline"> · Nygårdsgaten 5 · Leilighet 2</span><span className="sm:hidden"> · Leilighet 2</span></span>
        </span>
        <span className="inline-grid shrink-0 text-right tabular-nums">
          {OMRADER.map((x, i) => (
            <span key={x.id} className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: i === aktiv ? 1 : 0, transform: i === aktiv ? 'none' : 'translateY(4px)', transition: `opacity 400ms ${EASE}, transform 500ms ${EASE}` }}><span style={{ color: T.lilla }}>{x.nr}</span> · {x.navn}</span>
          ))}
        </span>
      </div>
      <div className="flex flex-1 items-stretch py-8 sm:py-10 lg:px-6">{scene}</div>
      <p className="border-t pt-4 text-[14px] leading-[1.5]" style={{ color: DIM, borderColor: HAIR }}>
        <span className="inline-grid w-full">
          {OMRADER.map((x, i) => (
            <span key={x.id} className="col-start-1 row-start-1" style={{ opacity: i === aktiv ? 1 : 0, transition: `opacity 400ms ${EASE} ${i === aktiv ? 200 : 0}ms` }}>{FORKLARING[x.id]}</span>
          ))}
        </span>
      </p>
    </div>
  );

  return (
    <section id="alt" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4-alt">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-28">
        {/* Overskrift: påstand til venstre, én setning og lenke til høyre — samme takt som seksjonene rundt */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10" style={inn(0)}>
          <h2 className="text-[clamp(40px,4.4vw,76px)] lg:col-span-7" style={{ ...display, color: T.ink }} data-testid="v4-alt-tittel">
            Hele utleien.<br />Ett sted.
          </h2>
          <div className="lg:col-span-4 lg:col-start-9 lg:pb-2">
            <p className="max-w-[34ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: 'rgba(21,19,15,0.64)' }}>
              Fem områder som henger sammen. Det som skjer i ett, oppdaterer de andre — og det meste skjer uten deg.
            </p>
            <div className="mt-5"><Lenke href="/omvisning" data-testid="v4-alt-lenke">Se DigiHome</Lenke></div>
          </div>
        </div>

        {/* Registeret til venstre (velg med et trykk — musen alene endrer ingenting), scenen til høyre. Leselyset går
            videre av seg selv i rolig takt til du velger; da holder det i 12 s. */}
        <div className="mt-10 grid gap-6 lg:mt-14 lg:grid-cols-12 lg:items-stretch lg:gap-10">
          {smal && <div className="min-w-0" style={inn(1)}>{stage}</div>}

          <ol className="min-w-0 lg:col-span-5" data-testid="v4-alt-liste" style={inn(1)}>
            {OMRADER.map((x, i) => {
              const er = i === aktiv;
              return (
                <li
                  key={x.nr}
                  className="relative"
                  style={{ borderTop: `1px solid ${HAIR}`, borderBottom: i === OMRADER.length - 1 ? `1px solid ${HAIR}` : 'none' }}
                  data-testid={`v4-alt-${x.id}`}
                  data-aktiv={er ? '1' : '0'}
                >
                  {er && synlig && !manuell && !redusert && (
                    <span key={`frem-${aktiv}`} aria-hidden="true" className="absolute bottom-[-1px] left-0 h-px" style={{ background: 'rgba(21,19,15,0.45)', animation: `v4-fremdrift ${TAKT}ms linear both` }} />
                  )}
                  <button
                    type="button"
                    onClick={() => velg(i)}
                    aria-pressed={er}
                    className="grid w-full grid-cols-[36px_minmax(0,1fr)] items-baseline gap-x-4 rounded-[10px] py-5 text-left transition-colors duration-300 hover:bg-[#15130F]/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/20 sm:grid-cols-[44px_minmax(0,1fr)] sm:py-6 lg:-mx-3 lg:w-[calc(100%+24px)] lg:px-3"
                  >
                    <span className="text-[13px] tabular-nums" style={{ color: er ? T.lilla : 'rgba(21,19,15,0.42)', transition: 'color 400ms' }}>{x.nr}</span>
                    <span className="min-w-0">
                      <span className="block text-[clamp(26px,2vw,32px)]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.ink, opacity: er ? 1 : 0.58, transition: `opacity 500ms ${EASE}` }}>{x.navn}</span>
                      <span className="mt-2 block max-w-[44ch] text-[15px] leading-[1.45]" style={{ color: 'rgba(21,19,15,0.62)', opacity: er ? 1 : 0.6, transition: `opacity 500ms ${EASE}` }}>{x.t}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {!smal && <div className="min-w-0 lg:col-span-7" style={inn(2)}>{stage}</div>}
        </div>
      </div>
    </section>
  );
}
