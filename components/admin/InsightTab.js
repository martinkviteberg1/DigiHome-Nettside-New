'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Send, Loader2, RefreshCw } from 'lucide-react';

const EXAMPLES = [
  'Hvilken kanal konverterer best til leads?',
  'Hvor i skjemaet faller flest fra?',
  'Hva bør jeg prioritere denne uken?',
  'Hvordan er fordelingen mobil vs. desktop?',
];

export default function InsightTab({ apiKey, days }) {
  const [summary, setSummary] = useState('');
  const [loadingSum, setLoadingSum] = useState(false);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState('');

  const call = useCallback(async (payload) => {
    const res = await fetch(`/api/admin/ai-insight?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, days }),
    });
    return res.json();
  }, [apiKey, days]);

  const loadSummary = useCallback(async () => {
    setLoadingSum(true); setErr('');
    try {
      const j = await call({ mode: 'summary' });
      if (j.ok) setSummary(j.answer); else setErr(j.error || 'AI utilgjengelig');
    } catch (e) { setErr('AI utilgjengelig'); } finally { setLoadingSum(false); }
  }, [call]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const ask = useCallback(async (question) => {
    const text = (question || q).trim();
    if (text.length < 3 || asking) return;
    setAsking(true); setAnswer('');
    try {
      const j = await call({ mode: 'ask', question: text });
      setAnswer(j.ok ? j.answer : (j.error || 'AI utilgjengelig'));
    } catch (e) { setAnswer('AI utilgjengelig'); } finally { setAsking(false); }
  }, [q, asking, call]);

  return (
    <div className="space-y-5">
      {/* AI-sammendrag */}
      <div className="rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.05)] relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1430 0%, #0a0a0a 60%)' }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.25), transparent 70%)' }} />
        <div className="flex items-center justify-between mb-4 relative">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#cf97fc]/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#cf97fc]" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>AI-sammendrag</h3>
              <p className="text-[11px] text-white/50">Generert av DigiHome AI · siste {days} dager</p>
            </div>
          </div>
          <button onClick={loadSummary} disabled={loadingSum} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors">
            {loadingSum ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
        <div className="relative min-h-[80px]">
          {loadingSum && !summary ? (
            <div className="flex items-center gap-2 text-white/60 text-[14px]"><Loader2 className="w-4 h-4 animate-spin" /> Analyserer dataene…</div>
          ) : err ? (
            <p className="text-[14px] text-amber-300">{err}</p>
          ) : (
            <p className="text-[14.5px] leading-relaxed text-white/90 whitespace-pre-line">{summary}</p>
          )}
        </div>
      </div>

      {/* Spør om dataene */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <h3 className="text-[14px] font-bold text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Spør om dataene</h3>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
            placeholder="F.eks. «Hvilken bydel gir flest leads?»"
            className="flex-1 h-11 px-4 rounded-xl border border-[#e6e6e6] bg-[#fafafa] outline-none focus:border-[#cf97fc] focus:bg-white text-[14px] transition-colors"
          />
          <button onClick={() => ask()} disabled={asking || q.trim().length < 3} className="h-11 px-5 rounded-xl bg-[#0a0a0a] text-white text-[13px] font-semibold flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform">
            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Spør
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => { setQ(ex); ask(ex); }} disabled={asking} className="text-[12px] px-3 py-1.5 rounded-full bg-[#f4f0fb] text-[#8b5cf6] font-medium hover:bg-[#ece3fb] transition-colors disabled:opacity-50">
              {ex}
            </button>
          ))}
        </div>

        {(asking || answer) && (
          <div className="mt-4 rounded-xl bg-[#fafafa] p-4 border border-[#f0f0f0]">
            {asking ? (
              <div className="flex items-center gap-2 text-[#888] text-[14px]"><Loader2 className="w-4 h-4 animate-spin" /> Tenker…</div>
            ) : (
              <p className="text-[14px] leading-relaxed text-[#333] whitespace-pre-line">{answer}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
