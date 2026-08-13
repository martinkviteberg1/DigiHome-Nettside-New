#!/usr/bin/env python3
"""
Backend test for UTFLYTTINGSDATO + ENHETS-SKUFF + KONTRAKT-PDF-PROXY
Tests the leieforhold (rental relationships) module with move-out dates, unit drawer, and contract PDF proxy.

Base URL: https://saker-hub.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4
Investor credentials: qa-investor@example.com / QaInvest12345!

CRITICAL SAFETY RULES:
1. SendGrid is LIVE - no emails will be sent (read-only tests)
2. Do NOT delete 'Lønn — 1 ansatt' entry in enhetsokonomi collection
3. Do NOT touch qa-investor@example.com or martin@kviteberg.no
4. Platform API is real prod but only GET (safe)
5. Clean up own QA data (none created in this test)
"""

import requests
import sys
import time

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
INVESTOR_EMAIL = "qa-investor@example.com"
INVESTOR_PASSWORD = "QaInvest12345!"

def test_leieforhold_main_endpoint():
    """
    Test 1: GET /api/admin/leieforhold?key=<admin>
    Should return 200 with source='lease-income', totals.fee > 0, totals.net > 0
    All 'leased' rows should have non-empty move_in_date, lease_id, bolig_type
    At least one row should have non-empty forvaltning_id and forvaltning_status
    """
    print("\n=== TEST 1: GET /api/admin/leieforhold (main endpoint) ===")
    
    try:
        url = f"{BASE_URL}/admin/leieforhold?key={ADMIN_KEY}"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=60)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Check ok field
        if not data.get('ok'):
            print(f"❌ FAIL: Response ok field is not true")
            return False
        
        # Check source
        source = data.get('source')
        if source != 'lease-income':
            print(f"❌ FAIL: Expected source='lease-income', got '{source}'")
            return False
        print(f"✓ Source: {source}")
        
        # Check totals
        totals = data.get('totals', {})
        fee = totals.get('fee', 0)
        net = totals.get('net', 0)
        
        if fee <= 0:
            print(f"❌ FAIL: totals.fee should be > 0, got {fee}")
            return False
        print(f"✓ totals.fee: {fee}")
        
        if net <= 0:
            print(f"❌ FAIL: totals.net should be > 0, got {net}")
            return False
        print(f"✓ totals.net: {net}")
        
        # Check rows
        rows = data.get('rows', [])
        if not rows:
            print(f"❌ FAIL: No rows returned")
            return False
        print(f"✓ Total rows: {len(rows)}")
        
        # Check all 'leased' rows have required fields
        leased_rows = [r for r in rows if r.get('group') == 'leased']
        print(f"✓ Leased rows: {len(leased_rows)}")
        
        for i, row in enumerate(leased_rows):
            move_in = row.get('move_in_date')
            lease_id = row.get('lease_id')
            bolig_type = row.get('bolig_type')
            
            if not move_in:
                print(f"❌ FAIL: Leased row {i} missing move_in_date")
                return False
            if not lease_id:
                print(f"❌ FAIL: Leased row {i} missing lease_id")
                return False
            if not bolig_type:
                print(f"❌ FAIL: Leased row {i} missing bolig_type")
                return False
        
        print(f"✓ All {len(leased_rows)} leased rows have move_in_date, lease_id, and bolig_type")
        
        # Check at least one row has forvaltning_id and forvaltning_status
        has_forvaltning = False
        for row in rows:
            if row.get('forvaltning_id') and row.get('forvaltning_status'):
                has_forvaltning = True
                print(f"✓ Found row with forvaltning_id: {row.get('forvaltning_id')}, status: {row.get('forvaltning_status')}")
                break
        
        if not has_forvaltning:
            print(f"❌ FAIL: No row found with both forvaltning_id and forvaltning_status")
            return False
        
        print("✅ TEST 1 PASSED")
        return True, data
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_kontrakt_pdf_no_auth():
    """
    Test 2: GET /api/admin/leieforhold/kontrakt-pdf without key
    Should return 401
    """
    print("\n=== TEST 2: GET kontrakt-pdf without auth ===")
    
    try:
        url = f"{BASE_URL}/admin/leieforhold/kontrakt-pdf"
        print(f"Calling: {url} (no key)")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAIL: Expected 401, got {response.status_code}")
            return False
        
        print("✅ TEST 2 PASSED")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_kontrakt_pdf_invalid_id():
    """
    Test 3: GET /api/admin/leieforhold/kontrakt-pdf?key=<admin>&id=abc
    Should return 400
    """
    print("\n=== TEST 3: GET kontrakt-pdf with invalid id ===")
    
    try:
        url = f"{BASE_URL}/admin/leieforhold/kontrakt-pdf?key={ADMIN_KEY}&id=abc"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 400:
            print(f"❌ FAIL: Expected 400, got {response.status_code}")
            return False
        
        data = response.json()
        if 'error' not in data:
            print(f"❌ FAIL: Expected error field in response")
            return False
        
        print(f"✓ Error message: {data.get('error')}")
        print("✅ TEST 3 PASSED")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False

def test_kontrakt_pdf_valid_id(lease_id):
    """
    Test 4: GET /api/admin/leieforhold/kontrakt-pdf?key=<admin>&id=<valid_lease_id>
    Should return 200 with EITHER:
    - text/html with "PDF-en er ikke tilgjengelig ennå" (platform hasn't delivered endpoint yet)
    - application/pdf (if platform has delivered)
    Both are PASS
    """
    print("\n=== TEST 4: GET kontrakt-pdf with valid lease_id ===")
    
    try:
        url = f"{BASE_URL}/admin/leieforhold/kontrakt-pdf?key={ADMIN_KEY}&id={lease_id}"
        print(f"Calling: {url}")
        print(f"Using lease_id: {lease_id}")
        
        response = requests.get(url, timeout=40)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
        
        content_type = response.headers.get('content-type', '')
        print(f"✓ Content-Type: {content_type}")
        
        if 'text/html' in content_type:
            # Check for waiting page
            if 'PDF-en er ikke tilgjengelig ennå' in response.text:
                print("✓ Received HTML waiting page (platform endpoint not delivered yet)")
                print("✅ TEST 4 PASSED (HTML waiting page)")
                return True
            else:
                print(f"❌ FAIL: HTML response but doesn't contain expected message")
                print(f"Response preview: {response.text[:200]}")
                return False
        elif 'application/pdf' in content_type:
            print("✓ Received PDF (platform has delivered endpoint)")
            print(f"✓ PDF size: {len(response.content)} bytes")
            print("✅ TEST 4 PASSED (PDF delivered)")
            return True
        else:
            print(f"❌ FAIL: Unexpected content-type: {content_type}")
            return False
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_kontrakt_pdf_investor_auth(lease_id):
    """
    Test 5: Login as investor and GET kontrakt-pdf with investor token
    Should return 200 (investor has leieforhold module)
    """
    print("\n=== TEST 5: GET kontrakt-pdf with investor auth ===")
    
    try:
        # Login as investor
        login_url = f"{BASE_URL}/admin/auth/login"
        print(f"Logging in as investor: {INVESTOR_EMAIL}")
        
        login_response = requests.post(
            login_url,
            json={"email": INVESTOR_EMAIL, "password": INVESTOR_PASSWORD},
            timeout=10
        )
        
        if login_response.status_code != 200:
            print(f"❌ FAIL: Login failed with status {login_response.status_code}")
            print(f"Response: {login_response.text[:500]}")
            return False
        
        login_data = login_response.json()
        investor_token = login_data.get('token')
        
        if not investor_token:
            print(f"❌ FAIL: No token in login response")
            return False
        
        print(f"✓ Logged in successfully, got token")
        
        # Now try to access kontrakt-pdf with investor token
        url = f"{BASE_URL}/admin/leieforhold/kontrakt-pdf?key={investor_token}&id={lease_id}"
        print(f"Calling kontrakt-pdf with investor token")
        
        response = requests.get(url, timeout=40)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        content_type = response.headers.get('content-type', '')
        print(f"✓ Content-Type: {content_type}")
        
        # Either HTML waiting page or PDF is acceptable
        if 'text/html' in content_type or 'application/pdf' in content_type:
            print("✓ Investor can access kontrakt-pdf (has leieforhold module)")
            print("✅ TEST 5 PASSED")
            return True
        else:
            print(f"❌ FAIL: Unexpected content-type: {content_type}")
            return False
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_regression_endpoints():
    """
    Test 6: Regression tests
    - GET /api/admin/leieforhold/okonomi should return 200 with 'Lønn — 1 ansatt' entry
    - GET /api/admin/leieforhold/xlsx should return 200 with valid XLSX (≥3 sheets)
    - GET /api/admin/datarom/oversikt should return 200 with ok:true
    """
    print("\n=== TEST 6: Regression endpoints ===")
    
    all_passed = True
    
    # Test 6a: okonomi endpoint
    print("\n--- Test 6a: GET /api/admin/leieforhold/okonomi ---")
    try:
        url = f"{BASE_URL}/admin/leieforhold/okonomi?key={ADMIN_KEY}"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            felles = data.get('felles', [])
            
            # Check for 'Lønn — 1 ansatt' entry
            lonn_found = False
            for item in felles:
                if 'Lønn' in item.get('navn', '') and '1 ansatt' in item.get('navn', ''):
                    lonn_found = True
                    print(f"✓ Found 'Lønn — 1 ansatt' entry: {item.get('navn')}")
                    break
            
            if not lonn_found:
                print(f"❌ FAIL: 'Lønn — 1 ansatt' entry not found in felles array")
                all_passed = False
            else:
                print("✓ Test 6a PASSED")
        
    except Exception as e:
        print(f"❌ FAIL: Exception in test 6a: {e}")
        all_passed = False
    
    # Test 6b: xlsx endpoint
    print("\n--- Test 6b: GET /api/admin/leieforhold/xlsx ---")
    try:
        url = f"{BASE_URL}/admin/leieforhold/xlsx?key={ADMIN_KEY}"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            content_type = response.headers.get('content-type', '')
            print(f"✓ Content-Type: {content_type}")
            
            if 'spreadsheet' not in content_type and 'excel' not in content_type:
                print(f"⚠ WARNING: Unexpected content-type for XLSX: {content_type}")
            
            # Check if it's a valid XLSX by checking magic bytes
            content = response.content
            if len(content) < 4:
                print(f"❌ FAIL: Response too short to be valid XLSX")
                all_passed = False
            elif content[:4] == b'PK\x03\x04':
                print(f"✓ Valid XLSX file (ZIP signature found)")
                print(f"✓ File size: {len(content)} bytes")
                
                # Try to count sheets (basic check)
                # XLSX files contain sheet references in xl/workbook.xml
                if b'xl/worksheets/' in content:
                    sheet_count = content.count(b'xl/worksheets/sheet')
                    print(f"✓ Estimated sheet count: {sheet_count}")
                    if sheet_count < 3:
                        print(f"❌ FAIL: Expected ≥3 sheets, found {sheet_count}")
                        all_passed = False
                    else:
                        print("✓ Test 6b PASSED")
                else:
                    print("⚠ WARNING: Could not verify sheet count")
                    print("✓ Test 6b PASSED (file is valid XLSX)")
            else:
                print(f"❌ FAIL: Not a valid XLSX file (wrong magic bytes)")
                all_passed = False
        
    except Exception as e:
        print(f"❌ FAIL: Exception in test 6b: {e}")
        all_passed = False
    
    # Test 6c: datarom/oversikt endpoint
    print("\n--- Test 6c: GET /api/admin/datarom/oversikt ---")
    try:
        url = f"{BASE_URL}/admin/datarom/oversikt?key={ADMIN_KEY}"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            if not data.get('ok'):
                print(f"❌ FAIL: Response ok field is not true")
                all_passed = False
            else:
                print("✓ Test 6c PASSED")
        
    except Exception as e:
        print(f"❌ FAIL: Exception in test 6c: {e}")
        all_passed = False
    
    if all_passed:
        print("\n✅ TEST 6 (ALL REGRESSION TESTS) PASSED")
    else:
        print("\n❌ TEST 6 FAILED (some regression tests failed)")
    
    return all_passed

def main():
    print("=" * 80)
    print("BACKEND TEST: UTFLYTTINGSDATO + ENHETS-SKUFF + KONTRAKT-PDF-PROXY")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Investor: {INVESTOR_EMAIL}")
    print("=" * 80)
    
    results = []
    
    # Test 1: Main leieforhold endpoint
    result = test_leieforhold_main_endpoint()
    if isinstance(result, tuple):
        test1_passed, leieforhold_data = result
        results.append(("Test 1: GET /api/admin/leieforhold", test1_passed))
    else:
        test1_passed = result
        leieforhold_data = None
        results.append(("Test 1: GET /api/admin/leieforhold", test1_passed))
    
    # Extract a valid lease_id for subsequent tests
    lease_id = None
    if test1_passed and leieforhold_data:
        rows = leieforhold_data.get('rows', [])
        for row in rows:
            if row.get('lease_id'):
                lease_id = row.get('lease_id')
                print(f"\n✓ Using lease_id for subsequent tests: {lease_id}")
                break
    
    if not lease_id:
        print("\n⚠ WARNING: No lease_id found, tests 4 and 5 will be skipped")
    
    # Test 2: No auth
    results.append(("Test 2: kontrakt-pdf without auth", test_kontrakt_pdf_no_auth()))
    
    # Test 3: Invalid id
    results.append(("Test 3: kontrakt-pdf with invalid id", test_kontrakt_pdf_invalid_id()))
    
    # Test 4: Valid id (only if we have a lease_id)
    if lease_id:
        results.append(("Test 4: kontrakt-pdf with valid lease_id", test_kontrakt_pdf_valid_id(lease_id)))
    else:
        results.append(("Test 4: kontrakt-pdf with valid lease_id", "SKIPPED"))
    
    # Test 5: Investor auth (only if we have a lease_id)
    if lease_id:
        results.append(("Test 5: kontrakt-pdf with investor auth", test_kontrakt_pdf_investor_auth(lease_id)))
    else:
        results.append(("Test 5: kontrakt-pdf with investor auth", "SKIPPED"))
    
    # Test 6: Regression
    results.append(("Test 6: Regression endpoints", test_regression_endpoints()))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = 0
    failed = 0
    skipped = 0
    
    for test_name, result in results:
        if result == "SKIPPED":
            print(f"⊘ {test_name}: SKIPPED")
            skipped += 1
        elif result:
            print(f"✅ {test_name}: PASSED")
            passed += 1
        else:
            print(f"❌ {test_name}: FAILED")
            failed += 1
    
    print("=" * 80)
    print(f"Total: {passed} passed, {failed} failed, {skipped} skipped out of {len(results)} tests")
    print("=" * 80)
    
    if failed > 0:
        print("\n❌ SOME TESTS FAILED")
        sys.exit(1)
    elif skipped > 0:
        print(f"\n⚠ ALL TESTS PASSED (but {skipped} tests were skipped)")
        sys.exit(0)
    else:
        print("\n✅ ALL TESTS PASSED")
        sys.exit(0)

if __name__ == "__main__":
    main()
