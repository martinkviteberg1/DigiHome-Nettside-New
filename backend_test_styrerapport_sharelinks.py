#!/usr/bin/env python3
"""
Backend test for STYRERAPPORT SHARE-LINK endpoints
Tests ONLY the new share-link functionality (admin CRUD + public token endpoint)
"""

import requests
import json
import time
from pymongo import MongoClient
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Track created links for cleanup
created_link_ids = []
original_links = []

def log_test(step, message):
    """Log test step with timestamp"""
    print(f"\n{'='*80}")
    print(f"[{step}] {message}")
    print(f"{'='*80}")

def save_original_state():
    """Save original state of styrerapport_lenker collection"""
    global original_links
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        original_links = list(db.styrerapport_lenker.find({}, {"_id": 0, "id": 1, "token": 1, "label": 1}))
        print(f"✓ Saved original state: {len(original_links)} existing links")
        for link in original_links:
            print(f"  - {link.get('label', 'N/A')} (token: {link.get('token', 'N/A')[:20]}...)")
        client.close()
    except Exception as e:
        print(f"✗ Failed to save original state: {e}")

def cleanup_test_data():
    """Clean up all test data from MongoDB"""
    global created_link_ids
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        if created_link_ids:
            result = db.styrerapport_lenker.delete_many({"id": {"$in": created_link_ids}})
            print(f"✓ Deleted {result.deleted_count} test links from MongoDB")
        
        # Verify cleanup
        remaining = list(db.styrerapport_lenker.find({}, {"_id": 0, "id": 1, "label": 1}))
        print(f"✓ Remaining links in collection: {len(remaining)}")
        for link in remaining:
            print(f"  - {link.get('label', 'N/A')} (id: {link.get('id', 'N/A')})")
        
        client.close()
        return True
    except Exception as e:
        print(f"✗ Cleanup failed: {e}")
        return False

def test_admin_get_list_with_auth():
    """Test A1: GET /api/admin/styrerapport/lenker with auth returns 200"""
    log_test("A1", "GET /admin/styrerapport/lenker WITH auth → 200 with list")
    try:
        response = requests.get(f"{BASE_URL}/admin/styrerapport/lenker?key={ADMIN_KEY}")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        
        if not data.get("ok"):
            print(f"✗ FAILED: ok is not true")
            return False
        
        if "lenker" not in data:
            print(f"✗ FAILED: lenker field missing")
            return False
        
        lenker = data["lenker"]
        print(f"✓ SUCCESS: Got {len(lenker)} links")
        
        # Verify structure of first link if exists
        if lenker:
            link = lenker[0]
            required_fields = ["id", "token", "label", "url", "utloper", "aktiv", "inkluderRegnskap", "regnskapAar", "visninger", "sistApnet", "sisteApninger"]
            for field in required_fields:
                if field not in link:
                    print(f"✗ FAILED: Link missing field '{field}'")
                    return False
            print(f"✓ Link structure verified: {link.get('label', 'N/A')}")
            print(f"  - url: {link.get('url', 'N/A')}")
            print(f"  - aktiv: {link.get('aktiv', 'N/A')}")
            print(f"  - visninger: {link.get('visninger', 0)}")
        
        return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def test_admin_get_list_without_auth():
    """Test A2: GET /api/admin/styrerapport/lenker without auth returns 401"""
    log_test("A2", "GET /admin/styrerapport/lenker WITHOUT auth → 401")
    try:
        response = requests.get(f"{BASE_URL}/admin/styrerapport/lenker")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"✗ FAILED: Expected 401, got {response.status_code}")
            return False
        
        print(f"✓ SUCCESS: Correctly returned 401 without auth")
        return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def test_admin_post_create_with_full_body():
    """Test A3: POST /api/admin/styrerapport/lenker with full body returns 200"""
    log_test("A3", "POST /admin/styrerapport/lenker with full body → 200 with link")
    global created_link_ids
    try:
        body = {
            "label": "QA test",
            "utloperDager": 7,
            "inkluderRegnskap": False,
            "regnskapAar": 2025
        }
        response = requests.post(
            f"{BASE_URL}/admin/styrerapport/lenker?key={ADMIN_KEY}",
            json=body
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get("ok"):
            print(f"✗ FAILED: ok is not true")
            return False
        
        if "lenke" not in data:
            print(f"✗ FAILED: lenke field missing")
            return False
        
        link = data["lenke"]
        created_link_ids.append(link["id"])
        
        # Verify token is UUID-like
        if not link.get("token") or len(link["token"]) < 16:
            print(f"✗ FAILED: token is not UUID-like: {link.get('token')}")
            return False
        
        # Verify aktiv is true
        if link.get("aktiv") != True:
            print(f"✗ FAILED: aktiv is not true: {link.get('aktiv')}")
            return False
        
        # Verify utloper is ~7 days ahead
        if not link.get("utloper"):
            print(f"✗ FAILED: utloper is missing")
            return False
        
        utloper_date = datetime.fromisoformat(link["utloper"].replace("Z", "+00:00"))
        now = datetime.now(utloper_date.tzinfo)
        days_diff = (utloper_date - now).days
        if not (6 <= days_diff <= 8):
            print(f"✗ FAILED: utloper is not ~7 days ahead: {days_diff} days")
            return False
        
        # Verify inkluderRegnskap is false
        if link.get("inkluderRegnskap") != False:
            print(f"✗ FAILED: inkluderRegnskap is not false: {link.get('inkluderRegnskap')}")
            return False
        
        # Verify regnskapAar is 2025
        if link.get("regnskapAar") != 2025:
            print(f"✗ FAILED: regnskapAar is not 2025: {link.get('regnskapAar')}")
            return False
        
        # Verify url ends with /styrerapport/<token>
        expected_suffix = f"/styrerapport/{link['token']}"
        if not link.get("url", "").endswith(expected_suffix):
            print(f"✗ FAILED: url does not end with {expected_suffix}: {link.get('url')}")
            return False
        
        print(f"✓ SUCCESS: Created link with token {link['token']}")
        print(f"  - label: {link.get('label')}")
        print(f"  - aktiv: {link.get('aktiv')}")
        print(f"  - utloper: {link.get('utloper')} (~{days_diff} days)")
        print(f"  - inkluderRegnskap: {link.get('inkluderRegnskap')}")
        print(f"  - regnskapAar: {link.get('regnskapAar')}")
        print(f"  - url: {link.get('url')}")
        
        # Store for later tests
        global test_link_id, test_link_token
        test_link_id = link["id"]
        test_link_token = link["token"]
        
        return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def test_admin_post_create_without_auth():
    """Test A4: POST /api/admin/styrerapport/lenker without auth returns 401"""
    log_test("A4", "POST /admin/styrerapport/lenker WITHOUT auth → 401")
    try:
        body = {"label": "Should fail"}
        response = requests.post(f"{BASE_URL}/admin/styrerapport/lenker", json=body)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"✗ FAILED: Expected 401, got {response.status_code}")
            return False
        
        print(f"✓ SUCCESS: Correctly returned 401 without auth")
        return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def test_admin_post_create_with_empty_body():
    """Test A5: POST /api/admin/styrerapport/lenker with empty body returns 200 with defaults"""
    log_test("A5", "POST /admin/styrerapport/lenker with empty body → 200 with defaults")
    global created_link_ids
    try:
        response = requests.post(
            f"{BASE_URL}/admin/styrerapport/lenker?key={ADMIN_KEY}",
            json={}
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        link = data.get("lenke", {})
        created_link_ids.append(link["id"])
        
        # Verify defaults
        if link.get("label") != "Styrerapport":
            print(f"✗ FAILED: label did not default to 'Styrerapport': {link.get('label')}")
            return False
        
        if link.get("utloper") is not None:
            print(f"✗ FAILED: utloper should be null (no expiry): {link.get('utloper')}")
            return False
        
        current_year = datetime.now().year
        if link.get("regnskapAar") != current_year:
            print(f"✗ FAILED: regnskapAar did not default to current year {current_year}: {link.get('regnskapAar')}")
            return False
        
        if link.get("aktiv") != True:
            print(f"✗ FAILED: aktiv is not true: {link.get('aktiv')}")
            return False
        
        print(f"✓ SUCCESS: Created link with defaults")
        print(f"  - label: {link.get('label')}")
        print(f"  - utloper: {link.get('utloper')} (null = no expiry)")
        print(f"  - regnskapAar: {link.get('regnskapAar')}")
        print(f"  - aktiv: {link.get('aktiv')}")
        
        return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def test_public_get_valid_token():
    """Test B6: GET /api/styrerapport/del/<token> for valid token returns 200"""
    log_test("B6", "GET /api/styrerapport/del/<token> for valid token → 200 with data")
    try:
        response = requests.get(f"{BASE_URL}/styrerapport/del/{test_link_token}")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        # Verify Cache-Control header
        cache_control = response.headers.get("Cache-Control", "")
        if "no-store" not in cache_control:
            print(f"✗ FAILED: Cache-Control header should contain 'no-store': {cache_control}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        if not data.get("ok"):
            print(f"✗ FAILED: ok is not true")
            return False
        
        # Verify required fields
        required_fields = ["lenke", "rapport", "boardPack", "customers", "selskap", "generatedAt"]
        for field in required_fields:
            if field not in data:
                print(f"✗ FAILED: Missing field '{field}'")
                return False
        
        # Verify lenke structure
        lenke = data["lenke"]
        lenke_fields = ["label", "opprettet", "utloper", "inkluderRegnskap"]
        for field in lenke_fields:
            if field not in lenke:
                print(f"✗ FAILED: lenke missing field '{field}'")
                return False
        
        # Since inkluderRegnskap was false, regnskap should be null/absent
        if "regnskap" in data and data["regnskap"] is not None:
            print(f"✗ FAILED: regnskap should be null when inkluderRegnskap=false")
            return False
        
        print(f"✓ SUCCESS: Public endpoint returned 200 with data")
        print(f"  - lenke.label: {lenke.get('label')}")
        print(f"  - lenke.inkluderRegnskap: {lenke.get('inkluderRegnskap')}")
        print(f"  - rapport: {'present' if data.get('rapport') else 'null'}")
        print(f"  - boardPack: {'present' if data.get('boardPack') else 'null'}")
        print(f"  - customers: {'present' if data.get('customers') else 'null'}")
        print(f"  - selskap: {'present' if data.get('selskap') else 'null'}")
        print(f"  - regnskap: {'present' if data.get('regnskap') else 'null/absent'}")
        print(f"  - Cache-Control: {cache_control}")
        
        return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def test_public_get_invalid_token():
    """Test B7: GET /api/styrerapport/del/<invalid-token> returns 404"""
    log_test("B7", "GET /api/styrerapport/del/<invalid-token> → 404 {feil:'ukjent'}")
    try:
        response = requests.get(f"{BASE_URL}/styrerapport/del/not-a-valid-token-xyz")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 404:
            print(f"✗ FAILED: Expected 404, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get("ok") != False:
            print(f"✗ FAILED: ok should be false")
            return False
        
        if data.get("feil") != "ukjent":
            print(f"✗ FAILED: feil should be 'ukjent': {data.get('feil')}")
            return False
        
        print(f"✓ SUCCESS: Correctly returned 404 with feil='ukjent'")
        return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def test_public_get_malformed_token():
    """Test B8: GET /api/styrerapport/del/<malformed> returns 404"""
    log_test("B8", "GET /api/styrerapport/del/<malformed> → 404 (regex rejects)")
    try:
        # Test with URL-encoded space
        response = requests.get(f"{BASE_URL}/styrerapport/del/%20")
        print(f"Status for '%20': {response.status_code}")
        
        if response.status_code != 404:
            print(f"✗ FAILED: Expected 404 for '%20', got {response.status_code}")
            return False
        
        # Test with too-short token
        response2 = requests.get(f"{BASE_URL}/styrerapport/del/abc")
        print(f"Status for 'abc': {response2.status_code}")
        
        if response2.status_code != 404:
            print(f"✗ FAILED: Expected 404 for 'abc', got {response2.status_code}")
            return False
        
        print(f"✓ SUCCESS: Malformed tokens correctly rejected with 404")
        return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def test_view_counting():
    """Test B9: Verify view counting works"""
    log_test("B9", "View counting: call public endpoint 2 times, verify visninger increased")
    try:
        # Get current visninger
        response = requests.get(f"{BASE_URL}/admin/styrerapport/lenker?key={ADMIN_KEY}")
        data = response.json()
        links = data.get("lenker", [])
        test_link = next((l for l in links if l["id"] == test_link_id), None)
        
        if not test_link:
            print(f"✗ FAILED: Could not find test link in list")
            return False
        
        initial_visninger = test_link.get("visninger", 0)
        print(f"Initial visninger: {initial_visninger}")
        
        # Call public endpoint 2 times
        for i in range(2):
            response = requests.get(f"{BASE_URL}/styrerapport/del/{test_link_token}")
            if response.status_code != 200:
                print(f"✗ FAILED: Public endpoint call {i+1} failed with {response.status_code}")
                return False
            print(f"  - Call {i+1}: 200 OK")
            time.sleep(0.5)  # Small delay between calls
        
        # Get updated visninger
        response = requests.get(f"{BASE_URL}/admin/styrerapport/lenker?key={ADMIN_KEY}")
        data = response.json()
        links = data.get("lenker", [])
        test_link = next((l for l in links if l["id"] == test_link_id), None)
        
        if not test_link:
            print(f"✗ FAILED: Could not find test link in list after calls")
            return False
        
        final_visninger = test_link.get("visninger", 0)
        print(f"Final visninger: {final_visninger}")
        
        if final_visninger != initial_visninger + 2:
            print(f"✗ FAILED: visninger did not increase by 2 (expected {initial_visninger + 2}, got {final_visninger})")
            return False
        
        # Verify sistApnet is set
        if not test_link.get("sistApnet"):
            print(f"✗ FAILED: sistApnet is not set")
            return False
        
        print(f"✓ SUCCESS: View counting works correctly")
        print(f"  - visninger increased from {initial_visninger} to {final_visninger}")
        print(f"  - sistApnet: {test_link.get('sistApnet')}")
        
        return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def test_revoke_link():
    """Test B10: DELETE /api/admin/styrerapport/lenker/<id> revokes link"""
    log_test("B10", "REVOKE: DELETE /api/admin/styrerapport/lenker/<id> → aktiv=false, then 410")
    try:
        # Revoke the link
        response = requests.delete(f"{BASE_URL}/admin/styrerapport/lenker/{test_link_id}?key={ADMIN_KEY}")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get("ok"):
            print(f"✗ FAILED: ok is not true")
            return False
        
        link = data.get("lenke", {})
        if link.get("aktiv") != False:
            print(f"✗ FAILED: aktiv should be false after revoke: {link.get('aktiv')}")
            return False
        
        print(f"✓ Link revoked (aktiv=false)")
        
        # Try to access public endpoint
        response = requests.get(f"{BASE_URL}/styrerapport/del/{test_link_token}")
        print(f"Public endpoint status: {response.status_code}")
        
        if response.status_code != 410:
            print(f"✗ FAILED: Expected 410 for revoked link, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get("feil") != "trukket":
            print(f"✗ FAILED: feil should be 'trukket': {data.get('feil')}")
            return False
        
        print(f"✓ SUCCESS: Revoked link returns 410 with feil='trukket'")
        return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def test_reactivate_link():
    """Test B11: POST /api/admin/styrerapport/lenker/<id>/aktiver reactivates link"""
    log_test("B11", "REACTIVATE: POST /api/admin/styrerapport/lenker/<id>/aktiver → aktiv=true, then 200")
    try:
        # Reactivate the link
        response = requests.post(f"{BASE_URL}/admin/styrerapport/lenker/{test_link_id}/aktiver?key={ADMIN_KEY}")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get("ok"):
            print(f"✗ FAILED: ok is not true")
            return False
        
        link = data.get("lenke", {})
        if link.get("aktiv") != True:
            print(f"✗ FAILED: aktiv should be true after reactivate: {link.get('aktiv')}")
            return False
        
        print(f"✓ Link reactivated (aktiv=true)")
        
        # Try to access public endpoint
        response = requests.get(f"{BASE_URL}/styrerapport/del/{test_link_token}")
        print(f"Public endpoint status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected 200 for reactivated link, got {response.status_code}")
            return False
        
        print(f"✓ SUCCESS: Reactivated link returns 200 again")
        return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def test_expiry():
    """Test B12: Expired link returns 410 with feil='utlopt'"""
    log_test("B12", "EXPIRY: Create link, set past expiry in MongoDB, verify 410 {feil:'utlopt'}")
    global created_link_ids
    try:
        # Create a new link
        body = {"label": "QA Expiry Test"}
        response = requests.post(
            f"{BASE_URL}/admin/styrerapport/lenker?key={ADMIN_KEY}",
            json=body
        )
        
        if response.status_code != 200:
            print(f"✗ FAILED: Could not create test link: {response.status_code}")
            return False
        
        data = response.json()
        link = data.get("lenke", {})
        expiry_link_id = link["id"]
        expiry_link_token = link["token"]
        created_link_ids.append(expiry_link_id)
        
        print(f"✓ Created test link: {expiry_link_id}")
        
        # Set past expiry date in MongoDB
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        past_date = (datetime.now() - timedelta(days=1)).isoformat()
        result = db.styrerapport_lenker.update_one(
            {"id": expiry_link_id},
            {"$set": {"utloper": past_date}}
        )
        client.close()
        
        if result.modified_count != 1:
            print(f"✗ FAILED: Could not update expiry date in MongoDB")
            return False
        
        print(f"✓ Set utloper to past date: {past_date}")
        
        # Try to access public endpoint
        response = requests.get(f"{BASE_URL}/styrerapport/del/{expiry_link_token}")
        print(f"Public endpoint status: {response.status_code}")
        
        if response.status_code != 410:
            print(f"✗ FAILED: Expected 410 for expired link, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get("feil") != "utlopt":
            print(f"✗ FAILED: feil should be 'utlopt': {data.get('feil')}")
            return False
        
        print(f"✓ SUCCESS: Expired link returns 410 with feil='utlopt'")
        return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def verify_existing_test_link():
    """Verify the existing test link with token 56aa9d04-6a3e-4def-be98-5e6090f7fc99"""
    log_test("VERIFY", "Verify existing test link 'Styremøte' exists")
    try:
        response = requests.get(f"{BASE_URL}/admin/styrerapport/lenker?key={ADMIN_KEY}")
        data = response.json()
        links = data.get("lenker", [])
        
        existing_link = next((l for l in links if l["token"] == "56aa9d04-6a3e-4def-be98-5e6090f7fc99"), None)
        
        if existing_link:
            print(f"✓ Found existing test link:")
            print(f"  - label: {existing_link.get('label')}")
            print(f"  - token: {existing_link.get('token')}")
            print(f"  - aktiv: {existing_link.get('aktiv')}")
            return True
        else:
            print(f"✓ Existing test link not found (may have been deleted)")
            return True
    except Exception as e:
        print(f"✗ FAILED with exception: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("STYRERAPPORT SHARE-LINK ENDPOINTS TEST")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    print("="*80)
    
    # Save original state
    save_original_state()
    
    # Verify existing test link
    verify_existing_test_link()
    
    tests = [
        ("A1", test_admin_get_list_with_auth),
        ("A2", test_admin_get_list_without_auth),
        ("A3", test_admin_post_create_with_full_body),
        ("A4", test_admin_post_create_without_auth),
        ("A5", test_admin_post_create_with_empty_body),
        ("B6", test_public_get_valid_token),
        ("B7", test_public_get_invalid_token),
        ("B8", test_public_get_malformed_token),
        ("B9", test_view_counting),
        ("B10", test_revoke_link),
        ("B11", test_reactivate_link),
        ("B12", test_expiry),
    ]
    
    results = []
    for test_id, test_func in tests:
        try:
            result = test_func()
            results.append((test_id, result))
        except Exception as e:
            print(f"\n✗ Test {test_id} crashed: {e}")
            results.append((test_id, False))
    
    # Cleanup
    log_test("CLEANUP", "Cleaning up test data from MongoDB")
    cleanup_success = cleanup_test_data()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    print("\nDetailed results:")
    for test_id, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_id}: {status}")
    
    if cleanup_success:
        print(f"\n✅ Cleanup successful")
    else:
        print(f"\n❌ Cleanup failed")
    
    print("="*80)
    
    return passed == total and cleanup_success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
