'use client';

// /ny2 — Premium 2026 editorial-konsept (design-lab B). Bygget etter brukerens
// referanse-spec, tilpasset DigiHome: norsk copy, merkelilla #d298ff (ink-tekst på lilla flater),
// ekte testimonials fra lib/site (én innholdskilde), 30 %-påstanden konsistent.
// framer-motion: fadeInUp + staggerContainer + AnimatedText (ord-for-ord).

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, CalendarCheck, Star, TrendingUp, Headset,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { testimonials } from '@/lib/site';
import { track } from '@/lib/analytics';

const BRAND = '#d298ff';
const INK = '#14081f';

const IMGS = {
  hero: 'https://customer-assets-0z36b82j.emergentagent.net/job_a2e68e8c-4f87-418f-b57e-d72a68ad9d32/artifacts/aovxlvrp_image0056.webp',
  card: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=900&auto=format&fit=crop',
  prop1: 'https://images.pexels.com/photos/11622889/pexels-photo-11622889.jpeg?auto=compress&cs=tinysrgb&w=1200',
  prop2: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=1200&auto=format&fit=crop',
  prop3: 'https://images.pexels.com/photos/19966782/pexels-photo-19966782.jpeg?auto=compress&cs=tinysrgb&w=1200',
  featured: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1200&auto=format&fit=crop',
  testimonial: 'https://images.pexels.com/photos/19966790/pexels-photo-19966790.jpeg?auto=compress&cs=tinysrgb&w=900',
};

// Gjenbrukbare varianter (per spec)
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// Ord-for-ord animert tekst (per spec: split på mellomrom, viewport once, -10%)
function AnimatedText({ text, grayFrom = -1, className = '' }) {
  const words = text.split(' ');
  return (
    <motion.p
      className={className}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.035 } } }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10%' }}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } }}
          className={`inline-block mr-[0.24em] ${grayFrom >= 0 && i >= grayFrom ? 'text-zinc-400' : ''}`}
        >
          {w}
        </motion.span>
      ))}
    </motion.p>
  );
}

function Label({ text, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-2.5 h-2.5 ${light ? 'bg-white' : 'bg-zinc-900'}`} />
      <span className={`text-xs font-semibold tracking-widest uppercase ${light ? 'text-white' : 'text-zinc-900'}`}>{text}</span>
    </div>
  );
}

export default function Ny2Page() {
  const [scrolled, setScrolled] = useState(false);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    try { track('ny2_concept_view', {}); } catch (e) {}
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const revs = testimonials || [];
  const R = revs[((rev % revs.length) + revs.length) % revs.length] || {};

  return (
    <div className="min-h-screen bg-[#ebebeb] text-zinc-900" style={{ fontFamily: 'var(--font-body, inherit)' }} data-testid="ny2-page">

      {/* ============ 1. NAVBAR ============ */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-black/60 backdrop-blur-md py-4' : 'bg-transparent py-6'}`} data-testid="ny2-nav">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <a href="/" aria-label="DigiHome — til forsiden">
            <img src="/brand/digihome-lockup-white.svg" alt="DigiHome" className="h-[26px] w-auto" />
          </a>
          <nav className="hidden lg:flex items-center gap-7 bg-black/30 backdrop-blur-md px-8 py-3 rounded-full border border-white/10 text-[13.5px] font-medium text-white/85">
            <a href="/ny2" className="flex items-center gap-2 text-white"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#cf97fc' }} /> Hjem</a>
            <a href="#boliger" className="hover:text-white transition-colors">Boliger</a>
            <a href="#om" className="hover:text-white transition-colors">Om oss</a>
            <a href="/leiemarkedet" className="hover:text-white transition-colors">Innsikt</a>
            <a href="/kontakt" className="hover:text-white transition-colors">Kontakt</a>
          </nav>
          <a href="/bli-utleier/start" data-testid="ny2-nav-cta" className="group inline-flex items-center gap-2.5 text-[13.5px] font-semibold pl-5 pr-1.5 py-1.5 rounded-full transition-transform active:scale-[0.97]" style={{ backgroundColor: BRAND, color: INK }}>
            Book vurdering
            <span className="w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-0.5" style={{ backgroundColor: INK }}><ArrowRight className="w-4 h-4" style={{ color: BRAND }} /></span>
          </a>
        </div>
      </header>

      {/* ============ 2. HERO — flush fullskjerm m/ eiendomsbilde ============ */}
      <section className="h-screen w-full relative overflow-hidden flex items-end pb-12 px-6 md:px-12 md:pb-20" data-testid="ny2-hero">
        <img src={IMGS.hero} alt="Moderne arkitekttegnet bolig i skumringen" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
        <div className="relative z-20 w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-end justify-between gap-10">
          {/* Venstre */}
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="max-w-[640px]">
            <motion.h1 variants={fadeInUp} className="text-white text-5xl md:text-6xl xl:text-7xl font-bold tracking-[-0.03em] leading-[1.03]" style={{ fontFamily: 'var(--font-heading)' }}>
              Boligen din.<br />Løftet til sitt fulle.
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-white/75 text-[15.5px] md:text-[17px] leading-relaxed mt-6 max-w-[52ch]">
              DigiHome forvalter boligen din med teknologi, lokalkunnskap og omsorg.
              Du lener deg tilbake — vi håndterer alt, og inntekten vokser med opptil 30 %.
            </motion.p>
            <motion.div variants={fadeInUp} className="mt-8">
              <a href="/bli-utleier/start" data-testid="ny2-hero-cta" className="group inline-flex items-center gap-3 text-[15px] font-semibold pl-7 pr-2 py-2 rounded-full transition-all active:scale-[0.97] hover:shadow-[0_12px_36px_rgba(210,152,255,0.55)]" style={{ backgroundColor: BRAND, color: INK }}>
                Utforsk mulighetene
                <span className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-0.5" style={{ backgroundColor: INK }}><ArrowRight className="w-[18px] h-[18px]" style={{ color: BRAND }} /></span>
              </a>
            </motion.div>
          </motion.div>

          {/* Høyre: flytende glass-kort */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }} className="w-full lg:w-[400px] bg-white/10 backdrop-blur-xl border border-white/20 p-3 rounded-3xl" data-testid="ny2-glass-card">
            <div className="relative rounded-2xl overflow-hidden">
              <img src={IMGS.card} alt="Varm nordisk stue — forvaltet av DigiHome" className="w-full h-48 md:h-56 object-cover" />
              <a href="/bli-utleier/start" aria-label="Se mer" className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105" style={{ backgroundColor: BRAND }}><ArrowRight className="w-4 h-4" style={{ color: INK }} /></a>
            </div>
            <p className="text-white text-[15.5px] font-medium leading-snug px-2 pb-2 pt-4">Opplev den perfekte balansen mellom stil, komfort og lønnsomhet.</p>
            <div className="flex gap-1.5 px-2 pb-2">
              <span className="h-1 w-7 rounded-full bg-white" />
              <span className="h-1 w-7 rounded-full bg-white/30" />
              <span className="h-1 w-7 rounded-full bg-white/30" />
              <span className="h-1 w-7 rounded-full bg-white/30" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ 3. OM-SEKSJON ============ */}
      <section id="om" className="bg-[#ebebeb] pt-24 pb-16 flex flex-col items-center px-6">
        <Label text="Om DigiHome" />
        <div className="mt-10 text-center">
          <AnimatedText
            text="DigiHome™ gjør utleie enkel, lønnsom og faktisk behagelig. Vi tenker eiendomsforvaltning på nytt for en ny generasjon — ingen stress, ingen utdaterte systemer, bare smart teknologi som jobber for deg."
            grayFrom={17}
            className="text-2xl md:text-3xl lg:text-[34px] font-medium leading-[1.3] text-zinc-900 max-w-[900px] mx-auto"
          />
        </div>
      </section>

      {/* ============ 4. FEATURES GRID ============ */}
      <section className="bg-[#ebebeb] pb-24 px-6">
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-10%' }} className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[{
            dark: false, Icon: CalendarCheck, text: 'Enkel og sømløs\nutleie fra dag én',
          }, {
            dark: true, Icon: Star, text: 'Nøye utvalgte\nkvalitetsboliger', desc: 'Håndplukkede leietakere og boliger —\nkomfort, stil og kvalitet.',
          }, {
            dark: false, Icon: TrendingUp, text: 'Opptil 30 % høyere\nleieinntekt',
          }, {
            dark: false, Icon: Headset, text: 'Personlig oppfølging\nhele veien',
          }].map((c, i) => (
            <motion.div key={i} variants={fadeInUp} className={`p-8 md:p-10 rounded-[1.5rem] min-h-[340px] flex flex-col justify-between ${c.dark ? 'bg-[#1c1c1c] text-white' : 'bg-[#dedede] text-zinc-900'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.dark ? 'bg-[#e5e5e5] text-zinc-900' : 'bg-[#2b2b2b] text-white'}`}>
                <c.Icon className="w-5 h-5" fill={c.dark ? 'currentColor' : 'none'} />
              </div>
              <div>
                <p className="text-[19px] md:text-[21px] font-semibold leading-snug whitespace-pre-line" style={{ fontFamily: 'var(--font-heading)' }}>{c.text}</p>
                {c.desc ? <p className="text-[13.5px] text-white/60 mt-3 whitespace-pre-line leading-relaxed">{c.desc}</p> : null}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ============ 5. BOLIGER ============ */}
      <section id="boliger" className="bg-[#ebebeb] pb-24 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <Label text="Boliger" />
            <AnimatedText
              text="Vi forvalter kvalitetsboliger i hele Bergen — alltid med kort vei til det beste byen har å by på."
              className="text-xl md:text-2xl lg:text-3xl font-medium leading-[1.3] max-w-2xl md:text-right"
            />
          </div>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-10%' }} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[{
              img: IMGS.prop1, title: 'Sandviken · Klassisk bergenshus', dist: '1,5 kilometer til Bryggen',
            }, {
              img: IMGS.prop2, title: 'Nordnes · Lys 3-roms med sjøutsikt', dist: '2 minutter til Nordnesparken',
            }, {
              img: IMGS.prop3, title: 'Møhlenpris · Moderne 2-roms', dist: '5 minutter til sentrum',
            }].map((p, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <div className="h-[400px] md:h-[450px] rounded-[2rem] relative overflow-hidden group">
                  <img src={p.img} alt={p.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" loading="lazy" />
                  <span className="absolute top-5 left-5 bg-white/10 backdrop-blur-md border border-white/20 shadow-sm text-white text-[10px] px-4 py-1.5 rounded-full uppercase tracking-widest font-semibold">Forvaltet</span>
                  <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-white text-[17px] font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>{p.title}</p>
                    <p className="text-white/65 text-[13px] mt-1">{p.dist}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ 6. UTVALGT (mørk container) ============ */}
      <section className="bg-[#ebebeb] pb-24 px-6">
        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-10%' }} className="max-w-[1400px] mx-auto bg-[#1a1a1a] rounded-[2.5rem] p-8 md:p-12 lg:p-16 flex flex-col lg:flex-row gap-12">
          <div className="flex-1 flex flex-col justify-between gap-10">
            <div>
              <Label text="Utvalgt" light />
              <h2 className="text-2xl md:text-3xl lg:text-4xl text-white font-semibold tracking-[-0.02em] leading-[1.15] max-w-sm mt-8" style={{ fontFamily: 'var(--font-heading)' }}>
                Vi finner leietakerne som matcher boligen din
              </h2>
              <p className="text-white/55 text-[15px] leading-relaxed mt-5 max-w-[40ch]">
                Grundig screening, digital kontrakt med BankID og oppfølging gjennom hele leieforholdet — trygghet i hvert steg.
              </p>
            </div>
            <a href="/leiemarkedet" data-testid="ny2-featured-cta" className="group inline-flex items-center gap-3 w-fit bg-[#e4e4e4] text-zinc-900 text-[14px] font-semibold pl-6 pr-2 py-2 rounded-full transition-transform active:scale-[0.97]">
              Se leiemarkedet
              <span className="w-9 h-9 rounded-full flex items-center justify-center transition-transform group-hover:rotate-12" style={{ backgroundColor: BRAND }}><ArrowUpRight className="w-4 h-4" style={{ color: INK }} /></span>
            </a>
          </div>
          <div className="relative flex-1 min-h-[400px] lg:min-h-full">
            <img src={IMGS.featured} alt="Lys skandinavisk stue med store vinduer" className="w-full h-full object-cover rounded-[2rem] absolute inset-0" loading="lazy" />
          </div>
        </motion.div>
      </section>

      {/* ============ 7. KUNDEHISTORIER (karusell) ============ */}
      <section className="bg-[#ebebeb] pb-24 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-12">
            <Label text="Kundehistorier" />
            <div className="flex items-center gap-3">
              <button onClick={() => setRev((r) => r - 1)} aria-label="Forrige" data-testid="ny2-rev-prev" className="w-11 h-11 rounded-full border border-zinc-400 flex items-center justify-center hover:bg-zinc-200 transition-colors"><ChevronLeft className="w-4.5 h-4.5 w-[18px] h-[18px]" /></button>
              <button onClick={() => setRev((r) => r + 1)} aria-label="Neste" data-testid="ny2-rev-next" className="w-11 h-11 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-black transition-colors"><ChevronRight className="w-[18px] h-[18px]" /></button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-10 lg:gap-24">
            <div className="w-full max-w-[320px] md:max-w-[380px] aspect-[4/5] rounded-[2rem] overflow-hidden shrink-0">
              <img src={IMGS.testimonial} alt="Koselig kjøkken i forvaltet bolig" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div key={rev}>
              <span className="block text-[80px] leading-[0.5] text-zinc-900" style={{ fontFamily: 'Georgia, serif' }}>“</span>
              <motion.blockquote initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="text-xl md:text-2xl lg:text-3xl font-medium leading-[1.35] text-zinc-900 max-w-[26ch] mt-6" data-testid="ny2-rev-quote">
                {R.quote}
              </motion.blockquote>
              <p className="mt-8 font-semibold text-[15px]">{R.name}</p>
              <p className="text-zinc-500 text-[13.5px] mt-0.5">{R.role}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 8. FOOTER ============ */}
      <footer className="bg-[#ebebeb] border-t border-zinc-300/80 px-6 py-16 md:py-20">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <p className="text-sm text-zinc-500">Boligens fulle potensial venter</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-[-0.02em] leading-[1.1] mt-4" style={{ fontFamily: 'var(--font-heading)' }}>
              La oss få det til å skje.<br />Book en vurdering i dag!
            </h2>
          </div>
          <div className="md:col-span-4 flex flex-col gap-8">
            <div>
              <p className="text-sm text-zinc-500">Adresse</p>
              <p className="text-xl md:text-2xl font-medium mt-1">Bergen, Norge</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Telefon</p>
              <a href="tel:+4790958313" className="text-xl md:text-2xl font-medium mt-1 block hover:underline">+47 909 58 313</a>
            </div>
          </div>
          <div className="md:col-span-3 flex flex-col gap-3 text-lg font-medium">
            <a href="/" className="hover:underline w-fit">Hjem</a>
            <a href="/om-oss" className="hover:underline w-fit">Om oss</a>
            <a href="/bli-utleier" className="hover:underline w-fit">For utleiere</a>
            <a href="/bli-leietaker" className="hover:underline w-fit">For leietakere</a>
            <a href="/leiemarkedet" className="hover:underline w-fit">Leiemarkedet</a>
            <a href="/guider" className="hover:underline w-fit">Guider</a>
          </div>
        </div>
      </footer>

      {/* Konsept-merke */}
      <div className="fixed bottom-4 left-4 z-50 px-3.5 py-2 rounded-full bg-[#0a0a0a]/85 backdrop-blur text-white text-[11px] font-semibold tracking-[0.06em] shadow-lg pointer-events-none">
        2026-KONSEPT B · intern test
      </div>
    </div>
  );
}
