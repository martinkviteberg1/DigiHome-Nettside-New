// Lager «Base 2026–2029»-planene (Digihome AS + Digihome Tech AS, koblet) via API.
// Kjør: node scripts/lag-base-planer.mjs <adminKey> [baseUrl]
// Idempotent på navn: sletter eksisterende planer med samme navn først.
const K = process.argv[2]; const B = (process.argv[3] || 'http://localhost:3000') + '/api';
if (!K) { console.error('Mangler adminKey'); process.exit(1); }
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t }; } };
const post = (url, body, method = 'PUT') => fetch(`${B}${url}${url.includes('?') ? '&' : '?'}key=${K}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const START = '2026-08'; const N = 36;
// Lønnstrapp grunnleggere: 0 i aug–sep 26, 30 k fra okt 26, 35 k fra jan 27, 40 k fra jan 28, 45 k fra jan 29
const LONN = [{ fraMnd: 3, brutto: 30000 }, { fraMnd: 6, brutto: 35000 }, { fraMnd: 18, brutto: 40000 }, { fraMnd: 30, brutto: 45000 }];

const DH_NAVN = 'Base 2026–2029 · Digihome AS';
const TECH_NAVN = 'Base 2026–2029 · Digihome Tech AS';

(async () => {
  // 0) fakta fra porteføljen
  const forslag = await j(await fetch(`${B}/admin/budsjett/plan/forslag?startYm=${START}&antallMnd=${N}&key=${K}`));
  if (!forslag.ok) throw new Error('forslag: ' + JSON.stringify(forslag));
  const serie = (a) => Array.from({ length: N }, (_, i) => Number(a?.[i]) || 0);
  const fakta = { eksisterende: serie(forslag.sikret), enheter: serie(forslag.enheterSerie), bortfall: serie(forslag.bortfall), oppdatertAt: new Date().toISOString() };
  const d0 = forslag.drivereBrukt || {};
  console.log('Portefølje i dag:', fakta.enheter[0], 'enheter ·', fakta.eksisterende[0], 'kr/mnd · snittleie', d0.snittLeie, '· honorar', d0.honorarPct, '% → ny enhet', d0.honorarNyEnhet, 'kr eks. mva');

  // 1) rydd: slett planer med samme navn (og gamle Tech «Plattform 2027–2028» + QA-plan)
  const liste = await j(await fetch(`${B}/admin/budsjett/planer?key=${K}`));
  for (const p of liste.planer || []) {
    if ([DH_NAVN, TECH_NAVN, 'Plattform 2027–2028', 'QA Deck DH (slettes)'].includes(p.navn)) {
      const r = await fetch(`${B}/admin/budsjett/plan?id=${p.id}&key=${K}`, { method: 'DELETE' });
      console.log('slettet', p.navn, r.status);
    }
  }

  // 2) Digihome AS — forvaltningsmotoren
  const dh = {
    navn: DH_NAVN, selskap: 'digihome', type: 'modell', startYm: START, antallMnd: N, status: 'utkast', investorSynlig: true,
    fakta,
    drivere: {
      // Kommersiell plan: 2 → 4 → 6 → 8 → 10 → 12 → 15 → 20 → 25 nye/mnd, 4 mnd per trinn
      nyePerMnd: 2,
      vekstplan: [[5, 4], [9, 6], [13, 8], [17, 10], [21, 12], [25, 15], [29, 20], [33, 25]].map(([fraMnd, perMnd]) => ({ fraMnd, perMnd })),
      aarligChurnPct: 5, reutleiePaa: true, reutleieGapMnd: 0,
      // Inntekt per ny enhet = faktisk prisliste × faktisk snittleie i porteføljen (≈ 1 840 kr eks. mva)
      snittleieNye: Math.round(d0.snittLeie || 21867), honorarPctNye: d0.honorarPct || 10.5, oppstartPerEnhet: 0,
      systemPerEnhet: 200,
      // Operativ bemanning: budsjettert trapp 30 % → 225 % ved 440+ enheter
      enheterPerAarsverk: 200, aarslonn: 700000, paslagPct: 35, maalUtnyttelsePct: 85,
      bemanningstrinn: [[0, 30], [55, 50], [90, 75], [140, 100], [190, 150], [280, 175], [360, 200], [440, 225]].map(([fraEnheter, prosent]) => ({ type: 'enheter', fraEnheter, prosent })),
      // Vekstkost i AS (der inntekten er): media-CAC 5 000 per betalt ny enhet + performance 8 % i 12 mnd. Ingen fast partner-fee.
      mfFast: 0, provisjonPerNyEnhet: 5000, organiskAndelPct: 0,
      partner: { paa: true, fastPerMnd: 0, honorarPct: 8, varighetMnd: 12, andelNyePct: 100, fraMnd: 1 },
      adminFast: 10000, andreFaste: 0,
      kostTrinn: { adminFast: [], andreFaste: [], mfFast: [] },
      grunnleggere: { paa: true, paslagPct: 35, personer: [
        { navn: 'Sarah', rolle: 'drift', andelPct: 70, trinn: LONN },
        { navn: 'Martin', rolle: 'drift', andelPct: 20, trinn: LONN },
      ] },
      skatt: { paa: true, satsPct: 22, konsernbidrag: false },
      indeksPct: 3, lonnsvekstPct: 3.5, kostInflasjonPct: 3,
    },
  };
  const rDh = await j(await post('/admin/budsjett/plan', dh));
  if (!rDh.id) throw new Error('DH: ' + JSON.stringify(rDh));
  console.log('DH-plan', rDh.id);

  // 3) Digihome Tech AS — lean AI-native produktselskap, koblet til DH (lisens 200 kr/enhet), ingen eksterne SaaS-kunder i base
  const tech = {
    navn: TECH_NAVN, selskap: 'tech', startYm: START, antallMnd: N, status: 'utkast', investorSynlig: true, kobletPlanId: rDh.id,
    tech: {
      huseier: { startEnheter: 0, organiskPerMnd: 0, annonsePerMnd: 0, vekstplan: [], modus: 'kunder', kunderPlan: [], cacPerEnhet: 2500, aarligChurnPct: 25, prisModell: 'pct', pris: 5, snittleie: 15000, oppstartPerEnhet: 0 },
      forvaltning: { pris: 200, kilde: 'plan', startEnheter: fakta.enheter[0], nyePerMnd: 0 },
      bedrift: { startSelskaper: 0, nyeSelskaperPerMnd: 0, enheterPerSelskap: 20, pris: 79, aarligChurnPct: 8, salgskostPerSelskap: 15000, fraMnd: 1 },
      kost: {
        utviklingFast: 30000,   // AI-native utvikling (Fable) — trinn under: 35 k fra jan 27, 40 k fra jan 28, 45 k fra jan 29
        hostingFast: 2500,      // Emergent + database, e-post/SMS, lagring, signering-abonnement — realistisk grunnlinje (ikke 250 kr)
        variabelPerEnhet: 40,   // 20 kr produksjons-AI + ~20 kr signering, kredittsjekk, SMS, kart per enhet/mnd (snitt alle grupper)
        supportTimerPer100: 0, timekost: 650, // kundene er Digihome AS’ — support ligger i forvaltningen
        andreFaste: 15000,      // 2 k AI fast + 4 k programvare + 6 k regnskap/juridisk + 3 k sikkerhet/reserve
        markedsforingFast: 0,
      },
      kostTrinn: { utviklingFast: [{ fraMnd: 6, belop: 35000 }, { fraMnd: 18, belop: 40000 }, { fraMnd: 30, belop: 45000 }], hostingFast: [], andreFaste: [], markedsforingFast: [] },
      partner: { paa: false, fastPerMnd: 0, honorarPct: 8, varighetMnd: 12, andelNyePct: 100, fraMnd: 1, gjelder: { huseier: true, bedrift: true, forvaltning: false } },
      grunnleggere: { paa: true, paslagPct: 35, personer: [
        { navn: 'Martin', rolle: 'rd', andelPct: 80, trinn: LONN },
        { navn: 'Sarah', rolle: 'sm', andelPct: 30, trinn: LONN },
      ] },
      justering: { prisIndeksPct: 3, kostInflasjonPct: 3 },
    },
  };
  const rT = await j(await post('/admin/budsjett/plan', tech));
  if (!rT.id) throw new Error('Tech: ' + JSON.stringify(rT));
  console.log('Tech-plan', rT.id);
  console.log(JSON.stringify({ dh: rDh.id, tech: rT.id }));
})().catch((e) => { console.error(e); process.exit(1); });
