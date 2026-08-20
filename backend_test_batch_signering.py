#!/usr/bin/env python3
"""
Backend test for DigiHome batch signing endpoint VALIDATION PATHS ONLY.

CRITICAL SAFETY RULE: NEVER use real/existing file IDs in filIds array.
Using real IDs would create REAL BankID signing jobs against real people.
ONLY use fictional IDs like 'finnes-ikke-1', 'fiktiv-1', etc.

DO NOT test success path end-to-end.
"""

import requests
import os
import sys

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_batch_signering_validation():
    """Test batch signing endpoint validation paths only."""
    
    print("=" * 80)
    print("BATCH SIGNERING VALIDATION TESTS")
    print("=" * 80)
    print(f"Base URL: {API_BASE}")
    print(f"Admin key: {ADMIN_KEY}")
    print()
    
    results = {
        'passed': 0,
        'failed': 0,
        'tests': []
    }
    
    # T1: Empty filIds array
    print("T1: POST with empty filIds array → expect 400 'Velg minst to dokumenter'")
    try:
        response = requests.post(
            f"{API_BASE}/admin/task-files/signering-batch?key={ADMIN_KEY}",
            json={
                "filIds": [],
                "signatarer": [{"navn": "QA", "epost": "qa@example.com"}]
            },
            timeout=10
        )
        
        if response.status_code == 400:
            data = response.json()
            error_msg = data.get('error', '')
            if 'Velg minst to dokumenter' in error_msg:
                print(f"✅ T1 PASSED: Got 400 with correct error message: '{error_msg}'")
                results['passed'] += 1
                results['tests'].append({'test': 'T1', 'status': 'PASSED', 'detail': f"400 with error: {error_msg}"})
            else:
                print(f"❌ T1 FAILED: Got 400 but wrong error message: '{error_msg}'")
                results['failed'] += 1
                results['tests'].append({'test': 'T1', 'status': 'FAILED', 'detail': f"Wrong error: {error_msg}"})
        else:
            print(f"❌ T1 FAILED: Expected 400, got {response.status_code}")
            print(f"Response: {response.text}")
            results['failed'] += 1
            results['tests'].append({'test': 'T1', 'status': 'FAILED', 'detail': f"Got {response.status_code} instead of 400"})
    except Exception as e:
        print(f"❌ T1 FAILED with exception: {e}")
        results['failed'] += 1
        results['tests'].append({'test': 'T1', 'status': 'FAILED', 'detail': str(e)})
    print()
    
    # T2: Single file ID (less than 2)
    print("T2: POST with single filId → expect 400 'Velg minst to dokumenter'")
    try:
        response = requests.post(
            f"{API_BASE}/admin/task-files/signering-batch?key={ADMIN_KEY}",
            json={
                "filIds": ["bare-en"],
                "signatarer": [{"navn": "QA", "epost": "qa@example.com"}]
            },
            timeout=10
        )
        
        if response.status_code == 400:
            data = response.json()
            error_msg = data.get('error', '')
            if 'Velg minst to dokumenter' in error_msg:
                print(f"✅ T2 PASSED: Got 400 with correct error message: '{error_msg}'")
                results['passed'] += 1
                results['tests'].append({'test': 'T2', 'status': 'PASSED', 'detail': f"400 with error: {error_msg}"})
            else:
                print(f"❌ T2 FAILED: Got 400 but wrong error message: '{error_msg}'")
                results['failed'] += 1
                results['tests'].append({'test': 'T2', 'status': 'FAILED', 'detail': f"Wrong error: {error_msg}"})
        else:
            print(f"❌ T2 FAILED: Expected 400, got {response.status_code}")
            print(f"Response: {response.text}")
            results['failed'] += 1
            results['tests'].append({'test': 'T2', 'status': 'FAILED', 'detail': f"Got {response.status_code} instead of 400"})
    except Exception as e:
        print(f"❌ T2 FAILED with exception: {e}")
        results['failed'] += 1
        results['tests'].append({'test': 'T2', 'status': 'FAILED', 'detail': str(e)})
    print()
    
    # T3: Non-existent file IDs (2 fictional IDs)
    print("T3: POST with 2 fictional filIds → expect 400 with {ok:false, batchId:<uuid>, opprettet:[], feilet:[2 entries with error 'Ikke funnet']}")
    try:
        response = requests.post(
            f"{API_BASE}/admin/task-files/signering-batch?key={ADMIN_KEY}",
            json={
                "filIds": ["finnes-ikke-1", "finnes-ikke-2"],
                "signatarer": [{"navn": "QA", "epost": "qa@example.com"}],
                "dagerFrist": 10,
                "actor": "QA"
            },
            timeout=10
        )
        
        if response.status_code == 400:
            data = response.json()
            if (data.get('ok') == False and 
                'batchId' in data and 
                len(data.get('opprettet', [])) == 0 and 
                len(data.get('feilet', [])) == 2):
                
                # Check that both failed entries have 'Ikke funnet' error
                feilet = data.get('feilet', [])
                errors_correct = all('Ikke funnet' in str(f.get('error', '')) for f in feilet)
                
                if errors_correct:
                    print(f"✅ T3 PASSED: Got 400 with ok:false, batchId:{data['batchId']}, opprettet:[], feilet:2 with 'Ikke funnet'")
                    results['passed'] += 1
                    results['tests'].append({'test': 'T3', 'status': 'PASSED', 'detail': f"Correct response structure with 2 'Ikke funnet' errors"})
                else:
                    print(f"❌ T3 FAILED: Got correct structure but wrong error messages: {feilet}")
                    results['failed'] += 1
                    results['tests'].append({'test': 'T3', 'status': 'FAILED', 'detail': f"Wrong error messages: {feilet}"})
            else:
                print(f"❌ T3 FAILED: Wrong response structure: {data}")
                results['failed'] += 1
                results['tests'].append({'test': 'T3', 'status': 'FAILED', 'detail': f"Wrong structure: {data}"})
        else:
            print(f"❌ T3 FAILED: Expected 400, got {response.status_code}")
            print(f"Response: {response.text}")
            results['failed'] += 1
            results['tests'].append({'test': 'T3', 'status': 'FAILED', 'detail': f"Got {response.status_code} instead of 400"})
    except Exception as e:
        print(f"❌ T3 FAILED with exception: {e}")
        results['failed'] += 1
        results['tests'].append({'test': 'T3', 'status': 'FAILED', 'detail': str(e)})
    print()
    
    # T4: More than 15 file IDs
    print("T4: POST with 16 fictional filIds → expect 400 with error 'Maks 15'")
    try:
        fictional_ids = [f"fiktiv-{i}" for i in range(1, 17)]  # 16 IDs
        response = requests.post(
            f"{API_BASE}/admin/task-files/signering-batch?key={ADMIN_KEY}",
            json={
                "filIds": fictional_ids,
                "signatarer": [{"navn": "QA", "epost": "qa@example.com"}]
            },
            timeout=10
        )
        
        if response.status_code == 400:
            data = response.json()
            error_msg = data.get('error', '')
            if 'Maks 15' in error_msg:
                print(f"✅ T4 PASSED: Got 400 with correct error message: '{error_msg}'")
                results['passed'] += 1
                results['tests'].append({'test': 'T4', 'status': 'PASSED', 'detail': f"400 with error: {error_msg}"})
            else:
                print(f"❌ T4 FAILED: Got 400 but wrong error message: '{error_msg}'")
                results['failed'] += 1
                results['tests'].append({'test': 'T4', 'status': 'FAILED', 'detail': f"Wrong error: {error_msg}"})
        else:
            print(f"❌ T4 FAILED: Expected 400, got {response.status_code}")
            print(f"Response: {response.text}")
            results['failed'] += 1
            results['tests'].append({'test': 'T4', 'status': 'FAILED', 'detail': f"Got {response.status_code} instead of 400"})
    except Exception as e:
        print(f"❌ T4 FAILED with exception: {e}")
        results['failed'] += 1
        results['tests'].append({'test': 'T4', 'status': 'FAILED', 'detail': str(e)})
    print()
    
    # T5: Unauthorized (no key)
    print("T5: POST without ?key= → expect 401")
    try:
        response = requests.post(
            f"{API_BASE}/admin/task-files/signering-batch",
            json={
                "filIds": ["finnes-ikke-1", "finnes-ikke-2"],
                "signatarer": [{"navn": "QA", "epost": "qa@example.com"}]
            },
            timeout=10
        )
        
        if response.status_code == 401:
            print(f"✅ T5 PASSED: Got 401 unauthorized")
            results['passed'] += 1
            results['tests'].append({'test': 'T5', 'status': 'PASSED', 'detail': "401 unauthorized"})
        else:
            print(f"❌ T5 FAILED: Expected 401, got {response.status_code}")
            print(f"Response: {response.text}")
            results['failed'] += 1
            results['tests'].append({'test': 'T5', 'status': 'FAILED', 'detail': f"Got {response.status_code} instead of 401"})
    except Exception as e:
        print(f"❌ T5 FAILED with exception: {e}")
        results['failed'] += 1
        results['tests'].append({'test': 'T5', 'status': 'FAILED', 'detail': str(e)})
    print()
    
    # T6: REGRESSION - Test other endpoints still work
    print("T6: REGRESSION - Test other endpoints still work")
    regression_tests = [
        {
            'name': 'GET /api/admin/signering/jobber',
            'url': f"{API_BASE}/admin/signering/jobber?key={ADMIN_KEY}",
            'method': 'GET',
            'expected_status': 200
        },
        {
            'name': 'GET /api/admin/dokumentarkiv',
            'url': f"{API_BASE}/admin/dokumentarkiv?key={ADMIN_KEY}",
            'method': 'GET',
            'expected_status': 200
        },
        {
            'name': 'GET /api/pdf-worker',
            'url': f"{API_BASE}/pdf-worker",
            'method': 'GET',
            'expected_status': 200,
            'expected_content_type': 'text/javascript'
        },
        {
            'name': 'GET /api/admin/tasks',
            'url': f"{API_BASE}/admin/tasks?key={ADMIN_KEY}",
            'method': 'GET',
            'expected_status': 200
        }
    ]
    
    regression_passed = 0
    regression_failed = 0
    
    for reg_test in regression_tests:
        try:
            if reg_test['method'] == 'GET':
                response = requests.get(reg_test['url'], timeout=10)
            
            if response.status_code == reg_test['expected_status']:
                # Check content type if specified
                if 'expected_content_type' in reg_test:
                    content_type = response.headers.get('content-type', '')
                    if reg_test['expected_content_type'] in content_type:
                        print(f"  ✅ {reg_test['name']} → {response.status_code} with correct content-type")
                        regression_passed += 1
                    else:
                        print(f"  ❌ {reg_test['name']} → {response.status_code} but wrong content-type: {content_type}")
                        regression_failed += 1
                else:
                    print(f"  ✅ {reg_test['name']} → {response.status_code}")
                    regression_passed += 1
            else:
                print(f"  ❌ {reg_test['name']} → Expected {reg_test['expected_status']}, got {response.status_code}")
                regression_failed += 1
        except Exception as e:
            print(f"  ❌ {reg_test['name']} → Exception: {e}")
            regression_failed += 1
    
    if regression_failed == 0:
        print(f"✅ T6 PASSED: All {regression_passed} regression tests passed")
        results['passed'] += 1
        results['tests'].append({'test': 'T6', 'status': 'PASSED', 'detail': f"All {regression_passed} regression endpoints working"})
    else:
        print(f"❌ T6 FAILED: {regression_failed}/{len(regression_tests)} regression tests failed")
        results['failed'] += 1
        results['tests'].append({'test': 'T6', 'status': 'FAILED', 'detail': f"{regression_failed} regression tests failed"})
    print()
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    total = results['passed'] + results['failed']
    print(f"Total tests: {total}")
    print(f"Passed: {results['passed']}")
    print(f"Failed: {results['failed']}")
    print(f"Success rate: {(results['passed']/total*100):.1f}%")
    print()
    
    for test in results['tests']:
        status_icon = "✅" if test['status'] == 'PASSED' else "❌"
        print(f"{status_icon} {test['test']}: {test['status']} - {test['detail']}")
    
    print("=" * 80)
    
    return results['failed'] == 0

if __name__ == '__main__':
    success = test_batch_signering_validation()
    sys.exit(0 if success else 1)
