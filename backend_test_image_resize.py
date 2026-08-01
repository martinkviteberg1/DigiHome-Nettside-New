#!/usr/bin/env python3
"""
Backend test for NEW image resize feature in /api/media + regression.
Tests on-the-fly image resize/re-encode with sharp (next/image custom loader).

CONTEXT: serveMedia() in route.js now supports ?w=<width>&q=<quality> for raster images.
First request for a given width is a cold sharp resize (2-4s), subsequent requests are cached.
"""

import requests
import sys
import time

# Base URL from review request
BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_resize_webp_640():
    """
    NEW RESIZE TEST 1: GET /api/media/interior-openplan.webp?w=640&q=72
    Expect: 200, Content-Type: image/webp, bytes SMALLER than original (~17000 vs ~44000)
    """
    print("\n=== NEW RESIZE TEST 1: GET /api/media/interior-openplan.webp?w=640&q=72 ===")
    try:
        url = f"{BASE_URL}/media/interior-openplan.webp?w=640&q=72"
        print(f"URL: {url}")
        print("NOTE: First request may take 2-4s (cold sharp resize)...")
        
        start_time = time.time()
        response = requests.get(url, timeout=10)
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Content-Length: {response.headers.get('Content-Length')}")
        print(f"Body size: {len(response.content)} bytes")
        print(f"Response time: {elapsed:.2f}s")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('Content-Type') == 'image/webp', \
            f"Expected image/webp, got {response.headers.get('Content-Type')}"
        
        # Original is ~44000 bytes, w=640 should be ~17000 bytes (smaller)
        body_size = len(response.content)
        assert body_size < 44000, \
            f"Expected resized image to be smaller than 44000 bytes, got {body_size} bytes"
        assert body_size > 10000, \
            f"Expected resized image to be at least 10000 bytes, got {body_size} bytes (too small, might be error)"
        
        print(f"✅ Test 1 PASSED - Resized image is {body_size} bytes (smaller than original ~44000)")
        return True
    except AssertionError as e:
        print(f"❌ Test 1 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 1 ERROR: {e}")
        return False

def test_resize_webp_original():
    """
    NEW RESIZE TEST 2: GET /api/media/interior-openplan.webp (no query)
    Expect: 200, image/webp, original size (~44000 bytes)
    """
    print("\n=== NEW RESIZE TEST 2: GET /api/media/interior-openplan.webp (no query) ===")
    try:
        url = f"{BASE_URL}/media/interior-openplan.webp"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Content-Length: {response.headers.get('Content-Length')}")
        print(f"Body size: {len(response.content)} bytes")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('Content-Type') == 'image/webp', \
            f"Expected image/webp, got {response.headers.get('Content-Type')}"
        
        # Original should be ~44000 bytes
        body_size = len(response.content)
        assert body_size > 40000, \
            f"Expected original image to be ~44000 bytes, got {body_size} bytes (too small)"
        assert body_size < 50000, \
            f"Expected original image to be ~44000 bytes, got {body_size} bytes (too large)"
        
        print(f"✅ Test 2 PASSED - Original image is {body_size} bytes (~44000)")
        return True
    except AssertionError as e:
        print(f"❌ Test 2 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 2 ERROR: {e}")
        return False

def test_resize_png_to_webp():
    """
    NEW RESIZE TEST 3: GET /api/media/vipps-logo.png?w=128&q=72
    Expect: 200, Content-Type: image/webp (PNG converted to WebP when resized)
    """
    print("\n=== NEW RESIZE TEST 3: GET /api/media/vipps-logo.png?w=128&q=72 ===")
    try:
        url = f"{BASE_URL}/media/vipps-logo.png?w=128&q=72"
        print(f"URL: {url}")
        print("NOTE: PNG should be converted to WebP when resized...")
        
        start_time = time.time()
        response = requests.get(url, timeout=10)
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Content-Length: {response.headers.get('Content-Length')}")
        print(f"Body size: {len(response.content)} bytes")
        print(f"Response time: {elapsed:.2f}s")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('Content-Type') == 'image/webp', \
            f"Expected image/webp (PNG converted), got {response.headers.get('Content-Type')}"
        
        body_size = len(response.content)
        assert body_size > 0, "Body is empty"
        
        print(f"✅ Test 3 PASSED - PNG converted to WebP, size: {body_size} bytes")
        return True
    except AssertionError as e:
        print(f"❌ Test 3 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 3 ERROR: {e}")
        return False

def test_resize_svg_not_resized():
    """
    NEW RESIZE TEST 4: GET /api/media/digihome-wordmark.svg?w=256
    Expect: 200, Content-Type: image/svg+xml (SVG must NOT be resized; served unchanged)
    """
    print("\n=== NEW RESIZE TEST 4: GET /api/media/digihome-wordmark.svg?w=256 ===")
    try:
        url = f"{BASE_URL}/media/digihome-wordmark.svg?w=256"
        print(f"URL: {url}")
        print("NOTE: SVG should NOT be resized, served unchanged...")
        
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Content-Length: {response.headers.get('Content-Length')}")
        print(f"Body size: {len(response.content)} bytes")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('Content-Type') == 'image/svg+xml', \
            f"Expected image/svg+xml (SVG not resized), got {response.headers.get('Content-Type')}"
        
        # SVG should be served as-is, not converted to WebP
        body_size = len(response.content)
        assert body_size > 0, "Body is empty"
        
        # Verify it's actually SVG content (starts with < or <?xml)
        body_start = response.content[:100].decode('utf-8', errors='ignore')
        assert '<' in body_start, f"Expected SVG content to start with '<', got: {body_start[:50]}"
        
        print(f"✅ Test 4 PASSED - SVG served unchanged (not resized), size: {body_size} bytes")
        return True
    except AssertionError as e:
        print(f"❌ Test 4 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 4 ERROR: {e}")
        return False

def test_resize_missing_file():
    """
    NEW RESIZE TEST 5: GET /api/media/finnes-ikke-xyz.webp?w=640
    Expect: 404 (NOT 500/crash) for a missing file
    """
    print("\n=== NEW RESIZE TEST 5: GET /api/media/finnes-ikke-xyz.webp?w=640 ===")
    try:
        url = f"{BASE_URL}/media/finnes-ikke-xyz.webp?w=640"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        # Assertions
        assert response.status_code == 404, \
            f"Expected 404 for missing file, got {response.status_code}"
        
        # Should NOT be 500 (crash)
        assert response.status_code != 500, "Got 500 error (crash) instead of 404"
        
        print("✅ Test 5 PASSED - Missing file returns 404 (not 500/crash)")
        return True
    except AssertionError as e:
        print(f"❌ Test 5 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 5 ERROR: {e}")
        return False

def test_resize_cache():
    """
    NEW RESIZE TEST 6: Cache check
    Request /api/media/interior-openplan.webp?w=750&q=72 twice
    Both should return 200 with identical byte size; second should be fast (cached)
    """
    print("\n=== NEW RESIZE TEST 6: Cache check (request same URL twice) ===")
    try:
        url = f"{BASE_URL}/media/interior-openplan.webp?w=750&q=72"
        print(f"URL: {url}")
        
        # First request (cold, may take 2-4s)
        print("\nFirst request (cold resize)...")
        start_time1 = time.time()
        response1 = requests.get(url, timeout=10)
        elapsed1 = time.time() - start_time1
        
        print(f"Status Code: {response1.status_code}")
        print(f"Content-Type: {response1.headers.get('Content-Type')}")
        print(f"Body size: {len(response1.content)} bytes")
        print(f"Response time: {elapsed1:.2f}s")
        
        assert response1.status_code == 200, f"Expected 200, got {response1.status_code}"
        assert response1.headers.get('Content-Type') == 'image/webp', \
            f"Expected image/webp, got {response1.headers.get('Content-Type')}"
        
        size1 = len(response1.content)
        
        # Second request (should be cached, fast)
        print("\nSecond request (should be cached)...")
        start_time2 = time.time()
        response2 = requests.get(url, timeout=10)
        elapsed2 = time.time() - start_time2
        
        print(f"Status Code: {response2.status_code}")
        print(f"Content-Type: {response2.headers.get('Content-Type')}")
        print(f"Body size: {len(response2.content)} bytes")
        print(f"Response time: {elapsed2:.2f}s")
        
        assert response2.status_code == 200, f"Expected 200, got {response2.status_code}"
        assert response2.headers.get('Content-Type') == 'image/webp', \
            f"Expected image/webp, got {response2.headers.get('Content-Type')}"
        
        size2 = len(response2.content)
        
        # Both should have identical byte size
        assert size1 == size2, \
            f"Expected identical byte sizes, got {size1} vs {size2}"
        
        # Second request should be faster (cached)
        # Note: This is not a hard requirement, just informational
        if elapsed2 < elapsed1:
            print(f"✅ Second request was faster ({elapsed2:.2f}s vs {elapsed1:.2f}s) - cache working")
        else:
            print(f"⚠️  Second request was not faster ({elapsed2:.2f}s vs {elapsed1:.2f}s) - but byte sizes match")
        
        print(f"✅ Test 6 PASSED - Both requests returned identical size ({size1} bytes)")
        return True
    except AssertionError as e:
        print(f"❌ Test 6 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 6 ERROR: {e}")
        return False

def test_regression_root():
    """
    REGRESSION TEST 7: GET /api/ → 200 {ok:true}
    (may be a 308 redirect to /api/ — follow redirects)
    """
    print("\n=== REGRESSION TEST 7: GET /api/ ===")
    try:
        url = f"{BASE_URL}/"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=10, allow_redirects=True)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get('ok') == True, f"Expected ok:true, got {data}"
        
        print("✅ Test 7 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ Test 7 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 7 ERROR: {e}")
        return False

def test_regression_svg():
    """
    REGRESSION TEST 8: GET /api/media/digihome-logo-white.svg → 200, Content-Type: image/svg+xml
    """
    print("\n=== REGRESSION TEST 8: GET /api/media/digihome-logo-white.svg ===")
    try:
        url = f"{BASE_URL}/media/digihome-logo-white.svg"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Body size: {len(response.content)} bytes")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('Content-Type') == 'image/svg+xml', \
            f"Expected image/svg+xml, got {response.headers.get('Content-Type')}"
        assert len(response.content) > 0, "Body is empty"
        
        print("✅ Test 8 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ Test 8 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 8 ERROR: {e}")
        return False

def test_regression_leads_validation():
    """
    REGRESSION TEST 9: POST /api/leads with EMPTY body {} → 400 {success:false}
    (validation still works; do NOT create a valid lead)
    """
    print("\n=== REGRESSION TEST 9: POST /api/leads with empty body ===")
    try:
        url = f"{BASE_URL}/leads"
        print(f"URL: {url}")
        
        response = requests.post(url, json={}, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Assertions
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert data.get('success') == False, f"Expected success:false, got {data}"
        
        print("✅ Test 9 PASSED - Validation working (empty body rejected)")
        return True
    except AssertionError as e:
        print(f"❌ Test 9 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 9 ERROR: {e}")
        return False

def test_regression_posts():
    """
    REGRESSION TEST 10: GET /api/posts → 200 {posts:[...]} with at least 3 published posts
    """
    print("\n=== REGRESSION TEST 10: GET /api/posts ===")
    try:
        url = f"{BASE_URL}/posts"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response length: {len(response.text)} chars")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert 'posts' in data, f"Expected 'posts' field, got {data.keys()}"
        
        posts = data.get('posts', [])
        assert isinstance(posts, list), f"Expected posts to be a list, got {type(posts)}"
        assert len(posts) >= 3, f"Expected at least 3 published posts, got {len(posts)}"
        
        print(f"Found {len(posts)} published posts")
        for i, post in enumerate(posts[:3], 1):
            print(f"  {i}. {post.get('title', 'N/A')[:50]}")
        
        print("✅ Test 10 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ Test 10 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 10 ERROR: {e}")
        return False

def main():
    print("=" * 80)
    print("BACKEND TEST: NEW Image Resize Feature + Regression")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print("\nCONTEXT: serveMedia() now supports on-the-fly resize/re-encode.")
    print("First request for a given width is a cold sharp resize (2-4s).")
    print("Subsequent requests are cached (fast).")
    print("=" * 80)
    
    results = []
    
    # NEW RESIZE TESTS (6 items)
    print("\n" + "=" * 80)
    print("NEW RESIZE TESTS")
    print("=" * 80)
    results.append(("NEW 1: Resize webp w=640", test_resize_webp_640()))
    results.append(("NEW 2: Original webp (no query)", test_resize_webp_original()))
    results.append(("NEW 3: PNG to WebP w=128", test_resize_png_to_webp()))
    results.append(("NEW 4: SVG not resized", test_resize_svg_not_resized()))
    results.append(("NEW 5: Missing file 404", test_resize_missing_file()))
    results.append(("NEW 6: Cache check", test_resize_cache()))
    
    # REGRESSION TESTS (4 items)
    print("\n" + "=" * 80)
    print("REGRESSION TESTS")
    print("=" * 80)
    results.append(("REGRESSION 7: Root endpoint", test_regression_root()))
    results.append(("REGRESSION 8: SVG media", test_regression_svg()))
    results.append(("REGRESSION 9: Leads validation", test_regression_leads_validation()))
    results.append(("REGRESSION 10: Posts endpoint", test_regression_posts()))
    
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
