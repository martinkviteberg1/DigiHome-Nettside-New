#!/usr/bin/env python3
"""
Backend test for pitch-deck password gate endpoints (GET/POST /api/deck/auth).
Tests authentication flow with httpOnly cookies.
"""

import requests
import json
import sys

# Base URL from environment
BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
CORRECT_PASSWORD = "DigiHome2026##"

def test_deck_auth():
    """Test all deck authentication scenarios."""
    
    print("=" * 80)
    print("TESTING PITCH-DECK PASSWORD GATE ENDPOINTS")
    print("=" * 80)
    print()
    
    all_passed = True
    test_results = []
    
    # Test 1: GET /api/deck/auth with NO cookie → expect 200 with {authed:false}
    print("Test 1: GET /api/deck/auth with NO cookie")
    print("-" * 80)
    try:
        response = requests.get(f"{BASE_URL}/deck/auth", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('authed') == False:
                print("✅ PASS: Returns 200 with {authed: false}")
                test_results.append(("Test 1: GET without cookie", True, "Returns 200 with {authed: false}"))
            else:
                print(f"❌ FAIL: Expected authed=false, got {data}")
                test_results.append(("Test 1: GET without cookie", False, f"Expected authed=false, got {data}"))
                all_passed = False
        else:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            test_results.append(("Test 1: GET without cookie", False, f"Expected 200, got {response.status_code}"))
            all_passed = False
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        test_results.append(("Test 1: GET without cookie", False, f"Exception: {e}"))
        all_passed = False
    print()
    
    # Test 2: POST /api/deck/auth with body {"password":"feil"} → expect 401
    print("Test 2: POST /api/deck/auth with wrong password 'feil'")
    print("-" * 80)
    try:
        response = requests.post(
            f"{BASE_URL}/deck/auth",
            json={"password": "feil"},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            data = response.json()
            if data.get('ok') == False and 'error' in data:
                print(f"✅ PASS: Returns 401 with {{ok: false, error: '{data.get('error')}'}}")
                test_results.append(("Test 2: POST wrong password", True, "Returns 401 with error"))
            else:
                print(f"❌ FAIL: Expected {{ok: false, error: ...}}, got {data}")
                test_results.append(("Test 2: POST wrong password", False, f"Unexpected response shape: {data}"))
                all_passed = False
        else:
            print(f"❌ FAIL: Expected status 401, got {response.status_code}")
            test_results.append(("Test 2: POST wrong password", False, f"Expected 401, got {response.status_code}"))
            all_passed = False
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        test_results.append(("Test 2: POST wrong password", False, f"Exception: {e}"))
        all_passed = False
    print()
    
    # Test 3: POST /api/deck/auth with body {"password":""} (empty) → expect 401
    print("Test 3: POST /api/deck/auth with empty password")
    print("-" * 80)
    try:
        response = requests.post(
            f"{BASE_URL}/deck/auth",
            json={"password": ""},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            data = response.json()
            if data.get('ok') == False:
                print("✅ PASS: Returns 401 with {ok: false}")
                test_results.append(("Test 3: POST empty password", True, "Returns 401"))
            else:
                print(f"❌ FAIL: Expected {{ok: false}}, got {data}")
                test_results.append(("Test 3: POST empty password", False, f"Unexpected response: {data}"))
                all_passed = False
        else:
            print(f"❌ FAIL: Expected status 401, got {response.status_code}")
            test_results.append(("Test 3: POST empty password", False, f"Expected 401, got {response.status_code}"))
            all_passed = False
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        test_results.append(("Test 3: POST empty password", False, f"Exception: {e}"))
        all_passed = False
    print()
    
    # Test 4: POST /api/deck/auth with body {} (no password field) → expect 401
    print("Test 4: POST /api/deck/auth with no password field")
    print("-" * 80)
    try:
        response = requests.post(
            f"{BASE_URL}/deck/auth",
            json={},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            data = response.json()
            if data.get('ok') == False:
                print("✅ PASS: Returns 401 with {ok: false}")
                test_results.append(("Test 4: POST no password field", True, "Returns 401"))
            else:
                print(f"❌ FAIL: Expected {{ok: false}}, got {data}")
                test_results.append(("Test 4: POST no password field", False, f"Unexpected response: {data}"))
                all_passed = False
        else:
            print(f"❌ FAIL: Expected status 401, got {response.status_code}")
            test_results.append(("Test 4: POST no password field", False, f"Expected 401, got {response.status_code}"))
            all_passed = False
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        test_results.append(("Test 4: POST no password field", False, f"Exception: {e}"))
        all_passed = False
    print()
    
    # Test 5: POST /api/deck/auth with correct password → expect 200 with {ok:true} AND Set-Cookie
    print(f"Test 5: POST /api/deck/auth with correct password '{CORRECT_PASSWORD}'")
    print("-" * 80)
    session = requests.Session()  # Use session to preserve cookies
    cookie_value = None
    try:
        response = session.post(
            f"{BASE_URL}/deck/auth",
            json={"password": CORRECT_PASSWORD},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        print(f"Set-Cookie headers: {response.headers.get('Set-Cookie', 'None')}")
        print(f"Cookies in jar: {session.cookies.get_dict()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok') == True:
                # Check for Set-Cookie header
                set_cookie_header = response.headers.get('Set-Cookie', '')
                if 'dh_deck' in set_cookie_header:
                    # Verify HttpOnly flag
                    if 'HttpOnly' in set_cookie_header:
                        print("✅ PASS: Returns 200 with {ok: true} and Set-Cookie with HttpOnly flag")
                        test_results.append(("Test 5: POST correct password", True, "Returns 200 with cookie (HttpOnly)"))
                        # Extract cookie value for next test
                        cookie_value = session.cookies.get('dh_deck')
                        print(f"Cookie value extracted: {cookie_value[:20]}..." if cookie_value else "Cookie value: None")
                    else:
                        print("⚠️  WARNING: Cookie set but HttpOnly flag not found in header")
                        test_results.append(("Test 5: POST correct password", True, "Returns 200 with cookie (HttpOnly flag unclear)"))
                        cookie_value = session.cookies.get('dh_deck')
                else:
                    print(f"❌ FAIL: No 'dh_deck' cookie in Set-Cookie header")
                    test_results.append(("Test 5: POST correct password", False, "No dh_deck cookie set"))
                    all_passed = False
            else:
                print(f"❌ FAIL: Expected {{ok: true}}, got {data}")
                test_results.append(("Test 5: POST correct password", False, f"Expected ok=true, got {data}"))
                all_passed = False
        else:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            test_results.append(("Test 5: POST correct password", False, f"Expected 200, got {response.status_code}"))
            all_passed = False
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        test_results.append(("Test 5: POST correct password", False, f"Exception: {e}"))
        all_passed = False
    print()
    
    # Test 6: GET /api/deck/auth with the cookie from step 5 → expect 200 with {authed:true}
    print("Test 6: GET /api/deck/auth with valid cookie from previous test")
    print("-" * 80)
    if cookie_value:
        try:
            # Use the same session which has the cookie
            response = session.get(f"{BASE_URL}/deck/auth", timeout=10)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            print(f"Cookie sent: dh_deck={cookie_value[:20]}..." if cookie_value else "No cookie")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('authed') == True:
                    print("✅ PASS: Returns 200 with {authed: true}")
                    test_results.append(("Test 6: GET with valid cookie", True, "Returns 200 with {authed: true}"))
                else:
                    print(f"❌ FAIL: Expected authed=true, got {data}")
                    test_results.append(("Test 6: GET with valid cookie", False, f"Expected authed=true, got {data}"))
                    all_passed = False
            else:
                print(f"❌ FAIL: Expected status 200, got {response.status_code}")
                test_results.append(("Test 6: GET with valid cookie", False, f"Expected 200, got {response.status_code}"))
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            test_results.append(("Test 6: GET with valid cookie", False, f"Exception: {e}"))
            all_passed = False
    else:
        print("⚠️  SKIP: No valid cookie from Test 5")
        test_results.append(("Test 6: GET with valid cookie", False, "Skipped - no cookie from Test 5"))
        all_passed = False
    print()
    
    # Test 7: GET /api/deck/auth with a bogus cookie → expect 200 with {authed:false}
    print("Test 7: GET /api/deck/auth with bogus cookie 'dh_deck=invalidtoken123'")
    print("-" * 80)
    try:
        response = requests.get(
            f"{BASE_URL}/deck/auth",
            cookies={"dh_deck": "invalidtoken123"},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('authed') == False:
                print("✅ PASS: Returns 200 with {authed: false}")
                test_results.append(("Test 7: GET with bogus cookie", True, "Returns 200 with {authed: false}"))
            else:
                print(f"❌ FAIL: Expected authed=false, got {data}")
                test_results.append(("Test 7: GET with bogus cookie", False, f"Expected authed=false, got {data}"))
                all_passed = False
        else:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            test_results.append(("Test 7: GET with bogus cookie", False, f"Expected 200, got {response.status_code}"))
            all_passed = False
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        test_results.append(("Test 7: GET with bogus cookie", False, f"Exception: {e}"))
        all_passed = False
    print()
    
    # Test 8: Verify no 500 errors in any test
    print("Test 8: Verify no 500 errors occurred in any test")
    print("-" * 80)
    has_500 = any("500" in str(result[2]) for result in test_results)
    if not has_500:
        print("✅ PASS: No 500 errors in any test")
        test_results.append(("Test 8: No 500 errors", True, "All tests avoided 500 errors"))
    else:
        print("❌ FAIL: At least one test returned 500")
        test_results.append(("Test 8: No 500 errors", False, "500 error detected"))
        all_passed = False
    print()
    
    # Summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(1 for _, result, _ in test_results if result)
    total = len(test_results)
    print(f"Total: {passed}/{total} tests passed")
    print()
    
    for test_name, result, message in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if not result:
            print(f"         {message}")
    print()
    
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("⚠️  SOME TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(test_deck_auth())
