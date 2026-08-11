#!/usr/bin/env python3
"""
FINN-berikelse + strammere duplikatregel — Backend Testing
===========================================================
Tests the FINN enrichment feature for properties with 10 comprehensive scenarios.

Base URL: https://saker-hub.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4
FINN URL (verified live, 12 images): https://www.finn.no/realestate/lettings/ad.html?finnkode=464252860

CRITICAL SAFETY RULES:
- DO NOT POST to /api/admin/newsletter/send or /newsletter/test (SendGrid is LIVE)
- DO NOT POST to /newsletter/property-interest/confirm with valid token
- DO NOT POST to /admin/finance/sync-contracts or /sync-customers
- DO NOT delete properties/leads/campaigns
- FINN can throttle requests — endpoint caches, but keep under ~10 calls to FINN URL
- MANDATORY CLEANUP: Remove ALL FINN connections before finishing
"""

import requests
import json
import sys
from typing import Dict, Any, List, Optional

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
FINN_URL = "https://www.finn.no/realestate/lettings/ad.html?finnkode=464252860"
TIMEOUT = 60  # seconds

# Test state tracking
enriched_properties = []  # Track properties we enriched for cleanup


def log_test(scenario: str, status: str, details: str = ""):
    """Log test result with clear formatting."""
    symbol = "✅" if status == "PASS" else "❌"
    print(f"{symbol} SCENARIO {scenario}: {status}")
    if details:
        print(f"   {details}")


def get_properties() -> Dict[str, Any]:
    """GET /admin/properties - fetch all properties."""
    url = f"{BASE_URL}/admin/properties?key={ADMIN_KEY}"
    resp = requests.get(url, timeout=TIMEOUT)
    return resp.json()


def enrich_property(property_id: str, finn_url: str) -> Dict[str, Any]:
    """POST /admin/properties/finn - enrich a property with FINN data."""
    url = f"{BASE_URL}/admin/properties/finn?key={ADMIN_KEY}"
    payload = {"id": property_id, "url": finn_url}
    resp = requests.post(url, json=payload, timeout=TIMEOUT)
    return resp.status_code, resp.json()


def sync_properties(env: str = "prod") -> Dict[str, Any]:
    """POST /admin/properties/sync - sync properties from platform."""
    url = f"{BASE_URL}/admin/properties/sync?key={ADMIN_KEY}&env={env}"
    resp = requests.post(url, json={}, timeout=TIMEOUT)
    return resp.status_code, resp.json()


def preview_newsletter(blocks: List[Dict]) -> Dict[str, Any]:
    """POST /admin/newsletter/preview - preview newsletter (stateless, no send)."""
    url = f"{BASE_URL}/admin/newsletter/preview?key={ADMIN_KEY}"
    payload = {
        "subject": "Test FINN Enrichment",
        "preheader": "Test",
        "blocks": blocks
    }
    resp = requests.post(url, json=payload, timeout=TIMEOUT)
    return resp.status_code, resp.json()


def lookup_property_interest(external_id: str) -> Dict[str, Any]:
    """GET /newsletter/property-interest/lookup - public property lookup."""
    url = f"{BASE_URL}/newsletter/property-interest/lookup?property={external_id}"
    resp = requests.get(url, timeout=TIMEOUT)
    return resp.status_code, resp.json()


def get_public_properties(limit: int = 24) -> Dict[str, Any]:
    """GET /api/public/properties - public properties feed."""
    url = f"{BASE_URL}/public/properties?limit={limit}"
    resp = requests.get(url, timeout=TIMEOUT)
    return resp.status_code, resp.json()


def get_kpi(days: int = 30) -> Dict[str, Any]:
    """GET /admin/kpi - KPI dashboard."""
    url = f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days={days}"
    resp = requests.get(url, timeout=TIMEOUT)
    return resp.status_code, resp.json()


def get_newsletter_campaign(campaign_id: str) -> Dict[str, Any]:
    """GET /admin/newsletter/campaign - get newsletter campaign."""
    url = f"{BASE_URL}/admin/newsletter/campaign?key={ADMIN_KEY}&id={campaign_id}"
    resp = requests.get(url, timeout=TIMEOUT)
    return resp.status_code, resp.json()


def cleanup_finn_enrichments():
    """MANDATORY: Remove all FINN enrichments created during testing."""
    print("\n🧹 MANDATORY CLEANUP: Removing all FINN enrichments...")
    
    if not enriched_properties:
        print("   No properties to clean up.")
        return True
    
    success_count = 0
    for prop_id in enriched_properties:
        try:
            status, result = enrich_property(prop_id, "")  # Empty URL removes enrichment
            if status == 200 and result.get("ok") and result.get("removed"):
                success_count += 1
                print(f"   ✅ Removed FINN enrichment from property {prop_id}")
            else:
                print(f"   ⚠️  Failed to remove enrichment from {prop_id}: {result}")
        except Exception as e:
            print(f"   ❌ Error removing enrichment from {prop_id}: {e}")
    
    # Verify cleanup
    try:
        data = get_properties()
        properties_with_finn = [p for p in data.get("properties", []) if p.get("finnUrl")]
        
        if len(properties_with_finn) == 0:
            print(f"   ✅ CLEANUP VERIFIED: 0 properties with finnUrl")
            return True
        else:
            print(f"   ⚠️  CLEANUP INCOMPLETE: {len(properties_with_finn)} properties still have finnUrl")
            return False
    except Exception as e:
        print(f"   ❌ Error verifying cleanup: {e}")
        return False


def run_tests():
    """Run all 10 test scenarios."""
    print("=" * 80)
    print("FINN ENRICHMENT + DUPLICATE RULE TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"FINN URL: {FINN_URL}")
    print("=" * 80)
    
    try:
        # Get initial properties state
        print("\n📋 Fetching initial properties state...")
        data = get_properties()
        properties = data.get("properties", [])
        total = data.get("total", 0)
        
        print(f"   Total properties: {total}")
        print(f"   Properties in response: {len(properties)}")
        
        # Find test properties
        sandslimarka_prop = None
        wernersholmvegen_prop = None
        
        for p in properties:
            area = p.get("area") or ""
            if "Sandslimarka" in area or "sandslimarka" in area.lower():
                sandslimarka_prop = p
                print(f"   Found Sandslimarka property: {p.get('id')} - {p.get('title')} - {len(p.get('images', []))} images")
            if "Wernersholmvegen" in area or "wernersholmvegen" in area.lower():
                wernersholmvegen_prop = p
                print(f"   Found Wernersholmvegen property: {p.get('id')} - {p.get('title')} - {len(p.get('images', []))} images")
        
        if not sandslimarka_prop:
            print("   ❌ ERROR: Could not find Sandslimarka property")
            return False
        
        if not wernersholmvegen_prop:
            print("   ❌ ERROR: Could not find Wernersholmvegen property")
            return False
        
        # ===================================================================
        # SCENARIO 1: PLATTFORM VINNER
        # ===================================================================
        print("\n" + "=" * 80)
        print("SCENARIO 1: PLATTFORM VINNER (Sandslimarka with 12 platform images)")
        print("=" * 80)
        
        sandslimarka_id = sandslimarka_prop.get("id")
        sandslimarka_images_before = len(sandslimarka_prop.get("images", []))
        sandslimarka_sqm_before = sandslimarka_prop.get("sqm")
        
        print(f"   Before enrichment: {sandslimarka_images_before} images, sqm={sandslimarka_sqm_before}")
        
        # Enrich with FINN
        status, result = enrich_property(sandslimarka_id, FINN_URL)
        enriched_properties.append(sandslimarka_id)
        
        if status != 200 or not result.get("ok"):
            log_test("1", "FAIL", f"Failed to enrich: HTTP {status}, {result}")
            return False
        
        # Verify enrichment
        prop = result.get("property", {})
        finn_url = prop.get("finnUrl")
        finn_code = prop.get("finnCode")
        finn_status = prop.get("finnStatus")
        images = prop.get("images", [])
        image_source = prop.get("imageSource")
        sqm = prop.get("sqm")
        enriched_fields = prop.get("enrichedFields", [])
        
        # CRITICAL: Platform data should win
        if finn_url != FINN_URL:
            log_test("1", "FAIL", f"finnUrl not set: {finn_url}")
            return False
        
        if finn_code != "464252860":
            log_test("1", "FAIL", f"finnCode incorrect: {finn_code}")
            return False
        
        if finn_status != "aktiv":
            log_test("1", "FAIL", f"finnStatus incorrect: {finn_status}")
            return False
        
        # Images should STILL be platform's (not FINN's)
        if len(images) != sandslimarka_images_before:
            log_test("1", "FAIL", f"Images changed from {sandslimarka_images_before} to {len(images)} (should stay same)")
            return False
        
        if image_source == "finn":
            log_test("1", "FAIL", f"imageSource is 'finn' but should NOT be (platform wins)")
            return False
        
        # sqm should be 65 (not 62 from FINN)
        if sqm != 65:
            log_test("1", "FAIL", f"sqm is {sqm}, expected 65 (platform value)")
            return False
        
        # enrichedFields should contain 'leie' but NOT 'bilder'
        if "leie" not in enriched_fields:
            log_test("1", "FAIL", f"enrichedFields missing 'leie': {enriched_fields}")
            return False
        
        if "bilder" in enriched_fields:
            log_test("1", "FAIL", f"enrichedFields contains 'bilder' but shouldn't (platform has images): {enriched_fields}")
            return False
        
        log_test("1", "PASS", f"Platform data wins: {len(images)} images (platform), sqm=65 (platform), enrichedFields={enriched_fields}")
        
        # ===================================================================
        # SCENARIO 2: FYLLER HULL
        # ===================================================================
        print("\n" + "=" * 80)
        print("SCENARIO 2: FYLLER HULL (Wernersholmvegen with 0 images)")
        print("=" * 80)
        
        wernersholmvegen_id = wernersholmvegen_prop.get("id")
        wernersholmvegen_images_before = len(wernersholmvegen_prop.get("images", []))
        
        print(f"   Before enrichment: {wernersholmvegen_images_before} images")
        
        # Count properties with images before
        props_with_images_before = len([p for p in properties if len(p.get("images", [])) > 0])
        
        # Enrich with FINN
        status, result = enrich_property(wernersholmvegen_id, FINN_URL)
        enriched_properties.append(wernersholmvegen_id)
        
        if status != 200 or not result.get("ok"):
            log_test("2", "FAIL", f"Failed to enrich: HTTP {status}, {result}")
            return False
        
        # Verify enrichment
        prop = result.get("property", {})
        images = prop.get("images", [])
        image_source = prop.get("imageSource")
        incomplete = prop.get("incomplete")
        missing_fields = prop.get("missingFields", [])
        enriched_fields = prop.get("enrichedFields", [])
        
        if len(images) != 12:
            log_test("2", "FAIL", f"Expected 12 images, got {len(images)}")
            return False
        
        if image_source != "finn":
            log_test("2", "FAIL", f"imageSource should be 'finn', got '{image_source}'")
            return False
        
        if incomplete:
            log_test("2", "FAIL", f"Property still marked incomplete: {incomplete}")
            return False
        
        if "bilder" in missing_fields:
            log_test("2", "FAIL", f"'bilder' still in missingFields: {missing_fields}")
            return False
        
        if "bilder" not in enriched_fields:
            log_test("2", "FAIL", f"'bilder' not in enrichedFields: {enriched_fields}")
            return False
        
        # Check that count of properties with images increased
        data_after = get_properties()
        props_with_images_after = len([p for p in data_after.get("properties", []) if len(p.get("images", [])) > 0])
        
        if props_with_images_after <= props_with_images_before:
            log_test("2", "FAIL", f"Properties with images didn't increase: {props_with_images_before} -> {props_with_images_after}")
            return False
        
        log_test("2", "PASS", f"Filled gaps: 12 images from FINN, imageSource='finn', incomplete=false, enrichedFields={enriched_fields}")
        
        # ===================================================================
        # SCENARIO 3: SYNK MÅ IKKE SLETTE BERIKELSEN (MOST IMPORTANT)
        # ===================================================================
        print("\n" + "=" * 80)
        print("SCENARIO 3: SYNK MÅ IKKE SLETTE BERIKELSEN (MOST IMPORTANT)")
        print("=" * 80)
        
        print("   Running sync from prod...")
        status, sync_result = sync_properties("prod")
        
        if status != 200:
            log_test("3", "FAIL", f"Sync failed: HTTP {status}, {sync_result}")
            return False
        
        print(f"   Sync result: {sync_result}")
        
        # Verify Wernersholmvegen still has FINN enrichment
        data_after_sync = get_properties()
        wernersholmvegen_after = None
        
        for p in data_after_sync.get("properties", []):
            if p.get("id") == wernersholmvegen_id:
                wernersholmvegen_after = p
                break
        
        if not wernersholmvegen_after:
            log_test("3", "FAIL", "Wernersholmvegen property not found after sync")
            return False
        
        finn_url_after = wernersholmvegen_after.get("finnUrl")
        images_after = wernersholmvegen_after.get("images", [])
        
        if not finn_url_after:
            log_test("3", "FAIL", "finnUrl was removed by sync (enrichment lost)")
            return False
        
        if len(images_after) != 12:
            log_test("3", "FAIL", f"Images lost after sync: {len(images_after)} (expected 12)")
            return False
        
        log_test("3", "PASS", f"Enrichment survived sync: finnUrl={finn_url_after}, {len(images_after)} images")
        
        # ===================================================================
        # SCENARIO 4: NYHETSBREV-PORTEN
        # ===================================================================
        print("\n" + "=" * 80)
        print("SCENARIO 4: NYHETSBREV-PORTEN (preview should allow enriched property)")
        print("=" * 80)
        
        # Build newsletter preview with enriched property
        wernersholmvegen_external_id = wernersholmvegen_after.get("externalId")
        
        blocks = [
            {"type": "heading", "text": "Test FINN Enrichment"},
            {
                "type": "properties",
                "items": [{
                    "pid": wernersholmvegen_external_id,
                    "title": wernersholmvegen_after.get("title", ""),
                    "image": wernersholmvegen_after.get("images", [""])[0],
                    "meta": f"{wernersholmvegen_after.get('bedrooms', 0)} soverom · {wernersholmvegen_after.get('sqm', 0)} m²",
                    "band": wernersholmvegen_after.get("monthlyRentBand", ""),
                    "status": wernersholmvegen_after.get("status", ""),
                    "district": wernersholmvegen_after.get("district", "")
                }]
            }
        ]
        
        status, preview_result = preview_newsletter(blocks)
        
        if status != 200 or not preview_result.get("ok"):
            log_test("4", "FAIL", f"Preview failed: HTTP {status}, {preview_result}")
            return False
        
        unavailable = preview_result.get("unavailableProperties", [])
        html = preview_result.get("html", "")
        
        if len(unavailable) > 0:
            log_test("4", "FAIL", f"Property marked unavailable: {unavailable}")
            return False
        
        if "images.finncdn.no" not in html:
            log_test("4", "FAIL", "HTML doesn't contain images.finncdn.no (FINN image not in preview)")
            return False
        
        log_test("4", "PASS", f"Newsletter preview passed: unavailableProperties=[], HTML contains FINN images")
        
        # ===================================================================
        # SCENARIO 5: BOLIGINTERESSE-OPPSLAG
        # ===================================================================
        print("\n" + "=" * 80)
        print("SCENARIO 5: BOLIGINTERESSE-OPPSLAG (public lookup)")
        print("=" * 80)
        
        status, lookup_result = lookup_property_interest(wernersholmvegen_external_id)
        
        if status != 200:
            log_test("5", "FAIL", f"Lookup failed: HTTP {status}, {lookup_result}")
            return False
        
        preview = lookup_result.get("preview")
        prop_data = lookup_result.get("property", {})
        images = prop_data.get("images", [])
        finn_url = prop_data.get("finnUrl")
        
        if not preview:
            log_test("5", "FAIL", f"preview field not true: {preview}")
            return False
        
        if len(images) != 12:
            log_test("5", "FAIL", f"Expected 12 images, got {len(images)}")
            return False
        
        if not finn_url:
            log_test("5", "FAIL", "finnUrl not present in lookup response")
            return False
        
        # Check that internal fields are NOT leaked
        internal_fields = ["missingFields", "incomplete", "enrichedFields", "districtSource"]
        leaked_fields = [f for f in internal_fields if f in prop_data]
        
        if leaked_fields:
            log_test("5", "FAIL", f"Internal fields leaked: {leaked_fields}")
            return False
        
        log_test("5", "PASS", f"Lookup OK: 12 images, finnUrl present, no internal fields leaked")
        
        # ===================================================================
        # SCENARIO 6: OFFENTLIG FEED SKAL IKKE LEKKE
        # ===================================================================
        print("\n" + "=" * 80)
        print("SCENARIO 6: OFFENTLIG FEED SKAL IKKE LEKKE")
        print("=" * 80)
        
        status, public_result = get_public_properties(24)
        
        if status != 200 or not public_result.get("ok"):
            log_test("6", "FAIL", f"Public properties failed: HTTP {status}, {public_result}")
            return False
        
        public_props = public_result.get("properties", [])
        
        # Check that NO property has internal fields
        internal_fields = ["finnUrl", "finnCode", "finnStatus", "enrichedFields", "missingFields", "incomplete", "districtSource"]
        
        leaked_count = 0
        for p in public_props:
            leaked = [f for f in internal_fields if f in p]
            if leaked:
                leaked_count += 1
                print(f"   ⚠️  Property {p.get('id')} leaked fields: {leaked}")
        
        if leaked_count > 0:
            log_test("6", "FAIL", f"{leaked_count} properties leaked internal fields")
            return False
        
        log_test("6", "PASS", f"No internal fields leaked in {len(public_props)} public properties")
        
        # ===================================================================
        # SCENARIO 7: FJERNING
        # ===================================================================
        print("\n" + "=" * 80)
        print("SCENARIO 7: FJERNING (empty url removes enrichment)")
        print("=" * 80)
        
        # Remove enrichment from Sandslimarka (we'll re-add Wernersholmvegen later for cleanup)
        status, result = enrich_property(sandslimarka_id, "")
        
        if status != 200 or not result.get("ok") or not result.get("removed"):
            log_test("7", "FAIL", f"Failed to remove enrichment: HTTP {status}, {result}")
            return False
        
        # Verify property is back to original state
        data_after_remove = get_properties()
        sandslimarka_after = None
        
        for p in data_after_remove.get("properties", []):
            if p.get("id") == sandslimarka_id:
                sandslimarka_after = p
                break
        
        if not sandslimarka_after:
            log_test("7", "FAIL", "Sandslimarka property not found after removal")
            return False
        
        finn_url_after = sandslimarka_after.get("finnUrl")
        images_after = sandslimarka_after.get("images", [])
        
        if finn_url_after:
            log_test("7", "FAIL", f"finnUrl still present after removal: {finn_url_after}")
            return False
        
        # Should be back to original image count (12 platform images)
        if len(images_after) != sandslimarka_images_before:
            log_test("7", "FAIL", f"Images not restored: {len(images_after)} (expected {sandslimarka_images_before})")
            return False
        
        log_test("7", "PASS", f"Enrichment removed: finnUrl=None, {len(images_after)} images (back to platform)")
        
        # Remove from cleanup list since we already cleaned it
        enriched_properties.remove(sandslimarka_id)
        
        # ===================================================================
        # SCENARIO 8: VALIDERING
        # ===================================================================
        print("\n" + "=" * 80)
        print("SCENARIO 8: VALIDERING (various validation scenarios)")
        print("=" * 80)
        
        # 8a: Invalid URL (not FINN)
        status, result = enrich_property(sandslimarka_id, "https://www.vg.no")
        if status != 400:
            log_test("8a", "FAIL", f"Expected HTTP 400 for invalid URL, got {status}")
            return False
        if "gyldig finn.no" not in result.get("error", "").lower():
            log_test("8a", "FAIL", f"Expected 'gyldig finn.no' error, got: {result.get('error')}")
            return False
        print("   ✅ 8a: Invalid URL rejected with HTTP 400")
        
        # 8b: Missing id
        status, result = enrich_property("finnes-ikke-123", FINN_URL)
        if status != 404:
            log_test("8b", "FAIL", f"Expected HTTP 404 for missing id, got {status}")
            return False
        print("   ✅ 8b: Missing id rejected with HTTP 404")
        
        # 8c: Dead ad (finnkode=1)
        dead_finn_url = "https://www.finn.no/realestate/lettings/ad.html?finnkode=1"
        status, result = enrich_property(sandslimarka_id, dead_finn_url)
        if status != 200:
            log_test("8c", "FAIL", f"Expected HTTP 200 for dead ad, got {status}")
            return False
        if result.get("ok") != False:
            log_test("8c", "FAIL", f"Expected ok:false for dead ad, got: {result.get('ok')}")
            return False
        if result.get("finnStatus") != "utgatt":
            log_test("8c", "FAIL", f"Expected finnStatus:'utgatt', got: {result.get('finnStatus')}")
            return False
        print("   ✅ 8c: Dead ad returns HTTP 200 with ok:false and finnStatus:'utgatt'")
        
        # 8d: No auth
        url = f"{BASE_URL}/admin/properties/finn"
        resp = requests.post(url, json={"id": sandslimarka_id, "url": FINN_URL}, timeout=TIMEOUT)
        if resp.status_code != 401:
            log_test("8d", "FAIL", f"Expected HTTP 401 without key, got {resp.status_code}")
            return False
        print("   ✅ 8d: No auth rejected with HTTP 401")
        
        log_test("8", "PASS", "All validation scenarios passed")
        
        # ===================================================================
        # SCENARIO 9: DUPLIKATREGEL
        # ===================================================================
        print("\n" + "=" * 80)
        print("SCENARIO 9: DUPLIKATREGEL (stricter duplicate detection)")
        print("=" * 80)
        
        data = get_properties()
        duplicate_count = data.get("duplicateCount") or data.get("meta", {}).get("duplicateCount")
        
        if duplicate_count is None:
            # Try to find it in the response
            properties = data.get("properties", [])
            duplicate_count = len([p for p in properties if p.get("duplicate")])
        
        print(f"   duplicateCount: {duplicate_count}")
        
        if duplicate_count != 2:
            log_test("9", "FAIL", f"Expected duplicateCount=2, got {duplicate_count}")
            return False
        
        # Find specific properties
        ovregaten_korttid = None
        ovregaten_hybrid = None
        
        for p in data.get("properties", []):
            external_id = p.get("externalId", "")
            title = p.get("title", "")
            
            if external_id == "966c2185-11bf-470e-af73-878c939691fd":
                ovregaten_korttid = p
                print(f"   Found ØVREGATEN korttid: {title}, duplicate={p.get('duplicate')}, model={p.get('model')}")
            
            if external_id == "7364a8a8-51c9-486a-a177-2d7311f538c3":
                ovregaten_hybrid = p
                print(f"   Found ØVREGATEN hybrid: {title}, duplicate={p.get('duplicate')}, model={p.get('model')}")
        
        if not ovregaten_korttid:
            log_test("9", "FAIL", "Could not find ØVREGATEN korttid property (966c2185-11bf-470e-af73-878c939691fd)")
            return False
        
        if not ovregaten_hybrid:
            log_test("9", "FAIL", "Could not find ØVREGATEN hybrid property (7364a8a8-51c9-486a-a177-2d7311f538c3)")
            return False
        
        # ØVREGATEN korttid should be duplicate=true
        if not ovregaten_korttid.get("duplicate"):
            log_test("9", "FAIL", f"ØVREGATEN korttid should have duplicate=true, got {ovregaten_korttid.get('duplicate')}")
            return False
        
        # ØVREGATEN hybrid should be duplicate=false
        if ovregaten_hybrid.get("duplicate"):
            log_test("9", "FAIL", f"ØVREGATEN hybrid should have duplicate=false, got {ovregaten_hybrid.get('duplicate')}")
            return False
        
        log_test("9", "PASS", f"Duplicate rule working: duplicateCount=2, ØVREGATEN korttid=duplicate, hybrid=not duplicate")
        
        # ===================================================================
        # SCENARIO 10: REGRESJON
        # ===================================================================
        print("\n" + "=" * 80)
        print("SCENARIO 10: REGRESJON (existing endpoints still work)")
        print("=" * 80)
        
        # 10a: GET /admin/properties
        data = get_properties()
        total = data.get("total")
        district_count = data.get("districtCount") or data.get("meta", {}).get("districtCount")
        incomplete_count = data.get("incompleteCount") or data.get("meta", {}).get("incompleteCount")
        
        if total != 27:
            log_test("10a", "FAIL", f"Expected total=27, got {total}")
            return False
        
        if district_count != 27:
            log_test("10a", "FAIL", f"Expected districtCount=27, got {district_count}")
            return False
        
        if incomplete_count != 8:
            log_test("10a", "FAIL", f"Expected incompleteCount=8, got {incomplete_count}")
            return False
        
        print(f"   ✅ 10a: GET /admin/properties OK (total=27, districtCount=27, incompleteCount=8)")
        
        # 10b: GET /admin/kpi
        status, kpi_result = get_kpi(30)
        if status != 200 or not kpi_result.get("ok"):
            log_test("10b", "FAIL", f"KPI failed: HTTP {status}")
            return False
        print(f"   ✅ 10b: GET /admin/kpi OK")
        
        # 10c: GET /api/
        url = f"{BASE_URL}/"
        resp = requests.get(url, timeout=TIMEOUT)
        if resp.status_code != 200:
            log_test("10c", "FAIL", f"Health check failed: HTTP {resp.status_code}")
            return False
        print(f"   ✅ 10c: GET /api/ OK")
        
        # 10d: GET /admin/newsletter/campaign
        campaign_id = "6783d667-c93e-45ca-a458-341f9d79acf5"
        status, campaign_result = get_newsletter_campaign(campaign_id)
        if status != 200:
            log_test("10d", "FAIL", f"Campaign failed: HTTP {status}")
            return False
        
        # Check that property cards still have district
        blocks = campaign_result.get("campaign", {}).get("blocks", [])
        property_blocks = [b for b in blocks if b.get("type") == "properties"]
        
        if property_blocks:
            items = property_blocks[0].get("items", [])
            if items:
                has_district = any(item.get("district") for item in items)
                if not has_district:
                    log_test("10d", "FAIL", "Property cards missing district field")
                    return False
        
        print(f"   ✅ 10d: GET /admin/newsletter/campaign OK (property cards have district)")
        
        log_test("10", "PASS", "All regression tests passed")
        
        return True
        
    except Exception as e:
        print(f"\n❌ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # MANDATORY CLEANUP
        cleanup_success = cleanup_finn_enrichments()
        
        if not cleanup_success:
            print("\n⚠️  WARNING: Cleanup was not fully successful!")
            print("   Please manually remove FINN enrichments from properties.")
        
        # Final verification
        try:
            data = get_properties()
            properties_with_finn = [p for p in data.get("properties", []) if p.get("finnUrl")]
            properties_without_images = len([p for p in data.get("properties", []) if len(p.get("images", [])) == 0])
            duplicate_count = data.get("duplicateCount") or data.get("meta", {}).get("duplicateCount")
            
            if duplicate_count is None:
                properties = data.get("properties", [])
                duplicate_count = len([p for p in properties if p.get("duplicate")])
            
            print("\n" + "=" * 80)
            print("FINAL STATE VERIFICATION")
            print("=" * 80)
            print(f"   Properties with finnUrl: {len(properties_with_finn)}")
            print(f"   Properties without images: {properties_without_images}")
            print(f"   duplicateCount: {duplicate_count}")
            
            if len(properties_with_finn) == 0 and properties_without_images == 14 and duplicate_count == 2:
                print("   ✅ FINAL STATE CORRECT")
            else:
                print("   ⚠️  FINAL STATE MISMATCH")
                if len(properties_with_finn) != 0:
                    print(f"      Expected 0 properties with finnUrl, got {len(properties_with_finn)}")
                if properties_without_images != 14:
                    print(f"      Expected 14 properties without images, got {properties_without_images}")
                if duplicate_count != 2:
                    print(f"      Expected duplicateCount=2, got {duplicate_count}")
        except Exception as e:
            print(f"   ❌ Error verifying final state: {e}")


if __name__ == "__main__":
    print("\n🚀 Starting FINN Enrichment Backend Tests...\n")
    
    success = run_tests()
    
    print("\n" + "=" * 80)
    if success:
        print("✅ ALL TESTS PASSED")
        print("=" * 80)
        sys.exit(0)
    else:
        print("❌ SOME TESTS FAILED")
        print("=" * 80)
        sys.exit(1)
