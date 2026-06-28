#!/usr/bin/env python3
"""
Backend test for two-way lead-status sync feature.
Tests POST /api/webhooks/lead-status, GET /api/admin/lead, GET /api/admin/leads/export
"""

import requests
import json
import time
import sys

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
WEBHOOK_SECRET = "dhsync_dc0dc1750aff067a4baef7adafc7991f7340eacc44f27036"

def test_create_lead():
    """Test 1: Create ONE fake test lead and capture external_ref"""
    print("\n" + "="*80)
    print("TEST 1: POST /api/leads - Create fake test lead")
    print("="*80)
    
    try:
        payload = {
            "name": "QA Sync Test Lead",
            "email": "qa-sync-test@example.test",
            "phone": "+47 90000099",
            "address": "Testveien 99",
            "postal_code": "5005",
            "property_type": "leilighet",
            "lead_type": "huseier",
            "source": "qa-sync",
            "attribution": {
                "source": "google",
                "medium": "cpc",
                "campaign": "qa-sync-test",
                "gclid": "QA_SYNC_GCLID_999"
            }
        }
        
        response = requests.post(f"{BASE_URL}/leads", json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Lead created successfully")
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if 'data' in data and 'id' in data['data']:
                lead_id = data['data']['id']
                print(f"✅ Captured external_ref (lead.id): {lead_id}")
                return lead_id
            elif 'lead' in data and 'id' in data['lead']:
                lead_id = data['lead']['id']
                print(f"✅ Captured external_ref (lead.id): {lead_id}")
                return lead_id
            else:
                print(f"❌ FAILED: Could not extract lead.id from response")
                return None
        else:
            print(f"❌ FAILED: Expected 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        return None


def test_webhook_auth():
    """Test 2: POST /api/webhooks/lead-status - Authentication tests"""
    print("\n" + "="*80)
    print("TEST 2: POST /api/webhooks/lead-status - Authentication")
    print("="*80)
    
    all_passed = True
    
    # Test 2a: No secret header
    print("\n--- Test 2a: 401 without secret ---")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json={"status": "contacted"},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 401:
            print(f"✅ Correctly returned 401 without secret")
        else:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    # Test 2b: Wrong secret
    print("\n--- Test 2b: 401 with wrong secret ---")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": "wrong_secret_123"},
            json={"status": "contacted"},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 401:
            print(f"✅ Correctly returned 401 with wrong secret")
        else:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    # Test 2c: Correct secret
    print("\n--- Test 2c: 200 with correct secret (but no matching lead) ---")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={"status": "contacted", "email": "nonexistent@example.test"},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        # Should be 404 (no match) not 401 (auth failed)
        if response.status_code == 404:
            print(f"✅ Correctly authenticated (got 404 for no match, not 401)")
        elif response.status_code == 401:
            print(f"❌ FAILED: Got 401, authentication not working with correct secret")
            all_passed = False
        else:
            print(f"✅ Authenticated (got {response.status_code}, not 401)")
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    return all_passed


def test_webhook_status_normalization(lead_id):
    """Test 3: Status normalization and validation"""
    print("\n" + "="*80)
    print("TEST 3: POST /api/webhooks/lead-status - Status normalization")
    print("="*80)
    
    if not lead_id:
        print("❌ SKIPPED: No lead_id available")
        return False
    
    all_passed = True
    
    # Test 3a: Norwegian status 'kontaktet' -> 'contacted'
    print("\n--- Test 3a: Status normalization 'kontaktet' -> 'contacted' ---")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={"external_ref": lead_id, "status": "kontaktet"},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200 and data.get('status') == 'contacted':
            print(f"✅ Status normalized correctly: 'kontaktet' -> 'contacted'")
        else:
            print(f"❌ FAILED: Expected status='contacted', got {data.get('status')}")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    time.sleep(0.5)
    
    # Test 3b: Norwegian status 'vunnet' -> 'won' with value
    print("\n--- Test 3b: Status normalization 'vunnet' -> 'won' with value ---")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={
                "external_ref": lead_id,
                "status": "vunnet",
                "value": 35000,
                "currency": "NOK"
            },
            timeout=30
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200 and data.get('status') == 'won':
            print(f"✅ Status normalized correctly: 'vunnet' -> 'won'")
        else:
            print(f"❌ FAILED: Expected status='won', got {data.get('status')}")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    time.sleep(0.5)
    
    # Test 3c: Invalid status
    print("\n--- Test 3c: 400 on invalid status ---")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={"external_ref": lead_id, "status": "invalid_status_xyz"},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 400:
            print(f"✅ Correctly returned 400 for invalid status")
        else:
            print(f"❌ FAILED: Expected 400, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    return all_passed


def test_webhook_matching(lead_id, lead_email):
    """Test 4: Matching priority (external_ref -> platform_id -> email)"""
    print("\n" + "="*80)
    print("TEST 4: POST /api/webhooks/lead-status - Matching priority")
    print("="*80)
    
    if not lead_id:
        print("❌ SKIPPED: No lead_id available")
        return False
    
    all_passed = True
    
    # Test 4a: Match by external_ref
    print("\n--- Test 4a: Match by external_ref ---")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={"external_ref": lead_id, "status": "qualified"},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200 and data.get('matched_by') == 'external_ref':
            print(f"✅ Matched by external_ref correctly")
        else:
            print(f"❌ FAILED: Expected matched_by='external_ref', got {data.get('matched_by')}")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    time.sleep(0.5)
    
    # Test 4b: Match by email (fallback)
    print("\n--- Test 4b: Match by email (fallback) ---")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={"email": lead_email, "status": "contacted"},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200 and data.get('matched_by') == 'email':
            print(f"✅ Matched by email correctly")
        else:
            print(f"❌ FAILED: Expected matched_by='email', got {data.get('matched_by')}")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    time.sleep(0.5)
    
    # Test 4c: 404 when no match
    print("\n--- Test 4c: 404 when no match ---")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={"email": "nonexistent-lead-999@example.test", "status": "contacted"},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 404:
            print(f"✅ Correctly returned 404 when no match")
        else:
            print(f"❌ FAILED: Expected 404, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    return all_passed


def test_webhook_won_value_storage(lead_id):
    """Test 5: Verify wonValue/wonCurrency stored via GET /api/admin/leads"""
    print("\n" + "="*80)
    print("TEST 5: Verify wonValue/wonCurrency stored")
    print("="*80)
    
    if not lead_id:
        print("❌ SKIPPED: No lead_id available")
        return False
    
    all_passed = True
    
    # First, set status to 'won' with value
    print("\n--- Setting lead to 'won' with value=35000 NOK ---")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={
                "external_ref": lead_id,
                "status": "won",
                "value": 35000,
                "currency": "NOK"
            },
            timeout=30
        )
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"❌ FAILED: Could not set lead to won")
            return False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        return False
    
    time.sleep(1)
    
    # Now verify via GET /api/admin/leads
    print("\n--- Verifying via GET /api/admin/leads ---")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/leads",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', []) if isinstance(data, dict) else data
            # Find our test lead
            test_lead = None
            for lead in leads:
                if lead.get('id') == lead_id:
                    test_lead = lead
                    break
            
            if test_lead:
                print(f"✅ Found test lead in admin/leads")
                print(f"Lead status: {test_lead.get('status')}")
                print(f"Lead wonValue: {test_lead.get('wonValue')}")
                print(f"Lead wonCurrency: {test_lead.get('wonCurrency')}")
                print(f"Lead syncedFromPlatform: {test_lead.get('syncedFromPlatform')}")
                
                if test_lead.get('status') == 'won':
                    print(f"✅ Status is 'won'")
                else:
                    print(f"❌ FAILED: Expected status='won', got {test_lead.get('status')}")
                    all_passed = False
                
                if test_lead.get('wonValue') == 35000:
                    print(f"✅ wonValue is 35000")
                else:
                    print(f"❌ FAILED: Expected wonValue=35000, got {test_lead.get('wonValue')}")
                    all_passed = False
                
                if test_lead.get('wonCurrency') == 'NOK':
                    print(f"✅ wonCurrency is 'NOK'")
                else:
                    print(f"❌ FAILED: Expected wonCurrency='NOK', got {test_lead.get('wonCurrency')}")
                    all_passed = False
                
                if test_lead.get('syncedFromPlatform') == True:
                    print(f"✅ syncedFromPlatform is True")
                else:
                    print(f"❌ FAILED: Expected syncedFromPlatform=True, got {test_lead.get('syncedFromPlatform')}")
                    all_passed = False
            else:
                print(f"❌ FAILED: Could not find test lead with id={lead_id}")
                all_passed = False
        else:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    return all_passed


def test_admin_lead_detail(lead_id):
    """Test 6: GET /api/admin/lead - Lead detail with timeline"""
    print("\n" + "="*80)
    print("TEST 6: GET /api/admin/lead - Lead detail with timeline")
    print("="*80)
    
    if not lead_id:
        print("❌ SKIPPED: No lead_id available")
        return False
    
    all_passed = True
    
    # Test 6a: Valid request with key
    print("\n--- Test 6a: GET /api/admin/lead?id=<id>&type=lead with key ---")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/lead",
            params={"id": lead_id, "type": "lead", "key": ADMIN_KEY},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Request successful")
            
            if data.get('ok') == True:
                print(f"✅ Response has ok=true")
            else:
                print(f"❌ FAILED: Expected ok=true")
                all_passed = False
            
            if 'lead' in data:
                print(f"✅ Response has 'lead' field")
                lead = data['lead']
                print(f"Lead name: {lead.get('name')}")
                print(f"Lead email: {lead.get('email')}")
                print(f"Lead status: {lead.get('status')}")
            else:
                print(f"❌ FAILED: Response missing 'lead' field")
                all_passed = False
            
            if 'timeline' in data:
                print(f"✅ Response has 'timeline' field")
                timeline = data['timeline']
                print(f"Timeline events: {len(timeline)}")
                if isinstance(timeline, list):
                    print(f"✅ Timeline is an array")
                else:
                    print(f"❌ FAILED: Timeline is not an array")
                    all_passed = False
            else:
                print(f"❌ FAILED: Response missing 'timeline' field")
                all_passed = False
        else:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            all_passed = False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    # Test 6b: 401 without key
    print("\n--- Test 6b: 401 without key ---")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/lead",
            params={"id": lead_id, "type": "lead"},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 401:
            print(f"✅ Correctly returned 401 without key")
        else:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    # Test 6c: 404 for unknown id
    print("\n--- Test 6c: 404 for unknown id ---")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/lead",
            params={"id": "unknown-id-999", "type": "lead", "key": ADMIN_KEY},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 404:
            print(f"✅ Correctly returned 404 for unknown id")
        else:
            print(f"❌ FAILED: Expected 404, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    return all_passed


def test_admin_leads_export():
    """Test 7: GET /api/admin/leads/export - CSV export"""
    print("\n" + "="*80)
    print("TEST 7: GET /api/admin/leads/export - CSV export")
    print("="*80)
    
    all_passed = True
    
    # Test 7a: Export with key (type=lead)
    print("\n--- Test 7a: GET /api/admin/leads/export?type=lead with key ---")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/leads/export",
            params={"type": "lead", "key": ADMIN_KEY},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ Request successful")
            
            # Check Content-Type
            content_type = response.headers.get('Content-Type', '')
            print(f"Content-Type: {content_type}")
            if 'text/csv' in content_type:
                print(f"✅ Content-Type is text/csv")
            else:
                print(f"❌ FAILED: Expected text/csv, got {content_type}")
                all_passed = False
            
            # Check Content-Disposition
            content_disp = response.headers.get('Content-Disposition', '')
            print(f"Content-Disposition: {content_disp}")
            if 'attachment' in content_disp:
                print(f"✅ Content-Disposition contains 'attachment'")
            else:
                print(f"❌ FAILED: Content-Disposition missing 'attachment'")
                all_passed = False
            
            # Check CSV content
            csv_text = response.text
            print(f"CSV length: {len(csv_text)} bytes")
            
            # Check BOM (UTF-8 BOM for Excel)
            if csv_text.startswith('\ufeff'):
                print(f"✅ CSV starts with BOM (UTF-8 BOM for Excel)")
            else:
                print(f"❌ FAILED: CSV missing BOM")
                all_passed = False
            
            # Check header line
            lines = csv_text.split('\n')
            if len(lines) > 0:
                header = lines[0].replace('\ufeff', '').strip()
                print(f"Header line: {header}")
                
                required_cols = ['name', 'email', 'status', 'wonValue', 'gclid']
                missing_cols = []
                for col in required_cols:
                    if col not in header:
                        missing_cols.append(col)
                
                if not missing_cols:
                    print(f"✅ Header contains all required columns: {required_cols}")
                else:
                    print(f"❌ FAILED: Header missing columns: {missing_cols}")
                    all_passed = False
            else:
                print(f"❌ FAILED: CSV is empty")
                all_passed = False
        else:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    # Test 7b: 401 without key
    print("\n--- Test 7b: 401 without key ---")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/leads/export",
            params={"type": "lead"},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 401:
            print(f"✅ Correctly returned 401 without key")
        else:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    # Test 7c: Export tenant leads
    print("\n--- Test 7c: GET /api/admin/leads/export?type=tenant with key ---")
    try:
        response = requests.get(
            f"{BASE_URL}/admin/leads/export",
            params={"type": "tenant", "key": ADMIN_KEY},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"✅ Tenant export successful")
            content_type = response.headers.get('Content-Type', '')
            if 'text/csv' in content_type:
                print(f"✅ Content-Type is text/csv")
            else:
                print(f"❌ FAILED: Expected text/csv, got {content_type}")
                all_passed = False
        else:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    return all_passed


def test_regression():
    """Test 8: Regression tests"""
    print("\n" + "="*80)
    print("TEST 8: Regression tests")
    print("="*80)
    
    all_passed = True
    
    # Test 8a: GET /api/ -> 200 {ok:true}
    print("\n--- Test 8a: GET /api/ -> 200 {ok:true} ---")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=30)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200 and data.get('ok') == True:
            print(f"✅ Root endpoint working")
        else:
            print(f"❌ FAILED: Expected 200 with ok=true")
            all_passed = False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    # Test 8b: POST /api/admin/lead-status still works
    print("\n--- Test 8b: POST /api/admin/lead-status still works ---")
    try:
        # Get a lead to test with
        response = requests.get(
            f"{BASE_URL}/admin/leads",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            leads = data.get('leads', []) if isinstance(data, dict) else data
            if len(leads) > 0:
                test_lead_id = leads[0].get('id')
                original_status = leads[0].get('status')
                
                # Try to update status
                response = requests.post(
                    f"{BASE_URL}/admin/lead-status",
                    params={"key": ADMIN_KEY},
                    json={"id": test_lead_id, "status": "contacted"},
                    timeout=30
                )
                print(f"Status: {response.status_code}")
                
                if response.status_code == 200:
                    print(f"✅ POST /api/admin/lead-status still works")
                else:
                    print(f"❌ FAILED: Expected 200, got {response.status_code}")
                    all_passed = False
            else:
                print(f"⚠️  SKIPPED: No leads available to test")
        else:
            print(f"⚠️  SKIPPED: Could not fetch leads")
            
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        all_passed = False
    
    return all_passed


def cleanup_test_lead(lead_id):
    """Cleanup: Delete test lead"""
    print("\n" + "="*80)
    print("CLEANUP: Delete test lead")
    print("="*80)
    
    if not lead_id:
        print("⚠️  SKIPPED: No lead_id to cleanup")
        return
    
    try:
        response = requests.post(
            f"{BASE_URL}/admin/delete",
            params={"key": ADMIN_KEY},
            json={"id": lead_id},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ Test lead deleted successfully")
        else:
            print(f"⚠️  Could not delete test lead (status {response.status_code})")
            
    except Exception as e:
        print(f"⚠️  Could not delete test lead: {str(e)}")


def main():
    print("\n" + "="*80)
    print("TWO-WAY LEAD-STATUS SYNC BACKEND TEST")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"Webhook Secret: {WEBHOOK_SECRET[:20]}...")
    
    results = {}
    lead_id = None
    lead_email = "qa-sync-test@example.test"
    
    # Test 1: Create lead
    lead_id = test_create_lead()
    results['create_lead'] = lead_id is not None
    
    # Test 2: Webhook auth
    results['webhook_auth'] = test_webhook_auth()
    
    # Test 3: Status normalization
    results['status_normalization'] = test_webhook_status_normalization(lead_id)
    
    # Test 4: Matching priority
    results['matching_priority'] = test_webhook_matching(lead_id, lead_email)
    
    # Test 5: Won value storage
    results['won_value_storage'] = test_webhook_won_value_storage(lead_id)
    
    # Test 6: Admin lead detail
    results['admin_lead_detail'] = test_admin_lead_detail(lead_id)
    
    # Test 7: CSV export
    results['csv_export'] = test_admin_leads_export()
    
    # Test 8: Regression
    results['regression'] = test_regression()
    
    # Cleanup
    cleanup_test_lead(lead_id)
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({int(passed/total*100)}% success rate)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
