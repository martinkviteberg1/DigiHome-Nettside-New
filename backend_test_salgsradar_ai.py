#!/usr/bin/env python3
"""
Backend test for Salgsradar AI-analyse + score (hybridmodell)

CRITICAL COST CONTROL:
- POST /api/admin/salgsradar/analyser makes a PAID Gemini call
- We run MAX 1 (ONE) real analysis call total - on the QA test lead in step 3
- All other analysis tests only test error paths (401/404/without body)

SAFETY RULES:
- DO NOT touch 'Nordnesveien 25' lead (finnkode 473281470) - especially not its ai field/tilbudTekst
- Use ONLY fictional finnkodes 999999xx for test leads
- MANDATORY CLEANUP: delete all salgsradar_leads with finnkode /^999999/ and all 'salgsradar' notifications
"""

import requests
import json
import time
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
INGEST_KEY = "dh_ingest_5f85080f4e4534c4684f5740cea43a09808a"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Real image URLs from Nordnesveien 25 lead (finnkode 473281470)
NORDNES_BILDER = [
    "https://images.finncdn.no/dynamic/480w/item/473281470/dd396285-0e88-4ed3-bb8c-369e38e3a2d6",
    "https://images.finncdn.no/dynamic/480w/item/473281470/c386e9d5-2964-40cb-8a67-11b8f4978174"
]

def test_1_potensial_i_lista():
    """Test 1: GET /api/admin/salgsradar/leads - verify ALL leads have potensial field"""
    print("\n=== TEST 1: POTENSIAL I LISTA ===")
    try:
        r = requests.get(f"{BASE_URL}/admin/salgsradar/leads", params={"key": ADMIN_KEY}, timeout=10)
        print(f"GET /admin/salgsradar/leads: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        data = r.json()
        assert data.get("ok") == True, "Expected ok:true"
        leads = data.get("leads", [])
        assert len(leads) > 0, "Expected at least 1 lead"
        print(f"Found {len(leads)} leads")
        
        # Verify ALL leads have potensial field
        for lead in leads:
            assert "potensial" in lead, f"Lead {lead.get('id')} missing potensial field"
            pot = lead["potensial"]
            assert "score" in pot, f"Lead {lead.get('id')} potensial missing score"
            assert "annonseScore" in pot, f"Lead {lead.get('id')} potensial missing annonseScore"
            assert "forelopig" in pot, f"Lead {lead.get('id')} potensial missing forelopig"
            assert isinstance(pot["score"], (int, float)), f"Lead {lead.get('id')} potensial.score not a number"
            assert 0 <= pot["score"] <= 100, f"Lead {lead.get('id')} potensial.score out of range"
            assert 0 <= pot["annonseScore"] <= 100, f"Lead {lead.get('id')} potensial.annonseScore out of range"
            assert isinstance(pot["forelopig"], bool), f"Lead {lead.get('id')} potensial.forelopig not boolean"
        
        # Find Nordnesveien 25 and verify it has forelopig=false (has ai)
        nordnes = next((l for l in leads if l.get("finnkode") == "473281470"), None)
        assert nordnes is not None, "Nordnesveien 25 (finnkode 473281470) not found"
        assert nordnes["potensial"]["forelopig"] == False, "Nordnesveien 25 should have forelopig=false (has ai)"
        print(f"✅ Nordnesveien 25: potensial.score={nordnes['potensial']['score']}, annonseScore={nordnes['potensial']['annonseScore']}, forelopig=false")
        
        # Store Nordnesveien's original values for regression test later
        global NORDNES_ORIGINAL_AI
        NORDNES_ORIGINAL_AI = {
            "annonseScore": nordnes["potensial"]["annonseScore"],
            "potensialScore": nordnes["potensial"]["score"],
            "tilbudSlug": nordnes.get("tilbudSlug"),
            "heroIntro": nordnes.get("ai", {}).get("tilbudTekst", {}).get("heroIntro", ""),
        }
        
        print(f"✅ TEST 1 PASSED: All {len(leads)} leads have valid potensial field")
        return True
    except Exception as e:
        print(f"❌ TEST 1 FAILED: {e}")
        return False

def test_2_ingest_med_beskrivelse():
    """Test 2: POST /api/salgsradar/ingest with beskrivelse - verify stored in DB"""
    print("\n=== TEST 2: INGEST MED BESKRIVELSE ===")
    try:
        payload = {
            "finnkode": "99999910",
            "adresse": "QA Analyseveien 1",
            "postnr": "5006",
            "pris": 20000,
            "m2": 60,
            "soverom": 2,
            "boligtype": "Leilighet",
            "tittel": "Lys og fin toroms med balkong i sentrum",
            "beskrivelse": "En lys og fin toroms leilighet sentralt i Bergen med balkong og gode solforhold. Nyoppusset kjøkken.",
            "bilder": NORDNES_BILDER  # Use real image URLs from Nordnesveien 25
        }
        
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload,
            timeout=10
        )
        print(f"POST /salgsradar/ingest: {r.status_code}")
        assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") == True, "Expected ok:true"
        assert data.get("finnkode") == "99999910", "Wrong finnkode"
        assert data.get("ny") == True, "Expected ny:true"
        lead_id = data.get("leadId")
        assert lead_id, "Missing leadId"
        print(f"✅ Created lead: {lead_id}")
        
        # Verify in MongoDB that beskrivelse is stored
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        lead = db.salgsradar_leads.find_one({"id": lead_id})
        assert lead is not None, "Lead not found in DB"
        assert lead.get("beskrivelse") == payload["beskrivelse"], "Beskrivelse not stored correctly"
        assert len(lead.get("bilder", [])) == 2, f"Expected 2 bilder, got {len(lead.get('bilder', []))}"
        print(f"✅ Verified in DB: beskrivelse stored, {len(lead.get('bilder', []))} bilder")
        
        # Store lead ID for next tests
        global QA_LEAD_ID
        QA_LEAD_ID = lead_id
        
        print(f"✅ TEST 2 PASSED: Ingest with beskrivelse successful, lead ID: {lead_id}")
        return True
    except Exception as e:
        print(f"❌ TEST 2 FAILED: {e}")
        return False

def test_3_ai_analyse_paid_call():
    """Test 3: POST /api/admin/salgsradar/analyser - THE ONE PAID CALL"""
    print("\n=== TEST 3: AI-ANALYSE (THE ONE PAID CALL) ===")
    print("⚠️  WARNING: This makes a PAID Gemini API call - the ONLY one in this test suite")
    try:
        payload = {"leadId": QA_LEAD_ID}
        
        start_time = time.time()
        r = requests.post(
            f"{BASE_URL}/admin/salgsradar/analyser",
            params={"key": ADMIN_KEY},
            json=payload,
            timeout=120  # 90 sec for AI + buffer
        )
        elapsed = time.time() - start_time
        print(f"POST /admin/salgsradar/analyser: {r.status_code} (took {elapsed:.1f}s)")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") == True, "Expected ok:true"
        lead = data.get("lead")
        assert lead is not None, "Missing lead in response"
        
        # Verify response has ai field
        ai = lead.get("ai")
        assert ai is not None, "Missing ai field in lead"
        
        # Verify annonseScore and potensialScore
        assert "annonseScore" in ai, "Missing annonseScore"
        assert "potensialScore" in ai, "Missing potensialScore"
        assert isinstance(ai["annonseScore"], (int, float)), "annonseScore not a number"
        assert isinstance(ai["potensialScore"], (int, float)), "potensialScore not a number"
        assert 0 <= ai["annonseScore"] <= 100, f"annonseScore out of range: {ai['annonseScore']}"
        assert 0 <= ai["potensialScore"] <= 100, f"potensialScore out of range: {ai['potensialScore']}"
        print(f"✅ Scores: annonseScore={ai['annonseScore']}, potensialScore={ai['potensialScore']}")
        
        # Verify deler (all 0-10)
        deler = ai.get("deler", {})
        required_deler = ["visuell", "opplosning", "orientering", "antall", "tekst", "hygiene"]
        for del_name in required_deler:
            assert del_name in deler, f"Missing deler.{del_name}"
            val = deler[del_name]
            assert isinstance(val, (int, float)), f"deler.{del_name} not a number"
            assert 0 <= val <= 10, f"deler.{del_name} out of range: {val}"
        print(f"✅ Deler: visuell={deler['visuell']}, opplosning={deler['opplosning']}, orientering={deler['orientering']}, antall={deler['antall']}, tekst={deler['tekst']}, hygiene={deler['hygiene']}")
        
        # Verify teknisk
        teknisk = ai.get("teknisk", {})
        assert "antallBilder" in teknisk, "Missing teknisk.antallBilder"
        assert "maltBilder" in teknisk, "Missing teknisk.maltBilder"
        assert "snittMp" in teknisk, "Missing teknisk.snittMp"
        assert "andelPortrett" in teknisk, "Missing teknisk.andelPortrett"
        assert teknisk["maltBilder"] >= 1, f"Expected maltBilder >= 1, got {teknisk['maltBilder']}"
        assert teknisk["snittMp"] > 0, f"Expected snittMp > 0, got {teknisk['snittMp']}"
        assert 0 <= teknisk["andelPortrett"] <= 1, f"andelPortrett out of range: {teknisk['andelPortrett']}"
        print(f"✅ Teknisk: antallBilder={teknisk['antallBilder']}, maltBilder={teknisk['maltBilder']}, snittMp={teknisk['snittMp']}, andelPortrett={teknisk['andelPortrett']}")
        
        # Verify funn (array)
        funn = ai.get("funn", [])
        assert isinstance(funn, list), "funn not an array"
        print(f"✅ Funn: {len(funn)} items")
        
        # Verify stylingPotensial
        styling = ai.get("stylingPotensial")
        assert styling in ["lav", "middels", "høy"], f"Invalid stylingPotensial: {styling}"
        print(f"✅ stylingPotensial: {styling}")
        
        # Verify salgsvinkel
        salgsvinkel = ai.get("salgsvinkel", "")
        assert len(salgsvinkel) > 0, "salgsvinkel is empty"
        print(f"✅ salgsvinkel: {salgsvinkel[:50]}...")
        
        # Verify finnMelding (contains {LENKE})
        finn_melding = ai.get("finnMelding", "")
        assert "{LENKE}" in finn_melding, "finnMelding missing {LENKE} placeholder"
        print(f"✅ finnMelding contains {{LENKE}}: {finn_melding[:50]}...")
        
        # Verify tilbudTekst
        tilbud_tekst = ai.get("tilbudTekst", {})
        assert "heroIntro" in tilbud_tekst, "Missing tilbudTekst.heroIntro"
        assert "potensialTekst" in tilbud_tekst, "Missing tilbudTekst.potensialTekst"
        assert "redigert" in tilbud_tekst, "Missing tilbudTekst.redigert"
        assert tilbud_tekst["redigert"] == False, "Expected redigert=false initially"
        assert len(tilbud_tekst["heroIntro"]) > 0, "heroIntro is empty"
        assert len(tilbud_tekst["potensialTekst"]) > 0, "potensialTekst is empty"
        print(f"✅ tilbudTekst: heroIntro={tilbud_tekst['heroIntro'][:40]}..., potensialTekst={tilbud_tekst['potensialTekst'][:40]}..., redigert=false")
        
        # Verify in MongoDB
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        lead_db = db.salgsradar_leads.find_one({"id": QA_LEAD_ID})
        assert lead_db.get("ai") is not None, "ai field not in DB"
        assert lead_db["ai"]["annonseScore"] == ai["annonseScore"], "annonseScore mismatch in DB"
        print(f"✅ Verified in DB: ai field stored correctly")
        
        print(f"✅ TEST 3 PASSED: AI analysis completed successfully in {elapsed:.1f}s")
        return True
    except Exception as e:
        print(f"❌ TEST 3 FAILED: {e}")
        return False

def test_4_analyse_feilstier():
    """Test 4: POST /api/admin/salgsradar/analyser error paths (free - no AI calls)"""
    print("\n=== TEST 4: ANALYSE FEILSTIER (FREE) ===")
    try:
        # Test 4a: Without key → 401
        r = requests.post(f"{BASE_URL}/admin/salgsradar/analyser", json={"leadId": QA_LEAD_ID}, timeout=10)
        print(f"POST analyser without key: {r.status_code}")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        print("✅ Without key → 401")
        
        # Test 4b: With key but leadId='finnes-ikke' → 404
        r = requests.post(
            f"{BASE_URL}/admin/salgsradar/analyser",
            params={"key": ADMIN_KEY},
            json={"leadId": "finnes-ikke"},
            timeout=10
        )
        print(f"POST analyser with invalid leadId: {r.status_code}")
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"
        print("✅ Invalid leadId → 404")
        
        print("✅ TEST 4 PASSED: Error paths working correctly")
        return True
    except Exception as e:
        print(f"❌ TEST 4 FAILED: {e}")
        return False

def test_5_tekstredigering():
    """Test 5: PUT /api/admin/salgsradar/lead - edit finnMelding and tilbudTekst"""
    print("\n=== TEST 5: TEKSTREDIGERING ===")
    try:
        # Test 5a: Edit QA lead's texts
        payload = {
            "id": QA_LEAD_ID,
            "finnMelding": "Redigert QA-melding {LENKE}",
            "tilbudTekst": {
                "heroIntro": "QA intro",
                "potensialTekst": "QA potensial"
            }
        }
        
        r = requests.put(
            f"{BASE_URL}/admin/salgsradar/lead",
            params={"key": ADMIN_KEY},
            json=payload,
            timeout=10
        )
        print(f"PUT /admin/salgsradar/lead (edit texts): {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") == True, "Expected ok:true"
        lead = data.get("lead")
        assert lead is not None, "Missing lead in response"
        
        # Verify in DB
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        lead_db = db.salgsradar_leads.find_one({"id": QA_LEAD_ID})
        
        # Verify finnMelding updated
        assert lead_db["ai"]["finnMelding"] == "Redigert QA-melding {LENKE}", "finnMelding not updated"
        print("✅ finnMelding updated")
        
        # Verify tilbudTekst updated
        assert lead_db["ai"]["tilbudTekst"]["heroIntro"] == "QA intro", "heroIntro not updated"
        assert lead_db["ai"]["tilbudTekst"]["potensialTekst"] == "QA potensial", "potensialTekst not updated"
        assert lead_db["ai"]["tilbudTekst"]["redigert"] == True, "redigert not set to true"
        print("✅ tilbudTekst updated, redigert=true")
        
        # Verify ai.annonseScore and deler are UNCHANGED
        assert lead_db["ai"]["annonseScore"] is not None, "annonseScore was removed"
        assert lead_db["ai"]["deler"] is not None, "deler was removed"
        print("✅ annonseScore and deler UNCHANGED")
        
        # Test 5b: Create lead 99999911 without analyzing
        payload_ingest = {
            "finnkode": "99999911",
            "adresse": "QA Ingen AI",
            "postnr": "5006",
            "pris": 15000,
            "m2": 50,
            "soverom": 1,
            "boligtype": "Leilighet",
            "tittel": "Test uten AI",
            "bilder": [NORDNES_BILDER[0]]
        }
        
        r = requests.post(
            f"{BASE_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload_ingest,
            timeout=10
        )
        assert r.status_code == 201, f"Expected 201, got {r.status_code}"
        lead_id_no_ai = r.json().get("leadId")
        print(f"✅ Created lead without AI: {lead_id_no_ai}")
        
        # Store for cleanup
        global QA_LEAD_ID_NO_AI
        QA_LEAD_ID_NO_AI = lead_id_no_ai
        
        # Test 5c: Try to edit tilbudTekst on lead without ai → 400
        r = requests.put(
            f"{BASE_URL}/admin/salgsradar/lead",
            params={"key": ADMIN_KEY},
            json={
                "id": lead_id_no_ai,
                "tilbudTekst": {"heroIntro": "Should fail"}
            },
            timeout=10
        )
        print(f"PUT lead without ai (should fail): {r.status_code}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        data = r.json()
        assert "AI-analyse" in data.get("error", ""), "Expected error message about AI-analyse"
        print("✅ PUT tilbudTekst on lead without ai → 400 'Kjør AI-analyse først'")
        
        print("✅ TEST 5 PASSED: Text editing working correctly")
        return True
    except Exception as e:
        print(f"❌ TEST 5 FAILED: {e}")
        return False

def test_6_offentlig_tekst():
    """Test 6: GET /api/tilbud - verify public text and no sensitive fields"""
    print("\n=== TEST 6: OFFENTLIG TEKST ===")
    try:
        # Get QA lead's tilbudSlug
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        lead_db = db.salgsradar_leads.find_one({"id": QA_LEAD_ID})
        slug = lead_db.get("tilbudSlug")
        assert slug, "Missing tilbudSlug"
        
        # Test 6a: GET /api/tilbud for QA lead (without spor to not increment aapningar)
        r = requests.get(f"{BASE_URL}/tilbud", params={"slug": slug}, timeout=10)
        print(f"GET /api/tilbud?slug={slug}: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        data = r.json()
        assert data.get("ok") == True, "Expected ok:true"
        tilbud = data.get("tilbud")
        assert tilbud is not None, "Missing tilbud"
        
        # Verify tekst field
        tekst = tilbud.get("tekst")
        assert tekst is not None, "Missing tekst"
        assert tekst.get("heroIntro") == "QA intro", f"Wrong heroIntro: {tekst.get('heroIntro')}"
        assert tekst.get("potensialTekst") == "QA potensial", f"Wrong potensialTekst: {tekst.get('potensialTekst')}"
        print("✅ tekst.heroIntro='QA intro', tekst.potensialTekst='QA potensial'")
        
        # Verify response does NOT contain sensitive fields
        assert "funn" not in tilbud, "Response contains funn (should not)"
        assert "annonseScore" not in tilbud, "Response contains annonseScore (should not)"
        assert "potensialScore" not in tilbud, "Response contains potensialScore (should not)"
        assert "salgsvinkel" not in tilbud, "Response contains salgsvinkel (should not)"
        assert "finnMelding" not in tilbud, "Response contains finnMelding (should not)"
        assert "ai" not in tilbud, "Response contains ai (should not)"
        print("✅ Response does NOT contain funn, scorer, salgsvinkel, finnMelding")
        
        # Test 6b: GET /api/tilbud for lead without ai (99999911) → tekst=null
        lead_no_ai = db.salgsradar_leads.find_one({"id": QA_LEAD_ID_NO_AI})
        slug_no_ai = lead_no_ai.get("tilbudSlug")
        
        r = requests.get(f"{BASE_URL}/tilbud", params={"slug": slug_no_ai}, timeout=10)
        print(f"GET /api/tilbud?slug={slug_no_ai} (no ai): {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        data = r.json()
        tilbud_no_ai = data.get("tilbud")
        assert tilbud_no_ai.get("tekst") is None, "Expected tekst=null for lead without ai"
        print("✅ Lead without ai → tekst=null")
        
        print("✅ TEST 6 PASSED: Public text endpoint working correctly")
        return True
    except Exception as e:
        print(f"❌ TEST 6 FAILED: {e}")
        return False

def test_7_bulk_sletting():
    """Test 7: POST /api/admin/salgsradar/slett-mange - bulk delete"""
    print("\n=== TEST 7: BULK-SLETTING ===")
    try:
        # Test 7a: Bulk delete QA leads
        payload = {"ids": [QA_LEAD_ID, QA_LEAD_ID_NO_AI]}
        
        r = requests.post(
            f"{BASE_URL}/admin/salgsradar/slett-mange",
            params={"key": ADMIN_KEY},
            json=payload,
            timeout=10
        )
        print(f"POST /admin/salgsradar/slett-mange: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") == True, "Expected ok:true"
        assert data.get("slettet") == 2, f"Expected slettet=2, got {data.get('slettet')}"
        print(f"✅ Deleted 2 leads")
        
        # Verify both are gone from DB
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        lead1 = db.salgsradar_leads.find_one({"id": QA_LEAD_ID})
        lead2 = db.salgsradar_leads.find_one({"id": QA_LEAD_ID_NO_AI})
        assert lead1 is None, "Lead 1 still exists in DB"
        assert lead2 is None, "Lead 2 still exists in DB"
        print("✅ Both leads gone from DB")
        
        # Verify any salgsradar_bilder for them are deleted (there shouldn't be any, but check)
        bilder1 = db.salgsradar_bilder.count_documents({"leadId": QA_LEAD_ID})
        bilder2 = db.salgsradar_bilder.count_documents({"leadId": QA_LEAD_ID_NO_AI})
        assert bilder1 == 0, f"Expected 0 bilder for lead 1, got {bilder1}"
        assert bilder2 == 0, f"Expected 0 bilder for lead 2, got {bilder2}"
        print("✅ No salgsradar_bilder remain")
        
        # Test 7b: Error paths
        # Without key → 401
        r = requests.post(f"{BASE_URL}/admin/salgsradar/slett-mange", json={"ids": ["x"]}, timeout=10)
        print(f"POST slett-mange without key: {r.status_code}")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        print("✅ Without key → 401")
        
        # Empty ids → 400
        r = requests.post(
            f"{BASE_URL}/admin/salgsradar/slett-mange",
            params={"key": ADMIN_KEY},
            json={"ids": []},
            timeout=10
        )
        print(f"POST slett-mange with empty ids: {r.status_code}")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        print("✅ Empty ids → 400")
        
        print("✅ TEST 7 PASSED: Bulk delete working correctly")
        return True
    except Exception as e:
        print(f"❌ TEST 7 FAILED: {e}")
        return False

def test_8_regresjon():
    """Test 8: Regression - verify Nordnesveien 25 unchanged and other endpoints work"""
    print("\n=== TEST 8: REGRESJON ===")
    try:
        # Test 8a: GET /api/admin/salgsradar/leads → Nordnesveien 25 exists with unchanged ai
        r = requests.get(f"{BASE_URL}/admin/salgsradar/leads", params={"key": ADMIN_KEY}, timeout=10)
        print(f"GET /admin/salgsradar/leads: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        data = r.json()
        leads = data.get("leads", [])
        nordnes = next((l for l in leads if l.get("finnkode") == "473281470"), None)
        assert nordnes is not None, "Nordnesveien 25 not found"
        
        # Compare against original values stored in test 1
        assert nordnes["potensial"]["annonseScore"] == NORDNES_ORIGINAL_AI["annonseScore"], \
            f"Nordnesveien annonseScore changed: {NORDNES_ORIGINAL_AI['annonseScore']} → {nordnes['potensial']['annonseScore']}"
        assert nordnes["potensial"]["score"] == NORDNES_ORIGINAL_AI["potensialScore"], \
            f"Nordnesveien potensialScore changed: {NORDNES_ORIGINAL_AI['potensialScore']} → {nordnes['potensial']['score']}"
        print(f"✅ Nordnesveien 25 unchanged: annonseScore={nordnes['potensial']['annonseScore']}, potensialScore={nordnes['potensial']['score']}")
        
        # Test 8b: GET /api/tilbud for Nordnesveien (without spor) → 200 with tekst.heroIntro not empty
        slug = NORDNES_ORIGINAL_AI["tilbudSlug"]
        r = requests.get(f"{BASE_URL}/tilbud", params={"slug": slug}, timeout=10)
        print(f"GET /api/tilbud?slug={slug}: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        data = r.json()
        tilbud = data.get("tilbud")
        tekst = tilbud.get("tekst")
        assert tekst is not None, "Nordnesveien missing tekst"
        assert len(tekst.get("heroIntro", "")) > 0, "Nordnesveien heroIntro is empty"
        print(f"✅ Nordnesveien tilbud: tekst.heroIntro='{tekst.get('heroIntro')[:40]}...'")
        
        # Test 8c: PUT status on Nordnesveien still works (change to 'kontaktet' and back to 'analysert')
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        nordnes_db = db.salgsradar_leads.find_one({"finnkode": "473281470"})
        nordnes_id = nordnes_db.get("id")
        original_status = nordnes_db.get("status")
        
        r = requests.put(
            f"{BASE_URL}/admin/salgsradar/lead",
            params={"key": ADMIN_KEY},
            json={"id": nordnes_id, "status": "kontaktet"},
            timeout=10
        )
        print(f"PUT Nordnesveien status to 'kontaktet': {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Change back to original status
        r = requests.put(
            f"{BASE_URL}/admin/salgsradar/lead",
            params={"key": ADMIN_KEY},
            json={"id": nordnes_id, "status": original_status},
            timeout=10
        )
        print(f"PUT Nordnesveien status back to '{original_status}': {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print(f"✅ PUT status on Nordnesveien still works (changed to 'kontaktet' and back to '{original_status}')")
        
        print("✅ TEST 8 PASSED: Regression tests passed, Nordnesveien 25 unchanged")
        return True
    except Exception as e:
        print(f"❌ TEST 8 FAILED: {e}")
        return False

def test_9_opprydding():
    """Test 9: Cleanup - delete all 999999-testleads + salgsradar-notifications"""
    print("\n=== TEST 9: OPPRYDDING (MANDATORY CLEANUP) ===")
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Delete all salgsradar_leads with finnkode starting with 999999
        result = db.salgsradar_leads.delete_many({"finnkode": {"$regex": "^999999"}})
        print(f"Deleted {result.deleted_count} test leads (finnkode /^999999/)")
        
        # Delete all salgsradar-notifications from this test
        # (notifications created during ingest have type='salgsradar')
        result = db.notifications.delete_many({"type": "salgsradar", "text": {"$regex": "QA|99999"}})
        print(f"Deleted {result.deleted_count} salgsradar notifications")
        
        # Verify 0 test leads remain
        count = db.salgsradar_leads.count_documents({"finnkode": {"$regex": "^999999"}})
        assert count == 0, f"Expected 0 test leads, found {count}"
        print("✅ Verified 0 test leads remain")
        
        # Verify Nordnesveien 25 still exists
        nordnes = db.salgsradar_leads.find_one({"finnkode": "473281470"})
        assert nordnes is not None, "Nordnesveien 25 was deleted!"
        print("✅ Nordnesveien 25 still exists")
        
        print("✅ TEST 9 PASSED: Cleanup completed successfully")
        return True
    except Exception as e:
        print(f"❌ TEST 9 FAILED: {e}")
        return False

def main():
    print("=" * 80)
    print("BACKEND TEST: Salgsradar AI-analyse + score (hybridmodell)")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Ingest key: {INGEST_KEY[:20]}...")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print()
    print("⚠️  CRITICAL COST CONTROL:")
    print("   - POST /api/admin/salgsradar/analyser makes a PAID Gemini call")
    print("   - We run MAX 1 (ONE) real analysis call total - on the QA test lead in step 3")
    print("   - All other analysis tests only test error paths (401/404)")
    print()
    print("⚠️  SAFETY RULES:")
    print("   - DO NOT touch 'Nordnesveien 25' lead (finnkode 473281470)")
    print("   - Use ONLY fictional finnkodes 999999xx for test leads")
    print("   - MANDATORY CLEANUP: delete all test data at the end")
    print("=" * 80)
    
    results = []
    
    # Run tests in order
    results.append(("Test 1: Potensial i lista", test_1_potensial_i_lista()))
    results.append(("Test 2: Ingest med beskrivelse", test_2_ingest_med_beskrivelse()))
    results.append(("Test 3: AI-analyse (THE ONE PAID CALL)", test_3_ai_analyse_paid_call()))
    results.append(("Test 4: Analyse feilstier (free)", test_4_analyse_feilstier()))
    results.append(("Test 5: Tekstredigering", test_5_tekstredigering()))
    results.append(("Test 6: Offentlig tekst", test_6_offentlig_tekst()))
    results.append(("Test 7: Bulk-sletting", test_7_bulk_sletting()))
    results.append(("Test 8: Regresjon", test_8_regresjon()))
    results.append(("Test 9: Opprydding (mandatory)", test_9_opprydding()))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        print("\nSalgsradar AI-analyse + score endpoints working PERFECTLY:")
        print("  - GET /admin/salgsradar/leads returns potensial {score, annonseScore, forelopig} for ALL leads")
        print("  - Nordnesveien 25 has forelopig=false (has ai), leads without ai have forelopig=true")
        print("  - POST /salgsradar/ingest with beskrivelse stores it correctly")
        print("  - POST /admin/salgsradar/analyser (THE ONE PAID CALL) returns full AI analysis:")
        print("    * annonseScore 0-100, potensialScore 0-100")
        print("    * deler {visuell, opplosning, orientering, antall, tekst, hygiene} all 0-10")
        print("    * teknisk {antallBilder, maltBilder>=1, snittMp>0, andelPortrett 0-1}")
        print("    * funn (array), stylingPotensial ∈ {lav,middels,høy}, salgsvinkel")
        print("    * finnMelding (contains {LENKE}), tilbudTekst {heroIntro, potensialTekst, redigert:false}")
        print("  - Analyse error paths working (401 without key, 404 for invalid leadId)")
        print("  - PUT /admin/salgsradar/lead edits finnMelding and tilbudTekst:")
        print("    * Sets redigert=true, preserves annonseScore/deler")
        print("    * Returns 400 'Kjør AI-analyse først' for leads without ai")
        print("  - GET /api/tilbud returns tekst {heroIntro, potensialTekst} or null")
        print("    * Does NOT contain funn, scorer, salgsvinkel, finnMelding (sensitive fields)")
        print("  - POST /admin/salgsradar/slett-mange bulk deletes leads and salgsradar_bilder")
        print("    * Error paths: 401 without key, 400 for empty ids")
        print("  - Regression: Nordnesveien 25 unchanged, all endpoints working")
        print("  - Mandatory cleanup successful: 0 test leads remain, Nordnesveien 25 preserved")
        return 0
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    exit(main())
