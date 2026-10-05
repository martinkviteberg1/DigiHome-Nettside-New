#!/usr/bin/env python3
"""
Backend test for SAMARBEID-DECK passordgate: GET/POST /api/samarbeid/auth

Tests the password-protected samarbeid deck authentication endpoints.
Follows TESTPLAN steps (1)–(6) from task status_history.

CRITICAL SAFETY RULES:
- No MongoDB writes (read-only test)
- No cleanup necessary
- Tests only backend auth endpoints and basic page availability
"""

import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/.env')

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
DECK_PASSWORD_RAW = os.getenv('SAMARBEID_PASSWORD', '')  # eget secret for /samarbeid – ingen fallback til DECK_PASSWORD
# Strip quotes from password (as per test instructions)
DECK_PASSWORD = DECK_PASSWORD_RAW.strip('"').strip("'")

print(f"=== SAMARBEID-DECK PASSORDGATE TEST ===")
print(f"Base URL: {BASE_URL}")
print("Password configured:", "yes" if DECK_PASSWORD else "no")
print()

# Test results tracking
tests_passed = 0
tests_failed = 0

def test_step(step_num, description):
    """Print test step header"""
    print(f"\n{'='*80}")
    print(f"STEP {step_num}: {description}")
    print('='*80)

def assert_status(response, expected_status, step_name):
    """Assert HTTP status code"""
    global tests_passed, tests_failed
    if response.status_code == expected_status:
        print(f"✅ {step_name}: Status {response.status_code} (expected {expected_status})")
        tests_passed += 1
        return True
    else:
        print(f"❌ {step_name}: Status {response.status_code} (expected {expected_status})")
        tests_failed += 1
        return False

def assert_json_field(data, field, expected_value, step_name):
    """Assert JSON field value"""
    global tests_passed, tests_failed
    actual = data.get(field)
    if actual == expected_value:
        print(f"✅ {step_name}: {field}={actual} (expected {expected_value})")
        tests_passed += 1
        return True
    else:
        print(f"❌ {step_name}: {field}={actual} (expected {expected_value})")
        tests_failed += 1
        return False

def print_cookie_attributes(response, cookie_name):
    """Print Set-Cookie attributes"""
    set_cookie_header = response.headers.get('Set-Cookie', '')
    print(f"\nSet-Cookie header: {set_cookie_header}")
    
    # Parse cookie attributes
    if cookie_name in set_cookie_header:
        parts = set_cookie_header.split(';')
        print(f"\nCookie attributes for '{cookie_name}':")
        for part in parts:
            part = part.strip()
            print(f"  - {part}")
        
        # Check specific attributes
        has_httponly = 'HttpOnly' in set_cookie_header
        has_samesite = 'SameSite' in set_cookie_header
        has_path = 'Path=/' in set_cookie_header
        has_maxage = 'Max-Age' in set_cookie_header
        
        print(f"\nAttribute checks:")
        print(f"  HttpOnly: {'✅ Present' if has_httponly else '❌ Missing'}")
        print(f"  SameSite: {'✅ Present' if has_samesite else '❌ Missing'}")
        print(f"  Path=/: {'✅ Present' if has_path else '❌ Missing'}")
        print(f"  Max-Age: {'✅ Present' if has_maxage else '❌ Missing'}")
        
        # Extract Max-Age value
        if has_maxage:
            for part in parts:
                if 'Max-Age' in part:
                    print(f"  Max-Age value: {part.strip()}")
        
        # Extract SameSite value
        if has_samesite:
            for part in parts:
                if 'SameSite' in part:
                    print(f"  SameSite value: {part.strip()}")

try:
    # ========================================================================
    # STEP 1: GET /api/samarbeid/auth without cookie → 200 {authed:false}
    # ========================================================================
    test_step(1, "GET /api/samarbeid/auth without cookie → 200 {authed:false}")
    
    response = requests.get(f"{BASE_URL}/api/samarbeid/auth", timeout=10)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    assert_status(response, 200, "Step 1 status")
    
    if response.status_code == 200:
        data = response.json()
        assert_json_field(data, 'authed', False, "Step 1 authed field")
    
    # ========================================================================
    # STEP 2: POST /api/samarbeid/auth {password:'feil'} → 401 {ok:false}
    # ========================================================================
    test_step(2, "POST /api/samarbeid/auth with wrong password → 401 {ok:false}")
    
    response = requests.post(
        f"{BASE_URL}/api/samarbeid/auth",
        json={"password": "feil"},
        timeout=10
    )
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    assert_status(response, 401, "Step 2 status")
    
    if response.status_code == 401:
        data = response.json()
        assert_json_field(data, 'ok', False, "Step 2 ok field")
    
    # ========================================================================
    # STEP 3: POST with correct password → 200 {ok:true} + Set-Cookie
    # ========================================================================
    test_step(3, f"POST /api/samarbeid/auth with correct password → 200 {{ok:true}} + Set-Cookie")
    
    response = requests.post(
        f"{BASE_URL}/api/samarbeid/auth",
        json={"password": DECK_PASSWORD},
        timeout=10
    )
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    assert_status(response, 200, "Step 3 status")
    
    if response.status_code == 200:
        data = response.json()
        assert_json_field(data, 'ok', True, "Step 3 ok field")
        
        # Print and check Set-Cookie attributes
        print_cookie_attributes(response, 'dh_samarbeid')
        
        # Extract cookie for next test
        cookie_value = None
        if 'dh_samarbeid' in response.cookies:
            cookie_value = response.cookies['dh_samarbeid']
            print(f"\n✅ Cookie 'dh_samarbeid' extracted: {cookie_value[:20]}...")
        else:
            print(f"\n❌ Cookie 'dh_samarbeid' not found in response.cookies")
    
    # ========================================================================
    # STEP 4: GET with cookie → {authed:true}
    # ========================================================================
    test_step(4, "GET /api/samarbeid/auth with valid cookie → {authed:true}")
    
    if cookie_value:
        response = requests.get(
            f"{BASE_URL}/api/samarbeid/auth",
            cookies={"dh_samarbeid": cookie_value},
            timeout=10
        )
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        assert_status(response, 200, "Step 4 status")
        
        if response.status_code == 200:
            data = response.json()
            assert_json_field(data, 'authed', True, "Step 4 authed field")
    else:
        print("❌ Skipping Step 4: No cookie from Step 3")
        tests_failed += 1
    
    # ========================================================================
    # STEP 5: POST without body / empty password → 401
    # ========================================================================
    test_step(5, "POST /api/samarbeid/auth without body → 401")
    
    # Test 5a: POST without body
    response = requests.post(
        f"{BASE_URL}/api/samarbeid/auth",
        timeout=10
    )
    print(f"Response status (no body): {response.status_code}")
    print(f"Response body: {response.text}")
    
    assert_status(response, 401, "Step 5a status (no body)")
    
    # Test 5b: POST with empty password
    response = requests.post(
        f"{BASE_URL}/api/samarbeid/auth",
        json={"password": ""},
        timeout=10
    )
    print(f"\nResponse status (empty password): {response.status_code}")
    print(f"Response body: {response.text}")
    
    assert_status(response, 401, "Step 5b status (empty password)")
    
    # ========================================================================
    # STEP 6: Pages GET /samarbeid, /samarbeid/tilbudet, /samarbeid?print=1 → 200 (HTML)
    # ========================================================================
    test_step(6, "GET samarbeid pages → 200 (HTML)")
    
    pages = [
        "/samarbeid",
        "/samarbeid/tilbudet",
        "/samarbeid?print=1"
    ]
    
    for page in pages:
        response = requests.get(f"{BASE_URL}{page}", timeout=10)
        print(f"\nPage: {page}")
        print(f"Response status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'N/A')}")
        print(f"Content length: {len(response.content)} bytes")
        
        # Check status
        if assert_status(response, 200, f"Step 6 {page} status"):
            # Check if it's HTML
            content_type = response.headers.get('Content-Type', '')
            if 'text/html' in content_type:
                print(f"✅ Content-Type is HTML")
                tests_passed += 1
            else:
                print(f"❌ Content-Type is not HTML: {content_type}")
                tests_failed += 1

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    tests_failed += 1

# ========================================================================
# SUMMARY
# ========================================================================
print(f"\n{'='*80}")
print(f"TEST SUMMARY")
print('='*80)
print(f"Tests passed: {tests_passed}")
print(f"Tests failed: {tests_failed}")
print(f"Total tests: {tests_passed + tests_failed}")

if tests_failed == 0:
    print(f"\n✅ ALL TESTS PASSED")
    sys.exit(0)
else:
    print(f"\n❌ SOME TESTS FAILED")
    sys.exit(1)
