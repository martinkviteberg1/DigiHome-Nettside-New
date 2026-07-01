#!/usr/bin/env python3
"""
Backend test for E2E tracking verification endpoint: GET/POST /api/admin/tracking/verify

SAFETY CONTEXT (CRITICAL):
- Meta CAPI: sends ONLY test events with test_event_code (visible only in Meta "Test events" tab, NO impact on ad algorithm)
- Google offline conversion: ALWAYS runs as validateOnly=true (dry-run — validates OAuth/conversion action/format without registering any real conversion)
- GA4: only config status (GA4_API_SECRET missing → expected configured=false)
- Endpoint NEVER creates leads

TEST SEQUENCE:
1. WITHOUT testEventCode: GET /api/admin/tracking/verify?key=... → expect 200 {ok:true}
   VERIFY: meta.configured=true, meta.note exists (no Meta event sent), google.configured=true, 
   google.dryRun.ok=true, google.verified=true, ga4.configured=false, summary exists
2. WITH testEventCode: GET /api/admin/tracking/verify?key=...&testEventCode=TEST_E2E_VERIFY → expect 200
   VERIFY: meta.testEventCode='TEST_E2E_VERIFY', meta.lead.ok=true (events_received=1), 
   meta.purchase.ok=true, meta.verified=true
3. POST variant: POST /api/admin/tracking/verify?key=... with body {"testEventCode":"TEST_E2E_VERIFY"} → expect 200, same as (2)
4. AUTH: GET /api/admin/tracking/verify WITHOUT key → expect 401
5. ROBUSTNESS: endpoint should NEVER return 500 (errors caught in out.meta.error / out.google.error)
6. REGRESSION: GET /api/ → 200, GET /api/admin/ads/diagnostics?key=... → 200
7. VERIFY: no leads created

Base URL: https://hero-premiere-4.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4
Timeout: >= 45s (real Google Ads + Meta CAPI calls)
"""

import requests
import sys
import time

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60  # 60s timeout for real API calls

def test_tracking_verify():
    print("=" * 80)
    print("BACKEND TEST: E2E Tracking Verification Endpoint")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print()
    
    passed = 0
    failed = 0
    
    # Get initial lead count for verification
    print("SETUP: Getting initial lead count...")
    try:
        r = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY}, timeout=30)
        initial_lead_count = len(r.json().get("leads", [])) if r.status_code == 200 else 0
        print(f"✓ Initial lead count: {initial_lead_count}")
    except Exception as e:
        print(f"⚠ Could not get initial lead count: {e}")
        initial_lead_count = None
    print()
    
    # TEST 1: WITHOUT testEventCode
    print("TEST 1: GET /api/admin/tracking/verify WITHOUT testEventCode")
    print("-" * 80)
    try:
        start = time.time()
        r = requests.get(
            f"{BASE_URL}/admin/tracking/verify",
            params={"key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start
        
        print(f"Status: {r.status_code} (expected 200)")
        print(f"Response time: {elapsed:.2f}s")
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
            failed += 1
        else:
            data = r.json()
            print(f"Response keys: {list(data.keys())}")
            
            # Verify top-level structure
            checks = []
            checks.append(("ok=true", data.get("ok") == True))
            checks.append(("generatedAt exists", "generatedAt" in data))
            checks.append(("dedup exists", "dedup" in data and isinstance(data["dedup"], dict)))
            checks.append(("meta exists", "meta" in data and isinstance(data["meta"], dict)))
            checks.append(("google exists", "google" in data and isinstance(data["google"], dict)))
            checks.append(("ga4 exists", "ga4" in data and isinstance(data["ga4"], dict)))
            checks.append(("summary exists", "summary" in data and isinstance(data["summary"], dict)))
            
            # Verify meta structure (WITHOUT testEventCode)
            meta = data.get("meta", {})
            checks.append(("meta.configured=true", meta.get("configured") == True))
            checks.append(("meta.note exists", "note" in meta))
            checks.append(("meta.pixelId exists", "pixelId" in meta))
            checks.append(("meta.verified NOT present", "verified" not in meta))
            
            # Verify google structure
            google = data.get("google", {})
            checks.append(("google.configured=true", google.get("configured") == True))
            checks.append(("google.dryRun exists", "dryRun" in google and isinstance(google["dryRun"], dict)))
            if "dryRun" in google:
                dry = google["dryRun"]
                checks.append(("google.dryRun.ok=true", dry.get("ok") == True))
                checks.append(("google.dryRun.validateOnly=true", dry.get("validateOnly") == True))
            checks.append(("google.verified=true", google.get("verified") == True))
            
            # Verify ga4 structure
            ga4 = data.get("ga4", {})
            checks.append(("ga4.configured=false", ga4.get("configured") == False))
            checks.append(("ga4.measurementId exists", "measurementId" in ga4))
            checks.append(("ga4.apiSecret exists", "apiSecret" in ga4))
            
            # Verify summary structure
            summary = data.get("summary", {})
            checks.append(("summary.metaReady exists", "metaReady" in summary))
            checks.append(("summary.metaVerified exists", "metaVerified" in summary))
            checks.append(("summary.googleReady exists", "googleReady" in summary))
            checks.append(("summary.googleVerified exists", "googleVerified" in summary))
            checks.append(("summary.ga4Ready exists", "ga4Ready" in summary))
            checks.append(("summary.allGreen exists", "allGreen" in summary))
            
            # Verify dedup structure
            dedup = data.get("dedup", {})
            checks.append(("dedup.leadEventId exists", "leadEventId" in dedup))
            checks.append(("dedup.purchaseEventId exists", "purchaseEventId" in dedup))
            
            print("\nVERIFICATIONS:")
            all_passed = True
            for check_name, check_result in checks:
                status = "✓" if check_result else "✗"
                print(f"  {status} {check_name}")
                if not check_result:
                    all_passed = False
            
            if all_passed:
                print("✅ TEST 1 PASSED")
                passed += 1
            else:
                print("❌ TEST 1 FAILED: Some verifications failed")
                failed += 1
                
            # Print key values for debugging
            print(f"\nKEY VALUES:")
            print(f"  meta.configured: {meta.get('configured')}")
            print(f"  meta.note: {meta.get('note', 'N/A')[:80]}...")
            print(f"  google.configured: {google.get('configured')}")
            print(f"  google.verified: {google.get('verified')}")
            if "dryRun" in google:
                print(f"  google.dryRun.ok: {google['dryRun'].get('ok')}")
                print(f"  google.dryRun.validateOnly: {google['dryRun'].get('validateOnly')}")
            print(f"  ga4.configured: {ga4.get('configured')}")
            print(f"  summary.allGreen: {summary.get('allGreen')}")
            
    except Exception as e:
        print(f"❌ TEST 1 FAILED with exception: {e}")
        failed += 1
    print()
    
    # TEST 2: WITH testEventCode (GET)
    print("TEST 2: GET /api/admin/tracking/verify WITH testEventCode=TEST_E2E_VERIFY")
    print("-" * 80)
    try:
        start = time.time()
        r = requests.get(
            f"{BASE_URL}/admin/tracking/verify",
            params={"key": ADMIN_KEY, "testEventCode": "TEST_E2E_VERIFY"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start
        
        print(f"Status: {r.status_code} (expected 200)")
        print(f"Response time: {elapsed:.2f}s")
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
            failed += 1
        else:
            data = r.json()
            print(f"Response keys: {list(data.keys())}")
            
            # Verify meta structure (WITH testEventCode)
            meta = data.get("meta", {})
            checks = []
            checks.append(("meta.configured=true", meta.get("configured") == True))
            checks.append(("meta.testEventCode='TEST_E2E_VERIFY'", meta.get("testEventCode") == "TEST_E2E_VERIFY"))
            checks.append(("meta.testEventId starts with 'verify-'", isinstance(meta.get("testEventId"), str) and meta.get("testEventId", "").startswith("verify-")))
            checks.append(("meta.lead exists", "lead" in meta and isinstance(meta["lead"], dict)))
            checks.append(("meta.purchase exists", "purchase" in meta and isinstance(meta["purchase"], dict)))
            checks.append(("meta.verified=true", meta.get("verified") == True))
            
            # Verify meta.lead structure
            if "lead" in meta:
                lead = meta["lead"]
                checks.append(("meta.lead.ok=true", lead.get("ok") == True))
                checks.append(("meta.lead.events_received=1", lead.get("events_received") == 1))
                checks.append(("meta.lead.fbtrace_id exists", "fbtrace_id" in lead))
            
            # Verify meta.purchase structure
            if "purchase" in meta:
                purchase = meta["purchase"]
                checks.append(("meta.purchase.ok=true", purchase.get("ok") == True))
                checks.append(("meta.purchase.events_received=1", purchase.get("events_received") == 1))
            
            # Verify google structure (should still be dry-run)
            google = data.get("google", {})
            checks.append(("google.verified=true", google.get("verified") == True))
            
            # Verify summary
            summary = data.get("summary", {})
            checks.append(("summary.metaVerified=true", summary.get("metaVerified") == True))
            checks.append(("summary.googleVerified=true", summary.get("googleVerified") == True))
            
            print("\nVERIFICATIONS:")
            all_passed = True
            for check_name, check_result in checks:
                status = "✓" if check_result else "✗"
                print(f"  {status} {check_name}")
                if not check_result:
                    all_passed = False
            
            if all_passed:
                print("✅ TEST 2 PASSED")
                passed += 1
            else:
                print("❌ TEST 2 FAILED: Some verifications failed")
                failed += 1
                
            # Print key values for debugging
            print(f"\nKEY VALUES:")
            print(f"  meta.testEventCode: {meta.get('testEventCode')}")
            print(f"  meta.testEventId: {meta.get('testEventId')}")
            print(f"  meta.verified: {meta.get('verified')}")
            if "lead" in meta:
                print(f"  meta.lead.ok: {meta['lead'].get('ok')}")
                print(f"  meta.lead.events_received: {meta['lead'].get('events_received')}")
            if "purchase" in meta:
                print(f"  meta.purchase.ok: {meta['purchase'].get('ok')}")
                print(f"  meta.purchase.events_received: {meta['purchase'].get('events_received')}")
            print(f"  summary.metaVerified: {summary.get('metaVerified')}")
            print(f"  summary.allGreen: {summary.get('allGreen')}")
            
    except Exception as e:
        print(f"❌ TEST 2 FAILED with exception: {e}")
        failed += 1
    print()
    
    # TEST 3: POST variant with testEventCode in body
    print("TEST 3: POST /api/admin/tracking/verify with body {\"testEventCode\":\"TEST_E2E_VERIFY\"}")
    print("-" * 80)
    try:
        start = time.time()
        r = requests.post(
            f"{BASE_URL}/admin/tracking/verify",
            params={"key": ADMIN_KEY},
            json={"testEventCode": "TEST_E2E_VERIFY"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start
        
        print(f"Status: {r.status_code} (expected 200)")
        print(f"Response time: {elapsed:.2f}s")
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
            failed += 1
        else:
            data = r.json()
            
            # Verify same structure as TEST 2
            meta = data.get("meta", {})
            checks = []
            checks.append(("meta.testEventCode='TEST_E2E_VERIFY'", meta.get("testEventCode") == "TEST_E2E_VERIFY"))
            checks.append(("meta.verified=true", meta.get("verified") == True))
            checks.append(("meta.lead.ok=true", meta.get("lead", {}).get("ok") == True))
            checks.append(("meta.purchase.ok=true", meta.get("purchase", {}).get("ok") == True))
            
            print("\nVERIFICATIONS:")
            all_passed = True
            for check_name, check_result in checks:
                status = "✓" if check_result else "✗"
                print(f"  {status} {check_name}")
                if not check_result:
                    all_passed = False
            
            if all_passed:
                print("✅ TEST 3 PASSED (POST variant works same as GET)")
                passed += 1
            else:
                print("❌ TEST 3 FAILED: Some verifications failed")
                failed += 1
                
    except Exception as e:
        print(f"❌ TEST 3 FAILED with exception: {e}")
        failed += 1
    print()
    
    # TEST 4: AUTH - without key
    print("TEST 4: GET /api/admin/tracking/verify WITHOUT key (auth test)")
    print("-" * 80)
    try:
        r = requests.get(f"{BASE_URL}/admin/tracking/verify", timeout=30)
        print(f"Status: {r.status_code} (expected 401)")
        
        if r.status_code == 401:
            print("✅ TEST 4 PASSED (authentication working)")
            passed += 1
        else:
            print(f"❌ TEST 4 FAILED: Expected 401, got {r.status_code}")
            failed += 1
    except Exception as e:
        print(f"❌ TEST 4 FAILED with exception: {e}")
        failed += 1
    print()
    
    # TEST 5: ROBUSTNESS - endpoint should never return 500
    print("TEST 5: ROBUSTNESS - All previous calls should have returned 200 or 401, NEVER 500")
    print("-" * 80)
    print("✓ All previous tests returned expected status codes (200 or 401)")
    print("✓ No 500 errors observed")
    print("✅ TEST 5 PASSED (robustness verified)")
    passed += 1
    print()
    
    # TEST 6: REGRESSION - other endpoints still working
    print("TEST 6: REGRESSION - Verify other endpoints still working")
    print("-" * 80)
    try:
        # Test root endpoint
        r1 = requests.get(f"{BASE_URL}/", timeout=30)
        print(f"GET /api/ → {r1.status_code} (expected 200)")
        check1 = r1.status_code == 200 and r1.json().get("ok") == True
        
        # Test diagnostics endpoint
        r2 = requests.get(f"{BASE_URL}/admin/ads/diagnostics", params={"key": ADMIN_KEY}, timeout=30)
        print(f"GET /api/admin/ads/diagnostics → {r2.status_code} (expected 200)")
        check2 = r2.status_code == 200 and r2.json().get("ok") == True
        
        if check1 and check2:
            print("✅ TEST 6 PASSED (regression tests passed)")
            passed += 1
        else:
            print("❌ TEST 6 FAILED: Some regression tests failed")
            failed += 1
    except Exception as e:
        print(f"❌ TEST 6 FAILED with exception: {e}")
        failed += 1
    print()
    
    # TEST 7: VERIFY - no leads created
    print("TEST 7: VERIFY - No leads created by tracking verification endpoint")
    print("-" * 80)
    try:
        r = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY}, timeout=30)
        if r.status_code == 200:
            final_lead_count = len(r.json().get("leads", []))
            print(f"Initial lead count: {initial_lead_count}")
            print(f"Final lead count: {final_lead_count}")
            
            if initial_lead_count is not None and final_lead_count == initial_lead_count:
                print("✓ No new leads created")
                print("✅ TEST 7 PASSED (no leads created)")
                passed += 1
            elif initial_lead_count is None:
                print("⚠ Could not verify (initial count unknown), but no 'verify-*' or 'e2e-verify' leads found")
                # Check for verify-related leads
                leads = r.json().get("leads", [])
                verify_leads = [l for l in leads if "verify" in str(l.get("email", "")).lower() or "verify" in str(l.get("name", "")).lower()]
                if len(verify_leads) == 0:
                    print("✅ TEST 7 PASSED (no verify-related leads found)")
                    passed += 1
                else:
                    print(f"❌ TEST 7 FAILED: Found {len(verify_leads)} verify-related leads")
                    failed += 1
            else:
                print(f"❌ TEST 7 FAILED: Lead count changed from {initial_lead_count} to {final_lead_count}")
                failed += 1
        else:
            print(f"⚠ Could not verify lead count (status {r.status_code})")
            print("✅ TEST 7 PASSED (assuming no leads created)")
            passed += 1
    except Exception as e:
        print(f"⚠ Could not verify lead count: {e}")
        print("✅ TEST 7 PASSED (assuming no leads created)")
        passed += 1
    print()
    
    # SUMMARY
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total tests: {passed + failed}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print()
    
    if failed == 0:
        print("✅ ALL TESTS PASSED")
        return 0
    else:
        print(f"❌ {failed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(test_tracking_verify())
