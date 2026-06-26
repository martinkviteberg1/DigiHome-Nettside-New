#!/usr/bin/env python3
"""
Backend test for Admin Intelligence Extension endpoints.
Tests Web Vitals, anomaly detection, live visitors, lead pipeline, and AI lead scoring.
"""

import requests
import json
import time

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_admin_analytics():
    """Test GET /api/admin/analytics with new fields: webVitals, leads.totals (won/lost/winRate/avgResponseHours/slaPct), leads.pipeline, anomalies"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/admin/analytics?key=...&days=30")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/analytics?key={ADMIN_KEY}&days=30"
        response = requests.get(url, timeout=15)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Check for 4 main keys
        required_keys = ['traffic', 'leads', 'webVitals', 'anomalies']
        for key in required_keys:
            if key not in data:
                print(f"❌ FAILED: Missing key '{key}' in response")
                return False
        
        print(f"✅ All 4 main keys present: {required_keys}")
        
        # Check webVitals structure
        wv = data['webVitals']
        if 'metrics' not in wv or not isinstance(wv['metrics'], list):
            print(f"❌ FAILED: webVitals.metrics is not an array")
            return False
        
        print(f"✅ webVitals.metrics is an array with {len(wv['metrics'])} items")
        
        # Check webVitals.metrics items
        if len(wv['metrics']) > 0:
            metric = wv['metrics'][0]
            required_metric_fields = ['name', 'p75', 'unit', 'rating', 'samples', 'p75Mobile', 'p75Desktop']
            for field in required_metric_fields:
                if field not in metric:
                    print(f"❌ FAILED: webVitals.metrics[0] missing field '{field}'")
                    return False
            
            # Check name is one of the expected values
            valid_names = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB']
            if metric['name'] not in valid_names:
                print(f"❌ FAILED: webVitals.metrics[0].name is '{metric['name']}', expected one of {valid_names}")
                return False
            
            print(f"✅ webVitals.metrics[0]: name={metric['name']}, p75={metric['p75']}{metric['unit']}, rating={metric['rating']}, samples={metric['samples']}")
        
        # Check leads.totals NEW fields
        leads = data['leads']
        if 'totals' not in leads:
            print(f"❌ FAILED: leads.totals missing")
            return False
        
        totals = leads['totals']
        new_fields = ['won', 'lost', 'winRate', 'avgResponseHours', 'slaPct']
        for field in new_fields:
            if field not in totals:
                print(f"❌ FAILED: leads.totals missing NEW field '{field}'")
                return False
        
        print(f"✅ leads.totals NEW fields present: won={totals['won']}, lost={totals['lost']}, winRate={totals['winRate']}%, avgResponseHours={totals['avgResponseHours']}, slaPct={totals['slaPct']}%")
        
        # Check leads.pipeline
        if 'pipeline' not in leads or not isinstance(leads['pipeline'], list):
            print(f"❌ FAILED: leads.pipeline is not an array")
            return False
        
        expected_stages = ['Ny', 'Kontaktet', 'Kvalifisert', 'Vunnet', 'Tapt']
        pipeline_stages = [p['stage'] for p in leads['pipeline']]
        if pipeline_stages != expected_stages:
            print(f"❌ FAILED: leads.pipeline stages {pipeline_stages} != expected {expected_stages}")
            return False
        
        print(f"✅ leads.pipeline has all 5 stages: {[(p['stage'], p['count']) for p in leads['pipeline']]}")
        
        # Check anomalies
        if not isinstance(data['anomalies'], list):
            print(f"❌ FAILED: anomalies is not an array")
            return False
        
        print(f"✅ anomalies is an array with {len(data['anomalies'])} items (may be empty)")
        
        # Regression: traffic and leads still present
        if 'totals' not in data['traffic']:
            print(f"❌ FAILED: traffic.totals missing (regression)")
            return False
        
        print(f"✅ REGRESSION: traffic.totals present with sessions={data['traffic']['totals']['sessions']}")
        
        print(f"\n✅ TEST 1 PASSED: GET /api/admin/analytics returns 200 with all required fields")
        return True
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_admin_live():
    """Test GET /api/admin/live with and without key"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/admin/live")
    print("="*80)
    
    try:
        # Test WITH key
        url = f"{BASE_URL}/admin/live?key={ADMIN_KEY}"
        response = requests.get(url, timeout=10)
        
        print(f"WITH key - Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Check required fields
        required_fields = ['activeNow', 'sessions30m', 'topPages', 'feed', 'ts']
        for field in required_fields:
            if field not in data:
                print(f"❌ FAILED: Missing field '{field}' in response")
                return False
        
        # Check types
        if not isinstance(data['activeNow'], int):
            print(f"❌ FAILED: activeNow is not an int")
            return False
        
        if not isinstance(data['sessions30m'], int):
            print(f"❌ FAILED: sessions30m is not an int")
            return False
        
        if not isinstance(data['topPages'], list):
            print(f"❌ FAILED: topPages is not an array")
            return False
        
        if not isinstance(data['feed'], list):
            print(f"❌ FAILED: feed is not an array")
            return False
        
        print(f"✅ WITH key: activeNow={data['activeNow']}, sessions30m={data['sessions30m']}, topPages={len(data['topPages'])} items, feed={len(data['feed'])} items")
        
        # Check Cache-Control header
        cache_control = response.headers.get('Cache-Control', '')
        if 'no-store' not in cache_control:
            print(f"⚠️  WARNING: Cache-Control header does not contain 'no-store': {cache_control}")
        else:
            print(f"✅ Cache-Control header contains 'no-store'")
        
        # Test WITHOUT key
        url_no_key = f"{BASE_URL}/admin/live"
        response_no_key = requests.get(url_no_key, timeout=10)
        
        print(f"WITHOUT key - Status Code: {response_no_key.status_code}")
        
        if response_no_key.status_code != 401:
            print(f"❌ FAILED: Expected 401 without key, got {response_no_key.status_code}")
            return False
        
        print(f"✅ WITHOUT key: Returns 401 (authentication required)")
        
        print(f"\n✅ TEST 2 PASSED: GET /api/admin/live working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_get_existing_lead():
    """Get an existing lead id for subsequent tests"""
    print("\n" + "="*80)
    print("TEST 3: GET existing lead id from /api/leads")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/leads?key={ADMIN_KEY}"
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return None
        
        leads = response.json()
        
        if not isinstance(leads, list) or len(leads) == 0:
            print(f"❌ FAILED: No leads found in database")
            return None
        
        lead_id = leads[0]['id']
        original_status = leads[0].get('status', 'new')
        
        print(f"✅ Found lead: id={lead_id}, status={original_status}")
        print(f"\n✅ TEST 3 PASSED: Retrieved existing lead id")
        
        return {'id': lead_id, 'original_status': original_status}
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_admin_lead_status(lead_info):
    """Test POST /api/admin/lead-status with various scenarios"""
    print("\n" + "="*80)
    print("TEST 4: POST /api/admin/lead-status")
    print("="*80)
    
    if not lead_info:
        print(f"❌ SKIPPED: No lead info available")
        return False
    
    lead_id = lead_info['id']
    original_status = lead_info['original_status']
    
    try:
        # Test 4a: Valid status update
        url = f"{BASE_URL}/admin/lead-status?key={ADMIN_KEY}"
        payload = {"id": lead_id, "status": "contacted"}
        response = requests.post(url, json=payload, timeout=10)
        
        print(f"4a) Valid status 'contacted' - Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        if not data.get('ok') or data.get('status') != 'contacted':
            print(f"❌ FAILED: Expected {{ok:true, status:'contacted'}}, got {data}")
            return False
        
        print(f"✅ Valid status update: {data}")
        
        # Test 4b: Invalid status
        payload_invalid = {"id": lead_id, "status": "bogus"}
        response_invalid = requests.post(url, json=payload_invalid, timeout=10)
        
        print(f"4b) Invalid status 'bogus' - Status Code: {response_invalid.status_code}")
        
        if response_invalid.status_code != 400:
            print(f"❌ FAILED: Expected 400 for invalid status, got {response_invalid.status_code}")
            return False
        
        print(f"✅ Invalid status returns 400")
        
        # Test 4c: Unknown id
        payload_unknown = {"id": "nope", "status": "contacted"}
        response_unknown = requests.post(url, json=payload_unknown, timeout=10)
        
        print(f"4c) Unknown id 'nope' - Status Code: {response_unknown.status_code}")
        
        if response_unknown.status_code != 404:
            print(f"❌ FAILED: Expected 404 for unknown id, got {response_unknown.status_code}")
            return False
        
        print(f"✅ Unknown id returns 404")
        
        # Test 4d: Without key
        url_no_key = f"{BASE_URL}/admin/lead-status"
        payload_no_key = {"id": lead_id, "status": "contacted"}
        response_no_key = requests.post(url_no_key, json=payload_no_key, timeout=10)
        
        print(f"4d) WITHOUT key - Status Code: {response_no_key.status_code}")
        
        if response_no_key.status_code != 401:
            print(f"❌ FAILED: Expected 401 without key, got {response_no_key.status_code}")
            return False
        
        print(f"✅ WITHOUT key returns 401")
        
        # Restore original status
        print(f"\nRestoring original status '{original_status}'...")
        payload_restore = {"id": lead_id, "status": original_status}
        response_restore = requests.post(url, json=payload_restore, timeout=10)
        
        if response_restore.status_code == 200:
            print(f"✅ Status restored to '{original_status}'")
        else:
            print(f"⚠️  WARNING: Could not restore status (got {response_restore.status_code})")
        
        print(f"\n✅ TEST 4 PASSED: POST /api/admin/lead-status working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_admin_lead_score(lead_info):
    """Test POST /api/admin/lead-score with LLM integration"""
    print("\n" + "="*80)
    print("TEST 5: POST /api/admin/lead-score (LLM integration, timeout 30s)")
    print("="*80)
    
    if not lead_info:
        print(f"❌ SKIPPED: No lead info available")
        return False
    
    lead_id = lead_info['id']
    
    try:
        # Test 5a: Valid lead scoring
        url = f"{BASE_URL}/admin/lead-score?key={ADMIN_KEY}"
        payload = {"id": lead_id}
        
        print(f"Calling LLM for lead scoring (may take 2-30s)...")
        start_time = time.time()
        response = requests.post(url, json=payload, timeout=35)
        elapsed = time.time() - start_time
        
        print(f"5a) Valid lead id - Status Code: {response.status_code} (took {elapsed:.1f}s)")
        
        # 502 from LLM is acceptable (transient)
        if response.status_code == 502:
            print(f"⚠️  ACCEPTABLE: LLM returned 502 (transient error, acceptable per spec)")
            data = response.json()
            if 'error' in data:
                print(f"   Error message: {data['error']}")
            # Continue to test other scenarios
        elif response.status_code != 200:
            print(f"❌ FAILED: Expected 200 or 502, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        else:
            data = response.json()
            
            if not data.get('ok'):
                print(f"❌ FAILED: Expected {{ok:true}}, got {data}")
                return False
            
            if 'aiScore' not in data:
                print(f"❌ FAILED: Missing 'aiScore' in response")
                return False
            
            ai_score = data['aiScore']
            required_fields = ['score', 'label', 'reasoning', 'nextAction']
            for field in required_fields:
                if field not in ai_score:
                    print(f"❌ FAILED: aiScore missing field '{field}'")
                    return False
            
            # Check score is 0-100 int
            score = ai_score['score']
            if not isinstance(score, int) or score < 0 or score > 100:
                print(f"❌ FAILED: aiScore.score={score} is not an int between 0-100")
                return False
            
            print(f"✅ Valid lead scoring: score={score}, label='{ai_score['label']}', reasoning='{ai_score['reasoning'][:80]}...', nextAction='{ai_score['nextAction'][:60]}...'")
        
        # Test 5b: Unknown id
        payload_unknown = {"id": "nope"}
        response_unknown = requests.post(url, json=payload_unknown, timeout=35)
        
        print(f"5b) Unknown id 'nope' - Status Code: {response_unknown.status_code}")
        
        if response_unknown.status_code != 404:
            print(f"❌ FAILED: Expected 404 for unknown id, got {response_unknown.status_code}")
            return False
        
        print(f"✅ Unknown id returns 404")
        
        # Test 5c: Without key
        url_no_key = f"{BASE_URL}/admin/lead-score"
        payload_no_key = {"id": lead_id}
        response_no_key = requests.post(url_no_key, json=payload_no_key, timeout=10)
        
        print(f"5c) WITHOUT key - Status Code: {response_no_key.status_code}")
        
        if response_no_key.status_code != 401:
            print(f"❌ FAILED: Expected 401 without key, got {response_no_key.status_code}")
            return False
        
        print(f"✅ WITHOUT key returns 401")
        
        print(f"\n✅ TEST 5 PASSED: POST /api/admin/lead-score working correctly (502 from LLM is acceptable)")
        return True
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_admin_ai_insight():
    """Test POST /api/admin/ai-insight with enriched context"""
    print("\n" + "="*80)
    print("TEST 6: POST /api/admin/ai-insight (LLM integration, timeout 30s)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ai-insight?key={ADMIN_KEY}"
        payload = {"mode": "summary", "days": 30}
        
        print(f"Calling LLM for AI insight (may take 2-30s)...")
        start_time = time.time()
        response = requests.post(url, json=payload, timeout=35)
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code} (took {elapsed:.1f}s)")
        
        # 502 from LLM is acceptable (transient)
        if response.status_code == 502:
            print(f"⚠️  ACCEPTABLE: LLM returned 502 (transient error, acceptable per spec)")
            data = response.json()
            if 'error' in data:
                print(f"   Error message: {data['error']}")
            print(f"\n✅ TEST 6 PASSED: POST /api/admin/ai-insight endpoint working (502 from LLM is acceptable)")
            return True
        elif response.status_code != 200:
            print(f"❌ FAILED: Expected 200 or 502, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        if not data.get('ok'):
            print(f"❌ FAILED: Expected {{ok:true}}, got {data}")
            return False
        
        if 'answer' not in data or not isinstance(data['answer'], str):
            print(f"❌ FAILED: Missing or invalid 'answer' field")
            return False
        
        answer_len = len(data['answer'])
        print(f"✅ AI insight generated: answer length={answer_len} chars")
        print(f"   Answer preview: {data['answer'][:200]}...")
        
        print(f"\n✅ TEST 6 PASSED: POST /api/admin/ai-insight returns 200 with answer")
        return True
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_regression():
    """Test regression: GET /api/admin/analytics must still include traffic + leads, GET /api/ returns 200"""
    print("\n" + "="*80)
    print("TEST 7: REGRESSION TESTS")
    print("="*80)
    
    try:
        # Test 7a: GET /api/admin/analytics still includes traffic + leads
        url_analytics = f"{BASE_URL}/admin/analytics?key={ADMIN_KEY}&days=30"
        response_analytics = requests.get(url_analytics, timeout=15)
        
        print(f"7a) GET /api/admin/analytics - Status Code: {response_analytics.status_code}")
        
        if response_analytics.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response_analytics.status_code}")
            return False
        
        data = response_analytics.json()
        
        if 'traffic' not in data or 'leads' not in data:
            print(f"❌ FAILED: Missing 'traffic' or 'leads' in response (regression)")
            return False
        
        if 'totals' not in data['traffic']:
            print(f"❌ FAILED: traffic.totals missing (regression)")
            return False
        
        print(f"✅ REGRESSION: GET /api/admin/analytics still includes traffic + leads (not 500)")
        
        # Test 7b: GET /api/ returns 200 {ok:true}
        url_root = f"{BASE_URL}/"
        response_root = requests.get(url_root, timeout=10)
        
        print(f"7b) GET /api/ - Status Code: {response_root.status_code}")
        
        if response_root.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response_root.status_code}")
            return False
        
        data_root = response_root.json()
        
        if not data_root.get('ok'):
            print(f"❌ FAILED: Expected {{ok:true}}, got {data_root}")
            return False
        
        print(f"✅ REGRESSION: GET /api/ returns 200 {{ok:true}}")
        
        print(f"\n✅ TEST 7 PASSED: All regression tests passed")
        return True
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n" + "="*80)
    print("ADMIN INTELLIGENCE EXTENSION - BACKEND TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    
    results = {}
    
    # Test 1: GET /api/admin/analytics
    results['test_1_admin_analytics'] = test_admin_analytics()
    
    # Test 2: GET /api/admin/live
    results['test_2_admin_live'] = test_admin_live()
    
    # Test 3: Get existing lead id
    lead_info = test_get_existing_lead()
    results['test_3_get_lead'] = lead_info is not None
    
    # Test 4: POST /api/admin/lead-status
    results['test_4_lead_status'] = test_admin_lead_status(lead_info)
    
    # Test 5: POST /api/admin/lead-score
    results['test_5_lead_score'] = test_admin_lead_score(lead_info)
    
    # Test 6: POST /api/admin/ai-insight
    results['test_6_ai_insight'] = test_admin_ai_insight()
    
    # Test 7: Regression tests
    results['test_7_regression'] = test_regression()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit(main())
