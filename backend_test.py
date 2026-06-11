#!/usr/bin/env python3
"""
Backend API tests for DigiHome
Tests the Next.js App Router catch-all route at app/api/[[...path]]/route.js
"""

import requests
import json
import os
from datetime import datetime
import re

# Get base URL from environment or use default
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://digihome-demo.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

print(f"Testing DigiHome API at: {API_BASE}")
print("=" * 80)

# Track test results
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status}: {name}")
    if details:
        print(f"  Details: {details}")
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "details": details
    })
    
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1

def is_valid_uuid(uuid_string):
    """Check if string is a valid UUID"""
    uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
    return bool(uuid_pattern.match(uuid_string))

def is_valid_iso_datetime(date_string):
    """Check if string is a valid ISO datetime"""
    try:
        datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        return True
    except:
        return False

# Test 1: Health check - GET /api/root
print("\n" + "=" * 80)
print("TEST 1: Health check - GET /api/root")
print("=" * 80)
try:
    response = requests.get(f"{API_BASE}/root", timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get('ok') == True and data.get('message') == 'DigiHome API':
            log_test("GET /api/root returns 200 with correct body", True, f"Response: {data}")
        else:
            log_test("GET /api/root returns 200 with correct body", False, f"Unexpected body: {data}")
    else:
        log_test("GET /api/root returns 200 with correct body", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("GET /api/root returns 200 with correct body", False, f"Exception: {str(e)}")

# Test 2: Health check - GET /api/
print("\n" + "=" * 80)
print("TEST 2: Health check - GET /api/")
print("=" * 80)
try:
    response = requests.get(f"{API_BASE}/", timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get('ok') == True and data.get('message') == 'DigiHome API':
            log_test("GET /api/ returns 200 with correct body", True, f"Response: {data}")
        else:
            log_test("GET /api/ returns 200 with correct body", False, f"Unexpected body: {data}")
    else:
        log_test("GET /api/ returns 200 with correct body", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("GET /api/ returns 200 with correct body", False, f"Exception: {str(e)}")

# Test 3: Create lead - Happy path
print("\n" + "=" * 80)
print("TEST 3: Create lead - Happy path POST /api/leads")
print("=" * 80)
lead_data = {
    "name": "Ola Nordmann",
    "email": "ola@example.no",
    "phone": "+47 900 00 000",
    "address": "Nordnes 1, Bergen",
    "propertyType": "Leilighet",
    "message": "Ønsker verdivurdering"
}
created_lead_id = None

try:
    response = requests.post(
        f"{API_BASE}/leads",
        json=lead_data,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 201:
        data = response.json()
        
        # Check response structure
        if not data.get('ok'):
            log_test("POST /api/leads returns 201 with ok:true", False, "Missing 'ok' field or not true")
        elif not data.get('lead'):
            log_test("POST /api/leads returns 201 with lead object", False, "Missing 'lead' field")
        else:
            lead = data['lead']
            created_lead_id = lead.get('id')
            
            # Validate lead structure
            issues = []
            
            if not lead.get('id'):
                issues.append("Missing 'id' field")
            elif not is_valid_uuid(lead['id']):
                issues.append(f"Invalid UUID format: {lead['id']}")
            
            if lead.get('status') != 'new':
                issues.append(f"Expected status='new', got '{lead.get('status')}'")
            
            if not lead.get('createdAt'):
                issues.append("Missing 'createdAt' field")
            elif not is_valid_iso_datetime(lead['createdAt']):
                issues.append(f"Invalid ISO datetime: {lead['createdAt']}")
            
            if '_id' in lead:
                issues.append("Response contains MongoDB '_id' field (should be removed)")
            
            # Check that input fields are preserved
            if lead.get('name') != lead_data['name']:
                issues.append(f"Name mismatch: expected '{lead_data['name']}', got '{lead.get('name')}'")
            
            if issues:
                log_test("POST /api/leads creates valid lead", False, "; ".join(issues))
            else:
                log_test("POST /api/leads creates valid lead", True, f"Lead created with id={created_lead_id}")
    else:
        log_test("POST /api/leads returns 201", False, f"Status: {response.status_code}, Body: {response.text}")
except Exception as e:
    log_test("POST /api/leads creates valid lead", False, f"Exception: {str(e)}")

# Test 4: Validation - Empty body
print("\n" + "=" * 80)
print("TEST 4: Validation - POST /api/leads with empty body")
print("=" * 80)
try:
    response = requests.post(
        f"{API_BASE}/leads",
        json={},
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 400:
        data = response.json()
        if 'error' in data and 'Mangler kontaktinformasjon' in data['error']:
            log_test("POST /api/leads with empty body returns 400", True, f"Error message: {data['error']}")
        else:
            log_test("POST /api/leads with empty body returns 400", False, f"Expected Norwegian error message, got: {data}")
    else:
        log_test("POST /api/leads with empty body returns 400", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("POST /api/leads with empty body returns 400", False, f"Exception: {str(e)}")

# Test 5: Validation - Address only (should succeed)
print("\n" + "=" * 80)
print("TEST 5: Validation - POST /api/leads with address only")
print("=" * 80)
try:
    response = requests.post(
        f"{API_BASE}/leads",
        json={"address": "Sandviken 2"},
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 201:
        data = response.json()
        if data.get('ok') and data.get('lead'):
            log_test("POST /api/leads with address only returns 201", True, "Address alone is sufficient")
        else:
            log_test("POST /api/leads with address only returns 201", False, f"Unexpected response: {data}")
    else:
        log_test("POST /api/leads with address only returns 201", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("POST /api/leads with address only returns 201", False, f"Exception: {str(e)}")

# Test 6: List leads
print("\n" + "=" * 80)
print("TEST 6: List leads - GET /api/leads")
print("=" * 80)
try:
    response = requests.get(f"{API_BASE}/leads", timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response length: {len(response.text)} chars")
    
    if response.status_code == 200:
        data = response.json()
        
        if not isinstance(data, list):
            log_test("GET /api/leads returns array", False, f"Expected array, got: {type(data)}")
        else:
            print(f"Number of leads: {len(data)}")
            
            # Check if our created lead is present
            if created_lead_id:
                found = any(lead.get('id') == created_lead_id for lead in data)
                if not found:
                    log_test("GET /api/leads contains created lead", False, f"Lead {created_lead_id} not found")
                else:
                    log_test("GET /api/leads contains created lead", True, f"Lead {created_lead_id} found")
            
            # Check sorting (newest first)
            if len(data) >= 2:
                dates = [lead.get('createdAt') for lead in data if lead.get('createdAt')]
                if dates == sorted(dates, reverse=True):
                    log_test("GET /api/leads sorted by createdAt descending", True, "Leads properly sorted")
                else:
                    log_test("GET /api/leads sorted by createdAt descending", False, "Leads not sorted correctly")
            else:
                log_test("GET /api/leads sorted by createdAt descending", True, "Not enough leads to verify sorting")
            
            # Check that no lead contains _id
            has_mongo_id = any('_id' in lead for lead in data)
            if has_mongo_id:
                log_test("GET /api/leads removes MongoDB _id", False, "Some leads contain '_id' field")
            else:
                log_test("GET /api/leads removes MongoDB _id", True, "No '_id' fields in response")
            
            # Overall list test
            log_test("GET /api/leads returns valid array", True, f"Returned {len(data)} leads")
    else:
        log_test("GET /api/leads returns 200", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("GET /api/leads returns valid array", False, f"Exception: {str(e)}")

# Test 7: MongoDB persistence verification
print("\n" + "=" * 80)
print("TEST 7: MongoDB persistence verification")
print("=" * 80)
if created_lead_id:
    try:
        # Fetch leads again to verify persistence
        response = requests.get(f"{API_BASE}/leads", timeout=10)
        if response.status_code == 200:
            data = response.json()
            found_lead = next((lead for lead in data if lead.get('id') == created_lead_id), None)
            
            if found_lead:
                log_test("MongoDB persistence verified", True, f"Lead {created_lead_id} persisted and retrieved successfully")
            else:
                log_test("MongoDB persistence verified", False, f"Lead {created_lead_id} not found in database")
        else:
            log_test("MongoDB persistence verified", False, f"Could not fetch leads: {response.status_code}")
    except Exception as e:
        log_test("MongoDB persistence verified", False, f"Exception: {str(e)}")
else:
    log_test("MongoDB persistence verified", False, "No lead was created to verify persistence")

# Summary
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"Total Tests: {test_results['passed'] + test_results['failed']}")
print(f"Passed: {test_results['passed']} ✅")
print(f"Failed: {test_results['failed']} ❌")
print("=" * 80)

if test_results['failed'] > 0:
    print("\nFailed tests:")
    for test in test_results['tests']:
        if not test['passed']:
            print(f"  ❌ {test['name']}")
            if test['details']:
                print(f"     {test['details']}")

exit(0 if test_results['failed'] == 0 else 1)
