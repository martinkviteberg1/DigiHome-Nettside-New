#!/usr/bin/env python3
"""
Test A/B validation for Annonsestudio v2
"""

import requests
import json

BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Get context to find adsetId
print("Getting context to find adsetId...")
resp = requests.get(
    f"{BASE_URL}/admin/adstudio/context",
    params={"key": ADMIN_KEY},
    timeout=30
)

if resp.status_code == 200:
    data = resp.json()
    print(f"Context OK: {data.get('ok')}")
    
    # Find first adset from campaigns
    adset_id = None
    if 'campaigns' in data:
        for campaign in data['campaigns']:
            if 'adsets' in campaign and len(campaign['adsets']) > 0:
                adset_id = campaign['adsets'][0]['id']
                print(f"Found adsetId: {adset_id}")
                break
    
    if not adset_id:
        print("ERROR: No adsets found in context")
        exit(1)
    
    # Use a test image hash (we'll use a placeholder)
    image_hash = "c0e7237f70d8c2c3b7bfb3f50b35d1d8"
    
    # Test 1: validateOnly with all fields (expect 502 with 'utviklingsmodus')
    print("\n=== TEST 1: POST /create with validateOnly:true ===")
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
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
    
    if resp.status_code == 502:
        if 'utviklingsmodus' in resp.text.lower() or 'development' in resp.text.lower() or 'dev mode' in resp.text.lower():
            print("✅ PASS: Returns 502 with 'utviklingsmodus' (Meta app in dev mode - expected)")
        else:
            print("⚠️ PARTIAL: Returns 502 but error message unclear")
    else:
        print(f"⚠️ INFO: Expected 502 with 'utviklingsmodus', got {resp.status_code}")
    
    # Test 2: Without imageHash (expect 400 with 'Mangler:')
    print("\n=== TEST 2: POST /create without imageHash ===")
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
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:300]}")
    
    if resp.status_code == 400:
        if 'mangler' in resp.text.lower():
            print("✅ PASS: Returns 400 with 'Mangler:' message")
        else:
            print("⚠️ PARTIAL: Returns 400 but message unclear")
    else:
        print(f"❌ FAIL: Expected 400, got {resp.status_code}")

else:
    print(f"ERROR: Failed to get context: {resp.status_code}")
    print(resp.text[:200])
