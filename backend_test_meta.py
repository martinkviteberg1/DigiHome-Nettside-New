#!/usr/bin/env python3
"""
Backend test for Meta (Facebook) integration endpoints.
Tests CAPI Lead events, Meta Marketing API sync, and closed-loop won tracking.
"""
import requests
import json
import time
import sys

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
WEBHOOK_SECRET = "dhsync_dc0dc1750aff067a4baef7adafc7991f7340eacc44f27036"
TIMEOUT = 30

def test_1_post_lead_with_meta_attribution():
    """Test 1: POST /api/leads with Meta attribution (fbclid, fbp)"""
    print("\n" + "="*80)
    print("TEST 1: POST /api/leads with Meta attribution (fbclid, fbp)")
    print("="*80)
    
    try:
        payload = {
            "name": "QA Meta Bot",
            "email": "qa-meta@example.test",
            "phone": "+47 90000088",
            "address": "Testveien 2, 5003 Bergen",
            "property_type": "leilighet",
            "lead_type": "huseier",
            "source": "qa-meta",
            "attribution": {
                "source": "facebook",
                "medium": "cpc",
                "campaign": "qa-meta-camp",
                "fbclid": "QA_FBCLID_123",
                "fbp": "fb.1.123456.7890"
            }
        }
        
        print(f"POST {BASE_URL}/leads")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/leads",
            json=payload,
            timeout=TIMEOUT
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code != 201:
            print(f"❌ FAIL: Expected 201, got {response.status_code}")
            return None
        
        data = response.json()
        
        # Verify attribution fields are stored
        if "lead" not in data:
            print("❌ FAIL: No 'lead' field in response")
            return None
        
        lead = data["lead"]
        attribution = lead.get("attribution", {})
        
        if attribution.get("fbclid") != "QA_FBCLID_123":
            print(f"❌ FAIL: fbclid not stored correctly. Got: {attribution.get('fbclid')}")
            return None
        
        if attribution.get("fbp") != "fb.1.123456.7890":
            print(f"❌ FAIL: fbp not stored correctly. Got: {attribution.get('fbp')}")
            return None
        
        lead_id = data.get("data", {}).get("id")
        if not lead_id:
            print("❌ FAIL: No lead ID in response")
            return None
        
        print(f"✅ PASS: Lead created with ID {lead_id}")
        print(f"✅ PASS: fbclid stored correctly: {attribution.get('fbclid')}")
        print(f"✅ PASS: fbp stored correctly: {attribution.get('fbp')}")
        
        # Check metaCapi field (best-effort, may be true or false)
        meta_capi = lead.get("metaCapi", {})
        if meta_capi:
            print(f"ℹ️  INFO: metaCapi.ok = {meta_capi.get('ok')} (best-effort, not required to pass)")
        
        return lead_id
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return None


def test_2_get_ads_overview_before_sync():
    """Test 2: GET /api/admin/ads/overview before sync"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/admin/ads/overview?key=... (before sync)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if not data.get("ok"):
            print("❌ FAIL: ok field is not true")
            return False
        
        if not data.get("metaConfigured"):
            print("❌ FAIL: metaConfigured is not true")
            return False
        
        print(f"✅ PASS: ok = {data.get('ok')}")
        print(f"✅ PASS: metaConfigured = {data.get('metaConfigured')}")
        
        # economics may be null if no Google CSV imported - that's OK
        economics = data.get("economics")
        if economics:
            print(f"ℹ️  INFO: Google economics present (source: {economics.get('source')})")
        else:
            print("ℹ️  INFO: Google economics is null (no CSV imported yet - OK)")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_3_post_meta_sync():
    """Test 3: POST /api/admin/ads/meta-sync with datePreset"""
    print("\n" + "="*80)
    print("TEST 3: POST /api/admin/ads/meta-sync?key=... (REAL Meta API call)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/meta-sync?key={ADMIN_KEY}"
        payload = {"datePreset": "last_30d"}
        
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print("⏳ This may take 1-3 seconds (real Meta API call)...")
        
        start_time = time.time()
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        print(f"Status: {response.status_code} (took {elapsed:.2f}s)")
        print(f"Response: {response.text[:1000]}")
        
        if response.status_code != 201:
            print(f"❌ FAIL: Expected 201, got {response.status_code}")
            return False
        
        data = response.json()
        
        if not data.get("ok"):
            print("❌ FAIL: ok field is not true")
            return False
        
        economics = data.get("economics")
        if not economics:
            print("❌ FAIL: No economics field in response")
            return False
        
        if economics.get("source") != "meta":
            print(f"❌ FAIL: economics.source is not 'meta', got: {economics.get('source')}")
            return False
        
        totals = economics.get("totals", {})
        cost = totals.get("cost", 0)
        
        if cost <= 0:
            print(f"❌ FAIL: totals.cost is not > 0, got: {cost}")
            return False
        
        campaigns = economics.get("campaigns", [])
        parsed_campaigns = data.get("parsedCampaigns", 0)
        
        if parsed_campaigns < 1:
            print(f"❌ FAIL: parsedCampaigns < 1, got: {parsed_campaigns}")
            return False
        
        account = data.get("account")
        if not account:
            print("❌ FAIL: No account field in response")
            return False
        
        if not account.get("name"):
            print("❌ FAIL: account.name is empty")
            return False
        
        if account.get("currency") != "NOK":
            print(f"⚠️  WARNING: account.currency is not 'NOK', got: {account.get('currency')}")
        
        print(f"✅ PASS: ok = true")
        print(f"✅ PASS: economics.source = 'meta'")
        print(f"✅ PASS: totals.cost = {cost} (> 0)")
        print(f"✅ PASS: totals.clicks = {totals.get('clicks', 0)}")
        print(f"✅ PASS: totals.impressions = {totals.get('impressions', 0)}")
        print(f"✅ PASS: totals.leads = {totals.get('leads', 0)}")
        print(f"✅ PASS: totals.won = {totals.get('won', 0)}")
        print(f"✅ PASS: parsedCampaigns = {parsed_campaigns} (>= 1)")
        print(f"✅ PASS: account.name = '{account.get('name')}'")
        print(f"✅ PASS: account.currency = '{account.get('currency')}'")
        print(f"✅ PASS: account.status = {account.get('status')}")
        print(f"ℹ️  INFO: Meta API call took {elapsed:.2f}s")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_4_get_ads_overview_after_sync():
    """Test 4: GET /api/admin/ads/overview after sync"""
    print("\n" + "="*80)
    print("TEST 4: GET /api/admin/ads/overview?key=... (after sync)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:1000]}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        meta = data.get("meta")
        if not meta:
            print("❌ FAIL: meta field is null (should be non-null after sync)")
            return False
        
        meta_totals = meta.get("totals", {})
        meta_cost = meta_totals.get("cost", 0)
        
        if meta_cost <= 0:
            print(f"❌ FAIL: meta.totals.cost is not > 0, got: {meta_cost}")
            return False
        
        print(f"✅ PASS: meta is not null")
        print(f"✅ PASS: meta.totals.cost = {meta_cost} (> 0)")
        print(f"✅ PASS: meta.totals.clicks = {meta_totals.get('clicks', 0)}")
        print(f"✅ PASS: meta.totals.impressions = {meta_totals.get('impressions', 0)}")
        
        # combined may be non-null if both Google and Meta data exist
        combined = data.get("combined")
        if combined:
            print(f"ℹ️  INFO: combined economics present (Google + Meta)")
            print(f"ℹ️  INFO: combined.totals.cost = {combined.get('totals', {}).get('cost', 0)}")
        else:
            print("ℹ️  INFO: combined is null (only Meta data, no Google CSV)")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_5_auth_meta_sync_without_key():
    """Test 5: AUTH - POST /api/admin/ads/meta-sync WITHOUT key"""
    print("\n" + "="*80)
    print("TEST 5: AUTH - POST /api/admin/ads/meta-sync WITHOUT key")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/meta-sync"
        payload = {"datePreset": "last_30d"}
        
        print(f"POST {url} (no key)")
        
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        if response.status_code != 401:
            print(f"❌ FAIL: Expected 401, got {response.status_code}")
            return False
        
        print(f"✅ PASS: Returns 401 without key")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_5b_auth_overview_without_key():
    """Test 5b: AUTH - GET /api/admin/ads/overview WITHOUT key"""
    print("\n" + "="*80)
    print("TEST 5b: AUTH - GET /api/admin/ads/overview WITHOUT key")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/overview"
        
        print(f"GET {url} (no key)")
        
        response = requests.get(url, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        if response.status_code != 401:
            print(f"❌ FAIL: Expected 401, got {response.status_code}")
            return False
        
        print(f"✅ PASS: Returns 401 without key")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_6_closed_loop_won(lead_id):
    """Test 6: CLOSED-LOOP WON - POST /api/webhooks/lead-status"""
    print("\n" + "="*80)
    print("TEST 6: CLOSED-LOOP WON - POST /api/webhooks/lead-status")
    print("="*80)
    
    if not lead_id:
        print("⚠️  SKIP: No lead_id from test 1")
        return False
    
    try:
        url = f"{BASE_URL}/webhooks/lead-status"
        payload = {
            "external_ref": lead_id,
            "status": "vunnet",
            "value": 25000,
            "currency": "NOK"
        }
        headers = {
            "X-Webhook-Secret": WEBHOOK_SECRET,
            "Content-Type": "application/json"
        }
        
        print(f"POST {url}")
        print(f"Headers: X-Webhook-Secret: {WEBHOOK_SECRET}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if not data.get("ok"):
            print("❌ FAIL: ok field is not true")
            return False
        
        if data.get("status") != "won":
            print(f"❌ FAIL: status is not 'won', got: {data.get('status')}")
            return False
        
        if data.get("matched_by") != "external_ref":
            print(f"❌ FAIL: matched_by is not 'external_ref', got: {data.get('matched_by')}")
            return False
        
        # meta_capi field should be present (ok may be true or false - best-effort)
        meta_capi = data.get("meta_capi")
        if not meta_capi:
            print("⚠️  WARNING: meta_capi field is missing (should be present)")
        else:
            print(f"ℹ️  INFO: meta_capi present: {meta_capi}")
            print(f"ℹ️  INFO: meta_capi.ok = {meta_capi.get('ok')} (best-effort, not required)")
        
        print(f"✅ PASS: ok = true")
        print(f"✅ PASS: status = 'won'")
        print(f"✅ PASS: matched_by = 'external_ref'")
        print(f"✅ PASS: No 500 error (CAPI is best-effort)")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_7_regression():
    """Test 7: REGRESSION tests"""
    print("\n" + "="*80)
    print("TEST 7: REGRESSION tests")
    print("="*80)
    
    all_pass = True
    
    # 7a: GET /api/
    try:
        print("\n7a: GET /api/")
        response = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            all_pass = False
        else:
            data = response.json()
            if not data.get("ok"):
                print(f"❌ FAIL: ok field is not true")
                all_pass = False
            else:
                print(f"✅ PASS: GET /api/ returns 200 with ok=true")
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        all_pass = False
    
    # 7b: GET /api/admin/leads
    try:
        print("\n7b: GET /api/admin/leads?key=...")
        url = f"{BASE_URL}/admin/leads?key={ADMIN_KEY}"
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            all_pass = False
        else:
            data = response.json()
            if "leads" not in data:
                print(f"❌ FAIL: No 'leads' field in response")
                all_pass = False
            else:
                print(f"✅ PASS: GET /api/admin/leads returns 200 with array")
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        all_pass = False
    
    # 7c: POST /api/leads with empty body
    try:
        print("\n7c: POST /api/leads with empty body {}")
        response = requests.post(f"{BASE_URL}/leads", json={}, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 400:
            print(f"❌ FAIL: Expected 400, got {response.status_code}")
            all_pass = False
        else:
            print(f"✅ PASS: POST /api/leads with empty body returns 400 (NOT 500)")
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        all_pass = False
    
    return all_pass


def cleanup_lead(lead_id):
    """Cleanup: Delete the QA lead"""
    print("\n" + "="*80)
    print("CLEANUP: Delete QA lead")
    print("="*80)
    
    if not lead_id:
        print("⚠️  SKIP: No lead_id to delete")
        return
    
    try:
        url = f"{BASE_URL}/admin/delete?key={ADMIN_KEY}"
        payload = {"id": lead_id}
        
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        if response.status_code == 200:
            print(f"✅ Lead {lead_id} deleted successfully")
        else:
            print(f"⚠️  Could not delete lead (status {response.status_code})")
        
    except Exception as e:
        print(f"⚠️  Cleanup exception: {e}")


def main():
    print("="*80)
    print("META (FACEBOOK) INTEGRATION BACKEND TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"Webhook Secret: {WEBHOOK_SECRET[:20]}...")
    print(f"Timeout: {TIMEOUT}s")
    
    results = {}
    lead_id = None
    
    # Test 1: POST /api/leads with Meta attribution
    lead_id = test_1_post_lead_with_meta_attribution()
    results["test_1_post_lead_meta_attribution"] = lead_id is not None
    
    # Test 2: GET /api/admin/ads/overview (before sync)
    results["test_2_get_ads_overview_before_sync"] = test_2_get_ads_overview_before_sync()
    
    # Test 3: POST /api/admin/ads/meta-sync
    results["test_3_post_meta_sync"] = test_3_post_meta_sync()
    
    # Test 4: GET /api/admin/ads/overview (after sync)
    results["test_4_get_ads_overview_after_sync"] = test_4_get_ads_overview_after_sync()
    
    # Test 5: AUTH tests
    results["test_5_auth_meta_sync_without_key"] = test_5_auth_meta_sync_without_key()
    results["test_5b_auth_overview_without_key"] = test_5b_auth_overview_without_key()
    
    # Test 6: CLOSED-LOOP WON
    results["test_6_closed_loop_won"] = test_6_closed_loop_won(lead_id)
    
    # Test 7: REGRESSION
    results["test_7_regression"] = test_7_regression()
    
    # Cleanup
    cleanup_lead(lead_id)
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed*100//total}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
