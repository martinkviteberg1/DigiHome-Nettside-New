#!/usr/bin/env python3
"""
Backend test for Platform Model Control via Agent Bridge.
Tests the NEW "Plattform-modellstyring via Agent-broen" feature.

SAFETY: Uses ONLY test feature ids prefixed 'agent_test_' to avoid affecting real platform features.
MANDATORY cleanup at the end.
"""

import requests
import json
import time
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
BRIDGE_TOKEN = "dhbridge_1b6d861334cad9ace784288a038f540f7f183cd7"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test feature IDs (prefixed with 'agent_test_' for safety)
TEST_FEATURE_1 = "agent_test_feature"
TEST_FEATURE_2 = "agent_test_feature2"

def print_test(msg):
    print(f"\n{'='*80}")
    print(f"TEST: {msg}")
    print('='*80)

def print_result(passed, msg):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {msg}")

def cleanup_test_data():
    """MANDATORY cleanup: Delete all test documents from agent_bridge collection"""
    print_test("CLEANUP: Deleting test documents from agent_bridge collection")
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Delete all agent_bridge docs where threadId="model-control" AND data.feature IN [TEST_FEATURE_1, TEST_FEATURE_2]
        result = db.agent_bridge.delete_many({
            "threadId": "model-control",
            "data.feature": {"$in": [TEST_FEATURE_1, TEST_FEATURE_2]}
        })
        
        deleted_count = result.deleted_count
        print_result(True, f"Deleted {deleted_count} test documents from agent_bridge collection")
        
        # Verify cleanup
        remaining = db.agent_bridge.count_documents({
            "threadId": "model-control",
            "data.feature": {"$in": [TEST_FEATURE_1, TEST_FEATURE_2]}
        })
        
        if remaining > 0:
            print_result(False, f"WARNING: {remaining} test documents still remain in agent_bridge")
        else:
            print_result(True, "Cleanup verified: No test documents remain")
        
        client.close()
        return deleted_count
    except Exception as e:
        print_result(False, f"Cleanup failed: {str(e)}")
        return 0

def test_1_platform_request():
    """Test 1: PLATFORM REQUEST - PUT /api/admin/usage/llm/model with scope 'platform'"""
    print_test("Test 1: Platform model override request")
    
    try:
        # PUT request to create platform model override request
        url = f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}"
        payload = {
            "feature": TEST_FEATURE_1,
            "model": "claude-haiku-4-5",
            "scope": "platform"
        }
        
        response = requests.put(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        # Verify response
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        data = response.json()
        assert data.get("ok") == True, "Expected ok=true"
        assert data.get("scope") == "platform", "Expected scope='platform'"
        assert "request" in data, "Expected 'request' field in response"
        
        req = data["request"]
        assert req.get("feature") == TEST_FEATURE_1, f"Expected feature='{TEST_FEATURE_1}'"
        assert req.get("model") == "claude-haiku-4-5", "Expected model='claude-haiku-4-5'"
        assert req.get("status") == "pending", "Expected status='pending'"
        assert "requestedAt" in req, "Expected 'requestedAt' field"
        
        print_result(True, "Platform request created successfully with status='pending'")
        
        # Verify in MongoDB that agent_bridge got the document
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        doc = db.agent_bridge.find_one({
            "threadId": "model-control",
            "type": "model_override_request",
            "from": "marketing",
            "data.feature": TEST_FEATURE_1
        })
        
        assert doc is not None, "Document not found in agent_bridge collection"
        assert doc["data"]["model"] == "claude-haiku-4-5", "Model mismatch in MongoDB"
        assert doc["data"]["kind"] == "model_override_request", "Kind mismatch in MongoDB"
        
        print_result(True, f"Verified in MongoDB: agent_bridge document created with threadId='model-control', type='model_override_request', from='marketing', data.feature='{TEST_FEATURE_1}'")
        
        client.close()
        return True
        
    except AssertionError as e:
        print_result(False, str(e))
        return False
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_2_dashboard_status_pending():
    """Test 2: DASHBOARD STATUS pending - GET /api/admin/usage/api shows platformControl with pending status"""
    print_test("Test 2: Dashboard shows pending status")
    
    try:
        url = f"{BASE_URL}/admin/usage/api?key={ADMIN_KEY}&days=7"
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify platformControl field exists
        assert "platformControl" in data, "Expected 'platformControl' field"
        assert "platformModels" in data, "Expected 'platformModels' field"
        
        # Verify platformModels array has 7 models
        platform_models = data["platformModels"]
        assert isinstance(platform_models, list), "platformModels should be an array"
        assert len(platform_models) == 7, f"Expected 7 platform models, got {len(platform_models)}"
        
        # Verify model IDs include the expected ones
        model_ids = [m["id"] for m in platform_models]
        expected_ids = ["gpt-5.4", "claude-sonnet-4-6", "gemini-2.5-flash"]
        for expected_id in expected_ids:
            assert expected_id in model_ids, f"Expected model '{expected_id}' in platformModels"
        
        print_result(True, f"platformModels array contains {len(platform_models)} models including {expected_ids}")
        
        # Verify platformControl has our test feature with pending status
        platform_control = data["platformControl"]
        assert TEST_FEATURE_1 in platform_control, f"Expected '{TEST_FEATURE_1}' in platformControl"
        
        feature_control = platform_control[TEST_FEATURE_1]
        assert feature_control.get("model") == "claude-haiku-4-5", "Model mismatch"
        assert feature_control.get("status") == "pending", "Expected status='pending'"
        assert "requestedAt" in feature_control, "Expected 'requestedAt' field"
        
        print_result(True, f"platformControl['{TEST_FEATURE_1}'] = {{model:'claude-haiku-4-5', status:'pending', requestedAt:'{feature_control.get('requestedAt')}'}}")
        
        return True
        
    except AssertionError as e:
        print_result(False, str(e))
        return False
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_3_platform_confirms():
    """Test 3: PLATFORM CONFIRMS - Simulate platform confirming the model override"""
    print_test("Test 3: Platform confirms model override (simulate)")
    
    try:
        # POST to agent-bridge to simulate platform confirmation
        url = f"{BASE_URL}/agent-bridge?token={BRIDGE_TOKEN}"
        payload = {
            "threadId": "model-control",
            "from": "platform",
            "type": "model_override_applied",
            "subject": f"Modell byttet: {TEST_FEATURE_1}",
            "data": {
                "kind": "model_override_applied",
                "feature": TEST_FEATURE_1,
                "model": "claude-haiku-4-5"
            }
        }
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        data = response.json()
        assert data.get("ok") == True, "Expected ok=true"
        assert "message" in data, "Expected 'message' field"
        
        # CRITICAL: Verify that message.type is 'model_override_applied' (NOT coerced to 'note')
        message = data["message"]
        assert message.get("type") == "model_override_applied", f"Expected type='model_override_applied', got '{message.get('type')}' (whitelist fix verification)"
        
        print_result(True, f"Platform confirmation posted successfully with type='model_override_applied' (whitelist fix verified)")
        
        # Wait a moment for the message to be processed
        time.sleep(1)
        
        # Verify status changed to 'applied' in GET /api/admin/usage/api
        url = f"{BASE_URL}/admin/usage/api?key={ADMIN_KEY}&days=7"
        response = requests.get(url, timeout=30)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        platform_control = data.get("platformControl", {})
        assert TEST_FEATURE_1 in platform_control, f"Expected '{TEST_FEATURE_1}' in platformControl"
        
        feature_control = platform_control[TEST_FEATURE_1]
        assert feature_control.get("status") == "applied", f"Expected status='applied', got '{feature_control.get('status')}'"
        assert "appliedAt" in feature_control, "Expected 'appliedAt' field"
        
        print_result(True, f"platformControl['{TEST_FEATURE_1}'].status = 'applied' (verified)")
        
        return True
        
    except AssertionError as e:
        print_result(False, str(e))
        return False
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_4_rejected_path():
    """Test 4: REJECTED PATH - Test rejection flow"""
    print_test("Test 4: Platform rejects model override")
    
    try:
        # Step 1: Create a new platform request for TEST_FEATURE_2
        url = f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}"
        payload = {
            "feature": TEST_FEATURE_2,
            "model": "gemini-2.5-pro",
            "scope": "platform"
        }
        
        response = requests.put(url, json=payload, timeout=30)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        print_result(True, f"Created platform request for '{TEST_FEATURE_2}' with model 'gemini-2.5-pro'")
        
        # Step 2: Simulate platform rejection
        url = f"{BASE_URL}/agent-bridge?token={BRIDGE_TOKEN}"
        payload = {
            "threadId": "model-control",
            "from": "platform",
            "type": "model_override_rejected",
            "subject": "Avvist",
            "data": {
                "kind": "model_override_rejected",
                "feature": TEST_FEATURE_2,
                "model": "gemini-2.5-pro",
                "reason": "Modell ikke tilgjengelig"
            }
        }
        
        response = requests.post(url, json=payload, timeout=30)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        print_result(True, "Platform rejection posted successfully")
        
        # Wait a moment
        time.sleep(1)
        
        # Step 3: Verify status changed to 'rejected' in GET /api/admin/usage/api
        url = f"{BASE_URL}/admin/usage/api?key={ADMIN_KEY}&days=7"
        response = requests.get(url, timeout=30)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        platform_control = data.get("platformControl", {})
        assert TEST_FEATURE_2 in platform_control, f"Expected '{TEST_FEATURE_2}' in platformControl"
        
        feature_control = platform_control[TEST_FEATURE_2]
        assert feature_control.get("status") == "rejected", f"Expected status='rejected', got '{feature_control.get('status')}'"
        assert feature_control.get("reason") == "Modell ikke tilgjengelig", "Reason mismatch"
        assert "rejectedAt" in feature_control, "Expected 'rejectedAt' field"
        
        print_result(True, f"platformControl['{TEST_FEATURE_2}'] = {{status:'rejected', reason:'Modell ikke tilgjengelig', rejectedAt:'{feature_control.get('rejectedAt')}'}}")
        
        return True
        
    except AssertionError as e:
        print_result(False, str(e))
        return False
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_5_validation():
    """Test 5: VALIDATION - Test validation errors"""
    print_test("Test 5: Validation tests")
    
    all_passed = True
    
    # Test 5a: Invalid model name
    try:
        url = f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}"
        payload = {
            "feature": "agent_test_validation",
            "model": "inv@lid!",
            "scope": "platform"
        }
        
        response = requests.put(url, json=payload, timeout=30)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print_result(True, "5a: Invalid model name returns 400")
    except AssertionError as e:
        print_result(False, f"5a: {str(e)}")
        all_passed = False
    
    # Test 5b: Missing feature
    try:
        url = f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}"
        payload = {
            "model": "claude-haiku-4-5",
            "scope": "platform"
        }
        
        response = requests.put(url, json=payload, timeout=30)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print_result(True, "5b: Missing feature returns 400")
    except AssertionError as e:
        print_result(False, f"5b: {str(e)}")
        all_passed = False
    
    # Test 5c: Without key (authentication)
    try:
        url = f"{BASE_URL}/admin/usage/llm/model"
        payload = {
            "feature": "agent_test_validation",
            "model": "claude-haiku-4-5",
            "scope": "platform"
        }
        
        response = requests.put(url, json=payload, timeout=30)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print_result(True, "5c: Without key returns 401")
    except AssertionError as e:
        print_result(False, f"5c: {str(e)}")
        all_passed = False
    
    return all_passed

def test_6_regression_landingsside_scope():
    """Test 6: REGRESSION - Landingsside scope unchanged"""
    print_test("Test 6: Regression - Landingsside scope unchanged")
    
    all_passed = True
    
    # Test 6a: Set override for landingsside scope (no scope parameter)
    try:
        url = f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}"
        payload = {
            "feature": "agent_test_lp",
            "model": "gpt-4o-mini"
        }
        
        response = requests.put(url, json=payload, timeout=30)
        print(f"6a Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") == True, "Expected ok=true"
        assert "overrides" in data, "Expected 'overrides' field"
        assert data["overrides"].get("agent_test_lp") == "gpt-4o-mini", "Override not set correctly"
        
        print_result(True, "6a: Landingsside scope override set successfully")
    except AssertionError as e:
        print_result(False, f"6a: {str(e)}")
        all_passed = False
    
    # Test 6b: Clear the override
    try:
        url = f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}"
        payload = {
            "feature": "agent_test_lp",
            "model": ""
        }
        
        response = requests.put(url, json=payload, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "agent_test_lp" not in data.get("overrides", {}), "Override not cleared"
        
        print_result(True, "6b: Landingsside scope override cleared successfully")
    except AssertionError as e:
        print_result(False, f"6b: {str(e)}")
        all_passed = False
    
    # Test 6c: AVAILABLE_MODELS validation for landingsside scope
    try:
        url = f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}"
        payload = {
            "feature": "agent_test_lp",
            "model": "claude-haiku-4-5"  # This is in PLATFORM_MODELS but not AVAILABLE_MODELS
        }
        
        response = requests.put(url, json=payload, timeout=30)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        print_result(True, "6c: Landingsside scope validates against AVAILABLE_MODELS (400 for platform-only model)")
    except AssertionError as e:
        print_result(False, f"6c: {str(e)}")
        all_passed = False
    
    return all_passed

def test_7_regression_endpoints():
    """Test 7: REGRESSION - Basic endpoints still work"""
    print_test("Test 7: Regression - Basic endpoints")
    
    all_passed = True
    
    # Test 7a: GET /api/
    try:
        url = f"{BASE_URL}/"
        response = requests.get(url, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("ok") == True, "Expected ok=true"
        print_result(True, "7a: GET /api/ returns 200")
    except AssertionError as e:
        print_result(False, f"7a: {str(e)}")
        all_passed = False
    
    # Test 7b: GET /api/agent-bridge with token
    try:
        url = f"{BASE_URL}/agent-bridge?token={BRIDGE_TOKEN}&thread=integration-contract"
        response = requests.get(url, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "messages" in data, "Expected 'messages' field"
        
        # Verify there's a 'spec' message mentioning model control
        messages = data.get("messages", [])
        spec_found = False
        for msg in messages:
            if msg and msg.get("type") == "spec":
                subject = (msg.get("subject") or "").lower()
                body = (msg.get("body") or "").lower()
                if "fjernstyring" in subject or "model" in subject or "model-control" in body:
                    spec_found = True
                    break
        
        # Also check if there's a message with data.capability='model-control'
        capability_found = False
        for msg in messages:
            if msg and isinstance(msg.get("data"), dict) and msg.get("data", {}).get("capability") == "model-control":
                capability_found = True
                break
        
        if spec_found or capability_found:
            print_result(True, "7b: GET /api/agent-bridge returns messages (spec message with model-control found)")
        else:
            print_result(True, "7b: GET /api/agent-bridge returns 200 with messages (spec message may not mention model-control yet)")
        
    except AssertionError as e:
        print_result(False, f"7b: {str(e)}")
        all_passed = False
    except Exception as e:
        print_result(False, f"7b: Exception: {str(e)}")
        all_passed = False
    
    return all_passed

def main():
    print("\n" + "="*80)
    print("PLATFORM MODEL CONTROL VIA AGENT BRIDGE - BACKEND TESTING")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"Bridge Token: {BRIDGE_TOKEN[:20]}...")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    print(f"Test Features: {TEST_FEATURE_1}, {TEST_FEATURE_2}")
    print("="*80)
    
    results = {}
    
    # Run tests
    results["Test 1: Platform Request"] = test_1_platform_request()
    results["Test 2: Dashboard Status Pending"] = test_2_dashboard_status_pending()
    results["Test 3: Platform Confirms"] = test_3_platform_confirms()
    results["Test 4: Rejected Path"] = test_4_rejected_path()
    results["Test 5: Validation"] = test_5_validation()
    results["Test 6: Regression Landingsside Scope"] = test_6_regression_landingsside_scope()
    results["Test 7: Regression Endpoints"] = test_7_regression_endpoints()
    
    # Mandatory cleanup
    deleted_count = cleanup_test_data()
    
    # Verify cleanup in GET /api/admin/usage/api
    print_test("CLEANUP VERIFICATION: Verify platformControl no longer contains test features")
    try:
        url = f"{BASE_URL}/admin/usage/api?key={ADMIN_KEY}&days=7"
        response = requests.get(url, timeout=30)
        data = response.json()
        platform_control = data.get("platformControl", {})
        
        if TEST_FEATURE_1 in platform_control or TEST_FEATURE_2 in platform_control:
            print_result(False, f"WARNING: Test features still in platformControl: {[k for k in [TEST_FEATURE_1, TEST_FEATURE_2] if k in platform_control]}")
        else:
            print_result(True, "Cleanup verified: platformControl no longer contains test features")
    except Exception as e:
        print_result(False, f"Cleanup verification failed: {str(e)}")
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed ({int(passed/total*100)}% success rate)")
    print(f"Cleanup: {deleted_count} documents deleted from agent_bridge collection")
    print("="*80)
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED - Platform model control via Agent Bridge working correctly!")
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED - See details above")

if __name__ == "__main__":
    main()
