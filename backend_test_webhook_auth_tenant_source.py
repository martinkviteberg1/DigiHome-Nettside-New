#!/usr/bin/env python3
"""
Backend test for TWO small additive backend changes:
(A) WEBHOOK AUTH ROBUSTNESS — POST /api/webhooks/lead-status accepts secret via multiple conventions
(B) TENANT SOURCE FIELD — POST /api/tenants with source field
"""

import requests
import sys
import time

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
WEBHOOK_SECRET = "dhsync_dc0dc1750aff067a4baef7adafc7991f7340eacc44f27036"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Browser-like User-Agent (required to avoid bot filtering)
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

def test_webhook_auth_robustness():
    """
    Test (A): WEBHOOK AUTH ROBUSTNESS
    POST /api/webhooks/lead-status now accepts the secret via multiple conventions.
    Use body {external_ref:'qa-nonexistent-ref', status:'contacted'} (unknown ref is fine — auth is checked BEFORE lookup).
    Use status 'contacted' (NOT 'won', to avoid triggering Purchase CAPI).
    """
    print("\n" + "="*80)
    print("TEST (A): WEBHOOK AUTH ROBUSTNESS")
    print("="*80)
    
    # Test body with nonexistent external_ref (auth is checked BEFORE lookup)
    test_body = {
        "external_ref": "qa-nonexistent-ref",
        "status": "contacted"
    }
    
    # Test A1: Header 'X-Webhook-Secret: <secret>' → NOT 401 (expect 200 or graceful 404/ok for unknown ref)
    print("\n[A1] Testing X-Webhook-Secret header...")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=test_body,
            headers={
                "X-Webhook-Secret": WEBHOOK_SECRET,
                "User-Agent": BROWSER_UA
            },
            timeout=30
        )
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.json()}")
        
        if response.status_code == 401:
            print("  ❌ FAIL: Got 401 (should NOT be 401 with correct secret)")
            return False
        elif response.status_code in [200, 404]:
            print(f"  ✅ PASS: Got {response.status_code} (NOT 401, auth passed)")
        else:
            print(f"  ⚠️  Got unexpected status {response.status_code}, but NOT 401 (auth passed)")
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False
    
    # Test A2: Header 'Authorization: Bearer <secret>' → NOT 401
    print("\n[A2] Testing Authorization: Bearer header...")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=test_body,
            headers={
                "Authorization": f"Bearer {WEBHOOK_SECRET}",
                "User-Agent": BROWSER_UA
            },
            timeout=30
        )
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.json()}")
        
        if response.status_code == 401:
            print("  ❌ FAIL: Got 401 (should NOT be 401 with correct Bearer token)")
            return False
        elif response.status_code in [200, 404]:
            print(f"  ✅ PASS: Got {response.status_code} (NOT 401, auth passed)")
        else:
            print(f"  ⚠️  Got unexpected status {response.status_code}, but NOT 401 (auth passed)")
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False
    
    # Test A3: Query '?secret=<secret>' → NOT 401
    print("\n[A3] Testing query parameter ?secret=...")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status?secret={WEBHOOK_SECRET}",
            json=test_body,
            headers={
                "User-Agent": BROWSER_UA
            },
            timeout=30
        )
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.json()}")
        
        if response.status_code == 401:
            print("  ❌ FAIL: Got 401 (should NOT be 401 with correct query secret)")
            return False
        elif response.status_code in [200, 404]:
            print(f"  ✅ PASS: Got {response.status_code} (NOT 401, auth passed)")
        else:
            print(f"  ⚠️  Got unexpected status {response.status_code}, but NOT 401 (auth passed)")
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False
    
    # Test A4: Header 'X-Webhook-Secret: wrongvalue' → 401
    print("\n[A4] Testing wrong secret value...")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=test_body,
            headers={
                "X-Webhook-Secret": "wrongvalue",
                "User-Agent": BROWSER_UA
            },
            timeout=30
        )
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.json()}")
        
        if response.status_code == 401:
            print("  ✅ PASS: Got 401 (correctly rejected wrong secret)")
        else:
            print(f"  ❌ FAIL: Got {response.status_code} (should be 401 for wrong secret)")
            return False
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False
    
    # Test A5: No secret at all → 401
    print("\n[A5] Testing no secret...")
    try:
        response = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json=test_body,
            headers={
                "User-Agent": BROWSER_UA
            },
            timeout=30
        )
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.json()}")
        
        if response.status_code == 401:
            print("  ✅ PASS: Got 401 (correctly rejected no secret)")
        else:
            print(f"  ❌ FAIL: Got {response.status_code} (should be 401 for no secret)")
            return False
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False
    
    print("\n✅ ALL WEBHOOK AUTH ROBUSTNESS TESTS PASSED (5/5)")
    return True


def test_tenant_source_field():
    """
    Test (B): TENANT SOURCE FIELD
    POST /api/tenants with a browser-like User-Agent header and JSON body with source field.
    Verify the saved tenant lead has the correct source value.
    """
    print("\n" + "="*80)
    print("TEST (B): TENANT SOURCE FIELD")
    print("="*80)
    
    created_tenant_ids = []
    
    # Test B1: POST /api/tenants with source='lp-leietaker' → verify saved tenant has source='lp-leietaker'
    print("\n[B1] Testing POST /api/tenants with source='lp-leietaker'...")
    try:
        tenant_body = {
            "name": "QA Source Test",
            "phone": "90000000",
            "email": "qa-source@example.com",
            "preferred_area": "Sentrum",
            "source": "lp-leietaker"
        }
        
        response = requests.post(
            f"{BASE_URL}/tenants",
            json=tenant_body,
            headers={
                "User-Agent": BROWSER_UA
            },
            timeout=30
        )
        print(f"  Status: {response.status_code}")
        resp_data = response.json()
        print(f"  Response: {resp_data}")
        
        if response.status_code not in [200, 201]:
            print(f"  ❌ FAIL: Expected 200/201, got {response.status_code}")
            return False
        
        if not resp_data.get("success"):
            print(f"  ❌ FAIL: success is not true")
            return False
        
        # Check if tenant object has source='lp-leietaker'
        tenant = resp_data.get("tenant") or resp_data.get("data")
        if not tenant:
            print(f"  ❌ FAIL: No tenant object in response")
            return False
        
        tenant_id = tenant.get("id")
        if tenant_id:
            created_tenant_ids.append(tenant_id)
        
        tenant_source = tenant.get("source")
        print(f"  Tenant source: {tenant_source}")
        
        if tenant_source == "lp-leietaker":
            print("  ✅ PASS: Tenant has source='lp-leietaker' (correct)")
        else:
            print(f"  ❌ FAIL: Tenant source is '{tenant_source}', expected 'lp-leietaker'")
            return False
        
        # Also verify via GET /api/admin/leads
        print("  Verifying via GET /api/admin/leads...")
        time.sleep(1)  # Brief delay to ensure DB write completes
        
        leads_response = requests.get(
            f"{BASE_URL}/admin/leads",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        if leads_response.status_code == 200:
            leads_data = leads_response.json()
            # Handle both array and object response formats
            if isinstance(leads_data, list):
                leads = leads_data
            elif isinstance(leads_data, dict):
                leads = leads_data.get("leads", [])
            else:
                leads = []
            
            # Find the tenant we just created
            found_tenant = None
            for lead in leads:
                if isinstance(lead, dict) and lead.get("id") == tenant_id:
                    found_tenant = lead
                    break
            
            if found_tenant:
                db_source = found_tenant.get("source")
                print(f"  DB source: {db_source}")
                if db_source == "lp-leietaker":
                    print("  ✅ PASS: DB confirms source='lp-leietaker'")
                else:
                    print(f"  ❌ FAIL: DB source is '{db_source}', expected 'lp-leietaker'")
                    return False
            else:
                print(f"  ⚠️  Could not find tenant in DB (may be in tenant_leads collection)")
        
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False
    
    # Test B2: POST /api/tenants WITHOUT 'source' → verify it defaults to 'nettside'
    print("\n[B2] Testing POST /api/tenants WITHOUT source (should default to 'nettside')...")
    try:
        tenant_body = {
            "name": "QA Default Source Test",
            "phone": "90000001",
            "email": "qa-default-source@example.com",
            "preferred_area": "Sentrum"
            # NO source field
        }
        
        response = requests.post(
            f"{BASE_URL}/tenants",
            json=tenant_body,
            headers={
                "User-Agent": BROWSER_UA
            },
            timeout=30
        )
        print(f"  Status: {response.status_code}")
        resp_data = response.json()
        print(f"  Response: {resp_data}")
        
        if response.status_code not in [200, 201]:
            print(f"  ❌ FAIL: Expected 200/201, got {response.status_code}")
            return False
        
        if not resp_data.get("success"):
            print(f"  ❌ FAIL: success is not true")
            return False
        
        # Check if tenant object has source='nettside' (default)
        tenant = resp_data.get("tenant") or resp_data.get("data")
        if not tenant:
            print(f"  ❌ FAIL: No tenant object in response")
            return False
        
        tenant_id = tenant.get("id")
        if tenant_id:
            created_tenant_ids.append(tenant_id)
        
        tenant_source = tenant.get("source")
        print(f"  Tenant source: {tenant_source}")
        
        if tenant_source == "nettside":
            print("  ✅ PASS: Tenant has source='nettside' (correct default)")
        else:
            print(f"  ❌ FAIL: Tenant source is '{tenant_source}', expected 'nettside' (default)")
            return False
        
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False
    
    print("\n✅ ALL TENANT SOURCE FIELD TESTS PASSED (2/2)")
    print(f"\nCreated {len(created_tenant_ids)} test tenant(s): {created_tenant_ids}")
    print("Note: These QA tenant leads are acceptable per review_request.")
    return True


def test_regression():
    """
    REGRESSION: GET /api/ → 200 {ok:true}
    """
    print("\n" + "="*80)
    print("REGRESSION TEST")
    print("="*80)
    
    print("\n[R1] Testing GET /api/...")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=30)
        print(f"  Status: {response.status_code}")
        resp_data = response.json()
        print(f"  Response: {resp_data}")
        
        if response.status_code == 200:
            if resp_data.get("ok") is True:
                print("  ✅ PASS: GET /api/ returns 200 {ok:true}")
                return True
            else:
                print(f"  ❌ FAIL: ok is not true: {resp_data}")
                return False
        else:
            print(f"  ❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False


def main():
    print("="*80)
    print("BACKEND TEST: WEBHOOK AUTH ROBUSTNESS + TENANT SOURCE FIELD")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Webhook Secret: {WEBHOOK_SECRET[:20]}...")
    print(f"Admin Key: {ADMIN_KEY}")
    
    results = []
    
    # Test (A): Webhook Auth Robustness
    results.append(("Webhook Auth Robustness", test_webhook_auth_robustness()))
    
    # Test (B): Tenant Source Field
    results.append(("Tenant Source Field", test_tenant_source_field()))
    
    # Regression
    results.append(("Regression", test_regression()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} test groups passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n❌ {total - passed} test group(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
