#!/usr/bin/env python3
"""
BACKEND TEST: Rediger boligdata — redaksjonelle overstyringer

Tests the NEW editorial fields feature for property data overrides.
Base URL: https://conversion-optimize-7.preview.emergentagent.com
Admin key: dh_admin_b3Kx92Qz7Lm4

CRITICAL SAFETY RULES:
- DO NOT set visible:true on any property (0 published before and after)
- DO NOT POST /api/tenants or /api/housing-alerts (creates leads)
- DO NOT POST /admin/newsletter/send or /newsletter/test (LIVE SendGrid)
- DO NOT POST /admin/properties/sync, /admin/properties/finn or /finn-snapshot with all:true
- finn-suggest is SAFE (returns suggestions but saves NOTHING)

MANDATORY CLEANUP: PUT {id, resetAll:true} on all touched properties.
Confirm at end: no property has editorialFields with content, GET /api/public/listings gives total:0.
"""

import requests
import json
import sys
from pymongo import MongoClient

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Track touched properties for cleanup
touched_properties = set()

def test_step(num, desc):
    """Print test step header"""
    print(f"\n{'='*80}")
    print(f"TEST {num}: {desc}")
    print('='*80)

def verify(condition, message):
    """Verify a condition and print result"""
    if condition:
        print(f"✅ {message}")
        return True
    else:
        print(f"❌ {message}")
        return False

def get_db():
    """Get MongoDB connection"""
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]

def get_property_count_with_editorial():
    """Count properties with editorial fields"""
    db = get_db()
    count = db.platform_properties.count_documents({
        "editorial": {"$exists": True, "$ne": None},
        "stale": {"$ne": True}
    })
    return count

def get_published_count():
    """Get count of published properties"""
    try:
        r = requests.get(f"{BASE_URL}/api/public/listings", timeout=10)
        if r.status_code == 200:
            data = r.json()
            return data.get('total', 0)
        return -1
    except Exception as e:
        print(f"Error getting published count: {e}")
        return -1

def get_test_property():
    """Get a test property from DB"""
    db = get_db()
    prop = db.platform_properties.find_one(
        {"stale": {"$ne": True}},
        {"_id": 0, "id": 1, "externalId": 1, "title": 1, "rentAmount": 1, "sqm": 1, "bedrooms": 1, "area": 1}
    )
    return prop

def main():
    print("="*80)
    print("BACKEND TEST: Rediger boligdata — redaksjonelle overstyringer")
    print("="*80)
    
    # BASELINE STATE
    print("\n📊 BASELINE STATE:")
    editorial_count_before = get_property_count_with_editorial()
    published_count_before = get_published_count()
    print(f"Properties with editorial fields: {editorial_count_before}")
    print(f"Published properties (visible=true): {published_count_before}")
    
    # Get a test property
    test_prop = get_test_property()
    if not test_prop:
        print("❌ No properties found in database")
        return 1
    
    test_id = test_prop['id']
    touched_properties.add(test_id)
    print(f"\nUsing test property: {test_id}")
    print(f"  Title: {test_prop.get('title', 'N/A')}")
    print(f"  Platform rentAmount: {test_prop.get('rentAmount', 'N/A')}")
    
    all_passed = True
    
    # ========================================================================
    # SCENARIO 1: AUTH - 401 without key
    # ========================================================================
    test_step(1, "AUTH: 401 without key")
    try:
        r = requests.put(f"{BASE_URL}/api/admin/properties/fields", 
                        json={"id": test_id, "fields": {"rentAmount": 15000}},
                        timeout=10)
        passed = verify(r.status_code == 401, f"PUT /fields without key returns 401 (got {r.status_code})")
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 2: VALIDATION - 400 without id
    # ========================================================================
    test_step(2, "VALIDATION: 400 without id")
    try:
        r = requests.put(f"{BASE_URL}/api/admin/properties/fields?key={ADMIN_KEY}",
                        json={"fields": {"rentAmount": 15000}},
                        timeout=10)
        passed = verify(r.status_code == 400, f"PUT /fields without id returns 400 (got {r.status_code})")
        if r.status_code == 400:
            data = r.json()
            passed = passed and verify('error' in data, f"Response contains error field: {data.get('error', 'N/A')}")
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 3: VALIDATION - 404 unknown id
    # ========================================================================
    test_step(3, "VALIDATION: 404 unknown id")
    try:
        r = requests.put(f"{BASE_URL}/api/admin/properties/fields?key={ADMIN_KEY}",
                        json={"id": "unknown-id-xyz-999", "fields": {"rentAmount": 15000}},
                        timeout=10)
        passed = verify(r.status_code == 404, f"PUT /fields with unknown id returns 404 (got {r.status_code})")
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 4: VALIDATION - 400 for invalid value (rentAmount out of range)
    # ========================================================================
    test_step(4, "VALIDATION: 400 for invalid rentAmount (out of range)")
    try:
        r = requests.put(f"{BASE_URL}/api/admin/properties/fields?key={ADMIN_KEY}",
                        json={"id": test_id, "fields": {"rentAmount": 500}},  # min is 1000
                        timeout=10)
        passed = verify(r.status_code == 400, f"PUT /fields with rentAmount=500 (< min 1000) returns 400 (got {r.status_code})")
        if r.status_code == 400:
            data = r.json()
            passed = passed and verify('Ugyldig verdi' in data.get('error', ''), f"Error message contains 'Ugyldig verdi': {data.get('error', 'N/A')}")
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 5: KPI-SAFETY - Editorial price creates monthlyRentBand but NEVER touches rentAmount
    # ========================================================================
    test_step(5, "KPI-SAFETY: Editorial price creates monthlyRentBand with rentBandSource='redaksjonell', rentAmount UNCHANGED")
    try:
        # Get original rentAmount from DB
        db = get_db()
        orig_doc = db.platform_properties.find_one({"id": test_id}, {"_id": 0, "rentAmount": 1})
        orig_rent_amount = orig_doc.get('rentAmount') if orig_doc else None
        print(f"Original platform rentAmount: {orig_rent_amount}")
        
        # Set editorial price
        r = requests.put(f"{BASE_URL}/api/admin/properties/fields?key={ADMIN_KEY}",
                        json={"id": test_id, "fields": {"rentAmount": 16000}},
                        timeout=10)
        passed = verify(r.status_code == 200, f"PUT /fields with rentAmount=16000 returns 200 (got {r.status_code})")
        
        if r.status_code == 200:
            data = r.json()
            passed = passed and verify(data.get('ok') == True, f"Response ok=true")
            prop = data.get('property', {})
            
            # Check monthlyRentBand created
            band = prop.get('monthlyRentBand')
            passed = passed and verify(band is not None, f"monthlyRentBand created: {band}")
            passed = passed and verify('16 000' in str(band) and '18 000' in str(band), f"monthlyRentBand is correct interval (16000 → '16 000–18 000 kr/mnd'): {band}")
            
            # Check rentBandSource
            source = prop.get('rentBandSource')
            passed = passed and verify(source == 'redaksjonell', f"rentBandSource='redaksjonell' (got '{source}')")
            
            # Check editorialRentAmount saved
            ed_rent = prop.get('editorialRentAmount')
            passed = passed and verify(ed_rent == 16000, f"editorialRentAmount=16000 (got {ed_rent})")
            
            # CRITICAL: Check rentAmount UNCHANGED in DB
            fresh_doc = db.platform_properties.find_one({"id": test_id}, {"_id": 0, "rentAmount": 1})
            fresh_rent_amount = fresh_doc.get('rentAmount') if fresh_doc else None
            passed = passed and verify(fresh_rent_amount == orig_rent_amount, 
                                      f"CRITICAL: property.rentAmount UNCHANGED (was {orig_rent_amount}, now {fresh_rent_amount})")
            
            # Check platformValues preserved
            plat_vals = prop.get('platformValues', {})
            passed = passed and verify('rentAmount' in plat_vals, f"platformValues.rentAmount preserved: {plat_vals.get('rentAmount')}")
        
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 6: Platform values preserved in platformValues
    # ========================================================================
    test_step(6, "Platform values preserved in platformValues")
    try:
        # Set editorial sqm and bedrooms
        r = requests.put(f"{BASE_URL}/api/admin/properties/fields?key={ADMIN_KEY}",
                        json={"id": test_id, "fields": {"sqm": 85, "bedrooms": 3}},
                        timeout=10)
        passed = verify(r.status_code == 200, f"PUT /fields with sqm=85, bedrooms=3 returns 200 (got {r.status_code})")
        
        if r.status_code == 200:
            data = r.json()
            prop = data.get('property', {})
            
            # Check editorial values applied
            passed = passed and verify(prop.get('sqm') == 85, f"sqm=85 applied (got {prop.get('sqm')})")
            passed = passed and verify(prop.get('bedrooms') == 3, f"bedrooms=3 applied (got {prop.get('bedrooms')})")
            
            # Check platformValues preserved
            plat_vals = prop.get('platformValues', {})
            passed = passed and verify('sqm' in plat_vals, f"platformValues.sqm preserved: {plat_vals.get('sqm')}")
            passed = passed and verify('bedrooms' in plat_vals, f"platformValues.bedrooms preserved: {plat_vals.get('bedrooms')}")
        
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 7: Empty value ('') resets field
    # ========================================================================
    test_step(7, "Empty value ('') resets field so platform value returns")
    try:
        # Reset sqm with empty string
        r = requests.put(f"{BASE_URL}/api/admin/properties/fields?key={ADMIN_KEY}",
                        json={"id": test_id, "fields": {"sqm": ""}},
                        timeout=10)
        passed = verify(r.status_code == 200, f"PUT /fields with sqm='' returns 200 (got {r.status_code})")
        
        if r.status_code == 200:
            data = r.json()
            prop = data.get('property', {})
            plat_vals = prop.get('platformValues', {})
            
            # Check sqm reverted to platform value
            plat_sqm = plat_vals.get('sqm')
            current_sqm = prop.get('sqm')
            passed = passed and verify(current_sqm == plat_sqm, 
                                      f"sqm reverted to platform value (platform={plat_sqm}, current={current_sqm})")
            
            # Check cleared in response
            removed = data.get('removed', [])
            passed = passed and verify(isinstance(removed, list) and 'sqm' in removed, 
                                      f"sqm in removed fields: {removed}")
        
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 8: REGRESSION - PUT /title does NOT delete other overrides
    # ========================================================================
    test_step(8, "REGRESSION: PUT /admin/properties/title does NOT delete other overrides")
    try:
        # First set multiple editorial fields
        r1 = requests.put(f"{BASE_URL}/api/admin/properties/fields?key={ADMIN_KEY}",
                         json={"id": test_id, "fields": {
                             "rentAmount": 17000,
                             "sqm": 90,
                             "description": "Test annonsetekst for regresjon"
                         }},
                         timeout=10)
        passed = verify(r1.status_code == 200, f"Set multiple editorial fields returns 200")
        
        # Now update title via old endpoint
        r2 = requests.put(f"{BASE_URL}/api/admin/properties/title?key={ADMIN_KEY}",
                         json={"id": test_id, "title": "Ny redaksjonell tittel"},
                         timeout=10)
        passed = passed and verify(r2.status_code == 200, f"PUT /title returns 200 (got {r2.status_code})")
        
        if r2.status_code == 200:
            data = r2.json()
            prop = data.get('property', {})
            
            # Check title updated
            ed_title = prop.get('editorialTitle')
            passed = passed and verify(ed_title == "Ny redaksjonell tittel", 
                                      f"editorialTitle updated (got '{ed_title}')")
            
            # CRITICAL: Check other overrides NOT deleted
            ed_rent = prop.get('editorialRentAmount')
            passed = passed and verify(ed_rent == 17000, 
                                      f"CRITICAL: editorialRentAmount still 17000 (got {ed_rent})")
            
            current_sqm = prop.get('sqm')
            passed = passed and verify(current_sqm == 90, 
                                      f"CRITICAL: sqm still 90 (got {current_sqm})")
            
            desc = prop.get('description')
            passed = passed and verify('Test annonsetekst' in str(desc), 
                                      f"CRITICAL: description still present")
        
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 9: Street field strips house number
    # ========================================================================
    test_step(9, "Street field strips house number ('Baglergaten 8B' → 'Baglergaten')")
    try:
        r = requests.put(f"{BASE_URL}/api/admin/properties/fields?key={ADMIN_KEY}",
                        json={"id": test_id, "fields": {"area": "Baglergaten 8B"}},
                        timeout=10)
        passed = verify(r.status_code == 200, f"PUT /fields with area='Baglergaten 8B' returns 200 (got {r.status_code})")
        
        if r.status_code == 200:
            data = r.json()
            prop = data.get('property', {})
            area = prop.get('area')
            passed = passed and verify(area == 'Baglergaten', 
                                      f"area stripped to 'Baglergaten' (got '{area}')")
        
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 10: finn-suggest returns suggestions but saves NOTHING
    # ========================================================================
    test_step(10, "finn-suggest returns suggestions but saves NOTHING")
    try:
        # Get property state before
        db = get_db()
        before_doc = db.platform_properties.find_one({"id": test_id}, {"_id": 0})
        
        # Call finn-suggest with a known FINN URL (use test property's finnUrl if available)
        finn_url = "https://www.finn.no/realestate/lettings/ad.html?finnkode=411437580"
        r = requests.post(f"{BASE_URL}/api/admin/properties/finn-suggest?key={ADMIN_KEY}",
                         json={"id": test_id, "url": finn_url},
                         timeout=30)
        
        # Accept both 200 (success) and 502 (FINN fetch failed) - both are OK for this test
        passed = verify(r.status_code in [200, 502], 
                       f"POST /finn-suggest returns 200 or 502 (got {r.status_code})")
        
        if r.status_code == 200:
            data = r.json()
            passed = passed and verify(data.get('ok') == True, f"Response ok=true")
            passed = passed and verify('suggest' in data, f"Response contains 'suggest' field")
            passed = passed and verify('current' in data, f"Response contains 'current' field")
            print(f"  Suggestions returned: {list(data.get('suggest', {}).keys())}")
        
        # CRITICAL: Verify NOTHING saved to DB
        after_doc = db.platform_properties.find_one({"id": test_id}, {"_id": 0})
        
        # Compare relevant fields (exclude timestamps)
        before_editorial = before_doc.get('editorial', {})
        after_editorial = after_doc.get('editorial', {})
        
        # Remove updatedAt for comparison
        before_ed_copy = {k: v for k, v in before_editorial.items() if k != 'updatedAt'}
        after_ed_copy = {k: v for k, v in after_editorial.items() if k != 'updatedAt'}
        
        passed = passed and verify(before_ed_copy == after_ed_copy, 
                                  f"CRITICAL: editorial fields UNCHANGED after finn-suggest")
        
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 11: Privacy - /api/public/properties does NOT contain admin fields
    # ========================================================================
    test_step(11, "Privacy: /api/public/properties does NOT contain admin fields")
    try:
        r = requests.get(f"{BASE_URL}/api/public/properties", timeout=10)
        passed = verify(r.status_code == 200, f"GET /public/properties returns 200 (got {r.status_code})")
        
        if r.status_code == 200:
            data = r.json()
            props = data.get('properties', [])
            
            if props:
                # Check first property for admin fields
                prop = props[0]
                admin_fields = ['editorialFields', 'editorialValues', 'editorialRentAmount', 
                               'platformValues', 'imageRights', 'rentBandSource', 
                               'editorialTitle', 'finnTitle', 'listingTitle', 'listingTitleSource']
                
                found_admin_fields = [f for f in admin_fields if f in prop]
                passed = passed and verify(len(found_admin_fields) == 0, 
                                          f"NO admin fields in public response (found: {found_admin_fields})")
            else:
                print("  ℹ️  No properties in public response (expected if none visible)")
        
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 12: Soft-404 fix - /ledige-boliger/<unknown> gives HTTP 404
    # ========================================================================
    test_step(12, "Soft-404 fix: /ledige-boliger/<unknown> gives HTTP 404")
    try:
        r = requests.get(f"{BASE_URL}/ledige-boliger/ukjent-bolig-xyz-999", 
                        allow_redirects=False, timeout=10)
        passed = verify(r.status_code == 404, 
                       f"GET /ledige-boliger/<unknown> returns 404 (got {r.status_code})")
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 13: Soft-404 fix - /guider/<unknown> gives HTTP 404
    # ========================================================================
    test_step(13, "Soft-404 fix: /guider/<unknown> gives HTTP 404")
    try:
        r = requests.get(f"{BASE_URL}/guider/ukjent-guide-xyz-999", 
                        allow_redirects=False, timeout=10)
        passed = verify(r.status_code == 404, 
                       f"GET /guider/<unknown> returns 404 (got {r.status_code})")
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # SCENARIO 14: Preview mode - ?forhandsvis=1 gives 200 with noindex
    # ========================================================================
    test_step(14, "Preview mode: ?forhandsvis=1 gives 200 with noindex")
    try:
        r = requests.get(f"{BASE_URL}/ledige-boliger/ukjent-bolig-xyz-999?forhandsvis=1", 
                        timeout=10)
        passed = verify(r.status_code == 200, 
                       f"GET /ledige-boliger/<unknown>?forhandsvis=1 returns 200 (got {r.status_code})")
        
        if r.status_code == 200:
            html = r.text
            passed = passed and verify('noindex' in html.lower(), 
                                      f"Response contains noindex meta tag")
        
        all_passed = all_passed and passed
    except Exception as e:
        print(f"❌ Exception: {e}")
        all_passed = False
    
    # ========================================================================
    # MANDATORY CLEANUP
    # ========================================================================
    print("\n" + "="*80)
    print("MANDATORY CLEANUP")
    print("="*80)
    
    cleanup_passed = True
    for prop_id in touched_properties:
        print(f"\nCleaning up property: {prop_id}")
        try:
            r = requests.put(f"{BASE_URL}/api/admin/properties/fields?key={ADMIN_KEY}",
                            json={"id": prop_id, "resetAll": True},
                            timeout=10)
            if verify(r.status_code == 200, f"  PUT {{resetAll:true}} returns 200"):
                data = r.json()
                verify(data.get('cleared') == True, f"  Response cleared=true")
            else:
                cleanup_passed = False
        except Exception as e:
            print(f"  ❌ Cleanup exception: {e}")
            cleanup_passed = False
    
    # Verify no properties have editorial fields
    editorial_count_after = get_property_count_with_editorial()
    verify(editorial_count_after == 0, 
           f"No properties have editorialFields (count={editorial_count_after})")
    
    # Verify published count unchanged
    published_count_after = get_published_count()
    verify(published_count_after == published_count_before, 
           f"Published count unchanged (before={published_count_before}, after={published_count_after})")
    
    # ========================================================================
    # FINAL SUMMARY
    # ========================================================================
    print("\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    print(f"\nBASELINE STATE:")
    print(f"  Properties with editorial fields: {editorial_count_before} → {editorial_count_after}")
    print(f"  Published properties: {published_count_before} → {published_count_after}")
    
    print(f"\nTEST RESULTS:")
    if all_passed and cleanup_passed:
        print("✅ ALL 14 SCENARIOS PASSED")
        print("✅ CLEANUP SUCCESSFUL")
        return 0
    else:
        if not all_passed:
            print("❌ SOME SCENARIOS FAILED")
        if not cleanup_passed:
            print("❌ CLEANUP FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
