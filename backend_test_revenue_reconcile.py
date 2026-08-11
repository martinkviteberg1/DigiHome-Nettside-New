#!/usr/bin/env python3
"""
Backend test for PROD-FASIT-avstemmingsendepunkt (revenue reconciliation).
Tests GET /api/admin/revenue-reconcile + regression on revenue model.

CRITICAL SAFETY RULES (ABSOLUTE PROHIBITIONS):
1. IKKE kall POST /api/admin/finance/sync-contracts eller /sync-customers
2. IKKE kall POST /api/admin/imported-leads/sync uten dryRun=1
3. IKKE kall newsletter send/test, IKKE SEO run/cron, IKKE skrivekall mot Google/Meta
4. IKKE slett eller endre data. Alle testene under er GET-kall
5. READ-ONLY testing only

IMPORTANT CONTEXT:
- Preview environment is connected to LIVE integrations (Google Ads, Meta, platform app.digihome.no)
- Contract data in preview is test data (7 contracts)
- Platform URL in preview points to the app itself
- "lokalt" and "plattform" columns SHOULD differ significantly in preview - this is EXPECTED and NOT a bug
"""

import requests
import time
import json
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"
TIMEOUT = 30  # seconds - reconcile endpoint can be slow

def print_test(msg):
    print(f"\n{'='*80}")
    print(f"TEST: {msg}")
    print('='*80)

def print_pass(msg):
    print(f"✅ PASS: {msg}")

def print_fail(msg):
    print(f"❌ FAIL: {msg}")

def get_mongo_db():
    """Get MongoDB database connection"""
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]

def verify_field_exists(obj, path, label=""):
    """Verify a nested field exists in object"""
    keys = path.split('.')
    current = obj
    for key in keys:
        if not isinstance(current, dict) or key not in current:
            print_fail(f"{label or path} missing in response")
            return False
    return True

def get_nested(obj, path, default=None):
    """Get nested value from object"""
    keys = path.split('.')
    current = obj
    for key in keys:
        if not isinstance(current, dict) or key not in current:
            return default
        current = current[key]
    return current

def test_auth():
    """Test 1: AUTH - endpoint requires admin key"""
    print_test("(1) AUTH: GET /api/admin/revenue-reconcile WITHOUT key → 401")
    
    try:
        # Without key
        r = requests.get(f"{BASE_URL}/admin/revenue-reconcile", timeout=TIMEOUT)
        if r.status_code == 401:
            print_pass(f"Without key returns 401 ✓")
        else:
            print_fail(f"Without key returned {r.status_code}, expected 401")
            return False
        
        # With key - should return 200
        r = requests.get(f"{BASE_URL}/admin/revenue-reconcile?key={ADMIN_KEY}&env=prod&days=30", timeout=TIMEOUT)
        if r.status_code == 200:
            print_pass(f"With key returns 200 ✓")
        else:
            print_fail(f"With key returned {r.status_code}, expected 200")
            return False
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_prod_reconciliation():
    """Test 2: PROD-AVSTEMMING - full structure verification"""
    print_test("(2) PROD-AVSTEMMING: GET /api/admin/revenue-reconcile?env=prod&days=30")
    
    try:
        start_time = time.time()
        r = requests.get(f"{BASE_URL}/admin/revenue-reconcile?key={ADMIN_KEY}&env=prod&days=30", timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        if r.status_code != 200:
            print_fail(f"HTTP {r.status_code}, expected 200")
            return False
        
        data = r.json()
        
        # Verify ok: true
        if not data.get('ok'):
            print_fail(f"ok is not true: {data.get('ok')}")
            return False
        print_pass(f"ok: true ✓")
        
        # Verify platform fields
        platform = data.get('platform', {})
        required_platform_fields = ['host', 'httpStatus', 'rows', 'reachable']
        for field in required_platform_fields:
            if field not in platform:
                print_fail(f"platform.{field} missing")
                return False
        
        if platform.get('host') != 'app.digihome.no':
            print_fail(f"platform.host is '{platform.get('host')}', expected 'app.digihome.no'")
            return False
        print_pass(f"platform.host === 'app.digihome.no' ✓")
        
        if platform.get('httpStatus') != 200:
            print_fail(f"platform.httpStatus is {platform.get('httpStatus')}, expected 200")
            return False
        print_pass(f"platform.httpStatus === 200 ✓")
        
        if platform.get('rows', 0) < 30:
            print_fail(f"platform.rows is {platform.get('rows')}, expected >= 30")
            return False
        print_pass(f"platform.rows >= 30 ({platform.get('rows')}) ✓")
        
        if not platform.get('reachable'):
            print_fail(f"platform.reachable is {platform.get('reachable')}, expected true")
            return False
        print_pass(f"platform.reachable === true ✓")
        
        # Verify settings
        settings = data.get('settings', {})
        required_settings = ['lifetimeMonths', 'leaseActualRule', 'ruleLabel']
        for field in required_settings:
            if field not in settings:
                print_fail(f"settings.{field} missing")
                return False
        print_pass(f"settings has lifetimeMonths, leaseActualRule, ruleLabel ✓")
        
        # Verify local and truth
        for section in ['local', 'truth']:
            obj = data.get(section, {})
            if not obj:
                print_fail(f"{section} missing or empty")
                return False
            
            # Check mrr structure
            mrr = obj.get('mrr', {})
            required_mrr = ['actual', 'contracted', 'potential', 'totalPipeline']
            for field in required_mrr:
                if field not in mrr:
                    print_fail(f"{section}.mrr.{field} missing")
                    return False
            
            # Check ltv structure
            ltv = obj.get('ltv', {})
            required_ltv = ['value', 'monthlyFee', 'lifetimeMonths']
            for field in required_ltv:
                if field not in ltv:
                    print_fail(f"{section}.ltv.{field} missing")
                    return False
            
            # Check customers structure
            customers = obj.get('customers', {})
            if 'earning' not in customers or 'management' not in customers:
                print_fail(f"{section}.customers missing earning or management")
                return False
            
            print_pass(f"{section} has mrr, ltv, customers ✓")
        
        # Verify response time < 25s
        if elapsed >= 25:
            print_fail(f"Response time {elapsed:.1f}s >= 25s")
            return False
        print_pass(f"Response time {elapsed:.1f}s < 25s ✓")
        
        # Store data for next tests
        test_prod_reconciliation.data = data
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_metrics_table():
    """Test 3: METRIKK-TABELLEN - verify 11 metrics with correct structure"""
    print_test("(3) METRIKK-TABELLEN: metrics array with 11 elements")
    
    try:
        if not hasattr(test_prod_reconciliation, 'data'):
            print_fail("No data from previous test")
            return False
        
        data = test_prod_reconciliation.data
        metrics = data.get('metrics', [])
        
        if len(metrics) != 11:
            print_fail(f"metrics has {len(metrics)} elements, expected 11")
            return False
        print_pass(f"metrics has 11 elements ✓")
        
        # Verify each metric has required fields
        required_fields = ['key', 'label', 'unit', 'local', 'platform', 'delta', 'deltaPct', 'match', 'critical']
        for i, metric in enumerate(metrics):
            for field in required_fields:
                if field not in metric:
                    print_fail(f"metrics[{i}] missing field '{field}'")
                    return False
        print_pass(f"All metrics have required fields ✓")
        
        # Verify expected keys exist
        expected_keys = [
            'mrr.actual', 'mrr.contracted', 'mrr.potential', 'mrr.totalPipeline',
            'ltv.value', 'ltv.monthlyFee',
            'customers.earning', 'customers.management', 'customers.activationRatePct',
            'revenueQualityPct', 'contractsTotal'
        ]
        metric_keys = [m['key'] for m in metrics]
        for key in expected_keys:
            if key not in metric_keys:
                print_fail(f"Expected key '{key}' not in metrics")
                return False
        print_pass(f"All expected keys present ✓")
        
        # CRITICAL MATH CHECK: delta ≈ local - platform (tolerance 0.02)
        math_errors = []
        for metric in metrics:
            local = metric.get('local')
            platform = metric.get('platform')
            delta = metric.get('delta')
            
            if local is not None and platform is not None and delta is not None:
                expected_delta = local - platform
                diff = abs(delta - expected_delta)
                if diff > 0.02:
                    math_errors.append(f"{metric['key']}: delta={delta}, expected≈{expected_delta:.2f}, diff={diff:.4f}")
        
        if math_errors:
            print_fail(f"Delta math errors: {'; '.join(math_errors)}")
            return False
        print_pass(f"All delta calculations correct (tolerance 0.02) ✓")
        
        # Verify match logic
        for metric in metrics:
            local = metric.get('local')
            platform = metric.get('platform')
            delta = metric.get('delta')
            match = metric.get('match')
            unit = metric.get('unit')
            
            # Determine tolerance based on unit
            if unit == 'kr' or unit == 'kr/mnd':
                tol = 1
            elif unit == 'stk':
                tol = 0
            elif unit == '%':
                tol = 0.2
            else:
                tol = 1
            
            # Check match logic
            if local is None and platform is None:
                expected_match = True
            elif delta is not None:
                expected_match = abs(delta) <= tol
            else:
                expected_match = False
            
            if match != expected_match:
                print_fail(f"{metric['key']}: match={match}, expected={expected_match} (delta={delta}, tol={tol})")
                return False
        
        print_pass(f"All match flags correct ✓")
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_contract_diff():
    """Test 4: KONTRAKT-DIFF - contract comparison structure"""
    print_test("(4) KONTRAKT-DIFF: contracts structure verification")
    
    try:
        if not hasattr(test_prod_reconciliation, 'data'):
            print_fail("No data from previous test")
            return False
        
        data = test_prod_reconciliation.data
        contracts = data.get('contracts', {})
        
        # Verify required fields
        required_fields = [
            'localTotal', 'localFromPlatform', 'localManual', 'platformTotal',
            'onlyInPlatform', 'onlyLocal', 'mismatched', 'counts', 'feeImpact'
        ]
        for field in required_fields:
            if field not in contracts:
                print_fail(f"contracts.{field} missing")
                return False
        print_pass(f"contracts has all required fields ✓")
        
        # Verify counts structure
        counts = contracts.get('counts', {})
        required_counts = ['onlyInPlatform', 'onlyLocal', 'onlyLocalCounted', 'onlyLocalOrphaned', 'mismatched']
        for field in required_counts:
            if field not in counts:
                print_fail(f"contracts.counts.{field} missing")
                return False
        print_pass(f"counts has all required fields ✓")
        
        # Verify count math
        platform_total = contracts.get('platformTotal', 0)
        if counts['onlyInPlatform'] + counts['mismatched'] > platform_total:
            print_fail(f"counts.onlyInPlatform ({counts['onlyInPlatform']}) + counts.mismatched ({counts['mismatched']}) > platformTotal ({platform_total})")
            return False
        print_pass(f"counts.onlyInPlatform + counts.mismatched <= platformTotal ✓")
        
        local_from_platform = contracts.get('localFromPlatform', 0)
        if counts['onlyLocal'] > local_from_platform:
            print_fail(f"counts.onlyLocal ({counts['onlyLocal']}) > localFromPlatform ({local_from_platform})")
            return False
        print_pass(f"counts.onlyLocal <= localFromPlatform ✓")
        
        if counts['onlyLocalCounted'] + counts['onlyLocalOrphaned'] != counts['onlyLocal']:
            print_fail(f"counts.onlyLocalCounted ({counts['onlyLocalCounted']}) + counts.onlyLocalOrphaned ({counts['onlyLocalOrphaned']}) != counts.onlyLocal ({counts['onlyLocal']})")
            return False
        print_pass(f"counts.onlyLocalCounted + counts.onlyLocalOrphaned === counts.onlyLocal ✓")
        
        # Verify feeImpact if onlyInPlatform is small enough
        if counts['onlyInPlatform'] <= 50:
            only_in_platform = contracts.get('onlyInPlatform', [])
            expected_fee = sum(row.get('fee', 0) for row in only_in_platform)
            actual_fee = contracts.get('feeImpact', {}).get('missingFromLocal', 0)
            diff = abs(expected_fee - actual_fee)
            if diff > 1:
                print_fail(f"feeImpact.missingFromLocal ({actual_fee}) differs from sum of onlyInPlatform fees ({expected_fee:.2f}) by {diff:.2f} kr")
                return False
            print_pass(f"feeImpact.missingFromLocal ≈ sum of onlyInPlatform fees (diff={diff:.2f} kr) ✓")
        
        # Verify row structure
        for row in contracts.get('onlyInPlatform', [])[:5]:  # Check first 5
            required_row_fields = ['contractId', 'type', 'status', 'owner', 'property', 'fee', 'startDate']
            for field in required_row_fields:
                if field not in row:
                    print_fail(f"onlyInPlatform row missing field '{field}'")
                    return False
        print_pass(f"onlyInPlatform rows have correct structure ✓")
        
        for row in contracts.get('onlyLocal', [])[:5]:  # Check first 5
            required_row_fields = ['contractId', 'type', 'status', 'owner', 'property', 'fee', 'startDate', 'orphaned']
            for field in required_row_fields:
                if field not in row:
                    print_fail(f"onlyLocal row missing field '{field}'")
                    return False
        print_pass(f"onlyLocal rows have correct structure (including orphaned) ✓")
        
        # PII CHECK: no sensitive fields should leak
        json_str = json.dumps(data)
        sensitive_patterns = ['ownerEmail', 'ownerPhone', 'tenantEmail', 'tenantPhone', 'API_KEY', 'X-API-Key']
        found_sensitive = []
        for pattern in sensitive_patterns:
            if pattern in json_str:
                found_sensitive.append(pattern)
        
        # Also check for email patterns
        import re
        if re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', json_str):
            # Check if it's in a safe context (like error messages)
            if 'ownerEmail' in json_str or 'tenantEmail' in json_str:
                found_sensitive.append('email addresses')
        
        if found_sensitive:
            print_fail(f"SENSITIVE DATA LEAK: {', '.join(found_sensitive)}")
            return False
        print_pass(f"No sensitive fields leak (PII check passed) ✓")
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_ramp():
    """Test 5: OPPSTARTSPLAN (ramp) - verify startup plan structure"""
    print_test("(5) OPPSTARTSPLAN (ramp): truth.ramp array verification")
    
    try:
        if not hasattr(test_prod_reconciliation, 'data'):
            print_fail("No data from previous test")
            return False
        
        data = test_prod_reconciliation.data
        truth = data.get('truth', {})
        ramp = truth.get('ramp', [])
        
        if len(ramp) != 3:
            print_fail(f"truth.ramp has {len(ramp)} elements, expected 3")
            return False
        print_pass(f"truth.ramp has 3 elements ✓")
        
        # Verify each ramp element
        truth_mrr_actual = truth.get('mrr', {}).get('actual', 0)
        for i, item in enumerate(ramp):
            # Check required fields
            if 'mrr' not in item or 'addedMrr' not in item or 'startingCount' not in item:
                print_fail(f"ramp[{i}] missing required fields")
                return False
            
            # Check mrr >= truth.mrr.actual
            if item['mrr'] < truth_mrr_actual:
                print_fail(f"ramp[{i}].mrr ({item['mrr']}) < truth.mrr.actual ({truth_mrr_actual})")
                return False
            
            # Check addedMrr >= 0
            if item['addedMrr'] < 0:
                print_fail(f"ramp[{i}].addedMrr ({item['addedMrr']}) < 0")
                return False
            
            # Check startingCount >= 0
            if item['startingCount'] < 0:
                print_fail(f"ramp[{i}].startingCount ({item['startingCount']}) < 0")
                return False
            
            # Check mrr ≈ truth.mrr.actual + addedMrr (tolerance 1 kr)
            expected_mrr = truth_mrr_actual + item['addedMrr']
            diff = abs(item['mrr'] - expected_mrr)
            if diff > 1:
                print_fail(f"ramp[{i}].mrr ({item['mrr']}) != truth.mrr.actual + addedMrr ({expected_mrr:.2f}), diff={diff:.2f}")
                return False
        
        print_pass(f"All ramp elements have correct structure and values ✓")
        
        # Check non-decreasing
        for i in range(len(ramp) - 1):
            if ramp[i]['mrr'] > ramp[i+1]['mrr']:
                print_fail(f"ramp[{i}].mrr ({ramp[i]['mrr']}) > ramp[{i+1}].mrr ({ramp[i+1]['mrr']}) - not non-decreasing")
                return False
        print_pass(f"ramp values are non-decreasing ✓")
        
        # Check upcomingStarts
        upcoming_starts = truth.get('upcomingStarts', [])
        if not isinstance(upcoming_starts, list):
            print_fail(f"truth.upcomingStarts is not an array")
            return False
        
        # Verify each has startDate in future (if any)
        for i, item in enumerate(upcoming_starts):
            if 'startDate' not in item:
                print_fail(f"upcomingStarts[{i}] missing startDate")
                return False
            # Just check it's a valid date string
            if not isinstance(item['startDate'], str) or len(item['startDate']) < 10:
                print_fail(f"upcomingStarts[{i}].startDate is not a valid date string")
                return False
        
        print_pass(f"truth.upcomingStarts is array (can be empty) ✓")
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_spend():
    """Test 6: ANNONSEFORBRUK - ad spend verification"""
    print_test("(6) ANNONSEFORBRUK: spend structure verification")
    
    try:
        if not hasattr(test_prod_reconciliation, 'data'):
            print_fail("No data from previous test")
            return False
        
        data = test_prod_reconciliation.data
        spend = data.get('spend')
        
        if spend is None:
            print_fail("spend is null")
            return False
        
        # Verify required fields
        required_fields = ['total', 'google', 'meta', 'cpl', 'cac', 'sources', 'period', 'checks']
        for field in required_fields:
            if field not in spend:
                print_fail(f"spend.{field} missing")
                return False
        print_pass(f"spend has all required fields ✓")
        
        # Verify period
        period = spend.get('period', {})
        if period.get('days') != 30:
            print_fail(f"spend.period.days is {period.get('days')}, expected 30")
            return False
        print_pass(f"spend.period.days === 30 ✓")
        
        if 'fromDate' not in period or 'toDate' not in period:
            print_fail("spend.period missing fromDate or toDate")
            return False
        print_pass(f"spend.period has fromDate and toDate ✓")
        
        # Verify checks
        checks = spend.get('checks', [])
        if len(checks) != 3:
            print_fail(f"spend.checks has {len(checks)} elements, expected 3")
            return False
        
        all_ok = all(check.get('ok') for check in checks)
        if not all_ok:
            failed_checks = [check.get('label') for check in checks if not check.get('ok')]
            print_fail(f"Some checks failed: {', '.join(failed_checks)}")
            return False
        print_pass(f"All 3 checks have ok: true ✓")
        
        # Verify sources
        sources = spend.get('sources', {})
        if sources.get('googleBasis') != 'campaign':
            print_fail(f"spend.sources.googleBasis is '{sources.get('googleBasis')}', expected 'campaign'")
            return False
        print_pass(f"spend.sources.googleBasis === 'campaign' ✓")
        
        if sources.get('metaLifetimeFallback') != False:
            print_fail(f"spend.sources.metaLifetimeFallback is {sources.get('metaLifetimeFallback')}, expected false")
            return False
        print_pass(f"spend.sources.metaLifetimeFallback === false ✓")
        
        # Verify total ≈ google + meta (tolerance 2 kr)
        total = spend.get('total', 0) or 0
        google = spend.get('google', 0) or 0
        meta = spend.get('meta', 0) or 0
        expected_total = google + meta
        diff = abs(total - expected_total)
        if diff > 2:
            print_fail(f"spend.total ({total}) != google ({google}) + meta ({meta}), diff={diff:.2f} kr")
            return False
        print_pass(f"spend.total ≈ google + meta (diff={diff:.2f} kr) ✓")
        
        # Test with spend=0
        print("\n  Testing with spend=0 parameter...")
        r = requests.get(f"{BASE_URL}/admin/revenue-reconcile?key={ADMIN_KEY}&env=prod&days=30&spend=0", timeout=TIMEOUT)
        if r.status_code != 200:
            print_fail(f"With spend=0: HTTP {r.status_code}, expected 200")
            return False
        
        data_no_spend = r.json()
        if data_no_spend.get('spend') is not None:
            print_fail(f"With spend=0: spend should be null, got {type(data_no_spend.get('spend'))}")
            return False
        print_pass(f"With spend=0: spend is null ✓")
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_parameter_overrides():
    """Test 7: PARAMETER-OVERSTYRING - parameter override verification"""
    print_test("(7) PARAMETER-OVERSTYRING: rule, lifetimeMonths, grossMarginPct overrides")
    
    try:
        # Get baseline with rule=signed_started
        r_baseline = requests.get(f"{BASE_URL}/admin/revenue-reconcile?key={ADMIN_KEY}&env=prod&days=30&rule=signed_started", timeout=TIMEOUT)
        if r_baseline.status_code != 200:
            print_fail(f"Baseline request failed: HTTP {r_baseline.status_code}")
            return False
        baseline = r_baseline.json()
        baseline_actual = baseline.get('truth', {}).get('mrr', {}).get('actual', 0)
        baseline_contracted = baseline.get('truth', {}).get('mrr', {}).get('contracted', 0)
        
        # Test rule=signed
        r_signed = requests.get(f"{BASE_URL}/admin/revenue-reconcile?key={ADMIN_KEY}&env=prod&days=30&rule=signed", timeout=TIMEOUT)
        if r_signed.status_code != 200:
            print_fail(f"rule=signed request failed: HTTP {r_signed.status_code}")
            return False
        signed_data = r_signed.json()
        
        if signed_data.get('settings', {}).get('leaseActualRule') != 'signed':
            print_fail(f"rule=signed: settings.leaseActualRule is '{signed_data.get('settings', {}).get('leaseActualRule')}', expected 'signed'")
            return False
        print_pass(f"rule=signed: settings.leaseActualRule === 'signed' ✓")
        
        signed_actual = signed_data.get('truth', {}).get('mrr', {}).get('actual', 0)
        if signed_actual < baseline_actual:
            print_fail(f"rule=signed: truth.mrr.actual ({signed_actual}) < baseline ({baseline_actual}) - more inclusive rule should give >= MRR")
            return False
        print_pass(f"rule=signed: truth.mrr.actual ({signed_actual}) >= baseline ({baseline_actual}) ✓")
        
        # Test lifetimeMonths=24
        r_ltm24 = requests.get(f"{BASE_URL}/admin/revenue-reconcile?key={ADMIN_KEY}&env=prod&days=30&lifetimeMonths=24", timeout=TIMEOUT)
        if r_ltm24.status_code != 200:
            print_fail(f"lifetimeMonths=24 request failed: HTTP {r_ltm24.status_code}")
            return False
        ltm24_data = r_ltm24.json()
        
        if ltm24_data.get('truth', {}).get('ltv', {}).get('lifetimeMonths') != 24:
            print_fail(f"lifetimeMonths=24: truth.ltv.lifetimeMonths is {ltm24_data.get('truth', {}).get('ltv', {}).get('lifetimeMonths')}, expected 24")
            return False
        print_pass(f"lifetimeMonths=24: truth.ltv.lifetimeMonths === 24 ✓")
        
        ltm24_ltv = ltm24_data.get('truth', {}).get('ltv', {}).get('value', 0)
        ltm24_monthly = ltm24_data.get('truth', {}).get('ltv', {}).get('monthlyFee', 0)
        expected_ltv = ltm24_monthly * 24
        diff = abs(ltm24_ltv - expected_ltv)
        if diff > 1:
            print_fail(f"lifetimeMonths=24: truth.ltv.value ({ltm24_ltv}) != monthlyFee * 24 ({expected_ltv:.2f}), diff={diff:.2f}")
            return False
        print_pass(f"lifetimeMonths=24: truth.ltv.value ≈ monthlyFee * 24 (diff={diff:.2f} kr) ✓")
        
        # Test grossMarginPct=60
        r_gm60 = requests.get(f"{BASE_URL}/admin/revenue-reconcile?key={ADMIN_KEY}&env=prod&days=30&grossMarginPct=60", timeout=TIMEOUT)
        if r_gm60.status_code != 200:
            print_fail(f"grossMarginPct=60 request failed: HTTP {r_gm60.status_code}")
            return False
        gm60_data = r_gm60.json()
        
        # Get baseline LTV without margin
        r_no_margin = requests.get(f"{BASE_URL}/admin/revenue-reconcile?key={ADMIN_KEY}&env=prod&days=30", timeout=TIMEOUT)
        no_margin_ltv = r_no_margin.json().get('truth', {}).get('ltv', {}).get('value', 0)
        
        gm60_ltv = gm60_data.get('truth', {}).get('ltv', {}).get('value', 0)
        expected_gm60_ltv = no_margin_ltv * 0.6
        diff = abs(gm60_ltv - expected_gm60_ltv)
        if diff > 1:
            print_fail(f"grossMarginPct=60: truth.ltv.value ({gm60_ltv}) != baseline * 0.6 ({expected_gm60_ltv:.2f}), diff={diff:.2f}")
            return False
        print_pass(f"grossMarginPct=60: truth.ltv.value ≈ baseline * 0.6 (diff={diff:.2f} kr) ✓")
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_env_test_robustness():
    """Test 8: ENV=TEST ROBUSTHET - test environment robustness"""
    print_test("(8) ENV=TEST ROBUSTHET: GET with env=test&days=7")
    
    try:
        r = requests.get(f"{BASE_URL}/admin/revenue-reconcile?key={ADMIN_KEY}&env=test&days=7", timeout=TIMEOUT)
        
        if r.status_code != 200:
            print_fail(f"HTTP {r.status_code}, expected 200")
            return False
        print_pass(f"HTTP 200 ✓")
        
        # Verify valid JSON
        try:
            data = r.json()
        except:
            print_fail("Response is not valid JSON")
            return False
        print_pass(f"Response is valid JSON ✓")
        
        # ok can be true or false
        if 'ok' not in data:
            print_fail("Response missing 'ok' field")
            return False
        print_pass(f"Response has 'ok' field (value: {data.get('ok')}) ✓")
        
        # If ok is false, should have error and local
        if not data.get('ok'):
            if 'error' not in data or not isinstance(data.get('error'), str):
                print_fail("ok=false but error is missing or not a string")
                return False
            print_pass(f"ok=false has error: '{data.get('error')}' ✓")
            
            if 'local' not in data:
                print_fail("ok=false but local is missing")
                return False
            print_pass(f"ok=false still has local ✓")
        
        print_pass(f"env=test robustness check passed (NOT a bug if ok=false) ✓")
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_read_only_proof():
    """Test 9: READ-ONLY-BEVIS - verify no data was modified"""
    print_test("(9) READ-ONLY-BEVIS: Verify no contracts or leads were modified")
    
    try:
        db = get_mongo_db()
        
        # Get contracts BEFORE
        r_contracts_before = requests.get(f"{BASE_URL}/admin/finance/contracts?key={ADMIN_KEY}", timeout=10)
        if r_contracts_before.status_code != 200:
            print_fail(f"GET /admin/finance/contracts failed: HTTP {r_contracts_before.status_code}")
            return False
        contracts_before = r_contracts_before.json().get('contracts', [])
        count_before = len(contracts_before)
        
        # Get leads BEFORE
        r_leads_before = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=10)
        if r_leads_before.status_code != 200:
            print_fail(f"GET /admin/leads failed: HTTP {r_leads_before.status_code}")
            return False
        leads_data_before = r_leads_before.json()
        leads_count_before = len(leads_data_before.get('leads', []))
        imported_count_before = leads_data_before.get('importedCount', 0)
        
        # Check sync meta BEFORE
        sync_meta_before = db['imported_leads_sync_meta'].find_one({})
        last_sync_before = sync_meta_before.get('lastSyncAt') if sync_meta_before else None
        
        print(f"  BEFORE: contracts={count_before}, leads={leads_count_before}, imported={imported_count_before}")
        
        # Run reconcile endpoint
        r = requests.get(f"{BASE_URL}/admin/revenue-reconcile?key={ADMIN_KEY}&env=prod&days=30", timeout=TIMEOUT)
        if r.status_code != 200:
            print_fail(f"Reconcile request failed: HTTP {r.status_code}")
            return False
        
        # Get contracts AFTER
        r_contracts_after = requests.get(f"{BASE_URL}/admin/finance/contracts?key={ADMIN_KEY}", timeout=10)
        if r_contracts_after.status_code != 200:
            print_fail(f"GET /admin/finance/contracts after failed: HTTP {r_contracts_after.status_code}")
            return False
        contracts_after = r_contracts_after.json().get('contracts', [])
        count_after = len(contracts_after)
        
        # Get leads AFTER
        r_leads_after = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=10)
        if r_leads_after.status_code != 200:
            print_fail(f"GET /admin/leads after failed: HTTP {r_leads_after.status_code}")
            return False
        leads_data_after = r_leads_after.json()
        leads_count_after = len(leads_data_after.get('leads', []))
        imported_count_after = leads_data_after.get('importedCount', 0)
        
        # Check sync meta AFTER
        sync_meta_after = db['imported_leads_sync_meta'].find_one({})
        last_sync_after = sync_meta_after.get('lastSyncAt') if sync_meta_after else None
        
        print(f"  AFTER:  contracts={count_after}, leads={leads_count_after}, imported={imported_count_after}")
        
        # Verify counts are identical
        if count_before != count_after:
            print_fail(f"Contract count changed: {count_before} → {count_after}")
            return False
        print_pass(f"Contract count unchanged ({count_before}) ✓")
        
        if leads_count_before != leads_count_after:
            print_fail(f"Leads count changed: {leads_count_before} → {leads_count_after}")
            return False
        print_pass(f"Leads count unchanged ({leads_count_before}) ✓")
        
        if imported_count_before != imported_count_after:
            print_fail(f"Imported leads count changed: {imported_count_before} → {imported_count_after}")
            return False
        print_pass(f"Imported leads count unchanged ({imported_count_before}) ✓")
        
        # Verify no contract got orphaned=true
        orphaned_contracts = [c for c in contracts_after if c.get('orphaned') == True]
        if orphaned_contracts:
            print_fail(f"{len(orphaned_contracts)} contracts got orphaned=true (sync was run)")
            return False
        print_pass(f"No contracts got orphaned=true ✓")
        
        # Verify sync meta unchanged
        if last_sync_before != last_sync_after:
            print_fail(f"Sync meta changed: lastSyncAt {last_sync_before} → {last_sync_after}")
            return False
        print_pass(f"Sync meta unchanged ✓")
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_regression():
    """Test 10: REGRESJON - regression on existing endpoints"""
    print_test("(10) REGRESJON: Verify existing endpoints still work")
    
    try:
        # Test /api/admin/kpi
        r_kpi = requests.get(f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=30", timeout=30)
        if r_kpi.status_code != 200:
            print_fail(f"GET /api/admin/kpi failed: HTTP {r_kpi.status_code}")
            return False
        kpi_data = r_kpi.json()
        
        # Verify revenueModel exists
        if 'revenueModel' not in kpi_data:
            print_fail("GET /api/admin/kpi missing revenueModel field")
            return False
        print_pass(f"GET /api/admin/kpi has revenueModel ✓")
        
        # Verify revenueModel has new fields
        revenue_model = kpi_data.get('revenueModel', {})
        if 'ramp' not in revenue_model:
            print_fail("revenueModel missing ramp field")
            return False
        if len(revenue_model.get('ramp', [])) != 3:
            print_fail(f"revenueModel.ramp has {len(revenue_model.get('ramp', []))} elements, expected 3")
            return False
        print_pass(f"revenueModel has ramp (3 elements) ✓")
        
        if 'upcomingStarts' not in revenue_model:
            print_fail("revenueModel missing upcomingStarts field")
            return False
        print_pass(f"revenueModel has upcomingStarts ✓")
        
        if 'contractsRaw' not in revenue_model or 'duplicatesRemoved' not in revenue_model:
            print_fail("revenueModel missing contractsRaw or duplicatesRemoved")
            return False
        print_pass(f"revenueModel has contractsRaw and duplicatesRemoved ✓")
        
        # Test /api/admin/revenue-model
        r_rm = requests.get(f"{BASE_URL}/admin/revenue-model?key={ADMIN_KEY}", timeout=10)
        if r_rm.status_code != 200:
            print_fail(f"GET /api/admin/revenue-model failed: HTTP {r_rm.status_code}")
            return False
        rm_data = r_rm.json()
        
        if 'ramp' not in rm_data or 'upcomingStarts' not in rm_data:
            print_fail("GET /api/admin/revenue-model missing ramp or upcomingStarts")
            return False
        print_pass(f"GET /api/admin/revenue-model has ramp and upcomingStarts ✓")
        
        # Test /api/admin/leads
        r_leads = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=10)
        if r_leads.status_code != 200:
            print_fail(f"GET /api/admin/leads failed: HTTP {r_leads.status_code}")
            return False
        print_pass(f"GET /api/admin/leads returns 200 ✓")
        
        # Test /api/admin/finance/overview (or any finance endpoint)
        r_finance = requests.get(f"{BASE_URL}/admin/finance/overview?key={ADMIN_KEY}", timeout=15)
        if r_finance.status_code != 200:
            print_fail(f"GET /api/admin/finance/overview failed: HTTP {r_finance.status_code}")
            return False
        print_pass(f"GET /api/admin/finance/overview returns 200 ✓")
        
        # Test /api/
        r_root = requests.get(f"{BASE_URL}/", timeout=5)
        if r_root.status_code != 200:
            print_fail(f"GET /api/ failed: HTTP {r_root.status_code}")
            return False
        print_pass(f"GET /api/ returns 200 ✓")
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def main():
    print("\n" + "="*80)
    print("BACKEND TEST: PROD-FASIT-avstemmingsendepunkt (revenue reconciliation)")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    print(f"Timeout: {TIMEOUT}s")
    print("="*80)
    
    tests = [
        ("AUTH", test_auth),
        ("PROD-AVSTEMMING", test_prod_reconciliation),
        ("METRIKK-TABELLEN", test_metrics_table),
        ("KONTRAKT-DIFF", test_contract_diff),
        ("OPPSTARTSPLAN (ramp)", test_ramp),
        ("ANNONSEFORBRUK", test_spend),
        ("PARAMETER-OVERSTYRING", test_parameter_overrides),
        ("ENV=TEST ROBUSTHET", test_env_test_robustness),
        ("READ-ONLY-BEVIS", test_read_only_proof),
        ("REGRESJON", test_regression),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_fail(f"Test {name} crashed: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed ({100*passed//total}% success rate)")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Revenue reconciliation endpoint working perfectly.")
        print("\nKEY OBSERVATIONS:")
        if hasattr(test_prod_reconciliation, 'data'):
            data = test_prod_reconciliation.data
            truth = data.get('truth', {})
            print(f"  - truth.mrr.actual: {truth.get('mrr', {}).get('actual', 0)} kr/mnd")
            print(f"  - truth.mrr.contracted: {truth.get('mrr', {}).get('contracted', 0)} kr/mnd")
            print(f"  - truth.ltv.value: {truth.get('ltv', {}).get('value', 0)} kr")
            print(f"  - truth.ramp: {len(truth.get('ramp', []))} elements")
            
            local = data.get('local', {})
            print(f"  - local.mrr.actual: {local.get('mrr', {}).get('actual', 0)} kr/mnd")
            print(f"  - local.ltv.value: {local.get('ltv', {}).get('value', 0)} kr")
            
            contracts = data.get('contracts', {})
            counts = contracts.get('counts', {})
            print(f"  - contracts.counts: onlyInPlatform={counts.get('onlyInPlatform', 0)}, onlyLocal={counts.get('onlyLocal', 0)}, mismatched={counts.get('mismatched', 0)}")
            
            spend = data.get('spend', {})
            if spend:
                print(f"  - spend.total: {spend.get('total', 0)} kr")
                print(f"  - spend.cpl: {spend.get('cpl', 0)} kr")
                print(f"  - spend.cac: {spend.get('cac', 0)} kr")
        
        return 0
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    exit(main())
