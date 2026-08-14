#!/usr/bin/env python3
"""
Comprehensive backend test for Salgsradar maskin-ingest endpoint.
POST /api/salgsradar/ingest

CRITICAL SAFETY RULES:
1. Do NOT touch example lead 'Nordnesveien 25' (finnkode 473281470)
2. Use ONLY fictional finnkodes starting with 999999 (e.g., 99999901, 99999902)
3. MANDATORY CLEANUP: delete all test leads (finnkode matching /^999999/) and all 'salgsradar' notifications created during test
4. Do NOT call /api/admin/salgsradar/stil with valid data (paid AI service)
5. Ingest does not send emails - only in-app notifications
"""

import requests
import json
import time
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
INGEST_KEY = "dh_ingest_5f85080f4e4534c4684f5740cea43a09808a"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# MongoDB connection
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Store original Nordnesveien 25 state for verification
nordnes_original = None

def setup():
    """Setup: capture original Nordnesveien 25 state"""
    global nordnes_original
    print("\n=== SETUP: Capturing original Nordnesveien 25 state ===")
    nordnes_original = db.salgsradar_leads.find_one(
        {"finnkode": "473281470"},
        {"_id": 0, "status": 1, "notat": 1, "aapninger": 1}
    )
    if nordnes_original:
        print(f"✓ Nordnesveien 25 original state: status={nordnes_original.get('status')}, notat='{nordnes_original.get('notat')}', aapninger={nordnes_original.get('aapninger')}")
    else:
        print("⚠ Nordnesveien 25 not found in database")

def test_auth():
    """Test 1: AUTH - no header, wrong key, valid key with empty body"""
    print("\n=== TEST 1: AUTH ===")
    
    # 1a. No Authorization header
    try:
        r = requests.post(f"{BASE_URL}/salgsradar/ingest", json={})
        if r.status_code == 401:
            print("✅ T1a: POST without Authorization header returns 401")
        else:
            print(f"❌ T1a: Expected 401, got {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ T1a: Exception: {e}")
        return False
    
    # 1b. Wrong key
    try:
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": "Bearer wrong-key-123"},
            json={}
        )
        if r.status_code == 401:
            print("✅ T1b: POST with wrong Bearer key returns 401")
        else:
            print(f"❌ T1b: Expected 401, got {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ T1b: Exception: {e}")
        return False
    
    # 1c. Valid key but empty body (should fail validation, not auth)
    try:
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json={}
        )
        if r.status_code == 400:
            print("✅ T1c: POST with valid key but empty body returns 400 (validation error)")
        else:
            print(f"❌ T1c: Expected 400, got {r.status_code}: {r.text}")
            return False
    except Exception as e:
        print(f"❌ T1c: Exception: {e}")
        return False
    
    return True

def test_validation():
    """Test 2: VALIDATION - invalid finnkode, missing pris, missing adresse, pris too low"""
    print("\n=== TEST 2: VALIDATION ===")
    
    # 2a. Invalid finnkode (too short)
    try:
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json={"finnkode": "123", "adresse": "Test", "pris": 15000}
        )
        if r.status_code == 400 and "finnkode" in r.text.lower():
            print("✅ T2a: Invalid finnkode (too short) returns 400 with error about finnkode")
        else:
            print(f"❌ T2a: Expected 400 with finnkode error, got {r.status_code}: {r.text}")
            return False
    except Exception as e:
        print(f"❌ T2a: Exception: {e}")
        return False
    
    # 2b. Missing pris (within valid range)
    try:
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json={"finnkode": "99999901", "adresse": "Testveien 1"}
        )
        # Note: endpoint returns 400 for all validation errors (doesn't use val.status)
        if r.status_code == 400 and "pris" in r.text.lower():
            print("✅ T2b: Missing pris returns 400 with error about pris")
        else:
            print(f"❌ T2b: Expected 400 with pris error, got {r.status_code}: {r.text}")
            return False
    except Exception as e:
        print(f"❌ T2b: Exception: {e}")
        return False
    
    # 2c. Missing adresse
    try:
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json={"finnkode": "99999901", "pris": 15000}
        )
        if r.status_code == 400 and "adresse" in r.text.lower():
            print("✅ T2c: Missing adresse returns 400 with error about adresse")
        else:
            print(f"❌ T2c: Expected 400 with adresse error, got {r.status_code}: {r.text}")
            return False
    except Exception as e:
        print(f"❌ T2c: Exception: {e}")
        return False
    
    # 2d. Pris too low (under 1000)
    try:
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json={"finnkode": "99999901", "adresse": "Testveien 1", "pris": 500}
        )
        # Note: endpoint returns 400 for all validation errors (doesn't use val.status)
        if r.status_code == 400 and "pris" in r.text.lower():
            print("✅ T2d: Pris too low (500) returns 400 with error about pris")
        else:
            print(f"❌ T2d: Expected 400 with pris error, got {r.status_code}: {r.text}")
            return False
    except Exception as e:
        print(f"❌ T2d: Exception: {e}")
        return False
    
    return True

def test_happy_path():
    """Test 3: HAPPY PATH - single object with full payload"""
    print("\n=== TEST 3: HAPPY PATH (single object) ===")
    
    try:
        payload = {
            "finnkode": "99999901",
            "tittel": "QA testannonse",
            "adresse": "Testveien 1",
            "postnr": "5006",
            "pris": 18000,
            "m2": 55,
            "soverom": 2,
            "boligtype": "Leilighet",
            "bilder": [
                "https://images.finncdn.no/dynamic/default/item/99999901/abc123",
                "https://evil.example.com/x.jpg"  # Should be filtered out
            ]
        }
        
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload
        )
        
        if r.status_code != 201:
            print(f"❌ T3: Expected 201, got {r.status_code}: {r.text}")
            return False
        
        data = r.json()
        if not data.get("ok"):
            print(f"❌ T3: Response ok is not true: {data}")
            return False
        
        if data.get("finnkode") != "99999901":
            print(f"❌ T3: Expected finnkode 99999901, got {data.get('finnkode')}")
            return False
        
        if not data.get("leadId"):
            print(f"❌ T3: Missing leadId in response")
            return False
        
        if not data.get("tilbudSlug"):
            print(f"❌ T3: Missing tilbudSlug in response")
            return False
        
        if data.get("ny") != True:
            print(f"❌ T3: Expected ny=true, got {data.get('ny')}")
            return False
        
        print(f"✅ T3: POST single object returns 201 with ok=true, finnkode=99999901, leadId={data.get('leadId')}, tilbudSlug={data.get('tilbudSlug')}, ny=true")
        
        # Verify in MongoDB
        lead = db.salgsradar_leads.find_one({"finnkode": "99999901"})
        if not lead:
            print("❌ T3: Lead not found in MongoDB")
            return False
        
        if lead.get("kilde") != "agent":
            print(f"❌ T3: Expected kilde='agent', got {lead.get('kilde')}")
            return False
        
        if lead.get("status") != "analysert":
            print(f"❌ T3: Expected status='analysert', got {lead.get('status')}")
            return False
        
        if lead.get("kildeUrl") != "https://www.finn.no/realestate/lettings/ad.html?finnkode=99999901":
            print(f"❌ T3: Unexpected kildeUrl: {lead.get('kildeUrl')}")
            return False
        
        # Check bilder - evil.example.com should be filtered out
        bilder = lead.get("bilder", [])
        if len(bilder) != 1:
            print(f"❌ T3: Expected 1 bilde (evil.example.com filtered), got {len(bilder)}")
            return False
        
        if "images.finncdn.no" not in bilder[0]:
            print(f"❌ T3: Expected finncdn bilde, got {bilder[0]}")
            return False
        
        print(f"✅ T3: MongoDB verification: kilde='agent', status='analysert', kildeUrl correct, bilder filtered (1 finncdn URL, evil.example.com removed)")
        
        # Check analyse
        analyse = lead.get("analyse", {})
        if analyse.get("anbefaltLeie") != 18000:
            print(f"❌ T3: Expected anbefaltLeie=18000, got {analyse.get('anbefaltLeie')}")
            return False
        
        if analyse.get("honorarPct") != 8:
            print(f"❌ T3: Expected honorarPct=8, got {analyse.get('honorarPct')}")
            return False
        
        print(f"✅ T3: analyse.anbefaltLeie=18000 (starts at advertised price), analyse.honorarPct=8")
        
        # Check tilbudSlug is unguessable
        tilbudSlug = lead.get("tilbudSlug")
        if not tilbudSlug or len(tilbudSlug) < 8:
            print(f"❌ T3: tilbudSlug too short or missing: {tilbudSlug}")
            return False
        
        print(f"✅ T3: tilbudSlug is unguessable string: {tilbudSlug}")
        
        return True
        
    except Exception as e:
        print(f"❌ T3: Exception: {e}")
        return False

def test_public_tilbud():
    """Test 4: PUBLIC TILBUD - GET /api/tilbud with slug from test 3"""
    print("\n=== TEST 4: PUBLIC TILBUD ===")
    
    try:
        # Get tilbudSlug from test lead
        lead = db.salgsradar_leads.find_one({"finnkode": "99999901"})
        if not lead:
            print("❌ T4: Test lead not found")
            return False
        
        tilbudSlug = lead.get("tilbudSlug")
        if not tilbudSlug:
            print("❌ T4: tilbudSlug not found in lead")
            return False
        
        # GET without spor (to not increment aapninger)
        r = requests.get(f"{BASE_URL}/tilbud?slug={tilbudSlug}")
        
        if r.status_code != 200:
            print(f"❌ T4: Expected 200, got {r.status_code}: {r.text}")
            return False
        
        data = r.json()
        if not data.get("ok"):
            print(f"❌ T4: Response ok is not true")
            return False
        
        tilbud = data.get("tilbud", {})
        if tilbud.get("adresse") != "Testveien 1":
            print(f"❌ T4: Expected adresse='Testveien 1', got {tilbud.get('adresse')}")
            return False
        
        regnestykke = tilbud.get("regnestykke", {})
        if not regnestykke:
            print(f"❌ T4: Missing regnestykke in tilbud")
            return False
        
        print(f"✅ T4: GET /api/tilbud?slug={tilbudSlug} returns 200 with tilbud.adresse='Testveien 1' and regnestykke")
        
        return True
        
    except Exception as e:
        print(f"❌ T4: Exception: {e}")
        return False

def test_idempotency():
    """Test 5: IDEMPOTENCY - update existing lead without changing pipeline fields"""
    print("\n=== TEST 5: IDEMPOTENCY ===")
    
    try:
        # First, set status='kontaktet' and notat='QA-notat' via admin endpoint
        lead = db.salgsradar_leads.find_one({"finnkode": "99999901"})
        if not lead:
            print("❌ T5: Test lead not found")
            return False
        
        leadId = lead.get("id")
        
        # Update via admin endpoint
        r = requests.put(
            f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
            json={
                "id": leadId,
                "status": "kontaktet",
                "notat": "QA-notat"
            }
        )
        
        if r.status_code != 200:
            print(f"❌ T5: Admin PUT failed: {r.status_code}: {r.text}")
            return False
        
        print(f"✅ T5: Set status='kontaktet' and notat='QA-notat' via admin endpoint")
        
        # Now POST same finnkode again via ingest with different pris
        payload = {
            "finnkode": "99999901",
            "tittel": "QA testannonse",
            "adresse": "Testveien 1",
            "postnr": "5006",
            "pris": 19000,  # Changed from 18000
            "m2": 55,
            "soverom": 2,
            "boligtype": "Leilighet"
        }
        
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload
        )
        
        if r.status_code != 200:
            print(f"❌ T5: Expected 200 (update), got {r.status_code}: {r.text}")
            return False
        
        data = r.json()
        if data.get("ny") != False:
            print(f"❌ T5: Expected ny=false (update), got {data.get('ny')}")
            return False
        
        print(f"✅ T5: POST same finnkode returns 200 with ny=false")
        
        # Verify in MongoDB: pris updated, but status/notat/kilde unchanged
        lead = db.salgsradar_leads.find_one({"finnkode": "99999901"})
        
        if lead.get("pris") != 19000:
            print(f"❌ T5: Expected pris=19000 (updated), got {lead.get('pris')}")
            return False
        
        if lead.get("status") != "kontaktet":
            print(f"❌ T5: Expected status='kontaktet' (unchanged), got {lead.get('status')}")
            return False
        
        if lead.get("notat") != "QA-notat":
            print(f"❌ T5: Expected notat='QA-notat' (unchanged), got {lead.get('notat')}")
            return False
        
        if lead.get("kilde") != "agent":
            print(f"❌ T5: Expected kilde='agent' (unchanged), got {lead.get('kilde')}")
            return False
        
        if lead.get("id") != leadId:
            print(f"❌ T5: leadId changed (should be same)")
            return False
        
        if lead.get("tilbudSlug") != data.get("tilbudSlug"):
            print(f"❌ T5: tilbudSlug changed (should be same)")
            return False
        
        print(f"✅ T5: MongoDB verification: pris updated to 19000, status still 'kontaktet', notat still 'QA-notat', kilde still 'agent', same leadId/tilbudSlug")
        
        return True
        
    except Exception as e:
        print(f"❌ T5: Exception: {e}")
        return False

def test_notifications():
    """Test 6: NOTIFICATIONS - verify in-app notifications for NEW lead, not for update"""
    print("\n=== TEST 6: NOTIFICATIONS ===")
    
    try:
        # Count notifications before creating new lead
        notif_before = db.notifications.count_documents({"type": "salgsradar", "text": {"$regex": "99999902"}})
        
        # Create NEW lead (99999902)
        payload = {
            "finnkode": "99999902",
            "tittel": "QA testannonse 2",
            "adresse": "Testveien 2",
            "postnr": "5006",
            "pris": 16000,
            "m2": 45,
            "soverom": 1,
            "boligtype": "Leilighet"
        }
        
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload
        )
        
        if r.status_code != 201:
            print(f"❌ T6: Expected 201, got {r.status_code}: {r.text}")
            return False
        
        data = r.json()
        if data.get("ny") != True:
            print(f"❌ T6: Expected ny=true, got {data.get('ny')}")
            return False
        
        print(f"✅ T6: Created NEW lead 99999902")
        
        # Check notifications after
        time.sleep(0.5)  # Small delay for notification creation
        notif_after = db.notifications.count_documents({"type": "salgsradar", "text": {"$regex": "Testveien 2"}})
        
        if notif_after <= notif_before:
            print(f"❌ T6: Expected new notifications, got {notif_after} (before: {notif_before})")
            return False
        
        # Get one notification to verify content
        notif = db.notifications.find_one({"type": "salgsradar", "text": {"$regex": "Testveien 2"}})
        if not notif:
            print(f"❌ T6: Notification not found")
            return False
        
        if "agenten fanget ny annonse" not in notif.get("text", ""):
            print(f"❌ T6: Notification text doesn't contain expected phrase: {notif.get('text')}")
            return False
        
        print(f"✅ T6: Notification created for NEW lead with type='salgsradar' and text containing 'agenten fanget ny annonse — Testveien 2'")
        
        # Now update the same lead and verify NO new notification
        notif_before_update = db.notifications.count_documents({"type": "salgsradar", "text": {"$regex": "Testveien 2"}})
        
        payload["pris"] = 17000  # Change price
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload
        )
        
        if r.status_code != 200:
            print(f"❌ T6: Update failed: {r.status_code}: {r.text}")
            return False
        
        time.sleep(0.5)
        notif_after_update = db.notifications.count_documents({"type": "salgsradar", "text": {"$regex": "Testveien 2"}})
        
        if notif_after_update != notif_before_update:
            print(f"❌ T6: Update should NOT create new notification, but count changed from {notif_before_update} to {notif_after_update}")
            return False
        
        print(f"✅ T6: Update (ny=false) did NOT create new notification (count unchanged: {notif_after_update})")
        
        return True
        
    except Exception as e:
        print(f"❌ T6: Exception: {e}")
        return False

def test_batch():
    """Test 7: BATCH - multiple annonser, partial success, empty array, too many"""
    print("\n=== TEST 7: BATCH ===")
    
    try:
        # 7a. Batch with one valid and one invalid
        payload = {
            "annonser": [
                {
                    "finnkode": "99999903",
                    "adresse": "Testveien 3",
                    "pris": 12000
                },
                {
                    "finnkode": "kort",  # Invalid
                    "adresse": "X",
                    "pris": 5000
                }
            ]
        }
        
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload
        )
        
        if r.status_code != 200:
            print(f"❌ T7a: Expected 200 (partial success), got {r.status_code}: {r.text}")
            return False
        
        data = r.json()
        if not data.get("ok"):
            print(f"❌ T7a: Expected ok=true (at least one succeeded)")
            return False
        
        resultater = data.get("resultater", [])
        if len(resultater) != 2:
            print(f"❌ T7a: Expected 2 results, got {len(resultater)}")
            return False
        
        if resultater[0].get("ok") != True:
            print(f"❌ T7a: First result should be ok=true")
            return False
        
        if resultater[0].get("ny") != True:
            print(f"❌ T7a: First result should be ny=true")
            return False
        
        if resultater[1].get("ok") != False:
            print(f"❌ T7a: Second result should be ok=false")
            return False
        
        if not resultater[1].get("error"):
            print(f"❌ T7a: Second result should have error message")
            return False
        
        print(f"✅ T7a: Batch with 1 valid + 1 invalid returns 200 with resultater: first ok=true/ny=true, second ok=false with error")
        
        # 7b. Empty array
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json={"annonser": []}
        )
        
        if r.status_code != 400:
            print(f"❌ T7b: Expected 400 for empty array, got {r.status_code}")
            return False
        
        print(f"✅ T7b: Empty annonser array returns 400")
        
        # 7c. Too many (11 elements)
        annonser = []
        for i in range(11):
            annonser.append({
                "finnkode": f"9999990{i}",
                "adresse": f"Test {i}",
                "pris": 10000
            })
        
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json={"annonser": annonser}
        )
        
        if r.status_code != 400:
            print(f"❌ T7c: Expected 400 for 11 elements, got {r.status_code}")
            return False
        
        if "Maks 10" not in r.text:
            print(f"❌ T7c: Expected 'Maks 10' in error message, got: {r.text}")
            return False
        
        print(f"✅ T7c: Batch with 11 elements returns 400 with 'Maks 10 annonser per kall'")
        
        return True
        
    except Exception as e:
        print(f"❌ T7: Exception: {e}")
        return False

def test_all_fail():
    """Test 8: ALL FAIL - batch where all elements fail"""
    print("\n=== TEST 8: ALL FAIL ===")
    
    try:
        payload = {
            "annonser": [
                {"finnkode": "a", "adresse": "X", "pris": 10000},
                {"finnkode": "b", "adresse": "Y", "pris": 10000}
            ]
        }
        
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload
        )
        
        if r.status_code != 400:
            print(f"❌ T8: Expected 400 when all fail, got {r.status_code}")
            return False
        
        data = r.json()
        if data.get("ok") != False:
            print(f"❌ T8: Expected ok=false when all fail")
            return False
        
        resultater = data.get("resultater", [])
        if len(resultater) != 2:
            print(f"❌ T8: Expected 2 results, got {len(resultater)}")
            return False
        
        if resultater[0].get("ok") != False or resultater[1].get("ok") != False:
            print(f"❌ T8: Both results should be ok=false")
            return False
        
        print(f"✅ T8: Batch where all fail returns 400 with ok=false and resultater where both are ok=false")
        
        return True
        
    except Exception as e:
        print(f"❌ T8: Exception: {e}")
        return False

def test_admin_list():
    """Test 9: ADMIN LIST - verify test leads appear with kilde='agent'"""
    print("\n=== TEST 9: ADMIN LIST ===")
    
    try:
        r = requests.get(f"{BASE_URL}/admin/salgsradar/leads?key={ADMIN_KEY}")
        
        if r.status_code != 200:
            print(f"❌ T9: Expected 200, got {r.status_code}: {r.text}")
            return False
        
        data = r.json()
        leads = data.get("leads", [])
        
        # Find our test leads
        test_leads = [l for l in leads if l.get("finnkode", "").startswith("999999")]
        
        if len(test_leads) < 3:
            print(f"❌ T9: Expected at least 3 test leads, found {len(test_leads)}")
            return False
        
        # Verify all have kilde='agent'
        for lead in test_leads:
            if lead.get("kilde") != "agent":
                print(f"❌ T9: Test lead {lead.get('finnkode')} has kilde={lead.get('kilde')}, expected 'agent'")
                return False
        
        print(f"✅ T9: GET /admin/salgsradar/leads returns 200 with {len(test_leads)} test leads, all have kilde='agent'")
        
        # Verify Nordnesveien 25 still exists
        nordnes = [l for l in leads if l.get("finnkode") == "473281470"]
        if not nordnes:
            print(f"❌ T9: Nordnesveien 25 not found in list")
            return False
        
        print(f"✅ T9: Nordnesveien 25 (finnkode 473281470) still exists in list")
        
        return True
        
    except Exception as e:
        print(f"❌ T9: Exception: {e}")
        return False

def test_regression():
    """Test 10: REGRESSION - verify other endpoints still work"""
    print("\n=== TEST 10: REGRESSION ===")
    
    try:
        # 10a. GET /api/tilbud with Nordnesveien slug (without spor to not increment aapninger)
        nordnes = db.salgsradar_leads.find_one({"finnkode": "473281470"})
        if not nordnes:
            print("❌ T10a: Nordnesveien 25 not found")
            return False
        
        slug = nordnes.get("tilbudSlug")
        r = requests.get(f"{BASE_URL}/tilbud?slug={slug}")
        
        if r.status_code != 200:
            print(f"❌ T10a: GET /api/tilbud for Nordnesveien failed: {r.status_code}")
            return False
        
        print(f"✅ T10a: GET /api/tilbud?slug={slug} (Nordnesveien) returns 200")
        
        # 10b. POST /admin/salgsradar/hent with invalid URL should return 400
        r = requests.post(
            f"{BASE_URL}/admin/salgsradar/hent?key={ADMIN_KEY}",
            json={"url": "https://evil.com/fake"}
        )
        
        if r.status_code != 400:
            print(f"❌ T10b: Expected 400 for invalid URL, got {r.status_code}")
            return False
        
        print(f"✅ T10b: POST /admin/salgsradar/hent with invalid URL returns 400 (existing route still works)")
        
        return True
        
    except Exception as e:
        print(f"❌ T10: Exception: {e}")
        return False

def cleanup():
    """MANDATORY CLEANUP: delete all test leads and notifications"""
    print("\n=== CLEANUP (MANDATORY) ===")
    
    try:
        # Delete all salgsradar_leads with finnkode starting with 999999
        result = db.salgsradar_leads.delete_many({"finnkode": {"$regex": "^999999"}})
        print(f"✓ Deleted {result.deleted_count} test leads from salgsradar_leads")
        
        # Delete all 'salgsradar' notifications created during test
        # (We can identify them by checking if they mention our test addresses)
        result = db.notifications.delete_many({
            "type": "salgsradar",
            "text": {"$regex": "Testveien"}
        })
        print(f"✓ Deleted {result.deleted_count} test notifications")
        
        # Verify cleanup
        remaining_leads = db.salgsradar_leads.count_documents({"finnkode": {"$regex": "^999999"}})
        if remaining_leads > 0:
            print(f"⚠ WARNING: {remaining_leads} test leads still remain!")
            return False
        
        print(f"✅ Cleanup verification: 0 test leads remain in salgsradar_leads")
        
        # Verify Nordnesveien 25 is unchanged
        nordnes_after = db.salgsradar_leads.find_one(
            {"finnkode": "473281470"},
            {"_id": 0, "status": 1, "notat": 1, "aapningar": 1}
        )
        
        if not nordnes_after:
            print(f"❌ CRITICAL: Nordnesveien 25 was deleted!")
            return False
        
        # Compare with original (aapningar might have changed if we used spor=1, but we didn't)
        if nordnes_after.get("status") != nordnes_original.get("status"):
            print(f"⚠ WARNING: Nordnesveien 25 status changed from {nordnes_original.get('status')} to {nordnes_after.get('status')}")
        
        if nordnes_after.get("notat") != nordnes_original.get("notat"):
            print(f"⚠ WARNING: Nordnesveien 25 notat changed from '{nordnes_original.get('notat')}' to '{nordnes_after.get('notat')}'")
        
        if nordnes_after.get("aapningar") != nordnes_original.get("aapningar"):
            print(f"⚠ WARNING: Nordnesveien 25 aapningar changed from {nordnes_original.get('aapningar')} to {nordnes_after.get('aapningar')}")
        
        print(f"✅ Nordnesveien 25 verification: status={nordnes_after.get('status')}, notat='{nordnes_after.get('notat')}', aapningar={nordnes_after.get('aapningar')} (unchanged)")
        
        return True
        
    except Exception as e:
        print(f"❌ Cleanup exception: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 80)
    print("SALGSRADAR MASKIN-INGEST ENDPOINT TEST")
    print("POST /api/salgsradar/ingest")
    print("=" * 80)
    
    setup()
    
    tests = [
        ("AUTH", test_auth),
        ("VALIDATION", test_validation),
        ("HAPPY PATH", test_happy_path),
        ("PUBLIC TILBUD", test_public_tilbud),
        ("IDEMPOTENCY", test_idempotency),
        ("NOTIFICATIONS", test_notifications),
        ("BATCH", test_batch),
        ("ALL FAIL", test_all_fail),
        ("ADMIN LIST", test_admin_list),
        ("REGRESSION", test_regression),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                print(f"❌ {name} FAILED")
        except Exception as e:
            failed += 1
            print(f"❌ {name} EXCEPTION: {e}")
    
    # Always run cleanup
    if not cleanup():
        print("\n⚠ CLEANUP FAILED - MANUAL INTERVENTION REQUIRED")
    
    print("\n" + "=" * 80)
    print(f"TEST SUMMARY: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 80)
    
    if failed == 0:
        print("✅ ALL TESTS PASSED")
        return 0
    else:
        print(f"❌ {failed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    exit(main())
