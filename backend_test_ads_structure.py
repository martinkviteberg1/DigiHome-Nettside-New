#!/usr/bin/env python3
"""
Focused test to check ads table structure
"""

import requests
import json

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60

print("Testing GET /api/admin/ads/table structure")
response = requests.get(
    f"{BASE_URL}/admin/ads/table",
    params={"key": ADMIN_KEY, "googlePeriod": "last_30d", "metaPeriod": "last_30d"},
    timeout=TIMEOUT
)

print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    ads = data.get('ads', [])
    
    print(f"\nTotal ads: {len(ads)}")
    
    if ads:
        # Show first 3 ads structure
        print("\nFirst 3 ads structure:")
        for i, ad in enumerate(ads[:3]):
            print(f"\nAd {i+1}:")
            print(json.dumps(ad, indent=2))
        
        # Check for platform field
        platforms = set(ad.get('platform', 'NO_PLATFORM') for ad in ads)
        print(f"\nUnique platforms: {platforms}")
        
        # Check for Google-specific fields
        google_ads = [a for a in ads if 'campaignId' in a or 'adGroupId' in a]
        print(f"\nAds with campaignId or adGroupId: {len(google_ads)}")
        if google_ads:
            print("Sample Google ad:")
            print(json.dumps(google_ads[0], indent=2))
        
        # Check for Meta-specific fields
        meta_ads = [a for a in ads if 'link' in a]
        print(f"\nAds with link field: {len(meta_ads)}")
        if meta_ads:
            print("Sample Meta ad:")
            print(json.dumps(meta_ads[0], indent=2))
    else:
        print("No ads in response")
else:
    print(f"Request failed: {response.status_code}")
    print(response.text[:500])
