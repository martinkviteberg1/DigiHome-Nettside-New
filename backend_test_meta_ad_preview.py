#!/usr/bin/env python3
"""
Backend test for Meta ad-preview endpoint (P0).
Tests GET /api/admin/ads/preview (302-redirect to Meta's preview_iframe, token server-side, no-referrer).

CRITICAL: Meta blocks full_picture (needs pages_read_engagement), so we render Meta ads via Meta's
official preview iframe. The new endpoint fetches the preview src SERVER-SIDE (the Meta System User
token must NEVER reach the client) and responds with a 302 redirect to business.facebook.com,
including the response header "Referrer-Policy: no-referrer".

IMPORTANT about redirects: use allow_redirects=False (httpx: follow_redirects=False) so we can
observe the 302 directly. The preview/Cloudflare proxy MAY rewrite a 302 into an HTML page from
the client's perspective; if so, check that the Next.js app log shows a line like
"GET /api/admin/ads/preview?... 302 in Xms" which is the authoritative PASS signal.

READ-ONLY — do NOT create any leads. Keep the database clean.
"""

import httpx
import sys
import time

BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 30.0  # 30s timeout (endpoint makes real Meta Graph API call ~0.3-1s)

def test_meta_ad_preview():
    """Test Meta ad-preview endpoint (P0)."""
    print("\n" + "="*80)
    print("TESTING: Meta Ad-Preview Endpoint (P0)")
    print("="*80)
    
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "tests": []
    }
    
    def log_test(name, passed, details=""):
        results["total"] += 1
        if passed:
            results["passed"] += 1
            print(f"✅ TEST {results['total']}: {name}")
        else:
            results["failed"] += 1
            print(f"❌ TEST {results['total']}: {name}")
        if details:
            print(f"   {details}")
        results["tests"].append({"name": name, "passed": passed, "details": details})
    
    try:
        # ──────────────────────────────────────────────────────────────────────
        # TEST 0: Fetch a real Meta ad id from /api/admin/ads/creatives
        # ──────────────────────────────────────────────────────────────────────
        print("\n📋 TEST 0: Fetching real Meta ad id from /api/admin/ads/creatives...")
        try:
            with httpx.Client(timeout=TIMEOUT, follow_redirects=False) as client:
                r = client.get(f"{BASE_URL}/admin/ads/creatives", params={"key": ADMIN_KEY})
                print(f"   Status: {r.status_code}, Time: {r.elapsed.total_seconds():.2f}s")
                
                if r.status_code != 200:
                    log_test("Fetch real Meta ad id", False, f"Expected 200, got {r.status_code}")
                    print("\n⚠️  CRITICAL: Cannot proceed without a real Meta ad id. Aborting tests.")
                    return results
                
                data = r.json()
                if not data.get("ok"):
                    log_test("Fetch real Meta ad id", False, f"Response ok=false: {data}")
                    print("\n⚠️  CRITICAL: Cannot proceed without a real Meta ad id. Aborting tests.")
                    return results
                
                meta_ads = data.get("meta", {}).get("ads", [])
                if not meta_ads or len(meta_ads) == 0:
                    log_test("Fetch real Meta ad id", False, "meta.ads is empty (no Meta ads found)")
                    print("\n⚠️  CRITICAL: Cannot proceed without a real Meta ad id. Aborting tests.")
                    return results
                
                ad_id = meta_ads[0].get("id", "")
                if not ad_id:
                    log_test("Fetch real Meta ad id", False, "meta.ads[0].id is missing")
                    print("\n⚠️  CRITICAL: Cannot proceed without a real Meta ad id. Aborting tests.")
                    return results
                
                log_test("Fetch real Meta ad id", True, f"Got ad_id={ad_id} from meta.ads[0] (total ads: {len(meta_ads)})")
                print(f"   ✓ Using ad_id: {ad_id}")
        
        except Exception as e:
            log_test("Fetch real Meta ad id", False, f"Exception: {e}")
            print("\n⚠️  CRITICAL: Cannot proceed without a real Meta ad id. Aborting tests.")
            return results
        
        # ──────────────────────────────────────────────────────────────────────
        # TEST 1: GET /api/admin/ads/preview?id=<adId>&format=MOBILE_FEED_STANDARD&key=...
        # Expected: 302 (or 307), Location starts with "https://business.facebook.com/",
        # Referrer-Policy: no-referrer
        # ──────────────────────────────────────────────────────────────────────
        print("\n📋 TEST 1: GET /api/admin/ads/preview with MOBILE_FEED_STANDARD...")
        try:
            with httpx.Client(timeout=TIMEOUT, follow_redirects=False) as client:
                r = client.get(
                    f"{BASE_URL}/admin/ads/preview",
                    params={"id": ad_id, "format": "MOBILE_FEED_STANDARD", "key": ADMIN_KEY}
                )
                print(f"   Status: {r.status_code}, Time: {r.elapsed.total_seconds():.2f}s")
                
                # Check status code (302 or 307)
                if r.status_code not in [302, 307]:
                    log_test("Preview MOBILE_FEED_STANDARD (status)", False, 
                            f"Expected 302 or 307, got {r.status_code}")
                else:
                    log_test("Preview MOBILE_FEED_STANDARD (status)", True, 
                            f"Status {r.status_code} (redirect)")
                
                # Check Location header
                location = r.headers.get("Location", "")
                if location.startswith("https://business.facebook.com/"):
                    log_test("Preview MOBILE_FEED_STANDARD (Location)", True, 
                            f"Location starts with https://business.facebook.com/")
                    print(f"   ✓ Location host: {location.split('/')[2] if len(location.split('/')) > 2 else 'N/A'}")
                else:
                    log_test("Preview MOBILE_FEED_STANDARD (Location)", False, 
                            f"Location does not start with https://business.facebook.com/: {location[:100]}")
                
                # Check Referrer-Policy header
                referrer_policy = r.headers.get("Referrer-Policy", "")
                if referrer_policy == "no-referrer":
                    log_test("Preview MOBILE_FEED_STANDARD (Referrer-Policy)", True, 
                            "Referrer-Policy: no-referrer")
                else:
                    log_test("Preview MOBILE_FEED_STANDARD (Referrer-Policy)", False, 
                            f"Expected 'no-referrer', got '{referrer_policy}'")
        
        except Exception as e:
            log_test("Preview MOBILE_FEED_STANDARD", False, f"Exception: {e}")
        
        # ──────────────────────────────────────────────────────────────────────
        # TEST 2: Same with format=INSTAGRAM_STANDARD → 302
        # ──────────────────────────────────────────────────────────────────────
        print("\n📋 TEST 2: GET /api/admin/ads/preview with INSTAGRAM_STANDARD...")
        try:
            with httpx.Client(timeout=TIMEOUT, follow_redirects=False) as client:
                r = client.get(
                    f"{BASE_URL}/admin/ads/preview",
                    params={"id": ad_id, "format": "INSTAGRAM_STANDARD", "key": ADMIN_KEY}
                )
                print(f"   Status: {r.status_code}, Time: {r.elapsed.total_seconds():.2f}s")
                
                if r.status_code in [302, 307]:
                    location = r.headers.get("Location", "")
                    if location.startswith("https://business.facebook.com/"):
                        log_test("Preview INSTAGRAM_STANDARD", True, 
                                f"Status {r.status_code}, Location correct")
                    else:
                        log_test("Preview INSTAGRAM_STANDARD", False, 
                                f"Status {r.status_code} but Location incorrect: {location[:100]}")
                else:
                    log_test("Preview INSTAGRAM_STANDARD", False, 
                            f"Expected 302/307, got {r.status_code}")
        
        except Exception as e:
            log_test("Preview INSTAGRAM_STANDARD", False, f"Exception: {e}")
        
        # ──────────────────────────────────────────────────────────────────────
        # TEST 3: Same with format=INSTAGRAM_STORY → 302
        # ──────────────────────────────────────────────────────────────────────
        print("\n📋 TEST 3: GET /api/admin/ads/preview with INSTAGRAM_STORY...")
        try:
            with httpx.Client(timeout=TIMEOUT, follow_redirects=False) as client:
                r = client.get(
                    f"{BASE_URL}/admin/ads/preview",
                    params={"id": ad_id, "format": "INSTAGRAM_STORY", "key": ADMIN_KEY}
                )
                print(f"   Status: {r.status_code}, Time: {r.elapsed.total_seconds():.2f}s")
                
                if r.status_code in [302, 307]:
                    location = r.headers.get("Location", "")
                    if location.startswith("https://business.facebook.com/"):
                        log_test("Preview INSTAGRAM_STORY", True, 
                                f"Status {r.status_code}, Location correct")
                    else:
                        log_test("Preview INSTAGRAM_STORY", False, 
                                f"Status {r.status_code} but Location incorrect: {location[:100]}")
                else:
                    log_test("Preview INSTAGRAM_STORY", False, 
                            f"Expected 302/307, got {r.status_code}")
        
        except Exception as e:
            log_test("Preview INSTAGRAM_STORY", False, f"Exception: {e}")
        
        # ──────────────────────────────────────────────────────────────────────
        # TEST 4: Same with format=HACK (invalid) → should STILL be 302 (falls back
        # to MOBILE_FEED_STANDARD), NOT 400/500
        # ──────────────────────────────────────────────────────────────────────
        print("\n📋 TEST 4: GET /api/admin/ads/preview with HACK (invalid format)...")
        try:
            with httpx.Client(timeout=TIMEOUT, follow_redirects=False) as client:
                r = client.get(
                    f"{BASE_URL}/admin/ads/preview",
                    params={"id": ad_id, "format": "HACK", "key": ADMIN_KEY}
                )
                print(f"   Status: {r.status_code}, Time: {r.elapsed.total_seconds():.2f}s")
                
                if r.status_code in [302, 307]:
                    log_test("Preview HACK (invalid format fallback)", True, 
                            f"Status {r.status_code} (correctly fell back to MOBILE_FEED_STANDARD, NOT 400/500)")
                elif r.status_code in [400, 500]:
                    log_test("Preview HACK (invalid format fallback)", False, 
                            f"Expected 302/307 (fallback), got {r.status_code} (should NOT be 400/500)")
                else:
                    log_test("Preview HACK (invalid format fallback)", False, 
                            f"Expected 302/307, got {r.status_code}")
        
        except Exception as e:
            log_test("Preview HACK (invalid format fallback)", False, f"Exception: {e}")
        
        # ──────────────────────────────────────────────────────────────────────
        # TEST 5: Invalid id 'abc' (with valid key) → 400
        # ──────────────────────────────────────────────────────────────────────
        print("\n📋 TEST 5: GET /api/admin/ads/preview with invalid id 'abc'...")
        try:
            with httpx.Client(timeout=TIMEOUT, follow_redirects=False) as client:
                r = client.get(
                    f"{BASE_URL}/admin/ads/preview",
                    params={"id": "abc", "format": "MOBILE_FEED_STANDARD", "key": ADMIN_KEY}
                )
                print(f"   Status: {r.status_code}, Time: {r.elapsed.total_seconds():.2f}s")
                
                if r.status_code == 400:
                    log_test("Preview invalid id 'abc'", True, "Status 400 (correctly rejected)")
                else:
                    log_test("Preview invalid id 'abc'", False, 
                            f"Expected 400, got {r.status_code}")
        
        except Exception as e:
            log_test("Preview invalid id 'abc'", False, f"Exception: {e}")
        
        # ──────────────────────────────────────────────────────────────────────
        # TEST 6: WITHOUT key (no ?key=) → 401
        # ──────────────────────────────────────────────────────────────────────
        print("\n📋 TEST 6: GET /api/admin/ads/preview WITHOUT key...")
        try:
            with httpx.Client(timeout=TIMEOUT, follow_redirects=False) as client:
                r = client.get(
                    f"{BASE_URL}/admin/ads/preview",
                    params={"id": ad_id, "format": "MOBILE_FEED_STANDARD"}
                )
                print(f"   Status: {r.status_code}, Time: {r.elapsed.total_seconds():.2f}s")
                
                if r.status_code == 401:
                    log_test("Preview without key (auth)", True, "Status 401 (authentication working)")
                else:
                    log_test("Preview without key (auth)", False, 
                            f"Expected 401, got {r.status_code}")
        
        except Exception as e:
            log_test("Preview without key (auth)", False, f"Exception: {e}")
        
        # ──────────────────────────────────────────────────────────────────────
        # TEST 7: REGRESSION: GET /api/ → 200 {ok:true}
        # ──────────────────────────────────────────────────────────────────────
        print("\n📋 TEST 7: REGRESSION - GET /api/ (root endpoint)...")
        try:
            with httpx.Client(timeout=TIMEOUT, follow_redirects=True) as client:
                r = client.get(f"{BASE_URL}/")
                print(f"   Status: {r.status_code}, Time: {r.elapsed.total_seconds():.2f}s")
                
                if r.status_code == 200:
                    data = r.json()
                    if data.get("ok") is True:
                        log_test("Regression: root endpoint", True, "Status 200, ok=true")
                    else:
                        log_test("Regression: root endpoint", False, f"Status 200 but ok={data.get('ok')}")
                else:
                    log_test("Regression: root endpoint", False, f"Expected 200, got {r.status_code}")
        
        except Exception as e:
            log_test("Regression: root endpoint", False, f"Exception: {e}")
        
        # ──────────────────────────────────────────────────────────────────────
        # TEST 8: REGRESSION: GET /api/admin/ads/creatives?key=... → 200 with meta.ads array
        # ──────────────────────────────────────────────────────────────────────
        print("\n📋 TEST 8: REGRESSION - GET /api/admin/ads/creatives...")
        try:
            with httpx.Client(timeout=TIMEOUT, follow_redirects=False) as client:
                r = client.get(f"{BASE_URL}/admin/ads/creatives", params={"key": ADMIN_KEY})
                print(f"   Status: {r.status_code}, Time: {r.elapsed.total_seconds():.2f}s")
                
                if r.status_code == 200:
                    data = r.json()
                    meta_ads = data.get("meta", {}).get("ads", [])
                    if isinstance(meta_ads, list):
                        log_test("Regression: creatives endpoint", True, 
                                f"Status 200, meta.ads is array with {len(meta_ads)} elements")
                    else:
                        log_test("Regression: creatives endpoint", False, 
                                f"Status 200 but meta.ads is not array: {type(meta_ads)}")
                else:
                    log_test("Regression: creatives endpoint", False, 
                            f"Expected 200, got {r.status_code}")
        
        except Exception as e:
            log_test("Regression: creatives endpoint", False, f"Exception: {e}")
    
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    # ──────────────────────────────────────────────────────────────────────
    # SUMMARY
    # ──────────────────────────────────────────────────────────────────────
    print("\n" + "="*80)
    print("TEST SUMMARY: Meta Ad-Preview Endpoint (P0)")
    print("="*80)
    print(f"Total tests: {results['total']}")
    print(f"Passed: {results['passed']} ✅")
    print(f"Failed: {results['failed']} ❌")
    print(f"Success rate: {(results['passed']/results['total']*100) if results['total'] > 0 else 0:.1f}%")
    print("="*80)
    
    if results["failed"] > 0:
        print("\n❌ FAILED TESTS:")
        for t in results["tests"]:
            if not t["passed"]:
                print(f"  • {t['name']}")
                if t["details"]:
                    print(f"    {t['details']}")
    
    return results

if __name__ == "__main__":
    print("\n" + "="*80)
    print("Meta Ad-Preview Endpoint Backend Test (P0)")
    print("Base URL:", BASE_URL)
    print("Admin key:", ADMIN_KEY)
    print("Timeout:", TIMEOUT, "seconds")
    print("="*80)
    
    results = test_meta_ad_preview()
    
    # Exit with appropriate code
    sys.exit(0 if results["failed"] == 0 else 1)
