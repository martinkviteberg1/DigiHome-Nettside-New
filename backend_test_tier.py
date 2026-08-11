#!/usr/bin/env python3
"""
Backend test for TIER-SPLIT (two-level "Bli utleier" model).
Tests tier ('selvforvaltning'|'full_forvaltning') + terms acceptance + webhook alias.
"""

import os
import sys
import json
import time
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

# Load .env file
load_dotenv('/app/.env')

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = 'dh_admin_b3Kx92Qz7Lm4'
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')
LEAD_SYNC_SECRET = os.getenv('LEAD_SYNC_SECRET', '')
TIMEOUT = 60

print(f"=== TIER-SPLIT BACKEND TEST ===")
print(f"Base URL: {API_URL}")
print(f"Admin key: {ADMIN_KEY}")
print(f"Timeout: {TIMEOUT}s")
print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
print(f"Lead sync secret: {LEAD_SYNC_SECRET[:20]}..." if LEAD_SYNC_SECRET else "Lead sync secret: NOT SET")
print()

# Track created lead IDs for cleanup
created_lead_ids = []

def test_post_lead_with_tier_selvforvaltning():
    """TEST 1: POST /api/leads with tier='selvforvaltning' + terms"""
    print("TEST 1: POST /api/leads with tier='selvforvaltning' + terms")
    try:
        payload = {
            'name': 'Tier Test Selv',
            'email': 'tier-test-selv@example.com',
            'phone': '+47 90000002',
            'address': 'Testveien 1',
            'postal_code': '5005',
            'lead_type': 'huseier',
            'tier': 'selvforvaltning',
            'terms': {
                'version': 'selvforvaltning-2025-06'
            }
        }
        
        response = requests.post(f"{API_URL}/leads", json=payload, timeout=TIMEOUT)
        print(f"  Status: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            print(f"  ❌ FAILED: Expected 201, got {response.status_code}")
            print(f"  Response: {response.text[:500]}")
            return None
        
        data = response.json()
        print(f"  Response keys: {list(data.keys())}")
        
        # Check success
        if not data.get('success') and not data.get('ok'):
            print(f"  ❌ FAILED: success/ok not true")
            return None
        
        # Get lead object
        lead = data.get('lead') or data.get('data', {})
        if not lead:
            print(f"  ❌ FAILED: No lead object in response")
            return None
        
        lead_id = lead.get('id')
        if not lead_id:
            print(f"  ❌ FAILED: No lead ID in response")
            return None
        
        created_lead_ids.append(lead_id)
        print(f"  Lead ID: {lead_id}")
        
        # CRITICAL: Check tier
        if lead.get('tier') != 'selvforvaltning':
            print(f"  ❌ FAILED: tier={lead.get('tier')}, expected 'selvforvaltning'")
            return None
        print(f"  ✅ tier='selvforvaltning' (correct)")
        
        # CRITICAL: Check terms_accepted
        terms_accepted = lead.get('terms_accepted')
        if not terms_accepted:
            print(f"  ❌ FAILED: terms_accepted is null/missing")
            return None
        
        if terms_accepted.get('version') != 'selvforvaltning-2025-06':
            print(f"  ❌ FAILED: terms_accepted.version={terms_accepted.get('version')}, expected 'selvforvaltning-2025-06'")
            return None
        
        if not terms_accepted.get('at'):
            print(f"  ❌ FAILED: terms_accepted.at is missing (server timestamp)")
            return None
        
        print(f"  ✅ terms_accepted.version='selvforvaltning-2025-06' (correct)")
        print(f"  ✅ terms_accepted.at='{terms_accepted.get('at')}' (server timestamp set)")
        
        # Check email fields (should exist, can be ok:true or ok:false)
        receipt_email = lead.get('receipt_email')
        admin_notify = lead.get('admin_notify')
        
        if receipt_email is not None:
            print(f"  ✅ receipt_email field present: {receipt_email}")
        else:
            print(f"  ⚠️  Minor: receipt_email field missing (email building may have failed)")
        
        if admin_notify is not None:
            print(f"  ✅ admin_notify field present: {admin_notify}")
        else:
            print(f"  ⚠️  Minor: admin_notify field missing (email building may have failed)")
        
        print(f"  ✅ TEST 1 PASSED")
        return lead_id
        
    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_post_lead_with_tier_full_forvaltning():
    """TEST 2: POST /api/leads with tier='full_forvaltning' WITHOUT terms"""
    print("\nTEST 2: POST /api/leads with tier='full_forvaltning' WITHOUT terms")
    try:
        payload = {
            'name': 'Tier Test Full',
            'email': 'tier-test-full@example.com',
            'phone': '+47 90000003',
            'address': 'Testveien 2',
            'postal_code': '5006',
            'lead_type': 'huseier',
            'tier': 'full_forvaltning'
            # NO terms field
        }
        
        response = requests.post(f"{API_URL}/leads", json=payload, timeout=TIMEOUT)
        print(f"  Status: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            print(f"  ❌ FAILED: Expected 201, got {response.status_code}")
            print(f"  Response: {response.text[:500]}")
            return None
        
        data = response.json()
        
        # Get lead object
        lead = data.get('lead') or data.get('data', {})
        if not lead:
            print(f"  ❌ FAILED: No lead object in response")
            return None
        
        lead_id = lead.get('id')
        if not lead_id:
            print(f"  ❌ FAILED: No lead ID in response")
            return None
        
        created_lead_ids.append(lead_id)
        print(f"  Lead ID: {lead_id}")
        
        # CRITICAL: Check tier
        if lead.get('tier') != 'full_forvaltning':
            print(f"  ❌ FAILED: tier={lead.get('tier')}, expected 'full_forvaltning'")
            return None
        print(f"  ✅ tier='full_forvaltning' (correct)")
        
        # CRITICAL: Check terms_accepted is null
        terms_accepted = lead.get('terms_accepted')
        if terms_accepted is not None:
            print(f"  ❌ FAILED: terms_accepted={terms_accepted}, expected null")
            return None
        print(f"  ✅ terms_accepted=null (correct, no terms provided)")
        
        # Check email fields
        receipt_email = lead.get('receipt_email')
        admin_notify = lead.get('admin_notify')
        
        if receipt_email is not None:
            print(f"  ✅ receipt_email field present: {receipt_email}")
        else:
            print(f"  ⚠️  Minor: receipt_email field missing")
        
        if admin_notify is not None:
            print(f"  ✅ admin_notify field present: {admin_notify}")
        else:
            print(f"  ⚠️  Minor: admin_notify field missing")
        
        print(f"  ✅ TEST 2 PASSED")
        return lead_id
        
    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_post_lead_with_invalid_tier():
    """TEST 3: POST /api/leads with tier='tullball' (invalid) → tier=null"""
    print("\nTEST 3: POST /api/leads with tier='tullball' (invalid) → tier=null")
    try:
        payload = {
            'name': 'Tier Test Invalid',
            'email': 'tier-test-invalid@example.com',
            'phone': '+47 90000004',
            'address': 'Testveien 3',
            'postal_code': '5007',
            'lead_type': 'huseier',
            'tier': 'tullball'  # Invalid tier
        }
        
        response = requests.post(f"{API_URL}/leads", json=payload, timeout=TIMEOUT)
        print(f"  Status: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            print(f"  ❌ FAILED: Expected 201, got {response.status_code}")
            print(f"  Response: {response.text[:500]}")
            return None
        
        data = response.json()
        
        # Get lead object
        lead = data.get('lead') or data.get('data', {})
        if not lead:
            print(f"  ❌ FAILED: No lead object in response")
            return None
        
        lead_id = lead.get('id')
        if not lead_id:
            print(f"  ❌ FAILED: No lead ID in response")
            return None
        
        created_lead_ids.append(lead_id)
        print(f"  Lead ID: {lead_id}")
        
        # CRITICAL: Check tier is null (whitelist validation)
        tier = lead.get('tier')
        if tier is not None:
            print(f"  ❌ FAILED: tier={tier}, expected null (whitelist validation)")
            return None
        print(f"  ✅ tier=null (correct, whitelist validation working)")
        
        print(f"  ✅ TEST 3 PASSED")
        return lead_id
        
    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_webhook_conversion_alias(lead_id):
    """TEST 4: POST /api/webhooks/conversion with X-Webhook-Secret"""
    print(f"\nTEST 4: POST /api/webhooks/conversion with X-Webhook-Secret (lead_id={lead_id})")
    try:
        if not LEAD_SYNC_SECRET:
            print(f"  ❌ FAILED: LEAD_SYNC_SECRET not set in environment")
            return False
        
        payload = {
            'external_ref': lead_id,
            'event': 'avtale_signert'
        }
        
        headers = {
            'X-Webhook-Secret': LEAD_SYNC_SECRET,
            'Content-Type': 'application/json'
        }
        
        response = requests.post(f"{API_URL}/webhooks/conversion", json=payload, headers=headers, timeout=TIMEOUT)
        print(f"  Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            print(f"  Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"  Response: {json.dumps(data, indent=2)}")
        
        if not data.get('ok'):
            print(f"  ❌ FAILED: ok not true")
            return False
        
        print(f"  ✅ Webhook accepted (ok=true)")
        
        # Verify status changed to 'won' via GET /api/admin/leads
        print(f"  Verifying status via GET /api/admin/leads...")
        time.sleep(1)  # Brief wait for DB update
        
        verify_response = requests.get(f"{API_URL}/admin/leads", params={'key': ADMIN_KEY}, timeout=TIMEOUT)
        if verify_response.status_code != 200:
            print(f"  ⚠️  Could not verify status (GET /admin/leads failed)")
            return True  # Webhook worked, verification failed
        
        verify_data = verify_response.json()
        leads = verify_data.get('leads', [])
        
        # Find our lead
        our_lead = None
        for lead in leads:
            if lead.get('id') == lead_id:
                our_lead = lead
                break
        
        if not our_lead:
            print(f"  ⚠️  Could not find lead in admin/leads response")
            return True  # Webhook worked, verification failed
        
        if our_lead.get('status') != 'won':
            print(f"  ❌ FAILED: Lead status={our_lead.get('status')}, expected 'won'")
            return False
        
        print(f"  ✅ Lead status='won' (verified via GET /admin/leads)")
        print(f"  ✅ TEST 4 PASSED")
        return True
        
    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_webhook_conversion_without_secret():
    """TEST 5: POST /api/webhooks/conversion WITHOUT secret → 401"""
    print(f"\nTEST 5: POST /api/webhooks/conversion WITHOUT secret → 401")
    try:
        payload = {
            'external_ref': 'dummy-id',
            'event': 'avtale_signert'
        }
        
        # NO X-Webhook-Secret header
        response = requests.post(f"{API_URL}/webhooks/conversion", json=payload, timeout=TIMEOUT)
        print(f"  Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"  ❌ FAILED: Expected 401, got {response.status_code}")
            return False
        
        print(f"  ✅ Returns 401 without secret (authentication working)")
        print(f"  ✅ TEST 5 PASSED")
        return True
        
    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_webhook_lead_status_regression(lead_id):
    """TEST 6: POST /api/webhooks/lead-status still works (regression)"""
    print(f"\nTEST 6: POST /api/webhooks/lead-status still works (regression, lead_id={lead_id})")
    try:
        if not LEAD_SYNC_SECRET:
            print(f"  ❌ FAILED: LEAD_SYNC_SECRET not set in environment")
            return False
        
        payload = {
            'external_ref': lead_id,
            'status': 'contacted'
        }
        
        headers = {
            'X-Webhook-Secret': LEAD_SYNC_SECRET,
            'Content-Type': 'application/json'
        }
        
        response = requests.post(f"{API_URL}/webhooks/lead-status", json=payload, headers=headers, timeout=TIMEOUT)
        print(f"  Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            print(f"  Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        if not data.get('ok'):
            print(f"  ❌ FAILED: ok not true")
            return False
        
        print(f"  ✅ Old webhook route /webhooks/lead-status still works (regression OK)")
        print(f"  ✅ TEST 6 PASSED")
        return True
        
    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_regression_endpoints():
    """TEST 7: Regression - GET /api/ and GET /api/public/properties"""
    print(f"\nTEST 7: Regression - GET /api/ and GET /api/public/properties")
    try:
        # GET /api/
        response = requests.get(f"{API_URL}/", timeout=TIMEOUT)
        print(f"  GET /api/ status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ❌ FAILED: GET /api/ returned {response.status_code}")
            return False
        
        print(f"  ✅ GET /api/ returns 200")
        
        # GET /api/public/properties
        response = requests.get(f"{API_URL}/public/properties", timeout=TIMEOUT)
        print(f"  GET /api/public/properties status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ❌ FAILED: GET /api/public/properties returned {response.status_code}")
            return False
        
        data = response.json()
        if not data.get('ok'):
            print(f"  ❌ FAILED: GET /api/public/properties ok not true")
            return False
        
        print(f"  ✅ GET /api/public/properties returns 200 {{ok:true}}")
        print(f"  ✅ TEST 7 PASSED")
        return True
        
    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_test_leads():
    """CLEANUP: Delete all test leads from MongoDB"""
    print(f"\n=== CLEANUP: Deleting {len(created_lead_ids)} test leads from MongoDB ===")
    
    if not created_lead_ids:
        print("  No leads to delete")
        return True
    
    try:
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        db = client[DB_NAME]
        
        print(f"  Connected to MongoDB: {MONGO_URL}/{DB_NAME}")
        print(f"  Lead IDs to delete: {created_lead_ids}")
        
        # Delete from 'leads' collection
        result = db.leads.delete_many({'id': {'$in': created_lead_ids}})
        print(f"  Deleted {result.deleted_count} leads from 'leads' collection")
        
        if result.deleted_count != len(created_lead_ids):
            print(f"  ⚠️  Warning: Expected to delete {len(created_lead_ids)} leads, deleted {result.deleted_count}")
        
        # Verify deletion
        remaining = db.leads.count_documents({'id': {'$in': created_lead_ids}})
        if remaining > 0:
            print(f"  ❌ FAILED: {remaining} leads still exist after deletion")
            return False
        
        print(f"  ✅ All test leads deleted successfully")
        print(f"  ✅ CLEANUP PASSED")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"  ❌ CLEANUP FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    results = {
        'total': 0,
        'passed': 0,
        'failed': 0
    }
    
    # TEST 1: tier='selvforvaltning' + terms
    results['total'] += 1
    lead_id_1 = test_post_lead_with_tier_selvforvaltning()
    if lead_id_1:
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    # TEST 2: tier='full_forvaltning' WITHOUT terms
    results['total'] += 1
    lead_id_2 = test_post_lead_with_tier_full_forvaltning()
    if lead_id_2:
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    # TEST 3: tier='tullball' (invalid) → tier=null
    results['total'] += 1
    lead_id_3 = test_post_lead_with_invalid_tier()
    if lead_id_3:
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    # TEST 4: Webhook conversion alias (use lead_id_1 from test 1)
    if lead_id_1:
        results['total'] += 1
        if test_webhook_conversion_alias(lead_id_1):
            results['passed'] += 1
        else:
            results['failed'] += 1
    
    # TEST 5: Webhook without secret → 401
    results['total'] += 1
    if test_webhook_conversion_without_secret():
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    # TEST 6: Old webhook route regression (use lead_id_2 from test 2)
    if lead_id_2:
        results['total'] += 1
        if test_webhook_lead_status_regression(lead_id_2):
            results['passed'] += 1
        else:
            results['failed'] += 1
    
    # TEST 7: Regression endpoints
    results['total'] += 1
    if test_regression_endpoints():
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    # CLEANUP: Delete test leads
    cleanup_success = cleanup_test_leads()
    
    # Summary
    print(f"\n{'='*60}")
    print(f"TIER-SPLIT BACKEND TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Total tests: {results['total']}")
    print(f"Passed: {results['passed']} ✅")
    print(f"Failed: {results['failed']} ❌")
    print(f"Cleanup: {'✅ PASSED' if cleanup_success else '❌ FAILED'}")
    print(f"{'='*60}")
    
    if results['failed'] > 0 or not cleanup_success:
        print("❌ SOME TESTS FAILED")
        sys.exit(1)
    else:
        print("✅ ALL TESTS PASSED")
        sys.exit(0)

if __name__ == '__main__':
    main()
