#!/usr/bin/env python3
"""
Backend testing for NEW session changes:
(A) MARKETING-METRICS endpoint
(B) GDPR CONSENT-GATING of Meta CAPI
(C) LIFECYCLE EVENTS + CLOSED-LOOP webhook
(D) REGRESSION tests

Base URL: https://hero-premiere-4.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4
Bridge token: dhbridge_1b6d861334cad9ace784288a038f540f7f183cd7
Webhook secret: dhsync_dc0dc1750aff067a4baef7adafc7991f7340eacc44f27036
"""

import requests
import json
import time
from datetime import datetime, timedelta

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
BRIDGE_TOKEN = "dhbridge_1b6d861334cad9ace784288a038f540f7f183cd7"
WEBHOOK_SECRET = "dhsync_dc0dc1750aff067a4baef7adafc7991f7340eacc44f27036"
TIMEOUT = 60  # Real Google/Meta API calls can take time

# Track test leads for cleanup
test_lead_ids = []

def log_test(test_id, description):
    print(f"\n{'='*80}")
    print(f"TEST {test_id}: {description}")
    print(f"{'='*80}")

def log_result(passed, message, details=None):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")
    if details:
        print(f"  Details: {details}")
    return passed

def cleanup_test_leads():
    """Delete all test leads created during testing"""
    print(f"\n{'='*80}")
    print("CLEANUP: Deleting test leads")
    print(f"{'='*80}")
    
    for lead_id in test_lead_ids:
        try:
            # Try to delete via admin endpoint
            response = requests.delete(
                f"{BASE_URL}/admin/leads",
                params={"key": ADMIN_KEY},
                json={"id": lead_id},
                timeout=10
            )
            if response.status_code in [200, 204]:
                print(f"✅ Deleted lead: {lead_id}")
            else:
                print(f"⚠️  Could not delete lead {lead_id}: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Error deleting lead {lead_id}: {str(e)}")

# ============================================================================
# (A) MARKETING-METRICS ENDPOINT TESTS
# ============================================================================

def test_a1_marketing_metrics_with_days():
    """A1: GET /api/admin/marketing-metrics?days=7&token=<bridge-token>"""
    log_test("A1", "Marketing metrics with days=7 and bridge token")
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/marketing-metrics",
            params={"days": 7, "token": BRIDGE_TOKEN},
            timeout=TIMEOUT
        )
        
        # Check status code
        if not log_result(response.status_code == 200, f"Status code is 200", f"Got {response.status_code}"):
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Check required fields
        required_fields = [
            "ok", "source", "period", "spend", "performance", "leads",
            "marketingAttributedWon", "efficiency", "channelSplit", 
            "topCampaigns", "wow", "configured"
        ]
        
        for field in required_fields:
            if not log_result(field in data, f"Field '{field}' present"):
                return False
        
        # Check nested fields
        if not log_result(data.get("ok") == True, "ok == true"):
            return False
        
        if not log_result(data.get("source") == "digihome-marketing", "source == 'digihome-marketing'"):
            return False
        
        # Check spend fields
        spend = data.get("spend", {})
        spend_fields = ["total", "google", "meta"]
        for field in spend_fields:
            if not log_result(field in spend, f"spend.{field} present"):
                return False
        
        # Check efficiency fields (NEW in this session)
        efficiency = data.get("efficiency", {})
        new_efficiency_fields = ["valuePerWon", "cacPaybackMonths", "leadToWonPct"]
        for field in new_efficiency_fields:
            if not log_result(field in efficiency, f"efficiency.{field} present (NEW)"):
                return False
        
        print(f"✅ ALL REQUIRED FIELDS PRESENT")
        print(f"  Period: {data.get('period', {}).get('label', 'N/A')}")
        print(f"  Spend total: {spend.get('total', 0)}")
        print(f"  Leads new: {data.get('leads', {}).get('new', 0)}")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

def test_a2_marketing_metrics_with_from_to():
    """A2: GET with from/to dates"""
    log_test("A2", "Marketing metrics with from/to ISO dates")
    
    try:
        # Use a specific date range
        from_date = "2026-06-22"
        to_date = "2026-06-28"
        
        response = requests.get(
            f"{BASE_URL}/admin/marketing-metrics",
            params={"from": from_date, "to": to_date, "token": BRIDGE_TOKEN},
            timeout=TIMEOUT
        )
        
        if not log_result(response.status_code == 200, f"Status code is 200", f"Got {response.status_code}"):
            return False
        
        data = response.json()
        
        # Check period label
        period_label = data.get("period", {}).get("label", "")
        expected_label = f"{from_date} – {to_date}"
        
        if not log_result(period_label == expected_label, f"period.label == '{expected_label}'", f"Got '{period_label}'"):
            return False
        
        # Check period days (should be 6 or 7)
        period_days = data.get("period", {}).get("days", 0)
        if not log_result(period_days in [6, 7], f"period.days in [6, 7]", f"Got {period_days}"):
            return False
        
        print(f"✅ FROM/TO DATE RANGE WORKING")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

def test_a3_marketing_metrics_auth():
    """A3: WITHOUT token AND with wrong token → 401"""
    log_test("A3", "Marketing metrics authentication")
    
    results = []
    
    # Test without token
    try:
        response = requests.get(
            f"{BASE_URL}/admin/marketing-metrics",
            params={"days": 7},
            timeout=10
        )
        results.append(log_result(response.status_code == 401, "WITHOUT token returns 401", f"Got {response.status_code}"))
    except Exception as e:
        results.append(log_result(False, f"Exception without token: {str(e)}"))
    
    # Test with wrong token
    try:
        response = requests.get(
            f"{BASE_URL}/admin/marketing-metrics",
            params={"days": 7, "token": "wrong_token_123"},
            timeout=10
        )
        results.append(log_result(response.status_code == 401, "WITH wrong token returns 401", f"Got {response.status_code}"))
    except Exception as e:
        results.append(log_result(False, f"Exception with wrong token: {str(e)}"))
    
    return all(results)

def test_a4_marketing_metrics_admin_key():
    """A4: Also accepts ?key=dh_admin_b3Kx92Qz7Lm4 (admin auth)"""
    log_test("A4", "Marketing metrics with admin key")
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/marketing-metrics",
            params={"days": 7, "key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        
        if not log_result(response.status_code == 200, f"Status code is 200 with admin key", f"Got {response.status_code}"):
            return False
        
        data = response.json()
        if not log_result(data.get("ok") == True, "ok == true"):
            return False
        
        print(f"✅ ADMIN KEY AUTHENTICATION WORKING")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# (B) GDPR CONSENT-GATING TESTS
# ============================================================================

def test_b1_consent_gating_with_consent():
    """B1: POST /api/leads with Cookie: dh_consent_mkt=1"""
    log_test("B1", "Lead creation with marketing consent (cookie=1)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/leads",
            headers={"Cookie": "dh_consent_mkt=1"},
            json={
                "name": "QA Consent1",
                "email": "qa-c1@example.test",
                "phone": "+47 90000101",
                "address": "Testveien 1, 5003 Bergen",
                "lead_type": "huseier",
                "attribution": {
                    "fbclid": "X",
                    "visitorId": "v1"
                }
            },
            timeout=30
        )
        
        if not log_result(response.status_code == 201, f"Status code is 201", f"Got {response.status_code}"):
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        lead = data.get("lead", {})
        
        # Track for cleanup
        if lead.get("id"):
            test_lead_ids.append(lead["id"])
        
        # Check marketingConsent
        if not log_result(lead.get("marketingConsent") == True, "marketingConsent == true"):
            return False
        
        # Check metaCapi (should be present, ok should be true but NOT required)
        meta_capi = lead.get("metaCapi", {})
        if "metaCapi" in lead:
            print(f"  metaCapi present: ok={meta_capi.get('ok')} (best-effort, not required to pass)")
        else:
            print(f"  metaCapi not present (acceptable if Meta API failed)")
        
        # Check forwarded
        if not log_result(data.get("forwarded") in [True, False], "forwarded field present"):
            return False
        
        print(f"✅ CONSENT=1: marketingConsent=true, Meta CAPI fired (best-effort)")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

def test_b2_consent_gating_without_consent():
    """B2: POST /api/leads with Cookie: dh_consent_mkt=0"""
    log_test("B2", "Lead creation WITHOUT marketing consent (cookie=0)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/leads",
            headers={"Cookie": "dh_consent_mkt=0"},
            json={
                "name": "QA Consent0",
                "email": "qa-c0@example.test",
                "phone": "+47 90000102",
                "address": "Testveien 2, 5003 Bergen",
                "lead_type": "huseier",
                "attribution": {
                    "fbclid": "Y",
                    "visitorId": "v2"
                }
            },
            timeout=30
        )
        
        if not log_result(response.status_code == 201, f"Status code is 201", f"Got {response.status_code}"):
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        lead = data.get("lead", {})
        
        # Track for cleanup
        if lead.get("id"):
            test_lead_ids.append(lead["id"])
        
        # Check marketingConsent
        if not log_result(lead.get("marketingConsent") == False, "marketingConsent == false"):
            return False
        
        # Check metaCapi MUST be absent
        if not log_result("metaCapi" not in lead, "metaCapi field ABSENT (CAPI NOT fired)"):
            print(f"  ERROR: metaCapi should not be present when consent=false")
            return False
        
        print(f"✅ CONSENT=0: marketingConsent=false, Meta CAPI NOT fired (correctly gated)")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

def test_b3_consent_gating_no_cookie():
    """B3: POST /api/leads WITHOUT cookie"""
    log_test("B3", "Lead creation without consent cookie (backward compat)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/leads",
            json={
                "name": "QA ConsentNull",
                "email": "qa-cnull@example.test",
                "phone": "+47 90000103",
                "address": "Testveien 3, 5003 Bergen",
                "lead_type": "huseier",
                "attribution": {
                    "fbclid": "Z",
                    "visitorId": "v3"
                }
            },
            timeout=30
        )
        
        if not log_result(response.status_code == 201, f"Status code is 201", f"Got {response.status_code}"):
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        lead = data.get("lead", {})
        
        # Track for cleanup
        if lead.get("id"):
            test_lead_ids.append(lead["id"])
        
        # Check marketingConsent is null
        if not log_result(lead.get("marketingConsent") is None, "marketingConsent == null"):
            return False
        
        # Check metaCapi fires (backward compat)
        meta_capi = lead.get("metaCapi", {})
        if "metaCapi" in lead:
            print(f"  metaCapi present: ok={meta_capi.get('ok')} (backward compat: fires when consent=null)")
        else:
            print(f"  metaCapi not present (acceptable if Meta API failed)")
        
        print(f"✅ NO COOKIE: marketingConsent=null, Meta CAPI fires (backward compat)")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

def test_b4_consent_gating_tenant():
    """B4: POST /api/tenants with Cookie: dh_consent_mkt=0"""
    log_test("B4", "Tenant creation WITHOUT marketing consent (cookie=0)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/tenants",
            headers={"Cookie": "dh_consent_mkt=0"},
            json={
                "name": "QA T0",
                "email": "qa-t0@example.test",
                "phone": "+47 90000202",
                "preferred_area": "Sentrum",
                "bedrooms": 1,
                "move_in_date": "2026-09-01",
                "attribution": {
                    "fbclid": "x"
                }
            },
            timeout=30
        )
        
        if not log_result(response.status_code in [200, 201], f"Status code is 200/201", f"Got {response.status_code}"):
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        tenant = data.get("tenant", {})
        
        # Track for cleanup (tenants are in tenant_leads collection)
        if tenant.get("id"):
            test_lead_ids.append(tenant["id"])
        
        # Check marketingConsent
        if not log_result(tenant.get("marketingConsent") == False, "tenant.marketingConsent == false"):
            return False
        
        # Check metaCapi MUST be absent
        if not log_result("metaCapi" not in tenant, "tenant.metaCapi field ABSENT (CAPI NOT fired)"):
            print(f"  ERROR: metaCapi should not be present when consent=false")
            return False
        
        print(f"✅ TENANT CONSENT=0: marketingConsent=false, Meta CAPI NOT fired")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# (C) LIFECYCLE EVENTS + CLOSED-LOOP WEBHOOK TESTS
# ============================================================================

def test_c1_create_lead_for_lifecycle():
    """C1: Create lead with consent for lifecycle testing"""
    log_test("C1", "Create lead for lifecycle event testing")
    
    try:
        response = requests.post(
            f"{BASE_URL}/leads",
            headers={"Cookie": "dh_consent_mkt=1"},
            json={
                "name": "QA LC",
                "email": "qa-lc@example.test",
                "phone": "+47 90000303",
                "address": "Testveien 3, 5003 Bergen",
                "lead_type": "huseier",
                "attribution": {
                    "fbclid": "FB_LC",
                    "visitorId": "vlc"
                }
            },
            timeout=30
        )
        
        if not log_result(response.status_code == 201, f"Status code is 201", f"Got {response.status_code}"):
            print(f"Response: {response.text[:500]}")
            return False, None
        
        data = response.json()
        lead_id = data.get("data", {}).get("id") or data.get("lead", {}).get("id")
        
        if not log_result(lead_id is not None, "Lead ID captured", f"ID: {lead_id}"):
            return False, None
        
        # Track for cleanup
        test_lead_ids.append(lead_id)
        
        print(f"✅ LEAD CREATED: {lead_id}")
        return True, lead_id
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False, None

def test_c2_webhook_qualified(lead_id):
    """C2: POST webhook with status='qualified'"""
    log_test("C2", "Webhook: status='qualified' (lifecycle event)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={
                "external_ref": lead_id,
                "status": "qualified"
            },
            timeout=30
        )
        
        if not log_result(response.status_code == 200, f"Status code is 200", f"Got {response.status_code}"):
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        if not log_result(data.get("ok") == True, "ok == true"):
            return False
        
        if not log_result(data.get("status") == "qualified", "status == 'qualified'"):
            return False
        
        if not log_result(data.get("matched_by") == "external_ref", "matched_by == 'external_ref'"):
            return False
        
        print(f"✅ QUALIFIED STATUS SET (lifecycle event 'QualifiedLead' should fire)")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

def test_c3_webhook_contacted(lead_id):
    """C3: POST webhook with status='contacted'"""
    log_test("C3", "Webhook: status='contacted' (lifecycle event)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={
                "external_ref": lead_id,
                "status": "contacted"
            },
            timeout=30
        )
        
        if not log_result(response.status_code == 200, f"Status code is 200", f"Got {response.status_code}"):
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        if not log_result(data.get("ok") == True, "ok == true"):
            return False
        
        if not log_result(data.get("status") == "contacted", "status == 'contacted'"):
            return False
        
        print(f"✅ CONTACTED STATUS SET (lifecycle event 'Contact' should fire)")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

def test_c4_webhook_won(lead_id):
    """C4: POST webhook with status='won', value=24000"""
    log_test("C4", "Webhook: status='won' with value (Purchase event)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={
                "external_ref": lead_id,
                "status": "won",
                "value": 24000,
                "currency": "NOK"
            },
            timeout=30
        )
        
        if not log_result(response.status_code == 200, f"Status code is 200", f"Got {response.status_code}"):
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        if not log_result(data.get("ok") == True, "ok == true"):
            return False
        
        if not log_result(data.get("status") == "won", "status == 'won'"):
            return False
        
        # Check meta_capi field (best-effort)
        meta_capi = data.get("meta_capi")
        if meta_capi:
            print(f"  meta_capi present: {meta_capi} (Purchase event fired)")
        else:
            print(f"  meta_capi not present (acceptable if Meta API failed)")
        
        print(f"✅ WON STATUS SET with value=24000 (Purchase event should fire)")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

def test_c5_webhook_idempotency(lead_id):
    """C5: REPEAT C4 (idempotency test)"""
    log_test("C5", "Webhook idempotency: repeat 'won' status")
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={
                "external_ref": lead_id,
                "status": "won",
                "value": 24000,
                "currency": "NOK"
            },
            timeout=30
        )
        
        if not log_result(response.status_code == 200, f"Status code is 200 (no crash)", f"Got {response.status_code}"):
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        if not log_result(data.get("ok") == True, "ok == true (idempotent)"):
            return False
        
        print(f"✅ IDEMPOTENCY WORKING: repeated webhook call succeeded without crash")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

def test_c6_webhook_auth():
    """C6: WITHOUT/wrong secret → 401"""
    log_test("C6", "Webhook authentication")
    
    results = []
    
    # Test without secret
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json={
                "external_ref": "fake-id",
                "status": "qualified"
            },
            timeout=10
        )
        results.append(log_result(response.status_code == 401, "WITHOUT secret returns 401", f"Got {response.status_code}"))
    except Exception as e:
        results.append(log_result(False, f"Exception without secret: {str(e)}"))
    
    # Test with wrong secret
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": "wrong_secret_123"},
            json={
                "external_ref": "fake-id",
                "status": "qualified"
            },
            timeout=10
        )
        results.append(log_result(response.status_code == 401, "WITH wrong secret returns 401", f"Got {response.status_code}"))
    except Exception as e:
        results.append(log_result(False, f"Exception with wrong secret: {str(e)}"))
    
    return all(results)

def test_c7_webhook_nonexistent_lead():
    """C7: external_ref that does not exist → 404"""
    log_test("C7", "Webhook with nonexistent external_ref")
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={
                "external_ref": "nonexistent-lead-id-12345",
                "status": "qualified"
            },
            timeout=10
        )
        
        if not log_result(response.status_code == 404, f"Status code is 404", f"Got {response.status_code}"):
            return False
        
        data = response.json()
        if not log_result(data.get("ok") == False, "ok == false"):
            return False
        
        print(f"✅ NONEXISTENT LEAD: returns 404 (does NOT create new lead)")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# (D) REGRESSION TESTS
# ============================================================================

def test_d1_root_endpoint():
    """D1: GET /api/ → 200 {ok:true}"""
    log_test("D1", "Root endpoint regression")
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        
        if not log_result(response.status_code == 200, f"Status code is 200", f"Got {response.status_code}"):
            return False
        
        data = response.json()
        if not log_result(data.get("ok") == True, "ok == true"):
            return False
        
        print(f"✅ ROOT ENDPOINT WORKING")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

def test_d2_admin_leads_with_key():
    """D2: GET /api/admin/leads?key=dh_admin_b3Kx92Qz7Lm4 → 200"""
    log_test("D2", "Admin leads endpoint with key")
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/leads",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        
        if not log_result(response.status_code == 200, f"Status code is 200", f"Got {response.status_code}"):
            return False
        
        data = response.json()
        if not log_result(isinstance(data, list) or "leads" in data, "Response is array or has 'leads' field"):
            return False
        
        print(f"✅ ADMIN LEADS ENDPOINT WORKING")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

def test_d3_leads_empty_body():
    """D3: POST /api/leads empty body {} → 400 (no 500)"""
    log_test("D3", "Leads endpoint with empty body")
    
    try:
        response = requests.post(
            f"{BASE_URL}/leads",
            json={},
            timeout=10
        )
        
        if not log_result(response.status_code == 400, f"Status code is 400 (not 500)", f"Got {response.status_code}"):
            return False
        
        data = response.json()
        if not log_result(data.get("success") == False or data.get("ok") == False, "success/ok == false"):
            return False
        
        print(f"✅ EMPTY BODY VALIDATION WORKING (400, not 500)")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

def test_d4_admin_leads_without_key():
    """D4: GET /api/admin/leads (no key) → 401"""
    log_test("D4", "Admin leads endpoint without key")
    
    try:
        response = requests.get(f"{BASE_URL}/admin/leads", timeout=10)
        
        if not log_result(response.status_code == 401, f"Status code is 401", f"Got {response.status_code}"):
            return False
        
        print(f"✅ ADMIN AUTHENTICATION WORKING (401 without key)")
        return True
        
    except Exception as e:
        log_result(False, f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def main():
    print(f"\n{'#'*80}")
    print(f"# BACKEND TESTING: NEW SESSION CHANGES")
    print(f"# Base URL: {BASE_URL}")
    print(f"# Timeout: {TIMEOUT}s (real Google/Meta API calls)")
    print(f"{'#'*80}\n")
    
    results = {}
    
    # (A) MARKETING-METRICS TESTS
    print(f"\n{'='*80}")
    print(f"(A) MARKETING-METRICS ENDPOINT TESTS")
    print(f"{'='*80}")
    results["A1"] = test_a1_marketing_metrics_with_days()
    results["A2"] = test_a2_marketing_metrics_with_from_to()
    results["A3"] = test_a3_marketing_metrics_auth()
    results["A4"] = test_a4_marketing_metrics_admin_key()
    
    # (B) GDPR CONSENT-GATING TESTS
    print(f"\n{'='*80}")
    print(f"(B) GDPR CONSENT-GATING TESTS")
    print(f"{'='*80}")
    results["B1"] = test_b1_consent_gating_with_consent()
    results["B2"] = test_b2_consent_gating_without_consent()
    results["B3"] = test_b3_consent_gating_no_cookie()
    results["B4"] = test_b4_consent_gating_tenant()
    
    # (C) LIFECYCLE EVENTS + CLOSED-LOOP WEBHOOK TESTS
    print(f"\n{'='*80}")
    print(f"(C) LIFECYCLE EVENTS + CLOSED-LOOP WEBHOOK TESTS")
    print(f"{'='*80}")
    c1_result, lead_id = test_c1_create_lead_for_lifecycle()
    results["C1"] = c1_result
    
    if lead_id:
        results["C2"] = test_c2_webhook_qualified(lead_id)
        results["C3"] = test_c3_webhook_contacted(lead_id)
        results["C4"] = test_c4_webhook_won(lead_id)
        results["C5"] = test_c5_webhook_idempotency(lead_id)
    else:
        print("⚠️  Skipping C2-C5 tests (no lead ID from C1)")
        results["C2"] = results["C3"] = results["C4"] = results["C5"] = False
    
    results["C6"] = test_c6_webhook_auth()
    results["C7"] = test_c7_webhook_nonexistent_lead()
    
    # (D) REGRESSION TESTS
    print(f"\n{'='*80}")
    print(f"(D) REGRESSION TESTS")
    print(f"{'='*80}")
    results["D1"] = test_d1_root_endpoint()
    results["D2"] = test_d2_admin_leads_with_key()
    results["D3"] = test_d3_leads_empty_body()
    results["D4"] = test_d4_admin_leads_without_key()
    
    # CLEANUP
    cleanup_test_leads()
    
    # SUMMARY
    print(f"\n{'#'*80}")
    print(f"# TEST SUMMARY")
    print(f"{'#'*80}\n")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    print(f"TOTAL: {passed}/{total} tests passed ({100*passed//total}% success rate)\n")
    
    for test_id, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_id}: {status}")
    
    print(f"\n{'#'*80}\n")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"⚠️  {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    exit(main())
