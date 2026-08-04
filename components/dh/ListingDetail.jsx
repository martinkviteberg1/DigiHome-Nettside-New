'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatNoDate } from '@/lib/listings';
import {
  MapPin, Ruler, BedDouble, CalendarDays, Building2, ShieldCheck, ExternalLink,
  ChevronLeft, ChevronRight, X, Check, Loader2, Send, Info, Users, ArrowUpRight,
} from 'lucide-react';

// «Book visning i DigiHome» er slått av inntil videre (eierens beslutning).
// Flagget beholdes fordi lenken er bygget, testet og kan slås på igjen med én
// linje — å slette koden ville betydd å bygge den på nytt senere.
const SHOW_PLATFORM_BOOKING = false;

// Boligsiden. Veiene videre, i bevisst rekkefølge:
//  1. «Meld interesse» — vårt eget lead. Havner i CRM med boligen påkoblet.
//  2. «Se annonsen på FINN» — kun når lenken er verifisert i utleiemodulen.
//     Løftet til et eget kort: annonsen har flere bilder og plantegning, så det
//     er ofte neste steg for den som er nysgjerrig.
//  3. «Book visning i DigiHome» — plattformens egen boligside. Slått AV
//     inntil videre, se SHOW_PLATFORM_BOOKING over.

const KR = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');

// Datoformatering går via formatNoDate, som tolker BÅDE «2026-10-01» og
// «01.10.2026». Vi bruker ikke new Date(streng) direkte: den tolker
// «01.10.2026» som 10. januar, og da annonserer vi feil innflyttingsdato.
function fmtDate(v) {
  return formatNoDate(v);
}

function Gallery({ images, title }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const imgs = Array.isArray(images) ? images.filter(Boolean) : [];
  const go = useCallback((d) => setI((v) => (imgs.length ? (v + d + imgs.length) % imgs.length : 0)), [imgs.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, go]);

  if (!imgs.length) {
    return <div className="grid aspect-[16/10] place-items-center rounded-[26px] bg-[#f3f1ee] text-[#c9c3ba]"><Building2 className="h-8 w-8" /></div>;
  }

  return (
    <>
      <div className="overflow-hidden rounded-[22px] bg-[#f3f1ee] sm:rounded-[26px]">
        <button type="button" onClick={() => setOpen(true)} data-testid="listing-gallery-main"
          className="relative block aspect-[4/3] w-full cursor-zoom-in sm:aspect-[16/10]">
          <img src={imgs[i]} alt={title} className="absolute inset-0 h-full w-full object-cover" />
          {imgs.length > 1 && (
            <>
              <span onClick={(e) => { e.stopPropagation(); e.preventDefault(); go(-1); }}
                className="absolute left-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[#0a0a0a] shadow-sm backdrop-blur-sm transition-colors hover:bg-white sm:left-3 sm:h-10 sm:w-10">
                <ChevronLeft className="h-5 w-5" />
              </span>
              <span onClick={(e) => { e.stopPropagation(); e.preventDefault(); go(1); }}
                className="absolute right-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[#0a0a0a] shadow-sm backdrop-blur-sm transition-colors hover:bg-white sm:right-3 sm:h-10 sm:w-10">
                <ChevronRight className="h-5 w-5" />
              </span>
              <span className="absolute bottom-3 right-3 rounded-full bg-[#0a0a0a]/70 px-2.5 py-1 text-[11.5px] font-semibold text-white ring-1 ring-inset ring-white/15 backdrop-blur-md tabular-nums">{i + 1} / {imgs.length}</span>
            </>
          )}
        </button>
      </div>
      {imgs.length > 1 && (
        // Miniatyrene ruller horisontalt. De ligger i en kolonne med min-w-0
        // (se under), ellers ville 12 × 88px tvunget hele siden bred på mobil.
        // -mx-4 lar stripen gå helt ut til skjermkanten, som i en app.
        <div className="mt-3 -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1.5 [scrollbar-width:thin] sm:mx-0 sm:px-0"
          data-testid="listing-gallery-thumbs">
          {imgs.map((src, k) => (
            <button key={src + k} type="button" onClick={() => setI(k)} aria-label={`Bilde ${k + 1}`}
              className={`h-14 w-[76px] shrink-0 snap-start overflow-hidden rounded-xl transition-all sm:h-16 sm:w-[88px] ${k === i ? 'ring-2 ring-[#7c3aed] ring-offset-2 ring-offset-[#fdfcfb]' : 'opacity-70 hover:opacity-100'}`}>
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0a0a0a]/94 p-3 backdrop-blur-sm sm:p-4" onClick={() => setOpen(false)}>
          <button type="button" onClick={() => setOpen(false)} aria-label="Lukk"
            className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4 sm:top-4"><X className="h-5 w-5" /></button>
          <img src={imgs[i]} alt={title} className="max-h-[82vh] max-w-full rounded-2xl object-contain sm:max-h-[88vh]" onClick={(e) => e.stopPropagation()} />
          {imgs.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Forrige"
                className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4 sm:h-12 sm:w-12"><ChevronLeft className="h-6 w-6" /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Neste"
                className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4 sm:h-12 sm:w-12"><ChevronRight className="h-6 w-6" /></button>
              <span className="absolute bottom-5 rounded-full bg-white/10 px-3 py-1 text-[13px] text-white tabular-nums">{i + 1} / {imgs.length}</span>
            </>
          )}
        </div>
      )}
    </>
  );
}

function InterestForm({ listing, available }) {
  // Tilbyr boligen BÅDE hele enheten og rom, må interessenten velge. Ellers vet
  // ikke forvalteren om hun svarer på en hel leilighet eller ett rom — to helt
  // forskjellige samtaler, priser og visninger. Er bare én ting mulig, settes
  // valget automatisk og vi maser ikke om noe som er opplagt.
  const both = listing.scope === 'begge';
  const [f, setF] = useState({ name: '', email: '', phone: '', notes: '', scope: both ? '' : (listing.scope || 'hele') });
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.name.trim()) { setErr('Skriv inn navnet ditt'); return; }
    if (!/^\S+@\S+\.\S+$/.test(f.email)) { setErr('Sjekk e-postadressen'); return; }
    if (both && !f.scope) { setErr('Velg om du er interessert i hele enheten eller rom i bofellesskap'); return; }
    setState('sending');
    try {
      const r = await fetch('/api/tenants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, email: f.email, phone: f.phone, notes: f.notes,
          property: listing.id,
          interest_scope: f.scope || undefined,
          preferred_area: [listing.area, listing.district].filter(Boolean).join(', '),
          bedrooms: listing.bedrooms || undefined,
          source: 'ledige-boliger',
        }),
      });
      const j = await r.json();
      if (j.success || j.ok) setState('done');
      else { setState('idle'); setErr(j.error || 'Noe gikk galt — prøv igjen'); }
    } catch (e2) { setState('idle'); setErr('Nettverksfeil — prøv igjen'); }
  };

  if (state === 'done') {
    return (
      <div className="rounded-[22px] bg-emerald-50 p-5" data-testid="listing-interest-done">
        <p className="inline-flex items-center gap-2 text-[15px] font-semibold text-emerald-900"><Check className="h-4 w-4" /> Interessen er registrert</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-emerald-900/80">
          Vi tar kontakt med deg om {listing.title.toLowerCase()}
          {both && f.scope ? ` (${f.scope === 'rom' ? 'rom i bofellesskap' : 'hele enheten'})` : ''}.
          Du hører fra oss samme dag på hverdager — og får en bekreftelse på e-post nå.
        </p>
      </div>
    );
  }

  const SCOPE_CHOICES = [
    { value: 'hele', label: 'Hele enheten', hint: 'Du leier hele boligen' },
    { value: 'rom', label: 'Rom i bofellesskap', hint: 'Du leier ett rom' },
  ];

  return (
    <form onSubmit={submit} className="space-y-2.5" data-testid="listing-interest-form">
      {both && (
        <fieldset className="mb-1" data-testid="listing-interest-scope">
          <legend className="mb-2 text-[12.5px] font-semibold text-[#0a0a0a]">Hva er du interessert i? <span className="font-normal text-[#a8a29a]">(må velges)</span></legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SCOPE_CHOICES.map((c) => (
              <label key={c.value} data-testid={`listing-interest-scope-${c.value}`}
                className={`flex cursor-pointer flex-col rounded-xl px-3.5 py-2.5 text-left transition-all ${f.scope === c.value
                  ? 'bg-white ring-2 ring-[#7c3aed]'
                  : 'bg-white ring-1 ring-inset ring-black/[0.09] hover:ring-black/[0.2]'}`}>
                <span className="flex items-center gap-2">
                  <input type="radio" name="interest_scope" value={c.value} checked={f.scope === c.value}
                    onChange={() => setF((v) => ({ ...v, scope: c.value }))} className="h-3.5 w-3.5 accent-[#7c3aed]" />
                  <span className="text-[13.5px] font-semibold text-[#0a0a0a]">{c.label}</span>
                </span>
                <span className="mt-0.5 pl-[22px] text-[11.5px] leading-snug text-[#8d867d]">{c.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!both && listing.scope === 'rom' && (
        <p className="mb-1 rounded-xl bg-[#f4f0fb] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#5b3c8f]" data-testid="listing-interest-scope-fixed">
          Gjelder <strong>rom i bofellesskap</strong>{listing.roomsLabel ? ` — ${listing.roomsLabel.toLowerCase()}` : ''}.
        </p>
      )}
      <input value={f.name} onChange={set('name')} placeholder="Navn" autoComplete="name" data-testid="listing-interest-name"
        className="h-11 w-full rounded-xl bg-white px-4 text-[14.5px] ring-1 ring-inset ring-black/[0.09] outline-none placeholder:text-[#b3ada4] focus:ring-2 focus:ring-[#7c3aed]" />
      <div className="grid gap-2.5 sm:grid-cols-2">
        <input value={f.email} onChange={set('email')} type="email" placeholder="E-post" autoComplete="email" data-testid="listing-interest-email"
          className="h-11 w-full rounded-xl bg-white px-4 text-[14.5px] ring-1 ring-inset ring-black/[0.09] outline-none placeholder:text-[#b3ada4] focus:ring-2 focus:ring-[#7c3aed]" />
        <input value={f.phone} onChange={set('phone')} type="tel" placeholder="Telefon" autoComplete="tel" data-testid="listing-interest-phone"
          className="h-11 w-full rounded-xl bg-white px-4 text-[14.5px] ring-1 ring-inset ring-black/[0.09] outline-none placeholder:text-[#b3ada4] focus:ring-2 focus:ring-[#7c3aed]" />
      </div>
      {/* Fritekst. Den følger henvendelsen hele veien — til forvalterens varsel,
          til leadet i admin og videre til DigiHome-plattformen — så spørsmålet
          om innflytting eller husdyr blir besvart i første svar. */}
      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-[#5f5a53]">Melding til forvalteren <span className="font-normal text-[#a8a29a]">(valgfritt)</span></span>
        <textarea value={f.notes} onChange={set('notes')} rows={3} placeholder="Når vil du flytte inn? Spørsmål om boligen? Noe vi bør vite?"
          data-testid="listing-interest-notes"
          className="w-full resize-none rounded-xl bg-white px-4 py-3 text-[14.5px] leading-relaxed ring-1 ring-inset ring-black/[0.09] outline-none placeholder:text-[#b3ada4] focus:ring-2 focus:ring-[#7c3aed]" />
      </label>
      {err && <p className="text-[13px] text-red-600">{err}</p>}
      <button type="submit" disabled={state === 'sending'} data-testid="listing-interest-submit"
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0a0a0a] text-[15px] font-semibold text-white transition-colors hover:bg-[#242424] disabled:opacity-60">
        {state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {available ? 'Meld interesse' : 'Sett meg på lista'}
      </button>
      <p className="text-[11.5px] leading-relaxed text-[#a8a29a]">
        Vi bruker opplysningene til å følge opp henvendelsen din om denne boligen. Ingen deling med tredjeparter.
      </p>
    </form>
  );
}

// ── ETT-KLIKKS INTERESSE FRA NYHETSBREV ────────────────────────────────────
// Kom du fra nyhetsbrevet, vet vi hvem du er: lenken er HMAC-signert per
// mottaker og kampanje. Da skal du ikke måtte fylle ut navn og e-post på nytt —
// ett trykk registrerer interessen på riktig leietakerprofil. Det er den
// friksjonsfriheten som gjør at folk faktisk melder seg.
//
// Ett unntak: tilbyr boligen BÅDE hele enheten og rom, blir ett trykk to trykk.
// Det er verdt det — uten valget vet ikke forvalteren om hun svarer på en hel
// leilighet eller ett rom, og da må hun ringe for å spørre om noe vi kunne
// spurt om her.
function NewsletterInterest({ listing, nl, available }) {
  const both = listing.scope === 'begge';
  const [who, setWho] = useState(null);
  const [scope, setScope] = useState(both ? '' : (listing.scope || 'hele'));
  const [note, setNote] = useState('');
  const [openNote, setOpenNote] = useState(false);
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const qs = new URLSearchParams({ property: nl.property, c: nl.c, r: nl.r, pt: nl.pt });
        const r = await fetch(`/api/newsletter/property-interest/lookup?${qs.toString()}`);
        const j = await r.json();
        if (!alive) return;
        // `preview: true` betyr at tokenet ikke kunne bekreftes (admin-preview
        // eller manipulert lenke). Da skal ingen registrere interesse på andres
        // profil — vi faller tilbake til det vanlige skjemaet.
        if (j.ok && !j.preview) setWho({ firstName: j.firstName || '', already: !!j.alreadyInterested });
        else setWho({ firstName: '', invalid: true });
      } catch (e) { if (alive) setWho({ firstName: '', invalid: true }); }
    })();
    return () => { alive = false; };
  }, [nl.property, nl.c, nl.r, nl.pt]);

  const send = async () => {
    setErr('');
    if (both && !scope) { setErr('Velg om du er interessert i hele enheten eller rom i bofellesskap'); return; }
    setState('sending');
    try {
      const r = await fetch('/api/newsletter/property-interest/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property: nl.property, c: nl.c, r: nl.r, pt: nl.pt, scope: scope || undefined, message: note || undefined }),
      });
      const j = await r.json();
      if (j.ok) setState('done');
      else { setState('idle'); setErr(j.error || 'Noe gikk galt — prøv igjen'); }
    } catch (e) { setState('idle'); setErr('Nettverksfeil — prøv igjen'); }
  };

  // Ugyldig/utløpt lenke: fall tilbake til det vanlige skjemaet i stedet for en
  // blindvei. Interessen er for verdifull til å kastes på en teknikalitet.
  if (who?.invalid) return <InterestForm listing={listing} available={available} />;

  if (state === 'done') {
    return (
      <div className="rounded-[22px] bg-emerald-50 p-5" data-testid="nl-interest-done">
        <p className="inline-flex items-center gap-2 text-[15px] font-semibold text-emerald-900"><Check className="h-4 w-4" /> Interessen er registrert</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-emerald-900/80">
          Takk{who?.firstName ? `, ${who.firstName}` : ''}! Forvalteren tar kontakt
          {both && scope ? ` om ${scope === 'rom' ? 'rom i bofellesskap' : 'hele enheten'}` : ''} — normalt samme dag på hverdager.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="nl-interest">
      <div className="rounded-[18px] bg-[#f6f1ff] p-4">
        <p className="text-[14px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
          {who?.firstName ? `Hei ${who.firstName}!` : 'Du kom fra nyhetsbrevet'}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#4c3a75]">
          {who?.already
            ? 'Du har alt meldt interesse for denne boligen. Trykk igjen hvis du vil minne oss på det.'
            : 'Vi har kontaktopplysningene dine — du trenger ikke fylle ut noe.'}
        </p>
      </div>

      {both && (
        <fieldset className="mt-3" data-testid="nl-interest-scope">
          <legend className="mb-2 text-[12.5px] font-semibold text-[#0a0a0a]">Hva er du interessert i? <span className="font-normal text-[#a8a29a]">(må velges)</span></legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[{ v: 'hele', l: 'Hele enheten', h: 'Du leier hele boligen' }, { v: 'rom', l: 'Rom i bofellesskap', h: 'Du leier ett rom' }].map((c) => (
              <button key={c.v} type="button" onClick={() => setScope(c.v)} data-testid={`nl-interest-scope-${c.v}`}
                className={`flex flex-col rounded-xl px-3.5 py-2.5 text-left transition-all ${scope === c.v
                  ? 'bg-white ring-2 ring-[#7c3aed]'
                  : 'bg-white ring-1 ring-inset ring-black/[0.09] hover:ring-black/[0.2]'}`}>
                <span className="text-[13.5px] font-semibold text-[#0a0a0a]">{c.l}</span>
                <span className="mt-0.5 text-[11.5px] leading-snug text-[#8d867d]">{c.h}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {openNote ? (
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} autoFocus
          data-testid="nl-interest-note" placeholder="Når vil du flytte inn? Spørsmål om boligen?"
          className="mt-3 w-full resize-none rounded-xl bg-white px-4 py-3 text-[14.5px] leading-relaxed ring-1 ring-inset ring-black/[0.09] outline-none placeholder:text-[#b3ada4] focus:ring-2 focus:ring-[#7c3aed]" />
      ) : (
        <button type="button" onClick={() => setOpenNote(true)} data-testid="nl-interest-note-open"
          className="mt-3 text-[12.5px] font-semibold text-[#7c3aed] hover:underline">Vil du legge ved en melding?</button>
      )}

      <button type="button" onClick={send} disabled={state === 'sending'} data-testid="nl-interest-send"
        className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0a0a0a] text-[14.5px] font-bold text-white transition-all hover:bg-[#7c3aed] disabled:opacity-60">
        {state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {available ? 'Meld interesse' : 'Varsle meg om tilsvarende'}
      </button>
      {err && <p className="mt-2 text-[12.5px] font-semibold text-rose-600" data-testid="nl-interest-error">{err}</p>}
      <p className="mt-2 text-[11.5px] leading-snug text-[#a8a29a]">
        Registrert på deg som mottaker av nyhetsbrevet. Ikke deg?{' '}
        <button type="button" onClick={() => setWho({ firstName: '', invalid: true })} className="font-semibold text-[#7c3aed] hover:underline">Bruk skjemaet i stedet</button>
      </p>
    </div>
  );
}

export default function ListingDetail({ listing, available, nl = null }) {
  // Full gateadresse med husnummer + bydel. Fallback til gatenavnet alene
  // dersom plattformen mangler nummeret på en enhet.
  const place = [listing.streetAddress || listing.area, listing.district].filter(Boolean).join(', ') || listing.city;
  const rent = listing.rentBand ? listing.rentBand.replace(/\s*kr\/mnd\s*$/i, '') : null;
  const availFrom = fmtDate(listing.availableFrom) || (listing.availableFrom || null);
  const facts = [
    listing.sqm ? { icon: Ruler, label: 'Areal', value: `${listing.sqm} m²` } : null,
    listing.bedrooms ? { icon: BedDouble, label: 'Soverom', value: String(listing.bedrooms) } : null,
    { icon: Building2, label: 'Boligtype', value: listing.typeLabel },
    // Utleieenhet står blant fakta, ikke i finstilt tekst: for prisen og
    // hverdagen er «rom i bofellesskap» minst like avgjørende som arealet.
    { icon: Users, label: 'Utleieenhet', value: listing.scopeShort || 'Hele enheten' },
    listing.roomsLabel ? { icon: Users, label: 'Ledige rom', value: listing.roomsLabel } : null,
    { icon: CalendarDays, label: 'Ledig fra', value: availFrom || 'Etter avtale' },
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-10 lg:px-16">
      {/* grid-cols-1 er ikke overflødig: uten den blir mobilkolonnen
          innholdsstyrt, og miniatyrbildestripen (12 × 96px) tvang hele siden
          til 1168px bredde på en 390px skjerm. grid-cols-1 gir minmax(0,1fr),
          og min-w-0 lar kolonnen krympe under innholdsbredden — først da har
          overflow-x-auto noe å begrense seg mot. */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
        <div className="min-w-0">
          <Gallery images={listing.images} title={listing.title} />

          <div className="mt-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#f4f0fb] px-3 py-1 text-[12px] font-semibold text-[#7c3aed] ring-1 ring-inset ring-[#7c3aed]/15">{listing.modelLabel}</span>
              {listing.scope && listing.scope !== 'hele' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7c3aed] px-3 py-1 text-[12px] font-semibold text-white" data-testid="listing-detail-scope">
                  <Users className="h-3.5 w-3.5" />{listing.scopeLabel}
                </span>
              )}
              {!available && <span className="inline-flex items-center rounded-full bg-[#0a0a0a] px-3 py-1 text-[12px] font-semibold text-white">Utleid</span>}
              {listing.district && <span className="inline-flex items-center rounded-full bg-[#f1f0ee] px-3 py-1 text-[12px] font-semibold text-[#5f5a53]">{listing.district}</span>}
            </div>
            <h1 className="mt-4 max-w-[26ch] break-words text-[27px] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[40px] sm:leading-[1.1] sm:tracking-[-0.025em]" style={{ fontFamily: 'var(--font-heading)' }}>
              {listing.title}
            </h1>
            <p className="mt-3 flex items-start gap-1.5 text-[15px] text-[#78726a]">
              <MapPin className="mt-[3px] h-4 w-4 shrink-0 text-[#c9c3ba]" />
              <span className="break-words">{place}</span>
            </p>
            {/* Pris på mobil: i ett-kolonne-oppsettet havner sidepanelet
                nederst på siden, og da ligger prisen under fold. Boligsøkere
                sjekker prisen først — den skal stå ved tittelen. */}
            <div className="mt-5 lg:hidden" data-testid="listing-price-mobile">
              {rent ? (
                <p className="text-[25px] font-bold leading-none tracking-[-0.02em] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
                  <span className="whitespace-nowrap">{rent}</span> <span className="text-[14.5px] font-semibold text-[#78726a]">kr/mnd{listing.rentScopeNote ? ` ${listing.rentScopeNote}` : ''}</span>
                  {listing.rentIndicative && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-[#f4f0fb] px-2 py-[3px] align-middle text-[10px] font-bold uppercase tracking-[0.06em] text-[#7c3aed]">Prisantydning</span>
                  )}
                </p>
              ) : (
                <p className="text-[18px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Pris på forespørsel</p>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="rounded-[20px] bg-white p-4 ring-1 ring-black/[0.05]">
                <f.icon className="h-4 w-4 text-[#c9c3ba]" />
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#a8a29a]">{f.label}</p>
                <p className="mt-0.5 text-[15px] font-semibold text-[#0a0a0a]">{f.value}</p>
              </div>
            ))}
          </div>

          {listing.scopeNote && (
            <div className="mt-4 flex items-start gap-3 rounded-[20px] bg-[#f6f1ff] p-4 sm:p-5" data-testid="listing-scope-note">
              <Users className="mt-[2px] h-4 w-4 shrink-0 text-[#7c3aed]" />
              <div>
                <p className="text-[14px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{listing.scopeLabel}</p>
                <p className="mt-1 max-w-[62ch] text-[13.5px] leading-relaxed text-[#4c3a75]">{listing.scopeNote}</p>
              </div>
            </div>
          )}

          <div className="mt-10">
            <h2 className="text-[20px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>Om boligen</h2>
            {/* Redaksjonell annonsetekst når den finnes. Plattformen sender
                ingen beskrivelse (0 av 22 enheter), så dette er skrevet i
                marketing-admin — og det er samtidig det viktigste innholdet
                på siden både for leser og for søk. Den avledede setningen
                under er fallback, ikke erstatning. */}
            {listing.description ? (
              <div className="mt-3 max-w-[68ch] space-y-3 text-[15.5px] leading-relaxed text-[#4a4a4a]" data-testid="listing-description">
                {String(listing.description).split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para.split('\n').map((line, j) => (
                    <React.Fragment key={j}>{j > 0 && <br />}{line}</React.Fragment>
                  ))}</p>
                ))}
              </div>
            ) : (
              <p className="mt-3 max-w-[68ch] text-[15.5px] leading-relaxed text-[#4a4a4a]">
                {listing.typeLabel.toLowerCase()} på {listing.sqm ? `${listing.sqm} m²` : 'sentral beliggenhet'}
                {listing.bedrooms ? ` med ${listing.bedrooms} soverom` : ''} i {place}.
                {' '}Boligen forvaltes av DigiHome, som håndterer visning, kontrakt, depositumskonto og all oppfølging digitalt.
                {availFrom ? ` Boligen er ledig fra ${availFrom}.` : ''}
              </p>
            )}
            {listing.description && (
              <p className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-[#78726a]">
                Boligen forvaltes av DigiHome, som håndterer visning, kontrakt, depositumskonto og all oppfølging digitalt.
                {availFrom ? ` Ledig fra ${availFrom}.` : ''}
              </p>
            )}
            <p className="mt-4 max-w-[68ch] text-[14px] leading-relaxed text-[#78726a]">
              Vil du se flere bilder, plantegning eller detaljer? Meld interesse — da sender vi deg hele boligpresentasjonen og setter opp visning.
            </p>
          </div>

          {/* BOOKING I PLATTFORMEN ER SLÅTT AV (eierens ønske, «inntil videre»).
              Koden står igjen bak flagget under, så den kan slås på med én linje
              den dagen visningsbooking skal være en del av denne siden igjen. */}
          {SHOW_PLATFORM_BOOKING && listing.platformUrl && (
            <div className="mt-8">
              <a href={listing.platformUrl} target="_blank" rel="noopener noreferrer" data-testid="listing-platform-link"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-[#0a0a0a] ring-1 ring-inset ring-black/[0.1] transition-colors hover:ring-black/[0.22]">
                Book visning i DigiHome <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* FINN-ANNONSEN. Løftet fra en beskjeden tekstlenke til et eget kort:
              annonsen har flere bilder, plantegning og full beskrivelse, så den
              er ofte det neste folk vil gjøre. FINN-blå (#0063fb) er gjenkjennelig
              på et halvt sekund — derfor bruker vi den i stedet for vår egen
              lilla, som ville sett ut som en intern CTA. */}
          {listing.finnUrl && (
            <a href={listing.finnUrl} target="_blank" rel="noopener noreferrer" data-testid="listing-finn-link"
              className="group mt-8 flex items-center justify-between gap-4 rounded-[22px] bg-gradient-to-br from-[#0063fb] via-[#0057e0] to-[#0043b8] p-5 shadow-[0_14px_36px_-14px_rgba(0,99,251,0.6)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_20px_46px_-14px_rgba(0,99,251,0.7)] sm:p-6">
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/65">Annonsen</p>
                <p className="mt-1.5 text-[18px] font-bold leading-tight tracking-[-0.01em] text-white sm:text-[20px]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Se annonsen på FINN
                </p>
                <p className="mt-1 text-[13px] leading-snug text-white/80">
                  Alle bildene, plantegning og hele beskrivelsen
                </p>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-inset ring-white/25 transition-transform duration-300 group-hover:translate-x-[3px] group-hover:-translate-y-[3px]">
                <ArrowUpRight className="h-[22px] w-[22px] text-white" />
              </span>
            </a>
          )}

          <div className="mt-10 grid gap-4 rounded-[24px] bg-white p-6 ring-1 ring-black/[0.05] sm:grid-cols-3">
            {[
              { t: 'Kredittsjekk og referanser', d: 'Vi kvalitetssikrer begge veier — trygt for både utleier og leietaker.' },
              { t: 'Digital kontrakt', d: 'Signering med BankID. Alt dokumentert i én løsning.' },
              { t: 'Depositumskonto i bank', d: 'Pengene står trygt på egen konto i ditt navn.' },
            ].map((x) => (
              <div key={x.t}>
                <ShieldCheck className="h-4 w-4 text-[#7c3aed]" />
                <p className="mt-2 text-[14.5px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{x.t}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#78726a]">{x.d}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[26px] bg-[#f8f6f3] p-5 ring-1 ring-black/[0.05] shadow-[0_14px_50px_-32px_rgba(0,0,0,0.3)] sm:p-6">
            {rent ? (
              <>
                <p className="text-[26px] font-bold leading-none tracking-[-0.02em] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
                  <span className="whitespace-nowrap">{rent}</span> <span className="text-[15px] font-semibold text-[#78726a]">kr/mnd{listing.rentScopeNote ? ` ${listing.rentScopeNote}` : ''}</span>
                </p>
                {listing.rentIndicative && (
                  <p className="mt-1.5 inline-flex items-start gap-1.5 text-[12px] leading-snug text-[#8d867d]">
                    <Info className="mt-[1px] h-3.5 w-3.5 shrink-0" /> Prisantydning — endelig leie avtales i kontrakten.
                  </p>
                )}
              </>
            ) : (
              <p className="text-[19px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Pris på forespørsel</p>
            )}

            {!available && (
              <div className="mt-4 rounded-[18px] bg-white p-4 ring-1 ring-black/[0.06]">
                <p className="text-[14px] font-semibold text-[#0a0a0a]">Denne boligen er utleid</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#78726a]">
                  Legg igjen kontaktinfo, så varsler vi deg når noe tilsvarende blir ledig — eller se{' '}
                  <Link href="/ledige-boliger" className="font-semibold text-[#7c3aed] hover:underline">alle ledige boliger</Link>.
                </p>
              </div>
            )}

            <div className="mt-5 border-t border-black/[0.07] pt-5">
              <p className="mb-3 text-[15px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
                {available ? 'Meld interesse' : 'Bli varslet'}
              </p>
              {nl
                ? <NewsletterInterest listing={listing} nl={nl} available={available} />
                : <InterestForm listing={listing} available={available} />}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
