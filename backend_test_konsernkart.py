#!/usr/bin/env python3
"""
Backend test for Konsernkart: SHD Gruppen AS som morselskap
Tests the new parent company structure with self-cleaning of orphaned roles.

Base URL: https://saker-hub.preview.emergentagent.com/api
Auth: owner-login OR legacy key dh_admin_b3Kx92Qz7Lm4
MongoDB: mongodb://localhost:27017, DB: your_database_name

CRITICAL RULES:
- NO test data creation
- ONLY read operations + sync POST (idempotent)
- DO NOT delete/modify companies, persons, or roles
"""

import requests
import json
import sys
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Expected values
EXPECTED_COMPANIES = 3
SHD_ORGNR = "935431646"
DIGIHOME_AS_ORGNR = "835595242"
DIGIHOME_TECH_ORGNR = "835674622"
MOR_PCT = 100

def test_a_organisasjon_structure():
    """
    Test A: GET /admin/selskap/organisasjon
    Verify:
    - 3 companies total
    - SHD GRUPPEN AS has erMor=true, orgnr='935431646'
    - Digihome AS and Digihome Tech AS have morPct=100
    - selskaper[0].orgnr === '835595242' (order preserved)
    - Self-cleaning: no orphaned roles (all roles have valid personId)
    """
    print("\n=== TEST A: GET /admin/selskap/organisasjon ===")
    
    try:
        # A1: Test with owner key
        print("\nA1: Testing with owner key...")
        response = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok:true"
        
        selskaper = data.get("selskaper", [])
        personer = data.get("personer", [])
        roller = data.get("roller", [])
        
        print(f"Found {len(selskaper)} companies, {len(personer)} persons, {len(roller)} roles")
        
        # A2: Verify exactly 3 companies
        print("\nA2: Verifying 3 companies...")
        assert len(selskaper) == EXPECTED_COMPANIES, f"Expected {EXPECTED_COMPANIES} companies, got {len(selskaper)}"
        print(f"✅ Exactly {EXPECTED_COMPANIES} companies found")
        
        # A3: Find SHD GRUPPEN AS and verify erMor=true
        print("\nA3: Verifying SHD GRUPPEN AS as parent (erMor=true)...")
        shd_company = None
        for company in selskaper:
            if company.get("orgnr") == SHD_ORGNR:
                shd_company = company
                break
        
        assert shd_company is not None, f"SHD GRUPPEN AS (orgnr {SHD_ORGNR}) not found"
        assert shd_company.get("erMor") == True, f"SHD GRUPPEN AS should have erMor=true, got {shd_company.get('erMor')}"
        assert "SHD" in shd_company.get("navn", "").upper(), f"Company name should contain 'SHD', got {shd_company.get('navn')}"
        print(f"✅ SHD GRUPPEN AS found with erMor=true, name: {shd_company.get('navn')}")
        
        # A4: Verify children have morPct=100
        print("\nA4: Verifying children have morPct=100...")
        digihome_as = None
        digihome_tech = None
        
        for company in selskaper:
            if company.get("orgnr") == DIGIHOME_AS_ORGNR:
                digihome_as = company
            elif company.get("orgnr") == DIGIHOME_TECH_ORGNR:
                digihome_tech = company
        
        assert digihome_as is not None, f"Digihome AS (orgnr {DIGIHOME_AS_ORGNR}) not found"
        assert digihome_tech is not None, f"Digihome Tech AS (orgnr {DIGIHOME_TECH_ORGNR}) not found"
        
        assert digihome_as.get("morPct") == MOR_PCT, f"Digihome AS should have morPct={MOR_PCT}, got {digihome_as.get('morPct')}"
        assert digihome_tech.get("morPct") == MOR_PCT, f"Digihome Tech AS should have morPct={MOR_PCT}, got {digihome_tech.get('morPct')}"
        print(f"✅ Both children have morPct={MOR_PCT}")
        
        # A5: Verify order preserved (selskaper[0] should be Digihome AS)
        print("\nA5: Verifying order preserved (selskaper[0] = Digihome AS)...")
        assert selskaper[0].get("orgnr") == DIGIHOME_AS_ORGNR, f"selskaper[0] should be Digihome AS (orgnr {DIGIHOME_AS_ORGNR}), got {selskaper[0].get('orgnr')}"
        print(f"✅ Order preserved: selskaper[0] is Digihome AS")
        
        # A6: Self-cleaning verification - no orphaned roles
        print("\nA6: Verifying self-cleaning (no orphaned roles)...")
        person_ids = set(p.get("id") for p in personer if p.get("id"))
        orphaned_roles = []
        
        for role in roller:
            person_id = role.get("personId")
            if person_id and person_id not in person_ids:
                orphaned_roles.append(role)
        
        assert len(orphaned_roles) == 0, f"Found {len(orphaned_roles)} orphaned roles (personId not in personer[])"
        print(f"✅ Self-cleaning working: 0 orphaned roles (all {len(roller)} roles have valid personId)")
        
        print("\n✅ TEST A PASSED: All verifications successful")
        return True
        
    except AssertionError as e:
        print(f"\n❌ TEST A FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n❌ TEST A ERROR: {e}")
        return False


def test_b_synk_idempotency():
    """
    Test B: POST /admin/selskap/synk
    Verify idempotency (second sync should have nyePersoner=0, nyeRoller=0)
    """
    print("\n=== TEST B: POST /admin/selskap/synk (idempotency) ===")
    
    try:
        # First, get the SHD company ID
        print("\nB1: Getting SHD company ID...")
        response = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        assert response.status_code == 200, f"Failed to get organisasjon: {response.status_code}"
        data = response.json()
        selskaper = data.get("selskaper", [])
        
        shd_id = None
        for company in selskaper:
            if company.get("orgnr") == SHD_ORGNR:
                shd_id = company.get("id")
                break
        
        assert shd_id is not None, f"SHD company ID not found"
        print(f"SHD company ID: {shd_id}")
        
        # B2: First sync
        print("\nB2: First sync call...")
        response = requests.post(
            f"{BASE_URL}/admin/selskap/synk",
            params={"key": ADMIN_KEY},
            json={"selskapId": shd_id},
            timeout=60
        )
        
        print(f"Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok:true"
        print(f"First sync result: {json.dumps(data, indent=2)}")
        
        # B3: Second sync (idempotency test)
        print("\nB3: Second sync call (idempotency test)...")
        response = requests.post(
            f"{BASE_URL}/admin/selskap/synk",
            params={"key": ADMIN_KEY},
            json={"selskapId": shd_id},
            timeout=60
        )
        
        print(f"Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok:true"
        
        # Check for idempotency
        endringer = data.get("endringer", {})
        nye_personer = endringer.get("nyePersoner", -1)
        nye_roller = endringer.get("nyeRoller", -1)
        
        print(f"Second sync result: nyePersoner={nye_personer}, nyeRoller={nye_roller}")
        
        assert nye_personer == 0, f"Expected nyePersoner=0 (idempotent), got {nye_personer}"
        assert nye_roller == 0, f"Expected nyeRoller=0 (idempotent), got {nye_roller}"
        
        print(f"✅ Idempotency verified: nyePersoner=0, nyeRoller=0")
        
        print("\n✅ TEST B PASSED: Sync idempotency working")
        return True
        
    except AssertionError as e:
        print(f"\n❌ TEST B FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n❌ TEST B ERROR: {e}")
        return False


def test_c_eierbok_default():
    """
    Test C: GET /admin/selskap/eierbok (without selskapId)
    Verify default is still Digihome AS (orgnr 835595242), NOT SHD
    """
    print("\n=== TEST C: GET /admin/selskap/eierbok (default) ===")
    
    try:
        print("\nC1: Testing eierbok without selskapId...")
        response = requests.get(
            f"{BASE_URL}/admin/selskap/eierbok",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok:true"
        
        selskap = data.get("selskap", {})
        orgnr = selskap.get("orgnr")
        
        print(f"Default company orgnr: {orgnr}")
        
        assert orgnr == DIGIHOME_AS_ORGNR, f"Default should be Digihome AS (orgnr {DIGIHOME_AS_ORGNR}), got {orgnr}"
        print(f"✅ Default is still Digihome AS (NOT SHD)")
        
        print("\n✅ TEST C PASSED: Eierbok default preserved")
        return True
        
    except AssertionError as e:
        print(f"\n❌ TEST C FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n❌ TEST C ERROR: {e}")
        return False


def test_d_brreg_search():
    """
    Test D: GET /admin/selskap/brreg-sok?q=935431646
    Verify exactly 1 result with name 'SHD GRUPPEN AS'
    """
    print("\n=== TEST D: GET /admin/selskap/brreg-sok ===")
    
    try:
        print(f"\nD1: Searching for SHD GRUPPEN AS (orgnr {SHD_ORGNR})...")
        response = requests.get(
            f"{BASE_URL}/admin/selskap/brreg-sok",
            params={"key": ADMIN_KEY, "q": SHD_ORGNR},
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Response structure: {ok:true, treff:[...]}
        results = data.get("treff", []) if isinstance(data, dict) else data
        
        print(f"Found {len(results)} result(s)")
        
        assert len(results) == 1, f"Expected exactly 1 result, got {len(results)}"
        
        result = results[0]
        name = result.get("navn", "")
        
        print(f"Company name: {name}")
        
        assert "SHD GRUPPEN AS" in name.upper(), f"Expected name to contain 'SHD GRUPPEN AS', got {name}"
        print(f"✅ Found SHD GRUPPEN AS")
        
        print("\n✅ TEST D PASSED: BRreg search working")
        return True
        
    except AssertionError as e:
        print(f"\n❌ TEST D FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n❌ TEST D ERROR: {e}")
        return False


def test_e_auth():
    """
    Test E: Auth test
    GET /admin/selskap/organisasjon without key → 401
    """
    print("\n=== TEST E: Auth test ===")
    
    try:
        print("\nE1: Testing without key (should return 401)...")
        response = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Auth working: 401 without key")
        
        print("\n✅ TEST E PASSED: Auth working correctly")
        return True
        
    except AssertionError as e:
        print(f"\n❌ TEST E FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n❌ TEST E ERROR: {e}")
        return False


def test_f_regression():
    """
    Test F: Regression test
    Verify Blue Sky entities (orgnr 921171986 and 936595960) still exist as separate persons
    Verify key persons (Sarah Sleeman, Erik Hoffmann-Dahl, Martin Clement Kviteberg) exist with roles
    """
    print("\n=== TEST F: Regression test ===")
    
    try:
        print("\nF1: Getting organisasjon data...")
        response = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        assert response.status_code == 200, f"Failed to get organisasjon: {response.status_code}"
        
        data = response.json()
        personer = data.get("personer", [])
        roller = data.get("roller", [])
        
        print(f"Found {len(personer)} persons, {len(roller)} roles")
        
        # F2: Verify Blue Sky entities
        print("\nF2: Verifying Blue Sky entities...")
        blue_sky_orgnrs = ["921171986", "936595960"]
        found_blue_sky = []
        
        for person in personer:
            orgnr = person.get("orgnr")
            if orgnr in blue_sky_orgnrs:
                found_blue_sky.append(orgnr)
                print(f"  Found Blue Sky entity: orgnr={orgnr}, name={person.get('navn')}")
        
        assert len(found_blue_sky) == 2, f"Expected 2 Blue Sky entities, found {len(found_blue_sky)}: {found_blue_sky}"
        print(f"✅ Both Blue Sky entities found as separate persons")
        
        # F3: Verify key persons with roles
        print("\nF3: Verifying key persons with roles...")
        key_persons = ["Sarah Sleeman", "Erik Hoffmann-Dahl", "Martin Clement Kviteberg"]
        found_persons = []
        
        for person in personer:
            name = person.get("navn", "")
            for key_person in key_persons:
                if key_person.lower() in name.lower():
                    # Check if this person has roles
                    person_id = person.get("id")
                    person_roles = [r for r in roller if r.get("personId") == person_id]
                    
                    if len(person_roles) > 0:
                        found_persons.append(key_person)
                        print(f"  Found {key_person} with {len(person_roles)} role(s)")
                    break
        
        assert len(found_persons) == 3, f"Expected 3 key persons with roles, found {len(found_persons)}: {found_persons}"
        print(f"✅ All 3 key persons found with roles")
        
        print("\n✅ TEST F PASSED: Regression test successful")
        return True
        
    except AssertionError as e:
        print(f"\n❌ TEST F FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n❌ TEST F ERROR: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 80)
    print("BACKEND TEST: Konsernkart - SHD Gruppen AS som morselskap")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print("=" * 80)
    
    results = {
        "A. Organisasjon structure": test_a_organisasjon_structure(),
        "B. Synk idempotency": test_b_synk_idempotency(),
        "C. Eierbok default": test_c_eierbok_default(),
        "D. BRreg search": test_d_brreg_search(),
        "E. Auth": test_e_auth(),
        "F. Regression": test_f_regression(),
    }
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
