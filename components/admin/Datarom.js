'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   DATAROM — investorrommet. Seks sider (styrt av `tab` fra sidemenyen):
     oversikt   · nøkkeltall, resultatgraf og investorpakke
     resultat   · månedlig P&L fra oppstart (kan stå tomt)
     enheter    · enhetsøkonomi per leilighet/rom (import fra Leieforhold)
     pipeline   · enheter på vei inn — signert kontra forventet
     selskap    · ansatte, faste kostnader, gjeld og aksjonærlån
     dokumenter · lesetilgang til DD-hvelvet (administreres i Investor-rom)
   Admin ser og redigerer alt; investor får read-only av sine tildelte sider.
   ──────────────────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark, TrendingUp, Wallet, Home, Loader2, Plus,
  Trash2, X, Check, RefreshCw, FileText, Download, ShieldCheck,
  BarChart3, Pencil, Building2, Users,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import Enhetsokonomi from '@/components/admin/Enhetsokonomi';
import DataromOversikt from '@/components/admin/DataromOversikt';
import { cacheLes, cacheHent, cacheSlett } from '@/lib/klient-cache';

const heading = { fontFamily: 'var(--font-heading)' };
const tallFmt = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const tall = (v) => tallFmt.format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F');
const kr = (v) => `${tall(v)}\u202Fkr`;
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const ymLabel = (ym) => { const [y, m] = String(ym).split('-'); return `${MND_KORT[Number(m) - 1]} ${y}`; };

const STATUS_META = {
  utleid: { l: 'Utleid', farge: '#1f7a45', bg: '#e7f4ec' },
  ledig: { l: 'Ledig', farge: '#8a7f72', bg: '#f3f2f0' },
  signert: { l: 'Signert', farge: '#1f7a45', bg: '#e7f4ec' },
  forventet: { l: 'Forventet', farge: '#9a6b1c', bg: '#fdf3e0' },
};

const Kort = ({ className = '', children, ...rest }) => (
  <div className={`rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] ${className}`} {...rest}>{children}</div>
);

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.ledig;
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: m.farge, background: m.bg }}>{m.l}</span>;
};

const TomtFelt = ({ icon: Icon, tittel, tekst }) => (
  <div className="flex flex-col items-center gap-3 py-14 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f0fb]"><Icon className="h-6 w-6 text-[#8b5cf6]" /></span>
    <p className="text-[15px] font-bold text-[#0a0a0a]" style={heading}>{tittel}</p>
    <p className="max-w-[380px] text-[12.5px] leading-relaxed text-[#999]">{tekst}</p>
  </div>
);

export default function Datarom({ apiKey, tab = 'oversikt', erAdmin = false, onGaaTil, onAapneBudsjett, autoTour = false, eoAutoTour = false }) {
  const api = useCallback(async (sti, opts = {}) => {
    const skille = sti.includes('?') ? '&' : '?';
    const r = await fetch(`/api/admin/datarom/${sti}${skille}key=${encodeURIComponent(apiKey)}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Noe gikk galt');
    return j;
  }, [apiKey]);

  const xlsxHref = `/api/admin/datarom/xlsx?key=${encodeURIComponent(apiKey)}`;

  return (
    <div data-testid="datarom-modul">
      {tab === 'oversikt' && <DataromOversikt api={api} apiKey={apiKey} xlsxHref={xlsxHref} erAdmin={erAdmin} onGaaTil={onGaaTil} onAapneBudsjett={onAapneBudsjett} autoTour={autoTour} />}
      {tab === 'resultat' && (
        <Kort data-testid="datarom-resultat-kommer-snart">
          <TomtFelt
            icon={BarChart3}
            tittel="Kommer snart"
            tekst="Regnskapet lanseres her — månedlig resultat fra oppstart med inntekter, kostnader og akkumulert utvikling."
          />
        </Kort>
      )}
      {tab === 'enheter' && <Enhetsokonomi api={api} erAdmin={erAdmin} autoTour={eoAutoTour} apiKey={apiKey} />}
      {tab === 'pipeline' && <Enheter api={api} erAdmin={erAdmin} fase="pipeline" />}
      {tab === 'selskap' && <Selskap api={api} erAdmin={erAdmin} />}
      {tab === 'dokumenter' && <Dokumenter api={api} apiKey={apiKey} erAdmin={erAdmin} />}
    </div>
  );
}

/* ── Resultatregnskap ─────────────────────────────────────────────────────── */

function Resultat({ api, erAdmin }) {
  const [rader, setRader] = useState(() => (cacheLes('dr:pnl') || {}).rader || []);
  const [laster, setLaster] = useState(() => !cacheLes('dr:pnl'));
  const [ny, setNy] = useState({ ym: '', inntekter: '', kostnader: '', notat: '' });
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');

  const last = useCallback(async (force = false) => {
    try { setRader((await cacheHent('dr:pnl', () => api('pnl'), { force })).rader || []); } catch (e) {}
    setLaster(false);
  }, [api]);
  useEffect(() => { last(); }, [last]);

  const leggTil = async () => {
    if (!ny.ym) { setFeil('Velg måned'); return; }
    setLagrer(true); setFeil('');
    try {
      await api('pnl', { method: 'PUT', body: ny });
      setNy({ ym: '', inntekter: '', kostnader: '', notat: '' });
      await last(true);
    } catch (e) { setFeil(e.message); }
    setLagrer(false);
  };
  const slett = async (ym) => {
    if (!window.confirm(`Slette ${ymLabel(ym)}?`)) return;
    try { await api(`pnl?ym=${ym}`, { method: 'DELETE' }); await last(true); } catch (e) {}
  };

  let akk = 0;
  const medAkk = rader.map((r) => { const res = r.inntekter - r.kostnader; akk += res; return { ...r, resultat: res, akkumulert: akk }; });

  if (laster) return <Skeleton />;

  return (
    <div className="space-y-4">
      {erAdmin && (
        <Kort>
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Legg til / oppdater måned</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-semibold text-[#999]">Måned</span>
              <input type="month" value={ny.ym} onChange={(e) => setNy((s) => ({ ...s, ym: e.target.value }))} data-testid="pnl-ym" className="h-9 rounded-lg border border-black/[0.08] px-2.5 text-[13px] outline-none focus:border-[#8b5cf6]/45" />
            </label>
            {[['inntekter', 'Inntekter'], ['kostnader', 'Kostnader']].map(([f, l]) => (
              <label key={f} className="block">
                <span className="mb-1 block text-[10.5px] font-semibold text-[#999]">{l}</span>
                <input inputMode="numeric" value={ny[f]} onChange={(e) => setNy((s) => ({ ...s, [f]: e.target.value.replace(/[^\d]/g, '') }))} placeholder="0" data-testid={`pnl-${f}`} className="h-9 w-[110px] rounded-lg border border-black/[0.08] px-2.5 text-right text-[13px] tabular-nums outline-none focus:border-[#8b5cf6]/45" />
              </label>
            ))}
            <label className="block min-w-[160px] flex-1">
              <span className="mb-1 block text-[10.5px] font-semibold text-[#999]">Notat (valgfritt)</span>
              <input value={ny.notat} onChange={(e) => setNy((s) => ({ ...s, notat: e.target.value }))} placeholder="F.eks. «Første hele driftsmåned»" className="h-9 w-full rounded-lg border border-black/[0.08] px-2.5 text-[13px] outline-none focus:border-[#8b5cf6]/45" />
            </label>
            <button onClick={leggTil} disabled={lagrer} data-testid="pnl-lagre" className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]">
              {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Lagre måned
            </button>
          </div>
          {feil && <p className="mt-2 text-[12px] font-semibold text-rose-600">{feil}</p>}
        </Kort>
      )}

      <Kort className="overflow-hidden p-0">
        {medAkk.length === 0 ? (
          <TomtFelt icon={BarChart3} tittel="Ingen måneder registrert ennå" tekst={erAdmin ? 'Resultatregnskapet kan stå tomt inntil videre — legg inn måneder over når tallene er klare.' : 'DigiHome fyller inn de historiske månedene fortløpende.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.05]">
                  {['Måned', 'Inntekter', 'Kostnader', 'Resultat', 'Akkumulert', 'Notat', ''].map((h, i) => (
                    <th key={h || 'x'} className={`px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5] ${i === 0 || i === 5 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {medAkk.map((r) => (
                  <tr key={r.ym} className="group border-b border-black/[0.03] last:border-b-0 hover:bg-[#fbfaf8]" data-testid={`pnl-rad-${r.ym}`}>
                    <td className="px-3.5 py-2.5 font-semibold text-[#0a0a0a]">{ymLabel(r.ym)}</td>
                    <td className="px-3.5 py-2.5 text-right tabular-nums text-[#1f7a45]">{tall(r.inntekter)}</td>
                    <td className="px-3.5 py-2.5 text-right tabular-nums text-[#9a6b1c]">{tall(r.kostnader)}</td>
                    <td className={`px-3.5 py-2.5 text-right font-bold tabular-nums ${r.resultat < 0 ? 'text-rose-600' : 'text-[#0a0a0a]'}`}>{tall(r.resultat)}</td>
                    <td className={`px-3.5 py-2.5 text-right tabular-nums ${r.akkumulert < 0 ? 'text-rose-500' : 'text-[#555]'}`}>{tall(r.akkumulert)}</td>
                    <td className="max-w-[220px] truncate px-3.5 py-2.5 text-[12px] text-[#999]">{r.notat}</td>
                    <td className="px-2 py-2.5 text-right">
                      {erAdmin && (
                        <button onClick={() => slett(r.ym)} className="rounded p-1 text-[#d5d0c8] opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100" title="Slett">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Kort>
    </div>
  );
}

/* ── Enheter (drift) og Pipeline — deler tabell + redigeringsmodal ────────── */

function Enheter({ api, erAdmin, fase }) {
  const [data, setData] = useState(() => { const c = cacheLes(`dr:enheter:${fase}`); return c ? { drift: c.drift || [], pipeline: c.pipeline || [] } : { drift: [], pipeline: [] }; });
  const [laster, setLaster] = useState(() => !cacheLes(`dr:enheter:${fase}`));
  const [importerer, setImporterer] = useState(false);
  const [importMelding, setImportMelding] = useState('');
  const [modal, setModal] = useState(null); // enhet under redigering (eller {} for ny)

  const last = useCallback(async (force = false) => {
    try { const j = await cacheHent(`dr:enheter:${fase}`, () => api(`enheter?fase=${fase}`), { force }); setData({ drift: j.drift || [], pipeline: j.pipeline || [] }); } catch (e) {}
    setLaster(false);
  }, [api, fase]);
  useEffect(() => {
    const c = cacheLes(`dr:enheter:${fase}`);
    if (c) { setData({ drift: c.drift || [], pipeline: c.pipeline || [] }); setLaster(false); } else setLaster(true);
    last();
  }, [last, fase]);

  const rader = fase === 'pipeline' ? data.pipeline : data.drift;
  const sum = (f) => rader.reduce((a, e) => a + (Number(e[f]) || 0), 0);

  const importer = async () => {
    setImporterer(true); setImportMelding('');
    try {
      const j = await api('enheter/import', { method: 'POST' });
      setImportMelding(`Hentet fra porteføljen: ${j.opprettet} nye · ${j.oppdatert} oppdatert`);
      await last(true);
    } catch (e) { setImportMelding(e.message); }
    setImporterer(false);
  };

  const slett = async (e) => {
    if (!window.confirm(`Slette «${e.navn}»?`)) return;
    try { await api(`enheter?id=${e.id}`, { method: 'DELETE' }); await last(); } catch (err) {}
  };

  if (laster) return <Skeleton />;

  const kpier = fase === 'pipeline'
    ? [
      ['Enheter på vei', `${rader.length}`],
      ['Signert · honorar/mnd', kr(rader.filter((e) => e.status === 'signert').reduce((a, e) => a + (e.honorar || 0), 0))],
      ['Forventet · honorar/mnd', kr(rader.filter((e) => e.status === 'forventet').reduce((a, e) => a + (e.honorar || 0), 0))],
      ['Samlet potensial/mnd', kr(sum('honorar'))],
    ]
    : [
      ['Enheter i drift', `${rader.length}`],
      ['Honorar per måned', kr(sum('honorar'))],
      ['Direkte kostnader/mnd', kr(sum('kostnader'))],
      ['Margin per måned', kr(sum('honorar') - sum('kostnader'))],
    ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
          {kpier.map(([l, v]) => (
            <div key={l} className="rounded-xl bg-white px-3.5 py-2.5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#b5b5b5]">{l}</p>
              <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[#0a0a0a]" style={heading}>{v}</p>
            </div>
          ))}
        </div>
        {erAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={importer} disabled={importerer} data-testid="enheter-import" title="Henter porteføljen fra Leieforhold — dine kostnader/notater røres aldri" className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-[#555] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:text-[#0a0a0a] active:scale-[0.97]">
              {importerer ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Hent fra Leieforhold
            </button>
            <button onClick={() => setModal({ fase })} data-testid="enheter-ny" className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]">
              <Plus className="h-4 w-4" /> Ny enhet
            </button>
          </div>
        )}
      </div>
      {importMelding && <p className="text-[12px] font-semibold text-[#1f7a45]" data-testid="import-melding">{importMelding}</p>}

      <Kort className="overflow-hidden p-0">
        {rader.length === 0 ? (
          <TomtFelt icon={fase === 'pipeline' ? TrendingUp : Home} tittel={fase === 'pipeline' ? 'Ingen enheter i pipeline ennå' : 'Ingen enheter registrert ennå'} tekst={erAdmin ? 'Hent porteføljen fra Leieforhold, eller legg til enheter manuelt.' : 'DigiHome oppdaterer oversikten fortløpende.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.05]">
                  {(fase === 'pipeline'
                    ? ['Enhet', 'Type', 'Status', 'Forventet start', 'Leie/mnd', 'Honorar/mnd', '']
                    : ['Enhet', 'Type', 'Status', 'Leie/mnd', 'Honorar/mnd', 'Dir. kostn./mnd', 'Margin/mnd', '']
                  ).map((h, i) => (
                    <th key={h || 'x'} className={`px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5] ${i <= 2 ? 'text-left' : 'text-right'} ${i === 3 && fase === 'pipeline' ? 'text-left' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rader.map((e) => (
                  <tr key={e.id} className="group border-b border-black/[0.03] last:border-b-0 hover:bg-[#fbfaf8]" data-testid={`enhet-rad-${e.id}`}>
                    <td className="max-w-[320px] px-3.5 py-2.5">
                      <span className="block truncate font-semibold text-[#0a0a0a]">{e.navn}</span>
                      {e.notat && <span className="block truncate text-[11px] text-[#b5b5b5]">{e.notat}</span>}
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#777]">{e.type === 'rom' ? 'Rom' : 'Leilighet'}</td>
                    <td className="px-3.5 py-2.5"><StatusBadge status={e.status} /></td>
                    {fase === 'pipeline' ? (
                      <>
                        <td className="px-3.5 py-2.5 text-[12px] text-[#777]">{e.start || '—'}</td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-[#555]">{e.leie ? tall(e.leie) : '—'}</td>
                        <td className="px-3.5 py-2.5 text-right font-bold tabular-nums text-[#0a0a0a]">{tall(e.honorar)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-[#555]">{e.leie ? tall(e.leie) : '—'}</td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-[#1f7a45]">{tall(e.honorar)}</td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-[#9a6b1c]">{tall(e.kostnader)}</td>
                        <td className={`px-3.5 py-2.5 text-right font-bold tabular-nums ${(e.honorar - e.kostnader) < 0 ? 'text-rose-600' : 'text-[#0a0a0a]'}`}>{tall(e.honorar - e.kostnader)}</td>
                      </>
                    )}
                    <td className="px-2 py-2.5 text-right">
                      {erAdmin && (
                        <span className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => setModal(e)} className="rounded p-1 text-[#b5b5b5] hover:bg-[#f4f0fb] hover:text-[#8b5cf6]" title="Rediger" data-testid={`enhet-rediger-${e.id}`}><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => slett(e)} className="rounded p-1 text-[#d5d0c8] hover:bg-rose-50 hover:text-rose-500" title="Slett"><Trash2 className="h-3.5 w-3.5" /></button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Kort>

      {modal && <EnhetModal enhet={modal} api={api} onLukk={() => setModal(null)} onLagret={() => { setModal(null); last(true); }} />}
    </div>
  );
}

function EnhetModal({ enhet, api, onLukk, onLagret }) {
  const erNy = !enhet.id;
  const [f, setF] = useState({
    fase: enhet.fase || 'drift',
    navn: enhet.navn || '',
    type: enhet.type || 'leilighet',
    status: enhet.status || (enhet.fase === 'pipeline' ? 'forventet' : 'utleid'),
    leie: enhet.leie || '',
    honorar: enhet.honorar || '',
    kostnader: enhet.kostnader || '',
    start: enhet.start || '',
    notat: enhet.notat || '',
  });
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');
  const statuser = f.fase === 'pipeline' ? ['signert', 'forventet'] : ['utleid', 'ledig'];

  const lagre = async () => {
    setLagrer(true); setFeil('');
    try {
      await api('enheter', { method: erNy ? 'POST' : 'PUT', body: { ...f, id: enhet.id } });
      onLagret();
    } catch (e) { setFeil(e.message); setLagrer(false); }
  };

  const felt = 'h-10 w-full rounded-lg border border-black/[0.08] px-3 text-[13px] outline-none transition-all focus:border-[#8b5cf6]/45 focus:ring-2 focus:ring-[#8b5cf6]/12';
  const seg = (aktiv) => `h-8 flex-1 rounded-full text-[12px] font-semibold transition-all ${aktiv ? 'bg-[#0a0a0a] text-white' : 'text-[#999] hover:text-[#555]'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]" onClick={onLukk}>
      <div className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()} data-testid="enhet-modal">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f0fb]"><Building2 className="h-4 w-4 text-[#8b5cf6]" /></span>
          <h3 className="text-[16px] font-bold text-[#0a0a0a]" style={heading}>{erNy ? 'Ny enhet' : 'Rediger enhet'}</h3>
          <button onClick={onLukk} className="ml-auto rounded-lg p-1.5 text-[#bbb] hover:bg-[#f3f2f0] hover:text-[#555]"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 space-y-3.5">
          <div className="flex gap-2">
            <div className="flex h-9 flex-1 items-center rounded-full bg-[#f4f2ef] p-0.5">
              {[['drift', 'I drift'], ['pipeline', 'Pipeline']].map(([k, l]) => (
                <button key={k} onClick={() => setF((s) => ({ ...s, fase: k, status: k === 'pipeline' ? 'forventet' : 'utleid' }))} className={seg(f.fase === k)}>{l}</button>
              ))}
            </div>
            <div className="flex h-9 flex-1 items-center rounded-full bg-[#f4f2ef] p-0.5">
              {[['leilighet', 'Leilighet'], ['rom', 'Rom']].map(([k, l]) => (
                <button key={k} onClick={() => setF((s) => ({ ...s, type: k }))} className={seg(f.type === k)}>{l}</button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-[#999]">Navn / adresse</span>
            <input value={f.navn} onChange={(e) => setF((s) => ({ ...s, navn: e.target.value }))} placeholder="F.eks. «Rom 3 · Storgaten 12, 5015 Bergen»" data-testid="enhet-navn" className={felt} autoFocus />
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-[#999]">Status</span>
              <select value={f.status} onChange={(e) => setF((s) => ({ ...s, status: e.target.value }))} className={felt} data-testid="enhet-status">
                {statuser.map((st) => <option key={st} value={st}>{STATUS_META[st].l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-[#999]">{f.fase === 'pipeline' ? 'Forventet start' : 'Startdato'}</span>
              <input type="date" value={f.start} onChange={(e) => setF((s) => ({ ...s, start: e.target.value }))} className={felt} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[['leie', 'Leie/mnd'], ['honorar', 'Honorar/mnd'], ['kostnader', 'Dir. kostn./mnd']].map(([k, l]) => (
              <label key={k} className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[#999]">{l}</span>
                <input inputMode="numeric" value={f[k]} onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value.replace(/[^\d]/g, '') }))} placeholder="0" data-testid={`enhet-${k}`} className={`${felt} text-right tabular-nums`} />
              </label>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-[#999]">Notat (valgfritt)</span>
            <input value={f.notat} onChange={(e) => setF((s) => ({ ...s, notat: e.target.value }))} placeholder="Synlig i datarommet og i Excel" className={felt} />
          </label>
        </div>

        {feil && <p className="mt-3 text-[12px] font-semibold text-rose-600">{feil}</p>}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onLukk} className="h-9 rounded-full px-4 text-[12.5px] font-semibold text-[#999] hover:text-[#555]">Avbryt</button>
          <button onClick={lagre} disabled={lagrer} data-testid="enhet-lagre" className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]">
            {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {erNy ? 'Opprett enhet' : 'Lagre'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Selskap ──────────────────────────────────────────────────────────────── */

function Selskap({ api, erAdmin }) {
  const [f, setF] = useState(() => (cacheLes('dr:selskap') || {}).selskap || null);
  const [laster, setLaster] = useState(() => !cacheLes('dr:selskap'));
  const [lagrer, setLagrer] = useState(false);
  const [lagret, setLagret] = useState(false);

  useEffect(() => {
    (async () => {
      try { const j = await cacheHent('dr:selskap', () => api('selskap')); if (j?.selskap) setF(j.selskap); } catch (e) {}
      setLaster(false);
    })();
  }, [api]);

  const lagre = async () => {
    setLagrer(true);
    try {
      const j = await api('selskap', { method: 'PUT', body: f });
      cacheSlett('dr:selskap'); // skjemaet er sannheten nå — ikke server stale cache
      setF(j.selskap);
      setLagret(true); setTimeout(() => setLagret(false), 2500);
    } catch (e) {}
    setLagrer(false);
  };

  if (laster || !f) return <Skeleton />;

  const settLinje = (liste, id, felt, verdi) => setF((s) => ({ ...s, [liste]: s[liste].map((l) => (l.id === id ? { ...l, [felt]: verdi } : l)) }));
  const nyLinje = (liste, mal) => setF((s) => ({ ...s, [liste]: [...s[liste], { id: `ny-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...mal }] }));
  const fjernLinje = (liste, id) => setF((s) => ({ ...s, [liste]: s[liste].filter((l) => l.id !== id) }));

  const blokk = (tittel, liste, kolonner, mal, ikon) => {
    const Ikon = ikon;
    const sumFelt = kolonner.find((k) => k.sum);
    const sum = sumFelt ? (f[liste] || []).reduce((a, l) => a + (Number(l[sumFelt.f]) || 0), 0) : null;
    return (
      <Kort key={tittel}>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f4f0fb]"><Ikon className="h-4 w-4 text-[#8b5cf6]" /></span>
          <p className="text-[13px] font-bold text-[#0a0a0a]" style={heading}>{tittel}</p>
          {sum !== null && <span className="ml-auto text-[13px] font-bold tabular-nums text-[#555]">{kr(sum)}{sumFelt.perMnd ? '/mnd' : ''}</span>}
        </div>
        <div className="mt-3 space-y-1.5">
          {(f[liste] || []).length === 0 && <p className="py-2 text-[12px] italic text-[#c2beb8]">Ingen registrert{erAdmin ? ' — legg til under' : ''}.</p>}
          {(f[liste] || []).map((l) => (
            <div key={l.id} className="flex items-center gap-2">
              {kolonner.map((k) => (
                erAdmin ? (
                  <input
                    key={k.f}
                    value={l[k.f] ?? ''}
                    inputMode={k.tall ? 'numeric' : undefined}
                    onChange={(e) => settLinje(liste, l.id, k.f, k.tall ? e.target.value.replace(/[^\d.,]/g, '') : e.target.value)}
                    placeholder={k.ph}
                    className={`h-9 rounded-lg border border-black/[0.06] bg-[#fafaf8] px-2.5 text-[12.5px] outline-none transition-all focus:border-[#8b5cf6]/45 focus:bg-white ${k.tall ? 'w-[110px] text-right tabular-nums' : 'min-w-0 flex-1'}`}
                  />
                ) : (
                  <span key={k.f} className={`px-1 text-[13px] ${k.tall ? 'w-[110px] text-right tabular-nums font-semibold text-[#0a0a0a]' : 'min-w-0 flex-1 truncate text-[#555]'}`}>
                    {k.tall ? tall(l[k.f]) : l[k.f]}
                  </span>
                )
              ))}
              {erAdmin && (
                <button onClick={() => fjernLinje(liste, l.id)} className="shrink-0 rounded p-1.5 text-[#d5d0c8] hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
          {erAdmin && (
            <button onClick={() => nyLinje(liste, mal)} className="flex items-center gap-1.5 pt-1 text-[12px] font-semibold text-[#c2beb8] transition-colors hover:text-[#8b5cf6]">
              <Plus className="h-3.5 w-3.5" /> Legg til
            </button>
          )}
        </div>
      </Kort>
    );
  };

  return (
    <div className="space-y-4" data-testid="datarom-selskap">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {blokk('Ansatte', 'ansatte', [
          { f: 'rolle', ph: 'Rolle — f.eks. «Daglig leder»' },
          { f: 'prosent', ph: '100', tall: true },
          { f: 'kostnad', ph: 'Kostnad/mnd', tall: true, sum: true, perMnd: true },
        ], { rolle: '', prosent: 100, kostnad: 0 }, Users)}
        {blokk('Faste kostnader', 'faste', [
          { f: 'navn', ph: 'Post — f.eks. «Kontorleie»' },
          { f: 'belop', ph: 'Beløp/mnd', tall: true, sum: true, perMnd: true },
        ], { navn: '', belop: 0 }, Wallet)}
        {blokk('Gjeld', 'gjeld', [
          { f: 'navn', ph: 'Långiver' },
          { f: 'belop', ph: 'Beløp', tall: true, sum: true },
          { f: 'rente', ph: 'Rente %', tall: true },
        ], { navn: '', belop: 0, rente: 0 }, Landmark)}
        {blokk('Aksjonærlån', 'laan', [
          { f: 'navn', ph: 'Aksjonær' },
          { f: 'belop', ph: 'Beløp', tall: true, sum: true },
          { f: 'rente', ph: 'Rente %', tall: true },
        ], { navn: '', belop: 0, rente: 0 }, ShieldCheck)}
      </div>

      <Kort>
        <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Notat til investor</p>
        {erAdmin ? (
          <textarea
            value={f.notat || ''}
            onChange={(e) => setF((s) => ({ ...s, notat: e.target.value.slice(0, 2000) }))}
            rows={3}
            placeholder="F.eks. kontekst rundt lån, avtaler eller planlagte ansettelser …"
            className="mt-2 w-full resize-y rounded-lg border border-black/[0.06] bg-[#fafaf8] px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-all focus:border-[#8b5cf6]/45 focus:bg-white"
          />
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#555]">{f.notat || 'Ingen notater.'}</p>
        )}
      </Kort>

      {erAdmin && (
        <div className="flex items-center justify-end gap-3">
          {f.updatedAt && <span className="text-[11.5px] text-[#b5b5b5]">Sist oppdatert {new Date(f.updatedAt).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
          <button onClick={lagre} disabled={lagrer} data-testid="selskap-lagre" className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold transition-all active:scale-[0.97] ${lagret ? 'bg-emerald-50 text-emerald-600' : 'bg-[#0a0a0a] text-white hover:bg-black/85'}`}>
            {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {lagret ? 'Lagret' : 'Lagre selskapsdata'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Dokumenter (lesetilgang til DD-hvelvet) ──────────────────────────────── */

function Dokumenter({ api, apiKey, erAdmin }) {
  const [docs, setDocs] = useState(() => (cacheLes('dr:dokumenter') || {}).documents || []);
  const [kategorier, setKategorier] = useState(() => (cacheLes('dr:dokumenter') || {}).categories || []);
  const [laster, setLaster] = useState(() => !cacheLes('dr:dokumenter'));

  useEffect(() => {
    (async () => {
      try {
        const j = await cacheHent('dr:dokumenter', () => api('dokumenter'));
        setDocs(j.documents || []);
        setKategorier(j.categories || []);
      } catch (e) {}
      setLaster(false);
    })();
  }, [api]);

  if (laster) return <Skeleton />;

  const perKategori = kategorier
    .map((k) => ({ ...k, docs: docs.filter((d) => d.category === k.key) }))
    .filter((k) => k.docs.length > 0);
  const utenKategori = docs.filter((d) => !kategorier.some((k) => k.key === d.category));
  if (utenKategori.length) perKategori.push({ key: 'annet', label: 'Annet', docs: utenKategori });

  const strl = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} kB`);

  return (
    <div className="space-y-4" data-testid="datarom-dokumenter">
      <SakArkiv apiKey={apiKey} erAdmin={erAdmin} />
      {erAdmin && (
        <p className="text-[12px] text-[#999]">Dokumentene administreres i <span className="font-semibold text-[#555]">Investor-rom</span>-modulen (opplasting, versjoner og arkivering) — datarommet viser hvelvet i lesemodus.</p>
      )}
      {perKategori.length === 0 ? (
        <Kort><TomtFelt icon={FileText} tittel="Ingen dokumenter delt ennå" tekst={erAdmin ? 'Last opp rapporter og avtaler i Investor-rom-modulen — de dukker opp her automatisk.' : 'DigiHome deler rapporter og avtaler her fortløpende.'} /></Kort>
      ) : (
        perKategori.map((k) => (
          <Kort key={k.key} className="p-0">
            <p className="border-b border-black/[0.04] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">{k.label}</p>
            <div className="divide-y divide-black/[0.03]">
              {k.docs.map((d) => {
                const ver = (d.versions || []).find((v) => v.version === d.currentVersion) || (d.versions || [])[d.versions?.length - 1] || {};
                return (
                  <a
                    key={d.id}
                    href={`/api/admin/datarom/fil?docId=${encodeURIComponent(d.id)}&key=${encodeURIComponent(apiKey)}`}
                    data-testid={`dok-${d.id}`}
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#fbfaf8]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f0fb]"><FileText className="h-4 w-4 text-[#8b5cf6]" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-[#0a0a0a]">{d.title || ver.filename}</span>
                      <span className="block text-[11.5px] text-[#999]">
                        {ver.filename} · {ver.size ? strl(ver.size) : ''} · v{d.currentVersion} · {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </span>
                    <Download className="h-4 w-4 shrink-0 text-[#d5d0c8] transition-colors group-hover:text-[#8b5cf6]" />
                  </a>
                );
              })}
            </div>
          </Kort>
        ))
      )}
    </div>
  );
}

/* ── Dokumentarkiv fra sakene (rollestyrt synlighet: styret/investorer/alle) ── */
function SakArkiv({ apiKey, erAdmin }) {
  const [filer, setFiler] = useState([]);
  const [lastet, setLastet] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/admin/dokumentarkiv?key=${encodeURIComponent(apiKey)}`);
        const j = await r.json();
        setFiler(j.filer || []);
      } catch (e) {}
      setLastet(true);
    })();
  }, [apiKey]);
  if (!lastet || !filer.length) return null;

  const strlA = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} kB`);
  const SYN_ETIKETT = { styret: 'Styret', investorer: 'Investorer', alle: 'Alle' };
  const perKat = {};
  for (const f of filer) {
    const k = (f.arkiv && f.arkiv.kategori) || 'Annet';
    perKat[k] = perKat[k] || [];
    perKat[k].push(f);
  }

  return (
    <Kort className="p-0" data-testid="datarom-sakarkiv">
      <div className="flex items-center gap-2 border-b border-black/[0.04] px-5 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Dokumentarkiv</p>
        <span className="text-[11px] text-[#c5c0b8]">· {filer.length} dokument{filer.length === 1 ? '' : 'er'}</span>
      </div>
      {Object.entries(perKat).map(([kat, fs]) => (
        <div key={kat}>
          <p className="bg-[#fbfaf8] px-5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#c5c0b8]">{kat}</p>
          <div className="divide-y divide-black/[0.03]">
            {fs.map((f) => (
              <a
                key={f.id}
                href={`/api/admin/dokumentarkiv/${f.id}?key=${encodeURIComponent(apiKey)}`}
                data-testid={`sakarkiv-${f.id}`}
                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#fbfaf8]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f0fb]"><FileText className="h-4 w-4 text-[#8b5cf6]" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-semibold text-[#0a0a0a]">{f.name}</span>
                    {f.laast && <span className="shrink-0 rounded-[4px] bg-emerald-50 px-1.5 py-px text-[9.5px] font-bold text-emerald-700">Signert</span>}
                  </span>
                  <span className="block truncate text-[11.5px] text-[#999]">
                    {f.sakTittel ? `${f.sakTittel} · ` : ''}{strlA(f.size)} · v{f.versjon || 1}{erAdmin && f.arkiv ? ` · ${SYN_ETIKETT[f.arkiv.synlighet] || 'Styret'}` : ''}
                  </span>
                </span>
                <Download className="h-4 w-4 shrink-0 text-[#d5d0c8] transition-colors group-hover:text-[#8b5cf6]" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </Kort>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[108px] animate-pulse rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" />)}
      </div>
      <div className="h-[300px] animate-pulse rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" />
    </div>
  );
}
