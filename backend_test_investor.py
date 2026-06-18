#!/usr/bin/env python3
"""
DigiHome Backend API Test Suite - Investor Deck Features
Tests the NEW investor-interest and investor-deck PDF cache endpoints
Base URL: https://hero-premiere-4.preview.emergentagent.com/api
"""

import requests
import json
import sys
import os
import io

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

def create_minimal_pdf():
    """Create a minimal valid PDF for testing"""
    # Minimal PDF structure
    pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF
"""
    return pdf_content

def test_investor_interest():
    """Test (A) INVESTOR INTEREST endpoints"""
    results = []
    created_lead_id = None
    
    # TEST 1: POST /api/investor/interest with valid data
    print_test(1, "POST /api/investor/interest with valid data - expect 200 {ok:true, id}")
    try:
        payload = {
            "name": "Test Investor",
            "email": "test@example.com",
            "phone": "+4799999999",
            "company": "Acme Capital",
            "ticket_size": "500k-1M",
            "message": "Interested"
        }
        response = requests.post(f"{API_BASE}/investor/interest", json=payload, timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 200 and
            data.get("ok") == True and
            "id" in data and
            len(data["id"]) == 36 and  # UUID format
            data["id"].count("-") == 4
        )
        
        if passed:
            created_lead_id = data["id"]
        
        print_result(passed, "Investor interest lead created successfully with UUID", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 2: POST /api/investor/interest with invalid data (name < 2 chars)
    print_test(2, "POST /api/investor/interest with name < 2 chars - expect 400 {detail}")
    try:
        payload = {
            "name": "A",
            "email": "a@b.com"
        }
        response = requests.post(f"{API_BASE}/investor/interest", json=payload, timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 400 and
            "detail" in data
        )
        
        print_result(passed, "Short name correctly rejected with 400 and detail message", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 3: POST /api/investor/interest with missing email
    print_test(3, "POST /api/investor/interest with missing email - expect 400 {detail}")
    try:
        payload = {
            "name": "Valid Name"
        }
        response = requests.post(f"{API_BASE}/investor/interest", json=payload, timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 400 and
            "detail" in data
        )
        
        print_result(passed, "Missing email correctly rejected with 400 and detail message", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 4: GET /api/investor/leads
    print_test(4, "GET /api/investor/leads - expect 200 {leads:[...]} sorted newest-first, no _id")
    try:
        response = requests.get(f"{API_BASE}/investor/leads", timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 200 and
            "leads" in data and
            isinstance(data["leads"], list)
        )
        
        if passed and len(data["leads"]) > 0:
            # Check no _id fields
            has_no_id = all("_id" not in lead for lead in data["leads"])
            # Check if our created lead is present
            lead_found = False
            if created_lead_id:
                lead_found = any(lead.get("id") == created_lead_id for lead in data["leads"])
            
            # Check sorting (newest first by created_at)
            if len(data["leads"]) > 1:
                dates = [lead.get("created_at", "") for lead in data["leads"]]
                is_sorted = all(dates[i] >= dates[i+1] for i in range(len(dates)-1))
                passed = passed and has_no_id and is_sorted
                print_result(passed, f"Got {len(data['leads'])} leads, sorted correctly, no _id fields, created lead found: {lead_found}", response)
            else:
                passed = passed and has_no_id
                print_result(passed, f"Got {len(data['leads'])} lead(s), no _id fields, created lead found: {lead_found}", response)
        else:
            print_result(passed, "Got empty leads array or invalid response", response)
        
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    return results

def test_investor_deck_pdf():
    """Test (B) INVESTOR-DECK PDF CACHE endpoints"""
    results = []
    
    # TEST 5: GET /api/investor-deck/pdf/info (initial state)
    print_test(5, "GET /api/investor-deck/pdf/info - expect 200 (exists:false or exists:true)")
    try:
        response = requests.get(f"{API_BASE}/investor-deck/pdf/info", timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 200 and
            "exists" in data and
            isinstance(data["exists"], bool)
        )
        
        if passed:
            if data["exists"]:
                # If PDF already cached, verify structure
                has_fields = "size" in data and "updated_at" in data and "slide_count" in data
                passed = passed and has_fields
                print_result(passed, f"PDF already cached: size={data.get('size')}, slide_count={data.get('slide_count')}", response)
            else:
                print_result(passed, "No PDF cached yet (exists:false)", response)
        else:
            print_result(passed, "Invalid response structure", response)
        
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 6: GET /api/investor-deck/pdf when no cache (or when cached)
    print_test(6, "GET /api/investor-deck/pdf - expect 404 if no cache, or 200 if cached")
    try:
        response = requests.get(f"{API_BASE}/investor-deck/pdf", timeout=10)
        
        # Accept both 404 (no cache) and 200 (already cached from previous run)
        passed = response.status_code in [200, 404]
        
        if response.status_code == 404:
            data = response.json()
            has_detail = "detail" in data
            passed = passed and has_detail
            print_result(passed, "No PDF cached - correctly returns 404 with detail message", response)
        elif response.status_code == 200:
            # Check if it's a PDF
            content_type = response.headers.get('Content-Type', '')
            is_pdf = 'application/pdf' in content_type
            passed = passed and is_pdf
            print_result(passed, "PDF already cached from previous run - returns 200 with PDF", response)
        else:
            print_result(False, f"Unexpected status code: {response.status_code}", response)
        
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 7: POST /api/investor-deck/pdf with valid PDF
    print_test(7, "POST /api/investor-deck/pdf with valid PDF - expect 200 {ok:true, size, slide_count}")
    try:
        pdf_bytes = create_minimal_pdf()
        files = {'file': ('test.pdf', io.BytesIO(pdf_bytes), 'application/pdf')}
        data = {'slide_count': '16'}
        
        response = requests.post(f"{API_BASE}/investor-deck/pdf", files=files, data=data, timeout=10)
        resp_data = response.json()
        
        passed = (
            response.status_code == 200 and
            resp_data.get("ok") == True and
            "size" in resp_data and
            resp_data.get("slide_count") == 16 and
            isinstance(resp_data["size"], int) and
            resp_data["size"] > 0
        )
        
        print_result(passed, f"PDF uploaded successfully: size={resp_data.get('size')}, slide_count={resp_data.get('slide_count')}", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 8: GET /api/investor-deck/pdf/info after POST
    print_test(8, "GET /api/investor-deck/pdf/info after POST - expect {exists:true, size, slide_count:16}")
    try:
        response = requests.get(f"{API_BASE}/investor-deck/pdf/info", timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 200 and
            data.get("exists") == True and
            "size" in data and
            data.get("slide_count") == 16 and
            "updated_at" in data
        )
        
        print_result(passed, f"PDF info correct: size={data.get('size')}, slide_count={data.get('slide_count')}", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 9: GET /api/investor-deck/pdf after POST
    print_test(9, "GET /api/investor-deck/pdf after POST - expect 200 with PDF file and correct headers")
    try:
        response = requests.get(f"{API_BASE}/investor-deck/pdf", timeout=10)
        
        passed = response.status_code == 200
        
        if passed:
            # Check Content-Type
            content_type = response.headers.get('Content-Type', '')
            has_pdf_type = 'application/pdf' in content_type
            
            # Check Content-Disposition
            content_disp = response.headers.get('Content-Disposition', '')
            has_attachment = 'attachment' in content_disp and 'DigiHome-Investor-Deck.pdf' in content_disp
            
            # Check PDF content starts with %PDF
            content = response.content
            starts_with_pdf = content[:4] == b'%PDF'
            
            passed = passed and has_pdf_type and has_attachment and starts_with_pdf
            
            print_result(passed, f"PDF downloaded: Content-Type={content_type}, size={len(content)} bytes, starts with %PDF: {starts_with_pdf}", response)
        else:
            print_result(passed, "Failed to download PDF", response)
        
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 10: POST /api/investor-deck/pdf with invalid file (non-PDF)
    print_test(10, "POST /api/investor-deck/pdf with non-PDF file - expect 400 {detail}")
    try:
        invalid_content = b"hello world this is not a PDF"
        files = {'file': ('test.txt', io.BytesIO(invalid_content), 'text/plain')}
        data = {'slide_count': '16'}
        
        response = requests.post(f"{API_BASE}/investor-deck/pdf", files=files, data=data, timeout=10)
        resp_data = response.json()
        
        passed = (
            response.status_code == 400 and
            "detail" in resp_data
        )
        
        print_result(passed, "Non-PDF file correctly rejected with 400 and detail message", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 11: POST /api/investor-deck/pdf with empty file
    print_test(11, "POST /api/investor-deck/pdf with empty file - expect 400 {detail}")
    try:
        empty_content = b""
        files = {'file': ('empty.pdf', io.BytesIO(empty_content), 'application/pdf')}
        data = {'slide_count': '16'}
        
        response = requests.post(f"{API_BASE}/investor-deck/pdf", files=files, data=data, timeout=10)
        resp_data = response.json()
        
        passed = (
            response.status_code == 400 and
            "detail" in resp_data
        )
        
        print_result(passed, "Empty file correctly rejected with 400 and detail message", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    return results

def test_regression():
    """Test (C) REGRESSION - existing endpoints"""
    results = []
    
    # TEST 12: Health endpoints
    print_test(12, "GET /api/root and GET /api/ - expect 200 {ok:true, message:'DigiHome API'}")
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
    
    # TEST 13: POST /api/leads with valid data
    print_test(13, "POST /api/leads with valid data - expect 201")
    try:
        payload = {
            "name": "Regression Test User",
            "email": "regression@test.com",
            "phone": "+4799887766",
            "address": "Testgaten 123, Bergen"
        }
        response = requests.post(f"{API_BASE}/leads", json=payload, timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 201 and
            data.get("ok") == True and
            "lead" in data and
            "id" in data["lead"] and
            "_id" not in data["lead"]
        )
        
        print_result(passed, "Lead created successfully", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 14: POST /api/leads with empty body
    print_test(14, "POST /api/leads with empty body - expect 400")
    try:
        response = requests.post(f"{API_BASE}/leads", json={}, timeout=10)
        
        passed = response.status_code == 400
        
        print_result(passed, "Empty body correctly rejected", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 15: GET /api/leads
    print_test(15, "GET /api/leads - expect 200 array sorted newest-first, no _id")
    try:
        response = requests.get(f"{API_BASE}/leads", timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 200 and
            isinstance(data, list)
        )
        
        if passed and len(data) > 0:
            has_no_id = all("_id" not in lead for lead in data)
            passed = passed and has_no_id
            print_result(passed, f"Got {len(data)} leads, no _id fields", response)
        else:
            print_result(passed, "Got empty array or invalid response", response)
        
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 16: GET /api/address
    print_test(16, "GET /api/address?q=Strandgaten - expect 200 with suggestions (max 6)")
    try:
        response = requests.get(f"{API_BASE}/address?q=Strandgaten", timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 200 and
            "suggestions" in data and
            isinstance(data["suggestions"], list) and
            len(data["suggestions"]) <= 6
        )
        
        print_result(passed, f"Got {len(data.get('suggestions', []))} suggestions", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    # TEST 17: GET /api/listings
    print_test(17, "GET /api/listings?limit=6&status=published - expect 200 {tenant, count, listings}")
    try:
        response = requests.get(f"{API_BASE}/listings?limit=6&status=published", timeout=10)
        data = response.json()
        
        passed = (
            response.status_code == 200 and
            "tenant" in data and
            "count" in data and
            "listings" in data and
            isinstance(data["listings"], list)
        )
        
        print_result(passed, f"Got {data.get('count', 0)} listings from tenant: {data.get('tenant', 'N/A')}", response)
        results.append(passed)
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        results.append(False)
    
    return results

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("DigiHome Backend API Test Suite - INVESTOR DECK FEATURES")
    print("="*80)
    print(f"Base URL: {API_BASE}")
    print("="*80)
    
    # Test (A) Investor Interest (4 tests)
    print("\n\n### (A) INVESTOR INTEREST ENDPOINTS ###\n")
    investor_results = test_investor_interest()
    
    # Test (B) Investor-deck PDF cache (7 tests)
    print("\n\n### (B) INVESTOR-DECK PDF CACHE ENDPOINTS ###\n")
    pdf_results = test_investor_deck_pdf()
    
    # Test (C) Regression (6 tests)
    print("\n\n### (C) REGRESSION TESTS ###\n")
    regression_results = test_regression()
    
    # Summary
    all_results = investor_results + pdf_results + regression_results
    total = len(all_results)
    passed = sum(1 for r in all_results if r)
    
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"(A) Investor Interest: {sum(1 for r in investor_results if r)}/{len(investor_results)} passed")
    print(f"(B) PDF Cache: {sum(1 for r in pdf_results if r)}/{len(pdf_results)} passed")
    print(f"(C) Regression: {sum(1 for r in regression_results if r)}/{len(regression_results)} passed")
    print("-"*80)
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
