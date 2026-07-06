#!/usr/bin/env python3
# Meta-dybdeanalyse mot PROD: dagsforbruk, per annonse, ekte leads, funnel.
import json
from collections import Counter
from datetime import datetime, timedelta, timezone

now = datetime.now(timezone.utc)
J = lambda f: json.load(open(f'/tmp/meta/{f}.json'))

def parse(iso):
    try:
        return datetime.fromisoformat(str(iso).replace('Z', '+00:00'))
    except Exception:
        return None

print('══════ 1. DAGSFORBRUK (siste 14 dager, fra 30d-serien) ══════')
ov30 = J('ov30')
series = ov30.get('series') or []
last14 = series[-14:]
for p in last14:
    bar = '█' * int((p.get('metaCost') or 0) / 60)
    print(f"  {p['date']}: Meta {p.get('metaCost',0):>7,.0f} kr · Google {p.get('googleCost',0):>5,.0f} kr · klikk {p.get('metaClicks',0):>3} · Meta-leads {p.get('metaLeads',0)} {bar}")
tot14 = sum((p.get('metaCost') or 0) for p in last14)
print(f'  SUM Meta 14d: {tot14:,.0f} kr ({tot14/14:,.0f} kr/dag snitt) · siste 3 dager: {sum((p.get("metaCost") or 0) for p in last14[-3:])/3:,.0f} kr/dag')

print()
print('══════ 2. META TOTALT ══════')
for tag in ['ov7', 'ov30']:
    m = (J(tag).get('meta') or {}).get('totals') or {}
    print(f"  [{tag[-2:].strip('v')}d] forbruk {m.get('cost',0):>9,.0f} kr · {m.get('clicks',0):>4} klikk · {m.get('impressions',0):>6} visn · CPC {m.get('avgCpc',0):.2f} · CTR {m.get('ctr',0):.2f}% · pixel-leads {m.get('leads',0)} · CPL {m.get('cpl') or 0:,.0f} kr")

print()
print('══════ 3. PER ANNONSE (siste 7 dager — der pengene går NÅ) ══════')
rows7 = sorted([r for r in J('table7').get('ads') or [] if (r.get('cost') or 0) > 0], key=lambda r: -(r.get('cost') or 0))
for r in rows7:
    lp = (r.get('link') or '').replace('https://digihome.no', '') or '(ingen lenke)'
    print(f"  {r.get('cost',0):>7,.0f} kr · {r.get('clicks',0):>3} klikk · CPC {r.get('cpc',0):>5.1f} · CTR {r.get('ctr',0):>4.2f}% · conv {r.get('conversions',0)} · frekv {r.get('frequency') or '-'} · {r.get('name','')[:52]}")
    print(f"           → {lp[:80]}")

print()
print('══════ 4. PER ANNONSE (30 dager) ══════')
rows30 = sorted([r for r in J('table30').get('ads') or [] if (r.get('cost') or 0) > 0], key=lambda r: -(r.get('cost') or 0))
for r in rows30:
    cpl = (r.get('cost') or 0) / r['conversions'] if r.get('conversions') else None
    print(f"  {r.get('cost',0):>7,.0f} kr · {r.get('clicks',0):>3} klikk · CTR {r.get('ctr',0):>4.2f}% · conv {r.get('conversions',0)} · {'CPL '+format(cpl,',.0f')+' kr' if cpl else 'CPL —':>12} · frekv {r.get('frequency') or '-'} · {r.get('name','')[:48]}")

print()
print('══════ 5. FAKTISKE LEADS I SAMME VINDU (prod-DB) ══════')
leads = J('leads').get('leads') or []
for wd in [7, 14, 30]:
    cut = now - timedelta(days=wd)
    w = [l for l in leads if (parse(l.get('createdAt')) or now - timedelta(days=999)) >= cut]
    paid = [l for l in w if l.get('is_paid')]
    meta_paid = [l for l in w if (l.get('attribution') or {}).get('source') == 'meta']
    print(f"  siste {wd}d: {len(w)} leads totalt · {len(paid)} betalt · {len(meta_paid)} fra Meta (attribusjon)")
print('  — Meta-attribuerte leads (detalj):')
for l in leads:
    a = l.get('attribution') or {}
    if a.get('source') == 'meta':
        print(f"    • {l.get('createdAt','')[:10]} · kampanje «{a.get('campaign')}» · annonse «{a.get('content')}» · status {l.get('status')}")

print()
print('══════ 6. TRAFIKK/FUNNEL siste 14d ══════')
an = J('analytics14')
t = (an.get('traffic') or {}).get('totals') or {}
print(f"  Økter {t.get('sessions')} · besøkende {t.get('visitors')} · leads {t.get('leads')} · konv.rate {t.get('conversionRate')}%")
ch = (an.get('traffic') or {}).get('channels') or []
for c in (ch if isinstance(ch, list) else [])[:8]:
    print('   kanal:', json.dumps(c, ensure_ascii=False)[:160])
for f in (an.get('funnels') or {}).get('forms') or []:
    print(f"  Skjema «{f.get('label')}»: {f.get('starts')} starter → {f.get('submits')} innsendt ({f.get('conversionRate')}%)")
    for s in f.get('steps') or []:
        print(f"    {s.get('label'):<22} {s.get('count'):>4} ({s.get('rate')}%)  frafall {s.get('dropoffRate')}%")
