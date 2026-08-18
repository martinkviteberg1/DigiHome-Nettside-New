#!/usr/bin/env python3
"""
Backend test for Org-kart migration (Blue Sky regnskapsfører hiding)
Tests the one-time migration that hides outdated Blue Sky ECONOMY AS (921171986)
REGN roles where Blue Sky ECONOMY BERGEN AS (936595960) also has visible REGN role.
"""

import requests
import sys
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Entity org numbers
OLD_BLUE_SKY_ORGNR = "921171986"
NEW_BLUE_SKY_ORGNR = "936595960"
MIGRATION_ID = "org-2026-02-skjul-utdatert-regnskapsforer-921171986"

def test_org_migration():
    """Test the org-kart migration for Blue Sky regnskapsfører hiding"""
    
    print("=" * 80)
    print("TESTING: Org-kart migration (Blue Sky regnskapsfører hiding)")
    print("=" * 80)
    print()
    
    # Connect to MongoDB
    try:
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        db = client[DB_NAME]
        # Test connection
        db.command('ping')
        print("✓ MongoDB connection successful")
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        return False
    
    all_passed = True
    
    # ========================================================================
    # TEST A: GET /admin/selskap/organisasjon (owner) → 200
    # Verify old Blue Sky (921171986) has REGN roles with skjult=true
    # Verify new Blue Sky (936595960) has at least 1 REGN role with skjult=false
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST A: GET /admin/selskap/organisasjon - Verify migration applied")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"✗ TEST A FAILED: Expected 200, got {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            all_passed = False
        else:
            print(f"✓ GET /admin/selskap/organisasjon returned 200")
            
            data = response.json()
            
            # Check structure
            if not all(k in data for k in ['selskaper', 'roller', 'personer']):
                print(f"✗ TEST A FAILED: Missing required keys in response")
                all_passed = False
            else:
                print(f"✓ Response has required keys (selskaper, roller, personer)")
                
                # Find the old and new Blue Sky entities
                old_blue_sky = None
                new_blue_sky = None
                
                for person in data['personer']:
                    if person.get('orgnr') == OLD_BLUE_SKY_ORGNR:
                        old_blue_sky = person
                    elif person.get('orgnr') == NEW_BLUE_SKY_ORGNR:
                        new_blue_sky = person
                
                if not old_blue_sky:
                    print(f"✗ TEST A FAILED: Old Blue Sky entity (orgnr {OLD_BLUE_SKY_ORGNR}) not found")
                    all_passed = False
                else:
                    print(f"✓ Found old Blue Sky entity: {old_blue_sky.get('navn')} (orgnr {OLD_BLUE_SKY_ORGNR})")
                    
                    # Find REGN roles for old Blue Sky
                    old_regn_roles = [r for r in data['roller'] 
                                     if r['personId'] == old_blue_sky['id'] 
                                     and r['rolleKode'] == 'REGN']
                    
                    if not old_regn_roles:
                        print(f"  Note: Old Blue Sky has 0 REGN roles (may have been cleaned up)")
                    else:
                        print(f"  Old Blue Sky has {len(old_regn_roles)} REGN role(s)")
                        
                        # Check if all REGN roles are hidden
                        hidden_count = sum(1 for r in old_regn_roles if r.get('skjult') == True)
                        visible_count = len(old_regn_roles) - hidden_count
                        
                        print(f"  - Hidden REGN roles: {hidden_count}")
                        print(f"  - Visible REGN roles: {visible_count}")
                        
                        if visible_count > 0:
                            print(f"✗ TEST A FAILED: Old Blue Sky has {visible_count} visible REGN role(s), expected all to be hidden")
                            all_passed = False
                        else:
                            print(f"✓ All old Blue Sky REGN roles are hidden (skjult=true)")
                
                if not new_blue_sky:
                    print(f"✗ TEST A FAILED: New Blue Sky entity (orgnr {NEW_BLUE_SKY_ORGNR}) not found")
                    all_passed = False
                else:
                    print(f"✓ Found new Blue Sky entity: {new_blue_sky.get('navn')} (orgnr {NEW_BLUE_SKY_ORGNR})")
                    
                    # Find REGN roles for new Blue Sky
                    new_regn_roles = [r for r in data['roller'] 
                                     if r['personId'] == new_blue_sky['id'] 
                                     and r['rolleKode'] == 'REGN']
                    
                    if not new_regn_roles:
                        print(f"✗ TEST A FAILED: New Blue Sky has 0 REGN roles")
                        all_passed = False
                    else:
                        print(f"  New Blue Sky has {len(new_regn_roles)} REGN role(s)")
                        
                        # Check if at least one is visible
                        visible_count = sum(1 for r in new_regn_roles if r.get('skjult') != True)
                        
                        if visible_count == 0:
                            print(f"✗ TEST A FAILED: New Blue Sky has no visible REGN roles")
                            all_passed = False
                        else:
                            print(f"✓ New Blue Sky has {visible_count} visible REGN role(s)")
    
    except Exception as e:
        print(f"✗ TEST A FAILED with exception: {e}")
        all_passed = False
    
    # ========================================================================
    # TEST B: MongoDB - Verify migration record exists
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST B: MongoDB - Verify migration record in app_migreringer")
    print("=" * 80)
    
    try:
        migration_doc = db.app_migreringer.find_one({"id": MIGRATION_ID})
        
        if not migration_doc:
            print(f"✗ TEST B FAILED: Migration record not found in app_migreringer")
            all_passed = False
        else:
            print(f"✓ Migration record found in app_migreringer")
            print(f"  Migration ID: {migration_doc.get('id')}")
            print(f"  Executed at: {migration_doc.get('kjortAt')}")
    
    except Exception as e:
        print(f"✗ TEST B FAILED with exception: {e}")
        all_passed = False
    
    # ========================================================================
    # TEST C: Call GET /admin/selskap/organisasjon again
    # Verify migration doesn't re-run (exactly ONE document in app_migreringer)
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST C: Verify migration idempotency (doesn't re-run)")
    print("=" * 80)
    
    try:
        # Count migration records BEFORE second call
        count_before = db.app_migreringer.count_documents({"id": MIGRATION_ID})
        print(f"  Migration records before second call: {count_before}")
        
        # Call endpoint again
        response = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"✗ TEST C FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            print(f"✓ Second GET /admin/selskap/organisasjon returned 200")
            
            # Count migration records AFTER second call
            count_after = db.app_migreringer.count_documents({"id": MIGRATION_ID})
            print(f"  Migration records after second call: {count_after}")
            
            if count_after != count_before:
                print(f"✗ TEST C FAILED: Migration record count changed from {count_before} to {count_after}")
                all_passed = False
            elif count_after != 1:
                print(f"✗ TEST C FAILED: Expected exactly 1 migration record, found {count_after}")
                all_passed = False
            else:
                print(f"✓ Migration record count unchanged (exactly 1 record)")
                print(f"✓ Migration is idempotent (doesn't re-run)")
    
    except Exception as e:
        print(f"✗ TEST C FAILED with exception: {e}")
        all_passed = False
    
    # ========================================================================
    # TEST D: Regression tests
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST D: Regression tests")
    print("=" * 80)
    
    try:
        # D1: Response has 3 companies with SHD GRUPPEN AS having erMor=true
        response = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"✗ TEST D1 FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            selskaper = data.get('selskaper', [])
            
            if len(selskaper) != 3:
                print(f"✗ TEST D1 FAILED: Expected 3 companies, found {len(selskaper)}")
                all_passed = False
            else:
                print(f"✓ Response has 3 companies")
                
                # Find SHD GRUPPEN AS
                shd_gruppen = None
                for selskap in selskaper:
                    if 'SHD GRUPPEN' in selskap.get('navn', '').upper():
                        shd_gruppen = selskap
                        break
                
                if not shd_gruppen:
                    print(f"✗ TEST D1 FAILED: SHD GRUPPEN AS not found")
                    all_passed = False
                elif not shd_gruppen.get('erMor'):
                    print(f"✗ TEST D1 FAILED: SHD GRUPPEN AS does not have erMor=true")
                    all_passed = False
                else:
                    print(f"✓ SHD GRUPPEN AS has erMor=true")
        
        # D2: Sarah Sleeman, Erik Hoffmann-Dahl, Martin Clement Kviteberg exist with roles
        expected_names = ['Sarah Sleeman', 'Erik Hoffmann-Dahl', 'Martin Clement Kviteberg']
        personer = data.get('personer', [])
        roller = data.get('roller', [])
        
        found_count = 0
        for expected_name in expected_names:
            person = None
            for p in personer:
                if expected_name.lower() in p.get('navn', '').lower():
                    person = p
                    break
            
            if not person:
                print(f"✗ TEST D2 FAILED: {expected_name} not found")
                all_passed = False
            else:
                # Check if person has roles
                person_roles = [r for r in roller if r['personId'] == person['id']]
                if not person_roles:
                    print(f"✗ TEST D2 FAILED: {expected_name} has no roles")
                    all_passed = False
                else:
                    found_count += 1
        
        if found_count == len(expected_names):
            print(f"✓ All 3 expected persons found with roles (Sarah, Erik, Martin)")
        
        # D3: GET without key → 401
        response_no_auth = requests.get(
            f"{BASE_URL}/admin/selskap/organisasjon",
            timeout=10
        )
        
        if response_no_auth.status_code != 401:
            print(f"✗ TEST D3 FAILED: Expected 401 without key, got {response_no_auth.status_code}")
            all_passed = False
        else:
            print(f"✓ GET without key returns 401 (auth working)")
    
    except Exception as e:
        print(f"✗ TEST D FAILED with exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    if all_passed:
        print("✅ ALL TESTS PASSED")
        print()
        print("Migration working correctly:")
        print("- Old Blue Sky (921171986) REGN roles are hidden (skjult=true)")
        print("- New Blue Sky (936595960) has visible REGN roles")
        print("- Migration record exists in app_migreringer")
        print("- Migration is idempotent (doesn't re-run)")
        print("- All regression tests passed")
        return True
    else:
        print("❌ SOME TESTS FAILED")
        return False

if __name__ == "__main__":
    success = test_org_migration()
    sys.exit(0 if success else 1)
