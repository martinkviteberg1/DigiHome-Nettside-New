#!/usr/bin/env python3
"""
Backend test for LEIEKONTRAKT Eiendomsregister-berikelse (property registry enrichment).

Tests the new register field preservation in the lease draft wizard and infotorg endpoints.

CRITICAL SAFETY:
- Do NOT call POST /api/leiekontrakt/opprett with valid owner fields — it creates a REAL lead
- Infotorg runs in TEST env; real addresses may return 200 OR 404/502/429. That is acceptable.
- The only hard failure is a 500.

Test sequence (T1-T4):
T1: POST /api/leiekontrakt/utkast with register fields → GET → verify fields PRESERVED
T2: POST with invalid matrikkel (missing bruksnr) → GET → matrikkel must be null
T3: Smoke-test infotorg endpoints → verify 200/404/502/429, NO 500
T4: POST /api/leiekontrakt/opprett with only {token} (NO owner) → expect 400 with field errors
"""

import requests
import json
import sys

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"

def test_t1_utkast_roundtrip_with_register_fields():
    """T1: POST utkast with register fields → GET → verify fields PRESERVED (especially matrikkel as object)"""
    print("\n=== T1: UTKAST ROUND-TRIP WITH REGISTER FIELDS ===")
    
    try:
        # POST utkast with full register fields
        body = {
            "bolig": {
                "adresse": "Nygårdsgaten 5",
                "postnr": "5015",
                "poststed": "Bergen",
                "type": "leilighet",
                "matrikkel": {
                    "kommunenr": "4601",
                    "gaardsnr": "165",
                    "bruksnr": "96"
                },
                "seksjonsnr": "12",
                "register_type": "sameie",
                "matrikkel_str": "4601-165/96/12",
                "bruksenhetsnummer": "H0301",
                "hjemmelshaver": "Ola Nordmann",
                "hjemmelshaver_type": "person"
            },
            "leietaker": {
                "navn": "Emma Lie",
                "epost": "emma@epost.no"
            },
            "vilkaar": {
                "leie": 14500
            }
        }
        
        print(f"POST {BASE_URL}/leiekontrakt/utkast with register fields...")
        resp = requests.post(f"{BASE_URL}/leiekontrakt/utkast", json=body, timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ T1 FAILED: Expected 200, got {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            return False
        
        data = resp.json()
        if not data.get('ok'):
            print(f"❌ T1 FAILED: Response ok=false")
            print(f"Response: {json.dumps(data, indent=2)[:500]}")
            return False
        
        token = data.get('token')
        utkast_id = data.get('id')
        if not token:
            print(f"❌ T1 FAILED: No token in response")
            return False
        
        print(f"✓ POST successful: token={token}, id={utkast_id}")
        
        # GET utkast
        print(f"\nGET {BASE_URL}/leiekontrakt/utkast?token={token}...")
        resp2 = requests.get(f"{BASE_URL}/leiekontrakt/utkast?token={token}", timeout=10)
        print(f"Status: {resp2.status_code}")
        
        if resp2.status_code != 200:
            print(f"❌ T1 FAILED: GET returned {resp2.status_code}")
            print(f"Response: {resp2.text[:500]}")
            return False
        
        data2 = resp2.json()
        if not data2.get('ok'):
            print(f"❌ T1 FAILED: GET response ok=false")
            return False
        
        utkast = data2.get('utkast', {})
        bolig = utkast.get('bolig', {})
        
        # VERIFY register fields are PRESERVED
        print("\n--- Verifying register fields preservation ---")
        
        # 1. matrikkel must be an OBJECT (not null, not string)
        matrikkel = bolig.get('matrikkel')
        if not isinstance(matrikkel, dict):
            print(f"❌ T1 FAILED: matrikkel is not an object, got type={type(matrikkel)}, value={matrikkel}")
            return False
        
        if matrikkel.get('kommunenr') != '4601':
            print(f"❌ T1 FAILED: matrikkel.kommunenr={matrikkel.get('kommunenr')}, expected '4601'")
            return False
        
        if matrikkel.get('gaardsnr') != '165':
            print(f"❌ T1 FAILED: matrikkel.gaardsnr={matrikkel.get('gaardsnr')}, expected '165'")
            return False
        
        if matrikkel.get('bruksnr') != '96':
            print(f"❌ T1 FAILED: matrikkel.bruksnr={matrikkel.get('bruksnr')}, expected '96'")
            return False
        
        print(f"✓ matrikkel is object: {matrikkel}")
        
        # 2. Other register fields
        if bolig.get('seksjonsnr') != '12':
            print(f"❌ T1 FAILED: seksjonsnr={bolig.get('seksjonsnr')}, expected '12'")
            return False
        print(f"✓ seksjonsnr='12'")
        
        if bolig.get('matrikkel_str') != '4601-165/96/12':
            print(f"❌ T1 FAILED: matrikkel_str={bolig.get('matrikkel_str')}, expected '4601-165/96/12'")
            return False
        print(f"✓ matrikkel_str='4601-165/96/12'")
        
        if bolig.get('bruksenhetsnummer') != 'H0301':
            print(f"❌ T1 FAILED: bruksenhetsnummer={bolig.get('bruksenhetsnummer')}, expected 'H0301'")
            return False
        print(f"✓ bruksenhetsnummer='H0301'")
        
        if bolig.get('hjemmelshaver') != 'Ola Nordmann':
            print(f"❌ T1 FAILED: hjemmelshaver={bolig.get('hjemmelshaver')}, expected 'Ola Nordmann'")
            return False
        print(f"✓ hjemmelshaver='Ola Nordmann'")
        
        if bolig.get('register_type') != 'sameie':
            print(f"❌ T1 FAILED: register_type={bolig.get('register_type')}, expected 'sameie'")
            return False
        print(f"✓ register_type='sameie'")
        
        if bolig.get('hjemmelshaver_type') != 'person':
            print(f"❌ T1 FAILED: hjemmelshaver_type={bolig.get('hjemmelshaver_type')}, expected 'person'")
            return False
        print(f"✓ hjemmelshaver_type='person'")
        
        print("\n✅ T1 PASSED: All register fields PRESERVED in round-trip")
        return True
        
    except Exception as e:
        print(f"❌ T1 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_t2_invalid_matrikkel_becomes_null():
    """T2: POST with invalid matrikkel (missing bruksnr) → GET → matrikkel must be null"""
    print("\n=== T2: INVALID MATRIKKEL → NULL ===")
    
    try:
        # POST utkast with INVALID matrikkel (missing bruksnr)
        body = {
            "bolig": {
                "adresse": "Testgata 1",
                "postnr": "5015",
                "poststed": "Bergen",
                "type": "leilighet",
                "matrikkel": {
                    "kommunenr": "4601",
                    "gaardsnr": "165"
                    # Missing bruksnr → invalid
                }
            },
            "leietaker": {
                "navn": "Test Person",
                "epost": "test@epost.no"
            },
            "vilkaar": {
                "leie": 10000
            }
        }
        
        print(f"POST {BASE_URL}/leiekontrakt/utkast with INVALID matrikkel (missing bruksnr)...")
        resp = requests.post(f"{BASE_URL}/leiekontrakt/utkast", json=body, timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ T2 FAILED: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        token = data.get('token')
        if not token:
            print(f"❌ T2 FAILED: No token in response")
            return False
        
        print(f"✓ POST successful: token={token}")
        
        # GET utkast
        print(f"\nGET {BASE_URL}/leiekontrakt/utkast?token={token}...")
        resp2 = requests.get(f"{BASE_URL}/leiekontrakt/utkast?token={token}", timeout=10)
        print(f"Status: {resp2.status_code}")
        
        if resp2.status_code != 200:
            print(f"❌ T2 FAILED: GET returned {resp2.status_code}")
            return False
        
        data2 = resp2.json()
        utkast = data2.get('utkast', {})
        bolig = utkast.get('bolig', {})
        matrikkel = bolig.get('matrikkel')
        
        # VERIFY matrikkel is NULL (invalid matrikkel normalized to null)
        if matrikkel is not None:
            print(f"❌ T2 FAILED: matrikkel should be null, got {matrikkel}")
            return False
        
        print(f"✓ matrikkel is null (invalid matrikkel normalized correctly)")
        print("\n✅ T2 PASSED: Invalid matrikkel becomes null")
        return True
        
    except Exception as e:
        print(f"❌ T2 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_t3_infotorg_smoke():
    """T3: Smoke-test infotorg endpoints → verify 200/404/502/429, NO 500"""
    print("\n=== T3: INFOTORG SMOKE TEST ===")
    
    all_passed = True
    
    # T3a: /infotorg/lookup
    try:
        print(f"\n--- T3a: POST {BASE_URL}/infotorg/lookup ---")
        body = {"address": "Torgallmenningen 8, Bergen"}
        resp = requests.post(f"{BASE_URL}/infotorg/lookup", json=body, timeout=15)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code == 500:
            print(f"❌ T3a FAILED: Got 500 (hard failure)")
            print(f"Response: {resp.text[:500]}")
            all_passed = False
        elif resp.status_code in [200, 404, 502, 429, 503]:
            print(f"✓ Acceptable status code: {resp.status_code}")
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    print(f"  Response status: {data.get('status')}")
                    if data.get('status') == 'ok':
                        print(f"  Has matrikkel: {bool(data.get('matrikkel'))}")
                        print(f"  Has building_type: {bool(data.get('building_type'))}")
                except:
                    pass
        else:
            print(f"⚠️  Unexpected status code: {resp.status_code} (but not 500, so acceptable)")
    except Exception as e:
        print(f"❌ T3a FAILED with exception: {e}")
        all_passed = False
    
    # T3b: /infotorg/section-owners
    try:
        print(f"\n--- T3b: POST {BASE_URL}/infotorg/section-owners ---")
        body = {
            "kommunenr": "4601",
            "gaardsnr": "165",
            "bruksnr": "96",
            "seksjonsnr_list": ["1", "2"]
        }
        resp = requests.post(f"{BASE_URL}/infotorg/section-owners", json=body, timeout=15)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code == 500:
            print(f"❌ T3b FAILED: Got 500 (hard failure)")
            print(f"Response: {resp.text[:500]}")
            all_passed = False
        elif resp.status_code in [200, 404, 502, 429, 503]:
            print(f"✓ Acceptable status code: {resp.status_code}")
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    print(f"  Response status: {data.get('status')}")
                    print(f"  Owners count: {len(data.get('owners', {}))}")
                except:
                    pass
        else:
            print(f"⚠️  Unexpected status code: {resp.status_code} (but not 500, so acceptable)")
    except Exception as e:
        print(f"❌ T3b FAILED with exception: {e}")
        all_passed = False
    
    # T3c: /infotorg/andel-owners
    try:
        print(f"\n--- T3c: POST {BASE_URL}/infotorg/andel-owners ---")
        body = {
            "orgnr": "999999999",
            "andelsnr_list": ["1"]
        }
        resp = requests.post(f"{BASE_URL}/infotorg/andel-owners", json=body, timeout=15)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code == 500:
            print(f"❌ T3c FAILED: Got 500 (hard failure)")
            print(f"Response: {resp.text[:500]}")
            all_passed = False
        elif resp.status_code in [200, 404, 502, 429, 503]:
            print(f"✓ Acceptable status code: {resp.status_code}")
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    print(f"  Response status: {data.get('status')}")
                    print(f"  Owners count: {len(data.get('owners', {}))}")
                except:
                    pass
        else:
            print(f"⚠️  Unexpected status code: {resp.status_code} (but not 500, so acceptable)")
    except Exception as e:
        print(f"❌ T3c FAILED with exception: {e}")
        all_passed = False
    
    if all_passed:
        print("\n✅ T3 PASSED: All infotorg endpoints returned acceptable status codes (no 500)")
    else:
        print("\n❌ T3 FAILED: At least one infotorg endpoint returned 500")
    
    return all_passed


def test_t4_opprett_validation_safe():
    """T4: POST /api/leiekontrakt/opprett with only {token} (NO owner) → expect 400 with field errors"""
    print("\n=== T4: OPPRETT VALIDATION (SAFE - NO OWNER) ===")
    
    try:
        # First create a minimal utkast to get a token
        body = {
            "bolig": {"adresse": "Test", "postnr": "5015", "poststed": "Bergen", "type": "leilighet"},
            "leietaker": {"navn": "Test", "epost": "test@test.no"},
            "vilkaar": {"leie": 10000}
        }
        
        print(f"Creating test utkast...")
        resp = requests.post(f"{BASE_URL}/leiekontrakt/utkast", json=body, timeout=10)
        if resp.status_code != 200:
            print(f"❌ T4 FAILED: Could not create utkast, status={resp.status_code}")
            return False
        
        token = resp.json().get('token')
        if not token:
            print(f"❌ T4 FAILED: No token in utkast response")
            return False
        
        print(f"✓ Test utkast created: token={token}")
        
        # POST /leiekontrakt/opprett with ONLY token (NO owner fields)
        # This should return 400 with field errors (NOT create a real lead)
        print(f"\nPOST {BASE_URL}/leiekontrakt/opprett with only token (NO owner)...")
        resp2 = requests.post(f"{BASE_URL}/leiekontrakt/opprett", json={"token": token}, timeout=10)
        print(f"Status: {resp2.status_code}")
        
        if resp2.status_code != 400:
            print(f"❌ T4 FAILED: Expected 400, got {resp2.status_code}")
            print(f"Response: {resp2.text[:500]}")
            return False
        
        data = resp2.json()
        if data.get('ok') is not False:
            print(f"❌ T4 FAILED: Expected ok=false in 400 response")
            return False
        
        feil = data.get('feil', {})
        if not feil:
            print(f"❌ T4 FAILED: Expected 'feil' object with field errors")
            return False
        
        # Check for expected field errors (owner_navn, owner_epost)
        if 'owner_navn' not in feil and 'owner_epost' not in feil:
            print(f"❌ T4 FAILED: Expected owner_navn or owner_epost in feil, got {list(feil.keys())}")
            return False
        
        print(f"✓ Got 400 with field errors: {list(feil.keys())}")
        print(f"  Sample error: {list(feil.values())[0]}")
        
        print("\n✅ T4 PASSED: Validation working (400 with field errors, no lead created)")
        return True
        
    except Exception as e:
        print(f"❌ T4 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("=" * 80)
    print("BACKEND TEST: LEIEKONTRAKT Eiendomsregister-berikelse")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print("\nCRITICAL SAFETY:")
    print("- Do NOT call POST /api/leiekontrakt/opprett with valid owner fields")
    print("- Infotorg runs in TEST env; 200/404/502/429 are all acceptable")
    print("- The only hard failure is a 500")
    print("=" * 80)
    
    results = {}
    
    # Run tests
    results['T1'] = test_t1_utkast_roundtrip_with_register_fields()
    results['T2'] = test_t2_invalid_matrikkel_becomes_null()
    results['T3'] = test_t3_infotorg_smoke()
    results['T4'] = test_t4_opprett_validation_safe()
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
