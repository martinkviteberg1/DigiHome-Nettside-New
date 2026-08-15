#!/usr/bin/env python3
"""
Backend test for Salgsradar annonse-preview functionality.
Tests the new ad preview feature that exposes AI-generated ad drafts on the public tilbud page.
"""

import requests
import json
import sys
from pymongo import MongoClient
import os

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
INGEST_KEY = os.getenv('SALGSRADAR_INGEST_KEY', 'dh_ingest_5f85080f4e4534c4684f5740cea43a09808a')
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Internal fields that should NEVER leak in tilbud response
INTERNAL_FIELDS = [
    'salgskraft', 'deler', 'potensialScore', 'annonseScore', 'bildeVurdering',
    'funn', 'finnMelding', 'salgsvinkel', 'notat', 'kontaktLogg', 'kontaktTlf',
    'kontaktNavn', 'prisHistorikk'
]

def print_test(msg):
    print(f"  {msg}")

def print_success(msg):
    print(f"  ✅ {msg}")

def print_error(msg):
    print(f"  ❌ {msg}")

def check_no_internal_fields(data, path=""):
    """Recursively check that no internal fields exist anywhere in the JSON"""
    if isinstance(data, dict):
        for key, value in data.items():
            current_path = f"{path}.{key}" if path else key
            if key in INTERNAL_FIELDS:
                return False, f"Found internal field '{key}' at path '{current_path}'"
            result, msg = check_no_internal_fields(value, current_path)
            if not result:
                return False, msg
    elif isinstance(data, list):
        for i, item in enumerate(data):
            result, msg = check_no_internal_fields(item, f"{path}[{i}]")
            if not result:
                return False, msg
    return True, ""

def test_1_annonse_object_in_tilbud_api():
    """TEST 1: ANNONSE-OBJEKTET I TILBUD-API"""
    print("\n=== TEST 1: ANNONSE-OBJEKTET I TILBUD-API ===")
    
    try:
        # Step 1a: Get Salgsradar leads and find Nyhavn 7
        print_test("Step 1a: Fetching Salgsradar leads to find Nyhavn 7...")
        r = requests.get(f"{API_URL}/admin/salgsradar/leads?key={ADMIN_KEY}", timeout=10)
        assert r.status_code == 200, f"Failed to get leads: {r.status_code}"
        
        leads_data = r.json()
        assert leads_data.get('ok'), "Response not ok"
        leads = leads_data.get('leads', [])
        
        # Find lead with address "Nyhavn 7"
        nyhavn_lead = None
        for lead in leads:
            if 'Nyhavn 7' in lead.get('adresse', ''):
                nyhavn_lead = lead
                break
        
        assert nyhavn_lead is not None, "Could not find lead with address 'Nyhavn 7'"
        tilbud_slug = nyhavn_lead.get('tilbudSlug')
        assert tilbud_slug, "Lead does not have tilbudSlug"
        print_success(f"Found Nyhavn 7 lead with tilbudSlug: {tilbud_slug}")
        
        # Step 1b: GET /api/tilbud?slug=<tilbudSlug>
        print_test(f"Step 1b: Fetching tilbud with slug {tilbud_slug}...")
        r = requests.get(f"{API_URL}/tilbud?slug={tilbud_slug}", timeout=10)
        assert r.status_code == 200, f"Failed to get tilbud: {r.status_code}"
        
        tilbud_data = r.json()
        assert tilbud_data.get('ok'), "Tilbud response not ok"
        tilbud = tilbud_data.get('tilbud', {})
        
        # Check annonse object exists
        annonse = tilbud.get('annonse')
        assert annonse is not None, "annonse field is missing from tilbud response"
        assert isinstance(annonse, dict), f"annonse should be an object, got {type(annonse)}"
        
        # Check required fields
        tittel = annonse.get('tittel')
        beskrivelse = annonse.get('beskrivelse')
        hoydepunkter = annonse.get('hoydepunkter')
        fasiliteter = annonse.get('fasiliteter')
        
        assert tittel and isinstance(tittel, str) and len(tittel) > 0, "tittel must be a non-empty string"
        assert beskrivelse and isinstance(beskrivelse, str) and len(beskrivelse) > 0, "beskrivelse must be a non-empty string"
        assert '\n\n' in beskrivelse, "beskrivelse should contain paragraph breaks (\\n\\n)"
        assert isinstance(hoydepunkter, list), "hoydepunkter must be an array"
        assert isinstance(fasiliteter, list), "fasiliteter must be an array"
        
        # Check etasje and mobler fields exist (can be empty strings)
        assert 'etasje' in annonse, "etasje field must exist"
        assert 'mobler' in annonse, "mobler field must exist"
        
        print_success(f"annonse object has all required fields:")
        print_success(f"  - tittel: '{tittel[:50]}...' ({len(tittel)} chars)")
        print_success(f"  - beskrivelse: {len(beskrivelse)} chars with paragraph breaks")
        print_success(f"  - hoydepunkter: {len(hoydepunkter)} items")
        print_success(f"  - fasiliteter: {len(fasiliteter)} items")
        print_success(f"  - etasje: '{annonse.get('etasje', '')}'")
        print_success(f"  - mobler: '{annonse.get('mobler', '')}'")
        
        return True, tilbud_slug
        
    except AssertionError as e:
        print_error(f"Test 1 failed: {e}")
        return False, None
    except Exception as e:
        print_error(f"Test 1 error: {e}")
        return False, None

def test_2_security_no_internal_leakage(tilbud_slug):
    """TEST 2: SIKKERHET — INGEN INTERN LEKKASJE"""
    print("\n=== TEST 2: SIKKERHET — INGEN INTERN LEKKASJE ===")
    
    try:
        print_test(f"Fetching tilbud with slug {tilbud_slug} and checking for internal fields...")
        r = requests.get(f"{API_URL}/tilbud?slug={tilbud_slug}", timeout=10)
        assert r.status_code == 200, f"Failed to get tilbud: {r.status_code}"
        
        tilbud_data = r.json()
        
        # Convert to JSON string for comprehensive search
        json_str = json.dumps(tilbud_data)
        
        # Check each internal field
        leaked_fields = []
        for field in INTERNAL_FIELDS:
            if f'"{field}"' in json_str:
                leaked_fields.append(field)
        
        assert len(leaked_fields) == 0, f"Internal fields leaked: {', '.join(leaked_fields)}"
        
        # Also do recursive check
        is_clean, msg = check_no_internal_fields(tilbud_data)
        assert is_clean, f"Internal field found: {msg}"
        
        print_success("No internal fields leaked in tilbud response")
        print_success(f"Checked for: {', '.join(INTERNAL_FIELDS)}")
        
        return True
        
    except AssertionError as e:
        print_error(f"Test 2 failed: {e}")
        return False
    except Exception as e:
        print_error(f"Test 2 error: {e}")
        return False

def test_3_annonse_null_without_ai_draft():
    """TEST 3: ANNONSE NULL UTEN AI-UTKAST"""
    print("\n=== TEST 3: ANNONSE NULL UTEN AI-UTKAST ===")
    
    test_finnkode = "99900021"
    test_lead_id = None
    
    try:
        # Step 3a: Create test lead directly in MongoDB (bypassing auto-pipeline)
        print_test("Step 3a: Creating test lead directly in MongoDB (without AI analysis)...")
        
        import uuid
        import secrets
        from datetime import datetime
        
        test_lead_id = str(uuid.uuid4())
        tilbud_slug = secrets.token_urlsafe(8)
        
        lead_doc = {
            "id": test_lead_id,
            "finnkode": test_finnkode,
            "tittel": "QA Test Annonse Preview",
            "adresse": "QA Testgate 1",
            "postnr": "5000",
            "pris": 15000,
            "bilder": [],
            "beskrivelse": "QA test for annonse preview null-case",
            "kildeUrl": f"https://www.finn.no/realestate/lettings/ad.html?finnkode={test_finnkode}",
            "kilde": "manuell",
            "status": "ny",
            "analyse": {
                "anbefaltLeie": 15000,
                "honorarPct": 8,
                "grunnlag": {
                    "snittLeie": None,
                    "snittSone": None,
                    "antallILeide": 0,
                    "antallISone": 0,
                    "sone": "50"
                }
            },
            "stylet": [],
            "tilbudSlug": tilbud_slug,
            "aapninger": 0,
            "sistAapnet": None,
            "notat": "",
            "kontaktLogg": [],
            "prisHistorikk": [],
            "annonseAktiv": True,
            "deaktivertAt": None,
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat()
            # Deliberately NOT including 'ai' field - this is the key test
        }
        
        db.salgsradar_leads.insert_one(lead_doc)
        print_success(f"Created test lead with ID: {test_lead_id}, slug: {tilbud_slug}")
        
        # Fetch tilbud (no AI analysis has run)
        print_test("Step 3b: Fetching tilbud (no AI analysis)...")
        r = requests.get(f"{API_URL}/tilbud?slug={tilbud_slug}", timeout=10)
        assert r.status_code == 200, f"Failed to get tilbud: {r.status_code}"
        
        tilbud_data = r.json()
        assert tilbud_data.get('ok'), "Tilbud response not ok"
        tilbud = tilbud_data.get('tilbud', {})
        
        # Check that annonse is null or missing
        annonse = tilbud.get('annonse')
        assert annonse is None, f"annonse should be null when ai.annonseUtkast doesn't exist, got: {annonse}"
        
        print_success("annonse is null (as expected when AI draft doesn't exist)")
        
        # Verify in MongoDB that ai field doesn't exist
        print_test("Verifying in MongoDB that ai field doesn't exist...")
        lead_doc = db.salgsradar_leads.find_one({"id": test_lead_id})
        assert lead_doc is not None, "Lead not found in MongoDB"
        
        assert 'ai' not in lead_doc, "ai field should not exist"
        
        print_success("Verified in MongoDB: ai field doesn't exist")
        
        return True, test_lead_id
        
    except AssertionError as e:
        print_error(f"Test 3 failed: {e}")
        return False, test_lead_id
    except Exception as e:
        print_error(f"Test 3 error: {e}")
        return False, test_lead_id

def test_4_regression():
    """TEST 4: REGRESJON (rask)"""
    print("\n=== TEST 4: REGRESJON ===")
    
    try:
        # 4a: GET /api/tilbud with invalid slug → 404
        print_test("Step 4a: Testing invalid slug...")
        r = requests.get(f"{API_URL}/tilbud?slug=invalid-slug-12345", timeout=10)
        assert r.status_code == 404, f"Expected 404 for invalid slug, got {r.status_code}"
        print_success("Invalid slug returns 404")
        
        # 4b: Nyhavn 7 tilbud has expected fields
        print_test("Step 4b: Verifying Nyhavn 7 tilbud has expected fields...")
        
        # Get Nyhavn 7 slug
        r = requests.get(f"{API_URL}/admin/salgsradar/leads?key={ADMIN_KEY}", timeout=10)
        assert r.status_code == 200, f"Failed to get leads: {r.status_code}"
        
        leads_data = r.json()
        leads = leads_data.get('leads', [])
        nyhavn_lead = None
        for lead in leads:
            if 'Nyhavn 7' in lead.get('adresse', ''):
                nyhavn_lead = lead
                break
        
        assert nyhavn_lead is not None, "Could not find Nyhavn 7 lead"
        tilbud_slug = nyhavn_lead.get('tilbudSlug')
        
        r = requests.get(f"{API_URL}/tilbud?slug={tilbud_slug}", timeout=10)
        assert r.status_code == 200, f"Failed to get tilbud: {r.status_code}"
        
        tilbud_data = r.json()
        tilbud = tilbud_data.get('tilbud', {})
        
        # Check regnestykke
        regnestykke = tilbud.get('regnestykke', {})
        assert regnestykke.get('anbefaltLeie', 0) > 0, "regnestykke.anbefaltLeie should be > 0"
        print_success(f"regnestykke.anbefaltLeie: {regnestykke.get('anbefaltLeie')}")
        
        # Check stylet array
        stylet = tilbud.get('stylet', [])
        assert isinstance(stylet, list), "stylet should be an array"
        if len(stylet) > 0:
            first_styled = stylet[0]
            assert 'id' in first_styled, "styled image should have id"
            assert 'kildeUrl' in first_styled, "styled image should have kildeUrl"
            assert 'stil' in first_styled, "styled image should have stil"
            assert 'dataUrl' not in first_styled, "styled image should NOT have dataUrl (only id/kildeUrl/stil)"
            print_success(f"stylet array has {len(stylet)} items with correct structure (id/kildeUrl/stil, NOT dataUrl)")
        
        # Check bilder (max 6)
        bilder = tilbud.get('bilder', [])
        assert isinstance(bilder, list), "bilder should be an array"
        assert len(bilder) <= 6, f"bilder should have max 6 items, got {len(bilder)}"
        print_success(f"bilder array has {len(bilder)} items (max 6)")
        
        # Check tekst.heroIntro
        tekst = tilbud.get('tekst')
        if tekst:
            assert 'heroIntro' in tekst, "tekst should have heroIntro"
            print_success("tekst.heroIntro exists")
        
        print_success("All regression checks passed")
        
        return True
        
    except AssertionError as e:
        print_error(f"Test 4 failed: {e}")
        return False
    except Exception as e:
        print_error(f"Test 4 error: {e}")
        return False

def cleanup(test_lead_id):
    """Clean up test data"""
    print("\n=== CLEANUP ===")
    
    if test_lead_id:
        try:
            # Try API deletion first
            print_test(f"Deleting test lead {test_lead_id} via API...")
            r = requests.delete(f"{API_URL}/admin/salgsradar/lead?id={test_lead_id}&key={ADMIN_KEY}", timeout=10)
            if r.status_code == 200:
                print_success(f"Deleted test lead {test_lead_id} via API")
            else:
                # Fallback to MongoDB deletion
                print_test(f"API deletion failed, trying MongoDB...")
                result = db.salgsradar_leads.delete_one({"id": test_lead_id})
                if result.deleted_count > 0:
                    print_success(f"Deleted test lead {test_lead_id} from MongoDB")
                    # Also delete any associated images
                    db.salgsradar_bilder.delete_many({"leadId": test_lead_id})
                else:
                    print_error(f"Failed to delete test lead from MongoDB")
        except Exception as e:
            print_error(f"Cleanup error: {e}")
    
    # Verify no QA leads remain
    try:
        print_test("Verifying no QA leads remain in MongoDB...")
        qa_count = db.salgsradar_leads.count_documents({"tittel": {"$regex": "^QA "}})
        if qa_count == 0:
            print_success("No QA leads remain in MongoDB")
        else:
            print_error(f"Found {qa_count} QA leads still in MongoDB")
            # Clean them up
            db.salgsradar_leads.delete_many({"tittel": {"$regex": "^QA "}})
            print_success("Cleaned up remaining QA leads")
    except Exception as e:
        print_error(f"Verification error: {e}")

def main():
    print("=" * 70)
    print("BACKEND TEST: Salgsradar Annonse-Preview Functionality")
    print("=" * 70)
    print(f"Base URL: {BASE_URL}")
    print(f"API URL: {API_URL}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    
    all_passed = True
    test_lead_id = None
    nyhavn_slug = None
    
    # Test 1: Annonse object in tilbud API
    success, nyhavn_slug = test_1_annonse_object_in_tilbud_api()
    if not success:
        all_passed = False
    
    # Test 2: Security - no internal leakage
    if nyhavn_slug:
        success = test_2_security_no_internal_leakage(nyhavn_slug)
        if not success:
            all_passed = False
    else:
        print_error("Skipping Test 2 (no slug from Test 1)")
        all_passed = False
    
    # Test 3: Annonse null without AI draft
    success, test_lead_id = test_3_annonse_null_without_ai_draft()
    if not success:
        all_passed = False
    
    # Test 4: Regression
    success = test_4_regression()
    if not success:
        all_passed = False
    
    # Cleanup
    cleanup(test_lead_id)
    
    # Summary
    print("\n" + "=" * 70)
    if all_passed:
        print("✅ ALL TESTS PASSED")
        print("=" * 70)
        sys.exit(0)
    else:
        print("❌ SOME TESTS FAILED")
        print("=" * 70)
        sys.exit(1)

if __name__ == "__main__":
    main()
