#!/usr/bin/env python3
"""
Backend test for Org-kart: Blue Sky-dedupe
Tests GET /admin/selskap/brreg-sok, POST /admin/selskap/stotte, and dedupe self-healing
"""
import requests
import json
import time
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
OWNER_EMAIL = "martin@kviteberg.no"
OWNER_PASSWORD = "Pyramiden2025##"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Global variables
owner_token = None
digihome_as_id = None

def login_owner():
    """Login as owner and get session token"""
    global owner_token
    print("\n=== OWNER LOGIN ===")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD},
            timeout=30
        )
        print(f"Login response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            owner_token = data.get("token")
            print(f"✅ Owner login successful, got token: {owner_token[:20]}...")
            return True
        else:
            print(f"❌ Owner login failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Owner login exception: {e}")
        return False

def get_digihome_as_id():
    """Get DIGIHOME AS company ID from organisasjon endpoint"""
    global digihome_as_id
    print("\n=== GET DIGIHOME AS ID ===")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            params={"key": owner_token},
            timeout=30
        )
        print(f"Organisasjon response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            selskaper = data.get("selskaper", [])
            for selskap in selskaper:
                if "DIGIHOME AS" in selskap.get("navn", "").upper():
                    digihome_as_id = selskap.get("id")
                    print(f"✅ Found DIGIHOME AS with id: {digihome_as_id}")
                    return True
            print(f"❌ DIGIHOME AS not found in selskaper: {[s.get('navn') for s in selskaper]}")
            return False
        else:
            print(f"❌ Failed to get organisasjon: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Get DIGIHOME AS ID exception: {e}")
        return False

def test_brreg_sok_blue_sky():
    """(A1) Test BRreg search for 'blue sky economy' - should return BOTH orgnr"""
    print("\n=== TEST A1: BRreg search for 'blue sky economy' ===")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/selskap/brreg-sok",
            params={"key": owner_token, "q": "blue sky economy"},
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                treff = data.get("treff", [])
                print(f"Found {len(treff)} results")
                orgnr_list = [t.get("orgnr") for t in treff]
                print(f"Orgnr list: {orgnr_list}")
                
                # Check if both Blue Sky entities are present
                has_921171986 = "921171986" in orgnr_list
                has_936595960 = "936595960" in orgnr_list
                
                if has_921171986 and has_936595960:
                    print(f"✅ TEST A1 PASSED: Both Blue Sky entities found (921171986 and 936595960)")
                    return True
                else:
                    print(f"❌ TEST A1 FAILED: Missing Blue Sky entities. 921171986: {has_921171986}, 936595960: {has_936595960}")
                    return False
            else:
                print(f"❌ TEST A1 FAILED: Response not ok: {data}")
                return False
        else:
            print(f"❌ TEST A1 FAILED: Status {response.status_code}, response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ TEST A1 EXCEPTION: {e}")
        return False

def test_brreg_sok_specific_orgnr():
    """(A2) Test BRreg search for specific orgnr 936595960"""
    print("\n=== TEST A2: BRreg search for orgnr 936595960 ===")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/selskap/brreg-sok",
            params={"key": owner_token, "q": "936595960"},
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                treff = data.get("treff", [])
                print(f"Found {len(treff)} results")
                
                if len(treff) == 1:
                    result = treff[0]
                    orgnr = result.get("orgnr")
                    navn = result.get("navn")
                    adresse = result.get("adresse")
                    
                    print(f"Result: orgnr={orgnr}, navn={navn}, adresse={adresse}")
                    
                    if orgnr == "936595960" and "BLUE SKY ECONOMY BERGEN AS" in navn.upper():
                        print(f"✅ TEST A2 PASSED: Exact match for 936595960 with correct name and fields")
                        return True
                    else:
                        print(f"❌ TEST A2 FAILED: Orgnr or name mismatch")
                        return False
                else:
                    print(f"❌ TEST A2 FAILED: Expected 1 result, got {len(treff)}")
                    return False
            else:
                print(f"❌ TEST A2 FAILED: Response not ok: {data}")
                return False
        else:
            print(f"❌ TEST A2 FAILED: Status {response.status_code}, response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ TEST A2 EXCEPTION: {e}")
        return False

def test_brreg_sok_empty_query():
    """(A3) Test BRreg search with empty query - should return 400"""
    print("\n=== TEST A3: BRreg search with empty query ===")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/selskap/brreg-sok",
            params={"key": owner_token, "q": ""},
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code == 400:
            print(f"✅ TEST A3 PASSED: Empty query returns 400 as expected")
            return True
        else:
            print(f"❌ TEST A3 FAILED: Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ TEST A3 EXCEPTION: {e}")
        return False

def test_brreg_sok_no_auth():
    """(A4) Test BRreg search without auth - should return 401"""
    print("\n=== TEST A4: BRreg search without auth ===")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/selskap/brreg-sok",
            params={"q": "test"},
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code == 401:
            print(f"✅ TEST A4 PASSED: No auth returns 401 as expected")
            return True
        else:
            print(f"❌ TEST A4 FAILED: Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ TEST A4 EXCEPTION: {e}")
        return False

def test_stotte_create():
    """(B1) Test POST /admin/selskap/stotte - create new support company"""
    print("\n=== TEST B1: Create support company ===")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/selskap/stotte",
            params={"key": owner_token},
            json={
                "selskapId": digihome_as_id,
                "navn": "QAFIX ADVOKAT AS",
                "orgnr": "999 777 555",
                "rolleNavn": "Juridisk"
            },
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("ok"):
                person = data.get("person", {})
                rolle = data.get("rolle", {})
                
                # Verify person fields
                er_enhet = person.get("erEnhet") == True
                orgnr = person.get("orgnr") == "999777555"  # Normalized
                
                # Verify rolle fields
                gruppe = rolle.get("gruppe") == "annet"
                rolle_navn = rolle.get("rolleNavn") == "Juridisk"
                gjenbrukt_enhet = data.get("gjenbruktEnhet") == False
                
                print(f"Checks: erEnhet={er_enhet}, orgnr={orgnr}, gruppe={gruppe}, rolleNavn={rolle_navn}, gjenbruktEnhet={gjenbrukt_enhet}")
                
                if er_enhet and orgnr and gruppe and rolle_navn and gjenbrukt_enhet:
                    print(f"✅ TEST B1 PASSED: Support company created successfully")
                    return True
                else:
                    print(f"❌ TEST B1 FAILED: Field validation failed")
                    return False
            else:
                print(f"❌ TEST B1 FAILED: Response not ok: {data}")
                return False
        else:
            print(f"❌ TEST B1 FAILED: Status {response.status_code}, response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ TEST B1 EXCEPTION: {e}")
        return False

def test_stotte_idempotent_same_orgnr():
    """(B2) Test POST /admin/selskap/stotte - idempotency with same orgnr but different name"""
    print("\n=== TEST B2: Idempotency test - same orgnr, different name ===")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/selskap/stotte",
            params={"key": owner_token},
            json={
                "selskapId": digihome_as_id,
                "navn": "QAFIX ADVOKAT ANNET NAVN AS",
                "orgnr": "999 777 555",
                "rolleNavn": "Juridisk"
            },
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("ok"):
                gjenbrukt_enhet = data.get("gjenbruktEnhet") == True
                gjenbrukt_rolle = data.get("gjenbruktRolle") == True
                
                print(f"Checks: gjenbruktEnhet={gjenbrukt_enhet}, gjenbruktRolle={gjenbrukt_rolle}")
                
                # Verify in MongoDB: exactly 1 person with orgnr 999777555
                person_count = db.org_personer.count_documents({"orgnr": "999777555"})
                print(f"MongoDB person count for orgnr 999777555: {person_count}")
                
                # Get person ID and verify exactly 1 rolle
                person = db.org_personer.find_one({"orgnr": "999777555"})
                if person:
                    person_id = person.get("id")
                    rolle_count = db.org_roller.count_documents({"personId": person_id})
                    print(f"MongoDB rolle count for personId {person_id}: {rolle_count}")
                    
                    if gjenbrukt_enhet and gjenbrukt_rolle and person_count == 1 and rolle_count == 1:
                        print(f"✅ TEST B2 PASSED: Idempotency working - reused entity and role")
                        return True
                    else:
                        print(f"❌ TEST B2 FAILED: Idempotency check failed")
                        return False
                else:
                    print(f"❌ TEST B2 FAILED: Person not found in MongoDB")
                    return False
            else:
                print(f"❌ TEST B2 FAILED: Response not ok: {data}")
                return False
        else:
            print(f"❌ TEST B2 FAILED: Status {response.status_code}, response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ TEST B2 EXCEPTION: {e}")
        return False

def test_stotte_new_role_same_orgnr():
    """(B3) Test POST /admin/selskap/stotte - same orgnr, different role"""
    print("\n=== TEST B3: Same orgnr, different role ===")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/selskap/stotte",
            params={"key": owner_token},
            json={
                "selskapId": digihome_as_id,
                "navn": "QAFIX ADVOKAT AS",
                "orgnr": "999 777 555",
                "rolleNavn": "Compliance"
            },
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("ok"):
                gjenbrukt_enhet = data.get("gjenbruktEnhet") == True
                gjenbrukt_rolle = data.get("gjenbruktRolle") == False
                
                print(f"Checks: gjenbruktEnhet={gjenbrukt_enhet}, gjenbruktRolle (should be False)={gjenbrukt_rolle}")
                
                # Verify in MongoDB: exactly 1 person with orgnr 999777555 and 2 roles
                person_count = db.org_personer.count_documents({"orgnr": "999777555"})
                print(f"MongoDB person count for orgnr 999777555: {person_count}")
                
                person = db.org_personer.find_one({"orgnr": "999777555"})
                if person:
                    person_id = person.get("id")
                    rolle_count = db.org_roller.count_documents({"personId": person_id})
                    print(f"MongoDB rolle count for personId {person_id}: {rolle_count}")
                    
                    if gjenbrukt_enhet and gjenbrukt_rolle and person_count == 1 and rolle_count == 2:
                        print(f"✅ TEST B3 PASSED: New role created for existing entity")
                        return True
                    else:
                        print(f"❌ TEST B3 FAILED: Role creation check failed (gjenbruktEnhet={gjenbrukt_enhet}, gjenbruktRolle={gjenbrukt_rolle}, person_count={person_count}, rolle_count={rolle_count})")
                        return False
                else:
                    print(f"❌ TEST B3 FAILED: Person not found in MongoDB")
                    return False
            else:
                print(f"❌ TEST B3 FAILED: Response not ok: {data}")
                return False
        else:
            print(f"❌ TEST B3 FAILED: Status {response.status_code}, response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ TEST B3 EXCEPTION: {e}")
        return False

def test_stotte_validations():
    """(B4) Test POST /admin/selskap/stotte - validations"""
    print("\n=== TEST B4: Validation tests ===")
    
    # Test without key
    print("\n--- B4.1: Without key ---")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/selskap/stotte",
            json={"selskapId": digihome_as_id, "navn": "Test", "orgnr": "999777555", "rolleNavn": "Test"},
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code != 401:
            print(f"❌ TEST B4.1 FAILED: Expected 401, got {response.status_code}")
            return False
        print(f"✅ TEST B4.1 PASSED: No auth returns 401")
    except Exception as e:
        print(f"❌ TEST B4.1 EXCEPTION: {e}")
        return False
    
    # Test with invalid orgnr
    print("\n--- B4.2: Invalid orgnr ---")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/selskap/stotte",
            params={"key": owner_token},
            json={"selskapId": digihome_as_id, "navn": "Test", "orgnr": "12345", "rolleNavn": "Test"},
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code != 400:
            print(f"❌ TEST B4.2 FAILED: Expected 400, got {response.status_code}")
            return False
        print(f"✅ TEST B4.2 PASSED: Invalid orgnr returns 400")
    except Exception as e:
        print(f"❌ TEST B4.2 EXCEPTION: {e}")
        return False
    
    # Test without rolleNavn
    print("\n--- B4.3: Without rolleNavn ---")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/selskap/stotte",
            params={"key": owner_token},
            json={"selskapId": digihome_as_id, "navn": "Test", "orgnr": "999777555"},
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code != 400:
            print(f"❌ TEST B4.3 FAILED: Expected 400, got {response.status_code}")
            return False
        print(f"✅ TEST B4.3 PASSED: Missing rolleNavn returns 400")
    except Exception as e:
        print(f"❌ TEST B4.3 EXCEPTION: {e}")
        return False
    
    # Test without navn
    print("\n--- B4.4: Without navn ---")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/selskap/stotte",
            params={"key": owner_token},
            json={"selskapId": digihome_as_id, "orgnr": "999777555", "rolleNavn": "Test"},
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code != 400:
            print(f"❌ TEST B4.4 FAILED: Expected 400, got {response.status_code}")
            return False
        print(f"✅ TEST B4.4 PASSED: Missing navn returns 400")
    except Exception as e:
        print(f"❌ TEST B4.4 EXCEPTION: {e}")
        return False
    
    # Test with unknown selskapId
    print("\n--- B4.5: Unknown selskapId ---")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/selskap/stotte",
            params={"key": owner_token},
            json={"selskapId": "unknown-id-12345", "navn": "Test", "orgnr": "999777555", "rolleNavn": "Test"},
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code != 400:
            print(f"❌ TEST B4.5 FAILED: Expected 400, got {response.status_code}")
            return False
        print(f"✅ TEST B4.5 PASSED: Unknown selskapId returns 400")
    except Exception as e:
        print(f"❌ TEST B4.5 EXCEPTION: {e}")
        return False
    
    print(f"✅ TEST B4 PASSED: All validation tests passed")
    return True

def test_dedupe_self_healing():
    """(C) Test dedupe self-healing by inserting duplicate entities in MongoDB"""
    print("\n=== TEST C: Dedupe self-healing ===")
    
    # C1: Insert 2 duplicate entities with same orgnr
    print("\n--- C1: Insert duplicate entities ---")
    try:
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
        
        # Insert first person
        person1 = {
            "id": "qafix-dupe-1",
            "navn": "QAFIX DUPETEST AS",
            "navnNorm": "qafix dupetest as",
            "erEnhet": True,
            "orgnr": "999111222",
            "kilde": "brreg",
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "bilde": None,
            "epost": "qa@example.com",
            "telefon": None,
            "linkedin": None,
            "bio": None,
            "tittel": None,
            "fodselsdato": None
        }
        db.org_personer.insert_one(person1)
        print(f"Inserted person1: qafix-dupe-1")
        
        # Insert second person (duplicate with different name, no email)
        person2 = {
            "id": "qafix-dupe-2",
            "navn": "QAFIX DUPETEST GAMMEL AS",
            "navnNorm": "qafix dupetest gammel as",
            "erEnhet": True,
            "orgnr": "999111222",
            "kilde": "brreg",
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "bilde": None,
            "epost": None,
            "telefon": None,
            "linkedin": None,
            "bio": None,
            "tittel": None,
            "fodselsdato": None
        }
        db.org_personer.insert_one(person2)
        print(f"Inserted person2: qafix-dupe-2")
        
        # Insert roles for both persons
        rolle1 = {
            "id": "qafix-drolle-1",
            "selskapId": digihome_as_id,
            "personId": "qafix-dupe-1",
            "rolleKode": "REGN",
            "rolleNavn": "Regnskapsfører",
            "gruppe": "annet",
            "kilde": "brreg",
            "brregBorte": False,
            "skjult": False,
            "rekkefolge": 0,
            "createdAt": now_iso
        }
        db.org_roller.insert_one(rolle1)
        print(f"Inserted rolle1: qafix-drolle-1")
        
        rolle2 = {
            "id": "qafix-drolle-2",
            "selskapId": digihome_as_id,
            "personId": "qafix-dupe-2",
            "rolleKode": "REGN",
            "rolleNavn": "Regnskapsfører",
            "gruppe": "annet",
            "kilde": "brreg",
            "brregBorte": False,
            "skjult": False,
            "rekkefolge": 0,
            "createdAt": now_iso
        }
        db.org_roller.insert_one(rolle2)
        print(f"Inserted rolle2: qafix-drolle-2")
        
        print(f"✅ C1 PASSED: Inserted duplicate entities")
    except Exception as e:
        print(f"❌ C1 EXCEPTION: {e}")
        return False
    
    # C2: Call GET /admin/selskap/organisasjon - should trigger self-healing
    print("\n--- C2: Trigger self-healing via GET organisasjon ---")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            params={"key": owner_token},
            timeout=30
        )
        print(f"Response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            personer = data.get("personer", [])
            roller = data.get("roller", [])
            
            # Count persons with orgnr 999111222
            persons_with_orgnr = [p for p in personer if p.get("orgnr") == "999111222"]
            print(f"Persons with orgnr 999111222: {len(persons_with_orgnr)}")
            
            # Count roles with qafix-drolle-* id
            qafix_roles = [r for r in roller if r.get("id", "").startswith("qafix-drolle-")]
            print(f"QAFIX roles: {len(qafix_roles)}")
            
            if len(persons_with_orgnr) == 1 and len(qafix_roles) == 1:
                # Check that the keeper has email (most enriched)
                keeper = persons_with_orgnr[0]
                has_email = keeper.get("epost") == "qa@example.com"
                print(f"Keeper has email 'qa@example.com': {has_email}")
                
                if has_email:
                    print(f"✅ C2 PASSED: Self-healing dedupe worked - 1 person, 1 role, keeper has email")
                else:
                    print(f"❌ C2 FAILED: Keeper doesn't have expected email")
                    return False
            else:
                print(f"❌ C2 FAILED: Expected 1 person and 1 role, got {len(persons_with_orgnr)} persons and {len(qafix_roles)} roles")
                return False
        else:
            print(f"❌ C2 FAILED: Status {response.status_code}, response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ C2 EXCEPTION: {e}")
        return False
    
    # C3: Verify in MongoDB
    print("\n--- C3: Verify in MongoDB ---")
    try:
        person_count = db.org_personer.count_documents({"orgnr": "999111222"})
        print(f"MongoDB person count for orgnr 999111222: {person_count}")
        
        rolle_count = db.org_roller.count_documents({"id": {"$regex": "^qafix-drolle-"}})
        print(f"MongoDB role count for qafix-drolle-*: {rolle_count}")
        
        if person_count == 1 and rolle_count == 1:
            print(f"✅ C3 PASSED: MongoDB verification successful - 1 person, 1 role")
            return True
        else:
            print(f"❌ C3 FAILED: Expected 1 person and 1 role in MongoDB, got {person_count} persons and {rolle_count} roles")
            return False
    except Exception as e:
        print(f"❌ C3 EXCEPTION: {e}")
        return False

def test_regression():
    """(D) Regression tests"""
    print("\n=== TEST D: Regression tests ===")
    
    # D1: POST /admin/selskap/synk for both companies
    print("\n--- D1: Sync both companies ---")
    try:
        # Get both company IDs
        response = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            params={"key": owner_token},
            timeout=30
        )
        if response.status_code != 200:
            print(f"❌ D1 FAILED: Could not get organisasjon")
            return False
        
        data = response.json()
        selskaper = data.get("selskaper", [])
        
        for selskap in selskaper:
            selskap_id = selskap.get("id")
            selskap_navn = selskap.get("navn")
            print(f"\nSyncing {selskap_navn} (id: {selskap_id})")
            
            sync_response = requests.post(
                f"{BASE_URL}/admin/selskap/synk",
                params={"key": owner_token},
                json={"selskapId": selskap_id},
                timeout=30
            )
            print(f"Sync response status: {sync_response.status_code}")
            
            if sync_response.status_code == 200:
                sync_data = sync_response.json()
                print(f"Sync result: {json.dumps(sync_data, indent=2)}")
                
                if not sync_data.get("ok"):
                    print(f"❌ D1 FAILED: Sync not ok for {selskap_navn}")
                    return False
            else:
                print(f"❌ D1 FAILED: Sync failed for {selskap_navn}: {sync_response.text}")
                return False
        
        # Sync DigiHome Tech AS again to verify idempotency
        digihome_tech = next((s for s in selskaper if "TECH" in s.get("navn", "").upper()), None)
        if digihome_tech:
            print(f"\nSyncing DigiHome Tech AS again for idempotency check")
            sync_response = requests.post(
                f"{BASE_URL}/admin/selskap/synk",
                params={"key": owner_token},
                json={"selskapId": digihome_tech.get("id")},
                timeout=30
            )
            if sync_response.status_code == 200:
                sync_data = sync_response.json()
                endringer = sync_data.get("endringer", {})
                nye_personer = endringer.get("nyePersoner", -1)
                nye_roller = endringer.get("nyeRoller", -1)
                
                print(f"Second sync: nyePersoner={nye_personer}, nyeRoller={nye_roller}")
                
                if nye_personer != 0 or nye_roller != 0:
                    print(f"❌ D1 FAILED: Second sync should be idempotent (0 new persons/roles)")
                    return False
            else:
                print(f"❌ D1 FAILED: Second sync failed")
                return False
        
        print(f"✅ D1 PASSED: Sync tests passed")
    except Exception as e:
        print(f"❌ D1 EXCEPTION: {e}")
        return False
    
    # D2: Verify both Blue Sky entities still exist as separate entities
    print("\n--- D2: Verify Blue Sky entities remain separate ---")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            params={"key": owner_token},
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            personer = data.get("personer", [])
            
            # Find Blue Sky entities
            blue_sky_entities = [p for p in personer if p.get("orgnr") in ["921171986", "936595960"]]
            print(f"Found {len(blue_sky_entities)} Blue Sky entities")
            
            for entity in blue_sky_entities:
                print(f"  - {entity.get('navn')} (orgnr: {entity.get('orgnr')})")
            
            # Verify real people still exist
            real_people = ["Sarah Sleeman", "Erik Hoffmann-Dahl", "Martin Clement Kviteberg"]
            found_people = []
            for person_name in real_people:
                person = next((p for p in personer if person_name.lower() in p.get("navn", "").lower()), None)
                if person:
                    found_people.append(person_name)
                    print(f"  - Found {person_name}")
            
            if len(blue_sky_entities) == 2 and len(found_people) == 3:
                print(f"✅ D2 PASSED: Both Blue Sky entities and real people still exist")
            else:
                print(f"❌ D2 FAILED: Missing entities. Blue Sky: {len(blue_sky_entities)}/2, Real people: {len(found_people)}/3")
                return False
        else:
            print(f"❌ D2 FAILED: Could not get organisasjon")
            return False
    except Exception as e:
        print(f"❌ D2 EXCEPTION: {e}")
        return False
    
    # D3: Test other endpoints
    print("\n--- D3: Test other endpoints ---")
    try:
        # GET /admin/selskap/eierbok
        response = requests.get(
            f"{BASE_URL}/admin/selskap/eierbok",
            params={"key": owner_token},
            timeout=30
        )
        print(f"Eierbok response status: {response.status_code}")
        if response.status_code != 200:
            print(f"❌ D3 FAILED: Eierbok endpoint failed")
            return False
        
        eierbok_data = response.json()
        if not eierbok_data.get("ok"):
            print(f"❌ D3 FAILED: Eierbok response not ok")
            return False
        
        # GET /admin/selskap/organisasjon without key
        response = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            timeout=30
        )
        print(f"Organisasjon without key response status: {response.status_code}")
        if response.status_code != 401:
            print(f"❌ D3 FAILED: Expected 401 for organisasjon without key")
            return False
        
        print(f"✅ D3 PASSED: Other endpoints working correctly")
        return True
    except Exception as e:
        print(f"❌ D3 EXCEPTION: {e}")
        return False

def cleanup():
    """(E) Mandatory cleanup - delete all QAFIX test data"""
    print("\n=== TEST E: MANDATORY CLEANUP ===")
    
    try:
        # Delete org_personer with orgnr in ['999777555', '999111222'] or navn matching /QAFIX/
        print("\n--- Deleting QAFIX persons ---")
        result = db.org_personer.delete_many({
            "$or": [
                {"orgnr": {"$in": ["999777555", "999111222"]}},
                {"navn": {"$regex": "QAFIX", "$options": "i"}}
            ]
        })
        print(f"Deleted {result.deleted_count} QAFIX persons")
        
        # Delete org_roller with id matching /qafix/ or personId pointing to deleted persons
        print("\n--- Deleting QAFIX roles ---")
        result = db.org_roller.delete_many({
            "$or": [
                {"id": {"$regex": "qafix", "$options": "i"}},
                {"personId": {"$in": ["qafix-dupe-1", "qafix-dupe-2"]}}
            ]
        })
        print(f"Deleted {result.deleted_count} QAFIX roles")
        
        # Verify 0 QAFIX rests
        print("\n--- Verifying cleanup ---")
        person_count = db.org_personer.count_documents({
            "$or": [
                {"orgnr": {"$in": ["999777555", "999111222"]}},
                {"navn": {"$regex": "QAFIX", "$options": "i"}}
            ]
        })
        print(f"Remaining QAFIX persons: {person_count}")
        
        rolle_count = db.org_roller.count_documents({
            "$or": [
                {"id": {"$regex": "qafix", "$options": "i"}},
                {"personId": {"$in": ["qafix-dupe-1", "qafix-dupe-2"]}}
            ]
        })
        print(f"Remaining QAFIX roles: {rolle_count}")
        
        if person_count == 0 and rolle_count == 0:
            print(f"✅ CLEANUP PASSED: All QAFIX data deleted successfully")
            return True
        else:
            print(f"❌ CLEANUP FAILED: Still have {person_count} persons and {rolle_count} roles")
            return False
    except Exception as e:
        print(f"❌ CLEANUP EXCEPTION: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 80)
    print("BACKEND TEST: ORG-KART BLUE SKY DEDUPE")
    print("=" * 80)
    
    # Login
    if not login_owner():
        print("\n❌ FATAL: Could not login as owner")
        return
    
    # Get DIGIHOME AS ID
    if not get_digihome_as_id():
        print("\n❌ FATAL: Could not get DIGIHOME AS ID")
        return
    
    # Track test results
    results = []
    
    # Run tests
    print("\n" + "=" * 80)
    print("SECTION A: BRreg Search Tests")
    print("=" * 80)
    results.append(("A1: BRreg search 'blue sky economy'", test_brreg_sok_blue_sky()))
    results.append(("A2: BRreg search orgnr 936595960", test_brreg_sok_specific_orgnr()))
    results.append(("A3: BRreg search empty query", test_brreg_sok_empty_query()))
    results.append(("A4: BRreg search no auth", test_brreg_sok_no_auth()))
    
    print("\n" + "=" * 80)
    print("SECTION B: Support Company (Støtte) Tests")
    print("=" * 80)
    results.append(("B1: Create support company", test_stotte_create()))
    results.append(("B2: Idempotency same orgnr", test_stotte_idempotent_same_orgnr()))
    results.append(("B3: New role same orgnr", test_stotte_new_role_same_orgnr()))
    results.append(("B4: Validations", test_stotte_validations()))
    
    print("\n" + "=" * 80)
    print("SECTION C: Dedupe Self-Healing Tests")
    print("=" * 80)
    results.append(("C: Dedupe self-healing", test_dedupe_self_healing()))
    
    print("\n" + "=" * 80)
    print("SECTION D: Regression Tests")
    print("=" * 80)
    results.append(("D: Regression", test_regression()))
    
    print("\n" + "=" * 80)
    print("SECTION E: Mandatory Cleanup")
    print("=" * 80)
    results.append(("E: Cleanup", cleanup()))
    
    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print("\n" + "=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! 🎉")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")

if __name__ == "__main__":
    main()
