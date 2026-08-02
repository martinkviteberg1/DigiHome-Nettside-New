#!/usr/bin/env python3
"""
Backend test for FEATURE: kanonisk enhetseksport koblet på (speiling av «Enheter»-visningen) 
+ plattformens finnUrl + publicUrl på boliginteresse

Base URL: https://conversion-optimize-7.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4

Test scenarios:
1. POST /admin/properties/sync?env=prod (env in query) → verify synced=22, unitsMatched=22, etc. Run twice for idempotency.
2. GET /admin/properties → verify total=22, all with hasUnitData=true, 22 with publicUrl, 10 with finnUrl (finnSource='plattform')
3. ⚠️ MOST IMPORTANT — PII-STRIPPING: GET /newsletter/property-interest/lookup → verify NO PII fields
4. Property with finnStatus='utgatt' → finnUrl should be null in lookup
5. PUBLIC FEED: verify NO PII in /api/public/properties
6. MANUAL FINN WINS: test manual FINN override and fallback
7. NEWSLETTER PORTAL: test preview with Wernersholmvegen and Baglergaten
8. REGRESSION: verify existing endpoints still work

CRITICAL SAFETY RULES:
- DO NOT POST /admin/newsletter/send or /newsletter/test (SendGrid is LIVE)
- DO NOT POST /newsletter/property-interest/confirm with valid token
- DO NOT POST /admin/finance/sync-contracts or /sync-customers
- DO NOT delete properties, leads or campaigns
- MANDATORY CLEANUP: restore all visibility and FINN connections
"""

import requests
import json
import sys

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# PII fields that MUST NOT appear in public/lookup endpoints
PII_BLACKLIST = [
    'ownerName', 'tenantName', 'tenantActiveFrom', 'fullAddress', 'street', 
    'houseNumber', 'floor', 'rooms', 'rentAmount', 'rentIsEstimate', 
    'buildingId', 'buildingLabel', 'unitStatus', 'listingStatus', 'postalCode', 
    'hasUnitData', 'missingFields', 'incomplete', 'enrichedFields', 
    'districtSource', 'unit', 'enrich'
]

# Additional PII fields for public feed
PUBLIC_FEED_BLACKLIST = PII_BLACKLIST + [
    'finnUrl', 'publicUrl', 'finnStatus', 'finnSource'
]

def test_scenario_1_sync_with_unit_export():
    """
    Scenario 1: POST /admin/properties/sync?env=prod (env in QUERY, not body)
    Expected: ok:true, synced=22, unitsMatched=22, unitsTotal=22, unitsError=null, 
              withDistrict=22, incompleteCount=5, duplicateCount=0
    Run twice to verify idempotency (upserted=0 second time)
    """
    print("\n" + "="*80)
    print("SCENARIO 1: SYNC WITH UNIT EXPORT (IDEMPOTENCY)")
    print("="*80)
    
    try:
        # First sync
        print("\n[1.1] First sync: POST /admin/properties/sync?env=prod")
        url = f"{BASE_URL}/admin/properties/sync?env=prod&key={ADMIN_KEY}"
        response = requests.post(url, json={}, timeout=60)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify first sync
        checks = [
            ('ok', True),
            ('synced', 22),
            ('unitsMatched', 22),
            ('unitsTotal', 22),
            ('unitsError', None),
            ('withDistrict', 22),
            ('incompleteCount', 5),
            ('duplicateCount', 0)
        ]
        
        first_sync_pass = True
        for field, expected in checks:
            actual = data.get(field)
            if actual != expected:
                print(f"❌ FAIL: {field} expected {expected}, got {actual}")
                first_sync_pass = False
            else:
                print(f"✅ {field}={actual}")
        
        if not first_sync_pass:
            return False
        
        # Second sync (idempotency check)
        print("\n[1.2] Second sync (idempotency): POST /admin/properties/sync?env=prod")
        response2 = requests.post(url, json={}, timeout=60)
        print(f"Status: {response2.status_code}")
        
        if response2.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response2.status_code}")
            return False
        
        data2 = response2.json()
        print(f"Response: {json.dumps(data2, indent=2)}")
        
        # Verify idempotency (same counts, upserted=0)
        idempotent_checks = [
            ('synced', 22),
            ('unitsMatched', 22),
            ('unitsTotal', 22),
            ('withDistrict', 22),
            ('incompleteCount', 5),
            ('duplicateCount', 0)
        ]
        
        second_sync_pass = True
        for field, expected in idempotent_checks:
            actual = data2.get(field)
            if actual != expected:
                print(f"❌ FAIL: {field} expected {expected}, got {actual}")
                second_sync_pass = False
            else:
                print(f"✅ {field}={actual} (idempotent)")
        
        # Check upserted=0 (no new inserts)
        upserted = data2.get('upserted', -1)
        if upserted != 0:
            print(f"❌ FAIL: upserted expected 0 (idempotent), got {upserted}")
            second_sync_pass = False
        else:
            print(f"✅ upserted=0 (idempotent)")
        
        if not second_sync_pass:
            return False
        
        print("\n✅ SCENARIO 1 PASSED: Sync working correctly with idempotency")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception in scenario 1: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_scenario_2_admin_fields():
    """
    Scenario 2: GET /admin/properties
    Expected: total=22, all with hasUnitData=true, 22 with publicUrl starting with 
              https://app.digihome.no/utleie/, 10 with finnUrl where finnSource='plattform'
    Verify Wernersholmvegen has 12 images; Baglergaten has incomplete=true, 0 images, sqm=0, finnUrl=null
    """
    print("\n" + "="*80)
    print("SCENARIO 2: ADMIN FIELDS VERIFICATION")
    print("="*80)
    
    try:
        print("\n[2.1] GET /admin/properties")
        url = f"{BASE_URL}/admin/properties?key={ADMIN_KEY}"
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        properties = data.get('properties', [])
        total = data.get('total', 0)
        
        print(f"Total properties: {total}")
        
        # Check total=22
        if total != 22:
            print(f"❌ FAIL: Expected total=22, got {total}")
            return False
        print(f"✅ total=22")
        
        # Check all have hasUnitData=true
        without_unit_data = [p for p in properties if not p.get('hasUnitData')]
        if without_unit_data:
            print(f"❌ FAIL: {len(without_unit_data)} properties without hasUnitData=true")
            return False
        print(f"✅ All 22 properties have hasUnitData=true")
        
        # Check publicUrl count (should be 22)
        with_public_url = [p for p in properties if p.get('publicUrl', '').startswith('https://app.digihome.no/utleie/')]
        if len(with_public_url) != 22:
            print(f"❌ FAIL: Expected 22 properties with publicUrl, got {len(with_public_url)}")
            return False
        print(f"✅ All 22 properties have publicUrl starting with https://app.digihome.no/utleie/")
        
        # Check finnUrl count (should be 10 with finnSource='plattform')
        with_finn_url = [p for p in properties if p.get('finnUrl') and p.get('finnSource') == 'plattform']
        if len(with_finn_url) != 10:
            print(f"❌ FAIL: Expected 10 properties with finnUrl (finnSource='plattform'), got {len(with_finn_url)}")
            return False
        print(f"✅ 10 properties have finnUrl with finnSource='plattform'")
        
        # Check fullAddress with house number (at least 20)
        with_full_address = [p for p in properties if p.get('fullAddress') and any(c.isdigit() for c in p.get('fullAddress', ''))]
        if len(with_full_address) < 20:
            print(f"❌ FAIL: Expected at least 20 properties with fullAddress containing house number, got {len(with_full_address)}")
            return False
        print(f"✅ {len(with_full_address)} properties have fullAddress with house number")
        
        # Check Wernersholmvegen (should have 12 images)
        wernersholm = [p for p in properties if 'Wernersholmvegen' in p.get('area', '')]
        if not wernersholm:
            print(f"❌ FAIL: Could not find property with area 'Wernersholmvegen'")
            return False
        
        wernersholm_prop = wernersholm[0]
        wernersholm_images = len(wernersholm_prop.get('images', []))
        if wernersholm_images != 12:
            print(f"❌ FAIL: Wernersholmvegen expected 12 images, got {wernersholm_images}")
            return False
        print(f"✅ Wernersholmvegen has 12 images")
        
        # Check Baglergaten (should have incomplete=true, 0 images, sqm=0, finnUrl=null)
        baglergaten = [p for p in properties if 'Baglergaten' in p.get('area', '')]
        if not baglergaten:
            print(f"❌ FAIL: Could not find property with area 'Baglergaten'")
            return False
        
        baglergaten_prop = baglergaten[0]
        baglergaten_checks = [
            ('incomplete', True),
            ('images length', 0, len(baglergaten_prop.get('images', []))),
            ('sqm', 0),
            ('finnUrl', None)
        ]
        
        baglergaten_pass = True
        for check in baglergaten_checks:
            if len(check) == 2:
                field, expected = check
                actual = baglergaten_prop.get(field)
            else:
                field, expected, actual = check
            
            if actual != expected:
                print(f"❌ FAIL: Baglergaten {field} expected {expected}, got {actual}")
                baglergaten_pass = False
            else:
                print(f"✅ Baglergaten {field}={actual}")
        
        if not baglergaten_pass:
            return False
        
        print("\n✅ SCENARIO 2 PASSED: Admin fields verified correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception in scenario 2: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_scenario_3_pii_stripping():
    """
    Scenario 3: ⚠️ MOST IMPORTANT — PII-STRIPPING
    GET /newsletter/property-interest/lookup?property=6189812a-ae20-4d07-98f6-7764845291bb
    Should return images (12), publicUrl and finnUrl, but NONE of the PII fields
    Test at least 3 properties, including one rented
    """
    print("\n" + "="*80)
    print("SCENARIO 3: ⚠️ PII-STRIPPING (MOST IMPORTANT)")
    print("="*80)
    
    try:
        # First get admin properties to find test candidates
        print("\n[3.0] Getting admin properties to find test candidates")
        admin_url = f"{BASE_URL}/admin/properties?key={ADMIN_KEY}"
        admin_response = requests.get(admin_url, timeout=30)
        
        if admin_response.status_code != 200:
            print(f"❌ FAIL: Could not get admin properties")
            return False
        
        admin_data = admin_response.json()
        properties = admin_data.get('properties', [])
        
        # Find test candidates: Wernersholmvegen (with images), one rented, and one more
        test_properties = []
        
        # 1. Wernersholmvegen (specified in task)
        wernersholm = [p for p in properties if 'Wernersholmvegen' in p.get('area', '')]
        if wernersholm:
            test_properties.append(('Wernersholmvegen', wernersholm[0].get('id')))
        
        # 2. One rented property (has tenantName)
        rented = [p for p in properties if p.get('tenantName')]
        if rented:
            test_properties.append((f"Rented ({rented[0].get('area', 'unknown')})", rented[0].get('id')))
        
        # 3. One more property with images
        with_images = [p for p in properties if len(p.get('images', [])) > 0 and p.get('id') not in [t[1] for t in test_properties]]
        if with_images:
            test_properties.append((f"With images ({with_images[0].get('area', 'unknown')})", with_images[0].get('id')))
        
        if len(test_properties) < 3:
            print(f"⚠️ WARNING: Only found {len(test_properties)} test properties (need 3)")
        
        print(f"\nTesting {len(test_properties)} properties for PII stripping:")
        for name, prop_id in test_properties:
            print(f"  - {name}: {prop_id}")
        
        all_passed = True
        
        for name, prop_id in test_properties:
            print(f"\n[3.{test_properties.index((name, prop_id)) + 1}] Testing {name}")
            url = f"{BASE_URL}/newsletter/property-interest/lookup?property={prop_id}"
            response = requests.get(url, timeout=30)
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                all_passed = False
                continue
            
            data = response.json()
            
            # Check that images, publicUrl, finnUrl are present (if applicable)
            if 'images' in data:
                print(f"✅ Has images field ({len(data.get('images', []))} images)")
            
            if 'publicUrl' in data:
                print(f"✅ Has publicUrl: {data.get('publicUrl')[:50]}...")
            
            if 'finnUrl' in data:
                print(f"✅ Has finnUrl: {data.get('finnUrl')[:50]}...")
            
            # CRITICAL: Check that NONE of the PII fields are present
            pii_found = []
            for field in PII_BLACKLIST:
                if field in data:
                    pii_found.append(field)
            
            if pii_found:
                print(f"❌ FAIL: PII LEAK DETECTED! Found {len(pii_found)} PII fields: {', '.join(pii_found)}")
                all_passed = False
            else:
                print(f"✅ NO PII LEAK: None of the {len(PII_BLACKLIST)} blacklisted fields found")
        
        if not all_passed:
            return False
        
        print("\n✅ SCENARIO 3 PASSED: PII stripping working correctly on all tested properties")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception in scenario 3: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_scenario_4_dead_finn_ad():
    """
    Scenario 4: Property with finnStatus='utgatt' → finnUrl should be null in lookup
    If none exists, report "not testable"
    """
    print("\n" + "="*80)
    print("SCENARIO 4: DEAD FINN AD (finnStatus='utgatt')")
    print("="*80)
    
    try:
        # Get admin properties to find one with finnStatus='utgatt'
        print("\n[4.1] Finding property with finnStatus='utgatt'")
        admin_url = f"{BASE_URL}/admin/properties?key={ADMIN_KEY}"
        admin_response = requests.get(admin_url, timeout=30)
        
        if admin_response.status_code != 200:
            print(f"❌ FAIL: Could not get admin properties")
            return False
        
        admin_data = admin_response.json()
        properties = admin_data.get('properties', [])
        
        # Find property with finnStatus='utgatt'
        dead_finn = [p for p in properties if p.get('finnStatus') == 'utgatt']
        
        if not dead_finn:
            print(f"⚠️ NOT TESTABLE: No property found with finnStatus='utgatt'")
            print(f"   This is acceptable per task instructions")
            return True  # Not testable is acceptable
        
        dead_prop = dead_finn[0]
        prop_id = dead_prop.get('id')
        area = dead_prop.get('area', 'unknown')
        
        print(f"Found property with finnStatus='utgatt': {area} ({prop_id})")
        
        # Test lookup endpoint
        print(f"\n[4.2] Testing lookup for property with dead FINN ad")
        url = f"{BASE_URL}/newsletter/property-interest/lookup?property={prop_id}"
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Check that finnUrl is null
        finn_url = data.get('finnUrl')
        if finn_url is not None:
            print(f"❌ FAIL: finnUrl should be null for dead FINN ad, got: {finn_url}")
            return False
        
        print(f"✅ finnUrl is null for property with finnStatus='utgatt'")
        
        print("\n✅ SCENARIO 4 PASSED: Dead FINN ads correctly excluded from lookup")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception in scenario 4: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_scenario_5_public_feed_no_leak():
    """
    Scenario 5: PUBLIC FEED SHOULD NOT LEAK PII
    All properties are hidden, so /api/public/properties returns 0
    Temporarily set one property with images visible, verify NO PII in response
    SET IT BACK to visible:false afterwards
    """
    print("\n" + "="*80)
    print("SCENARIO 5: PUBLIC FEED PII PROTECTION")
    print("="*80)
    
    original_visible_id = None
    
    try:
        # Check initial state (should be 0 visible)
        print("\n[5.1] Checking initial state (should be 0 visible)")
        url = f"{BASE_URL}/public/properties?limit=24"
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        initial_count = data.get('count', 0)
        print(f"Initial visible count: {initial_count}")
        
        if initial_count != 0:
            print(f"⚠️ WARNING: Expected 0 visible properties, got {initial_count}")
        
        # Get admin properties to find one with images
        print("\n[5.2] Finding property with images to make visible")
        admin_url = f"{BASE_URL}/admin/properties?key={ADMIN_KEY}"
        admin_response = requests.get(admin_url, timeout=30)
        
        if admin_response.status_code != 200:
            print(f"❌ FAIL: Could not get admin properties")
            return False
        
        admin_data = admin_response.json()
        properties = admin_data.get('properties', [])
        
        # Find property with images
        with_images = [p for p in properties if len(p.get('images', [])) > 0]
        if not with_images:
            print(f"❌ FAIL: No properties with images found")
            return False
        
        test_prop = with_images[0]
        prop_id = test_prop.get('id')
        area = test_prop.get('area', 'unknown')
        
        print(f"Selected property: {area} ({prop_id}) with {len(test_prop.get('images', []))} images")
        
        # Set property visible
        print(f"\n[5.3] Setting property visible")
        visibility_url = f"{BASE_URL}/admin/properties/visibility?key={ADMIN_KEY}"
        visibility_response = requests.put(visibility_url, json={'id': prop_id, 'visible': True}, timeout=30)
        print(f"Status: {visibility_response.status_code}")
        
        if visibility_response.status_code != 200:
            print(f"❌ FAIL: Could not set property visible")
            return False
        
        original_visible_id = prop_id
        print(f"✅ Property set to visible")
        
        # Get public feed and verify NO PII
        print(f"\n[5.4] Checking public feed for PII leaks")
        public_response = requests.get(url, timeout=30)
        print(f"Status: {public_response.status_code}")
        
        if public_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {public_response.status_code}")
            return False
        
        public_data = public_response.json()
        public_properties = public_data.get('properties', [])
        public_count = public_data.get('count', 0)
        
        print(f"Public feed count: {public_count}")
        
        if public_count == 0:
            print(f"❌ FAIL: Expected at least 1 visible property, got 0")
            return False
        
        # Check first property for PII
        if not public_properties:
            print(f"❌ FAIL: No properties in public feed")
            return False
        
        public_prop = public_properties[0]
        print(f"\nChecking property: {public_prop.get('title', 'unknown')}")
        
        # CRITICAL: Check that NONE of the PII fields are present
        pii_found = []
        for field in PUBLIC_FEED_BLACKLIST:
            if field in public_prop:
                pii_found.append(field)
        
        if pii_found:
            print(f"❌ FAIL: PII LEAK IN PUBLIC FEED! Found {len(pii_found)} PII fields: {', '.join(pii_found)}")
            return False
        
        print(f"✅ NO PII LEAK: None of the {len(PUBLIC_FEED_BLACKLIST)} blacklisted fields found in public feed")
        
        # Verify expected public fields are present
        expected_fields = ['id', 'title', 'area', 'city', 'type', 'bedrooms', 'sqm', 'images', 'status']
        for field in expected_fields:
            if field in public_prop:
                print(f"✅ Has expected field: {field}")
        
        # Set property back to hidden
        print(f"\n[5.5] Setting property back to hidden (cleanup)")
        visibility_response = requests.put(visibility_url, json={'id': prop_id, 'visible': False}, timeout=30)
        print(f"Status: {visibility_response.status_code}")
        
        if visibility_response.status_code != 200:
            print(f"❌ FAIL: Could not set property back to hidden")
            return False
        
        original_visible_id = None  # Cleanup successful
        print(f"✅ Property set back to hidden")
        
        # Verify public feed is back to 0
        print(f"\n[5.6] Verifying public feed is back to 0")
        final_response = requests.get(url, timeout=30)
        final_data = final_response.json()
        final_count = final_data.get('count', 0)
        
        if final_count != 0:
            print(f"⚠️ WARNING: Expected 0 visible properties after cleanup, got {final_count}")
        else:
            print(f"✅ Public feed back to 0 visible properties")
        
        print("\n✅ SCENARIO 5 PASSED: Public feed PII protection working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception in scenario 5: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Cleanup: ensure property is set back to hidden
        if original_visible_id:
            print(f"\n[CLEANUP] Setting property {original_visible_id} back to hidden")
            try:
                visibility_url = f"{BASE_URL}/admin/properties/visibility?key={ADMIN_KEY}"
                requests.put(visibility_url, json={'id': original_visible_id, 'visible': False}, timeout=30)
                print(f"✅ Cleanup successful")
            except:
                print(f"⚠️ WARNING: Could not cleanup visibility for {original_visible_id}")


def test_scenario_6_manual_finn_wins():
    """
    Scenario 6: MANUAL FINN WINS
    On a property with finnSource='plattform', POST manual FINN URL → finnSource becomes 'manuell'
    POST with empty URL → should FALL BACK to platform's finnUrl with finnSource='plattform'
    """
    print("\n" + "="*80)
    print("SCENARIO 6: MANUAL FINN OVERRIDE AND FALLBACK")
    print("="*80)
    
    test_prop_id = None
    original_finn_url = None
    
    try:
        # Get admin properties to find one with finnSource='plattform'
        print("\n[6.1] Finding property with finnSource='plattform'")
        admin_url = f"{BASE_URL}/admin/properties?key={ADMIN_KEY}"
        admin_response = requests.get(admin_url, timeout=30)
        
        if admin_response.status_code != 200:
            print(f"❌ FAIL: Could not get admin properties")
            return False
        
        admin_data = admin_response.json()
        properties = admin_data.get('properties', [])
        
        # Find property with finnSource='plattform'
        platform_finn = [p for p in properties if p.get('finnSource') == 'plattform' and p.get('finnUrl')]
        
        if not platform_finn:
            print(f"❌ FAIL: No property found with finnSource='plattform'")
            return False
        
        test_prop = platform_finn[0]
        test_prop_id = test_prop.get('id')
        original_finn_url = test_prop.get('finnUrl')
        area = test_prop.get('area', 'unknown')
        
        print(f"Selected property: {area} ({test_prop_id})")
        print(f"Original finnUrl: {original_finn_url}")
        print(f"Original finnSource: plattform")
        
        # Set manual FINN URL
        print(f"\n[6.2] Setting manual FINN URL")
        manual_url = "https://www.finn.no/realestate/lettings/ad.html?finnkode=464252860"
        finn_url = f"{BASE_URL}/admin/properties/finn?key={ADMIN_KEY}"
        finn_response = requests.post(finn_url, json={'id': test_prop_id, 'url': manual_url}, timeout=30)
        print(f"Status: {finn_response.status_code}")
        
        if finn_response.status_code != 200:
            print(f"❌ FAIL: Could not set manual FINN URL")
            print(f"Response: {finn_response.text[:500]}")
            return False
        
        finn_data = finn_response.json()
        print(f"Response: {json.dumps(finn_data, indent=2)}")
        
        # Verify finnSource became 'manuell'
        print(f"\n[6.3] Verifying finnSource became 'manuell'")
        admin_response2 = requests.get(admin_url, timeout=30)
        admin_data2 = admin_response2.json()
        properties2 = admin_data2.get('properties', [])
        
        updated_prop = [p for p in properties2 if p.get('id') == test_prop_id]
        if not updated_prop:
            print(f"❌ FAIL: Could not find updated property")
            return False
        
        updated_prop = updated_prop[0]
        updated_finn_source = updated_prop.get('finnSource')
        updated_finn_url = updated_prop.get('finnUrl')
        
        if updated_finn_source != 'manuell':
            print(f"❌ FAIL: finnSource should be 'manuell', got '{updated_finn_source}'")
            return False
        
        if updated_finn_url != manual_url:
            print(f"❌ FAIL: finnUrl should be '{manual_url}', got '{updated_finn_url}'")
            return False
        
        print(f"✅ finnSource is now 'manuell'")
        print(f"✅ finnUrl is now '{manual_url}'")
        
        # Clear manual FINN URL (should fall back to platform)
        print(f"\n[6.4] Clearing manual FINN URL (should fall back to platform)")
        clear_response = requests.post(finn_url, json={'id': test_prop_id, 'url': ''}, timeout=30)
        print(f"Status: {clear_response.status_code}")
        
        if clear_response.status_code != 200:
            print(f"❌ FAIL: Could not clear manual FINN URL")
            return False
        
        # Verify fallback to platform
        print(f"\n[6.5] Verifying fallback to platform finnUrl")
        admin_response3 = requests.get(admin_url, timeout=30)
        admin_data3 = admin_response3.json()
        properties3 = admin_data3.get('properties', [])
        
        fallback_prop = [p for p in properties3 if p.get('id') == test_prop_id]
        if not fallback_prop:
            print(f"❌ FAIL: Could not find property after fallback")
            return False
        
        fallback_prop = fallback_prop[0]
        fallback_finn_source = fallback_prop.get('finnSource')
        fallback_finn_url = fallback_prop.get('finnUrl')
        
        if fallback_finn_source != 'plattform':
            print(f"❌ FAIL: finnSource should fall back to 'plattform', got '{fallback_finn_source}'")
            return False
        
        if fallback_finn_url != original_finn_url:
            print(f"❌ FAIL: finnUrl should fall back to original '{original_finn_url}', got '{fallback_finn_url}'")
            return False
        
        print(f"✅ finnSource fell back to 'plattform'")
        print(f"✅ finnUrl fell back to original platform URL")
        
        test_prop_id = None  # Cleanup successful
        
        print("\n✅ SCENARIO 6 PASSED: Manual FINN override and fallback working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception in scenario 6: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Cleanup: ensure FINN URL is cleared
        if test_prop_id:
            print(f"\n[CLEANUP] Clearing manual FINN URL for {test_prop_id}")
            try:
                finn_url = f"{BASE_URL}/admin/properties/finn?key={ADMIN_KEY}"
                requests.post(finn_url, json={'id': test_prop_id, 'url': ''}, timeout=30)
                print(f"✅ Cleanup successful")
            except:
                print(f"⚠️ WARNING: Could not cleanup FINN URL for {test_prop_id}")


def test_scenario_7_newsletter_preview():
    """
    Scenario 7: NEWSLETTER PORTAL via POST /admin/newsletter/preview (stateless)
    Wernersholmvegen should appear in HTML, Baglergaten should be in unavailableProperties
    """
    print("\n" + "="*80)
    print("SCENARIO 7: NEWSLETTER PREVIEW (STATELESS)")
    print("="*80)
    
    try:
        # Get admin properties to find Wernersholmvegen and Baglergaten
        print("\n[7.1] Finding Wernersholmvegen and Baglergaten")
        admin_url = f"{BASE_URL}/admin/properties?key={ADMIN_KEY}"
        admin_response = requests.get(admin_url, timeout=30)
        
        if admin_response.status_code != 200:
            print(f"❌ FAIL: Could not get admin properties")
            return False
        
        admin_data = admin_response.json()
        properties = admin_data.get('properties', [])
        
        # Find Wernersholmvegen (should have images)
        wernersholm = [p for p in properties if 'Wernersholmvegen' in p.get('area', '')]
        if not wernersholm:
            print(f"❌ FAIL: Could not find Wernersholmvegen")
            return False
        
        wernersholm_prop = wernersholm[0]
        print(f"Found Wernersholmvegen: {wernersholm_prop.get('id')} ({len(wernersholm_prop.get('images', []))} images)")
        
        # Find Baglergaten (should be incomplete)
        baglergaten = [p for p in properties if 'Baglergaten' in p.get('area', '')]
        if not baglergaten:
            print(f"❌ FAIL: Could not find Baglergaten")
            return False
        
        baglergaten_prop = baglergaten[0]
        print(f"Found Baglergaten: {baglergaten_prop.get('id')} (incomplete={baglergaten_prop.get('incomplete')})")
        
        # Prepare newsletter preview payload
        print(f"\n[7.2] Preparing newsletter preview with both properties")
        
        # Build property items for newsletter
        # Images are strings (URLs), not objects
        wernersholm_images = wernersholm_prop.get('images', [])
        wernersholm_image = wernersholm_images[0] if wernersholm_images else None
        
        baglergaten_images = baglergaten_prop.get('images', [])
        baglergaten_image = baglergaten_images[0] if baglergaten_images else None
        
        wernersholm_item = {
            'pid': wernersholm_prop.get('externalId') or wernersholm_prop.get('id'),
            'title': wernersholm_prop.get('title', 'Wernersholmvegen'),
            'image': wernersholm_image,
            'meta': f"{wernersholm_prop.get('bedrooms', 0)}-roms, {wernersholm_prop.get('sqm', 0)} m²",
            'band': wernersholm_prop.get('monthlyRentBand', 'Pris på forespørsel'),
            'status': wernersholm_prop.get('status', 'available'),
            'district': wernersholm_prop.get('district', 'Bergen')
        }
        
        baglergaten_item = {
            'pid': baglergaten_prop.get('externalId') or baglergaten_prop.get('id'),
            'title': baglergaten_prop.get('title', 'Baglergaten'),
            'image': baglergaten_image,
            'meta': f"{baglergaten_prop.get('bedrooms', 0)}-roms, {baglergaten_prop.get('sqm', 0)} m²",
            'band': baglergaten_prop.get('monthlyRentBand', 'Pris på forespørsel'),
            'status': baglergaten_prop.get('status', 'available'),
            'district': baglergaten_prop.get('district', 'Bergen')
        }
        
        preview_payload = {
            'subject': 'Test Newsletter',
            'preheader': 'Test preheader',
            'blocks': [
                {
                    'type': 'heading',
                    'text': 'Nye boliger'
                },
                {
                    'type': 'properties',
                    'items': [wernersholm_item, baglergaten_item]
                }
            ]
        }
        
        # Send preview request
        print(f"\n[7.3] Sending newsletter preview request")
        preview_url = f"{BASE_URL}/admin/newsletter/preview?key={ADMIN_KEY}"
        preview_response = requests.post(preview_url, json=preview_payload, timeout=30)
        print(f"Status: {preview_response.status_code}")
        
        if preview_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {preview_response.status_code}")
            print(f"Response: {preview_response.text[:500]}")
            return False
        
        preview_data = preview_response.json()
        html = preview_data.get('html', '')
        unavailable = preview_data.get('unavailableProperties', [])
        
        print(f"HTML length: {len(html)} characters")
        print(f"Unavailable properties: {len(unavailable)}")
        
        # Check that Wernersholmvegen appears in HTML
        if 'Wernersholmvegen' not in html and wernersholm_prop.get('title', '') not in html:
            print(f"❌ FAIL: Wernersholmvegen should appear in HTML")
            return False
        
        print(f"✅ Wernersholmvegen appears in HTML")
        
        # Check that Baglergaten is in unavailableProperties
        baglergaten_external_id = baglergaten_prop.get('externalId')
        baglergaten_id = baglergaten_prop.get('id')
        
        # Check if either ID is in unavailable list (could be dict or string)
        baglergaten_in_unavailable = False
        for unavail_item in unavailable:
            if isinstance(unavail_item, dict):
                unavail_pid = unavail_item.get('pid')
            else:
                unavail_pid = unavail_item
            
            if unavail_pid in [baglergaten_external_id, baglergaten_id]:
                baglergaten_in_unavailable = True
                break
        
        if not baglergaten_in_unavailable:
            print(f"❌ FAIL: Baglergaten should be in unavailableProperties")
            print(f"Baglergaten externalId: {baglergaten_external_id}, id: {baglergaten_id}")
            print(f"Unavailable: {unavailable}")
            return False
        
        print(f"✅ Baglergaten is in unavailableProperties")
        
        print("\n✅ SCENARIO 7 PASSED: Newsletter preview working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception in scenario 7: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_scenario_8_regression():
    """
    Scenario 8: REGRESSION
    Verify existing endpoints still work:
    - GET /admin/kpi?days=30
    - GET /api/
    - GET /admin/newsletter/campaign?id=6783d667-c93e-45ca-a458-341f9d79acf5 (with district intact)
    """
    print("\n" + "="*80)
    print("SCENARIO 8: REGRESSION TESTS")
    print("="*80)
    
    try:
        # Test 1: GET /admin/kpi?days=30
        print("\n[8.1] GET /admin/kpi?days=30")
        kpi_url = f"{BASE_URL}/admin/kpi?days=30&key={ADMIN_KEY}"
        kpi_response = requests.get(kpi_url, timeout=60)
        print(f"Status: {kpi_response.status_code}")
        
        if kpi_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {kpi_response.status_code}")
            return False
        
        print(f"✅ GET /admin/kpi?days=30 returns 200")
        
        # Test 2: GET /api/
        print("\n[8.2] GET /api/")
        root_url = f"{BASE_URL}/"
        root_response = requests.get(root_url, timeout=30)
        print(f"Status: {root_response.status_code}")
        
        if root_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {root_response.status_code}")
            return False
        
        print(f"✅ GET /api/ returns 200")
        
        # Test 3: GET /admin/newsletter/campaign with specific ID
        print("\n[8.3] GET /admin/newsletter/campaign?id=6783d667-c93e-45ca-a458-341f9d79acf5")
        campaign_url = f"{BASE_URL}/admin/newsletter/campaign?id=6783d667-c93e-45ca-a458-341f9d79acf5&key={ADMIN_KEY}"
        campaign_response = requests.get(campaign_url, timeout=30)
        print(f"Status: {campaign_response.status_code}")
        
        if campaign_response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {campaign_response.status_code}")
            return False
        
        campaign_data = campaign_response.json()
        
        # Check that property cards still have district
        html = campaign_data.get('html', '')
        if 'district' in html.lower() or 'bergen' in html.lower() or 'sentrum' in html.lower():
            print(f"✅ Campaign HTML contains district information")
        else:
            print(f"⚠️ WARNING: Could not verify district in campaign HTML")
        
        print(f"✅ GET /admin/newsletter/campaign returns 200")
        
        print("\n✅ SCENARIO 8 PASSED: All regression tests passed")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception in scenario 8: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_final_state():
    """
    MANDATORY: Verify final state
    - 22 properties
    - 0 visible
    - 10 with finnUrl where all have finnSource='plattform'
    """
    print("\n" + "="*80)
    print("FINAL STATE VERIFICATION")
    print("="*80)
    
    try:
        print("\n[FINAL] Verifying final state")
        admin_url = f"{BASE_URL}/admin/properties?key={ADMIN_KEY}"
        admin_response = requests.get(admin_url, timeout=30)
        
        if admin_response.status_code != 200:
            print(f"❌ FAIL: Could not get admin properties")
            return False
        
        admin_data = admin_response.json()
        properties = admin_data.get('properties', [])
        total = admin_data.get('total', 0)
        visible_count = admin_data.get('visibleCount', 0)
        
        # Check total=22
        if total != 22:
            print(f"❌ FAIL: Expected total=22, got {total}")
            return False
        print(f"✅ Total properties: 22")
        
        # Check visibleCount=0
        if visible_count != 0:
            print(f"❌ FAIL: Expected visibleCount=0, got {visible_count}")
            return False
        print(f"✅ Visible properties: 0")
        
        # Check finnUrl count and source
        with_finn_url = [p for p in properties if p.get('finnUrl')]
        platform_finn = [p for p in with_finn_url if p.get('finnSource') == 'plattform']
        manual_finn = [p for p in with_finn_url if p.get('finnSource') == 'manuell']
        
        if len(with_finn_url) != 10:
            print(f"❌ FAIL: Expected 10 properties with finnUrl, got {len(with_finn_url)}")
            return False
        print(f"✅ Properties with finnUrl: 10")
        
        if len(platform_finn) != 10:
            print(f"❌ FAIL: Expected all 10 finnUrl to have finnSource='plattform', got {len(platform_finn)}")
            return False
        print(f"✅ All 10 finnUrl have finnSource='plattform'")
        
        if manual_finn:
            print(f"❌ FAIL: Found {len(manual_finn)} properties with finnSource='manuell' (should be 0)")
            return False
        print(f"✅ No properties with finnSource='manuell'")
        
        print("\n✅ FINAL STATE VERIFIED: 22 properties, 0 visible, 10 with finnUrl (all plattform)")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception in final state verification: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all test scenarios"""
    print("="*80)
    print("BACKEND TEST: Kanonisk enhetseksport + PII-stripping + FINN-prioritet")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print("="*80)
    
    results = {}
    
    # Run all scenarios
    scenarios = [
        ("Scenario 1: Sync with unit export (idempotency)", test_scenario_1_sync_with_unit_export),
        ("Scenario 2: Admin fields verification", test_scenario_2_admin_fields),
        ("Scenario 3: ⚠️ PII-STRIPPING (MOST IMPORTANT)", test_scenario_3_pii_stripping),
        ("Scenario 4: Dead FINN ad", test_scenario_4_dead_finn_ad),
        ("Scenario 5: Public feed PII protection", test_scenario_5_public_feed_no_leak),
        ("Scenario 6: Manual FINN override and fallback", test_scenario_6_manual_finn_wins),
        ("Scenario 7: Newsletter preview", test_scenario_7_newsletter_preview),
        ("Scenario 8: Regression tests", test_scenario_8_regression),
    ]
    
    for name, test_func in scenarios:
        try:
            results[name] = test_func()
        except Exception as e:
            print(f"\n❌ EXCEPTION in {name}: {e}")
            import traceback
            traceback.print_exc()
            results[name] = False
    
    # Verify final state
    final_state_ok = verify_final_state()
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nFinal state verification: {'✅ PASS' if final_state_ok else '❌ FAIL'}")
    
    print(f"\n{'='*80}")
    print(f"TOTAL: {passed}/{total} scenarios passed")
    
    if passed == total and final_state_ok:
        print("✅ ALL TESTS PASSED")
        return 0
    else:
        print("❌ SOME TESTS FAILED")
        return 1


if __name__ == "__main__":
    sys.exit(main())
