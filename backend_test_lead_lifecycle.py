#!/usr/bin/env python3
"""
Lead Lifecycle Testing: Archive (soft delete), Permanent Delete, Re-send to CRM + deleted-filter
Test the NEW lead lifecycle endpoints in Next.js app.

CRITICAL SAFETY RULES:
- Do NOT modify EXISTING leads/imported_leads — only QA docs
- Do NOT call POST /api/leads (sends real emails)
- Do NOT call newsletter endpoints
- Resend endpoint forwards to platform PREVIEW environment (acceptable)
- MANDATORY CLEANUP at end + verify baseline counts restored (44/19, 0 deleted)
"""

import requests
import json
import sys
from pymongo import MongoClient

# Configuration
BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# MongoDB client
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Test results
test_results = []

def log_test(step, passed, message):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status} - Step {step}: {message}"
    print(result)
    test_results.append({"step": step, "passed": passed, "message": message})
    return passed

def verify_baseline():
    """Verify baseline counts"""
    print("\n=== VERIFYING BASELINE ===")
    imported_count = db.imported_leads.count_documents({})
    leads_count = db.leads.count_documents({})
    mirrored_count = db.leads.count_documents({"mirrored": True})
    deleted_leads = db.leads.count_documents({"deleted": True})
    deleted_imported = db.imported_leads.count_documents({"deleted": True})
    
    print(f"imported_leads: {imported_count} (expected 44)")
    print(f"leads: {leads_count} (expected 19)")
    print(f"mirrored: {mirrored_count} (expected 0)")
    print(f"deleted leads: {deleted_leads} (expected 0)")
    print(f"deleted imported: {deleted_imported} (expected 0)")
    
    baseline_ok = (
        imported_count == 44 and 
        leads_count == 19 and 
        mirrored_count == 0 and 
        deleted_leads == 0 and 
        deleted_imported == 0
    )
    
    if not baseline_ok:
        print("❌ BASELINE VERIFICATION FAILED!")
        return False
    
    print("✅ BASELINE VERIFIED")
    return True

def setup_test_data():
    """Insert test documents directly via MongoDB"""
    print("\n=== SETTING UP TEST DATA ===")
    
    # 1. Regular lead
    lead_doc = {
        "id": "qa-lc-1",
        "name": "QA Livssyklus",
        "email": "qa-lc1@example.test",
        "status": "new",
        "statusHistory": [],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "forwarded": True,
        "lead_type": "huseier"
    }
    db.leads.insert_one(lead_doc)
    print("✅ Inserted regular lead: qa-lc-1")
    
    # 2. Mirror lead
    mirror_doc = {
        "id": "qa-lc-mirror",
        "mirrored": True,
        "origin": "platform",
        "platform_id": "qa-lc-mirror",
        "email": "qa-lc-mirror@example.test",
        "status": "new",
        "createdAt": "2026-07-10T12:00:00.000Z",
        "forwarded": True
    }
    db.leads.insert_one(mirror_doc)
    print("✅ Inserted mirror lead: qa-lc-mirror")
    
    # 3. Imported lead
    imported_doc = {
        "id": "qa-lc-imp",
        "platform_id": "qa-lc-imp-plat",
        "email": "qa-lc-imp@example.test",
        "name": "QA Livssyklus Historisk",
        "status": "contacted",
        "lead_type": "huseier",
        "created_at": "2026-07-10T12:00:00.000Z",
        "pre_tracking": True,
        "imported": True,
        "channel": "unknown"
    }
    db.imported_leads.insert_one(imported_doc)
    print("✅ Inserted imported lead: qa-lc-imp")
    
    return True

def test_archive_soft_delete():
    """Test 1: Archive (soft delete) regular lead"""
    print("\n=== TEST 1: ARCHIVE (SOFT DELETE) ===")
    
    # Archive the lead
    url = f"{BASE_URL}/admin/leads/archive?key={ADMIN_KEY}"
    payload = {
        "id": "qa-lc-1",
        "type": "lead",
        "reason": "QA-test"
    }
    
    try:
        resp = requests.post(url, json=payload, timeout=30)
        
        if resp.status_code != 200:
            return log_test("1a", False, f"Archive failed with status {resp.status_code}: {resp.text}")
        
        data = resp.json()
        if not data.get("ok") or not data.get("deleted"):
            return log_test("1a", False, f"Archive response incorrect: {data}")
        
        log_test("1a", True, "Archive endpoint returned 200 {ok:true, deleted:true}")
        
        # Verify in MongoDB
        doc = db.leads.find_one({"id": "qa-lc-1"})
        if not doc:
            return log_test("1b", False, "Lead not found in MongoDB after archive")
        
        if doc.get("deleted") != True:
            return log_test("1b", False, f"Lead deleted field is {doc.get('deleted')}, expected True")
        
        if not doc.get("deletedAt"):
            return log_test("1b", False, "Lead deletedAt field not set")
        
        if doc.get("deleteReason") != "QA-test":
            return log_test("1b", False, f"Lead deleteReason is {doc.get('deleteReason')}, expected 'QA-test'")
        
        log_test("1b", True, "MongoDB doc has deleted:true, deletedAt set, deleteReason='QA-test'")
        
        # Verify NOT in GET /admin/leads
        resp = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=30)
        if resp.status_code != 200:
            return log_test("1c", False, f"GET /admin/leads failed: {resp.status_code}")
        
        data = resp.json()
        leads = data.get("leads", [])
        if any(l.get("id") == "qa-lc-1" for l in leads):
            return log_test("1c", False, "Archived lead 'qa-lc-1' still appears in GET /admin/leads")
        
        log_test("1c", True, "Archived lead NOT present in GET /admin/leads")
        
        # Verify NOT in export CSV
        resp = requests.get(f"{BASE_URL}/admin/leads/export?type=lead&key={ADMIN_KEY}", timeout=30)
        if resp.status_code != 200:
            return log_test("1d", False, f"Export failed: {resp.status_code}")
        
        csv_text = resp.text
        if "qa-lc1@example.test" in csv_text:
            return log_test("1d", False, "Archived lead email found in export CSV")
        
        log_test("1d", True, "Archived lead NOT in export CSV")
        
        return True
        
    except Exception as e:
        return log_test("1", False, f"Exception: {str(e)}")

def test_restore():
    """Test 2: Restore archived lead"""
    print("\n=== TEST 2: RESTORE ===")
    
    url = f"{BASE_URL}/admin/leads/archive?key={ADMIN_KEY}"
    payload = {
        "id": "qa-lc-1",
        "type": "lead",
        "undo": True
    }
    
    try:
        resp = requests.post(url, json=payload, timeout=30)
        
        if resp.status_code != 200:
            return log_test("2a", False, f"Restore failed with status {resp.status_code}")
        
        data = resp.json()
        if not data.get("ok") or data.get("deleted") != False:
            return log_test("2a", False, f"Restore response incorrect: {data}")
        
        log_test("2a", True, "Restore endpoint returned 200 {ok:true, deleted:false}")
        
        # Verify in MongoDB
        doc = db.leads.find_one({"id": "qa-lc-1"})
        if not doc:
            return log_test("2b", False, "Lead not found after restore")
        
        if "deleted" in doc:
            return log_test("2b", False, f"Lead still has deleted field: {doc.get('deleted')}")
        
        if "deletedAt" in doc:
            return log_test("2b", False, "Lead still has deletedAt field")
        
        if "deleteReason" in doc:
            return log_test("2b", False, "Lead still has deleteReason field")
        
        log_test("2b", True, "MongoDB doc has deleted/deletedAt/deleteReason removed")
        
        # Verify appears in GET /admin/leads
        resp = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=30)
        if resp.status_code != 200:
            return log_test("2c", False, f"GET /admin/leads failed: {resp.status_code}")
        
        data = resp.json()
        leads = data.get("leads", [])
        if not any(l.get("id") == "qa-lc-1" for l in leads):
            return log_test("2c", False, "Restored lead 'qa-lc-1' NOT in GET /admin/leads")
        
        log_test("2c", True, "Restored lead appears in GET /admin/leads")
        
        return True
        
    except Exception as e:
        return log_test("2", False, f"Exception: {str(e)}")

def test_archive_imported():
    """Test 3: Archive imported lead"""
    print("\n=== TEST 3: ARCHIVE IMPORTED ===")
    
    # Archive
    url = f"{BASE_URL}/admin/leads/archive?key={ADMIN_KEY}"
    payload = {
        "id": "qa-lc-imp",
        "type": "imported"
    }
    
    try:
        resp = requests.post(url, json=payload, timeout=30)
        
        if resp.status_code != 200:
            return log_test("3a", False, f"Archive imported failed: {resp.status_code}")
        
        data = resp.json()
        if not data.get("ok") or not data.get("deleted"):
            return log_test("3a", False, f"Archive imported response incorrect: {data}")
        
        log_test("3a", True, "Archive imported returned 200 {ok:true, deleted:true}")
        
        # Verify hidden from GET /admin/leads
        resp = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=30)
        if resp.status_code != 200:
            return log_test("3b", False, f"GET /admin/leads failed: {resp.status_code}")
        
        data = resp.json()
        leads = data.get("leads", [])
        if any(l.get("id") == "qa-lc-imp" for l in leads):
            return log_test("3b", False, "Archived imported lead still in GET /admin/leads")
        
        log_test("3b", True, "Archived imported lead hidden from GET /admin/leads")
        
        # Verify NOT in export
        resp = requests.get(f"{BASE_URL}/admin/leads/export?type=lead&key={ADMIN_KEY}", timeout=30)
        if resp.status_code != 200:
            return log_test("3c", False, f"Export failed: {resp.status_code}")
        
        csv_text = resp.text
        if "qa-lc-imp@example.test" in csv_text:
            return log_test("3c", False, "Archived imported lead in export CSV")
        
        log_test("3c", True, "Archived imported lead NOT in export CSV")
        
        # Restore it
        payload["undo"] = True
        resp = requests.post(url, json=payload, timeout=30)
        
        if resp.status_code != 200:
            return log_test("3d", False, f"Restore imported failed: {resp.status_code}")
        
        data = resp.json()
        if not data.get("ok") or data.get("deleted") != False:
            return log_test("3d", False, f"Restore imported response incorrect: {data}")
        
        log_test("3d", True, "Restore imported returned 200 {ok:true, deleted:false}")
        
        return True
        
    except Exception as e:
        return log_test("3", False, f"Exception: {str(e)}")

def test_hard_delete():
    """Test 4: Hard delete validation"""
    print("\n=== TEST 4: HARD DELETE VALIDATION ===")
    
    url = f"{BASE_URL}/admin/leads/delete?key={ADMIN_KEY}"
    
    try:
        # Without confirm
        payload = {
            "id": "qa-lc-imp",
            "type": "imported"
        }
        
        resp = requests.post(url, json=payload, timeout=30)
        
        if resp.status_code != 400:
            return log_test("4a", False, f"Delete without confirm should return 400, got {resp.status_code}")
        
        log_test("4a", True, "Delete without confirm returns 400")
        
        # With confirm
        payload["confirm"] = "SLETT"
        resp = requests.post(url, json=payload, timeout=30)
        
        if resp.status_code != 200:
            return log_test("4b", False, f"Delete with confirm failed: {resp.status_code}")
        
        data = resp.json()
        if not data.get("ok") or not data.get("purged"):
            return log_test("4b", False, f"Delete response incorrect: {data}")
        
        log_test("4b", True, "Delete with confirm='SLETT' returns 200 {ok:true, purged:true}")
        
        # Verify physically gone
        doc = db.imported_leads.find_one({"id": "qa-lc-imp"})
        if doc:
            return log_test("4c", False, "Document still exists after hard delete")
        
        log_test("4c", True, "Document physically removed from imported_leads")
        
        return True
        
    except Exception as e:
        return log_test("4", False, f"Exception: {str(e)}")

def test_resend_happy_path():
    """Test 5: Resend happy path"""
    print("\n=== TEST 5: RESEND HAPPY PATH ===")
    
    url = f"{BASE_URL}/admin/leads/resend?key={ADMIN_KEY}"
    payload = {
        "id": "qa-lc-1",
        "type": "lead"
    }
    
    try:
        resp = requests.post(url, json=payload, timeout=60)
        
        if resp.status_code != 200:
            return log_test("5a", False, f"Resend failed with status {resp.status_code}: {resp.text}")
        
        data = resp.json()
        if not data.get("ok"):
            return log_test("5a", False, f"Resend response ok:false: {data}")
        
        # Check if forwarded successfully or failed (both acceptable)
        forwarded = data.get("forwarded")
        platform_id = data.get("platform_id")
        error = data.get("error")
        
        if forwarded:
            if not platform_id:
                log_test("5a", True, f"Resend returned 200 {{ok:true, forwarded:true}} but no platform_id (platform may have accepted without returning ID)")
            else:
                log_test("5a", True, f"Resend returned 200 {{ok:true, forwarded:true, platform_id:'{platform_id}'}} - platform preview accepted")
        else:
            if error:
                log_test("5a", True, f"Resend returned 200 {{ok:true, forwarded:false, error:'{error}'}} - platform preview down/timeout (acceptable)")
            else:
                return log_test("5a", False, f"Resend returned forwarded:false without error: {data}")
        
        # Verify resend_requested_at set
        doc = db.leads.find_one({"id": "qa-lc-1"})
        if not doc:
            return log_test("5b", False, "Lead not found after resend")
        
        if not doc.get("resend_requested_at"):
            return log_test("5b", False, "Lead resend_requested_at not set")
        
        log_test("5b", True, "Lead doc has resend_requested_at set")
        
        return True
        
    except Exception as e:
        return log_test("5", False, f"Exception: {str(e)}")

def test_resend_mirror_rejection():
    """Test 6: Resend mirror rejection"""
    print("\n=== TEST 6: RESEND MIRROR REJECTION ===")
    
    url = f"{BASE_URL}/admin/leads/resend?key={ADMIN_KEY}"
    payload = {
        "id": "qa-lc-mirror",
        "type": "lead"
    }
    
    try:
        resp = requests.post(url, json=payload, timeout=30)
        
        if resp.status_code != 400:
            return log_test("6", False, f"Resend mirror should return 400, got {resp.status_code}")
        
        data = resp.json()
        error = data.get("error", "").lower()
        
        if "speil" not in error and "crm" not in error:
            return log_test("6", False, f"Error message should mention speil/CRM, got: {data.get('error')}")
        
        log_test("6", True, f"Resend mirror returns 400 with error mentioning speil/CRM: '{data.get('error')}'")
        
        return True
        
    except Exception as e:
        return log_test("6", False, f"Exception: {str(e)}")

def test_resend_missing():
    """Test 7: Resend missing lead"""
    print("\n=== TEST 7: RESEND MISSING ===")
    
    url = f"{BASE_URL}/admin/leads/resend?key={ADMIN_KEY}"
    payload = {
        "id": "finnes-ikke",
        "type": "lead"
    }
    
    try:
        resp = requests.post(url, json=payload, timeout=30)
        
        if resp.status_code != 404:
            return log_test("7", False, f"Resend missing should return 404, got {resp.status_code}")
        
        log_test("7", True, "Resend missing returns 404")
        
        return True
        
    except Exception as e:
        return log_test("7", False, f"Exception: {str(e)}")

def test_auth():
    """Test 8: Authentication"""
    print("\n=== TEST 8: AUTH ===")
    
    endpoints = [
        ("/admin/leads/archive", "POST", {"id": "test"}),
        ("/admin/leads/delete", "POST", {"id": "test"}),
        ("/admin/leads/resend", "POST", {"id": "test"})
    ]
    
    all_passed = True
    
    for path, method, payload in endpoints:
        url = f"{BASE_URL}{path}"
        
        try:
            if method == "POST":
                resp = requests.post(url, json=payload, timeout=30)
            else:
                resp = requests.get(url, timeout=30)
            
            if resp.status_code != 401:
                log_test(f"8-{path}", False, f"{path} without key should return 401, got {resp.status_code}")
                all_passed = False
            else:
                log_test(f"8-{path}", True, f"{path} without key returns 401")
        
        except Exception as e:
            log_test(f"8-{path}", False, f"Exception: {str(e)}")
            all_passed = False
    
    return all_passed

def test_regression():
    """Test 9: Regression"""
    print("\n=== TEST 9: REGRESSION ===")
    
    try:
        # GET /api/
        resp = requests.get(f"{BASE_URL}/", timeout=30)
        if resp.status_code != 200:
            return log_test("9a", False, f"GET /api/ failed: {resp.status_code}")
        log_test("9a", True, "GET /api/ returns 200")
        
        # GET /api/admin/leads
        resp = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=30)
        if resp.status_code != 200:
            return log_test("9b", False, f"GET /admin/leads failed: {resp.status_code}")
        
        data = resp.json()
        if "leads" not in data or "tenants" not in data:
            return log_test("9b", False, f"GET /admin/leads missing leads/tenants arrays")
        
        log_test("9b", True, "GET /admin/leads returns 200 with leads+tenants arrays")
        
        # GET /api/admin/leads/export
        resp = requests.get(f"{BASE_URL}/admin/leads/export?type=lead&key={ADMIN_KEY}", timeout=30)
        if resp.status_code != 200:
            return log_test("9c", False, f"GET /admin/leads/export failed: {resp.status_code}")
        
        csv_text = resp.text
        if "historisk" not in csv_text.lower():
            return log_test("9c", False, "Export CSV missing 'historisk' column")
        
        log_test("9c", True, "GET /admin/leads/export returns 200 CSV with historisk column")
        
        return True
        
    except Exception as e:
        return log_test("9", False, f"Exception: {str(e)}")

def cleanup():
    """Test 10: Cleanup (MANDATORY)"""
    print("\n=== TEST 10: CLEANUP (MANDATORY) ===")
    
    try:
        # Delete qa-lc-1 from leads
        result = db.leads.delete_one({"id": "qa-lc-1"})
        if result.deleted_count != 1:
            log_test("10a", False, f"Failed to delete qa-lc-1 from leads (deleted {result.deleted_count})")
        else:
            log_test("10a", True, "Deleted qa-lc-1 from leads")
        
        # Delete qa-lc-mirror from leads
        result = db.leads.delete_one({"id": "qa-lc-mirror"})
        if result.deleted_count != 1:
            log_test("10b", False, f"Failed to delete qa-lc-mirror from leads (deleted {result.deleted_count})")
        else:
            log_test("10b", True, "Deleted qa-lc-mirror from leads")
        
        # qa-lc-imp already purged in step 4
        log_test("10c", True, "qa-lc-imp already purged in step 4")
        
        # Verify baseline restored
        imported_count = db.imported_leads.count_documents({})
        leads_count = db.leads.count_documents({})
        deleted_leads = db.leads.count_documents({"deleted": True})
        deleted_imported = db.imported_leads.count_documents({"deleted": True})
        
        print(f"\nFinal counts:")
        print(f"  imported_leads: {imported_count} (expected 44)")
        print(f"  leads: {leads_count} (expected 19)")
        print(f"  deleted leads: {deleted_leads} (expected 0)")
        print(f"  deleted imported: {deleted_imported} (expected 0)")
        
        if imported_count != 44:
            return log_test("10d", False, f"imported_leads count is {imported_count}, expected 44")
        
        if leads_count != 19:
            return log_test("10d", False, f"leads count is {leads_count}, expected 19")
        
        if deleted_leads != 0:
            return log_test("10d", False, f"Found {deleted_leads} deleted leads, expected 0")
        
        if deleted_imported != 0:
            return log_test("10d", False, f"Found {deleted_imported} deleted imported, expected 0")
        
        log_test("10d", True, "Baseline counts restored: leads=19, imported_leads=44, 0 deleted")
        
        return True
        
    except Exception as e:
        return log_test("10", False, f"Exception: {str(e)}")

def main():
    """Main test execution"""
    print("=" * 80)
    print("LEAD LIFECYCLE TESTING")
    print("Testing: Archive (soft delete), Permanent Delete, Re-send to CRM + deleted-filter")
    print("=" * 80)
    
    # Verify baseline
    if not verify_baseline():
        print("\n❌ BASELINE VERIFICATION FAILED - ABORTING")
        sys.exit(1)
    
    # Setup test data
    if not setup_test_data():
        print("\n❌ SETUP FAILED - ABORTING")
        sys.exit(1)
    
    # Run tests
    all_passed = True
    
    all_passed &= test_archive_soft_delete()
    all_passed &= test_restore()
    all_passed &= test_archive_imported()
    all_passed &= test_hard_delete()
    all_passed &= test_resend_happy_path()
    all_passed &= test_resend_mirror_rejection()
    all_passed &= test_resend_missing()
    all_passed &= test_auth()
    all_passed &= test_regression()
    all_passed &= cleanup()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed_count = sum(1 for r in test_results if r["passed"])
    total_count = len(test_results)
    
    print(f"\nTotal: {passed_count}/{total_count} tests passed")
    
    if all_passed:
        print("\n✅ ALL TESTS PASSED - Lead lifecycle endpoints working perfectly!")
    else:
        print("\n❌ SOME TESTS FAILED - See details above")
        sys.exit(1)

if __name__ == "__main__":
    main()
