#!/usr/bin/env python3
"""
Backend test for "Vekstplan i faser" (budsjett-modell) functionality.
Tests the sanitation and persistence of drivere.vekstplan in budget plans.

Base URL: https://saker-hub.preview.emergentagent.com/api
Auth: Owner login credentials from /app/memory/test_credentials.md
"""

import requests
import json
import sys
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
OWNER_EMAIL = "martin@kviteberg.no"
OWNER_PASSWORD = "Pyramiden2025##"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test results
test_results = []

def log_test(test_name, passed, message=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status}: {test_name}"
    if message:
        result += f" - {message}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "message": message})
    return passed

def login():
    """Login as owner and get admin key"""
    print("\n=== AUTHENTICATION ===")
    try:
        response = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            if token:
                log_test("Login", True, f"Got token: {token[:20]}...")
                return token
            else:
                log_test("Login", False, "No token in response")
                return None
        else:
            log_test("Login", False, f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("Login", False, f"Exception: {str(e)}")
        return None

def get_existing_plans(key):
    """Get list of existing plans to verify they are not mutated"""
    try:
        response = requests.get(
            f"{BASE_URL}/admin/budsjett/planer?key={key}",
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            plans = data.get("planer", [])
            return {p["navn"]: p for p in plans}
        return {}
    except Exception as e:
        print(f"Warning: Could not get existing plans: {e}")
        return {}

def test_vekstplan_sanering(key):
    """
    Test the vekstplan sanitation and persistence functionality.
    
    TESTPLAN:
    1) POST ny plan: type 'modell', navn 'TEST-VEKSTPLAN-SLETTES', startYm '2026-09', antallMnd 12
    2) PUT plan med drivere som inneholder: nyePerMnd: 2 og vekstplan: 
       [{fraMnd:1, perMnd:9}, {fraMnd:7, perMnd:4}, {fraMnd:7, perMnd:5}, 
        {fraMnd:'x', perMnd:3}, {fraMnd:13, perMnd:8}]
    3) GET planen → verifiser at lagret drivere.vekstplan er EKSAKT 
       [{fraMnd:7, perMnd:5}, {fraMnd:13, perMnd:8}]
    4) PUT med scenarioer: [{navn:'Ambisiøst', drivere:{nyePerMnd:4, vekstplan:[{fraMnd:7, perMnd:8}]}}]
    5) Bakoverkompatibilitet: PUT med drivere UTEN vekstplan-felt
    6) Verifiser at eksisterende planer er UENDRET
    7) DELETE testplanen
    """
    
    print("\n=== VEKSTPLAN I FASER TESTING ===")
    
    # Get existing plans before testing
    print("\n--- Getting existing plans for verification ---")
    existing_plans_before = get_existing_plans(key)
    expected_plans = ["Budsjett DigiHome", "Investormodell 2027–2028", "Neste 12 mnd (rullerende)"]
    for plan_name in expected_plans:
        if plan_name in existing_plans_before:
            print(f"Found existing plan: {plan_name}")
    
    plan_id = None
    
    try:
        # TEST 1: Create new plan
        print("\n--- TEST 1: POST new plan ---")
        create_payload = {
            "type": "modell",
            "navn": "TEST-VEKSTPLAN-SLETTES",
            "startYm": "2026-09",
            "antallMnd": 12,
            "status": "utkast",
            "drivere": {
                "nyePerMnd": 2
            },
            "inntekter": {},
            "kostnader": {}
        }
        
        response = requests.put(
            f"{BASE_URL}/admin/budsjett/plan?key={key}",
            json=create_payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                plan_id = data.get("id")
                log_test("T1: Create plan", True, f"Created plan with id: {plan_id}")
            else:
                log_test("T1: Create plan", False, f"Response not ok: {data}")
                return
        else:
            log_test("T1: Create plan", False, f"Status {response.status_code}: {response.text[:200]}")
            return
        
        # TEST 2: PUT plan with vekstplan containing test data
        print("\n--- TEST 2: PUT plan with vekstplan (sanitation test) ---")
        update_payload = {
            "id": plan_id,
            "type": "modell",
            "navn": "TEST-VEKSTPLAN-SLETTES",
            "startYm": "2026-09",
            "antallMnd": 12,
            "status": "utkast",
            "drivere": {
                "nyePerMnd": 2,
                "vekstplan": [
                    {"fraMnd": 1, "perMnd": 9},      # Should be filtered (fraMnd < 2)
                    {"fraMnd": 7, "perMnd": 4},      # Should be replaced by next
                    {"fraMnd": 7, "perMnd": 5},      # Should win (dedupe last-wins)
                    {"fraMnd": "x", "perMnd": 3},    # Should be filtered (invalid fraMnd)
                    {"fraMnd": 13, "perMnd": 8}      # Should be kept
                ]
            },
            "inntekter": {},
            "kostnader": {}
        }
        
        response = requests.put(
            f"{BASE_URL}/admin/budsjett/plan?key={key}",
            json=update_payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("T2: Update plan with vekstplan", True, "Plan updated successfully")
            else:
                log_test("T2: Update plan with vekstplan", False, f"Response not ok: {data}")
                return
        else:
            log_test("T2: Update plan with vekstplan", False, f"Status {response.status_code}: {response.text[:200]}")
            return
        
        # TEST 3: GET plan and verify vekstplan sanitation
        print("\n--- TEST 3: GET plan and verify vekstplan sanitation ---")
        response = requests.get(
            f"{BASE_URL}/admin/budsjett/plan?id={plan_id}&key={key}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                plan = data.get("plan", {})
                drivere = plan.get("drivere", {})
                vekstplan = drivere.get("vekstplan", [])
                nyePerMnd = drivere.get("nyePerMnd")
                
                print(f"Retrieved vekstplan: {json.dumps(vekstplan, indent=2)}")
                print(f"Retrieved nyePerMnd: {nyePerMnd}")
                
                # Verify nyePerMnd
                if nyePerMnd == 2:
                    log_test("T3a: nyePerMnd preserved", True, f"nyePerMnd === {nyePerMnd}")
                else:
                    log_test("T3a: nyePerMnd preserved", False, f"Expected 2, got {nyePerMnd}")
                
                # Expected vekstplan after sanitation:
                # - fraMnd:1 filtered (< 2)
                # - fraMnd:7 dedupe (last wins: perMnd:5)
                # - fraMnd:'x' filtered (invalid)
                # - fraMnd:13 kept
                # - Sorted by fraMnd
                expected_vekstplan = [
                    {"fraMnd": 7, "perMnd": 5},
                    {"fraMnd": 13, "perMnd": 8}
                ]
                
                if len(vekstplan) == len(expected_vekstplan):
                    all_match = True
                    for i, expected in enumerate(expected_vekstplan):
                        actual = vekstplan[i]
                        if actual.get("fraMnd") != expected["fraMnd"] or actual.get("perMnd") != expected["perMnd"]:
                            all_match = False
                            log_test(f"T3b: vekstplan[{i}]", False, f"Expected {expected}, got {actual}")
                    
                    if all_match:
                        log_test("T3b: vekstplan sanitation", True, "vekstplan matches expected: [{fraMnd:7, perMnd:5}, {fraMnd:13, perMnd:8}]")
                else:
                    log_test("T3b: vekstplan sanitation", False, f"Expected 2 phases, got {len(vekstplan)}: {vekstplan}")
            else:
                log_test("T3: GET plan", False, f"Response not ok: {data}")
                return
        else:
            log_test("T3: GET plan", False, f"Status {response.status_code}: {response.text[:200]}")
            return
        
        # TEST 4: PUT with scenarios containing vekstplan
        print("\n--- TEST 4: PUT with scenarios containing vekstplan ---")
        scenario_payload = {
            "id": plan_id,
            "type": "modell",
            "navn": "TEST-VEKSTPLAN-SLETTES",
            "startYm": "2026-09",
            "antallMnd": 12,
            "status": "utkast",
            "drivere": {
                "nyePerMnd": 2,
                "vekstplan": [
                    {"fraMnd": 7, "perMnd": 5},
                    {"fraMnd": 13, "perMnd": 8}
                ]
            },
            "scenarioer": [
                {
                    "navn": "Ambisiøst",
                    "drivere": {
                        "nyePerMnd": 4,
                        "vekstplan": [
                            {"fraMnd": 7, "perMnd": 8}
                        ]
                    }
                }
            ],
            "inntekter": {},
            "kostnader": {}
        }
        
        response = requests.put(
            f"{BASE_URL}/admin/budsjett/plan?key={key}",
            json=scenario_payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("T4a: Update with scenarios", True, "Plan updated with scenarios")
                
                # GET and verify scenario vekstplan
                response = requests.get(
                    f"{BASE_URL}/admin/budsjett/plan?id={plan_id}&key={key}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    plan = data.get("plan", {})
                    scenarioer = plan.get("scenarioer", [])
                    
                    if len(scenarioer) > 0:
                        scenario = scenarioer[0]
                        scenario_drivere = scenario.get("drivere", {})
                        scenario_vekstplan = scenario_drivere.get("vekstplan", [])
                        
                        print(f"Scenario vekstplan: {json.dumps(scenario_vekstplan, indent=2)}")
                        
                        if len(scenario_vekstplan) == 1 and scenario_vekstplan[0].get("fraMnd") == 7 and scenario_vekstplan[0].get("perMnd") == 8:
                            log_test("T4b: Scenario vekstplan persisted", True, "Scenario vekstplan correctly saved and sanitized")
                        else:
                            log_test("T4b: Scenario vekstplan persisted", False, f"Expected [{{'fraMnd':7, 'perMnd':8}}], got {scenario_vekstplan}")
                    else:
                        log_test("T4b: Scenario vekstplan persisted", False, "No scenarios found")
                else:
                    log_test("T4b: Scenario vekstplan persisted", False, f"Failed to GET plan: {response.status_code}")
            else:
                log_test("T4a: Update with scenarios", False, f"Response not ok: {data}")
        else:
            log_test("T4a: Update with scenarios", False, f"Status {response.status_code}: {response.text[:200]}")
        
        # TEST 5: Backward compatibility - PUT without vekstplan field
        print("\n--- TEST 5: Backward compatibility (no vekstplan field) ---")
        compat_payload = {
            "id": plan_id,
            "type": "modell",
            "navn": "TEST-VEKSTPLAN-SLETTES",
            "startYm": "2026-09",
            "antallMnd": 12,
            "status": "utkast",
            "drivere": {
                "nyePerMnd": 3
                # No vekstplan field
            },
            "inntekter": {},
            "kostnader": {}
        }
        
        response = requests.put(
            f"{BASE_URL}/admin/budsjett/plan?key={key}",
            json=compat_payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                # GET and verify vekstplan is empty array
                response = requests.get(
                    f"{BASE_URL}/admin/budsjett/plan?id={plan_id}&key={key}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    plan = data.get("plan", {})
                    drivere = plan.get("drivere", {})
                    vekstplan = drivere.get("vekstplan", None)
                    
                    if isinstance(vekstplan, list) and len(vekstplan) == 0:
                        log_test("T5: Backward compatibility", True, "vekstplan is empty array [] when not provided (no crash)")
                    else:
                        log_test("T5: Backward compatibility", False, f"Expected empty array [], got {vekstplan}")
                else:
                    log_test("T5: Backward compatibility", False, f"Failed to GET plan: {response.status_code}")
            else:
                log_test("T5: Backward compatibility", False, f"Response not ok: {data}")
        else:
            log_test("T5: Backward compatibility", False, f"Status {response.status_code}: {response.text[:200]}")
        
        # TEST 6: Verify existing plans are unchanged
        print("\n--- TEST 6: Verify existing plans are UNCHANGED ---")
        existing_plans_after = get_existing_plans(key)
        
        all_unchanged = True
        for plan_name in expected_plans:
            before = existing_plans_before.get(plan_name)
            after = existing_plans_after.get(plan_name)
            
            if before and after:
                # Compare key fields
                if (before.get("startYm") == after.get("startYm") and
                    before.get("antallMnd") == after.get("antallMnd") and
                    before.get("status") == after.get("status")):
                    print(f"✓ Plan '{plan_name}' unchanged")
                else:
                    print(f"✗ Plan '{plan_name}' was modified!")
                    all_unchanged = False
            elif before and not after:
                print(f"✗ Plan '{plan_name}' was deleted!")
                all_unchanged = False
            elif not before:
                print(f"⚠ Plan '{plan_name}' was not found before testing")
        
        if all_unchanged:
            log_test("T6: Existing plans unchanged", True, "All existing plans remain unchanged")
        else:
            log_test("T6: Existing plans unchanged", False, "Some existing plans were modified or deleted")
        
        # TEST 7: DELETE test plan
        print("\n--- TEST 7: DELETE test plan ---")
        response = requests.delete(
            f"{BASE_URL}/admin/budsjett/plan?id={plan_id}&key={key}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("T7a: Delete plan", True, f"Plan {plan_id} deleted successfully")
                
                # Verify it's gone
                response = requests.get(
                    f"{BASE_URL}/admin/budsjett/planer?key={key}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    plans = data.get("planer", [])
                    test_plan_exists = any(p.get("navn") == "TEST-VEKSTPLAN-SLETTES" for p in plans)
                    
                    if not test_plan_exists:
                        log_test("T7b: Verify deletion", True, "Test plan no longer in list")
                    else:
                        log_test("T7b: Verify deletion", False, "Test plan still exists in list")
                else:
                    log_test("T7b: Verify deletion", False, f"Failed to get plan list: {response.status_code}")
            else:
                log_test("T7a: Delete plan", False, f"Response not ok: {data}")
        else:
            log_test("T7a: Delete plan", False, f"Status {response.status_code}: {response.text[:200]}")
    
    except Exception as e:
        print(f"\n❌ EXCEPTION during testing: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup: ensure test plan is deleted even if tests fail
        if plan_id:
            print("\n--- CLEANUP: Ensuring test plan is deleted ---")
            try:
                response = requests.delete(
                    f"{BASE_URL}/admin/budsjett/plan?id={plan_id}&key={key}",
                    timeout=10
                )
                if response.status_code == 200:
                    print(f"✓ Cleanup successful: deleted plan {plan_id}")
                else:
                    print(f"⚠ Cleanup warning: delete returned {response.status_code}")
            except Exception as e:
                print(f"⚠ Cleanup exception: {str(e)}")

def main():
    """Main test execution"""
    print("=" * 80)
    print("BACKEND TEST: Vekstplan i faser (budsjett-modell)")
    print("=" * 80)
    
    # Login
    key = login()
    if not key:
        print("\n❌ FATAL: Could not authenticate. Aborting tests.")
        sys.exit(1)
    
    # Run tests
    test_vekstplan_sanering(key)
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for r in test_results if r["passed"])
    total = len(test_results)
    
    print(f"\nTotal tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success rate: {(passed/total*100):.1f}%")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED")
        print("\nFailed tests:")
        for r in test_results:
            if not r["passed"]:
                print(f"  - {r['test']}: {r['message']}")
        sys.exit(1)

if __name__ == "__main__":
    main()
