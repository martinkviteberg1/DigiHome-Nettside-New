#!/usr/bin/env python3
"""
Backend regression test for SELVFORVALTNING catalog refactoring.
Tests that WIZARD_CATALOG_DEFAULT was correctly moved from route.js to lib/catalog.js.
"""

import requests
import sys
import json
from bs4 import BeautifulSoup

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test counters
tests_passed = 0
tests_failed = 0

def log_test(name, passed, details=""):
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        print(f"✅ {name}")
        if details:
            print(f"   {details}")
    else:
        tests_failed += 1
        print(f"❌ {name}")
        if details:
            print(f"   {details}")

def test_catalog_api():
    """Test 1: GET /api/wizard/catalog returns correct structure and values"""
    print("\n=== TEST 1: CATALOG API ===")
    
    try:
        r = requests.get(f"{BASE_URL}/api/wizard/catalog", timeout=30)
        log_test("GET /api/wizard/catalog returns 200", r.status_code == 200, f"Status: {r.status_code}")
        
        if r.status_code != 200:
            return
        
        data = r.json()
        log_test("Response has ok:true", data.get("ok") == True)
        log_test("Response has source field", "source" in data)
        
        # Get catalog object
        catalog = data.get("catalog", {})
        
        # Verify serviceLevels
        levels = catalog.get("serviceLevels", [])
        log_test("serviceLevels is array", isinstance(levels, list))
        
        # Find selvbetjent level
        selvbetjent = next((l for l in levels if l.get("key") == "selvbetjent"), None)
        if selvbetjent:
            log_test("selvbetjent level exists", True)
            log_test("selvbetjent pct = 5", selvbetjent.get("pct") == 5, f"pct: {selvbetjent.get('pct')}")
            log_test("selvbetjent minMonthly = 500", selvbetjent.get("minMonthly") == 500, f"minMonthly: {selvbetjent.get('minMonthly')}")
            
            included = selvbetjent.get("included", [])
            log_test("selvbetjent has 6 included items", len(included) == 6, f"Count: {len(included)}")
            
            notIncluded = selvbetjent.get("notIncluded", [])
            log_test("selvbetjent has 3 notIncluded items", len(notIncluded) == 3, f"Count: {len(notIncluded)}")
        else:
            log_test("selvbetjent level exists", False, "NOT FOUND")
        
        # Find fullforvaltning level
        full = next((l for l in levels if l.get("key") == "fullforvaltning"), None)
        if full:
            log_test("fullforvaltning level exists", True)
            log_test("fullforvaltning pct = 10", full.get("pct") == 10, f"pct: {full.get('pct')}")
            log_test("fullforvaltning minMonthly = 0", full.get("minMonthly") == 0, f"minMonthly: {full.get('minMonthly')}")
        else:
            log_test("fullforvaltning level exists", False, "NOT FOUND")
        
        # Verify models
        models = catalog.get("models", [])
        log_test("models has 2 entries", len(models) == 2, f"Count: {len(models)}")
        
        hybrid = next((m for m in models if m.get("key") == "hybrid"), None)
        if hybrid:
            log_test("hybrid model exists", True)
            log_test("hybrid has upliftPct = 25", hybrid.get("upliftPct") == 25, f"upliftPct: {hybrid.get('upliftPct')}")
        else:
            log_test("hybrid model exists", False, "NOT FOUND")
        
        # Verify addons
        addons = catalog.get("addons", [])
        log_test("addons has 6 entries", len(addons) == 6, f"Count: {len(addons)}")
        
        visningshjelp = next((a for a in addons if a.get("key") == "visningshjelp"), None)
        if visningshjelp:
            log_test("visningshjelp addon exists", True)
            log_test("visningshjelp price = 1490", visningshjelp.get("price") == 1490, f"price: {visningshjelp.get('price')}")
            log_test("visningshjelp for = 'selvbetjent'", visningshjelp.get("for") == "selvbetjent", f"for: {visningshjelp.get('for')}")
        else:
            log_test("visningshjelp addon exists", False, "NOT FOUND")
        
    except Exception as e:
        log_test("GET /api/wizard/catalog", False, f"Exception: {str(e)}")

def test_catalog_auth():
    """Test 2: PUT /api/admin/wizard/catalog auth validation"""
    print("\n=== TEST 2: CATALOG AUTH ===")
    
    try:
        # Test without key
        r = requests.put(f"{BASE_URL}/api/admin/wizard/catalog", json={}, timeout=30)
        log_test("PUT without key returns 401", r.status_code == 401, f"Status: {r.status_code}")
        
        # Test with key but invalid body (no catalog object)
        r = requests.put(f"{BASE_URL}/api/admin/wizard/catalog?key={ADMIN_KEY}", json={}, timeout=30)
        log_test("PUT with key but no catalog returns 400", r.status_code == 400, f"Status: {r.status_code}")
        
    except Exception as e:
        log_test("PUT /api/admin/wizard/catalog auth", False, f"Exception: {str(e)}")

def test_product_page():
    """Test 3: GET /selvforvaltning page content and JSON-LD"""
    print("\n=== TEST 3: PRODUCT PAGE /selvforvaltning ===")
    
    try:
        r = requests.get(f"{BASE_URL}/selvforvaltning", timeout=30)
        log_test("GET /selvforvaltning returns 200", r.status_code == 200, f"Status: {r.status_code}")
        
        if r.status_code != 200:
            return
        
        html = r.text
        soup = BeautifulSoup(html, 'html.parser')
        
        # Check H1
        h1 = soup.find('h1')
        expected_h1 = "Leie ut boligen selv — du velger leietaker, vi holder orden på resten"
        if h1:
            h1_text = h1.get_text(strip=True)
            log_test("H1 matches expected text", expected_h1 in h1_text, f"H1: {h1_text[:100]}")
        else:
            log_test("H1 exists", False, "H1 not found")
        
        # Check for dashboard illustration text
        dashboard_text = "Illustrasjon av utleiedashboardet"
        log_test("Dashboard illustration text exists", dashboard_text in html, f"Found: {dashboard_text in html}")
        
        # Check H2s
        h2s = [h2.get_text(strip=True) for h2 in soup.find_all('h2')]
        log_test("H2 'Hvem gjør hva' exists", any("Hvem gjør hva" in h2 for h2 in h2s), f"H2s: {h2s[:5]}")
        log_test("H2 'Slik kommer du i gang' exists", any("Slik kommer du i gang" in h2 for h2 in h2s), f"H2s: {h2s[:5]}")
        log_test("H2 'Hva det koster' exists", any("Hva det koster" in h2 for h2 in h2s), f"H2s: {h2s[:5]}")
        
        # Check JSON-LD schemas
        scripts = soup.find_all('script', type='application/ld+json')
        schemas = []
        for script in scripts:
            try:
                schema = json.loads(script.string)
                if isinstance(schema, dict):
                    schemas.append(schema)
                elif isinstance(schema, list):
                    schemas.extend(schema)
            except:
                pass
        
        # Check for BreadcrumbList
        breadcrumb = next((s for s in schemas if s.get("@type") == "BreadcrumbList"), None)
        if breadcrumb:
            items = breadcrumb.get("itemListElement", [])
            log_test("BreadcrumbList exists with at least 2 levels", len(items) >= 2, f"Levels: {len(items)}")
        else:
            log_test("BreadcrumbList exists", False, "NOT FOUND")
        
        # Check for Service schema
        service = next((s for s in schemas if s.get("@type") == "Service"), None)
        log_test("Service schema exists", service is not None)
        
        # Check for HowTo schema
        howto = next((s for s in schemas if s.get("@type") == "HowTo"), None)
        if howto:
            steps = howto.get("step", [])
            log_test("HowTo schema exists with 3 steps", len(steps) == 3, f"Steps: {len(steps)}")
        else:
            log_test("HowTo schema exists", False, "NOT FOUND")
        
        # Check for FAQPage schema
        faq = next((s for s in schemas if s.get("@type") == "FAQPage"), None)
        if faq:
            questions = faq.get("mainEntity", [])
            log_test("FAQPage schema exists with 6 questions", len(questions) == 6, f"Questions: {len(questions)}")
            
            # Check for specific FAQ question
            cost_question = next((q for q in questions if "Hva koster selvforvaltning" in q.get("name", "")), None)
            if cost_question:
                answer = cost_question.get("acceptedAnswer", {}).get("text", "")
                log_test("FAQ 'Hva koster selvforvaltning?' exists", True)
                log_test("FAQ answer contains '5 %'", "5 %" in answer or "5%" in answer, f"Answer snippet: {answer[:100]}")
                log_test("FAQ answer contains '500'", "500" in answer, f"Answer snippet: {answer[:100]}")
            else:
                log_test("FAQ 'Hva koster selvforvaltning?' exists", False, "NOT FOUND")
        else:
            log_test("FAQPage schema exists", False, "NOT FOUND")
        
        # Verify prices match API
        # Get catalog from API
        api_r = requests.get(f"{BASE_URL}/api/wizard/catalog", timeout=30)
        if api_r.status_code == 200:
            api_data = api_r.json()
            api_catalog = api_data.get("catalog", {})
            api_levels = api_catalog.get("serviceLevels", [])
            api_selvbetjent = next((l for l in api_levels if l.get("key") == "selvbetjent"), None)
            
            if api_selvbetjent:
                api_pct = api_selvbetjent.get("pct")
                api_min = api_selvbetjent.get("minMonthly")
                
                # Check if these values appear in the HTML
                log_test(f"Page shows {api_pct} % (matches API)", f"{api_pct} %" in html or f"{api_pct}%" in html)
                log_test(f"Page shows {api_min} kr (matches API)", f"{api_min}" in html)
        
    except Exception as e:
        log_test("GET /selvforvaltning", False, f"Exception: {str(e)}")

def test_onboarding_entry():
    """Test 4: Onboarding entry points"""
    print("\n=== TEST 4: ONBOARDING ENTRY ===")
    
    try:
        # Test basic tier parameter
        r = requests.get(f"{BASE_URL}/bli-utleier/start?tier=selvforvaltning", timeout=30)
        log_test("GET /bli-utleier/start?tier=selvforvaltning returns 200", r.status_code == 200, f"Status: {r.status_code}")
        
        # Test with address parameters
        r = requests.get(f"{BASE_URL}/bli-utleier/start?tier=selvforvaltning&address=Fjellveien%2024B&postal=5019&city=Bergen", timeout=30)
        log_test("GET /bli-utleier/start with address params returns 200", r.status_code == 200, f"Status: {r.status_code}")
        
    except Exception as e:
        log_test("Onboarding entry", False, f"Exception: {str(e)}")

def test_api_regression():
    """Test 5: API regression tests"""
    print("\n=== TEST 5: API REGRESSION ===")
    
    try:
        # Health check
        r = requests.get(f"{BASE_URL}/api/health", timeout=30)
        log_test("GET /api/health returns 200", r.status_code == 200, f"Status: {r.status_code}")
        
        # Public listings
        r = requests.get(f"{BASE_URL}/api/public/listings", timeout=30)
        log_test("GET /api/public/listings returns 200", r.status_code == 200, f"Status: {r.status_code}")
        
        # Admin leads with auth
        r = requests.get(f"{BASE_URL}/api/admin/leads?key={ADMIN_KEY}", timeout=30)
        log_test("GET /api/admin/leads with key returns 200", r.status_code == 200, f"Status: {r.status_code}")
        
        # Admin leads without auth
        r = requests.get(f"{BASE_URL}/api/admin/leads", timeout=30)
        log_test("GET /api/admin/leads without key returns 401", r.status_code == 401, f"Status: {r.status_code}")
        
        # KPI with hero.cpl fields
        r = requests.get(f"{BASE_URL}/api/admin/kpi?key={ADMIN_KEY}&days=30", timeout=30)
        if r.status_code == 200:
            data = r.json()
            hero = data.get("hero", {})
            cpl = hero.get("cpl", {})
            has_cpl_fields = all(k in cpl for k in ["value", "paid", "paidLeads", "allLeads", "organicLeads", "basis"])
            log_test("GET /api/admin/kpi returns 200 with hero.cpl fields", has_cpl_fields, f"CPL fields: {list(cpl.keys())}")
        else:
            log_test("GET /api/admin/kpi returns 200", False, f"Status: {r.status_code}")
        
        # Analytics with paid block
        r = requests.get(f"{BASE_URL}/api/admin/analytics?key={ADMIN_KEY}&days=30", timeout=30)
        if r.status_code == 200:
            data = r.json()
            paid = data.get("paid", {})
            channels = paid.get("channels", [])
            log_test("GET /api/admin/analytics returns 200 with paid.channels", len(channels) > 0, f"Channels: {len(channels)}")
        else:
            log_test("GET /api/admin/analytics returns 200", False, f"Status: {r.status_code}")
        
        # BRREG
        r = requests.get(f"{BASE_URL}/api/brreg?q=DNB", timeout=30)
        if r.status_code == 200:
            data = r.json()
            items = data.get("items", [])
            if items:
                first = items[0].get("name", "")
                log_test("GET /api/brreg?q=DNB returns DNB BANK ASA first", "DNB BANK ASA" in first, f"First: {first}")
            else:
                log_test("GET /api/brreg?q=DNB returns items", False, "No items")
        else:
            log_test("GET /api/brreg?q=DNB returns 200", False, f"Status: {r.status_code}")
        
        # Property interest outbox
        r = requests.get(f"{BASE_URL}/api/property-interest/outbox?key={ADMIN_KEY}", timeout=30)
        log_test("GET /api/property-interest/outbox returns 200", r.status_code == 200, f"Status: {r.status_code}")
        
        # Track event (create and delete)
        track_payload = {
            "type": "cta_click",
            "page": "/test",
            "cta": "test-button"
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        r = requests.post(f"{BASE_URL}/api/track", json=track_payload, headers=headers, timeout=30)
        log_test("POST /api/track returns 204", r.status_code == 204, f"Status: {r.status_code}")
        
        # Verify event was saved with correct type
        # Note: We can't easily verify this without direct DB access, so we'll trust the 204 response
        
    except Exception as e:
        log_test("API regression", False, f"Exception: {str(e)}")

def run_reference_scripts():
    """Test 6: Run reference scripts"""
    print("\n=== TEST 6: REFERENCE SCRIPTS ===")
    
    import subprocess
    
    try:
        # Run probe-seo-aeo.mjs
        result = subprocess.run(
            ["node", "/app/scripts/probe-seo-aeo.mjs"],
            capture_output=True,
            text=True,
            timeout=120,
            cwd="/app"
        )
        
        output = result.stdout + result.stderr
        
        # Parse output for OK and FEIL counts
        log_test("probe-seo-aeo.mjs runs successfully", result.returncode == 0, f"Exit code: {result.returncode}")
        
        # Check for the exact pattern in output
        has_528_ok = "OK:   528" in output or "OK: 528" in output
        has_0_feil = "FEIL: 0" in output or "feil: 0" in output
        
        log_test("probe-seo-aeo.mjs shows 528 OK", has_528_ok, f"Found in output: {has_528_ok}")
        log_test("probe-seo-aeo.mjs shows 0 FEIL", has_0_feil, f"Found in output: {has_0_feil}")
        
    except subprocess.TimeoutExpired:
        log_test("probe-seo-aeo.mjs", False, "Timeout after 120s")
    except Exception as e:
        log_test("probe-seo-aeo.mjs", False, f"Exception: {str(e)}")
    
    try:
        # Run probe-owner-business.mjs
        result = subprocess.run(
            ["node", "--import", "./scripts/_alias-loader.mjs", "scripts/probe-owner-business.mjs"],
            capture_output=True,
            text=True,
            timeout=120,
            cwd="/app"
        )
        
        output = result.stdout + result.stderr
        
        log_test("probe-owner-business.mjs runs successfully", result.returncode == 0, f"Exit code: {result.returncode}")
        log_test("probe-owner-business.mjs shows 67 OK", "67 OK" in output, f"Output contains: {output[-200:]}")
        log_test("probe-owner-business.mjs shows 0 feil", "0 feil" in output, f"Output contains: {output[-200:]}")
        
    except subprocess.TimeoutExpired:
        log_test("probe-owner-business.mjs", False, "Timeout after 120s")
    except Exception as e:
        log_test("probe-owner-business.mjs", False, f"Exception: {str(e)}")

def main():
    print("=" * 80)
    print("BACKEND REGRESSION TEST: SELVFORVALTNING CATALOG REFACTORING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print()
    
    test_catalog_api()
    test_catalog_auth()
    test_product_page()
    test_onboarding_entry()
    test_api_regression()
    run_reference_scripts()
    
    print("\n" + "=" * 80)
    print(f"RESULTS: {tests_passed} passed, {tests_failed} failed")
    print("=" * 80)
    
    if tests_failed > 0:
        sys.exit(1)
    else:
        print("\n✅ ALL TESTS PASSED")
        sys.exit(0)

if __name__ == "__main__":
    main()
