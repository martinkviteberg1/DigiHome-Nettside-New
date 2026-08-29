#!/usr/bin/env python3
"""
Backend test for Salgsradar salgspipeline (tildeling/pool, terminale årsaker, provisjon, selgerrapport) 
+ annonsør-deteksjon (privat/megler/Husleie.no) m/ kontaktperson og berikelse

Test plan T1-T13 as specified in review_request.
"""

import requests
import pymongo
import json
import time
from datetime import datetime, timedelta
import uuid

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test data
QA_LEAD_ID = f"qa-salg-{uuid.uuid4()}"
QA_FINNKODE = "999999901"
QA_SELLER_EMAIL = "qa-selger@example.com"
QA_SELLER_PASSWORD = "QaSelger2026##"
qa_seller_id = None
qa_seller_token = None

def print_test(test_num, description):
    print(f"\n{'='*80}")
    print(f"TEST {test_num}: {description}")
    print('='*80)

def print_result(success, message):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    return success

try:
    # Connect to MongoDB
    print("Connecting to MongoDB...")
    mongo_client = pymongo.MongoClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    leads_collection = db['salgsradar_leads']
    users_collection = db['admin_users']
    tombstones_collection = db['salgsradar_tombstones']
    print("✅ MongoDB connected")

    # ========== T1: GET /admin/salgsradar/meg ==========
    print_test("T1", "GET /admin/salgsradar/meg → aktor {id:'admin', erLeder:true} + årsakskataloger")
    
    # With admin key
    response = requests.get(f"{BASE_URL}/admin/salgsradar/meg", params={"key": ADMIN_KEY})
    if response.status_code == 200:
        data = response.json()
        if data.get('ok') and data.get('aktor', {}).get('id') == 'admin' and data.get('aktor', {}).get('erLeder') == True:
            arsaker_tapt = data.get('arsaker', {}).get('tapt', [])
            arsaker_ikke_relevant = data.get('arsaker', {}).get('ikke_relevant', [])
            if len(arsaker_tapt) == 5 and len(arsaker_ikke_relevant) == 5:
                print_result(True, f"Admin aktor correct with erLeder=true, tapt={len(arsaker_tapt)}, ikke_relevant={len(arsaker_ikke_relevant)}")
            else:
                print_result(False, f"Årsaker count wrong: tapt={len(arsaker_tapt)} (expected 5), ikke_relevant={len(arsaker_ikke_relevant)} (expected 5)")
        else:
            print_result(False, f"Response structure wrong: {data}")
    else:
        print_result(False, f"Status {response.status_code}: {response.text}")
    
    # Without key (should be 401)
    response = requests.get(f"{BASE_URL}/admin/salgsradar/meg")
    print_result(response.status_code == 401, f"Without key returns {response.status_code} (expected 401)")

    # ========== T2: Create QA seller + login ==========
    print_test("T2", "Create QA seller (POST /admin/users) + login → session token")
    
    # Create QA seller
    seller_data = {
        "name": "QA Selger",
        "email": QA_SELLER_EMAIL,
        "password": QA_SELLER_PASSWORD,
        "role": "bruker",
        "moduler": ["salgsradar"]
    }
    response = requests.post(f"{BASE_URL}/admin/users", params={"key": ADMIN_KEY}, json=seller_data)
    if response.status_code in [200, 201]:
        seller_resp = response.json()
        # Get seller ID from selgere list since response might not include it
        selgere_resp = requests.get(f"{BASE_URL}/admin/salgsradar/selgere", params={"key": ADMIN_KEY})
        if selgere_resp.status_code == 200:
            selgere = selgere_resp.json().get('selgere', [])
            qa_seller_data = next((s for s in selgere if s.get('epost') == QA_SELLER_EMAIL), None)
            if qa_seller_data:
                qa_seller_id = qa_seller_data.get('id')
                print_result(True, f"QA seller created with id: {qa_seller_id}")
            else:
                print_result(False, "QA seller created but not found in selgere list")
                raise Exception("Cannot continue without QA seller ID")
        else:
            print_result(False, f"Failed to get selgere list: {selgere_resp.status_code}")
            raise Exception("Cannot continue without QA seller ID")
    else:
        print_result(False, f"Failed to create seller: {response.status_code} - {response.text}")
        raise Exception("Cannot continue without QA seller")
    
    # Login as QA seller
    login_data = {
        "email": QA_SELLER_EMAIL,
        "password": QA_SELLER_PASSWORD
    }
    response = requests.post(f"{BASE_URL}/admin/auth/login", json=login_data)
    if response.status_code == 200:
        login_resp = response.json()
        qa_seller_token = login_resp.get('token')
        print_result(True, f"QA seller logged in, token: {qa_seller_token[:20]}...")
    else:
        print_result(False, f"Login failed: {response.status_code} - {response.text}")
        raise Exception("Cannot continue without seller token")
    
    # GET meg with seller token
    response = requests.get(f"{BASE_URL}/admin/salgsradar/meg", params={"key": qa_seller_token})
    if response.status_code == 200:
        data = response.json()
        if data.get('aktor', {}).get('erLeder') == False:
            print_result(True, f"Seller aktor has erLeder=false")
        else:
            print_result(False, f"Seller aktor erLeder should be false: {data.get('aktor')}")
    else:
        print_result(False, f"GET meg with seller token failed: {response.status_code}")

    # ========== T3: GET selgere contains QA seller ==========
    print_test("T3", "GET /admin/salgsradar/selgere contains QA seller")
    
    response = requests.get(f"{BASE_URL}/admin/salgsradar/selgere", params={"key": ADMIN_KEY})
    if response.status_code == 200:
        data = response.json()
        selgere = data.get('selgere', [])
        qa_seller_found = any(s.get('id') == qa_seller_id for s in selgere)
        if qa_seller_found:
            qa_seller_data = next(s for s in selgere if s.get('id') == qa_seller_id)
            print_result(True, f"QA seller found in selgere list with provisjonssats={qa_seller_data.get('provisjonssats', 0)}")
        else:
            print_result(False, f"QA seller not found in selgere list")
    else:
        print_result(False, f"GET selgere failed: {response.status_code}")

    # ========== T4: PUT provisjonssats ==========
    print_test("T4", "PUT /admin/salgsradar/provisjonssats (leader 200, seller 403, sats>100 → 400)")
    
    # Leader sets sats to 10
    response = requests.put(
        f"{BASE_URL}/admin/salgsradar/provisjonssats",
        params={"key": ADMIN_KEY},
        json={"brukerId": qa_seller_id, "sats": 10}
    )
    if response.status_code == 200:
        print_result(True, "Leader set provisjonssats=10 successfully")
        
        # Verify in selgere list
        response = requests.get(f"{BASE_URL}/admin/salgsradar/selgere", params={"key": ADMIN_KEY})
        if response.status_code == 200:
            selgere = response.json().get('selgere', [])
            qa_seller_data = next((s for s in selgere if s.get('id') == qa_seller_id), None)
            if qa_seller_data and qa_seller_data.get('provisjonssats') == 10:
                print_result(True, "Provisjonssats verified as 10 in selgere list")
            else:
                print_result(False, f"Provisjonssats not updated correctly: {qa_seller_data}")
    else:
        print_result(False, f"Leader PUT provisjonssats failed: {response.status_code} - {response.text}")
    
    # Seller tries to set sats (should be 403)
    response = requests.put(
        f"{BASE_URL}/admin/salgsradar/provisjonssats",
        params={"key": qa_seller_token},
        json={"brukerId": qa_seller_id, "sats": 15}
    )
    print_result(response.status_code == 403, f"Seller PUT provisjonssats returns {response.status_code} (expected 403)")
    
    # Leader tries sats > 100 (should be 400)
    response = requests.put(
        f"{BASE_URL}/admin/salgsradar/provisjonssats",
        params={"key": ADMIN_KEY},
        json={"brukerId": qa_seller_id, "sats": 150}
    )
    print_result(response.status_code == 400, f"Sats>100 returns {response.status_code} (expected 400)")

    # ========== CREATE QA LEAD IN MONGODB ==========
    print("\n" + "="*80)
    print("SETUP: Creating QA lead directly in MongoDB")
    print("="*80)
    
    qa_lead_doc = {
        "id": QA_LEAD_ID,
        "finnkode": QA_FINNKODE,
        "adresse": "QA Testveien 1",
        "pris": 20000,
        "status": "analysert",
        "tilbudSlug": f"qa-{uuid.uuid4().hex[:10]}",
        "annonseAktiv": True,
        "stylet": [],
        "kontaktLogg": [],
        "annonsor": {
            "type": "privat",
            "orgNavn": "",
            "orgId": None,
            "hjemmeside": "",
            "logo": "",
            "kontakter": [],
            "hentetAt": datetime.utcnow().isoformat() + "Z"
        },
        "salg": {
            "status": "ledig",
            "tildeltTil": None,
            "arsak": None,
            "vunnet": None,
            "oppfolging": None
        },
        "createdAt": datetime.utcnow().isoformat() + "Z"
    }
    
    leads_collection.insert_one(qa_lead_doc)
    print(f"✅ QA lead created in MongoDB with id: {QA_LEAD_ID}")

    # ========== T5: Tildeling on QA lead ==========
    print_test("T5", "Tildeling: seller takes available, releases own, leader assigns")
    
    # Seller takes available lead
    response = requests.post(
        f"{BASE_URL}/admin/salgsradar/tildel",
        params={"key": qa_seller_token},
        json={"id": QA_LEAD_ID, "brukerId": qa_seller_id}
    )
    if response.status_code == 200:
        data = response.json()
        lead_data = data.get('lead', {})
        if lead_data and lead_data.get('salg', {}).get('tildeltTil', {}).get('id') == qa_seller_id:
            print_result(True, "Seller took available lead successfully")
        else:
            print_result(False, f"Lead not assigned correctly: {data}")
    else:
        print_result(False, f"Seller take lead failed: {response.status_code} - {response.text}")
    
    # Seller releases own lead (frasi)
    response = requests.post(
        f"{BASE_URL}/admin/salgsradar/tildel",
        params={"key": qa_seller_token},
        json={"id": QA_LEAD_ID, "brukerId": None}
    )
    if response.status_code == 200:
        data = response.json()
        lead_data = data.get('lead', {})
        if lead_data and lead_data.get('salg', {}).get('tildeltTil') is None:
            print_result(True, "Seller released own lead successfully (back to pool)")
        else:
            print_result(False, f"Lead not released correctly: {data}")
    else:
        print_result(False, f"Seller release lead failed: {response.status_code} - {response.text}")
    
    # Leader assigns to seller
    response = requests.post(
        f"{BASE_URL}/admin/salgsradar/tildel",
        params={"key": ADMIN_KEY},
        json={"id": QA_LEAD_ID, "brukerId": qa_seller_id}
    )
    if response.status_code == 200:
        data = response.json()
        lead_data = data.get('lead', {})
        if lead_data and lead_data.get('salg', {}).get('tildeltTil', {}).get('id') == qa_seller_id:
            print_result(True, "Leader assigned lead to seller successfully")
        else:
            print_result(False, f"Leader assignment failed: {data}")
    else:
        print_result(False, f"Leader assign failed: {response.status_code} - {response.text}")

    # ========== T6: Seller visibility ==========
    print_test("T6", "Seller visibility: seller sees only own + pool, leader sees all")
    
    # Set lead to fake other seller via pymongo
    leads_collection.update_one(
        {"id": QA_LEAD_ID},
        {"$set": {"salg.tildeltTil": {"id": "qa-annen-selger-fiktiv", "navn": "Anna QA"}}}
    )
    print("Set QA lead to fake other seller via MongoDB")
    
    # Seller GET leads (should NOT contain QA lead)
    response = requests.get(f"{BASE_URL}/admin/salgsradar/leads", params={"key": qa_seller_token})
    if response.status_code == 200:
        data = response.json()
        leads = data.get('leads', [])
        qa_lead_visible = any(l.get('id') == QA_LEAD_ID for l in leads)
        print_result(not qa_lead_visible, f"Seller does NOT see other seller's lead (visible={qa_lead_visible})")
    else:
        print_result(False, f"Seller GET leads failed: {response.status_code}")
    
    # Leader GET leads (should contain QA lead)
    response = requests.get(f"{BASE_URL}/admin/salgsradar/leads", params={"key": ADMIN_KEY})
    if response.status_code == 200:
        data = response.json()
        leads = data.get('leads', [])
        qa_lead_visible = any(l.get('id') == QA_LEAD_ID for l in leads)
        print_result(qa_lead_visible, f"Leader DOES see all leads including QA lead (visible={qa_lead_visible})")
    else:
        print_result(False, f"Leader GET leads failed: {response.status_code}")
    
    # Reset tildeltTil back to qa_seller_id via pymongo
    leads_collection.update_one(
        {"id": QA_LEAD_ID},
        {"$set": {"salg.tildeltTil": {"id": qa_seller_id, "navn": "QA Selger"}}}
    )
    print("Reset QA lead back to QA seller via MongoDB")

    # ========== T7: Status rules ==========
    print_test("T7", "Status rules: contacted OK, lost without reason → 400, lost with reason → 200, seller cannot reopen terminal (403), leader can (200)")
    
    # Contacted OK
    response = requests.post(
        f"{BASE_URL}/admin/salgsradar/salgsstatus",
        params={"key": qa_seller_token},
        json={"id": QA_LEAD_ID, "status": "kontaktet"}
    )
    print_result(response.status_code == 200, f"Set status=kontaktet returns {response.status_code} (expected 200)")
    
    # Lost without reason (should be 400)
    response = requests.post(
        f"{BASE_URL}/admin/salgsradar/salgsstatus",
        params={"key": qa_seller_token},
        json={"id": QA_LEAD_ID, "status": "tapt"}
    )
    print_result(response.status_code == 400, f"Lost without reason returns {response.status_code} (expected 400)")
    
    # Lost with valid reason (should be 200)
    response = requests.post(
        f"{BASE_URL}/admin/salgsradar/salgsstatus",
        params={"key": qa_seller_token},
        json={"id": QA_LEAD_ID, "status": "tapt", "arsak": {"valg": "For lav leie", "tekst": "QA test"}}
    )
    if response.status_code == 200:
        data = response.json()
        lead_data = data.get('lead', {})
        if lead_data and lead_data.get('salg', {}).get('arsak', {}).get('valg') == "For lav leie":
            print_result(True, "Lost with reason set successfully")
        else:
            print_result(False, f"Reason not set correctly: {data}")
    else:
        print_result(False, f"Lost with reason failed: {response.status_code} - {response.text}")
    
    # Seller tries to reopen terminal (should be 403)
    response = requests.post(
        f"{BASE_URL}/admin/salgsradar/salgsstatus",
        params={"key": qa_seller_token},
        json={"id": QA_LEAD_ID, "status": "dialog"}
    )
    print_result(response.status_code == 403, f"Seller reopen terminal returns {response.status_code} (expected 403)")
    
    # Leader reopens terminal (should be 200 and reason nullified)
    response = requests.post(
        f"{BASE_URL}/admin/salgsradar/salgsstatus",
        params={"key": ADMIN_KEY},
        json={"id": QA_LEAD_ID, "status": "dialog"}
    )
    if response.status_code == 200:
        data = response.json()
        lead_data = data.get('lead', {})
        if lead_data and lead_data.get('salg', {}).get('arsak') is None:
            print_result(True, "Leader reopened terminal and reason nullified")
        else:
            print_result(False, f"Reason not nullified: {data}")
    else:
        print_result(False, f"Leader reopen failed: {response.status_code} - {response.text}")

    # ========== T8: Won with commission lock ==========
    print_test("T8", "Won with commission lock: mndLeie 20000, honorarPct 8, selgerId=QA → grunnlag 19200, sats 10, provisjon 1920")
    
    response = requests.post(
        f"{BASE_URL}/admin/salgsradar/salgsstatus",
        params={"key": ADMIN_KEY},
        json={
            "id": QA_LEAD_ID,
            "status": "vunnet",
            "vunnet": {
                "mndLeie": 20000,
                "honorarPct": 8,
                "selgerId": qa_seller_id
            }
        }
    )
    if response.status_code == 200:
        data = response.json()
        lead_data = data.get('lead', {})
        vunnet = lead_data.get('salg', {}).get('vunnet', {}) if lead_data else {}
        grunnlag = vunnet.get('grunnlag')
        provisjonssats = vunnet.get('provisjonssats')
        provisjon = vunnet.get('provisjon')
        selger_id = vunnet.get('selger', {}).get('id')
        
        if grunnlag == 19200 and provisjonssats == 10 and provisjon == 1920 and selger_id == qa_seller_id:
            print_result(True, f"Won with correct commission: grunnlag={grunnlag}, sats={provisjonssats}, provisjon={provisjon}")
        else:
            print_result(False, f"Commission calculation wrong: grunnlag={grunnlag} (expected 19200), sats={provisjonssats} (expected 10), provisjon={provisjon} (expected 1920)")
    else:
        print_result(False, f"Set won status failed: {response.status_code} - {response.text}")

    # ========== T9: Seller report ==========
    print_test("T9", "Seller report: vunnet=1/provisjon=1920/winRate=100; with ?fra=<tomorrow> → vunnet=0")
    
    # Get report without date filter
    response = requests.get(f"{BASE_URL}/admin/salgsradar/rapport", params={"key": ADMIN_KEY})
    if response.status_code == 200:
        data = response.json()
        selgere = data.get('selgere', [])
        qa_seller_report = next((s for s in selgere if s.get('id') == qa_seller_id), None)
        
        if qa_seller_report:
            vunnet = qa_seller_report.get('vunnet', 0)
            provisjon = qa_seller_report.get('provisjon', 0)
            win_rate = qa_seller_report.get('winRate', 0)
            
            if vunnet == 1 and provisjon == 1920 and win_rate == 100:
                print_result(True, f"QA seller report correct: vunnet={vunnet}, provisjon={provisjon}, winRate={win_rate}%")
            else:
                print_result(False, f"Report values wrong: vunnet={vunnet} (expected 1), provisjon={provisjon} (expected 1920), winRate={win_rate} (expected 100)")
        else:
            print_result(False, "QA seller not found in report")
    else:
        print_result(False, f"GET rapport failed: {response.status_code}")
    
    # Get report with fra=tomorrow (should show vunnet=0)
    tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
    response = requests.get(f"{BASE_URL}/admin/salgsradar/rapport", params={"key": ADMIN_KEY, "fra": tomorrow})
    if response.status_code == 200:
        data = response.json()
        selgere = data.get('selgere', [])
        qa_seller_report = next((s for s in selgere if s.get('id') == qa_seller_id), None)
        
        if qa_seller_report:
            vunnet = qa_seller_report.get('vunnet', 0)
            print_result(vunnet == 0, f"With fra=tomorrow, vunnet={vunnet} (expected 0)")
        else:
            print_result(True, "QA seller not in report with future date filter (acceptable)")
    else:
        print_result(False, f"GET rapport with fra failed: {response.status_code}")

    # ========== T10: Follow-up set/remove ==========
    print_test("T10", "Follow-up: set oppfolging date, then remove")
    
    # Set follow-up date
    followup_date = "2026-09-15"
    response = requests.post(
        f"{BASE_URL}/admin/salgsradar/oppfolging",
        params={"key": ADMIN_KEY},
        json={"id": QA_LEAD_ID, "dato": followup_date}
    )
    if response.status_code == 200:
        data = response.json()
        lead_data = data.get('lead', {})
        oppfolging = lead_data.get('salg', {}).get('oppfolging') if lead_data else None
        # Accept both date string and ISO timestamp
        if oppfolging and (oppfolging == followup_date or oppfolging.startswith(followup_date)):
            print_result(True, f"Follow-up date set to {oppfolging}")
        else:
            print_result(False, f"Follow-up date not set correctly: {oppfolging}")
    else:
        print_result(False, f"Set follow-up failed: {response.status_code} - {response.text}")
    
    # Remove follow-up date
    response = requests.post(
        f"{BASE_URL}/admin/salgsradar/oppfolging",
        params={"key": ADMIN_KEY},
        json={"id": QA_LEAD_ID, "dato": None}
    )
    if response.status_code == 200:
        data = response.json()
        lead_data = data.get('lead', {})
        oppfolging = lead_data.get('salg', {}).get('oppfolging') if lead_data else None
        if oppfolging is None or oppfolging == "":
            print_result(True, "Follow-up date removed successfully")
        else:
            print_result(False, f"Follow-up date not removed: {oppfolging}")
    else:
        print_result(False, f"Remove follow-up failed: {response.status_code} - {response.text}")

    # ========== T11: POST berik-annonsor ==========
    print_test("T11", "POST berik-annonsor → {ok:true, sjekket:0, oppdatert:0, feilet:0} (all already enriched)")
    
    # Without key (should be 401)
    response = requests.post(f"{BASE_URL}/admin/salgsradar/berik-annonsor")
    print_result(response.status_code == 401, f"Without key returns {response.status_code} (expected 401)")
    
    # With admin key (should return all 0 since all leads already have annonsor)
    response = requests.post(f"{BASE_URL}/admin/salgsradar/berik-annonsor", params={"key": ADMIN_KEY})
    if response.status_code == 200:
        data = response.json()
        if data.get('ok') and data.get('sjekket') == 0 and data.get('oppdatert') == 0 and data.get('feilet') == 0:
            print_result(True, f"Berik-annonsor returned correct counts: sjekket=0, oppdatert=0, feilet=0 (all already enriched)")
        else:
            print_result(False, f"Unexpected counts: {data}")
    else:
        print_result(False, f"POST berik-annonsor failed: {response.status_code}")

    # ========== T12: Annonsør data (READ ONLY) ==========
    print_test("T12", "READ ONLY: Verify all leads have annonsor field, check 'Johannes Bruns gate 1' has utleiemegleren data")
    
    response = requests.get(f"{BASE_URL}/admin/salgsradar/leads", params={"key": ADMIN_KEY})
    if response.status_code == 200:
        data = response.json()
        leads = data.get('leads', [])
        
        # Check all leads have annonsor field
        all_have_annonsor = all('annonsor' in lead for lead in leads)
        print_result(all_have_annonsor, f"All {len(leads)} leads have annonsor field")
        
        # Find 'Johannes Bruns gate 1' lead
        johannes_lead = next((l for l in leads if 'Johannes Bruns gate 1' in l.get('adresse', '')), None)
        if johannes_lead:
            annonsor = johannes_lead.get('annonsor', {})
            annonsor_type = annonsor.get('type')
            org_navn = annonsor.get('orgNavn', '')
            kontakt_epost = johannes_lead.get('kontaktEpost', '')
            kontakt_navn = johannes_lead.get('kontaktNavn', '')
            
            if annonsor_type == 'utleiemegleren' and 'Utleiemegleren Bergen' in org_navn and 'utleiemegleren.no' in kontakt_epost and kontakt_navn:
                print_result(True, f"Johannes Bruns gate 1: type={annonsor_type}, orgNavn={org_navn}, kontaktEpost={kontakt_epost}, kontaktNavn={kontakt_navn}")
            else:
                print_result(False, f"Johannes Bruns gate 1 data incorrect: type={annonsor_type}, orgNavn={org_navn}, kontaktEpost={kontakt_epost}, kontaktNavn={kontakt_navn}")
        else:
            print_result(False, "'Johannes Bruns gate 1' lead not found")
    else:
        print_result(False, f"GET leads failed: {response.status_code}")

    # ========== T13: CLEANUP ==========
    print_test("T13", "MANDATORY CLEANUP: Delete QA lead, QA seller, tombstone, verify 3 real leads unchanged")
    
    # Delete QA lead via API
    response = requests.delete(
        f"{BASE_URL}/admin/salgsradar/lead",
        params={"id": QA_LEAD_ID, "key": ADMIN_KEY}
    )
    print_result(response.status_code == 200, f"DELETE QA lead returns {response.status_code} (expected 200)")
    
    # Delete QA seller via API
    response = requests.delete(
        f"{BASE_URL}/admin/users/{qa_seller_id}",
        params={"key": ADMIN_KEY}
    )
    print_result(response.status_code == 200, f"DELETE QA seller returns {response.status_code} (expected 200)")
    
    # Delete tombstone for finnkode 999999901 via MongoDB
    tombstone_result = tombstones_collection.delete_many({"finnkode": QA_FINNKODE})
    print_result(True, f"Deleted {tombstone_result.deleted_count} tombstone(s) for finnkode {QA_FINNKODE}")
    
    # Verify QA lead is gone from MongoDB
    qa_lead_in_db = leads_collection.find_one({"id": QA_LEAD_ID})
    print_result(qa_lead_in_db is None, f"QA lead removed from MongoDB: {qa_lead_in_db is None}")
    
    # Verify QA seller is gone from MongoDB
    qa_seller_in_db = users_collection.find_one({"id": qa_seller_id})
    print_result(qa_seller_in_db is None, f"QA seller removed from MongoDB: {qa_seller_in_db is None}")
    
    # Verify the 3 real leads are unchanged
    real_leads = [
        "Skuteviken Smalgang 11",
        "Strandgaten 222",
        "Johannes Bruns gate 1"
    ]
    
    for address in real_leads:
        lead = leads_collection.find_one({"adresse": {"$regex": address, "$options": "i"}})
        if lead:
            status = lead.get('status')
            has_annonsor = 'annonsor' in lead
            print_result(True, f"Real lead '{address}' intact: status={status}, has_annonsor={has_annonsor}")
        else:
            print_result(False, f"Real lead '{address}' not found in database!")

    print("\n" + "="*80)
    print("ALL TESTS COMPLETED")
    print("="*80)

except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()

finally:
    # Close MongoDB connection
    if 'mongo_client' in locals():
        mongo_client.close()
        print("\n✅ MongoDB connection closed")
