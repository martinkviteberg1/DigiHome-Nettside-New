// Sjekk: blokkerer samtykkebanneret Meta-pixelen slik at sidevisninger tapes?
// Vi ser bare på koden — hvordan pixelen initialiseres og om den gates.
//   node scripts/analyse-consent-gating.mjs
import fs from 'fs';
import path from 'path';

const ROOTS = ['/app/app', '/app/components', '/app/lib'];
const HITS = [/fbq\(/, /consent/i, /samtykke/i, /cookie/i, /gtag\(/];
const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
    if (!/\.(js|jsx|ts|tsx)$/.test(e.name)) continue;
    files.push(p);
  }
};
for (const r of ROOTS) walk(r);

const report = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const re of HITS) {
    if (!re.test(src)) continue;
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i])) continue;
      const arr = report.get(f) || [];
      arr.push(`${i + 1}: ${lines[i].trim().slice(0, 160)}`);
      report.set(f, arr);
    }
  }
}
for (const [f, lines] of report) {
  console.log(`\n── ${f.replace('/app/', '')}`);
  for (const l of [...new Set(lines)].slice(0, 14)) console.log(`   ${l}`);
}
