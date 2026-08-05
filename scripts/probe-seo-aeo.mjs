// PROBE — SEO/AEO-verifisering mot kjørende Next.js (preview).
// Sjekker ekte HTML: metadata, JSON-LD, ankere, interne lenker, sitemap,
// robots, llms.txt og 301/308-konsolideringen. Ingen antakelser.
//   node scripts/probe-seo-aeo.mjs
const BASE = process.env.PROBE_BASE || 'http://localhost:3000';

let ok = 0;
const fails = [];
const warns = [];
const t = (cond, label) => { if (cond) { ok += 1; } else { fails.push(label); } };
const w = (cond, label) => { if (!cond) warns.push(label); };

const GUIDES = [
  'hva-koster-utleiemegler',
  'leie-ut-leilighet-bergen',
  'utleiemegler-vs-selvforvaltning',
  'depositum-regler',
  'depositumskonto',
  'leietaker-har-ikke-betalt-depositum',
  'depositum-tilbakebetaling',
  'skatt-pa-utleie',
  'fradrag-utleiebolig',
  'korttidsutleie-regler',
  'godkjent-utleiedel',
  'husleieokning',
];

const REDIRECTS = {
  '/nyheter/skatt-pa-utleieinntekt-2026': '/guider/skatt-pa-utleie',
  '/nyheter/hva-koster-utleiemegler-i-bergen-2026': '/guider/hva-koster-utleiemegler',
  '/nyheter/leie-ut-bolig-i-bergen-komplett-guide-2026': '/guider/leie-ut-leilighet-bergen',
  '/nyheter/selvforvaltning-eller-full-forvaltning': '/guider/utleiemegler-vs-selvforvaltning',
};

const get = async (path, init = {}) => {
  const r = await fetch(BASE + path, init);
  return { status: r.status, headers: r.headers, text: await r.text() };
};

const jsonLdBlocks = (html) => {
  const out = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try { out.push(JSON.parse(m[1])); } catch (e) { out.push({ __parseError: e.message }); }
  }
  return out;
};

const flatten = (blocks) => blocks.flatMap((b) => (b && b['@graph'] ? b['@graph'] : [b]));
const pick = (blocks, type) => flatten(blocks).find((b) => b && b['@type'] === type);
const meta = (html, name) => (html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`)) || [])[1] || '';
const ogTag = (html, prop) => (html.match(new RegExp(`<meta property="${prop}" content="([^"]*)"`)) || [])[1] || '';
const titleOf = (html) => (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
const canonicalOf = (html) => (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || '';

console.log(`\n══════════ PROBE SEO/AEO — ${BASE} ══════════\n`);

// ── 1. Guide-sider ────────────────────────────────────────────────────────
const titles = new Map();
const descs = new Map();

for (const slug of GUIDES) {
  const path = `/guider/${slug}`;
  const r = await get(path);
  t(r.status === 200, `${path} → ${r.status} (forventet 200)`);
  if (r.status !== 200) continue;
  const html = r.text;

  // Metadata
  const title = titleOf(html);
  const desc = meta(html, 'description');
  const bare = title.replace(/\s*\|\s*DigiHome\s*$/i, '');
  t(!!title, `${path}: mangler <title>`);
  t(bare.length >= 25 && bare.length <= 60, `${path}: tittel-lengde ${bare.length} utenfor 25–60 ("${bare}")`);
  w(title.length <= 62, `${path}: tittel inkl. merke er ${title.length} tegn — kan bli avkortet i SERP`);
  t(desc.length >= 70 && desc.length <= 175, `${path}: meta description ${desc.length} tegn utenfor 70–175`);
  t(!titles.has(title), `${path}: duplikat tittel med ${titles.get(title)}`);
  t(!descs.has(desc), `${path}: duplikat description med ${descs.get(desc)}`);
  titles.set(title, path); descs.set(desc, path);

  t(canonicalOf(html) === `https://digihome.no${path}`, `${path}: canonical feil (${canonicalOf(html)})`);
  t(!!ogTag(html, 'og:image'), `${path}: mangler og:image`);
  t(ogTag(html, 'og:type') === 'article', `${path}: og:type er ikke article`);
  t(!!meta(html, 'twitter:card') || html.includes('twitter:card'), `${path}: mangler twitter card`);

  // Struktur
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  t(h1s === 1, `${path}: ${h1s} h1-elementer (forventet 1)`);
  t(html.includes('dh-answer'), `${path}: mangler .dh-answer (speakable-mål)`);
  t(html.includes('Nøkkeltall'), `${path}: mangler Nøkkeltall-boks`);

  // Ankere på H2 (passasjelenking)
  const sectionIds = [...html.matchAll(/<section id="([a-z0-9-]+)"/g)].map((m) => m[1]);
  t(sectionIds.length >= 5, `${path}: bare ${sectionIds.length} seksjons-ankere (forventet ≥5)`);

  // Ingen ubehandlet inline-markup skal nå HTML
  const bodyStart = html.indexOf('dh-answer');
  const body = bodyStart > 0 ? html.slice(bodyStart) : html;
  t(!/\]\(\//.test(body), `${path}: urendret lenke-markup "](/" i HTML`);
  t(!/\*\*[^*<]{2,40}\*\*/.test(body), `${path}: urendret fet-markup "**" i HTML`);

  // JSON-LD
  const blocks = jsonLdBlocks(html);
  t(!blocks.some((b) => b.__parseError), `${path}: ugyldig JSON-LD (${blocks.find((b) => b.__parseError)?.__parseError})`);
  const article = pick(blocks, 'Article');
  const crumb = pick(blocks, 'BreadcrumbList');
  const faq = pick(blocks, 'FAQPage');
  const howto = pick(blocks, 'HowTo');

  t(!!article, `${path}: mangler Article-schema`);
  if (article) {
    t(!!article.headline, `${path}: Article uten headline`);
    t(!!article.datePublished && !!article.dateModified, `${path}: Article uten datePublished/dateModified`);
    t(article.datePublished <= article.dateModified, `${path}: datePublished etter dateModified`);
    t(!!article.author?.name, `${path}: Article uten author`);
    t(!!article.publisher?.['@id'], `${path}: Article uten publisher`);
    t(article.speakable?.['@type'] === 'SpeakableSpecification', `${path}: Article uten speakable`);
    t(Number(article.wordCount) >= 700, `${path}: wordCount ${article.wordCount} under 700 (tynt innhold)`);
    t(!!article.keywords, `${path}: Article uten keywords`);
    t(Array.isArray(article.about) && article.about.length > 0, `${path}: Article uten about-entiteter`);
    t(Array.isArray(article.citation) && article.citation.length >= 2, `${path}: Article med < 2 kilder`);
    t(!/\]\(|\*\*/.test(JSON.stringify(article)), `${path}: markup lekket inn i JSON-LD`);
    t(article.inLanguage === 'nb-NO', `${path}: Article inLanguage ikke nb-NO`);
  }
  t(!!crumb, `${path}: mangler BreadcrumbList`);
  t(crumb?.itemListElement?.length === 3, `${path}: BreadcrumbList har ${crumb?.itemListElement?.length} nivåer (forventet 3)`);
  t(!!faq, `${path}: mangler FAQPage`);
  t((faq?.mainEntity?.length || 0) >= 4, `${path}: bare ${faq?.mainEntity?.length} FAQ-spørsmål (forventet ≥4)`);
  // FAQ-svarene må faktisk være synlige på siden (Googles krav)
  if (faq?.mainEntity?.length) {
    const q0 = faq.mainEntity[0].name;
    t(html.includes(q0.slice(0, 30)), `${path}: FAQ-spørsmål ikke synlig i HTML`);
  }
  if (slug === 'leie-ut-leilighet-bergen') {
    t(!!howto, `${path}: forventet HowTo-schema`);
    t((howto?.step?.length || 0) === 5, `${path}: HowTo har ${howto?.step?.length} steg (forventet 5)`);
    // Stegene MÅ være synlige
    if (howto?.step?.length) t(html.includes(howto.step[0].name), `${path}: HowTo-steg ikke synlig i HTML`);
  } else {
    t(!howto, `${path}: uventet HowTo-schema (stegene vises ikke)`);
  }

  // Interne guide-lenker skal peke på slugs som finnes
  const links = [...html.matchAll(/href="\/guider\/([a-z0-9-]+)"/g)].map((m) => m[1]);
  const bad = [...new Set(links)].filter((s) => !GUIDES.includes(s));
  t(bad.length === 0, `${path}: interne lenker til ukjente guider: ${bad.join(', ')}`);
  w(new Set(links).size >= 2, `${path}: bare ${new Set(links).size} interne guide-lenker`);
}

// ── 2. Guide-hub ──────────────────────────────────────────────────────────
{
  const r = await get('/guider');
  t(r.status === 200, `/guider → ${r.status}`);
  const html = r.text;
  const blocks = jsonLdBlocks(html);
  const coll = flatten(blocks).find((b) => b && b['@type'] === 'CollectionPage');
  t(!!coll, '/guider: mangler CollectionPage/ItemList');
  t(coll?.mainEntity?.numberOfItems === GUIDES.length, `/guider: ItemList har ${coll?.mainEntity?.numberOfItems} (forventet ${GUIDES.length})`);
  for (const slug of GUIDES) t(html.includes(`/guider/${slug}`), `/guider: mangler lenke til ${slug}`);
  t(!/\*\*[^*<]{2,40}\*\*/.test(html), '/guider: urendret fet-markup i HTML');
}

// ── 3. Konsolidering (301/308) ────────────────────────────────────────────
for (const [from, to] of Object.entries(REDIRECTS)) {
  const r = await fetch(BASE + from, { redirect: 'manual' });
  t([301, 308].includes(r.status), `${from} → ${r.status} (forventet 301/308)`);
  t(r.headers.get('location') === to, `${from} → Location ${r.headers.get('location')} (forventet ${to})`);
}

// ── 4. Sitemap ────────────────────────────────────────────────────────────
{
  const r = await get('/sitemap.xml');
  t(r.status === 200, `/sitemap.xml → ${r.status}`);
  const locs = [...r.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const slug of GUIDES) t(locs.includes(`https://digihome.no/guider/${slug}`), `sitemap mangler /guider/${slug}`);
  for (const from of Object.keys(REDIRECTS)) {
    t(!locs.some((u) => u.endsWith(from)), `sitemap inneholder redirigert URL ${from}`);
  }
  t(new Set(locs).size === locs.length, 'sitemap har duplikate URL-er');
  console.log(`  sitemap: ${locs.length} URL-er`);
}

// ── 5. robots + llms.txt ──────────────────────────────────────────────────
{
  const r = await get('/robots.txt');
  t(r.status === 200, `/robots.txt → ${r.status}`);
  for (const bot of ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'OAI-SearchBot']) {
    t(r.text.includes(bot), `robots.txt mangler ${bot}`);
  }
  t(r.text.includes('sitemap.xml'), 'robots.txt mangler sitemap-referanse');

  const l = await get('/llms.txt');
  t(l.status === 200, `/llms.txt → ${l.status}`);
  for (const slug of GUIDES) t(l.text.includes(`/guider/${slug}`), `llms.txt mangler /guider/${slug}`);
  t(l.text.includes('Direkte svar'), 'llms.txt mangler seksjon med direkte svar (AEO)');
}

// ── 6. Optimaliserte landingssider ────────────────────────────────────────
for (const [path, mustInclude] of [
  ['/utleiemegler-bergen', 'Utleiemegler i Bergen: pris fra 5 %'],
  ['/leiemarkedet/bergen', 'Leiepriser i Bergen'],
  ['/utleie/asane', 'Leie ut bolig i Åsane'],
  ['/nyheter', 'Nyheter og innsikt om utleie i Bergen'],
]) {
  const r = await get(path);
  t(r.status === 200, `${path} → ${r.status}`);
  t(titleOf(r.text).includes(mustInclude), `${path}: tittel mangler "${mustInclude}" (fikk "${titleOf(r.text)}")`);
}

// ── 7. Nyhetsartikler: AEO-felt + interne guide-lenker ────────────────────
for (const slug of ['korttid-eller-langtid-velg-riktig-utleiemodell', '5-ting-som-gjor-at-boligen-leies-ut-raskere']) {
  const path = `/nyheter/${slug}`;
  const r = await get(path);
  t(r.status === 200, `${path} → ${r.status}`);
  if (r.status !== 200) continue;
  const blocks = jsonLdBlocks(r.text);
  const post = flatten(blocks).find((b) => b && b['@type'] === 'BlogPosting');
  t(!!post, `${path}: mangler BlogPosting`);
  t(post?.speakable?.['@type'] === 'SpeakableSpecification', `${path}: BlogPosting uten speakable`);
  t(Number(post?.wordCount) > 0, `${path}: BlogPosting uten wordCount`);
  t(r.text.includes('dh-answer'), `${path}: mangler .dh-answer`);
  const gl = [...r.text.matchAll(/href="\/guider\/([a-z0-9-]+)"/g)].map((m) => m[1]);
  t(gl.length >= 3, `${path}: bare ${gl.length} lenker til guider (forventet ≥3)`);
}

// ── Oppsummering ──────────────────────────────────────────────────────────
console.log(`\n══════════ RESULTAT ══════════`);
console.log(`OK:   ${ok}`);
console.log(`FEIL: ${fails.length}`);
if (fails.length) fails.forEach((f) => console.log(`  ✗ ${f}`));
if (warns.length) {
  console.log(`\nADVARSLER (${warns.length}) — ikke feil, men verdt å se på:`);
  warns.forEach((f) => console.log(`  ! ${f}`));
}
process.exit(fails.length ? 1 : 0);
