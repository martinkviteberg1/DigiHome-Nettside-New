'use client';

/* ═══════════════ Brukere — egen modul for personer, roller og tilgang ═══════════════
   Flyttet ut av Saker (tidl. PersonerModal) til en fullverdig admin-side:
   · Oversiktstall (kontoer, innlogging, inviterte, administratorer)
   · Legg til person (passord ELLER e-postinvitasjon der brukeren velger selv)
   · Rediger navn/e-post/rolle/verv/grupper/moduler/møtetilgang inline
   · «Se som» — midlertidig impersonering slik at admin kan verifisere nøyaktig
     hva en annen konto ser (håndteres av forelderen via onImpersonate)
   API: GET/POST /api/admin/users, PUT/DELETE /api/admin/users/:id,
        POST /api/admin/users/:id/invite, POST /api/admin/impersonate (via forelder) */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, UserPlus, Plus, X, Check, Pencil, Trash2, Send, KeyRound, Loader2,
  Search, Eye, ShieldCheck, Mail, ChevronDown,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading)' };

const ROLLE_LABEL = { owner: 'Systemeier', admin: 'Admin', bruker: 'Bruker', partner: 'Partner', eier: 'Eier', investor: 'Investor' };
const ROLLE_VALG = [
  { v: 'bruker', l: 'Bruker', sub: 'Saker + møter de har tilgang til' },
  { v: 'partner', l: 'Partner', sub: 'Saker + møter de har tilgang til' },
  { v: 'eier', l: 'Eier', sub: 'Nøkkeltall + Økonomi (les) + møter' },
  { v: 'investor', l: 'Investor', sub: 'Datarom — ser KUN modulene du velger (les)' },
  { v: 'admin', l: 'Admin', sub: 'Full tilgang til hele admin' },
];
const GRUPPER_UI = [
  { k: 'styret', l: 'Styret' },
  { k: 'ledelsen', l: 'Ledelsen' },
  { k: 'utvikling', l: 'Utvikling' },
];
const MOTE_TILGANG_VALG = [
  { k: 'styremote', l: 'Styremøter' },
  { k: 'ledermote', l: 'Ledermøter' },
  { k: 'annet', l: 'Andre møter' },
];
const MOTE_TILGANG_LABEL = { styremote: 'Styremøter', ledermote: 'Ledermøter', annet: 'Andre møter' };
// Moduler gruppert etter hvor de bor: Datarom-seksjonen er investorens
// portal (lesetilgang), Ledelsesverktøy er interne driftsmoduler.
// «leieforhold» og «budsjett» styrer BÅDE datarom-visningen for investorer
// og de tilsvarende admin-modulene for bruker-/partnerroller.
const MODUL_GRUPPER = [
  {
    id: 'datarom',
    tittel: 'Datarom — investorportalen',
    sub: 'Lesetilgang. En investor ser kun modulene du huker av her.',
    valg: [
      { k: 'dr-oversikt', l: 'Oversikt', sub: 'Nøkkeltall, veksttrapp og fremtidsbilde' },
      { k: 'leieforhold', l: 'Leieforhold', sub: 'Porteføljen live — leie, honorar og kontrakter' },
      { k: 'dr-resultat', l: 'Regnskap', sub: 'Resultat per måned' },
      { k: 'dr-enheter', l: 'Enhetsøkonomi', sub: 'Margin per enhet, skalering og manpower-modell' },
      { k: 'budsjett', l: 'Budsjett', sub: 'Neste 12 mnd + kalenderår' },
      { k: 'dr-pipeline', l: 'Pipeline', sub: 'Enheter på vei inn' },
      { k: 'dr-selskap', l: 'Selskap', sub: 'Ansatte, gjeld og faste kostnader' },
      { k: 'dr-organisasjon', l: 'Organisasjon', sub: 'Styre & ledelse — kart for begge selskapene' },
      { k: 'dr-eierbok', l: 'Aksjeeierbok', sub: 'Aksjonærer, transaksjoner og cap table' },
      { k: 'dr-dokumenter', l: 'Dokumenter', sub: 'Delte filer og rapporter' },
    ],
  },
  {
    id: 'ledelse',
    tittel: 'Ledelsesverktøy',
    sub: 'Interne moduler for drift og ledelse.',
    valg: [
      { k: 'nokkeltall', l: 'Nøkkeltall', sub: 'Trafikk og konvertering' },
      { k: 'okonomi', l: 'Økonomi', sub: 'Inntekter og marginer' },
      { k: 'kunder', l: 'Kunder', sub: 'Kundeoversikt' },
      { k: 'i-leads', l: 'Leads', sub: 'Innkommende henvendelser' },
      { k: 'salgsradar', l: 'Salgsradar', sub: 'FINN-annonser → analyse og tilbud til huseiere' },
      { k: 'dokumenter', l: 'Dokumenter & signering', sub: 'Dokumenthub — opplasting, arkiv og BankID-signering' },
      { k: 'historikk', l: 'Historikk', sub: 'Endringslogg' },
    ],
  },
];
const MODUL_VALG = MODUL_GRUPPER.flatMap((g) => g.valg);
const MODUL_LABEL = Object.fromEntries(MODUL_VALG.map((m) => [m.k, m.l]));
const VERV_FORSLAG = ['Styreleder', 'Nestleder', 'Styremedlem', 'Varamedlem', 'Daglig leder', 'Økonomiansvarlig', 'Driftsansvarlig', 'Partner', 'Investor', 'Aksjonær'];

// Vervet foreslår fornuftig møtetilgang automatisk — kun et forslag.
function foreslaMoteTilgang(verv) {
  const v = String(verv || '').toLowerCase();
  if (!v) return null;
  if (/daglig leder|adm\.? ?dir|ceo/.test(v)) return ['styremote', 'ledermote'];
  if (/styre|investor|aksjon/.test(v)) return ['styremote'];
  if (/leder|sjef|direkt/.test(v)) return ['ledermote'];
  return null;
}

function Avatar({ member, size = 32 }) {
  const ini = String(member.name || member.email || '?').trim().slice(0, 1).toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: member.color || '#8b5cf6', fontSize: size * 0.42 }}
    >
      {ini}
    </div>
  );
}

/* Chips-velger (grupper / møtetilgang) — samme mønster som i Saker. */
function ChipVelger({ value, onChange, disabled, testid, valg }) {
  const valgt = Array.isArray(value) ? value : [];
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5" data-testid={testid}>
      {valg.map((o) => {
        const aktiv = valgt.includes(o.k);
        return (
          <button
            key={o.k}
            type="button"
            disabled={disabled}
            onClick={() => onChange(aktiv ? valgt.filter((x) => x !== o.k) : [...valgt, o.k])}
            data-testid={`${testid}-${o.k}`}
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
              aktiv ? 'bg-[#f4f0fb] text-[#6d28d9] ring-1 ring-[#8b5cf6]/30' : 'bg-[#f3f2f0] text-[#999] hover:text-[#555]'
            }`}
          >
            {aktiv && <Check className="h-3 w-3" />}{o.l}
          </button>
        );
      })}
    </div>
  );
}

/* ── Modulvelger: grupperte seksjoner (Datarom / Ledelsesverktøy) med
   beskrivelse per modul, «Velg alle»-snarvei og responsivt to-kolonners
   grid. Beholder testid-mønsteret `${testid}-${modulnøkkel}`. ── */
function ModulVelger({ value, onChange, disabled, testid, rolle }) {
  const valgt = Array.isArray(value) ? value : [];
  // Rekkefølge etter relevans: investorer ser Datarom først — alle andre
  // roller ser Ledelsesverktøy (interne moduler) øverst.
  const grupper = rolle === 'investor' ? MODUL_GRUPPER : [...MODUL_GRUPPER].slice().sort((a, b) => (a.id === 'ledelse' ? -1 : 1) - (b.id === 'ledelse' ? -1 : 1));
  return (
    <div className="space-y-3" data-testid={testid}>
      {grupper.map((g) => {
        const alleValgt = g.valg.every((o) => valgt.includes(o.k));
        const antall = g.valg.filter((o) => valgt.includes(o.k)).length;
        return (
          <div key={g.id} className={`rounded-xl border p-3 transition-colors ${g.id === 'datarom' && rolle === 'investor' ? 'border-[#8b5cf6]/25 bg-[#f4f0fb]/30' : 'border-black/[0.06]'}`} data-testid={`${testid}-gruppe-${g.id}`}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#78716c]">
                  {g.tittel}
                  {antall > 0 && <span className="ml-1.5 rounded-full bg-[#f4f0fb] px-1.5 py-[1px] text-[9.5px] text-[#6d28d9]">{antall}</span>}
                </p>
                <p className="mt-0.5 text-[11px] text-[#b3ada3]">{g.sub}</p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(alleValgt
                  ? valgt.filter((k) => !g.valg.some((o) => o.k === k))
                  : Array.from(new Set([...valgt, ...g.valg.map((o) => o.k)])))}
                data-testid={`${testid}-alle-${g.id}`}
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#8b5cf6] transition-colors hover:bg-[#f4f0fb] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {alleValgt ? 'Fjern alle' : 'Velg alle'}
              </button>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {g.valg.map((o) => {
                const aktiv = valgt.includes(o.k);
                return (
                  <button
                    key={o.k}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(aktiv ? valgt.filter((x) => x !== o.k) : [...valgt, o.k])}
                    data-testid={`${testid}-${o.k}`}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${aktiv ? 'bg-[#f4f0fb]' : 'hover:bg-[#fafaf8]'}`}
                  >
                    <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${aktiv ? 'border-[#8b5cf6] bg-[#8b5cf6]' : 'border-black/[0.16] bg-white'}`}>
                      {aktiv && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[12.5px] font-semibold leading-tight ${aktiv ? 'text-[#0a0a0a]' : 'text-[#57534e]'}`}>{o.l}</span>
                      <span className="block truncate text-[10.5px] leading-tight text-[#b3ada3]">{o.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Modalskall: bunn-ark på mobil, sentrert kort på desktop. Esc lukker,
   klikk på bakteppet lukker, body-scroll låses mens modalen er åpen. ── */
function ModalSkall({ tittel, undertittel, topp, onLukk, children, footer, testid }) {
  useEffect(() => {
    const paaTast = (e) => { if (e.key === 'Escape') onLukk(); };
    window.addEventListener('keydown', paaTast);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', paaTast); document.body.style.overflow = prev; };
  }, [onLukk]);
  return (
    <div className="fixed inset-0 z-[125] flex items-end justify-center sm:items-center sm:p-4" data-testid={testid}>
      <div className="absolute inset-0 bg-[#0a0a0a]/45 backdrop-blur-[2px]" onClick={onLukk} data-testid={`${testid}-bakteppe`} />
      <div className="dh-pop relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.28)] sm:max-h-[88dvh] sm:w-[660px] sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-3.5 sm:px-6 sm:py-4">
          {topp}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-[#0a0a0a]" style={heading}>{tittel}</p>
            {undertittel && <p className="mt-0.5 truncate text-[12px] text-[#a3a3a3]">{undertittel}</p>}
          </div>
          <button
            type="button" onClick={onLukk} data-testid={`${testid}-lukk`}
            className="shrink-0 rounded-lg p-2 text-[#bbb] transition-colors hover:bg-[#f3f2f0] hover:text-[#555]"
          >
            <X className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        <div className="border-t border-black/[0.05] bg-[#fcfcfb] px-4 py-3 sm:px-6 sm:py-3.5">{footer}</div>
      </div>
    </div>
  );
}

/* Kompakt rullegardin for rolle-valg (med undertekst per rolle). */
function RolleMeny({ value, onChange, testid, oppover = false }) {
  const [open, setOpen] = useState(false);
  const aktiv = ROLLE_VALG.find((o) => o.v === value) || ROLLE_VALG[0];
  useEffect(() => {
    if (!open) return;
    const lukk = () => setOpen(false);
    window.addEventListener('click', lukk);
    return () => window.removeEventListener('click', lukk);
  }, [open]);
  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        data-testid={testid}
        className="flex h-10 w-full items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13.5px] text-[#1a1a1a] outline-none transition-all hover:border-black/[0.16]"
      >
        <span className="flex-1 truncate text-left font-medium">{aktiv.l}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#bbb] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute left-0 z-30 w-[260px] rounded-xl border border-black/[0.07] bg-white p-1 shadow-[0_16px_48px_rgba(0,0,0,0.16)] ${oppover ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {ROLLE_VALG.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(o.v); setOpen(false); }}
              data-testid={`${testid}-${o.v}`}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${o.v === value ? 'bg-[#f4f0fb]' : 'hover:bg-[#f8f7f5]'}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-[#1a1a1a]">{o.l}</span>
                <span className="block truncate text-[11px] text-[#a3a3a3]">{o.sub}</span>
              </span>
              {o.v === value && <Check className="h-3.5 w-3.5 shrink-0 text-[#8b5cf6]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Brukere({ apiKey, user, onImpersonate }) {
  const [members, setMembers] = useState([]);
  const [laster, setLaster] = useState(true);
  const [sok, setSok] = useState('');
  const [nyOpen, setNyOpen] = useState(false);
  const [toast, setToast] = useState(null); // { tekst, type }

  // Ny person-skjema
  const [navn, setNavn] = useState('');
  const [epost, setEpost] = useState('');
  const [rolle, setRolle] = useState('bruker');
  const [passord, setPassord] = useState('');
  const [tittel, setTittel] = useState('');
  const [moteTilgang, setMoteTilgang] = useState([]);
  const [moduler, setModuler] = useState([]);
  const [grupper, setGrupper] = useState([]);
  const [inviter, setInviter] = useState(true);
  const [lagrer, setLagrer] = useState(false);

  // Redigering
  const [redigerId, setRedigerId] = useState(null);
  const [red, setRed] = useState({ name: '', email: '', role: 'bruker', password: '', tittel: '', moteTilgang: [], moduler: [], groups: [] });
  const [lagrerEndring, setLagrerEndring] = useState(false);
  const [inviterer, setInviterer] = useState(null);
  const [imiterer, setImiterer] = useState(null); // person-id under oppstart av «se som»

  const api = useCallback(
    (sti, opts) => fetch(`/api/admin/${sti}${sti.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`, opts),
    [apiKey],
  );

  const visToast = useCallback((tekst, type = 'ok') => {
    setToast({ tekst, type });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api('users');
        const j = await r.json();
        if (alive && j.ok) setMembers(j.members || []);
      } catch (e) {}
      if (alive) setLaster(false);
    })();
    return () => { alive = false; };
  }, [api]);

  const filtrert = useMemo(() => {
    const s = sok.trim().toLowerCase();
    if (!s) return members;
    return members.filter((m) => `${m.name} ${m.email} ${m.tittel} ${ROLLE_LABEL[m.role] || ''}`.toLowerCase().includes(s));
  }, [members, sok]);

  const stats = useMemo(() => ({
    totalt: members.length,
    innlogging: members.filter((m) => m.harPassord).length,
    inviterte: members.filter((m) => !m.harPassord && m.invitedAt).length,
    admins: members.filter((m) => ['owner', 'admin'].includes(m.role)).length,
  }), [members]);

  const minEpost = ((user && user.email) || '').toLowerCase();
  const erImpAkt = !!(user && user.impersonatedBy); // i «se som»-økt kan man ikke starte ny

  const leggTil = async () => {
    if (!navn.trim() || lagrer) return;
    setLagrer(true);
    try {
      const r = await api('users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: navn.trim(), email: epost.trim(), role: rolle, password: passord,
          tittel: tittel.trim(), moteTilgang, moduler, groups: grupper,
          invite: inviter && !!epost.trim() && !passord,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke legge til');
      setMembers((prev) => [...prev, j.member]);
      setNavn(''); setEpost(''); setPassord(''); setRolle('bruker'); setTittel(''); setMoteTilgang([]); setModuler([]); setGrupper([]);
      setNyOpen(false);
      visToast(j.invitert
        ? `Invitasjon sendt til ${j.member.email} — de velger eget passord`
        : j.member.harPassord ? `${j.member.name} lagt til — kan nå logge inn` : `${j.member.name} lagt til`);
    } catch (e) { visToast(e.message, 'feil'); }
    setLagrer(false);
  };

  const sendInvitasjon = async (m) => {
    if (inviterer) return;
    setInviterer(m.id);
    try {
      const r = await api(`users/${m.id}/invite`, { method: 'POST' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke sende invitasjon');
      if (j.member) setMembers((prev) => prev.map((x) => (x.id === m.id ? j.member : x)));
      if (j.invitert) visToast(`Invitasjon sendt til ${m.email}`);
      else visToast('Invitasjonen ble ikke sendt — e-post er ikke konfigurert', 'feil');
    } catch (e) { visToast(e.message, 'feil'); }
    setInviterer(null);
  };

  const lagreEndring = async (id) => {
    if (lagrerEndring) return;
    setLagrerEndring(true);
    try {
      const payload = { name: red.name.trim(), email: red.email.trim(), role: red.role, tittel: red.tittel.trim(), moteTilgang: red.moteTilgang, moduler: red.moduler, groups: red.groups };
      if (red.password) payload.password = red.password;
      const r = await api(`users/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Lagring feilet');
      setMembers((prev) => prev.map((m) => (m.id === id ? j.member : m)));
      setRedigerId(null);
      visToast('Lagret');
    } catch (e) { visToast(e.message, 'feil'); }
    setLagrerEndring(false);
  };

  const slettPerson = async (m) => {
    if (!window.confirm(`Fjerne ${m.name}? Kontoen slettes og saker de er ansvarlig for beholdes uten ansvarlig.`)) return;
    try {
      const r = await api(`users/${m.id}`, { method: 'DELETE' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke fjerne');
      setMembers((prev) => prev.filter((x) => x.id !== m.id));
      visToast(`${m.name} fjernet`);
    } catch (e) { visToast(e.message, 'feil'); }
  };

  const seSom = async (m) => {
    if (imiterer || !onImpersonate) return;
    setImiterer(m.id);
    try { await onImpersonate(m); } catch (e) {}
    setImiterer(null);
  };

  const felt = 'h-10 min-w-0 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13.5px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15';

  const statKort = [
    { l: 'Personer', v: stats.totalt, icon: Users, farge: '#8b5cf6' },
    { l: 'Kan logge inn', v: stats.innlogging, icon: KeyRound, farge: '#059669' },
    { l: 'Invitert — venter', v: stats.inviterte, icon: Mail, farge: '#d97706' },
    { l: 'Administratorer', v: stats.admins, icon: ShieldCheck, farge: '#0ea5e9' },
  ];

  return (
    <div className="mx-auto max-w-[980px]" data-testid="brukere-modul">
      {/* Toast */}
      {toast && (
        <div className={`dh-pop fixed bottom-6 left-1/2 z-[130] flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_40px_rgba(0,0,0,0.3)] ${toast.type === 'feil' ? 'bg-rose-600' : 'bg-[#0a0a0a]'}`} data-testid="brukere-toast">
          {toast.type === 'feil' ? <X className="h-4 w-4" /> : <Check className="h-4 w-4 text-emerald-400" />}
          {toast.tekst}
        </div>
      )}

      {/* Statistikk */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statKort.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.l} className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${s.farge}14` }}>
                  <Icon className="h-4 w-4" style={{ color: s.farge }} />
                </span>
                <span className="text-[22px] font-bold tabular-nums text-[#0a0a0a]" style={heading}>{s.v}</span>
              </div>
              <p className="mt-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">{s.l}</p>
            </div>
          );
        })}
      </div>

      {/* Verktøylinje */}
      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1 sm:max-w-[320px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#bbb]" />
          <input
            value={sok} onChange={(e) => setSok(e.target.value)}
            placeholder="Søk etter navn, e-post eller rolle …"
            data-testid="brukere-sok"
            className="h-10 w-full rounded-full border border-black/[0.06] bg-white pl-9 pr-3 text-[13.5px] outline-none shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all placeholder:text-[#bbb] focus:border-[#8b5cf6]/40 focus:ring-2 focus:ring-[#8b5cf6]/12"
          />
        </div>
        <button
          onClick={() => setNyOpen((o) => !o)}
          data-testid="brukere-ny-btn"
          className="ml-auto flex h-10 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[13.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
        >
          {nyOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {nyOpen ? 'Lukk' : 'Ny person'}
        </button>
      </div>

      {/* Legg til person — modal */}
      {nyOpen && (
        <ModalSkall
          testid="brukere-ny-panel"
          tittel="Legg til person"
          undertittel="Inviter via e-post — eller sett passord manuelt"
          topp={<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f0fb]"><UserPlus className="h-4 w-4 text-[#8b5cf6]" /></span>}
          onLukk={() => setNyOpen(false)}
          footer={(
            <div className="flex items-center gap-2">
              <p className="mr-auto hidden min-w-0 truncate text-[11px] text-[#b5b5b5] sm:block">
                {passord ? 'Du setter passordet manuelt — ingen invitasjon sendes.' : 'Uten passord eller invitasjon: kan stå som ansvarlig og få varsler, men ikke logge inn.'}
              </p>
              <button
                type="button" onClick={() => setNyOpen(false)}
                className="flex h-10 shrink-0 items-center rounded-lg px-3.5 text-[13.5px] font-semibold text-[#777] transition-colors hover:bg-[#f3f2f0] hover:text-[#333]"
              >
                Avbryt
              </button>
              <button
                onClick={leggTil}
                disabled={!navn.trim() || lagrer}
                data-testid="member-add-btn"
                className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0a0a0a] px-4 text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40"
              >
                {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-[18px] w-[18px]" />}
                <span className="text-[13.5px] font-semibold">Legg til</span>
              </button>
            </div>
          )}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn" data-testid="member-name-input" className={felt} />
            <input value={epost} onChange={(e) => setEpost(e.target.value)} placeholder="E-post (varsler + innlogging)" data-testid="member-email-input" className={felt} />
            <RolleMeny value={rolle} onChange={setRolle} testid="member-role-input" />
            <input
              value={tittel}
              onChange={(e) => {
                const v = e.target.value;
                setTittel(v);
                if (!moteTilgang.length) {
                  const forslag = foreslaMoteTilgang(v);
                  if (forslag) setMoteTilgang(forslag);
                }
              }}
              list="verv-forslag" placeholder="Verv — f.eks. Styreleder (valgfritt)"
              data-testid="member-tittel-input" className={felt}
            />
          </div>

          <div className="mt-4 rounded-xl border border-black/[0.06] p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]"><KeyRound className="h-3.5 w-3.5" /> Innlogging</p>
            <input
              type="password" value={passord} onChange={(e) => setPassord(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') leggTil(); }}
              placeholder="Passord (valgfritt — eller bruk invitasjon)"
              autoComplete="new-password" data-testid="member-password-input" className={`${felt} mt-2 w-full`}
            />
            <label className={`mt-2.5 flex items-center gap-2 select-none ${!epost.trim() || passord ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={inviter && !!epost.trim() && !passord}
                disabled={!epost.trim() || !!passord}
                onChange={(e) => setInviter(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#8b5cf6]"
                data-testid="member-invite-toggle"
              />
              <span className="text-[12px] text-[#666]">Send velkomst-e-post — brukeren aktiverer kontoen og velger eget passord</span>
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Ser møter</p>
              <ChipVelger value={moteTilgang} onChange={setMoteTilgang} disabled={rolle === 'admin'} testid="member-motetilgang" valg={MOTE_TILGANG_VALG} />
            </div>
            <div className="min-w-0">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Grupper</p>
              <ChipVelger value={grupper} onChange={setGrupper} disabled={rolle === 'admin'} testid="member-groups" valg={GRUPPER_UI} />
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]"><ShieldCheck className="h-3.5 w-3.5" /> Modultilgang</p>
            {rolle === 'admin'
              ? <p className="rounded-xl bg-[#fafaf8] px-3.5 py-2.5 text-[12px] text-[#999]">Admin har full tilgang til alt — modulvalg trengs ikke.</p>
              : <ModulVelger value={moduler} onChange={setModuler} testid="member-moduler" rolle={rolle} />}
          </div>
        </ModalSkall>
      )}
      <datalist id="verv-forslag">
        {VERV_FORSLAG.map((v) => <option key={v} value={v} />)}
      </datalist>

      {/* Personliste */}
      <div className="mt-4 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        {laster && (
          <div className="flex items-center justify-center py-14"><Loader2 className="h-5 w-5 animate-spin text-[#cf97fc]" /></div>
        )}
        {!laster && !filtrert.length && (
          <div className="py-12 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f0fb]">
              <UserPlus className="h-5 w-5 text-[#8b5cf6]" />
            </span>
            <p className="mt-3 text-[13px] text-[#999]">{sok ? `Ingen treff på «${sok}»` : 'Ingen personer ennå — legg til den første med «Ny person».'}</p>
          </div>
        )}
        {!laster && filtrert.map((m, idx) => (
          <div key={m.id} className={`px-5 py-3.5 ${idx > 0 ? 'border-t border-black/[0.04]' : ''}`} data-testid={`member-row-${m.id}`}>
            {(
              <div className="flex items-center gap-3">
                <Avatar member={m} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[14px] font-semibold text-[#1a1a1a]">{m.name}</p>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      m.role === 'owner' ? 'bg-[#0a0a0a] text-white' : m.role === 'admin' ? 'bg-[#f4f0fb] text-[#8b5cf6]' : m.role === 'eier' ? 'bg-[#eff6ff] text-[#2563eb]' : m.role === 'investor' ? 'bg-[#fdf3e0] text-[#9a6b1c]' : m.role === 'partner' ? 'bg-[#f0fdfa] text-[#0d9488]' : 'bg-[#f3f2f0] text-[#888]'
                    }`}>{ROLLE_LABEL[m.role] || m.role}</span>
                    {m.tittel && (
                      <span title="Verv" className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#777] ring-1 ring-black/[0.08]" data-testid={`member-verv-${m.id}`}>{m.tittel}</span>
                    )}
                    {m.harPassord && (
                      <span title="Har passord — kan logge inn" className="shrink-0 text-emerald-500"><KeyRound className="h-3.5 w-3.5" /></span>
                    )}
                    {!m.harPassord && m.invitedAt && (
                      <span title="Invitasjon sendt — venter på at brukeren velger passord" className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">Invitert</span>
                    )}
                  </div>
                  <p className="truncate text-[12px] text-[#999]">{m.email || 'Ingen e-post — får ikke varsler'}{m.harPassord ? ' · kan logge inn' : ''}{['bruker', 'partner', 'eier', 'investor'].includes(m.role) && (m.moteTilgang || []).length > 0 ? ` · ser ${m.moteTilgang.map((k) => (MOTE_TILGANG_LABEL[k] || k).toLowerCase()).join(', ')}` : ''}{['bruker', 'partner', 'eier', 'investor'].includes(m.role) && (m.moduler || []).length > 0 ? ` · moduler: ${m.moduler.map((k) => MODUL_LABEL[k] || k).join(', ')}` : ''}{['bruker', 'partner'].includes(m.role) && (m.groups || []).length > 0 ? ` · grupper: ${m.groups.map((k) => (GRUPPER_UI.find((g) => g.k === k) || { l: k }).l).join(', ')}` : ''}</p>
                </div>
                {/* «Se som» — kun for andre kontoer, aldri owner, aldri i pågående økt */}
                {m.role !== 'owner' && (m.email || '').toLowerCase() !== minEpost && !erImpAkt && (
                  <button
                    onClick={() => seSom(m)}
                    title={`Se portalen som ${m.name} — trygg, midlertidig økt (1 t)`}
                    data-testid={`member-impersonate-${m.id}`}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-[#f4f0fb] px-2.5 text-[12px] font-semibold text-[#6d28d9] transition-all hover:bg-[#ece4fa] active:scale-[0.97]"
                  >
                    {imiterer === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Se som</span>
                  </button>
                )}
                {m.email && !m.harPassord && (
                  <button
                    onClick={() => sendInvitasjon(m)}
                    title={m.invitedAt ? 'Send invitasjonen på nytt' : 'Send invitasjon — brukeren velger eget passord'}
                    data-testid={`member-invite-${m.id}`}
                    className="rounded-lg p-2 text-[#bbb] hover:bg-[#f4f0fb] hover:text-[#8b5cf6]"
                  >
                    {inviterer === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                )}
                <button
                  onClick={() => { setRedigerId(m.id); setRed({ name: m.name, email: m.email || '', role: m.role || 'bruker', password: '', tittel: m.tittel || '', moteTilgang: Array.isArray(m.moteTilgang) ? m.moteTilgang : [], moduler: Array.isArray(m.moduler) ? m.moduler : [], groups: Array.isArray(m.groups) ? m.groups : [] }); }}
                  data-testid={`member-edit-${m.id}`}
                  className="rounded-lg p-2 text-[#bbb] hover:bg-[#f3f2f0] hover:text-[#555]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {m.role !== 'owner' && (
                  <button onClick={() => slettPerson(m)} data-testid={`member-delete-${m.id}`} className="rounded-lg p-2 text-[#bbb] hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rediger person — modal */}
      {redigerId && (() => {
        const m = members.find((x) => x.id === redigerId);
        if (!m) return null;
        const erOwner = m.role === 'owner';
        return (
          <ModalSkall
            testid="brukere-rediger-modal"
            tittel={m.name || m.email || 'Rediger person'}
            undertittel={`${ROLLE_LABEL[m.role] || m.role}${m.email ? ` · ${m.email}` : ''}${m.harPassord ? ' · kan logge inn' : m.invitedAt ? ' · invitert, venter' : ''}`}
            topp={<Avatar member={m} size={36} />}
            onLukk={() => setRedigerId(null)}
            footer={(
              <div className="flex items-center gap-2">
                {!erOwner && (m.email || '').toLowerCase() !== minEpost && !erImpAkt && (
                  <button
                    type="button"
                    onClick={() => { setRedigerId(null); seSom(m); }}
                    data-testid="red-sesom-btn"
                    className="mr-auto flex h-10 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold text-[#6d28d9] transition-colors hover:bg-[#f4f0fb]"
                  >
                    <Eye className="h-3.5 w-3.5" /> Se som
                  </button>
                )}
                <button
                  type="button" onClick={() => setRedigerId(null)} data-testid="red-avbryt-btn"
                  className="ml-auto flex h-10 shrink-0 items-center rounded-lg px-3.5 text-[13.5px] font-semibold text-[#777] transition-colors hover:bg-[#f3f2f0] hover:text-[#333]"
                >
                  Avbryt
                </button>
                <button
                  onClick={() => lagreEndring(m.id)}
                  disabled={!red.name.trim() || lagrerEndring}
                  data-testid="red-lagre-btn"
                  className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0a0a0a] px-4 text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40"
                >
                  {lagrerEndring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span className="text-[13.5px] font-semibold">Lagre</span>
                </button>
              </div>
            )}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input value={red.name} onChange={(e) => setRed((p) => ({ ...p, name: e.target.value }))} placeholder="Navn" data-testid="red-name-input" className={felt} />
              <input value={red.email} onChange={(e) => setRed((p) => ({ ...p, email: e.target.value }))} placeholder="E-post" data-testid="red-email-input" className={felt} />
              {erOwner ? (
                <div className="flex h-10 items-center rounded-lg bg-[#fafaf8] px-2.5 text-[13px] font-medium text-[#999]">Systemeier — rollen kan ikke endres</div>
              ) : (
                <RolleMeny value={red.role} onChange={(v) => setRed((p) => ({ ...p, role: v }))} testid="red-role-input" />
              )}
              <input
                value={red.tittel}
                onChange={(e) => setRed((p) => ({ ...p, tittel: e.target.value }))}
                list="verv-forslag" placeholder="Verv — f.eks. Styreleder (valgfritt)"
                data-testid="red-tittel-input" className={felt}
              />
            </div>

            <div className="mt-4 rounded-xl border border-black/[0.06] p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]"><KeyRound className="h-3.5 w-3.5" /> Innlogging</p>
              <input
                type="password" value={red.password} onChange={(e) => setRed((p) => ({ ...p, password: e.target.value }))}
                placeholder={m.harPassord ? 'Nytt passord — la stå tom for å beholde' : 'Sett passord (valgfritt)'}
                autoComplete="new-password" data-testid="red-password-input" className={`${felt} mt-2 w-full`}
              />
              {m.email && !m.harPassord && (
                <p className="mt-2 text-[11.5px] text-[#a3a3a3]">{m.invitedAt ? 'Invitasjon er sendt — brukeren har ikke valgt passord ennå.' : 'Tips: send invitasjon fra personlisten, så velger brukeren eget passord.'}</p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Ser møter</p>
                <ChipVelger value={red.moteTilgang} onChange={(v) => setRed((p) => ({ ...p, moteTilgang: v }))} disabled={red.role === 'admin'} testid="red-motetilgang" valg={MOTE_TILGANG_VALG} />
              </div>
              <div className="min-w-0">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Grupper</p>
                <ChipVelger value={red.groups} onChange={(v) => setRed((p) => ({ ...p, groups: v }))} disabled={red.role === 'admin'} testid="red-groups" valg={GRUPPER_UI} />
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]"><ShieldCheck className="h-3.5 w-3.5" /> Modultilgang</p>
              {['owner', 'admin'].includes(red.role) || erOwner
                ? <p className="rounded-xl bg-[#fafaf8] px-3.5 py-2.5 text-[12px] text-[#999]">{erOwner ? 'Systemeier' : 'Admin'} har full tilgang til alt — modulvalg trengs ikke.</p>
                : <ModulVelger value={red.moduler} onChange={(v) => setRed((p) => ({ ...p, moduler: v }))} testid="red-moduler" rolle={red.role} />}
            </div>
          </ModalSkall>
        );
      })()}

      <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-[#b5b5b5]">
        <ShieldCheck className="h-3.5 w-3.5" /> «Se som» gir en midlertidig økt (1 time) med den valgte kontoens tilgang — alle oppstarter logges.
      </p>
    </div>
  );
}
