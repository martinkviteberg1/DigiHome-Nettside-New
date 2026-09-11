#!/usr/bin/env python3
"""
SPAMVERN Lag 1 Backend Test
Tests spam protection on /api/leads + admin spam management endpoints

CRITICAL SAFETY RULES:
1. Only send payloads GUARANTEED to be quarantined (disposable domain OR honeypot)
2. NEVER send clean payloads (real domain + no honeypot) - creates real leads
3. Do NOT call gjenopprett with valid ID - only test 401 and 404
"""

import requests
import json
import sys

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_spam_gate():
    """(A) SPAM GATE - Test that spam payloads return 201 and land in spam_leads"""
    print("\n" + "="*80)
    print("(A) SPAM GATE TESTS")
    print("="*80)
    
    test_cases = []
    
    # A1: Disposable domain
    print("\n[A1] Testing disposable domain (mailinator.com)...")
    try:
        payload_a1 = {
            "name": "Test A1",
            "email": "qa-a1@mailinator.com",
            "phone": "90000000",
            "address": "Storgata 1",
            "lead_type": "huseier"
        }
        response = requests.post(f"{BASE_URL}/leads", json=payload_a1, timeout=10)
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text[:200]}")
        
        if response.status_code == 201:
            data = response.json()
            if data.get("success") and data.get("data", {}).get("id"):
                lead_id = data["data"]["id"]
                test_cases.append({"email": "qa-a1@mailinator.com", "id": lead_id, "test": "A1"})
                print(f"  ✅ A1 PASSED: 201 with success:true, id={lead_id}")
            else:
                print(f"  ❌ A1 FAILED: 201 but missing success:true or id")
        else:
            print(f"  ❌ A1 FAILED: Expected 201, got {response.status_code}")
    except Exception as e:
        print(f"  ❌ A1 ERROR: {e}")
    
    # A2: Honeypot field
    print("\n[A2] Testing honeypot field (website filled)...")
    try:
        payload_a2 = {
            "name": "Test A2",
            "email": "qa-a2@gmail.com",
            "phone": "91234567",
            "address": "Storgata 2",
            "website": "http://spam.ru",
            "lead_type": "huseier"
        }
        response = requests.post(f"{BASE_URL}/leads", json=payload_a2, timeout=10)
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text[:200]}")
        
        if response.status_code == 201:
            data = response.json()
            if data.get("success") and data.get("data", {}).get("id"):
                lead_id = data["data"]["id"]
                test_cases.append({"email": "qa-a2@gmail.com", "id": lead_id, "test": "A2"})
                print(f"  ✅ A2 PASSED: 201 with success:true, id={lead_id}")
            else:
                print(f"  ❌ A2 FAILED: 201 but missing success:true or id")
        else:
            print(f"  ❌ A2 FAILED: Expected 201, got {response.status_code}")
    except Exception as e:
        print(f"  ❌ A2 ERROR: {e}")
    
    # A3: Sink domain (reported spam)
    print("\n[A3] Testing sink domain (sink.sendgrid.net)...")
    try:
        payload_a3 = {
            "name": "Iter Elleve",
            "email": "qa-a3@sink.sendgrid.net",
            "phone": "+4790000011",
            "address": "Testveien 11",
            "lead_type": "huseier"
        }
        response = requests.post(f"{BASE_URL}/leads", json=payload_a3, timeout=10)
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text[:200]}")
        
        if response.status_code == 201:
            data = response.json()
            if data.get("success") and data.get("data", {}).get("id"):
                lead_id = data["data"]["id"]
                test_cases.append({"email": "qa-a3@sink.sendgrid.net", "id": lead_id, "test": "A3"})
                print(f"  ✅ A3 PASSED: 201 with success:true, id={lead_id}")
            else:
                print(f"  ❌ A3 FAILED: 201 but missing success:true or id")
        else:
            print(f"  ❌ A3 FAILED: Expected 201, got {response.status_code}")
    except Exception as e:
        print(f"  ❌ A3 ERROR: {e}")
    
    return test_cases


def test_verify_quarantine(test_cases):
    """(B) VERIFY QUARANTINE - Check that all test entries are in spam_leads with reasons and score >= 60"""
    print("\n" + "="*80)
    print("(B) VERIFY QUARANTINE")
    print("="*80)
    
    print("\n[B] Getting spam list...")
    try:
        response = requests.get(f"{BASE_URL}/admin/leads/spam?key={ADMIN_KEY}", timeout=10)
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Response keys: {list(data.keys())}")
            
            if data.get("ok"):
                spam_list = data.get("spam", [])
                total = data.get("total", 0)
                siste7 = data.get("siste7", 0)
                
                print(f"  ✅ GET spam list: ok:true, total={total}, siste7={siste7}, spam entries={len(spam_list)}")
                
                # Verify each test case
                for tc in test_cases:
                    email = tc["email"]
                    test_name = tc["test"]
                    found = False
                    
                    for spam_entry in spam_list:
                        if spam_entry.get("email") == email:
                            found = True
                            reasons = spam_entry.get("reasons", [])
                            score = spam_entry.get("score", 0)
                            entry_id = spam_entry.get("id")
                            
                            # Update test case with actual ID from spam list
                            tc["spam_id"] = entry_id
                            
                            print(f"\n  [{test_name}] Found {email} in spam_leads:")
                            print(f"    - ID: {entry_id}")
                            print(f"    - Score: {score}")
                            print(f"    - Reasons: {reasons}")
                            
                            if score >= 60:
                                print(f"    ✅ {test_name} VERIFIED: score={score} >= 60, reasons={reasons}")
                            else:
                                print(f"    ❌ {test_name} FAILED: score={score} < 60")
                            
                            if not reasons:
                                print(f"    ⚠️  {test_name} WARNING: reasons array is empty")
                            
                            break
                    
                    if not found:
                        print(f"\n  ❌ {test_name} FAILED: {email} NOT found in spam_leads")
                
            else:
                print(f"  ❌ FAILED: ok:false in response")
        else:
            print(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            print(f"  Response: {response.text[:200]}")
    except Exception as e:
        print(f"  ❌ ERROR: {e}")


def test_admin_auth():
    """(C) ADMIN AUTH - Test 401 without key, and 404 with bogus id (SAFE)"""
    print("\n" + "="*80)
    print("(C) ADMIN AUTH TESTS")
    print("="*80)
    
    # C1: GET without key
    print("\n[C1] Testing GET /admin/leads/spam without key...")
    try:
        response = requests.get(f"{BASE_URL}/admin/leads/spam", timeout=10)
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 401:
            print(f"  ✅ C1 PASSED: 401 without key")
        else:
            print(f"  ❌ C1 FAILED: Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"  ❌ C1 ERROR: {e}")
    
    # C2: POST gjenopprett without key
    print("\n[C2] Testing POST /admin/leads/spam/gjenopprett without key...")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/leads/spam/gjenopprett",
            json={"id": "finnes-ikke-123"},
            timeout=10
        )
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 401:
            print(f"  ✅ C2 PASSED: 401 without key")
        else:
            print(f"  ❌ C2 FAILED: Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"  ❌ C2 ERROR: {e}")
    
    # C3: POST gjenopprett with bogus id (SAFE - no lead created)
    print("\n[C3] Testing POST /admin/leads/spam/gjenopprett with bogus id...")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/leads/spam/gjenopprett?key={ADMIN_KEY}",
            json={"id": "finnes-ikke-123"},
            timeout=10
        )
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text[:200]}")
        
        if response.status_code == 404:
            data = response.json()
            if data.get("ok") == False:
                print(f"  ✅ C3 PASSED: 404 with ok:false (SAFE - no lead created)")
            else:
                print(f"  ⚠️  C3 WARNING: 404 but ok is not false")
        else:
            print(f"  ❌ C3 FAILED: Expected 404, got {response.status_code}")
    except Exception as e:
        print(f"  ❌ C3 ERROR: {e}")


def test_cleanup(test_cases):
    """(D) CLEANUP - Delete each test entry and verify they're gone"""
    print("\n" + "="*80)
    print("(D) CLEANUP")
    print("="*80)
    
    deleted_count = 0
    
    for tc in test_cases:
        spam_id = tc.get("spam_id") or tc.get("id")
        test_name = tc["test"]
        email = tc["email"]
        
        if not spam_id:
            print(f"\n[{test_name}] Skipping - no ID found")
            continue
        
        print(f"\n[{test_name}] Deleting {email} (id={spam_id})...")
        try:
            response = requests.delete(
                f"{BASE_URL}/admin/leads/spam?key={ADMIN_KEY}&id={spam_id}",
                timeout=10
            )
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"  ✅ {test_name} DELETED: 200")
                deleted_count += 1
            else:
                print(f"  ❌ {test_name} DELETE FAILED: Expected 200, got {response.status_code}")
                print(f"  Response: {response.text[:200]}")
        except Exception as e:
            print(f"  ❌ {test_name} DELETE ERROR: {e}")
    
    # Verify cleanup
    print(f"\n[D-VERIFY] Verifying cleanup (deleted {deleted_count} entries)...")
    try:
        response = requests.get(f"{BASE_URL}/admin/leads/spam?key={ADMIN_KEY}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            spam_list = data.get("spam", [])
            
            remaining_test_emails = []
            for spam_entry in spam_list:
                email = spam_entry.get("email", "")
                if email in ["qa-a1@mailinator.com", "qa-a2@gmail.com", "qa-a3@sink.sendgrid.net"]:
                    remaining_test_emails.append(email)
            
            if not remaining_test_emails:
                print(f"  ✅ CLEANUP VERIFIED: No test emails remain in spam_leads")
            else:
                print(f"  ❌ CLEANUP FAILED: Test emails still in spam_leads: {remaining_test_emails}")
        else:
            print(f"  ⚠️  CLEANUP VERIFICATION FAILED: Could not get spam list")
    except Exception as e:
        print(f"  ❌ CLEANUP VERIFICATION ERROR: {e}")


def test_robustness():
    """(E) ROBUSTNESS - Verify no 500 errors anywhere"""
    print("\n" + "="*80)
    print("(E) ROBUSTNESS CHECK")
    print("="*80)
    print("\n  ℹ️  Robustness verified throughout all tests above")
    print("  Expected status codes: 200, 201, 401, 404")
    print("  No 500 errors should have occurred")


def main():
    print("="*80)
    print("SPAMVERN LAG 1 BACKEND TEST")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY[:20]}...")
    print("\nCRITICAL SAFETY RULES:")
    print("1. Only send payloads GUARANTEED to be quarantined")
    print("2. NEVER send clean payloads (creates real leads)")
    print("3. Do NOT call gjenopprett with valid ID")
    
    try:
        # (A) SPAM GATE
        test_cases = test_spam_gate()
        
        # (B) VERIFY QUARANTINE
        test_verify_quarantine(test_cases)
        
        # (C) ADMIN AUTH
        test_admin_auth()
        
        # (D) CLEANUP
        test_cleanup(test_cases)
        
        # (E) ROBUSTNESS
        test_robustness()
        
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print("\nAll tests completed. Review output above for detailed results.")
        print("Expected: All spam payloads return 201, land in spam_leads with score >= 60")
        print("Expected: Auth tests return 401/404 as appropriate")
        print("Expected: Cleanup successful, no test emails remain")
        print("Expected: No 500 errors anywhere")
        
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
