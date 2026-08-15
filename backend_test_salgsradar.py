#!/usr/bin/env python3
"""
Backend test for Salgsradar (DigiHome Next.js App Router)
Tests three new backend tasks:
1. Utleier-kontaktdata (contact phone/name with alias support and persistence)
2. Prisendring/prishistorikk (price change tracking)
3. Deaktivering (deactivation and reactivation)
4. Tombstone (deleted leads don't resurrect)
5. Salgskraft in AI analysis (sales power metrics)
6. Regression tests
"""

import requests
import time
import json
import os
from pymongo import MongoClient

# Load environment variables
def load_env():
    env = {}
    with open('/app/.env', 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                # Remove quotes if present
                value = value.strip('"').strip("'")
                env[key] = value
    return env

env = load_env()
BASE_URL = env.get('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
INGEST_KEY = env.get('SALGSRADAR_INGEST_KEY', '')
MONGO_URL = env.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = env.get('DB_NAME', 'your_database_name')
ADMIN_EMAIL = env.get('ADMIN_SEED_EMAIL', 'martin@kviteberg.no')
ADMIN_PASSWORD = env.get('ADMIN_SEED_PASSWORD', 'Pyramiden2025##')

print(f"Base URL: {BASE_URL}")
print(f"API URL: {API_URL}")
print(f"Ingest key: {INGEST_KEY[:20]}...")
print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
print(f"Admin: {ADMIN_EMAIL}")
print()

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Test state
admin_token = None
test_leads = []  # Track test leads for cleanup

def login_admin():
    """Login as admin and get session token"""
    global admin_token
    try:
        print("=" * 80)
        print("TEST: Admin Login")
        print("=" * 80)
        
        response = requests.post(
            f"{API_URL}/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            admin_token = data.get('token')
            print(f"✅ Login successful, token: {admin_token[:30]}...")
            return True
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Login exception: {e}")
        return False

def test_utleier_kontaktdata():
    """Test 1: Utleier contact data with alias support and persistence"""
    global test_leads
    
    try:
        print("\n" + "=" * 80)
        print("TEST 1: UTLEIER-KONTAKTDATA (Contact Phone/Name with Aliases)")
        print("=" * 80)
        
        # Generate synthetic finnkode (8-10 digits)
        finnkode = "99900001"
        
        # Test 1a: POST ingest with phone under alias 'telefon' and name under alias 'utleier'
        print("\n--- Test 1a: POST ingest with contact data under aliases ---")
        payload = {
            "finnkode": finnkode,
            "pris": 15000,
            "adresse": "Testveien 123",
            "postnr": "5007",
            "tittel": "QA Test Leilighet",
            "bilder": [],  # Empty to avoid AI styling costs
            "telefon": "912 34 567",  # Alias for kontaktTlf
            "utleier": "Test Utleiersen",  # Alias for kontaktNavn
            "beskrivelse": "Dette er en testleilighet for QA-formål."
        }
        
        response = requests.post(
            f"{API_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload,
            timeout=30
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get('ok'):
                lead_id = data.get('leadId')
                test_leads.append({'id': lead_id, 'finnkode': finnkode})
                print(f"✅ Ingest successful, leadId: {lead_id}")
            else:
                print(f"❌ Ingest failed: {data}")
                return False
        else:
            print(f"❌ Ingest failed with status {response.status_code}")
            return False
        
        # Test 1b: Verify kontaktTlf and kontaktNavn in database
        print("\n--- Test 1b: Verify contact data in lead ---")
        time.sleep(1)  # Brief wait for DB write
        
        response = requests.get(
            f"{API_URL}/admin/salgsradar/leads?key={admin_token}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', [])
            test_lead = next((l for l in leads if l.get('finnkode') == finnkode), None)
            
            if test_lead:
                kontakt_tlf = test_lead.get('kontaktTlf', '')
                kontakt_navn = test_lead.get('kontaktNavn', '')
                
                print(f"Lead kontaktTlf: '{kontakt_tlf}'")
                print(f"Lead kontaktNavn: '{kontakt_navn}'")
                
                # Verify spaces removed from phone
                if kontakt_tlf == '91234567':
                    print("✅ kontaktTlf correct (spaces removed): '91234567'")
                else:
                    print(f"❌ kontaktTlf incorrect, expected '91234567', got '{kontakt_tlf}'")
                    return False
                
                # Verify name
                if kontakt_navn == 'Test Utleiersen':
                    print("✅ kontaktNavn correct: 'Test Utleiersen'")
                else:
                    print(f"❌ kontaktNavn incorrect, expected 'Test Utleiersen', got '{kontakt_navn}'")
                    return False
            else:
                print(f"❌ Test lead with finnkode {finnkode} not found")
                return False
        else:
            print(f"❌ Failed to get leads: {response.status_code}")
            return False
        
        # Test 1c: Re-ingest SAME finnkode WITHOUT phone/name fields
        print("\n--- Test 1c: Re-ingest without contact fields (should persist) ---")
        payload_no_contact = {
            "finnkode": finnkode,
            "pris": 15000,
            "adresse": "Testveien 123",
            "postnr": "5007",
            "tittel": "QA Test Leilighet (oppdatert)",
            "bilder": [],
            "beskrivelse": "Oppdatert beskrivelse uten kontaktinfo."
        }
        
        response = requests.post(
            f"{API_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload_no_contact,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Re-ingest successful")
        else:
            print(f"❌ Re-ingest failed: {response.status_code}")
            return False
        
        # Verify contact data still exists
        time.sleep(1)
        response = requests.get(
            f"{API_URL}/admin/salgsradar/leads?key={admin_token}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', [])
            test_lead = next((l for l in leads if l.get('finnkode') == finnkode), None)
            
            if test_lead:
                kontakt_tlf = test_lead.get('kontaktTlf', '')
                kontakt_navn = test_lead.get('kontaktNavn', '')
                
                print(f"After re-ingest - kontaktTlf: '{kontakt_tlf}'")
                print(f"After re-ingest - kontaktNavn: '{kontakt_navn}'")
                
                if kontakt_tlf == '91234567' and kontakt_navn == 'Test Utleiersen':
                    print("✅ Contact data persisted (not wiped out)")
                else:
                    print(f"❌ Contact data was wiped: tlf='{kontakt_tlf}', navn='{kontakt_navn}'")
                    return False
            else:
                print(f"❌ Test lead not found after re-ingest")
                return False
        
        # Test 1d: Test another alias pair in an update
        print("\n--- Test 1d: Update with different aliases (mobil, kontaktperson) ---")
        payload_new_aliases = {
            "finnkode": finnkode,
            "pris": 15000,
            "adresse": "Testveien 123",
            "postnr": "5007",
            "tittel": "QA Test Leilighet",
            "bilder": [],
            "mobil": "987 65 432",  # Different alias for phone
            "kontaktperson": "Ny Person",  # Different alias for name
            "beskrivelse": "Oppdatert med nye aliaser."
        }
        
        response = requests.post(
            f"{API_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload_new_aliases,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Update with new aliases successful")
        else:
            print(f"❌ Update failed: {response.status_code}")
            return False
        
        # Verify updated values
        time.sleep(1)
        response = requests.get(
            f"{API_URL}/admin/salgsradar/leads?key={admin_token}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', [])
            test_lead = next((l for l in leads if l.get('finnkode') == finnkode), None)
            
            if test_lead:
                kontakt_tlf = test_lead.get('kontaktTlf', '')
                kontakt_navn = test_lead.get('kontaktNavn', '')
                
                print(f"After alias update - kontaktTlf: '{kontakt_tlf}'")
                print(f"After alias update - kontaktNavn: '{kontakt_navn}'")
                
                if kontakt_tlf == '98765432' and kontakt_navn == 'Ny Person':
                    print("✅ Contact data updated with new aliases")
                else:
                    print(f"❌ Contact data not updated correctly: tlf='{kontakt_tlf}', navn='{kontakt_navn}'")
                    return False
        
        print("\n✅ TEST 1 PASSED: Utleier-kontaktdata working correctly")
        return True
        
    except Exception as e:
        print(f"❌ TEST 1 EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_prisendring():
    """Test 2: Price change tracking"""
    global test_leads
    
    try:
        print("\n" + "=" * 80)
        print("TEST 2: PRISENDRING/PRISHISTORIKK (Price Change Tracking)")
        print("=" * 80)
        
        # Use the same lead from test 1
        finnkode = "99900001"
        
        # Re-ingest with new price
        print("\n--- Test 2a: Re-ingest with new price ---")
        payload = {
            "finnkode": finnkode,
            "pris": 14000,  # Changed from 15000 to 14000
            "adresse": "Testveien 123",
            "postnr": "5007",
            "tittel": "QA Test Leilighet",
            "bilder": [],
            "beskrivelse": "Prisreduksjon!"
        }
        
        response = requests.post(
            f"{API_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload,
            timeout=30
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                # Check for prisEndring in response
                pris_endring = data.get('prisEndring')
                if pris_endring:
                    print(f"✅ Response contains prisEndring: {pris_endring}")
                    if pris_endring.get('fra') == 15000 and pris_endring.get('til') == 14000:
                        print("✅ prisEndring values correct (fra: 15000, til: 14000)")
                    else:
                        print(f"❌ prisEndring values incorrect: {pris_endring}")
                        return False
                else:
                    print("❌ Response missing prisEndring field")
                    return False
            else:
                print(f"❌ Ingest failed: {data}")
                return False
        else:
            print(f"❌ Ingest failed with status {response.status_code}")
            return False
        
        # Verify prisHistorikk in lead
        print("\n--- Test 2b: Verify prisHistorikk in lead ---")
        time.sleep(1)
        
        response = requests.get(
            f"{API_URL}/admin/salgsradar/leads?key={admin_token}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', [])
            test_lead = next((l for l in leads if l.get('finnkode') == finnkode), None)
            
            if test_lead:
                pris_historikk = test_lead.get('prisHistorikk', [])
                print(f"prisHistorikk: {pris_historikk}")
                
                if len(pris_historikk) > 0:
                    latest = pris_historikk[-1]
                    if latest.get('fra') == 15000 and latest.get('til') == 14000:
                        print("✅ prisHistorikk contains correct entry")
                    else:
                        print(f"❌ prisHistorikk entry incorrect: {latest}")
                        return False
                else:
                    print("❌ prisHistorikk is empty")
                    return False
            else:
                print(f"❌ Test lead not found")
                return False
        
        print("\n✅ TEST 2 PASSED: Prisendring/prishistorikk working correctly")
        return True
        
    except Exception as e:
        print(f"❌ TEST 2 EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_deaktivering():
    """Test 3: Deactivation and reactivation"""
    global test_leads
    
    try:
        print("\n" + "=" * 80)
        print("TEST 3: DEAKTIVERING (Deactivation and Reactivation)")
        print("=" * 80)
        
        finnkode = "99900001"
        
        # Test 3a: Send deactivation payload
        print("\n--- Test 3a: Send deactivation payload ---")
        # Based on route.js line 3897: deaktivert: true OR aktiv: false OR status: 'deaktivert'
        payload = {
            "finnkode": finnkode,
            "deaktivert": True
        }
        
        response = requests.post(
            f"{API_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload,
            timeout=30
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok') and data.get('deaktivert'):
                print("✅ Deactivation successful")
            else:
                print(f"❌ Deactivation response unexpected: {data}")
                return False
        else:
            print(f"❌ Deactivation failed with status {response.status_code}")
            return False
        
        # Verify annonseAktiv = false
        print("\n--- Test 3b: Verify annonseAktiv = false ---")
        time.sleep(1)
        
        response = requests.get(
            f"{API_URL}/admin/salgsradar/leads?key={admin_token}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', [])
            test_lead = next((l for l in leads if l.get('finnkode') == finnkode), None)
            
            if test_lead:
                annonse_aktiv = test_lead.get('annonseAktiv')
                print(f"annonseAktiv: {annonse_aktiv}")
                
                if annonse_aktiv == False:
                    print("✅ annonseAktiv is False (deactivated)")
                else:
                    print(f"❌ annonseAktiv should be False, got: {annonse_aktiv}")
                    return False
            else:
                print(f"❌ Test lead not found")
                return False
        
        # Test 3c: Reactivate by sending full ad
        print("\n--- Test 3c: Reactivate by sending full ad ---")
        payload = {
            "finnkode": finnkode,
            "pris": 14000,
            "adresse": "Testveien 123",
            "postnr": "5007",
            "tittel": "QA Test Leilighet (reaktivert)",
            "bilder": [],
            "beskrivelse": "Annonsen er aktiv igjen!"
        }
        
        response = requests.post(
            f"{API_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Reactivation ingest successful")
        else:
            print(f"❌ Reactivation failed: {response.status_code}")
            return False
        
        # Verify annonseAktiv = true
        time.sleep(1)
        response = requests.get(
            f"{API_URL}/admin/salgsradar/leads?key={admin_token}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', [])
            test_lead = next((l for l in leads if l.get('finnkode') == finnkode), None)
            
            if test_lead:
                annonse_aktiv = test_lead.get('annonseAktiv')
                print(f"annonseAktiv after reactivation: {annonse_aktiv}")
                
                if annonse_aktiv == True:
                    print("✅ annonseAktiv is True (reactivated)")
                else:
                    print(f"❌ annonseAktiv should be True, got: {annonse_aktiv}")
                    return False
        
        print("\n✅ TEST 3 PASSED: Deaktivering working correctly")
        return True
        
    except Exception as e:
        print(f"❌ TEST 3 EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_tombstone():
    """Test 4: Tombstone (deleted leads don't resurrect)"""
    global test_leads
    
    try:
        print("\n" + "=" * 80)
        print("TEST 4: TOMBSTONE (Deleted Leads Don't Resurrect)")
        print("=" * 80)
        
        finnkode = "99900001"
        
        # Test 4a: Delete test lead via admin endpoint
        print("\n--- Test 4a: Delete test lead via admin endpoint ---")
        
        # First, get the lead ID
        response = requests.get(
            f"{API_URL}/admin/salgsradar/leads?key={admin_token}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', [])
            test_lead = next((l for l in leads if l.get('finnkode') == finnkode), None)
            
            if test_lead:
                lead_id = test_lead.get('id')
                print(f"Found test lead with id: {lead_id}")
                
                # Delete the lead
                response = requests.delete(
                    f"{API_URL}/admin/salgsradar/lead?id={lead_id}&key={admin_token}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    print("✅ Lead deleted successfully")
                    # Remove from test_leads tracking
                    test_leads = [l for l in test_leads if l.get('finnkode') != finnkode]
                else:
                    print(f"❌ Delete failed: {response.status_code}")
                    return False
            else:
                print(f"❌ Test lead not found for deletion")
                return False
        
        # Test 4b: Try to re-ingest same finnkode (should be skipped due to tombstone)
        print("\n--- Test 4b: Re-ingest deleted finnkode (should be skipped) ---")
        time.sleep(1)
        
        payload = {
            "finnkode": finnkode,
            "pris": 16000,
            "adresse": "Testveien 123",
            "postnr": "5007",
            "tittel": "QA Test Leilighet (forsøk på gjenopplivelse)",
            "bilder": [],
            "beskrivelse": "Dette skal ikke fungere!"
        }
        
        response = requests.post(
            f"{API_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload,
            timeout=30
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok') and data.get('hoppet') == 'slettet-i-admin':
                print("✅ Ingest correctly skipped tombstoned lead")
            else:
                print(f"❌ Unexpected response: {data}")
                return False
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            return False
        
        # Verify lead does NOT exist in database
        print("\n--- Test 4c: Verify lead does NOT exist in database ---")
        time.sleep(1)
        
        response = requests.get(
            f"{API_URL}/admin/salgsradar/leads?key={admin_token}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', [])
            test_lead = next((l for l in leads if l.get('finnkode') == finnkode), None)
            
            if test_lead is None:
                print("✅ Lead does NOT exist (tombstone working)")
            else:
                print(f"❌ Lead still exists (tombstone failed): {test_lead.get('id')}")
                return False
        
        print("\n✅ TEST 4 PASSED: Tombstone working correctly")
        return True
        
    except Exception as e:
        print(f"❌ TEST 4 EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_salgskraft_ai():
    """Test 5: Salgskraft in AI analysis"""
    global test_leads
    
    try:
        print("\n" + "=" * 80)
        print("TEST 5: SALGSKRAFT I AI-ANALYSEN (Sales Power Metrics)")
        print("=" * 80)
        print("⚠️  This test will trigger 1 LLM call (takes 15-60 seconds)")
        
        # Create a new test lead with a different finnkode
        finnkode = "99900002"
        
        print("\n--- Test 5a: Create test lead via ingest ---")
        payload = {
            "finnkode": finnkode,
            "pris": 18000,
            "adresse": "Salgskraftveien 456",
            "postnr": "5007",
            "tittel": "QA Salgskraft Test",
            "bilder": [],  # Empty to avoid image styling costs
            "beskrivelse": "Dette er en testleilighet for å verifisere salgskraft-metrikken. Leiligheten har god beliggenhet, moderne standard og flott utsikt. Perfekt for studenter eller unge profesjonelle. Sentralt beliggende med kort vei til sentrum og kollektivtransport."
        }
        
        response = requests.post(
            f"{API_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload,
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get('ok'):
                lead_id = data.get('leadId')
                test_leads.append({'id': lead_id, 'finnkode': finnkode})
                print(f"✅ Test lead created, leadId: {lead_id}")
            else:
                print(f"❌ Ingest failed: {data}")
                return False
        else:
            print(f"❌ Ingest failed with status {response.status_code}")
            return False
        
        # Test 5b: Poll for auto-analysis or call manual analysis endpoint
        print("\n--- Test 5b: Wait for auto-analysis or trigger manual analysis ---")
        print("Auto-analysis runs in background. Polling for up to 90 seconds...")
        
        ai_found = False
        max_polls = 18  # 18 * 5 seconds = 90 seconds
        
        for i in range(max_polls):
            time.sleep(5)
            print(f"Poll {i+1}/{max_polls}...")
            
            response = requests.get(
                f"{API_URL}/admin/salgsradar/leads?key={admin_token}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                leads = data.get('leads', [])
                test_lead = next((l for l in leads if l.get('finnkode') == finnkode), None)
                
                if test_lead and test_lead.get('ai'):
                    print(f"✅ Auto-analysis completed after {(i+1)*5} seconds")
                    ai_found = True
                    break
        
        # If auto-analysis didn't complete, call manual analysis endpoint
        if not ai_found:
            print("\n⚠️  Auto-analysis not completed, calling manual analysis endpoint...")
            
            response = requests.post(
                f"{API_URL}/admin/salgsradar/analyser",
                headers={"Content-Type": "application/json"},
                json={"leadId": lead_id},
                params={"key": admin_token},
                timeout=120  # Analysis can take up to 60 seconds
            )
            
            print(f"Analysis response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok'):
                    print("✅ Manual analysis completed")
                else:
                    print(f"❌ Manual analysis failed: {data}")
                    return False
            else:
                print(f"❌ Manual analysis failed with status {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return False
        
        # Test 5c: Verify AI analysis results
        print("\n--- Test 5c: Verify AI analysis results ---")
        time.sleep(2)
        
        response = requests.get(
            f"{API_URL}/admin/salgsradar/leads?key={admin_token}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', [])
            test_lead = next((l for l in leads if l.get('finnkode') == finnkode), None)
            
            if test_lead:
                ai = test_lead.get('ai', {})
                print(f"AI analysis result: {json.dumps(ai, indent=2)[:1000]}")
                
                # Verify salgskraft
                salgskraft = ai.get('salgskraft', {})
                if salgskraft:
                    score = salgskraft.get('score')
                    deler = salgskraft.get('deler', {})
                    
                    print(f"\nSalgskraft score: {score}")
                    print(f"Salgskraft deler: {deler}")
                    
                    # Verify score is number 0-100
                    if isinstance(score, (int, float)) and 0 <= score <= 100:
                        print("✅ salgskraft.score is valid (0-100)")
                    else:
                        print(f"❌ salgskraft.score invalid: {score}")
                        return False
                    
                    # Verify deler has required fields (0-10)
                    required_deler = ['forsteinntrykk', 'appell', 'dekning', 'tekstSalg']
                    for del_name in required_deler:
                        del_score = deler.get(del_name)
                        if isinstance(del_score, (int, float)) and 0 <= del_score <= 10:
                            print(f"✅ salgskraft.deler.{del_name} valid: {del_score}")
                        else:
                            print(f"❌ salgskraft.deler.{del_name} invalid: {del_score}")
                            return False
                else:
                    print("❌ salgskraft missing in AI analysis")
                    return False
                
                # Verify bildeVurdering (array, can be empty since no images)
                bilde_vurdering = ai.get('bildeVurdering', [])
                if isinstance(bilde_vurdering, list):
                    print(f"✅ bildeVurdering is array (length: {len(bilde_vurdering)})")
                else:
                    print(f"❌ bildeVurdering is not array: {type(bilde_vurdering)}")
                    return False
                
                # Verify potensialScore
                potensial_score = ai.get('potensialScore')
                if isinstance(potensial_score, (int, float)) and 0 <= potensial_score <= 100:
                    print(f"✅ potensialScore valid: {potensial_score}")
                else:
                    print(f"❌ potensialScore invalid: {potensial_score}")
                    return False
                
                # Verify annonseScore
                annonse_score = ai.get('annonseScore')
                if isinstance(annonse_score, (int, float)) and 0 <= annonse_score <= 100:
                    print(f"✅ annonseScore valid: {annonse_score}")
                else:
                    print(f"❌ annonseScore invalid: {annonse_score}")
                    return False
            else:
                print(f"❌ Test lead not found")
                return False
        
        print("\n✅ TEST 5 PASSED: Salgskraft AI analysis working correctly")
        return True
        
    except Exception as e:
        print(f"❌ TEST 5 EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_regression():
    """Test 6: Regression tests"""
    try:
        print("\n" + "=" * 80)
        print("TEST 6: REGRESSION TESTS")
        print("=" * 80)
        
        # Test 6a: Ingest without valid key (should return 401)
        print("\n--- Test 6a: Ingest without valid key ---")
        payload = {
            "finnkode": "99900099",
            "pris": 10000,
            "adresse": "Test",
            "bilder": []
        }
        
        response = requests.post(
            f"{API_URL}/salgsradar/ingest",
            headers={"Authorization": "Bearer invalid_key"},
            json=payload,
            timeout=10
        )
        
        if response.status_code == 401:
            print("✅ Ingest correctly rejected invalid key (401)")
        else:
            print(f"❌ Expected 401, got {response.status_code}")
            return False
        
        # Test 6b: Ingest with invalid finnkode (should return 400)
        print("\n--- Test 6b: Ingest with invalid finnkode ---")
        payload = {
            "finnkode": "abc123",  # Invalid (not 8-10 digits)
            "pris": 10000,
            "adresse": "Test",
            "bilder": []
        }
        
        response = requests.post(
            f"{API_URL}/salgsradar/ingest",
            headers={"Authorization": f"Bearer {INGEST_KEY}"},
            json=payload,
            timeout=10
        )
        
        if response.status_code == 400:
            print("✅ Ingest correctly rejected invalid finnkode (400)")
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            return False
        
        # Test 6c: Admin leads listing works
        print("\n--- Test 6c: Admin leads listing works ---")
        response = requests.get(
            f"{API_URL}/admin/salgsradar/leads?key={admin_token}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok') and isinstance(data.get('leads'), list):
                leads = data.get('leads', [])
                print(f"✅ Admin leads listing works ({len(leads)} leads)")
                
                # Verify real leads are untouched
                real_leads = ['Nyhavn 7', 'Ytre Markeveien 12']
                for real_lead_name in real_leads:
                    found = any(real_lead_name in l.get('adresse', '') for l in leads)
                    if found:
                        print(f"✅ Real lead '{real_lead_name}' is present and untouched")
                    else:
                        print(f"⚠️  Real lead '{real_lead_name}' not found (may have been deleted by user)")
            else:
                print(f"❌ Unexpected response: {data}")
                return False
        else:
            print(f"❌ Admin leads listing failed: {response.status_code}")
            return False
        
        print("\n✅ TEST 6 PASSED: Regression tests passed")
        return True
        
    except Exception as e:
        print(f"❌ TEST 6 EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_test_leads():
    """Delete all test leads created during testing"""
    global test_leads
    
    try:
        print("\n" + "=" * 80)
        print("CLEANUP: Deleting Test Leads")
        print("=" * 80)
        
        if not test_leads:
            print("No test leads to clean up")
            return True
        
        for test_lead in test_leads:
            lead_id = test_lead.get('id')
            finnkode = test_lead.get('finnkode')
            
            print(f"\nDeleting lead {lead_id} (finnkode: {finnkode})...")
            
            response = requests.delete(
                f"{API_URL}/admin/salgsradar/lead?id={lead_id}&key={admin_token}",
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Lead {lead_id} deleted")
            else:
                print(f"⚠️  Failed to delete lead {lead_id}: {response.status_code}")
        
        # Also clean up tombstones from MongoDB
        print("\nCleaning up tombstones from MongoDB...")
        tombstone_coll = db['salgsradar_tombstones']
        test_finnkoder = [l.get('finnkode') for l in test_leads]
        result = tombstone_coll.delete_many({'finnkode': {'$in': test_finnkoder}})
        print(f"✅ Deleted {result.deleted_count} tombstones")
        
        # Verify cleanup
        print("\nVerifying cleanup...")
        response = requests.get(
            f"{API_URL}/admin/salgsradar/leads?key={admin_token}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', [])
            remaining_test_leads = [l for l in leads if l.get('finnkode', '').startswith('999000')]
            
            if len(remaining_test_leads) == 0:
                print("✅ All test leads cleaned up successfully")
            else:
                print(f"⚠️  {len(remaining_test_leads)} test leads still remain")
        
        test_leads = []
        return True
        
    except Exception as e:
        print(f"❌ CLEANUP EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("=" * 80)
    print("SALGSRADAR BACKEND TESTING")
    print("=" * 80)
    print()
    
    # Login first
    if not login_admin():
        print("\n❌ FATAL: Admin login failed, cannot continue")
        return
    
    # Run tests
    results = {
        "Test 1: Utleier-kontaktdata": test_utleier_kontaktdata(),
        "Test 2: Prisendring": test_prisendring(),
        "Test 3: Deaktivering": test_deaktivering(),
        "Test 4: Tombstone": test_tombstone(),
        "Test 5: Salgskraft AI": test_salgskraft_ai(),
        "Test 6: Regression": test_regression(),
    }
    
    # Cleanup
    cleanup_test_leads()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")

if __name__ == "__main__":
    main()
