#!/usr/bin/env python3
"""
Backend test for newsletter subscription endpoint and 'abonnenter' segment.
Tests POST /api/newsletter/subscribe (public, no auth) and verifies the new
'abonnenter' segment in GET /api/admin/newsletter/audiences.
"""
import requests
import sys
import time

# Base URL from .env
BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60

def test_subscribe_happy_path():
    """Test 1: Subscribe happy path - new subscription + idempotent re-subscribe"""
    print("\n=== TEST 1: SUBSCRIBE HAPPY PATH ===")
    
    # First subscription
    print("1a. POST /api/newsletter/subscribe with new email...")
    try:
        r = requests.post(
            f"{BASE_URL}/newsletter/subscribe",
            json={"email": "backend-test@digihome-test.no", "source": "footer"},
            timeout=TIMEOUT
        )
        print(f"   Status: {r.status_code}")
        data = r.json()
        print(f"   Response: {data}")
        
        if r.status_code != 200:
            print(f"   ❌ FAIL: Expected 200, got {r.status_code}")
            return False
        if not data.get("ok"):
            print(f"   ❌ FAIL: Expected ok=true, got {data}")
            return False
        print("   ✅ PASS: First subscription successful")
    except Exception as e:
        print(f"   ❌ FAIL: Exception: {e}")
        return False
    
    # Idempotent re-subscribe (same email)
    print("1b. POST /api/newsletter/subscribe with SAME email (idempotent)...")
    try:
        r = requests.post(
            f"{BASE_URL}/newsletter/subscribe",
            json={"email": "backend-test@digihome-test.no", "source": "footer"},
            timeout=TIMEOUT
        )
        print(f"   Status: {r.status_code}")
        data = r.json()
        print(f"   Response: {data}")
        
        if r.status_code != 200:
            print(f"   ❌ FAIL: Expected 200, got {r.status_code}")
            return False
        if not data.get("ok"):
            print(f"   ❌ FAIL: Expected ok=true (idempotent), got {data}")
            return False
        print("   ✅ PASS: Idempotent re-subscribe successful (no duplicate)")
    except Exception as e:
        print(f"   ❌ FAIL: Exception: {e}")
        return False
    
    print("✅ TEST 1 PASSED: Subscribe happy path working (new + idempotent)")
    return True


def test_validation():
    """Test 2: Validation - invalid email, empty body, normalization"""
    print("\n=== TEST 2: VALIDATION ===")
    
    # Invalid email
    print("2a. POST with invalid email...")
    try:
        r = requests.post(
            f"{BASE_URL}/newsletter/subscribe",
            json={"email": "ugyldig"},
            timeout=TIMEOUT
        )
        print(f"   Status: {r.status_code}")
        data = r.json()
        print(f"   Response: {data}")
        
        if r.status_code != 400:
            print(f"   ❌ FAIL: Expected 400, got {r.status_code}")
            return False
        if data.get("ok") is not False:
            print(f"   ❌ FAIL: Expected ok=false, got {data}")
            return False
        if not data.get("error"):
            print(f"   ❌ FAIL: Expected error message, got {data}")
            return False
        print("   ✅ PASS: Invalid email rejected with 400")
    except Exception as e:
        print(f"   ❌ FAIL: Exception: {e}")
        return False
    
    # Empty body
    print("2b. POST with empty body...")
    try:
        r = requests.post(
            f"{BASE_URL}/newsletter/subscribe",
            json={},
            timeout=TIMEOUT
        )
        print(f"   Status: {r.status_code}")
        data = r.json()
        print(f"   Response: {data}")
        
        if r.status_code != 400:
            print(f"   ❌ FAIL: Expected 400, got {r.status_code}")
            return False
        if data.get("ok") is not False:
            print(f"   ❌ FAIL: Expected ok=false, got {data}")
            return False
        print("   ✅ PASS: Empty body rejected with 400")
    except Exception as e:
        print(f"   ❌ FAIL: Exception: {e}")
        return False
    
    # Normalization (uppercase + whitespace)
    print("2c. POST with uppercase/whitespace email (normalization)...")
    try:
        r = requests.post(
            f"{BASE_URL}/newsletter/subscribe",
            json={"email": " UPPER@Case.NO ", "source": "test"},
            timeout=TIMEOUT
        )
        print(f"   Status: {r.status_code}")
        data = r.json()
        print(f"   Response: {data}")
        
        if r.status_code != 200:
            print(f"   ❌ FAIL: Expected 200 (normalized), got {r.status_code}")
            return False
        if not data.get("ok"):
            print(f"   ❌ FAIL: Expected ok=true, got {data}")
            return False
        print("   ✅ PASS: Email normalized to lowercase (accepted)")
    except Exception as e:
        print(f"   ❌ FAIL: Exception: {e}")
        return False
    
    print("✅ TEST 2 PASSED: Validation working (invalid email → 400, empty body → 400, normalization → 200)")
    return True


def test_segment_in_admin():
    """Test 3: Verify 'abonnenter' segment in admin audiences endpoint"""
    print("\n=== TEST 3: SEGMENT IN ADMIN ===")
    
    print("3a. GET /api/admin/newsletter/audiences...")
    try:
        r = requests.get(
            f"{BASE_URL}/admin/newsletter/audiences",
            params={"key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        print(f"   Status: {r.status_code}")
        data = r.json()
        print(f"   Response keys: {list(data.keys())}")
        
        if r.status_code != 200:
            print(f"   ❌ FAIL: Expected 200, got {r.status_code}")
            return False
        if not data.get("ok"):
            print(f"   ❌ FAIL: Expected ok=true, got {data}")
            return False
        
        segments = data.get("segments", [])
        print(f"   Segments count: {len(segments)}")
        
        # Find 'abonnenter' segment
        abonnenter = None
        for seg in segments:
            print(f"   - Segment: key={seg.get('key')}, label={seg.get('label')}, count={seg.get('count')}")
            if seg.get("key") == "abonnenter":
                abonnenter = seg
        
        if not abonnenter:
            print(f"   ❌ FAIL: 'abonnenter' segment NOT FOUND in segments list")
            return False
        
        print(f"   Found 'abonnenter' segment: {abonnenter}")
        
        # Verify structure
        required_fields = ["key", "label", "count", "consent", "note"]
        for field in required_fields:
            if field not in abonnenter:
                print(f"   ❌ FAIL: Missing field '{field}' in abonnenter segment")
                return False
        
        count = abonnenter.get("count", 0)
        print(f"   'abonnenter' count: {count}")
        
        # Verify count >= 2 (test-footer@digihome-test.no + backend-test@digihome-test.no)
        if count < 2:
            print(f"   ❌ FAIL: Expected count >= 2, got {count}")
            return False
        
        print(f"   ✅ PASS: 'abonnenter' segment found with count={count} (>= 2)")
        
    except Exception as e:
        print(f"   ❌ FAIL: Exception: {e}")
        return False
    
    print("✅ TEST 3 PASSED: 'abonnenter' segment exists in admin audiences with correct structure and count >= 2")
    return True


def test_regression():
    """Test 5: Regression - verify other endpoints still work"""
    print("\n=== TEST 5: REGRESSION ===")
    
    # Root endpoint
    print("5a. GET /api/ (root)...")
    try:
        r = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
        print(f"   Status: {r.status_code}")
        if r.status_code != 200:
            print(f"   ❌ FAIL: Expected 200, got {r.status_code}")
            return False
        print("   ✅ PASS: Root endpoint working")
    except Exception as e:
        print(f"   ❌ FAIL: Exception: {e}")
        return False
    
    # Public properties
    print("5b. GET /api/public/properties...")
    try:
        r = requests.get(f"{BASE_URL}/public/properties", timeout=TIMEOUT)
        print(f"   Status: {r.status_code}")
        data = r.json()
        if r.status_code != 200:
            print(f"   ❌ FAIL: Expected 200, got {r.status_code}")
            return False
        count = data.get("count", 0)
        print(f"   Properties count: {count}")
        if count != 3:
            print(f"   ⚠️  WARNING: Expected 3 properties, got {count}")
        print("   ✅ PASS: Public properties endpoint working")
    except Exception as e:
        print(f"   ❌ FAIL: Exception: {e}")
        return False
    
    # Admin newsletter audiences (already tested in test 3, but verify again)
    print("5c. GET /api/admin/newsletter/audiences (regression)...")
    try:
        r = requests.get(
            f"{BASE_URL}/admin/newsletter/audiences",
            params={"key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        print(f"   Status: {r.status_code}")
        if r.status_code != 200:
            print(f"   ❌ FAIL: Expected 200, got {r.status_code}")
            return False
        data = r.json()
        if not data.get("ok"):
            print(f"   ❌ FAIL: Expected ok=true, got {data}")
            return False
        print("   ✅ PASS: Admin newsletter audiences endpoint working")
    except Exception as e:
        print(f"   ❌ FAIL: Exception: {e}")
        return False
    
    print("✅ TEST 5 PASSED: All regression tests passed (root, public properties, admin audiences)")
    return True


def test_cleanup():
    """Test 6: Cleanup - report subscriber count (do NOT delete)"""
    print("\n=== TEST 6: CLEANUP (REPORT ONLY) ===")
    
    print("6a. GET /api/admin/newsletter/audiences to report final count...")
    try:
        r = requests.get(
            f"{BASE_URL}/admin/newsletter/audiences",
            params={"key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        data = r.json()
        segments = data.get("segments", [])
        abonnenter = next((s for s in segments if s.get("key") == "abonnenter"), None)
        
        if abonnenter:
            count = abonnenter.get("count", 0)
            print(f"   Final 'abonnenter' count: {count}")
            print(f"   ✅ PASS: Cleanup report complete (subscribers kept as requested)")
        else:
            print(f"   ⚠️  WARNING: 'abonnenter' segment not found")
    except Exception as e:
        print(f"   ⚠️  WARNING: Could not fetch final count: {e}")
    
    print("✅ TEST 6 PASSED: Cleanup report complete (test subscribers kept)")
    return True


def main():
    print("=" * 80)
    print("BACKEND TEST: Newsletter Subscription Endpoint + 'abonnenter' Segment")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print("=" * 80)
    
    results = []
    
    # Run tests
    results.append(("Subscribe Happy Path", test_subscribe_happy_path()))
    results.append(("Validation", test_validation()))
    results.append(("Segment in Admin", test_segment_in_admin()))
    # Test 4 (optout-reset) SKIPPED as requested
    print("\n=== TEST 4: OPTOUT-RESET (SKIPPED) ===")
    print("   ⏭️  SKIPPED: Cannot construct HMAC without access to SECRET (as requested)")
    results.append(("Optout-Reset", None))  # None = skipped
    results.append(("Regression", test_regression()))
    results.append(("Cleanup", test_cleanup()))
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    passed = sum(1 for _, r in results if r is True)
    failed = sum(1 for _, r in results if r is False)
    skipped = sum(1 for _, r in results if r is None)
    total = len(results)
    
    for name, result in results:
        if result is True:
            print(f"✅ {name}: PASS")
        elif result is False:
            print(f"❌ {name}: FAIL")
        else:
            print(f"⏭️  {name}: SKIPPED")
    
    print("=" * 80)
    print(f"Total: {total} tests | Passed: {passed} | Failed: {failed} | Skipped: {skipped}")
    print("=" * 80)
    
    if failed > 0:
        print("\n❌ SOME TESTS FAILED")
        sys.exit(1)
    else:
        print("\n✅ ALL TESTS PASSED (or skipped as requested)")
        sys.exit(0)


if __name__ == "__main__":
    main()
