#!/usr/bin/env python3
"""
Backend test for DigiHome marketing site - Finn preview + address + leads endpoints
Tests new backend endpoints and improvements as per review request.
"""

import requests
import re
import time
from urllib.parse import urlencode, quote

# Base URL from .env
BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"

def test_finn_preview():
    """Test A: GET /api/finn-preview endpoint"""
    print("\n" + "="*80)
    print("TEST A: GET /api/finn-preview - Finn.no ad scraping")
    print("="*80)
    
    # A1: Invalid / non-finn URL
    print("\n[A1] Testing invalid URL (non-finn.no)...")
    try:
        url = f"{BASE_URL}/finn-preview?url=https://www.vg.no"
        response = requests.get(url, timeout=10)
        print(f"✓ Status: {response.status_code}")
        data = response.json()
        print(f"✓ Response: {data}")
        
        if response.status_code == 400 and data.get('ok') == False and 'gyldig finn.no' in data.get('error', '').lower():
            print("✅ A1 PASSED: Invalid URL correctly rejected with 400 and Norwegian error message")
        else:
            print(f"❌ A1 FAILED: Expected 400 with 'gyldig finn.no' error, got {response.status_code}: {data}")
    except Exception as e:
        print(f"❌ A1 FAILED with exception: {e}")
    
    # A2: Missing url param
    print("\n[A2] Testing missing url parameter...")
    try:
        url = f"{BASE_URL}/finn-preview"
        response = requests.get(url, timeout=10)
        print(f"✓ Status: {response.status_code}")
        data = response.json()
        print(f"✓ Response: {data}")
        
        if response.status_code == 400:
            print("✅ A2 PASSED: Missing url param correctly returns 400")
        else:
            print(f"❌ A2 FAILED: Expected 400, got {response.status_code}")
    except Exception as e:
        print(f"❌ A2 FAILED with exception: {e}")
    
    # A3: Fetch fresh finnkode and test valid lettings ad
    print("\n[A3] Fetching fresh finnkode from Finn.no lettings search...")
    fresh_finnkode = None
    try:
        # Fetch Finn.no lettings search page with browser User-Agent
        search_url = "https://www.finn.no/realestate/lettings/search.html"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        search_response = requests.get(search_url, headers=headers, timeout=15)
        print(f"✓ Finn.no search page status: {search_response.status_code}")
        
        if search_response.status_code == 200:
            # Extract first finnkode (8-10 digits)
            matches = re.findall(r'finnkode[=/](\d{8,10})', search_response.text)
            if matches:
                fresh_finnkode = matches[0]
                print(f"✓ Found fresh finnkode: {fresh_finnkode}")
            else:
                print("⚠ No finnkode found in search results, trying alternative pattern...")
                # Try alternative pattern
                matches = re.findall(r'/ad\.html\?finnkode=(\d{8,10})', search_response.text)
                if matches:
                    fresh_finnkode = matches[0]
                    print(f"✓ Found fresh finnkode (alternative): {fresh_finnkode}")
                else:
                    print("❌ Could not extract finnkode from search page")
        else:
            print(f"❌ Failed to fetch Finn.no search page: {search_response.status_code}")
    except Exception as e:
        print(f"❌ Failed to fetch fresh finnkode: {e}")
    
    if fresh_finnkode:
        print(f"\n[A3] Testing valid lettings ad with fresh finnkode: {fresh_finnkode}...")
        try:
            finn_ad_url = f"https://www.finn.no/realestate/lettings/ad.html?finnkode={fresh_finnkode}"
            encoded_url = quote(finn_ad_url, safe='')
            url = f"{BASE_URL}/finn-preview?url={encoded_url}"
            
            print(f"✓ Testing URL: {finn_ad_url}")
            response = requests.get(url, timeout=15)
            print(f"✓ Status: {response.status_code}")
            data = response.json()
            
            print(f"✓ Response keys: {list(data.keys())}")
            print(f"  - ok: {data.get('ok')}")
            print(f"  - title: {data.get('title', '')[:80]}...")
            print(f"  - image: {data.get('image', '')[:80]}...")
            print(f"  - kind: {data.get('kind')}")
            print(f"  - propertyType: {data.get('propertyType')}")
            print(f"  - bedrooms: {data.get('bedrooms')}")
            print(f"  - sqm: {data.get('sqm')}")
            
            if response.status_code == 200 and data.get('ok') == True:
                has_title = bool(data.get('title'))
                has_image = data.get('image', '').startswith('https://')
                is_leie = data.get('kind') == 'leie'
                has_property_data = bool(data.get('sqm') or data.get('bedrooms'))
                
                if has_title and has_image and is_leie and has_property_data:
                    print(f"✅ A3 PASSED: Valid lettings ad returns 200 with complete data")
                    print(f"   - Title: {data.get('title')}")
                    print(f"   - Kind: {data.get('kind')}")
                    print(f"   - Sqm: {data.get('sqm')}, Bedrooms: {data.get('bedrooms')}")
                else:
                    print(f"❌ A3 FAILED: Missing expected fields - title:{has_title}, image:{has_image}, kind:{is_leie}, data:{has_property_data}")
            else:
                print(f"❌ A3 FAILED: Expected 200 with ok:true, got {response.status_code}: {data}")
        except Exception as e:
            print(f"❌ A3 FAILED with exception: {e}")
        
        # A5: Test caching - repeat same request
        print("\n[A5] Testing cache - repeating same request...")
        try:
            start_time = time.time()
            response2 = requests.get(url, timeout=10)
            elapsed = time.time() - start_time
            print(f"✓ Status: {response2.status_code}")
            print(f"✓ Response time: {elapsed:.3f}s")
            data2 = response2.json()
            
            if response2.status_code == 200 and data2.get('ok') == True:
                if elapsed < 1.0:  # Cached response should be fast
                    print(f"✅ A5 PASSED: Cached response returned quickly ({elapsed:.3f}s)")
                else:
                    print(f"⚠ A5 WARNING: Response was slow ({elapsed:.3f}s), might not be cached")
            else:
                print(f"❌ A5 FAILED: Expected 200, got {response2.status_code}")
        except Exception as e:
            print(f"❌ A5 FAILED with exception: {e}")
    else:
        print("⚠ A3 & A5 SKIPPED: Could not fetch fresh finnkode")
    
    # A4: Optional - test homes (salg) ad
    print("\n[A4] Optional: Testing homes (salg) ad...")
    print("⚠ A4 SKIPPED: Would require fetching fresh homes finnkode (optional test)")


def test_address_autocomplete():
    """Test B: GET /api/address endpoint"""
    print("\n" + "="*80)
    print("TEST B: GET /api/address - Geonorge autocomplete with cache/retry/timeout")
    print("="*80)
    
    # B1: Query too short
    print("\n[B1] Testing query too short (q=ab)...")
    try:
        url = f"{BASE_URL}/address?q=ab"
        response = requests.get(url, timeout=10)
        print(f"✓ Status: {response.status_code}")
        data = response.json()
        print(f"✓ Response: {data}")
        
        if response.status_code == 200 and data.get('suggestions') == []:
            print("✅ B1 PASSED: Short query returns 200 with empty suggestions")
        else:
            print(f"❌ B1 FAILED: Expected 200 with empty array, got {response.status_code}: {data}")
    except Exception as e:
        print(f"❌ B1 FAILED with exception: {e}")
    
    # B2: Valid query
    print("\n[B2] Testing valid query (q=Strandgaten)...")
    try:
        url = f"{BASE_URL}/address?q=Strandgaten"
        response = requests.get(url, timeout=10)
        print(f"✓ Status: {response.status_code}")
        data = response.json()
        
        suggestions = data.get('suggestions', [])
        print(f"✓ Suggestions count: {len(suggestions)}")
        
        if suggestions:
            print(f"✓ First suggestion: {suggestions[0]}")
            has_text = bool(suggestions[0].get('text'))
            has_sub = 'sub' in suggestions[0]
            has_label = bool(suggestions[0].get('label'))
            
            if response.status_code == 200 and len(suggestions) > 0 and has_text and has_sub and has_label:
                print(f"✅ B2 PASSED: Valid query returns 200 with {len(suggestions)} suggestions, correct shape")
            else:
                print(f"❌ B2 FAILED: Missing expected fields or empty suggestions")
        else:
            print(f"❌ B2 FAILED: Expected non-empty suggestions array")
    except Exception as e:
        print(f"❌ B2 FAILED with exception: {e}")
    
    # B3: Test caching - repeat same query
    print("\n[B3] Testing cache - repeating same query...")
    try:
        start_time = time.time()
        response2 = requests.get(url, timeout=10)
        elapsed = time.time() - start_time
        print(f"✓ Status: {response2.status_code}")
        print(f"✓ Response time: {elapsed:.3f}s")
        data2 = response2.json()
        suggestions2 = data2.get('suggestions', [])
        
        if response2.status_code == 200 and len(suggestions2) > 0:
            if elapsed < 0.5:  # Cached response should be very fast
                print(f"✅ B3 PASSED: Cached response returned quickly ({elapsed:.3f}s)")
            else:
                print(f"⚠ B3 WARNING: Response was slow ({elapsed:.3f}s), might not be cached")
        else:
            print(f"❌ B3 FAILED: Expected 200 with suggestions, got {response2.status_code}")
    except Exception as e:
        print(f"❌ B3 FAILED with exception: {e}")


def test_leads_with_finn_url():
    """Test C: POST /api/leads with finn_url field"""
    print("\n" + "="*80)
    print("TEST C: POST /api/leads WITH finn_url field")
    print("="*80)
    
    print("\n[C] Testing POST /api/leads with finn_url...")
    try:
        url = f"{BASE_URL}/leads"
        payload = {
            "name": "Anna Testersen",
            "email": "anna.test.finn@example.com",
            "phone": "+47 90000001",
            "address": "Testveien 42",
            "postal_code": "5003",
            "property_type": "leilighet",
            "sqm": 74,
            "bedrooms": 4,
            "rental_model": "langtid",
            "lead_type": "huseier",
            "finn_url": "https://www.finn.no/realestate/lettings/ad.html?finnkode=123456789",
            "notes": "Automatisk test av finn_url-felt"
        }
        
        response = requests.post(url, json=payload, timeout=15)
        print(f"✓ Status: {response.status_code}")
        data = response.json()
        
        print(f"✓ Response keys: {list(data.keys())}")
        print(f"  - success: {data.get('success')}")
        print(f"  - ok: {data.get('ok')}")
        print(f"  - data.id: {data.get('data', {}).get('id')}")
        print(f"  - forwarded: {data.get('forwarded')}")
        
        if 'lead' in data:
            lead = data['lead']
            print(f"  - lead.finn_url: {lead.get('finn_url')}")
            print(f"  - lead.name: {lead.get('name')}")
            print(f"  - lead.email: {lead.get('email')}")
        
        if response.status_code == 201 and data.get('success') == True and data.get('ok') == True:
            has_id = bool(data.get('data', {}).get('id'))
            lead_has_finn_url = data.get('lead', {}).get('finn_url') == payload['finn_url']
            
            if has_id and lead_has_finn_url:
                print(f"✅ C PASSED: Lead created with finn_url field")
                print(f"   - ID: {data.get('data', {}).get('id')}")
                print(f"   - finn_url preserved: {lead_has_finn_url}")
                print(f"   - forwarded: {data.get('forwarded')} (on preview env, forwarding to TEST CRM)")
            else:
                print(f"❌ C FAILED: Missing id or finn_url not preserved - has_id:{has_id}, finn_url:{lead_has_finn_url}")
        else:
            print(f"❌ C FAILED: Expected 201 with success:true, got {response.status_code}: {data}")
    except Exception as e:
        print(f"❌ C FAILED with exception: {e}")


def test_regression():
    """Test D: Regression tests"""
    print("\n" + "="*80)
    print("TEST D: Regression tests (must still work)")
    print("="*80)
    
    # D1: GET /api/
    print("\n[D1] Testing GET /api/ (root health check)...")
    try:
        url = f"{BASE_URL}/"
        response = requests.get(url, timeout=10, allow_redirects=True)
        print(f"✓ Status: {response.status_code}")
        data = response.json()
        print(f"✓ Response: {data}")
        
        if response.status_code == 200 and data.get('ok') == True:
            print("✅ D1 PASSED: Root endpoint returns 200 with ok:true")
        else:
            print(f"❌ D1 FAILED: Expected 200 with ok:true, got {response.status_code}: {data}")
    except Exception as e:
        print(f"❌ D1 FAILED with exception: {e}")
    
    # D2: GET /api/lead-target
    print("\n[D2] Testing GET /api/lead-target...")
    try:
        url = f"{BASE_URL}/lead-target"
        response = requests.get(url, timeout=10)
        print(f"✓ Status: {response.status_code}")
        data = response.json()
        print(f"✓ Response: {data}")
        
        has_env = 'env' in data
        has_url = 'url' in data
        has_key_configured = 'keyConfigured' in data
        has_base_url = 'baseUrl' in data
        
        if response.status_code == 200 and has_env and has_url and has_key_configured and has_base_url:
            print(f"✅ D2 PASSED: lead-target returns 200 with all expected fields")
            print(f"   - env: {data.get('env')}")
            print(f"   - url: {data.get('url')}")
        else:
            print(f"❌ D2 FAILED: Missing expected fields or wrong status")
    except Exception as e:
        print(f"❌ D2 FAILED with exception: {e}")
    
    # D3: GET /api/media/digihome-logo-white.svg
    print("\n[D3] Testing GET /api/media/digihome-logo-white.svg...")
    try:
        url = f"{BASE_URL}/media/digihome-logo-white.svg"
        response = requests.get(url, timeout=10)
        print(f"✓ Status: {response.status_code}")
        content_type = response.headers.get('Content-Type', '')
        print(f"✓ Content-Type: {content_type}")
        print(f"✓ Body size: {len(response.content)} bytes")
        
        if response.status_code == 200 and 'image/svg' in content_type:
            print(f"✅ D3 PASSED: Media endpoint returns 200 with correct Content-Type")
        else:
            print(f"❌ D3 FAILED: Expected 200 with image/svg+xml, got {response.status_code}, {content_type}")
    except Exception as e:
        print(f"❌ D3 FAILED with exception: {e}")


def main():
    print("\n" + "="*80)
    print("DIGIHOME BACKEND TEST - Finn Preview + Address + Leads + Regression")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    test_finn_preview()
    test_address_autocomplete()
    test_leads_with_finn_url()
    test_regression()
    
    print("\n" + "="*80)
    print("ALL TESTS COMPLETED")
    print("="*80)


if __name__ == "__main__":
    main()
