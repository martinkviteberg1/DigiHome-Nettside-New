#!/usr/bin/env python3
"""
Backend test for Google Data Manager API offline-conversion endpoint (Phase 2 closed-loop).

Tests the NEW Data Manager API endpoint POST /api/admin/ads/datamanager/test
which uses Google's new events:ingest API (replacement for classic uploadClickConversions).

SAFETY: Only uses validateOnly=true (no real events pushed to Google pipeline).
"""

import requests
import sys
import json

BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 30  # Real Google API calls can take time

def test_datamanager_with_gclid():
    """Test 1: POST /admin/ads/datamanager/test with gclid and validateOnly=true"""
    print("\n" + "="*80)
    print("TEST 1: POST /admin/ads/datamanager/test with gclid and validateOnly=true")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/datamanager/test?key={ADMIN_KEY}"
        payload = {
            "gclid": "TEST_FAKE",
            "value": 5000,
            "validateOnly": True
        }
        
        print(f"Request: POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        # Verify status code
        if response.status_code != 200:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Verify ok field
        if not data.get("ok"):
            print(f"❌ FAIL: Expected ok=true, got ok={data.get('ok')}")
            print(f"   Error: {data.get('error', 'N/A')}")
            return False
        
        # Verify requestId is present and non-null
        request_id = data.get("requestId")
        if request_id is None:
            print(f"❌ FAIL: Expected requestId to be non-null, got {request_id}")
            return False
        
        if not isinstance(request_id, str) or len(request_id) == 0:
            print(f"❌ FAIL: Expected requestId to be a non-empty string, got {request_id}")
            return False
        
        print(f"✅ PASS: Status 200, ok=true, requestId='{request_id}' (non-null string)")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_datamanager_empty_body():
    """Test 2: POST /admin/ads/datamanager/test with empty body (validateOnly defaults to true)"""
    print("\n" + "="*80)
    print("TEST 2: POST /admin/ads/datamanager/test with empty body (validateOnly defaults to true)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/datamanager/test?key={ADMIN_KEY}"
        payload = {}
        
        print(f"Request: POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        # Verify status code
        if response.status_code != 200:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Verify ok field
        if not data.get("ok"):
            print(f"❌ FAIL: Expected ok=true, got ok={data.get('ok')}")
            print(f"   Error: {data.get('error', 'N/A')}")
            return False
        
        print(f"✅ PASS: Status 200, ok=true (validateOnly defaulted to true)")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_datamanager_no_auth():
    """Test 3: POST /admin/ads/datamanager/test WITHOUT ?key (expect 401)"""
    print("\n" + "="*80)
    print("TEST 3: POST /admin/ads/datamanager/test WITHOUT ?key (expect 401)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/datamanager/test"  # No key
        payload = {"gclid": "TEST_FAKE", "value": 5000, "validateOnly": True}
        
        print(f"Request: POST {url} (NO KEY)")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        # Verify status code is 401
        if response.status_code != 401:
            print(f"❌ FAIL: Expected status 401 (unauthorized), got {response.status_code}")
            return False
        
        print(f"✅ PASS: Status 401 (authentication working correctly)")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_regression_google_status():
    """Test 4: REGRESSION - GET /admin/ads/google-status (expect provider='native')"""
    print("\n" + "="*80)
    print("TEST 4: REGRESSION - GET /admin/ads/google-status (expect provider='native')")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/google-status?key={ADMIN_KEY}"
        
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        # Verify status code
        if response.status_code != 200:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Verify provider field
        provider = data.get("provider")
        if provider != "native":
            print(f"❌ FAIL: Expected provider='native', got provider='{provider}'")
            return False
        
        print(f"✅ PASS: Status 200, provider='native'")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_regression_campaigns():
    """Test 5: REGRESSION - GET /admin/ads/campaigns (expect ok=true)"""
    print("\n" + "="*80)
    print("TEST 5: REGRESSION - GET /admin/ads/campaigns (expect ok=true)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/campaigns?key={ADMIN_KEY}"
        
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        # Verify status code
        if response.status_code != 200:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Verify ok field
        if not data.get("ok"):
            print(f"❌ FAIL: Expected ok=true, got ok={data.get('ok')}")
            return False
        
        print(f"✅ PASS: Status 200, ok=true")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_regression_root():
    """Test 6: REGRESSION - GET /api/ (expect ok=true)"""
    print("\n" + "="*80)
    print("TEST 6: REGRESSION - GET /api/ (expect ok=true)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/"
        
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        # Verify status code
        if response.status_code != 200:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Verify ok field
        if not data.get("ok"):
            print(f"❌ FAIL: Expected ok=true, got ok={data.get('ok')}")
            return False
        
        print(f"✅ PASS: Status 200, ok=true")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def main():
    print("="*80)
    print("GOOGLE DATA MANAGER API OFFLINE-CONVERSION ENDPOINT TEST")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print("="*80)
    
    results = []
    
    # Run all tests
    results.append(("Test 1: POST datamanager/test with gclid", test_datamanager_with_gclid()))
    results.append(("Test 2: POST datamanager/test with empty body", test_datamanager_empty_body()))
    results.append(("Test 3: POST datamanager/test without auth", test_datamanager_no_auth()))
    results.append(("Test 4: REGRESSION google-status", test_regression_google_status()))
    results.append(("Test 5: REGRESSION campaigns", test_regression_campaigns()))
    results.append(("Test 6: REGRESSION root endpoint", test_regression_root()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
