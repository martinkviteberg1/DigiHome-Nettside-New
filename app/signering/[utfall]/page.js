'use client';

/* ═══════════════ Offentlig exit-side for BankID-signering ═══════════════
   Posten sender signataren hit etter signering (ferdig), avbrudd (avvist)
   eller teknisk feil (feil). Samme rolige DigiHome-designspråk som
   signeringssiden. Ferdig-siden pinger /api/signering-puls slik at status
   oppdateres i portalen umiddelbart. */

import { useEffect, useState, use } from 'react';

const INNHOLD = {
  ferdig: {
    ring: 'bg-emerald-50',
    farge: 'text-emerald-600',
    ikon: <path d="M20 6 9 17l-5-5" />,
    tittel: 'Dokumentet er signert',
    tekst: 'Signaturen din er registrert hos Posten signering. Avsenderen får beskjed automatisk, og det signerte dokumentet arkiveres trygt hos DigiHome. Du kan nå lukke dette vinduet.',
  },
  avvist: {
    ring: 'bg-amber-50',
    farge: 'text-amber-600',
    ikon: <path d="M18 6 6 18M6 6l12 12" />,
    tittel: 'Signeringen ble avbrutt',
    tekst: 'Du valgte å ikke signere dokumentet nå. Ingen signatur er registrert. Ombestemmer du deg, kan du bruke lenken i e-posten på nytt — den virker helt til fristen går ut.',
  },
  feil: {
    ring: 'bg-rose-50',
    farge: 'text-rose-500',
    ikon: <><path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9.2" /></>,
    tittel: 'Noe gikk galt',
    tekst: 'Signeringen kunne ikke gjennomføres akkurat nå. Prøv lenken i e-posten på nytt om noen minutter. Vedvarer problemet, ta kontakt med avsenderen hos DigiHome.',
  },
};

export default function SigneringUtfall({ params, searchParams }) {
  const p = typeof params?.then === 'function' ? use(params) : params;
  const sp = typeof searchParams?.then === 'function' ? use(searchParams) : searchParams;
  const utfall = ['ferdig', 'avvist', 'feil'].includes(p?.utfall) ? p.utfall : 'feil';
  const [grunn, setGrunn] = useState('');
  const [neste, setNeste] = useState(null); // {jobbId, sid, tittel, ferdig, antall} — batch-flyt
  const c = INNHOLD[utfall];

  useEffect(() => {
    // Posten appender status_query_token på exit-URL-en — send det til API-et,
    // som henter FULL jobbstatus direkte (alle signatarer) uavhengig av
    // polling-køens tidsvinduer. Robust uthenting via regex (tåler uvanlig
    // parameterrekkefølge/dobbel «?»), keepalive slik at kallet overlever at
    // brukeren klikker «Neste dokument» umiddelbart, og ett gjenforsøk ved
    // nettverksfeil. Puls-pinget beholdes som fallback.
    try {
      const href = String(window.location.href || '');
      const tokM = href.match(/[?&]status_query_token=([^&#]+)/);
      const jobM = href.match(/[?&]jobb=([0-9a-fA-F-]{36})/);
      const token = tokM ? decodeURIComponent(tokM[1]) : null;
      const jobb = jobM ? jobM[1] : null;
      if (token) {
        const sendToken = () => fetch('/api/signering-status-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, jobb }),
          keepalive: true,
        });
        sendToken().catch(() => { setTimeout(() => { sendToken().catch(() => {}); }, 1800); });
      }
    } catch (e) { /* stille */ }
    // Fremskynd statushenting — både signert og avvist gir en statushendelse
    // hos Posten. Endepunktet planlegger poll presist når Postens vindu åpner.
    fetch('/api/signering-puls', { method: 'POST' }).catch(() => {});
    try {
      const g = sp?.grunn || new URLSearchParams(window.location.search).get('grunn');
      if (g) setGrunn(String(g).slice(0, 160));
    } catch (e) { /* stille */ }
    // Batch-flyt: signeringssiden lagret {jobbId, sid} før BankID. Hvis flere
    // dokumenter i samme bunt venter på signataren, tilbys «Neste dokument →».
    if (utfall === 'ferdig') {
      (async () => {
        try {
          const raa = window.localStorage.getItem('dh_sign_siste');
          if (!raa) return;
          const siste = JSON.parse(raa);
          if (!siste || !siste.jobbId || !siste.sid || (Date.now() - (siste.at || 0)) > 2 * 3600000) return;
          const r = await fetch(`/api/signer-info/${siste.jobbId}/${siste.sid}`);
          const j = await r.json();
          if (j.ok && j.batch && j.batch.neste) {
            setNeste({ ...j.batch.neste, ferdig: j.batch.ferdig, antall: j.batch.antall });
          }
        } catch (e) { /* stille */ }
      })();
    }
  }, [utfall]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="flex min-h-dvh flex-col bg-[#f5f4f1] font-body">
      {/* Toppbar — samme som signeringssiden */}
      <header className="border-b border-black/[0.05]">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[16px] w-auto" />
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#a8a29a]">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            Sikker signering
          </p>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] rounded-2xl border border-black/[0.07] bg-white p-9 text-center shadow-[0_1px_2px_rgba(28,25,23,0.04),0_18px_50px_-26px_rgba(28,25,23,0.22)]">
          <div className={`mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-full ${c.ring}`}>
            <svg className={`h-[26px] w-[26px] ${c.farge}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{c.ikon}</svg>
          </div>
          <h1 className="mt-5 font-heading text-[21px] font-bold leading-snug tracking-tight text-[#0a0a0a]">{c.tittel}</h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-[#78716c]">{c.tekst}</p>
          {grunn && utfall === 'feil' && (
            <p className="mt-4 rounded-xl bg-[#faf9f7] px-4 py-2.5 text-[12px] text-[#a8a29a]">{grunn}</p>
          )}
          {neste && utfall === 'ferdig' && (
            <div className="mt-6" data-testid="exit-neste-dokument">
              <a
                href={`/signering/dokument/${neste.jobbId}/${neste.sid}`}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0a0a0a] px-6 py-[14px] text-[14px] font-semibold text-white transition-all hover:bg-black active:scale-[0.99]"
              >
                Neste dokument til signering{neste.antall ? ` (${Math.min((neste.ferdig || 0) + 1, neste.antall)} av ${neste.antall})` : ''}
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </a>
              {neste.tittel && <p className="mt-2.5 truncate text-[12px] text-[#a8a29a]">Neste: {neste.tittel}</p>}
            </div>
          )}
          <p className="mt-7 border-t border-black/[0.05] pt-4 text-[11px] text-[#c2beb8]">Elektronisk signering levert av Posten signering · BankID</p>
        </div>
      </div>
    </main>
  );
}
