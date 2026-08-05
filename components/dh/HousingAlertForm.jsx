'use client';

// ---------------------------------------------------------------------------
// BOLIGVARSEL — to steg, med vilje
//
// Ett stort skjema med bydel, soverom, budsjett og innflytting foran en
// boligsøker som nettopp fant ut at vi ikke har noe ledig, konverterer dårlig.
// Derfor: e-post først (én handling, lav terskel), og DERETTER kriteriene på
// en side som allerede har sagt «du er på lista». Da er forpliktelsen tatt, og
// de fleste fyller ut resten frivillig.
//
// Kriteriene er ikke pynt: de gjør at forvalteren ser hvilke av boligene som
// mangler pris eller bilder det faktisk venter folk på.
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import { Bell, Check, Loader2, ChevronRight, X } from 'lucide-react';
import { ALERT_DISTRICTS, BUDGET_OPTIONS, MOVE_IN_OPTIONS } from '@/lib/housing-alerts';

const KR = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// ASCII-trygg nøkkel for data-testid: «Bergen sentrum» → bergen-sentrum,
// «Årstad» → arstad. Norske tegn i testid-er gjør automatisert testing sprø.
const slugKey = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[æ]/g, 'ae').replace(/[øö]/g, 'o').replace(/[åä]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function Chip({ active, onClick, children, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      className={`inline-flex h-8 items-center rounded-full px-3 text-[12.5px] font-semibold transition-colors ${
        active
          ? 'bg-[#7c3aed] text-white'
          : 'bg-white text-[#3f3f3f] ring-1 ring-inset ring-black/[0.09] hover:bg-[#faf8ff]'
      }`}
    >
      {children}
    </button>
  );
}

export default function HousingAlertForm({ compact = false }) {
  const [step, setStep] = useState(1);          // 1 = e-post, 2 = kriterier, 3 = ferdig
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');   // idle | sending | invalid | error
  const [districts, setDistricts] = useState([]);
  const [bedroomsMin, setBedroomsMin] = useState(0);
  const [maxRent, setMaxRent] = useState(0);
  const [moveIn, setMoveIn] = useState('');
  const [result, setResult] = useState(null);   // { summary, matches }

  const post = async (payload) => {
    const r = await fetch('/api/housing-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'ledige-boliger', ...payload }),
    });
    return r.json();
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setState('invalid'); return; }
    setState('sending');
    try {
      const j = await post({});
      if (!j.ok) { setState('error'); return; }
      setResult({ summary: j.summary || null, matches: j.matches || 0 });
      setState('idle');
      setStep(2);
    } catch (err) { setState('error'); }
  };

  const submitCriteria = async () => {
    setState('sending');
    try {
      const j = await post({
        districts,
        bedroomsMin: bedroomsMin || undefined,
        maxRent: maxRent || undefined,
        moveIn: moveIn || undefined,
      });
      setResult({ summary: j.summary || null, matches: j.matches || 0 });
    } catch (err) { /* varselet er allerede lagret — kriteriene er et pluss */ }
    setState('idle');
    setStep(3);
  };

  const toggleDistrict = (d) =>
    setDistricts((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const hasCriteria = districts.length > 0 || bedroomsMin > 0 || maxRent > 0 || !!moveIn;

  // ── STEG 3: ferdig ──────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div data-testid="housing-alert-done" className="rounded-2xl bg-emerald-50 px-5 py-4">
        <p className="inline-flex items-center gap-2 text-[14.5px] font-semibold text-emerald-900">
          <Check className="h-4 w-4" /> Du er på lista
        </p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-emerald-800">
          {result?.summary
            ? <>Vi varsler deg om: <b>{result.summary}</b>.</>
            : <>Vi varsler deg så snart vi har noe ledig i Bergen.</>}
          {result?.matches > 0 && <> Vi har allerede {result.matches} bolig{result.matches === 1 ? '' : 'er'} som kan passe — se lista over.</>}
        </p>
      </div>
    );
  }

  // ── STEG 2: kriterier ───────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div data-testid="housing-alert-step2" className="rounded-2xl bg-white p-5 ring-1 ring-black/[0.07] shadow-[0_10px_40px_-28px_rgba(0,0,0,0.3)]">
        <p className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-emerald-800">
          <Check className="h-4 w-4" /> {email} er lagt til
        </p>
        <p className="mt-2.5 text-[15px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
          Hva leter du etter?
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#78726a]">
          Tar 15 sekunder, og gjør at du bare hører fra oss når boligen faktisk passer.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b665f]">Bydel</p>
            <div className="flex flex-wrap gap-1.5">
              {ALERT_DISTRICTS.map((d) => (
                <Chip key={d} active={districts.includes(d)} onClick={() => toggleDistrict(d)} testId={`housing-alert-district-${slugKey(d)}`}>{d}</Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b665f]">Minst antall soverom</p>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <Chip key={n} active={bedroomsMin === n} onClick={() => setBedroomsMin(bedroomsMin === n ? 0 : n)} testId={`housing-alert-beds-${n}`}>
                  {n}{n === 4 ? '+' : ''}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ha-budget" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b665f]">Maks leie</label>
              <select id="ha-budget" value={maxRent} onChange={(e) => setMaxRent(Number(e.target.value))} data-testid="housing-alert-maxrent"
                className="h-10 w-full rounded-xl bg-white px-3 text-[14px] text-[#1f1f1f] ring-1 ring-inset ring-black/[0.09] outline-none focus:ring-2 focus:ring-[#7c3aed]">
                <option value={0}>Ingen grense</option>
                {BUDGET_OPTIONS.map((v) => <option key={v} value={v}>Under {KR(v)} kr/mnd</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ha-movein" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b665f]">Når vil du flytte?</label>
              <select id="ha-movein" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} data-testid="housing-alert-movein"
                className="h-10 w-full rounded-xl bg-white px-3 text-[14px] text-[#1f1f1f] ring-1 ring-inset ring-black/[0.09] outline-none focus:ring-2 focus:ring-[#7c3aed]">
                <option value="">Ikke bestemt</option>
                {MOVE_IN_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={submitCriteria} disabled={state === 'sending'} data-testid="housing-alert-refine-submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0a0a0a] px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-[#242424] disabled:opacity-60">
            {state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            {hasCriteria ? 'Lagre boligvarselet' : 'Fortsett'}
          </button>
          <button type="button" onClick={() => setStep(3)} data-testid="housing-alert-skip"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8d867d] hover:text-[#0a0a0a]">
            <X className="h-3.5 w-3.5" /> Hopp over
          </button>
        </div>
      </div>
    );
  }

  // ── STEG 1: e-post ──────────────────────────────────────────────────────
  return (
    <form onSubmit={submitEmail} data-testid="housing-alert-form" className={compact ? 'w-full max-w-[440px]' : 'w-full max-w-[540px]'}>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setState('idle'); }}
          placeholder="din@epost.no" data-testid="listings-notify-email" aria-label="E-postadresse"
          className="h-12 flex-1 rounded-full bg-white px-5 text-[15px] text-[#1f1f1f] ring-1 ring-inset ring-black/[0.09] outline-none placeholder:text-[#b3ada4] focus:ring-2 focus:ring-[#7c3aed]" />
        <button type="submit" disabled={state === 'sending'} data-testid="listings-notify-submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0a0a0a] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#242424] disabled:opacity-60">
          {state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Varsle meg
        </button>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-[#6b665f]">
        {state === 'invalid' && <span className="font-semibold text-red-600">Sjekk e-postadressen. </span>}
        {state === 'error' && <span className="font-semibold text-red-600">Noe gikk galt — prøv igjen. </span>}
        Vi varsler deg om ledige boliger i Bergen, også før de annonseres. Du kan melde deg av når som helst.
      </p>
    </form>
  );
}
