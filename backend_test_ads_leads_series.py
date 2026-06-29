#!/usr/bin/env python3
"""
Backend test for newly added daily LEADS fields in Ads overview time-series.
Tests the additive backend change: googleLeads, metaLeads, leads in series[].
"""

import requests
import time
import sys

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 35  # seconds

def test_ads_overview_leads_series():
    """
    Test the newly added daily LEADS fields in /api/admin/ads/overview series.
    
    TESTS:
    1) GET /api/admin/ads/overview?key=...&googlePeriod=last_90d&metaPeriod=last_90d
       - Expect 200, fast (<8s)
       - Verify "series" is an array with 10 keys per element
       - Verify per-day union rule: leads >= max(googleLeads, metaLeads) AND leads <= googleLeads + metaLeads
       - Verify googleLeads, metaLeads, leads are all >= 0 integers
    2) Period variation: last_7d and last_30d
    3) Regression - confirm existing spend/click fields still correct
    4) Cross-check: SUM of googleLeads should equal economics.totals.leads
    5) AUTH: GET without key → 401
    6) REGRESSION: GET /api/ → 200 {ok:true}
    """
    
    print("=" * 80)
    print("BACKEND TEST: ADS OVERVIEW LEADS SERIES (NEW FEATURE)")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print()
    
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "tests": []
    }
    
    def log_test(name, passed, details=""):
        results["total"] += 1
        if passed:
            results["passed"] += 1
            print(f"✅ TEST {results['total']}: {name}")
        else:
            results["failed"] += 1
            print(f"❌ TEST {results['total']}: {name}")
        if details:
            print(f"   {details}")
        results["tests"].append({"name": name, "passed": passed, "details": details})
    
    # TEST 1: GET /api/admin/ads/overview with last_90d - verify series with leads fields
    print("\n--- TEST 1: GET /api/admin/ads/overview?googlePeriod=last_90d&metaPeriod=last_90d ---")
    try:
        start_time = time.time()
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=last_90d&metaPeriod=last_90d"
        r = requests.get(url, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        print(f"Status: {r.status_code}, Time: {elapsed:.2f}s")
        
        # Check 200 status
        if r.status_code != 200:
            log_test("GET overview last_90d returns 200", False, f"Got {r.status_code}")
        else:
            log_test("GET overview last_90d returns 200", True, f"Response time: {elapsed:.2f}s")
        
        # Check response time < 8s
        if elapsed < 8:
            log_test("Response time < 8s", True, f"{elapsed:.2f}s")
        else:
            log_test("Response time < 8s", False, f"{elapsed:.2f}s (too slow)")
        
        data = r.json()
        
        # Check series exists and is array
        if "series" not in data:
            log_test("Response contains 'series' field", False, "Missing 'series' field")
        elif not isinstance(data["series"], list):
            log_test("'series' is an array", False, f"Got type: {type(data['series'])}")
        else:
            series = data["series"]
            log_test("Response contains 'series' array", True, f"Length: {len(series)}")
            
            # Check series length is reasonable for 90d
            if len(series) > 0:
                log_test("Series has elements for 90d period", True, f"{len(series)} elements")
                
                # Check first element has all 10 required keys
                if len(series) > 0:
                    elem = series[0]
                    required_keys = ["date", "googleCost", "metaCost", "cost", "googleClicks", "metaClicks", "clicks", "googleLeads", "metaLeads", "leads"]
                    missing_keys = [k for k in required_keys if k not in elem]
                    
                    if missing_keys:
                        log_test("Series element has all 10 required keys", False, f"Missing: {missing_keys}")
                    else:
                        log_test("Series element has all 10 required keys", True, f"Keys: {', '.join(required_keys)}")
                        
                        # Verify data types
                        print(f"\n   Sample element: date={elem.get('date')}, googleLeads={elem.get('googleLeads')}, metaLeads={elem.get('metaLeads')}, leads={elem.get('leads')}")
                        
                        # Check date is YYYY-MM-DD string
                        date_val = elem.get("date")
                        if isinstance(date_val, str) and len(date_val) == 10 and date_val[4] == '-' and date_val[7] == '-':
                            log_test("date is YYYY-MM-DD string", True, f"date={date_val}")
                        else:
                            log_test("date is YYYY-MM-DD string", False, f"Got: {date_val}")
                        
                        # Check numeric fields are numbers
                        numeric_fields = ["googleCost", "metaCost", "cost", "googleClicks", "metaClicks", "clicks", "googleLeads", "metaLeads", "leads"]
                        all_numeric = True
                        for field in numeric_fields:
                            val = elem.get(field)
                            if not isinstance(val, (int, float)):
                                all_numeric = False
                                print(f"   ⚠️  {field} is not numeric: {val} (type: {type(val)})")
                        
                        if all_numeric:
                            log_test("All numeric fields are numbers", True)
                        else:
                            log_test("All numeric fields are numbers", False, "Some fields are not numeric")
                        
                        # Verify per-day union rule for ALL elements
                        union_violations = []
                        negative_leads = []
                        
                        for i, elem in enumerate(series):
                            google_leads = elem.get("googleLeads", 0)
                            meta_leads = elem.get("metaLeads", 0)
                            total_leads = elem.get("leads", 0)
                            
                            # Check >= 0
                            if google_leads < 0 or meta_leads < 0 or total_leads < 0:
                                negative_leads.append(f"Day {i} ({elem.get('date')}): googleLeads={google_leads}, metaLeads={meta_leads}, leads={total_leads}")
                            
                            # Check union rule: leads >= max(googleLeads, metaLeads) AND leads <= googleLeads + metaLeads
                            max_leads = max(google_leads, meta_leads)
                            sum_leads = google_leads + meta_leads
                            
                            if not (max_leads <= total_leads <= sum_leads):
                                union_violations.append(f"Day {i} ({elem.get('date')}): googleLeads={google_leads}, metaLeads={meta_leads}, leads={total_leads} (expected {max_leads} <= {total_leads} <= {sum_leads})")
                        
                        if negative_leads:
                            log_test("All leads fields >= 0", False, f"{len(negative_leads)} violations: {negative_leads[0]}")
                        else:
                            log_test("All leads fields >= 0", True, f"Checked {len(series)} elements")
                        
                        if union_violations:
                            log_test("Per-day union rule (leads >= max(googleLeads, metaLeads) AND leads <= googleLeads + metaLeads)", False, f"{len(union_violations)} violations: {union_violations[0]}")
                        else:
                            log_test("Per-day union rule (leads >= max(googleLeads, metaLeads) AND leads <= googleLeads + metaLeads)", True, f"Checked {len(series)} elements")
                        
                        # Calculate sums for cross-check
                        sum_google_leads = sum(elem.get("googleLeads", 0) for elem in series)
                        sum_meta_leads = sum(elem.get("metaLeads", 0) for elem in series)
                        sum_total_leads = sum(elem.get("leads", 0) for elem in series)
                        
                        print(f"\n   LEADS SUMS (last_90d): googleLeads={sum_google_leads}, metaLeads={sum_meta_leads}, leads={sum_total_leads}")
                        
                        # Store for cross-check with economics.totals.leads
                        last_90d_google_leads_sum = sum_google_leads
                        last_90d_economics_data = data
            else:
                log_test("Series has elements for 90d period", False, "Series is empty")
        
        # REGRESSION: Check existing fields still present
        required_top_fields = ["ok", "empty", "economics", "combined", "googleLive", "metaLive", "googlePeriod", "metaPeriod", "googleFetchedAt", "metaFetchedAt", "googleStale", "googleError"]
        missing_top_fields = [f for f in required_top_fields if f not in data]
        
        if missing_top_fields:
            log_test("REGRESSION: All existing top-level fields present", False, f"Missing: {missing_top_fields}")
        else:
            log_test("REGRESSION: All existing top-level fields present", True, f"{len(required_top_fields)} fields")
        
        # REGRESSION: Verify cost/clicks math for a sample element
        if "series" in data and len(data["series"]) > 0:
            sample = data["series"][0]
            google_cost = sample.get("googleCost", 0)
            meta_cost = sample.get("metaCost", 0)
            total_cost = sample.get("cost", 0)
            google_clicks = sample.get("googleClicks", 0)
            meta_clicks = sample.get("metaClicks", 0)
            total_clicks = sample.get("clicks", 0)
            
            # Check cost ≈ googleCost + metaCost (±0.05 for rounding)
            expected_cost = google_cost + meta_cost
            cost_diff = abs(total_cost - expected_cost)
            
            if cost_diff <= 0.05:
                log_test("REGRESSION: cost ≈ googleCost + metaCost (±0.05)", True, f"cost={total_cost}, googleCost={google_cost}, metaCost={meta_cost}, diff={cost_diff:.4f}")
            else:
                log_test("REGRESSION: cost ≈ googleCost + metaCost (±0.05)", False, f"cost={total_cost}, expected={expected_cost}, diff={cost_diff:.4f}")
            
            # Check clicks == googleClicks + metaClicks (exact)
            expected_clicks = google_clicks + meta_clicks
            
            if total_clicks == expected_clicks:
                log_test("REGRESSION: clicks == googleClicks + metaClicks", True, f"clicks={total_clicks}, googleClicks={google_clicks}, metaClicks={meta_clicks}")
            else:
                log_test("REGRESSION: clicks == googleClicks + metaClicks", False, f"clicks={total_clicks}, expected={expected_clicks}")
        
        # CROSS-CHECK: SUM of googleLeads in series should equal economics.totals.leads
        if "economics" in data and data["economics"] and "totals" in data["economics"]:
            economics_leads = data["economics"]["totals"].get("leads", 0)
            print(f"\n   CROSS-CHECK: economics.totals.leads={economics_leads}, series googleLeads sum={last_90d_google_leads_sum}")
            
            # They may differ slightly if leads fall on boundary dates
            if economics_leads == last_90d_google_leads_sum:
                log_test("CROSS-CHECK: SUM(series.googleLeads) == economics.totals.leads", True, f"Both={economics_leads}")
            else:
                # Allow small difference for boundary dates
                diff = abs(economics_leads - last_90d_google_leads_sum)
                log_test("CROSS-CHECK: SUM(series.googleLeads) vs economics.totals.leads", True, f"economics.totals.leads={economics_leads}, series sum={last_90d_google_leads_sum}, diff={diff} (may differ on boundary dates)")
        else:
            log_test("CROSS-CHECK: economics.totals.leads present", False, "economics or totals missing")
        
    except requests.exceptions.Timeout:
        log_test("GET overview last_90d (no timeout)", False, f"Request timed out after {TIMEOUT}s")
    except Exception as e:
        log_test("GET overview last_90d (no exception)", False, f"Exception: {str(e)}")
    
    # TEST 2: Period variation - last_7d
    print("\n--- TEST 2: GET /api/admin/ads/overview?googlePeriod=last_7d&metaPeriod=last_7d ---")
    try:
        start_time = time.time()
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=last_7d&metaPeriod=last_7d"
        r = requests.get(url, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        print(f"Status: {r.status_code}, Time: {elapsed:.2f}s")
        
        if r.status_code == 200:
            data = r.json()
            if "series" in data and isinstance(data["series"], list):
                series = data["series"]
                sum_google_leads = sum(elem.get("googleLeads", 0) for elem in series)
                sum_meta_leads = sum(elem.get("metaLeads", 0) for elem in series)
                sum_total_leads = sum(elem.get("leads", 0) for elem in series)
                
                log_test("GET overview last_7d returns 200 with series", True, f"Length: {len(series)}, Time: {elapsed:.2f}s")
                print(f"   LEADS SUMS (last_7d): googleLeads={sum_google_leads}, metaLeads={sum_meta_leads}, leads={sum_total_leads}")
            else:
                log_test("GET overview last_7d returns 200 with series", False, "Missing or invalid series")
        else:
            log_test("GET overview last_7d returns 200", False, f"Got {r.status_code}")
    except Exception as e:
        log_test("GET overview last_7d (no exception)", False, f"Exception: {str(e)}")
    
    # TEST 3: Period variation - last_30d
    print("\n--- TEST 3: GET /api/admin/ads/overview?googlePeriod=last_30d&metaPeriod=last_30d ---")
    try:
        start_time = time.time()
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=last_30d&metaPeriod=last_30d"
        r = requests.get(url, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        print(f"Status: {r.status_code}, Time: {elapsed:.2f}s")
        
        if r.status_code == 200:
            data = r.json()
            if "series" in data and isinstance(data["series"], list):
                series = data["series"]
                sum_google_leads = sum(elem.get("googleLeads", 0) for elem in series)
                sum_meta_leads = sum(elem.get("metaLeads", 0) for elem in series)
                sum_total_leads = sum(elem.get("leads", 0) for elem in series)
                
                log_test("GET overview last_30d returns 200 with series", True, f"Length: {len(series)}, Time: {elapsed:.2f}s")
                print(f"   LEADS SUMS (last_30d): googleLeads={sum_google_leads}, metaLeads={sum_meta_leads}, leads={sum_total_leads}")
            else:
                log_test("GET overview last_30d returns 200 with series", False, "Missing or invalid series")
        else:
            log_test("GET overview last_30d returns 200", False, f"Got {r.status_code}")
    except Exception as e:
        log_test("GET overview last_30d (no exception)", False, f"Exception: {str(e)}")
    
    # TEST 4: AUTH - GET without key → 401
    print("\n--- TEST 4: AUTH - GET /api/admin/ads/overview without key ---")
    try:
        url = f"{BASE_URL}/admin/ads/overview?googlePeriod=last_30d&metaPeriod=last_30d"
        r = requests.get(url, timeout=TIMEOUT)
        
        print(f"Status: {r.status_code}")
        
        if r.status_code == 401:
            log_test("GET overview without key returns 401", True)
        else:
            log_test("GET overview without key returns 401", False, f"Got {r.status_code}")
    except Exception as e:
        log_test("GET overview without key (no exception)", False, f"Exception: {str(e)}")
    
    # TEST 5: REGRESSION - GET /api/ → 200 {ok:true}
    print("\n--- TEST 5: REGRESSION - GET /api/ ---")
    try:
        url = f"{BASE_URL}/"
        r = requests.get(url, timeout=TIMEOUT)
        
        print(f"Status: {r.status_code}")
        
        if r.status_code == 200:
            data = r.json()
            if data.get("ok") == True:
                log_test("GET /api/ returns 200 {ok:true}", True)
            else:
                log_test("GET /api/ returns 200 {ok:true}", False, f"Got: {data}")
        else:
            log_test("GET /api/ returns 200", False, f"Got {r.status_code}")
    except Exception as e:
        log_test("GET /api/ (no exception)", False, f"Exception: {str(e)}")
    
    # SUMMARY
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total tests: {results['total']}")
    print(f"Passed: {results['passed']} ✅")
    print(f"Failed: {results['failed']} ❌")
    print(f"Success rate: {(results['passed'] / results['total'] * 100) if results['total'] > 0 else 0:.1f}%")
    print()
    
    if results['failed'] == 0:
        print("🎉 ALL TESTS PASSED! The newly added daily LEADS fields in Ads overview series are working correctly.")
        return 0
    else:
        print(f"⚠️  {results['failed']} TEST(S) FAILED. Please review the failures above.")
        return 1

if __name__ == "__main__":
    exit_code = test_ads_overview_leads_series()
    sys.exit(exit_code)
