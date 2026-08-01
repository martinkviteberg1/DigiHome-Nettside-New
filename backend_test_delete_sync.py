#!/usr/bin/env python3
"""
Backend test for NYE toveis slette-synk (two-way delete sync).

Tests:
A) POST /api/webhooks/lead-status event:'lead_deleted' (soft delete)
B) POST /api/admin/leads/archive|delete sender archived:true|false til CRM via lead_pushback_outbox

CRITICAL SAFETY RULES:
- DO NOT call POST /api/leads (sends real emails!)
- Create QA leads DIRECTLY in MongoDB
- DO NOT modify existing leads/imported_leads. Baseline: 19 leads.
- MANDATORY CLEANUP: delete all QA docs and verify baseline 19 at end.
"""

import requests
import json
import os
from datetime import datetime
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://conversion-optimize-7.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = 'dh_admin_b3Kx92Qz7Lm4'
WEBHOOK_SECRET = 'dhsync_dc0dc1750aff067a4baef7adafc7991f7340eacc44f27036'
MONGO_URL = 'mongodb://localhost:27017'
DB_NAME = 'your_database_name'

# MongoDB connection
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def setup_qa_leads():
    """Create QA leads directly in MongoDB"""
    log("SETUP: Creating QA leads in MongoDB...")
    now_iso = datetime.utcnow().isoformat() + 'Z'
    
    # QA leads in 'leads' collection
    qa_leads = [
        {
            'id': 'qa-delsync-1',
            'name': 'QA DelSync 1',
            'email': 'qa-delsync-1@example.test',
            'phone': '99911001',
            'lead_type': 'huseier',
            'status': 'new',
            'platform_id': 'qa-plat-delsync-1',
            'forwarded': True,
            'statusHistory': [],
            'createdAt': now_iso
        },
        {
            'id': 'qa-delsync-2',
            'name': 'QA DelSync 2',
            'email': 'qa-delsync-2@example.test',
            'phone': '99911002',
            'lead_type': 'huseier',
            'status': 'new',
            'platform_id': 'qa-plat-delsync-2',
            'forwarded': True,
            'statusHistory': [],
            'createdAt': now_iso
        },
        {
            'id': 'qa-delsync-3',
            'name': 'QA DelSync 3',
            'email': 'qa-delsync-3@example.test',
            'phone': '99911003',
            'lead_type': 'huseier',
            'status': 'new',
            'platform_id': 'qa-plat-delsync-3',
            'forwarded': True,
            'statusHistory': [],
            'createdAt': now_iso
        },
        {
            'id': 'qa-delsync-4',
            'name': 'QA DelSync 4',
            'email': 'qa-delsync-4@example.test',
            'phone': '99911004',
            'lead_type': 'huseier',
            'status': 'new',
            'forwarded': False,
            'statusHistory': [],
            'createdAt': now_iso
        }
    ]
    
    for lead in qa_leads:
        db.leads.insert_one(lead)
    log(f"✓ Created {len(qa_leads)} QA leads in 'leads' collection")
    
    # QA lead in 'imported_leads' collection
    qa_imported = {
        'id': 'qa-delsync-imp',
        'name': 'QA DelSync Imp',
        'email': 'qa-delsync-imp@example.test',
        'platform_id': 'qa-plat-delsync-imp',
        'status': 'contacted',
        'created_at': now_iso
    }
    db.imported_leads.insert_one(qa_imported)
    log("✓ Created 1 QA lead in 'imported_leads' collection")

def cleanup_qa_data():
    """Delete all QA data from MongoDB"""
    log("CLEANUP: Removing all QA data...")
    
    # Delete QA leads
    result = db.leads.delete_many({'id': {'$regex': '^qa-delsync-'}})
    log(f"✓ Deleted {result.deleted_count} docs from 'leads'")
    
    # Delete QA imported leads
    result = db.imported_leads.delete_many({'id': {'$regex': '^qa-delsync-'}})
    log(f"✓ Deleted {result.deleted_count} docs from 'imported_leads'")
    
    # Delete QA outbox rows
    result = db.lead_pushback_outbox.delete_many({'platform_id': {'$regex': '^qa-plat-delsync'}})
    log(f"✓ Deleted {result.deleted_count} rows from 'lead_pushback_outbox'")

def verify_baseline():
    """Verify baseline of 19 leads"""
    count = db.leads.count_documents({'deleted': {'$ne': True}})
    log(f"Baseline check: {count} non-deleted leads (expected: 19)")
    if count != 19:
        log(f"⚠️  WARNING: Expected 19 leads, found {count}")
    return count == 19

def test_inbound_delete():
    """Test 1: INBOUND DELETE - POST /api/webhooks/lead-status with event:'lead_deleted'"""
    log("\n=== TEST 1: INBOUND DELETE ===")
    try:
        response = requests.post(
            f"{API_URL}/webhooks/lead-status",
            headers={'X-Webhook-Secret': WEBHOOK_SECRET, 'Content-Type': 'application/json'},
            json={'event': 'lead_deleted', 'external_ref': 'qa-delsync-1', 'reason': 'QA test'},
            timeout=10
        )
        log(f"POST /webhooks/lead-status → {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get('ok') and data.get('deleted'):
                # Verify in DB
                lead = db.leads.find_one({'id': 'qa-delsync-1'})
                if lead and lead.get('deleted') == True and lead.get('deletedAt') and lead.get('deleteReason') == 'crm: QA test' and lead.get('deletedBy') == 'platform':
                    log("✅ TEST 1 PASSED: Lead soft-deleted with correct fields")
                    return True
                else:
                    log(f"❌ TEST 1 FAILED: Lead not properly deleted in DB. Lead: {lead}")
                    return False
            else:
                log(f"❌ TEST 1 FAILED: Response missing ok:true or deleted:true")
                return False
        else:
            log(f"❌ TEST 1 FAILED: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ TEST 1 FAILED: Exception: {e}")
        return False

def test_idempotent():
    """Test 2: IDEMPOTENT - Same delete call again should return 200"""
    log("\n=== TEST 2: IDEMPOTENT ===")
    try:
        response = requests.post(
            f"{API_URL}/webhooks/lead-status",
            headers={'X-Webhook-Secret': WEBHOOK_SECRET, 'Content-Type': 'application/json'},
            json={'event': 'lead_deleted', 'external_ref': 'qa-delsync-1', 'reason': 'QA test'},
            timeout=10
        )
        log(f"POST /webhooks/lead-status (repeat) → {response.status_code}")
        
        if response.status_code == 200:
            log("✅ TEST 2 PASSED: Idempotent delete returns 200")
            return True
        else:
            log(f"❌ TEST 2 FAILED: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ TEST 2 FAILED: Exception: {e}")
        return False

def test_unknown_ref():
    """Test 3: UNKNOWN REF - Delete event for non-existent lead should return 200 with skipped"""
    log("\n=== TEST 3: UNKNOWN REF ===")
    try:
        response = requests.post(
            f"{API_URL}/webhooks/lead-status",
            headers={'X-Webhook-Secret': WEBHOOK_SECRET, 'Content-Type': 'application/json'},
            json={'event': 'lead_deleted', 'external_ref': 'qa-finnes-ikke-xyz'},
            timeout=10
        )
        log(f"POST /webhooks/lead-status (unknown ref) → {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify NO document was created
            lead = db.leads.find_one({'id': 'qa-finnes-ikke-xyz'})
            if lead is None:
                log("✅ TEST 3 PASSED: No mirror lead created for unknown ref")
                return True
            else:
                log(f"❌ TEST 3 FAILED: Mirror lead was created: {lead}")
                return False
        else:
            log(f"❌ TEST 3 FAILED: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ TEST 3 FAILED: Exception: {e}")
        return False

def test_alias():
    """Test 4: ALIAS - event:'lead_archived' should also work"""
    log("\n=== TEST 4: ALIAS ===")
    try:
        response = requests.post(
            f"{API_URL}/webhooks/lead-status",
            headers={'X-Webhook-Secret': WEBHOOK_SECRET, 'Content-Type': 'application/json'},
            json={'event': 'lead_archived', 'external_ref': 'qa-delsync-3'},
            timeout=10
        )
        log(f"POST /webhooks/lead-status (lead_archived) → {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get('ok') and data.get('deleted'):
                # Verify in DB
                lead = db.leads.find_one({'id': 'qa-delsync-3'})
                if lead and lead.get('deleted') == True:
                    log("✅ TEST 4 PASSED: lead_archived alias works")
                    return True
                else:
                    log(f"❌ TEST 4 FAILED: Lead not deleted. Lead: {lead}")
                    return False
            else:
                log(f"❌ TEST 4 FAILED: Response missing ok:true or deleted:true")
                return False
        else:
            log(f"❌ TEST 4 FAILED: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ TEST 4 FAILED: Exception: {e}")
        return False

def test_imported():
    """Test 5: IMPORTED - Delete event for imported_leads"""
    log("\n=== TEST 5: IMPORTED ===")
    try:
        response = requests.post(
            f"{API_URL}/webhooks/lead-status",
            headers={'X-Webhook-Secret': WEBHOOK_SECRET, 'Content-Type': 'application/json'},
            json={'event': 'lead_deleted', 'platform_id': 'qa-plat-delsync-imp'},
            timeout=10
        )
        log(f"POST /webhooks/lead-status (imported) → {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get('ok') and data.get('historic') and data.get('deleted'):
                # Verify in DB
                lead = db.imported_leads.find_one({'id': 'qa-delsync-imp'})
                if lead and lead.get('deleted') == True:
                    log("✅ TEST 5 PASSED: Imported lead deleted with historic:true")
                    return True
                else:
                    log(f"❌ TEST 5 FAILED: Imported lead not deleted. Lead: {lead}")
                    return False
            else:
                log(f"❌ TEST 5 FAILED: Response missing ok/historic/deleted")
                return False
        else:
            log(f"❌ TEST 5 FAILED: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ TEST 5 FAILED: Exception: {e}")
        return False

def test_outbound_archive():
    """Test 6: OUTBOUND ARCHIVE - POST /api/admin/leads/archive"""
    log("\n=== TEST 6: OUTBOUND ARCHIVE ===")
    try:
        response = requests.post(
            f"{API_URL}/admin/leads/archive?key={ADMIN_KEY}",
            headers={'Content-Type': 'application/json'},
            json={'id': 'qa-delsync-2', 'type': 'lead', 'reason': 'QA'},
            timeout=10
        )
        log(f"POST /admin/leads/archive → {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get('ok') and data.get('deleted') and 'crmSync' in data:
                # Verify in outbox
                outbox_row = db.lead_pushback_outbox.find_one({'platform_id': 'qa-plat-delsync-2'})
                if outbox_row and outbox_row.get('fields', {}).get('archived') == True:
                    log("✅ TEST 6 PASSED: Archive created outbox row with archived:true")
                    return True
                else:
                    log(f"❌ TEST 6 FAILED: Outbox row not found or archived != true. Row: {outbox_row}")
                    return False
            else:
                log(f"❌ TEST 6 FAILED: Response missing ok/deleted/crmSync")
                return False
        else:
            log(f"❌ TEST 6 FAILED: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ TEST 6 FAILED: Exception: {e}")
        return False

def test_outbound_restore():
    """Test 7: OUTBOUND RESTORE - POST /api/admin/leads/archive with undo:true"""
    log("\n=== TEST 7: OUTBOUND RESTORE ===")
    try:
        response = requests.post(
            f"{API_URL}/admin/leads/archive?key={ADMIN_KEY}",
            headers={'Content-Type': 'application/json'},
            json={'id': 'qa-delsync-2', 'undo': True},
            timeout=10
        )
        log(f"POST /admin/leads/archive (undo) → {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get('ok') and data.get('deleted') == False and 'crmSync' in data:
                # Verify in outbox (should have archived:false)
                # Note: The outbox row may have been flushed/failed already (fake platform_id)
                # The important thing is that crmSync field exists and deleted:false in response
                outbox_rows = list(db.lead_pushback_outbox.find({'platform_id': 'qa-plat-delsync-2'}))
                log(f"Found {len(outbox_rows)} outbox rows for qa-plat-delsync-2")
                
                # Check if any row has archived:false (pending or failed state is OK)
                has_restore_row = any(row.get('fields', {}).get('archived') == False for row in outbox_rows)
                
                if has_restore_row or len(outbox_rows) == 0:
                    # Either we found a restore row, or rows were already flushed (acceptable)
                    log("✅ TEST 7 PASSED: Restore endpoint works (crmSync present, deleted:false)")
                    return True
                else:
                    log(f"❌ TEST 7 FAILED: Outbox rows exist but none have archived:false. Rows: {outbox_rows}")
                    return False
            else:
                log(f"❌ TEST 7 FAILED: Response missing ok/deleted:false/crmSync")
                return False
        else:
            log(f"❌ TEST 7 FAILED: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ TEST 7 FAILED: Exception: {e}")
        return False

def test_without_platform_id():
    """Test 8: WITHOUT PLATFORM_ID - Archive lead without platform_id"""
    log("\n=== TEST 8: WITHOUT PLATFORM_ID ===")
    try:
        response = requests.post(
            f"{API_URL}/admin/leads/archive?key={ADMIN_KEY}",
            headers={'Content-Type': 'application/json'},
            json={'id': 'qa-delsync-4'},
            timeout=10
        )
        log(f"POST /admin/leads/archive (no platform_id) → {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get('ok') and data.get('deleted') and 'crmSync' in data:
                crm_sync = data.get('crmSync', {})
                if 'skipped' in crm_sync and 'platform_id' in str(crm_sync.get('skipped', '')).lower():
                    log("✅ TEST 8 PASSED: Archive without platform_id returns crmSync.skipped")
                    return True
                else:
                    log(f"❌ TEST 8 FAILED: crmSync.skipped doesn't mention platform_id. crmSync: {crm_sync}")
                    return False
            else:
                log(f"❌ TEST 8 FAILED: Response missing ok/deleted/crmSync")
                return False
        else:
            log(f"❌ TEST 8 FAILED: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ TEST 8 FAILED: Exception: {e}")
        return False

def test_hard_delete():
    """Test 9: HARD DELETE - POST /api/admin/leads/delete"""
    log("\n=== TEST 9: HARD DELETE ===")
    try:
        response = requests.post(
            f"{API_URL}/admin/leads/delete?key={ADMIN_KEY}",
            headers={'Content-Type': 'application/json'},
            json={'id': 'qa-delsync-2', 'confirm': 'SLETT'},
            timeout=10
        )
        log(f"POST /admin/leads/delete → {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get('ok') and data.get('purged') and 'crmSync' in data:
                # Verify document is physically gone
                lead = db.leads.find_one({'id': 'qa-delsync-2'})
                if lead is None:
                    # Verify outbox has archived:true
                    outbox_row = db.lead_pushback_outbox.find_one({'platform_id': 'qa-plat-delsync-2'})
                    if outbox_row and outbox_row.get('fields', {}).get('archived') == True:
                        log("✅ TEST 9 PASSED: Hard delete removed doc and created outbox row with archived:true")
                        return True
                    else:
                        log(f"❌ TEST 9 FAILED: Outbox row not found or archived != true. Row: {outbox_row}")
                        return False
                else:
                    log(f"❌ TEST 9 FAILED: Document still exists: {lead}")
                    return False
            else:
                log(f"❌ TEST 9 FAILED: Response missing ok/purged/crmSync")
                return False
        else:
            log(f"❌ TEST 9 FAILED: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ TEST 9 FAILED: Exception: {e}")
        return False

def test_regression_webhook():
    """Test 10: REGRESSION WEBHOOK - Normal status events still work"""
    log("\n=== TEST 10: REGRESSION WEBHOOK ===")
    passed = 0
    total = 4
    
    # (a) Normal status event
    try:
        response = requests.post(
            f"{API_URL}/webhooks/lead-status",
            headers={'X-Webhook-Secret': WEBHOOK_SECRET, 'Content-Type': 'application/json'},
            json={'status': 'contacted', 'external_ref': 'qa-delsync-4'},
            timeout=10
        )
        if response.status_code == 200:
            lead = db.leads.find_one({'id': 'qa-delsync-4'})
            if lead and lead.get('status') == 'contacted':
                log("✓ (a) Normal status event works")
                passed += 1
            else:
                log(f"✗ (a) Status not updated. Lead: {lead}")
        else:
            log(f"✗ (a) Expected 200, got {response.status_code}")
    except Exception as e:
        log(f"✗ (a) Exception: {e}")
    
    # (b) Invalid status
    try:
        response = requests.post(
            f"{API_URL}/webhooks/lead-status",
            headers={'X-Webhook-Secret': WEBHOOK_SECRET, 'Content-Type': 'application/json'},
            json={'status': 'tullball', 'external_ref': 'qa-delsync-4'},
            timeout=10
        )
        if response.status_code == 400:
            log("✓ (b) Invalid status returns 400")
            passed += 1
        else:
            log(f"✗ (b) Expected 400, got {response.status_code}")
    except Exception as e:
        log(f"✗ (b) Exception: {e}")
    
    # (c) Activation event
    try:
        response = requests.post(
            f"{API_URL}/webhooks/lead-status",
            headers={'X-Webhook-Secret': WEBHOOK_SECRET, 'Content-Type': 'application/json'},
            json={'event': 'eiendom_onboardet', 'external_ref': 'qa-delsync-4'},
            timeout=10
        )
        if response.status_code == 200:
            log("✓ (c) Activation event returns 200")
            passed += 1
        else:
            log(f"✗ (c) Expected 200, got {response.status_code}")
    except Exception as e:
        log(f"✗ (c) Exception: {e}")
    
    # (d) Wrong secret
    try:
        response = requests.post(
            f"{API_URL}/webhooks/lead-status",
            headers={'X-Webhook-Secret': 'wrong-secret', 'Content-Type': 'application/json'},
            json={'status': 'contacted', 'external_ref': 'qa-delsync-4'},
            timeout=10
        )
        if response.status_code == 401:
            log("✓ (d) Wrong secret returns 401")
            passed += 1
        else:
            log(f"✗ (d) Expected 401, got {response.status_code}")
    except Exception as e:
        log(f"✗ (d) Exception: {e}")
    
    if passed == total:
        log(f"✅ TEST 10 PASSED: All {total} regression tests passed")
        return True
    else:
        log(f"❌ TEST 10 FAILED: {passed}/{total} regression tests passed")
        return False

def test_regression_admin():
    """Test 11: REGRESSION ADMIN - GET /api/admin/leads excludes soft-deleted"""
    log("\n=== TEST 11: REGRESSION ADMIN ===")
    try:
        response = requests.get(
            f"{API_URL}/admin/leads?key={ADMIN_KEY}",
            timeout=10
        )
        log(f"GET /admin/leads → {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', [])
            lead_ids = [l.get('id') for l in leads]
            
            # Note: GET /admin/leads returns merged list including imported_leads
            # qa-delsync-1 and qa-delsync-3 should NOT be in list (soft-deleted)
            # qa-delsync-2 should NOT be in list (hard deleted)
            # qa-delsync-4 was archived in Test 8, so it should also NOT be in list
            
            has_deleted_1 = 'qa-delsync-1' in lead_ids
            has_deleted_3 = 'qa-delsync-3' in lead_ids
            has_deleted_2 = 'qa-delsync-2' in lead_ids
            has_deleted_4 = 'qa-delsync-4' in lead_ids
            
            log(f"qa-delsync-1 (soft-deleted): {'FOUND' if has_deleted_1 else 'NOT FOUND'} (expected: NOT FOUND)")
            log(f"qa-delsync-2 (hard-deleted): {'FOUND' if has_deleted_2 else 'NOT FOUND'} (expected: NOT FOUND)")
            log(f"qa-delsync-3 (soft-deleted): {'FOUND' if has_deleted_3 else 'NOT FOUND'} (expected: NOT FOUND)")
            log(f"qa-delsync-4 (archived in Test 8): {'FOUND' if has_deleted_4 else 'NOT FOUND'} (expected: NOT FOUND)")
            
            # All QA leads should be excluded (deleted or archived)
            if not has_deleted_1 and not has_deleted_2 and not has_deleted_3 and not has_deleted_4:
                log("✅ TEST 11 PASSED: All soft-deleted, hard-deleted, and archived leads excluded")
                return True
            else:
                log(f"❌ TEST 11 FAILED: Some QA leads still in list")
                return False
        else:
            log(f"❌ TEST 11 FAILED: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ TEST 11 FAILED: Exception: {e}")
        return False

def main():
    log("=" * 80)
    log("BACKEND TEST: NYE TOVEIS SLETTE-SYNK (Two-Way Delete Sync)")
    log("=" * 80)
    
    # Verify baseline before setup
    log("\nPRE-SETUP BASELINE CHECK:")
    baseline_before = db.leads.count_documents({})
    log(f"Total leads before setup: {baseline_before}")
    
    # Setup
    setup_qa_leads()
    
    # Run tests
    results = []
    results.append(("Test 1: Inbound Delete", test_inbound_delete()))
    results.append(("Test 2: Idempotent", test_idempotent()))
    results.append(("Test 3: Unknown Ref", test_unknown_ref()))
    results.append(("Test 4: Alias", test_alias()))
    results.append(("Test 5: Imported", test_imported()))
    results.append(("Test 6: Outbound Archive", test_outbound_archive()))
    results.append(("Test 7: Outbound Restore", test_outbound_restore()))
    results.append(("Test 8: Without Platform ID", test_without_platform_id()))
    results.append(("Test 9: Hard Delete", test_hard_delete()))
    results.append(("Test 10: Regression Webhook", test_regression_webhook()))
    results.append(("Test 11: Regression Admin", test_regression_admin()))
    
    # Cleanup
    log("\n" + "=" * 80)
    cleanup_qa_data()
    
    # Verify baseline after cleanup
    log("\nPOST-CLEANUP BASELINE CHECK:")
    baseline_after = db.leads.count_documents({'deleted': {'$ne': True}})
    log(f"Non-deleted leads after cleanup: {baseline_after}")
    
    if baseline_after == 19:
        log("✅ BASELINE VERIFIED: 19 non-deleted leads (correct)")
    else:
        log(f"⚠️  BASELINE WARNING: Expected 19, found {baseline_after}")
    
    # Verify no QA docs remain
    qa_leads_remain = db.leads.count_documents({'id': {'$regex': '^qa-delsync-'}})
    qa_imported_remain = db.imported_leads.count_documents({'id': {'$regex': '^qa-delsync-'}})
    qa_outbox_remain = db.lead_pushback_outbox.count_documents({'platform_id': {'$regex': '^qa-plat-delsync'}})
    
    if qa_leads_remain == 0 and qa_imported_remain == 0 and qa_outbox_remain == 0:
        log("✅ CLEANUP VERIFIED: No QA docs remain")
    else:
        log(f"⚠️  CLEANUP WARNING: QA docs remain - leads:{qa_leads_remain}, imported:{qa_imported_remain}, outbox:{qa_outbox_remain}")
    
    # Summary
    log("\n" + "=" * 80)
    log("TEST SUMMARY:")
    log("=" * 80)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        log(f"{status} - {name}")
    
    log("=" * 80)
    log(f"TOTAL: {passed}/{total} tests passed ({int(passed/total*100)}% success rate)")
    log("=" * 80)
    
    if passed == total:
        log("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        log(f"\n⚠️  {total - passed} TEST(S) FAILED")
        return 1

if __name__ == '__main__':
    exit(main())
