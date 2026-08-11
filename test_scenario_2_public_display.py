#!/usr/bin/env python3
"""
Focused test for SCENARIO 2: OFFENTLIG VISNING
This test ensures the property is fully publishable before testing public display.
"""

import requests
import json

BASE_URL = "https://saker-hub.preview.emergentagent.com"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def main():
    try:
        # Get Baglergaten property
        r = requests.get(f"{BASE_URL}/api/admin/properties?key={ADMIN_KEY}&limit=50", timeout=30)
        assert r.status_code == 200
        properties = r.json().get("properties", [])
        baglergaten = next((p for p in properties if p.get("id", "").startswith("999db4b1")), None)
        assert baglergaten, "Baglergaten not found"
        baglergaten_id = baglergaten["id"]
        print(f"✅ Found Baglergaten: {baglergaten_id[:8]}...")
        
        # Set all required fields to make property publishable
        print("Setting all required fields...")
        r = requests.put(
            f"{BASE_URL}/api/admin/properties/fields?key={ADMIN_KEY}",
            json={
                "id": baglergaten_id,
                "fields": {
                    "rentalScope": "begge",
                    "roomsVacant": 2,
                    "roomsTotal": 4,
                    "rentAmount": 12000,
                    "imageRights": True,
                    "area": "Baglergaten 8",
                    "sqm": 40,
                    "bedrooms": 1
                }
            },
            timeout=30
        )
        assert r.status_code == 200, f"Failed to set fields: {r.status_code}"
        print("✅ All fields set")
        
        # Set visible
        print("Setting visible:true...")
        r = requests.put(
            f"{BASE_URL}/api/admin/properties/visibility?key={ADMIN_KEY}",
            json={"id": baglergaten_id, "visible": True},
            timeout=30
        )
        assert r.status_code == 200, f"Failed to set visible: {r.status_code}"
        print("✅ Property set to visible:true")
        
        # Test public listings
        print("\nTest 2a: GET /api/public/listings should show scope fields")
        r = requests.get(f"{BASE_URL}/api/public/listings", timeout=30)
        assert r.status_code == 200
        data = r.json()
        properties_list = data.get("listings", [])  # API returns "listings", not "properties"
        print(f"Found {len(properties_list)} published properties")
        
        if len(properties_list) == 0:
            print("❌ FAILED: No properties in public listings")
            # Check property details
            r = requests.get(f"{BASE_URL}/api/admin/properties?key={ADMIN_KEY}", timeout=30)
            properties = r.json().get("properties", [])
            our_property = next((p for p in properties if p.get("id") == baglergaten_id), None)
            print(f"Property details: visible={our_property.get('visible')}, status={our_property.get('status')}")
            print(f"  monthlyRentBand={our_property.get('monthlyRentBand')}")
            print(f"  sqm={our_property.get('sqm')}, bedrooms={our_property.get('bedrooms')}")
            print(f"  area={our_property.get('area')}, imageRights={our_property.get('imageRights')}")
            print(f"  images={len(our_property.get('images', []))}")
            return False
        
        # Find our property
        our_property = next((p for p in properties_list if p.get("id") == baglergaten_id), None)
        assert our_property, "Our property not found in public listings"
        print(f"✅ Found property in public listings")
        
        # Verify scope fields
        print("\nVerifying scope fields...")
        assert our_property.get("scope") == "begge", f"Expected scope='begge', got {our_property.get('scope')}"
        print(f"  ✅ scope: {our_property.get('scope')}")
        
        assert our_property.get("scopeShort") == "Hele enheten eller rom", f"Expected scopeShort='Hele enheten eller rom', got {our_property.get('scopeShort')}"
        print(f"  ✅ scopeShort: {our_property.get('scopeShort')}")
        
        assert our_property.get("scopeLabel") == "Hele enheten eller rom i bofellesskap", f"Expected scopeLabel='Hele enheten eller rom i bofellesskap', got {our_property.get('scopeLabel')}"
        print(f"  ✅ scopeLabel: {our_property.get('scopeLabel')}")
        
        assert our_property.get("roomsLabel") == "2 av 4 rom ledige", f"Expected roomsLabel='2 av 4 rom ledige', got {our_property.get('roomsLabel')}"
        print(f"  ✅ roomsLabel: {our_property.get('roomsLabel')}")
        
        assert our_property.get("rentScopeNote") == "for hele enheten", f"Expected rentScopeNote='for hele enheten', got {our_property.get('rentScopeNote')}"
        print(f"  ✅ rentScopeNote: {our_property.get('rentScopeNote')}")
        
        assert our_property.get("streetAddress") is not None, "streetAddress should be present"
        print(f"  ✅ streetAddress: {our_property.get('streetAddress')}")
        
        print("\n✅ Test 2a PASSED: All scope fields correct for rentalScope='begge'")
        
        # Test 2b: Change to rentalScope='rom'
        print("\nTest 2b: Change to rentalScope='rom' and verify rentScopeNote='per rom'")
        r = requests.put(
            f"{BASE_URL}/api/admin/properties/fields?key={ADMIN_KEY}",
            json={
                "id": baglergaten_id,
                "fields": {"rentalScope": "rom", "roomsVacant": 2, "roomsTotal": 4}
            },
            timeout=30
        )
        assert r.status_code == 200, "Failed to set rentalScope='rom'"
        
        r = requests.get(f"{BASE_URL}/api/public/listings", timeout=30)
        assert r.status_code == 200
        data = r.json()
        our_property = next((p for p in data.get("listings", []) if p.get("id") == baglergaten_id), None)
        assert our_property, "Property not found after changing to 'rom'"
        
        assert our_property.get("rentScopeNote") == "per rom", f"Expected rentScopeNote='per rom', got {our_property.get('rentScopeNote')}"
        print(f"  ✅ rentScopeNote: {our_property.get('rentScopeNote')}")
        print("✅ Test 2b PASSED: rentScopeNote='per rom' when rentalScope='rom'")
        
        # Test 2c: Verify HTML
        print("\nTest 2c: Verify HTML contains 'bofellesskap'")
        slug = our_property.get("slug")
        assert slug, "Property slug not found"
        r = requests.get(f"{BASE_URL}/ledige-boliger/{slug}", timeout=30)
        assert r.status_code == 200, f"Failed to get property page: {r.status_code}"
        html = r.text
        assert "bofellesskap" in html.lower(), "HTML should contain 'bofellesskap'"
        print("  ✅ HTML contains 'bofellesskap'")
        print("✅ Test 2c PASSED")
        
        print("\n" + "="*80)
        print("✅ SCENARIO 2 COMPLETE: All 3 tests passed")
        print("="*80)
        
        # Cleanup
        print("\nCleaning up...")
        r = requests.put(
            f"{BASE_URL}/api/admin/properties/fields?key={ADMIN_KEY}",
            json={"id": baglergaten_id, "resetAll": True},
            timeout=30
        )
        r = requests.put(
            f"{BASE_URL}/api/admin/properties/visibility?key={ADMIN_KEY}",
            json={"id": baglergaten_id, "visible": False},
            timeout=30
        )
        print("✅ Cleanup complete")
        
        return True
        
    except AssertionError as e:
        print(f"❌ TEST FAILED: {e}")
        return False
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
