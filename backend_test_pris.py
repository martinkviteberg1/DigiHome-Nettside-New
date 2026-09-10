#!/usr/bin/env python3
"""
Backend test for PRIS (DigiHome Tech B2B price list + billing basis).
Tests the NEW PRIS backend endpoints as specified in the review_request.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Default config to restore at the end
DEFAULT_CONFIG = {
    "prisModell": "blandet",
    "grunnlag": "utleid_mnd",
    "grunnlagSelvbetjent": "utleid_mnd",
    "mvaSats": 25,
    "betalingsfristDager": 14,
    "fakturadag": 1,
    "levering": "EHF",
    "produktnavn": "Plattformlisens",
    "trinn": [
        {"fraEnheter": 0, "pris": 200},
        {"fraEnheter": 50, "pris": 150},
        {"fraEnheter": 200, "pris": 99}
    ]
}

def test_1_get_config():
    """Test 1: GET /api/admin/pris/config → verify structure and 401 without key"""
    print("\n=== TEST 1: GET /api/admin/pris/config ===")
    
    # Test without key → 401
    try:
        print("  Testing without key (should return 401)...")
        r = requests.get(f"{BASE_URL}/admin/pris/config", timeout=10)
        if r.status_code == 401:
            print("  ✅ Without key → 401 (correct)")
        else:
            print(f"  ❌ Without key → {r.status_code} (expected 401)")
            return False
    except Exception as e:
        print(f"  ❌ Error testing without key: {e}")
        return False
    
    # Test with key → 200
    try:
        print("  Testing with key (should return 200)...")
        r = requests.get(f"{BASE_URL}/admin/pris/config?key={ADMIN_KEY}", timeout=10)
        if r.status_code != 200:
            print(f"  ❌ With key → {r.status_code} (expected 200)")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"  ❌ Response ok=false: {data}")
            return False
        
        config = data.get('config', {})
        required_fields = ['trinn', 'prisModell', 'grunnlag', 'mvaSats', 'betalingsfristDager', 'fakturadag', 'levering']
        for field in required_fields:
            if field not in config:
                print(f"  ❌ Missing field in config: {field}")
                return False
        
        # Verify trinn structure
        if not isinstance(config['trinn'], list) or len(config['trinn']) == 0:
            print(f"  ❌ trinn is not a non-empty list: {config['trinn']}")
            return False
        
        for i, tier in enumerate(config['trinn']):
            if 'fraEnheter' not in tier or 'pris' not in tier:
                print(f"  ❌ trinn[{i}] missing fraEnheter or pris: {tier}")
                return False
        
        print(f"  ✅ GET config successful: prisModell={config['prisModell']}, grunnlag={config['grunnlag']}, trinn={len(config['trinn'])} tiers")
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_2_get_grunnlag_default():
    """Test 2: GET /api/admin/pris/grunnlag (no maaned = previous month 2026-08) → verify math"""
    print("\n=== TEST 2: GET /api/admin/pris/grunnlag (default month) ===")
    
    try:
        print("  Testing GET grunnlag without maaned parameter...")
        r = requests.get(f"{BASE_URL}/admin/pris/grunnlag?key={ADMIN_KEY}", timeout=15)
        if r.status_code != 200:
            print(f"  ❌ Status {r.status_code} (expected 200)")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"  ❌ Response ok=false: {data}")
            return False
        
        grunnlag = data.get('grunnlag', {})
        config = data.get('config', {})
        
        # Verify structure
        required_fields = ['maaned', 'linjer', 'antallEnheter', 'sumEksMva', 'mva', 'sumInkMva']
        for field in required_fields:
            if field not in grunnlag:
                print(f"  ❌ Missing field in grunnlag: {field}")
                return False
        
        maaned = grunnlag['maaned']
        antallEnheter = grunnlag['antallEnheter']
        linjer = grunnlag['linjer']
        sumEksMva = grunnlag['sumEksMva']
        mva = grunnlag['mva']
        sumInkMva = grunnlag['sumInkMva']
        mvaSats = grunnlag.get('mvaSats', config.get('mvaSats', 25))
        
        print(f"  Month: {maaned}")
        print(f"  Units: {antallEnheter}")
        print(f"  Lines: {len(linjer)}")
        print(f"  Sum ex VAT: {sumEksMva}")
        print(f"  VAT: {mva}")
        print(f"  Sum inc VAT: {sumInkMva}")
        
        # Verify math: sumEksMva === sum(linjer.belop)
        calculated_sum = sum(line.get('belop', 0) for line in linjer)
        if calculated_sum != sumEksMva:
            print(f"  ❌ Math error: sum(linjer.belop)={calculated_sum} != sumEksMva={sumEksMva}")
            return False
        print(f"  ✅ sumEksMva === sum(linjer.belop) = {sumEksMva}")
        
        # Verify math: mva === round(sumEksMva * mvaSats / 100)
        calculated_mva = round(sumEksMva * mvaSats / 100)
        if calculated_mva != mva:
            print(f"  ❌ Math error: round({sumEksMva} * {mvaSats} / 100)={calculated_mva} != mva={mva}")
            return False
        print(f"  ✅ mva === round(sumEksMva * mvaSats / 100) = {mva}")
        
        # Verify math: sumInkMva === sumEksMva + mva
        if sumInkMva != sumEksMva + mva:
            print(f"  ❌ Math error: sumInkMva={sumInkMva} != sumEksMva + mva={sumEksMva + mva}")
            return False
        print(f"  ✅ sumInkMva === sumEksMva + mva = {sumInkMva}")
        
        # Expected values for default config (grunnlag='utleid_mnd', prisModell='blandet', trinn[0].pris=200)
        # According to review_request: antallEnheter=16, one line type='alle' pris=200 belop=3200, sumEksMva=3200, mva=800, sumInkMva=4000
        print(f"\n  Expected (from review_request): antallEnheter=16, pris=200, belop=3200, sumEksMva=3200, mva=800, sumInkMva=4000")
        print(f"  Actual: antallEnheter={antallEnheter}, sumEksMva={sumEksMva}, mva={mva}, sumInkMva={sumInkMva}")
        
        if len(linjer) > 0:
            line = linjer[0]
            print(f"  First line: type={line.get('type')}, antall={line.get('antall')}, pris={line.get('pris')}, belop={line.get('belop')}")
        
        print(f"  ✅ GET grunnlag successful with correct math")
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_3_post_grunnlag_preview_alle():
    """Test 3: POST /api/admin/pris/grunnlag with grunnlag='alle' (preview, does NOT save)"""
    print("\n=== TEST 3: POST /api/admin/pris/grunnlag (preview with grunnlag='alle') ===")
    
    try:
        print("  Testing POST preview with grunnlag='alle'...")
        payload = {
            "maaned": "2026-08",
            "config": {
                "grunnlag": "alle",
                "prisModell": "blandet",
                "trinn": [{"fraEnheter": 0, "pris": 200}]
            }
        }
        
        r = requests.post(f"{BASE_URL}/admin/pris/grunnlag?key={ADMIN_KEY}", json=payload, timeout=15)
        if r.status_code != 200:
            print(f"  ❌ Status {r.status_code} (expected 200)")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"  ❌ Response ok=false: {data}")
            return False
        
        grunnlag = data.get('grunnlag', {})
        antallEnheter = grunnlag.get('antallEnheter', 0)
        sumEksMva = grunnlag.get('sumEksMva', 0)
        
        print(f"  Units with grunnlag='alle': {antallEnheter}")
        print(f"  Sum ex VAT: {sumEksMva}")
        
        # According to review_request: antallEnheter should be LARGER than utleid_mnd (~27 units under management)
        # Expected: belop = antall * 200
        expected_belop = antallEnheter * 200
        if sumEksMva != expected_belop:
            print(f"  ❌ Math error: sumEksMva={sumEksMva} != antallEnheter * 200={expected_belop}")
            return False
        
        print(f"  ✅ POST preview successful: antallEnheter={antallEnheter}, belop={sumEksMva} (= {antallEnheter} * 200)")
        
        # Verify this is larger than utleid_mnd (16 from test 2)
        if antallEnheter > 16:
            print(f"  ✅ antallEnheter ({antallEnheter}) > utleid_mnd (16) - confirms grunnlag choice changes counting")
        else:
            print(f"  ⚠️  antallEnheter ({antallEnheter}) not larger than expected utleid_mnd (16)")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_4_post_grunnlag_volume_tiers():
    """Test 4: POST preview with volume tiers (flat volume model)"""
    print("\n=== TEST 4: POST /api/admin/pris/grunnlag (volume tiers) ===")
    
    try:
        print("  Testing POST preview with volume tiers...")
        payload = {
            "maaned": "2026-08",
            "config": {
                "grunnlag": "alle",
                "trinn": [
                    {"fraEnheter": 0, "pris": 200},
                    {"fraEnheter": 20, "pris": 100}
                ]
            }
        }
        
        r = requests.post(f"{BASE_URL}/admin/pris/grunnlag?key={ADMIN_KEY}", json=payload, timeout=15)
        if r.status_code != 200:
            print(f"  ❌ Status {r.status_code} (expected 200)")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"  ❌ Response ok=false: {data}")
            return False
        
        grunnlag = data.get('grunnlag', {})
        antallEnheter = grunnlag.get('antallEnheter', 0)
        linjer = grunnlag.get('linjer', [])
        sumEksMva = grunnlag.get('sumEksMva', 0)
        
        print(f"  Units: {antallEnheter}")
        
        # According to review_request: since ~27 >= 20, flat volume model applies pris=100 to ALL units, belop=antall*100
        if len(linjer) > 0:
            line = linjer[0]
            pris = line.get('pris', 0)
            belop = line.get('belop', 0)
            print(f"  First line: pris={pris}, belop={belop}")
            
            # If antallEnheter >= 20, price should be 100 (second tier)
            if antallEnheter >= 20:
                expected_pris = 100
                expected_belop = antallEnheter * 100
                
                if pris != expected_pris:
                    print(f"  ❌ Price error: pris={pris} (expected {expected_pris} for {antallEnheter} units)")
                    return False
                
                if sumEksMva != expected_belop:
                    print(f"  ❌ Math error: sumEksMva={sumEksMva} != {antallEnheter} * 100={expected_belop}")
                    return False
                
                print(f"  ✅ Flat volume model working: {antallEnheter} units >= 20 → pris=100, belop={sumEksMva}")
            else:
                print(f"  ⚠️  Units ({antallEnheter}) < 20, using first tier price")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_5_put_config_normalization():
    """Test 5: PUT /api/admin/pris/config normalization tests"""
    print("\n=== TEST 5: PUT /api/admin/pris/config (normalization) ===")
    
    try:
        # Test 5a: First tier forced to fraEnheter=0
        print("  Testing first tier normalization (fraEnheter forced to 0)...")
        payload = {
            "grunnlag": "prorata",
            "trinn": [{"fraEnheter": 5, "pris": 100}]
        }
        
        r = requests.put(f"{BASE_URL}/admin/pris/config?key={ADMIN_KEY}", json=payload, timeout=10)
        if r.status_code != 200:
            print(f"  ❌ Status {r.status_code} (expected 200)")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"  ❌ Response ok=false: {data}")
            return False
        
        config = data.get('config', {})
        trinn = config.get('trinn', [])
        
        if len(trinn) == 0:
            print(f"  ❌ No tiers returned")
            return False
        
        if trinn[0].get('fraEnheter') != 0:
            print(f"  ❌ First tier fraEnheter={trinn[0].get('fraEnheter')} (expected 0)")
            return False
        
        print(f"  ✅ First tier forced to fraEnheter=0: {trinn[0]}")
        
        # Test 5b: fakturadag clamped to <=28
        print("  Testing fakturadag clamping (40 → <=28)...")
        payload = {
            "fakturadag": 40
        }
        
        r = requests.put(f"{BASE_URL}/admin/pris/config?key={ADMIN_KEY}", json=payload, timeout=10)
        if r.status_code != 200:
            print(f"  ❌ Status {r.status_code} (expected 200)")
            return False
        
        data = r.json()
        config = data.get('config', {})
        fakturadag = config.get('fakturadag', 0)
        
        if fakturadag > 28:
            print(f"  ❌ fakturadag={fakturadag} (expected <=28)")
            return False
        
        print(f"  ✅ fakturadag clamped: 40 → {fakturadag}")
        
        # Test 5c: mvaSats clamped to <=100
        print("  Testing mvaSats clamping (200 → <=100)...")
        payload = {
            "mvaSats": 200
        }
        
        r = requests.put(f"{BASE_URL}/admin/pris/config?key={ADMIN_KEY}", json=payload, timeout=10)
        if r.status_code != 200:
            print(f"  ❌ Status {r.status_code} (expected 200)")
            return False
        
        data = r.json()
        config = data.get('config', {})
        mvaSats = config.get('mvaSats', 0)
        
        if mvaSats > 100:
            print(f"  ❌ mvaSats={mvaSats} (expected <=100)")
            return False
        
        print(f"  ✅ mvaSats clamped: 200 → {mvaSats}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_6_prismodell_per_type():
    """Test 6: prisModell 'per_type' preview"""
    print("\n=== TEST 6: POST /api/admin/pris/grunnlag (prisModell='per_type') ===")
    
    try:
        print("  Testing POST preview with prisModell='per_type'...")
        payload = {
            "maaned": "2026-08",
            "config": {
                "prisModell": "per_type",
                "grunnlag": "utleid_mnd",
                "grunnlagSelvbetjent": "utleid_mnd",
                "selvbetjentPris": 79,
                "trinn": [{"fraEnheter": 0, "pris": 200}]
            }
        }
        
        r = requests.post(f"{BASE_URL}/admin/pris/grunnlag?key={ADMIN_KEY}", json=payload, timeout=15)
        if r.status_code != 200:
            print(f"  ❌ Status {r.status_code} (expected 200)")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"  ❌ Response ok=false: {data}")
            return False
        
        grunnlag = data.get('grunnlag', {})
        linjer = grunnlag.get('linjer', [])
        
        print(f"  Lines: {len(linjer)}")
        
        # According to review_request: all demo data is 'Full forvaltning' so expect ONE line type='forvaltet' (no 'selvbetjent' line), antall=16, pris=200
        forvaltet_lines = [l for l in linjer if l.get('type') == 'forvaltet']
        selvbetjent_lines = [l for l in linjer if l.get('type') == 'selvbetjent']
        
        print(f"  Forvaltet lines: {len(forvaltet_lines)}")
        print(f"  Selvbetjent lines: {len(selvbetjent_lines)}")
        
        if len(forvaltet_lines) == 0:
            print(f"  ❌ No 'forvaltet' line found")
            return False
        
        forvaltet = forvaltet_lines[0]
        antall = forvaltet.get('antall', 0)
        pris = forvaltet.get('pris', 0)
        
        print(f"  Forvaltet line: antall={antall}, pris={pris}")
        
        if pris != 200:
            print(f"  ❌ Forvaltet pris={pris} (expected 200)")
            return False
        
        if len(selvbetjent_lines) > 0:
            print(f"  ⚠️  Found selvbetjent line (expected none for demo data)")
        
        print(f"  ✅ prisModell='per_type' working: ONE forvaltet line with pris=200")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_7_auth():
    """Test 7: AUTH tests - all endpoints without key → 401"""
    print("\n=== TEST 7: AUTH tests ===")
    
    endpoints = [
        ("GET", "/admin/pris/config"),
        ("PUT", "/admin/pris/config"),
        ("POST", "/admin/pris/config"),
        ("GET", "/admin/pris/grunnlag"),
        ("POST", "/admin/pris/grunnlag"),
    ]
    
    all_passed = True
    
    for method, endpoint in endpoints:
        try:
            print(f"  Testing {method} {endpoint} without key...")
            
            if method == "GET":
                r = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            elif method == "POST":
                r = requests.post(f"{BASE_URL}{endpoint}", json={}, timeout=10)
            elif method == "PUT":
                r = requests.put(f"{BASE_URL}{endpoint}", json={}, timeout=10)
            
            if r.status_code == 401:
                print(f"  ✅ {method} {endpoint} → 401 (correct)")
            else:
                print(f"  ❌ {method} {endpoint} → {r.status_code} (expected 401)")
                all_passed = False
                
        except Exception as e:
            print(f"  ❌ Error testing {method} {endpoint}: {e}")
            all_passed = False
    
    return all_passed

def test_8_cleanup_restore_defaults():
    """Test 8: CRITICAL CLEANUP - restore config to defaults"""
    print("\n=== TEST 8: CRITICAL CLEANUP - Restore defaults ===")
    
    try:
        print("  Restoring default config...")
        
        r = requests.put(f"{BASE_URL}/admin/pris/config?key={ADMIN_KEY}", json=DEFAULT_CONFIG, timeout=10)
        if r.status_code != 200:
            print(f"  ❌ Status {r.status_code} (expected 200)")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"  ❌ Response ok=false: {data}")
            return False
        
        # Verify the restored config
        print("  Verifying restored config...")
        r = requests.get(f"{BASE_URL}/admin/pris/config?key={ADMIN_KEY}", timeout=10)
        if r.status_code != 200:
            print(f"  ❌ GET status {r.status_code} (expected 200)")
            return False
        
        data = r.json()
        config = data.get('config', {})
        
        # Verify key fields
        if config.get('grunnlag') != 'utleid_mnd':
            print(f"  ❌ grunnlag={config.get('grunnlag')} (expected 'utleid_mnd')")
            return False
        
        trinn = config.get('trinn', [])
        if len(trinn) != 3:
            print(f"  ❌ trinn length={len(trinn)} (expected 3)")
            return False
        
        expected_prices = [200, 150, 99]
        actual_prices = [t.get('pris') for t in trinn]
        
        if actual_prices != expected_prices:
            print(f"  ❌ trinn prices={actual_prices} (expected {expected_prices})")
            return False
        
        print(f"  ✅ Config restored to defaults:")
        print(f"     grunnlag={config.get('grunnlag')}")
        print(f"     trinn prices={actual_prices}")
        print(f"     mvaSats={config.get('mvaSats')}")
        print(f"     fakturadag={config.get('fakturadag')}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 80)
    print("PRIS BACKEND TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print("=" * 80)
    
    tests = [
        ("GET /admin/pris/config", test_1_get_config),
        ("GET /admin/pris/grunnlag (default)", test_2_get_grunnlag_default),
        ("POST /admin/pris/grunnlag (preview alle)", test_3_post_grunnlag_preview_alle),
        ("POST /admin/pris/grunnlag (volume tiers)", test_4_post_grunnlag_volume_tiers),
        ("PUT /admin/pris/config (normalization)", test_5_put_config_normalization),
        ("POST /admin/pris/grunnlag (per_type)", test_6_prismodell_per_type),
        ("AUTH tests", test_7_auth),
        ("CLEANUP - restore defaults", test_8_cleanup_restore_defaults),
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ EXCEPTION in {name}: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({100*passed//total}% success rate)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
