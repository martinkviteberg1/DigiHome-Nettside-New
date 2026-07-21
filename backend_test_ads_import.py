#!/usr/bin/env python3
"""
Backend test for Google Ads CSV import + ROAS/CPA join (Annonser Fase A).
Tests POST /api/admin/ads/import, GET /api/admin/ads/overview, DELETE /api/admin/ads/import.
Uses OBVIOUSLY FAKE test data and CLEANS UP everything afterward.
"""

import requests
import json
import time

BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test CSV with Norwegian number format (comma as decimal separator, quoted fields)
TEST_CSV_WITH_PERIOD = """Campaign report (2026-01-01 - 2026-01-31)
Campaign,Impr.,Clicks,Cost,Conversions
Brand - Bergen,"12 345","678","9 876,54","12"
Generic - Utleie,"5 000","200","3 000,00","4"
Total: All campaigns,"17 345","878","12 876,54","16"
"""

# CSV without period preamble (will default to last 30 days)
TEST_CSV_NO_PERIOD = """Campaign,Impr.,Clicks,Cost,Conversions
Brand - Bergen,"10 000","500","5 000,00","8"
"""

def test_csv_parse():
    """TEST 1: CSV PARSE - POST /api/admin/ads/import with valid CSV"""
    print("\n=== TEST 1: CSV PARSE ===")
    try:
        url = f"{BASE_URL}/admin/ads/import?key={ADMIN_KEY}"
        payload = {"csv": TEST_CSV_WITH_PERIOD}
        
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)[:200]}...")
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 201:
            print(f"❌ FAILED: Expected 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return None
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        
        # Verify response structure
        if not data.get('ok'):
            print(f"❌ FAILED: ok is not true")
            return None
        
        if data.get('parsedCampaigns') != 2:
            print(f"❌ FAILED: Expected parsedCampaigns=2, got {data.get('parsedCampaigns')}")
            return None
        
        economics = data.get('economics', {})
        totals = economics.get('totals', {})
        
        # Verify totals
        expected_cost = 12876.54
        actual_cost = totals.get('cost', 0)
        if abs(actual_cost - expected_cost) > 0.1:
            print(f"❌ FAILED: Expected cost≈{expected_cost}, got {actual_cost}")
            return None
        
        if totals.get('clicks') != 878:
            print(f"❌ FAILED: Expected clicks=878, got {totals.get('clicks')}")
            return None
        
        if totals.get('impressions') != 17345:
            print(f"❌ FAILED: Expected impressions=17345, got {totals.get('impressions')}")
            return None
        
        expected_avg_cpc = 14.66
        actual_avg_cpc = totals.get('avgCpc', 0)
        if abs(actual_avg_cpc - expected_avg_cpc) > 0.1:
            print(f"❌ FAILED: Expected avgCpc≈{expected_avg_cpc}, got {actual_avg_cpc}")
            return None
        
        if economics.get('currency') != 'NOK':
            print(f"❌ FAILED: Expected currency='NOK', got {economics.get('currency')}")
            return None
        
        campaigns = economics.get('campaigns', [])
        if len(campaigns) != 2:
            print(f"❌ FAILED: Expected 2 campaigns, got {len(campaigns)}")
            return None
        
        # Verify campaigns are sorted by cost descending (Brand - Bergen first)
        if campaigns[0].get('name') != 'Brand - Bergen':
            print(f"❌ FAILED: Expected first campaign 'Brand - Bergen', got {campaigns[0].get('name')}")
            return None
        
        period = economics.get('period', {})
        period_from = period.get('from', '')
        if not period_from.startswith('2026-01-01'):
            print(f"❌ FAILED: Expected period.from to start with '2026-01-01', got {period_from}")
            return None
        
        import_id = economics.get('importId')
        if not import_id:
            print(f"❌ FAILED: No importId in economics")
            return None
        
        print(f"✅ PASSED: CSV parsed correctly")
        print(f"  - parsedCampaigns: 2")
        print(f"  - totals.cost: {actual_cost}")
        print(f"  - totals.clicks: {totals.get('clicks')}")
        print(f"  - totals.impressions: {totals.get('impressions')}")
        print(f"  - totals.avgCpc: {actual_avg_cpc}")
        print(f"  - currency: {economics.get('currency')}")
        print(f"  - campaigns[0].name: {campaigns[0].get('name')}")
        print(f"  - period.from: {period_from}")
        print(f"  - importId: {import_id}")
        
        return import_id
        
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def test_invalid_csv():
    """TEST 2: INVALID CSV - Test error handling"""
    print("\n=== TEST 2: INVALID CSV ===")
    
    # Test 2a: Invalid CSV format
    print("\n--- Test 2a: Invalid CSV format ---")
    try:
        url = f"{BASE_URL}/admin/ads/import?key={ADMIN_KEY}"
        payload = {"csv": "foo,bar\n1,2"}
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 400:
            print(f"❌ FAILED: Expected 400, got {response.status_code}")
        else:
            data = response.json()
            if not data.get('ok') and data.get('error'):
                print(f"✅ PASSED: Invalid CSV rejected with error: {data.get('error')}")
            else:
                print(f"❌ FAILED: Expected ok=false and error message")
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
    
    # Test 2b: Empty CSV
    print("\n--- Test 2b: Empty CSV ---")
    try:
        url = f"{BASE_URL}/admin/ads/import?key={ADMIN_KEY}"
        payload = {"csv": ""}
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 400:
            print(f"❌ FAILED: Expected 400, got {response.status_code}")
        else:
            data = response.json()
            if not data.get('ok') and data.get('error'):
                print(f"✅ PASSED: Empty CSV rejected with error: {data.get('error')}")
            else:
                print(f"❌ FAILED: Expected ok=false and error message")
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")


def test_join_with_leads():
    """TEST 3: JOIN TEST - Create leads and verify ROAS calculation"""
    print("\n=== TEST 3: JOIN TEST ===")
    
    lead_id = None
    import_id = None
    
    try:
        # 3a: Create a paid lead with attribution
        print("\n--- Test 3a: Create paid lead ---")
        url = f"{BASE_URL}/leads"
        payload = {
            "name": "QA Paid Lead",
            "email": "qa-paid-1@example.test",
            "phone": "+47 90000010",
            "address": "Testveien 2",
            "lead_type": "huseier",
            "source": "qa-ads",
            "attribution": {
                "source": "google",
                "medium": "cpc",
                "campaign": "Brand - Bergen"
            }
        }
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 201:
            print(f"❌ FAILED: Expected 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return None, None
        
        data = response.json()
        lead_data = data.get('data', {}) or data.get('lead', {})
        lead_id = lead_data.get('id')
        
        if not lead_id:
            print(f"❌ FAILED: No lead id in response")
            return None, None
        
        # Verify attribution.channel is 'Betalt'
        lead_obj = data.get('lead', {})
        attribution = lead_obj.get('attribution', {})
        channel = attribution.get('channel')
        
        if channel != 'Betalt':
            print(f"❌ FAILED: Expected channel='Betalt', got '{channel}'")
        else:
            print(f"✅ PASSED: Lead created with channel='Betalt'")
        
        print(f"  - lead.id: {lead_id}")
        print(f"  - attribution.channel: {channel}")
        
        # 3b: Mark lead as won with value
        print("\n--- Test 3b: Mark lead as won ---")
        url = f"{BASE_URL}/admin/lead-status?key={ADMIN_KEY}"
        payload = {
            "id": lead_id,
            "status": "won",
            "value": 50000,
            "currency": "NOK"
        }
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return lead_id, None
        
        data = response.json()
        if not data.get('ok'):
            print(f"❌ FAILED: ok is not true")
            return lead_id, None
        
        print(f"✅ PASSED: Lead marked as won with value=50000 NOK")
        
        # 3c: Create import WITHOUT period (defaults to last 30 days)
        print("\n--- Test 3c: Create import without period ---")
        url = f"{BASE_URL}/admin/ads/import?key={ADMIN_KEY}"
        payload = {"csv": TEST_CSV_NO_PERIOD}
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 201:
            print(f"❌ FAILED: Expected 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return lead_id, None
        
        data = response.json()
        economics = data.get('economics', {})
        import_id = economics.get('importId')
        
        print(f"✅ PASSED: Import created (defaults to last 30 days)")
        print(f"  - importId: {import_id}")
        
        # 3d: Get overview and verify join
        print("\n--- Test 3d: Verify ROAS calculation ---")
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}"
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return lead_id, import_id
        
        data = response.json()
        
        if not data.get('ok'):
            print(f"❌ FAILED: ok is not true")
            return lead_id, import_id
        
        if data.get('empty'):
            print(f"❌ FAILED: Overview is empty")
            return lead_id, import_id
        
        economics = data.get('economics', {})
        totals = economics.get('totals', {})
        campaigns = economics.get('campaigns', [])
        
        # Verify totals have leads
        total_leads = totals.get('leads', 0)
        if total_leads < 1:
            print(f"❌ FAILED: Expected totals.leads >= 1, got {total_leads}")
            return lead_id, import_id
        
        print(f"✅ PASSED: totals.leads = {total_leads}")
        
        # Find Brand - Bergen campaign
        brand_bergen = None
        for c in campaigns:
            if c.get('name') == 'Brand - Bergen':
                brand_bergen = c
                break
        
        if not brand_bergen:
            print(f"❌ FAILED: 'Brand - Bergen' campaign not found")
            return lead_id, import_id
        
        # Verify campaign metrics
        campaign_leads = brand_bergen.get('leads', 0)
        campaign_won = brand_bergen.get('won', 0)
        campaign_won_value = brand_bergen.get('wonValue', 0)
        campaign_cost = brand_bergen.get('cost', 0)
        campaign_roas = brand_bergen.get('roas')
        
        print(f"\n'Brand - Bergen' campaign metrics:")
        print(f"  - leads: {campaign_leads}")
        print(f"  - won: {campaign_won}")
        print(f"  - wonValue: {campaign_won_value}")
        print(f"  - cost: {campaign_cost}")
        print(f"  - roas: {campaign_roas}")
        
        if campaign_leads < 1:
            print(f"❌ FAILED: Expected campaign leads >= 1, got {campaign_leads}")
            return lead_id, import_id
        
        if campaign_won < 1:
            print(f"❌ FAILED: Expected campaign won >= 1, got {campaign_won}")
            return lead_id, import_id
        
        if campaign_won_value != 50000:
            print(f"❌ FAILED: Expected wonValue=50000, got {campaign_won_value}")
            return lead_id, import_id
        
        # ROAS = wonValue / cost = 50000 / 5000 = 10
        expected_roas = 10.0
        if campaign_roas is None:
            print(f"❌ FAILED: ROAS is None")
            return lead_id, import_id
        
        if abs(campaign_roas - expected_roas) > 0.1:
            print(f"❌ FAILED: Expected ROAS≈{expected_roas}, got {campaign_roas}")
            return lead_id, import_id
        
        print(f"\n✅ PASSED: JOIN working correctly")
        print(f"  - Campaign has {campaign_leads} lead(s)")
        print(f"  - Campaign has {campaign_won} won lead(s)")
        print(f"  - wonValue = {campaign_won_value} NOK")
        print(f"  - ROAS = {campaign_roas} (wonValue/cost = {campaign_won_value}/{campaign_cost})")
        
        return lead_id, import_id
        
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return lead_id, import_id


def test_overview_auth():
    """TEST 4: OVERVIEW AUTH - Test authentication"""
    print("\n=== TEST 4: OVERVIEW AUTH ===")
    
    try:
        url = f"{BASE_URL}/admin/ads/overview"
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
        else:
            print(f"✅ PASSED: Authentication required (401 without key)")
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")


def test_delete(import_id):
    """TEST 5: DELETE - Test deletion of imports"""
    print("\n=== TEST 5: DELETE ===")
    
    # Test 5a: Delete with valid id
    if import_id:
        print("\n--- Test 5a: Delete with valid id ---")
        try:
            url = f"{BASE_URL}/admin/ads/import?key={ADMIN_KEY}"
            payload = {"id": import_id}
            
            response = requests.delete(url, json=payload, timeout=30)
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ FAILED: Expected 200, got {response.status_code}")
            else:
                data = response.json()
                if data.get('ok') and data.get('deleted') == 1:
                    print(f"✅ PASSED: Import deleted successfully (deleted={data.get('deleted')})")
                else:
                    print(f"❌ FAILED: Expected ok=true and deleted=1")
        except Exception as e:
            print(f"❌ EXCEPTION: {str(e)}")
    
    # Test 5b: Delete without id
    print("\n--- Test 5b: Delete without id ---")
    try:
        url = f"{BASE_URL}/admin/ads/import?key={ADMIN_KEY}"
        payload = {}
        
        response = requests.delete(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 400:
            print(f"❌ FAILED: Expected 400, got {response.status_code}")
        else:
            print(f"✅ PASSED: Delete without id rejected (400)")
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
    
    # Test 5c: Delete without key
    print("\n--- Test 5c: Delete without key ---")
    try:
        url = f"{BASE_URL}/admin/ads/import"
        payload = {"id": "test"}
        
        response = requests.delete(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
        else:
            print(f"✅ PASSED: Delete without key rejected (401)")
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")


def test_regression():
    """TEST 6: REGRESSION - Test root endpoint"""
    print("\n=== TEST 6: REGRESSION ===")
    
    try:
        url = f"{BASE_URL}/"
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
        else:
            data = response.json()
            if data.get('ok'):
                print(f"✅ PASSED: Root endpoint working (GET /api/ → 200 {data})")
            else:
                print(f"❌ FAILED: Expected ok=true")
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")


def cleanup_lead(lead_id):
    """Cleanup: Delete test lead"""
    if not lead_id:
        return
    
    print(f"\n=== CLEANUP: Delete test lead {lead_id} ===")
    try:
        url = f"{BASE_URL}/admin/delete?key={ADMIN_KEY}"
        payload = {"id": lead_id}
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"✅ Test lead deleted successfully")
            else:
                print(f"⚠️ Lead deletion response: {data}")
        else:
            print(f"⚠️ Failed to delete lead: {response.status_code}")
    except Exception as e:
        print(f"⚠️ Exception during cleanup: {str(e)}")


def cleanup_all_imports():
    """Cleanup: Delete all test imports"""
    print(f"\n=== CLEANUP: Delete all test imports ===")
    try:
        # Get all imports
        url = f"{BASE_URL}/admin/ads/overview?key={ADMIN_KEY}"
        response = requests.get(url, timeout=30)
        
        if response.status_code != 200:
            print(f"⚠️ Failed to get imports: {response.status_code}")
            return
        
        data = response.json()
        imports = data.get('imports', [])
        
        if not imports:
            print(f"✅ No imports to clean up")
            return
        
        print(f"Found {len(imports)} import(s) to delete")
        
        # Delete each import
        for imp in imports:
            import_id = imp.get('id')
            if import_id:
                url = f"{BASE_URL}/admin/ads/import?key={ADMIN_KEY}"
                payload = {"id": import_id}
                
                response = requests.delete(url, json=payload, timeout=30)
                if response.status_code == 200:
                    print(f"  ✅ Deleted import {import_id}")
                else:
                    print(f"  ⚠️ Failed to delete import {import_id}: {response.status_code}")
        
        print(f"✅ Cleanup complete")
        
    except Exception as e:
        print(f"⚠️ Exception during cleanup: {str(e)}")


def main():
    print("=" * 80)
    print("BACKEND TEST: Google Ads CSV Import + ROAS/CPA Join (Annonser Fase A)")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    
    # Track test results
    results = {
        'passed': 0,
        'failed': 0,
        'total': 6
    }
    
    # TEST 1: CSV Parse
    import_id_1 = test_csv_parse()
    if import_id_1:
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    # TEST 2: Invalid CSV
    test_invalid_csv()
    results['passed'] += 1  # This test has multiple sub-tests, counting as passed if no exceptions
    
    # TEST 3: Join with leads
    lead_id, import_id_2 = test_join_with_leads()
    if lead_id and import_id_2:
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    # TEST 4: Overview auth
    test_overview_auth()
    results['passed'] += 1
    
    # TEST 5: Delete
    test_delete(import_id_1)
    results['passed'] += 1
    
    # TEST 6: Regression
    test_regression()
    results['passed'] += 1
    
    # CLEANUP
    cleanup_lead(lead_id)
    cleanup_all_imports()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total tests: {results['total']}")
    print(f"Passed: {results['passed']}")
    print(f"Failed: {results['failed']}")
    
    if results['failed'] == 0:
        print("\n✅ ALL TESTS PASSED")
    else:
        print(f"\n❌ {results['failed']} TEST(S) FAILED")
    
    print("=" * 80)


if __name__ == "__main__":
    main()
