#!/usr/bin/env python3
"""
TILGANGSSTYRING 1:1 (modulAuthed uten investor-unntak) - COMPREHENSIVE BACKEND TEST
Tests that modulAuthed function grants access ONLY when module is in user's moduler array.
The old exception 'investor always gets leieforhold' has been removed.
Access control (checkboxes under Users) is now 1:1 with actual API access.
"""

import requests
import json
import sys
from datetime import datetime
from pymongo import MongoClient

# Read environment
with open('/app/.env', 'r') as f:
    env_lines = f.readlines()
    for line in env_lines:
        if line.startswith('NEXT_PUBLIC_BASE_URL='):
            BASE = line.split('=', 1)[1].strip()
        elif line.startswith('MONGO_URL='):
            MONGO_URL = line.split('=', 1)[1].strip()
        elif line.startswith('DB_NAME='):
            DB_NAME = line.split('=', 1)[1].strip()

# Read admin key
with open('/app/memory/test_credentials.md', 'r') as f:
    for line in f:
        if 'dh_admin_' in line and 'Admin-nøkkel' in line:
            ADMIN_KEY = line.split('`')[1]
            break

API = f"{BASE}/api"
print(f"🔧 BASE: {BASE}")
print(f"🔧 API: {API}")
print(f"🔧 ADMIN_KEY: {ADMIN_KEY}")
print(f"🔧 MONGO: {MONGO_URL}, DB: {DB_NAME}")
print()

# MongoDB client
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# HTTP session
session = requests.Session()

# Test state
qa_investor_original_moduler = None
qa_investor_original_name = None
qa_tilgang_id = None
qa_tilgang_token = None

# Test counters
tests_passed = 0
tests_failed = 0

def test(name, condition, error_msg=""):
    global tests_passed, tests_failed
    if condition:
        print(f"✅ {name}")
        tests_passed += 1
        return True
    else:
        print(f"❌ {name}")
        if error_msg:
            print(f"   Error: {error_msg}")
        tests_failed += 1
        return False

print("=" * 80)
print("TILGANGSSTYRING 1:1 (modulAuthed uten investor-unntak) - BACKEND TEST")
print("=" * 80)
print()

# ============================================================================
# SAFETY: Store original qa-investor@example.com state
# ============================================================================
print("🔒 SAFETY: Storing original qa-investor@example.com state...")
try:
    qa_investor_doc = db.admin_users.find_one({'email': 'qa-investor@example.com'})
    if qa_investor_doc:
        qa_investor_original_moduler = qa_investor_doc.get('moduler', [])
        qa_investor_original_name = qa_investor_doc.get('name', '')
        print(f"   Original moduler: {qa_investor_original_moduler}")
        print(f"   Original name: {qa_investor_original_name}")
    else:
        print("   ⚠️  qa-investor@example.com not found in DB")
except Exception as e:
    print(f"   ⚠️  Error reading qa-investor: {e}")
print()

# ============================================================================
# TEST 1: Existing qa-investor@example.com has leieforhold and budsjett modules
# ============================================================================
print("TEST 1: Login qa-investor@example.com and verify module access")
print("-" * 80)

try:
    # Login
    r = session.post(f"{API}/admin/auth/login", json={
        'email': 'qa-investor@example.com',
        'password': 'QaInvest12345!'
    })
    test("T1.1: Login qa-investor@example.com returns 200", r.status_code == 200, f"Status: {r.status_code}")
    
    if r.status_code == 200:
        data = r.json()
        inv_token = data.get('token')
        user = data.get('user', {})
        moduler = user.get('moduler', [])
        
        test("T1.2: Response has token", bool(inv_token), "No token in response")
        test("T1.3: user.moduler contains 'leieforhold'", 'leieforhold' in moduler, f"moduler: {moduler}")
        test("T1.4: user.moduler contains 'budsjett'", 'budsjett' in moduler, f"moduler: {moduler}")
        
        # Test leieforhold access
        r2 = session.get(f"{API}/admin/leieforhold?key={inv_token}")
        test("T1.5: GET /api/admin/leieforhold with investor token returns 200", 
             r2.status_code == 200, f"Status: {r2.status_code}")
        
        # Test budsjett access
        r3 = session.get(f"{API}/admin/budsjett?key={inv_token}&year=2026")
        test("T1.6: GET /api/admin/budsjett?year=2026 with investor token returns 200", 
             r3.status_code == 200, f"Status: {r3.status_code}")
    else:
        print(f"   ⚠️  Login failed, skipping remaining T1 tests")
        
except Exception as e:
    print(f"❌ TEST 1 ERROR: {e}")
    tests_failed += 1

print()

# ============================================================================
# TEST 2: Create QA investor with only dr-oversikt module
# ============================================================================
print("TEST 2: Create QA investor with moduler:['dr-oversikt'] - MAIN TEST")
print("-" * 80)

try:
    # Create QA investor
    r = session.post(f"{API}/admin/users?key={ADMIN_KEY}", json={
        'name': 'QA Tilgangstest',
        'email': 'qa-tilgang@example.com',
        'role': 'investor',
        'password': 'QaTilgang12345!',
        'moduler': ['dr-oversikt'],
        'invite': False
    })
    test("T2.1: POST /api/admin/users creates QA investor", r.status_code == 200, f"Status: {r.status_code}")
    
    if r.status_code == 200:
        data = r.json()
        member = data.get('member', {})
        qa_tilgang_id = member.get('id')
        test("T2.2: Response has user id", bool(qa_tilgang_id), "No id in response")
        
        # Login with QA investor
        r2 = session.post(f"{API}/admin/auth/login", json={
            'email': 'qa-tilgang@example.com',
            'password': 'QaTilgang12345!'
        })
        test("T2.3: Login qa-tilgang@example.com returns 200", r2.status_code == 200, f"Status: {r2.status_code}")
        
        if r2.status_code == 200:
            data2 = r2.json()
            qa_tilgang_token = data2.get('token')
            test("T2.4: Login response has token", bool(qa_tilgang_token), "No token in response")
            
            # CRITICAL TEST: leieforhold should return 401 (no longer has investor exception)
            r3 = session.get(f"{API}/admin/leieforhold?key={qa_tilgang_token}")
            test("T2.5: GET /api/admin/leieforhold returns 401 (missing 'leieforhold' module) - MAIN TEST", 
                 r3.status_code == 401, 
                 f"Status: {r3.status_code} - THIS IS THE CRITICAL TEST: investor exception removed!")
            
            # budsjett should also return 401
            r4 = session.get(f"{API}/admin/budsjett?key={qa_tilgang_token}&year=2026")
            test("T2.6: GET /api/admin/budsjett returns 401 (missing 'budsjett' module)", 
                 r4.status_code == 401, f"Status: {r4.status_code}")
            
            # dr-oversikt should return 200 (has module)
            r5 = session.get(f"{API}/admin/datarom/oversikt?key={qa_tilgang_token}")
            test("T2.7: GET /api/admin/datarom/oversikt returns 200 (has 'dr-oversikt' module)", 
                 r5.status_code == 200, f"Status: {r5.status_code}")
            
            # dr-selskap should return 401 (missing module)
            r6 = session.get(f"{API}/admin/datarom/selskap?key={qa_tilgang_token}")
            test("T2.8: GET /api/admin/datarom/selskap returns 401 (missing 'dr-selskap' module)", 
                 r6.status_code == 401, f"Status: {r6.status_code}")
        else:
            print(f"   ⚠️  Login failed, skipping remaining T2 tests")
    else:
        print(f"   ⚠️  User creation failed, skipping remaining T2 tests")
        
except Exception as e:
    print(f"❌ TEST 2 ERROR: {e}")
    tests_failed += 1

print()

# ============================================================================
# TEST 3: Update QA investor to add leieforhold module - live access update
# ============================================================================
print("TEST 3: Add 'leieforhold' to QA investor - access follows moduler live")
print("-" * 80)

if qa_tilgang_id and qa_tilgang_token:
    try:
        # Update user to add leieforhold
        r = session.put(f"{API}/admin/users/{qa_tilgang_id}?key={ADMIN_KEY}", json={
            'moduler': ['dr-oversikt', 'leieforhold']
        })
        test("T3.1: PUT /api/admin/users/:id updates moduler", r.status_code == 200, f"Status: {r.status_code}")
        
        # Test leieforhold access with SAME token (no re-login)
        r2 = session.get(f"{API}/admin/leieforhold?key={qa_tilgang_token}")
        test("T3.2: GET /api/admin/leieforhold now returns 200 (SAME token, live update)", 
             r2.status_code == 200, f"Status: {r2.status_code}")
        
        # budsjett should still return 401 (not added)
        r3 = session.get(f"{API}/admin/budsjett?key={qa_tilgang_token}&year=2026")
        test("T3.3: GET /api/admin/budsjett still returns 401 (not in moduler)", 
             r3.status_code == 401, f"Status: {r3.status_code}")
        
    except Exception as e:
        print(f"❌ TEST 3 ERROR: {e}")
        tests_failed += 1
else:
    print("⚠️  Skipping TEST 3 (no QA user or token)")

print()

# ============================================================================
# TEST 4: auth/me returns moduler matching DB
# ============================================================================
print("TEST 4: GET /api/admin/auth/me returns moduler matching DB")
print("-" * 80)

if qa_tilgang_token:
    try:
        r = session.get(f"{API}/admin/auth/me?key={qa_tilgang_token}")
        test("T4.1: GET /api/admin/auth/me returns 200", r.status_code == 200, f"Status: {r.status_code}")
        
        if r.status_code == 200:
            data = r.json()
            user = data.get('user', {})
            moduler = user.get('moduler', [])
            
            test("T4.2: user.moduler contains 'dr-oversikt'", 'dr-oversikt' in moduler, f"moduler: {moduler}")
            test("T4.3: user.moduler contains 'leieforhold'", 'leieforhold' in moduler, f"moduler: {moduler}")
            test("T4.4: user.moduler has exactly 2 items", len(moduler) == 2, f"moduler: {moduler}")
            
            # Verify in MongoDB
            db_user = db.admin_users.find_one({'id': qa_tilgang_id})
            if db_user:
                db_moduler = db_user.get('moduler', [])
                test("T4.5: MongoDB moduler matches auth/me response", 
                     set(moduler) == set(db_moduler), 
                     f"API: {moduler}, DB: {db_moduler}")
            else:
                test("T4.5: MongoDB user found", False, "User not found in DB")
                
    except Exception as e:
        print(f"❌ TEST 4 ERROR: {e}")
        tests_failed += 1
else:
    print("⚠️  Skipping TEST 4 (no QA token)")

print()

# ============================================================================
# TEST 5: REGRESSION - Admin has full access
# ============================================================================
print("TEST 5: REGRESSION - Admin key has full access")
print("-" * 80)

try:
    # Admin should have access to all endpoints
    r1 = session.get(f"{API}/admin/leieforhold?key={ADMIN_KEY}")
    test("T5.1: GET /api/admin/leieforhold with admin key returns 200", 
         r1.status_code == 200, f"Status: {r1.status_code}")
    
    r2 = session.get(f"{API}/admin/budsjett?key={ADMIN_KEY}&year=2026")
    test("T5.2: GET /api/admin/budsjett with admin key returns 200", 
         r2.status_code == 200, f"Status: {r2.status_code}")
    
    r3 = session.get(f"{API}/admin/datarom/oversikt?key={ADMIN_KEY}")
    test("T5.3: GET /api/admin/datarom/oversikt with admin key returns 200", 
         r3.status_code == 200, f"Status: {r3.status_code}")
    
    # POST /api/admin/users without name should return 400
    r4 = session.post(f"{API}/admin/users?key={ADMIN_KEY}", json={
        'email': 'test@example.com',
        'role': 'investor'
    })
    test("T5.4: POST /api/admin/users without name returns 400", 
         r4.status_code == 400, f"Status: {r4.status_code}")
    
except Exception as e:
    print(f"❌ TEST 5 ERROR: {e}")
    tests_failed += 1

print()

# ============================================================================
# TEST 6: OPTIONAL - Test 'bruker' role without moduler
# ============================================================================
print("TEST 6: OPTIONAL - Test 'bruker' role without moduler gets 401")
print("-" * 80)
print("⚠️  Skipping this test as it requires creating another account.")
print("   Main functionality already verified in TEST 2 (investor without module gets 401).")
print()

# ============================================================================
# MANDATORY CLEANUP
# ============================================================================
print("=" * 80)
print("MANDATORY CLEANUP")
print("=" * 80)

cleanup_success = True

# Delete QA user
if qa_tilgang_id:
    try:
        print(f"Deleting QA user {qa_tilgang_id}...")
        r = session.delete(f"{API}/admin/users/{qa_tilgang_id}?key={ADMIN_KEY}")
        if r.status_code == 200:
            print(f"✅ Deleted QA user")
        else:
            print(f"⚠️  Failed to delete QA user: {r.status_code}")
            cleanup_success = False
    except Exception as e:
        print(f"⚠️  Error deleting QA user: {e}")
        cleanup_success = False
else:
    print("⚠️  No QA user to delete")

# Verify no QA users remain
try:
    qa_users = list(db.admin_users.find({'name': {'$regex': '^QA Tilgangstest'}}))
    if len(qa_users) == 0:
        print(f"✅ Verified 0 users with name prefix 'QA Tilgangstest' in MongoDB")
    else:
        print(f"⚠️  Found {len(qa_users)} QA users still in MongoDB!")
        cleanup_success = False
except Exception as e:
    print(f"⚠️  Error verifying QA users: {e}")
    cleanup_success = False

# Restore qa-investor@example.com if modified
try:
    current_qa_investor = db.admin_users.find_one({'email': 'qa-investor@example.com'})
    if current_qa_investor:
        current_moduler = current_qa_investor.get('moduler', [])
        current_name = current_qa_investor.get('name', '')
        
        # Check if we need to restore
        needs_restore = False
        if qa_investor_original_moduler is not None and set(current_moduler) != set(qa_investor_original_moduler):
            needs_restore = True
            print(f"⚠️  qa-investor moduler changed from {qa_investor_original_moduler} to {current_moduler}")
        
        if qa_investor_original_name is not None and current_name != qa_investor_original_name:
            needs_restore = True
            print(f"⚠️  qa-investor name changed from '{qa_investor_original_name}' to '{current_name}'")
        
        if needs_restore:
            print("Restoring qa-investor@example.com to original state...")
            restore_data = {}
            if qa_investor_original_moduler is not None:
                restore_data['moduler'] = qa_investor_original_moduler
            if qa_investor_original_name is not None:
                restore_data['name'] = qa_investor_original_name
            
            if restore_data:
                result = db.admin_users.update_one(
                    {'email': 'qa-investor@example.com'},
                    {'$set': restore_data}
                )
                if result.modified_count > 0:
                    print(f"✅ Restored qa-investor@example.com")
                else:
                    print(f"⚠️  Failed to restore qa-investor@example.com")
                    cleanup_success = False
        else:
            print(f"✅ qa-investor@example.com unchanged (moduler: {current_moduler})")
    else:
        print(f"⚠️  qa-investor@example.com not found in DB")
except Exception as e:
    print(f"⚠️  Error checking/restoring qa-investor: {e}")
    cleanup_success = False

# Verify qa-investor has expected modules
try:
    qa_investor_final = db.admin_users.find_one({'email': 'qa-investor@example.com'})
    if qa_investor_final:
        final_moduler = qa_investor_final.get('moduler', [])
        expected_moduler = ['leieforhold', 'budsjett', 'dr-oversikt', 'dr-resultat', 'dr-enheter', 'dr-pipeline', 'dr-selskap', 'dr-dokumenter']
        
        # Check if all expected modules are present (order doesn't matter)
        has_all = all(m in final_moduler for m in expected_moduler)
        if has_all:
            print(f"✅ qa-investor@example.com has all expected modules: {final_moduler}")
        else:
            missing = [m for m in expected_moduler if m not in final_moduler]
            print(f"⚠️  qa-investor@example.com missing modules: {missing}")
            print(f"   Current: {final_moduler}")
            print(f"   Expected: {expected_moduler}")
            cleanup_success = False
except Exception as e:
    print(f"⚠️  Error verifying qa-investor modules: {e}")
    cleanup_success = False

print()

# ============================================================================
# SUMMARY
# ============================================================================
print("=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"✅ Tests passed: {tests_passed}")
print(f"❌ Tests failed: {tests_failed}")
print(f"{'✅' if cleanup_success else '⚠️ '} Cleanup: {'SUCCESS' if cleanup_success else 'INCOMPLETE'}")
print()

if tests_failed == 0 and cleanup_success:
    print("🎉 ALL TESTS PASSED - TILGANGSSTYRING 1:1 WORKING PERFECTLY!")
    print()
    print("KEY FINDINGS:")
    print("✅ Investor exception removed - investors no longer get automatic 'leieforhold' access")
    print("✅ Access control is 1:1 with moduler array in admin_users")
    print("✅ Module access updates live without re-login (token-based check)")
    print("✅ Admin key retains full access to all endpoints")
    print("✅ All validation working (401 without module, 400 for invalid input)")
    print("✅ Mandatory cleanup successful (0 QA users, qa-investor restored)")
    sys.exit(0)
else:
    print("⚠️  SOME TESTS FAILED OR CLEANUP INCOMPLETE")
    sys.exit(1)
