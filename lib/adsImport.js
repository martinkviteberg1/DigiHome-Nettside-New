// Parser for Google Ads kampanjerapport-eksport (CSV).
// Tolerant mot Googles eksportformat (preamble + sitering + komma/tab,
// norsk/engelsk tallformat og kolonnenavn). Brukes server-side i route.js.

// Del en CSV-linje i celler (RFC-aktig: håndterer sitering + escaped ").
function splitCsvLine(line, delim) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { q = false; }
      } else { cur += ch; }
    } else if (ch === '"') {
      q = true;
    } else if (ch === delim) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.replace(/\u00a0/g, ' ').trim());
}

// Tolk tall i norsk ("1 234,56" / "1.234,56") eller engelsk ("1,234.56") format.
export function parseNum(raw) {
  if (raw === null || raw === undefined) return 0;
  let s = String(raw).replace(/\u00a0/g, '').replace(/[^\d.,-]/g, '').trim();
  if (!s || s === '-' || s === '--') return 0;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.'); // EU: punktum = tusen, komma = desimal
    } else {
      s = s.replace(/,/g, ''); // US: komma = tusen
    }
  } else if (hasComma) {
    s = s.replace(/,/g, '.'); // kun komma → desimal (norsk)
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

const norm = (s) => String(s || '').toLowerCase().replace(/[._]/g, '').trim();

// Finn kolonneindeks via eksakt match først, deretter regex.
function findCol(headers, exact, re) {
  for (let i = 0; i < headers.length; i++) {
    if (exact.includes(norm(headers[i]))) return i;
  }
  for (let i = 0; i < headers.length; i++) {
    if (re.test(headers[i])) return i;
  }
  return -1;
}

// Hent datoperiode fra preamble (f.eks. "Mar 1, 2026-Mar 31, 2026" eller "2026-03-01 - 2026-03-31").
function extractPeriod(text) {
  const iso = text.match(/(\d{4}-\d{2}-\d{2})\s*[-–]\s*(\d{4}-\d{2}-\d{2})/);
  if (iso) {
    return { from: `${iso[1]}T00:00:00.000Z`, to: `${iso[2]}T23:59:59.999Z`, label: `${iso[1]} – ${iso[2]}` };
  }
  return null;
}

// Hovedparser. Returnerer {ok, error?, currency, periodFrom, periodTo, label, campaigns[], totals}.
export function parseGoogleAdsCsv(text) {
  if (!text || typeof text !== 'string') return { ok: false, error: 'Tom fil' };
  const period = extractPeriod(text.slice(0, 400));
  const rawLines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  if (!rawLines.length) return { ok: false, error: 'Ingen rader funnet' };

  // Finn header-linjen (inneholder en "Campaign/Kampanje"-celle).
  let headerIdx = -1;
  let delim = ',';
  for (let i = 0; i < Math.min(rawLines.length, 12); i++) {
    const commaCells = splitCsvLine(rawLines[i], ',');
    const tabCells = splitCsvLine(rawLines[i], '\t');
    const cells = tabCells.length > commaCells.length ? tabCells : commaCells;
    const d = tabCells.length > commaCells.length ? '\t' : ',';
    if (cells.some((c) => ['campaign', 'kampanje'].includes(norm(c)))) {
      headerIdx = i; delim = d; break;
    }
  }
  if (headerIdx === -1) return { ok: false, error: 'Fant ingen "Campaign/Kampanje"-kolonne. Last ned kampanjerapporten fra Google Ads (Kampanjer → Last ned → CSV).' };

  const headers = splitCsvLine(rawLines[headerIdx], delim);
  const ci = {
    name: findCol(headers, ['campaign', 'kampanje'], /campaign|kampanje/i),
    impr: findCol(headers, ['impr', 'impressions', 'visninger', 'eksponeringer'], /^impr|impress|visning|eksponer/i),
    clicks: findCol(headers, ['clicks', 'klikk'], /click|klikk/i),
    cost: findCol(headers, ['cost', 'kostnad', 'forbruk'], /^cost|kostnad|forbruk|spend/i),
    conv: findCol(headers, ['conversions', 'conv', 'konverteringer', 'konv'], /^conv|konver/i),
    currency: findCol(headers, ['currency', 'currencycode', 'valuta', 'valutakode'], /currency|valuta/i),
  };
  if (ci.name === -1 || ci.cost === -1) {
    return { ok: false, error: 'Fant ikke nødvendige kolonner (Campaign + Cost/Kostnad).' };
  }

  const campaigns = [];
  let currency = '';
  let totalRow = null;
  for (let i = headerIdx + 1; i < rawLines.length; i++) {
    const cells = splitCsvLine(rawLines[i], delim);
    if (!cells.length) continue;
    const name = (cells[ci.name] || '').trim();
    const low = norm(name);
    if (low.startsWith('total') || low.startsWith('totalt') || low.startsWith('sum')) {
      totalRow = cells; continue;
    }
    if (!name) continue;
    if (ci.currency > -1 && !currency) currency = (cells[ci.currency] || '').trim().toUpperCase().slice(0, 3);
    campaigns.push({
      name,
      impressions: ci.impr > -1 ? Math.round(parseNum(cells[ci.impr])) : 0,
      clicks: ci.clicks > -1 ? Math.round(parseNum(cells[ci.clicks])) : 0,
      cost: ci.cost > -1 ? Math.round(parseNum(cells[ci.cost]) * 100) / 100 : 0,
      conversions: ci.conv > -1 ? Math.round(parseNum(cells[ci.conv]) * 100) / 100 : 0,
    });
  }

  if (!campaigns.length) return { ok: false, error: 'Ingen kampanjerader funnet under header.' };

  // Totaler: bruk Total-raden hvis den finnes, ellers summer.
  let totals;
  if (totalRow) {
    totals = {
      impressions: ci.impr > -1 ? Math.round(parseNum(totalRow[ci.impr])) : 0,
      clicks: ci.clicks > -1 ? Math.round(parseNum(totalRow[ci.clicks])) : 0,
      cost: ci.cost > -1 ? Math.round(parseNum(totalRow[ci.cost]) * 100) / 100 : 0,
      conversions: ci.conv > -1 ? Math.round(parseNum(totalRow[ci.conv]) * 100) / 100 : 0,
    };
  } else {
    totals = campaigns.reduce((a, c) => ({
      impressions: a.impressions + c.impressions,
      clicks: a.clicks + c.clicks,
      cost: Math.round((a.cost + c.cost) * 100) / 100,
      conversions: Math.round((a.conversions + c.conversions) * 100) / 100,
    }), { impressions: 0, clicks: 0, cost: 0, conversions: 0 });
  }

  return {
    ok: true,
    currency: currency || 'NOK',
    periodFrom: period ? period.from : null,
    periodTo: period ? period.to : null,
    label: period ? period.label : null,
    campaigns,
    totals,
  };
}
