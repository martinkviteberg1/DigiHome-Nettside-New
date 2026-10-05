'use client';
/** To flater til, gjenskapt komponent for komponent fra DigiHome-appen (repoet DigiHome, branch «branky», 5. okt 2026):
 *  INNBOKSEN (frontend/src/admin/AdminInbox.tsx + inbox/{InboxList,ThreadHeader,MessageList,Composer,ConversationContextRail}.tsx)
 *  og ENHETSVISNINGEN «Stedet» (admin/AdminUnitDetail.tsx + unit-components/{UnitContextSidebar,StedetTab,stedet/PhotoStrip,stedet/NextStepCard,people/PersonRow}.tsx).
 *  Samme tokens (A fra produkt.js = appens --dh-*), samme mål (h-14-hoder, 36 px avatarer, 12 px-radius rader, 22 px-bobler, 26 px-pille,
 *  228 px enhetsmeny, 372 px høyrekolonne), samme ordlyd. Tegnes i 1440 px designbredde (bredden der kontekstpanelet ligger inline i appen)
 *  og skaleres. Personer, adresser og tall er oppdiktede – ingen reelle leietakere, eiere eller kunder. */
import React from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUp, Armchair, AtSign, Bath, BedDouble, Bike, Building2, CalendarRange, Check, CheckCheck, ChevronDown, ChevronRight,
  Droplets, ExternalLink, FileText, Hammer, Home, KeyRound, Layers, Mail, MapPin, MessageCircle, MessageSquare, MessageSquarePlus, MoreHorizontal, PanelLeftClose,
  PanelRight, Pause, PenSquare, Phone, Plus, Ruler, Search, Settings2, Smartphone, Smile, Sparkles, SquareUser, ThermometerSun, Users, Wallet, WashingMachine, Wifi,
  Warehouse, Utensils, Thermometer,
} from 'lucide-react';
import { A, Dot, Rail, DATA } from './produkt';

const H = 'font-heading';
const N = (v) => String(v).replace(/ /g, '\u202f');
const TH = 'text-[11px] font-semibold uppercase tracking-[0.06em]';
const CARD_SHADOW = `0 1px 2px rgba(26,22,18,0.04), 0 0 0 1px ${A.hair}`;
const BUBBLE_ME = '#ebe6dd';

/* ── Små byggeklosser som i appen ── */
const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
/** Avatar: foto eller initialer på canvas-2 (appens Avatar). `tone` lilla for KI-assistenten. */
const Avatar = ({ name, size = 36, photo, pos, tone, className = '' }) => (
  <span className={`rounded-full shrink-0 inline-flex items-center justify-center overflow-hidden ${H} font-medium ${className}`} style={{ width: size, height: size, background: tone === 'ai' ? A.purpleBg : A.canvas2, color: tone === 'ai' ? A.purple : A.ink2, fontSize: Math.max(11, Math.round(size * 0.34)), boxShadow: `0 0 0 1px ${A.hair}` }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photo ? <img src={photo} alt="" className="w-full h-full object-cover" style={{ objectPosition: pos }} /> : tone === 'ai' ? <Sparkles style={{ width: size * 0.45, height: size * 0.45 }} strokeWidth={1.75} /> : initials(name)}
  </span>
);
const IconBtn = ({ icon: Icon, size = 18, className = '', tone }) => (
  <span className={`w-8 h-8 rounded-[6px] inline-flex items-center justify-center shrink-0 ${className}`} style={{ color: tone || A.ink2 }}><Icon style={{ width: size, height: size }} strokeWidth={1.75} /></span>
);
const StatusText = ({ c, label, size = 12 }) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: A.ink2, fontSize: size }}><Dot c={c} /> {label}</span>;
const RailLabel = ({ children }) => <p className={TH} style={{ color: A.ink3, margin: 0 }}>{children}</p>;

/* ═══════════════════════════════════ INNBOKSEN ═══════════════════════════════════ */

const CH = { sms: Smartphone, email: Mail, app: MessageCircle, team: Users };
const SAMTALER = [
  { n: 'Emma Sørensen', ctx: 'Leietaker · Nygårdsgaten 5, H0201', p: 'Takk! Da venter jeg på rørleggeren i morgen.', t: '08:12', ch: 'sms', ai: true, on: true },
  { n: 'Jonas Berg', ctx: 'Leietaker · Møhlenpris 8, H0302', p: 'Oppvaskmaskinen stopper fortsatt midt i programmet, selv etter at jeg…', t: '07:40', ch: 'app', unread: 2 },
  { n: 'Kari Nordmann', ctx: 'Eier · Nygårdsgaten 5', p: 'Godkjenner tilbudet på 4 800 kr. Kjør på.', t: 'I går', ch: 'email', unread: 1 },
  { n: 'Mats Haugen', ctx: 'Interessent · Møhlenpris 8', p: 'Er visningen lørdag fortsatt aktuell? Vi er to som kommer.', t: 'I går', ch: 'email', ai: true },
  { n: 'Sara Lie', ctx: 'Leietaker · Damsgårdsveien 41, H0401', p: 'Låsesmeden kom kl. 14, alt fungerer nå. Takk for rask hjelp!', t: 'I går', ch: 'sms' },
  { n: 'Rørleggermester Vik AS', ctx: 'Leverandør · Nygårdsgaten 5', p: 'Tilbud sendt: bytte av varmtvannsbereder, 4 800 kr eks. mva.', t: 'man.', ch: 'email', org: true },
  { n: 'Line Dahl', ctx: 'Interessent · Kong Oscars gate 12', p: 'Hei! Er leiligheten fortsatt ledig fra 1. desember?', t: 'man.', ch: 'app', ai: true },
  { n: 'Driftsteamet', ctx: 'Team-chat · 4 medlemmer', p: 'Sarah: Husk befaring på Møhlenpris torsdag kl. 10.', t: 'søn.', ch: 'team', teamUnread: true },
];

const ConvoRow = ({ c }) => {
  const ur = (c.unread || 0) > 0;
  const Ch = CH[c.ch];
  return (
    <div className="group relative w-full text-left flex items-start gap-3 px-3 py-3 rounded-[12px]" style={{ background: c.on ? A.canvas2 : 'transparent' }}>
      {c.org ? <span className="rounded-full shrink-0 inline-flex items-center justify-center mt-0.5" style={{ width: 36, height: 36, background: A.canvas2, color: A.ink2, boxShadow: `0 0 0 1px ${A.hair}` }}><Building2 className="w-4 h-4" strokeWidth={1.75} /></span>
        : c.ch === 'team' ? <span className="rounded-full shrink-0 inline-flex items-center justify-center mt-0.5" style={{ width: 36, height: 36, background: A.warnBg, color: A.warn, boxShadow: `0 0 0 1px ${A.hair}` }}><Users className="w-4 h-4" strokeWidth={1.75} /></span>
        : <Avatar name={c.n} size={36} className="mt-0.5" />}
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`text-[14px] truncate leading-snug ${ur ? 'font-bold' : 'font-medium'}`} style={{ color: A.ink }}>{c.n}</span>
          <span className={`text-[11.5px] shrink-0 inline-flex items-center gap-1 ${ur ? 'font-semibold' : ''}`} style={{ color: ur ? A.ink : A.ink3 }}>
            <Ch className="w-3 h-3" strokeWidth={1.75} style={{ color: A.ink3 }} />
            {c.ai && <Sparkles className="w-3 h-3" strokeWidth={1.75} style={{ color: A.purple }} />}
            {c.t}
          </span>
        </span>
        <span className={`block text-[12.5px] truncate leading-snug mt-0.5 ${ur ? 'font-semibold' : ''}`}>
          <span style={{ color: ur ? A.ink : A.ink2 }}>{c.ctx}</span><span style={{ color: A.ink3 }}> — </span><span style={{ color: ur ? A.ink : A.ink3 }}>{c.p}</span>
        </span>
      </span>
      {c.unread === 1 && <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-2" style={{ background: A.purple }} />}
      {c.unread > 1 && <span className="min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10.5px] font-bold tabular-nums inline-flex items-center justify-center shrink-0 mt-1" style={{ background: A.purple }}>{c.unread}</span>}
      {c.teamUnread && <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: A.warn }} />}
    </div>
  );
};

const TRAAD = [
  { day: 'I går' },
  { who: 'Emma Sørensen', ch: 'sms', text: 'Hei! Det drypper vann fra varmtvannsberederen i boden. Det er ikke mye, men det blir en liten dam på gulvet. Hva gjør jeg?', t: '16:48' },
  { who: 'DigiHome-assistenten', ai: true, text: 'Takk for at du sa fra, Emma. Jeg har opprettet en sak og varslet forvalter. Inntil videre: sett en bøtte under, og skru av hovedbryteren til berederen hvis lekkasjen øker. Du hører fra oss i løpet av dagen.', t: '16:48' },
  { day: 'I dag' },
  { me: true, text: 'Hei Emma! Rørleggeren har sett på bildene og anbefaler å bytte berederen. Eier har godkjent tilbudet. Rørleggermester Vik kommer i morgen mellom 08 og 10 – passer det?', t: '08:05', read: true },
  { who: 'Emma Sørensen', ch: 'sms', text: 'Takk! Da venter jeg på rørleggeren i morgen.', t: '08:12' },
];

const Melding = ({ m }) => {
  if (m.day) return <div className="flex justify-center my-3"><span className="rounded-full px-3 h-6 inline-flex items-center text-[11.5px]" style={{ background: 'rgba(244,241,236,0.9)', color: A.ink3 }}>{m.day}</span></div>;
  if (m.me) {
    return (
      <div className="flex justify-end">
        <div className="min-w-0" style={{ maxWidth: '68%' }}>
          <div className="px-4 py-[10px] text-[15px] leading-[1.55] tracking-[-0.004em] break-words rounded-[22px] rounded-br-[8px]" style={{ background: BUBBLE_ME, color: A.ink }}>{m.text}</div>
          <p className="flex items-center justify-end gap-1.5 text-[11px] mt-1 pr-1" style={{ color: A.ink3, margin: '4px 4px 0 0' }}>{m.t}<span className="inline-flex items-center gap-1" style={{ color: m.read ? A.ok : A.ink3 }}><Smartphone className="w-3 h-3" strokeWidth={1.75} /><CheckCheck className="w-3.5 h-3.5" strokeWidth={1.75} />Lest</span></p>
        </div>
      </div>
    );
  }
  const Ch = m.ch ? CH[m.ch] : null;
  return (
    <div className="flex">
      <div className="w-7 mr-3 shrink-0 pt-0.5"><Avatar name={m.who} size={26} tone={m.ai ? 'ai' : undefined} /></div>
      <div className="min-w-0 flex-1" style={{ maxWidth: '80%' }}>
        <p className="text-[12px] mb-1 leading-none inline-flex items-center gap-1.5" style={{ color: A.ink3, margin: '0 0 4px' }}>{m.who}{Ch && <Ch className="w-3 h-3" strokeWidth={1.75} />}{m.ai && <Sparkles className="w-3 h-3" strokeWidth={1.75} style={{ color: A.purple }} />}</p>
        <div className="py-[6px] text-[15px] leading-[1.6] tracking-[-0.004em] break-words" style={{ color: A.ink }}>{m.text}</div>
        <p className="text-[11px]" style={{ color: A.ink3, margin: '2px 0 0' }}>{m.t}</p>
      </div>
    </div>
  );
};

const KONTEKST = {
  person: { n: 'Emma Sørensen', rolle: 'Leietaker', kanaler: 'SMS · e-post · leietakerappen', siden: 'Kunde siden august 2025' },
  bolig: ['Nygårdsgaten 5, H0201', 'Utleid', '72 m² · 2 soverom · 2. etasje'],
  leie: [['Periode', '1. aug. 2025 – 31. jul. 2028'], ['Husleie', `${N('12 400')} kr/mnd`], ['Depositum', `${N('37 200')} kr på konto`], ['Oktober', 'Betalt 1. okt.', A.ok]],
  saker: [['Varmtvannsbereder lekker', 'Venter på rørlegger · i morgen 08–10', A.warn]],
};

export const INBOKS_W = 1440;
export const INBOKS_H = 760;
export const Innboks = () => (
  <div className="flex overflow-hidden text-left font-body" style={{ width: INBOKS_W, height: INBOKS_H, background: A.canvas, color: A.ink, WebkitFontSmoothing: 'antialiased' }} data-testid="produkt-innboks">
    <Rail user={DATA.user} active="Innboks" />

    {/* Liste (canvas) */}
    <div className="flex flex-col shrink-0 h-full" style={{ width: 340, borderRight: `1px solid ${A.hair}`, background: A.canvas }}>
      <div className="px-4 pb-1">
        <div className="flex items-center justify-between gap-2 h-14">
          <span className="inline-flex items-center gap-1 h-8 -ml-2 pl-2 pr-1.5 rounded-[8px] min-w-0 whitespace-nowrap">
            <span className="text-[13.5px] font-medium truncate" style={{ color: A.ink }}>Alle</span>
            <span className="text-[12.5px] tabular-nums" style={{ color: A.ink3 }}>· 3 uleste</span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0" strokeWidth={2} style={{ color: A.ink3 }} />
          </span>
          <span className="flex items-center gap-0.5 shrink-0 -mr-1.5">
            <span className="inline-flex items-center gap-1 h-7 px-2 rounded-full text-[12px] font-medium tabular-nums mr-1" style={{ background: A.purpleBg, color: A.purple }} title="Til vurdering"><Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />2</span>
            <IconBtn icon={Search} size={17} /><IconBtn icon={MessageSquarePlus} size={17} /><IconBtn icon={PenSquare} size={17} />
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden px-2 pb-2 flex flex-col gap-px">
        {SAMTALER.map((c) => <ConvoRow key={c.n} c={c} />)}
      </div>
    </div>

    {/* Tråden (canvas) */}
    <div className="flex-1 min-w-0 flex flex-col h-full" style={{ background: A.canvas }}>
      <div className="shrink-0" style={{ background: A.canvas }}>
        <div className="h-14 px-5 flex items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1 -mx-1 px-1 py-1 rounded-[8px]">
            <Avatar name="Emma Sørensen" size={32} />
            <span className="flex-1 min-w-0">
              <span className="block truncate leading-tight text-[14px] font-medium" style={{ color: A.ink }}>Emma Sørensen</span>
              <span className="block text-[12px] truncate leading-tight mt-0.5" style={{ color: A.ink3 }}>Leietaker · Nygårdsgaten 5, H0201</span>
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="inline-flex items-center gap-1 mr-1 h-8 px-2 rounded-[6px]"><StatusText c={A.ok} label="Sak" /><ChevronRight className="w-3.5 h-3.5" strokeWidth={2} style={{ color: A.ink3 }} /></span>
            <IconBtn icon={Sparkles} size={17} />
            <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] text-[12.5px] font-medium" style={{ color: A.ink2 }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: A.ok }} />KI svarer<Pause className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: A.ink3 }} /></span>
            <IconBtn icon={PanelRight} size={17} />
          </div>
        </div>
        <div className="h-px mx-5" style={{ background: A.hair }} />
      </div>
      <div className="flex-1 overflow-hidden px-6 pt-4 flex flex-col gap-4">
        {TRAAD.map((m, i) => <Melding key={i} m={m} />)}
      </div>
      {/* Komponisten – lys pille */}
      <div className="px-6 pb-5 pt-3 shrink-0">
        <div className="rounded-[26px] flex items-end gap-1 pl-2 pr-2 py-1.5" style={{ background: A.field, boxShadow: `0 0 0 1px ${A.hair}, 0 10px 30px -18px rgba(26,22,18,0.28)` }}>
          <span className="w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0" style={{ color: A.ink2 }}><Plus className="w-[18px] h-[18px]" strokeWidth={1.75} /></span>
          <span className="flex-1 min-w-0 px-2 py-[7px] text-[15px] leading-[22px] truncate" style={{ color: A.ink3 }}>Svarer Emma Sørensen…</span>
          <span className="w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0" style={{ color: A.ink2 }}><AtSign className="w-[18px] h-[18px]" strokeWidth={1.75} /></span>
          <span className="w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0" style={{ color: A.ink2 }}><Smile className="w-[18px] h-[18px]" strokeWidth={1.75} /></span>
          <span className="w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0" style={{ color: A.purple }}><Sparkles className="w-[18px] h-[18px]" strokeWidth={1.75} /></span>
          <span className="w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0" style={{ background: A.ink, color: A.onInk }}><ArrowUp className="w-[18px] h-[18px]" strokeWidth={2} /></span>
        </div>
        <p className="text-[11.5px] text-center mt-2" style={{ color: A.ink3, margin: '8px 0 0' }}>SMS til +47 •• •• •• 12 · KI-assistenten foreslår svar, du bestemmer</p>
      </div>
    </div>

    {/* Kontekstpanelet – personen er tråden, boligen er konteksten */}
    <aside className="shrink-0 h-full overflow-hidden flex flex-col gap-7 px-5 pt-5 pb-6" style={{ width: 300, borderLeft: `1px solid ${A.hair}`, background: A.canvas }}>
      <div className="flex items-center gap-3">
        <Avatar name={KONTEKST.person.n} size={44} />
        <span className="min-w-0">
          <span className={`block text-[15px] font-semibold leading-tight ${H}`} style={{ color: A.ink }}>{KONTEKST.person.n}</span>
          <span className="block text-[12px] mt-1 leading-tight" style={{ color: A.ink3 }}>{KONTEKST.person.siden}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center h-6 px-2 rounded-full text-[11.5px] font-medium" style={{ background: A.canvas2, color: A.ink2 }}>{KONTEKST.person.rolle}</span>
        <span className="inline-flex items-center h-6 px-2 rounded-full text-[11.5px]" style={{ background: A.canvas2, color: A.ink3 }}>{KONTEKST.person.kanaler}</span>
      </div>
      <div className="flex gap-1.5">
        {[[MessageSquare, 'Melding'], [Phone, 'Ring'], [Mail, 'E-post'], [FileText, 'Dokumenter']].map(([I, l]) => (
          <span key={l} className="flex-1 inline-flex flex-col items-center justify-center gap-1 h-[52px] rounded-[10px] text-[11px]" style={{ background: A.field, boxShadow: CARD_SHADOW, color: A.ink2 }}><I className="w-4 h-4" strokeWidth={1.75} />{l}</span>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        <RailLabel>Bolig</RailLabel>
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0"><span className="block text-[13.5px] font-medium" style={{ color: A.ink }}>{KONTEKST.bolig[0]}</span><span className="block text-[12px] mt-0.5" style={{ color: A.ink3 }}>{KONTEKST.bolig[2]}</span></span>
          <StatusText c={A.ok} label={KONTEKST.bolig[1]} />
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <RailLabel>Leieforhold</RailLabel>
        <dl className="m-0 flex flex-col gap-2">
          {KONTEKST.leie.map(([k, v, c]) => <div key={k} className="flex items-baseline justify-between gap-3 text-[12.5px]"><dt className="shrink-0" style={{ color: A.ink3 }}>{k}</dt><dd className="m-0 text-right whitespace-nowrap" style={{ color: c || A.ink }}>{v}</dd></div>)}
        </dl>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between"><RailLabel>Saker</RailLabel><span className="text-[11.5px] font-medium" style={{ color: A.ink3 }}>Se alle</span></div>
        {KONTEKST.saker.map(([t, s, c]) => (
          <div key={t} className="flex items-start gap-2.5 rounded-[10px] px-3 py-2.5" style={{ background: A.field, boxShadow: CARD_SHADOW }}>
            <Droplets className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} style={{ color: A.warn }} />
            <span className="min-w-0"><span className="block text-[13px] font-medium" style={{ color: A.ink }}>{t}</span><span className="block text-[12px] mt-0.5" style={{ color: c }}>{s}</span></span>
          </div>
        ))}
      </div>
    </aside>
  </div>
);

/* ═══════════════════════════════════ ENHETSVISNINGEN «STEDET» ═══════════════════════════════════ */

const FOTO = [
  'https://images.unsplash.com/photo-1708704974484-3ca56db9384f?crop=entropy&cs=srgb&fm=jpg&q=70&w=1200',
  'https://images.unsplash.com/photo-1653427602884-15ea63290719?crop=entropy&cs=srgb&fm=jpg&q=70&w=800',
  'https://images.unsplash.com/photo-1593224647849-0ef96ecc2bdd?crop=entropy&cs=srgb&fm=jpg&q=70&w=800',
];
const FANER = [[Home, 'Stedet', true], [CalendarRange, 'Utleie'], [Users, 'Personer'], [Droplets, 'Saker', 1], [MessageSquare, 'Meldinger', 2], [Wallet, 'Økonomi'], [FileText, 'Dokumenter']];
const FAKTA = [[Home, 'Leilighet'], [Ruler, '72 m²'], [BedDouble, '2 soverom'], [Bath, '1 bad'], [Layers, '2. etasje'], [Armchair, 'Delvis møblert'], [CalendarRange, 'Langtid'], [Hammer, 'Bygget 1932']];
const FASILITETER = [[Wifi, 'Fiber', 'Telenor 500/500'], [ThermometerSun, 'Balkong', 'mot bakgården'], [WashingMachine, 'Vaskemaskin', 'Bosch'], [Utensils, 'Oppvaskmaskin', 'Siemens'], [Thermometer, 'Varmepumpe', 'Mitsubishi'], [Warehouse, 'Bod', 'i kjeller'], [Bike, 'Sykkelparkering', ''], [KeyRound, 'Digital lås', 'Keyhole']];
const HUSREGLER = ['Røyking er ikke tillatt innendørs', 'Husdyr etter avtale med eier', 'Ro i oppgangen etter kl. 23'];
const PERSONER = [
  { label: 'Eier', n: 'Kari Nordmann', meta: 'Eierportal aktiv · ', ok: 'Avtale signert', icon: SquareUser },
  { label: 'Leietaker', n: 'Emma Sørensen', meta: 'Fra 1. aug. 2025 · 3 år · ', ok: 'Signert med BankID', icon: Users },
  { label: 'Ansvarlig forvalter', n: 'Sarah Sleeman', meta: 'DigiHome · svarer innen 1 virkedag', photo: DATA.user.img, pos: DATA.user.pos },
];

const Section = ({ title, meta, action, children }) => (
  <section>
    <div className="flex items-center justify-between gap-3 mb-3 min-h-[32px]">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] flex items-baseline gap-2 min-w-0" style={{ color: A.ink, margin: 0 }}><span className="truncate">{title}</span>{meta && <span className="text-[13px] font-normal tabular-nums shrink-0" style={{ color: A.ink3 }}>· {meta}</span>}</h2>
      {action && <span className="inline-flex items-center gap-2 h-8 px-3 rounded-[8px] text-[13px] font-medium" style={{ color: A.ink2 }}>{action}</span>}
    </div>
    {children}
  </section>
);

const Chip = ({ icon: I, label, empty }) => (
  <span className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-full text-[13px]" style={empty ? { border: `1px dashed ${A.hairStrong}`, color: A.ink3 } : { background: A.canvas2, color: A.ink, fontWeight: 500 }}>
    {empty ? <Plus className="w-3.5 h-3.5 shrink-0" strokeWidth={2} /> : <I className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} style={{ color: A.ink3 }} />}<span className="whitespace-nowrap">{label}</span>
  </span>
);

const PhotoChip = ({ children }) => <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-medium" style={{ background: 'rgba(255,255,255,0.9)', color: A.ink, boxShadow: CARD_SHADOW, backdropFilter: 'blur(6px)' }}>{children}</span>;

export const ENHET_W = 1440;
export const ENHET_H = 1360;
export const Enhet = () => (
  <div className="flex overflow-hidden text-left font-body" style={{ width: ENHET_W, height: ENHET_H, background: A.canvas, color: A.ink, WebkitFontSmoothing: 'antialiased' }} data-testid="produkt-enhet">
    <Rail user={DATA.user} active="Eiendommer" />

    {/* Enhetsmenyen – 228 px */}
    <div className="shrink-0 flex flex-col pt-7 pb-6 px-3 h-full" style={{ width: 228, background: A.canvas, borderRight: `1px solid ${A.hair}` }}>
      <div className="flex items-center justify-between h-8 mb-4 pl-1">
        <span className="flex items-center gap-1.5 text-[12px] font-medium min-w-0" style={{ color: A.ink3 }}><ArrowLeft className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /><span className="truncate">Eiendommer</span></span>
        <IconBtn icon={PanelLeftClose} size={16} tone={A.ink3} />
      </div>
      <div className="px-2.5 mb-5">
        <h2 className="text-[15px] font-semibold leading-tight tracking-[-0.01em]" style={{ color: A.ink, margin: 0 }}>Nygårdsgaten 5, H0201</h2>
        <p className="text-[12px] mt-1 leading-snug truncate" style={{ color: A.ink3, margin: '4px 0 0' }}>5015 Bergen · Sentrum</p>
      </div>
      <div className="flex flex-col gap-px mb-6">
        {FANER.map(([I, l, x]) => {
          const active = x === true; const badge = typeof x === 'number' ? x : 0;
          return (
            <span key={l} className={`w-full flex items-center gap-2.5 h-8 px-2.5 rounded-[8px] text-[13px] ${active ? 'font-medium' : ''}`} style={{ background: active ? A.canvas2 : 'transparent', color: active ? A.ink : A.ink2 }}>
              <I className="w-4 h-4 shrink-0" strokeWidth={1.75} /><span className="flex-1 text-left truncate">{l}</span>
              {badge > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-semibold tabular-nums inline-flex items-center justify-center" style={{ background: A.canvas2, color: A.ink2 }}>{badge}</span>}
            </span>
          );
        })}
      </div>
      <div className="mt-auto pt-5" style={{ borderTop: `1px solid ${A.hair}` }}>
        <p className={`${TH} mb-2 px-2.5`} style={{ color: A.ink3, margin: '0 0 8px' }}>Andre enheter</p>
        <div className="relative ml-4 pl-3 flex flex-col gap-px" style={{ borderLeft: `1px solid ${A.hair}` }}>
          {['H0101 · Utleid', 'H0202 · Utleid', 'H0301 · Ledig fra 1. des.', 'H0302 · Utleid'].map((u) => <span key={u} className="flex items-center h-7 px-2 rounded-[6px] text-[12.5px] truncate" style={{ color: A.ink2 }}>{u}</span>)}
        </div>
      </div>
    </div>

    {/* Innholdet – maks 1240, Stedet-fanen */}
    <main className="flex-1 min-w-0 overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-8 pt-6 pb-16">
        <div className="flex items-center justify-between gap-3 mb-6 min-h-[32px]">
          <nav className="flex items-center gap-1.5 text-[13px] min-w-0" style={{ color: A.ink3 }}>Eiendommer<ChevronRight className="w-3 h-3 shrink-0" style={{ color: A.hairStrong }} />Nygårdsgaten 5<ChevronRight className="w-3 h-3 shrink-0" style={{ color: A.hairStrong }} /><span style={{ color: A.ink2 }}>H0201</span></nav>
          <span className="inline-flex items-center gap-2 h-9 px-3 rounded-[8px] text-[13px] font-medium" style={{ background: A.field, boxShadow: CARD_SHADOW, color: A.ink2 }}><MessageSquare className="w-4 h-4" strokeWidth={1.75} />Send melding</span>
        </div>

        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className={`${H} text-[30px] font-semibold tracking-[-0.022em] leading-[1.12]`} style={{ color: A.ink, margin: 0 }}>Nygårdsgaten 5, H0201<span className="font-normal" style={{ color: A.ink3 }}> · Lys treroms mot bakgården</span></h1>
                <p className="text-[14px] mt-2 leading-snug" style={{ color: A.ink3, margin: '8px 0 0' }}>5015 Bergen · Sentrum · Utleid til Emma Sørensen siden 1. august 2025</p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-medium" style={{ background: A.okBg, color: A.ok }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: A.ok }} />Utleid</span>
                <IconBtn icon={MoreHorizontal} size={16} className="w-9 h-9" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">{FAKTA.map(([I, l]) => <Chip key={l} icon={I} label={l} />)}<Chip empty label="Senger" /></div>
          </header>

          <div className="grid items-start" style={{ gridTemplateColumns: 'minmax(0,1fr) 372px', columnGap: 48, rowGap: 40 }}>
            {/* Hovedkolonnen */}
            <div className="flex flex-col gap-9 min-w-0">
              <div className="relative h-[300px] rounded-[16px] overflow-hidden grid gap-1.5" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={FOTO[0]} alt="" className="w-full h-full object-cover" style={{ background: A.canvas2 }} />
                <div className="grid gap-1.5" style={{ gridTemplateRows: '1fr 1fr' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={FOTO[1]} alt="" className="w-full h-full object-cover" style={{ background: A.canvas2 }} />
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={FOTO[2]} alt="" className="w-full h-full object-cover" style={{ background: A.canvas2 }} />
                    <span className="absolute inset-0 flex items-center justify-center text-[22px] font-semibold text-white" style={{ background: 'rgba(26,26,26,0.38)' }}>+9</span>
                  </div>
                </div>
                <div className="absolute left-3 bottom-3 flex items-center gap-2"><PhotoChip>12 bilder</PhotoChip><PhotoChip><Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: A.purple }} />Oppdater fra bilder</PhotoChip></div>
                <span className="absolute right-3 bottom-3"><PhotoChip><Settings2 className="w-3.5 h-3.5" strokeWidth={1.75} /></PhotoChip></span>
              </div>

              <Section title="Om boligen" action="Rediger">
                <p className="text-[14.5px] leading-[1.6] max-w-[62ch]" style={{ color: A.ink2, margin: 0 }}>Lys og rolig treroms i andre etasje i en velholdt bygård fra 1932. Stue med utgang til vestvendt balkong mot bakgården, nytt kjøkken fra 2023 og to gode soverom. Fiber, varmepumpe og egen bod i kjeller. Kort vei til Bystasjonen, Bergen sentrum og Møhlenpris.</p>
              </Section>

              <Section title="Hvor du sover" meta="2 soverom · 3 senger">
                <div className="grid grid-cols-2 gap-2">
                  {[['Soverom 1', '1 dobbeltseng · 160 cm'], ['Soverom 2', '1 enkeltseng · garderobe']].map(([t, s]) => (
                    <div key={t} className="rounded-[12px] px-4 py-3.5 flex items-center gap-3" style={{ background: A.canvas2 }}>
                      <BedDouble className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: A.ink2 }} />
                      <div className="min-w-0"><p className="text-[13.5px] font-medium" style={{ color: A.ink, margin: 0 }}>{t}</p><p className="text-[12px]" style={{ color: A.ink3, margin: 0 }}>{s}</p></div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Dette tilbyr boligen" meta="12" action="Rediger">
                <div className="grid grid-cols-2 gap-x-8">
                  {FASILITETER.map(([I, l, b]) => (
                    <div key={l} className="flex items-center gap-3 h-10 -mx-2 px-2 rounded-[8px]">
                      <I className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: A.ink2 }} />
                      <div className="min-w-0 flex-1 flex items-baseline gap-2"><span className="text-[14px]" style={{ color: A.ink }}>{l}</span>{b && <span className="text-[12px] truncate" style={{ color: A.ink3 }}>{b}</span>}</div>
                    </div>
                  ))}
                </div>
                <span className="inline-flex items-center gap-2 h-9 px-3 -mx-3 mt-1 rounded-[8px] text-[13px] font-medium" style={{ color: A.ink2 }}>Vis alle 12 fasiliteter<ChevronDown className="w-3.5 h-3.5" strokeWidth={2} /></span>
              </Section>

              <Section title="Husregler" action="Rediger">
                <ul className="list-none p-0 m-0 flex flex-col">
                  {HUSREGLER.map((r, i) => <li key={r} className="flex items-center gap-3 h-10 text-[14px]" style={{ color: A.ink, borderTop: i > 0 ? `1px solid ${A.hair}` : undefined }}><Check className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: A.ink3 }} />{r}</li>)}
                </ul>
              </Section>
            </div>

            {/* Høyrekolonnen – 372 px */}
            <div className="flex flex-col gap-8 min-w-0">
              <div className="rounded-[14px] p-5" style={{ background: A.ink, color: A.onInk, boxShadow: '0 20px 44px -22px rgba(26,22,18,0.6)' }}>
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="inline-flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.7)' }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#5fcf8f' }} />Utleid · leieforholdet løper</span>
                  <span className="tabular-nums whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>Neste steg</span>
                </div>
                <p className="mt-3 text-[17px] font-semibold leading-snug tracking-[-0.01em]" style={{ margin: '12px 0 0' }}>Husleien for oktober er betalt. Neste forfall 1. november.</p>
                <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)', margin: '12px 0 0' }}><div className="h-full rounded-full" style={{ width: '39%', background: 'rgba(255,255,255,0.85)' }} /></div>
                <p className="text-[13px] leading-snug mt-2.5" style={{ color: 'rgba(255,255,255,0.6)', margin: '10px 0 0' }}>Måned 14 av 36 · {N('12 400')} kr/mnd · depositum på konto</p>
                <div className="mt-4 flex items-center gap-2" style={{ margin: '16px 0 0' }}>
                  <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-[8px] text-[13px] font-medium" style={{ background: A.field, color: A.ink }}>Se leieforhold<ArrowRight className="w-3.5 h-3.5" strokeWidth={2} /></span>
                  <span className="inline-flex items-center gap-2 h-9 px-3 rounded-[8px] text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>Send melding</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <RailLabel>Personer</RailLabel>
                <ul className="list-none p-0 m-0 flex flex-col gap-2">
                  {PERSONER.map((p) => (
                    <li key={p.label} className="flex items-center gap-3 min-h-[64px] px-4 py-3 rounded-[16px]" style={{ border: `1px solid ${A.hair}`, background: A.field }}>
                      <Avatar name={p.n} size={36} photo={p.photo} pos={p.pos} />
                      <span className="min-w-0 flex-1 block">
                        <span className="block text-[11px] font-medium uppercase tracking-[0.05em]" style={{ color: A.ink3 }}>{p.label}</span>
                        <span className="block text-[15px] leading-5 font-medium truncate" style={{ color: A.ink }}>{p.n}</span>
                        <span className="block text-[13px] leading-4 mt-0.5 truncate" style={{ color: A.ink2 }}>{p.meta}{p.ok && <span style={{ color: A.ok }}>{p.ok}</span>}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 shrink-0" style={{ color: A.ink3 }}><MessageSquare className="w-4 h-4" strokeWidth={1.75} /><ChevronRight className="w-4 h-4" strokeWidth={1.75} /></span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2.5">
                <RailLabel>Sted</RailLabel>
                <div className="rounded-[12px] h-[120px] relative overflow-hidden" style={{ background: A.canvas2 }}>
                  <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${A.hair} 1px, transparent 1px), linear-gradient(90deg, ${A.hair} 1px, transparent 1px)`, backgroundSize: '28px 28px', opacity: 0.8 }} />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full inline-flex items-center justify-center" style={{ background: A.ink, color: A.onInk }}><MapPin className="w-4 h-4" strokeWidth={2} /></span>
                </div>
                <div className="flex items-start justify-between gap-3 text-[13px]"><span style={{ color: A.ink2 }}>Nygårdsgaten 5, 5015 Bergen</span><span className="inline-flex items-center gap-1 font-medium shrink-0" style={{ color: A.ink3 }}>Åpne i kart<ExternalLink className="w-3 h-3" strokeWidth={2} /></span></div>
              </div>

              <div className="flex flex-col gap-2.5">
                <RailLabel>Adgang</RailLabel>
                <div className="flex items-center gap-3 rounded-[12px] px-4 py-3" style={{ background: A.field, boxShadow: CARD_SHADOW }}>
                  <KeyRound className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: A.ink2 }} />
                  <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium" style={{ color: A.ink }}>Keyhole · digital lås</span><span className="block text-[12px] mt-0.5" style={{ color: A.ink3 }}>2 digitale nøkler aktive · 1 fysisk nøkkel i nøkkelskap</span></span>
                  <ChevronRight className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: A.ink3 }} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
);
