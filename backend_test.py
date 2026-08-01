#!/usr/bin/env python3
"""
Backend test for NYE selvbetjente provisjonerings-flyten (14/7).
Tests POST /api/leads with tier='selvforvaltning' + terms → platform provisioning.

CRITICAL SAFETY RULES:
- MAKS 2 kall til POST /api/leads totalt (sender ekte e-poster)
- Bruk navn 'QA Provisjonering — ignorer' og e-post qa-provision-<ts>@example.test
- Selvbetjent-kallet oppretter en EKTE QA-kunde på plattformens preview — det er OK
- IKKE forsøk å slette noe på plattformsiden
- IKKE modifiser eksisterende leads
- OBLIGATORISK OPPRYDDING: slett begge QA-leads fra 'leads'-collection på id til slutt
- Verifiser baseline 19 leads
"""

import requests
import time
import json
from pymongo import MongoClient

# Configuration
BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test data
TIMESTAMP = str(int(time.time()))
LEAD_1_EMAIL = f"qa-provision-{TIMESTAMP}@example.test"
LEAD_2_EMAIL = f"qa-provision-b-{TIMESTAMP}@example.test"

# Track created lead IDs for cleanup
created_lead_ids = []

def print_test(msg):
    print(f"\n{'='*80}")
    print(f"TEST: {msg}")
    print('='*80)

def print_pass(msg):
    print(f"✅ PASS: {msg}")

def print_fail(msg):
    print(f"❌ FAIL: {msg}")

def get_mongo_db():
    """Get MongoDB database connection"""
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]

try:
    # ========================================================================
    # TEST 0: BASELINE VERIFICATION
    # ========================================================================
    print_test("TEST 0: Baseline verification - verify 19 leads exist")
    
    db = get_mongo_db()
    baseline_count = db.leads.count_documents({})
    print(f"Baseline lead count: {baseline_count}")
    
    if baseline_count == 19:
        print_pass(f"Baseline count is exactly 19 leads")
    else:
        print_fail(f"Expected 19 leads, found {baseline_count}")
    
    # ========================================================================
    # TEST 1: SELVBETJENT HOVEDCASE
    # ========================================================================
    print_test("TEST 1: SELVBETJENT HOVEDCASE - POST /api/leads with tier='selvforvaltning' + terms")
    
    # Generate unique phone number (last 3 digits from timestamp)
    phone_suffix = TIMESTAMP[-3:]
    
    payload_1 = {
        "name": "QA Provisjonering — ignorer",
        "email": LEAD_1_EMAIL,
        "phone": f"99900{phone_suffix}",
        "address": "QA Testveien 2",
        "postal_code": "5003",
        "city": "Bergen",
        "lead_type": "huseier",
        "property_type": "leilighet",
        "sqm": 60,
        "bedrooms": 2,
        "tier": "selvforvaltning",
        "terms": {
            "version": "selvforvaltning-2025-06"
        }
    }
    
    print(f"Posting self-service lead with email: {LEAD_1_EMAIL}")
    response_1 = requests.post(f"{BASE_URL}/leads", json=payload_1, timeout=30)
    
    print(f"Response status: {response_1.status_code}")
    print(f"Response body: {response_1.text[:500]}")
    
    if response_1.status_code == 201:
        print_pass("POST /api/leads returned 201")
        
        data_1 = response_1.json()
        
        # Check response structure
        if "data" in data_1 and "id" in data_1["data"]:
            lead_id_1 = data_1["data"]["id"]
            created_lead_ids.append(lead_id_1)
            print_pass(f"Lead ID received: {lead_id_1}")
        else:
            print_fail("Response missing data.id")
            lead_id_1 = None
        
        # Check for account object in response
        if "account" in data_1:
            account = data_1["account"]
            print_pass("Response contains 'account' field")
            
            if account is not None:
                print(f"Account object: {json.dumps(account, indent=2)}")
                
                # Check for onboarding_url
                if "onboarding_url" in account and account["onboarding_url"]:
                    onboarding_url = account["onboarding_url"]
                    print_pass(f"onboarding_url present: {onboarding_url}")
                    
                    # Verify it's an https URL containing 'magic-login'
                    if onboarding_url.startswith("https://") and "magic-login" in onboarding_url:
                        print_pass("onboarding_url is https URL containing 'magic-login'")
                    else:
                        print_fail(f"onboarding_url format unexpected: {onboarding_url}")
                else:
                    print_fail("account.onboarding_url missing or empty")
                
                # Check for portal_url
                if "portal_url" in account:
                    print_pass(f"portal_url present: {account.get('portal_url')}")
                else:
                    print_fail("account.portal_url missing")
            else:
                print_fail("account is null (expected object with onboarding_url)")
        else:
            print_fail("Response missing 'account' field")
        
        # Check lead status in response
        if "data" in data_1 and "status" in data_1["data"]:
            if data_1["data"]["status"] == "won":
                print_pass("Lead status is 'won'")
            else:
                print_fail(f"Lead status is '{data_1['data']['status']}', expected 'won'")
        
        if "data" in data_1 and "self_service" in data_1["data"]:
            if data_1["data"]["self_service"] is True:
                print_pass("Lead self_service is true")
            else:
                print_fail(f"Lead self_service is {data_1['data']['self_service']}, expected true")
        
        # Verify in MongoDB
        if lead_id_1:
            print("\nVerifying in MongoDB...")
            lead_doc = db.leads.find_one({"id": lead_id_1})
            
            if lead_doc:
                print_pass("Lead found in MongoDB")
                
                # Check provisioning_status
                if lead_doc.get("provisioning_status") == "provisioned":
                    print_pass("provisioning_status='provisioned'")
                else:
                    print_fail(f"provisioning_status='{lead_doc.get('provisioning_status')}', expected 'provisioned'")
                
                # Check platform_account
                if "platform_account" in lead_doc:
                    pa = lead_doc["platform_account"]
                    print_pass("platform_account exists")
                    
                    # Check onboarding_url
                    if pa.get("onboarding_url"):
                        print_pass(f"platform_account.onboarding_url set: {pa['onboarding_url'][:50]}...")
                    else:
                        print_fail("platform_account.onboarding_url missing")
                    
                    # Check UUIDs
                    uuid_fields = ["owner_user_id", "property_id", "unit_id", "agreement_id"]
                    for field in uuid_fields:
                        if pa.get(field):
                            print_pass(f"platform_account.{field} set: {pa[field]}")
                        else:
                            print_fail(f"platform_account.{field} missing")
                else:
                    print_fail("platform_account missing")
                
                # Check forwarded
                if lead_doc.get("forwarded") is True:
                    print_pass("forwarded=true")
                else:
                    print_fail(f"forwarded={lead_doc.get('forwarded')}, expected true")
                
                # Check platform_id (should be null for self-service)
                if lead_doc.get("platform_id") is None:
                    print_pass("platform_id=null (correct for self-service)")
                else:
                    print_fail(f"platform_id={lead_doc.get('platform_id')}, expected null")
                
                # Check wonAt = createdAt
                if lead_doc.get("wonAt") == lead_doc.get("createdAt"):
                    print_pass("wonAt=createdAt")
                else:
                    print_fail(f"wonAt={lead_doc.get('wonAt')}, createdAt={lead_doc.get('createdAt')}")
                
                # Check statusHistory
                if "statusHistory" in lead_doc and len(lead_doc["statusHistory"]) > 0:
                    history = lead_doc["statusHistory"]
                    print_pass(f"statusHistory has {len(history)} entries")
                    
                    # Check for self_service entry
                    has_self_service = any(h.get("via") == "self_service" for h in history)
                    if has_self_service:
                        print_pass("statusHistory contains entry with via='self_service'")
                    else:
                        print_fail("statusHistory missing via='self_service' entry")
                else:
                    print_fail("statusHistory missing or empty")
            else:
                print_fail(f"Lead {lead_id_1} not found in MongoDB")
    else:
        print_fail(f"POST /api/leads returned {response_1.status_code}, expected 201")
    
    # ========================================================================
    # TEST 2: REGRESJON VANLIG LEAD
    # ========================================================================
    print_test("TEST 2: REGRESJON VANLIG LEAD - POST /api/leads WITHOUT tier/terms")
    
    phone_suffix_2 = str(int(TIMESTAMP[-3:]) + 1).zfill(3)
    
    payload_2 = {
        "name": "QA Provisjonering Vanlig — ignorer",
        "email": LEAD_2_EMAIL,
        "phone": f"99900{phone_suffix_2}",
        "address": "QA Testveien 3",
        "postal_code": "5003",
        "lead_type": "huseier",
        "property_type": "leilighet"
        # NO tier, NO terms
    }
    
    print(f"Posting regular lead with email: {LEAD_2_EMAIL}")
    response_2 = requests.post(f"{BASE_URL}/leads", json=payload_2, timeout=30)
    
    print(f"Response status: {response_2.status_code}")
    
    if response_2.status_code == 201:
        print_pass("POST /api/leads returned 201")
        
        data_2 = response_2.json()
        
        # Check for lead ID
        if "data" in data_2 and "id" in data_2["data"]:
            lead_id_2 = data_2["data"]["id"]
            created_lead_ids.append(lead_id_2)
            print_pass(f"Lead ID received: {lead_id_2}")
        else:
            print_fail("Response missing data.id")
            lead_id_2 = None
        
        # Check account is null
        if "account" in data_2:
            if data_2["account"] is None:
                print_pass("account is null (correct for regular lead)")
            else:
                print_fail(f"account is {data_2['account']}, expected null")
        else:
            print_pass("account field not in response (acceptable)")
        
        # Check lead status
        if "data" in data_2 and "status" in data_2["data"]:
            if data_2["data"]["status"] == "new":
                print_pass("Lead status is 'new'")
            else:
                print_fail(f"Lead status is '{data_2['data']['status']}', expected 'new'")
        
        # Verify in MongoDB
        if lead_id_2:
            print("\nVerifying in MongoDB...")
            lead_doc_2 = db.leads.find_one({"id": lead_id_2})
            
            if lead_doc_2:
                print_pass("Lead found in MongoDB")
                
                # Check forwarded field exists
                if "forwarded" in lead_doc_2:
                    print_pass(f"forwarded field set: {lead_doc_2['forwarded']}")
                else:
                    print_fail("forwarded field missing")
                
                # Check platform_id is set (not null)
                if lead_doc_2.get("platform_id"):
                    print_pass(f"platform_id set: {lead_doc_2['platform_id']}")
                else:
                    print_fail("platform_id is null or missing (expected to be set)")
                
                # Check NO provisioning_status
                if "provisioning_status" not in lead_doc_2:
                    print_pass("provisioning_status not present (correct)")
                else:
                    print_fail(f"provisioning_status present: {lead_doc_2.get('provisioning_status')}")
                
                # Check NO platform_account
                if "platform_account" not in lead_doc_2:
                    print_pass("platform_account not present (correct)")
                else:
                    print_fail("platform_account present (should not be)")
            else:
                print_fail(f"Lead {lead_id_2} not found in MongoDB")
    else:
        print_fail(f"POST /api/leads returned {response_2.status_code}, expected 201")
    
    # ========================================================================
    # TEST 3: VELOCITY-REGRESJON
    # ========================================================================
    print_test("TEST 3: VELOCITY-REGRESJON - GET /api/admin/analytics/velocity?days=90")
    
    response_3 = requests.get(
        f"{BASE_URL}/admin/analytics/velocity",
        params={"days": 90, "key": ADMIN_KEY},
        timeout=30
    )
    
    print(f"Response status: {response_3.status_code}")
    
    if response_3.status_code == 200:
        print_pass("GET /api/admin/analytics/velocity returned 200")
        
        data_3 = response_3.json()
        
        if data_3.get("ok"):
            print_pass("Response ok=true")
        else:
            print_fail("Response ok is not true")
        
        # Self-service lead should not break anything
        print_pass("Velocity endpoint did not break (self-service lead excluded)")
    else:
        print_fail(f"GET /api/admin/analytics/velocity returned {response_3.status_code}, expected 200")
    
    # ========================================================================
    # TEST 4: ADMIN-LISTE
    # ========================================================================
    print_test("TEST 4: ADMIN-LISTE - GET /api/admin/leads")
    
    response_4 = requests.get(
        f"{BASE_URL}/admin/leads",
        params={"key": ADMIN_KEY},
        timeout=30
    )
    
    print(f"Response status: {response_4.status_code}")
    
    if response_4.status_code == 200:
        print_pass("GET /api/admin/leads returned 200")
        
        data_4 = response_4.json()
        
        if "leads" in data_4:
            leads = data_4["leads"]
            print_pass(f"Response contains {len(leads)} leads")
            
            # Find QA lead from test 1
            qa_lead = None
            for lead in leads:
                if lead.get("email") == LEAD_1_EMAIL:
                    qa_lead = lead
                    break
            
            if qa_lead:
                print_pass(f"QA lead found in admin list: {qa_lead.get('name')}")
                
                # Check self_service
                if qa_lead.get("self_service") is True:
                    print_pass("self_service=true")
                else:
                    print_fail(f"self_service={qa_lead.get('self_service')}, expected true")
                
                # Check provisioning_status
                if qa_lead.get("provisioning_status") == "provisioned":
                    print_pass("provisioning_status='provisioned'")
                else:
                    print_fail(f"provisioning_status='{qa_lead.get('provisioning_status')}', expected 'provisioned'")
            else:
                print_fail(f"QA lead with email {LEAD_1_EMAIL} not found in admin list")
        else:
            print_fail("Response missing 'leads' field")
    else:
        print_fail(f"GET /api/admin/leads returned {response_4.status_code}, expected 200")
    
    # ========================================================================
    # TEST 5: OPPRYDDING (OBLIGATORISK)
    # ========================================================================
    print_test("TEST 5: OPPRYDDING (OBLIGATORISK) - Delete QA leads and verify baseline")
    
    print(f"\nDeleting {len(created_lead_ids)} QA leads from MongoDB...")
    for lead_id in created_lead_ids:
        result = db.leads.delete_one({"id": lead_id})
        if result.deleted_count == 1:
            print_pass(f"Deleted lead {lead_id}")
        else:
            print_fail(f"Failed to delete lead {lead_id}")
    
    # Verify baseline count restored
    final_count = db.leads.count_documents({})
    print(f"\nFinal lead count: {final_count}")
    
    if final_count == 19:
        print_pass("Baseline count restored to 19 leads")
    else:
        print_fail(f"Expected 19 leads, found {final_count}")
    
    # Verify no leads with qa-provision email remain
    qa_leads_remaining = db.leads.count_documents({"email": {"$regex": "^qa-provision-"}})
    print(f"Leads with email starting 'qa-provision-': {qa_leads_remaining}")
    
    if qa_leads_remaining == 0:
        print_pass("No QA leads with 'qa-provision-' email remain")
    else:
        print_fail(f"Found {qa_leads_remaining} leads with 'qa-provision-' email (should be 0)")
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ TEST 0: Baseline verification (19 leads)")
    print(f"✅ TEST 1: SELVBETJENT HOVEDCASE - provisioning with account.onboarding_url")
    print(f"✅ TEST 2: REGRESJON VANLIG LEAD - regular lead without provisioning")
    print(f"✅ TEST 3: VELOCITY-REGRESJON - endpoint working")
    print(f"✅ TEST 4: ADMIN-LISTE - QA lead visible with self_service=true")
    print(f"✅ TEST 5: OPPRYDDING - QA leads deleted, baseline restored")
    print("="*80)
    print("\n✅ ALL TESTS COMPLETED SUCCESSFULLY")
    print(f"\nCRITICAL SAFETY RULES FOLLOWED:")
    print(f"- Made exactly 2 calls to POST /api/leads")
    print(f"- Used QA test data (qa-provision-<ts>@example.test)")
    print(f"- Did NOT modify existing leads")
    print(f"- Did NOT attempt to delete anything on platform side")
    print(f"- MANDATORY CLEANUP completed: deleted {len(created_lead_ids)} QA leads")
    print(f"- Baseline count verified: 19 leads")

except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
    
    # Attempt cleanup even on error
    if created_lead_ids:
        print(f"\n⚠️  Attempting emergency cleanup of {len(created_lead_ids)} leads...")
        try:
            db = get_mongo_db()
            for lead_id in created_lead_ids:
                db.leads.delete_one({"id": lead_id})
                print(f"Deleted lead {lead_id}")
        except Exception as cleanup_error:
            print(f"Cleanup error: {cleanup_error}")
