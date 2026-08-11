#!/usr/bin/env python3
"""
PROD IMAGE VERIFICATION TEST
Verifies that images on https://digihome.no/nyest3 are now working after upload_public_to_storage.mjs sync.
CRITICAL: READ-ONLY testing only. NO POST/PUT/DELETE to production.
"""

import requests
import sys
from typing import Dict, Tuple

# Base URLs
PROD_BASE = "https://digihome.no"
PREVIEW_BASE = "https://saker-hub.preview.emergentagent.com"

def test_url(url: str, expect_content_type: str = None, expect_min_size: int = None, use_head: bool = False) -> Tuple[bool, str]:
    """
    Test a single URL and return (success, message).
    
    Args:
        url: URL to test
        expect_content_type: Expected Content-Type prefix (e.g., 'image/webp')
        expect_min_size: Minimum expected size in bytes
        use_head: Use HEAD request instead of GET (for large files)
    """
    try:
        if use_head:
            response = requests.head(url, timeout=30, allow_redirects=True)
        else:
            response = requests.get(url, timeout=30, allow_redirects=True)
        
        status = response.status_code
        content_type = response.headers.get('Content-Type', 'unknown')
        content_length = response.headers.get('Content-Length', 'unknown')
        
        # For GET requests, use actual content length
        if not use_head and hasattr(response, 'content'):
            actual_size = len(response.content)
        else:
            actual_size = int(content_length) if content_length != 'unknown' and content_length.isdigit() else 0
        
        # Check status
        if status != 200:
            return False, f"❌ Status {status} (expected 200), Content-Type: {content_type}"
        
        # Check content type if specified
        if expect_content_type and not content_type.startswith(expect_content_type):
            return False, f"❌ Status 200 but wrong Content-Type: {content_type} (expected {expect_content_type})"
        
        # Check size if specified
        if expect_min_size and actual_size < expect_min_size:
            return False, f"❌ Status 200, Content-Type: {content_type}, but size {actual_size} bytes < {expect_min_size} bytes"
        
        # Success
        size_info = f", size: {actual_size} bytes" if actual_size > 0 else ""
        return True, f"✅ Status 200, Content-Type: {content_type}{size_info}"
        
    except requests.exceptions.RequestException as e:
        return False, f"❌ Request failed: {str(e)}"

def test_html_contains(url: str, search_text: str) -> Tuple[bool, str]:
    """Test that HTML page contains specific text."""
    try:
        response = requests.get(url, timeout=30)
        if response.status_code != 200:
            return False, f"❌ Status {response.status_code} (expected 200)"
        
        if search_text in response.text:
            return True, f"✅ Status 200, HTML contains '{search_text}'"
        else:
            return False, f"❌ Status 200 but HTML does NOT contain '{search_text}'"
            
    except requests.exceptions.RequestException as e:
        return False, f"❌ Request failed: {str(e)}"

def main():
    print("=" * 80)
    print("PROD IMAGE VERIFICATION TEST - https://digihome.no/nyest3")
    print("=" * 80)
    print()
    
    all_passed = True
    results = []
    
    # A) PROD PAGE
    print("A) PROD PAGE")
    print("-" * 80)
    url = f"{PROD_BASE}/nyest3"
    success, msg = test_html_contains(url, "nyest-hero-portrett.webp")
    results.append((url, success, msg))
    print(f"{url}")
    print(f"   {msg}")
    print()
    if not success:
        all_passed = False
    
    # B) PROD ASSETS (previously 404, should now be 200)
    print("B) PROD ASSETS (previously 404, should now be 200 with correct Content-Type)")
    print("-" * 80)
    
    test_cases_b = [
        (f"{PROD_BASE}/nyest-hero-portrett.webp", "image/webp", 50000),
        (f"{PROD_BASE}/nyest-interior-2.webp", "image/webp", None),
        (f"{PROD_BASE}/sarah-portrett.webp", "image/webp", None),
    ]
    
    for url, content_type, min_size in test_cases_b:
        success, msg = test_url(url, content_type, min_size)
        results.append((url, success, msg))
        print(f"{url}")
        print(f"   {msg}")
        print()
        if not success:
            all_passed = False
    
    # C) PROD ASSETS (regression, was 200 before)
    print("C) PROD ASSETS (regression, was 200 before)")
    print("-" * 80)
    
    test_cases_c = [
        (f"{PROD_BASE}/deck-desktop.webp", "image/webp", None, False),
        (f"{PROD_BASE}/brandfilm-poster.jpg", "image/jpeg", None, False),
        (f"{PROD_BASE}/brandfilm-web.mp4", "video/mp4", None, True),  # HEAD only for 6.5MB video
        (f"{PROD_BASE}/finn-logo-full.png", "image/png", None, False),
        (f"{PROD_BASE}/airbnb-logo.png", "image/png", None, False),
        (f"{PROD_BASE}/vipps-logo.png", "image/png", None, False),
    ]
    
    for url, content_type, min_size, use_head in test_cases_c:
        success, msg = test_url(url, content_type, min_size, use_head)
        results.append((url, success, msg))
        method = "HEAD" if use_head else "GET"
        print(f"{url} ({method})")
        print(f"   {msg}")
        print()
        if not success:
            all_passed = False
    
    # D) MEDIA ROUTE DIRECT ON PROD
    print("D) MEDIA ROUTE DIRECT ON PROD")
    print("-" * 80)
    url = f"{PROD_BASE}/api/media/nyest-hero-portrett.webp"
    success, msg = test_url(url, "image/webp", None)
    results.append((url, success, msg))
    print(f"{url}")
    print(f"   {msg}")
    print()
    if not success:
        all_passed = False
    
    # E) PREVIEW-REGRESSION
    print("E) PREVIEW-REGRESSION (environment I'm in)")
    print("-" * 80)
    
    test_cases_e = [
        (f"{PREVIEW_BASE}/nyest3", None, None),
        (f"{PREVIEW_BASE}/nyest-hero-portrett.webp", "image/webp", None),
        (f"{PREVIEW_BASE}/api/media/nyest-hero-portrett.webp", "image/webp", None),
    ]
    
    for url, content_type, min_size in test_cases_e:
        success, msg = test_url(url, content_type, min_size)
        results.append((url, success, msg))
        print(f"{url}")
        print(f"   {msg}")
        print()
        if not success:
            all_passed = False
    
    # SUMMARY
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed_count = sum(1 for _, success, _ in results if success)
    total_count = len(results)
    
    print(f"Total tests: {total_count}")
    print(f"Passed: {passed_count}")
    print(f"Failed: {total_count - passed_count}")
    print()
    
    if all_passed:
        print("✅ ALL TESTS PASSED - PROD IMAGE PROBLEM IS SOLVED")
        print()
        print("CONCLUSION:")
        print("- All previously broken images (nyest-hero-portrett.webp, nyest-interior-2.webp,")
        print("  sarah-portrett.webp) are now returning 200 with correct Content-Type")
        print("- All regression assets still working (deck-desktop.webp, brandfilm-poster.jpg,")
        print("  brandfilm-web.mp4, finn-logo-full.png, airbnb-logo.png, vipps-logo.png)")
        print("- Direct /api/media route working correctly")
        print("- Preview environment still working")
        print("- The upload_public_to_storage.mjs sync was successful")
        print("- No code changes needed - prod is working immediately")
    else:
        print("❌ SOME TESTS FAILED - PROD IMAGE PROBLEM NOT FULLY SOLVED")
        print()
        print("Failed tests:")
        for url, success, msg in results:
            if not success:
                print(f"  - {url}")
                print(f"    {msg}")
    
    print("=" * 80)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
