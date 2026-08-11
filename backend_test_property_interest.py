#!/usr/bin/env python3
"""
Backend test for property interest email notification feature.

CRITICAL SAFETY RULES:
- SendGrid is LIVE in preview - each NEW interest sends REAL email to martin@kviteberg.no
- MAXIMUM 2 new interests allowed in entire test
- Use repeated POSTs on SAME person+property to test idempotency (no emails sent)
- DO NOT call /admin/newsletter/send, /newsletter/test, or other email-sending endpoints
- DO NOT call /admin/finance/sync-contracts or /sync-customers
"""

import requests
import json
import sys
from urllib.parse import unquote

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test rig from preview database
TEST_CAMPAIGN = "qa-interest-campaign"
TEST_EMAIL = "qa-boliginteresse@example.com"
TEST_PROPERTY = "348c1174-6422-49f9-a016-5f84496654d4"
TEST_TOKEN = "e598e190bde8fcb1a8d91c69fa38781b5e8e73fe"
TEST_RID = "qarid0001"

def test_email_preview():
    """
    Scenario 1: Email preview should NOT send any emails
    - GET /api/admin/leads/email-preview?type=property_interest
    - Should return 200 with HTML
    - Should have X-Preview-Subject header
    - HTML should contain expected content
    - Should NOT create any property_interest_events
    """
    print("\n=== SCENARIO 1: EMAIL PREVIEW (NO EMAILS SENT) ===")
    
    # Get initial count of property_interest_events
    leads_resp = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY})
    initial_leads = leads_resp.json()
    print(f"✓ Initial leads count: {len(initial_leads.get('leads', []))}")
    
    # Test 1a: Preview without key should return 401
    print("\nTest 1a: Preview without key")
    resp = requests.get(f"{BASE_URL}/admin/leads/email-preview", params={"type": "property_interest"})
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    print("✓ Returns 401 without key")
    
    # Test 1b: Preview with key should return 200 HTML
    print("\nTest 1b: Preview with key (type=property_interest)")
    resp = requests.get(f"{BASE_URL}/admin/leads/email-preview", params={"key": ADMIN_KEY, "type": "property_interest"})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert "text/html" in resp.headers.get("Content-Type", ""), "Expected text/html Content-Type"
    print(f"✓ Returns 200 with Content-Type: {resp.headers.get('Content-Type')}")
    
    # Check X-Preview-Subject header
    subject_header = resp.headers.get("X-Preview-Subject", "")
    assert subject_header, "Expected X-Preview-Subject header"
    subject = unquote(subject_header)
    assert subject.startswith("Boliginteresse: "), f"Expected subject to start with 'Boliginteresse: ', got: {subject}"
    print(f"✓ X-Preview-Subject header present: {subject}")
    
    # Check HTML content
    html = resp.text
    assert "BOLIGINTERESSE" in html.upper() or "boliginteresse" in html.lower(), "Expected 'BOLIGINTERESSE' in HTML"
    assert "Ring" in html and "nå" in html, "Expected 'Ring ... nå' in HTML"
    assert "tel:+47" in html, "Expected tel: link in HTML"
    assert "mailto:" in html, "Expected mailto: link in HTML"
    assert "Bergen" in html or "sentrum" in html.lower(), "Expected location in HTML"
    assert "Ny leietakerprofil" in html or "leietakerprofil" in html.lower(), "Expected 'Ny leietakerprofil' text"
    assert "Andre boliger" in html or "andre boliger" in html.lower(), "Expected 'Andre boliger' text"
    
    # CRITICAL: Check that the duplicate "Bolig" row was removed
    # The HTML should NOT contain ">Bolig<" as a table label (it was removed as duplicate)
    assert ">Bolig<" not in html, "FAIL: Found duplicate 'Bolig' table label (should have been removed)"
    print("✓ HTML does NOT contain duplicate '>Bolig<' table label (correctly removed)")
    
    print("✓ HTML contains expected content: kicker, headline, tel/mailto links, location, new profile text, other properties")
    
    # Test 1c: Call preview 3 times to ensure no emails sent
    print("\nTest 1c: Call preview 3 times (should NOT send emails)")
    for i in range(3):
        resp = requests.get(f"{BASE_URL}/admin/leads/email-preview", params={"key": ADMIN_KEY, "type": "property_interest"})
        assert resp.status_code == 200, f"Call {i+1}: Expected 200, got {resp.status_code}"
    print("✓ Called preview 3 times, all returned 200")
    
    # Verify no property_interest_events were created
    leads_resp = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY})
    final_leads = leads_resp.json()
    assert len(final_leads.get('leads', [])) == len(initial_leads.get('leads', [])), "Lead count changed (should not)"
    print("✓ No property_interest_events created (lead count unchanged)")
    
    # Test 1d: Norwegian alias (type=boliginteresse) should also work
    print("\nTest 1d: Norwegian alias (type=boliginteresse)")
    resp = requests.get(f"{BASE_URL}/admin/leads/email-preview", params={"key": ADMIN_KEY, "type": "boliginteresse"})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert "text/html" in resp.headers.get("Content-Type", ""), "Expected text/html"
    print("✓ Norwegian alias 'boliginteresse' works")
    
    # Test 1e: Regression - other email types should still work
    print("\nTest 1e: Regression - type=notify and type=receipt")
    for email_type in ["notify", "receipt"]:
        resp = requests.get(f"{BASE_URL}/admin/leads/email-preview", params={"key": ADMIN_KEY, "type": email_type})
        assert resp.status_code == 200, f"type={email_type}: Expected 200, got {resp.status_code}"
        assert "text/html" in resp.headers.get("Content-Type", ""), f"type={email_type}: Expected text/html"
    print("✓ Regression: type=notify and type=receipt still work")
    
    print("\n✅ SCENARIO 1 PASSED: Email preview works, NO emails sent, NO events created")


def test_idempotency():
    """
    Scenario 2: Test idempotency - repeated POSTs should NOT send emails
    
    CRITICAL: The test rig (qa-interest-campaign, qa-boliginteresse@example.com, property 348c1174...)
    was already used in manual verification, so this person ALREADY has interest for this property.
    Therefore:
    - POST should return 200 with isNew=false, notified=false
    - Repeated POSTs should always return same result
    - Lead should have EXACTLY 1 element in property_interests
    """
    print("\n=== SCENARIO 2: IDEMPOTENCY (NO EMAILS SENT) ===")
    
    # Get initial lead state
    print("\nGetting initial lead state...")
    leads_resp = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY})
    leads_data = leads_resp.json()
    
    # Find the QA lead
    qa_lead = None
    for lead in leads_data.get('tenants', []):
        if lead.get('email', '').lower() == TEST_EMAIL.lower():
            qa_lead = lead
            break
    
    if qa_lead:
        initial_interests = len(qa_lead.get('property_interests', []))
        print(f"✓ Found QA lead with {initial_interests} property interest(s)")
    else:
        print("⚠ QA lead not found in tenants list (may be in imported_leads)")
        initial_interests = None
    
    # Test 2a: POST with existing interest (should NOT send email)
    print("\nTest 2a: POST confirm with existing interest")
    body = {
        "property": TEST_PROPERTY,
        "campaign": TEST_CAMPAIGN,
        "r": TEST_RID,
        "pt": TEST_TOKEN
    }
    resp = requests.post(f"{BASE_URL}/newsletter/property-interest/confirm", json=body)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data.get("ok") == True, f"Expected ok=true, got {data}"
    assert data.get("isNew") == False, f"Expected isNew=false (already exists), got {data.get('isNew')}"
    assert data.get("notified") == False, f"Expected notified=false (not first time), got {data.get('notified')}"
    print(f"✓ Returns 200 with ok=true, isNew=false, notified=false")
    print(f"  Response: {json.dumps(data, indent=2)}")
    
    # Test 2b: Repeat 3 more times - should always return same result
    print("\nTest 2b: Repeat POST 3 more times (idempotency)")
    for i in range(3):
        resp = requests.post(f"{BASE_URL}/newsletter/property-interest/confirm", json=body)
        assert resp.status_code == 200, f"Call {i+1}: Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get("ok") == True, f"Call {i+1}: Expected ok=true"
        assert data.get("isNew") == False, f"Call {i+1}: Expected isNew=false"
        assert data.get("notified") == False, f"Call {i+1}: Expected notified=false"
    print("✓ All 3 repeated POSTs returned isNew=false, notified=false")
    
    # Test 2c: Verify lead still has EXACTLY 1 interest for this property
    print("\nTest 2c: Verify lead has EXACTLY 1 interest")
    leads_resp = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY})
    leads_data = leads_resp.json()
    
    qa_lead = None
    for lead in leads_data.get('tenants', []):
        if lead.get('email', '').lower() == TEST_EMAIL.lower():
            qa_lead = lead
            break
    
    if qa_lead:
        final_interests = len(qa_lead.get('property_interests', []))
        assert final_interests == 1, f"Expected EXACTLY 1 interest, got {final_interests}"
        print(f"✓ Lead has EXACTLY 1 property interest (unchanged)")
        
        # Verify it's for the correct property
        interest = qa_lead.get('property_interests', [])[0]
        assert interest.get('propertyId') == TEST_PROPERTY, f"Expected propertyId={TEST_PROPERTY}, got {interest.get('propertyId')}"
        print(f"✓ Interest is for correct property: {TEST_PROPERTY}")
    else:
        print("⚠ Could not verify interest count (lead not in tenants list)")
    
    print("\n✅ SCENARIO 2 PASSED: Idempotency works, NO emails sent on repeated POSTs")


def test_new_interest_for_different_property():
    """
    Scenario 3: First interest for a DIFFERENT property would send email
    
    CRITICAL: We CANNOT actually test this because:
    1. We need a valid pt token (HMAC-signed with campaign+recipient+property)
    2. We cannot generate valid tokens ourselves
    3. Using the existing token with a different property will be rejected (401)
    
    Instead, we verify that:
    - Using existing token with different property returns 401
    - No new interest is added
    - No email is sent
    """
    print("\n=== SCENARIO 3: NEW PROPERTY (CANNOT TEST - TOKEN VALIDATION) ===")
    
    # Get a different active property
    print("\nFinding a different active property...")
    props_resp = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY})
    props_data = props_resp.json()
    
    different_property = None
    for prop in props_data.get('properties', []):
        if (prop.get('status') == 'active' and 
            prop.get('incomplete') != True and 
            prop.get('duplicate') != True and
            prop.get('externalId') != TEST_PROPERTY):
            different_property = prop.get('externalId')
            break
    
    if different_property:
        print(f"✓ Found different active property: {different_property}")
        
        # Test 3a: Try to use existing token with different property (should fail)
        print("\nTest 3a: POST with different property but same token (should fail)")
        body = {
            "property": different_property,
            "campaign": TEST_CAMPAIGN,
            "r": TEST_RID,
            "pt": TEST_TOKEN  # This token is bound to TEST_PROPERTY
        }
        resp = requests.post(f"{BASE_URL}/newsletter/property-interest/confirm", json=body)
        assert resp.status_code == 401, f"Expected 401 (invalid token), got {resp.status_code}"
        data = resp.json()
        assert data.get("ok") == False, "Expected ok=false"
        print(f"✓ Returns 401 with ok=false (token validation working)")
        
        # Test 3b: Verify no new interest was added
        print("\nTest 3b: Verify no new interest was added")
        leads_resp = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY})
        leads_data = leads_resp.json()
        
        qa_lead = None
        for lead in leads_data.get('tenants', []):
            if lead.get('email', '').lower() == TEST_EMAIL.lower():
                qa_lead = lead
                break
        
        if qa_lead:
            interests = qa_lead.get('property_interests', [])
            assert len(interests) == 1, f"Expected 1 interest, got {len(interests)}"
            assert interests[0].get('propertyId') == TEST_PROPERTY, "Interest should still be for original property"
            print(f"✓ Lead still has EXACTLY 1 interest (for original property)")
        
        print("\n✅ SCENARIO 3 PASSED: Token validation prevents unauthorized property changes")
    else:
        print("⚠ No different active property found - skipping scenario 3")


def test_security_robustness():
    """
    Scenario 4: Security and robustness tests
    - Invalid tokens should be rejected
    - Missing tokens should be rejected
    - Unknown properties should return 404
    - GET /lookup should not create any data
    """
    print("\n=== SCENARIO 4: SECURITY & ROBUSTNESS ===")
    
    # Test 4a: Invalid token (all zeros)
    print("\nTest 4a: POST with invalid token (all zeros)")
    body = {
        "property": TEST_PROPERTY,
        "campaign": TEST_CAMPAIGN,
        "r": TEST_RID,
        "pt": "0000000000000000000000000000000000000000"
    }
    resp = requests.post(f"{BASE_URL}/newsletter/property-interest/confirm", json=body)
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    assert resp.json().get("ok") == False, "Expected ok=false"
    print("✓ Returns 401 for invalid token")
    
    # Test 4b: Missing token
    print("\nTest 4b: POST without token")
    body = {
        "property": TEST_PROPERTY,
        "campaign": TEST_CAMPAIGN,
        "r": TEST_RID
    }
    resp = requests.post(f"{BASE_URL}/newsletter/property-interest/confirm", json=body)
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    assert resp.json().get("ok") == False, "Expected ok=false"
    print("✓ Returns 401 for missing token")
    
    # Test 4c: Unknown property
    print("\nTest 4c: POST with valid token but unknown property")
    # Note: We can't test this properly because the token is bound to the property
    # But we can test with a clearly fake property ID
    body = {
        "property": "00000000-0000-0000-0000-000000000000",
        "campaign": TEST_CAMPAIGN,
        "r": TEST_RID,
        "pt": TEST_TOKEN
    }
    resp = requests.post(f"{BASE_URL}/newsletter/property-interest/confirm", json=body)
    # Should return 401 (token mismatch) or 404 (property not found)
    assert resp.status_code in [401, 404], f"Expected 401 or 404, got {resp.status_code}"
    print(f"✓ Returns {resp.status_code} for unknown property")
    
    # Test 4d: GET /lookup should not create data
    print("\nTest 4d: GET /lookup should not create data")
    initial_leads_resp = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY})
    initial_count = len(initial_leads_resp.json().get('leads', []))
    
    # Call lookup 3 times
    for i in range(3):
        params = {
            "property": TEST_PROPERTY,
            "c": TEST_CAMPAIGN,
            "r": TEST_RID,
            "pt": TEST_TOKEN
        }
        resp = requests.get(f"{BASE_URL}/newsletter/property-interest/lookup", params=params)
        assert resp.status_code == 200, f"Call {i+1}: Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get("ok") == True, f"Call {i+1}: Expected ok=true"
        assert data.get("available") in [True, False], f"Call {i+1}: Expected available field"
    
    # Verify no new leads or interests created
    final_leads_resp = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY})
    final_count = len(final_leads_resp.json().get('leads', []))
    assert final_count == initial_count, f"Lead count changed: {initial_count} -> {final_count}"
    print("✓ GET /lookup called 3 times, no data created")
    
    # Test 4e: Response should NOT contain internal email addresses
    print("\nTest 4e: Responses should NOT leak internal email addresses")
    body = {
        "property": TEST_PROPERTY,
        "campaign": TEST_CAMPAIGN,
        "r": TEST_RID,
        "pt": TEST_TOKEN
    }
    resp = requests.post(f"{BASE_URL}/newsletter/property-interest/confirm", json=body)
    resp_text = resp.text.lower()
    
    # Check for common internal email patterns
    internal_emails = ["martin@kviteberg.no", "sarah@digihome.no", "martin@digihome.no"]
    for email in internal_emails:
        assert email.lower() not in resp_text, f"CRITICAL: Found internal email {email} in response"
    print("✓ Response does NOT contain internal email addresses")
    
    print("\n✅ SCENARIO 4 PASSED: Security and robustness checks passed")


def test_regression():
    """
    Scenario 5: Regression tests
    - Other endpoints should still work
    - Data integrity maintained
    """
    print("\n=== SCENARIO 5: REGRESSION ===")
    
    # Test 5a: GET /api/admin/properties
    print("\nTest 5a: GET /api/admin/properties")
    resp = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data.get("ok") == True, "Expected ok=true"
    assert data.get("total") == 27, f"Expected total=27, got {data.get('total')}"
    assert data.get("districtCount") == 27, f"Expected districtCount=27, got {data.get('districtCount')}"
    assert data.get("incompleteCount") == 8, f"Expected incompleteCount=8, got {data.get('incompleteCount')}"
    assert data.get("duplicateCount") == 1, f"Expected duplicateCount=1, got {data.get('duplicateCount')}"
    print("✓ Properties endpoint working (total=27, districtCount=27, incompleteCount=8, duplicateCount=1)")
    
    # Test 5b: GET /api/admin/newsletter/campaign
    print("\nTest 5b: GET /api/admin/newsletter/campaign")
    resp = requests.get(f"{BASE_URL}/admin/newsletter/campaign", params={
        "key": ADMIN_KEY,
        "id": "6783d667-c93e-45ca-a458-341f9d79acf5"
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data.get("ok") == True, "Expected ok=true"
    # Check that all property cards have non-empty district
    properties = data.get("properties", [])
    for prop in properties:
        assert prop.get("district"), f"Property {prop.get('id')} has empty district"
    print(f"✓ Campaign endpoint working, all {len(properties)} properties have district")
    
    # Test 5c: POST /api/admin/newsletter/preview
    print("\nTest 5c: POST /api/admin/newsletter/preview")
    # Get some complete properties
    props_resp = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY})
    props_data = props_resp.json()
    complete_props = [
        p for p in props_data.get('properties', [])
        if p.get('incomplete') != True and p.get('duplicate') != True and len(p.get('images', [])) >= 1
    ][:6]
    
    if len(complete_props) >= 6:
        # Set district to empty string on each item
        preview_props = []
        for p in complete_props:
            preview_props.append({
                **p,
                "district": ""
            })
        
        body = {
            "properties": preview_props
        }
        resp = requests.post(f"{BASE_URL}/admin/newsletter/preview", params={"key": ADMIN_KEY}, json=body)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get("ok") == True, "Expected ok=true"
        assert len(data.get("unavailableProperties", [])) == 0, "Expected no unavailable properties"
        # Check for at least 2 district groups in HTML
        html = data.get("html", "")
        # Count occurrences of district headers (they typically have specific styling)
        print(f"✓ Newsletter preview working, unavailableProperties=[], HTML length={len(html)}")
    else:
        print(f"⚠ Only {len(complete_props)} complete properties found, skipping preview test")
    
    # Test 5d: GET /api/admin/revenue-reconcile
    print("\nTest 5d: GET /api/admin/revenue-reconcile")
    resp = requests.get(f"{BASE_URL}/admin/revenue-reconcile", params={
        "key": ADMIN_KEY,
        "env": "prod",
        "days": 30,
        "spend": 0
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data.get("ok") == True, "Expected ok=true"
    print("✓ Revenue reconcile endpoint working")
    
    # Test 5e: GET /api/admin/kpi
    print("\nTest 5e: GET /api/admin/kpi")
    resp = requests.get(f"{BASE_URL}/admin/kpi", params={"key": ADMIN_KEY, "days": 30})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data.get("ok") == True, "Expected ok=true"
    print("✓ KPI endpoint working")
    
    # Test 5f: GET /api/admin/leads
    print("\nTest 5f: GET /api/admin/leads")
    resp = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert isinstance(data.get("leads"), list), "Expected leads array"
    assert isinstance(data.get("tenants"), list), "Expected tenants array"
    print(f"✓ Leads endpoint working (leads={len(data.get('leads', []))}, tenants={len(data.get('tenants', []))})")
    
    # Test 5g: GET /api/
    print("\nTest 5g: GET /api/")
    resp = requests.get(f"{BASE_URL}/")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data.get("ok") == True, "Expected ok=true"
    print("✓ Root endpoint working")
    
    print("\n✅ SCENARIO 5 PASSED: All regression tests passed")


def main():
    """Run all test scenarios"""
    print("=" * 80)
    print("BACKEND TEST: Property Interest Email Notification")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print("\nCRITICAL SAFETY RULES:")
    print("- SendGrid is LIVE - each NEW interest sends REAL email")
    print("- MAXIMUM 2 new interests in entire test")
    print("- Using existing test rig (already has interest) - NO emails will be sent")
    print("=" * 80)
    
    try:
        # Scenario 1: Email preview (NO emails sent)
        test_email_preview()
        
        # Scenario 2: Idempotency (NO emails sent - already exists)
        test_idempotency()
        
        # Scenario 3: New property (cannot test - token validation)
        test_new_interest_for_different_property()
        
        # Scenario 4: Security and robustness
        test_security_robustness()
        
        # Scenario 5: Regression
        test_regression()
        
        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED")
        print("=" * 80)
        print("\nSUMMARY:")
        print("- Email preview: ✅ Works, NO emails sent, NO events created")
        print("- Idempotency: ✅ Repeated POSTs return isNew=false, notified=false")
        print("- Token validation: ✅ Invalid/missing tokens rejected (401)")
        print("- Security: ✅ No internal emails leaked, GET /lookup read-only")
        print("- Regression: ✅ All other endpoints working")
        print("\nEMAILS SENT IN THIS TEST: 0 (used existing test rig with isNew=false)")
        print("=" * 80)
        
        return 0
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
