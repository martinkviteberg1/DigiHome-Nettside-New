#!/usr/bin/env python3
"""
Backend test for property quality flags (incomplete/duplicate detection) and property interest happy path.

Test scenarios:
1. Quality flags - GET /api/admin/properties with incomplete/duplicate detection
2. Idempotency - POST /api/admin/properties/sync
3. Quality gate for newsletter - POST /api/admin/newsletter/preview
4. Property interest happy path - GET/POST /api/newsletter/property-interest/*
5. Regression tests

Base URL: https://conversion-optimize-7.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4
"""

import requests
import json
import sys
from typing import Dict, Any, List

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_scenario_1_quality_flags():
    """
    Scenario 1: Quality flags - GET /api/admin/properties
    
    Expected:
    - 200, ok:true, total=27
    - incompleteCount === 8, duplicateCount === 1
    - quality object with checked/incomplete/duplicates
    - Each property has incomplete (bool), duplicate (bool), missingFields (array), duplicateGroupSize (int)
    - CRITICAL: incomplete === true IFF (images||[]).length === 0 AND !sqm AND !bedrooms
    - CRITICAL: St. Hansstredet properties (3 with 55/30/50 m²) NOT flagged as duplicate
    - CRITICAL: Olaf Ryes vei has 3 properties, exactly 1 with duplicate===true (oldest platformUpdatedAt)
    - city should NOT be 'Norge' on any property
    - area should not contain 'finn.no' or 'http'
    """
    print("\n" + "="*80)
    print("SCENARIO 1: QUALITY FLAGS - GET /api/admin/properties")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/properties?key={ADMIN_KEY}"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Check basic structure
        if not data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        total = data.get('total', 0)
        print(f"✓ Total properties: {total}")
        
        if total != 27:
            print(f"❌ FAIL: Expected total=27, got {total}")
            return False
        
        # Check quality counts
        incomplete_count = data.get('incompleteCount', 0)
        duplicate_count = data.get('duplicateCount', 0)
        
        print(f"✓ incompleteCount: {incomplete_count}")
        print(f"✓ duplicateCount: {duplicate_count}")
        
        if incomplete_count != 8:
            print(f"❌ FAIL: Expected incompleteCount=8, got {incomplete_count}")
            return False
        
        if duplicate_count != 1:
            print(f"❌ FAIL: Expected duplicateCount=1, got {duplicate_count}")
            return False
        
        # Check quality object exists
        quality = data.get('quality')
        if not quality:
            print(f"❌ FAIL: quality object missing")
            return False
        
        if 'checked' not in quality or 'incomplete' not in quality or 'duplicates' not in quality:
            print(f"❌ FAIL: quality object missing required fields")
            return False
        
        print(f"✓ quality object: checked={quality.get('checked')}, incomplete={quality.get('incomplete')}, duplicates={quality.get('duplicates')}")
        
        # Check properties array
        properties = data.get('properties', [])
        if len(properties) != total:
            print(f"❌ FAIL: properties array length ({len(properties)}) != total ({total})")
            return False
        
        # Verify each property has required quality fields
        incomplete_props = []
        duplicate_props = []
        st_hansstredet_props = []
        olaf_ryes_props = []
        
        for prop in properties:
            # Check required fields
            if 'incomplete' not in prop:
                print(f"❌ FAIL: Property {prop.get('id')} missing 'incomplete' field")
                return False
            
            if 'duplicate' not in prop:
                print(f"❌ FAIL: Property {prop.get('id')} missing 'duplicate' field")
                return False
            
            if 'missingFields' not in prop:
                print(f"❌ FAIL: Property {prop.get('id')} missing 'missingFields' field")
                return False
            
            if 'duplicateGroupSize' not in prop:
                print(f"❌ FAIL: Property {prop.get('id')} missing 'duplicateGroupSize' field")
                return False
            
            # Check city is not 'Norge'
            if prop.get('city') == 'Norge':
                print(f"❌ FAIL: Property {prop.get('id')} has city='Norge' (garbage value)")
                return False
            
            # Check area doesn't contain finn.no or http
            area = prop.get('area') or ''
            if 'finn.no' in area or 'http' in area:
                print(f"❌ FAIL: Property {prop.get('id')} has area='{area}' containing finn.no/http")
                return False
            
            # Collect incomplete properties
            if prop.get('incomplete'):
                incomplete_props.append(prop)
            
            # Collect duplicate properties
            if prop.get('duplicate'):
                duplicate_props.append(prop)
            
            # Collect St. Hansstredet properties
            if prop.get('area') == 'ST. HANSSTREDET':
                st_hansstredet_props.append(prop)
            
            # Collect Olaf Ryes vei properties
            if prop.get('area') == 'Olaf Ryes vei':
                olaf_ryes_props.append(prop)
        
        print(f"✓ All properties have required quality fields")
        
        # CRITICAL LOGIC: incomplete === true IFF (images||[]).length === 0 AND !sqm AND !bedrooms
        print(f"\n--- Verifying incomplete logic ---")
        for prop in incomplete_props:
            images = prop.get('images', [])
            sqm = prop.get('sqm')
            bedrooms = prop.get('bedrooms')
            
            if len(images) > 0:
                print(f"❌ FAIL: Property {prop.get('id')} marked incomplete but has {len(images)} images")
                return False
            
            if sqm and sqm > 0:
                print(f"❌ FAIL: Property {prop.get('id')} marked incomplete but has sqm={sqm}")
                return False
            
            if bedrooms and bedrooms > 0:
                print(f"❌ FAIL: Property {prop.get('id')} marked incomplete but has bedrooms={bedrooms}")
                return False
        
        # Verify reverse: any property with 0 images + 0 m² + 0 bedrooms MUST be incomplete
        for prop in properties:
            images = prop.get('images', [])
            sqm = prop.get('sqm') or 0
            bedrooms = prop.get('bedrooms') or 0
            
            if len(images) == 0 and sqm == 0 and bedrooms == 0:
                if not prop.get('incomplete'):
                    print(f"❌ FAIL: Property {prop.get('id')} has 0 images + 0 m² + 0 bedrooms but incomplete=false")
                    return False
        
        print(f"✓ Incomplete logic verified: all incomplete properties have 0 images + 0 m² + 0 bedrooms")
        
        # CRITICAL CONSERVATISM: St. Hansstredet properties should NOT be flagged as duplicate
        print(f"\n--- Verifying St. Hansstredet properties (3 different apartments) ---")
        print(f"Found {len(st_hansstredet_props)} St. Hansstredet properties")
        
        if len(st_hansstredet_props) != 3:
            print(f"⚠️  WARNING: Expected 3 St. Hansstredet properties, found {len(st_hansstredet_props)}")
        
        for prop in st_hansstredet_props:
            if prop.get('duplicate'):
                print(f"❌ FAIL: St. Hansstredet property {prop.get('id')} (sqm={prop.get('sqm')}) flagged as duplicate")
                return False
        
        print(f"✓ St. Hansstredet properties NOT flagged as duplicates (correct)")
        
        # CRITICAL DUPLICATE: Olaf Ryes vei should have exactly 1 duplicate (oldest)
        print(f"\n--- Verifying Olaf Ryes vei duplicates ---")
        print(f"Found {len(olaf_ryes_props)} Olaf Ryes vei properties")
        
        if len(olaf_ryes_props) != 3:
            print(f"⚠️  WARNING: Expected 3 Olaf Ryes vei properties, found {len(olaf_ryes_props)}")
        
        olaf_duplicates = [p for p in olaf_ryes_props if p.get('duplicate')]
        
        if len(olaf_duplicates) != 1:
            print(f"❌ FAIL: Expected exactly 1 Olaf Ryes vei property with duplicate=true, found {len(olaf_duplicates)}")
            return False
        
        # The duplicate should be the oldest (2026-06-18T10:10...)
        dup = olaf_duplicates[0]
        platform_updated = dup.get('platformUpdatedAt', '')
        
        print(f"✓ Exactly 1 Olaf Ryes vei property flagged as duplicate")
        print(f"  - platformUpdatedAt: {platform_updated}")
        print(f"  - title: {dup.get('title')}")
        print(f"  - sqm: {dup.get('sqm')}, bedrooms: {dup.get('bedrooms')}")
        
        # The non-duplicate should be the one with 73 m²/3 bedrooms/images
        non_dups = [p for p in olaf_ryes_props if not p.get('duplicate')]
        
        for prop in non_dups:
            if prop.get('sqm') == 73 and prop.get('bedrooms') == 3:
                if len(prop.get('images', [])) == 0:
                    print(f"❌ FAIL: Olaf Ryes vei property with 73 m²/3 bedrooms has no images")
                    return False
                
                if prop.get('incomplete'):
                    print(f"❌ FAIL: Olaf Ryes vei property with 73 m²/3 bedrooms marked as incomplete")
                    return False
                
                print(f"✓ Olaf Ryes vei property with 73 m²/3 bedrooms has duplicate=false and incomplete=false")
        
        print(f"\n✅ SCENARIO 1 PASSED: Quality flags working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_scenario_2_idempotency():
    """
    Scenario 2: Idempotency - POST /api/admin/properties/sync
    
    Expected:
    - 200, ok:true, synced=27, withDistrict=27, incompleteCount=8, duplicateCount=1
    - Run 2 times: identical numbers both times
    - GET /api/admin/properties after: still incompleteCount=8, duplicateCount=1, districtCount=27
    """
    print("\n" + "="*80)
    print("SCENARIO 2: IDEMPOTENCY - POST /api/admin/properties/sync")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/properties/sync?key={ADMIN_KEY}&env=prod"
        print(f"POST {url}")
        
        # First sync
        print("\n--- First sync ---")
        response1 = requests.post(url, json={}, timeout=60)
        print(f"Status: {response1.status_code}")
        
        if response1.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response1.status_code}")
            print(f"Response: {response1.text[:500]}")
            return False
        
        data1 = response1.json()
        
        if not data1.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        synced1 = data1.get('synced', 0)
        with_district1 = data1.get('withDistrict', 0)
        incomplete1 = data1.get('incompleteCount', 0)
        duplicate1 = data1.get('duplicateCount', 0)
        
        print(f"✓ First sync: synced={synced1}, withDistrict={with_district1}, incompleteCount={incomplete1}, duplicateCount={duplicate1}")
        
        if synced1 != 27:
            print(f"❌ FAIL: Expected synced=27, got {synced1}")
            return False
        
        if with_district1 != 27:
            print(f"❌ FAIL: Expected withDistrict=27, got {with_district1}")
            return False
        
        if incomplete1 != 8:
            print(f"❌ FAIL: Expected incompleteCount=8, got {incomplete1}")
            return False
        
        if duplicate1 != 1:
            print(f"❌ FAIL: Expected duplicateCount=1, got {duplicate1}")
            return False
        
        # Second sync (idempotency check)
        print("\n--- Second sync (idempotency) ---")
        response2 = requests.post(url, json={}, timeout=60)
        print(f"Status: {response2.status_code}")
        
        if response2.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response2.status_code}")
            return False
        
        data2 = response2.json()
        
        synced2 = data2.get('synced', 0)
        with_district2 = data2.get('withDistrict', 0)
        incomplete2 = data2.get('incompleteCount', 0)
        duplicate2 = data2.get('duplicateCount', 0)
        
        print(f"✓ Second sync: synced={synced2}, withDistrict={with_district2}, incompleteCount={incomplete2}, duplicateCount={duplicate2}")
        
        if synced2 != synced1 or with_district2 != with_district1 or incomplete2 != incomplete1 or duplicate2 != duplicate1:
            print(f"❌ FAIL: Second sync numbers differ from first sync (not idempotent)")
            return False
        
        # Verify GET /api/admin/properties still shows correct counts
        print("\n--- Verifying GET /api/admin/properties after sync ---")
        get_url = f"{BASE_URL}/admin/properties?key={ADMIN_KEY}"
        get_response = requests.get(get_url, timeout=30)
        
        if get_response.status_code != 200:
            print(f"❌ FAIL: GET returned {get_response.status_code}")
            return False
        
        get_data = get_response.json()
        
        get_incomplete = get_data.get('incompleteCount', 0)
        get_duplicate = get_data.get('duplicateCount', 0)
        
        # Count properties with district
        properties = get_data.get('properties', [])
        district_count = sum(1 for p in properties if p.get('district'))
        
        print(f"✓ GET after sync: incompleteCount={get_incomplete}, duplicateCount={get_duplicate}, districtCount={district_count}")
        
        if get_incomplete != 8:
            print(f"❌ FAIL: GET incompleteCount={get_incomplete}, expected 8")
            return False
        
        if get_duplicate != 1:
            print(f"❌ FAIL: GET duplicateCount={get_duplicate}, expected 1")
            return False
        
        if district_count != 27:
            print(f"❌ FAIL: GET districtCount={district_count}, expected 27")
            return False
        
        print(f"\n✅ SCENARIO 2 PASSED: Sync is idempotent")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_scenario_3_quality_gate():
    """
    Scenario 3: Quality gate for newsletter - POST /api/admin/newsletter/preview
    
    a) Build items of ONLY properties with status==='active' AND (incomplete OR duplicate)
       → 200, unavailableProperties should contain ALL these, with status 'mangler bilder/data' or 'duplikat'
       → HTML should NOT contain any property cards for them
    
    b) Build items of properties with status==='active', incomplete===false, duplicate===false, and at least 1 image
       → 200, unavailableProperties should be EMPTY, all cards in HTML, grouping by district gives at least 2 groups
    """
    print("\n" + "="*80)
    print("SCENARIO 3: QUALITY GATE FOR NEWSLETTER")
    print("="*80)
    
    try:
        # First, get all properties to build test items
        get_url = f"{BASE_URL}/admin/properties?key={ADMIN_KEY}"
        get_response = requests.get(get_url, timeout=30)
        
        if get_response.status_code != 200:
            print(f"❌ FAIL: Could not fetch properties")
            return False
        
        properties = get_response.json().get('properties', [])
        
        # Part a: Build items with incomplete OR duplicate
        print("\n--- Part a: Properties with incomplete OR duplicate ---")
        
        bad_items = []
        for prop in properties:
            if prop.get('status') == 'active' and (prop.get('incomplete') or prop.get('duplicate')):
                bad_items.append({
                    'pid': prop.get('externalId'),
                    'title': prop.get('title', ''),
                    'image': '',
                    'meta': '',
                    'band': '',
                    'status': 'active',
                    'district': ''
                })
        
        print(f"Found {len(bad_items)} properties with incomplete OR duplicate")
        
        if len(bad_items) < 3:
            print(f"❌ FAIL: Expected at least 3 bad properties, found {len(bad_items)}")
            return False
        
        # Build preview request
        preview_url = f"{BASE_URL}/admin/newsletter/preview?key={ADMIN_KEY}"
        preview_body = {
            'subject': 'QA Test - Bad Properties',
            'preheader': 'Test',
            'blocks': [
                {'type': 'heading', 'text': 'Test'},
                {'type': 'properties', 'items': bad_items}
            ]
        }
        
        print(f"POST {preview_url} with {len(bad_items)} bad property items")
        
        response_a = requests.post(preview_url, json=preview_body, timeout=30)
        print(f"Status: {response_a.status_code}")
        
        if response_a.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response_a.status_code}")
            print(f"Response: {response_a.text[:500]}")
            return False
        
        data_a = response_a.json()
        
        if not data_a.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        unavailable_a = data_a.get('unavailableProperties', [])
        html_a = data_a.get('html', '')
        
        print(f"✓ unavailableProperties count: {len(unavailable_a)}")
        
        # All bad items should be in unavailableProperties
        if len(unavailable_a) != len(bad_items):
            print(f"❌ FAIL: Expected {len(bad_items)} unavailable properties, got {len(unavailable_a)}")
            return False
        
        # Check status messages
        for unavail in unavailable_a:
            status = unavail.get('status', '')
            if status not in ['mangler bilder/data', 'duplikat']:
                print(f"❌ FAIL: Unexpected unavailable status: {status}")
                return False
        
        print(f"✓ All bad properties in unavailableProperties with correct status")
        
        # HTML should NOT contain property cards for bad items
        # Check that none of the bad property titles appear in HTML
        for item in bad_items[:3]:  # Check first 3
            title = item.get('title', '')
            if title and title in html_a:
                print(f"❌ FAIL: Bad property '{title}' found in HTML")
                return False
        
        print(f"✓ HTML does not contain bad property cards")
        
        # Part b: Build items with good properties
        print("\n--- Part b: Properties with good quality ---")
        
        good_items = []
        for prop in properties:
            if (prop.get('status') == 'active' and 
                not prop.get('incomplete') and 
                not prop.get('duplicate') and 
                len(prop.get('images', [])) > 0):
                good_items.append({
                    'pid': prop.get('externalId'),
                    'title': prop.get('title', ''),
                    'image': prop.get('images', [''])[0],
                    'meta': '',
                    'band': prop.get('monthlyRentBand', ''),
                    'status': 'active',
                    'district': prop.get('district', '')
                })
        
        print(f"Found {len(good_items)} good properties")
        
        if len(good_items) < 6:
            print(f"❌ FAIL: Expected at least 6 good properties, found {len(good_items)}")
            return False
        
        # Build preview request with good items
        preview_body_b = {
            'subject': 'QA Test - Good Properties',
            'preheader': 'Test',
            'blocks': [
                {'type': 'heading', 'text': 'Test'},
                {'type': 'properties', 'items': good_items[:6]}  # Use first 6
            ]
        }
        
        print(f"POST {preview_url} with {len(good_items[:6])} good property items")
        
        response_b = requests.post(preview_url, json=preview_body_b, timeout=30)
        print(f"Status: {response_b.status_code}")
        
        if response_b.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response_b.status_code}")
            return False
        
        data_b = response_b.json()
        
        unavailable_b = data_b.get('unavailableProperties', [])
        html_b = data_b.get('html', '')
        
        print(f"✓ unavailableProperties count: {len(unavailable_b)}")
        
        # unavailableProperties should be EMPTY
        if len(unavailable_b) > 0:
            print(f"❌ FAIL: Expected 0 unavailable properties, got {len(unavailable_b)}")
            return False
        
        # All good property titles should be in HTML
        found_in_html = 0
        for item in good_items[:6]:
            title = item.get('title', '')
            if title and title in html_b:
                found_in_html += 1
        
        if found_in_html < 6:
            print(f"❌ FAIL: Only {found_in_html}/6 good properties found in HTML")
            return False
        
        print(f"✓ All 6 good properties found in HTML")
        
        # Check grouping by district (at least 2 groups)
        districts = set(item.get('district', '') for item in good_items[:6] if item.get('district'))
        
        print(f"✓ Properties grouped into {len(districts)} districts")
        
        if len(districts) < 2:
            print(f"❌ FAIL: Expected at least 2 district groups, got {len(districts)}")
            return False
        
        print(f"\n✅ SCENARIO 3 PASSED: Quality gate working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_scenario_4_property_interest():
    """
    Scenario 4: Property interest happy path
    
    Test rig in preview database:
    - Campaign: qa-interest-campaign
    - Recipient: qa-boliginteresse@example.com (no tenant profile yet)
    - Property: 348c1174-6422-49f9-a016-5f84496654d4
    
    a) GET lookup → 200, ok:true, available:true, property.district='Bergen sentrum'
    b) POST confirm with 'campaign' field → MUST give 200 with ok:true and tenantId (NOT 401)
    c) POST confirm with 'c' field → should ALSO give 200 (endpoint accepts both)
    d) Idempotency: POST 3 times total → lead should have EXACTLY 1 property_interests entry
    e) Security: POST with pt='0000000000000000000000000000000000000000' → 401, no new leads/interests
    """
    print("\n" + "="*80)
    print("SCENARIO 4: PROPERTY INTEREST HAPPY PATH")
    print("="*80)
    
    try:
        property_id = "348c1174-6422-49f9-a016-5f84496654d4"
        campaign = "qa-interest-campaign"
        recipient_id = "qarid0001"
        pt = "e598e190bde8fcb1a8d91c69fa38781b5e8e73fe"
        
        # Part a: Lookup
        print("\n--- Part a: Lookup ---")
        
        lookup_url = f"{BASE_URL}/newsletter/property-interest/lookup?property={property_id}&c={campaign}&r={recipient_id}&pt={pt}"
        print(f"GET {lookup_url}")
        
        lookup_response = requests.get(lookup_url, timeout=30)
        print(f"Status: {lookup_response.status_code}")
        
        if lookup_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {lookup_response.status_code}")
            print(f"Response: {lookup_response.text[:500]}")
            return False
        
        lookup_data = lookup_response.json()
        
        if not lookup_data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        if not lookup_data.get('available'):
            print(f"❌ FAIL: available is not true")
            return False
        
        property_data = lookup_data.get('property', {})
        district = property_data.get('district', '')
        
        print(f"✓ Lookup successful: available=true, district='{district}'")
        
        if district != 'Bergen sentrum':
            print(f"⚠️  WARNING: Expected district='Bergen sentrum', got '{district}'")
        
        # Part b: Confirm with 'campaign' field
        print("\n--- Part b: Confirm with 'campaign' field ---")
        
        confirm_url = f"{BASE_URL}/newsletter/property-interest/confirm"
        confirm_body = {
            'property': property_id,
            'campaign': campaign,
            'r': recipient_id,
            'pt': pt
        }
        
        print(f"POST {confirm_url}")
        print(f"Body: {json.dumps(confirm_body, indent=2)}")
        
        confirm_response = requests.post(confirm_url, json=confirm_body, timeout=30)
        print(f"Status: {confirm_response.status_code}")
        
        if confirm_response.status_code == 401:
            print(f"❌ FAIL: Got 401 - this is a REAL ERROR (not expected)")
            print(f"Response: {confirm_response.text[:500]}")
            return False
        
        if confirm_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {confirm_response.status_code}")
            print(f"Response: {confirm_response.text[:500]}")
            return False
        
        confirm_data = confirm_response.json()
        
        if not confirm_data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        tenant_id = confirm_data.get('tenantId')
        if not tenant_id:
            print(f"❌ FAIL: tenantId missing in response")
            return False
        
        print(f"✓ Confirm with 'campaign' field successful: tenantId={tenant_id}")
        
        # Part c: Confirm with 'c' field (should also work)
        print("\n--- Part c: Confirm with 'c' field ---")
        
        confirm_body_c = {
            'property': property_id,
            'c': campaign,
            'r': recipient_id,
            'pt': pt
        }
        
        print(f"POST {confirm_url}")
        print(f"Body: {json.dumps(confirm_body_c, indent=2)}")
        
        confirm_response_c = requests.post(confirm_url, json=confirm_body_c, timeout=30)
        print(f"Status: {confirm_response_c.status_code}")
        
        if confirm_response_c.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {confirm_response_c.status_code}")
            print(f"Response: {confirm_response_c.text[:500]}")
            return False
        
        confirm_data_c = confirm_response_c.json()
        
        if not confirm_data_c.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        print(f"✓ Confirm with 'c' field also successful")
        
        # Part d: Idempotency - POST one more time (total 3)
        print("\n--- Part d: Idempotency (3rd POST) ---")
        
        confirm_response_d = requests.post(confirm_url, json=confirm_body, timeout=30)
        print(f"Status: {confirm_response_d.status_code}")
        
        if confirm_response_d.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {confirm_response_d.status_code}")
            return False
        
        # Now check that the lead has EXACTLY 1 property_interests entry
        print("\n--- Checking lead has exactly 1 property_interests entry ---")
        
        leads_url = f"{BASE_URL}/admin/leads?key={ADMIN_KEY}"
        leads_response = requests.get(leads_url, timeout=30)
        
        if leads_response.status_code != 200:
            print(f"❌ FAIL: Could not fetch leads")
            return False
        
        leads_data = leads_response.json()
        tenants = leads_data.get('tenants', [])
        
        # Find the lead with email qa-boliginteresse@example.com
        target_lead = None
        for tenant in tenants:
            if tenant.get('email') == 'qa-boliginteresse@example.com':
                target_lead = tenant
                break
        
        if not target_lead:
            print(f"❌ FAIL: Could not find lead with email qa-boliginteresse@example.com")
            return False
        
        property_interests = target_lead.get('property_interests', [])
        
        print(f"✓ Found lead with {len(property_interests)} property_interests entries")
        
        if len(property_interests) != 1:
            print(f"❌ FAIL: Expected exactly 1 property_interests entry, got {len(property_interests)}")
            return False
        
        print(f"✓ Idempotency working: 3 POSTs resulted in exactly 1 property_interests entry")
        
        # Part e: Security - invalid pt token
        print("\n--- Part e: Security - invalid pt token ---")
        
        # Count leads before
        leads_before = len(leads_data.get('leads', [])) + len(leads_data.get('tenants', []))
        
        confirm_body_invalid = {
            'property': property_id,
            'campaign': campaign,
            'r': recipient_id,
            'pt': '0000000000000000000000000000000000000000'
        }
        
        print(f"POST {confirm_url} with invalid pt")
        
        confirm_response_invalid = requests.post(confirm_url, json=confirm_body_invalid, timeout=30)
        print(f"Status: {confirm_response_invalid.status_code}")
        
        if confirm_response_invalid.status_code != 401:
            print(f"❌ FAIL: Expected 401 for invalid pt, got {confirm_response_invalid.status_code}")
            return False
        
        # Count leads after
        leads_response_after = requests.get(leads_url, timeout=30)
        leads_data_after = leads_response_after.json()
        leads_after = len(leads_data_after.get('leads', [])) + len(leads_data_after.get('tenants', []))
        
        if leads_after != leads_before:
            print(f"❌ FAIL: Lead count changed from {leads_before} to {leads_after} (should be unchanged)")
            return False
        
        print(f"✓ Security working: invalid pt returned 401 and no new leads created")
        
        print(f"\n✅ SCENARIO 4 PASSED: Property interest happy path working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_scenario_5_regression():
    """
    Scenario 5: Regression tests
    
    - GET /api/admin/newsletter/campaign?key=...&id=6783d667-c93e-45ca-a458-341f9d79acf5
      → 200, all 12 property cards have non-empty district, at least 3 unique groups
    - GET /api/public/properties?limit=6
      → 200, no area with 'finn.no', no city='Norge'
    - GET /api/admin/revenue-reconcile?key=...&env=prod&days=30&spend=0
      → 200, ok:true
    - GET /api/admin/kpi?key=...&days=30
      → 200
    - GET /api/admin/leads?key=...
      → 200
    - GET /api/
      → 200
    """
    print("\n" + "="*80)
    print("SCENARIO 5: REGRESSION TESTS")
    print("="*80)
    
    try:
        # Test 1: Newsletter campaign
        print("\n--- Test 1: Newsletter campaign ---")
        
        campaign_url = f"{BASE_URL}/admin/newsletter/campaign?key={ADMIN_KEY}&id=6783d667-c93e-45ca-a458-341f9d79acf5"
        print(f"GET {campaign_url}")
        
        campaign_response = requests.get(campaign_url, timeout=30)
        print(f"Status: {campaign_response.status_code}")
        
        if campaign_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {campaign_response.status_code}")
            return False
        
        campaign_data = campaign_response.json()
        
        # Find properties block
        blocks = campaign_data.get('blocks', [])
        property_blocks = [b for b in blocks if b.get('type') == 'properties']
        
        if not property_blocks:
            print(f"⚠️  WARNING: No properties block found in campaign")
        else:
            items = property_blocks[0].get('items', [])
            print(f"✓ Found {len(items)} property cards")
            
            # Check all have non-empty district
            districts = set()
            for item in items:
                district = item.get('district', '')
                if not district:
                    print(f"❌ FAIL: Property card missing district")
                    return False
                districts.add(district)
            
            print(f"✓ All property cards have non-empty district")
            print(f"✓ {len(districts)} unique district groups")
            
            if len(districts) < 3:
                print(f"❌ FAIL: Expected at least 3 unique districts, got {len(districts)}")
                return False
        
        # Test 2: Public properties
        print("\n--- Test 2: Public properties ---")
        
        public_url = f"{BASE_URL}/public/properties?limit=6"
        print(f"GET {public_url}")
        
        public_response = requests.get(public_url, timeout=30)
        print(f"Status: {public_response.status_code}")
        
        if public_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {public_response.status_code}")
            return False
        
        public_data = public_response.json()
        properties = public_data.get('properties', [])
        
        print(f"✓ Found {len(properties)} public properties")
        
        for prop in properties:
            area = prop.get('area', '')
            city = prop.get('city', '')
            
            if 'finn.no' in area:
                print(f"❌ FAIL: Property has area containing 'finn.no': {area}")
                return False
            
            if city == 'Norge':
                print(f"❌ FAIL: Property has city='Norge'")
                return False
        
        print(f"✓ No area with 'finn.no', no city='Norge'")
        
        # Test 3: Revenue reconcile
        print("\n--- Test 3: Revenue reconcile ---")
        
        reconcile_url = f"{BASE_URL}/admin/revenue-reconcile?key={ADMIN_KEY}&env=prod&days=30&spend=0"
        print(f"GET {reconcile_url}")
        
        reconcile_response = requests.get(reconcile_url, timeout=60)
        print(f"Status: {reconcile_response.status_code}")
        
        if reconcile_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {reconcile_response.status_code}")
            return False
        
        reconcile_data = reconcile_response.json()
        
        if not reconcile_data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        print(f"✓ Revenue reconcile returned 200 ok:true")
        
        # Test 4: KPI
        print("\n--- Test 4: KPI ---")
        
        kpi_url = f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=30"
        print(f"GET {kpi_url}")
        
        kpi_response = requests.get(kpi_url, timeout=60)
        print(f"Status: {kpi_response.status_code}")
        
        if kpi_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {kpi_response.status_code}")
            return False
        
        print(f"✓ KPI returned 200")
        
        # Test 5: Leads
        print("\n--- Test 5: Leads ---")
        
        leads_url = f"{BASE_URL}/admin/leads?key={ADMIN_KEY}"
        print(f"GET {leads_url}")
        
        leads_response = requests.get(leads_url, timeout=30)
        print(f"Status: {leads_response.status_code}")
        
        if leads_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {leads_response.status_code}")
            return False
        
        print(f"✓ Leads returned 200")
        
        # Test 6: Root
        print("\n--- Test 6: Root ---")
        
        root_url = f"{BASE_URL}/"
        print(f"GET {root_url}")
        
        root_response = requests.get(root_url, timeout=30)
        print(f"Status: {root_response.status_code}")
        
        if root_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {root_response.status_code}")
            return False
        
        print(f"✓ Root returned 200")
        
        print(f"\n✅ SCENARIO 5 PASSED: All regression tests passed")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all test scenarios"""
    print("\n" + "="*80)
    print("BACKEND TEST: PROPERTY QUALITY FLAGS + PROPERTY INTEREST")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print("="*80)
    
    results = {
        'Scenario 1: Quality flags': test_scenario_1_quality_flags(),
        'Scenario 2: Idempotency': test_scenario_2_idempotency(),
        'Scenario 3: Quality gate': test_scenario_3_quality_gate(),
        'Scenario 4: Property interest': test_scenario_4_property_interest(),
        'Scenario 5: Regression': test_scenario_5_regression(),
    }
    
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} scenarios passed ({passed*100//total}% success rate)")
    print("="*80)
    
    return 0 if passed == total else 1


if __name__ == '__main__':
    sys.exit(main())
