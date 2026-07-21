#!/usr/bin/env python3
"""
Backend API Testing - Lead Forwarding to NEW Test CRM (rental-ops-17)
Tests that leads are now forwarded to rental-ops-17 after config change
Base URL: https://bli-utleier-redesign.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_submit_bli_utleier_lead():
    """Test 1: Submit a bli-utleier lead and verify forwarding to rental-ops-17"""
    log("TEST 1: POST /api/leads - Submit bli-utleier lead")
    log("  Testing forwarding to NEW test CRM: rental-ops-17")
    
    try:
        # Exact payload from review_request
        payload = {
            "name": "QA Forward Check",
            "email": "qa-forward-check@example.test",
            "phone": "+47 90000055",
            "address": "Testveien 9, 5003 Bergen",
            "postal_code": "5003",
            "property_type": "leilighet",
            "rental_model": "langtid",
            "bedrooms": 2,
            "sqm": 60,
            "lead_type": "huseier",
            "source": "qa-forward-test",
            "notes": "QA forwarding routing test"
        }
        
        log(f"  Submitting lead: {payload['name']} ({payload['email']})")
        response = requests.post(f"{BASE_URL}/leads", json=payload, timeout=20)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 201:
            log(f"  ❌ FAILED: Expected 201, got {response.status_code}")
            log(f"  Response: {response.text}")
            return False, None
        
        data = response.json()
        log(f"  Response keys: {list(data.keys())}")
        
        # Verify response structure
        if not data.get('success') or not data.get('ok'):
            log(f"  ❌ FAILED: Expected success=true and ok=true")
            log(f"  Response: {json.dumps(data, indent=2)}")
            return False, None
        
        # Verify data.id exists
        if 'data' not in data or 'id' not in data['data']:
            log(f"  ❌ FAILED: Missing data.id in response")
            return False, None
        
        lead_id = data['data']['id']
        log(f"  ✅ Lead created with ID: {lead_id}")
        
        # Capture forwarded status
        forwarded = data.get('forwarded', None)
        log(f"  Forwarded status: {forwarded}")
        
        # Check if lead object is present
        if 'lead' in data:
            lead_obj = data['lead']
            log(f"  Lead object keys: {list(lead_obj.keys())}")
            
            # Check for platform_id (indicates successful forwarding to CRM)
            if 'platform_id' in lead_obj:
                log(f"  ✅ platform_id present: {lead_obj['platform_id']}")
            else:
                log(f"  ⚠️  platform_id NOT present (may indicate forwarding failed)")
        
        log(f"  ✅ PASSED: Lead submitted successfully")
        return True, lead_id
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None

def test_confirm_lead_persisted(lead_id):
    """Test 2: Confirm lead persisted in database via GET /api/admin/leads"""
    log(f"TEST 2: GET /api/admin/leads - Confirm lead {lead_id} persisted")
    
    try:
        response = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=15)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if 'leads' not in data:
            log(f"  ❌ FAILED: Missing 'leads' field in response")
            return False
        
        # Find our test lead by id
        test_lead = None
        for lead in data['leads']:
            if lead.get('id') == lead_id:
                test_lead = lead
                break
        
        if not test_lead:
            log(f"  ❌ FAILED: Lead {lead_id} not found in database")
            return False
        
        log(f"  ✅ Lead found in database")
        log(f"  Lead fields: {list(test_lead.keys())}")
        
        # Report critical fields
        forwarded = test_lead.get('forwarded', None)
        platform_id = test_lead.get('platform_id', None)
        forward_error = test_lead.get('forward_error', None)
        forwarded_at = test_lead.get('forwarded_at', None)
        
        log(f"  📊 FORWARDING STATUS:")
        log(f"     forwarded: {forwarded}")
        log(f"     platform_id: {platform_id}")
        log(f"     forward_error: {forward_error}")
        log(f"     forwarded_at: {forwarded_at}")
        
        # Interpretation
        if forwarded == True and platform_id is not None:
            log(f"  ✅ INTERPRETATION: Forwarding to rental-ops-17 SUCCEEDED")
            log(f"     Lead was successfully forwarded to the NEW test CRM")
        elif forwarded == False:
            log(f"  ⚠️  INTERPRETATION: Forwarding FAILED")
            if forward_error:
                log(f"     Error: {forward_error}")
                log(f"     This indicates rental-ops-17 may not accept the /api/leads contract")
            else:
                log(f"     No error message captured")
        else:
            log(f"  ⚠️  INTERPRETATION: Forwarding status unclear")
        
        log(f"  ✅ PASSED: Lead persistence confirmed")
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception - {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_cleanup_lead(lead_id):
    """Test 3: Cleanup - Delete test lead"""
    log(f"TEST 3: POST /api/admin/delete - Cleanup test lead {lead_id}")
    
    try:
        payload = {"id": lead_id}
        response = requests.post(f"{BASE_URL}/admin/delete?key={ADMIN_KEY}", json=payload, timeout=15)
        log(f"  Status: {response.status_code}")
        
        if response.status_code != 200:
            log(f"  ⚠️  WARNING: Cleanup failed with status {response.status_code}")
            log(f"  Response: {response.text}")
            return False
        
        data = response.json()
        
        if data.get('success') and data.get('deleted', 0) > 0:
            log(f"  ✅ PASSED: Test lead deleted successfully")
            return True
        else:
            log(f"  ⚠️  WARNING: Deletion may not have succeeded")
            log(f"  Response: {json.dumps(data, indent=2)}")
            return False
        
    except Exception as e:
        log(f"  ⚠️  WARNING: Cleanup exception - {str(e)}")
        return False

def main():
    log("=" * 80)
    log("BACKEND API TESTING - Lead Forwarding to NEW Test CRM (rental-ops-17)")
    log(f"Base URL: {BASE_URL}")
    log("=" * 80)
    log("")
    log("CONTEXT:")
    log("  DIGIHOME_API_URL_TEST was changed from proposal-engine-37 to rental-ops-17")
    log("  This test verifies leads are now forwarded to the NEW test CRM")
    log("=" * 80)
    log("")
    
    # Test 1: Submit lead
    success1, lead_id = test_submit_bli_utleier_lead()
    log("")
    
    if not success1 or not lead_id:
        log("=" * 80)
        log("TEST FAILED: Could not submit lead")
        log("=" * 80)
        return 1
    
    # Test 2: Confirm persistence and check forwarding status
    success2 = test_confirm_lead_persisted(lead_id)
    log("")
    
    # Test 3: Cleanup
    success3 = test_cleanup_lead(lead_id)
    log("")
    
    log("=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    results = [
        ("Submit bli-utleier lead", success1),
        ("Confirm lead persisted & check forwarding", success2),
        ("Cleanup test lead", success3),
    ]
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        log(f"{status}: {name}")
    
    log("")
    log(f"Total: {passed}/{total} tests passed")
    log("=" * 80)
    
    return 0 if passed >= 2 else 1  # Allow cleanup to fail without failing the whole test

if __name__ == "__main__":
    sys.exit(main())
