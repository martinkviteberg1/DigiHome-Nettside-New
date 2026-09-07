'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   ModellTopplinje — ÉN smart topplinje for budsjettmodellene (Digihome AS og
   Digihome Tech AS). Erstatter to knapperader med én linje, gruppert etter
   hensikt:

     venstre  ← · selskapsmerke · navn · [status ▾] · [periode · horisont ▾]
     høyre    (modellens egne kontroller: scenario, forutsetninger)
              [Del ▾]  investorrom · deck · Excel · PDF
              [⋯]      omvisning · dupliser · slett
              [Lagre]  primær, med ulagret-prikk

   · Horisont (1/2/3 år) og status (utkast/vedtatt) er popovers på sine egne
     piller — ingen egne knapperader.
   · Klistrer seg til toppen (lg+) så «Lagre» alltid er innen rekkevidde.
   · Samme komponent for begge selskap → identisk muskelminne.
   ───────────────────────────────────────────────────────────────────────────── */

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ChevronDown, Check, Loader2, CalendarDays, Eye, EyeOff, Share2, MoreHorizontal, Trash2,
} from 'lucide-react';
import { SelskapMerke } from '@/components/admin/SelskapOkonomi';

export const heading = { fontFamily: 'var(--font-heading, inherit)' };
export const KNAPP_PRIMAER = 'flex h-9 items-center gap-1.5 rounded-[9px] bg-[#141414] px-4 text-[13px] font-medium text-white transition-colors hover:bg-black/80 active:scale-[0.98] disabled:opacity-40';
export const PILL = 'flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-medium text-[#57534e] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition-all hover:text-[#1c1917] hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.16)] disabled:opacity-50';
export const PILL_AKTIV = 'flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#141414] px-3 text-[12.5px] font-medium text-white transition-all hover:bg-black/80';
export const PILL_LILLA = 'flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#f0ebfa] px-3 text-[12.5px] font-medium text-[#6d28d9] transition-all hover:bg-[#e7defa]';

const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const ymDeler = (ym) => { const [y, m] = String(ym || '').split('-').map(Number); return { y, m }; };
const ymPluss = (ym, i) => { const { y, m } = ymDeler(ym); const t = y * 12 + (m - 1) + i; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; };
const mndLang = (ym) => { const { y, m } = ymDeler(ym); return m >= 1 && m <= 12 ? `${MND_KORT[m - 1]}. ${y}` : ym; };
const stor = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const periode = (startYm, n) => `${stor(mndLang(startYm))} – ${mndLang(ymPluss(startYm, Math.max(1, n) - 1))}`;

const STATUSER = {
  utkast: { label: 'Utkast', prikk: 'bg-[#c2beb8]', tekst: 'text-[#57534e]', under: 'Arbeidsversjon — kan endres fritt.' },
  vedtatt: { label: 'Vedtatt', prikk: 'bg-[#0a7d55]', tekst: 'text-[#0a7d55]', under: 'Styringsbudsjettet. Faktisk måles mot dette — kun ett vedtatt per periode.' },
};

/* ── Meny: generisk nedtrekk med utenfor-klikk og Esc ── */
export function Meny({ knapp, aapen, onLukk, bredde = 268, align = 'right', children, testid }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!aapen) return undefined;
    const klikk = (e) => { if (ref.current && !ref.current.contains(e.target)) onLukk(); };
    const esc = (e) => { if (e.key === 'Escape') onLukk(); };
    document.addEventListener('mousedown', klikk);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', klikk); document.removeEventListener('keydown', esc); };
  }, [aapen, onLukk]);
  return (
    <div className="relative shrink-0" ref={ref}>
      {knapp}
      {aapen && (
        <div role="menu" data-testid={testid} style={{ width: bredde }}
          className={`absolute top-[calc(100%+6px)] z-[60] origin-top-right rounded-[16px] bg-white p-1.5 shadow-[0_16px_48px_rgba(20,17,14,0.16)] ring-1 ring-black/[0.06] animate-in fade-in zoom-in-95 duration-150 ${align === 'right' ? 'right-0' : 'left-0 origin-top-left'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export const MenyTittel = ({ children }) => (
  <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">{children}</p>
);
export const MenySkille = () => <div className="mx-1.5 my-1 border-t border-black/[0.06]" />;

export function MenyValg({ ikon: Ikon, ikonFarge, label, under, onClick, href, valgt, farlig, busy, disabled, testid, hoyre }) {
  const cls = `flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors ${farlig ? 'text-[#b3261e] hover:bg-[#fdf0ef]' : 'text-[#1c1917] hover:bg-[#f7f6f3]'} disabled:opacity-40`;
  const inn = (
    <>
      {Ikon && <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] ${farlig ? 'bg-[#fdf0ef]' : 'bg-[#f5f4f1]'}`}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8f8a82]" /> : <Ikon className={`h-3.5 w-3.5 ${farlig ? 'text-[#b3261e]' : ikonFarge || 'text-[#57534e]'}`} />}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{label}</span>
        {under && <span className={`block text-[11px] leading-snug ${farlig ? 'text-[#b3261e]/70' : 'text-[#a6a19a]'}`}>{under}</span>}
      </span>
      {hoyre}
      {valgt && <Check className="h-3.5 w-3.5 shrink-0 text-[#6d28d9]" />}
    </>
  );
  if (href) return <a href={href} target="_blank" rel="noopener" onClick={onClick} data-testid={testid} className={cls}>{inn}</a>;
  return <button type="button" onClick={onClick} disabled={disabled || busy} data-testid={testid} className={cls} role="menuitem">{inn}</button>;
}

/* ── Bryter (toggle) i menyrad ── */
const Bryter = ({ paa }) => (
  <span className={`relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors ${paa ? 'bg-[#6d28d9]' : 'bg-[#d6d3cd]'}`} aria-hidden>
    <span className={`absolute top-[3px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all ${paa ? 'left-[17px]' : 'left-[3px]'}`} />
  </span>
);

export default function ModellTopplinje({
  selskap = 'digihome', navn, onNavn, readOnly = false, onTilbake,
  startYm, antallMnd, onHorisont, horisontBusy = 0, horisontHint,
  status = 'utkast', onStatus,
  investorSynlig = false, onInvestorSynlig,
  delValg = [], merValg = [], onSlett,
  skittent = false, lagrer = false, lagret = false, onLagre,
  feil, venstreEkstra, children, testPrefix = 'modell',
}) {
  const [meny, setMeny] = useState(null); // 'horisont' | 'status' | 'del' | 'mer' | null
  const [sletteBekreft, setSletteBekreft] = useState(false);
  const lukk = () => { setMeny(null); setSletteBekreft(false); };
  const veksle = (id) => setMeny((m) => (m === id ? null : id));
  const st = STATUSER[status] || STATUSER.utkast;
  const tp = testPrefix;
  const horisonter = [[12, '1 år'], [24, '2 år'], [36, '3 år']];
  const egendefinert = !horisonter.some(([n]) => n === antallMnd);
  const visDel = !readOnly && (onInvestorSynlig || delValg.length > 0);
  const visMer = !readOnly && (merValg.length > 0 || onSlett);

  return (
    <div className="z-30 -mx-4 -mt-3 border-b border-black/[0.05] bg-[#f7f6f3]/92 px-4 pb-2.5 pt-2.5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:sticky lg:top-0" data-testid={`${tp}-topplinje`}>
      <div className="flex items-center gap-2">
        {/* ── Venstre: identitet ── */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button onClick={() => onTilbake?.()} data-testid="budsjett-tilbake" title="Alle budsjetter"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8f8a82] transition-colors hover:bg-black/[0.05] hover:text-[#1c1917]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span title={selskap === 'tech' ? 'Digihome Tech AS' : 'Digihome AS'} data-testid={`${tp}-selskap`}><SelskapMerke id={selskap} storrelse={26} /></span>
          {readOnly || !onNavn ? (
            <h2 className="truncate text-[18px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{navn}</h2>
          ) : (
            <input value={navn} maxLength={80} data-testid={`${tp}-navn`} onChange={(e) => onNavn(e.target.value)}
              className="-ml-1 w-[160px] min-w-0 shrink rounded-[8px] border border-transparent bg-transparent px-1 text-[18px] font-bold tracking-[-0.01em] text-[#1c1917] outline-none transition-colors hover:border-black/[0.07] focus:border-black/[0.15] sm:w-[240px] xl:w-[300px]" style={heading} />
          )}

          {/* Status: utkast / vedtatt — popover */}
          {onStatus && !readOnly ? (
            <Meny aapen={meny === 'status'} onLukk={lukk} bredde={288} align="left" testid={`${tp}-status-meny`}
              knapp={(
                <button onClick={() => veksle('status')} data-testid={`${tp}-status`} title="Budsjettets status"
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white pl-2.5 pr-2 text-[12px] font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition-all hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.16)] ${st.tekst}`}>
                  <span className={`h-2 w-2 rounded-full ${st.prikk}`} />
                  {st.label}
                  <ChevronDown className={`h-3 w-3 text-[#c2beb8] transition-transform ${meny === 'status' ? 'rotate-180' : ''}`} />
                </button>
              )}>
              <MenyTittel>Status</MenyTittel>
              {Object.entries(STATUSER).map(([id, v]) => (
                <MenyValg key={id} label={v.label} under={v.under} valgt={status === id} testid={`${tp}-status-${id}`}
                  ikon={() => <span className={`h-2.5 w-2.5 rounded-full ${v.prikk}`} />}
                  onClick={() => { if (status !== id) onStatus(id); lukk(); }} />
              ))}
            </Meny>
          ) : (
            <span className={`hidden h-8 shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 text-[12px] font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] sm:flex ${st.tekst}`} data-testid={`${tp}-status`}>
              <span className={`h-2 w-2 rounded-full ${st.prikk}`} />{st.label}
            </span>
          )}

          {/* Periode + horisont — popover */}
          {onHorisont && !readOnly ? (
            <Meny aapen={meny === 'horisont'} onLukk={lukk} bredde={300} align="left" testid={`${tp}-horisont-meny`}
              knapp={(
                <button onClick={() => veksle('horisont')} data-testid={`${tp}-horisont`} disabled={Boolean(horisontBusy)}
                  title="Periode og horisont — utvid planen til 2 eller 3 år"
                  className="hidden h-8 shrink-0 items-center gap-1.5 rounded-full bg-white pl-2.5 pr-2 text-[12px] font-medium text-[#57534e] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition-all hover:text-[#1c1917] hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.16)] disabled:opacity-60 md:flex">
                  {horisontBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8f8a82]" /> : <CalendarDays className="h-3.5 w-3.5 text-[#a6a19a]" />}
                  <span className="hidden xl:inline">{periode(startYm, antallMnd)}</span>
                  <span className="hidden xl:inline text-[#c2beb8]">·</span>
                  <span className="font-semibold text-[#1c1917]">{antallMnd} mnd</span>
                  <ChevronDown className={`h-3 w-3 text-[#c2beb8] transition-transform ${meny === 'horisont' ? 'rotate-180' : ''}`} />
                </button>
              )}>
              <MenyTittel>Horisont</MenyTittel>
              {horisonter.map(([n, l]) => (
                <MenyValg key={n} label={l} under={periode(startYm, n)} valgt={antallMnd === n} busy={horisontBusy === n} testid={`${tp}-horisont-${n}`}
                  ikon={() => <span className="text-[11px] font-bold text-[#57534e]">{n}</span>}
                  onClick={async () => { if (antallMnd !== n) await onHorisont(n); lukk(); }} />
              ))}
              {egendefinert && (
                <MenyValg label={`Egendefinert · ${antallMnd} mnd`} under={periode(startYm, antallMnd)} valgt disabled ikon={() => <span className="text-[11px] font-bold text-[#57534e]">{antallMnd}</span>} />
              )}
              {horisontHint && <p className="px-2.5 pb-1.5 pt-1.5 text-[11px] leading-snug text-[#a6a19a]">{horisontHint}</p>}
            </Meny>
          ) : (
            <span className="hidden shrink-0 text-[12.5px] text-[#a6a19a] lg:block" data-testid={`${tp}-periode`}>{periode(startYm, antallMnd)} · {antallMnd} mnd</span>
          )}
          {venstreEkstra}
        </div>

        {/* ── Høyre: handlinger ── */}
        <div className="flex shrink-0 items-center gap-2">
          {children}

          {visDel && (
            <Meny aapen={meny === 'del'} onLukk={lukk} bredde={292} testid={`${tp}-del-meny`}
              knapp={(
                <button onClick={() => veksle('del')} data-testid={`${tp}-del`} title={investorSynlig ? 'Delt med investorrommet — deling og eksport' : 'Deling og eksport'}
                  className={investorSynlig ? PILL_LILLA : PILL}>
                  {investorSynlig ? <Eye className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                  <span className="hidden sm:block">{investorSynlig ? 'Delt' : 'Del'}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${meny === 'del' ? 'rotate-180' : ''} ${investorSynlig ? 'text-[#a78bfa]' : 'text-[#c2beb8]'}`} />
                </button>
              )}>
              {onInvestorSynlig && (
                <>
                  <MenyTittel>Investorrom</MenyTittel>
                  <MenyValg ikon={investorSynlig ? Eye : EyeOff} ikonFarge={investorSynlig ? 'text-[#6d28d9]' : undefined}
                    label="Synlig i investorrommet" under={investorSynlig ? 'Investorene ser tallene — alltid skrivebeskyttet' : 'Ikke delt — kun synlig for dere'}
                    testid="budsjett-investor-bryter" hoyre={<Bryter paa={investorSynlig} />}
                    onClick={() => onInvestorSynlig(!investorSynlig)} />
                </>
              )}
              {delValg.length > 0 && (
                <>
                  {onInvestorSynlig && <MenySkille />}
                  <MenyTittel>Presenter og eksporter</MenyTittel>
                  {delValg.map((v) => (
                    <MenyValg key={v.id} ikon={v.ikon} ikonFarge={v.ikonFarge} label={v.label} under={v.under} href={v.href} busy={v.busy} testid={v.testid}
                      onClick={() => { v.onClick?.(); if (!v.href) lukk(); else lukk(); }} />
                  ))}
                </>
              )}
            </Meny>
          )}

          {visMer && (
            <Meny aapen={meny === 'mer'} onLukk={lukk} bredde={272} testid={`${tp}-mer-meny`}
              knapp={(
                <button onClick={() => veksle('mer')} data-testid={`${tp}-mer`} title="Mer"
                  className={`${PILL} w-9 justify-center px-0`}>
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              )}>
              {merValg.map((v) => (
                <MenyValg key={v.id} ikon={v.ikon} ikonFarge={v.ikonFarge} label={v.label} under={v.under} busy={v.busy} testid={v.testid}
                  onClick={() => { v.onClick?.(); lukk(); }} />
              ))}
              {onSlett && (
                <>
                  {merValg.length > 0 && <MenySkille />}
                  {!sletteBekreft ? (
                    <MenyValg ikon={Trash2} farlig label="Slett budsjettet" under="Kan ikke angres" testid="budsjett-slett" onClick={() => setSletteBekreft(true)} />
                  ) : (
                    <div className="rounded-[10px] bg-[#fdf0ef] px-2.5 py-2" data-testid="budsjett-slett-bekreft-boks">
                      <p className="text-[12.5px] font-semibold text-[#b3261e]">Slette «{navn}»?</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <button onClick={() => { onSlett(); lukk(); }} data-testid="budsjett-slett-bekreft" className="h-7 rounded-[7px] bg-[#b3261e] px-2.5 text-[12px] font-bold text-white transition-colors hover:bg-[#8f1d17]">Ja, slett</button>
                        <button onClick={() => setSletteBekreft(false)} className="h-7 rounded-[7px] px-2 text-[12px] font-medium text-[#8f8a82] hover:text-[#1c1917]">Avbryt</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Meny>
          )}

          {!readOnly && onLagre && (
            <button onClick={() => onLagre()} disabled={lagrer || !skittent} data-testid={`${tp}-lagre`} className={`${KNAPP_PRIMAER} relative`}>
              {lagrer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : lagret ? <Check className="h-3.5 w-3.5" /> : null}
              {lagret ? 'Lagret' : 'Lagre'}
              {skittent && !lagrer && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#6d28d9] ring-2 ring-[#f7f6f3]" title="Ulagrede endringer" />}
            </button>
          )}
        </div>
      </div>
      {feil && <p className="mt-2 text-[12.5px] text-[#b3261e]" data-testid={`${tp}-feil`}>{feil}</p>}
    </div>
  );
}
