'use client';

/* ═══════════════════ Bergen Urban — presentasjonsdeck ═══════════════════
   Kinematisk sekvens:
   -1) SORT: helt sort — første klikk starter showet
   0) COVER (svart): DigiHome-ikon + navn + «Utleie på autopilot.»
   1) HISTORIEN (svart): «Historien om DigiHome.» — oppspill til origin
   2) PROMPT (svart): ChatGPT-aktig bar → prompten skrives → send →
      tenkeprikker → auto-overgang
   3) AGENTEN (svart): AI-agenten bygger systemet → deploy → lys-tenning
   4) SVARET (lys): forvalterportalen materialiserer seg + AI-chat
   5) HOOK (lys): påstand 1 → 6-åringens håndskrift (rack focus)
   Navigasjon: → / mellomrom / PageDown (klikker) = neste beat,
   ← / PageUp = forrige, F = fullskjerm, R = start forfra. */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Caveat } from 'next/font/google';
import { Bot, Check, Rocket } from 'lucide-react';
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

// Steg: -1 = helt sort (klikk starter showet) · 0 = cover ·
//       1 = «Historien om DigiHome.» (mørk) · 2 = bar · 3 = skriver ·
//       4 = sendt+tenker (auto→5) · 5 = agenten bygger (auto→6) ·
//       6 = reveal · 7 = påstand 1 · 8 = påstand 1+2
const TOTALT = 9;

export default function BergenUrbanDeck() {
  const [steg, setSteg] = useState(-1);
  const [antallTegn, setAntallTegn] = useState(0);
  const [tenker, setTenker] = useState(false);
  const [kodeAntall, setKodeAntall] = useState(0);
  const [deploy, setDeploy] = useState(false);      // agenten «deployer» før overgangen
  const [tenning, setTenning] = useState('av');     // 'av' | 'inn' | 'ut' — lysbloom-overgangen
  const [musSynlig, setMusSynlig] = useState(true);
  const [mockSkala, setMockSkala] = useState(0.78);
  const musTimer = useRef(null);

  const neste = useCallback(() => setSteg((s) => Math.min(TOTALT - 1, s + 1)), []);
  const forrige = useCallback(() => setSteg((s) => (s === 5 || s === 6 ? 3 : Math.max(0, s - 1))), []);

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
    };
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, [neste, forrige, fullskjerm]);

  // Skriveanimasjon — naturlig, litt ujevn rytme
  useEffect(() => {
    if (steg <= 2) { setAntallTegn(0); return undefined; }
    if (steg === 3) {
      if (antallTegn >= PROMPT.length) return undefined;
      const t = setTimeout(() => setAntallTegn((n) => n + 1), 26 + Math.random() * 62);
      return () => clearTimeout(t);
    }
    setAntallTegn(PROMPT.length);
    return undefined;
  }, [steg, antallTegn]);

  // Send → tenkeprikker → auto-overgang til agent-scenen
  useEffect(() => {
    if (steg !== 4) { setTenker(false); return undefined; }
    const t1 = setTimeout(() => setTenker(true), 520);
    const t2 = setTimeout(() => setSteg(5), 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [steg]);

  // Kodestrøm: agenten «bygger» → deploy-beat → lys-tenning → reveal
  useEffect(() => {
    if (steg < 5) { setKodeAntall(0); setDeploy(false); setTenning('av'); return undefined; }
    if (steg !== 5) return undefined; // behold linjene under utfading
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
        setTimeout(() => { if (!stoppet) setSteg(6); }, 3250);
        return;
      }
      setTimeout(tikk, Math.max(9, 36 - i * 0.12));
    };
    const start = setTimeout(tikk, 300);
    return () => { stoppet = true; clearTimeout(start); };
  }, [steg]);

  // Lyset trekker seg tilbake idet portalen står ferdig
  useEffect(() => {
    if (steg !== 6) return undefined;
    const t1 = setTimeout(() => setTenning((v) => (v === 'inn' ? 'ut' : v)), 300);
    const t2 = setTimeout(() => setTenning('av'), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
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
    const x = e.clientX / window.innerWidth;
    if (x < 0.3) forrige(); else neste();
  };

  const skrevet = PROMPT.slice(0, antallTegn);
  const klarTilSend = antallTegn >= PROMPT.length && steg >= 3;
  const morkAktiv = steg <= 5; // reveal (steg 6) er lys fullskjerm
  const coverAktiv = steg === 0;
  const historieAktiv = steg === 1;
  const promptAktiv = steg >= 2 && steg <= 4;
  const kodeAktiv = steg === 5;
  const revealAktiv = steg === 6;
  const hookAktiv = steg >= 7;
  const bygg = Math.max(0, steg - 7);

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

          {/* Ikonet — bloom, spekulært lysdrag og glassrefleksjon */}
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
                className="mt-[6px] block h-[112px] w-[112px] -scale-y-100 rounded-[26px] opacity-[0.15] blur-[2px] md:h-[128px] md:w-[128px]"
                style={{
                  maskImage: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 52%)',
                  WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 52%)',
                }}
              />
            </div>
          </div>

          {/* Navnet — mask reveal + lys-sweep */}
          <h1 className="-mt-16 font-heading text-[clamp(56px,8.5vw,124px)] font-bold leading-none tracking-[-0.04em] md:-mt-[72px]">
            <span className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
              <span className="bu-tittelinn block">DigiHome</span>
            </span>
          </h1>

          {/* Setningen — eget beat, større */}
          <p className="bu-inn mt-6 font-heading text-[clamp(19px,2.1vw,27px)] font-medium tracking-[-0.022em] text-white/[0.65]" style={{ animationDelay: '3050ms' }}>
            Utleie på autopilot<span className="text-[#B57BFF]">.</span>
          </p>

          {/* Hvisket forankring */}
          <p className="bu-inn absolute bottom-10 text-[11.5px] tracking-[0.22em] text-white/[0.22]" style={{ animationDelay: '3700ms' }}>
            BERGEN URBAN — 2026
          </p>
        </div>
        )}

        {/* ── AKT 0.5: HISTORIEN — mørkt oppspill til origin-historien ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center px-8 text-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(historieAktiv)}`}
          data-testid="bu-historie"
        >
          {/* Ett dempet scenelys bak teksten */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(46% 38% at 50% 46%, rgba(124,58,237,0.13) 0%, transparent 100%)' }} />
          <h2 className="relative font-heading text-[clamp(42px,6.4vw,98px)] font-bold leading-[1.06] tracking-[-0.04em] text-white">
            <span className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
              <span className={`bu-linje-base block ${historieAktiv ? 'bu-linje' : ''}`} style={{ animationDelay: '150ms' }}>Historien om</span>
            </span>
            <span className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
              <span className={`bu-linje-base block ${historieAktiv ? 'bu-linje' : ''}`} style={{ animationDelay: '350ms' }}>DigiHome.</span>
            </span>
          </h2>
          <p className={`relative mt-9 text-[clamp(14px,1.2vw,17px)] text-white/[0.38] opacity-0 ${historieAktiv ? 'bu-inn' : ''}`} style={{ animationDelay: '1250ms' }}>
            Vibe coding i praksis
          </p>
        </div>

        {/* ── AKT 1: PROMPTEN ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(promptAktiv)}`}
          data-testid="bu-prompt"
        >
          {/* Svak luminans bak baren — som ett scenelys */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(52% 42% at 50% 47%, rgba(255,255,255,0.055) 0%, transparent 100%)' }} />

          <div className={`relative flex w-[min(720px,88vw)] items-center gap-3 rounded-[28px] border border-white/[0.09] bg-[#161616] py-3 pl-4 pr-3 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] transition-transform duration-700 ${steg >= 4 ? 'scale-[0.985]' : 'scale-100'}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/40">
              <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
            <p className="min-h-[27px] flex-1 text-[16.5px] leading-[27px] text-[#ececec] md:text-[18px]" data-testid="bu-prompt-tekst">
              {steg <= 2 && <span className="text-white/30">Spør om hva som helst</span>}
              {steg >= 3 && (
                <>
                  {skrevet}
                  {steg <= 3 && <span className="bu-blink ml-[1px] inline-block h-[1.1em] w-[2px] translate-y-[0.18em] bg-white/90" />}
                </>
              )}
            </p>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${klarTilSend ? 'bg-white text-black' : 'bg-white/10 text-white/30'} ${steg >= 4 ? 'bu-puls' : ''}`}
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
          <ForvalterFullskjerm vis={revealAktiv} />
        </div>

        {/* AI-driftsassistenten — glir inn som siste lag og «svarer» live */}
        <div
          className={`absolute bottom-[4vh] right-[2vw] z-10 transition-[opacity,transform,filter] duration-[1300ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${revealAktiv ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-14 opacity-0 blur-[10px]'}`}
          style={{ width: 'clamp(300px, 20vw, 380px)', transitionDelay: revealAktiv ? '1550ms' : '0ms' }}
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
        @media (prefers-reduced-motion: reduce) {
          .bu-tenning, .bu-tenning2, .bu-flare, .bu-aurora1, .bu-aurora2, .bu-flyt, .bu-flyt-tlf, .bu-drift, .bu-spek { animation: none !important; }
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
