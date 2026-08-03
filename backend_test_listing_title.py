#!/usr/bin/env python3
"""
Backend test for FINN listing title + editorial title + rent deviation feature.
Tests all 10 scenarios from review_request.

CRITICAL: MAX 6 FINN calls total (FINN rate limits).
"""

import requests
import json
import re
from datetime import datetime

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60

# Track FINN calls
finn_calls_made = 0
MAX_FINN_CALLS = 6

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_scenario_1_new_fields():
    """Scenario 1: Verify all 22 properties have new fields."""
    log("=" * 80)
    log("SCENARIO 1: NEW FIELDS IN GET /admin/properties")
    log("=" * 80)
    
    try:
        r = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        log(f"GET /admin/properties: {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        if not data.get("ok"):
            log(f"❌ FAIL: ok is not true")
            return False
        
        properties = data.get("properties", [])
        total = data.get("total", 0)
        log(f"Total properties: {total}")
        
        if total != 22:
            log(f"⚠️  WARNING: Expected 22 properties, got {total}")
        
        # Check required fields on all properties
        required_fields = [
            "listingTitle", "listingTitleSource", "finnTitle", "finnRentAmount",
            "finnSnapshotAt", "finnSnapshotStatus", "editorialTitle", "rentBandSource"
        ]
        
        missing_fields = []
        generic_not_replaced = []
        has_house_numbers = []
        
        for prop in properties:
            prop_id = prop.get("id", "unknown")
            
            # Check required fields exist
            for field in required_fields:
                if field not in prop:
                    missing_fields.append(f"{prop_id}: missing {field}")
            
            # Check listingTitle is not empty
            listing_title = prop.get("listingTitle", "")
            if not listing_title:
                missing_fields.append(f"{prop_id}: listingTitle is empty")
            
            # Check listingTitleSource is valid
            source = prop.get("listingTitleSource", "")
            if source not in ["redigert", "finn", "plattform", "avledet"]:
                missing_fields.append(f"{prop_id}: invalid listingTitleSource '{source}'")
            
            # Check generic platform titles are replaced
            platform_title = prop.get("title", "")
            if "·" in platform_title and all(
                part.strip() in ["Møblert leilighet", "Umøblert leilighet", "Møblert hybel", 
                                 "1 soverom", "2 soverom", "3 soverom", "4 soverom",
                                 "52 m²", "55 m²", "74 m²", "90 m²", "Langtidsleie"]
                for part in platform_title.split("·")
            ):
                # This is a generic title
                if source == "plattform":
                    generic_not_replaced.append(f"{prop_id}: generic platform title not replaced, source={source}")
            
            # Check no house numbers in listingTitle
            if re.search(r'\b\d+[A-Z]?\b', listing_title):
                # Could be a house number
                has_house_numbers.append(f"{prop_id}: listingTitle may contain house number: '{listing_title}'")
        
        if missing_fields:
            log(f"❌ FAIL: Missing or invalid fields:")
            for msg in missing_fields[:5]:  # Show first 5
                log(f"  - {msg}")
            return False
        
        if generic_not_replaced:
            log(f"⚠️  WARNING: Generic platform titles not replaced:")
            for msg in generic_not_replaced[:3]:
                log(f"  - {msg}")
        
        if has_house_numbers:
            log(f"⚠️  WARNING: Possible house numbers in listingTitle:")
            for msg in has_house_numbers[:3]:
                log(f"  - {msg}")
        
        # Count sources
        source_counts = {}
        for prop in properties:
            source = prop.get("listingTitleSource", "unknown")
            source_counts[source] = source_counts.get(source, 0) + 1
        
        log(f"✅ PASS: All properties have required fields")
        log(f"Title source distribution: {source_counts}")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_scenario_2_editorial_title():
    """Scenario 2: Set and clear editorial title."""
    log("=" * 80)
    log("SCENARIO 2: EDITORIAL TITLE (PUT /admin/properties/title)")
    log("=" * 80)
    
    try:
        # First get a property ID
        r = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        if r.status_code != 200:
            log(f"❌ FAIL: Could not get properties list")
            return False
        
        properties = r.json().get("properties", [])
        if not properties:
            log(f"❌ FAIL: No properties found")
            return False
        
        test_prop_id = properties[0]["id"]
        log(f"Using property ID: {test_prop_id}")
        
        # Test 1: Set editorial title with extra whitespace
        title_with_spaces = "  Lys   3-roms med utsikt over Puddefjorden "
        r = requests.put(
            f"{BASE_URL}/admin/properties/title",
            params={"key": ADMIN_KEY},
            json={"id": test_prop_id, "title": title_with_spaces},
            timeout=TIMEOUT
        )
        log(f"PUT /admin/properties/title (set): {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        if not data.get("ok"):
            log(f"❌ FAIL: ok is not true")
            return False
        
        prop = data.get("property", {})
        editorial_title = prop.get("editorialTitle", "")
        expected_title = "Lys 3-roms med utsikt over Puddefjorden"
        
        if editorial_title != expected_title:
            log(f"❌ FAIL: editorialTitle '{editorial_title}' != expected '{expected_title}'")
            return False
        
        if prop.get("listingTitle") != expected_title:
            log(f"❌ FAIL: listingTitle should equal editorialTitle")
            return False
        
        if prop.get("listingTitleSource") != "redigert":
            log(f"❌ FAIL: listingTitleSource should be 'redigert', got '{prop.get('listingTitleSource')}'")
            return False
        
        candidates = data.get("candidates", [])
        if not any(c.get("source") == "redigert" for c in candidates):
            log(f"❌ FAIL: candidates should include source='redigert'")
            return False
        
        log(f"✅ Editorial title set and whitespace collapsed correctly")
        
        # Test 2: Set 300 char title (should be truncated to 160)
        long_title = "A" * 300
        r = requests.put(
            f"{BASE_URL}/admin/properties/title",
            params={"key": ADMIN_KEY},
            json={"id": test_prop_id, "title": long_title},
            timeout=TIMEOUT
        )
        
        if r.status_code != 200:
            log(f"❌ FAIL: Long title request failed: {r.status_code}")
            return False
        
        prop = r.json().get("property", {})
        if len(prop.get("editorialTitle", "")) > 160:
            log(f"❌ FAIL: editorialTitle not truncated to 160 chars, got {len(prop.get('editorialTitle', ''))}")
            return False
        
        log(f"✅ Long title truncated to 160 chars")
        
        # Test 3: Clear editorial title
        r = requests.put(
            f"{BASE_URL}/admin/properties/title",
            params={"key": ADMIN_KEY},
            json={"id": test_prop_id, "title": ""},
            timeout=TIMEOUT
        )
        log(f"PUT /admin/properties/title (clear): {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Clear request failed: {r.status_code}")
            return False
        
        data = r.json()
        if not data.get("cleared"):
            log(f"❌ FAIL: cleared should be true")
            return False
        
        prop = data.get("property", {})
        if prop.get("editorialTitle") is not None:
            log(f"❌ FAIL: editorialTitle should be null after clear, got '{prop.get('editorialTitle')}'")
            return False
        
        source = prop.get("listingTitleSource", "")
        if source not in ["finn", "plattform", "avledet"]:
            log(f"❌ FAIL: listingTitleSource should fall back to finn/plattform/avledet, got '{source}'")
            return False
        
        log(f"✅ PASS: Editorial title set, truncated, and cleared correctly")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_scenario_3_validation_auth():
    """Scenario 3: Test validation and auth."""
    log("=" * 80)
    log("SCENARIO 3: VALIDATION AND AUTH")
    log("=" * 80)
    
    try:
        # Test 1: PUT title without key
        r = requests.put(
            f"{BASE_URL}/admin/properties/title",
            json={"id": "test", "title": "test"},
            timeout=TIMEOUT
        )
        if r.status_code != 401:
            log(f"❌ FAIL: PUT title without key should return 401, got {r.status_code}")
            return False
        log(f"✅ PUT title without key: 401")
        
        # Test 2: PUT title without id
        r = requests.put(
            f"{BASE_URL}/admin/properties/title",
            params={"key": ADMIN_KEY},
            json={"title": "test"},
            timeout=TIMEOUT
        )
        if r.status_code != 400:
            log(f"❌ FAIL: PUT title without id should return 400, got {r.status_code}")
            return False
        log(f"✅ PUT title without id: 400")
        
        # Test 3: PUT title with non-existent id
        r = requests.put(
            f"{BASE_URL}/admin/properties/title",
            params={"key": ADMIN_KEY},
            json={"id": "finnes-ikke-123", "title": "test"},
            timeout=TIMEOUT
        )
        if r.status_code != 404:
            log(f"❌ FAIL: PUT title with non-existent id should return 404, got {r.status_code}")
            return False
        log(f"✅ PUT title with non-existent id: 404")
        
        # Test 4: POST finn-snapshot without key
        r = requests.post(
            f"{BASE_URL}/admin/properties/finn-snapshot",
            json={"id": "test"},
            timeout=TIMEOUT
        )
        if r.status_code != 401:
            log(f"❌ FAIL: POST finn-snapshot without key should return 401, got {r.status_code}")
            return False
        log(f"✅ POST finn-snapshot without key: 401")
        
        # Test 5: POST finn-snapshot without id or all
        r = requests.post(
            f"{BASE_URL}/admin/properties/finn-snapshot",
            params={"key": ADMIN_KEY},
            json={},
            timeout=TIMEOUT
        )
        if r.status_code != 400:
            log(f"❌ FAIL: POST finn-snapshot without id/all should return 400, got {r.status_code}")
            return False
        log(f"✅ POST finn-snapshot without id/all: 400")
        
        log(f"✅ PASS: All validation and auth tests passed")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_scenario_4_finn_snapshot_single():
    """Scenario 4: FINN snapshot for single property (Wernersholmvegen)."""
    global finn_calls_made
    
    log("=" * 80)
    log("SCENARIO 4: FINN SNAPSHOT SINGLE (Wernersholmvegen)")
    log("=" * 80)
    
    if finn_calls_made >= MAX_FINN_CALLS:
        log(f"❌ FAIL: Already made {finn_calls_made} FINN calls, max is {MAX_FINN_CALLS}")
        return False
    
    try:
        # Get Wernersholm ID from admin list
        r = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        if r.status_code != 200:
            log(f"❌ FAIL: Could not get properties list")
            return False
        
        properties = r.json().get("properties", [])
        wernersholm = next((p for p in properties if "Wernersholm" in p.get("area", "")), None)
        
        if not wernersholm:
            log(f"❌ FAIL: Wernersholmvegen not found in properties list")
            return False
        
        wernersholm_id = wernersholm["id"]
        log(f"Using Wernersholm id: {wernersholm_id}")
        
        r = requests.post(
            f"{BASE_URL}/admin/properties/finn-snapshot",
            params={"key": ADMIN_KEY},
            json={"id": wernersholm_id},
            timeout=TIMEOUT
        )
        log(f"POST /admin/properties/finn-snapshot (single): {r.status_code}")
        
        finn_calls_made += 1
        log(f"FINN calls made: {finn_calls_made}/{MAX_FINN_CALLS}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            log(f"Response: {r.text[:500]}")
            return False
        
        data = r.json()
        if not data.get("ok"):
            log(f"❌ FAIL: ok is not true")
            return False
        
        fetched = data.get("fetched", 0)
        if fetched != 1:
            log(f"❌ FAIL: Expected fetched=1, got {fetched}")
            return False
        
        results = data.get("results", [])
        if len(results) != 1:
            log(f"❌ FAIL: Expected 1 result, got {len(results)}")
            return False
        
        result = results[0]
        if not result.get("ok"):
            log(f"❌ FAIL: result.ok is not true")
            log(f"Result: {result}")
            return False
        
        title = result.get("title", "")
        if not title:
            log(f"❌ FAIL: result.title is empty")
            return False
        
        rent_amount = result.get("rentAmount")
        if not isinstance(rent_amount, (int, float)) or rent_amount <= 0:
            log(f"❌ FAIL: result.rentAmount should be positive number, got {rent_amount}")
            return False
        
        platform_rent = result.get("platformRent")
        if not isinstance(platform_rent, (int, float)) or platform_rent <= 0:
            log(f"❌ FAIL: result.platformRent should be positive number, got {platform_rent}")
            return False
        
        deviation_pct = result.get("deviationPct")
        if deviation_pct is None:
            log(f"❌ FAIL: result.deviationPct is missing")
            return False
        
        deviates = result.get("deviates")
        if not isinstance(deviates, bool):
            log(f"❌ FAIL: result.deviates should be boolean, got {type(deviates)}")
            return False
        
        log(f"✅ FINN snapshot result: title='{title[:50]}...', rentAmount={rent_amount}, platformRent={platform_rent}, deviationPct={deviation_pct}%, deviates={deviates}")
        
        # Check property object in response (single request returns 'property' not 'properties')
        prop = data.get("property", {})
        
        if not prop:
            log(f"❌ FAIL: property object not in response")
            return False
        
        finn_title = prop.get("finnTitle", "")
        if not finn_title:
            log(f"❌ FAIL: finnTitle is empty")
            return False
        
        finn_snapshot_at = prop.get("finnSnapshotAt", "")
        if not finn_snapshot_at:
            log(f"❌ FAIL: finnSnapshotAt is empty")
            return False
        
        finn_snapshot_status = prop.get("finnSnapshotStatus", "")
        if finn_snapshot_status != "aktiv":
            log(f"⚠️  WARNING: finnSnapshotStatus is '{finn_snapshot_status}', expected 'aktiv'")
        
        listing_title_source = prop.get("listingTitleSource", "")
        if listing_title_source != "finn":
            log(f"⚠️  WARNING: listingTitleSource is '{listing_title_source}', expected 'finn'")
        
        listing_title = prop.get("listingTitle", "")
        if len(listing_title) > 70:
            log(f"❌ FAIL: listingTitle should be <= 70 chars, got {len(listing_title)}")
            return False
        
        log(f"✅ Property fields: finnTitle='{finn_title[:50]}...', finnSnapshotAt={finn_snapshot_at}, listingTitle='{listing_title}'")
        
        # Verify persistence with GET
        r = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        if r.status_code != 200:
            log(f"❌ FAIL: Could not verify persistence")
            return False
        
        properties = r.json().get("properties", [])
        wernersholm = next((p for p in properties if p["id"] == wernersholm_id), None)
        
        if not wernersholm or not wernersholm.get("finnTitle"):
            log(f"❌ FAIL: FINN snapshot not persisted")
            return False
        
        log(f"✅ PASS: FINN snapshot for Wernersholmvegen successful and persisted")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_scenario_5_no_finn_url():
    """Scenario 5: FINN snapshot for property without finnUrl."""
    log("=" * 80)
    log("SCENARIO 5: FINN SNAPSHOT WITHOUT FINN URL")
    log("=" * 80)
    
    try:
        # Find a property without finnUrl
        r = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        if r.status_code != 200:
            log(f"❌ FAIL: Could not get properties list")
            return False
        
        properties = r.json().get("properties", [])
        prop_without_finn = next((p for p in properties if not p.get("finnUrl")), None)
        
        if not prop_without_finn:
            log(f"⚠️  WARNING: No property without finnUrl found, skipping test")
            return True
        
        prop_id = prop_without_finn["id"]
        log(f"Using property without finnUrl: {prop_id}")
        
        r = requests.post(
            f"{BASE_URL}/admin/properties/finn-snapshot",
            params={"key": ADMIN_KEY},
            json={"id": prop_id},
            timeout=TIMEOUT
        )
        log(f"POST /admin/properties/finn-snapshot (no finnUrl): {r.status_code}")
        
        if r.status_code != 400:
            log(f"❌ FAIL: Expected 400, got {r.status_code}")
            return False
        
        data = r.json()
        error = data.get("error", "")
        if "finn" not in error.lower():
            log(f"⚠️  WARNING: Error message should mention FINN: '{error}'")
        
        log(f"✅ PASS: Property without finnUrl correctly returns 400")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_scenario_6_finn_snapshot_bulk():
    """Scenario 6: FINN snapshot bulk (max 2 properties)."""
    global finn_calls_made
    
    log("=" * 80)
    log("SCENARIO 6: FINN SNAPSHOT BULK (limit=2)")
    log("=" * 80)
    
    if finn_calls_made >= MAX_FINN_CALLS - 1:  # Need room for 2 calls
        log(f"❌ FAIL: Already made {finn_calls_made} FINN calls, need room for 2 more")
        return False
    
    try:
        r = requests.post(
            f"{BASE_URL}/admin/properties/finn-snapshot",
            params={"key": ADMIN_KEY},
            json={"all": True, "limit": 2},
            timeout=TIMEOUT
        )
        log(f"POST /admin/properties/finn-snapshot (bulk): {r.status_code}")
        
        # Assume 2 FINN calls were made (could be less if some properties don't have finnUrl)
        finn_calls_made += 2
        log(f"FINN calls made: {finn_calls_made}/{MAX_FINN_CALLS}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            log(f"Response: {r.text[:500]}")
            return False
        
        data = r.json()
        if not data.get("ok"):
            log(f"❌ FAIL: ok is not true")
            return False
        
        fetched = data.get("fetched", 0)
        if fetched > 2:
            log(f"❌ FAIL: Expected fetched <= 2, got {fetched}")
            return False
        
        # Check summary fields
        with_title = data.get("withTitle")
        expired = data.get("expired")
        deviations = data.get("deviations")
        
        if not isinstance(with_title, int):
            log(f"❌ FAIL: withTitle should be int, got {type(with_title)}")
            return False
        
        if not isinstance(expired, int):
            log(f"❌ FAIL: expired should be int, got {type(expired)}")
            return False
        
        if not isinstance(deviations, int):
            log(f"❌ FAIL: deviations should be int, got {type(deviations)}")
            return False
        
        results = data.get("results", [])
        if len(results) > 2:
            log(f"❌ FAIL: Expected results <= 2, got {len(results)}")
            return False
        
        properties = data.get("properties", [])
        if len(properties) != 22:
            log(f"⚠️  WARNING: Expected 22 properties in response, got {len(properties)}")
        
        log(f"✅ PASS: Bulk FINN snapshot successful (fetched={fetched}, withTitle={with_title}, expired={expired}, deviations={deviations})")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_scenario_7_public_no_leak():
    """Scenario 7: Verify public endpoints don't leak admin fields."""
    log("=" * 80)
    log("SCENARIO 7: PUBLIC FEED NO LEAK")
    log("=" * 80)
    
    try:
        # Get Wernersholm ID from admin list
        r = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        if r.status_code != 200:
            log(f"❌ FAIL: Could not get properties list")
            return False
        
        properties = r.json().get("properties", [])
        wernersholm = next((p for p in properties if "Wernersholm" in p.get("area", "")), None)
        
        if not wernersholm:
            log(f"❌ FAIL: Wernersholmvegen not found in properties list")
            return False
        
        wernersholm_id = wernersholm["id"]
        log(f"Using Wernersholm id: {wernersholm_id}")
        
        # First verify all properties are hidden
        r = requests.get(f"{BASE_URL}/public/properties", params={"limit": 24}, timeout=TIMEOUT)
        log(f"GET /public/properties (before): {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        count_before = data.get("count", 0)
        log(f"Public properties before: {count_before}")
        
        # Set Wernersholmvegen visible
        r = requests.put(
            f"{BASE_URL}/admin/properties/visibility",
            params={"key": ADMIN_KEY},
            json={"id": wernersholm_id, "visible": True},
            timeout=TIMEOUT
        )
        log(f"PUT /admin/properties/visibility (visible=true): {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Could not set property visible")
            return False
        
        # Get public feed
        r = requests.get(f"{BASE_URL}/public/properties", params={"limit": 24}, timeout=TIMEOUT)
        log(f"GET /public/properties (after): {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        properties = data.get("properties", [])
        
        if len(properties) == 0:
            log(f"❌ FAIL: Expected at least 1 visible property")
            return False
        
        # Check for leaked fields
        leaked_fields = [
            "listingTitle", "listingTitleSource", "finnTitle", "finnRentAmount",
            "finnSnapshotAt", "finnSnapshotStatus", "finnSnapshotStale",
            "editorialTitle", "editorialTitleAt", "rentBandSource",
            "finnUrl", "publicUrl", "ownerName", "tenantName", "fullAddress", "rentAmount"
        ]
        
        leaks = []
        for prop in properties:
            for field in leaked_fields:
                if field in prop:
                    leaks.append(f"{prop.get('id', 'unknown')}: {field}")
        
        if leaks:
            log(f"❌ FAIL: Public feed leaked admin fields:")
            for leak in leaks[:10]:
                log(f"  - {leak}")
            return False
        
        log(f"✅ Public feed does not leak admin fields")
        
        # Set back to hidden
        r = requests.put(
            f"{BASE_URL}/admin/properties/visibility",
            params={"key": ADMIN_KEY},
            json={"id": wernersholm_id, "visible": False},
            timeout=TIMEOUT
        )
        log(f"PUT /admin/properties/visibility (visible=false): {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Could not set property hidden")
            return False
        
        # Verify hidden
        r = requests.get(f"{BASE_URL}/public/properties", params={"limit": 24}, timeout=TIMEOUT)
        data = r.json()
        count_after = data.get("count", 0)
        
        if count_after != count_before:
            log(f"⚠️  WARNING: Public count after hiding ({count_after}) != before ({count_before})")
        
        log(f"✅ PASS: Public feed does not leak admin fields, property hidden again")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_scenario_8_newsletter_rendering():
    """Scenario 8: Newsletter preview with properties block."""
    log("=" * 80)
    log("SCENARIO 8: NEWSLETTER RENDERING")
    log("=" * 80)
    
    try:
        # Get Wernersholmvegen details
        r = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        if r.status_code != 200:
            log(f"❌ FAIL: Could not get properties")
            return False
        
        properties = r.json().get("properties", [])
        wernersholm = next((p for p in properties if "Wernersholm" in p.get("area", "")), None)
        
        if not wernersholm:
            log(f"❌ FAIL: Wernersholmvegen not found")
            return False
        
        wernersholm_id = wernersholm["id"]
        log(f"Using Wernersholm id: {wernersholm_id}")
        
        images = wernersholm.get("images", [])
        if not images:
            log(f"❌ FAIL: Wernersholmvegen has no images")
            return False
        
        # Create properties block
        properties_block = {
            "type": "properties",
            "items": [
                {
                    "pid": wernersholm_id,
                    "title": "Nyoppusset og fullt møblert hybel i attraktivt boligområde",
                    "titleSource": "finn",
                    "image": images[0],
                    "meta": "Wernersholmvegen · 1 soverom · 52 m²",
                    "band": "16 000–18 000 kr",
                    "bandSource": "plattform",
                    "status": "active",
                    "district": "Fana"
                }
            ]
        }
        
        r = requests.post(
            f"{BASE_URL}/admin/newsletter/preview",
            params={"key": ADMIN_KEY},
            json={
                "subject": "QA Test",
                "preheader": "Test",
                "blocks": [properties_block]
            },
            timeout=TIMEOUT
        )
        log(f"POST /admin/newsletter/preview: {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            log(f"Response: {r.text[:500]}")
            return False
        
        data = r.json()
        if not data.get("ok"):
            log(f"❌ FAIL: ok is not true")
            return False
        
        html = data.get("html", "")
        if not html:
            log(f"❌ FAIL: html is empty")
            return False
        
        # Check that property is in HTML (the newsletter should render the property's listingTitle from DB)
        # The title in the items array is just metadata for the editor
        if "Wernersholm" not in html:
            log(f"❌ FAIL: Property area not found in HTML")
            return False
        
        # Check for the listing title or at least some property info
        listing_title = wernersholm.get("listingTitle", "")
        if listing_title and listing_title[:30] in html:
            log(f"✅ Listing title found in HTML")
        elif "52 m²" in html:  # At least property meta is there
            log(f"✅ Property meta found in HTML (listing title may be rendered differently)")
        else:
            log(f"⚠️  WARNING: Neither listing title nor property meta found clearly in HTML")
        
        unavailable = data.get("unavailableProperties", [])
        if len(unavailable) > 0:
            log(f"⚠️  WARNING: unavailableProperties is not empty: {unavailable}")
        
        log(f"✅ PASS: Newsletter preview rendered successfully (HTML length: {len(html)})")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def test_scenario_9_newsletter_persistence():
    """Scenario 9: Newsletter draft persistence of titleSource/bandSource."""
    log("=" * 80)
    log("SCENARIO 9: NEWSLETTER PERSISTENCE")
    log("=" * 80)
    
    draft_id = None
    
    try:
        # Get Wernersholmvegen details
        r = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        if r.status_code != 200:
            log(f"❌ FAIL: Could not get properties")
            return False
        
        properties = r.json().get("properties", [])
        wernersholm = next((p for p in properties if "Wernersholm" in p.get("area", "")), None)
        
        if not wernersholm:
            log(f"❌ FAIL: Wernersholmvegen not found")
            return False
        
        wernersholm_id = wernersholm["id"]
        log(f"Using Wernersholm id: {wernersholm_id}")
        
        images = wernersholm.get("images", [])
        if not images:
            log(f"❌ FAIL: Wernersholmvegen has no images")
            return False
        
        # Create draft
        r = requests.post(
            f"{BASE_URL}/admin/newsletter/draft",
            params={"key": ADMIN_KEY},
            json={"title": "QA tittelkilde"},
            timeout=TIMEOUT
        )
        log(f"POST /admin/newsletter/draft (create): {r.status_code}")
        
        if r.status_code not in [200, 201]:
            log(f"❌ FAIL: Expected 200/201, got {r.status_code}")
            return False
        
        data = r.json()
        draft_id = data.get("id") or data.get("campaign", {}).get("id")
        
        if not draft_id:
            log(f"❌ FAIL: Could not get draft ID")
            return False
        
        log(f"Created draft: {draft_id}")
        
        # Update draft with properties block
        properties_block = {
            "type": "properties",
            "items": [
                {
                    "pid": wernersholm_id,
                    "title": "Nyoppusset og fullt møblert hybel i attraktivt boligområde",
                    "titleSource": "finn",
                    "image": images[0],
                    "meta": "Wernersholmvegen · 1 soverom · 52 m²",
                    "band": "16 000–18 000 kr",
                    "bandSource": "plattform",
                    "status": "active",
                    "district": "Fana"
                }
            ]
        }
        
        r = requests.put(
            f"{BASE_URL}/admin/newsletter/draft",
            params={"key": ADMIN_KEY},
            json={"id": draft_id, "blocks": [properties_block]},
            timeout=TIMEOUT
        )
        log(f"PUT /admin/newsletter/draft (update): {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        # Get campaign to verify persistence
        r = requests.get(
            f"{BASE_URL}/admin/newsletter/campaign",
            params={"id": draft_id, "key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        log(f"GET /admin/newsletter/campaign: {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        campaign = data.get("campaign", {})
        blocks = campaign.get("blocks", [])
        
        if not blocks:
            log(f"❌ FAIL: No blocks in campaign")
            return False
        
        properties_block = next((b for b in blocks if b.get("type") == "properties"), None)
        if not properties_block:
            log(f"❌ FAIL: No properties block found")
            return False
        
        items = properties_block.get("items", [])
        if not items:
            log(f"❌ FAIL: No items in properties block")
            return False
        
        item = items[0]
        title_source = item.get("titleSource")
        band_source = item.get("bandSource")
        
        if title_source != "finn":
            log(f"❌ FAIL: titleSource should be 'finn', got '{title_source}'")
            return False
        
        if band_source != "plattform":
            log(f"❌ FAIL: bandSource should be 'plattform', got '{band_source}'")
            return False
        
        log(f"✅ titleSource and bandSource persisted correctly")
        
        # Delete draft
        r = requests.delete(
            f"{BASE_URL}/admin/newsletter/campaign",
            params={"id": draft_id, "key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        log(f"DELETE /admin/newsletter/campaign: {r.status_code}")
        
        if r.status_code != 200:
            log(f"⚠️  WARNING: Could not delete draft: {r.status_code}")
        else:
            log(f"✅ Draft deleted")
        
        log(f"✅ PASS: Newsletter persistence test successful")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        
        # Try to clean up draft
        if draft_id:
            try:
                requests.delete(
                    f"{BASE_URL}/admin/newsletter/campaign",
                    params={"id": draft_id, "key": ADMIN_KEY},
                    timeout=TIMEOUT
                )
            except:
                pass
        
        return False

def test_scenario_10_regression():
    """Scenario 10: Regression tests."""
    log("=" * 80)
    log("SCENARIO 10: REGRESSION TESTS")
    log("=" * 80)
    
    try:
        # Test 1: GET /admin/properties
        r = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        log(f"GET /admin/properties: {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        total = data.get("total", 0)
        incomplete_count = data.get("incompleteCount", 0)
        duplicate_count = data.get("duplicateCount", 0)
        
        if total != 22:
            log(f"⚠️  WARNING: Expected total=22, got {total}")
        
        if incomplete_count != 5:
            log(f"⚠️  WARNING: Expected incompleteCount=5, got {incomplete_count}")
        
        if duplicate_count != 0:
            log(f"⚠️  WARNING: Expected duplicateCount=0, got {duplicate_count}")
        
        # Count properties with finnUrl and finnSource='plattform'
        properties = data.get("properties", [])
        finn_platform_count = sum(1 for p in properties if p.get("finnUrl") and p.get("finnSource") == "plattform")
        
        if finn_platform_count != 10:
            log(f"⚠️  WARNING: Expected 10 properties with finnUrl and finnSource='plattform', got {finn_platform_count}")
        
        log(f"✅ GET /admin/properties: total={total}, incompleteCount={incomplete_count}, duplicateCount={duplicate_count}, finnPlatform={finn_platform_count}")
        
        # Test 2: GET /admin/kpi
        r = requests.get(f"{BASE_URL}/admin/kpi", params={"key": ADMIN_KEY, "days": 30}, timeout=TIMEOUT)
        log(f"GET /admin/kpi: {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        # Test 3: GET /admin/kpi/drill
        r = requests.get(
            f"{BASE_URL}/admin/kpi/drill",
            params={"key": ADMIN_KEY, "metric": "mrr_actual", "days": 90},
            timeout=TIMEOUT
        )
        log(f"GET /admin/kpi/drill: {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        totals = data.get("totals", {})
        amount = totals.get("amount")
        
        if amount != 7895:
            log(f"⚠️  WARNING: Expected totals.amount=7895, got {amount}")
        
        log(f"✅ GET /admin/kpi/drill: totals.amount={amount}")
        
        # Test 4: GET /api/
        r = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
        log(f"GET /api/: {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        # Test 5: GET /newsletter/property-interest/lookup (public endpoint, no leak check)
        r = requests.get(
            f"{BASE_URL}/newsletter/property-interest/lookup",
            params={"property": "6189812a-ae20-4d07-98f6-7764845291bb"},
            timeout=TIMEOUT
        )
        log(f"GET /newsletter/property-interest/lookup: {r.status_code}")
        
        if r.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        
        # Check for leaked fields
        leaked_fields = [
            "listingTitle", "finnTitle", "editorialTitle", "rentBandSource",
            "ownerName", "tenantName", "fullAddress", "rentAmount"
        ]
        
        leaks = []
        for field in leaked_fields:
            if field in data:
                leaks.append(field)
        
        if leaks:
            log(f"❌ FAIL: property-interest/lookup leaked fields: {leaks}")
            return False
        
        log(f"✅ property-interest/lookup does not leak admin/PII fields")
        
        log(f"✅ PASS: All regression tests passed")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Exception: {e}")
        return False

def mandatory_cleanup():
    """MANDATORY: Clear all editorial titles and hide all properties."""
    log("=" * 80)
    log("MANDATORY CLEANUP")
    log("=" * 80)
    
    try:
        # Get all properties
        r = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        if r.status_code != 200:
            log(f"❌ FAIL: Could not get properties for cleanup")
            return False
        
        properties = r.json().get("properties", [])
        
        # Clear editorial titles
        cleared_count = 0
        for prop in properties:
            if prop.get("editorialTitle"):
                r = requests.put(
                    f"{BASE_URL}/admin/properties/title",
                    params={"key": ADMIN_KEY},
                    json={"id": prop["id"], "title": ""},
                    timeout=TIMEOUT
                )
                if r.status_code == 200:
                    cleared_count += 1
        
        log(f"✅ Cleared {cleared_count} editorial titles")
        
        # Hide all visible properties
        visible_ids = [p["id"] for p in properties if p.get("visible")]
        if visible_ids:
            r = requests.put(
                f"{BASE_URL}/admin/properties/visibility",
                params={"key": ADMIN_KEY},
                json={"ids": visible_ids, "visible": False},
                timeout=TIMEOUT
            )
            if r.status_code == 200:
                log(f"✅ Hidden {len(visible_ids)} properties")
            else:
                log(f"⚠️  WARNING: Could not hide properties: {r.status_code}")
        else:
            log(f"✅ No visible properties to hide")
        
        # Check for finnSource='manuell'
        manual_count = sum(1 for p in properties if p.get("finnSource") == "manuell")
        if manual_count > 0:
            log(f"⚠️  WARNING: {manual_count} properties have finnSource='manuell'")
        else:
            log(f"✅ No properties with finnSource='manuell'")
        
        # Verify cleanup
        r = requests.get(f"{BASE_URL}/admin/properties", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        if r.status_code == 200:
            properties = r.json().get("properties", [])
            editorial_count = sum(1 for p in properties if p.get("editorialTitle"))
            visible_count = sum(1 for p in properties if p.get("visible"))
            manual_count = sum(1 for p in properties if p.get("finnSource") == "manuell")
            
            log(f"Final state: editorialTitle={editorial_count}, visible={visible_count}, finnSource='manuell'={manual_count}")
            
            if editorial_count > 0 or visible_count > 0 or manual_count > 0:
                log(f"❌ FAIL: Cleanup incomplete")
                return False
        
        log(f"✅ PASS: Mandatory cleanup completed successfully")
        return True
        
    except Exception as e:
        log(f"❌ FAIL: Cleanup exception: {e}")
        return False

def main():
    log("=" * 80)
    log("BACKEND TEST: FINN LISTING TITLE + EDITORIAL TITLE + RENT DEVIATION")
    log("=" * 80)
    log(f"Base URL: {BASE_URL}")
    log(f"Admin key: {ADMIN_KEY}")
    log(f"Max FINN calls: {MAX_FINN_CALLS}")
    log("")
    
    results = {}
    
    # Run all scenarios
    results["1_new_fields"] = test_scenario_1_new_fields()
    results["2_editorial_title"] = test_scenario_2_editorial_title()
    results["3_validation_auth"] = test_scenario_3_validation_auth()
    results["4_finn_snapshot_single"] = test_scenario_4_finn_snapshot_single()
    results["5_no_finn_url"] = test_scenario_5_no_finn_url()
    results["6_finn_snapshot_bulk"] = test_scenario_6_finn_snapshot_bulk()
    results["7_public_no_leak"] = test_scenario_7_public_no_leak()
    results["8_newsletter_rendering"] = test_scenario_8_newsletter_rendering()
    results["9_newsletter_persistence"] = test_scenario_9_newsletter_persistence()
    results["10_regression"] = test_scenario_10_regression()
    
    # Mandatory cleanup
    results["cleanup"] = mandatory_cleanup()
    
    # Summary
    log("")
    log("=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for scenario, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        log(f"{status}: {scenario}")
    
    log("")
    log(f"Total FINN calls made: {finn_calls_made}/{MAX_FINN_CALLS}")
    log(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        log("✅ ALL TESTS PASSED")
        return 0
    else:
        log(f"❌ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    exit(main())
