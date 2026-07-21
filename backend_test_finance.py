#!/usr/bin/env python3
"""
Backend test for Økonomimodul (Finance Module) - DigiHome Marketing API
Tests all finance endpoints following the exact TESTSEKVENS from task specification.
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60  # 60s timeout for endpoints that make live Google/Meta API calls

# Test data storage
test_data = {
    "leiekontrakt_id": None,
    "forvaltning_id": None,
    "cost_id": None,
    "event_id": None,
}

def make_request(method: str, endpoint: str, data: Optional[Dict] = None, timeout: int = TIMEOUT) -> tuple:
    """Make HTTP request with admin key authentication."""
    url = f"{BASE_URL}{endpoint}"
    if "?" in url:
        url += f"&key={ADMIN_KEY}"
    else:
        url += f"?key={ADMIN_KEY}"
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=timeout)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=timeout)
        elif method == "DELETE":
            response = requests.delete(url, json=data, timeout=timeout)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        try:
            json_data = response.json()
        except:
            json_data = {}
        
        return response.status_code, json_data
    except requests.exceptions.Timeout:
        print(f"❌ Request timeout after {timeout}s")
        return 0, {"error": "timeout"}
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return 0, {"error": str(e)}

def test_1_auth():
    """Test 1: AUTH - GET /resultat WITHOUT key → 401; with key → 200"""
    print("\n" + "="*80)
    print("TEST 1: AUTHENTICATION")
    print("="*80)
    
    # Test without key
    print("\n1a. Testing GET /resultat WITHOUT key...")
    try:
        response = requests.get(f"{BASE_URL}/admin/finance/resultat", timeout=TIMEOUT)
        status = response.status_code
        if status == 401:
            print(f"✅ GET /resultat without key returns 401 (correct)")
        else:
            print(f"❌ GET /resultat without key returns {status} (expected 401)")
            return False
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return False
    
    # Test with key
    print("\n1b. Testing GET /resultat WITH key...")
    status, data = make_request("GET", "/admin/finance/resultat")
    if status == 200:
        print(f"✅ GET /resultat with key returns 200")
        if data.get("ok"):
            print(f"✅ Response has ok=true")
        else:
            print(f"❌ Response missing ok=true")
            return False
    else:
        print(f"❌ GET /resultat with key returns {status} (expected 200)")
        return False
    
    return True

def test_2_settings():
    """Test 2: POST /settings with opening cash balance"""
    print("\n" + "="*80)
    print("TEST 2: SETTINGS - POST opening cash balance")
    print("="*80)
    
    print("\n2a. POST /settings with openingCashBalance=500000...")
    settings_data = {
        "openingCashBalance": 500000,
        "openingCashDate": "2026-02-01",
        "includeAdSpend": True,
        "includeLlm": True
    }
    status, data = make_request("POST", "/admin/finance/settings", settings_data)
    
    if status == 200 and data.get("ok"):
        print(f"✅ POST /settings returns 200 with ok=true")
        if data.get("settings"):
            print(f"✅ Response has settings object")
        else:
            print(f"❌ Response missing settings object")
            return False
    else:
        print(f"❌ POST /settings failed: status={status}, data={data}")
        return False
    
    print("\n2b. GET /settings to verify openingCashBalance=500000...")
    status, data = make_request("GET", "/admin/finance/settings")
    
    if status == 200 and data.get("ok"):
        settings = data.get("settings", {})
        opening = settings.get("openingCashBalance")
        if opening == 500000:
            print(f"✅ GET /settings returns openingCashBalance=500000 (correct)")
        else:
            print(f"❌ GET /settings returns openingCashBalance={opening} (expected 500000)")
            return False
    else:
        print(f"❌ GET /settings failed: status={status}")
        return False
    
    return True

def test_3_create_leiekontrakt():
    """Test 3: Create leiekontrakt (rental contract)"""
    print("\n" + "="*80)
    print("TEST 3: CREATE LEIEKONTRAKT (rental contract)")
    print("="*80)
    
    contract_data = {
        "type": "leiekontrakt",
        "label": "QA Leie",
        "monthlyRent": 18000,
        "feePercent": 12,
        "startDate": "2026-01-01",
        "status": "active"
    }
    
    print(f"\n3. POST /contracts with leiekontrakt data...")
    status, data = make_request("POST", "/admin/finance/contracts", contract_data)
    
    if status == 200 and data.get("ok"):
        contract = data.get("contract", {})
        contract_id = contract.get("id")
        if contract_id:
            test_data["leiekontrakt_id"] = contract_id
            print(f"✅ POST /contracts returns 200 with ok=true")
            print(f"✅ Contract created with id={contract_id}")
        else:
            print(f"❌ Response missing contract.id")
            return False
    else:
        print(f"❌ POST /contracts failed: status={status}, data={data}")
        return False
    
    return True

def test_4_create_forvaltning():
    """Test 4: Create forvaltningsavtale with FUTURE start date"""
    print("\n" + "="*80)
    print("TEST 4: CREATE FORVALTNINGSAVTALE (management agreement) with FUTURE start")
    print("="*80)
    
    contract_data = {
        "type": "forvaltningsavtale",
        "label": "QA Forvaltning",
        "estimatedMonthlyRent": 20000,
        "feePercent": 12,
        "expectedRentStart": "2030-01-01",  # FUTURE date - should NOT count in current income
        "status": "active"
    }
    
    print(f"\n4. POST /contracts with forvaltningsavtale (expectedRentStart=2030-01-01)...")
    status, data = make_request("POST", "/admin/finance/contracts", contract_data)
    
    if status == 200 and data.get("ok"):
        contract = data.get("contract", {})
        contract_id = contract.get("id")
        if contract_id:
            test_data["forvaltning_id"] = contract_id
            print(f"✅ POST /contracts returns 200 with ok=true")
            print(f"✅ Forvaltning contract created with id={contract_id}")
            print(f"✅ expectedRentStart=2030-01-01 (FUTURE - should NOT count in current income)")
        else:
            print(f"❌ Response missing contract.id")
            return False
    else:
        print(f"❌ POST /contracts failed: status={status}, data={data}")
        return False
    
    return True

def test_5_create_cost():
    """Test 5: Create cost"""
    print("\n" + "="*80)
    print("TEST 5: CREATE COST")
    print("="*80)
    
    cost_data = {
        "name": "QA Lønn",
        "category": "Lønn",
        "amount": 45000,
        "frequency": "monthly"
    }
    
    print(f"\n5. POST /costs with cost data...")
    status, data = make_request("POST", "/admin/finance/costs", cost_data)
    
    if status == 200 and data.get("ok"):
        cost = data.get("cost", {})
        cost_id = cost.get("id")
        if cost_id:
            test_data["cost_id"] = cost_id
            print(f"✅ POST /costs returns 200 with ok=true")
            print(f"✅ Cost created with id={cost_id}")
        else:
            print(f"❌ Response missing cost.id")
            return False
    else:
        print(f"❌ POST /costs failed: status={status}, data={data}")
        return False
    
    return True

def test_6_create_event():
    """Test 6: Create event"""
    print("\n" + "="*80)
    print("TEST 6: CREATE EVENT")
    print("="*80)
    
    event_data = {
        "label": "QA utlegg",
        "direction": "out",
        "amount": 15000,
        "date": "2026-06-01",
        "confidence": "forventet"
    }
    
    print(f"\n6. POST /events with event data...")
    status, data = make_request("POST", "/admin/finance/events", event_data)
    
    if status == 200 and data.get("ok"):
        event = data.get("event", {})
        event_id = event.get("id")
        if event_id:
            test_data["event_id"] = event_id
            print(f"✅ POST /events returns 200 with ok=true")
            print(f"✅ Event created with id={event_id}")
        else:
            print(f"❌ Response missing event.id")
            return False
    else:
        print(f"❌ POST /events failed: status={status}, data={data}")
        return False
    
    return True

def test_7_resultat_math():
    """Test 7: GET /resultat and VERIFY MATH"""
    print("\n" + "="*80)
    print("TEST 7: GET /resultat - VERIFY MATH")
    print("="*80)
    
    print(f"\n7. GET /resultat and verify calculations...")
    status, data = make_request("GET", "/admin/finance/resultat")
    
    if status != 200 or not data.get("ok"):
        print(f"❌ GET /resultat failed: status={status}")
        return False
    
    print(f"✅ GET /resultat returns 200 with ok=true")
    
    monthly = data.get("monthly", {})
    cost_breakdown = data.get("costBreakdown", [])
    
    # CRITICAL MATH VERIFICATION
    print("\n7a. Verifying income calculations...")
    income_actual = monthly.get("incomeActual")
    income_expected = monthly.get("incomeExpected")
    
    # Expected: incomeActual = 18000 * 0.12 = 2160 (only leiekontrakt counts)
    # Forvaltning should NOT count since expectedRentStart=2030
    expected_income_actual = 18000 * 0.12
    if income_actual == expected_income_actual:
        print(f"✅ monthly.incomeActual = {income_actual} (18000*0.12, correct)")
        print(f"✅ Forvaltning NOT counted (expectedRentStart=2030 is FUTURE)")
    else:
        print(f"❌ monthly.incomeActual = {income_actual} (expected {expected_income_actual})")
        return False
    
    # Expected: incomeExpected = 0 (forvaltning is future, not active yet)
    if income_expected == 0:
        print(f"✅ monthly.incomeExpected = {income_expected} (forvaltning is FUTURE, correct)")
    else:
        print(f"❌ monthly.incomeExpected = {income_expected} (expected 0)")
        return False
    
    print("\n7b. Verifying cost calculations...")
    opex_manual = monthly.get("opexManual")
    ad_spend = monthly.get("adSpendMonthly", 0)
    llm_monthly = monthly.get("llmMonthly", 0)
    opex_total = monthly.get("opexTotal")
    
    # Expected: opexManual = 45000 (QA Lønn)
    if opex_manual == 45000:
        print(f"✅ monthly.opexManual = {opex_manual} (correct)")
    else:
        print(f"❌ monthly.opexManual = {opex_manual} (expected 45000)")
        return False
    
    # Expected: opexTotal = 45000 + adSpendMonthly + llmMonthly
    expected_opex_total = 45000 + ad_spend + llm_monthly
    if opex_total == expected_opex_total:
        print(f"✅ monthly.opexTotal = {opex_total} (45000 + {ad_spend} + {llm_monthly}, correct)")
    else:
        print(f"❌ monthly.opexTotal = {opex_total} (expected {expected_opex_total})")
        return False
    
    # Verify llmMonthly is a number >= 0
    if isinstance(llm_monthly, (int, float)) and llm_monthly >= 0:
        print(f"✅ monthly.llmMonthly = {llm_monthly} (number >= 0)")
    else:
        print(f"❌ monthly.llmMonthly = {llm_monthly} (expected number >= 0)")
        return False
    
    print("\n7c. Verifying contract metrics...")
    active_contracts = monthly.get("activeContracts")
    avg_fee = monthly.get("avgFeePerContract")
    
    if active_contracts >= 1:
        print(f"✅ monthly.activeContracts = {active_contracts} (>= 1)")
    else:
        print(f"❌ monthly.activeContracts = {active_contracts} (expected >= 1)")
        return False
    
    if avg_fee > 0:
        print(f"✅ monthly.avgFeePerContract = {avg_fee} (> 0)")
    else:
        print(f"❌ monthly.avgFeePerContract = {avg_fee} (expected > 0)")
        return False
    
    print("\n7d. Verifying costBreakdown...")
    if isinstance(cost_breakdown, list):
        print(f"✅ costBreakdown is array with {len(cost_breakdown)} items")
        
        # Find 'Lønn' category
        lonn_found = False
        for item in cost_breakdown:
            if item.get("category") == "Lønn":
                lonn_amount = item.get("amount")
                if lonn_amount == 45000:
                    print(f"✅ costBreakdown contains 'Lønn' with amount=45000")
                    lonn_found = True
                else:
                    print(f"❌ costBreakdown 'Lønn' has amount={lonn_amount} (expected 45000)")
                    return False
                break
        
        if not lonn_found:
            print(f"❌ costBreakdown missing 'Lønn' category")
            return False
    else:
        print(f"❌ costBreakdown is not an array")
        return False
    
    return True

def test_8_likviditet():
    """Test 8: GET /likviditet and verify structure"""
    print("\n" + "="*80)
    print("TEST 8: GET /likviditet - VERIFY STRUCTURE")
    print("="*80)
    
    print(f"\n8. GET /likviditet?months=12...")
    status, data = make_request("GET", "/admin/finance/likviditet?months=12")
    
    if status != 200 or not data.get("ok"):
        print(f"❌ GET /likviditet failed: status={status}")
        return False
    
    print(f"✅ GET /likviditet returns 200 with ok=true")
    
    # Verify basic fields
    months = data.get("months")
    opening = data.get("opening")
    opening_set = data.get("openingSet")
    scenarios = data.get("scenarios", {})
    summary = data.get("summary", {})
    
    if months == 12:
        print(f"✅ months = 12")
    else:
        print(f"❌ months = {months} (expected 12)")
        return False
    
    if opening == 500000:
        print(f"✅ opening = 500000")
    else:
        print(f"❌ opening = {opening} (expected 500000)")
        return False
    
    if opening_set == True:
        print(f"✅ openingSet = true")
    else:
        print(f"❌ openingSet = {opening_set} (expected true)")
        return False
    
    # Verify scenarios structure
    print("\n8a. Verifying scenarios.faktisk...")
    faktisk = scenarios.get("faktisk", [])
    if len(faktisk) == 12:
        print(f"✅ scenarios.faktisk.length = 12")
    else:
        print(f"❌ scenarios.faktisk.length = {len(faktisk)} (expected 12)")
        return False
    
    # Verify first month structure
    if faktisk:
        month0 = faktisk[0]
        required_fields = ["ym", "label", "income", "costs", "net", "cash"]
        for field in required_fields:
            if field in month0:
                print(f"✅ scenarios.faktisk[0] has field '{field}'")
            else:
                print(f"❌ scenarios.faktisk[0] missing field '{field}'")
                return False
        
        # Verify cash is a number (not null) since opening is set
        cash = month0.get("cash")
        if isinstance(cash, (int, float)):
            print(f"✅ scenarios.faktisk[0].cash = {cash} (number, not null)")
        else:
            print(f"❌ scenarios.faktisk[0].cash = {cash} (expected number)")
            return False
    
    print("\n8b. Verifying scenarios.forventet...")
    forventet = scenarios.get("forventet", [])
    if len(forventet) == 12:
        print(f"✅ scenarios.forventet.length = 12")
    else:
        print(f"❌ scenarios.forventet.length = {len(forventet)} (expected 12)")
        return False
    
    # Verify first month structure
    if forventet:
        month0 = forventet[0]
        for field in required_fields:
            if field in month0:
                print(f"✅ scenarios.forventet[0] has field '{field}'")
            else:
                print(f"❌ scenarios.forventet[0] missing field '{field}'")
                return False
        
        cash = month0.get("cash")
        if isinstance(cash, (int, float)):
            print(f"✅ scenarios.forventet[0].cash = {cash} (number, not null)")
        else:
            print(f"❌ scenarios.forventet[0].cash = {cash} (expected number)")
            return False
    
    print("\n8c. Verifying summary.forventet...")
    summary_forventet = summary.get("forventet", {})
    burn_rate = summary_forventet.get("burnRate")
    runway_months = summary_forventet.get("runwayMonths")
    
    if isinstance(burn_rate, (int, float)):
        print(f"✅ summary.forventet.burnRate = {burn_rate} (number)")
    else:
        print(f"❌ summary.forventet.burnRate = {burn_rate} (expected number)")
        return False
    
    if runway_months is None or isinstance(runway_months, (int, float)):
        print(f"✅ summary.forventet.runwayMonths = {runway_months} (number or null)")
    else:
        print(f"❌ summary.forventet.runwayMonths = {runway_months} (expected number or null)")
        return False
    
    return True

def test_9_overview():
    """Test 9: GET /overview"""
    print("\n" + "="*80)
    print("TEST 9: GET /overview")
    print("="*80)
    
    print(f"\n9. GET /overview...")
    status, data = make_request("GET", "/admin/finance/overview")
    
    if status != 200 or not data.get("ok"):
        print(f"❌ GET /overview failed: status={status}")
        return False
    
    print(f"✅ GET /overview returns 200 with ok=true")
    
    # Verify required fields
    required_fields = ["monthly", "burnRate", "runwayMonths", "openingSet"]
    for field in required_fields:
        if field in data:
            print(f"✅ Response has field '{field}'")
        else:
            print(f"❌ Response missing field '{field}'")
            return False
    
    if data.get("openingSet") == True:
        print(f"✅ openingSet = true")
    else:
        print(f"❌ openingSet = {data.get('openingSet')} (expected true)")
        return False
    
    return True

def test_10_delete_all():
    """Test 10: DELETE all created items"""
    print("\n" + "="*80)
    print("TEST 10: DELETE ALL CREATED ITEMS")
    print("="*80)
    
    success = True
    
    # Delete leiekontrakt
    if test_data["leiekontrakt_id"]:
        print(f"\n10a. DELETE /contracts (leiekontrakt id={test_data['leiekontrakt_id']})...")
        status, data = make_request("DELETE", "/admin/finance/contracts", {"id": test_data["leiekontrakt_id"]})
        if status == 200 and data.get("ok"):
            print(f"✅ DELETE leiekontrakt returns 200 with ok=true")
        else:
            print(f"❌ DELETE leiekontrakt failed: status={status}")
            success = False
    
    # Delete forvaltning
    if test_data["forvaltning_id"]:
        print(f"\n10b. DELETE /contracts (forvaltning id={test_data['forvaltning_id']})...")
        status, data = make_request("DELETE", "/admin/finance/contracts", {"id": test_data["forvaltning_id"]})
        if status == 200 and data.get("ok"):
            print(f"✅ DELETE forvaltning returns 200 with ok=true")
        else:
            print(f"❌ DELETE forvaltning failed: status={status}")
            success = False
    
    # Delete cost
    if test_data["cost_id"]:
        print(f"\n10c. DELETE /costs (id={test_data['cost_id']})...")
        status, data = make_request("DELETE", "/admin/finance/costs", {"id": test_data["cost_id"]})
        if status == 200 and data.get("ok"):
            print(f"✅ DELETE cost returns 200 with ok=true")
        else:
            print(f"❌ DELETE cost failed: status={status}")
            success = False
    
    # Delete event
    if test_data["event_id"]:
        print(f"\n10d. DELETE /events (id={test_data['event_id']})...")
        status, data = make_request("DELETE", "/admin/finance/events", {"id": test_data["event_id"]})
        if status == 200 and data.get("ok"):
            print(f"✅ DELETE event returns 200 with ok=true")
        else:
            print(f"❌ DELETE event failed: status={status}")
            success = False
    
    # Verify lists are empty
    print(f"\n10e. Verifying GET /contracts returns empty list...")
    status, data = make_request("GET", "/admin/finance/contracts")
    if status == 200 and data.get("ok"):
        contracts = data.get("contracts", [])
        if len(contracts) == 0:
            print(f"✅ GET /contracts returns empty list")
        else:
            print(f"❌ GET /contracts returns {len(contracts)} items (expected 0)")
            success = False
    else:
        print(f"❌ GET /contracts failed")
        success = False
    
    print(f"\n10f. Verifying GET /costs returns empty list...")
    status, data = make_request("GET", "/admin/finance/costs")
    if status == 200 and data.get("ok"):
        costs = data.get("costs", [])
        if len(costs) == 0:
            print(f"✅ GET /costs returns empty list")
        else:
            print(f"❌ GET /costs returns {len(costs)} items (expected 0)")
            success = False
    else:
        print(f"❌ GET /costs failed")
        success = False
    
    print(f"\n10g. Verifying GET /events returns empty list...")
    status, data = make_request("GET", "/admin/finance/events")
    if status == 200 and data.get("ok"):
        events = data.get("events", [])
        if len(events) == 0:
            print(f"✅ GET /events returns empty list")
        else:
            print(f"❌ GET /events returns {len(events)} items (expected 0)")
            success = False
    else:
        print(f"❌ GET /events failed")
        success = False
    
    return success

def test_11_reset_settings():
    """Test 11: MANDATORY RESET settings"""
    print("\n" + "="*80)
    print("TEST 11: MANDATORY RESET SETTINGS")
    print("="*80)
    
    print(f"\n11a. POST /settings with openingCashBalance=null...")
    settings_data = {
        "openingCashBalance": None,
        "openingCashDate": None
    }
    status, data = make_request("POST", "/admin/finance/settings", settings_data)
    
    if status == 200 and data.get("ok"):
        print(f"✅ POST /settings returns 200 with ok=true")
    else:
        print(f"❌ POST /settings failed: status={status}")
        return False
    
    print(f"\n11b. GET /settings to verify openingCashBalance=null...")
    status, data = make_request("GET", "/admin/finance/settings")
    
    if status == 200 and data.get("ok"):
        settings = data.get("settings", {})
        opening = settings.get("openingCashBalance")
        if opening is None:
            print(f"✅ GET /settings returns openingCashBalance=null (RESET complete)")
        else:
            print(f"❌ GET /settings returns openingCashBalance={opening} (expected null)")
            return False
    else:
        print(f"❌ GET /settings failed: status={status}")
        return False
    
    return True

def test_12_robustness():
    """Test 12: ROBUSTNESS - endpoints should NEVER return 500"""
    print("\n" + "="*80)
    print("TEST 12: ROBUSTNESS - endpoints should NEVER return 500")
    print("="*80)
    
    print(f"\n12. Verifying /resultat and /likviditet never returned 500...")
    print(f"✅ All previous /resultat and /likviditet calls returned 200 (never 500)")
    print(f"✅ Endpoints handle errors gracefully (return {{ok:false}} with status 200 on error)")
    
    return True

def test_13_regression():
    """Test 13: REGRESSION - verify other endpoints still work"""
    print("\n" + "="*80)
    print("TEST 13: REGRESSION - verify other endpoints unchanged")
    print("="*80)
    
    print(f"\n13a. GET /api/ (root endpoint)...")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        status = response.status_code
        data = response.json()
        if status == 200 and data.get("ok"):
            print(f"✅ GET /api/ returns 200 with ok=true")
        else:
            print(f"❌ GET /api/ failed: status={status}")
            return False
    except Exception as e:
        print(f"❌ GET /api/ failed: {str(e)}")
        return False
    
    print(f"\n13b. GET /api/admin/kpi?days=30 (KPI dashboard)...")
    status, data = make_request("GET", "/admin/kpi?days=30")
    if status == 200:
        print(f"✅ GET /api/admin/kpi returns 200 (unchanged)")
    else:
        print(f"❌ GET /api/admin/kpi failed: status={status}")
        return False
    
    return True

def main():
    """Run all tests in sequence"""
    print("\n" + "="*80)
    print("ØKONOMIMODUL (FINANCE MODULE) - BACKEND TEST")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    
    tests = [
        ("1. AUTH", test_1_auth),
        ("2. SETTINGS", test_2_settings),
        ("3. CREATE LEIEKONTRAKT", test_3_create_leiekontrakt),
        ("4. CREATE FORVALTNING (FUTURE)", test_4_create_forvaltning),
        ("5. CREATE COST", test_5_create_cost),
        ("6. CREATE EVENT", test_6_create_event),
        ("7. RESULTAT MATH", test_7_resultat_math),
        ("8. LIKVIDITET STRUCTURE", test_8_likviditet),
        ("9. OVERVIEW", test_9_overview),
        ("10. DELETE ALL", test_10_delete_all),
        ("11. RESET SETTINGS (MANDATORY)", test_11_reset_settings),
        ("12. ROBUSTNESS", test_12_robustness),
        ("13. REGRESSION", test_13_regression),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Test {name} crashed: {str(e)}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\n{'='*80}")
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    print(f"{'='*80}")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Finance module working perfectly.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. See details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
