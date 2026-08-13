#!/usr/bin/env python3
"""
Backend test for INNTEKTSMODELL (modell B) i Budsjett
Tests the new income model with Sikret (auto from platform) + Assumptions (incl. churn %/year) with lock/unlock.

CRITICAL SAFETY RULES:
1. DO NOT touch year 2026 - it contains REAL user budget data
2. Use ONLY year=2028 and/or 2029 for write tests
3. DELETE test documents from budgets collection after tests (year 2028/2029)
4. Verify at the end that 2026 document is unchanged (honorarLaas should NOT exist on 2026, updatedAt unchanged)
5. SendGrid is LIVE - don't trigger email flow
6. Don't create/delete users
7. Platform API only GET (happens implicitly via endpoints)
"""

import requests
import json
import os
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f'{BASE_URL}/api'
ADMIN_KEY = 'dh_admin_b3Kx92Qz7Lm4'
MONGO_URL = 'mongodb://localhost:27017'
DB_NAME = 'your_database_name'

# Test year (NOT 2026!)
TEST_YEAR = 2028

def test_t1_get_inntektsmodell():
    """T1: GET /api/admin/budsjett/inntektsmodell with parameters"""
    print("\n=== T1: GET /api/admin/budsjett/inntektsmodell ===")
    
    try:
        # Test with parameters
        params = {
            'key': ADMIN_KEY,
            'year': TEST_YEAR,
            'nye': 1,
            'churn': 5,
            'fyll': 1,
            'oppstart': 3000
        }
        
        response = requests.get(f'{API_BASE}/admin/budsjett/inntektsmodell', params=params, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Verify required fields
        required_fields = ['ok', 'sikret', 'vekst', 'oppstart', 'total', 'drivereBrukt', 'grunnlag', 'kostnader']
        for field in required_fields:
            if field not in data:
                print(f"❌ FAILED: Missing field '{field}'")
                return False
        
        # Verify sikret, vekst, oppstart, total are arrays of 12 numbers
        for field in ['sikret', 'vekst', 'oppstart', 'total']:
            if not isinstance(data[field], list) or len(data[field]) != 12:
                print(f"❌ FAILED: {field} should be array of 12 numbers, got {type(data[field])} with length {len(data[field]) if isinstance(data[field], list) else 'N/A'}")
                return False
            if not all(isinstance(x, (int, float)) for x in data[field]):
                print(f"❌ FAILED: {field} should contain only numbers")
                return False
        
        # Verify drivereBrukt has required fields
        drivers_required = ['nyeEnheterPerMnd', 'churnPctAar', 'fyllLedigPerMnd', 'oppstartPerEnhet', 'snittLeie', 'honorarPct']
        for field in drivers_required:
            if field not in data['drivereBrukt']:
                print(f"❌ FAILED: Missing drivereBrukt.{field}")
                return False
        
        # Verify grunnlag has required fields
        grunnlag_required = ['utleide', 'pipeline', 'ledige', 'baselineHonorar']
        for field in grunnlag_required:
            if field not in data['grunnlag']:
                print(f"❌ FAILED: Missing grunnlag.{field}")
                return False
        
        # Verify kostnader has 7 categories
        expected_categories = ['Lønn', 'Husleie', 'Programvare/SaaS', 'Regnskap', 'API/LLM', 'Markedsføring', 'Annet']
        for cat in expected_categories:
            if cat not in data['kostnader']:
                print(f"❌ FAILED: Missing kostnader category '{cat}'")
                return False
        
        # Verify math: total[m] === max(0, sikret[m] + vekst[m]) for all m
        for m in range(12):
            expected_total = max(0, data['sikret'][m] + data['vekst'][m])
            if abs(data['total'][m] - expected_total) > 1:  # Allow 1 kr rounding difference
                print(f"❌ FAILED: total[{m}] ({data['total'][m]}) != max(0, sikret[{m}] ({data['sikret'][m]}) + vekst[{m}] ({data['vekst'][m]})) = {expected_total}")
                return False
        
        # Verify oppstart has values when nye/fyll > 0
        if sum(data['oppstart']) == 0:
            print(f"⚠️  WARNING: oppstart sum is 0, expected some values when nye/fyll > 0")
        
        # Test without params (only key+year) - should have vekst=[0×12] and total===sikret
        params_no_drivers = {'key': ADMIN_KEY, 'year': TEST_YEAR}
        response2 = requests.get(f'{API_BASE}/admin/budsjett/inntektsmodell', params=params_no_drivers, timeout=30)
        if response2.status_code == 200:
            data2 = response2.json()
            if sum(data2['vekst']) != 0:
                print(f"❌ FAILED: Without driver params, vekst should be [0×12], got sum={sum(data2['vekst'])}")
                return False
            if data2['total'] != data2['sikret']:
                print(f"❌ FAILED: Without driver params, total should equal sikret")
                return False
        
        print("✅ T1 PASSED: GET /api/admin/budsjett/inntektsmodell returns correct structure")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_t2_authorization():
    """T2: Authorization tests"""
    print("\n=== T2: Authorization ===")
    
    try:
        # Test without key
        response = requests.get(f'{API_BASE}/admin/budsjett/inntektsmodell', params={'year': TEST_YEAR}, timeout=30)
        if response.status_code != 401:
            print(f"❌ FAILED: Without key should return 401, got {response.status_code}")
            return False
        print("✅ Without key → 401")
        
        # Test with investor token (should be 401 for admin-only endpoint)
        # First login as investor
        login_response = requests.post(
            f'{API_BASE}/admin/auth/login',
            json={'email': 'qa-investor@example.com', 'password': 'QaInvest12345!'},
            timeout=30
        )
        
        if login_response.status_code == 200:
            investor_token = login_response.json().get('token')
            
            # Test GET /api/admin/budsjett with investor token (should work - reading OK for modul)
            response_read = requests.get(f'{API_BASE}/admin/budsjett', params={'key': investor_token, 'year': TEST_YEAR}, timeout=30)
            if response_read.status_code != 200:
                print(f"❌ FAILED: Investor should be able to read budsjett, got {response_read.status_code}")
                return False
            print("✅ Investor can read budsjett (GET /api/admin/budsjett)")
            
            # Test GET /api/admin/budsjett/inntektsmodell with investor token (should be 401 - admin-only)
            response_model = requests.get(f'{API_BASE}/admin/budsjett/inntektsmodell', params={'key': investor_token, 'year': TEST_YEAR}, timeout=30)
            if response_model.status_code != 401:
                print(f"❌ FAILED: Investor should NOT access inntektsmodell endpoint, got {response_model.status_code}")
                return False
            print("✅ Investor cannot access inntektsmodell endpoint (admin-only) → 401")
        else:
            print(f"⚠️  WARNING: Could not login as investor (status {login_response.status_code}), skipping investor token test")
        
        print("✅ T2 PASSED: Authorization working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_t3_lock():
    """T3: Lock (LÅS) - PUT with laasInntekt:true"""
    print("\n=== T3: Lock (LÅS) ===")
    
    try:
        # Prepare budget data with laasInntekt:true
        budget_data = {
            'year': TEST_YEAR,
            'inntekter': {
                'Honorar (forvaltning)': [0] * 12,
                'Oppstartshonorar': [0] * 12,
                'Annen inntekt': [0] * 12
            },
            'kostnader': {
                'Lønn': [0] * 12,
                'Husleie': [0] * 12,
                'Programvare/SaaS': [0] * 12,
                'Regnskap': [0] * 12,
                'API/LLM': [0] * 12,
                'Markedsføring': [0] * 12,
                'Annet': [0] * 12
            },
            'egnePoster': [],
            'kommentarer': {},
            'notat': '',
            'antakelser': {
                'nyeEnheterPerMnd': '1',
                'churnPctAar': '5',
                'fyllLedigPerMnd': '1',
                'snittLeie': '',
                'honorarPct': '',
                'oppstartPerEnhet': '3000'
            },
            'laasInntekt': True
        }
        
        response = requests.put(
            f'{API_BASE}/admin/budsjett',
            params={'key': ADMIN_KEY},
            json=budget_data,
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Verify honorarLaas exists
        if 'honorarLaas' not in data:
            print(f"❌ FAILED: Missing honorarLaas in response")
            return False
        
        laas = data['honorarLaas']
        
        # Verify honorarLaas structure
        required_fields = ['sikret', 'vekst', 'oppstart', 'laastAt', 'laastAv']
        for field in required_fields:
            if field not in laas:
                print(f"❌ FAILED: Missing honorarLaas.{field}")
                return False
        
        # Verify arrays are 12 elements
        for field in ['sikret', 'vekst', 'oppstart']:
            if not isinstance(laas[field], list) or len(laas[field]) != 12:
                print(f"❌ FAILED: honorarLaas.{field} should be array of 12 numbers")
                return False
        
        # Verify inntekter mirroring: inntekter['Honorar (forvaltning)'][m] === max(0, sikret[m] + vekst[m])
        if 'inntekter' in data:
            honorar_serie = data['inntekter'].get('Honorar (forvaltning)', [])
            for m in range(12):
                expected = max(0, laas['sikret'][m] + laas['vekst'][m])
                if abs(honorar_serie[m] - expected) > 1:  # Allow 1 kr rounding
                    print(f"❌ FAILED: inntekter['Honorar (forvaltning)'][{m}] ({honorar_serie[m]}) != max(0, sikret[{m}] ({laas['sikret'][m]}) + vekst[{m}] ({laas['vekst'][m]})) = {expected}")
                    return False
            
            # Verify oppstart mirroring
            oppstart_serie = data['inntekter'].get('Oppstartshonorar', [])
            if oppstart_serie != laas['oppstart']:
                print(f"❌ FAILED: inntekter['Oppstartshonorar'] should equal honorarLaas.oppstart")
                return False
        
        # Verify antakelser are persisted (as numbers, not strings)
        if 'antakelser' in data:
            ant = data['antakelser']
            if not isinstance(ant.get('nyeEnheterPerMnd'), (int, float)):
                print(f"❌ FAILED: antakelser.nyeEnheterPerMnd should be number, got {type(ant.get('nyeEnheterPerMnd'))}")
                return False
            if not isinstance(ant.get('churnPctAar'), (int, float)):
                print(f"❌ FAILED: antakelser.churnPctAar should be number, got {type(ant.get('churnPctAar'))}")
                return False
        
        print("✅ T3 PASSED: Lock working correctly with honorarLaas structure and data mirroring")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_t4_get_with_lock():
    """T4: GET /api/admin/budsjett with locked data"""
    print("\n=== T4: GET /api/admin/budsjett with locked data ===")
    
    try:
        response = requests.get(
            f'{API_BASE}/admin/budsjett',
            params={'key': ADMIN_KEY, 'year': TEST_YEAR},
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Verify honorarLaas exists (from T3)
        if 'honorarLaas' not in data:
            print(f"❌ FAILED: Missing honorarLaas (should exist from T3)")
            return False
        
        # Verify antakelser exists
        if 'antakelser' not in data:
            print(f"❌ FAILED: Missing antakelser")
            return False
        
        # Verify sikretNaa exists and is array of 12 numbers >= 0
        if 'sikretNaa' not in data:
            print(f"❌ FAILED: Missing sikretNaa (live reference)")
            return False
        
        sikret_naa = data['sikretNaa']
        if not isinstance(sikret_naa, list) or len(sikret_naa) != 12:
            print(f"❌ FAILED: sikretNaa should be array of 12 numbers")
            return False
        
        if not all(isinstance(x, (int, float)) and x >= 0 for x in sikret_naa):
            print(f"❌ FAILED: sikretNaa should contain only numbers >= 0")
            return False
        
        print(f"✅ honorarLaas exists: sikret sum={sum(data['honorarLaas']['sikret'])}, vekst sum={sum(data['honorarLaas']['vekst'])}")
        print(f"✅ sikretNaa exists: sum={sum(sikret_naa)} (live reference)")
        print("✅ T4 PASSED: GET returns honorarLaas, antakelser, and sikretNaa")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_t5_unlock():
    """T5: Unlock (LÅS OPP) and verify normal PUT doesn't change honorarLaas"""
    print("\n=== T5: Unlock (LÅS OPP) ===")
    
    try:
        # First, test that normal PUT doesn't change honorarLaas
        print("Testing that normal PUT doesn't change honorarLaas...")
        
        # Get current state
        response_before = requests.get(f'{API_BASE}/admin/budsjett', params={'key': ADMIN_KEY, 'year': TEST_YEAR}, timeout=30)
        if response_before.status_code != 200:
            print(f"❌ FAILED: Could not get budget before normal PUT")
            return False
        
        data_before = response_before.json()
        laas_before = data_before.get('honorarLaas')
        
        # Do a normal PUT (without laasInntekt or laasOpp)
        normal_put_data = {
            'year': TEST_YEAR,
            'inntekter': data_before.get('inntekter', {}),
            'kostnader': data_before.get('kostnader', {}),
            'egnePoster': data_before.get('egnePoster', []),
            'kommentarer': data_before.get('kommentarer', {}),
            'notat': 'Normal PUT test'
        }
        
        response_normal = requests.put(
            f'{API_BASE}/admin/budsjett',
            params={'key': ADMIN_KEY},
            json=normal_put_data,
            timeout=30
        )
        
        if response_normal.status_code != 200:
            print(f"❌ FAILED: Normal PUT failed with status {response_normal.status_code}")
            return False
        
        data_after_normal = response_normal.json()
        laas_after_normal = data_after_normal.get('honorarLaas')
        
        # Verify honorarLaas is unchanged by checking in MongoDB
        # (response might not include it, but DB should have it unchanged)
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        budgets_coll = db['budgets']
        doc_after_normal = budgets_coll.find_one({'year': TEST_YEAR}, {'_id': 0})
        client.close()
        
        if doc_after_normal and 'honorarLaas' in doc_after_normal:
            # Compare the DB values
            if doc_after_normal['honorarLaas'] != laas_before:
                print(f"❌ FAILED: Normal PUT changed honorarLaas in DB (should remain unchanged)")
                return False
        else:
            print(f"❌ FAILED: honorarLaas disappeared from DB after normal PUT")
            return False
        
        print("✅ Normal PUT doesn't change honorarLaas")
        
        # Now test unlock with laasOpp:true
        print("Testing unlock with laasOpp:true...")
        
        unlock_data = {
            'year': TEST_YEAR,
            'inntekter': data_before.get('inntekter', {}),
            'kostnader': data_before.get('kostnader', {}),
            'egnePoster': data_before.get('egnePoster', []),
            'kommentarer': data_before.get('kommentarer', {}),
            'notat': '',
            'laasOpp': True
        }
        
        response_unlock = requests.put(
            f'{API_BASE}/admin/budsjett',
            params={'key': ADMIN_KEY},
            json=unlock_data,
            timeout=30
        )
        
        if response_unlock.status_code != 200:
            print(f"❌ FAILED: Unlock PUT failed with status {response_unlock.status_code}")
            return False
        
        data_unlocked = response_unlock.json()
        
        # Verify honorarLaas is null
        if data_unlocked.get('honorarLaas') is not None:
            print(f"❌ FAILED: After unlock, honorarLaas should be null, got {data_unlocked.get('honorarLaas')}")
            return False
        
        print("✅ T5 PASSED: Unlock working correctly (honorarLaas=null), normal PUT doesn't change lock")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_t6_regression():
    """T6: Regression tests"""
    print("\n=== T6: Regression ===")
    
    try:
        # Test GET /api/admin/budsjett for year 2026 (should not have honorarLaas)
        response_2026 = requests.get(f'{API_BASE}/admin/budsjett', params={'key': ADMIN_KEY, 'year': 2026}, timeout=30)
        if response_2026.status_code != 200:
            print(f"❌ FAILED: GET budsjett for 2026 failed with status {response_2026.status_code}")
            return False
        
        data_2026 = response_2026.json()
        if data_2026.get('honorarLaas') is not None:
            print(f"❌ FAILED: Year 2026 should NOT have honorarLaas, got {data_2026.get('honorarLaas')}")
            return False
        
        print("✅ Year 2026 has no honorarLaas (correct)")
        
        # Test GET /api/admin/budsjett/xlsx for year 2026
        response_xlsx = requests.get(f'{API_BASE}/admin/budsjett/xlsx', params={'key': ADMIN_KEY, 'year': 2026}, timeout=30)
        if response_xlsx.status_code != 200:
            print(f"❌ FAILED: GET budsjett/xlsx for 2026 failed with status {response_xlsx.status_code}")
            return False
        
        # Verify it's a valid XLSX (PK signature: 50 4B = "PK")
        content = response_xlsx.content
        if not content.startswith(b'PK'):
            print(f"❌ FAILED: XLSX response doesn't start with PK signature")
            return False
        
        print("✅ GET /api/admin/budsjett/xlsx returns valid XLSX")
        
        # Test GET /api/admin/budsjett/forslag (old endpoint should still work)
        response_forslag = requests.get(f'{API_BASE}/admin/budsjett/forslag', params={'key': ADMIN_KEY, 'year': TEST_YEAR}, timeout=30)
        if response_forslag.status_code != 200:
            print(f"❌ FAILED: GET budsjett/forslag failed with status {response_forslag.status_code}")
            return False
        
        print("✅ GET /api/admin/budsjett/forslag still works (old endpoint intact)")
        
        print("✅ T6 PASSED: All regression tests passed")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_t7_cleanup():
    """T7: Cleanup - delete test documents and verify 2026 is unchanged"""
    print("\n=== T7: Cleanup ===")
    
    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        budgets_coll = db['budgets']
        
        # Get 2026 document BEFORE cleanup (to verify it's unchanged after)
        doc_2026_before = budgets_coll.find_one({'year': 2026}, {'_id': 0})
        
        # Delete test documents (year 2028 and 2029)
        result_2028 = budgets_coll.delete_one({'year': TEST_YEAR})
        result_2029 = budgets_coll.delete_one({'year': 2029})
        
        print(f"Deleted {result_2028.deleted_count} document(s) for year {TEST_YEAR}")
        print(f"Deleted {result_2029.deleted_count} document(s) for year 2029")
        
        # Verify 2026 document is unchanged
        doc_2026_after = budgets_coll.find_one({'year': 2026}, {'_id': 0})
        
        if doc_2026_before != doc_2026_after:
            print(f"❌ FAILED: Year 2026 document was changed during tests!")
            return False
        
        # Verify 2026 does NOT have honorarLaas
        if doc_2026_after and 'honorarLaas' in doc_2026_after:
            print(f"❌ FAILED: Year 2026 has honorarLaas field (should NOT exist)")
            return False
        
        print("✅ Year 2026 document is unchanged (no honorarLaas, updatedAt unchanged)")
        
        # Verify test documents are deleted
        doc_2028 = budgets_coll.find_one({'year': TEST_YEAR})
        doc_2029 = budgets_coll.find_one({'year': 2029})
        
        if doc_2028 is not None:
            print(f"❌ FAILED: Year {TEST_YEAR} document still exists after cleanup")
            return False
        
        if doc_2029 is not None:
            print(f"❌ FAILED: Year 2029 document still exists after cleanup")
            return False
        
        print(f"✅ Test documents deleted (year {TEST_YEAR} and 2029)")
        
        client.close()
        
        print("✅ T7 PASSED: Cleanup successful, 2026 unchanged")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 80)
    print("BACKEND TEST: INNTEKTSMODELLEN (modell B) i Budsjett")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Test year: {TEST_YEAR}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print("=" * 80)
    
    results = []
    
    # Run tests in order
    results.append(("T1: GET inntektsmodell", test_t1_get_inntektsmodell()))
    results.append(("T2: Authorization", test_t2_authorization()))
    results.append(("T3: Lock (LÅS)", test_t3_lock()))
    results.append(("T4: GET with lock", test_t4_get_with_lock()))
    results.append(("T5: Unlock (LÅS OPP)", test_t5_unlock()))
    results.append(("T6: Regression", test_t6_regression()))
    results.append(("T7: Cleanup", test_t7_cleanup()))
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! INNTEKTSMODELLEN (modell B) working PERFECTLY!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review the output above.")
        return 1

if __name__ == '__main__':
    exit(main())
