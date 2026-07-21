#!/usr/bin/env python3
"""
Test the EXTENDED CSV export endpoint for leads pipeline.
Tests POST /api/admin/leads/export with ids-filter functionality.

CRITICAL SAFETY RULES:
- READ-ONLY TESTING ONLY
- Do NOT create, modify or delete any leads
- Do NOT call POST /api/leads
- Do NOT call any status/dedupe/sync endpoints
- Only GET /api/admin/leads, GET/POST /api/admin/leads/export, and GET /api/ are allowed
"""

import requests
import sys
import csv
import io

BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_regression_get_export():
    """
    Test 1: REGRESSION GET
    GET /api/admin/leads/export?type=lead&key=... → expect 200, Content-Type text/csv,
    Content-Disposition attachment with filename, body starts with BOM, header contains
    createdAt,name,email,status. Count data rows (N_ALL).
    """
    print("\n" + "="*80)
    print("TEST 1: REGRESSION GET - Export all leads as CSV")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/leads/export?type=lead&key={ADMIN_KEY}"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        print(f"✓ Status 200")
        
        # Check Content-Type
        content_type = response.headers.get('Content-Type', '')
        if 'text/csv' not in content_type:
            print(f"❌ FAILED: Expected Content-Type to contain 'text/csv', got '{content_type}'")
            return False
        
        print(f"✓ Content-Type: {content_type}")
        
        # Check Content-Disposition
        content_disposition = response.headers.get('Content-Disposition', '')
        if 'attachment' not in content_disposition:
            print(f"❌ FAILED: Expected Content-Disposition to contain 'attachment', got '{content_disposition}'")
            return False
        
        if 'digihome-utleiere-' not in content_disposition or '.csv' not in content_disposition:
            print(f"❌ FAILED: Expected filename like 'digihome-utleiere-YYYY-MM-DD.csv', got '{content_disposition}'")
            return False
        
        print(f"✓ Content-Disposition: {content_disposition}")
        
        # Check BOM
        body = response.text
        if not body.startswith('\ufeff'):
            print(f"❌ FAILED: CSV should start with BOM (\\ufeff)")
            return False
        
        print(f"✓ CSV starts with BOM")
        
        # Parse CSV
        csv_content = body.lstrip('\ufeff')
        lines = csv_content.split('\r\n')
        
        if len(lines) < 1:
            print(f"❌ FAILED: CSV has no lines")
            return False
        
        header = lines[0]
        print(f"✓ Header: {header[:100]}...")
        
        # Check required columns
        required_cols = ['createdAt', 'name', 'email', 'status']
        for col in required_cols:
            if col not in header:
                print(f"❌ FAILED: Header missing required column '{col}'")
                return False
        
        print(f"✓ Header contains required columns: {', '.join(required_cols)}")
        
        # Count data rows (excluding header and empty last line)
        data_rows = [line for line in lines[1:] if line.strip()]
        n_all = len(data_rows)
        
        print(f"✓ Total data rows (N_ALL): {n_all}")
        
        print("\n✅ TEST 1 PASSED: GET export working correctly")
        return n_all
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_post_with_ids(n_all):
    """
    Test 2: NEW POST with ids
    First GET /api/admin/leads?key=... and pick 2-3 real lead ids.
    Then POST /api/admin/leads/export?key=... with JSON body {"type":"lead","ids":[<ids>]}
    → expect 200 text/csv, exactly len(ids) data rows.
    """
    print("\n" + "="*80)
    print("TEST 2: POST with specific lead IDs")
    print("="*80)
    
    try:
        # First, get some real lead IDs
        url = f"{BASE_URL}/admin/leads?key={ADMIN_KEY}"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Could not fetch leads, got {response.status_code}")
            return False
        
        data = response.json()
        if 'leads' not in data or not isinstance(data['leads'], list):
            print(f"❌ FAILED: Response missing 'leads' array")
            return False
        
        leads = data['leads']
        if len(leads) < 2:
            print(f"❌ FAILED: Need at least 2 leads for testing, got {len(leads)}")
            return False
        
        # Pick 2-3 lead IDs
        num_to_pick = min(3, len(leads))
        selected_ids = [lead['id'] for lead in leads[:num_to_pick]]
        
        print(f"✓ Selected {len(selected_ids)} lead IDs: {selected_ids}")
        
        # Now POST to export with these IDs
        url = f"{BASE_URL}/admin/leads/export?key={ADMIN_KEY}"
        payload = {"type": "lead", "ids": selected_ids}
        
        print(f"\nPOST {url}")
        print(f"Body: {payload}")
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        print(f"✓ Status 200")
        
        # Check Content-Type
        content_type = response.headers.get('Content-Type', '')
        if 'text/csv' not in content_type:
            print(f"❌ FAILED: Expected Content-Type to contain 'text/csv', got '{content_type}'")
            return False
        
        print(f"✓ Content-Type: {content_type}")
        
        # Parse CSV
        body = response.text
        csv_content = body.lstrip('\ufeff')
        lines = csv_content.split('\r\n')
        
        # Count data rows
        data_rows = [line for line in lines[1:] if line.strip()]
        actual_count = len(data_rows)
        expected_count = len(selected_ids)
        
        print(f"✓ Expected {expected_count} data rows, got {actual_count}")
        
        if actual_count != expected_count:
            print(f"❌ FAILED: Row count mismatch")
            return False
        
        # Verify the rows correspond to selected leads (check by email or name)
        # Parse the CSV to extract emails
        reader = csv.DictReader(io.StringIO(csv_content))
        exported_rows = list(reader)
        
        if len(exported_rows) != expected_count:
            print(f"❌ FAILED: CSV reader parsed {len(exported_rows)} rows, expected {expected_count}")
            return False
        
        # Get emails from selected leads
        selected_emails = [lead['email'] for lead in leads[:num_to_pick] if 'email' in lead]
        exported_emails = [row.get('email', '') for row in exported_rows]
        
        print(f"✓ Selected lead emails: {selected_emails}")
        print(f"✓ Exported row emails: {exported_emails}")
        
        # Check if exported emails match (order may differ)
        for email in selected_emails:
            if email and email not in exported_emails:
                print(f"❌ FAILED: Selected email '{email}' not found in exported rows")
                return False
        
        print(f"✓ All selected leads found in exported CSV")
        
        print("\n✅ TEST 2 PASSED: POST with IDs working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_post_with_empty_ids(n_all):
    """
    Test 3: POST with empty ids
    body {"type":"lead","ids":[]} → expect 200 with ALL leads (data row count == N_ALL).
    """
    print("\n" + "="*80)
    print("TEST 3: POST with empty IDs array")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/leads/export?key={ADMIN_KEY}"
        payload = {"type": "lead", "ids": []}
        
        print(f"POST {url}")
        print(f"Body: {payload}")
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        print(f"✓ Status 200")
        
        # Parse CSV
        body = response.text
        csv_content = body.lstrip('\ufeff')
        lines = csv_content.split('\r\n')
        
        # Count data rows
        data_rows = [line for line in lines[1:] if line.strip()]
        actual_count = len(data_rows)
        
        print(f"✓ Expected {n_all} data rows (N_ALL), got {actual_count}")
        
        if actual_count != n_all:
            print(f"❌ FAILED: Row count mismatch (expected all leads)")
            return False
        
        print("\n✅ TEST 3 PASSED: POST with empty IDs returns all leads")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_post_with_nonexistent_id():
    """
    Test 4: POST with non-existent id
    body {"type":"lead","ids":["finnes-ikke-123"]} → expect 200 with ONLY header row (0 data rows).
    """
    print("\n" + "="*80)
    print("TEST 4: POST with non-existent ID")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/leads/export?key={ADMIN_KEY}"
        payload = {"type": "lead", "ids": ["finnes-ikke-123"]}
        
        print(f"POST {url}")
        print(f"Body: {payload}")
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        print(f"✓ Status 200")
        
        # Parse CSV
        body = response.text
        csv_content = body.lstrip('\ufeff')
        lines = csv_content.split('\r\n')
        
        # Count data rows
        data_rows = [line for line in lines[1:] if line.strip()]
        actual_count = len(data_rows)
        
        print(f"✓ Expected 0 data rows, got {actual_count}")
        
        if actual_count != 0:
            print(f"❌ FAILED: Should have 0 data rows for non-existent ID")
            return False
        
        print("\n✅ TEST 4 PASSED: POST with non-existent ID returns only header")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_post_tenant_type():
    """
    Test 5: POST tenant type
    body {"type":"tenant","ids":[]} → expect 200, filename digihome-leietakere-*.csv.
    """
    print("\n" + "="*80)
    print("TEST 5: POST with tenant type")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/leads/export?key={ADMIN_KEY}"
        payload = {"type": "tenant", "ids": []}
        
        print(f"POST {url}")
        print(f"Body: {payload}")
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        print(f"✓ Status 200")
        
        # Check Content-Disposition for tenant filename
        content_disposition = response.headers.get('Content-Disposition', '')
        if 'digihome-leietakere-' not in content_disposition or '.csv' not in content_disposition:
            print(f"❌ FAILED: Expected filename like 'digihome-leietakere-YYYY-MM-DD.csv', got '{content_disposition}'")
            return False
        
        print(f"✓ Content-Disposition: {content_disposition}")
        
        print("\n✅ TEST 5 PASSED: POST with tenant type returns correct filename")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_auth_get():
    """
    Test 6a: AUTH - GET without key
    GET /api/admin/leads/export WITHOUT key → expect 401.
    """
    print("\n" + "="*80)
    print("TEST 6a: AUTH - GET without key")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/leads/export?type=lead"
        print(f"GET {url} (no key)")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
        
        print(f"✓ Status 401 (Unauthorized)")
        
        print("\n✅ TEST 6a PASSED: GET without key returns 401")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_auth_post():
    """
    Test 6b: AUTH - POST without key
    POST /api/admin/leads/export WITHOUT key → expect 401.
    """
    print("\n" + "="*80)
    print("TEST 6b: AUTH - POST without key")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/leads/export"
        payload = {"type": "lead", "ids": []}
        
        print(f"POST {url} (no key)")
        print(f"Body: {payload}")
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
        
        print(f"✓ Status 401 (Unauthorized)")
        
        print("\n✅ TEST 6b PASSED: POST without key returns 401")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_regression_root():
    """
    Test 7a: REGRESSION - GET /api/
    """
    print("\n" + "="*80)
    print("TEST 7a: REGRESSION - Root endpoint")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        print(f"✓ Status 200")
        
        print("\n✅ TEST 7a PASSED: Root endpoint working")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_regression_leads():
    """
    Test 7b: REGRESSION - GET /api/admin/leads
    """
    print("\n" + "="*80)
    print("TEST 7b: REGRESSION - Leads list endpoint")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/leads?key={ADMIN_KEY}"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        print(f"✓ Status 200")
        
        data = response.json()
        if 'leads' not in data:
            print(f"❌ FAILED: Response missing 'leads' field")
            return False
        
        print(f"✓ Response has 'leads' array with {len(data['leads'])} items")
        
        print("\n✅ TEST 7b PASSED: Leads list endpoint working")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("="*80)
    print("CSV EXPORT ENDPOINT TESTING")
    print("Testing POST /api/admin/leads/export with ids-filter")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print("\nCRITICAL SAFETY RULES:")
    print("- READ-ONLY TESTING ONLY")
    print("- No lead creation, modification, or deletion")
    print("- Only GET /api/admin/leads, GET/POST /api/admin/leads/export, GET /api/")
    
    results = []
    
    # Test 1: Regression GET
    n_all = test_regression_get_export()
    results.append(('1. REGRESSION GET export', n_all is not False))
    
    if n_all is False:
        print("\n⚠️  Cannot continue without N_ALL from Test 1")
        n_all = 0
    
    # Test 2: POST with IDs
    post_ids_result = test_post_with_ids(n_all)
    results.append(('2. POST with specific IDs', post_ids_result))
    
    # Test 3: POST with empty IDs
    post_empty_result = test_post_with_empty_ids(n_all)
    results.append(('3. POST with empty IDs', post_empty_result))
    
    # Test 4: POST with non-existent ID
    post_nonexistent_result = test_post_with_nonexistent_id()
    results.append(('4. POST with non-existent ID', post_nonexistent_result))
    
    # Test 5: POST tenant type
    post_tenant_result = test_post_tenant_type()
    results.append(('5. POST tenant type', post_tenant_result))
    
    # Test 6a: AUTH GET
    auth_get_result = test_auth_get()
    results.append(('6a. AUTH - GET without key', auth_get_result))
    
    # Test 6b: AUTH POST
    auth_post_result = test_auth_post()
    results.append(('6b. AUTH - POST without key', auth_post_result))
    
    # Test 7a: Regression root
    regression_root_result = test_regression_root()
    results.append(('7a. REGRESSION - Root endpoint', regression_root_result))
    
    # Test 7b: Regression leads
    regression_leads_result = test_regression_leads()
    results.append(('7b. REGRESSION - Leads list', regression_leads_result))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - CSV export with ids-filter working correctly!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
