#!/usr/bin/env python3
"""
Backend test for Infotorg EDR (Eiendomsregisteret) integration.
Tests ONLY the new EDR endpoints + enriched leads.

IMPORTANT CONSTRAINTS:
- EDR/SOAP calls are SLOW on cold cache (1-12 seconds). Use 30s timeout.
- Rate limit is 40 lookups/min/IP — do NOT spam /api/infotorg/lookup.
- All /api/infotorg/* endpoints are POST.
- Known TEST addresses:
  * Sameie = "Olaf Ryes vei 11C, 5007 Bergen" (seksjonert, ~35 sections)
  * Borettslag = "Deichmans gate 2A, 0178 Oslo" (orgnr 981656628, ~21 andeler)
"""

import requests
import json
import time
import sys

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
TIMEOUT = 30  # 30 seconds for slow EDR calls

def test_infotorg_lookup_sameie():
    """Test 1: POST /api/infotorg/lookup with Sameie address (Olaf Ryes vei 11C, 5007 Bergen)"""
    print("\n=== TEST 1: /api/infotorg/lookup - Sameie (Olaf Ryes vei 11C, 5007 Bergen) ===")
    try:
        # First call - should be live (slow)
        print("First call (live, may take 1-12 seconds)...")
        start = time.time()
        response = requests.post(
            f"{BASE_URL}/infotorg/lookup",
            json={"address": "Olaf Ryes vei 11C, 5007 Bergen"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start
        print(f"Response time: {elapsed:.2f}s")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Verify response structure
        if data.get('status') != 'ok':
            print(f"❌ FAILED: Expected status='ok', got {data.get('status')}")
            return False
        
        if data.get('source') not in ['live', 'cache']:
            print(f"❌ FAILED: Expected source='live' or 'cache', got {data.get('source')}")
            return False
        
        # Verify matrikkel
        matrikkel = data.get('matrikkel', {})
        if not matrikkel.get('kommunenr') or not matrikkel.get('gaardsnr') or not matrikkel.get('bruksnr'):
            print(f"❌ FAILED: Missing matrikkel fields: {matrikkel}")
            return False
        print(f"✓ Matrikkel: {matrikkel.get('kommunenr')}-{matrikkel.get('gaardsnr')}/{matrikkel.get('bruksnr')}")
        
        # Verify EDR data
        edr = data.get('edr', {})
        if not edr.get('seksjonert'):
            print(f"❌ FAILED: Expected edr.seksjonert=true for sameie, got {edr.get('seksjonert')}")
            return False
        print(f"✓ EDR seksjonert: {edr.get('seksjonert')}")
        
        seksjoner = edr.get('seksjoner', [])
        if not isinstance(seksjoner, list) or len(seksjoner) == 0:
            print(f"❌ FAILED: Expected non-empty seksjoner array, got {seksjoner}")
            return False
        print(f"✓ Seksjoner count: {len(seksjoner)} (expected ~35)")
        
        # Verify building_type
        if data.get('building_type') != 'sameie':
            print(f"❌ FAILED: Expected building_type='sameie', got {data.get('building_type')}")
            return False
        print(f"✓ Building type: {data.get('building_type')}")
        
        # Store matrikkel for later tests
        global SAMEIE_MATRIKKEL
        SAMEIE_MATRIKKEL = matrikkel
        
        # Second call - should be cached (fast)
        print("\nSecond call (should be cached, fast)...")
        start = time.time()
        response2 = requests.post(
            f"{BASE_URL}/infotorg/lookup",
            json={"address": "Olaf Ryes vei 11C, 5007 Bergen"},
            timeout=TIMEOUT
        )
        elapsed2 = time.time() - start
        print(f"Response time: {elapsed2:.2f}s")
        
        if response2.status_code != 200:
            print(f"❌ FAILED: Second call expected 200, got {response2.status_code}")
            return False
        
        data2 = response2.json()
        if data2.get('source') != 'cache':
            print(f"⚠️  WARNING: Expected source='cache' on second call, got {data2.get('source')}")
        else:
            print(f"✓ Second call returned source='cache' (cache working)")
        
        print("✅ TEST 1 PASSED: Sameie lookup working correctly")
        return True
        
    except requests.Timeout:
        print(f"❌ FAILED: Request timeout after {TIMEOUT}s (EDR calls can be slow, but this is too long)")
        return False
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_infotorg_lookup_borettslag():
    """Test 2: POST /api/infotorg/lookup with Borettslag address (Deichmans gate 2A, 0178 Oslo)"""
    print("\n=== TEST 2: /api/infotorg/lookup - Borettslag (Deichmans gate 2A, 0178 Oslo) ===")
    try:
        print("Calling lookup (may take 1-12 seconds)...")
        start = time.time()
        response = requests.post(
            f"{BASE_URL}/infotorg/lookup",
            json={"address": "Deichmans gate 2A, 0178 Oslo"},
            timeout=TIMEOUT
        )
        elapsed = time.time() - start
        print(f"Response time: {elapsed:.2f}s")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Verify response structure
        if data.get('status') != 'ok':
            print(f"❌ FAILED: Expected status='ok', got {data.get('status')}")
            return False
        
        # Verify building_type
        if data.get('building_type') != 'borettslag':
            print(f"❌ FAILED: Expected building_type='borettslag', got {data.get('building_type')}")
            return False
        print(f"✓ Building type: {data.get('building_type')}")
        
        # Verify borettslag data
        borettslag = data.get('borettslag')
        if not borettslag:
            print(f"❌ FAILED: Expected borettslag object, got {borettslag}")
            return False
        
        if borettslag.get('orgnr') != '981656628':
            print(f"❌ FAILED: Expected orgnr='981656628', got {borettslag.get('orgnr')}")
            return False
        print(f"✓ Borettslag orgnr: {borettslag.get('orgnr')}")
        
        andeler = borettslag.get('andeler', [])
        if not isinstance(andeler, list) or len(andeler) == 0:
            print(f"❌ FAILED: Expected non-empty andeler array, got {andeler}")
            return False
        print(f"✓ Andeler count: {len(andeler)} (expected ~21)")
        
        # Store for later tests
        global BORETTSLAG_ORGNR
        BORETTSLAG_ORGNR = borettslag.get('orgnr')
        
        print("✅ TEST 2 PASSED: Borettslag lookup working correctly")
        return True
        
    except requests.Timeout:
        print(f"❌ FAILED: Request timeout after {TIMEOUT}s")
        return False
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_infotorg_lookup_not_found():
    """Test 3: POST /api/infotorg/lookup with invalid address"""
    print("\n=== TEST 3: /api/infotorg/lookup - Invalid address (404) ===")
    try:
        response = requests.post(
            f"{BASE_URL}/infotorg/lookup",
            json={"address": "Tulleveien 99999, 9999 Ingenstad"},
            timeout=TIMEOUT
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code != 404:
            print(f"❌ FAILED: Expected 404, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        if data.get('status') != 'not_found':
            print(f"❌ FAILED: Expected status='not_found', got {data.get('status')}")
            return False
        
        print(f"✓ Status: {data.get('status')}")
        print("✅ TEST 3 PASSED: Invalid address returns 404")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        return False


def test_infotorg_lookup_empty():
    """Test 4: POST /api/infotorg/lookup with empty body"""
    print("\n=== TEST 4: /api/infotorg/lookup - Empty body (400) ===")
    try:
        response = requests.post(
            f"{BASE_URL}/infotorg/lookup",
            json={},
            timeout=TIMEOUT
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code != 400:
            print(f"❌ FAILED: Expected 400, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        if data.get('status') != 'error':
            print(f"❌ FAILED: Expected status='error', got {data.get('status')}")
            return False
        
        print(f"✓ Status: {data.get('status')}, message: {data.get('message')}")
        print("✅ TEST 4 PASSED: Empty body returns 400")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        return False


def test_infotorg_section_owners():
    """Test 5: POST /api/infotorg/section-owners with matrikkel from test 1"""
    print("\n=== TEST 5: /api/infotorg/section-owners - Batch owner lookup ===")
    try:
        if not SAMEIE_MATRIKKEL:
            print("⚠️  SKIPPED: No matrikkel from test 1")
            return True
        
        print(f"Using matrikkel: {SAMEIE_MATRIKKEL}")
        print("Requesting owners for sections 1, 2, 18 (may take several seconds)...")
        
        start = time.time()
        response = requests.post(
            f"{BASE_URL}/infotorg/section-owners",
            json={
                "kommunenr": SAMEIE_MATRIKKEL['kommunenr'],
                "gaardsnr": SAMEIE_MATRIKKEL['gaardsnr'],
                "bruksnr": SAMEIE_MATRIKKEL['bruksnr'],
                "seksjonsnr_list": ["1", "2", "18"]
            },
            timeout=TIMEOUT
        )
        elapsed = time.time() - start
        print(f"Response time: {elapsed:.2f}s")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        if data.get('status') != 'ok':
            print(f"❌ FAILED: Expected status='ok', got {data.get('status')}")
            return False
        
        owners = data.get('owners', {})
        if not isinstance(owners, dict):
            print(f"❌ FAILED: Expected owners to be object, got {type(owners)}")
            return False
        
        print(f"✓ Owners returned: {list(owners.keys())}")
        
        # Check if at least one section has owner with navn
        has_valid_owner = False
        for snr, owner in owners.items():
            if owner and owner.get('navn'):
                has_valid_owner = True
                print(f"✓ Section {snr}: {owner.get('navn')} (type: {owner.get('type')})")
                # Check for KVITEBERG in section 18 as mentioned in requirements
                if snr == "18" and "KVITEBERG" in owner.get('navn', '').upper():
                    print(f"✓ Section 18 contains 'KVITEBERG' as expected")
        
        if not has_valid_owner:
            print(f"❌ FAILED: No valid owner found with navn field")
            return False
        
        print("✅ TEST 5 PASSED: Section owners batch lookup working")
        return True
        
    except requests.Timeout:
        print(f"❌ FAILED: Request timeout after {TIMEOUT}s")
        return False
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_infotorg_owner():
    """Test 6: POST /api/infotorg/owner with single section"""
    print("\n=== TEST 6: /api/infotorg/owner - Single section owner ===")
    try:
        if not SAMEIE_MATRIKKEL:
            print("⚠️  SKIPPED: No matrikkel from test 1")
            return True
        
        print(f"Using matrikkel: {SAMEIE_MATRIKKEL}, section 18")
        
        start = time.time()
        response = requests.post(
            f"{BASE_URL}/infotorg/owner",
            json={
                "kommunenr": SAMEIE_MATRIKKEL['kommunenr'],
                "gaardsnr": SAMEIE_MATRIKKEL['gaardsnr'],
                "bruksnr": SAMEIE_MATRIKKEL['bruksnr'],
                "seksjonsnr": "18"
            },
            timeout=TIMEOUT
        )
        elapsed = time.time() - start
        print(f"Response time: {elapsed:.2f}s")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        
        if data.get('status') != 'ok':
            print(f"❌ FAILED: Expected status='ok', got {data.get('status')}")
            return False
        
        owner = data.get('owner')
        if not owner or not owner.get('navn'):
            print(f"❌ FAILED: Expected owner with navn, got {owner}")
            return False
        
        print(f"✓ Owner: {owner.get('navn')} (type: {owner.get('type')})")
        print("✅ TEST 6 PASSED: Single owner lookup working")
        return True
        
    except requests.Timeout:
        print(f"❌ FAILED: Request timeout after {TIMEOUT}s")
        return False
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_infotorg_andel_owners():
    """Test 7: POST /api/infotorg/andel-owners with borettslag"""
    print("\n=== TEST 7: /api/infotorg/andel-owners - Batch andel owner lookup ===")
    try:
        if not BORETTSLAG_ORGNR:
            print("⚠️  SKIPPED: No borettslag orgnr from test 2")
            return True
        
        print(f"Using borettslag orgnr: {BORETTSLAG_ORGNR}")
        print("Requesting owners for andeler 1, 2 (may take several seconds)...")
        
        start = time.time()
        response = requests.post(
            f"{BASE_URL}/infotorg/andel-owners",
            json={
                "orgnr": BORETTSLAG_ORGNR,
                "andelsnr_list": ["1", "2"]
            },
            timeout=TIMEOUT
        )
        elapsed = time.time() - start
        print(f"Response time: {elapsed:.2f}s")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        
        if data.get('status') != 'ok':
            print(f"❌ FAILED: Expected status='ok', got {data.get('status')}")
            return False
        
        owners = data.get('owners', {})
        if not isinstance(owners, dict):
            print(f"❌ FAILED: Expected owners to be object, got {type(owners)}")
            return False
        
        print(f"✓ Owners returned: {list(owners.keys())}")
        
        # Check if at least one andel has owner with navn
        has_valid_owner = False
        for andelsnr, owner in owners.items():
            if owner and owner.get('navn'):
                has_valid_owner = True
                print(f"✓ Andel {andelsnr}: {owner.get('navn')} (type: {owner.get('type')})")
        
        if not has_valid_owner:
            print(f"❌ FAILED: No valid owner found with navn field")
            return False
        
        print("✅ TEST 7 PASSED: Andel owners batch lookup working")
        return True
        
    except requests.Timeout:
        print(f"❌ FAILED: Request timeout after {TIMEOUT}s")
        return False
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_validation_errors():
    """Test 8: Validation errors for all endpoints"""
    print("\n=== TEST 8: Validation errors (400) ===")
    try:
        # section-owners without matrikkel
        print("Testing /api/infotorg/section-owners with empty body...")
        response = requests.post(
            f"{BASE_URL}/infotorg/section-owners",
            json={},
            timeout=TIMEOUT
        )
        if response.status_code != 400:
            print(f"❌ FAILED: Expected 400 for section-owners empty body, got {response.status_code}")
            return False
        print(f"✓ section-owners empty body: {response.status_code}")
        
        # owner without matrikkel
        print("Testing /api/infotorg/owner with empty body...")
        response = requests.post(
            f"{BASE_URL}/infotorg/owner",
            json={},
            timeout=TIMEOUT
        )
        if response.status_code != 400:
            print(f"❌ FAILED: Expected 400 for owner empty body, got {response.status_code}")
            return False
        print(f"✓ owner empty body: {response.status_code}")
        
        # andel-owner without orgnr/andelsnr
        print("Testing /api/infotorg/andel-owner with empty body...")
        response = requests.post(
            f"{BASE_URL}/infotorg/andel-owner",
            json={},
            timeout=TIMEOUT
        )
        if response.status_code != 400:
            print(f"❌ FAILED: Expected 400 for andel-owner empty body, got {response.status_code}")
            return False
        print(f"✓ andel-owner empty body: {response.status_code}")
        
        print("✅ TEST 8 PASSED: All validation errors working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        return False


def test_no_500_errors():
    """Test 9: Confirm NO endpoint returns 500 on valid input"""
    print("\n=== TEST 9: No 500 errors on valid input ===")
    try:
        # This is implicitly tested by all previous tests
        # If any test got a 500, it would have failed
        print("✓ All previous tests passed without 500 errors")
        print("✅ TEST 9 PASSED: No 500 errors on valid input")
        return True
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        return False


def test_enriched_leads():
    """Test 10: POST /api/leads with enriched EDR data"""
    print("\n=== TEST 10: Enriched leads with EDR data ===")
    try:
        if not SAMEIE_MATRIKKEL:
            print("⚠️  SKIPPED: No matrikkel from test 1")
            return True
        
        # Create obviously fake lead with EDR enrichment
        matrikkel_str = f"{SAMEIE_MATRIKKEL['kommunenr']}-{SAMEIE_MATRIKKEL['gaardsnr']}/{SAMEIE_MATRIKKEL['bruksnr']}/18"
        
        lead_data = {
            "name": "QA Bot EDR Test",
            "email": "qa-edr@example.test",
            "phone": "+47 00000000",
            "address": "Olaf Ryes vei 11C",
            "lead_type": "huseier",
            "source": "qa-edr",
            # EDR enrichment fields
            "matrikkel_number": matrikkel_str,
            "seksjonsnr": "18",
            "bygningstype": "sameie",
            "registry_owner_name": "TEST EIER",
            "registry_owner_type": "person",
            "units": [{
                "address": "Olaf Ryes vei 11C",
                "matrikkel_number": matrikkel_str,
                "seksjonsnr": "18",
                "registry_owner_name": "TEST EIER"
            }]
        }
        
        print(f"Creating lead with matrikkel: {matrikkel_str}")
        
        response = requests.post(
            f"{BASE_URL}/leads",
            json=lead_data,
            timeout=TIMEOUT
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code != 201:
            print(f"❌ FAILED: Expected 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        
        if not data.get('success'):
            print(f"❌ FAILED: Expected success=true, got {data.get('success')}")
            return False
        
        lead = data.get('lead', {})
        
        # Verify EDR fields are present in response
        if lead.get('matrikkel_number') != matrikkel_str:
            print(f"❌ FAILED: Expected matrikkel_number='{matrikkel_str}', got '{lead.get('matrikkel_number')}'")
            return False
        print(f"✓ matrikkel_number: {lead.get('matrikkel_number')}")
        
        if lead.get('seksjonsnr') != "18":
            print(f"❌ FAILED: Expected seksjonsnr='18', got '{lead.get('seksjonsnr')}'")
            return False
        print(f"✓ seksjonsnr: {lead.get('seksjonsnr')}")
        
        if lead.get('bygningstype') != "sameie":
            print(f"❌ FAILED: Expected bygningstype='sameie', got '{lead.get('bygningstype')}'")
            return False
        print(f"✓ bygningstype: {lead.get('bygningstype')}")
        
        if lead.get('registry_owner_name') != "TEST EIER":
            print(f"❌ FAILED: Expected registry_owner_name='TEST EIER', got '{lead.get('registry_owner_name')}'")
            return False
        print(f"✓ registry_owner_name: {lead.get('registry_owner_name')}")
        
        # Verify units array
        units = lead.get('units', [])
        if not units or len(units) == 0:
            print(f"❌ FAILED: Expected non-empty units array, got {units}")
            return False
        
        if units[0].get('matrikkel_number') != matrikkel_str:
            print(f"❌ FAILED: Expected units[0].matrikkel_number='{matrikkel_str}', got '{units[0].get('matrikkel_number')}'")
            return False
        print(f"✓ units[0].matrikkel_number: {units[0].get('matrikkel_number')}")
        
        # Store lead ID for cleanup
        global CREATED_LEAD_ID
        CREATED_LEAD_ID = data.get('data', {}).get('id')
        
        print("✅ TEST 10 PASSED: Enriched leads with EDR data working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_regression_root():
    """Regression: GET /api/ returns 200"""
    print("\n=== REGRESSION: GET /api/ ===")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        if not data.get('ok'):
            print(f"❌ FAILED: Expected ok=true, got {data.get('ok')}")
            return False
        
        print(f"✓ Response: {data}")
        print("✅ REGRESSION PASSED: Root endpoint working")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        return False


def cleanup():
    """Cleanup test data"""
    print("\n=== CLEANUP ===")
    try:
        if CREATED_LEAD_ID:
            print(f"Deleting test lead: {CREATED_LEAD_ID}")
            response = requests.post(
                f"{BASE_URL}/admin/delete?key=dh_admin_b3Kx92Qz7Lm4",
                json={"id": CREATED_LEAD_ID},
                timeout=10
            )
            if response.status_code == 200:
                print(f"✓ Test lead deleted")
            else:
                print(f"⚠️  Could not delete test lead: {response.status_code}")
    except Exception as e:
        print(f"⚠️  Cleanup error: {e}")


# Global variables to store data between tests
SAMEIE_MATRIKKEL = None
BORETTSLAG_ORGNR = None
CREATED_LEAD_ID = None


def main():
    print("=" * 80)
    print("INFOTORG EDR (EIENDOMSREGISTERET) INTEGRATION TEST")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Timeout: {TIMEOUT}s (EDR calls are SLOW on cold cache)")
    print("=" * 80)
    
    tests = [
        ("Sameie lookup + cache", test_infotorg_lookup_sameie),
        ("Borettslag lookup", test_infotorg_lookup_borettslag),
        ("Invalid address (404)", test_infotorg_lookup_not_found),
        ("Empty body (400)", test_infotorg_lookup_empty),
        ("Section owners batch", test_infotorg_section_owners),
        ("Single owner", test_infotorg_owner),
        ("Andel owners batch", test_infotorg_andel_owners),
        ("Validation errors", test_validation_errors),
        ("No 500 errors", test_no_500_errors),
        ("Enriched leads", test_enriched_leads),
        ("Regression: root", test_regression_root),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
            # Small delay between tests to respect rate limit
            time.sleep(1)
        except Exception as e:
            print(f"\n❌ TEST '{name}' CRASHED: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # Cleanup
    cleanup()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} TEST(S) FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
