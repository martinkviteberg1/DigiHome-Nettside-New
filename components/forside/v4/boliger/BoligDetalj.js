'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatNoDate } from '@/lib/listings';
import { EASE, T, display } from '../motion';
import { Siffer } from './LedigeGrid';

/* ---------------------------------------------------------------------------
   BoligDetalj — én bolig, i sidens eget språk.

   Fotografiene først, store og rolige (ett hovedbilde, en stripe under). Så
   adressen i display, stedet, én linje fakta — og prisen. Ingen merkelapper i
   bokser; det som er viktig står som tekst på hårlinjer: areal, soverom, type,
   utleieenhet, ledig fra. Beskrivelsen er redaksjonell prosa. Til høyre (sticky)
   det ene du gjør: melde interesse — navn, e-post, telefon, en linje. Kommer du
   fra nyhetsbrevet, kjenner vi deg alt: ett trykk.

   Veiene videre, i bevisst rekkefølge: (1) meld interesse — vårt eget lead,
   koblet til boligen; (2) annonsen på FINN — bare når lenken er verifisert.
   Full gateadresse vises (som i alle utleieannonser) — aldri eier, aldri
   leietaker, aldri kontraktsleie på en utleid bolig.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.12)';
const DIM = 'rgba(21,19,15,0.6)';
const SVAK = 'rgba(21,19,15,0.45)';
const FELT = { borderBottom: '1px solid rgba(21,19,15,0.3)', color: T.ink };
const feltKlasse = 'h-11 w-full bg-transparent text-[16px] outline-none placeholder:text-[#15130F]/35 focus:border-b-[#15130F]';

function Galleri({ bilder = [], tittel }) {
  const [i, setI] = useState(0);
  const [aapen, setAapen] = useState(false);
  const n = bilder.length;
  const neste = useCallback(() => setI((k) => (k + 1) % Math.max(n, 1)), [n]);
  const forrige = useCallback(() => setI((k) => (k - 1 + Math.max(n, 1)) % Math.max(n, 1)), [n]);
  useEffect(() => {
    if (!aapen) return undefined;
    const f = (e) => { if (e.key === 'Escape') setAapen(false); if (e.key === 'ArrowRight') neste(); if (e.key === 'ArrowLeft') forrige(); };
    window.addEventListener('keydown', f);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', f); document.body.style.overflow = ''; };
  }, [aapen, neste, forrige]);
  if (!n) {
    return <div className="grid aspect-[16/10] w-full place-items-center rounded-[20px] text-[14px]" style={{ background: T.flate, color: SVAK }}>Bilder kommer</div>;
  }
  return (
    <div data-testid="listing-gallery">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[20px] sm:rounded-[24px]" style={{ background: T.flate }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={bilder[i]} src={bilder[i]} alt={`${tittel} — bilde ${i + 1} av ${n}`} className="absolute inset-0 h-full w-full object-cover" style={{ animation: `v4-frag-inn 500ms ${EASE} both` }} fetchPriority="high" />
        <button type="button" onClick={() => setAapen(true)} className="absolute inset-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" aria-label="Vis bildet i full størrelse" />
        {n > 1 && (
          <>
            <button type="button" onClick={forrige} aria-label="Forrige bilde" className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full transition-transform active:scale-95" style={{ background: 'rgba(21,19,15,0.55)', color: T.offwhite, backdropFilter: 'blur(8px)' }}><ChevronLeft className="h-5 w-5" strokeWidth={1.7} /></button>
            <button type="button" onClick={neste} aria-label="Neste bilde" className="absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full transition-transform active:scale-95" style={{ background: 'rgba(21,19,15,0.55)', color: T.offwhite, backdropFilter: 'blur(8px)' }}><ChevronRight className="h-5 w-5" strokeWidth={1.7} /></button>
            <span className="absolute bottom-4 right-4 rounded-full px-2.5 py-1 text-[12px] tabular-nums" style={{ background: 'rgba(21,19,15,0.55)', color: T.offwhite, backdropFilter: 'blur(8px)' }}>{i + 1} / {n}</span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {bilder.map((b, k) => (
            <button key={b + k} type="button" onClick={() => setI(k)} aria-label={`Bilde ${k + 1}`} aria-current={k === i} className="relative h-[64px] w-[88px] shrink-0 overflow-hidden rounded-[10px] transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/25" style={{ opacity: k === i ? 1 : 0.5, boxShadow: k === i ? `0 0 0 1.5px ${T.ink}` : 'none' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {aapen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(21,19,15,0.94)' }} role="dialog" aria-modal="true" aria-label="Bildevisning" onClick={() => setAapen(false)} data-testid="listing-lightbox">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bilder[i]} alt={`${tittel} — bilde ${i + 1} av ${n}`} className="max-h-full max-w-full rounded-[12px] object-contain" onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setAapen(false)} aria-label="Lukk" className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.12)', color: T.offwhite }}><X className="h-5 w-5" /></button>
          {n > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); forrige(); }} aria-label="Forrige bilde" className="absolute left-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.12)', color: T.offwhite }}><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); neste(); }} aria-label="Neste bilde" className="absolute right-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.12)', color: T.offwhite }}><ChevronRight className="h-5 w-5" /></button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Ferdig({ tittel, tekst, testid }) {
  return (
    <div className="border-t pt-5" style={{ borderColor: HAIR }} data-testid={testid}>
      <p className="flex items-center gap-2 text-[16px] font-medium" style={{ color: T.ink }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />{tittel}</p>
      <p className="mt-2 text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{tekst}</p>
    </div>
  );
}

function EnhetValg({ scope, setScope, testid }) {
  const valg = [{ v: 'hele', t: 'Hele enheten' }, { v: 'rom', t: 'Rom i bofellesskap' }];
  return (
    <fieldset className="mt-4" data-testid={testid}>
      <legend className="text-[13px]" style={{ color: SVAK }}>Hva er du interessert i?</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {valg.map((c) => (
          <button key={c.v} type="button" onClick={() => setScope(c.v)} aria-pressed={scope === c.v} data-testid={`${testid}-${c.v}`} className="inline-flex h-9 items-center rounded-full px-3.5 text-[13.5px] transition-[background-color,color] duration-300" style={scope === c.v ? { background: T.ink, color: T.offwhite } : { color: 'rgba(21,19,15,0.7)', boxShadow: `inset 0 0 0 1px ${HAIR}` }}>{c.t}</button>
        ))}
      </div>
    </fieldset>
  );
}

/* Vårt eget lead: havner i CRM med boligen påkoblet. Ett skjema, ingen boks. */
export function InteresseSkjema({ listing, available }) {
  const begge = listing.scope === 'begge';
  const [f, setF] = useState({ name: '', email: '', phone: '', notes: '', scope: begge ? '' : (listing.scope || 'hele') });
  const [st, setSt] = useState('idle');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const send = async (e) => {
    e.preventDefault(); setErr('');
    if (!f.name.trim()) { setErr('Skriv inn navnet ditt'); return; }
    if (!/^\S+@\S+\.\S+$/.test(f.email)) { setErr('Sjekk e-postadressen'); return; }
    if (begge && !f.scope) { setErr('Velg hele enheten eller rom i bofellesskap'); return; }
    setSt('sender');
    try {
      const r = await fetch('/api/tenants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name, email: f.email, phone: f.phone, notes: f.notes, property: listing.id, interest_scope: f.scope || undefined, preferred_area: [listing.area, listing.district].filter(Boolean).join(', '), bedrooms: listing.bedrooms || undefined, source: 'ledige-boliger' }),
      });
      const j = await r.json();
      if (j.success || j.ok) setSt('ferdig'); else { setSt('idle'); setErr(j.error || 'Noe gikk galt — prøv igjen'); }
    } catch (e2) { setSt('idle'); setErr('Nettverksfeil — prøv igjen'); }
  };
  if (st === 'ferdig') {
    return <Ferdig testid="listing-interest-done" tittel="Interessen er registrert" tekst={`Vi tar kontakt om ${String(listing.title || 'boligen').toLowerCase()}${begge && f.scope ? ` (${f.scope === 'rom' ? 'rom i bofellesskap' : 'hele enheten'})` : ''} — samme dag på hverdager. Du får en bekreftelse på e-post nå.`} />;
  }
  return (
    <form onSubmit={send} className="grid gap-4" data-testid="listing-interest-form" noValidate>
      <label className="block"><span className="text-[13px]" style={{ color: SVAK }}>Navn</span><input value={f.name} onChange={set('name')} autoComplete="name" className={feltKlasse} style={FELT} data-testid="interest-name" /></label>
      <label className="block"><span className="text-[13px]" style={{ color: SVAK }}>E-post</span><input type="email" value={f.email} onChange={set('email')} autoComplete="email" className={feltKlasse} style={FELT} data-testid="interest-email" /></label>
      <label className="block"><span className="text-[13px]" style={{ color: SVAK }}>Telefon <span style={{ opacity: 0.6 }}>(valgfritt)</span></span><input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" className={feltKlasse} style={FELT} data-testid="interest-phone" /></label>
      {begge && <EnhetValg scope={f.scope} setScope={(v) => setF((x) => ({ ...x, scope: v }))} testid="interest-scope" />}
      <label className="block"><span className="text-[13px]" style={{ color: SVAK }}>Når vil du flytte inn? Spørsmål?</span><textarea value={f.notes} onChange={set('notes')} rows={2} className="mt-1 w-full resize-none bg-transparent py-2 text-[16px] leading-[1.45] outline-none placeholder:text-[#15130F]/35" style={FELT} data-testid="interest-notes" /></label>
      {err && <p className="text-[13.5px]" style={{ color: '#B4462F' }} data-testid="interest-error">{err}</p>}
      <button type="submit" disabled={st === 'sender'} className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-medium transition-[transform,opacity] duration-200 active:scale-[0.98] disabled:opacity-60" style={{ background: T.ink, color: T.offwhite }} data-testid="interest-submit">
        {st === 'sender' ? 'Sender …' : available ? 'Meld interesse' : 'Varsle meg om tilsvarende'}<ArrowRight className="h-4 w-4" strokeWidth={1.7} />
      </button>
      <p className="text-[12.5px] leading-[1.5]" style={{ color: SVAK }}>Vi bruker opplysningene bare til å følge opp interessen din. <Link href="/personvern" className="underline underline-offset-4 decoration-[#15130F]/25 hover:decoration-[#15130F]">Personvern</Link></p>
    </form>
  );
}

/* Fra nyhetsbrevet: tokenet i lenken sier hvem du er — ett trykk. Ugyldig lenke → vanlig skjema. */
function NyhetsbrevInteresse({ listing, nl, available }) {
  const begge = listing.scope === 'begge';
  const [hvem, setHvem] = useState(null);
  const [scope, setScope] = useState(begge ? '' : (listing.scope || 'hele'));
  const [note, setNote] = useState('');
  const [st, setSt] = useState('idle');
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const qs = new URLSearchParams({ property: nl.property, c: nl.c, r: nl.r, pt: nl.pt });
        const r = await fetch(`/api/newsletter/property-interest/lookup?${qs.toString()}`);
        const j = await r.json();
        if (!alive) return;
        if (j.ok && !j.preview) setHvem({ firstName: j.firstName || '', already: !!j.alreadyInterested }); else setHvem({ invalid: true });
      } catch (e) { if (alive) setHvem({ invalid: true }); }
    })();
    return () => { alive = false; };
  }, [nl.property, nl.c, nl.r, nl.pt]);
  const send = async () => {
    setErr('');
    if (begge && !scope) { setErr('Velg hele enheten eller rom i bofellesskap'); return; }
    setSt('sender');
    try {
      const r = await fetch('/api/newsletter/property-interest/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ property: nl.property, c: nl.c, r: nl.r, pt: nl.pt, scope: scope || undefined, message: note || undefined }) });
      const j = await r.json();
      if (j.ok) setSt('ferdig'); else { setSt('idle'); setErr(j.error || 'Noe gikk galt — prøv igjen'); }
    } catch (e) { setSt('idle'); setErr('Nettverksfeil — prøv igjen'); }
  };
  if (hvem?.invalid) return <InteresseSkjema listing={listing} available={available} />;
  if (st === 'ferdig') return <Ferdig testid="nl-interest-done" tittel="Interessen er registrert" tekst={`Takk${hvem?.firstName ? `, ${hvem.firstName}` : ''}! Forvalteren tar kontakt${begge && scope ? ` om ${scope === 'rom' ? 'rom i bofellesskap' : 'hele enheten'}` : ''} — normalt samme dag på hverdager.`} />;
  return (
    <div data-testid="nl-interest">
      <p className="text-[16px] font-medium" style={{ color: T.ink }}>{hvem?.firstName ? `Hei ${hvem.firstName}!` : 'Du kom fra nyhetsbrevet'}</p>
      <p className="mt-1.5 text-[14px] leading-[1.5]" style={{ color: DIM }}>{hvem?.already ? 'Du har alt meldt interesse for denne boligen. Trykk igjen hvis du vil minne oss på det.' : 'Vi har kontaktopplysningene dine — du trenger ikke fylle ut noe.'}</p>
      {begge && <EnhetValg scope={scope} setScope={setScope} testid="nl-interest-scope" />}
      <label className="mt-4 block"><span className="text-[13px]" style={{ color: SVAK }}>Når vil du flytte inn? Spørsmål? <span style={{ opacity: 0.6 }}>(valgfritt)</span></span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full resize-none bg-transparent py-2 text-[16px] leading-[1.45] outline-none" style={FELT} data-testid="nl-interest-note" /></label>
      {err && <p className="mt-2 text-[13.5px]" style={{ color: '#B4462F' }} data-testid="nl-interest-error">{err}</p>}
      <button type="button" onClick={send} disabled={st === 'sender' || !hvem} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium transition-[transform,opacity] duration-200 active:scale-[0.98] disabled:opacity-60" style={{ background: T.ink, color: T.offwhite }} data-testid="nl-interest-send">
        {st === 'sender' ? 'Sender …' : 'Ja, jeg er interessert'}<ArrowRight className="h-4 w-4" strokeWidth={1.7} />
      </button>
    </div>
  );
}

export default function BoligDetalj({ listing, available, nl = null }) {
  const sted = listing.streetAddress || listing.area || listing.title;
  const under = [listing.district, listing.city].filter(Boolean).filter((v, k, a) => a.indexOf(v) === k).join(', ');
  const leie = listing.rentText ? listing.rentText.replace(/\s*kr\/mnd\s*$/i, '') : null;
  const ledigFra = formatNoDate(listing.availableFrom) || listing.availableFrom || null;
  const fakta = [
    listing.sqm ? ['Areal', `${listing.sqm} m²`] : null,
    listing.bedrooms ? ['Soverom', String(listing.bedrooms)] : null,
    ['Boligtype', listing.typeLabel],
    ['Utleieenhet', listing.scopeShort || 'Hele enheten'],
    listing.roomsLabel ? ['Ledige rom', listing.roomsLabel] : null,
    ['Utleieform', listing.modelLabel],
    ['Ledig fra', ledigFra || 'Etter avtale'],
  ].filter(Boolean);
  const pris = (
    <div data-testid="listing-price">
      {leie ? (
        <>
          <p className="text-[13px]" style={{ color: SVAK }}>Månedsleie{listing.rentScopeNote ? ` · ${listing.rentScopeNote}` : ''}</p>
          <p className="mt-1 text-[clamp(30px,2.6vw,40px)] tabular-nums" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.ink }}><Siffer v={leie} /><span className="text-[0.42em]" style={{ color: SVAK, letterSpacing: 0 }}> kr/mnd</span></p>
        </>
      ) : <p className="text-[18px]" style={{ ...display, color: T.ink }}>Pris på forespørsel</p>}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28" data-testid="listing-detail">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-8">
          <Galleri bilder={listing.images} tittel={listing.title} />

          <div className="mt-8 flex flex-wrap items-end justify-between gap-6 sm:mt-10">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[13.5px]" style={{ color: available ? 'rgba(21,19,15,0.75)' : SVAK }} data-testid="listing-detail-status">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: available ? T.lilla : 'rgba(21,19,15,0.3)', boxShadow: available ? '0 0 0 3px rgba(212,150,255,0.22)' : 'none' }} />
                {available ? (ledigFra && /^\d{4}-/.test(String(listing.availableFrom)) ? `Ledig fra ${ledigFra}` : 'Ledig nå') : 'Utleid'}
                {listing.scope && listing.scope !== 'hele' ? <span data-testid="listing-detail-scope"> · {listing.scopeLabel}</span> : null}
              </p>
              <h1 className="mt-3 break-words text-[clamp(34px,4.2vw,64px)]" style={{ ...display, color: T.ink }} data-testid="listing-detail-h1">{sted}</h1>
              <p className="mt-2 text-[16px]" style={{ color: DIM }}>{[under, listing.title !== sted ? listing.title : null].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="lg:hidden">{pris}</div>
          </div>

          {/* Fakta på hårlinjer — ingen ikoner, ingen bokser */}
          <dl className="mt-8 grid grid-cols-2 gap-x-8 border-t sm:grid-cols-3" style={{ borderColor: HAIR }} data-testid="listing-facts">
            {fakta.map(([k, v]) => (
              <div key={k} className="border-b py-4" style={{ borderColor: HAIR }}>
                <dt className="text-[12.5px]" style={{ color: SVAK }}>{k}</dt>
                <dd className="mt-1 text-[16.5px] font-medium" style={{ color: T.ink }}>{v}</dd>
              </div>
            ))}
          </dl>

          {listing.scopeNote && <p className="mt-5 max-w-[62ch] text-[14.5px] leading-[1.5]" style={{ color: DIM }} data-testid="listing-scope-note"><span className="font-medium" style={{ color: T.ink }}>{listing.scopeLabel}.</span> {listing.scopeNote}</p>}

          <div className="mt-12">
            <h2 className="text-[clamp(24px,2.2vw,32px)]" style={{ ...display, color: T.ink }}>Om boligen<span style={{ color: T.lilla }}>.</span></h2>
            {listing.description ? (
              <div className="mt-5 max-w-[66ch] space-y-4 text-[17px] leading-[1.6]" style={{ color: 'rgba(21,19,15,0.78)' }} data-testid="listing-description">
                {String(listing.description).split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para.split('\n').map((line, j) => <React.Fragment key={j}>{j > 0 && <br />}{line}</React.Fragment>)}</p>
                ))}
              </div>
            ) : (
              <p className="mt-5 max-w-[66ch] text-[17px] leading-[1.6]" style={{ color: 'rgba(21,19,15,0.78)' }}>
                {listing.typeLabel}{listing.sqm ? ` på ${listing.sqm} m²` : ''}{listing.bedrooms ? ` med ${listing.bedrooms} soverom` : ''}{under ? ` i ${under}` : ''}.{ledigFra ? ` Ledig fra ${ledigFra}.` : ''} Meld interesse, så sender vi hele presentasjonen og setter opp visning.
              </p>
            )}
            <p className="mt-4 max-w-[66ch] text-[14.5px] leading-[1.55]" style={{ color: DIM }}>Boligen leies ut gjennom DigiHome: kredittsjekk og referanser, kontrakt signert med BankID, depositum på egen konto — og én kontakt gjennom hele leieforholdet.</p>
          </div>

          {listing.finnUrl && (
            <a href={listing.finnUrl} target="_blank" rel="noopener noreferrer" data-testid="listing-finn-link" className="group mt-10 flex items-center justify-between gap-4 border-t border-b py-5 transition-colors" style={{ borderColor: HAIR }}>
              <span><span className="block text-[13px]" style={{ color: SVAK }}>Annonsen</span><span className="mt-1 block text-[18px] font-medium" style={{ color: T.ink }}>Se annonsen på FINN — alle bildene, plantegning og hele beskrivelsen</span></span>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]" style={{ background: '#0063fb', color: '#fff' }}><ArrowUpRight className="h-5 w-5" strokeWidth={1.7} /></span>
            </a>
          )}

          {/* Slik leier du gjennom oss — tre linjer på hårlinjer */}
          <ol className="mt-12 grid gap-x-8 border-t sm:grid-cols-3" style={{ borderColor: HAIR }} data-testid="listing-trygghet">
            {[['01', 'Kredittsjekk og referanser', 'Vi kvalitetssikrer begge veier — trygt for utleier og for deg.'], ['02', 'Kontrakt med BankID', 'Signert digitalt. Alt dokumentert i én løsning, tilgjengelig for deg hele tiden.'], ['03', 'Depositum på egen konto', 'Pengene står trygt på konto i ditt navn — ikke hos utleier.']].map(([nr, t, u]) => (
              <li key={nr} className="py-5">
                <p className="text-[12.5px] tabular-nums" style={{ color: T.lilla }}>{nr}</p>
                <p className="mt-2 text-[16px] font-medium" style={{ color: T.ink }}>{t}</p>
                <p className="mt-1.5 text-[14px] leading-[1.5]" style={{ color: DIM }}>{u}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Det ene du gjør — sticky ved siden av */}
        <aside className="min-w-0 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
          <div className="border-t pt-6 lg:border-t-0 lg:pt-0" style={{ borderColor: HAIR }}>
            <div className="hidden lg:block">{pris}</div>
            {!available && (
              <p className="mt-5 text-[14.5px] leading-[1.5]" style={{ color: DIM }}><span className="font-medium" style={{ color: T.ink }}>Denne boligen er utleid.</span> Legg igjen kontaktinfo, så sier vi fra når noe tilsvarende blir ledig — eller se <Link href="/ledige-boliger" className="underline underline-offset-4 decoration-[#15130F]/25 hover:decoration-[#15130F]" style={{ color: T.ink }}>alle ledige boliger</Link>.</p>
            )}
            <div className="mt-6 border-t pt-6 lg:mt-7" style={{ borderColor: HAIR }}>
              <h2 className="text-[clamp(22px,1.8vw,26px)]" style={{ ...display, color: T.ink }}>{available ? 'Meld interesse' : 'Bli varslet'}<span style={{ color: T.lilla }}>.</span></h2>
              <p className="mt-2 text-[14px] leading-[1.5]" style={{ color: DIM }}>{available ? 'Vi svarer samme dag på hverdager og setter opp visning.' : 'Vi sier fra når en tilsvarende bolig blir ledig.'}</p>
              <div className="mt-5">{nl ? <NyhetsbrevInteresse listing={listing} nl={nl} available={available} /> : <InteresseSkjema listing={listing} available={available} />}</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
