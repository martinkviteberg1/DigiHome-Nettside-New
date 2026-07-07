#!/usr/bin/env python3
# FULLSTENDIG ADS-ANALYSE — produksjonsdata (leads + analytics fra digihome.no,
# annonsedata direkte fra Meta/Google API). Kun lesing av /tmp/analyse/*.json.
import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

now = datetime.now(timezone.utc)
def parse(iso):
    try: return datetime.fromisoformat(str(iso).replace('Z', '+00:00'))
    except Exception: return None
def f(n): return f"{n:,.0f}".replace(',', ' ')
def f2(n): return f"{n:,.2f}".replace(',', ' ')

L = json.load(open('/tmp/analyse/leads.json'))
leads = L.get('leads') or []
meta_daily = json.load(open('/tmp/analyse/meta_campaign_daily_90.json'))
meta_ads = json.load(open('/tmp/analyse/meta_ads_90.json'))
g_daily = json.load(open('/tmp/analyse/google_campaign_daily_90.json'))
terms = json.load(open('/tmp/analyse/google_terms_30.json'))
A30 = json.load(open('/tmp/analyse/analytics_30.json'))
A90 = json.load(open('/tmp/analyse/analytics_90.json'))

# ── Kanal-klassifisering av leads (samme logikk som Betalt trakt) ──
def lead_chan(l):
    a = l.get('attribution') or {}
    src = (a.get('source') or '').lower(); med = (a.get('medium') or '').lower()
    if a.get('gclid') or (src == 'google' and any(x in med for x in ('cpc','ppc','paid'))): return 'google_ads'
    if src in ('facebook','instagram','fb','ig','meta') and any(x in med for x in ('cpc','ppc','paid')): return 'meta_ads'
    if src in ('facebook','instagram','fb','ig','meta'): return 'fb_ig_organisk'
    ch = (a.get('channel') or '').lower()
    if 'organisk' in ch: return 'organisk_sok'
    if 'henvisning' in ch: return 'henvisning'
    if 'direkte' in ch or (not src and not a.get('referrer')): return 'direkte'
    return 'annet'

QUAL = {'qualified','viewing_booked','contract_sent','won'}
def is_qual(l): return (str(l.get('status') or '').lower() in QUAL) or (str(l.get('funnelStage') or '').lower() in QUAL)

print('═'*72); print('DEL 1 · LEADS-GRUNNLAG (PROD)'); print('═'*72)
dts = [d for d in (parse(l.get('createdAt')) for l in leads) if d]
print(f"Totalt {len(leads)} huseier-leads · periode {min(dts).date()} → {max(dts).date()}")
for wd in (7, 30, 90):
    cut = now - timedelta(days=wd)
    sub = [l for l in leads if (parse(l.get('createdAt')) or now) >= cut]
    ch = Counter(lead_chan(l) for l in sub)
    q = sum(1 for l in sub if is_qual(l)); w = sum(1 for l in sub if str(l.get('status')).lower()=='won')
    print(f"  siste {wd:2d}d: {len(sub):3d} leads · kval {q} · won {w} · kanaler: {dict(ch)}")

print(); print('═'*72); print('DEL 2 · FORBRUK & AVKASTNING PER KANAL'); print('═'*72)
def meta_window(days):
    cut = (now - timedelta(days=days)).date().isoformat()
    rows = [r for r in meta_daily if r.get('date_start','') >= cut]
    def act(r, t): return sum(int(a['value']) for a in (r.get('actions') or []) if a['action_type'] == t)
    return {
        'spend': sum(float(r.get('spend') or 0) for r in rows),
        'link_clicks': sum(int(r.get('inline_link_clicks') or 0) for r in rows),
        'lpv': sum(act(r, 'landing_page_view') for r in rows),
        'meta_leads': sum(act(r, 'lead') for r in rows),
    }
def g_window(days):
    cut = (now - timedelta(days=days)).date().isoformat()
    rows = [r for r in g_daily if (r.get('segments',{}).get('date','') >= cut)]
    m = lambda r, k: float(r.get('metrics',{}).get(k) or 0)
    return {
        'spend': sum(m(r,'costMicros') for r in rows)/1e6,
        'clicks': sum(m(r,'clicks') for r in rows),
        'conv': sum(m(r,'conversions') for r in rows),
    }
for wd in (7, 30, 90):
    cut = now - timedelta(days=wd)
    sub = [l for l in leads if (parse(l.get('createdAt')) or now) >= cut]
    ours = Counter(lead_chan(l) for l in sub)
    mq = sum(1 for l in sub if lead_chan(l)=='meta_ads' and is_qual(l))
    gq = sum(1 for l in sub if lead_chan(l)=='google_ads' and is_qual(l))
    M = meta_window(wd); G = g_window(wd)
    print(f"\n▶ SISTE {wd} DAGER")
    mcpl = M['spend']/ours['meta_ads'] if ours['meta_ads'] else None
    mcpl_meta = M['spend']/M['meta_leads'] if M['meta_leads'] else None
    print(f"  META : {f(M['spend'])} kr · {f(M['link_clicks'])} lenkeklikk · {f(M['lpv'])} landing-visn (Metas mål) · Meta-attribuert leads: {M['meta_leads']} · våre klikk-sporede: {ours['meta_ads']} (kval {mq})")
    print(f"         klikk→landing (Metas egne tall): {100*M['lpv']/M['link_clicks']:.0f}%  · CPL(vår): {f2(mcpl) if mcpl else '∞'} · CPL(Meta-attribuert): {f2(mcpl_meta) if mcpl_meta else '∞'}")
    gcpl = G['spend']/ours['google_ads'] if ours['google_ads'] else None
    print(f"  GOOGLE: {f(G['spend'])} kr · {f(G['clicks'])} klikk · Google-konv: {G['conv']:.1f} · våre klikk-sporede leads: {ours['google_ads']} (kval {gq}) · CPL(vår): {f2(gcpl) if gcpl else '∞'}")
    print(f"  ORGANISK/ANNET: {sum(v for k,v in ours.items() if k not in ('meta_ads','google_ads'))} leads gratis ({dict((k,v) for k,v in ours.items() if k not in ('meta_ads','google_ads'))})")

print(); print('═'*72); print('DEL 3 · META-KAMPANJER (90d)'); print('═'*72)
camp = defaultdict(lambda: {'spend':0,'lc':0,'lpv':0,'leads':0,'days':set()})
for r in meta_daily:
    c = camp[r.get('campaign_name','?')]
    c['spend'] += float(r.get('spend') or 0); c['lc'] += int(r.get('inline_link_clicks') or 0)
    for a in (r.get('actions') or []):
        if a['action_type']=='landing_page_view': c['lpv'] += int(a['value'])
        if a['action_type']=='lead': c['leads'] += int(a['value'])
    c['days'].add(r.get('date_start'))
for name, c in sorted(camp.items(), key=lambda x: -x[1]['spend']):
    lpvr = 100*c['lpv']/c['lc'] if c['lc'] else 0
    cpl = c['spend']/c['leads'] if c['leads'] else None
    print(f"  {name[:44]:46s} {f(c['spend']):>7s} kr · {c['lc']:4d} klikk · {c['lpv']:4d} LPV ({lpvr:3.0f}%) · {c['leads']} leads(Meta) · CPL {f2(cpl) if cpl else '—':>8s} · {len(c['days'])} aktive dager")

print(); print('── Meta annonse-nivå (90d, sortert på forbruk):')
for r in sorted(meta_ads, key=lambda x: -float(x.get('spend') or 0))[:10]:
    sp = float(r.get('spend') or 0); lc = int(r.get('inline_link_clicks') or 0)
    lds = sum(int(a['value']) for a in (r.get('actions') or []) if a['action_type']=='lead')
    lpv = sum(int(a['value']) for a in (r.get('actions') or []) if a['action_type']=='landing_page_view')
    print(f"  {r.get('ad_name','?')[:42]:44s} {f(sp):>7s} kr · {lc:4d} klikk · {lpv:4d} LPV · {lds} leads(Meta)")

print(); print('═'*72); print('DEL 4 · GOOGLE-KAMPANJER (90d)'); print('═'*72)
gc = defaultdict(lambda: {'spend':0,'clicks':0,'conv':0,'status':''})
for r in g_daily:
    c = gc[r.get('campaign',{}).get('name','?')]
    m = r.get('metrics',{})
    c['spend'] += float(m.get('costMicros') or 0)/1e6; c['clicks'] += float(m.get('clicks') or 0); c['conv'] += float(m.get('conversions') or 0)
    c['status'] = r.get('campaign',{}).get('status','')
for name, c in sorted(gc.items(), key=lambda x: -x[1]['spend']):
    cpl = c['spend']/c['conv'] if c['conv'] else None
    print(f"  [{c['status'][:7]:7s}] {name[:40]:42s} {f(c['spend']):>7s} kr · {c['clicks']:4.0f} klikk · {c['conv']:4.1f} konv · CPA {f2(cpl) if cpl else '—'}")

print(); print('═'*72); print('DEL 5 · GOOGLE SØKETERMER (30d) — hvor pengene går'); print('═'*72)
tot_cost = sum(float(t.get('metrics',{}).get('costMicros') or 0)/1e6 for t in terms)
waste = [t for t in terms if float(t.get('metrics',{}).get('conversions') or 0)==0 and float(t.get('metrics',{}).get('costMicros') or 0)>0]
waste_cost = sum(float(t.get('metrics',{}).get('costMicros') or 0)/1e6 for t in waste)
print(f"  {len(terms)} termer · {f(tot_cost)} kr · uten konvertering: {len(waste)} termer / {f(waste_cost)} kr ({100*waste_cost/tot_cost if tot_cost else 0:.0f}%)")
print('  Topp 12 på kostnad:')
for t in terms[:12]:
    m = t.get('metrics',{}); cost = float(m.get('costMicros') or 0)/1e6
    print(f"    {t.get('searchTermView',{}).get('searchTerm','?')[:45]:47s} {f2(cost):>8s} kr · {m.get('clicks','0'):>3s} klikk · konv {float(m.get('conversions') or 0):.1f}")

print(); print('═'*72); print('DEL 6 · PROD-TRAKT & TRAFIKK (fra digihome.no analytics)'); print('═'*72)
tr = A30.get('traffic', {})
print('  Kanaler (30d):', [(c.get('channel'), c.get('sessions')) for c in (tr.get('channels') or [])[:8]])
fn = A30.get('funnels', {})
for form in (fn.get('forms') or []):
    print(f"  Skjema «{form.get('form')}»: start {form.get('starts')} → sendt {form.get('submits')} ({form.get('completionRate')}%)")
    for s in (form.get('steps') or []): print(f"     {s.get('label')}: {s.get('count')}  (frafall {s.get('dropoff','—')}%)")
