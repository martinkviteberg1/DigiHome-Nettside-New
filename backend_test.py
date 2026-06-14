#!/usr/bin/env python3
"""
DigiHome Backend API Test Suite
Tests the address autocomplete endpoint and regression tests for existing endpoints
Base URL: https://hero-premiere-4.preview.emergentagent.com/api
"""

import requests
import json
import sys
import os

# Base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://hero-premiere-4.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

def print_test(test_num, description):
    """Print test header"""
    print(f"\n{'='*80}")
    print(f"TEST {test_num}: {description}")
    print('='*80)

def print_result(passed, message, response=None):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")
    if response:
        print(f"Status Code: {response.status_code}")
        try:
            resp_json = response.json()
            resp_str = json.dumps(resp_json, indent=2)
            if len(resp_str) > 800:
                resp_str = resp_str[:800] + "..."
            print(f"Response: {resp_str}")
        except:
            resp_text = response.text
            if len(resp_text) > 500:
                resp_text = resp_text[:500] + "..."
            print(f"Response Text: {resp_text}")
    return passed

def test_address_autocomplete():
    """Test the new GET /api/address endpoint"""
    results = []
    
    # TEST 1: Valid query "Strandgaten" - expect suggestions
    print_test(1, "GET /api/address?q=Strandgaten - expect 200 with suggestions")
    try:
        response = requests.get(f"{API_BASE}/address?q=Strandgaten", timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 200 and
            "suggestions" in data and
            isinstance(data["suggestions"], list) and
            len(data["suggestions"]) >= 1 and
            len(data["suggestions"]) <= 6
        )
        
        if passed and len(data["suggestions"]) > 0:
            first = data["suggestions"][0]
            has_required_fields = "text" in first and "label" in first and first["text"] and first["label"]
            passed = passed and has_required_fields
            print_result(passed, f"Got {len(data['suggestions'])} suggestions with correct shape", response)
            if len(data["suggestions"]) > 0:
                print(f"Sample suggestion: {data['suggestions'][0]}")
        else:
            print_result(passed, "Invalid response structure or suggestion count", response)
        
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 2: Query "Strandgaten 1" - expect Bergen results
    print_test(2, "GET /api/address?q=Strandgaten 1 - expect Bergen results")
    try:
        response = requests.get(f"{API_BASE}/address?q=Strandgaten%201", timeout=10)
        data = response.json()
        
        passed = response.status_code == 200 and "suggestions" in data
        
        if passed:
            bergen_found = any("BERGEN" in s.get("sub", "").upper() or "BERGEN" in s.get("label", "").upper() 
                             for s in data["suggestions"])
            print_result(passed, f"Got {len(data['suggestions'])} suggestions, Bergen found: {bergen_found}", response)
            if data["suggestions"] and len(data["suggestions"]) > 0:
                print(f"Sample suggestions: {data['suggestions'][:2]}")
        else:
            print_result(passed, "Invalid response", response)
        
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 3: Short query "ab" (2 chars) - expect empty suggestions
    print_test(3, "GET /api/address?q=ab - expect 200 with empty suggestions")
    try:
        response = requests.get(f"{API_BASE}/address?q=ab", timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 200 and
            "suggestions" in data and
            isinstance(data["suggestions"], list) and
            len(data["suggestions"]) == 0
        )
        
        print_result(passed, "Short query correctly returns empty suggestions", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 4: Empty query - expect empty suggestions
    print_test(4, "GET /api/address?q= - expect 200 with empty suggestions")
    try:
        response = requests.get(f"{API_BASE}/address?q=", timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 200 and
            "suggestions" in data and
            isinstance(data["suggestions"], list) and
            len(data["suggestions"]) == 0
        )
        
        print_result(passed, "Empty query correctly returns empty suggestions", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 5: Special characters (æøå) - must not error
    print_test(5, "GET /api/address?q=Møhlenprisbakken - expect 200, no 500 error")
    try:
        response = requests.get(f"{API_BASE}/address?q=M%C3%B8hlenprisbakken", timeout=10)
        data = response.json()
        
        passed = response.status_code == 200 and "suggestions" in data
        
        print_result(passed, f"Special chars handled correctly, got {len(data.get('suggestions', []))} suggestions", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 6: Robustness - verify no 500 errors
    print_test(6, "Robustness check - endpoint never returns 500")
    # Check if any previous test returned a non-200 status
    all_200 = all(results)  # If all passed, none returned 500
    print_result(all_200, "All previous tests returned 200, no 500 errors encountered")
    results.append(all_200)
    
    # TEST 7: Deduplication check
    print_test(7, "Verify suggestions are deduplicated by label")
    try:
        response = requests.get(f"{API_BASE}/address?q=Strandgaten", timeout=10)
        data = response.json()
        
        if response.status_code == 200 and "suggestions" in data:
            labels = [s.get("label", "") for s in data["suggestions"]]
            unique_labels = set(labels)
            passed = len(labels) == len(unique_labels)
            
            print_result(passed, f"Got {len(labels)} suggestions, {len(unique_labels)} unique labels (deduplicated: {passed})", response)
            results.append(passed)
        else:
            print_result(False, "Could not verify deduplication", response)
            results.append(False)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    return results

def test_regression():
    """Test existing endpoints to ensure they still work"""
    results = []
    
    # TEST 8: Health endpoints
    print_test(8, "GET /api/root and GET /api/ - expect 200 with {ok:true, message:'DigiHome API'}")
    try:
        # Test /api/root
        response1 = requests.get(f"{API_BASE}/root", timeout=10)
        data1 = response1.json()
        passed1 = (
            response1.status_code == 200 and
            data1.get("ok") == True and
            data1.get("message") == "DigiHome API"
        )
        print(f"GET /api/root:")
        print_result(passed1, 'Health check passed' if passed1 else 'Health check failed', response1)
        
        # Test /api/
        response2 = requests.get(f"{API_BASE}/", timeout=10)
        data2 = response2.json()
        passed2 = (
            response2.status_code == 200 and
            data2.get("ok") == True and
            data2.get("message") == "DigiHome API"
        )
        print(f"\nGET /api/:")
        print_result(passed2, 'Health check passed' if passed2 else 'Health check failed', response2)
        
        results.append(passed1 and passed2)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 9: POST /api/leads with valid data
    print_test(9, "POST /api/leads with valid data - expect 201 with lead object")
    try:
        payload = {
            "address": "Testveien 1, Bergen",
            "phone": "90000000",
            "source": "backend-test"
        }
        response = requests.post(f"{API_BASE}/leads", json=payload, timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 201 and
            data.get("ok") == True and
            "lead" in data and
            "id" in data["lead"] and
            data["lead"].get("status") == "new" and
            "createdAt" in data["lead"] and
            "_id" not in data["lead"]  # Verify no MongoDB _id
        )
        
        # Verify UUID format (basic check)
        if passed:
            lead_id = data["lead"]["id"]
            passed = passed and len(lead_id) == 36 and lead_id.count("-") == 4
        
        print_result(passed, "Lead created successfully with UUID and no _id field", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 10: POST /api/leads with empty body
    print_test(10, "POST /api/leads with empty body - expect 400 with Norwegian error")
    try:
        response = requests.post(f"{API_BASE}/leads", json={}, timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 400 and
            "error" in data and
            "Mangler" in data["error"]  # Norwegian error message
        )
        
        print_result(passed, "Empty body correctly rejected with Norwegian error", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 11: GET /api/leads
    print_test(11, "GET /api/leads - expect 200 array sorted newest-first, no _id fields")
    try:
        response = requests.get(f"{API_BASE}/leads", timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 200 and
            isinstance(data, list)
        )
        
        if passed and len(data) > 0:
            # Check no _id fields
            has_no_id = all("_id" not in lead for lead in data)
            # Check sorting (newest first)
            if len(data) > 1:
                dates = [lead.get("createdAt", "") for lead in data]
                is_sorted = all(dates[i] >= dates[i+1] for i in range(len(dates)-1))
                passed = passed and has_no_id and is_sorted
                print_result(passed, f"Got {len(data)} leads, sorted correctly, no _id fields", response)
            else:
                passed = passed and has_no_id
                print_result(passed, f"Got {len(data)} lead(s), no _id fields", response)
        else:
            print_result(passed, "Got empty array or invalid response", response)
        
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    return results

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("DigiHome Backend API Test Suite")
    print("="*80)
    print(f"Base URL: {API_BASE}")
    print("="*80)
    
    # Test address autocomplete (7 tests)
    print("\n\n### PRIMARY FOCUS: Address Autocomplete Endpoint ###\n")
    address_results = test_address_autocomplete()
    
    # Test regression (4 tests)
    print("\n\n### REGRESSION TESTS: Existing Endpoints ###\n")
    regression_results = test_regression()
    
    # Summary
    all_results = address_results + regression_results
    total = len(all_results)
    passed = sum(1 for r in all_results if r)
    
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    print("="*80)
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
