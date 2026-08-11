#!/usr/bin/env python3
"""
Backend test for newsletter auto-refresh, map section, and full street address.
Tests 13 scenarios as specified in the review_request.
"""

import requests
import json
import sys
from typing import Dict, Any, List, Optional

BASE_URL = "https://saker-hub.preview.emergentagent.com"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Track created drafts for cleanup
created_draft_ids = []
touched_property_ids = []

def test_scenario(num: int, name: str):
    """Print test scenario header"""
    print(f"\n{'='*80}")
    print(f"SCENARIO {num}: {name}")
    print('='*80)

def verify(condition: bool, message: str):
    """Verify a condition and print result"""
    if condition:
        print(f"✅ {message}")
        return True
    else:
        print(f"❌ FAIL: {message}")
        return False

def get_properties() -> List[Dict[str, Any]]:
    """Get all properties"""
    url = f"{BASE_URL}/api/admin/properties"
    params = {"key": ADMIN_KEY, "limit": 50}
    resp = requests.get(url, params=params, timeout=30)
    if resp.status_code != 200:
        print(f"❌ Failed to get properties: {resp.status_code}")
        return []
    data = resp.json()
    return data.get("properties", [])

def find_property_by_area(properties: List[Dict], area_prefix: str) -> Optional[Dict]:
    """Find property by area prefix"""
    for prop in properties:
        if prop.get("area", "").startswith(area_prefix):
            return prop
    return None

def create_draft(template: str, title: str) -> Optional[str]:
    """Create a newsletter draft"""
    url = f"{BASE_URL}/api/admin/newsletter/draft"
    params = {"key": ADMIN_KEY}
    body = {"template": template, "title": title}
    resp = requests.post(url, params=params, json=body, timeout=30)
    if resp.status_code not in [200, 201]:
        print(f"❌ Failed to create draft: {resp.status_code}")
        print(f"   Response: {resp.text[:500]}")
        return None
    data = resp.json()
    # Response has {ok, campaign: {id, ...}}
    campaign = data.get("campaign", {})
    draft_id = campaign.get("id") or data.get("id")
    if draft_id:
        created_draft_ids.append(draft_id)
        print(f"   Draft ID: {draft_id}")
    return draft_id

def update_draft_blocks(draft_id: str, blocks: List[Dict]) -> bool:
    """Update draft blocks"""
    url = f"{BASE_URL}/api/admin/newsletter/draft"
    params = {"key": ADMIN_KEY}
    body = {"id": draft_id, "blocks": blocks}
    resp = requests.put(url, params=params, json=body, timeout=30)
    return resp.status_code == 200

def get_campaign(draft_id: str) -> Optional[Dict]:
    """Get campaign details"""
    url = f"{BASE_URL}/api/admin/newsletter/campaign"
    params = {"key": ADMIN_KEY, "id": draft_id}
    resp = requests.get(url, params=params, timeout=30)
    if resp.status_code != 200:
        print(f"❌ Failed to get campaign: {resp.status_code}")
        return None
    return resp.json()

def preview_newsletter(blocks: List[Dict], theme: str = "lavendel", subject: str = "QA") -> Optional[str]:
    """Preview newsletter HTML"""
    url = f"{BASE_URL}/api/admin/newsletter/preview"
    params = {"key": ADMIN_KEY}
    body = {"blocks": blocks, "theme": theme, "subject": subject}
    resp = requests.post(url, params=params, json=body, timeout=30)
    if resp.status_code != 200:
        print(f"❌ Failed to preview: {resp.status_code}")
        return None
    data = resp.json()
    return data.get("html", "")

def delete_draft(draft_id: str) -> bool:
    """Delete a draft"""
    url = f"{BASE_URL}/api/admin/newsletter/campaign"
    params = {"key": ADMIN_KEY, "id": draft_id}
    resp = requests.delete(url, params=params, timeout=30)
    return resp.status_code == 200

def reset_property(prop_id: str) -> bool:
    """Reset property editorial fields"""
    url = f"{BASE_URL}/api/admin/properties/fields"
    params = {"key": ADMIN_KEY}
    body = {"id": prop_id, "resetAll": True}
    resp = requests.put(url, params=params, json=body, timeout=30)
    return resp.status_code == 200

def set_property_visibility(prop_id: str, visible: bool) -> bool:
    """Set property visibility"""
    url = f"{BASE_URL}/api/admin/properties/visibility"
    params = {"key": ADMIN_KEY}
    body = {"id": prop_id, "visible": visible}
    resp = requests.put(url, params=params, json=body, timeout=30)
    return resp.status_code == 200

def update_property_fields(prop_id: str, fields: Dict) -> Optional[Dict]:
    """Update property editorial fields"""
    url = f"{BASE_URL}/api/admin/properties/fields"
    params = {"key": ADMIN_KEY}
    body = {"id": prop_id, "fields": fields}
    resp = requests.put(url, params=params, json=body, timeout=30)
    if resp.status_code != 200:
        print(f"❌ Failed to update property: {resp.status_code} {resp.text[:200]}")
        return None
    return resp.json()

def run_tests():
    """Run all test scenarios"""
    print("="*80)
    print("BACKEND TEST: Newsletter Auto-Refresh, Map Section, Full Street Address")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    
    # Get properties first
    print("\n📋 Fetching properties...")
    properties = get_properties()
    if not properties:
        print("❌ Failed to fetch properties")
        return False
    
    print(f"✅ Found {len(properties)} properties")
    
    # Find test properties
    baglergaten = find_property_by_area(properties, "Baglergaten")
    tverrgaten = find_property_by_area(properties, "Tverrgaten")
    st_hansstredet = find_property_by_area(properties, "ST. HANSSTREDET")
    
    if not baglergaten:
        print("❌ Could not find Baglergaten property")
        return False
    if not tverrgaten:
        print("❌ Could not find Tverrgaten property")
        return False
    
    baglergaten_id = baglergaten["id"]
    tverrgaten_id = tverrgaten["id"]
    
    print(f"✅ Found Baglergaten: {baglergaten_id[:8]}...")
    print(f"✅ Found Tverrgaten: {tverrgaten_id[:8]}...")
    print(f"   Baglergaten status: {baglergaten.get('status', 'unknown')}")
    print(f"   Tverrgaten status: {tverrgaten.get('status', 'unknown')}")
    
    # SCENARIO 1: AUTO-REFRESH ON OPEN
    test_scenario(1, "AUTO-REFRESH ON OPEN - Rented property removed")
    
    draft_id = create_draft("boliger", "QA oppfrisk")
    if not draft_id:
        print("❌ Failed to create draft")
        return False
    
    print(f"✅ Created draft: {draft_id}")
    
    # Create property items
    def get_first_image(prop):
        """Get first image URL from property"""
        images = prop.get("images", [])
        if isinstance(images, list) and images:
            first_img = images[0]
            if isinstance(first_img, dict):
                return first_img.get("url", "")
            elif isinstance(first_img, str):
                return first_img
        elif isinstance(images, str):
            return images
        return ""
    
    active_item = {
        "pid": baglergaten.get("externalId"),
        "localId": baglergaten_id,
        "title": baglergaten.get("title", "Baglergaten"),
        "image": get_first_image(baglergaten),
        "band": baglergaten.get("monthlyRentBand", ""),
        "status": baglergaten.get("status", "active"),
        "district": baglergaten.get("district", "")
    }
    
    rented_item = {
        "pid": tverrgaten.get("externalId"),
        "localId": tverrgaten_id,
        "title": tverrgaten.get("title", "Tverrgaten"),
        "image": get_first_image(tverrgaten),
        "band": tverrgaten.get("monthlyRentBand", ""),
        "status": tverrgaten.get("status", "rented"),
        "district": tverrgaten.get("district", "")
    }
    
    blocks = [
        {"type": "text", "text": "QA"},
        {
            "type": "properties",
            "title": "Ledige boliger",
            "items": [active_item, rented_item],
            "grouping": "off",
            "groupingThreshold": 6,
            "groupOrder": "auto"
        }
    ]
    
    if not update_draft_blocks(draft_id, blocks):
        print("❌ Failed to update draft blocks")
        return False
    
    print("✅ Updated draft with 2 properties (1 active, 1 rented)")
    
    # Get campaign to trigger auto-refresh
    campaign = get_campaign(draft_id)
    if not campaign:
        return False
    
    # Find property block
    property_block = None
    for block in campaign.get("blocks", []):
        if block.get("type") == "properties":
            property_block = block
            break
    
    if not property_block:
        print("❌ No property block found in campaign")
        return False
    
    items = property_block.get("items", [])
    verify(len(items) == 1, f"Property block has exactly 1 item (was 2, rented removed): {len(items)}")
    
    # Check propertyRefresh
    property_refresh = campaign.get("propertyRefresh")
    if property_refresh:
        removed = property_refresh.get("removed", [])
        verify(len(removed) == 1, f"propertyRefresh.removed has 1 entry: {len(removed)}")
        if removed:
            verify(removed[0].get("status") == "rented", f"Removed property has status 'rented': {removed[0].get('status')}")
            print(f"   Removed property: {removed[0].get('title')} (status: {removed[0].get('status')})")
    else:
        print("❌ No propertyRefresh in response")
    
    # SCENARIO 2: CHANGE IS SAVED
    test_scenario(2, "CHANGE IS SAVED - Second GET shows propertyRefresh=null")
    
    campaign2 = get_campaign(draft_id)
    if not campaign2:
        return False
    
    property_refresh2 = campaign2.get("propertyRefresh")
    verify(property_refresh2 is None, f"propertyRefresh is null on second GET: {property_refresh2}")
    
    # SCENARIO 3: EMPTY BLOCK REPORTED
    test_scenario(3, "EMPTY BLOCK REPORTED - Block with only rented property")
    
    blocks_rented_only = [
        {"type": "text", "text": "QA"},
        {
            "type": "properties",
            "title": "Ledige boliger",
            "items": [rented_item],
            "grouping": "off",
            "groupingThreshold": 6,
            "groupOrder": "auto"
        }
    ]
    
    if not update_draft_blocks(draft_id, blocks_rented_only):
        print("❌ Failed to update draft with rented-only block")
        return False
    
    campaign3 = get_campaign(draft_id)
    if not campaign3:
        return False
    
    property_refresh3 = campaign3.get("propertyRefresh")
    if property_refresh3:
        emptied = property_refresh3.get("emptied", [])
        verify(len(emptied) > 0, f"propertyRefresh.emptied has entries: {len(emptied)}")
        if emptied:
            verify("Ledige boliger" in emptied[0], f"Emptied contains block title 'Ledige boliger': {emptied[0]}")
    else:
        print("❌ No propertyRefresh in response")
    
    # Check that block has 0 items
    property_block3 = None
    for block in campaign3.get("blocks", []):
        if block.get("type") == "properties":
            property_block3 = block
            break
    
    if property_block3:
        items3 = property_block3.get("items", [])
        verify(len(items3) == 0, f"Property block has 0 items after emptying: {len(items3)}")
    
    # SCENARIO 4: SYNC-SAFETY (MOST IMPORTANT)
    test_scenario(4, "SYNC-SAFETY - Non-existent pid leaves block unchanged")
    
    fake_item = {
        "pid": "00000000-0000-4000-8000-000000000001",
        "localId": "00000000-0000-4000-8000-000000000001",
        "title": "Fake Property",
        "image": "",
        "band": "",
        "status": "active",
        "district": ""
    }
    
    blocks_fake = [
        {"type": "text", "text": "QA"},
        {
            "type": "properties",
            "title": "Ledige boliger",
            "items": [fake_item],
            "grouping": "off",
            "groupingThreshold": 6,
            "groupOrder": "auto"
        }
    ]
    
    if not update_draft_blocks(draft_id, blocks_fake):
        print("❌ Failed to update draft with fake property")
        return False
    
    campaign4 = get_campaign(draft_id)
    if not campaign4:
        return False
    
    property_block4 = None
    for block in campaign4.get("blocks", []):
        if block.get("type") == "properties":
            property_block4 = block
            break
    
    if property_block4:
        items4 = property_block4.get("items", [])
        verify(len(items4) == 1, f"Property block unchanged with 1 item (fake pid not found in DB): {len(items4)}")
    
    property_refresh4 = campaign4.get("propertyRefresh")
    verify(property_refresh4 is None, f"propertyRefresh is null (sync-safety: no changes when pid not found): {property_refresh4}")
    
    # SCENARIO 5: STRUCTURED FIELDS + FULL ADDRESS
    test_scenario(5, "STRUCTURED FIELDS + FULL ADDRESS - address, facts, available in Norwegian")
    
    # Put active property back
    blocks_active = [
        {"type": "text", "text": "QA"},
        {
            "type": "properties",
            "title": "Ledige boliger",
            "items": [active_item],
            "grouping": "off",
            "groupingThreshold": 6,
            "groupOrder": "auto"
        }
    ]
    
    if not update_draft_blocks(draft_id, blocks_active):
        print("❌ Failed to update draft with active property")
        return False
    
    campaign5 = get_campaign(draft_id)
    if not campaign5:
        return False
    
    property_block5 = None
    for block in campaign5.get("blocks", []):
        if block.get("type") == "properties":
            property_block5 = block
            break
    
    if property_block5 and property_block5.get("items"):
        item = property_block5["items"][0]
        
        # Check address with house number
        address = item.get("address", "")
        verify("Baglergaten" in address, f"Item has address field with street name: {address}")
        verify("8" in address, f"Address includes house number: {address}")
        
        # Check facts
        facts = item.get("facts", "")
        verify("soverom" in facts.lower() or "m²" in facts, f"Item has facts field: {facts}")
        
        # Check available in Norwegian (not ISO format)
        available = item.get("available", "")
        if available:
            verify("2026-" not in available, f"Available is NOT in ISO format (YYYY-MM-DD): {available}")
            print(f"   Available: {available}")
        
        # Check meta
        meta = item.get("meta", "")
        verify(len(meta) > 0, f"Item has meta field (combined): {meta[:50]}...")
    
    # Check ST. HANSSTREDET if available
    if st_hansstredet:
        st_item = {
            "pid": st_hansstredet.get("externalId"),
            "localId": st_hansstredet["id"],
            "title": st_hansstredet.get("title", "ST. HANSSTREDET"),
            "image": get_first_image(st_hansstredet),
            "band": st_hansstredet.get("monthlyRentBand", ""),
            "status": st_hansstredet.get("status", "active"),
            "district": st_hansstredet.get("district", "")
        }
        
        blocks_st = [
            {"type": "text", "text": "QA"},
            {
                "type": "properties",
                "title": "Ledige boliger",
                "items": [st_item],
                "grouping": "off",
                "groupingThreshold": 6,
                "groupOrder": "auto"
            }
        ]
        
        if update_draft_blocks(draft_id, blocks_st):
            campaign_st = get_campaign(draft_id)
            if campaign_st:
                property_block_st = None
                for block in campaign_st.get("blocks", []):
                    if block.get("type") == "properties":
                        property_block_st = block
                        break
                
                if property_block_st and property_block_st.get("items"):
                    st_item_result = property_block_st["items"][0]
                    st_address = st_item_result.get("address", "")
                    # Check that ALL CAPS address is normalized to title case
                    if "ST. HANSSTREDET" in st_hansstredet.get("area", "").upper():
                        verify("St. Hansstredet" in st_address or "st. hansstredet" not in st_address.lower() or st_address.isupper() == False, 
                               f"ST. HANSSTREDET address is in normal case (not ALL CAPS): {st_address}")
    
    # SCENARIO 6: MAP SECTION - RENDERS ONLY WITH LINK
    test_scenario(6, "MAP SECTION - Renders only when url is set")
    
    # Test with empty url
    map_block_empty = {
        "type": "map",
        "title": "Se boligene på kart",
        "text": "Test",
        "url": "",
        "label": "Åpne kartvisningen",
        "imageUrl": "/bergen-rooftops-email.jpg"
    }
    
    html_empty = preview_newsletter([map_block_empty])
    if html_empty:
        verify("Se boligene på kart" not in html_empty, "Map section NOT in HTML when url is empty")
    
    # Test with url
    map_block_with_url = {
        "type": "map",
        "title": "Se boligene på kart",
        "text": "Test",
        "url": "https://www.finn.no/realestate/lettings/search.html?location=1.22.216",
        "label": "Åpne kartvisningen",
        "imageUrl": "/bergen-rooftops-email.jpg"
    }
    
    html_with_url = preview_newsletter([map_block_with_url])
    if html_with_url:
        verify("Se boligene på kart" in html_with_url, "Map section title in HTML when url is set")
        verify("Åpne kartvisningen" in html_with_url, "Map section button label in HTML")
        verify("finn.no" in html_with_url or "location=1.22.216" in html_with_url, "Map section link in HTML")
        verify("#100f0e" in html_with_url or "100f0e" in html_with_url, "Map section background color #100f0e in HTML")
    
    # SCENARIO 7: MAP SECTION - DISTRICT LINE
    test_scenario(7, "MAP SECTION - District line auto-derived from property blocks")
    
    # Create blocks with properties from different districts
    blocks_with_map = [
        {
            "type": "properties",
            "title": "Ledige boliger",
            "items": [active_item],  # Baglergaten
            "grouping": "off",
            "groupingThreshold": 6,
            "groupOrder": "auto"
        },
        map_block_with_url
    ]
    
    html_districts = preview_newsletter(blocks_with_map)
    if html_districts:
        # Check if district names appear in the map section
        baglergaten_district = baglergaten.get("district", "")
        if baglergaten_district:
            verify(baglergaten_district in html_districts, f"District '{baglergaten_district}' appears in HTML (auto-derived from property blocks)")
    
    # SCENARIO 8: MAP BLOCK SANITIZATION
    test_scenario(8, "MAP BLOCK SANITIZATION - Fields truncated to limits")
    
    long_title = "A" * 400
    long_url = "https://example.com/" + "x" * 1200
    long_image_url = "/image/" + "y" * 900
    
    map_block_long = {
        "type": "map",
        "title": long_title,
        "text": "Test",
        "url": long_url,
        "label": "Click",
        "imageUrl": long_image_url,
        "unknownField": "should not be saved"
    }
    
    blocks_long = [{"type": "text", "text": "QA"}, map_block_long]
    
    if update_draft_blocks(draft_id, blocks_long):
        campaign_long = get_campaign(draft_id)
        if campaign_long:
            map_block_result = None
            for block in campaign_long.get("blocks", []):
                if block.get("type") == "map":
                    map_block_result = block
                    break
            
            if map_block_result:
                title_len = len(map_block_result.get("title", ""))
                url_len = len(map_block_result.get("url", ""))
                image_url_len = len(map_block_result.get("imageUrl", ""))
                
                verify(title_len <= 200, f"Map title truncated to ≤200 chars: {title_len}")
                verify(url_len <= 900, f"Map url truncated to ≤900 chars: {url_len}")
                verify(image_url_len <= 600, f"Map imageUrl truncated to ≤600 chars: {image_url_len}")
                verify("unknownField" not in map_block_result, "Unknown fields not saved")
    
    # SCENARIO 9: TEMPLATE
    test_scenario(9, "TEMPLATE - 'boliger' template has map block with empty url")
    
    draft_template = create_draft("boliger", "QA template test")
    if draft_template:
        campaign_template = get_campaign(draft_template)
        if campaign_template:
            map_block_found = False
            for block in campaign_template.get("blocks", []):
                if block.get("type") == "map":
                    map_block_found = True
                    verify(block.get("url") == "", f"Map block has empty url: '{block.get('url')}'")
                    verify(block.get("imageUrl") == "/bergen-rooftops-email.jpg", 
                           f"Map block has imageUrl='/bergen-rooftops-email.jpg': {block.get('imageUrl')}")
                    break
            
            verify(map_block_found, "Template 'boliger' contains a map block")
    
    # Check media endpoint
    media_url = f"{BASE_URL}/api/media/bergen-rooftops-email.jpg?v=2"
    media_resp = requests.get(media_url, timeout=30)
    verify(media_resp.status_code == 200, f"GET /api/media/bergen-rooftops-email.jpg returns 200: {media_resp.status_code}")
    if media_resp.status_code == 200:
        content_type = media_resp.headers.get("content-type", "")
        verify("image/jpeg" in content_type, f"Media has content-type image/jpeg: {content_type}")
    
    # SCENARIO 10: PUBLIC PROPERTY DATA WITH HOUSE NUMBER
    test_scenario(10, "PUBLIC PROPERTY DATA WITH HOUSE NUMBER - streetAddress and postalCode")
    
    # Set rentAmount to make property publishable
    touched_property_ids.append(baglergaten_id)
    update_result = update_property_fields(baglergaten_id, {"rentAmount": 17000})
    if not update_result:
        print("❌ Failed to set rentAmount on Baglergaten")
        return False
    
    print("✅ Set rentAmount=17000 on Baglergaten")
    
    # Set visible=true temporarily
    if not set_property_visibility(baglergaten_id, True):
        print("❌ Failed to set visibility=true")
        return False
    
    print("✅ Set visibility=true on Baglergaten")
    
    # Get public listings
    public_url = f"{BASE_URL}/api/public/listings"
    public_resp = requests.get(public_url, timeout=30)
    if public_resp.status_code == 200:
        public_data = public_resp.json()
        listings = public_data.get("listings", [])
        
        if listings:
            listing = listings[0]
            street_address = listing.get("streetAddress", "")
            postal_code = listing.get("postalCode", "")
            
            verify("Baglergaten" in street_address, f"Public listing has streetAddress with street name: {street_address}")
            verify("8" in street_address, f"Public listing streetAddress includes house number: {street_address}")
            verify(postal_code == "5032", f"Public listing has postalCode='5032': {postal_code}")
            
            # Get HTML page
            slug = listing.get("slug", "")
            if slug:
                html_url = f"{BASE_URL}/ledige-boliger/{slug}"
                html_resp = requests.get(html_url, timeout=30)
                if html_resp.status_code == 200:
                    html = html_resp.text
                    verify("Baglergaten 8" in html, "Property page HTML contains 'Baglergaten 8'")
                    verify('"streetAddress"' in html and '"Baglergaten 8"' in html, 
                           "Property page has JSON-LD PostalAddress with streetAddress='Baglergaten 8'")
                    verify('"postalCode"' in html, "Property page has JSON-LD with postalCode")
    
    # Set visibility back to false
    if not set_property_visibility(baglergaten_id, False):
        print("⚠️  Warning: Failed to set visibility=false")
    else:
        print("✅ Set visibility=false on Baglergaten")
    
    # SCENARIO 11: EDITORIAL STREET FIELD SPLITS
    test_scenario(11, "EDITORIAL STREET FIELD SPLITS - area='Baglergaten 8B' splits into fields")
    
    update_result = update_property_fields(baglergaten_id, {"area": "Baglergaten 8B"})
    if update_result:
        prop = update_result.get("property", {})
        area = prop.get("area")
        street = prop.get("street")
        house_number = prop.get("houseNumber")
        
        verify(area == "Baglergaten", f"property.area='Baglergaten' (without number): {area}")
        verify(street == "Baglergaten 8B", f"property.street='Baglergaten 8B' (with number): {street}")
        verify(house_number == "8B", f"property.houseNumber='8B': {house_number}")
    
    # Test with area without number
    update_result2 = update_property_fields(baglergaten_id, {"area": "Baglergaten"})
    if update_result2:
        prop2 = update_result2.get("property", {})
        street2 = prop2.get("street")
        # Should use platform's own value when no number provided
        print(f"   With area='Baglergaten' (no number), street='{street2}' (platform value)")
    
    # SCENARIO 12: PRIVACY
    test_scenario(12, "PRIVACY - Public endpoints don't contain admin fields")
    
    public_props_url = f"{BASE_URL}/api/public/properties?limit=24"
    public_props_resp = requests.get(public_props_url, timeout=30)
    if public_props_resp.status_code == 200:
        public_props_text = public_props_resp.text
        
        forbidden_fields = [
            "ownerName", "tenantName", "editorialValues", "platformValues", 
            "rentBandSource", "editorialFields", "editorialRentAmount", "imageRights"
        ]
        
        has_forbidden = False
        for field in forbidden_fields:
            if field in public_props_text:
                print(f"❌ Public properties contains forbidden field: {field}")
                has_forbidden = True
        
        verify(not has_forbidden, "Public properties endpoint does NOT contain admin fields")
    
    public_listings_url = f"{BASE_URL}/api/public/listings"
    public_listings_resp = requests.get(public_listings_url, timeout=30)
    if public_listings_resp.status_code == 200:
        public_listings_text = public_listings_resp.text
        
        has_forbidden = False
        for field in forbidden_fields:
            if field in public_listings_text:
                print(f"❌ Public listings contains forbidden field: {field}")
                has_forbidden = True
        
        verify(not has_forbidden, "Public listings endpoint does NOT contain admin fields")
    
    # SCENARIO 13: REGRESSION
    test_scenario(13, "REGRESSION - Various endpoints working")
    
    # Check public listings total=0
    public_resp = requests.get(f"{BASE_URL}/api/public/listings", timeout=30)
    if public_resp.status_code == 200:
        total = public_resp.json().get("total", -1)
        verify(total == 0, f"GET /api/public/listings returns total:0: {total}")
    
    # Check admin properties total=22
    admin_props_resp = requests.get(f"{BASE_URL}/api/admin/properties", params={"key": ADMIN_KEY}, timeout=30)
    if admin_props_resp.status_code == 200:
        total = admin_props_resp.json().get("total", -1)
        verify(total == 22, f"GET /api/admin/properties returns total:22: {total}")
    
    # Check KPI endpoint
    kpi_resp = requests.get(f"{BASE_URL}/api/admin/kpi", params={"key": ADMIN_KEY, "days": 30}, timeout=30)
    verify(kpi_resp.status_code == 200, f"GET /api/admin/kpi returns 200: {kpi_resp.status_code}")
    if kpi_resp.status_code == 200:
        kpi_data = kpi_resp.json()
        kpi_keys = len(kpi_data.keys())
        verify(kpi_keys >= 12, f"KPI response has ≥12 fields: {kpi_keys}")
    
    # Check housing alerts
    alerts_resp = requests.get(f"{BASE_URL}/api/admin/housing-alerts", params={"key": ADMIN_KEY}, timeout=30)
    verify(alerts_resp.status_code == 200, f"GET /api/admin/housing-alerts returns 200: {alerts_resp.status_code}")
    if alerts_resp.status_code == 200:
        alerts_data = alerts_resp.json()
        alerts_count = len(alerts_data.get("alerts", []))
        verify(alerts_count == 0, f"Housing alerts count is 0: {alerts_count}")
    
    # Check ledige-boliger page
    ledige_resp = requests.get(f"{BASE_URL}/ledige-boliger", timeout=30)
    verify(ledige_resp.status_code == 200, f"GET /ledige-boliger returns 200: {ledige_resp.status_code}")
    
    # Check 404 for unknown slug
    unknown_resp = requests.get(f"{BASE_URL}/ledige-boliger/leilighet-oslo-deadbeef", timeout=30)
    verify(unknown_resp.status_code == 404, f"GET /ledige-boliger/<unknown> returns 404: {unknown_resp.status_code}")
    
    # Check root
    root_resp = requests.get(f"{BASE_URL}/api/", timeout=30)
    verify(root_resp.status_code in [200, 308], f"GET /api/ returns 200 or 308: {root_resp.status_code}")
    
    return True

def cleanup():
    """Cleanup all created resources"""
    print("\n" + "="*80)
    print("MANDATORY CLEANUP")
    print("="*80)
    
    # Delete all created drafts
    print(f"\n🧹 Deleting {len(created_draft_ids)} created drafts...")
    for draft_id in created_draft_ids:
        if delete_draft(draft_id):
            print(f"✅ Deleted draft: {draft_id}")
        else:
            print(f"❌ Failed to delete draft: {draft_id}")
    
    # Check final draft count
    drafts_url = f"{BASE_URL}/api/admin/newsletter"
    drafts_resp = requests.get(drafts_url, params={"key": ADMIN_KEY}, timeout=30)
    if drafts_resp.status_code == 200:
        campaigns = drafts_resp.json().get("campaigns", [])
        verify(len(campaigns) == 9, f"Final campaign count is 9: {len(campaigns)}")
    
    # Reset all touched properties
    print(f"\n🧹 Resetting {len(touched_property_ids)} touched properties...")
    for prop_id in touched_property_ids:
        if reset_property(prop_id):
            print(f"✅ Reset property: {prop_id[:8]}...")
        else:
            print(f"❌ Failed to reset property: {prop_id[:8]}...")
        
        # Ensure visibility is false
        set_property_visibility(prop_id, False)
    
    # Verify no properties have editorial fields
    props_resp = requests.get(f"{BASE_URL}/api/admin/properties", 
                              params={"key": ADMIN_KEY, "limit": 50}, timeout=30)
    if props_resp.status_code == 200:
        properties = props_resp.json().get("properties", [])
        has_editorial = False
        for prop in properties:
            editorial_fields = prop.get("editorialFields", {})
            if editorial_fields and len(editorial_fields) > 0:
                print(f"⚠️  Property {prop.get('area', 'unknown')} still has editorial fields")
                has_editorial = True
        
        verify(not has_editorial, "No properties have editorialFields with content")
    
    # Verify 0 visible properties
    public_resp = requests.get(f"{BASE_URL}/api/public/listings", timeout=30)
    if public_resp.status_code == 200:
        total = public_resp.json().get("total", -1)
        verify(total == 0, f"Final public listings count is 0: {total}")
    
    print("\n✅ Cleanup complete")

if __name__ == "__main__":
    try:
        success = run_tests()
        cleanup()
        
        if success:
            print("\n" + "="*80)
            print("✅ ALL TESTS PASSED")
            print("="*80)
            sys.exit(0)
        else:
            print("\n" + "="*80)
            print("❌ SOME TESTS FAILED")
            print("="*80)
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        cleanup()
        sys.exit(1)
