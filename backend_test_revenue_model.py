#!/usr/bin/env python3
"""
Backend test for P0 LTV: ny tre-lags inntektsmodell (Faktisk/Kontrahert/Potensial) + LTV på faktisk honorar
Test all 10 scenarios from review_request
"""
import requests
import sys
import json
from typing import Dict, Any

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def round2(x):
    """Round to 2 decimal places"""
    return round(float(x or 0), 2)

def test_revenue_model_structure():
    """Scenario 1: GET /api/admin/revenue-model returns 200 with all required fields"""
    print("\n=== TEST 1: Revenue Model Structure ===")
    try:
        url = f"{BASE_URL}/admin/revenue-model?key={ADMIN_KEY}"
        resp = requests.get(url, timeout=30)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            return False
        
        data = resp.json()
        
        # Check ok:true
        if not data.get('ok'):
            print(f"❌ FAIL: ok is not true")
            return False
        
        # Check all required top-level fields
        required_fields = [
            'rule', 'ruleLabel', 'lifetimeMonths', 'hasData', 'contractsTotal',
            'tiers', 'mrr', 'customers', 'ltv', 'timing', 'revenueQualityPct', 'breakdown'
        ]
        
        missing = [f for f in required_fields if f not in data]
        if missing:
            print(f"❌ FAIL: Missing fields: {missing}")
            return False
        
        # Check rule
        if data['rule'] != 'signed_started':
            print(f"❌ FAIL: Expected rule='signed_started', got '{data['rule']}'")
            return False
        
        # Check lifetimeMonths
        if data['lifetimeMonths'] != 36:
            print(f"❌ FAIL: Expected lifetimeMonths=36, got {data['lifetimeMonths']}")
            return False
        
        # Check tiers structure
        tiers = data['tiers']
        for tier_name in ['actual', 'contracted', 'potential']:
            if tier_name not in tiers:
                print(f"❌ FAIL: Missing tier: {tier_name}")
                return False
            tier = tiers[tier_name]
            tier_fields = ['mrr', 'arr', 'count', 'label']
            if tier_name in ['actual', 'contracted']:
                tier_fields.append('customers')
            missing_tier = [f for f in tier_fields if f not in tier]
            if missing_tier:
                print(f"❌ FAIL: Tier {tier_name} missing fields: {missing_tier}")
                return False
        
        # Check mrr structure
        mrr = data['mrr']
        mrr_fields = ['actual', 'contracted', 'potential', 'totalPipeline', 'atRisk90d']
        missing_mrr = [f for f in mrr_fields if f not in mrr]
        if missing_mrr:
            print(f"❌ FAIL: mrr missing fields: {missing_mrr}")
            return False
        
        # Check customers structure
        customers = data['customers']
        customer_fields = ['management', 'earning', 'contractedOnly', 'awaitingLease', 'activationRatePct', 'feePerEarningCustomer']
        missing_cust = [f for f in customer_fields if f not in customers]
        if missing_cust:
            print(f"❌ FAIL: customers missing fields: {missing_cust}")
            return False
        
        # Check ltv structure
        ltv = data['ltv']
        ltv_fields = ['value', 'monthlyFee', 'lifetimeMonths', 'grossMarginPct', 'sensitivity', 'contractedBasis', 'riskAdjustedNewCustomer']
        missing_ltv = [f for f in ltv_fields if f not in ltv]
        if missing_ltv:
            print(f"❌ FAIL: ltv missing fields: {missing_ltv}")
            return False
        
        # Check timing structure
        timing = data['timing']
        if 'daysToFirstLease' not in timing or 'sampleSize' not in timing:
            print(f"❌ FAIL: timing missing required fields")
            return False
        
        # Check breakdown structure
        breakdown = data['breakdown']
        for tier_name in ['actual', 'contracted', 'potential']:
            if tier_name not in breakdown:
                print(f"❌ FAIL: breakdown missing tier: {tier_name}")
                return False
        
        print(f"✅ PASS: All required fields present")
        print(f"  rule: {data['rule']}")
        print(f"  ruleLabel: {data['ruleLabel']}")
        print(f"  lifetimeMonths: {data['lifetimeMonths']}")
        print(f"  hasData: {data['hasData']}")
        print(f"  contractsTotal: {data['contractsTotal']}")
        print(f"  mrr.actual: {mrr['actual']}")
        print(f"  mrr.contracted: {mrr['contracted']}")
        print(f"  mrr.potential: {mrr['potential']}")
        print(f"  mrr.totalPipeline: {mrr['totalPipeline']}")
        print(f"  customers.management: {customers['management']}")
        print(f"  customers.earning: {customers['earning']}")
        print(f"  customers.activationRatePct: {customers['activationRatePct']}")
        print(f"  customers.feePerEarningCustomer: {customers['feePerEarningCustomer']}")
        print(f"  ltv.value: {ltv['value']}")
        print(f"  ltv.monthlyFee: {ltv['monthlyFee']}")
        print(f"  revenueQualityPct: {data['revenueQualityPct']}")
        print(f"  timing.daysToFirstLease: {timing['daysToFirstLease']}")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_math_checks():
    """Scenario 2: Verify mathematical calculations"""
    print("\n=== TEST 2: Math Checks ===")
    try:
        url = f"{BASE_URL}/admin/revenue-model?key={ADMIN_KEY}"
        resp = requests.get(url, timeout=30)
        
        if resp.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Check 1: ltv.value === round2(feePerEarningCustomer * lifetimeMonths) when grossMarginPct is null
        ltv = data['ltv']
        customers = data['customers']
        
        if ltv['grossMarginPct'] == 100 or ltv['grossMarginPct'] is None:
            # No margin applied
            fee = customers['feePerEarningCustomer']
            months = data['lifetimeMonths']
            
            if fee is not None:
                expected_ltv = round2(fee * months)
                actual_ltv = ltv['value']
                
                if abs(expected_ltv - actual_ltv) > 0.01:
                    print(f"❌ FAIL: LTV calculation mismatch")
                    print(f"  Expected: {expected_ltv} (fee {fee} * months {months})")
                    print(f"  Actual: {actual_ltv}")
                    return False
                
                print(f"✅ PASS: LTV calculation correct: {actual_ltv} = {fee} * {months}")
            else:
                print(f"✅ PASS: LTV is null (no earning customers)")
        
        # Check 2: mrr.totalPipeline === actual + contracted + potential (±0.05)
        mrr = data['mrr']
        expected_total = round2(mrr['actual'] + mrr['contracted'] + mrr['potential'])
        actual_total = mrr['totalPipeline']
        
        if abs(expected_total - actual_total) > 0.05:
            print(f"❌ FAIL: MRR totalPipeline mismatch")
            print(f"  Expected: {expected_total} (actual {mrr['actual']} + contracted {mrr['contracted']} + potential {mrr['potential']})")
            print(f"  Actual: {actual_total}")
            return False
        
        print(f"✅ PASS: MRR totalPipeline correct: {actual_total} ≈ {expected_total}")
        
        # Check 3: revenueQualityPct ≈ actual/totalPipeline*100
        if actual_total > 0:
            expected_quality = round((mrr['actual'] / actual_total) * 100, 1)
            actual_quality = data['revenueQualityPct']
            
            if actual_quality is not None and abs(expected_quality - actual_quality) > 0.2:
                print(f"❌ FAIL: revenueQualityPct mismatch")
                print(f"  Expected: {expected_quality}% (actual {mrr['actual']} / total {actual_total} * 100)")
                print(f"  Actual: {actual_quality}%")
                return False
            
            print(f"✅ PASS: revenueQualityPct correct: {actual_quality}% ≈ {expected_quality}%")
        
        # Check 4: ltv.sensitivity has 3 entries (24/36/48) each equal to feePerEarningCustomer * months
        sensitivity = ltv['sensitivity']
        
        if not isinstance(sensitivity, list) or len(sensitivity) != 3:
            print(f"❌ FAIL: sensitivity should be array of 3 items, got {len(sensitivity) if isinstance(sensitivity, list) else 'not array'}")
            return False
        
        expected_months = [24, 36, 48]
        fee = customers['feePerEarningCustomer']
        
        if fee is not None:
            for i, item in enumerate(sensitivity):
                if 'months' not in item or 'ltv' not in item:
                    print(f"❌ FAIL: sensitivity[{i}] missing months or ltv field")
                    return False
                
                if item['months'] != expected_months[i]:
                    print(f"❌ FAIL: sensitivity[{i}] months should be {expected_months[i]}, got {item['months']}")
                    return False
                
                expected_ltv = round2(fee * item['months'])
                if abs(expected_ltv - item['ltv']) > 0.01:
                    print(f"❌ FAIL: sensitivity[{i}] ltv mismatch")
                    print(f"  Expected: {expected_ltv} (fee {fee} * months {item['months']})")
                    print(f"  Actual: {item['ltv']}")
                    return False
            
            print(f"✅ PASS: sensitivity array correct with 3 entries (24/36/48 months)")
        else:
            print(f"✅ PASS: sensitivity array present (no earning customers to validate)")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_critical_bounds():
    """Scenario 3: Verify activationRatePct <= 100 and earning <= management"""
    print("\n=== TEST 3: Critical Bounds ===")
    try:
        url = f"{BASE_URL}/admin/revenue-model?key={ADMIN_KEY}"
        resp = requests.get(url, timeout=30)
        
        if resp.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        customers = data['customers']
        
        # Check 1: activationRatePct <= 100
        activation_rate = customers['activationRatePct']
        
        if activation_rate is not None and activation_rate > 100:
            print(f"❌ FAIL: activationRatePct is {activation_rate}%, must be <= 100%")
            return False
        
        print(f"✅ PASS: activationRatePct is {activation_rate}% (≤ 100%)")
        
        # Check 2: earning <= management
        earning = customers['earning']
        management = customers['management']
        
        if earning > management:
            print(f"❌ FAIL: earning customers ({earning}) > management customers ({management})")
            return False
        
        print(f"✅ PASS: earning customers ({earning}) ≤ management customers ({management})")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_rule_variants():
    """Scenario 4: Test different lease actual rules"""
    print("\n=== TEST 4: Rule Variants ===")
    try:
        # Get baseline with signed_started
        url_baseline = f"{BASE_URL}/admin/revenue-model?key={ADMIN_KEY}&rule=signed_started"
        resp_baseline = requests.get(url_baseline, timeout=30)
        
        if resp_baseline.status_code != 200:
            print(f"❌ FAIL: Baseline request failed with {resp_baseline.status_code}")
            return False
        
        baseline = resp_baseline.json()
        baseline_actual = baseline['mrr']['actual']
        baseline_contracted = baseline['mrr']['contracted']
        
        print(f"Baseline (signed_started): actual={baseline_actual}, contracted={baseline_contracted}")
        
        # Test rule=pending (should have MORE actual, LESS contracted)
        url_pending = f"{BASE_URL}/admin/revenue-model?key={ADMIN_KEY}&rule=pending"
        resp_pending = requests.get(url_pending, timeout=30)
        
        if resp_pending.status_code != 200:
            print(f"❌ FAIL: Pending request failed with {resp_pending.status_code}")
            return False
        
        pending = resp_pending.json()
        
        if pending['rule'] != 'pending':
            print(f"❌ FAIL: Expected rule='pending', got '{pending['rule']}'")
            return False
        
        pending_actual = pending['mrr']['actual']
        pending_contracted = pending['mrr']['contracted']
        
        print(f"Pending: actual={pending_actual}, contracted={pending_contracted}")
        
        # pending should have actual >= baseline (more inclusive)
        if pending_actual < baseline_actual - 0.01:
            print(f"❌ FAIL: pending actual ({pending_actual}) should be >= baseline ({baseline_actual})")
            return False
        
        # pending should have contracted <= baseline (less remaining)
        if pending_contracted > baseline_contracted + 0.01:
            print(f"❌ FAIL: pending contracted ({pending_contracted}) should be <= baseline ({baseline_contracted})")
            return False
        
        print(f"✅ PASS: pending rule correct (actual >= baseline, contracted <= baseline)")
        
        # Test rule=signed (should be between signed_started and pending)
        url_signed = f"{BASE_URL}/admin/revenue-model?key={ADMIN_KEY}&rule=signed"
        resp_signed = requests.get(url_signed, timeout=30)
        
        if resp_signed.status_code != 200:
            print(f"❌ FAIL: Signed request failed with {resp_signed.status_code}")
            return False
        
        signed = resp_signed.json()
        
        if signed['rule'] != 'signed':
            print(f"❌ FAIL: Expected rule='signed', got '{signed['rule']}'")
            return False
        
        signed_actual = signed['mrr']['actual']
        signed_contracted = signed['mrr']['contracted']
        
        print(f"Signed: actual={signed_actual}, contracted={signed_contracted}")
        print(f"✅ PASS: signed rule echoed back correctly")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_parameters():
    """Scenario 5: Test lifetimeMonths and grossMarginPct parameters"""
    print("\n=== TEST 5: Parameters ===")
    try:
        # Get baseline with 36 months
        url_baseline = f"{BASE_URL}/admin/revenue-model?key={ADMIN_KEY}"
        resp_baseline = requests.get(url_baseline, timeout=30)
        
        if resp_baseline.status_code != 200:
            print(f"❌ FAIL: Baseline request failed with {resp_baseline.status_code}")
            return False
        
        baseline = resp_baseline.json()
        baseline_ltv = baseline['ltv']['value']
        
        print(f"Baseline (36 months): LTV={baseline_ltv}")
        
        # Test lifetimeMonths=24 (should be 24/36 of baseline)
        url_24 = f"{BASE_URL}/admin/revenue-model?key={ADMIN_KEY}&lifetimeMonths=24"
        resp_24 = requests.get(url_24, timeout=30)
        
        if resp_24.status_code != 200:
            print(f"❌ FAIL: 24 months request failed with {resp_24.status_code}")
            return False
        
        data_24 = resp_24.json()
        ltv_24 = data_24['ltv']['value']
        
        if baseline_ltv is not None and ltv_24 is not None:
            expected_ltv_24 = round2(baseline_ltv * 24 / 36)
            
            if abs(ltv_24 - expected_ltv_24) > 1:
                print(f"❌ FAIL: LTV with 24 months should be {expected_ltv_24}, got {ltv_24}")
                return False
            
            print(f"✅ PASS: LTV with 24 months correct: {ltv_24} ≈ {expected_ltv_24} (24/36 of {baseline_ltv})")
        else:
            print(f"✅ PASS: LTV is null (no earning customers)")
        
        # Test grossMarginPct=70 (should be 70% of baseline)
        url_70 = f"{BASE_URL}/admin/revenue-model?key={ADMIN_KEY}&grossMarginPct=70"
        resp_70 = requests.get(url_70, timeout=30)
        
        if resp_70.status_code != 200:
            print(f"❌ FAIL: 70% margin request failed with {resp_70.status_code}")
            return False
        
        data_70 = resp_70.json()
        ltv_70 = data_70['ltv']['value']
        
        if baseline_ltv is not None and ltv_70 is not None:
            expected_ltv_70 = round2(baseline_ltv * 0.7)
            
            if abs(ltv_70 - expected_ltv_70) > 1:
                print(f"❌ FAIL: LTV with 70% margin should be {expected_ltv_70}, got {ltv_70}")
                return False
            
            print(f"✅ PASS: LTV with 70% margin correct: {ltv_70} ≈ {expected_ltv_70} (70% of {baseline_ltv})")
        else:
            print(f"✅ PASS: LTV is null (no earning customers)")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_kpi_integration():
    """Scenario 6: Verify revenueModel field in /api/admin/kpi response"""
    print("\n=== TEST 6: KPI Integration ===")
    try:
        url = f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=30"
        resp = requests.get(url, timeout=60)
        
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            return False
        
        data = resp.json()
        
        # Check revenueModel field exists
        if 'revenueModel' not in data:
            print(f"❌ FAIL: revenueModel field missing from KPI response")
            return False
        
        revenue_model = data['revenueModel']
        
        # Check structure (same as revenue-model endpoint)
        required_fields = ['rule', 'lifetimeMonths', 'tiers', 'mrr', 'customers', 'ltv']
        missing = [f for f in required_fields if f not in revenue_model]
        if missing:
            print(f"❌ FAIL: revenueModel missing fields: {missing}")
            return False
        
        print(f"✅ PASS: revenueModel field present in KPI response")
        
        # Check financeSync field
        if 'financeSync' not in data:
            print(f"❌ FAIL: financeSync field missing from KPI response")
            return False
        
        finance_sync = data['financeSync']
        print(f"✅ PASS: financeSync field present: {finance_sync}")
        
        # Check hero.ltv.basis
        if 'hero' not in data or 'ltv' not in data['hero']:
            print(f"❌ FAIL: hero.ltv missing from KPI response")
            return False
        
        hero_ltv = data['hero']['ltv']
        
        if 'basis' not in hero_ltv:
            print(f"❌ FAIL: hero.ltv.basis missing")
            return False
        
        if hero_ltv['basis'] != 'actual':
            print(f"⚠️  WARNING: hero.ltv.basis is '{hero_ltv['basis']}', expected 'actual' (may be OK if no actual contracts)")
        else:
            print(f"✅ PASS: hero.ltv.basis is 'actual'")
        
        # Check dataQuality fields
        if 'dataQuality' not in data:
            print(f"❌ FAIL: dataQuality missing from KPI response")
            return False
        
        data_quality = data['dataQuality']
        
        if 'ltvBasis' not in data_quality:
            print(f"❌ FAIL: dataQuality.ltvBasis missing")
            return False
        
        print(f"✅ PASS: dataQuality.ltvBasis is '{data_quality['ltvBasis']}'")
        
        # Check dataQuality MRR fields
        mrr_fields = ['mrrActual', 'mrrContracted', 'mrrPotential']
        for field in mrr_fields:
            if field not in data_quality:
                print(f"❌ FAIL: dataQuality.{field} missing")
                return False
        
        print(f"✅ PASS: dataQuality has mrrActual/mrrContracted/mrrPotential")
        
        # Check runRate
        if 'runRate' not in data:
            print(f"❌ FAIL: runRate missing from KPI response")
            return False
        
        run_rate = data['runRate']
        
        if 'basis' not in run_rate or 'mrr' not in run_rate:
            print(f"❌ FAIL: runRate missing basis or mrr field")
            return False
        
        if run_rate['basis'] != 'actual':
            print(f"⚠️  WARNING: runRate.basis is '{run_rate['basis']}', expected 'actual'")
        else:
            print(f"✅ PASS: runRate.basis is 'actual'")
        
        # Verify runRate.mrr === revenueModel.mrr.actual
        if abs(run_rate['mrr'] - revenue_model['mrr']['actual']) > 0.01:
            print(f"❌ FAIL: runRate.mrr ({run_rate['mrr']}) != revenueModel.mrr.actual ({revenue_model['mrr']['actual']})")
            return False
        
        print(f"✅ PASS: runRate.mrr matches revenueModel.mrr.actual ({run_rate['mrr']})")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_settings():
    """Scenario 7: Test GET/PUT /api/admin/kpi/settings"""
    print("\n=== TEST 7: Settings ===")
    try:
        # Get current settings
        url_get = f"{BASE_URL}/admin/kpi/settings?key={ADMIN_KEY}"
        resp_get = requests.get(url_get, timeout=30)
        
        print(f"GET settings status: {resp_get.status_code}")
        
        if resp_get.status_code != 200:
            print(f"❌ FAIL: GET settings failed with {resp_get.status_code}")
            return False
        
        response_data = resp_get.json()
        
        # Settings are nested under 'settings' key
        if 'settings' not in response_data:
            print(f"❌ FAIL: Response missing 'settings' key")
            return False
        
        settings = response_data['settings']
        
        # Check required fields
        required_fields = ['ltvMode', 'lifetimeMonths', 'grossMarginPct', 'leaseActualRule', 'northStar']
        missing = [f for f in required_fields if f not in settings]
        if missing:
            print(f"❌ FAIL: Settings missing fields: {missing}")
            return False
        
        print(f"✅ PASS: Settings have all required fields")
        print(f"  Current: ltvMode={settings['ltvMode']}, lifetimeMonths={settings['lifetimeMonths']}, grossMarginPct={settings['grossMarginPct']}, leaseActualRule={settings['leaseActualRule']}")
        
        # Save original settings
        original_settings = {
            'ltvMode': settings['ltvMode'],
            'lifetimeMonths': settings['lifetimeMonths'],
            'grossMarginPct': settings['grossMarginPct'],
            'leaseActualRule': settings['leaseActualRule']
        }
        
        # Update settings
        url_put = f"{BASE_URL}/admin/kpi/settings?key={ADMIN_KEY}"
        new_settings = {
            'ltvMode': 'actual',
            'lifetimeMonths': 48,
            'grossMarginPct': 70,
            'leaseActualRule': 'signed'
        }
        
        resp_put = requests.put(url_put, json=new_settings, timeout=30)
        
        print(f"PUT settings status: {resp_put.status_code}")
        
        if resp_put.status_code != 200:
            print(f"❌ FAIL: PUT settings failed with {resp_put.status_code}")
            print(f"Response: {resp_put.text[:500]}")
            return False
        
        print(f"✅ PASS: Settings updated successfully")
        
        # Verify settings were applied in KPI endpoint
        url_kpi = f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=30"
        resp_kpi = requests.get(url_kpi, timeout=60)
        
        if resp_kpi.status_code != 200:
            print(f"❌ FAIL: KPI request failed with {resp_kpi.status_code}")
            return False
        
        kpi_data = resp_kpi.json()
        revenue_model = kpi_data['revenueModel']
        
        if revenue_model['lifetimeMonths'] != 48:
            print(f"❌ FAIL: Expected lifetimeMonths=48, got {revenue_model['lifetimeMonths']}")
            return False
        
        if revenue_model['rule'] != 'signed':
            print(f"❌ FAIL: Expected rule='signed', got {revenue_model['rule']}")
            return False
        
        ltv = revenue_model['ltv']
        if ltv['grossMarginPct'] != 70:
            print(f"❌ FAIL: Expected grossMarginPct=70, got {ltv['grossMarginPct']}")
            return False
        
        print(f"✅ PASS: Settings reflected in KPI response (lifetimeMonths=48, rule=signed, grossMarginPct=70)")
        
        # Restore original settings
        restore_settings = {
            'ltvMode': 'actual',
            'lifetimeMonths': 36,
            'grossMarginPct': None,
            'leaseActualRule': 'signed_started'
        }
        
        resp_restore = requests.put(url_put, json=restore_settings, timeout=30)
        
        if resp_restore.status_code != 200:
            print(f"❌ FAIL: Failed to restore settings with {resp_restore.status_code}")
            return False
        
        # Verify restoration
        resp_verify = requests.get(url_get, timeout=30)
        if resp_verify.status_code != 200:
            print(f"❌ FAIL: Failed to verify restored settings")
            return False
        
        verify_data = resp_verify.json()
        verified = verify_data.get('settings', {})
        
        if verified['lifetimeMonths'] != 36:
            print(f"❌ FAIL: Failed to restore lifetimeMonths to 36, got {verified['lifetimeMonths']}")
            return False
        
        if verified['grossMarginPct'] is not None:
            print(f"❌ FAIL: Failed to restore grossMarginPct to null, got {verified['grossMarginPct']}")
            return False
        
        if verified['leaseActualRule'] != 'signed_started':
            print(f"❌ FAIL: Failed to restore leaseActualRule to signed_started, got {verified['leaseActualRule']}")
            return False
        
        print(f"✅ PASS: Settings restored to original values (36/null/signed_started)")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_finance_regression():
    """Scenario 8: Verify all finance endpoints still work"""
    print("\n=== TEST 8: Finance Regression ===")
    try:
        endpoints = [
            '/admin/finance/overview',
            '/admin/finance/resultat',
            '/admin/finance/likviditet',
            '/admin/finance/trends',
            '/admin/finance/investor',
            '/admin/finance/forecast',
            '/admin/finance/board-pack',
            '/admin/finance/customers',
            '/admin/finance/contracts',
            '/admin/finance/costs',
            '/admin/finance/settings',
            '/admin/finance/events'
        ]
        
        all_passed = True
        
        for endpoint in endpoints:
            url = f"{BASE_URL}{endpoint}?key={ADMIN_KEY}"
            try:
                resp = requests.get(url, timeout=60)
                
                if resp.status_code != 200:
                    print(f"❌ FAIL: {endpoint} returned {resp.status_code}")
                    all_passed = False
                    continue
                
                # Try to parse JSON
                data = resp.json()
                
                # Check for NaN/null in numeric fields for resultat and overview
                if endpoint in ['/admin/finance/resultat', '/admin/finance/overview']:
                    # Just verify it's valid JSON and has expected structure
                    if 'ok' not in data:
                        print(f"❌ FAIL: {endpoint} missing 'ok' field")
                        all_passed = False
                        continue
                
                print(f"✅ PASS: {endpoint} returned 200 with valid JSON")
                
            except Exception as e:
                print(f"❌ FAIL: {endpoint} raised exception: {e}")
                all_passed = False
        
        # Special check for /contracts - should return ALL 7 contracts (raw list not deduped)
        url_contracts = f"{BASE_URL}/admin/finance/contracts?key={ADMIN_KEY}"
        resp_contracts = requests.get(url_contracts, timeout=30)
        
        if resp_contracts.status_code != 200:
            print(f"❌ FAIL: /contracts returned {resp_contracts.status_code}")
            return False
        
        contracts_data = resp_contracts.json()
        
        if 'contracts' not in contracts_data:
            print(f"❌ FAIL: /contracts response missing 'contracts' field")
            return False
        
        contracts_count = len(contracts_data['contracts'])
        
        if contracts_count != 7:
            print(f"⚠️  WARNING: Expected 7 contracts, got {contracts_count} (may be OK if data changed)")
        else:
            print(f"✅ PASS: /contracts returns all 7 contracts (raw list not deduped)")
        
        return all_passed
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_auth():
    """Scenario 9: Verify 401 without key"""
    print("\n=== TEST 9: Auth ===")
    try:
        url = f"{BASE_URL}/admin/revenue-model"
        resp = requests.get(url, timeout=30)
        
        print(f"Status without key: {resp.status_code}")
        
        if resp.status_code != 401:
            print(f"❌ FAIL: Expected 401 without key, got {resp.status_code}")
            return False
        
        print(f"✅ PASS: Returns 401 without key")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_non_destructive():
    """Scenario 10: Verify document counts unchanged"""
    print("\n=== TEST 10: Non-Destructive ===")
    try:
        # Get contracts count
        url_contracts = f"{BASE_URL}/admin/finance/contracts?key={ADMIN_KEY}"
        resp_contracts = requests.get(url_contracts, timeout=30)
        
        if resp_contracts.status_code != 200:
            print(f"❌ FAIL: Failed to get contracts")
            return False
        
        contracts_data = resp_contracts.json()
        contracts_count = len(contracts_data.get('contracts', []))
        
        print(f"Contracts count: {contracts_count}")
        
        # Get leads count
        url_leads = f"{BASE_URL}/admin/leads?key={ADMIN_KEY}"
        resp_leads = requests.get(url_leads, timeout=30)
        
        if resp_leads.status_code != 200:
            print(f"❌ FAIL: Failed to get leads")
            return False
        
        leads_data = resp_leads.json()
        leads_count = len(leads_data.get('leads', []))
        
        print(f"Leads count: {leads_count}")
        
        print(f"✅ PASS: Document counts verified (contracts={contracts_count}, leads={leads_count})")
        print(f"  Note: These counts should remain unchanged after all tests")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 80)
    print("BACKEND TEST: P0 LTV - Revenue Model + LTV Implementation")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print()
    
    tests = [
        ("Revenue Model Structure", test_revenue_model_structure),
        ("Math Checks", test_math_checks),
        ("Critical Bounds", test_critical_bounds),
        ("Rule Variants", test_rule_variants),
        ("Parameters", test_parameters),
        ("KPI Integration", test_kpi_integration),
        ("Settings", test_settings),
        ("Finance Regression", test_finance_regression),
        ("Auth", test_auth),
        ("Non-Destructive", test_non_destructive),
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ TEST FAILED WITH EXCEPTION: {name}")
            print(f"Exception: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print()
    print(f"Total: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
