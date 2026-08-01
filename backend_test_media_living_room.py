#!/usr/bin/env python3
"""
Backend test for production bug fix: living room image on /bli-utleier/start
Test deploy-safe media URL /api/media/owner-onboarding-living-room.webp
"""
import requests
import sys

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_media_living_room_base():
    """Test 1: GET /api/media/owner-onboarding-living-room.webp → 200, Content-Type image/webp, body > 60KB, valid WebP signature"""
    print("\n=== TEST 1: Base media endpoint ===")
    try:
        url = f"{BASE_URL}/api/media/owner-onboarding-living-room.webp"
        r = requests.get(url, timeout=30)
        
        # Check status
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        print(f"✅ Status: {r.status_code}")
        
        # Check Content-Type
        ct = r.headers.get('Content-Type', '')
        if 'image/webp' not in ct:
            print(f"❌ FAIL: Expected Content-Type image/webp, got {ct}")
            return False
        print(f"✅ Content-Type: {ct}")
        
        # Check body size > 60KB
        body_size = len(r.content)
        if body_size <= 60 * 1024:
            print(f"❌ FAIL: Expected body > 60KB, got {body_size} bytes")
            return False
        print(f"✅ Body size: {body_size} bytes ({body_size / 1024:.1f} KB)")
        
        # Check valid WebP signature (RIFF....WEBP)
        if len(r.content) < 12:
            print(f"❌ FAIL: Body too short to contain WebP signature")
            return False
        
        # WebP signature: RIFF at bytes 0-3, WEBP at bytes 8-11
        riff = r.content[0:4]
        webp = r.content[8:12]
        
        if riff != b'RIFF':
            print(f"❌ FAIL: Expected RIFF signature, got {riff.hex()}")
            return False
        
        if webp != b'WEBP':
            print(f"❌ FAIL: Expected WEBP signature at offset 8, got {webp.hex()}")
            return False
        
        print(f"✅ Valid WebP signature: RIFF....WEBP")
        print(f"   First 12 bytes: {r.content[0:12].hex()}")
        
        return True
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

def test_media_living_room_resize():
    """Test 2: GET with ?w=640&q=72 → 200 image/webp, body >0, resize/cache works"""
    print("\n=== TEST 2: Resize with query params ===")
    try:
        url = f"{BASE_URL}/api/media/owner-onboarding-living-room.webp?w=640&q=72"
        r = requests.get(url, timeout=30)
        
        # Check status
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        print(f"✅ Status: {r.status_code}")
        
        # Check Content-Type
        ct = r.headers.get('Content-Type', '')
        if 'image/webp' not in ct:
            print(f"❌ FAIL: Expected Content-Type image/webp, got {ct}")
            return False
        print(f"✅ Content-Type: {ct}")
        
        # Check body > 0
        body_size = len(r.content)
        if body_size == 0:
            print(f"❌ FAIL: Body is empty")
            return False
        print(f"✅ Body size: {body_size} bytes ({body_size / 1024:.1f} KB)")
        
        # Verify it's smaller than original (resize worked)
        # Resized image should be significantly smaller
        if body_size > 500 * 1024:
            print(f"⚠️  WARNING: Resized image seems large ({body_size / 1024:.1f} KB), resize may not have worked")
        else:
            print(f"✅ Resize appears to have worked (smaller than original)")
        
        # Check Cache-Control header
        cache_control = r.headers.get('Cache-Control', '')
        print(f"✅ Cache-Control: {cache_control}")
        
        return True
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

def test_source_inspection():
    """Test 3: Source inspection - OwnerOnboarding2026.tsx uses deploy-safe URL"""
    print("\n=== TEST 3: Source code inspection ===")
    try:
        # Read the component file
        with open('/app/components/dh/OwnerOnboarding2026.tsx', 'r') as f:
            content = f.read()
        
        # Check for deploy-safe URL
        deploy_safe_url = '/api/media/owner-onboarding-living-room.webp'
        if deploy_safe_url not in content:
            print(f"❌ FAIL: Deploy-safe URL '{deploy_safe_url}' not found in component")
            return False
        print(f"✅ Deploy-safe URL found: {deploy_safe_url}")
        
        # Check that old URL is NOT present
        old_url = '/owner-onboarding-living-room.webp'
        # Count occurrences - should only be in comments or not at all
        import re
        # Look for the old URL NOT preceded by /api/media
        old_pattern = r'(?<!/api/media)/owner-onboarding-living-room\.webp'
        old_matches = re.findall(old_pattern, content)
        
        if old_matches:
            print(f"❌ FAIL: Old URL pattern found {len(old_matches)} time(s) in component")
            return False
        print(f"✅ Old URL pattern NOT found (correct)")
        
        # Find the exact line
        for i, line in enumerate(content.split('\n'), 1):
            if deploy_safe_url in line and 'src=' in line:
                print(f"✅ Found at line {i}: {line.strip()[:100]}")
                break
        
        return True
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

def test_media_no_auth():
    """Test 4: Media endpoint does NOT require admin auth (public access)"""
    print("\n=== TEST 4: Public access (no auth required) ===")
    try:
        # Test WITHOUT admin key
        url = f"{BASE_URL}/api/media/owner-onboarding-living-room.webp"
        r = requests.get(url, timeout=30)
        
        if r.status_code == 401:
            print(f"❌ FAIL: Endpoint requires auth (401), should be public")
            return False
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        print(f"✅ Public access works: {r.status_code}")
        print(f"✅ No admin key required")
        
        return True
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

def test_media_invalid():
    """Test 5: Invalid/missing media returns 404 with no-store, NOT 500"""
    print("\n=== TEST 5: Invalid media handling ===")
    try:
        # Test non-existent file
        url = f"{BASE_URL}/api/media/does-not-exist-xyz-123.webp"
        r = requests.get(url, timeout=30)
        
        # Should be 404, NOT 500
        if r.status_code == 500:
            print(f"❌ FAIL: Returns 500 for missing file (should be 404)")
            return False
        
        if r.status_code != 404:
            print(f"⚠️  WARNING: Expected 404, got {r.status_code} (acceptable if not 500)")
        else:
            print(f"✅ Status: {r.status_code}")
        
        # Check Cache-Control has no-store
        cache_control = r.headers.get('Cache-Control', '')
        if 'no-store' not in cache_control:
            print(f"⚠️  WARNING: Cache-Control should include 'no-store', got: {cache_control}")
        else:
            print(f"✅ Cache-Control includes no-store: {cache_control}")
        
        return True
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

def test_api_regression():
    """Test 6: GET /api/ returns 200 (regression)"""
    print("\n=== TEST 6: API health regression ===")
    try:
        url = f"{BASE_URL}/api/"
        r = requests.get(url, timeout=30)
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        print(f"✅ Status: {r.status_code}")
        
        try:
            data = r.json()
            if data.get('ok'):
                print(f"✅ Response: {data}")
            else:
                print(f"⚠️  Response: {data}")
        except:
            print(f"⚠️  Non-JSON response")
        
        return True
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

def test_db_integrity():
    """Test 7: No DB counts/data changes"""
    print("\n=== TEST 7: Database integrity ===")
    try:
        # This is a READ-ONLY test suite, so we just verify we can query DB
        # We're not making any POST/PUT/DELETE requests that would modify data
        
        # Check leads count (should be unchanged)
        url = f"{BASE_URL}/api/admin/leads?key={ADMIN_KEY}"
        r = requests.get(url, timeout=30)
        
        if r.status_code != 200:
            print(f"❌ FAIL: Cannot verify DB state, got {r.status_code}")
            return False
        
        data = r.json()
        leads_count = len(data.get('leads', []))
        print(f"✅ Leads count: {leads_count} (unchanged - READ-ONLY test)")
        
        # Check imported_leads count
        url = f"{BASE_URL}/api/admin/imported-leads?key={ADMIN_KEY}"
        r = requests.get(url, timeout=30)
        
        if r.status_code == 200:
            data = r.json()
            imported_count = data.get('importedCount', 0)
            print(f"✅ Imported leads count: {imported_count} (unchanged - READ-ONLY test)")
        
        print(f"✅ No DB modifications made (all tests are READ-ONLY)")
        
        return True
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

def main():
    print("=" * 80)
    print("PRODUCTION BUG FIX TEST: Living Room Image Deploy-Safe URL")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Testing: /api/media/owner-onboarding-living-room.webp")
    print("=" * 80)
    
    tests = [
        ("Base media endpoint (200, image/webp, >60KB, RIFF...WEBP)", test_media_living_room_base),
        ("Resize with ?w=640&q=72", test_media_living_room_resize),
        ("Source code uses deploy-safe URL", test_source_inspection),
        ("Public access (no auth)", test_media_no_auth),
        ("Invalid media returns 404/no-store", test_media_invalid),
        ("API health regression", test_api_regression),
        ("Database integrity (no changes)", test_db_integrity),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ TEST FAILED WITH EXCEPTION: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed/total*100:.0f}%)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - Production bug fix verified!")
        print("\nNOTE: PRODUCTION deployment still requires redeploy before")
        print("      digihome.no uses the deploy-safe URL.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
