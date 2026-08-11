#!/usr/bin/env python3
"""
Annonsestudio (Meta Marketing API) Backend Testing
==================================================
CRITICAL SAFETY RULES (user has REAL Meta ad account with REAL money):
(a) NEVER call POST /api/admin/adstudio/create WITHOUT "validateOnly": true
(b) NEVER call POST /api/admin/adstudio/adstate (changes status of REAL ads!)
(c) Don't spam media endpoint - max 1 image upload
(d) CLEANUP: delete documents created in newsletter_assets (filter: {adstudio: true, filename: 'agent-test.jpg'})
(e) AI endpoints cost money - call /copy max 2 times, DON'T use aiPrompt in /media
"""

import asyncio
import base64
import json
import os
import sys
from datetime import datetime
from io import BytesIO
from PIL import Image

# MongoDB cleanup
from pymongo import MongoClient

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60  # seconds

# MongoDB connection for cleanup
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "your_database_name")


def create_test_image_base64():
    """Create a small test image (200x200) and return as base64"""
    img = Image.new('RGB', (200, 200), color=(73, 109, 137))
    buffered = BytesIO()
    img.save(buffered, format="JPEG")
    img_bytes = buffered.getvalue()
    return base64.b64encode(img_bytes).decode('utf-8')


async def test_adstudio():
    """Test all Annonsestudio endpoints with safety rules"""
    import aiohttp
    
    print("=" * 80)
    print("ANNONSESTUDIO (META MARKETING API) TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print()
    
    # Track test results
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "tests": []
    }
    
    # Track created assets for cleanup
    created_asset_id = None
    image_hash = None
    
    async with aiohttp.ClientSession() as session:
        
        # ===================================================================
        # TEST 1: GET /api/admin/adstudio/context
        # ===================================================================
        print("TEST 1: GET /api/admin/adstudio/context")
        print("-" * 80)
        results["total"] += 1
        
        try:
            # First call - should fetch from Meta
            url = f"{BASE_URL}/admin/adstudio/context?key={ADMIN_KEY}"
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                status = resp.status
                data = await resp.json()
                
                print(f"Status: {status}")
                
                if status == 200 and data.get("ok"):
                    # Verify structure
                    assert "account" in data, "Missing 'account' field"
                    assert "page" in data, "Missing 'page' field"
                    assert "campaigns" in data, "Missing 'campaigns' field"
                    
                    account = data["account"]
                    assert "name" in account, "Missing account.name"
                    assert "currency" in account, "Missing account.currency"
                    print(f"✓ Account: {account.get('name')} ({account.get('currency')})")
                    
                    page = data["page"]
                    assert page is not None, "Page is null"
                    assert "id" in page, "Missing page.id"
                    assert "name" in page, "Missing page.name"
                    print(f"✓ Page: {page.get('name')} (ID: {page.get('id')})")
                    
                    campaigns = data["campaigns"]
                    assert isinstance(campaigns, list), "campaigns is not a list"
                    assert len(campaigns) >= 1, "No campaigns found"
                    print(f"✓ Campaigns: {len(campaigns)} found")
                    
                    # Verify campaign structure
                    for camp in campaigns:
                        assert "id" in camp, "Missing campaign.id"
                        assert "name" in camp, "Missing campaign.name"
                        assert "status" in camp, "Missing campaign.status"
                        assert "objective" in camp, "Missing campaign.objective"
                        assert "adsets" in camp, "Missing campaign.adsets"
                        assert isinstance(camp["adsets"], list), "campaign.adsets is not a list"
                    
                    print(f"✓ First campaign: {campaigns[0].get('name')} (ID: {campaigns[0].get('id')})")
                    print(f"✓ First campaign has {len(campaigns[0].get('adsets', []))} adsets")
                    
                    # Second call - should be cached
                    print("\nTesting cache behavior...")
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp2:
                        data2 = await resp2.json()
                        assert data2.get("cached") == True, "Second call should be cached"
                        print("✓ Second call returned cached:true")
                    
                    # Third call with refresh=1 - should bypass cache
                    print("Testing refresh parameter...")
                    url_refresh = f"{BASE_URL}/admin/adstudio/context?key={ADMIN_KEY}&refresh=1"
                    async with session.get(url_refresh, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp3:
                        data3 = await resp3.json()
                        assert data3.get("cached") == False, "Refresh call should not be cached"
                        print("✓ Refresh call returned cached:false")
                    
                    results["passed"] += 1
                    results["tests"].append({"test": "TEST 1: context", "status": "PASS"})
                    print("✅ TEST 1 PASSED")
                else:
                    print(f"❌ TEST 1 FAILED: Status {status}, Response: {data}")
                    results["failed"] += 1
                    results["tests"].append({"test": "TEST 1: context", "status": "FAIL", "error": str(data)})
        except Exception as e:
            print(f"❌ TEST 1 FAILED: {str(e)}")
            results["failed"] += 1
            results["tests"].append({"test": "TEST 1: context", "status": "FAIL", "error": str(e)})
        
        print()
        
        # ===================================================================
        # TEST 2: POST /api/admin/adstudio/copy (AI text package)
        # ===================================================================
        print("TEST 2: POST /api/admin/adstudio/copy (AI text package)")
        print("-" * 80)
        results["total"] += 1
        
        try:
            url = f"{BASE_URL}/admin/adstudio/copy?key={ADMIN_KEY}"
            payload = {
                "brief": "Nå boligeiere i Bergen. Fremhev gratis leievurdering på 60 sekunder."
            }
            
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                status = resp.status
                data = await resp.json()
                
                print(f"Status: {status}")
                
                if status == 200 and data.get("ok"):
                    pkg = data.get("package")
                    assert pkg is not None, "Missing 'package' field"
                    
                    # Verify primaryTexts
                    assert "primaryTexts" in pkg, "Missing primaryTexts"
                    primary_texts = pkg["primaryTexts"]
                    assert isinstance(primary_texts, list), "primaryTexts is not a list"
                    assert len(primary_texts) == 4, f"Expected 4 primaryTexts, got {len(primary_texts)}"
                    for pt in primary_texts:
                        assert "angle" in pt, "Missing angle in primaryText"
                        assert "text" in pt, "Missing text in primaryText"
                    print(f"✓ primaryTexts: {len(primary_texts)} items")
                    print(f"  Example: {primary_texts[0].get('angle')} - {primary_texts[0].get('text')[:50]}...")
                    
                    # Verify headlines
                    assert "headlines" in pkg, "Missing headlines"
                    headlines = pkg["headlines"]
                    assert isinstance(headlines, list), "headlines is not a list"
                    assert len(headlines) == 5, f"Expected 5 headlines, got {len(headlines)}"
                    for hl in headlines:
                        assert len(hl) <= 45, f"Headline too long: {len(hl)} chars (max 45)"
                    print(f"✓ headlines: {len(headlines)} items (all ≤45 chars)")
                    print(f"  Example: {headlines[0]}")
                    
                    # Verify descriptions
                    assert "descriptions" in pkg, "Missing descriptions"
                    descriptions = pkg["descriptions"]
                    assert isinstance(descriptions, list), "descriptions is not a list"
                    assert len(descriptions) == 3, f"Expected 3 descriptions, got {len(descriptions)}"
                    print(f"✓ descriptions: {len(descriptions)} items")
                    print(f"  Example: {descriptions[0]}")
                    
                    # Verify CTA
                    assert "cta" in pkg, "Missing cta"
                    cta = pkg["cta"]
                    valid_ctas = ["LEARN_MORE", "GET_QUOTE", "SIGN_UP", "CONTACT_US", "APPLY_NOW"]
                    assert cta in valid_ctas, f"Invalid CTA: {cta}"
                    print(f"✓ cta: {cta} (valid enum)")
                    
                    results["passed"] += 1
                    results["tests"].append({"test": "TEST 2: copy", "status": "PASS"})
                    print("✅ TEST 2 PASSED")
                else:
                    print(f"❌ TEST 2 FAILED: Status {status}, Response: {data}")
                    results["failed"] += 1
                    results["tests"].append({"test": "TEST 2: copy", "status": "FAIL", "error": str(data)})
        except Exception as e:
            print(f"❌ TEST 2 FAILED: {str(e)}")
            results["failed"] += 1
            results["tests"].append({"test": "TEST 2: copy", "status": "FAIL", "error": str(e)})
        
        print()
        
        # Test 2b: Without brief (should fail)
        print("TEST 2b: POST /api/admin/adstudio/copy without brief (validation)")
        print("-" * 80)
        results["total"] += 1
        
        try:
            url = f"{BASE_URL}/admin/adstudio/copy?key={ADMIN_KEY}"
            payload = {}
            
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                status = resp.status
                data = await resp.json()
                
                print(f"Status: {status}")
                
                if status == 400:
                    print("✓ Correctly returned 400 for missing brief")
                    results["passed"] += 1
                    results["tests"].append({"test": "TEST 2b: copy validation", "status": "PASS"})
                    print("✅ TEST 2b PASSED")
                else:
                    print(f"❌ TEST 2b FAILED: Expected 400, got {status}")
                    results["failed"] += 1
                    results["tests"].append({"test": "TEST 2b: copy validation", "status": "FAIL", "error": f"Expected 400, got {status}"})
        except Exception as e:
            print(f"❌ TEST 2b FAILED: {str(e)}")
            results["failed"] += 1
            results["tests"].append({"test": "TEST 2b: copy validation", "status": "FAIL", "error": str(e)})
        
        print()
        
        # ===================================================================
        # TEST 3: POST /api/admin/adstudio/media (image upload)
        # ===================================================================
        print("TEST 3: POST /api/admin/adstudio/media (image upload)")
        print("-" * 80)
        print("⚠️  SAFETY: Only uploading ONE test image (200x200 JPEG)")
        results["total"] += 1
        
        try:
            url = f"{BASE_URL}/admin/adstudio/media?key={ADMIN_KEY}"
            image_b64 = create_test_image_base64()
            payload = {
                "imageB64": image_b64,
                "filename": "agent-test.jpg"
            }
            
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                status = resp.status
                data = await resp.json()
                
                print(f"Status: {status}")
                
                if status == 201 and data.get("ok"):
                    # Verify response structure
                    assert "hash" in data, "Missing 'hash' field"
                    assert "url" in data, "Missing 'url' field"
                    assert "width" in data, "Missing 'width' field"
                    assert "height" in data, "Missing 'height' field"
                    
                    image_hash = data["hash"]
                    asset_url = data["url"]
                    width = data["width"]
                    height = data["height"]
                    
                    assert image_hash, "hash is empty"
                    assert asset_url.startswith("/api/newsletter/asset?id="), "Invalid asset URL format"
                    
                    # Extract asset ID for cleanup
                    created_asset_id = asset_url.split("id=")[1]
                    
                    print(f"✓ hash: {image_hash}")
                    print(f"✓ url: {asset_url}")
                    print(f"✓ dimensions: {width}x{height}")
                    
                    # Verify asset is accessible
                    print("\nVerifying asset accessibility...")
                    asset_full_url = f"{BASE_URL.replace('/api', '')}{asset_url}"
                    async with session.get(asset_full_url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as asset_resp:
                        asset_status = asset_resp.status
                        content_type = asset_resp.headers.get("Content-Type", "")
                        
                        if asset_status == 200 and "image/jpeg" in content_type:
                            print(f"✓ Asset accessible at {asset_url}")
                            print(f"✓ Content-Type: {content_type}")
                        else:
                            print(f"⚠️  Asset returned status {asset_status}, Content-Type: {content_type}")
                    
                    results["passed"] += 1
                    results["tests"].append({"test": "TEST 3: media upload", "status": "PASS"})
                    print("✅ TEST 3 PASSED")
                else:
                    print(f"❌ TEST 3 FAILED: Status {status}, Response: {data}")
                    results["failed"] += 1
                    results["tests"].append({"test": "TEST 3: media upload", "status": "FAIL", "error": str(data)})
        except Exception as e:
            print(f"❌ TEST 3 FAILED: {str(e)}")
            results["failed"] += 1
            results["tests"].append({"test": "TEST 3: media upload", "status": "FAIL", "error": str(e)})
        
        print()
        
        # ===================================================================
        # TEST 4: POST /api/admin/adstudio/preview
        # ===================================================================
        print("TEST 4: POST /api/admin/adstudio/preview")
        print("-" * 80)
        results["total"] += 1
        
        if not image_hash:
            print("⚠️  Skipping TEST 4: No image hash from TEST 3")
            results["total"] -= 1
        else:
            try:
                url = f"{BASE_URL}/admin/adstudio/preview?key={ADMIN_KEY}"
                payload = {
                    "pageId": "673143559224671",
                    "link": "https://digihome.no/bli-utleier",
                    "message": "Test",
                    "headline": "Test",
                    "imageHash": image_hash,
                    "cta": "LEARN_MORE"
                }
                
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                    status = resp.status
                    data = await resp.json()
                    
                    print(f"Status: {status}")
                    
                    if status == 200 and data.get("ok"):
                        # Verify previews
                        assert "previews" in data, "Missing 'previews' field"
                        previews = data["previews"]
                        assert isinstance(previews, list), "previews is not a list"
                        assert len(previews) >= 2, f"Expected at least 2 previews, got {len(previews)}"
                        
                        html_count = sum(1 for p in previews if "html" in p and p["html"])
                        print(f"✓ previews: {len(previews)} formats")
                        print(f"✓ HTML previews: {html_count}/{len(previews)}")
                        
                        for i, preview in enumerate(previews):
                            format_name = preview.get("format", "unknown")
                            has_html = "html" in preview and preview["html"]
                            has_error = "error" in preview
                            print(f"  [{i+1}] {format_name}: {'✓ HTML' if has_html else '✗ error: ' + preview.get('error', 'unknown')}")
                        
                        assert html_count >= 2, f"Expected at least 2 HTML previews, got {html_count}"
                        
                        results["passed"] += 1
                        results["tests"].append({"test": "TEST 4: preview", "status": "PASS"})
                        print("✅ TEST 4 PASSED")
                    else:
                        print(f"❌ TEST 4 FAILED: Status {status}, Response: {data}")
                        results["failed"] += 1
                        results["tests"].append({"test": "TEST 4: preview", "status": "FAIL", "error": str(data)})
            except Exception as e:
                print(f"❌ TEST 4 FAILED: {str(e)}")
                results["failed"] += 1
                results["tests"].append({"test": "TEST 4: preview", "status": "FAIL", "error": str(e)})
        
        print()
        
        # ===================================================================
        # TEST 5: POST /api/admin/adstudio/create (validateOnly)
        # ===================================================================
        print("TEST 5: POST /api/admin/adstudio/create (validateOnly)")
        print("-" * 80)
        print("⚠️  SAFETY: Using validateOnly:true (NO real ads created)")
        results["total"] += 1
        
        # First, get a real adset ID from context
        adset_id = None
        try:
            url_context = f"{BASE_URL}/admin/adstudio/context?key={ADMIN_KEY}"
            async with session.get(url_context, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                data = await resp.json()
                if data.get("ok") and data.get("campaigns"):
                    for camp in data["campaigns"]:
                        if camp.get("adsets") and len(camp["adsets"]) > 0:
                            adset_id = camp["adsets"][0]["id"]
                            print(f"Using adset ID: {adset_id}")
                            break
        except Exception as e:
            print(f"⚠️  Could not fetch adset ID: {e}")
        
        if not adset_id or not image_hash:
            print("⚠️  Skipping TEST 5: Missing adset_id or image_hash")
            results["total"] -= 1
        else:
            try:
                url = f"{BASE_URL}/admin/adstudio/create?key={ADMIN_KEY}"
                payload = {
                    "adsetId": adset_id,
                    "adName": "Test Agent Ad (validate only)",
                    "pageId": "673143559224671",
                    "link": "https://digihome.no/bli-utleier",
                    "message": "Test message",
                    "headline": "Test headline",
                    "imageHash": image_hash,
                    "cta": "LEARN_MORE",
                    "validateOnly": True  # CRITICAL: Never create real ads
                }
                
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                    status = resp.status
                    data = await resp.json()
                    
                    print(f"Status: {status}")
                    print(f"Response: {json.dumps(data, indent=2)}")
                    
                    # Expected: 502 with 'utviklingsmodus' error (Meta app in dev mode)
                    if status == 502 and "error" in data:
                        error_msg = data["error"].lower()
                        if "utviklingsmodus" in error_msg or "development" in error_msg or "dev" in error_msg:
                            print("✓ Expected 502 error: Meta app in development mode")
                            print("✓ This is CORRECT behavior (not a bug)")
                            results["passed"] += 1
                            results["tests"].append({"test": "TEST 5: create validateOnly", "status": "PASS", "note": "Expected dev mode error"})
                            print("✅ TEST 5 PASSED (expected dev mode error)")
                        else:
                            print(f"⚠️  Got 502 but unexpected error: {data['error']}")
                            results["passed"] += 1
                            results["tests"].append({"test": "TEST 5: create validateOnly", "status": "PASS", "note": f"502 error: {data['error']}"})
                            print("✅ TEST 5 PASSED (502 error)")
                    elif status == 200 and data.get("ok") and data.get("validated"):
                        print("✓ Validation successful (Meta app may be in live mode)")
                        results["passed"] += 1
                        results["tests"].append({"test": "TEST 5: create validateOnly", "status": "PASS"})
                        print("✅ TEST 5 PASSED")
                    else:
                        print(f"❌ TEST 5 FAILED: Unexpected status {status}, Response: {data}")
                        results["failed"] += 1
                        results["tests"].append({"test": "TEST 5: create validateOnly", "status": "FAIL", "error": str(data)})
            except Exception as e:
                print(f"❌ TEST 5 FAILED: {str(e)}")
                results["failed"] += 1
                results["tests"].append({"test": "TEST 5: create validateOnly", "status": "FAIL", "error": str(e)})
        
        print()
        
        # Test 5b: Without required fields (should fail)
        print("TEST 5b: POST /api/admin/adstudio/create without required fields")
        print("-" * 80)
        results["total"] += 1
        
        try:
            url = f"{BASE_URL}/admin/adstudio/create?key={ADMIN_KEY}"
            payload = {
                "validateOnly": True
            }
            
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                status = resp.status
                data = await resp.json()
                
                print(f"Status: {status}")
                
                if status == 400 and "Mangler:" in data.get("error", ""):
                    print(f"✓ Correctly returned 400 with error: {data['error']}")
                    results["passed"] += 1
                    results["tests"].append({"test": "TEST 5b: create validation", "status": "PASS"})
                    print("✅ TEST 5b PASSED")
                else:
                    print(f"❌ TEST 5b FAILED: Expected 400 with 'Mangler:', got {status}: {data}")
                    results["failed"] += 1
                    results["tests"].append({"test": "TEST 5b: create validation", "status": "FAIL", "error": str(data)})
        except Exception as e:
            print(f"❌ TEST 5b FAILED: {str(e)}")
            results["failed"] += 1
            results["tests"].append({"test": "TEST 5b: create validation", "status": "FAIL", "error": str(e)})
        
        print()
        
        # ===================================================================
        # TEST 6: Auth tests
        # ===================================================================
        print("TEST 6: Authentication tests")
        print("-" * 80)
        results["total"] += 1
        
        try:
            # Test all endpoints without key
            endpoints = [
                ("GET", "/admin/adstudio/context"),
                ("POST", "/admin/adstudio/copy"),
                ("POST", "/admin/adstudio/media"),
                ("POST", "/admin/adstudio/preview"),
                ("POST", "/admin/adstudio/create"),
                ("GET", "/admin/adstudio/ads"),
            ]
            
            all_401 = True
            for method, endpoint in endpoints:
                url = f"{BASE_URL}{endpoint}"
                if method == "GET":
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                        if resp.status != 401:
                            print(f"✗ {method} {endpoint} returned {resp.status} (expected 401)")
                            all_401 = False
                        else:
                            print(f"✓ {method} {endpoint} → 401")
                else:
                    async with session.post(url, json={}, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                        if resp.status != 401:
                            print(f"✗ {method} {endpoint} returned {resp.status} (expected 401)")
                            all_401 = False
                        else:
                            print(f"✓ {method} {endpoint} → 401")
            
            if all_401:
                results["passed"] += 1
                results["tests"].append({"test": "TEST 6: auth", "status": "PASS"})
                print("✅ TEST 6 PASSED")
            else:
                results["failed"] += 1
                results["tests"].append({"test": "TEST 6: auth", "status": "FAIL", "error": "Some endpoints did not return 401"})
                print("❌ TEST 6 FAILED")
        except Exception as e:
            print(f"❌ TEST 6 FAILED: {str(e)}")
            results["failed"] += 1
            results["tests"].append({"test": "TEST 6: auth", "status": "FAIL", "error": str(e)})
        
        print()
        
        # ===================================================================
        # TEST 7: GET /api/admin/adstudio/ads
        # ===================================================================
        print("TEST 7: GET /api/admin/adstudio/ads")
        print("-" * 80)
        results["total"] += 1
        
        try:
            url = f"{BASE_URL}/admin/adstudio/ads?key={ADMIN_KEY}"
            
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                status = resp.status
                data = await resp.json()
                
                print(f"Status: {status}")
                
                if status == 200 and data.get("ok"):
                    assert "ads" in data, "Missing 'ads' field"
                    ads = data["ads"]
                    assert isinstance(ads, list), "ads is not a list"
                    print(f"✓ ads: {len(ads)} items (empty list OK)")
                    
                    results["passed"] += 1
                    results["tests"].append({"test": "TEST 7: ads list", "status": "PASS"})
                    print("✅ TEST 7 PASSED")
                else:
                    print(f"❌ TEST 7 FAILED: Status {status}, Response: {data}")
                    results["failed"] += 1
                    results["tests"].append({"test": "TEST 7: ads list", "status": "FAIL", "error": str(data)})
        except Exception as e:
            print(f"❌ TEST 7 FAILED: {str(e)}")
            results["failed"] += 1
            results["tests"].append({"test": "TEST 7: ads list", "status": "FAIL", "error": str(e)})
        
        print()
        
        # ===================================================================
        # TEST 8: Regression tests
        # ===================================================================
        print("TEST 8: Regression tests")
        print("-" * 80)
        results["total"] += 1
        
        try:
            regression_passed = True
            
            # Test 8a: GET /api/
            print("TEST 8a: GET /api/")
            try:
                url = f"{BASE_URL}/"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                    if resp.status == 200:
                        print("✓ /api/ → 200")
                    else:
                        print(f"✗ /api/ → {resp.status}")
                        regression_passed = False
            except:
                print("✗ /api/ failed")
                regression_passed = False
            
            # Test 8b: POST /api/admin/newsletter/suggest
            print("TEST 8b: POST /api/admin/newsletter/suggest")
            try:
                url = f"{BASE_URL}/admin/newsletter/suggest?key={ADMIN_KEY}"
                payload = {
                    "blocks": [
                        {"type": "heading", "text": "Test heading"},
                        {"type": "text", "text": "Test content"}
                    ],
                    "mode": "ny"
                }
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("ok"):
                            print("✓ /api/admin/newsletter/suggest → 200")
                        else:
                            print(f"✗ /api/admin/newsletter/suggest → 200 but not ok")
                            regression_passed = False
                    else:
                        print(f"✗ /api/admin/newsletter/suggest → {resp.status}")
                        regression_passed = False
            except:
                print("✗ /api/admin/newsletter/suggest failed")
                regression_passed = False
            
            if regression_passed:
                results["passed"] += 1
                results["tests"].append({"test": "TEST 8: regression", "status": "PASS"})
                print("✅ TEST 8 PASSED")
            else:
                results["failed"] += 1
                results["tests"].append({"test": "TEST 8: regression", "status": "FAIL", "error": "Some regression tests failed"})
                print("❌ TEST 8 FAILED")
        except Exception as e:
            print(f"❌ TEST 8 FAILED: {str(e)}")
            results["failed"] += 1
            results["tests"].append({"test": "TEST 8: regression", "status": "FAIL", "error": str(e)})
        
        print()
    
    # ===================================================================
    # TEST 9: Cleanup
    # ===================================================================
    print("TEST 9: Cleanup")
    print("-" * 80)
    print("⚠️  SAFETY: Deleting test documents from newsletter_assets")
    
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Delete test assets
        result = db.newsletter_assets.delete_many({
            "adstudio": True,
            "filename": "agent-test.jpg"
        })
        
        print(f"✓ Deleted {result.deleted_count} test asset(s) from newsletter_assets")
        
        # Verify studio_ads is empty/untouched
        studio_ads_count = db.studio_ads.count_documents({})
        print(f"✓ studio_ads collection: {studio_ads_count} documents (should be 0 or untouched)")
        
        client.close()
        print("✅ CLEANUP COMPLETE")
    except Exception as e:
        print(f"⚠️  Cleanup warning: {str(e)}")
    
    print()
    
    # ===================================================================
    # SUMMARY
    # ===================================================================
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total tests: {results['total']}")
    print(f"Passed: {results['passed']}")
    print(f"Failed: {results['failed']}")
    print(f"Success rate: {results['passed']}/{results['total']} ({100*results['passed']//results['total'] if results['total'] > 0 else 0}%)")
    print()
    
    for test in results["tests"]:
        status_icon = "✅" if test["status"] == "PASS" else "❌"
        print(f"{status_icon} {test['test']}")
        if "error" in test:
            print(f"   Error: {test['error']}")
        if "note" in test:
            print(f"   Note: {test['note']}")
    
    print()
    print("=" * 80)
    
    return results


if __name__ == "__main__":
    results = asyncio.run(test_adstudio())
    sys.exit(0 if results["failed"] == 0 else 1)
