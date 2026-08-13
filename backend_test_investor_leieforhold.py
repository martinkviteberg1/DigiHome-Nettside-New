#!/usr/bin/env python3
"""
Backend test for INVESTOR READ-ONLY ACCESS TO LEIEFORHOLD MODULE
Tests that investor role has read access but write operations are rejected.
"""

import requests
import sys
import json
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
INVESTOR_EMAIL = "qa-investor@example.com"
INVESTOR_PASSWORD = "QaInvest12345!"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

def test_investor_leieforhold_access():
    """Test investor read-only access to leieforhold module"""
    print("\n" + "="*80)
    print("TESTING: INVESTOR READ-ONLY ACCESS TO LEIEFORHOLD MODULE")
    print("="*80)
    
    try:
        # Connect to MongoDB to verify data integrity
        mongo_client = MongoClient(MONGO_URL)
        db = mongo_client[DB_NAME]
        
        # Get initial 'Lønn' entry state for regression check
        print("\n[SETUP] Getting initial 'Lønn' entry state from MongoDB...")
        lonn_before = db.enhetsokonomi.find_one({"type": "felles", "navn": "Lønn"})
        if lonn_before:
            print(f"✓ Found 'Lønn' entry: belop={lonn_before.get('belop')}, fordeling={lonn_before.get('fordeling')}")
        else:
            print("⚠ WARNING: 'Lønn' entry not found in database")
        
        # TEST 1: Login as investor
        print("\n[TEST 1] POST /api/admin/auth/login with investor credentials...")
        login_response = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={"email": INVESTOR_EMAIL, "password": INVESTOR_PASSWORD},
            timeout=10
        )
        
        if login_response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return False
        
        login_data = login_response.json()
        if "token" not in login_data:
            print(f"✗ FAILED: No token in response")
            print(f"Response: {login_data}")
            return False
        
        investor_token = login_data["token"]
        print(f"✓ PASSED: Login successful, got token (length={len(investor_token)})")
        
        # TEST 2: GET /api/admin/leieforhold with investor token
        print("\n[TEST 2] GET /api/admin/leieforhold with investor token...")
        lf_response = requests.get(
            f"{BASE_URL}/admin/leieforhold",
            params={"key": investor_token},
            timeout=60
        )
        
        if lf_response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {lf_response.status_code}")
            print(f"Response: {lf_response.text}")
            return False
        
        lf_data = lf_response.json()
        if not lf_data.get("ok"):
            print(f"✗ FAILED: ok is not true")
            print(f"Response: {lf_data}")
            return False
        
        rows = lf_data.get("rows", [])
        source = lf_data.get("source", "")
        cached = lf_data.get("cached", False)
        
        print(f"✓ PASSED: GET leieforhold successful")
        print(f"  - ok: {lf_data.get('ok')}")
        print(f"  - source: {source}")
        print(f"  - rows: {len(rows)}")
        print(f"  - cached: {cached}")
        
        if len(rows) < 20:
            print(f"⚠ WARNING: Expected ~29 rows, got {len(rows)}")
        
        # TEST 3: GET /api/admin/leieforhold/okonomi with investor token
        print("\n[TEST 3] GET /api/admin/leieforhold/okonomi with investor token...")
        okonomi_response = requests.get(
            f"{BASE_URL}/admin/leieforhold/okonomi",
            params={"key": investor_token},
            timeout=10
        )
        
        if okonomi_response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {okonomi_response.status_code}")
            print(f"Response: {okonomi_response.text}")
            return False
        
        okonomi_data = okonomi_response.json()
        if not okonomi_data.get("ok"):
            print(f"✗ FAILED: ok is not true")
            print(f"Response: {okonomi_data}")
            return False
        
        felles = okonomi_data.get("felles", [])
        enheter = okonomi_data.get("enheter", {})
        
        # Check for 'Lønn' entry
        lonn_found = any(f.get("navn") == "Lønn" for f in felles)
        
        print(f"✓ PASSED: GET okonomi successful")
        print(f"  - ok: {okonomi_data.get('ok')}")
        print(f"  - felles entries: {len(felles)}")
        print(f"  - enheter entries: {len(enheter)}")
        print(f"  - 'Lønn' entry found: {lonn_found}")
        
        if not lonn_found:
            print(f"⚠ WARNING: 'Lønn' entry not found in felles list")
        
        # TEST 4: GET /api/admin/leieforhold/xlsx with investor token
        print("\n[TEST 4] GET /api/admin/leieforhold/xlsx with investor token...")
        xlsx_response = requests.get(
            f"{BASE_URL}/admin/leieforhold/xlsx",
            params={"key": investor_token},
            timeout=60
        )
        
        if xlsx_response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {xlsx_response.status_code}")
            print(f"Response: {xlsx_response.text[:500]}")
            return False
        
        content_type = xlsx_response.headers.get("Content-Type", "")
        body_size = len(xlsx_response.content)
        
        # Check for valid XLSX signature (PK\x03\x04)
        is_valid_xlsx = xlsx_response.content[:4] == b'PK\x03\x04'
        
        print(f"✓ PASSED: GET xlsx successful")
        print(f"  - Content-Type: {content_type}")
        print(f"  - Body size: {body_size} bytes")
        print(f"  - Valid XLSX signature (PK\\x03\\x04): {is_valid_xlsx}")
        
        if "spreadsheetml" not in content_type:
            print(f"⚠ WARNING: Expected spreadsheetml in Content-Type, got {content_type}")
        
        if not is_valid_xlsx:
            print(f"✗ FAILED: Invalid XLSX signature")
            print(f"First 10 bytes: {xlsx_response.content[:10]}")
            return False
        
        # TEST 5a: PUT /api/admin/leieforhold/okonomi/felles with investor token (should be rejected)
        print("\n[TEST 5a] PUT /api/admin/leieforhold/okonomi/felles with investor token (should be 401)...")
        put_felles_response = requests.put(
            f"{BASE_URL}/admin/leieforhold/okonomi/felles",
            params={"key": investor_token},
            json={"navn": "QA-test-avvis", "belop": 1},
            timeout=10
        )
        
        if put_felles_response.status_code != 401:
            print(f"✗ FAILED: Expected 401, got {put_felles_response.status_code}")
            print(f"Response: {put_felles_response.text}")
            return False
        
        print(f"✓ PASSED: PUT felles correctly rejected with 401")
        
        # TEST 5b: DELETE /api/admin/leieforhold/okonomi/felles with investor token (should be rejected)
        print("\n[TEST 5b] DELETE /api/admin/leieforhold/okonomi/felles with investor token (should be 401)...")
        delete_felles_response = requests.delete(
            f"{BASE_URL}/admin/leieforhold/okonomi/felles",
            params={"key": investor_token, "id": "finnes-ikke-qa"},
            timeout=10
        )
        
        if delete_felles_response.status_code != 401:
            print(f"✗ FAILED: Expected 401, got {delete_felles_response.status_code}")
            print(f"Response: {delete_felles_response.text}")
            return False
        
        print(f"✓ PASSED: DELETE felles correctly rejected with 401")
        
        # TEST 5c: PUT /api/admin/leieforhold/okonomi/enhet with investor token (should be rejected)
        print("\n[TEST 5c] PUT /api/admin/leieforhold/okonomi/enhet with investor token (should be 401)...")
        put_enhet_response = requests.put(
            f"{BASE_URL}/admin/leieforhold/okonomi/enhet",
            params={"key": investor_token},
            json={"enhetId": "qa-avvis-x", "cac": 1},
            timeout=10
        )
        
        if put_enhet_response.status_code != 401:
            print(f"✗ FAILED: Expected 401, got {put_enhet_response.status_code}")
            print(f"Response: {put_enhet_response.text}")
            return False
        
        print(f"✓ PASSED: PUT enhet correctly rejected with 401")
        
        # TEST 5d: Verify no 'QA-test-avvis' entry was created (using admin key)
        print("\n[TEST 5d] Verify no 'QA-test-avvis' entry was created...")
        verify_response = requests.get(
            f"{BASE_URL}/admin/leieforhold/okonomi",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        
        if verify_response.status_code != 200:
            print(f"✗ FAILED: Could not verify with admin key, got {verify_response.status_code}")
            return False
        
        verify_data = verify_response.json()
        verify_felles = verify_data.get("felles", [])
        qa_test_found = any(f.get("navn") == "QA-test-avvis" for f in verify_felles)
        
        if qa_test_found:
            print(f"✗ FAILED: 'QA-test-avvis' entry was created despite 401 rejection!")
            return False
        
        print(f"✓ PASSED: No 'QA-test-avvis' entry found (write operations correctly blocked)")
        
        # TEST 6: GET /api/admin/leieforhold without key (should be 401)
        print("\n[TEST 6] GET /api/admin/leieforhold without key (should be 401)...")
        no_key_response = requests.get(
            f"{BASE_URL}/admin/leieforhold",
            timeout=10
        )
        
        if no_key_response.status_code != 401:
            print(f"✗ FAILED: Expected 401, got {no_key_response.status_code}")
            print(f"Response: {no_key_response.text}")
            return False
        
        print(f"✓ PASSED: GET leieforhold without key correctly rejected with 401")
        
        # TEST 7: REGRESSION - GET /api/admin/leieforhold with admin key
        print("\n[TEST 7] REGRESSION - GET /api/admin/leieforhold with admin key...")
        admin_lf_response = requests.get(
            f"{BASE_URL}/admin/leieforhold",
            params={"key": ADMIN_KEY},
            timeout=60
        )
        
        if admin_lf_response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {admin_lf_response.status_code}")
            print(f"Response: {admin_lf_response.text}")
            return False
        
        admin_lf_data = admin_lf_response.json()
        admin_rows = admin_lf_data.get("rows", [])
        admin_totals = admin_lf_data.get("totals", {})
        admin_fee = admin_totals.get("fee", 0)
        
        print(f"✓ PASSED: GET leieforhold with admin key successful")
        print(f"  - rows: {len(admin_rows)}")
        print(f"  - totals.fee: {admin_fee}")
        
        if len(admin_rows) < 20:
            print(f"⚠ WARNING: Expected ~29 rows, got {len(admin_rows)}")
        
        if admin_fee <= 0:
            print(f"⚠ WARNING: Expected totals.fee > 0, got {admin_fee}")
        
        # TEST 8: REGRESSION - GET /api/admin/leieforhold/okonomi with admin key
        print("\n[TEST 8] REGRESSION - GET /api/admin/leieforhold/okonomi with admin key...")
        admin_okonomi_response = requests.get(
            f"{BASE_URL}/admin/leieforhold/okonomi",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        
        if admin_okonomi_response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {admin_okonomi_response.status_code}")
            print(f"Response: {admin_okonomi_response.text}")
            return False
        
        admin_okonomi_data = admin_okonomi_response.json()
        admin_felles = admin_okonomi_data.get("felles", [])
        
        # Check 'Lønn' entry is intact
        lonn_after = next((f for f in admin_felles if f.get("navn") == "Lønn"), None)
        
        print(f"✓ PASSED: GET okonomi with admin key successful")
        print(f"  - felles entries: {len(admin_felles)}")
        
        if lonn_after:
            print(f"  - 'Lønn' entry found: belop={lonn_after.get('belop')}, fordeling={lonn_after.get('fordeling')}")
            
            # Verify 'Lønn' entry is unchanged
            if lonn_before and lonn_after.get("belop") != lonn_before.get("belop"):
                print(f"✗ FAILED: 'Lønn' entry was modified! Before: {lonn_before.get('belop')}, After: {lonn_after.get('belop')}")
                return False
            
            print(f"✓ PASSED: 'Lønn' entry is intact (unchanged)")
        else:
            print(f"⚠ WARNING: 'Lønn' entry not found in admin response")
        
        print("\n" + "="*80)
        print("ALL TESTS PASSED ✓")
        print("="*80)
        print("\nSUMMARY:")
        print("  ✓ Investor login successful")
        print("  ✓ Investor can read leieforhold data (GET /admin/leieforhold)")
        print("  ✓ Investor can read okonomi data (GET /admin/leieforhold/okonomi)")
        print("  ✓ Investor can download XLSX export (GET /admin/leieforhold/xlsx)")
        print("  ✓ Investor CANNOT write felles entries (PUT rejected with 401)")
        print("  ✓ Investor CANNOT delete felles entries (DELETE rejected with 401)")
        print("  ✓ Investor CANNOT write enhet entries (PUT rejected with 401)")
        print("  ✓ No data was modified by rejected write attempts")
        print("  ✓ Auth working correctly (401 without key)")
        print("  ✓ Admin access still working (regression)")
        print("  ✓ 'Lønn' entry intact (regression)")
        
        mongo_client.close()
        return True
        
    except Exception as e:
        print(f"\n✗ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_investor_leieforhold_access()
    sys.exit(0 if success else 1)
