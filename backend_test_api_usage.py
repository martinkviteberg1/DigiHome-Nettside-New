#!/usr/bin/env python3
"""
Backend test for API-forbruk (API usage) endpoints in DigiHome.
Tests GET /api/admin/usage/api and PUT /api/admin/usage/llm/model endpoints.

CRITICAL SAFETY RULES:
- NO email sending endpoints (newsletter send/test)
- NO SerpAPI endpoints (quota ~100 searches/month)
- NO Meta/Google Ads endpoints
- Max 1 real LLM call total (costs money - point 3)
- Max 2 calls to /api/address (costs Google Maps quota - point 4)
- Cleanup: reset all model overrides, delete test rows if needed
"""

import asyncio
import json
import time
from datetime import datetime
from playwright.async_api import async_playwright
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Read DB_NAME from .env
try:
    with open('/app/.env', 'r') as f:
        for line in f:
            if line.startswith('DB_NAME='):
                DB_NAME = line.split('=')[1].strip()
                break
except:
    pass

print(f"=== API-FORBRUK TESTING START ===")
print(f"Base URL: {BASE_URL}")
print(f"Admin key: {ADMIN_KEY}")
print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
print(f"Timestamp: {datetime.now().isoformat()}")
print()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        )
        page = await context.new_page()
        
        # MongoDB connection
        mongo_client = MongoClient(MONGO_URL)
        db = mongo_client[DB_NAME]
        
        test_results = {
            "point1": {"name": "GET /api/admin/usage/api structure", "passed": 0, "total": 0},
            "point2": {"name": "PUT /api/admin/usage/llm/model", "passed": 0, "total": 0},
            "point3": {"name": "Model override affects chatLLM (E2E)", "passed": 0, "total": 0},
            "point4": {"name": "External usage tracking (Google Maps)", "passed": 0, "total": 0},
            "point5": {"name": "Regression tests", "passed": 0, "total": 0},
        }
        
        try:
            # ============================================================
            # POINT 1: GET /api/admin/usage/api structure verification
            # ============================================================
            print("=" * 70)
            print("POINT 1: GET /api/admin/usage/api structure verification")
            print("=" * 70)
            
            # Test 1a: GET with days=30
            print("\nTest 1a: GET /api/admin/usage/api?key=...&days=30")
            test_results["point1"]["total"] += 1
            try:
                response = await page.request.get(f"{BASE_URL}/admin/usage/api?key={ADMIN_KEY}&days=30")
                status = response.status
                print(f"  Status: {status}")
                
                if status == 200:
                    data = await response.json()
                    print(f"  Response keys: {list(data.keys())}")
                    
                    # Verify structure
                    assert data.get("ok") == True, "ok should be true"
                    assert "llm" in data, "llm should be present"
                    assert "ext" in data, "ext should be present"
                    assert "platform" in data, "platform should be present"
                    assert "models" in data, "models should be present"
                    assert "defaultModel" in data, "defaultModel should be present"
                    assert "overrides" in data, "overrides should be present"
                    
                    # Verify llm structure
                    llm = data["llm"]
                    assert "totals" in llm, "llm.totals should be present"
                    assert "byProvider" in llm, "llm.byProvider should be present"
                    assert "byModel" in llm, "llm.byModel should be present"
                    assert "byFeature" in llm, "llm.byFeature should be present"
                    assert "series" in llm, "llm.series should be present"
                    
                    # Verify llm.totals
                    totals = llm["totals"]
                    assert "calls" in totals and isinstance(totals["calls"], (int, float)), "totals.calls should be number"
                    assert "tokens" in totals and isinstance(totals["tokens"], (int, float)), "totals.tokens should be number"
                    assert "images" in totals and isinstance(totals["images"], (int, float)), "totals.images should be number"
                    assert "costNok" in totals and isinstance(totals["costNok"], (int, float)), "totals.costNok should be number"
                    assert "costUsd" in totals and isinstance(totals["costUsd"], (int, float)), "totals.costUsd should be number"
                    print(f"  ✓ llm.totals: calls={totals['calls']}, tokens={totals['tokens']}, images={totals['images']}, costNok={totals['costNok']}, costUsd={totals['costUsd']}")
                    
                    # Verify llm.byProvider (should have at least 'openai')
                    assert isinstance(llm["byProvider"], list), "byProvider should be array"
                    if len(llm["byProvider"]) > 0:
                        prov = llm["byProvider"][0]
                        assert "provider" in prov, "provider should have provider field"
                        assert "calls" in prov, "provider should have calls field"
                        assert "tokens" in prov, "provider should have tokens field"
                        assert "costNok" in prov, "provider should have costNok field"
                        print(f"  ✓ llm.byProvider: {len(llm['byProvider'])} providers, first={prov.get('provider')}")
                    
                    # Verify llm.byModel
                    assert isinstance(llm["byModel"], list), "byModel should be array"
                    if len(llm["byModel"]) > 0:
                        model = llm["byModel"][0]
                        assert "model" in model, "model should have model field"
                        assert "kind" in model, "model should have kind field"
                        assert "calls" in model, "model should have calls field"
                        assert "tokens" in model, "model should have tokens field"
                        assert "images" in model, "model should have images field"
                        assert "costNok" in model, "model should have costNok field"
                        print(f"  ✓ llm.byModel: {len(llm['byModel'])} models, first={model.get('model')}")
                    
                    # Verify llm.byFeature (with series)
                    assert isinstance(llm["byFeature"], list), "byFeature should be array"
                    if len(llm["byFeature"]) > 0:
                        feat = llm["byFeature"][0]
                        assert "feature" in feat, "feature should have feature field"
                        assert "kind" in feat, "feature should have kind field"
                        assert "calls" in feat, "feature should have calls field"
                        assert "tokens" in feat, "feature should have tokens field"
                        assert "images" in feat, "feature should have images field"
                        assert "costNok" in feat, "feature should have costNok field"
                        assert "models" in feat and isinstance(feat["models"], list), "feature should have models array"
                        assert "series" in feat and isinstance(feat["series"], list), "feature should have series array"
                        if len(feat["series"]) > 0:
                            s = feat["series"][0]
                            assert "day" in s, "series should have day field"
                            assert "value" in s, "series should have value field"
                        print(f"  ✓ llm.byFeature: {len(llm['byFeature'])} features, first={feat.get('feature')}, series length={len(feat.get('series', []))}")
                    
                    # Verify llm.series (day series)
                    assert isinstance(llm["series"], list), "llm.series should be array"
                    print(f"  ✓ llm.series: {len(llm['series'])} days")
                    
                    # Verify ext.services (should have 4 services)
                    ext = data["ext"]
                    assert "services" in ext, "ext.services should be present"
                    assert isinstance(ext["services"], list), "ext.services should be array"
                    services = ext["services"]
                    service_ids = [s.get("service") for s in services]
                    required_services = ["sendgrid", "serpapi", "google_maps_autocomplete", "google_maps_details"]
                    for req in required_services:
                        assert req in service_ids, f"ext.services should include {req}"
                    print(f"  ✓ ext.services: {len(services)} services, includes all 4 required services")
                    
                    # Verify each service has required fields
                    for svc in services:
                        assert "label" in svc, "service should have label"
                        assert "unit" in svc, "service should have unit"
                        assert "units" in svc, "service should have units"
                        assert "costNok" in svc, "service should have costNok"
                        assert "source" in svc and svc["source"] == "estimate", "service should have source='estimate'"
                    print(f"  ✓ All services have required fields (label, unit, units, costNok, source='estimate')")
                    
                    # Verify platform.status (should be 'waiting' or 'error')
                    platform = data["platform"]
                    assert "status" in platform, "platform should have status"
                    assert platform["status"] in ["waiting", "error", "ok"], f"platform.status should be 'waiting', 'error', or 'ok', got {platform['status']}"
                    print(f"  ✓ platform.status: '{platform['status']}' (expected 'waiting' or 'error' if CRM endpoint not ready)")
                    
                    # Verify models array (should have 8 models)
                    models = data["models"]
                    assert isinstance(models, list), "models should be array"
                    assert len(models) == 8, f"models should have 8 elements, got {len(models)}"
                    expected_models = ["gpt-4o-mini", "gpt-4.1-nano", "gpt-4.1-mini", "gpt-4.1", "gpt-5-nano", "gpt-5-mini", "gpt-5", "o4-mini"]
                    model_ids = [m.get("id") for m in models]
                    for exp in expected_models:
                        assert exp in model_ids, f"models should include {exp}"
                    # Verify each model has required fields
                    for m in models:
                        assert "id" in m, "model should have id"
                        assert "label" in m, "model should have label"
                        assert "in" in m, "model should have in (input price)"
                        assert "out" in m, "model should have out (output price)"
                    print(f"  ✓ models: {len(models)} models, all 8 expected models present with required fields")
                    
                    # Verify defaultModel
                    assert data["defaultModel"] == "gpt-4o-mini", f"defaultModel should be 'gpt-4o-mini', got {data['defaultModel']}"
                    print(f"  ✓ defaultModel: '{data['defaultModel']}'")
                    
                    # Verify overrides is object
                    assert isinstance(data["overrides"], dict), "overrides should be object"
                    print(f"  ✓ overrides: {len(data['overrides'])} overrides")
                    
                    print("  ✅ Test 1a PASSED")
                    test_results["point1"]["passed"] += 1
                else:
                    print(f"  ❌ Test 1a FAILED: Expected 200, got {status}")
            except Exception as e:
                print(f"  ❌ Test 1a FAILED: {e}")
            
            # Test 1b: GET with days=7
            print("\nTest 1b: GET /api/admin/usage/api?key=...&days=7")
            test_results["point1"]["total"] += 1
            try:
                response = await page.request.get(f"{BASE_URL}/admin/usage/api?key={ADMIN_KEY}&days=7")
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                assert data.get("ok") == True, "ok should be true"
                assert data.get("days") == 7, "days should be 7"
                print("  ✅ Test 1b PASSED")
                test_results["point1"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 1b FAILED: {e}")
            
            # Test 1c: GET with days=90
            print("\nTest 1c: GET /api/admin/usage/api?key=...&days=90")
            test_results["point1"]["total"] += 1
            try:
                response = await page.request.get(f"{BASE_URL}/admin/usage/api?key={ADMIN_KEY}&days=90")
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                assert data.get("ok") == True, "ok should be true"
                assert data.get("days") == 90, "days should be 90"
                print("  ✅ Test 1c PASSED")
                test_results["point1"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 1c FAILED: {e}")
            
            # Test 1d: GET without key (should return 401)
            print("\nTest 1d: GET /api/admin/usage/api without key (should return 401)")
            test_results["point1"]["total"] += 1
            try:
                response = await page.request.get(f"{BASE_URL}/admin/usage/api?days=30")
                status = response.status
                print(f"  Status: {status}")
                assert status == 401, f"Expected 401, got {status}"
                print("  ✅ Test 1d PASSED")
                test_results["point1"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 1d FAILED: {e}")
            
            # ============================================================
            # POINT 2: PUT /api/admin/usage/llm/model
            # ============================================================
            print("\n" + "=" * 70)
            print("POINT 2: PUT /api/admin/usage/llm/model")
            print("=" * 70)
            
            # Test 2a: Set override for test_agent_probe to gpt-4.1-mini
            print("\nTest 2a: PUT /api/admin/usage/llm/model {feature:'test_agent_probe', model:'gpt-4.1-mini'}")
            test_results["point2"]["total"] += 1
            try:
                response = await page.request.put(
                    f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}",
                    data=json.dumps({"feature": "test_agent_probe", "model": "gpt-4.1-mini"})
                )
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                assert data.get("ok") == True, "ok should be true"
                assert data.get("overrides", {}).get("test_agent_probe") == "gpt-4.1-mini", "overrides.test_agent_probe should be 'gpt-4.1-mini'"
                print(f"  ✓ Override set: {data.get('overrides', {}).get('test_agent_probe')}")
                print("  ✅ Test 2a PASSED")
                test_results["point2"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 2a FAILED: {e}")
            
            # Test 2b: Verify override in GET /api/admin/usage/api
            print("\nTest 2b: Verify override in GET /api/admin/usage/api")
            test_results["point2"]["total"] += 1
            try:
                response = await page.request.get(f"{BASE_URL}/admin/usage/api?key={ADMIN_KEY}&days=30")
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                assert data.get("overrides", {}).get("test_agent_probe") == "gpt-4.1-mini", "overrides.test_agent_probe should be 'gpt-4.1-mini'"
                print(f"  ✓ Override verified: {data.get('overrides', {}).get('test_agent_probe')}")
                print("  ✅ Test 2b PASSED")
                test_results["point2"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 2b FAILED: {e}")
            
            # Test 2c: Reset override (model:'')
            print("\nTest 2c: PUT /api/admin/usage/llm/model {feature:'test_agent_probe', model:''} (reset)")
            test_results["point2"]["total"] += 1
            try:
                response = await page.request.put(
                    f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}",
                    data=json.dumps({"feature": "test_agent_probe", "model": ""})
                )
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                assert "test_agent_probe" not in data.get("overrides", {}), "test_agent_probe should not be in overrides after reset"
                print(f"  ✓ Override reset: test_agent_probe not in overrides")
                print("  ✅ Test 2c PASSED")
                test_results["point2"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 2c FAILED: {e}")
            
            # Test 2d: Invalid model (should return 400)
            print("\nTest 2d: PUT /api/admin/usage/llm/model {feature:'test_agent_probe', model:'finnes-ikke'} (invalid model)")
            test_results["point2"]["total"] += 1
            try:
                response = await page.request.put(
                    f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}",
                    data=json.dumps({"feature": "test_agent_probe", "model": "finnes-ikke"})
                )
                status = response.status
                print(f"  Status: {status}")
                assert status == 400, f"Expected 400, got {status}"
                print("  ✅ Test 2d PASSED")
                test_results["point2"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 2d FAILED: {e}")
            
            # Test 2e: Missing feature (should return 400)
            print("\nTest 2e: PUT /api/admin/usage/llm/model {model:'gpt-4.1'} (missing feature)")
            test_results["point2"]["total"] += 1
            try:
                response = await page.request.put(
                    f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}",
                    data=json.dumps({"model": "gpt-4.1"})
                )
                status = response.status
                print(f"  Status: {status}")
                assert status == 400, f"Expected 400, got {status}"
                print("  ✅ Test 2e PASSED")
                test_results["point2"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 2e FAILED: {e}")
            
            # Test 2f: Without key (should return 401)
            print("\nTest 2f: PUT /api/admin/usage/llm/model without key (should return 401)")
            test_results["point2"]["total"] += 1
            try:
                response = await page.request.put(
                    f"{BASE_URL}/admin/usage/llm/model",
                    data=json.dumps({"feature": "test_agent_probe", "model": "gpt-4.1-mini"})
                )
                status = response.status
                print(f"  Status: {status}")
                assert status == 401, f"Expected 401, got {status}"
                print("  ✅ Test 2f PASSED")
                test_results["point2"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 2f FAILED: {e}")
            
            # ============================================================
            # POINT 3: Model override affects chatLLM (E2E, 1 real LLM call)
            # ============================================================
            print("\n" + "=" * 70)
            print("POINT 3: Model override affects chatLLM (E2E, 1 real LLM call)")
            print("=" * 70)
            
            # Test 3a: Set override for annonsestudio_bildeprompt to gpt-4.1-mini
            print("\nTest 3a: PUT /api/admin/usage/llm/model {feature:'annonsestudio_bildeprompt', model:'gpt-4.1-mini'}")
            test_results["point3"]["total"] += 1
            try:
                response = await page.request.put(
                    f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}",
                    data=json.dumps({"feature": "annonsestudio_bildeprompt", "model": "gpt-4.1-mini"})
                )
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                assert data.get("ok") == True, "ok should be true"
                assert data.get("overrides", {}).get("annonsestudio_bildeprompt") == "gpt-4.1-mini", "override should be set"
                print(f"  ✓ Override set: {data.get('overrides', {}).get('annonsestudio_bildeprompt')}")
                print("  ✅ Test 3a PASSED")
                test_results["point3"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 3a FAILED: {e}")
            
            # Test 3b: Wait 65 seconds for cache to expire (60s cache + 5s buffer)
            print("\nTest 3b: Wait 65 seconds for override cache to expire (60s in-memory cache)")
            test_results["point3"]["total"] += 1
            try:
                print("  Waiting 65 seconds...")
                await asyncio.sleep(65)
                print("  ✓ Wait complete")
                print("  ✅ Test 3b PASSED")
                test_results["point3"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 3b FAILED: {e}")
            
            # Test 3c: POST /api/admin/adstudio/imageprompt (1 real LLM call)
            print("\nTest 3c: POST /api/admin/adstudio/imageprompt (1 real LLM call, ~300 tokens)")
            test_results["point3"]["total"] += 1
            try:
                # Get timestamp before call
                before_time = datetime.now().isoformat()
                
                response = await page.request.post(
                    f"{BASE_URL}/admin/adstudio/imageprompt?key={ADMIN_KEY}",
                    data=json.dumps({"brief": "Test fra QA-agent: boligeiere i Bergen, gratis leievurdering"})
                )
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                assert data.get("ok") == True, "ok should be true"
                assert "prompt" in data, "prompt should be present"
                print(f"  ✓ LLM call successful, prompt length: {len(data.get('prompt', ''))}")
                print("  ✅ Test 3c PASSED")
                test_results["point3"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 3c FAILED: {e}")
            
            # Test 3d: Verify in MongoDB that llm_usage has model='gpt-4.1-mini'
            print("\nTest 3d: Verify in MongoDB that llm_usage has model='gpt-4.1-mini' and provider='openai'")
            test_results["point3"]["total"] += 1
            try:
                # Find the newest document in llm_usage with feature='annonsestudio_bildeprompt'
                llm_usage = db["llm_usage"].find_one(
                    {"feature": "annonsestudio_bildeprompt"},
                    sort=[("at", -1)]
                )
                assert llm_usage is not None, "Should find llm_usage document"
                assert llm_usage.get("model") == "gpt-4.1-mini", f"model should be 'gpt-4.1-mini', got {llm_usage.get('model')}"
                assert llm_usage.get("provider") == "openai", f"provider should be 'openai', got {llm_usage.get('provider')}"
                print(f"  ✓ MongoDB verification: model='{llm_usage.get('model')}', provider='{llm_usage.get('provider')}'")
                print(f"  ✓ Tokens: prompt={llm_usage.get('promptTokens')}, completion={llm_usage.get('completionTokens')}, total={llm_usage.get('totalTokens')}")
                print("  ✅ Test 3d PASSED")
                test_results["point3"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 3d FAILED: {e}")
            
            # Test 3e: Cleanup - reset override
            print("\nTest 3e: Cleanup - reset override for annonsestudio_bildeprompt")
            test_results["point3"]["total"] += 1
            try:
                response = await page.request.put(
                    f"{BASE_URL}/admin/usage/llm/model?key={ADMIN_KEY}",
                    data=json.dumps({"feature": "annonsestudio_bildeprompt", "model": ""})
                )
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                assert "annonsestudio_bildeprompt" not in data.get("overrides", {}), "override should be reset"
                print(f"  ✓ Override reset")
                print("  ✅ Test 3e PASSED")
                test_results["point3"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 3e FAILED: {e}")
            
            # ============================================================
            # POINT 4: External usage tracking (Google Maps)
            # ============================================================
            print("\n" + "=" * 70)
            print("POINT 4: External usage tracking (Google Maps)")
            print("=" * 70)
            
            # Test 4a: Count ext_usage documents with service='google_maps_autocomplete'
            print("\nTest 4a: Count ext_usage documents with service='google_maps_autocomplete'")
            test_results["point4"]["total"] += 1
            try:
                count_before = db["ext_usage"].count_documents({"service": "google_maps_autocomplete"})
                print(f"  Count before: {count_before}")
                print("  ✅ Test 4a PASSED")
                test_results["point4"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 4a FAILED: {e}")
                count_before = 0
            
            # Test 4b: GET /api/address with unique query (1 Google Maps call)
            print("\nTest 4b: GET /api/address?q=Torgallmenningen+1+Bergen+QA{random} (1 Google Maps call)")
            test_results["point4"]["total"] += 1
            try:
                import random
                random_suffix = random.randint(10000, 99999)
                query = f"Torgallmenningen 1 Bergen QA{random_suffix}"
                print(f"  Query: {query}")
                
                response = await page.request.get(f"{BASE_URL}/address?q={query.replace(' ', '+')}")
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                print(f"  ✓ Address search successful, results: {len(data.get('results', []))}")
                print("  ✅ Test 4b PASSED")
                test_results["point4"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 4b FAILED: {e}")
            
            # Test 4c: Wait 2 seconds and verify ext_usage increased by 1
            print("\nTest 4c: Wait 2 seconds and verify ext_usage increased by 1")
            test_results["point4"]["total"] += 1
            try:
                await asyncio.sleep(2)
                count_after = db["ext_usage"].count_documents({"service": "google_maps_autocomplete"})
                print(f"  Count after: {count_after}")
                assert count_after == count_before + 1, f"Expected count to increase by 1, got {count_after - count_before}"
                
                # Verify the new document has units=1 and costNok>0
                new_doc = db["ext_usage"].find_one(
                    {"service": "google_maps_autocomplete"},
                    sort=[("at", -1)]
                )
                assert new_doc is not None, "Should find new ext_usage document"
                assert new_doc.get("units") == 1, f"units should be 1, got {new_doc.get('units')}"
                assert new_doc.get("costNok", 0) > 0, f"costNok should be >0, got {new_doc.get('costNok')}"
                print(f"  ✓ New document: units={new_doc.get('units')}, costNok={new_doc.get('costNok')}")
                print("  ✅ Test 4c PASSED")
                test_results["point4"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 4c FAILED: {e}")
            
            # Test 4d: Verify GET /api/admin/usage/api shows units>=1 for google_maps_autocomplete
            print("\nTest 4d: Verify GET /api/admin/usage/api shows units>=1 for google_maps_autocomplete")
            test_results["point4"]["total"] += 1
            try:
                response = await page.request.get(f"{BASE_URL}/admin/usage/api?key={ADMIN_KEY}&days=30")
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                services = data.get("ext", {}).get("services", [])
                gm_autocomplete = next((s for s in services if s.get("service") == "google_maps_autocomplete"), None)
                assert gm_autocomplete is not None, "google_maps_autocomplete should be in services"
                assert gm_autocomplete.get("units", 0) >= 1, f"units should be >=1, got {gm_autocomplete.get('units')}"
                print(f"  ✓ google_maps_autocomplete: units={gm_autocomplete.get('units')}, costNok={gm_autocomplete.get('costNok')}")
                print("  ✅ Test 4d PASSED")
                test_results["point4"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 4d FAILED: {e}")
            
            # ============================================================
            # POINT 5: Regression tests (no 500 errors)
            # ============================================================
            print("\n" + "=" * 70)
            print("POINT 5: Regression tests (no 500 errors)")
            print("=" * 70)
            
            # Test 5a: GET /api/admin/kpi?key=...&days=30
            print("\nTest 5a: GET /api/admin/kpi?key=...&days=30")
            test_results["point5"]["total"] += 1
            try:
                response = await page.request.get(f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=30")
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                assert data.get("ok") == True, "ok should be true"
                print("  ✅ Test 5a PASSED")
                test_results["point5"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 5a FAILED: {e}")
            
            # Test 5b: GET /api/health
            print("\nTest 5b: GET /api/health")
            test_results["point5"]["total"] += 1
            try:
                response = await page.request.get(f"{BASE_URL}/health")
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                print("  ✅ Test 5b PASSED")
                test_results["point5"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 5b FAILED: {e}")
            
            # Test 5c: GET /api/
            print("\nTest 5c: GET /api/")
            test_results["point5"]["total"] += 1
            try:
                response = await page.request.get(f"{BASE_URL}/")
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                assert data.get("ok") == True, "ok should be true"
                print("  ✅ Test 5c PASSED")
                test_results["point5"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 5c FAILED: {e}")
            
            # Test 5d: GET /api/admin/finance/resultat?key=...
            print("\nTest 5d: GET /api/admin/finance/resultat?key=...")
            test_results["point5"]["total"] += 1
            try:
                response = await page.request.get(f"{BASE_URL}/admin/finance/resultat?key={ADMIN_KEY}")
                status = response.status
                print(f"  Status: {status}")
                assert status == 200, f"Expected 200, got {status}"
                data = await response.json()
                assert data.get("ok") == True, "ok should be true"
                print("  ✅ Test 5d PASSED")
                test_results["point5"]["passed"] += 1
            except Exception as e:
                print(f"  ❌ Test 5d FAILED: {e}")
            
        finally:
            await browser.close()
            mongo_client.close()
        
        # ============================================================
        # SUMMARY
        # ============================================================
        print("\n" + "=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)
        
        total_passed = 0
        total_tests = 0
        for point, result in test_results.items():
            passed = result["passed"]
            total = result["total"]
            total_passed += passed
            total_tests += total
            status = "✅ PASSED" if passed == total else f"⚠️ {passed}/{total} PASSED"
            print(f"{point}: {result['name']}")
            print(f"  {status}")
        
        print(f"\nOVERALL: {total_passed}/{total_tests} tests passed")
        
        if total_passed == total_tests:
            print("\n🎉 ALL TESTS PASSED!")
        else:
            print(f"\n⚠️ {total_tests - total_passed} tests failed")

if __name__ == "__main__":
    asyncio.run(main())
