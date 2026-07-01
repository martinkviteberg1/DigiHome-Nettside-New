#!/usr/bin/env python3
"""
Backend test for NEW landing pages performance endpoint.
Tests GET /api/admin/landing-pages (computeLandingPages) — catalog + traffic/leads/conversion per /lp/{slug}.
"""

import requests
import sys
import json
from typing import Dict, Any

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60  # Real DB queries

# Expected slugs
HUSEIER_SLUGS = {'forvaltning', 'inntekt', '10pluss2', 'arvet-bolig', 'airbnb-langtid'}
LEIETAKER_SLUG = 'leietaker'

def test_landing_pages_endpoint():
    """Test 1: GET /api/admin/landing-pages?key=...&days=30 → 200 with correct structure"""
    print("\n=== Test 1: Landing pages endpoint with days=30 ===")
    try:
        url = f"{BASE_URL}/admin/landing-pages?key={ADMIN_KEY}&days=30"
        print(f"GET {url}")
        resp = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {resp.status_code}, Time: {resp.elapsed.total_seconds():.2f}s")
        
        if resp.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            return False
        
        data = resp.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Check top-level structure
        if not data.get('ok'):
            print(f"❌ FAIL: ok field is not true: {data.get('ok')}")
            return False
        print("✓ ok=true")
        
        if 'pages' not in data:
            print(f"❌ FAIL: Missing 'pages' field")
            return False
        if not isinstance(data['pages'], list):
            print(f"❌ FAIL: 'pages' is not an array, got {type(data['pages'])}")
            return False
        print(f"✓ pages is array with {len(data['pages'])} elements")
        
        if 'totals' not in data:
            print(f"❌ FAIL: Missing 'totals' field")
            return False
        if not isinstance(data['totals'], dict):
            print(f"❌ FAIL: 'totals' is not an object, got {type(data['totals'])}")
            return False
        print(f"✓ totals is object")
        
        if 'range' not in data:
            print(f"❌ FAIL: Missing 'range' field")
            return False
        print(f"✓ range is present")
        
        # Check pages array length
        pages = data['pages']
        if len(pages) < 6:
            print(f"❌ FAIL: Expected at least 6 pages, got {len(pages)}")
            return False
        print(f"✓ pages array has at least 6 elements ({len(pages)} total)")
        
        # Check for leietaker page
        leietaker_pages = [p for p in pages if p.get('slug') == LEIETAKER_SLUG and p.get('audience') == 'leietaker']
        if len(leietaker_pages) != 1:
            print(f"❌ FAIL: Expected exactly 1 leietaker page, found {len(leietaker_pages)}")
            print(f"Leietaker pages: {leietaker_pages}")
            return False
        print(f"✓ Exactly one page with slug='leietaker' AND audience='leietaker'")
        
        # Check for huseier pages
        huseier_pages = [p for p in pages if p.get('audience') == 'huseier']
        huseier_slugs_found = {p.get('slug') for p in huseier_pages}
        print(f"Huseier slugs found: {huseier_slugs_found}")
        
        if not HUSEIER_SLUGS.issubset(huseier_slugs_found):
            missing = HUSEIER_SLUGS - huseier_slugs_found
            print(f"❌ FAIL: Missing expected huseier slugs: {missing}")
            return False
        print(f"✓ All expected huseier slugs present: {HUSEIER_SLUGS}")
        
        # Check first page element structure
        page = pages[0]
        print(f"\nChecking first page element structure: slug={page.get('slug')}")
        
        required_fields = {
            'slug': str,
            'source': str,
            'path': str,
            'audience': str,
            'sessions': (int, float),
            'pageviews': (int, float),
            'leads': (int, float),
            'won': (int, float),
            'wonValue': (int, float),
            'conversionRate': (int, float),
            'paidShare': (int, float),
        }
        
        for field, expected_type in required_fields.items():
            if field not in page:
                print(f"❌ FAIL: Missing field '{field}' in page element")
                return False
            
            value = page[field]
            if not isinstance(value, expected_type):
                print(f"❌ FAIL: Field '{field}' has wrong type. Expected {expected_type}, got {type(value)} (value: {value})")
                return False
        
        print(f"✓ All required fields present with correct types")
        print(f"  slug={page['slug']}, source={page['source']}, path={page['path']}, audience={page['audience']}")
        print(f"  sessions={page['sessions']}, pageviews={page['pageviews']}, leads={page['leads']}")
        print(f"  won={page['won']}, wonValue={page['wonValue']}, conversionRate={page['conversionRate']}, paidShare={page['paidShare']}")
        
        # Check source format (should be 'lp-{slug}')
        expected_source = f"lp-{page['slug']}"
        if page['source'] != expected_source:
            print(f"⚠ WARNING: source format unexpected. Expected '{expected_source}', got '{page['source']}'")
        else:
            print(f"✓ source format correct: '{page['source']}'")
        
        # Check path format (should be '/lp/{slug}')
        expected_path = f"/lp/{page['slug']}"
        if page['path'] != expected_path:
            print(f"⚠ WARNING: path format unexpected. Expected '{expected_path}', got '{page['path']}'")
        else:
            print(f"✓ path format correct: '{page['path']}'")
        
        # Check audience values
        valid_audiences = {'huseier', 'leietaker'}
        if page['audience'] not in valid_audiences:
            print(f"❌ FAIL: Invalid audience value: '{page['audience']}'. Expected one of {valid_audiences}")
            return False
        print(f"✓ audience value valid: '{page['audience']}'")
        
        # Check totals structure
        totals = data['totals']
        print(f"\nChecking totals structure:")
        
        required_totals_fields = {
            'sessions': (int, float),
            'leads': (int, float),
            'won': (int, float),
            'wonValue': (int, float),
            'conversionRate': (int, float),
        }
        
        for field, expected_type in required_totals_fields.items():
            if field not in totals:
                print(f"❌ FAIL: Missing field '{field}' in totals")
                return False
            
            value = totals[field]
            if not isinstance(value, expected_type):
                print(f"❌ FAIL: Totals field '{field}' has wrong type. Expected {expected_type}, got {type(value)}")
                return False
        
        print(f"✓ All required totals fields present with correct types")
        print(f"  sessions={totals['sessions']}, leads={totals['leads']}, won={totals['won']}")
        print(f"  wonValue={totals['wonValue']}, conversionRate={totals['conversionRate']}")
        
        print("\n✅ Test 1 PASSED: Landing pages endpoint structure correct")
        return True
        
    except requests.exceptions.Timeout:
        print(f"❌ FAIL: Request timeout after {TIMEOUT}s")
        return False
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_auth_required():
    """Test 2: GET /api/admin/landing-pages WITHOUT key → 401"""
    print("\n=== Test 2: Auth required (no key) ===")
    try:
        url = f"{BASE_URL}/admin/landing-pages?days=30"
        print(f"GET {url} (no key)")
        resp = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 401:
            print(f"❌ FAIL: Expected 401, got {resp.status_code}")
            return False
        
        print("✅ Test 2 PASSED: Auth required (401 without key)")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_days_parameter_7():
    """Test 3: GET /api/admin/landing-pages?key=...&days=7 → 200"""
    print("\n=== Test 3: Days parameter = 7 ===")
    try:
        url = f"{BASE_URL}/admin/landing-pages?key={ADMIN_KEY}&days=7"
        print(f"GET {url}")
        resp = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {resp.status_code}, Time: {resp.elapsed.total_seconds():.2f}s")
        
        if resp.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        if not data.get('ok'):
            print(f"❌ FAIL: ok field is not true")
            return False
        
        if 'range' in data and 'days' in data['range']:
            print(f"✓ range.days = {data['range']['days']}")
        
        print("✅ Test 3 PASSED: days=7 works")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_days_parameter_90():
    """Test 4: GET /api/admin/landing-pages?key=...&days=90 → 200"""
    print("\n=== Test 4: Days parameter = 90 ===")
    try:
        url = f"{BASE_URL}/admin/landing-pages?key={ADMIN_KEY}&days=90"
        print(f"GET {url}")
        resp = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {resp.status_code}, Time: {resp.elapsed.total_seconds():.2f}s")
        
        if resp.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        if not data.get('ok'):
            print(f"❌ FAIL: ok field is not true")
            return False
        
        if 'range' in data and 'days' in data['range']:
            print(f"✓ range.days = {data['range']['days']}")
        
        print("✅ Test 4 PASSED: days=90 works")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_regression_analytics():
    """Test 5: REGRESSION - GET /api/admin/analytics still works"""
    print("\n=== Test 5: REGRESSION - /api/admin/analytics ===")
    try:
        url = f"{BASE_URL}/admin/analytics?key={ADMIN_KEY}&days=30"
        print(f"GET {url}")
        resp = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {resp.status_code}, Time: {resp.elapsed.total_seconds():.2f}s")
        
        if resp.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Check for expected keys
        expected_keys = ['traffic', 'leads', 'webVitals', 'anomalies', 'funnels']
        for key in expected_keys:
            if key not in data:
                print(f"❌ FAIL: Missing expected key '{key}'")
                return False
        
        print(f"✓ All expected keys present: {expected_keys}")
        print("✅ Test 5 PASSED: /api/admin/analytics still works")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_regression_root():
    """Test 6: REGRESSION - GET /api/ still works"""
    print("\n=== Test 6: REGRESSION - GET /api/ ===")
    try:
        url = f"{BASE_URL}/"
        print(f"GET {url}")
        resp = requests.get(url, timeout=30)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        if not data.get('ok'):
            print(f"❌ FAIL: ok field is not true")
            return False
        
        print(f"✓ Response: {data}")
        print("✅ Test 6 PASSED: Root endpoint still works")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def main():
    print("=" * 80)
    print("BACKEND TEST: Landing Pages Performance Endpoint")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    
    tests = [
        ("Landing pages endpoint structure", test_landing_pages_endpoint),
        ("Auth required", test_auth_required),
        ("Days parameter = 7", test_days_parameter_7),
        ("Days parameter = 90", test_days_parameter_90),
        ("REGRESSION: /api/admin/analytics", test_regression_analytics),
        ("REGRESSION: GET /api/", test_regression_root),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"\n❌ Test '{name}' crashed: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed_count}/{total_count} tests passed")
    
    if passed_count == total_count:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n❌ {total_count - passed_count} test(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
