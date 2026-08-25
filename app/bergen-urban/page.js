'use client';

/* ═══════════════════ Bergen Urban — presentasjonsdeck ═══════════════════
   Kinematisk femdelt sekvens:
   0) COVER (svart): DigiHome-ikon + navn + «Utleie på autopilot.»
   1) PROMPT (svart): ChatGPT-aktig bar → prompten skrives → send →
      tenkeprikker → auto-overgang
   2) SVARET (svart): systemet materialiserer seg i ett scenelys —
      desktop-portal + iPhone (mockups fra /tour) mot svart
   3) TITTEL (lyset skrus på): «Historien om DigiHome.» — mask reveal
   4) HOOK (lys): påstand 1 → 6-åringens håndskrift (rack focus)
   Navigasjon: → / mellomrom / PageDown (klikker) = neste beat,
   ← / PageUp = forrige, F = fullskjerm, R = start forfra. */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Caveat } from 'next/font/google';
import ForvalterMockup from '@/components/tour/mockups/ForvalterMockup';
import PhoneMockup from '@/components/tour/mockups/PhoneMockup';

const caveat = Caveat({ subsets: ['latin', 'latin-ext'], weight: ['500', '600', '700'], display: 'swap' });

const PROMPT = 'Lag et AI-drevet system for utleie og boligforvaltning.';

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

// Steg: 0 = cover · 1 = bar · 2 = skriver · 3 = sendt+tenker (auto→4)
//       4 = kodestorm (auto→5) · 5 = reveal (svart) · 6 = tittel (lys)
//       7 = påstand 1 · 8 = påstand 1+2
const TOTALT = 9;

export default function BergenUrbanDeck() {
  const [steg, setSteg] = useState(0);
  const [antallTegn, setAntallTegn] = useState(0);
  const [tenker, setTenker] = useState(false);
  const [kodeAntall, setKodeAntall] = useState(0);
  const [musSynlig, setMusSynlig] = useState(true);
  const [mockSkala, setMockSkala] = useState(0.78);
  const musTimer = useRef(null);

  const neste = useCallback(() => setSteg((s) => Math.min(TOTALT - 1, s + 1)), []);
  const forrige = useCallback(() => setSteg((s) => (s === 4 || s === 5 ? 2 : Math.max(0, s - 1))), []);

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
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); setSteg(0); }
      else if (e.key === 'Home') { e.preventDefault(); setSteg(0); }
      else if (e.key === 'End') { e.preventDefault(); setSteg(TOTALT - 1); }
    };
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, [neste, forrige, fullskjerm]);

  // Skriveanimasjon — naturlig, litt ujevn rytme
  useEffect(() => {
    if (steg <= 1) { setAntallTegn(0); return undefined; }
    if (steg === 2) {
      if (antallTegn >= PROMPT.length) return undefined;
      const t = setTimeout(() => setAntallTegn((n) => n + 1), 26 + Math.random() * 62);
      return () => clearTimeout(t);
    }
    setAntallTegn(PROMPT.length);
    return undefined;
  }, [steg, antallTegn]);

  // Send → tenkeprikker → auto-overgang til kodestormen
  useEffect(() => {
    if (steg !== 3) { setTenker(false); return undefined; }
    const t1 = setTimeout(() => setTenker(true), 520);
    const t2 = setTimeout(() => setSteg(4), 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [steg]);

  // Kodestorm: linjer fyller skjermen i akselererende tempo → auto til svaret
  useEffect(() => {
    if (steg < 4) { setKodeAntall(0); return undefined; }
    if (steg !== 4) return undefined; // behold linjene under utfading
    let stoppet = false;
    let i = 0;
    const total = 240;
    const tikk = () => {
      if (stoppet) return;
      i += i > 150 ? 3 : (i > 60 ? 2 : 1);
      setKodeAntall(Math.min(i, total));
      if (i >= total) {
        setTimeout(() => { if (!stoppet) setSteg(5); }, 500);
        return;
      }
      setTimeout(tikk, Math.max(9, 36 - i * 0.12));
    };
    const start = setTimeout(tikk, 300);
    return () => { stoppet = true; clearTimeout(start); };
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

  // Mockup-skalering (portalens designbredde er 880 px, naturlig høyde ~540)
  useEffect(() => {
    const maal = () => {
      const s = Math.min((window.innerWidth * 0.56) / 880, (window.innerHeight - 270) / 540, 1);
      setMockSkala(Math.max(0.42, s));
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
  const klarTilSend = antallTegn >= PROMPT.length && steg >= 2;
  const morkAktiv = steg <= 5;
  const coverAktiv = steg === 0;
  const promptAktiv = steg >= 1 && steg <= 3;
  const kodeAktiv = steg === 4;
  const revealAktiv = steg === 5;
  const tittelAktiv = steg === 6;
  const hookAktiv = steg >= 7;
  const bygg = Math.max(0, steg - 7);

  const telefonB = Math.round(Math.min(258, Math.max(176, 258 * mockSkala * 1.12)));
  const overheng = Math.round(telefonB * 0.4);

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

      {/* ═══ AKT 3 — TITTEL (lyset skrus på) ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${lysKlasse(tittelAktiv, 'inn')}`}
        data-testid="bu-slide-tittel"
      >
        <header className="flex justify-start px-12 pt-11 md:px-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[24px] w-auto" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <h1 className="bu-drift font-heading text-[clamp(44px,7vw,110px)] font-bold leading-[1.06] tracking-[-0.04em]">
            <span className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
              <span className={`bu-linje-base block ${tittelAktiv ? 'bu-linje' : ''}`} style={{ animationDelay: '350ms' }}>Historien om</span>
            </span>
            <span className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
              <span className={`bu-linje-base block ${tittelAktiv ? 'bu-linje' : ''}`} style={{ animationDelay: '550ms' }}>DigiHome.</span>
            </span>
          </h1>
          <p className={`mt-11 text-[clamp(14px,1.2vw,17px)] text-[#86868b] opacity-0 ${tittelAktiv ? 'bu-inn' : ''}`} style={{ animationDelay: '1500ms' }}>
            Vibe coding i praksis
          </p>
        </div>

        <footer className="pb-12 text-center">
          <p className={`text-[12px] tracking-tight text-[#b0b0b5] opacity-0 ${tittelAktiv ? 'bu-inn' : ''}`} style={{ animationDelay: '2100ms' }}>
            Martin Kviteberg&ensp;·&ensp;Bergen Urban
          </p>
        </footer>
      </section>

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

        <footer className="pb-12" />
      </section>

      {/* ═══ DEN SVARTE SCENEN — cover, prompt og reveal (skrus av mot tittel) ═══ */}
      <section
        className={`absolute inset-0 z-20 bg-[#050505] transition-opacity duration-[1700ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${morkAktiv ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        data-testid="bu-svart-scene"
      >
        {/* ── AKT 0: COVER — ikon, navn, «Utleie på autopilot.» ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center px-6 transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(coverAktiv)}`}
          data-testid="bu-cover"
        >
          <div className="bu-inn overflow-hidden rounded-[24px] shadow-[0_50px_130px_-25px_rgba(155,91,214,0.55)]" style={{ animationDelay: '250ms' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digihome-mark.svg" alt="DigiHome-ikon" className="h-[96px] w-[96px] md:h-[112px] md:w-[112px]" />
          </div>
          <h1 className="bu-inn mt-10 font-heading text-[clamp(52px,8vw,116px)] font-bold leading-none tracking-[-0.04em] text-white" style={{ animationDelay: '500ms' }}>
            DigiHome
          </h1>
          <p className="bu-inn mt-5 font-heading text-[clamp(18px,2vw,27px)] font-medium tracking-[-0.022em] text-white/50" style={{ animationDelay: '800ms' }}>
            Utleie på autopilot<span className="text-[#B57BFF]">.</span>
          </p>
        </div>

        {/* ── AKT 1: PROMPTEN ── */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(promptAktiv)}`}
          data-testid="bu-prompt"
        >
          {/* Svak luminans bak baren — som ett scenelys */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(52% 42% at 50% 47%, rgba(255,255,255,0.055) 0%, transparent 100%)' }} />

          <div className={`relative flex w-[min(720px,88vw)] items-center gap-3 rounded-[28px] border border-white/[0.09] bg-[#161616] py-3 pl-4 pr-3 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] transition-transform duration-700 ${steg >= 3 ? 'scale-[0.985]' : 'scale-100'}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/40">
              <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
            <p className="min-h-[27px] flex-1 text-[16.5px] leading-[27px] text-[#ececec] md:text-[18px]" data-testid="bu-prompt-tekst">
              {steg <= 1 && <span className="text-white/30">Spør om hva som helst</span>}
              {steg >= 2 && (
                <>
                  {skrevet}
                  {steg <= 2 && <span className="bu-blink ml-[1px] inline-block h-[1.1em] w-[2px] translate-y-[0.18em] bg-white/90" />}
                </>
              )}
            </p>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${klarTilSend ? 'bg-white text-black' : 'bg-white/10 text-white/30'} ${steg >= 3 ? 'bu-puls' : ''}`}
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

        {/* ── AKT 1.5: KODESTORMEN — AI-en bygger systemet, live ── */}
        <div
          className={`absolute inset-0 transition-[opacity,filter] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${kodeAktiv ? 'opacity-100 blur-0' : 'pointer-events-none opacity-0 blur-[8px]'}`}
          data-testid="bu-kodestorm"
        >
          {/* Terminal-strøm: nye linjer nederst, eldre presses opp og fader ut */}
          <div
            className="absolute inset-0 flex flex-col justify-end overflow-hidden px-10 pb-14 pt-10 font-mono text-[12px] leading-[1.6] md:px-16 md:text-[12.5px]"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 22%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 22%, black 100%)',
            }}
          >
            {Array.from({ length: kodeAntall }, (_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="whitespace-pre">
                <span className="mr-4 inline-block w-8 text-right text-white/[0.14] tabular-nums">{i + 1}</span>
                <KodeLinje tekst={KODE[i % KODE.length]} />
              </div>
            ))}
          </div>
          {/* Statuslinje */}
          <div className="absolute bottom-5 left-10 flex items-center gap-2.5 font-mono text-[11.5px] text-white/35 md:left-16">
            <span className="bu-blink inline-block h-[13px] w-[7px] bg-white/60" />
            genererer digihome
            <span className="tabular-nums text-white/25">· {Math.max(1, Math.round(kodeAntall / 16))} moduler · {(kodeAntall * 47).toLocaleString('nb-NO')} linjer</span>
          </div>
        </div>

        {/* ── AKT 2: SVARET — systemet i ett scenelys, mot svart ── */}
        <div
          className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${gruppeKlasse(revealAktiv)}`}
          data-testid="bu-reveal"
        >
          {/* Scenelys bak produktet — hvit kjerne med et hint av lavendel */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(64% 56% at 50% 56%, rgba(255,255,255,0.13) 0%, transparent 100%)' }} />
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(80% 64% at 50% 60%, rgba(207,151,252,0.06) 0%, transparent 100%)' }} />

          {/* Prompten blir stående — spørsmålet over svaret */}
          <p
            className={`mt-[7.5vh] px-8 text-center text-[clamp(13px,1.2vw,16px)] text-white/40 transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${revealAktiv ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-4 opacity-0 blur-[6px]'}`}
            style={{ transitionDelay: revealAktiv ? '250ms' : '0ms' }}
          >
            «{PROMPT}»
          </p>

          {/* Produktkomposisjonen — portal + telefon, iscenesatt inntreden */}
          <div className="flex flex-1 items-center justify-center px-6 pb-10">
            <div className="relative" style={{ width: Math.round(880 * mockSkala) + overheng, height: Math.round(540 * mockSkala) }}>
              <div
                className={`absolute left-0 top-0 transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${revealAktiv ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-14 opacity-0 blur-[14px]'}`}
                style={{ transitionDelay: revealAktiv ? '500ms' : '0ms' }}
              >
                <div className="bu-flyt">
                  <div
                    className="origin-top-left rounded-[20px]"
                    style={{ width: 880, transform: `scale(${mockSkala})`, boxShadow: '0 0 0 1px rgba(255,255,255,0.11), 0 90px 180px -40px rgba(0,0,0,0.95), 0 30px 70px -30px rgba(0,0,0,0.85)' }}
                  >
                    <ForvalterMockup />
                  </div>
                </div>
              </div>
              <div
                className={`absolute bottom-[-16px] z-10 transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${revealAktiv ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-20 opacity-0 blur-[14px]'}`}
                style={{ right: 0, width: telefonB, transitionDelay: revealAktiv ? '950ms' : '0ms' }}
              >
                <div className="bu-flyt-tlf rounded-[46px]" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 60px 140px -30px rgba(0,0,0,0.9)' }}>
                  <PhoneMockup />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
        @keyframes buFlyt {
          from { transform: translateY(0); }
          to { transform: translateY(-7px); }
        }
        .bu-flyt { animation: buFlyt 7.5s ease-in-out infinite alternate; }
        .bu-flyt-tlf { animation: buFlyt 6.5s ease-in-out 0.8s infinite alternate; }
      `}</style>
    </main>
  );
}
