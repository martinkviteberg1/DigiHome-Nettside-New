#!/usr/bin/env python3
"""
Backend test for NEW ads/creatives gallery endpoints.
Tests the two NEW endpoints that power the "actual ads/creatives gallery" in admin.
This is an ADDITIVE change - verify they work and nothing else broke.

ENVIRONMENT:
- Base URL: https://conversion-optimize-7.preview.emergentagent.com/api
- Admin auth: query param ?key=dh_admin_b3Kx92Qz7Lm4
- READ-ONLY. Do NOT create leads.

TESTS:
1) GET /api/admin/ads/creatives?key=dh_admin_b3Kx92Qz7Lm4
   - Expect 200. Response shape: { ok:true, google:{configured,live,ads:[...],fetchedAt,stale,error}, meta:{configured,live,ads:[...],error,...} }
   - google.ads: array with keys id, type, campaign, adGroup, status, approval, finalUrl, headlines[], descriptions[]
   - meta.ads: array with keys id, name, status, campaign, adset, title, body, image, cta, link
   - Report counts: ~1 google ad, ~26 meta ads
   - Response time: first call ~7-8s (cold), second call <1.5s (cache hit)
2) Force refresh: GET /api/admin/ads/creatives?key=...&refresh=1 → 200, within ~8s
3) AUTH: GET /api/admin/ads/creatives WITHOUT key → 401
4) IMAGE PROXY — allowed domain: GET /api/admin/ads/img?u=<fbcdn url> → 200 image/*
5) IMAGE PROXY — SSRF guard (CRITICAL):
   - GET /api/admin/ads/img?u=https%3A%2F%2Fevil.example.com%2Fx.jpg → 403
   - GET /api/admin/ads/img?u=http%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data%2F → 403
   - GET /api/admin/ads/img?u=https%3A%2F%2Fgoogle.com%2F → 403
6) REGRESSION: GET /api/admin/ads/overview?key=...&googlePeriod=last_30d&metaPeriod=last_30d → 200
   GET /api/ → 200 {ok:true}
"""

import requests
import time
import sys
from urllib.parse import quote

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 45  # Allow up to 45s for cold Composio calls

def test_creatives_endpoint():
    """Test 1: GET /api/admin/ads/creatives with key - first call (cold, may be slow)"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/admin/ads/creatives?key=... (FIRST CALL - COLD)")
    print("="*80)
    
    url = f"{BASE_URL}/admin/ads/creatives?key={ADMIN_KEY}"
    start = time.time()
    
    try:
        r = requests.get(url, timeout=TIMEOUT)
        elapsed = time.time() - start
        
        print(f"✓ Status: {r.status_code}")
        print(f"✓ Response time: {elapsed:.2f}s")
        
        if r.status_code != 200:
            print(f"✗ FAIL: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
            return False
        
        data = r.json()
        
        # Check top-level structure
        if not data.get('ok'):
            print(f"✗ FAIL: ok field is not true: {data.get('ok')}")
            return False
        print(f"✓ ok=true")
        
        # Check google structure
        google = data.get('google', {})
        if not isinstance(google, dict):
            print(f"✗ FAIL: google is not a dict")
            return False
        print(f"✓ google is dict")
        
        # Check google fields
        required_google_fields = ['configured', 'live', 'ads', 'fetchedAt', 'stale', 'error']
        for field in required_google_fields:
            if field not in google:
                print(f"✗ FAIL: google.{field} missing")
                return False
        print(f"✓ google has all required fields: {required_google_fields}")
        
        # Check google.ads structure
        google_ads = google.get('ads', [])
        if not isinstance(google_ads, list):
            print(f"✗ FAIL: google.ads is not an array")
            return False
        print(f"✓ google.ads is array with {len(google_ads)} elements")
        
        # Check google ad structure (if any ads exist)
        if len(google_ads) > 0:
            ad = google_ads[0]
            required_ad_fields = ['id', 'type', 'campaign', 'adGroup', 'status', 'approval', 'finalUrl', 'headlines', 'descriptions']
            for field in required_ad_fields:
                if field not in ad:
                    print(f"✗ FAIL: google.ads[0].{field} missing")
                    return False
            print(f"✓ google.ads[0] has all required fields: {required_ad_fields}")
            
            # Check headlines and descriptions are arrays
            if not isinstance(ad.get('headlines'), list):
                print(f"✗ FAIL: google.ads[0].headlines is not an array")
                return False
            if not isinstance(ad.get('descriptions'), list):
                print(f"✗ FAIL: google.ads[0].descriptions is not an array")
                return False
            print(f"✓ google.ads[0].headlines is array with {len(ad['headlines'])} items")
            print(f"✓ google.ads[0].descriptions is array with {len(ad['descriptions'])} items")
        
        # Check meta structure
        meta = data.get('meta', {})
        if not isinstance(meta, dict):
            print(f"✗ FAIL: meta is not a dict")
            return False
        print(f"✓ meta is dict")
        
        # Check meta fields
        required_meta_fields = ['configured', 'live', 'ads', 'fetchedAt', 'stale', 'error']
        for field in required_meta_fields:
            if field not in meta:
                print(f"✗ FAIL: meta.{field} missing")
                return False
        print(f"✓ meta has all required fields: {required_meta_fields}")
        
        # Check meta.ads structure
        meta_ads = meta.get('ads', [])
        if not isinstance(meta_ads, list):
            print(f"✗ FAIL: meta.ads is not an array")
            return False
        print(f"✓ meta.ads is array with {len(meta_ads)} elements")
        
        # Check meta ad structure (if any ads exist)
        if len(meta_ads) > 0:
            ad = meta_ads[0]
            required_ad_fields = ['id', 'name', 'status', 'campaign', 'adset', 'title', 'body', 'image', 'cta', 'link']
            for field in required_ad_fields:
                if field not in ad:
                    print(f"✗ FAIL: meta.ads[0].{field} missing")
                    return False
            print(f"✓ meta.ads[0] has all required fields: {required_ad_fields}")
        
        # Report counts
        print(f"\n📊 COUNTS:")
        print(f"  - Google ads: {len(google_ads)} (expected ~1)")
        print(f"  - Meta ads: {len(meta_ads)} (expected ~26)")
        
        # Check response time
        if elapsed > 10:
            print(f"⚠ WARNING: First call took {elapsed:.2f}s (expected ~7-8s cold, but acceptable if <10s)")
        else:
            print(f"✓ Response time {elapsed:.2f}s is acceptable for cold call")
        
        print(f"\n✅ TEST 1 PASSED")
        return True, data
        
    except requests.Timeout:
        print(f"✗ FAIL: Request timed out after {TIMEOUT}s")
        return False, None
    except Exception as e:
        print(f"✗ FAIL: {e}")
        return False, None


def test_creatives_cache_hit():
    """Test 2: GET /api/admin/ads/creatives - second call (cache hit, should be fast)"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/admin/ads/creatives?key=... (SECOND CALL - CACHE HIT)")
    print("="*80)
    
    url = f"{BASE_URL}/admin/ads/creatives?key={ADMIN_KEY}"
    start = time.time()
    
    try:
        r = requests.get(url, timeout=TIMEOUT)
        elapsed = time.time() - start
        
        print(f"✓ Status: {r.status_code}")
        print(f"✓ Response time: {elapsed:.2f}s")
        
        if r.status_code != 200:
            print(f"✗ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        
        if not data.get('ok'):
            print(f"✗ FAIL: ok field is not true")
            return False
        print(f"✓ ok=true")
        
        # Check response time for cache hit
        if elapsed > 1.5:
            print(f"⚠ WARNING: Cache hit took {elapsed:.2f}s (expected <1.5s)")
        else:
            print(f"✓ Cache hit response time {elapsed:.2f}s is excellent (<1.5s)")
        
        print(f"\n✅ TEST 2 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {e}")
        return False


def test_creatives_force_refresh():
    """Test 3: GET /api/admin/ads/creatives?refresh=1 - force refresh"""
    print("\n" + "="*80)
    print("TEST 3: GET /api/admin/ads/creatives?key=...&refresh=1 (FORCE REFRESH)")
    print("="*80)
    
    url = f"{BASE_URL}/admin/ads/creatives?key={ADMIN_KEY}&refresh=1"
    start = time.time()
    
    try:
        r = requests.get(url, timeout=TIMEOUT)
        elapsed = time.time() - start
        
        print(f"✓ Status: {r.status_code}")
        print(f"✓ Response time: {elapsed:.2f}s")
        
        if r.status_code != 200:
            print(f"✗ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        
        if not data.get('ok'):
            print(f"✗ FAIL: ok field is not true")
            return False
        print(f"✓ ok=true")
        
        # Check response time
        if elapsed > 10:
            print(f"⚠ WARNING: Force refresh took {elapsed:.2f}s (expected ~8s, but acceptable if <10s)")
        else:
            print(f"✓ Force refresh response time {elapsed:.2f}s is acceptable")
        
        print(f"\n✅ TEST 3 PASSED")
        return True
        
    except requests.Timeout:
        print(f"✗ FAIL: Request timed out after {TIMEOUT}s")
        return False
    except Exception as e:
        print(f"✗ FAIL: {e}")
        return False


def test_creatives_auth():
    """Test 4: GET /api/admin/ads/creatives WITHOUT key - should return 401"""
    print("\n" + "="*80)
    print("TEST 4: GET /api/admin/ads/creatives WITHOUT key (AUTH)")
    print("="*80)
    
    url = f"{BASE_URL}/admin/ads/creatives"
    
    try:
        r = requests.get(url, timeout=10)
        
        print(f"✓ Status: {r.status_code}")
        
        if r.status_code != 401:
            print(f"✗ FAIL: Expected 401, got {r.status_code}")
            return False
        
        print(f"✓ Correctly returned 401 without key")
        print(f"\n✅ TEST 4 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {e}")
        return False


def test_image_proxy_allowed_domain(creatives_data):
    """Test 5: GET /api/admin/ads/img?u=<fbcdn url> - allowed domain"""
    print("\n" + "="*80)
    print("TEST 5: GET /api/admin/ads/img?u=<fbcdn url> (ALLOWED DOMAIN)")
    print("="*80)
    
    # Extract a meta ad image URL
    meta_ads = creatives_data.get('meta', {}).get('ads', [])
    if not meta_ads:
        print("⚠ SKIP: No meta ads available to test image proxy")
        return True
    
    # Find an ad with an image
    image_url = None
    for ad in meta_ads:
        img = ad.get('image', '')
        if img and 'fbcdn.net' in img:
            image_url = img
            break
    
    if not image_url:
        print("⚠ SKIP: No fbcdn.net image URL found in meta ads")
        return True
    
    print(f"Using image URL: {image_url[:80]}...")
    
    # Test image proxy
    encoded_url = quote(image_url, safe='')
    proxy_url = f"{BASE_URL}/admin/ads/img?u={encoded_url}"
    
    try:
        r = requests.get(proxy_url, timeout=15)
        
        print(f"✓ Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"✗ FAIL: Expected 200, got {r.status_code}")
            return False
        
        # Check Content-Type
        content_type = r.headers.get('Content-Type', '')
        print(f"✓ Content-Type: {content_type}")
        
        if not content_type.startswith('image/'):
            print(f"✗ FAIL: Expected Content-Type to start with 'image/', got '{content_type}'")
            return False
        
        # Check body is non-empty
        body_len = len(r.content)
        print(f"✓ Body length: {body_len} bytes")
        
        if body_len == 0:
            print(f"✗ FAIL: Body is empty")
            return False
        
        print(f"✓ Image proxy working correctly for allowed domain (fbcdn.net)")
        print(f"\n✅ TEST 5 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {e}")
        return False


def test_image_proxy_ssrf_guards():
    """Test 6: Image proxy SSRF guards - CRITICAL security test"""
    print("\n" + "="*80)
    print("TEST 6: IMAGE PROXY SSRF GUARDS (CRITICAL SECURITY)")
    print("="*80)
    
    test_cases = [
        {
            'name': 'Evil domain (evil.example.com)',
            'url': 'https://evil.example.com/x.jpg',
            'expected': 403,
        },
        {
            'name': 'AWS metadata SSRF (169.254.169.254)',
            'url': 'http://169.254.169.254/latest/meta-data/',
            'expected': 403,
        },
        {
            'name': 'Non-whitelisted domain (google.com)',
            'url': 'https://google.com/',
            'expected': 403,
        },
    ]
    
    all_passed = True
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n  Test 6.{i}: {test['name']}")
        print(f"  URL: {test['url']}")
        
        encoded_url = quote(test['url'], safe='')
        proxy_url = f"{BASE_URL}/admin/ads/img?u={encoded_url}"
        
        try:
            r = requests.get(proxy_url, timeout=10)
            
            print(f"  ✓ Status: {r.status_code}")
            
            if r.status_code != test['expected']:
                print(f"  ✗ FAIL: Expected {test['expected']}, got {r.status_code}")
                all_passed = False
            else:
                print(f"  ✓ Correctly returned {test['expected']} (blocked)")
        
        except Exception as e:
            print(f"  ✗ FAIL: {e}")
            all_passed = False
    
    if all_passed:
        print(f"\n✅ TEST 6 PASSED - ALL SSRF GUARDS WORKING")
    else:
        print(f"\n✗ TEST 6 FAILED - SSRF VULNERABILITY DETECTED")
    
    return all_passed


def test_regression_overview():
    """Test 7: Regression - GET /api/admin/ads/overview still works"""
    print("\n" + "="*80)
    print("TEST 7: REGRESSION - GET /api/admin/ads/overview")
    print("="*80)
    
    url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=last_30d&metaPeriod=last_30d"
    
    try:
        r = requests.get(url, timeout=30)
        
        print(f"✓ Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"✗ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        
        # Check basic structure
        if not data.get('ok'):
            print(f"✗ FAIL: ok field is not true")
            return False
        print(f"✓ ok=true")
        
        # Check for series, economics, combined
        if 'series' not in data:
            print(f"✗ FAIL: series field missing")
            return False
        print(f"✓ series field present")
        
        if 'economics' not in data:
            print(f"✗ FAIL: economics field missing")
            return False
        print(f"✓ economics field present")
        
        if 'combined' not in data:
            print(f"✗ FAIL: combined field missing")
            return False
        print(f"✓ combined field present")
        
        print(f"✓ Overview endpoint still working correctly")
        print(f"\n✅ TEST 7 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {e}")
        return False


def test_regression_root():
    """Test 8: Regression - GET /api/ still works"""
    print("\n" + "="*80)
    print("TEST 8: REGRESSION - GET /api/")
    print("="*80)
    
    url = f"{BASE_URL}/"
    
    try:
        r = requests.get(url, timeout=10)
        
        print(f"✓ Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"✗ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        
        if not data.get('ok'):
            print(f"✗ FAIL: ok field is not true")
            return False
        print(f"✓ ok=true")
        
        print(f"✓ Root endpoint still working correctly")
        print(f"\n✅ TEST 8 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {e}")
        return False


def main():
    print("="*80)
    print("BACKEND TEST: ADS/CREATIVES GALLERY ENDPOINTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print("="*80)
    
    results = []
    creatives_data = None
    
    # Test 1: First call (cold)
    result, data = test_creatives_endpoint()
    results.append(('Test 1: Creatives endpoint (cold)', result))
    if result and data:
        creatives_data = data
    
    # Test 2: Second call (cache hit)
    result = test_creatives_cache_hit()
    results.append(('Test 2: Creatives endpoint (cache hit)', result))
    
    # Test 3: Force refresh
    result = test_creatives_force_refresh()
    results.append(('Test 3: Creatives force refresh', result))
    
    # Test 4: Auth
    result = test_creatives_auth()
    results.append(('Test 4: Creatives auth (401)', result))
    
    # Test 5: Image proxy allowed domain
    if creatives_data:
        result = test_image_proxy_allowed_domain(creatives_data)
        results.append(('Test 5: Image proxy (allowed domain)', result))
    
    # Test 6: Image proxy SSRF guards
    result = test_image_proxy_ssrf_guards()
    results.append(('Test 6: Image proxy SSRF guards', result))
    
    # Test 7: Regression - overview
    result = test_regression_overview()
    results.append(('Test 7: Regression - overview', result))
    
    # Test 8: Regression - root
    result = test_regression_root()
    results.append(('Test 8: Regression - root', result))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed ({100*passed//total}% success rate)")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)


if __name__ == '__main__':
    main()
