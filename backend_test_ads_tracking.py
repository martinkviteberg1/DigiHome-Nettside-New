#!/usr/bin/env python3
"""
Backend test for ANNONSESPORING + LUKKET SLØYFE (Ad Tracking + Closed Loop)
Tests event type storage, closed loop logging, paid funnel, KPI CPL split, and landing pages.
"""

import requests
import json
import time
import uuid
from datetime import datetime
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test data
SESSION_ID = f"qa-ads-tracking-{uuid.uuid4().hex[:8]}"
TEST_EMAIL = f"qa-ads-tracking-{uuid.uuid4().hex[:8]}@example.com"

# MongoDB connection
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Track created resources for cleanup
created_lead_ids = []
created_event_ids = []

def log_test(message):
    """Print test message with timestamp"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def test_event_types_stored_correctly():
    """Test that different event types are stored with correct type (not renamed to pageview)"""
    log_test("TEST 1: Event types stored correctly")
    
    # Use a real browser user-agent (critical - bot UA gets filtered)
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    event_types = [
        ("call_click", {}),
        ("consent_choice", {"choice": "all"}),
        ("consent_view", {}),
        ("cta_click", {}),
        ("form_error", {}),
        ("wizard_step", {})
    ]
    
    # POST each event type
    for event_type, meta in event_types:
        payload = {
            "type": event_type,
            "sessionId": SESSION_ID,
            "source": "meta",
            "medium": "cpc",
            "meta": meta
        }
        
        response = requests.post(f"{BASE_URL}/api/track", json=payload, headers=headers)
        assert response.status_code in [200, 204], f"POST /api/track type={event_type} failed: {response.status_code}"
        log_test(f"  ✓ POST /api/track type={event_type} accepted")
    
    # Wait for events to be written
    time.sleep(1)
    
    # Verify events in MongoDB
    events = list(db.events.find({"sessionId": SESSION_ID}))
    assert len(events) == 6, f"Expected 6 events, found {len(events)}"
    
    stored_types = [e["type"] for e in events]
    log_test(f"  Stored types: {', '.join(stored_types)}")
    
    # Verify each type is stored correctly (not renamed to pageview)
    for event_type, _ in event_types:
        matching_events = [e for e in events if e["type"] == event_type]
        assert len(matching_events) == 1, f"Expected 1 event with type={event_type}, found {len(matching_events)}"
        log_test(f"  ✓ '{event_type}' stored with correct type (not renamed to pageview)")
        
        # Track for cleanup
        created_event_ids.append(matching_events[0]["_id"])
    
    # Verify consent_choice preserves meta.choice
    consent_events = [e for e in events if e["type"] == "consent_choice"]
    assert len(consent_events) == 1, "Expected 1 consent_choice event"
    assert consent_events[0].get("meta", {}).get("choice") == "all", "consent_choice should preserve meta.choice='all'"
    log_test("  ✓ consent_choice preserves meta.choice='all'")
    
    log_test("✅ TEST 1 PASSED: All event types stored correctly\n")

def test_closed_loop_always_logs_outcome():
    """Test that closed loop always logs googleAdsWon, metaCapiWon, ga4Won with testlead reason"""
    log_test("TEST 2: Closed loop always logs outcome")
    
    # Create a test lead
    lead_payload = {
        "name": "QA Ads Tracking Test",
        "email": TEST_EMAIL,
        "phone": "+4790000001",
        "address": "Testveien 1, 5003 Bergen",
        "lead_type": "huseier",
        "source": "qa-ads-tracking"
    }
    
    response = requests.post(f"{BASE_URL}/api/leads", json=lead_payload)
    assert response.status_code == 201, f"POST /api/leads failed: {response.status_code}"
    lead_data = response.json()
    lead_id = lead_data.get("data", {}).get("id") or lead_data.get("lead", {}).get("id")
    assert lead_id, "Lead ID not found in response"
    created_lead_ids.append(lead_id)
    log_test(f"  ✓ Lead created with id={lead_id}")
    
    # Set status to won
    won_payload = {
        "id": lead_id,
        "status": "won",
        "value": 26350
    }
    
    response = requests.post(f"{BASE_URL}/api/admin/lead-status?key={ADMIN_KEY}", json=won_payload)
    assert response.status_code == 200, f"POST /api/admin/lead-status failed: {response.status_code}"
    result = response.json()
    
    # Debug: print response
    log_test(f"  DEBUG: Response keys: {list(result.keys())}")
    if "conversions" in result:
        log_test(f"  DEBUG: Conversions keys: {list(result['conversions'].keys())}")
    
    # Verify response contains conversions object
    assert "conversions" in result, "Response should contain conversions object"
    conversions = result["conversions"]
    log_test("  ✓ Response contains conversions object")
    
    # Verify all three signals are logged
    assert "google" in conversions, "google should be logged"
    assert "meta" in conversions, "meta should be logged"
    assert "ga4" in conversions, "ga4 should be logged"
    log_test("  ✓ All three signals (google, meta, ga4) are logged")
    
    # Verify testlead reason (not ok=true)
    google_won = conversions["google"]
    meta_won = conversions["meta"]
    ga4_won = conversions["ga4"]
    
    assert google_won.get("skipped") == True, "google should have skipped=true"
    assert google_won.get("reason") == "testlead", "google should have reason='testlead'"
    assert google_won.get("ok") != True, "google should NOT have ok=true (testlead)"
    log_test("  ✓ google: skipped=true, reason='testlead', ok!=true")
    
    assert meta_won.get("skipped") == True, "meta should have skipped=true"
    assert meta_won.get("reason") == "testlead", "meta should have reason='testlead'"
    assert meta_won.get("ok") != True, "meta should NOT have ok=true (testlead)"
    log_test("  ✓ meta: skipped=true, reason='testlead', ok!=true")
    
    assert ga4_won.get("skipped") == True, "ga4 should have skipped=true"
    assert ga4_won.get("reason") == "testlead", "ga4 should have reason='testlead'"
    assert ga4_won.get("ok") != True, "ga4 should NOT have ok=true (testlead)"
    log_test("  ✓ ga4: skipped=true, reason='testlead', ok!=true")
    
    # Verify in MongoDB
    lead_doc = db.leads.find_one({"id": lead_id})
    assert lead_doc, "Lead not found in MongoDB"
    # Check for either old field names or new field names
    has_google = "googleAdsWon" in lead_doc or "google_won" in lead_doc
    has_meta = "metaCapiWon" in lead_doc or "meta_won" in lead_doc
    has_ga4 = "ga4Won" in lead_doc or "ga4_won" in lead_doc
    assert has_google, "Lead should have google won field"
    assert has_meta, "Lead should have meta won field"
    assert has_ga4, "Lead should have ga4 won field"
    log_test("  ✓ All three signal fields present in MongoDB lead document")
    
    log_test("✅ TEST 2 PASSED: Closed loop always logs outcome with testlead reason\n")

def test_gclid_with_testlead():
    """Test that leads with gclid still get reason='testlead' (not 'mangler_gclid')"""
    log_test("TEST 3: GCLID with testlead")
    
    # Create a test lead with gclid
    lead_payload = {
        "name": "QA Ads Tracking GCLID Test",
        "email": f"qa-gclid-{uuid.uuid4().hex[:8]}@example.com",
        "phone": "+4790000002",
        "address": "Testveien 2, 5003 Bergen",
        "lead_type": "huseier",
        "source": "qa-ads-tracking",
        "attribution": {
            "source": "google",
            "medium": "cpc",
            "gclid": f"QA_GCLID_{int(time.time())}"
        }
    }
    
    response = requests.post(f"{BASE_URL}/api/leads", json=lead_payload)
    assert response.status_code == 201, f"POST /api/leads failed: {response.status_code}"
    lead_data = response.json()
    lead_id = lead_data.get("data", {}).get("id") or lead_data.get("lead", {}).get("id")
    assert lead_id, "Lead ID not found in response"
    created_lead_ids.append(lead_id)
    log_test(f"  ✓ Lead with gclid created with id={lead_id}")
    
    # Set status to won
    won_payload = {
        "id": lead_id,
        "status": "won",
        "value": 26350
    }
    
    response = requests.post(f"{BASE_URL}/api/admin/lead-status?key={ADMIN_KEY}", json=won_payload)
    assert response.status_code == 200, f"POST /api/admin/lead-status failed: {response.status_code}"
    result = response.json()
    
    # Verify google has reason='testlead' (NOT 'mangler_gclid')
    conversions = result.get("conversions", {})
    google_won = conversions.get("google", {})
    
    assert google_won.get("reason") == "testlead", f"Expected reason='testlead', got '{google_won.get('reason')}'"
    assert google_won.get("reason") != "mangler_gclid", "Should NOT have reason='mangler_gclid' when gclid exists"
    log_test("  ✓ google has reason='testlead' (NOT 'mangler_gclid')")
    log_test("  ✓ Testlead guard has higher priority than gclid check")
    
    log_test("✅ TEST 3 PASSED: GCLID with testlead works correctly\n")

def test_idempotency():
    """Test that setting status='won' twice doesn't crash or create inconsistent signals"""
    log_test("TEST 4: Idempotency")
    
    # Use the first lead from test 2
    if not created_lead_ids:
        log_test("  ⚠ Skipping idempotency test (no leads created)")
        return
    
    lead_id = created_lead_ids[0]
    
    # Set status to won again
    won_payload = {
        "id": lead_id,
        "status": "won",
        "value": 30000
    }
    
    response = requests.post(f"{BASE_URL}/api/admin/lead-status?key={ADMIN_KEY}", json=won_payload)
    assert response.status_code == 200, f"Second POST /api/admin/lead-status failed: {response.status_code}"
    log_test("  ✓ Second status='won' call succeeded (no crash)")
    
    # Verify lead document is consistent
    lead_doc = db.leads.find_one({"id": lead_id})
    assert lead_doc, "Lead not found in MongoDB"
    
    # All three signal fields should still exist and be consistent
    has_google = "googleAdsWon" in lead_doc or "google_won" in lead_doc
    has_meta = "metaCapiWon" in lead_doc or "meta_won" in lead_doc
    has_ga4 = "ga4Won" in lead_doc or "ga4_won" in lead_doc
    assert has_google, "google won field should still exist"
    assert has_meta, "meta won field should still exist"
    assert has_ga4, "ga4 won field should still exist"
    
    # Get the actual field names
    google_field = "googleAdsWon" if "googleAdsWon" in lead_doc else "google_won"
    meta_field = "metaCapiWon" if "metaCapiWon" in lead_doc else "meta_won"
    ga4_field = "ga4Won" if "ga4Won" in lead_doc else "ga4_won"
    
    # All should have skipped=true and reason='testlead'
    assert lead_doc[google_field].get("skipped") == True, "google should still have skipped=true"
    assert lead_doc[meta_field].get("skipped") == True, "meta should still have skipped=true"
    assert lead_doc[ga4_field].get("skipped") == True, "ga4 should still have skipped=true"
    log_test("  ✓ Signal objects remain consistent after second call")
    
    log_test("✅ TEST 4 PASSED: Idempotency works correctly\n")

def test_paid_funnel():
    """Test that GET /api/admin/analytics has new paid funnel fields"""
    log_test("TEST 5: Paid funnel with new fields")
    
    response = requests.get(f"{BASE_URL}/api/admin/analytics?key={ADMIN_KEY}&days=30")
    assert response.status_code == 200, f"GET /api/admin/analytics failed: {response.status_code}"
    data = response.json()
    
    assert "paid" in data, "Response should have 'paid' field"
    paid = data["paid"]
    
    assert "channels" in paid, "paid should have 'channels' array"
    channels = paid["channels"]
    
    # Find meta channel
    meta_channel = next((ch for ch in channels if ch.get("key") == "meta"), None)
    assert meta_channel, "Meta channel not found in paid funnel"
    log_test("  ✓ Meta channel found in paid funnel")
    
    # Verify new fields exist
    required_fields = ["calls", "consentGranted", "consentDenied", "consentRate", "contacts", "costPerContact", "costPerCall"]
    for field in required_fields:
        assert field in meta_channel, f"Meta channel should have '{field}' field"
        log_test(f"  ✓ Meta channel has '{field}' field")
    
    # Verify consentRate is calculated (should be a number or null)
    consent_rate = meta_channel.get("consentRate")
    assert consent_rate is None or isinstance(consent_rate, (int, float)), "consentRate should be number or null"
    log_test(f"  ✓ consentRate is calculated: {consent_rate}")
    
    # Verify calls field (from our test events)
    calls = meta_channel.get("calls", 0)
    assert isinstance(calls, int), "calls should be an integer"
    log_test(f"  ✓ calls field is numeric: {calls}")
    
    log_test("✅ TEST 5 PASSED: Paid funnel has all new fields\n")

def test_kpi_cpl_split():
    """Test that GET /api/admin/kpi has hero.cpl with paid/paidLeads/allLeads/organicLeads"""
    log_test("TEST 6: KPI CPL split")
    
    response = requests.get(f"{BASE_URL}/api/admin/kpi?key={ADMIN_KEY}&days=30")
    assert response.status_code == 200, f"GET /api/admin/kpi failed: {response.status_code}"
    data = response.json()
    
    assert "hero" in data, "Response should have 'hero' field"
    hero = data["hero"]
    
    assert "cpl" in hero, "hero should have 'cpl' field"
    cpl = hero["cpl"]
    
    # Verify required fields
    required_fields = ["value", "paid", "paidLeads", "allLeads", "organicLeads", "basis"]
    for field in required_fields:
        assert field in cpl, f"hero.cpl should have '{field}' field"
        log_test(f"  ✓ hero.cpl has '{field}' field")
    
    # Verify values are reasonable
    assert isinstance(cpl["value"], (int, float)), "cpl.value should be numeric"
    assert isinstance(cpl["paid"], (int, float)), "cpl.paid should be numeric"
    assert isinstance(cpl["paidLeads"], int), "cpl.paidLeads should be integer"
    assert isinstance(cpl["allLeads"], int), "cpl.allLeads should be integer"
    assert isinstance(cpl["organicLeads"], int), "cpl.organicLeads should be integer"
    assert isinstance(cpl["basis"], str), "cpl.basis should be string"
    
    # Verify math: paidLeads + organicLeads should equal allLeads
    assert cpl["paidLeads"] + cpl["organicLeads"] == cpl["allLeads"], \
        f"paidLeads ({cpl['paidLeads']}) + organicLeads ({cpl['organicLeads']}) should equal allLeads ({cpl['allLeads']})"
    log_test(f"  ✓ Math check: paidLeads ({cpl['paidLeads']}) + organicLeads ({cpl['organicLeads']}) = allLeads ({cpl['allLeads']})")
    
    # Verify paidLeads <= allLeads
    assert cpl["paidLeads"] <= cpl["allLeads"], "paidLeads should be <= allLeads"
    log_test(f"  ✓ paidLeads ({cpl['paidLeads']}) <= allLeads ({cpl['allLeads']})")
    
    log_test("✅ TEST 6 PASSED: KPI CPL split working correctly\n")

def test_landing_pages():
    """Test landing pages: /lp/gratis-vurdering and regression for other pages"""
    log_test("TEST 7: Landing pages")
    
    # Test /lp/gratis-vurdering
    response = requests.get(f"{BASE_URL}/lp/gratis-vurdering")
    assert response.status_code == 200, f"GET /lp/gratis-vurdering failed: {response.status_code}"
    html = response.text
    
    # Verify content
    assert "Hva kan boligen din tjene i leie?" in html or "gratis" in html.lower(), \
        "Page should contain expected heading about rental valuation"
    log_test("  ✓ /lp/gratis-vurdering has expected content")
    
    # Verify noindex
    assert "noindex" in html.lower(), "Page should have noindex meta tag"
    log_test("  ✓ /lp/gratis-vurdering has noindex")
    
    # Verify has address field (form)
    assert "address" in html.lower() or "adresse" in html.lower(), "Page should have address field"
    log_test("  ✓ /lp/gratis-vurdering has address field")
    
    # Regression: Test other landing pages
    other_pages = ["/lp/inntekt", "/lp/forvaltning", "/lp/10pluss2", "/lp/sammenlign"]
    for page in other_pages:
        response = requests.get(f"{BASE_URL}{page}")
        assert response.status_code == 200, f"GET {page} failed: {response.status_code}"
        log_test(f"  ✓ {page} returns 200 (regression)")
    
    log_test("✅ TEST 7 PASSED: All landing pages working\n")

def test_regression():
    """Test regression: various endpoints should still work"""
    log_test("TEST 8: Regression tests")
    
    # GET /api/public/listings
    response = requests.get(f"{BASE_URL}/api/public/listings")
    assert response.status_code == 200, "GET /api/public/listings failed"
    log_test("  ✓ GET /api/public/listings returns 200")
    
    # GET /api/admin/leads
    response = requests.get(f"{BASE_URL}/api/admin/leads?key={ADMIN_KEY}")
    assert response.status_code == 200, "GET /api/admin/leads failed"
    log_test("  ✓ GET /api/admin/leads returns 200")
    
    # GET /api/brreg
    response = requests.get(f"{BASE_URL}/api/brreg?q=DNB")
    assert response.status_code == 200, "GET /api/brreg failed"
    data = response.json()
    assert len(data.get("items", [])) > 0, "Should return DNB results"
    assert data["items"][0]["name"] == "DNB BANK ASA", "First result should be DNB BANK ASA"
    log_test("  ✓ GET /api/brreg returns 200 with DNB BANK ASA as first result")
    
    # POST /api/tenants
    tenant_payload = {
        "name": "QA Regression Test",
        "email": f"qa-regression-{uuid.uuid4().hex[:8]}@example.com",
        "phone": "+4790000003",
        "bedrooms": 1
    }
    response = requests.post(f"{BASE_URL}/api/tenants", json=tenant_payload)
    assert response.status_code in [200, 201], f"POST /api/tenants failed: {response.status_code}"
    tenant_data = response.json()
    tenant_id = tenant_data.get("data", {}).get("id") or tenant_data.get("id")
    if tenant_id:
        created_lead_ids.append(tenant_id)
    log_test("  ✓ POST /api/tenants returns 200/201")
    
    # GET /api/admin/notify-status
    response = requests.get(f"{BASE_URL}/api/admin/notify-status?key={ADMIN_KEY}")
    assert response.status_code == 200, "GET /api/admin/notify-status failed"
    log_test("  ✓ GET /api/admin/notify-status returns 200")
    
    # GET /api/admin/notify-status without key (should be 401)
    response = requests.get(f"{BASE_URL}/api/admin/notify-status")
    assert response.status_code == 401, "GET /api/admin/notify-status without key should return 401"
    log_test("  ✓ GET /api/admin/notify-status without key returns 401")
    
    # GET /api/property-interest/outbox
    response = requests.get(f"{BASE_URL}/api/property-interest/outbox?key={ADMIN_KEY}&status=alle")
    assert response.status_code == 200, "GET /api/property-interest/outbox failed"
    log_test("  ✓ GET /api/property-interest/outbox returns 200")
    
    log_test("✅ TEST 8 PASSED: All regression tests passed\n")

def cleanup():
    """Clean up all test data"""
    log_test("CLEANUP: Removing test data")
    
    # Delete test leads
    for lead_id in created_lead_ids:
        try:
            # Try to delete via API first
            response = requests.post(
                f"{BASE_URL}/api/admin/leads/delete?key={ADMIN_KEY}",
                json={"id": lead_id, "type": "huseier", "confirm": "SLETT"}
            )
            if response.status_code == 200:
                log_test(f"  ✓ Deleted lead {lead_id} via API")
            else:
                # Fallback to MongoDB
                result = db.leads.delete_one({"id": lead_id})
                if result.deleted_count > 0:
                    log_test(f"  ✓ Deleted lead {lead_id} via MongoDB")
        except Exception as e:
            log_test(f"  ⚠ Failed to delete lead {lead_id}: {e}")
    
    # Also try tenant_leads collection
    for lead_id in created_lead_ids:
        try:
            result = db.tenant_leads.delete_one({"id": lead_id})
            if result.deleted_count > 0:
                log_test(f"  ✓ Deleted tenant {lead_id} from tenant_leads")
        except Exception as e:
            pass
    
    # Delete test events
    if created_event_ids:
        try:
            result = db.events.delete_many({"_id": {"$in": created_event_ids}})
            log_test(f"  ✓ Deleted {result.deleted_count} test events")
        except Exception as e:
            log_test(f"  ⚠ Failed to delete events: {e}")
    
    # Delete events by sessionId
    try:
        result = db.events.delete_many({"sessionId": SESSION_ID})
        log_test(f"  ✓ Deleted {result.deleted_count} events by sessionId")
    except Exception as e:
        log_test(f"  ⚠ Failed to delete events by sessionId: {e}")
    
    # Verify no test data remains
    remaining_leads = db.leads.count_documents({"email": {"$regex": "qa-ads-tracking.*@example.com"}})
    remaining_tenants = db.tenant_leads.count_documents({"email": {"$regex": "qa-.*@example.com"}})
    remaining_events = db.events.count_documents({"sessionId": SESSION_ID})
    
    if remaining_leads == 0 and remaining_tenants == 0 and remaining_events == 0:
        log_test("  ✓ All test data cleaned up successfully")
    else:
        log_test(f"  ⚠ Some test data remains: {remaining_leads} leads, {remaining_tenants} tenants, {remaining_events} events")
    
    log_test("✅ CLEANUP COMPLETE\n")

def main():
    """Run all tests"""
    log_test("=" * 80)
    log_test("BACKEND TEST: ANNONSESPORING + LUKKET SLØYFE")
    log_test(f"Base URL: {BASE_URL}")
    log_test(f"Admin key: {ADMIN_KEY}")
    log_test(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    log_test(f"Session ID: {SESSION_ID}")
    log_test(f"Test email: {TEST_EMAIL}")
    log_test("=" * 80)
    log_test("")
    
    try:
        # Run all tests
        test_event_types_stored_correctly()
        test_closed_loop_always_logs_outcome()
        test_gclid_with_testlead()
        test_idempotency()
        test_paid_funnel()
        test_kpi_cpl_split()
        test_landing_pages()
        test_regression()
        
        log_test("=" * 80)
        log_test("✅ ALL TESTS PASSED (8/8)")
        log_test("=" * 80)
        
    except AssertionError as e:
        log_test(f"\n❌ TEST FAILED: {e}")
        raise
    except Exception as e:
        log_test(f"\n❌ UNEXPECTED ERROR: {e}")
        raise
    finally:
        # Always clean up
        cleanup()

if __name__ == "__main__":
    main()
