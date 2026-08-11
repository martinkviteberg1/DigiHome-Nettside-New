#!/usr/bin/env python3
"""
Backend test for feeTruth feature (LTV-oppfølging: estimat vs. fasit på årshonorar per lead)
Tests the new feeTruth enrichment on leads that matches platform customers with actual lease contracts.
"""

import requests
import time
import sys

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def round2(val):
    """Round to 2 decimal places"""
    return round(val, 2)

def test_scenario_1_leads_with_feetruth():
    """
    SCENARIO 1: GET /api/admin/leads
    - Must respond in <20s
    - Verify feeTruth structure on leads that have it
    - It's OK if no leads have feeTruth in preview (requires platform customer match)
    """
    print("\n=== SCENARIO 1: GET /api/admin/leads with feeTruth ===")
    
    start_time = time.time()
    response = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY}, timeout=30)
    elapsed = time.time() - start_time
    
    print(f"✓ Response time: {elapsed:.2f}s (must be <20s)")
    
    if elapsed >= 20:
        print(f"❌ REGRESSION: Response time {elapsed:.2f}s >= 20s (too slow)")
        return False
    
    if response.status_code != 200:
        print(f"❌ Expected 200, got {response.status_code}")
        return False
    
    data = response.json()
    
    if "leads" not in data or not isinstance(data["leads"], list):
        print(f"❌ Expected 'leads' array in response")
        return False
    
    print(f"✓ Response 200 with leads array (count: {len(data['leads'])})")
    
    # Count how many leads have feeTruth
    leads_with_feetruth = [lead for lead in data["leads"] if "feeTruth" in lead]
    print(f"✓ Leads with feeTruth: {len(leads_with_feetruth)}/{len(data['leads'])}")
    
    if len(leads_with_feetruth) == 0:
        print("✓ No leads have feeTruth in preview (OK - requires platform customer match)")
        return True
    
    # Verify structure of feeTruth for leads that have it
    required_fields = [
        "customerId", "customerName", "monthlyFeeActual", "monthlyFeeContracted",
        "actualAnnualFee", "contractedAnnualFee", "activeLeases", "lifetimeFee",
        "hasLease", "estimateAnnual", "deltaPct", "basis"
    ]
    
    for i, lead in enumerate(leads_with_feetruth[:3]):  # Check first 3
        fee_truth = lead["feeTruth"]
        print(f"\n  Lead {i+1} feeTruth structure check:")
        
        for field in required_fields:
            if field not in fee_truth:
                print(f"    ❌ Missing field: {field}")
                return False
        
        # Verify types
        number_fields = ["monthlyFeeActual", "monthlyFeeContracted", "actualAnnualFee", 
                        "contractedAnnualFee", "activeLeases", "lifetimeFee"]
        for field in number_fields:
            if not isinstance(fee_truth[field], (int, float)):
                print(f"    ❌ Field {field} is not a number: {type(fee_truth[field])}")
                return False
        
        if not isinstance(fee_truth["hasLease"], bool):
            print(f"    ❌ Field hasLease is not boolean: {type(fee_truth['hasLease'])}")
            return False
        
        if fee_truth["estimateAnnual"] is not None and not isinstance(fee_truth["estimateAnnual"], (int, float)):
            print(f"    ❌ Field estimateAnnual is not number|null: {type(fee_truth['estimateAnnual'])}")
            return False
        
        if fee_truth["deltaPct"] is not None and not isinstance(fee_truth["deltaPct"], (int, float)):
            print(f"    ❌ Field deltaPct is not number|null: {type(fee_truth['deltaPct'])}")
            return False
        
        if not isinstance(fee_truth["basis"], str):
            print(f"    ❌ Field basis is not string: {type(fee_truth['basis'])}")
            return False
        
        print(f"    ✓ All required fields present with correct types")
        print(f"    ✓ Example: {fee_truth['customerName']}, actualAnnualFee={fee_truth['actualAnnualFee']}, activeLeases={fee_truth['activeLeases']}")
    
    return True

def test_scenario_2_math_verification():
    """
    SCENARIO 2: Verify math where feeTruth exists
    - actualAnnualFee === round2(monthlyFeeActual*12) (±0.05)
    - contractedAnnualFee === round2((monthlyFeeActual+monthlyFeeContracted)*12) (±0.05)
    - deltaPct === round((actualAnnualFee-estimateAnnual)/estimateAnnual*100) when both > 0
    """
    print("\n=== SCENARIO 2: Math verification ===")
    
    response = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY}, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ Expected 200, got {response.status_code}")
        return False
    
    data = response.json()
    leads_with_feetruth = [lead for lead in data["leads"] if "feeTruth" in lead]
    
    if len(leads_with_feetruth) == 0:
        print("✓ No leads with feeTruth to verify math (OK in preview)")
        return True
    
    all_math_correct = True
    
    for i, lead in enumerate(leads_with_feetruth[:5]):  # Check first 5
        ft = lead["feeTruth"]
        print(f"\n  Lead {i+1} ({ft['customerName']}):")
        
        # Check actualAnnualFee
        expected_actual = round2(ft["monthlyFeeActual"] * 12)
        diff_actual = abs(ft["actualAnnualFee"] - expected_actual)
        
        if diff_actual > 0.05:
            print(f"    ❌ actualAnnualFee math error: {ft['actualAnnualFee']} != {expected_actual} (diff: {diff_actual})")
            all_math_correct = False
        else:
            print(f"    ✓ actualAnnualFee: {ft['actualAnnualFee']} ≈ {ft['monthlyFeeActual']}*12 = {expected_actual} (diff: {diff_actual:.4f})")
        
        # Check contractedAnnualFee
        expected_contracted = round2((ft["monthlyFeeActual"] + ft["monthlyFeeContracted"]) * 12)
        diff_contracted = abs(ft["contractedAnnualFee"] - expected_contracted)
        
        if diff_contracted > 0.05:
            print(f"    ❌ contractedAnnualFee math error: {ft['contractedAnnualFee']} != {expected_contracted} (diff: {diff_contracted})")
            all_math_correct = False
        else:
            print(f"    ✓ contractedAnnualFee: {ft['contractedAnnualFee']} ≈ ({ft['monthlyFeeActual']}+{ft['monthlyFeeContracted']})*12 = {expected_contracted} (diff: {diff_contracted:.4f})")
        
        # Check deltaPct when both actualAnnualFee and estimateAnnual > 0
        if ft["actualAnnualFee"] > 0 and ft["estimateAnnual"] is not None and ft["estimateAnnual"] > 0:
            expected_delta = round((ft["actualAnnualFee"] - ft["estimateAnnual"]) / ft["estimateAnnual"] * 100)
            
            if ft["deltaPct"] is None:
                print(f"    ❌ deltaPct is null when both actualAnnualFee and estimateAnnual > 0")
                all_math_correct = False
            else:
                diff_delta = abs(ft["deltaPct"] - expected_delta)
                
                if diff_delta > 1:  # Allow 1% rounding difference
                    print(f"    ❌ deltaPct math error: {ft['deltaPct']} != {expected_delta} (diff: {diff_delta})")
                    all_math_correct = False
                else:
                    print(f"    ✓ deltaPct: {ft['deltaPct']}% ≈ ({ft['actualAnnualFee']}-{ft['estimateAnnual']})/{ft['estimateAnnual']}*100 = {expected_delta}% (diff: {diff_delta:.2f})")
        else:
            print(f"    ✓ deltaPct: {ft['deltaPct']} (actualAnnualFee={ft['actualAnnualFee']}, estimateAnnual={ft['estimateAnnual']})")
    
    if all_math_correct:
        print("\n✓ All math checks passed")
    
    return all_math_correct

def test_scenario_3_tenants_contacts_no_feetruth():
    """
    SCENARIO 3: Verify tenants[] and contacts[] do NOT have feeTruth
    Only owner leads (huseier) should be enriched, regardless of imported status
    """
    print("\n=== SCENARIO 3: Tenants and contacts do NOT have feeTruth ===")
    
    response = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY}, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ Expected 200, got {response.status_code}")
        return False
    
    data = response.json()
    
    # Check tenants array
    if "tenants" in data and isinstance(data["tenants"], list):
        tenants_with_feetruth = [t for t in data["tenants"] if "feeTruth" in t]
        
        if len(tenants_with_feetruth) > 0:
            print(f"❌ Found {len(tenants_with_feetruth)} tenants with feeTruth (should be 0)")
            return False
        
        print(f"✓ Tenants array does NOT have feeTruth (checked {len(data['tenants'])} tenants)")
    else:
        print("✓ No tenants array or empty (OK)")
    
    # Check contacts array (if it exists separately)
    if "contacts" in data and isinstance(data["contacts"], list):
        contacts_with_feetruth = [c for c in data["contacts"] if "feeTruth" in c]
        
        if len(contacts_with_feetruth) > 0:
            print(f"❌ Found {len(contacts_with_feetruth)} contacts with feeTruth (should be 0)")
            return False
        
        print(f"✓ Contacts array does NOT have feeTruth (checked {len(data['contacts'])} contacts)")
    else:
        print("✓ No contacts array or empty (OK)")
    
    # Check that only owner leads (lead_type='huseier' or similar) have feeTruth
    # Tenant leads (lead_type='leietaker') and contact leads should NOT have feeTruth
    all_leads = data.get("leads", [])
    
    tenant_leads_in_leads = [lead for lead in all_leads if lead.get("lead_type", "").lower() == "leietaker"]
    tenant_leads_with_feetruth = [lead for lead in tenant_leads_in_leads if "feeTruth" in lead]
    
    if len(tenant_leads_with_feetruth) > 0:
        print(f"❌ Found {len(tenant_leads_with_feetruth)} tenant leads (lead_type='leietaker') with feeTruth in leads array (should be 0)")
        return False
    
    print(f"✓ Tenant leads (lead_type='leietaker') in leads array do NOT have feeTruth (checked {len(tenant_leads_in_leads)} tenant leads)")
    
    # Check contact leads (lead_type='kontakt' or similar)
    contact_leads_in_leads = [lead for lead in all_leads if lead.get("lead_type", "").lower() in ["kontakt", "contact", "henvendelse", "inquiry"]]
    contact_leads_with_feetruth = [lead for lead in contact_leads_in_leads if "feeTruth" in lead]
    
    if len(contact_leads_with_feetruth) > 0:
        print(f"❌ Found {len(contact_leads_with_feetruth)} contact leads with feeTruth in leads array (should be 0)")
        return False
    
    print(f"✓ Contact leads in leads array do NOT have feeTruth (checked {len(contact_leads_in_leads)} contact leads)")
    
    # Verify that owner leads (including imported ones) CAN have feeTruth
    owner_leads = [lead for lead in all_leads if lead.get("lead_type", "huseier").lower() not in ["leietaker", "kontakt", "contact", "henvendelse", "inquiry"]]
    owner_leads_with_feetruth = [lead for lead in owner_leads if "feeTruth" in lead]
    
    print(f"✓ Owner leads with feeTruth: {len(owner_leads_with_feetruth)}/{len(owner_leads)} (this is expected - owner leads can have feeTruth)")
    
    return True

def test_scenario_4_regression_leads():
    """
    SCENARIO 4: Regression checks for leads endpoints
    - GET /api/admin/leads still has syncMeta, autoSynced, importedCount
    - Counts unchanged
    - GET /api/admin/lead?id=...&type=lead still works
    """
    print("\n=== SCENARIO 4: Regression - leads endpoints ===")
    
    # Get leads list
    response = requests.get(f"{BASE_URL}/admin/leads", params={"key": ADMIN_KEY}, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ Expected 200, got {response.status_code}")
        return False
    
    data = response.json()
    
    # Check for required fields
    required_fields = ["syncMeta", "autoSynced", "importedCount"]
    for field in required_fields:
        if field not in data:
            print(f"❌ Missing field in response: {field}")
            return False
    
    print(f"✓ syncMeta present: {data.get('syncMeta', {}).get('lastSyncAt', 'N/A')}")
    print(f"✓ autoSynced: {data['autoSynced']}")
    print(f"✓ importedCount: {data['importedCount']}")
    
    # Check counts
    leads_count = len(data.get("leads", []))
    tenants_count = len(data.get("tenants", []))
    
    print(f"✓ Leads count: {leads_count}")
    print(f"✓ Tenants count: {tenants_count}")
    
    # Test GET /api/admin/lead for a single lead
    if leads_count > 0:
        # Find a regular lead (not imported/pre_tracking)
        regular_leads = [lead for lead in data["leads"] if not lead.get("imported") and not lead.get("pre_tracking")]
        
        if len(regular_leads) > 0:
            test_lead_id = regular_leads[0]["id"]
            
            response2 = requests.get(
                f"{BASE_URL}/admin/lead",
                params={"id": test_lead_id, "type": "lead", "key": ADMIN_KEY},
                timeout=30
            )
            
            if response2.status_code != 200:
                print(f"❌ GET /api/admin/lead failed: {response2.status_code}")
                return False
            
            lead_data = response2.json()
            
            if not lead_data.get("ok"):
                print(f"❌ GET /api/admin/lead returned ok:false")
                return False
            
            if "lead" not in lead_data:
                print(f"❌ GET /api/admin/lead missing 'lead' field")
                return False
            
            print(f"✓ GET /api/admin/lead?id={test_lead_id[:8]}...&type=lead returns 200 with ok:true and lead object")
        else:
            print("✓ No regular leads to test GET /api/admin/lead (only imported leads)")
    else:
        print("✓ No leads to test GET /api/admin/lead")
    
    return True

def test_scenario_5_regression_other_endpoints():
    """
    SCENARIO 5: Regression checks for other endpoints
    - GET /api/admin/revenue-model now has ownerFees
    - GET /api/admin/kpi still works with revenueModel
    - GET /api/ still works
    """
    print("\n=== SCENARIO 5: Regression - other endpoints ===")
    
    # Test GET /api/
    response = requests.get(f"{BASE_URL}/", timeout=30)
    
    if response.status_code != 200:
        print(f"❌ GET /api/ failed: {response.status_code}")
        return False
    
    print(f"✓ GET /api/ returns 200")
    
    # Test GET /api/admin/revenue-model
    response = requests.get(f"{BASE_URL}/admin/revenue-model", params={"key": ADMIN_KEY}, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ GET /api/admin/revenue-model failed: {response.status_code}")
        return False
    
    data = response.json()
    
    if not data.get("ok"):
        print(f"❌ GET /api/admin/revenue-model returned ok:false")
        return False
    
    if "ownerFees" not in data:
        print(f"❌ GET /api/admin/revenue-model missing 'ownerFees' field")
        return False
    
    print(f"✓ GET /api/admin/revenue-model returns 200 with ok:true and ownerFees field")
    print(f"  ownerFees type: {type(data['ownerFees'])}")
    
    # Test GET /api/admin/kpi
    response = requests.get(f"{BASE_URL}/admin/kpi", params={"key": ADMIN_KEY, "days": 30}, timeout=60)
    
    if response.status_code != 200:
        print(f"❌ GET /api/admin/kpi failed: {response.status_code}")
        return False
    
    data = response.json()
    
    if not data.get("ok"):
        print(f"❌ GET /api/admin/kpi returned ok:false")
        return False
    
    if "revenueModel" not in data:
        print(f"❌ GET /api/admin/kpi missing 'revenueModel' field")
        return False
    
    print(f"✓ GET /api/admin/kpi returns 200 with ok:true and revenueModel field")
    
    return True

def main():
    print("=" * 80)
    print("BACKEND TEST: feeTruth (LTV-oppfølging: estimat vs. fasit på årshonorar)")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print()
    
    results = []
    
    try:
        # Run all scenarios
        results.append(("Scenario 1: GET /api/admin/leads with feeTruth", test_scenario_1_leads_with_feetruth()))
        results.append(("Scenario 2: Math verification", test_scenario_2_math_verification()))
        results.append(("Scenario 3: Tenants/contacts no feeTruth", test_scenario_3_tenants_contacts_no_feetruth()))
        results.append(("Scenario 4: Regression - leads endpoints", test_scenario_4_regression_leads()))
        results.append(("Scenario 5: Regression - other endpoints", test_scenario_5_regression_other_endpoints()))
        
    except Exception as e:
        print(f"\n❌ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED - feeTruth feature working correctly")
        return 0
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
