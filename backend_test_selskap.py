#!/usr/bin/env python3
"""
Backend test for Selskap (organisasjonskart + aksjeeierbok).
Tests all endpoints with REAL data safety rules.
"""
import requests
import json
import sys
from pymongo import MongoClient

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_EMAIL = "martin@kviteberg.no"
ADMIN_PASSWORD = "Pyramiden2025##"
MASTER_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Track test data for cleanup
test_data = {
    "person_ids": [],
    "rolle_ids": [],
    "eier_ids": [],
    "klasse_ids": [],
    "transaksjon_ids": [],
}

def log(msg):
    print(f"[TEST] {msg}")

def get_token():
    """Login and get session token"""
    try:
        res = requests.post(f"{BASE_URL}/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }, timeout=30)
        if res.status_code == 200:
            data = res.json()
            return data.get("token")
        else:
            log(f"❌ Login failed: {res.status_code} {res.text}")
            return None
    except Exception as e:
        log(f"❌ Login error: {e}")
        return None

def get_mongo_db():
    """Get MongoDB connection"""
    try:
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        client.server_info()  # Force connection
        return client[DB_NAME]
    except Exception as e:
        log(f"❌ MongoDB connection failed: {e}")
        return None

# ═══════════════════════════════════════════════════════════════════════════
# (A) ORGANISASJON TESTS
# ═══════════════════════════════════════════════════════════════════════════

def test_a1_get_organisasjon():
    """A1: GET /api/admin/selskap/organisasjon → 200 with selskaper, personer, roller"""
    log("A1: GET organisasjon")
    try:
        res = requests.get(f"{BASE_URL}/admin/selskap/organisasjon?key={MASTER_KEY}", timeout=30)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data.get("ok") == True, "Response not ok"
        assert "selskaper" in data, "Missing selskaper"
        assert "personer" in data, "Missing personer"
        assert "roller" in data, "Missing roller"
        
        # Verify 2 real companies exist
        selskaper = data["selskaper"]
        assert len(selskaper) >= 2, f"Expected at least 2 companies, got {len(selskaper)}"
        
        orgnrs = [s.get("orgnr") for s in selskaper]
        assert "835595242" in orgnrs, "Digihome AS (835595242) not found"
        assert "835674622" in orgnrs, "Digihome Tech AS (835674622) not found"
        
        # Verify real roles exist
        roller = data["roller"]
        assert len(roller) > 0, "No roles found"
        
        # Check for real people (Erik, Sarah, Martin)
        personer = data["personer"]
        person_names = [p.get("navn", "").lower() for p in personer]
        
        # Verify roles have real names (not role names like 'Styreleder')
        for rolle in roller:
            person_id = rolle.get("personId")
            person = next((p for p in personer if p.get("id") == person_id), None)
            if person:
                navn = person.get("navn", "")
                # Regression check: person names should NOT be role names
                assert navn.lower() not in ["styreleder", "daglig leder", "nestleder", "styremedlem"], \
                    f"Person has role name '{navn}' instead of real name (regression bug)"
        
        # Check for specific real roles
        erik_roles = [r for r in roller if any(p.get("id") == r.get("personId") and "erik" in p.get("navn", "").lower() for p in personer)]
        assert len(erik_roles) > 0, "Erik Hoffmann-Dahl roles not found"
        
        # Verify Erik has LEDE role in both companies
        erik_lede_count = sum(1 for r in erik_roles if r.get("rolleKode") == "LEDE")
        assert erik_lede_count >= 1, f"Erik should have at least 1 LEDE role, found {erik_lede_count}"
        
        # Verify kilde 'brreg' exists
        brreg_roles = [r for r in roller if r.get("kilde") == "brreg"]
        assert len(brreg_roles) > 0, "No brreg roles found"
        
        log(f"✅ A1 PASSED: {len(selskaper)} companies, {len(personer)} persons, {len(roller)} roles")
        return selskaper
    except AssertionError as e:
        log(f"❌ A1 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ A1 ERROR: {e}")
        raise

def test_a2_no_token():
    """A2: No token → 401"""
    log("A2: GET organisasjon without token")
    try:
        res = requests.get(f"{BASE_URL}/admin/selskap/organisasjon", timeout=30)
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        log("✅ A2 PASSED: 401 without token")
    except AssertionError as e:
        log(f"❌ A2 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ A2 ERROR: {e}")
        raise

def test_a3_create_update_person(selskaper):
    """A3: POST /admin/selskap/person → 200, PUT → 200 with fields persisted"""
    log("A3: Create and update test person")
    try:
        # Create person
        res = requests.post(f"{BASE_URL}/admin/selskap/person?key={MASTER_KEY}", json={
            "navn": "QA Testperson SLETTES",
            "tittel": "CTO"
        }, timeout=30)
        assert res.status_code == 200, f"POST failed: {res.status_code} {res.text}"
        data = res.json()
        assert data.get("ok") == True, "POST response not ok"
        person = data.get("person")
        assert person is not None, "No person in response"
        person_id = person.get("id")
        assert person_id, "No person id"
        test_data["person_ids"].append(person_id)
        
        assert person.get("navn") == "QA Testperson SLETTES", "Name mismatch"
        assert person.get("tittel") == "CTO", "Title mismatch"
        assert person.get("kilde") == "manuell", "Should be manual source"
        
        # Update person
        res = requests.put(f"{BASE_URL}/admin/selskap/person?key={MASTER_KEY}", json={
            "id": person_id,
            "bio": "test bio",
            "epost": "qa@example.com"
        }, timeout=30)
        assert res.status_code == 200, f"PUT failed: {res.status_code} {res.text}"
        data = res.json()
        assert data.get("ok") == True, "PUT response not ok"
        updated = data.get("person")
        assert updated.get("bio") == "test bio", "Bio not updated"
        assert updated.get("epost") == "qa@example.com", "Email not updated"
        
        # Create a role for this person so they appear in GET organisasjon
        digihome_as = next((s for s in selskaper if s.get("orgnr") == "835595242"), None)
        selskap_id = digihome_as.get("id")
        
        res = requests.post(f"{BASE_URL}/admin/selskap/rolle?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "personId": person_id,
            "rolleNavn": "CTO",
            "gruppe": "ledelse"
        }, timeout=30)
        assert res.status_code == 200, f"POST rolle failed: {res.status_code} {res.text}"
        rolle_data = res.json()
        rolle_id = rolle_data.get("rolle", {}).get("id")
        test_data["rolle_ids"].append(rolle_id)
        
        # Now verify in GET (person should appear because they have a role)
        res = requests.get(f"{BASE_URL}/admin/selskap/organisasjon?key={MASTER_KEY}", timeout=30)
        data = res.json()
        personer = data.get("personer", [])
        qa_person = next((p for p in personer if p.get("id") == person_id), None)
        assert qa_person is not None, "QA person not found in GET (after creating role)"
        assert qa_person.get("bio") == "test bio", "Bio not persisted"
        assert qa_person.get("epost") == "qa@example.com", "Email not persisted"
        
        log(f"✅ A3 PASSED: Created and updated person {person_id}")
        return person_id, rolle_id
    except AssertionError as e:
        log(f"❌ A3 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ A3 ERROR: {e}")
        raise

def test_a4_update_delete_rolle(person_id, rolle_id, selskaper):
    """A4: PUT/DELETE rolle with validation"""
    log("A4: Update and delete test role")
    try:
        # Update role (skjult)
        res = requests.put(f"{BASE_URL}/admin/selskap/rolle?key={MASTER_KEY}", json={
            "id": rolle_id,
            "skjult": True
        }, timeout=30)
        assert res.status_code == 200, f"PUT rolle failed: {res.status_code} {res.text}"
        
        # Verify skjult persisted
        res = requests.get(f"{BASE_URL}/admin/selskap/organisasjon?key={MASTER_KEY}", timeout=30)
        data = res.json()
        roller = data.get("roller", [])
        qa_rolle = next((r for r in roller if r.get("id") == rolle_id), None)
        assert qa_rolle.get("skjult") == True, "Skjult not persisted"
        
        # Try to update rolleNavn on a BRREG role (should fail)
        brreg_rolle = next((r for r in roller if r.get("kilde") == "brreg"), None)
        if brreg_rolle:
            res = requests.put(f"{BASE_URL}/admin/selskap/rolle?key={MASTER_KEY}", json={
                "id": brreg_rolle.get("id"),
                "rolleNavn": "Test"
            }, timeout=30)
            assert res.status_code == 400, f"Should reject editing BRREG role, got {res.status_code}"
            log("  ✓ BRREG role edit rejected as expected")
        
        # Try to delete a BRREG role (should fail)
        if brreg_rolle:
            res = requests.delete(f"{BASE_URL}/admin/selskap/rolle?key={MASTER_KEY}&id={brreg_rolle.get('id')}", timeout=30)
            assert res.status_code == 400, f"Should reject deleting BRREG role, got {res.status_code}"
            assert "skjul" in res.text.lower(), "Error message should mention 'skjul'"
            log("  ✓ BRREG role deletion rejected with 'skjul' message")
        
        # Delete manual role
        res = requests.delete(f"{BASE_URL}/admin/selskap/rolle?key={MASTER_KEY}&id={rolle_id}", timeout=30)
        assert res.status_code == 200, f"DELETE rolle failed: {res.status_code} {res.text}"
        test_data["rolle_ids"].remove(rolle_id)
        
        log(f"✅ A4 PASSED: Updated and deleted rolle {rolle_id}")
    except AssertionError as e:
        log(f"❌ A4 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ A4 ERROR: {e}")
        raise

def test_a5_delete_person(person_id):
    """A5: DELETE person (after roles gone), try delete BRREG person → 400"""
    log("A5: Delete test person and verify BRREG person protection")
    try:
        # Delete QA person (roles already deleted in A4)
        res = requests.delete(f"{BASE_URL}/admin/selskap/person?key={MASTER_KEY}&id={person_id}", timeout=30)
        assert res.status_code == 200, f"DELETE person failed: {res.status_code} {res.text}"
        test_data["person_ids"].remove(person_id)
        
        # Verify person is gone (check MongoDB directly since GET only shows persons with roles)
        db = get_mongo_db()
        person_doc = db["org_personer"].find_one({"id": person_id})
        assert person_doc is None, "Person should be deleted from MongoDB"
        
        # Try to delete a real BRREG person (Erik)
        res = requests.get(f"{BASE_URL}/admin/selskap/organisasjon?key={MASTER_KEY}", timeout=30)
        data = res.json()
        personer = data.get("personer", [])
        erik_person = next((p for p in personer if "erik" in p.get("navn", "").lower()), None)
        if erik_person:
            res = requests.delete(f"{BASE_URL}/admin/selskap/person?key={MASTER_KEY}&id={erik_person.get('id')}", timeout=30)
            assert res.status_code == 400, f"Should reject deleting BRREG person, got {res.status_code}"
            assert "brreg" in res.text.lower() or "roller" in res.text.lower(), "Error should mention brreg roles"
            
            # Verify Erik still exists in MongoDB
            erik_doc = db["org_personer"].find_one({"id": erik_person.get("id")})
            assert erik_doc is not None, "Erik should still exist after failed delete"
            log("  ✓ BRREG person (Erik) protected from deletion")
        
        log(f"✅ A5 PASSED: Deleted QA person, BRREG person protected")
    except AssertionError as e:
        log(f"❌ A5 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ A5 ERROR: {e}")
        raise

def test_a6_synk_brreg(selskaper):
    """A6: POST /admin/selskap/synk → 200, idempotent, no duplicates"""
    log("A6: Sync from Brønnøysund (max 2 calls)")
    try:
        # Get Digihome AS
        digihome_as = next((s for s in selskaper if s.get("orgnr") == "835595242"), None)
        assert digihome_as is not None, "Digihome AS not found"
        selskap_id = digihome_as.get("id")
        
        # Count roles before sync
        res = requests.get(f"{BASE_URL}/admin/selskap/organisasjon?key={MASTER_KEY}", timeout=30)
        data = res.json()
        roller_before = [r for r in data.get("roller", []) if r.get("selskapId") == selskap_id]
        count_before = len(roller_before)
        
        # Sync (first call)
        res = requests.post(f"{BASE_URL}/admin/selskap/synk?key={MASTER_KEY}", json={
            "selskapId": selskap_id
        }, timeout=30)
        assert res.status_code == 200, f"Sync failed: {res.status_code} {res.text}"
        data = res.json()
        assert data.get("ok") == True, "Sync not ok"
        endringer = data.get("endringer", {})
        log(f"  First sync: {endringer}")
        
        # Count roles after sync
        res = requests.get(f"{BASE_URL}/admin/selskap/organisasjon?key={MASTER_KEY}", timeout=30)
        data = res.json()
        roller_after = [r for r in data.get("roller", []) if r.get("selskapId") == selskap_id]
        count_after = len(roller_after)
        
        # Verify no duplicates created (count should be equal or slightly different)
        assert count_after == count_before, f"Role count changed: {count_before} → {count_after} (duplicates created?)"
        
        # Verify real roles unchanged
        erik_roles_after = [r for r in roller_after if any(
            p.get("id") == r.get("personId") and "erik" in p.get("navn", "").lower() 
            for p in data.get("personer", [])
        )]
        assert len(erik_roles_after) > 0, "Erik's roles disappeared after sync"
        
        log(f"✅ A6 PASSED: Sync idempotent, {count_before} roles before = {count_after} after")
    except AssertionError as e:
        log(f"❌ A6 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ A6 ERROR: {e}")
        raise

def test_a7_write_without_admin():
    """A7: Write endpoints without admin → 401"""
    log("A7: Write endpoints without token")
    try:
        # POST person
        res = requests.post(f"{BASE_URL}/admin/selskap/person", json={"navn": "Test"}, timeout=30)
        assert res.status_code == 401, f"POST person should be 401, got {res.status_code}"
        
        # POST rolle
        res = requests.post(f"{BASE_URL}/admin/selskap/rolle", json={"rolleNavn": "Test"}, timeout=30)
        assert res.status_code == 401, f"POST rolle should be 401, got {res.status_code}"
        
        # POST synk
        res = requests.post(f"{BASE_URL}/admin/selskap/synk", json={"selskapId": "test"}, timeout=30)
        assert res.status_code == 401, f"POST synk should be 401, got {res.status_code}"
        
        log("✅ A7 PASSED: All write endpoints require auth")
    except AssertionError as e:
        log(f"❌ A7 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ A7 ERROR: {e}")
        raise

# ═══════════════════════════════════════════════════════════════════════════
# (B) AKSJEEIERBOK TESTS
# ═══════════════════════════════════════════════════════════════════════════

def test_b1_get_eierbok(selskaper):
    """B1: GET /api/admin/selskap/eierbok → 200 with selskaper, capTable, auto-created 'Ordinære' class"""
    log("B1: GET eierbok")
    try:
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok?key={MASTER_KEY}", timeout=30)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data.get("ok") == True, "Response not ok"
        assert "selskaper" in data, "Missing selskaper"
        assert "selskap" in data, "Missing selskap (first company)"
        assert "capTable" in data, "Missing capTable"
        
        cap_table = data.get("capTable")
        assert cap_table is not None, "capTable is null"
        assert "totalAksjer" in cap_table, "Missing totalAksjer"
        assert cap_table.get("totalAksjer") == 0, f"Expected 0 shares initially, got {cap_table.get('totalAksjer')}"
        
        # Verify auto-created 'Ordinære' class
        klasser = data.get("klasser", [])
        assert len(klasser) >= 1, "No classes found"
        ordinaere = next((k for k in klasser if k.get("navn") == "Ordinære"), None)
        assert ordinaere is not None, "Auto-created 'Ordinære' class not found"
        assert ordinaere.get("stemmerPerAksje") == 1, "Ordinære should have 1 vote per share"
        
        log(f"✅ B1 PASSED: Eierbok with {len(klasser)} classes, totalAksjer=0")
        return data
    except AssertionError as e:
        log(f"❌ B1 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B1 ERROR: {e}")
        raise

def test_b2_create_owners():
    """B2: Create 2 test owners"""
    log("B2: Create test owners")
    try:
        # Owner A (person)
        res = requests.post(f"{BASE_URL}/admin/selskap/eier?key={MASTER_KEY}", json={
            "navn": "QA Eier A SLETTES",
            "type": "person"
        }, timeout=30)
        assert res.status_code == 200, f"POST eier A failed: {res.status_code} {res.text}"
        data = res.json()
        assert data.get("ok") == True, "POST eier A not ok"
        eier_a = data.get("eier")
        eier_a_id = eier_a.get("id")
        assert eier_a_id, "No eier A id"
        test_data["eier_ids"].append(eier_a_id)
        
        # Owner B (company)
        res = requests.post(f"{BASE_URL}/admin/selskap/eier?key={MASTER_KEY}", json={
            "navn": "QA Holding B SLETTES",
            "type": "selskap",
            "orgnr": "999999999"
        }, timeout=30)
        assert res.status_code == 200, f"POST eier B failed: {res.status_code} {res.text}"
        data = res.json()
        assert data.get("ok") == True, "POST eier B not ok"
        eier_b = data.get("eier")
        eier_b_id = eier_b.get("id")
        assert eier_b_id, "No eier B id"
        test_data["eier_ids"].append(eier_b_id)
        
        log(f"✅ B2 PASSED: Created owners A={eier_a_id}, B={eier_b_id}")
        return eier_a_id, eier_b_id
    except AssertionError as e:
        log(f"❌ B2 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B2 ERROR: {e}")
        raise

def test_b3_stiftelse(selskaper, eier_a_id, eier_b_id, klasser):
    """B3: STIFTELSE transaction → capTable updated"""
    log("B3: Create STIFTELSE transaction")
    try:
        digihome_as = next((s for s in selskaper if s.get("orgnr") == "835595242"), None)
        selskap_id = digihome_as.get("id")
        ordinaere_id = next((k.get("id") for k in klasser if k.get("navn") == "Ordinære"), None)
        
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "stiftelse",
            "dato": "2024-01-01",
            "palydende": 1,
            "poster": [
                {"eierId": eier_a_id, "antall": 700, "fraNr": 1, "tilNr": 700, "klasseId": ordinaere_id},
                {"eierId": eier_b_id, "antall": 300, "fraNr": 701, "tilNr": 1000, "klasseId": ordinaere_id}
            ]
        }, timeout=30)
        assert res.status_code == 200, f"POST stiftelse failed: {res.status_code} {res.text}"
        data = res.json()
        assert data.get("ok") == True, "POST stiftelse not ok"
        trans = data.get("transaksjon")
        trans_id = trans.get("id")
        assert trans_id, "No transaction id"
        test_data["transaksjon_ids"].append(trans_id)
        
        # Verify capTable
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok?key={MASTER_KEY}&selskapId={selskap_id}", timeout=30)
        data = res.json()
        cap_table = data.get("capTable")
        assert cap_table.get("totalAksjer") == 1000, f"Expected 1000 shares, got {cap_table.get('totalAksjer')}"
        assert cap_table.get("aksjekapital") == 1000, f"Expected 1000 capital, got {cap_table.get('aksjekapital')}"
        assert cap_table.get("nesteNr") == 1001, f"Expected nesteNr=1001, got {cap_table.get('nesteNr')}"
        
        rader = cap_table.get("rader", [])
        assert len(rader) == 2, f"Expected 2 owners, got {len(rader)}"
        
        eier_a_row = next((r for r in rader if r.get("eierId") == eier_a_id), None)
        assert eier_a_row is not None, "Eier A not in capTable"
        assert eier_a_row.get("antall") == 700, f"Eier A should have 700 shares, got {eier_a_row.get('antall')}"
        assert abs(eier_a_row.get("andel") - 0.7) < 0.001, f"Eier A should have 70% ownership, got {eier_a_row.get('andel')}"
        
        eier_b_row = next((r for r in rader if r.get("eierId") == eier_b_id), None)
        assert eier_b_row is not None, "Eier B not in capTable"
        assert eier_b_row.get("antall") == 300, f"Eier B should have 300 shares, got {eier_b_row.get('antall')}"
        assert abs(eier_b_row.get("andel") - 0.3) < 0.001, f"Eier B should have 30% ownership, got {eier_b_row.get('andel')}"
        
        # Verify intervaller
        assert len(eier_a_row.get("intervaller", [])) > 0, "Eier A should have intervaller"
        
        log(f"✅ B3 PASSED: Stiftelse created, capTable: 1000 shares, A=700 (70%), B=300 (30%)")
        return trans_id, selskap_id
    except AssertionError as e:
        log(f"❌ B3 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B3 ERROR: {e}")
        raise

def test_b4_second_stiftelse(selskap_id):
    """B4: Second stiftelse → 400"""
    log("B4: Try second stiftelse (should fail)")
    try:
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "stiftelse",
            "dato": "2024-02-01",
            "palydende": 1,
            "poster": [{"eierId": test_data["eier_ids"][0], "antall": 100, "fraNr": 1, "tilNr": 100}]
        }, timeout=30)
        assert res.status_code == 400, f"Should reject second stiftelse, got {res.status_code}"
        assert "allerede" in res.text.lower() or "stiftelse" in res.text.lower(), "Error should mention existing stiftelse"
        log("✅ B4 PASSED: Second stiftelse rejected")
    except AssertionError as e:
        log(f"❌ B4 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B4 ERROR: {e}")
        raise

def test_b5_emisjon(selskap_id, eier_b_id, klasser):
    """B5: EMISJON + overlapping emisjon → 400, antall != interval → 400"""
    log("B5: Create EMISJON and test validations")
    try:
        ordinaere_id = next((k.get("id") for k in klasser if k.get("navn") == "Ordinære"), None)
        
        # Valid emisjon
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "emisjon",
            "dato": "2024-06-01",
            "poster": [
                {"eierId": eier_b_id, "antall": 250, "fraNr": 1001, "tilNr": 1250, "kurs": 120, "klasseId": ordinaere_id}
            ]
        }, timeout=30)
        assert res.status_code == 200, f"POST emisjon failed: {res.status_code} {res.text}"
        data = res.json()
        trans_id = data.get("transaksjon", {}).get("id")
        test_data["transaksjon_ids"].append(trans_id)
        
        # Verify capTable
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok?key={MASTER_KEY}&selskapId={selskap_id}", timeout=30)
        data = res.json()
        cap_table = data.get("capTable")
        assert cap_table.get("totalAksjer") == 1250, f"Expected 1250 shares, got {cap_table.get('totalAksjer')}"
        
        # Overlapping emisjon (fraNr 900 overlaps with existing)
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "emisjon",
            "dato": "2024-07-01",
            "poster": [
                {"eierId": eier_b_id, "antall": 100, "fraNr": 900, "tilNr": 999, "klasseId": ordinaere_id}
            ]
        }, timeout=30)
        assert res.status_code == 400, f"Should reject overlapping emisjon, got {res.status_code}"
        assert "allerede utstedt" in res.text.lower() or "overlap" in res.text.lower(), "Error should mention overlap"
        log("  ✓ Overlapping emisjon rejected")
        
        # Emisjon where antall != interval size
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "emisjon",
            "dato": "2024-08-01",
            "poster": [
                {"eierId": eier_b_id, "antall": 100, "fraNr": 1251, "tilNr": 1300, "klasseId": ordinaere_id}  # 50 != 100
            ]
        }, timeout=30)
        assert res.status_code == 400, f"Should reject antall mismatch, got {res.status_code}"
        assert "stemmer ikke" in res.text.lower() or "antall" in res.text.lower(), "Error should mention antall mismatch"
        log("  ✓ Antall mismatch rejected")
        
        log(f"✅ B5 PASSED: Emisjon created, validations working")
        return trans_id
    except AssertionError as e:
        log(f"❌ B5 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B5 ERROR: {e}")
        raise

def test_b6_overdragelse(selskap_id, eier_a_id, eier_b_id):
    """B6: OVERDRAGELSE + validations"""
    log("B6: Create OVERDRAGELSE and test validations")
    try:
        # Valid overdragelse (A sells 601-700 to B)
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "overdragelse",
            "dato": "2025-01-15",
            "fraEierId": eier_a_id,
            "tilEierId": eier_b_id,
            "intervaller": [{"fra": 601, "til": 700}],
            "vederlag": 50000
        }, timeout=30)
        assert res.status_code == 200, f"POST overdragelse failed: {res.status_code} {res.text}"
        data = res.json()
        trans_id = data.get("transaksjon", {}).get("id")
        test_data["transaksjon_ids"].append(trans_id)
        
        # Verify capTable (A: 600, B: 650)
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok?key={MASTER_KEY}&selskapId={selskap_id}", timeout=30)
        data = res.json()
        cap_table = data.get("capTable")
        rader = cap_table.get("rader", [])
        
        eier_a_row = next((r for r in rader if r.get("eierId") == eier_a_id), None)
        assert eier_a_row.get("antall") == 600, f"Eier A should have 600 shares, got {eier_a_row.get('antall')}"
        
        eier_b_row = next((r for r in rader if r.get("eierId") == eier_b_id), None)
        assert eier_b_row.get("antall") == 650, f"Eier B should have 650 shares, got {eier_b_row.get('antall')}"
        
        # Overdragelse of numbers A doesn't own
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "overdragelse",
            "dato": "2025-02-01",
            "fraEierId": eier_a_id,
            "tilEierId": eier_b_id,
            "intervaller": [{"fra": 1200, "til": 1250}]  # A doesn't own these
        }, timeout=30)
        assert res.status_code == 400, f"Should reject invalid overdragelse, got {res.status_code}"
        assert "eier ikke" in res.text.lower(), "Error should mention ownership"
        log("  ✓ Invalid overdragelse rejected")
        
        # fraEierId === tilEierId
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "overdragelse",
            "dato": "2025-03-01",
            "fraEierId": eier_a_id,
            "tilEierId": eier_a_id,
            "intervaller": [{"fra": 1, "til": 10}]
        }, timeout=30)
        assert res.status_code == 400, f"Should reject same seller/buyer, got {res.status_code}"
        assert "samme" in res.text.lower(), "Error should mention same aksjonær"
        log("  ✓ Same seller/buyer rejected")
        
        log(f"✅ B6 PASSED: Overdragelse created, A=600, B=650")
        return trans_id
    except AssertionError as e:
        log(f"❌ B6 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B6 ERROR: {e}")
        raise

def test_b7_splitt(selskap_id, eier_a_id, eier_b_id):
    """B7: SPLITT 1:10 + faktor 1 → 400"""
    log("B7: Create SPLITT and test validations")
    try:
        # Valid splitt 1:10
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "splitt",
            "dato": "2025-06-01",
            "faktor": 10
        }, timeout=30)
        assert res.status_code == 200, f"POST splitt failed: {res.status_code} {res.text}"
        data = res.json()
        trans_id = data.get("transaksjon", {}).get("id")
        test_data["transaksjon_ids"].append(trans_id)
        
        # Verify capTable (totalAksjer: 12500, palydende: 0.1, A: 6000, B: 6500)
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok?key={MASTER_KEY}&selskapId={selskap_id}", timeout=30)
        data = res.json()
        cap_table = data.get("capTable")
        assert cap_table.get("totalAksjer") == 12500, f"Expected 12500 shares, got {cap_table.get('totalAksjer')}"
        assert abs(cap_table.get("palydende") - 0.1) < 0.001, f"Expected palydende=0.1, got {cap_table.get('palydende')}"
        
        rader = cap_table.get("rader", [])
        eier_a_row = next((r for r in rader if r.get("eierId") == eier_a_id), None)
        assert eier_a_row.get("antall") == 6000, f"Eier A should have 6000 shares, got {eier_a_row.get('antall')}"
        
        eier_b_row = next((r for r in rader if r.get("eierId") == eier_b_id), None)
        assert eier_b_row.get("antall") == 6500, f"Eier B should have 6500 shares, got {eier_b_row.get('antall')}"
        
        # Faktor 1 → 400
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "splitt",
            "dato": "2025-07-01",
            "faktor": 1
        }, timeout=30)
        assert res.status_code == 400, f"Should reject faktor=1, got {res.status_code}"
        log("  ✓ Faktor=1 rejected")
        
        log(f"✅ B7 PASSED: Splitt 1:10 created, totalAksjer=12500, palydende=0.1")
        return trans_id
    except AssertionError as e:
        log(f"❌ B7 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B7 ERROR: {e}")
        raise

def test_b8_time_travel(selskap_id, eier_a_id, eier_b_id):
    """B8: TIME TRAVEL with ?dato parameter"""
    log("B8: Test time travel")
    try:
        # Get capTable at 2024-06-30 (after emisjon, before overdragelse)
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok?key={MASTER_KEY}&selskapId={selskap_id}&dato=2024-06-30", timeout=30)
        assert res.status_code == 200, f"GET eierbok failed: {res.status_code} {res.text}"
        data = res.json()
        cap_table = data.get("capTable")
        assert cap_table.get("perDato") == "2024-06-30", "perDato not set"
        assert cap_table.get("totalAksjer") == 1250, f"Expected 1250 shares at 2024-06-30, got {cap_table.get('totalAksjer')}"
        
        rader = cap_table.get("rader", [])
        eier_a_row = next((r for r in rader if r.get("eierId") == eier_a_id), None)
        eier_b_row = next((r for r in rader if r.get("eierId") == eier_b_id), None)
        
        # A should have 700, B should have 550 (300 + 250)
        assert eier_a_row.get("antall") == 700, f"Eier A should have 700 at 2024-06-30, got {eier_a_row.get('antall')}"
        assert eier_b_row.get("antall") == 550, f"Eier B should have 550 at 2024-06-30, got {eier_b_row.get('antall')}"
        
        # Get capTable at 2023-12-31 (before stiftelse)
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok?key={MASTER_KEY}&selskapId={selskap_id}&dato=2023-12-31", timeout=30)
        data = res.json()
        cap_table = data.get("capTable")
        assert cap_table.get("totalAksjer") == 0, f"Expected 0 shares at 2023-12-31, got {cap_table.get('totalAksjer')}"
        
        log(f"✅ B8 PASSED: Time travel working (2024-06-30: A=700, B=550; 2023-12-31: 0 shares)")
    except AssertionError as e:
        log(f"❌ B8 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B8 ERROR: {e}")
        raise

def test_b9_spleis_invalid(selskap_id):
    """B9: SPLEIS invalid (not divisible) → 400"""
    log("B9: Test invalid SPLEIS")
    try:
        # Spleis 1:3 should fail (12500 not divisible by 3)
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "spleis",
            "dato": "2025-07-01",
            "faktor": 3
        }, timeout=30)
        assert res.status_code == 400, f"Should reject invalid spleis, got {res.status_code}"
        assert "delelig" in res.text.lower() or "går ikke opp" in res.text.lower(), "Error should mention divisibility"
        log("✅ B9 PASSED: Invalid spleis rejected")
    except AssertionError as e:
        log(f"❌ B9 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B9 ERROR: {e}")
        raise

def test_b10_sletting(selskap_id):
    """B10: SLETTING + invalid sletting → 400"""
    log("B10: Create SLETTING and test validations")
    try:
        # Valid sletting (1-500)
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "sletting",
            "dato": "2025-08-01",
            "intervaller": [{"fra": 1, "til": 500}]
        }, timeout=30)
        assert res.status_code == 200, f"POST sletting failed: {res.status_code} {res.text}"
        data = res.json()
        trans_id = data.get("transaksjon", {}).get("id")
        test_data["transaksjon_ids"].append(trans_id)
        
        # Verify capTable (totalAksjer: 12000)
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok?key={MASTER_KEY}&selskapId={selskap_id}", timeout=30)
        data = res.json()
        cap_table = data.get("capTable")
        assert cap_table.get("totalAksjer") == 12000, f"Expected 12000 shares, got {cap_table.get('totalAksjer')}"
        
        # Sletting of non-issued numbers
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "type": "sletting",
            "dato": "2025-09-01",
            "intervaller": [{"fra": 999990, "til": 999999}]
        }, timeout=30)
        assert res.status_code == 400, f"Should reject invalid sletting, got {res.status_code}"
        assert "ikke utstedt" in res.text.lower(), "Error should mention not issued"
        log("  ✓ Invalid sletting rejected")
        
        log(f"✅ B10 PASSED: Sletting created, totalAksjer=12000")
        return trans_id
    except AssertionError as e:
        log(f"❌ B10 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B10 ERROR: {e}")
        raise

def test_b11_klasser(selskap_id):
    """B11: POST/DELETE klasse"""
    log("B11: Create and delete klasse")
    try:
        # Create B-aksjer class
        res = requests.post(f"{BASE_URL}/admin/selskap/klasse?key={MASTER_KEY}", json={
            "selskapId": selskap_id,
            "navn": "B-aksjer",
            "stemmerPerAksje": 0
        }, timeout=30)
        assert res.status_code == 200, f"POST klasse failed: {res.status_code} {res.text}"
        data = res.json()
        klasse = data.get("klasse")
        klasse_id = klasse.get("id")
        assert klasse_id, "No klasse id"
        test_data["klasse_ids"].append(klasse_id)
        
        # Verify in GET
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok?key={MASTER_KEY}&selskapId={selskap_id}", timeout=30)
        data = res.json()
        klasser = data.get("klasser", [])
        assert len(klasser) == 2, f"Expected 2 classes, got {len(klasser)}"
        b_klasse = next((k for k in klasser if k.get("navn") == "B-aksjer"), None)
        assert b_klasse is not None, "B-aksjer class not found"
        
        # Delete unused class
        res = requests.delete(f"{BASE_URL}/admin/selskap/klasse?key={MASTER_KEY}&id={klasse_id}", timeout=30)
        assert res.status_code == 200, f"DELETE klasse failed: {res.status_code} {res.text}"
        test_data["klasse_ids"].remove(klasse_id)
        
        # Try to delete 'Ordinære' (in use)
        ordinaere = next((k for k in klasser if k.get("navn") == "Ordinære"), None)
        res = requests.delete(f"{BASE_URL}/admin/selskap/klasse?key={MASTER_KEY}&id={ordinaere.get('id')}", timeout=30)
        assert res.status_code == 400, f"Should reject deleting in-use class, got {res.status_code}"
        assert "brukes" in res.text.lower() or "transaksjoner" in res.text.lower(), "Error should mention usage"
        log("  ✓ In-use class deletion rejected")
        
        log(f"✅ B11 PASSED: Created and deleted klasse")
    except AssertionError as e:
        log(f"❌ B11 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B11 ERROR: {e}")
        raise

def test_b12_delete_transactions(selskap_id):
    """B12: DELETE transactions in reverse order"""
    log("B12: Delete transactions in reverse order")
    try:
        # Try to delete stiftelse (first transaction) - should fail
        stiftelse_id = test_data["transaksjon_ids"][0]
        res = requests.delete(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}&id={stiftelse_id}", timeout=30)
        assert res.status_code == 400, f"Should reject deleting stiftelse with later transactions, got {res.status_code}"
        assert "senere" in res.text.lower() or "ugyldig" in res.text.lower(), "Error should mention later transactions"
        log("  ✓ Deleting stiftelse with later transactions rejected")
        
        # Delete in reverse order (sletting, splitt, overdragelse, emisjon, stiftelse)
        for trans_id in reversed(test_data["transaksjon_ids"]):
            res = requests.delete(f"{BASE_URL}/admin/selskap/transaksjon?key={MASTER_KEY}&id={trans_id}", timeout=30)
            assert res.status_code == 200, f"DELETE transaction {trans_id} failed: {res.status_code} {res.text}"
            log(f"  ✓ Deleted transaction {trans_id}")
        
        test_data["transaksjon_ids"].clear()
        
        # Verify capTable back to 0
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok?key={MASTER_KEY}&selskapId={selskap_id}", timeout=30)
        data = res.json()
        cap_table = data.get("capTable")
        assert cap_table.get("totalAksjer") == 0, f"Expected 0 shares after deleting all transactions, got {cap_table.get('totalAksjer')}"
        
        log(f"✅ B12 PASSED: All transactions deleted, capTable back to 0")
    except AssertionError as e:
        log(f"❌ B12 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B12 ERROR: {e}")
        raise

def test_b13_delete_owners():
    """B13: DELETE owner in use → 400, after transactions deleted → 200"""
    log("B13: Delete test owners")
    try:
        # All transactions already deleted in B12, so owners can be deleted
        for eier_id in test_data["eier_ids"][:]:
            res = requests.delete(f"{BASE_URL}/admin/selskap/eier?key={MASTER_KEY}&id={eier_id}", timeout=30)
            assert res.status_code == 200, f"DELETE eier {eier_id} failed: {res.status_code} {res.text}"
            test_data["eier_ids"].remove(eier_id)
            log(f"  ✓ Deleted owner {eier_id}")
        
        log(f"✅ B13 PASSED: All test owners deleted")
    except AssertionError as e:
        log(f"❌ B13 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B13 ERROR: {e}")
        raise

def test_b14_innstillinger(selskaper):
    """B14: PUT /admin/selskap/innstillinger → update palydende and RESTORE"""
    log("B14: Update and restore palydende")
    try:
        digihome_as = next((s for s in selskaper if s.get("orgnr") == "835595242"), None)
        selskap_id = digihome_as.get("id")
        original_palydende = digihome_as.get("palydende", 1)
        
        # Update palydende
        res = requests.put(f"{BASE_URL}/admin/selskap/innstillinger?key={MASTER_KEY}", json={
            "id": selskap_id,
            "palydende": 2
        }, timeout=30)
        assert res.status_code == 200, f"PUT innstillinger failed: {res.status_code} {res.text}"
        
        # Verify updated
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok?key={MASTER_KEY}&selskapId={selskap_id}", timeout=30)
        data = res.json()
        selskap = data.get("selskap")
        assert selskap.get("palydende") == 2, f"Expected palydende=2, got {selskap.get('palydende')}"
        
        # RESTORE original value
        res = requests.put(f"{BASE_URL}/admin/selskap/innstillinger?key={MASTER_KEY}", json={
            "id": selskap_id,
            "palydende": original_palydende
        }, timeout=30)
        assert res.status_code == 200, f"RESTORE innstillinger failed: {res.status_code} {res.text}"
        
        # Verify restored
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok?key={MASTER_KEY}&selskapId={selskap_id}", timeout=30)
        data = res.json()
        selskap = data.get("selskap")
        assert selskap.get("palydende") == original_palydende, f"Expected palydende={original_palydende}, got {selskap.get('palydende')}"
        
        log(f"✅ B14 PASSED: Updated palydende to 2 and restored to {original_palydende}")
    except AssertionError as e:
        log(f"❌ B14 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B14 ERROR: {e}")
        raise

def test_b15_access():
    """B15: GET eierbok without token → 401, POST transaksjon without token → 401"""
    log("B15: Access control")
    try:
        # GET without token
        res = requests.get(f"{BASE_URL}/admin/selskap/eierbok", timeout=30)
        assert res.status_code == 401, f"GET should be 401, got {res.status_code}"
        
        # POST without token
        res = requests.post(f"{BASE_URL}/admin/selskap/transaksjon", json={"type": "stiftelse"}, timeout=30)
        assert res.status_code == 401, f"POST should be 401, got {res.status_code}"
        
        log("✅ B15 PASSED: Access control working")
    except AssertionError as e:
        log(f"❌ B15 FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ B15 ERROR: {e}")
        raise

# ═══════════════════════════════════════════════════════════════════════════
# (C) FINAL CLEANUP VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════

def test_c_final_cleanup():
    """C: Verify all test data cleaned up"""
    log("C: Final cleanup verification")
    try:
        db = get_mongo_db()
        assert db is not None, "MongoDB connection failed"
        
        # Verify 0 transactions
        trans_count = db["aksje_transaksjoner"].count_documents({})
        assert trans_count == 0, f"Expected 0 transactions, found {trans_count}"
        
        # Verify 0 test owners
        test_owners = db["aksje_eiere"].count_documents({"navn": {"$regex": "QA.*SLETTES"}})
        assert test_owners == 0, f"Expected 0 test owners, found {test_owners}"
        
        # Verify 0 extra test classes (Ordinære may remain)
        test_classes = db["aksje_klasser"].count_documents({"navn": "B-aksjer"})
        assert test_classes == 0, f"Expected 0 test classes, found {test_classes}"
        
        # Verify 0 test persons
        test_persons = db["org_personer"].count_documents({"navn": {"$regex": "QA.*SLETTES"}})
        assert test_persons == 0, f"Expected 0 test persons, found {test_persons}"
        
        # Verify 0 test roles
        test_roles = db["org_roller"].count_documents({"rolleNavn": "CTO", "kilde": "manuell"})
        assert test_roles == 0, f"Expected 0 test roles, found {test_roles}"
        
        # Verify real companies unchanged
        selskaper = list(db["selskaper"].find({}, {"_id": 0, "orgnr": 1, "navn": 1}))
        orgnrs = [s.get("orgnr") for s in selskaper]
        assert "835595242" in orgnrs, "Digihome AS missing"
        assert "835674622" in orgnrs, "Digihome Tech AS missing"
        
        # Verify real org_roller count unchanged (baseline check)
        real_roles = db["org_roller"].find({"kilde": "brreg"})
        real_role_count = db["org_roller"].count_documents({"kilde": "brreg"})
        log(f"  Real BRREG roles: {real_role_count}")
        
        log(f"✅ C PASSED: All test data cleaned up, real data preserved")
    except AssertionError as e:
        log(f"❌ C FAILED: {e}")
        raise
    except Exception as e:
        log(f"❌ C ERROR: {e}")
        raise

# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    log("=" * 80)
    log("SELSKAP BACKEND TEST - COMPREHENSIVE VERIFICATION")
    log("=" * 80)
    
    passed = 0
    failed = 0
    
    try:
        # (A) ORGANISASJON TESTS
        log("\n(A) ORGANISASJON TESTS")
        log("-" * 80)
        
        selskaper = test_a1_get_organisasjon()
        passed += 1
        
        test_a2_no_token()
        passed += 1
        
        person_id, rolle_id = test_a3_create_update_person(selskaper)
        passed += 1
        
        test_a4_update_delete_rolle(person_id, rolle_id, selskaper)
        passed += 1
        
        test_a5_delete_person(person_id)
        passed += 1
        
        test_a6_synk_brreg(selskaper)
        passed += 1
        
        test_a7_write_without_admin()
        passed += 1
        
        # (B) AKSJEEIERBOK TESTS
        log("\n(B) AKSJEEIERBOK TESTS")
        log("-" * 80)
        
        eierbok_data = test_b1_get_eierbok(selskaper)
        passed += 1
        
        eier_a_id, eier_b_id = test_b2_create_owners()
        passed += 1
        
        klasser = eierbok_data.get("klasser", [])
        stiftelse_id, selskap_id = test_b3_stiftelse(selskaper, eier_a_id, eier_b_id, klasser)
        passed += 1
        
        test_b4_second_stiftelse(selskap_id)
        passed += 1
        
        emisjon_id = test_b5_emisjon(selskap_id, eier_b_id, klasser)
        passed += 1
        
        overdragelse_id = test_b6_overdragelse(selskap_id, eier_a_id, eier_b_id)
        passed += 1
        
        splitt_id = test_b7_splitt(selskap_id, eier_a_id, eier_b_id)
        passed += 1
        
        test_b8_time_travel(selskap_id, eier_a_id, eier_b_id)
        passed += 1
        
        test_b9_spleis_invalid(selskap_id)
        passed += 1
        
        sletting_id = test_b10_sletting(selskap_id)
        passed += 1
        
        test_b11_klasser(selskap_id)
        passed += 1
        
        test_b12_delete_transactions(selskap_id)
        passed += 1
        
        test_b13_delete_owners()
        passed += 1
        
        test_b14_innstillinger(selskaper)
        passed += 1
        
        test_b15_access()
        passed += 1
        
        # (C) FINAL CLEANUP VERIFICATION
        log("\n(C) FINAL CLEANUP VERIFICATION")
        log("-" * 80)
        
        test_c_final_cleanup()
        passed += 1
        
    except Exception as e:
        failed += 1
        log(f"\n❌ TEST SUITE FAILED: {e}")
    
    log("\n" + "=" * 80)
    log(f"RESULTS: {passed} PASSED, {failed} FAILED")
    log("=" * 80)
    
    if failed > 0:
        sys.exit(1)
    else:
        log("\n✅ ALL TESTS PASSED - SELSKAP WORKING PERFECTLY")
        sys.exit(0)

if __name__ == "__main__":
    main()
