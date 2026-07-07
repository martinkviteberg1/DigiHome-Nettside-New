#!/usr/bin/env python3
"""
Backend test for GET /api/admin/analytics with NEW `paid` feature (paid funnel per channel).
Tests the EXTENDED endpoint as requested in review_request.

Base URL: NEXT_PUBLIC_BASE_URL from .env + /api
Admin key: dh_admin_b3Kx92Qz7Lm4 (?key=)

NEW FEATURE: response now includes `paid` (paid funnel per channel) alongside existing 
traffic/leads/webVitals/anomalies/funnels.

Expected `paid` shape:
{ 
  days, 
  from, 
  stages:[...], 
  metaNote, 
  channels: [
    { key:'google', label:'Google Ads', adClicks:number, spend:number, sessions, formPage, 
      start, step2, step3, submit, leads, qualified, won, wonValue, cpl, costPerSession, 
      clickToSession },
    { key:'meta', label:'Meta', ... same ... },
    { key:'other', label:'Organisk / direkte / annet', adClicks:null, spend:null, cpl:null, ... }
  ]
}

TESTS:
1. GET /api/admin/analytics?key=...&days=30 → 200, has paid.channels array of exactly 3 
   (google, meta, other in that order). All stage fields numeric (>=0). google.adClicks>0 
   and google.spend>0 (real data exists), meta.adClicks>0 and meta.spend>0. 
   other.adClicks===null, other.spend===null, other.cpl===null.
2. Monotonic-ish sanity per channel: sessions >= formPage >= start >= step2 >= step3 >= submit 
   (each stage counts distinct sessions that reached it — later stages can never exceed earlier ones).
3. cpl calculation: for channels with spend and leads>0, cpl ≈ spend/leads (±0.05). 
   clickToSession ≈ sessions/adClicks*100 (±0.2).
4. days param: GET with days=7 → paid.days===7 and google/meta spend for 7d <= spend for 30d 
   (weaker: just assert numbers are >=0 and days echoes 7).
5. Regression: response still contains traffic, leads, webVitals, anomalies, funnels 
   (funnels.forms array). GET /api/health → 200. GET /api/admin/ads/table?key=...&googlePeriod=last_30d&metaPeriod=last_30d 
   → 200 ok:true with 30+ ads (both channels), and meta ads now have link populated 
   (at least 20 meta ads with non-empty link — new asset_feed_spec fallback).
6. Auth: /api/admin/analytics without key → 401.

CRITICAL SAFETY RULES:
- READ-ONLY. Do NOT POST/PUT/DELETE anything. Do NOT create leads (real emails fire). 
  Max ~8 GET requests total (endpoints hit real Meta/Google APIs via caches).
- Do not force refresh params.
"""

import sys
import time
import requests
import json

# Read base URL from .env
BASE_URL = None
try:
    with open('/app/.env', 'r') as f:
        for line in f:
            if line.startswith('NEXT_PUBLIC_BASE_URL='):
                BASE_URL = line.split('=', 1)[1].strip()
                break
except Exception as e:
    print(f"ERROR: Could not read .env file: {e}")
    sys.exit(1)

if not BASE_URL:
    print("ERROR: NEXT_PUBLIC_BASE_URL not found in .env")
    sys.exit(1)

API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

print(f"Testing against: {API_BASE}")
print(f"Admin key: {ADMIN_KEY}")
print("=" * 80)

test_results = []
total_tests = 0
passed_tests = 0

def test(name, condition, details=""):
    global total_tests, passed_tests
    total_tests += 1
    if condition:
        passed_tests += 1
        print(f"✅ TEST {total_tests}: {name}")
        if details:
            print(f"   {details}")
        test_results.append(f"✅ {name}")
        return True
    else:
        print(f"❌ TEST {total_tests}: {name}")
        if details:
            print(f"   {details}")
        test_results.append(f"❌ {name}")
        return False

print("\n" + "=" * 80)
print("TEST GROUP 1: BASIC STRUCTURE & CHANNELS (days=30)")
print("=" * 80)

try:
    start_time = time.time()
    r = requests.get(f"{API_BASE}/admin/analytics", params={"key": ADMIN_KEY, "days": 30}, timeout=60)
    elapsed = time.time() - start_time
    
    test("GET /api/admin/analytics?key=...&days=30 returns 200", 
         r.status_code == 200,
         f"Status: {r.status_code}, Time: {elapsed:.2f}s")
    
    if r.status_code != 200:
        print(f"Response: {r.text[:500]}")
        raise Exception(f"Expected 200, got {r.status_code}")
    
    data = r.json()
    analytics_30d = data  # Save for later comparison
    
    # Check that response has all required top-level fields
    test("Response has 'paid' field",
         'paid' in data,
         f"Keys in response: {list(data.keys())}")
    
    test("Response has 'traffic' field (regression)",
         'traffic' in data)
    
    test("Response has 'leads' field (regression)",
         'leads' in data)
    
    test("Response has 'webVitals' field (regression)",
         'webVitals' in data)
    
    test("Response has 'anomalies' field (regression)",
         'anomalies' in data)
    
    test("Response has 'funnels' field (regression)",
         'funnels' in data)
    
    if 'paid' not in data:
        print("ERROR: 'paid' field missing from response. Cannot continue with paid funnel tests.")
        print(f"Response keys: {list(data.keys())}")
        sys.exit(1)
    
    paid = data['paid']
    
    # Check paid structure
    test("paid.days === 30",
         paid.get('days') == 30,
         f"paid.days = {paid.get('days')}")
    
    test("paid.from is a date string",
         isinstance(paid.get('from'), str) and len(paid.get('from', '')) == 10,
         f"paid.from = {paid.get('from')}")
    
    test("paid.stages is an array",
         isinstance(paid.get('stages'), list),
         f"paid.stages = {paid.get('stages')}")
    
    test("paid.metaNote is a string",
         isinstance(paid.get('metaNote'), str) and len(paid.get('metaNote', '')) > 0,
         f"paid.metaNote length = {len(paid.get('metaNote', ''))}")
    
    test("paid.channels is an array",
         isinstance(paid.get('channels'), list),
         f"paid.channels type = {type(paid.get('channels'))}")
    
    channels = paid.get('channels', [])
    
    test("paid.channels has exactly 3 channels",
         len(channels) == 3,
         f"Length = {len(channels)}")
    
    if len(channels) != 3:
        print(f"ERROR: Expected 3 channels, got {len(channels)}")
        print(f"Channels: {json.dumps(channels, indent=2)}")
        sys.exit(1)
    
    # Check channel order and keys
    test("Channel 0 is 'google'",
         channels[0].get('key') == 'google',
         f"channels[0].key = {channels[0].get('key')}")
    
    test("Channel 1 is 'meta'",
         channels[1].get('key') == 'meta',
         f"channels[1].key = {channels[1].get('key')}")
    
    test("Channel 2 is 'other'",
         channels[2].get('key') == 'other',
         f"channels[2].key = {channels[2].get('key')}")
    
    # Check channel labels
    test("Google channel has label 'Google Ads'",
         channels[0].get('label') == 'Google Ads',
         f"channels[0].label = {channels[0].get('label')}")
    
    test("Meta channel has label 'Meta'",
         channels[1].get('label') == 'Meta',
         f"channels[1].label = {channels[1].get('label')}")
    
    test("Other channel has label 'Organisk / direkte / annet'",
         channels[2].get('label') == 'Organisk / direkte / annet',
         f"channels[2].label = {channels[2].get('label')}")
    
    print("\n" + "=" * 80)
    print("TEST GROUP 2: CHANNEL FIELDS & DATA TYPES")
    print("=" * 80)
    
    # Check all required fields exist and are correct types for each channel
    required_numeric_fields = ['sessions', 'formPage', 'start', 'step2', 'step3', 'submit', 
                                'leads', 'qualified', 'won', 'wonValue']
    
    for i, ch in enumerate(channels):
        ch_name = ch.get('key', f'channel_{i}')
        
        # Check all numeric fields are present and >= 0
        for field in required_numeric_fields:
            value = ch.get(field)
            test(f"{ch_name}.{field} is numeric and >= 0",
                 isinstance(value, (int, float)) and value >= 0,
                 f"{ch_name}.{field} = {value}")
    
    # Check google and meta have adClicks and spend (should be > 0 based on review_request)
    google = channels[0]
    meta = channels[1]
    other = channels[2]
    
    test("google.adClicks is numeric and > 0",
         isinstance(google.get('adClicks'), (int, float)) and google.get('adClicks', 0) > 0,
         f"google.adClicks = {google.get('adClicks')}")
    
    test("google.spend is numeric and > 0",
         isinstance(google.get('spend'), (int, float)) and google.get('spend', 0) > 0,
         f"google.spend = {google.get('spend')}")
    
    test("meta.adClicks is numeric and > 0",
         isinstance(meta.get('adClicks'), (int, float)) and meta.get('adClicks', 0) > 0,
         f"meta.adClicks = {meta.get('adClicks')}")
    
    test("meta.spend is numeric and > 0",
         isinstance(meta.get('spend'), (int, float)) and meta.get('spend', 0) > 0,
         f"meta.spend = {meta.get('spend')}")
    
    # Check other channel has null for adClicks, spend, cpl
    test("other.adClicks is null",
         other.get('adClicks') is None,
         f"other.adClicks = {other.get('adClicks')}")
    
    test("other.spend is null",
         other.get('spend') is None,
         f"other.spend = {other.get('spend')}")
    
    test("other.cpl is null",
         other.get('cpl') is None,
         f"other.cpl = {other.get('cpl')}")
    
    print("\n" + "=" * 80)
    print("TEST GROUP 3: MONOTONIC SANITY CHECKS (funnel stages)")
    print("=" * 80)
    
    # Check monotonic progression for each channel
    # sessions >= formPage >= start >= step2 >= step3 >= submit
    for ch in channels:
        ch_name = ch.get('key', 'unknown')
        sessions = ch.get('sessions', 0)
        formPage = ch.get('formPage', 0)
        start = ch.get('start', 0)
        step2 = ch.get('step2', 0)
        step3 = ch.get('step3', 0)
        submit = ch.get('submit', 0)
        
        test(f"{ch_name}: sessions >= formPage",
             sessions >= formPage,
             f"{sessions} >= {formPage}")
        
        test(f"{ch_name}: formPage >= start",
             formPage >= start,
             f"{formPage} >= {start}")
        
        test(f"{ch_name}: start >= step2",
             start >= step2,
             f"{start} >= {step2}")
        
        test(f"{ch_name}: step2 >= step3",
             step2 >= step3,
             f"{step2} >= {step3}")
        
        test(f"{ch_name}: step3 >= submit",
             step3 >= submit,
             f"{step3} >= {submit}")
    
    print("\n" + "=" * 80)
    print("TEST GROUP 4: CPL & CLICK-TO-SESSION CALCULATIONS")
    print("=" * 80)
    
    # Check CPL calculation for google and meta (if they have leads)
    for ch in [google, meta]:
        ch_name = ch.get('key', 'unknown')
        spend = ch.get('spend')
        leads = ch.get('leads', 0)
        cpl = ch.get('cpl')
        
        if spend is not None and spend > 0 and leads > 0:
            expected_cpl = spend / leads
            if cpl is not None:
                diff = abs(cpl - expected_cpl)
                test(f"{ch_name}: cpl ≈ spend/leads (±0.05)",
                     diff <= 0.05,
                     f"cpl={cpl}, expected={expected_cpl:.2f}, diff={diff:.4f}")
            else:
                test(f"{ch_name}: cpl should not be null when spend>0 and leads>0",
                     False,
                     f"cpl={cpl}, spend={spend}, leads={leads}")
        elif leads == 0:
            test(f"{ch_name}: cpl is null when leads=0",
                 cpl is None,
                 f"cpl={cpl}, leads={leads}")
    
    # Check clickToSession calculation
    for ch in [google, meta]:
        ch_name = ch.get('key', 'unknown')
        adClicks = ch.get('adClicks')
        sessions = ch.get('sessions', 0)
        clickToSession = ch.get('clickToSession')
        
        if adClicks is not None and adClicks > 0:
            expected_cts = (sessions / adClicks) * 100
            if clickToSession is not None:
                diff = abs(clickToSession - expected_cts)
                test(f"{ch_name}: clickToSession ≈ sessions/adClicks*100 (±0.2)",
                     diff <= 0.2,
                     f"clickToSession={clickToSession}, expected={expected_cts:.2f}, diff={diff:.4f}")
            else:
                # clickToSession can be null if sessions=0
                if sessions == 0:
                    test(f"{ch_name}: clickToSession can be null when sessions=0",
                         True,
                         f"clickToSession={clickToSession}, sessions={sessions}")
                else:
                    test(f"{ch_name}: clickToSession should not be null when adClicks>0 and sessions>0",
                         False,
                         f"clickToSession={clickToSession}, adClicks={adClicks}, sessions={sessions}")
    
    print("\n" + "=" * 80)
    print("TEST GROUP 5: DAYS PARAMETER (days=7)")
    print("=" * 80)
    
    start_time = time.time()
    r7 = requests.get(f"{API_BASE}/admin/analytics", params={"key": ADMIN_KEY, "days": 7}, timeout=60)
    elapsed = time.time() - start_time
    
    test("GET /api/admin/analytics?key=...&days=7 returns 200",
         r7.status_code == 200,
         f"Status: {r7.status_code}, Time: {elapsed:.2f}s")
    
    if r7.status_code == 200:
        data7 = r7.json()
        paid7 = data7.get('paid', {})
        
        test("paid.days === 7",
             paid7.get('days') == 7,
             f"paid.days = {paid7.get('days')}")
        
        channels7 = paid7.get('channels', [])
        if len(channels7) == 3:
            google7 = channels7[0]
            meta7 = channels7[1]
            
            # Check that 7d spend <= 30d spend (weaker check as requested)
            google_spend_7d = google7.get('spend', 0) or 0
            google_spend_30d = google.get('spend', 0) or 0
            test("google spend for 7d <= spend for 30d",
                 google_spend_7d <= google_spend_30d,
                 f"7d={google_spend_7d}, 30d={google_spend_30d}")
            
            meta_spend_7d = meta7.get('spend', 0) or 0
            meta_spend_30d = meta.get('spend', 0) or 0
            test("meta spend for 7d <= spend for 30d",
                 meta_spend_7d <= meta_spend_30d,
                 f"7d={meta_spend_7d}, 30d={meta_spend_30d}")
            
            # Check all numbers are >= 0
            test("google 7d: all numeric fields >= 0",
                 all(isinstance(google7.get(f), (int, float)) and google7.get(f, 0) >= 0 
                     for f in required_numeric_fields),
                 f"google 7d fields OK")
            
            test("meta 7d: all numeric fields >= 0",
                 all(isinstance(meta7.get(f), (int, float)) and meta7.get(f, 0) >= 0 
                     for f in required_numeric_fields),
                 f"meta 7d fields OK")
    
    print("\n" + "=" * 80)
    print("TEST GROUP 6: REGRESSION CHECKS")
    print("=" * 80)
    
    # Check funnels.forms array exists
    funnels = data.get('funnels', {})
    test("funnels.forms is an array",
         isinstance(funnels.get('forms'), list),
         f"funnels.forms type = {type(funnels.get('forms'))}")
    
    # Check /api/health
    start_time = time.time()
    rh = requests.get(f"{API_BASE}/health", timeout=30)
    elapsed = time.time() - start_time
    test("GET /api/health returns 200",
         rh.status_code == 200,
         f"Status: {rh.status_code}, Time: {elapsed:.2f}s")
    
    # Check /api/admin/ads/table
    start_time = time.time()
    rt = requests.get(f"{API_BASE}/admin/ads/table", 
                      params={"key": ADMIN_KEY, "googlePeriod": "last_30d", "metaPeriod": "last_30d"},
                      timeout=60)
    elapsed = time.time() - start_time
    
    test("GET /api/admin/ads/table returns 200",
         rt.status_code == 200,
         f"Status: {rt.status_code}, Time: {elapsed:.2f}s")
    
    if rt.status_code == 200:
        table_data = rt.json()
        test("ads/table response has ok:true",
             table_data.get('ok') == True,
             f"ok = {table_data.get('ok')}")
        
        ads = table_data.get('ads', [])
        test("ads/table has 30+ ads",
             len(ads) >= 30,
             f"Total ads = {len(ads)}")
        
        # Check meta ads have link populated (at least 20)
        meta_ads = [a for a in ads if a.get('channel') == 'meta']
        meta_ads_with_link = [a for a in meta_ads if a.get('link') and len(a.get('link', '')) > 0]
        test("At least 20 meta ads have non-empty link",
             len(meta_ads_with_link) >= 20,
             f"Meta ads with link = {len(meta_ads_with_link)} / {len(meta_ads)} total meta ads")
    
    print("\n" + "=" * 80)
    print("TEST GROUP 7: AUTHENTICATION")
    print("=" * 80)
    
    # Test without key
    start_time = time.time()
    rn = requests.get(f"{API_BASE}/admin/analytics", timeout=30)
    elapsed = time.time() - start_time
    
    test("GET /api/admin/analytics without key returns 401",
         rn.status_code == 401,
         f"Status: {rn.status_code}, Time: {elapsed:.2f}s")

except Exception as e:
    print(f"\n❌ EXCEPTION: {e}")
    import traceback
    traceback.print_exc()
    test_results.append(f"❌ Exception: {e}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"Total tests: {total_tests}")
print(f"Passed: {passed_tests}")
print(f"Failed: {total_tests - passed_tests}")
print(f"Success rate: {(passed_tests/total_tests*100):.1f}%")
print("=" * 80)

if passed_tests == total_tests:
    print("✅ ALL TESTS PASSED")
    sys.exit(0)
else:
    print(f"❌ {total_tests - passed_tests} TEST(S) FAILED")
    sys.exit(1)
