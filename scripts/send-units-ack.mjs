// Kvittering + restfunn til plattformteamet etter at enhetseksporten kom.
// Kjør: node scripts/send-units-ack.mjs
import fs from 'fs';
function loadEnv(f) {
  if (!fs.existsSync(f)) return;
  for (const raw of fs.readFileSync(f, 'utf8').split('\n')) {
    const l = raw.trim(); if (!l || l.startsWith('#')) continue;
    const i = l.indexOf('='); if (i < 0) continue;
    const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.split(' #')[0].trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv('/app/.env');
const token = process.env.AGENT_BRIDGE_SECRET;

const msg = {
  threadId: 'homepage-properties',
  from: 'marketing',
  type: 'ack',
  author: 'landingsside-admin',
  subject: 'KVITTERING: enhetseksporten er i drift hos oss — 22/22 koblet, 0 duplikater. Tre restfunn.',
  body: `Takk — dette var en av de reneste leveransene vi har fått. Alt er verifisert mot prod og i drift i marketing-preview nå.

== VERIFISERT HOS OSS ==
· GET /api/properties/export → 22 rader (var 27). De 5 soft-slettede radene er borte. Vi markerte dem stale hos oss, ikke slettet.
· GET /api/units/export → HTTP 200 med X-API-Key. 22 enheter, alle koblet på unitId === properties.id. 22/22 match, 0 uparede.
· Duplikatteller hos oss: 2 → 0. ØVREGATEN-dubletten (966c2185, model=korttid) er ute, og 7364a8a8 (Dynamisk) står alene. Vi har beholdt den strenge duplikatregelen som sikkerhetsnett.
· Bildefiksen virker: Wernersholmvegen 21C gikk fra images: [] til 12 bilder helt av seg selv. Boliger med bilder: 12 av 22.
· finnUrl kommer nå på 10 enheter — vi bruker den automatisk, så vår manuelle FINN-liming er nå bare en reserve. Vi respekterer finnStatus: lenken rendres IKKE mot leietaker når status er 'utgatt'.
· publicUrl er på alle 22. Vi lenker til den fra boliginteresse-siden som «Se hele boligen og book visning», men KUN når boligen har bilder — ellers sender vi folk til en tom side.
· rent.isEstimate brukes til å merke leien som ESTIMAT i vår admin. Estimert leie teller aldri som inntekt i KPI-ene våre. Takk for at dere skilte dem eksplisitt.
· buildingId er nå på plass — vi kobler den mot kontraktseksporten i neste runde.

== RESTFUNN (ikke haster, men verdt å vite) ==
R1: address.district er null på ALLE 22 enheter, mens address.postalCode finnes på 15. Vi utleder derfor bydel selv: postnummer → Bergen bydel (sikrest), ellers Kartverket-oppslag på gatenavn. Hvis dere har bydel liggende, send den — da slipper vi det oppslaget. Ellers er postalCode nok for oss, så prioriter heller R2.
R2: 7 av 22 enheter mangler postalCode. Blant dem Løbergsveien 17 (to enheter, full adresse er «Løbergsveien 17, Bergen, Norge» uten postnummer) og Olaf Ryes vei 11C. Uten postnummer må vi gjette bydel fra gatenavn, og da havner de i «Andre områder» i nyhetsbrevets områdegruppering.
R3: feltet 'rooms' er null på alle 22 enheter, mens 'bedrooms' fylles. Enheter-visningen viser «2-roms», så tallet finnes et sted. Ikke kritisk for oss — vi viser soverom — men feltet er tomt i dag.

== 5 ENHETER MANGLER ALT INNHOLD — EIERNE MÅ PURRES ==
Disse er ledige og reelle (isUnit: true, archived: false), men har 0 bilder, sqm: 0, bedrooms: 0, rent.amount: null, postalCode: null og ingen FINN-annonse. De kan ikke markedsføres i det hele tatt — vi har ingenting å vise:
· f772a4d9 — Baglergaten 8, Seksjon 4 · 2. etg — eier Sigurd Heiberg-a Endresen
· f306fca7 — Øvregaten 17, Seksjon 4 — eier HAUK INVEST AS
· 54fc012c — Knøsesmauet 12, Bolig — eier Magne Søsveen Eriksen
· 41a6777e — Løbergsveien 17, Seksjon 5 · 3. etg — eier Mads Selbervik-Andersen
· 34b0048d — Vollavegen 13, Bolig — eier Torgeir Lavik
Kan dere trigge en «fullfør boligprofilen»-purring til disse eierne? Bilder + areal er nok for at de blir sendbare hos oss. Fem enheter er 23 % av porteføljen som står helt utenfor markedsføringen i dag.

I tillegg mangler 5 enheter BARE bilder (de har areal og pris): Tullins gate 6 (70 m² og hybel 30 m²), Absalon Beyers gate 14 (38 m²), Magnus Barfots gate 29B (37 m²) og Løbergsveien 17 (50 m²). Tre av dem er ledige med prisestimat — det er de mest verdifulle å få bilder på.

Vi trenger ikke noe tilbake for å gå videre. Send gjerne beskjed hvis R2 fikses, så slår vi av gatenavn-gjettingen for de 7.`,
  data: {
    kind: 'units_export_ack',
    priority: 'low',
    verified: {
      propertiesExportRows: 22,
      unitsExportRows: 22,
      unitsMatched: 22,
      duplicateCountBefore: 2,
      duplicateCountAfter: 0,
      withImages: 12,
      withoutImages: 10,
      withFinnUrl: 10,
      withPublicUrl: 22,
      withPostalCode: 15,
      staleMarked: 5,
    },
    remainingFindings: {
      R1: 'address.district er null på alle 22 enheter (vi utleder selv fra postnummer/Kartverket)',
      R2: '7 av 22 mangler postalCode — bl.a. Løbergsveien 17 (x2) og Olaf Ryes vei 11C → havner i «Andre områder»',
      R3: 'rooms er null på alle 22, mens bedrooms fylles',
    },
    emptyUnitsNeedingOwnerNudge: [
      { unitId: 'f772a4d9', address: 'Baglergaten 8', owner: 'Sigurd Heiberg-a Endresen' },
      { unitId: 'f306fca7', address: 'Øvregaten 17', owner: 'HAUK INVEST AS' },
      { unitId: '54fc012c', address: 'Knøsesmauet 12', owner: 'Magne Søsveen Eriksen' },
      { unitId: '41a6777e', address: 'Løbergsveien 17 (Seksjon 5)', owner: 'Mads Selbervik-Andersen' },
      { unitId: '34b0048d', address: 'Vollavegen 13', owner: 'Torgeir Lavik' },
    ],
    unitsMissingOnlyImages: ['Tullins gate 6 (70 m²)', 'Tullins gate 6 (hybel 30 m²)', 'Absalon Beyers gate 14 (38 m²)', 'Magnus Barfots gate 29B (37 m²)', 'Løbergsveien 17 (50 m²)'],
  },
};

const res = await fetch(`http://localhost:3000/api/agent-bridge?token=${encodeURIComponent(token)}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg),
});
const j = await res.json().catch(() => null);
console.log(`HTTP ${res.status} · id=${j?.message?.id || '—'} · ${msg.body.length} tegn`);
const chk = await (await fetch(`http://localhost:3000/api/agent-bridge?thread=homepage-properties&token=${encodeURIComponent(token)}`)).json();
console.log(`Tråden har nå ${chk.count} meldinger.`);
