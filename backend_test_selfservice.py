#!/usr/bin/env python3
"""
Backend test for self-service lead flow (selvforvaltning tier with terms acceptance).

CRITICAL SAFETY RULES:
- POST /api/leads sends REAL emails (SendGrid) and forwards to platform-preview
- Create MAX 3 leads total with name 'QA Selvbetjent Test — ignorer'
- Use emails like qa-selfservice-<timestamp>@example.com (bounces harmlessly)
- DO NOT modify existing leads
- DO NOT call newsletter-, dedupe-, webhook- or status-endpoints
- MANDATORY CLEANUP: delete all created QA leads from MongoDB at end
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
TEST_LEADS = []  # Will store created lead IDs for cleanup

def test_1_baseline():
    """Test 1: BASELINE - Count leads in DB and get velocity metrics"""
    print("\n=== TEST 1: BASELINE ===")
    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        baseline_count = db.leads.count_documents({})
        print(f"✓ Baseline lead count: {baseline_count}")
        
        # Get velocity metrics
        url = f"{BASE_URL}/admin/analytics/velocity?days=90&key={ADMIN_KEY}"
        response = requests.get(url, timeout=30)
        print(f"✓ GET /admin/analytics/velocity status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Velocity response ok: {data.get('ok')}")
            print(f"✓ Sample size: {data.get('sample')}")
            
            # Note time-to-sale metrics for comparison
            time_to_sale = data.get('timeToSale', {})
            print(f"✓ Time-to-sale baseline: n={time_to_sale.get('n')}, medianDays={time_to_sale.get('medianDays')}")
            
            return {
                'baseline_count': baseline_count,
                'velocity_sample': data.get('sample'),
                'time_to_sale_n': time_to_sale.get('n'),
                'time_to_sale_median': time_to_sale.get('medianDays')
            }
        else:
            print(f"✗ FAIL: Velocity endpoint returned {response.status_code}")
            return None
            
    except Exception as e:
        print(f"✗ FAIL: {str(e)}")
        return None

def test_2_selfservice_main_case(baseline):
    """Test 2: SELF-SERVICE MAIN CASE - tier='selvforvaltning' + terms"""
    print("\n=== TEST 2: SELF-SERVICE MAIN CASE ===")
    try:
        email = f"qa-selfservice-{TIMESTAMP}@example.com"
        phone_suffix = str(int(time.time()) % 1000).zfill(3)
        
        payload = {
            "name": "QA Selvbetjent Test — ignorer",
            "email": email,
            "phone": f"99900{phone_suffix}",
            "address": "Testveien 1",
            "postal_code": "5000",
            "lead_type": "huseier",
            "property_type": "leilighet",
            "bedrooms": 2,
            "tier": "selvforvaltning",
            "terms": {
                "version": "selvforvaltning-2025-06"
            }
        }
        
        url = f"{BASE_URL}/leads"
        response = requests.post(url, json=payload, timeout=30)
        print(f"✓ POST /leads status: {response.status_code}")
        
        if response.status_code != 201:
            print(f"✗ FAIL: Expected 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
        data = response.json()
        print(f"✓ Response success: {data.get('success')}")
        
        # Check response structure
        if not data.get('data', {}).get('id'):
            print(f"✗ FAIL: No lead ID in response")
            return False
            
        lead_id = data['data']['id']
        TEST_LEADS.append(lead_id)
        print(f"✓ Lead ID: {lead_id}")
        
        # Check 'account' field exists in response (expected null)
        if 'account' not in data:
            print(f"✗ FAIL: 'account' field missing from response")
            return False
        print(f"✓ 'account' field present in response: {data.get('account')}")
        
        # Verify lead in response
        lead = data.get('lead', {})
        if lead.get('status') != 'won':
            print(f"✗ FAIL: Expected status='won', got '{lead.get('status')}'")
            return False
        print(f"✓ Lead status: won")
        
        if not lead.get('self_service'):
            print(f"✗ FAIL: self_service not set to true")
            return False
        print(f"✓ Lead self_service: true")
        
        # Verify in MongoDB
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        db_lead = db.leads.find_one({"id": lead_id})
        
        if not db_lead:
            print(f"✗ FAIL: Lead not found in MongoDB")
            return False
        print(f"✓ Lead found in MongoDB")
        
        # Check MongoDB fields
        if db_lead.get('status') != 'won':
            print(f"✗ FAIL: MongoDB status is '{db_lead.get('status')}', expected 'won'")
            return False
        print(f"✓ MongoDB status: won")
        
        if not db_lead.get('self_service'):
            print(f"✗ FAIL: MongoDB self_service not true")
            return False
        print(f"✓ MongoDB self_service: true")
        
        if not db_lead.get('wonAt'):
            print(f"✗ FAIL: MongoDB wonAt not set")
            return False
        print(f"✓ MongoDB wonAt: {db_lead.get('wonAt')}")
        
        if db_lead.get('wonAt') != db_lead.get('createdAt'):
            print(f"✗ FAIL: wonAt ({db_lead.get('wonAt')}) != createdAt ({db_lead.get('createdAt')})")
            return False
        print(f"✓ MongoDB wonAt === createdAt")
        
        # Check statusHistory
        status_history = db_lead.get('statusHistory', [])
        if len(status_history) != 1:
            print(f"✗ FAIL: statusHistory has {len(status_history)} entries, expected 1")
            return False
        print(f"✓ statusHistory has exactly 1 entry")
        
        history_entry = status_history[0]
        if history_entry.get('status') != 'won':
            print(f"✗ FAIL: statusHistory[0].status is '{history_entry.get('status')}', expected 'won'")
            return False
        if history_entry.get('via') != 'self_service':
            print(f"✗ FAIL: statusHistory[0].via is '{history_entry.get('via')}', expected 'self_service'")
            return False
        print(f"✓ statusHistory[0]: status='won', via='self_service'")
        
        # Check terms_accepted
        terms_accepted = db_lead.get('terms_accepted')
        if not terms_accepted:
            print(f"✗ FAIL: terms_accepted not set")
            return False
        if terms_accepted.get('version') != 'selvforvaltning-2025-06':
            print(f"✗ FAIL: terms_accepted.version is '{terms_accepted.get('version')}', expected 'selvforvaltning-2025-06'")
            return False
        if not terms_accepted.get('at'):
            print(f"✗ FAIL: terms_accepted.at not set")
            return False
        print(f"✓ terms_accepted: version='selvforvaltning-2025-06', at={terms_accepted.get('at')}")
        
        # Check tier
        if db_lead.get('tier') != 'selvforvaltning':
            print(f"✗ FAIL: tier is '{db_lead.get('tier')}', expected 'selvforvaltning'")
            return False
        print(f"✓ tier: selvforvaltning")
        
        print("✓ TEST 2 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_3_control_a_tier_without_terms():
    """Test 3: CONTROL A - tier='selvforvaltning' WITHOUT terms"""
    print("\n=== TEST 3: CONTROL A (tier without terms) ===")
    try:
        email = f"qa-selfservice-a-{TIMESTAMP}@example.com"
        phone_suffix = str(int(time.time()) % 1000).zfill(3)
        
        payload = {
            "name": "QA Selvbetjent Test A — ignorer",
            "email": email,
            "phone": f"99901{phone_suffix}",
            "address": "Testveien 2",
            "postal_code": "5001",
            "lead_type": "huseier",
            "property_type": "enebolig",
            "bedrooms": 3,
            "tier": "selvforvaltning"
            # NO terms field
        }
        
        url = f"{BASE_URL}/leads"
        response = requests.post(url, json=payload, timeout=30)
        print(f"✓ POST /leads status: {response.status_code}")
        
        if response.status_code != 201:
            print(f"✗ FAIL: Expected 201, got {response.status_code}")
            return False
            
        data = response.json()
        lead_id = data['data']['id']
        TEST_LEADS.append(lead_id)
        print(f"✓ Lead ID: {lead_id}")
        
        # Verify in MongoDB
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        db_lead = db.leads.find_one({"id": lead_id})
        
        if not db_lead:
            print(f"✗ FAIL: Lead not found in MongoDB")
            return False
        
        # Should be status='new', NOT 'won'
        if db_lead.get('status') != 'new':
            print(f"✗ FAIL: Expected status='new', got '{db_lead.get('status')}'")
            return False
        print(f"✓ Status: new (correct - no terms)")
        
        # self_service should NOT be set
        if db_lead.get('self_service'):
            print(f"✗ FAIL: self_service should not be set")
            return False
        print(f"✓ self_service NOT set (correct)")
        
        # terms_accepted should be null
        if db_lead.get('terms_accepted'):
            print(f"✗ FAIL: terms_accepted should be null")
            return False
        print(f"✓ terms_accepted: null (correct)")
        
        print("✓ TEST 3 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_4_control_b_full_forvaltning_with_terms():
    """Test 4: CONTROL B - tier='full_forvaltning' WITH terms"""
    print("\n=== TEST 4: CONTROL B (full_forvaltning with terms) ===")
    try:
        email = f"qa-selfservice-b-{TIMESTAMP}@example.com"
        phone_suffix = str(int(time.time()) % 1000).zfill(3)
        
        payload = {
            "name": "QA Selvbetjent Test B — ignorer",
            "email": email,
            "phone": f"99902{phone_suffix}",
            "address": "Testveien 3",
            "postal_code": "5002",
            "lead_type": "huseier",
            "property_type": "rekkehus",
            "bedrooms": 4,
            "tier": "full_forvaltning",
            "terms": {
                "version": "x"
            }
        }
        
        url = f"{BASE_URL}/leads"
        response = requests.post(url, json=payload, timeout=30)
        print(f"✓ POST /leads status: {response.status_code}")
        
        if response.status_code != 201:
            print(f"✗ FAIL: Expected 201, got {response.status_code}")
            return False
            
        data = response.json()
        lead_id = data['data']['id']
        TEST_LEADS.append(lead_id)
        print(f"✓ Lead ID: {lead_id}")
        
        # Verify in MongoDB
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        db_lead = db.leads.find_one({"id": lead_id})
        
        if not db_lead:
            print(f"✗ FAIL: Lead not found in MongoDB")
            return False
        
        # Should be status='new', NOT 'won' (only selvforvaltning auto-wins)
        if db_lead.get('status') != 'new':
            print(f"✗ FAIL: Expected status='new', got '{db_lead.get('status')}'")
            return False
        print(f"✓ Status: new (correct - full_forvaltning doesn't auto-win)")
        
        # self_service should NOT be set
        if db_lead.get('self_service'):
            print(f"✗ FAIL: self_service should not be set")
            return False
        print(f"✓ self_service NOT set (correct)")
        
        print("✓ TEST 4 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_5_velocity_exclusion(baseline):
    """Test 5: VELOCITY EXCLUSION - self-service leads excluded from time-to-sale"""
    print("\n=== TEST 5: VELOCITY EXCLUSION ===")
    try:
        # Wait a moment for data to settle
        time.sleep(2)
        
        url = f"{BASE_URL}/admin/analytics/velocity?days=90&key={ADMIN_KEY}"
        response = requests.get(url, timeout=30)
        print(f"✓ GET /admin/analytics/velocity status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAIL: Expected 200, got {response.status_code}")
            return False
            
        data = response.json()
        time_to_sale = data.get('timeToSale', {})
        
        # The self-service lead (won with 0 days time-to-sale) should NOT have changed metrics
        baseline_n = baseline.get('time_to_sale_n')
        current_n = time_to_sale.get('n')
        
        print(f"✓ Baseline time-to-sale n: {baseline_n}")
        print(f"✓ Current time-to-sale n: {current_n}")
        
        if baseline_n is not None and current_n is not None:
            if current_n != baseline_n:
                print(f"✗ FAIL: time-to-sale count changed from {baseline_n} to {current_n}")
                print(f"   Self-service lead should be excluded from time-to-sale metrics")
                return False
            print(f"✓ time-to-sale count unchanged (self-service lead excluded)")
        else:
            print(f"⚠ WARNING: Could not compare time-to-sale counts (baseline or current is None)")
            print(f"   This is acceptable if there were no won leads in the baseline")
        
        print("✓ TEST 5 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_6_admin_list():
    """Test 6: ADMIN LIST - QA lead appears with self_service:true"""
    print("\n=== TEST 6: ADMIN LIST ===")
    try:
        url = f"{BASE_URL}/admin/leads?key={ADMIN_KEY}"
        response = requests.get(url, timeout=30)
        print(f"✓ GET /admin/leads status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAIL: Expected 200, got {response.status_code}")
            return False
            
        data = response.json()
        leads = data.get('leads', [])
        
        # Find our self-service lead (first one created)
        if not TEST_LEADS:
            print(f"✗ FAIL: No test leads created")
            return False
            
        selfservice_lead_id = TEST_LEADS[0]
        found = None
        for lead in leads:
            if lead.get('id') == selfservice_lead_id:
                found = lead
                break
        
        if not found:
            print(f"✗ FAIL: Self-service lead {selfservice_lead_id} not found in admin list")
            return False
        print(f"✓ Self-service lead found in admin list")
        
        if not found.get('self_service'):
            print(f"✗ FAIL: self_service not true in admin list")
            return False
        print(f"✓ self_service: true")
        
        if found.get('status') != 'won':
            print(f"✗ FAIL: status is '{found.get('status')}', expected 'won'")
            return False
        print(f"✓ status: won")
        
        print("✓ TEST 6 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_7_regression():
    """Test 7: REGRESSION - Basic endpoints work, control leads have forwarded field"""
    print("\n=== TEST 7: REGRESSION ===")
    try:
        # Test GET /api/
        url = f"{BASE_URL}/"
        response = requests.get(url, timeout=10)
        print(f"✓ GET /api/ status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAIL: GET /api/ returned {response.status_code}")
            return False
        
        # Check control leads have forwarded field
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        if len(TEST_LEADS) >= 3:
            # Check control A (index 1)
            control_a = db.leads.find_one({"id": TEST_LEADS[1]})
            if control_a:
                if 'forwarded' not in control_a:
                    print(f"✗ FAIL: Control A missing 'forwarded' field")
                    return False
                print(f"✓ Control A has 'forwarded' field: {control_a.get('forwarded')}")
            
            # Check control B (index 2)
            control_b = db.leads.find_one({"id": TEST_LEADS[2]})
            if control_b:
                if 'forwarded' not in control_b:
                    print(f"✗ FAIL: Control B missing 'forwarded' field")
                    return False
                print(f"✓ Control B has 'forwarded' field: {control_b.get('forwarded')}")
        
        print("✓ TEST 7 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_8_cleanup(baseline):
    """Test 8: CLEANUP (MANDATORY) - Delete all QA leads and verify baseline restored"""
    print("\n=== TEST 8: CLEANUP (MANDATORY) ===")
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        print(f"✓ Deleting {len(TEST_LEADS)} QA leads...")
        
        for lead_id in TEST_LEADS:
            result = db.leads.delete_one({"id": lead_id})
            if result.deleted_count == 1:
                print(f"✓ Deleted lead {lead_id}")
            else:
                print(f"⚠ WARNING: Lead {lead_id} not found for deletion")
        
        # Verify baseline count restored
        current_count = db.leads.count_documents({})
        baseline_count = baseline.get('baseline_count')
        
        print(f"✓ Baseline count: {baseline_count}")
        print(f"✓ Current count: {current_count}")
        
        if current_count != baseline_count:
            print(f"✗ FAIL: Lead count not restored (expected {baseline_count}, got {current_count})")
            return False
        print(f"✓ Baseline count restored")
        
        # Verify no leads with qa-selfservice emails remain
        qa_leads = list(db.leads.find({"email": {"$regex": f"^qa-selfservice.*{TIMESTAMP}"}}).limit(10))
        if qa_leads:
            print(f"✗ FAIL: {len(qa_leads)} QA leads still exist")
            return False
        print(f"✓ No QA leads with qa-selfservice-{TIMESTAMP} emails remain")
        
        print("✓ TEST 8 PASSED - CLEANUP COMPLETE")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 80)
    print("BACKEND TEST: SELF-SERVICE LEAD FLOW (selvforvaltning)")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    print(f"Timestamp: {TIMESTAMP}")
    print("=" * 80)
    
    results = {}
    
    # Test 1: Baseline
    baseline = test_1_baseline()
    results['test_1_baseline'] = baseline is not None
    
    if not baseline:
        print("\n✗ CRITICAL: Baseline test failed, cannot continue")
        return
    
    # Test 2: Self-service main case
    results['test_2_selfservice'] = test_2_selfservice_main_case(baseline)
    
    # Test 3: Control A (tier without terms)
    results['test_3_control_a'] = test_3_control_a_tier_without_terms()
    
    # Test 4: Control B (full_forvaltning with terms)
    results['test_4_control_b'] = test_4_control_b_full_forvaltning_with_terms()
    
    # Test 5: Velocity exclusion
    results['test_5_velocity'] = test_5_velocity_exclusion(baseline)
    
    # Test 6: Admin list
    results['test_6_admin_list'] = test_6_admin_list()
    
    # Test 7: Regression
    results['test_7_regression'] = test_7_regression()
    
    # Test 8: Cleanup (MANDATORY)
    results['test_8_cleanup'] = test_8_cleanup(baseline)
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({int(passed/total*100)}% success rate)")
    print("=" * 80)
    
    if passed == total:
        print("\n✓ ALL TESTS PASSED - Self-service lead flow working perfectly!")
    else:
        print(f"\n✗ {total - passed} TEST(S) FAILED")
    
    # Verify cleanup was successful
    if not results.get('test_8_cleanup'):
        print("\n⚠ CRITICAL WARNING: CLEANUP FAILED - Manual cleanup required!")
        print(f"   Please manually delete leads with IDs: {TEST_LEADS}")

if __name__ == "__main__":
    main()
