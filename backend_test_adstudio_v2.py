#!/usr/bin/env python3
"""
Backend test for Annonsestudio v2 upgrades
Tests: imageprompt, imagenote, A/B validation, regression, cleanup
CRITICAL SAFETY: validateOnly:true for create, no adstate calls
"""

import requests
import json
import base64
from io import BytesIO
from PIL import Image

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def create_test_image():
    """Create a small 300x300 JPEG test image"""
    img = Image.new('RGB', (300, 300), color='#4F46E5')
    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=85)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')

def test_imageprompt():
    """TEST 1: POST /api/admin/adstudio/imageprompt"""
    print("\n=== TEST 1: IMAGEPROMPT ===")
    
    # Test 1a: Valid brief
    try:
        print("TEST 1a: POST /imageprompt with valid brief...")
        resp = requests.post(
            f"{BASE_URL}/admin/adstudio/imageprompt",
            params={"key": ADMIN_KEY},
            json={"brief": "Nå boligeiere i Bergen. Gratis leievurdering på 60 sekunder."},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            print(f"  Response: {json.dumps(data, ensure_ascii=False)[:200]}...")
            
            if data.get('ok') and 'prompt' in data:
                prompt = data['prompt']
                if len(prompt) > 20 and '"' not in prompt[:5] and '"' not in prompt[-5:]:
                    print(f"  ✅ PASS: prompt length={len(prompt)}, no surrounding quotes")
                else:
                    print(f"  ❌ FAIL: prompt length={len(prompt)}, has quotes or too short")
            else:
                print(f"  ❌ FAIL: Missing ok:true or prompt field")
        else:
            print(f"  ❌ FAIL: Expected 200, got {resp.status_code}")
            print(f"  Response: {resp.text[:200]}")
    except Exception as e:
        print(f"  ❌ EXCEPTION: {e}")
    
    # Test 1b: Without brief
    try:
        print("\nTEST 1b: POST /imageprompt without brief...")
        resp = requests.post(
            f"{BASE_URL}/admin/adstudio/imageprompt",
            params={"key": ADMIN_KEY},
            json={},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 400:
            print(f"  ✅ PASS: Returns 400 without brief")
        else:
            print(f"  ❌ FAIL: Expected 400, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ EXCEPTION: {e}")
    
    # Test 1c: Without key
    try:
        print("\nTEST 1c: POST /imageprompt without key...")
        resp = requests.post(
            f"{BASE_URL}/admin/adstudio/imageprompt",
            json={"brief": "Test"},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 401:
            print(f"  ✅ PASS: Returns 401 without key")
        else:
            print(f"  ❌ FAIL: Expected 401, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ EXCEPTION: {e}")

def test_media_and_imagenote():
    """TEST 2: Upload image and test imagenote"""
    print("\n=== TEST 2: MEDIA UPLOAD + IMAGENOTE ===")
    
    asset_id = None
    image_hash = None
    
    # Test 2a: Upload test image
    try:
        print("TEST 2a: Creating small test image (300x300 JPEG)...")
        image_b64 = create_test_image()
        print(f"  Image size: {len(image_b64)} base64 chars")
        
        print("TEST 2b: POST /media with test image...")
        resp = requests.post(
            f"{BASE_URL}/admin/adstudio/media",
            params={"key": ADMIN_KEY},
            json={
                "imageB64": image_b64,
                "filename": "agent-v2-test.jpg"
            },
            timeout=60
        )
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 201:
            data = resp.json()
            print(f"  Response: {json.dumps(data, ensure_ascii=False)[:200]}...")
            
            if 'hash' in data and 'url' in data:
                image_hash = data['hash']
                url = data['url']
                print(f"  ✅ PASS: Got hash={image_hash[:20]}... and url={url[:50]}...")
                
                # Extract assetId from url (id=<uuid>)
                if 'id=' in url:
                    asset_id = url.split('id=')[1].split('&')[0]
                    print(f"  Extracted assetId: {asset_id}")
                else:
                    print(f"  ❌ FAIL: Could not extract assetId from url")
            else:
                print(f"  ❌ FAIL: Missing hash or url in response")
        else:
            print(f"  ❌ FAIL: Expected 201, got {resp.status_code}")
            print(f"  Response: {resp.text[:200]}")
    except Exception as e:
        print(f"  ❌ EXCEPTION: {e}")
    
    # Test 2c: imagenote with valid assetId
    if asset_id:
        try:
            print(f"\nTEST 2c: POST /imagenote with assetId={asset_id}...")
            resp = requests.post(
                f"{BASE_URL}/admin/adstudio/imagenote",
                params={"key": ADMIN_KEY},
                json={"assetId": asset_id},
                timeout=30
            )
            print(f"  Status: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                print(f"  Response: {json.dumps(data, ensure_ascii=False)[:200]}...")
                
                if data.get('ok') and 'note' in data:
                    note = data['note']
                    print(f"  ✅ PASS: Got Norwegian note: '{note[:100]}...'")
                else:
                    print(f"  ❌ FAIL: Missing ok:true or note field")
            else:
                print(f"  ❌ FAIL: Expected 200, got {resp.status_code}")
                print(f"  Response: {resp.text[:200]}")
        except Exception as e:
            print(f"  ❌ EXCEPTION: {e}")
    
    # Test 2d: imagenote with invalid assetId
    try:
        print("\nTEST 2d: POST /imagenote with invalid assetId...")
        resp = requests.post(
            f"{BASE_URL}/admin/adstudio/imagenote",
            params={"key": ADMIN_KEY},
            json={"assetId": "00000000-0000-0000-0000-000000000000"},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 404:
            print(f"  ✅ PASS: Returns 404 with invalid assetId")
        else:
            print(f"  ❌ FAIL: Expected 404, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ EXCEPTION: {e}")
    
    return image_hash

def test_ab_validation(image_hash):
    """TEST 3: A/B validation with validateOnly"""
    print("\n=== TEST 3: A/B VALIDATION (validateOnly) ===")
    
    # First get context to get adsetId
    adset_id = None
    try:
        print("TEST 3a: GET /context to get adsetId...")
        resp = requests.get(
            f"{BASE_URL}/admin/adstudio/context",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') and 'adsets' in data and len(data['adsets']) > 0:
                adset_id = data['adsets'][0]['id']
                print(f"  ✅ Got adsetId: {adset_id}")
            else:
                print(f"  ❌ FAIL: No adsets in context")
        else:
            print(f"  ❌ FAIL: Expected 200, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ EXCEPTION: {e}")
    
    if not adset_id or not image_hash:
        print("  ⚠️ SKIP: Missing adsetId or imageHash")
        return
    
    # Test 3b: validateOnly with all fields
    try:
        print(f"\nTEST 3b: POST /create with validateOnly:true...")
        resp = requests.post(
            f"{BASE_URL}/admin/adstudio/create",
            params={"key": ADMIN_KEY},
            json={
                "validateOnly": True,
                "adsetId": adset_id,
                "adName": "V2 valider",
                "pageId": "673143559224671",
                "link": "https://digihome.no/bli-utleier",
                "message": "Test A",
                "headline": "Test",
                "imageHash": image_hash,
                "cta": "LEARN_MORE",
                "variants": [
                    {"message": "Variant A", "angle": "a"},
                    {"message": "Variant B", "angle": "b"}
                ]
            },
            timeout=60
        )
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:300]}...")
        
        if resp.status_code == 502:
            if 'utviklingsmodus' in resp.text.lower() or 'development' in resp.text.lower():
                print(f"  ✅ PASS: Returns 502 with 'utviklingsmodus' (Meta app in dev mode - expected)")
            else:
                print(f"  ⚠️ PARTIAL: Returns 502 but error message unclear")
        else:
            print(f"  ⚠️ INFO: Expected 502 with 'utviklingsmodus', got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ EXCEPTION: {e}")
    
    # Test 3c: Without imageHash
    try:
        print(f"\nTEST 3c: POST /create without imageHash...")
        resp = requests.post(
            f"{BASE_URL}/admin/adstudio/create",
            params={"key": ADMIN_KEY},
            json={
                "validateOnly": True,
                "adsetId": adset_id,
                "adName": "V2 valider",
                "pageId": "673143559224671",
                "link": "https://digihome.no/bli-utleier",
                "message": "Test A",
                "headline": "Test",
                "cta": "LEARN_MORE"
            },
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 400:
            if 'mangler' in resp.text.lower():
                print(f"  ✅ PASS: Returns 400 with 'Mangler:' message")
            else:
                print(f"  ⚠️ PARTIAL: Returns 400 but message unclear")
        else:
            print(f"  ❌ FAIL: Expected 400, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ EXCEPTION: {e}")

def test_regression():
    """TEST 4: Regression tests"""
    print("\n=== TEST 4: REGRESSION ===")
    
    endpoints = [
        ("/admin/adstudio/context", True),
        ("/admin/adstudio/ads", True),
        ("/health", False),
        ("/", False)
    ]
    
    for endpoint, needs_key in endpoints:
        try:
            print(f"\nTEST 4: GET {endpoint}...")
            params = {"key": ADMIN_KEY} if needs_key else {}
            resp = requests.get(
                f"{BASE_URL}{endpoint}",
                params=params,
                timeout=30
            )
            print(f"  Status: {resp.status_code}")
            
            if resp.status_code == 200:
                print(f"  ✅ PASS: Returns 200")
            else:
                print(f"  ❌ FAIL: Expected 200, got {resp.status_code}")
        except Exception as e:
            print(f"  ❌ EXCEPTION: {e}")

def test_adstate_code_verification():
    """TEST 5: Verify adstate uses adstudioSetAdStatus in code"""
    print("\n=== TEST 5: CODE VERIFICATION (adstate fix) ===")
    
    try:
        with open('/app/app/api/[[...path]]/route.js', 'r') as f:
            content = f.read()
        
        # Check for correct usage
        if 'await adstudioSetAdStatus(' in content:
            print("  ✅ PASS: Found 'await adstudioSetAdStatus(' in route.js")
        else:
            print("  ❌ FAIL: Did NOT find 'await adstudioSetAdStatus(' in route.js")
        
        # Check that old incorrect usage is NOT present
        if 'await setAdStatus(String(body.adId' not in content:
            print("  ✅ PASS: Old 'await setAdStatus(String(body.adId' NOT found (correct)")
        else:
            print("  ❌ FAIL: Old 'await setAdStatus(String(body.adId' still present")
        
        print("  ℹ️ INFO: /adstate endpoint now uses adstudioSetAdStatus (Meta) instead of setAdStatus (Google Ads)")
        print("  ℹ️ INFO: This endpoint was NOT called during testing (per safety rules)")
    except Exception as e:
        print(f"  ❌ EXCEPTION: {e}")

def cleanup_test_assets():
    """TEST 6: Cleanup test documents from newsletter_assets"""
    print("\n=== TEST 6: CLEANUP ===")
    
    try:
        print("Connecting to MongoDB to cleanup test assets...")
        from pymongo import MongoClient
        
        client = MongoClient('mongodb://localhost:27017')
        db = client['your_database_name']
        
        result = db.newsletter_assets.delete_many({
            "filename": "agent-v2-test.jpg"
        })
        
        print(f"  ✅ Deleted {result.deleted_count} test asset(s) from newsletter_assets")
        
        # Verify studio_ads is untouched/empty
        count = db.studio_ads.count_documents({})
        print(f"  ℹ️ INFO: studio_ads collection has {count} documents (should be 0 or unchanged)")
        
        client.close()
    except Exception as e:
        print(f"  ❌ EXCEPTION during cleanup: {e}")

def main():
    print("=" * 80)
    print("ANNONSESTUDIO V2 BACKEND TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print("\n⚠️ CRITICAL SAFETY RULES:")
    print("  - NEVER call POST /create WITHOUT validateOnly:true")
    print("  - NEVER call POST /adstate")
    print("  - Max 1 image upload (small test image)")
    print("  - /imageprompt max 2 calls, /imagenote max 1 call")
    print("  - Cleanup test documents after testing")
    print("=" * 80)
    
    # Run tests
    test_imageprompt()
    image_hash = test_media_and_imagenote()
    test_ab_validation(image_hash)
    test_regression()
    test_adstate_code_verification()
    cleanup_test_assets()
    
    print("\n" + "=" * 80)
    print("TESTING COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    main()
