#!/usr/bin/env python3
"""
Google Search Console Integration Testing
==========================================
Tests the NEW GSC integration endpoints with strict quota adherence.

CRITICAL QUOTA RULES (MUST FOLLOW):
- POST /api/admin/seo/gsc/inspect: MAX 3 calls total (quota 2000/day)
- GET /api/admin/seo/gsc/overview with &force=1: MAX 1 call (triggers 3 live Google API calls)
- WITHOUT force is cached and free
- DO NOT run POST /api/admin/seo/run with type 'rank' (SerpApi quota)
- DO NOT delete documents in gsc_cache or gsc_inspections

CONTEXT:
- Service account connected to sc-domain:digihome.no (permission siteFullUser)
- Property is NEWLY CREATED, so Search Analytics returns 0 rows/empty arrays (EXPECTED)
- URL Inspection works and returns real data
"""

import requests
import sys
import time

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Track API calls to enforce quota
inspect_calls = 0
overview_force_calls = 0

def test_auth_status_no_key():
    """TEST 1: GET /api/admin/seo/gsc/status without key → 401"""
    print("\n[TEST 1] AUTH: GET /api/admin/seo/gsc/status without key")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/gsc/status", timeout=30)
        if r.status_code == 401:
            print("✅ PASS: Returns 401 without key")
            return True
        else:
            print(f"❌ FAIL: Expected 401, got {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_status_with_key():
    """TEST 2: GET /api/admin/seo/gsc/status?key=... → 200 with correct structure"""
    print("\n[TEST 2] GET /api/admin/seo/gsc/status with key")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/gsc/status?key={ADMIN_KEY}", timeout=30)
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        print(f"Response: {data}")
        
        # Verify structure
        if not data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        if not data.get('configured'):
            print(f"❌ FAIL: configured is not true")
            return False
        
        if data.get('property') != 'sc-domain:digihome.no':
            print(f"❌ FAIL: property is not 'sc-domain:digihome.no', got: {data.get('property')}")
            return False
        
        if data.get('permission') != 'siteFullUser':
            print(f"❌ FAIL: permission is not 'siteFullUser', got: {data.get('permission')}")
            return False
        
        print("✅ PASS: Returns 200 {ok:true, configured:true, property:'sc-domain:digihome.no', permission:'siteFullUser'}")
        return True
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_overview_cached_28d():
    """TEST 3: GET /api/admin/seo/gsc/overview?key=...&days=28 → 200 with correct structure (cached)"""
    print("\n[TEST 3] GET /api/admin/seo/gsc/overview?key=...&days=28 (cached)")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/gsc/overview?key={ADMIN_KEY}&days=28", timeout=30)
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        print(f"Response keys: {list(data.keys())}")
        print(f"Property: {data.get('property')}, Days: {data.get('days')}")
        print(f"Range: {data.get('range')}, PrevRange: {data.get('prevRange')}")
        print(f"Totals: {data.get('totals')}")
        print(f"Cached: {data.get('cached')}")
        
        # Verify structure
        if not data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        if data.get('property') != 'sc-domain:digihome.no':
            print(f"❌ FAIL: property is not 'sc-domain:digihome.no'")
            return False
        
        if data.get('days') != 28:
            print(f"❌ FAIL: days is not 28, got: {data.get('days')}")
            return False
        
        # Verify range structure
        range_data = data.get('range', {})
        if not range_data.get('start') or not range_data.get('end'):
            print(f"❌ FAIL: range missing start or end")
            return False
        
        prev_range = data.get('prevRange', {})
        if not prev_range.get('start') or not prev_range.get('end'):
            print(f"❌ FAIL: prevRange missing start or end")
            return False
        
        # Verify totals structure (empty data is EXPECTED for new property)
        totals = data.get('totals', {})
        if totals.get('clicks') != 0:
            print(f"⚠️  WARNING: Expected clicks=0 for new property, got: {totals.get('clicks')}")
        if totals.get('impressions') != 0:
            print(f"⚠️  WARNING: Expected impressions=0 for new property, got: {totals.get('impressions')}")
        
        # Verify arrays exist (can be empty)
        if 'series' not in data or not isinstance(data['series'], list):
            print(f"❌ FAIL: series is not an array")
            return False
        
        if 'queries' not in data or not isinstance(data['queries'], list):
            print(f"❌ FAIL: queries is not an array")
            return False
        
        if 'pages' not in data or not isinstance(data['pages'], list):
            print(f"❌ FAIL: pages is not an array")
            return False
        
        if 'nearWins' not in data or not isinstance(data['nearWins'], list):
            print(f"❌ FAIL: nearWins is not an array")
            return False
        
        print(f"✅ PASS: Returns 200 with correct structure. Empty data is EXPECTED for new property.")
        print(f"   Series: {len(data['series'])} items, Queries: {len(data['queries'])} items, Pages: {len(data['pages'])} items, NearWins: {len(data['nearWins'])} items")
        return True
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_overview_7d():
    """TEST 4: GET /api/admin/seo/gsc/overview?key=...&days=7 → 200 with 7-day range"""
    print("\n[TEST 4] GET /api/admin/seo/gsc/overview?key=...&days=7")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/gsc/overview?key={ADMIN_KEY}&days=7", timeout=30)
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        
        if not data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        if data.get('days') != 7:
            print(f"❌ FAIL: days is not 7, got: {data.get('days')}")
            return False
        
        # Verify range spans 7 days
        range_data = data.get('range', {})
        start = range_data.get('start')
        end = range_data.get('end')
        
        if not start or not end:
            print(f"❌ FAIL: range missing start or end")
            return False
        
        # Parse dates and verify span
        from datetime import datetime
        start_date = datetime.fromisoformat(start)
        end_date = datetime.fromisoformat(end)
        days_diff = (end_date - start_date).days
        
        if days_diff != 6:  # 7 days inclusive = 6 days difference
            print(f"❌ FAIL: Expected 6 days difference (7 days inclusive), got: {days_diff}")
            return False
        
        # Verify end date is approximately today minus 2 days (GSC lag)
        from datetime import date, timedelta
        expected_end = date.today() - timedelta(days=2)
        actual_end = end_date.date()
        days_off = abs((actual_end - expected_end).days)
        
        if days_off > 1:
            print(f"⚠️  WARNING: End date is {days_off} days off from expected (today-2)")
        
        print(f"✅ PASS: Returns 200 with days=7, range spans 7 days (start={start}, end={end})")
        return True
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_overview_invalid_days():
    """TEST 5: GET /api/admin/seo/gsc/overview?key=...&days=999 → 200, days falls back to 28"""
    print("\n[TEST 5] GET /api/admin/seo/gsc/overview?key=...&days=999 (invalid)")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/gsc/overview?key={ADMIN_KEY}&days=999", timeout=30)
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        
        if not data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        if data.get('days') != 28:
            print(f"❌ FAIL: Expected days to fall back to 28, got: {data.get('days')}")
            return False
        
        print(f"✅ PASS: Invalid days=999 falls back to 28")
        return True
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_inspect_cached_homepage():
    """TEST 6: POST /api/admin/seo/gsc/inspect?key=... body {"url":"https://digihome.no/"} → 200 (cached)"""
    global inspect_calls
    print("\n[TEST 6] POST /api/admin/seo/gsc/inspect (homepage, cached)")
    print("⚠️  QUOTA: This should be CACHED from earlier, so no API call")
    
    try:
        r = requests.post(
            f"{BASE_URL}/admin/seo/gsc/inspect?key={ADMIN_KEY}",
            json={"url": "https://digihome.no/"},
            timeout=30
        )
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        print(f"Response: {data}")
        
        if not data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        result = data.get('result', {})
        if not result:
            print(f"❌ FAIL: result is missing")
            return False
        
        # Verify result structure
        if result.get('url') != 'https://digihome.no/':
            print(f"❌ FAIL: url mismatch")
            return False
        
        if 'verdict' not in result:
            print(f"❌ FAIL: verdict is missing")
            return False
        
        if 'coverageState' not in result:
            print(f"❌ FAIL: coverageState is missing")
            return False
        
        if 'checkedAt' not in result:
            print(f"❌ FAIL: checkedAt is missing")
            return False
        
        # Check if cached
        if result.get('cached'):
            print(f"✅ PASS: Returns 200 with cached:true (no API call)")
        else:
            inspect_calls += 1
            print(f"✅ PASS: Returns 200 (API call #{inspect_calls})")
        
        print(f"   Verdict: {result.get('verdict')}, CoverageState: {result.get('coverageState')}")
        return True
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_inspect_invalid_url():
    """TEST 7: POST /api/admin/seo/gsc/inspect?key=... body {"url":"https://vg.no/"} → 200 {ok:false, error contains 'URL må være under'}"""
    print("\n[TEST 7] POST /api/admin/seo/gsc/inspect (invalid URL)")
    
    try:
        r = requests.post(
            f"{BASE_URL}/admin/seo/gsc/inspect?key={ADMIN_KEY}",
            json={"url": "https://vg.no/"},
            timeout=30
        )
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        print(f"Response: {data}")
        
        if data.get('ok') != False:
            print(f"❌ FAIL: Expected ok:false, got: {data.get('ok')}")
            return False
        
        error = data.get('error', '')
        if 'URL må være under' not in error:
            print(f"❌ FAIL: Expected error to contain 'URL må være under', got: {error}")
            return False
        
        print(f"✅ PASS: Returns 200 {{ok:false, error:'{error}'}}")
        return True
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_inspect_new_page():
    """TEST 8: POST /api/admin/seo/gsc/inspect?key=... body {"url":"https://digihome.no/utleiemegler-bergen"} → 200"""
    global inspect_calls
    print("\n[TEST 8] POST /api/admin/seo/gsc/inspect (new page)")
    print("⚠️  QUOTA: This may use 1 API call if not cached")
    
    if inspect_calls >= 3:
        print("⚠️  SKIPPING: Already used 3 inspect calls (quota limit)")
        return True
    
    try:
        start_time = time.time()
        r = requests.post(
            f"{BASE_URL}/admin/seo/gsc/inspect?key={ADMIN_KEY}",
            json={"url": "https://digihome.no/utleiemegler-bergen"},
            timeout=30
        )
        elapsed = time.time() - start_time
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        print(f"Response time: {elapsed:.2f}s")
        
        if not data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        result = data.get('result', {})
        if not result:
            print(f"❌ FAIL: result is missing")
            return False
        
        # Check if cached
        if not result.get('cached'):
            inspect_calls += 1
            print(f"⚠️  API call #{inspect_calls} used")
        
        # Verdict can be PASS, NEUTRAL, or FAIL (all valid for new page)
        verdict = result.get('verdict')
        if verdict not in ['PASS', 'NEUTRAL', 'FAIL', None]:
            print(f"⚠️  WARNING: Unexpected verdict: {verdict}")
        
        print(f"✅ PASS: Returns 200 ok:true")
        print(f"   Verdict: {verdict}, CoverageState: {result.get('coverageState')}")
        print(f"   Note: Page is new (preview only), so PASS or NEUTRAL/not indexed are both valid")
        return True
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_regression_seo_overview():
    """TEST 9: REGRESSION: GET /api/admin/seo/overview?key=... → 200 ok:true"""
    print("\n[TEST 9] REGRESSION: GET /api/admin/seo/overview")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/overview?key={ADMIN_KEY}", timeout=30)
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        print(f"✅ PASS: SEO overview endpoint still works")
        return True
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_regression_seo_config():
    """TEST 10: REGRESSION: GET /api/admin/seo/config?key=... → 200"""
    print("\n[TEST 10] REGRESSION: GET /api/admin/seo/config")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/config?key={ADMIN_KEY}", timeout=30)
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        print(f"✅ PASS: SEO config endpoint still works")
        return True
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_regression_health():
    """TEST 11: REGRESSION: GET /api/ → 200"""
    print("\n[TEST 11] REGRESSION: GET /api/")
    try:
        r = requests.get(f"{BASE_URL}/", timeout=30)
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        print(f"✅ PASS: Health endpoint still works")
        return True
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_auth_overview_no_key():
    """TEST 12: AUTH: GET /api/admin/seo/gsc/overview without key → 401"""
    print("\n[TEST 12] AUTH: GET /api/admin/seo/gsc/overview without key")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/gsc/overview", timeout=30)
        if r.status_code == 401:
            print("✅ PASS: Returns 401 without key")
            return True
        else:
            print(f"❌ FAIL: Expected 401, got {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_auth_inspect_no_key():
    """TEST 13: AUTH: POST /api/admin/seo/gsc/inspect without key → 401"""
    print("\n[TEST 13] AUTH: POST /api/admin/seo/gsc/inspect without key")
    try:
        r = requests.post(
            f"{BASE_URL}/admin/seo/gsc/inspect",
            json={"url": "https://digihome.no/"},
            timeout=30
        )
        if r.status_code == 401:
            print("✅ PASS: Returns 401 without key")
            return True
        else:
            print(f"❌ FAIL: Expected 401, got {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def main():
    print("=" * 80)
    print("GOOGLE SEARCH CONSOLE INTEGRATION TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print()
    print("CRITICAL QUOTA RULES:")
    print("- POST /api/admin/seo/gsc/inspect: MAX 3 calls total")
    print("- GET /api/admin/seo/gsc/overview with &force=1: MAX 1 call")
    print("- WITHOUT force is cached and free")
    print("=" * 80)
    
    results = []
    
    # Run all tests
    results.append(("AUTH: status without key", test_auth_status_no_key()))
    results.append(("GET status with key", test_status_with_key()))
    results.append(("GET overview cached 28d", test_overview_cached_28d()))
    results.append(("GET overview 7d", test_overview_7d()))
    results.append(("GET overview invalid days", test_overview_invalid_days()))
    results.append(("POST inspect cached homepage", test_inspect_cached_homepage()))
    results.append(("POST inspect invalid URL", test_inspect_invalid_url()))
    results.append(("POST inspect new page", test_inspect_new_page()))
    results.append(("REGRESSION: seo overview", test_regression_seo_overview()))
    results.append(("REGRESSION: seo config", test_regression_seo_config()))
    results.append(("REGRESSION: health", test_regression_health()))
    results.append(("AUTH: overview without key", test_auth_overview_no_key()))
    results.append(("AUTH: inspect without key", test_auth_inspect_no_key()))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({100*passed//total}% success rate)")
    print(f"QUOTA USAGE: {inspect_calls} inspect API calls, {overview_force_calls} overview force calls")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        print("\nKEY FINDINGS:")
        print("- All GSC endpoints working correctly")
        print("- Auth working (401 without key)")
        print("- Status endpoint returns correct property and permission")
        print("- Overview endpoint returns correct structure with empty data (EXPECTED for new property)")
        print("- Inspect endpoint works for valid URLs under digihome.no")
        print("- Inspect endpoint rejects URLs outside digihome.no")
        print("- Days parameter validation working (invalid values fall back to 28)")
        print("- All regression tests passed")
        return 0
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
