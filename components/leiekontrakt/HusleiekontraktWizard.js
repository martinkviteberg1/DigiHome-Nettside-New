'use client';

/* Innloggingsløs husleiekontrakt-wizard — «verdi først».
   Bolig → Leietaker → Vilkår → Se kontrakten → Opprett konto.
   Autolagrer utkast anonymt (opak token). Ved fullføring opprettes kontoen via
   appens self-service-bro (identiteten eies der), og vi viser «Sjekk innboksen».
   Selve BankID-signeringen skjer i appen etter magic-link. */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Check, Loader2, ShieldCheck, MailCheck, Pencil, FileText } from 'lucide-react';
import { T, display, DIM, SVAK, HAIR } from '@/components/forside/v4/tokens';
import KontraktPreview from '@/components/leiekontrakt/KontraktPreview';

const INK = T.ink; const LILLA = T.lilla; const GRONN = T.gronn;
const STEG = ['Bolig', 'Leietaker', 'Vilkår', 'Se kontrakten', 'Opprett konto'];
const epostOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());

/* ── små UI-hjelpere ── */
function Etikett({ children }) { return <label className="block text-[12.5px] font-medium" style={{ color: DIM }}>{children}</label>; }

function Inn({ label, verdi, sett, type = 'text', plassholder = '', feil, bred = true, ...rest }) {
  return (
    <div className={bred ? 'sm:col-span-2' : ''}>
      {label ? <Etikett>{label}</Etikett> : null}
      <input
        type={type} value={verdi ?? ''} placeholder={plassholder}
        onChange={(e) => sett(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        className="mt-1.5 w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[14.5px] outline-none transition-shadow"
        style={{ boxShadow: `inset 0 0 0 1px ${feil ? 'rgba(224,108,94,0.8)' : HAIR}`, color: INK }}
        {...rest}
      />
      {feil ? <p className="mt-1 text-[12px]" style={{ color: '#c0503f' }}>{feil}</p> : null}
    </div>
  );
}

function Pillrad({ label, valg, verdi, sett, full = false }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      {label ? <Etikett>{label}</Etikett> : null}
      <div className="mt-1.5 flex flex-wrap gap-2">
        {valg.map(([k, l]) => (
          <button key={k} type="button" onClick={() => sett(k)} className="rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors"
            style={verdi === k ? { background: INK, color: T.offwhite } : { color: DIM, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function Bryter({ label, verdi, sett, av = 'Nei', pa = 'Ja', full = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-[10px] px-3.5 py-2.5 ${full ? 'sm:col-span-2' : ''}`} style={{ boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
      <span className="text-[14px]" style={{ color: INK }}>{label}</span>
      <div className="flex gap-1 rounded-full p-1" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
        {[[false, av], [true, pa]].map(([val, l]) => (
          <button key={l} type="button" onClick={() => sett(val)} className="rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors"
            style={verdi === val ? { background: INK, color: T.offwhite } : { color: SVAK }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

export default function HusleiekontraktWizard() {
  const [steg, setSteg] = useState(0);
  const [token, setToken] = useState('');
  const [bolig, setBolig] = useState({ adresse: '', postnr: '', poststed: '', type: 'leilighet', sqm: '', soverom: '', mobilering: 'umoblert', royk: false, dyr: false });
  const [leietaker, setLeietaker] = useState({ kind: 'privat', navn: '', epost: '', telefon: '', org_no: '', firma: '' });
  const [vilkaar, setVilkaar] = useState({ kontraktstype: 'tidsubestemt', start: '', slutt: '', oppsigelse: '3', leie: '', forfallsdag: 1, utgifterInkludert: false, depositumType: 'konto', depositumMnd: 3, saerlige: '' });
  const [owner, setOwner] = useState({ kind: 'privat', navn: '', epost: '', telefon: '', org_no: '', firma: '' });
  const [samtykke, setSamtykke] = useState(false);
  const [feil, setFeil] = useState({});
  const [sender, setSender] = useState(false);
  const [ferdig, setFerdig] = useState(null);
  const hydrert = useRef(false);
  const rort = useRef(false);

  const u = { bolig, leietaker, vilkaar, owner };

  /* Gjenoppta utkast fra forrige besøk */
  useEffect(() => {
    const t = typeof window !== 'undefined' ? window.localStorage.getItem('dh_lk_token') : '';
    if (!t) { hydrert.current = true; return; }
    (async () => {
      try {
        const d = await fetch(`/api/leiekontrakt/utkast?token=${encodeURIComponent(t)}`, { cache: 'no-store' }).then((r) => r.json());
        if (d && d.ok && d.status !== 'sendt' && d.utkast) {
          if (d.utkast.bolig) setBolig((p) => ({ ...p, ...d.utkast.bolig }));
          if (d.utkast.leietaker) setLeietaker((p) => ({ ...p, ...d.utkast.leietaker }));
          if (d.utkast.vilkaar) setVilkaar((p) => ({ ...p, ...d.utkast.vilkaar }));
          if (d.utkast.owner) setOwner((p) => ({ ...p, ...d.utkast.owner }));
          setToken(t);
        } else if (d && d.status === 'sendt') {
          window.localStorage.removeItem('dh_lk_token');
        }
      } catch (e) { /* ignorer */ }
      hydrert.current = true;
    })();
  }, []);

  /* Autolagring (debounce) — kun etter at bruker har rørt noe */
  useEffect(() => {
    if (!hydrert.current || !rort.current) return undefined;
    const h = setTimeout(async () => {
      try {
        const d = await fetch('/api/leiekontrakt/utkast', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, bolig, leietaker, vilkaar }),
        }).then((r) => r.json());
        if (d && d.ok && d.token) { setToken(d.token); try { window.localStorage.setItem('dh_lk_token', d.token); } catch (e) {} }
      } catch (e) { /* ignorer */ }
    }, 900);
    return () => clearTimeout(h);
  }, [bolig, leietaker, vilkaar, token]);

  const oppd = (setter) => (felt, val) => { rort.current = true; setter((p) => ({ ...p, [felt]: val })); };
  const sB = oppd(setBolig); const sL = oppd(setLeietaker); const sV = oppd(setVilkaar); const sO = oppd(setOwner);

  const gaaNeste = () => setSteg((s) => Math.min(STEG.length - 1, s + 1));
  const gaaForrige = () => setSteg((s) => Math.max(0, s - 1));

  const fullfor = useCallback(async () => {
    const f = {};
    if (!String(owner.navn || '').trim()) f.owner_navn = 'Skriv inn navnet ditt.';
    if (!epostOk(owner.epost)) f.owner_epost = 'Skriv inn en gyldig e-postadresse.';
    if (owner.kind === 'bedrift' && String(owner.org_no || '').replace(/\D/g, '').length !== 9) f.owner_org = 'Oppgi et gyldig org.nr (9 siffer).';
    if (!samtykke) f.samtykke = 'Du må godta avtalen for å fortsette.';
    setFeil(f);
    if (Object.keys(f).length) return;
    setSender(true);
    try {
      // Sørg for at utkastet er lagret før vi provisjonerer.
      let t = token;
      if (!t) {
        const s = await fetch('/api/leiekontrakt/utkast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bolig, leietaker, vilkaar }) }).then((r) => r.json());
        if (s && s.ok && s.token) { t = s.token; setToken(t); try { window.localStorage.setItem('dh_lk_token', t); } catch (e) {} }
      }
      const d = await fetch('/api/leiekontrakt/opprett', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t, owner }) }).then((r) => r.json());
      if (d && d.ok) {
        try { window.localStorage.removeItem('dh_lk_token'); } catch (e) {}
        if (d.onboarding_url) { window.location.href = d.onboarding_url; return; }
        setFerdig({ email_masked: d.email_masked, leadId: d.leadId, requires_verification: d.requires_verification, pending: d.pending });
      } else {
        setFeil(d && d.feil ? d.feil : { global: (d && d.error) || 'Noe gikk galt. Prøv igjen.' });
      }
    } catch (e) {
      setFeil({ global: 'Vi fikk ikke sendt akkurat nå. Prøv igjen om litt.' });
    }
    setSender(false);
  }, [owner, samtykke, token, bolig, leietaker, vilkaar]);

  /* ── Ferdig: Sjekk innboksen ── */
  if (ferdig) return <SjekkInnboksen ferdig={ferdig} setFerdig={setFerdig} epost={owner.epost} />;

  return (
    <main className="min-h-screen" style={{ background: T.canvas, color: INK }}>
      {/* Slim toppbar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-5 py-3.5 sm:px-8" style={{ background: 'rgba(243,241,236,0.82)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${HAIR}` }}>
        <Link href="/" className="flex items-center" aria-label="DigiHome">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-hero-logo.svg" alt="DigiHome" className="h-[21px] w-auto" />
        </Link>
        <span className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium" style={{ color: DIM, boxShadow: `inset 0 0 0 1px ${HAIR}` }}><ShieldCheck className="h-3.5 w-3.5" style={{ color: GRONN }} /> Gratis · Husleieloven · BankID</span>
      </div>

      {/* Stegindikator */}
      <div className="mx-auto max-w-6xl px-5 pt-7 sm:px-8">
        <div className="flex items-center gap-2">
          {STEG.map((s, i) => (
            <React.Fragment key={s}>
              <button type="button" onClick={() => i < steg && setSteg(i)} className="flex items-center gap-2" style={{ cursor: i < steg ? 'pointer' : 'default' }}>
                <span className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold tabular-nums" style={i < steg ? { background: GRONN, color: '#fff' } : i === steg ? { background: INK, color: '#fff' } : { color: SVAK, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
                  {i < steg ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="hidden text-[12.5px] font-medium sm:inline" style={{ color: i === steg ? INK : SVAK }}>{s}</span>
              </button>
              {i < STEG.length - 1 ? <span className="h-px flex-1" style={{ background: HAIR }} /> : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Innhold */}
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className={`grid gap-10 ${steg === 3 ? '' : 'lg:grid-cols-[1.05fr_0.95fr]'}`}>
          {/* Skjema / preview */}
          <div>
            {steg === 0 ? (
              <Seksjon tittel="Om boligen" undertittel="Adressen og det viktigste om leieobjektet.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Inn label="Adresse" verdi={bolig.adresse} sett={(v) => sB('adresse', v)} plassholder="Nygårdsgaten 5" />
                  <Inn label="Postnummer" verdi={bolig.postnr} sett={(v) => sB('postnr', String(v).replace(/\D/g, '').slice(0, 4))} plassholder="5015" bred={false} inputMode="numeric" />
                  <Inn label="Poststed" verdi={bolig.poststed} sett={(v) => sB('poststed', v)} plassholder="Bergen" bred={false} />
                  <Pillrad label="Boligtype" full valg={[['leilighet', 'Leilighet'], ['enebolig', 'Enebolig'], ['rekkehus', 'Rekkehus'], ['tomannsbolig', 'Tomannsbolig'], ['hybel', 'Hybel'], ['annet', 'Annet']]} verdi={bolig.type} sett={(v) => sB('type', v)} />
                  <Inn label="Størrelse (m²)" type="number" verdi={bolig.sqm} sett={(v) => sB('sqm', v)} plassholder="62" bred={false} inputMode="numeric" />
                  <Inn label="Antall soverom" type="number" verdi={bolig.soverom} sett={(v) => sB('soverom', v)} plassholder="2" bred={false} inputMode="numeric" />
                  <Pillrad label="Møblering" full valg={[['umoblert', 'Umøblert'], ['delvis', 'Delvis'], ['moblert', 'Møblert']]} verdi={bolig.mobilering} sett={(v) => sB('mobilering', v)} />
                  <Bryter label="Røyking tillatt" verdi={bolig.royk} sett={(v) => sB('royk', v)} />
                  <Bryter label="Dyrehold tillatt" verdi={bolig.dyr} sett={(v) => sB('dyr', v)} />
                </div>
              </Seksjon>
            ) : null}

            {steg === 1 ? (
              <Seksjon tittel="Leietaker" undertittel="Hvem skal leie boligen? Leietaker signerer med egen BankID – uten å laste ned noe.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Pillrad label="Type leietaker" full valg={[['privat', 'Privatperson'], ['bedrift', 'Bedrift']]} verdi={leietaker.kind} sett={(v) => sL('kind', v)} />
                  <Inn label="Fullt navn" verdi={leietaker.navn} sett={(v) => sL('navn', v)} plassholder="Emma Lie" />
                  <Inn label="E-post" type="email" verdi={leietaker.epost} sett={(v) => sL('epost', v)} plassholder="emma@epost.no" bred={false} />
                  <Inn label="Telefon" verdi={leietaker.telefon} sett={(v) => sL('telefon', v)} plassholder="400 00 000" bred={false} inputMode="tel" />
                  {leietaker.kind === 'bedrift' ? (
                    <>
                      <Inn label="Firmanavn" verdi={leietaker.firma} sett={(v) => sL('firma', v)} plassholder="Bedrift AS" bred={false} />
                      <Inn label="Organisasjonsnummer" verdi={leietaker.org_no} sett={(v) => sL('org_no', v)} plassholder="9 siffer" bred={false} inputMode="numeric" />
                    </>
                  ) : null}
                </div>
              </Seksjon>
            ) : null}

            {steg === 2 ? (
              <Seksjon tittel="Vilkår" undertittel="Varighet, husleie og depositum.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Pillrad label="Leieforholdets form" full valg={[['tidsubestemt', 'Tidsubestemt (løpende)'], ['tidsbestemt', 'Tidsbestemt']]} verdi={vilkaar.kontraktstype} sett={(v) => sV('kontraktstype', v)} />
                  <Inn label="Overtakelse" type="date" verdi={vilkaar.start} sett={(v) => sV('start', v)} bred={vilkaar.kontraktstype !== 'tidsbestemt'} />
                  {vilkaar.kontraktstype === 'tidsbestemt' ? <Inn label="Sluttdato" type="date" verdi={vilkaar.slutt} sett={(v) => sV('slutt', v)} bred={false} /> : null}
                  <Pillrad label="Oppsigelsestid" full valg={[['1', '1 måned'], ['2', '2 måneder'], ['3', '3 måneder']]} verdi={vilkaar.oppsigelse} sett={(v) => sV('oppsigelse', v)} />
                  <Inn label="Månedsleie (kr)" type="number" verdi={vilkaar.leie} sett={(v) => sV('leie', v)} plassholder="14500" bred={false} inputMode="numeric" />
                  <Inn label="Forfallsdag i måneden" type="number" verdi={vilkaar.forfallsdag} sett={(v) => sV('forfallsdag', Math.min(28, Math.max(1, Number(v) || 1)))} bred={false} inputMode="numeric" />
                  <Bryter label="Strøm og faste utgifter inkludert" full verdi={vilkaar.utgifterInkludert} sett={(v) => sV('utgifterInkludert', v)} />
                  <Pillrad label="Depositum" full valg={[['konto', 'Depositumskonto'], ['garanti', 'Garanti'], ['ingen', 'Uten depositum']]} verdi={vilkaar.depositumType} sett={(v) => sV('depositumType', v)} />
                  {vilkaar.depositumType !== 'ingen' ? (
                    <Pillrad label="Antall måneders depositum" full valg={[['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]} verdi={String(vilkaar.depositumMnd)} sett={(v) => sV('depositumMnd', Number(v))} />
                  ) : null}
                  <div className="sm:col-span-2">
                    <Etikett>Særlige bestemmelser (valgfritt)</Etikett>
                    <textarea value={vilkaar.saerlige} onChange={(e) => sV('saerlige', e.target.value)} rows={3} placeholder="F.eks. dugnad, parkering, fremleie …" className="mt-1.5 w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[14px] outline-none" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}`, color: INK }} />
                  </div>
                </div>
              </Seksjon>
            ) : null}

            {steg === 3 ? (
              <div>
                <Seksjon tittel="Se kontrakten" undertittel="Slik ser husleiekontrakten din ut. Alt kan endres – gå tilbake om noe skal justeres." />
                <div className="mx-auto mt-2 max-w-xl"><KontraktPreview u={u} /></div>
              </div>
            ) : null}

            {steg === 4 ? (
              <Seksjon tittel="Opprett konto og signer" undertittel="Siste steg. Vi oppretter kontoen din, sender en lenke til e-posten, og der signerer du med BankID.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Pillrad label="Du leier ut som" full valg={[['privat', 'Privatperson'], ['bedrift', 'Eiendomsselskap']]} verdi={owner.kind} sett={(v) => sO('kind', v)} />
                  <Inn label="Fullt navn" verdi={owner.navn} sett={(v) => sO('navn', v)} plassholder="Ditt navn" feil={feil.owner_navn} />
                  <Inn label="E-post" type="email" verdi={owner.epost} sett={(v) => sO('epost', v)} plassholder="deg@epost.no" bred={false} feil={feil.owner_epost} />
                  <Inn label="Telefon" verdi={owner.telefon} sett={(v) => sO('telefon', v)} plassholder="400 00 000" bred={false} inputMode="tel" />
                  {owner.kind === 'bedrift' ? (
                    <>
                      <Inn label="Firmanavn" verdi={owner.firma} sett={(v) => sO('firma', v)} plassholder="Ditt selskap AS" bred={false} />
                      <Inn label="Organisasjonsnummer" verdi={owner.org_no} sett={(v) => sO('org_no', v)} plassholder="9 siffer" bred={false} inputMode="numeric" feil={feil.owner_org} />
                    </>
                  ) : null}
                </div>
                <label className="mt-5 flex cursor-pointer items-start gap-2.5">
                  <input type="checkbox" checked={samtykke} onChange={(e) => setSamtykke(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: LILLA }} />
                  <span className="text-[13px] leading-relaxed" style={{ color: DIM }}>Jeg godtar <Link href="/vilkar" className="underline" style={{ color: INK }}>brukervilkårene</Link> og <Link href="/personvern" className="underline" style={{ color: INK }}>personvernerklæringen</Link>. Kontrakten er gratis å lage og signere.</span>
                </label>
                {feil.samtykke ? <p className="mt-1 text-[12px]" style={{ color: '#c0503f' }}>{feil.samtykke}</p> : null}
                {feil.global ? <p className="mt-3 text-[13px]" style={{ color: '#c0503f' }}>{feil.global}</p> : null}
              </Seksjon>
            ) : null}
          </div>

          {/* Sticky preview (skjult på mobil og på steg 3) */}
          {steg !== 3 ? (
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <p className="mb-3 flex items-center gap-1.5 text-[12px] font-medium" style={{ color: SVAK }}><FileText className="h-3.5 w-3.5" /> Forhåndsvisning</p>
                <KontraktPreview u={u} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Sticky bunn-CTA */}
      <div className="sticky bottom-0 z-30 mt-6 px-5 py-3.5 sm:px-8" style={{ background: 'rgba(243,241,236,0.92)', backdropFilter: 'blur(10px)', borderTop: `1px solid ${HAIR}` }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button type="button" onClick={gaaForrige} disabled={steg === 0} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-medium transition-opacity disabled:opacity-0" style={{ color: DIM, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
            <ArrowLeft className="h-4 w-4" /> Tilbake
          </button>
          {steg < 4 ? (
            <button type="button" onClick={gaaNeste} className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[14.5px] font-semibold transition-transform hover:-translate-y-0.5" style={{ background: INK, color: T.offwhite }}>
              {steg === 3 ? 'Opprett konto og signer' : 'Neste'} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={fullfor} disabled={sender} className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[14.5px] font-semibold disabled:opacity-60" style={{ background: INK, color: T.offwhite }}>
              {sender ? <><Loader2 className="h-4 w-4 animate-spin" /> Oppretter …</> : <>Opprett konto og gå til signering <ArrowRight className="h-4 w-4" /></>}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Seksjon({ tittel, undertittel, children }) {
  return (
    <div>
      <h1 className="text-[26px] sm:text-[32px]" style={{ ...display }}>{tittel}</h1>
      {undertittel ? <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: DIM, maxWidth: '52ch' }}>{undertittel}</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}

/* ── Sjekk innboksen (etter provisjonering) ── */
function SjekkInnboksen({ ferdig, setFerdig, epost }) {
  const [sekunder, setSekunder] = useState(30);
  const [sender, setSender] = useState(false);
  const [melding, setMelding] = useState('');
  const [maskert, setMaskert] = useState(ferdig.email_masked || '');
  const [endrer, setEndrer] = useState(false);
  const [nyEpost, setNyEpost] = useState('');

  useEffect(() => { if (sekunder <= 0) return undefined; const t = setTimeout(() => setSekunder((s) => s - 1), 1000); return () => clearTimeout(t); }, [sekunder]);

  const sendPaaNytt = async () => {
    if (sekunder > 0 || sender) return;
    setSender(true); setMelding('');
    try {
      const d = await fetch('/api/self-service/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: ferdig.leadId }) }).then((r) => r.json());
      if (d && d.ok) { setMelding('Lenken er sendt på nytt.'); setSekunder(30); if (d.email_masked) setMaskert(d.email_masked); }
      else setMelding((d && d.error) || 'Kunne ikke sende på nytt akkurat nå.');
    } catch (e) { setMelding('Kunne ikke sende på nytt akkurat nå.'); }
    setSender(false);
  };

  const endreEpost = async () => {
    if (!epostOk(nyEpost) || sender) return;
    setSender(true); setMelding('');
    try {
      const d = await fetch('/api/self-service/change-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: ferdig.leadId, email: nyEpost }) }).then((r) => r.json());
      if (d && d.ok) { setMelding('Vi sendte lenken til den nye adressen.'); setMaskert(d.email_masked || nyEpost); setEndrer(false); setSekunder(30); }
      else setMelding((d && d.error) || 'Kunne ikke endre e-posten akkurat nå.');
    } catch (e) { setMelding('Kunne ikke endre e-posten akkurat nå.'); }
    setSender(false);
  };

  const visEpost = maskert || epost || 'e-posten din';

  return (
    <main className="grid min-h-screen place-items-center px-5" style={{ background: T.canvas, color: INK }}>
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full" style={{ background: 'rgba(31,157,85,0.12)' }}><MailCheck className="h-7 w-7" style={{ color: GRONN }} strokeWidth={1.8} /></span>
        <h1 className="mt-6 text-[30px]" style={{ ...display }}>Sjekk innboksen</h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: DIM }}>
          {ferdig.pending
            ? <>Vi har mottatt kontrakten din og tar kontakt på <span style={{ color: INK, fontWeight: 600 }}>{visEpost}</span> for å fullføre signeringen.</>
            : <>Vi sendte en lenke til <span style={{ color: INK, fontWeight: 600 }}>{visEpost}</span>. Åpne den for å bekrefte kontoen og signere kontrakten med BankID.</>}
        </p>

        {!ferdig.pending ? (
          <div className="mt-7 space-y-3">
            <button type="button" onClick={sendPaaNytt} disabled={sekunder > 0 || sender} className="w-full rounded-full px-5 py-3 text-[14px] font-semibold disabled:opacity-50" style={{ background: INK, color: T.offwhite }}>
              {sender ? 'Sender …' : sekunder > 0 ? `Send på nytt om ${sekunder}s` : 'Send lenken på nytt'}
            </button>
            {!endrer ? (
              <button type="button" onClick={() => setEndrer(true)} className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: DIM }}><Pencil className="h-3.5 w-3.5" /> Feil e-post? Endre den</button>
            ) : (
              <div className="flex gap-2">
                <input type="email" value={nyEpost} onChange={(e) => setNyEpost(e.target.value)} placeholder="ny@epost.no" className="flex-1 rounded-full bg-white px-4 py-2.5 text-[14px] outline-none" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}` }} />
                <button type="button" onClick={endreEpost} disabled={!epostOk(nyEpost) || sender} className="rounded-full px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50" style={{ background: INK, color: T.offwhite }}>Send</button>
              </div>
            )}
          </div>
        ) : null}

        {melding ? <p className="mt-4 text-[13px]" style={{ color: SVAK }}>{melding}</p> : null}
        <p className="mt-8 text-[12px]" style={{ color: SVAK }}>Fant du ikke e-posten? Sjekk søppelpost, eller <Link href="/kontakt" className="underline" style={{ color: DIM }}>kontakt oss</Link>.</p>
      </div>
    </main>
  );
}
