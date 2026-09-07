#!/usr/bin/env python3
"""
Backend test for DigiHome Investor Deck API
Tests investor deck endpoints with PIN authentication and presenter mode
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_EMAIL = "martin@kviteberg.no"
ADMIN_PASSWORD = "Pyramiden2025##"

# Test state
admin_token = None
test_links = []  # Track created links for cleanup

def log(msg):
    """Print timestamped log message"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_admin_login():
    """Test 1: Admin login to get token"""
    global admin_token
    log("TEST 1: Admin login")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data, "Response missing 'token' field"
        admin_token = data["token"]
        log(f"✅ TEST 1 PASSED: Admin login successful, token: {admin_token[:20]}...")
        return True
    except Exception as e:
        log(f"❌ TEST 1 FAILED: {str(e)}")
        return False

def test_create_link_with_pin():
    """Test 2: Create investor link with PIN and deck section"""
    log("TEST 2: Create investor link with PIN")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/investor-room/links?key={admin_token}",
            json={
                "label": "QA Deck",
                "email": "qa-deck@example.com",
                "sections": ["metrics", "deck", "qa"],
                "expiresDays": 7,
                "pin": "1234"
            },
            timeout=30
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Response ok field not True"
        assert "link" in data, "Response missing 'link' field"
        assert "url" in data, "Response missing 'url' field"
        
        link = data["link"]
        assert link.get("harPassord") == True, "Link should have harPassord=True"
        assert "pinHash" not in link, "Response should NOT contain pinHash"
        assert "pinSalt" not in link, "Response should NOT contain pinSalt"
        assert "token" in link, "Link missing token"
        assert "id" in link, "Link missing id"
        
        # Save for later tests
        test_links.append({"id": link["id"], "token": link["token"]})
        
        log(f"✅ TEST 2 PASSED: Link created with harPassord=True, token={link['token'][:20]}..., id={link['id']}")
        return True, link
    except Exception as e:
        log(f"❌ TEST 2 FAILED: {str(e)}")
        return False, None

def test_deck_needs_pin(link_token):
    """Test 3: GET /api/investor/deck without cookie should return 401 needsPin"""
    log("TEST 3: GET deck without PIN cookie")
    try:
        response = requests.get(
            f"{BASE_URL}/investor/deck?t={link_token}",
            timeout=30
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert data.get("needsPin") == True, "Response should have needsPin=True"
        assert "label" in data, "Response should contain label"
        assert data["label"] == "QA Deck", f"Expected label 'QA Deck', got {data.get('label')}"
        
        log(f"✅ TEST 3 PASSED: Deck requires PIN, needsPin=True, label='QA Deck'")
        return True
    except Exception as e:
        log(f"❌ TEST 3 FAILED: {str(e)}")
        return False

def test_wrong_pin(link_token):
    """Test 4: POST wrong PIN should return 401"""
    log("TEST 4: POST wrong PIN")
    try:
        response = requests.post(
            f"{BASE_URL}/investor/deck/pin?t={link_token}",
            json={"pin": "9999"},
            timeout=30
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert data.get("ok") == False, "Response ok should be False"
        
        log(f"✅ TEST 4 PASSED: Wrong PIN rejected with 401")
        return True
    except Exception as e:
        log(f"❌ TEST 4 FAILED: {str(e)}")
        return False

def test_correct_pin_and_deck_access(link_token, link_id):
    """Test 5: POST correct PIN and then GET deck with cookie"""
    log("TEST 5: POST correct PIN and GET deck")
    try:
        # Create session to maintain cookies
        session = requests.Session()
        
        # POST correct PIN
        response = session.post(
            f"{BASE_URL}/investor/deck/pin?t={link_token}",
            json={"pin": "1234"},
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("ok") == True, "Response ok should be True"
        
        # Check cookie was set
        cookie_name = f"dh_deckpin_{link_id}"
        assert cookie_name in session.cookies, f"Cookie {cookie_name} not set"
        log(f"  Cookie set: {cookie_name}")
        
        # Now GET deck with cookie
        response = session.get(
            f"{BASE_URL}/investor/deck?t={link_token}",
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Validate response structure
        assert data.get("ok") == True, "Response ok should be True"
        assert data.get("presenter") == False, "Investor should have presenter=False"
        assert "investor" in data, "Response missing 'investor' field"
        assert "plan" in data, "Response missing 'plan' field"
        
        investor = data["investor"]
        assert investor.get("label") == "QA Deck", f"Expected label 'QA Deck', got {investor.get('label')}"
        assert investor.get("harPassord") == True, "Investor should have harPassord=True"
        assert investor.get("kanSporre") == True, "Investor should have kanSporre=True (qa in sections)"
        
        plan = data["plan"]
        assert "id" in plan, "Plan missing id"
        assert "navn" in plan, "Plan missing navn"
        assert "startYm" in plan, "Plan missing startYm"
        assert "antallMnd" in plan, "Plan missing antallMnd"
        assert "drivere" in plan, "Plan missing drivere"
        assert "fakta" in plan, "Plan missing fakta"
        
        # plattform and felles may be present
        if "plattform" in plan:
            log(f"  Plan has plattform field")
        if "felles" in plan:
            log(f"  Plan has felles field")
        
        # planer should be absent/undefined for investor
        assert "planer" not in data or data.get("planer") is None, "Investor should NOT see planer array"
        
        log(f"✅ TEST 5 PASSED: Correct PIN accepted, deck accessible, investor={investor}, plan.id={plan['id']}")
        return True
    except Exception as e:
        log(f"❌ TEST 5 FAILED: {str(e)}")
        return False

def test_audit_logging(link_token, link_id):
    """Test 6: POST hendelse and verify audit log"""
    log("TEST 6: POST hendelse and verify audit")
    try:
        # Create session with PIN cookie
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/investor/deck/pin?t={link_token}",
            json={"pin": "1234"},
            timeout=30
        )
        assert response.status_code == 200, "PIN auth failed"
        
        # POST hendelse
        response = session.post(
            f"{BASE_URL}/investor/deck/hendelse?t={link_token}",
            json={"type": "deck_hvaom", "valg": "Halv vekst"},
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("ok") == True, "Response ok should be True"
        
        # GET audit log
        response = requests.get(
            f"{BASE_URL}/admin/investor-room?key={admin_token}",
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "audit" in data, "Response missing 'audit' field"
        
        # Find audit entries for this link
        link_audits = [a for a in data["audit"] if a.get("linkId") == link_id]
        assert len(link_audits) > 0, f"No audit entries found for linkId={link_id}"
        
        # Check for deck_hvaom event
        hvaom_events = [a for a in link_audits if a.get("event") == "deck_hvaom"]
        assert len(hvaom_events) > 0, "No deck_hvaom event found in audit"
        
        # Check for deck_pin_feil event (from test 4)
        pin_fail_events = [a for a in link_audits if a.get("event") == "deck_pin_feil"]
        assert len(pin_fail_events) > 0, "No deck_pin_feil event found in audit"
        
        log(f"✅ TEST 6 PASSED: Audit contains deck_hvaom and deck_pin_feil events for linkId={link_id}")
        return True
    except Exception as e:
        log(f"❌ TEST 6 FAILED: {str(e)}")
        return False

def test_link_without_deck_section():
    """Test 7: Link without 'deck' in sections should return 403"""
    log("TEST 7: Link without 'deck' section")
    try:
        # Create link without deck
        response = requests.post(
            f"{BASE_URL}/admin/investor-room/links?key={admin_token}",
            json={
                "label": "QA No Deck",
                "email": "qa-nodeck@example.com",
                "sections": ["metrics"],  # No 'deck'
                "expiresDays": 7
            },
            timeout=30
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        data = response.json()
        link = data["link"]
        test_links.append({"id": link["id"], "token": link["token"]})
        
        # Try to access deck
        response = requests.get(
            f"{BASE_URL}/investor/deck?t={link['token']}",
            timeout=30
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        log(f"✅ TEST 7 PASSED: Link without 'deck' section returns 403")
        return True
    except Exception as e:
        log(f"❌ TEST 7 FAILED: {str(e)}")
        return False

def test_revoke_link(link_token, link_id):
    """Test 8: Revoke link and verify 410 response"""
    log("TEST 8: Revoke link")
    try:
        # Revoke link
        response = requests.put(
            f"{BASE_URL}/admin/investor-room/links?key={admin_token}",
            json={"id": link_id, "patch": {"revoked": True}},
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("ok") == True, "Response ok should be True"
        
        # Try to access deck
        response = requests.get(
            f"{BASE_URL}/investor/deck?t={link_token}",
            timeout=30
        )
        assert response.status_code == 410, f"Expected 410, got {response.status_code}"
        data = response.json()
        assert data.get("invalid") == "revoked", f"Expected invalid='revoked', got {data.get('invalid')}"
        
        log(f"✅ TEST 8 PASSED: Revoked link returns 410 with invalid='revoked'")
        return True
    except Exception as e:
        log(f"❌ TEST 8 FAILED: {str(e)}")
        return False

def test_remove_pin():
    """Test 9: Create link with PIN, then remove PIN"""
    log("TEST 9: Remove PIN from link")
    try:
        # Create link with PIN
        response = requests.post(
            f"{BASE_URL}/admin/investor-room/links?key={admin_token}",
            json={
                "label": "QA Remove PIN",
                "email": "qa-removepin@example.com",
                "sections": ["deck"],
                "expiresDays": 7,
                "pin": "5555"
            },
            timeout=30
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        data = response.json()
        link = data["link"]
        test_links.append({"id": link["id"], "token": link["token"]})
        assert link.get("harPassord") == True, "Link should have harPassord=True"
        
        # Remove PIN
        response = requests.put(
            f"{BASE_URL}/admin/investor-room/links?key={admin_token}",
            json={"id": link["id"], "patch": {"pin": ""}},
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify harPassord is false
        response = requests.get(
            f"{BASE_URL}/admin/investor-room?key={admin_token}",
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        links = data.get("links", [])
        updated_link = next((l for l in links if l["id"] == link["id"]), None)
        assert updated_link is not None, "Link not found in list"
        assert updated_link.get("harPassord") == False, "Link should have harPassord=False after PIN removal"
        
        # Access deck without cookie (should work now)
        response = requests.get(
            f"{BASE_URL}/investor/deck?t={link['token']}",
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("ok") == True, "Response ok should be True"
        
        log(f"✅ TEST 9 PASSED: PIN removed, harPassord=False, deck accessible without cookie")
        return True
    except Exception as e:
        log(f"❌ TEST 9 FAILED: {str(e)}")
        return False

def test_short_pin_validation():
    """Test 10: PIN with less than 4 chars should return 400"""
    log("TEST 10: Short PIN validation")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/investor-room/links?key={admin_token}",
            json={
                "label": "QA Short PIN",
                "email": "qa-shortpin@example.com",
                "sections": ["deck"],
                "pin": "12"  # Too short
            },
            timeout=30
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert data.get("ok") == False, "Response ok should be False"
        assert "error" in data, "Response should contain error message"
        
        log(f"✅ TEST 10 PASSED: Short PIN rejected with 400")
        return True
    except Exception as e:
        log(f"❌ TEST 10 FAILED: {str(e)}")
        return False

def test_presenter_mode():
    """Test 11: Presenter mode with admin token"""
    log("TEST 11: Presenter mode")
    try:
        # GET deck as presenter (no t param, use key)
        response = requests.get(
            f"{BASE_URL}/investor/deck?key={admin_token}",
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("ok") == True, "Response ok should be True"
        assert data.get("presenter") == True, "Should have presenter=True"
        assert "planer" in data, "Presenter should see planer array"
        assert isinstance(data["planer"], list), "planer should be an array"
        assert "plan" in data, "Response should contain plan"
        
        # Check if there are any non-investorSynlig plans
        non_visible_plans = [p for p in data["planer"] if not p.get("investorSynlig")]
        if non_visible_plans:
            log(f"  Found {len(non_visible_plans)} non-investorSynlig plans")
            # Try to access one
            plan_id = non_visible_plans[0]["id"]
            response = requests.get(
                f"{BASE_URL}/investor/deck?key={admin_token}&plan={plan_id}",
                timeout=30
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            data = response.json()
            assert data["plan"]["id"] == plan_id, f"Expected plan.id={plan_id}, got {data['plan']['id']}"
            log(f"  Presenter can access non-investorSynlig plan {plan_id}")
        else:
            log(f"  No non-investorSynlig plans found (all plans are investor-visible)")
        
        log(f"✅ TEST 11 PASSED: Presenter mode working, presenter=True, planer array present")
        return True
    except Exception as e:
        log(f"❌ TEST 11 FAILED: {str(e)}")
        return False

def test_no_token_no_key():
    """Test 12: GET deck without t or key should return 404"""
    log("TEST 12: GET deck without t or key")
    try:
        response = requests.get(
            f"{BASE_URL}/investor/deck",
            timeout=30
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        log(f"✅ TEST 12 PASSED: No token/key returns 404")
        return True
    except Exception as e:
        log(f"❌ TEST 12 FAILED: {str(e)}")
        return False

def test_regression_investor_room():
    """Test 13: Regression - GET /api/investor/room with token"""
    log("TEST 13: Regression - investor room endpoint")
    try:
        # Use the third link (QA Remove PIN) which has deck section
        if len(test_links) < 3:
            log("  Skipping regression test - not enough test links")
            return True
        
        link_token = test_links[2]["token"]
        response = requests.get(
            f"{BASE_URL}/investor/room?t={link_token}",
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("ok") == True, "Response ok should be True"
        assert "viewer" in data, "Response should contain viewer"
        
        viewer = data["viewer"]
        assert "sections" in viewer, "Viewer should have sections"
        assert "deck" in viewer["sections"], "Viewer sections should include 'deck'"
        
        log(f"✅ TEST 13 PASSED: Investor room endpoint working, viewer.sections includes 'deck'")
        return True
    except Exception as e:
        log(f"❌ TEST 13 FAILED: {str(e)}")
        return False

def cleanup():
    """Cleanup: Delete all test links"""
    log("CLEANUP: Deleting test links")
    try:
        for link in test_links:
            try:
                response = requests.delete(
                    f"{BASE_URL}/admin/investor-room/links?id={link['id']}&key={admin_token}",
                    timeout=30
                )
                if response.status_code == 200:
                    log(f"  Deleted link {link['id']}")
                else:
                    log(f"  Failed to delete link {link['id']}: {response.status_code}")
            except Exception as e:
                log(f"  Error deleting link {link['id']}: {str(e)}")
        
        log(f"✅ CLEANUP COMPLETE: Attempted to delete {len(test_links)} test links")
        return True
    except Exception as e:
        log(f"❌ CLEANUP FAILED: {str(e)}")
        return False

def main():
    """Run all tests"""
    log("=" * 80)
    log("INVESTOR DECK API BACKEND TESTS")
    log("=" * 80)
    
    results = []
    
    # Test 1: Admin login
    if not test_admin_login():
        log("FATAL: Admin login failed, cannot continue")
        sys.exit(1)
    results.append(("Admin login", True))
    
    # Test 2: Create link with PIN
    success, link = test_create_link_with_pin()
    results.append(("Create link with PIN", success))
    if not success:
        log("FATAL: Cannot create link, stopping tests")
        sys.exit(1)
    
    link_token = link["token"]
    link_id = link["id"]
    
    # Test 3: Deck needs PIN
    results.append(("Deck needs PIN", test_deck_needs_pin(link_token)))
    
    # Test 4: Wrong PIN
    results.append(("Wrong PIN rejected", test_wrong_pin(link_token)))
    
    # Test 5: Correct PIN and deck access
    results.append(("Correct PIN and deck access", test_correct_pin_and_deck_access(link_token, link_id)))
    
    # Test 6: Audit logging
    results.append(("Audit logging", test_audit_logging(link_token, link_id)))
    
    # Test 7: Link without deck section
    results.append(("Link without deck section", test_link_without_deck_section()))
    
    # Test 8: Revoke link (uses first link which is now revoked)
    results.append(("Revoke link", test_revoke_link(link_token, link_id)))
    
    # Test 9: Remove PIN
    results.append(("Remove PIN", test_remove_pin()))
    
    # Test 10: Short PIN validation
    results.append(("Short PIN validation", test_short_pin_validation()))
    
    # Test 11: Presenter mode
    results.append(("Presenter mode", test_presenter_mode()))
    
    # Test 12: No token/key
    results.append(("No token/key", test_no_token_no_key()))
    
    # Test 13: Regression
    results.append(("Regression - investor room", test_regression_investor_room()))
    
    # Cleanup
    cleanup()
    
    # Summary
    log("=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        log(f"{status}: {name}")
    
    log("=" * 80)
    log(f"TOTAL: {passed}/{total} tests passed ({100*passed//total}% success rate)")
    log("=" * 80)
    
    if passed == total:
        log("🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        log(f"⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
