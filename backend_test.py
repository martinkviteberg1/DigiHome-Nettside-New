#!/usr/bin/env python3
"""
Backend test for 3 NEW DigiHome backend changes:
1. AI-bildegenerering nyhetsbrev (POST /api/admin/newsletter/genimage)
2. Lead-kvitteringsepost: bilder via /api/media + mobilresponsivitet
3. Nyhetsbrev absAssetUrl deploy-sikker

CRITICAL SECURITY RULES:
- NEVER call POST /api/admin/newsletter/send (sends REAL emails)
- NEVER call POST /api/admin/newsletter/test with valid emails+blocks (sends REAL emails)
- NEVER create leads via POST /api/leads (triggers REAL emails)
- MANDATORY CLEANUP: delete all documents created in newsletter_assets collection
"""

import requests
import json
import time
import os
from pymongo import MongoClient

# Configuration
BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "your_database_name")

# Track created assets for cleanup
created_assets = []

def log(msg):
    print(f"[TEST] {msg}")

def cleanup_assets():
    """Delete all test assets from newsletter_assets collection"""
    if not created_assets:
        log("No assets to clean up")
        return
    
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        for asset_id in created_assets:
            result = db.newsletter_assets.delete_one({"id": asset_id})
            if result.deleted_count > 0:
                log(f"✓ Deleted asset {asset_id}")
            else:
                log(f"⚠ Asset {asset_id} not found (may have been deleted already)")
        client.close()
        log(f"Cleanup complete: {len(created_assets)} assets processed")
    except Exception as e:
        log(f"❌ Cleanup failed: {e}")

# ============================================================================
# TEST 1: AI-bildegenerering (POST /api/admin/newsletter/genimage)
# ============================================================================

def test_1a_suggest_only():
    """TEST 1a: suggestOnly-modus (returns prompt without generating image)"""
    log("\n=== TEST 1a: AI image suggestion (suggestOnly=true) ===")
    try:
        url = f"{BASE_URL}/admin/newsletter/genimage?key={ADMIN_KEY}"
        payload = {
            "auto": True,
            "suggestOnly": True,
            "blocks": [
                {"type": "heading", "text": "Sommertilbud på utleie i Bergen"},
                {"type": "text", "text": "Vi tilbyr profesjonell utleieforvaltning med 10 prosent rabatt ut juli. Bergen har rekordhøy etterspørsel etter leieboliger."}
            ]
        }
        
        log(f"POST {url}")
        log(f"Body: {json.dumps(payload, indent=2)}")
        
        start = time.time()
        response = requests.post(url, json=payload, timeout=60)
        elapsed = time.time() - start
        
        log(f"Status: {response.status_code} (took {elapsed:.2f}s)")
        
        if response.status_code == 200:
            data = response.json()
            log(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("ok") and data.get("prompt"):
                prompt = data["prompt"]
                if len(prompt) > 0 and len(prompt) < 1000:
                    log(f"✅ TEST 1a PASSED: Got prompt suggestion (length: {len(prompt)})")
                    log(f"   Prompt: {prompt[:100]}...")
                    return True
                else:
                    log(f"❌ TEST 1a FAILED: Prompt length invalid ({len(prompt)})")
                    return False
            else:
                log(f"❌ TEST 1a FAILED: Missing ok=true or prompt in response")
                return False
        else:
            log(f"❌ TEST 1a FAILED: Expected 200, got {response.status_code}")
            log(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        log(f"❌ TEST 1a EXCEPTION: {e}")
        return False

def test_1b_full_generation():
    """TEST 1b: Full image generation (ONLY ONCE - costs money and takes time)"""
    log("\n=== TEST 1b: AI full image generation (ONE TIME ONLY) ===")
    try:
        url = f"{BASE_URL}/admin/newsletter/genimage?key={ADMIN_KEY}"
        payload = {
            "prompt": "A cozy modern Scandinavian living room with large windows",
            "style": "foto"
        }
        
        log(f"POST {url}")
        log(f"Body: {json.dumps(payload, indent=2)}")
        log("⚠ This will take 30-90 seconds (Nano Banana Pro generation)...")
        
        start = time.time()
        response = requests.post(url, json=payload, timeout=120)
        elapsed = time.time() - start
        
        log(f"Status: {response.status_code} (took {elapsed:.2f}s)")
        
        if response.status_code == 201:
            data = response.json()
            log(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("ok") and data.get("id") and data.get("url"):
                asset_id = data["id"]
                asset_url = data["url"]
                width = data.get("width", 0)
                height = data.get("height", 0)
                model = data.get("model", "unknown")
                
                # Track for cleanup
                created_assets.append(asset_id)
                
                log(f"✅ Image generated successfully")
                log(f"   ID: {asset_id}")
                log(f"   URL: {asset_url}")
                log(f"   Dimensions: {width}x{height}")
                log(f"   Model used: {model}")
                
                # Verify the asset is accessible
                log(f"\n   Verifying asset accessibility...")
                asset_response = requests.get(f"{BASE_URL}/newsletter/asset?id={asset_id}", timeout=10)
                
                if asset_response.status_code == 200:
                    content_type = asset_response.headers.get("Content-Type", "")
                    content_length = len(asset_response.content)
                    
                    log(f"   ✓ Asset accessible: {content_type}, {content_length} bytes")
                    
                    if content_type == "image/jpeg" and content_length > 10000:
                        log(f"✅ TEST 1b PASSED: Full generation working (model: {model})")
                        return True, model
                    else:
                        log(f"❌ TEST 1b FAILED: Invalid content type or size")
                        return False, model
                else:
                    log(f"❌ TEST 1b FAILED: Asset not accessible ({asset_response.status_code})")
                    return False, model
            else:
                log(f"❌ TEST 1b FAILED: Missing required fields in response")
                return False, "unknown"
        else:
            log(f"❌ TEST 1b FAILED: Expected 201, got {response.status_code}")
            log(f"   Response: {response.text}")
            return False, "unknown"
            
    except Exception as e:
        log(f"❌ TEST 1b EXCEPTION: {e}")
        return False, "unknown"

def test_1c_validation():
    """TEST 1c: Validation tests"""
    log("\n=== TEST 1c: Validation tests ===")
    
    passed = 0
    total = 3
    
    # Test 1c.1: No prompt, no auto
    try:
        log("\n  Test 1c.1: Empty body (no prompt, no auto)")
        url = f"{BASE_URL}/admin/newsletter/genimage?key={ADMIN_KEY}"
        response = requests.post(url, json={}, timeout=10)
        
        if response.status_code == 400:
            data = response.json()
            if not data.get("ok") and "error" in data:
                log(f"  ✅ Test 1c.1 PASSED: Got 400 with error message")
                passed += 1
            else:
                log(f"  ❌ Test 1c.1 FAILED: 400 but wrong response format")
        else:
            log(f"  ❌ Test 1c.1 FAILED: Expected 400, got {response.status_code}")
    except Exception as e:
        log(f"  ❌ Test 1c.1 EXCEPTION: {e}")
    
    # Test 1c.2: auto=true, suggestOnly=true, but empty blocks
    try:
        log("\n  Test 1c.2: auto=true, suggestOnly=true, empty blocks")
        url = f"{BASE_URL}/admin/newsletter/genimage?key={ADMIN_KEY}"
        response = requests.post(url, json={"auto": True, "suggestOnly": True, "blocks": []}, timeout=10)
        
        if response.status_code == 400:
            log(f"  ✅ Test 1c.2 PASSED: Got 400 for empty blocks")
            passed += 1
        else:
            log(f"  ❌ Test 1c.2 FAILED: Expected 400, got {response.status_code}")
    except Exception as e:
        log(f"  ❌ Test 1c.2 EXCEPTION: {e}")
    
    # Test 1c.3: No key (authentication)
    try:
        log("\n  Test 1c.3: No admin key (authentication)")
        url = f"{BASE_URL}/admin/newsletter/genimage"
        response = requests.post(url, json={"prompt": "test"}, timeout=10)
        
        if response.status_code == 401:
            log(f"  ✅ Test 1c.3 PASSED: Got 401 without key")
            passed += 1
        else:
            log(f"  ❌ Test 1c.3 FAILED: Expected 401, got {response.status_code}")
    except Exception as e:
        log(f"  ❌ Test 1c.3 EXCEPTION: {e}")
    
    log(f"\n✅ TEST 1c: {passed}/{total} validation tests passed")
    return passed == total

# ============================================================================
# TEST 2: Lead-e-post bilder + mobilresponsivitet
# ============================================================================

def test_2a_receipt_preview():
    """TEST 2a: Receipt email preview with images and mobile responsiveness"""
    log("\n=== TEST 2a: Receipt email preview (images + mobile) ===")
    try:
        url = f"{BASE_URL}/admin/leads/email-preview?type=receipt&key={ADMIN_KEY}"
        
        log(f"GET {url}")
        response = requests.get(url, timeout=10)
        
        log(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            html = response.text
            log(f"Response length: {len(html)} chars")
            
            # Check for required images via /api/media
            checks = {
                "email-hero.jpg": "/api/media/email-hero.jpg" in html,
                "team-sarah.jpg": "/api/media/team-sarah.jpg" in html,
                "email-logo.png": "/api/media/email-logo.png" in html,
                "mobile_media_query": "@media only screen and (max-width:600px)" in html or "@media only screen and (max-width: 600px)" in html,
                "dh-pad_class": 'class="dh-pad"' in html,
                "dh-btns_class": 'class="dh-btns"' in html or 'dh-btns' in html,
                "dh-photo_class": "dh-photo" in html,
                "no_direct_public_paths": "digihome.no/email-hero.jpg" not in html and "https://hero-premiere-4.preview.emergentagent.com/email-hero.jpg" not in html
            }
            
            log("\n  Verification checks:")
            all_passed = True
            for check_name, result in checks.items():
                status = "✓" if result else "✗"
                log(f"    {status} {check_name}: {result}")
                if not result:
                    all_passed = False
            
            if all_passed:
                log(f"✅ TEST 2a PASSED: All checks passed")
                return True
            else:
                log(f"❌ TEST 2a FAILED: Some checks failed")
                return False
        else:
            log(f"❌ TEST 2a FAILED: Expected 200, got {response.status_code}")
            return False
            
    except Exception as e:
        log(f"❌ TEST 2a EXCEPTION: {e}")
        return False

def test_2b_notify_preview():
    """TEST 2b: Admin notification email preview with mobile responsiveness"""
    log("\n=== TEST 2b: Admin notification email preview (mobile) ===")
    try:
        url = f"{BASE_URL}/admin/leads/email-preview?type=notify&key={ADMIN_KEY}"
        
        log(f"GET {url}")
        response = requests.get(url, timeout=10)
        
        log(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            html = response.text
            log(f"Response length: {len(html)} chars")
            
            # Check for mobile responsiveness
            checks = {
                "mobile_media_query": "@media only screen and (max-width:600px)" in html or "@media only screen and (max-width: 600px)" in html,
                "dh-pad_class": "dh-pad" in html,
            }
            
            log("\n  Verification checks:")
            all_passed = True
            for check_name, result in checks.items():
                status = "✓" if result else "✗"
                log(f"    {status} {check_name}: {result}")
                if not result:
                    all_passed = False
            
            if all_passed:
                log(f"✅ TEST 2b PASSED: Mobile responsiveness present")
                return True
            else:
                log(f"❌ TEST 2b FAILED: Mobile responsiveness missing")
                return False
        else:
            log(f"❌ TEST 2b FAILED: Expected 200, got {response.status_code}")
            return False
            
    except Exception as e:
        log(f"❌ TEST 2b EXCEPTION: {e}")
        return False

def test_2c_media_serving():
    """TEST 2c: Media serving endpoints"""
    log("\n=== TEST 2c: Media serving (/api/media/*) ===")
    
    passed = 0
    total = 3
    
    media_files = [
        ("email-hero.jpg", "image/jpeg", 10000),
        ("team-sarah.jpg", "image/jpeg", 5000),
        ("sarah-sleeman.jpg", "image/jpeg", 5000),
    ]
    
    for filename, expected_type, min_size in media_files:
        try:
            log(f"\n  Testing {filename}...")
            url = f"{BASE_URL}/media/{filename}"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                content_type = response.headers.get("Content-Type", "")
                content_length = len(response.content)
                
                if expected_type in content_type and content_length > min_size:
                    log(f"  ✅ {filename}: {content_type}, {content_length} bytes")
                    passed += 1
                else:
                    log(f"  ❌ {filename}: Wrong type or size ({content_type}, {content_length} bytes)")
            else:
                log(f"  ❌ {filename}: Got {response.status_code}")
        except Exception as e:
            log(f"  ❌ {filename} EXCEPTION: {e}")
    
    log(f"\n✅ TEST 2c: {passed}/{total} media files served correctly")
    return passed == total

# ============================================================================
# TEST 3: absAssetUrl deploy-sikker (nyhetsbrev-render)
# ============================================================================

def test_3a_sender_photo_mapping():
    """TEST 3a: Sender photo URL mapping to /api/media"""
    log("\n=== TEST 3a: Sender photo URL mapping ===")
    try:
        url = f"{BASE_URL}/admin/newsletter/preview?key={ADMIN_KEY}"
        payload = {
            "subject": "test",
            "blocks": [
                {
                    "type": "sender",
                    "name": "Sarah Sleeman",
                    "title": "Daglig leder",
                    "photoUrl": "/sarah-sleeman.jpg"
                }
            ]
        }
        
        log(f"POST {url}")
        response = requests.post(url, json=payload, timeout=10)
        
        log(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and data.get("html"):
                html = data["html"]
                
                # Check that /sarah-sleeman.jpg is mapped to /api/media/sarah-sleeman.jpg
                has_api_media = "/api/media/sarah-sleeman.jpg" in html
                has_direct_path = "digihome.no/sarah-sleeman.jpg" in html and "/api/media" not in html.split("digihome.no/sarah-sleeman.jpg")[0][-50:]
                
                log(f"\n  Checks:")
                log(f"    ✓ Contains /api/media/sarah-sleeman.jpg: {has_api_media}")
                log(f"    ✓ No direct digihome.no/sarah-sleeman.jpg: {not has_direct_path}")
                
                if has_api_media and not has_direct_path:
                    log(f"✅ TEST 3a PASSED: Photo URL correctly mapped to /api/media")
                    return True
                else:
                    log(f"❌ TEST 3a FAILED: Photo URL not correctly mapped")
                    return False
            else:
                log(f"❌ TEST 3a FAILED: Missing ok or html in response")
                return False
        else:
            log(f"❌ TEST 3a FAILED: Expected 200, got {response.status_code}")
            return False
            
    except Exception as e:
        log(f"❌ TEST 3a EXCEPTION: {e}")
        return False

def test_3b_api_paths_preserved():
    """TEST 3b: API paths (like /api/newsletter/asset) should NOT be prefixed"""
    log("\n=== TEST 3b: API paths preserved (not prefixed) ===")
    try:
        url = f"{BASE_URL}/admin/newsletter/preview?key={ADMIN_KEY}"
        payload = {
            "subject": "test",
            "blocks": [
                {
                    "type": "image",
                    "url": "/api/newsletter/asset?id=abc123",
                    "height": 200
                }
            ]
        }
        
        log(f"POST {url}")
        response = requests.post(url, json=payload, timeout=10)
        
        log(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and data.get("html"):
                html = data["html"]
                
                # Check that /api/newsletter/asset?id=abc123 is preserved (not changed to /api/media/api/newsletter/asset)
                has_correct_path = "/api/newsletter/asset?id=abc123" in html
                has_double_api = "/api/media/api/newsletter" in html
                
                log(f"\n  Checks:")
                log(f"    ✓ Contains /api/newsletter/asset?id=abc123: {has_correct_path}")
                log(f"    ✓ No double /api/media/api/newsletter: {not has_double_api}")
                
                if has_correct_path and not has_double_api:
                    log(f"✅ TEST 3b PASSED: API paths preserved correctly")
                    return True
                else:
                    log(f"❌ TEST 3b FAILED: API paths not preserved correctly")
                    return False
            else:
                log(f"❌ TEST 3b FAILED: Missing ok or html in response")
                return False
        else:
            log(f"❌ TEST 3b FAILED: Expected 200, got {response.status_code}")
            return False
            
    except Exception as e:
        log(f"❌ TEST 3b EXCEPTION: {e}")
        return False

# ============================================================================
# TEST 4: Regression tests
# ============================================================================

def test_4_regression():
    """TEST 4: Regression tests"""
    log("\n=== TEST 4: Regression tests ===")
    
    passed = 0
    total = 3
    
    # Test 4a: Root endpoint
    try:
        log("\n  Test 4a: GET /api/")
        response = requests.get(f"{BASE_URL}/", timeout=10)
        if response.status_code == 200:
            log(f"  ✅ Test 4a PASSED: Root endpoint working")
            passed += 1
        else:
            log(f"  ❌ Test 4a FAILED: Got {response.status_code}")
    except Exception as e:
        log(f"  ❌ Test 4a EXCEPTION: {e}")
    
    # Test 4b: Public properties
    try:
        log("\n  Test 4b: GET /api/public/properties")
        response = requests.get(f"{BASE_URL}/public/properties", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log(f"  ✅ Test 4b PASSED: Public properties working")
                passed += 1
            else:
                log(f"  ❌ Test 4b FAILED: Missing ok in response")
        else:
            log(f"  ❌ Test 4b FAILED: Got {response.status_code}")
    except Exception as e:
        log(f"  ❌ Test 4b EXCEPTION: {e}")
    
    # Test 4c: Newsletter audiences
    try:
        log("\n  Test 4c: GET /api/admin/newsletter?key=...")
        response = requests.get(f"{BASE_URL}/admin/newsletter?key={ADMIN_KEY}", timeout=10)
        if response.status_code == 200:
            log(f"  ✅ Test 4c PASSED: Newsletter endpoint working")
            passed += 1
        else:
            log(f"  ❌ Test 4c FAILED: Got {response.status_code}")
    except Exception as e:
        log(f"  ❌ Test 4c EXCEPTION: {e}")
    
    log(f"\n✅ TEST 4: {passed}/{total} regression tests passed")
    return passed == total

# ============================================================================
# Main test runner
# ============================================================================

def main():
    log("=" * 80)
    log("DigiHome Backend Test - 3 NEW Backend Changes")
    log("=" * 80)
    log(f"Base URL: {BASE_URL}")
    log(f"Admin key: {ADMIN_KEY}")
    log(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    log("=" * 80)
    
    results = {}
    model_used = "unknown"
    
    try:
        # TEST 1: AI-bildegenerering
        log("\n" + "=" * 80)
        log("TEST 1: AI-bildegenerering nyhetsbrev")
        log("=" * 80)
        
        results["1a_suggest_only"] = test_1a_suggest_only()
        results["1b_full_generation"], model_used = test_1b_full_generation()
        results["1c_validation"] = test_1c_validation()
        
        # TEST 2: Lead-e-post bilder + mobilresponsivitet
        log("\n" + "=" * 80)
        log("TEST 2: Lead-e-post bilder + mobilresponsivitet")
        log("=" * 80)
        
        results["2a_receipt_preview"] = test_2a_receipt_preview()
        results["2b_notify_preview"] = test_2b_notify_preview()
        results["2c_media_serving"] = test_2c_media_serving()
        
        # TEST 3: absAssetUrl deploy-sikker
        log("\n" + "=" * 80)
        log("TEST 3: absAssetUrl deploy-sikker")
        log("=" * 80)
        
        results["3a_sender_photo"] = test_3a_sender_photo_mapping()
        results["3b_api_paths"] = test_3b_api_paths_preserved()
        
        # TEST 4: Regression
        log("\n" + "=" * 80)
        log("TEST 4: Regression tests")
        log("=" * 80)
        
        results["4_regression"] = test_4_regression()
        
    finally:
        # MANDATORY CLEANUP
        log("\n" + "=" * 80)
        log("MANDATORY CLEANUP: Deleting test assets")
        log("=" * 80)
        cleanup_assets()
    
    # Summary
    log("\n" + "=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        log(f"{status}: {test_name}")
    
    log("\n" + "=" * 80)
    log(f"OVERALL: {passed}/{total} tests passed ({passed*100//total}%)")
    log(f"AI Model used in TEST 1b: {model_used}")
    log("=" * 80)
    
    if passed == total:
        log("\n🎉 ALL TESTS PASSED! 🎉")
        return 0
    else:
        log(f"\n⚠ {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    exit(main())
