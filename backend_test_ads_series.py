#!/usr/bin/env python3
"""
Backend test for Google+Meta Ads overview endpoint - Daily time-series ("series") feature.
Tests the newly added daily time-series in /api/admin/ads/overview endpoint.
This is an ADDITIVE backend change - verify it works and did not break the existing contract.
"""

import requests
import sys
import time

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 35  # seconds (to measure response time, but assert responses are fast)

def test_ads_overview_series():
    """Test the new daily time-series feature in ads overview endpoint"""
    print("\n" + "="*80)
    print("TESTING: Daily Time-Series ('series') in Google+Meta Ads Overview Endpoint")
    print("="*80)
    
    passed = 0
    failed = 0
    
    # Test 1: GET /api/admin/ads/overview with googlePeriod=last_30d&metaPeriod=last_30d
    print("\n[TEST 1] GET /api/admin/ads/overview?key=...&googlePeriod=last_30d&metaPeriod=last_30d")
    try:
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY, "googlePeriod": "last_30d", "metaPeriod": "last_30d"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print(f"  Status: {response.status_code}")
        print(f"  Response time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            failed += 1
        else:
            data = response.json()
            
            # Verify response time < ~8s (ideally <1s on cache-hit)
            if elapsed > 8:
                print(f"  ⚠️  WARNING: Response time {elapsed:.2f}s > 8s (slow, but not critical)")
            else:
                print(f"  ✅ Response time {elapsed:.2f}s < 8s (good)")
            
            # Verify 'series' field exists and is an array
            if 'series' not in data:
                print(f"  ❌ FAILED: 'series' field missing in response")
                failed += 1
            elif not isinstance(data['series'], list):
                print(f"  ❌ FAILED: 'series' is not an array, got {type(data['series'])}")
                failed += 1
            else:
                series = data['series']
                print(f"  ✅ 'series' field exists and is an array with {len(series)} elements")
                
                # Verify each element has required keys
                if len(series) > 0:
                    sample = series[0]
                    required_keys = ['date', 'googleCost', 'metaCost', 'cost', 'googleClicks', 'metaClicks', 'clicks']
                    missing_keys = [k for k in required_keys if k not in sample]
                    
                    if missing_keys:
                        print(f"  ❌ FAILED: Missing keys in series element: {missing_keys}")
                        print(f"     Sample element: {sample}")
                        failed += 1
                    else:
                        print(f"  ✅ All required keys present: {required_keys}")
                        
                        # Verify date format (YYYY-MM-DD)
                        if not isinstance(sample['date'], str) or len(sample['date']) != 10:
                            print(f"  ❌ FAILED: date is not YYYY-MM-DD format: {sample['date']}")
                            failed += 1
                        else:
                            print(f"  ✅ date format is YYYY-MM-DD: {sample['date']}")
                        
                        # Verify all values are numbers
                        numeric_keys = ['googleCost', 'metaCost', 'cost', 'googleClicks', 'metaClicks', 'clicks']
                        non_numeric = [k for k in numeric_keys if not isinstance(sample[k], (int, float))]
                        if non_numeric:
                            print(f"  ❌ FAILED: Non-numeric values: {non_numeric}")
                            failed += 1
                        else:
                            print(f"  ✅ All numeric fields are numbers")
                        
                        # Verify math: cost ≈ googleCost + metaCost (allow ±0.05 rounding)
                        expected_cost = sample['googleCost'] + sample['metaCost']
                        cost_diff = abs(sample['cost'] - expected_cost)
                        if cost_diff > 0.05:
                            print(f"  ❌ FAILED: cost math incorrect: {sample['cost']} != {sample['googleCost']} + {sample['metaCost']} (diff: {cost_diff})")
                            failed += 1
                        else:
                            print(f"  ✅ cost math correct: {sample['cost']} ≈ {sample['googleCost']} + {sample['metaCost']} (diff: {cost_diff:.4f})")
                        
                        # Verify math: clicks == googleClicks + metaClicks
                        expected_clicks = sample['googleClicks'] + sample['metaClicks']
                        if sample['clicks'] != expected_clicks:
                            print(f"  ❌ FAILED: clicks math incorrect: {sample['clicks']} != {sample['googleClicks']} + {sample['metaClicks']}")
                            failed += 1
                        else:
                            print(f"  ✅ clicks math correct: {sample['clicks']} == {sample['googleClicks']} + {sample['metaClicks']}")
                        
                        passed += 1
                    
                    # Verify series is sorted ascending by date
                    if len(series) > 1:
                        dates = [s['date'] for s in series]
                        sorted_dates = sorted(dates)
                        if dates != sorted_dates:
                            print(f"  ❌ FAILED: series not sorted ascending by date")
                            print(f"     First 5 dates: {dates[:5]}")
                            print(f"     Expected: {sorted_dates[:5]}")
                            failed += 1
                        else:
                            print(f"  ✅ series is sorted ascending by date")
                            print(f"     Date range: {dates[0]} to {dates[-1]}")
                            passed += 1
                else:
                    print(f"  ⚠️  WARNING: series is empty (no data for period)")
                    passed += 1
            
            # Test 2: REGRESSION - verify all pre-existing fields still present
            print("\n[TEST 2] REGRESSION - Verify all pre-existing fields still present")
            required_fields = [
                'ok', 'empty', 'economics', 'meta', 'combined',
                'metaConfigured', 'metaLive', 'metaPeriod', 'metaFetchedAt',
                'googleConfigured', 'googleConnected', 'googleLive', 'googlePeriod', 
                'googleFetchedAt', 'googleStale', 'googleError'
            ]
            missing_fields = [f for f in required_fields if f not in data]
            if missing_fields:
                print(f"  ❌ FAILED: Missing pre-existing fields: {missing_fields}")
                failed += 1
            else:
                print(f"  ✅ All pre-existing fields present: {len(required_fields)} fields")
                passed += 1
    
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        failed += 1
    
    # Test 3: Period variation - last_7d
    print("\n[TEST 3] Period variation: googlePeriod=last_7d&metaPeriod=last_7d")
    try:
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY, "googlePeriod": "last_7d", "metaPeriod": "last_7d"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print(f"  Status: {response.status_code}")
        print(f"  Response time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            failed += 1
        else:
            data = response.json()
            if 'series' not in data or not isinstance(data['series'], list):
                print(f"  ❌ FAILED: 'series' field missing or not an array")
                failed += 1
            else:
                series_len = len(data['series'])
                print(f"  ✅ 'series' present as array with {series_len} elements (likely shorter for 7d)")
                passed += 1
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        failed += 1
    
    # Test 4: Period variation - last_90d
    print("\n[TEST 4] Period variation: googlePeriod=last_90d&metaPeriod=last_90d")
    try:
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY, "googlePeriod": "last_90d", "metaPeriod": "last_90d"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print(f"  Status: {response.status_code}")
        print(f"  Response time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            failed += 1
        else:
            data = response.json()
            if 'series' not in data or not isinstance(data['series'], list):
                print(f"  ❌ FAILED: 'series' field missing or not an array")
                failed += 1
            else:
                series_len = len(data['series'])
                print(f"  ✅ 'series' present as array with {series_len} elements (likely longer for 90d)")
                passed += 1
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        failed += 1
    
    # Test 5: Period variation - all
    print("\n[TEST 5] Period variation: googlePeriod=all&metaPeriod=all")
    try:
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY, "googlePeriod": "all", "metaPeriod": "all"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print(f"  Status: {response.status_code}")
        print(f"  Response time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            failed += 1
        else:
            data = response.json()
            if 'series' not in data or not isinstance(data['series'], list):
                print(f"  ❌ FAILED: 'series' field missing or not an array")
                failed += 1
            else:
                series_len = len(data['series'])
                print(f"  ✅ 'series' present as array with {series_len} elements")
                
                # Must not hang (>8s)
                if elapsed > 8:
                    print(f"  ⚠️  WARNING: Response time {elapsed:.2f}s > 8s (slow)")
                else:
                    print(f"  ✅ Response time {elapsed:.2f}s < 8s (did not hang)")
                
                passed += 1
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        failed += 1
    
    # Test 6: AUTH - without key should return 401
    print("\n[TEST 6] AUTH: GET /api/admin/ads/overview without key → 401")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            timeout=TIMEOUT
        )
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"  ❌ FAILED: Expected 401, got {response.status_code}")
            failed += 1
        else:
            print(f"  ✅ Correctly returned 401 without key")
            passed += 1
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        failed += 1
    
    # Test 7: REGRESSION - root endpoint
    print("\n[TEST 7] REGRESSION: GET /api/ → 200 {ok:true}")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            failed += 1
        else:
            data = response.json()
            if data.get('ok') != True:
                print(f"  ❌ FAILED: Expected ok:true, got {data}")
                failed += 1
            else:
                print(f"  ✅ Root endpoint working: {data}")
                passed += 1
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        failed += 1
    
    # Summary
    print("\n" + "="*80)
    print(f"SUMMARY: {passed} passed, {failed} failed")
    print("="*80)
    
    return failed == 0

if __name__ == "__main__":
    success = test_ads_overview_series()
    sys.exit(0 if success else 1)
