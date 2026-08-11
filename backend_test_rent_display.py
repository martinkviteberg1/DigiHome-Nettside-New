#!/usr/bin/env python3
"""
Backend test for EKSAKT MÅNEDSLEIE (exact monthly rent) feature.
Tests that prices are now exact instead of intervals, and that rentIndicative is removed.
"""

import requests
import json
import re
import sys
from typing import Dict, Any, Optional

BASE_URL = "https://saker-hub.preview.emergentagent.com"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test counters
tests_passed = 0
tests_failed = 0

def log_test(name: str, passed: bool, details: str = ""):
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        print(f"✅ {name}")
        if details:
            print(f"   {details}")
    else:
        tests_failed += 1
        print(f"❌ {name}")
        if details:
            print(f"   {details}")

def count_number_groups(text: str) -> int:
    """Count how many number groups are in the text (e.g., '23 000' is 1, '22 000–24 000' is 2)"""
    if not text:
        return 0
    # Match number groups like "23 000" or "23000"
    pattern = r'\d+(?:\s\d{3})*'
    matches = re.findall(pattern, text)
    return len(matches)

print("=" * 80)
print("BACKEND TEST: EKSAKT MÅNEDSLEIE (Exact Monthly Rent)")
print("=" * 80)
print()

# Store test data for cleanup
test_property_id = None
test_tenant_ids = []
test_campaign_id = None

try:
    # ========================================================================
    # SCENARIO 1: NO INTERVALS IN LIVE DATA
    # ========================================================================
    print("SCENARIO 1: NO INTERVALS IN LIVE DATA")
    print("-" * 80)
    
    response = requests.get(f"{BASE_URL}/api/admin/properties", params={"key": ADMIN_KEY}, timeout=30)
    log_test("GET /api/admin/properties returns 200", response.status_code == 200, f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        properties = data.get("properties", [])
        total = data.get("total", 0)
        
        log_test(f"Properties returned (total={total})", total > 0, f"Found {len(properties)} properties")
        
        # Check each property for intervals
        properties_with_intervals = []
        properties_with_exact = []
        properties_with_platform_source = []
        
        for prop in properties:
            prop_id = prop.get("id", "unknown")
            monthly_rent_band = prop.get("monthlyRentBand")
            rent_band_source = prop.get("rentBandSource")
            rent_amount = prop.get("rentAmount")
            
            if monthly_rent_band:
                num_groups = count_number_groups(monthly_rent_band)
                if num_groups == 2:
                    properties_with_intervals.append({
                        "id": prop_id[:8],
                        "band": monthly_rent_band,
                        "source": rent_band_source
                    })
                elif num_groups == 1:
                    properties_with_exact.append({
                        "id": prop_id[:8],
                        "band": monthly_rent_band,
                        "source": rent_band_source,
                        "amount": rent_amount
                    })
                    
                    # Check platform sources have exact formatting
                    if rent_band_source in ['plattform-belop', 'plattform-estimat']:
                        properties_with_platform_source.append({
                            "id": prop_id[:8],
                            "band": monthly_rent_band,
                            "amount": rent_amount,
                            "source": rent_band_source
                        })
        
        log_test(
            "NO properties have interval prices (two number groups)",
            len(properties_with_intervals) == 0,
            f"Found {len(properties_with_intervals)} with intervals: {properties_with_intervals[:3]}"
        )
        
        log_test(
            "Properties with prices have exactly ONE number group",
            len(properties_with_exact) > 0,
            f"Found {len(properties_with_exact)} with exact prices"
        )
        
        # Verify platform sources have exact formatting matching rentAmount
        platform_exact_match = True
        for prop in properties_with_platform_source:
            if prop["amount"]:
                # Extract number from band (e.g., "23 000 kr/mnd" → 23000)
                band_number = int(re.sub(r'\s', '', re.search(r'\d+(?:\s\d{3})*', prop["band"]).group()))
                if band_number != prop["amount"]:
                    platform_exact_match = False
                    print(f"   ⚠️  Property {prop['id']}: band={prop['band']} but amount={prop['amount']}")
        
        log_test(
            "Platform sources have monthlyRentBand = exact formatting of rentAmount",
            platform_exact_match,
            f"Checked {len(properties_with_platform_source)} platform-sourced properties"
        )
    
    print()
    
    # ========================================================================
    # SCENARIO 2: EDITORIAL PRICE EXACT + KPI-SAFE
    # ========================================================================
    print("SCENARIO 2: EDITORIAL PRICE EXACT + KPI-SAFE")
    print("-" * 80)
    
    # Find property starting with 999db4b1 (Baglergaten)
    response = requests.get(f"{BASE_URL}/api/admin/properties", params={"key": ADMIN_KEY, "limit": 50}, timeout=30)
    if response.status_code == 200:
        properties = response.json().get("properties", [])
        baglergaten = None
        for prop in properties:
            if prop.get("id", "").startswith("999db4b1"):
                baglergaten = prop
                test_property_id = prop["id"]
                break
        
        if baglergaten:
            log_test("Found Baglergaten property", True, f"ID: {test_property_id[:16]}...")
            
            # Store original rentAmount for KPI safety check
            original_rent_amount = baglergaten.get("rentAmount")
            
            # Set editorial price
            response = requests.put(
                f"{BASE_URL}/api/admin/properties/fields",
                params={"key": ADMIN_KEY},
                json={"id": test_property_id, "fields": {"rentAmount": 21500}},
                timeout=30
            )
            
            log_test("PUT /api/admin/properties/fields returns 200", response.status_code == 200, f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                prop = result.get("property", {})
                
                monthly_rent_band = prop.get("monthlyRentBand")
                rent_band_source = prop.get("rentBandSource")
                platform_rent_amount = prop.get("rentAmount")
                content_ready = result.get("contentReady")
                
                log_test(
                    "monthlyRentBand is exact '21 500 kr/mnd' (NOT interval)",
                    monthly_rent_band == "21 500 kr/mnd",
                    f"Got: {monthly_rent_band}"
                )
                
                log_test(
                    "rentBandSource is 'redaksjonell'",
                    rent_band_source == "redaksjonell",
                    f"Got: {rent_band_source}"
                )
                
                log_test(
                    "KPI-SAFE: platform's rentAmount UNCHANGED",
                    platform_rent_amount == original_rent_amount,
                    f"Original: {original_rent_amount}, Now: {platform_rent_amount}"
                )
                
                log_test(
                    "contentReady is true",
                    content_ready == True,
                    f"Got: {content_ready}"
                )
        else:
            log_test("Found Baglergaten property", False, "Property starting with 999db4b1 not found")
    
    print()
    
    # ========================================================================
    # SCENARIO 3: PUBLISHED PROPERTY PAGE
    # ========================================================================
    print("SCENARIO 3: PUBLISHED PROPERTY PAGE")
    print("-" * 80)
    
    if test_property_id:
        # Set visible
        response = requests.put(
            f"{BASE_URL}/api/admin/properties/visibility",
            params={"key": ADMIN_KEY},
            json={"id": test_property_id, "visible": True},
            timeout=30
        )
        log_test("Set property visible", response.status_code == 200, f"Status: {response.status_code}")
        
        # Get public listings
        response = requests.get(f"{BASE_URL}/api/public/listings", timeout=30)
        log_test("GET /api/public/listings returns 200", response.status_code == 200, f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            listings = data.get("listings", [])
            
            # Find our test property
            test_listing = None
            for listing in listings:
                if listing.get("id") == test_property_id:
                    test_listing = listing
                    break
            
            if test_listing:
                slug = test_listing.get("slug")
                rent_amount = test_listing.get("rentAmount")
                rent_text = test_listing.get("rentText")
                
                log_test(
                    "Public card has rentAmount = 21500",
                    rent_amount == 21500,
                    f"Got: {rent_amount}"
                )
                
                log_test(
                    "Public card has rentText = '21 500 kr/mnd'",
                    rent_text == "21 500 kr/mnd",
                    f"Got: {rent_text}"
                )
                
                # Check property page HTML
                if slug:
                    response = requests.get(f"{BASE_URL}/ledige-boliger/{slug}", timeout=30)
                    log_test("GET /ledige-boliger/<slug> returns 200", response.status_code == 200, f"Status: {response.status_code}")
                    
                    if response.status_code == 200:
                        html = response.text
                        
                        log_test(
                            "HTML contains '21 500'",
                            "21 500" in html or "21500" in html,
                            f"Found price in HTML"
                        )
                        
                        log_test(
                            "HTML contains 'Månedsleie'",
                            "Månedsleie" in html or "månedsleie" in html,
                            f"Found label in HTML"
                        )
                        
                        log_test(
                            "HTML does NOT contain 'prisantydning'",
                            "prisantydning" not in html.lower(),
                            f"No 'prisantydning' found"
                        )
                        
                        log_test(
                            "JSON-LD contains '\"price\":21500'",
                            '"price":21500' in html or '"price": 21500' in html,
                            f"Found exact price in JSON-LD"
                        )
                        
                        log_test(
                            "JSON-LD does NOT contain 'minPrice' or 'maxPrice'",
                            "minPrice" not in html and "maxPrice" not in html,
                            f"No price range in JSON-LD"
                        )
            else:
                log_test("Found test property in public listings", False, "Property not found in public feed")
    
    print()
    
    # ========================================================================
    # SCENARIO 4: NEWSLETTER AUTO-REFRESH
    # ========================================================================
    print("SCENARIO 4: NEWSLETTER AUTO-REFRESH")
    print("-" * 80)
    
    if test_property_id:
        # Get property externalId
        response = requests.get(f"{BASE_URL}/api/admin/properties", params={"key": ADMIN_KEY, "limit": 50}, timeout=30)
        if response.status_code == 200:
            properties = response.json().get("properties", [])
            external_id = None
            for prop in properties:
                if prop.get("id") == test_property_id:
                    external_id = prop.get("externalId")
                    break
            
            if external_id:
                # Get property details for newsletter block
                title = baglergaten.get("title", "Bolig")
                images = baglergaten.get("images", [])
                district = baglergaten.get("district", "Andre områder")
                
                # Create draft
                response = requests.post(
                    f"{BASE_URL}/api/admin/newsletter/draft",
                    params={"key": ADMIN_KEY},
                    json={"template": "boliger", "title": "QA månedsleie test"},
                    timeout=30
                )
                
                log_test("POST /api/admin/newsletter/draft returns 200/201", response.status_code in [200, 201], f"Status: {response.status_code}")
                
                if response.status_code in [200, 201]:
                    draft_data = response.json()
                    test_campaign_id = draft_data.get("campaign", {}).get("id")
                    
                    if test_campaign_id:
                        # Update draft with property block containing interval
                        # Include all required fields to prevent auto-refresh from removing the item
                        response = requests.put(
                            f"{BASE_URL}/api/admin/newsletter/draft",
                            params={"key": ADMIN_KEY},
                            json={
                                "id": test_campaign_id,
                                "blocks": [
                                    {
                                        "type": "text",
                                        "text": "QA-tekst så brevet har innhold."
                                    },
                                    {
                                        "type": "properties",
                                        "title": "Ledige boliger",
                                        "cta": "",
                                        "url": "",
                                        "items": [
                                            {
                                                "pid": external_id,
                                                "localId": test_property_id,
                                                "title": title,
                                                "image": images[0] if images else "",
                                                "band": "20 000–22 000 kr/mnd",  # Interval that should be replaced
                                                "status": "active",
                                                "district": district
                                            }
                                        ],
                                        "grouping": "off",
                                        "groupingThreshold": 6,
                                        "groupOrder": "auto"
                                    }
                                ]
                            },
                            timeout=30
                        )
                        
                        log_test("PUT /api/admin/newsletter/draft returns 200", response.status_code == 200, f"Status: {response.status_code}")
                        
                        # Get campaign to check auto-refresh
                        response = requests.get(
                            f"{BASE_URL}/api/admin/newsletter/campaign",
                            params={"key": ADMIN_KEY, "id": test_campaign_id},
                            timeout=30
                        )
                        
                        log_test("GET /api/admin/newsletter/campaign returns 200", response.status_code == 200, f"Status: {response.status_code}")
                        
                        if response.status_code == 200:
                            campaign = response.json().get("campaign", {})
                            blocks = campaign.get("blocks", [])
                            
                            # Find properties block
                            properties_block = None
                            for block in blocks:
                                if block.get("type") == "properties":
                                    properties_block = block
                                    break
                            
                            if properties_block:
                                items = properties_block.get("items", [])
                                if items:
                                    band = items[0].get("band")
                                    log_test(
                                        "Auto-refresh replaced interval with exact '21 500 kr/mnd'",
                                        band == "21 500 kr/mnd",
                                        f"Got: {band}"
                                    )
                                else:
                                    log_test("Properties block has items", False, "No items in block")
                            else:
                                log_test("Found properties block", False, "No properties block found")
    
    print()
    
    # ========================================================================
    # SCENARIO 5: ROOM RULE
    # ========================================================================
    print("SCENARIO 5: ROOM RULE")
    print("-" * 80)
    
    if test_property_id:
        # Set room rental scope
        response = requests.put(
            f"{BASE_URL}/api/admin/properties/fields",
            params={"key": ADMIN_KEY},
            json={
                "id": test_property_id,
                "fields": {
                    "rentalScope": "rom",
                    "roomsVacant": 2,
                    "roomsTotal": 4,
                    "rentAmount": 21500
                }
            },
            timeout=30
        )
        
        log_test("Set rentalScope='rom' with editorial price", response.status_code == 200, f"Status: {response.status_code}")
        
        # Check public card
        response = requests.get(f"{BASE_URL}/api/public/listings", timeout=30)
        if response.status_code == 200:
            listings = response.json().get("listings", [])
            test_listing = None
            for listing in listings:
                if listing.get("id") == test_property_id:
                    test_listing = listing
                    break
            
            if test_listing:
                rent_amount = test_listing.get("rentAmount")
                rent_scope_note = test_listing.get("rentScopeNote")
                
                log_test(
                    "Card shows editorial price with rentScopeNote='per rom'",
                    rent_amount == 21500 and rent_scope_note == "per rom",
                    f"rentAmount={rent_amount}, rentScopeNote={rent_scope_note}"
                )
        
        # Reset rentAmount to null (remove editorial price)
        response = requests.put(
            f"{BASE_URL}/api/admin/properties/fields",
            params={"key": ADMIN_KEY},
            json={
                "id": test_property_id,
                "fields": {"rentAmount": None}
            },
            timeout=30
        )
        
        log_test("Reset rentAmount to null", response.status_code == 200, f"Status: {response.status_code}")
        
        # Check that platform's whole-unit rent does NOT become room price
        # After removing editorial price, property should not be published (no price = blocked by gate)
        response = requests.get(f"{BASE_URL}/api/public/listings", timeout=30)
        if response.status_code == 200:
            listings = response.json().get("listings", [])
            test_listing = None
            for listing in listings:
                if listing.get("id") == test_property_id:
                    test_listing = listing
                    break
            
            # Property should NOT be in public listings without a price
            # This confirms platform's whole-unit rent was NOT converted to room price
            log_test(
                "Without editorial price, property not published (platform rent NOT converted to room price)",
                test_listing is None,
                f"Property correctly blocked by publishing gate (no price)"
            )
    
    print()
    
    # ========================================================================
    # SCENARIO 6: REGRESSION
    # ========================================================================
    print("SCENARIO 6: REGRESSION")
    print("-" * 80)
    
    response = requests.get(f"{BASE_URL}/api/public/listings", timeout=30)
    log_test("GET /api/public/listings returns 200", response.status_code == 200, f"Status: {response.status_code}")
    
    response = requests.get(f"{BASE_URL}/ledige-boliger", timeout=30)
    log_test("GET /ledige-boliger returns 200", response.status_code == 200, f"Status: {response.status_code}")
    
    response = requests.get(f"{BASE_URL}/api/admin/properties", params={"key": ADMIN_KEY}, timeout=30)
    log_test("GET /api/admin/properties returns 200", response.status_code == 200, f"Status: {response.status_code}")
    if response.status_code == 200:
        total = response.json().get("total", 0)
        log_test("Total properties is 22", total == 22, f"Got: {total}")
    
    # Test POST /api/tenants with @example.com
    response = requests.post(
        f"{BASE_URL}/api/tenants",
        json={
            "name": "QA Rent Test",
            "email": "qa-rent-test@example.com",
            "phone": "+4790000099",
            "preferred_area": "Bergen sentrum",
            "budget_max": 15000,
            "bedrooms": 2
        },
        timeout=30
    )
    log_test("POST /api/tenants with @example.com returns 200/201", response.status_code in [200, 201], f"Status: {response.status_code}")
    if response.status_code in [200, 201]:
        tenant_data = response.json()
        tenant_id = tenant_data.get("tenant", {}).get("id") or tenant_data.get("data", {}).get("id")
        if tenant_id:
            test_tenant_ids.append(tenant_id)
    
    response = requests.get(f"{BASE_URL}/api/admin/housing-alerts", params={"key": ADMIN_KEY}, timeout=30)
    log_test("GET /api/admin/housing-alerts returns 200", response.status_code == 200, f"Status: {response.status_code}")
    
    print()

except Exception as e:
    print(f"❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()

finally:
    # ========================================================================
    # MANDATORY CLEANUP
    # ========================================================================
    print("=" * 80)
    print("MANDATORY CLEANUP")
    print("=" * 80)
    
    cleanup_success = True
    
    # Reset property
    if test_property_id:
        # Set visible=false
        response = requests.put(
            f"{BASE_URL}/api/admin/properties/visibility",
            params={"key": ADMIN_KEY},
            json={"id": test_property_id, "visible": False},
            timeout=30
        )
        if response.status_code == 200:
            print(f"✅ Set property visible=false")
        else:
            print(f"❌ Failed to set visible=false: {response.status_code}")
            cleanup_success = False
        
        # Reset all editorial fields
        response = requests.put(
            f"{BASE_URL}/api/admin/properties/fields",
            params={"key": ADMIN_KEY},
            json={"id": test_property_id, "resetAll": True},
            timeout=30
        )
        if response.status_code == 200:
            print(f"✅ Reset all editorial fields")
        else:
            print(f"❌ Failed to reset fields: {response.status_code}")
            cleanup_success = False
    
    # Delete test tenants
    for tenant_id in test_tenant_ids:
        response = requests.post(
            f"{BASE_URL}/api/admin/leads/delete",
            params={"key": ADMIN_KEY},
            json={"id": tenant_id, "type": "tenant", "confirm": "SLETT"},
            timeout=30
        )
        if response.status_code == 200:
            print(f"✅ Deleted test tenant {tenant_id[:8]}...")
        else:
            print(f"❌ Failed to delete tenant {tenant_id[:8]}...: {response.status_code}")
            cleanup_success = False
    
    # Delete test campaign
    if test_campaign_id:
        response = requests.delete(
            f"{BASE_URL}/api/admin/newsletter/campaign",
            params={"key": ADMIN_KEY, "id": test_campaign_id},
            timeout=30
        )
        if response.status_code == 200:
            print(f"✅ Deleted test campaign {test_campaign_id[:8]}...")
        else:
            print(f"❌ Failed to delete campaign: {response.status_code}")
            cleanup_success = False
    
    # Verify no published properties
    response = requests.get(f"{BASE_URL}/api/public/listings", timeout=30)
    if response.status_code == 200:
        total = response.json().get("total", 0)
        if total == 0:
            print(f"✅ Verified GET /api/public/listings returns total=0")
        else:
            print(f"❌ GET /api/public/listings returns total={total} (expected 0)")
            cleanup_success = False
    
    if not cleanup_success:
        print("\n⚠️  Some cleanup steps failed - please review manually")
    
    print()

# ========================================================================
# SUMMARY
# ========================================================================
print("=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"✅ PASSED: {tests_passed}")
print(f"❌ FAILED: {tests_failed}")
print(f"📊 TOTAL:  {tests_passed + tests_failed}")
print()

if tests_failed == 0:
    print("🎉 ALL TESTS PASSED!")
    sys.exit(0)
else:
    print("⚠️  SOME TESTS FAILED")
    sys.exit(1)
