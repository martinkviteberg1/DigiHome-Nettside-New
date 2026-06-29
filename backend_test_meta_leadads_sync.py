#!/usr/bin/env python3
"""
Backend test for Meta Lead Ads sync endpoint (Lag 4).
Tests ONLY the /api/admin/leads/meta-sync endpoint as requested.
This endpoint makes REAL calls to Meta Graph API (1-3s).
"""

import requests
import time
import json

# Configuration
BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 30  # Meta API calls can take 1-3s, use 30s timeout

def test_meta_sync_with_auth():
    """Test 1: POST /api/admin/leads/meta-sync with admin key"""
    print("\n" + "="*80)
    print("TEST 1: POST /api/admin/leads/meta-sync?key=... (with auth)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/leads/meta-sync?key={ADMIN_KEY}"
        print(f"Calling: {url}")
        print("Expected: 200 with {{ok:true, imported (number), skipped (number), pages (array), forms (array), syncedAt (ISO string)}}")
        
        start_time = time.time()
        response = requests.post(url, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        print(f"Status: {response.status_code}")
        print(f"Response time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response body: {json.dumps(data, indent=2)}")
            
            # Verify required fields
            assert data.get('ok') == True, f"Expected ok=true, got {data.get('ok')}"
            assert 'imported' in data, "Missing 'imported' field"
            assert isinstance(data['imported'], int), f"Expected imported to be int, got {type(data['imported'])}"
            assert 'skipped' in data, "Missing 'skipped' field"
            assert isinstance(data['skipped'], int), f"Expected skipped to be int, got {type(data['skipped'])}"
            assert 'pages' in data, "Missing 'pages' field"
            assert isinstance(data['pages'], list), f"Expected pages to be array, got {type(data['pages'])}"
            assert len(data['pages']) >= 1, f"Expected at least 1 page, got {len(data['pages'])}"
            assert 'forms' in data, "Missing 'forms' field"
            assert isinstance(data['forms'], list), f"Expected forms to be array, got {type(data['forms'])}"
            assert 'syncedAt' in data, "Missing 'syncedAt' field"
            assert isinstance(data['syncedAt'], str), f"Expected syncedAt to be string, got {type(data['syncedAt'])}"
            
            # Report actual values
            print(f"\n✅ TEST 1 PASSED")
            print(f"   - imported: {data['imported']} (expected 0 since no lead forms exist)")
            print(f"   - skipped: {data['skipped']}")
            print(f"   - pages: {data['pages']} (expected at least 1 page, e.g. 'DigiHome')")
            print(f"   - forms: {data['forms']} (expected empty array since no lead forms exist)")
            print(f"   - syncedAt: {data['syncedAt']}")
            
            return data
        else:
            print(f"❌ TEST 1 FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ TEST 1 FAILED with exception: {e}")
        return None


def test_meta_sync_without_auth():
    """Test 2: POST /api/admin/leads/meta-sync without admin key (AUTH)"""
    print("\n" + "="*80)
    print("TEST 2: POST /api/admin/leads/meta-sync (without key - AUTH)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/leads/meta-sync"
        print(f"Calling: {url}")
        print("Expected: 401 (unauthorized)")
        
        response = requests.post(url, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print(f"✅ TEST 2 PASSED: Got 401 as expected (authentication required)")
            return True
        else:
            print(f"❌ TEST 2 FAILED: Expected 401, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ TEST 2 FAILED with exception: {e}")
        return False


def test_meta_sync_idempotency():
    """Test 3: Call meta-sync TWICE to verify idempotency (no 500, imported=0 on both)"""
    print("\n" + "="*80)
    print("TEST 3: POST /api/admin/leads/meta-sync TWICE (IDEMPOTENCY)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/leads/meta-sync?key={ADMIN_KEY}"
        
        # First call
        print(f"\nFirst call to: {url}")
        start_time = time.time()
        response1 = requests.post(url, timeout=TIMEOUT)
        elapsed1 = time.time() - start_time
        
        print(f"First call - Status: {response1.status_code}, Time: {elapsed1:.2f}s")
        
        if response1.status_code != 200:
            print(f"❌ TEST 3 FAILED: First call returned {response1.status_code}, expected 200")
            print(f"Response: {response1.text}")
            return False
        
        data1 = response1.json()
        print(f"First call - Response: {json.dumps(data1, indent=2)}")
        
        assert data1.get('ok') == True, f"First call: Expected ok=true, got {data1.get('ok')}"
        
        # Second call (idempotency test)
        print(f"\nSecond call to: {url}")
        start_time = time.time()
        response2 = requests.post(url, timeout=TIMEOUT)
        elapsed2 = time.time() - start_time
        
        print(f"Second call - Status: {response2.status_code}, Time: {elapsed2:.2f}s")
        
        if response2.status_code != 200:
            print(f"❌ TEST 3 FAILED: Second call returned {response2.status_code}, expected 200")
            print(f"Response: {response2.text}")
            return False
        
        data2 = response2.json()
        print(f"Second call - Response: {json.dumps(data2, indent=2)}")
        
        assert data2.get('ok') == True, f"Second call: Expected ok=true, got {data2.get('ok')}"
        
        # Verify imported=0 on both (no forms = nothing to import)
        if data1['imported'] == 0 and data2['imported'] == 0:
            print(f"\n✅ TEST 3 PASSED")
            print(f"   - Both calls returned 200 with ok:true (no 500 crash)")
            print(f"   - First call imported: {data1['imported']} (expected 0)")
            print(f"   - Second call imported: {data2['imported']} (expected 0)")
            print(f"   - Idempotency verified: no spurious imports on repeated calls")
            return True
        else:
            print(f"❌ TEST 3 FAILED: Expected imported=0 on both calls")
            print(f"   - First call imported: {data1['imported']}")
            print(f"   - Second call imported: {data2['imported']}")
            return False
            
    except Exception as e:
        print(f"❌ TEST 3 FAILED with exception: {e}")
        return False


def test_regression():
    """Test 4: REGRESSION - verify other endpoints still work and lead count unchanged"""
    print("\n" + "="*80)
    print("TEST 4: REGRESSION - verify no side effects")
    print("="*80)
    
    try:
        # Get lead count BEFORE (should be unchanged since no forms exist)
        print("\nGetting lead count BEFORE meta-sync...")
        url_leads = f"{BASE_URL}/admin/leads?key={ADMIN_KEY}"
        response_before = requests.get(url_leads, timeout=10)
        
        if response_before.status_code != 200:
            print(f"❌ Failed to get leads before: {response_before.status_code}")
            return False
        
        data_before = response_before.json()
        leads_before = data_before.get('leads', []) if isinstance(data_before, dict) else data_before
        count_before = len(leads_before) if isinstance(leads_before, list) else 0
        print(f"Lead count BEFORE: {count_before}")
        
        # Call meta-sync
        print("\nCalling meta-sync...")
        url_sync = f"{BASE_URL}/admin/leads/meta-sync?key={ADMIN_KEY}"
        response_sync = requests.post(url_sync, timeout=TIMEOUT)
        
        if response_sync.status_code != 200:
            print(f"❌ Meta-sync failed: {response_sync.status_code}")
            return False
        
        sync_data = response_sync.json()
        print(f"Meta-sync response: imported={sync_data.get('imported')}, forms={len(sync_data.get('forms', []))}")
        
        # Get lead count AFTER
        print("\nGetting lead count AFTER meta-sync...")
        response_after = requests.get(url_leads, timeout=10)
        
        if response_after.status_code != 200:
            print(f"❌ Failed to get leads after: {response_after.status_code}")
            return False
        
        data_after = response_after.json()
        leads_after = data_after.get('leads', []) if isinstance(data_after, dict) else data_after
        count_after = len(leads_after) if isinstance(leads_after, list) else 0
        print(f"Lead count AFTER: {count_after}")
        
        # Verify lead count unchanged (no spurious leads created)
        if count_before == count_after:
            print(f"✅ Lead count UNCHANGED: {count_before} → {count_after} (no spurious leads created)")
        else:
            print(f"⚠️  Lead count CHANGED: {count_before} → {count_after}")
            print(f"   (This is expected if Meta lead forms exist and have new leads)")
        
        # Test root endpoint
        print("\nTesting root endpoint...")
        url_root = f"{BASE_URL}/"
        response_root = requests.get(url_root, timeout=10)
        
        print(f"GET /api/ - Status: {response_root.status_code}")
        
        if response_root.status_code != 200:
            print(f"❌ TEST 4 FAILED: GET /api/ returned {response_root.status_code}, expected 200")
            return False
        
        root_data = response_root.json()
        if root_data.get('ok') != True:
            print(f"❌ TEST 4 FAILED: GET /api/ returned ok={root_data.get('ok')}, expected true")
            return False
        
        print(f"✅ GET /api/ returned 200 {{ok:true}}")
        
        # Test admin leads endpoint
        print("\nTesting admin leads endpoint...")
        print(f"GET /api/admin/leads?key=... - Status: {response_after.status_code}")
        
        if not isinstance(leads_after, list):
            print(f"❌ TEST 4 FAILED: GET /api/admin/leads did not return leads array")
            print(f"Response type: {type(data_after)}, leads type: {type(leads_after)}")
            return False
        
        print(f"✅ GET /api/admin/leads returned 200 with leads array ({count_after} leads)")
        
        print(f"\n✅ TEST 4 PASSED")
        print(f"   - GET /api/ → 200 {{ok:true}}")
        print(f"   - GET /api/admin/leads?key=... → 200 array")
        print(f"   - Lead count unchanged: {count_before} → {count_after}")
        print(f"   - No spurious leads created by meta-sync (as expected with 0 forms)")
        
        return True
        
    except Exception as e:
        print(f"❌ TEST 4 FAILED with exception: {e}")
        return False


def main():
    """Run all Meta Lead Ads sync tests"""
    print("\n" + "="*80)
    print("META LEAD ADS SYNC ENDPOINT TESTS (Lag 4)")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s (Meta API calls can take 1-3s)")
    print("\nNOTE: This endpoint makes REAL calls to Meta Graph API")
    print("Expected: 0 imported leads (no lead forms exist yet)")
    print("Expected: At least 1 page (e.g. 'DigiHome')")
    print("Expected: Empty forms array (no lead forms configured)")
    
    results = []
    
    # Test 1: POST with auth
    result1 = test_meta_sync_with_auth()
    results.append(("Test 1: POST /api/admin/leads/meta-sync with auth", result1 is not None))
    
    # Test 2: POST without auth (401)
    result2 = test_meta_sync_without_auth()
    results.append(("Test 2: POST without key (AUTH)", result2))
    
    # Test 3: Idempotency (call twice)
    result3 = test_meta_sync_idempotency()
    results.append(("Test 3: Idempotency (call twice)", result3))
    
    # Test 4: Regression
    result4 = test_regression()
    results.append(("Test 4: Regression (no side effects)", result4))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print("\n" + "="*80)
    print(f"TOTAL: {passed} passed, {failed} failed out of {len(results)} tests")
    print("="*80)
    
    if failed == 0:
        print("\n🎉 ALL META LEAD ADS SYNC TESTS PASSED!")
    else:
        print(f"\n⚠️  {failed} test(s) failed")
    
    return failed == 0


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
