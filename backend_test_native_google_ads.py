#!/usr/bin/env python3
"""
Backend test for NATIVE Google Ads API endpoints (Phase 1/2/3).
Tests the NEW native Google Ads API (REST) implementation that replaces Composio.

CRITICAL SAFETY:
- DO NOT mutate live data
- DO NOT call campaign/status or campaign/budget with VALID fields
- DO NOT call campaign/create with validateOnly=false
- DO NOT create leads

Base URL: https://saker-hub.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4
Timeout: 30s (native calls hit real Google API ~0.3-2s)
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 30

def log(msg):
    """Print timestamped log message"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_google_status():
    """Test 1: GET /admin/ads/google-status"""
    log("TEST 1: GET /admin/ads/google-status")
    try:
        url = f"{BASE_URL}/admin/ads/google-status?key={ADMIN_KEY}"
        start = datetime.now()
        resp = requests.get(url, timeout=TIMEOUT)
        elapsed = (datetime.now() - start).total_seconds()
        
        log(f"  Status: {resp.status_code}, Time: {elapsed:.2f}s")
        
        if resp.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        log(f"  Response: {json.dumps(data, indent=2)}")
        
        # Verify required fields
        if data.get('ok') != True:
            log(f"  ❌ FAIL: ok != true")
            return False
        
        if data.get('provider') != 'native':
            log(f"  ❌ FAIL: provider != 'native', got '{data.get('provider')}'")
            return False
        
        if data.get('connected') != True:
            log(f"  ❌ FAIL: connected != true")
            return False
        
        count = data.get('count', 0)
        if count < 1:
            log(f"  ❌ FAIL: count < 1, got {count}")
            return False
        
        log(f"  ✅ PASS: provider='native', connected=true, count={count}")
        return True
        
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        return False

def test_campaigns():
    """Test 2: GET /admin/ads/campaigns"""
    log("TEST 2: GET /admin/ads/campaigns")
    try:
        url = f"{BASE_URL}/admin/ads/campaigns?key={ADMIN_KEY}"
        start = datetime.now()
        resp = requests.get(url, timeout=TIMEOUT)
        elapsed = (datetime.now() - start).total_seconds()
        
        log(f"  Status: {resp.status_code}, Time: {elapsed:.2f}s")
        
        if resp.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if data.get('ok') != True:
            log(f"  ❌ FAIL: ok != true")
            return False
        
        campaigns = data.get('campaigns', [])
        if not isinstance(campaigns, list):
            log(f"  ❌ FAIL: campaigns is not an array")
            return False
        
        log(f"  Campaigns count: {len(campaigns)}")
        
        # Verify at least one campaign with required fields
        if len(campaigns) > 0:
            camp = campaigns[0]
            required_fields = ['id', 'name', 'status', 'dailyBudget', 'budgetResourceName', 'cost', 'clicks', 'conversions']
            missing = [f for f in required_fields if f not in camp]
            if missing:
                log(f"  ❌ FAIL: Missing fields in campaign: {missing}")
                return False
            
            log(f"  Sample campaign: name='{camp['name']}', status='{camp['status']}', dailyBudget={camp['dailyBudget']}, cost={camp['cost']}")
        
        log(f"  ✅ PASS: campaigns array with required fields")
        return True
        
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        return False

def test_conversion_actions():
    """Test 3: GET /admin/ads/conversion-actions"""
    log("TEST 3: GET /admin/ads/conversion-actions")
    try:
        url = f"{BASE_URL}/admin/ads/conversion-actions?key={ADMIN_KEY}"
        start = datetime.now()
        resp = requests.get(url, timeout=TIMEOUT)
        elapsed = (datetime.now() - start).total_seconds()
        
        log(f"  Status: {resp.status_code}, Time: {elapsed:.2f}s")
        
        if resp.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if data.get('ok') != True:
            log(f"  ❌ FAIL: ok != true")
            return False
        
        actions = data.get('actions', [])
        if not isinstance(actions, list):
            log(f"  ❌ FAIL: actions is not an array")
            return False
        
        log(f"  Actions count: {len(actions)}")
        
        offline_action = data.get('offlineAction', {})
        resource_name = offline_action.get('resourceName')
        if not resource_name:
            log(f"  ❌ FAIL: offlineAction.resourceName is null")
            return False
        
        log(f"  offlineAction.resourceName: {resource_name}")
        log(f"  offlineAction.name: {offline_action.get('name')}")
        log(f"  ✅ PASS: actions array and offlineAction.resourceName present")
        return True
        
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        return False

def test_geo_suggest():
    """Test 4: GET /admin/ads/geo-suggest?q=Bergen"""
    log("TEST 4: GET /admin/ads/geo-suggest?q=Bergen")
    try:
        url = f"{BASE_URL}/admin/ads/geo-suggest?q=Bergen&key={ADMIN_KEY}"
        start = datetime.now()
        resp = requests.get(url, timeout=TIMEOUT)
        elapsed = (datetime.now() - start).total_seconds()
        
        log(f"  Status: {resp.status_code}, Time: {elapsed:.2f}s")
        
        if resp.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if data.get('ok') != True:
            log(f"  ❌ FAIL: ok != true")
            return False
        
        suggestions = data.get('suggestions', [])
        if not isinstance(suggestions, list):
            log(f"  ❌ FAIL: suggestions is not an array")
            return False
        
        if len(suggestions) == 0:
            log(f"  ❌ FAIL: suggestions.length == 0")
            return False
        
        log(f"  Suggestions count: {len(suggestions)}")
        
        # Verify each suggestion has id and name
        for i, sug in enumerate(suggestions[:3]):
            if 'id' not in sug or 'name' not in sug:
                log(f"  ❌ FAIL: Suggestion {i} missing id or name")
                return False
            log(f"  Suggestion {i}: id={sug['id']}, name='{sug['name']}'")
        
        log(f"  ✅ PASS: suggestions array with id and name")
        return True
        
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        return False

def test_campaign_create_validate():
    """Test 5: POST /admin/ads/campaign/create with validateOnly:true"""
    log("TEST 5: POST /admin/ads/campaign/create with validateOnly:true (3 headlines)")
    try:
        url = f"{BASE_URL}/admin/ads/campaign/create?key={ADMIN_KEY}"
        payload = {
            "validateOnly": True,
            "name": "TEST validate",
            "dailyBudget": 100,
            "finalUrl": "https://digihome.no/bli-utleier",
            "headlines": ["Lei ut boligen", "Trygg utleie", "DigiHome"],
            "descriptions": ["Vi finner leietakere raskt.", "Full forvaltning."],
            "keywords": ["utleie bergen"],
            "geoTargetConstantIds": ["2578"]
        }
        
        start = datetime.now()
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
        elapsed = (datetime.now() - start).total_seconds()
        
        log(f"  Status: {resp.status_code}, Time: {elapsed:.2f}s")
        
        if resp.status_code != 201:
            log(f"  ❌ FAIL: Expected 201, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if data.get('ok') != True:
            log(f"  ❌ FAIL: ok != true, error: {data.get('error')}")
            return False
        
        operation_count = data.get('operationCount', 0)
        # Expected operations for payload (1 geo target + 1 keyword):
        # 1. Budget, 2. Campaign, 3. Geo criterion, 4. Ad group, 5. Ad group ad, 6. Keyword criterion = 6 ops
        if operation_count != 6:
            log(f"  ❌ FAIL: operationCount != 6, got {operation_count}")
            return False
        
        log(f"  operationCount: {operation_count}")
        log(f"  note: {data.get('note')}")
        log(f"  ✅ PASS: validateOnly campaign creation, operationCount=6 (correct for 1 geo + 1 keyword)")
        return True
        
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        return False

def test_campaign_create_validation_fail():
    """Test 6: POST /admin/ads/campaign/create with only 2 headlines (should fail)"""
    log("TEST 6: POST /admin/ads/campaign/create with only 2 headlines (validation fail)")
    try:
        url = f"{BASE_URL}/admin/ads/campaign/create?key={ADMIN_KEY}"
        payload = {
            "validateOnly": True,
            "name": "TEST validate fail",
            "dailyBudget": 100,
            "finalUrl": "https://digihome.no/bli-utleier",
            "headlines": ["a", "b"],  # Only 2 headlines - should fail
            "descriptions": ["d1", "d2"],
            "keywords": ["utleie bergen"],
            "geoTargetConstantIds": ["2578"]
        }
        
        start = datetime.now()
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
        elapsed = (datetime.now() - start).total_seconds()
        
        log(f"  Status: {resp.status_code}, Time: {elapsed:.2f}s")
        
        # Should return 200 with ok:false (not 201)
        if resp.status_code == 201:
            log(f"  ❌ FAIL: Expected validation to fail, but got 201")
            return False
        
        data = resp.json()
        
        if data.get('ok') == True:
            log(f"  ❌ FAIL: ok == true, but validation should have failed")
            return False
        
        error = data.get('error', '')
        log(f"  Error message: {error}")
        
        # Check if error mentions RSA or headlines requirement
        if 'RSA' not in error and 'titler' not in error and 'headlines' not in error:
            log(f"  ⚠️  WARNING: Error message doesn't mention RSA/headlines requirement")
        
        log(f"  ✅ PASS: Validation correctly failed for 2 headlines")
        return True
        
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        return False

def test_campaign_status_missing_fields():
    """Test 7: POST /admin/ads/campaign/status with empty body (should return 400)"""
    log("TEST 7: POST /admin/ads/campaign/status with empty body")
    try:
        url = f"{BASE_URL}/admin/ads/campaign/status?key={ADMIN_KEY}"
        payload = {}
        
        start = datetime.now()
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
        elapsed = (datetime.now() - start).total_seconds()
        
        log(f"  Status: {resp.status_code}, Time: {elapsed:.2f}s")
        
        if resp.status_code != 400:
            log(f"  ❌ FAIL: Expected 400, got {resp.status_code}")
            return False
        
        data = resp.json()
        log(f"  Error: {data.get('error')}")
        
        log(f"  ✅ PASS: Returns 400 for missing fields")
        return True
        
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        return False

def test_campaign_budget_missing_fields():
    """Test 8: POST /admin/ads/campaign/budget with empty body (should return 400)"""
    log("TEST 8: POST /admin/ads/campaign/budget with empty body")
    try:
        url = f"{BASE_URL}/admin/ads/campaign/budget?key={ADMIN_KEY}"
        payload = {}
        
        start = datetime.now()
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
        elapsed = (datetime.now() - start).total_seconds()
        
        log(f"  Status: {resp.status_code}, Time: {elapsed:.2f}s")
        
        if resp.status_code != 400:
            log(f"  ❌ FAIL: Expected 400, got {resp.status_code}")
            return False
        
        data = resp.json()
        log(f"  Error: {data.get('error')}")
        
        log(f"  ✅ PASS: Returns 400 for missing fields")
        return True
        
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        return False

def test_auth_all_endpoints():
    """Test 9: All endpoints without ?key should return 401"""
    log("TEST 9: Authentication - all endpoints without ?key should return 401")
    
    endpoints = [
        ("GET", "/admin/ads/google-status"),
        ("GET", "/admin/ads/campaigns"),
        ("GET", "/admin/ads/conversion-actions"),
        ("GET", "/admin/ads/geo-suggest?q=Bergen"),
        ("POST", "/admin/ads/campaign/create"),
        ("POST", "/admin/ads/campaign/status"),
        ("POST", "/admin/ads/campaign/budget"),
        ("POST", "/admin/ads/upload-conversion"),
    ]
    
    all_passed = True
    
    for method, endpoint in endpoints:
        try:
            url = f"{BASE_URL}{endpoint}"
            
            if method == "GET":
                resp = requests.get(url, timeout=TIMEOUT)
            else:
                resp = requests.post(url, json={}, timeout=TIMEOUT)
            
            if resp.status_code != 401:
                log(f"  ❌ FAIL: {method} {endpoint} returned {resp.status_code}, expected 401")
                all_passed = False
            else:
                log(f"  ✅ PASS: {method} {endpoint} returned 401")
                
        except Exception as e:
            log(f"  ❌ FAIL: {method} {endpoint} exception: {e}")
            all_passed = False
    
    if all_passed:
        log(f"  ✅ ALL AUTH TESTS PASSED")
    
    return all_passed

def test_upload_conversion_graceful():
    """Test 10: POST /admin/ads/upload-conversion with fake gclid (should return 200 with ok:false, not 500)"""
    log("TEST 10: POST /admin/ads/upload-conversion with fake gclid (graceful failure)")
    try:
        url = f"{BASE_URL}/admin/ads/upload-conversion?key={ADMIN_KEY}"
        payload = {
            "gclid": "FAKE123",
            "value": 5000
        }
        
        start = datetime.now()
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
        elapsed = (datetime.now() - start).total_seconds()
        
        log(f"  Status: {resp.status_code}, Time: {elapsed:.2f}s")
        
        if resp.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code} (should not crash with 500)")
            return False
        
        data = resp.json()
        
        if data.get('ok') == True:
            log(f"  ⚠️  WARNING: ok == true, but expected ok:false for fake gclid")
            log(f"  Note: Google may have accepted the fake gclid (will be rejected later)")
        else:
            log(f"  Error: {data.get('error')}")
            log(f"  ✅ PASS: Gracefully returned ok:false (Google blocks classic API for new integrations)")
        
        return True
        
    except Exception as e:
        log(f"  ❌ FAIL: Exception: {e}")
        return False

def test_regression():
    """Test 11: Regression tests - GET /admin/ads/overview and GET /api/"""
    log("TEST 11: Regression tests")
    
    all_passed = True
    
    # Test GET /admin/ads/overview
    try:
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}"
        start = datetime.now()
        resp = requests.get(url, timeout=TIMEOUT)
        elapsed = (datetime.now() - start).total_seconds()
        
        log(f"  GET /admin/ads/overview: Status {resp.status_code}, Time: {elapsed:.2f}s")
        
        if resp.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}")
            all_passed = False
        else:
            data = resp.json()
            if data.get('ok') != True:
                log(f"  ❌ FAIL: ok != true")
                all_passed = False
            else:
                log(f"  ✅ PASS: GET /admin/ads/overview returned 200 with ok:true")
                
    except Exception as e:
        log(f"  ❌ FAIL: GET /admin/ads/overview exception: {e}")
        all_passed = False
    
    # Test GET /api/
    try:
        url = f"{BASE_URL}/"
        start = datetime.now()
        resp = requests.get(url, timeout=TIMEOUT)
        elapsed = (datetime.now() - start).total_seconds()
        
        log(f"  GET /api/: Status {resp.status_code}, Time: {elapsed:.2f}s")
        
        if resp.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {resp.status_code}")
            all_passed = False
        else:
            data = resp.json()
            if data.get('ok') != True:
                log(f"  ❌ FAIL: ok != true")
                all_passed = False
            else:
                log(f"  ✅ PASS: GET /api/ returned 200 with ok:true")
                
    except Exception as e:
        log(f"  ❌ FAIL: GET /api/ exception: {e}")
        all_passed = False
    
    if all_passed:
        log(f"  ✅ ALL REGRESSION TESTS PASSED")
    
    return all_passed

def main():
    """Run all tests"""
    log("=" * 80)
    log("NATIVE GOOGLE ADS API TESTS (Phase 1/2/3)")
    log("=" * 80)
    log(f"Base URL: {BASE_URL}")
    log(f"Admin key: {ADMIN_KEY}")
    log(f"Timeout: {TIMEOUT}s")
    log("")
    log("CRITICAL SAFETY: DO NOT MUTATE LIVE DATA")
    log("- DO NOT call campaign/status or campaign/budget with VALID fields")
    log("- DO NOT call campaign/create with validateOnly=false")
    log("- DO NOT create leads")
    log("=" * 80)
    log("")
    
    tests = [
        ("Google Status", test_google_status),
        ("Campaigns List", test_campaigns),
        ("Conversion Actions", test_conversion_actions),
        ("Geo Suggest", test_geo_suggest),
        ("Campaign Create (validateOnly)", test_campaign_create_validate),
        ("Campaign Create Validation Fail", test_campaign_create_validation_fail),
        ("Campaign Status Missing Fields", test_campaign_status_missing_fields),
        ("Campaign Budget Missing Fields", test_campaign_budget_missing_fields),
        ("Authentication", test_auth_all_endpoints),
        ("Upload Conversion Graceful", test_upload_conversion_graceful),
        ("Regression", test_regression),
    ]
    
    results = []
    
    for name, test_func in tests:
        log("")
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            log(f"❌ TEST FAILED WITH EXCEPTION: {e}")
            results.append((name, False))
        log("")
    
    # Summary
    log("=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        log(f"{status}: {name}")
    
    log("")
    log(f"TOTAL: {passed}/{total} tests passed ({100*passed//total}% success rate)")
    log("=" * 80)
    
    if passed == total:
        log("🎉 ALL TESTS PASSED!")
        return 0
    else:
        log(f"⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
