#!/usr/bin/env python3
# Dybdeanalyse: prod-leads × annonseperformance (alle datasett i /tmp/analyse)
import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

L = json.load(open('/tmp/analyse/leads.json'))
leads = L.get('leads') or []
tenants = L.get('tenants') or []
now = datetime.now(timezone.utc)


def parse(iso):
    try:
        return datetime.fromisoformat(str(iso).replace('Z', '+00:00'))
    except Exception:
        return None

print('══════════ LEADS-GRUNNLAG (prod) ══════════')
print('Huseier-leads:', len(leads), '· Leietaker-leads:', len(tenants))
dates = [parse(l.get('createdAt')) for l in leads]
dates = [d for d in dates if d]
if dates:
    print('Periode:', min(dates).date(), '→', max(dates).date())

for wd, label in [(7, 'siste 7d'), (30, 'siste 30d'), (90, 'siste 90d')]:
    cut = now - timedelta(days=wd)
    n = sum(1 for d in dates if d >= cut)
    print(f'  {label}: {n} leads ({n/wd:.2f}/dag)')

print()
print('── Status-fordeling (pipeline):')
print(dict(Counter((l.get('status') or 'new') for l in leads)))
print('── funnelStage (mid-funnel fra CRM):')
print(dict(Counter(l.get('funnelStage') for l in leads if l.get('funnelStage'))))
print('── lead_type:', dict(Counter(l.get('lead_type') for l in leads)))
print('── tier (modellvalg):', dict(Counter(str(l.get('tier')) for l in leads)))
print('── source:', dict(Counter(l.get('source') for l in leads)))
print('── lead_source_type:', dict(Counter(l.get('lead_source_type') or 'ukjent' for l in leads)))
print('── is_paid:', dict(Counter(str(l.get('is_paid')) for l in leads)))
print('── forwarded til CRM:', dict(Counter(str(l.get('forwarded')) for l in leads)))

won = [l for l in leads if (l.get('status') == 'won')]
print('── WON:', len(won), '· wonValue-sum:', sum((l.get('wonValue') or l.get('won_value') or 0) for l in leads))
for l in won:
    print('   •', l.get('createdAt', '')[:10], l.get('source'), '· verdi:', l.get('wonValue') or l.get('won_value'))

print()
print('── Attribusjon (leads med attribution-objekt):')
for l in leads:
    a = l.get('attribution')
    if a:
        print(f"   • {l.get('createdAt','')[:10]} status={l.get('status')} kanal={a.get('channel')} src={a.get('source')}/{a.get('medium')} kampanje={a.get('campaign') or '-'} annonse={a.get('content') or '-'} lp={a.get('landing_page') or '-'} enhet={a.get('device') or '-'} gclid={'ja' if a.get('gclid') else 'nei'}")

print()
print('── Ukestrend (leads per uke, siste 12 uker):')
wk = Counter()
for d in dates:
    if d >= now - timedelta(weeks=12):
        wk[d.strftime('%G-U%V')] += 1
for k in sorted(wk):
    print(f'   {k}: {"█" * wk[k]} {wk[k]}')

print()
print('── Måned-for-måned (alle):')
mo = Counter(d.strftime('%Y-%m') for d in dates)
for k in sorted(mo):
    print(f'   {k}: {mo[k]}')

# Tid til kontakt (statusHistory)
resp = []
for l in leads:
    h = l.get('statusHistory') or []
    c = next((parse(x.get('at')) for x in h if x.get('status') == 'contacted'), None)
    cr = parse(l.get('createdAt'))
    if c and cr:
        resp.append((c - cr).total_seconds() / 3600)
if resp:
    resp.sort()
    print(f'── Tid til kontakt: median {resp[len(resp)//2]:.1f}t · snitt {sum(resp)/len(resp):.1f}t · n={len(resp)}')
else:
    print('── Tid til kontakt: ingen statusHistory med contacted funnet')

print()
print('══════════ KRYSSANALYSE: LEADS × ANNONSER ══════════')
o90 = json.load(open('/tmp/analyse/ads_overview_90.json'))
o30 = json.load(open('/tmp/analyse/ads_overview_30.json'))
for tag, o in [('30d', o30), ('90d', o90)]:
    c = o.get('combined') or {}
    meta = (o.get('meta') or {}).get('totals') or {}
    eco = (o.get('economics') or {}).get('totals') or {}
    cut = now - timedelta(days=30 if tag == '30d' else 90)
    real = [l for l in leads if (parse(l.get('createdAt')) or now) >= cut]
    paid = [l for l in real if l.get('is_paid')]
    print(f'[{tag}] Forbruk: {c.get("cost",0):,.0f} kr (Meta {meta.get("cost",0):,.0f} + Google {eco.get("cost",0):,.0f})')
    print(f'   Plattform-rapporterte leads: {c.get("leads")} (Meta pixel {meta.get("leads")}, Google conv {eco.get("googleConversions")})')
    print(f'   FAKTISKE innkomne leads (prod-DB): {len(real)} totalt · {len(paid)} merket betalt')
    if real:
        print(f'   Ekte blandet CPL (all spend / alle leads): {c.get("cost",0)/len(real):,.0f} kr')
    if paid:
        print(f'   Ekte betalt-CPL (all spend / betalte leads): {c.get("cost",0)/len(paid):,.0f} kr')

print()
print('── Meta-annonser 90d (topp 8 etter forbruk):')
t = json.load(open('/tmp/analyse/ads_table.json'))
rows = sorted(t.get('ads') or [], key=lambda r: -(r.get('cost') or 0))
for r in rows[:8]:
    print(f"   {r.get('cost',0):>8,.0f} kr · {r.get('clicks',0):>4} klikk · conv={r.get('conversions',0)} · CTR {r.get('ctr',0):.2f}% · frekv {r.get('frequency') or '-'} · {r.get('status')} · {r.get('name','')[:60]}")
act = [r for r in rows if r.get('status') == 'ACTIVE']
print(f'   Aktive annonser: {len(act)} av {len(rows)}')
