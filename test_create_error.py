#!/usr/bin/env python3
import requests
import json

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Get adsetId
resp = requests.get(f"{BASE_URL}/admin/adstudio/context", params={"key": ADMIN_KEY}, timeout=30)
data = resp.json()
adset_id = data['campaigns'][0]['adsets'][0]['id']

# Try create with validateOnly
print("Testing POST /create with validateOnly:true...")
try:
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
            "imageHash": "c0e7237f70d8c2c3b7bfb3f50b35d1d8",
            "cta": "LEARN_MORE",
            "variants": [
                {"message": "Variant A", "angle": "a"},
                {"message": "Variant B", "angle": "b"}
            ]
        },
        timeout=60
    )
    print(f"Status: {resp.status_code}")
    print(f"Headers: {dict(resp.headers)}")
    
    # Try to parse as JSON first
    try:
        data = resp.json()
        print(f"JSON Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
    except:
        print(f"Text Response (first 1000 chars): {resp.text[:1000]}")
        
        # Check if it's the expected error
        if 'utviklingsmodus' in resp.text.lower():
            print("\n✅ FOUND 'utviklingsmodus' in response")
        elif 'development' in resp.text.lower():
            print("\n✅ FOUND 'development' in response")
        elif 'dev mode' in resp.text.lower():
            print("\n✅ FOUND 'dev mode' in response")
        else:
            print("\n⚠️ Expected error message not found")
            
except Exception as e:
    print(f"Exception: {e}")
