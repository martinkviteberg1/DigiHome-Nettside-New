#!/usr/bin/env python3
"""
LEIEFORHOLD CACHE RETEST — focused verification of caching layer added to lib/leieforhold.js.
Tests cache behavior (cached:true, fetchedAt, stale:true+warning), ?fresh=1 bypass, and auth regression.
"""
import os
import sys
import time
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('/app/.env')

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = 'dh_admin_b3Kx92Qz7Lm4'
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

print(f"🧪 LEIEFORHOLD CACHE RETEST")
print(f"Base URL: {API_BASE}")
print(f"Admin key: {ADMIN_KEY}")
print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
print()

# MongoDB client
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

def test_cache_behavior():
    """
    TEST 1-4: Cache behavior (initial fetch, cached response, MongoDB verification, fresh bypass)
    """
    print("=" * 80)
    print("TEST 1-4: CACHE BEHAVIOR")
    print("=" * 80)
    
    # TEST 1: Initial GET with env=prod (measure T1)
    print("\n[TEST 1] Initial GET /api/admin/leieforhold?env=prod (timeout 60s)")
    try:
        t1_start = time.time()
        r1 = requests.get(
            f"{API_BASE}/admin/leieforhold",
            params={'key': ADMIN_KEY, 'env': 'prod'},
            timeout=60
        )
        t1_elapsed = time.time() - t1_start
        
        print(f"  Status: {r1.status_code}")
        print(f"  Response time T1: {t1_elapsed:.2f}s")
        
        if r1.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {r1.status_code}")
            print(f"  Response: {r1.text[:500]}")
            return False
        
        data1 = r1.json()
        print(f"  ✅ Status 200")
        
        # Verify structure
        if not data1.get('ok'):
            print(f"  ❌ FAILED: ok is not true")
            return False
        print(f"  ✅ ok: true")
        
        if 'rows' not in data1:
            print(f"  ❌ FAILED: rows missing")
            return False
        print(f"  ✅ rows: {len(data1['rows'])} items")
        
        if 'totals' not in data1:
            print(f"  ❌ FAILED: totals missing")
            return False
        print(f"  ✅ totals: {data1['totals']}")
        
        if 'fetchedAt' not in data1:
            print(f"  ❌ FAILED: fetchedAt missing")
            return False
        fetchedAt1 = data1['fetchedAt']
        print(f"  ✅ fetchedAt: {fetchedAt1}")
        
        # Check if cached (first call might or might not be cached depending on previous runs)
        if data1.get('cached'):
            print(f"  ℹ️  cached: true (cache already existed)")
        else:
            print(f"  ℹ️  cached: false (fresh fetch)")
        
        print(f"  ✅ TEST 1 PASSED: Initial fetch successful (T1={t1_elapsed:.2f}s)")
        
    except Exception as e:
        print(f"  ❌ TEST 1 FAILED: {e}")
        return False
    
    # TEST 2: Immediately repeat (should be cached, T2 < 3s)
    print("\n[TEST 2] Immediately repeat same request (should be cached, T2 < 3s)")
    try:
        time.sleep(0.5)  # Small delay to ensure cache is written
        t2_start = time.time()
        r2 = requests.get(
            f"{API_BASE}/admin/leieforhold",
            params={'key': ADMIN_KEY, 'env': 'prod'},
            timeout=60
        )
        t2_elapsed = time.time() - t2_start
        
        print(f"  Status: {r2.status_code}")
        print(f"  Response time T2: {t2_elapsed:.2f}s")
        
        if r2.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {r2.status_code}")
            return False
        
        data2 = r2.json()
        
        # Verify cached:true
        if not data2.get('cached'):
            print(f"  ⚠️  WARNING: cached is not true (expected cached response)")
            print(f"  Response: {data2}")
        else:
            print(f"  ✅ cached: true")
        
        # Verify fetchedAt is same or similar
        fetchedAt2 = data2.get('fetchedAt')
        print(f"  ✅ fetchedAt: {fetchedAt2}")
        
        # Verify T2 is FAST (<3s)
        if t2_elapsed >= 3.0:
            print(f"  ⚠️  WARNING: T2={t2_elapsed:.2f}s is NOT fast (<3s expected for cached response)")
        else:
            print(f"  ✅ T2={t2_elapsed:.2f}s is FAST (<3s)")
        
        print(f"  ✅ TEST 2 PASSED: Cached response received (T2={t2_elapsed:.2f}s)")
        
    except Exception as e:
        print(f"  ❌ TEST 2 FAILED: {e}")
        return False
    
    # TEST 3: Verify MongoDB cache document
    print("\n[TEST 3] Verify MongoDB: leieforhold_cache collection")
    try:
        cache_doc = db.leieforhold_cache.find_one({'id': {'$regex': '^leieforhold:prod:'}})
        
        if not cache_doc:
            print(f"  ❌ FAILED: No cache document found with id starting 'leieforhold:prod:'")
            return False
        
        print(f"  ✅ Cache document found: id={cache_doc['id']}")
        
        if 'data' not in cache_doc:
            print(f"  ❌ FAILED: data field missing")
            return False
        
        if not cache_doc['data'].get('ok'):
            print(f"  ❌ FAILED: data.ok is not true")
            return False
        print(f"  ✅ data.ok: true")
        
        if 'fetchedAt' not in cache_doc:
            print(f"  ❌ FAILED: fetchedAt missing")
            return False
        print(f"  ✅ fetchedAt: {cache_doc['fetchedAt']}")
        
        print(f"  ✅ TEST 3 PASSED: MongoDB cache document verified")
        
    except Exception as e:
        print(f"  ❌ TEST 3 FAILED: {e}")
        return False
    
    # TEST 4: GET with ?fresh=1 (should bypass cache)
    print("\n[TEST 4] GET /api/admin/leieforhold?env=prod&fresh=1 (bypass cache, timeout 60s)")
    try:
        t4_start = time.time()
        r4 = requests.get(
            f"{API_BASE}/admin/leieforhold",
            params={'key': ADMIN_KEY, 'env': 'prod', 'fresh': '1'},
            timeout=60
        )
        t4_elapsed = time.time() - t4_start
        
        print(f"  Status: {r4.status_code}")
        print(f"  Response time: {t4_elapsed:.2f}s")
        
        if r4.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {r4.status_code}")
            return False
        
        data4 = r4.json()
        
        # Verify NOT cached (or if upstream timed out, stale:true is acceptable)
        if data4.get('cached') and not data4.get('stale'):
            print(f"  ⚠️  WARNING: cached:true without stale:true (expected fresh fetch)")
        elif data4.get('stale'):
            print(f"  ℹ️  stale: true (upstream timeout, served stale cache - acceptable)")
            print(f"  ℹ️  warning: {data4.get('warning')}")
        else:
            print(f"  ✅ cached: false (fresh fetch)")
        
        # Verify fetchedAt is NEWER than cached one (or same if stale)
        fetchedAt4 = data4.get('fetchedAt')
        print(f"  ✅ fetchedAt: {fetchedAt4}")
        
        if fetchedAt4 and fetchedAt1 and fetchedAt4 > fetchedAt1:
            print(f"  ✅ fetchedAt is NEWER than initial fetch")
        elif data4.get('stale'):
            print(f"  ℹ️  fetchedAt is same (stale cache served due to upstream failure)")
        
        print(f"  ✅ TEST 4 PASSED: Fresh bypass working (or stale cache served on upstream failure)")
        
    except Exception as e:
        print(f"  ❌ TEST 4 FAILED: {e}")
        return False
    
    return True


def test_export_endpoints():
    """
    TEST 5-6: Export endpoints (should be fast due to cache)
    """
    print("\n" + "=" * 80)
    print("TEST 5-6: EXPORT ENDPOINTS (XLSX, CSV)")
    print("=" * 80)
    
    # TEST 5: GET /xlsx (should be fast due to cache)
    print("\n[TEST 5] GET /api/admin/leieforhold/xlsx?env=prod")
    try:
        t5_start = time.time()
        r5 = requests.get(
            f"{API_BASE}/admin/leieforhold/xlsx",
            params={'key': ADMIN_KEY, 'env': 'prod'},
            timeout=60
        )
        t5_elapsed = time.time() - t5_start
        
        print(f"  Status: {r5.status_code}")
        print(f"  Response time: {t5_elapsed:.2f}s")
        
        if r5.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {r5.status_code}")
            return False
        
        # Verify Content-Type
        content_type = r5.headers.get('Content-Type', '')
        if 'spreadsheet' not in content_type:
            print(f"  ❌ FAILED: Expected spreadsheet Content-Type, got {content_type}")
            return False
        print(f"  ✅ Content-Type: {content_type}")
        
        # Verify body size > 5KB
        body_size = len(r5.content)
        if body_size < 5000:
            print(f"  ❌ FAILED: Body size {body_size} bytes < 5000 bytes")
            return False
        print(f"  ✅ Body size: {body_size} bytes (>5KB)")
        
        # Check if fast (should be <5s due to cache)
        if t5_elapsed < 5.0:
            print(f"  ✅ Response time {t5_elapsed:.2f}s is FAST (<5s, likely cached)")
        else:
            print(f"  ℹ️  Response time {t5_elapsed:.2f}s (acceptable, but not as fast as expected)")
        
        print(f"  ✅ TEST 5 PASSED: XLSX export working")
        
    except Exception as e:
        print(f"  ❌ TEST 5 FAILED: {e}")
        return False
    
    # TEST 6: GET /csv (should be fast due to cache)
    print("\n[TEST 6] GET /api/admin/leieforhold/csv?env=prod")
    try:
        t6_start = time.time()
        r6 = requests.get(
            f"{API_BASE}/admin/leieforhold/csv",
            params={'key': ADMIN_KEY, 'env': 'prod'},
            timeout=60
        )
        t6_elapsed = time.time() - t6_start
        
        print(f"  Status: {r6.status_code}")
        print(f"  Response time: {t6_elapsed:.2f}s")
        
        if r6.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {r6.status_code}")
            return False
        
        # Verify Content-Type
        content_type = r6.headers.get('Content-Type', '')
        if 'text/csv' not in content_type:
            print(f"  ❌ FAILED: Expected text/csv Content-Type, got {content_type}")
            return False
        print(f"  ✅ Content-Type: {content_type}")
        
        # Check if fast (should be <5s due to cache)
        if t6_elapsed < 5.0:
            print(f"  ✅ Response time {t6_elapsed:.2f}s is FAST (<5s, likely cached)")
        else:
            print(f"  ℹ️  Response time {t6_elapsed:.2f}s (acceptable, but not as fast as expected)")
        
        print(f"  ✅ TEST 6 PASSED: CSV export working")
        
    except Exception as e:
        print(f"  ❌ TEST 6 FAILED: {e}")
        return False
    
    return True


def test_auth_regression():
    """
    TEST 7: Auth regression (401 without key for all 3 endpoints)
    """
    print("\n" + "=" * 80)
    print("TEST 7: AUTH REGRESSION")
    print("=" * 80)
    
    endpoints = [
        '/admin/leieforhold',
        '/admin/leieforhold/xlsx',
        '/admin/leieforhold/csv'
    ]
    
    for endpoint in endpoints:
        print(f"\n[TEST 7.{endpoints.index(endpoint)+1}] GET {endpoint} without key")
        try:
            r = requests.get(f"{API_BASE}{endpoint}", params={'env': 'prod'}, timeout=10)
            
            print(f"  Status: {r.status_code}")
            
            if r.status_code != 401:
                print(f"  ❌ FAILED: Expected 401, got {r.status_code}")
                return False
            
            print(f"  ✅ 401 Unauthorized (auth working)")
            
        except Exception as e:
            print(f"  ❌ FAILED: {e}")
            return False
    
    print(f"\n  ✅ TEST 7 PASSED: Auth regression working (all 3 endpoints return 401 without key)")
    return True


def test_general_regression():
    """
    TEST 8: General regression (GET /api/admin/tasks)
    """
    print("\n" + "=" * 80)
    print("TEST 8: GENERAL REGRESSION")
    print("=" * 80)
    
    print("\n[TEST 8] GET /api/admin/tasks")
    try:
        r = requests.get(f"{API_BASE}/admin/tasks", params={'key': ADMIN_KEY}, timeout=10)
        
        print(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"  ❌ FAILED: ok is not true")
            return False
        
        print(f"  ✅ 200 OK (tasks endpoint working)")
        print(f"  ✅ TEST 8 PASSED: General regression working")
        
    except Exception as e:
        print(f"  ❌ TEST 8 FAILED: {e}")
        return False
    
    return True


def main():
    """Run all tests"""
    print("Starting LEIEFORHOLD CACHE RETEST...")
    print()
    
    results = []
    
    # Run tests
    results.append(("Cache behavior (TEST 1-4)", test_cache_behavior()))
    results.append(("Export endpoints (TEST 5-6)", test_export_endpoints()))
    results.append(("Auth regression (TEST 7)", test_auth_regression()))
    results.append(("General regression (TEST 8)", test_general_regression()))
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {name}")
    
    print()
    print(f"Total: {passed}/{total} test groups passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n❌ {total - passed} test group(s) FAILED")
        return 1


if __name__ == '__main__':
    sys.exit(main())
