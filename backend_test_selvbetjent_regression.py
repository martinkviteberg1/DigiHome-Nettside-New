#!/usr/bin/env python3
"""
SAFE REGRESSION TEST for DigiHome Next.js backend after self-service provisioning changes.

CRITICAL SAFETY RULES (MUST NOT VIOLATE):
1. Do NOT POST /api/leads at all (neither self-service nor regular)
2. Do NOT POST /api/leiekontrakt/opprett with valid owner fields
3. Only GET / draft round-trip on utkast

GOAL: Confirm backend edits did NOT break endpoints - no 500 anywhere.
"""

import requests
import json
import sys

# Base URL from .env
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"

def test_utkast_round_trip():
    """
    T1) UTKAST ROUND-TRIP: POST /api/leiekontrakt/utkast → GET /api/leiekontrakt/utkast?token=<token>
    """
    print("\n" + "="*80)
    print("T1) UTKAST ROUND-TRIP TEST")
    print("="*80)
    
    # POST utkast
    utkast_body = {
        "bolig": {
            "adresse": "Nygårdsgaten 5",
            "postnr": "5015",
            "poststed": "Bergen",
            "type": "leilighet"
        },
        "leietaker": {
            "navn": "Emma Lie",
            "epost": "emma@epost.no"
        },
        "vilkaar": {
            "leie": 14500
        }
    }
    
    try:
        print(f"\n[T1a] POST {BASE_URL}/leiekontrakt/utkast")
        print(f"Body: {json.dumps(utkast_body, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/leiekontrakt/utkast",
            json=utkast_body,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 500:
            print("❌ CRITICAL: Got 500 error on POST /leiekontrakt/utkast")
            print(f"Response: {response.text}")
            return None
        
        if response.status_code != 200:
            print(f"❌ Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return None
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('ok'):
            print("❌ Response ok:false")
            return None
        
        if 'token' not in data or 'id' not in data:
            print("❌ Missing token or id in response")
            return None
        
        token = data['token']
        utkast_id = data['id']
        print(f"✅ POST /leiekontrakt/utkast: 200 OK (token={token[:20]}..., id={utkast_id})")
        
        # GET utkast
        print(f"\n[T1b] GET {BASE_URL}/leiekontrakt/utkast?token={token[:20]}...")
        
        response = requests.get(
            f"{BASE_URL}/leiekontrakt/utkast",
            params={"token": token}
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 500:
            print("❌ CRITICAL: Got 500 error on GET /leiekontrakt/utkast")
            print(f"Response: {response.text}")
            return None
        
        if response.status_code != 200:
            print(f"❌ Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return None
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        if not data.get('ok'):
            print("❌ Response ok:false")
            return None
        
        if 'utkast' not in data:
            print("❌ Missing utkast in response")
            return None
        
        print(f"✅ GET /leiekontrakt/utkast: 200 OK (utkast retrieved)")
        
        return token
        
    except Exception as e:
        print(f"❌ Exception in T1: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_opprett_validation_no_owner(token):
    """
    T2) OPPRETT VALIDATION (SAFE - NO owner): POST /api/leiekontrakt/opprett {"token":"<token>"}
    Expect 400 {ok:false, feil:{owner_navn, owner_epost}}
    """
    print("\n" + "="*80)
    print("T2) OPPRETT VALIDATION TEST (NO OWNER - SAFE)")
    print("="*80)
    
    try:
        print(f"\n[T2] POST {BASE_URL}/leiekontrakt/opprett")
        print(f"Body: {{\"token\": \"{token[:20]}...\"}}")
        
        response = requests.post(
            f"{BASE_URL}/leiekontrakt/opprett",
            json={"token": token},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 500:
            print("❌ CRITICAL: Got 500 error on POST /leiekontrakt/opprett (validation path)")
            print(f"Response: {response.text}")
            return False
        
        if response.status_code != 400:
            print(f"❌ Expected 400 (validation error), got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get('ok') is not False:
            print("❌ Expected ok:false")
            return False
        
        if 'feil' not in data:
            print("❌ Missing feil object in response")
            return False
        
        feil = data['feil']
        if 'owner_navn' not in feil or 'owner_epost' not in feil:
            print("❌ Missing owner_navn or owner_epost in feil object")
            return False
        
        print(f"✅ POST /leiekontrakt/opprett (no owner): 400 OK with validation errors (owner_navn, owner_epost)")
        return True
        
    except Exception as e:
        print(f"❌ Exception in T2: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_opprett_missing_token():
    """
    T3) MISSING/BAD token tests
    """
    print("\n" + "="*80)
    print("T3) MISSING/BAD TOKEN TESTS")
    print("="*80)
    
    all_passed = True
    
    # T3a: Missing token
    try:
        print(f"\n[T3a] POST {BASE_URL}/leiekontrakt/opprett (empty body)")
        
        response = requests.post(
            f"{BASE_URL}/leiekontrakt/opprett",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 500:
            print("❌ CRITICAL: Got 500 error on POST /leiekontrakt/opprett (empty body)")
            print(f"Response: {response.text}")
            all_passed = False
        elif response.status_code != 400:
            print(f"❌ Expected 400, got {response.status_code}")
            print(f"Response: {response.text}")
            all_passed = False
        else:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            if data.get('ok') is False:
                print(f"✅ POST /leiekontrakt/opprett (empty body): 400 OK with error")
            else:
                print("❌ Expected ok:false")
                all_passed = False
        
    except Exception as e:
        print(f"❌ Exception in T3a: {e}")
        all_passed = False
    
    # T3b: Bad token
    try:
        print(f"\n[T3b] POST {BASE_URL}/leiekontrakt/opprett (bad token)")
        
        response = requests.post(
            f"{BASE_URL}/leiekontrakt/opprett",
            json={"token": "does-not-exist"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 500:
            print("❌ CRITICAL: Got 500 error on POST /leiekontrakt/opprett (bad token)")
            print(f"Response: {response.text}")
            all_passed = False
        elif response.status_code != 404:
            print(f"❌ Expected 404, got {response.status_code}")
            print(f"Response: {response.text}")
            all_passed = False
        else:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            if data.get('ok') is False:
                print(f"✅ POST /leiekontrakt/opprett (bad token): 404 OK")
            else:
                print("❌ Expected ok:false")
                all_passed = False
        
    except Exception as e:
        print(f"❌ Exception in T3b: {e}")
        all_passed = False
    
    return all_passed


def main():
    print("="*80)
    print("SAFE REGRESSION TEST: SELVBETJENT PROVISJONERING")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print("\nCRITICAL SAFETY RULES:")
    print("1. Do NOT POST /api/leads")
    print("2. Do NOT POST /api/leiekontrakt/opprett with valid owner fields")
    print("3. Only GET / draft round-trip on utkast")
    print("\nGOAL: Confirm no 500 errors anywhere")
    
    # T1: Utkast round-trip
    token = test_utkast_round_trip()
    if not token:
        print("\n❌ T1 FAILED - Cannot continue with T2")
        sys.exit(1)
    
    # T2: Opprett validation (no owner)
    t2_passed = test_opprett_validation_no_owner(token)
    if not t2_passed:
        print("\n❌ T2 FAILED")
        sys.exit(1)
    
    # T3: Missing/bad token
    t3_passed = test_opprett_missing_token()
    if not t3_passed:
        print("\n❌ T3 FAILED")
        sys.exit(1)
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print("✅ T1: UTKAST ROUND-TRIP - PASSED (200 on POST and GET)")
    print("✅ T2: OPPRETT VALIDATION (no owner) - PASSED (400 with owner validation errors)")
    print("✅ T3: MISSING/BAD TOKEN - PASSED (400 for empty body, 404 for bad token)")
    print("✅ T4: ROBUSTNESS - PASSED (no 500 errors on any call)")
    print("\n✅ ALL TESTS PASSED - Backend edits did NOT break endpoints")
    print("="*80)


if __name__ == "__main__":
    main()
