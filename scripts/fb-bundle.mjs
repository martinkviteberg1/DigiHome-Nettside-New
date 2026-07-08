// lib/finn-banners.js
import sharp from "sharp";
var FINN_FORMATS = [
  { key: "board", label: "Board", w: 320, h: 250, maxKb: 150, photoOk: true, group: "mobil" },
  { key: "board_xl", label: "Board XL", w: 320, h: 400, maxKb: 150, photoOk: true, group: "mobil" },
  { key: "fullskjerm", label: "Fullskjerm", w: 1080, h: 1920, maxKb: 360, photoOk: true, group: "mobil" },
  { key: "netboard", label: "Netboard", w: 580, h: 400, maxKb: 150, photoOk: true, group: "desktop" },
  { key: "hestesko_topp", label: "Hestesko topp", w: 1010, h: 150, maxKb: 150, photoOk: false, group: "desktop" },
  { key: "hestesko_side", label: "Hestesko side (\xD72)", w: 180, h: 700, maxKb: 150, photoOk: false, group: "desktop" },
  { key: "wallpaper_bakgrunn", label: "Wallpaper bakgrunn", w: 1920, h: 1300, maxKb: 150, photoOk: false, group: "desktop" }
];
var SANS = "Liberation Sans, FreeSans, DejaVu Sans, sans-serif";
var SERIF = "Liberation Serif, FreeSerif, serif";
var FINN_THEMES = {
  midnatt: {
    kind: "dark",
    font: SANS,
    bg: "#0a0a0a",
    fg: "#ffffff",
    sub: "#c9c9c9",
    accent: "#cf97fc",
    accent2: "#8b5cf6",
    ctaBg: "#ffffff",
    ctaFg: "#0a0a0a",
    chipFg: "#e7d9fb",
    chipLine: "rgba(207,151,252,0.55)"
  },
  nordlys: {
    kind: "dark",
    font: SANS,
    bg: "#0b1026",
    fg: "#ffffff",
    sub: "#c3cbe8",
    accent: "#7ee8d0",
    accent2: "#8b5cf6",
    ctaBg: "#7ee8d0",
    ctaFg: "#06251d",
    chipFg: "#d7f5ec",
    chipLine: "rgba(126,232,208,0.5)"
  },
  krem: {
    kind: "light",
    font: SERIF,
    bg: "#f5efe4",
    fg: "#171310",
    sub: "#6b6257",
    accent: "#7c4fd0",
    accent2: "#cf97fc",
    ctaBg: "#171310",
    ctaFg: "#f5efe4",
    chipFg: "#6b6257",
    chipLine: "rgba(23,19,16,0.35)"
  },
  plakat: {
    kind: "accent",
    font: SANS,
    bg: "#cf97fc",
    fg: "#160b22",
    sub: "#43305c",
    accent: "#160b22",
    accent2: "#ffffff",
    ctaBg: "#160b22",
    ctaFg: "#f3eafc",
    chipFg: "#2c1c40",
    chipLine: "rgba(22,11,34,0.4)"
  }
};
var esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
function wrap(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length <= maxChars) cur = (cur + " " + w).trim();
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, "") + "\u2026";
  }
  return lines;
}
function splitAccent(lines) {
  return lines.map((ln, i) => {
    const parts = ln.split(" ");
    if (i === lines.length - 1 && parts.length > 1) {
      const last = parts.pop();
      return { text: parts.join(" ") + " ", accent: last };
    }
    return { text: ln, accent: null };
  });
}
async function renderFinnBanners({ headline, subtext = "", cta = "Les mer", eyebrow = "Utleieforvaltning i Bergen", theme = "midnatt", imgBuf = null, formats = null }) {
  const T = FINN_THEMES[theme] || FINN_THEMES.midnatt;
  const wanted = formats && formats.length ? new Set(formats) : null;
  const list = FINN_FORMATS.filter((f) => !wanted || wanted.has(f.key));
  const isSerif = T.font === SERIF;
  const sansW = (txt, fs) => Math.round(String(txt).length * fs * 0.6);
  const defs = (w, h, hasPhoto) => `<defs>
<radialGradient id="orb1" cx="0" cy="0" r="1"><stop offset="0%" stop-color="${T.accent}" stop-opacity="${T.kind === "light" ? 0.2 : 0.42}"/><stop offset="100%" stop-color="${T.accent}" stop-opacity="0"/></radialGradient>
<radialGradient id="orb2" cx="0" cy="0" r="1"><stop offset="0%" stop-color="${T.accent2}" stop-opacity="${T.kind === "light" ? 0.14 : 0.3}"/><stop offset="100%" stop-color="${T.accent2}" stop-opacity="0"/></radialGradient>
<linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#08060c" stop-opacity="0.34"/><stop offset="52%" stop-color="#08060c" stop-opacity="0.56"/><stop offset="100%" stop-color="#08060c" stop-opacity="0.90"/></linearGradient>
<linearGradient id="topline" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${T.accent}" stop-opacity="0"/><stop offset="45%" stop-color="${T.accent}"/><stop offset="100%" stop-color="${T.accent2}" stop-opacity="0"/></linearGradient>
<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1.3" cy="1.3" r="1.3" fill="${hasPhoto ? "#ffffff" : T.fg}" opacity="0.055"/></pattern>
</defs>`;
  const decor = (w, h, hasPhoto) => {
    if (hasPhoto) return `<rect width="${w}" height="${h}" fill="url(#scrim)"/>`;
    const d = Math.max(w, h);
    const ring = T.kind === "accent" ? T.accent2 : T.accent;
    return `<rect width="${w}" height="${h}" fill="${T.bg}"/>
<ellipse cx="${w * 0.94}" cy="${h * 0.02}" rx="${d * 0.55}" ry="${d * 0.55}" fill="url(#orb1)"/>
<ellipse cx="${w * 0.04}" cy="${h * 0.98}" rx="${d * 0.45}" ry="${d * 0.45}" fill="url(#orb2)"/>
<rect width="${w}" height="${h}" fill="url(#dots)"/>
<circle cx="${w * 0.88}" cy="${h * 0.82}" r="${d * 0.1}" fill="none" stroke="${ring}" stroke-opacity="${T.kind === "light" ? 0.22 : 0.3}" stroke-width="1.5"/>
<rect x="0" y="0" width="${w}" height="3" fill="url(#topline)"/>`;
  };
  const fgOf = (hasPhoto) => hasPhoto ? "#ffffff" : T.fg;
  const subOf = (hasPhoto) => hasPhoto ? "#e2ddea" : T.sub;
  const accOf = (hasPhoto) => hasPhoto ? "#d9b3ff" : T.accent;
  const chipFgOf = (hasPhoto) => hasPhoto ? "#efe4fc" : T.chipFg;
  const chipLineOf = (hasPhoto) => hasPhoto ? "rgba(239,228,252,0.55)" : T.chipLine;
  const chip = (x, y, fs, hasPhoto, anchor = "start") => {
    if (!eyebrow) return "";
    const txt = eyebrow.toUpperCase();
    const wPix = Math.round(txt.length * fs * 0.72) + Math.round(fs * 2.4);
    const hPix = Math.round(fs * 2.15);
    const rx = anchor === "middle" ? x - wPix / 2 : x;
    return `<rect x="${rx}" y="${y - hPix / 2}" rx="${hPix / 2}" width="${wPix}" height="${hPix}" fill="none" stroke="${chipLineOf(hasPhoto)}" stroke-width="1.1"/>
<text x="${rx + wPix / 2}" y="${y + fs * 0.36}" font-family="${SANS}" font-size="${fs}" font-weight="bold" letter-spacing="${fs * 0.14}" fill="${chipFgOf(hasPhoto)}" text-anchor="middle">${esc(txt)}</text>`;
  };
  const headlineSvg = (lines, x, y0, fs, lh, hasPhoto, anchor = "start") => {
    const segs = splitAccent(lines);
    return segs.map((s, i) => {
      const acc = s.accent != null ? `<tspan fill="${accOf(hasPhoto)}"${isSerif ? ' font-style="italic"' : ""}>${esc(s.accent)}</tspan>` : "";
      return `<text x="${x}" y="${y0 + i * lh}" font-family="${T.font}" font-size="${fs}" font-weight="bold" fill="${fgOf(hasPhoto)}" text-anchor="${anchor}" letter-spacing="${isSerif ? 0 : -fs * 0.018}">${esc(s.text)}${acc}</text>`;
    }).join("\n");
  };
  const subSvg = (lines, x, y0, fs, lh, hasPhoto, anchor = "start") => lines.map((ln, i) => `<text x="${x}" y="${y0 + i * lh}" font-family="${SANS}" font-size="${fs}" fill="${subOf(hasPhoto)}" text-anchor="${anchor}">${esc(ln)}</text>`).join("\n");
  const ctaSvg = (x, y, fs, centered = false) => {
    const label = `${cta}  \u2192`;
    const wPix = Math.max(100, sansW(label, fs) + Math.round(fs * 2.2));
    const hPix = Math.round(fs * 2.65);
    const rx = centered ? x - wPix / 2 : x;
    return `<rect x="${rx}" y="${y - hPix / 2}" rx="${hPix / 2}" width="${wPix}" height="${hPix}" fill="${T.ctaBg}"/>
<text x="${rx + wPix / 2}" y="${y + fs * 0.36}" font-family="${SANS}" font-size="${fs}" font-weight="bold" fill="${T.ctaFg}" text-anchor="middle">${esc(label)}</text>`;
  };
  const brand = (x, y, fs, hasPhoto, anchor = "start") => {
    if (anchor === "middle") {
      const total = fs * 0.9 + sansW("DigiHome", fs);
      const sx = x - total / 2;
      return `<circle cx="${sx + fs * 0.38}" cy="${y - fs * 0.33}" r="${fs * 0.36}" fill="${accOf(hasPhoto)}"/>
<text x="${sx + fs * 0.95}" y="${y}" font-family="${SANS}" font-size="${fs}" font-weight="bold" fill="${fgOf(hasPhoto)}">DigiHome</text>`;
    }
    return `<circle cx="${x + fs * 0.38}" cy="${y - fs * 0.33}" r="${fs * 0.36}" fill="${accOf(hasPhoto)}"/>
<text x="${x + fs * 0.95}" y="${y}" font-family="${SANS}" font-size="${fs}" font-weight="bold" fill="${fgOf(hasPhoto)}">DigiHome</text>`;
  };
  const metaSvg = (x, y, fs, hasPhoto, anchor = "start") => `<text x="${x}" y="${y}" font-family="${SANS}" font-size="${fs}" fill="${subOf(hasPhoto)}" text-anchor="${anchor}">digihome.no  \xB7  Gratis  \xB7  60 sek</text>`;
  const buildSvg = (f, hasPhoto) => {
    const { w, h, key } = f;
    const open = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${defs(w, h, hasPhoto)}${hasPhoto ? decorPhoto(w, h) : decor(w, h, false)}`;
    const close = "</svg>";
    if (key === "board") {
      const hl = wrap(headline, 19, 2);
      const sl = wrap(subtext, 40, 1);
      const hlY = 88, lh = isSerif ? 29 : 28;
      return open + chip(20, 34, 8.5, hasPhoto) + headlineSvg(hl, 20, hlY, isSerif ? 24 : 23, lh, hasPhoto) + subSvg(sl, 20, hlY + hl.length * lh - 8, 12.5, 17, hasPhoto) + ctaSvg(20, h - 42, 12.5) + metaSvg(w - 16, h - 15, 9, hasPhoto, "end") + close;
    }
    if (key === "board_xl") {
      const hl = wrap(headline, 17, 3);
      const sl = wrap(subtext, 36, 2);
      const hlY = 128, lh = isSerif ? 33 : 32;
      return open + brand(20, 42, 14.5, hasPhoto) + chip(20, 76, 8.5, hasPhoto) + headlineSvg(hl, 20, hlY, isSerif ? 27 : 26, lh, hasPhoto) + subSvg(sl, 20, hlY + hl.length * lh + 2, 13, 18.5, hasPhoto) + ctaSvg(20, h - 56, 13.5) + metaSvg(20, h - 18, 9.5, hasPhoto) + close;
    }
    if (key === "netboard") {
      const hl = wrap(headline, 21, 3);
      const sl = wrap(subtext, 46, 2);
      const hlY = 152, lh = isSerif ? 47 : 46;
      return open + brand(34, 52, 17, hasPhoto) + chip(w - 34 - (eyebrow ? Math.round(eyebrow.length * 9 * 0.72) + 22 : 0), 46, 9, hasPhoto) + headlineSvg(hl, 34, hlY, isSerif ? 40 : 38, lh, hasPhoto) + subSvg(sl, 34, hlY + hl.length * lh + 4, 16.5, 23, hasPhoto) + ctaSvg(34, h - 52, 15.5) + metaSvg(w - 30, h - 24, 11, hasPhoto, "end") + close;
    }
    if (key === "fullskjerm") {
      const hl = wrap(headline, 15, 4);
      const sl = wrap(subtext, 30, 3);
      const lh = isSerif ? 104 : 100;
      const hlY = Math.round(h * 0.335);
      const subY = hlY + hl.length * lh + 30;
      const ctaY = subY + sl.length * 48 + 90;
      return open + brand(w / 2, 190, 40, hasPhoto, "middle") + chip(w / 2, 292, 17, hasPhoto, "middle") + headlineSvg(hl, w / 2, hlY, isSerif ? 90 : 86, lh, hasPhoto, "middle") + subSvg(sl, w / 2, subY, 34, 48, hasPhoto, "middle") + ctaSvg(w / 2, ctaY, 30, true) + metaSvg(w / 2, h - 96, 22, hasPhoto, "middle") + close;
    }
    if (key === "hestesko_topp") {
      const one = wrap(headline, 58, 1)[0] || headline;
      const fs = one.length > 40 ? 24 : 29;
      const sl = wrap(subtext, 78, 1);
      return open + brand(34, h / 2 + 7, 18, hasPhoto) + `<line x1="182" y1="${h * 0.22}" x2="182" y2="${h * 0.78}" stroke="${T.kind === "light" ? "rgba(23,19,16,0.18)" : "rgba(255,255,255,0.16)"}" stroke-width="1"/>` + headlineSvg([one], 214, h / 2 - (sl.length ? 6 : -9), fs, fs + 4, hasPhoto) + (sl.length ? subSvg(sl, 214, h / 2 + 30, 13.5, 18, hasPhoto) : "") + ctaSvg(w - 34 - Math.max(100, sansW(`${cta}  \u2192`, 15) + 33), h / 2, 15) + close;
    }
    if (key === "hestesko_side") {
      const hl = wrap(headline, 11, 5);
      const sl = wrap(subtext, 17, 3);
      const lh = isSerif ? 27 : 26;
      return open + brand(w / 2, 66, 15, hasPhoto, "middle") + `<rect x="${w / 2 - 14}" y="92" width="28" height="2.5" fill="${T.accent}" opacity="0.8"/>` + headlineSvg(hl, w / 2, 190, isSerif ? 21 : 20, lh, hasPhoto, "middle") + subSvg(sl, w / 2, 190 + hl.length * lh + 14, 11.5, 16, hasPhoto, "middle") + ctaSvg(w / 2, h - 96, 12.5, true) + `<text x="${w / 2}" y="${h - 30}" font-family="${SANS}" font-size="10" fill="${subOf(hasPhoto)}" text-anchor="middle">digihome.no</text>` + close;
    }
    if (key === "wallpaper_bakgrunn") {
      const one = wrap(headline, 44, 1)[0] || headline;
      return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${defs(w, h, false)}
<rect width="${w}" height="${h}" fill="${T.bg}"/>
<ellipse cx="${w * 0.08}" cy="${h * 0.1}" rx="${w * 0.42}" ry="${w * 0.42}" fill="url(#orb1)"/>
<ellipse cx="${w * 0.95}" cy="${h * 0.92}" rx="${w * 0.38}" ry="${w * 0.38}" fill="url(#orb2)"/>
<rect width="${w}" height="${h}" fill="url(#dots)"/>
<circle cx="${w * 0.86}" cy="${h * 0.18}" r="${h * 0.16}" fill="none" stroke="${T.kind === "accent" ? T.accent2 : T.accent}" stroke-opacity="0.25" stroke-width="2"/>
<circle cx="${w * 0.12}" cy="${h * 0.86}" r="${h * 0.1}" fill="none" stroke="${T.kind === "accent" ? T.accent2 : T.accent}" stroke-opacity="0.18" stroke-width="2"/>
<rect x="0" y="0" width="${w}" height="4" fill="url(#topline)"/>
${brand(96, 132, 32, false)}
${chip(96, 196, 13, false)}
<text x="96" y="${h - 88}" font-family="${SANS}" font-size="24" fill="${T.sub}">digihome.no \u2014 utleieforvaltning i Bergen</text>
<text x="${w - 96}" y="${h - 88}" font-family="${T.font}" font-size="30" font-weight="bold" fill="${T.fg}" text-anchor="end">${esc(one)}</text>
</svg>`;
    }
    return open + close;
  };
  const decorPhoto = (w, h) => `<rect width="${w}" height="${h}" fill="url(#scrim)"/><rect width="${w}" height="${h}" fill="url(#dots)"/><rect x="0" y="0" width="${w}" height="3" fill="url(#topline)"/>`;
  const banners = [];
  for (const f of list) {
    const usePhoto = !!(imgBuf && f.photoOk);
    const svg = buildSvg(f, usePhoto);
    let buf;
    let type;
    if (usePhoto) {
      const photo = await sharp(imgBuf).resize(f.w, f.h, { fit: "cover" }).modulate({ saturation: 0.94 }).toBuffer();
      buf = await sharp(photo).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      type = "jpeg";
      if (buf.length > f.maxKb * 1024) buf = await sharp(photo).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 62, mozjpeg: true }).toBuffer();
    } else {
      buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
      type = "png";
      if (buf.length > f.maxKb * 1024) {
        buf = await sharp(Buffer.from(svg)).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
        type = "jpeg";
      }
    }
    banners.push({
      key: f.key,
      label: f.label,
      w: f.w,
      h: f.h,
      maxKb: f.maxKb,
      group: f.group,
      bytes: buf.length,
      type,
      dataUrl: `data:image/${type};base64,${buf.toString("base64")}`
    });
  }
  return banners;
}
export {
  FINN_FORMATS,
  FINN_THEMES,
  renderFinnBanners
};
