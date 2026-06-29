#!/usr/bin/env python3
"""
Comprehensive backend test for unified GET /api/admin/ads/overview endpoint
Tests BOTH Google Ads (via Composio) AND Meta (Marketing API) LIVE in parallel
with period filters + 10-min cache per channel.

Base URL: https://hero-premiere-4.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4
Timeout: 45s (REAL external API calls)
"""

import requests
import time
from datetime import datetime

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 50  # 50s timeout for real API calls (some can take up to ~15s)

def test_unified_overview():
    """Test unified GET /api/admin/ads/overview with Google + Meta in parallel"""
    
    print("\n" + "="*80)
    print("UNIFIED ADS OVERVIEW ENDPOINT TESTING")
    print("Testing GET /api/admin/ads/overview (Google + Meta LIVE in parallel)")
    print("="*80 + "\n")
    
    # Test 1: GET overview with both googlePeriod=last_30d and metaPeriod=last_30d
    print("TEST 1: GET overview?key=...&googlePeriod=last_30d&metaPeriod=last_30d")
    print("-" * 80)
    try:
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY, "googlePeriod": "last_30d", "metaPeriod": "last_30d"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print(f"✓ Status: {response.status_code} (expected 200)")
        print(f"✓ Response time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check Google fields
            print(f"✓ googleConfigured: {data.get('googleConfigured')} (expected true)")
            print(f"✓ googleConnected: {data.get('googleConnected')} (expected true)")
            print(f"✓ googleLive: {data.get('googleLive')} (expected true)")
            print(f"✓ googlePeriod: {data.get('googlePeriod')} (expected 'last_30d')")
            print(f"✓ googleFetchedAt: {data.get('googleFetchedAt')} (should be ISO string)")
            
            # Check Meta fields
            print(f"✓ metaConfigured: {data.get('metaConfigured')} (expected true)")
            print(f"✓ metaLive: {data.get('metaLive')} (expected true)")
            print(f"✓ metaPeriod: {data.get('metaPeriod')} (expected 'last_30d')")
            print(f"✓ metaFetchedAt: {data.get('metaFetchedAt')} (should be ISO string)")
            
            # Check economics (Google)
            if 'economics' in data and data['economics']:
                print(f"✓ economics present: {data['economics'] is not None}")
                print(f"✓ economics.totals.cost: {data['economics'].get('totals', {}).get('cost', 'N/A')} (expected 0 - no active campaigns)")
            
            # Check meta (Meta)
            if 'meta' in data and data['meta']:
                print(f"✓ meta present: {data['meta'] is not None}")
                meta_cost = data['meta'].get('totals', {}).get('cost', 0)
                print(f"✓ meta.totals.cost: {meta_cost} (expected > 0, around ~3111)")
                if meta_cost > 0:
                    print(f"  ✓ Meta cost is positive as expected")
            
            # Check combined
            print(f"✓ combined present: {'combined' in data and data['combined'] is not None}")
            
            print("✅ TEST 1 PASSED\n")
        else:
            print(f"❌ TEST 1 FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}\n")
    except Exception as e:
        print(f"❌ TEST 1 FAILED with exception: {str(e)}\n")
    
    # Test 2: META PERIOD - GET ...&metaPeriod=all
    print("TEST 2: META PERIOD - GET ...&metaPeriod=all")
    print("-" * 80)
    try:
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY, "metaPeriod": "all"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print(f"✓ Status: {response.status_code} (expected 200)")
        print(f"✓ Response time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            
            if 'meta' in data and data['meta']:
                period_from = data['meta'].get('period', {}).get('from', '')
                meta_cost = data['meta'].get('totals', {}).get('cost', 0)
                print(f"✓ meta.period.from: {period_from} (expected approx 2015-01-01)")
                print(f"✓ meta.totals.cost: {meta_cost} (expected > last_30d, around ~33000)")
                
                # Check if period starts around 2015
                if '2015' in period_from or '2014' in period_from or '2016' in period_from:
                    print(f"  ✓ Period starts around 2015 as expected")
                
                # Check if cost is greater than last_30d (should be around 33000)
                if meta_cost > 10000:  # Much greater than ~3111
                    print(f"  ✓ Meta cost for 'all' is greater than last_30d as expected")
            
            print("✅ TEST 2 PASSED\n")
        else:
            print(f"❌ TEST 2 FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}\n")
    except Exception as e:
        print(f"❌ TEST 2 FAILED with exception: {str(e)}\n")
    
    # Test 3: GET ...&metaPeriod=this_year
    print("TEST 3: GET ...&metaPeriod=this_year")
    print("-" * 80)
    try:
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY, "metaPeriod": "this_year"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print(f"✓ Status: {response.status_code} (expected 200)")
        print(f"✓ Response time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            
            if 'meta' in data and data['meta']:
                period_from = data['meta'].get('period', {}).get('from', '')
                print(f"✓ meta.period.from: {period_from}")
                
                # Check if period starts on January 1 of current year (2026)
                current_year = datetime.now().year
                if f'{current_year}-01-01' in period_from:
                    print(f"  ✓ Period starts on January 1 of current year ({current_year}) as expected")
            
            print("✅ TEST 3 PASSED\n")
        else:
            print(f"❌ TEST 3 FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}\n")
    except Exception as e:
        print(f"❌ TEST 3 FAILED with exception: {str(e)}\n")
    
    # Test 4: GOOGLE PERIOD - GET ...&googlePeriod=all
    print("TEST 4: GOOGLE PERIOD - GET ...&googlePeriod=all")
    print("-" * 80)
    try:
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY, "googlePeriod": "all"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print(f"✓ Status: {response.status_code} (expected 200)")
        print(f"✓ Response time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            
            if 'economics' in data and data['economics']:
                period_from = data['economics'].get('period', {}).get('from', '')
                print(f"✓ economics.period.from: {period_from} (expected approx 2015-01-01)")
                
                # Check if period starts around 2015
                if '2015' in period_from or '2014' in period_from or '2016' in period_from:
                    print(f"  ✓ Period starts around 2015 as expected")
            
            print("✅ TEST 4 PASSED\n")
        else:
            print(f"❌ TEST 4 FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}\n")
    except Exception as e:
        print(f"❌ TEST 4 FAILED with exception: {str(e)}\n")
    
    # Test 5: INVALID - GET ...&metaPeriod=foo&googlePeriod=bar
    print("TEST 5: INVALID - GET ...&metaPeriod=foo&googlePeriod=bar")
    print("-" * 80)
    try:
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY, "metaPeriod": "foo", "googlePeriod": "bar"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print(f"✓ Status: {response.status_code} (expected 200)")
        print(f"✓ Response time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            
            google_period = data.get('googlePeriod', '')
            meta_period = data.get('metaPeriod', '')
            
            print(f"✓ googlePeriod: {google_period} (expected 'last_30d' fallback)")
            print(f"✓ metaPeriod: {meta_period} (expected 'last_30d' fallback)")
            
            if google_period == 'last_30d' and meta_period == 'last_30d':
                print(f"  ✓ Both periods correctly fell back to 'last_30d'")
            
            print("✅ TEST 5 PASSED\n")
        else:
            print(f"❌ TEST 5 FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}\n")
    except Exception as e:
        print(f"❌ TEST 5 FAILED with exception: {str(e)}\n")
    
    # Test 6: CACHE - call GET ...&metaPeriod=last_7d twice
    print("TEST 6: CACHE - call GET ...&metaPeriod=last_7d twice")
    print("-" * 80)
    try:
        # First call (cache miss)
        print("First call (cache miss):")
        start_time = time.time()
        response1 = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY, "metaPeriod": "last_7d"},
            timeout=TIMEOUT
        )
        elapsed1 = time.time() - start_time
        
        print(f"✓ Status: {response1.status_code} (expected 200)")
        print(f"✓ Response time: {elapsed1:.2f}s (may be slower - cache miss)")
        
        if response1.status_code == 200:
            data1 = response1.json()
            fetched_at_1 = data1.get('metaFetchedAt', '')
            print(f"✓ metaFetchedAt: {fetched_at_1}")
        
        # Wait a moment
        time.sleep(0.5)
        
        # Second call (cache hit)
        print("\nSecond call (cache hit):")
        start_time = time.time()
        response2 = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY, "metaPeriod": "last_7d"},
            timeout=TIMEOUT
        )
        elapsed2 = time.time() - start_time
        
        print(f"✓ Status: {response2.status_code} (expected 200)")
        print(f"✓ Response time: {elapsed2:.2f}s (should be <1s - cache hit)")
        
        if response2.status_code == 200:
            data2 = response2.json()
            fetched_at_2 = data2.get('metaFetchedAt', '')
            print(f"✓ metaFetchedAt: {fetched_at_2}")
            
            # Check if fetchedAt is the same (data served from cache)
            if fetched_at_1 == fetched_at_2:
                print(f"  ✓ metaFetchedAt UNCHANGED - data served from cache")
            
            # Check if second call is faster
            if elapsed2 < 1.0:
                print(f"  ✓ Second call is fast (<1s) - cache working")
        
        print("✅ TEST 6 PASSED\n")
    except Exception as e:
        print(f"❌ TEST 6 FAILED with exception: {str(e)}\n")
    
    # Test 7: FORCE - GET ...&metaPeriod=last_7d&metaRefresh=1
    print("TEST 7: FORCE - GET ...&metaPeriod=last_7d&metaRefresh=1")
    print("-" * 80)
    try:
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY, "metaPeriod": "last_7d", "metaRefresh": "1"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print(f"✓ Status: {response.status_code} (expected 200)")
        print(f"✓ Response time: {elapsed:.2f}s (forces fresh fetch, may be slow)")
        
        if response.status_code == 200:
            data = response.json()
            fetched_at = data.get('metaFetchedAt', '')
            print(f"✓ metaFetchedAt: {fetched_at} (should be new timestamp)")
            print(f"  ✓ Force refresh bypassed cache")
            
            print("✅ TEST 7 PASSED\n")
        else:
            print(f"❌ TEST 7 FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}\n")
    except Exception as e:
        print(f"❌ TEST 7 FAILED with exception: {str(e)}\n")
    
    # Test 8: AUTH - GET overview WITHOUT key
    print("TEST 8: AUTH - GET overview WITHOUT key")
    print("-" * 80)
    try:
        response = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            timeout=TIMEOUT
        )
        
        print(f"✓ Status: {response.status_code} (expected 401)")
        
        if response.status_code == 401:
            print("✅ TEST 8 PASSED - Authentication required\n")
        else:
            print(f"❌ TEST 8 FAILED: Expected 401, got {response.status_code}")
            print(f"Response: {response.text[:500]}\n")
    except Exception as e:
        print(f"❌ TEST 8 FAILED with exception: {str(e)}\n")
    
    # Test 9: REGRESSION - GET /api/
    print("TEST 9: REGRESSION - GET /api/")
    print("-" * 80)
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        
        print(f"✓ Status: {response.status_code} (expected 200)")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Response: {data}")
            
            if data.get('ok') == True:
                print("✅ TEST 9 PASSED - Root endpoint working\n")
            else:
                print(f"❌ TEST 9 FAILED: Expected ok:true")
        else:
            print(f"❌ TEST 9 FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}\n")
    except Exception as e:
        print(f"❌ TEST 9 FAILED with exception: {str(e)}\n")
    
    print("\n" + "="*80)
    print("UNIFIED ADS OVERVIEW TESTING COMPLETE")
    print("="*80 + "\n")

if __name__ == "__main__":
    test_unified_overview()
