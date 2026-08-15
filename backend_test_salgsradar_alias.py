#!/usr/bin/env python3
"""
Backend test for Salgsradar fulltext alias functionality.
Tests the new alias support for annonsetekst/tekst/description/etc and mobler/moblering/furnished.
"""
import requests
import sys
import os
from pymongo import MongoClient

# Read environment
with open('/app/.env', 'r') as f:
    for line in f:
        if line.strip() and not line.startswith('#') and '=' in line:
            key, val = line.strip().split('=', 1)
            os.environ[key] = val.strip('"').strip("'")

BASE_URL = os.environ.get('NEXT_PUBLIC_BASE_URL', '').rstrip('/')
INGEST_KEY = os.environ.get('SALGSRADAR_INGEST_KEY', '')
ADMIN_EMAIL = 'martin@kviteberg.no'
ADMIN_PASSWORD = 'Pyramiden2025##'
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'your_database_name')

print(f"Base URL: {BASE_URL}/api")
print(f"Ingest key configured: {'Yes' if INGEST_KEY else 'No'}")
print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
print()

# Get admin token
print("=== ADMIN LOGIN ===")
try:
    r = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }, timeout=10)
    print(f"POST /api/admin/auth/login: {r.status_code}")
    if r.status_code != 200:
        print(f"ERROR: Login failed: {r.text}")
        sys.exit(1)
    data = r.json()
    ADMIN_KEY = data.get('token', '')
    if not ADMIN_KEY:
        print("ERROR: No token in login response")
        sys.exit(1)
    print(f"✅ Admin login successful, token obtained")
except Exception as e:
    print(f"❌ Admin login failed: {e}")
    sys.exit(1)

print()

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Test counters
tests_passed = 0
tests_failed = 0
test_lead_ids = []

def test_step(name, condition, error_msg=""):
    global tests_passed, tests_failed
    if condition:
        print(f"✅ {name}")
        tests_passed += 1
        return True
    else:
        print(f"❌ {name}: {error_msg}")
        tests_failed += 1
        return False

print("=== TEST 1: POST INGEST WITH ALIAS 'annonsetekst' ===")
try:
    payload = {
        "finnkode": "99000111",
        "tittel": "TESTLEAD alias-sjekk",
        "adresse": "Testveien 1",
        "postnr": "5003",
        "pris": 18000,
        "m2": 55,
        "soverom": 2,
        "boligtype": "Leilighet",
        "bilder": [],  # Empty to avoid AI image cost
        "annonsetekst": "Lys og pen 2-roms sentralt på Testberget. Leiligheten leies ut umøblert. Felles takterrasse, dusjbad fra 2022, og gangavstand til Bybanen. TESTTEKST-ALIAS-123",
        "moblering": "Umøblert"
    }
    r = requests.post(
        f"{BASE_URL}/api/salgsradar/ingest",
        json=payload,
        headers={"Authorization": f"Bearer {INGEST_KEY}"},
        timeout=15
    )
    print(f"POST /api/salgsradar/ingest: {r.status_code}")
    test_step("Ingest returns 200/201", r.status_code in [200, 201], f"Got {r.status_code}")
    if r.status_code in [200, 201]:
        data = r.json()
        test_step("Response has ok:true", data.get('ok') == True, f"Got {data}")
        lead_id = data.get('leadId', '')
        if lead_id:
            test_lead_ids.append(lead_id)
            print(f"Lead ID: {lead_id}")
except Exception as e:
    print(f"❌ Ingest request failed: {e}")
    tests_failed += 1

print()

print("=== TEST 2: GET ADMIN LEADS - VERIFY ALIAS MAPPING ===")
try:
    r = requests.get(
        f"{BASE_URL}/api/admin/salgsradar/leads?key={ADMIN_KEY}",
        timeout=10
    )
    print(f"GET /api/admin/salgsradar/leads: {r.status_code}")
    test_step("GET leads returns 200", r.status_code == 200, f"Got {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        leads = data.get('leads', [])
        test_lead = None
        for lead in leads:
            if lead.get('finnkode') == '99000111':
                test_lead = lead
                break
        
        test_step("Found lead with finnkode 99000111", test_lead is not None, "Lead not found")
        
        if test_lead:
            beskrivelse = test_lead.get('beskrivelse', '')
            test_step(
                "beskrivelse contains 'TESTTEKST-ALIAS-123'",
                'TESTTEKST-ALIAS-123' in beskrivelse,
                f"Got beskrivelse: {beskrivelse[:100]}"
            )
            
            mobler = test_lead.get('mobler', '')
            test_step(
                "mobler === 'Umøblert'",
                mobler == 'Umøblert',
                f"Got mobler: {mobler}"
            )
            
            mottatte = test_lead.get('mottatteFelter', [])
            test_step(
                "mottatteFelter is array",
                isinstance(mottatte, list),
                f"Got type: {type(mottatte)}"
            )
            test_step(
                "mottatteFelter contains 'annonsetekst'",
                'annonsetekst' in mottatte,
                f"Got mottatteFelter: {mottatte}"
            )
            test_step(
                "mottatteFelter contains 'moblering'",
                'moblering' in mottatte,
                f"Got mottatteFelter: {mottatte}"
            )
except Exception as e:
    print(f"❌ GET leads failed: {e}")
    tests_failed += 1

print()

print("=== TEST 3: DEDUPE-REFRESH WITH DIFFERENT ALIAS 'tekst' ===")
try:
    payload = {
        "finnkode": "99000111",  # Same finnkode
        "tittel": "TESTLEAD alias-sjekk",
        "adresse": "Testveien 1",
        "postnr": "5003",
        "pris": 18000,
        "m2": 55,
        "soverom": 2,
        "boligtype": "Leilighet",
        "bilder": [],
        "tekst": "OPPDATERT-TEKST-456 møblert utleie",  # Different alias, no annonsetekst
        "mobler": "Møblert"
    }
    r = requests.post(
        f"{BASE_URL}/api/salgsradar/ingest",
        json=payload,
        headers={"Authorization": f"Bearer {INGEST_KEY}"},
        timeout=15
    )
    print(f"POST /api/salgsradar/ingest (dedupe): {r.status_code}")
    test_step("Dedupe ingest returns 200", r.status_code == 200, f"Got {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        test_step("Response has ok:true", data.get('ok') == True, f"Got {data}")
        test_step("Response has ny:false (dedupe)", data.get('ny') == False, f"Got ny: {data.get('ny')}")
except Exception as e:
    print(f"❌ Dedupe ingest failed: {e}")
    tests_failed += 1

print()

print("=== TEST 4: VERIFY DEDUPE UPDATED BESKRIVELSE ===")
try:
    r = requests.get(
        f"{BASE_URL}/api/admin/salgsradar/leads?key={ADMIN_KEY}",
        timeout=10
    )
    print(f"GET /api/admin/salgsradar/leads: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        leads = data.get('leads', [])
        test_lead = None
        for lead in leads:
            if lead.get('finnkode') == '99000111':
                test_lead = lead
                break
        
        if test_lead:
            beskrivelse = test_lead.get('beskrivelse', '')
            test_step(
                "beskrivelse now contains 'OPPDATERT-TEKST-456'",
                'OPPDATERT-TEKST-456' in beskrivelse,
                f"Got beskrivelse: {beskrivelse[:100]}"
            )
            test_step(
                "beskrivelse does NOT contain old 'TESTTEKST-ALIAS-123'",
                'TESTTEKST-ALIAS-123' not in beskrivelse,
                f"Old text still present"
            )
            
            mobler = test_lead.get('mobler', '')
            test_step(
                "mobler updated to 'Møblert'",
                mobler == 'Møblert',
                f"Got mobler: {mobler}"
            )
except Exception as e:
    print(f"❌ Verify dedupe failed: {e}")
    tests_failed += 1

print()

print("=== TEST 5: EDGE CASE - NO TEXT FIELD ===")
try:
    payload = {
        "finnkode": "99000112",
        "tittel": "TESTLEAD no text",
        "adresse": "Testveien 2",
        "postnr": "5003",
        "pris": 15000,
        "m2": 45,
        "soverom": 1,
        "boligtype": "Leilighet",
        "bilder": []
        # No text field at all
    }
    r = requests.post(
        f"{BASE_URL}/api/salgsradar/ingest",
        json=payload,
        headers={"Authorization": f"Bearer {INGEST_KEY}"},
        timeout=15
    )
    print(f"POST /api/salgsradar/ingest (no text): {r.status_code}")
    test_step("Ingest without text field returns 200/201", r.status_code in [200, 201], f"Got {r.status_code}")
    if r.status_code in [200, 201]:
        data = r.json()
        test_step("Response has ok:true", data.get('ok') == True, f"Got {data}")
        lead_id = data.get('leadId', '')
        if lead_id:
            test_lead_ids.append(lead_id)
            
            # Verify beskrivelse is empty string
            r2 = requests.get(f"{BASE_URL}/api/admin/salgsradar/leads?key={ADMIN_KEY}", timeout=10)
            if r2.status_code == 200:
                leads = r2.json().get('leads', [])
                for lead in leads:
                    if lead.get('finnkode') == '99000112':
                        beskrivelse = lead.get('beskrivelse', None)
                        test_step(
                            "beskrivelse is empty string when no text field",
                            beskrivelse == '',
                            f"Got beskrivelse: {beskrivelse}"
                        )
                        break
except Exception as e:
    print(f"❌ No text field test failed: {e}")
    tests_failed += 1

print()

print("=== TEST 6: EDGE CASE - INVALID FINNKODE ===")
try:
    payload = {
        "finnkode": "12",  # Too short
        "tittel": "TESTLEAD invalid",
        "adresse": "Testveien 3",
        "postnr": "5003",
        "pris": 15000,
        "bilder": []
    }
    r = requests.post(
        f"{BASE_URL}/api/salgsradar/ingest",
        json=payload,
        headers={"Authorization": f"Bearer {INGEST_KEY}"},
        timeout=15
    )
    print(f"POST /api/salgsradar/ingest (invalid finnkode): {r.status_code}")
    test_step("Invalid finnkode returns 400", r.status_code == 400, f"Got {r.status_code}")
    if r.status_code == 400:
        data = r.json()
        test_step("Response has ok:false", data.get('ok') == False, f"Got {data}")
        test_step(
            "Error mentions finnkode",
            'finnkode' in str(data.get('error', '')).lower(),
            f"Got error: {data.get('error')}"
        )
except Exception as e:
    print(f"❌ Invalid finnkode test failed: {e}")
    tests_failed += 1

print()

print("=== TEST 7: UNAUTHORIZED ACCESS ===")
try:
    payload = {
        "finnkode": "99000113",
        "tittel": "TESTLEAD unauth",
        "adresse": "Testveien 4",
        "postnr": "5003",
        "pris": 15000,
        "bilder": []
    }
    r = requests.post(
        f"{BASE_URL}/api/salgsradar/ingest",
        json=payload,
        # No Authorization header
        timeout=15
    )
    print(f"POST /api/salgsradar/ingest (no auth): {r.status_code}")
    test_step("Ingest without key returns 401", r.status_code == 401, f"Got {r.status_code}")
except Exception as e:
    print(f"❌ Unauthorized test failed: {e}")
    tests_failed += 1

print()

print("=== TEST 8: VERIFY REAL USER LEADS UNTOUCHED ===")
try:
    r = requests.get(
        f"{BASE_URL}/api/admin/salgsradar/leads?key={ADMIN_KEY}",
        timeout=10
    )
    if r.status_code == 200:
        data = r.json()
        leads = data.get('leads', [])
        real_leads = [
            'Nordnesveien 25',
            'Stormyrvegen 2',
            'Roald Amundsens vei 95'
        ]
        found_real = []
        for lead in leads:
            adresse = lead.get('adresse', '')
            for real in real_leads:
                if real in adresse:
                    found_real.append(real)
        
        test_step(
            f"Real user leads still present ({len(found_real)} found)",
            len(found_real) > 0,
            f"Found: {found_real}"
        )
except Exception as e:
    print(f"❌ Verify real leads failed: {e}")
    tests_failed += 1

print()

print("=== CLEANUP: DELETE TEST LEADS ===")
cleanup_success = True
try:
    # Get all test leads to find their IDs
    r = requests.get(
        f"{BASE_URL}/api/admin/salgsradar/leads?key={ADMIN_KEY}",
        timeout=10
    )
    if r.status_code == 200:
        data = r.json()
        leads = data.get('leads', [])
        test_finnkoder = ['99000111', '99000112']
        
        for finnkode in test_finnkoder:
            for lead in leads:
                if lead.get('finnkode') == finnkode:
                    lead_id = lead.get('id')
                    if lead_id:
                        print(f"Deleting lead {finnkode} (id: {lead_id})...")
                        r_del = requests.delete(
                            f"{BASE_URL}/api/admin/salgsradar/lead?id={lead_id}&key={ADMIN_KEY}",
                            timeout=10
                        )
                        if r_del.status_code == 200:
                            print(f"✅ Deleted lead {finnkode}")
                        else:
                            print(f"⚠️ Failed to delete lead {finnkode}: {r_del.status_code}")
                            cleanup_success = False
                    break
        
        # Verify deletion
        r_verify = requests.get(
            f"{BASE_URL}/api/admin/salgsradar/leads?key={ADMIN_KEY}",
            timeout=10
        )
        if r_verify.status_code == 200:
            remaining_leads = r_verify.json().get('leads', [])
            test_leads_remaining = [l for l in remaining_leads if l.get('finnkode') in test_finnkoder]
            test_step(
                "All test leads deleted",
                len(test_leads_remaining) == 0,
                f"Still found {len(test_leads_remaining)} test leads"
            )
except Exception as e:
    print(f"❌ Cleanup failed: {e}")
    cleanup_success = False
    tests_failed += 1

print()
print("=" * 60)
print(f"TESTS PASSED: {tests_passed}")
print(f"TESTS FAILED: {tests_failed}")
print(f"SUCCESS RATE: {tests_passed}/{tests_passed + tests_failed} ({100 * tests_passed // (tests_passed + tests_failed) if tests_passed + tests_failed > 0 else 0}%)")
print("=" * 60)

if tests_failed > 0:
    sys.exit(1)
else:
    print("✅ ALL TESTS PASSED")
    sys.exit(0)
