// Server-komponent: verdensklasse leiemarkedsrapport for /leiemarkedet/[by].
// Redaksjonelt, datadrevet, med Dataset + Article + BreadcrumbList JSON-LD for
// maksimal siterbarhet i Google og AI-søk (E-E-A-T / linkbait-ressurs).
import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { site } from '@/lib/site';
import {
  TrendingUp, TrendingDown, MapPin, ArrowUpRight, Database, BadgeCheck,
  Building2, Activity, Info, Sparkles, BarChart3, Quote,
} from 'lucide-react';

const nf = (n) => (n == null ? '–' : Number(n).toLocaleString('nb-NO'));

// ── Inline SVG areal-/linjegraf for prisutvikling ──────────────────────────
function TrendChart({ trend }) {
  const pts = (trend || []).filter((t) => t.val != null);
  if (pts.length < 2) return null;
  const W = 720, H = 240, padX = 16, padTop = 28, padBottom = 40;
  const vals = pts.map((p) => p.val);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i) => padX + (i * (W - padX * 2)) / (pts.length - 1);
  const y = (v) => padTop + (1 - (v - min) / span) * (H - padTop - padBottom);
  const linePts = pts.map((p, i) => `${x(i)},${y(p.val)}`).join(' ');
  const area = `M ${x(0)},${H - padBottom} L ${pts.map((p, i) => `${x(i)},${y(p.val)}`).join(' L ')} L ${x(pts.length - 1)},${H - padBottom} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none" role="img" aria-label="Prisutvikling for snittleie">
      <defs>
        <linearGradient id="rmGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a463e8" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#a463e8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#rmGrad)" />
      <polyline points={linePts} fill="none" stroke="#a463e8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={p.year}>
          <circle cx={x(i)} cy={y(p.val)} r="4" fill="#fff" stroke="#a463e8" strokeWidth="2.5" />
          <text x={x(i)} y={y(p.val) - 12} textAnchor="middle" fontSize="13" fontWeight="600" fill="#1f1f1f">{nf(p.val)}</text>
          <text x={x(i)} y={H - 14} textAnchor="middle" fontSize="12" fill="#999">{p.year}</text>
        </g>
      ))}
    </svg>
  );
}

const levelTone = (level) => {
  if (level === 'Svært høy') return { bg: 'bg-[#e9d7fb]', text: 'text-[#6b21a8]', bar: '#a463e8' };
  if (level === 'Høy') return { bg: 'bg-[#dceafd]', text: 'text-[#1e40af]', bar: '#3b82f6' };
  if (level === 'Moderat til høy') return { bg: 'bg-[#e5f3e8]', text: 'text-[#166534]', bar: '#22c55e' };
  return { bg: 'bg-[#f1f0ee]', text: 'text-[#555]', bar: '#9ca3af' };
};

export default function RentMarketPage({ report }) {
  const r = report;
  const updated = r.source?.ssbUpdated ? new Date(r.source.ssbUpdated) : null;
  const generated = r.generatedAt ? new Date(r.generatedAt) : new Date();
  const maxRoom = Math.max(...r.byRoom.map((b) => b.current || 0), 1);

  const crumbs = [
    { name: 'Hjem', url: site.url + '/' },
    { name: 'Leiemarkedet', url: `${site.url}/leiemarkedet` },
    { name: r.cityLabel, url: `${site.url}/leiemarkedet/${r.city}` },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      },
      {
        '@type': 'Dataset',
        name: `Leiepriser i ${r.cityLabel} ${r.year}`,
        description: `Gjennomsnittlig månedsleie i ${r.cityLabel} fordelt på antall rom og prissone, basert på Statistisk sentralbyrås leiemarkedsundersøkelse, kombinert med DigiHomes etterspørselsindeks.`,
        url: `${site.url}/leiemarkedet/${r.city}`,
        keywords: ['leiepriser', 'leiemarked', r.cityLabel, 'husleie', 'utleie'],
        temporalCoverage: `${r.years?.[0] || ''}/${r.year}`,
        spatialCoverage: { '@type': 'Place', name: `${r.cityLabel}, Norge` },
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: { '@type': 'Organization', name: 'Statistisk sentralbyrå', url: 'https://www.ssb.no' },
        publisher: { '@type': 'Organization', name: site.name, url: site.url },
        dateModified: generated.toISOString(),
        variableMeasured: r.byRoom.filter((b) => b.current).map((b) => ({
          '@type': 'PropertyValue', name: `Snittleie ${b.label}`, value: b.current, unitText: 'NOK/måned',
        })),
        isBasedOn: r.source?.tables?.map((t) => ({ '@type': 'Dataset', name: `SSB tabell ${t.id}`, url: t.url })),
      },
      {
        '@type': 'Article',
        headline: `Leiemarkedet i ${r.cityLabel} ${r.year}: snittleie, prisutvikling og etterspørsel`,
        description: r.intro,
        image: r.image,
        datePublished: generated.toISOString(),
        dateModified: generated.toISOString(),
        author: { '@type': 'Organization', name: site.name, url: site.url },
        publisher: {
          '@type': 'Organization', name: site.name,
          logo: { '@type': 'ImageObject', url: `${site.url}/digihome-mark.svg` },
        },
        mainEntityOfPage: `${site.url}/leiemarkedet/${r.city}`,
      },
    ],
  };

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />

      {/* HERO */}
      <section className="relative min-h-[78vh] w-full overflow-hidden flex items-end">
        <img src={r.image} alt={`Leiemarkedet i ${r.cityLabel}`} className="absolute inset-0 w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,8,12,0.55) 0%, rgba(8,8,12,0.35) 30%, rgba(8,8,12,0.92) 100%)' }} />
        <div className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-16 pt-32">
          <nav className="text-[12.5px] text-white/70 mb-5 flex items-center gap-2 flex-wrap">
            {crumbs.map((c, i) => (
              <span key={c.url} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/40">/</span>}
                {i < crumbs.length - 1 ? <Link href={c.url.replace(site.url, '') || '/'} className="hover:text-white transition-colors">{c.name}</Link> : <span className="text-white/90">{c.name}</span>}
              </span>
            ))}
          </nav>
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#d298ff] mb-4">
            <BarChart3 className="w-3.5 h-3.5" /> Leiemarkedsrapport · {r.year}
          </div>
          <h1 className="text-white font-bold tracking-[-0.025em] leading-[1.02] text-[40px] sm:text-[58px] lg:text-[72px] max-w-[16ch]" style={{ fontFamily: 'var(--font-heading)' }}>
            Leiemarkedet i {r.cityLabel}
          </h1>
          <p className="text-white/80 text-[16px] sm:text-[19px] mt-5 max-w-[62ch] leading-relaxed">{r.intro}</p>

          {/* Headline stats */}
          <div className="mt-9 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm max-w-[920px]">
            {[
              { k: 'Snittleie 2-roms', v: `${nf(r.headline.typical2rom)} kr`, sub: 'per måned' },
              { k: 'Endring fra i fjor', v: `${r.headline.yoy2rom >= 0 ? '+' : ''}${r.headline.yoy2rom ?? '–'} %`, sub: `${r.prevYear} → ${r.year}`, up: (r.headline.yoy2rom || 0) >= 0 },
              { k: 'Prisspenn', v: `${nf(r.headline.rangeLow)}–${nf(r.headline.rangeHigh)}`, sub: 'kr/mnd (1–4 rom)' },
              { k: 'Etterspørsel', v: r.demand.level, sub: `Indeks ${r.demand.index}/100` },
            ].map((s) => (
              <div key={s.k} className="bg-black/30 px-5 py-5">
                <p className="text-[11px] uppercase tracking-[0.1em] text-white/50 font-semibold">{s.k}</p>
                <p className="text-white text-[24px] sm:text-[28px] font-bold mt-1.5 flex items-center gap-1.5 leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
                  {s.up === true && <TrendingUp className="w-5 h-5 text-emerald-400" />}
                  {s.up === false && <TrendingDown className="w-5 h-5 text-rose-400" />}
                  {s.v}
                </p>
                <p className="text-[12px] text-white/55 mt-1.5">{s.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-white/50 mt-4 flex items-center gap-2">
            <Database className="w-3.5 h-3.5" /> Kilde: Statistisk sentralbyrå (SSB){updated ? ` · oppdatert ${updated.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })}` : ''}
          </p>
        </div>
      </section>

      {/* EDITORIAL SUMMARY + INSIGHTS */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-20 items-start">
          <div>
            <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#a463e8] mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Markedsvurdering
            </div>
            <h2 className="text-[28px] sm:text-[38px] font-bold tracking-[-0.02em] leading-[1.08] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
              Slik ser leiemarkedet ut akkurat nå
            </h2>
            {r.aiSummary && (
              <div className="relative pl-6 border-l-2 border-[#e9d7fb] mb-7">
                <Quote className="w-5 h-5 text-[#d298ff] absolute -left-[11px] -top-1 bg-[#fdfcfb]" />
                <p className="text-[18px] sm:text-[20px] leading-relaxed text-[#333]">{r.aiSummary}</p>
              </div>
            )}
            <p className="text-[15px] text-[#777] leading-relaxed">
              Tallene bygger på SSBs leiemarkedsundersøkelse — den mest autoritative kilden på faktiske leiepriser i Norge. DigiHome kombinerer dette med egne forvaltningsdata for å gi et komplett bilde av hvor etterspørselen er størst.
            </p>
          </div>
          <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-[0_18px_60px_-26px_rgba(0,0,0,0.18)]">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#999] mb-5">Nøkkelfunn</h3>
            <ul className="space-y-4">
              {r.insights.map((ins, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-[#f4f0fb] flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-3.5 h-3.5 text-[#a463e8]" />
                  </span>
                  <span className="text-[15px] leading-relaxed text-[#333]">{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SNITTLEIE PER ROMTYPE */}
      <section className="bg-[#f6f4f1]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-20">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
            <div>
              <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#a463e8] mb-3"><Building2 className="w-3.5 h-3.5" /> Snittleie per boligtype</div>
              <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>Hva koster det å leie i {r.cityLabel}?</h2>
            </div>
            <p className="text-[13px] text-[#999] max-w-[34ch]">Gjennomsnittlig månedlig leie ({r.year}). Tall i parentes viser endring fra {r.prevYear}.</p>
          </div>
          <div className="space-y-4">
            {r.byRoom.filter((b) => b.current).map((b) => (
              <div key={b.roomKey} className="flex items-center gap-4 sm:gap-6">
                <div className="w-[80px] sm:w-[120px] shrink-0 text-[14px] sm:text-[15px] font-semibold text-[#1f1f1f]">{b.label}</div>
                <div className="flex-1 h-11 sm:h-12 rounded-xl bg-white overflow-hidden relative shadow-[0_2px_10px_-4px_rgba(0,0,0,0.08)]">
                  <div className="h-full rounded-xl flex items-center justify-end pr-4" style={{ width: `${Math.max(18, (b.current / maxRoom) * 100)}%`, background: 'linear-gradient(90deg, #b681ee, #a463e8)' }}>
                    <span className="text-white font-bold text-[15px] sm:text-[17px]" style={{ fontFamily: 'var(--font-heading)' }}>{nf(b.current)} kr</span>
                  </div>
                </div>
                <div className="w-[70px] sm:w-[90px] shrink-0 text-right">
                  {b.yoyPct != null && (
                    <span className={`inline-flex items-center gap-1 text-[12.5px] font-semibold ${b.yoyPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {b.yoyPct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {b.yoyPct >= 0 ? '+' : ''}{b.yoyPct}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRISUTVIKLING */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
        <div className="grid lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#a463e8] mb-3"><Activity className="w-3.5 h-3.5" /> Prisutvikling</div>
            <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.02em] leading-tight mb-5" style={{ fontFamily: 'var(--font-heading)' }}>Leieprisene over tid</h2>
            <p className="text-[15.5px] leading-relaxed text-[#555]">Gjennomsnittlig månedsleie på tvers av boligstørrelser i {r.cityLabel}, {r.years?.[0]}–{r.year}. Et stigende marked betyr økt avkastningspotensial — men også et marked der riktig prising blir stadig viktigere.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_18px_60px_-26px_rgba(0,0,0,0.18)]">
            <TrendChart trend={r.trend} />
          </div>
        </div>
      </section>

      {/* PRIS ETTER SONE */}
      <section className="bg-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#d298ff] mb-3"><MapPin className="w-3.5 h-3.5" /> Pris etter område</div>
          <h2 className="text-[26px] sm:text-[36px] font-bold tracking-[-0.02em] mb-3 max-w-[20ch]" style={{ fontFamily: 'var(--font-heading)' }}>Sentralt vs. øvrige bydeler</h2>
          <p className="text-white/55 text-[15px] max-w-[60ch] mb-12">Predikert månedsleie etter boligstørrelse og prissone ({r.year}). Sentrale boliger oppnår en tydelig premie — særlig for små enheter.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {r.zones.map((z, zi) => (
              <div key={z.code} className={`rounded-3xl p-7 sm:p-8 ${zi === 0 ? 'bg-gradient-to-br from-[#1f1538] to-[#120c22] ring-1 ring-[#a463e8]/30' : 'bg-white/[0.04]'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-[20px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{z.label}</h3>
                    <p className="text-[12.5px] text-white/45 mt-0.5">{z.sub}</p>
                  </div>
                  {zi === 0 && <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#d298ff] bg-[#d298ff]/12 px-2.5 py-1 rounded-full">Høyest</span>}
                </div>
                <div className="space-y-3">
                  {z.sizes.filter((s) => s.rent).map((s) => (
                    <div key={s.key} className="flex items-center justify-between py-2.5 border-b border-white/8 last:border-0">
                      <div>
                        <p className="text-[15px] font-semibold text-white/90">{s.label}</p>
                        <p className="text-[12px] text-white/40">{s.sqm} m² · {nf(s.perSqm)} kr/m²</p>
                      </div>
                      <p className="text-[20px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{nf(s.rent)} <span className="text-[13px] font-medium text-white/50">kr/mnd</span></p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIGIHOME ETTERSPØRSELSINDEKS */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
        <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#a463e8] mb-3"><Sparkles className="w-3.5 h-3.5" /> DigiHome Etterspørselsindeks</div>
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-10 lg:gap-16 items-start">
          <div>
            <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.02em] leading-tight mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Hvor er etterspørselen størst?</h2>
            <div className="flex items-end gap-4 mb-5">
              <div className="text-[64px] sm:text-[80px] font-bold leading-none text-[#a463e8]" style={{ fontFamily: 'var(--font-heading)' }}>{r.demand.index}</div>
              <div className="pb-2">
                <p className="text-[13px] text-[#999]">av 100</p>
                <p className="text-[17px] font-bold text-[#1f1f1f]">{r.demand.level}</p>
              </div>
            </div>
            <p className="text-[14px] leading-relaxed text-[#777]">{r.demand.note}</p>
            <p className="text-[12.5px] text-[#aaa] mt-4">Basert på {r.demand.signals.leads} eierforespørsler og {r.demand.signals.tenants} leietakerforespørsler siste {r.demand.signals.windowDays} dager.</p>
          </div>
          <div className="space-y-3">
            {r.demand.byArea.map((a) => {
              const tone = levelTone(a.level);
              return (
                <Link key={a.slug} href={`/utleie/${a.slug}`} className="group block bg-white rounded-2xl p-5 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.10)] hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.18)] transition-shadow">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[15.5px] font-semibold text-[#1f1f1f] group-hover:text-[#a463e8] transition-colors">{a.area}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#ccc] group-hover:text-[#a463e8] group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <span className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full ${tone.bg} ${tone.text}`}>{a.level}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-[#f0eef2] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${a.index}%`, background: tone.bar }} />
                    </div>
                    <span className="text-[13px] font-bold text-[#666] w-8 text-right">{a.index}</span>
                  </div>
                  {a.popularTypes?.length > 0 && (
                    <p className="text-[12px] text-[#aaa] mt-2">{a.popularTypes.join(' · ')}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* METODE & KILDE */}
      <section className="bg-[#f6f4f1]">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-10 lg:px-16 py-14 lg:py-16">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#999] mb-5"><Info className="w-3.5 h-3.5" /> Metode og kilder</div>
          <div className="grid sm:grid-cols-2 gap-8 text-[14px] leading-relaxed text-[#666]">
            <div>
              <p className="font-semibold text-[#1f1f1f] mb-2">Datakilder</p>
              <ul className="space-y-2">
                {r.source.tables.map((t) => (
                  <li key={t.id}>
                    <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-[#a463e8] hover:underline font-medium">SSB tabell {t.id}</a> — {t.title}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12.5px] text-[#999]">Lisens: {r.source.license}. Etterspørselsindeksen er DigiHomes egen sammenstilling.</p>
            </div>
            <div>
              <p className="font-semibold text-[#1f1f1f] mb-2">Om tallene</p>
              <p>Gjennomsnittsleiene er vektet og bygger på uavhengige utvalg per årgang. De er derfor ikke fullt ut sammenlignbare mellom år, og endringstall bør tolkes som indikasjoner på trend. Predikert leie (sone) er SSBs modellerte estimat for typiske boligstørrelser.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#1a1430] to-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24 text-center">
          <h2 className="text-[28px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4 max-w-[24ch] mx-auto" style={{ fontFamily: 'var(--font-heading)' }}>
            Vil du vite hva din bolig kan leies ut for?
          </h2>
          <p className="text-white/70 text-[16px] max-w-[52ch] mx-auto mb-8">Få en gratis, uforpliktende verdivurdering basert på markedsdata og DigiHomes lokale forvaltningserfaring. Ingen oppstartskostnader, ingen bindingstid.</p>
          <Link href="/bli-utleier" className="group inline-flex items-center gap-2 h-[54px] pl-7 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold active:scale-[0.98] transition-transform shadow-[0_16px_44px_-12px_rgba(210,152,255,0.6)]">
            Få gratis verdivurdering
            <span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
