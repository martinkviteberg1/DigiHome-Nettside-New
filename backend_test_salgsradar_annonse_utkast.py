#!/usr/bin/env python3
"""
Backend test for Salgsradar editable ad draft (annonseUtkast).
Tests PUT /api/admin/salgsradar/lead with annonseUtkast payload.
"""

import requests
import time
import json
from pymongo import MongoClient

# Configuration from .env
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
INGEST_KEY = "dh_ingest_5f85080f4e4534c4684f5740cea43a09808a"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test data
TEST_FINNKODE = "99900031"
TEST_PRIS = 12000

def log(msg):
    print(f"[TEST] {msg}")

def test_editable_ad_draft():
    """
    Test the editable ad draft feature for Salgsradar leads.
    
    Steps:
    1. Create test lead via POST /api/salgsradar/ingest
    2. Try PUT with annonseUtkast BEFORE AI analysis exists (expect 400)
    3. Wait/poll until lead.ai exists (max 90s)
    4. PUT with full annonseUtkast → verify response
    5. Boundary checks (tittel 200 chars, hoydepunkter 8 items, fasiliteter 15 items)
    6. Partial update (only tittel)
    7. Public flow: GET /api/tilbud?slug=... → verify edited draft shows through
    8. Regression: status update, tilbudTekst update
    9. Cleanup: DELETE test lead
    """
    
    test_lead_id = None
    test_tilbud_slug = None
    
    try:
        # ============================================================
        # STEP 1: Create test lead via ingest
        # ============================================================
        log("STEP 1: Creating test lead via POST /api/salgsradar/ingest")
        
        ingest_payload = {
            "finnkode": TEST_FINNKODE,
            "tittel": "QA Testbolig Salgsradar Utkast",
            "adresse": "QA Testgate 123",
            "postnr": "0123",
            "boligtype": "Leilighet",
            "pris": TEST_PRIS,
            "m2": 75,
            "soverom": 2,
            "bilder": [],  # Empty images array as specified
            "beskrivelse": "Dette er en testbolig for å verifisere redigerbart annonseutkast."
        }
        
        ingest_response = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=ingest_payload,
            timeout=30
        )
        
        if ingest_response.status_code not in [200, 201]:
            log(f"❌ STEP 1 FAILED: Ingest returned {ingest_response.status_code}: {ingest_response.text}")
            return False
        
        ingest_data = ingest_response.json()
        if not ingest_data.get("ok"):
            log(f"❌ STEP 1 FAILED: Ingest returned ok=false: {ingest_data}")
            return False
        
        test_lead_id = ingest_data.get("leadId")
        test_tilbud_slug = ingest_data.get("tilbudSlug")
        
        if not test_lead_id or not test_tilbud_slug:
            log(f"❌ STEP 1 FAILED: Missing leadId or tilbudSlug in response: {ingest_data}")
            return False
        
        log(f"✅ STEP 1 PASSED: Test lead created with id={test_lead_id}, slug={test_tilbud_slug}")
        
        # ============================================================
        # STEP 2: Try PUT with annonseUtkast BEFORE AI analysis exists
        # ============================================================
        log("STEP 2: Attempting PUT with annonseUtkast BEFORE AI analysis (expect 400)")
        
        # First, check if AI analysis already exists (it might complete quickly)
        get_lead_response = requests.get(
            f"{BASE_URL}/admin/salgsradar/leads?key={ADMIN_KEY}",
            timeout=10
        )
        
        if get_lead_response.status_code == 200:
            leads_data = get_lead_response.json()
            test_lead = next((l for l in leads_data.get("leads", []) if l.get("id") == test_lead_id), None)
            
            if test_lead and test_lead.get("ai"):
                log(f"⚠️  STEP 2 SKIPPED: AI analysis already completed (fast background processing). Moving to step 3.")
            else:
                # AI analysis doesn't exist yet, try PUT (should fail with 400)
                early_put_payload = {
                    "id": test_lead_id,
                    "annonseUtkast": {
                        "tittel": "For tidlig tittel"
                    }
                }
                
                early_put_response = requests.put(
                    f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                    json=early_put_payload,
                    timeout=10
                )
                
                if early_put_response.status_code == 400:
                    error_msg = early_put_response.json().get("error", "")
                    if "AI-analyse" in error_msg or "analyse først" in error_msg.lower():
                        log(f"✅ STEP 2 PASSED: Got expected 400 error: '{error_msg}'")
                    else:
                        log(f"⚠️  STEP 2 WARNING: Got 400 but unexpected error message: '{error_msg}'")
                else:
                    log(f"❌ STEP 2 FAILED: Expected 400, got {early_put_response.status_code}: {early_put_response.text}")
                    return False
        else:
            log(f"⚠️  STEP 2 WARNING: Could not fetch leads to check AI status: {get_lead_response.status_code}")
        
        # ============================================================
        # STEP 3: Wait/poll until lead.ai exists (max 90s)
        # ============================================================
        log("STEP 3: Waiting for AI analysis to complete (max 90s)...")
        
        ai_ready = False
        max_wait = 90
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            get_lead_response = requests.get(
                f"{BASE_URL}/admin/salgsradar/leads?key={ADMIN_KEY}",
                timeout=10
            )
            
            if get_lead_response.status_code == 200:
                leads_data = get_lead_response.json()
                test_lead = next((l for l in leads_data.get("leads", []) if l.get("id") == test_lead_id), None)
                
                if test_lead and test_lead.get("ai"):
                    ai_ready = True
                    elapsed = time.time() - start_time
                    log(f"✅ STEP 3 PASSED: AI analysis completed after {elapsed:.1f}s")
                    break
            
            time.sleep(5)  # Poll every 5 seconds
        
        if not ai_ready:
            log(f"❌ STEP 3 FAILED: AI analysis did not complete within {max_wait}s")
            return False
        
        # ============================================================
        # STEP 4: PUT with full annonseUtkast
        # ============================================================
        log("STEP 4: PUT with full annonseUtkast (tittel, beskrivelse with \\n\\n, hoydepunkter, fasiliteter)")
        
        full_utkast_payload = {
            "id": test_lead_id,
            "annonseUtkast": {
                "tittel": "Test tittel",
                "beskrivelse": "Avsnitt en.\n\nAvsnitt to.",
                "hoydepunkter": ["Punkt 1", "Punkt 2"],
                "fasiliteter": ["Balkong", "Heis"]
            }
        }
        
        put_response = requests.put(
            f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
            json=full_utkast_payload,
            timeout=10
        )
        
        if put_response.status_code != 200:
            log(f"❌ STEP 4 FAILED: PUT returned {put_response.status_code}: {put_response.text}")
            return False
        
        put_data = put_response.json()
        if not put_data.get("ok"):
            log(f"❌ STEP 4 FAILED: PUT returned ok=false: {put_data}")
            return False
        
        # Verify response lead has the new values
        response_lead = put_data.get("lead", {})
        ai_utkast = response_lead.get("ai", {}).get("annonseUtkast", {})
        
        if ai_utkast.get("tittel") != "Test tittel":
            log(f"❌ STEP 4 FAILED: tittel mismatch. Expected 'Test tittel', got '{ai_utkast.get('tittel')}'")
            return False
        
        if ai_utkast.get("beskrivelse") != "Avsnitt en.\n\nAvsnitt to.":
            log(f"❌ STEP 4 FAILED: beskrivelse mismatch. Expected 'Avsnitt en.\\n\\nAvsnitt to.', got '{ai_utkast.get('beskrivelse')}'")
            return False
        
        if ai_utkast.get("hoydepunkter") != ["Punkt 1", "Punkt 2"]:
            log(f"❌ STEP 4 FAILED: hoydepunkter mismatch. Expected ['Punkt 1', 'Punkt 2'], got {ai_utkast.get('hoydepunkter')}")
            return False
        
        if ai_utkast.get("fasiliteter") != ["Balkong", "Heis"]:
            log(f"❌ STEP 4 FAILED: fasiliteter mismatch. Expected ['Balkong', 'Heis'], got {ai_utkast.get('fasiliteter')}")
            return False
        
        if ai_utkast.get("redigert") != True:
            log(f"❌ STEP 4 FAILED: redigert flag not set. Expected true, got {ai_utkast.get('redigert')}")
            return False
        
        log(f"✅ STEP 4 PASSED: Full annonseUtkast saved correctly with redigert=true and \\n\\n preserved")
        
        # ============================================================
        # STEP 5: Boundary checks
        # ============================================================
        log("STEP 5: Boundary checks (tittel 200 chars → max 80, hoydepunkter 8 → max 5, fasiliteter 15 → max 12)")
        
        boundary_payload = {
            "id": test_lead_id,
            "annonseUtkast": {
                "tittel": "A" * 200,  # 200 characters
                "hoydepunkter": [f"Punkt {i}" for i in range(1, 9)],  # 8 items
                "fasiliteter": [f"Fasilitet {i}" for i in range(1, 16)]  # 15 items
            }
        }
        
        boundary_response = requests.put(
            f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
            json=boundary_payload,
            timeout=10
        )
        
        if boundary_response.status_code != 200:
            log(f"❌ STEP 5 FAILED: PUT returned {boundary_response.status_code}: {boundary_response.text}")
            return False
        
        boundary_data = boundary_response.json()
        boundary_lead = boundary_data.get("lead", {})
        boundary_utkast = boundary_lead.get("ai", {}).get("annonseUtkast", {})
        
        # Check tittel is max 80 chars
        if len(boundary_utkast.get("tittel", "")) > 80:
            log(f"❌ STEP 5 FAILED: tittel not truncated. Length: {len(boundary_utkast.get('tittel', ''))}")
            return False
        
        # Check hoydepunkter is max 5 items
        if len(boundary_utkast.get("hoydepunkter", [])) > 5:
            log(f"❌ STEP 5 FAILED: hoydepunkter not limited. Count: {len(boundary_utkast.get('hoydepunkter', []))}")
            return False
        
        # Check fasiliteter is max 12 items
        if len(boundary_utkast.get("fasiliteter", [])) > 12:
            log(f"❌ STEP 5 FAILED: fasiliteter not limited. Count: {len(boundary_utkast.get('fasiliteter', []))}")
            return False
        
        log(f"✅ STEP 5 PASSED: Boundaries enforced (tittel ≤80, hoydepunkter ≤5, fasiliteter ≤12)")
        
        # ============================================================
        # STEP 6: Partial update (only tittel)
        # ============================================================
        log("STEP 6: Partial update with only tittel → beskrivelse/hoydepunkter/fasiliteter should remain")
        
        partial_payload = {
            "id": test_lead_id,
            "annonseUtkast": {
                "tittel": "Bare ny tittel"
            }
        }
        
        partial_response = requests.put(
            f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
            json=partial_payload,
            timeout=10
        )
        
        if partial_response.status_code != 200:
            log(f"❌ STEP 6 FAILED: PUT returned {partial_response.status_code}: {partial_response.text}")
            return False
        
        partial_data = partial_response.json()
        partial_lead = partial_data.get("lead", {})
        partial_utkast = partial_lead.get("ai", {}).get("annonseUtkast", {})
        
        # Verify tittel changed
        if partial_utkast.get("tittel") != "Bare ny tittel":
            log(f"❌ STEP 6 FAILED: tittel not updated. Expected 'Bare ny tittel', got '{partial_utkast.get('tittel')}'")
            return False
        
        # Verify beskrivelse remained from step 4 (not from step 5 boundary test)
        # Note: Step 5 didn't set beskrivelse, so it should still be from step 4
        if partial_utkast.get("beskrivelse") != "Avsnitt en.\n\nAvsnitt to.":
            log(f"❌ STEP 6 FAILED: beskrivelse changed unexpectedly. Got '{partial_utkast.get('beskrivelse')}'")
            return False
        
        # Verify hoydepunkter remained (from step 5, which was 5 items)
        if len(partial_utkast.get("hoydepunkter", [])) != 5:
            log(f"❌ STEP 6 FAILED: hoydepunkter changed. Expected 5 items, got {len(partial_utkast.get('hoydepunkter', []))}")
            return False
        
        # Verify fasiliteter remained (from step 5, which was 12 items)
        if len(partial_utkast.get("fasiliteter", [])) != 12:
            log(f"❌ STEP 6 FAILED: fasiliteter changed. Expected 12 items, got {len(partial_utkast.get('fasiliteter', []))}")
            return False
        
        log(f"✅ STEP 6 PASSED: Partial update works (only tittel changed, other fields preserved)")
        
        # ============================================================
        # STEP 7: Public flow - GET /api/tilbud?slug=...
        # ============================================================
        log("STEP 7: Public flow - GET /api/tilbud?slug=... → verify edited draft shows through")
        
        tilbud_response = requests.get(
            f"{BASE_URL}/tilbud?slug={test_tilbud_slug}",
            timeout=10
        )
        
        if tilbud_response.status_code != 200:
            log(f"❌ STEP 7 FAILED: GET tilbud returned {tilbud_response.status_code}: {tilbud_response.text}")
            return False
        
        tilbud_data = tilbud_response.json()
        if not tilbud_data.get("ok"):
            log(f"❌ STEP 7 FAILED: GET tilbud returned ok=false: {tilbud_data}")
            return False
        
        tilbud = tilbud_data.get("tilbud", {})
        annonse = tilbud.get("annonse", {})
        
        if not annonse:
            log(f"❌ STEP 7 FAILED: annonse object missing in tilbud response")
            return False
        
        if annonse.get("tittel") != "Bare ny tittel":
            log(f"❌ STEP 7 FAILED: annonse.tittel mismatch. Expected 'Bare ny tittel', got '{annonse.get('tittel')}'")
            return False
        
        log(f"✅ STEP 7 PASSED: Public tilbud endpoint shows edited draft (annonse.tittel='Bare ny tittel')")
        
        # ============================================================
        # STEP 8: Regression tests
        # ============================================================
        log("STEP 8: Regression tests (status update, tilbudTekst update)")
        
        # Test 8a: Valid status update
        status_payload = {
            "id": test_lead_id,
            "status": "kontaktet"
        }
        
        status_response = requests.put(
            f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
            json=status_payload,
            timeout=10
        )
        
        if status_response.status_code != 200:
            log(f"❌ STEP 8a FAILED: Status update returned {status_response.status_code}: {status_response.text}")
            return False
        
        status_data = status_response.json()
        if status_data.get("lead", {}).get("status") != "kontaktet":
            log(f"❌ STEP 8a FAILED: Status not updated. Expected 'kontaktet', got '{status_data.get('lead', {}).get('status')}'")
            return False
        
        log(f"✅ STEP 8a PASSED: Valid status update works")
        
        # Test 8b: Invalid status update
        invalid_status_payload = {
            "id": test_lead_id,
            "status": "tull"
        }
        
        invalid_status_response = requests.put(
            f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
            json=invalid_status_payload,
            timeout=10
        )
        
        if invalid_status_response.status_code != 400:
            log(f"❌ STEP 8b FAILED: Invalid status should return 400, got {invalid_status_response.status_code}")
            return False
        
        log(f"✅ STEP 8b PASSED: Invalid status rejected with 400")
        
        # Test 8c: tilbudTekst update still works
        tilbud_tekst_payload = {
            "id": test_lead_id,
            "tilbudTekst": {
                "heroIntro": "Hei"
            }
        }
        
        tilbud_tekst_response = requests.put(
            f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
            json=tilbud_tekst_payload,
            timeout=10
        )
        
        if tilbud_tekst_response.status_code != 200:
            log(f"❌ STEP 8c FAILED: tilbudTekst update returned {tilbud_tekst_response.status_code}: {tilbud_tekst_response.text}")
            return False
        
        tilbud_tekst_data = tilbud_tekst_response.json()
        if tilbud_tekst_data.get("lead", {}).get("ai", {}).get("tilbudTekst", {}).get("heroIntro") != "Hei":
            log(f"❌ STEP 8c FAILED: tilbudTekst.heroIntro not updated")
            return False
        
        log(f"✅ STEP 8c PASSED: tilbudTekst update still works")
        
        log(f"✅ STEP 8 PASSED: All regression tests passed")
        
        # ============================================================
        # STEP 9: Cleanup - DELETE test lead
        # ============================================================
        log("STEP 9: Cleanup - DELETE test lead")
        
        delete_response = requests.delete(
            f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}&id={test_lead_id}",
            timeout=10
        )
        
        if delete_response.status_code != 200:
            log(f"⚠️  STEP 9 WARNING: DELETE returned {delete_response.status_code}: {delete_response.text}")
        else:
            log(f"✅ STEP 9 PASSED: Test lead deleted successfully")
        
        # Verify deletion in MongoDB
        try:
            client = MongoClient(MONGO_URL)
            db = client[DB_NAME]
            
            remaining_lead = db.salgsradar_leads.find_one({"id": test_lead_id})
            if remaining_lead:
                log(f"⚠️  STEP 9 WARNING: Test lead still exists in MongoDB after deletion")
            else:
                log(f"✅ STEP 9 VERIFIED: Test lead removed from MongoDB")
            
            # Check tombstone was created
            tombstone = db.salgsradar_tombstones.find_one({"finnkode": TEST_FINNKODE})
            if tombstone:
                log(f"✅ STEP 9 VERIFIED: Tombstone created for finnkode {TEST_FINNKODE}")
                # Clean up tombstone
                db.salgsradar_tombstones.delete_one({"finnkode": TEST_FINNKODE})
                log(f"✅ STEP 9 CLEANUP: Tombstone removed")
            
            client.close()
        except Exception as e:
            log(f"⚠️  STEP 9 WARNING: Could not verify MongoDB cleanup: {e}")
        
        log("\n" + "="*80)
        log("✅ ALL TESTS PASSED - Editable ad draft feature working correctly")
        log("="*80)
        return True
        
    except Exception as e:
        log(f"❌ TEST FAILED WITH EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Emergency cleanup if test failed midway
        if test_lead_id:
            try:
                log(f"\n[CLEANUP] Ensuring test lead {test_lead_id} is removed...")
                requests.delete(
                    f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}&id={test_lead_id}",
                    timeout=10
                )
                
                # Clean up MongoDB
                client = MongoClient(MONGO_URL)
                db = client[DB_NAME]
                db.salgsradar_leads.delete_one({"id": test_lead_id})
                db.salgsradar_tombstones.delete_one({"finnkode": TEST_FINNKODE})
                client.close()
                
                log(f"[CLEANUP] Test lead and tombstone removed")
            except Exception as e:
                log(f"[CLEANUP] Warning: Could not clean up test lead: {e}")

if __name__ == "__main__":
    success = test_editable_ad_draft()
    exit(0 if success else 1)
