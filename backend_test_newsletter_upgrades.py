#!/usr/bin/env python3
"""
Backend test for DigiHome Newsletter Upgrades (Batch 2)
Tests 4 new features + 1 regression test:
1. AI subject/preheader suggestions (POST /api/admin/newsletter/suggest)
2. Extended campaign stats (GET /api/admin/newsletter/campaign with new fields)
3. One-click unsubscribe (POST /api/newsletter/unsubscribe validation)
4. Focal point rendering (POST /api/admin/newsletter/preview with focalX/focalY)
5. Regression: WebP upload (POST /api/admin/newsletter/upload)
"""

import requests
import sys
import json
import io
from PIL import Image

# Configuration
BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60  # Allow up to 60s for LLM calls

def test_ai_suggestions():
    """TEST 1: AI subject/preheader suggestions (NEW)"""
    print("\n" + "="*80)
    print("TEST 1: AI SUBJECT/PREHEADER SUGGESTIONS (NEW)")
    print("="*80)
    
    url = f"{BASE_URL}/admin/newsletter/suggest?key={ADMIN_KEY}"
    
    # Test 1a: mode='ny' with valid blocks
    print("\nTest 1a: POST /api/admin/newsletter/suggest with mode='ny' and valid blocks...")
    try:
        payload = {
            "blocks": [
                {"type": "heading", "text": "Sommertilbud på utleie"},
                {"type": "text", "text": "Vi gir 10 prosent rabatt på forvaltningshonorar ut juli. Bergen har rekordhøy etterspørsel etter leieboliger akkurat nå. Registrer deg innen 10. juli."}
            ],
            "mode": "ny"
        }
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
            
            if data.get('ok') and 'suggestions' in data:
                suggestions = data['suggestions']
                print(f"✅ Got {len(suggestions)} suggestions")
                
                if len(suggestions) >= 1 and len(suggestions) <= 3:
                    print(f"✅ Suggestions count is valid (1-3): {len(suggestions)}")
                else:
                    print(f"❌ Suggestions count out of range: {len(suggestions)}")
                
                # Verify structure
                for i, sug in enumerate(suggestions):
                    if 'subject' in sug and 'preheader' in sug:
                        print(f"✅ Suggestion {i+1} has required fields")
                        print(f"   Subject: {sug['subject'][:60]}...")
                        print(f"   Preheader: {sug['preheader'][:60]}...")
                        
                        # Check if Norwegian text
                        if any(c in sug['subject'] + sug['preheader'] for c in 'æøåÆØÅ'):
                            print(f"✅ Suggestion {i+1} contains Norwegian characters")
                    else:
                        print(f"❌ Suggestion {i+1} missing required fields")
            else:
                print(f"❌ Response missing 'ok' or 'suggestions': {data}")
        else:
            print(f"❌ Expected 200, got {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Test 1a failed: {e}")
    
    # Test 1b: mode='forbedre' with currentSubject
    print("\nTest 1b: POST with mode='forbedre' and currentSubject...")
    try:
        payload = {
            "blocks": [
                {"type": "heading", "text": "Sommertilbud på utleie"},
                {"type": "text", "text": "Vi gir 10 prosent rabatt på forvaltningshonorar ut juli."}
            ],
            "mode": "forbedre",
            "currentSubject": "Nyhetsbrev fra DigiHome"
        }
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok') and 'suggestions' in data:
                print(f"✅ Got {len(data['suggestions'])} suggestions for mode='forbedre'")
            else:
                print(f"❌ Response missing 'ok' or 'suggestions': {data}")
        else:
            print(f"❌ Expected 200, got {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Test 1b failed: {e}")
    
    # Test 1c: Negative - empty blocks
    print("\nTest 1c: POST with empty blocks (should return 400)...")
    try:
        payload = {"blocks": [], "mode": "ny"}
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            if 'error' in data and 'innhold' in data['error'].lower():
                print(f"✅ Got 400 with Norwegian error about missing content: {data['error']}")
            else:
                print(f"⚠️ Got 400 but error message unexpected: {data}")
        else:
            print(f"❌ Expected 400, got {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Test 1c failed: {e}")
    
    # Test 1d: Auth - without key
    print("\nTest 1d: POST without key (should return 401)...")
    try:
        url_no_key = f"{BASE_URL}/admin/newsletter/suggest"
        payload = {"blocks": [{"type": "text", "text": "test"}], "mode": "ny"}
        response = requests.post(url_no_key, json=payload, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print(f"✅ Got 401 without key (authentication working)")
        else:
            print(f"❌ Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"❌ Test 1d failed: {e}")


def test_extended_campaign_stats():
    """TEST 2: Extended campaign stats (NEW fields)"""
    print("\n" + "="*80)
    print("TEST 2: EXTENDED CAMPAIGN STATS (NEW FIELDS)")
    print("="*80)
    
    # First, get list of campaigns to find a sent one
    print("\nTest 2a: GET /api/admin/newsletter to find a sent campaign...")
    try:
        url = f"{BASE_URL}/admin/newsletter?key={ADMIN_KEY}"
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            campaigns = data.get('campaigns', [])
            print(f"Found {len(campaigns)} campaigns")
            
            # Find a sent campaign
            sent_campaign = None
            for c in campaigns:
                if c.get('status') == 'sent':
                    sent_campaign = c
                    break
            
            if sent_campaign:
                campaign_id = sent_campaign.get('id')
                print(f"✅ Found sent campaign: {campaign_id}")
                
                # Test 2b: Get campaign details with extended stats
                print(f"\nTest 2b: GET /api/admin/newsletter/campaign?id={campaign_id}&key=...")
                url_campaign = f"{BASE_URL}/admin/newsletter/campaign?id={campaign_id}&key={ADMIN_KEY}"
                response = requests.get(url_campaign, timeout=TIMEOUT)
                print(f"Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    stats = data.get('stats', {})
                    
                    # Check for ALL new fields
                    required_fields = [
                        'hourly', 'devices', 'clients', 'segments', 'unsubs', 'ctor',
                        'medianMinutesToOpen', 'bestHour', 'recipientDetails',
                        # Existing fields
                        'opens', 'opensUnique', 'clicks', 'clicksUnique', 'openRate',
                        'clickRate', 'clicksByUrl', 'timeline'
                    ]
                    
                    print(f"\nVerifying stats fields...")
                    missing_fields = []
                    for field in required_fields:
                        if field in stats:
                            value = stats[field]
                            value_type = type(value).__name__
                            
                            # Check types
                            if field in ['hourly', 'devices', 'clients', 'segments', 'recipientDetails', 'timeline']:
                                if isinstance(value, list):
                                    print(f"✅ stats.{field} is array (length: {len(value)})")
                                else:
                                    print(f"❌ stats.{field} should be array, got {value_type}")
                            elif field in ['unsubs', 'opens', 'opensUnique', 'clicks', 'clicksUnique']:
                                if isinstance(value, (int, float)):
                                    print(f"✅ stats.{field} is number: {value}")
                                else:
                                    print(f"❌ stats.{field} should be number, got {value_type}")
                            elif field in ['ctor', 'medianMinutesToOpen', 'openRate', 'clickRate']:
                                if value is None or isinstance(value, (int, float)):
                                    print(f"✅ stats.{field} is number or null: {value}")
                                else:
                                    print(f"❌ stats.{field} should be number or null, got {value_type}")
                            elif field in ['bestHour']:
                                if value is None or isinstance(value, str):
                                    print(f"✅ stats.{field} is string or null: {value}")
                                else:
                                    print(f"❌ stats.{field} should be string or null, got {value_type}")
                            elif field == 'clicksByUrl':
                                if isinstance(value, dict):
                                    print(f"✅ stats.{field} is object")
                                else:
                                    print(f"❌ stats.{field} should be object, got {value_type}")
                        else:
                            missing_fields.append(field)
                            print(f"❌ stats.{field} is MISSING")
                    
                    if not missing_fields:
                        print(f"\n✅ ALL required stats fields present")
                    else:
                        print(f"\n❌ Missing fields: {missing_fields}")
                    
                    # Check recipientDetails structure if non-empty
                    if stats.get('recipientDetails') and len(stats['recipientDetails']) > 0:
                        rd = stats['recipientDetails'][0]
                        if 'openedAt' in rd and 'clicksN' in rd:
                            print(f"✅ recipientDetails entries have openedAt and clicksN keys")
                        else:
                            print(f"❌ recipientDetails entries missing required keys: {rd.keys()}")
                else:
                    print(f"❌ Expected 200, got {response.status_code}: {response.text[:200]}")
            else:
                print(f"⚠️ No sent campaigns found (this is OK if no campaigns have been sent yet)")
        else:
            print(f"❌ Expected 200, got {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Test 2 failed: {e}")


def test_one_click_unsubscribe():
    """TEST 3: One-click unsubscribe endpoint (NEW POST handler) - VALIDATION ONLY"""
    print("\n" + "="*80)
    print("TEST 3: ONE-CLICK UNSUBSCRIBE ENDPOINT (NEW POST HANDLER) - VALIDATION ONLY")
    print("="*80)
    
    # Test 3a: POST with invalid token (should return 400)
    print("\nTest 3a: POST /api/newsletter/unsubscribe with invalid token (should return 400)...")
    try:
        url = f"{BASE_URL}/newsletter/unsubscribe?e=aW52YWxpZA&t=invalidtoken"
        response = requests.post(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            if data.get('ok') == False:
                print(f"✅ Got 400 with ok:false for invalid token")
            else:
                print(f"⚠️ Got 400 but response unexpected: {data}")
        else:
            print(f"❌ Expected 400, got {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Test 3a failed: {e}")
    
    # Test 3b: GET with invalid token (should return 302 redirect with error)
    print("\nTest 3b: GET /api/newsletter/unsubscribe with invalid token (should return 302 redirect)...")
    try:
        url = f"{BASE_URL}/newsletter/unsubscribe?e=aW52YWxpZA&t=invalidtoken"
        response = requests.get(url, timeout=TIMEOUT, allow_redirects=False)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 302:
            location = response.headers.get('Location', '')
            print(f"Location header: {location}")
            
            if '/nyhetsbrev/avmeldt' in location and 'feil=1' in location:
                print(f"✅ Got 302 redirect to /nyhetsbrev/avmeldt?feil=1")
            else:
                print(f"❌ Redirect location unexpected: {location}")
        else:
            print(f"❌ Expected 302, got {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Test 3b failed: {e}")
    
    print("\n⚠️ NOTE: Did NOT test with valid tokens (would unsubscribe real users)")


def test_focal_point_rendering():
    """TEST 4: Focal point rendering (NEW)"""
    print("\n" + "="*80)
    print("TEST 4: FOCAL POINT RENDERING (NEW)")
    print("="*80)
    
    url = f"{BASE_URL}/admin/newsletter/preview?key={ADMIN_KEY}"
    
    # Test 4a: Image with focalX=20, focalY=80
    print("\nTest 4a: POST /api/admin/newsletter/preview with focalX=20, focalY=80...")
    try:
        payload = {
            "subject": "t",
            "blocks": [
                {
                    "type": "image",
                    "url": "/x.jpg",
                    "height": 220,
                    "fit": "cover",
                    "focalX": 20,
                    "focalY": 80
                }
            ]
        }
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            html = data.get('html', '')
            
            if 'object-position:20% 80%' in html:
                print(f"✅ HTML contains 'object-position:20% 80%'")
            else:
                print(f"❌ HTML does not contain expected object-position")
                # Show what we got
                if 'object-position' in html:
                    import re
                    matches = re.findall(r'object-position:[^;]+', html)
                    print(f"   Found: {matches}")
        else:
            print(f"❌ Expected 200, got {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Test 4a failed: {e}")
    
    # Test 4b: Image with focalX=150, focalY=-10 (should clamp to 100% and 0%)
    print("\nTest 4b: POST with focalX=150, focalY=-10 (should clamp to 100% and 0%)...")
    try:
        payload = {
            "subject": "t",
            "blocks": [
                {
                    "type": "image",
                    "url": "/x.jpg",
                    "height": 220,
                    "fit": "cover",
                    "focalX": 150,
                    "focalY": -10
                }
            ]
        }
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            html = data.get('html', '')
            
            if 'object-position:100% 0%' in html:
                print(f"✅ HTML contains 'object-position:100% 0%' (clamped correctly)")
            else:
                print(f"❌ HTML does not contain expected clamped object-position")
                if 'object-position' in html:
                    import re
                    matches = re.findall(r'object-position:[^;]+', html)
                    print(f"   Found: {matches}")
        else:
            print(f"❌ Expected 200, got {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Test 4b failed: {e}")
    
    # Test 4c: Image WITHOUT height (should NOT contain object-position)
    print("\nTest 4c: POST with image WITHOUT height (should NOT contain object-position)...")
    try:
        payload = {
            "subject": "t",
            "blocks": [
                {
                    "type": "image",
                    "url": "/x.jpg",
                    "focalX": 20,
                    "focalY": 80
                }
            ]
        }
        response = requests.post(url, json=payload, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            html = data.get('html', '')
            
            # Find the image tag
            import re
            img_match = re.search(r'<img[^>]+src="[^"]*x\.jpg"[^>]*>', html)
            if img_match:
                img_tag = img_match.group(0)
                if 'object-position' not in img_tag:
                    print(f"✅ Image tag does NOT contain object-position (correct)")
                else:
                    print(f"❌ Image tag contains object-position when it shouldn't")
                    print(f"   Tag: {img_tag[:200]}")
            else:
                print(f"⚠️ Could not find image tag in HTML")
        else:
            print(f"❌ Expected 200, got {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Test 4c failed: {e}")


def test_webp_upload_regression():
    """TEST 5: Regression - WebP upload"""
    print("\n" + "="*80)
    print("TEST 5: REGRESSION - WEBP UPLOAD")
    print("="*80)
    
    # Test 5a: Generate a small PNG and upload
    print("\nTest 5a: Generate small PNG and POST /api/admin/newsletter/upload...")
    try:
        # Create a small test image (10x10 PNG)
        img = Image.new('RGB', (10, 10), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        url = f"{BASE_URL}/admin/newsletter/upload?key={ADMIN_KEY}"
        files = {'file': ('test.png', img_bytes, 'image/png')}
        response = requests.post(url, files=files, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            if data.get('ok') and 'id' in data and 'url' in data:
                asset_id = data['id']
                print(f"✅ Upload successful, got id: {asset_id}")
                
                # Test 5b: GET the asset and verify it's WebP
                print(f"\nTest 5b: GET /api/newsletter/asset?id={asset_id} (should be WebP)...")
                asset_url = f"{BASE_URL}/newsletter/asset?id={asset_id}"
                response = requests.get(asset_url, timeout=TIMEOUT)
                print(f"Status: {response.status_code}")
                
                if response.status_code == 200:
                    content_type = response.headers.get('Content-Type', '')
                    print(f"Content-Type: {content_type}")
                    
                    if content_type == 'image/webp':
                        print(f"✅ Content-Type is image/webp (WebP conversion working)")
                        
                        # Verify WebP magic bytes
                        content = response.content
                        if content[:4] == b'RIFF' and content[8:12] == b'WEBP':
                            print(f"✅ WebP magic bytes verified (RIFF....WEBP)")
                        else:
                            print(f"❌ WebP magic bytes not found")
                    else:
                        print(f"❌ Expected Content-Type: image/webp, got: {content_type}")
                else:
                    print(f"❌ Expected 200, got {response.status_code}")
                
                # Cleanup: Delete the test asset
                print(f"\nCleanup: Deleting test asset {asset_id}...")
                try:
                    # Connect to MongoDB and delete
                    from pymongo import MongoClient
                    import os
                    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
                    db_name = os.getenv('DB_NAME', 'your_database_name')
                    client = MongoClient(mongo_url)
                    db = client[db_name]
                    result = db.newsletter_assets.delete_one({'id': asset_id})
                    if result.deleted_count > 0:
                        print(f"✅ Deleted test asset from newsletter_assets collection")
                    else:
                        print(f"⚠️ Asset not found in collection (may have been deleted already)")
                except Exception as e:
                    print(f"⚠️ Could not delete test asset: {e}")
            else:
                print(f"❌ Response missing required fields: {data}")
        else:
            print(f"❌ Expected 201, got {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Test 5a failed: {e}")
    
    # Test 5c: Regression - GET /api/ (root endpoint)
    print("\nTest 5c: GET /api/ (regression test)...")
    try:
        url = f"{BASE_URL}/"
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                print(f"✅ Root endpoint working")
            else:
                print(f"⚠️ Root endpoint returned 200 but ok is not true: {data}")
        else:
            print(f"❌ Expected 200, got {response.status_code}")
    except Exception as e:
        print(f"❌ Test 5c failed: {e}")
    
    # Test 5d: Regression - GET /api/public/properties
    print("\nTest 5d: GET /api/public/properties (regression test)...")
    try:
        url = f"{BASE_URL}/public/properties"
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                print(f"✅ Public properties endpoint working")
            else:
                print(f"⚠️ Public properties returned 200 but ok is not true: {data}")
        else:
            print(f"❌ Expected 200, got {response.status_code}")
    except Exception as e:
        print(f"❌ Test 5d failed: {e}")


def main():
    print("="*80)
    print("DIGIHOME NEWSLETTER UPGRADES - BACKEND TESTS (BATCH 2)")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print("="*80)
    
    # Run all tests
    test_ai_suggestions()
    test_extended_campaign_stats()
    test_one_click_unsubscribe()
    test_focal_point_rendering()
    test_webp_upload_regression()
    
    print("\n" + "="*80)
    print("ALL TESTS COMPLETED")
    print("="*80)


if __name__ == "__main__":
    main()
