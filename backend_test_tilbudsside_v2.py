#!/usr/bin/env python3
"""
Backend test for Tilbudsside v2: personlig avsender (tildelt selger) i GET /api/tilbud + varsling av tildelt selger ved huseier-svar

Test plan T1-T6 from test_result.md:
T1: Create QA seller, insert QA lead with tildeltTil, verify GET /api/tilbud returns selger object
T2: Remove tildeltTil, verify selger === null
T3: Restore tildeltTil, POST /api/tilbud/kontakt, verify notifications
T4: Verify spor=0 doesn't increment aapninger, spor=1 does
T5: REGRESSION - read Strandgaten 222 (slug GPp3jfhQ_YE)
T6: Run previous round's tests for kontaktNavn/kontaktTlf PUT and selgere-avatar

CRITICAL SAFETY RULES:
- Do NOT mutate the 3 real leads (Skuteviken Smalgang 11, Strandgaten 222, Johannes Bruns gate 1)
- Strandgaten 222 (slug GPp3jfhQ_YE) can ONLY be READ for regression
- Do NOT call POST /api/admin/salgsradar/hent (makes external FINN calls)
- All QA data via pymongo with full cleanup
"""

import requests
import json
import uuid
from datetime import datetime, timezone
from pymongo import MongoClient
import os
import sys

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test data
QA_LEAD_ID = f"qa-tilbud-{uuid.uuid4()}"
QA_SLUG = f"qa-tilbud-slug-{uuid.uuid4()}"
QA_FINNKODE = "999999903"
QA_ADRESSE = "QA Testveien 1"

def print_test(msg):
    print(f"\n{'='*80}")
    print(f"TEST: {msg}")
    print('='*80)

def print_success(msg):
    print(f"✅ {msg}")

def print_error(msg):
    print(f"❌ {msg}")
    
def print_info(msg):
    print(f"ℹ️  {msg}")

try:
    # Connect to MongoDB
    print_info(f"Connecting to MongoDB: {MONGO_URL}/{DB_NAME}")
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Collections
    leads_col = db['salgsradar_leads']
    users_col = db['admin_users']
    notifications_col = db['notifications']
    tombstones_col = db['salgsradar_tombstones']
    
    print_success("Connected to MongoDB")
    
    # ============================================================================
    # T1: Create QA seller and QA lead with tildeltTil
    # ============================================================================
    print_test("T1: Create QA seller and QA lead with tildeltTil")
    
    # Step 1: Create QA seller via POST /api/admin/users
    print_info("Creating QA seller via POST /api/admin/users")
    seller_data = {
        "name": "QA Selger",
        "email": "qa-selger-tilbud@example.com",
        "password": "QaTest2026!!",
        "role": "bruker",
        "moduler": ["salgsradar"],
        "tittel": "Seniorrådgiver"
    }
    
    response = requests.post(
        f"{BASE_URL}/admin/users",
        params={"key": ADMIN_KEY},
        json=seller_data,
        timeout=30
    )
    
    if response.status_code != 200:
        print_error(f"Failed to create QA seller: {response.status_code} - {response.text}")
        sys.exit(1)
    
    seller_response = response.json()
    qa_seller_id = seller_response.get('member', {}).get('id') or seller_response.get('user', {}).get('id') or seller_response.get('id')
    
    if not qa_seller_id:
        print_error(f"Failed to get seller ID from response: {seller_response}")
        sys.exit(1)
    
    print_success(f"Created QA seller with ID: {qa_seller_id}")
    
    # Step 2: Insert QA lead via pymongo
    print_info("Inserting QA lead via pymongo")
    qa_lead = {
        "id": QA_LEAD_ID,
        "finnkode": QA_FINNKODE,
        "kildeUrl": f"https://www.finn.no/{QA_FINNKODE}",
        "tilbudSlug": QA_SLUG,
        "status": "kontaktet",
        "adresse": QA_ADRESSE,
        "pris": 15000,
        "bilder": [],
        "annonsor": {
            "v": 2,
            "type": "privat",
            "kontakter": []
        },
        "salg": {
            "tildeltTil": {
                "id": qa_seller_id,
                "navn": "QA Selger"
            },
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        },
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    
    leads_col.insert_one(qa_lead)
    print_success(f"Inserted QA lead with ID: {QA_LEAD_ID}, slug: {QA_SLUG}")
    
    # Step 3: GET /api/tilbud?slug=<qaSlug>&spor=0
    print_info(f"GET /api/tilbud?slug={QA_SLUG}&spor=0")
    response = requests.get(
        f"{BASE_URL}/tilbud",
        params={"slug": QA_SLUG, "spor": "0"},
        timeout=30
    )
    
    if response.status_code != 200:
        print_error(f"Failed to get tilbud: {response.status_code} - {response.text}")
        sys.exit(1)
    
    tilbud_data = response.json()
    
    if not tilbud_data.get('ok'):
        print_error(f"Tilbud response not ok: {tilbud_data}")
        sys.exit(1)
    
    print_success("GET /api/tilbud returned 200 with ok:true")
    
    # Verify selger object
    tilbud = tilbud_data.get('tilbud', {})
    selger = tilbud.get('selger')
    
    if not selger:
        print_error("selger is null or missing")
        sys.exit(1)
    
    print_success(f"selger object present: {json.dumps(selger, indent=2)}")
    
    # Verify selger fields
    if selger.get('navn') != 'QA Selger':
        print_error(f"selger.navn is '{selger.get('navn')}', expected 'QA Selger'")
        sys.exit(1)
    print_success("selger.navn === 'QA Selger' ✓")
    
    if selger.get('tittel') != 'Seniorrådgiver':
        print_error(f"selger.tittel is '{selger.get('tittel')}', expected 'Seniorrådgiver'")
        sys.exit(1)
    print_success("selger.tittel === 'Seniorrådgiver' ✓")
    
    if selger.get('epost') != 'qa-selger-tilbud@example.com':
        print_error(f"selger.epost is '{selger.get('epost')}', expected 'qa-selger-tilbud@example.com'")
        sys.exit(1)
    print_success("selger.epost === 'qa-selger-tilbud@example.com' ✓")
    
    # Verify selger has telefon and avatar fields (can be empty)
    if 'telefon' not in selger:
        print_error("selger missing 'telefon' field")
        sys.exit(1)
    print_success("selger has 'telefon' field ✓")
    
    if 'avatar' not in selger:
        print_error("selger missing 'avatar' field")
        sys.exit(1)
    print_success("selger has 'avatar' field ✓")
    
    # Verify selger does NOT have internal fields
    internal_fields = ['id', 'role', 'provisjonssats']
    for field in internal_fields:
        if field in selger:
            print_error(f"selger contains internal field '{field}' - SECURITY ISSUE")
            sys.exit(1)
    print_success(f"selger does NOT contain internal fields {internal_fields} ✓")
    
    print_success("T1 PASSED: selger object has correct structure and no internal fields")
    
    # ============================================================================
    # T2: Remove tildeltTil via pymongo, verify selger === null
    # ============================================================================
    print_test("T2: Remove tildeltTil via pymongo, verify selger === null")
    
    print_info("Removing tildeltTil via pymongo $set salg.tildeltTil = null")
    leads_col.update_one(
        {"id": QA_LEAD_ID},
        {"$set": {"salg.tildeltTil": None}}
    )
    print_success("Updated lead with tildeltTil = null")
    
    # GET /api/tilbud again
    print_info(f"GET /api/tilbud?slug={QA_SLUG}&spor=0")
    response = requests.get(
        f"{BASE_URL}/tilbud",
        params={"slug": QA_SLUG, "spor": "0"},
        timeout=30
    )
    
    if response.status_code != 200:
        print_error(f"Failed to get tilbud: {response.status_code} - {response.text}")
        sys.exit(1)
    
    tilbud_data = response.json()
    tilbud = tilbud_data.get('tilbud', {})
    selger = tilbud.get('selger')
    
    if selger is not None:
        print_error(f"selger is not null: {selger}")
        sys.exit(1)
    
    print_success("selger === null when tildeltTil is null ✓")
    print_success("T2 PASSED")
    
    # ============================================================================
    # T3: Restore tildeltTil, POST /api/tilbud/kontakt, verify notifications
    # ============================================================================
    print_test("T3: Restore tildeltTil, POST /api/tilbud/kontakt, verify notifications")
    
    print_info("Restoring tildeltTil via pymongo")
    leads_col.update_one(
        {"id": QA_LEAD_ID},
        {"$set": {"salg.tildeltTil": {"id": qa_seller_id, "navn": "QA Selger"}}}
    )
    print_success("Restored tildeltTil")
    
    # POST /api/tilbud/kontakt
    print_info("POST /api/tilbud/kontakt")
    kontakt_data = {
        "slug": QA_SLUG,
        "telefon": "99887766",
        "melding": "QA"
    }
    
    response = requests.post(
        f"{BASE_URL}/tilbud/kontakt",
        json=kontakt_data,
        timeout=30
    )
    
    if response.status_code != 200:
        print_error(f"Failed to post kontakt: {response.status_code} - {response.text}")
        sys.exit(1)
    
    kontakt_response = response.json()
    if not kontakt_response.get('ok'):
        print_error(f"Kontakt response not ok: {kontakt_response}")
        sys.exit(1)
    
    print_success("POST /api/tilbud/kontakt returned 200 with ok:true")
    
    # Verify lead status is now 'dialog'
    lead_doc = leads_col.find_one({"id": QA_LEAD_ID})
    if lead_doc.get('status') != 'dialog':
        print_error(f"Lead status is '{lead_doc.get('status')}', expected 'dialog'")
        sys.exit(1)
    print_success("Lead status === 'dialog' ✓")
    
    # Verify kontaktLogg has telefon '99887766'
    kontakt_logg = lead_doc.get('kontaktLogg', [])
    if not any(k.get('telefon') == '99887766' for k in kontakt_logg):
        print_error(f"kontaktLogg does not contain telefon '99887766': {kontakt_logg}")
        sys.exit(1)
    print_success("kontaktLogg contains telefon '99887766' ✓")
    
    # Verify notifications
    print_info("Verifying notifications in MongoDB")
    notifications = list(notifications_col.find({"text": {"$regex": QA_ADRESSE}}))
    
    if len(notifications) == 0:
        print_error(f"No notifications found with text containing '{QA_ADRESSE}'")
        sys.exit(1)
    
    print_success(f"Found {len(notifications)} notifications with text containing '{QA_ADRESSE}'")
    
    # Verify QA seller got notification
    seller_notification = next((n for n in notifications if n.get('userId') == qa_seller_id), None)
    if not seller_notification:
        print_error(f"QA seller (userId={qa_seller_id}) did not receive notification")
        sys.exit(1)
    print_success(f"QA seller received notification ✓")
    
    # Verify at least one owner/admin got notification
    owner_admin_notifications = [n for n in notifications if n.get('userId') != qa_seller_id]
    if len(owner_admin_notifications) == 0:
        print_error("No owner/admin received notification")
        sys.exit(1)
    print_success(f"At least {len(owner_admin_notifications)} owner/admin received notification ✓")
    
    # Verify no duplicates per user (dedupe check)
    user_ids = [n.get('userId') for n in notifications]
    if len(user_ids) != len(set(user_ids)):
        print_error(f"Duplicate notifications per user detected: {user_ids}")
        sys.exit(1)
    print_success("No duplicate notifications per user (dedupe working) ✓")
    
    print_success("T3 PASSED: Notifications sent to QA seller AND owner/admin with dedupe")
    
    # ============================================================================
    # T4: Verify spor=0 doesn't increment aapninger, spor=1 does
    # ============================================================================
    print_test("T4: Verify spor=0 doesn't increment aapninger, spor=1 does")
    
    # Read current aapninger
    lead_doc = leads_col.find_one({"id": QA_LEAD_ID})
    aapninger_before = lead_doc.get('aapninger', 0)
    print_info(f"Current aapninger: {aapninger_before}")
    
    # GET with spor=0
    print_info(f"GET /api/tilbud?slug={QA_SLUG}&spor=0")
    response = requests.get(
        f"{BASE_URL}/tilbud",
        params={"slug": QA_SLUG, "spor": "0"},
        timeout=30
    )
    
    if response.status_code != 200:
        print_error(f"Failed to get tilbud: {response.status_code} - {response.text}")
        sys.exit(1)
    
    # Check aapninger unchanged
    lead_doc = leads_col.find_one({"id": QA_LEAD_ID})
    aapninger_after_spor0 = lead_doc.get('aapninger', 0)
    
    if aapninger_after_spor0 != aapninger_before:
        print_error(f"aapninger changed after spor=0: {aapninger_before} → {aapninger_after_spor0}")
        sys.exit(1)
    print_success(f"aapninger unchanged after spor=0: {aapninger_before} ✓")
    
    # GET with spor=1
    print_info(f"GET /api/tilbud?slug={QA_SLUG}&spor=1")
    response = requests.get(
        f"{BASE_URL}/tilbud",
        params={"slug": QA_SLUG, "spor": "1"},
        timeout=30
    )
    
    if response.status_code != 200:
        print_error(f"Failed to get tilbud: {response.status_code} - {response.text}")
        sys.exit(1)
    
    # Check aapninger incremented
    lead_doc = leads_col.find_one({"id": QA_LEAD_ID})
    aapninger_after_spor1 = lead_doc.get('aapninger', 0)
    
    if aapninger_after_spor1 != aapninger_before + 1:
        print_error(f"aapninger not incremented after spor=1: {aapninger_before} → {aapninger_after_spor1}")
        sys.exit(1)
    print_success(f"aapninger incremented after spor=1: {aapninger_before} → {aapninger_after_spor1} ✓")
    
    print_success("T4 PASSED: spor=0 doesn't increment, spor=1 does")
    
    # ============================================================================
    # T5: REGRESSION - read Strandgaten 222 (slug GPp3jfhQ_YE)
    # ============================================================================
    print_test("T5: REGRESSION - read Strandgaten 222 (slug GPp3jfhQ_YE)")
    
    print_info("GET /api/tilbud?slug=GPp3jfhQ_YE&spor=0")
    response = requests.get(
        f"{BASE_URL}/tilbud",
        params={"slug": "GPp3jfhQ_YE", "spor": "0"},
        timeout=30
    )
    
    if response.status_code != 200:
        print_error(f"Failed to get Strandgaten 222: {response.status_code} - {response.text}")
        sys.exit(1)
    
    tilbud_data = response.json()
    if not tilbud_data.get('ok'):
        print_error(f"Strandgaten 222 response not ok: {tilbud_data}")
        sys.exit(1)
    
    print_success("GET /api/tilbud for Strandgaten 222 returned 200 with ok:true")
    
    tilbud = tilbud_data.get('tilbud', {})
    selger = tilbud.get('selger')
    
    if not selger:
        print_error("Strandgaten 222 selger is null")
        sys.exit(1)
    
    if selger.get('epost') != 'martin@kviteberg.no':
        print_error(f"Strandgaten 222 selger.epost is '{selger.get('epost')}', expected 'martin@kviteberg.no'")
        sys.exit(1)
    print_success("Strandgaten 222 selger.epost === 'martin@kviteberg.no' ✓")
    
    # Verify tilbud has regnestykke and annonse fields
    if 'regnestykke' not in tilbud:
        print_error("Strandgaten 222 tilbud missing 'regnestykke' field")
        sys.exit(1)
    print_success("Strandgaten 222 tilbud has 'regnestykke' field ✓")
    
    if 'annonse' not in tilbud:
        print_error("Strandgaten 222 tilbud missing 'annonse' field")
        sys.exit(1)
    print_success("Strandgaten 222 tilbud has 'annonse' field ✓")
    
    print_success("T5 PASSED: Strandgaten 222 regression test passed")
    
    # ============================================================================
    # T6: Previous round's tests - kontaktNavn/kontaktTlf PUT and selgere-avatar
    # ============================================================================
    print_test("T6: Previous round's tests - kontaktNavn/kontaktTlf PUT and selgere-avatar")
    
    # T6a: PUT /api/admin/salgsradar/lead with kontaktNavn and kontaktTlf
    print_info("PUT /api/admin/salgsradar/lead with kontaktNavn and kontaktTlf")
    
    update_data = {
        "id": QA_LEAD_ID,
        "kontaktNavn": "  Alexander   R  ",
        "kontaktTlf": "98 00 40-08"
    }
    
    response = requests.put(
        f"{BASE_URL}/admin/salgsradar/lead",
        params={"key": ADMIN_KEY},
        json=update_data,
        timeout=30
    )
    
    if response.status_code != 200:
        print_error(f"Failed to update lead: {response.status_code} - {response.text}")
        sys.exit(1)
    
    update_response = response.json()
    lead = update_response.get('lead', {})
    
    # Verify kontaktNavn is trimmed and normalized
    if lead.get('kontaktNavn') != 'Alexander R':
        print_error(f"kontaktNavn is '{lead.get('kontaktNavn')}', expected 'Alexander R'")
        sys.exit(1)
    print_success("kontaktNavn === 'Alexander R' (trimmed and normalized) ✓")
    
    # Verify kontaktTlf is normalized (no spaces or dashes)
    if lead.get('kontaktTlf') != '98004008':
        print_error(f"kontaktTlf is '{lead.get('kontaktTlf')}', expected '98004008'")
        sys.exit(1)
    print_success("kontaktTlf === '98004008' (normalized) ✓")
    
    # T6b: PUT with empty kontaktNavn
    print_info("PUT /api/admin/salgsradar/lead with empty kontaktNavn")
    
    update_data = {
        "id": QA_LEAD_ID,
        "kontaktNavn": ""
    }
    
    response = requests.put(
        f"{BASE_URL}/admin/salgsradar/lead",
        params={"key": ADMIN_KEY},
        json=update_data,
        timeout=30
    )
    
    if response.status_code != 200:
        print_error(f"Failed to update lead: {response.status_code} - {response.text}")
        sys.exit(1)
    
    update_response = response.json()
    lead = update_response.get('lead', {})
    
    # Verify kontaktNavn is empty
    if lead.get('kontaktNavn') != '':
        print_error(f"kontaktNavn is '{lead.get('kontaktNavn')}', expected empty string")
        sys.exit(1)
    print_success("kontaktNavn === '' (cleared) ✓")
    
    # T6c: GET /api/admin/salgsradar/selgere
    print_info("GET /api/admin/salgsradar/selgere")
    
    response = requests.get(
        f"{BASE_URL}/admin/salgsradar/selgere",
        params={"key": ADMIN_KEY},
        timeout=30
    )
    
    if response.status_code != 200:
        print_error(f"Failed to get selgere: {response.status_code} - {response.text}")
        sys.exit(1)
    
    selgere_response = response.json()
    selgere = selgere_response.get('selgere', [])
    
    if len(selgere) == 0:
        print_error("No selgere returned")
        sys.exit(1)
    
    print_success(f"GET /api/admin/salgsradar/selgere returned {len(selgere)} selgere")
    
    # Verify each selger has required fields
    required_fields = ['id', 'navn', 'epost', 'provisjonssats', 'avatar']
    for selger in selgere:
        for field in required_fields:
            if field not in selger:
                print_error(f"Selger missing field '{field}': {selger}")
                sys.exit(1)
    
    print_success(f"All selgere have required fields: {required_fields} ✓")
    
    print_success("T6 PASSED: kontaktNavn/kontaktTlf normalization and selgere-avatar working")
    
    # ============================================================================
    # MANDATORY CLEANUP
    # ============================================================================
    print_test("MANDATORY CLEANUP")
    
    # Delete QA lead
    print_info(f"Deleting QA lead: {QA_LEAD_ID}")
    leads_col.delete_one({"id": QA_LEAD_ID})
    print_success("Deleted QA lead")
    
    # Delete tombstone for finnkode 999999903
    print_info(f"Deleting tombstone for finnkode: {QA_FINNKODE}")
    tombstones_col.delete_many({"finnkode": QA_FINNKODE})
    print_success("Deleted tombstone(s)")
    
    # Delete QA seller
    print_info(f"Deleting QA seller: {qa_seller_id}")
    response = requests.delete(
        f"{BASE_URL}/admin/users/{qa_seller_id}",
        params={"key": ADMIN_KEY},
        timeout=30
    )
    
    if response.status_code != 200:
        print_error(f"Failed to delete QA seller: {response.status_code} - {response.text}")
    else:
        print_success("Deleted QA seller")
    
    # Delete ALL notifications with 'QA Testveien 1' in text
    print_info(f"Deleting ALL notifications with text containing '{QA_ADRESSE}'")
    result = notifications_col.delete_many({"text": {"$regex": QA_ADRESSE}})
    print_success(f"Deleted {result.deleted_count} notifications")
    
    # Verify cleanup
    print_info("Verifying cleanup")
    
    # Verify QA lead deleted
    qa_lead_count = leads_col.count_documents({"id": QA_LEAD_ID})
    if qa_lead_count != 0:
        print_error(f"QA lead still exists: {qa_lead_count} documents")
        sys.exit(1)
    print_success("QA lead deleted ✓")
    
    # Verify tombstone deleted
    tombstone_count = tombstones_col.count_documents({"finnkode": QA_FINNKODE})
    if tombstone_count != 0:
        print_error(f"Tombstone still exists: {tombstone_count} documents")
        sys.exit(1)
    print_success("Tombstone deleted ✓")
    
    # Verify notifications deleted
    notification_count = notifications_col.count_documents({"text": {"$regex": QA_ADRESSE}})
    if notification_count != 0:
        print_error(f"Notifications still exist: {notification_count} documents")
        sys.exit(1)
    print_success("Notifications deleted ✓")
    
    # Verify 3 real leads unchanged
    print_info("Verifying 3 real leads unchanged")
    real_leads = [
        "skuteviken smalgang 11",
        "Strandgaten 222",
        "Johannes Bruns gate 1"
    ]
    
    for adresse in real_leads:
        lead = leads_col.find_one({"adresse": {"$regex": adresse, "$options": "i"}})
        if not lead:
            print_error(f"Real lead '{adresse}' not found")
            sys.exit(1)
    
    print_success("All 3 real leads still exist ✓")
    
    print_success("MANDATORY CLEANUP COMPLETED")
    
    # ============================================================================
    # SUMMARY
    # ============================================================================
    print("\n" + "="*80)
    print("✅ ALL TESTS PASSED (6/6 scenarios, 100% success rate)")
    print("="*80)
    print("\nCOMPREHENSIVE VERIFICATION OF TILBUDSSIDE V2:")
    print("✅ T1: QA seller created, QA lead with tildeltTil, selger object correct")
    print("✅ T2: tildeltTil removed, selger === null")
    print("✅ T3: tildeltTil restored, kontakt posted, notifications sent with dedupe")
    print("✅ T4: spor=0 doesn't increment aapninger, spor=1 does")
    print("✅ T5: Strandgaten 222 regression passed (selger.epost, regnestykke, annonse)")
    print("✅ T6: kontaktNavn/kontaktTlf normalization, selgere-avatar fields")
    print("✅ MANDATORY CLEANUP: All QA data deleted and verified")
    print("\nFEATURE WORKING PERFECTLY:")
    print("- GET /api/tilbud returns selger object with correct fields (navn, tittel, epost, telefon, avatar)")
    print("- selger object does NOT contain internal fields (id, role, provisjonssats)")
    print("- selger === null when tildeltTil is null")
    print("- POST /api/tilbud/kontakt sends notifications to tildelt selger AND owner/admin")
    print("- Notifications deduplicated per user (no duplicates)")
    print("- spor=0 preview mode doesn't increment aapninger")
    print("- spor=1 increments aapninger as expected")
    print("- Regression: Strandgaten 222 still works with selger.epost='martin@kviteberg.no'")
    print("- kontaktNavn/kontaktTlf normalization working")
    print("- GET /api/admin/salgsradar/selgere returns all required fields")
    print("\nDatabase kept clean (all test data deleted and verified)")
    print("="*80)

except Exception as e:
    print_error(f"Test failed with exception: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    if 'client' in locals():
        client.close()
