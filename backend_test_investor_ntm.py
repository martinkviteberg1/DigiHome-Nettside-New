#!/usr/bin/env python3
"""
Backend test for Investor-NTM budsjett (modell24) + guidet omvisning (tourSett)
Tests focused on:
1. GET /api/admin/budsjett with modell24 (24-month income model)
2. GET /api/admin/budsjett/xlsx with modell=1 parameter
3. PUT /api/admin/auth/profile with tourSett field
4. Investor authentication and permissions
"""

import requests
import json
import os
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# Investor credentials
INVESTOR_EMAIL = "qa-investor@example.com"
INVESTOR_PASSWORD = "QaInvest12345!"

print(f"🧪 BACKEND TEST: Investor-NTM budsjett (modell24) + guidet omvisning (tourSett)")
print(f"📍 Base URL: {BASE_URL}")
print(f"🔑 Admin key: {ADMIN_KEY}")
print(f"💾 MongoDB: {MONGO_URL}, DB: {DB_NAME}")
print("=" * 80)

# Connect to MongoDB
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Test counters
tests_passed = 0
tests_failed = 0

def test_result(test_name, passed, details=""):
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        print(f"✅ {test_name}: PASSED {details}")
    else:
        tests_failed += 1
        print(f"❌ {test_name}: FAILED {details}")
    return passed

# ============================================================================
# TEST 1: GET /api/admin/budsjett with year=2026 (current year) - should have modell24
# ============================================================================
print("\n📋 TEST 1: GET /api/admin/budsjett?year=2026 with admin key (should have modell24)")
try:
    response = requests.get(
        f"{API_URL}/admin/budsjett",
        params={"key": ADMIN_KEY, "year": 2026},
        timeout=30  # Generous timeout as mentioned in review request (5-15s first time)
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Check modell24 exists
        if 'modell24' not in data:
            test_result("T1a: modell24 field exists", False, "- modell24 field missing from response")
        elif data['modell24'] is None:
            test_result("T1a: modell24 field exists", False, "- modell24 is null (should have data for current year)")
        else:
            test_result("T1a: modell24 field exists", True, "✓")
            
            modell24 = data['modell24']
            
            # Check all required fields exist
            required_fields = ['sikret', 'vekst', 'oppstart', 'total']
            all_fields_exist = all(field in modell24 for field in required_fields)
            test_result("T1b: modell24 has all required fields (sikret/vekst/oppstart/total)", 
                       all_fields_exist, 
                       f"✓" if all_fields_exist else f"- missing fields: {[f for f in required_fields if f not in modell24]}")
            
            if all_fields_exist:
                # Check all arrays have length 24
                all_length_24 = all(
                    isinstance(modell24[field], list) and len(modell24[field]) == 24 
                    for field in required_fields
                )
                test_result("T1c: All arrays have length 24", 
                           all_length_24,
                           f"✓" if all_length_24 else f"- lengths: {[(f, len(modell24[f]) if isinstance(modell24[f], list) else 'not array') for f in required_fields]}")
                
                if all_length_24:
                    # Check all values in sikret/total/oppstart are >= 0
                    sikret_valid = all(x >= 0 for x in modell24['sikret'])
                    total_valid = all(x >= 0 for x in modell24['total'])
                    oppstart_valid = all(x >= 0 for x in modell24['oppstart'])
                    
                    test_result("T1d: sikret values >= 0", sikret_valid, 
                               f"✓" if sikret_valid else f"- negative values found")
                    test_result("T1e: total values >= 0", total_valid,
                               f"✓" if total_valid else f"- negative values found")
                    test_result("T1f: oppstart values >= 0", oppstart_valid,
                               f"✓" if oppstart_valid else f"- negative values found")
                    
                    # Check math: total[m] === max(0, sikret[m] + vekst[m]) for all m
                    math_correct = True
                    for m in range(24):
                        expected = max(0, modell24['sikret'][m] + modell24['vekst'][m])
                        actual = modell24['total'][m]
                        if abs(expected - actual) > 0.01:  # Allow small floating point differences
                            math_correct = False
                            print(f"   ⚠️  Month {m}: total={actual}, expected max(0, {modell24['sikret'][m]} + {modell24['vekst'][m]}) = {expected}")
                            break
                    
                    test_result("T1g: Math correct (total[m] === max(0, sikret[m] + vekst[m]))", 
                               math_correct, "✓" if math_correct else "")
    else:
        test_result("T1: GET budsjett year=2026", False, f"- status {response.status_code}")
        
except Exception as e:
    test_result("T1: GET budsjett year=2026", False, f"- exception: {str(e)}")

# ============================================================================
# TEST 2: GET /api/admin/budsjett with year=2027 - modell24 should be null
# ============================================================================
print("\n📋 TEST 2: GET /api/admin/budsjett?year=2027 (future year - modell24 should be null)")
try:
    response = requests.get(
        f"{API_URL}/admin/budsjett",
        params={"key": ADMIN_KEY, "year": 2027},
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        
        if 'modell24' in data and data['modell24'] is None:
            test_result("T2: modell24 is null for year=2027", True, "✓")
        else:
            test_result("T2: modell24 is null for year=2027", False, 
                       f"- modell24={data.get('modell24', 'missing')}")
    else:
        test_result("T2: GET budsjett year=2027", False, f"- status {response.status_code}")
        
except Exception as e:
    test_result("T2: GET budsjett year=2027", False, f"- exception: {str(e)}")

# ============================================================================
# TEST 3: GET /api/admin/budsjett/xlsx with modell=1 parameter
# ============================================================================
print("\n📋 TEST 3: GET /api/admin/budsjett/xlsx?vindu=rullerende&modell=1 (XLSX with model)")
try:
    response = requests.get(
        f"{API_URL}/admin/budsjett/xlsx",
        params={"key": ADMIN_KEY, "vindu": "rullerende", "modell": "1"},
        timeout=30
    )
    
    if response.status_code == 200:
        # Check Content-Type
        content_type = response.headers.get('Content-Type', '')
        is_xlsx = 'spreadsheet' in content_type or 'excel' in content_type
        
        # Check PK signature (ZIP file signature for XLSX)
        content = response.content
        has_pk_signature = content[:4] == b'PK\x03\x04'
        
        test_result("T3a: XLSX with modell=1 returns 200", True, "✓")
        test_result("T3b: Content-Type is XLSX", is_xlsx, 
                   f"✓" if is_xlsx else f"- got {content_type}")
        test_result("T3c: Has PK signature (valid XLSX)", has_pk_signature,
                   f"✓" if has_pk_signature else f"- first 4 bytes: {content[:4]}")
    else:
        test_result("T3: GET budsjett/xlsx with modell=1", False, f"- status {response.status_code}")
        
except Exception as e:
    test_result("T3: GET budsjett/xlsx with modell=1", False, f"- exception: {str(e)}")

# ============================================================================
# TEST 3b: GET /api/admin/budsjett/xlsx without modell parameter (regression)
# ============================================================================
print("\n📋 TEST 3b: GET /api/admin/budsjett/xlsx without modell parameter (regression)")
try:
    response = requests.get(
        f"{API_URL}/admin/budsjett/xlsx",
        params={"key": ADMIN_KEY, "vindu": "rullerende"},
        timeout=30
    )
    
    if response.status_code == 200:
        content = response.content
        has_pk_signature = content[:4] == b'PK\x03\x04'
        test_result("T3d: XLSX without modell parameter still works", has_pk_signature,
                   f"✓" if has_pk_signature else f"- not valid XLSX")
    else:
        test_result("T3d: XLSX without modell parameter", False, f"- status {response.status_code}")
        
except Exception as e:
    test_result("T3d: XLSX without modell parameter", False, f"- exception: {str(e)}")

# ============================================================================
# TEST 4: Investor login and budsjett access
# ============================================================================
print("\n📋 TEST 4: Investor login and budsjett access")
investor_token = None

try:
    # Login as investor
    response = requests.post(
        f"{API_URL}/admin/auth/login",
        json={"email": INVESTOR_EMAIL, "password": INVESTOR_PASSWORD},
        timeout=10
    )
    
    if response.status_code == 200:
        data = response.json()
        if 'token' in data:
            investor_token = data['token']
            test_result("T4a: Investor login successful", True, f"✓ (token received)")
        else:
            test_result("T4a: Investor login successful", False, "- no token in response")
    else:
        test_result("T4a: Investor login", False, f"- status {response.status_code}: {response.text}")
        
except Exception as e:
    test_result("T4a: Investor login", False, f"- exception: {str(e)}")

# Test investor can access budsjett with modell24
if investor_token:
    try:
        response = requests.get(
            f"{API_URL}/admin/budsjett",
            params={"key": investor_token, "year": 2026},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            has_modell24 = 'modell24' in data and data['modell24'] is not None
            test_result("T4b: Investor can access budsjett with modell24", has_modell24,
                       f"✓" if has_modell24 else f"- modell24 missing or null")
        else:
            test_result("T4b: Investor budsjett access", False, f"- status {response.status_code}")
            
    except Exception as e:
        test_result("T4b: Investor budsjett access", False, f"- exception: {str(e)}")

# ============================================================================
# TEST 5: PUT /api/admin/auth/profile with tourSett field
# ============================================================================
print("\n📋 TEST 5: PUT /api/admin/auth/profile with tourSett field")

if investor_token:
    try:
        # Add 'qa-testtour' to tourSett
        response = requests.put(
            f"{API_URL}/admin/auth/profile",
            params={"key": investor_token},
            json={"tourSett": "qa-testtour"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok') == True:
                test_result("T5a: PUT profile with tourSett='qa-testtour'", True, "✓ (ok:true)")
                
                # Verify in MongoDB that tourSett contains both 'qa-testtour' and 'leieforhold'
                user_doc = db.admin_users.find_one({"email": INVESTOR_EMAIL})
                if user_doc:
                    tour_sett = user_doc.get('tourSett', [])
                    has_qa_test = 'qa-testtour' in tour_sett
                    has_leieforhold = 'leieforhold' in tour_sett
                    
                    test_result("T5b: MongoDB has 'qa-testtour' in tourSett", has_qa_test,
                               f"✓" if has_qa_test else f"- tourSett={tour_sett}")
                    test_result("T5c: MongoDB still has 'leieforhold' in tourSett", has_leieforhold,
                               f"✓" if has_leieforhold else f"- tourSett={tour_sett}")
                else:
                    test_result("T5b: MongoDB verification", False, "- user not found in DB")
            else:
                test_result("T5a: PUT profile with tourSett", False, f"- ok={data.get('ok')}")
        else:
            test_result("T5a: PUT profile with tourSett", False, f"- status {response.status_code}")
            
    except Exception as e:
        test_result("T5a: PUT profile with tourSett", False, f"- exception: {str(e)}")
    
    # Test idempotency - call again with same tourSett
    try:
        response = requests.put(
            f"{API_URL}/admin/auth/profile",
            params={"key": investor_token},
            json={"tourSett": "qa-testtour"},
            timeout=10
        )
        
        if response.status_code == 200:
            # Verify no duplicate in MongoDB
            user_doc = db.admin_users.find_one({"email": INVESTOR_EMAIL})
            if user_doc:
                tour_sett = user_doc.get('tourSett', [])
                count_qa_test = tour_sett.count('qa-testtour')
                test_result("T5d: Idempotency - no duplicate 'qa-testtour'", count_qa_test == 1,
                           f"✓" if count_qa_test == 1 else f"- count={count_qa_test}, tourSett={tour_sett}")
            else:
                test_result("T5d: Idempotency check", False, "- user not found")
        else:
            test_result("T5d: Idempotency PUT", False, f"- status {response.status_code}")
            
    except Exception as e:
        test_result("T5d: Idempotency PUT", False, f"- exception: {str(e)}")
    
    # MANDATORY CLEANUP: Remove 'qa-testtour' from tourSett (keep 'leieforhold')
    print("\n🧹 MANDATORY CLEANUP: Removing 'qa-testtour' from tourSett")
    try:
        result = db.admin_users.update_one(
            {"email": INVESTOR_EMAIL},
            {"$pull": {"tourSett": "qa-testtour"}}
        )
        
        # Verify cleanup
        user_doc = db.admin_users.find_one({"email": INVESTOR_EMAIL})
        if user_doc:
            tour_sett = user_doc.get('tourSett', [])
            has_qa_test = 'qa-testtour' in tour_sett
            has_leieforhold = 'leieforhold' in tour_sett
            
            test_result("T5e: Cleanup - 'qa-testtour' removed", not has_qa_test,
                       f"✓" if not has_qa_test else f"- still present in tourSett={tour_sett}")
            test_result("T5f: Cleanup - 'leieforhold' preserved", has_leieforhold,
                       f"✓" if has_leieforhold else f"- missing from tourSett={tour_sett}")
        else:
            test_result("T5e: Cleanup verification", False, "- user not found")
            
    except Exception as e:
        test_result("T5e: Cleanup", False, f"- exception: {str(e)}")

# ============================================================================
# TEST 6: PUT profile with invalid tourSett values
# ============================================================================
print("\n📋 TEST 6: PUT profile with invalid tourSett values (validation)")

if investor_token:
    # Test with <script> tag (should be rejected)
    try:
        response = requests.put(
            f"{API_URL}/admin/auth/profile",
            params={"key": investor_token},
            json={"tourSett": "<script>alert(1)</script>"},
            timeout=10
        )
        
        # Should return 400 or just ignore the invalid value (check implementation)
        # Based on code, invalid regex just doesn't update, but returns 200 if no other fields
        # Let's verify nothing was stored
        user_doc = db.admin_users.find_one({"email": INVESTOR_EMAIL})
        if user_doc:
            tour_sett = user_doc.get('tourSett', [])
            has_script = any('<script>' in str(item).lower() for item in tour_sett)
            test_result("T6a: Invalid tourSett '<script>' rejected", not has_script,
                       f"✓ (nothing stored)" if not has_script else f"- stored in tourSett={tour_sett}")
        else:
            test_result("T6a: Invalid tourSett validation", False, "- user not found")
            
    except Exception as e:
        test_result("T6a: Invalid tourSett '<script>'", False, f"- exception: {str(e)}")
    
    # Test with too short value (1 char, minimum is 2)
    try:
        response = requests.put(
            f"{API_URL}/admin/auth/profile",
            params={"key": investor_token},
            json={"tourSett": "x"},
            timeout=10
        )
        
        # Verify nothing was stored
        user_doc = db.admin_users.find_one({"email": INVESTOR_EMAIL})
        if user_doc:
            tour_sett = user_doc.get('tourSett', [])
            has_x = 'x' in tour_sett
            test_result("T6b: Invalid tourSett 'x' (too short) rejected", not has_x,
                       f"✓ (nothing stored)" if not has_x else f"- stored in tourSett={tour_sett}")
        else:
            test_result("T6b: Invalid tourSett validation", False, "- user not found")
            
    except Exception as e:
        test_result("T6b: Invalid tourSett 'x'", False, f"- exception: {str(e)}")

# ============================================================================
# TEST 7: REGRESSION tests
# ============================================================================
print("\n📋 TEST 7: REGRESSION tests")

if investor_token:
    # 7a: GET /api/admin/auth/me with investor token
    try:
        response = requests.get(
            f"{API_URL}/admin/auth/me",
            params={"key": investor_token},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            user = data.get('user', {})
            
            has_tour_sett = 'tourSett' in user and isinstance(user['tourSett'], list)
            has_leieforhold = has_tour_sett and 'leieforhold' in user['tourSett']
            is_investor = user.get('role') == 'investor'
            
            test_result("T7a: GET auth/me returns tourSett array", has_tour_sett,
                       f"✓" if has_tour_sett else f"- tourSett={user.get('tourSett', 'missing')}")
            test_result("T7b: tourSett contains 'leieforhold'", has_leieforhold,
                       f"✓" if has_leieforhold else f"- tourSett={user.get('tourSett', [])}")
            test_result("T7c: user.role is 'investor'", is_investor,
                       f"✓" if is_investor else f"- role={user.get('role')}")
        else:
            test_result("T7a: GET auth/me", False, f"- status {response.status_code}")
            
    except Exception as e:
        test_result("T7a: GET auth/me", False, f"- exception: {str(e)}")
    
    # 7b: PUT /api/admin/budsjett with investor token (should be 401 - write lock)
    try:
        response = requests.put(
            f"{API_URL}/admin/budsjett",
            params={"key": investor_token},
            json={"year": 2028},
            timeout=10
        )
        
        is_unauthorized = response.status_code == 401
        test_result("T7d: PUT budsjett with investor token returns 401", is_unauthorized,
                   f"✓ (write lock intact)" if is_unauthorized else f"- status {response.status_code}")
            
    except Exception as e:
        test_result("T7d: PUT budsjett unauthorized", False, f"- exception: {str(e)}")
    
    # 7c: PUT profile with name change (should still work)
    try:
        # First get current name
        response = requests.get(
            f"{API_URL}/admin/auth/me",
            params={"key": investor_token},
            timeout=10
        )
        original_name = None
        if response.status_code == 200:
            original_name = response.json().get('user', {}).get('name')
        
        # Change name
        response = requests.put(
            f"{API_URL}/admin/auth/profile",
            params={"key": investor_token},
            json={"name": "QA Investor"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            test_result("T7e: PUT profile with name change still works", data.get('ok') == True,
                       f"✓" if data.get('ok') == True else f"- ok={data.get('ok')}")
            
            # Verify name changed in DB
            user_doc = db.admin_users.find_one({"email": INVESTOR_EMAIL})
            if user_doc:
                new_name = user_doc.get('name')
                test_result("T7f: Name changed to 'QA Investor' in DB", new_name == "QA Investor",
                           f"✓" if new_name == "QA Investor" else f"- name={new_name}")
                
                # Restore original name
                if original_name:
                    db.admin_users.update_one(
                        {"email": INVESTOR_EMAIL},
                        {"$set": {"name": original_name}}
                    )
                    print(f"   🧹 Restored original name: {original_name}")
            else:
                test_result("T7f: Name change verification", False, "- user not found")
        else:
            test_result("T7e: PUT profile name change", False, f"- status {response.status_code}")
            
    except Exception as e:
        test_result("T7e: PUT profile name change", False, f"- exception: {str(e)}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print(f"📊 TEST SUMMARY")
print(f"✅ Passed: {tests_passed}")
print(f"❌ Failed: {tests_failed}")
print(f"📈 Success Rate: {tests_passed}/{tests_passed + tests_failed} ({100 * tests_passed / (tests_passed + tests_failed) if (tests_passed + tests_failed) > 0 else 0:.1f}%)")
print("=" * 80)

if tests_failed == 0:
    print("🎉 ALL TESTS PASSED!")
else:
    print(f"⚠️  {tests_failed} test(s) failed")

# Close MongoDB connection
mongo_client.close()
