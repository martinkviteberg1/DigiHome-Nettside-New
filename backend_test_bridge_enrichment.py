#!/usr/bin/env python3
"""
Backend test for agent-to-agent bridge + closed-loop enrichment (lost_reason + suppression).
Tests ONLY the new additive backend changes as requested.
"""
import requests
import json
import time
import sys

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
AGENT_BRIDGE_SECRET = "dhbridge_1b6d861334cad9ace784288a038f540f7f183cd7"
LEAD_SYNC_SECRET = "dhsync_dc0dc1750aff067a4baef7adafc7991f7340eacc44f27036"
TIMEOUT = 30

def log(msg):
    print(f"[TEST] {msg}", flush=True)

def test_bridge_aliases():
    """(A) BRIDGE ALIASES"""
    log("=" * 80)
    log("TEST GROUP A: BRIDGE ALIASES")
    log("=" * 80)
    
    # A1: GET /api/bridge/health → 200 (OPEN, no token)
    log("A1: GET /api/bridge/health (OPEN, no token)")
    try:
        r = requests.get(f"{BASE_URL}/bridge/health", timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            log(f"  Response: {json.dumps(data, indent=2)}")
            assert data.get('ok') == True, "Expected ok=true"
            assert data.get('canonical') == '/api/agent-bridge', "Expected canonical='/api/agent-bridge'"
            assert 'aliases' in data, "Expected 'aliases' field"
            assert isinstance(data['aliases'], list), "Expected aliases to be a list"
            log("  ✅ A1 PASSED: bridge/health returns 200 with ok=true, canonical, aliases")
        else:
            log(f"  ❌ A1 FAILED: Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ A1 FAILED: {e}")
        return False
    
    # A2: GET /api/bridge/messages?token=<AGENT_BRIDGE_SECRET> → 200
    log("\nA2: GET /api/bridge/messages?token=<AGENT_BRIDGE_SECRET>")
    try:
        r = requests.get(f"{BASE_URL}/bridge/messages?token={AGENT_BRIDGE_SECRET}", timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            log(f"  Response keys: {list(data.keys())}")
            assert data.get('ok') == True, "Expected ok=true"
            assert 'messages' in data, "Expected 'messages' field"
            assert isinstance(data['messages'], list), "Expected messages to be a list"
            log(f"  Messages count: {len(data['messages'])}")
            log("  ✅ A2 PASSED: bridge/messages with token returns 200 with ok=true, messages array")
        else:
            log(f"  ❌ A2 FAILED: Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ A2 FAILED: {e}")
        return False
    
    # A3: GET /api/bridge/messages WITHOUT token → 401
    log("\nA3: GET /api/bridge/messages WITHOUT token")
    try:
        r = requests.get(f"{BASE_URL}/bridge/messages", timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 401:
            log("  ✅ A3 PASSED: bridge/messages without token returns 401")
        else:
            log(f"  ❌ A3 FAILED: Expected 401, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ A3 FAILED: {e}")
        return False
    
    # A4: POST /api/bridge/messages?token=<AGENT_BRIDGE_SECRET> with body
    log("\nA4: POST /api/bridge/messages?token=<AGENT_BRIDGE_SECRET> with body")
    try:
        payload = {
            "from": "platform",
            "thread": "integration-contract",
            "type": "ack",
            "subject": "qa",
            "text": "qa-alias"
        }
        r = requests.post(f"{BASE_URL}/bridge/messages?token={AGENT_BRIDGE_SECRET}", 
                         json=payload, timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 201:
            data = r.json()
            log(f"  Response: {json.dumps(data, indent=2)}")
            assert data.get('ok') == True, "Expected ok=true"
            assert 'message' in data, "Expected 'message' field"
            msg = data['message']
            assert msg.get('threadId') == 'integration-contract', "Expected threadId='integration-contract'"
            assert msg.get('from') == 'platform', "Expected from='platform'"
            assert msg.get('body') == 'qa-alias', "Expected body='qa-alias'"
            log("  ✅ A4 PASSED: POST bridge/messages returns 201 with correct message structure")
            log("     Field names 'thread'/'text' were tolerated and mapped correctly")
        else:
            log(f"  ❌ A4 FAILED: Expected 201, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ A4 FAILED: {e}")
        return False
    
    log("\n✅ ALL BRIDGE ALIASES TESTS PASSED (4/4)")
    return True

def test_webhook_lost_with_reason():
    """(B) WEBHOOK LOST-WITH-REASON"""
    log("\n" + "=" * 80)
    log("TEST GROUP B: WEBHOOK LOST-WITH-REASON")
    log("=" * 80)
    
    # B1: Create a lead first
    log("B1: Create test lead")
    try:
        payload = {
            "name": "QA Lost Test",
            "phone": "90000009",
            "email": "qa-lost-test@example.test",
            "address": "Testveien 9, 5003 Bergen",
            "property_type": "leilighet",
            "lead_type": "huseier",
            "source": "qa-lost-test"
        }
        r = requests.post(f"{BASE_URL}/leads", json=payload, timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 201:
            data = r.json()
            lead_id = data.get('data', {}).get('id') or data.get('lead', {}).get('id')
            if not lead_id:
                log(f"  ❌ B1 FAILED: Could not extract lead.id from response: {data}")
                return False
            log(f"  Lead ID: {lead_id}")
            log("  ✅ B1 PASSED: Lead created successfully")
        else:
            log(f"  ❌ B1 FAILED: Expected 201, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ B1 FAILED: {e}")
        return False
    
    # B2: POST /api/webhooks/lead-status with lost_reason
    log("\nB2: POST /api/webhooks/lead-status with lost_reason='out_of_area'")
    try:
        payload = {
            "external_ref": lead_id,
            "status": "lost",
            "lost_reason": "out_of_area",
            "platform_customer_id": "CUST-QA-1",
            "platform_conversion_id": "CONV-QA-1"
        }
        headers = {"X-Webhook-Secret": LEAD_SYNC_SECRET}
        r = requests.post(f"{BASE_URL}/webhooks/lead-status", json=payload, headers=headers, timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            log(f"  Response: {json.dumps(data, indent=2)}")
            assert data.get('ok') == True, "Expected ok=true"
            log("  ✅ B2 PASSED: Webhook accepted with status 200")
        else:
            log(f"  ❌ B2 FAILED: Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ B2 FAILED: {e}")
        return False
    
    # B3: Verify via GET /api/admin/leads
    log("\nB3: Verify lead has correct fields via GET /api/admin/leads")
    try:
        r = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            leads = data if isinstance(data, list) else data.get('leads', [])
            lead = next((l for l in leads if l.get('id') == lead_id), None)
            if not lead:
                log(f"  ❌ B3 FAILED: Could not find lead with id={lead_id}")
                return False
            log(f"  Lead status: {lead.get('status')}")
            log(f"  Lead lostReason: {lead.get('lostReason')}")
            log(f"  Lead platformCustomerId: {lead.get('platformCustomerId')}")
            log(f"  Lead platformConversionId: {lead.get('platformConversionId')}")
            assert lead.get('status') == 'lost', f"Expected status='lost', got {lead.get('status')}"
            assert lead.get('lostReason') == 'out_of_area', f"Expected lostReason='out_of_area', got {lead.get('lostReason')}"
            assert lead.get('platformCustomerId') == 'CUST-QA-1', f"Expected platformCustomerId='CUST-QA-1', got {lead.get('platformCustomerId')}"
            assert lead.get('platformConversionId') == 'CONV-QA-1', f"Expected platformConversionId='CONV-QA-1', got {lead.get('platformConversionId')}"
            log("  ✅ B3 PASSED: Lead has correct status, lostReason, platformCustomerId, platformConversionId")
        else:
            log(f"  ❌ B3 FAILED: Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ B3 FAILED: {e}")
        return False
    
    # B4: Test invalid lost_reason
    log("\nB4: Test invalid lost_reason='tullball' (should be stored as 'other')")
    try:
        payload = {
            "external_ref": lead_id,
            "status": "lost",
            "lost_reason": "tullball"
        }
        headers = {"X-Webhook-Secret": LEAD_SYNC_SECRET}
        r = requests.post(f"{BASE_URL}/webhooks/lead-status", json=payload, headers=headers, timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            log(f"  Response: {json.dumps(data, indent=2)}")
            # Verify via GET /api/admin/leads
            r2 = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=TIMEOUT)
            if r2.status_code == 200:
                data2 = r2.json()
                leads = data2 if isinstance(data2, list) else data2.get('leads', [])
                lead = next((l for l in leads if l.get('id') == lead_id), None)
                if lead:
                    log(f"  Lead lostReason after invalid: {lead.get('lostReason')}")
                    assert lead.get('lostReason') == 'other', f"Expected lostReason='other', got {lead.get('lostReason')}"
                    log("  ✅ B4 PASSED: Invalid lost_reason stored as 'other'")
                else:
                    log(f"  ❌ B4 FAILED: Could not find lead")
                    return False
            else:
                log(f"  ❌ B4 FAILED: Could not verify lead")
                return False
        else:
            log(f"  ❌ B4 FAILED: Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ B4 FAILED: {e}")
        return False
    
    # Cleanup
    log("\nB5: Cleanup test lead")
    try:
        r = requests.post(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", 
                         json={"action": "delete", "id": lead_id}, timeout=TIMEOUT)
        log(f"  Cleanup status: {r.status_code}")
    except Exception as e:
        log(f"  Cleanup warning: {e}")
    
    log("\n✅ ALL WEBHOOK LOST-WITH-REASON TESTS PASSED (4/4)")
    return True

def test_suppression():
    """(C) SUPPRESSION"""
    log("\n" + "=" * 80)
    log("TEST GROUP C: SUPPRESSION")
    log("=" * 80)
    
    # C1: GET /api/admin/audiences/suppression?key=dh_admin_b3Kx92Qz7Lm4 → 200
    log("C1: GET /api/admin/audiences/suppression?key=...")
    try:
        r = requests.get(f"{BASE_URL}/admin/audiences/suppression?key={ADMIN_KEY}", timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            log(f"  Response keys: {list(data.keys())}")
            assert data.get('ok') == True, "Expected ok=true"
            assert 'count' in data, "Expected 'count' field"
            assert 'audience' in data, "Expected 'audience' field"
            assert isinstance(data['audience'], list), "Expected audience to be a list"
            log(f"  Count: {data['count']}")
            if data['count'] > 0:
                sample = data['audience'][0]
                log(f"  Sample audience entry: {sample}")
                assert 'email_sha256' in sample, "Expected 'email_sha256' field"
                assert 'phone_sha256' in sample, "Expected 'phone_sha256' field"
                # Verify SHA-256 hashes are 64 chars hex
                if sample.get('email_sha256'):
                    assert len(sample['email_sha256']) == 64, f"Expected email_sha256 to be 64 chars, got {len(sample['email_sha256'])}"
                    assert all(c in '0123456789abcdef' for c in sample['email_sha256']), "Expected email_sha256 to be hex"
                if sample.get('phone_sha256'):
                    assert len(sample['phone_sha256']) == 64, f"Expected phone_sha256 to be 64 chars, got {len(sample['phone_sha256'])}"
                    assert all(c in '0123456789abcdef' for c in sample['phone_sha256']), "Expected phone_sha256 to be hex"
                log("  ✅ C1 PASSED: suppression returns 200 with ok=true, count, audience with SHA-256 hashes (64 chars hex)")
            else:
                log("  ✅ C1 PASSED: suppression returns 200 with ok=true, count=0 (no won leads yet)")
        else:
            log(f"  ❌ C1 FAILED: Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ C1 FAILED: {e}")
        return False
    
    # C2: WITHOUT key → 401
    log("\nC2: GET /api/admin/audiences/suppression WITHOUT key")
    try:
        r = requests.get(f"{BASE_URL}/admin/audiences/suppression", timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 401:
            log("  ✅ C2 PASSED: suppression without key returns 401")
        else:
            log(f"  ❌ C2 FAILED: Expected 401, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ C2 FAILED: {e}")
        return False
    
    # C3: With &format=csv → CSV format
    log("\nC3: GET /api/admin/audiences/suppression?key=...&format=csv")
    try:
        r = requests.get(f"{BASE_URL}/admin/audiences/suppression?key={ADMIN_KEY}&format=csv", timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 200:
            content_type = r.headers.get('Content-Type', '')
            log(f"  Content-Type: {content_type}")
            assert 'text/csv' in content_type, f"Expected Content-Type to contain 'text/csv', got {content_type}"
            body = r.text
            lines = body.split('\n')
            log(f"  CSV lines: {len(lines)}")
            log(f"  Header line: {lines[0]}")
            assert lines[0] == 'email_sha256,phone_sha256', f"Expected header 'email_sha256,phone_sha256', got {lines[0]}"
            log("  ✅ C3 PASSED: suppression with format=csv returns CSV with correct header")
        else:
            log(f"  ❌ C3 FAILED: Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ C3 FAILED: {e}")
        return False
    
    log("\n✅ ALL SUPPRESSION TESTS PASSED (3/3)")
    return True

def test_regression():
    """(D) REGRESSION"""
    log("\n" + "=" * 80)
    log("TEST GROUP D: REGRESSION")
    log("=" * 80)
    
    # D1: GET /api/ → 200
    log("D1: GET /api/")
    try:
        r = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            log(f"  Response: {json.dumps(data, indent=2)}")
            assert data.get('ok') == True, "Expected ok=true"
            log("  ✅ D1 PASSED: Root endpoint returns 200 with ok=true")
        else:
            log(f"  ❌ D1 FAILED: Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ D1 FAILED: {e}")
        return False
    
    # D2: GET /api/admin/analytics?key=dh_admin_b3Kx92Qz7Lm4&days=30 → 200
    log("\nD2: GET /api/admin/analytics?key=...&days=30")
    try:
        r = requests.get(f"{BASE_URL}/admin/analytics?key={ADMIN_KEY}&days=30", timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            log(f"  Response keys: {list(data.keys())}")
            assert 'traffic' in data or 'ok' in data, "Expected 'traffic' or 'ok' field"
            log("  ✅ D2 PASSED: admin/analytics returns 200")
        else:
            log(f"  ❌ D2 FAILED: Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        log(f"  ❌ D2 FAILED: {e}")
        return False
    
    log("\n✅ ALL REGRESSION TESTS PASSED (2/2)")
    return True

def main():
    log("=" * 80)
    log("BACKEND TEST: AGENT-TO-AGENT BRIDGE + CLOSED-LOOP ENRICHMENT")
    log("=" * 80)
    log(f"Base URL: {BASE_URL}")
    log(f"Admin key: {ADMIN_KEY}")
    log(f"Agent bridge secret: {AGENT_BRIDGE_SECRET}")
    log(f"Lead sync secret: {LEAD_SYNC_SECRET}")
    log(f"Timeout: {TIMEOUT}s")
    log("")
    
    results = []
    
    # Test (A) BRIDGE ALIASES
    results.append(("BRIDGE ALIASES", test_bridge_aliases()))
    
    # Test (B) WEBHOOK LOST-WITH-REASON
    results.append(("WEBHOOK LOST-WITH-REASON", test_webhook_lost_with_reason()))
    
    # Test (C) SUPPRESSION
    results.append(("SUPPRESSION", test_suppression()))
    
    # Test (D) REGRESSION
    results.append(("REGRESSION", test_regression()))
    
    # Summary
    log("\n" + "=" * 80)
    log("SUMMARY")
    log("=" * 80)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        log(f"{status}: {name}")
    log(f"\nTotal: {passed}/{total} test groups passed")
    
    if passed == total:
        log("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        log(f"\n❌ {total - passed} test group(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
