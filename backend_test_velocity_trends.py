#!/usr/bin/env python3
"""
Backend test for TWO NEW analytics endpoints:
- GET /api/admin/analytics/velocity (pipeline velocity)
- GET /api/admin/analytics/trends (CPL/CAC trends with daily_metrics persistence)

CRITICAL SAFETY RULES:
- These are READ/COMPUTE endpoints - do NOT create/modify/delete leads or imported_leads
- Do NOT delete or modify 'daily_metrics' collection (durable production spend history)
- No QA doc setup needed, no cleanup needed
- Verify data integrity: leads=19, imported_leads=44 before and after
"""

import requests
import sys
from datetime import datetime

BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_velocity_structure():
    """Test 1: VELOCITY structure with days=90"""
    print("\n=== TEST 1: VELOCITY STRUCTURE (days=90) ===")
    try:
        url = f"{BASE_URL}/admin/analytics/velocity?days=90&key={ADMIN_KEY}"
        r = requests.get(url, timeout=30)
        print(f"Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        
        # Check top-level structure
        required_fields = ['ok', 'days', 'sample', 'stages', 'conversion', 'bottleneck', 'timeToSale', 'firstResponse', 'stale', 'note']
        for field in required_fields:
            if field not in data:
                print(f"❌ FAIL: Missing field '{field}'")
                return False
        
        # Check ok=true
        if data['ok'] != True:
            print(f"❌ FAIL: ok should be true, got {data['ok']}")
            return False
        
        # Check days=90
        if data['days'] != 90:
            print(f"❌ FAIL: days should be 90, got {data['days']}")
            return False
        
        # Check sample is int
        if not isinstance(data['sample'], int):
            print(f"❌ FAIL: sample should be int, got {type(data['sample'])}")
            return False
        
        # Check stages array (5 items)
        if not isinstance(data['stages'], list) or len(data['stages']) != 5:
            print(f"❌ FAIL: stages should be array of 5 items, got {len(data.get('stages', []))}")
            return False
        
        # Check each stage structure
        expected_stages = ['new', 'contacted', 'qualified', 'viewing', 'offer']
        for i, stage in enumerate(data['stages']):
            if stage['stage'] != expected_stages[i]:
                print(f"❌ FAIL: Stage {i} should be '{expected_stages[i]}', got '{stage['stage']}'")
                return False
            
            # Check stage fields
            if 'label' not in stage or 'n' not in stage or 'medianHours' not in stage or 'avgHours' not in stage:
                print(f"❌ FAIL: Stage {stage['stage']} missing required fields")
                return False
            
            # Sanity: medianHours/avgHours are null or >= 0
            if stage['medianHours'] is not None and stage['medianHours'] < 0:
                print(f"❌ FAIL: Stage {stage['stage']} medianHours should be null or >= 0, got {stage['medianHours']}")
                return False
            if stage['avgHours'] is not None and stage['avgHours'] < 0:
                print(f"❌ FAIL: Stage {stage['stage']} avgHours should be null or >= 0, got {stage['avgHours']}")
                return False
        
        # Check conversion array (5 items)
        if not isinstance(data['conversion'], list) or len(data['conversion']) != 5:
            print(f"❌ FAIL: conversion should be array of 5 items, got {len(data.get('conversion', []))}")
            return False
        
        # Check each conversion item
        for conv in data['conversion']:
            if 'stage' not in conv or 'entered' not in conv or 'advanced' not in conv or 'rate' not in conv:
                print(f"❌ FAIL: Conversion item missing required fields")
                return False
            
            # Sanity: rate is null or 0..100
            if conv['rate'] is not None and (conv['rate'] < 0 or conv['rate'] > 100):
                print(f"❌ FAIL: Conversion rate should be null or 0..100, got {conv['rate']}")
                return False
            
            # Sanity: advanced <= entered
            if conv['advanced'] > conv['entered']:
                print(f"❌ FAIL: Conversion advanced ({conv['advanced']}) should be <= entered ({conv['entered']})")
                return False
        
        # Check bottleneck (object or null)
        if data['bottleneck'] is not None and not isinstance(data['bottleneck'], dict):
            print(f"❌ FAIL: bottleneck should be object or null, got {type(data['bottleneck'])}")
            return False
        
        # Check timeToSale structure
        tts = data['timeToSale']
        if not isinstance(tts, dict):
            print(f"❌ FAIL: timeToSale should be object")
            return False
        if 'medianDays' not in tts or 'avgDays' not in tts or 'n' not in tts or 'perChannel' not in tts:
            print(f"❌ FAIL: timeToSale missing required fields")
            return False
        if not isinstance(tts['perChannel'], list):
            print(f"❌ FAIL: timeToSale.perChannel should be array")
            return False
        
        # Check firstResponse structure
        fr = data['firstResponse']
        if not isinstance(fr, dict):
            print(f"❌ FAIL: firstResponse should be object")
            return False
        if 'medianHours' not in fr or 'n' not in fr:
            print(f"❌ FAIL: firstResponse missing required fields")
            return False
        
        # Check stale array (max 15 items)
        if not isinstance(data['stale'], list):
            print(f"❌ FAIL: stale should be array")
            return False
        if len(data['stale']) > 15:
            print(f"❌ FAIL: stale should have max 15 items, got {len(data['stale'])}")
            return False
        
        # Check stale items structure and sorting
        prev_days = float('inf')
        for item in data['stale']:
            if 'id' not in item or 'name' not in item or 'stage' not in item or 'days' not in item:
                print(f"❌ FAIL: Stale item missing required fields")
                return False
            if item['days'] < 7:
                print(f"❌ FAIL: Stale item days should be >= 7, got {item['days']}")
                return False
            # Check descending sort
            if item['days'] > prev_days:
                print(f"❌ FAIL: Stale items should be sorted descending by days")
                return False
            prev_days = item['days']
        
        print(f"✅ PASS: Velocity structure correct")
        print(f"  - days: {data['days']}, sample: {data['sample']}")
        print(f"  - stages: {len(data['stages'])} items")
        print(f"  - conversion: {len(data['conversion'])} items")
        print(f"  - stale: {len(data['stale'])} items")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_velocity_days_clamping():
    """Test 2: VELOCITY days clamping"""
    print("\n=== TEST 2: VELOCITY DAYS CLAMPING ===")
    try:
        # Test days=3 should clamp to 7
        url = f"{BASE_URL}/admin/analytics/velocity?days=3&key={ADMIN_KEY}"
        r = requests.get(url, timeout=30)
        if r.status_code != 200:
            print(f"❌ FAIL: days=3 returned {r.status_code}")
            return False
        data = r.json()
        if data['days'] != 7:
            print(f"❌ FAIL: days=3 should clamp to 7, got {data['days']}")
            return False
        print(f"✅ PASS: days=3 clamped to 7")
        
        # Test days=9999 should clamp to 365
        url = f"{BASE_URL}/admin/analytics/velocity?days=9999&key={ADMIN_KEY}"
        r = requests.get(url, timeout=30)
        if r.status_code != 200:
            print(f"❌ FAIL: days=9999 returned {r.status_code}")
            return False
        data = r.json()
        if data['days'] != 365:
            print(f"❌ FAIL: days=9999 should clamp to 365, got {data['days']}")
            return False
        print(f"✅ PASS: days=9999 clamped to 365")
        
        # Test days=abc should default to 90
        url = f"{BASE_URL}/admin/analytics/velocity?days=abc&key={ADMIN_KEY}"
        r = requests.get(url, timeout=30)
        if r.status_code != 200:
            print(f"❌ FAIL: days=abc returned {r.status_code}")
            return False
        data = r.json()
        if data['days'] != 90:
            print(f"❌ FAIL: days=abc should default to 90, got {data['days']}")
            return False
        print(f"✅ PASS: days=abc defaulted to 90")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_velocity_auth():
    """Test 3: VELOCITY auth"""
    print("\n=== TEST 3: VELOCITY AUTH ===")
    try:
        url = f"{BASE_URL}/admin/analytics/velocity?days=90"
        r = requests.get(url, timeout=30)
        if r.status_code != 401:
            print(f"❌ FAIL: Without key should return 401, got {r.status_code}")
            return False
        print(f"✅ PASS: Without key returns 401")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_trends_weekly():
    """Test 4: TRENDS weekly (days=84)"""
    print("\n=== TEST 4: TRENDS WEEKLY (days=84) ===")
    try:
        url = f"{BASE_URL}/admin/analytics/trends?days=84&key={ADMIN_KEY}"
        r = requests.get(url, timeout=60)
        print(f"Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        
        # Check top-level structure
        if 'ok' not in data or 'group' not in data or 'periods' not in data or 'note' not in data:
            print(f"❌ FAIL: Missing required top-level fields")
            return False
        
        if data['ok'] != True:
            print(f"❌ FAIL: ok should be true, got {data['ok']}")
            return False
        
        # Check group='week' for days=84
        if data['group'] != 'week':
            print(f"❌ FAIL: group should be 'week' for days=84, got '{data['group']}'")
            return False
        
        # Check periods array
        if not isinstance(data['periods'], list):
            print(f"❌ FAIL: periods should be array")
            return False
        
        if len(data['periods']) == 0:
            print(f"❌ FAIL: periods should not be empty")
            return False
        
        # Check each period structure
        prev_key = None
        for period in data['periods']:
            # Check required fields
            required = ['key', 'partial', 'google', 'meta', 'finn', 'paid', 'organicLeads', 'totalLeads']
            for field in required:
                if field not in period:
                    print(f"❌ FAIL: Period missing field '{field}'")
                    return False
            
            # Check key format (YYYY-MM-DD)
            if not isinstance(period['key'], str) or len(period['key']) != 10:
                print(f"❌ FAIL: Period key should be YYYY-MM-DD format, got '{period['key']}'")
                return False
            
            # Check ascending sort
            if prev_key and period['key'] < prev_key:
                print(f"❌ FAIL: Periods should be sorted ascending by key")
                return False
            prev_key = period['key']
            
            # Check partial is bool
            if not isinstance(period['partial'], bool):
                print(f"❌ FAIL: Period partial should be bool, got {type(period['partial'])}")
                return False
            
            # Check channel objects
            for channel in ['google', 'meta', 'finn', 'paid']:
                ch = period[channel]
                if not isinstance(ch, dict):
                    print(f"❌ FAIL: Period {channel} should be object")
                    return False
                
                # Check channel fields
                ch_fields = ['spend', 'clicks', 'leads', 'won', 'wonValue', 'cpl', 'cac', 'roas']
                for field in ch_fields:
                    if field not in ch:
                        print(f"❌ FAIL: Period {channel} missing field '{field}'")
                        return False
                
                # Sanity: cpl is null when leads=0 or spend=0
                if ch['leads'] == 0 or ch['spend'] == 0:
                    if ch['cpl'] is not None:
                        print(f"❌ FAIL: Period {channel} cpl should be null when leads=0 or spend=0")
                        return False
        
        # Check paid.spend ≈ google.spend + meta.spend + finn.spend (±0.05)
        for period in data['periods']:
            expected_spend = period['google']['spend'] + period['meta']['spend'] + period['finn']['spend']
            actual_spend = period['paid']['spend']
            diff = abs(actual_spend - expected_spend)
            if diff > 0.05:
                print(f"❌ FAIL: Period {period['key']} paid.spend ({actual_spend}) != sum of channels ({expected_spend}), diff={diff}")
                return False
        
        # Check at least one period has meta.spend > 0 (real Meta history exists)
        has_meta_spend = any(p['meta']['spend'] > 0 for p in data['periods'])
        if not has_meta_spend:
            print(f"⚠️  WARNING: No periods with meta.spend > 0 (expected real Meta history)")
        
        print(f"✅ PASS: Trends weekly structure correct")
        print(f"  - group: {data['group']}")
        print(f"  - periods: {len(data['periods'])} items")
        print(f"  - periods sorted ascending: ✓")
        print(f"  - paid.spend matches sum of channels: ✓")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_trends_daily():
    """Test 5: TRENDS daily (days=30)"""
    print("\n=== TEST 5: TRENDS DAILY (days=30) ===")
    try:
        url = f"{BASE_URL}/admin/analytics/trends?days=30&key={ADMIN_KEY}"
        r = requests.get(url, timeout=60)
        print(f"Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        
        # Check group='day' for days=30
        if data['group'] != 'day':
            print(f"❌ FAIL: group should be 'day' for days=30, got '{data['group']}'")
            return False
        
        # Check period keys are individual dates
        if len(data['periods']) == 0:
            print(f"❌ FAIL: periods should not be empty")
            return False
        
        # All keys should be unique dates (no week grouping)
        keys = [p['key'] for p in data['periods']]
        if len(keys) != len(set(keys)):
            print(f"❌ FAIL: Period keys should be unique (daily)")
            return False
        
        print(f"✅ PASS: Trends daily structure correct")
        print(f"  - group: {data['group']}")
        print(f"  - periods: {len(data['periods'])} items (daily)")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_trends_persistence():
    """Test 6: TRENDS persistence - verify daily_metrics collection"""
    print("\n=== TEST 6: TRENDS PERSISTENCE ===")
    try:
        from pymongo import MongoClient
        
        # Connect to MongoDB
        client = MongoClient("mongodb://localhost:27017")
        db = client["your_database_name"]
        
        # Check daily_metrics collection exists and has data
        count = db.daily_metrics.count_documents({'channel': 'meta'})
        
        if count == 0:
            print(f"❌ FAIL: daily_metrics collection has no meta documents")
            return False
        
        # Check structure of a meta document
        doc = db.daily_metrics.find_one({'channel': 'meta'})
        if not doc:
            print(f"❌ FAIL: Could not find meta document")
            return False
        
        required_fields = ['date', 'channel', 'spend', 'clicks']
        for field in required_fields:
            if field not in doc:
                print(f"❌ FAIL: daily_metrics document missing field '{field}'")
                return False
        
        print(f"✅ PASS: daily_metrics collection verified")
        print(f"  - meta documents: {count}")
        print(f"  - sample doc: date={doc['date']}, channel={doc['channel']}, spend={doc['spend']}, clicks={doc['clicks']}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_trends_auth():
    """Test 7: TRENDS auth"""
    print("\n=== TEST 7: TRENDS AUTH ===")
    try:
        url = f"{BASE_URL}/admin/analytics/trends?days=84"
        r = requests.get(url, timeout=30)
        if r.status_code != 401:
            print(f"❌ FAIL: Without key should return 401, got {r.status_code}")
            return False
        print(f"✅ PASS: Without key returns 401")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_regression_name_collision():
    """Test 8: REGRESSION - name collision check (computeTrends vs computeMarketingTrends)"""
    print("\n=== TEST 8: REGRESSION - NAME COLLISION CHECK ===")
    try:
        # Find the finance route that calls computeTrends with {months}
        # Based on the review request, we need to search for 'computeTrends(db, { months })'
        # This should be in the finance trends endpoint
        
        # Try GET /api/admin/finance/trends
        url = f"{BASE_URL}/admin/finance/trends?months=12&key={ADMIN_KEY}"
        r = requests.get(url, timeout=30)
        
        if r.status_code != 200:
            print(f"❌ FAIL: Finance trends endpoint returned {r.status_code}")
            return False
        
        data = r.json()
        if 'ok' not in data or data['ok'] != True:
            print(f"❌ FAIL: Finance trends endpoint returned ok={data.get('ok')}")
            return False
        
        print(f"✅ PASS: Finance trends endpoint still works (no name collision)")
        
        # Also test other regression endpoints
        url = f"{BASE_URL}/"
        r = requests.get(url, timeout=30)
        if r.status_code != 200:
            print(f"❌ FAIL: GET /api/ returned {r.status_code}")
            return False
        print(f"✅ PASS: GET /api/ returns 200")
        
        url = f"{BASE_URL}/admin/analytics?days=30&key={ADMIN_KEY}"
        r = requests.get(url, timeout=60)
        if r.status_code != 200:
            print(f"❌ FAIL: GET /api/admin/analytics returned {r.status_code}")
            return False
        print(f"✅ PASS: GET /api/admin/analytics returns 200")
        
        url = f"{BASE_URL}/admin/leads?key={ADMIN_KEY}"
        r = requests.get(url, timeout=30)
        if r.status_code != 200:
            print(f"❌ FAIL: GET /api/admin/leads returned {r.status_code}")
            return False
        print(f"✅ PASS: GET /api/admin/leads returns 200")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_data_integrity():
    """Test 9: DATA-INTEGRITY - verify leads and imported_leads counts unchanged"""
    print("\n=== TEST 9: DATA-INTEGRITY CHECK ===")
    try:
        from pymongo import MongoClient
        
        # Connect to MongoDB
        client = MongoClient("mongodb://localhost:27017")
        db = client["your_database_name"]
        
        # Count leads (excluding deleted)
        leads_count = db.leads.count_documents({'deleted': {'$ne': True}})
        
        # Count imported_leads (excluding deleted)
        imported_count = db.imported_leads.count_documents({'deleted': {'$ne': True}})
        
        print(f"  - leads count: {leads_count}")
        print(f"  - imported_leads count: {imported_count}")
        
        # Verify expected counts
        if leads_count != 19:
            print(f"❌ FAIL: Expected leads=19, got {leads_count}")
            client.close()
            return False
        
        if imported_count != 44:
            print(f"❌ FAIL: Expected imported_leads=44, got {imported_count}")
            client.close()
            return False
        
        print(f"✅ PASS: Data integrity verified (leads=19, imported_leads=44)")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 80)
    print("BACKEND TEST: VELOCITY + TRENDS ANALYTICS ENDPOINTS")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print("=" * 80)
    
    # Check data integrity BEFORE tests
    print("\n=== PRE-TEST DATA INTEGRITY CHECK ===")
    if not test_data_integrity():
        print("\n❌ PRE-TEST DATA INTEGRITY CHECK FAILED - ABORTING")
        sys.exit(1)
    
    results = []
    
    # Run all tests
    results.append(("1. VELOCITY structure", test_velocity_structure()))
    results.append(("2. VELOCITY days clamping", test_velocity_days_clamping()))
    results.append(("3. VELOCITY auth", test_velocity_auth()))
    results.append(("4. TRENDS weekly", test_trends_weekly()))
    results.append(("5. TRENDS daily", test_trends_daily()))
    results.append(("6. TRENDS persistence", test_trends_persistence()))
    results.append(("7. TRENDS auth", test_trends_auth()))
    results.append(("8. REGRESSION name collision", test_regression_name_collision()))
    
    # Check data integrity AFTER tests
    print("\n=== POST-TEST DATA INTEGRITY CHECK ===")
    results.append(("9. DATA-INTEGRITY", test_data_integrity()))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
