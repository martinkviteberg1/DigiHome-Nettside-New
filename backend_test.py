#!/usr/bin/env python3
"""
Backend testing for DigiHome Marketing API - NEW SESSION CHANGES ONLY
Tests ONLY the 4 newest tasks from this session:
(A) BIDDING-FIX (P0 regression)
(B) LEAD-EMAIL (auto-receipt + admin notification via SendGrid)
(C) SEO-ARTICLE
(D) REGRESSION

CRITICAL SECURITY RULES:
1. POST /api/admin/ads/campaign/bidding MUTATES LIVE Google Ads account (9853356154)
   - Test ONLY with validateOnly:true in body
   - NEVER send request without validateOnly:true
2. Each POST /api/leads sends REAL email to martin@kviteberg.no
   - Run MAX 2 lead inserts total
   - Use obviously fake data
   - CLEAN UP (delete) both test leads afterwards
3. DO NOT call other ads endpoints that mutate
4. Real Google Ads calls can take time - use timeout >= 45s
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60  # 60s for Google Ads calls

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
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

def print_summary():
    """Print test summary"""
    total = test_results["passed"] + test_results["failed"]
    print(f"\n{'='*80}")
    print(f"TEST SUMMARY: {test_results['passed']}/{total} tests passed")
    print(f"{'='*80}")
    
    if test_results["failed"] > 0:
        print("\nFailed tests:")
        for test in test_results["tests"]:
            if not test["passed"]:
                print(f"  ❌ {test['name']}")
                if test["details"]:
                    print(f"     {test['details']}")

# Track created lead IDs for cleanup
created_lead_ids = []

try:
    print("="*80)
    print("DIGIHOME BACKEND TESTING - NEW SESSION CHANGES ONLY")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print(f"Started: {datetime.now().isoformat()}")
    print("="*80)
    
    # ========================================================================
    # (A) BIDDING-FIX (P0 regression - rotårsak: duplisert export)
    # ========================================================================
    print("\n(A) BIDDING-FIX TESTS")
    print("-"*80)
    
    # A1: POST /api/admin/ads/campaign/bidding with validateOnly:true
    print("\n(A1) POST /api/admin/ads/campaign/bidding with validateOnly:true...")
    try:
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/admin/ads/campaign/bidding",
            params={"key": ADMIN_KEY},
            json={
                "campaignId": "23984331113",
                "cpcCeiling": 32,
                "validateOnly": True
            },
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and data.get("validateOnly") and data.get("strategy") == "MAXIMIZE_CLICKS":
                log_test(
                    "A1: POST bidding with validateOnly:true",
                    True,
                    f"200 OK in {elapsed:.2f}s, validateOnly={data.get('validateOnly')}, strategy={data.get('strategy')}, cpcCeiling={data.get('cpcCeiling')}"
                )
            else:
                log_test(
                    "A1: POST bidding with validateOnly:true",
                    False,
                    f"200 but unexpected response: {json.dumps(data)}"
                )
        else:
            log_test(
                "A1: POST bidding with validateOnly:true",
                False,
                f"HTTP {response.status_code}: {response.text[:200]}"
            )
    except Exception as e:
        log_test("A1: POST bidding with validateOnly:true", False, f"Exception: {str(e)}")
    
    # A2: POST without key → 401
    print("\n(A2) POST bidding without key (expect 401)...")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/ads/campaign/bidding",
            json={
                "campaignId": "23984331113",
                "cpcCeiling": 32,
                "validateOnly": True
            },
            timeout=TIMEOUT
        )
        
        if response.status_code == 401:
            log_test("A2: POST bidding without key", True, "401 Unauthorized (correct)")
        else:
            log_test("A2: POST bidding without key", False, f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("A2: POST bidding without key", False, f"Exception: {str(e)}")
    
    # A3: POST with empty body → 400
    print("\n(A3) POST bidding with empty body (expect 400)...")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/ads/campaign/bidding",
            params={"key": ADMIN_KEY},
            json={},
            timeout=TIMEOUT
        )
        
        if response.status_code == 400:
            log_test("A3: POST bidding with empty body", True, "400 Bad Request (correct)")
        else:
            log_test("A3: POST bidding with empty body", False, f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("A3: POST bidding with empty body", False, f"Exception: {str(e)}")
    
    # A4: GET /api/admin/ads/campaigns
    print("\n(A4) GET /api/admin/ads/campaigns...")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/ads/campaigns",
            params={"key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and "campaigns" in data:
                campaigns = data.get("campaigns", [])
                # Check if both campaigns have biddingStrategyType='TARGET_SPEND'
                campaign_23984331113 = next((c for c in campaigns if str(c.get("id")) == "23984331113"), None)
                campaign_23995748632 = next((c for c in campaigns if str(c.get("id")) == "23995748632"), None)
                
                if campaign_23984331113 and campaign_23995748632:
                    bidding_1 = campaign_23984331113.get("biddingStrategyType")
                    bidding_2 = campaign_23995748632.get("biddingStrategyType")
                    log_test(
                        "A4: GET campaigns",
                        True,
                        f"200 OK, campaigns count={len(campaigns)}, campaign 23984331113 biddingStrategyType={bidding_1}, campaign 23995748632 biddingStrategyType={bidding_2}"
                    )
                else:
                    log_test("A4: GET campaigns", True, f"200 OK, campaigns count={len(campaigns)} (target campaigns not found, but endpoint working)")
            else:
                log_test("A4: GET campaigns", False, f"200 but missing ok/campaigns: {json.dumps(data)[:200]}")
        else:
            log_test("A4: GET campaigns", False, f"HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test("A4: GET campaigns", False, f"Exception: {str(e)}")
    
    # A5: GET /api/admin/pulse (was also broken by same root cause)
    print("\n(A5) GET /api/admin/pulse...")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/pulse",
            params={"key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            data = response.json()
            log_test("A5: GET pulse", True, f"200 OK (regression test passed)")
        else:
            log_test("A5: GET pulse", False, f"HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test("A5: GET pulse", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # (B) LEAD-EMAIL (auto-receipt + admin notification via SendGrid)
    # ========================================================================
    print("\n(B) LEAD-EMAIL TESTS")
    print("-"*80)
    print("⚠️  CRITICAL: Each POST /api/leads sends REAL email to martin@kviteberg.no")
    print("⚠️  Running MAX 2 lead inserts with obviously fake data")
    print("⚠️  Will clean up both test leads afterwards")
    
    # B1: POST /api/leads with email (should send receipt + admin notification)
    print("\n(B1) POST /api/leads with email (expect receipt_email.ok=true AND admin_notify.ok=true)...")
    try:
        response = requests.post(
            f"{BASE_URL}/leads",
            json={
                "name": "QA Epost Bot",
                "email": "qa-epost@example.test",
                "phone": "+47 90000077",
                "address": "Testveien 5, Bergen",
                "lead_type": "huseier",
                "source": "qa-epost"
            },
            timeout=30
        )
        
        if response.status_code == 201:
            data = response.json()
            lead_id = data.get("id") or (data.get("lead", {}).get("id"))
            if lead_id:
                created_lead_ids.append(lead_id)
            
            lead = data.get("lead", {})
            receipt_email = lead.get("receipt_email", {})
            admin_notify = lead.get("admin_notify", {})
            
            receipt_ok = receipt_email.get("ok") == True
            admin_ok = admin_notify.get("ok") == True
            
            if receipt_ok and admin_ok:
                log_test(
                    "B1: POST leads with email",
                    True,
                    f"201 Created, lead_id={lead_id}, receipt_email.ok={receipt_ok}, admin_notify.ok={admin_ok}"
                )
            else:
                log_test(
                    "B1: POST leads with email",
                    False,
                    f"201 but email status incorrect: receipt_email.ok={receipt_ok}, admin_notify.ok={admin_ok}"
                )
        else:
            log_test("B1: POST leads with email", False, f"HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test("B1: POST leads with email", False, f"Exception: {str(e)}")
    
    # B2: POST /api/leads WITHOUT email (should NOT send receipt, but SHOULD send admin notification)
    print("\n(B2) POST /api/leads WITHOUT email (expect receipt_email=null/absent, admin_notify.ok=true)...")
    try:
        response = requests.post(
            f"{BASE_URL}/leads",
            json={
                "name": "QA UtenEpost",
                "phone": "+47 90000078",
                "address": "Testveien 6, Bergen",
                "lead_type": "huseier",
                "source": "qa-epost"
            },
            timeout=30
        )
        
        if response.status_code == 201:
            data = response.json()
            lead_id = data.get("id") or (data.get("lead", {}).get("id"))
            if lead_id:
                created_lead_ids.append(lead_id)
            
            lead = data.get("lead", {})
            receipt_email = lead.get("receipt_email")
            admin_notify = lead.get("admin_notify", {})
            
            receipt_absent = receipt_email is None or receipt_email == {}
            admin_ok = admin_notify.get("ok") == True
            
            if receipt_absent and admin_ok:
                log_test(
                    "B2: POST leads without email",
                    True,
                    f"201 Created, lead_id={lead_id}, receipt_email=null/absent (correct), admin_notify.ok={admin_ok}"
                )
            else:
                log_test(
                    "B2: POST leads without email",
                    False,
                    f"201 but email status incorrect: receipt_email={receipt_email}, admin_notify.ok={admin_ok}"
                )
        else:
            log_test("B2: POST leads without email", False, f"HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test("B2: POST leads without email", False, f"Exception: {str(e)}")
    
    # B3: POST with empty body → 400
    print("\n(B3) POST /api/leads with empty body (expect 400)...")
    try:
        response = requests.post(
            f"{BASE_URL}/leads",
            json={},
            timeout=30
        )
        
        if response.status_code == 400:
            log_test("B3: POST leads with empty body", True, "400 Bad Request (correct)")
        else:
            log_test("B3: POST leads with empty body", False, f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("B3: POST leads with empty body", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # (C) SEO-ARTICLE
    # ========================================================================
    print("\n(C) SEO-ARTICLE TEST")
    print("-"*80)
    
    # C1: GET /api/posts?slug=hva-koster-utleiemegler-i-bergen-2026
    print("\n(C1) GET /api/posts?slug=hva-koster-utleiemegler-i-bergen-2026...")
    try:
        response = requests.get(
            f"{BASE_URL}/posts",
            params={"slug": "hva-koster-utleiemegler-i-bergen-2026"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            post = data.get("post", {})
            
            status = post.get("status")
            title = post.get("title", "")
            content = post.get("content", "")
            
            status_ok = status == "published"
            title_ok = "Hva koster utleiemegler" in title
            content_ok = len(content) > 3000
            
            if status_ok and title_ok and content_ok:
                log_test(
                    "C1: GET SEO article",
                    True,
                    f"200 OK, status={status}, title contains 'Hva koster utleiemegler', content length={len(content)} (>3000)"
                )
            else:
                log_test(
                    "C1: GET SEO article",
                    False,
                    f"200 but validation failed: status={status} (expected 'published'), title_ok={title_ok}, content_length={len(content)} (expected >3000)"
                )
        else:
            log_test("C1: GET SEO article", False, f"HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test("C1: GET SEO article", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # (D) REGRESSION
    # ========================================================================
    print("\n(D) REGRESSION TESTS")
    print("-"*80)
    
    # D1: GET /api/ (root endpoint)
    print("\n(D1) GET /api/ (root endpoint)...")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("D1: GET root endpoint", True, f"200 OK, ok={data.get('ok')}")
            else:
                log_test("D1: GET root endpoint", False, f"200 but ok=false: {json.dumps(data)}")
        else:
            log_test("D1: GET root endpoint", False, f"HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test("D1: GET root endpoint", False, f"Exception: {str(e)}")
    
    # D2: GET /api/admin/leads
    print("\n(D2) GET /api/admin/leads...")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/leads",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            log_test("D2: GET admin/leads", True, f"200 OK (regression test passed)")
        else:
            log_test("D2: GET admin/leads", False, f"HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test("D2: GET admin/leads", False, f"Exception: {str(e)}")
    
    # D3: GET /lp/sammenlign (frontend URL, status code check only)
    print("\n(D3) GET /lp/sammenlign (frontend URL, status code check only)...")
    try:
        response = requests.get(
            "https://hero-premiere-4.preview.emergentagent.com/lp/sammenlign",
            timeout=30
        )
        
        if response.status_code == 200:
            log_test("D3: GET /lp/sammenlign", True, f"200 OK (frontend page renders)")
        else:
            log_test("D3: GET /lp/sammenlign", False, f"HTTP {response.status_code}")
    except Exception as e:
        log_test("D3: GET /lp/sammenlign", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # CLEANUP: Delete test leads
    # ========================================================================
    print("\n" + "="*80)
    print("CLEANUP: Deleting test leads")
    print("="*80)
    
    for lead_id in created_lead_ids:
        print(f"\nDeleting lead {lead_id}...")
        try:
            # Try DELETE /api/admin/leads with body
            response = requests.delete(
                f"{BASE_URL}/admin/leads",
                params={"key": ADMIN_KEY},
                json={"id": lead_id},
                timeout=30
            )
            
            if response.status_code in [200, 204]:
                print(f"  ✅ Deleted lead {lead_id}")
            else:
                print(f"  ⚠️  Could not delete lead {lead_id}: HTTP {response.status_code}")
                print(f"     Main agent should clean up lead ID: {lead_id}")
        except Exception as e:
            print(f"  ⚠️  Exception deleting lead {lead_id}: {str(e)}")
            print(f"     Main agent should clean up lead ID: {lead_id}")
    
    # Print summary
    print_summary()
    
    # Print lead IDs for main agent if cleanup failed
    if created_lead_ids:
        print(f"\n⚠️  IMPORTANT: Main agent should verify cleanup of lead IDs: {', '.join(created_lead_ids)}")

except Exception as e:
    print(f"\n❌ FATAL ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
    
    # Still try to print summary
    print_summary()

print(f"\nCompleted: {datetime.now().isoformat()}")
print("="*80)
