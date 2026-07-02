'use client';

// Playbook-fanen: rendrer Head of Marketing-playbooken (markdown) i admin.
import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { Loader2, BookOpen, RefreshCw, Printer } from 'lucide-react';

export default function PlaybookTab({ apiKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/admin/playbook?key=${encodeURIComponent(apiKey)}`);
      const j = await res.json();
      if (!j.ok) setErr(j.error || 'Kunne ikke hente playbooken');
      setData(j);
    } catch (e) { setErr('Nettverksfeil'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [apiKey]);

  if (loading && !data) {
    return <div className="h-[420px] grid place-items-center rounded-3xl bg-white border border-[#eee]"><Loader2 className="w-6 h-6 animate-spin text-[#9B5BD6]" /></div>;
  }
  if (err && !data?.markdown) {
    return <div className="rounded-3xl bg-white border border-[#eee] p-8 text-[14px] text-rose-600">{err}</div>;
  }

  const html = marked.parse(data?.markdown || '', { breaks: false, mangle: false, headerIds: false });

  return (
    <div className="rounded-3xl bg-white border border-[#eee] overflow-hidden" data-testid="playbook-tab">
      <style>{`
        .dh-playbook { color: #2a2620; font-size: 14.5px; line-height: 1.75; }
        .dh-playbook h1 { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; margin: 0 0 6px; color: #0a0a0a; }
        .dh-playbook h2 { font-size: 21px; font-weight: 800; letter-spacing: -0.015em; margin: 40px 0 12px; padding-top: 22px; border-top: 1px solid #efe9e1; color: #0a0a0a; }
        .dh-playbook h3 { font-size: 16.5px; font-weight: 700; margin: 26px 0 8px; color: #1a1712; }
        .dh-playbook p { margin: 10px 0; }
        .dh-playbook a { color: #9B5BD6; font-weight: 600; text-decoration: none; }
        .dh-playbook blockquote { margin: 16px 0; padding: 14px 18px; border-left: 3px solid #9B5BD6; background: #faf7ff; border-radius: 0 12px 12px 0; color: #4a4238; }
        .dh-playbook blockquote p { margin: 4px 0; }
        .dh-playbook ul, .dh-playbook ol { margin: 10px 0; padding-left: 22px; }
        .dh-playbook li { margin: 5px 0; }
        .dh-playbook li input[type=checkbox] { margin-right: 8px; accent-color: #18794E; }
        .dh-playbook table { width: 100%; border-collapse: collapse; margin: 14px 0 20px; font-size: 13.5px; }
        .dh-playbook th { text-align: left; font-weight: 700; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a7f71; padding: 8px 12px; border-bottom: 2px solid #e8e1d7; background: #faf8f5; }
        .dh-playbook td { padding: 9px 12px; border-bottom: 1px solid #f1ece4; vertical-align: top; }
        .dh-playbook tr:nth-child(even) td { background: #fcfbf9; }
        .dh-playbook code { background: #f4f1ea; border-radius: 6px; padding: 1.5px 6px; font-size: 12.5px; color: #6b3fa0; }
        .dh-playbook pre { background: #0e0d13; color: #e5e0d8; border-radius: 14px; padding: 16px 18px; overflow-x: auto; font-size: 12.5px; line-height: 1.6; margin: 14px 0; }
        .dh-playbook pre code { background: transparent; color: inherit; padding: 0; }
        .dh-playbook hr { border: none; border-top: 1px solid #efe9e1; margin: 28px 0; }
        .dh-playbook strong { color: #0a0a0a; }
        @media print { .dh-playbook-toolbar { display: none !important; } }
      `}</style>
      <div className="dh-playbook-toolbar flex flex-wrap items-center gap-3 px-6 sm:px-10 py-4 border-b border-[#f0ebe3] bg-[#faf8f5]">
        <span className="inline-flex items-center gap-2 text-[13px] font-bold text-[#0a0a0a]"><BookOpen className="w-4 h-4 text-[#9B5BD6]" /> Head of Marketing Playbook</span>
        {data?.updatedAt && <span className="text-[12px] text-[#9a8f80]">Oppdatert {new Date(data.updatedAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => window.print()} className="h-8 px-3 rounded-full bg-white border border-[#e8e1d7] text-[12px] font-semibold text-[#4a4238] hover:border-[#9B5BD6] transition-colors inline-flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Skriv ut / PDF</button>
          <button onClick={load} className="h-8 w-8 rounded-full bg-white border border-[#e8e1d7] text-[#4a4238] hover:border-[#9B5BD6] grid place-items-center transition-colors" title="Oppdater"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>
      <div className="px-6 sm:px-10 py-8 max-w-[900px]">
        <div className="dh-playbook" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
