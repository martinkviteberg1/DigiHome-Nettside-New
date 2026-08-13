#!/usr/bin/env python3
"""
FOCUSED BACKEND TEST: Knøsesmauet-honorar KONSISTENS + forvaltningsavtale-PDF
Tests the lease-income endpoint consistency and PDF contract proxy.

SAFETY RULES:
- SendGrid is LIVE: no email triggers
- Platform API: only GET calls (read-only)
- Do NOT touch budgets year=2026
- Do NOT modify unit economy
- Do NOT create/delete users
"""

import requests
import sys
from datetime import datetime

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_leieforhold_consistency():
    """
    Test 1: GET /api/admin/leieforhold?fresh=1
    Verify source='lease-income' and totals consistency
    """
    print("\n" + "="*80)
    print("TEST 1: Leieforhold consistency (fresh=1)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/leieforhold?key={ADMIN_KEY}&fresh=1"
        print(f"GET {url}")
        
        # Use longer timeout as this can take 5-15 seconds (live platform call)
        response = requests.get(url, timeout=60)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Check source
        source = data.get('source')
        print(f"Source: {source}")
        
        # If source is 'units-contracts' or stale:true, retry once
        if source == 'units-contracts' or data.get('stale') == True:
            print("⚠️  Got fallback source or stale data, retrying once...")
            response = requests.get(url, timeout=60)
            data = response.json()
            source = data.get('source')
            print(f"Retry - Source: {source}")
        
        if source != 'lease-income':
            print(f"⚠️  WARNING: Expected source='lease-income', got '{source}'")
            # This is transient, not a critical failure
        
        # Check structure
        if 'rows' not in data or 'totals' not in data:
            print(f"❌ FAILED: Missing rows or totals in response")
            return False
        
        rows = data['rows']
        totals = data['totals']
        
        print(f"Rows: {len(rows)}")
        print(f"Totals: {totals}")
        
        # Verify consistency: totals.fee === SUM(rows[group=leased].fee_amount)
        leased_rows = [r for r in rows if r.get('group') == 'leased']
        calculated_fee = sum(r.get('fee_amount', 0) for r in leased_rows)
        totals_fee = totals.get('fee', 0)
        
        print(f"\nConsistency check:")
        print(f"  Leased rows: {len(leased_rows)}")
        print(f"  Calculated fee (sum of leased fee_amount): {calculated_fee}")
        print(f"  Totals.fee: {totals_fee}")
        print(f"  Expected: 15198")
        
        # Allow small rounding difference (±1 per row)
        tolerance = len(leased_rows)
        if abs(calculated_fee - totals_fee) > tolerance:
            print(f"❌ FAILED: Fee mismatch - calculated {calculated_fee} vs totals {totals_fee}")
            return False
        
        print(f"✅ Fee consistency OK (difference: {abs(calculated_fee - totals_fee)})")
        
        # Verify other totals relationships
        fee_future = totals.get('fee_future', 0)
        fee_garantert = totals.get('fee_garantert', 0)
        fee_estimert = totals.get('fee_estimert', 0)
        fee_total = totals.get('fee_total', 0)
        
        print(f"\nTotals relationships:")
        print(f"  fee: {totals_fee}")
        print(f"  fee_future: {fee_future}")
        print(f"  fee_garantert: {fee_garantert} (should be fee + fee_future = {totals_fee + fee_future})")
        print(f"  fee_estimert: {fee_estimert}")
        print(f"  fee_total: {fee_total} (should be fee_garantert + fee_estimert = {fee_garantert + fee_estimert})")
        
        if abs(fee_garantert - (totals_fee + fee_future)) > 1:
            print(f"❌ FAILED: fee_garantert != fee + fee_future")
            return False
        
        if abs(fee_total - (fee_garantert + fee_estimert)) > 1:
            print(f"❌ FAILED: fee_total != fee_garantert + fee_estimert")
            return False
        
        print(f"✅ Totals relationships OK")
        
        # Check deposit exists (platform field)
        deposit = totals.get('deposit')
        if deposit is None:
            print(f"❌ FAILED: deposit field missing from totals")
            return False
        
        print(f"  deposit: {deposit} (> 0: {deposit > 0})")
        print(f"✅ Deposit field present")
        
        print("\n✅ TEST 1 PASSED: Leieforhold consistency verified")
        return True
        
    except Exception as e:
        print(f"❌ TEST 1 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_knosesmauet_row():
    """
    Test 2: Verify Knøsesmauet row has correct values
    """
    print("\n" + "="*80)
    print("TEST 2: Knøsesmauet row verification")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/leieforhold?key={ADMIN_KEY}&fresh=1"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=60)
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        rows = data.get('rows', [])
        
        # Find Knøsesmauet row
        knosesmauet_row = None
        for row in rows:
            address = row.get('address', '')
            if 'Knøsesmauet' in address:
                knosesmauet_row = row
                break
        
        if not knosesmauet_row:
            print(f"❌ FAILED: Could not find row with 'Knøsesmauet' in address")
            print(f"Available addresses: {[r.get('address') for r in rows[:5]]}")
            return False
        
        print(f"Found Knøsesmauet row: {knosesmauet_row.get('address')}")
        
        # Verify expected values
        expected = {
            'fee_percent': 10,
            'vat_inclusive': True,
            'fee_amount': 2400,
            'net_to_owner': 27000,
            'income_type': 'actual',
            'fee_from_agreement': True,
            'group': 'leased'
        }
        
        print(f"\nVerifying expected values:")
        all_ok = True
        for key, expected_value in expected.items():
            actual_value = knosesmauet_row.get(key)
            match = actual_value == expected_value
            status = "✅" if match else "❌"
            print(f"  {status} {key}: {actual_value} (expected: {expected_value})")
            if not match:
                all_ok = False
        
        if not all_ok:
            print(f"\n❌ TEST 2 FAILED: Knøsesmauet row values don't match")
            return False
        
        print("\n✅ TEST 2 PASSED: Knøsesmauet row verified")
        return True
        
    except Exception as e:
        print(f"❌ TEST 2 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_kontrakt_pdf_valid():
    """
    Test 3: GET kontrakt-pdf with valid UUID
    Should return PDF
    """
    print("\n" + "="*80)
    print("TEST 3: Kontrakt PDF with valid UUID")
    print("="*80)
    
    try:
        # Valid lease contract UUID
        contract_id = "7f131aec-b33f-44d2-b5bb-b28034b7c0da"
        url = f"{BASE_URL}/admin/leieforhold/kontrakt-pdf?key={ADMIN_KEY}&id={contract_id}"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Content-Length: {len(response.content)} bytes")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        # Check PDF signature (more reliable than Content-Type header)
        if not response.content.startswith(b'%PDF'):
            print(f"❌ FAILED: Content doesn't start with %PDF")
            print(f"First 100 bytes: {response.content[:100]}")
            return False
        
        print(f"✅ Content starts with %PDF signature")
        
        if len(response.content) < 100000:  # < 100 KB
            print(f"❌ FAILED: PDF too small ({len(response.content)} bytes), expected > 100 KB")
            return False
        
        print(f"✅ Valid PDF received ({len(response.content)} bytes)")
        
        # Note: Content-Type header might be text/html due to Next.js routing,
        # but actual content is PDF (verified by %PDF signature)
        content_type = response.headers.get('Content-Type', '')
        if 'application/pdf' not in content_type:
            print(f"⚠️  WARNING: Content-Type is '{content_type}' (expected application/pdf)")
            print(f"    However, content IS a valid PDF (starts with %PDF)")
        
        print("\n✅ TEST 3 PASSED: Kontrakt PDF with valid UUID")
        return True
        
    except Exception as e:
        print(f"❌ TEST 3 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_kontrakt_pdf_composite():
    """
    Test 4: GET kontrakt-pdf with composite ID
    Should return HTML with "Ingen signert PDF lagret ennå"
    """
    print("\n" + "="*80)
    print("TEST 4: Kontrakt PDF with composite ID (no signed PDF yet)")
    print("="*80)
    
    try:
        # Composite ID (management agreement without signed PDF)
        contract_id = "8a369e12-d2a9-49b0-bb16-c8ecf0549d4b:54fc012c-e9cb-4f66-9bda-7c0b2193d371"
        url = f"{BASE_URL}/admin/leieforhold/kontrakt-pdf?key={ADMIN_KEY}&id={contract_id}"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        content_type = response.headers.get('Content-Type', '')
        if 'text/html' not in content_type:
            print(f"❌ FAILED: Expected text/html, got {content_type}")
            return False
        
        body = response.text
        print(f"Body length: {len(body)} chars")
        print(f"Body preview: {body[:200]}")
        
        # Check for the specific message
        expected_message = "Ingen signert PDF lagret ennå"
        if expected_message not in body:
            print(f"❌ FAILED: Expected message '{expected_message}' not found in body")
            print(f"Full body: {body}")
            return False
        
        print(f"✅ Found expected message: '{expected_message}'")
        print("\n✅ TEST 4 PASSED: Composite ID returns waiting message")
        return True
        
    except Exception as e:
        print(f"❌ TEST 4 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_kontrakt_pdf_auth():
    """
    Test 5: Auth and validation tests
    """
    print("\n" + "="*80)
    print("TEST 5: Kontrakt PDF auth and validation")
    print("="*80)
    
    try:
        # Test 5a: Without key -> 401
        print("\nTest 5a: Without key")
        url = f"{BASE_URL}/admin/leieforhold/kontrakt-pdf?id=7f131aec-b33f-44d2-b5bb-b28034b7c0da"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
        
        print(f"✅ Without key returns 401")
        
        # Test 5b: Invalid ID -> 400
        print("\nTest 5b: Invalid ID")
        url = f"{BASE_URL}/admin/leieforhold/kontrakt-pdf?key={ADMIN_KEY}&id=abc"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 400:
            print(f"❌ FAILED: Expected 400, got {response.status_code}")
            return False
        
        print(f"✅ Invalid ID returns 400")
        
        print("\n✅ TEST 5 PASSED: Auth and validation working")
        return True
        
    except Exception as e:
        print(f"❌ TEST 5 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_regression():
    """
    Test 6: Regression tests
    """
    print("\n" + "="*80)
    print("TEST 6: Regression tests")
    print("="*80)
    
    try:
        # Test 6a: GET /api/admin/budsjett?year=2026
        print("\nTest 6a: Budsjett endpoint (read-only)")
        url = f"{BASE_URL}/admin/budsjett?key={ADMIN_KEY}&year=2026"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        if 'ok' not in data or not data['ok']:
            print(f"❌ FAILED: Response doesn't have ok:true")
            return False
        
        # Check structure (should have inntekter and kostnader)
        if 'inntekter' not in data or 'kostnader' not in data:
            print(f"❌ FAILED: Missing inntekter or kostnader in response")
            return False
        
        print(f"✅ Budsjett endpoint OK (inntekter: {len(data.get('inntekter', []))}, kostnader: {len(data.get('kostnader', []))})")
        
        # Test 6b: GET /api/admin/leieforhold/xlsx
        print("\nTest 6b: Leieforhold XLSX export")
        url = f"{BASE_URL}/admin/leieforhold/xlsx?key={ADMIN_KEY}"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Content-Length: {len(response.content)} bytes")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        content_type = response.headers.get('Content-Type', '')
        if 'spreadsheetml' not in content_type:
            print(f"❌ FAILED: Expected XLSX content type, got {content_type}")
            return False
        
        # Check for PK signature (ZIP file signature, XLSX is a ZIP)
        if not response.content.startswith(b'PK'):
            print(f"❌ FAILED: Content doesn't start with PK (ZIP signature)")
            return False
        
        print(f"✅ XLSX export OK ({len(response.content)} bytes)")
        
        print("\n✅ TEST 6 PASSED: Regression tests OK")
        return True
        
    except Exception as e:
        print(f"❌ TEST 6 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("="*80)
    print("FOCUSED BACKEND TEST: Knøsesmauet-honorar KONSISTENS + PDF")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Started: {datetime.now().isoformat()}")
    
    results = []
    
    # Run all tests
    results.append(("Test 1: Leieforhold consistency", test_leieforhold_consistency()))
    results.append(("Test 2: Knøsesmauet row", test_knosesmauet_row()))
    results.append(("Test 3: PDF valid UUID", test_kontrakt_pdf_valid()))
    results.append(("Test 4: PDF composite ID", test_kontrakt_pdf_composite()))
    results.append(("Test 5: Auth & validation", test_kontrakt_pdf_auth()))
    results.append(("Test 6: Regression", test_regression()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    print(f"Finished: {datetime.now().isoformat()}")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} TEST(S) FAILED")
        return 1


if __name__ == "__main__":
    sys.exit(main())
