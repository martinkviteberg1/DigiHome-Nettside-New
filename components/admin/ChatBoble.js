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
import { MessageCircle, X, Loader2, ArrowUp, Trash2, AtSign, Reply, ArrowLeft, CornerDownRight, Pencil, Link2, Plus, Search, MessagesSquare, ClipboardList, Paperclip, Smile, Pin, FileText, Download, ExternalLink, ChevronLeft, ChevronRight, Image as BildeIkon, Maximize2, Minimize2, BellRing, BellOff, Volume2, VolumeX } from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading, inherit)' };
const AVATAR_FARGER = ['#6d28d9', '#0a7d55', '#b3562e', '#1d4ed8', '#9a6b1c', '#be185d', '#0e7490', '#4d7c0f'];
const avatarFarge = (navn) => {
  let h = 0;
  for (const c of String(navn || '')) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_FARGER[h % AVATAR_FARGER.length];
};
const initialer = (navn) => String(navn || '?').trim().split(/\s+/).slice(0, 2).map((d) => d[0]).join('').toUpperCase();
// Profilbilder: navn → dataURL. Fylles når brukerlisten lastes; brukes av
// NavnAvatar overalt i chatten (meldinger, lesekvitteringer, tråder, søk).
const AVATAR_REG = new Map();
const registrerAvatarer = (liste) => {
  try {
    for (const m of liste || []) {
      if (m && m.name) AVATAR_REG.set(String(m.name).toLowerCase().trim(), m.avatar || '');
    }
  } catch (e) { /* aldri la avatarer velte chatten */ }
};
const avatarFor = (navn) => AVATAR_REG.get(String(navn || '').toLowerCase().trim()) || '';
// Rund avatar: profilbilde hvis brukeren har lastet opp ett, ellers initialer.
function NavnAvatar({ navn, size = 28, fontPx, className = '', style = {}, gradient = false }) {
  const bilde = avatarFor(navn);
  if (bilde) {
    return (
      <img
        src={bilde} alt="" title={navn}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size, ...style }}
      />
    );
  }
  const f = avatarFarge(navn);
  return (
    <span
      title={navn}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: fontPx || Math.round(size * 0.36), background: gradient ? `linear-gradient(135deg, ${f}, ${f}cc)` : f, ...style }}
    >
      {initialer(navn)}
    </span>
  );
}
const klokke = (iso) => { try { return new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
const dagLabel = (iso) => {
  const d = new Date(iso); const iDag = new Date(); const iGaar = new Date(Date.now() - 864e5);
  if (d.toDateString() === iDag.toDateString()) return 'I dag';
  if (d.toDateString() === iGaar.toDateString()) return 'I går';
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: d.getFullYear() !== iDag.getFullYear() ? 'numeric' : undefined });
};
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Emoji-utvalget for reaksjoner — må matche CHAT_EMOJIS i lib/chat.js */
const EMOJIS = ['👍', '❤️', '😂', '🎉', '✅', '👀', '🙏', '🔥'];

/* Kuratert utvalg for skrivefeltets emoji-velger */
const TEKST_EMOJIS = ['😀', '😄', '😂', '🤣', '😊', '😉', '😍', '🤩', '😎', '🤔', '😅', '😬', '🙃', '😴', '🥳', '🫡', '👍', '👎', '👏', '🙌', '🤝', '💪', '🙏', '👀', '❤️', '💜', '🔥', '✨', '🎉', '✅', '❌', '⚡', '💡', '📌', '📎', '🏠', '🔑', '💰', '📈', '☕'];

const erBilde = (type) => /^image\//i.test(String(type || ''));
const erPdf = (type) => /^application\/pdf/i.test(String(type || ''));
const erDocxFil = (fil) => /wordprocessingml/i.test(String(fil?.type || '')) || /\.docx$/i.test(String(fil?.name || ''));
const erVideo = (type) => /^video\/(mp4|webm|quicktime)/i.test(String(type || ''));
const erLyd = (type) => /^audio\//i.test(String(type || ''));
const erRenTekst = (type) => /^text\/plain/i.test(String(type || ''));

const filStorrelse = (b) => {
  const n = Number(b) || 0;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(n / 1024))} kB`;
};

/* Aggregér reaksjoner: [{emoji, antall, min, navn[]}] i innsettingsrekkefølge */
const aggReaksjoner = (reaksjoner, minId) => {
  const ut = [];
  const per = new Map();
  for (const r of reaksjoner || []) {
    let e = per.get(r.emoji);
    if (!e) { e = { emoji: r.emoji, antall: 0, min: false, navn: [] }; per.set(r.emoji, e); ut.push(e); }
    e.antall += 1;
    if (r.userId === minId) e.min = true;
    if (e.navn.length < 6) e.navn.push(r.userName);
  }
  return ut;
};

/* PDF-visning i filviseren: rendres side for side med pdfjs (samme motor som
   signeringssiden) — konsistent, nydelig visning i alle nettlesere, uten
   nettleserens grå PDF-ramme. DOCX går via server-konvertering til PDF først. */
function PdfVisning({ url, navn }) {
  const holderRef = useRef(null);
  const [status, setStatus] = useState('laster'); // 'laster' | 'ok' | 'feil'
  const [antallSider, setAntallSider] = useState(0);
  useEffect(() => {
    let aktiv = true;
    const holder = holderRef.current;
    (async () => {
      try {
        setStatus('laster');
        const res = await fetch(url);
        if (!res.ok) throw new Error('Kunne ikke hente dokumentet');
        const data = await res.arrayBuffer();
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = '/api/pdf-worker';
        const doc = await pdfjs.getDocument({ data }).promise;
        if (!aktiv) return;
        if (holder) holder.innerHTML = '';
        const bredde = Math.min(920, Math.max(320, (holder?.clientWidth || 800) - 16));
        const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
        for (let i = 1; i <= doc.numPages; i += 1) {
          const side = await doc.getPage(i);
          if (!aktiv) return;
          const vp0 = side.getViewport({ scale: 1 });
          const skala = bredde / vp0.width;
          const vp = side.getViewport({ scale: skala * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.style.cssText = `width:${Math.floor(vp.width / dpr)}px;height:${Math.floor(vp.height / dpr)}px;display:block;background:#fff;border-radius:10px;box-shadow:0 18px 60px rgba(0,0,0,0.45);margin:0 auto 14px;max-width:100%;`;
          if (holder) holder.appendChild(canvas);
          await side.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        }
        if (aktiv) { setAntallSider(doc.numPages); setStatus('ok'); }
      } catch (e) { if (aktiv) setStatus('feil'); }
    })();
    return () => { aktiv = false; if (holder) holder.innerHTML = ''; };
  }, [url]);
  return (
    <div className="h-full w-full max-w-[960px] overflow-y-auto rounded-[14px] px-2 py-2" onClick={(e) => e.stopPropagation()}
      style={{ scrollbarWidth: 'thin', animation: 'dhChatViserZoomInn 200ms ease-out both' }} data-testid="filviser-pdf">
      {status === 'laster' && (
        <div className="flex h-full flex-col items-center justify-center gap-2.5 text-white/70">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-[12px]">Åpner {navn ? `«${navn}»` : 'dokumentet'} …</p>
        </div>
      )}
      {status === 'feil' && (
        <div className="flex h-full items-center justify-center">
          <p className="px-6 text-center text-[12.5px] leading-relaxed text-white/70">Kunne ikke vise dokumentet her — bruk nedlastingsknappen øverst til høyre.</p>
        </div>
      )}
      <div ref={holderRef} />
      {status === 'ok' && antallSider > 0 && (
        <p className="pb-2 pt-1 text-center text-[11px] text-white/45">{antallSider === 1 ? '1 side' : `${antallSider} sider`}</p>
      )}
    </div>
  );
}

/* Utdrag rundt første søketreff: {foer, treff, etter} — for uthevet visning */
const sokUtdrag = (tekst, q) => {
  const t = String(tekst || '');
  const i = t.toLowerCase().indexOf(String(q || '').toLowerCase());
  if (i < 0) return { foer: t.slice(0, 110), treff: '', etter: '' };
  const start = Math.max(0, i - 40);
  return {
    foer: (start > 0 ? '…' : '') + t.slice(start, i),
    treff: t.slice(i, i + q.length),
    etter: t.slice(i + q.length, i + q.length + 70),
  };
};

/* Grupperer meldinger: dag-separatorer + fortsettelser (samme avsender < 5 min).
   Brukes både i hovedstrømmen og i trådvisningen. */const grupperMeldinger = (meldinger) => {
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
};

/* Meldingstekst med uthevede @-tagger */
const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g;
const foersteUrl = (t) => { const m = String(t || '').match(URL_RE); return m ? m[0].replace(/[.,;:!?]+$/, '') : null; };

function MeldingTekst({ text, mentions }) {
  const deler = useMemo(() => {
    const navn = (mentions || []).map((m) => m.name).filter(Boolean).sort((a, b) => b.length - a.length);
    const grunn = navn.length
      ? String(text).split(new RegExp(`(@(?:${navn.map(escRe).join('|')}))`, 'g'))
        .map((del) => (del.startsWith('@') && navn.includes(del.slice(1)) ? { t: del, tag: true } : { t: del }))
      : [{ t: String(text || '') }];
    // Linkifiser URL-er i vanlige tekstsegmenter (aldri inne i tagger)
    const ut = [];
    for (const d of grunn) {
      if (d.tag) { ut.push(d); continue; }
      for (const b of String(d.t).split(URL_RE)) {
        if (/^https?:\/\//.test(b)) {
          const hale = (b.match(/[.,;:!?]+$/) || [''])[0];
          ut.push({ t: b.slice(0, b.length - hale.length), lenke: true });
          if (hale) ut.push({ t: hale });
        } else if (b) ut.push({ t: b });
      }
    }
    return ut;
  }, [text, mentions]);
  return (
    <p className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.55] text-[#26221e]">
      {deler.map((d, i) => {
        if (d.tag) return <span key={i} className="rounded-[6px] bg-gradient-to-r from-[#f0ebfa] to-[#ece4fb] px-1.5 py-[1px] font-semibold text-[#6d28d9]">{d.t}</span>;
        if (d.lenke) {
          return (
            <a key={i} href={d.t} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
              className="break-all font-medium text-[#6d28d9] underline decoration-[#c9b8f2] underline-offset-2 transition-colors hover:decoration-[#6d28d9]">
              {d.t.replace(/^https?:\/\/(www\.)?/, '').slice(0, 64)}{d.t.replace(/^https?:\/\/(www\.)?/, '').length > 64 ? '…' : ''}
            </a>
          );
        }
        return <React.Fragment key={i}>{d.t}</React.Fragment>;
      })}
    </p>
  );
}

/* Lenke-forhåndsvisning under meldingen — hentes server-side (SSRF-sikret,
   cachet i Mongo) og huskes i minnet per url så polling aldri refetcher. */
const unfurlMinne = new Map();
function LenkeKort({ url, token }) {
  const [meta, setMeta] = useState(unfurlMinne.get(url) || null);
  useEffect(() => {
    if (unfurlMinne.has(url)) { setMeta(unfurlMinne.get(url)); return undefined; }
    let alive = true;
    fetch(`/api/admin/chat/unfurl?url=${encodeURIComponent(url)}&key=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j) => { unfurlMinne.set(url, j && j.tittel ? j : null); if (alive) setMeta(j && j.tittel ? j : null); })
      .catch(() => { unfurlMinne.set(url, null); });
    return () => { alive = false; };
  }, [url, token]);
  if (!meta?.tittel) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" data-testid="chat-lenkekort" onClick={(e) => e.stopPropagation()}
      className="mt-1.5 flex max-w-[310px] items-stretch overflow-hidden rounded-[12px] bg-white text-left transition-all hover:-translate-y-px active:scale-[0.99]"
      style={{ boxShadow: '0 1px 5px rgba(20,16,40,0.07), inset 0 0 0 1px rgba(0,0,0,0.05)' }}>
      <span className="block min-w-0 flex-1 px-3 py-2">
        <span className="block text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#a6a19a]">{meta.host}</span>
        <span className="mt-0.5 block truncate text-[12px] font-bold leading-snug text-[#1c1917]">{meta.tittel}</span>
        {meta.beskrivelse && (
          <span className="mt-0.5 block text-[10.5px] leading-snug text-[#8a857d]" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{meta.beskrivelse}</span>
        )}
      </span>
      {meta.bilde && <img src={meta.bilde} alt="" loading="lazy" className="w-[78px] shrink-0 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />}
    </a>
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
  const [traad, setTraad] = useState(null); // rotmelding for åpen tråd (null = hovedstrøm)
  const [traadMeldinger, setTraadMeldinger] = useState([]); // svarene i den åpne tråden
  const [traadLaster, setTraadLaster] = useState(false);
  const [nyttSidenSist, setNyttSidenSist] = useState(null); // ISO — plassering av «Nytt siden sist»-linjen
  const [pendingTraad, setPendingTraad] = useState(null); // trådid fra dyplenke (?traad=)
  const [pendingMelding, setPendingMelding] = useState(null); // meldingsid fra dyplenke (?melding=)
  const [fremhevet, setFremhevet] = useState(null); // melding som pulserer etter dyplenke-hopp
  const pendingMeldingRef = useRef(null);
  pendingMeldingRef.current = pendingMelding;
  const [fane, setFane] = useState('chat'); // 'chat' | 'traader'
  const [traader, setTraader] = useState([]); // trådoversikten
  const [traadSok, setTraadSok] = useState('');
  const [redigererNavn, setRedigererNavn] = useState(false);
  const [navnUtkast, setNavnUtkast] = useState('');
  const [visSakVelger, setVisSakVelger] = useState(false);
  const [sakSok, setSakSok] = useState('');
  const [sakListe, setSakListe] = useState(null); // null = ikke lastet ennå
  const [sakJobber, setSakJobber] = useState(false); // kobling/oppretting pågår
  const listeRef = useRef(null);
  const traadListeRef = useRef(null);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);
  const aapenRef = useRef(false);
  aapenRef.current = aapen;
  const traadRef = useRef(null);
  traadRef.current = traad;
  const faneRef = useRef('chat');
  faneRef.current = fane;
  const lesteTraaderRef = useRef(new Set()); // tråder åpnet i denne økten (badge nulles)
  const [pendingVedlegg, setPendingVedlegg] = useState([]); // opplastede filer som venter på send
  const [lasterOpp, setLasterOpp] = useState(null); // {navn, prosent} under opplasting
  const [visEmojiFor, setVisEmojiFor] = useState(null); // meldingsid med åpen emoji-velger
  const [redigerer, setRedigerer] = useState(null); // {id, tekst} under redigering
  const [festede, setFestede] = useState([]); // festede meldinger (stripe øverst)
  const [visFestede, setVisFestede] = useState(false); // utvidet festet-stripe
  const [skriver, setSkriver] = useState([]); // navn som skriver nå
  const [dragOver, setDragOver] = useState(false);
  const filInputRef = useRef(null);
  // ── Kanaler: 'generelt' = internchat; 'investor-<id>' = én investors direktelinje.
  // Investorer låses til sin egen kanal på SERVEREN — klienten trenger aldri
  // sende kanal for dem. Interne kan bytte mellom intern og investorkanaler.
  const erInvestor = user?.role === 'investor';
  const [aktivKanal, setAktivKanal] = useState('generelt');
  const aktivKanalRef = useRef('generelt');
  aktivKanalRef.current = aktivKanal;
  const [invKanaler, setInvKanaler] = useState([]); // teamets oversikt m/ ulest per investor
  const skriverSistRef = useRef(0); // throttle for «skriver…»-heartbeat
  const dragTellerRef = useRef(0); // dragenter/-leave-balanse (barneelementer)
  const [visSok, setVisSok] = useState(false); // meldingssøk aktivt
  const [sokTekst, setSokTekst] = useState('');
  const [sokTreff, setSokTreff] = useState(null);
  const [sokLaster, setSokLaster] = useState(false);
  const [varslerPaa, setVarslerPaa] = useState(false); // desktop-varsler (Notification API)
  const [lydPaa, setLydPaa] = useState(false); // pling ved nye meldinger
  const [visEmojiTekst, setVisEmojiTekst] = useState(false); // emoji-velger for skrivefeltet
  const [fullskjerm, setFullskjerm] = useState(false); // panelet utvidet til fullskjerm
  const forrigeUlestRef = useRef(0);
  const origTittelRef = useRef(null);

  /* Innstillinger huskes lokalt (per nettleser) */
  useEffect(() => {
    try {
      setLydPaa(localStorage.getItem('dhChatLyd') === '1');
      setVarslerPaa(typeof Notification !== 'undefined' && Notification.permission === 'granted' && localStorage.getItem('dhChatVarsler') !== '0');
    } catch (e) {}
  }, []);

  /* Fane-teller: «(2) …» i fanetittelen når det finnes uleste meldinger */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (origTittelRef.current === null) origTittelRef.current = document.title;
    const grunn = origTittelRef.current;
    document.title = ulest > 0 && !aapen ? `(${ulest}) ${grunn}` : grunn;
    return () => { document.title = grunn; };
  }, [ulest, aapen]);
  const [viser, setViser] = useState(null); // {vedlegg, index, avsender, tidspunkt, zoom} — filviseren

  /* Filviseren: Esc lukker, piltaster blar mellom vedlegg, zoom nullstilles */
  useEffect(() => {
    if (!viser) return undefined;
    const h = (e) => {
      if (e.key === 'Escape') setViser(null);
      if (e.key === 'ArrowRight') setViser((v) => (v && v.index < v.vedlegg.length - 1 ? { ...v, index: v.index + 1, zoom: false } : v));
      if (e.key === 'ArrowLeft') setViser((v) => (v && v.index > 0 ? { ...v, index: v.index - 1, zoom: false } : v));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [viser]);

  /* Dyplenke fra e-postvarsler: /admin?chat=1 åpner chatten — ?traad=<id> rett inn i tråden */
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.has('chat')) {
        setAapen(true);
        if (p.get('traad')) setPendingTraad(p.get('traad'));
        if (p.get('melding')) setPendingMelding(p.get('melding'));
        p.delete('chat');
        p.delete('traad');
        p.delete('melding');
        const q = p.toString();
        window.history.replaceState({}, '', window.location.pathname + (q ? `?${q}` : '') + window.location.hash);
      }
    } catch (e) {}
  }, []);

  /* Andre komponenter (f.eks. sak-skuffen) kan åpne en tråd direkte via
     window-event: dispatchEvent(new CustomEvent('dh-aapne-traad', {detail:{traadId}})) */
  useEffect(() => {
    const h = (e) => {
      const id = e?.detail?.traadId;
      if (!id) return;
      setAapen(true);
      setPendingTraad(String(id));
    };
    window.addEventListener('dh-aapne-traad', h);
    return () => window.removeEventListener('dh-aapne-traad', h);
  }, []);

  const api = useCallback(async (sti, opts = {}) => {
    // Aktiv kanal plumbes automatisk inn i ALLE chat-kall (query + body) —
    // 'generelt' sendes ikke (serverens standard). Investorer sender aldri
    // kanal; serveren låser dem uansett til sin egen.
    const kNaa = aktivKanalRef.current;
    const medKanal = kNaa && kNaa !== 'generelt';
    const stiK = medKanal ? `${sti}${sti.includes('?') ? '&' : '?'}kanal=${encodeURIComponent(kNaa)}` : sti;
    const skille = stiK.includes('?') ? '&' : '?';
    const bodyK = opts.body && medKanal ? { kanal: kNaa, ...opts.body } : opts.body;
    const r = await fetch(`/api/admin/chat/${stiK}${skille}key=${encodeURIComponent(token)}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: bodyK ? JSON.stringify(bodyK) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Noe gikk galt');
    return j;
  }, [token]);

  // Teamets investorkanal-oversikt (navn, avatar, ulest) — lett polling
  useEffect(() => {
    if (!token || erInvestor) return undefined;
    let alive = true;
    const hentIk = async () => {
      try {
        const r = await fetch(`/api/admin/chat/investorkanaler?key=${encodeURIComponent(token)}`);
        const j = await r.json().catch(() => ({}));
        if (alive && j.ok) setInvKanaler(j.kanaler || []);
      } catch (e) {}
    };
    hentIk();
    const iv = setInterval(hentIk, 15000);
    return () => { alive = false; clearInterval(iv); };
  }, [token, erInvestor]);

  // Bytt kanal: nullstill visningen — hovedeffekten laster alt på nytt
  const byttKanal = useCallback((k) => {
    if (k === aktivKanalRef.current) return;
    setAktivKanal(k);
    setMeldinger([]); setFestede([]); setTraader([]); setTraad(null); setTraadMeldinger([]);
    setNyttSidenSist(null); setFane('chat'); setFeil('');
  }, []);
  const aktivInvestor = !erInvestor && aktivKanal !== 'generelt'
    ? invKanaler.find((k) => k.kanal === aktivKanal) || null
    : null;
  const invUlestTotalt = erInvestor ? 0 : invKanaler.reduce((a, k) => a + (k.ulest || 0), 0);

  const scrollNed = useCallback(() => {
    requestAnimationFrame(() => {
      if (listeRef.current) listeRef.current.scrollTop = listeRef.current.scrollHeight;
    });
  }, []);

  const scrollTraadNed = useCallback(() => {
    requestAnimationFrame(() => {
      if (traadListeRef.current) traadListeRef.current.scrollTop = traadListeRef.current.scrollHeight;
    });
  }, []);

  /* Trådoversikten — badge for tråder brukeren alt har åpnet i økten nulles,
     ellers beholdes høyeste kjente ulest-tall (server nuller ved merk-lest). */
  const lastTraader = useCallback(async () => {
    try {
      const j = await api('traader');
      if (!j.traader) return;
      setTraader((prev) => {
        const prevMap = new Map(prev.map((t) => [t.id, t]));
        return j.traader.map((t) => {
          if (lesteTraaderRef.current.has(t.id)) return { ...t, uleste: t.uleste || 0 };
          const p = prevMap.get(t.id);
          return { ...t, uleste: Math.max(t.uleste || 0, p?.uleste || 0) };
        });
      });
    } catch (e) {}
  }, [api]);

  /* Diskret to-tonet pling (WebAudio — ingen lydfil nødvendig) */
  const pling = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1318, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      o.start();
      o.stop(ctx.currentTime + 0.45);
      setTimeout(() => ctx.close().catch(() => {}), 600);
    } catch (e) {}
  }, []);

  /* Uleste-status: poll hvert 15. sek når lukket — nye meldinger gir
     fanetittel-teller, valgfritt desktop-varsel og valgfri pling */
  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    const hent = async () => {
      if (aapenRef.current) return;
      try {
        const j = await api('status');
        if (!alive) return;
        const nyUlest = j.ulest || 0;
        // Kun ved ØKNING (nye meldinger siden sist sjekk) varsles det
        if (nyUlest > forrigeUlestRef.current) {
          try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && localStorage.getItem('dhChatVarsler') !== '0') {
              const kropp = j.sisteUlest ? `${j.sisteUlest.userName}: ${j.sisteUlest.text}` : `${nyUlest} nye meldinger`;
              const n = new Notification('DigiHome Teamchat', { body: kropp, tag: 'dh-chat', silent: true });
              n.onclick = () => { try { window.focus(); } catch (e) {} setAapen(true); n.close(); };
            }
          } catch (e) {}
          try { if (localStorage.getItem('dhChatLyd') === '1') pling(); } catch (e) {}
        }
        forrigeUlestRef.current = nyUlest;
        setUlest(nyUlest);
      } catch (e) {}
    };
    hent();
    const iv = setInterval(hent, 15000);
    return () => { alive = false; clearInterval(iv); };
  }, [token, api, pling]);

  /* Åpen: last meldinger + brukere, merk lest (svaret gir «Nytt siden sist»-punktet),
     poll oppdateringer hvert 8. sek — hovedstrøm m/ trådtellere + evt. åpen tråd */
  useEffect(() => {
    if (!aapen || !token) return undefined;
    let alive = true;
    setLaster(true);
    (async () => {
      try {
        const [j, ur, , jFest] = await Promise.all([
          api('meldinger'),
          fetch(`/api/admin/users?key=${encodeURIComponent(token)}`).then((r) => r.json()).catch(() => ({})),
          lastTraader(), // lastes FØR merk-lest slik at ulest-badges per tråd fanges
          api('festede').catch(() => ({})),
        ]);
        if (!alive) return;
        setMeldinger(j.meldinger || []);
        setFestede(jFest?.festede || []);
        const alleU = ur.members || ur.users || ur.personer || (Array.isArray(ur) ? ur : []);
        registrerAvatarer(alleU);
        setBrukere(alleU.filter((u) => ['owner', 'admin', 'bruker', 'partner'].includes(u.role)));
        setUlest(0);
        // Merk lest — API-et returnerer FORRIGE lesetidspunkt, som blir
        // «Nytt siden sist»-linjen. Vises kun hvis andre faktisk har skrevet noe nytt.
        const lest = await api('lest', { method: 'PUT', body: {} }).catch(() => ({}));
        if (!alive) return;
        const harNytt = lest.forrigeLestAt
          && (j.meldinger || []).some((m) => m.createdAt > lest.forrigeLestAt && m.userId !== user?.id);
        if (harNytt) {
          setNyttSidenSist(lest.forrigeLestAt);
          // Scroll slik at markøren er synlig — du fortsetter der du slapp.
          // (Dyplenke til konkret melding vinner over markør-scrollen.)
          setTimeout(() => {
            if (pendingMeldingRef.current) return;
            const el = listeRef.current?.querySelector('[data-nytt-siden-sist]');
            if (el) el.scrollIntoView({ block: 'center' });
            else scrollNed();
          }, 90);
        } else if (!pendingMeldingRef.current) {
          scrollNed();
        }
      } catch (e) { if (alive) setFeil(e.message); }
      if (alive) setLaster(false);
    })();
    const iv = setInterval(async () => {
      try {
        // Hovedstrømmen: full refetch gir ferske trådtellere, reaksjoner,
        // redigeringer og pins i tillegg til nye meldinger
        const j = await api('meldinger');
        if (!alive || !j.meldinger) return;
        setMeldinger((prev) => {
          const sig = (l) => l.map((m) => `${m.id}:${m.traad?.antall || 0}:${m.redigertAt || ''}:${m.festet ? 1 : 0}:${(m.reaksjoner || []).length}`).join('|');
          if (sig(prev) === sig(j.meldinger)) return prev;
          const nyttNederst = j.meldinger.length && j.meldinger[j.meldinger.length - 1].id !== prev[prev.length - 1]?.id;
          if (nyttNederst) { scrollNed(); api('lest', { method: 'PUT', body: {} }).catch(() => {}); }
          return j.meldinger;
        });
        // Åpen tråd: hent evt. nye svar + oppdater roten (reaksjoner/navn/sak)
        const t = traadRef.current;
        if (t && !t.laster) {
          const jt = await api(`meldinger?traad=${encodeURIComponent(t.id)}`);
          if (!alive || !jt.meldinger) return;
          const rotNy = jt.meldinger.find((m) => m.id === t.id);
          if (rotNy) setTraad((prev) => (prev && prev.id === rotNy.id ? { ...prev, ...rotNy, sak: rotNy.sak || prev.sak } : prev));
          setTraadMeldinger((prev) => {
            const svar = jt.meldinger.filter((m) => m.id !== t.id);
            const sigT = (l) => l.map((m) => `${m.id}:${m.redigertAt || ''}:${(m.reaksjoner || []).length}`).join('|');
            if (sigT(svar) === sigT(prev)) return prev;
            if (svar.length > prev.length) scrollTraadNed();
            return svar;
          });
        }
        // Trådoversikten + festet-stripen holdes ferske
        await lastTraader();
        const jF = await api('festede').catch(() => null);
        if (alive && jF?.festede) setFestede(jF.festede);
      } catch (e) {}
    }, 8000);
    return () => {
      alive = false; clearInterval(iv);
      // Nullstill ved lukking — neste åpning beregner markør og tråd på nytt
      setTraad(null); setTraadMeldinger([]); setNyttSidenSist(null);
      setFane('chat'); setVisSakVelger(false); setRedigererNavn(false);
    };
  }, [aapen, token, api, scrollNed, scrollTraadNed, lastTraader, user?.id, aktivKanal]);

  /* «Skriver…»-indikator: lett polling (3,5 s) mens chatten er åpen */
  useEffect(() => {
    if (!aapen || !token) return undefined;
    let alive = true;
    const hent = async () => {
      try {
        const j = await api('skriver');
        if (alive && Array.isArray(j.skriver)) setSkriver(j.skriver);
      } catch (e) {}
    };
    hent();
    const iv = setInterval(hent, 3500);
    return () => { alive = false; clearInterval(iv); setSkriver([]); };
  }, [aapen, token, api]);

  /* Inn-animasjon + autofokus */
  useEffect(() => {
    if (aapen) {
      const t = setTimeout(() => { setVis(true); inputRef.current?.focus(); }, 20);
      return () => clearTimeout(t);
    }
    setVis(false);
    return undefined;
  }, [aapen]);

  /* Åpne en tråd — fra svar-knapp, trådchip, oversikten eller dyplenke (?traad=<id>) */
  const aapneTraad = useCallback(async (rotEllerId) => {
    const rotId = typeof rotEllerId === 'string' ? rotEllerId : (rotEllerId.threadId || rotEllerId.id);
    lesteTraaderRef.current.add(rotId);
    setTraader((prev) => prev.map((t) => (t.id === rotId ? { ...t, uleste: 0 } : t)));
    setRedigererNavn(false); setVisSakVelger(false); setSakSok('');
    setTraad(typeof rotEllerId === 'object' && rotEllerId.text ? rotEllerId : { id: rotId, laster: true });
    setTraadMeldinger([]);
    setTraadLaster(true);
    setFeil('');
    try {
      const jt = await api(`meldinger?traad=${encodeURIComponent(rotId)}`);
      const alle = jt.meldinger || [];
      const rot = alle.find((m) => !m.threadId) || alle[0];
      if (!rot) throw new Error('Tråden finnes ikke lenger');
      setTraad(rot);
      setTraadMeldinger(alle.filter((m) => m.id !== rot.id));
      requestAnimationFrame(() => inputRef.current?.focus());
      scrollTraadNed();
    } catch (e) { setFeil(e.message); setTraad(null); }
    setTraadLaster(false);
  }, [api, scrollTraadNed]);

  const lukkTraad = useCallback(() => {
    setTraad(null); setTraadMeldinger([]); setFeil('');
    setRedigererNavn(false); setVisSakVelger(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  /* Trådnavn: lagres på rotmeldingen — synkes til hovedstrøm og oversikt */
  const lagreTraadNavn = async () => {
    const rot = traadRef.current;
    if (!rot) return;
    const navn = navnUtkast.trim().slice(0, 80);
    setRedigererNavn(false);
    if (navn === (rot.traadNavn || '')) return;
    try {
      await api('traad', { method: 'PUT', body: { id: rot.id, navn } });
      const nyNavn = navn || null;
      setTraad((t) => (t && t.id === rot.id ? { ...t, traadNavn: nyNavn } : t));
      setMeldinger((prev) => prev.map((m) => (m.id === rot.id ? { ...m, traadNavn: nyNavn } : m)));
      setTraader((prev) => prev.map((t) => (t.id === rot.id ? { ...t, navn: nyNavn } : t)));
    } catch (e) { setFeil(e.message); }
  };

  /* Sak-kobling: hent saksliste (én gang), koble/koble fra */
  const hentSaker = async () => {
    if (sakListe !== null) return;
    try {
      const r = await fetch(`/api/admin/tasks?key=${encodeURIComponent(token)}`);
      const j = await r.json().catch(() => ({}));
      setSakListe(Array.isArray(j.tasks) ? j.tasks : []);
    } catch (e) { setSakListe([]); }
  };

  const kobleSak = async (sakId) => {
    const rot = traadRef.current;
    if (!rot || sakJobber) return;
    setSakJobber(true); setFeil('');
    try {
      const j = await api('traad', { method: 'PUT', body: { id: rot.id, sakId: sakId || null } });
      const sak = sakId ? (j.sak || null) : null;
      setTraad((t) => (t && t.id === rot.id ? { ...t, sakId: sak?.id || null, sak } : t));
      setMeldinger((prev) => prev.map((m) => (m.id === rot.id ? { ...m, sakId: sak?.id || null } : m)));
      setTraader((prev) => prev.map((t) => (t.id === rot.id ? { ...t, sak } : t)));
      setVisSakVelger(false); setSakSok('');
    } catch (e) { setFeil(e.message); }
    setSakJobber(false);
  };

  /* Opprett en ny sak direkte fra tråden — trådinnholdet blir beskrivelsen,
     og saken kobles automatisk tilbake til tråden */
  const opprettSakFraTraad = async () => {
    const rot = traadRef.current;
    if (!rot || sakJobber) return;
    setSakJobber(true); setFeil('');
    try {
      const dato = (iso) => { try { return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
      const linjer = [
        `Opprettet fra teamchat-tråd${rot.traadNavn ? ` «${rot.traadNavn}»` : ''}.`,
        '',
        `**${rot.userName}** (${dato(rot.createdAt)}): ${rot.text}`,
      ];
      if (traadMeldinger.length) {
        linjer.push('', 'Svar i tråden:');
        for (const m of traadMeldinger.slice(0, 30)) linjer.push(`- **${m.userName}** (${dato(m.createdAt)}): ${m.text}`);
      }
      const r = await fetch(`/api/admin/tasks?key=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: (rot.traadNavn || rot.text || 'Sak fra teamchat').slice(0, 120),
          description: linjer.join('\n').slice(0, 7900),
          notify: false,
          actor: user?.name || 'Admin',
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.task?.id) throw new Error(j.error || 'Kunne ikke opprette saken');
      await kobleSak(j.task.id);
    } catch (e) { setFeil(e.message); }
    setSakJobber(false);
  };

  /* Fil-URL for visning/nedlasting (inline kun for trygge typer, håndheves server-side) */
  const filUrl = (id, inline = true) => `/api/admin/chat/fil/${encodeURIComponent(id)}?key=${encodeURIComponent(token)}${inline ? '&inline=1' : ''}`;

  /* Åpne filviseren på et gitt vedlegg i meldingen */
  const aapneViser = (rad, filId) => {
    const liste = rad.vedlegg || [];
    if (!liste.length) return;
    const idx = Math.max(0, liste.findIndex((v) => v.id === filId));
    setViser({ vedlegg: liste, index: idx, avsender: rad.userName, tidspunkt: rad.createdAt, zoom: false });
  };

  /* Chunket opplasting (samme mønster som saksvedlegg) — maks 8 MB, 6 per melding */
  const lastOppFil = async (fil) => {
    if (!fil) return;
    if (fil.size > 8 * 1024 * 1024) { setFeil(`«${fil.name}» er for stor (maks 8 MB)`); return; }
    setFeil('');
    setLasterOpp({ navn: fil.name, prosent: 0 });
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(',')[1] || '');
        r.onerror = () => rej(new Error('Kunne ikke lese filen'));
        r.readAsDataURL(fil);
      });
      const BIT = 700000;
      const total = Math.max(1, Math.ceil(base64.length / BIT));
      const uploadId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let svar = null;
      for (let i = 0; i < total; i += 1) {
        svar = await api('fil-chunk', { method: 'POST', body: { uploadId, index: i, total, data: base64.slice(i * BIT, (i + 1) * BIT), name: fil.name, type: fil.type || 'application/octet-stream' } });
        setLasterOpp({ navn: fil.name, prosent: Math.round(((i + 1) / total) * 100) });
      }
      if (svar?.complete && svar.fil) setPendingVedlegg((prev) => (prev.length >= 6 ? prev : [...prev, svar.fil]));
    } catch (e) { setFeil(e.message || 'Opplastingen feilet'); }
    setLasterOpp(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const fjernPendingVedlegg = async (id) => {
    setPendingVedlegg((prev) => prev.filter((v) => v.id !== id));
    try { await fetch(`/api/admin/chat/fil/${encodeURIComponent(id)}?key=${encodeURIComponent(token)}`, { method: 'DELETE' }); } catch (e) {}
  };

  /* Emoji-reaksjon (toggle) — oppdaterer alle visninger optimistisk fra svaret */
  const reager = async (id, emoji) => {
    setVisEmojiFor(null);
    try {
      const j = await api('reaksjon', { method: 'POST', body: { id, emoji } });
      const oppd = (l) => l.map((m) => (m.id === id ? { ...m, reaksjoner: j.reaksjoner } : m));
      setMeldinger(oppd);
      setTraadMeldinger(oppd);
      setFestede(oppd);
      setTraad((t) => (t && t.id === id ? { ...t, reaksjoner: j.reaksjoner } : t));
    } catch (e) { setFeil(e.message); }
  };

  /* Rediger egen melding — mentions beholdes for navn som fortsatt står i teksten */
  const lagreRedigering = async () => {
    const r = redigerer;
    if (!r) return;
    const nyTekst = r.tekst.trim();
    try {
      const alle = [...meldinger, ...traadMeldinger, ...festede, ...(traad ? [traad] : [])];
      const orig = alle.find((m) => m.id === r.id);
      const mentions = (orig?.mentions || []).filter((x) => nyTekst.includes(`@${x.name}`)).map((x) => ({ id: x.id }));
      const j = await api('melding', { method: 'PUT', body: { id: r.id, text: nyTekst, mentions } });
      const oppd = (l) => l.map((m) => (m.id === r.id ? { ...m, text: j.text, mentions: j.mentions, redigertAt: j.redigertAt } : m));
      setMeldinger(oppd);
      setTraadMeldinger(oppd);
      setFestede(oppd);
      setTraad((t) => (t && t.id === r.id ? { ...t, text: j.text, mentions: j.mentions, redigertAt: j.redigertAt } : t));
      setRedigerer(null);
    } catch (e) { setFeil(e.message); }
  };

  /* Fest/løsne — festede vises i gull-stripen øverst i chatten (maks 5) */
  const fest = async (rad) => {
    setVisEmojiFor(null);
    try {
      const j = await api('fest', { method: 'PUT', body: { id: rad.id, festet: !rad.festet } });
      const oppd = (l) => l.map((m) => (m.id === rad.id ? { ...m, festet: j.festet } : m));
      setMeldinger(oppd);
      setTraadMeldinger(oppd);
      setTraad((t) => (t && t.id === rad.id ? { ...t, festet: j.festet } : t));
      if (j.festet) setFestede((prev) => [{ ...rad, festet: true }, ...prev.filter((f) => f.id !== rad.id)].slice(0, 5));
      else setFestede((prev) => prev.filter((f) => f.id !== rad.id));
    } catch (e) { setFeil(e.message); }
  };

  /* Dyplenke ?traad=<id>: åpne tråden så snart chatten er åpen og token klar */
  useEffect(() => {
    if (!aapen || !token || !pendingTraad) return;
    const id = pendingTraad;
    setPendingTraad(null);
    aapneTraad(id);
  }, [aapen, token, pendingTraad, aapneTraad]);

  /* Dyplenke ?melding=<id>: scroll til og fremhev nøyaktig meldingen taggen
     står i — en varm puls i 2,5 sek så øyet lander riktig med en gang. */
  const hoppTilMelding = useCallback((id) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-melding-id="${id}"]`);
      if (!el) return;
      el.scrollIntoView({ block: 'center' });
      setFremhevet(id);
      setTimeout(() => setFremhevet(null), 2600);
    });
  }, []);

  /* Hovedstrømmen: hopp når meldingene er lastet (trådsvar ventes på under) */
  useEffect(() => {
    if (!aapen || laster || !pendingMelding || traad) return;
    const id = pendingMelding;
    if (meldinger.some((m) => m.id === id)) {
      setPendingMelding(null);
      setTimeout(() => hoppTilMelding(id), 140);
    } else if (!pendingTraad) {
      setPendingMelding(null); // finnes ikke (slettet/utenfor grensen) — normal visning
    }
  }, [aapen, laster, pendingMelding, meldinger, traad, pendingTraad, hoppTilMelding]);

  /* Trådvisningen: hopp til det konkrete svaret når tråden er ferdig lastet */
  useEffect(() => {
    if (!traad || traad.laster || traadLaster || !pendingMelding) return;
    const id = pendingMelding;
    setPendingMelding(null);
    setTimeout(() => hoppTilMelding(id), 160);
  }, [traad, traadLaster, pendingMelding, hoppTilMelding]);

  /* Meldingssøk: debounce 300 ms, min. 2 tegn */
  useEffect(() => {
    if (!visSok) return undefined;
    const q = sokTekst.trim();
    if (q.length < 2) { setSokTreff(null); setSokLaster(false); return undefined; }
    let alive = true;
    setSokLaster(true);
    const t = setTimeout(async () => {
      try {
        const j = await api(`sok?q=${encodeURIComponent(q)}`);
        if (alive) setSokTreff(j.treff || []);
      } catch (e) {}
      if (alive) setSokLaster(false);
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [visSok, sokTekst, api]);

  /* Gå til søketreff: hopp + puls i hovedstrømmen, eller åpne tråden det
     ligger i. Gamle rotmeldinger (utenfor de siste 100) åpnes som trådvisning. */
  const gaaTilTreff = (t) => {
    setVisSok(false); setSokTekst(''); setSokTreff(null); setFane('chat');
    if (t.threadId) {
      setPendingMelding(t.id);
      aapneTraad(t.threadId);
      return;
    }
    if (traadRef.current) lukkTraad();
    if (meldinger.some((m) => m.id === t.id)) {
      setTimeout(() => hoppTilMelding(t.id), 140);
    } else {
      setPendingMelding(t.id);
      aapneTraad(t.id);
    }
  };

  /* Desktop-varsler av/på (be om tillatelse ved første aktivering) */
  const toggleVarsler = async () => {
    try {
      if (typeof Notification === 'undefined') { setFeil('Nettleseren støtter ikke varsler'); return; }
      if (varslerPaa) {
        localStorage.setItem('dhChatVarsler', '0');
        setVarslerPaa(false);
        return;
      }
      const svar = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (svar === 'granted') {
        localStorage.setItem('dhChatVarsler', '1');
        setVarslerPaa(true);
      } else {
        setFeil('Varsler er blokkert i nettleseren — tillat dem i adresselinjen');
      }
    } catch (e) {}
  };

  const toggleLyd = () => {
    const ny = !lydPaa;
    try { localStorage.setItem('dhChatLyd', ny ? '1' : '0'); } catch (e) {}
    setLydPaa(ny);
    if (ny) pling();
  };

  /* Emoji inn i skrivefeltet — på markørposisjonen */
  const settInnEmoji = (emo) => {
    const el = inputRef.current;
    const pos = el?.selectionStart ?? tekst.length;
    setTekst((t) => t.slice(0, pos) + emo + t.slice(pos));
    setVisEmojiTekst(false);
    requestAnimationFrame(() => {
      el?.focus();
      try { el.setSelectionRange(pos + emo.length, pos + emo.length); } catch (e) {}
    });
  };

  /* @-tagging: finn aktiv «@query» rett før markøren */
  const oppdaterTekst = (e) => {
    const v = e.target.value;
    // «Skriver…»-heartbeat (throttlet) — kun ved faktisk tasting
    if (v !== tekst && Date.now() - skriverSistRef.current > 2500) {
      skriverSistRef.current = Date.now();
      api('skriver', { method: 'POST', body: {} }).catch(() => {});
    }
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
    if ((!t && !pendingVedlegg.length) || sender || lasterOpp) return;
    setSender(true); setFeil('');
    try {
      const mentions = Object.entries(valgte)
        .filter(([navn]) => t.includes(`@${navn}`))
        .map(([, id]) => ({ id }));
      const iTraad = traadRef.current;
      const j = await api('meldinger', { method: 'POST', body: { text: t, mentions, threadId: iTraad ? iTraad.id : null, vedlegg: pendingVedlegg.map((v) => v.id) } });
      if (iTraad) {
        setTraadMeldinger((prev) => [...prev, j.melding]);
        // Oppdater trådtelleren på rotmeldingen i hovedstrømmen umiddelbart
        setMeldinger((prev) => prev.map((m) => (m.id === iTraad.id
          ? { ...m, traad: { antall: (m.traad?.antall || 0) + 1, sisteAt: j.melding.createdAt, navn: [...new Set([...(m.traad?.navn || []), j.melding.userName])].slice(0, 4) } }
          : m)));
        scrollTraadNed();
      } else {
        setMeldinger((prev) => [...prev, j.melding]);
        scrollNed();
      }
      setTekst(''); setValgte({}); setMention(null); setPendingVedlegg([]);
    } catch (e) { setFeil(e.message); }
    setSender(false);
  };

  const slett = async (id, fraTraad = false) => {
    try {
      await api(`meldinger?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const rot = traadRef.current;
      if (rot && id === rot.id) {
        // Rotmeldingen: API-et sletter hele tråden — lukk visningen
        setMeldinger((prev) => prev.filter((x) => x.id !== id));
        lukkTraad();
      } else if (fraTraad) {
        setTraadMeldinger((prev) => prev.filter((x) => x.id !== id));
        if (rot) {
          setMeldinger((prev) => prev.map((m) => (m.id === rot.id && m.traad
            ? { ...m, traad: m.traad.antall > 1 ? { ...m.traad, antall: m.traad.antall - 1 } : undefined }
            : m)));
        }
      } else {
        setMeldinger((prev) => prev.filter((x) => x.id !== id));
      }
    } catch (e) { setFeil(e.message); }
  };

  const paaTast = (e) => {
    if (mention && mentionTreff.length && (e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault(); velgMention(mentionTreff[0]); return;
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === 'Escape') setMention(null);
  };

  /* Badge-visning av @-tagger direkte i skrivefeltet: et speil-lag bak
     textareaen rendrer samme tekst med pillebakgrunn på valgte tagger.
     Selve textarea-teksten er transparent (caret/markering beholdes), og
     identisk font/metrikk gjør at alt ligger perfekt på linje. Pillen lages
     med box-shadow (påvirker ikke layout) — derfor forskyves ingen tegn. */
  const inputDeler = useMemo(() => {
    const navn = Object.keys(valgte).filter((n) => tekst.includes(`@${n}`)).sort((a, b) => b.length - a.length);
    if (!navn.length) return [{ t: tekst }];
    const re = new RegExp(`(@(?:${navn.map(escRe).join('|')}))`, 'g');
    return tekst.split(re).map((del) => (del.startsWith('@') && navn.includes(del.slice(1)) ? { t: del, tag: true } : { t: del }));
  }, [tekst, valgte]);

  const erAdminRolle = ['owner', 'admin'].includes(user?.role);
  const minId = user?.id;

  /* Fullskjerm: innholdet sentreres med behagelig lesebredde */
  const midtstill = fullskjerm ? 'mx-auto w-full max-w-[860px]' : '';

  /* Hovedstrømmen gruppert — med «Nytt siden sist»-linjen satt inn foran første
     melding fra andre etter forrige lesetidspunkt */
  const grupper = useMemo(() => {
    const ut = grupperMeldinger(meldinger);
    if (nyttSidenSist) {
      const foerste = meldinger.find((m) => m.createdAt > nyttSidenSist && m.userId !== minId);
      if (foerste) {
        const idx = ut.findIndex((r) => r.id === foerste.id);
        if (idx >= 0) {
          ut[idx] = { ...ut[idx], fortsettelse: false }; // full header etter markøren
          ut.splice(idx, 0, { nyttSidenSist: true, id: 'nytt-siden-sist' });
        }
      }
    }
    return ut;
  }, [meldinger, nyttSidenSist, minId]);

  /* Svarene i åpen tråd gruppert (samme dag-/fortsettelseslogikk) */
  const traadGrupper = useMemo(() => grupperMeldinger(traadMeldinger), [traadMeldinger]);

  /* Antall tråder med uleste svar (badge på Tråder-fanen) */
  const traaderUlest = useMemo(() => traader.filter((t) => (t.uleste || 0) > 0).length, [traader]);

  /* Søk i trådoversikten: navn, rottekst, deltakere og sakstittel */
  const filtrerteTraader = useMemo(() => {
    const q = traadSok.trim().toLowerCase();
    if (!q) return traader;
    return traader.filter((t) => (t.navn || '').toLowerCase().includes(q)
      || (t.tekst || '').toLowerCase().includes(q)
      || (t.userName || '').toLowerCase().includes(q)
      || (t.deltakere || []).some((n) => String(n).toLowerCase().includes(q))
      || (t.sak?.title || '').toLowerCase().includes(q));
  }, [traader, traadSok]);

  /* Saksvelgeren: filtrert på søk, nyeste først (maks 8 treff) */
  const filtrerteSaker = useMemo(() => {
    if (!Array.isArray(sakListe)) return [];
    const q = sakSok.trim().toLowerCase();
    const liste = q ? sakListe.filter((s) => (s.title || '').toLowerCase().includes(q)) : sakListe;
    return liste.slice(0, 8);
  }, [sakListe, sakSok]);

  /* Én meldingsrad — gjenbrukes i hovedstrømmen og trådvisningen */
  const radJSX = (rad, iTraad = false) => (
    <div key={rad.id} data-testid={iTraad ? 'chat-traad-melding' : 'chat-melding'} data-melding-id={rad.id}
      className={`group relative flex items-start gap-2.5 rounded-[12px] px-2 py-1 transition-all duration-500 hover:bg-white/80 ${rad.fortsettelse ? 'mt-0' : 'mt-2'}`}
      style={{
        animation: 'dhChatMeldingInn 200ms ease-out both',
        ...(fremhevet === rad.id ? { background: 'linear-gradient(90deg, rgba(124,58,237,0.13), rgba(124,58,237,0.04))', boxShadow: 'inset 0 0 0 1.5px rgba(124,58,237,0.35)' } : {}),
      }}>
      {rad.fortsettelse ? (
        <span className="w-7 shrink-0 pt-[3px] text-right text-[9px] font-medium text-[#c2beb8] opacity-0 transition-opacity group-hover:opacity-100">{klokke(rad.createdAt)}</span>
      ) : (
        <NavnAvatar navn={rad.userName} size={28} fontPx={10} gradient className="mt-0.5 shadow-[0_2px_6px_rgba(0,0,0,0.14)]" />
      )}
      <div className="min-w-0 flex-1">
        {!rad.fortsettelse && (
          <p className="flex items-baseline gap-2">
            <span className="text-[12.5px] font-bold text-[#1c1917]">{rad.userName}</span>
            <span className="text-[10px] font-medium text-[#c2beb8]">{klokke(rad.createdAt)}</span>
            {rad.festet && <Pin className="h-2.5 w-2.5 self-center text-[#d97706]" title="Festet melding" />}
          </p>
        )}
        {redigerer?.id === rad.id ? (
          <div className="mt-0.5">
            <textarea
              autoFocus
              value={redigerer.tekst}
              onChange={(e) => setRedigerer((r) => ({ ...r, tekst: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); lagreRedigering(); }
                if (e.key === 'Escape') setRedigerer(null);
              }}
              rows={Math.min(5, Math.max(1, redigerer.tekst.split('\n').length))}
              data-testid="chat-rediger-input"
              className="block w-full resize-none rounded-[10px] bg-white px-2.5 py-1.5 text-[13px] leading-snug text-[#1c1917] outline-none"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(109,40,217,0.4), 0 4px 14px rgba(109,40,217,0.1)' }}
            />
            <p className="mt-1 flex items-center gap-2 text-[10px] text-[#b3ada3]">
              <button onClick={lagreRedigering} className="font-bold text-[#6d28d9] hover:underline">Lagre (↵)</button>
              <button onClick={() => setRedigerer(null)} className="hover:underline">Avbryt (Esc)</button>
            </p>
          </div>
        ) : (
          <>
            {rad.text && <MeldingTekst text={rad.text} mentions={rad.mentions} />}
            {rad.redigertAt && <span className="text-[9px] italic text-[#c2beb8]"> (redigert)</span>}
            {rad.text && foersteUrl(rad.text) && <LenkeKort url={foersteUrl(rad.text)} token={token} />}
          </>
        )}
        {(rad.vedlegg || []).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="chat-vedlegg">
            {rad.vedlegg.map((v) => (erBilde(v.type) ? (
              <button key={v.id} type="button" onClick={() => aapneViser(rad, v.id)} title={`${v.name} — åpne i visning`}
                data-testid={`chat-bilde-${v.id}`}
                className="block cursor-zoom-in overflow-hidden rounded-[12px] transition-all hover:-translate-y-px hover:brightness-105 active:scale-[0.99]"
                style={{ boxShadow: '0 2px 10px rgba(20,16,40,0.12), inset 0 0 0 1px rgba(0,0,0,0.05)' }}>
                <img src={filUrl(v.id)} alt={v.name} loading="lazy" className="block max-h-[170px] max-w-[230px] object-cover" />
              </button>
            ) : (
              <div key={v.id} role="button" tabIndex={0} onClick={() => aapneViser(rad, v.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') aapneViser(rad, v.id); }}
                title={`${v.name} — åpne i visning`} data-testid={`chat-dokument-${v.id}`}
                className="flex max-w-[240px] cursor-pointer items-center gap-2 rounded-[10px] bg-white px-2.5 py-1.5 transition-all hover:-translate-y-px"
                style={{ boxShadow: '0 1px 5px rgba(20,16,40,0.08), inset 0 0 0 1px rgba(0,0,0,0.06)' }}>
                <FileText className="h-3.5 w-3.5 shrink-0 text-[#6d28d9]" />
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-semibold text-[#1c1917]">{v.name}</span>
                  <span className="block text-[9.5px] text-[#b3ada3]">{filStorrelse(v.size)}</span>
                </span>
                <a href={filUrl(v.id, false)} onClick={(e) => e.stopPropagation()} title={`Last ned ${v.name}`}
                  className="shrink-0 rounded-[6px] p-1 text-[#b3ada3] transition-colors hover:bg-black/[0.05] hover:text-[#6d28d9]">
                  <Download className="h-3 w-3" />
                </a>
              </div>
            )))}
          </div>
        )}
        {(rad.reaksjoner || []).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1" data-testid="chat-reaksjoner">
            {aggReaksjoner(rad.reaksjoner, minId).map((r) => (
              <button key={r.emoji} onClick={() => reager(rad.id, r.emoji)} title={r.navn.join(', ')}
                className={`flex items-center gap-1 rounded-full px-1.5 py-[2px] text-[11px] transition-all hover:-translate-y-px active:scale-90 ${r.min ? 'bg-[#ece4fb]' : 'bg-white'}`}
                style={{ boxShadow: r.min ? 'inset 0 0 0 1px rgba(109,40,217,0.4)' : 'inset 0 0 0 1px rgba(0,0,0,0.07), 0 1px 3px rgba(20,16,40,0.05)' }}>
                <span>{r.emoji}</span>
                <span className={`text-[10px] font-bold ${r.min ? 'text-[#6d28d9]' : 'text-[#8a857d]'}`}>{r.antall}</span>
              </button>
            ))}
          </div>
        )}
        {!iTraad && (rad.traad || rad.traadNavn || rad.sakId) && (
          <button onClick={() => aapneTraad(rad)} data-testid="chat-traad-chip"
            className="mt-1.5 flex max-w-full items-center gap-1.5 rounded-[10px] bg-white py-1 pl-1.5 pr-2 text-left transition-all hover:-translate-y-px active:scale-[0.98]"
            style={{ boxShadow: '0 1px 4px rgba(20,16,40,0.07), inset 0 0 0 1px rgba(109,40,217,0.16)' }}>
            {rad.traad && (
              <span className="flex shrink-0 items-center">
                {(rad.traad.navn || []).slice(0, 3).map((n, i) => (
                  <span key={n} className="flex" style={{ marginLeft: i ? -5 : 0 }}><NavnAvatar navn={n} size={18} fontPx={7} className="ring-[1.5px] ring-white" /></span>
                ))}
              </span>
            )}
            {rad.traadNavn && <span className="truncate text-[11px] font-bold text-[#1c1917]">{rad.traadNavn}</span>}
            {rad.sakId && <ClipboardList className="h-3 w-3 shrink-0 text-[#0a7d55]" title="Koblet til sak" />}
            <span className="shrink-0 text-[11px] font-bold text-[#6d28d9]">{rad.traad ? `${rad.traad.antall} svar` : 'Åpne tråd'}</span>
            {rad.traad && <span className="shrink-0 text-[10px] font-medium text-[#b3ada3]">siste {klokke(rad.traad.sisteAt)}</span>}
          </button>
        )}
      </div>
      <div className="absolute -top-3 right-2 flex items-center overflow-hidden rounded-[11px] bg-white opacity-0 transition-all group-hover:opacity-100"
        style={{ boxShadow: '0 6px 20px rgba(20,16,40,0.14), inset 0 0 0 1px rgba(0,0,0,0.06)' }}>
        <button onClick={() => setVisEmojiFor((v) => (v === rad.id ? null : rad.id))} title="Reager med emoji" data-testid={`chat-reager-${rad.id}`}
          className="flex h-7 w-7 items-center justify-center text-[#a6a19a] transition-colors hover:bg-[#faf6ee] hover:text-[#d97706] active:scale-90">
          <Smile className="h-3.5 w-3.5" />
        </button>
        {!iTraad && (
          <button onClick={() => aapneTraad(rad)} title="Svar i tråd" data-testid={`chat-svar-${rad.id}`}
            className="flex h-7 w-7 items-center justify-center text-[#a6a19a] transition-colors hover:bg-[#f5f2fc] hover:text-[#6d28d9] active:scale-90">
            <Reply className="h-3.5 w-3.5" />
          </button>
        )}
        {user?.role !== 'investor' && (
          <button onClick={() => fest(rad)} title={rad.festet ? 'Løsne meldingen' : 'Fest meldingen øverst'} data-testid={`chat-fest-${rad.id}`}
            className={`flex h-7 w-7 items-center justify-center transition-colors hover:bg-[#faf6ee] active:scale-90 ${rad.festet ? 'text-[#d97706]' : 'text-[#a6a19a] hover:text-[#d97706]'}`}>
            <Pin className="h-3.5 w-3.5" />
          </button>
        )}
        {rad.userId === minId && (
          <button onClick={() => { setVisEmojiFor(null); setRedigerer({ id: rad.id, tekst: rad.text }); }} title="Rediger meldingen" data-testid={`chat-rediger-${rad.id}`}
            className="flex h-7 w-7 items-center justify-center text-[#a6a19a] transition-colors hover:bg-[#faf9f7] hover:text-[#1c1917] active:scale-90">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {(rad.userId === minId || erAdminRolle) && (
          <button onClick={() => slett(rad.id, iTraad)} title="Slett meldingen"
            className="flex h-7 w-7 items-center justify-center text-[#c2beb8] transition-colors hover:bg-[#fdf1f0] hover:text-[#c2413b] active:scale-90">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {visEmojiFor === rad.id && (
        <div className="absolute -top-11 right-2 z-20 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-1"
          style={{ boxShadow: '0 10px 32px rgba(20,16,40,0.2), inset 0 0 0 1px rgba(0,0,0,0.05)', animation: 'dhChatMeldingInn 140ms ease-out both' }}
          data-testid="chat-emoji-velger">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => reager(rad.id, e)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[14px] transition-transform hover:scale-125 active:scale-95">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes dhChatMeldingInn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dhChatBadgePop { 0% { transform: scale(0.4); } 60% { transform: scale(1.18); } 100% { transform: scale(1); } }
        @keyframes dhChatPuls { 0%, 100% { box-shadow: 0 0 0 0 rgba(109,40,217,0.35); } 55% { box-shadow: 0 0 0 9px rgba(109,40,217,0); } }
        @keyframes dhChatViserInn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dhChatViserZoomInn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes dhChatSideInn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .dh-chat-scroll::-webkit-scrollbar { width: 9px; }
        .dh-chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .dh-chat-scroll::-webkit-scrollbar-thumb { background: rgba(28,25,23,0.14); border-radius: 99px; border: 3px solid transparent; background-clip: content-box; }
        .dh-chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(28,25,23,0.28); border: 3px solid transparent; background-clip: content-box; }
      `}</style>

      {/* ═══ Filviser — innebygd fullskjermsvisning av bilder og dokumenter ═══ */}
      {viser && (() => {
        const filV = viser.vedlegg[viser.index];
        const flereV = viser.vedlegg.length > 1;
        const docxV = erDocxFil(filV);
        const fvUrl = `/api/admin/chat/fil/${encodeURIComponent(filV.id)}/forhandsvisning?key=${encodeURIComponent(token)}`;
        return (
          <div className="fixed inset-0 z-[120] flex flex-col" data-testid="chat-filviser"
            style={{ background: 'rgba(15,11,26,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', animation: 'dhChatViserInn 180ms ease-out both' }}
            onClick={() => setViser(null)}>
            {/* Topplinje: filinfo + handlinger */}
            <div className="flex items-center gap-2.5 px-4 py-3 sm:gap-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/10">
                {erBilde(filV.type) ? <BildeIkon className="h-4 w-4 text-white/80" /> : <FileText className="h-4 w-4 text-white/80" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-white">{filV.name}</p>
                <p className="truncate text-[11px] text-white/45">{filStorrelse(filV.size)}{viser.avsender ? ` · delt av ${viser.avsender}` : ''}{viser.tidspunkt ? ` · ${dagLabel(viser.tidspunkt)} ${klokke(viser.tidspunkt)}` : ''}</p>
              </div>
              <a href={filUrl(filV.id, false)} title="Last ned" data-testid="filviser-nedlast"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white active:scale-90">
                <Download className="h-4 w-4" />
              </a>
              <a href={docxV ? fvUrl : filUrl(filV.id)} target="_blank" rel="noreferrer" title="Åpne i ny fane"
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white active:scale-90 sm:flex">
                <ExternalLink className="h-4 w-4" />
              </a>
              <button onClick={() => setViser(null)} title="Lukk (Esc)" data-testid="filviser-lukk"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white active:scale-90">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Innhold */}
            <div className="relative flex min-h-0 flex-1 items-stretch justify-center px-3 pb-3 sm:px-16">
              {flereV && viser.index > 0 && (
                <button onClick={(e) => { e.stopPropagation(); setViser((v) => ({ ...v, index: v.index - 1, zoom: false })); }}
                  title="Forrige (←)" data-testid="filviser-forrige"
                  className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 transition-all hover:bg-white/20 active:scale-90 sm:left-4">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {erBilde(filV.type) ? (
                viser.zoom ? (
                  <div className="flex-1 overflow-auto" onClick={(e) => e.stopPropagation()} style={{ scrollbarWidth: 'thin' }}>
                    <img src={filUrl(filV.id)} alt={filV.name} onClick={() => setViser((v) => ({ ...v, zoom: false }))}
                      className="mx-auto cursor-zoom-out rounded-[10px]" style={{ maxWidth: 'none' }} />
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center">
                    <img src={filUrl(filV.id)} alt={filV.name} onClick={(e) => { e.stopPropagation(); setViser((v) => ({ ...v, zoom: true })); }}
                      className="max-h-full max-w-full cursor-zoom-in rounded-[14px] object-contain"
                      style={{ boxShadow: '0 30px 90px rgba(0,0,0,0.5)', animation: 'dhChatViserZoomInn 200ms ease-out both' }} />
                  </div>
                )
              ) : (erPdf(filV.type) || docxV) ? (
                <PdfVisning url={docxV ? fvUrl : filUrl(filV.id)} navn={filV.name} />
              ) : erRenTekst(filV.type) ? (
                <iframe title={filV.name} src={filUrl(filV.id)}
                  className="h-full w-full max-w-[1100px] rounded-[14px] bg-white"
                  style={{ boxShadow: '0 30px 90px rgba(0,0,0,0.5)', animation: 'dhChatViserZoomInn 200ms ease-out both' }} />
              ) : erVideo(filV.type) ? (
                <div className="flex flex-1 items-center justify-center">
                  <video controls src={filUrl(filV.id)} onClick={(e) => e.stopPropagation()}
                    className="max-h-full max-w-full rounded-[14px]" style={{ boxShadow: '0 30px 90px rgba(0,0,0,0.5)' }} />
                </div>
              ) : erLyd(filV.type) ? (
                <div className="flex flex-1 items-center justify-center">
                  <div onClick={(e) => e.stopPropagation()} className="w-[min(430px,90vw)] rounded-[20px] bg-white/[0.07] px-8 py-8 text-center" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}>
                    <p className="truncate text-[14px] font-bold text-white">{filV.name}</p>
                    <audio controls src={filUrl(filV.id)} className="mt-4 w-full" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <div onClick={(e) => e.stopPropagation()} className="w-[min(400px,90vw)] rounded-[20px] bg-white/[0.07] px-8 py-10 text-center" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}>
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/10"><FileText className="h-6 w-6 text-white/70" /></span>
                    <p className="mt-4 truncate text-[14px] font-bold text-white">{filV.name}</p>
                    <p className="mt-1 text-[11.5px] text-white/45">Ingen forhåndsvisning for denne filtypen ({filStorrelse(filV.size)})</p>
                    <a href={filUrl(filV.id, false)} className="mt-5 inline-flex items-center gap-2 rounded-[12px] bg-white px-5 py-2.5 text-[13px] font-bold text-[#1c1917] transition-all hover:brightness-95 active:scale-[0.98]">
                      <Download className="h-4 w-4" /> Last ned filen
                    </a>
                  </div>
                </div>
              )}
              {flereV && viser.index < viser.vedlegg.length - 1 && (
                <button onClick={(e) => { e.stopPropagation(); setViser((v) => ({ ...v, index: v.index + 1, zoom: false })); }}
                  title="Neste (→)" data-testid="filviser-neste"
                  className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 transition-all hover:bg-white/20 active:scale-90 sm:right-4">
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
            {/* Miniatyrstripe ved flere vedlegg */}
            {flereV && (
              <div className="flex items-center justify-center gap-1.5 pb-4" onClick={(e) => e.stopPropagation()}>
                {viser.vedlegg.map((v, i) => (
                  <button key={v.id} onClick={() => setViser((vs) => ({ ...vs, index: i, zoom: false }))} title={v.name}
                    className={`overflow-hidden rounded-[9px] transition-all active:scale-95 ${i === viser.index ? 'ring-2 ring-white' : 'opacity-55 hover:opacity-90'}`}>
                    {erBilde(v.type)
                      ? <img src={filUrl(v.id)} alt={v.name} className="h-10 w-10 object-cover" />
                      : <span className="flex h-10 w-10 items-center justify-center bg-white/10"><FileText className="h-4 w-4 text-white/70" /></span>}
                  </button>
                ))}
                <span className="ml-2 text-[11px] font-medium text-white/45">{viser.index + 1} av {viser.vedlegg.length}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Panel */}
      {aapen && (
        <div
          data-testid="chat-panel"
          className={`z-[70] flex overflow-hidden ${fullskjerm ? 'fixed inset-0 flex-row rounded-none sm:inset-4 sm:rounded-[24px]' : 'fixed bottom-[92px] right-4 flex-col rounded-[24px] sm:right-5'}`}
          onDragEnter={(e) => {
            if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
            e.preventDefault();
            dragTellerRef.current += 1;
            setDragOver(true);
          }}
          onDragOver={(e) => { e.preventDefault(); }}
          onDragLeave={() => {
            dragTellerRef.current = Math.max(0, dragTellerRef.current - 1);
            if (dragTellerRef.current === 0) setDragOver(false);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            dragTellerRef.current = 0;
            setDragOver(false);
            const filer = [...(e.dataTransfer?.files || [])].slice(0, 6);
            for (const f of filer) await lastOppFil(f); // sekvensielt — én fremdriftslinje
          }}
          style={{
            width: fullskjerm ? undefined : 'min(430px, calc(100vw - 24px))',
            height: fullskjerm ? undefined : 'min(660px, calc(100vh - 116px))',
            background: fullskjerm ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            boxShadow: '0 32px 90px rgba(20,16,40,0.28), 0 2px 8px rgba(20,16,40,0.08), inset 0 0 0 1px rgba(255,255,255,0.7), 0 0 0 1px rgba(0,0,0,0.05)',
            opacity: vis ? 1 : 0,
            transform: vis ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.94)',
            transformOrigin: fullskjerm ? 'center' : 'bottom right',
            transition: 'opacity 180ms ease-out, transform 260ms cubic-bezier(0.34, 1.4, 0.64, 1)',
          }}
        >
          {/* Slipp-overlegg ved dra-og-slipp av filer */}
          {dragOver && (
            <div className="pointer-events-none absolute inset-2 z-40 flex flex-col items-center justify-center gap-2 rounded-[18px]"
              style={{ background: 'rgba(246,242,255,0.92)', backdropFilter: 'blur(4px)', boxShadow: 'inset 0 0 0 2px rgba(109,40,217,0.45)', outline: '2px dashed rgba(109,40,217,0.5)', outlineOffset: '-10px' }}
              data-testid="chat-drop-overlegg">
              <Paperclip className="h-6 w-6 text-[#6d28d9]" />
              <p className="text-[13px] font-bold text-[#4c2a94]">Slipp for å laste opp</p>
              <p className="text-[11px] text-[#8b6bc7]">Bilder og filer · maks 8 MB</p>
            </div>
          )}

          {/* ═══ Fullskjerm: sidefelt med Hovedstrøm + tråder + profil (skjules på mobil) ═══ */}
          {fullskjerm && (
            <div className="hidden w-[288px] shrink-0 flex-col border-r border-black/[0.06] md:flex"
              style={{ background: 'linear-gradient(180deg, rgba(250,249,247,0.92), rgba(246,244,241,0.78))', animation: 'dhChatSideInn 240ms ease-out both' }}
              data-testid="chat-sidefelt">
              <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-[12px]"
                  style={{ background: 'linear-gradient(135deg, #1c1917 20%, #3b2373 130%)', boxShadow: '0 6px 16px rgba(59,35,115,0.35)' }}>
                  <MessageCircle className="h-[17px] w-[17px] text-white" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#22c55e] ring-2 ring-[#faf9f7]" title="Tilkoblet" />
                </span>
                <div>
                  <p className="text-[14.5px] font-bold leading-tight text-[#1c1917]" style={heading}>{erInvestor ? 'DigiHome-teamet' : 'Teamchat'}</p>
                  <p className="text-[10.5px] leading-tight text-[#a6a19a]">{brukere.length > 0 ? `${brukere.length} i teamet` : 'Intern kanal'}</p>
                </div>
              </div>
              <div className="px-2.5">
                <button onClick={() => { lukkTraad(); setFane('chat'); setVisSok(false); setSokTekst(''); setSokTreff(null); }}
                  data-testid="chat-side-hovedstrom"
                  className={`flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left transition-all active:scale-[0.99] ${!traad && fane === 'chat' && !visSok ? 'bg-white shadow-[0_1px_5px_rgba(20,16,40,0.07),inset_0_0_0_1px_rgba(109,40,217,0.22)]' : 'hover:bg-white/70'}`}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'linear-gradient(135deg, #f0ebfa, #e5d9fb)' }}>
                    <MessageCircle className="h-3.5 w-3.5 text-[#6d28d9]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold leading-snug text-[#1c1917]">Hovedstrøm</span>
                    <span className="block truncate text-[10.5px] text-[#a6a19a]">
                      {meldinger.length ? `${meldinger[meldinger.length - 1].userName}: ${meldinger[meldinger.length - 1].text || '📎 vedlegg'}` : 'Hele teamet samlet'}
                    </span>
                  </span>
                </button>
              </div>
              <p className="flex items-center gap-1.5 px-5 pb-1 pt-4 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#b3ada3]">
                Tråder
                {traader.length > 0 && <span className="font-semibold text-[#c2beb8]">{traader.length}</span>}
                {traaderUlest > 0 && (
                  <span className="flex h-[14px] min-w-[14px] items-center justify-center rounded-full px-1 text-[8px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>{traaderUlest}</span>
                )}
              </p>
              <div className="dh-chat-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-2" style={{ scrollbarWidth: 'thin' }}>
                {traader.length === 0 && (
                  <p className="px-2.5 py-3 text-[11px] leading-relaxed text-[#b3ada3]">Ingen tråder ennå — hold musen over en melding og trykk svar-pilen.</p>
                )}
                {traader.map((t) => (
                  <button key={t.id} onClick={() => { setVisSok(false); aapneTraad(t.id); }} data-testid={`chat-side-traad-${t.id}`}
                    className={`mb-0.5 flex w-full items-center gap-2 rounded-[11px] px-2.5 py-[7px] text-left transition-all active:scale-[0.99] ${traad?.id === t.id ? 'bg-white shadow-[0_1px_5px_rgba(20,16,40,0.07),inset_0_0_0_1px_rgba(109,40,217,0.22)]' : 'hover:bg-white/70'}`}>
                    <NavnAvatar navn={t.userName} size={24} fontPx={8} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[12px] leading-snug ${(t.uleste || 0) > 0 ? 'font-bold text-[#1c1917]' : 'font-semibold text-[#44403c]'}`}>{t.navn || t.tekst}</span>
                      <span className="block truncate text-[10px] text-[#b3ada3]">{t.antallSvar === 1 ? '1 svar' : `${t.antallSvar} svar`}{t.sak ? ` · ${t.sak.title}` : ''}</span>
                    </span>
                    {(t.uleste || 0) > 0 && (
                      <span className="flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[8.5px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>{t.uleste}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-black/[0.05] px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <NavnAvatar navn={user?.name} size={28} fontPx={9.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-bold text-[#1c1917]">{user?.name || 'Deg'}</span>
                    <span className="block text-[9.5px] font-medium uppercase tracking-wide text-[#b3ada3]">{user?.role === 'owner' ? 'Eier' : user?.role === 'admin' ? 'Admin' : user?.role === 'investor' ? 'Investor' : 'Teammedlem'}</span>
                  </span>
                  <button onClick={toggleVarsler} title={varslerPaa ? 'Desktop-varsler er PÅ' : 'Skru på desktop-varsler'}
                    className={`rounded-[8px] p-1.5 transition-all active:scale-90 ${varslerPaa ? 'bg-[#ece4fb] text-[#6d28d9]' : 'text-[#b3ada3] hover:bg-black/[0.04] hover:text-[#57534e]'}`}>
                    {varslerPaa ? <BellRing className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={toggleLyd} title={lydPaa ? 'Pling er PÅ' : 'Skru på pling'}
                    className={`rounded-[8px] p-1.5 transition-all active:scale-90 ${lydPaa ? 'bg-[#ece4fb] text-[#6d28d9]' : 'text-[#b3ada3] hover:bg-black/[0.04] hover:text-[#57534e]'}`}>
                    {lydPaa ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Hovedkolonnen — header, faner, meldinger og komponist ═══ */}
          <div className="flex min-w-0 flex-1 flex-col">
          {/* Topp — gradient-aksent + avatarstabel */}
          <div className="relative border-b border-black/[0.05] px-4 pb-3 pt-3.5">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-[#6d28d9] via-[#9d6bff] to-transparent" />
            <div className="flex items-center justify-between gap-2">
              {traad ? (
                <div className="flex min-w-0 items-center gap-2">
                  <button onClick={lukkTraad} data-testid="chat-traad-tilbake" title="Tilbake til chatten"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[#57534e] transition-all hover:bg-black/[0.05] hover:text-[#1c1917] active:scale-90">
                    <ArrowLeft className="h-[17px] w-[17px]" />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-bold leading-tight text-[#1c1917]" style={heading}>{traad.traadNavn || 'Tråd'}</p>
                    <p className="truncate text-[11px] leading-tight text-[#a6a19a]">Startet av <span className="font-semibold text-[#8b6bc7]">{traad.userName || '…'}</span> — holdes utenfor hovedstrømmen</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-[12px]"
                    style={{ background: 'linear-gradient(135deg, #1c1917 20%, #3b2373 130%)', boxShadow: '0 6px 16px rgba(59,35,115,0.35)' }}>
                    <MessageCircle className="h-[17px] w-[17px] text-white" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#22c55e] ring-2 ring-white" title="Tilkoblet" />
                  </span>
                  <div>
                    <p className="text-[14.5px] font-bold leading-tight text-[#1c1917]" style={heading}>
                      {erInvestor ? 'DigiHome-teamet' : aktivInvestor ? aktivInvestor.navn : fullskjerm ? 'Hovedstrøm' : 'Teamchat'}
                    </p>
                    <p className="text-[11px] leading-tight text-[#a6a19a]">
                      {erInvestor
                        ? <>Din direktelinje til teamet · <span className="font-semibold text-[#8b6bc7]">@tag</span> gir e-postvarsel</>
                        : aktivInvestor
                          ? 'Investorkanal — kun teamet og investoren ser denne'
                          : <>{fullskjerm ? 'Hele teamet samlet' : 'Intern'} · <span className="font-semibold text-[#8b6bc7]">@tag</span> gir e-postvarsel</>}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                {!traad && brukere.length > 0 && (
                  <span className="mr-1 hidden items-center sm:flex" title={brukere.map((u) => u.name).join(', ')}>
                    {brukere.slice(0, 4).map((u, i) => (
                      <span key={u.id} className="flex" style={{ marginLeft: i ? -7 : 0 }}><NavnAvatar navn={u.name} size={24} fontPx={8.5} className="ring-2 ring-white" /></span>
                    ))}
                    {brukere.length > 4 && <span className="ml-1 text-[10.5px] font-semibold text-[#a6a19a]">+{brukere.length - 4}</span>}
                  </span>
                )}
                <button onClick={() => setFullskjerm((f) => !f)} data-testid="chat-fullskjerm" className="rounded-[9px] p-1.5 text-[#a6a19a] transition-all hover:bg-black/[0.05] hover:text-[#1c1917] active:scale-90" title={fullskjerm ? 'Tilbake til liten visning' : 'Fullskjerm'}>
                  {fullskjerm ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button onClick={() => { setFullskjerm(false); setAapen(false); }} data-testid="chat-lukk" className="rounded-[9px] p-1.5 text-[#a6a19a] transition-all hover:bg-black/[0.05] hover:text-[#1c1917] active:scale-90" title="Lukk">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Kanalvelger for teamet: Intern + én kanal per investor */}
          {!traad && !erInvestor && invKanaler.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-black/[0.05] px-3 py-2" style={{ scrollbarWidth: 'none' }} data-testid="chat-kanalvelger">
              <button onClick={() => byttKanal('generelt')} data-testid="chat-kanal-intern"
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-all active:scale-[0.97] ${aktivKanal === 'generelt' ? 'text-white' : 'bg-black/[0.04] text-[#8a857d] hover:text-[#57534e]'}`}
                style={aktivKanal === 'generelt' ? { background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 3px 10px rgba(59,35,115,0.25)' } : {}}>
                <MessageCircle className="h-3 w-3" />
                Intern
              </button>
              <span className="h-4 w-px shrink-0 bg-black/[0.08]" />
              {invKanaler.map((k) => {
                const aktiv = aktivKanal === k.kanal;
                return (
                  <button key={k.kanal} onClick={() => byttKanal(k.kanal)} data-testid={`chat-kanal-${k.kanal}`}
                    title={`Investorkanal — ${k.navn}`}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[11.5px] font-bold transition-all active:scale-[0.97] ${aktiv ? 'text-white' : 'bg-black/[0.04] text-[#8a857d] hover:text-[#57534e]'}`}
                    style={aktiv ? { background: 'linear-gradient(135deg, #b45309, #d97706)', boxShadow: '0 3px 10px rgba(180,83,9,0.3)' } : {}}>
                    {k.avatar
                      ? <img src={k.avatar} alt="" className="h-[18px] w-[18px] rounded-full object-cover" />
                      : <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[7.5px] font-bold ${aktiv ? 'bg-white/25 text-white' : 'text-white'}`} style={aktiv ? {} : { background: avatarFarge(k.navn) }}>{initialer(k.navn)}</span>}
                    <span className="max-w-[120px] truncate">{k.navn}</span>
                    {(k.ulest || 0) > 0 && !aktiv && (
                      <span className="flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#d97706] px-1 text-[8.5px] font-bold text-white">{k.ulest}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Faner: Chat | Tråder + søk/varsler/lyd — skjules inne i en åpen tråd */}
          {!traad && (
            <div className="border-b border-black/[0.05] px-3 py-2">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5 rounded-full p-[3px]" style={{ background: 'rgba(0,0,0,0.045)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
                  <button onClick={() => setFane('chat')} data-testid="chat-fane-chat"
                    className={`rounded-full px-3 py-1 text-[11.5px] font-bold transition-all ${fane === 'chat' ? 'text-white' : 'text-[#8a857d] hover:text-[#57534e]'}`}
                    style={fane === 'chat' ? { background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 3px 10px rgba(59,35,115,0.25)' } : {}}>
                    Chat
                  </button>
                  <button onClick={() => { setFane('traader'); lastTraader(); }} data-testid="chat-fane-traader"
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold transition-all ${fane === 'traader' ? 'text-white' : 'text-[#8a857d] hover:text-[#57534e]'}`}
                    style={fane === 'traader' ? { background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 3px 10px rgba(59,35,115,0.25)' } : {}}>
                    <MessagesSquare className="h-3 w-3" />
                    Tråder
                    {traader.length > 0 && <span className={`text-[10px] font-semibold ${fane === 'traader' ? 'text-white/70' : 'text-[#c2beb8]'}`}>{traader.length}</span>}
                    {traaderUlest > 0 && (
                      <span data-testid="chat-traader-ulest" className="flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[8.5px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>{traaderUlest}</span>
                    )}
                  </button>
                </div>
                <span className="flex-1" />
                <button onClick={() => { setVisSok((v) => !v); setSokTekst(''); setSokTreff(null); }} data-testid="chat-sok-knapp"
                  title="Søk i chatten"
                  className={`flex h-7 w-7 items-center justify-center rounded-[9px] transition-all active:scale-90 ${visSok ? 'bg-[#ece4fb] text-[#6d28d9]' : 'text-[#a6a19a] hover:bg-black/[0.04] hover:text-[#57534e]'}`}>
                  <Search className="h-3.5 w-3.5" />
                </button>
                <button onClick={toggleVarsler} data-testid="chat-varsler-knapp"
                  title={varslerPaa ? 'Desktop-varsler er PÅ — klikk for å skru av' : 'Få desktop-varsel ved nye meldinger'}
                  className={`flex h-7 w-7 items-center justify-center rounded-[9px] transition-all active:scale-90 ${varslerPaa ? 'bg-[#ece4fb] text-[#6d28d9]' : 'text-[#a6a19a] hover:bg-black/[0.04] hover:text-[#57534e]'}`}>
                  {varslerPaa ? <BellRing className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                </button>
                <button onClick={toggleLyd} data-testid="chat-lyd-knapp"
                  title={lydPaa ? 'Pling ved nye meldinger er PÅ' : 'Skru på pling ved nye meldinger'}
                  className={`flex h-7 w-7 items-center justify-center rounded-[9px] transition-all active:scale-90 ${lydPaa ? 'bg-[#ece4fb] text-[#6d28d9]' : 'text-[#a6a19a] hover:bg-black/[0.04] hover:text-[#57534e]'}`}>
                  {lydPaa ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                </button>
              </div>
              {visSok && (
                <div className="mt-2 flex items-center gap-1.5 rounded-[11px] bg-white px-2.5 py-1.5" style={{ boxShadow: 'inset 0 0 0 1px rgba(109,40,217,0.3), 0 2px 8px rgba(109,40,217,0.08)' }}>
                  <Search className="h-3.5 w-3.5 shrink-0 text-[#8b6bc7]" />
                  <input
                    autoFocus
                    value={sokTekst}
                    onChange={(e) => setSokTekst(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setVisSok(false); setSokTekst(''); setSokTreff(null); } }}
                    placeholder="Søk i meldinger, navn og tråder…"
                    data-testid="chat-sok-input"
                    className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#1c1917] outline-none placeholder:text-[#b3ada3]"
                  />
                  {sokLaster && <Loader2 className="h-3 w-3 animate-spin text-[#b3ada3]" />}
                  {sokTekst && <button onClick={() => { setSokTekst(''); setSokTreff(null); }} className="text-[#b3ada3] hover:text-[#57534e]"><X className="h-3.5 w-3.5" /></button>}
                </div>
              )}
            </div>
          )}

          {/* Meldinger — hovedstrøm eller åpen tråd */}
          {traad ? (
            <div ref={traadListeRef} className="dh-chat-scroll flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin', background: 'linear-gradient(180deg, rgba(250,249,247,0.6), rgba(255,255,255,0.35))' }} data-testid="chat-traad-panel">
              <div className={midtstill}>
              {/* Meta: trådnavn + sak-kobling */}
              {traad.text && (
                <div className="mb-2 flex items-center gap-1.5">
                  {redigererNavn ? (
                    <input
                      autoFocus
                      value={navnUtkast}
                      onChange={(e) => setNavnUtkast(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') lagreTraadNavn(); if (e.key === 'Escape') setRedigererNavn(false); }}
                      onBlur={lagreTraadNavn}
                      placeholder="Gi tråden et navn…"
                      maxLength={80}
                      data-testid="chat-traad-navn-input"
                      className="min-w-0 flex-1 rounded-[10px] bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-[#1c1917] outline-none placeholder:text-[#b3ada3]"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(109,40,217,0.4), 0 4px 14px rgba(109,40,217,0.1)' }}
                    />
                  ) : erInvestor ? (
                    <span className="flex min-w-0 items-center gap-1.5 px-2 py-1.5">
                      <span className={`truncate text-[12.5px] ${traad.traadNavn ? 'font-bold text-[#1c1917]' : 'font-medium text-[#b3ada3]'}`}>{traad.traadNavn || 'Tråd'}</span>
                    </span>
                  ) : (
                    <button onClick={() => { setNavnUtkast(traad.traadNavn || ''); setRedigererNavn(true); }} data-testid="chat-traad-navn"
                      title={traad.traadNavn ? 'Endre trådnavnet' : 'Gi tråden et navn'}
                      className="flex min-w-0 items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-left transition-colors hover:bg-white/80">
                      <Pencil className="h-3 w-3 shrink-0 text-[#b3ada3]" />
                      <span className={`truncate text-[12.5px] ${traad.traadNavn ? 'font-bold text-[#1c1917]' : 'font-medium text-[#b3ada3]'}`}>{traad.traadNavn || 'Gi tråden et navn…'}</span>
                    </button>
                  )}
                  <span className="min-w-[8px] flex-1" />
                  {traad.sak ? (
                    <span className="flex max-w-[190px] shrink-0 items-center gap-1 rounded-[10px] bg-white py-1 pl-2 pr-1" style={{ boxShadow: 'inset 0 0 0 1px rgba(10,125,85,0.25), 0 1px 4px rgba(20,16,40,0.06)' }} data-testid="chat-traad-sak-chip">
                      <ClipboardList className="h-3 w-3 shrink-0 text-[#0a7d55]" />
                      <a href={`/admin/saker/${encodeURIComponent(traad.sak.id)}`} className="truncate text-[11px] font-bold text-[#0a7d55] hover:underline" title={`Åpne saken: ${traad.sak.title}`}>{traad.sak.title}</a>
                      <button onClick={() => kobleSak(null)} title="Koble fra saken" className="rounded-[6px] p-0.5 text-[#a6a19a] transition-colors hover:bg-black/[0.05] hover:text-[#c2413b]">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : !erInvestor ? (
                    <button onClick={() => { setVisSakVelger((v) => !v); hentSaker(); }} data-testid="chat-traad-koble-sak"
                      className="flex shrink-0 items-center gap-1 rounded-[10px] bg-white px-2 py-1.5 text-[11px] font-bold text-[#57534e] transition-all hover:text-[#0a7d55] active:scale-[0.97]"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.07), 0 1px 4px rgba(20,16,40,0.05)' }}>
                      <Link2 className="h-3 w-3" />
                      Koble til sak
                    </button>
                  ) : null}
                </div>
              )}
              {visSakVelger && !traad.sak && (
                <div className="mb-2 rounded-[14px] bg-white p-2" style={{ boxShadow: '0 8px 28px rgba(20,16,40,0.12), inset 0 0 0 1px rgba(0,0,0,0.05)' }} data-testid="chat-sak-velger">
                  <div className="flex items-center gap-1.5 rounded-[9px] bg-[#faf9f7] px-2 py-1.5" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)' }}>
                    <Search className="h-3 w-3 shrink-0 text-[#b3ada3]" />
                    <input autoFocus value={sakSok} onChange={(e) => setSakSok(e.target.value)} placeholder="Søk i saker…"
                      className="min-w-0 flex-1 bg-transparent text-[12px] text-[#1c1917] outline-none placeholder:text-[#b3ada3]" data-testid="chat-sak-sok" />
                  </div>
                  <div className="mt-1 max-h-[150px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {sakListe === null && <p className="px-2 py-2 text-[11px] text-[#a6a19a]">Henter saker…</p>}
                    {Array.isArray(sakListe) && filtrerteSaker.length === 0 && <p className="px-2 py-2 text-[11px] text-[#a6a19a]">Ingen saker matcher søket.</p>}
                    {filtrerteSaker.map((s) => (
                      <button key={s.id} onClick={() => kobleSak(s.id)} disabled={sakJobber} data-testid={`chat-sak-valg-${s.id}`}
                        className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors hover:bg-[#f5f2fc] disabled:opacity-50">
                        <ClipboardList className="h-3 w-3 shrink-0 text-[#a6a19a]" />
                        <span className="truncate text-[12px] font-semibold text-[#1c1917]">{s.title}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={opprettSakFraTraad} disabled={sakJobber} data-testid="chat-opprett-sak-fra-traad"
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-[9px] py-1.5 text-[11.5px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #0a7d55, #0a6b49)', boxShadow: '0 3px 10px rgba(10,125,85,0.25)' }}>
                    {sakJobber ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Opprett ny sak fra tråden
                  </button>
                </div>
              )}
              {/* Rotmeldingen — festet øverst med lilla aksent */}
              {traad.text && (
                <div className="rounded-[14px] bg-white px-1 pb-1.5 pt-0.5" style={{ boxShadow: '0 1px 5px rgba(20,16,40,0.06), inset 0 0 0 1px rgba(109,40,217,0.14)', animation: 'dhChatMeldingInn 200ms ease-out both' }}>
                  {radJSX({ ...traad, fortsettelse: false }, true)}
                </div>
              )}
              <div className="my-3 flex items-center gap-2 px-1">
                <CornerDownRight className="h-3 w-3 text-[#b3ada3]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#a6a19a]">{traadMeldinger.length === 1 ? '1 svar' : `${traadMeldinger.length} svar`}</span>
                <span className="h-px flex-1 bg-black/[0.06]" />
              </div>
              {traadLaster && (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#c2beb8]" /></div>
              )}
              {!traadLaster && traadMeldinger.length === 0 && (
                <p className="px-4 py-6 text-center text-[12px] leading-relaxed text-[#a6a19a]">Ingen svar ennå — start tråden under. Diskusjonen holdes samlet her, utenfor hovedstrømmen.</p>
              )}
              {traadGrupper.map((rad) => (rad.separator ? (
                <div key={rad.id} className="my-3.5 flex items-center justify-center">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-[#a6a19a] shadow-[0_1px_4px_rgba(0,0,0,0.06),inset_0_0_0_1px_rgba(0,0,0,0.04)]">{rad.separator}</span>
                </div>
              ) : radJSX(rad, true)))}
              </div>
            </div>
          ) : (visSok && sokTekst.trim().length >= 2) ? (
            <div className="dh-chat-scroll flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin', background: 'linear-gradient(180deg, rgba(250,249,247,0.6), rgba(255,255,255,0.35))' }} data-testid="chat-sok-resultater">
              <div className={midtstill}>
              {sokTreff === null && (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#c2beb8]" /></div>
              )}
              {Array.isArray(sokTreff) && sokTreff.length === 0 && !sokLaster && (
                <p className="py-10 text-center text-[12px] text-[#a6a19a]">Ingen meldinger matcher «{sokTekst.trim()}»</p>
              )}
              {Array.isArray(sokTreff) && sokTreff.length > 0 && (
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.09em] text-[#a6a19a]">{sokTreff.length === 1 ? '1 treff' : `${sokTreff.length} treff`}</p>
              )}
              {(sokTreff || []).map((t) => {
                const u = sokUtdrag(t.text, sokTekst.trim());
                return (
                  <button key={t.id} onClick={() => gaaTilTreff(t)} data-testid={`chat-sok-treff-${t.id}`}
                    className="mb-1.5 flex w-full items-start gap-2.5 rounded-[13px] bg-white/90 px-2.5 py-2 text-left transition-all hover:-translate-y-px hover:bg-white active:scale-[0.99]"
                    style={{ boxShadow: '0 1px 5px rgba(20,16,40,0.06), inset 0 0 0 1px rgba(0,0,0,0.04)' }}>
                    <NavnAvatar navn={t.userName} size={24} fontPx={8.5} className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-[11.5px] font-bold text-[#1c1917]">{t.userName}</span>
                        <span className="text-[9.5px] font-medium text-[#c2beb8]">{dagLabel(t.createdAt)} {klokke(t.createdAt)}</span>
                        {t.threadId && <span className="rounded-[5px] bg-[#f0ebfa] px-1 text-[8.5px] font-bold uppercase tracking-wide text-[#8b6bc7]">tråd</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] leading-snug text-[#57534e]">
                        {u.foer}<span className="rounded-[3px] bg-[#f3e8ac] px-0.5 font-semibold text-[#1c1917]">{u.treff}</span>{u.etter}
                        {!u.treff && !u.foer && (t.vedlegg || []).length > 0 && `📎 ${t.vedlegg.map((v) => v.name).join(', ').slice(0, 60)}`}
                      </span>
                    </span>
                  </button>
                );
              })}
              </div>
            </div>
          ) : fane === 'traader' ? (
            <div className="dh-chat-scroll flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin', background: 'linear-gradient(180deg, rgba(250,249,247,0.6), rgba(255,255,255,0.35))' }} data-testid="chat-traader-liste">
              <div className={midtstill}>
              {traader.length > 3 && (
                <div className="mb-2.5 flex items-center gap-1.5 rounded-[11px] bg-white px-2.5 py-2" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06), 0 1px 4px rgba(20,16,40,0.04)' }}>
                  <Search className="h-3.5 w-3.5 shrink-0 text-[#b3ada3]" />
                  <input value={traadSok} onChange={(e) => setTraadSok(e.target.value)} placeholder="Søk i tråder, navn eller saker…"
                    className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#1c1917] outline-none placeholder:text-[#b3ada3]" data-testid="chat-traad-sok" />
                  {traadSok && <button onClick={() => setTraadSok('')} className="text-[#b3ada3] hover:text-[#57534e]"><X className="h-3.5 w-3.5" /></button>}
                </div>
              )}
              {traader.length === 0 && (
                <div className="flex flex-col items-center gap-2.5 py-14 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[16px]" style={{ background: 'linear-gradient(135deg, #f0ebfa, #e5d9fb)' }}>
                    <MessagesSquare className="h-5 w-5 text-[#6d28d9]" />
                  </span>
                  <p className="text-[14px] font-bold text-[#1c1917]" style={heading}>Ingen tråder ennå</p>
                  <p className="max-w-[260px] text-[12px] leading-relaxed text-[#a6a19a]">Hold musen over en melding i chatten og trykk svar-pilen — så starter du en tråd som holder diskusjonen samlet.</p>
                </div>
              )}
              {traader.length > 0 && filtrerteTraader.length === 0 && (
                <p className="py-10 text-center text-[12px] text-[#a6a19a]">Ingen tråder matcher søket.</p>
              )}
              {filtrerteTraader.map((t) => (
                <button key={t.id} onClick={() => aapneTraad(t.id)} data-testid={`chat-traad-rad-${t.id}`}
                  className="mb-2 w-full rounded-[14px] bg-white/90 p-2.5 text-left transition-all hover:-translate-y-px hover:bg-white active:scale-[0.99]"
                  style={{ boxShadow: (t.uleste || 0) > 0 ? '0 2px 10px rgba(109,40,217,0.12), inset 0 0 0 1px rgba(109,40,217,0.25)' : '0 1px 5px rgba(20,16,40,0.06), inset 0 0 0 1px rgba(0,0,0,0.04)', animation: 'dhChatMeldingInn 200ms ease-out both' }}>
                  <div className="flex items-start gap-2.5">
                    <NavnAvatar navn={t.userName} size={28} fontPx={10} gradient className="mt-0.5 shadow-[0_2px_6px_rgba(0,0,0,0.14)]" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2">
                        <span className="truncate text-[13px] font-bold text-[#1c1917]">{t.navn || t.tekst}</span>
                        {(t.uleste || 0) > 0 && (
                          <span className="flex h-[17px] min-w-[17px] shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>{t.uleste}</span>
                        )}
                      </p>
                      {t.navn && <p className="truncate text-[11px] text-[#a6a19a]">{t.tekst}</p>}
                      <div className="mt-1 flex items-center gap-2">
                        {(t.deltakere || []).length > 0 && (
                          <span className="flex items-center">
                            {t.deltakere.slice(0, 3).map((n, i) => (
                              <span key={n} className="flex" style={{ marginLeft: i ? -4 : 0 }}><NavnAvatar navn={n} size={16} fontPx={6.5} className="ring-[1.5px] ring-white" /></span>
                            ))}
                          </span>
                        )}
                        <span className="text-[10.5px] font-bold text-[#6d28d9]">{t.antallSvar === 1 ? '1 svar' : `${t.antallSvar} svar`}</span>
                        <span className="text-[10px] font-medium text-[#b3ada3]">{dagLabel(t.sisteAt)} {klokke(t.sisteAt)}</span>
                        {t.sak && (
                          <span className="flex min-w-0 items-center gap-1 rounded-[7px] bg-[#eef7f2] px-1.5 py-[2px]" title={`Koblet til sak: ${t.sak.title}`}>
                            <ClipboardList className="h-2.5 w-2.5 shrink-0 text-[#0a7d55]" />
                            <span className="truncate text-[9.5px] font-bold text-[#0a7d55]">{t.sak.title}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              </div>
            </div>
          ) : (
            <div ref={listeRef} className="dh-chat-scroll flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin', background: 'linear-gradient(180deg, rgba(250,249,247,0.6), rgba(255,255,255,0.35))' }} data-testid="chat-meldinger">
              <div className={midtstill}>
              {/* Festede meldinger — gull-stripe øverst */}
              {festede.length > 0 && (
                <div className="mb-2 overflow-hidden rounded-[14px]" style={{ background: 'linear-gradient(135deg, #fffaf0, #fdf3e0)', boxShadow: 'inset 0 0 0 1px rgba(217,119,6,0.18), 0 1px 5px rgba(180,120,20,0.08)' }} data-testid="chat-festede">
                  <button onClick={() => setVisFestede((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#d97706]/5">
                    <Pin className="h-3 w-3 shrink-0 text-[#d97706]" />
                    {visFestede ? (
                      <span className="flex-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b45309]">{festede.length === 1 ? '1 festet melding' : `${festede.length} festede meldinger`}</span>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-[#78350f]"><b>{festede[0].userName}:</b> {festede[0].text || `📎 ${(festede[0].vedlegg || []).map((v) => v.name).join(', ')}`}{festede.length > 1 ? `  ·  +${festede.length - 1} til` : ''}</span>
                    )}
                    <span className="shrink-0 text-[9.5px] font-bold text-[#d97706]">{visFestede ? 'Lukk' : 'Vis'}</span>
                  </button>
                  {visFestede && (
                    <div className="space-y-1 px-2 pb-2">
                      {festede.map((f) => (
                        <div key={f.id} className="group/f flex items-start gap-2 rounded-[10px] bg-white/70 px-2.5 py-1.5">
                          <NavnAvatar navn={f.userName} size={20} fontPx={7.5} className="mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-[#78350f]">{f.userName} <span className="font-medium text-[#c9a227]">{dagLabel(f.createdAt)} {klokke(f.createdAt)}</span></p>
                            <p className="line-clamp-2 whitespace-pre-wrap text-[11.5px] leading-snug text-[#44403c]">{f.text || `📎 ${(f.vedlegg || []).map((v) => v.name).join(', ')}`}</p>
                          </div>
                          <button onClick={() => fest(f)} title="Løsne meldingen"
                            className="shrink-0 rounded-[6px] p-1 text-[#c9a227] opacity-0 transition-all hover:bg-[#d97706]/10 hover:text-[#b45309] group-hover/f:opacity-100">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
              ) : rad.nyttSidenSist ? (
                <div key={rad.id} data-nytt-siden-sist data-testid="chat-nytt-siden-sist" className="my-3 flex items-center gap-2 px-1">
                  <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #a78bfa)' }} />
                  <span className="rounded-full px-2.5 py-[3px] text-[9.5px] font-bold uppercase tracking-[0.09em] text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 8px rgba(109,40,217,0.35)' }}>Nytt siden sist</span>
                  <span className="h-px flex-1" style={{ background: 'linear-gradient(270deg, transparent, #a78bfa)' }} />
                </div>
              ) : radJSX(rad, false)))}
              </div>
            </div>
          )}

          {/* Komponist — skjules i trådoversikten (der velger man en tråd først) */}
          {(traad || fane === 'chat') ? (
          <div className={`relative px-3 pb-3 pt-2 ${midtstill}`}>
            {feil && <p className="mb-1.5 px-1 text-[11.5px] text-[#b3261e]" data-testid="chat-feil">{feil}</p>}
            {skriver.length > 0 && (
              <p className="mb-1 flex items-center gap-1.5 px-1 text-[10.5px] font-medium text-[#8b6bc7]" data-testid="chat-skriver">
                <span className="flex gap-[3px]">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-[#8b6bc7]" style={{ animationDelay: '0ms' }} />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-[#8b6bc7]" style={{ animationDelay: '120ms' }} />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-[#8b6bc7]" style={{ animationDelay: '240ms' }} />
                </span>
                {skriver.join(', ')} skriver…
              </p>
            )}
            {pendingVedlegg.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1.5 px-1" data-testid="chat-pending-vedlegg">
                {pendingVedlegg.map((v) => (
                  <span key={v.id} className="flex items-center gap-1.5 rounded-[10px] bg-white py-1 pl-1.5 pr-1" style={{ boxShadow: 'inset 0 0 0 1px rgba(109,40,217,0.2), 0 1px 4px rgba(20,16,40,0.06)' }}>
                    {erBilde(v.type)
                      ? <img src={filUrl(v.id)} alt={v.name} className="h-7 w-7 rounded-[7px] object-cover" />
                      : <FileText className="h-4 w-4 text-[#6d28d9]" />}
                    <span className="max-w-[120px] truncate text-[10.5px] font-semibold text-[#1c1917]">{v.name}</span>
                    <span className="text-[9px] text-[#b3ada3]">{filStorrelse(v.size)}</span>
                    <button onClick={() => fjernPendingVedlegg(v.id)} title="Fjern vedlegget" className="rounded-[5px] p-0.5 text-[#a6a19a] transition-colors hover:bg-black/[0.05] hover:text-[#c2413b]">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {lasterOpp && (
              <div className="mb-1.5 px-1" data-testid="chat-opplasting">
                <p className="mb-0.5 flex items-center gap-1.5 text-[10.5px] text-[#8a857d]"><Loader2 className="h-3 w-3 animate-spin" /> Laster opp «{lasterOpp.navn}» … {lasterOpp.prosent}%</p>
                <div className="h-1 overflow-hidden rounded-full bg-black/[0.06]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${lasterOpp.prosent}%`, background: 'linear-gradient(90deg, #7c3aed, #6d28d9)' }} />
                </div>
              </div>
            )}
            {mention && mentionTreff.length > 0 && (
              <div className="absolute bottom-full left-3 z-10 mb-1.5 w-[268px] overflow-hidden rounded-[14px] py-1"
                style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)', boxShadow: '0 16px 48px rgba(20,16,40,0.2), inset 0 0 0 1px rgba(0,0,0,0.05)' }}
                data-testid="chat-mention-dropdown">
                <p className="px-3 pb-0.5 pt-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#c2beb8]">Tag en kollega · ↵ velger</p>
                {mentionTreff.map((u, i) => (
                  <button key={u.id} onClick={() => velgMention(u)} data-testid={`chat-mention-${u.id}`}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-[#f5f2fc] ${i === 0 ? 'bg-[#f8f6fd]' : ''}`}>
                    <NavnAvatar navn={u.name} size={24} fontPx={9} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-[#1c1917]">{u.name}</span>
                      {u.tittel && <span className="block truncate text-[10.5px] text-[#a6a19a]">{u.tittel}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-[18px] bg-white p-1.5 transition-shadow"
              style={{ boxShadow: fokus ? 'inset 0 0 0 1px rgba(109,40,217,0.45), 0 6px 24px rgba(109,40,217,0.12)' : 'inset 0 0 0 1px rgba(0,0,0,0.07), 0 2px 8px rgba(20,16,40,0.05)' }}>
              <input ref={filInputRef} type="file" multiple className="hidden" data-testid="chat-fil-input"
                onChange={async (e) => { const filer = [...(e.target.files || [])].slice(0, 6); e.target.value = ''; for (const f of filer) await lastOppFil(f); }} />
              <button onClick={() => filInputRef.current?.click()} title="Legg ved bilde eller fil (maks 8 MB)" data-testid="chat-vedlegg-knapp"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-[#a6a19a] transition-all hover:bg-black/[0.04] hover:text-[#6d28d9] active:scale-90">
                <Paperclip className="h-4 w-4" />
              </button>
              <button onClick={() => setVisEmojiTekst((v) => !v)} title="Sett inn emoji" data-testid="chat-emoji-knapp"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] transition-all active:scale-90 ${visEmojiTekst ? 'bg-[#ece4fb] text-[#6d28d9]' : 'text-[#a6a19a] hover:bg-black/[0.04] hover:text-[#d97706]'}`}>
                <Smile className="h-4 w-4" />
              </button>
              {visEmojiTekst && (
                <div className="absolute bottom-full left-1 z-30 mb-2 grid w-[292px] grid-cols-8 gap-0.5 rounded-[16px] bg-white p-2"
                  style={{ boxShadow: '0 16px 48px rgba(20,16,40,0.22), inset 0 0 0 1px rgba(0,0,0,0.05)', animation: 'dhChatMeldingInn 140ms ease-out both' }}
                  data-testid="chat-emoji-tekst-velger">
                  {TEKST_EMOJIS.map((emo) => (
                    <button key={emo} onClick={() => settInnEmoji(emo)}
                      className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[17px] transition-transform hover:scale-125 hover:bg-[#faf9f7] active:scale-95">
                      {emo}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative min-w-0 flex-1">
                {/* Speil-laget med badges — nøyaktig samme typografi som textareaen */}
                <div ref={overlayRef} aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-2.5 py-2 text-[13.5px] leading-snug text-[#1c1917]">
                  {inputDeler.map((d, i) => (d.tag
                    ? <span key={i} className="rounded-[5px] text-[#6d28d9]" style={{ background: '#ece4fb', boxShadow: '0 0 0 2.5px #ece4fb', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{d.t}</span>
                    : <React.Fragment key={i}>{d.t}</React.Fragment>))}
                  {'\u200b'}
                </div>
                <textarea
                  ref={inputRef}
                  value={tekst}
                  onChange={oppdaterTekst}
                  onKeyDown={paaTast}
                  onClick={oppdaterTekst}
                  onFocus={() => setFokus(true)}
                  onBlur={() => setFokus(false)}
                  onScroll={(e) => { if (overlayRef.current) overlayRef.current.scrollTop = e.target.scrollTop; }}
                  onPaste={async (e) => {
                    // Lim inn skjermbilder/filer direkte fra utklippstavlen
                    const filer = [...(e.clipboardData?.files || [])];
                    if (!filer.length) return;
                    e.preventDefault();
                    for (const f of filer.slice(0, 6)) await lastOppFil(f);
                  }}
                  placeholder={traad ? 'Svar i tråden… @ for å tagge' : 'Skriv en melding… @ for å tagge'}
                  rows={Math.min(4, Math.max(1, tekst.split('\n').length))}
                  data-testid="chat-input"
                  className="relative block max-h-[110px] w-full resize-none bg-transparent px-2.5 py-2 text-[13.5px] leading-snug text-transparent caret-[#1c1917] outline-none focus:outline-none placeholder:text-[#b3ada3]"
                />
              </div>
              <button onClick={send} disabled={sender || !!lasterOpp || (!tekst.trim() && !pendingVedlegg.length)} data-testid="chat-send" title="Send (Enter)"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-white transition-all hover:brightness-110 active:scale-90 disabled:opacity-25"
                style={{ background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 4px 12px rgba(59,35,115,0.3)' }}>
                {sender ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 px-2 text-[10px] text-[#c2beb8]">{traad ? '↵ send · svaret havner kun i denne tråden' : '↵ send · ⇧↵ ny linje · lim inn/dra filer rett inn · @tag varsler på e-post'}</p>
          </div>
          ) : (
            <p className="border-t border-black/[0.05] px-4 py-2.5 text-center text-[10.5px] text-[#b3ada3]">Velg en tråd for å svare — eller start en ny fra en melding i chatten</p>
          )}
          </div>
        </div>
      )}

      {/* Boblen — skjules mens panelet er i fullskjerm */}
      {!(aapen && fullskjerm) && (
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
        {/* Ravgul badge: uleste investormeldinger (teamet) */}
        {!aapen && invUlestTotalt > 0 && (
          <span data-testid="chat-badge-investor"
            className={`absolute flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[9.5px] font-bold text-white ring-2 ring-[#faf9f7] ${ulest > 0 ? '-right-0.5 top-[18px]' : '-right-0.5 -top-0.5'}`}
            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
            {invUlestTotalt > 99 ? '99+' : invUlestTotalt}
          </span>
        )}
      </button>
      )}
    </>
  );
}
