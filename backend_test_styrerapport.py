#!/usr/bin/env python3
"""
Backend test for STYRERAPPORT endpoints (GET + POST /api/admin/styrerapport).
Tests structure, auth, persistence roundtrip, validation/sanitization, and best-effort null handling.
CRITICAL SAFETY: Saves original rapport before tests, restores it after all tests complete.
"""

import requests
import json
import os
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]
sr_collection = db['styrerapport']

# Store original state
original_rapport = None

def test_step(step_num, description):
    """Print test step header"""
    print(f"\n{'='*80}")
    print(f"STEP {step_num}: {description}")
    print('='*80)

def save_original_state():
    """Save the original rapport document before testing"""
    global original_rapport
    test_step(0, "SAVE ORIGINAL STATE")
    try:
        doc = sr_collection.find_one({'id': 'styrerapport'})
        if doc:
            # Remove MongoDB _id field
            doc.pop('_id', None)
            original_rapport = doc
            print(f"✓ Original rapport saved: tittel='{doc.get('tittel', 'N/A')}'")
        else:
            original_rapport = None
            print("✓ No existing rapport found (will be null)")
        return True
    except Exception as e:
        print(f"✗ Failed to save original state: {e}")
        return False

def restore_original_state():
    """Restore the original rapport document after testing"""
    test_step(99, "RESTORE ORIGINAL STATE")
    try:
        if original_rapport is None:
            # Delete the document if it didn't exist originally
            result = sr_collection.delete_one({'id': 'styrerapport'})
            print(f"✓ Deleted styrerapport document (deleted_count={result.deleted_count})")
        else:
            # Restore the original document
            sr_collection.replace_one(
                {'id': 'styrerapport'},
                original_rapport,
                upsert=True
            )
            print(f"✓ Restored original rapport: tittel='{original_rapport.get('tittel', 'N/A')}'")
        
        # Verify restoration
        doc = sr_collection.find_one({'id': 'styrerapport'})
        if original_rapport is None:
            if doc is None:
                print("✓ VERIFIED: Collection is empty (as it was originally)")
                return True
            else:
                print(f"✗ VERIFICATION FAILED: Document still exists: {doc}")
                return False
        else:
            if doc:
                doc.pop('_id', None)
                if doc.get('tittel') == original_rapport.get('tittel'):
                    print(f"✓ VERIFIED: Original state restored correctly")
                    return True
                else:
                    print(f"✗ VERIFICATION FAILED: tittel mismatch")
                    return False
            else:
                print(f"✗ VERIFICATION FAILED: Document not found")
                return False
    except Exception as e:
        print(f"✗ Failed to restore original state: {e}")
        return False

def test_get_structure():
    """Test 1: GET /api/admin/styrerapport returns correct structure"""
    test_step(1, "GET STRUCTURE & BEST-EFFORT NULL HANDLING")
    try:
        url = f"{API_BASE}/admin/styrerapport?key={ADMIN_KEY}"
        response = requests.get(url, timeout=30)
        
        print(f"Status: {response.status_code}")
        
        # CRITICAL: Must return 200 even if sub-computations fail
        if response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Check required fields
        required_fields = ['ok', 'rapport', 'boardPack', 'customers', 'selskap', 'generatedAt']
        for field in required_fields:
            if field not in data:
                print(f"✗ FAILED: Missing required field '{field}'")
                return False
        
        print(f"✓ All required fields present: {required_fields}")
        
        # Verify ok is true
        if data['ok'] != True:
            print(f"✗ FAILED: ok should be true, got {data['ok']}")
            return False
        print("✓ ok === true")
        
        # Verify generatedAt is ISO string
        if not isinstance(data['generatedAt'], str) or 'T' not in data['generatedAt']:
            print(f"✗ FAILED: generatedAt should be ISO string, got {data['generatedAt']}")
            return False
        print(f"✓ generatedAt is ISO string: {data['generatedAt']}")
        
        # Check rapport (can be null or object)
        rapport = data['rapport']
        if rapport is not None:
            if not isinstance(rapport, dict):
                print(f"✗ FAILED: rapport should be object or null, got {type(rapport)}")
                return False
            print(f"✓ rapport is object with tittel: '{rapport.get('tittel', 'N/A')}'")
        else:
            print("✓ rapport is null (no saved document)")
        
        # Check boardPack (can be null or object with nested structure)
        boardPack = data['boardPack']
        if boardPack is not None:
            if not isinstance(boardPack, dict):
                print(f"✗ FAILED: boardPack should be object or null, got {type(boardPack)}")
                return False
            # Verify nested structure
            expected_keys = ['resultat', 'investor', 'likviditet', 'forecast', 'mrrHistory']
            for key in expected_keys:
                if key not in boardPack:
                    print(f"✗ FAILED: boardPack missing nested key '{key}'")
                    return False
            print(f"✓ boardPack has nested keys: {expected_keys}")
        else:
            print("✓ boardPack is null (computation may have failed, acceptable)")
        
        # Check customers (can be null or object with summary)
        customers = data['customers']
        if customers is not None:
            if not isinstance(customers, dict):
                print(f"✗ FAILED: customers should be object or null, got {type(customers)}")
                return False
            if 'summary' in customers:
                summary = customers['summary']
                if 'totalCustomers' in summary and 'activeCustomers' in summary and 'totalMrr' in summary:
                    print(f"✓ customers.summary has totalCustomers/activeCustomers/totalMrr")
                else:
                    print(f"⚠ customers.summary exists but missing some fields: {list(summary.keys())}")
            else:
                print(f"⚠ customers exists but no summary field")
        else:
            print("✓ customers is null (computation may have failed, acceptable)")
        
        # Check selskap (can be null or object with naa)
        selskap = data['selskap']
        if selskap is not None:
            if not isinstance(selskap, dict):
                print(f"✗ FAILED: selskap should be object or null, got {type(selskap)}")
                return False
            if 'naa' in selskap:
                print(f"✓ selskap has 'naa' field")
            else:
                print(f"⚠ selskap exists but no 'naa' field: {list(selskap.keys())}")
        else:
            print("✓ selskap is null (computation may have failed, acceptable)")
        
        print("\n✅ TEST 1 PASSED: GET returns 200 with correct structure, never 500")
        return True
        
    except Exception as e:
        print(f"✗ FAILED: Exception during test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_auth():
    """Test 2: Auth - GET/POST without key should return 401"""
    test_step(2, "AUTH - 401 WITHOUT KEY")
    try:
        # Test GET without key
        url = f"{API_BASE}/admin/styrerapport"
        response = requests.get(url, timeout=10)
        
        if response.status_code != 401:
            print(f"✗ FAILED: GET without key should return 401, got {response.status_code}")
            return False
        print(f"✓ GET without key returns 401")
        
        # Test POST without key
        response = requests.post(url, json={'tittel': 'Test'}, timeout=10)
        
        if response.status_code != 401:
            print(f"✗ FAILED: POST without key should return 401, got {response.status_code}")
            return False
        print(f"✓ POST without key returns 401")
        
        print("\n✅ TEST 2 PASSED: Auth working correctly")
        return True
        
    except Exception as e:
        print(f"✗ FAILED: Exception during test: {e}")
        return False

def test_post_roundtrip():
    """Test 3: POST roundtrip with validation/sanitization"""
    test_step(3, "POST ROUNDTRIP WITH VALIDATION/SANITIZATION")
    try:
        url = f"{API_BASE}/admin/styrerapport?key={ADMIN_KEY}"
        
        # POST with complex body including items that should be sanitized
        post_body = {
            'tittel': 'QA Styrerapport',
            'motedato': '26. juni 2025',
            'periodeLabel': 'Q2 2025',
            'sammendrag': 'Linje1\n\nLinje2',
            'ask': ['Godkjenne budsjett', 'Beslutte kapital', ''],  # Empty string should be dropped
            'blokker': [
                {
                    'type': 'tekst',
                    'tittel': 'Marked',
                    'tekst': 'Vi vokser'
                },
                {
                    'type': 'tall',
                    'tittel': 'KPI',
                    'tall': [
                        {'etikett': 'Leietakere', 'verdi': '42', 'notat': '+5'},
                        {'etikett': '', 'verdi': ''}  # Should be dropped (no etikett or verdi)
                    ]
                },
                {
                    'type': 'liste',
                    'tittel': 'Risiko',
                    'punkter': ['A', 'B', '']  # Empty string should be dropped
                },
                {
                    'type': 'ukjent',  # Should be coerced to 'tekst'
                    'tittel': 'skal bli tekst'
                }
            ]
        }
        
        response = requests.post(url, json=post_body, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        
        # Check response structure
        if not data.get('ok'):
            print(f"✗ FAILED: ok should be true")
            return False
        print("✓ ok === true")
        
        if 'rapport' not in data:
            print(f"✗ FAILED: Missing 'rapport' in response")
            return False
        
        rapport = data['rapport']
        
        # Verify tittel
        if rapport.get('tittel') != 'QA Styrerapport':
            print(f"✗ FAILED: tittel should be 'QA Styrerapport', got '{rapport.get('tittel')}'")
            return False
        print(f"✓ tittel === 'QA Styrerapport'")
        
        # Verify ask array (empty string should be dropped, so 2 items remain)
        ask = rapport.get('ask', [])
        if len(ask) != 2:
            print(f"✗ FAILED: ask should have 2 items (empty string dropped), got {len(ask)}")
            return False
        if ask != ['Godkjenne budsjett', 'Beslutte kapital']:
            print(f"✗ FAILED: ask content mismatch: {ask}")
            return False
        print(f"✓ ask has 2 items (empty string dropped): {ask}")
        
        # Verify blokker
        blokker = rapport.get('blokker', [])
        if len(blokker) != 4:
            print(f"✗ FAILED: blokker should have 4 items, got {len(blokker)}")
            return False
        print(f"✓ blokker has 4 items")
        
        # Check each block has an id
        for i, block in enumerate(blokker):
            if 'id' not in block or not block['id']:
                print(f"✗ FAILED: blokker[{i}] missing id")
                return False
        print(f"✓ All blocks have id field")
        
        # Verify block 0 (tekst)
        if blokker[0]['type'] != 'tekst':
            print(f"✗ FAILED: blokker[0] should be type 'tekst', got '{blokker[0]['type']}'")
            return False
        print(f"✓ blokker[0] type === 'tekst'")
        
        # Verify block 1 (tall) - should have only 1 entry (empty one dropped)
        if blokker[1]['type'] != 'tall':
            print(f"✗ FAILED: blokker[1] should be type 'tall', got '{blokker[1]['type']}'")
            return False
        tall_array = blokker[1].get('tall', [])
        if len(tall_array) != 1:
            print(f"✗ FAILED: blokker[1].tall should have 1 entry (empty dropped), got {len(tall_array)}")
            return False
        if tall_array[0].get('etikett') != 'Leietakere':
            print(f"✗ FAILED: blokker[1].tall[0].etikett should be 'Leietakere', got '{tall_array[0].get('etikett')}'")
            return False
        print(f"✓ blokker[1] (tall) has 1 entry with etikett 'Leietakere' (empty entry dropped)")
        
        # Verify block 2 (liste) - should have 2 punkter (empty string dropped)
        if blokker[2]['type'] != 'liste':
            print(f"✗ FAILED: blokker[2] should be type 'liste', got '{blokker[2]['type']}'")
            return False
        punkter = blokker[2].get('punkter', [])
        if len(punkter) != 2:
            print(f"✗ FAILED: blokker[2].punkter should have 2 items (empty dropped), got {len(punkter)}")
            return False
        if punkter != ['A', 'B']:
            print(f"✗ FAILED: blokker[2].punkter should be ['A', 'B'], got {punkter}")
            return False
        print(f"✓ blokker[2] (liste) has 2 punkter ['A', 'B'] (empty string dropped)")
        
        # Verify block 3 (ukjent -> tekst)
        if blokker[3]['type'] != 'tekst':
            print(f"✗ FAILED: blokker[3] should be coerced to type 'tekst', got '{blokker[3]['type']}'")
            return False
        print(f"✓ blokker[3] type coerced from 'ukjent' to 'tekst'")
        
        # Verify oppdatert is ISO string
        if 'oppdatert' not in rapport or 'T' not in rapport['oppdatert']:
            print(f"✗ FAILED: oppdatert should be ISO string, got '{rapport.get('oppdatert')}'")
            return False
        print(f"✓ oppdatert is ISO string: {rapport['oppdatert']}")
        
        print("\n✅ TEST 3 PASSED: POST with validation/sanitization working correctly")
        return True
        
    except Exception as e:
        print(f"✗ FAILED: Exception during test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_get_persistence():
    """Test 4: GET again to verify persistence"""
    test_step(4, "GET PERSISTENCE - VERIFY SAVED DATA")
    try:
        url = f"{API_BASE}/admin/styrerapport?key={ADMIN_KEY}"
        response = requests.get(url, timeout=30)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        rapport = data.get('rapport')
        
        if rapport is None:
            print(f"✗ FAILED: rapport should not be null after POST")
            return False
        
        # Verify the saved data matches what we posted
        if rapport.get('tittel') != 'QA Styrerapport':
            print(f"✗ FAILED: tittel should be 'QA Styrerapport', got '{rapport.get('tittel')}'")
            return False
        print(f"✓ tittel === 'QA Styrerapport' (persisted)")
        
        # Verify ask
        ask = rapport.get('ask', [])
        if len(ask) != 2:
            print(f"✗ FAILED: ask should have 2 items, got {len(ask)}")
            return False
        print(f"✓ ask has 2 items (persisted)")
        
        # Verify blokker
        blokker = rapport.get('blokker', [])
        if len(blokker) != 4:
            print(f"✗ FAILED: blokker should have 4 items, got {len(blokker)}")
            return False
        print(f"✓ blokker has 4 items (persisted)")
        
        print("\n✅ TEST 4 PASSED: Persistence roundtrip confirmed")
        return True
        
    except Exception as e:
        print(f"✗ FAILED: Exception during test: {e}")
        return False

def test_post_empty_body():
    """Test 5: POST with empty body should use defaults"""
    test_step(5, "POST WITH EMPTY BODY - DEFAULTS")
    try:
        url = f"{API_BASE}/admin/styrerapport?key={ADMIN_KEY}"
        
        response = requests.post(url, json={}, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        
        if not data.get('ok'):
            print(f"✗ FAILED: ok should be true")
            return False
        
        rapport = data.get('rapport')
        
        # Verify defaults
        if rapport.get('tittel') != 'Styrerapport':
            print(f"✗ FAILED: tittel should default to 'Styrerapport', got '{rapport.get('tittel')}'")
            return False
        print(f"✓ tittel defaults to 'Styrerapport'")
        
        if rapport.get('ask') != []:
            print(f"✗ FAILED: ask should default to [], got {rapport.get('ask')}")
            return False
        print(f"✓ ask defaults to []")
        
        if rapport.get('blokker') != []:
            print(f"✗ FAILED: blokker should default to [], got {rapport.get('blokker')}")
            return False
        print(f"✓ blokker defaults to []")
        
        print("\n✅ TEST 5 PASSED: Empty body uses correct defaults")
        return True
        
    except Exception as e:
        print(f"✗ FAILED: Exception during test: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("STYRERAPPORT BACKEND TESTING")
    print("="*80)
    print(f"Base URL: {API_BASE}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print("="*80)
    
    results = []
    
    # Save original state FIRST
    if not save_original_state():
        print("\n❌ CRITICAL: Failed to save original state, aborting tests")
        return
    
    # Run tests
    results.append(("GET Structure & Best-effort null handling", test_get_structure()))
    results.append(("Auth (401 without key)", test_auth()))
    results.append(("POST roundtrip with validation/sanitization", test_post_roundtrip()))
    results.append(("GET persistence verification", test_get_persistence()))
    results.append(("POST with empty body (defaults)", test_post_empty_body()))
    
    # Restore original state LAST
    restore_success = restore_original_state()
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nRestore original state: {'✅ SUCCESS' if restore_success else '❌ FAILED'}")
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total and restore_success:
        print("\n🎉 ALL TESTS PASSED + ORIGINAL STATE RESTORED")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed or restore failed")

if __name__ == '__main__':
    main()
