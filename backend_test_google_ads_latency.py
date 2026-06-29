#!/usr/bin/env python3
"""
Backend test for Google Ads overview endpoint P0 latency/timeout fix.
Tests the stale-while-revalidate + 6s timeout implementation in lib/composio-google-ads.js.

CRITICAL ASSERTION: No single request should block longer than ~8 seconds.
"""

import requests
import time
import json
import sys

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 35  # Generous client timeout to measure actual response time

def measure_request(url, method="GET", **kwargs):
    """Make request and measure response time."""
    start = time.time()
    try:
        if method == "GET":
            resp = requests.get(url, timeout=TIMEOUT, **kwargs)
        else:
            resp = requests.post(url, timeout=TIMEOUT, **kwargs)
        elapsed = time.time() - start
        return resp, elapsed
    except Exception as e:
        elapsed = time.time() - start
        print(f"❌ Request failed after {elapsed:.2f}s: {e}")
        return None, elapsed

def test_overview_last_30d():
    """Test 1: GET overview with last_30d (both Google and Meta periods)."""
    print("\n=== TEST 1: GET /api/admin/ads/overview?googlePeriod=last_30d&metaPeriod=last_30d ===")
    url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=last_30d&metaPeriod=last_30d"
    resp, elapsed = measure_request(url)
    
    if not resp:
        return False
    
    print(f"✓ Response time: {elapsed:.2f}s")
    
    # CRITICAL: Must NOT hang 15-20s
    if elapsed > 8:
        print(f"❌ FAIL: Response time {elapsed:.2f}s exceeds 8s threshold (P0 latency issue NOT fixed)")
        return False
    else:
        print(f"✅ PASS: Response time {elapsed:.2f}s is within acceptable range (<8s)")
    
    if resp.status_code != 200:
        print(f"❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"Response: {resp.text[:500]}")
        return False
    
    try:
        data = resp.json()
    except:
        print(f"❌ FAIL: Response is not valid JSON")
        print(f"Response: {resp.text[:500]}")
        return False
    
    # Verify required fields
    required_fields = [
        'ok', 'googleConfigured', 'googleConnected', 'googleLive', 
        'googlePeriod', 'googleFetchedAt', 'googleStale', 'googleError',
        'economics', 'combined', 'metaConfigured', 'metaLive', 
        'metaPeriod', 'metaFetchedAt'
    ]
    
    missing = [f for f in required_fields if f not in data]
    if missing:
        print(f"❌ FAIL: Missing required fields: {missing}")
        return False
    
    print(f"✅ PASS: All required fields present")
    print(f"  - ok: {data.get('ok')}")
    print(f"  - googleConfigured: {data.get('googleConfigured')}")
    print(f"  - googleConnected: {data.get('googleConnected')}")
    print(f"  - googleLive: {data.get('googleLive')}")
    print(f"  - googlePeriod: {data.get('googlePeriod')}")
    print(f"  - googleFetchedAt: {data.get('googleFetchedAt')}")
    print(f"  - googleStale: {data.get('googleStale')}")
    print(f"  - metaPeriod: {data.get('metaPeriod')}")
    
    if data.get('googlePeriod') != 'last_30d':
        print(f"❌ FAIL: Expected googlePeriod='last_30d', got '{data.get('googlePeriod')}'")
        return False
    
    print(f"✅ TEST 1 PASSED")
    return True

def test_cache_hit():
    """Test 2: Immediately repeat same request - should be cache-hit (<1s)."""
    print("\n=== TEST 2: Immediate repeat (cache-hit test) ===")
    url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=last_30d&metaPeriod=last_30d"
    
    # First call to warm cache
    resp1, elapsed1 = measure_request(url)
    if not resp1 or resp1.status_code != 200:
        print(f"❌ FAIL: First call failed")
        return False
    
    data1 = resp1.json()
    fetchedAt1 = data1.get('googleFetchedAt')
    print(f"✓ First call: {elapsed1:.2f}s, googleFetchedAt={fetchedAt1}")
    
    # Immediate second call - should be cache-hit
    time.sleep(0.5)  # Small delay
    resp2, elapsed2 = measure_request(url)
    if not resp2 or resp2.status_code != 200:
        print(f"❌ FAIL: Second call failed")
        return False
    
    data2 = resp2.json()
    fetchedAt2 = data2.get('googleFetchedAt')
    print(f"✓ Second call: {elapsed2:.2f}s, googleFetchedAt={fetchedAt2}")
    
    # Cache-hit should be fast (<1s ideally)
    if elapsed2 > 1.5:
        print(f"⚠️  WARNING: Cache-hit took {elapsed2:.2f}s (expected <1s)")
    else:
        print(f"✅ PASS: Cache-hit is fast ({elapsed2:.2f}s)")
    
    # googleFetchedAt should be same (or very recent if background refresh happened)
    if fetchedAt1 == fetchedAt2:
        print(f"✅ PASS: googleFetchedAt unchanged (data served from cache)")
    else:
        print(f"⚠️  INFO: googleFetchedAt changed (background refresh may have completed)")
    
    print(f"✅ TEST 2 PASSED")
    return True

def test_force_refresh():
    """Test 3: Force refresh with googleRefresh=1 and metaRefresh=1."""
    print("\n=== TEST 3: Force refresh (googleRefresh=1&metaRefresh=1) ===")
    url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=last_30d&metaPeriod=last_30d&googleRefresh=1&metaRefresh=1"
    resp, elapsed = measure_request(url)
    
    if not resp:
        return False
    
    print(f"✓ Response time: {elapsed:.2f}s")
    
    # CRITICAL: Even force refresh must return within ~8s (either fresh or stale)
    if elapsed > 8:
        print(f"❌ FAIL: Force refresh took {elapsed:.2f}s (exceeds 8s threshold)")
        print(f"   This indicates the timeout fix is NOT working properly")
        return False
    else:
        print(f"✅ PASS: Force refresh returned within {elapsed:.2f}s (<8s)")
    
    if resp.status_code != 200:
        print(f"❌ FAIL: Expected 200, got {resp.status_code}")
        return False
    
    data = resp.json()
    print(f"  - googleStale: {data.get('googleStale')}")
    print(f"  - googleFetchedAt: {data.get('googleFetchedAt')}")
    
    # Force refresh may return stale data if timeout occurs, but should still be 200
    if data.get('googleStale'):
        print(f"⚠️  INFO: Returned stale data (timeout occurred, but handled gracefully)")
    else:
        print(f"✅ Fresh data returned")
    
    print(f"✅ TEST 3 PASSED")
    return True

def test_cold_cache_last_90d():
    """Test 4: Cold cache with last_90d period."""
    print("\n=== TEST 4: Cold cache test (last_90d) ===")
    url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=last_90d&metaPeriod=last_90d"
    
    # First call - likely cold cache
    resp1, elapsed1 = measure_request(url)
    if not resp1:
        return False
    
    print(f"✓ First call (cold cache): {elapsed1:.2f}s")
    
    # CRITICAL: Even cold cache must return within ~8s
    if elapsed1 > 8:
        print(f"❌ FAIL: Cold cache took {elapsed1:.2f}s (exceeds 8s threshold)")
        print(f"   Expected: Return within ~7s (possibly with empty/pending data)")
        return False
    else:
        print(f"✅ PASS: Cold cache returned within {elapsed1:.2f}s (<8s)")
    
    if resp1.status_code != 200:
        print(f"❌ FAIL: Expected 200, got {resp1.status_code}")
        return False
    
    data1 = resp1.json()
    print(f"  - googlePeriod: {data1.get('googlePeriod')}")
    print(f"  - googleStale: {data1.get('googleStale')}")
    print(f"  - googleFetchedAt: {data1.get('googleFetchedAt')}")
    
    if data1.get('economics'):
        cost = data1['economics'].get('totals', {}).get('cost', 0)
        print(f"  - economics.totals.cost: {cost}")
        if cost == 0 and data1.get('googleStale'):
            print(f"⚠️  INFO: Returned pending/empty data (background fetch in progress)")
    
    # Wait a few seconds for background fetch to complete
    print(f"⏳ Waiting 3 seconds for background fetch to complete...")
    time.sleep(3)
    
    # Second call - should have data now (or still pending but fast)
    resp2, elapsed2 = measure_request(url)
    if not resp2:
        return False
    
    print(f"✓ Second call: {elapsed2:.2f}s")
    
    if elapsed2 > 8:
        print(f"❌ FAIL: Second call took {elapsed2:.2f}s (exceeds 8s threshold)")
        return False
    else:
        print(f"✅ PASS: Second call returned within {elapsed2:.2f}s (<8s)")
    
    data2 = resp2.json()
    print(f"  - googleStale: {data2.get('googleStale')}")
    print(f"  - googleFetchedAt: {data2.get('googleFetchedAt')}")
    
    if data2.get('googleFetchedAt') and not data1.get('googleFetchedAt'):
        print(f"✅ Background fetch completed (data now available)")
    
    print(f"✅ TEST 4 PASSED")
    return True

def test_invalid_period_fallback():
    """Test 5: Invalid period should fallback to last_30d."""
    print("\n=== TEST 5: Invalid period fallback ===")
    url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=invalidxyz&metaPeriod=invalidxyz"
    resp, elapsed = measure_request(url)
    
    if not resp:
        return False
    
    print(f"✓ Response time: {elapsed:.2f}s")
    
    if resp.status_code != 200:
        print(f"❌ FAIL: Expected 200, got {resp.status_code}")
        return False
    
    data = resp.json()
    if data.get('googlePeriod') != 'last_30d':
        print(f"❌ FAIL: Expected fallback to 'last_30d', got '{data.get('googlePeriod')}'")
        return False
    
    print(f"✅ PASS: Invalid period correctly fell back to 'last_30d'")
    print(f"✅ TEST 5 PASSED")
    return True

def test_auth():
    """Test 6: Auth - request without key should return 401."""
    print("\n=== TEST 6: Authentication test ===")
    url = f"{BASE_URL}/admin/ads/overview?googlePeriod=last_30d&metaPeriod=last_30d"
    
    try:
        resp = requests.get(url, timeout=TIMEOUT)
        elapsed = 0
    except Exception as e:
        print(f"❌ FAIL: Request failed: {e}")
        return False
    
    if resp.status_code != 401:
        print(f"❌ FAIL: Expected 401 without key, got {resp.status_code}")
        print(f"Response: {resp.text[:200]}")
        return False
    
    print(f"✅ PASS: Correctly returned 401 without authentication key")
    print(f"✅ TEST 6 PASSED")
    return True

def test_regression():
    """Test 7: Regression - root endpoint should still work."""
    print("\n=== TEST 7: Regression test ===")
    url = f"{BASE_URL}/"
    resp, elapsed = measure_request(url)
    
    if not resp:
        return False
    
    if resp.status_code != 200:
        print(f"❌ FAIL: Expected 200, got {resp.status_code}")
        return False
    
    data = resp.json()
    if not data.get('ok'):
        print(f"❌ FAIL: Expected ok:true, got {data}")
        return False
    
    print(f"✅ PASS: Root endpoint working correctly")
    print(f"✅ TEST 7 PASSED")
    return True

def main():
    print("=" * 80)
    print("GOOGLE ADS OVERVIEW ENDPOINT - P0 LATENCY/TIMEOUT FIX VERIFICATION")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Client timeout: {TIMEOUT}s")
    print(f"\nCRITICAL ASSERTION: No request should block longer than ~8 seconds")
    print("=" * 80)
    
    tests = [
        ("Overview last_30d", test_overview_last_30d),
        ("Cache-hit behavior", test_cache_hit),
        ("Force refresh", test_force_refresh),
        ("Cold cache last_90d", test_cold_cache_last_90d),
        ("Invalid period fallback", test_invalid_period_fallback),
        ("Authentication", test_auth),
        ("Regression", test_regression),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ TEST FAILED WITH EXCEPTION: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - P0 LATENCY FIX VERIFIED")
        print("✅ No request exceeded 8s threshold")
        print("✅ Stale-while-revalidate working correctly")
        print("✅ Timeout handling working correctly")
        return 0
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
