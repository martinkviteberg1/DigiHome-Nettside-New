'use client';

// Nyhetsbrev-fanen: blokkbasert komponering, målgruppevelger med samtykke-
// merking, live forhåndsvisning, test-utsending og kampanjelogg.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2, Mail, Send, Plus, Trash2, ChevronUp, ChevronDown, Type, AlignLeft,
  MousePointerClick, Image as ImageIcon, Minus, ShieldCheck, AlertTriangle,
  CheckCircle2, XCircle, Eye, Users, History,
} from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_BLOCKS = [
  { id: uid(), type: 'heading', text: 'Nytt fra DigiHome' },
  { id: uid(), type: 'text', text: 'Hei!\n\nHer kommer en liten oppdatering fra oss i DigiHome.' },
  { id: uid(), type: 'button', label: 'Se hva boligen din kan tjene', url: 'https://digihome.no/bli-utleier' },
];

const BLOCK_META = {
  heading: { label: 'Overskrift', icon: Type },
  text: { label: 'Avsnitt', icon: AlignLeft },
  button: { label: 'Knapp', icon: MousePointerClick },
  image: { label: 'Bilde', icon: ImageIcon },
  divider: { label: 'Skillelinje', icon: Minus },
};

const inputCls = 'w-full h-10 px-3.5 rounded-xl border border-[#e5e5e5] bg-white text-[14px] text-[#0a0a0a] placeholder:text-[#999] outline-none focus:border-[#cf97fc]/60 focus:shadow-[0_0_0_3px_rgba(207,151,252,0.14)] transition-all';
const areaCls = 'w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5e5] bg-white text-[14px] text-[#0a0a0a] placeholder:text-[#999] outline-none focus:border-[#cf97fc]/60 focus:shadow-[0_0_0_3px_rgba(207,151,252,0.14)] transition-all resize-y';

export default function NewsletterTab({ apiKey }) {
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS);
  const [segments, setSegments] = useState(['kunder']);
  const [audiences, setAudiences] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [testTo, setTestTo] = useState('');
  const [testState, setTestState] = useState('idle'); // idle|sending|ok|err
  const [testMsg, setTestMsg] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sendState, setSendState] = useState('idle');
  const [sendResult, setSendResult] = useState(null);
  const [history, setHistory] = useState(null);
  const debounceRef = useRef(null);

  const q = `key=${encodeURIComponent(apiKey)}`;

  const loadAudiences = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/newsletter/audiences?${q}`);
      const j = await r.json();
      if (j.ok) setAudiences(j);
    } catch (e) {}
  }, [q]);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/newsletter?${q}`);
      const j = await r.json();
      if (j.ok) setHistory(j);
    } catch (e) {}
  }, [q]);

  useEffect(() => { loadAudiences(); loadHistory(); }, [loadAudiences, loadHistory]);

  // Debounced live-forhåndsvisning (server-rendret — identisk med ekte e-post)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/newsletter/preview?${q}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, preheader, blocks }),
        });
        const j = await r.json();
        if (j.ok) setPreviewHtml(j.html);
      } catch (e) {}
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [subject, preheader, blocks, q]);

  const setBlock = (id, patch) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBlock = (id) => setBlocks((bs) => bs.filter((b) => b.id !== id));
  const moveBlock = (id, dir) => setBlocks((bs) => {
    const i = bs.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= bs.length) return bs;
    const next = [...bs];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const addBlock = (type) => setBlocks((bs) => [...bs, {
    id: uid(), type,
    ...(type === 'heading' ? { text: '' } : {}),
    ...(type === 'text' ? { text: '' } : {}),
    ...(type === 'button' ? { label: 'Les mer', url: 'https://digihome.no' } : {}),
    ...(type === 'image' ? { url: '', alt: '' } : {}),
  }]);

  const toggleSegment = (key) => setSegments((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  const selectedCount = (audiences?.segments || []).filter((s) => segments.includes(s.key)).reduce((a, s) => a + s.count, 0);

  const sendTest = async () => {
    setTestState('sending'); setTestMsg('');
    try {
      const r = await fetch(`/api/admin/newsletter/test?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo, subject, preheader, blocks }),
      });
      const j = await r.json();
      if (j.ok) { setTestState('ok'); setTestMsg(`Test sendt til ${j.sentTo}`); }
      else { setTestState('err'); setTestMsg(j.error || 'Ukjent feil'); }
    } catch (e) { setTestState('err'); setTestMsg('Nettverksfeil'); }
  };

  const sendCampaign = async () => {
    setSendState('sending'); setSendResult(null);
    try {
      const r = await fetch(`/api/admin/newsletter/send?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, preheader, blocks, segments }),
      });
      const j = await r.json();
      if (j.ok) {
        setSendState('ok'); setSendResult(j.campaign); setConfirming(false);
        loadHistory(); loadAudiences();
      } else { setSendState('err'); setSendResult({ error: j.error || 'Ukjent feil' }); }
    } catch (e) { setSendState('err'); setSendResult({ error: 'Nettverksfeil' }); }
  };

  const canSend = subject.trim() && blocks.length > 0 && segments.length > 0;

  return (
    <div className="space-y-5" data-testid="newsletter-tab">
      {/* Send-resultat */}
      {sendState === 'ok' && sendResult ? (
        <div className="rounded-2xl bg-[#E8F4EE] border border-[#18794E]/25 px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#18794E] shrink-0" />
          <p className="text-[14px] text-[#0a0a0a]">
            <b>Nyhetsbrevet er sendt!</b> {sendResult.sent} av {sendResult.recipients} levert
            {sendResult.failedCount > 0 ? ` · ${sendResult.failedCount} feilet` : ''} · hoppet over {sendResult.skipped?.optout || 0} avmeldte og {sendResult.skipped?.duplicate || 0} duplikater.
          </p>
        </div>
      ) : null}
      {sendState === 'err' && sendResult?.error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-5 py-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-[14px] text-rose-700">{sendResult.error}</p>
        </div>
      ) : null}
      {audiences && audiences.emailConfigured === false ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-[14px] text-amber-800">SendGrid er ikke konfigurert i dette miljøet — utsending vil feile.</p>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* ------------------------- Komponer ------------------------- */}
        <div className="space-y-5">
          <div className="rounded-3xl bg-white border border-[#eee] p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="h-9 w-9 rounded-xl bg-[#f3ebff] grid place-items-center"><Mail className="w-4.5 h-4.5 text-[#9B5BD6]" style={{ width: 18, height: 18 }} /></span>
              <div>
                <h3 className="text-[16px] font-bold text-[#0a0a0a] leading-tight">Komponer nyhetsbrev</h3>
                <p className="text-[12px] text-[#999]">Blokkbasert — rendres som mobiloptimalisert e-post i DigiHome-drakt</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold text-[#555] block mb-1.5">Emne</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="F.eks. Leiemarkedet i Bergen akkurat nå" className={inputCls} data-testid="nl-subject" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#555] block mb-1.5">Preheader <span className="font-normal text-[#999]">(teksten etter emnet i innboksen)</span></label>
                <input value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Kort setning som frister til å åpne" className={inputCls} />
              </div>
            </div>

            {/* Blokker */}
            <div className="mt-5 space-y-2.5">
              {blocks.map((b, i) => {
                const meta = BLOCK_META[b.type] || BLOCK_META.text;
                const Icon = meta.icon;
                return (
                  <div key={b.id} className="rounded-2xl border border-[#eee] bg-[#fafafa] p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#888] uppercase tracking-[0.08em]"><Icon className="w-3.5 h-3.5 text-[#9B5BD6]" /> {meta.label}</span>
                      <span className="flex items-center gap-1">
                        <button onClick={() => moveBlock(b.id, -1)} disabled={i === 0} className="h-7 w-7 rounded-lg grid place-items-center text-[#999] hover:bg-[#eee] disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => moveBlock(b.id, 1)} disabled={i === blocks.length - 1} className="h-7 w-7 rounded-lg grid place-items-center text-[#999] hover:bg-[#eee] disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeBlock(b.id)} className="h-7 w-7 rounded-lg grid place-items-center text-[#999] hover:bg-rose-50 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </span>
                    </div>
                    {b.type === 'heading' && <input value={b.text || ''} onChange={(e) => setBlock(b.id, { text: e.target.value })} placeholder="Overskrift…" className={inputCls} />}
                    {b.type === 'text' && <textarea value={b.text || ''} onChange={(e) => setBlock(b.id, { text: e.target.value })} placeholder="Skriv avsnittet her… (tom linje = nytt avsnitt)" rows={3} className={areaCls} />}
                    {b.type === 'button' && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <input value={b.label || ''} onChange={(e) => setBlock(b.id, { label: e.target.value })} placeholder="Knappetekst" className={inputCls} />
                        <input value={b.url || ''} onChange={(e) => setBlock(b.id, { url: e.target.value })} placeholder="https://…" className={inputCls} />
                      </div>
                    )}
                    {b.type === 'image' && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <input value={b.url || ''} onChange={(e) => setBlock(b.id, { url: e.target.value })} placeholder="Bilde-URL (https://…)" className={inputCls} />
                        <input value={b.alt || ''} onChange={(e) => setBlock(b.id, { alt: e.target.value })} placeholder="Alt-tekst" className={inputCls} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(BLOCK_META).map(([type, meta]) => (
                <button key={type} onClick={() => addBlock(type)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#f5f3f0] hover:bg-[#edeae6] text-[12.5px] font-medium text-[#555] transition-colors">
                  <Plus className="w-3 h-3" /> {meta.label}
                </button>
              ))}
            </div>
          </div>

          {/* ------------------------- Målgruppe ------------------------- */}
          <div className="rounded-3xl bg-white border border-[#eee] p-6">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="h-9 w-9 rounded-xl bg-[#f3ebff] grid place-items-center"><Users className="text-[#9B5BD6]" style={{ width: 18, height: 18 }} /></span>
              <h3 className="text-[16px] font-bold text-[#0a0a0a]">Målgruppe</h3>
            </div>
            <p className="text-[12px] text-[#999] mb-4">Avmeldte og duplikater filtreres alltid bort automatisk. {audiences ? `${audiences.optouts} avmeldt totalt.` : ''}</p>
            <div className="space-y-2.5">
              {(audiences?.segments || []).map((s) => {
                const on = segments.includes(s.key);
                return (
                  <button key={s.key} onClick={() => toggleSegment(s.key)} data-testid={`nl-seg-${s.key}`}
                    className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${on ? 'border-[#9B5BD6]/50 bg-[#faf7ff]' : 'border-[#eee] bg-white hover:bg-[#fafafa]'}`}>
                    <span className="flex items-center gap-3 min-w-0">
                      <span className={`h-5 w-5 rounded-md grid place-items-center border ${on ? 'bg-[#9B5BD6] border-[#9B5BD6]' : 'border-[#ccc] bg-white'}`}>
                        {on ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold text-[#0a0a0a]">{s.label} <span className="text-[#999] font-normal">· {s.count}</span></span>
                        <span className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium ${s.consent === 'safe' ? 'text-[#18794E]' : 'text-amber-600'}`}>
                          {s.consent === 'safe' ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} {s.note}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
              {!audiences ? <div className="h-24 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[#9B5BD6]" /></div> : null}
            </div>
          </div>

          {/* ------------------------- Test + send ------------------------- */}
          <div className="rounded-3xl bg-white border border-[#eee] p-6 space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-[#555] block mb-1.5">Send test til deg selv først</label>
              <div className="flex gap-2.5">
                <input value={testTo} onChange={(e) => { setTestTo(e.target.value); setTestState('idle'); }} placeholder="din@epost.no" className={inputCls} data-testid="nl-test-email" />
                <button onClick={sendTest} disabled={testState === 'sending' || !testTo.trim()} data-testid="nl-test-send"
                  className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#f5f3f0] hover:bg-[#edeae6] text-[13px] font-semibold text-[#0a0a0a] disabled:opacity-50 transition-colors">
                  {testState === 'sending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Test
                </button>
              </div>
              {testMsg ? <p className={`text-[12px] mt-1.5 ${testState === 'ok' ? 'text-[#18794E]' : 'text-rose-500'}`}>{testMsg}</p> : null}
            </div>

            {!confirming ? (
              <button onClick={() => setConfirming(true)} disabled={!canSend} data-testid="nl-send"
                className="w-full h-12 rounded-full bg-[#0a0a0a] text-white font-semibold text-[14px] inline-flex items-center justify-center gap-2 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] active:scale-[0.99] disabled:opacity-40 transition-all">
                <Send className="w-4 h-4" /> Send nyhetsbrev {selectedCount ? `til ~${selectedCount} mottakere` : ''}
              </button>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[13.5px] text-amber-900 font-medium">Sikker? Sendes til ca. {selectedCount} mottakere (etter dedupe) — kan ikke angres.</p>
                <div className="mt-3 flex gap-2.5">
                  <button onClick={sendCampaign} disabled={sendState === 'sending'} data-testid="nl-send-confirm"
                    className="flex-1 h-10 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                    {sendState === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Ja, send nå
                  </button>
                  <button onClick={() => setConfirming(false)} className="h-10 px-4 rounded-full bg-white border border-[#ddd] text-[13px] font-medium text-[#555]">Avbryt</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------- Forhåndsvisning ------------------------- */}
        <div className="rounded-3xl bg-white border border-[#eee] overflow-hidden lg:sticky lg:top-4">
          <div className="px-5 py-3.5 border-b border-[#eee] flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0a0a0a]"><Eye className="w-4 h-4 text-[#9B5BD6]" /> Forhåndsvisning</span>
            <span className="text-[11.5px] text-[#999]">Slik ser e-posten ut hos mottakeren</span>
          </div>
          {previewHtml ? (
            <iframe title="Forhåndsvisning" srcDoc={previewHtml} className="w-full h-[720px] bg-[#f5f3f0]" data-testid="nl-preview" />
          ) : (
            <div className="h-[720px] grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[#9B5BD6]" /></div>
          )}
        </div>
      </div>

      {/* ------------------------- Historikk ------------------------- */}
      <div className="rounded-3xl bg-white border border-[#eee] p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="h-9 w-9 rounded-xl bg-[#f3ebff] grid place-items-center"><History className="text-[#9B5BD6]" style={{ width: 18, height: 18 }} /></span>
          <h3 className="text-[16px] font-bold text-[#0a0a0a]">Sendte nyhetsbrev</h3>
        </div>
        {!history ? (
          <div className="h-16 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[#9B5BD6]" /></div>
        ) : (history.campaigns || []).length === 0 ? (
          <p className="text-[13.5px] text-[#999]">Ingen utsendinger ennå — det første nyhetsbrevet ditt dukker opp her.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] uppercase tracking-[0.08em] text-[#999] border-b border-[#eee]">
                  <th className="py-2.5 pr-4 font-semibold">Dato</th>
                  <th className="py-2.5 pr-4 font-semibold">Emne</th>
                  <th className="py-2.5 pr-4 font-semibold">Målgrupper</th>
                  <th className="py-2.5 pr-4 font-semibold text-right">Mottakere</th>
                  <th className="py-2.5 font-semibold text-right">Levert</th>
                </tr>
              </thead>
              <tbody>
                {history.campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-[#f3f3f3] last:border-0">
                    <td className="py-3 pr-4 text-[#888] whitespace-nowrap">{new Date(c.sentAt).toLocaleString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-3 pr-4 font-medium text-[#0a0a0a]">{c.subject}</td>
                    <td className="py-3 pr-4 text-[#888]">{(c.segments || []).join(', ')}</td>
                    <td className="py-3 pr-4 text-right text-[#555]">{c.recipients}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center gap-1 font-semibold ${c.failedCount ? 'text-amber-600' : 'text-[#18794E]'}`}>
                        {c.sent}{c.failedCount ? ` (${c.failedCount} feilet)` : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
