'use client';

/* ═══════════════════ Bergen Urban — presentasjonsdeck ═══════════════════
   Kinematisk sekvens:
   -1) SORT: helt sort — første klikk starter showet
   0) COVER (svart): DigiHome-ikon + navn + «Utleie på autopilot.»
   1) HISTORIEN (svart): «Historien om DigiHome.» — oppspill til origin
   2-3) IDEEN (svart): «Boligforvaltning kan automatiseres.» →
      prosessloopen (annonsering → visning → … om igjen og om igjen)
   4) KAOSET (svart): «Ti systemer som ikke snakker sammen.» — mørke
      verktøylapper med brutte forbindelser (problemet plantes)
   5) PROMPT (svart): ChatGPT-aktig bar → prompten skrives → send →
      tenkeprikker → auto-overgang
   6-8) AGENTEN (svart): AI-agenten bygger systemet → deploy → lys-tenning
   9) SVARET (lys): forvalterportalen materialiserer seg + AI-chat
   10) OMFANGET (lys): kameraet trekker ut — dashbordet er én flis i en
      produktvegg med 12 flater («Dette er DigiHome.»)
   11-12) HOOK (lys): påstand 1 → 6-åringens håndskrift (rack focus)
   13-14) SANNHETEN (lys): «Det var ikke én prompt.» → 1 000 timer/500 k
      mot tradisjonell utvikling 10 000 timer/5–10 mill. — proporsjonsbarer
   Navigasjon: → / mellomrom / PageDown (klikker) = neste beat,
   ← / PageUp = forrige, F = fullskjerm, R = start forfra. */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Caveat } from 'next/font/google';
import { Bot, Check, Rocket, Code2, Wand2, Radar } from 'lucide-react';
import OmfangVegg from '@/components/tour/mockups/OmfangVegg';
import ForvalterFullskjerm from '@/components/tour/mockups/ForvalterFullskjerm';
import AssistentChatMockup from '@/components/tour/mockups/AssistentChatMockup';

const caveat = Caveat({ subsets: ['latin', 'latin-ext'], weight: ['500', '600', '700'], display: 'swap' });

const PROMPT = 'Lag et AI-drevet system for utleie og boligforvaltning.';
const INTRO = 'Skal bli. Jeg bygger systemet modul for modul.';

// Ekte kodelinjer fra DigiHome-repoet (uten hemmeligheter) — «AI-en bygger
// systemet» fyller skjermen med disse i akselererende tempo.
const KODE = [
  "export async function opprettSigneringsjobb(db, { filId, tittel, signatarer }) {",
  "  const jobb = { id: uuidv4(), status: 'I_GANG', flyt: 'direkte', opprettet: naa() };",
  "  const manifest = byggDirectManifest({ tittel, signatarer, exitUrls });",
  "  const res = await postenKall({ metode: 'POST', url: BASE(), body: pakke, tls: mat.tls });",
  "  await db.collection(SIGN_JOBB_COLL).insertOne(jobb);",
  "  return { ok: true, jobbId: jobb.id };",
  "}",
  "// Leiekontrakt: genererer PDF med pdf-lib og sender til BankID-signering",
  "const kontrakt = await byggLeiekontraktPdf({ utleier, leietaker, leie, depositum });",
  "if (dokument.type === 'docx') pdf = await konverterDocxTilPdf(buffer);",
  "export async function pollSignering(db) {",
  "  const aktive = await db.collection(SIGN_JOBB_COLL).countDocuments({ status: 'I_GANG' });",
  "  if (!aktive) return { ok: true, aktive: 0, hendelser: 0 };",
  "  const res = await postenKall({ metode: 'GET', url: flow.url, tls: mat.tls });",
  "  await behandleDirectStatus(db, mat, res.body.toString('utf8'));",
  "}",
  "const leiepris = beregnAnbefaltLeie({ soverom, kvm, bydel: 'Bergenhus', standard });",
  "app.post('/api/leads', rateLimit(20), async (req) => opprettLead(await req.json()));",
  "// Visning: automatisk kalenderbooking med SMS-påminnelse til interessenter",
  "const slots = genererVisningsSlots({ fra, til, varighet: 20, perDag: 6 });",
  "await sendEpost({ til: leietaker.epost, emne: 'Velkommen hjem', html: byggVelkomstEpost(ctx) });",
  "export function byggSakEpost({ tittel, melding, prioritet, frist, mottaker }) {",
  "  const badges = [prioritetChip(prioritet), statusChip(status), fristChip(frist)];",
  "  return moderneRamme({ overskrift: tittel, innhold: renderMarkdown(melding), badges });",
  "}",
  "const depositum = Math.min(leie * 3, maksDepositum);",
  "await db.collection('tenants').updateOne({ id }, { $set: { skjermet: true } });",
  "// Økonomi: månedlig avstemming av husleie mot kontoutskrift",
  "const avvik = transaksjoner.filter((t) => !matchMotKontrakt(t, kontrakter));",
  "export async function reconcileSigneringsjobber(db, { maks = 5 } = {}) {",
  "  const jobber = await db.collection(SIGN_JOBB_COLL).find(filter).limit(maks).toArray();",
  "  for (const jobb of jobber) await hentStatusMedToken(db, jobb.sisteToken);",
  "}",
  "const annonse = await genererFinnAnnonse({ bolig, bilder, leiepris, visninger });",
  "if (score > 0.82) await varsleUtleier({ kanal: 'push', lead });",
  "// Chat: @mention-varsling med trådfølging og e-postfallback",
  "const nevnt = ekstraherMentions(melding).filter((m) => m.id !== avsender.id);",
  "await Promise.all(nevnt.map((m) => opprettNotifikasjon(db, m.id, 'MENTION', ctx)));",
  "export const middleware = (req) => sikkerhetsHeadere(NextResponse.next(), req);",
  "const brreg = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${orgnr}`);",
  "await lagreDokument(db, { kategori: 'Styret · Avtaler', fil: signertPades, laast: true });",
  "// Budsjett: re-utleie ved kontraktslutt med 14 dagers friksjonsledighet",
  "const aarsleie = maaneder.reduce((sum, m) => sum + m.leie * m.belegg, 0);",
  "const digest = åpneSaker.sort((a, b) => fristVekt(a) - fristVekt(b)).slice(0, 8);",
  "export async function autoPurring(db) {",
  "  const naerFrist = jobber.filter((j) => timerTil(j.frist) < 48 && !j.purret);",
  "  for (const j of naerFrist) await sendPurring(db, j);",
  "}",
  "const worker = new Worker('/api/pdf-worker');",
  "await instrumentation.startReminderScheduler({ intervall: 60_000 });",
  "// Datarom: nummerert DD-struktur med innsynslogg per investor",
  "const mapper = ['01 Selskap', '02 Avtaler', '03 Økonomi', '04 Teknisk', '05 Team'];",
  "const zip = await pakkDatarom(mapper, { vannmerke: investor.navn });",
  "if (!(await modulAuthed(request, db, 'dokumenter'))) return uautorisert();",
  "const kpi = { belegg: 0.98, aapneSaker: 3, signertDenneUken: 7, leads: 42 };",
  "await oppdaterKanban(db, sak.id, { status: 'PÅGÅR', flyttetAv: bruker.id });",
];

// Agentens verktøykall — dukker opp i samtalen i takt med kodestrømmen,
// som en ekte AI-agent som planlegger, oppretter filer og tester.
const AGENT_STEG = [
  { tekst: 'Datamodell: boliger, leietakere, kontrakter', fil: 'db/schema.js · 214 linjer' },
  { tekst: 'BankID-signering med Posten', fil: 'lib/signering.js · 412 linjer' },
  { tekst: 'Automatisk husleie og avstemming', fil: 'lib/okonomi.js · 187 linjer' },
  { tekst: 'AI-svar og visningsbooking', fil: 'lib/autopilot.js · 336 linjer' },
  { tekst: 'Annonsering og utleieprosess', fil: 'app/annonser.tsx · 254 linjer' },
  { tekst: 'Forvalterportal og eierapp', fil: 'app/portal.tsx · 598 linjer' },
  { tekst: 'Kjører tester', fil: '34/34 grønne' },
];
const KODE_FILER = ['signering.js', 'kontrakter.js', 'autopilot.js', 'portal.tsx'];

// Diskret syntaksfarging — to aksenter, resten dempet
const KODE_REGEX = /('[^']*'|`[^`]*`|\/\/.*$|\b(?:const|let|await|async|function|return|export|import|if|else|for|of|new|try|catch)\b)/g;
function KodeLinje({ tekst }) {
  if (tekst.trim().startsWith('//')) return <span className="text-white/[0.22]">{tekst}</span>;
  const deler = tekst.split(KODE_REGEX);
  return deler.map((d, i) => {
    if (!d) return null;
    let kl = 'text-white/[0.48]';
    if (d.startsWith("'") || d.startsWith('`')) kl = 'text-[#8fd4a8]/70';
    else if (d.startsWith('//')) kl = 'text-white/[0.22]';
    else if (/^(const|let|await|async|function|return|export|import|if|else|for|of|new|try|catch)$/.test(d)) kl = 'text-[#B57BFF]/80';
    // eslint-disable-next-line react/no-array-index-key
    return <span key={i} className={kl}>{d}</span>;
  });
}

// Animert teller — teller opp med myk utflating (til Sannheten-sliden)
function Teller({ til, aktiv, varighet = 1400, prefiks = '', suffiks = '' }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!aktiv) { setN(0); return undefined; }
    let raf;
    const start = performance.now();
    const tikk = (t) => {
      const p = Math.min(1, (t - start) / varighet);
      const e = 1 - Math.pow(1 - p, 3);
      setN(Math.round(til * e));
      if (p < 1) raf = requestAnimationFrame(tikk);
    };
    raf = requestAnimationFrame(tikk);
    return () => cancelAnimationFrame(raf);
  }, [aktiv, til, varighet]);
  return <>{prefiks}{n.toLocaleString('nb-NO').replace(/\s/g, '\u00A0')}{suffiks}</>;
}

// Prosessloopen — kjernen i ideen: de samme stegene, om igjen og om igjen
const PROSESSER = ['Annonsering', 'Visning', 'Kontrakt', 'Depositum', 'Innflytting', 'Vedlikehold', 'Utflytting'];
const PROSESSBAAND = `${PROSESSER.join('   →   ')}   →   `;

// Steg: -1 = helt sort (klikk starter showet) · 0 = cover ·
//       1 = «Historien om DigiHome.» (mørk) · 2 = ideen · 3 = prosessloopen ·
//       4 = kaoset (ti systemer, mørk) · 5 = bar · 6 = skriver ·
//       7 = sendt+tenker (auto→8) · 8 = agenten bygger (auto→9) · 9 = reveal ·
//       10 = omfanget (kameraet trekker ut til produktveggen) ·
//       11 = integrasjonene («Alt henger sammen.») ·
//       12 = påstand 1 · 13 = påstand 1+2 ·
//       14 = sannheten (DigiHome-tall) · 15 = + tradisjonell utvikling ·
//       16–18 = tre AI-roller (byggeren · verktøyene · agentene, én per klikk)
const TOTALT = 19;

// Innholdsfortegnelse — supersubtil meny nede i venstre hjørne for å hoppe
// direkte til en scene. Auto-beats (7) hoppes over; agent-scenen (8) spiller
// selv videre til reveal.
const TOC = [
  { steg: -1, tittel: 'Sort start' },
  { steg: 0, tittel: 'Cover · Utleie på autopilot' },
  { steg: 1, tittel: 'Historien om DigiHome' },
  { steg: 2, tittel: 'Idéen' },
  { steg: 3, tittel: 'Prosessloopen' },
  { steg: 4, tittel: 'Ti systemer' },
  { steg: 5, tittel: 'Prompten' },
  { steg: 8, tittel: 'Agenten bygger' },
  { steg: 9, tittel: 'Portalen' },
  { steg: 10, tittel: 'Produktveggen' },
  { steg: 11, tittel: 'Integrasjonene' },
  { steg: 12, tittel: 'Påstanden' },
  { steg: 13, tittel: '«6-åringen»' },
  { steg: 14, tittel: 'Sannheten' },
  { steg: 15, tittel: 'Sammenligningen' },
  { steg: 16, tittel: 'Tre AI-roller' },
];

// Lappeteppet — verktøyene forvaltere jonglerer i dag. Posisjoner i % av
// scenen (løs ring rundt sentrum, der DigiHome-panelet lander i beat 2).
const VERKTOY = [
  { kategori: 'CRM', navn: 'HubSpot', x: '14%', y: '15%', rot: -3.5 },
  { kategori: 'Økonomi', navn: 'Tripletex', x: '40%', y: '10%', rot: 2 },
  { kategori: 'Visninger', navn: 'Calendly', x: '66%', y: '13%', rot: -2 },
  { kategori: 'Signering', navn: 'DocuSign', x: '88%', y: '24%', rot: 2.5 },
  { kategori: 'Betaling', navn: 'Vipps', x: '92%', y: '58%', rot: -2 },
  { kategori: 'Oversikt', navn: 'Excel', x: '76%', y: '86%', rot: 3 },
  { kategori: 'Husleie', navn: 'Husleie.no', x: '50%', y: '91%', rot: -2.5 },
  { kategori: 'Dialog', navn: 'Outlook', x: '24%', y: '87%', rot: 2 },
  { kategori: 'Annonsering', navn: 'Finn', x: '7%', y: '63%', rot: -3 },
  { kategori: 'Kanaler', navn: 'Lodgify', x: '9%', y: '35%', rot: 2.5 },
];

// ── Integrasjonene — «Alt henger sammen.» (samme koreografi som /tour) ──
// DigiHome i midten, integrasjonene i ring rundt. Hver lyser opp i reisens
// rekkefølge med én fortellerlinje, før alt glir sammen: ett system.
const INTEGRASJONER = [
  { navn: 'Kartverket', vinkel: -90, tekst: 'Boligdata hentes fra Kartverket', logoer: [{ src: '/kartverket-logo.png', h: 18 }] },
  { navn: 'FINN.no', vinkel: -50, tekst: 'Annonsen publiseres rett på FINN', logoer: [{ src: '/finn-logo-full.png', h: 15 }] },
  { navn: 'Creditsafe', vinkel: -10, tekst: 'Kredittsjekk av kandidatene', logoer: [{ src: '/creditsafe-logo.png', h: 13 }] },
  { navn: 'BankID', vinkel: 30, tekst: 'Signering og identitet med BankID', logoer: [{ src: '/bankid-logo.png', h: 13 }] },
  { navn: 'Keyhole', vinkel: 70, tekst: 'Depositum opprettes og sikres med Keyhole', logoer: [{ src: '/keyhole-logo.png', h: 14 }] },
  { navn: 'Vipps', vinkel: 110, tekst: 'Betaling med Vipps', logoer: [{ src: '/vipps-logo.png', h: 16 }] },
  {
    navn: 'Regnskap', vinkel: 150,
    tekst: 'Oppgjøret rett i regnskapet — Fiken, PowerOffice eller Tripletex',
    logoer: [
      { src: '/fiken-logo.png', h: 13 },
      { src: '/poweroffice-logo.png', h: 12 },
      { src: '/tripletex-logo.png', h: 11 },
    ],
  },
  { navn: 'Airbnb', vinkel: -170, tekst: 'Korttid synkroniseres med Airbnb', logoer: [{ src: '/airbnb-logo.png', h: 17 }] },
  { navn: 'Booking.com', vinkel: -130, tekst: '— og med Booking.com', logoer: [{ src: '/booking-logo.png', h: 13 }] },
];
const INTEGRASJON_TRINN = [
  { navn: 'start', ms: 1100 },
  ...INTEGRASJONER.map((_, i) => ({ navn: `i${i}`, ms: 1500 })),
  { navn: 'alle', ms: 6000 },
];
const intPos = (vinkel) => {
  const r = (vinkel * Math.PI) / 180;
  return { x: 50 + 43 * Math.cos(r), y: 50 + 41 * Math.sin(r) };
};
const INT_LILLA = '#9B5BD6';

// ── Tre AI-roller — finalen: AI-en bygde, er innebygd, og jobber selv ──
const AI_ROLLER = [
  {
    navn: 'Byggeren',
    Ikon: Code2,
    tekst: 'AI-agenter skrev koden, designet flatene og testet systemet — modul for modul.',
    punkter: ['Skrev koden', 'Designet flatene', 'Testet seg selv'],
  },
  {
    navn: 'Verktøyene',
    Ikon: Wand2,
    tekst: 'AI innebygd der arbeidet skjer — i modulene forvalteren bruker hver dag.',
    punkter: ['Styler boligbilder', 'Skriver annonsene', 'Svarer i chatten'],
  },
  {
    navn: 'Agentene',
    Ikon: Radar,
    tekst: 'Autonome agenter som jobber alene i bakgrunnen — døgnet rundt, uten å bli bedt.',
    punkter: ['Overvåker FINN', 'Fanger leads', 'Følger opp frister'],
  },
];

function BUIntegrasjoner({ aktiv }) {
  const [fase, setFase] = useState(0);
  useEffect(() => {
    if (!aktiv) { setFase(0); return undefined; }
    const t = setTimeout(() => setFase((f) => (f + 1) % INTEGRASJON_TRINN.length), INTEGRASJON_TRINN[fase].ms);
    return () => clearTimeout(t);
  }, [aktiv, fase]);

  const lysende = fase >= 1 && fase <= INTEGRASJONER.length ? fase - 1 : -1;
  const alle = INTEGRASJON_TRINN[fase].navn === 'alle';

  return (
    <div className="w-full max-w-[600px] text-center">
      {/* Huben — DigiHome i midten, integrasjonene i ring */}
      <div className="relative mx-auto aspect-square w-full max-w-[min(46vh,470px)]" data-testid="bu-integrasjon-hub">
        {/* Forbindelseslinjene */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          {INTEGRASJONER.map((c, i) => {
            const p = intPos(c.vinkel);
            const lyser = i === lysende || alle;
            return (
              <line
                key={c.navn}
                x1="50" y1="50" x2={p.x} y2={p.y}
                stroke={lyser ? INT_LILLA : '#e9e6ef'}
                strokeOpacity={lyser ? (alle ? 0.35 : 0.6) : 1}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                style={{ transition: 'stroke 500ms, stroke-opacity 500ms' }}
              />
            );
          })}
        </svg>

        {/* DigiHome-kjernen */}
        <div
          className="absolute left-1/2 top-1/2 flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[20px] bg-white transition-shadow duration-700"
          style={{
            boxShadow: lysende >= 0 || alle
              ? '0 24px 60px -20px rgba(155,91,214,0.4), 0 0 0 1px rgba(0,0,0,0.04)'
              : '0 18px 50px -22px rgba(10,10,10,0.25), 0 0 0 1px rgba(0,0,0,0.04)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-mark.svg" alt="DigiHome" className="h-10 w-10 rounded-[9px]" />
        </div>

        {/* Integrasjonene */}
        {INTEGRASJONER.map((c, i) => {
          const p = intPos(c.vinkel);
          const lyser = i === lysende || alle;
          return (
            <div
              key={c.navn}
              className="absolute flex items-center justify-center rounded-2xl bg-white px-3.5 py-2.5 transition-all duration-500"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: `translate(-50%, -50%) scale(${i === lysende ? 1.12 : 1})`,
                opacity: lyser ? 1 : 0.55,
                filter: lyser ? 'grayscale(0)' : 'grayscale(1)',
                boxShadow: i === lysende
                  ? '0 20px 45px -16px rgba(155,91,214,0.35), 0 0 0 1.5px rgba(155,91,214,0.25)'
                  : '0 10px 30px -14px rgba(10,10,10,0.14), 0 0 0 1px rgba(0,0,0,0.04)',
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <span className="flex items-center gap-2">
                {c.logoer.map((l) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={l.src} src={l.src} alt={c.navn} style={{ height: l.h }} className="w-auto max-w-[72px] object-contain" />
                ))}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fortellerlinjen — én integrasjon om gangen */}
      <div className="mx-auto mt-8 grid h-6 max-w-[460px]">
        {INTEGRASJONER.map((c, i) => (
          <p
            key={c.navn}
            className={`[grid-area:1/1] text-[14px] font-medium text-[#1d1d1f] transition-opacity duration-500 ${i === lysende ? 'opacity-100' : 'opacity-0'}`}
          >
            {c.tekst}
          </p>
        ))}
        <p className={`[grid-area:1/1] text-[14px] font-medium text-[#1d1d1f] transition-opacity duration-500 ${alle ? 'opacity-100' : 'opacity-0'}`}>
          Ett system<span style={{ color: INT_LILLA }}>.</span> Alt koblet sammen<span style={{ color: INT_LILLA }}>.</span>
        </p>
      </div>
    </div>
  );
}

export default function BergenUrbanDeck() {
  const [steg, setSteg] = useState(-1);
  const [antallTegn, setAntallTegn] = useState(0);
  const [tenker, setTenker] = useState(false);
  const [kodeAntall, setKodeAntall] = useState(0);
  const [deploy, setDeploy] = useState(false);      // agenten «deployer» før overgangen
  const [tenning, setTenning] = useState('av');     // 'av' | 'inn' | 'ut' — lysbloom-overgangen
  const [revealModul, setRevealModul] = useState('oversikt'); // portalen navigerer selv til kalenderen
  const [musSynlig, setMusSynlig] = useState(true);
  const [mockSkala, setMockSkala] = useState(0.78);
  const [tocApen, setTocApen] = useState(false);
  const musTimer = useRef(null);

  const neste = useCallback(() => setSteg((s) => Math.min(TOTALT - 1, s + 1)), []);
  const forrige = useCallback(() => setSteg((s) => (s === 8 || s === 9 ? 6 : Math.max(0, s - 1))), []);

  const fullskjerm = useCallback(() => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch (e) { /* stille */ }
  }, []);

  useEffect(() => {
    const tast = (e) => {
      if (['ArrowRight', ' ', 'PageDown', 'Enter', 'ArrowDown'].includes(e.key)) { e.preventDefault(); neste(); }
      else if (['ArrowLeft', 'PageUp', 'ArrowUp', 'Backspace'].includes(e.key)) { e.preventDefault(); forrige(); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); fullskjerm(); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); setSteg(-1); }
      else if (e.key === 'Home') { e.preventDefault(); setSteg(-1); }
      else if (e.key === 'End') { e.preventDefault(); setSteg(TOTALT - 1); }
      else if (e.key === 'Escape') { setTocApen(false); }
    };
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, [neste, forrige, fullskjerm]);

  // Skriveanimasjon — naturlig, litt ujevn rytme
  useEffect(() => {
    if (steg <= 5) { setAntallTegn(0); return undefined; }
    if (steg === 6) {
      if (antallTegn >= PROMPT.length) return undefined;
      const t = setTimeout(() => setAntallTegn((n) => n + 1), 26 + Math.random() * 62);
      return () => clearTimeout(t);
    }
    setAntallTegn(PROMPT.length);
    return undefined;
  }, [steg, antallTegn]);

  // Send → tenkeprikker → auto-overgang til agent-scenen
  useEffect(() => {
    if (steg !== 7) { setTenker(false); return undefined; }
    const t1 = setTimeout(() => setTenker(true), 520);
    const t2 = setTimeout(() => setSteg(8), 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [steg]);

  // Kodestrøm: agenten «bygger» → deploy-beat → lys-tenning → reveal
  useEffect(() => {
    if (steg < 8) { setKodeAntall(0); setDeploy(false); setTenning('av'); return undefined; }
    if (steg !== 8) return undefined; // behold linjene under utfading
    let stoppet = false;
    let i = 0;
    const total = 240;
    const tikk = () => {
      if (stoppet) return;
      i += i > 150 ? 3 : (i > 60 ? 2 : 1);
      setKodeAntall(Math.min(i, total));
      if (i >= total) {
        // Kinematisk deploy-koreografi:
        // 1) agenten melder «klart» og deployer · 2) arbeidsrommet dimmes og
        // et lys tennes i sentrum · 3) portalen materialiserer seg under lyset
        setTimeout(() => { if (!stoppet) setDeploy(true); }, 380);
        setTimeout(() => { if (!stoppet) setTenning('inn'); }, 2400);
        setTimeout(() => { if (!stoppet) setSteg(9); }, 3250);
        return;
      }
      setTimeout(tikk, Math.max(9, 36 - i * 0.12));
    };
    const start = setTimeout(tikk, 300);
    return () => { stoppet = true; clearTimeout(start); };
  }, [steg]);

  // Lyset trekker seg tilbake idet portalen står ferdig
  useEffect(() => {
    if (steg !== 9) return undefined;
    const t1 = setTimeout(() => setTenning((v) => (v === 'inn' ? 'ut' : v)), 300);
    const t2 = setTimeout(() => setTenning('av'), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [steg]);

  // Portalen lever: etter at assistenten har svart, navigerer den selv til
  // Kalender-modulen (sidebar-markøren glir, hovedflaten kryssfader). Der
  // lander en ny booking live (kalender-liv), før portalen åpner enheten
  // som fikk bookingen — Marken 8 — i appens enkeltvisning.
  useEffect(() => {
    if (steg !== 9) { setRevealModul('oversikt'); return undefined; }
    const t = setTimeout(() => setRevealModul('kalender'), 8600);
    const t2 = setTimeout(() => setRevealModul('enhet'), 17400);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [steg]);

  // Skjul musepekeren når den ligger i ro (scene-modus)
  useEffect(() => {
    const beveg = () => {
      setMusSynlig(true);
      if (musTimer.current) clearTimeout(musTimer.current);
      musTimer.current = setTimeout(() => setMusSynlig(false), 2500);
    };
    window.addEventListener('mousemove', beveg);
    beveg();
    return () => { window.removeEventListener('mousemove', beveg); if (musTimer.current) clearTimeout(musTimer.current); };
  }, []);

  // Fullskjerm «dekk»-skalering: UI-et (design 1600×1000) dekker alltid hele
  // viewporten uansett skjermformat — sidebaren er alltid hel, og typografien
  // holder ekte app-størrelse (ingen «zoomet» følelse).
  useEffect(() => {
    const maal = () => {
      setMockSkala(Math.max(window.innerWidth / 1600, window.innerHeight / 1000));
    };
    maal();
    window.addEventListener('resize', maal);
    return () => window.removeEventListener('resize', maal);
  }, []);

  // Klikk: høyre del = neste, venstre 30 % = forrige (klikker-vennlig)
  const klikk = (e) => {
    if (e.target.closest('button')) return;
    if (tocApen) { setTocApen(false); return; } // klikk utenfor lukker menyen
    const x = e.clientX / window.innerWidth;
    if (x < 0.3) forrige(); else neste();
  };

  // TOC lukkes automatisk når scenen bytter (piltaster, klikk, auto-beats)
  useEffect(() => { setTocApen(false); }, [steg]);

  const skrevet = PROMPT.slice(0, antallTegn);
  const klarTilSend = antallTegn >= PROMPT.length && steg >= 6;
  const morkAktiv = steg <= 8; // reveal (steg 9) er lys fullskjerm
  const coverAktiv = steg === 0;
  const historieAktiv = steg === 1;
  const ideAktiv = steg === 2 || steg === 3;
  const ideBeat = Math.max(0, steg - 2); // 0 = ideen · 1 = prosessloopen
  const kaosAktiv = steg === 4;
  const promptAktiv = steg >= 5 && steg <= 7;
  const kodeAktiv = steg === 8;
  const revealAktiv = steg === 9;
  const omfangAktiv = steg === 10;
  const integrasjonAktiv = steg === 11;
  const hookAktiv = steg === 12 || steg === 13;
  const bygg = Math.max(0, steg - 12);
  const sannhetAktiv = steg === 14 || steg === 15;
  const sannhetBeat = Math.max(0, steg - 14); // 0 = DigiHome-tall · 1 = + tradisjonell
  const rollerAktiv = steg >= 16;
  const rollerBeat = Math.max(0, steg - 15); // 1 = byggeren · 2 = +verktøyene · 3 = +agentene

  // Cinematisk crossfade innad i den svarte scenen
  const gruppeKlasse = (aktiv) => (aktiv
    ? 'pointer-events-auto opacity-100 blur-0 scale-100'
    : 'pointer-events-none opacity-0 blur-[12px] scale-[0.99]');

  // Overgang for de lyse slidene
  const lysKlasse = (aktiv, retning) => (aktiv
    ? 'pointer-events-auto opacity-100 blur-0 scale-100'
    : `pointer-events-none opacity-0 blur-[16px] ${retning === 'inn' ? 'scale-[1.03]' : 'scale-[0.98]'}`);

  return (
    <main
      onClick={klikk}
      className={`relative h-dvh w-full select-none overflow-hidden bg-[#fcfcfc] font-body text-[#0f0f0f] ${musSynlig ? '' : 'cursor-none'}`}
      data-testid="bu-deck"
    >
      {/* ── Luminans-vignett på den lyse scenen ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 42%, #ffffff 0%, #fbfbfb 55%, #f2f2f2 100%)' }}
      />

      {/* (Tittel-sliden er flyttet til mørk «Historien»-beat før prompten) */}

      {/* ═══ AKT 4 — HOOK: paradokset ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${lysKlasse(hookAktiv, 'inn')}`}
        data-testid="bu-slide-hook"
      >
        <header className="flex justify-start px-12 pt-11 md:px-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[24px] w-auto" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-8 md:px-16">
          {/* Kamera-glid: påstand 1 optisk sentrert alene — komposisjonen
              glir mykt opp idet påstand 2 toner inn */}
          <div className={`flex w-full flex-col items-center transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${bygg >= 1 ? 'translate-y-0' : 'translate-y-[12vh]'}`}>
            {/* Påstand 1 — glir ut av fokus når påstand 2 kommer (rack focus) */}
            <div
              className={`max-w-[980px] text-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${bygg >= 1 ? 'scale-[0.96] opacity-20 blur-[4px]' : 'scale-100 opacity-100 blur-0'}`}
            >
              <p className="text-[12px] font-semibold tabular-nums tracking-[0.25em] text-[#c7c7cc]">01</p>
              <h2 className="mt-7 font-heading text-[clamp(30px,4vw,58px)] font-bold leading-[1.15] tracking-[-0.03em]" data-testid="bu-paastand-1">
                DigiHome er blant verdens mest avanserte <span className="whitespace-nowrap">vibe-kodede</span> applikasjoner.
              </h2>
            </div>

            {/* Påstand 2 — blyant-håndskrift, blur-dissolve inn */}
            <div
              className={`mt-14 max-w-[900px] text-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:mt-[4.5rem] ${bygg >= 1 ? 'translate-y-0 opacity-100 blur-0' : 'pointer-events-none translate-y-8 opacity-0 blur-[12px]'}`}
              data-testid="bu-paastand-2"
            >
              <p className="text-[12px] font-semibold tabular-nums tracking-[0.25em] text-[#c7c7cc]">02</p>
              <p className={`${caveat.className} mt-6 -rotate-[1.3deg] text-[clamp(34px,4.6vw,68px)] font-semibold leading-[1.12] text-[#2d2d2f]`}>
                «En 6-åring kunne ha <span className="whitespace-nowrap">vibe-kodet</span> DigiHome.»
              </p>
            </div>
          </div>
        </div>

        <footer className="pb-12 text-center">
          <p className="text-[12px] tracking-tight text-[#b0b0b5]">Martin Kviteberg&ensp;·&ensp;Bergen Urban</p>
        </footer>
      </section>

      {/* ═══ AKT 5 — SANNHETEN: hva det faktisk kostet (proporsjonsbarer) ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${lysKlasse(sannhetAktiv, 'inn')}`}
        data-testid="bu-slide-sannhet"
      >
        <header className="flex justify-start px-12 pt-11 md:px-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[24px] w-auto" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-8 md:px-16">
          {/* Kamera-glid: tittelen sentrert alene — komposisjonen glir opp når tallene kommer */}
          <div className={`flex w-full max-w-[960px] flex-col items-center transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${sannhetBeat >= 1 ? 'translate-y-0' : 'translate-y-[3vh]'}`}>

            {/* Kicker + tittel — glir bak i fokus når sammenligningen lander */}
            <div className={`text-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${sannhetBeat >= 1 ? 'scale-[0.86] opacity-40 blur-[1px]' : 'scale-100 opacity-100 blur-0'}`}>
              <p className="text-[12px] font-semibold tabular-nums tracking-[0.25em] text-[#c7c7cc]">03</p>
              <h2 className="mt-7 font-heading text-[clamp(28px,3.8vw,54px)] font-bold leading-[1.12] tracking-[-0.03em]" data-testid="bu-sannhet-tittel">
                Det var ikke én prompt.
              </h2>
            </div>

            {/* Tradisjonell utvikling — tegner seg tungt og langsomt over hele bredden */}
            <div className={`mt-14 w-full transition-[opacity,transform,filter] duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${sannhetBeat >= 1 ? 'translate-y-0 opacity-100 blur-0' : 'pointer-events-none translate-y-6 opacity-0 blur-[6px]'}`}>
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-[#86868b]">Tradisjonell utvikling</p>
                <p className="font-heading text-[clamp(19px,2.3vw,33px)] font-bold tracking-[-0.02em] tabular-nums text-[#0f0f0f]">
                  <Teller til={10000} aktiv={sannhetBeat >= 1} varighet={2000} />
                  <span className="text-[0.6em] font-medium text-[#86868b]"> timer</span>
                  <span className="mx-2.5 text-[0.6em] font-medium text-[#c7c7cc]">·</span>
                  5–10<span className="text-[0.6em] font-medium text-[#86868b]"> mill. kr</span>
                </p>
              </div>
              <div className="h-[14px] w-full overflow-hidden rounded-full bg-[#f1f0f3]">
                <div
                  className="h-full rounded-full bg-[#1a1a1a] transition-[width] duration-[2000ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: sannhetBeat >= 1 ? '100%' : '0%', transitionDelay: sannhetBeat >= 1 ? '250ms' : '0ms' }}
                />
              </div>
            </div>

            {/* DigiHome — smeller inn i lilla og stopper på en tidel */}
            <div className="mt-9 w-full">
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-[#7c3aed]">DigiHome</p>
                <p className="font-heading text-[clamp(19px,2.3vw,33px)] font-bold tracking-[-0.02em] tabular-nums text-[#0f0f0f]" data-testid="bu-sannhet-digihome-tall">
                  <Teller til={1000} aktiv={sannhetAktiv} varighet={1500} />
                  <span className="text-[0.6em] font-medium text-[#86868b]"> timer</span>
                  <span className="mx-2.5 text-[0.6em] font-medium text-[#c7c7cc]">·</span>
                  <Teller til={500000} aktiv={sannhetAktiv} varighet={1800} prefiks="~" />
                  <span className="text-[0.6em] font-medium text-[#86868b]"> kr</span>
                </p>
              </div>
              <div className="h-[14px] w-full overflow-hidden rounded-full bg-[#f1f0f3]">
                <div
                  className="h-full rounded-full transition-[width] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    width: sannhetAktiv ? '10%' : '0%',
                    transitionDelay: sannhetAktiv ? '600ms' : '0ms',
                    background: 'linear-gradient(90deg, #7c3aed, #cf97fc)',
                    boxShadow: '0 4px 20px rgba(124,58,237,0.38)',
                  }}
                />
              </div>
            </div>

            {/* Konklusjonen — hviskes inn når barene har fått tale */}
            <p className={`mt-14 text-center text-[clamp(16px,1.8vw,25px)] leading-snug text-[#86868b] opacity-0 ${sannhetBeat >= 1 ? 'bu-inn' : ''}`} style={{ animationDelay: '2400ms' }} data-testid="bu-sannhet-konklusjon">
              Samme system. <span className="font-semibold text-[#0f0f0f]">En tidel av tiden.</span> <span className="font-semibold text-[#0f0f0f]">7&nbsp;% av kostnaden.</span>
            </p>
          </div>
        </div>

        <footer className="pb-10 text-center">
          <p className={`text-[11px] tracking-tight text-[#c7c7cc] opacity-0 ${sannhetBeat >= 1 ? 'bu-inn' : ''}`} style={{ animationDelay: '3000ms' }}>
            Estimat: tilsvarende system bygget med tradisjonelt utviklingsteam
          </p>
        </footer>
      </section>

      {/* ═══ AKT 7 — TRE AI-ROLLER: bygget · innebygd · autonom (finalen) ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${lysKlasse(rollerAktiv, 'inn')}`}
        data-testid="bu-slide-roller"
      >
        <header className="relative z-10 flex justify-start px-12 pt-11 md:px-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[24px] w-auto" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-10 md:px-16">
          <div className="w-full max-w-[1180px]">
            <div className={`text-center opacity-0 ${rollerAktiv ? 'bu-inn' : ''}`} style={{ animationDuration: '1.4s' }}>
              <p className="text-[12px] font-semibold tabular-nums tracking-[0.25em] text-[#c7c7cc]">04</p>
              <h2 className="mt-7 font-heading text-[clamp(28px,3.6vw,52px)] font-bold leading-[1.12] tracking-[-0.03em] text-[#0f0f0f]" data-testid="bu-roller-tittel">
                AI spiller tre roller.
              </h2>
            </div>

            {/* Rollene — én per klikk, blur-dissolve i kaskade */}
            <div className="mt-14 grid grid-cols-3 gap-10 md:mt-16 md:gap-14">
              {AI_ROLLER.map((r, i) => {
                const Ikon = r.Ikon;
                return (
                  <div
                    key={r.navn}
                    className={`opacity-0 ${rollerBeat >= i + 1 ? 'bu-inn' : ''}`}
                    style={{ animationDuration: '1.3s' }}
                    data-testid={`bu-rolle-${i + 1}`}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: '#f5f1fb' }}>
                      <Ikon className="h-5 w-5 text-[#7c3aed]" strokeWidth={1.8} />
                    </span>
                    <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b0b0b5]">Rolle&nbsp;0{i + 1}</p>
                    <h3 className="mt-2 font-heading text-[clamp(20px,1.9vw,28px)] font-bold tracking-[-0.025em] text-[#0f0f0f]">{r.navn}</h3>
                    <p className="mt-3 max-w-[34ch] text-[clamp(13px,1.15vw,16px)] leading-relaxed text-[#86868b]">{r.tekst}</p>
                    <ul className="mt-5 space-y-2">
                      {r.punkter.map((p) => (
                        <li key={p} className="flex items-center gap-2.5 text-[13px] font-medium text-[#3c3c43]">
                          <span className="h-1 w-1 shrink-0 rounded-full bg-[#B57BFF]" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Payoff — lander når alle tre står */}
            <p
              className={`mt-16 text-center text-[clamp(16px,1.8vw,25px)] leading-snug text-[#86868b] opacity-0 ${rollerBeat >= 3 ? 'bu-inn' : ''}`}
              style={{ animationDelay: '1400ms' }}
              data-testid="bu-roller-payoff"
            >
              <span className="font-semibold text-[#0f0f0f]">Bygget av AI.</span> <span className="font-semibold text-[#0f0f0f]">Drevet av AI.</span> Passet på av AI.
            </p>
          </div>
        </div>

        <footer className="flex items-center justify-center pb-10">
          <p className="text-[12px] tracking-tight text-[#b0b0b5]">Martin Kviteberg&ensp;·&ensp;Bergen Urban</p>
        </footer>
      </section>

      {/* ═══ AKT 6 — OMFANGET: kameraet trekker ut — dashbordet er én flate av mange ═══ */}
      <section
        className={`absolute inset-0 flex flex-col overflow-hidden transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${lysKlasse(omfangAktiv, 'inn')}`}
        data-testid="bu-slide-omfang"
      >
        <header className="relative z-10 flex justify-start px-12 pt-11 md:px-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[24px] w-auto" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-8 md:px-14">
          {/* Tittel — toner inn når kameraet har landet */}
          <div className={`mb-7 text-center opacity-0 ${omfangAktiv ? 'bu-inn' : ''}`} style={{ animationDelay: '1250ms', animationDuration: '1.4s' }}>
            <h2 className="font-heading text-[clamp(26px,3.1vw,46px)] font-bold leading-[1.1] tracking-[-0.035em] text-[#0f0f0f]">Dette er DigiHome.</h2>
          </div>

          {/* Kamera-uttrekket: veggen starter zoomet inn på dashbord-flisen
              (rad 2, kolonne 2) og trekker seg ut til hele produktveggen */}
          <div
            style={{
              transform: omfangAktiv ? 'scale(1)' : 'scale(2.7)',
              transformOrigin: '37.6% 44%',
              transition: 'transform 1650ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <OmfangVegg vis={omfangAktiv} />
          </div>

          {/* Omfanget i tall */}
          <p className={`mt-6 text-center text-[clamp(14px,1.45vw,19px)] text-[#86868b] opacity-0 ${omfangAktiv ? 'bu-inn' : ''}`} style={{ animationDelay: '2300ms' }} data-testid="bu-omfang-tall">
            <span className="font-semibold text-[#0f0f0f]">20+ moduler</span>
            <span className="mx-2.5 text-[#c7c7cc]">·</span>
            <span className="font-semibold text-[#0f0f0f]">2 portaler</span>
            <span className="mx-2.5 text-[#c7c7cc]">·</span>
            BankID innebygd
            <span className="mx-2.5 text-[#c7c7cc]">·</span>
            AI i alle lag
          </p>
        </div>

        <footer className="pb-8" />
      </section>

      {/* ═══ AKT 6.5 — INTEGRASJONENE: alt henger sammen ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${lysKlasse(integrasjonAktiv, 'inn')}`}
        data-testid="bu-slide-integrasjoner"
      >
        <header className="relative z-10 flex justify-start px-12 pt-11 md:px-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[24px] w-auto" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-8 md:px-14">
          <div className={`mb-8 text-center opacity-0 ${integrasjonAktiv ? 'bu-inn' : ''}`} style={{ animationDuration: '1.4s' }}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#c7c7cc]">Integrasjonene</p>
            <h2 className="mt-5 font-heading text-[clamp(28px,3.4vw,50px)] font-bold leading-[1.1] tracking-[-0.035em] text-[#0f0f0f]">
              Alt henger sammen<span className="text-[#9B5BD6]">.</span>
            </h2>
          </div>
          <div className={`opacity-0 ${integrasjonAktiv ? 'bu-inn' : ''}`} style={{ animationDelay: '350ms', animationDuration: '1.5s' }}>
            <BUIntegrasjoner aktiv={integrasjonAktiv} />
          </div>
        </div>

        <footer className="pb-8" />
      </section>

      {/* ═══ DEN SVARTE SCENEN — cover, prompt og reveal (skrus av mot tittel) ═══ */}
      <section
        className={`absolute inset-0 z-20 bg-[#050505] transition-opacity duration-[1700ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${morkAktiv ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        data-testid="bu-svart-scene"
      >
        {/* ── AKT 0: COVER — monteres først ved klikk, så intro-koreografien
            starter presist når presentasjonen begynner (helt sort før det) ── */}
        {steg >= 0 && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center px-6 transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(coverAktiv)}`}
          data-testid="bu-cover"
        >
          {/* Aurora — puster og driver umerkelig */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="bu-aurora1 absolute left-1/2 top-[26%] h-[64vh] w-[58vw] -translate-x-1/2 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.55) 0%, transparent 62%)', filter: 'blur(90px)', opacity: 0.28 }}
            />
            <div
              className="bu-aurora2 absolute left-[28%] top-[42%] h-[48vh] w-[42vw] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.5) 0%, transparent 62%)', filter: 'blur(110px)', opacity: 0.16 }}
            />
          </div>

          {/* Levende ramme: hele komposisjonen driver umerkelig (kamera-liv) */}
          <div className="bu-drift flex flex-col items-center">

            {/* Ikonet — bloom, spekulært lysdrag, glassrefleksjon og svak levitasjon */}
            <div className="bu-flyt">
              <div className="relative">
                <div
                  aria-hidden
                  className="bu-bloom absolute -inset-10 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(155,91,214,0.55) 0%, transparent 68%)', filter: 'blur(34px)' }}
                />
                <div className="bu-ikon relative">
                  <div className="relative overflow-hidden rounded-[26px] shadow-[0_40px_110px_-20px_rgba(155,91,214,0.5)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/digihome-mark.svg" alt="DigiHome-ikon" className="block h-[112px] w-[112px] md:h-[128px] md:w-[128px]" />
                    {/* Spekulært lysdrag over ikonflaten */}
                    <div aria-hidden className="bu-spek pointer-events-none absolute -inset-y-6 w-[42%] rotate-[18deg] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  </div>
                  {/* Refleksjon — som om ikonet står på sort glass */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/digihome-mark.svg"
                    alt=""
                    aria-hidden
                    className="mt-[6px] block h-[112px] w-[112px] -scale-y-100 rounded-[26px] opacity-[0.11] blur-[2px] md:h-[128px] md:w-[128px]"
                    style={{
                      maskImage: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)',
                      WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Navnet — mask reveal, lys-sweep og tracking som «setter seg» */}
            <h1 className="bu-spor -mt-10 font-heading text-[clamp(56px,8.5vw,124px)] font-bold leading-none tracking-[-0.04em] md:-mt-12">
              <span className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
                <span className="bu-tittelinn block">DigiHome</span>
              </span>
            </h1>

            {/* Setningen — eget beat, med luft og tilstedeværelse */}
            <p className="bu-inn mt-10 font-heading text-[clamp(22px,2.5vw,32px)] font-medium tracking-[-0.022em] text-white/[0.72] md:mt-12" style={{ animationDelay: '3050ms', animationDuration: '1.9s' }}>
              Utleie på autopilot<span className="text-[#B57BFF]">.</span>
            </p>
          </div>

          {/* Hvisket forankring */}
          <p className="bu-inn absolute bottom-10 text-[11.5px] tracking-[0.22em] text-white/[0.22]" style={{ animationDelay: '3700ms' }}>
            BERGEN URBAN — 2026
          </p>
        </div>
        )}

        {/* ── AKT 0.5: HISTORIEN — ren typografi, Apple-minimalisme ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-8 text-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(historieAktiv)}`}
          data-testid="bu-historie"
        >
          {/* Knapt merkbar luminans — bare nok til at svart ikke blir flatt */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(44% 36% at 50% 46%, rgba(124,58,237,0.09) 0%, transparent 100%)' }} />

          {/* Umerkelig kamera-liv */}
          <div className="bu-drift relative flex flex-col items-center">
            {/* Tittel — mask reveal, tracking som setter seg, ett stille lys-sweep */}
            <h2 className={`font-heading text-[clamp(44px,6.6vw,102px)] font-bold leading-[1.05] tracking-[-0.04em] text-white ${historieAktiv ? 'bu-spor' : ''}`}>
              <span className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
                <span className={`bu-linje-base block ${historieAktiv ? 'bu-linje' : ''}`} style={{ animationDelay: '450ms' }}>Historien om</span>
              </span>
              <span className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
                <span className={`bu-linje-base block ${historieAktiv ? 'bu-linje' : ''}`} style={{ animationDelay: '650ms' }}>
                  <span className={historieAktiv ? 'bu-glans-tekst' : ''} style={{ animationDelay: '1900ms' }}>DigiHome</span>.
                </span>
              </span>
            </h2>

            {/* Undertekst — stille, grå, presis */}
            <p className={`mt-10 text-[clamp(15px,1.3vw,19px)] font-medium tracking-[-0.01em] text-white/[0.38] opacity-0 ${historieAktiv ? 'bu-inn' : ''}`} style={{ animationDelay: '1900ms', animationDuration: '1.7s' }}>
              Vibe coding i praksis
            </p>
          </div>
        </div>

        {/* ── AKT 0.75: IDEEN — innsikten som startet alt (to beats) ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(ideAktiv)}`}
          data-testid="bu-ide"
        >
          {/* Knapt merkbar luminans */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(48% 40% at 50% 46%, rgba(124,58,237,0.08) 0%, transparent 100%)' }} />

          {/* Kamera-glid: ideen optisk sentrert alene — hele komposisjonen
              glir opp idet loopen ruller inn (loopen okkuperer plass under) */}
          <div className={`relative flex w-full flex-col items-center transition-transform duration-[1300ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${ideBeat >= 1 ? '-translate-y-[3vh]' : 'translate-y-[16vh]'}`}>
            <div className="bu-drift flex w-full flex-col items-center">

            {/* Beat 1 — ideen (rack focus når loopen kommer) */}
            <div className={`px-8 text-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${ideBeat >= 1 ? 'scale-[0.6] opacity-30 blur-[1px]' : 'scale-100 opacity-100 blur-0'}`}>
              <p className={`text-[clamp(14px,1.3vw,18px)] font-medium tracking-[-0.01em] text-white/[0.4] opacity-0 ${ideAktiv ? 'bu-inn' : ''}`} style={{ animationDelay: '200ms', animationDuration: '1.5s' }}>
                Alt startet med én idé.
              </p>
              <h2 className={`mt-6 font-heading text-[clamp(38px,5.6vw,86px)] font-bold leading-[1.08] tracking-[-0.04em] text-white ${ideAktiv ? 'bu-spor' : ''}`}>
                <span className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
                  <span className={`bu-linje-base block ${ideAktiv ? 'bu-linje' : ''}`} style={{ animationDelay: '650ms' }}>Boligforvaltning</span>
                </span>
                <span className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
                  <span className={`bu-linje-base block ${ideAktiv ? 'bu-linje' : ''}`} style={{ animationDelay: '850ms' }}>kan <span className={ideAktiv ? 'bu-glans-tekst' : ''} style={{ animationDelay: '2100ms' }}>automatiseres</span>.</span>
                </span>
              </h2>
            </div>

            {/* Beat 2 — prosessloopen: samme steg, om igjen og om igjen */}
            <div className={`mt-10 w-full transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:mt-14 ${ideBeat >= 1 ? 'translate-y-0 opacity-100 blur-0' : 'pointer-events-none translate-y-8 opacity-0 blur-[10px]'}`}>

              {/* Uendelig bånd over — driver umerkelig mot venstre */}
              <div
                aria-hidden
                className="w-full overflow-hidden whitespace-nowrap"
                style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)' }}
              >
                <div className="bu-baand-v inline-block font-heading text-[clamp(15px,1.7vw,25px)] font-semibold tracking-[-0.02em] text-white/[0.065]">
                  {PROSESSBAAND}{PROSESSBAAND}{PROSESSBAAND}{PROSESSBAAND}
                </div>
              </div>

              {/* Hovedraden — ordene trer inn ett og ett, kjeden peker tilbake på seg selv */}
              <div className="mt-7 flex flex-wrap items-baseline justify-center gap-x-3.5 gap-y-2.5 px-6 md:mt-9">
                {PROSESSER.map((p, i) => (
                  <span key={p} className="flex items-baseline gap-3.5">
                    <span className={`font-heading text-[clamp(19px,2.3vw,34px)] font-semibold tracking-[-0.025em] text-white/[0.92] opacity-0 ${ideBeat >= 1 ? 'bu-inn' : ''}`} style={{ animationDelay: `${350 + i * 190}ms`, animationDuration: '0.9s' }}>
                      {p}
                    </span>
                    <span className={`text-[clamp(15px,1.7vw,25px)] font-medium text-[#B57BFF]/[0.55] opacity-0 ${ideBeat >= 1 ? 'bu-inn' : ''}`} style={{ animationDelay: `${440 + i * 190}ms`, animationDuration: '0.9s' }}>
                      →
                    </span>
                  </span>
                ))}
                {/* …og så starter det på nytt */}
                <span className={`font-heading text-[clamp(19px,2.3vw,34px)] font-semibold tracking-[-0.025em] text-white/[0.22] opacity-0 ${ideBeat >= 1 ? 'bu-inn' : ''}`} style={{ animationDelay: `${350 + PROSESSER.length * 190}ms`, animationDuration: '0.9s' }}>
                  Annonsering&nbsp;…
                </span>
              </div>

              {/* Uendelig bånd under — driver mot høyre */}
              <div
                aria-hidden
                className="mt-7 w-full overflow-hidden whitespace-nowrap md:mt-9"
                style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)' }}
              >
                <div className="bu-baand-h inline-block font-heading text-[clamp(15px,1.7vw,25px)] font-semibold tracking-[-0.02em] text-white/[0.065]">
                  {PROSESSBAAND}{PROSESSBAAND}{PROSESSBAAND}{PROSESSBAAND}
                </div>
              </div>

              {/* Konklusjonen — hviskes inn til slutt */}
              <p className={`mt-9 text-center text-[clamp(14px,1.35vw,19px)] text-white/[0.48] opacity-0 md:mt-12 ${ideBeat >= 1 ? 'bu-inn' : ''}`} style={{ animationDelay: '2100ms' }}>
                De samme prosessene. Om igjen — og om igjen.
              </p>
            </div>
            </div>
          </div>
        </div>

        {/* ── AKT 0.9: KAOSET — ti systemer, mørk versjon (problemet plantes) ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-8 transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(kaosAktiv)}`}
          data-testid="bu-kaos"
        >
          {/* Knapt merkbar luminans */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(48% 40% at 50% 50%, rgba(124,58,237,0.08) 0%, transparent 100%)' }} />

          <div className="bu-drift flex w-full flex-col items-center">
            {/* Kicker + tittel */}
            <p className={`text-[clamp(14px,1.3vw,18px)] font-medium tracking-[-0.01em] text-white/[0.4] opacity-0 ${kaosAktiv ? 'bu-inn' : ''}`} style={{ animationDelay: '200ms', animationDuration: '1.5s' }}>
              Og i dag?
            </p>
            <h2 className={`mt-5 text-center font-heading text-[clamp(26px,3.5vw,54px)] font-bold leading-[1.12] tracking-[-0.035em] text-white ${kaosAktiv ? 'bu-spor' : ''}`}>
              <span className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
                <span className={`bu-linje-base block ${kaosAktiv ? 'bu-linje' : ''}`} style={{ animationDelay: '550ms' }}>Ti systemer som ikke snakker sammen.</span>
              </span>
            </h2>

            {/* Lappeteppet — mørke glasslapper med brutte forbindelser */}
            <div className="relative mt-4 h-[42vh] max-h-[440px] min-h-[280px] w-full max-w-[1020px]">
              <svg
                aria-hidden
                className="absolute inset-0 h-full w-full transition-opacity duration-[900ms]"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ opacity: kaosAktiv ? 0.9 : 0, transitionDelay: kaosAktiv ? '1400ms' : '0ms' }}
              >
                {[[14, 15, 40, 10], [40, 10, 66, 13], [66, 13, 88, 24], [88, 24, 92, 58], [92, 58, 76, 86], [76, 86, 50, 91], [50, 91, 24, 87], [24, 87, 7, 63], [7, 63, 9, 35], [9, 35, 14, 15], [14, 15, 92, 58], [66, 13, 24, 87], [9, 35, 76, 86]].map((l) => (
                  <line key={l.join('-')} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="rgba(255,255,255,0.11)" strokeWidth="0.3" strokeDasharray="1.4 2.6" />
                ))}
              </svg>

              {VERKTOY.map((v, i) => (
                <div
                  key={v.navn}
                  className="absolute rounded-2xl border border-white/[0.09] bg-white/[0.05] px-5 py-3 text-left shadow-[0_16px_44px_rgba(0,0,0,0.5)] md:px-6 md:py-3.5"
                  style={{
                    left: v.x,
                    top: v.y,
                    transform: `translate(-50%, -50%) rotate(${v.rot}deg) scale(${kaosAktiv ? 1 : 0.9})`,
                    opacity: kaosAktiv ? 1 : 0,
                    transition: 'transform 900ms cubic-bezier(0.22,1,0.36,1), opacity 750ms cubic-bezier(0.22,1,0.36,1)',
                    transitionDelay: kaosAktiv ? `${450 + i * 110}ms` : '0ms',
                  }}
                >
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/[0.28]">{v.kategori}</p>
                  <p className="mt-0.5 whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em] text-white/[0.88] md:text-[16px]">{v.navn}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── AKT 1: PROMPTEN ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(promptAktiv)}`}
          data-testid="bu-prompt"
        >
          {/* Svak luminans bak baren — som ett scenelys */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(52% 42% at 50% 47%, rgba(255,255,255,0.055) 0%, transparent 100%)' }} />

          <div className={`relative flex w-[min(720px,88vw)] items-center gap-3 rounded-[28px] border border-white/[0.09] bg-[#161616] py-3 pl-4 pr-3 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] transition-transform duration-700 ${steg >= 7 ? 'scale-[0.985]' : 'scale-100'}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/40">
              <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
            <p className="min-h-[27px] flex-1 text-[16.5px] leading-[27px] text-[#ececec] md:text-[18px]" data-testid="bu-prompt-tekst">
              {steg <= 5 && <span className="text-white/30">Spør om hva som helst</span>}
              {steg >= 6 && (
                <>
                  {skrevet}
                  {steg <= 6 && <span className="bu-blink ml-[1px] inline-block h-[1.1em] w-[2px] translate-y-[0.18em] bg-white/90" />}
                </>
              )}
            </p>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${klarTilSend ? 'bg-white text-black' : 'bg-white/10 text-white/30'} ${steg >= 7 ? 'bu-puls' : ''}`}
              data-testid="bu-send"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </span>
          </div>

          {/* Tenkeprikker */}
          <div className={`mt-10 flex items-center gap-[7px] transition-opacity duration-500 ${tenker ? 'opacity-100' : 'opacity-0'}`} data-testid="bu-tenker">
            <span className="bu-dot h-[7px] w-[7px] rounded-full bg-white/70" />
            <span className="bu-dot h-[7px] w-[7px] rounded-full bg-white/70" style={{ animationDelay: '0.18s' }} />
            <span className="bu-dot h-[7px] w-[7px] rounded-full bg-white/70" style={{ animationDelay: '0.36s' }} />
          </div>
        </div>

        {/* ── AKT 1.5: AI-AGENTEN — mockup av agenten som bygger DigiHome ── */}
        <div
          className={`absolute inset-0 transition-[opacity,filter,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${kodeAktiv ? (tenning === 'av' ? 'opacity-100 blur-0 scale-100' : 'opacity-20 blur-[6px] scale-[0.94]') : 'pointer-events-none opacity-0 blur-[8px] scale-[0.985]'}`}
          data-testid="bu-kodestorm"
        >
          {/* Ambient scenelys bak vinduet — løfter det fra den svarte flaten */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(58% 52% at 50% 44%, rgba(124,58,237,0.11) 0%, transparent 70%)' }} />
          <div className="relative h-full p-7 md:p-11">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0c0c0e] shadow-[0_60px_160px_-30px_rgba(0,0,0,0.9)]">
              {/* Tittellinje — app-vindu */}
              <div className="relative flex h-11 shrink-0 items-center border-b border-white/[0.07] bg-[#121215] px-4">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                </span>
                <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[11px] text-white/35">digihome — AI-agent</span>
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#4ade80]/10 px-2.5 py-1 text-[10px] font-semibold text-[#4ade80]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4ade80]" /> Agent aktiv
                </span>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-[420px_1fr]">
                {/* VENSTRE: agent-samtalen — agenten planlegger, bygger og tester */}
                <div className="flex min-h-0 flex-col border-r border-white/[0.07] bg-[#0e0e11]">
                  {/* Agent-identitet */}
                  <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.05] px-5 py-3.5">
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                      <span className="absolute inset-0 animate-ping rounded-full bg-[#7c3aed]/25" style={{ animationDuration: '2.2s' }} />
                      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#cf97fc] shadow-[0_0_30px_rgba(155,91,214,0.5)]">
                        <Bot className="h-[17px] w-[17px] text-white" strokeWidth={1.9} />
                      </span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold tracking-tight text-white">DigiHome-agent</p>
                      <p className="mt-[1px] flex items-center gap-1.5 text-[10.5px] text-white/40">
                        {deploy
                          ? (<><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#cf97fc]" /> deployer til produksjon</>)
                          : (<><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4ade80]" /> bygger applikasjonen</>)}
                      </p>
                    </div>
                  </div>

                  {/* Samtalen */}
                  <div className="min-h-0 flex-1 space-y-2 overflow-hidden px-5 py-4">
                    {/* Brukerens prompt */}
                    <div className="ml-10 rounded-2xl rounded-tr-md bg-white/[0.08] px-3.5 py-2 text-[12px] leading-snug text-white/80">
                      {PROMPT}
                    </div>
                    {/* Agentens intro — strømmer inn tegn for tegn */}
                    {kodeAntall >= 2 && (
                      <p className="pt-1 text-[12px] leading-snug text-white/55">
                        {INTRO.slice(0, Math.max(0, (kodeAntall - 2) * 3))}
                        {(kodeAntall - 2) * 3 < INTRO.length && <span className="bu-blink ml-[1px] inline-block h-[0.95em] w-[2px] translate-y-[0.15em] bg-[#cf97fc]/80" />}
                      </p>
                    )}
                    {/* Verktøykall — dukker opp og fullføres i takt med koden */}
                    {AGENT_STEG.map((s, i) => {
                      const synlig = kodeAntall >= i * 30 + 6;
                      const ferdig = kodeAntall >= (i + 1) * 32;
                      if (!synlig) return null;
                      return (
                        <div key={s.tekst} className="bu-inn flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-[6px]" style={{ animationDuration: '0.6s' }}>
                          {ferdig ? (
                            <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-[#4ade80]/[0.14]">
                              <Check className="h-[10px] w-[10px] text-[#4ade80]" strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="h-[15px] w-[15px] shrink-0 animate-spin rounded-full border-2 border-white/10 border-t-[#cf97fc]" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-[11.5px] transition-colors duration-500 ${ferdig ? 'text-white/60' : 'font-medium text-white/90'}`}>{s.tekst}</p>
                            <p className="truncate font-mono text-[9.5px] text-white/25">{s.fil}</p>
                          </div>
                          {ferdig && <span className="shrink-0 font-mono text-[9px] font-semibold text-[#4ade80]/60">ok</span>}
                        </div>
                      );
                    })}
                    {/* Sluttmelding + deploy */}
                    {deploy && (
                      <div className="bu-inn pt-1" style={{ animationDuration: '0.7s' }}>
                        <p className="text-[12px] leading-relaxed text-white/70">DigiHome er klart.</p>
                        <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-[#cf97fc]/25 bg-[#cf97fc]/[0.07] px-3 py-2">
                          <Rocket className="h-[14px] w-[14px] shrink-0 text-[#cf97fc]" strokeWidth={1.9} />
                          <span className="text-[11.5px] font-medium text-[#e4cfff]">Deployer til produksjon …</span>
                          <span className="ml-auto h-[13px] w-[13px] shrink-0 animate-spin rounded-full border-2 border-white/10 border-t-[#cf97fc]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fremdrift */}
                  <div className="shrink-0 border-t border-white/[0.07] px-5 py-3.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">{deploy ? 'Deploy' : 'Fremdrift'}</span>
                      <span className="font-mono text-[11.5px] font-semibold text-[#cf97fc] tabular-nums">{Math.min(100, Math.round((kodeAntall / 240) * 100))} %</span>
                    </div>
                    <div className="mt-2 h-[4px] overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#cf97fc] transition-[width] duration-300 ease-out ${deploy ? 'animate-pulse' : ''}`}
                        style={{ width: `${Math.min(100, (kodeAntall / 240) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* HØYRE: editoren agenten skriver i */}
                <div className="relative flex min-h-0 flex-col bg-[#0a0a0c]">
                  {/* Fanelinje */}
                  <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-white/[0.06] bg-[#101013] px-4">
                    {KODE_FILER.map((fil, i) => {
                      const aktivFane = Math.min(KODE_FILER.length - 1, Math.floor(kodeAntall / 62)) === i;
                      return (
                        <span key={fil} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10.5px] transition-colors duration-300 ${aktivFane ? 'bg-white/[0.07] text-white/75' : 'text-white/25'}`}>
                          <span className={`h-1 w-1 rounded-full ${aktivFane ? 'bg-[#cf97fc]' : 'bg-white/15'}`} />
                          {fil}
                        </span>
                      );
                    })}
                  </div>
              {/* Brødsmulesti — fil-kontekst som i en ekte editor */}
              <div className="flex h-7 shrink-0 items-center gap-1.5 border-b border-white/[0.04] px-4 font-mono text-[10px] text-white/25">
                digihome
                <span className="text-white/[0.12]">›</span>
                lib
                <span className="text-white/[0.12]">›</span>
                <span className="text-white/45">{KODE_FILER[Math.min(KODE_FILER.length - 1, Math.floor(kodeAntall / 62))]}</span>
                <span className="ml-auto text-white/[0.18]">TypeScript · UTF-8</span>
              </div>
              {/* Kodestrøm */}
              <div
                className="relative flex min-h-0 flex-1 flex-col justify-end overflow-hidden px-5 pb-3 pt-3 font-mono text-[11.5px] leading-[1.6]"
                style={{
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 100%)',
                }}
              >
                {Array.from({ length: kodeAntall }, (_, i) => {
                  const sist = i === kodeAntall - 1;
                  return (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={i} className={`shrink-0 truncate whitespace-pre rounded-[3px] ${sist ? 'bg-white/[0.035]' : ''}`}>
                      <span className="mr-2.5 inline-block w-7 text-right text-white/[0.14] tabular-nums">{i + 1}</span>
                      <span className="mr-2 inline-block w-2 text-[#4ade80]/40">+</span>
                      <KodeLinje tekst={KODE[i % KODE.length]} />
                      {sist && !deploy && <span className="bu-blink ml-[2px] inline-block h-[11px] w-[6px] translate-y-[1px] bg-[#cf97fc]/80" />}
                    </div>
                  );
                })}
              </div>
              {/* Build vellykket — tilfredsstillende sluttbeat over editoren */}
              {deploy && (
                <div className="bu-inn absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0c]/72 backdrop-blur-[3px]" style={{ animationDuration: '0.8s' }}>
                  <div className="flex flex-col items-center gap-3">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4ade80]/[0.12] ring-1 ring-[#4ade80]/30 shadow-[0_0_50px_rgba(74,222,128,0.25)]">
                      <Check className="h-7 w-7 text-[#4ade80]" strokeWidth={2.5} />
                    </span>
                    <p className="text-[15px] font-semibold tracking-tight text-white/90">Build vellykket</p>
                    <p className="font-mono text-[11px] text-white/40">34/34 tester · 11 280 linjer · 4,2 s</p>
                  </div>
                </div>
              )}
              {/* Editor-statuslinje */}
              <div className="flex h-9 shrink-0 items-center gap-2.5 border-t border-white/[0.06] bg-[#101013] px-4 font-mono text-[10.5px] text-white/35">
                <span className="bu-blink inline-block h-[11px] w-[6px] bg-white/60" />
                {deploy ? 'build ok · deployer digihome' : 'genererer digihome'}
                <span className="ml-auto tabular-nums text-white/25">{Math.max(1, Math.round(kodeAntall / 16))} moduler · {(kodeAntall * 47).toLocaleString('nb-NO')} linjer</span>
              </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* (Svaret er nå en egen lys fullskjerm-slide under den svarte scenen) */}
      </section>

      {/* ═══ AKT 2 — SVARET: systemet tar over hele skjermen ═══ */}
      <section
        className={`absolute inset-0 z-10 overflow-hidden transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${revealAktiv ? 'pointer-events-auto opacity-100 blur-0 scale-100' : 'pointer-events-none opacity-0 blur-[14px] scale-[1.04]'}`}
        data-testid="bu-reveal"
      >
        {/* Forvalterportalen kant til kant — «dekk»-skalert, materialiserer seg
            i koreografert kaskade (sidebar først, deretter seksjonene) */}
        <div className="origin-top-left" style={{ width: 1600, transform: `scale(${mockSkala})` }}>
          <ForvalterFullskjerm vis={revealAktiv} modul={revealModul} />
        </div>

        {/* AI-driftsassistenten — glir inn som siste lag og «svarer» live.
            Når portalen selv navigerer til Kalender, glir chatten rolig ut
            slik at kalendermodulen står ren og uforstyrret. */}
        <div
          className={`absolute bottom-[4vh] right-[2vw] z-10 transition-[opacity,transform,filter] duration-[1300ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${revealAktiv && revealModul === 'oversikt' ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-14 opacity-0 blur-[10px]'}`}
          style={{ width: 'clamp(300px, 20vw, 380px)', transitionDelay: revealAktiv && revealModul === 'oversikt' ? '1550ms' : '0ms' }}
        >
          <AssistentChatMockup vis={revealAktiv} />
        </div>
      </section>

      {/* ── Lys-tenning: arbeidsrommet imploderer, et anamorfisk lysglimt
          skjærer over skjermen og kjernen blomstrer opp — dekker overgangen
          og trekker seg tilbake idet portalen materialiserer seg ── */}
      {tenning !== 'av' && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center transition-opacity duration-[1300ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${tenning === 'inn' ? 'opacity-100' : 'opacity-0'}`}
          data-testid="bu-tenning"
        >
          {/* Ytre violett halo — vokser sakte */}
          <div
            className="bu-tenning2 absolute h-[46vmax] w-[46vmax] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(180,123,255,0.55) 0%, rgba(124,58,237,0.28) 45%, transparent 70%)', filter: 'blur(40px)' }}
          />
          {/* Anamorfisk flare — horisontalt lyssnitt */}
          <div
            className="bu-flare absolute h-[3px] w-[46vw] rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 50%, transparent 100%)', boxShadow: '0 0 32px 6px rgba(220,198,255,0.55)' }}
          />
          {/* Kjernen — hvitt lys som blomstrer opp */}
          <div
            className="bu-tenning absolute h-[46vmax] w-[46vmax] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.99) 0%, rgba(233,214,255,0.8) 34%, rgba(155,91,214,0.25) 58%, transparent 72%)', filter: 'blur(14px)' }}
          />
        </div>
      )}

      {/* ── Innhold (supersubtil TOC nede i venstre hjørne) ── */}
      <div className="absolute bottom-6 left-6 z-50">
        {/* Menypanelet — mørkt, keynote-aktig, glir opp fra knappen */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-12 left-0 w-[248px] origin-bottom-left rounded-2xl border border-white/[0.08] bg-[#111113]/[0.97] py-2 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${tocApen ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-2 scale-[0.97] opacity-0'}`}
          data-testid="bu-toc-panel"
        >
          <p className="px-4 pb-1.5 pt-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-white/25">Innhold</p>
          <div className="max-h-[min(60vh,480px)] overflow-y-auto px-1.5 pb-0.5">
            {TOC.map((s, i) => {
              // Aktiv = siste TOC-oppføring vi har passert (auto-beats teller mot forrige)
              const aktiv = s.steg <= steg && (i === TOC.length - 1 || TOC[i + 1].steg > steg);
              return (
                <button
                  key={s.steg}
                  onClick={(e) => { e.stopPropagation(); setSteg(s.steg); setTocApen(false); }}
                  className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-[7px] text-left transition-colors duration-150 ${aktiv ? 'bg-white/[0.07]' : 'hover:bg-white/[0.05]'}`}
                  data-testid={`bu-toc-item-${i}`}
                >
                  <span className={`w-[18px] text-[10px] font-medium tabular-nums tracking-wide ${aktiv ? 'text-[#c9a8ff]' : 'text-white/[0.22] group-hover:text-white/40'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={`flex-1 truncate text-[12.5px] tracking-[-0.01em] ${aktiv ? 'font-medium text-white/90' : 'text-white/[0.55] group-hover:text-white/80'}`}>
                    {s.tittel}
                  </span>
                  {aktiv && <span className="h-1 w-1 shrink-0 rounded-full bg-[#B57BFF]" />}
                </button>
              );
            })}
          </div>
        </div>
        {/* Knappen — tre diskrete streker, samme tilstedeværelse som fullskjerm */}
        <button
          onClick={(e) => { e.stopPropagation(); setTocApen((v) => !v); }}
          title="Innhold"
          aria-label="Innhold"
          aria-expanded={tocApen}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-opacity duration-300 ${morkAktiv ? 'text-white/25 hover:text-white/70' : 'text-[#c7c7cc] hover:text-[#0f0f0f]'} ${musSynlig || tocApen ? 'opacity-100' : 'opacity-0'}`}
          data-testid="bu-toc-knapp"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h11M4 17h7" />
          </svg>
        </button>
      </div>

      {/* ── Fullskjerm (kun synlig ved musbevegelse — usynlig på scenen) ── */}
      <button
        onClick={(e) => { e.stopPropagation(); fullskjerm(); }}
        title="Fullskjerm (F)"
        aria-label="Fullskjerm"
        className={`absolute bottom-6 right-6 z-30 flex h-9 w-9 items-center justify-center rounded-full transition-opacity duration-300 ${morkAktiv ? 'text-white/25 hover:text-white/70' : 'text-[#c7c7cc] hover:text-[#0f0f0f]'} ${musSynlig ? 'opacity-100' : 'opacity-0'}`}
        data-testid="bu-fullskjerm"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>

      {/* Kinematografi */}
      <style jsx global>{`
        @keyframes buLinje {
          from { transform: translateY(112%); }
          to { transform: translateY(0); }
        }
        .bu-linje-base { transform: translateY(112%); }
        .bu-linje { animation: buLinje 1.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes buInn {
          from { opacity: 0; transform: translateY(14px); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .bu-inn { opacity: 0; animation: buInn 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @keyframes buDrift {
          from { transform: scale(1); }
          to { transform: scale(1.016); }
        }
        .bu-drift { animation: buDrift 26s ease-in-out 2.2s infinite alternate; }
        @keyframes buBlink {
          0%, 46% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .bu-blink { animation: buBlink 1.05s steps(1) infinite; }
        @keyframes buDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        .bu-dot { animation: buDot 1.25s ease-in-out infinite; }
        @keyframes buPuls {
          0% { transform: scale(1); }
          35% { transform: scale(0.82); }
          100% { transform: scale(1); }
        }
        .bu-puls { animation: buPuls 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes buTenning {
          0% { opacity: 0; transform: scale(0.12); }
          40% { opacity: 1; }
          100% { opacity: 1; transform: scale(3.1); }
        }
        .bu-tenning { animation: buTenning 2.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @keyframes buTenning2 {
          0% { opacity: 0; transform: scale(0.05); }
          45% { opacity: 0.9; }
          100% { opacity: 0.85; transform: scale(2.2); }
        }
        .bu-tenning2 { animation: buTenning2 2.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @keyframes buFlare {
          0% { opacity: 0; transform: scaleX(0.05); }
          22% { opacity: 1; }
          70% { opacity: 0.85; transform: scaleX(2.7); }
          100% { opacity: 0; transform: scaleX(3.6); }
        }
        .bu-flare { animation: buFlare 1.35s cubic-bezier(0.3, 0, 0.2, 1) forwards; }
        @keyframes buSpor {
          from { letter-spacing: -0.002em; }
          to { letter-spacing: -0.04em; }
        }
        .bu-spor { animation: buSpor 2.1s cubic-bezier(0.22, 1, 0.36, 1) 0.95s both; }
        @keyframes buBaandV {
          from { transform: translateX(0); }
          to { transform: translateX(-25%); }
        }
        .bu-baand-v { animation: buBaandV 74s linear infinite; }
        @keyframes buBaandH {
          from { transform: translateX(-25%); }
          to { transform: translateX(0); }
        }
        .bu-baand-h { animation: buBaandH 88s linear infinite; }
        .bu-glans-tekst {
          background: linear-gradient(108deg, #ffffff 34%, #dcc6ff 50%, #ffffff 66%);
          background-size: 240% 100%;
          background-position: 108% 0;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: buGlans 2.2s cubic-bezier(0.45, 0, 0.2, 1) 1.7s forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .bu-tenning, .bu-tenning2, .bu-flare, .bu-aurora1, .bu-aurora2, .bu-flyt, .bu-flyt-tlf, .bu-drift, .bu-spek, .bu-baand-v, .bu-baand-h, .bu-spor { animation: none !important; }
        }
        @keyframes buFlyt {
          from { transform: translateY(0); }
          to { transform: translateY(-7px); }
        }
        .bu-flyt { animation: buFlyt 7.5s ease-in-out infinite alternate; }
        .bu-flyt-tlf { animation: buFlyt 6.5s ease-in-out 0.8s infinite alternate; }

        /* ── Cover-koreografi ── */
        @keyframes buAurora1 {
          from { transform: translate(-50%, 0) scale(1); }
          to { transform: translate(-42%, -6%) scale(1.18); }
        }
        .bu-aurora1 { animation: buAurora1 22s ease-in-out infinite alternate; }
        @keyframes buAurora2 {
          from { transform: translate(0, 0) scale(1.1); }
          to { transform: translate(14%, 8%) scale(0.92); }
        }
        .bu-aurora2 { animation: buAurora2 28s ease-in-out infinite alternate; }
        @keyframes buIkon {
          from { opacity: 0; transform: translateY(14px) scale(0.7); filter: blur(16px); }
          62% { filter: blur(0); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .bu-ikon { opacity: 0; animation: buIkon 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; }
        @keyframes buBloom {
          0% { opacity: 0; transform: scale(0.4); }
          48% { opacity: 0.75; transform: scale(1.14); }
          100% { opacity: 0.32; transform: scale(1); }
        }
        .bu-bloom { opacity: 0; animation: buBloom 1.9s cubic-bezier(0.22, 1, 0.36, 1) 0.45s forwards; }
        @keyframes buSpek {
          from { left: -55%; opacity: 0; }
          18% { opacity: 1; }
          to { left: 125%; opacity: 0; }
        }
        .bu-spek { left: -55%; opacity: 0; animation: buSpek 1.15s cubic-bezier(0.4, 0, 0.2, 1) 1.55s forwards; }
        @keyframes buGlans {
          from { background-position: 108% 0; }
          to { background-position: -60% 0; }
        }
        .bu-tittelinn {
          transform: translateY(112%);
          background: linear-gradient(108deg, #ffffff 42%, #dcc6ff 50%, #ffffff 58%);
          background-size: 260% 100%;
          background-position: 108% 0;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation:
            buLinje 1.35s cubic-bezier(0.16, 1, 0.3, 1) 0.95s forwards,
            buGlans 2.1s cubic-bezier(0.45, 0, 0.2, 1) 2.5s forwards;
        }
      `}</style>
    </main>
  );
}
