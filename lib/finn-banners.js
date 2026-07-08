// ============================================================================
// FINN-bannermotor v3 — premium display-materiell for alle FINN.no-formater.
// SVG komponeres server-side og rasteriseres med sharp (librsvg).
// Designspråk: sveitsisk presisjon (hjørne-ticks, innfelt ramme, vignett),
// glass-paneler med statistikk, aksentord i overskrift, CTA-pille + pilsirkel,
// trust-linje og format-spesifikk art direction.
// ============================================================================

import sharp from 'sharp';

export const FINN_FORMATS = [
  { key: 'board', label: 'Board', w: 320, h: 250, maxKb: 150, photoOk: true, group: 'mobil' },
  { key: 'board_xl', label: 'Board XL', w: 320, h: 400, maxKb: 150, photoOk: true, group: 'mobil' },
  { key: 'fullskjerm', label: 'Fullskjerm', w: 1080, h: 1920, maxKb: 360, photoOk: true, group: 'mobil' },
  { key: 'netboard', label: 'Netboard', w: 580, h: 400, maxKb: 150, photoOk: true, group: 'desktop' },
  { key: 'hestesko_topp', label: 'Hestesko topp', w: 1010, h: 150, maxKb: 150, photoOk: false, group: 'desktop' },
  { key: 'hestesko_side', label: 'Hestesko side (×2)', w: 180, h: 700, maxKb: 150, photoOk: false, group: 'desktop' },
  { key: 'wallpaper_bakgrunn', label: 'Wallpaper bakgrunn', w: 1920, h: 1300, maxKb: 150, photoOk: false, group: 'desktop' },
];

const SANS = 'Liberation Sans, FreeSans, DejaVu Sans, sans-serif';
const SERIF = 'Liberation Serif, FreeSerif, serif';

export const FINN_THEMES = {
  midnatt: {
    kind: 'dark', font: SANS, bg: '#0a0a0a', bg2: '#171221', fg: '#ffffff', sub: '#c6c2ce',
    accent: '#cf97fc', accent2: '#8b5cf6', ctaBg: '#ffffff', ctaFg: '#0a0a0a',
    chipFg: '#e7d9fb', chipLine: 'rgba(207,151,252,0.5)',
    glass: 'rgba(255,255,255,0.055)', glassLine: 'rgba(255,255,255,0.14)', tick: 'rgba(255,255,255,0.16)',
  },
  nordlys: {
    kind: 'dark', font: SANS, bg: '#090e22', bg2: '#0e1e33', fg: '#ffffff', sub: '#bfc9e6',
    accent: '#7ee8d0', accent2: '#8b5cf6', ctaBg: '#7ee8d0', ctaFg: '#06251d',
    chipFg: '#d7f5ec', chipLine: 'rgba(126,232,208,0.45)',
    glass: 'rgba(255,255,255,0.05)', glassLine: 'rgba(126,232,208,0.22)', tick: 'rgba(255,255,255,0.15)',
  },
  krem: {
    kind: 'light', font: SERIF, bg: '#f6f1e6', bg2: '#efe6d4', fg: '#171310', sub: '#6b6257',
    accent: '#7c4fd0', accent2: '#cf97fc', ctaBg: '#171310', ctaFg: '#f5efe4',
    chipFg: '#6b6257', chipLine: 'rgba(23,19,16,0.3)',
    glass: 'rgba(23,19,16,0.045)', glassLine: 'rgba(23,19,16,0.13)', tick: 'rgba(23,19,16,0.2)',
  },
  plakat: {
    kind: 'accent', font: SANS, bg: '#cf97fc', bg2: '#bd7ef2', fg: '#160b22', sub: '#3f2c58',
    accent: '#160b22', accent2: '#ffffff', ctaBg: '#160b22', ctaFg: '#f3eafc',
    chipFg: '#2c1c40', chipLine: 'rgba(22,11,34,0.38)',
    glass: 'rgba(255,255,255,0.22)', glassLine: 'rgba(22,11,34,0.2)', tick: 'rgba(22,11,34,0.28)',
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function wrap(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxChars) cur = (cur + ' ' + w).trim();
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, '') + '…'; }
  return lines;
}

function splitAccent(lines) {
  return lines.map((ln, i) => {
    const parts = ln.split(' ');
    if (i === lines.length - 1 && parts.length > 1) {
      const last = parts.pop();
      return { text: parts.join(' ') + ' ', accent: last };
    }
    return { text: ln, accent: null };
  });
}

export async function renderFinnBanners({
  headline, subtext = '', cta = 'Les mer', eyebrow = 'Utleie i Bergen',
  stat = '+30 %', statLabel = 'mer i leie med forvaltning',
  trust = 'Gratis vurdering · Svar samme dag',
  theme = 'midnatt', imgBuf = null, formats = null,
}) {
  const T = FINN_THEMES[theme] || FINN_THEMES.midnatt;
  const wanted = formats && formats.length ? new Set(formats) : null;
  const list = FINN_FORMATS.filter((f) => !wanted || wanted.has(f.key));
  const isSerif = T.font === SERIF;
  const showStat = !!(String(stat).trim() && String(statLabel).trim());
  const sansW = (txt, fs) => Math.round(String(txt).length * fs * 0.60);

  // ---------- Delte definisjoner ----------
  const defs = (w, h, hasPhoto) => `<defs>
<linearGradient id="bgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${T.bg}"/><stop offset="100%" stop-color="${T.bg2}"/></linearGradient>
<radialGradient id="orb1" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stop-color="${T.accent}" stop-opacity="${T.kind === 'light' ? 0.17 : 0.38}"/><stop offset="100%" stop-color="${T.accent}" stop-opacity="0"/></radialGradient>
<radialGradient id="orb2" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stop-color="${T.accent2}" stop-opacity="${T.kind === 'light' ? 0.12 : 0.26}"/><stop offset="100%" stop-color="${T.accent2}" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx="0.5" cy="0.42" r="0.85"><stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="78%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${T.kind === 'dark' ? 0.4 : 0.08}"/></radialGradient>
<linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#08060c" stop-opacity="0.36"/><stop offset="50%" stop-color="#08060c" stop-opacity="0.55"/><stop offset="100%" stop-color="#08060c" stop-opacity="0.92"/></linearGradient>
<linearGradient id="topline" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${T.accent}" stop-opacity="0"/><stop offset="45%" stop-color="${T.accent}"/><stop offset="100%" stop-color="${T.accent2}" stop-opacity="0"/></linearGradient>
<pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r="1.2" fill="${hasPhoto ? '#ffffff' : T.fg}" opacity="0.05"/></pattern>
</defs>`;

  // Fargevalg avhengig av fotomodus
  const fgOf = (p) => (p ? '#ffffff' : T.fg);
  const subOf = (p) => (p ? '#ddd8e6' : T.sub);
  const accOf = (p) => (p ? (T.kind === 'accent' ? '#e9d5ff' : (theme === 'nordlys' ? '#7ee8d0' : '#d9b3ff')) : T.accent);
  const chipFgOf = (p) => (p ? '#efe4fc' : T.chipFg);
  const chipLineOf = (p) => (p ? 'rgba(239,228,252,0.5)' : T.chipLine);
  const glassOf = (p) => (p ? 'rgba(255,255,255,0.09)' : T.glass);
  const glassLineOf = (p) => (p ? 'rgba(255,255,255,0.22)' : T.glassLine);
  const tickOf = (p) => (p ? 'rgba(255,255,255,0.28)' : T.tick);

  // ---------- Byggeklosser ----------
  // Hjørne-ticks (sveitsisk presisjon)
  const ticks = (w, h, m, len, p) => {
    const c = tickOf(p);
    const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="1.4"/>`;
    return L(m, m, m + len, m) + L(m, m, m, m + len)
      + L(w - m, m, w - m - len, m) + L(w - m, m, w - m, m + len)
      + L(m, h - m, m + len, h - m) + L(m, h - m, m, h - m - len)
      + L(w - m, h - m, w - m - len, h - m) + L(w - m, h - m, w - m, h - m - len);
  };

  const decor = (w, h, hasPhoto) => {
    if (hasPhoto) return `<rect width="${w}" height="${h}" fill="url(#scrim)"/><rect width="${w}" height="${h}" fill="url(#dots)"/><rect x="0" y="0" width="${w}" height="3" fill="url(#topline)"/>`;
    const d = Math.max(w, h);
    return `<rect width="${w}" height="${h}" fill="url(#bgg)"/>
<ellipse cx="${w * 0.96}" cy="${h * 0.0}" rx="${d * 0.62}" ry="${d * 0.62}" fill="url(#orb1)"/>
<ellipse cx="${w * 0.02}" cy="${h * 1.0}" rx="${d * 0.5}" ry="${d * 0.5}" fill="url(#orb2)"/>
<rect width="${w}" height="${h}" fill="url(#dots)"/>
<rect width="${w}" height="${h}" fill="url(#vig)"/>
<rect x="0" y="0" width="${w}" height="3" fill="url(#topline)"/>`;
  };

  const chip = (x, y, fs, p, anchor = 'start') => {
    if (!eyebrow) return '';
    const txt = eyebrow.toUpperCase();
    const wPix = Math.round(txt.length * fs * 0.74) + Math.round(fs * 2.4);
    const hPix = Math.round(fs * 2.2);
    const rx = anchor === 'middle' ? x - wPix / 2 : x;
    return `<rect x="${rx}" y="${y - hPix / 2}" rx="${hPix / 2}" width="${wPix}" height="${hPix}" fill="none" stroke="${chipLineOf(p)}" stroke-width="1.1"/>
<circle cx="${rx + fs * 1.15}" cy="${y}" r="${fs * 0.26}" fill="${accOf(p)}"/>
<text x="${rx + wPix / 2 + fs * 0.5}" y="${y + fs * 0.36}" font-family="${SANS}" font-size="${fs}" font-weight="bold" letter-spacing="${fs * 0.15}" fill="${chipFgOf(p)}" text-anchor="middle">${esc(txt)}</text>`;
  };

  const headlineSvg = (lines, x, y0, fs, lh, p, anchor = 'start') => {
    const segs = splitAccent(lines);
    return segs.map((s, i) => {
      const acc = s.accent != null
        ? `<tspan fill="${accOf(p)}"${isSerif ? ' font-style="italic"' : ''}>${esc(s.accent)}</tspan>` : '';
      return `<text x="${x}" y="${y0 + i * lh}" font-family="${T.font}" font-size="${fs}" font-weight="bold" fill="${fgOf(p)}" text-anchor="${anchor}" letter-spacing="${isSerif ? 0 : -fs * 0.02}">${esc(s.text)}${acc}</text>`;
    }).join('\n');
  };

  const subSvg = (lines, x, y0, fs, lh, p, anchor = 'start') =>
    lines.map((ln, i) => `<text x="${x}" y="${y0 + i * lh}" font-family="${SANS}" font-size="${fs}" fill="${subOf(p)}" text-anchor="${anchor}">${esc(ln)}</text>`).join('\n');

  // CTA: pille + aksent-sirkel med pil
  const ctaSvg = (x, y, fs, centered = false) => {
    const wPix = Math.max(88, sansW(cta, fs) + Math.round(fs * 2.2));
    const hPix = Math.round(fs * 2.7);
    const circleR = hPix / 2;
    const total = wPix + circleR * 2 + Math.round(fs * 0.5);
    const rx = centered ? x - total / 2 : x;
    const cx = rx + wPix + Math.round(fs * 0.5) + circleR;
    return `<rect x="${rx}" y="${y - hPix / 2}" rx="${hPix / 2}" width="${wPix}" height="${hPix}" fill="${T.ctaBg}"/>
<text x="${rx + wPix / 2}" y="${y + fs * 0.36}" font-family="${SANS}" font-size="${fs}" font-weight="bold" fill="${T.ctaFg}" text-anchor="middle">${esc(cta)}</text>
<circle cx="${cx}" cy="${y}" r="${circleR}" fill="${T.kind === 'accent' ? '#ffffff' : T.accent}"/>
<text x="${cx}" y="${y + fs * 0.4}" font-family="${SANS}" font-size="${Math.round(fs * 1.15)}" font-weight="bold" fill="${T.kind === 'accent' ? '#160b22' : (T.kind === 'light' ? '#ffffff' : '#0a0a0a')}" text-anchor="middle">→</text>`;
  };

  const brand = (x, y, fs, p, anchor = 'start') => {
    const sx = anchor === 'middle' ? x - (fs * 0.9 + sansW('DigiHome', fs)) / 2 : x;
    return `<circle cx="${sx + fs * 0.38}" cy="${y - fs * 0.33}" r="${fs * 0.36}" fill="${accOf(p)}"/>
<text x="${sx + fs * 0.95}" y="${y}" font-family="${SANS}" font-size="${fs}" font-weight="bold" letter-spacing="${fs * 0.01}" fill="${fgOf(p)}">DigiHome</text>`;
  };

  // Glass statistikk-kort (vannrett variant): stat venstre, delelinje, etikett høyre
  const statCardH = (x, y, wPix, hPix, p, statFs) => {
    if (!showStat) return '';
    const labelLines = wrap(statLabel, 18, 2);
    const divX = x + Math.round(wPix * 0.38);
    return `<rect x="${x}" y="${y}" rx="14" width="${wPix}" height="${hPix}" fill="${glassOf(p)}" stroke="${glassLineOf(p)}" stroke-width="1"/>
<text x="${x + Math.round(wPix * 0.19)}" y="${y + hPix / 2 + statFs * 0.36}" font-family="${T.font}" font-size="${statFs}" font-weight="bold" fill="${accOf(p)}" text-anchor="middle"${isSerif ? ' font-style="italic"' : ''}>${esc(stat)}</text>
<line x1="${divX}" y1="${y + hPix * 0.24}" x2="${divX}" y2="${y + hPix * 0.76}" stroke="${glassLineOf(p)}" stroke-width="1"/>
${labelLines.map((ln, i) => `<text x="${divX + 14}" y="${y + hPix / 2 + (i - (labelLines.length - 1) / 2) * (statFs * 0.52) + statFs * 0.16}" font-family="${SANS}" font-size="${Math.round(statFs * 0.4)}" fill="${subOf(p)}">${esc(ln)}</text>`).join('\n')}`;
  };

  // Glass statistikk-kort (stående variant): stat øverst, etikett under
  const statCardV = (x, y, wPix, hPix, p, statFs) => {
    if (!showStat) return '';
    const labelLines = wrap(statLabel, 14, 2);
    return `<rect x="${x}" y="${y}" rx="16" width="${wPix}" height="${hPix}" fill="${glassOf(p)}" stroke="${glassLineOf(p)}" stroke-width="1"/>
<text x="${x + wPix / 2}" y="${y + hPix * 0.42}" font-family="${T.font}" font-size="${statFs}" font-weight="bold" fill="${accOf(p)}" text-anchor="middle"${isSerif ? ' font-style="italic"' : ''}>${esc(stat)}</text>
<line x1="${x + wPix * 0.3}" y1="${y + hPix * 0.52}" x2="${x + wPix * 0.7}" y2="${y + hPix * 0.52}" stroke="${glassLineOf(p)}" stroke-width="1"/>
${labelLines.map((ln, i) => `<text x="${x + wPix / 2}" y="${y + hPix * 0.66 + i * statFs * 0.48}" font-family="${SANS}" font-size="${Math.round(statFs * 0.36)}" fill="${subOf(p)}" text-anchor="middle">${esc(ln)}</text>`).join('\n')}`;
  };

  const metaSvg = (x, y, fs, p, anchor = 'start') =>
    `<text x="${x}" y="${y}" font-family="${SANS}" font-size="${fs}" letter-spacing="${fs * 0.04}" fill="${subOf(p)}" text-anchor="${anchor}">digihome.no</text>`;

  // ---------- Layout per format ----------
  const buildSvg = (f, p) => {
    const { w, h, key } = f;
    const open = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${defs(w, h, p)}${decor(w, h, p)}`;
    const close = '</svg>';

    if (key === 'board') {
      const hl = wrap(headline, 19, 2);
      const sl = wrap(subtext, 40, 1);
      const hlY = 92, lh = isSerif ? 30 : 29;
      return open + ticks(w, h, 10, 10, p)
        + chip(20, 34, 8.5, p)
        + headlineSvg(hl, 20, hlY, isSerif ? 25 : 24, lh, p)
        + subSvg(sl, 20, hlY + hl.length * lh - 8, 12.5, 17, p)
        + ctaSvg(20, h - 42, 12.5)
        + metaSvg(w - 18, h - 16, 9, p, 'end')
        + close;
    }
    if (key === 'board_xl') {
      const hl = wrap(headline, 17, 3);
      const sl = wrap(subtext, 36, 2);
      const hlY = 124, lh = isSerif ? 34 : 33;
      const afterSub = hlY + hl.length * lh + (sl.length ? sl.length * 19 : 0);
      return open + ticks(w, h, 11, 11, p)
        + brand(22, 42, 14.5, p)
        + chip(22, 76, 8.5, p)
        + headlineSvg(hl, 22, hlY, isSerif ? 28 : 27, lh, p)
        + subSvg(sl, 22, hlY + hl.length * lh + 2, 13, 19, p)
        + (showStat ? statCardH(22, Math.min(afterSub + 16, h - 128), w - 44, 58, p, 24) : '')
        + ctaSvg(22, h - 50, 13)
        + metaSvg(w - 20, h - 16, 9.5, p, 'end')
        + close;
    }
    if (key === 'netboard') {
      const hl = wrap(headline, showStat ? 15 : 21, 3);
      const sl = wrap(subtext, showStat ? 30 : 46, 2);
      const hlY = 150, lh = isSerif ? 48 : 47;
      return open + ticks(w, h, 14, 12, p)
        + brand(36, 54, 17, p)
        + chip(36, 92, 9, p)
        + headlineSvg(hl, 36, hlY, isSerif ? 41 : 39, lh, p)
        + subSvg(sl, 36, hlY + hl.length * lh + 4, 16, 23, p)
        + (showStat ? `<circle cx="${w - 110}" cy="120" r="86" fill="none" stroke="${accOf(p)}" stroke-opacity="0.22" stroke-width="1.5"/>` + statCardV(w - 188, 66, 152, 152, p, 34) : '')
        + (showStat && trust ? `<text x="${w - 112}" y="248" font-family="${SANS}" font-size="10.5" fill="${subOf(p)}" text-anchor="middle">${esc(wrap(trust, 30, 1)[0])}</text>` : '')
        + ctaSvg(36, h - 54, 15.5)
        + metaSvg(w - 32, h - 26, 11, p, 'end')
        + close;
    }
    if (key === 'fullskjerm') {
      const hl = wrap(headline, 15, 4);
      const sl = wrap(subtext, 30, 3);
      const lh = isSerif ? 106 : 102;
      const hlY = Math.round(h * 0.315);
      const subY = hlY + hl.length * lh + 26;
      const statY = subY + sl.length * 48 + 56;
      const ctaY = statY + (showStat ? 140 + 84 : 60);
      return open + ticks(w, h, 44, 26, p)
        + brand(w / 2, 190, 42, p, 'middle')
        + chip(w / 2, 296, 17, p, 'middle')
        + headlineSvg(hl, w / 2, hlY, isSerif ? 92 : 88, lh, p, 'middle')
        + subSvg(sl, w / 2, subY, 35, 50, p, 'middle')
        + (showStat ? statCardH(w / 2 - 270, statY, 540, 140, p, 60) : '')
        + ctaSvg(w / 2, ctaY, 31, true)
        + `<rect x="84" y="${h - 214}" rx="20" width="${w - 168}" height="96" fill="${glassOf(p)}" stroke="${glassLineOf(p)}" stroke-width="1"/>`
        + `<text x="120" y="${h - 214 + 58}" font-family="${SANS}" font-size="26" fill="${subOf(p)}">${esc(wrap(trust, 40, 1)[0] || '')}</text>`
        + `<text x="${w - 120}" y="${h - 214 + 58}" font-family="${SANS}" font-size="26" font-weight="bold" letter-spacing="1" fill="${fgOf(p)}" text-anchor="end">digihome.no</text>`
        + close;
    }
    if (key === 'hestesko_topp') {
      const one = wrap(headline, 52, 1)[0] || headline;
      const fs = one.length > 38 ? 25 : 30;
      const sl = wrap(subtext, 66, 1);
      const rightX = w - 34;
      const ctaW = Math.max(88, sansW(cta, 15) + 33) + 44 + 8;
      return open + ticks(w, h, 10, 10, p)
        + brand(34, h / 2 + 7, 18, p)
        + `<line x1="186" y1="${h * 0.24}" x2="186" y2="${h * 0.76}" stroke="${T.kind === 'light' ? 'rgba(23,19,16,0.16)' : 'rgba(255,255,255,0.14)'}" stroke-width="1"/>`
        + headlineSvg([one], 216, h / 2 - (sl.length ? 7 : -10), fs, fs + 4, p)
        + (sl.length ? subSvg(sl, 216, h / 2 + 32, 13.5, 18, p) : '')
        + (showStat ? `<text x="${rightX - ctaW - 148}" y="${h / 2 - 2}" font-family="${T.font}" font-size="26" font-weight="bold" fill="${accOf(p)}" text-anchor="middle"${isSerif ? ' font-style="italic"' : ''}>${esc(stat)}</text>
<text x="${rightX - ctaW - 148}" y="${h / 2 + 22}" font-family="${SANS}" font-size="10.5" fill="${subOf(p)}" text-anchor="middle">${esc(wrap(statLabel, 24, 1)[0])}</text>
<line x1="${rightX - ctaW - 64}" y1="${h * 0.3}" x2="${rightX - ctaW - 64}" y2="${h * 0.7}" stroke="${T.kind === 'light' ? 'rgba(23,19,16,0.16)' : 'rgba(255,255,255,0.14)'}" stroke-width="1"/>` : '')
        + ctaSvg(rightX - ctaW, h / 2, 15)
        + close;
    }
    if (key === 'hestesko_side') {
      const hl = wrap(headline, 11, 4);
      const sl = wrap(subtext, 17, 3);
      const lh = isSerif ? 28 : 27;
      const subY = 178 + hl.length * lh + 14;
      return open + ticks(w, h, 10, 9, p)
        + brand(w / 2, 64, 15, p, 'middle')
        + `<rect x="${w / 2 - 15}" y="90" width="30" height="2.5" fill="${T.kind === 'accent' ? T.accent2 : T.accent}" opacity="0.85"/>`
        + headlineSvg(hl, w / 2, 178, isSerif ? 21.5 : 20.5, lh, p, 'middle')
        + subSvg(sl, w / 2, subY, 11.5, 16, p, 'middle')
        + (showStat ? statCardV(20, 400, w - 40, 120, p, 27) : '')
        + ctaSvg(w / 2, h - 104, 12.5, true)
        + metaSvg(w / 2, h - 34, 10, p, 'middle')
        + close;
    }
    if (key === 'wallpaper_bakgrunn') {
      const one = wrap(headline, 44, 1)[0] || headline;
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${defs(w, h, false)}
<rect width="${w}" height="${h}" fill="url(#bgg)"/>
<ellipse cx="${w * 0.06}" cy="${h * 0.06}" rx="${w * 0.46}" ry="${w * 0.46}" fill="url(#orb1)"/>
<ellipse cx="${w * 0.97}" cy="${h * 0.95}" rx="${w * 0.4}" ry="${w * 0.4}" fill="url(#orb2)"/>
<rect width="${w}" height="${h}" fill="url(#dots)"/>
<rect width="${w}" height="${h}" fill="url(#vig)"/>
<rect x="40" y="40" width="${w - 80}" height="${h - 80}" fill="none" stroke="${T.tick}" stroke-width="1"/>
${ticks(w, h, 40, 22, false)}
<circle cx="${w * 0.85}" cy="${h * 0.2}" r="${h * 0.17}" fill="none" stroke="${T.kind === 'accent' ? T.accent2 : T.accent}" stroke-opacity="0.24" stroke-width="2"/>
<circle cx="${w * 0.85}" cy="${h * 0.2}" r="${h * 0.115}" fill="none" stroke="${T.kind === 'accent' ? T.accent2 : T.accent}" stroke-opacity="0.14" stroke-width="1.5"/>
<rect x="0" y="0" width="${w}" height="4" fill="url(#topline)"/>
${brand(96, 138, 33, false)}
${chip(96, 204, 13, false)}
<text x="96" y="${h - 96}" font-family="${SANS}" font-size="24" fill="${T.sub}">${esc(wrap(trust, 50, 1)[0] || '')}  ·  digihome.no</text>
<text x="${w - 96}" y="${h - 96}" font-family="${T.font}" font-size="31" font-weight="bold" fill="${T.fg}" text-anchor="end"${isSerif ? '' : ''}>${esc(one)}</text>
</svg>`;
    }
    return open + close;
  };

  // ---------- Rasterisering m/ vektkontroll ----------
  const banners = [];
  for (const f of list) {
    const usePhoto = !!(imgBuf && f.photoOk);
    const svg = buildSvg(f, usePhoto);
    let buf; let type;
    if (usePhoto) {
      const photo = await sharp(imgBuf).resize(f.w, f.h, { fit: 'cover' }).modulate({ saturation: 0.92 }).toBuffer();
      buf = await sharp(photo).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      type = 'jpeg';
      if (buf.length > f.maxKb * 1024) buf = await sharp(photo).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 62, mozjpeg: true }).toBuffer();
    } else {
      buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
      type = 'png';
      if (buf.length > f.maxKb * 1024) { buf = await sharp(Buffer.from(svg)).jpeg({ quality: 80, mozjpeg: true }).toBuffer(); type = 'jpeg'; }
    }
    banners.push({
      key: f.key, label: f.label, w: f.w, h: f.h, maxKb: f.maxKb, group: f.group,
      bytes: buf.length, type,
      dataUrl: `data:image/${type};base64,${buf.toString('base64')}`,
    });
  }
  return banners;
}
