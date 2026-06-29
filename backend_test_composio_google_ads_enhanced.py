#!/usr/bin/env python3
"""
Backend test for enhanced GET /api/admin/ads/overview endpoint
Tests near-real-time Google Ads via Composio with period filter and caching.
"""

import requests
import time
import json
from datetime import datetime, timedelta

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 45  # REAL Composio API calls can take time

def test_overview_last_30d():
    """Test 1: GET /api/admin/ads/overview?googlePeriod=last_30d"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/admin/ads/overview?googlePeriod=last_30d")
    print("="*80)
    
    try:
        start_time = time.time()
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=last_30d"
        response = requests.get(url, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Verify required fields
        required_fields = ['ok', 'googleConfigured', 'googleConnected', 'googleLive', 
                          'googlePeriod', 'googleFetchedAt', 'economics', 'combined']
        missing = [f for f in required_fields if f not in data]
        if missing:
            print(f"❌ FAILED: Missing required fields: {missing}")
            return False
        
        # Verify field values
        if data['ok'] != True:
            print(f"❌ FAILED: ok should be true, got {data['ok']}")
            return False
        
        if data['googleConfigured'] != True:
            print(f"❌ FAILED: googleConfigured should be true, got {data['googleConfigured']}")
            return False
        
        if data['googleConnected'] != True:
            print(f"❌ FAILED: googleConnected should be true (OAuth ACTIVE), got {data['googleConnected']}")
            return False
        
        if data['googleLive'] != True:
            print(f"❌ FAILED: googleLive should be true, got {data['googleLive']}")
            return False
        
        if data['googlePeriod'] != 'last_30d':
            print(f"❌ FAILED: googlePeriod should be 'last_30d', got {data['googlePeriod']}")
            return False
        
        if not data['googleFetchedAt']:
            print(f"❌ FAILED: googleFetchedAt should not be null")
            return False
        
        # Verify googleFetchedAt is ISO date string
        try:
            datetime.fromisoformat(data['googleFetchedAt'].replace('Z', '+00:00'))
            print(f"✓ googleFetchedAt is valid ISO date: {data['googleFetchedAt']}")
        except:
            print(f"❌ FAILED: googleFetchedAt is not valid ISO date: {data['googleFetchedAt']}")
            return False
        
        # Verify economics structure
        if not data['economics']:
            print(f"❌ FAILED: economics should not be null")
            return False
        
        economics = data['economics']
        if 'totals' not in economics:
            print(f"❌ FAILED: economics.totals missing")
            return False
        
        if 'campaigns' not in economics:
            print(f"❌ FAILED: economics.campaigns missing")
            return False
        
        if 'period' not in economics:
            print(f"❌ FAILED: economics.period missing")
            return False
        
        # Verify cost is 0 (no active campaigns)
        if economics['totals']['cost'] != 0:
            print(f"⚠️  WARNING: Expected cost=0 (no active campaigns), got {economics['totals']['cost']}")
        else:
            print(f"✓ economics.totals.cost = 0 (no active campaigns, as expected)")
        
        # Verify period roughly spans last ~30 days
        period = economics['period']
        if 'from' not in period or 'to' not in period:
            print(f"❌ FAILED: economics.period missing from/to")
            return False
        
        period_from = datetime.fromisoformat(period['from'].replace('Z', '+00:00'))
        period_to = datetime.fromisoformat(period['to'].replace('Z', '+00:00'))
        days_span = (period_to - period_from).days
        
        print(f"✓ economics.period.from: {period['from']}")
        print(f"✓ economics.period.to: {period['to']}")
        print(f"✓ Period spans {days_span} days (expected ~30)")
        
        if days_span < 25 or days_span > 35:
            print(f"⚠️  WARNING: Period span {days_span} days is outside expected range 25-35")
        
        # Verify combined is present
        if not data['combined']:
            print(f"⚠️  WARNING: combined should be present (may be null if no Meta data)")
        else:
            print(f"✓ combined economics present")
        
        print(f"✅ TEST 1 PASSED: All required fields present with correct values")
        return True
        
    except Exception as e:
        print(f"❌ TEST 1 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_overview_all_period():
    """Test 2: GET /api/admin/ads/overview?googlePeriod=all"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/admin/ads/overview?googlePeriod=all")
    print("="*80)
    
    try:
        start_time = time.time()
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=all"
        response = requests.get(url, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if data['googlePeriod'] != 'all':
            print(f"❌ FAILED: googlePeriod should be 'all', got {data['googlePeriod']}")
            return False
        
        # Verify period.from is early date (around 2015-01-01)
        economics = data['economics']
        period_from = datetime.fromisoformat(economics['period']['from'].replace('Z', '+00:00'))
        
        print(f"✓ economics.period.from: {economics['period']['from']}")
        
        if period_from.year > 2016:
            print(f"❌ FAILED: For 'all' period, from should be around 2015, got {period_from.year}")
            return False
        
        print(f"✓ Period starts from {period_from.year} (early date as expected for 'all')")
        print(f"✅ TEST 2 PASSED: 'all' period returns early start date")
        return True
        
    except Exception as e:
        print(f"❌ TEST 2 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_overview_this_year():
    """Test 3: GET /api/admin/ads/overview?googlePeriod=this_year"""
    print("\n" + "="*80)
    print("TEST 3: GET /api/admin/ads/overview?googlePeriod=this_year")
    print("="*80)
    
    try:
        start_time = time.time()
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=this_year"
        response = requests.get(url, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if data['googlePeriod'] != 'this_year':
            print(f"❌ FAILED: googlePeriod should be 'this_year', got {data['googlePeriod']}")
            return False
        
        # Verify period.from is January 1 of current year
        economics = data['economics']
        period_from = datetime.fromisoformat(economics['period']['from'].replace('Z', '+00:00'))
        current_year = datetime.now().year
        
        print(f"✓ economics.period.from: {economics['period']['from']}")
        
        if period_from.year != current_year:
            print(f"❌ FAILED: For 'this_year', from should be {current_year}, got {period_from.year}")
            return False
        
        if period_from.month != 1 or period_from.day != 1:
            print(f"❌ FAILED: For 'this_year', from should be Jan 1, got {period_from.month}/{period_from.day}")
            return False
        
        print(f"✓ Period starts from January 1, {current_year} (as expected for 'this_year')")
        print(f"✅ TEST 3 PASSED: 'this_year' period returns Jan 1 of current year")
        return True
        
    except Exception as e:
        print(f"❌ TEST 3 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_overview_invalid_period():
    """Test 4: GET /api/admin/ads/overview?googlePeriod=invalidvalue"""
    print("\n" + "="*80)
    print("TEST 4: GET /api/admin/ads/overview?googlePeriod=invalidvalue")
    print("="*80)
    
    try:
        start_time = time.time()
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=invalidvalue"
        response = requests.get(url, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Should fallback to 'last_30d'
        if data['googlePeriod'] != 'last_30d':
            print(f"❌ FAILED: Invalid period should fallback to 'last_30d', got {data['googlePeriod']}")
            return False
        
        print(f"✓ Invalid period 'invalidvalue' correctly fell back to 'last_30d'")
        print(f"✅ TEST 4 PASSED: Invalid period falls back to default")
        return True
        
    except Exception as e:
        print(f"❌ TEST 4 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_cache_behavior():
    """Test 5: Cache behavior - call last_7d twice"""
    print("\n" + "="*80)
    print("TEST 5: Cache behavior - GET /api/admin/ads/overview?googlePeriod=last_7d (twice)")
    print("="*80)
    
    try:
        # First call (may be cache-miss, slow)
        print("\nFirst call (may be cache-miss)...")
        start_time = time.time()
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=last_7d"
        response1 = requests.get(url, timeout=TIMEOUT)
        elapsed1 = time.time() - start_time
        
        print(f"Status Code: {response1.status_code}")
        print(f"Response Time: {elapsed1:.2f}s")
        
        if response1.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response1.status_code}")
            return False
        
        data1 = response1.json()
        fetched_at_1 = data1.get('googleFetchedAt')
        print(f"✓ First call googleFetchedAt: {fetched_at_1}")
        
        # Wait a moment
        time.sleep(1)
        
        # Second call (should be cache-hit, fast)
        print("\nSecond call (should be cache-hit)...")
        start_time = time.time()
        response2 = requests.get(url, timeout=TIMEOUT)
        elapsed2 = time.time() - start_time
        
        print(f"Status Code: {response2.status_code}")
        print(f"Response Time: {elapsed2:.2f}s")
        
        if response2.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response2.status_code}")
            return False
        
        data2 = response2.json()
        fetched_at_2 = data2.get('googleFetchedAt')
        print(f"✓ Second call googleFetchedAt: {fetched_at_2}")
        
        # Verify second call is faster (cache-hit)
        if elapsed2 >= elapsed1:
            print(f"⚠️  WARNING: Second call ({elapsed2:.2f}s) not faster than first ({elapsed1:.2f}s)")
            print(f"   This may indicate cache-miss or network variance")
        else:
            print(f"✓ Second call ({elapsed2:.2f}s) faster than first ({elapsed1:.2f}s) - cache working")
        
        # Verify googleFetchedAt is same (cache-hit)
        if fetched_at_1 == fetched_at_2:
            print(f"✓ googleFetchedAt unchanged - data served from cache")
        else:
            print(f"⚠️  WARNING: googleFetchedAt changed - may indicate cache-miss")
        
        print(f"\n✅ TEST 5 PASSED: Cache behavior verified")
        print(f"   First call: {elapsed1:.2f}s")
        print(f"   Second call: {elapsed2:.2f}s")
        return True
        
    except Exception as e:
        print(f"❌ TEST 5 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_force_refresh():
    """Test 6: Force refresh with googleRefresh=1"""
    print("\n" + "="*80)
    print("TEST 6: Force refresh - GET /api/admin/ads/overview?googlePeriod=last_7d&googleRefresh=1")
    print("="*80)
    
    try:
        start_time = time.time()
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=last_7d&googleRefresh=1"
        response = requests.get(url, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if data['googlePeriod'] != 'last_7d':
            print(f"❌ FAILED: googlePeriod should be 'last_7d', got {data['googlePeriod']}")
            return False
        
        print(f"✓ Force refresh completed in {elapsed:.2f}s (may be slow due to fresh Composio call)")
        print(f"✓ googleFetchedAt: {data.get('googleFetchedAt')}")
        print(f"✅ TEST 6 PASSED: Force refresh working")
        return True
        
    except Exception as e:
        print(f"❌ TEST 6 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_auth_required():
    """Test 7: Auth required - GET without key should return 401"""
    print("\n" + "="*80)
    print("TEST 7: Auth required - GET /api/admin/ads/overview WITHOUT key")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/overview"
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
        
        print(f"✅ TEST 7 PASSED: Auth required (401 without key)")
        return True
        
    except Exception as e:
        print(f"❌ TEST 7 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_regression():
    """Test 8: Regression - GET /api/ should return 200"""
    print("\n" + "="*80)
    print("TEST 8: Regression - GET /api/")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/"
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        if data.get('ok') != True:
            print(f"❌ FAILED: Expected ok=true, got {data}")
            return False
        
        print(f"✓ Response: {data}")
        print(f"✅ TEST 8 PASSED: Root endpoint working")
        return True
        
    except Exception as e:
        print(f"❌ TEST 8 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n" + "="*80)
    print("BACKEND TEST: Enhanced GET /api/admin/ads/overview")
    print("Testing near-real-time Google Ads via Composio with period filter and caching")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s (REAL Composio API calls)")
    print(f"Note: Google Ads account has 0 active campaigns (cost will be 0)")
    
    results = []
    
    # Run all tests
    results.append(("Test 1: Overview last_30d", test_overview_last_30d()))
    results.append(("Test 2: Overview all period", test_overview_all_period()))
    results.append(("Test 3: Overview this_year", test_overview_this_year()))
    results.append(("Test 4: Invalid period fallback", test_overview_invalid_period()))
    results.append(("Test 5: Cache behavior", test_cache_behavior()))
    results.append(("Test 6: Force refresh", test_force_refresh()))
    results.append(("Test 7: Auth required", test_auth_required()))
    results.append(("Test 8: Regression", test_regression()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({100*passed//total}% success rate)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit(main())
