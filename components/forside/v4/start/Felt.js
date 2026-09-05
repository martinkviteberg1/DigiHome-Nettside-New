'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { EASE, T } from '../motion';

/* ---------------------------------------------------------------------------
   Felt — skjemaprimitiver i V4-språket. Rolige, store, uten ikoner inni.
   Label over, papirflate, hårlinje-ring; fokus = ink-ring; feil = rød ring +
   én setning under. Ingen «boxed» kort rundt feltene.
--------------------------------------------------------------------------- */

const RING_HVILE = 'inset 0 0 0 1px rgba(21,19,15,0.12)';
const RING_FOKUS = '0 0 0 1px rgba(21,19,15,0.55), 0 0 0 4px rgba(21,19,15,0.10)';
const RING_FEIL = '0 0 0 1px rgba(180,60,40,0.7), 0 0 0 4px rgba(180,60,40,0.10)';

export function Label({ htmlFor, children, hint }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[13.5px] font-medium text-[#15130F]/75">{children}</label>
      {hint ? <span className="text-[12.5px] text-[#15130F]/45">{hint}</span> : null}
    </div>
  );
}

export function Feilmelding({ id, children }) {
  if (!children) return null;
  return <p id={id} className="mt-2 text-[13px] text-[#B43C28]" data-testid={`${id}`}>{children}</p>;
}

export function TekstFelt({ id, label, hint, value, onChange, onBlur, type = 'text', autoComplete, inputMode, placeholder, feil, ok = false, autoFokus }) {
  const [fokus, setFokus] = React.useState(false);
  return (
    <div>
      <Label htmlFor={id} hint={hint}>{label}</Label>
      <div className="flex items-center rounded-[14px] pr-4" style={{ background: '#FBFAF8', boxShadow: feil ? RING_FEIL : fokus ? RING_FOKUS : RING_HVILE, transition: `box-shadow 200ms ${EASE}` }}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFokus(true)}
          onBlur={() => { setFokus(false); if (onBlur) onBlur(); }}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          autoFocus={autoFokus}
          aria-invalid={!!feil}
          aria-describedby={feil ? `${id}-feil` : undefined}
          data-testid={id}
          className="h-14 w-full min-w-0 appearance-none rounded-[14px] border-0 bg-transparent px-5 text-[16px] text-[#15130F] outline-none ring-0 placeholder:text-[#15130F]/40 focus:outline-none focus:ring-0"
          style={{ outline: 'none', boxShadow: 'none' }}
        />
        <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-[#1F9D55]" strokeWidth={2.2} style={{ opacity: ok && !fokus && !feil ? 1 : 0, transition: `opacity 200ms ${EASE}` }} />
      </div>
      <Feilmelding id={`${id}-feil`}>{feil}</Feilmelding>
    </div>
  );
}

/* Telefon: landkode som stille prefiks (native select — tastatur og mobil gratis) + nummer. */
export function TelefonFelt({ id = 'start-telefon', land, onLand, landListe, value, onChange, onBlur, feil, ok = false, flagg, hint }) {
  const [fokus, setFokus] = React.useState(false);
  const valgt = landListe.find((l) => l.iso === land) || landListe[0];
  return (
    <div>
      <Label htmlFor={id} hint={hint}>Telefon</Label>
      <div className="flex items-center rounded-[14px] pr-4" style={{ background: '#FBFAF8', boxShadow: feil ? RING_FEIL : fokus ? RING_FOKUS : RING_HVILE, transition: `box-shadow 200ms ${EASE}` }}>
        <div className="relative flex shrink-0 items-center border-r pl-4 pr-3" style={{ borderColor: 'rgba(21,19,15,0.10)' }}>
          <span aria-hidden="true" className="pointer-events-none text-[15px] text-[#15130F]">{flagg(valgt.iso)} <span className="ml-1 text-[14px] text-[#15130F]/70">{valgt.dial}</span></span>
          <select
            aria-label="Landkode"
            value={land}
            onChange={(e) => onLand(e.target.value)}
            onFocus={() => setFokus(true)}
            onBlur={() => setFokus(false)}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
            data-testid={`${id}-land`}
          >
            {landListe.map((l) => <option key={l.iso} value={l.iso}>{l.name} ({l.dial})</option>)}
          </select>
        </div>
        <input
          id={id}
          type="tel"
          value={value}
          onChange={onChange}
          onFocus={() => setFokus(true)}
          onBlur={() => { setFokus(false); if (onBlur) onBlur(); }}
          autoComplete="tel"
          inputMode="tel"
          placeholder={valgt.iso === 'NO' ? '8 siffer' : 'Telefonnummer'}
          aria-invalid={!!feil}
          aria-describedby={feil ? `${id}-feil` : undefined}
          data-testid={id}
          className="h-14 w-full min-w-0 appearance-none rounded-r-[14px] border-0 bg-transparent px-4 text-[16px] tabular-nums text-[#15130F] outline-none ring-0 placeholder:text-[#15130F]/40 focus:outline-none focus:ring-0"
          style={{ outline: 'none', boxShadow: 'none' }}
        />
        <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-[#1F9D55]" strokeWidth={2.2} style={{ opacity: ok && !fokus && !feil ? 1 : 0, transition: `opacity 200ms ${EASE}` }} />
      </div>
      <Feilmelding id={`${id}-feil`}>{feil}</Feilmelding>
    </div>
  );
}

/* Segment: to–tre valg i én pill. Valgt = ink. */
export function Segment({ label, verdi, onChange, valg, testId = 'start-segment' }) {
  return (
    <div>
      {label ? <span className="mb-2 block text-[13.5px] font-medium text-[#15130F]/75">{label}</span> : null}
      <div className="grid gap-1 rounded-[14px] p-1" style={{ gridTemplateColumns: `repeat(${valg.length}, minmax(0,1fr))`, background: 'rgba(21,19,15,0.06)' }} role="radiogroup" aria-label={label} data-testid={testId}>
        {valg.map(([id, tekst]) => {
          const aktiv = verdi === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={aktiv}
              onClick={() => onChange(id)}
              className="h-11 rounded-[10px] text-[14.5px] font-medium transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30"
              style={{ background: aktiv ? T.ink : 'transparent', color: aktiv ? '#F4F1EA' : 'rgba(21,19,15,0.7)' }}
              data-testid={`${testId}-${id}`}
            >
              {tekst}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Avkryssing: én setning, ett kryss. Boksen er knappen (role=checkbox); teksten er klikkbar flate.
   Lenker/knapper inni teksten er egne elementer — aldri knapp-i-knapp. */
export function Avkryssing({ id, checked, onChange, children, feil }) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <button
          type="button"
          id={id}
          role="checkbox"
          aria-checked={checked}
          aria-labelledby={`${id}-tekst`}
          onClick={() => onChange(!checked)}
          className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30"
          style={{ background: checked ? T.ink : '#FBFAF8', boxShadow: checked ? 'none' : feil ? RING_FEIL : 'inset 0 0 0 1px rgba(21,19,15,0.30)', transition: `background 160ms ${EASE}` }}
          data-testid={id}
        >
          {checked ? <Check className="h-3 w-3 text-[#F4F1EA]" strokeWidth={3} /> : null}
        </button>
        {/* Klikk på teksten = kryss av. Knapper/lenker inni stopper propagering selv. */}
        <span
          id={`${id}-tekst`}
          onClick={(e) => { if (e.target.closest && e.target.closest('a,button')) return; onChange(!checked); }}
          className="cursor-pointer select-none text-[14px] leading-[1.5] text-[#15130F]/75"
        >
          {children}
        </span>
      </div>
      <Feilmelding id={`${id}-feil`}>{feil}</Feilmelding>
    </div>
  );
}

/* Hovedknapp for stegene. Ink. */
export function StegKnapp({ children, onClick, type = 'button', disabled, laster, testId }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || laster}
      className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] text-[15px] font-medium transition-[background-color,transform,opacity] duration-200 active:scale-[0.99] disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30 sm:w-auto sm:min-w-[220px] sm:px-7"
      style={{ background: disabled ? 'rgba(21,19,15,0.08)' : T.ink, color: disabled ? 'rgba(21,19,15,0.4)' : '#F4F1EA', opacity: laster ? 0.85 : 1 }}
      data-testid={testId}
    >
      {children}
    </button>
  );
}
