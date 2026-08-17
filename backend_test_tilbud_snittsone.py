#!/usr/bin/env python3
"""
Backend test for TILBUD offentlig payload: snittSone i grunnlag (hentTilbud)

Tests the new snittSone field in the public tilbud endpoint.
CRITICAL RULES:
- ONLY use spor=0 (never spor=1 - it increments opening statistics)
- DO NOT mutate/delete any leads or documents. Only reading in DB.
- Rate limit 60/min on /tilbud - keep calls low
"""

import os
import sys
import requests
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# Known test slug from main agent
TEST_SLUG = 'NYfSqu_IUoE'  # Johannes Bruns gate 1, antallISone=0 → snittSone should be null

def test_tilbud_endpoint():
    """Test GET /api/tilbud with spor=0 to verify snittSone logic"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/tilbud?slug={}&spor=0 - Verify structure and snittSone=null".format(TEST_SLUG))
    print("="*80)
    
    try:
        url = f"{API_BASE}/tilbud?slug={TEST_SLUG}&spor=0"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Verify response structure
        if not data.get('ok'):
            print(f"❌ FAILED: Response ok=false")
            print(f"Response: {data}")
            return False
        
        tilbud = data.get('tilbud')
        if not tilbud:
            print(f"❌ FAILED: No tilbud in response")
            return False
        
        # Verify required fields
        required_fields = ['tittel', 'adresse', 'regnestykke', 'grunnlag', 'bilder', 'stylet']
        missing = [f for f in required_fields if f not in tilbud]
        if missing:
            print(f"❌ FAILED: Missing required fields: {missing}")
            return False
        
        print(f"✅ Response structure OK")
        print(f"   - tittel: {tilbud['tittel'][:50]}...")
        print(f"   - adresse: {tilbud['adresse']}")
        
        # Verify regnestykke structure
        regnestykke = tilbud['regnestykke']
        reg_fields = ['anbefaltLeie', 'honorarPct', 'honorarMnd', 'nettoTilEier', 'dagensPris']
        missing_reg = [f for f in reg_fields if f not in regnestykke]
        if missing_reg:
            print(f"❌ FAILED: Missing regnestykke fields: {missing_reg}")
            return False
        
        print(f"✅ Regnestykke structure OK")
        print(f"   - anbefaltLeie: {regnestykke['anbefaltLeie']}")
        print(f"   - honorarPct: {regnestykke['honorarPct']}")
        print(f"   - honorarMnd: {regnestykke['honorarMnd']}")
        print(f"   - nettoTilEier: {regnestykke['nettoTilEier']}")
        
        # Verify grunnlag structure and snittSone logic
        grunnlag = tilbud['grunnlag']
        if grunnlag is None:
            print(f"❌ FAILED: grunnlag is null (expected object for this lead)")
            return False
        
        grunnlag_fields = ['antallILeide', 'antallISone', 'sone', 'snittSone']
        missing_grunnlag = [f for f in grunnlag_fields if f not in grunnlag]
        if missing_grunnlag:
            print(f"❌ FAILED: Missing grunnlag fields: {missing_grunnlag}")
            return False
        
        print(f"✅ Grunnlag structure OK")
        print(f"   - antallILeide: {grunnlag['antallILeide']}")
        print(f"   - antallISone: {grunnlag['antallISone']}")
        print(f"   - sone: {grunnlag['sone']}")
        print(f"   - snittSone: {grunnlag['snittSone']}")
        
        # CRITICAL: Verify snittSone logic for this specific lead
        # This lead has antallISone=0, so snittSone MUST be null
        if grunnlag['antallISone'] == 0:
            if grunnlag['snittSone'] is not None:
                print(f"❌ FAILED: snittSone should be null when antallISone=0, got {grunnlag['snittSone']}")
                return False
            print(f"✅ snittSone=null when antallISone=0 (CORRECT)")
        else:
            print(f"⚠️  WARNING: antallISone={grunnlag['antallISone']} (expected 0 for this test lead)")
        
        # Verify bilder and stylet arrays
        print(f"✅ bilder: {len(tilbud['bilder'])} items")
        print(f"✅ stylet: {len(tilbud['stylet'])} items")
        
        # Verify annonse field (if present)
        if 'annonse' in tilbud and tilbud['annonse']:
            annonse = tilbud['annonse']
            print(f"✅ annonse present with tittel: {annonse.get('tittel', '')[:50]}...")
        
        print(f"\n✅ TEST 1 PASSED: GET /api/tilbud structure and snittSone logic verified")
        return True
        
    except Exception as e:
        print(f"❌ TEST 1 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_math_verification():
    """Test 2: Verify regnestykke math"""
    print("\n" + "="*80)
    print("TEST 2: Verify regnestykke math (honorarMnd, nettoTilEier)")
    print("="*80)
    
    try:
        url = f"{API_BASE}/tilbud?slug={TEST_SLUG}&spor=0"
        response = requests.get(url, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ FAILED: Could not fetch tilbud")
            return False
        
        data = response.json()
        tilbud = data.get('tilbud', {})
        regnestykke = tilbud.get('regnestykke', {})
        
        anbefalt = regnestykke.get('anbefaltLeie', 0)
        pct = regnestykke.get('honorarPct', 0)
        honorar_actual = regnestykke.get('honorarMnd', 0)
        netto_actual = regnestykke.get('nettoTilEier', 0)
        
        # Calculate expected values
        honorar_expected = round((anbefalt * pct) / 100)
        netto_expected = anbefalt - honorar_expected
        
        print(f"anbefaltLeie: {anbefalt}")
        print(f"honorarPct: {pct}")
        print(f"honorarMnd (actual): {honorar_actual}, (expected): {honorar_expected}")
        print(f"nettoTilEier (actual): {netto_actual}, (expected): {netto_expected}")
        
        if honorar_actual != honorar_expected:
            print(f"❌ FAILED: honorarMnd mismatch")
            return False
        
        if netto_actual != netto_expected:
            print(f"❌ FAILED: nettoTilEier mismatch")
            return False
        
        print(f"✅ TEST 2 PASSED: Math verification correct")
        return True
        
    except Exception as e:
        print(f"❌ TEST 2 FAILED with exception: {e}")
        return False


def test_db_verification():
    """Test 3: Verify snittSone logic directly against DB"""
    print("\n" + "="*80)
    print("TEST 3: Verify snittSone logic directly against MongoDB")
    print("="*80)
    
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Find lead by tilbudSlug
        lead = db.salgsradar_leads.find_one({'tilbudSlug': TEST_SLUG})
        
        if not lead:
            print(f"❌ FAILED: Lead with slug {TEST_SLUG} not found in DB")
            return False
        
        print(f"✅ Found lead in DB: {lead.get('adresse', 'N/A')}")
        
        # Get analyse.grunnlag from DB
        analyse = lead.get('analyse', {})
        grunnlag_db = analyse.get('grunnlag', {})
        
        antall_i_leide_db = grunnlag_db.get('antallILeide', 0)
        antall_i_sone_db = grunnlag_db.get('antallISone', 0)
        sone_db = grunnlag_db.get('sone')
        snitt_sone_db = grunnlag_db.get('snittSone')
        
        print(f"DB grunnlag:")
        print(f"   - antallILeide: {antall_i_leide_db}")
        print(f"   - antallISone: {antall_i_sone_db}")
        print(f"   - sone: {sone_db}")
        print(f"   - snittSone: {snitt_sone_db}")
        
        # Get API response
        url = f"{API_BASE}/tilbud?slug={TEST_SLUG}&spor=0"
        response = requests.get(url, timeout=10)
        data = response.json()
        tilbud = data.get('tilbud', {})
        grunnlag_api = tilbud.get('grunnlag', {})
        
        # Verify API matches DB
        if grunnlag_api.get('antallILeide') != antall_i_leide_db:
            print(f"❌ FAILED: antallILeide mismatch (API: {grunnlag_api.get('antallILeide')}, DB: {antall_i_leide_db})")
            return False
        
        if grunnlag_api.get('antallISone') != antall_i_sone_db:
            print(f"❌ FAILED: antallISone mismatch (API: {grunnlag_api.get('antallISone')}, DB: {antall_i_sone_db})")
            return False
        
        if grunnlag_api.get('sone') != sone_db:
            print(f"❌ FAILED: sone mismatch (API: {grunnlag_api.get('sone')}, DB: {sone_db})")
            return False
        
        print(f"✅ API grunnlag matches DB (antallILeide, antallISone, sone)")
        
        # Verify snittSone logic
        snitt_sone_api = grunnlag_api.get('snittSone')
        
        # Logic: snittSone should be null when antallISone < 2 OR snittSone <= 0
        if antall_i_sone_db < 2:
            if snitt_sone_api is not None:
                print(f"❌ FAILED: snittSone should be null when antallISone < 2, got {snitt_sone_api}")
                return False
            print(f"✅ snittSone=null when antallISone < 2 (CORRECT)")
        elif snitt_sone_db is None or snitt_sone_db <= 0:
            if snitt_sone_api is not None:
                print(f"❌ FAILED: snittSone should be null when DB snittSone <= 0, got {snitt_sone_api}")
                return False
            print(f"✅ snittSone=null when DB snittSone <= 0 (CORRECT)")
        else:
            # Should be rounded value
            expected = round(snitt_sone_db)
            if snitt_sone_api != expected:
                print(f"❌ FAILED: snittSone should be {expected}, got {snitt_sone_api}")
                return False
            print(f"✅ snittSone={snitt_sone_api} (rounded from DB: {snitt_sone_db}) (CORRECT)")
        
        print(f"✅ TEST 3 PASSED: DB verification successful")
        return True
        
    except Exception as e:
        print(f"❌ TEST 3 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_tracking_unchanged():
    """Test 4: Verify spor=0 does NOT increment aapningar"""
    print("\n" + "="*80)
    print("TEST 4: Verify spor=0 does NOT increment aapningar (tracking unchanged)")
    print("="*80)
    
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Get aapningar BEFORE
        lead_before = db.salgsradar_leads.find_one({'tilbudSlug': TEST_SLUG})
        if not lead_before:
            print(f"❌ FAILED: Lead not found in DB")
            return False
        
        aapningar_before = lead_before.get('aapningar', 0)
        sist_aapnet_before = lead_before.get('sistAapnet')
        
        print(f"BEFORE: aapningar={aapningar_before}, sistAapnet={sist_aapnet_before}")
        
        # Call API with spor=0
        url = f"{API_BASE}/tilbud?slug={TEST_SLUG}&spor=0"
        response = requests.get(url, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ FAILED: API call failed")
            return False
        
        # Get aapningar AFTER
        lead_after = db.salgsradar_leads.find_one({'tilbudSlug': TEST_SLUG})
        aapningar_after = lead_after.get('aapningar', 0)
        sist_aapnet_after = lead_after.get('sistAapnet')
        
        print(f"AFTER:  aapningar={aapningar_after}, sistAapnet={sist_aapnet_after}")
        
        # Verify UNCHANGED
        if aapningar_after != aapningar_before:
            print(f"❌ FAILED: aapningar changed from {aapningar_before} to {aapningar_after} (should be UNCHANGED with spor=0)")
            return False
        
        if sist_aapnet_after != sist_aapnet_before:
            print(f"❌ FAILED: sistAapnet changed (should be UNCHANGED with spor=0)")
            return False
        
        print(f"✅ TEST 4 PASSED: Tracking unchanged with spor=0")
        return True
        
    except Exception as e:
        print(f"❌ TEST 4 FAILED with exception: {e}")
        return False


def test_invalid_slug():
    """Test 5: Invalid slug returns 404 or {ok:false}"""
    print("\n" + "="*80)
    print("TEST 5: Invalid slug returns 404 or {ok:false}")
    print("="*80)
    
    try:
        url = f"{API_BASE}/tilbud?slug=finnes-ikke-123&spor=0"
        response = requests.get(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        # Accept either 404 or 200 with ok:false
        if response.status_code == 404:
            print(f"✅ TEST 5 PASSED: Returns 404 for invalid slug")
            return True
        elif response.status_code == 200:
            data = response.json()
            if not data.get('ok'):
                print(f"✅ TEST 5 PASSED: Returns ok:false for invalid slug")
                return True
            else:
                print(f"❌ FAILED: Returns 200 ok:true for invalid slug")
                return False
        else:
            print(f"❌ FAILED: Unexpected status {response.status_code}")
            return False
        
    except Exception as e:
        print(f"❌ TEST 5 FAILED with exception: {e}")
        return False


def test_kontakt_validation():
    """Test 6: POST /api/tilbud/kontakt validation (without phone/message)"""
    print("\n" + "="*80)
    print("TEST 6: POST /api/tilbud/kontakt validation (empty payload → 400)")
    print("="*80)
    
    try:
        url = f"{API_BASE}/tilbud/kontakt"
        payload = {'slug': TEST_SLUG}  # No telefon or melding
        
        print(f"Calling: {url}")
        print(f"Payload: {payload}")
        
        response = requests.post(url, json=payload, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 400:
            print(f"❌ FAILED: Expected 400 for empty payload, got {response.status_code}")
            return False
        
        print(f"✅ TEST 6 PASSED: Returns 400 for empty payload (validation working)")
        return True
        
    except Exception as e:
        print(f"❌ TEST 6 FAILED with exception: {e}")
        return False


def test_optional_snittsone_with_data():
    """Test 7 (OPTIONAL): If another lead has antallISone >= 2 and snittSone > 0, verify it shows as number"""
    print("\n" + "="*80)
    print("TEST 7 (OPTIONAL): Find lead with antallISone >= 2 and verify snittSone is number")
    print("="*80)
    
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Find a lead with antallISone >= 2 and snittSone > 0
        lead = db.salgsradar_leads.find_one({
            'analyse.grunnlag.antallISone': {'$gte': 2},
            'analyse.grunnlag.snittSone': {'$gt': 0}
        })
        
        if not lead:
            print(f"⚠️  SKIPPED: No lead found with antallISone >= 2 and snittSone > 0")
            return True  # Not a failure, just skip
        
        slug = lead.get('tilbudSlug')
        adresse = lead.get('adresse', 'N/A')
        grunnlag_db = lead.get('analyse', {}).get('grunnlag', {})
        
        print(f"Found lead: {adresse} (slug: {slug})")
        print(f"DB grunnlag: antallISone={grunnlag_db.get('antallISone')}, snittSone={grunnlag_db.get('snittSone')}")
        
        # Get API response
        url = f"{API_BASE}/tilbud?slug={slug}&spor=0"
        response = requests.get(url, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ FAILED: Could not fetch tilbud")
            return False
        
        data = response.json()
        tilbud = data.get('tilbud', {})
        grunnlag_api = tilbud.get('grunnlag', {})
        snitt_sone_api = grunnlag_api.get('snittSone')
        
        print(f"API grunnlag: snittSone={snitt_sone_api}")
        
        # Verify snittSone is a number (not null)
        if snitt_sone_api is None:
            print(f"❌ FAILED: snittSone should be a number when antallISone >= 2 and snittSone > 0, got null")
            return False
        
        if not isinstance(snitt_sone_api, (int, float)):
            print(f"❌ FAILED: snittSone should be a number, got {type(snitt_sone_api)}")
            return False
        
        # Verify it's rounded
        expected = round(grunnlag_db.get('snittSone', 0))
        if snitt_sone_api != expected:
            print(f"❌ FAILED: snittSone should be {expected}, got {snitt_sone_api}")
            return False
        
        print(f"✅ TEST 7 PASSED: snittSone={snitt_sone_api} (rounded, correct)")
        return True
        
    except Exception as e:
        print(f"❌ TEST 7 FAILED with exception: {e}")
        return False


def main():
    print("\n" + "="*80)
    print("BACKEND TEST: TILBUD offentlig payload - snittSone i grunnlag")
    print("="*80)
    print(f"Base URL: {API_BASE}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print(f"Test slug: {TEST_SLUG}")
    print("="*80)
    
    results = []
    
    # Run tests
    results.append(("Test 1: GET /api/tilbud structure and snittSone=null", test_tilbud_endpoint()))
    results.append(("Test 2: Math verification", test_math_verification()))
    results.append(("Test 3: DB verification", test_db_verification()))
    results.append(("Test 4: Tracking unchanged (spor=0)", test_tracking_unchanged()))
    results.append(("Test 5: Invalid slug", test_invalid_slug()))
    results.append(("Test 6: POST kontakt validation", test_kontakt_validation()))
    results.append(("Test 7 (OPTIONAL): snittSone with data", test_optional_snittsone_with_data()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == '__main__':
    sys.exit(main())
