#!/usr/bin/env python3
"""
Backend API Test - Leads & Tenants Endpoints
Tests POST/GET /api/leads and POST/GET /api/tenants with validation
"""

import requests
import json
import sys

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"

def test_post_leads_huseier():
    """Test 1: POST /api/leads with rich huseier payload including units array"""
    print("\n" + "="*80)
    print("TEST 1: POST /api/leads with rich huseier payload")
    print("="*80)
    
    payload = {
        "name": "Test Utleier",
        "email": "test.utleier@example.com",
        "phone": "+47 900 00 000",
        "address": "Nordnesveien 8, Bergen",
        "postal_code": "5005",
        "property_type": "leilighet",
        "sqm": 65,
        "bedrooms": 2,
        "rental_model": "dynamisk",
        "availability": "2026-03-01",
        "lead_type": "huseier",
        "num_properties": 2,
        "units": [
            {
                "address": "Nordnesveien 8, Bergen",
                "postal_code": "5005",
                "property_type": "leilighet",
                "sqm": 65,
                "bedrooms": 2,
                "rental_model": "dynamisk"
            },
            {
                "address": "Sandviksveien 2, Bergen",
                "postal_code": "5035",
                "property_type": "hus",
                "sqm": 110,
                "bedrooms": 3,
                "rental_model": "dynamisk"
            }
        ],
        "notes": "Ønsket modell: dynamisk. Test note"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/leads", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        # Verify status code
        if response.status_code != 201:
            print(f"❌ FAILED: Expected status 201, got {response.status_code}")
            return None
        
        data = response.json()
        
        # Verify response structure
        if not data.get('success'):
            print(f"❌ FAILED: success field is not true")
            return None
        
        if not data.get('ok'):
            print(f"❌ FAILED: ok field is not true")
            return None
        
        if not data.get('data', {}).get('id'):
            print(f"❌ FAILED: data.id is missing")
            return None
        
        lead_id = data['data']['id']
        
        # Verify UUID format (basic check)
        if len(lead_id) < 32 or '-' not in lead_id:
            print(f"❌ FAILED: id does not look like a UUID: {lead_id}")
            return None
        
        # Check for ObjectId leakage
        response_str = json.dumps(data)
        if '_id' in response_str or 'ObjectId' in response_str:
            print(f"❌ FAILED: Found MongoDB _id or ObjectId in response")
            return None
        
        # Verify lead echoes the input fields
        lead = data.get('lead', {})
        checks = [
            ('postal_code', '5005'),
            ('sqm', 65),
            ('bedrooms', 2),
            ('property_type', 'leilighet'),
            ('rental_model', 'dynamisk'),
            ('availability', '2026-03-01'),
            ('lead_type', 'huseier'),
            ('num_properties', 2),
        ]
        
        for field, expected in checks:
            if lead.get(field) != expected:
                print(f"❌ FAILED: {field} mismatch. Expected {expected}, got {lead.get(field)}")
                return None
        
        # Verify units array
        units = lead.get('units', [])
        if len(units) != 2:
            print(f"❌ FAILED: Expected 2 units, got {len(units)}")
            return None
        
        print("✅ PASSED: POST /api/leads with huseier payload")
        return data['data']['id']
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        return None


def test_post_tenants_leietaker():
    """Test 2: POST /api/tenants with leietaker payload"""
    print("\n" + "="*80)
    print("TEST 2: POST /api/tenants with leietaker payload")
    print("="*80)
    
    payload = {
        "name": "Test Leietaker",
        "email": "test.leietaker@example.com",
        "phone": "+47 911 11 111",
        "preferred_area": "Nordnes, Sentrum",
        "budget_min": 12000,
        "budget_max": 18000,
        "bedrooms": 2,
        "move_in_date": "2026-04-01",
        "notes": "Boligtype: leilighet. Ønsker balkong"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/tenants", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        # Verify status code
        if response.status_code != 201:
            print(f"❌ FAILED: Expected status 201, got {response.status_code}")
            return None
        
        data = response.json()
        
        # Verify response structure
        if not data.get('success'):
            print(f"❌ FAILED: success field is not true")
            return None
        
        if not data.get('ok'):
            print(f"❌ FAILED: ok field is not true")
            return None
        
        if not data.get('data', {}).get('id'):
            print(f"❌ FAILED: data.id is missing")
            return None
        
        tenant_id = data['data']['id']
        
        # Verify UUID format
        if len(tenant_id) < 32 or '-' not in tenant_id:
            print(f"❌ FAILED: id does not look like a UUID: {tenant_id}")
            return None
        
        # Check for ObjectId leakage
        response_str = json.dumps(data)
        if '_id' in response_str or 'ObjectId' in response_str:
            print(f"❌ FAILED: Found MongoDB _id or ObjectId in response")
            return None
        
        # Verify tenant echoes the input fields
        tenant = data.get('tenant', {})
        checks = [
            ('preferred_area', 'Nordnes, Sentrum'),
            ('budget_min', 12000),
            ('budget_max', 18000),
            ('bedrooms', 2),
            ('move_in_date', '2026-04-01'),
            ('lead_type', 'leietaker'),
        ]
        
        for field, expected in checks:
            if tenant.get(field) != expected:
                print(f"❌ FAILED: {field} mismatch. Expected {expected}, got {tenant.get(field)}")
                return None
        
        print("✅ PASSED: POST /api/tenants with leietaker payload")
        return tenant_id
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        return None


def test_validation_leads_empty():
    """Test 3: POST /api/leads with empty body - should return 400"""
    print("\n" + "="*80)
    print("TEST 3: POST /api/leads with empty body (validation)")
    print("="*80)
    
    try:
        response = requests.post(f"{BASE_URL}/leads", json={}, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 400:
            print(f"❌ FAILED: Expected status 400, got {response.status_code}")
            return False
        
        data = response.json()
        
        if data.get('success') != False:
            print(f"❌ FAILED: success should be false")
            return False
        
        if not data.get('error'):
            print(f"❌ FAILED: error message should be present")
            return False
        
        print("✅ PASSED: POST /api/leads validation (empty body)")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        return False


def test_validation_tenants_empty():
    """Test 4: POST /api/tenants with empty body - should return 400"""
    print("\n" + "="*80)
    print("TEST 4: POST /api/tenants with empty body (validation)")
    print("="*80)
    
    try:
        response = requests.post(f"{BASE_URL}/tenants", json={}, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 400:
            print(f"❌ FAILED: Expected status 400, got {response.status_code}")
            return False
        
        data = response.json()
        
        if data.get('success') != False:
            print(f"❌ FAILED: success should be false")
            return False
        
        if not data.get('error'):
            print(f"❌ FAILED: error message should be present")
            return False
        
        print("✅ PASSED: POST /api/tenants validation (empty body)")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        return False


def test_get_leads(expected_email):
    """Test 5: GET /api/leads - verify created lead is present"""
    print("\n" + "="*80)
    print("TEST 5: GET /api/leads")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/leads", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if not isinstance(data, list):
            print(f"❌ FAILED: Expected array response, got {type(data)}")
            return False
        
        print(f"Total leads: {len(data)}")
        
        # Check for ObjectId leakage in any item
        response_str = json.dumps(data)
        if '_id' in response_str or 'ObjectId' in response_str:
            print(f"❌ FAILED: Found MongoDB _id or ObjectId in response")
            return False
        
        # Find the lead we created
        found = False
        for lead in data:
            if lead.get('email') == expected_email:
                found = True
                print(f"Found lead: {lead.get('name')} ({lead.get('email')})")
                print(f"  - ID: {lead.get('id')}")
                print(f"  - Lead Type: {lead.get('lead_type')}")
                print(f"  - Num Properties: {lead.get('num_properties')}")
                print(f"  - Units: {len(lead.get('units', []))} units")
                break
        
        if not found:
            print(f"❌ FAILED: Could not find lead with email {expected_email}")
            return False
        
        print("✅ PASSED: GET /api/leads")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        return False


def test_get_tenants(expected_email):
    """Test 6: GET /api/tenants - verify created tenant is present"""
    print("\n" + "="*80)
    print("TEST 6: GET /api/tenants")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/tenants", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if not isinstance(data, list):
            print(f"❌ FAILED: Expected array response, got {type(data)}")
            return False
        
        print(f"Total tenants: {len(data)}")
        
        # Check for ObjectId leakage in any item
        response_str = json.dumps(data)
        if '_id' in response_str or 'ObjectId' in response_str:
            print(f"❌ FAILED: Found MongoDB _id or ObjectId in response")
            return False
        
        # Find the tenant we created
        found = False
        for tenant in data:
            if tenant.get('email') == expected_email:
                found = True
                print(f"Found tenant: {tenant.get('name')} ({tenant.get('email')})")
                print(f"  - ID: {tenant.get('id')}")
                print(f"  - Lead Type: {tenant.get('lead_type')}")
                print(f"  - Preferred Area: {tenant.get('preferred_area')}")
                print(f"  - Budget: {tenant.get('budget_min')} - {tenant.get('budget_max')}")
                break
        
        if not found:
            print(f"❌ FAILED: Could not find tenant with email {expected_email}")
            return False
        
        print("✅ PASSED: GET /api/tenants")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        return False


def test_regression_root():
    """Test 7: GET /api (root) - regression test"""
    print("\n" + "="*80)
    print("TEST 7: GET /api (root) - Regression")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if not data.get('ok'):
            print(f"❌ FAILED: ok field should be true")
            return False
        
        print("✅ PASSED: GET /api (root)")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        return False


def test_regression_investor_interest():
    """Test 8: POST /api/investor/interest - regression test"""
    print("\n" + "="*80)
    print("TEST 8: POST /api/investor/interest - Regression")
    print("="*80)
    
    # Test success path
    print("\n--- Success path (valid data) ---")
    payload = {
        "name": "Test Investor Regression",
        "email": "test.investor.regression@example.com"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/investor/interest", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if not data.get('ok'):
            print(f"❌ FAILED: ok field should be true")
            return False
        
        print("✅ Success path passed")
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        return False
    
    # Test validation (missing email)
    print("\n--- Validation path (missing email) ---")
    payload_invalid = {
        "name": "Test Investor"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/investor/interest", json=payload_invalid, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 400:
            print(f"❌ FAILED: Expected status 400, got {response.status_code}")
            return False
        
        print("✅ Validation path passed")
        print("✅ PASSED: POST /api/investor/interest (regression)")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {str(e)}")
        return False


def main():
    print("\n" + "="*80)
    print("BACKEND API TEST - LEADS & TENANTS ENDPOINTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    
    results = []
    
    # Test 1: POST /api/leads with huseier payload
    lead_id = test_post_leads_huseier()
    results.append(("POST /api/leads (huseier)", lead_id is not None))
    
    # Test 2: POST /api/tenants with leietaker payload
    tenant_id = test_post_tenants_leietaker()
    results.append(("POST /api/tenants (leietaker)", tenant_id is not None))
    
    # Test 3: Validation - POST /api/leads with empty body
    result = test_validation_leads_empty()
    results.append(("POST /api/leads validation (empty)", result))
    
    # Test 4: Validation - POST /api/tenants with empty body
    result = test_validation_tenants_empty()
    results.append(("POST /api/tenants validation (empty)", result))
    
    # Test 5: GET /api/leads
    result = test_get_leads("test.utleier@example.com")
    results.append(("GET /api/leads", result))
    
    # Test 6: GET /api/tenants
    result = test_get_tenants("test.leietaker@example.com")
    results.append(("GET /api/tenants", result))
    
    # Test 7: Regression - GET /api (root)
    result = test_regression_root()
    results.append(("GET /api (root) - Regression", result))
    
    # Test 8: Regression - POST /api/investor/interest
    result = test_regression_investor_interest()
    results.append(("POST /api/investor/interest - Regression", result))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print("\n" + "="*80)
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
