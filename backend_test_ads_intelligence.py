#!/usr/bin/env python3
"""
Backend test for DigiHome Ads Intelligence Fase A-D + closed-loop webhook improvement.
Tests NEW backend endpoints for ads intelligence layer.

CRITICAL SAFETY RULES (LIVE Google Ads account 9853356154):
- DO NOT call POST /api/admin/ads/recommendations/apply with real recommendation
- DO NOT send dryRun:false to POST /api/admin/ads/optimize/run
- DO NOT call GET /api/cron/ads-optimize with valid token
- DO NOT create excessive leads (one QA lead for webhook test is fine)
- Many endpoints make REAL Google/Meta/LLM calls → use timeout >= 50s
"""

import requests
import json
import time
import os
import sys

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
WEBHOOK_SECRET = "dhsync_dc0dc1750aff067a4baef7adafc7991f7340eacc44f27036"
TIMEOUT = 60  # 60s timeout for REAL API calls

def log(msg):
    print(f"[TEST] {msg}", flush=True)

def test_ads_table():
    """Test A: GET /api/admin/ads/table (per-ad table Google+Meta)"""
    log("=" * 80)
    log("TEST A: Ads Table (Google+Meta per-ad metrics)")
    log("=" * 80)
    
    # A1: GET with key + periods → 200 with ads array
    log("A1: GET /api/admin/ads/table with key and periods...")
    try:
        r = requests.get(
            f"{BASE_URL}/admin/ads/table",
            params={"key": ADMIN_KEY, "googlePeriod": "last_30d", "metaPeriod": "last_30d"},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            log(f"  ads count: {len(data.get('ads', []))}")
            log(f"  google.configured: {data.get('google', {}).get('configured')}")
            log(f"  meta.configured: {data.get('meta', {}).get('configured')}")
            if data.get('ads'):
                ad = data['ads'][0]
                required_fields = ['channel', 'id', 'name', 'status', 'cost', 'impressions', 'clicks', 'ctr', 'cpc', 'conversions', 'cpa', 'roas']
                missing = [f for f in required_fields if f not in ad]
                if missing:
                    log(f"  ❌ FAIL: Missing fields in ad: {missing}")
                else:
                    log(f"  ✅ PASS: All required fields present in ad")
            else:
                log(f"  ⚠️  No ads returned (may be expected if no active campaigns)")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # A2: Without key → 401
    log("\nA2: GET /api/admin/ads/table without key...")
    try:
        r = requests.get(f"{BASE_URL}/admin/ads/table", timeout=TIMEOUT)
        log(f"  Status: {r.status_code} (expected 401)")
        if r.status_code == 401:
            log(f"  ✅ PASS: Authentication required")
        else:
            log(f"  ❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # A3: Invalid periods → 200 with fallback to last_30d
    log("\nA3: GET /api/admin/ads/table with invalid periods...")
    try:
        r = requests.get(
            f"{BASE_URL}/admin/ads/table",
            params={"key": ADMIN_KEY, "googlePeriod": "foo", "metaPeriod": "bar"},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ✅ PASS: Invalid periods handled (fallback to default)")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")

def test_recommendations():
    """Test B: Recommendations engine"""
    log("\n" + "=" * 80)
    log("TEST B: Recommendations Engine")
    log("=" * 80)
    
    # B1: GET recommendations with key → 200
    log("B1: GET /api/admin/ads/recommendations with key...")
    try:
        r = requests.get(
            f"{BASE_URL}/admin/ads/recommendations",
            params={"key": ADMIN_KEY, "period": "last_30d"},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            log(f"  recommendations count: {len(data.get('recommendations', []))}")
            log(f"  counts: {data.get('counts')}")
            log(f"  estimatedSavings: {data.get('estimatedSavings')} (expected number)")
            if data.get('recommendations'):
                rec = data['recommendations'][0]
                required_fields = ['id', 'channel', 'type', 'severity', 'title', 'rationale', 'action']
                missing = [f for f in required_fields if f not in rec]
                if missing:
                    log(f"  ❌ FAIL: Missing fields in recommendation: {missing}")
                else:
                    log(f"  ✅ PASS: All required fields present in recommendation")
            else:
                log(f"  ⚠️  No recommendations (may be expected if no issues found)")
            log(f"  ✅ PASS: Recommendations endpoint working")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # B2: Without key → 401
    log("\nB2: GET /api/admin/ads/recommendations without key...")
    try:
        r = requests.get(f"{BASE_URL}/admin/ads/recommendations", timeout=TIMEOUT)
        log(f"  Status: {r.status_code} (expected 401)")
        if r.status_code == 401:
            log(f"  ✅ PASS: Authentication required")
        else:
            log(f"  ❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # B3: POST apply with EMPTY body {} → 400 (do NOT send real action)
    log("\nB3: POST /api/admin/ads/recommendations/apply with EMPTY body...")
    try:
        r = requests.post(
            f"{BASE_URL}/admin/ads/recommendations/apply",
            params={"key": ADMIN_KEY},
            json={},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 400)")
        if r.status_code == 400:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected False)")
            log(f"  ✅ PASS: Empty body rejected")
        else:
            log(f"  ❌ FAIL: Expected 400, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # B4: POST apply without key → 401
    log("\nB4: POST /api/admin/ads/recommendations/apply without key...")
    try:
        r = requests.post(
            f"{BASE_URL}/admin/ads/recommendations/apply",
            json={},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 401)")
        if r.status_code == 401:
            log(f"  ✅ PASS: Authentication required")
        else:
            log(f"  ❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")

def test_keyword_research_and_ai():
    """Test C: Keyword research + AI copy generation"""
    log("\n" + "=" * 80)
    log("TEST C: Keyword Research + AI Copy Generation")
    log("=" * 80)
    
    # C1: GET keyword-research with seeds → 200 with ideas
    log("C1: GET /api/admin/ads/keyword-research with seeds...")
    try:
        r = requests.get(
            f"{BASE_URL}/admin/ads/keyword-research",
            params={"key": ADMIN_KEY, "seeds": "utleie bergen,leie ut bolig"},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            log(f"  ideas count: {len(data.get('ideas', []))}")
            if data.get('ideas'):
                idea = data['ideas'][0]
                required_fields = ['text', 'avgMonthlySearches', 'competition', 'lowBid', 'highBid']
                missing = [f for f in required_fields if f not in idea]
                if missing:
                    log(f"  ❌ FAIL: Missing fields in idea: {missing}")
                else:
                    log(f"  ✅ PASS: All required fields present in idea")
                    log(f"  Sample idea: {idea['text']} (searches: {idea['avgMonthlySearches']})")
            else:
                log(f"  ⚠️  No ideas returned")
            log(f"  ✅ PASS: Keyword research endpoint working")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # C2: Without key → 401
    log("\nC2: GET /api/admin/ads/keyword-research without key...")
    try:
        r = requests.get(
            f"{BASE_URL}/admin/ads/keyword-research",
            params={"seeds": "utleie bergen"},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 401)")
        if r.status_code == 401:
            log(f"  ✅ PASS: Authentication required")
        else:
            log(f"  ❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # C3: POST ai/generate {kind:'rsa'} → 200 with headlines/descriptions
    log("\nC3: POST /api/admin/ads/ai/generate with kind='rsa'...")
    try:
        r = requests.post(
            f"{BASE_URL}/admin/ads/ai/generate",
            params={"key": ADMIN_KEY},
            json={"kind": "rsa", "theme": "Utleie i Bergen"},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            log(f"  kind: {data.get('kind')} (expected 'rsa')")
            log(f"  headlines count: {len(data.get('headlines', []))} (expected 1-15)")
            log(f"  descriptions count: {len(data.get('descriptions', []))}")
            if 1 <= len(data.get('headlines', [])) <= 15:
                log(f"  ✅ PASS: RSA generation working (headlines: {len(data['headlines'])})")
            else:
                log(f"  ❌ FAIL: Invalid headlines count: {len(data.get('headlines', []))}")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # C4: POST ai/generate {kind:'meta'} → 200 with primaryTexts/headlines
    log("\nC4: POST /api/admin/ads/ai/generate with kind='meta'...")
    try:
        r = requests.post(
            f"{BASE_URL}/admin/ads/ai/generate",
            params={"key": ADMIN_KEY},
            json={"kind": "meta", "theme": "Utleie i Bergen"},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            log(f"  kind: {data.get('kind')} (expected 'meta')")
            log(f"  primaryTexts count: {len(data.get('primaryTexts', []))}")
            log(f"  headlines count: {len(data.get('headlines', []))}")
            if data.get('primaryTexts') and data.get('headlines'):
                log(f"  ✅ PASS: Meta generation working")
            else:
                log(f"  ❌ FAIL: Missing primaryTexts or headlines")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # C5: ai/generate without key → 401
    log("\nC5: POST /api/admin/ads/ai/generate without key...")
    try:
        r = requests.post(
            f"{BASE_URL}/admin/ads/ai/generate",
            json={"kind": "rsa", "theme": "test"},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 401)")
        if r.status_code == 401:
            log(f"  ✅ PASS: Authentication required")
        else:
            log(f"  ❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")

def test_optimization_orchestrator():
    """Test D: Optimization orchestrator"""
    log("\n" + "=" * 80)
    log("TEST D: Optimization Orchestrator")
    log("=" * 80)
    
    # D1: POST optimize/run {mode:'weekly', dryRun:true} → 200 with run, autoApplied MUST be 0
    log("D1: POST /api/admin/ads/optimize/run with dryRun=true...")
    try:
        r = requests.post(
            f"{BASE_URL}/admin/ads/optimize/run",
            params={"key": ADMIN_KEY},
            json={"mode": "weekly", "dryRun": True},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            run = data.get('run', {})
            log(f"  run.id: {run.get('id')}")
            log(f"  run.mode: {run.get('mode')} (expected 'weekly')")
            log(f"  run.dryRun: {run.get('dryRun')} (expected True)")
            summary = run.get('summary', {})
            log(f"  summary.totalRecommendations: {summary.get('totalRecommendations')}")
            log(f"  summary.estimatedSavings: {summary.get('estimatedSavings')}")
            log(f"  summary.keywordIdeas: {summary.get('keywordIdeas')}")
            log(f"  summary.autoApplied: {summary.get('autoApplied')} (MUST be 0)")
            if summary.get('autoApplied') == 0:
                log(f"  ✅ PASS: autoApplied is 0 (dryRun working)")
            else:
                log(f"  ❌ FAIL: autoApplied is {summary.get('autoApplied')}, expected 0")
            if run.get('dryRun') is True:
                log(f"  ✅ PASS: dryRun is True")
            else:
                log(f"  ❌ FAIL: dryRun is {run.get('dryRun')}, expected True")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # D2: GET optimize/last → 200 with run/runs/config
    log("\nD2: GET /api/admin/ads/optimize/last...")
    try:
        r = requests.get(
            f"{BASE_URL}/admin/ads/optimize/last",
            params={"key": ADMIN_KEY},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            log(f"  run: {type(data.get('run'))} (expected dict or None)")
            log(f"  runs count: {len(data.get('runs', []))}")
            config = data.get('config', {})
            log(f"  config.autoApply: {config.get('autoApply')}")
            log(f"  config.wasteAdCost: {config.get('wasteAdCost')}")
            log(f"  config.maxAutoActions: {config.get('maxAutoActions')}")
            log(f"  ✅ PASS: optimize/last endpoint working")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # D3: POST optimize/config {config:{wasteAdCost:250}} → 200 with updated config
    log("\nD3: POST /api/admin/ads/optimize/config...")
    try:
        r = requests.post(
            f"{BASE_URL}/admin/ads/optimize/config",
            params={"key": ADMIN_KEY},
            json={"config": {"wasteAdCost": 250}},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            config = data.get('config', {})
            log(f"  config.wasteAdCost: {config.get('wasteAdCost')} (expected 250)")
            if config.get('wasteAdCost') == 250:
                log(f"  ✅ PASS: Config updated successfully")
            else:
                log(f"  ❌ FAIL: wasteAdCost is {config.get('wasteAdCost')}, expected 250")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # D4: optimize/run without key → 401
    log("\nD4: POST /api/admin/ads/optimize/run without key...")
    try:
        r = requests.post(
            f"{BASE_URL}/admin/ads/optimize/run",
            json={"mode": "weekly", "dryRun": True},
            timeout=TIMEOUT
        )
        log(f"  Status: {r.status_code} (expected 401)")
        if r.status_code == 401:
            log(f"  ✅ PASS: Authentication required")
        else:
            log(f"  ❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # D5: GET /api/cron/ads-optimize without token/key → 401 (do NOT call with valid token)
    log("\nD5: GET /api/cron/ads-optimize without token/key...")
    try:
        r = requests.get(f"{BASE_URL}/cron/ads-optimize", timeout=TIMEOUT)
        log(f"  Status: {r.status_code} (expected 401)")
        if r.status_code == 401:
            log(f"  ✅ PASS: Authentication required (cron endpoint secured)")
        else:
            log(f"  ❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")

def test_closed_loop_webhook():
    """Test E: Closed-loop webhook improvement (idempotency + phone fallback)"""
    log("\n" + "=" * 80)
    log("TEST E: Closed-Loop Webhook Improvement")
    log("=" * 80)
    
    # E1: Create test lead
    log("E1: Create test lead via POST /api/leads...")
    lead_id = None
    try:
        r = requests.post(
            f"{BASE_URL}/leads",
            json={
                "name": "QA Loop Bot",
                "email": "qa-loop@example.test",
                "phone": "+47 91234567",
                "address": "Testveien 9, 5003 Bergen",
                "property_type": "leilighet",
                "lead_type": "huseier",
                "source": "qa-loop"
            },
            timeout=30
        )
        log(f"  Status: {r.status_code} (expected 201)")
        if r.status_code == 201:
            data = r.json()
            lead_id = data.get('data', {}).get('id')
            log(f"  Lead ID: {lead_id}")
            log(f"  ✅ PASS: Test lead created")
        else:
            log(f"  ❌ FAIL: Expected 201, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
            return
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
        return
    
    if not lead_id:
        log("  ❌ FAIL: No lead ID returned, skipping webhook tests")
        return
    
    # E2: POST webhook with external_ref, status='won', value=12000 → 200 matched_by='external_ref'
    log("\nE2: POST /api/webhooks/lead-status with external_ref...")
    try:
        r = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={"external_ref": lead_id, "status": "won", "value": 12000},
            timeout=30
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            log(f"  status: {data.get('status')} (expected 'won')")
            log(f"  matched_by: {data.get('matched_by')} (expected 'external_ref')")
            if data.get('matched_by') == 'external_ref':
                log(f"  ✅ PASS: Webhook matched by external_ref")
            else:
                log(f"  ❌ FAIL: matched_by is {data.get('matched_by')}, expected 'external_ref'")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # E3: Repeat same webhook call (idempotency) → 200 no crash
    log("\nE3: Repeat same webhook call (idempotency test)...")
    try:
        r = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={"external_ref": lead_id, "status": "won", "value": 12000},
            timeout=30
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            log(f"  status: {data.get('status')} (expected 'won')")
            log(f"  ✅ PASS: Idempotency working (no crash on repeat)")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # E4: Phone-fallback {phone:'91234567', status:'qualified'} → 200 matched_by='phone'
    log("\nE4: POST /api/webhooks/lead-status with phone fallback...")
    try:
        r = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            headers={"X-Webhook-Secret": WEBHOOK_SECRET},
            json={"phone": "91234567", "status": "qualified"},
            timeout=30
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            log(f"  matched_by: {data.get('matched_by')} (expected 'phone')")
            if data.get('matched_by') == 'phone':
                log(f"  ✅ PASS: Phone fallback working")
            else:
                log(f"  ❌ FAIL: matched_by is {data.get('matched_by')}, expected 'phone'")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
            log(f"  Response: {r.text[:500]}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # E5: Without secret → 401
    log("\nE5: POST /api/webhooks/lead-status without secret...")
    try:
        r = requests.post(
            f"{BASE_URL}/webhooks/lead-status",
            json={"external_ref": lead_id, "status": "won", "value": 12000},
            timeout=30
        )
        log(f"  Status: {r.status_code} (expected 401)")
        if r.status_code == 401:
            log(f"  ✅ PASS: Authentication required (webhook secret)")
        else:
            log(f"  ❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")

def test_regression():
    """Regression tests"""
    log("\n" + "=" * 80)
    log("REGRESSION TESTS")
    log("=" * 80)
    
    # GET /api/ → 200
    log("Regression 1: GET /api/...")
    try:
        r = requests.get(f"{BASE_URL}/", timeout=30)
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            log(f"  ✅ PASS: Root endpoint working")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # GET /api/admin/ads/overview → 200
    log("\nRegression 2: GET /api/admin/ads/overview...")
    try:
        r = requests.get(
            f"{BASE_URL}/admin/ads/overview",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            log(f"  ✅ PASS: Overview endpoint working")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")
    
    # GET /api/admin/ads/campaigns → 200
    log("\nRegression 3: GET /api/admin/ads/campaigns...")
    try:
        r = requests.get(
            f"{BASE_URL}/admin/ads/campaigns",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        log(f"  Status: {r.status_code} (expected 200)")
        if r.status_code == 200:
            data = r.json()
            log(f"  ok: {data.get('ok')} (expected True)")
            log(f"  ✅ PASS: Campaigns endpoint working")
        else:
            log(f"  ❌ FAIL: Expected 200, got {r.status_code}")
    except Exception as e:
        log(f"  ❌ EXCEPTION: {e}")

def main():
    log("=" * 80)
    log("DigiHome Ads Intelligence Backend Testing")
    log("Base URL: " + BASE_URL)
    log("Admin Key: " + ADMIN_KEY)
    log("Webhook Secret: " + WEBHOOK_SECRET[:20] + "...")
    log("Timeout: " + str(TIMEOUT) + "s")
    log("=" * 80)
    log("")
    log("⚠️  SAFETY NOTICE: Testing against LIVE Google Ads account 9853356154")
    log("⚠️  Using dryRun=true and empty bodies to avoid mutations")
    log("")
    
    try:
        test_ads_table()
        test_recommendations()
        test_keyword_research_and_ai()
        test_optimization_orchestrator()
        test_closed_loop_webhook()
        test_regression()
        
        log("\n" + "=" * 80)
        log("ALL TESTS COMPLETED")
        log("=" * 80)
        log("\nReview the output above for ✅ PASS and ❌ FAIL markers")
        log("Report findings to main agent with actual status codes and observed fields")
        
    except KeyboardInterrupt:
        log("\n\nTests interrupted by user")
        sys.exit(1)
    except Exception as e:
        log(f"\n\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
