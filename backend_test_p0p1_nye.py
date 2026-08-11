#!/usr/bin/env python3
"""
Backend test for P0+P1-PAKKE NYE endepunkter (DigiHome Next.js API).
Tests ONLY the NEW backend endpoints as specified in review_request:
1. Budget-pacing (GET/POST /api/admin/ads/pacing)
2. Ad-alerts (GET /api/admin/ads/alerts)
3. Customer-sync from platform (POST /api/admin/finance/sync-customers, GET /api/admin/finance/customers)
4. Form-funnel (POST /api/track with lead_step events, GET /api/admin/landing-pages)
5. Cron with alerts (GET /api/cron/ads-optimize with email=0)
6. Regression tests

CRITICAL WARNINGS:
- DO NOT POST to /api/leads or /api/tenants (forwards to external platform + Meta CAPI with REAL tokens)
- When testing cron: ALWAYS use &email=0 to prevent real email sending
- POST /api/track is safe (stores only locally, responds 204)
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60  # seconds (real Google/Meta API calls can take time)

# Test session ID for form funnel
TEST_SESSION_1 = f"test-funnel-{int(time.time())}-abc123"
TEST_SESSION_2 = f"test-funnel-{int(time.time())}-def456"

def log(msg):
    """Print timestamped log message"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_budget_pacing():
    """Test 1: BUDGET-PACING endpoints"""
    log("=" * 80)
    log("TEST 1: BUDGET-PACING")
    log("=" * 80)
    
    try:
        # Test 1a: GET /api/admin/ads/pacing WITH key
        log("Test 1a: GET /api/admin/ads/pacing?key=<token>")
        r = requests.get(f"{BASE_URL}/admin/ads/pacing", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        log(f"  Response keys: {list(data.keys())}")
        
        # Verify required fields
        required_fields = ["ok", "month", "dayOfMonth", "daysInMonth", "daysRemaining", "channels"]
        for field in required_fields:
            if field not in data:
                log(f"  ❌ FAIL: Missing required field '{field}'")
                return False
        
        if data.get("ok") != True:
            log(f"  ❌ FAIL: ok={data.get('ok')}, expected True")
            return False
        
        # Verify channels structure
        channels = data.get("channels", {})
        if not isinstance(channels, dict):
            log(f"  ❌ FAIL: channels is not a dict")
            return False
        
        required_channel_keys = ["google", "meta", "total"]
        for key in required_channel_keys:
            if key not in channels:
                log(f"  ❌ FAIL: Missing channel key '{key}'")
                return False
            
            channel = channels[key]
            required_channel_fields = ["mtd", "avg7", "projected", "budget", "spentPct", "pacePct"]
            for field in required_channel_fields:
                if field not in channel:
                    log(f"  ❌ FAIL: Missing field '{field}' in channels.{key}")
                    return False
        
        log(f"  ✅ PASS: All required fields present")
        log(f"  month={data.get('month')}, dayOfMonth={data.get('dayOfMonth')}, daysInMonth={data.get('daysInMonth')}, daysRemaining={data.get('daysRemaining')}")
        log(f"  channels.google.budget={channels['google'].get('budget')}, channels.meta.budget={channels['meta'].get('budget')}, channels.total.budget={channels['total'].get('budget')}")
        
        # Store initial budgets for comparison
        initial_google_budget = channels['google'].get('budget')
        initial_meta_budget = channels['meta'].get('budget')
        
        # Test 1b: POST /api/admin/ads/pacing WITH key and body
        log("\nTest 1b: POST /api/admin/ads/pacing?key=<token> with body {monthlyBudgetGoogle: 3000, monthlyBudgetMeta: 9000}")
        r = requests.post(
            f"{BASE_URL}/admin/ads/pacing",
            params={"key": ADMIN_KEY},
            json={"monthlyBudgetGoogle": 3000, "monthlyBudgetMeta": 9000},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        if data.get("ok") != True:
            log(f"  ❌ FAIL: ok={data.get('ok')}, expected True")
            return False
        
        log(f"  ✅ PASS: Budget update successful")
        
        # Test 1c: GET again to verify budgets
        log("\nTest 1c: GET /api/admin/ads/pacing again to verify budgets")
        r = requests.get(f"{BASE_URL}/admin/ads/pacing", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        channels = data.get("channels", {})
        
        google_budget = channels.get("google", {}).get("budget")
        meta_budget = channels.get("meta", {}).get("budget")
        total_budget = channels.get("total", {}).get("budget")
        
        log(f"  channels.google.budget={google_budget} (expected 3000)")
        log(f"  channels.meta.budget={meta_budget} (expected 9000)")
        log(f"  channels.total.budget={total_budget} (expected 12000)")
        
        if google_budget != 3000:
            log(f"  ❌ FAIL: google.budget={google_budget}, expected 3000")
            return False
        
        if meta_budget != 9000:
            log(f"  ❌ FAIL: meta.budget={meta_budget}, expected 9000")
            return False
        
        if total_budget != 12000:
            log(f"  ❌ FAIL: total.budget={total_budget}, expected 12000")
            return False
        
        # Verify pacePct and spentPct are numbers (not null)
        google_pace_pct = channels.get("google", {}).get("pacePct")
        google_spent_pct = channels.get("google", {}).get("spentPct")
        meta_pace_pct = channels.get("meta", {}).get("pacePct")
        meta_spent_pct = channels.get("meta", {}).get("spentPct")
        
        log(f"  channels.google.pacePct={google_pace_pct}, spentPct={google_spent_pct}")
        log(f"  channels.meta.pacePct={meta_pace_pct}, spentPct={meta_spent_pct}")
        
        if not isinstance(google_pace_pct, (int, float)):
            log(f"  ❌ FAIL: google.pacePct is not a number (got {type(google_pace_pct).__name__})")
            return False
        
        if not isinstance(google_spent_pct, (int, float)):
            log(f"  ❌ FAIL: google.spentPct is not a number (got {type(google_spent_pct).__name__})")
            return False
        
        log(f"  ✅ PASS: Budgets verified correctly, pacePct/spentPct are numbers")
        
        # Test 1d: GET WITHOUT key (unauthorized)
        log("\nTest 1d: GET /api/admin/ads/pacing WITHOUT key (should return 401)")
        r = requests.get(f"{BASE_URL}/admin/ads/pacing", timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 401:
            log(f"  ❌ FAIL: Expected 401, got {r.status_code}")
            return False
        
        log(f"  ✅ PASS: Unauthorized request correctly rejected")
        
        # CLEANUP: Reset budgets to original values (if they were set)
        if initial_google_budget is not None or initial_meta_budget is not None:
            log("\nCLEANUP: Resetting budgets to original values")
            r = requests.post(
                f"{BASE_URL}/admin/ads/pacing",
                params={"key": ADMIN_KEY},
                json={
                    "monthlyBudgetGoogle": initial_google_budget,
                    "monthlyBudgetMeta": initial_meta_budget
                },
                timeout=TIMEOUT
            )
            if r.status_code == 200:
                log(f"  ✅ Budgets reset successfully")
            else:
                log(f"  ⚠️  WARNING: Failed to reset budgets (status {r.status_code})")
        
        log("\n✅ TEST 1 (BUDGET-PACING): ALL TESTS PASSED (4/4)")
        return True
        
    except Exception as e:
        log(f"❌ TEST 1 (BUDGET-PACING) EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_ad_alerts():
    """Test 2: AD-ALERTS endpoint"""
    log("\n" + "=" * 80)
    log("TEST 2: AD-ALERTS")
    log("=" * 80)
    
    try:
        # Test 2a: GET /api/admin/ads/alerts WITH key
        log("Test 2a: GET /api/admin/ads/alerts?key=<token>")
        r = requests.get(f"{BASE_URL}/admin/ads/alerts", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        log(f"  Response keys: {list(data.keys())}")
        
        # Verify required fields
        required_fields = ["ok", "alerts", "window", "totals"]
        for field in required_fields:
            if field not in data:
                log(f"  ❌ FAIL: Missing required field '{field}'")
                return False
        
        if data.get("ok") != True:
            log(f"  ❌ FAIL: ok={data.get('ok')}, expected True")
            return False
        
        # Verify alerts is array (can be empty)
        alerts = data.get("alerts")
        if not isinstance(alerts, list):
            log(f"  ❌ FAIL: alerts is not an array")
            return False
        
        log(f"  ✅ PASS: alerts is array with {len(alerts)} items")
        
        # Verify window structure
        window = data.get("window", {})
        if not isinstance(window, dict):
            log(f"  ❌ FAIL: window is not a dict")
            return False
        
        if "current" not in window or "previous" not in window:
            log(f"  ❌ FAIL: window missing 'current' or 'previous'")
            return False
        
        current = window.get("current", {})
        previous = window.get("previous", {})
        
        if "from" not in current or "to" not in current:
            log(f"  ❌ FAIL: window.current missing 'from' or 'to'")
            return False
        
        if "from" not in previous or "to" not in previous:
            log(f"  ❌ FAIL: window.previous missing 'from' or 'to'")
            return False
        
        log(f"  ✅ PASS: window structure correct (current: {current['from']} to {current['to']}, previous: {previous['from']} to {previous['to']})")
        
        # Verify totals structure
        totals = data.get("totals", {})
        if not isinstance(totals, dict):
            log(f"  ❌ FAIL: totals is not a dict")
            return False
        
        if "current" not in totals or "previous" not in totals:
            log(f"  ❌ FAIL: totals missing 'current' or 'previous'")
            return False
        
        totals_current = totals.get("current", {})
        totals_previous = totals.get("previous", {})
        
        required_totals_fields = ["cost", "clicks", "conversions"]
        for field in required_totals_fields:
            if field not in totals_current:
                log(f"  ❌ FAIL: totals.current missing '{field}'")
                return False
            if field not in totals_previous:
                log(f"  ❌ FAIL: totals.previous missing '{field}'")
                return False
        
        log(f"  ✅ PASS: totals structure correct (current cost={totals_current.get('cost')}, clicks={totals_current.get('clicks')}, conversions={totals_current.get('conversions')})")
        
        # Test 2b: GET WITHOUT key (unauthorized)
        log("\nTest 2b: GET /api/admin/ads/alerts WITHOUT key (should return 401)")
        r = requests.get(f"{BASE_URL}/admin/ads/alerts", timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 401:
            log(f"  ❌ FAIL: Expected 401, got {r.status_code}")
            return False
        
        log(f"  ✅ PASS: Unauthorized request correctly rejected")
        
        log("\n✅ TEST 2 (AD-ALERTS): ALL TESTS PASSED (2/2)")
        return True
        
    except Exception as e:
        log(f"❌ TEST 2 (AD-ALERTS) EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_customer_sync():
    """Test 3: CUSTOMER-SYNC FROM PLATFORM"""
    log("\n" + "=" * 80)
    log("TEST 3: CUSTOMER-SYNC FROM PLATFORM")
    log("=" * 80)
    
    try:
        # Test 3a: POST /api/admin/finance/sync-customers WITH key
        log("Test 3a: POST /api/admin/finance/sync-customers?key=<token> (empty body)")
        r = requests.post(
            f"{BASE_URL}/admin/finance/sync-customers",
            params={"key": ADMIN_KEY},
            json={},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        log(f"  Response keys: {list(data.keys())}")
        
        # Verify STRUCTURED response (not 500 crash)
        if "ok" not in data:
            log(f"  ❌ FAIL: Missing 'ok' field in response")
            return False
        
        if data.get("ok") == True:
            # Success case: platform endpoint exists
            log(f"  ✅ PASS: Sync successful (ok=true)")
            
            # Verify success fields
            if "fetched" not in data or "upserted" not in data:
                log(f"  ❌ FAIL: Missing 'fetched' or 'upserted' fields")
                return False
            
            log(f"  fetched={data.get('fetched')}, upserted={data.get('upserted')}")
            
            if "platformEnv" in data:
                log(f"  platformEnv={data.get('platformEnv')}, platformUrl={data.get('platformUrl')}")
            
        elif data.get("ok") == False:
            # Expected failure case: platform endpoint not deployed
            log(f"  ✅ PASS: Sync returned ok=false (platform endpoint not deployed, acceptable)")
            
            if "error" in data:
                log(f"  error={data.get('error')}")
            
            if "hint" in data:
                log(f"  hint={data.get('hint')}")
        
        else:
            log(f"  ❌ FAIL: Unexpected 'ok' value: {data.get('ok')}")
            return False
        
        # Test 3b: GET /api/admin/finance/customers WITH key
        log("\nTest 3b: GET /api/admin/finance/customers?key=<token>")
        r = requests.get(f"{BASE_URL}/admin/finance/customers", params={"key": ADMIN_KEY}, timeout=TIMEOUT)
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        log(f"  Response keys: {list(data.keys())}")
        
        if data.get("ok") != True:
            log(f"  ❌ FAIL: ok={data.get('ok')}, expected True")
            return False
        
        # Verify dataSource field
        if "dataSource" not in data:
            log(f"  ❌ FAIL: Missing 'dataSource' field")
            return False
        
        data_source = data.get("dataSource")
        log(f"  dataSource={data_source}")
        
        if data_source not in ["platform", "contracts"]:
            log(f"  ❌ FAIL: Unexpected dataSource value: {data_source}")
            return False
        
        # Verify summary structure
        if "summary" not in data:
            log(f"  ❌ FAIL: Missing 'summary' field")
            return False
        
        summary = data.get("summary", {})
        log(f"  summary keys: {list(summary.keys())}")
        
        if data_source == "platform":
            # Platform data source: verify rich fields
            required_summary_fields = [
                "totalCustomers", "activeCustomers", "payingCustomers",
                "pausedCustomers", "churnedCustomers", "churnRatePct",
                "totalMrr", "arr", "arpa", "lifetimeFees"
            ]
            for field in required_summary_fields:
                if field not in summary:
                    log(f"  ❌ FAIL: Missing summary field '{field}' (dataSource=platform)")
                    return False
            
            log(f"  ✅ PASS: Platform data source with all required summary fields")
            log(f"  totalCustomers={summary.get('totalCustomers')}, activeCustomers={summary.get('activeCustomers')}, totalMrr={summary.get('totalMrr')}")
            
            # Verify customers array
            if "customers" not in data:
                log(f"  ❌ FAIL: Missing 'customers' field")
                return False
            
            customers = data.get("customers", [])
            if not isinstance(customers, list):
                log(f"  ❌ FAIL: customers is not an array")
                return False
            
            log(f"  customers array length: {len(customers)}")
            
            if len(customers) > 0:
                # Verify customer structure
                customer = customers[0]
                required_customer_fields = ["name", "status", "mrr", "lifetimeFee", "channel"]
                for field in required_customer_fields:
                    if field not in customer:
                        log(f"  ❌ FAIL: Missing customer field '{field}'")
                        return False
                
                log(f"  ✅ PASS: Customer structure correct (sample: name={customer.get('name')}, status={customer.get('status')}, mrr={customer.get('mrr')})")
        
        elif data_source == "contracts":
            # Contracts fallback: verify basic fields
            log(f"  ✅ PASS: Contracts fallback data source (acceptable)")
            
            # Verify basic summary fields
            if "totalCustomers" not in summary:
                log(f"  ❌ FAIL: Missing summary field 'totalCustomers'")
                return False
            
            log(f"  totalCustomers={summary.get('totalCustomers')}")
        
        # Test 3c: GET /api/admin/finance/customers?source=contracts
        log("\nTest 3c: GET /api/admin/finance/customers?key=<token>&source=contracts")
        r = requests.get(
            f"{BASE_URL}/admin/finance/customers",
            params={"key": ADMIN_KEY, "source": "contracts"},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        data_source = data.get("dataSource")
        log(f"  dataSource={data_source}")
        
        if data_source != "contracts":
            log(f"  ❌ FAIL: Expected dataSource='contracts', got '{data_source}'")
            return False
        
        log(f"  ✅ PASS: Forced contracts data source working correctly")
        
        log("\n✅ TEST 3 (CUSTOMER-SYNC): ALL TESTS PASSED (3/3)")
        return True
        
    except Exception as e:
        log(f"❌ TEST 3 (CUSTOMER-SYNC) EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_form_funnel():
    """Test 4: FORM-FUNNEL (lead_step-events)"""
    log("\n" + "=" * 80)
    log("TEST 4: FORM-FUNNEL (lead_step-events)")
    log("=" * 80)
    
    try:
        # Test 4a: POST /api/track three times with same sessionId
        log(f"Test 4a: POST /api/track three times with sessionId='{TEST_SESSION_1}' and path='/lp/inntekt'")
        
        # Step 1: start
        log("  Posting step='start'...")
        r = requests.post(
            f"{BASE_URL}/track",
            json={
                "type": "lead_step",
                "sessionId": TEST_SESSION_1,
                "visitorId": "test-vis-1",
                "path": "/lp/inntekt",
                "meta": {
                    "step": "start",
                    "form": "lp-inntekt"
                }
            },
            timeout=TIMEOUT
        )
        log(f"    Status: {r.status_code}")
        
        if r.status_code != 204:
            log(f"    ❌ FAIL: Expected 204, got {r.status_code}")
            return False
        
        log(f"    ✅ PASS: step='start' posted successfully")
        
        # Step 2: step2
        log("  Posting step='step2'...")
        r = requests.post(
            f"{BASE_URL}/track",
            json={
                "type": "lead_step",
                "sessionId": TEST_SESSION_1,
                "visitorId": "test-vis-1",
                "path": "/lp/inntekt",
                "meta": {
                    "step": "step2",
                    "form": "lp-inntekt"
                }
            },
            timeout=TIMEOUT
        )
        log(f"    Status: {r.status_code}")
        
        if r.status_code != 204:
            log(f"    ❌ FAIL: Expected 204, got {r.status_code}")
            return False
        
        log(f"    ✅ PASS: step='step2' posted successfully")
        
        # Step 3: submit
        log("  Posting step='submit'...")
        r = requests.post(
            f"{BASE_URL}/track",
            json={
                "type": "lead_step",
                "sessionId": TEST_SESSION_1,
                "visitorId": "test-vis-1",
                "path": "/lp/inntekt",
                "meta": {
                    "step": "submit",
                    "form": "lp-inntekt"
                }
            },
            timeout=TIMEOUT
        )
        log(f"    Status: {r.status_code}")
        
        if r.status_code != 204:
            log(f"    ❌ FAIL: Expected 204, got {r.status_code}")
            return False
        
        log(f"    ✅ PASS: step='submit' posted successfully")
        
        # Test 4b: POST /api/track with different sessionId (only start)
        log(f"\nTest 4b: POST /api/track with sessionId='{TEST_SESSION_2}' (only step='start')")
        r = requests.post(
            f"{BASE_URL}/track",
            json={
                "type": "lead_step",
                "sessionId": TEST_SESSION_2,
                "visitorId": "test-vis-2",
                "path": "/lp/inntekt",
                "meta": {
                    "step": "start",
                    "form": "lp-inntekt"
                }
            },
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 204:
            log(f"  ❌ FAIL: Expected 204, got {r.status_code}")
            return False
        
        log(f"  ✅ PASS: Second session step='start' posted successfully")
        
        # Wait a moment for events to be processed
        log("\n  Waiting 2 seconds for events to be processed...")
        time.sleep(2)
        
        # Test 4c: GET /api/admin/landing-pages?days=30
        log("\nTest 4c: GET /api/admin/landing-pages?key=<token>&days=30")
        r = requests.get(
            f"{BASE_URL}/admin/landing-pages",
            params={"key": ADMIN_KEY, "days": 30},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        log(f"  Response keys: {list(data.keys())}")
        
        if data.get("ok") != True:
            log(f"  ❌ FAIL: ok={data.get('ok')}, expected True")
            return False
        
        # Verify pages array
        if "pages" not in data:
            log(f"  ❌ FAIL: Missing 'pages' field")
            return False
        
        pages = data.get("pages", [])
        if not isinstance(pages, list):
            log(f"  ❌ FAIL: pages is not an array")
            return False
        
        log(f"  ✅ PASS: pages array with {len(pages)} items")
        
        # Find page with slug "inntekt"
        inntekt_page = None
        for page in pages:
            if page.get("slug") == "inntekt":
                inntekt_page = page
                break
        
        if not inntekt_page:
            log(f"  ❌ FAIL: Could not find page with slug='inntekt'")
            log(f"  Available slugs: {[p.get('slug') for p in pages]}")
            return False
        
        log(f"  ✅ PASS: Found page with slug='inntekt'")
        log(f"  Page keys: {list(inntekt_page.keys())}")
        
        # Verify form structure
        if "form" not in inntekt_page:
            log(f"  ❌ FAIL: Missing 'form' field in inntekt page")
            return False
        
        form = inntekt_page.get("form", {})
        log(f"  form keys: {list(form.keys())}")
        
        required_form_fields = ["start", "step2", "submit", "step2Rate", "submitRate"]
        for field in required_form_fields:
            if field not in form:
                log(f"  ❌ FAIL: Missing form field '{field}'")
                return False
        
        form_start = form.get("start")
        form_step2 = form.get("step2")
        form_submit = form.get("submit")
        step2_rate = form.get("step2Rate")
        submit_rate = form.get("submitRate")
        
        log(f"  form.start={form_start}, form.step2={form_step2}, form.submit={form_submit}")
        log(f"  form.step2Rate={step2_rate}%, form.submitRate={submit_rate}%")
        
        # Verify counts (should be >= our test data)
        if form_start < 2:
            log(f"  ❌ FAIL: form.start={form_start}, expected >= 2")
            return False
        
        if form_step2 < 1:
            log(f"  ❌ FAIL: form.step2={form_step2}, expected >= 1")
            return False
        
        if form_submit < 1:
            log(f"  ❌ FAIL: form.submit={form_submit}, expected >= 1")
            return False
        
        # Verify rates are percentages (numbers)
        if not isinstance(step2_rate, (int, float)):
            log(f"  ❌ FAIL: step2Rate is not a number (got {type(step2_rate).__name__})")
            return False
        
        if not isinstance(submit_rate, (int, float)):
            log(f"  ❌ FAIL: submitRate is not a number (got {type(submit_rate).__name__})")
            return False
        
        log(f"  ✅ PASS: Form funnel data correct (start >= 2, step2 >= 1, submit >= 1, rates are percentages)")
        
        # Verify totals
        if "totals" not in data:
            log(f"  ❌ FAIL: Missing 'totals' field")
            return False
        
        totals = data.get("totals", {})
        log(f"  totals keys: {list(totals.keys())}")
        
        required_totals_fields = ["formStart", "formStep2", "formSubmit"]
        for field in required_totals_fields:
            if field not in totals:
                log(f"  ❌ FAIL: Missing totals field '{field}'")
                return False
        
        totals_form_start = totals.get("formStart")
        totals_form_step2 = totals.get("formStep2")
        totals_form_submit = totals.get("formSubmit")
        
        log(f"  totals.formStart={totals_form_start}, totals.formStep2={totals_form_step2}, totals.formSubmit={totals_form_submit}")
        
        if totals_form_start < form_start:
            log(f"  ❌ FAIL: totals.formStart={totals_form_start} < page.form.start={form_start}")
            return False
        
        if totals_form_step2 < form_step2:
            log(f"  ❌ FAIL: totals.formStep2={totals_form_step2} < page.form.step2={form_step2}")
            return False
        
        if totals_form_submit < form_submit:
            log(f"  ❌ FAIL: totals.formSubmit={totals_form_submit} < page.form.submit={form_submit}")
            return False
        
        log(f"  ✅ PASS: Totals correct (formStart/formStep2/formSubmit >= page values)")
        
        log("\n✅ TEST 4 (FORM-FUNNEL): ALL TESTS PASSED (3/3)")
        return True
        
    except Exception as e:
        log(f"❌ TEST 4 (FORM-FUNNEL) EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_cron_with_alerts():
    """Test 5: CRON WITH ALERTS (without email!)"""
    log("\n" + "=" * 80)
    log("TEST 5: CRON WITH ALERTS (without email!)")
    log("=" * 80)
    
    try:
        # Test 5: GET /api/cron/ads-optimize?token=...&mode=daily&email=0
        log("Test 5: GET /api/cron/ads-optimize?token=dh_admin_b3Kx92Qz7Lm4&mode=daily&email=0")
        log("  IMPORTANT: email=0 to prevent real email sending")
        
        r = requests.get(
            f"{BASE_URL}/cron/ads-optimize",
            params={
                "token": ADMIN_KEY,
                "mode": "daily",
                "email": "0"
            },
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        log(f"  Response keys: {list(data.keys())}")
        
        if data.get("ok") != True:
            log(f"  ❌ FAIL: ok={data.get('ok')}, expected True")
            return False
        
        # Verify alerts object exists
        if "alerts" not in data:
            log(f"  ❌ FAIL: Missing 'alerts' field in response")
            return False
        
        alerts = data.get("alerts")
        log(f"  alerts keys: {list(alerts.keys()) if isinstance(alerts, dict) else 'not a dict'}")
        
        # Verify alerts structure
        if isinstance(alerts, dict):
            # Success case: alerts object with fields
            if "error" in alerts:
                log(f"  ⚠️  WARNING: alerts.error={alerts.get('error')}")
            else:
                required_alerts_fields = ["total", "high", "emailed"]
                for field in required_alerts_fields:
                    if field not in alerts:
                        log(f"  ❌ FAIL: Missing alerts field '{field}'")
                        return False
                
                alerts_total = alerts.get("total")
                alerts_high = alerts.get("high")
                alerts_emailed = alerts.get("emailed")
                
                log(f"  alerts.total={alerts_total}, alerts.high={alerts_high}, alerts.emailed={alerts_emailed}")
                
                if alerts_emailed != False:
                    log(f"  ❌ FAIL: alerts.emailed={alerts_emailed}, expected False (email=0)")
                    return False
                
                log(f"  ✅ PASS: Alerts object correct (total={alerts_total}, high={alerts_high}, emailed=False)")
        else:
            log(f"  ❌ FAIL: alerts is not a dict")
            return False
        
        log("\n✅ TEST 5 (CRON WITH ALERTS): ALL TESTS PASSED (1/1)")
        return True
        
    except Exception as e:
        log(f"❌ TEST 5 (CRON WITH ALERTS) EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_regression():
    """Test 6: REGRESSION tests"""
    log("\n" + "=" * 80)
    log("TEST 6: REGRESSION")
    log("=" * 80)
    
    try:
        # Test 6a: GET /api/admin/tracking/verify
        log("Test 6a: GET /api/admin/tracking/verify?key=<token>")
        r = requests.get(
            f"{BASE_URL}/admin/tracking/verify",
            params={"key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        
        # Verify summary object exists
        if "summary" not in data:
            log(f"  ❌ FAIL: Missing 'summary' field")
            return False
        
        log(f"  ✅ PASS: /api/admin/tracking/verify working (has summary object)")
        
        # Test 6b: GET /api/admin/finance/investor
        log("\nTest 6b: GET /api/admin/finance/investor?key=<token>")
        r = requests.get(
            f"{BASE_URL}/admin/finance/investor",
            params={"key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        
        if data.get("ok") != True:
            log(f"  ❌ FAIL: ok={data.get('ok')}, expected True")
            return False
        
        log(f"  ✅ PASS: /api/admin/finance/investor still working (ok=true)")
        
        # Test 6c: GET /api/admin/ads/overview
        log("\nTest 6c: GET /api/admin/ads/overview?key=<token>")
        r = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
            return False
        
        data = r.json()
        
        if data.get("ok") != True:
            log(f"  ❌ FAIL: ok={data.get('ok')}, expected True")
            return False
        
        log(f"  ✅ PASS: /api/admin/ads/overview still working (ok=true)")
        
        # Test 6d: GET /lp/inntekt (frontend page)
        log("\nTest 6d: GET /lp/inntekt (frontend page)")
        r = requests.get(
            "https://saker-hub.preview.emergentagent.com/lp/inntekt",
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code}")
        
        if r.status_code != 200:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            return False
        
        # Verify it's HTML (not JSON error)
        content_type = r.headers.get("content-type", "")
        if "text/html" not in content_type:
            log(f"  ❌ FAIL: Expected HTML, got content-type: {content_type}")
            return False
        
        log(f"  ✅ PASS: /lp/inntekt page renders (200, HTML)")
        
        log("\n✅ TEST 6 (REGRESSION): ALL TESTS PASSED (4/4)")
        return True
        
    except Exception as e:
        log(f"❌ TEST 6 (REGRESSION) EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    log("=" * 80)
    log("BACKEND TEST: P0+P1-PAKKE NYE ENDEPUNKTER")
    log("=" * 80)
    log(f"Base URL: {BASE_URL}")
    log(f"Admin key: {ADMIN_KEY}")
    log(f"Timeout: {TIMEOUT}s")
    log("")
    
    results = {
        "Budget-pacing": test_budget_pacing(),
        "Ad-alerts": test_ad_alerts(),
        "Customer-sync": test_customer_sync(),
        "Form-funnel": test_form_funnel(),
        "Cron with alerts": test_cron_with_alerts(),
        "Regression": test_regression(),
    }
    
    log("\n" + "=" * 80)
    log("FINAL RESULTS")
    log("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        log(f"{status}: {test_name}")
    
    log("")
    log(f"TOTAL: {passed}/{total} tests passed ({int(passed/total*100)}% success rate)")
    
    if passed == total:
        log("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        log(f"\n⚠️  {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
