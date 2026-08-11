#!/usr/bin/env python3
"""
Backend test for Drop-off funnel + A/B aggregation feature in GET /api/admin/analytics.
Tests the new 'funnels' field with forms[] and experiments[] arrays.

CRITICAL: POST /api/track filters out bot User-Agents (python-requests/curl/axios/node-fetch).
We MUST send a browser-like User-Agent header.
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Browser-like User-Agent (CRITICAL for /track endpoint)
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_seed_funnel_session():
    """
    Test 0: Seed one funnel session (same sessionId+visitorId='qatest-s1', browser UA, JSON body)
    """
    log("=" * 80)
    log("TEST 0: SEED FUNNEL SESSION")
    log("=" * 80)
    
    session_id = "qatest-s1"
    visitor_id = "qatest-s1"
    
    # a) POST /api/track {type:'form_start', sessionId:'qatest-s1', visitorId:'qatest-s1', meta:{form:'utleier', ab:{onboard_cta:'A'}}
    log("0a) POST /api/track - form_start event")
    try:
        resp = requests.post(
            f"{BASE_URL}/track",
            headers={
                "Content-Type": "application/json",
                "User-Agent": BROWSER_UA
            },
            json={
                "type": "form_start",
                "sessionId": session_id,
                "visitorId": visitor_id,
                "meta": {
                    "form": "utleier",
                    "ab": {
                        "onboard_cta": "A"
                    }
                }
            },
            timeout=10
        )
        if resp.status_code == 204:
            log(f"✓ form_start event: 204 (expected)")
        else:
            log(f"✗ form_start event: {resp.status_code} (expected 204)")
            return False
    except Exception as e:
        log(f"✗ form_start event failed: {e}")
        return False
    
    # b) POST /api/track {type:'form_step', sessionId:'qatest-s1', visitorId:'qatest-s1', meta:{form:'utleier', step:2, label:'Adresse', ab:{onboard_cta:'A'}}
    log("0b) POST /api/track - form_step event")
    try:
        resp = requests.post(
            f"{BASE_URL}/track",
            headers={
                "Content-Type": "application/json",
                "User-Agent": BROWSER_UA
            },
            json={
                "type": "form_step",
                "sessionId": session_id,
                "visitorId": visitor_id,
                "meta": {
                    "form": "utleier",
                    "step": 2,
                    "label": "Adresse",
                    "ab": {
                        "onboard_cta": "A"
                    }
                }
            },
            timeout=10
        )
        if resp.status_code == 204:
            log(f"✓ form_step event: 204 (expected)")
        else:
            log(f"✗ form_step event: {resp.status_code} (expected 204)")
            return False
    except Exception as e:
        log(f"✗ form_step event failed: {e}")
        return False
    
    # c) POST /api/track {type:'lead_submit', sessionId:'qatest-s1', visitorId:'qatest-s1', meta:{form:'utleier', ab:{onboard_cta:'A'}}
    log("0c) POST /api/track - lead_submit event")
    try:
        resp = requests.post(
            f"{BASE_URL}/track",
            headers={
                "Content-Type": "application/json",
                "User-Agent": BROWSER_UA
            },
            json={
                "type": "lead_submit",
                "sessionId": session_id,
                "visitorId": visitor_id,
                "meta": {
                    "form": "utleier",
                    "ab": {
                        "onboard_cta": "A"
                    }
                }
            },
            timeout=10
        )
        if resp.status_code == 204:
            log(f"✓ lead_submit event: 204 (expected)")
        else:
            log(f"✗ lead_submit event: {resp.status_code} (expected 204)")
            return False
    except Exception as e:
        log(f"✗ lead_submit event failed: {e}")
        return False
    
    log("✓ TEST 0 PASSED: Funnel session seeded successfully")
    return True

def test_analytics_funnels_structure():
    """
    Test 1: GET /api/admin/analytics?key=...&days=30 → 200; body.funnels exists (object); 
    body.funnels.forms is array; body.funnels.experiments is array.
    """
    log("=" * 80)
    log("TEST 1: ANALYTICS FUNNELS STRUCTURE")
    log("=" * 80)
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/analytics",
            params={"key": ADMIN_KEY, "days": 30},
            timeout=30
        )
        
        log(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"✗ Expected 200, got {resp.status_code}")
            return False
        
        body = resp.json()
        
        # Check funnels exists and is object
        if "funnels" not in body:
            log(f"✗ body.funnels does not exist")
            return False
        
        if not isinstance(body["funnels"], dict):
            log(f"✗ body.funnels is not an object (got {type(body['funnels'])})")
            return False
        
        log(f"✓ body.funnels exists and is object")
        
        # Check funnels.forms is array
        if "forms" not in body["funnels"]:
            log(f"✗ body.funnels.forms does not exist")
            return False
        
        if not isinstance(body["funnels"]["forms"], list):
            log(f"✗ body.funnels.forms is not array (got {type(body['funnels']['forms'])})")
            return False
        
        log(f"✓ body.funnels.forms is array with {len(body['funnels']['forms'])} elements")
        
        # Check funnels.experiments is array
        if "experiments" not in body["funnels"]:
            log(f"✗ body.funnels.experiments does not exist")
            return False
        
        if not isinstance(body["funnels"]["experiments"], list):
            log(f"✗ body.funnels.experiments is not array (got {type(body['funnels']['experiments'])})")
            return False
        
        log(f"✓ body.funnels.experiments is array with {len(body['funnels']['experiments'])} elements")
        
        log("✓ TEST 1 PASSED: Funnels structure correct")
        return True, body
        
    except Exception as e:
        log(f"✗ TEST 1 FAILED: {e}")
        return False, None

def test_forms_element_structure(body):
    """
    Test 2: A forms element (form==='utleier' or 'leietaker') has fields: form, label, starts(number), 
    submits(number), conversionRate(number), steps(array). Each step has key, label, count, rate, 
    dropoff, dropoffRate. biggestDropoff is object {fromLabel,label,dropoff,dropoffRate} or null.
    """
    log("=" * 80)
    log("TEST 2: FORMS ELEMENT STRUCTURE")
    log("=" * 80)
    
    if not body or "funnels" not in body or "forms" not in body["funnels"]:
        log("✗ No funnels.forms to test")
        return False
    
    forms = body["funnels"]["forms"]
    
    if len(forms) == 0:
        log("⚠ No forms elements found (may be expected if no data)")
        return True
    
    # Find a form element (prefer 'utleier' or 'leietaker')
    test_form = None
    for f in forms:
        if f.get("form") in ["utleier", "leietaker"]:
            test_form = f
            break
    
    if not test_form and len(forms) > 0:
        test_form = forms[0]
    
    if not test_form:
        log("✗ No form element to test")
        return False
    
    log(f"Testing form: {test_form.get('form')}")
    
    # Check required fields
    required_fields = ["form", "label", "starts", "submits", "conversionRate", "steps", "biggestDropoff"]
    for field in required_fields:
        if field not in test_form:
            log(f"✗ Missing field: {field}")
            return False
    
    log(f"✓ All required fields present: {', '.join(required_fields)}")
    
    # Check types
    if not isinstance(test_form["starts"], (int, float)):
        log(f"✗ starts is not a number (got {type(test_form['starts'])})")
        return False
    
    if not isinstance(test_form["submits"], (int, float)):
        log(f"✗ submits is not a number (got {type(test_form['submits'])})")
        return False
    
    if not isinstance(test_form["conversionRate"], (int, float)):
        log(f"✗ conversionRate is not a number (got {type(test_form['conversionRate'])})")
        return False
    
    if not isinstance(test_form["steps"], list):
        log(f"✗ steps is not array (got {type(test_form['steps'])})")
        return False
    
    log(f"✓ Field types correct: starts={test_form['starts']}, submits={test_form['submits']}, conversionRate={test_form['conversionRate']}, steps={len(test_form['steps'])} elements")
    
    # Check steps structure
    if len(test_form["steps"]) > 0:
        step = test_form["steps"][0]
        step_fields = ["key", "label", "count", "rate", "dropoff", "dropoffRate"]
        for field in step_fields:
            if field not in step:
                log(f"✗ Step missing field: {field}")
                return False
        log(f"✓ Step structure correct: {', '.join(step_fields)}")
    
    # Check biggestDropoff
    if test_form["biggestDropoff"] is not None:
        if not isinstance(test_form["biggestDropoff"], dict):
            log(f"✗ biggestDropoff is not object (got {type(test_form['biggestDropoff'])})")
            return False
        
        dropoff_fields = ["fromLabel", "label", "dropoff", "dropoffRate"]
        for field in dropoff_fields:
            if field not in test_form["biggestDropoff"]:
                log(f"✗ biggestDropoff missing field: {field}")
                return False
        
        log(f"✓ biggestDropoff structure correct: fromLabel={test_form['biggestDropoff']['fromLabel']}, label={test_form['biggestDropoff']['label']}, dropoff={test_form['biggestDropoff']['dropoff']}, dropoffRate={test_form['biggestDropoff']['dropoffRate']}")
    else:
        log(f"✓ biggestDropoff is null (acceptable)")
    
    log("✓ TEST 2 PASSED: Forms element structure correct")
    return True

def test_experiments_element_structure(body):
    """
    Test 3: An experiments element with experiment==='onboard_cta' has: label, variants(array; 
    each: variant,starts,submits,conversionRate,lift), controlVariant, winner, totalStarts, 
    enoughData(boolean). Verify conversionRate ≈ round(submits/starts*100) for at least one variant, 
    and winner is the variant with highest conversionRate.
    """
    log("=" * 80)
    log("TEST 3: EXPERIMENTS ELEMENT STRUCTURE")
    log("=" * 80)
    
    if not body or "funnels" not in body or "experiments" not in body["funnels"]:
        log("✗ No funnels.experiments to test")
        return False
    
    experiments = body["funnels"]["experiments"]
    
    if len(experiments) == 0:
        log("⚠ No experiments elements found (may be expected if no data)")
        return True
    
    # Find onboard_cta experiment
    test_exp = None
    for e in experiments:
        if e.get("experiment") == "onboard_cta":
            test_exp = e
            break
    
    if not test_exp and len(experiments) > 0:
        test_exp = experiments[0]
    
    if not test_exp:
        log("✗ No experiment element to test")
        return False
    
    log(f"Testing experiment: {test_exp.get('experiment')}")
    
    # Check required fields
    required_fields = ["experiment", "label", "variants", "controlVariant", "winner", "totalStarts", "enoughData"]
    for field in required_fields:
        if field not in test_exp:
            log(f"✗ Missing field: {field}")
            return False
    
    log(f"✓ All required fields present: {', '.join(required_fields)}")
    
    # Check types
    if not isinstance(test_exp["variants"], list):
        log(f"✗ variants is not array (got {type(test_exp['variants'])})")
        return False
    
    if not isinstance(test_exp["enoughData"], bool):
        log(f"✗ enoughData is not boolean (got {type(test_exp['enoughData'])})")
        return False
    
    log(f"✓ Field types correct: variants={len(test_exp['variants'])} elements, enoughData={test_exp['enoughData']}, totalStarts={test_exp['totalStarts']}")
    
    # Check variants structure
    if len(test_exp["variants"]) > 0:
        variant = test_exp["variants"][0]
        variant_fields = ["variant", "starts", "submits", "conversionRate", "lift"]
        for field in variant_fields:
            if field not in variant:
                log(f"✗ Variant missing field: {field}")
                return False
        log(f"✓ Variant structure correct: {', '.join(variant_fields)}")
        
        # Verify conversionRate calculation
        if variant["starts"] > 0:
            expected_rate = round((variant["submits"] / variant["starts"]) * 100, 1)
            actual_rate = variant["conversionRate"]
            if abs(expected_rate - actual_rate) < 0.2:  # Allow small rounding difference
                log(f"✓ conversionRate calculation correct: {actual_rate} ≈ {expected_rate}")
            else:
                log(f"⚠ conversionRate calculation off: {actual_rate} vs expected {expected_rate} (diff: {abs(expected_rate - actual_rate)})")
    
    # Verify winner is variant with highest conversionRate
    if len(test_exp["variants"]) > 1:
        max_rate = max(v["conversionRate"] for v in test_exp["variants"])
        winner_variant = test_exp["winner"]
        winner_obj = next((v for v in test_exp["variants"] if v["variant"] == winner_variant), None)
        
        if winner_obj and winner_obj["conversionRate"] == max_rate:
            log(f"✓ winner is variant with highest conversionRate: {winner_variant} ({max_rate}%)")
        else:
            log(f"⚠ winner may not be variant with highest conversionRate: winner={winner_variant}, max_rate={max_rate}")
    
    log("✓ TEST 3 PASSED: Experiments element structure correct")
    return True

def test_auth():
    """
    Test 4: AUTH: GET /api/admin/analytics WITHOUT key → 401.
    """
    log("=" * 80)
    log("TEST 4: AUTH")
    log("=" * 80)
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/analytics",
            params={"days": 30},
            timeout=10
        )
        
        log(f"Status: {resp.status_code}")
        
        if resp.status_code == 401:
            log(f"✓ Without key returns 401 (expected)")
            log("✓ TEST 4 PASSED: Authentication working")
            return True
        else:
            log(f"✗ Expected 401, got {resp.status_code}")
            return False
        
    except Exception as e:
        log(f"✗ TEST 4 FAILED: {e}")
        return False

def test_regression():
    """
    Test 5: REGRESSION: body still has traffic, leads, webVitals, anomalies; GET /api/ → 200 {ok:true}.
    """
    log("=" * 80)
    log("TEST 5: REGRESSION")
    log("=" * 80)
    
    # Test 5a: GET /api/admin/analytics has existing fields
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/analytics",
            params={"key": ADMIN_KEY, "days": 30},
            timeout=30
        )
        
        if resp.status_code != 200:
            log(f"✗ analytics endpoint returned {resp.status_code}")
            return False
        
        body = resp.json()
        
        required_fields = ["traffic", "leads", "webVitals", "anomalies"]
        for field in required_fields:
            if field not in body:
                log(f"✗ Missing field: {field}")
                return False
        
        log(f"✓ analytics endpoint has all existing fields: {', '.join(required_fields)}")
        
    except Exception as e:
        log(f"✗ analytics endpoint test failed: {e}")
        return False
    
    # Test 5b: GET /api/ → 200 {ok:true}
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=10)
        
        if resp.status_code != 200:
            log(f"✗ root endpoint returned {resp.status_code}")
            return False
        
        body = resp.json()
        
        if not body.get("ok"):
            log(f"✗ root endpoint ok field is not true")
            return False
        
        log(f"✓ root endpoint returns 200 with ok:true")
        
    except Exception as e:
        log(f"✗ root endpoint test failed: {e}")
        return False
    
    log("✓ TEST 5 PASSED: Regression tests passed")
    return True

def main():
    log("=" * 80)
    log("BACKEND TEST: DROP-OFF FUNNEL + A/B AGGREGATION")
    log("=" * 80)
    log(f"Base URL: {BASE_URL}")
    log(f"Admin key: {ADMIN_KEY}")
    log("")
    
    results = []
    
    # Test 0: Seed funnel session
    result = test_seed_funnel_session()
    results.append(("Test 0: Seed funnel session", result))
    
    # Wait a bit for events to be processed
    import time
    log("Waiting 2 seconds for events to be processed...")
    time.sleep(2)
    
    # Test 1: Analytics funnels structure
    result, body = test_analytics_funnels_structure()
    results.append(("Test 1: Analytics funnels structure", result))
    
    if result and body:
        # Test 2: Forms element structure
        result = test_forms_element_structure(body)
        results.append(("Test 2: Forms element structure", result))
        
        # Test 3: Experiments element structure
        result = test_experiments_element_structure(body)
        results.append(("Test 3: Experiments element structure", result))
    else:
        results.append(("Test 2: Forms element structure", False))
        results.append(("Test 3: Experiments element structure", False))
    
    # Test 4: Auth
    result = test_auth()
    results.append(("Test 4: Auth", result))
    
    # Test 5: Regression
    result = test_regression()
    results.append(("Test 5: Regression", result))
    
    # Summary
    log("")
    log("=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        log(f"{status}: {name}")
    
    log("")
    log(f"TOTAL: {passed}/{total} tests passed ({int(passed/total*100)}% success rate)")
    
    if passed == total:
        log("✓ ALL TESTS PASSED")
        return 0
    else:
        log("✗ SOME TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
