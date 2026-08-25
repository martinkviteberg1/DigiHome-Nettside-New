'use client';

/* ═══════════════════ Bergen Urban — presentasjonsdeck ═══════════════════
   Kinematisk sekvens:
   -1) SORT: helt sort — første klikk starter showet
   0) COVER (svart): DigiHome-ikon + navn + «Utleie på autopilot.»
   1) OM MEG (svart): Martin Kviteberg — Produktsjef i DigiHome
   2) HISTORIEN (svart): «Historien om DigiHome.» — oppspill til origin
   3-4) IDEEN (svart): «Boligforvaltning kan automatiseres.» →
      prosessloopen (annonsering → visning → … om igjen og om igjen)
   5) KAOSET (svart): «PROBLEMET · Systemer som ikke snakker sammen.»
   6) LØSNINGEN (svart): «En AI-drevet plattform …» — lader prompten
   7) PROMPT (svart): ChatGPT-aktig bar → prompten skrives → send →
      tenkeprikker → auto-overgang
   8-10) AGENTEN (svart): AI-agenten bygger systemet → deploy → lys-tenning
   11) SVARET (lys): forvalterportalen materialiserer seg + AI-chat →
      kalender → ny booking → enhetssiden
   12) OMFANGET (lys): produktveggen · 13) INTEGRASJONENE ·
   14-16) TRE AI-ROLLER · 17-18) HOOK · 19-20) SANNHETEN
   Navigasjon: → / mellomrom / PageDown (klikker) = neste beat,
   ← / PageUp = forrige, F = fullskjerm, R = start forfra. */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Caveat } from 'next/font/google';
import { Bot, Check, Rocket } from 'lucide-react';
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
//       1 = «Om meg» (Martin Kviteberg) · 2 = «Historien om DigiHome.» ·
//       3 = ideen · 4 = prosessloopen · 5 = kaoset (PROBLEMET) ·
//       6 = løsningen · 7 = bar · 8 = skriver · 9 = sendt+tenker (auto→10) ·
//       10 = agenten bygger (auto→11) · 11 = reveal ·
//       12 = omfanget (produktveggen) · 13 = integrasjonene ·
//       14–16 = tre AI-roller (utvikling · verktøy · agenter) ·
//       17 = påstand 1 · 18 = påstand 1+2 ·
//       19 = sannheten (DigiHome-tall) · 20 = + tradisjonell utvikling ·
//       21 = book et møte (QR, bookend)
const TOTALT = 22;

// Innholdsfortegnelse — supersubtil meny nede i venstre hjørne for å hoppe
// direkte til en scene. Auto-beats (8) hoppes over; agent-scenen (10) spiller
// selv videre til reveal.
const TOC = [
  { steg: -1, tittel: 'Sort start' },
  { steg: 0, tittel: 'Cover · Utleie på autopilot' },
  { steg: 1, tittel: 'Martin Kviteberg' },
  { steg: 2, tittel: 'Historien om DigiHome' },
  { steg: 3, tittel: 'Idéen' },
  { steg: 4, tittel: 'Prosessloopen' },
  { steg: 5, tittel: 'Problemet' },
  { steg: 6, tittel: 'Løsningen' },
  { steg: 7, tittel: 'Prompten' },
  { steg: 10, tittel: 'Agenten bygger' },
  { steg: 11, tittel: 'Portalen' },
  { steg: 12, tittel: 'Produktveggen' },
  { steg: 13, tittel: 'Integrasjonene' },
  { steg: 14, tittel: 'Tre AI-roller' },
  { steg: 17, tittel: 'Påstanden' },
  { steg: 18, tittel: '«6-åringen»' },
  { steg: 19, tittel: 'Sannheten' },
  { steg: 20, tittel: 'Sammenligningen' },
  { steg: 21, tittel: 'Book et møte' },
];

// Problemet — ti systemnavn som dempet typografi i randsonen, og
// konsekvensene krystallklare i sentrum. Ren typografi, ingen bokser.
const KAOS_NAVN = [
  { navn: 'Outlook', x: '10%', y: '13%', s: 19, o: 0.2 },
  { navn: 'Tripletex', x: '30%', y: '5%', s: 15, o: 0.15 },
  { navn: 'Calendly', x: '56%', y: '8%', s: 17, o: 0.18 },
  { navn: 'DocuSign', x: '81%', y: '12%', s: 14, o: 0.14 },
  { navn: 'Vipps', x: '94%', y: '37%', s: 16, o: 0.17 },
  { navn: 'Excel', x: '89%', y: '75%', s: 20, o: 0.21 },
  { navn: 'Husleie.no', x: '67%', y: '92%', s: 14, o: 0.14 },
  { navn: 'FINN', x: '42%', y: '95%', s: 17, o: 0.18 },
  { navn: 'HubSpot', x: '15%', y: '87%', s: 15, o: 0.16 },
  { navn: 'Lodgify', x: '4%', y: '48%', s: 13, o: 0.13 },
];
const KAOS_KONSEKVENSER = ['Manuelt arbeid.', 'Høye lønnskostnader.', 'Ingen samlet oversikt.', 'Vanskelig å skalere.'];

// ── Integrasjonene — «Alt henger sammen.» (samme koreografi som /tour) ──
// DigiHome i midten, integrasjonene i bred ellipse rundt — komposisjonen
// fyller hele viewporten. Hver lyser opp i reisens rekkefølge med én
// fortellerlinje, før alt glir sammen: ett system.
const INTEGRASJONER = [
  { navn: 'Kartverket', vinkel: -90, tekst: 'Boligdata hentes fra Kartverket', logoer: [{ src: '/kartverket-logo.png', h: 28 }] },
  { navn: 'FINN.no', vinkel: -45, tekst: 'Annonsen publiseres rett på FINN', logoer: [{ src: '/finn-logo-full.png', h: 24 }] },
  { navn: 'Creditsafe', vinkel: 0, tekst: 'Kredittsjekk av kandidatene', logoer: [{ src: '/creditsafe-logo.png', h: 20 }] },
  { navn: 'BankID', vinkel: 45, tekst: 'Signering og identitet med BankID', logoer: [{ src: '/bankid-logo.png', h: 21 }] },
  { navn: 'Keyhole', vinkel: 90, tekst: 'Depositum opprettes og sikres med Keyhole', logoer: [{ src: '/keyhole-logo.png', h: 22 }] },
  { navn: 'Vipps', vinkel: 135, tekst: 'Betaling med Vipps', logoer: [{ src: '/vipps-logo.png', h: 25 }] },
  {
    navn: 'Regnskap', vinkel: 180,
    tekst: 'Oppgjøret rett i regnskapet — Fiken, PowerOffice eller Tripletex',
    logoer: [
      { src: '/fiken-logo.png', h: 20 },
      { src: '/poweroffice-logo.png', h: 18 },
      { src: '/tripletex-logo.png', h: 16 },
    ],
  },
  {
    navn: 'Kanaler', vinkel: -135,
    tekst: 'Korttid synkroniseres med Airbnb og Booking.com',
    logoer: [
      { src: '/airbnb-logo.png', h: 24 },
      { src: '/booking-logo.png', h: 19 },
    ],
  },
];
const INTEGRASJON_TRINN = [
  { navn: 'start', ms: 1100 },
  ...INTEGRASJONER.map((_, i) => ({ navn: `i${i}`, ms: 1500 })),
  { navn: 'alle', ms: 6000 },
];
// Bred ellipse: containeren er et bredt rektangel, og prosentpunktene
// strekkes med den — SVG-en bruker preserveAspectRatio="none" for å matche.
const intPos = (vinkel) => {
  const r = (vinkel * Math.PI) / 180;
  return { x: 50 + 44 * Math.cos(r), y: 50 + 40 * Math.sin(r) };
};
const INT_LILLA = '#9B5BD6';

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
    <div className="flex h-full w-full flex-col text-center">
      {/* Huben — fyller all tilgjengelig flate, bred ellipse */}
      <div className="relative mx-auto min-h-0 w-full max-w-[1280px] flex-1" data-testid="bu-integrasjon-hub">
        {/* Forbindelseslinjene */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
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
          className="absolute left-1/2 top-1/2 flex h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[28px] bg-white transition-shadow duration-700"
          style={{
            boxShadow: lysende >= 0 || alle
              ? '0 32px 80px -24px rgba(155,91,214,0.45), 0 0 0 1px rgba(0,0,0,0.04)'
              : '0 24px 64px -26px rgba(10,10,10,0.28), 0 0 0 1px rgba(0,0,0,0.04)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-mark.svg" alt="DigiHome" className="h-[58px] w-[58px] rounded-[13px]" />
        </div>

        {/* Integrasjonene */}
        {INTEGRASJONER.map((c, i) => {
          const p = intPos(c.vinkel);
          const lyser = i === lysende || alle;
          return (
            <div
              key={c.navn}
              className="absolute flex items-center justify-center rounded-[20px] bg-white px-6 py-4 transition-all duration-500"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: `translate(-50%, -50%) scale(${i === lysende ? 1.1 : 1})`,
                opacity: lyser ? 1 : 0.55,
                filter: lyser ? 'grayscale(0)' : 'grayscale(1)',
                boxShadow: i === lysende
                  ? '0 26px 60px -18px rgba(155,91,214,0.38), 0 0 0 1.5px rgba(155,91,214,0.25)'
                  : '0 14px 38px -16px rgba(10,10,10,0.15), 0 0 0 1px rgba(0,0,0,0.04)',
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <span className="flex items-center gap-3">
                {c.logoer.map((l) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={l.src} src={l.src} alt={c.navn} style={{ height: l.h }} className="w-auto max-w-[130px] object-contain" />
                ))}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fortellerlinjen — én integrasjon om gangen */}
      <div className="mx-auto mb-2 mt-5 grid h-8 w-full max-w-[640px] shrink-0">
        {INTEGRASJONER.map((c, i) => (
          <p
            key={c.navn}
            className={`[grid-area:1/1] text-[clamp(15px,1.5vw,20px)] font-medium tracking-[-0.01em] text-[#1d1d1f] transition-opacity duration-500 ${i === lysende ? 'opacity-100' : 'opacity-0'}`}
          >
            {c.tekst}
          </p>
        ))}
        <p className={`[grid-area:1/1] text-[clamp(15px,1.5vw,20px)] font-medium tracking-[-0.01em] text-[#1d1d1f] transition-opacity duration-500 ${alle ? 'opacity-100' : 'opacity-0'}`}>
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

  // Myk navigasjon: ignorer klikk som lander midt i en pågående overgang
  // (raske dobbelklikk gir ellers halvferdige crossfades — hakkete på scenen)
  const sisteNav = useRef(0);
  const neste = useCallback(() => {
    const naa = Date.now();
    if (naa - sisteNav.current < 320) return;
    sisteNav.current = naa;
    setSteg((s) => Math.min(TOTALT - 1, s + 1));
  }, []);
  const forrige = useCallback(() => {
    const naa = Date.now();
    if (naa - sisteNav.current < 320) return;
    sisteNav.current = naa;
    setSteg((s) => (s === 10 || s === 11 ? 8 : Math.max(0, s - 1)));
  }, []);

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
    if (steg <= 7) { setAntallTegn(0); return undefined; }
    if (steg === 8) {
      if (antallTegn >= PROMPT.length) return undefined;
      const t = setTimeout(() => setAntallTegn((n) => n + 1), 26 + Math.random() * 62);
      return () => clearTimeout(t);
    }
    setAntallTegn(PROMPT.length);
    return undefined;
  }, [steg, antallTegn]);

  // Send → tenkeprikker → auto-overgang til agent-scenen
  useEffect(() => {
    if (steg !== 9) { setTenker(false); return undefined; }
    const t1 = setTimeout(() => setTenker(true), 520);
    const t2 = setTimeout(() => setSteg(10), 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [steg]);

  // Kodestrøm: agenten «bygger» → deploy-beat → lys-tenning → reveal
  useEffect(() => {
    if (steg < 10) { setKodeAntall(0); setDeploy(false); setTenning('av'); return undefined; }
    if (steg !== 10) return undefined; // behold linjene under utfading
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
        // DigiHome-ikonet tennes i sentrum · 3) ikonet åpner seg mot kamera
        // og portalen materialiserer seg under lyset
        setTimeout(() => { if (!stoppet) setDeploy(true); }, 380);
        setTimeout(() => { if (!stoppet) setTenning('inn'); }, 2400);
        setTimeout(() => { if (!stoppet) setSteg(11); }, 3900);
        return;
      }
      setTimeout(tikk, Math.max(9, 36 - i * 0.12));
    };
    const start = setTimeout(tikk, 300);
    return () => { stoppet = true; clearTimeout(start); };
  }, [steg]);

  // Lyset trekker seg tilbake idet portalen står ferdig
  useEffect(() => {
    if (steg !== 11) return undefined;
    const t1 = setTimeout(() => setTenning((v) => (v === 'inn' ? 'ut' : v)), 300);
    const t2 = setTimeout(() => setTenning('av'), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [steg]);

  // Portalen lever: etter at assistenten har svart, navigerer den selv til
  // Kalender-modulen (sidebar-markøren glir, hovedflaten kryssfader). Der
  // lander en ny booking live (kalender-liv), før portalen åpner enheten
  // som fikk bookingen — Marken 8 — i appens enkeltvisning.
  useEffect(() => {
    if (steg !== 11) { setRevealModul('oversikt'); return undefined; }
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
  const klarTilSend = antallTegn >= PROMPT.length && steg >= 8;
  const morkAktiv = steg <= 10; // reveal (steg 11) er lys fullskjerm
  const coverAktiv = steg === 0;
  const megAktiv = steg === 1;
  const historieAktiv = steg === 2;
  const ideAktiv = steg === 3 || steg === 4;
  const ideBeat = Math.max(0, steg - 3); // 0 = ideen · 1 = prosessloopen
  const kaosAktiv = steg === 5;
  const losningAktiv = steg === 6;
  const promptAktiv = steg >= 7 && steg <= 9;
  const kodeAktiv = steg === 10;
  const revealAktiv = steg === 11;
  const omfangAktiv = steg === 12;
  const integrasjonAktiv = steg === 13;
  const hookAktiv = steg === 17 || steg === 18;
  const bygg = Math.max(0, steg - 17);
  const sannhetAktiv = steg === 19 || steg === 20;
  const sannhetBeat = Math.max(0, steg - 19); // 0 = DigiHome-tall · 1 = + tradisjonell
  const rollerAktiv = steg >= 14 && steg <= 16;
  const rollerBeat = Math.max(0, steg - 13); // 1 = utviklingen · 2 = +verktøyene · 3 = +agentene
  const sluttAktiv = steg === 21;

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

        <div className="bu-drift-lys flex flex-1 flex-col items-center justify-center px-8 md:px-16">
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

        <div className="bu-drift-lys flex flex-1 flex-col items-center justify-center px-8 md:px-16">
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

      {/* ═══ AKT 7 — TRE AI-ROLLER: ren typografi, hairlines og luft ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${lysKlasse(rollerAktiv, 'inn')}`}
        data-testid="bu-slide-roller"
      >
        <header className="relative z-10 flex justify-start px-12 pt-11 md:px-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[24px] w-auto" />
        </header>

        <div className="bu-drift-lys flex flex-1 flex-col items-center justify-center px-10 md:px-16">
          <div className="w-full max-w-[1060px]">
            <div className={`text-center opacity-0 ${rollerAktiv ? 'bu-inn' : ''}`} style={{ animationDuration: '1.4s' }}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#c7c7cc]">AI i alle lag</p>
              <h2 className="mt-7 font-heading text-[clamp(28px,3.6vw,52px)] font-bold leading-[1.12] tracking-[-0.03em] text-[#0f0f0f]" data-testid="bu-roller-tittel">
                Tre måter vi har brukt AI på.
              </h2>
            </div>

            {/* Rollene — hairline, nummer, navn, én setning. Én per klikk. */}
            <div className="mt-20 grid grid-cols-3 gap-x-14 md:mt-24">
              {[
                { navn: 'Utvikling', tekst: 'Autonome AI-agenter skrev, designet og kvalitetssikret hele plattformen.' },
                { navn: 'Verktøy', tekst: 'Innebygd intelligens i hver modul — bilder, annonser og dialog.' },
                { navn: 'Agenter', tekst: 'Selvstendige agenter overvåker, fanger opp og følger opp. Døgnet rundt.' },
              ].map((r, i) => (
                <div
                  key={r.navn}
                  className={`opacity-0 ${rollerBeat >= i + 1 ? 'bu-inn' : ''}`}
                  style={{ animationDuration: '1.3s' }}
                  data-testid={`bu-rolle-${i + 1}`}
                >
                  <div className="border-t border-[#e8e8ed] pt-7">
                    <p className="text-[13px] font-semibold tabular-nums tracking-[0.02em] text-[#7c3aed]">0{i + 1}</p>
                    <h3 className="mt-4 font-heading text-[clamp(20px,1.9vw,28px)] font-bold tracking-[-0.025em] text-[#0f0f0f]">{r.navn}</h3>
                    <p className="mt-3 max-w-[30ch] text-[clamp(13.5px,1.15vw,16px)] leading-relaxed text-[#86868b]">{r.tekst}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Payoff — lander stille når alle tre står */}
            <p
              className={`mt-24 text-center text-[clamp(15px,1.6vw,22px)] leading-snug opacity-0 ${rollerBeat >= 3 ? 'bu-inn' : ''}`}
              style={{ animationDelay: '1400ms' }}
              data-testid="bu-roller-payoff"
            >
              <span className="font-semibold text-[#0f0f0f]">Bygget av AI</span>
              <span className="mx-3.5 text-[#d6d6db]">·</span>
              <span className="font-semibold text-[#0f0f0f]">Drevet av AI</span>
              <span className="mx-3.5 text-[#d6d6db]">·</span>
              <span className="font-semibold text-[#0f0f0f]">Overvåket av AI</span>
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

        <div className="bu-drift-lys flex flex-1 flex-col items-center justify-center px-8 md:px-14">
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
            <span className="font-semibold text-[#0f0f0f]">Web og mobil app</span>
            <span className="mx-2.5 text-[#c7c7cc]">·</span>
            <span className="font-semibold text-[#0f0f0f]">10+ moduler</span>
            <span className="mx-2.5 text-[#c7c7cc]">·</span>
            <span className="font-semibold text-[#0f0f0f]">15+ integrasjoner</span>
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

        <div className="bu-drift-lys flex min-h-0 flex-1 flex-col items-center px-8 md:px-14">
          <div className={`mb-2 mt-1 text-center opacity-0 ${integrasjonAktiv ? 'bu-inn' : ''}`} style={{ animationDuration: '1.4s' }}>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.25em] text-[#c7c7cc]">Integrasjonene</p>
            <h2 className="mt-4 font-heading text-[clamp(30px,3.8vw,56px)] font-bold leading-[1.1] tracking-[-0.035em] text-[#0f0f0f]">
              Alt henger sammen<span className="text-[#9B5BD6]">.</span>
            </h2>
          </div>
          <div className={`min-h-0 w-full flex-1 opacity-0 ${integrasjonAktiv ? 'bu-inn' : ''}`} style={{ animationDelay: '350ms', animationDuration: '1.5s' }}>
            <BUIntegrasjoner aktiv={integrasjonAktiv} />
          </div>
        </div>

        <footer className="pb-6" />
      </section>

      {/* ═══ DEN SVARTE SCENEN — cover, prompt og reveal (skrus av mot tittel) ═══ */}
      <section
        className={`absolute inset-0 z-20 bg-[#050505] transition-opacity duration-[1700ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${morkAktiv ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        data-testid="bu-svart-scene"
      >
        {/* DigiHome-logo — diskret oppe til venstre på de mørke slidene
            (ikke på cover, som selv er logoen — og ikke over agent-vinduet) */}
        <header
          className={`pointer-events-none absolute left-12 top-11 z-30 transition-opacity duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:left-16 ${steg >= 1 && steg <= 9 ? 'opacity-100' : 'opacity-0'}`}
          data-testid="bu-mork-logo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-logo-white.svg" alt="DigiHome" className="h-[26px] w-auto" />
        </header>

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

        {/* ── AKT 0.25: OM MEG — Martin Kviteberg, Produktsjef i DigiHome ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-8 text-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(megAktiv)}`}
          data-testid="bu-meg"
        >
          {/* Knapt merkbar nøytral luminans */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(50% 42% at 50% 44%, rgba(255,255,255,0.05) 0%, transparent 100%)' }} />

          {/* Scale-settle + kamera-liv — samme filmspråk som resten av den svarte scenen */}
          <div style={{ transform: megAktiv ? 'scale(1)' : 'scale(1.05)', transition: 'transform 3200ms cubic-bezier(0.22,1,0.36,1)' }}>
            <div className="bu-drift flex flex-col items-center gap-12 md:flex-row md:gap-[5.5rem]">

              {/* Portrettet — stort, editorielt beskåret. Materialiserer seg i
                  blur-dissolve mens motivet lander i en langsom Ken Burns-settle */}
              <div className={megAktiv ? 'bu-foto' : 'opacity-0'}>
                <div className="relative overflow-hidden rounded-[34px] shadow-[0_60px_160px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.1]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/martin-kviteberg.jpg"
                    alt="Martin Kviteberg"
                    className={`block h-[clamp(340px,54vh,500px)] w-[clamp(272px,43.2vh,400px)] object-cover ${megAktiv ? 'bu-kenburns' : ''}`}
                  />
                  {/* Diskret luminans-gradient nederst — forankrer bildet i scenen */}
                  <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 68%, rgba(0,0,0,0.3) 100%)' }} />
                  {/* Hårfin topplys-kant */}
                  <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[34px]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)' }} />
                </div>
              </div>

              {/* Teksten — editoriell kolonne */}
              <div className="max-w-[560px] text-center md:text-left">
                <p
                  className={`bu-ord-base text-[clamp(11px,0.95vw,13.5px)] font-semibold uppercase tracking-[0.32em] text-white/[0.42] ${megAktiv ? 'bu-ord' : ''}`}
                  style={{ animationDelay: '650ms' }}
                >
                  Produktsjef<span className="mx-3 text-[#B57BFF]/70">·</span>DigiHome
                </p>
                <h2 className={`mt-8 font-heading text-[clamp(56px,6.8vw,110px)] font-bold leading-[0.97] tracking-[-0.04em] text-white ${megAktiv ? 'bu-spor' : ''}`}>
                  <span className="block">
                    <span className={`bu-ord-base ${megAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '950ms' }}>Martin</span>
                  </span>
                  <span className="block">
                    <span className={`bu-ord-base ${megAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '1200ms' }}>
                      <span className={megAktiv ? 'bu-glans-tekst' : ''} style={{ animationDelay: '2700ms' }}>Kviteberg</span>
                    </span>
                  </span>
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* ── AKT 0.5: HISTORIEN — kinematisk tittelreveal, Apple-minimalisme ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-8 text-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(historieAktiv)}`}
          data-testid="bu-historie"
        >
          {/* Knapt merkbar nøytral luminans — bare nok til at svart ikke blir flatt */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(50% 42% at 50% 46%, rgba(255,255,255,0.05) 0%, transparent 100%)' }} />

          {/* Scale-settle: komposisjonen lander sakte fra 1.05 → 1 (filmtittel) */}
          <div
            className="relative"
            style={{ transform: historieAktiv ? 'scale(1)' : 'scale(1.05)', transition: 'transform 3200ms cubic-bezier(0.22,1,0.36,1)' }}
          >
            {/* Umerkelig kamera-liv */}
            <div className="bu-drift flex flex-col items-center">
              {/* Tittel — ord for ord i blur-dissolve, tracking som setter seg */}
              <h2 className={`font-heading text-[clamp(44px,6.6vw,102px)] font-bold leading-[1.05] tracking-[-0.04em] text-white ${historieAktiv ? 'bu-spor' : ''}`}>
                <span className="block">
                  <span className={`bu-ord-base ${historieAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '350ms' }}>Historien</span>{' '}
                  <span className={`bu-ord-base ${historieAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '600ms' }}>om</span>
                </span>
                <span className="block">
                  <span className={`bu-ord-base ${historieAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '950ms' }}>
                    <span className={historieAktiv ? 'bu-glans-tekst' : ''} style={{ animationDelay: '2300ms' }}>DigiHome</span>.
                  </span>
                </span>
              </h2>

              {/* Underlinje — tydelig, presis label med hairlines */}
              <div
                className={`mt-11 flex items-center gap-5 opacity-0 ${historieAktiv ? 'bu-inn' : ''}`}
                style={{ animationDelay: '2500ms', animationDuration: '1.6s' }}
                data-testid="bu-historie-label"
              >
                <span aria-hidden className="h-px w-12 bg-gradient-to-r from-transparent to-white/30" />
                <p className="text-[clamp(12px,1.05vw,15px)] font-semibold uppercase tracking-[0.3em] text-white/[0.78]" style={{ marginRight: '-0.3em' }}>
                  Vibe coding i praksis
                </p>
                <span aria-hidden className="h-px w-12 bg-gradient-to-l from-transparent to-white/30" />
              </div>
            </div>
          </div>
        </div>

        {/* ── AKT 0.75: IDEEN — innsikten som startet alt (to beats) ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(ideAktiv)}`}
          data-testid="bu-ide"
        >
          {/* Knapt merkbar nøytral luminans */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(50% 42% at 50% 46%, rgba(255,255,255,0.045) 0%, transparent 100%)' }} />

          {/* Kamera-glid: ideen optisk sentrert alene — hele komposisjonen
              glir opp idet loopen ruller inn (loopen okkuperer plass under) */}
          <div className={`relative flex w-full flex-col items-center transition-transform duration-[1300ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${ideBeat >= 1 ? '-translate-y-[3vh]' : 'translate-y-[16vh]'}`}>
            {/* Scale-settle — komposisjonen lander sakte, som Historien */}
            <div className="flex w-full flex-col items-center" style={{ transform: ideAktiv ? 'scale(1)' : 'scale(1.04)', transition: 'transform 3000ms cubic-bezier(0.22,1,0.36,1)' }}>
            <div className="bu-drift flex w-full flex-col items-center">

            {/* Beat 1 — ideen (rack focus når loopen kommer) */}
            <div className={`px-8 text-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${ideBeat >= 1 ? 'scale-[0.6] opacity-30 blur-[1px]' : 'scale-100 opacity-100 blur-0'}`}>
              <p className={`bu-ord-base text-[clamp(14px,1.3vw,18px)] font-medium tracking-[-0.01em] text-white/[0.45] ${ideAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '250ms' }}>
                Alt startet med én idé.
              </p>
              <h2 className={`mt-6 font-heading text-[clamp(38px,5.6vw,86px)] font-bold leading-[1.08] tracking-[-0.04em] text-white ${ideAktiv ? 'bu-spor' : ''}`}>
                <span className="block">
                  <span className={`bu-ord-base ${ideAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '800ms' }}>Boligforvaltning</span>
                </span>
                <span className="block">
                  <span className={`bu-ord-base ${ideAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '1100ms' }}>kan</span>{' '}
                  <span className={`bu-ord-base ${ideAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '1350ms' }}>
                    <span className={ideAktiv ? 'bu-glans-tekst' : ''} style={{ animationDelay: '2600ms' }}>automatiseres</span>.
                  </span>
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
        </div>

        {/* ── AKT 0.9: KAOSET — problemet: systemer som ikke snakker sammen ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-8 transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(kaosAktiv)}`}
          data-testid="bu-kaos"
        >
          {/* Knapt merkbar nøytral luminans */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(50% 42% at 50% 46%, rgba(255,255,255,0.04) 0%, transparent 100%)' }} />

          {/* Scale-settle — komposisjonen lander sakte (filmtittel) */}
          <div className="flex w-full flex-col items-center" style={{ transform: kaosAktiv ? 'scale(1)' : 'scale(1.045)', transition: 'transform 3000ms cubic-bezier(0.22,1,0.36,1)' }}>
          <div className="bu-drift flex w-full flex-col items-center">
            {/* Kicker — PROBLEMET */}
            <p
              className={`bu-ord-base text-[clamp(11.5px,1vw,14px)] font-semibold uppercase tracking-[0.32em] text-white/[0.42] ${kaosAktiv ? 'bu-ord' : ''}`}
              style={{ animationDelay: '250ms', marginRight: '-0.32em' }}
            >
              Problemet
            </p>
            {/* Tittel — ord for ord i blur-dissolve */}
            <h2 className={`mt-6 text-center font-heading text-[clamp(28px,3.8vw,60px)] font-bold leading-[1.12] tracking-[-0.035em] text-white ${kaosAktiv ? 'bu-spor' : ''}`}>
              {['Systemer', 'som', 'ikke', 'snakker', 'sammen.'].map((ord, i) => (
                <span key={ord} className={`bu-ord-base ${kaosAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: `${600 + i * 130}ms` }}>
                  {ord}{i < 4 ? '\u00A0' : ''}
                </span>
              ))}
            </h2>

            {/* Randsonen — ti systemnavn som dempet typografi, hver i sin
                egen sakte drift. I sentrum: konsekvensene, én etter én. */}
            <div className="relative mt-2 flex h-[52vh] max-h-[560px] min-h-[340px] w-full max-w-[1280px] items-center justify-center">
              {KAOS_NAVN.map((n, i) => (
                <div
                  key={n.navn}
                  className="absolute"
                  style={{
                    left: n.x,
                    top: n.y,
                    transform: `translate(-50%, -50%) translateY(${kaosAktiv ? 0 : 14}px)`,
                    opacity: kaosAktiv ? 1 : 0,
                    filter: kaosAktiv ? 'blur(0)' : 'blur(10px)',
                    transition: 'transform 1000ms cubic-bezier(0.22,1,0.36,1), opacity 900ms cubic-bezier(0.22,1,0.36,1), filter 900ms cubic-bezier(0.22,1,0.36,1)',
                    transitionDelay: kaosAktiv ? `${500 + i * 120}ms` : '0ms',
                  }}
                >
                  <div className="bu-kaos-flyt" style={{ animationDuration: `${6 + (i % 4) * 0.8}s`, animationDelay: `${-(i * 1.2)}s` }}>
                    <span
                      className="whitespace-nowrap font-heading font-semibold tracking-[-0.01em] text-white"
                      style={{ fontSize: n.s, opacity: n.o }}
                    >
                      {n.navn}
                    </span>
                  </div>
                </div>
              ))}

              {/* Konsekvensene — krystallklare mot den dempede randsonen */}
              <div className="relative z-10 flex flex-col items-center gap-[1.6vh]">
                {KAOS_KONSEKVENSER.map((k, i) => (
                  <p
                    key={k}
                    className={`bu-ord-base font-heading text-[clamp(26px,3.3vw,50px)] font-bold leading-[1.05] tracking-[-0.03em] text-white/[0.94] ${kaosAktiv ? 'bu-ord' : ''}`}
                    style={{ animationDelay: `${1800 + i * 600}ms` }}
                    data-testid={`bu-kaos-konsekvens-${i + 1}`}
                  >
                    {i === KAOS_KONSEKVENSER.length - 1
                      ? <span className={kaosAktiv ? 'bu-glans-tekst' : ''} style={{ animationDelay: '4700ms' }}>{k}</span>
                      : k}
                  </p>
                ))}
              </div>
            </div>

            {/* Payoff — hviskes inn til slutt */}
            <p
              className={`text-center text-[clamp(14px,1.4vw,20px)] tracking-[-0.01em] text-white/[0.42] opacity-0 ${kaosAktiv ? 'bu-inn' : ''}`}
              style={{ animationDelay: '4600ms' }}
              data-testid="bu-kaos-payoff"
            >
              Ti systemer. <span className="font-medium text-white/[0.85]">Null sammenheng.</span>
            </p>
          </div>
          </div>
        </div>

        {/* ── AKT 0.95: LØSNINGEN — speiler problemet, lader prompten ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-8 text-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(losningAktiv)}`}
          data-testid="bu-losning"
        >
          {/* Knapt merkbar nøytral luminans */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(50% 42% at 50% 46%, rgba(255,255,255,0.05) 0%, transparent 100%)' }} />

          {/* Scale-settle + kamera-liv */}
          <div className="flex flex-col items-center" style={{ transform: losningAktiv ? 'scale(1)' : 'scale(1.05)', transition: 'transform 3200ms cubic-bezier(0.22,1,0.36,1)' }}>
            <div className="bu-drift flex flex-col items-center">
              <p
                className={`bu-ord-base text-[clamp(11.5px,1vw,14px)] font-semibold uppercase tracking-[0.32em] text-white/[0.42] ${losningAktiv ? 'bu-ord' : ''}`}
                style={{ animationDelay: '300ms', marginRight: '-0.32em' }}
              >
                Løsningen
              </p>
              <h2 className={`mt-8 font-heading text-[clamp(30px,4.4vw,70px)] font-bold leading-[1.12] tracking-[-0.035em] text-white ${losningAktiv ? 'bu-spor' : ''}`}>
                <span className="block">
                  <span className={`bu-ord-base ${losningAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '750ms' }}>En</span>{' '}
                  <span className={`bu-ord-base ${losningAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '950ms' }}>
                    <span className={losningAktiv ? 'bu-glans-tekst' : ''} style={{ animationDelay: '2600ms' }}>AI-drevet</span>
                  </span>{' '}
                  <span className={`bu-ord-base ${losningAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '1150ms' }}>plattform</span>
                </span>
                <span className="block">
                  <span className={`bu-ord-base ${losningAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '1400ms' }}>for</span>{' '}
                  <span className={`bu-ord-base ${losningAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '1550ms' }}>automatisert</span>{' '}
                  <span className={`bu-ord-base ${losningAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '1750ms' }}>boligforvaltning.</span>
                </span>
              </h2>
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

          {/* Scale-settle + kamera-liv — samme filmspråk som resten av den svarte scenen */}
          <div className="flex w-full flex-col items-center" style={{ transform: promptAktiv ? 'scale(1)' : 'scale(1.05)', transition: 'transform 3200ms cubic-bezier(0.22,1,0.36,1)' }}>
          <div className="bu-drift flex w-full flex-col items-center">

          <div className={`relative flex w-[min(720px,88vw)] items-center gap-3 rounded-[28px] border border-white/[0.09] bg-[#161616] py-3 pl-4 pr-3 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] transition-transform duration-700 ${steg >= 9 ? 'scale-[0.985]' : 'scale-100'}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/40">
              <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
            <p className="min-h-[27px] flex-1 text-[16.5px] leading-[27px] text-[#ececec] md:text-[18px]" data-testid="bu-prompt-tekst">
              {steg <= 7 && <span className="text-white/30">Spør om hva som helst</span>}
              {steg >= 8 && (
                <>
                  {skrevet}
                  {steg <= 8 && <span className="bu-blink ml-[1px] inline-block h-[1.1em] w-[2px] translate-y-[0.18em] bg-white/90" />}
                </>
              )}
            </p>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${klarTilSend ? 'bg-white text-black' : 'bg-white/10 text-white/30'} ${steg >= 9 ? 'bu-puls' : ''}`}
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
          </div>
        </div>

        {/* ── AKT 1.5: AI-AGENTEN — mockup av agenten som bygger DigiHome ── */}
        <div
          className={`absolute inset-0 transition-[opacity,filter,transform] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${kodeAktiv ? (tenning === 'av' ? 'opacity-100 blur-0 scale-100 translate-y-0' : 'opacity-20 blur-[6px] scale-[0.94] translate-y-0') : 'pointer-events-none opacity-0 blur-[10px] scale-[0.97] translate-y-[16px]'}`}
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
        className={`absolute inset-0 z-10 overflow-hidden transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${revealAktiv ? 'pointer-events-auto opacity-100 blur-0 scale-100' : 'pointer-events-none opacity-0 blur-[14px] scale-[0.965]'}`}
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
          {/* App-ikonet — DigiHome «lanseres»: popper inn i lyset, holder et
              øyeblikk, og åpner seg mot kamera idet portalen står klar under */}
          <div className={`absolute ${tenning === 'inn' ? 'bu-appikon-inn' : 'bu-appikon-ut'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/digihome-mark.svg"
              alt=""
              className="h-[124px] w-[124px] rounded-[28px] shadow-[0_50px_140px_-16px_rgba(124,58,237,0.6)] md:h-[136px] md:w-[136px]"
            />
          </div>
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
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-opacity duration-300 ${morkAktiv || sluttAktiv ? 'text-white/25 hover:text-white/70' : 'text-[#c7c7cc] hover:text-[#0f0f0f]'} ${musSynlig || tocApen ? 'opacity-100' : 'opacity-0'}`}
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
        className={`absolute bottom-6 right-6 z-40 flex h-9 w-9 items-center justify-center rounded-full transition-opacity duration-300 ${morkAktiv || sluttAktiv ? 'text-white/25 hover:text-white/70' : 'text-[#c7c7cc] hover:text-[#0f0f0f]'} ${musSynlig ? 'opacity-100' : 'opacity-0'}`}
        data-testid="bu-fullskjerm"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>

      {/* ═══ AKT 8 — BOOK ET MØTE: bookend, QR og takk ═══ */}
      <section
        className={`absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden bg-[#050505] px-8 text-center transition-opacity duration-[1500ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${sluttAktiv ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        data-testid="bu-slutt"
      >
        {/* Aurora — samme pust som cover: showet slutter der det begynte */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="bu-aurora1 absolute left-1/2 top-[24%] h-[64vh] w-[58vw] -translate-x-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.5) 0%, transparent 62%)', filter: 'blur(90px)', opacity: 0.24 }}
          />
          <div
            className="bu-aurora2 absolute left-[30%] top-[46%] h-[48vh] w-[42vw] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.45) 0%, transparent 62%)', filter: 'blur(110px)', opacity: 0.14 }}
          />
        </div>

        {/* Scale-settle + kamera-liv */}
        <div className="flex flex-col items-center" style={{ transform: sluttAktiv ? 'scale(1)' : 'scale(1.05)', transition: 'transform 3200ms cubic-bezier(0.22,1,0.36,1)' }}>
          <div className="bu-drift flex flex-col items-center">
            {/* Tittelen — ord for ord */}
            <h2 className={`font-heading text-[clamp(40px,5.6vw,88px)] font-bold leading-[1.05] tracking-[-0.04em] text-white ${sluttAktiv ? 'bu-spor' : ''}`}>
              <span className={`bu-ord-base ${sluttAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '350ms' }}>Book</span>{' '}
              <span className={`bu-ord-base ${sluttAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '550ms' }}>et</span>{' '}
              <span className={`bu-ord-base ${sluttAktiv ? 'bu-ord' : ''}`} style={{ animationDelay: '750ms' }}>
                <span className={sluttAktiv ? 'bu-glans-tekst' : ''} style={{ animationDelay: '2400ms' }}>møte</span>.
              </span>
            </h2>

            {/* QR-brikken — materialiserer seg som app-ikonet */}
            <div className={`mt-12 ${sluttAktiv ? 'bu-foto' : 'opacity-0'}`} style={{ animationDelay: '1100ms' }}>
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -inset-8 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(155,91,214,0.32) 0%, transparent 68%)', filter: 'blur(30px)' }}
                />
                <div className="relative rounded-[30px] bg-white p-6 shadow-[0_50px_140px_-20px_rgba(155,91,214,0.45)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/qr-kontakt.svg" alt="QR — book et møte" className="h-[clamp(150px,24vh,196px)] w-[clamp(150px,24vh,196px)]" />
                </div>
              </div>
            </div>

            {/* Fallback for de bakerst i rommet */}
            <p className={`mt-9 text-[clamp(13.5px,1.2vw,17px)] text-white/[0.55] opacity-0 ${sluttAktiv ? 'bu-inn' : ''}`} style={{ animationDelay: '2100ms' }}>
              Skann — eller gå til <span className="font-semibold text-white/[0.9]">digihome.no/book-mote</span>
            </p>
          </div>
        </div>

        {/* Hvisket forankring */}
        <p className={`absolute bottom-10 text-[11.5px] tracking-[0.22em] text-white/[0.22] opacity-0 ${sluttAktiv ? 'bu-inn' : ''}`} style={{ animationDelay: '2800ms' }}>
          MARTIN KVITEBERG&ensp;·&ensp;PRODUKTSJEF&ensp;·&ensp;DIGIHOME
        </p>
      </section>

      {/* ── Fremdriftslinje — hårtynn, keynote-diskret, følger scenens lyshet ── */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-[2px]">
        <div
          className="h-full origin-left transition-[transform,background-color] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: `scaleX(${Math.max(0, steg + 1) / TOTALT})`,
            backgroundColor: morkAktiv || sluttAktiv ? 'rgba(255,255,255,0.13)' : 'rgba(15,15,15,0.10)',
          }}
        />
      </div>

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
        @keyframes buDriftLys {
          from { transform: scale(1); }
          to { transform: scale(1.007); }
        }
        .bu-drift-lys { animation: buDriftLys 22s ease-in-out 1.5s infinite alternate; }
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
        /* ── App-lanseringen: ikonet popper inn og åpner seg mot kamera ── */
        @keyframes buAppIkonInn {
          0% { opacity: 0; transform: scale(0.4) translateY(12px); filter: blur(16px); }
          55% { filter: blur(0); }
          74% { transform: scale(1.05) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        .bu-appikon-inn { animation: buAppIkonInn 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both; }
        @keyframes buAppIkonUt {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          100% { opacity: 0; transform: scale(14); filter: blur(10px); }
        }
        .bu-appikon-ut { animation: buAppIkonUt 1.1s cubic-bezier(0.55, 0, 0.85, 0.35) both; }
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
          .bu-tenning, .bu-tenning2, .bu-flare, .bu-appikon-inn, .bu-appikon-ut, .bu-aurora1, .bu-aurora2, .bu-flyt, .bu-flyt-tlf, .bu-drift, .bu-drift-lys, .bu-kenburns, .bu-spek, .bu-baand-v, .bu-baand-h, .bu-spor, .bu-kaos-flyt, .bu-kaos-strek { animation: none !important; }
        }
        @keyframes buFlyt {
          from { transform: translateY(0); }
          to { transform: translateY(-7px); }
        }
        .bu-flyt { animation: buFlyt 7.5s ease-in-out infinite alternate; }
        .bu-flyt-tlf { animation: buFlyt 6.5s ease-in-out 0.8s infinite alternate; }

        /* ── Historien: ord-for-ord blur-dissolve (kinematisk tittelreveal) ── */
        @keyframes buOrd {
          from { opacity: 0; transform: translateY(0.35em); filter: blur(16px); }
          60% { filter: blur(2px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .bu-ord-base { opacity: 0; display: inline-block; }
        .bu-ord { animation: buOrd 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* ── Om meg: portrettet materialiserer seg + langsom Ken Burns-settle ── */
        @keyframes buFoto {
          from { opacity: 0; transform: translateY(16px) scale(0.94); filter: blur(18px); }
          65% { filter: blur(2px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .bu-foto { opacity: 0; animation: buFoto 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; }
        @keyframes buKenBurns {
          from { transform: scale(1.12); }
          to { transform: scale(1); }
        }
        .bu-kenburns { animation: buKenBurns 7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards; }

        /* ── Kaoset: frakoblet flyt, marsjerende streker og flimrende sync ── */
        @keyframes buKaosFlyt {
          from { transform: translateY(-4px); }
          to { transform: translateY(4px); }
        }
        .bu-kaos-flyt { animation: buKaosFlyt 6s ease-in-out infinite alternate; }
        @keyframes buStrek {
          to { stroke-dashoffset: -24; }
        }
        .bu-kaos-strek { animation: buStrek 16s linear infinite; }
        @keyframes buFlimre {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }


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
