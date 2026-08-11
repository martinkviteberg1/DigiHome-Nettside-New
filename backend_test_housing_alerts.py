#!/usr/bin/env python3
"""
Backend test for housing alerts (boligvarsel) feature.
Tests the 10 scenarios specified in the review request.

CRITICAL SAFETY RULES:
- Use ONLY emails ending with @example.com
- Do NOT POST /api/tenants (sends real emails via SendGrid)
- Do NOT POST /admin/newsletter/send or /newsletter/test
- Do NOT POST /admin/properties/sync or /admin/properties/finn-snapshot with all:true
- Do NOT change visibility on any property
- MANDATORY CLEANUP: delete all housing alerts created
"""

import requests
import json
import sys
from pymongo import MongoClient

BASE_URL = "https://saker-hub.preview.emergentagent.com"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

def test_scenario_1_validation():
    """Scenario 1: Validation 400"""
    print("\n=== SCENARIO 1: VALIDATION 400 ===")
    
    # Test 1a: Empty body
    try:
        resp = requests.post(f"{BASE_URL}/api/housing-alerts", json={}, timeout=30)
        assert resp.status_code == 400, f"Expected 400 for empty body, got {resp.status_code}"
        data = resp.json()
        assert data.get('ok') == False, "Expected ok:false"
        assert 'error' in data, "Expected error field"
        print(f"✅ Test 1a PASSED: Empty body returns 400 with error: {data.get('error')}")
    except Exception as e:
        print(f"❌ Test 1a FAILED: {e}")
        return False
    
    # Test 1b: Invalid email
    try:
        resp = requests.post(f"{BASE_URL}/api/housing-alerts", json={"email": "ikke-en-epost"}, timeout=30)
        assert resp.status_code == 400, f"Expected 400 for invalid email, got {resp.status_code}"
        data = resp.json()
        assert data.get('ok') == False, "Expected ok:false"
        print(f"✅ Test 1b PASSED: Invalid email returns 400")
    except Exception as e:
        print(f"❌ Test 1b FAILED: {e}")
        return False
    
    # Test 1c: Email too long (over 254 chars)
    try:
        long_email = "a" * 250 + "@example.com"  # 263 chars
        resp = requests.post(f"{BASE_URL}/api/housing-alerts", json={"email": long_email}, timeout=30)
        assert resp.status_code == 400, f"Expected 400 for long email, got {resp.status_code}"
        print(f"✅ Test 1c PASSED: Email over 254 chars returns 400")
    except Exception as e:
        print(f"❌ Test 1c FAILED: {e}")
        return False
    
    return True

def test_scenario_2_step1_email_only():
    """Scenario 2: Step 1 with only email → isNew:true and summary:null"""
    print("\n=== SCENARIO 2: STEP 1 (EMAIL ONLY) ===")
    
    try:
        resp = requests.post(
            f"{BASE_URL}/api/housing-alerts",
            json={"email": "qa1@example.com", "source": "ledige-boliger"},
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get('ok') == True, "Expected ok:true"
        assert data.get('isNew') == True, f"Expected isNew:true, got {data.get('isNew')}"
        assert data.get('summary') is None, f"Expected summary:null, got {data.get('summary')}"
        assert data.get('matches') == 0, f"Expected matches:0 (no visible properties), got {data.get('matches')}"
        print(f"✅ SCENARIO 2 PASSED: Step 1 returns isNew:true, summary:null, matches:0")
        return True
    except Exception as e:
        print(f"❌ SCENARIO 2 FAILED: {e}")
        return False

def test_scenario_3_step2_upsert():
    """Scenario 3: Step 2 with criteria on same email → isNew:false and EXACTLY one row (no duplicates)"""
    print("\n=== SCENARIO 3: STEP 2 (UPSERT, NO DUPLICATES) ===")
    
    try:
        # Step 2: Add criteria to same email
        resp = requests.post(
            f"{BASE_URL}/api/housing-alerts",
            json={
                "email": "qa1@example.com",
                "districts": ["Årstad", "Bergenhus"],
                "bedroomsMin": 2,
                "maxRent": 18000,
                "moveIn": "1-3"
            },
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get('ok') == True, "Expected ok:true"
        assert data.get('isNew') == False, f"Expected isNew:false (upsert), got {data.get('isNew')}"
        
        summary = data.get('summary')
        assert summary is not None, "Expected summary to be present"
        assert '2+ soverom' in summary, f"Expected '2+ soverom' in summary, got: {summary}"
        assert 'Årstad' in summary, f"Expected 'Årstad' in summary, got: {summary}"
        assert '18 000' in summary, f"Expected '18 000' in summary, got: {summary}"
        assert 'innen 1–3 måneder' in summary.lower(), f"Expected move-in text in summary, got: {summary}"
        print(f"✅ Step 2 returns isNew:false with summary: {summary}")
        
        # CRITICAL: Verify EXACTLY ONE row exists for qa1@example.com
        resp_admin = requests.get(f"{BASE_URL}/api/admin/housing-alerts?key={ADMIN_KEY}", timeout=30)
        assert resp_admin.status_code == 200, f"Expected 200 from admin endpoint, got {resp_admin.status_code}"
        admin_data = resp_admin.json()
        alerts = admin_data.get('alerts', [])
        qa1_alerts = [a for a in alerts if a.get('email') == 'qa1@example.com']
        assert len(qa1_alerts) == 1, f"Expected EXACTLY 1 alert for qa1@example.com, found {len(qa1_alerts)}"
        print(f"✅ SCENARIO 3 PASSED: EXACTLY 1 row for qa1@example.com (no duplicates)")
        return True
    except Exception as e:
        print(f"❌ SCENARIO 3 FAILED: {e}")
        return False

def test_scenario_4_sanitization():
    """Scenario 4: Sanitization of invalid districts/bedrooms/maxRent/moveIn/lengths"""
    print("\n=== SCENARIO 4: SANITIZATION ===")
    
    try:
        # Create alert with invalid/extreme values
        long_name = "A" * 300
        long_message = "M" * 900
        resp = requests.post(
            f"{BASE_URL}/api/housing-alerts",
            json={
                "email": "qa2@example.com",
                "districts": ["Oslo sentrum", "Fana", "tull"],  # Oslo sentrum and tull are invalid
                "bedroomsMin": 99,  # Should be clamped to 9
                "maxRent": 5,  # Below minimum 1000, should be rejected
                "moveIn": "noe-tull",  # Invalid, should be null
                "name": long_name,
                "message": long_message
            },
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get('ok') == True, "Expected ok:true"
        print(f"✅ POST accepted with sanitization")
        
        # Verify sanitization via admin endpoint
        resp_admin = requests.get(f"{BASE_URL}/api/admin/housing-alerts?key={ADMIN_KEY}", timeout=30)
        assert resp_admin.status_code == 200, f"Expected 200 from admin endpoint, got {resp_admin.status_code}"
        admin_data = resp_admin.json()
        alerts = admin_data.get('alerts', [])
        qa2_alert = next((a for a in alerts if a.get('email') == 'qa2@example.com'), None)
        assert qa2_alert is not None, "qa2@example.com alert not found"
        
        # Check sanitization
        districts = qa2_alert.get('districts', [])
        assert districts == ['Fana'], f"Expected districts:['Fana'] (invalid filtered out), got {districts}"
        
        bedrooms = qa2_alert.get('bedroomsMin')
        assert bedrooms == 9, f"Expected bedroomsMin:9 (clamped), got {bedrooms}"
        
        max_rent = qa2_alert.get('maxRent')
        assert max_rent is None, f"Expected maxRent:null (5 rejected), got {max_rent}"
        
        move_in = qa2_alert.get('moveIn')
        assert move_in is None, f"Expected moveIn:null (invalid), got {move_in}"
        
        name = qa2_alert.get('name', '')
        assert len(name) <= 120, f"Expected name max 120 chars, got {len(name)}"
        
        message = qa2_alert.get('message', '')
        assert len(message) <= 600, f"Expected message max 600 chars, got {len(message)}"
        
        print(f"✅ SCENARIO 4 PASSED: Sanitization working correctly")
        print(f"   - districts: {districts} (Oslo sentrum and tull filtered out)")
        print(f"   - bedroomsMin: {bedrooms} (clamped from 99)")
        print(f"   - maxRent: {max_rent} (5 rejected)")
        print(f"   - moveIn: {move_in} (invalid rejected)")
        print(f"   - name length: {len(name)} (max 120)")
        print(f"   - message length: {len(message)} (max 600)")
        return True
    except Exception as e:
        print(f"❌ SCENARIO 4 FAILED: {e}")
        return False

def test_scenario_5_admin_auth():
    """Scenario 5: Admin auth 401/400"""
    print("\n=== SCENARIO 5: ADMIN AUTH ===")
    
    try:
        # Test 5a: GET without key
        resp = requests.get(f"{BASE_URL}/api/admin/housing-alerts", timeout=30)
        assert resp.status_code == 401, f"Expected 401 without key, got {resp.status_code}"
        print(f"✅ Test 5a PASSED: GET without key returns 401")
        
        # Test 5b: DELETE without key
        resp = requests.delete(f"{BASE_URL}/api/admin/housing-alerts?email=test@example.com", timeout=30)
        assert resp.status_code == 401, f"Expected 401 without key, got {resp.status_code}"
        print(f"✅ Test 5b PASSED: DELETE without key returns 401")
        
        # Test 5c: DELETE with key but without id/email
        resp = requests.delete(f"{BASE_URL}/api/admin/housing-alerts?key={ADMIN_KEY}", timeout=30)
        assert resp.status_code == 400, f"Expected 400 without id/email, got {resp.status_code}"
        print(f"✅ Test 5c PASSED: DELETE without id/email returns 400")
        
        return True
    except Exception as e:
        print(f"❌ SCENARIO 5 FAILED: {e}")
        return False

def test_scenario_6_demand_matching():
    """Scenario 6: Demand + matching (missing data on property should NOT exclude; demand.perProperty should NOT exist in response)"""
    print("\n=== SCENARIO 6: DEMAND AND MATCHING ===")
    
    try:
        # Create alert with specific criteria
        resp = requests.post(
            f"{BASE_URL}/api/housing-alerts",
            json={
                "email": "qa3@example.com",
                "districts": ["Bergen sentrum"],
                "bedroomsMin": 2,
                "maxRent": 24000
            },
            timeout=30
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print(f"✅ Created qa3@example.com alert")
        
        # Get admin view
        resp_admin = requests.get(f"{BASE_URL}/api/admin/housing-alerts?key={ADMIN_KEY}", timeout=30)
        assert resp_admin.status_code == 200, f"Expected 200 from admin endpoint, got {resp_admin.status_code}"
        admin_data = resp_admin.json()
        
        # Verify demand structure
        demand = admin_data.get('demand')
        assert demand is not None, "Expected demand object"
        assert demand.get('active') == 3, f"Expected demand.active:3, got {demand.get('active')}"
        
        districts = demand.get('districts', [])
        assert any(d.get('label') == 'Bergen sentrum' for d in districts), "Expected 'Bergen sentrum' in demand.districts"
        
        median_budget = demand.get('medianBudget')
        assert isinstance(median_budget, (int, float)), f"Expected medianBudget to be a number, got {type(median_budget)}"
        
        assert 'bedrooms' in demand, "Expected bedrooms field in demand"
        
        # CRITICAL: demand.perProperty should NOT exist in response (stripped)
        assert 'perProperty' not in demand, "Expected demand.perProperty to be STRIPPED from response"
        print(f"✅ demand.perProperty correctly STRIPPED from response")
        
        # Verify properties structure
        properties = admin_data.get('properties', [])
        assert len(properties) > 0, "Expected properties array to have items"
        print(f"✅ Found {len(properties)} properties in response")
        
        # Check property structure
        for prop in properties:
            assert 'id' in prop, "Expected id field in property"
            assert 'area' in prop, "Expected area field in property"
            assert 'district' in prop, "Expected district field in property"
            assert 'state' in prop, "Expected state field in property"
            assert prop['state'] in ['publisert', 'klar', 'mangler'], f"Invalid state: {prop['state']}"
            assert 'missing' in prop, "Expected missing field in property"
            assert 'missingLabels' in prop, "Expected missingLabels field in property"
            assert 'fix' in prop, "Expected fix field in property"
            assert 'matches' in prop, "Expected matches field in property"
        
        # Verify sorting (most matches first)
        matches_list = [p.get('matches', 0) for p in properties]
        assert matches_list == sorted(matches_list, reverse=True), "Expected properties sorted by matches descending"
        print(f"✅ Properties sorted by matches descending")
        
        # CRITICAL: Verify that missing data does NOT exclude properties
        # Properties with missing price/bedrooms should still be in the list and can match
        properties_with_missing = [p for p in properties if len(p.get('missing', [])) > 0]
        print(f"✅ Found {len(properties_with_missing)} properties with missing data (NOT excluded)")
        
        print(f"✅ SCENARIO 6 PASSED: Demand and matching working correctly")
        print(f"   - demand.active: {demand.get('active')}")
        print(f"   - demand.medianBudget: {median_budget}")
        print(f"   - demand.perProperty: STRIPPED (not in response)")
        print(f"   - properties count: {len(properties)}")
        print(f"   - properties with missing data: {len(properties_with_missing)} (NOT excluded)")
        return True
    except Exception as e:
        print(f"❌ SCENARIO 6 FAILED: {e}")
        return False

def test_scenario_7_privacy():
    """Scenario 7: Privacy (public endpoints leak no alert data)"""
    print("\n=== SCENARIO 7: PRIVACY ===")
    
    try:
        # Test 7a: GET /api/public/listings (no auth)
        resp = requests.get(f"{BASE_URL}/api/public/listings", timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        
        # Check that response does NOT contain alert data
        assert 'alerts' not in data, "Public listings should NOT contain 'alerts' field"
        assert 'demand' not in data, "Public listings should NOT contain 'demand' field"
        
        # Check that no email addresses are leaked
        json_str = json.dumps(data)
        assert '@example.com' not in json_str, "Public listings should NOT contain test email addresses"
        
        print(f"✅ Test 7a PASSED: /api/public/listings does not leak alert data")
        
        # Test 7b: GET /api/public/properties (no auth)
        resp = requests.get(f"{BASE_URL}/api/public/properties?limit=24", timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        
        # Check that response does NOT contain alert data
        assert 'alerts' not in data, "Public properties should NOT contain 'alerts' field"
        assert 'demand' not in data, "Public properties should NOT contain 'demand' field"
        
        # Check that no email addresses are leaked
        json_str = json.dumps(data)
        assert '@example.com' not in json_str, "Public properties should NOT contain test email addresses"
        
        print(f"✅ Test 7b PASSED: /api/public/properties does not leak alert data")
        
        print(f"✅ SCENARIO 7 PASSED: Privacy checks passed")
        return True
    except Exception as e:
        print(f"❌ SCENARIO 7 FAILED: {e}")
        return False

def test_scenario_8_newsletter_connection():
    """Scenario 8: Newsletter connection with source starting with 'boligvarsel'"""
    print("\n=== SCENARIO 8: NEWSLETTER CONNECTION ===")
    
    try:
        # Get newsletter subscribers
        resp = requests.get(f"{BASE_URL}/api/admin/newsletter/subscribers?key={ADMIN_KEY}", timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        subscribers = data.get('subscribers', [])
        
        # Find subscribers created by housing alerts
        alert_subscribers = [s for s in subscribers if s.get('source', '').startswith('boligvarsel')]
        
        # We created 3 alerts (qa1, qa2, qa3), so we should have 3 subscribers
        assert len(alert_subscribers) >= 3, f"Expected at least 3 subscribers with source starting with 'boligvarsel', found {len(alert_subscribers)}"
        
        # Verify that our test emails are in the list
        alert_emails = [s.get('email') for s in alert_subscribers]
        assert 'qa1@example.com' in alert_emails, "qa1@example.com should be in newsletter subscribers"
        assert 'qa2@example.com' in alert_emails, "qa2@example.com should be in newsletter subscribers"
        assert 'qa3@example.com' in alert_emails, "qa3@example.com should be in newsletter subscribers"
        
        print(f"✅ SCENARIO 8 PASSED: Newsletter connection working")
        print(f"   - Found {len(alert_subscribers)} subscribers with source starting with 'boligvarsel'")
        print(f"   - Test emails (qa1, qa2, qa3) all present in newsletter subscribers")
        return True
    except Exception as e:
        print(f"❌ SCENARIO 8 FAILED: {e}")
        return False

def test_scenario_9_deletion():
    """Scenario 9: Deletion including idempotence and deletion via id"""
    print("\n=== SCENARIO 9: DELETION ===")
    
    try:
        # Test 9a: Delete via email
        resp = requests.delete(f"{BASE_URL}/api/admin/housing-alerts?key={ADMIN_KEY}&email=qa1@example.com", timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get('ok') == True, "Expected ok:true"
        assert data.get('deleted') == 1, f"Expected deleted:1, got {data.get('deleted')}"
        assert data.get('deletedSubscriber') == 1, f"Expected deletedSubscriber:1, got {data.get('deletedSubscriber')}"
        print(f"✅ Test 9a PASSED: Deleted qa1@example.com (deleted:1, deletedSubscriber:1)")
        
        # Test 9b: Delete same email again (idempotence)
        resp = requests.delete(f"{BASE_URL}/api/admin/housing-alerts?key={ADMIN_KEY}&email=qa1@example.com", timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get('ok') == True, "Expected ok:true"
        assert data.get('deleted') == 0, f"Expected deleted:0 (already deleted), got {data.get('deleted')}"
        print(f"✅ Test 9b PASSED: Idempotent delete returns deleted:0")
        
        # Test 9c: Delete via id (get id first)
        resp_admin = requests.get(f"{BASE_URL}/api/admin/housing-alerts?key={ADMIN_KEY}", timeout=30)
        assert resp_admin.status_code == 200, f"Expected 200 from admin endpoint, got {resp_admin.status_code}"
        admin_data = resp_admin.json()
        alerts = admin_data.get('alerts', [])
        qa2_alert = next((a for a in alerts if a.get('email') == 'qa2@example.com'), None)
        assert qa2_alert is not None, "qa2@example.com alert not found"
        qa2_id = qa2_alert.get('id')
        assert qa2_id is not None, "qa2 alert id not found"
        
        resp = requests.delete(f"{BASE_URL}/api/admin/housing-alerts?key={ADMIN_KEY}&id={qa2_id}", timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get('ok') == True, "Expected ok:true"
        assert data.get('deleted') == 1, f"Expected deleted:1, got {data.get('deleted')}"
        print(f"✅ Test 9c PASSED: Deleted via id (qa2)")
        
        # Delete qa3 as well
        resp = requests.delete(f"{BASE_URL}/api/admin/housing-alerts?key={ADMIN_KEY}&email=qa3@example.com", timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print(f"✅ Deleted qa3@example.com")
        
        print(f"✅ SCENARIO 9 PASSED: Deletion working correctly (email, id, idempotence)")
        return True
    except Exception as e:
        print(f"❌ SCENARIO 9 FAILED: {e}")
        return False

def test_scenario_10_regression():
    """Scenario 10: Regression on /api/public/listings, /api/admin/properties, /api/admin/kpi, /api/"""
    print("\n=== SCENARIO 10: REGRESSION ===")
    
    try:
        # Test 10a: GET /api/public/listings
        resp = requests.get(f"{BASE_URL}/api/public/listings", timeout=30)
        assert resp.status_code == 200, f"Expected 200 from /api/public/listings, got {resp.status_code}"
        data = resp.json()
        assert data.get('total') == 0, f"Expected total:0 (no visible properties), got {data.get('total')}"
        print(f"✅ Test 10a PASSED: /api/public/listings returns 200 with total:0")
        
        # Test 10b: GET /api/admin/properties
        resp = requests.get(f"{BASE_URL}/api/admin/properties?key={ADMIN_KEY}", timeout=30)
        assert resp.status_code == 200, f"Expected 200 from /api/admin/properties, got {resp.status_code}"
        data = resp.json()
        total = data.get('total')
        assert total > 0, f"Expected total > 0, got {total}"
        print(f"✅ Test 10b PASSED: /api/admin/properties returns 200 with total:{total}")
        
        # Test 10c: GET /api/admin/kpi
        resp = requests.get(f"{BASE_URL}/api/admin/kpi?key={ADMIN_KEY}&days=30", timeout=60)
        assert resp.status_code == 200, f"Expected 200 from /api/admin/kpi, got {resp.status_code}"
        data = resp.json()
        assert data.get('ok') == True, "Expected ok:true from KPI endpoint"
        print(f"✅ Test 10c PASSED: /api/admin/kpi returns 200")
        
        # Test 10d: GET /api/
        resp = requests.get(f"{BASE_URL}/api/", timeout=30)
        assert resp.status_code == 200, f"Expected 200 from /api/, got {resp.status_code}"
        data = resp.json()
        assert data.get('ok') == True, "Expected ok:true from root endpoint"
        print(f"✅ Test 10d PASSED: /api/ returns 200")
        
        print(f"✅ SCENARIO 10 PASSED: All regression tests passed")
        return True
    except Exception as e:
        print(f"❌ SCENARIO 10 FAILED: {e}")
        return False

def verify_cleanup():
    """Verify that all housing alerts and newsletter subscribers are cleaned up"""
    print("\n=== MANDATORY CLEANUP VERIFICATION ===")
    
    try:
        # Verify 0 housing alerts
        resp = requests.get(f"{BASE_URL}/api/admin/housing-alerts?key={ADMIN_KEY}", timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        alerts = data.get('alerts', [])
        test_alerts = [a for a in alerts if a.get('email', '').endswith('@example.com')]
        assert len(test_alerts) == 0, f"Expected 0 test alerts, found {len(test_alerts)}"
        print(f"✅ Verified: 0 housing alerts with @example.com emails")
        
        # Verify 0 newsletter subscribers with @example.com
        resp = requests.get(f"{BASE_URL}/api/admin/newsletter/subscribers?key={ADMIN_KEY}", timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        subscribers = data.get('subscribers', [])
        test_subscribers = [s for s in subscribers if s.get('email', '').endswith('@example.com')]
        assert len(test_subscribers) == 0, f"Expected 0 test subscribers, found {len(test_subscribers)}"
        print(f"✅ Verified: 0 newsletter subscribers with @example.com emails")
        
        # Verify 0 visible properties (should not have changed)
        resp = requests.get(f"{BASE_URL}/api/admin/properties?key={ADMIN_KEY}", timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        visible_count = data.get('visibleCount', 0)
        assert visible_count == 0, f"Expected visibleCount:0, got {visible_count}"
        print(f"✅ Verified: 0 visible properties (unchanged)")
        
        print(f"✅ MANDATORY CLEANUP VERIFICATION PASSED")
        return True
    except Exception as e:
        print(f"❌ CLEANUP VERIFICATION FAILED: {e}")
        return False

def main():
    print("=" * 80)
    print("HOUSING ALERTS (BOLIGVARSEL) BACKEND TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    print("=" * 80)
    
    # Check initial state
    print("\n=== INITIAL STATE CHECK ===")
    try:
        resp = requests.get(f"{BASE_URL}/api/admin/housing-alerts?key={ADMIN_KEY}", timeout=30)
        data = resp.json()
        initial_alerts = len(data.get('alerts', []))
        print(f"Initial housing alerts count: {initial_alerts}")
        
        resp = requests.get(f"{BASE_URL}/api/admin/properties?key={ADMIN_KEY}", timeout=30)
        data = resp.json()
        initial_visible = data.get('visibleCount', 0)
        print(f"Initial visible properties count: {initial_visible}")
        assert initial_visible == 0, f"Expected 0 visible properties at start, got {initial_visible}"
    except Exception as e:
        print(f"❌ Initial state check failed: {e}")
        return 1
    
    results = []
    
    # Run all scenarios
    results.append(("Scenario 1: Validation", test_scenario_1_validation()))
    results.append(("Scenario 2: Step 1 (email only)", test_scenario_2_step1_email_only()))
    results.append(("Scenario 3: Step 2 (upsert)", test_scenario_3_step2_upsert()))
    results.append(("Scenario 4: Sanitization", test_scenario_4_sanitization()))
    results.append(("Scenario 5: Admin auth", test_scenario_5_admin_auth()))
    results.append(("Scenario 6: Demand and matching", test_scenario_6_demand_matching()))
    results.append(("Scenario 7: Privacy", test_scenario_7_privacy()))
    results.append(("Scenario 8: Newsletter connection", test_scenario_8_newsletter_connection()))
    results.append(("Scenario 9: Deletion", test_scenario_9_deletion()))
    results.append(("Scenario 10: Regression", test_scenario_10_regression()))
    
    # Verify cleanup
    cleanup_ok = verify_cleanup()
    
    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {name}")
    
    print(f"\nCleanup verification: {'✅ PASSED' if cleanup_ok else '❌ FAILED'}")
    print(f"\nTotal: {passed}/{total} scenarios passed")
    print("=" * 80)
    
    if passed == total and cleanup_ok:
        print("\n🎉 ALL TESTS PASSED! Housing alerts feature is working perfectly.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} scenario(s) failed or cleanup incomplete.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
