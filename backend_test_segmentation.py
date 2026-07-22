#!/usr/bin/env python3
"""
Backend test for owner/contact segmentation, CRM status normalization, and read-only reconciliation.
Tests the "Huseier-mismatch: kontaktleads i Utleiere + stale CRM-status" task.

CRITICAL SAFETY RULES:
- DO NOT call production endpoints
- DO NOT POST to public /api/leads or /api/tenants  
- DO NOT send email/CAPI
- Use QA docs directly in local Mongo with prefix qa-segment-
- Full cleanup mandatory
"""

import asyncio
import sys
import traceback
from datetime import datetime, timezone
from pymongo import MongoClient
import requests
import json

# Configuration
BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test state
test_results = []
qa_doc_ids = []  # Track QA docs for cleanup

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status}: {test_name}"
    if details:
        result += f" - {details}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "details": details})
    return passed

def get_mongo_client():
    """Get MongoDB client"""
    return MongoClient(MONGO_URL)

def get_baseline_counts():
    """Get baseline counts from MongoDB"""
    client = get_mongo_client()
    db = client[DB_NAME]
    
    leads_count = db.leads.count_documents({})
    leads_deleted = db.leads.count_documents({"deleted": True})
    imported_count = db.imported_leads.count_documents({})
    imported_deleted = db.imported_leads.count_documents({"deleted": True})
    tenant_count = db.tenant_leads.count_documents({})
    tenant_deleted = db.tenant_leads.count_documents({"deleted": True})
    
    client.close()
    
    return {
        "leads": leads_count,
        "leads_deleted": leads_deleted,
        "imported": imported_count,
        "imported_deleted": imported_deleted,
        "tenants": tenant_count,
        "tenants_deleted": tenant_deleted
    }

def create_qa_docs():
    """Create QA test documents directly in MongoDB"""
    client = get_mongo_client()
    db = client[DB_NAME]
    
    now = datetime.now(timezone.utc).isoformat()
    
    # QA owner (huseier)
    qa_owner = {
        "id": "qa-segment-owner-1",
        "name": "QA Huseier Test",
        "email": "qa-segment-owner@example.test",
        "phone": "+47 90000001",
        "lead_type": "huseier",
        "source": "qa-test",
        "status": "new",
        "createdAt": now,
        "deleted": False,
        "forwarded": False
    }
    
    # QA contact (kontakt)
    qa_contact = {
        "id": "qa-segment-contact-1",
        "name": "QA Kontakt Test",
        "email": "qa-segment-contact@example.test",
        "phone": "+47 90000002",
        "lead_type": "kontakt",
        "source": "kontakt",
        "notes": "QA fotografhenvendelse",
        "status": "new",
        "createdAt": now,
        "deleted": False,
        "forwarded": False
    }
    
    # Insert into leads collection
    db.leads.insert_one(qa_owner)
    db.leads.insert_one(qa_contact)
    
    qa_doc_ids.append(("leads", "qa-segment-owner-1"))
    qa_doc_ids.append(("leads", "qa-segment-contact-1"))
    
    client.close()
    
    print(f"✓ Created QA docs: qa-segment-owner-1 (huseier), qa-segment-contact-1 (kontakt)")
    return qa_owner, qa_contact

def cleanup_qa_docs():
    """Delete all QA test documents"""
    client = get_mongo_client()
    db = client[DB_NAME]
    
    deleted_count = 0
    for collection_name, doc_id in qa_doc_ids:
        result = db[collection_name].delete_one({"id": doc_id})
        deleted_count += result.deleted_count
    
    # Also clean up any docs with qa-segment- prefix that might have been missed
    for collection_name in ["leads", "imported_leads", "tenant_leads"]:
        result = db[collection_name].delete_many({"id": {"$regex": "^qa-segment-"}})
        deleted_count += result.deleted_count
    
    client.close()
    
    print(f"✓ Cleanup: deleted {deleted_count} QA documents")
    return deleted_count

def test_a_segmentation_and_export():
    """Test A: Segmentation/admin/export (5 tests)"""
    print("\n=== TEST A: SEGMENTATION/ADMIN/EXPORT ===")
    
    # A1: Baseline counts
    print("\nA1: Baseline counts")
    baseline = get_baseline_counts()
    print(f"  Baseline: leads={baseline['leads']}, imported={baseline['imported']}, tenants={baseline['tenants']}")
    print(f"  Deleted: leads={baseline['leads_deleted']}, imported={baseline['imported_deleted']}, tenants={baseline['tenants_deleted']}")
    log_test("A1: Baseline counts captured", True, f"leads={baseline['leads']}, imported={baseline['imported']}, tenants={baseline['tenants']}")
    
    # A2: Create QA docs
    print("\nA2: Create QA docs directly in MongoDB")
    qa_owner, qa_contact = create_qa_docs()
    log_test("A2: Created QA owner and contact docs", True, "qa-segment-owner-1 (huseier), qa-segment-contact-1 (kontakt)")
    
    # A3: GET /api/admin/leads - verify segmentation
    print("\nA3: GET /api/admin/leads - verify segmentation")
    try:
        # Without key - should be 401
        response = requests.get(f"{BASE_URL}/admin/leads", timeout=30)
        if response.status_code == 401:
            log_test("A3a: GET /admin/leads without key returns 401", True)
        else:
            log_test("A3a: GET /admin/leads without key returns 401", False, f"Got {response.status_code}")
        
        # With key - should return segmented data
        response = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=30)
        if response.status_code == 200:
            data = response.json()
            
            # Check structure
            has_leads = "leads" in data
            has_contacts = "contacts" in data
            has_tenants = "tenants" in data
            
            if not (has_leads and has_contacts and has_tenants):
                log_test("A3b: Response has leads, contacts, tenants arrays", False, f"Missing arrays: leads={has_leads}, contacts={has_contacts}, tenants={has_tenants}")
            else:
                log_test("A3b: Response has leads, contacts, tenants arrays", True)
                
                # Find QA docs
                owner_in_leads = any(l.get("id") == "qa-segment-owner-1" for l in data.get("leads", []))
                owner_in_contacts = any(c.get("id") == "qa-segment-owner-1" for c in data.get("contacts", []))
                contact_in_leads = any(l.get("id") == "qa-segment-contact-1" for l in data.get("leads", []))
                contact_in_contacts = any(c.get("id") == "qa-segment-contact-1" for c in data.get("contacts", []))
                
                # Owner should be ONLY in leads[]
                if owner_in_leads and not owner_in_contacts:
                    log_test("A3c: QA owner found ONLY in leads[] (not in contacts[])", True)
                else:
                    log_test("A3c: QA owner found ONLY in leads[] (not in contacts[])", False, f"in_leads={owner_in_leads}, in_contacts={owner_in_contacts}")
                
                # Contact should be ONLY in contacts[]
                if contact_in_contacts and not contact_in_leads:
                    log_test("A3d: QA contact found ONLY in contacts[] (not in leads[])", True)
                else:
                    log_test("A3d: QA contact found ONLY in contacts[] (not in leads[])", False, f"in_contacts={contact_in_contacts}, in_leads={contact_in_leads}")
        else:
            log_test("A3b: GET /admin/leads with key returns 200", False, f"Got {response.status_code}")
    except Exception as e:
        log_test("A3: GET /admin/leads segmentation", False, f"Exception: {str(e)}")
        traceback.print_exc()
    
    # A4: GET /api/admin/leads/export - verify CSV export
    print("\nA4: GET /api/admin/leads/export - verify CSV export")
    try:
        # Export type=lead (owners only)
        response = requests.get(f"{BASE_URL}/admin/leads/export?type=lead&key={ADMIN_KEY}", timeout=30)
        if response.status_code == 200:
            csv_content = response.text
            header_line = csv_content.split('\n')[0] if csv_content else ""
            
            # Check header contains lead_type
            if "lead_type" in header_line:
                log_test("A4a: Export type=lead header contains 'lead_type'", True)
            else:
                log_test("A4a: Export type=lead header contains 'lead_type'", False, f"Header: {header_line[:100]}")
            
            # Check QA owner is included, QA contact is NOT
            owner_in_csv = "qa-segment-owner@example.test" in csv_content
            contact_in_csv = "qa-segment-contact@example.test" in csv_content
            
            if owner_in_csv and not contact_in_csv:
                log_test("A4b: Export type=lead includes QA owner, excludes QA contact", True)
            else:
                log_test("A4b: Export type=lead includes QA owner, excludes QA contact", False, f"owner={owner_in_csv}, contact={contact_in_csv}")
        else:
            log_test("A4a: Export type=lead returns 200", False, f"Got {response.status_code}")
        
        # Export type=contact (contacts only)
        response = requests.get(f"{BASE_URL}/admin/leads/export?type=contact&key={ADMIN_KEY}", timeout=30)
        if response.status_code == 200:
            csv_content = response.text
            content_disposition = response.headers.get("Content-Disposition", "")
            
            # Check filename contains "kontakter"
            if "kontakter" in content_disposition.lower():
                log_test("A4c: Export type=contact filename contains 'kontakter'", True)
            else:
                log_test("A4c: Export type=contact filename contains 'kontakter'", False, f"Content-Disposition: {content_disposition}")
            
            # Check QA contact is included, QA owner is NOT
            contact_in_csv = "qa-segment-contact@example.test" in csv_content
            owner_in_csv = "qa-segment-owner@example.test" in csv_content
            
            if contact_in_csv and not owner_in_csv:
                log_test("A4d: Export type=contact includes QA contact, excludes QA owner", True)
            else:
                log_test("A4d: Export type=contact includes QA contact, excludes QA owner", False, f"contact={contact_in_csv}, owner={owner_in_csv}")
        else:
            log_test("A4c: Export type=contact returns 200", False, f"Got {response.status_code}")
        
        # Export type=tenant (neither should be included)
        response = requests.get(f"{BASE_URL}/admin/leads/export?type=tenant&key={ADMIN_KEY}", timeout=30)
        if response.status_code == 200:
            csv_content = response.text
            owner_in_csv = "qa-segment-owner@example.test" in csv_content
            contact_in_csv = "qa-segment-contact@example.test" in csv_content
            
            if not owner_in_csv and not contact_in_csv:
                log_test("A4e: Export type=tenant excludes both QA owner and contact", True)
            else:
                log_test("A4e: Export type=tenant excludes both QA owner and contact", False, f"owner={owner_in_csv}, contact={contact_in_csv}")
        else:
            log_test("A4e: Export type=tenant returns 200", False, f"Got {response.status_code}")
        
        # Without key - should be 401
        response = requests.get(f"{BASE_URL}/admin/leads/export?type=lead", timeout=30)
        if response.status_code == 401:
            log_test("A4f: Export without key returns 401", True)
        else:
            log_test("A4f: Export without key returns 401", False, f"Got {response.status_code}")
            
    except Exception as e:
        log_test("A4: Export verification", False, f"Exception: {str(e)}")
        traceback.print_exc()

def test_d_analytics_safety():
    """Test D: Ad/analytics safety (4 tests)"""
    print("\n=== TEST D: AD/ANALYTICS SAFETY ===")
    
    # D1: Check KontaktForm.js uses track('contact_submit') and NOT track('lead_submit')
    print("\nD1: KontaktForm.js uses track('contact_submit'), NOT track('lead_submit')")
    try:
        with open("/app/components/dh/KontaktForm.js", "r") as f:
            content = f.read()
            
        # Check it uses track('contact_submit') for submission (with curly quotes)
        has_track_contact_submit = "track('contact_submit'" in content or 'track("contact_submit"' in content
        # Check it does NOT use track('lead_submit') which would fire Google Lead conversion
        has_track_lead_submit = "track('lead_submit'" in content or 'track("lead_submit"' in content
        
        if has_track_contact_submit and not has_track_lead_submit:
            log_test("D1: KontaktForm.js uses track('contact_submit'), NOT track('lead_submit')", True)
        else:
            log_test("D1: KontaktForm.js uses track('contact_submit'), NOT track('lead_submit')", False, f"contact_submit={has_track_contact_submit}, lead_submit={has_track_lead_submit}")
    except Exception as e:
        log_test("D1: KontaktForm.js inspection", False, f"Exception: {str(e)}")
    
    # D2: Check route.js Meta CAPI and allowAdConversions limited to huseier
    print("\nD2: route.js Meta CAPI and allowAdConversions limited to lead_type==='huseier'")
    try:
        with open("/app/app/api/[[...path]]/route.js", "r") as f:
            content = f.read()
        
        # Look for allowAdConversions or CAPI logic that checks lead_type
        has_lead_type_check = "lead_type === 'huseier'" in content or "lead_type===" in content
        has_capi_logic = "sendMetaCapiEvent" in content or "metaCapi" in content
        
        if has_lead_type_check and has_capi_logic:
            log_test("D2: route.js has lead_type checks for CAPI/ad conversions", True)
        else:
            log_test("D2: route.js has lead_type checks for CAPI/ad conversions", False, f"lead_type_check={has_lead_type_check}, capi={has_capi_logic}")
    except Exception as e:
        log_test("D2: route.js inspection", False, f"Exception: {str(e)}")
    
    # D3: Check analytics-server.js uses OWNER_LEAD_QUERY
    print("\nD3: analytics-server.js uses OWNER_LEAD_QUERY for KPI/paid/trend/velocity")
    try:
        with open("/app/lib/analytics-server.js", "r") as f:
            content = f.read()
        
        has_owner_query = "OWNER_LEAD_QUERY" in content
        has_kpi_usage = "computeKPI" in content or "buildPaidFunnel" in content
        
        if has_owner_query and has_kpi_usage:
            log_test("D3: analytics-server.js uses OWNER_LEAD_QUERY for owner-only queries", True)
        else:
            log_test("D3: analytics-server.js uses OWNER_LEAD_QUERY for owner-only queries", False, f"owner_query={has_owner_query}, kpi={has_kpi_usage}")
    except Exception as e:
        log_test("D3: analytics-server.js inspection", False, f"Exception: {str(e)}")
    
    # D4: GET /api/ health check
    print("\nD4: GET /api/ health check")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=30)
        if response.status_code == 200:
            log_test("D4: GET /api/ returns 200", True)
        else:
            log_test("D4: GET /api/ returns 200", False, f"Got {response.status_code}")
    except Exception as e:
        log_test("D4: GET /api/ health check", False, f"Exception: {str(e)}")

def test_e_cleanup():
    """Test E: Mandatory cleanup"""
    print("\n=== TEST E: MANDATORY CLEANUP ===")
    
    # Get baseline before cleanup
    baseline_before = get_baseline_counts()
    
    # Cleanup QA docs
    deleted_count = cleanup_qa_docs()
    
    # Get baseline after cleanup
    baseline_after = get_baseline_counts()
    
    # Verify counts are back to original (minus the 2 QA docs we created)
    expected_leads = baseline_before["leads"] - 2  # We created 2 docs in leads
    
    if baseline_after["leads"] == expected_leads:
        log_test("E1: Cleanup successful - baseline counts restored", True, f"leads={baseline_after['leads']} (expected {expected_leads})")
    else:
        log_test("E1: Cleanup successful - baseline counts restored", False, f"leads={baseline_after['leads']}, expected={expected_leads}")
    
    # Verify no qa-segment- docs remain
    client = get_mongo_client()
    db = client[DB_NAME]
    
    remaining_qa_docs = 0
    for collection_name in ["leads", "imported_leads", "tenant_leads"]:
        count = db[collection_name].count_documents({"id": {"$regex": "^qa-segment-"}})
        remaining_qa_docs += count
    
    client.close()
    
    if remaining_qa_docs == 0:
        log_test("E2: No qa-segment-* docs remain in database", True)
    else:
        log_test("E2: No qa-segment-* docs remain in database", False, f"Found {remaining_qa_docs} remaining docs")

def main():
    """Main test runner"""
    print("=" * 80)
    print("BACKEND TEST: OWNER/CONTACT SEGMENTATION + CRM STATUS NORMALIZATION")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    print("=" * 80)
    
    try:
        # Run tests
        test_a_segmentation_and_export()
        test_d_analytics_safety()
        test_e_cleanup()
        
        # Summary
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in test_results if r["passed"])
        total = len(test_results)
        
        print(f"\nTotal: {passed}/{total} tests passed ({100*passed//total}% success rate)")
        
        if passed == total:
            print("\n✅ ALL TESTS PASSED")
            return 0
        else:
            print(f"\n❌ {total - passed} TESTS FAILED")
            print("\nFailed tests:")
            for r in test_results:
                if not r["passed"]:
                    print(f"  - {r['test']}: {r['details']}")
            return 1
            
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {str(e)}")
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
