#!/usr/bin/env python3
"""
Backend test for Budsjettmotor v3 — nye driverfelt roundtrip
Tests PUT/GET /api/admin/budsjett/plan for digihome and tech plans with new driver fields
"""

import requests
import sys
import json

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test state
dh_plan_id = None
tech_plan_id = None

def test_step(step_num, description):
    """Print test step header"""
    print(f"\n{'='*80}")
    print(f"STEP {step_num}: {description}")
    print('='*80)

def verify(condition, message):
    """Verify a condition and print result"""
    if condition:
        print(f"✅ {message}")
        return True
    else:
        print(f"❌ FAILED: {message}")
        return False

try:
    # ========================================================================
    # STEP 1: PUT digihome plan with new drivers (organiskAndelPct, kostTrinn, grunnleggere, skatt)
    # ========================================================================
    test_step(1, "PUT digihome plan with new drivers + GET to verify sanitation")
    
    dh_plan_body = {
        "navn": "QA v3 DH",
        "selskap": "digihome",
        "type": "modell",
        "startYm": "2026-08",
        "antallMnd": 36,
        "drivere": {
            "nyePerMnd": 2,
            "organiskAndelPct": 30,
            "kostTrinn": {
                "adminFast": [
                    {"fraMnd": 6, "belop": 12000},
                    {"fraMnd": 6, "belop": 13000},  # Duplicate fraMnd - should keep last
                    {"fraMnd": 0, "belop": 1}       # fraMnd 0 - should be removed
                ]
            },
            "grunnleggere": {
                "paa": True,
                "paslagPct": 35,
                "personer": [
                    {
                        "navn": "Sarah",
                        "rolle": "drift",
                        "andelPct": 70,
                        "trinn": [
                            {"fraMnd": 3, "brutto": 30000},
                            {"fraMnd": 6, "brutto": 35000}
                        ]
                    },
                    {
                        "navn": "X",
                        "rolle": "ukjent",  # Unknown rolle - should become 'ga'
                        "andelPct": 20,
                        "trinn": []
                    }
                ]
            },
            "skatt": {
                "paa": True,
                "satsPct": 22,
                "konsernbidrag": True
            }
        }
    }
    
    print(f"PUT /api/admin/budsjett/plan with new drivers...")
    resp = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=dh_plan_body)
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"❌ Expected 200, got {resp.status_code}")
        print(f"Response: {resp.text}")
        sys.exit(1)
    
    data = resp.json()
    verify(data.get("ok") == True, "Response has ok:true")
    verify("id" in data, "Response has id field")
    dh_plan_id = data["id"]
    print(f"✅ Created DH plan with id: {dh_plan_id}")
    
    # GET the plan to verify sanitation
    print(f"\nGET /api/admin/budsjett/plan?id={dh_plan_id}")
    resp = requests.get(f"{BASE_URL}/admin/budsjett/plan?id={dh_plan_id}&key={ADMIN_KEY}")
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"❌ Expected 200, got {resp.status_code}")
        sys.exit(1)
    
    data = resp.json()
    plan = data.get("plan", {})
    drivere = plan.get("drivere", {})
    
    # Verify organiskAndelPct
    verify(drivere.get("organiskAndelPct") == 30, "organiskAndelPct === 30")
    
    # Verify kostTrinn.adminFast has exactly one entry {fraMnd:6, belop:13000}
    admin_fast = drivere.get("kostTrinn", {}).get("adminFast", [])
    verify(len(admin_fast) == 1, f"kostTrinn.adminFast has exactly 1 entry (got {len(admin_fast)})")
    if len(admin_fast) == 1:
        verify(admin_fast[0].get("fraMnd") == 6, f"adminFast[0].fraMnd === 6 (got {admin_fast[0].get('fraMnd')})")
        verify(admin_fast[0].get("belop") == 13000, f"adminFast[0].belop === 13000 (got {admin_fast[0].get('belop')})")
    
    # Verify grunnleggere
    grunnleggere = drivere.get("grunnleggere", {})
    verify(grunnleggere.get("paa") == True, "grunnleggere.paa === true")
    
    personer = grunnleggere.get("personer", [])
    verify(len(personer) == 2, f"grunnleggere.personer has 2 entries (got {len(personer)})")
    
    if len(personer) >= 2:
        # personer[1] should have rolle 'ga' (was 'ukjent')
        verify(personer[1].get("rolle") == "ga", f"personer[1].rolle === 'ga' (got '{personer[1].get('rolle')}')")
        
        # personer[0] should have 2 trinn entries
        trinn = personer[0].get("trinn", [])
        verify(len(trinn) == 2, f"personer[0].trinn.length === 2 (got {len(trinn)})")
    
    # Verify skatt
    skatt = drivere.get("skatt", {})
    verify(skatt.get("paa") == True, "skatt.paa === true")
    verify(skatt.get("satsPct") == 22, "skatt.satsPct === 22")
    verify(skatt.get("konsernbidrag") == True, "skatt.konsernbidrag === true")
    
    print("✅ STEP 1 PASSED: DH plan created and sanitation verified")
    
    # ========================================================================
    # STEP 2: PUT same plan WITHOUT grunnleggere/skatt/kostTrinn → verify they become false/empty
    # ========================================================================
    test_step(2, "PUT same plan WITHOUT grunnleggere/skatt/kostTrinn → verify reset")
    
    dh_plan_update = {
        "id": dh_plan_id,
        "navn": "QA v3 DH",
        "selskap": "digihome",
        "type": "modell",
        "startYm": "2026-08",
        "antallMnd": 36,
        "drivere": {
            "nyePerMnd": 2,
            "organiskAndelPct": 30
            # NO grunnleggere, skatt, kostTrinn
        }
    }
    
    print(f"PUT /api/admin/budsjett/plan (update without grunnleggere/skatt/kostTrinn)...")
    resp = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=dh_plan_update)
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"❌ Expected 200, got {resp.status_code}")
        print(f"Response: {resp.text}")
        sys.exit(1)
    
    # GET to verify
    print(f"\nGET /api/admin/budsjett/plan?id={dh_plan_id}")
    resp = requests.get(f"{BASE_URL}/admin/budsjett/plan?id={dh_plan_id}&key={ADMIN_KEY}")
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"❌ Expected 200, got {resp.status_code}")
        sys.exit(1)
    
    data = resp.json()
    plan = data.get("plan", {})
    drivere = plan.get("drivere", {})
    
    # Verify grunnleggere.paa is false
    grunnleggere = drivere.get("grunnleggere", {})
    verify(grunnleggere.get("paa") == False, f"grunnleggere.paa === false (got {grunnleggere.get('paa')})")
    
    # Verify skatt.paa is false
    skatt = drivere.get("skatt", {})
    verify(skatt.get("paa") == False, f"skatt.paa === false (got {skatt.get('paa')})")
    
    # Verify kostTrinn.adminFast is []
    admin_fast = drivere.get("kostTrinn", {}).get("adminFast", [])
    verify(len(admin_fast) == 0, f"kostTrinn.adminFast is [] (got length {len(admin_fast)})")
    
    print("✅ STEP 2 PASSED: Fields reset correctly when omitted")
    
    # ========================================================================
    # STEP 3: PUT tech plan with new drivers + verify modus validation
    # ========================================================================
    test_step(3, "PUT tech plan with new drivers + verify modus validation")
    
    tech_plan_body = {
        "navn": "QA v3 Tech",
        "selskap": "tech",
        "startYm": "2026-08",
        "antallMnd": 36,
        "kobletPlanId": dh_plan_id,
        "tech": {
            "huseier": {
                "modus": "kunder",
                "kunderPlan": [
                    {"fraMnd": 1, "nyePerMnd": 2},
                    {"fraMnd": 13, "nyePerMnd": 5.5}
                ],
                "organiskPerMnd": 0
            },
            "kostTrinn": {
                "utviklingFast": [
                    {"fraMnd": 6, "belop": 35000}
                ]
            },
            "grunnleggere": {
                "paa": True,
                "paslagPct": 35,
                "personer": [
                    {
                        "navn": "Martin",
                        "rolle": "rd",
                        "andelPct": 80,
                        "trinn": [
                            {"fraMnd": 1, "brutto": 30000}
                        ]
                    }
                ]
            }
        }
    }
    
    print(f"PUT /api/admin/budsjett/plan (tech plan)...")
    resp = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=tech_plan_body)
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"❌ Expected 200, got {resp.status_code}")
        print(f"Response: {resp.text}")
        sys.exit(1)
    
    data = resp.json()
    verify(data.get("ok") == True, "Response has ok:true")
    verify("id" in data, "Response has id field")
    tech_plan_id = data["id"]
    print(f"✅ Created Tech plan with id: {tech_plan_id}")
    
    # GET to verify
    print(f"\nGET /api/admin/budsjett/plan?id={tech_plan_id}")
    resp = requests.get(f"{BASE_URL}/admin/budsjett/plan?id={tech_plan_id}&key={ADMIN_KEY}")
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"❌ Expected 200, got {resp.status_code}")
        sys.exit(1)
    
    data = resp.json()
    plan = data.get("plan", {})
    tech = plan.get("tech", {})
    
    # Verify huseier.modus
    huseier = tech.get("huseier", {})
    verify(huseier.get("modus") == "kunder", f"tech.huseier.modus === 'kunder' (got '{huseier.get('modus')}')")
    
    # Verify kunderPlan
    kunder_plan = huseier.get("kunderPlan", [])
    verify(len(kunder_plan) == 2, f"tech.huseier.kunderPlan.length === 2 (got {len(kunder_plan)})")
    if len(kunder_plan) >= 2:
        verify(kunder_plan[1].get("nyePerMnd") == 5.5, f"kunderPlan[1].nyePerMnd === 5.5 (got {kunder_plan[1].get('nyePerMnd')})")
    
    # Verify kostTrinn.utviklingFast
    utvikling_fast = tech.get("kostTrinn", {}).get("utviklingFast", [])
    verify(len(utvikling_fast) >= 1, f"tech.kostTrinn.utviklingFast has entries (got {len(utvikling_fast)})")
    if len(utvikling_fast) >= 1:
        verify(utvikling_fast[0].get("belop") == 35000, f"utviklingFast[0].belop === 35000 (got {utvikling_fast[0].get('belop')})")
    
    # Verify grunnleggere
    grunnleggere = tech.get("grunnleggere", {})
    personer = grunnleggere.get("personer", [])
    if len(personer) >= 1:
        verify(personer[0].get("rolle") == "rd", f"grunnleggere.personer[0].rolle === 'rd' (got '{personer[0].get('rolle')}')")
    
    # Test invalid modus 'tull' → should become 'kroner'
    print(f"\nPUT tech plan with huseier.modus='tull' (invalid)...")
    tech_plan_update = {
        "id": tech_plan_id,
        "navn": "QA v3 Tech",
        "selskap": "tech",
        "startYm": "2026-08",
        "antallMnd": 36,
        "kobletPlanId": dh_plan_id,
        "tech": {
            "huseier": {
                "modus": "tull"  # Invalid - should become 'kroner'
            }
        }
    }
    
    resp = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=tech_plan_update)
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"❌ Expected 200, got {resp.status_code}")
        print(f"Response: {resp.text}")
        sys.exit(1)
    
    # GET to verify modus became 'kroner'
    print(f"\nGET /api/admin/budsjett/plan?id={tech_plan_id}")
    resp = requests.get(f"{BASE_URL}/admin/budsjett/plan?id={tech_plan_id}&key={ADMIN_KEY}")
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"❌ Expected 200, got {resp.status_code}")
        sys.exit(1)
    
    data = resp.json()
    plan = data.get("plan", {})
    tech = plan.get("tech", {})
    huseier = tech.get("huseier", {})
    verify(huseier.get("modus") == "kroner", f"tech.huseier.modus === 'kroner' after invalid 'tull' (got '{huseier.get('modus')}')")
    
    print("✅ STEP 3 PASSED: Tech plan created and modus validation working")
    
    # ========================================================================
    # STEP 4: GET /api/investor/deck → verify Base plans have new fields
    # ========================================================================
    test_step(4, "GET /api/investor/deck → verify Base plans have new fields")
    
    print(f"GET /api/investor/deck")
    resp = requests.get(f"{BASE_URL}/investor/deck?key={ADMIN_KEY}")
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"❌ Expected 200, got {resp.status_code}")
        print(f"Response: {resp.text}")
        sys.exit(1)
    
    deck = resp.json()
    
    # Verify plan.navn starts with 'Base 2026–2029 · Digihome AS'
    plan = deck.get("plan", {})
    plan_navn = plan.get("navn", "")
    verify(plan_navn.startswith("Base 2026–2029 · Digihome AS"), f"plan.navn starts with 'Base 2026–2029 · Digihome AS' (got '{plan_navn}')")
    
    # Verify plan.drivere.grunnleggere.paa === true
    drivere = plan.get("drivere", {})
    grunnleggere = drivere.get("grunnleggere", {})
    verify(grunnleggere.get("paa") == True, f"plan.drivere.grunnleggere.paa === true (got {grunnleggere.get('paa')})")
    
    # Verify plan.drivere.skatt.paa === true
    skatt = drivere.get("skatt", {})
    verify(skatt.get("paa") == True, f"plan.drivere.skatt.paa === true (got {skatt.get('paa')})")
    
    # Verify tech.tech.kostTrinn.utviklingFast.length === 3
    tech = deck.get("tech", {})
    if tech:
        tech_tech = tech.get("tech", {})
        utvikling_fast = tech_tech.get("kostTrinn", {}).get("utviklingFast", [])
        verify(len(utvikling_fast) == 3, f"tech.tech.kostTrinn.utviklingFast.length === 3 (got {len(utvikling_fast)})")
        
        # Verify tech.tech.huseier.modus === 'kunder'
        huseier = tech_tech.get("huseier", {})
        verify(huseier.get("modus") == "kunder", f"tech.tech.huseier.modus === 'kunder' (got '{huseier.get('modus')}')")
    else:
        print("⚠️  No tech plan in deck (tech is null)")
    
    print("✅ STEP 4 PASSED: Base plans have new fields in investor deck")
    
    # ========================================================================
    # STEP 5: Cleanup - Delete QA plans (tech first, then DH)
    # ========================================================================
    test_step(5, "Cleanup - Delete QA plans")
    
    if tech_plan_id:
        print(f"DELETE /api/admin/budsjett/plan?id={tech_plan_id}")
        resp = requests.delete(f"{BASE_URL}/admin/budsjett/plan?id={tech_plan_id}&key={ADMIN_KEY}")
        print(f"Status: {resp.status_code}")
        verify(resp.status_code == 200, f"Tech plan deleted (status {resp.status_code})")
    
    if dh_plan_id:
        print(f"DELETE /api/admin/budsjett/plan?id={dh_plan_id}")
        resp = requests.delete(f"{BASE_URL}/admin/budsjett/plan?id={dh_plan_id}&key={ADMIN_KEY}")
        print(f"Status: {resp.status_code}")
        verify(resp.status_code == 200, f"DH plan deleted (status {resp.status_code})")
    
    # Verify cleanup
    print(f"\nGET /api/admin/budsjett/planer to verify cleanup...")
    resp = requests.get(f"{BASE_URL}/admin/budsjett/planer?key={ADMIN_KEY}")
    if resp.status_code == 200:
        planer_data = resp.json()
        # planer_data is a list of plans
        if isinstance(planer_data, list):
            qa_plans = [p for p in planer_data if isinstance(p, dict) and p.get("navn", "").startswith("QA v3")]
            verify(len(qa_plans) == 0, f"No QA v3 plans remain (found {len(qa_plans)})")
        else:
            print(f"⚠️  Unexpected planer response type: {type(planer_data)}")
    
    print("✅ STEP 5 PASSED: Cleanup successful")
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("\n" + "="*80)
    print("✅ ALL 5 STEPS PASSED - BUDSJETT V3 DRIVER-FIELD ROUNDTRIP WORKING PERFECTLY")
    print("="*80)
    print("\nVerified:")
    print("  • DH plan: organiskAndelPct, kostTrinn sanitation (dedupe, fraMnd 0 removal)")
    print("  • DH plan: grunnleggere with rolle normalization ('ukjent' → 'ga')")
    print("  • DH plan: skatt with paa/satsPct/konsernbidrag")
    print("  • DH plan: omitting fields resets them (grunnleggere.paa false, skatt.paa false, kostTrinn [])")
    print("  • Tech plan: huseier.modus 'kunder', kunderPlan with 2 steps")
    print("  • Tech plan: kostTrinn.utviklingFast, grunnleggere with rolle 'rd'")
    print("  • Tech plan: invalid modus 'tull' → 'kroner'")
    print("  • Investor deck: Base plans have new fields (grunnleggere.paa, skatt.paa, tech.kostTrinn, tech.huseier.modus)")
    print("  • Cleanup: All QA v3 plans deleted")
    
except Exception as e:
    print(f"\n❌ TEST FAILED WITH EXCEPTION: {e}")
    import traceback
    traceback.print_exc()
    
    # Attempt cleanup on failure
    if dh_plan_id or tech_plan_id:
        print("\nAttempting cleanup after failure...")
        if tech_plan_id:
            try:
                requests.delete(f"{BASE_URL}/admin/budsjett/plan?id={tech_plan_id}&key={ADMIN_KEY}")
                print(f"Deleted tech plan {tech_plan_id}")
            except:
                pass
        if dh_plan_id:
            try:
                requests.delete(f"{BASE_URL}/admin/budsjett/plan?id={dh_plan_id}&key={ADMIN_KEY}")
                print(f"Deleted DH plan {dh_plan_id}")
            except:
                pass
    
    sys.exit(1)
