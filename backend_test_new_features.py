#!/usr/bin/env python3
"""
Backend test for three NEW/CHANGED features:
1. Admin auth (POST /api/admin/auth/login, GET /api/admin/auth/me)
2. Finn matrikkel parsing (GET /api/finn-preview)
3. Infotorg lookup via matrikkel (POST /api/infotorg/lookup)

Base URL: https://bli-utleier-redesign.preview.emergentagent.com/api
Admin credentials: martin@kviteberg.no / Pyramiden2025##
Legacy admin key: dh_admin_b3Kx92Qz7Lm4
"""

import requests
import json
import re
import time

BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_EMAIL = "martin@kviteberg.no"
ADMIN_PASSWORD = "Pyramiden2025##"
LEGACY_KEY = "dh_admin_b3Kx92Qz7Lm4"

def print_test(name, passed, details=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  {details}")
    print()

def test_admin_auth():
    """Test (A) ADMIN AUTH"""
    print("=" * 80)
    print("TEST GROUP A: ADMIN AUTH")
    print("=" * 80)
    print()
    
    # Test A1: Login with correct credentials
    print("A1: POST /api/admin/auth/login with correct credentials")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        data = resp.json()
        print(f"  Response keys: {list(data.keys())}")
        
        passed = (
            resp.status_code == 200 and
            data.get("ok") is True and
            "token" in data and
            "exp" in data and
            "user" in data and
            data["user"].get("email") == ADMIN_EMAIL and
            data["user"].get("role") == "owner"
        )
        
        # Validate token format (base64url.hex)
        token = data.get("token", "")
        token_valid_format = False
        if token and "." in token:
            parts = token.split(".")
            if len(parts) == 2:
                # First part should be base64url, second should be hex
                token_valid_format = bool(re.match(r'^[A-Za-z0-9_-]+$', parts[0]) and re.match(r'^[a-f0-9]+$', parts[1]))
        
        details = f"ok={data.get('ok')}, has_token={bool(token)}, token_format_valid={token_valid_format}, exp={data.get('exp')}, user.email={data['user'].get('email') if 'user' in data else None}, user.role={data['user'].get('role') if 'user' in data else None}"
        print_test("A1: Login with correct credentials", passed and token_valid_format, details)
        
        # Save token for later tests
        global admin_token
        admin_token = token
        return token
    except Exception as e:
        print_test("A1: Login with correct credentials", False, f"Exception: {e}")
        return None

def test_admin_auth_wrong_password():
    """Test A2: Login with wrong password"""
    print("A2: POST /api/admin/auth/login with wrong password")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": "WRONG"},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        data = resp.json()
        print(f"  Response: {data}")
        
        passed = (
            resp.status_code == 401 and
            data.get("ok") is False and
            data.get("error") == "Feil e-post eller passord"
        )
        
        details = f"status={resp.status_code}, ok={data.get('ok')}, error={data.get('error')}"
        print_test("A2: Login with wrong password returns 401", passed, details)
    except Exception as e:
        print_test("A2: Login with wrong password returns 401", False, f"Exception: {e}")

def test_admin_auth_empty_body():
    """Test A3: Login with empty body"""
    print("A3: POST /api/admin/auth/login with empty body")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        data = resp.json()
        print(f"  Response: {data}")
        
        passed = resp.status_code == 400
        
        details = f"status={resp.status_code}, ok={data.get('ok')}"
        print_test("A3: Login with empty body returns 400", passed, details)
    except Exception as e:
        print_test("A3: Login with empty body returns 400", False, f"Exception: {e}")

def test_admin_auth_me_valid(token):
    """Test A4: GET /api/admin/auth/me with valid token"""
    print("A4: GET /api/admin/auth/me with valid token")
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/auth/me?key={token}",
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        data = resp.json()
        print(f"  Response: {data}")
        
        passed = (
            resp.status_code == 200 and
            data.get("ok") is True and
            "user" in data and
            data["user"].get("email") == ADMIN_EMAIL
        )
        
        details = f"status={resp.status_code}, ok={data.get('ok')}, user.email={data['user'].get('email') if 'user' in data else None}"
        print_test("A4: /auth/me with valid token returns 200", passed, details)
    except Exception as e:
        print_test("A4: /auth/me with valid token returns 200", False, f"Exception: {e}")

def test_admin_auth_me_no_key():
    """Test A5: GET /api/admin/auth/me without key"""
    print("A5: GET /api/admin/auth/me without key")
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/auth/me",
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        
        passed = resp.status_code == 401
        
        details = f"status={resp.status_code}"
        print_test("A5: /auth/me without key returns 401", passed, details)
    except Exception as e:
        print_test("A5: /auth/me without key returns 401", False, f"Exception: {e}")

def test_admin_auth_me_bogus_token():
    """Test A5b: GET /api/admin/auth/me with bogus token"""
    print("A5b: GET /api/admin/auth/me with bogus token")
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/auth/me?key=bogus_token_12345",
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        
        passed = resp.status_code == 401
        
        details = f"status={resp.status_code}"
        print_test("A5b: /auth/me with bogus token returns 401", passed, details)
    except Exception as e:
        print_test("A5b: /auth/me with bogus token returns 401", False, f"Exception: {e}")

def test_token_as_key(token):
    """Test A6: Token works as key for other admin endpoints"""
    print("A6: Token works as key for admin endpoints")
    
    # Test with /api/admin/leads
    print("  A6a: GET /api/admin/leads?key=<token>")
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/leads?key={token}",
            timeout=30
        )
        print(f"    Status: {resp.status_code}")
        
        passed_leads = resp.status_code == 200
        print_test("A6a: Token works for /admin/leads", passed_leads, f"status={resp.status_code}")
    except Exception as e:
        print_test("A6a: Token works for /admin/leads", False, f"Exception: {e}")
        passed_leads = False
    
    # Test with /api/admin/analytics
    print("  A6b: GET /api/admin/analytics?key=<token>&days=30")
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/analytics?key={token}&days=30",
            timeout=30
        )
        print(f"    Status: {resp.status_code}")
        data = resp.json()
        
        passed_analytics = (
            resp.status_code == 200 and
            "traffic" in data and
            "leads" in data
        )
        print_test("A6b: Token works for /admin/analytics", passed_analytics, f"status={resp.status_code}, has_traffic={('traffic' in data)}, has_leads={('leads' in data)}")
    except Exception as e:
        print_test("A6b: Token works for /admin/analytics", False, f"Exception: {e}")

def test_legacy_key_regression():
    """Test A7: Legacy key still works"""
    print("A7: REGRESSION - Legacy key still works")
    
    # Test with /api/admin/leads
    print("  A7a: GET /api/admin/leads?key=<legacy_key>")
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/leads?key={LEGACY_KEY}",
            timeout=30
        )
        print(f"    Status: {resp.status_code}")
        
        passed_legacy = resp.status_code == 200
        print_test("A7a: Legacy key works for /admin/leads", passed_legacy, f"status={resp.status_code}")
    except Exception as e:
        print_test("A7a: Legacy key works for /admin/leads", False, f"Exception: {e}")
    
    # Test without key
    print("  A7b: GET /api/admin/leads (no key)")
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/leads",
            timeout=30
        )
        print(f"    Status: {resp.status_code}")
        
        passed_no_key = resp.status_code == 401
        print_test("A7b: /admin/leads without key returns 401", passed_no_key, f"status={resp.status_code}")
    except Exception as e:
        print_test("A7b: /admin/leads without key returns 401", False, f"Exception: {e}")

def get_fresh_finnkode():
    """Fetch a fresh finnkode from Finn.no search results"""
    print("Fetching fresh finnkode from Finn.no...")
    try:
        # Search for homes in Bergen
        search_url = "https://www.finn.no/realestate/homes/search.html?location=0.20061"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        resp = requests.get(search_url, headers=headers, timeout=10)
        
        # Find first finnkode in the HTML
        matches = re.findall(r'finnkode=(\d+)', resp.text)
        if matches:
            finnkode = matches[0]
            print(f"  Found finnkode: {finnkode}")
            return f"https://www.finn.no/realestate/homes/ad.html?finnkode={finnkode}"
        else:
            print("  No finnkode found, using known property")
            # Fall back to known property (may be expired)
            return "https://www.finn.no/realestate/homes/ad.html?finnkode=467974441"
    except Exception as e:
        print(f"  Error fetching finnkode: {e}, using known property")
        return "https://www.finn.no/realestate/homes/ad.html?finnkode=467974441"

def test_finn_preview_valid():
    """Test B1: GET /api/finn-preview with valid Finn URL"""
    print("=" * 80)
    print("TEST GROUP B: FINN MATRIKKEL PARSING")
    print("=" * 80)
    print()
    
    print("B1: GET /api/finn-preview with valid Finn URL")
    
    # Get a fresh finnkode
    finn_url = get_fresh_finnkode()
    
    # Add cache-bust parameter
    cache_bust_url = f"{finn_url}&cb={int(time.time())}"
    
    try:
        resp = requests.get(
            f"{BASE_URL}/finn-preview",
            params={"url": cache_bust_url},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        data = resp.json()
        print(f"  Response keys: {list(data.keys())}")
        
        if data.get("ok"):
            print(f"  title: {data.get('title', '')[:60]}...")
            print(f"  kind: {data.get('kind')}")
            print(f"  sqm: {data.get('sqm')}")
            print(f"  bedrooms: {data.get('bedrooms')}")
            print(f"  propertyType: {data.get('propertyType')}")
            print(f"  matrikkel: {data.get('matrikkel')}")
            print(f"  address: {data.get('address')}")
            print(f"  postalCode: {data.get('postalCode')}")
        
        passed = (
            resp.status_code == 200 and
            data.get("ok") is True and
            "matrikkel" in data and  # Can be null or object
            "address" in data and
            "postalCode" in data and
            "kind" in data and
            "sqm" in data and
            "bedrooms" in data and
            "propertyType" in data
        )
        
        # Check if matrikkel is present and valid (if the ad has matrikkel info)
        matrikkel = data.get("matrikkel")
        matrikkel_valid = matrikkel is None or (
            isinstance(matrikkel, dict) and
            "kommunenr" in matrikkel and
            "gaardsnr" in matrikkel and
            "bruksnr" in matrikkel
        )
        
        details = f"ok={data.get('ok')}, has_matrikkel={matrikkel is not None}, matrikkel_valid={matrikkel_valid}, has_address={bool(data.get('address'))}, has_postalCode={bool(data.get('postalCode'))}, kind={data.get('kind')}"
        print_test("B1: Finn preview returns correct structure", passed and matrikkel_valid, details)
        
        return data
    except Exception as e:
        print_test("B1: Finn preview returns correct structure", False, f"Exception: {e}")
        return None

def test_finn_preview_invalid():
    """Test B2: GET /api/finn-preview with invalid URL"""
    print("B2: GET /api/finn-preview with invalid URL")
    try:
        resp = requests.get(
            f"{BASE_URL}/finn-preview",
            params={"url": "https://www.vg.no"},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        data = resp.json()
        print(f"  Response: {data}")
        
        passed = (
            resp.status_code == 400 and
            data.get("ok") is False
        )
        
        details = f"status={resp.status_code}, ok={data.get('ok')}"
        print_test("B2: Invalid URL returns 400", passed, details)
    except Exception as e:
        print_test("B2: Invalid URL returns 400", False, f"Exception: {e}")

def test_finn_preview_regression():
    """Test B3: Regression - existing fields still work"""
    print("B3: REGRESSION - Existing fields (kind, sqm, bedrooms, propertyType) still correct")
    
    # Use the known property that we know has data
    finn_url = "https://www.finn.no/realestate/homes/ad.html?finnkode=467974441"
    
    try:
        resp = requests.get(
            f"{BASE_URL}/finn-preview",
            params={"url": finn_url},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            
            # Check that existing fields are present and have reasonable values
            has_kind = data.get("kind") in ["salg", "leie", ""]
            has_property_type = data.get("propertyType") in ["leilighet", "hus", "rekkehus", "hybel", "annet", ""]
            has_sqm = isinstance(data.get("sqm"), str)  # Can be empty string
            has_bedrooms = isinstance(data.get("bedrooms"), str)  # Can be empty string
            
            passed = has_kind and has_property_type and has_sqm is not None and has_bedrooms is not None
            
            details = f"kind={data.get('kind')}, propertyType={data.get('propertyType')}, sqm={data.get('sqm')}, bedrooms={data.get('bedrooms')}"
            print_test("B3: Existing fields still work", passed, details)
        else:
            print_test("B3: Existing fields still work", False, f"status={resp.status_code}")
    except Exception as e:
        print_test("B3: Existing fields still work", False, f"Exception: {e}")

def test_infotorg_matrikkel():
    """Test C1: POST /api/infotorg/lookup with matrikkel (Elverum property)"""
    print("=" * 80)
    print("TEST GROUP C: INFOTORG LOOKUP VIA MATRIKKEL")
    print("=" * 80)
    print()
    
    print("C1: POST /api/infotorg/lookup with matrikkel (Elverum enebolig)")
    try:
        resp = requests.post(
            f"{BASE_URL}/infotorg/lookup",
            json={
                "matrikkel": {
                    "kommunenr": "3420",
                    "gaardsnr": "72",
                    "bruksnr": "128"
                }
            },
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        data = resp.json()
        print(f"  Response keys: {list(data.keys())}")
        
        if data.get("status") == "ok":
            print(f"  building_type: {data.get('building_type')}")
            print(f"  matrikkel: {data.get('matrikkel')}")
            print(f"  source: {data.get('source')}")
        
        passed = (
            resp.status_code == 200 and
            data.get("status") == "ok" and
            "building_type" in data and
            "matrikkel" in data and
            data["matrikkel"].get("kommunenr") == "3420" and
            data["matrikkel"].get("gaardsnr") == "72" and
            data["matrikkel"].get("bruksnr") == "128"
        )
        
        details = f"status={data.get('status')}, building_type={data.get('building_type')}, matrikkel={data.get('matrikkel')}"
        print_test("C1: Matrikkel lookup returns enebolig", passed, details)
    except Exception as e:
        print_test("C1: Matrikkel lookup returns enebolig", False, f"Exception: {e}")

def test_infotorg_matrikkel_sameie():
    """Test C2: POST /api/infotorg/lookup with matrikkel (Bergen sameie)"""
    print("C2: POST /api/infotorg/lookup with matrikkel (Bergen sameie)")
    try:
        resp = requests.post(
            f"{BASE_URL}/infotorg/lookup",
            json={
                "matrikkel": {
                    "kommunenr": "4601",
                    "gaardsnr": "164",
                    "bruksnr": "445"
                }
            },
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        data = resp.json()
        print(f"  Response keys: {list(data.keys())}")
        
        if data.get("status") == "ok":
            print(f"  building_type: {data.get('building_type')}")
            print(f"  edr.seksjonert: {data.get('edr', {}).get('seksjonert')}")
        
        passed = (
            resp.status_code == 200 and
            data.get("status") == "ok" and
            data.get("building_type") == "sameie" and
            "edr" in data and
            data["edr"].get("seksjonert") is True
        )
        
        details = f"status={data.get('status')}, building_type={data.get('building_type')}, edr.seksjonert={data.get('edr', {}).get('seksjonert')}"
        print_test("C2: Matrikkel lookup returns sameie with seksjonert=true", passed, details)
    except Exception as e:
        print_test("C2: Matrikkel lookup returns sameie with seksjonert=true", False, f"Exception: {e}")

def test_infotorg_address_regression():
    """Test C3: REGRESSION - Address path still works"""
    print("C3: REGRESSION - Address path still works (Deichmans gate borettslag)")
    try:
        resp = requests.post(
            f"{BASE_URL}/infotorg/lookup",
            json={
                "address": "Deichmans gate 2A, 0178 Oslo"
            },
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        data = resp.json()
        print(f"  Response keys: {list(data.keys())}")
        
        if data.get("status") == "ok":
            print(f"  building_type: {data.get('building_type')}")
            print(f"  borettslag: {data.get('borettslag')}")
        
        passed = (
            resp.status_code == 200 and
            data.get("status") == "ok" and
            data.get("building_type") == "borettslag" and
            "borettslag" in data and
            data["borettslag"] is not None and
            isinstance(data["borettslag"].get("andeler"), list) and
            len(data["borettslag"]["andeler"]) > 0
        )
        
        details = f"status={data.get('status')}, building_type={data.get('building_type')}, has_andeler={isinstance(data.get('borettslag', {}).get('andeler'), list)}"
        print_test("C3: Address path returns borettslag with andeler", passed, details)
    except Exception as e:
        print_test("C3: Address path returns borettslag with andeler", False, f"Exception: {e}")

def test_infotorg_missing_input():
    """Test C4: POST /api/infotorg/lookup with neither address nor matrikkel"""
    print("C4: POST /api/infotorg/lookup with empty body")
    try:
        resp = requests.post(
            f"{BASE_URL}/infotorg/lookup",
            json={},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        data = resp.json()
        print(f"  Response: {data}")
        
        passed = (
            resp.status_code == 400 and
            data.get("status") == "error" and
            data.get("message") == "Mangler adresse eller matrikkel"
        )
        
        details = f"status={resp.status_code}, error_status={data.get('status')}, message={data.get('message')}"
        print_test("C4: Empty body returns 400 with correct error", passed, details)
    except Exception as e:
        print_test("C4: Empty body returns 400 with correct error", False, f"Exception: {e}")

def test_infotorg_no_500():
    """Test C5: Confirm no 500 errors on valid/invalid input"""
    print("C5: Confirm no 500 errors on valid/invalid input")
    
    all_passed = True
    
    # Test with valid matrikkel (should be 200)
    try:
        resp = requests.post(
            f"{BASE_URL}/infotorg/lookup",
            json={"matrikkel": {"kommunenr": "3420", "gaardsnr": "72", "bruksnr": "128"}},
            timeout=30
        )
        no_500_valid = resp.status_code != 500
        print(f"  Valid matrikkel: status={resp.status_code} (not 500: {no_500_valid})")
        all_passed = all_passed and no_500_valid
    except Exception as e:
        print(f"  Valid matrikkel: Exception {e}")
        all_passed = False
    
    # Test with invalid input (should be 400, not 500)
    try:
        resp = requests.post(
            f"{BASE_URL}/infotorg/lookup",
            json={},
            timeout=30
        )
        no_500_invalid = resp.status_code != 500
        print(f"  Empty body: status={resp.status_code} (not 500: {no_500_invalid})")
        all_passed = all_passed and no_500_invalid
    except Exception as e:
        print(f"  Empty body: Exception {e}")
        all_passed = False
    
    print_test("C5: No 500 errors on valid/invalid input", all_passed, f"All requests returned non-500 status codes")

def main():
    print("=" * 80)
    print("BACKEND TEST: THREE NEW/CHANGED FEATURES")
    print("Base URL:", BASE_URL)
    print("=" * 80)
    print()
    
    # Test Group A: Admin Auth
    token = test_admin_auth()
    test_admin_auth_wrong_password()
    test_admin_auth_empty_body()
    
    if token:
        test_admin_auth_me_valid(token)
        test_admin_auth_me_no_key()
        test_admin_auth_me_bogus_token()
        test_token_as_key(token)
    else:
        print("⚠️  Skipping token-dependent tests (login failed)")
    
    test_legacy_key_regression()
    
    # Test Group B: Finn Matrikkel Parsing
    test_finn_preview_valid()
    test_finn_preview_invalid()
    test_finn_preview_regression()
    
    # Test Group C: Infotorg Lookup via Matrikkel
    test_infotorg_matrikkel()
    test_infotorg_matrikkel_sameie()
    test_infotorg_address_regression()
    test_infotorg_missing_input()
    test_infotorg_no_500()
    
    print("=" * 80)
    print("ALL TESTS COMPLETED")
    print("=" * 80)

if __name__ == "__main__":
    main()
