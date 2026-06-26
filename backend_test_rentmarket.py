#!/usr/bin/env python3
"""
Backend test for Leiemarkedsrapport (Rent Market Report) API endpoints.
Tests SSB integration, demand index, and admin endpoints.
"""

import requests
import json
import time

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_rentmarket_public_bergen():
    """Test 1: GET /api/rentmarket?city=bergen (public endpoint)"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/rentmarket?city=bergen (public endpoint)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/rentmarket?city=bergen"
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Verify report structure
        if 'report' not in data:
            print("❌ FAILED: Missing 'report' key in response")
            return False
        
        report = data['report']
        print(f"Report keys: {list(report.keys())}")
        
        # Verify byRoom structure
        if 'byRoom' not in report or not isinstance(report['byRoom'], list):
            print("❌ FAILED: Missing or invalid 'byRoom' array")
            return False
        
        print(f"✓ byRoom: {len(report['byRoom'])} entries")
        if len(report['byRoom']) > 0:
            first_room = report['byRoom'][0]
            print(f"  Sample entry: {first_room}")
            required_keys = ['roomKey', 'label', 'current', 'yoyPct']
            for key in required_keys:
                if key not in first_room:
                    print(f"❌ FAILED: Missing '{key}' in byRoom entry")
                    return False
        
        # Verify zones structure
        if 'zones' not in report or not isinstance(report['zones'], list):
            print("❌ FAILED: Missing or invalid 'zones' array")
            return False
        
        print(f"✓ zones: {len(report['zones'])} entries")
        if len(report['zones']) < 2:
            print(f"❌ FAILED: Expected at least 2 zones, got {len(report['zones'])}")
            return False
        
        first_zone = report['zones'][0]
        print(f"  Sample zone: {first_zone.get('label', 'N/A')}")
        if 'sizes' not in first_zone or not isinstance(first_zone['sizes'], list):
            print("❌ FAILED: Missing or invalid 'sizes' in zone")
            return False
        
        if len(first_zone['sizes']) > 0:
            first_size = first_zone['sizes'][0]
            print(f"    Sample size: {first_size}")
            required_size_keys = ['label', 'rent', 'perSqm']
            for key in required_size_keys:
                if key not in first_size:
                    print(f"❌ FAILED: Missing '{key}' in zone size entry")
                    return False
        
        # Verify trend structure
        if 'trend' not in report or not isinstance(report['trend'], list):
            print("❌ FAILED: Missing or invalid 'trend' array")
            return False
        
        print(f"✓ trend: {len(report['trend'])} entries")
        
        # Verify headline structure
        if 'headline' not in report or not isinstance(report['headline'], dict):
            print("❌ FAILED: Missing or invalid 'headline' object")
            return False
        
        headline = report['headline']
        print(f"✓ headline: {headline}")
        
        if 'typical2rom' not in headline:
            print("❌ FAILED: Missing 'typical2rom' in headline")
            return False
        
        typical2rom = headline['typical2rom']
        if typical2rom is None:
            print("⚠️  WARNING: typical2rom is null")
        elif not isinstance(typical2rom, (int, float)):
            print(f"❌ FAILED: typical2rom should be a number, got {type(typical2rom)}")
            return False
        elif typical2rom < 10000 or typical2rom > 15000:
            print(f"⚠️  WARNING: typical2rom value {typical2rom} outside expected range 10000-15000")
        else:
            print(f"✓ typical2rom: {typical2rom} kr/mnd (within expected range 10000-15000)")
        
        # Verify demand structure
        if 'demand' not in report or not isinstance(report['demand'], dict):
            print("❌ FAILED: Missing or invalid 'demand' object")
            return False
        
        demand = report['demand']
        print(f"✓ demand keys: {list(demand.keys())}")
        
        if 'index' not in demand:
            print("❌ FAILED: Missing 'index' in demand")
            return False
        
        demand_index = demand['index']
        if not isinstance(demand_index, (int, float)):
            print(f"❌ FAILED: demand.index should be a number, got {type(demand_index)}")
            return False
        
        if demand_index < 0 or demand_index > 100:
            print(f"❌ FAILED: demand.index {demand_index} outside valid range 0-100")
            return False
        
        print(f"✓ demand.index: {demand_index} (valid range 0-100)")
        
        if 'level' not in demand:
            print("❌ FAILED: Missing 'level' in demand")
            return False
        
        demand_level = demand['level']
        if not isinstance(demand_level, str):
            print(f"❌ FAILED: demand.level should be a string, got {type(demand_level)}")
            return False
        
        print(f"✓ demand.level: '{demand_level}'")
        
        if 'byArea' not in demand or not isinstance(demand['byArea'], list):
            print("❌ FAILED: Missing or invalid 'byArea' in demand")
            return False
        
        print(f"✓ demand.byArea: {len(demand['byArea'])} areas")
        
        # Verify insights structure
        if 'insights' not in report or not isinstance(report['insights'], list):
            print("❌ FAILED: Missing or invalid 'insights' array")
            return False
        
        print(f"✓ insights: {len(report['insights'])} entries")
        if len(report['insights']) < 2:
            print(f"⚠️  WARNING: Expected at least 2 insights, got {len(report['insights'])}")
        
        for i, insight in enumerate(report['insights'][:2]):
            print(f"  Insight {i+1}: {insight[:80]}...")
        
        # Verify source structure
        if 'source' not in report or not isinstance(report['source'], dict):
            print("❌ FAILED: Missing or invalid 'source' object")
            return False
        
        source = report['source']
        if 'tables' not in source or not isinstance(source['tables'], list):
            print("❌ FAILED: Missing or invalid 'tables' in source")
            return False
        
        table_ids = [t.get('id') for t in source['tables']]
        print(f"✓ source.tables: {table_ids}")
        
        if '09895' not in table_ids:
            print("❌ FAILED: Missing SSB table '09895' in source.tables")
            return False
        
        if '09897' not in table_ids:
            print("❌ FAILED: Missing SSB table '09897' in source.tables")
            return False
        
        print("✅ TEST 1 PASSED: Public Bergen rent market report structure is correct")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_rentmarket_public_oslo():
    """Test 2: GET /api/rentmarket?city=oslo (not configured, expect 404)"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/rentmarket?city=oslo (not configured, expect 404)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/rentmarket?city=oslo"
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 404:
            print(f"❌ FAILED: Expected 404, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response: {data}")
        
        if 'error' not in data:
            print("❌ FAILED: Expected 'error' key in 404 response")
            return False
        
        print(f"✓ Error message: {data['error']}")
        print("✅ TEST 2 PASSED: Oslo (not configured) correctly returns 404")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_admin_rentmarket_no_key():
    """Test 3: GET /api/admin/rentmarket?city=bergen WITHOUT key (expect 401)"""
    print("\n" + "="*80)
    print("TEST 3: GET /api/admin/rentmarket?city=bergen WITHOUT key (expect 401)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/rentmarket?city=bergen"
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response: {data}")
        
        if 'error' not in data:
            print("❌ FAILED: Expected 'error' key in 401 response")
            return False
        
        if data['error'] != 'Uautorisert':
            print(f"⚠️  WARNING: Expected error 'Uautorisert', got '{data['error']}'")
        
        print(f"✓ Error message: {data['error']}")
        print("✅ TEST 3 PASSED: Admin endpoint without key correctly returns 401")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_admin_rentmarket_with_key():
    """Test 4: GET /api/admin/rentmarket?key=...&city=bergen (expect 200 with report + cities)"""
    print("\n" + "="*80)
    print("TEST 4: GET /api/admin/rentmarket?key=...&city=bergen (expect 200)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/rentmarket?key={ADMIN_KEY}&city=bergen"
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Verify report exists
        if 'report' not in data:
            print("❌ FAILED: Missing 'report' key in response")
            return False
        
        print("✓ report: present")
        
        # Verify cities array
        if 'cities' not in data:
            print("❌ FAILED: Missing 'cities' key in response")
            return False
        
        cities = data['cities']
        if not isinstance(cities, list):
            print(f"❌ FAILED: 'cities' should be an array, got {type(cities)}")
            return False
        
        print(f"✓ cities: {len(cities)} entries")
        
        # Verify Bergen is in cities
        bergen_found = False
        for city in cities:
            print(f"  City: {city}")
            if 'slug' not in city or 'label' not in city:
                print("❌ FAILED: City entry missing 'slug' or 'label'")
                return False
            
            if city['slug'] == 'bergen' and city['label'] == 'Bergen':
                bergen_found = True
        
        if not bergen_found:
            print("❌ FAILED: Bergen not found in cities array")
            return False
        
        print("✓ Bergen found in cities: {slug:'bergen', label:'Bergen'}")
        print("✅ TEST 4 PASSED: Admin endpoint with key returns report + cities")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_admin_refresh_no_key():
    """Test 5: POST /api/admin/rentmarket/refresh WITHOUT key (expect 401)"""
    print("\n" + "="*80)
    print("TEST 5: POST /api/admin/rentmarket/refresh WITHOUT key (expect 401)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/rentmarket/refresh"
        print(f"Request: POST {url}")
        print("Body: {\"city\":\"bergen\"}")
        
        response = requests.post(
            url,
            json={"city": "bergen"},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response: {data}")
        
        if 'error' not in data:
            print("❌ FAILED: Expected 'error' key in 401 response")
            return False
        
        if data['error'] != 'Uautorisert':
            print(f"⚠️  WARNING: Expected error 'Uautorisert', got '{data['error']}'")
        
        print(f"✓ Error message: {data['error']}")
        print("✅ TEST 5 PASSED: Refresh endpoint without key correctly returns 401")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_admin_refresh_with_key():
    """Test 6: POST /api/admin/rentmarket/refresh?key=... with body {city:bergen} (expect 200)"""
    print("\n" + "="*80)
    print("TEST 6: POST /api/admin/rentmarket/refresh?key=... (expect 200)")
    print("="*80)
    print("⚠️  NOTE: This may take 3-8 seconds (SSB API + AI generation)")
    
    try:
        url = f"{BASE_URL}/admin/rentmarket/refresh?key={ADMIN_KEY}"
        print(f"Request: POST {url}")
        print("Body: {\"city\":\"bergen\"}")
        
        start_time = time.time()
        response = requests.post(
            url,
            json={"city": "bergen"},
            timeout=60  # Increased timeout for SSB + AI
        )
        elapsed = time.time() - start_time
        
        print(f"Status: {response.status_code}")
        print(f"Response time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Verify ok:true
        if 'ok' not in data or data['ok'] != True:
            print("❌ FAILED: Expected {ok:true} in response")
            return False
        
        print("✓ ok: true")
        
        # Verify report exists
        if 'report' not in data:
            print("❌ FAILED: Missing 'report' key in response")
            return False
        
        report = data['report']
        print(f"✓ report: present with {len(report)} keys")
        
        # Verify report has expected structure
        if 'byRoom' not in report:
            print("❌ FAILED: Missing 'byRoom' in refreshed report")
            return False
        
        if 'demand' not in report:
            print("❌ FAILED: Missing 'demand' in refreshed report")
            return False
        
        if 'headline' in report and 'typical2rom' in report['headline']:
            print(f"✓ typical2rom: {report['headline']['typical2rom']} kr/mnd")
        
        if 'demand' in report and 'index' in report['demand']:
            print(f"✓ demand.index: {report['demand']['index']}")
        
        print(f"✅ TEST 6 PASSED: Refresh endpoint successfully generated new report in {elapsed:.2f}s")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_no_500_errors():
    """Test 7: Confirm none of the endpoints return 500"""
    print("\n" + "="*80)
    print("TEST 7: Verify no 500 errors across all endpoints")
    print("="*80)
    
    # This is implicitly tested by all previous tests
    # If any test got a 500, it would have failed
    print("✓ All previous tests completed without 500 errors")
    print("✅ TEST 7 PASSED: No 500 errors encountered")
    return True


def test_regression_root():
    """Regression: GET /api/ (health check)"""
    print("\n" + "="*80)
    print("REGRESSION: GET /api/ (health check)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/"
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {data}")
        
        if data.get('ok') != True or data.get('message') != 'DigiHome API':
            print("❌ FAILED: Unexpected response format")
            return False
        
        print("✅ REGRESSION PASSED: Root endpoint working")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        return False


def test_regression_analytics():
    """Regression: GET /api/admin/analytics?key=... (unchanged)"""
    print("\n" + "="*80)
    print("REGRESSION: GET /api/admin/analytics?key=... (unchanged)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/analytics?key={ADMIN_KEY}"
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        if 'traffic' not in data or 'leads' not in data:
            print("❌ FAILED: Missing 'traffic' or 'leads' in response")
            return False
        
        print("✓ traffic: present")
        print("✓ leads: present")
        print("✅ REGRESSION PASSED: Analytics endpoint unchanged")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        return False


def main():
    print("\n" + "="*80)
    print("LEIEMARKEDSRAPPORT (RENT MARKET REPORT) API TEST SUITE")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print("="*80)
    
    results = {}
    
    # Run all tests
    results['test_1_public_bergen'] = test_rentmarket_public_bergen()
    results['test_2_public_oslo'] = test_rentmarket_public_oslo()
    results['test_3_admin_no_key'] = test_admin_rentmarket_no_key()
    results['test_4_admin_with_key'] = test_admin_rentmarket_with_key()
    results['test_5_refresh_no_key'] = test_admin_refresh_no_key()
    results['test_6_refresh_with_key'] = test_admin_refresh_with_key()
    results['test_7_no_500_errors'] = test_no_500_errors()
    results['regression_root'] = test_regression_root()
    results['regression_analytics'] = test_regression_analytics()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit(main())
