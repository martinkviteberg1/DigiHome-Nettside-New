#!/usr/bin/env python3
"""
Backend test for KPI drill-down + new KPI fields + FINN provenance filter.
Tests the 11 scenarios from agent_communication in test_result.md.
"""

import requests
import json
import sys
from typing import Dict, Any, List

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_scenario_1_new_kpi_fields():
    """
    Scenario 1: Verify new fields in /admin/kpi exist and regression check.
    """
    print("\n=== SCENARIO 1: NEW FIELDS IN /admin/kpi ===")
    
    try:
        # Get KPI data
        r = requests.get(f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=90", timeout=30)
        print(f"GET /admin/kpi?days=90: {r.status_code}")
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        # Check new fields exist
        new_fields_checks = []
        
        # hero.ltvCacContracted
        if 'hero' in data and 'ltvCacContracted' in data['hero']:
            ltv_contr = data['hero']['ltvCacContracted']
            has_keys = all(k in ltv_contr for k in ['value', 'ltv', 'cac', 'monthlyFee', 'customersWithLease'])
            new_fields_checks.append(('hero.ltvCacContracted', has_keys))
            print(f"  hero.ltvCacContracted: {ltv_contr}")
        else:
            new_fields_checks.append(('hero.ltvCacContracted', False))
        
        # hero.timeToWin.sampleSize
        if 'hero' in data and 'timeToWin' in data['hero'] and 'sampleSize' in data['hero']['timeToWin']:
            new_fields_checks.append(('hero.timeToWin.sampleSize', True))
            print(f"  hero.timeToWin.sampleSize: {data['hero']['timeToWin']['sampleSize']}")
        else:
            new_fields_checks.append(('hero.timeToWin.sampleSize', False))
        
        # hero.conversionRate.basis
        if 'hero' in data and 'conversionRate' in data['hero'] and 'basis' in data['hero']['conversionRate']:
            basis = data['hero']['conversionRate']['basis']
            has_keys = all(k in basis for k in ['customers', 'leads', 'prevCustomers', 'prevLeads'])
            new_fields_checks.append(('hero.conversionRate.basis', has_keys))
            print(f"  hero.conversionRate.basis: {basis}")
        else:
            new_fields_checks.append(('hero.conversionRate.basis', False))
        
        # metrics.responseHours.count
        if 'metrics' in data and 'responseHours' in data['metrics'] and 'count' in data['metrics']['responseHours']:
            new_fields_checks.append(('metrics.responseHours.count', True))
            print(f"  metrics.responseHours.count: {data['metrics']['responseHours']['count']}")
        else:
            new_fields_checks.append(('metrics.responseHours.count', False))
        
        # metrics.paybackMonths.basis
        if 'metrics' in data and 'paybackMonths' in data['metrics'] and 'basis' in data['metrics']['paybackMonths']:
            basis = data['metrics']['paybackMonths']['basis']
            has_keys = all(k in basis for k in ['mode', 'cac', 'monthlyFee', 'marginPct', 'monthlyGrossProfit', 'waitMonths'])
            new_fields_checks.append(('metrics.paybackMonths.basis', has_keys))
            print(f"  metrics.paybackMonths.basis: {basis}")
        else:
            new_fields_checks.append(('metrics.paybackMonths.basis', False))
        
        # metrics.spend.campaigns
        if 'metrics' in data and 'spend' in data['metrics'] and 'campaigns' in data['metrics']['spend']:
            new_fields_checks.append(('metrics.spend.campaigns', True))
            print(f"  metrics.spend.campaigns: {len(data['metrics']['spend']['campaigns'])} campaigns")
        else:
            new_fields_checks.append(('metrics.spend.campaigns', False))
        
        # drill fields
        if 'drill' in data:
            drill = data['drill']
            has_won = 'wonInPeriod' in drill and isinstance(drill['wonInPeriod'], list)
            has_total = 'wonInPeriodTotal' in drill
            has_campaigns = 'campaigns' in drill
            has_sources = 'spendSources' in drill
            new_fields_checks.append(('drill.wonInPeriod', has_won))
            new_fields_checks.append(('drill.wonInPeriodTotal', has_total))
            new_fields_checks.append(('drill.campaigns', has_campaigns))
            new_fields_checks.append(('drill.spendSources', has_sources))
            print(f"  drill.wonInPeriod: {len(drill.get('wonInPeriod', []))} items")
            print(f"  drill.wonInPeriodTotal: {drill.get('wonInPeriodTotal')}")
        else:
            new_fields_checks.append(('drill', False))
        
        # revenueModel.tiers.potential.customers and withEstimate
        if 'revenueModel' in data and 'tiers' in data['revenueModel'] and 'potential' in data['revenueModel']['tiers']:
            pot = data['revenueModel']['tiers']['potential']
            has_customers = 'customers' in pot
            has_with_est = 'withEstimate' in pot
            new_fields_checks.append(('revenueModel.tiers.potential.customers', has_customers))
            new_fields_checks.append(('revenueModel.tiers.potential.withEstimate', has_with_est))
            print(f"  revenueModel.tiers.potential.customers: {pot.get('customers')}")
            print(f"  revenueModel.tiers.potential.withEstimate: {pot.get('withEstimate')}")
        else:
            new_fields_checks.append(('revenueModel.tiers.potential', False))
        
        # REGRESSION: Check that existing fields are unchanged
        print("\n  REGRESSION CHECKS:")
        regression_checks = []
        
        # hero.ltvCac.value should exist
        if 'hero' in data and 'ltvCac' in data['hero'] and 'value' in data['hero']['ltvCac']:
            regression_checks.append(('hero.ltvCac.value exists', True))
            print(f"  hero.ltvCac.value: {data['hero']['ltvCac']['value']}")
        else:
            regression_checks.append(('hero.ltvCac.value exists', False))
        
        # hero.ltv.value should exist
        if 'hero' in data and 'ltv' in data['hero'] and 'value' in data['hero']['ltv']:
            regression_checks.append(('hero.ltv.value exists', True))
            print(f"  hero.ltv.value: {data['hero']['ltv']['value']}")
        else:
            regression_checks.append(('hero.ltv.value exists', False))
        
        # metrics.mrr should exist (if revenueModel has data)
        if 'revenueModel' in data and 'mrr' in data['revenueModel'] and 'actual' in data['revenueModel']['mrr']:
            regression_checks.append(('revenueModel.mrr.actual exists', True))
            print(f"  revenueModel.mrr.actual: {data['revenueModel']['mrr']['actual']}")
        else:
            regression_checks.append(('revenueModel.mrr.actual exists', False))
        
        # revenueModel.tiers.actual.count should exist
        if 'revenueModel' in data and 'tiers' in data['revenueModel'] and 'actual' in data['revenueModel']['tiers'] and 'count' in data['revenueModel']['tiers']['actual']:
            regression_checks.append(('revenueModel.tiers.actual.count exists', True))
            print(f"  revenueModel.tiers.actual.count: {data['revenueModel']['tiers']['actual']['count']}")
        else:
            regression_checks.append(('revenueModel.tiers.actual.count exists', False))
        
        # Check that ltvCacContracted.ltv >= ltvCac.ltv (contracted includes realized)
        if 'hero' in data and 'ltvCacContracted' in data['hero'] and 'ltvCac' in data['hero']:
            ltv_contr_val = data['hero']['ltvCacContracted'].get('ltv')
            ltv_val = data['hero']['ltvCac'].get('ltv')
            if ltv_contr_val is not None and ltv_val is not None:
                is_gte = ltv_contr_val >= ltv_val
                regression_checks.append(('ltvCacContracted.ltv >= ltvCac.ltv', is_gte))
                print(f"  ltvCacContracted.ltv ({ltv_contr_val}) >= ltvCac.ltv ({ltv_val}): {is_gte}")
            else:
                regression_checks.append(('ltvCacContracted.ltv >= ltvCac.ltv', False))
        
        # Print summary
        all_new_passed = all(check[1] for check in new_fields_checks)
        all_regression_passed = all(check[1] for check in regression_checks)
        
        print(f"\n  New fields: {sum(1 for c in new_fields_checks if c[1])}/{len(new_fields_checks)} passed")
        print(f"  Regression: {sum(1 for c in regression_checks if c[1])}/{len(regression_checks)} passed")
        
        if all_new_passed and all_regression_passed:
            print("✅ PASS: All new fields exist and regression checks passed")
            return True
        else:
            print("❌ FAIL: Some checks failed")
            for name, passed in new_fields_checks + regression_checks:
                if not passed:
                    print(f"    - {name}")
            return False
    
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_scenario_2_drill_all_metrics():
    """
    Scenario 2: Test all 21 drill metrics return 200 with correct structure.
    """
    print("\n=== SCENARIO 2: DRILL ENDPOINT - ALL METRICS ===")
    
    metrics = [
        'mrr_actual', 'mrr_contracted', 'mrr_potential', 'at_risk', 'ltv', 'ltv_cac',
        'ltv_cac_contracted', 'payback', 'activation', 'time_to_rent', 'total_customers',
        'cac', 'new_customers', 'revenue', 'ttw', 'avg_value', 'conv', 'cpl',
        'new_leads', 'pipeline_value', 'tenant_demand'
    ]
    
    results = []
    
    for metric in metrics:
        try:
            r = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric={metric}&days=90", timeout=30)
            
            if r.status_code != 200:
                print(f"  {metric}: ❌ {r.status_code}")
                results.append((metric, False))
                continue
            
            data = r.json()
            if not data.get('ok'):
                print(f"  {metric}: ❌ ok=false")
                results.append((metric, False))
                continue
            
            # Check required fields
            required = ['metric', 'kind', 'title', 'columns', 'totals', 'groups']
            missing = [f for f in required if f not in data]
            
            if missing:
                print(f"  {metric}: ❌ missing fields: {missing}")
                results.append((metric, False))
                continue
            
            # Check totals structure
            if 'totals' in data:
                totals = data['totals']
                if 'groups' not in totals or 'rows' not in totals:
                    print(f"  {metric}: ❌ totals missing groups/rows")
                    results.append((metric, False))
                    continue
            
            print(f"  {metric}: ✅ {data.get('kind')} - {data['totals'].get('groups')} groups, {data['totals'].get('rows')} rows")
            results.append((metric, True))
        
        except Exception as e:
            print(f"  {metric}: ❌ Exception: {e}")
            results.append((metric, False))
    
    passed = sum(1 for _, ok in results if ok)
    print(f"\n  {passed}/{len(metrics)} metrics passed")
    
    if passed == len(metrics):
        print("✅ PASS: All 21 metrics return 200 with correct structure")
        return True
    else:
        print("❌ FAIL: Some metrics failed")
        return False


def test_scenario_3_customer_unit_structure():
    """
    Scenario 3: Test mrr_actual structure and consistency with /admin/kpi.
    """
    print("\n=== SCENARIO 3: CUSTOMER→UNIT STRUCTURE ===")
    
    try:
        # Get KPI data first for comparison
        r_kpi = requests.get(f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=90", timeout=30)
        if r_kpi.status_code != 200:
            print(f"❌ FAIL: Could not get KPI data: {r_kpi.status_code}")
            return False
        
        kpi_data = r_kpi.json()
        kpi_mrr_actual = kpi_data.get('revenueModel', {}).get('mrr', {}).get('actual')
        
        # Get drill data
        r = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=mrr_actual&days=90", timeout=30)
        print(f"GET /admin/kpi/drill?metric=mrr_actual: {r.status_code}")
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        
        # Check kind
        if data.get('kind') != 'leases_actual':
            print(f"❌ FAIL: Expected kind='leases_actual', got '{data.get('kind')}'")
            return False
        
        print(f"  kind: {data['kind']} ✓")
        
        # Check totals
        totals = data.get('totals', {})
        print(f"  totals.groups: {totals.get('groups')}")
        print(f"  totals.rows: {totals.get('rows')}")
        print(f"  totals.amount: {totals.get('amount')} {totals.get('amountUnit')}")
        
        # Check consistency with KPI
        drill_amount = totals.get('amount')
        if kpi_mrr_actual is not None and drill_amount is not None:
            diff = abs(drill_amount - kpi_mrr_actual)
            is_consistent = diff < 0.5  # Allow 0.5 kr rounding difference
            print(f"  KPI mrr.actual: {kpi_mrr_actual}")
            print(f"  Drill totals.amount: {drill_amount}")
            print(f"  Difference: {diff} kr")
            
            if not is_consistent:
                print(f"❌ FAIL: Amounts not consistent (diff={diff})")
                return False
            print(f"  Consistency check: ✓")
        
        # Check groups structure
        groups = data.get('groups', [])
        if not groups:
            print(f"❌ FAIL: No groups returned")
            return False
        
        print(f"\n  Groups ({len(groups)}):")
        expected_names = ['Frank Dale', 'Martin Kviteberg', 'Eva Strand']
        found_names = []
        
        for i, group in enumerate(groups[:5]):  # Check first 5
            name = group.get('name', '')
            amount = group.get('amount')
            subtitle = group.get('subtitle', '')
            rows = group.get('rows', [])
            
            print(f"    {i+1}. {name}: {amount} kr/mnd - {len(rows)} enheter")
            print(f"       {subtitle}")
            
            found_names.append(name)
            
            # Check group structure
            if not all(k in group for k in ['key', 'name', 'amount', 'amountUnit', 'subtitle', 'meta', 'rows']):
                print(f"❌ FAIL: Group missing required fields")
                return False
            
            # Check rows structure
            for j, row in enumerate(rows[:2]):  # Check first 2 rows
                required_row_fields = ['address', 'unitInfo', 'tenant', 'monthlyRent', 'feePercent', 'fee', 'period', 'tier', 'tierLabel']
                missing = [f for f in required_row_fields if f not in row]
                if missing:
                    print(f"❌ FAIL: Row missing fields: {missing}")
                    return False
                
                if row.get('tier') != 'actual':
                    print(f"❌ FAIL: Expected tier='actual', got '{row.get('tier')}'")
                    return False
                
                if j == 0:  # Print first row details
                    print(f"       Row 1: {row.get('address')} - {row.get('fee')} kr/mnd")
        
        # Check that customer names come from platform_customers (not addresses)
        has_expected_names = any(name in found_names for name in expected_names)
        if has_expected_names:
            print(f"  Customer names from platform_customers: ✓")
        else:
            print(f"  WARNING: Expected customer names not found. Found: {found_names[:3]}")
        
        # Check sum of fees equals totals.amount
        total_fee_sum = sum(
            sum(row.get('fee', 0) for row in group.get('rows', []))
            for group in groups
        )
        diff = abs(total_fee_sum - drill_amount)
        if diff < 0.5:
            print(f"  Sum of fees ({total_fee_sum}) matches totals.amount ({drill_amount}): ✓")
        else:
            print(f"❌ FAIL: Sum of fees ({total_fee_sum}) != totals.amount ({drill_amount}), diff={diff}")
            return False
        
        print("✅ PASS: Customer→unit structure correct and consistent")
        return True
    
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_scenario_4_tier_separation():
    """
    Scenario 4: Test tier separation - contracted and potential should not mix with actual.
    """
    print("\n=== SCENARIO 4: TIER SEPARATION ===")
    
    try:
        # Get KPI data for comparison
        r_kpi = requests.get(f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=90", timeout=30)
        kpi_data = r_kpi.json() if r_kpi.status_code == 200 else {}
        kpi_mrr = kpi_data.get('revenueModel', {}).get('mrr', {})
        
        # Test mrr_contracted
        r_contr = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=mrr_contracted&days=90", timeout=30)
        print(f"GET /admin/kpi/drill?metric=mrr_contracted: {r_contr.status_code}")
        
        if r_contr.status_code != 200:
            print(f"❌ FAIL: mrr_contracted returned {r_contr.status_code}")
            return False
        
        contr_data = r_contr.json()
        contr_totals = contr_data.get('totals', {})
        contr_amount = contr_totals.get('amount')
        
        print(f"  mrr_contracted totals.amount: {contr_amount}")
        print(f"  KPI mrr.contracted: {kpi_mrr.get('contracted')}")
        
        # Check all rows are tier='contracted'
        contr_groups = contr_data.get('groups', [])
        for group in contr_groups:
            for row in group.get('rows', []):
                if row.get('tier') != 'contracted':
                    print(f"❌ FAIL: mrr_contracted has row with tier='{row.get('tier')}'")
                    return False
        
        print(f"  All rows have tier='contracted': ✓")
        
        # Check consistency with KPI
        if kpi_mrr.get('contracted') is not None and contr_amount is not None:
            diff = abs(contr_amount - kpi_mrr['contracted'])
            if diff < 0.5:
                print(f"  Consistency with KPI: ✓ (diff={diff})")
            else:
                print(f"❌ FAIL: Inconsistent with KPI (diff={diff})")
                return False
        
        # Test mrr_potential
        r_pot = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=mrr_potential&days=90", timeout=30)
        print(f"\nGET /admin/kpi/drill?metric=mrr_potential: {r_pot.status_code}")
        
        if r_pot.status_code != 200:
            print(f"❌ FAIL: mrr_potential returned {r_pot.status_code}")
            return False
        
        pot_data = r_pot.json()
        pot_totals = pot_data.get('totals', {})
        pot_amount = pot_totals.get('amount')
        
        print(f"  mrr_potential totals.amount: {pot_amount}")
        print(f"  KPI mrr.potential: {kpi_mrr.get('potential')}")
        
        # Check all rows are tier='potential'
        pot_groups = pot_data.get('groups', [])
        for group in pot_groups:
            for row in group.get('rows', []):
                if row.get('tier') != 'potential':
                    print(f"❌ FAIL: mrr_potential has row with tier='{row.get('tier')}'")
                    return False
        
        print(f"  All rows have tier='potential': ✓")
        
        # Check consistency with KPI
        if kpi_mrr.get('potential') is not None and pot_amount is not None:
            diff = abs(pot_amount - kpi_mrr['potential'])
            if diff < 0.5:
                print(f"  Consistency with KPI: ✓ (diff={diff})")
            else:
                print(f"❌ FAIL: Inconsistent with KPI (diff={diff})")
                return False
        
        # Test mrr_actual does NOT contain potential rows
        r_actual = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=mrr_actual&days=90", timeout=30)
        actual_data = r_actual.json() if r_actual.status_code == 200 else {}
        actual_groups = actual_data.get('groups', [])
        
        for group in actual_groups:
            for row in group.get('rows', []):
                if row.get('tier') == 'potential':
                    print(f"❌ FAIL: mrr_actual contains potential row!")
                    return False
        
        print(f"\n  mrr_actual does NOT contain potential rows: ✓")
        
        print("✅ PASS: Tier separation correct")
        return True
    
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_scenario_5_unit_matching():
    """
    Scenario 5: Test unit matching and coverage.
    """
    print("\n=== SCENARIO 5: UNIT MATCHING ===")
    
    try:
        r = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=mrr_actual&days=90", timeout=30)
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        
        # Check unitCoverage
        if 'unitCoverage' not in data:
            print(f"❌ FAIL: unitCoverage field missing")
            return False
        
        coverage = data['unitCoverage']
        print(f"  unitCoverage:")
        print(f"    rows: {coverage.get('rows')}")
        print(f"    matched: {coverage.get('matched')}")
        print(f"    ambiguous: {coverage.get('ambiguous')}")
        print(f"    unmatched: {coverage.get('unmatched')}")
        print(f"    portfolioUnits: {coverage.get('portfolioUnits')}")
        
        if coverage.get('portfolioUnits') != 22:
            print(f"❌ FAIL: Expected portfolioUnits=22, got {coverage.get('portfolioUnits')}")
            return False
        
        print(f"  portfolioUnits=22: ✓")
        
        # Check unmatchedUnits
        if 'unmatchedUnitsTotal' not in data:
            print(f"❌ FAIL: unmatchedUnitsTotal field missing")
            return False
        
        unmatched_total = data['unmatchedUnitsTotal']
        print(f"  unmatchedUnitsTotal: {unmatched_total}")
        
        if unmatched_total > 0:
            if 'unmatchedUnits' not in data:
                print(f"❌ FAIL: unmatchedUnits array missing")
                return False
            
            unmatched = data['unmatchedUnits']
            print(f"  unmatchedUnits: {len(unmatched)} items (showing first 3):")
            
            for i, unit in enumerate(unmatched[:3]):
                required_fields = ['address', 'unitInfo', 'owner', 'tenant', 'rentAmount', 'unitStatus', 'imageCount']
                missing = [f for f in required_fields if f not in unit]
                
                if missing:
                    print(f"❌ FAIL: Unmatched unit missing fields: {missing}")
                    return False
                
                print(f"    {i+1}. {unit.get('address')} - {unit.get('unitStatus')} - {unit.get('imageCount')} images")
            
            print(f"  unmatchedUnits structure: ✓")
        
        print("✅ PASS: Unit matching and coverage correct")
        return True
    
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_scenario_6_lead_based_metrics():
    """
    Scenario 6: Test lead-based metrics (cac, new_leads, tenant_demand).
    """
    print("\n=== SCENARIO 6: LEAD-BASED METRICS ===")
    
    try:
        # Get KPI data for comparison
        r_kpi = requests.get(f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=90", timeout=30)
        kpi_data = r_kpi.json() if r_kpi.status_code == 200 else {}
        new_customers = kpi_data.get('metrics', {}).get('newCustomers', {}).get('value')
        
        # Test cac metric
        r_cac = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=cac&days=90", timeout=30)
        print(f"GET /admin/kpi/drill?metric=cac: {r_cac.status_code}")
        
        if r_cac.status_code != 200:
            print(f"❌ FAIL: cac returned {r_cac.status_code}")
            return False
        
        cac_data = r_cac.json()
        
        if cac_data.get('kind') != 'leads_won':
            print(f"❌ FAIL: Expected kind='leads_won', got '{cac_data.get('kind')}'")
            return False
        
        print(f"  cac kind: {cac_data['kind']} ✓")
        
        cac_groups = cac_data.get('groups', [])
        cac_totals = cac_data.get('totals', {})
        
        print(f"  cac totals.groups: {cac_totals.get('groups')}")
        print(f"  KPI newCustomers: {new_customers}")
        
        # Check that groups count matches newCustomers (same window)
        if new_customers is not None and cac_totals.get('groups') is not None:
            if cac_totals['groups'] == new_customers:
                print(f"  Groups count matches newCustomers: ✓")
            else:
                print(f"  WARNING: Groups count ({cac_totals['groups']}) != newCustomers ({new_customers})")
        
        # Check group structure
        if cac_groups:
            group = cac_groups[0]
            meta = group.get('meta', [])
            
            # Check for 'Kanal' and 'Registrert verdi' in meta
            has_channel = any('Kanal' in str(m.get('l', '')) for m in meta)
            has_value = any('Registrert verdi' in str(m.get('l', '')) for m in meta)
            
            print(f"  First group meta has 'Kanal': {has_channel}")
            print(f"  First group meta has 'Registrert verdi': {has_value}")
            
            if not (has_channel and has_value):
                print(f"❌ FAIL: Missing expected meta fields")
                return False
        
        # Test new_leads metric
        r_leads = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=new_leads&days=90", timeout=30)
        print(f"\nGET /admin/kpi/drill?metric=new_leads: {r_leads.status_code}")
        
        if r_leads.status_code != 200:
            print(f"❌ FAIL: new_leads returned {r_leads.status_code}")
            return False
        
        leads_data = r_leads.json()
        
        if leads_data.get('kind') != 'leads_period':
            print(f"❌ FAIL: Expected kind='leads_period', got '{leads_data.get('kind')}'")
            return False
        
        print(f"  new_leads kind: {leads_data['kind']} ✓")
        
        # Test tenant_demand metric
        r_tenant = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=tenant_demand&days=90", timeout=30)
        print(f"\nGET /admin/kpi/drill?metric=tenant_demand: {r_tenant.status_code}")
        
        if r_tenant.status_code != 200:
            print(f"❌ FAIL: tenant_demand returned {r_tenant.status_code}")
            return False
        
        tenant_data = r_tenant.json()
        
        if tenant_data.get('kind') != 'tenant_leads':
            print(f"❌ FAIL: Expected kind='tenant_leads', got '{tenant_data.get('kind')}'")
            return False
        
        print(f"  tenant_demand kind: {tenant_data['kind']} ✓")
        
        # Check columns
        columns = tenant_data.get('columns', [])
        expected_cols = ['name', 'preferred_area', 'budget', 'bedrooms', 'move_in_date', 'createdAt']
        col_keys = [c.get('key') for c in columns]
        
        missing_cols = [c for c in expected_cols if c not in col_keys]
        if missing_cols:
            print(f"❌ FAIL: tenant_demand missing columns: {missing_cols}")
            return False
        
        print(f"  tenant_demand columns: ✓")
        
        print("✅ PASS: Lead-based metrics correct")
        return True
    
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_scenario_7_window_parameters():
    """
    Scenario 7: Test window parameters (days and from/to).
    """
    print("\n=== SCENARIO 7: WINDOW PARAMETERS ===")
    
    try:
        # Test days=7 vs days=365
        r7 = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=cac&days=7", timeout=30)
        r365 = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=cac&days=365", timeout=30)
        
        print(f"GET /admin/kpi/drill?metric=cac&days=7: {r7.status_code}")
        print(f"GET /admin/kpi/drill?metric=cac&days=365: {r365.status_code}")
        
        if r7.status_code != 200 or r365.status_code != 200:
            print(f"❌ FAIL: One or both requests failed")
            return False
        
        data7 = r7.json()
        data365 = r365.json()
        
        groups7 = data7.get('totals', {}).get('groups', 0)
        groups365 = data365.get('totals', {}).get('groups', 0)
        
        print(f"  days=7: {groups7} groups")
        print(f"  days=365: {groups365} groups")
        
        if groups7 != groups365:
            print(f"  Group counts differ: ✓")
        else:
            print(f"  WARNING: Group counts are the same (may be expected if no data)")
        
        # Test from/to parameters
        r_range = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=cac&from=2026-01-01&to=2026-12-31", timeout=30)
        print(f"\nGET /admin/kpi/drill?metric=cac&from=2026-01-01&to=2026-12-31: {r_range.status_code}")
        
        if r_range.status_code != 200:
            print(f"❌ FAIL: from/to request failed")
            return False
        
        range_data = r_range.json()
        window = range_data.get('window', {})
        label = window.get('label', '')
        
        print(f"  window.label: {label}")
        
        if '2026-01-01' in label and '2026-12-31' in label:
            print(f"  Date range in label: ✓")
        else:
            print(f"❌ FAIL: Date range not in label")
            return False
        
        print("✅ PASS: Window parameters working")
        return True
    
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_scenario_8_error_handling():
    """
    Scenario 8: Test error handling.
    """
    print("\n=== SCENARIO 8: ERROR HANDLING ===")
    
    try:
        # Test invalid metric
        r_invalid = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=finnes_ikke&days=90", timeout=30)
        print(f"GET /admin/kpi/drill?metric=finnes_ikke: {r_invalid.status_code}")
        
        if r_invalid.status_code != 400:
            print(f"❌ FAIL: Expected 400, got {r_invalid.status_code}")
            return False
        
        invalid_data = r_invalid.json()
        if 'metrics' not in invalid_data:
            print(f"❌ FAIL: Response should contain 'metrics' list")
            return False
        
        print(f"  Invalid metric returns 400 with metrics list: ✓")
        print(f"  Available metrics: {len(invalid_data['metrics'])} items")
        
        # Test missing metric
        r_no_metric = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&days=90", timeout=30)
        print(f"\nGET /admin/kpi/drill (no metric): {r_no_metric.status_code}")
        
        if r_no_metric.status_code != 400:
            print(f"❌ FAIL: Expected 400, got {r_no_metric.status_code}")
            return False
        
        print(f"  Missing metric returns 400: ✓")
        
        # Test no key
        r_no_key = requests.get(f"{BASE_URL}/admin/kpi/drill?metric=mrr_actual&days=90", timeout=30)
        print(f"\nGET /admin/kpi/drill (no key): {r_no_key.status_code}")
        
        if r_no_key.status_code != 401:
            print(f"❌ FAIL: Expected 401, got {r_no_key.status_code}")
            return False
        
        print(f"  No key returns 401: ✓")
        
        # Test extreme days value (should not give 500)
        r_extreme = requests.get(f"{BASE_URL}/admin/kpi/drill?key={ADMIN_KEY}&metric=mrr_actual&days=99999", timeout=30)
        print(f"\nGET /admin/kpi/drill?days=99999: {r_extreme.status_code}")
        
        if r_extreme.status_code == 500:
            print(f"❌ FAIL: Extreme days value caused 500")
            return False
        
        print(f"  Extreme days value does not cause 500: ✓")
        
        print("✅ PASS: Error handling correct")
        return True
    
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def test_scenario_9_finn_provenance():
    """
    Scenario 9: Test FINN provenance filter in property-interest/lookup.
    """
    print("\n=== SCENARIO 9: FINN PROVENANCE FILTER ===")
    
    try:
        # Get properties to find ones with finnUrl and finnSource='plattform'
        r_props = requests.get(f"{BASE_URL}/admin/properties?key={ADMIN_KEY}", timeout=30)
        
        if r_props.status_code != 200:
            print(f"❌ FAIL: Could not get properties: {r_props.status_code}")
            return False
        
        props_data = r_props.json()
        properties = props_data.get('properties', [])
        
        # Find properties with finnUrl and finnSource='plattform'
        platform_finn_props = [
            p for p in properties
            if p.get('finnUrl') and p.get('finnSource') == 'plattform'
        ]
        
        print(f"  Found {len(platform_finn_props)} properties with finnSource='plattform'")
        
        if len(platform_finn_props) < 3:
            print(f"❌ FAIL: Need at least 3 properties with finnSource='plattform'")
            return False
        
        # Test specific properties mentioned in instructions
        test_ids = [
            '1169e968-453f-40fa-9e26-d0b6a1d1c5b9',  # NEDRE GARTNERGATEN
            '6189812a-ae20-4d07-98f6-7764845291bb',  # Wernersholmvegen
        ]
        
        # Add first platform property if not in test_ids
        if platform_finn_props:
            first_id = platform_finn_props[0].get('externalId') or platform_finn_props[0].get('id')
            if first_id and first_id not in test_ids:
                test_ids.append(first_id)
        
        results = []
        
        for prop_id in test_ids[:3]:  # Test at least 3
            r = requests.get(f"{BASE_URL}/newsletter/property-interest/lookup?property={prop_id}", timeout=30)
            print(f"\n  GET /newsletter/property-interest/lookup?property={prop_id[:8]}...")
            print(f"    Status: {r.status_code}")
            
            if r.status_code != 200:
                print(f"    ❌ Property not found or error")
                results.append(False)
                continue
            
            data = r.json()
            
            # Check finnUrl is null (platform-provided links should be hidden unless finnStatus='aktiv')
            finn_url = data.get('finnUrl')
            print(f"    finnUrl: {finn_url}")
            
            if finn_url is not None:
                print(f"    ❌ FAIL: finnUrl should be null for platform-provided links")
                results.append(False)
                continue
            
            # Check publicUrl is still present
            public_url = data.get('publicUrl')
            print(f"    publicUrl: {public_url is not None}")
            
            # Check PII fields are NOT present
            pii_fields = [
                'ownerName', 'tenantName', 'fullAddress', 'houseNumber', 'floor',
                'rooms', 'rentAmount', 'rentIsEstimate', 'unitStatus', 'buildingId',
                'postalCode', 'incomplete', 'missingFields', 'enrichedFields',
                'districtSource', 'unit', 'enrich'
            ]
            
            leaked_pii = [f for f in pii_fields if f in data]
            
            if leaked_pii:
                print(f"    ❌ FAIL: PII leaked: {leaked_pii}")
                results.append(False)
                continue
            
            print(f"    PII not leaked: ✓")
            print(f"    finnUrl=null for platform source: ✓")
            results.append(True)
        
        if all(results):
            print("\n✅ PASS: FINN provenance filter working correctly")
            return True
        else:
            print(f"\n❌ FAIL: Some properties failed ({sum(results)}/{len(results)} passed)")
            return False
    
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_scenario_10_manual_finn():
    """
    Scenario 10: Test manual FINN connection and cleanup.
    """
    print("\n=== SCENARIO 10: MANUAL FINN CONNECTION ===")
    
    try:
        # Get properties to find Wernersholmvegen
        r_props = requests.get(f"{BASE_URL}/admin/properties?key={ADMIN_KEY}", timeout=30)
        
        if r_props.status_code != 200:
            print(f"❌ FAIL: Could not get properties: {r_props.status_code}")
            return False
        
        props_data = r_props.json()
        properties = props_data.get('properties', [])
        
        # Find Wernersholmvegen property
        wernersholm_prop = None
        for p in properties:
            if 'Wernersholm' in (p.get('area') or ''):
                wernersholm_prop = p
                break
        
        if not wernersholm_prop:
            # Try by ID
            wernersholm_id = '6189812a-ae20-4d07-98f6-7764845291bb'
            wernersholm_prop = next((p for p in properties if p.get('externalId') == wernersholm_id or p.get('id') == wernersholm_id), None)
        
        if not wernersholm_prop:
            print(f"❌ FAIL: Could not find Wernersholmvegen property")
            return False
        
        prop_id = wernersholm_prop.get('externalId') or wernersholm_prop.get('id')
        print(f"  Found property: {wernersholm_prop.get('area')} (ID: {prop_id[:8]}...)")
        
        # Set manual FINN URL
        manual_url = 'https://www.finn.no/realestate/lettings/ad.html?finnkode=464252860'
        r_set = requests.post(
            f"{BASE_URL}/admin/properties/finn?key={ADMIN_KEY}",
            json={'id': prop_id, 'url': manual_url},
            timeout=30
        )
        
        print(f"\n  POST /admin/properties/finn (set manual URL): {r_set.status_code}")
        
        if r_set.status_code != 200:
            print(f"❌ FAIL: Could not set manual FINN URL: {r_set.status_code}")
            return False
        
        set_data = r_set.json()
        print(f"    Response: {set_data}")
        
        # Verify finnSource is now 'manuell'
        r_props2 = requests.get(f"{BASE_URL}/admin/properties?key={ADMIN_KEY}", timeout=30)
        props_data2 = r_props2.json()
        properties2 = props_data2.get('properties', [])
        
        updated_prop = next((p for p in properties2 if (p.get('externalId') == prop_id or p.get('id') == prop_id)), None)
        
        if not updated_prop:
            print(f"❌ FAIL: Could not find updated property")
            return False
        
        finn_source = updated_prop.get('finnSource')
        finn_url = updated_prop.get('finnUrl')
        finn_status = updated_prop.get('finnStatus')
        
        print(f"    finnSource: {finn_source}")
        print(f"    finnUrl: {finn_url}")
        print(f"    finnStatus: {finn_status}")
        
        if finn_source != 'manuell':
            print(f"❌ FAIL: Expected finnSource='manuell', got '{finn_source}'")
            return False
        
        if finn_url != manual_url:
            print(f"❌ FAIL: finnUrl not set correctly")
            return False
        
        print(f"  Manual FINN URL set: ✓")
        
        # Test lookup now returns finnUrl
        r_lookup = requests.get(f"{BASE_URL}/newsletter/property-interest/lookup?property={prop_id}", timeout=30)
        
        if r_lookup.status_code == 200:
            lookup_data = r_lookup.json()
            lookup_finn_url = lookup_data.get('finnUrl')
            
            print(f"\n  Lookup after manual set:")
            print(f"    finnUrl: {lookup_finn_url}")
            
            if lookup_finn_url:
                print(f"    Manual FINN URL visible in lookup: ✓")
            else:
                print(f"❌ FAIL: Manual FINN URL not visible in lookup")
                return False
        
        # CLEANUP: Remove FINN connection
        print(f"\n  CLEANUP: Removing FINN connection...")
        r_clear = requests.post(
            f"{BASE_URL}/admin/properties/finn?key={ADMIN_KEY}",
            json={'id': prop_id, 'url': ''},
            timeout=30
        )
        
        print(f"  POST /admin/properties/finn (clear URL): {r_clear.status_code}")
        
        if r_clear.status_code != 200:
            print(f"❌ FAIL: Could not clear FINN URL: {r_clear.status_code}")
            return False
        
        # Verify fallback to platform
        r_props3 = requests.get(f"{BASE_URL}/admin/properties?key={ADMIN_KEY}", timeout=30)
        props_data3 = r_props3.json()
        properties3 = props_data3.get('properties', [])
        
        final_prop = next((p for p in properties3 if (p.get('externalId') == prop_id or p.get('id') == prop_id)), None)
        
        if final_prop:
            final_source = final_prop.get('finnSource')
            print(f"    Final finnSource: {final_source}")
            
            if final_source == 'plattform':
                print(f"    Fell back to platform: ✓")
            else:
                print(f"    WARNING: finnSource is '{final_source}', expected 'plattform'")
        
        # Verify lookup now returns finnUrl=null again
        r_lookup2 = requests.get(f"{BASE_URL}/newsletter/property-interest/lookup?property={prop_id}", timeout=30)
        
        if r_lookup2.status_code == 200:
            lookup_data2 = r_lookup2.json()
            lookup_finn_url2 = lookup_data2.get('finnUrl')
            
            print(f"\n  Lookup after cleanup:")
            print(f"    finnUrl: {lookup_finn_url2}")
            
            if lookup_finn_url2 is None:
                print(f"    finnUrl=null after cleanup: ✓")
            else:
                print(f"❌ FAIL: finnUrl should be null after cleanup")
                return False
        
        print("\n✅ PASS: Manual FINN connection and cleanup working")
        return True
    
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_scenario_11_regression():
    """
    Scenario 11: Regression tests.
    """
    print("\n=== SCENARIO 11: REGRESSION ===")
    
    try:
        endpoints = [
            ('/admin/properties', 'GET'),
            ('/', 'GET'),
            ('/admin/newsletter/campaign?id=6783d667-c93e-45ca-a458-341f9d79acf5', 'GET'),
            ('/admin/kpi?days=30', 'GET'),
        ]
        
        results = []
        
        for path, method in endpoints:
            url = f"{BASE_URL}{path}"
            if '?' in path:
                url += f"&key={ADMIN_KEY}"
            else:
                url += f"?key={ADMIN_KEY}" if path != '/' else ''
            
            r = requests.get(url, timeout=30)
            status_ok = r.status_code == 200
            
            print(f"  {method} {path}: {r.status_code} {'✓' if status_ok else '❌'}")
            results.append(status_ok)
        
        if all(results):
            print("\n✅ PASS: All regression tests passed")
            return True
        else:
            print(f"\n❌ FAIL: Some regression tests failed ({sum(results)}/{len(results)} passed)")
            return False
    
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def verify_final_state():
    """
    Verify final state: 0 properties with finnSource='manuell'.
    """
    print("\n=== FINAL STATE VERIFICATION ===")
    
    try:
        r = requests.get(f"{BASE_URL}/admin/properties?key={ADMIN_KEY}", timeout=30)
        
        if r.status_code != 200:
            print(f"❌ FAIL: Could not get properties: {r.status_code}")
            return False
        
        data = r.json()
        properties = data.get('properties', [])
        
        manual_count = sum(1 for p in properties if p.get('finnSource') == 'manuell')
        
        print(f"  Total properties: {len(properties)}")
        print(f"  Properties with finnSource='manuell': {manual_count}")
        
        if manual_count == 0:
            print("  ✓ No properties with finnSource='manuell'")
            return True
        else:
            print(f"  ❌ Found {manual_count} properties with finnSource='manuell'")
            return False
    
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return False


def main():
    print("=" * 80)
    print("BACKEND TEST: KPI DRILL-DOWN + NEW KPI FIELDS + FINN PROVENANCE")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY[:10]}...")
    
    results = {}
    
    # Run all scenarios
    results['Scenario 1: New KPI fields'] = test_scenario_1_new_kpi_fields()
    results['Scenario 2: Drill all metrics'] = test_scenario_2_drill_all_metrics()
    results['Scenario 3: Customer→unit structure'] = test_scenario_3_customer_unit_structure()
    results['Scenario 4: Tier separation'] = test_scenario_4_tier_separation()
    results['Scenario 5: Unit matching'] = test_scenario_5_unit_matching()
    results['Scenario 6: Lead-based metrics'] = test_scenario_6_lead_based_metrics()
    results['Scenario 7: Window parameters'] = test_scenario_7_window_parameters()
    results['Scenario 8: Error handling'] = test_scenario_8_error_handling()
    results['Scenario 9: FINN provenance'] = test_scenario_9_finn_provenance()
    results['Scenario 10: Manual FINN'] = test_scenario_10_manual_finn()
    results['Scenario 11: Regression'] = test_scenario_11_regression()
    
    # Verify final state
    results['Final state verification'] = verify_final_state()
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} scenarios passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} TEST(S) FAILED")
        return 1


if __name__ == '__main__':
    sys.exit(main())
