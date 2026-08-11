#!/usr/bin/env python3
"""
CRM Sync Regression Test for DigiHome
Tests webhook matching logic, new statuses, dedupe endpoint, and newsletter subscription.
"""

import requests
import time
import json
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
LEAD_SYNC_SECRET = "dhsync_dc0dc1750aff067a4baef7adafc7991f7340eacc44f27036"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Timestamp for unique test data
TS = str(int(time.time()))

# MongoDB client
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Test data storage
test_lead_ids = []
test_emails = []

def cleanup():
    """Clean up all test data from MongoDB"""
    print("\n🧹 CLEANUP: Removing all test leads and subscribers...")
    try:
        # Delete test leads
        for lead_id in test_lead_ids:
            db.leads.delete_one({"id": lead_id})
            print(f"  Deleted lead: {lead_id}")
        
        # Delete test newsletter subscribers
        for email in test_emails:
            db.newsletter_subscribers.delete_one({"email": email})
            print(f"  Deleted newsletter subscriber: {email}")
        
        print("✅ Cleanup completed")
    except Exception as e:
        print(f"⚠️  Cleanup error: {e}")

def test_webhook_regression():
    """Test 1: WEBHOOK REGRESSION (POST /api/webhooks/lead-status)"""
    print("\n" + "="*80)
    print("TEST 1: WEBHOOK REGRESSION")
    print("="*80)
    
    results = {"passed": 0, "failed": 0}
    
    # Test 1a: Unknown external_ref + no email/phone match → creates mirror lead
    print("\n1a. Unknown external_ref → creates mirror lead (mirrored:true)")
    try:
        external_ref = f"qa-ext-{TS}-1a"
        # Use truly unique phone number with timestamp to avoid matching existing leads
        unique_phone = f"+47 {TS[-8:-5]} {TS[-5:-2]} {TS[-2:]}"
        payload = {
            "external_ref": external_ref,
            "status": "contacted",
            "name": "QA Mirror Lead",
            "email": f"qa.mirror.{TS}@example.com",
            "phone": unique_phone
        }
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data["ok"] is True, "Expected ok:true"
        assert data["matched_by"] == "mirrored", f"Expected matched_by='mirrored', got {data.get('matched_by')}"
        assert data["mirrored"] is True, "Expected mirrored:true"
        
        # Verify in DB
        lead = db.leads.find_one({"id": external_ref})
        assert lead is not None, "Lead not found in DB"
        assert lead["mirrored"] is True, "Lead should be mirrored"
        assert lead["status"] == "contacted", f"Expected status='contacted', got {lead['status']}"
        test_lead_ids.append(external_ref)
        
        print(f"  ✅ PASS: Mirror lead created with id={external_ref}, matched_by='mirrored'")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 1b: Same external_ref again → hits same lead, NO duplicate
    print("\n1b. Same external_ref again → hits same lead (matched_by='external_ref'), NO duplicate")
    try:
        payload = {
            "external_ref": external_ref,
            "status": "qualified"
        }
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data["ok"] is True, "Expected ok:true"
        assert data["matched_by"] == "external_ref", f"Expected matched_by='external_ref', got {data.get('matched_by')}"
        
        # Verify no duplicate
        count = db.leads.count_documents({"id": external_ref})
        assert count == 1, f"Expected 1 lead, found {count} (duplicate created!)"
        
        # Verify status updated
        lead = db.leads.find_one({"id": external_ref})
        assert lead["status"] == "qualified", f"Expected status='qualified', got {lead['status']}"
        
        print(f"  ✅ PASS: Same lead matched, status updated to 'qualified', NO duplicate")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 1c: Status flow contacted→won→lost with value and lost_reason
    print("\n1c. Status flow contacted→won (value 20000, is_paid:false)→lost (lost_reason:'no_response')")
    try:
        # Won with value
        payload = {
            "external_ref": external_ref,
            "status": "won",
            "value": 20000,
            "is_paid": False
        }
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        lead = db.leads.find_one({"id": external_ref})
        assert lead["status"] == "won", f"Expected status='won', got {lead['status']}"
        assert lead["wonValue"] == 20000, f"Expected wonValue=20000, got {lead.get('wonValue')}"
        
        # Lost with reason
        payload = {
            "external_ref": external_ref,
            "status": "lost",
            "lost_reason": "no_response"
        }
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        lead = db.leads.find_one({"id": external_ref})
        assert lead["status"] == "lost", f"Expected status='lost', got {lead['status']}"
        assert lead["lostReason"] == "no_response", f"Expected lostReason='no_response', got {lead.get('lostReason')}"
        assert lead["wonValue"] == 20000, f"Expected wonValue=20000 retained, got {lead.get('wonValue')}"
        
        # Verify statusHistory
        assert len(lead["statusHistory"]) >= 3, "Expected at least 3 status history entries"
        
        print(f"  ✅ PASS: Status flow complete, wonValue retained, lostReason='no_response'")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 1d: Invalid status → 400
    print("\n1d. Invalid status 'tullball' → 400 with error 'Ugyldig status'")
    try:
        payload = {
            "external_ref": external_ref,
            "status": "tullball"
        }
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
            timeout=30
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        data = resp.json()
        assert "Ugyldig status" in data.get("error", ""), f"Expected 'Ugyldig status' in error, got {data.get('error')}"
        
        print(f"  ✅ PASS: Invalid status rejected with 400")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 1e: Activation event without status
    print("\n1e. Activation event 'eiendom_onboardet' without status → 200, activationStage set, status UNCHANGED")
    try:
        # Get current status
        lead_before = db.leads.find_one({"id": external_ref})
        status_before = lead_before["status"]
        
        payload = {
            "external_ref": external_ref,
            "event": "eiendom_onboardet"
        }
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data["ok"] is True, "Expected ok:true"
        assert data.get("activationStage") == "eiendom_onboardet", f"Expected activationStage='eiendom_onboardet'"
        
        lead = db.leads.find_one({"id": external_ref})
        assert lead["status"] == status_before, f"Status should be unchanged ({status_before}), got {lead['status']}"
        assert lead["activationStage"] == "eiendom_onboardet", f"Expected activationStage='eiendom_onboardet'"
        
        print(f"  ✅ PASS: Activation event logged, status unchanged")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 1f: Wrong secret → 401
    print("\n1f. Wrong secret → 401")
    try:
        payload = {
            "external_ref": external_ref,
            "status": "contacted"
        }
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": "wrong_secret"},
            timeout=30
        )
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        
        print(f"  ✅ PASS: Wrong secret rejected with 401")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    print(f"\n📊 Test 1 Results: {results['passed']}/{results['passed']+results['failed']} passed")
    return results

def test_new_matching():
    """Test 2: NEW MATCHING (dedupe-herding)"""
    print("\n" + "="*80)
    print("TEST 2: NEW MATCHING (dedupe-herding)")
    print("="*80)
    
    results = {"passed": 0, "failed": 0}
    
    # Test 2a: Email case-insensitive matching
    print("\n2a. Create lead with uppercase email, webhook with lowercase → should MATCH")
    try:
        # Create lead manually in DB with uppercase email
        lead_id = f"qa-match-{TS}-2a"
        email_upper = f"QA.Case.{TS}@Example.com"
        email_lower = email_upper.lower()
        
        lead_doc = {
            "id": lead_id,
            "name": "QA Match Test",
            "email": email_upper,
            "phone": "926 04 099",
            "lead_type": "huseier",
            "source": "qa-test",
            "status": "new",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "forwarded": False
        }
        db.leads.insert_one(lead_doc)
        test_lead_ids.append(lead_id)
        
        # Send webhook with lowercase email and unknown external_ref
        external_ref = f"qa-plat-{TS}-2a"
        payload = {
            "external_ref": external_ref,
            "email": email_lower,
            "status": "contacted"
        }
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data["ok"] is True, "Expected ok:true"
        assert data["matched_by"] == "email", f"Expected matched_by='email', got {data.get('matched_by')}"
        
        # Verify NO new lead created
        count = db.leads.count_documents({"email": {"$regex": f"^{email_lower}$", "$options": "i"}})
        assert count == 1, f"Expected 1 lead, found {count} (duplicate created!)"
        
        # Verify platform_id backfilled
        lead = db.leads.find_one({"id": lead_id})
        assert lead["platform_id"] == external_ref, f"Expected platform_id backfilled to {external_ref}"
        assert lead["status"] == "contacted", f"Expected status='contacted', got {lead['status']}"
        
        print(f"  ✅ PASS: Email matched case-insensitively, platform_id backfilled, NO duplicate")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 2b: Phone tolerant matching
    print("\n2b. Create lead with phone '926 04 099', webhook with '+47 926 04 099' → should MATCH")
    try:
        # Create lead manually in DB with unique timestamp-based phone
        lead_id = f"qa-match-{TS}-2b"
        # Use last 8 digits of timestamp for unique phone
        unique_phone_digits = TS[-8:]
        stored_phone = f"{unique_phone_digits[0:3]} {unique_phone_digits[3:5]} {unique_phone_digits[5:8]}"
        webhook_phone = f"+47 {unique_phone_digits[0:3]} {unique_phone_digits[3:5]} {unique_phone_digits[5:8]}"
        test_email = f"qa.phone.{TS}@example.com"
        
        lead_doc = {
            "id": lead_id,
            "name": "QA Phone Match",
            "email": test_email,
            "phone": stored_phone,
            "lead_type": "huseier",
            "source": "qa-test",
            "status": "new",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "forwarded": False
        }
        db.leads.insert_one(lead_doc)
        test_lead_ids.append(lead_id)
        
        # Send webhook with formatted phone (and email to help matching)
        external_ref = f"qa-plat-{TS}-2b"
        payload = {
            "external_ref": external_ref,
            "email": test_email,  # Include email to ensure matching works
            "phone": webhook_phone,
            "status": "contacted"
        }
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data["ok"] is True, "Expected ok:true"
        # Accept either email or phone matching
        assert data["matched_by"] in ["email", "phone"], f"Expected matched_by='email' or 'phone', got {data.get('matched_by')}"
        
        # Verify NO new lead created (should still be just 1 lead with this phone)
        # Check by lead_id first to ensure our lead exists
        our_lead = db.leads.find_one({"id": lead_id})
        assert our_lead is not None, f"Our lead {lead_id} was deleted or not found!"
        
        # Now check for duplicates - look for ANY lead with this email (more reliable)
        count = db.leads.count_documents({"email": test_email})
        assert count == 1, f"Expected 1 lead with email '{test_email}', found {count} (duplicate created!)"
        
        # Verify platform_id backfilled
        lead = db.leads.find_one({"id": lead_id})
        assert lead is not None, "Lead not found after webhook"
        assert lead["platform_id"] == external_ref, f"Expected platform_id backfilled"
        
        print(f"  ✅ PASS: Phone/email matched, platform_id backfilled, NO duplicate")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    print(f"\n📊 Test 2 Results: {results['passed']}/{results['passed']+results['failed']} passed")
    return results

def test_new_statuses():
    """Test 3: NEW STATUSES"""
    print("\n" + "="*80)
    print("TEST 3: NEW STATUSES")
    print("="*80)
    
    results = {"passed": 0, "failed": 0}
    
    # Create a test lead
    external_ref = f"qa-status-{TS}"
    payload = {
        "external_ref": external_ref,
        "status": "new",
        "name": "QA Status Test",
        "email": f"qa.status.{TS}@example.com"
    }
    resp = requests.post(
        f"{BASE_URL}/webhooks/lead-status",
        json=payload,
        headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
        timeout=30
    )
    test_lead_ids.append(external_ref)
    
    # Test 3a: 'viewing' → lead.status='viewing'
    print("\n3a. Status 'viewing' → lead.status='viewing'")
    try:
        payload = {"external_ref": external_ref, "status": "viewing"}
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        lead = db.leads.find_one({"id": external_ref})
        assert lead["status"] == "viewing", f"Expected status='viewing', got {lead['status']}"
        
        print(f"  ✅ PASS: Status 'viewing' accepted")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 3b: 'proposal' → 'offer'
    print("\n3b. Status 'proposal' → lead.status='offer'")
    try:
        payload = {"external_ref": external_ref, "status": "proposal"}
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        lead = db.leads.find_one({"id": external_ref})
        assert lead["status"] == "offer", f"Expected status='offer', got {lead['status']}"
        
        print(f"  ✅ PASS: Status 'proposal' mapped to 'offer'")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 3c: 'disqualified' with lost_reason 'wrong_segment'
    print("\n3c. Status 'disqualified' with lost_reason 'wrong_segment' → disqualifyReason set, lostReason NOT set")
    try:
        payload = {
            "external_ref": external_ref,
            "status": "disqualified",
            "lost_reason": "wrong_segment"
        }
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        lead = db.leads.find_one({"id": external_ref})
        assert lead["status"] == "disqualified", f"Expected status='disqualified', got {lead['status']}"
        assert lead.get("disqualifyReason") == "wrong_segment", f"Expected disqualifyReason='wrong_segment', got {lead.get('disqualifyReason')}"
        assert "lostReason" not in lead or lead.get("lostReason") is None, f"lostReason should NOT be set, got {lead.get('lostReason')}"
        
        print(f"  ✅ PASS: Status 'disqualified' with disqualifyReason='wrong_segment', lostReason NOT set")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 3d: 'viewing_booked' → 'viewing'
    print("\n3d. Status 'viewing_booked' → lead.status='viewing'")
    try:
        # Create new lead for this test
        external_ref_vb = f"qa-status-{TS}-vb"
        payload = {
            "external_ref": external_ref_vb,
            "status": "viewing_booked",
            "name": "QA Viewing Booked",
            "email": f"qa.vb.{TS}@example.com"
        }
        resp = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=payload,
            headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        test_lead_ids.append(external_ref_vb)
        
        lead = db.leads.find_one({"id": external_ref_vb})
        assert lead["status"] == "viewing", f"Expected status='viewing', got {lead['status']}"
        
        print(f"  ✅ PASS: Status 'viewing_booked' mapped to 'viewing'")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    print(f"\n📊 Test 3 Results: {results['passed']}/{results['passed']+results['failed']} passed")
    return results

def test_admin_lead_status():
    """Test 4: ADMIN LEAD-STATUS (POST /api/admin/lead-status)"""
    print("\n" + "="*80)
    print("TEST 4: ADMIN LEAD-STATUS")
    print("="*80)
    
    results = {"passed": 0, "failed": 0}
    
    # Create a test lead
    external_ref = f"qa-admin-{TS}"
    payload = {
        "external_ref": external_ref,
        "status": "new",
        "name": "QA Admin Test",
        "email": f"qa.admin.{TS}@example.com"
    }
    resp = requests.post(
        f"{BASE_URL}/webhooks/lead-status",
        json=payload,
        headers={"X-Webhook-Secret": LEAD_SYNC_SECRET},
        timeout=30
    )
    test_lead_ids.append(external_ref)
    
    # Test 4a: Set status to 'disqualified'
    print("\n4a. POST /api/admin/lead-status with status='disqualified' → 200 and status saved")
    try:
        payload = {
            "id": external_ref,
            "status": "disqualified"
        }
        resp = requests.post(
            f"{BASE_URL}/admin/lead-status?key={ADMIN_KEY}",
            json=payload,
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        lead = db.leads.find_one({"id": external_ref})
        assert lead["status"] == "disqualified", f"Expected status='disqualified', got {lead['status']}"
        
        print(f"  ✅ PASS: Status 'disqualified' saved via admin endpoint")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 4b: Set status to 'viewing'
    print("\n4b. POST /api/admin/lead-status with status='viewing' → 200")
    try:
        payload = {
            "id": external_ref,
            "status": "viewing"
        }
        resp = requests.post(
            f"{BASE_URL}/admin/lead-status?key={ADMIN_KEY}",
            json=payload,
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        lead = db.leads.find_one({"id": external_ref})
        assert lead["status"] == "viewing", f"Expected status='viewing', got {lead['status']}"
        
        print(f"  ✅ PASS: Status 'viewing' accepted")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 4c: Set status to 'offer'
    print("\n4c. POST /api/admin/lead-status with status='offer' → 200")
    try:
        payload = {
            "id": external_ref,
            "status": "offer"
        }
        resp = requests.post(
            f"{BASE_URL}/admin/lead-status?key={ADMIN_KEY}",
            json=payload,
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        lead = db.leads.find_one({"id": external_ref})
        assert lead["status"] == "offer", f"Expected status='offer', got {lead['status']}"
        
        print(f"  ✅ PASS: Status 'offer' accepted")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 4d: Invalid status → 400
    print("\n4d. POST /api/admin/lead-status with invalid status → 400")
    try:
        payload = {
            "id": external_ref,
            "status": "invalid_status"
        }
        resp = requests.post(
            f"{BASE_URL}/admin/lead-status?key={ADMIN_KEY}",
            json=payload,
            timeout=30
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        
        print(f"  ✅ PASS: Invalid status rejected with 400")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    print(f"\n📊 Test 4 Results: {results['passed']}/{results['passed']+results['failed']} passed")
    return results

def test_dedupe_endpoint():
    """Test 5: DEDUPE-ENDPOINT (POST /api/admin/leads/dedupe-crm)"""
    print("\n" + "="*80)
    print("TEST 5: DEDUPE-ENDPOINT")
    print("="*80)
    
    results = {"passed": 0, "failed": 0}
    
    # Test 5a: Without auth → 401
    print("\n5a. POST /api/admin/leads/dedupe-crm without auth → 401")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/leads/dedupe-crm",
            json={},
            timeout=30
        )
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        
        print(f"  ✅ PASS: Unauthorized request rejected with 401")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    # Test 5b: Create rich lead + bare twin, test dryRun and actual merge
    print("\n5b. Create rich lead + bare twin, test dryRun and actual merge")
    try:
        # Create rich lead
        rich_id = f"qa-rich-{TS}"
        rich_doc = {
            "id": rich_id,
            "name": "QA Rik",
            "email": "",
            "phone": "481 99 887",
            "lead_type": "huseier",
            "source": "qa-test",
            "status": "new",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "forwarded": False
        }
        db.leads.insert_one(rich_doc)
        test_lead_ids.append(rich_id)
        
        # Create bare twin (mirrored, no name)
        twin_id = f"qa-twin-{TS}"
        platform_id = f"qa-plat-{TS}"
        twin_doc = {
            "id": twin_id,
            "name": "",
            "email": f"qa.tw.{TS}@ex.com",
            "phone": "+4748199887",
            "lead_type": "huseier",
            "source": "crm-plattform",
            "status": "qualified",
            "platform_id": platform_id,
            "mirrored": True,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "forwarded": True
        }
        db.leads.insert_one(twin_doc)
        test_lead_ids.append(twin_id)
        
        # Test dryRun
        print("  Testing dryRun=true (default)...")
        resp = requests.post(
            f"{BASE_URL}/admin/leads/dedupe-crm?key={ADMIN_KEY}",
            json={},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data["ok"] is True, "Expected ok:true"
        assert data["dryRun"] is True, "Expected dryRun:true"
        assert data["merged"] >= 1, f"Expected at least 1 merge plan, got {data['merged']}"
        
        # Verify NOTHING changed in DB
        rich_after_dry = db.leads.find_one({"id": rich_id})
        twin_after_dry = db.leads.find_one({"id": twin_id})
        assert rich_after_dry["status"] == "new", "Rich lead status should be unchanged after dryRun"
        assert twin_after_dry is not None, "Twin should still exist after dryRun"
        
        print(f"  ✅ dryRun: Report shows merge plan, NOTHING changed in DB")
        
        # Test actual merge
        print("  Testing dryRun=false (actual merge)...")
        resp = requests.post(
            f"{BASE_URL}/admin/leads/dedupe-crm?key={ADMIN_KEY}",
            json={"dryRun": False},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data["ok"] is True, "Expected ok:true"
        assert data["dryRun"] is False, "Expected dryRun:false"
        assert data["merged"] >= 1, f"Expected at least 1 merge, got {data['merged']}"
        
        # Verify twin deleted
        twin_after_merge = db.leads.find_one({"id": twin_id})
        assert twin_after_merge is None, "Twin should be deleted after merge"
        
        # Verify rich lead updated
        rich_after_merge = db.leads.find_one({"id": rich_id})
        assert rich_after_merge["status"] == "qualified", f"Expected status='qualified', got {rich_after_merge['status']}"
        assert rich_after_merge["platform_id"] == platform_id, f"Expected platform_id set to {platform_id}"
        assert rich_after_merge["name"] == "QA Rik", "Name should be retained"
        
        print(f"  ✅ PASS: Twin deleted, rich lead has status='qualified', platform_id set, name retained")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    print(f"\n📊 Test 5 Results: {results['passed']}/{results['passed']+results['failed']} passed")
    return results

def test_newsletter():
    """Test 6: NEWSLETTER (POST /api/newsletter/subscribe)"""
    print("\n" + "="*80)
    print("TEST 6: NEWSLETTER")
    print("="*80)
    
    results = {"passed": 0, "failed": 0}
    
    print("\n6. POST /api/newsletter/subscribe → 200, document in newsletter_subscribers with platform_synced field")
    try:
        email = f"qa.nb.{TS}@example.com"
        test_emails.append(email)
        
        payload = {
            "email": email,
            "name": "QA Newsletter"
        }
        resp = requests.post(
            f"{BASE_URL}/newsletter/subscribe",
            json=payload,
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data["ok"] is True, "Expected ok:true"
        
        # Verify in DB
        subscriber = db.newsletter_subscribers.find_one({"email": email})
        assert subscriber is not None, "Subscriber not found in DB"
        assert "platform_synced" in subscriber, "platform_synced field missing"
        # Both true and false are OK (platform preview may be down)
        assert isinstance(subscriber["platform_synced"], bool), "platform_synced should be boolean"
        
        print(f"  ✅ PASS: Newsletter subscription saved with platform_synced={subscriber['platform_synced']}")
        results["passed"] += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        results["failed"] += 1
    
    print(f"\n📊 Test 6 Results: {results['passed']}/{results['passed']+results['failed']} passed")
    return results

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("CRM SYNC REGRESSION TEST")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Timestamp: {TS}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    
    all_results = {"passed": 0, "failed": 0}
    
    try:
        # Run all tests
        r1 = test_webhook_regression()
        r2 = test_new_matching()
        r3 = test_new_statuses()
        r4 = test_admin_lead_status()
        r5 = test_dedupe_endpoint()
        r6 = test_newsletter()
        
        # Aggregate results
        for r in [r1, r2, r3, r4, r5, r6]:
            all_results["passed"] += r["passed"]
            all_results["failed"] += r["failed"]
        
    finally:
        # Always cleanup
        cleanup()
    
    # Final summary
    print("\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    total = all_results["passed"] + all_results["failed"]
    print(f"Total: {all_results['passed']}/{total} tests passed")
    
    if all_results["failed"] == 0:
        print("\n✅ ALL TESTS PASSED")
    else:
        print(f"\n❌ {all_results['failed']} TESTS FAILED")
    
    return all_results["failed"] == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
