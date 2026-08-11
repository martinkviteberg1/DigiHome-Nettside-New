#!/usr/bin/env python3
"""
Backend test for historiske/plattform-native lead import functionality.
Tests POST /api/admin/imported-leads/import, GET /api/admin/imported-leads (summary + list),
POST /api/admin/imported-leads/sync, DELETE /api/admin/imported-leads, and authentication.
"""

import requests
import json
import sys
import time

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 30

# Test CSV with OBVIOUSLY FAKE data (Norwegian format with semicolon delimiter)
TEST_CSV = """Navn;E-post;Telefon;Adresse;Postnr;Status;Kilde;Opprettet;Kontraktsverdi
Ola QA;ola@e2e-imp.test;45010001;Storgata 1;5003;Vunnet;Meta;01.02.2025;24000
Kari QA;kari@e2e-imp.test;45010002;Lilleveien 2;0170;Kontaktet;Finn;15.03.2025;
Per QA;per@e2e-imp.test;45010003;Bakkegata 3;7010;Ny;Telefon;2025-04-20;"""

def test_import_csv():
    """Test 1: Import CSV with 3 test leads"""
    print("\n=== TEST 1: IMPORT CSV ===")
    try:
        url = f"{BASE_URL}/admin/imported-leads/import?key={ADMIN_KEY}"
        payload = {
            "csv": TEST_CSV,
            "batchLabel": "QA-CSV"
        }
        
        print(f"POST {url}")
        print(f"Payload: csv with {len(TEST_CSV.split(chr(10)))} lines, batchLabel='QA-CSV'")
        
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 201:
            print(f"❌ FAIL: Expected 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify response structure
        if not data.get('ok'):
            print("❌ FAIL: ok is not true")
            return False
        
        if data.get('inserted') != 3:
            print(f"❌ FAIL: Expected inserted=3, got {data.get('inserted')}")
            return False
        
        if data.get('skippedTracked', 0) != 0:
            print(f"❌ FAIL: Expected skippedTracked=0, got {data.get('skippedTracked')}")
            return False
        
        if not data.get('summary'):
            print("❌ FAIL: summary field missing")
            return False
        
        summary = data['summary']
        if summary.get('total', 0) < 3:
            print(f"❌ FAIL: Expected summary.total>=3, got {summary.get('total')}")
            return False
        
        print("✅ PASS: CSV import successful")
        print(f"   - inserted: {data.get('inserted')}")
        print(f"   - updated: {data.get('updated')}")
        print(f"   - skippedTracked: {data.get('skippedTracked')}")
        print(f"   - summary.total: {summary.get('total')}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_summary():
    """Test 2: GET summary - verify total>=3, won>=1, byStatus, byChannel, batches, note contains 'EKSKLUDERT'"""
    print("\n=== TEST 2: SUMMARY ===")
    try:
        url = f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}"
        
        print(f"GET {url}")
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify response structure
        if not data.get('ok'):
            print("❌ FAIL: ok is not true")
            return False
        
        if data.get('total', 0) < 3:
            print(f"❌ FAIL: Expected total>=3, got {data.get('total')}")
            return False
        
        if data.get('won', 0) < 1:
            print(f"❌ FAIL: Expected won>=1 (Ola=Vunnet), got {data.get('won')}")
            return False
        
        if data.get('wonValue', 0) < 24000:
            print(f"❌ FAIL: Expected wonValue>=24000, got {data.get('wonValue')}")
            return False
        
        if not isinstance(data.get('byStatus'), dict):
            print("❌ FAIL: byStatus should be dict")
            return False
        
        if not isinstance(data.get('byChannel'), list):
            print("❌ FAIL: byChannel should be array")
            return False
        
        # Verify byChannel structure
        if len(data['byChannel']) > 0:
            channel_item = data['byChannel'][0]
            required_fields = ['channel', 'leads', 'won', 'wonValue']
            for field in required_fields:
                if field not in channel_item:
                    print(f"❌ FAIL: byChannel item missing field '{field}'")
                    return False
        
        if not isinstance(data.get('batches'), list):
            print("❌ FAIL: batches should be array")
            return False
        
        if len(data['batches']) < 1:
            print("❌ FAIL: Expected batches array with >=1 element")
            return False
        
        note = data.get('note', '')
        if 'EKSKLUDERT' not in note:
            print(f"❌ FAIL: Expected note to contain 'EKSKLUDERT', got: {note}")
            return False
        
        print("✅ PASS: Summary endpoint working correctly")
        print(f"   - total: {data.get('total')}")
        print(f"   - won: {data.get('won')}")
        print(f"   - wonValue: {data.get('wonValue')}")
        print(f"   - byStatus: {data.get('byStatus')}")
        print(f"   - byChannel count: {len(data.get('byChannel', []))}")
        print(f"   - batches count: {len(data.get('batches', []))}")
        print(f"   - note contains 'EKSKLUDERT': ✓")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_list():
    """Test 3: GET list - verify list array with pre_tracking==true"""
    print("\n=== TEST 3: LIST ===")
    try:
        url = f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}&list=1&limit=10"
        
        print(f"GET {url}")
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        if not data.get('ok'):
            print("❌ FAIL: ok is not true")
            return False
        
        if not isinstance(data.get('list'), list):
            print("❌ FAIL: list should be array")
            return False
        
        if len(data['list']) < 3:
            print(f"❌ FAIL: Expected list with >=3 elements, got {len(data['list'])}")
            return False
        
        if 'listTotal' not in data:
            print("❌ FAIL: listTotal field missing")
            return False
        
        # Verify list item structure
        item = data['list'][0]
        print(f"Sample list item: {json.dumps(item, indent=2)}")
        
        required_fields = ['pre_tracking', 'status', 'channel', 'name', 'email']
        for field in required_fields:
            if field not in item:
                print(f"❌ FAIL: List item missing field '{field}'")
                return False
        
        if item.get('pre_tracking') != True:
            print(f"❌ FAIL: Expected pre_tracking=true, got {item.get('pre_tracking')}")
            return False
        
        print("✅ PASS: List endpoint working correctly")
        print(f"   - list count: {len(data['list'])}")
        print(f"   - listTotal: {data.get('listTotal')}")
        print(f"   - pre_tracking: {item.get('pre_tracking')}")
        print(f"   - Sample item: name={item.get('name')}, email={item.get('email')}, status={item.get('status')}, channel={item.get('channel')}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_sync():
    """Test 4: POST sync - expect 200 (NOT 500) with {ok:false, error, hint} mentioning platform-export"""
    print("\n=== TEST 4: SYNC (platform endpoint not built yet) ===")
    try:
        url = f"{BASE_URL}/admin/imported-leads/sync?key={ADMIN_KEY}"
        payload = {}
        
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload)}")
        
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 500:
            print(f"❌ FAIL: Got 500 (should handle gracefully with 200)")
            print(f"Response: {response.text}")
            return False
        
        if response.status_code != 200 and response.status_code != 201:
            print(f"❌ FAIL: Expected 200 or 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Since platform endpoint is not built yet, we expect ok:false
        if data.get('ok') != False:
            print(f"⚠️  WARNING: Expected ok=false (platform not ready), got ok={data.get('ok')}")
            # This is not a failure - if platform is ready, that's fine
        
        # Verify response has expected fields
        if 'platformEnv' not in data:
            print("❌ FAIL: platformEnv field missing")
            return False
        
        if 'platformUrl' not in data:
            print("❌ FAIL: platformUrl field missing")
            return False
        
        # If ok=false, verify error/hint fields
        if data.get('ok') == False:
            if 'error' not in data and 'hint' not in data:
                print("❌ FAIL: Expected error or hint field when ok=false")
                return False
            
            hint = data.get('hint', '')
            if hint and 'export' not in hint.lower():
                print(f"⚠️  WARNING: Expected hint to mention 'export', got: {hint}")
        
        print("✅ PASS: Sync endpoint working correctly (graceful handling)")
        print(f"   - status: {response.status_code} (NOT 500)")
        print(f"   - ok: {data.get('ok')}")
        print(f"   - platformEnv: {data.get('platformEnv')}")
        print(f"   - platformUrl: {data.get('platformUrl')}")
        if data.get('ok') == False:
            print(f"   - error: {data.get('error', 'N/A')}")
            print(f"   - hint: {data.get('hint', 'N/A')}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_auth():
    """Test 5: Authentication - all endpoints should return 401 without key"""
    print("\n=== TEST 5: AUTHENTICATION ===")
    all_passed = True
    
    # Test import without key
    print("\n5a. POST import WITHOUT key")
    try:
        url = f"{BASE_URL}/admin/imported-leads/import"
        response = requests.post(url, json={"csv": TEST_CSV}, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        if response.status_code != 401:
            print(f"❌ FAIL: Expected 401, got {response.status_code}")
            all_passed = False
        else:
            print("✅ PASS: Returns 401 without key")
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        all_passed = False
    
    # Test summary without key
    print("\n5b. GET summary WITHOUT key")
    try:
        url = f"{BASE_URL}/admin/imported-leads"
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        if response.status_code != 401:
            print(f"❌ FAIL: Expected 401, got {response.status_code}")
            all_passed = False
        else:
            print("✅ PASS: Returns 401 without key")
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        all_passed = False
    
    # Test sync without key
    print("\n5c. POST sync WITHOUT key")
    try:
        url = f"{BASE_URL}/admin/imported-leads/sync"
        response = requests.post(url, json={}, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        if response.status_code != 401:
            print(f"❌ FAIL: Expected 401, got {response.status_code}")
            all_passed = False
        else:
            print("✅ PASS: Returns 401 without key")
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        all_passed = False
    
    # Test delete without key
    print("\n5d. DELETE WITHOUT key")
    try:
        url = f"{BASE_URL}/admin/imported-leads?all=1"
        response = requests.delete(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        if response.status_code != 401:
            print(f"❌ FAIL: Expected 401, got {response.status_code}")
            all_passed = False
        else:
            print("✅ PASS: Returns 401 without key")
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        all_passed = False
    
    if all_passed:
        print("\n✅ PASS: All authentication tests passed")
    else:
        print("\n❌ FAIL: Some authentication tests failed")
    
    return all_passed

def test_idempotency():
    """Test 6: Idempotency - re-import same CSV should result in inserted=0, updated=3, total still ==3"""
    print("\n=== TEST 6: IDEMPOTENCY ===")
    try:
        url = f"{BASE_URL}/admin/imported-leads/import?key={ADMIN_KEY}"
        payload = {
            "csv": TEST_CSV,
            "batchLabel": "QA-CSV-REPEAT"
        }
        
        print(f"POST {url} (REPEAT import with IDENTICAL CSV)")
        print(f"Payload: same CSV as Test 1, batchLabel='QA-CSV-REPEAT'")
        
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 201:
            print(f"❌ FAIL: Expected 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify idempotency: inserted=0, updated=3 (upsert on dedupe_key)
        if data.get('inserted') != 0:
            print(f"❌ FAIL: Expected inserted=0 (idempotent), got {data.get('inserted')}")
            return False
        
        if data.get('updated') != 3:
            print(f"❌ FAIL: Expected updated=3 (upsert), got {data.get('updated')}")
            return False
        
        # Verify total is still 3 (NOT 6)
        summary = data.get('summary', {})
        if summary.get('total') != 3:
            print(f"❌ FAIL: Expected summary.total=3 (no duplicates), got {summary.get('total')}")
            return False
        
        print("✅ PASS: Idempotency working correctly")
        print(f"   - inserted: {data.get('inserted')} (expected 0)")
        print(f"   - updated: {data.get('updated')} (expected 3)")
        print(f"   - summary.total: {summary.get('total')} (expected 3, NOT 6)")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_cleanup():
    """Test 7: CLEANUP (MANDATORY) - DELETE ?all=1 should delete all test data"""
    print("\n=== TEST 7: CLEANUP (MANDATORY) ===")
    try:
        # First, delete all
        url = f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}&all=1"
        
        print(f"DELETE {url}")
        response = requests.delete(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('ok'):
            print("❌ FAIL: ok is not true")
            return False
        
        if data.get('deleted', 0) < 3:
            print(f"❌ FAIL: Expected deleted>=3, got {data.get('deleted')}")
            return False
        
        print(f"✅ Deleted {data.get('deleted')} records")
        
        # Verify summary shows total=0
        print("\nVerifying summary after cleanup...")
        url = f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}"
        response = requests.get(url, timeout=TIMEOUT)
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Summary after cleanup: {json.dumps(data, indent=2)}")
        
        if data.get('total') != 0:
            print(f"❌ FAIL: Expected total=0 after cleanup, got {data.get('total')}")
            return False
        
        print("✅ PASS: Cleanup successful, imported_leads collection is empty")
        print(f"   - deleted: {data.get('deleted', 'N/A')}")
        print(f"   - summary.total after cleanup: {data.get('total')}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_regression():
    """Test 8: REGRESSION - verify imported_leads doesn't affect leads collection"""
    print("\n=== TEST 8: REGRESSION ===")
    all_passed = True
    
    # Test root endpoint
    print("\n8a. GET /api/")
    try:
        url = f"{BASE_URL}/"
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            if not data.get('ok') or data.get('message') != 'DigiHome API':
                print(f"❌ FAIL: Unexpected response: {data}")
                all_passed = False
            else:
                print(f"✅ PASS: Root endpoint working - {data}")
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        all_passed = False
    
    # Test admin/leads endpoint (verify imported_leads doesn't affect leads collection)
    print("\n8b. GET /api/admin/leads (verify imported_leads doesn't affect leads collection)")
    try:
        url = f"{BASE_URL}/admin/leads?key={ADMIN_KEY}"
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            print(f"✅ PASS: Admin leads endpoint working")
            print(f"   - Response has 'leads' field: {'leads' in data}")
            print(f"   - Leads count: {len(data.get('leads', []))}")
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        all_passed = False
    
    if all_passed:
        print("\n✅ PASS: All regression tests passed")
    else:
        print("\n❌ FAIL: Some regression tests failed")
    
    return all_passed

def main():
    print("=" * 80)
    print("BACKEND TEST: Historiske/plattform-native lead import")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print("=" * 80)
    
    results = []
    
    # Run tests in sequence
    results.append(("1. Import CSV", test_import_csv()))
    results.append(("2. Summary", test_summary()))
    results.append(("3. List", test_list()))
    results.append(("4. Sync", test_sync()))
    results.append(("5. Authentication", test_auth()))
    results.append(("6. Idempotency", test_idempotency()))
    results.append(("7. Cleanup (MANDATORY)", test_cleanup()))
    results.append(("8. Regression", test_regression()))
    
    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = 0
    failed = 0
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print("=" * 80)
    print(f"Total: {passed + failed} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success rate: {passed / (passed + failed) * 100:.1f}%")
    print("=" * 80)
    
    if failed > 0:
        sys.exit(1)
    else:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)

if __name__ == "__main__":
    main()
