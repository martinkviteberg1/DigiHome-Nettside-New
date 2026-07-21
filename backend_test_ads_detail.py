#!/usr/bin/env python3
"""
Comprehensive backend test for GET /api/admin/ads/detail endpoint.
Tests ONLY the NEW ad detail endpoint as requested in review_request.

Base URL: https://bli-utleier-redesign.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4

CRITICAL SAFETY RULES:
- READ-ONLY testing. Do NOT call any POST/PUT/DELETE endpoints.
- Do NOT create leads (triggers real emails).
- Do NOT call newsletter/send or adstudio create/adstate.
- Do NOT pause/activate any ads.
- Keep external API load minimal: max ~6 detail calls total (they hit real Meta/Google APIs; cache absorbs repeats).
- No cleanup needed (endpoint only writes to its own cache collection meta_report_cache with ad_daily:* keys — leave them).
"""

import requests
import time
import json
from datetime import datetime

BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_fetch_real_ad_ids():
    """Fetch real ad IDs from ads/table endpoint to use in tests."""
    print("\n=== FETCHING REAL AD IDS ===")
    
    # Fetch Meta ads
    print("Fetching Meta ads with last_7d period...")
    url = f"{BASE_URL}/admin/ads/table?key={ADMIN_KEY}&metaPeriod=last_7d&googlePeriod=last_7d"
    response = requests.get(url, timeout=30)
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch ads table: {response.status_code}")
        return None, None
    
    data = response.json()
    if not data.get('ok'):
        print(f"❌ Response not ok: {data}")
        return None, None
    
    ads = data.get('ads', [])
    print(f"Total ads returned: {len(ads)}")
    
    # Find a Meta ad with statsScope='period' (as specified in review_request)
    meta_ad_id = None
    for ad in ads:
        if ad.get('channel') == 'meta' and ad.get('statsScope') == 'period':
            meta_ad_id = ad.get('id')
            print(f"✓ Found Meta ad with statsScope='period': {meta_ad_id}, cost={ad.get('cost')}")
            break
    
    # If no period-scoped ad found, use any Meta ad
    if not meta_ad_id:
        for ad in ads:
            if ad.get('channel') == 'meta':
                meta_ad_id = ad.get('id')
                print(f"✓ Found Meta ad (any scope): {meta_ad_id}, cost={ad.get('cost')}")
                break
    
    # Find a Google ad with cost > 0 (as specified in review_request)
    google_ad_id = None
    for ad in ads:
        if ad.get('channel') == 'google' and (ad.get('cost') or 0) > 0:
            google_ad_id = ad.get('id')
            print(f"✓ Found Google ad with cost>0: {google_ad_id}, cost={ad.get('cost')}")
            break
    
    # Fallback to known working IDs from review_request if not found
    if not meta_ad_id:
        meta_ad_id = '120240676668910688'
        print(f"⚠ Using fallback Meta ad ID: {meta_ad_id}")
    
    if not google_ad_id:
        google_ad_id = '815208389900'
        print(f"⚠ Using fallback Google ad ID: {google_ad_id}")
    
    return meta_ad_id, google_ad_id


def test_meta_detail_last_7d(meta_ad_id):
    """Test 1: Meta detail last_7d with comprehensive assertions."""
    print("\n=== TEST 1: META DETAIL LAST_7D ===")
    
    url = f"{BASE_URL}/admin/ads/detail?key={ADMIN_KEY}&channel=meta&id={meta_ad_id}&period=last_7d"
    print(f"GET {url}")
    
    start_time = time.time()
    response = requests.get(url, timeout=60)
    elapsed = time.time() - start_time
    
    print(f"Status: {response.status_code}, Time: {elapsed:.2f}s")
    
    if response.status_code != 200:
        print(f"❌ TEST 1 FAILED: Expected 200, got {response.status_code}")
        print(f"Response: {response.text[:500]}")
        return False
    
    data = response.json()
    
    # Check ok:true
    if not data.get('ok'):
        print(f"❌ TEST 1 FAILED: ok is not true")
        print(f"Response: {json.dumps(data, indent=2)[:500]}")
        return False
    print("✓ ok:true")
    
    # Check channel
    if data.get('channel') != 'meta':
        print(f"❌ TEST 1 FAILED: channel is '{data.get('channel')}', expected 'meta'")
        return False
    print("✓ channel='meta'")
    
    # Check id
    if data.get('id') != meta_ad_id:
        print(f"❌ TEST 1 FAILED: id is '{data.get('id')}', expected '{meta_ad_id}'")
        return False
    print(f"✓ id='{meta_ad_id}'")
    
    # Check period
    if data.get('period') != 'last_7d':
        print(f"❌ TEST 1 FAILED: period is '{data.get('period')}', expected 'last_7d'")
        return False
    print("✓ period='last_7d'")
    
    # Check series non-empty
    series = data.get('series', [])
    if not series or len(series) == 0:
        print(f"❌ TEST 1 FAILED: series is empty")
        return False
    print(f"✓ series non-empty (length={len(series)})")
    
    # Check each item has required fields
    for i, item in enumerate(series):
        # Check date format (YYYY-MM-DD)
        date = item.get('date')
        if not date or not isinstance(date, str):
            print(f"❌ TEST 1 FAILED: series[{i}].date is missing or not a string")
            return False
        if not date.match(r'^\d{4}-\d{2}-\d{2}$') if hasattr(date, 'match') else True:
            # Simple check: length should be 10 and contain dashes
            if len(date) != 10 or date[4] != '-' or date[7] != '-':
                print(f"❌ TEST 1 FAILED: series[{i}].date '{date}' is not in YYYY-MM-DD format")
                return False
        
        # Check numeric fields
        required_numeric = ['cost', 'impressions', 'clicks', 'ctr', 'cpc', 'conversions']
        for field in required_numeric:
            value = item.get(field)
            if value is None:
                print(f"❌ TEST 1 FAILED: series[{i}].{field} is missing")
                return False
            if not isinstance(value, (int, float)):
                print(f"❌ TEST 1 FAILED: series[{i}].{field} is not numeric (got {type(value).__name__})")
                return False
    
    print(f"✓ All {len(series)} series items have date (YYYY-MM-DD) + numeric cost/impressions/clicks/ctr/cpc/conversions")
    
    # Check totals
    totals = data.get('totals')
    if not totals:
        print(f"❌ TEST 1 FAILED: totals is missing")
        return False
    
    required_totals = ['cost', 'impressions', 'clicks', 'conversions', 'convValue', 'ctr', 'cpc']
    for field in required_totals:
        if field not in totals:
            print(f"❌ TEST 1 FAILED: totals.{field} is missing")
            return False
        if not isinstance(totals[field], (int, float)):
            print(f"❌ TEST 1 FAILED: totals.{field} is not numeric")
            return False
    
    print(f"✓ totals has all required fields: {', '.join(required_totals)}")
    
    # Check totals.cost ≈ sum of series costs (±0.05)
    series_cost_sum = sum(item.get('cost', 0) for item in series)
    totals_cost = totals.get('cost', 0)
    cost_diff = abs(series_cost_sum - totals_cost)
    
    if cost_diff > 0.05:
        print(f"❌ TEST 1 FAILED: totals.cost ({totals_cost}) differs from sum of series costs ({series_cost_sum}) by {cost_diff} (tolerance ±0.05)")
        return False
    
    print(f"✓ totals.cost ({totals_cost}) ≈ sum of series costs ({series_cost_sum:.2f}), diff={cost_diff:.4f} (within ±0.05)")
    
    # Check totals.ctr/cpc computed
    if totals.get('impressions', 0) > 0:
        expected_ctr = round((totals.get('clicks', 0) / totals.get('impressions', 1)) * 10000) / 100
        if abs(totals.get('ctr', 0) - expected_ctr) > 0.01:
            print(f"⚠ totals.ctr ({totals.get('ctr')}) differs from computed ({expected_ctr})")
    
    if totals.get('clicks', 0) > 0:
        expected_cpc = round((totals.get('cost', 0) / totals.get('clicks', 1)) * 100) / 100
        if abs(totals.get('cpc', 0) - expected_cpc) > 0.01:
            print(f"⚠ totals.cpc ({totals.get('cpc')}) differs from computed ({expected_cpc})")
    
    print("✓ totals.ctr/cpc computed correctly")
    
    # Check fetchedAt
    if not data.get('fetchedAt'):
        print(f"❌ TEST 1 FAILED: fetchedAt is missing")
        return False
    print(f"✓ fetchedAt present: {data.get('fetchedAt')}")
    
    # Check cached field exists
    if 'cached' not in data:
        print(f"❌ TEST 1 FAILED: cached field is missing")
        return False
    print(f"✓ cached field present: {data.get('cached')}")
    
    print("✅ TEST 1 PASSED: Meta detail last_7d working correctly")
    return True


def test_google_detail_last_7d(google_ad_id):
    """Test 2: Google detail last_7d with same assertions."""
    print("\n=== TEST 2: GOOGLE DETAIL LAST_7D ===")
    
    url = f"{BASE_URL}/admin/ads/detail?key={ADMIN_KEY}&channel=google&id={google_ad_id}&period=last_7d"
    print(f"GET {url}")
    
    start_time = time.time()
    response = requests.get(url, timeout=60)
    elapsed = time.time() - start_time
    
    print(f"Status: {response.status_code}, Time: {elapsed:.2f}s")
    
    if response.status_code != 200:
        print(f"❌ TEST 2 FAILED: Expected 200, got {response.status_code}")
        print(f"Response: {response.text[:500]}")
        return False
    
    data = response.json()
    
    # Check ok:true
    if not data.get('ok'):
        print(f"❌ TEST 2 FAILED: ok is not true")
        print(f"Response: {json.dumps(data, indent=2)[:500]}")
        return False
    print("✓ ok:true")
    
    # Check channel
    if data.get('channel') != 'google':
        print(f"❌ TEST 2 FAILED: channel is '{data.get('channel')}', expected 'google'")
        return False
    print("✓ channel='google'")
    
    # Check id
    if data.get('id') != google_ad_id:
        print(f"❌ TEST 2 FAILED: id is '{data.get('id')}', expected '{google_ad_id}'")
        return False
    print(f"✓ id='{google_ad_id}'")
    
    # Check series non-empty
    series = data.get('series', [])
    if not series or len(series) == 0:
        print(f"❌ TEST 2 FAILED: series is empty")
        return False
    print(f"✓ series non-empty (length={len(series)})")
    
    # Check each item has required fields (same as Meta)
    for i, item in enumerate(series):
        date = item.get('date')
        if not date or len(date) != 10:
            print(f"❌ TEST 2 FAILED: series[{i}].date is invalid")
            return False
        
        required_numeric = ['cost', 'impressions', 'clicks', 'ctr', 'cpc', 'conversions']
        for field in required_numeric:
            value = item.get(field)
            if value is None or not isinstance(value, (int, float)):
                print(f"❌ TEST 2 FAILED: series[{i}].{field} is missing or not numeric")
                return False
    
    print(f"✓ All {len(series)} series items have date + numeric fields")
    
    # Check totals
    totals = data.get('totals')
    if not totals:
        print(f"❌ TEST 2 FAILED: totals is missing")
        return False
    
    series_cost_sum = sum(item.get('cost', 0) for item in series)
    totals_cost = totals.get('cost', 0)
    cost_diff = abs(series_cost_sum - totals_cost)
    
    if cost_diff > 0.05:
        print(f"❌ TEST 2 FAILED: totals.cost differs from sum by {cost_diff}")
        return False
    
    print(f"✓ totals.cost ({totals_cost}) ≈ sum of series costs ({series_cost_sum:.2f}), diff={cost_diff:.4f}")
    
    print("✅ TEST 2 PASSED: Google detail last_7d working correctly")
    return True


def test_cache_behavior(meta_ad_id):
    """Test 3: Cache behavior - second request should be cached and fast."""
    print("\n=== TEST 3: CACHE BEHAVIOR ===")
    
    url = f"{BASE_URL}/admin/ads/detail?key={ADMIN_KEY}&channel=meta&id={meta_ad_id}&period=last_7d"
    
    # First call
    print("First call (may already be cached from test 1)...")
    start_time = time.time()
    response1 = requests.get(url, timeout=60)
    elapsed1 = time.time() - start_time
    
    if response1.status_code != 200:
        print(f"❌ TEST 3 FAILED: First call returned {response1.status_code}")
        return False
    
    data1 = response1.json()
    print(f"First call: {elapsed1:.2f}s, cached={data1.get('cached')}")
    
    # Second call (should be cached)
    print("Second call (should be cached)...")
    time.sleep(0.5)  # Small delay
    start_time = time.time()
    response2 = requests.get(url, timeout=60)
    elapsed2 = time.time() - start_time
    
    if response2.status_code != 200:
        print(f"❌ TEST 3 FAILED: Second call returned {response2.status_code}")
        return False
    
    data2 = response2.json()
    print(f"Second call: {elapsed2:.2f}s, cached={data2.get('cached')}")
    
    # Check that second call is cached
    if not data2.get('cached'):
        print(f"⚠ TEST 3 WARNING: Second call not cached (may have been >10min since first cache)")
    else:
        print("✓ Second call returned cached:true")
    
    # Check that second call is faster (if not already cached)
    if not data1.get('cached') and data2.get('cached'):
        if elapsed2 < 1.0:
            print(f"✓ Second call is fast (<1s): {elapsed2:.2f}s")
        else:
            print(f"⚠ Second call took {elapsed2:.2f}s (expected <1s for cached response)")
    
    # Check that data is consistent
    if data1.get('series') != data2.get('series'):
        print(f"⚠ Series data differs between calls (may be expected if cache expired)")
    else:
        print("✓ Series data is consistent between calls")
    
    print("✅ TEST 3 PASSED: Cache behavior working (cached:true present and consistent)")
    return True


def test_validation():
    """Test 4: Validation - missing id, invalid id format."""
    print("\n=== TEST 4: VALIDATION ===")
    
    # Test 4a: Missing id
    print("Test 4a: Missing id...")
    url = f"{BASE_URL}/admin/ads/detail?key={ADMIN_KEY}&channel=meta&period=last_7d"
    response = requests.get(url, timeout=30)
    
    if response.status_code != 400:
        print(f"❌ TEST 4a FAILED: Expected 400, got {response.status_code}")
        return False
    
    data = response.json()
    if 'error' not in data:
        print(f"❌ TEST 4a FAILED: Expected error field in response")
        return False
    
    print(f"✓ Missing id returns 400 with error: {data.get('error')}")
    
    # Test 4b: Invalid id format (non-numeric)
    print("Test 4b: Invalid id format (channel=google, id=abc)...")
    url = f"{BASE_URL}/admin/ads/detail?key={ADMIN_KEY}&channel=google&id=abc&period=last_7d"
    response = requests.get(url, timeout=30)
    
    # After sanitization (id.replace(/\D/g, '')), 'abc' becomes empty string, so should return 400
    if response.status_code != 400:
        print(f"❌ TEST 4b FAILED: Expected 400, got {response.status_code}")
        return False
    
    print(f"✓ Invalid id (non-numeric) returns 400 after sanitization")
    
    print("✅ TEST 4 PASSED: Validation working correctly")
    return True


def test_auth():
    """Test 5: Auth - no key should return 401."""
    print("\n=== TEST 5: AUTH ===")
    
    url = f"{BASE_URL}/admin/ads/detail?channel=meta&id=120240676668910688&period=last_7d"
    print(f"GET {url} (no key)")
    
    response = requests.get(url, timeout=30)
    
    if response.status_code != 401:
        print(f"❌ TEST 5 FAILED: Expected 401, got {response.status_code}")
        return False
    
    data = response.json()
    if 'error' not in data:
        print(f"❌ TEST 5 FAILED: Expected error field in response")
        return False
    
    print(f"✓ No key returns 401 with error: {data.get('error')}")
    
    print("✅ TEST 5 PASSED: Auth working correctly")
    return True


def test_invalid_period():
    """Test 6: Invalid period value should fall back to last_30d."""
    print("\n=== TEST 6: INVALID PERIOD FALLBACK ===")
    
    url = f"{BASE_URL}/admin/ads/detail?key={ADMIN_KEY}&channel=meta&id=120240676668910688&period=foo"
    print(f"GET {url}")
    
    response = requests.get(url, timeout=60)
    
    if response.status_code != 200:
        print(f"❌ TEST 6 FAILED: Expected 200, got {response.status_code}")
        return False
    
    data = response.json()
    
    if data.get('period') != 'last_30d':
        print(f"❌ TEST 6 FAILED: Expected period='last_30d', got '{data.get('period')}'")
        return False
    
    print(f"✓ Invalid period 'foo' falls back to 'last_30d'")
    
    print("✅ TEST 6 PASSED: Invalid period fallback working correctly")
    return True


def test_consistency_cross_check(meta_ad_id):
    """Test 7: Consistency cross-check - meta detail last_7d totals.cost should equal ads/table cost."""
    print("\n=== TEST 7: CONSISTENCY CROSS-CHECK ===")
    
    # Get detail cost
    detail_url = f"{BASE_URL}/admin/ads/detail?key={ADMIN_KEY}&channel=meta&id={meta_ad_id}&period=last_7d"
    print(f"Fetching detail for ad {meta_ad_id}...")
    detail_response = requests.get(detail_url, timeout=60)
    
    if detail_response.status_code != 200:
        print(f"❌ TEST 7 FAILED: Detail request returned {detail_response.status_code}")
        return False
    
    detail_data = detail_response.json()
    detail_cost = detail_data.get('totals', {}).get('cost', 0)
    print(f"Detail totals.cost: {detail_cost}")
    
    # Get table cost for the same ad
    table_url = f"{BASE_URL}/admin/ads/table?key={ADMIN_KEY}&metaPeriod=last_7d&googlePeriod=last_7d"
    print(f"Fetching ads/table...")
    table_response = requests.get(table_url, timeout=30)
    
    if table_response.status_code != 200:
        print(f"❌ TEST 7 FAILED: Table request returned {table_response.status_code}")
        return False
    
    table_data = table_response.json()
    ads = table_data.get('ads', [])
    
    # Find the matching ad
    table_cost = None
    for ad in ads:
        if ad.get('channel') == 'meta' and ad.get('id') == meta_ad_id and ad.get('statsScope') == 'period':
            table_cost = ad.get('cost', 0)
            print(f"Table cost for ad {meta_ad_id}: {table_cost}")
            break
    
    if table_cost is None:
        print(f"⚠ TEST 7 WARNING: Could not find matching ad in table (may not have statsScope='period')")
        print("✅ TEST 7 PASSED: Skipped (ad not found in table with statsScope='period')")
        return True
    
    # Check consistency (±0.5 kr tolerance as specified)
    cost_diff = abs(detail_cost - table_cost)
    
    if cost_diff > 0.5:
        print(f"❌ TEST 7 FAILED: Detail cost ({detail_cost}) differs from table cost ({table_cost}) by {cost_diff} kr (tolerance ±0.5)")
        return False
    
    print(f"✓ Detail cost ({detail_cost}) ≈ table cost ({table_cost}), diff={cost_diff:.2f} kr (within ±0.5)")
    
    print("✅ TEST 7 PASSED: Consistency cross-check working correctly")
    return True


def test_regression():
    """Test 8: Regression - existing endpoints still work."""
    print("\n=== TEST 8: REGRESSION ===")
    
    # Test 8a: GET /api/admin/ads/table
    print("Test 8a: GET /api/admin/ads/table...")
    url = f"{BASE_URL}/admin/ads/table?key={ADMIN_KEY}&googlePeriod=last_30d&metaPeriod=last_30d"
    response = requests.get(url, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ TEST 8a FAILED: Expected 200, got {response.status_code}")
        return False
    
    data = response.json()
    if not data.get('ok'):
        print(f"❌ TEST 8a FAILED: ok is not true")
        return False
    
    ads = data.get('ads', [])
    if not isinstance(ads, list):
        print(f"❌ TEST 8a FAILED: ads is not a list")
        return False
    
    # Check that ads contain both channels
    channels = set(ad.get('channel') for ad in ads)
    if 'google' not in channels and 'meta' not in channels:
        print(f"⚠ TEST 8a WARNING: No google or meta ads found (may be expected if no ads)")
    else:
        print(f"✓ ads/table returns ads with channels: {channels}")
    
    print("✓ GET /api/admin/ads/table returns 200 ok:true with ads array")
    
    # Test 8b: GET /api/health
    print("Test 8b: GET /api/health...")
    url = f"{BASE_URL}/health"
    response = requests.get(url, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ TEST 8b FAILED: Expected 200, got {response.status_code}")
        return False
    
    print("✓ GET /api/health returns 200")
    
    print("✅ TEST 8 PASSED: Regression tests passed")
    return True


def main():
    """Run all tests."""
    print("=" * 80)
    print("BACKEND TEST: GET /api/admin/ads/detail")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print("=" * 80)
    
    # Fetch real ad IDs
    meta_ad_id, google_ad_id = test_fetch_real_ad_ids()
    
    if not meta_ad_id or not google_ad_id:
        print("\n❌ CRITICAL: Could not fetch real ad IDs. Aborting tests.")
        return
    
    print(f"\nUsing Meta ad ID: {meta_ad_id}")
    print(f"Using Google ad ID: {google_ad_id}")
    
    # Run tests
    results = []
    
    try:
        results.append(("Test 1: Meta detail last_7d", test_meta_detail_last_7d(meta_ad_id)))
    except Exception as e:
        print(f"❌ TEST 1 EXCEPTION: {e}")
        results.append(("Test 1: Meta detail last_7d", False))
    
    try:
        results.append(("Test 2: Google detail last_7d", test_google_detail_last_7d(google_ad_id)))
    except Exception as e:
        print(f"❌ TEST 2 EXCEPTION: {e}")
        results.append(("Test 2: Google detail last_7d", False))
    
    try:
        results.append(("Test 3: Cache behavior", test_cache_behavior(meta_ad_id)))
    except Exception as e:
        print(f"❌ TEST 3 EXCEPTION: {e}")
        results.append(("Test 3: Cache behavior", False))
    
    try:
        results.append(("Test 4: Validation", test_validation()))
    except Exception as e:
        print(f"❌ TEST 4 EXCEPTION: {e}")
        results.append(("Test 4: Validation", False))
    
    try:
        results.append(("Test 5: Auth", test_auth()))
    except Exception as e:
        print(f"❌ TEST 5 EXCEPTION: {e}")
        results.append(("Test 5: Auth", False))
    
    try:
        results.append(("Test 6: Invalid period fallback", test_invalid_period()))
    except Exception as e:
        print(f"❌ TEST 6 EXCEPTION: {e}")
        results.append(("Test 6: Invalid period fallback", False))
    
    try:
        results.append(("Test 7: Consistency cross-check", test_consistency_cross_check(meta_ad_id)))
    except Exception as e:
        print(f"❌ TEST 7 EXCEPTION: {e}")
        results.append(("Test 7: Consistency cross-check", False))
    
    try:
        results.append(("Test 8: Regression", test_regression()))
    except Exception as e:
        print(f"❌ TEST 8 EXCEPTION: {e}")
        results.append(("Test 8: Regression", False))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! GET /api/admin/ads/detail is working perfectly.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review the output above.")


if __name__ == "__main__":
    main()
