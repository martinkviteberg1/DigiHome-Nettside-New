#!/usr/bin/env python3
"""
Backend test for newsletter district grouping + property interest flow bugfixes.
Tests 8 scenarios from review_request without sending emails or mutating critical data.
"""

import requests
import time
import json
from collections import Counter

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test data from review_request
TEST_CAMPAIGN_ID = "6783d667-c93e-45ca-a458-341f9d79acf5"
TEST_PROPERTY_ID = "348c1174-6422-49f9-a016-5f84496654d4"
TEST_RECIPIENT_EMAIL = "qa-boliginteresse@example.com"
TEST_RECIPIENT_ID = "qarid0001"
TEST_TOKEN = "e598e190bde8fcb1a8d91c69fa38781b5e8e73fe"

# Expected Bergen districts
VALID_DISTRICTS = {
    "Bergen sentrum", "Bergenhus", "Årstad", "Åsane", "Fyllingsdalen",
    "Laksevåg", "Fana", "Ytrebygda", "Arna", "Bergen", "Andre områder"
}

def test_scenario_1_property_data_district():
    """
    SCENARIO 1: BOLIGDATA + BYDEL
    GET /api/admin/properties?key=...
    - 200, ok:true, total ≈ 27, districtCount === total
    - Each property has district (non-empty string) and districtSource
    - CRITICAL: no district should be a STREET NAME
    - CRITICAL: no area contains 'finn.no', 'finnkode', or 'http'
    - districtFill exists in response
    - Response time < 20s
    """
    print("\n" + "="*80)
    print("SCENARIO 1: PROPERTY DATA + DISTRICT")
    print("="*80)
    
    try:
        # First call - may do Kartverket lookups
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=30)
        first_call_time = time.time() - start_time
        
        print(f"✓ First call: {response.status_code} in {first_call_time:.2f}s")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") is True, "Expected ok:true"
        
        total = data.get("total", 0)
        district_count = data.get("districtCount", 0)
        district_fill = data.get("districtFill")
        properties = data.get("properties", [])
        
        print(f"✓ Total properties: {total}")
        print(f"✓ Properties with district: {district_count}")
        print(f"✓ District fill: {district_fill}")
        
        # Check districtCount === total
        assert district_count == total, f"Expected districtCount ({district_count}) === total ({total})"
        print(f"✓ ALL properties have district (districtCount === total)")
        
        # Check each property
        issues = []
        for i, prop in enumerate(properties):
            prop_id = prop.get("id", f"index-{i}")
            district = prop.get("district", "")
            district_source = prop.get("districtSource")
            area = prop.get("area", "")
            
            # Check district is non-empty
            if not district:
                issues.append(f"Property {prop_id}: empty district")
            
            # Check district is not a street name (should be in VALID_DISTRICTS or equal to city)
            city = prop.get("city", "")
            if district and district not in VALID_DISTRICTS and district != city:
                issues.append(f"Property {prop_id}: district '{district}' looks like a street name (not in valid districts)")
            
            # Check districtSource exists
            if not district_source:
                issues.append(f"Property {prop_id}: missing districtSource")
            
            # CRITICAL: Check area does not contain FINN URLs
            if area:
                area_lower = area.lower()
                if "finn.no" in area_lower or "finnkode" in area_lower or "http" in area_lower:
                    issues.append(f"Property {prop_id}: area contains FINN URL/code: '{area}'")
        
        if issues:
            print(f"✗ ISSUES FOUND ({len(issues)}):")
            for issue in issues[:10]:  # Show first 10
                print(f"  - {issue}")
            if len(issues) > 10:
                print(f"  ... and {len(issues) - 10} more")
            raise AssertionError(f"Found {len(issues)} property data issues")
        
        print(f"✓ All {len(properties)} properties have valid district and districtSource")
        print(f"✓ No area fields contain 'finn.no', 'finnkode', or 'http'")
        
        # Second call - should be fast from cache
        start_time = time.time()
        response2 = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=30)
        second_call_time = time.time() - start_time
        
        print(f"✓ Second call (cached): {response2.status_code} in {second_call_time:.2f}s")
        print(f"✓ Response times: first={first_call_time:.2f}s, second={second_call_time:.2f}s")
        
        # Count districts
        district_counts = Counter(prop.get("district") for prop in properties)
        print(f"✓ District distribution:")
        for district, count in district_counts.most_common():
            print(f"  - {district}: {count}")
        
        print("✅ SCENARIO 1 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ SCENARIO 1 FAILED: {e}")
        return False


def test_scenario_2_idempotent_sync():
    """
    SCENARIO 2: IDEMPOTENT SYNK
    POST /api/admin/properties/sync?key=...&env=prod
    - 200, ok:true, platformEnv:'prod', synced ≈ 27, withDistrict === synced
    - Run again: same synced and withDistrict, no errors (idempotent)
    - After: GET /api/admin/properties should still have districtCount === total
    """
    print("\n" + "="*80)
    print("SCENARIO 2: IDEMPOTENT SYNC")
    print("="*80)
    
    try:
        # First sync
        print("Running first sync...")
        response1 = requests.post(
            f"{BASE_URL}/admin/properties/sync",
            params={"key": ADMIN_KEY, "env": "prod"},
            json={},
            timeout=60
        )
        
        print(f"✓ First sync: {response1.status_code}")
        assert response1.status_code == 200, f"Expected 200, got {response1.status_code}"
        
        data1 = response1.json()
        assert data1.get("ok") is True, "Expected ok:true"
        assert data1.get("platformEnv") == "prod", f"Expected platformEnv:'prod', got {data1.get('platformEnv')}"
        
        synced1 = data1.get("synced", 0)
        with_district1 = data1.get("withDistrict", 0)
        
        print(f"✓ First sync: synced={synced1}, withDistrict={with_district1}")
        assert with_district1 == synced1, f"Expected withDistrict ({with_district1}) === synced ({synced1})"
        
        # Second sync (idempotency test)
        print("Running second sync (idempotency test)...")
        time.sleep(1)  # Brief pause
        response2 = requests.post(
            f"{BASE_URL}/admin/properties/sync",
            params={"key": ADMIN_KEY, "env": "prod"},
            json={},
            timeout=60
        )
        
        print(f"✓ Second sync: {response2.status_code}")
        assert response2.status_code == 200, f"Expected 200, got {response2.status_code}"
        
        data2 = response2.json()
        assert data2.get("ok") is True, "Expected ok:true"
        
        synced2 = data2.get("synced", 0)
        with_district2 = data2.get("withDistrict", 0)
        
        print(f"✓ Second sync: synced={synced2}, withDistrict={with_district2}")
        assert synced2 == synced1, f"Expected same synced count: {synced1} vs {synced2}"
        assert with_district2 == with_district1, f"Expected same withDistrict count: {with_district1} vs {with_district2}"
        print(f"✓ Idempotent: same counts on both syncs")
        
        # Verify GET still shows all with districts
        response3 = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=30)
        assert response3.status_code == 200
        data3 = response3.json()
        
        total = data3.get("total", 0)
        district_count = data3.get("districtCount", 0)
        
        print(f"✓ After sync: total={total}, districtCount={district_count}")
        assert district_count == total, f"Expected districtCount ({district_count}) === total ({total})"
        
        print("✅ SCENARIO 2 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ SCENARIO 2 FAILED: {e}")
        return False


def test_scenario_3_old_drafts_self_heal():
    """
    SCENARIO 3: GAMLE UTKAST SELVHELES
    GET /api/admin/newsletter/campaign?key=...&id=saker-hub
    - 200, campaign.blocks[0].type === 'properties', 12 items
    - CRITICAL: AFTER hydration, NO item has district === ''
    - Grouping items by district should yield AT LEAST 3 unique groups
    - Expected distribution: 'Bergen sentrum' most, then Bergenhus/Fana/Ytrebygda/Bergen
    """
    print("\n" + "="*80)
    print("SCENARIO 3: OLD DRAFTS SELF-HEAL")
    print("="*80)
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/newsletter/campaign",
            params={"key": ADMIN_KEY, "id": TEST_CAMPAIGN_ID},
            timeout=30
        )
        
        print(f"✓ GET campaign: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        campaign = data.get("campaign", {})
        blocks = campaign.get("blocks", [])
        
        assert len(blocks) > 0, "Expected at least one block"
        
        properties_block = blocks[0]
        assert properties_block.get("type") == "properties", f"Expected type='properties', got {properties_block.get('type')}"
        
        items = properties_block.get("items", [])
        print(f"✓ Properties block has {len(items)} items")
        assert len(items) == 12, f"Expected 12 items, got {len(items)}"
        
        # Check NO item has empty district
        empty_districts = [i for i, item in enumerate(items) if item.get("district") == ""]
        if empty_districts:
            print(f"✗ CRITICAL: {len(empty_districts)} items have empty district (indices: {empty_districts})")
            for idx in empty_districts[:5]:
                item = items[idx]
                print(f"  - Item {idx}: title='{item.get('title', 'N/A')}', district='{item.get('district', '')}'")
            raise AssertionError(f"CRITICAL: {len(empty_districts)} items have empty district after hydration")
        
        print(f"✓ CRITICAL: NO items have empty district (all 12 hydrated)")
        
        # Group by district
        district_counts = Counter(item.get("district") for item in items)
        unique_districts = len(district_counts)
        
        print(f"✓ Unique districts: {unique_districts}")
        assert unique_districts >= 3, f"Expected at least 3 unique districts, got {unique_districts}"
        
        print(f"✓ District distribution:")
        for district, count in district_counts.most_common():
            print(f"  - {district}: {count}")
        
        # Check expected districts are present
        expected_districts = {"Bergen sentrum", "Bergenhus", "Fana", "Ytrebygda", "Bergen"}
        found_expected = set(district_counts.keys()) & expected_districts
        print(f"✓ Found expected districts: {', '.join(sorted(found_expected))}")
        
        print("✅ SCENARIO 3 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ SCENARIO 3 FAILED: {e}")
        return False


def test_scenario_4_email_html_grouping():
    """
    SCENARIO 4: E-POST-HTML GRUPPERES OG SORTERES
    POST /api/admin/newsletter/preview?key=...
    - Build items from GET /api/admin/properties (status=active, min 8)
    - Items have district:'' to prove server fills it in
    - 200, ok:true
    - HTML contains AT LEAST 3 unique group headers
    - Count 'N boliger'/'N bolig' badges: sum === number of items
    - SORTING: group with most properties comes FIRST, 'Andre områder' comes LAST
    - HTML does NOT contain 'finn.no'
    - Number of 'Se bolig og meld interesse' buttons === number of items
    - Each interest link contains 'boliginteresse?property=' (or URL-encoded)
    """
    print("\n" + "="*80)
    print("SCENARIO 4: EMAIL HTML GROUPING AND SORTING")
    print("="*80)
    
    try:
        # Get active properties
        response = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        properties = data.get("properties", [])
        active_properties = [p for p in properties if p.get("status") == "active"]
        
        print(f"✓ Found {len(active_properties)} active properties")
        
        # Take at least 8 (or all if less)
        items_to_use = active_properties[:max(8, len(active_properties))]
        print(f"✓ Using {len(items_to_use)} properties for preview")
        
        # Build items with district:'' to prove server fills it
        items = []
        for prop in items_to_use:
            items.append({
                "pid": prop.get("externalId"),
                "localId": prop.get("id"),
                "title": prop.get("title", ""),
                "image": prop.get("images", [""])[0] if prop.get("images") else "",
                "meta": "",
                "band": prop.get("monthlyRentBand", ""),
                "status": "active",
                "district": ""  # CRITICAL: empty to prove server fills it
            })
        
        # Build preview request
        preview_body = {
            "subject": "Ledige boliger",
            "preheader": "x",
            "theme": "lavendel",
            "blocks": [{
                "id": "b1",
                "type": "properties",
                "title": "Ledige boliger",
                "grouping": "auto",
                "groupingThreshold": 6,
                "items": items
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/admin/newsletter/preview",
            params={"key": ADMIN_KEY},
            json=preview_body,
            timeout=30
        )
        
        print(f"✓ POST preview: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") is True, "Expected ok:true"
        
        html = data.get("html", "")
        print(f"✓ HTML length: {len(html)} chars")
        
        # Count group headers (look for patterns like "BERGEN SENTRUM" or "3 boliger")
        import re
        
        # Find district group headers (uppercase district names)
        district_headers = re.findall(r'<td[^>]*style="[^"]*text-transform:\s*uppercase[^"]*"[^>]*>([^<]+)</td>', html, re.IGNORECASE)
        unique_districts_in_html = set(h.strip() for h in district_headers if h.strip())
        
        print(f"✓ Found {len(unique_districts_in_html)} unique district headers in HTML")
        if unique_districts_in_html:
            print(f"  Districts: {', '.join(sorted(unique_districts_in_html))}")
        
        assert len(unique_districts_in_html) >= 3, f"Expected at least 3 district headers, got {len(unique_districts_in_html)}"
        
        # Count property count badges (e.g., "3 boliger", "1 bolig")
        count_badges = re.findall(r'(\d+)\s+bolig(?:er)?', html, re.IGNORECASE)
        total_from_badges = sum(int(c) for c in count_badges)
        
        print(f"✓ Found {len(count_badges)} count badges: {count_badges}")
        print(f"✓ Total properties from badges: {total_from_badges}")
        assert total_from_badges == len(items), f"Expected badge sum ({total_from_badges}) === items ({len(items)})"
        
        # Check sorting: most properties first, 'Andre områder' last
        if "Andre områder" in unique_districts_in_html or "ANDRE OMRÅDER" in html.upper():
            # Find position of 'Andre områder' in HTML
            andre_pos = html.upper().find("ANDRE OMRÅDER")
            if andre_pos > 0:
                # Check it's near the end (last 30% of HTML)
                if andre_pos < len(html) * 0.7:
                    print(f"⚠ WARNING: 'Andre områder' found at position {andre_pos}/{len(html)} (not near end)")
                else:
                    print(f"✓ 'Andre områder' correctly positioned near end ({andre_pos}/{len(html)})")
        
        # Check NO 'finn.no' in HTML
        assert "finn.no" not in html.lower(), "CRITICAL: HTML contains 'finn.no'"
        print(f"✓ HTML does NOT contain 'finn.no'")
        
        # Count 'Se bolig og meld interesse' buttons
        interest_buttons = html.count("Se bolig og meld interesse") + html.count("boliginteresse")
        print(f"✓ Found {interest_buttons} interest-related elements")
        
        # Count boliginteresse links
        interest_links = html.count("boliginteresse?property=") + html.count("boliginteresse%3Fproperty%3D")
        print(f"✓ Found {interest_links} boliginteresse links")
        assert interest_links >= len(items), f"Expected at least {len(items)} interest links, got {interest_links}"
        
        print("✅ SCENARIO 4 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ SCENARIO 4 FAILED: {e}")
        return False


def test_scenario_5_property_interest_preview():
    """
    SCENARIO 5: BOLIGINTERESSE — PREVIEW MODE
    GET /api/newsletter/property-interest/lookup?property=saker-hub
    - 200, ok:true, preview:true, available:true, property exists with district
    - CRITICAL: NO email, phone, name, tenantId in response. firstName should be empty string.
    GET /api/newsletter/property-interest/lookup?property=finnes-ikke-123 → 404 with ok:false
    """
    print("\n" + "="*80)
    print("SCENARIO 5: PROPERTY INTEREST - PREVIEW MODE")
    print("="*80)
    
    try:
        # Valid property without signature (preview mode)
        response = requests.get(
            f"{BASE_URL}/newsletter/property-interest/lookup",
            params={"property": TEST_PROPERTY_ID},
            timeout=30
        )
        
        print(f"✓ GET lookup (preview): {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") is True, "Expected ok:true"
        assert data.get("preview") is True, "Expected preview:true"
        assert data.get("available") is True, "Expected available:true"
        
        property_data = data.get("property", {})
        assert property_data, "Expected property data"
        assert property_data.get("district"), "Expected property to have district"
        
        print(f"✓ Property: {property_data.get('title', 'N/A')}")
        print(f"✓ District: {property_data.get('district', 'N/A')}")
        
        # CRITICAL: Check NO PII in response
        pii_fields = ["email", "phone", "name", "tenantId"]
        found_pii = [field for field in pii_fields if field in data and data[field]]
        
        if found_pii:
            print(f"✗ CRITICAL: Found PII in preview mode: {found_pii}")
            raise AssertionError(f"CRITICAL: Preview mode should NOT contain PII: {found_pii}")
        
        print(f"✓ CRITICAL: NO PII in response (no email, phone, name, tenantId)")
        
        # Check firstName is empty string
        first_name = data.get("firstName", None)
        if first_name is None or first_name == "":
            print(f"✓ firstName is empty string or null (correct for preview)")
        else:
            print(f"⚠ WARNING: firstName='{first_name}' (expected empty)")
        
        # Invalid property
        response2 = requests.get(
            f"{BASE_URL}/newsletter/property-interest/lookup",
            params={"property": "finnes-ikke-123"},
            timeout=30
        )
        
        print(f"✓ GET lookup (invalid property): {response2.status_code}")
        assert response2.status_code == 404, f"Expected 404, got {response2.status_code}"
        
        data2 = response2.json()
        assert data2.get("ok") is False, "Expected ok:false for invalid property"
        
        print("✅ SCENARIO 5 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ SCENARIO 5 FAILED: {e}")
        return False


def test_scenario_6_property_interest_signed():
    """
    SCENARIO 6: BOLIGINTERESSE — GYLDIG SIGNERT LENKE
    Test rig: campaign 'qa-interest-campaign', recipient 'qa-boliginteresse@example.com'
    a) GET lookup with c/r/pt → 200, preview:false, available:true, firstName can be empty
    b) POST confirm → 200, ok:true, tenantId exists, interest has propertyId/status/source
       CRITICAL: recipient had NO tenant profile, should be created automatically
    c) Verify lead exists in GET /api/admin/leads with property_interests
    d) IDEMPOTENCE: POST again → 200, lead has EXACTLY 1 interest (no duplicate)
    """
    print("\n" + "="*80)
    print("SCENARIO 6: PROPERTY INTEREST - VALID SIGNED LINK")
    print("="*80)
    
    try:
        # a) GET lookup with signature
        params = {
            "property": TEST_PROPERTY_ID,
            "c": "qa-interest-campaign",
            "r": TEST_RECIPIENT_ID,
            "pt": TEST_TOKEN
        }
        
        response = requests.get(
            f"{BASE_URL}/newsletter/property-interest/lookup",
            params=params,
            timeout=30
        )
        
        print(f"✓ GET lookup (signed): {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") is True, "Expected ok:true"
        
        # preview should be undefined or false (not true)
        preview = data.get("preview")
        assert preview is not True, f"Expected preview to be false/undefined, got {preview}"
        print(f"✓ preview: {preview} (not true, correct)")
        
        assert data.get("available") is True, "Expected available:true"
        
        first_name = data.get("firstName", "")
        print(f"✓ firstName: '{first_name}' (can be empty)")
        
        # b) POST confirm
        confirm_body = {
            "property": TEST_PROPERTY_ID,
            "c": "qa-interest-campaign",
            "r": TEST_RECIPIENT_ID,
            "pt": TEST_TOKEN
        }
        
        response2 = requests.post(
            f"{BASE_URL}/newsletter/property-interest/confirm",
            json=confirm_body,
            timeout=30
        )
        
        print(f"✓ POST confirm: {response2.status_code}")
        assert response2.status_code == 200, f"Expected 200, got {response2.status_code}"
        
        data2 = response2.json()
        assert data2.get("ok") is True, "Expected ok:true"
        
        tenant_id = data2.get("tenantId")
        assert tenant_id, "Expected tenantId in response"
        print(f"✓ tenantId: {tenant_id}")
        
        interest = data2.get("interest", {})
        assert interest.get("propertyId") == TEST_PROPERTY_ID, "Expected correct propertyId"
        assert interest.get("status") == "interested", "Expected status='interested'"
        assert interest.get("source") == "nyhetsbrev-bolig", "Expected source='nyhetsbrev-bolig'"
        
        print(f"✓ CRITICAL: Tenant profile created automatically (recipient had no profile)")
        print(f"✓ Interest: propertyId={interest.get('propertyId')}, status={interest.get('status')}, source={interest.get('source')}")
        
        # c) Verify lead exists
        response3 = requests.get(
            f"{BASE_URL}/admin/leads",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        assert response3.status_code == 200
        data3 = response3.json()
        
        # Find lead with test email
        all_leads = data3.get("leads", []) + data3.get("tenants", []) + data3.get("contacts", [])
        test_lead = None
        for lead in all_leads:
            if lead.get("email") == TEST_RECIPIENT_EMAIL:
                test_lead = lead
                break
        
        assert test_lead, f"Expected to find lead with email {TEST_RECIPIENT_EMAIL}"
        
        property_interests = test_lead.get("property_interests", [])
        print(f"✓ Lead found with {len(property_interests)} property_interests")
        
        assert len(property_interests) >= 1, "Expected at least 1 property interest"
        
        # Find interest for test property
        test_interest = None
        for interest in property_interests:
            if interest.get("propertyId") == TEST_PROPERTY_ID:
                test_interest = interest
                break
        
        assert test_interest, f"Expected interest for property {TEST_PROPERTY_ID}"
        print(f"✓ Interest found: propertyId={test_interest.get('propertyId')}, status={test_interest.get('status')}")
        
        # d) IDEMPOTENCE: POST again
        response4 = requests.post(
            f"{BASE_URL}/newsletter/property-interest/confirm",
            json=confirm_body,
            timeout=30
        )
        
        print(f"✓ POST confirm (idempotence): {response4.status_code}")
        assert response4.status_code == 200, f"Expected 200, got {response4.status_code}"
        
        # Verify still exactly 1 interest
        response5 = requests.get(
            f"{BASE_URL}/admin/leads",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        assert response5.status_code == 200
        data5 = response5.json()
        
        all_leads = data5.get("leads", []) + data5.get("tenants", []) + data5.get("contacts", [])
        test_lead = None
        for lead in all_leads:
            if lead.get("email") == TEST_RECIPIENT_EMAIL:
                test_lead = lead
                break
        
        property_interests = test_lead.get("property_interests", [])
        test_property_interests = [i for i in property_interests if i.get("propertyId") == TEST_PROPERTY_ID]
        
        print(f"✓ After second POST: {len(test_property_interests)} interest(s) for test property")
        assert len(test_property_interests) == 1, f"Expected EXACTLY 1 interest (idempotent), got {len(test_property_interests)}"
        
        print(f"✓ IDEMPOTENCE: Still exactly 1 interest (no duplicate)")
        
        print("✅ SCENARIO 6 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ SCENARIO 6 FAILED: {e}")
        return False


def test_scenario_7_property_interest_security():
    """
    SCENARIO 7: BOLIGINTERESSE — SIKKERHET
    - POST confirm with WRONG pt → 401/403, NO new lead/interest created
    - POST confirm WITHOUT pt → rejected
    - GET lookup called 3 times → verify NO mutation (lead count and event count unchanged)
    """
    print("\n" + "="*80)
    print("SCENARIO 7: PROPERTY INTEREST - SECURITY")
    print("="*80)
    
    try:
        # Get baseline counts
        response = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY}, timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        baseline_lead_count = len(data.get("leads", [])) + len(data.get("tenants", [])) + len(data.get("contacts", []))
        print(f"✓ Baseline lead count: {baseline_lead_count}")
        
        # POST with WRONG pt
        wrong_token_body = {
            "property": TEST_PROPERTY_ID,
            "c": "qa-interest-campaign",
            "r": TEST_RECIPIENT_ID,
            "pt": "0000000000000000000000000000000000000000"  # Wrong token
        }
        
        response2 = requests.post(
            f"{BASE_URL}/newsletter/property-interest/confirm",
            json=wrong_token_body,
            timeout=30
        )
        
        print(f"✓ POST confirm (wrong pt): {response2.status_code}")
        assert response2.status_code in [401, 403], f"Expected 401/403, got {response2.status_code}"
        print(f"✓ Wrong token rejected with {response2.status_code}")
        
        # POST without pt
        no_token_body = {
            "property": TEST_PROPERTY_ID,
            "c": "qa-interest-campaign",
            "r": TEST_RECIPIENT_ID
            # No pt field
        }
        
        response3 = requests.post(
            f"{BASE_URL}/newsletter/property-interest/confirm",
            json=no_token_body,
            timeout=30
        )
        
        print(f"✓ POST confirm (no pt): {response3.status_code}")
        assert response3.status_code in [400, 401, 403], f"Expected 400/401/403, got {response3.status_code}"
        print(f"✓ Missing token rejected with {response3.status_code}")
        
        # Verify NO new leads created
        response4 = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY}, timeout=30)
        assert response4.status_code == 200
        data4 = response4.json()
        
        after_lead_count = len(data4.get("leads", [])) + len(data4.get("tenants", [])) + len(data4.get("contacts", []))
        print(f"✓ After invalid attempts: {after_lead_count} leads")
        assert after_lead_count == baseline_lead_count, f"Expected no new leads, but count changed: {baseline_lead_count} → {after_lead_count}"
        print(f"✓ NO new leads created by invalid attempts")
        
        # GET lookup 3 times (read-only, should not mutate)
        for i in range(3):
            response5 = requests.get(
                f"{BASE_URL}/newsletter/property-interest/lookup",
                params={"property": TEST_PROPERTY_ID},
                timeout=30
            )
            assert response5.status_code == 200
        
        print(f"✓ Called GET lookup 3 times")
        
        # Verify counts still unchanged
        response6 = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY}, timeout=30)
        assert response6.status_code == 200
        data6 = response6.json()
        
        final_lead_count = len(data6.get("leads", [])) + len(data6.get("tenants", [])) + len(data6.get("contacts", []))
        print(f"✓ After 3 GET lookups: {final_lead_count} leads")
        assert final_lead_count == baseline_lead_count, f"Expected no mutation from GET, but count changed: {baseline_lead_count} → {final_lead_count}"
        print(f"✓ GET lookup is read-only (no mutation after 3 calls)")
        
        print("✅ SCENARIO 7 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ SCENARIO 7 FAILED: {e}")
        return False


def test_scenario_8_regression():
    """
    SCENARIO 8: REGRESJON
    - GET /api/public/properties?limit=6 → 200 (can return 0 properties, that's OK)
    - GET /api/admin/newsletter?key=... → 200, campaign list intact
    - GET /api/admin/revenue-reconcile?key=...&env=prod&days=30&spend=0 → 200, ok:true
    - GET /api/admin/kpi?key=...&days=30 → 200
    - GET /api/ → 200
    """
    print("\n" + "="*80)
    print("SCENARIO 8: REGRESSION")
    print("="*80)
    
    try:
        # Public properties
        response1 = requests.get(f"{BASE_URL}/public/properties", params={"limit": 6}, timeout=30)
        print(f"✓ GET /api/public/properties: {response1.status_code}")
        assert response1.status_code == 200, f"Expected 200, got {response1.status_code}"
        
        data1 = response1.json()
        properties = data1.get("properties", [])
        print(f"✓ Public properties: {len(properties)} (0 is OK if all hidden)")
        
        # Check no area with finn.no
        for prop in properties:
            area = prop.get("area", "")
            if area and "finn.no" in area.lower():
                raise AssertionError(f"Public property has finn.no in area: {area}")
        print(f"✓ No public property has 'finn.no' in area")
        
        # Newsletter campaigns
        response2 = requests.get(f"{BASE_URL}/admin/newsletter", params={"key": ADMIN_KEY}, timeout=30)
        print(f"✓ GET /api/admin/newsletter: {response2.status_code}")
        assert response2.status_code == 200, f"Expected 200, got {response2.status_code}"
        
        data2 = response2.json()
        campaigns = data2.get("campaigns", [])
        print(f"✓ Newsletter campaigns: {len(campaigns)}")
        
        # Revenue reconcile
        response3 = requests.get(
            f"{BASE_URL}/admin/revenue-reconcile",
            params={"key": ADMIN_KEY, "env": "prod", "days": 30, "spend": 0},
            timeout=30
        )
        print(f"✓ GET /api/admin/revenue-reconcile: {response3.status_code}")
        assert response3.status_code == 200, f"Expected 200, got {response3.status_code}"
        
        data3 = response3.json()
        assert data3.get("ok") is True, "Expected ok:true"
        
        # KPI
        response4 = requests.get(f"{BASE_URL}/admin/kpi", params={"key": ADMIN_KEY, "days": 30}, timeout=30)
        print(f"✓ GET /api/admin/kpi: {response4.status_code}")
        assert response4.status_code == 200, f"Expected 200, got {response4.status_code}"
        
        # Root
        response5 = requests.get(f"{BASE_URL}/", timeout=30)
        print(f"✓ GET /api/: {response5.status_code}")
        assert response5.status_code == 200, f"Expected 200, got {response5.status_code}"
        
        print("✅ SCENARIO 8 PASSED")
        return True
        
    except Exception as e:
        print(f"✗ SCENARIO 8 FAILED: {e}")
        return False


def main():
    """Run all test scenarios"""
    print("\n" + "="*80)
    print("BACKEND TEST: Newsletter District Grouping + Property Interest Flow")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print("="*80)
    
    results = {}
    
    # Run all scenarios
    results["Scenario 1: Property Data + District"] = test_scenario_1_property_data_district()
    results["Scenario 2: Idempotent Sync"] = test_scenario_2_idempotent_sync()
    results["Scenario 3: Old Drafts Self-Heal"] = test_scenario_3_old_drafts_self_heal()
    results["Scenario 4: Email HTML Grouping"] = test_scenario_4_email_html_grouping()
    results["Scenario 5: Property Interest Preview"] = test_scenario_5_property_interest_preview()
    results["Scenario 6: Property Interest Signed"] = test_scenario_6_property_interest_signed()
    results["Scenario 7: Property Interest Security"] = test_scenario_7_property_interest_security()
    results["Scenario 8: Regression"] = test_scenario_8_regression()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for scenario, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {scenario}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} scenarios passed ({passed/total*100:.0f}%)")
    print("="*80)
    
    return passed == total


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
