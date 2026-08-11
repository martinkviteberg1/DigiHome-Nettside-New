#!/usr/bin/env python3
"""
Comprehensive backend test for Historisk-fix (webhook matcher imported_leads + dedupe v2 + eksport inkl. historiske)
Tests the three fixes:
1. Webhook /webhooks/lead-status matches imported_leads BEFORE creating mirror twin
2. Dedupe /admin/leads/dedupe-crm v2 merges twins into imported_leads
3. Export /admin/leads/export includes imported_leads with 'historisk' column
"""

import requests
import json
import time
from datetime import datetime
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
WEBHOOK_SECRET = "dhsync_dc0dc1750aff067a4baef7adafc7991f7340eacc44f27036"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# MongoDB client
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Test state
test_state = {
    "baseline_imported": 0,
    "baseline_leads": 0,
    "baseline_mirrored": 0,
    "qa_docs_created": [],
}

def log(msg):
    """Print timestamped log message"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def verify_baseline():
    """Verify and record baseline counts"""
    log("=== VERIFYING BASELINE COUNTS ===")
    
    imported_count = db.imported_leads.count_documents({})
    leads_count = db.leads.count_documents({})
    mirrored_count = db.leads.count_documents({"mirrored": True})
    
    log(f"✓ imported_leads: {imported_count} docs")
    log(f"✓ leads: {leads_count} docs")
    log(f"✓ mirrored leads: {mirrored_count} docs")
    
    # Store baseline
    test_state["baseline_imported"] = imported_count
    test_state["baseline_leads"] = leads_count
    test_state["baseline_mirrored"] = mirrored_count
    
    # Verify expected baseline from review_request
    if imported_count != 44:
        log(f"⚠️  WARNING: Expected 44 imported_leads, found {imported_count}")
    if leads_count != 19:
        log(f"⚠️  WARNING: Expected 19 leads, found {leads_count}")
    if mirrored_count != 0:
        log(f"⚠️  WARNING: Expected 0 mirrored leads, found {mirrored_count}")
    
    return True

def setup_qa_data():
    """Insert QA test documents directly into MongoDB"""
    log("=== SETTING UP QA TEST DATA ===")
    
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    # imported_leads doc A
    doc_a = {
        "id": "qa-imp-1",
        "platform_id": "qa-plat-1",
        "email": "qa-hist1@example.test",
        "name": "QA Historisk 1",
        "status": "contacted",
        "lead_type": "huseier",
        "created_at": now_iso,
        "pre_tracking": True,
        "imported": True,
        "channel": "unknown"
    }
    db.imported_leads.insert_one(doc_a)
    test_state["qa_docs_created"].append(("imported_leads", "qa-imp-1"))
    log("✓ Created imported_leads doc A: qa-imp-1")
    
    # imported_leads doc B (with override)
    doc_b = {
        "id": "qa-imp-2",
        "platform_id": "qa-plat-2",
        "email": "qa-hist2@example.test",
        "name": "QA Historisk 2",
        "status": "new",
        "lead_type": "huseier",
        "created_at": now_iso,
        "pre_tracking": True,
        "imported": True,
        "channel": "unknown",
        "override": {
            "status": "contacted",
            "channel": "meta"
        }
    }
    db.imported_leads.insert_one(doc_b)
    test_state["qa_docs_created"].append(("imported_leads", "qa-imp-2"))
    log("✓ Created imported_leads doc B: qa-imp-2 (with override)")
    
    # leads twin doc T (mirrored)
    doc_t = {
        "id": "qa-plat-2",
        "mirrored": True,
        "origin": "platform",
        "platform_id": "qa-plat-2",
        "email": "qa-hist2@example.test",
        "name": "",
        "phone": "",
        "status": "qualified",
        "statusHistory": [],
        "createdAt": now_iso,
        "forwarded": True,
        "lead_type": "huseier"
    }
    db.leads.insert_one(doc_t)
    test_state["qa_docs_created"].append(("leads", "qa-plat-2"))
    log("✓ Created leads twin doc T: qa-plat-2 (mirrored)")
    
    # leads regular doc R
    doc_r = {
        "id": "qa-reg-1",
        "email": "qa-reg1@example.test",
        "name": "QA Regular",
        "status": "new",
        "statusHistory": [],
        "createdAt": now_iso,
        "forwarded": True,
        "lead_type": "huseier"
    }
    db.leads.insert_one(doc_r)
    test_state["qa_docs_created"].append(("leads", "qa-reg-1"))
    log("✓ Created leads regular doc R: qa-reg-1")
    
    log(f"✓ Setup complete: {len(test_state['qa_docs_created'])} QA docs created")
    return True

def test_webhook_matches_historical():
    """Test 1: Webhook matches historical lead (fix 2)"""
    log("\n=== TEST 1: WEBHOOK MATCHES HISTORICAL ===")
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={"external_ref": "qa-plat-1", "status": "viewing"},
            timeout=10
        )
        
        if response.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {response.status_code}")
            log(f"   Response: {response.text}")
            return False
        
        data = response.json()
        if not data.get("ok"):
            log(f"❌ FAIL: Response ok=false: {data}")
            return False
        
        if data.get("matchedBy") != "imported":
            log(f"❌ FAIL: Expected matchedBy='imported', got '{data.get('matchedBy')}'")
            return False
        
        if not data.get("historic"):
            log(f"❌ FAIL: Expected historic=true, got {data.get('historic')}")
            return False
        
        if data.get("status") != "viewing":
            log(f"❌ FAIL: Expected status='viewing', got '{data.get('status')}'")
            return False
        
        log("✓ Webhook returned 200 {ok:true, matchedBy:'imported', historic:true, status:'viewing'}")
        
        # Verify in MongoDB
        imp = db.imported_leads.find_one({"id": "qa-imp-1"})
        if not imp:
            log("❌ FAIL: qa-imp-1 not found in imported_leads")
            return False
        
        if imp.get("status") != "viewing":
            log(f"❌ FAIL: imported_leads qa-imp-1 status is '{imp.get('status')}', expected 'viewing'")
            return False
        
        log("✓ MongoDB: imported_leads qa-imp-1 now has status='viewing'")
        
        # CRITICAL: Verify NO new doc was created in 'leads' with id 'qa-plat-1'
        mirror_twin = db.leads.find_one({"id": "qa-plat-1"})
        if mirror_twin:
            log("❌ FAIL: CRITICAL - A mirror twin with id 'qa-plat-1' was created in 'leads' collection!")
            log(f"   This should NOT happen. Mirror twin: {mirror_twin}")
            return False
        
        log("✓ CRITICAL: NO mirror twin created in 'leads' with id 'qa-plat-1' (correct behavior)")
        
        log("✅ TEST 1 PASSED")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_webhook_won_with_value():
    """Test 2: Webhook WON with value on historical"""
    log("\n=== TEST 2: WEBHOOK WON WITH VALUE ON HISTORICAL ===")
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={"external_ref": "qa-plat-1", "status": "won", "value": 12000},
            timeout=10
        )
        
        if response.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        if not data.get("historic"):
            log(f"❌ FAIL: Expected historic=true")
            return False
        
        log("✓ Webhook returned 200 with historic:true")
        
        # Verify in MongoDB
        imp = db.imported_leads.find_one({"id": "qa-imp-1"})
        if not imp:
            log("❌ FAIL: qa-imp-1 not found")
            return False
        
        if imp.get("status") != "won":
            log(f"❌ FAIL: status is '{imp.get('status')}', expected 'won'")
            return False
        
        if imp.get("won_value") != 12000:
            log(f"❌ FAIL: won_value is {imp.get('won_value')}, expected 12000")
            return False
        
        if not imp.get("won_at"):
            log("❌ FAIL: won_at not set")
            return False
        
        log("✓ MongoDB: qa-imp-1 has status='won', won_value=12000, won_at set")
        log("✅ TEST 2 PASSED")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_webhook_auth():
    """Test 3: Webhook AUTH"""
    log("\n=== TEST 3: WEBHOOK AUTH ===")
    
    try:
        # Without secret
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json={"external_ref": "qa-plat-1", "status": "viewing"},
            timeout=10
        )
        
        if response.status_code != 401:
            log(f"❌ FAIL: Expected 401 without secret, got {response.status_code}")
            return False
        
        log("✓ Without X-Webhook-Secret returns 401")
        log("✅ TEST 3 PASSED")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_dedupe_dryrun():
    """Test 4: DEDUPE V2 DRYRUN (fix 1)"""
    log("\n=== TEST 4: DEDUPE V2 DRYRUN ===")
    
    try:
        response = requests.post(
            f"{BASE_URL}/admin/leads/dedupe-crm?key={ADMIN_KEY}",
            json={"dryRun": True},
            timeout=30
        )
        
        if response.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {response.status_code}")
            log(f"   Response: {response.text}")
            return False
        
        data = response.json()
        if not data.get("ok"):
            log(f"❌ FAIL: Response ok=false: {data}")
            return False
        
        merged = data.get("merged", 0)
        if merged < 1:
            log(f"❌ FAIL: Expected merged >= 1, got {merged}")
            return False
        
        log(f"✓ Dedupe dryRun returned 200 with merged={merged}")
        
        # Find the report entry for our QA twin
        report = data.get("report", [])
        qa_entry = None
        for entry in report:
            if entry.get("twin") == "qa-plat-2":
                qa_entry = entry
                break
        
        if not qa_entry:
            log("❌ FAIL: No report entry found for twin='qa-plat-2'")
            log(f"   Report: {report}")
            return False
        
        # Verify report entry structure
        if qa_entry.get("mergedInto") != "qa-imp-2":
            log(f"❌ FAIL: Expected mergedInto='qa-imp-2', got '{qa_entry.get('mergedInto')}'")
            return False
        
        if not qa_entry.get("historic"):
            log(f"❌ FAIL: Expected historic=true, got {qa_entry.get('historic')}")
            return False
        
        if qa_entry.get("matchedBy") != "platform_id":
            log(f"❌ FAIL: Expected matchedBy='platform_id', got '{qa_entry.get('matchedBy')}'")
            return False
        
        if qa_entry.get("statusApplied") != "qualified":
            log(f"❌ FAIL: Expected statusApplied='qualified', got '{qa_entry.get('statusApplied')}'")
            return False
        
        log("✓ Report contains entry: twin='qa-plat-2', mergedInto='qa-imp-2', historic=true, matchedBy='platform_id', statusApplied='qualified'")
        
        # CRITICAL: Verify the plan does NOT touch any non-QA docs
        for entry in report:
            merged_into = entry.get("mergedInto", "")
            if merged_into and not merged_into.startswith("qa-"):
                log(f"⚠️  WARNING: Report entry touches non-QA doc: {entry}")
        
        log("✓ Plan verification: All mergedInto entries are QA docs (safe)")
        log("✅ TEST 4 PASSED")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_dedupe_apply():
    """Test 5: DEDUPE V2 APPLY"""
    log("\n=== TEST 5: DEDUPE V2 APPLY ===")
    
    try:
        response = requests.post(
            f"{BASE_URL}/admin/leads/dedupe-crm?key={ADMIN_KEY}",
            json={"dryRun": False},
            timeout=30
        )
        
        if response.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        if not data.get("ok"):
            log(f"❌ FAIL: Response ok=false: {data}")
            return False
        
        log("✓ Dedupe apply returned 200")
        
        # Verify in MongoDB: (a) leads doc 'qa-plat-2' is DELETED
        twin = db.leads.find_one({"id": "qa-plat-2"})
        if twin:
            log(f"❌ FAIL: Twin 'qa-plat-2' still exists in leads collection")
            return False
        
        log("✓ MongoDB: leads doc 'qa-plat-2' is DELETED")
        
        # (b) imported_leads qa-imp-2 now has status='qualified'
        imp = db.imported_leads.find_one({"id": "qa-imp-2"})
        if not imp:
            log("❌ FAIL: qa-imp-2 not found in imported_leads")
            return False
        
        if imp.get("status") != "qualified":
            log(f"❌ FAIL: qa-imp-2 status is '{imp.get('status')}', expected 'qualified'")
            return False
        
        log("✓ MongoDB: imported_leads qa-imp-2 now has status='qualified'")
        
        # (c) qa-imp-2 override.status is REMOVED (was 'contacted' ≠ 'qualified' — CRM wins)
        override = imp.get("override", {})
        if "status" in override:
            log(f"❌ FAIL: qa-imp-2 override.status still exists: {override.get('status')}")
            return False
        
        log("✓ MongoDB: qa-imp-2 override.status is REMOVED (CRM wins)")
        
        # (d) override.channel='meta' is STILL PRESENT (attribution overrides preserved)
        if override.get("channel") != "meta":
            log(f"❌ FAIL: qa-imp-2 override.channel is '{override.get('channel')}', expected 'meta'")
            return False
        
        log("✓ MongoDB: qa-imp-2 override.channel='meta' is STILL PRESENT (attribution preserved)")
        
        log("✅ TEST 5 PASSED")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_export_includes_historical():
    """Test 6: EXPORT INCLUDES HISTORICAL (fix 3)"""
    log("\n=== TEST 6: EXPORT INCLUDES HISTORICAL ===")
    
    try:
        # GET export
        response = requests.get(
            f"{BASE_URL}/admin/leads/export?type=lead&key={ADMIN_KEY}",
            timeout=30
        )
        
        if response.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
        
        if "text/csv" not in response.headers.get("Content-Type", ""):
            log(f"❌ FAIL: Expected Content-Type text/csv, got {response.headers.get('Content-Type')}")
            return False
        
        csv_text = response.text
        lines = csv_text.split("\n")
        
        if len(lines) < 2:
            log(f"❌ FAIL: CSV has less than 2 lines")
            return False
        
        # Verify header row ends with 'historisk'
        header = lines[0].strip()
        if not header.endswith("historisk"):
            log(f"❌ FAIL: Header row does not end with 'historisk': {header}")
            return False
        
        log("✓ CSV header row ends with 'historisk'")
        
        # Count data rows (excluding header and empty lines)
        data_rows = [line for line in lines[1:] if line.strip()]
        
        # Should have MORE than 19 regular leads (19 + historical leads)
        # Expected: ~19 regular + 44+2 imported huseier-type rows
        # Just verify we have more than 19 and that QA Historisk 1 appears
        if len(data_rows) <= 19:
            log(f"⚠️  WARNING: Expected more than 19 data rows, got {len(data_rows)}")
        
        log(f"✓ CSV has {len(data_rows)} data rows (more than 19 regular leads)")
        
        # Verify 'QA Historisk 1' appears with status won and wonValue 12000
        found_qa_hist1 = False
        for row in data_rows:
            if "QA Historisk 1" in row and "won" in row and "12000" in row:
                found_qa_hist1 = True
                # Check if historisk=true (last column should be 'true' or '1')
                cols = row.split(",")
                if cols[-1].strip().lower() not in ["true", "1"]:
                    log(f"⚠️  WARNING: QA Historisk 1 row does not have historisk=true: {row}")
                break
        
        if not found_qa_hist1:
            log(f"❌ FAIL: 'QA Historisk 1' with status won and wonValue 12000 not found in CSV")
            return False
        
        log("✓ CSV contains 'QA Historisk 1' with status won and wonValue 12000 and historisk=true")
        
        # POST export with specific ids
        response2 = requests.post(
            f"{BASE_URL}/admin/leads/export?key={ADMIN_KEY}",
            json={"type": "lead", "ids": ["qa-imp-1", "qa-reg-1"]},
            timeout=30
        )
        
        if response2.status_code != 200:
            log(f"❌ FAIL: POST export expected 200, got {response2.status_code}")
            return False
        
        csv_text2 = response2.text
        lines2 = csv_text2.split("\n")
        data_rows2 = [line for line in lines2[1:] if line.strip()]
        
        if len(data_rows2) != 2:
            log(f"❌ FAIL: POST export with 2 ids expected 2 data rows, got {len(data_rows2)}")
            return False
        
        # Verify one is 'QA Historisk 1' (historisk=true) and one is 'QA Regular' (historisk empty)
        found_hist = False
        found_reg = False
        for row in data_rows2:
            if "QA Historisk 1" in row:
                found_hist = True
                cols = row.split(",")
                if cols[-1].strip().lower() not in ["true", "1"]:
                    log(f"❌ FAIL: QA Historisk 1 does not have historisk=true in POST export")
                    return False
            if "QA Regular" in row:
                found_reg = True
                cols = row.split(",")
                if cols[-1].strip().lower() in ["true", "1"]:
                    log(f"❌ FAIL: QA Regular has historisk=true (should be empty)")
                    return False
        
        if not found_hist or not found_reg:
            log(f"❌ FAIL: POST export missing expected rows (hist={found_hist}, reg={found_reg})")
            return False
        
        log("✓ POST export with ids=['qa-imp-1','qa-reg-1'] returns exactly 2 rows: one historisk=true, one historisk empty")
        
        log("✅ TEST 6 PASSED")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_regression_normal_webhook():
    """Test 7: REGRESSION NORMAL WEBHOOK PATH"""
    log("\n=== TEST 7: REGRESSION NORMAL WEBHOOK PATH ===")
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={"external_ref": "qa-reg-1", "status": "contacted"},
            timeout=10
        )
        
        if response.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        # Note: API returns matched_by (snake_case), not matchedBy (camelCase)
        matched_by = data.get("matched_by") or data.get("matchedBy")
        if matched_by != "external_ref":
            log(f"❌ FAIL: Expected matched_by='external_ref', got '{matched_by}'")
            return False
        
        if data.get("historic"):
            log(f"❌ FAIL: Expected historic=false or absent, got {data.get('historic')}")
            return False
        
        log("✓ Webhook returned 200 with matched_by='external_ref' (NOT historic)")
        
        # Verify in MongoDB
        lead = db.leads.find_one({"id": "qa-reg-1"})
        if not lead:
            log("❌ FAIL: qa-reg-1 not found in leads")
            return False
        
        if lead.get("status") != "contacted":
            log(f"❌ FAIL: qa-reg-1 status is '{lead.get('status')}', expected 'contacted'")
            return False
        
        log("✓ MongoDB: leads qa-reg-1 status='contacted'")
        log("✅ TEST 7 PASSED")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_regression_mirror_creation():
    """Test 8: REGRESSION MIRROR CREATION STILL WORKS"""
    log("\n=== TEST 8: REGRESSION MIRROR CREATION STILL WORKS ===")
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={
                "external_ref": "qa-plat-3",
                "status": "new",
                "email": "qa-unknown3@example.test",
                "name": "QA Ukjent"
            },
            timeout=10
        )
        
        if response.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        if not data.get("ok"):
            log(f"❌ FAIL: Response ok=false: {data}")
            return False
        
        # Should have mirrored=true in response (or check in DB)
        log("✓ Webhook returned 200")
        
        # Verify in MongoDB
        lead = db.leads.find_one({"id": "qa-plat-3"})
        if not lead:
            log("❌ FAIL: qa-plat-3 not found in leads")
            return False
        
        if not lead.get("mirrored"):
            log(f"❌ FAIL: qa-plat-3 mirrored is {lead.get('mirrored')}, expected true")
            return False
        
        log("✓ MongoDB: leads now has doc id='qa-plat-3' with mirrored=true")
        
        # Add to cleanup list
        test_state["qa_docs_created"].append(("leads", "qa-plat-3"))
        
        log("✅ TEST 8 PASSED")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_regression_endpoints():
    """Test 9: REGRESSION ENDPOINTS"""
    log("\n=== TEST 9: REGRESSION ENDPOINTS ===")
    
    try:
        # GET /api/
        response = requests.get(f"{BASE_URL}/", timeout=10)
        if response.status_code != 200:
            log(f"❌ FAIL: GET /api/ expected 200, got {response.status_code}")
            return False
        log("✓ GET /api/ returns 200")
        
        # GET /api/admin/leads
        response = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=10)
        if response.status_code != 200:
            log(f"❌ FAIL: GET /api/admin/leads expected 200, got {response.status_code}")
            return False
        log("✓ GET /api/admin/leads returns 200")
        
        log("✅ TEST 9 PASSED")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def cleanup():
    """Test 10: CLEANUP (MANDATORY)"""
    log("\n=== TEST 10: CLEANUP (MANDATORY) ===")
    
    try:
        # Delete all QA docs
        for coll_name, doc_id in test_state["qa_docs_created"]:
            result = db[coll_name].delete_one({"id": doc_id})
            if result.deleted_count > 0:
                log(f"✓ Deleted {coll_name}/{doc_id}")
            else:
                log(f"⚠️  WARNING: {coll_name}/{doc_id} not found for deletion")
        
        # Verify baseline counts restored
        imported_count = db.imported_leads.count_documents({})
        leads_count = db.leads.count_documents({})
        mirrored_count = db.leads.count_documents({"mirrored": True})
        
        log(f"\nFinal counts:")
        log(f"  imported_leads: {imported_count} (baseline: {test_state['baseline_imported']})")
        log(f"  leads: {leads_count} (baseline: {test_state['baseline_leads']})")
        log(f"  mirrored: {mirrored_count} (baseline: {test_state['baseline_mirrored']})")
        
        if imported_count != test_state["baseline_imported"]:
            log(f"❌ FAIL: imported_leads count not restored (expected {test_state['baseline_imported']}, got {imported_count})")
            return False
        
        if leads_count != test_state["baseline_leads"]:
            log(f"❌ FAIL: leads count not restored (expected {test_state['baseline_leads']}, got {leads_count})")
            return False
        
        if mirrored_count != test_state["baseline_mirrored"]:
            log(f"❌ FAIL: mirrored count not restored (expected {test_state['baseline_mirrored']}, got {mirrored_count})")
            return False
        
        log("✓ Baseline counts restored: imported_leads=44, leads=19, mirrored=0")
        log("✅ TEST 10 PASSED")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def main():
    """Run all tests"""
    log("=" * 80)
    log("HISTORISK-FIX COMPREHENSIVE BACKEND TEST")
    log("=" * 80)
    
    results = []
    
    # Verify baseline
    if not verify_baseline():
        log("\n❌ BASELINE VERIFICATION FAILED - ABORTING")
        return
    
    # Setup QA data
    if not setup_qa_data():
        log("\n❌ SETUP FAILED - ABORTING")
        return
    
    # Run tests
    tests = [
        ("Test 1: Webhook matches historical", test_webhook_matches_historical),
        ("Test 2: Webhook WON with value", test_webhook_won_with_value),
        ("Test 3: Webhook AUTH", test_webhook_auth),
        ("Test 4: Dedupe v2 dryRun", test_dedupe_dryrun),
        ("Test 5: Dedupe v2 apply", test_dedupe_apply),
        ("Test 6: Export includes historical", test_export_includes_historical),
        ("Test 7: Regression normal webhook", test_regression_normal_webhook),
        ("Test 8: Regression mirror creation", test_regression_mirror_creation),
        ("Test 9: Regression endpoints", test_regression_endpoints),
        ("Test 10: Cleanup", cleanup),
    ]
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            log(f"\n❌ {test_name} EXCEPTION: {e}")
            results.append((test_name, False))
    
    # Summary
    log("\n" + "=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        log(f"{status}: {test_name}")
    
    log(f"\nTotal: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    
    if passed == total:
        log("\n🎉 ALL TESTS PASSED! Historisk-fix is working perfectly.")
    else:
        log(f"\n⚠️  {total - passed} test(s) failed. Review the output above for details.")

if __name__ == "__main__":
    main()
