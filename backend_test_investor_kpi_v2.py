#!/usr/bin/env python3
"""
Backend test for Investor-KPI v2 (READ-ONLY endpoints)
Tests ONLY the two new endpoints:
1. GET /api/admin/kpi (with new fields: momentum, platform, pipelineValue, channels, series.monthly)
2. GET /api/admin/playbook

Base URL: https://bli-utleier-redesign.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4
"""

import requests
import json
import sys

BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60

def test_kpi_endpoint_days_90():
    """Test (a): GET /api/admin/kpi?days=90 with all new fields"""
    print("\n" + "="*80)
    print("TEST (a): GET /api/admin/kpi?key=...&days=90")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=90"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        print(f"✓ Status code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"✓ Response is valid JSON")
        
        # Check ok field
        if not data.get('ok'):
            print(f"❌ FAILED: ok field is not true")
            return False
        print(f"✓ ok=true")
        
        # Check MOMENTUM field
        print("\n--- MOMENTUM VERIFICATION ---")
        if 'momentum' not in data:
            print(f"❌ FAILED: momentum field missing")
            return False
        
        momentum = data['momentum']
        print(f"✓ momentum field exists")
        
        # Check momentum.sessionsToday
        if 'sessionsToday' not in momentum:
            print(f"❌ FAILED: momentum.sessionsToday missing")
            return False
        if not isinstance(momentum['sessionsToday'], (int, float)) or momentum['sessionsToday'] < 0:
            print(f"❌ FAILED: momentum.sessionsToday is not a number >=0 (got {momentum['sessionsToday']})")
            return False
        print(f"✓ momentum.sessionsToday={momentum['sessionsToday']} (number >=0)")
        
        # Check momentum.sessions7d
        if 'sessions7d' not in momentum:
            print(f"❌ FAILED: momentum.sessions7d missing")
            return False
        if not isinstance(momentum['sessions7d'], (int, float)) or momentum['sessions7d'] <= 0:
            print(f"❌ FAILED: momentum.sessions7d is not a number >0 (got {momentum['sessions7d']})")
            return False
        print(f"✓ momentum.sessions7d={momentum['sessions7d']} (number >0)")
        
        # Check momentum.leadsToday
        if 'leadsToday' not in momentum:
            print(f"❌ FAILED: momentum.leadsToday missing")
            return False
        if not isinstance(momentum['leadsToday'], (int, float)) or momentum['leadsToday'] < 0:
            print(f"❌ FAILED: momentum.leadsToday is not a number >=0 (got {momentum['leadsToday']})")
            return False
        print(f"✓ momentum.leadsToday={momentum['leadsToday']} (number >=0)")
        
        # Check momentum.leads7d
        if 'leads7d' not in momentum:
            print(f"❌ FAILED: momentum.leads7d missing")
            return False
        if not isinstance(momentum['leads7d'], (int, float)) or momentum['leads7d'] <= 0:
            print(f"❌ FAILED: momentum.leads7d is not a number >0 (got {momentum['leads7d']})")
            return False
        print(f"✓ momentum.leads7d={momentum['leads7d']} (number >0)")
        
        # Check PLATFORM field
        print("\n--- PLATFORM VERIFICATION ---")
        if 'platform' not in data:
            print(f"❌ FAILED: platform field missing")
            return False
        
        platform = data['platform']
        print(f"✓ platform field exists")
        
        # Check platform.mrr
        if 'mrr' not in platform:
            print(f"❌ FAILED: platform.mrr missing")
            return False
        if not isinstance(platform['mrr'], (int, float)) or platform['mrr'] <= 0:
            print(f"❌ FAILED: platform.mrr is not a number >0 (got {platform['mrr']})")
            return False
        print(f"✓ platform.mrr={platform['mrr']} (number >0)")
        
        # Check platform.arr
        if 'arr' not in platform:
            print(f"❌ FAILED: platform.arr missing")
            return False
        if not isinstance(platform['arr'], (int, float)):
            print(f"❌ FAILED: platform.arr is not a number (got {platform['arr']})")
            return False
        # Verify arr ≈ mrr * 12
        expected_arr = platform['mrr'] * 12
        arr_diff = abs(platform['arr'] - expected_arr)
        if arr_diff > 1:  # Allow small rounding difference
            print(f"⚠️  WARNING: platform.arr={platform['arr']} is not ≈ mrr*12={expected_arr} (diff={arr_diff})")
        print(f"✓ platform.arr={platform['arr']} (≈ mrr*12={expected_arr})")
        
        # Check platform.customers
        if 'customers' not in platform:
            print(f"❌ FAILED: platform.customers missing")
            return False
        if not isinstance(platform['customers'], (int, float)) or platform['customers'] <= 0:
            print(f"❌ FAILED: platform.customers is not a number >0 (got {platform['customers']})")
            return False
        print(f"✓ platform.customers={platform['customers']} (number >0)")
        
        # Check platform.source
        if 'source' not in platform:
            print(f"❌ FAILED: platform.source missing")
            return False
        if platform['source'] not in ['platform', 'contracts']:
            print(f"❌ FAILED: platform.source is not in {{'platform','contracts'}} (got '{platform['source']}')")
            return False
        print(f"✓ platform.source='{platform['source']}' (in {{'platform','contracts'}})")
        
        # Check PIPELINEVALUE field
        print("\n--- PIPELINEVALUE VERIFICATION ---")
        if 'pipelineValue' not in data:
            print(f"❌ FAILED: pipelineValue field missing")
            return False
        
        pipelineValue = data['pipelineValue']
        print(f"✓ pipelineValue field exists")
        
        # Check pipelineValue.open
        if 'open' not in pipelineValue:
            print(f"❌ FAILED: pipelineValue.open missing")
            return False
        if not isinstance(pipelineValue['open'], (int, float)) or pipelineValue['open'] < 0:
            print(f"❌ FAILED: pipelineValue.open is not a number >=0 (got {pipelineValue['open']})")
            return False
        print(f"✓ pipelineValue.open={pipelineValue['open']} (number >=0)")
        
        # Check pipelineValue.potential
        if 'potential' not in pipelineValue:
            print(f"❌ FAILED: pipelineValue.potential missing")
            return False
        if not isinstance(pipelineValue['potential'], (int, float)) or pipelineValue['potential'] < 0:
            print(f"❌ FAILED: pipelineValue.potential is not a number >=0 (got {pipelineValue['potential']})")
            return False
        print(f"✓ pipelineValue.potential={pipelineValue['potential']} (number >=0)")
        
        # Check pipelineValue.basis
        if 'basis' not in pipelineValue:
            print(f"❌ FAILED: pipelineValue.basis missing")
            return False
        if not isinstance(pipelineValue['basis'], str):
            print(f"❌ FAILED: pipelineValue.basis is not a string (got {type(pipelineValue['basis'])})")
            return False
        print(f"✓ pipelineValue.basis='{pipelineValue['basis']}' (string)")
        
        # Check CHANNELS field
        print("\n--- CHANNELS VERIFICATION ---")
        if 'channels' not in data:
            print(f"❌ FAILED: channels field missing")
            return False
        
        channels = data['channels']
        if not isinstance(channels, list):
            print(f"❌ FAILED: channels is not a list (got {type(channels)})")
            return False
        print(f"✓ channels is list with {len(channels)} items")
        
        if len(channels) == 0:
            print(f"⚠️  WARNING: channels list is empty")
        else:
            # Check first channel item structure
            channel_item = channels[0]
            required_channel_fields = ['channel', 'leads', 'customers', 'share']
            for field in required_channel_fields:
                if field not in channel_item:
                    print(f"❌ FAILED: channels[0].{field} missing")
                    return False
            
            # Verify types
            if not isinstance(channel_item['channel'], str):
                print(f"❌ FAILED: channels[0].channel is not a string")
                return False
            if not isinstance(channel_item['leads'], (int, float)):
                print(f"❌ FAILED: channels[0].leads is not a number")
                return False
            if not isinstance(channel_item['customers'], (int, float)):
                print(f"❌ FAILED: channels[0].customers is not a number")
                return False
            if not isinstance(channel_item['share'], (int, float)):
                print(f"❌ FAILED: channels[0].share is not a number")
                return False
            
            print(f"✓ channels[0] has all required fields: channel='{channel_item['channel']}', leads={channel_item['leads']}, customers={channel_item['customers']}, share={channel_item['share']}")
        
        # Check SERIES.MONTHLY field
        print("\n--- SERIES.MONTHLY VERIFICATION ---")
        if 'series' not in data:
            print(f"❌ FAILED: series field missing")
            return False
        
        series = data['series']
        if 'monthly' not in series:
            print(f"❌ FAILED: series.monthly field missing")
            return False
        
        monthly = series['monthly']
        if not isinstance(monthly, list):
            print(f"❌ FAILED: series.monthly is not a list (got {type(monthly)})")
            return False
        
        if len(monthly) != 12:
            print(f"❌ FAILED: series.monthly does not have exactly 12 elements (got {len(monthly)})")
            return False
        print(f"✓ series.monthly has exactly 12 elements")
        
        # Check first monthly item structure
        monthly_item = monthly[0]
        required_monthly_fields = ['month', 'label', 'leads', 'customers', 'revenue']
        for field in required_monthly_fields:
            if field not in monthly_item:
                print(f"❌ FAILED: series.monthly[0].{field} missing")
                return False
        
        # Verify month format YYYY-MM
        import re
        if not re.match(r'^\d{4}-\d{2}$', monthly_item['month']):
            print(f"❌ FAILED: series.monthly[0].month is not in YYYY-MM format (got '{monthly_item['month']}')")
            return False
        print(f"✓ series.monthly[0].month='{monthly_item['month']}' (YYYY-MM format)")
        
        # Verify types
        if not isinstance(monthly_item['label'], str):
            print(f"❌ FAILED: series.monthly[0].label is not a string")
            return False
        if not isinstance(monthly_item['leads'], (int, float)):
            print(f"❌ FAILED: series.monthly[0].leads is not a number")
            return False
        if not isinstance(monthly_item['customers'], (int, float)):
            print(f"❌ FAILED: series.monthly[0].customers is not a number")
            return False
        if not isinstance(monthly_item['revenue'], (int, float)):
            print(f"❌ FAILED: series.monthly[0].revenue is not a number")
            return False
        
        print(f"✓ series.monthly[0] has all required fields with correct types: label='{monthly_item['label']}', leads={monthly_item['leads']}, customers={monthly_item['customers']}, revenue={monthly_item['revenue']}")
        
        # Check REGRESSION: existing fields still present
        print("\n--- REGRESSION VERIFICATION (existing fields) ---")
        if 'metrics' not in data:
            print(f"❌ FAILED: metrics field missing (regression)")
            return False
        print(f"✓ metrics field present (regression)")
        
        if 'funnel' not in data:
            print(f"❌ FAILED: funnel field missing (regression)")
            return False
        print(f"✓ funnel field present (regression)")
        
        if 'period' not in data:
            print(f"❌ FAILED: period field missing (regression)")
            return False
        print(f"✓ period field present (regression)")
        
        print("\n✅ TEST (a) PASSED: GET /api/admin/kpi?days=90 returns 200 with all required new fields (momentum, platform, pipelineValue, channels, series.monthly) and existing fields (metrics, funnel, period)")
        return True
        
    except requests.exceptions.Timeout:
        print(f"❌ FAILED: Request timed out after {TIMEOUT}s")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ FAILED: Request error: {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ FAILED: Invalid JSON response: {e}")
        return False
    except Exception as e:
        print(f"❌ FAILED: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_kpi_endpoint_days_30():
    """Test (b): GET /api/admin/kpi?days=30 (regression, same structure)"""
    print("\n" + "="*80)
    print("TEST (b): GET /api/admin/kpi?key=...&days=30 (regression)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=30"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        print(f"✓ Status code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"✓ Response is valid JSON")
        
        # Check ok field
        if not data.get('ok'):
            print(f"❌ FAILED: ok field is not true")
            return False
        print(f"✓ ok=true")
        
        # Quick check that all new fields are present
        required_fields = ['momentum', 'platform', 'pipelineValue', 'channels', 'series', 'metrics', 'funnel', 'period']
        for field in required_fields:
            if field not in data:
                print(f"❌ FAILED: {field} field missing")
                return False
        print(f"✓ All required fields present: {', '.join(required_fields)}")
        
        # Check series.monthly exists
        if 'monthly' not in data['series']:
            print(f"❌ FAILED: series.monthly missing")
            return False
        if len(data['series']['monthly']) != 12:
            print(f"❌ FAILED: series.monthly does not have 12 elements (got {len(data['series']['monthly'])})")
            return False
        print(f"✓ series.monthly has 12 elements")
        
        print("\n✅ TEST (b) PASSED: GET /api/admin/kpi?days=30 returns 200 with same structure")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_playbook_endpoint_with_key():
    """Test (c): GET /api/admin/playbook with key"""
    print("\n" + "="*80)
    print("TEST (c): GET /api/admin/playbook?key=...")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/playbook?key={ADMIN_KEY}"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        print(f"✓ Status code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"✓ Response is valid JSON")
        
        # Check ok field
        if not data.get('ok'):
            print(f"❌ FAILED: ok field is not true")
            return False
        print(f"✓ ok=true")
        
        # Check markdown field
        if 'markdown' not in data:
            print(f"❌ FAILED: markdown field missing")
            return False
        
        markdown = data['markdown']
        if not isinstance(markdown, str):
            print(f"❌ FAILED: markdown is not a string (got {type(markdown)})")
            return False
        
        markdown_length = len(markdown)
        if markdown_length <= 5000:
            print(f"❌ FAILED: markdown length is not > 5000 (got {markdown_length})")
            return False
        print(f"✓ markdown is string with length={markdown_length} (> 5000)")
        
        # Check updatedAt field
        if 'updatedAt' not in data:
            print(f"❌ FAILED: updatedAt field missing")
            return False
        print(f"✓ updatedAt field present: {data['updatedAt']}")
        
        print("\n✅ TEST (c) PASSED: GET /api/admin/playbook returns 200 {ok:true, markdown (length > 5000), updatedAt}")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_playbook_endpoint_without_key():
    """Test (d): GET /api/admin/playbook without key → 401"""
    print("\n" + "="*80)
    print("TEST (d): GET /api/admin/playbook WITHOUT key (should return 401)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/playbook"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        print(f"✓ Status code: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
        
        print("\n✅ TEST (d) PASSED: GET /api/admin/playbook without key returns 401")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_kpi_endpoint_without_key():
    """Test (e): GET /api/admin/kpi without key → 401"""
    print("\n" + "="*80)
    print("TEST (e): GET /api/admin/kpi WITHOUT key (should return 401)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/admin/kpi?days=90"
        print(f"Calling: {url}")
        
        response = requests.get(url, timeout=TIMEOUT)
        print(f"✓ Status code: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
        
        print("\n✅ TEST (e) PASSED: GET /api/admin/kpi without key returns 401")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("="*80)
    print("INVESTOR-KPI V2 BACKEND TESTING")
    print("Testing ONLY the two new READ-ONLY endpoints")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print("="*80)
    
    results = []
    
    # Test (a): GET /api/admin/kpi?days=90 with all new fields
    results.append(("(a) GET /api/admin/kpi?days=90", test_kpi_endpoint_days_90()))
    
    # Test (b): GET /api/admin/kpi?days=30 (regression)
    results.append(("(b) GET /api/admin/kpi?days=30", test_kpi_endpoint_days_30()))
    
    # Test (c): GET /api/admin/playbook with key
    results.append(("(c) GET /api/admin/playbook with key", test_playbook_endpoint_with_key()))
    
    # Test (d): GET /api/admin/playbook without key → 401
    results.append(("(d) GET /api/admin/playbook without key", test_playbook_endpoint_without_key()))
    
    # Test (e): GET /api/admin/kpi without key → 401
    results.append(("(e) GET /api/admin/kpi without key", test_kpi_endpoint_without_key()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
