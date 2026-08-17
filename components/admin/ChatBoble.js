'use client';

/* ═════════════════════════════════════════════════════════════════════════════
   TEAMCHAT — flytende boble nede til høyre, tilgjengelig på alle admin-sider.
   Supermoderne 2026-uttrykk: frostet glass, spring-animasjoner, gradient-glød,
   grupperte meldinger (à la Linear/Slack) og myke mikrointeraksjoner.

   · Én global kanal («generelt») — datamodellen er kanal-klar for senere.
   · @-tagging med autocomplete; taggede får e-post + varsel i klokken.
     Vanlige meldinger varsles KUN med uleste-badge her.
   · Polling: status hvert 15. sek (lukket), nye meldinger hvert 8. sek (åpen).
   · Kun interne roller — investor/eier ser den aldri (håndheves i API-et).
   ═════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MessageCircle, X, Loader2, ArrowUp, Trash2, AtSign } from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading, inherit)' };
const AVATAR_FARGER = ['#6d28d9', '#0a7d55', '#b3562e', '#1d4ed8', '#9a6b1c', '#be185d', '#0e7490', '#4d7c0f'];
const avatarFarge = (navn) => {
  let h = 0;
  for (const c of String(navn || '')) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_FARGER[h % AVATAR_FARGER.length];
};
const initialer = (navn) => String(navn || '?').trim().split(/\s+/).slice(0, 2).map((d) => d[0]).join('').toUpperCase();
const klokke = (iso) => { try { return new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
const dagLabel = (iso) => {
  const d = new Date(iso); const iDag = new Date(); const iGaar = new Date(Date.now() - 864e5);
  if (d.toDateString() === iDag.toDateString()) return 'I dag';
  if (d.toDateString() === iGaar.toDateString()) return 'I går';
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: d.getFullYear() !== iDag.getFullYear() ? 'numeric' : undefined });
};
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Meldingstekst med uthevede @-tagger */
function MeldingTekst({ text, mentions }) {
  const deler = useMemo(() => {
    const navn = (mentions || []).map((m) => m.name).filter(Boolean).sort((a, b) => b.length - a.length);
    if (!navn.length) return [{ t: text }];
    const re = new RegExp(`(@(?:${navn.map(escRe).join('|')}))`, 'g');
    return String(text).split(re).map((del) => (del.startsWith('@') && navn.includes(del.slice(1)) ? { t: del, tag: true } : { t: del }));
  }, [text, mentions]);
  return (
    <p className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.55] text-[#26221e]">
      {deler.map((d, i) => (d.tag
        ? <span key={i} className="rounded-[6px] bg-gradient-to-r from-[#f0ebfa] to-[#ece4fb] px-1.5 py-[1px] font-semibold text-[#6d28d9]">{d.t}</span>
        : <React.Fragment key={i}>{d.t}</React.Fragment>))}
    </p>
  );
}

export default function ChatBoble({ token, user }) {
  const [aapen, setAapen] = useState(false);
  const [vis, setVis] = useState(false); // for inn-animasjon
  const [meldinger, setMeldinger] = useState([]);
  const [laster, setLaster] = useState(false);
  const [tekst, setTekst] = useState('');
  const [sender, setSender] = useState(false);
  const [ulest, setUlest] = useState(0);
  const [brukere, setBrukere] = useState([]);
  const [mention, setMention] = useState(null); // {query, start}
  const [valgte, setValgte] = useState({}); // name -> id
  const [feil, setFeil] = useState('');
  const [fokus, setFokus] = useState(false);
  const listeRef = useRef(null);
  const inputRef = useRef(null);
  const aapenRef = useRef(false);
  aapenRef.current = aapen;

  const api = useCallback(async (sti, opts = {}) => {
    const skille = sti.includes('?') ? '&' : '?';
    const r = await fetch(`/api/admin/chat/${sti}${skille}key=${encodeURIComponent(token)}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Noe gikk galt');
    return j;
  }, [token]);

  const scrollNed = useCallback(() => {
    requestAnimationFrame(() => {
      if (listeRef.current) listeRef.current.scrollTop = listeRef.current.scrollHeight;
    });
  }, []);

  /* Uleste-status: poll hvert 15. sek når lukket */
  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    const hent = async () => {
      if (aapenRef.current) return;
      try { const j = await api('status'); if (alive) setUlest(j.ulest || 0); } catch (e) {}
    };
    hent();
    const iv = setInterval(hent, 15000);
    return () => { alive = false; clearInterval(iv); };
  }, [token, api]);

  /* Åpen: last meldinger + brukere, merk lest, poll nye hvert 8. sek */
  useEffect(() => {
    if (!aapen || !token) return undefined;
    let alive = true;
    setLaster(true);
    (async () => {
      try {
        const [j, ur] = await Promise.all([
          api('meldinger'),
          fetch(`/api/admin/users?key=${encodeURIComponent(token)}`).then((r) => r.json()).catch(() => ({})),
        ]);
        if (!alive) return;
        setMeldinger(j.meldinger || []);
        const alleU = ur.members || ur.users || ur.personer || (Array.isArray(ur) ? ur : []);
        setBrukere(alleU.filter((u) => ['owner', 'admin', 'bruker', 'partner'].includes(u.role)));
        setUlest(0);
        scrollNed();
        api('lest', { method: 'PUT', body: {} }).catch(() => {});
      } catch (e) { if (alive) setFeil(e.message); }
      if (alive) setLaster(false);
    })();
    const iv = setInterval(async () => {
      try {
        setMeldinger((gjeldende) => { hentNye(gjeldende); return gjeldende; });
        async function hentNye(gjeldende) {
          const sisteAt = gjeldende.length ? gjeldende[gjeldende.length - 1].createdAt : null;
          const j = await api(`meldinger${sisteAt ? `?etter=${encodeURIComponent(sisteAt)}` : ''}`);
          if (!alive || !j.meldinger?.length) return;
          setMeldinger((prev) => {
            const kjente = new Set(prev.map((x) => x.id));
            const nye = j.meldinger.filter((x) => !kjente.has(x.id));
            if (!nye.length) return prev;
            scrollNed();
            api('lest', { method: 'PUT', body: {} }).catch(() => {});
            return [...prev, ...nye];
          });
        }
      } catch (e) {}
    }, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, [aapen, token, api, scrollNed]);

  /* Inn-animasjon + autofokus */
  useEffect(() => {
    if (aapen) {
      const t = setTimeout(() => { setVis(true); inputRef.current?.focus(); }, 20);
      return () => clearTimeout(t);
    }
    setVis(false);
    return undefined;
  }, [aapen]);

  /* @-tagging: finn aktiv «@query» rett før markøren */
  const oppdaterTekst = (e) => {
    const v = e.target.value;
    setTekst(v);
    const pos = e.target.selectionStart ?? v.length;
    const foer = v.slice(0, pos);
    const m = foer.match(/(^|\s)@([\wæøåÆØÅ.-]{0,30})$/);
    setMention(m ? { query: m[2].toLowerCase(), start: pos - m[2].length - 1 } : null);
  };

  const mentionTreff = useMemo(() => {
    if (!mention) return [];
    return brukere
      .filter((u) => u.name && u.name.toLowerCase().includes(mention.query))
      .slice(0, 6);
  }, [mention, brukere]);

  const velgMention = (u) => {
    const pos = inputRef.current?.selectionStart ?? tekst.length;
    const nyTekst = `${tekst.slice(0, mention.start)}@${u.name} ${tekst.slice(pos)}`;
    setTekst(nyTekst);
    setValgte((v) => ({ ...v, [u.name]: u.id }));
    setMention(null);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const nyPos = mention.start + u.name.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(nyPos, nyPos);
      }
    });
  };

  const send = async () => {
    const t = tekst.trim();
    if (!t || sender) return;
    setSender(true); setFeil('');
    try {
      const mentions = Object.entries(valgte)
        .filter(([navn]) => t.includes(`@${navn}`))
        .map(([, id]) => ({ id }));
      const j = await api('meldinger', { method: 'POST', body: { text: t, mentions } });
      setMeldinger((prev) => [...prev, j.melding]);
      setTekst(''); setValgte({}); setMention(null);
      scrollNed();
    } catch (e) { setFeil(e.message); }
    setSender(false);
  };

  const slett = async (id) => {
    try {
      await api(`meldinger?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setMeldinger((prev) => prev.filter((x) => x.id !== id));
    } catch (e) { setFeil(e.message); }
  };

  const paaTast = (e) => {
    if (mention && mentionTreff.length && (e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault(); velgMention(mentionTreff[0]); return;
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === 'Escape') setMention(null);
  };

  const erAdminRolle = ['owner', 'admin'].includes(user?.role);
  const minId = user?.id;

  /* Meldinger gruppert per dag + fortsettelser (samme avsender < 5 min) */
  const grupper = useMemo(() => {
    const ut = [];
    let sisteDag = '';
    let forrige = null;
    for (const mld of meldinger) {
      const dag = dagLabel(mld.createdAt);
      if (dag !== sisteDag) { ut.push({ separator: dag, id: `sep-${dag}-${mld.id}` }); sisteDag = dag; forrige = null; }
      const fortsettelse = forrige && forrige.userId === mld.userId
        && (new Date(mld.createdAt) - new Date(forrige.createdAt)) < 5 * 60 * 1000;
      ut.push({ ...mld, fortsettelse });
      forrige = mld;
    }
    return ut;
  }, [meldinger]);

  return (
    <>
      <style>{`
        @keyframes dhChatMeldingInn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dhChatBadgePop { 0% { transform: scale(0.4); } 60% { transform: scale(1.18); } 100% { transform: scale(1); } }
        @keyframes dhChatPuls { 0%, 100% { box-shadow: 0 0 0 0 rgba(109,40,217,0.35); } 55% { box-shadow: 0 0 0 9px rgba(109,40,217,0); } }
      `}</style>

      {/* Panel */}
      {aapen && (
        <div
          data-testid="chat-panel"
          className="fixed bottom-[92px] right-4 z-[70] flex flex-col overflow-hidden rounded-[24px] sm:right-5"
          style={{
            width: 'min(408px, calc(100vw - 24px))',
            height: 'min(620px, calc(100vh - 120px))',
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            boxShadow: '0 32px 90px rgba(20,16,40,0.28), 0 2px 8px rgba(20,16,40,0.08), inset 0 0 0 1px rgba(255,255,255,0.7), 0 0 0 1px rgba(0,0,0,0.05)',
            opacity: vis ? 1 : 0,
            transform: vis ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.94)',
            transformOrigin: 'bottom right',
            transition: 'opacity 180ms ease-out, transform 260ms cubic-bezier(0.34, 1.4, 0.64, 1)',
          }}
        >
          {/* Topp — gradient-aksent + avatarstabel */}
          <div className="relative border-b border-black/[0.05] px-4 pb-3 pt-3.5">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-[#6d28d9] via-[#9d6bff] to-transparent" />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-[12px]"
                  style={{ background: 'linear-gradient(135deg, #1c1917 20%, #3b2373 130%)', boxShadow: '0 6px 16px rgba(59,35,115,0.35)' }}>
                  <MessageCircle className="h-[17px] w-[17px] text-white" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#22c55e] ring-2 ring-white" title="Tilkoblet" />
                </span>
                <div>
                  <p className="text-[14.5px] font-bold leading-tight text-[#1c1917]" style={heading}>Teamchat</p>
                  <p className="text-[11px] leading-tight text-[#a6a19a]">Intern · <span className="font-semibold text-[#8b6bc7]">@tag</span> gir e-postvarsel</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {brukere.length > 0 && (
                  <span className="mr-1 hidden items-center sm:flex" title={brukere.map((u) => u.name).join(', ')}>
                    {brukere.slice(0, 4).map((u, i) => (
                      <span key={u.id} className="flex h-6 w-6 items-center justify-center rounded-full text-[8.5px] font-bold text-white ring-2 ring-white" style={{ background: avatarFarge(u.name), marginLeft: i ? -7 : 0 }}>
                        {initialer(u.name)}
                      </span>
                    ))}
                    {brukere.length > 4 && <span className="ml-1 text-[10.5px] font-semibold text-[#a6a19a]">+{brukere.length - 4}</span>}
                  </span>
                )}
                <button onClick={() => setAapen(false)} data-testid="chat-lukk" className="rounded-[9px] p-1.5 text-[#a6a19a] transition-all hover:bg-black/[0.05] hover:text-[#1c1917] active:scale-90" title="Lukk">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Meldinger */}
          <div ref={listeRef} className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin', background: 'linear-gradient(180deg, rgba(250,249,247,0.6), rgba(255,255,255,0.35))' }} data-testid="chat-meldinger">
            {laster && (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#c2beb8]" /></div>
            )}
            {!laster && meldinger.length === 0 && (
              <div className="flex flex-col items-center gap-2.5 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-[16px]" style={{ background: 'linear-gradient(135deg, #f0ebfa, #e5d9fb)' }}>
                  <AtSign className="h-5 w-5 text-[#6d28d9]" />
                </span>
                <p className="text-[14px] font-bold text-[#1c1917]" style={heading}>Si hei til teamet</p>
                <p className="max-w-[260px] text-[12px] leading-relaxed text-[#a6a19a]">Skriv den første meldingen. Tag noen med @ — da får de varsel på e-post.</p>
              </div>
            )}
            {grupper.map((rad) => (rad.separator ? (
              <div key={rad.id} className="my-3.5 flex items-center justify-center first:mt-1">
                <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-[#a6a19a] shadow-[0_1px_4px_rgba(0,0,0,0.06),inset_0_0_0_1px_rgba(0,0,0,0.04)]">{rad.separator}</span>
              </div>
            ) : (
              <div key={rad.id} data-testid="chat-melding"
                className={`group relative flex items-start gap-2.5 rounded-[12px] px-2 py-1 transition-colors hover:bg-white/80 ${rad.fortsettelse ? 'mt-0' : 'mt-2'}`}
                style={{ animation: 'dhChatMeldingInn 200ms ease-out both' }}>
                {rad.fortsettelse ? (
                  <span className="w-7 shrink-0 pt-[3px] text-right text-[9px] font-medium text-[#c2beb8] opacity-0 transition-opacity group-hover:opacity-100">{klokke(rad.createdAt)}</span>
                ) : (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,0.14)]" style={{ background: `linear-gradient(135deg, ${avatarFarge(rad.userName)}, ${avatarFarge(rad.userName)}cc)` }}>
                    {initialer(rad.userName)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {!rad.fortsettelse && (
                    <p className="flex items-baseline gap-2">
                      <span className="text-[12.5px] font-bold text-[#1c1917]">{rad.userName}</span>
                      <span className="text-[10px] font-medium text-[#c2beb8]">{klokke(rad.createdAt)}</span>
                    </p>
                  )}
                  <MeldingTekst text={rad.text} mentions={rad.mentions} />
                </div>
                {(rad.userId === minId || erAdminRolle) && (
                  <button onClick={() => slett(rad.id)} title="Slett meldingen"
                    className="absolute -top-1.5 right-2 flex h-6 w-6 items-center justify-center rounded-[8px] bg-white text-[#c2beb8] opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_0_0_1px_rgba(0,0,0,0.05)] transition-all hover:text-[#c2413b] group-hover:opacity-100 active:scale-90">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            )))}
          </div>

          {/* Komponist */}
          <div className="relative px-3 pb-3 pt-2">
            {feil && <p className="mb-1.5 px-1 text-[11.5px] text-[#b3261e]" data-testid="chat-feil">{feil}</p>}
            {mention && mentionTreff.length > 0 && (
              <div className="absolute bottom-full left-3 z-10 mb-1.5 w-[268px] overflow-hidden rounded-[14px] py-1"
                style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)', boxShadow: '0 16px 48px rgba(20,16,40,0.2), inset 0 0 0 1px rgba(0,0,0,0.05)' }}
                data-testid="chat-mention-dropdown">
                <p className="px-3 pb-0.5 pt-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#c2beb8]">Tag en kollega · ↵ velger</p>
                {mentionTreff.map((u, i) => (
                  <button key={u.id} onClick={() => velgMention(u)} data-testid={`chat-mention-${u.id}`}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-[#f5f2fc] ${i === 0 ? 'bg-[#f8f6fd]' : ''}`}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: avatarFarge(u.name) }}>{initialer(u.name)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-[#1c1917]">{u.name}</span>
                      {u.tittel && <span className="block truncate text-[10.5px] text-[#a6a19a]">{u.tittel}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-[18px] bg-white p-1.5 transition-shadow"
              style={{ boxShadow: fokus ? '0 0 0 2px rgba(109,40,217,0.28), 0 4px 16px rgba(20,16,40,0.08)' : 'inset 0 0 0 1px rgba(0,0,0,0.07), 0 2px 8px rgba(20,16,40,0.05)' }}>
              <textarea
                ref={inputRef}
                value={tekst}
                onChange={oppdaterTekst}
                onKeyDown={paaTast}
                onClick={oppdaterTekst}
                onFocus={() => setFokus(true)}
                onBlur={() => setFokus(false)}
                placeholder="Skriv en melding… @ for å tagge"
                rows={Math.min(4, Math.max(1, tekst.split('\n').length))}
                data-testid="chat-input"
                className="max-h-[110px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[13.5px] leading-snug text-[#1c1917] outline-none placeholder:text-[#b3ada3]"
              />
              <button onClick={send} disabled={sender || !tekst.trim()} data-testid="chat-send" title="Send (Enter)"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-white transition-all hover:brightness-110 active:scale-90 disabled:opacity-25"
                style={{ background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 4px 12px rgba(59,35,115,0.3)' }}>
                {sender ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 px-2 text-[10px] text-[#c2beb8]">↵ send · ⇧↵ ny linje · @-taggede varsles på e-post</p>
          </div>
        </div>
      )}

      {/* Boblen */}
      <button
        onClick={() => setAapen((o) => !o)}
        data-testid="chat-boble"
        title={aapen ? 'Lukk teamchat' : 'Åpne teamchat'}
        className="fixed bottom-4 right-4 z-[70] flex h-[56px] w-[56px] items-center justify-center rounded-full text-white transition-all hover:scale-[1.07] active:scale-95 sm:bottom-5 sm:right-5"
        style={{
          background: 'linear-gradient(135deg, #1c1917 25%, #3b2373 130%)',
          boxShadow: '0 12px 36px rgba(20,16,40,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
          animation: !aapen && ulest > 0 ? 'dhChatPuls 2.2s ease-in-out infinite' : 'none',
        }}
      >
        <span className="transition-transform duration-200" style={{ transform: aapen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          {aapen ? <X className="h-[22px] w-[22px]" /> : <MessageCircle className="h-[22px] w-[22px]" />}
        </span>
        {!aapen && ulest > 0 && (
          <span data-testid="chat-badge"
            className="absolute -right-0.5 -top-0.5 flex h-[21px] min-w-[21px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold text-white ring-2 ring-[#faf9f7]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', animation: 'dhChatBadgePop 260ms cubic-bezier(0.34,1.56,0.64,1) both' }}>
            {ulest > 99 ? '99+' : ulest}
          </span>
        )}
      </button>
    </>
  );
}
