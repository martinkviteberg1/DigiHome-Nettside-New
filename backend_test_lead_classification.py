#!/usr/bin/env python3
"""
Backend test for lead source classification + re-forward cron + GA4 MP no-op.
Tests ONLY the new additive backend changes as requested in review_request.
"""
import requests
import json
import time
import os

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
ADS_CRON_SECRET = "dhcron_a086510e5c7b578259dcc1c6d45149d8c46442d4"
TIMEOUT = 30

# Browser-like User-Agent (for tenant POST)
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

def test_a1_lead_paid_classification():
    """A1: POST /api/leads with paid attribution (gclid) → lead_source_type='paid', is_paid=true"""
    print("\n=== TEST A1: Lead with paid attribution (gclid) ===")
    try:
        payload = {
            "name": "QA Klass Paid",
            "phone": "90000001",
            "property_type": "leilighet",
            "attribution": {
                "source": "google",
                "medium": "cpc",
                "campaign": "qa",
                "gclid": "TESTGCLID123",
                "visitorId": "qa-vid-1",
                "landing": "/lp/forvaltning"
            }
        }
        r = requests.post(f"{BASE_URL}/leads", json=payload, timeout=TIMEOUT)
        print(f"  Status: {r.status_code}")
        
        if r.status_code not in [200, 201]:
            print(f"  ❌ FAIL: Expected 200/201, got {r.status_code}")
            print(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        lead_id = data.get("data", {}).get("id") or data.get("id")
        print(f"  ✅ Lead created: {lead_id}")
        
        # Verify via GET /api/admin/leads
        time.sleep(1)
        r2 = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        if r2.status_code != 200:
            print(f"  ❌ FAIL: Could not fetch leads for verification (status {r2.status_code})")
            return False
        
        leads = r2.json().get("leads", [])
        lead = next((l for l in leads if l.get("id") == lead_id), None)
        
        if not lead:
            print(f"  ❌ FAIL: Lead {lead_id} not found in admin/leads")
            return False
        
        # Verify fields
        lead_source_type = lead.get("lead_source_type")
        is_paid = lead.get("is_paid")
        marketing_visitor_id = lead.get("marketing_visitor_id")
        attr_lead_source_type = (lead.get("attribution") or {}).get("lead_source_type")
        
        print(f"  lead_source_type: {lead_source_type} (expected 'paid')")
        print(f"  is_paid: {is_paid} (expected True)")
        print(f"  marketing_visitor_id: {marketing_visitor_id} (expected 'qa-vid-1')")
        print(f"  attribution.lead_source_type: {attr_lead_source_type} (expected 'paid')")
        
        if lead_source_type != "paid":
            print(f"  ❌ FAIL: lead_source_type is '{lead_source_type}', expected 'paid'")
            return False
        if is_paid != True:
            print(f"  ❌ FAIL: is_paid is {is_paid}, expected True")
            return False
        if marketing_visitor_id != "qa-vid-1":
            print(f"  ❌ FAIL: marketing_visitor_id is '{marketing_visitor_id}', expected 'qa-vid-1'")
            return False
        if attr_lead_source_type != "paid":
            print(f"  ❌ FAIL: attribution.lead_source_type is '{attr_lead_source_type}', expected 'paid'")
            return False
        
        print(f"  ✅ PASS: All fields correct (lead_source_type='paid', is_paid=True, marketing_visitor_id='qa-vid-1')")
        return True
        
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_a2_lead_direct_classification():
    """A2: POST /api/leads with direct attribution → lead_source_type IN ['direct','organic'], is_paid=false"""
    print("\n=== TEST A2: Lead with direct attribution ===")
    try:
        payload = {
            "name": "QA Klass Direct",
            "phone": "90000002",
            "attribution": {
                "source": "",
                "medium": "",
                "visitorId": "qa-vid-2"
            }
        }
        r = requests.post(f"{BASE_URL}/leads", json=payload, timeout=TIMEOUT)
        print(f"  Status: {r.status_code}")
        
        if r.status_code not in [200, 201]:
            print(f"  ❌ FAIL: Expected 200/201, got {r.status_code}")
            print(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        lead_id = data.get("data", {}).get("id") or data.get("id")
        print(f"  ✅ Lead created: {lead_id}")
        
        # Verify via GET /api/admin/leads
        time.sleep(1)
        r2 = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        if r2.status_code != 200:
            print(f"  ❌ FAIL: Could not fetch leads for verification (status {r2.status_code})")
            return False
        
        leads = r2.json().get("leads", [])
        lead = next((l for l in leads if l.get("id") == lead_id), None)
        
        if not lead:
            print(f"  ❌ FAIL: Lead {lead_id} not found in admin/leads")
            return False
        
        # Verify fields
        lead_source_type = lead.get("lead_source_type")
        is_paid = lead.get("is_paid")
        
        print(f"  lead_source_type: {lead_source_type} (expected 'direct' or 'organic')")
        print(f"  is_paid: {is_paid} (expected False)")
        
        if lead_source_type not in ["direct", "organic"]:
            print(f"  ❌ FAIL: lead_source_type is '{lead_source_type}', expected 'direct' or 'organic'")
            return False
        if is_paid != False:
            print(f"  ❌ FAIL: is_paid is {is_paid}, expected False")
            return False
        
        print(f"  ✅ PASS: lead_source_type='{lead_source_type}' (in ['direct','organic']), is_paid=False")
        return True
        
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_b_tenant_paid_classification():
    """B: POST /api/tenants with paid attribution → lead_source_type='paid', is_paid=true"""
    print("\n=== TEST B: Tenant with paid attribution ===")
    try:
        payload = {
            "name": "QA Klass Tenant",
            "phone": "90000003",
            "preferred_area": "Sentrum",
            "source": "lp-leietaker",
            "attribution": {
                "source": "facebook",
                "medium": "paid_social",
                "visitorId": "qa-vid-3"
            }
        }
        headers = {"User-Agent": BROWSER_UA}
        r = requests.post(f"{BASE_URL}/tenants", json=payload, headers=headers, timeout=TIMEOUT)
        print(f"  Status: {r.status_code}")
        
        if r.status_code not in [200, 201]:
            print(f"  ❌ FAIL: Expected 200/201, got {r.status_code}")
            print(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        tenant_id = data.get("data", {}).get("id") or data.get("id")
        tenant_obj = data.get("tenant")
        print(f"  ✅ Tenant created: {tenant_id}")
        
        # Check response object first
        if tenant_obj:
            lead_source_type = tenant_obj.get("lead_source_type")
            is_paid = tenant_obj.get("is_paid")
            print(f"  (from response) lead_source_type: {lead_source_type}, is_paid: {is_paid}")
        
        # Verify via GET /api/admin/leads (includes tenants)
        time.sleep(1)
        r2 = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        if r2.status_code != 200:
            print(f"  ❌ FAIL: Could not fetch leads for verification (status {r2.status_code})")
            return False
        
        tenants = r2.json().get("tenants", [])
        tenant = next((t for t in tenants if t.get("id") == tenant_id), None)
        
        if not tenant:
            print(f"  ❌ FAIL: Tenant {tenant_id} not found in admin/leads tenants array")
            return False
        
        # Verify fields
        lead_source_type = tenant.get("lead_source_type")
        is_paid = tenant.get("is_paid")
        
        print(f"  (from admin/leads) lead_source_type: {lead_source_type} (expected 'paid')")
        print(f"  (from admin/leads) is_paid: {is_paid} (expected True)")
        
        if lead_source_type != "paid":
            print(f"  ❌ FAIL: lead_source_type is '{lead_source_type}', expected 'paid'")
            return False
        if is_paid != True:
            print(f"  ❌ FAIL: is_paid is {is_paid}, expected True")
            return False
        
        print(f"  ✅ PASS: lead_source_type='paid', is_paid=True")
        return True
        
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_c1_cron_reforward_with_token():
    """C1: GET /api/cron/reforward-leads?token=<ADS_CRON_SECRET> → 200 {ok:true, leads:{tried,ok}, tenants:{tried,ok}}"""
    print("\n=== TEST C1: Cron re-forward WITH token ===")
    try:
        r = requests.get(f"{BASE_URL}/cron/reforward-leads", params={"token": ADS_CRON_SECRET}, timeout=TIMEOUT)
        print(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            print(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        ok = data.get("ok")
        leads = data.get("leads", {})
        tenants = data.get("tenants", {})
        
        print(f"  ok: {ok}")
        print(f"  leads: {leads}")
        print(f"  tenants: {tenants}")
        
        if ok != True:
            print(f"  ❌ FAIL: ok is {ok}, expected True")
            return False
        
        if not isinstance(leads, dict) or "tried" not in leads or "ok" not in leads:
            print(f"  ❌ FAIL: leads object missing 'tried' or 'ok' fields")
            return False
        
        if not isinstance(tenants, dict) or "tried" not in tenants or "ok" not in tenants:
            print(f"  ❌ FAIL: tenants object missing 'tried' or 'ok' fields")
            return False
        
        print(f"  ✅ PASS: 200 {{'ok':true, leads:{{'tried':{leads['tried']}, 'ok':{leads['ok']}}}, tenants:{{'tried':{tenants['tried']}, 'ok':{tenants['ok']}}}}}")
        return True
        
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_c2_cron_reforward_without_token():
    """C2: GET /api/cron/reforward-leads WITHOUT token → 401"""
    print("\n=== TEST C2: Cron re-forward WITHOUT token ===")
    try:
        r = requests.get(f"{BASE_URL}/cron/reforward-leads", timeout=TIMEOUT)
        print(f"  Status: {r.status_code}")
        
        if r.status_code != 401:
            print(f"  ❌ FAIL: Expected 401, got {r.status_code}")
            print(f"  Response: {r.text[:500]}")
            return False
        
        print(f"  ✅ PASS: 401 (authentication required)")
        return True
        
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_d_ga4_mp_noop():
    """D: GA4 MP is a NO-OP (GA4_API_SECRET not set) — confirm nothing broke"""
    print("\n=== TEST D: GA4 MP no-op (GA4_API_SECRET not set) ===")
    try:
        # Just confirm root endpoint still works
        r = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
        print(f"  GET /api/ status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"  ❌ FAIL: Root endpoint returned {r.status_code}")
            return False
        
        data = r.json()
        if data.get("ok") != True:
            print(f"  ❌ FAIL: Root endpoint ok={data.get('ok')}, expected True")
            return False
        
        print(f"  ✅ PASS: Root endpoint working (GA4 MP no-op did not break anything)")
        return True
        
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_regression_analytics():
    """REGRESSION: GET /api/admin/analytics?key=...&days=30 → 200 with funnels + traffic + leads"""
    print("\n=== TEST REGRESSION: Admin analytics endpoint ===")
    try:
        r = requests.get(f"{BASE_URL}/admin/analytics", params={"key": ADMIN_KEY, "days": 30}, timeout=TIMEOUT)
        print(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            print(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        
        # Check for required top-level fields
        has_funnels = "funnels" in data
        has_traffic = "traffic" in data
        has_leads = "leads" in data
        
        print(f"  Has 'funnels': {has_funnels}")
        print(f"  Has 'traffic': {has_traffic}")
        print(f"  Has 'leads': {has_leads}")
        
        if not has_funnels:
            print(f"  ❌ FAIL: Missing 'funnels' field")
            return False
        if not has_traffic:
            print(f"  ❌ FAIL: Missing 'traffic' field")
            return False
        if not has_leads:
            print(f"  ❌ FAIL: Missing 'leads' field")
            return False
        
        print(f"  ✅ PASS: Analytics endpoint has funnels + traffic + leads")
        return True
        
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def main():
    print("=" * 80)
    print("BACKEND TEST: Lead Source Classification + Re-forward Cron + GA4 MP No-op")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"ADS_CRON_SECRET: {ADS_CRON_SECRET}")
    print(f"Timeout: {TIMEOUT}s")
    
    results = []
    
    # (A) LEAD SOURCE CLASSIFICATION
    results.append(("A1: Lead paid classification", test_a1_lead_paid_classification()))
    results.append(("A2: Lead direct classification", test_a2_lead_direct_classification()))
    
    # (B) TENANT
    results.append(("B: Tenant paid classification", test_b_tenant_paid_classification()))
    
    # (C) CRON RE-FORWARD
    results.append(("C1: Cron re-forward WITH token", test_c1_cron_reforward_with_token()))
    results.append(("C2: Cron re-forward WITHOUT token", test_c2_cron_reforward_without_token()))
    
    # (D) GA4 MP NO-OP
    results.append(("D: GA4 MP no-op", test_d_ga4_mp_noop()))
    
    # REGRESSION
    results.append(("REGRESSION: Analytics endpoint", test_regression_analytics()))
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({100*passed//total}% success rate)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    exit(main())
