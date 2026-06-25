#!/usr/bin/env python3
"""
Backend test for NEW media-serving endpoint + regression tests.
Tests the /api/media/<path> endpoint backed by Emergent object storage.
"""

import requests
import sys

# Base URL from .env NEXT_PUBLIC_BASE_URL
BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"

def test_media_svg():
    """Test 1: GET /api/media/digihome-logo-white.svg"""
    print("\n=== Test 1: GET /api/media/digihome-logo-white.svg ===")
    try:
        url = f"{BASE_URL}/media/digihome-logo-white.svg"
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Content-Length: {response.headers.get('Content-Length')}")
        print(f"Cache-Control: {response.headers.get('Cache-Control')}")
        print(f"Accept-Ranges: {response.headers.get('Accept-Ranges')}")
        print(f"Body size: {len(response.content)} bytes")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('Content-Type') == 'image/svg+xml', f"Expected image/svg+xml, got {response.headers.get('Content-Type')}"
        assert len(response.content) > 0, "Body is empty"
        assert len(response.content) > 1000, f"Expected ~5KB, got {len(response.content)} bytes (too small)"
        assert 'immutable' in response.headers.get('Cache-Control', ''), "Expected Cache-Control to include 'immutable'"
        assert response.headers.get('Accept-Ranges') == 'bytes', "Expected Accept-Ranges: bytes"
        
        print("✅ Test 1 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ Test 1 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 1 ERROR: {e}")
        return False

def test_media_large_image():
    """Test 2: GET /api/media/bergen-harbor.jpg (large file ~4.2MB)"""
    print("\n=== Test 2: GET /api/media/bergen-harbor.jpg ===")
    try:
        url = f"{BASE_URL}/media/bergen-harbor.jpg"
        response = requests.get(url, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Content-Length: {response.headers.get('Content-Length')}")
        print(f"Body size: {len(response.content)} bytes ({len(response.content) / 1024 / 1024:.2f} MB)")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('Content-Type') == 'image/jpeg', f"Expected image/jpeg, got {response.headers.get('Content-Type')}"
        assert len(response.content) > 1000000, f"Expected ~4.2MB, got {len(response.content)} bytes (too small)"
        
        print("✅ Test 2 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ Test 2 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 2 ERROR: {e}")
        return False

def test_media_video_range():
    """Test 3: GET /api/media/film/digihome-keyhole-16x9.mp4 WITH Range header"""
    print("\n=== Test 3: GET /api/media/film/digihome-keyhole-16x9.mp4 WITH Range ===")
    try:
        url = f"{BASE_URL}/media/film/digihome-keyhole-16x9.mp4"
        headers = {"Range": "bytes=0-1023"}
        response = requests.get(url, headers=headers, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Content-Range: {response.headers.get('Content-Range')}")
        print(f"Content-Length: {response.headers.get('Content-Length')}")
        print(f"Accept-Ranges: {response.headers.get('Accept-Ranges')}")
        print(f"Body size: {len(response.content)} bytes")
        
        # Assertions
        assert response.status_code == 206, f"Expected 206 Partial Content, got {response.status_code}"
        assert response.headers.get('Content-Type') == 'video/mp4', f"Expected video/mp4, got {response.headers.get('Content-Type')}"
        assert response.headers.get('Accept-Ranges') == 'bytes', "Expected Accept-Ranges: bytes"
        assert 'Content-Range' in response.headers, "Missing Content-Range header"
        
        content_range = response.headers.get('Content-Range', '')
        assert content_range.startswith('bytes 0-1023/'), f"Expected 'bytes 0-1023/<total>', got '{content_range}'"
        
        content_length = int(response.headers.get('Content-Length', '0'))
        assert content_length == 1024, f"Expected Content-Length: 1024, got {content_length}"
        assert len(response.content) == 1024, f"Expected body size 1024 bytes, got {len(response.content)}"
        
        print("✅ Test 3 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ Test 3 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 3 ERROR: {e}")
        return False

def test_media_video_full():
    """Test 4: GET /api/media/film/digihome-keyhole-16x9.mp4 WITHOUT Range header"""
    print("\n=== Test 4: GET /api/media/film/digihome-keyhole-16x9.mp4 WITHOUT Range ===")
    try:
        url = f"{BASE_URL}/media/film/digihome-keyhole-16x9.mp4"
        response = requests.get(url, timeout=60)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Content-Length: {response.headers.get('Content-Length')}")
        print(f"Accept-Ranges: {response.headers.get('Accept-Ranges')}")
        print(f"Cache-Control: {response.headers.get('Cache-Control')}")
        print(f"Body size: {len(response.content)} bytes ({len(response.content) / 1024 / 1024:.2f} MB)")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('Content-Type') == 'video/mp4', f"Expected video/mp4, got {response.headers.get('Content-Type')}"
        assert response.headers.get('Accept-Ranges') == 'bytes', "Expected Accept-Ranges: bytes"
        assert 'immutable' in response.headers.get('Cache-Control', ''), "Expected Cache-Control to include 'immutable'"
        
        content_length = int(response.headers.get('Content-Length', '0'))
        assert content_length > 0, "Content-Length is 0"
        assert len(response.content) == content_length, f"Body size {len(response.content)} doesn't match Content-Length {content_length}"
        
        print("✅ Test 4 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ Test 4 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 4 ERROR: {e}")
        return False

def test_media_not_found():
    """Test 5: GET /api/media/does-not-exist-xyz.png (404)"""
    print("\n=== Test 5: GET /api/media/does-not-exist-xyz.png ===")
    try:
        url = f"{BASE_URL}/media/does-not-exist-xyz.png"
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response body: {response.text[:200]}")
        
        # Assertions
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        # Should be JSON with error message
        try:
            data = response.json()
            assert 'error' in data, "Expected JSON with 'error' field"
            print(f"Error message: {data.get('error')}")
        except:
            print("Note: Response is not JSON, but 404 is correct")
        
        print("✅ Test 5 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ Test 5 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 5 ERROR: {e}")
        return False

def test_media_nested_path():
    """Test 6: GET /api/media/team/martin-kviteberg.jpg (nested path)"""
    print("\n=== Test 6: GET /api/media/team/martin-kviteberg.jpg ===")
    try:
        url = f"{BASE_URL}/media/team/martin-kviteberg.jpg"
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Body size: {len(response.content)} bytes")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('Content-Type') == 'image/jpeg', f"Expected image/jpeg, got {response.headers.get('Content-Type')}"
        assert len(response.content) > 0, "Body is empty"
        
        print("✅ Test 6 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ Test 6 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 6 ERROR: {e}")
        return False

def test_regression_root():
    """Test 7: GET /api/ → 200 {ok:true}"""
    print("\n=== Test 7: REGRESSION - GET /api/ ===")
    try:
        url = f"{BASE_URL}/"
        response = requests.get(url, timeout=10)
        
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

def test_regression_lead_target():
    """Test 8: GET /api/lead-target → 200 with env/url/keyConfigured/baseUrl"""
    print("\n=== Test 8: REGRESSION - GET /api/lead-target ===")
    try:
        url = f"{BASE_URL}/lead-target"
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert 'env' in data, "Missing 'env' field"
        assert 'url' in data, "Missing 'url' field"
        assert 'keyConfigured' in data, "Missing 'keyConfigured' field"
        assert 'baseUrl' in data, "Missing 'baseUrl' field"
        
        # On preview, env should be 'test'
        assert data.get('env') == 'test', f"Expected env='test' on preview, got '{data.get('env')}'"
        
        print("✅ Test 8 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ Test 8 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 8 ERROR: {e}")
        return False

def test_regression_leads_validation():
    """Test 9: POST /api/leads with empty body {} → 400"""
    print("\n=== Test 9: REGRESSION - POST /api/leads empty body ===")
    try:
        url = f"{BASE_URL}/leads"
        response = requests.post(url, json={}, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Assertions
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert data.get('success') == False, f"Expected success:false, got {data}"
        assert 'error' in data, "Missing 'error' field"
        assert 'Mangler kontaktinformasjon' in data.get('error', ''), f"Expected Norwegian error message, got {data.get('error')}"
        
        print("✅ Test 9 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ Test 9 FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ Test 9 ERROR: {e}")
        return False

def test_regression_deck_auth():
    """Test 10: GET /api/deck/auth (no cookie) → 200 {authed:false}"""
    print("\n=== Test 10: REGRESSION - GET /api/deck/auth ===")
    try:
        url = f"{BASE_URL}/deck/auth"
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert 'authed' in data, "Missing 'authed' field"
        assert data.get('authed') == False, f"Expected authed:false (no cookie), got {data}"
        
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
    print("BACKEND TEST: Media-serving endpoint + Regression")
    print("=" * 80)
    
    results = []
    
    # Media endpoint tests (NEW)
    results.append(("Test 1: SVG file", test_media_svg()))
    results.append(("Test 2: Large JPEG", test_media_large_image()))
    results.append(("Test 3: Video with Range", test_media_video_range()))
    results.append(("Test 4: Video full", test_media_video_full()))
    results.append(("Test 5: 404 not found", test_media_not_found()))
    results.append(("Test 6: Nested path", test_media_nested_path()))
    
    # Regression tests
    results.append(("Test 7: Root endpoint", test_regression_root()))
    results.append(("Test 8: Lead target", test_regression_lead_target()))
    results.append(("Test 9: Leads validation", test_regression_leads_validation()))
    results.append(("Test 10: Deck auth", test_regression_deck_auth()))
    
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
