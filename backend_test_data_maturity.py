#!/usr/bin/env python3
"""
Backend test for Data Maturity System (READ-ONLY endpoints)
Tests the new data maturity system with learning phase protection.
All endpoints are READ-ONLY (no mutations to live Google Ads account).
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60  # Real Google API calls behind

# Test results
tests_passed = 0
tests_failed = 0

def log_test(test_name, passed, details=""):
    """Log test result"""
    global tests_passed, tests_failed
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status}: {test_name}")
    if details:
        print(f"  {details}")
    if passed:
        tests_passed += 1
    else:
        tests_failed += 1

def test_campaigns_maturity():
    """Test (a): GET /api/admin/ads/campaigns - verify maturity object per campaign"""
    print("\n" + "="*80)
    print("TEST (a): GET /api/admin/ads/campaigns - Maturity Object Verification")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/campaigns?key={ADMIN_KEY}"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("Campaigns endpoint returns 200", False, f"Got {response.status_code}")
            return
        
        log_test("Campaigns endpoint returns 200", True)
        
        data = response.json()
        
        # Verify ok:true
        if not data.get('ok'):
            log_test("Response has ok:true", False, f"ok={data.get('ok')}")
            return
        log_test("Response has ok:true", True)
        
        # Verify campaigns array
        campaigns = data.get('campaigns', [])
        if not isinstance(campaigns, list):
            log_test("Response has campaigns array", False, f"campaigns is {type(campaigns)}")
            return
        log_test("Response has campaigns array", True, f"Found {len(campaigns)} campaigns")
        
        # Verify each campaign has maturity object
        valid_phases = {'LÆRING', 'KALIBRERING', 'MODEN', 'UKJENT'}
        
        for i, campaign in enumerate(campaigns):
            campaign_name = campaign.get('name', f'Campaign {i}')
            print(f"\n  Verifying campaign: {campaign_name}")
            
            # Check startDate
            start_date = campaign.get('startDate')
            if not start_date:
                log_test(f"Campaign {i} has startDate", False, f"startDate={start_date}")
                continue
            
            # Verify YYYY-MM-DD format
            try:
                datetime.strptime(start_date, '%Y-%m-%d')
                log_test(f"Campaign {i} startDate format YYYY-MM-DD", True, f"startDate={start_date}")
            except ValueError:
                log_test(f"Campaign {i} startDate format YYYY-MM-DD", False, f"Invalid format: {start_date}")
                continue
            
            # Check maturity object
            maturity = campaign.get('maturity')
            if not isinstance(maturity, dict):
                log_test(f"Campaign {i} has maturity object", False, f"maturity is {type(maturity)}")
                continue
            log_test(f"Campaign {i} has maturity object", True)
            
            # Check maturity.phase
            phase = maturity.get('phase')
            if phase not in valid_phases:
                log_test(f"Campaign {i} maturity.phase valid", False, f"phase={phase}, expected one of {valid_phases}")
                continue
            log_test(f"Campaign {i} maturity.phase valid", True, f"phase={phase}")
            
            # Check maturity.daysLive
            days_live = maturity.get('daysLive')
            if not isinstance(days_live, (int, float)) or days_live < 0:
                log_test(f"Campaign {i} maturity.daysLive >= 0", False, f"daysLive={days_live}")
                continue
            log_test(f"Campaign {i} maturity.daysLive >= 0", True, f"daysLive={days_live}")
            
            # Check maturity.label
            label = maturity.get('label')
            if not isinstance(label, str):
                log_test(f"Campaign {i} maturity.label is string", False, f"label={type(label)}")
                continue
            log_test(f"Campaign {i} maturity.label is string", True, f"label='{label}'")
            
            # Check maturity.note
            note = maturity.get('note')
            if not isinstance(note, str):
                log_test(f"Campaign {i} maturity.note is string", False, f"note={type(note)}")
                continue
            log_test(f"Campaign {i} maturity.note is string", True, f"note='{note[:50]}...'")
            
            print(f"  ✓ Campaign '{campaign_name}': phase={phase}, daysLive={days_live}, startDate={start_date}")
        
    except Exception as e:
        log_test("Campaigns maturity test", False, f"Exception: {str(e)}")

def test_recommendations_learning_protection():
    """Test (b): GET /api/admin/ads/recommendations - verify learning phase protection"""
    print("\n" + "="*80)
    print("TEST (b): GET /api/admin/ads/recommendations - Learning Phase Protection")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/recommendations?key={ADMIN_KEY}&period=last_30d"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("Recommendations endpoint returns 200", False, f"Got {response.status_code}")
            return
        
        log_test("Recommendations endpoint returns 200", True)
        
        data = response.json()
        
        # Verify recommendations array
        recommendations = data.get('recommendations', [])
        if not isinstance(recommendations, list):
            log_test("Response has recommendations array", False, f"recommendations is {type(recommendations)}")
            return
        log_test("Response has recommendations array", True, f"Found {len(recommendations)} recommendations")
        
        if len(recommendations) == 0:
            log_test("Recommendations array not empty", False, "No recommendations found")
            return
        
        # Verify first recommendation is info:data-maturity
        first_rec = recommendations[0]
        first_id = first_rec.get('id')
        first_type = first_rec.get('type')
        
        if first_id != 'info:data-maturity':
            log_test("First recommendation id is 'info:data-maturity'", False, f"Got id='{first_id}'")
        else:
            log_test("First recommendation id is 'info:data-maturity'", True)
        
        if first_type != 'info':
            log_test("First recommendation type is 'info'", False, f"Got type='{first_type}'")
        else:
            log_test("First recommendation type is 'info'", True)
        
        # Verify action.kind is 'none'
        action = first_rec.get('action', {})
        action_kind = action.get('kind')
        if action_kind != 'none':
            log_test("First recommendation action.kind is 'none'", False, f"Got action.kind='{action_kind}'")
        else:
            log_test("First recommendation action.kind is 'none'", True)
        
        # Verify NO Google recommendations with protected types
        protected_types = {'pause_keyword', 'pause_ad', 'ai_refresh', 'scale_budget'}
        google_protected_recs = []
        
        for rec in recommendations:
            channel = rec.get('channel')
            rec_type = rec.get('type')
            rec_id = rec.get('id', 'unknown')
            
            if channel == 'google' and rec_type in protected_types:
                google_protected_recs.append({
                    'id': rec_id,
                    'type': rec_type,
                    'channel': channel
                })
        
        if google_protected_recs:
            log_test("NO Google recommendations with protected types", False, 
                    f"Found {len(google_protected_recs)} protected Google recs: {google_protected_recs}")
        else:
            log_test("NO Google recommendations with protected types", True, 
                    "Learning phase protection working (no pause_keyword/pause_ad/ai_refresh/scale_budget for Google)")
        
        # Count Meta recommendations (should be OK)
        meta_recs = [r for r in recommendations if r.get('channel') == 'meta']
        print(f"\n  Meta recommendations found: {len(meta_recs)} (expected and OK)")
        
    except Exception as e:
        log_test("Recommendations learning protection test", False, f"Exception: {str(e)}")

def test_overview_maturity_enrichment():
    """Test (c): GET /api/admin/ads/overview - verify maturity enrichment in economics.campaigns"""
    print("\n" + "="*80)
    print("TEST (c): GET /api/admin/ads/overview - Maturity Enrichment")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}&googlePeriod=last_30d"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("Overview endpoint returns 200", False, f"Got {response.status_code}")
            return
        
        log_test("Overview endpoint returns 200", True)
        
        data = response.json()
        
        # Verify economics.campaigns
        economics = data.get('economics', {})
        campaigns = economics.get('campaigns', [])
        
        if not isinstance(campaigns, list):
            log_test("economics.campaigns is list", False, f"campaigns is {type(campaigns)}")
            return
        log_test("economics.campaigns is list", True, f"Found {len(campaigns)} campaigns")
        
        # Expected Google campaign names
        expected_google_campaigns = [
            'DH | Utleie | Bergen | Search',
            'DigiHome – Konkurrent · Utleiemegleren'
        ]
        
        # Verify maturity for Google campaigns
        google_campaigns_found = []
        
        for campaign in campaigns:
            name = campaign.get('name', '')
            maturity = campaign.get('maturity')
            
            # Check if this is one of the expected Google campaigns
            if any(expected in name for expected in expected_google_campaigns):
                google_campaigns_found.append(name)
                
                if not isinstance(maturity, dict):
                    log_test(f"Campaign '{name}' has maturity object", False, f"maturity is {type(maturity)}")
                    continue
                
                phase = maturity.get('phase')
                if phase != 'LÆRING':
                    log_test(f"Campaign '{name}' maturity.phase is 'LÆRING'", False, f"Got phase='{phase}'")
                else:
                    log_test(f"Campaign '{name}' maturity.phase is 'LÆRING'", True)
                
                print(f"  ✓ Google campaign '{name}': maturity.phase={phase}")
        
        if len(google_campaigns_found) == 0:
            log_test("Found Google campaigns in overview", False, "No Google campaigns found")
        else:
            log_test("Found Google campaigns in overview", True, f"Found {len(google_campaigns_found)} campaigns")
        
    except Exception as e:
        log_test("Overview maturity enrichment test", False, f"Exception: {str(e)}")

def test_regression():
    """Test (d): Regression tests"""
    print("\n" + "="*80)
    print("TEST (d): Regression Tests")
    print("="*80)
    
    try:
        # Test GET /api/admin/pulse
        url = f"{BASE_URL}/admin/pulse?key={ADMIN_KEY}"
        print(f"\nCalling: {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/admin/pulse returns 200", False, f"Got {response.status_code}")
        else:
            log_test("GET /api/admin/pulse returns 200", True)
        
        # Test GET /api/
        url = f"{BASE_URL}/"
        print(f"\nCalling: {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/ returns 200", False, f"Got {response.status_code}")
        else:
            data = response.json()
            if data.get('ok'):
                log_test("GET /api/ returns 200 with ok:true", True)
            else:
                log_test("GET /api/ returns 200 with ok:true", False, f"ok={data.get('ok')}")
        
    except Exception as e:
        log_test("Regression tests", False, f"Exception: {str(e)}")

def test_auth_negative():
    """Test (e): Auth-negative test"""
    print("\n" + "="*80)
    print("TEST (e): Auth-Negative Test")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/ads/campaigns"  # WITHOUT key
        print(f"Calling: {url} (without key)")
        
        response = requests.get(url, timeout=TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            log_test("GET /api/admin/ads/campaigns without key returns 401", False, f"Got {response.status_code}")
        else:
            log_test("GET /api/admin/ads/campaigns without key returns 401", True)
        
    except Exception as e:
        log_test("Auth-negative test", False, f"Exception: {str(e)}")

def main():
    """Run all tests"""
    print("="*80)
    print("DATA MATURITY SYSTEM BACKEND TESTING")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s (real Google API calls)")
    print("="*80)
    print("\nCRITICAL: All endpoints are READ-ONLY (no mutations to live Google Ads account)")
    print("="*80)
    
    # Run all tests
    test_campaigns_maturity()
    test_recommendations_learning_protection()
    test_overview_maturity_enrichment()
    test_regression()
    test_auth_negative()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Tests passed: {tests_passed}")
    print(f"Tests failed: {tests_failed}")
    print(f"Total tests: {tests_passed + tests_failed}")
    print(f"Success rate: {tests_passed / (tests_passed + tests_failed) * 100:.1f}%")
    print("="*80)
    
    if tests_failed > 0:
        print("\n❌ SOME TESTS FAILED")
        sys.exit(1)
    else:
        print("\n✅ ALL TESTS PASSED")
        sys.exit(0)

if __name__ == "__main__":
    main()
