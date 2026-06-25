#!/usr/bin/env python3
"""
Backend API Testing - Environment-based Lead Routing
Tests the NEW environment-based lead routing logic + regression tests
Base URL: https://hero-premiere-4.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_lead_target():
    """Test 1: GET /api/lead-target - verify environment routing"""
    log("TEST 1: GET /api/lead-target - Environment routing verification")
    try:
        response = requests.get(f"{BASE_URL}/lead-target", timeout=10)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        log(f"  Response: {json.dumps(data, indent=2)}")
        
        # Verify response structure
        required_fields = ['env', 'url', 'keyConfigured', 'baseUrl']
        for field in required_fields:
            if field not in data:
                log(f"  ❌ FAILED: Missing field '{field}' in response")
                return False
        
        # Verify environment is 'test'
        if data['env'] != 'test':
            log(f"  ❌ FAILED: Expected env='test', got env='{data['env']}'")
            return False
        
        # Verify URL contains 'proposal-engine-37'
        if 'proposal-engine-37' not in data['url']:
            log(f"  ❌ FAILED: Expected URL to contain 'proposal-engine-37', got '{data['url']}'")
            return False
        
        # Verify keyConfigured is true
        if data['keyConfigured'] != True:
            log(f"  ❌ FAILED: Expected keyConfigured=true, got {data['keyConfigured']}")
            return False
        
        # Verify baseUrl contains 'hero-premiere-4'
        if 'hero-premiere-4' not in str(data['baseUrl']):
            log(f"  ❌ FAILED: Expected baseUrl to contain 'hero-premiere-4', got '{data['baseUrl']}'")
            return False
        
        log("  ✅ PASSED: Environment routing correctly configured for TEST")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        return False

def test_create_lead_with_forwarding():
    """Test 2: POST /api/leads - Create huseier lead with forwarding"""
    log("TEST 2: POST /api/leads - Create huseier lead with forwarding")
    try:
        payload = {
            "name": "TEST Backend Routing",
            "email": "test.routing@example.com",
            "phone": "+4799999999",
            "address": "Strandgaten 1, 5013 Bergen",
            "postal_code": "5013",
            "property_type": "leilighet",
            "sqm": 65,
            "bedrooms": 2,
            "rental_model": "dynamisk",
            "availability": "2026-03-01",
            "lead_type": "huseier",
            "num_properties": 1,
            "notes": "Automated routing test"
        }
        
        response = requests.post(f"{BASE_URL}/leads", json=payload, timeout=15)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 201:
            log(f"  ❌ FAILED: Expected 201, got {response.status_code}")
            log(f"  Response: {response.text}")
            return False
        
        data = response.json()
        log(f"  Response: {json.dumps(data, indent=2)}")
        
        # Verify response structure
        if not data.get('success') or not data.get('ok'):
            log(f"  ❌ FAILED: Expected success=true and ok=true")
            return False
        
        # Verify data.id exists and is UUID format
        if 'data' not in data or 'id' not in data['data']:
            log(f"  ❌ FAILED: Missing data.id in response")
            return False
        
        lead_id = data['data']['id']
        if len(lead_id) != 36 or lead_id.count('-') != 4:
            log(f"  ❌ FAILED: Invalid UUID format: {lead_id}")
            return False
        
        # Verify forwarded field exists (boolean)
        if 'forwarded' not in data:
            log(f"  ❌ FAILED: Missing 'forwarded' field in response")
            return False
        
        # Note: forwarded can be true or false, both are acceptable
        log(f"  Forwarded status: {data['forwarded']}")
        
        # Verify no MongoDB _id in response (platform_id is OK, it's the upstream CRM ID)
        # Check if there's an actual MongoDB _id field (not platform_id)
        if 'lead' in data and '_id' in data['lead']:
            log(f"  ❌ FAILED: MongoDB _id leaked in lead object")
            return False
        
        log(f"  ✅ PASSED: Lead created with UUID {lead_id}, forwarded={data['forwarded']}")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        return False

def test_create_tenant_with_forwarding():
    """Test 3: POST /api/tenants - Create leietaker tenant with forwarding"""
    log("TEST 3: POST /api/tenants - Create leietaker tenant with forwarding")
    try:
        payload = {
            "name": "TEST Tenant Routing",
            "email": "test.tenant.routing@example.com",
            "phone": "+4798888888",
            "preferred_area": "Nordnes",
            "budget_min": 12000,
            "budget_max": 18000,
            "bedrooms": 2,
            "move_in_date": "2026-04-01",
            "notes": "Automated routing test"
        }
        
        response = requests.post(f"{BASE_URL}/tenants", json=payload, timeout=15)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 201:
            log(f"  ❌ FAILED: Expected 201, got {response.status_code}")
            log(f"  Response: {response.text}")
            return False
        
        data = response.json()
        log(f"  Response: {json.dumps(data, indent=2)}")
        
        # Verify response structure
        if not data.get('success') or not data.get('ok'):
            log(f"  ❌ FAILED: Expected success=true and ok=true")
            return False
        
        # Verify data.id exists and is UUID format
        if 'data' not in data or 'id' not in data['data']:
            log(f"  ❌ FAILED: Missing data.id in response")
            return False
        
        tenant_id = data['data']['id']
        if len(tenant_id) != 36 or tenant_id.count('-') != 4:
            log(f"  ❌ FAILED: Invalid UUID format: {tenant_id}")
            return False
        
        # Verify forwarded field exists (boolean)
        if 'forwarded' not in data:
            log(f"  ❌ FAILED: Missing 'forwarded' field in response")
            return False
        
        # Verify lead_type is hardcoded to 'leietaker'
        if 'tenant' in data and 'lead_type' in data['tenant']:
            if data['tenant']['lead_type'] != 'leietaker':
                log(f"  ❌ FAILED: Expected lead_type='leietaker', got '{data['tenant']['lead_type']}'")
                return False
        
        # Verify no MongoDB _id in response (platform_id is OK, it's the upstream CRM ID)
        # Check if there's an actual MongoDB _id field (not platform_id)
        if 'tenant' in data and '_id' in data['tenant']:
            log(f"  ❌ FAILED: MongoDB _id leaked in tenant object")
            return False
        
        log(f"  ✅ PASSED: Tenant created with UUID {tenant_id}, forwarded={data['forwarded']}")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        return False

def test_validation_leads_empty():
    """Test 4: POST /api/leads with empty body - validation"""
    log("TEST 4: POST /api/leads - Validation with empty body")
    try:
        response = requests.post(f"{BASE_URL}/leads", json={}, timeout=10)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 400:
            log(f"  ❌ FAILED: Expected 400, got {response.status_code}")
            return False
        
        data = response.json()
        log(f"  Response: {json.dumps(data, indent=2)}")
        
        if not data.get('success') == False:
            log(f"  ❌ FAILED: Expected success=false")
            return False
        
        if 'error' not in data or 'Mangler kontaktinformasjon' not in data['error']:
            log(f"  ❌ FAILED: Expected Norwegian error message 'Mangler kontaktinformasjon'")
            return False
        
        log("  ✅ PASSED: Validation correctly rejects empty body")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        return False

def test_validation_tenants_empty():
    """Test 4b: POST /api/tenants with empty body - validation"""
    log("TEST 4b: POST /api/tenants - Validation with empty body")
    try:
        response = requests.post(f"{BASE_URL}/tenants", json={}, timeout=10)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 400:
            log(f"  ❌ FAILED: Expected 400, got {response.status_code}")
            return False
        
        data = response.json()
        log(f"  Response: {json.dumps(data, indent=2)}")
        
        if not data.get('success') == False:
            log(f"  ❌ FAILED: Expected success=false")
            return False
        
        if 'error' not in data or 'Mangler kontaktinformasjon' not in data['error']:
            log(f"  ❌ FAILED: Expected Norwegian error message 'Mangler kontaktinformasjon'")
            return False
        
        log("  ✅ PASSED: Validation correctly rejects empty body")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        return False

def test_get_leads():
    """Test 5: GET /api/leads - Retrieve leads sorted newest-first"""
    log("TEST 5: GET /api/leads - Retrieve leads")
    try:
        response = requests.get(f"{BASE_URL}/leads", timeout=10)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        log(f"  Retrieved {len(data)} leads")
        
        if not isinstance(data, list):
            log(f"  ❌ FAILED: Expected array response")
            return False
        
        # Check if our test lead is present
        test_lead = None
        for lead in data:
            if lead.get('email') == 'test.routing@example.com':
                test_lead = lead
                break
        
        if not test_lead:
            log(f"  ⚠️  WARNING: Test lead not found (may have been created in previous run)")
        else:
            log(f"  Found test lead: {test_lead.get('name')}")
            
            # Verify no _id field
            if '_id' in test_lead:
                log(f"  ❌ FAILED: MongoDB _id leaked in response")
                return False
        
        # Verify sorting (newest first)
        if len(data) > 1:
            for i in range(len(data) - 1):
                if 'createdAt' in data[i] and 'createdAt' in data[i+1]:
                    if data[i]['createdAt'] < data[i+1]['createdAt']:
                        log(f"  ❌ FAILED: Leads not sorted newest-first")
                        return False
        
        log("  ✅ PASSED: Leads retrieved correctly, sorted newest-first, no _id fields")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        return False

def test_get_tenants():
    """Test 6: GET /api/tenants - Retrieve tenants sorted newest-first"""
    log("TEST 6: GET /api/tenants - Retrieve tenants")
    try:
        response = requests.get(f"{BASE_URL}/tenants", timeout=10)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        log(f"  Retrieved {len(data)} tenants")
        
        if not isinstance(data, list):
            log(f"  ❌ FAILED: Expected array response")
            return False
        
        # Check if our test tenant is present
        test_tenant = None
        for tenant in data:
            if tenant.get('email') == 'test.tenant.routing@example.com':
                test_tenant = tenant
                break
        
        if not test_tenant:
            log(f"  ⚠️  WARNING: Test tenant not found (may have been created in previous run)")
        else:
            log(f"  Found test tenant: {test_tenant.get('name')}")
            
            # Verify no _id field
            if '_id' in test_tenant:
                log(f"  ❌ FAILED: MongoDB _id leaked in response")
                return False
        
        # Verify sorting (newest first)
        if len(data) > 1:
            for i in range(len(data) - 1):
                if 'createdAt' in data[i] and 'createdAt' in data[i+1]:
                    if data[i]['createdAt'] < data[i+1]['createdAt']:
                        log(f"  ❌ FAILED: Tenants not sorted newest-first")
                        return False
        
        log("  ✅ PASSED: Tenants retrieved correctly, sorted newest-first, no _id fields")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        return False

def test_listings_proxy():
    """Test 7: GET /api/listings - Proxy to test CRM"""
    log("TEST 7: GET /api/listings - Proxy to test CRM")
    try:
        response = requests.get(f"{BASE_URL}/listings?limit=0&status=published", timeout=15)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        log(f"  Response keys: {list(data.keys())}")
        
        # Verify response structure
        required_fields = ['tenant', 'count', 'listings']
        for field in required_fields:
            if field not in data:
                log(f"  ❌ FAILED: Missing field '{field}' in response")
                return False
        
        # Verify listings is an array
        if not isinstance(data['listings'], list):
            log(f"  ❌ FAILED: Expected listings to be an array")
            return False
        
        log(f"  Retrieved {data['count']} listings from tenant: {data.get('tenant')}")
        
        # Should never return 500
        if response.status_code == 500:
            log(f"  ❌ FAILED: Endpoint returned 500 error")
            return False
        
        log("  ✅ PASSED: Listings proxy working correctly")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        return False

def test_address_autocomplete():
    """Test 8: GET /api/address - Regression test"""
    log("TEST 8: GET /api/address - Address autocomplete regression")
    try:
        # Test with valid query
        response = requests.get(f"{BASE_URL}/address?q=Strandgaten", timeout=10)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if 'suggestions' not in data:
            log(f"  ❌ FAILED: Missing 'suggestions' field")
            return False
        
        if not isinstance(data['suggestions'], list):
            log(f"  ❌ FAILED: Expected suggestions to be an array")
            return False
        
        log(f"  Retrieved {len(data['suggestions'])} suggestions")
        
        # Verify max 6 suggestions
        if len(data['suggestions']) > 6:
            log(f"  ❌ FAILED: Expected max 6 suggestions, got {len(data['suggestions'])}")
            return False
        
        # Test with short query (should return empty)
        response2 = requests.get(f"{BASE_URL}/address?q=ab", timeout=10)
        if response2.status_code != 200:
            log(f"  ❌ FAILED: Short query should return 200")
            return False
        
        data2 = response2.json()
        if len(data2['suggestions']) != 0:
            log(f"  ❌ FAILED: Short query should return empty suggestions")
            return False
        
        log("  ✅ PASSED: Address autocomplete working correctly")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        return False

def test_investor_interest():
    """Test 9: POST /api/investor/interest - Regression test"""
    log("TEST 9: POST /api/investor/interest - Regression test")
    try:
        # Test success path
        payload = {
            "name": "TEST Investor",
            "email": "test.investor@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/investor/interest", json=payload, timeout=10)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if not data.get('ok') or 'id' not in data:
            log(f"  ❌ FAILED: Expected ok=true and id field")
            return False
        
        log(f"  Created investor lead with ID: {data['id']}")
        
        # Test validation path
        response2 = requests.post(f"{BASE_URL}/investor/interest", json={"name": "A"}, timeout=10)
        if response2.status_code != 400:
            log(f"  ❌ FAILED: Validation should return 400")
            return False
        
        data2 = response2.json()
        if 'detail' not in data2:
            log(f"  ❌ FAILED: Expected 'detail' field in error response")
            return False
        
        log("  ✅ PASSED: Investor interest endpoint working correctly")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        return False

def test_admin_leads():
    """Test 10: GET /api/admin/leads - Admin endpoint"""
    log("TEST 10: GET /api/admin/leads - Admin endpoint")
    try:
        # Test with key
        response = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=10)
        log(f"  Status (with key): {response.status_code}")
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: Expected 200 with valid key, got {response.status_code}")
            return False
        
        data = response.json()
        
        if 'leads' not in data or 'tenants' not in data:
            log(f"  ❌ FAILED: Expected 'leads' and 'tenants' fields")
            return False
        
        log(f"  Retrieved {len(data['leads'])} leads and {len(data['tenants'])} tenants")
        
        # Test without key
        response2 = requests.get(f"{BASE_URL}/admin/leads", timeout=10)
        log(f"  Status (no key): {response2.status_code}")
        
        if response2.status_code != 401:
            log(f"  ❌ FAILED: Expected 401 without key, got {response2.status_code}")
            return False
        
        data2 = response2.json()
        if 'error' not in data2:
            log(f"  ❌ FAILED: Expected 'error' field in unauthorized response")
            return False
        
        log("  ✅ PASSED: Admin endpoint working correctly")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        return False

def test_health_endpoints():
    """Test 11: GET /api/root and GET /api/ - Health checks"""
    log("TEST 11: Health endpoints - GET /api/root and GET /api/")
    try:
        # Test /api/root
        response1 = requests.get(f"{BASE_URL}/root", timeout=10)
        log(f"  GET /api/root - Status: {response1.status_code}")
        
        if response1.status_code != 200:
            log(f"  ❌ FAILED: Expected 200, got {response1.status_code}")
            return False
        
        data1 = response1.json()
        if not data1.get('ok') or data1.get('message') != 'DigiHome API':
            log(f"  ❌ FAILED: Expected ok=true and message='DigiHome API'")
            return False
        
        # Test /api/
        response2 = requests.get(f"{BASE_URL}/", timeout=10)
        log(f"  GET /api/ - Status: {response2.status_code}")
        
        if response2.status_code != 200:
            log(f"  ❌ FAILED: Expected 200, got {response2.status_code}")
            return False
        
        data2 = response2.json()
        if not data2.get('ok') or data2.get('message') != 'DigiHome API':
            log(f"  ❌ FAILED: Expected ok=true and message='DigiHome API'")
            return False
        
        log("  ✅ PASSED: Health endpoints working correctly")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        return False

def main():
    log("=" * 80)
    log("BACKEND API TESTING - Environment-based Lead Routing")
    log(f"Base URL: {BASE_URL}")
    log("=" * 80)
    
    tests = [
        ("GET /api/lead-target", test_lead_target),
        ("POST /api/leads (huseier)", test_create_lead_with_forwarding),
        ("POST /api/tenants (leietaker)", test_create_tenant_with_forwarding),
        ("POST /api/leads validation", test_validation_leads_empty),
        ("POST /api/tenants validation", test_validation_tenants_empty),
        ("GET /api/leads", test_get_leads),
        ("GET /api/tenants", test_get_tenants),
        ("GET /api/listings", test_listings_proxy),
        ("GET /api/address", test_address_autocomplete),
        ("POST /api/investor/interest", test_investor_interest),
        ("GET /api/admin/leads", test_admin_leads),
        ("Health endpoints", test_health_endpoints),
    ]
    
    results = []
    for name, test_func in tests:
        log("")
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            log(f"  ❌ FAILED: Unexpected exception - {str(e)}")
            results.append((name, False))
    
    log("")
    log("=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        log(f"{status}: {name}")
    
    log("")
    log(f"Total: {passed}/{total} tests passed ({passed*100//total}%)")
    log("=" * 80)
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
