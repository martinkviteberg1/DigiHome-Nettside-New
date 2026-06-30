'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Send, MessageSquare, Bot, Building2, AlertCircle } from 'lucide-react';

const TYPE_LABEL = { brief: 'Brief', status: 'Status', question: 'Spørsmål', answer: 'Svar', note: 'Notat' };
const TYPE_COLOR = {
  brief: 'bg-[#ede9fe] text-[#6d28d9]', status: 'bg-emerald-50 text-emerald-700',
  question: 'bg-amber-50 text-amber-700', answer: 'bg-sky-50 text-sky-700', note: 'bg-[#f1efeb] text-[#666]',
};

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'nå nettopp';
  if (s < 3600) return `${Math.floor(s / 60)} min siden`;
  if (s < 86400) return `${Math.floor(s / 3600)} t siden`;
  return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AgentBridge({ apiKey }) {
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [thread, setThread] = useState('closed-loop');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [type, setType] = useState('note');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/agent-bridge?key=${encodeURIComponent(apiKey)}&thread=${encodeURIComponent(thread)}`);
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke hente meldinger');
      setMessages(j.messages || []);
      setThreads(j.threads || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [apiKey, thread]);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!subject.trim() && !body.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/agent-bridge?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'marketing', type, threadId: thread, subject: subject.trim(), body: body.trim(), author: 'Admin (markedsføring)' }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Sending feilet');
      setSubject(''); setBody(''); setType('note');
      await load();
    } catch (e) { setErr(e.message); }
    setSending(false);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] text-[#777]">Tråd:</span>
          <select value={thread} onChange={(e) => setThread(e.target.value)} className="h-9 px-3 rounded-full bg-white ring-1 ring-[#eee] text-[12.5px] text-[#0a0a0a] outline-none">
            {[...new Set(['closed-loop', ...threads])].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={loading} className="h-9 px-3 rounded-full bg-white ring-1 ring-[#eee] text-[12px] font-semibold inline-flex items-center gap-1.5 hover:ring-[#dcdcdc] disabled:opacity-40"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Oppdater</button>
      </div>

      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0a0a0a]" /></div>
      ) : (
        <div className="space-y-3 mb-6">
          {messages.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center text-[#999] text-[13px] shadow-[0_2px_16px_rgba(0,0,0,0.04)]"><MessageSquare className="w-6 h-6 mx-auto mb-2 text-[#ccc]" />Ingen meldinger i denne tråden ennå.</div>
          ) : messages.map((m) => {
            const mine = m.from === 'marketing';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] ${mine ? 'bg-[#0a0a0a] text-white' : 'bg-white'}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${mine ? 'bg-white/15' : 'bg-[#f1efeb]'}`}>{mine ? <Bot className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5 text-[#666]" />}</span>
                    <span className={`text-[11px] font-bold ${mine ? 'text-white/90' : 'text-[#0a0a0a]'}`}>{mine ? 'Markedsføring' : 'Plattform'}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPE_COLOR[m.type] || TYPE_COLOR.note}`}>{TYPE_LABEL[m.type] || m.type}</span>
                    <span className={`text-[10.5px] ml-auto ${mine ? 'text-white/50' : 'text-[#aaa]'}`}>{timeAgo(m.createdAt)}</span>
                  </div>
                  {m.subject && <p className={`text-[13.5px] font-semibold ${mine ? 'text-white' : 'text-[#0a0a0a]'}`}>{m.subject}</p>}
                  {m.body && <pre className={`text-[12.5px] mt-1 whitespace-pre-wrap font-sans leading-relaxed ${mine ? 'text-white/80' : 'text-[#666]'}`}>{m.body}</pre>}
                  {m.data && (
                    <details className="mt-2">
                      <summary className={`text-[11px] cursor-pointer ${mine ? 'text-white/60' : 'text-[#999]'}`}>Strukturert data (JSON)</summary>
                      <pre className={`text-[11px] mt-1 whitespace-pre-wrap overflow-x-auto rounded-lg p-2 ${mine ? 'bg-white/10 text-white/80' : 'bg-[#faf9f7] text-[#555]'}`}>{JSON.stringify(m.data, null, 2)}</pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sticky bottom-4">
        <div className="flex items-center gap-2 mb-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 px-3 rounded-lg bg-[#faf9f7] ring-1 ring-[#eee] text-[12px] font-semibold text-[#0a0a0a] outline-none">
            {Object.entries(TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Emne…" className="h-9 px-3 rounded-lg bg-[#faf9f7] ring-1 ring-[#eee] text-[12.5px] text-[#0a0a0a] outline-none flex-1" />
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Skriv en melding til plattform-agenten…" className="w-full px-3 py-2 rounded-lg bg-[#faf9f7] ring-1 ring-[#eee] text-[12.5px] text-[#0a0a0a] outline-none resize-y leading-relaxed" />
        <div className="flex justify-end mt-2">
          <button onClick={send} disabled={sending || (!subject.trim() && !body.trim())} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send</button>
        </div>
      </div>
    </div>
  );
}
