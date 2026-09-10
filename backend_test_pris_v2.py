#!/usr/bin/env python3
"""
Backend test for PRIS v2 (multi-customer pricing system)
Tests the rewritten PRIS backend with catalog of PLANS + list of CUSTOMERS
"""

import requests
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test state
test_results = []
qa_plan_id = None
qa_customer_id = None
digihome_customer_id = None
standard_plan_id = None


def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append({"name": name, "passed": passed, "details": details})
    print(f"{status}: {name}")
    if details:
        print(f"  {details}")


def test_get_pris_data():
    """Test 1: GET /api/admin/pris/data - verify seeded data"""
    global digihome_customer_id, standard_plan_id
    
    print("\n=== TEST 1: GET /api/admin/pris/data ===")
    
    # Test without key (should be 401)
    try:
        response = requests.get(f"{BASE_URL}/admin/pris/data", timeout=10)
        log_test("GET /data without key returns 401", response.status_code == 401)
    except Exception as e:
        log_test("GET /data without key returns 401", False, f"Error: {e}")
    
    # Test with key
    try:
        response = requests.get(f"{BASE_URL}/admin/pris/data?key={ADMIN_KEY}", timeout=10)
        
        if response.status_code != 200:
            log_test("GET /data returns 200", False, f"Status: {response.status_code}")
            return
        
        data = response.json()
        log_test("GET /data returns 200", True)
        
        # Verify structure
        has_ok = data.get("ok") == True
        log_test("Response has ok:true", has_ok)
        
        has_settings = "settings" in data
        log_test("Response has settings", has_settings)
        
        if has_settings:
            settings = data["settings"]
            has_mva = settings.get("mvaSats") == 25
            log_test("Settings has mvaSats:25", has_mva)
        
        has_planer = "planer" in data and isinstance(data["planer"], list)
        log_test("Response has planer array", has_planer)
        
        if has_planer:
            planer = data["planer"]
            forvalter_plan = next((p for p in planer if p.get("navn") == "Forvalter"), None)
            
            if forvalter_plan:
                log_test("Found 'Forvalter' plan", True)
                standard_plan_id = forvalter_plan.get("id")
                
                is_standard = forvalter_plan.get("standard") == True
                log_test("Forvalter plan is standard", is_standard)
                
                has_trinn = "trinn" in forvalter_plan and len(forvalter_plan["trinn"]) == 3
                log_test("Forvalter plan has 3 tiers", has_trinn)
                
                if has_trinn:
                    trinn = forvalter_plan["trinn"]
                    tier0 = trinn[0].get("fraEnheter") == 0 and trinn[0].get("pris") == 200
                    tier1 = trinn[1].get("fraEnheter") == 50 and trinn[1].get("pris") == 150
                    tier2 = trinn[2].get("fraEnheter") == 200 and trinn[2].get("pris") == 99
                    log_test("Tiers are 0→200, 50→150, 200→99", tier0 and tier1 and tier2)
            else:
                log_test("Found 'Forvalter' plan", False)
        
        has_kunder = "kunder" in data and isinstance(data["kunder"], list)
        log_test("Response has kunder array", has_kunder)
        
        if has_kunder:
            kunder = data["kunder"]
            digihome = next((k for k in kunder if k.get("navn") == "DigiHome AS"), None)
            
            if digihome:
                log_test("Found 'DigiHome AS' customer", True)
                digihome_customer_id = digihome.get("id")
                
                is_forste = digihome.get("forste") == True
                log_test("DigiHome AS has forste:true", is_forste)
                
                enhetskilde = digihome.get("enhetskilde") == "plattform"
                log_test("DigiHome AS has enhetskilde:'plattform'", enhetskilde)
                
                grunnlag = digihome.get("grunnlag") == "utleid_mnd"
                log_test("DigiHome AS has grunnlag:'utleid_mnd'", grunnlag)
            else:
                log_test("Found 'DigiHome AS' customer", False)
    
    except Exception as e:
        log_test("GET /data with key", False, f"Error: {e}")


def test_mrr_all_customers():
    """Test 2: GET /api/admin/pris/grunnlag?maaned=2026-08 (MRR all customers)"""
    print("\n=== TEST 2: MRR ALL CUSTOMERS ===")
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/pris/grunnlag?key={ADMIN_KEY}&maaned=2026-08",
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("GET /grunnlag (all customers) returns 200", False, f"Status: {response.status_code}")
            return
        
        data = response.json()
        log_test("GET /grunnlag (all customers) returns 200", True)
        
        has_per = "per" in data and isinstance(data["per"], list)
        log_test("Response has per array", has_per)
        
        has_sum = "sum" in data
        log_test("Response has sum", has_sum)
        
        if has_per:
            digihome_entry = next((p for p in data["per"] if "DigiHome AS" in p.get("navn", "")), None)
            
            if digihome_entry:
                log_test("Found DigiHome AS in per array", True)
                
                enheter = digihome_entry.get("antallEnheter") == 16
                log_test("DigiHome AS antallEnheter=16", enheter, f"Got: {digihome_entry.get('antallEnheter')}")
                
                eks_mva = digihome_entry.get("sumEksMva") == 3200
                log_test("DigiHome AS sumEksMva=3200", eks_mva, f"Got: {digihome_entry.get('sumEksMva')}")
            else:
                log_test("Found DigiHome AS in per array", False)
        
        if has_sum:
            sum_data = data["sum"]
            sum_eks = sum_data.get("eks") == 3200
            log_test("sum.eks=3200 (only DigiHome AS)", sum_eks, f"Got: {sum_data.get('eks')}")
    
    except Exception as e:
        log_test("GET /grunnlag (all customers)", False, f"Error: {e}")


def test_per_customer_grunnlag():
    """Test 3: GET /api/admin/pris/grunnlag?kunde=<id> (per-customer)"""
    global digihome_customer_id
    
    print("\n=== TEST 3: PER-CUSTOMER GRUNNLAG ===")
    
    if not digihome_customer_id:
        log_test("Per-customer grunnlag", False, "DigiHome customer ID not found")
        return
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/pris/grunnlag?key={ADMIN_KEY}&maaned=2026-08&kunde={digihome_customer_id}",
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("GET /grunnlag (per customer) returns 200", False, f"Status: {response.status_code}")
            return
        
        data = response.json()
        log_test("GET /grunnlag (per customer) returns 200", True)
        
        has_grunnlag = "grunnlag" in data
        log_test("Response has grunnlag", has_grunnlag)
        
        if has_grunnlag:
            grunnlag = data["grunnlag"]
            
            enheter = grunnlag.get("antallEnheter") == 16
            log_test("grunnlag.antallEnheter=16", enheter, f"Got: {grunnlag.get('antallEnheter')}")
            
            has_linjer = "linjer" in grunnlag and len(grunnlag["linjer"]) > 0
            log_test("grunnlag has linjer", has_linjer)
            
            if has_linjer:
                line = grunnlag["linjer"][0]
                pris = line.get("pris") == 200
                belop = line.get("belop") == 3200
                log_test("Line: pris=200, belop=3200", pris and belop, f"Got pris={line.get('pris')}, belop={line.get('belop')}")
            
            eks_mva = grunnlag.get("sumEksMva") == 3200
            log_test("grunnlag.sumEksMva=3200", eks_mva, f"Got: {grunnlag.get('sumEksMva')}")
            
            mva = grunnlag.get("mva") == 800
            log_test("grunnlag.mva=800", mva, f"Got: {grunnlag.get('mva')}")
            
            ink_mva = grunnlag.get("sumInkMva") == 4000
            log_test("grunnlag.sumInkMva=4000", ink_mva, f"Got: {grunnlag.get('sumInkMva')}")
        
        # Test unknown kunde id
        response_404 = requests.get(
            f"{BASE_URL}/admin/pris/grunnlag?key={ADMIN_KEY}&maaned=2026-08&kunde=unknown-id-12345",
            timeout=10
        )
        log_test("Unknown kunde id returns 404", response_404.status_code == 404)
    
    except Exception as e:
        log_test("GET /grunnlag (per customer)", False, f"Error: {e}")


def test_plan_crud():
    """Test 4: POST /api/admin/pris/planer (create QA plan)"""
    global qa_plan_id
    
    print("\n=== TEST 4: PLAN CRUD ===")
    
    try:
        # Create QA Enterprise plan
        payload = {
            "navn": "QA Enterprise",
            "beskrivelse": "test",
            "prisModell": "blandet",
            "trinn": [{"fraEnheter": 0, "pris": 120}],
            "selvbetjentPris": 60,
            "standard": False,
            "aktiv": True
        }
        
        response = requests.post(
            f"{BASE_URL}/admin/pris/planer?key={ADMIN_KEY}",
            json=payload,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("POST /planer creates plan", False, f"Status: {response.status_code}, Body: {response.text}")
            return
        
        data = response.json()
        log_test("POST /planer creates plan", True)
        
        has_plan = "plan" in data
        log_test("Response has plan", has_plan)
        
        if has_plan:
            plan = data["plan"]
            qa_plan_id = plan.get("id")
            
            navn = plan.get("navn") == "QA Enterprise"
            log_test("Plan navn='QA Enterprise'", navn)
            
            has_trinn = "trinn" in plan and len(plan["trinn"]) > 0
            log_test("Plan has trinn", has_trinn)
            
            if has_trinn:
                # Verify tier normalization (first tier should be fraEnheter=0)
                first_tier = plan["trinn"][0]
                normalized = first_tier.get("fraEnheter") == 0
                log_test("First tier normalized to fraEnheter=0", normalized)
    
    except Exception as e:
        log_test("POST /planer", False, f"Error: {e}")


def test_customer_crud():
    """Test 5: POST /api/admin/pris/kunder (create QA customer)"""
    global qa_customer_id, standard_plan_id
    
    print("\n=== TEST 5: CUSTOMER CRUD ===")
    
    if not standard_plan_id:
        log_test("Customer CRUD", False, "Standard plan ID not found")
        return
    
    try:
        # Test POST without navn (should be 400)
        response_no_navn = requests.post(
            f"{BASE_URL}/admin/pris/kunder?key={ADMIN_KEY}",
            json={"orgnr": "999888777"},
            timeout=10
        )
        log_test("POST /kunder without navn returns 400", response_no_navn.status_code == 400)
        
        # Create QA Bergen Eiendom AS
        payload = {
            "navn": "QA Bergen Eiendom AS",
            "orgnr": "999888777",
            "enhetskilde": "manuell",
            "manueltAntall": 60,
            "status": "aktiv",
            "planId": standard_plan_id
        }
        
        response = requests.post(
            f"{BASE_URL}/admin/pris/kunder?key={ADMIN_KEY}",
            json=payload,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("POST /kunder creates customer", False, f"Status: {response.status_code}, Body: {response.text}")
            return
        
        data = response.json()
        log_test("POST /kunder creates customer", True)
        
        has_kunde = "kunde" in data
        log_test("Response has kunde", has_kunde)
        
        if has_kunde:
            kunde = data["kunde"]
            qa_customer_id = kunde.get("id")
            
            manuelt = kunde.get("manueltAntall") == 60
            log_test("Customer manueltAntall=60", manuelt, f"Got: {kunde.get('manueltAntall')}")
        
        # Verify grunnlag for QA customer
        if qa_customer_id:
            response_grunnlag = requests.get(
                f"{BASE_URL}/admin/pris/grunnlag?key={ADMIN_KEY}&maaned=2026-08&kunde={qa_customer_id}",
                timeout=10
            )
            
            if response_grunnlag.status_code == 200:
                grunnlag_data = response_grunnlag.json()
                grunnlag = grunnlag_data.get("grunnlag", {})
                
                enheter = grunnlag.get("antallEnheter") == 60
                log_test("QA customer antallEnheter=60", enheter, f"Got: {grunnlag.get('antallEnheter')}")
                
                # 60 units should hit the 50→150 tier
                if "linjer" in grunnlag and len(grunnlag["linjer"]) > 0:
                    line = grunnlag["linjer"][0]
                    pris = line.get("pris") == 150
                    belop = line.get("belop") == 9000
                    log_test("QA customer: pris=150 (tier 50), belop=9000", pris and belop, 
                            f"Got pris={line.get('pris')}, belop={line.get('belop')}")
    
    except Exception as e:
        log_test("POST /kunder", False, f"Error: {e}")


def test_mrr_two_customers():
    """Test 6: MRR with 2 customers"""
    print("\n=== TEST 6: MRR WITH 2 CUSTOMERS ===")
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/pris/grunnlag?key={ADMIN_KEY}&maaned=2026-08",
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("GET /grunnlag (2 customers) returns 200", False, f"Status: {response.status_code}")
            return
        
        data = response.json()
        log_test("GET /grunnlag (2 customers) returns 200", True)
        
        if "sum" in data:
            sum_data = data["sum"]
            
            enheter = sum_data.get("enheter") == 76
            log_test("sum.enheter=76 (16+60)", enheter, f"Got: {sum_data.get('enheter')}")
            
            eks = sum_data.get("eks") == 12200
            log_test("sum.eks=12200 (3200+9000)", eks, f"Got: {sum_data.get('eks')}")
    
    except Exception as e:
        log_test("MRR with 2 customers", False, f"Error: {e}")


def test_preview_unsaved():
    """Test 7: POST /api/admin/pris/grunnlag (preview with unsaved kunde/plan)"""
    global standard_plan_id
    
    print("\n=== TEST 7: PREVIEW WITH UNSAVED KUNDE/PLAN ===")
    
    if not standard_plan_id:
        log_test("Preview unsaved", False, "Standard plan ID not found")
        return
    
    try:
        payload = {
            "maaned": "2026-08",
            "kunde": {
                "enhetskilde": "plattform",
                "grunnlag": "alle",
                "planId": standard_plan_id
            },
            "plan": {
                "prisModell": "blandet",
                "trinn": [{"fraEnheter": 0, "pris": 200}]
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/admin/pris/grunnlag?key={ADMIN_KEY}",
            json=payload,
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("POST /grunnlag (preview) returns 200", False, f"Status: {response.status_code}, Body: {response.text}")
            return
        
        data = response.json()
        log_test("POST /grunnlag (preview) returns 200", True)
        
        if "grunnlag" in data:
            grunnlag = data["grunnlag"]
            
            enheter = grunnlag.get("antallEnheter", 0)
            # Should be LARGER than 16 (all under management ~27)
            larger = enheter > 16
            log_test(f"Preview antallEnheter ({enheter}) > 16", larger, f"Got: {enheter}")
            
            if "linjer" in grunnlag and len(grunnlag["linjer"]) > 0:
                line = grunnlag["linjer"][0]
                belop = line.get("belop", 0)
                expected_belop = enheter * 200
                correct_belop = belop == expected_belop
                log_test(f"Preview belop={belop} (={enheter}×200)", correct_belop, f"Expected: {expected_belop}")
    
    except Exception as e:
        log_test("POST /grunnlag (preview)", False, f"Error: {e}")


def test_delete_guards():
    """Test 8: DELETE guards (cannot delete forste customer or standard plan in use)"""
    global digihome_customer_id, standard_plan_id
    
    print("\n=== TEST 8: DELETE GUARDS ===")
    
    if not digihome_customer_id:
        log_test("DELETE guards", False, "DigiHome customer ID not found")
        return
    
    try:
        # Try to delete DigiHome AS (forste customer)
        response_forste = requests.delete(
            f"{BASE_URL}/admin/pris/kunder?key={ADMIN_KEY}&id={digihome_customer_id}",
            timeout=10
        )
        
        if response_forste.status_code == 200:
            data = response_forste.json()
            ok = data.get("ok") == False
            has_feil = "feil" in data or "error" in data
            log_test("DELETE forste customer returns ok:false", ok and has_feil, 
                    f"Response: {data}")
        else:
            log_test("DELETE forste customer blocked", response_forste.status_code in [400, 403])
        
        # Try to delete standard plan in use
        if standard_plan_id:
            response_plan = requests.delete(
                f"{BASE_URL}/admin/pris/planer?key={ADMIN_KEY}&id={standard_plan_id}",
                timeout=10
            )
            
            if response_plan.status_code == 200:
                data = response_plan.json()
                ok = data.get("ok") == False
                log_test("DELETE standard plan in use returns ok:false", ok, f"Response: {data}")
            else:
                log_test("DELETE standard plan in use blocked", response_plan.status_code in [400, 403, 409])
    
    except Exception as e:
        log_test("DELETE guards", False, f"Error: {e}")


def test_cleanup():
    """Test 9: MANDATORY CLEANUP - delete QA customer and QA plan"""
    global qa_customer_id, qa_plan_id
    
    print("\n=== TEST 9: MANDATORY CLEANUP ===")
    
    try:
        # Delete QA customer
        if qa_customer_id:
            response_kunde = requests.delete(
                f"{BASE_URL}/admin/pris/kunder?key={ADMIN_KEY}&id={qa_customer_id}",
                timeout=10
            )
            log_test("DELETE QA customer", response_kunde.status_code == 200, 
                    f"Status: {response_kunde.status_code}")
        
        # Delete QA plan
        if qa_plan_id:
            response_plan = requests.delete(
                f"{BASE_URL}/admin/pris/planer?key={ADMIN_KEY}&id={qa_plan_id}",
                timeout=10
            )
            log_test("DELETE QA plan", response_plan.status_code == 200, 
                    f"Status: {response_plan.status_code}")
        
        # Verify only DigiHome AS and Forvalter remain
        response_data = requests.get(f"{BASE_URL}/admin/pris/data?key={ADMIN_KEY}", timeout=10)
        
        if response_data.status_code == 200:
            data = response_data.json()
            
            kunder = data.get("kunder", [])
            only_digihome = len([k for k in kunder if "DigiHome AS" in k.get("navn", "")]) == 1
            no_qa_kunde = len([k for k in kunder if "QA" in k.get("navn", "")]) == 0
            log_test("Only 'DigiHome AS' customer remains", only_digihome and no_qa_kunde, 
                    f"Customers: {[k.get('navn') for k in kunder]}")
            
            planer = data.get("planer", [])
            only_forvalter = len([p for p in planer if "Forvalter" in p.get("navn", "")]) == 1
            no_qa_plan = len([p for p in planer if "QA" in p.get("navn", "")]) == 0
            log_test("Only 'Forvalter' plan remains", only_forvalter and no_qa_plan, 
                    f"Plans: {[p.get('navn') for p in planer]}")
    
    except Exception as e:
        log_test("Cleanup verification", False, f"Error: {e}")


def test_auth():
    """Test 10: AUTH - all endpoints require key"""
    print("\n=== TEST 10: AUTH ===")
    
    endpoints = [
        "/admin/pris/data",
        "/admin/pris/innstillinger",
        "/admin/pris/planer",
        "/admin/pris/kunder",
        "/admin/pris/grunnlag?maaned=2026-08"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            passed = response.status_code == 401
            log_test(f"GET {endpoint} without key returns 401", passed, 
                    f"Status: {response.status_code}")
        except Exception as e:
            log_test(f"GET {endpoint} without key", False, f"Error: {e}")


def main():
    """Run all tests"""
    print("=" * 80)
    print("BACKEND TEST: PRIS v2 (Multi-Customer Pricing System)")
    print("=" * 80)
    
    # Run tests in sequence
    test_get_pris_data()
    test_mrr_all_customers()
    test_per_customer_grunnlag()
    test_plan_crud()
    test_customer_crud()
    test_mrr_two_customers()
    test_preview_unsaved()
    test_delete_guards()
    test_cleanup()
    test_auth()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    total = len(test_results)
    passed = sum(1 for t in test_results if t["passed"])
    failed = total - passed
    
    print(f"Total tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success rate: {(passed/total*100):.1f}%")
    
    if failed > 0:
        print("\nFailed tests:")
        for t in test_results:
            if not t["passed"]:
                print(f"  ❌ {t['name']}")
                if t["details"]:
                    print(f"     {t['details']}")
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
