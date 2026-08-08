import React from 'react';
import { MapPin, Check, ShieldCheck, Plus, Minus, ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// OnboardingMockups — tre forenklede, men visuelt trofaste gjengivelser av
// onboarding-flyten i selve DigiHome-appen. Bygget som ren React (ikke
// skjermbilder) slik at de er skarpe på alle skjermer. Fargene og formene
// speiler appens faktiske UI: hvit flate, #e8e4df-linjer, lilla aksent.
// Alle tre har identisk høyde slik at kryssfading i sticky-kolonnen er rolig.
// ---------------------------------------------------------------------------

const INK = '#1a1612';
const MUTED = '#7c7466';
const LINE = '#e8e4df';
const LILLA = '#9B5BD6';

// Nettleser-ramme — samme uttrykk som appens egen walkthrough.
function Ramme({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8e4df] bg-white shadow-[0_32px_80px_-28px_rgba(10,10,10,0.22)]">
      <div className="flex h-9 items-center gap-2 border-b border-[#eee9e2] bg-[#f7f4ef] px-3.5">
        <div className="flex gap-1.5">
          <span className="h-[10px] w-[10px] rounded-full bg-[#e3ddd4]" />
          <span className="h-[10px] w-[10px] rounded-full bg-[#e3ddd4]" />
          <span className="h-[10px] w-[10px] rounded-full bg-[#e3ddd4]" />
        </div>
        <div className="flex flex-1 justify-center">
          <span className="flex h-[22px] items-center rounded-md border border-[#e8e4df] bg-white px-4 text-[9.5px] text-[#7c7466]">
            app.digihome.no/onboarding
          </span>
        </div>
        <span className="w-[46px]" />
      </div>
      <div className="h-[440px] bg-white p-5 sm:h-[460px] sm:p-7">{children}</div>
    </div>
  );
}

// Toppen inne i appen — logo, stegteller og fremdriftslinje.
function Topp({ steg }: { steg: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <img src="/digihome-wordmark-ink.svg" alt="" className="h-[15px] w-auto opacity-80" />
        <span className="text-[11.5px] font-medium" style={{ color: MUTED }}>
          Steg {steg} av 3
        </span>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#f0ece5]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(steg / 3) * 100}%`, background: LILLA }}
        />
      </div>
    </div>
  );
}

function Tittel({ children, under }: { children: React.ReactNode; under?: string }) {
  return (
    <div className="mt-6">
      <h4
        className="text-[20px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[22px]"
        style={{ color: INK, fontFamily: 'var(--font-heading), sans-serif' }}
      >
        {children}
      </h4>
      {under && (
        <p className="mt-1.5 text-[13px] leading-[1.55]" style={{ color: MUTED }}>
          {under}
        </p>
      )}
    </div>
  );
}

// --- Steg 1: Adressen -------------------------------------------------------

export function MockAdresse() {
  const data = [
    { k: 'Bruksareal', v: '64 m²' },
    { k: 'Byggeår', v: '1962' },
    { k: 'Eierform', v: 'Selveier' },
    { k: 'Etasje', v: '3 av 4' },
  ];
  return (
    <Ramme>
      <div className="flex h-full flex-col">
        <Topp steg={1} />
        <Tittel under="Boligdata hentes automatisk fra offentlige registre.">
          Hvor ligger boligen?
        </Tittel>

        <div className="mt-5 flex h-12 items-center gap-3 rounded-xl border border-[#d9d2c7] bg-[#fdfcfa] px-4">
          <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.75} style={{ color: MUTED }} />
          <span className="flex-1 truncate text-[14px] font-medium" style={{ color: INK }}>
            Storgata 12, 0155 Oslo
          </span>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(155,91,214,0.12)' }}>
            <Check className="h-3 w-3" strokeWidth={2.5} style={{ color: LILLA }} />
          </span>
        </div>

        <div className="mt-5 divide-y divide-[#f0ece5] rounded-xl border border-[#eee9e2]">
          {data.map((d) => (
            <div key={d.k} className="flex items-center justify-between px-4 py-[10.5px]">
              <span className="text-[12.5px]" style={{ color: MUTED }}>{d.k}</span>
              <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: INK }}>{d.v}</span>
            </div>
          ))}
        </div>

        <p className="mt-auto flex items-center gap-1.5 text-[11.5px]" style={{ color: MUTED }}>
          <Check className="h-3 w-3" strokeWidth={2.5} style={{ color: LILLA }} />
          Hentet fra Kartverket og Matrikkelen
        </p>
      </div>
    </Ramme>
  );
}

// --- Steg 2: Boligen ---------------------------------------------------------

function Teller({ navn, verdi }: { navn: string; verdi: number }) {
  return (
    <div>
      <p className="mb-2 text-[11.5px] font-semibold" style={{ color: '#5a5145' }}>{navn}</p>
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-[#e0d9cf] bg-white" style={{ color: '#5a5145' }}>
          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span
          className="flex h-10 flex-1 items-center justify-center rounded-[11px] border border-[#e0d9cf] bg-[#fdfcfa] text-[15px] font-bold tabular-nums"
          style={{ color: INK, fontFamily: 'var(--font-heading), sans-serif' }}
        >
          {verdi}
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-[#e0d9cf] bg-white" style={{ color: '#5a5145' }}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}

export function MockBolig() {
  return (
    <Ramme>
      <div className="flex h-full flex-col">
        <Topp steg={2} />
        <Tittel under="Det som finnes i registrene, er allerede fylt ut.">
          Fortell om boligen
        </Tittel>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="aspect-[4/3] overflow-hidden rounded-[10px]">
            <img src="/interior-dining.webp" alt="" className="h-full w-full object-cover" />
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-[10px]">
            <img src="/interior-bedroom.webp" alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#d9d2c7] bg-[#fdfcfa]">
            <Plus className="h-4 w-4" strokeWidth={1.75} style={{ color: MUTED }} />
            <span className="text-[10px] font-medium" style={{ color: MUTED }}>Legg til</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Teller navn="Soverom" verdi={2} />
          <Teller navn="Bad" verdi={1} />
        </div>

        <div className="mt-auto flex items-center justify-between rounded-xl border border-[#eee9e2] px-4 py-3">
          <span className="text-[13px] font-medium" style={{ color: INK }}>Utleies møblert</span>
          <span className="relative h-[22px] w-[38px] rounded-full" style={{ background: LILLA }}>
            <span className="absolute right-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-sm" />
          </span>
        </div>
      </div>
    </Ramme>
  );
}

// --- Steg 3: Klar til utleie -------------------------------------------------

export function MockKlar() {
  return (
    <Ramme>
      <div className="flex h-full flex-col">
        <Topp steg={3} />

        <div className="mt-6 flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(155,91,214,0.12)' }}>
            <Check className="h-5 w-5" strokeWidth={2.25} style={{ color: LILLA }} />
          </span>
          <div>
            <h4
              className="text-[20px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[22px]"
              style={{ color: INK, fontFamily: 'var(--font-heading), sans-serif' }}
            >
              Boligen er utleieklar
            </h4>
            <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
              Annonseutkast og leiepris er generert.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3.5 rounded-xl border border-[#eee9e2] p-3">
          <div className="h-[58px] w-[74px] shrink-0 overflow-hidden rounded-[9px]">
            <img src="/nyest-hero-portrett.webp" alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold" style={{ color: INK }}>
              Lys 2-roms med balkong — Storgata 12
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: MUTED }}>
              18 500 kr/mnd · foreslått av AI
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[#eee9e2] px-2.5 py-1 text-[10.5px] font-semibold" style={{ color: MUTED }}>
            Utkast
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#eee9e2] px-4 py-3">
          <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} style={{ color: LILLA }} />
          <span className="text-[12.5px]" style={{ color: INK }}>Identitet bekreftet med BankID</span>
          <Check className="ml-auto h-3.5 w-3.5" strokeWidth={2.5} style={{ color: LILLA }} />
        </div>

        <button
          type="button"
          tabIndex={-1}
          className="pointer-events-none mt-auto flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1a1a1a] text-[14px] font-semibold text-white"
        >
          Publiser annonsen <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </Ramme>
  );
}
