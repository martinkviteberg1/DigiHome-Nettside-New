// Sjekk at KPI-endepunktet leverer de nye detaljfeltene som modalen trenger.
const KEY = process.env.ADMIN_KEY || 'dh_admin_b3Kx92Qz7Lm4';
const BASE = process.env.BASE || 'http://localhost:3000';

const res = await fetch(`${BASE}/api/admin/kpi?key=${KEY}&days=90`);
const j = await res.json();
if (!j.ok) { console.error('FEIL', j); process.exit(1); }

const pick = (o) => JSON.stringify(o, null, 2);
console.log('period:', pick(j.period));
console.log('hero.ltvCac:', pick(j.hero?.ltvCac));
console.log('hero.ltvCacContracted:', pick(j.hero?.ltvCacContracted));
console.log('hero.timeToWin:', pick(j.hero?.timeToWin));
console.log('hero.conversionRate:', pick(j.hero?.conversionRate));
console.log('metrics.paybackMonths:', pick(j.metrics?.paybackMonths));
console.log('metrics.responseHours:', pick(j.metrics?.responseHours));
console.log('metrics.spend:', pick(j.metrics?.spend));
console.log('drill.wonInPeriodTotal:', j.drill?.wonInPeriodTotal, 'rows:', (j.drill?.wonInPeriod || []).length);
console.log('drill.wonInPeriod[0..2]:', pick((j.drill?.wonInPeriod || []).slice(0, 3)));
console.log('drill.campaigns:', pick((j.drill?.campaigns || []).slice(0, 3)));
console.log('revenueModel.tiers:', pick(j.revenueModel?.tiers));
console.log('revenueModel.ltv:', pick(j.revenueModel?.ltv));
console.log('revenueModel.breakdown.actual[0..2]:', pick((j.revenueModel?.breakdown?.actual || []).slice(0, 3)));
console.log('revenueModel.customers:', pick(j.revenueModel?.customers));
console.log('revenueModel.timing:', pick(j.revenueModel?.timing));
console.log('revenueModel.ramp:', pick(j.revenueModel?.ramp));
